import type { IssueCategory, IssuePriority } from "./civic";

export type PhotoAutofillSuggestion = {
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
};

export function photoAnalysisToEditableFields(suggestion: PhotoAutofillSuggestion) {
  return {
    title: suggestion.title,
    description: suggestion.description,
    category: suggestion.category,
    priority: suggestion.priority,
  };
}
