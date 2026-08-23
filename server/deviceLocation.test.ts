import { describe, expect, it } from "vitest";
import { requestDeviceCoordinates } from "../shared/deviceLocation";

describe("device location fallback", () => {
  it("returns user-approved device coordinates", async () => {
    await expect(requestDeviceCoordinates({
      getCurrentPosition: success => success({ coords: { latitude: 28.6139, longitude: 77.209, accuracy: 10 } }),
    })).resolves.toMatchObject({ latitude: 28.6139, longitude: 77.209 });
  });

  it("fails safely when permission is unavailable or denied", async () => {
    await expect(requestDeviceCoordinates(undefined)).rejects.toThrow("unavailable");
    await expect(requestDeviceCoordinates({ getCurrentPosition: (_, failure) => failure({ code: 1, message: "Permission denied" }) })).rejects.toThrow("Permission denied");
  });
});
