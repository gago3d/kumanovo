import { PUBLIC_SITE } from "@/lib/host";
import { placeListing } from "./locate";
import { fallbackPayload, seedListings } from "./seed";
import type { Listing, ListingsPayload } from "./types";

const LOCAL = "kumanovo-listings-v1";

function urls() {
  const out: string[] = [];
  if (typeof window !== "undefined") {
    out.push(`${window.location.origin}/data/listings.json`);
  }
  out.push(`${PUBLIC_SITE.replace(/\/$/, "")}/data/listings.json`);
  return [...new Set(out)];
}

function asPayload(raw: unknown): ListingsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { listings?: Listing[] };
  if (!Array.isArray(o.listings) || !o.listings.length) return null;
  return raw as ListingsPayload;
}

export function persistListings(listings: Listing[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL, JSON.stringify({ at: Date.now(), listings }));
  } catch {
    /* quota */
  }
}

export function cachedListings(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { listings?: Listing[] };
    return Array.isArray(parsed.listings) ? parsed.listings : [];
  } catch {
    return [];
  }
}

export function mergeListings(...groups: Listing[][]): Listing[] {
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const g of groups) {
    for (const l of g) {
      if (!l?.id || seen.has(l.id)) continue;
      seen.add(l.id);
      out.push(placeListing(l));
    }
  }
  return out;
}

/** GitHub Pages JSON + local cache + seed. No invented ads. */
export async function loadOnlineListings(): Promise<Listing[]> {
  const seed = seedListings();
  const cached = cachedListings();
  for (const url of urls()) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const payload = asPayload(await res.json());
      if (payload?.listings.length) {
        const merged = mergeListings(payload.listings, cached, seed);
        persistListings(merged);
        return merged;
      }
    } catch {
      /* next */
    }
  }
  const merged = mergeListings(cached, seed);
  persistListings(merged);
  return merged;
}

export function allSeedPayload(): ListingsPayload {
  return fallbackPayload(true);
}
