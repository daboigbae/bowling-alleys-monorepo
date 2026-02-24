/** Minimal venue shape for footer (trending + sponsors). Used by layout server fetch and Footer. */
export interface FooterVenue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  isFoundingPartner?: boolean;
  logoUrl?: string;
  isTopAlley?: boolean;
  isSponsor?: boolean;
}
