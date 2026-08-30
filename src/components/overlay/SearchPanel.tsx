import { useEffect, useState } from "react";
import { Search, X, MapPinned } from "lucide-react";
import { t } from "@/lib/i18n";
import { photonSearch } from "@/lib/map/geo";
import { catLabel, flyPayload, mergePlaces, poisByCat, POI_CATS, placeTitle, searchLocal, type MapPlace, type PoiCat } from "@/lib/map/places";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";

export function SearchPanel() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const category = useApp((s) => s.category);
  const view = useApp((s) => s.view);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MapPlace[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits(query ? searchLocal(query, lang) : []);
      return;
    }
    const local = searchLocal(query, lang);
    setHits(local);
    const handle = window.setTimeout(() => {
      void photonSearch(query, view.lat, view.lng, lang).then((live) => {
        setHits(mergePlaces(local, live));
      });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [q, lang, view.lat, view.lng]);

  function go(p: MapPlace) {
    useApp.getState().setSelectedPlace(p);
    useApp.getState().setFlyTo(flyPayload(p));
    useApp.getState().setCamera("orbit");
    setQ("");
    setOpen(false);
    setHits([]);
  }

  function toggleCat(id: PoiCat) {
    const next = category === id ? null : id;
    useApp.getState().setCategory(next);
    if (next) {
      useApp.getState().setPanel("none");
      const n = poisByCat(next).length;
      useApp.getState().pushFeed(
        lang === "mk" ? `${n} ${catLabel(next, lang).toLowerCase()} на мапата` : `${n} ${catLabel(next, lang).toLowerCase()} on the map`,
      );
    }
  }

  return (
    <div className="relative max-w-md">
      <label className="hud-panel flex h-11 items-center gap-2 rounded-[16px] px-3">
        <Search className="size-4 shrink-0 text-fg-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={c.searchPlace}
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        {q ? (
          <button
            type="button"
            aria-label={c.close}
            onClick={() => {
              setQ("");
              setHits([]);
            }}
            className="size-8"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </label>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {POI_CATS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggleCat(cat.id)}
            className={cn(
              "hud-panel h-9 shrink-0 rounded-full px-3 text-xs",
              category === cat.id && "bg-accent text-accent-fg",
            )}
          >
            {lang === "mk" ? cat.mk : cat.en}
          </button>
        ))}
      </div>

      {open && hits.length > 0 && (
        <ul className="hud-panel absolute top-24 right-0 left-0 z-30 max-h-64 overflow-y-auto rounded-[16px] py-1">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => go(p)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-bg-subtle"
              >
                <MapPinned className="size-3.5 shrink-0 text-fg-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{placeTitle(p, lang)}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {catLabel(p.cat, lang)}
                    {p.addr ? ` · ${p.addr}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
