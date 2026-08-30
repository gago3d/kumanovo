import { create } from "zustand";
import type { Lang } from "@/lib/i18n";
import type { AgentId } from "@/lib/listings/agents";
import { listingSig, type ListingCheck } from "@/lib/listings/buyers";
import { placeListing } from "@/lib/listings/locate";
import type { Listing, ListingType, SourceId, SourceStatus } from "@/lib/listings/types";
import { isLandType } from "@/lib/listings/types";
import type { MapPlace, PoiCat, RouteResult, TravelMode } from "@/lib/map/places";

export type CameraMode = "orbit" | "fps";
export type Basemap = "streets" | "sat";

export type Filters = {
  maxEur: number | null;
  rooms: number | null;
  types: ListingType[] | "all";
  sources: SourceId[] | "all";
  todayOnly: boolean;
  includeSale: boolean;
  savedOnly: boolean;
};

const FILTERS: Filters = {
  maxEur: null,
  rooms: null,
  types: "all",
  sources: "all",
  todayOnly: false,
  includeSale: true,
  savedOnly: false,
};

export type FeedItem = { id: string; listingId: string | null; text: string; at: number };
export type FlyTo = { lat: number; lng: number; x: number; z: number; name: string; zoom?: number };
export type ViewCenter = { lat: number; lng: number; zoom: number };
export type MapMenu = { lat: number; lng: number; sx: number; sy: number };

type Panel = "none" | "filters" | "list" | "listing" | "sources" | "places" | "place" | "route" | "share" | "agent";

type AppState = {
  lang: Lang;
  night: boolean;
  cameraMode: CameraMode;
  followAgent: boolean;
  followAgentId: AgentId;
  showLabels: boolean;
  showPins: boolean;
  basemap: Basemap;
  flyTo: FlyTo | null;
  view: ViewCenter;
  filters: Filters;
  listings: Listing[];
  liveIds: string[];
  sources: SourceStatus[];
  cachedAt: string | null;
  stale: boolean;
  loading: boolean;
  discovered: string[];
  confirmed: Listing[];
  checks: Record<string, ListingCheck>;
  foundBuyers: string[];
  learned: string[];
  selectedId: string | null;
  saved: string[];
  feed: FeedItem[];
  panel: Panel;
  fpsLocked: boolean;
  selectedPlace: MapPlace | null;
  category: PoiCat | null;
  route: RouteResult | null;
  routeMode: TravelMode;
  routeFrom: MapPlace | null;
  routeTo: MapPlace | null;
  myLoc: { lat: number; lng: number } | null;
  mapMenu: MapMenu | null;
  osmStreetN: number;
  setLang: (l: Lang) => void;
  setNight: (n: boolean) => void;
  setCamera: (m: CameraMode) => void;
  setFollow: (v: boolean) => void;
  setFollowAgentId: (id: AgentId) => void;
  setShowLabels: (v: boolean) => void;
  setShowPins: (v: boolean) => void;
  setBasemap: (v: Basemap) => void;
  setFlyTo: (v: FlyTo | null) => void;
  setView: (v: ViewCenter) => void;
  setFilters: (p: Partial<Filters>) => void;
  setPayload: (listings: Listing[], sources: SourceStatus[], cachedAt: string | null, stale: boolean) => void;
  setLoading: (v: boolean) => void;
  discover: (id: string, text: string) => void;
  verifyListing: (id: string) => ListingCheck | null;
  findBuyer: (id: string, text: string) => void;
  learnStreets: (ids: string[]) => void;
  select: (id: string | null) => void;
  toggleSave: (id: string) => void;
  pushFeed: (text: string, listingId?: string | null) => void;
  setPanel: (p: Panel) => void;
  setFpsLocked: (v: boolean) => void;
  setSelectedPlace: (p: MapPlace | null) => void;
  setCategory: (c: PoiCat | null) => void;
  setRoute: (r: RouteResult | null) => void;
  setRouteMode: (m: TravelMode) => void;
  setRouteEnds: (from: MapPlace | null, to: MapPlace | null) => void;
  setMyLoc: (v: { lat: number; lng: number } | null) => void;
  setMapMenu: (v: MapMenu | null) => void;
  setOsmStreetN: (n: number) => void;
  clearRoute: () => void;
};

const SAVE_KEY = "kumanovski-stan-saved";
const LANG_KEY = "kumanovski-stan-lang";
const MARKET_KEY = "kumanovo-market-v1";

type MarketSave = {
  discovered: string[];
  confirmed: Listing[];
  checks: Record<string, ListingCheck>;
  foundBuyers: string[];
  learned: string[];
};

function loadMarket(): MarketSave {
  const empty: MarketSave = { discovered: [], confirmed: [], checks: {}, foundBuyers: [], learned: [] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(MARKET_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<MarketSave>;
    return {
      discovered: Array.isArray(parsed.discovered) ? parsed.discovered.filter((x) => typeof x === "string") : [],
      confirmed: Array.isArray(parsed.confirmed) ? (parsed.confirmed as Listing[]) : [],
      checks: parsed.checks && typeof parsed.checks === "object" ? parsed.checks : {},
      foundBuyers: Array.isArray(parsed.foundBuyers) ? parsed.foundBuyers.filter((x) => typeof x === "string") : [],
      learned: Array.isArray(parsed.learned) ? parsed.learned.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return empty;
  }
}

function saveMarket(m: MarketSave) {
  try {
    localStorage.setItem(MARKET_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "mk";
  } catch {
    return "mk";
  }
}

export const useApp = create<AppState>((set, get) => {
  const market = typeof window === "undefined" ? loadMarket() : loadMarket();
  return {
  lang: typeof window === "undefined" ? "mk" : loadLang(),
  night: false,
  cameraMode: "orbit",
  followAgent: false,
  followAgentId: "home",
  showLabels: true,
  showPins: true,
  basemap: "streets",
  flyTo: null,
  view: { lat: 42.13232, lng: 21.71442, zoom: 15.55 },
  filters: FILTERS,
  listings: market.confirmed,
  liveIds: [],
  sources: [],
  cachedAt: null,
  stale: true,
  loading: true,
  discovered: market.discovered,
  confirmed: market.confirmed,
  checks: market.checks,
  foundBuyers: market.foundBuyers,
  learned: market.learned,
  selectedId: null,
  saved: typeof window === "undefined" ? [] : loadSaved(),
  feed: [],
  panel: "none",
  fpsLocked: false,
  selectedPlace: null,
  category: null,
  route: null,
  routeMode: "driving",
  routeFrom: null,
  routeTo: null,
  myLoc: null,
  mapMenu: null,
  osmStreetN: 0,
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    set({ lang });
  },
  setNight: (night) => set({ night }),
  setCamera: (cameraMode) =>
    set({
      cameraMode,
      followAgent: cameraMode === "orbit" ? get().followAgent : false,
      fpsLocked: cameraMode === "fps" ? get().fpsLocked : false,
    }),
  setFollow: (followAgent) => set({ followAgent }),
  setFollowAgentId: (followAgentId) => set({ followAgentId, followAgent: true }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setShowPins: (showPins) => set({ showPins }),
  setBasemap: (basemap) => set({ basemap }),
  setFlyTo: (flyTo) => set({ flyTo, followAgent: flyTo ? false : get().followAgent }),
  setView: (view) => set({ view }),
  setFilters: (p) => set({ filters: { ...get().filters, ...p } }),
  setPayload: (listings, sources, cachedAt, stale) => {
    const placed = listings.map((l) => placeListing(l));
    const incoming = new Map(placed.map((l) => [l.id, l]));
    const liveIds = placed.map((l) => l.id);
    const confirmed = get().confirmed.map((c) => incoming.get(c.id) ?? placeListing(c));
    const extra = confirmed.filter((c) => !incoming.has(c.id));
    const merged = [...placed, ...extra];
    const discovered = Array.from(new Set([...get().discovered, ...confirmed.map((c) => c.id)]));
    saveMarket({
      discovered,
      confirmed,
      checks: get().checks,
      foundBuyers: get().foundBuyers,
      learned: get().learned,
    });
    set({ listings: merged, liveIds, sources, cachedAt, stale, loading: false, discovered, confirmed });
  },
  setLoading: (loading) => set({ loading }),
  discover: (id, text) => {
    if (get().discovered.includes(id)) return;
    const listing = get().listings.find((l) => l.id === id);
    const confirmed = listing && !get().confirmed.some((c) => c.id === id) ? [...get().confirmed, listing] : get().confirmed;
    const checks = { ...get().checks };
    if (listing && !checks[id]) {
      checks[id] = { status: "pending", at: Date.now(), note: "", sig: listingSig(listing) };
    }
    const discovered = [...get().discovered, id];
    saveMarket({
      discovered,
      confirmed,
      checks,
      foundBuyers: get().foundBuyers,
      learned: get().learned,
    });
    set({
      discovered,
      confirmed,
      checks,
      feed: [{ id: `f-${id}`, listingId: id, text, at: Date.now() }, ...get().feed].slice(0, 24),
    });
  },
  verifyListing: (id) => {
    const st = get();
    const onSource = st.liveIds.includes(id);
    const live = onSource ? st.listings.find((l) => l.id === id) : undefined;
    const held = st.confirmed.find((l) => l.id === id) ?? live;
    if (!held) return null;
    const prev = st.checks[id];
    const now = Date.now();
    let next: ListingCheck;
    if (!live) {
      next = { status: "gone", at: now, note: "не е повеќе на изворот", sig: prev?.sig ?? listingSig(held) };
    } else {
      const sig = listingSig(live);
      const changed = prev?.sig && prev.sig !== sig;
      next = {
        status: changed ? "changed" : "live",
        at: now,
        note: changed ? "има промена на цената или насловот" : "сè уште присутен",
        sig,
      };
    }
    const confirmed = live
      ? st.confirmed.some((c) => c.id === id)
        ? st.confirmed.map((c) => (c.id === id ? live : c))
        : [...st.confirmed, live]
      : st.confirmed;
    const checks = { ...st.checks, [id]: next };
    saveMarket({
      discovered: st.discovered,
      confirmed,
      checks,
      foundBuyers: st.foundBuyers,
      learned: st.learned,
    });
    set({ checks, confirmed });
    return next;
  },
  findBuyer: (id, text) => {
    if (get().foundBuyers.includes(id)) return;
    const foundBuyers = [...get().foundBuyers, id];
    saveMarket({
      discovered: get().discovered,
      confirmed: get().confirmed,
      checks: get().checks,
      foundBuyers,
      learned: get().learned,
    });
    set({
      foundBuyers,
      feed: [{ id: `fb-${id}`, listingId: null, text, at: Date.now() }, ...get().feed].slice(0, 24),
    });
  },
  learnStreets: (ids) => {
    if (!ids.length) return;
    const cur = get().learned;
    const extra = ids.filter((id) => !cur.includes(id));
    if (!extra.length) return;
    const learned = [...cur, ...extra].slice(-420);
    saveMarket({
      discovered: get().discovered,
      confirmed: get().confirmed,
      checks: get().checks,
      foundBuyers: get().foundBuyers,
      learned,
    });
    set({ learned });
  },
  select: (selectedId) =>
    set({
      selectedId,
      selectedPlace: selectedId ? null : get().selectedPlace,
      panel: selectedId ? "listing" : get().panel === "listing" ? "none" : get().panel,
      mapMenu: null,
    }),
  toggleSave: (id) => {
    const cur = get().saved;
    const saved = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
    set({ saved });
  },
  pushFeed: (text, listingId = null) =>
    set({
      feed: [{ id: `f-${Date.now()}`, listingId, text, at: Date.now() }, ...get().feed].slice(0, 24),
    }),
  setPanel: (panel) => set({ panel, mapMenu: null }),
  setFpsLocked: (fpsLocked) => set({ fpsLocked }),
  setSelectedPlace: (selectedPlace) =>
    set({
      selectedPlace,
      selectedId: selectedPlace ? null : get().selectedId,
      panel: selectedPlace ? "place" : get().panel === "place" ? "none" : get().panel,
      mapMenu: null,
    }),
  setCategory: (category) => set({ category, panel: category ? "none" : get().panel, mapMenu: null }),
  setRoute: (route) => set({ route }),
  setRouteMode: (routeMode) => set({ routeMode }),
  setRouteEnds: (routeFrom, routeTo) =>
    set({
      routeFrom,
      routeTo,
      panel: routeTo || routeFrom ? "route" : get().panel,
      route: null,
      mapMenu: null,
    }),
  setMyLoc: (myLoc) => set({ myLoc }),
  setMapMenu: (mapMenu) => set({ mapMenu }),
  setOsmStreetN: (osmStreetN) => set({ osmStreetN }),
  clearRoute: () => set({ route: null, routeFrom: null, routeTo: null, panel: get().panel === "route" ? "none" : get().panel }),
  };
});

export function filterListings(listings: Listing[], filters: Filters, saved: string[]): Listing[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return listings.filter((l) => {
    if (!filters.includeSale && l.offer === "sale" && !isLandType(l.listingType)) return false;
    if (filters.savedOnly && !saved.includes(l.id)) return false;
    if (filters.types !== "all" && !filters.types.includes(l.listingType)) return false;
    if (filters.sources !== "all" && !filters.sources.includes(l.source)) return false;
    if (filters.rooms != null && (l.rooms == null || l.rooms < filters.rooms)) return false;
    if (filters.todayOnly) {
      if (!l.postedAt) return false;
      if (Date.parse(l.postedAt) < start.getTime()) return false;
    }
    if (filters.maxEur != null && l.priceAmount != null && l.priceCurrency) {
      const eur = l.priceCurrency === "MKD" ? l.priceAmount / 61.5 : l.priceAmount;
      if (l.pricePeriod === "month" && eur > filters.maxEur) return false;
    }
    return true;
  });
}

export function filteredListings(state: {
  listings: Listing[];
  filters: Filters;
  saved: string[];
}): Listing[] {
  return filterListings(state.listings, state.filters, state.saved);
}
