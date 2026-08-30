import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { formatPrice } from "@/lib/listings/format";
import { AGENT_DEFS, type AgentId } from "@/lib/listings/agents";
import { BUYERS, matchBuyer } from "@/lib/listings/buyers";
import type { Listing, ListingType, SourceId } from "@/lib/listings/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterListings, useApp } from "@/stores/app";
import { useAgents } from "@/stores/agents";
import {
  SKILL_IDS,
  SKILL_MAX,
  skillHint,
  skillLabel,
  skillRatio,
  xpRatio,
  xpToNext,
  type SkillId,
} from "@/lib/listings/skills";
import { searchPlaces, type PlaceHit } from "@/lib/city/map";
import { SearchPanel } from "./SearchPanel";
import { PlaceCard } from "./PlaceCard";
import { RouteCard } from "./RouteCard";
import { MapMenu } from "./MapMenu";
import { flyPayload, kumanovoSquare, myLocationPlace, VILLAGES } from "@/lib/map/places";
import { fetchWeather, pingTools, weatherLabel, type ToolStatus, type WeatherNow } from "@/lib/map/tools";
import { isAlwaysOnHost, publicLink } from "@/lib/host";
import {
  Bookmark,
  Brain,
  Building2,
  Check,
  Copy,
  Crosshair,
  Eye,
  Filter,
  Gauge,
  Globe,
  Home,
  Languages,
  LandPlot,
  Link2,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPinned,
  Moon,
  Navigation,
  Phone,
  Scan,
  Search,
  Share2,
  Store,
  Sun,
  Tag,
  Trees,
  User,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";

const SOURCE_LABEL: Record<SourceId, string> = {
  pazar3: "Pazar3",
  reklama5: "Reklama5",
  keyadvisory: "Key Advisory",
  facebook: "Facebook",
  google: "Google",
};

function fmtDate(iso: string | null, lang: "mk" | "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(lang === "mk" ? "mk-MK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Hud() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const night = useApp((s) => s.night);
  const camera = useApp((s) => s.cameraMode);
  const follow = useApp((s) => s.followAgent);
  const followId = useApp((s) => s.followAgentId);
  const loading = useApp((s) => s.loading);
  const discovered = useApp((s) => s.discovered);
  const allListings = useApp((s) => s.listings);
  const filters = useApp((s) => s.filters);
  const saved = useApp((s) => s.saved);
  const listings = useMemo(
    () => filterListings(allListings, filters, saved),
    [allListings, filters, saved],
  );
  const feed = useApp((s) => s.feed);
  const panel = useApp((s) => s.panel);
  const stale = useApp((s) => s.stale);
  const showLabels = useApp((s) => s.showLabels);
  const showPins = useApp((s) => s.showPins);
  const basemap = useApp((s) => s.basemap);
  const routeTo = useApp((s) => s.routeTo);
  const selectedPlace = useApp((s) => s.selectedPlace);
  const osmStreetN = useApp((s) => s.osmStreetN);
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  useEffect(() => {
    useAgents.getState().sync();
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchWeather().then((w) => {
      if (alive) setWeather(w);
    });
    const id = window.setInterval(() => {
      void fetchWeather().then((w) => {
        if (alive) setWeather(w);
      });
    }, 30 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  function openShare() {
    useApp.getState().setPanel("share");
  }

  function goPlace(p: PlaceHit) {
    useApp.getState().setFlyTo({ lat: p.lat, lng: p.lng, x: p.x, z: p.z, name: lang === "mk" ? p.nameMk : p.nameEn });
    useApp.getState().setCamera("orbit");
    useApp.getState().setPanel("none");
  }

  function locateMe() {
    if (!navigator.geolocation) {
      useApp.getState().pushFeed(c.locateFail);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        useApp.getState().setMyLoc({ lat, lng });
        const me = myLocationPlace(lat, lng, lang);
        useApp.getState().setFlyTo(flyPayload(me));
        useApp.getState().pushFeed(c.myLocation);
      },
      () => useApp.getState().pushFeed(c.locateFail),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }


  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-fg">
      <header className="pointer-events-auto absolute top-0 right-0 left-0 flex flex-col gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))] md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="hud-panel max-w-[68%] rounded-[24px] px-4 py-3 md:max-w-sm">
            <p className="font-display text-[11px] tracking-[0.18em] text-fg-muted uppercase">{c.tag}</p>
            <h1 className="font-display text-lg leading-tight tracking-tight md:text-xl">{c.app}</h1>
            <p className="mt-1 text-xs text-fg-muted">
              <span className="mr-2 inline-flex items-center gap-1 text-ok">
                <span className="size-1.5 rounded-full bg-ok" />
                {c.live}
              </span>
              {loading ? c.searching : `${discovered.length}/${allListings.length} ${c.found}`}
              {stale ? ` · ${c.stale}` : ""}
              {weather ? ` · ${weather.c}° ${weatherLabel(weather.code, lang)}` : ""}
              {osmStreetN ? ` · ${osmStreetN} ${c.osmN}` : ""}
              {` · ${VILLAGES.length} ${c.villagesN}`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <IconBtn label={c.share} onClick={openShare} active={panel === "share"}>
              <Share2 className="size-4" />
            </IconBtn>
            <IconBtn label={lang === "mk" ? "English" : "Македонски"} onClick={() => useApp.getState().setLang(lang === "mk" ? "en" : "mk")}>
              <Languages className="size-4" />
              <span className="hidden sm:inline">{c.lang}</span>
            </IconBtn>
            <IconBtn label={night ? c.dayMode : c.night} onClick={() => useApp.getState().setNight(!night)}>
              {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconBtn>
            <IconBtn
              label={basemap === "sat" ? c.streets : c.satellite}
              onClick={() => useApp.getState().setBasemap(basemap === "sat" ? "streets" : "sat")}
              active={basemap === "sat"}
            >
              {basemap === "sat" ? <MapIcon className="size-4" /> : <Globe className="size-4" />}
            </IconBtn>
            <IconBtn
              label={camera === "orbit" ? c.fps : c.orbit}
              onClick={() => useApp.getState().setCamera(camera === "orbit" ? "fps" : "orbit")}
            >
              {camera === "orbit" ? <User className="size-4" /> : <MapIcon className="size-4" />}
            </IconBtn>
          </div>
        </div>

        <SearchPanel />
        <AgentBar listings={allListings} discovered={discovered} followId={followId} lang={lang} />
      </header>

      <div className="pointer-events-auto absolute top-52 right-3 hidden flex-col gap-2 md:flex">
        <IconBtn
          label={c.follow}
          onClick={() => useApp.getState().setFollow(!follow)}
          active={follow && camera === "orbit"}
        >
          <Eye className="size-4" />
        </IconBtn>
        <IconBtn
          label={c.recenter}
          onClick={() => useApp.getState().setFlyTo({ lat: 42.13232, lng: 21.71442, x: 0, z: 0, name: c.app })}
        >
          <Crosshair className="size-4" />
        </IconBtn>
        <IconBtn
          label={c.muni}
          onClick={() => useApp.getState().setFlyTo({ lat: 42.132, lng: 21.76, x: 0, z: 0, name: c.muni, zoom: 11.15 })}
        >
          <LandPlot className="size-4" />
        </IconBtn>
        <IconBtn label={c.myLocation} onClick={locateMe}>
          <LocateFixed className="size-4" />
        </IconBtn>
        <IconBtn
          label={c.directions}
          active={Boolean(routeTo)}
          onClick={() => {
            const dest = selectedPlace ?? kumanovoSquare(lang);
            const loc = useApp.getState().myLoc;
            const from = loc ? myLocationPlace(loc.lat, loc.lng, lang) : kumanovoSquare(lang);
            useApp.getState().setRouteEnds(from, dest);
          }}
        >
          <Navigation className="size-4" />
        </IconBtn>
        <IconBtn
          label={c.labels}
          onClick={() => useApp.getState().setShowLabels(!showLabels)}
          active={showLabels}
        >
          <Tag className="size-4" />
        </IconBtn>
        <IconBtn
          label={c.pins}
          onClick={() => useApp.getState().setShowPins(!showPins)}
          active={showPins}
        >
          <MapPinned className="size-4" />
        </IconBtn>
        <IconBtn label={c.places} onClick={() => useApp.getState().setPanel(panel === "places" ? "none" : "places")} active={panel === "places"}>
          <Search className="size-4" />
        </IconBtn>
        <IconBtn label={c.filters} onClick={() => useApp.getState().setPanel(panel === "filters" ? "none" : "filters")} active={panel === "filters"}>
          <Filter className="size-4" />
        </IconBtn>
        <IconBtn label={c.list} onClick={() => useApp.getState().setPanel(panel === "list" ? "none" : "list")} active={panel === "list"}>
          <List className="size-4" />
        </IconBtn>
        <IconBtn label={c.sources} onClick={() => useApp.getState().setPanel(panel === "sources" ? "none" : "sources")} active={panel === "sources"}>
          <Store className="size-4" />
        </IconBtn>
      </div>

      <div className="pointer-events-none absolute bottom-20 left-3 right-3 md:bottom-4 md:right-auto md:max-w-md">
        {routeTo ? <RouteCard /> : selectedPlace ? <PlaceCard /> : null}
        <div className="hud-panel pointer-events-auto mt-2 overflow-hidden rounded-[20px]">
          <p className={cn("px-3 py-2 text-xs text-fg-muted", (loading || discovered.length === 0) && "feed-shimmer")}>
            {feed[0]?.text ?? c.searching}
          </p>
        </div>
        <p className="mt-1 px-1 text-[10px] tracking-wide text-fg-subtle">{c.osm}</p>
      </div>

      <MapMenu />

      {camera === "fps" && (
        <div className="pointer-events-auto absolute right-3 bottom-24 md:bottom-6">
          <div className="flex flex-col items-end gap-2">
            <p className="hud-panel rounded-[12px] px-3 py-2 text-xs text-fg-muted">{c.fpsHint}</p>
            <Button
              variant="primary"
              onClick={() => useApp.getState().setCamera("orbit")}
            >
              {c.exitFps}
            </Button>
          </div>
        </div>
      )}

      <nav className="pointer-events-auto absolute right-3 bottom-3 left-3 flex gap-2 md:hidden pb-[env(safe-area-inset-bottom)]">
        <Button className="flex-1" variant={panel === "places" ? "primary" : "ghost"} onClick={() => useApp.getState().setPanel(panel === "places" ? "none" : "places")}>
          <Search className="size-4" /> {c.places}
        </Button>
        <Button className="flex-1" variant={panel === "list" ? "primary" : "ghost"} onClick={() => useApp.getState().setPanel(panel === "list" ? "none" : "list")}>
          <List className="size-4" /> {c.list}
        </Button>
        <Button variant="ghost" size="icon" aria-label={c.myLocation} onClick={locateMe}>
          <LocateFixed className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={c.directions}
          onClick={() => {
            const dest = selectedPlace ?? kumanovoSquare(lang);
            const loc = useApp.getState().myLoc;
            const from = loc ? myLocationPlace(loc.lat, loc.lng, lang) : kumanovoSquare(lang);
            useApp.getState().setRouteEnds(from, dest);
          }}
        >
          <Navigation className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => useApp.getState().setPanel(panel === "filters" ? "none" : "filters")}>
          <Filter className="size-4" />
        </Button>
      </nav>

      {panel === "filters" && <FiltersSheet />}
      {panel === "list" && <ListSheet items={listings} />}
      {panel === "listing" && <ListingSheet />}
      {panel === "sources" && <SourcesSheet />}
      {panel === "places" && <PlacesSheet onGo={goPlace} />}
      {panel === "share" && <ShareSheet />}
      {panel === "agent" && <AgentSheet listings={allListings} discovered={discovered} />}

      <p className="pointer-events-none absolute bottom-20 left-3 hidden text-[11px] text-fg-subtle md:block">{c.launchHint}</p>
      <span className="sr-only">{allListings.length} listings loaded</span>
    </div>
  );
}

function AgentBar({
  listings,
  discovered,
  followId,
  lang,
}: {
  listings: Listing[];
  discovered: string[];
  followId: AgentId;
  lang: "mk" | "en";
}) {
  const c = t(lang);
  const follow = useApp((s) => s.followAgent);
  const panel = useApp((s) => s.panel);
  const byId = useAgents((s) => s.byId);
  const foundBuyers = useApp((s) => s.foundBuyers);
  const osmN = useApp((s) => s.osmStreetN);
  const checks = useApp((s) => s.checks);
  return (
    <div className="flex max-w-2xl gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {AGENT_DEFS.map((a) => {
        const mine = a.role === "seek" ? [] : listings.filter((l) => a.types.includes(l.listingType));
        const found =
          a.role === "seek"
            ? foundBuyers.length
            : mine.filter((l) => discovered.includes(l.id)).length;
        const total = a.role === "seek" ? BUYERS.length : mine.length;
        const on = follow && followId === a.id;
        const sheet = panel === "agent" && followId === a.id;
        const p = byId[a.id] ?? byId.home;
        const flashing = p.flashAt > 0 && Date.now() - p.flashAt < 1400;
        const checked = Object.values(checks).filter((c) => c.status === "live" || c.status === "changed").length;
        return (
          <div
            key={a.id}
            className={cn(
              "hud-panel flex min-h-11 shrink-0 items-stretch overflow-hidden rounded-[12px]",
              (on || sheet) && "bg-accent text-accent-fg",
              flashing && "agent-up",
            )}
          >
            <button
              type="button"
              onClick={() => {
                const st = useApp.getState();
                if (st.followAgentId === a.id && st.followAgent && st.panel === "agent") {
                  st.setFollow(false);
                  st.setFilters({ types: "all" });
                  st.setPanel("none");
                  return;
                }
                st.setFollowAgentId(a.id);
                st.setCamera("orbit");
                st.setPanel("agent");
              }}
              className="flex items-center gap-2 px-3 py-2 text-left text-xs"
            >
              <span
                className={cn(
                  "size-2 shrink-0",
                  a.id === "seek" ? "rotate-45 rounded-[1px] bg-fg" : "rounded-full",
                  a.id === "home" && "bg-pin",
                  a.id === "biz" && "bg-teal",
                  a.id === "land" && "bg-ok",
                  (on || sheet) && a.id === "seek" && "bg-accent-fg",
                )}
              />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="font-medium">{lang === "mk" ? a.mk : a.en}</span>
                  <span className={cn("font-mono text-[10px] tabular-nums", on || sheet ? "text-accent-fg/70" : "text-fg-muted")}>
                    {c.level} {p.level}
                  </span>
                </span>
                <span className={cn("block tabular-nums", on || sheet ? "text-accent-fg/70" : "text-fg-muted")}>
                  {a.role === "seek"
                    ? `${found}/${total} · ${checked} ${c.verified}`
                    : `${found}/${total} · ${c.huntingLive}`}
                </span>
                <XpTrack
                  value={xpRatio(p)}
                  accent={a.id}
                  invert={on || sheet}
                  live={skillRatio(p, a.role === "seek" ? "learn" : "upgrade")}
                />
              </span>
            </button>
          </div>
        );
      })}
      <p className="hud-panel hidden min-h-11 shrink-0 items-center rounded-[12px] px-3 text-[10px] text-fg-muted md:flex">
        {osmN} {c.osmN} · {VILLAGES.length} {c.villagesN}
      </p>
    </div>
  );
}

function XpTrack({
  value,
  live,
  accent,
  invert,
}: {
  value: number;
  live: number;
  accent: AgentId;
  invert?: boolean;
}) {
  return (
    <span className="xp-track mt-1">
      <i
        className={cn(
          "xp-fill",
          invert && "is-invert",
          accent === "home" && "is-home",
          accent === "biz" && "is-biz",
          accent === "land" && "is-land",
          accent === "seek" && "is-seek",
        )}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
      <span className="xp-live" style={{ width: `${Math.round(live * 100)}%` }} />
    </span>
  );
}

const SKILL_ICON: Record<SkillId, typeof Gauge> = {
  pace: Gauge,
  radar: Scan,
  scan: Search,
  memory: MapPinned,
  upgrade: Zap,
  learn: Brain,
};

function AgentSheet({ listings, discovered }: { listings: Listing[]; discovered: string[] }) {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const id = useApp((s) => s.followAgentId);
  const follow = useApp((s) => s.followAgent);
  const p = useAgents((s) => s.byId[id]) ?? useAgents.getState().byId.home;
  const def = AGENT_DEFS.find((a) => a.id === id) ?? AGENT_DEFS[0];
  const foundBuyers = useApp((s) => s.foundBuyers);
  const mine = listings.filter((l) => def.types.includes(l.listingType));
  const found = def.role === "seek" ? foundBuyers.length : mine.filter((l) => discovered.includes(l.id)).length;
  const total = def.role === "seek" ? BUYERS.length : mine.length;
  const km = (p.meters / 1000).toFixed(1);
  return (
    <Sheet title={`${lang === "mk" ? def.mk : def.en} · ${def.role === "seek" ? c.dashboard : c.skills}`} onClose={() => useApp.getState().setPanel("none")}>
      <p className="text-xs text-fg-muted">{def.role === "seek" ? c.buyerDash : c.liveUpgrade}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-lg tabular-nums">
          {c.level} {p.level}
        </p>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          {Math.floor(p.xp)}/{xpToNext(p.level)}
        </p>
      </div>
      <XpTrack value={xpRatio(p)} live={skillRatio(p, id === "seek" ? "learn" : "upgrade")} accent={id} />
      <p className="mt-3 text-sm">
        {found}/{total} {def.role === "seek" ? c.buyers : c.foundBy}
        <span className="text-fg-muted"> · {km} {c.walkKm}</span>
      </p>
      <p className="mt-1 text-xs text-fg-muted">{lang === "mk" ? def.huntMk : def.huntEn}</p>
      {id === "seek" ? <SeekDash listings={listings} /> : null}
      <ul className="mt-4 flex flex-col gap-2">
        {SKILL_IDS.map((sid) => {
          const Icon = SKILL_ICON[sid];
          const on = p.lastSkill === sid && Date.now() - p.flashAt < 1600;
          return (
            <li key={sid} className={cn("rounded-[12px] bg-bg-subtle/80 px-3 py-2", on && "agent-up")}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-fg-muted" />
                  {skillLabel(sid, lang)}
                </span>
                <span className="font-mono text-xs tabular-nums">{p.skills[sid]}/{SKILL_MAX}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-fg-muted">{skillHint(sid, lang)}</p>
              <span className="xp-track mt-2">
                <i
                  className={cn(
                    "xp-fill",
                    id === "home" && "is-home",
                    id === "biz" && "is-biz",
                    id === "land" && "is-land",
                    id === "seek" && "is-seek",
                  )}
                  style={{ width: `${Math.round((p.skills[sid] / SKILL_MAX) * 100)}%` }}
                />
                <span className="xp-live" style={{ width: `${Math.round(skillRatio(p, sid) * 100)}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <Button
        className="mt-4 w-full"
        variant={follow ? "primary" : "outline"}
        onClick={() => {
          const st = useApp.getState();
          if (st.followAgent && st.followAgentId === id) st.setFollow(false);
          else {
            st.setFollowAgentId(id);
            st.setCamera("orbit");
          }
        }}
      >
        <Eye className="size-4" /> {c.follow}
      </Button>
    </Sheet>
  );
}

function SeekDash({ listings }: { listings: Listing[] }) {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const foundBuyers = useApp((s) => s.foundBuyers);
  const checks = useApp((s) => s.checks);
  const learned = useApp((s) => s.learned);
  const confirmed = useApp((s) => s.confirmed);
  const pool = confirmed.length ? confirmed : listings.filter((l) => useApp.getState().discovered.includes(l.id));
  const rows = foundBuyers
    .map((id) => BUYERS.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((buyer) => ({ buyer, hit: matchBuyer(buyer, pool) }));
  const liveN = Object.values(checks).filter((x) => x.status === "live").length;
  const chN = Object.values(checks).filter((x) => x.status === "changed").length;
  const goneN = Object.values(checks).filter((x) => x.status === "gone").length;
  return (
    <div className="mt-4">
      <p className="text-xs text-fg-muted">{c.buyerDash}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[12px] bg-bg-subtle px-2 py-2">
          <p className="font-mono text-sm tabular-nums text-ok">{liveN}</p>
          <p className="text-[10px] text-fg-muted">{c.stillLive}</p>
        </div>
        <div className="rounded-[12px] bg-bg-subtle px-2 py-2">
          <p className="font-mono text-sm tabular-nums">{chN}</p>
          <p className="text-[10px] text-fg-muted">{c.changed}</p>
        </div>
        <div className="rounded-[12px] bg-bg-subtle px-2 py-2">
          <p className="font-mono text-sm tabular-nums text-fg-muted">{goneN}</p>
          <p className="text-[10px] text-fg-muted">{c.gone}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-fg-subtle">
        {learned.length} {c.learnedN}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-fg-muted">{c.noBuyersYet}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map(({ buyer, hit }) => (
            <li key={buyer.id} className="rounded-[12px] bg-bg-subtle/80 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium leading-snug">{buyer.title}</p>
                <span className="font-mono text-xs tabular-nums text-ok">{hit ? `${hit.score}%` : "—"}</span>
              </div>
              <p className="mt-1 text-[11px] text-fg-muted">
                {c[buyer.want]} · {buyer.offer === "sale" ? c.sale : c.rent}
                {buyer.neighborhood ? ` · ${buyer.neighborhood}` : ""}
                {buyer.maxAmount != null
                  ? ` · ≤ ${formatPrice(buyer.maxAmount, buyer.currency, buyer.offer === "sale" ? "total" : "month", lang)}`
                  : ""}
              </p>
              {hit ? (
                <button
                  type="button"
                  className="mt-2 block min-h-11 w-full truncate text-left text-xs text-fg"
                  onClick={() => useApp.getState().select(hit.listing.id)}
                >
                  {c.bestMatch}: {hit.listing.title}
                  {hit.why.length ? ` · ${hit.why.join(" · ")}` : ""}
                </button>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {buyer.contactPhone ? (
                  <a href={`tel:${buyer.contactPhone}`} className="inline-flex h-11 items-center gap-1 text-xs">
                    <Phone className="size-3" /> {buyer.contactPhone}
                  </a>
                ) : null}
                <a
                  href={buyer.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-1 text-xs text-fg-muted"
                >
                  <ExternalLink className="size-3" /> {SOURCE_LABEL[buyer.source]}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlacesSheet({ onGo }: { onGo: (p: PlaceHit) => void }) {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const places = searchPlaces("");
  return (
    <Sheet title={c.places} onClose={() => useApp.getState().setPanel("none")}>
      <ul className="flex flex-col gap-1">
        {places.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onGo(p)}
              className="flex h-11 w-full items-center justify-between gap-3 rounded-[12px] px-3 text-left text-sm hover:bg-bg-subtle"
            >
              <span className="truncate">{lang === "mk" ? p.nameMk : p.nameEn}</span>
              <span className="text-xs text-fg-muted">{c.fly}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "hud-panel inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-[12px] px-3 text-sm",
        "transition-transform duration-150 ease-out active:scale-[0.96]",
        active && "bg-accent text-accent-fg",
      )}
    >
      {children}
    </button>
  );
}

function FiltersSheet() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const f = useApp((s) => s.filters);
  const set = useApp((s) => s.setFilters);
  return (
    <Sheet title={c.filters} onClose={() => useApp.getState().setPanel("none")}>
      <p className="text-xs text-fg-muted">{c.price} (€ / {c.month.trim()})</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip on={f.maxEur == null} onClick={() => set({ maxEur: null })}>
          {c.all}
        </Chip>
      </div>
      <input
        type="range"
        min={50}
        max={5000}
        step={50}
        value={f.maxEur ?? 5000}
        onChange={(e) => set({ maxEur: Number(e.target.value) })}
        className="mt-2 w-full accent-pin"
      />
      <p className="mt-1 font-mono text-sm tabular-nums">{f.maxEur == null ? c.noPriceCap : `≤ ${f.maxEur} €`}</p>

      <p className="mt-4 text-xs text-fg-muted">{c.type}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip on={f.types === "all"} onClick={() => set({ types: "all" })}>
          {c.all}
        </Chip>
        {(["stan", "kukja", "lokal", "vikend", "niva"] as ListingType[]).map((ty) => (
          <Chip
            key={ty}
            on={f.types !== "all" && f.types.includes(ty)}
            onClick={() => set({ types: f.types === "all" ? [ty] : toggleArr(f.types, ty) })}
          >
            {c[ty]}
          </Chip>
        ))}
      </div>

      <p className="mt-4 text-xs text-fg-muted">{c.rooms}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip on={f.rooms == null} onClick={() => set({ rooms: null })}>
          {c.anyRooms}
        </Chip>
        {[1, 2, 3, 4].map((n) => (
          <Chip key={n} on={f.rooms === n} onClick={() => set({ rooms: n })}>
            {n}+
          </Chip>
        ))}
      </div>

      <p className="mt-4 text-xs text-fg-muted">{c.source}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip on={f.sources === "all"} onClick={() => set({ sources: "all" })}>
          {c.all}
        </Chip>
        {(Object.keys(SOURCE_LABEL) as SourceId[]).map((s) => (
          <Chip
            key={s}
            on={f.sources !== "all" && f.sources.includes(s)}
            onClick={() => set({ sources: f.sources === "all" ? [s] : toggleArr(f.sources, s) })}
          >
            {SOURCE_LABEL[s]}
          </Chip>
        ))}
      </div>

      <label className="mt-4 flex h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={f.todayOnly} onChange={(e) => set({ todayOnly: e.target.checked })} />
        {c.today}
      </label>
      <label className="flex h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={f.includeSale} onChange={(e) => set({ includeSale: e.target.checked })} />
        {c.includeSale}
      </label>
      <label className="flex h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={f.savedOnly} onChange={(e) => set({ savedOnly: e.target.checked })} />
        {c.saved}
      </label>
    </Sheet>
  );
}

function ListSheet({ items }: { items: Listing[] }) {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const discovered = useApp((s) => s.discovered);
  return (
    <Sheet title={`${c.list} · ${items.length}`} onClose={() => useApp.getState().setPanel("none")}>
      <ul className="flex flex-col gap-2">
        {items.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => useApp.getState().select(l.id)}
              className="flex w-full items-start gap-3 rounded-[16px] bg-bg-subtle/80 px-3 py-3 text-left"
            >
              <TypeIcon type={l.listingType} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{l.title}</span>
                <span className="mt-0.5 block truncate text-xs text-fg-muted">
                  {l.neighborhood} · {SOURCE_LABEL[l.source]}
                  {discovered.includes(l.id) ? "" : ` · ${c.searching}`}
                </span>
              </span>
              <span className="font-mono text-xs tabular-nums text-pin">
                {formatPrice(l.priceAmount, l.priceCurrency, l.pricePeriod, lang)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function ListingSheet() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const id = useApp((s) => s.selectedId);
  const listing = useApp((s) => s.listings.find((l) => l.id === id) ?? s.confirmed.find((l) => l.id === id));
  const saved = useApp((s) => s.saved);
  const check = useApp((s) => (id ? s.checks[id] : undefined));
  if (!listing) return null;
  const isSaved = saved.includes(listing.id);
  const statusLabel =
    check?.status === "live"
      ? c.stillLive
      : check?.status === "changed"
        ? c.changed
        : check?.status === "gone"
          ? c.gone
          : c.pendingCheck;
  return (
    <Sheet title={c[listing.listingType]} onClose={() => useApp.getState().select(null)}>
      <h3 className="font-display text-lg leading-snug">{listing.title}</h3>
      <p className="mt-2 font-mono text-xl tabular-nums text-pin">
        {formatPrice(listing.priceAmount, listing.priceCurrency, listing.pricePeriod, lang)}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {c.verified}: {statusLabel}
        {check?.note ? ` · ${check.note}` : ""}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-fg-muted">{c.address}</dt>
          <dd>{listing.address}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{c.area}</dt>
          <dd>{listing.areaM2 ? `${listing.areaM2} m²` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{c.rooms}</dt>
          <dd>{listing.rooms ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{c.posted}</dt>
          <dd>{fmtDate(listing.postedAt, lang)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-fg-muted">{c.source}</dt>
          <dd>
            {SOURCE_LABEL[listing.source]} · {listing.offer === "sale" ? c.sale : c.rent}
          </dd>
        </div>
      </dl>
      <div className="mt-4 rounded-[16px] bg-bg-subtle px-3 py-4 text-sm text-fg-muted">{c.noPhoto}</div>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant={isSaved ? "primary" : "outline"} onClick={() => useApp.getState().toggleSave(listing.id)}>
          <Bookmark className="size-4" /> {isSaved ? c.saved : c.save}
        </Button>
        {listing.contactPhone ? (
          <Button variant="pin" onClick={() => (window.location.href = `tel:${listing.contactPhone}`)}>
            <Phone className="size-4" /> {c.call}
          </Button>
        ) : (
          <p className="text-xs text-fg-subtle">{c.noPhone}</p>
        )}
        <a
          href={listing.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border text-sm"
        >
          <ExternalLink className="size-4" /> {c.open}
        </a>
      </div>
    </Sheet>
  );
}

function SourcesSheet() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const sources = useApp((s) => s.sources);
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const statusLabel = { ok: c.ok, unavailable: c.unavailable, blocked: c.blocked, restricted: c.restricted };

  useEffect(() => {
    let alive = true;
    void pingTools().then((rows) => {
      if (alive) setTools(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Sheet title={c.sources} onClose={() => useApp.getState().setPanel("none")}>
      <p className="mb-3 text-xs text-ok">{c.alwaysOn}</p>
      <p className="mb-3 break-all font-mono text-xs text-fg">{publicLink()}</p>
      <p className="text-xs text-fg-muted">{c.toolsFree}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {tools.map((trow) => (
          <li key={trow.id} className="flex items-center justify-between rounded-[12px] bg-bg-subtle/80 px-3 py-2 text-sm">
            <span>{lang === "mk" ? trow.mk : trow.en}</span>
            <span className={cn("text-xs", trow.ok ? "text-ok" : "text-fg-muted")}>{trow.ok ? c.ok : c.unavailable}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-col gap-3">
        {sources.map((s) => (
          <li key={s.source} className="rounded-[16px] bg-bg-subtle/80 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{SOURCE_LABEL[s.source]}</p>
              <span className={cn("text-xs", s.status === "ok" ? "text-ok" : "text-fg-muted")}>
                {statusLabel[s.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">{s.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-fg-subtle">{c.facebookNote}</p>
      <p className="mt-2 text-xs text-fg-subtle">{c.googleNote}</p>
    </Sheet>
  );
}

function ShareSheet() {
  const lang = useApp((s) => s.lang);
  const c = t(lang);
  const url = publicLink();
  const live = typeof window !== "undefined" && isAlwaysOnHost(window.location.hostname);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      useApp.getState().pushFeed(c.copiedLink);
    } catch {
      useApp.getState().pushFeed(url);
    }
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Sheet title={c.publicLink} onClose={() => useApp.getState().setPanel("none")}>
      <p className="text-sm text-ok">{c.alwaysOn}</p>
      <p className="mt-2 text-xs text-fg-muted">{live ? c.publicHint : c.previewHint}</p>
      <p className="mt-3 break-all rounded-[12px] bg-bg-subtle px-3 py-3 font-mono text-xs text-fg">{url}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="primary" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? c.copied : c.copyPublic}
        </Button>
        {canShare ? (
          <Button
            variant="outline"
            onClick={() => {
              void navigator.share({ title: c.app, url, text: c.alwaysOn });
            }}
          >
            <Share2 className="size-4" /> {c.sendLink}
          </Button>
        ) : null}
        {!live ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border text-sm"
          >
            <Link2 className="size-4" /> {c.openPublic}
          </a>
        ) : null}
      </div>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 md:inset-auto md:top-28 md:right-3 md:bottom-3 md:w-[360px]">
      <div className="hud-panel flex max-h-[70vh] flex-col rounded-t-[24px] md:max-h-full md:rounded-[24px]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="font-display text-base">{title}</h2>
          <button type="button" aria-label="close" onClick={onClose} className="flex size-11 items-center justify-center rounded-[12px]">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-4 text-sm",
        on ? "bg-accent text-accent-fg" : "bg-bg-subtle text-fg-muted",
      )}
    >
      {children}
    </button>
  );
}

function TypeIcon({ type }: { type: ListingType }) {
  const Icon = type === "lokal" ? Store : type === "kukja" ? Home : type === "vikend" ? Trees : type === "niva" ? LandPlot : Building2;
  return (
    <span className="mt-0.5 flex size-9 items-center justify-center rounded-[10px] bg-bg text-fg-muted">
      <Icon className="size-4" />
    </span>
  );
}

function toggleArr<T>(arr: T[], v: T): T[] | "all" {
  const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  return next.length ? next : "all";
}
