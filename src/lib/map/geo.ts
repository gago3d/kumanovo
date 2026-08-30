import { clickPlace, formatManeuver, osmTypeToCat, type MapPlace, type RouteResult, type RouteStep, type TravelMode } from "./places";

const PHOTON = "https://photon.komoot.io";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM: Record<TravelMode, string> = {
  driving: "https://router.project-osrm.org/route/v1/driving",
  walking: "https://router.project-osrm.org/route/v1/walking",
  cycling: "https://router.project-osrm.org/route/v1/cycling",
};

async function getJson(url: string, ms = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

type PhotonFeat = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    country?: string;
    type?: string;
  };
};

function featToPlace(f: PhotonFeat): MapPlace | null {
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties;
  const name = p.name || p.street || p.city;
  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const addr = [p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street, p.district, p.city]
    .filter(Boolean)
    .join(", ");
  return {
    id: p.osm_id ? `p/${p.osm_type ?? "n"}/${p.osm_id}` : `p/${lng.toFixed(5)},${lat.toFixed(5)}`,
    name,
    cat:
      osmTypeToCat(p.osm_key, p.osm_value) === "other" && (p.type === "street" || p.osm_key === "highway")
        ? "street"
        : osmTypeToCat(p.osm_key, p.osm_value),
    kind: p.osm_value || p.type || "place",
    lat,
    lng,
    addr: addr || null,
    source: "photon",
  };
}

export async function photonSearch(q: string, lat: number, lng: number, lang: "mk" | "en"): Promise<MapPlace[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lng}&limit=8&lang=${lang === "mk" ? "default" : "en"}`;
  const data = (await getJson(url)) as { features?: PhotonFeat[] } | null;
  if (data?.features?.length) {
    return data.features.map(featToPlace).filter((p): p is MapPlace => Boolean(p));
  }
  const nom = (await getJson(
    `${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(query)}&lat=${lat}&lon=${lng}&limit=6&accept-language=${lang}`,
  )) as { lat: string; lon: string; display_name?: string; name?: string; osm_id?: number; osm_type?: string; type?: string }[] | null;
  if (!nom?.length) return [];
  return nom
    .map((n) => {
      const nlat = Number(n.lat);
      const nlng = Number(n.lon);
      if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return null;
      const place: MapPlace = {
        id: n.osm_id ? `n/${n.osm_type ?? "n"}/${n.osm_id}` : `n/${nlng.toFixed(5)},${nlat.toFixed(5)}`,
        name: n.name || n.display_name?.split(",")[0] || query,
        cat: n.type === "highway" || n.type === "residential" ? "street" : "other",
        kind: n.type || "place",
        lat: nlat,
        lng: nlng,
        addr: n.display_name ?? null,
        source: "photon",
      };
      return place;
    })
    .filter((p): p is MapPlace => Boolean(p));
}

export async function photonReverse(lat: number, lng: number): Promise<MapPlace> {
  const url = `${PHOTON}/reverse?lat=${lat}&lon=${lng}`;
  const data = (await getJson(url)) as { features?: PhotonFeat[] } | null;
  const f = data?.features?.[0];
  const fallback = clickPlace(lat, lng);
  if (f) {
    const place = featToPlace(f);
    if (place) {
      place.source = "click";
      place.lat = lat;
      place.lng = lng;
      if (!f.properties.name) place.name = place.addr || place.name;
      return place;
    }
  }
  const nom = (await getJson(
    `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=mk`,
  )) as { display_name?: string; name?: string; address?: { road?: string; suburb?: string; city?: string } } | null;
  if (!nom) return fallback;
  const name = nom.name || nom.address?.road || nom.display_name?.split(",")[0] || fallback.name;
  return {
    ...fallback,
    name,
    addr: nom.display_name ?? fallback.addr,
    kind: nom.address?.road ? "street" : fallback.kind,
    cat: nom.address?.road ? "street" : fallback.cat,
  };
}

type OsrmStep = {
  distance: number;
  name?: string;
  maneuver?: { type?: string; modifier?: string };
};

export async function osrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TravelMode,
  lang: "mk" | "en" = "mk",
): Promise<RouteResult | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM[mode]}/${path}?overview=full&geometries=geojson&steps=true`;
  const data = (await getJson(url, 12000)) as {
    code?: string;
    routes?: {
      distance: number;
      duration: number;
      geometry: { type: "LineString"; coordinates: [number, number][] };
      legs?: { steps?: OsrmStep[] }[];
    }[];
  } | null;
  const r = data?.routes?.[0];
  if (!r?.geometry) return null;
  const raw = (r.legs ?? []).flatMap((leg) => leg.steps ?? []);
  const steps: RouteStep[] = raw
    .filter((s) => s.maneuver?.type && s.maneuver.type !== "notification")
    .map((s) => {
      const street = s.name && s.name !== "-" ? s.name : "";
      return {
        instruction: formatManeuver(s.maneuver?.type ?? "continue", s.maneuver?.modifier, street, lang),
        street,
        distance: s.distance,
      };
    });
  return { distance: r.distance, duration: r.duration, geometry: r.geometry, mode, steps };
}
