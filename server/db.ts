import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, issueAttachments, issues, notifications, users } from "../drizzle/schema";
import type { IssueCategory, IssuePriority, IssueStatus } from "../shared/civic";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    } else {
      values.role = "citizen";
      updateSet.role = "citizen";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getIssueByPublicId(publicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(issues).where(eq(issues.publicId, publicId)).limit(1);
  return result[0];
}

export async function createIssue(input: {
  publicId: string;
  reporterId: number;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  ward: string;
  locationName: string;
  latitude?: string;
  longitude?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("The civic issue database is currently unavailable.");
  await db.insert(issues).values({
    ...input,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    status: "Pending",
  });
  return getIssueByPublicId(input.publicId);
}

export async function listIssuesForCitizen(reporterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issues).where(eq(issues.reporterId, reporterId)).orderBy(desc(issues.createdAt));
}

export async function listIssuesForOfficer(officerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issues).where(eq(issues.assignedOfficerId, officerId)).orderBy(desc(issues.updatedAt));
}

export async function listAllIssues() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issues).orderBy(desc(issues.updatedAt));
}

export async function listOfficers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "officer"));
}

export async function updateIssue(
  publicId: string,
  update: Partial<{
    assignedOfficerId: number | null;
    priority: IssuePriority;
    status: IssueStatus;
    resolutionNote: string | null;
    resolvedAt: Date | null;
  }>,
) {
  const db = await getDb();
  if (!db) throw new Error("The civic issue database is currently unavailable.");
  await db.update(issues).set(update).where(eq(issues.publicId, publicId));
  return getIssueByPublicId(publicId);
}

export async function createIssueAttachment(input: {
  issueId: number;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("The civic issue database is currently unavailable.");
  await db.insert(issueAttachments).values(input);
}

export async function listAttachments(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issueAttachments).where(eq(issueAttachments.issueId, issueId));
}

export async function createNotification(input: {
  recipientId: number;
  issueId?: number;
  title: string;
  content: string;
  kind: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...input, issueId: input.issueId ?? null });
}

export async function listNotifications(recipientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.recipientId, recipientId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(id: number, recipientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  return listNotifications(recipientId);
}
