import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "../shared/civic";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["citizen", "officer", "admin"]).default("citizen").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull().unique(),
  reporterId: int("reporterId").notNull(),
  assignedOfficerId: int("assignedOfficerId"),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ISSUE_CATEGORIES).notNull(),
  status: mysqlEnum("status", ISSUE_STATUSES).default("Pending").notNull(),
  priority: mysqlEnum("priority", ISSUE_PRIORITIES).default("Medium").notNull(),
  ward: varchar("ward", { length: 120 }).notNull(),
  locationName: varchar("locationName", { length: 255 }).notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  resolutionNote: text("resolutionNote"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const issueAttachments = mysqlTable("issueAttachments", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  issueId: int("issueId"),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CivicIssue = typeof issues.$inferSelect;
export type IssueAttachment = typeof issueAttachments.$inferSelect;
export type AppNotification = typeof notifications.$inferSelect;
