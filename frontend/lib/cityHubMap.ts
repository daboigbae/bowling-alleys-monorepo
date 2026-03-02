// City hub URL lookup — derived from Firebase hubs (via /api/hubs)
// Use useCityHubUrl(city) in components; getCityHubUrl for sync/legacy (reads from cache)
import { useQuery } from "@tanstack/react-query";
import { getHubs, getCityFromHubTitle } from "./firestore";

function buildCityToUrlMap(hubs: { slug: string; city?: string; title: string }[]): Record<string, string> {
  const fromHubs = Object.fromEntries(
    hubs.flatMap((h) => {
      const city = (h.city ?? getCityFromHubTitle(h.title)).toLowerCase().trim();
      if (!city) return [];
      return [[city, `/${h.slug}`]];
    })
  );
  const aliases: Record<string, string> = {
    "new york city": "/best-bowling-in-new-york",
    "fort worth": "/best-bowling-in-dallas-fort-worth",
  };
  return { ...fromHubs, ...aliases };
}

// Hook for components — uses React Query, returns URL when hubs loaded
export function useCityHubUrl(city: string | undefined): string | null {
  const map = useCityHubMap();
  if (!city) return null;
  return map[city.toLowerCase().trim()] ?? null;
}

// Hook that returns the full city -> URL map (for use in maps/iterations)
export function useCityHubMap(): Record<string, string> {
  const { data: hubs = [] } = useQuery({
    queryKey: ["hubs"],
    queryFn: getHubs,
  });
  return buildCityToUrlMap(hubs);
}

// Sync version — returns null until hubs are cached (used in non-hook contexts)
// Prefer useCityHubUrl in components
let _cityHubMap: Record<string, string> = {};
let _mapBuilt = false;

export async function getCityHubUrlAsync(city: string | undefined): Promise<string | null> {
  if (!city) return null;
  const { getHubs } = await import("./firestore");
  const hubs = await getHubs();
  if (!_mapBuilt) {
    _cityHubMap = buildCityToUrlMap(hubs);
    _mapBuilt = true;
  }
  return _cityHubMap[city.toLowerCase().trim()] ?? null;
}

// Sync — may return null if hubs not yet loaded (for backward compat during migration)
export function getCityHubUrl(city: string | undefined): string | null {
  if (!city || Object.keys(_cityHubMap).length === 0) return null;
  return _cityHubMap[city.toLowerCase().trim()] ?? null;
}

// Populate sync map (call when hubs load, e.g. in a provider or on first getHubs)
export function setCityHubMapFromHubs(hubs: { slug: string; city?: string; title: string }[]): void {
  _cityHubMap = buildCityToUrlMap(hubs);
  _mapBuilt = true;
}

export function hasCityHub(city: string | undefined): boolean {
  return getCityHubUrl(city) !== null;
}
