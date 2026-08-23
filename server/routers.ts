import { COOKIE_NAME } from "@shared/const";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "@shared/civic";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, citizenProcedure, officerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";
import { buildHeuristicSuggestion, canOfficerSetStatus, normalisePhotoIssueAnalysis, normaliseSuggestion } from "./civicUtils";
import { makeRequest, type GeocodingResult } from "./_core/map";
import { photoLocationSuggestion } from "../shared/photoLocation";

const createIssueInput = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(20).max(3000),
  category: z.enum(ISSUE_CATEGORIES),
  priority: z.enum(ISSUE_PRIORITIES),
  ward: z.string().trim().min(2).max(120),
  locationName: z.string().trim().min(4).max(255),
  latitude: z.string().trim().max(32).optional(),
  longitude: z.string().trim().max(32).optional(),
});

const publicIdInput = z.object({ publicId: z.string().trim().min(4).max(32) });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),
  issue: router({
    suggest: citizenProcedure.input(z.object({ description: z.string().trim().min(20).max(3000) })).mutation(async ({ input }) => {
      const fallback = buildHeuristicSuggestion(input.description);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You classify civic issues. Return a concise, safety-aware recommendation only. Do not invent facts." },
            { role: "user", content: `Classify this civic issue description. Choose exactly one category from: ${ISSUE_CATEGORIES.join(", ")}. Choose one priority from: ${ISSUE_PRIORITIES.join(", ")}. Description: ${input.description}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "civic_issue_suggestion",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  priority: { type: "string" },
                  reasoning: { type: "string" },
                },
                required: ["category", "priority", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content;
        return { ...normaliseSuggestion(JSON.parse(typeof content === "string" ? content : "{}"), fallback), source: "ai" as const };
      } catch {
        return { ...fallback, source: "guided" as const };
      }
    }),
    analyzePhoto: citizenProcedure.input(z.object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataUrl: z.string().min(32).max(7_000_000),
    })).mutation(async ({ input }) => {
      const encoded = input.dataUrl.split(",")[1];
      if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image payload." });
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Each photo must be 5 MB or less." });
      try {
        const response = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You analyze photos of civic infrastructure only. Identify visible public-service issues conservatively. Never infer personal, sensitive, or exact location information from an image. Do not invent facts. Provide concise form-ready text and preserve uncertainty." },
            { role: "user", content: [
              { type: "text", text: `Analyze this photo to help a resident prepare a civic issue report. Choose exactly one category from: ${ISSUE_CATEGORIES.join(", ")}. Choose one priority from: ${ISSUE_PRIORITIES.join(", ")}. Provide a neutral title and a concise description based only on what is visible. Do not identify people, private property owners, addresses, ward, GPS location, or license plates. The resident must enter the location themselves.` },
              { type: "image_url", image_url: { url: input.dataUrl, detail: "low" } },
            ] },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "civic_photo_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  confidence: { type: "string", enum: ["High", "Medium", "Low"] },
                  note: { type: "string" },
                },
                required: ["title", "description", "category", "priority", "confidence", "note"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content;
        return { ...normalisePhotoIssueAnalysis(JSON.parse(typeof content === "string" ? content : "{}")), source: "photo-ai" as const };
      } catch {
        return { ...normalisePhotoIssueAnalysis({}), source: "guided" as const };
      }
    }),
    resolvePhotoLocation: citizenProcedure.input(z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    })).mutation(async ({ input }) => {
      try {
        const response = await makeRequest<GeocodingResult>("/maps/api/geocode/json", { latlng: `${input.latitude},${input.longitude}` });
        const firstResult = response.results[0];
        return {
          ...photoLocationSuggestion({
            latitude: input.latitude,
            longitude: input.longitude,
            formattedAddress: firstResult?.formatted_address,
            components: firstResult?.address_components,
          }),
          source: "embedded-gps" as const,
        };
      } catch {
        return {
          ...photoLocationSuggestion({ latitude: input.latitude, longitude: input.longitude }),
          source: "embedded-gps" as const,
        };
      }
    }),
    create: citizenProcedure.input(createIssueInput).mutation(async ({ ctx, input }) => {
      const publicId = `CR-${new Date().getFullYear()}-${nanoid(5).toUpperCase()}`;
      const issue = await db.createIssue({ ...input, publicId, reporterId: ctx.user.id });
      return issue;
    }),
    mine: citizenProcedure.query(({ ctx }) => db.listIssuesForCitizen(ctx.user.id)),
    details: protectedProcedure.input(publicIdInput).query(async ({ ctx, input }) => {
      const issue = await db.getIssueByPublicId(input.publicId);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      const mayView = ctx.user.role === "admin" || issue.reporterId === ctx.user.id || issue.assignedOfficerId === ctx.user.id;
      if (!mayView) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this issue." });
      return { issue, attachments: await db.listAttachments(issue.id) };
    }),
    uploadAttachment: citizenProcedure.input(publicIdInput.extend({
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataUrl: z.string().min(32).max(7_000_000),
    })).mutation(async ({ ctx, input }) => {
      const issue = await db.getIssueByPublicId(input.publicId);
      if (!issue || issue.reporterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot add a photo to this issue." });
      const encoded = input.dataUrl.split(",")[1];
      if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image payload." });
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Each photo must be 5 MB or less." });
      const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const stored = await storagePut(`issues/${issue.id}/${nanoid(10)}.${extension}`, bytes, input.mimeType);
      await db.createIssueAttachment({ issueId: issue.id, storageKey: stored.key, url: stored.url, fileName: input.fileName, mimeType: input.mimeType });
      return { url: stored.url };
    }),
  }),
  officer: router({
    assigned: officerProcedure.query(({ ctx }) => db.listIssuesForOfficer(ctx.user.id)),
    update: officerProcedure.input(publicIdInput.extend({
      status: z.enum(ISSUE_STATUSES),
      resolutionNote: z.string().trim().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!canOfficerSetStatus(input.status)) throw new TRPCError({ code: "FORBIDDEN", message: "Officers may update issues to In Progress or Resolved." });
      const issue = await db.getIssueByPublicId(input.publicId);
      if (!issue || issue.assignedOfficerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This issue is not assigned to you." });
      const updated = await db.updateIssue(input.publicId, {
        status: input.status,
        resolutionNote: input.resolutionNote || null,
        resolvedAt: input.status === "Resolved" ? new Date() : null,
      });
      await db.createNotification({ recipientId: issue.reporterId, issueId: issue.id, kind: "status", title: `Issue ${input.status}`, content: `${issue.publicId} is now marked ${input.status}.` });
      return updated;
    }),
  }),
  admin: router({
    list: adminProcedure.query(() => db.listAllIssues()),
    officers: adminProcedure.query(() => db.listOfficers()),
    assign: adminProcedure.input(publicIdInput.extend({ officerId: z.number().int().positive(), priority: z.enum(ISSUE_PRIORITIES) })).mutation(async ({ input }) => {
      const issue = await db.getIssueByPublicId(input.publicId);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      const updated = await db.updateIssue(input.publicId, { assignedOfficerId: input.officerId, priority: input.priority });
      await db.createNotification({ recipientId: input.officerId, issueId: issue.id, kind: "assignment", title: "New issue assigned", content: `${issue.publicId} has been assigned to your field queue.` });
      return updated;
    }),
    update: adminProcedure.input(publicIdInput.extend({ status: z.enum(ISSUE_STATUSES), priority: z.enum(ISSUE_PRIORITIES) })).mutation(async ({ input }) => {
      const issue = await db.getIssueByPublicId(input.publicId);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      const updated = await db.updateIssue(input.publicId, { status: input.status, priority: input.priority, resolvedAt: input.status === "Resolved" ? new Date() : null });
      await db.createNotification({ recipientId: issue.reporterId, issueId: issue.id, kind: "status", title: `Issue ${input.status}`, content: `${issue.publicId} is now marked ${input.status}.` });
      return updated;
    }),
    analytics: adminProcedure.query(async () => {
      const allIssues = await db.listAllIssues();
      const total = allIssues.length;
      const resolved = allIssues.filter(issue => issue.status === "Resolved" || issue.status === "Closed");
      const avgResolutionHours = resolved.length
        ? Math.round(resolved.reduce((sum, issue) => sum + ((issue.resolvedAt?.getTime() ?? issue.updatedAt.getTime()) - issue.createdAt.getTime()) / 3_600_000, 0) / resolved.length)
        : 0;
      const categoryBreakdown = ISSUE_CATEGORIES.map(category => ({ category, count: allIssues.filter(issue => issue.category === category).length })).filter(item => item.count > 0);
      const officerPerformance = Object.entries(allIssues.reduce<Record<string, { assigned: number; resolved: number }>>((acc, issue) => {
        if (!issue.assignedOfficerId) return acc;
        const key = `Officer #${issue.assignedOfficerId}`;
        acc[key] ||= { assigned: 0, resolved: 0 };
        acc[key].assigned += 1;
        if (issue.status === "Resolved" || issue.status === "Closed") acc[key].resolved += 1;
        return acc;
      }, {})).map(([officer, metrics]) => ({ officer, ...metrics }));
      const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
      const trends = Array.from({ length: 6 }, (_, index) => {
        const month = new Date();
        month.setUTCDate(1);
        month.setUTCHours(0, 0, 0, 0);
        month.setUTCMonth(month.getUTCMonth() - (5 - index));
        const year = month.getUTCFullYear();
        const monthIndex = month.getUTCMonth();
        return {
          month: monthFormatter.format(month),
          issues: allIssues.filter(issue => issue.createdAt.getUTCFullYear() === year && issue.createdAt.getUTCMonth() === monthIndex).length,
        };
      });
      return {
        total,
        pending: allIssues.filter(issue => issue.status === "Pending").length,
        inProgress: allIssues.filter(issue => issue.status === "In Progress").length,
        resolved: resolved.length,
        avgResolutionHours,
        categoryBreakdown,
        officerPerformance,
        trends,
      };
    }),
  }),
  notification: router({
    mine: protectedProcedure.query(({ ctx }) => db.listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(input.id, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;

