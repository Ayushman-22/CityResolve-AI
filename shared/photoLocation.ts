export type GeocodeAddressComponent = { long_name: string; types: string[] };

export function photoLocationSuggestion(input: {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  components?: GeocodeAddressComponent[];
}) {
  const wardTypes = ["administrative_area_level_3", "sublocality_level_1", "neighborhood", "administrative_area_level_2"];
  const ward = input.components?.find(component => wardTypes.some(type => component.types.includes(type)))?.long_name ?? "";
  return {
    latitude: input.latitude.toFixed(6),
    longitude: input.longitude.toFixed(6),
    locationName: input.formattedAddress ?? "",
    ward,
  };
}
