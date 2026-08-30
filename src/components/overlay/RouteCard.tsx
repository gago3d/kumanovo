import { useEffect, useState } from "react";
import { ArrowUpDown, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { osrmRoute } from "@/lib/map/geo";
import { formatKm, formatMins, placeTitle, type TravelMode } from "@/lib/map/places";
import { Button } from "@/components/ui/button";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";

const MODES: TravelMode[] = ["driving", "walking", "cycling"];

export function RouteCard() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const from = useApp((s) => s.routeFrom);
  const to = useApp((s) => s.routeTo);
  const mode = useApp((s) => s.routeMode);
  const route = useApp((s) => s.route);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    let alive = true;
    setErr(false);
    useApp.getState().setRoute(null);
    void osrmRoute(from, to, mode, lang).then((r) => {
      if (!alive) return;
      if (!r) setErr(true);
      else useApp.getState().setRoute(r);
    });
    return () => {
      alive = false;
    };
  }, [from, to, mode, lang]);

  if (!from || !to) return null;
  const modeLabel = { driving: c.drive, walking: c.walk, cycling: c.bike };

  return (
    <div className="pointer-events-auto hud-panel rounded-[20px] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{c.directions}</p>
          <p className="truncate text-sm">
            <span className="text-fg-muted">{c.from} </span>
            {placeTitle(from, lang)}
          </p>
          <p className="truncate text-sm">
            <span className="text-fg-muted">{c.to} </span>
            {placeTitle(to, lang)}
          </p>
        </div>
        <button
          type="button"
          aria-label={c.close}
          className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
          onClick={() => useApp.getState().clearRoute()}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => useApp.getState().setRouteMode(m)}
            className={cn(
              "h-9 flex-1 rounded-full text-xs",
              mode === m ? "bg-accent text-accent-fg" : "bg-bg-subtle text-fg-muted",
            )}
          >
            {modeLabel[m]}
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-sm tabular-nums text-pin">
        {route
          ? `${formatKm(route.distance, lang)} · ${formatMins(route.duration, lang)}`
          : err
            ? c.noRoute
            : c.routing}
      </p>

      {route?.steps?.length ? (
        <ol className="ofm-steps mt-3 max-h-36 overflow-y-auto pr-1">
          {route.steps.slice(0, 16).map((s, i) => (
            <li key={`${s.instruction}-${i}`} className="flex gap-2 py-1.5 text-xs leading-snug">
              <span className="font-mono text-fg-subtle tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                {s.instruction}
                {s.distance > 20 ? (
                  <span className="ml-1 text-fg-subtle">{formatKm(s.distance, lang)}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => useApp.getState().setRouteEnds(to, from)}
        >
          <ArrowUpDown className="size-4" /> {c.swap}
        </Button>
      </div>
    </div>
  );
}
