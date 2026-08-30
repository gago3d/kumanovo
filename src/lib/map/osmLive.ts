import type { Map as MapLibreMap, MapGeoJSONFeature, PointLike } from "maplibre-gl";
import { OSM_BBOX } from "./muni";
import {
  allStreets,
  getLiveStreets,
  setLiveStreets,
  streetByName,
  streetToPlace,
  type MapPlace,
  type NamedStreet,
} from "./places";

export { OSM_BBOX };

const OVERPASS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

const HW = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track";
const QUERY = `[out:json][timeout:55];way["highway"~"^(${HW})$"](${OSM_BBOX.s},${OSM_BBOX.w},${OSM_BBOX.n},${OSM_BBOX.e});out geom;`;

const NAME_LAYERS = ["highway-name-path", "highway-name-minor", "highway-name-major"];
const ROAD_LAYERS = [
  "road_minor",
  "road_secondary_tertiary",
  "road_trunk_primary",
  "road_motorway",
  "road_service_track",
  "road_link",
  "road_path_pedestrian",
  "road_motorway_link",
  "bridge_street",
  "bridge_secondary_tertiary",
  "bridge_trunk_primary",
  "bridge_motorway",
  "tunnel_minor",
  "tunnel_secondary_tertiary",
  "tunnel_street",
];

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);
const CACHE_KEY = "kumanovo-osm-streets-v3";
const CACHE_MS = 6 * 60 * 60 * 1000;

type OsmWay = {
  type: string;
  id: number;
  tags?: { name?: string; highway?: string; name_en?: string };
  geometry?: { lat: number; lon: number }[];
};

function wayToStreet(el: OsmWay): NamedStreet | null {
  const geom = el.geometry;
  if (!geom || geom.length < 2) return null;
  const hw = el.tags?.highway || "residential";
  const named = el.tags?.name?.trim() || el.tags?.name_en?.trim() || "";
  if (!named && (hw === "service" || hw === "track")) return null;
  const line: [number, number][] = geom.map((g) => [g.lon, g.lat]);
  const mid = line[Math.floor(line.length / 2)];
  return {
    id: `osm-w/${el.id}`,
    name: named || "улица",
    lat: mid[1],
    lng: mid[0],
    line,
    major: MAJOR.has(hw),
    hw,
    osmId: el.id,
  };
}

function readCache(): NamedStreet[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; streets: NamedStreet[] };
    if (!parsed.at || Date.now() - parsed.at > CACHE_MS) return null;
    if (!Array.isArray(parsed.streets) || parsed.streets.length < 40) return null;
    return parsed.streets;
  } catch {
    return null;
  }
}

function writeCache(streets: NamedStreet[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), streets }));
  } catch {
    /* quota */
  }
}

async function overpassPull(): Promise<NamedStreet[]> {
  const urlQ = `?data=${encodeURIComponent(QUERY)}`;
  for (const base of OVERPASS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 28000);
      const res = await fetch(`${base}${urlQ}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OsmWay[] };
      const rows = (data.elements ?? []).map(wayToStreet).filter((s): s is NamedStreet => Boolean(s));
      if (rows.length > 20) return rows;
    } catch {
      /* next mirror */
    }
  }
  return [];
}

export function uniqueStreetNames(list = allStreets()) {
  return new Set(list.filter((s) => s.name && s.name !== "улица").map((s) => s.name.toLowerCase())).size;
}

/** Live OSM highways for the whole municipality. Cache first, then refresh. */
export async function pullOsmStreets(): Promise<number> {
  const cached = readCache();
  if (cached) {
    setLiveStreets(cached);
  }
  const fresh = await overpassPull();
  if (fresh.length) {
    setLiveStreets(fresh);
    writeCache(fresh);
    return uniqueStreetNames(fresh);
  }
  return uniqueStreetNames();
}

function layerIds(map: MapLibreMap, ids: string[]) {
  return ids.filter((id) => Boolean(map.getLayer(id)));
}

function featName(f: MapGeoJSONFeature) {
  const p = f.properties ?? {};
  const n = p.name || p.name_en || p.name_int || p.ref;
  return typeof n === "string" && n.trim() ? n.trim() : "";
}

function featLine(f: MapGeoJSONFeature): [number, number][] {
  const g = f.geometry;
  if (g.type === "LineString") return g.coordinates as [number, number][];
  if (g.type === "MultiLineString") {
    const parts = g.coordinates as [number, number][][];
    return parts.sort((a, b) => b.length - a.length)[0] ?? [];
  }
  return [];
}

/** Street under the cursor from live OSM vector tiles, matched to Overpass ways. */
export function streetAtPoint(map: MapLibreMap, point: PointLike): MapPlace | null {
  const names = layerIds(map, NAME_LAYERS);
  const roads = layerIds(map, ROAD_LAYERS);
  const named = names.length ? map.queryRenderedFeatures(point, { layers: names }) : [];
  const lined = roads.length ? map.queryRenderedFeatures(point, { layers: roads }) : [];
  const name = featName(named[0]) || featName(lined[0]);
  const line = featLine(lined[0]) || featLine(named[0]);
  if (!name && line.length < 2) return null;
  const known = name ? streetByName(name) : undefined;
  const place = known
    ? streetToPlace(known)
    : ({
        id: name ? `osm-t/${name}` : `osm-l/${line[0]?.[0]},${line[0]?.[1]}`,
        name: name || "улица",
        cat: "street",
        kind: "street",
        lat: line[Math.floor(line.length / 2)]?.[1] ?? map.unproject(point).lat,
        lng: line[Math.floor(line.length / 2)]?.[0] ?? map.unproject(point).lng,
        addr: "OpenStreetMap",
        source: "osm",
        line: line.length > 1 ? line : undefined,
      } satisfies MapPlace);
  if (!place.line && line.length > 1) place.line = line;
  if (!place.web) {
    place.web = place.osmId
      ? `https://www.openstreetmap.org/way/${place.osmId}`
      : `https://www.openstreetmap.org/#map=18/${place.lat}/${place.lng}`;
  }
  return place;
}

export function streetCursor(map: MapLibreMap, point: PointLike) {
  const names = layerIds(map, NAME_LAYERS);
  const roads = layerIds(map, ROAD_LAYERS);
  const layers = [...names, ...roads];
  if (!layers.length) return false;
  return map.queryRenderedFeatures(point, { layers }).length > 0;
}

/** Names currently loaded in OSM vector tiles — fills gaps before Overpass returns. */
export function harvestVisible(map: MapLibreMap): number {
  if (!map.getSource("openmaptiles")) return uniqueStreetNames();
  let feats: ReturnType<MapLibreMap["querySourceFeatures"]> = [];
  try {
    feats = map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation_name" });
  } catch {
    return uniqueStreetNames();
  }
  const have = new Set(allStreets().map((s) => s.name.toLowerCase()));
  const extra: NamedStreet[] = [];
  for (const f of feats) {
    const p = f.properties ?? {};
    const n = p.name || p.name_en || p.name_int || p.ref;
    const name = typeof n === "string" && n.trim() ? n.trim() : "";
    if (!name || have.has(name.toLowerCase())) continue;
    const g = f.geometry;
    let line: [number, number][] = [];
    let c: [number, number] | null = null;
    if (g.type === "LineString") {
      line = g.coordinates as [number, number][];
      c = line[0] ?? null;
    } else if (g.type === "MultiLineString") {
      const parts = g.coordinates as [number, number][][];
      line = parts.sort((a, b) => b.length - a.length)[0] ?? [];
      c = line[0] ?? null;
    } else if (g.type === "Point") {
      c = g.coordinates as [number, number];
    }
    if (!c) continue;
    have.add(name.toLowerCase());
    extra.push({
      id: `osm-t/${name}`,
      name,
      lat: c[1],
      lng: c[0],
      line: line.length > 1 ? line : [c, c],
      major: false,
      hw: String(p.class ?? "street"),
    });
  }
  if (extra.length) setLiveStreets(getLiveStreets().concat(extra));
  return uniqueStreetNames();
}

export function osmWayUrl(id: number) {
  return `https://www.openstreetmap.org/way/${id}`;
}

export function osmMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/#map=18/${lat}/${lng}`;
}
