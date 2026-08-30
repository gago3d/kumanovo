import { Navigation, Phone, ExternalLink, X, Copy, Globe } from "lucide-react";
import { t } from "@/lib/i18n";
import { catLabel, formatCoord, kumanovoSquare, myLocationPlace, placeTitle } from "@/lib/map/places";
import { Button } from "@/components/ui/button";
import { useApp } from "@/stores/app";

export function PlaceCard() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const place = useApp((s) => s.selectedPlace);
  const myLoc = useApp((s) => s.myLoc);
  if (!place) return null;
  const p = place;

  function directions() {
    const from = myLoc ? myLocationPlace(myLoc.lat, myLoc.lng, lang) : kumanovoSquare(lang);
    useApp.getState().setRouteEnds(from, p);
  }

  function fromHere() {
    const dest = useApp.getState().routeTo ?? kumanovoSquare(lang);
    useApp.getState().setRouteEnds(p, dest.id === p.id ? kumanovoSquare(lang) : dest);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCoord(p.lat, p.lng));
      useApp.getState().pushFeed(c.copied);
    } catch {
      useApp.getState().pushFeed(formatCoord(p.lat, p.lng));
    }
  }

  return (
    <div className="pointer-events-auto hud-panel rounded-[20px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{catLabel(place.cat, lang)}</p>
          <h2 className="font-display text-base leading-snug">{placeTitle(place, lang)}</h2>
          <p className="mt-1 truncate text-xs text-fg-muted">{place.addr || formatCoord(place.lat, place.lng)}</p>
          {place.oh ? (
            <p className="mt-1 truncate text-xs text-fg-muted">
              {c.hours}: {place.oh}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={c.close}
          className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
          onClick={() => useApp.getState().setSelectedPlace(null)}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={directions}>
          <Navigation className="size-4" /> {c.directions}
        </Button>
        <Button variant="outline" onClick={fromHere}>
          {c.fromHere}
        </Button>
        {place.phone ? (
          <Button variant="outline" onClick={() => (window.location.href = `tel:${place.phone}`)}>
            <Phone className="size-4" /> {c.call}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => void copy()}>
          <Copy className="size-4" /> {c.copyCoord}
        </Button>
        {place.web ? (
          <a
            href={place.web}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border px-4 text-sm"
          >
            <Globe className="size-4" /> {c.website}
          </a>
        ) : null}
        <a
          href={
            place.osmId
              ? `https://www.openstreetmap.org/way/${place.osmId}`
              : `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border px-4 text-sm"
        >
          <ExternalLink className="size-4" /> {c.openOsm}
        </a>
      </div>
    </div>
  );
}
