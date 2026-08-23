import { describe, expect, it } from "vitest";
import { buildHeuristicSuggestion, canOfficerSetStatus, normalisePhotoIssueAnalysis, normaliseSuggestion } from "./civicUtils";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("CityResolve issue workflow rules", () => {
  it("uses only the requested field-worker status updates", () => {
    expect(canOfficerSetStatus("In Progress")).toBe(true);
    expect(canOfficerSetStatus("Resolved")).toBe(true);
    expect(canOfficerSetStatus("Pending")).toBe(false);
    expect(canOfficerSetStatus("Closed")).toBe(false);
  });

  it("returns a useful deterministic suggestion when AI is unavailable", () => {
    const result = buildHeuristicSuggestion("A deep pothole outside the school is dangerous for children.");
    expect(result.category).toBe("Road Damage");
    expect(result.priority).toBe("Critical");
  });

  it("normalises AI output to the application category and priority vocabulary", () => {
    const fallback = buildHeuristicSuggestion("A broken street light outside the library.");
    expect(normaliseSuggestion({ category: "Street Light", priority: "High", reasoning: "Darkness affects safe visibility." }, fallback)).toMatchObject({ category: "Street Light", priority: "High" });
    expect(normaliseSuggestion({ category: "Unexpected", priority: "Instant" }, fallback)).toMatchObject({ category: fallback.category, priority: fallback.priority });
  });

  it("normalises photo analysis into safe report-ready fields", () => {
    const result = normalisePhotoIssueAnalysis({ title: "Large pothole", description: "A visible pothole occupies part of the road surface.", category: "Road Damage", priority: "High", confidence: "High", note: "Road surface damage is visible." });
    expect(result).toMatchObject({ title: "Large pothole", category: "Road Damage", priority: "High", confidence: "High" });
    expect(normalisePhotoIssueAnalysis({ category: "Invalid" }).category).toBe("Other");
  });

  it("rejects attempts to enter restricted role procedures", async () => {
    const makeContext = (role: "citizen" | "officer" | "admin") => ({
      user: { id: 4, openId: "role-test", name: "Role Test", email: "role@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    }) as TrpcContext;
    await expect(appRouter.createCaller(makeContext("officer")).issue.mine()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(makeContext("citizen")).officer.assigned()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(makeContext("citizen")).admin.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
