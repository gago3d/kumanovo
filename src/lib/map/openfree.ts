/** OpenFreeMap + MapLibre — https://openfreemap.org/quick_start/ */

export const KUMANOVO: [number, number] = [21.71442, 42.13232];

/** Official style URLs. `/styles/3d` currently 404s; Liberty already extrudes buildings. */
export const OFM_STYLES = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
  positron: "https://tiles.openfreemap.org/styles/positron",
  bright: "https://tiles.openfreemap.org/styles/bright",
  fiord: "https://tiles.openfreemap.org/styles/fiord",
} as const;

export const OFM_ATTR =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>';

export function styleFor(night: boolean) {
  return night ? OFM_STYLES.dark : OFM_STYLES.liberty;
}

export function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dy = (aLat - bLat) * 111_320;
  const dx = (aLng - bLng) * 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** OSM height when present, otherwise a 3-storey fallback so Kumanovo has volume. */
export const BUILDING_HEIGHT = [
  "let",
  "h",
  ["coalesce", ["to-number", ["get", "render_height"]], ["to-number", ["get", "height"]], 0],
  ["case", [">", ["var", "h"], 0], ["max", ["var", "h"], 6], 12],
];
