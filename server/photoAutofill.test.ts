import { describe, expect, it } from "vitest";
import { photoAnalysisToEditableFields } from "../shared/photoAutofill";

describe("photo analysis form autofill", () => {
  it("maps only the reviewable issue details and never inserts location fields", () => {
    const result = photoAnalysisToEditableFields({
      title: "Pothole visible on road",
      description: "A pothole is visible in the roadway.",
      category: "Road Damage",
      priority: "High",
    });
    expect(result).toEqual({
      title: "Pothole visible on road",
      description: "A pothole is visible in the roadway.",
      category: "Road Damage",
      priority: "High",
    });
    expect(result).not.toHaveProperty("ward");
    expect(result).not.toHaveProperty("locationName");
    expect(result).not.toHaveProperty("latitude");
    expect(result).not.toHaveProperty("longitude");
  });
});
