export type DeviceCoordinates = { latitude: number; longitude: number; accuracy: number };

export type GeolocationLike = {
  getCurrentPosition: (
    success: (position: { coords: DeviceCoordinates }) => void,
    failure: (error: { code: number; message: string }) => void,
    options?: PositionOptions,
  ) => void;
};

export function requestDeviceCoordinates(geolocation: GeolocationLike | undefined): Promise<DeviceCoordinates> {
  if (!geolocation) return Promise.reject(new Error("Device location is unavailable in this browser."));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => reject(new Error(error.message || "Device location permission was not granted.")),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
