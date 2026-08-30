import type { Map as MapLibreMap } from "maplibre-gl";

/** OSM relation 2585982 — Општина Куманово, admin_level 7. */
export const MUNI_REL = 2585982;

/** Axis-aligned bounds of the municipality polygon. */
export const OSM_BBOX = { s: 41.9605432, w: 21.6101503, n: 42.2682553, e: 21.9932985 };

export const MUNI_CENTER: [number, number] = [21.76, 42.132];

export function fitMunicipality(map: MapLibreMap) {
  map.fitBounds(
    [
      [OSM_BBOX.w, OSM_BBOX.s],
      [OSM_BBOX.e, OSM_BBOX.n],
    ],
    { padding: 36, duration: 1400, maxZoom: 11.6, pitch: 38, bearing: -8 },
  );
}
