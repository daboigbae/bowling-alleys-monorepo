/**
 * Location search utilities for homepage search bar.
 * Handles zip code (Zippopotam) and city/state parsing.
 */

const STATE_TO_ABBR: Record<string, string> = {
  ak: "AK", al: "AL", ar: "AR", az: "AZ", ca: "CA", co: "CO", ct: "CT",
  dc: "DC", de: "DE", fl: "FL", ga: "GA", hi: "HI", ia: "IA", id: "ID",
  il: "IL", in: "IN", ks: "KS", ky: "KY", la: "LA", ma: "MA", md: "MD",
  me: "ME", mi: "MI", mn: "MN", mo: "MO", ms: "MS", mt: "MT", nc: "NC",
  nd: "ND", ne: "NE", nh: "NH", nj: "NJ", nm: "NM", nv: "NV", ny: "NY",
  oh: "OH", ok: "OK", or: "OR", pa: "PA", ri: "RI", sc: "SC", sd: "SD",
  tn: "TN", tx: "TX", ut: "UT", va: "VA", vt: "VT", wa: "WA", wi: "WI",
  wv: "WV", wy: "WY",
  alaska: "AK", alabama: "AL", arkansas: "AR", arizona: "AZ",
  california: "CA", colorado: "CO", connecticut: "CT",
  "district of columbia": "DC", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", iowa: "IA", idaho: "ID", illinois: "IL", indiana: "IN",
  kansas: "KS", kentucky: "KY", louisiana: "LA", massachusetts: "MA",
  maryland: "MD", maine: "ME", michigan: "MI", minnesota: "MN", missouri: "MO",
  mississippi: "MS", montana: "MT", "north carolina": "NC", "north dakota": "ND",
  nebraska: "NE", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  nevada: "NV", "new york": "NY", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  virginia: "VA", vermont: "VT", washington: "WA", wisconsin: "WI",
  "west virginia": "WV", wyoming: "WY",
};

function normalizeStateToAbbr(state: string): string {
  const normalized = state.toLowerCase().trim();
  return STATE_TO_ABBR[normalized] || state.toUpperCase().slice(0, 2);
}

export interface LocationResult {
  city: string;
  stateAbbr: string;
}

/** Fetch city and state from a 5-digit US zip code via Zippopotam API */
export async function lookupZipCode(zip: string): Promise<LocationResult | null> {
  const cleaned = zip.replace(/\D/g, "");
  if (cleaned.length !== 5) return null;

  const res = await fetch(`https://api.zippopotam.us/us/${cleaned}`);
  if (!res.ok) return null;

  const data = await res.json();
  const place = data?.places?.[0];
  if (!place) return null;

  const city = place["place name"] ?? place.place_name ?? "";
  const stateAbbr = (place["state abbreviation"] ?? place.state ?? "").toString();
  if (!city || !stateAbbr) return null;

  return {
    city,
    stateAbbr: String(stateAbbr).toUpperCase().slice(0, 2),
  };
}

/** Parse "El Paso TX", "El Paso, TX", "El Paso Texas", "El Paso, Texas" - city + state (abbr or full name) */
export function parseCityState(input: string): LocationResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const commaIdx = trimmed.indexOf(",");
  let city: string;
  let stateRaw: string;

  if (commaIdx >= 0) {
    city = trimmed.slice(0, commaIdx).trim();
    stateRaw = trimmed.slice(commaIdx + 1).trim();
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;
    const last = parts[parts.length - 1];
    const isState =
      last.length === 2 ||
      STATE_TO_ABBR[last.toLowerCase()] !== undefined;
    if (!isState) return null;
    stateRaw = last;
    city = parts.slice(0, -1).join(" ").trim();
  }

  if (!city || !stateRaw) return null;

  const stateAbbr = normalizeStateToAbbr(stateRaw);
  return { city, stateAbbr };
}

/** Parse state-only input like "Texas", "TX", "California". Returns state abbreviation or null. */
export function parseStateOnly(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  const abbr = STATE_TO_ABBR[normalized];
  return abbr || null;
}

/** Find city in venues data (city-only search). Returns first match. */
export function findCityInVenues(
  venues: { city?: string; state?: string }[],
  cityQuery: string
): LocationResult | null {
  const q = cityQuery.trim().toLowerCase();
  if (!q) return null;

  const match = venues.find(
    (v) => v.city?.trim().toLowerCase() === q && v.city && v.state
  );
  if (!match || !match.city || !match.state) return null;

  return {
    city: match.city.trim(),
    stateAbbr: normalizeStateToAbbr(match.state),
  };
}

/** Check if input looks like a 5-digit zip code */
export function isZipCode(input: string): boolean {
  return /^\d{5}$/.test(input.replace(/\s/g, ""));
}
