import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, type IssueCategory, type IssuePriority, type IssueStatus } from "../shared/civic";

export type IssueSuggestion = {
  category: IssueCategory;
  priority: IssuePriority;
  reasoning: string;
};

const categorySignals: Array<{ category: IssueCategory; terms: string[] }> = [
  { category: "Road Damage", terms: ["pothole", "road", "pavement", "asphalt", "crater"] },
  { category: "Garbage", terms: ["garbage", "trash", "waste", "bin", "litter"] },
  { category: "Street Light", terms: ["street light", "streetlight", "lamp", "dark street"] },
  { category: "Water Leakage", terms: ["leak", "water pipe", "burst pipe", "overflowing water"] },
  { category: "Drainage", terms: ["drain", "sewer", "drainage", "manhole", "flood"] },
  { category: "Electricity", terms: ["electric", "power line", "wire", "transformer"] },
  { category: "Illegal Parking", terms: ["parking", "parked", "blocked vehicle", "blocking lane"] },
  { category: "Noise", terms: ["noise", "loud", "music", "construction noise"] },
  { category: "Environment", terms: ["tree", "smoke", "pollution", "air quality"] },
  { category: "Animal Issues", terms: ["dog", "animal", "cattle", "stray"] },
];

export function buildHeuristicSuggestion(description: string): IssueSuggestion {
  const normalized = description.toLowerCase();
  const matched = categorySignals.find(({ terms }) => terms.some(term => normalized.includes(term)));
  const highRiskTerms = ["accident", "injury", "fire", "hospital", "school", "danger", "flood", "exposed wire", "gas"];
  const urgentTerms = ["urgent", "immediately", "major", "blocked", "overflowing"];
  const priority: IssuePriority = highRiskTerms.some(term => normalized.includes(term))
    ? "Critical"
    : urgentTerms.some(term => normalized.includes(term))
      ? "High"
      : description.length > 180
        ? "Medium"
        : "Low";

  return {
    category: matched?.category ?? "Other",
    priority,
    reasoning: matched
      ? `The description includes indicators commonly associated with ${matched.category.toLowerCase()}.`
      : "No strong category signal was identified, so the report should be reviewed as Other.",
  };
}

export function normaliseSuggestion(value: unknown, fallback: IssueSuggestion): IssueSuggestion {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<IssueSuggestion>;
  const category = ISSUE_CATEGORIES.includes(candidate.category as IssueCategory)
    ? (candidate.category as IssueCategory)
    : fallback.category;
  const priority = ISSUE_PRIORITIES.includes(candidate.priority as IssuePriority)
    ? (candidate.priority as IssuePriority)
    : fallback.priority;
  return {
    category,
    priority,
    reasoning: typeof candidate.reasoning === "string" && candidate.reasoning.trim()
      ? candidate.reasoning.slice(0, 280)
      : fallback.reasoning,
  };
}

export type PhotoIssueAnalysis = {
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  confidence: "High" | "Medium" | "Low";
  note: string;
};

export function normalisePhotoIssueAnalysis(value: unknown): PhotoIssueAnalysis {
  const candidate = value && typeof value === "object" ? value as Partial<PhotoIssueAnalysis> : {};
  const clean = (text: unknown, fallback: string, max: number) => typeof text === "string" && text.trim().length > 0
    ? text.trim().replace(/\s+/g, " ").slice(0, max)
    : fallback;
  return {
    title: clean(candidate.title, "Issue visible in uploaded photo", 180),
    description: clean(candidate.description, "Please review the photo and add details about the civic issue.", 1000),
    category: ISSUE_CATEGORIES.includes(candidate.category as IssueCategory) ? candidate.category as IssueCategory : "Other",
    priority: ISSUE_PRIORITIES.includes(candidate.priority as IssuePriority) ? candidate.priority as IssuePriority : "Medium",
    confidence: candidate.confidence === "High" || candidate.confidence === "Medium" || candidate.confidence === "Low" ? candidate.confidence : "Low",
    note: clean(candidate.note, "Please confirm the generated details before submitting.", 280),
  };
}

export function canOfficerSetStatus(status: IssueStatus) {
  return status === "In Progress" || status === "Resolved";
}
