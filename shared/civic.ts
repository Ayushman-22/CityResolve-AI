export const ISSUE_CATEGORIES = [
  "Road Damage",
  "Garbage",
  "Street Light",
  "Water Leakage",
  "Drainage",
  "Electricity",
  "Illegal Parking",
  "Noise",
  "Environment",
  "Animal Issues",
  "Other",
] as const;

export const ISSUE_STATUSES = ["Pending", "In Progress", "Resolved", "Closed"] as const;

export const ISSUE_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const STATUS_META: Record<IssueStatus, { label: IssueStatus; color: string }> = {
  Pending: { label: "Pending", color: "#d97706" },
  "In Progress": { label: "In Progress", color: "#2563eb" },
  Resolved: { label: "Resolved", color: "#15803d" },
  Closed: { label: "Closed", color: "#475569" },
};
