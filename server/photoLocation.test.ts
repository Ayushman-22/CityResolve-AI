import { describe, expect, it } from "vitest";
import { photoLocationSuggestion } from "../shared/photoLocation";

describe("photo-derived location suggestion", () => {
  it("formats embedded GPS coordinates and selects a suitable civic ward component", () => {
    expect(photoLocationSuggestion({
      latitude: 28.613895,
      longitude: 77.209006,
      formattedAddress: "Civic Centre, New Delhi",
      components: [{ long_name: "Ward 61", types: ["sublocality_level_1", "political"] }],
    })).toEqual({ latitude: "28.613895", longitude: "77.209006", locationName: "Civic Centre, New Delhi", ward: "Ward 61" });
  });

  it("does not fabricate an address or ward when reverse geocoding has no result", () => {
    expect(photoLocationSuggestion({ latitude: 1, longitude: 2 })).toEqual({ latitude: "1.000000", longitude: "2.000000", locationName: "", ward: "" });
  });
});

