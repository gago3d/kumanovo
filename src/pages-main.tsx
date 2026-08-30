import { lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Hud } from "@/components/overlay/Hud";
import { fallbackPayload } from "@/lib/listings/seed";
import { loadOnlineListings, mergeListings, persistListings } from "@/lib/listings/store";
import { STREETS } from "@/lib/map/places";
import { useApp } from "@/stores/app";
import "@/styles.css";

const OpenFreeMap = lazy(() =>
  import("@/components/map/OpenFreeMap").then((m) => ({ default: m.OpenFreeMap })),
);

function Home() {
  useEffect(() => {
    const payload = fallbackPayload(true);
    useApp.getState().setPayload(payload.listings, payload.sources, payload.cachedAt, payload.stale);
    void loadOnlineListings().then((extra) => {
      const listings = mergeListings(extra, payload.listings);
      persistListings(listings);
      useApp.getState().setPayload(listings, payload.sources, payload.cachedAt, payload.stale);
      const lang = useApp.getState().lang;
      useApp.getState().pushFeed(
        lang === "mk"
          ? `онлајн 24/7 · ${STREETS.length} улици · ${listings.length} огласи`
          : `online 24/7 · ${STREETS.length} streets · ${listings.length} listings`,
      );
    });
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      <Suspense fallback={null}>
        <OpenFreeMap />
      </Suspense>
      <Hud />
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Home />);
