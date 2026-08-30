import poisJson from "./pois.json";
import streetsJson from "./streets.json";
import villagesJson from "./villages.json";
import { LANDMARKS, NEIGHBORHOODS, toWorld } from "@/lib/city/map";

export type PoiCat =
  | "food"
  | "cafe"
  | "shop"
  | "health"
  | "fuel"
  | "parking"
  | "hotel"
  | "bank"
  | "school"
  | "sport"
  | "transit"
  | "worship"
  | "civic"
  | "historic"
  | "office"
  | "park"
  | "street"
  | "village"
  | "land"
  | "other";

export type TravelMode = "driving" | "walking" | "cycling";

export type MapPlace = {
  id: string;
  name: string;
  nameEn?: string;
  cat: PoiCat;
  kind: string;
  lat: number;
  lng: number;
  addr?: string | null;
  phone?: string | null;
  web?: string | null;
  oh?: string | null;
  source: "osm" | "photon" | "local" | "geo" | "click";
  osmId?: number;
  line?: [number, number][];
};

export type RouteStep = {
  instruction: string;
  street: string;
  distance: number;
};

export type RouteResult = {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  mode: TravelMode;
  steps: RouteStep[];
};

export type OsmPoi = {
  id: string;
  name: string;
  nameEn: string;
  cat: PoiCat;
  kind: string;
  lat: number;
  lng: number;
  addr: string | null;
  phone: string | null;
  web: string | null;
  oh: string | null;
};

export type NamedStreet = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  line: [number, number][];
  lines?: [number, number][][];
  major: boolean;
  hw: string;
  osmId?: number;
};

export type OsmVillage = {
  id: string;
  osmId: number;
  name: string;
  nameEn: string;
  place: string;
  lat: number;
  lng: number;
};

export const OSM_POIS = poisJson as OsmPoi[];
export const STREETS = streetsJson as NamedStreet[];
export const VILLAGES = villagesJson as OsmVillage[];

let liveExtra: NamedStreet[] = [];

export function setLiveStreets(rows: NamedStreet[]) {
  liveExtra = rows;
}

export function getLiveStreets() {
  return liveExtra;
}

export function allStreets(): NamedStreet[] {
  if (!liveExtra.length) return STREETS;
  const ids = new Set(liveExtra.map((s) => String(s.osmId ?? s.id)));
  const names = new Set(
    liveExtra.filter((s) => s.name && s.name !== "улица").map((s) => s.name.toLowerCase()),
  );
  const rest = STREETS.filter((s) => {
    if (ids.has(String(s.osmId ?? s.id))) return false;
    if (s.name !== "улица" && names.has(s.name.toLowerCase())) return false;
    return true;
  });
  return liveExtra.concat(rest);
}

export function villagePlaces(): MapPlace[] {
  return VILLAGES.map((v) => ({
    id: v.id,
    name: v.name,
    nameEn: v.nameEn,
    cat: "village" as const,
    kind: v.place || "village",
    lat: v.lat,
    lng: v.lng,
    addr: "Општина Куманово · OpenStreetMap",
    source: "osm" as const,
    osmId: v.osmId || undefined,
    web: `https://www.openstreetmap.org/node/${v.osmId}`,
  }));
}

export const POI_CATS: { id: PoiCat; mk: string; en: string }[] = [
  { id: "food", mk: "Храна", en: "Food" },
  { id: "cafe", mk: "Кафулиња", en: "Cafes" },
  { id: "shop", mk: "Продавници", en: "Shops" },
  { id: "health", mk: "Здравство", en: "Health" },
  { id: "fuel", mk: "Гориво", en: "Fuel" },
  { id: "parking", mk: "Паркинг", en: "Parking" },
  { id: "hotel", mk: "Хотели", en: "Hotels" },
  { id: "bank", mk: "Банки", en: "Banks" },
  { id: "school", mk: "Училишта", en: "Schools" },
  { id: "sport", mk: "Спорт", en: "Sport" },
  { id: "transit", mk: "Превоз", en: "Transit" },
  { id: "worship", mk: "Верски", en: "Worship" },
  { id: "civic", mk: "Градски", en: "Civic" },
  { id: "historic", mk: "Историја", en: "Historic" },
  { id: "park", mk: "Паркови", en: "Parks" },
  { id: "village", mk: "Села", en: "Villages" },
  { id: "street", mk: "Улици", en: "Streets" },
];

const GENERIC = new Set([
  "bus_stop",
  "parking",
  "atm",
  "fuel",
  "platform",
  "charging_station",
  "kiosk",
  "park",
]);

const KIND_MK: Record<string, string> = {
  bus_stop: "Автобуска",
  parking: "Паркинг",
  atm: "Банкомат",
  fuel: "Бензинска",
  platform: "Перон",
  charging_station: "Полна станица",
  kiosk: "Трафика",
  park: "Парк",
  restaurant: "Ресторан",
  cafe: "Кафе",
  pharmacy: "Аптека",
  hospital: "Болница",
  school: "Училиште",
  street: "Улица",
  village: "Село",
  hamlet: "Населено место",
  suburb: "Населба",
  farmland: "Нива",
};

const KIND_EN: Record<string, string> = {
  bus_stop: "Bus stop",
  parking: "Parking",
  atm: "ATM",
  fuel: "Fuel",
  platform: "Platform",
  charging_station: "Charging",
  kiosk: "Kiosk",
  park: "Park",
  restaurant: "Restaurant",
  cafe: "Cafe",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  school: "School",
  street: "Street",
  village: "Village",
  hamlet: "Hamlet",
  suburb: "Suburb",
  farmland: "Field",
};

export function catLabel(cat: PoiCat, lang: "mk" | "en") {
  const row = POI_CATS.find((c) => c.id === cat);
  if (row) return lang === "mk" ? row.mk : row.en;
  if (cat === "land") return lang === "mk" ? "Земја" : "Land";
  if (cat === "office") return lang === "mk" ? "Канцеларии" : "Offices";
  return cat;
}

export function poiToPlace(p: OsmPoi): MapPlace {
  return {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    cat: p.cat,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    addr: p.addr,
    phone: p.phone,
    web: p.web,
    oh: p.oh,
    source: "osm",
  };
}

export function streetToPlace(s: NamedStreet): MapPlace {
  return {
    id: s.id,
    name: s.name,
    nameEn: s.name,
    cat: "street",
    kind: s.hw || "street",
    lat: s.lat,
    lng: s.lng,
    addr: s.osmId ? `OpenStreetMap · way/${s.osmId}` : s.major ? (s.hw === "primary" || s.hw === "trunk" ? "главен пат" : "улица") : "улица",
    source: "osm",
    osmId: s.osmId,
    line: s.line,
    web: s.osmId
      ? `https://www.openstreetmap.org/way/${s.osmId}`
      : `https://www.openstreetmap.org/#map=18/${s.lat}/${s.lng}`,
  };
}

export function streetById(id: string): NamedStreet | undefined {
  return allStreets().find((s) => s.id === id);
}

export function streetByName(name: string): NamedStreet | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const hits = allStreets().filter((s) => s.name.toLowerCase() === n);
  if (!hits.length) {
    return allStreets().find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase()));
  }
  const lines = hits.map((s) => s.line).filter((l) => l.length > 1);
  const best = hits.slice().sort((a, b) => b.line.length - a.line.length)[0];
  if (lines.length <= 1) return best;
  return { ...best, lines };
}

export function streetHighlight(place: MapPlace | null): [number, number][][] {
  if (!place) return [];
  if (place.line && place.line.length > 1) {
    const named = place.name ? allStreets().filter((s) => s.name.toLowerCase() === place.name.toLowerCase()) : [];
    const extra = named.map((s) => s.line).filter((l) => l.length > 1);
    if (extra.length) return extra;
    return [place.line];
  }
  const s = streetById(place.id) ?? (place.cat === "street" ? streetByName(place.name) : undefined);
  if (!s) return [];
  if (s.lines && s.lines.length) return s.lines.filter((l) => l.length > 1);
  return s.line.length > 1 ? [s.line] : [];
}

export function localCatalog(): MapPlace[] {
  const out: MapPlace[] = OSM_POIS.map(poiToPlace);
  for (const n of NEIGHBORHOODS) {
    out.push({
      id: `n-${n.id}`,
      name: n.nameMk,
      nameEn: n.nameEn,
      cat: n.kind === "edge" ? "village" : "civic",
      kind: n.kind === "edge" ? "village" : "neighbourhood",
      lat: n.lat,
      lng: n.lng,
      source: "local",
    });
  }
  for (const l of LANDMARKS) {
    out.push({
      id: `l-${l.id}`,
      name: l.nameMk,
      nameEn: l.nameEn,
      cat: l.kind === "church" || l.kind === "mosque" ? "worship" : "civic",
      kind: l.kind,
      lat: l.lat,
      lng: l.lng,
      source: "local",
    });
  }
  for (const s of allStreets()) out.push(streetToPlace(s));
  return out;
}

const STATIC_PLACES: MapPlace[] = (() => {
  const rows: MapPlace[] = OSM_POIS.map(poiToPlace);
  for (const n of NEIGHBORHOODS) {
    rows.push({
      id: `n-${n.id}`,
      name: n.nameMk,
      nameEn: n.nameEn,
      cat: n.kind === "edge" ? "village" : "civic",
      kind: n.kind === "edge" ? "village" : "neighbourhood",
      lat: n.lat,
      lng: n.lng,
      source: "local",
    });
  }
  for (const l of LANDMARKS) {
    rows.push({
      id: `l-${l.id}`,
      name: l.nameMk,
      nameEn: l.nameEn,
      cat: l.kind === "church" || l.kind === "mosque" ? "worship" : "civic",
      kind: l.kind,
      lat: l.lat,
      lng: l.lng,
      source: "local",
    });
  }
  return rows;
})();

export function poisByCat(cat: PoiCat): MapPlace[] {
  if (cat === "street") {
    const seen = new Set<string>();
    const out: MapPlace[] = [];
    for (const s of allStreets()) {
      if (s.name === "улица") continue;
      const k = s.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(streetToPlace(s));
    }
    return out;
  }
  if (cat === "village") return villagePlaces();
  return OSM_POIS.filter((p) => p.cat === cat).map(poiToPlace);
}

export function searchLocal(q: string, lang: "mk" | "en"): MapPlace[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const catalog = STATIC_PLACES.concat(allStreets().map(streetToPlace));
  const hits = catalog.filter((p) => {
    const n = (lang === "en" ? p.nameEn || p.name : p.name).toLowerCase();
    return n.includes(s) || p.kind.toLowerCase().includes(s) || (p.addr ?? "").toLowerCase().includes(s);
  });
  hits.sort((a, b) => {
    const rank = (p: MapPlace) =>
      p.cat === "street" ? 0 : p.kind === "village" || p.kind === "neighbourhood" || p.cat === "village" ? 1 : 2;
    return rank(a) - rank(b);
  });
  return hits;
}

export function kumanovoSquare(lang: "mk" | "en"): MapPlace {
  return {
    id: "l-square",
    name: lang === "mk" ? "Плоштад Нова Југославија" : "Nova Jugoslavija Square",
    nameEn: "Nova Jugoslavija Square",
    cat: "civic",
    kind: "square",
    lat: 42.13232,
    lng: 21.71442,
    source: "local",
  };
}

export function myLocationPlace(lat: number, lng: number, lang: "mk" | "en"): MapPlace {
  return {
    id: "me",
    name: lang === "mk" ? "Моја локација" : "My location",
    cat: "other",
    kind: "here",
    lat,
    lng,
    source: "geo",
  };
}

export function clickPlace(lat: number, lng: number, name?: string): MapPlace {
  return {
    id: `click/${lat.toFixed(5)},${lng.toFixed(5)}`,
    name: name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    cat: "other",
    kind: "point",
    lat,
    lng,
    source: "click",
  };
}

export function landmarkPlace(id: string, lang: "mk" | "en"): MapPlace | null {
  const l = LANDMARKS.find((x) => x.id === id);
  if (!l) return null;
  return {
    id: `l-${l.id}`,
    name: lang === "mk" ? l.nameMk : l.nameEn,
    nameEn: l.nameEn,
    cat: l.kind === "church" || l.kind === "mosque" ? "worship" : "civic",
    kind: l.kind,
    lat: l.lat,
    lng: l.lng,
    source: "local",
  };
}

export function placeTitle(p: MapPlace, lang: "mk" | "en") {
  const n = (lang === "en" ? p.nameEn || p.name : p.name).trim();
  if (!n || GENERIC.has(n) || n === p.kind) {
    const table = lang === "mk" ? KIND_MK : KIND_EN;
    return table[p.kind] || catLabel(p.cat, lang);
  }
  return n;
}

export function flyPayload(p: MapPlace) {
  const w = toWorld(p.lat, p.lng);
  return { lat: p.lat, lng: p.lng, x: w.x, z: w.z, name: p.name };
}

export function formatKm(meters: number, lang: "mk" | "en") {
  if (meters < 950) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const n = km >= 10 ? km.toFixed(0) : km.toFixed(1);
  return lang === "mk" ? `${n} км` : `${n} km`;
}

export function formatMins(seconds: number, lang: "mk" | "en") {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return lang === "mk" ? `${m} мин` : `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return lang === "mk" ? `${h} ч ${r} мин` : `${h} h ${r} min`;
}

export function formatCoord(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function osmTypeToCat(key?: string, value?: string): PoiCat {
  const v = value ?? "";
  const k = key ?? "";
  if (k === "highway" || v === "street" || k === "street") return "street";
  if (["restaurant", "fast_food", "food_court", "ice_cream"].includes(v)) return "food";
  if (["cafe", "bar", "pub"].includes(v)) return "cafe";
  if (k === "shop") return "shop";
  if (["pharmacy", "hospital", "clinic", "doctors", "dentist", "veterinary"].includes(v)) return "health";
  if (v === "fuel" || v === "charging_station") return "fuel";
  if (v === "parking") return "parking";
  if (["hotel", "guest_house", "hostel", "motel"].includes(v)) return "hotel";
  if (["bank", "atm"].includes(v)) return "bank";
  if (["school", "university", "kindergarten", "college", "library"].includes(v)) return "school";
  if (["stadium", "sports_centre", "pitch", "park", "swimming_pool", "fitness_centre", "garden"].includes(v))
    return v === "park" || v === "garden" ? "park" : "sport";
  if (["station", "halt", "bus_stop", "platform", "bus_station"].includes(v) || k === "public_transport")
    return "transit";
  if (v === "place_of_worship") return "worship";
  if (["townhall", "courthouse", "police", "post_office", "community_centre", "village", "hamlet"].includes(v))
    return v === "village" || v === "hamlet" ? "village" : "civic";
  if (k === "historic" || v === "memorial" || v === "monument") return "historic";
  if (k === "office") return "office";
  if (["farmland", "meadow", "orchard", "farmyard"].includes(v) || k === "landuse") return "land";
  if (k === "leisure" && v === "park") return "park";
  return "other";
}

export function mergePlaces(local: MapPlace[], live: MapPlace[]): MapPlace[] {
  const seen = new Set(local.map((p) => p.id));
  const names = new Set(local.map((p) => p.name.toLowerCase()));
  const extra = live.filter((p) => {
    if (seen.has(p.id)) return false;
    if (names.has(p.name.toLowerCase())) return false;
    seen.add(p.id);
    return true;
  });
  return [...local, ...extra];
}

const TURN_MK: Record<string, string> = {
  left: "сврти лево",
  right: "сврти десно",
  "slight left": "благо лево",
  "slight right": "благо десно",
  "sharp left": "остро лево",
  "sharp right": "остро десно",
  straight: "продолжи право",
  uturn: "полукруг",
};

const TURN_EN: Record<string, string> = {
  left: "turn left",
  right: "turn right",
  "slight left": "bear left",
  "slight right": "bear right",
  "sharp left": "sharp left",
  "sharp right": "sharp right",
  straight: "continue straight",
  uturn: "make a U-turn",
};

export function formatManeuver(type: string, modifier: string | undefined, street: string, lang: "mk" | "en") {
  const mk = lang === "mk";
  const turn = (mk ? TURN_MK : TURN_EN)[modifier ?? ""] ?? (mk ? "продолжи" : "continue");
  const onto = street ? (mk ? ` на ${street}` : ` onto ${street}`) : "";
  if (type === "depart") return mk ? `Тргни${street ? ` по ${street}` : ""}` : `Head${street ? ` on ${street}` : ""}`;
  if (type === "arrive") return mk ? "Пристигни на целта" : "Arrive at destination";
  if (type === "roundabout" || type === "rotary") return mk ? `Кружен тек${onto}` : `Roundabout${onto}`;
  if (type === "merge") return mk ? `Спои се${onto}` : `Merge${onto}`;
  if (type === "on ramp") return mk ? `Влез на пат${onto}` : `Take the ramp${onto}`;
  if (type === "off ramp" || type === "exit") return mk ? `Излез${onto}` : `Take the exit${onto}`;
  if (type === "fork") return `${turn}${onto}`;
  if (type === "new name" || type === "continue") return mk ? `Продолжи${onto}` : `Continue${onto}`;
  return `${turn}${onto}`;
}

export function parseMapHash(hash = typeof window === "undefined" ? "" : window.location.hash) {
  const m = hash.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  const zoom = Number(m[3]);
  if (![lat, lng, zoom].every(Number.isFinite)) return null;
  return { lat, lng, zoom };
}

export function writeMapHash(lat: number, lng: number, zoom: number) {
  if (typeof window === "undefined") return;
  const next = `#@${lat.toFixed(5)},${lng.toFixed(5)},${zoom.toFixed(2)}z`;
  if (window.location.hash !== next) history.replaceState(null, "", next);
}

