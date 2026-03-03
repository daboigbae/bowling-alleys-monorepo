// Server-side venue utilities for Next.js metadata and layout
// Uses direct API calls without browser APIs

import type { FooterVenue } from "./footer-venues-types";

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchVenue(id: string) {
  try {
    const response = await fetch(`${getApiUrl()}/api/venues/${id}`, {
      next: { revalidate: 3600 }, // 1 hour cache (fewer reads; venue changes may take up to 24h)
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching venue ${id}:`, error);
    return null;
  }
}

export async function getVenueForMetadata(id: string) {
  return fetchVenue(id);
}

export interface FooterVenuesData {
  topAlleys: FooterVenue[];
  sponsorVenues: FooterVenue[];
}

/** Fetch venues for layout footer (trending + sponsors). One API call, filter on server. */
export async function getFooterVenues(): Promise<FooterVenuesData> {
  try {
    const response = await fetch(`${getApiUrl()}/api/venues`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return { topAlleys: [], sponsorVenues: [] };
    const venues: FooterVenue[] = await response.json();
    return {
      topAlleys: venues.filter((v) => v.isTopAlley),
      sponsorVenues: venues.filter((v) => v.isSponsor),
    };
  } catch (error) {
    console.error('Error fetching footer venues:', error);
    return { topAlleys: [], sponsorVenues: [] };
  }
}

