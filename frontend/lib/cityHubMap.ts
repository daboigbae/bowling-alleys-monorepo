// Maps city names to their hub page URLs
// Derived from cityHubsConfig — add cities there, this stays in sync
import { CITY_HUBS } from "./cityHubsConfig";

const fromConfig = Object.fromEntries(
  CITY_HUBS.map((hub) => [hub.city.toLowerCase().trim(), `/${hub.slug}`])
);

// Extra aliases (e.g. alternate names, metro areas)
const aliases: Record<string, string> = {
  "new york city": "/best-bowling-in-new-york",
  "fort worth": "/best-bowling-in-dallas-fort-worth",
};

export const cityHubMap: Record<string, string> = { ...fromConfig, ...aliases };

// Helper to get hub URL for a city (case-insensitive)
export function getCityHubUrl(city: string | undefined): string | null {
  if (!city) return null;
  const normalizedCity = city.toLowerCase().trim();
  return cityHubMap[normalizedCity] || null;
}

// Helper to check if a city has a hub page
export function hasCityHub(city: string | undefined): boolean {
  return getCityHubUrl(city) !== null;
}
