import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { Hud } from "@/components/overlay/Hud";
import { getListings } from "@/lib/listings/server";
import { fallbackPayload } from "@/lib/listings/seed";
import { loadOnlineListings, mergeListings, persistListings } from "@/lib/listings/store";
import { STREETS } from "@/lib/map/places";
import { useApp } from "@/stores/app";

const OpenFreeMap = lazy(() =>
  import("@/components/map/OpenFreeMap").then((m) => ({ default: m.OpenFreeMap })),
);

export const Route = createFileRoute("/")({
  component: Home,
});

const KEEP_MS = 15 * 60 * 1000;

function Home() {
  useEffect(() => {
    let alive = true;
    useApp.getState().setLoading(true);
    Promise.all([
      getListings({ data: { includeSale: true } }).catch(() => fallbackPayload(true)),
      loadOnlineListings(),
    ]).then(([payload, extra]) => {
        if (!alive) return;
        const listings = mergeListings(payload.listings, extra);
        persistListings(listings);
        useApp.getState().setPayload(listings, payload.sources, payload.cachedAt, payload.stale);
        const lang = useApp.getState().lang;
        useApp.getState().pushFeed(
          lang === "mk"
            ? `онлајн · ${STREETS.length} улици · ${listings.length} огласи`
            : `online · ${STREETS.length} streets · ${listings.length} listings`,
        );
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!alive) return;
        const payload = fallbackPayload(true);
        useApp.getState().setPayload(payload.listings, payload.sources, payload.cachedAt, payload.stale);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const sale = true;
      void getListings({ data: { includeSale: sale } })
        .then((payload) => {
          useApp.getState().setPayload(payload.listings, payload.sources, payload.cachedAt, payload.stale);
        })
        .catch(() => {
          /* stay on last-seen */
        });
    };
    const id = window.setInterval(tick, KEEP_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      <canvas className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden />
      <Suspense fallback={null}>
        <OpenFreeMap />
      </Suspense>
      <Hud />
    </main>
  );
}
