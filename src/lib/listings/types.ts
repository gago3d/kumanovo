export const SOURCES = ["pazar3", "reklama5", "keyadvisory", "facebook", "google"] as const;
export type SourceId = (typeof SOURCES)[number];

export const LISTING_TYPES = ["stan", "kukja", "lokal", "vikend", "niva"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const OFFERS = ["rent", "sale"] as const;
export type Offer = (typeof OFFERS)[number];

export type PricePeriod = "month" | "day" | "negotiable" | "total";
export type SourceState = "ok" | "unavailable" | "blocked" | "restricted";

export type Listing = {
  id: string;
  source: SourceId;
  sourceUrl: string;
  title: string;
  description: string | null;
  listingType: ListingType;
  offer: Offer;
  priceAmount: number | null;
  priceCurrency: "EUR" | "MKD" | null;
  pricePeriod: PricePeriod;
  areaM2: number | null;
  rooms: number | null;
  address: string | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  worldX: number;
  worldZ: number;
  contactPhone: string | null;
  photoUrl: string | null;
  postedAt: string | null;
  fetchedAt: string;
  available: boolean;
};

export type SourceStatus = {
  source: SourceId;
  status: SourceState;
  detail: string;
  lastOkAt: string | null;
  lastTryAt: string;
  listingCount: number;
};

export type ListingsPayload = {
  listings: Listing[];
  sources: SourceStatus[];
  cachedAt: string | null;
  stale: boolean;
  cacheMinutes: number;
};

export function isLandType(type: ListingType) {
  return type === "vikend" || type === "niva";
}
