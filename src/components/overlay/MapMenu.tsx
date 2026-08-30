import { t } from "@/lib/i18n";
import { photonReverse } from "@/lib/map/geo";
import { clickPlace, formatCoord, kumanovoSquare, myLocationPlace } from "@/lib/map/places";
import { useApp } from "@/stores/app";

export function MapMenu() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const menu = useApp((s) => s.mapMenu);
  if (!menu) return null;
  const { lat, lng, sx, sy } = menu;

  const left = Math.max(12, Math.min(sx, (typeof window === "undefined" ? 360 : window.innerWidth) - 220));
  const top = Math.max(12, Math.min(sy, (typeof window === "undefined" ? 640 : window.innerHeight) - 240));
  const here = clickPlace(lat, lng);

  function routeFromHere() {
    const st = useApp.getState();
    const dest = st.routeTo ?? st.selectedPlace ?? kumanovoSquare(lang);
    st.setRouteEnds(here, dest.id === here.id ? kumanovoSquare(lang) : dest);
  }

  function routeToHere() {
    const st = useApp.getState();
    const loc = st.myLoc;
    const from = st.routeFrom ?? (loc ? myLocationPlace(loc.lat, loc.lng, lang) : kumanovoSquare(lang));
    st.setRouteEnds(from.id === here.id ? kumanovoSquare(lang) : from, here);
  }

  async function whatsHere() {
    const p = await photonReverse(lat, lng);
    useApp.getState().setSelectedPlace(p);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCoord(lat, lng));
      useApp.getState().pushFeed(c.copied);
    } catch {
      useApp.getState().pushFeed(formatCoord(lat, lng));
    }
    useApp.getState().setMapMenu(null);
  }

  return (
    <div
      className="pointer-events-auto ofm-menu hud-panel absolute z-40 min-w-48 overflow-hidden rounded-[16px] py-1"
      style={{ left, top }}
      role="menu"
    >
      <p className="truncate px-3 py-1.5 font-mono text-[11px] text-fg-subtle">{formatCoord(lat, lng)}</p>
      <button type="button" role="menuitem" className="ofm-menu-item" onClick={() => void whatsHere()}>
        {c.here}
      </button>
      <button type="button" role="menuitem" className="ofm-menu-item" onClick={routeFromHere}>
        {c.fromHere}
      </button>
      <button type="button" role="menuitem" className="ofm-menu-item" onClick={routeToHere}>
        {c.toHere}
      </button>
      <button type="button" role="menuitem" className="ofm-menu-item" onClick={() => void copy()}>
        {c.copyCoord}
      </button>
    </div>
  );
}
