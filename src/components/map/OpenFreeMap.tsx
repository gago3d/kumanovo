import { useEffect, useRef } from "react";
import {
  AttributionControl,
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type ExpressionSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LANDMARKS, NEIGHBORHOODS } from "@/lib/city/map";
import { AGENT_DEFS, type AgentId } from "@/lib/listings/agents";
import { formatPrice } from "@/lib/listings/format";
import type { Listing, ListingType } from "@/lib/listings/types";
import {
  agentTitle,
  bonuses,
  grantHunt,
  liveSkill,
  noteFound,
  noteWalked,
  persistSkills,
  rankOf,
  skillLabel,
  type SkillEvent,
  type SkillId,
} from "@/lib/listings/skills";
import { BUYERS } from "@/lib/listings/buyers";
import { filterListings, useApp } from "@/stores/app";
import { useAgents } from "@/stores/agents";
import { BUILDING_HEIGHT, KUMANOVO, metersBetween, OFM_ATTR, styleFor } from "@/lib/map/openfree";
import { photonReverse } from "@/lib/map/geo";
import { landmarkPlace, parseMapHash, poisByCat, streetHighlight, allStreets, villagePlaces, writeMapHash } from "@/lib/map/places";
import { harvestVisible, pullOsmStreets, streetAtPoint, streetCursor } from "@/lib/map/osmLive";
import { OSM_BBOX } from "@/lib/map/muni";
import { liveAgents, type LiveAgent } from "./mapAgent";

const SAT_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const HEIGHT = BUILDING_HEIGHT as unknown as ExpressionSpecification;
const WALK_MPS = 14;
const TURN_DEG = 78;
const HUD_MS = 220;
let hudAt = 0;

function typingTarget(t: EventTarget | null) {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable);
}

function pinEl(
  kind: "listing" | "lokal" | "vikend" | "niva" | "agent" | "agent-home" | "agent-biz" | "agent-land" | "agent-seek" | "buyer" | "place" | "poi" | "pick" | "from" | "to" | "me",
  active = false,
) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `ofm-pin ofm-pin-${kind}${active ? " is-on" : ""}`;
  el.setAttribute("aria-label", kind);
  return el;
}

function listingPin(type: ListingType) {
  if (type === "lokal") return "lokal" as const;
  if (type === "vikend") return "vikend" as const;
  if (type === "niva") return "niva" as const;
  return "listing" as const;
}

function placeEl(name: string) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ofm-place";
  el.setAttribute("aria-label", name);
  const dot = document.createElement("span");
  dot.className = "ofm-place-dot";
  const label = document.createElement("span");
  label.className = "ofm-place-name";
  label.textContent = name;
  el.append(dot, label);
  return el;
}

function firstSymbolId(map: MapLibreMap) {
  return map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
}

function firstNonBgId(map: MapLibreMap) {
  return map.getStyle().layers?.find((l) => l.type !== "background" && l.id !== "esri-sat")?.id;
}

function flushSkills(force = false) {
  const now = performance.now();
  if (!force && now - hudAt < HUD_MS) return;
  hudAt = now;
  useAgents.getState().sync();
  persistSkills(force);
}

function applySkillEvents(id: AgentId, events: SkillEvent[]) {
  if (!events.length) return;
  const st = useApp.getState();
  const who = agentTitle(id, st.lang);
  const level = events.filter((e): e is { kind: "level"; level: number } => e.kind === "level").at(-1);
  const skill = events.filter((e): e is { kind: "skill"; skill: SkillId; value: number } => e.kind === "skill").at(-1);
  if (level && skill) {
    const name = skillLabel(skill.skill, st.lang);
    st.pushFeed(
      st.lang === "mk"
        ? `${who} ниво ${level.level} · ${name} ${skill.value}`
        : `${who} level ${level.level} · ${name} ${skill.value}`,
    );
  } else if (level) {
    st.pushFeed(st.lang === "mk" ? `${who} ниво ${level.level}` : `${who} level ${level.level}`);
  } else if (skill) {
    const name = skillLabel(skill.skill, st.lang);
    st.pushFeed(st.lang === "mk" ? `${who} · ${name} ${skill.value}` : `${who} · ${name} ${skill.value}`);
  }
  flushSkills(true);
}

function kindWord(type: ListingType, lang: "mk" | "en") {
  if (lang === "mk") {
    if (type === "lokal") return "локал";
    if (type === "kukja") return "куќа";
    if (type === "vikend") return "викенд";
    if (type === "niva") return "нива";
    return "стан";
  }
  return type;
}

function pinFound(id: AgentId, listing: Listing) {
  const st = useApp.getState();
  if (st.discovered.includes(listing.id)) return false;
  const def = AGENT_DEFS.find((d) => d.id === id)!;
  const who = st.lang === "mk" ? def.mk : def.en;
  const price = formatPrice(listing.priceAmount, listing.priceCurrency, listing.pricePeriod, st.lang);
  const kind = kindWord(listing.listingType, st.lang);
  const text =
    st.lang === "mk"
      ? `${who} најде ${kind} на ${listing.neighborhood} · ${listing.source} · ${price}`
      : `${who} found ${kind} on ${listing.neighborhood} · ${listing.source} · ${price}`;
  st.discover(listing.id, text);
  noteFound(id);
  applySkillEvents(id, grantHunt(id, 52, { scan: 44, radar: 20, upgrade: 14 }, "scan"));
  return true;
}

function pickStreet(agent: LiveAgent, radius: number) {
  const streets = allStreets();
  const near = streets.filter((s) => metersBetween(agent.lat, agent.lng, s.lat, s.lng) < radius);
  const pool = near.length ? near : streets;
  return pool[Math.floor(Math.random() * pool.length)];
}

function absorbMap(agent: LiveAgent, radius: number, extra: number) {
  const near = allStreets()
    .map((s) => ({ id: s.id, d: metersBetween(agent.lat, agent.lng, s.lat, s.lng) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.max(1, 1 + extra));
  if (near.length) useApp.getState().learnStreets(near.map((x) => x.id));
}

function enhance3d(map: MapLibreMap, night: boolean) {
  try {
    if (map.getLayer("building")) {
      map.setLayoutProperty("building", "visibility", "none");
    }
    const color = night ? "#2c333c" : "#d5cfc6";
    const paint = {
      "fill-extrusion-height": HEIGHT,
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] as unknown as ExpressionSpecification,
      "fill-extrusion-color": color,
      "fill-extrusion-opacity": 0.96,
      "fill-extrusion-vertical-gradient": true,
    };
    if (map.getLayer("building-3d")) {
      map.setPaintProperty("building-3d", "fill-extrusion-height", paint["fill-extrusion-height"]);
      map.setPaintProperty("building-3d", "fill-extrusion-base", paint["fill-extrusion-base"]);
      map.setPaintProperty("building-3d", "fill-extrusion-color", color);
      map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.96);
      map.setPaintProperty("building-3d", "fill-extrusion-vertical-gradient", true);
      map.setLayerZoomRange("building-3d", 13, 24);
    } else if (map.getSource("openmaptiles")) {
      map.addLayer(
        {
          id: "building-3d",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 13,
          paint,
        },
        firstSymbolId(map),
      );
    }
    map.setSky({
      "sky-color": night ? "#07090c" : "#7eb6e4",
      "horizon-color": night ? "#151a20" : "#e4ddd2",
      "fog-color": night ? "#0b1014" : "#e6e1d6",
      "sky-horizon-blend": 0.55,
      "horizon-fog-blend": 0.8,
      "fog-ground-blend": 0.4,
    });
    map.setLight({
      anchor: "viewport",
      color: night ? "#c5d0dc" : "#fff8ee",
      intensity: night ? 0.3 : 0.5,
      position: [1.35, 215, 30],
    });
  } catch (err) {
    console.warn("[ofm] 3d enhance", err);
  }
}

function applySat(map: MapLibreMap, on: boolean) {
  if (!map.getStyle()) return;
  if (on) {
    if (!map.getSource("esri-sat")) {
      map.addSource("esri-sat", {
        type: "raster",
        tiles: [SAT_TILES],
        tileSize: 256,
        attribution: "Tiles © Esri",
      });
    }
    if (!map.getLayer("esri-sat")) {
      map.addLayer(
        { id: "esri-sat", type: "raster", source: "esri-sat", paint: { "raster-opacity": 0.88 } },
        firstNonBgId(map),
      );
    }
  } else if (map.getLayer("esri-sat")) {
    map.removeLayer("esri-sat");
  }
}

function paintRoute(map: MapLibreMap) {
  const route = useApp.getState().route;
  if (map.getLayer("route-line")) map.removeLayer("route-line");
  if (map.getLayer("route-case")) map.removeLayer("route-case");
  if (map.getSource("route")) map.removeSource("route");
  if (!route) return;
  map.addSource("route", {
    type: "geojson",
    data: { type: "Feature", geometry: route.geometry, properties: {} },
  });
  map.addLayer({
    id: "route-case",
    type: "line",
    source: "route",
    paint: { "line-color": "#0b1014", "line-width": 8, "line-opacity": 0.45 },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    paint: { "line-color": "#3d6b68", "line-width": 5, "line-opacity": 0.95 },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

function fitRoute(map: MapLibreMap) {
  const route = useApp.getState().route;
  if (!route) return;
  const b = new LngLatBounds();
  for (const [lng, lat] of route.geometry.coordinates) b.extend([lng, lat]);
  map.fitBounds(b, { padding: 72, duration: 900, maxZoom: 16, pitch: 48 });
}

function paintStreet(map: MapLibreMap) {
  const place = useApp.getState().selectedPlace;
  const lines = streetHighlight(place);
  if (map.getLayer("street-hl")) map.removeLayer("street-hl");
  if (map.getLayer("street-hl-case")) map.removeLayer("street-hl-case");
  if (map.getSource("street-hl")) map.removeSource("street-hl");
  if (!lines.length) return;
  const geometry =
    lines.length === 1
      ? { type: "LineString" as const, coordinates: lines[0] }
      : { type: "MultiLineString" as const, coordinates: lines };
  map.addSource("street-hl", {
    type: "geojson",
    data: { type: "Feature", geometry, properties: {} },
  });
  map.addLayer({
    id: "street-hl-case",
    type: "line",
    source: "street-hl",
    paint: { "line-color": "#0b1014", "line-width": 10, "line-opacity": 0.35 },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "street-hl",
    type: "line",
    source: "street-hl",
    paint: { "line-color": "#c4a35a", "line-width": 5, "line-opacity": 0.95 },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

function paintLearned(map: MapLibreMap) {
  const ids = useApp.getState().learned;
  if (map.getLayer("learned-line")) map.removeLayer("learned-line");
  if (map.getSource("learned")) map.removeSource("learned");
  const feats = allStreets()
    .filter((s) => ids.includes(s.id) && s.line.length > 1)
    .map((s) => ({
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: s.line },
    properties: {},
  }));
  if (!feats.length) return;
  map.addSource("learned", {
    type: "geojson",
    data: { type: "FeatureCollection", features: feats },
  });
  map.addLayer({
    id: "learned-line",
    type: "line",
    source: "learned",
    paint: {
      "line-color": "#c4a35a",
      "line-width": 2.4,
      "line-opacity": 0.55,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

function paintAllStreets(map: MapLibreMap) {
  if (map.getLayer("osm-all-line")) map.removeLayer("osm-all-line");
  if (map.getLayer("osm-all-major")) map.removeLayer("osm-all-major");
  if (map.getSource("osm-all")) map.removeSource("osm-all");
  const streets = allStreets().filter((s) => s.line.length > 1);
  if (!streets.length) return;
  map.addSource("osm-all", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: streets.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: s.line },
        properties: { name: s.name, major: s.major ? 1 : 0 },
      })),
    },
  });
  map.addLayer({
    id: "osm-all-line",
    type: "line",
    source: "osm-all",
    paint: {
      "line-color": "#8a7a55",
      "line-width": 1.15,
      "line-opacity": 0.28,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "osm-all-major",
    type: "line",
    source: "osm-all",
    filter: ["==", ["get", "major"], 1],
    paint: {
      "line-color": "#c4a35a",
      "line-width": 2.2,
      "line-opacity": 0.55,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

function paintVillages(map: MapLibreMap) {
  if (map.getLayer("osm-villages-label")) map.removeLayer("osm-villages-label");
  if (map.getLayer("osm-villages-dot")) map.removeLayer("osm-villages-dot");
  if (map.getSource("osm-villages")) map.removeSource("osm-villages");
  const rows = villagePlaces();
  if (!rows.length) return;
  map.addSource("osm-villages", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: rows.map((v) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
        properties: { name: v.name },
      })),
    },
  });
  map.addLayer({
    id: "osm-villages-dot",
    type: "circle",
    source: "osm-villages",
    minzoom: 9,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.2, 13, 4.5],
      "circle-color": "#c4a35a",
      "circle-stroke-width": 1.2,
      "circle-stroke-color": "#1b1a16",
      "circle-opacity": 0.92,
    },
  });
  map.addLayer({
    id: "osm-villages-label",
    type: "symbol",
    source: "osm-villages",
    minzoom: 9.4,
    layout: {
      "text-field": ["get", "name"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 13],
      "text-offset": [0, 1.05],
      "text-anchor": "top",
      "text-padding": 4,
    },
    paint: {
      "text-color": "#efe6c9",
      "text-halo-color": "#16140f",
      "text-halo-width": 1.4,
    },
  });
}

function dress(map: MapLibreMap) {
  const st = useApp.getState();
  enhance3d(map, st.night);
  applySat(map, st.basemap === "sat");
  paintAllStreets(map);
  paintVillages(map);
  paintRoute(map);
  paintStreet(map);
  paintLearned(map);
}

export function OpenFreeMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pins = useRef(new Map<string, Marker>());
  const agentMarks = useRef(new Map<AgentId, Marker>());
  const placeMarks = useRef<Marker[]>([]);
  const poiMarks = useRef<Marker[]>([]);
  const pickMark = useRef<Marker | null>(null);
  const fromMark = useRef<Marker | null>(null);
  const toMark = useRef<Marker | null>(null);
  const meMark = useRef<Marker | null>(null);
  const buyerMarks = useRef(new Map<string, Marker>());
  const raf = useRef(0);
  const keys = useRef(new Set<string>());
  const speed = useRef(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const st = useApp.getState();
    const hash = parseMapHash();
    const map = new MapLibreMap({
      container: el,
      style: styleFor(st.night),
      center: hash ? [hash.lng, hash.lat] : KUMANOVO,
      zoom: hash?.zoom ?? 15.55,
      pitch: 58,
      bearing: -22,
      maxPitch: 85,
      minZoom: 8,
      maxZoom: 20,
      maxBounds: [
        [OSM_BBOX.w - 0.04, OSM_BBOX.s - 0.04],
        [OSM_BBOX.e + 0.04, OSM_BBOX.n + 0.04],
      ],
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      canvasContextAttributes: { antialias: true, powerPreference: "high-performance" },
    });
    map.addControl(
      new AttributionControl({ compact: true, customAttribution: OFM_ATTR }),
      "bottom-left",
    );
    map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
    const geo = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      showAccuracyCircle: false,
      trackUserLocation: false,
    });
    map.addControl(geo, "bottom-right");
    geo.on("geolocate", (e: { coords: { latitude: number; longitude: number } }) => {
      useApp.getState().setMyLoc({ lat: e.coords.latitude, lng: e.coords.longitude });
    });
    mapRef.current = map;

    const blank = new Uint8Array(4);
    map.on("styleimagemissing", (e) => {
      if (map.hasImage(e.id)) return;
      map.addImage(e.id, { width: 1, height: 1, data: blank }, { pixelRatio: 1 });
    });

    const onLoad = () => {
      dress(map);
      seedPlaces(map);
      spawnAgents(map);
      syncPins(map);
      syncBuyers(map);
      syncPois(map);
      syncPick(map);
      syncRouteEnds(map);
      syncMe(map);
      useApp.getState().setOsmStreetN(allStreets().length);
      void pullOsmStreets().then((n) => {
        if (!n) return;
        useApp.getState().setOsmStreetN(allStreets().length);
        const lang = useApp.getState().lang;
        useApp.getState().pushFeed(
          lang === "mk"
            ? `OpenStreetMap · ${allStreets().length} улици · ${villagePlaces().length} села во општина Куманово`
            : `OpenStreetMap · ${allStreets().length} streets · ${villagePlaces().length} villages in Kumanovo municipality`,
        );
        paintAllStreets(map);
        paintVillages(map);
        paintLearned(map);
      });
    };
    map.on("load", onLoad);

    const openMenu = (lat: number, lng: number, sx: number, sy: number) => {
      useApp.getState().setMapMenu({ lat, lng, sx, sy });
    };

    map.on("contextmenu", (e) => {
      e.preventDefault();
      openMenu(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y);
    });

    let pressTimer = 0;
    const clearPress = () => {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = 0;
    };
    map.on("touchstart", (e) => {
      const t = e.originalEvent.touches[0];
      if (!t || e.originalEvent.touches.length !== 1) return;
      const { lat, lng } = e.lngLat;
      const { x, y } = e.point;
      pressTimer = window.setTimeout(() => openMenu(lat, lng, x, y), 520);
    });
    map.on("touchend", clearPress);
    map.on("touchmove", clearPress);
    map.on("dragstart", clearPress);

    map.on("click", (e) => {
      if (useApp.getState().mapMenu) {
        useApp.getState().setMapMenu(null);
        return;
      }
      let village = null;
      try {
        village = map.queryRenderedFeatures(e.point, { layers: ["osm-villages-dot", "osm-villages-label"] })[0];
      } catch {
        village = null;
      }
      if (village?.properties?.name) {
        const hit = villagePlaces().find((v) => v.name === village.properties?.name);
        if (hit) {
          useApp.getState().setSelectedPlace(hit);
          return;
        }
      }
      const street = streetAtPoint(map, e.point);
      if (street) {
        useApp.getState().setSelectedPlace(street);
        useApp.getState().learnStreets([street.id]);
        return;
      }
      const { lat, lng } = e.lngLat;
      void photonReverse(lat, lng).then((p) => {
        useApp.getState().setSelectedPlace(p);
      });
    });
    map.on("mousemove", (e) => {
      map.getCanvas().style.cursor = streetCursor(map, e.point) ? "pointer" : "";
    });
    map.on("moveend", () => {
      const c = map.getCenter();
      const zoom = map.getZoom();
      useApp.getState().setView({ lat: c.lat, lng: c.lng, zoom });
      writeMapHash(c.lat, c.lng, zoom);
    });
    let harvestAt = 0;
    map.on("idle", () => {
      const now = performance.now();
      if (now - harvestAt < 2800) return;
      harvestAt = now;
      const n = harvestVisible(map);
      if (n) {
        useApp.getState().setOsmStreetN(allStreets().length);
        paintAllStreets(map);
      }
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const fps = useApp.getState().cameraMode === "fps";
      const walkKey = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      );
      if (fps && walkKey && !typingTarget(e.target)) e.preventDefault();
      if (down) keys.current.add(e.code);
      else keys.current.delete(e.code);
    };
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    const probe = {
      getYaw: () => (-map.getBearing() * Math.PI) / 180,
      getSpeed: () => speed.current,
      setKeys: (codes: string[]) => {
        keys.current = new Set(codes);
        if (codes.length) useApp.getState().setCamera("fps");
      },
    };
    window.__controlsTest = probe;

    let last = performance.now();
    const loop = (now: number) => {
      raf.current = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepAgents(map, dt);
      stepWalk(map, dt);
      tickFollow(map);
      tickFly(map);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      if (window.__controlsTest === probe) delete window.__controlsTest;
      pins.current.forEach((m) => m.remove());
      pins.current.clear();
      placeMarks.current.forEach((m) => m.remove());
      placeMarks.current = [];
      poiMarks.current.forEach((m) => m.remove());
      poiMarks.current = [];
      pickMark.current?.remove();
      pickMark.current = null;
      fromMark.current?.remove();
      fromMark.current = null;
      toMark.current?.remove();
      toMark.current = null;
      meMark.current?.remove();
      meMark.current = null;
      buyerMarks.current.forEach((m) => m.remove());
      buyerMarks.current.clear();
      agentMarks.current.forEach((m) => m.remove());
      agentMarks.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsub = useApp.subscribe((s, prev) => {
      const map = mapRef.current;
      if (!map) return;
      if (s.night !== prev.night) {
        map.setStyle(styleFor(s.night), { diff: false });
        map.once("style.load", () => dress(map));
      }
      if (s.basemap !== prev.basemap) applySat(map, s.basemap === "sat");
      if (s.cameraMode !== prev.cameraMode) {
        if (s.cameraMode === "fps") {
          map.easeTo({ zoom: 17.7, pitch: 74, duration: 700 });
        } else {
          map.easeTo({ zoom: 15.55, pitch: 58, bearing: -22, duration: 700 });
        }
      }
      if (s.showLabels !== prev.showLabels) {
        placeMarks.current.forEach((m) => {
          m.getElement().style.display = s.showLabels ? "" : "none";
        });
      }
      if (s.lang !== prev.lang) seedPlaces(map);
      if (s.category !== prev.category) syncPois(map);
      if (s.selectedPlace !== prev.selectedPlace) {
        syncPick(map);
        paintStreet(map);
      }
      if (s.route !== prev.route) {
        paintRoute(map);
        if (s.route) fitRoute(map);
      }
      if (s.routeFrom !== prev.routeFrom || s.routeTo !== prev.routeTo) syncRouteEnds(map);
      if (s.myLoc !== prev.myLoc) syncMe(map);
      if (s.learned !== prev.learned) paintLearned(map);
      if (s.foundBuyers !== prev.foundBuyers) syncBuyers(map);
      syncPins(map);
    });
    return unsub;
  }, []);

  function seedPlaces(map: MapLibreMap) {
    placeMarks.current.forEach((m) => m.remove());
    placeMarks.current = [];
    const lang = useApp.getState().lang;
    for (const l of LANDMARKS) {
      if (l.kind === "monument" && l.id === "poles") continue;
      const name = lang === "mk" ? l.nameMk : l.nameEn;
      const el = placeEl(name);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const place = landmarkPlace(l.id, useApp.getState().lang);
        if (place) useApp.getState().setSelectedPlace(place);
        map.flyTo({ center: [l.lng, l.lat], zoom: 17.1, pitch: 64, duration: 1100 });
      });
      placeMarks.current.push(new Marker({ element: el, anchor: "bottom" }).setLngLat([l.lng, l.lat]).addTo(map));
    }
  }

  function syncPois(map: MapLibreMap) {
    poiMarks.current.forEach((m) => m.remove());
    poiMarks.current = [];
    const cat = useApp.getState().category;
    if (!cat) return;
    const places = cat === "street" ? [] : poisByCat(cat);
    for (const p of places) {
      const el = pinEl("poi");
      el.title = p.name;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        useApp.getState().setSelectedPlace(p);
        map.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 58, duration: 800 });
      });
      poiMarks.current.push(new Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map));
    }
  }

  function syncPick(map: MapLibreMap) {
    pickMark.current?.remove();
    pickMark.current = null;
    const p = useApp.getState().selectedPlace;
    if (!p) return;
    const el = pinEl("pick", true);
    el.title = p.name;
    pickMark.current = new Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
  }

  function syncRouteEnds(map: MapLibreMap) {
    fromMark.current?.remove();
    toMark.current?.remove();
    fromMark.current = null;
    toMark.current = null;
    const st = useApp.getState();
    if (st.routeFrom) {
      const el = pinEl("from");
      el.title = st.routeFrom.name;
      fromMark.current = new Marker({ element: el, anchor: "bottom" }).setLngLat([st.routeFrom.lng, st.routeFrom.lat]).addTo(map);
    }
    if (st.routeTo) {
      const el = pinEl("to");
      el.title = st.routeTo.name;
      toMark.current = new Marker({ element: el, anchor: "bottom" }).setLngLat([st.routeTo.lng, st.routeTo.lat]).addTo(map);
    }
  }

  function syncMe(map: MapLibreMap) {
    meMark.current?.remove();
    meMark.current = null;
    const loc = useApp.getState().myLoc;
    if (!loc) return;
    const el = pinEl("me", true);
    el.title = "me";
    meMark.current = new Marker({ element: el, anchor: "center" }).setLngLat([loc.lng, loc.lat]).addTo(map);
  }

  function spawnAgents(map: MapLibreMap) {
    agentMarks.current.forEach((m) => m.remove());
    agentMarks.current.clear();
    for (const a of liveAgents) {
      const el = pinEl(`agent-${a.id}`);
      el.title = AGENT_DEFS.find((d) => d.id === a.id)?.mk ?? a.id;
      el.dataset.rank = rankOf(liveSkill[a.id].level);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const st = useApp.getState();
        st.setFollowAgentId(a.id);
        st.setPanel("agent");
      });
      agentMarks.current.set(a.id, new Marker({ element: el, anchor: "center" }).setLngLat([a.lng, a.lat]).addTo(map));
    }
  }

  function stepAgents(map: MapLibreMap, dt: number) {
    const st = useApp.getState();
    const edges = NEIGHBORHOODS.filter((n) => n.kind === "edge");
    const city = NEIGHBORHOODS.filter((n) => n.kind !== "edge");
    let dirty = false;
    for (const agent of liveAgents) {
      const def = AGENT_DEFS.find((d) => d.id === agent.id)!;
      const prog = liveSkill[agent.id];
      const b = bonuses(prog);
      const und =
        def.role === "seek"
          ? []
          : st.listings.filter((l) => def.types.includes(l.listingType) && !st.discovered.includes(l.id));

      if (def.role === "seek" && !agent.target) {
        const canCheck = !st.loading && st.liveIds.length > 0;
        const stale = canCheck
          ? st.discovered.find((id) => {
              const ck = st.checks[id];
              return !ck || ck.status === "pending" || Date.now() - ck.at > 75_000;
            })
          : undefined;
        const listing = stale
          ? (st.listings.find((l) => l.id === stale) ?? st.confirmed.find((l) => l.id === stale))
          : undefined;
        const buyer = BUYERS.find((x) => !st.foundBuyers.includes(x.id));
        if (listing && buyer) {
          if (st.foundBuyers.length === 0 || agent.walked % 2 === 0) {
            agent.target = { lat: buyer.lat, lng: buyer.lng, id: buyer.id };
          } else {
            agent.target = { lat: listing.lat, lng: listing.lng, id: listing.id };
          }
        } else if (listing) {
          agent.target = { lat: listing.lat, lng: listing.lng, id: listing.id };
        } else if (buyer) {
          agent.target = { lat: buyer.lat, lng: buyer.lng, id: buyer.id };
        }
      }

      if (!agent.target && und.length) {
        const ranked = und
          .map((l) => ({ l, d: metersBetween(agent.lat, agent.lng, l.lat, l.lng) }))
          .sort((x, y) => x.d - y.d);
        const next = ranked[0].l;
        agent.target = { lat: next.lat, lng: next.lng, id: next.id };
      }
      if (!agent.target) {
        if (prog.skills.memory + prog.skills.learn > 0 && allStreets().length) {
          const s = pickStreet(agent, b.streetRadius);
          agent.target = { lat: s.lat, lng: s.lng, id: null };
        } else {
          const pool =
            agent.id === "land"
              ? edges.length
                ? edges
                : city
              : agent.id === "biz" || agent.id === "seek"
                ? city.filter((n) => n.kind === "center")
                : city;
          const n = (pool.length ? pool : NEIGHBORHOODS)[Math.floor(Math.random() * (pool.length || NEIGHBORHOODS.length))];
          agent.target = { lat: n.lat, lng: n.lng, id: null };
        }
      }

      const tgt = agent.target;
      const dist = metersBetween(agent.lat, agent.lng, tgt.lat, tgt.lng);
      const spd = tgt.id ? b.speedHunt : b.speedIdle;
      const prevLat = agent.lat;
      const prevLng = agent.lng;

      const arrive = dist < (tgt.id ? b.radarM * 0.45 : 22) || dist < 22;
      if (arrive && tgt.id && dist < Math.max(22, b.radarM * 0.45)) {
        if (tgt.id.startsWith("buyer:")) {
          const buyer = BUYERS.find((x) => x.id === tgt.id);
          if (buyer && !st.foundBuyers.includes(buyer.id)) {
            const who = st.lang === "mk" ? def.mk : def.en;
            st.findBuyer(
              buyer.id,
              st.lang === "mk"
                ? `${who} најде купувач · ${buyer.title}`
                : `${who} found a buyer · ${buyer.title}`,
            );
            applySkillEvents(agent.id, grantHunt(agent.id, 48, { scan: 36, learn: 28, upgrade: 12 }, "scan"));
          }
        } else if (def.role === "seek") {
          const ck = st.verifyListing(tgt.id);
          if (ck) {
            const who = st.lang === "mk" ? def.mk : def.en;
            const label =
              ck.status === "live"
                ? st.lang === "mk"
                  ? "сè уште присутен"
                  : "still live"
                : ck.status === "changed"
                  ? st.lang === "mk"
                    ? "има промена"
                    : "changed"
                  : st.lang === "mk"
                    ? "не е на изворот"
                    : "gone from source";
            st.pushFeed(`${who} · ${label}`, tgt.id);
            applySkillEvents(agent.id, grantHunt(agent.id, 28, { scan: 22, learn: 18, upgrade: 8 }, "learn"));
          }
        } else {
          const listing = st.listings.find((l) => l.id === tgt.id);
          if (listing) pinFound(agent.id, listing);
        }
        absorbMap(agent, b.learnRadius, b.autoLearn);
        agent.target = null;
        agent.walked += 1;
        noteWalked(agent.id, metersBetween(prevLat, prevLng, agent.lat, agent.lng));
        dirty = true;
        continue;
      }

      if (dist < 22) {
        const street = pickStreet(agent, b.streetRadius);
        if (street.name && street.name !== agent.lastStreet) {
          agent.lastStreet = street.name;
          absorbMap(agent, b.learnRadius, b.autoLearn);
          if (Math.random() < b.walkFeed) {
            const who = st.lang === "mk" ? def.mk : def.en;
            st.pushFeed(st.lang === "mk" ? `${who} оди по ${street.name}` : `${who} walking ${street.name}`);
          }
          applySkillEvents(agent.id, grantHunt(agent.id, 8, { memory: 18, learn: 22, upgrade: 6, pace: 8 }, "learn"));
        }
        agent.target = null;
        agent.walked += 1;
        noteWalked(agent.id, 1);
        dirty = true;
        continue;
      }

      const f = Math.min(1, (spd * dt) / dist);
      agent.lng += (tgt.lng - agent.lng) * f;
      agent.lat += (tgt.lat - agent.lat) * f;
      const moved = metersBetween(prevLat, prevLng, agent.lat, agent.lng);
      if (moved > 0) {
        liveSkill[agent.id].meters += moved;
        const ev = grantHunt(
          agent.id,
          moved * 0.1,
          { pace: moved * 0.055, upgrade: dt * 1.65, memory: moved * 0.018, learn: moved * 0.042 },
          "upgrade",
        );
        if (ev.length) applySkillEvents(agent.id, ev);
        dirty = true;
      }

      agent.scanAcc += dt;
      if (agent.scanAcc >= b.scanSec && und.length && prog.skills.scan + prog.skills.radar > 0) {
        agent.scanAcc = 0;
        const near = und
          .map((l) => ({ l, d: metersBetween(agent.lat, agent.lng, l.lat, l.lng) }))
          .filter((x) => x.d <= b.radarM)
          .sort((x, y) => x.d - y.d);
        if (near[0]) {
          pinFound(agent.id, near[0].l);
          if (agent.target?.id === near[0].l.id) agent.target = null;
        }
      }

      const mark = agentMarks.current.get(agent.id);
      mark?.setLngLat([agent.lng, agent.lat]);
      const el = mark?.getElement();
      if (el) el.dataset.rank = rankOf(liveSkill[agent.id].level);
    }
    if (dirty) flushSkills();
  }

  function syncPins(map: MapLibreMap) {
    const st = useApp.getState();
    const list = filterListings(st.listings, st.filters, st.saved);
    const keep = new Set<string>();
    if (st.showPins) {
      for (const l of list) {
        keep.add(l.id);
        let mk = pins.current.get(l.id);
        if (!mk) {
          const el = pinEl(listingPin(l.listingType), st.selectedId === l.id);
          el.title = `${l.title} · ${formatPrice(l.priceAmount, l.priceCurrency, l.pricePeriod, st.lang)}`;
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            useApp.getState().select(l.id);
            map.flyTo({ center: [l.lng, l.lat], zoom: 17.2, pitch: 62, duration: 900 });
          });
          mk = new Marker({ element: el, anchor: "bottom" }).setLngLat([l.lng, l.lat]).addTo(map);
          pins.current.set(l.id, mk);
        }
        mk.getElement().classList.toggle("is-on", st.selectedId === l.id);
        const ck = st.checks[l.id];
        mk.getElement().dataset.status = ck?.status ?? "pending";
      }
    }
    for (const [id, mk] of pins.current) {
      if (!keep.has(id)) {
        mk.remove();
        pins.current.delete(id);
      }
    }
  }

  function syncBuyers(map: MapLibreMap) {
    const st = useApp.getState();
    const keep = new Set<string>();
    for (const b of BUYERS) {
      if (!st.foundBuyers.includes(b.id)) continue;
      keep.add(b.id);
      if (buyerMarks.current.has(b.id)) continue;
      const el = pinEl("buyer");
      el.title = b.title;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        useApp.getState().setFollowAgentId("seek");
        useApp.getState().setPanel("agent");
        map.flyTo({ center: [b.lng, b.lat], zoom: 16.6, pitch: 58, duration: 800 });
      });
      buyerMarks.current.set(b.id, new Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]).addTo(map));
    }
    for (const [id, mk] of buyerMarks.current) {
      if (!keep.has(id)) {
        mk.remove();
        buyerMarks.current.delete(id);
      }
    }
  }

  function stepWalk(map: MapLibreMap, dt: number) {
    if (useApp.getState().cameraMode !== "fps") {
      speed.current = 0;
      return;
    }
    const k = keys.current;
    let fwd = 0;
    let rot = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) fwd += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) fwd -= 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) rot += 1;
    if (k.has("KeyD") || k.has("ArrowRight")) rot -= 1;
    if (!fwd && !rot) {
      speed.current = 0;
      return;
    }
    const bearing = map.getBearing() + -rot * TURN_DEG * dt;
    map.setBearing(bearing);
    speed.current = fwd ? WALK_MPS * Math.abs(fwd) : 0.2;
    if (fwd) {
      const rad = (bearing * Math.PI) / 180;
      const step = (WALK_MPS * fwd * dt) / 111_320;
      const c = map.getCenter();
      map.setCenter([c.lng + Math.sin(rad) * step, c.lat + Math.cos(rad) * step]);
    }
  }

  function tickFollow(map: MapLibreMap) {
    const st = useApp.getState();
    if (!st.followAgent || st.cameraMode !== "orbit" || st.flyTo) return;
    const a = liveAgents.find((x) => x.id === st.followAgentId) ?? liveAgents[0];
    map.setCenter([a.lng, a.lat]);
  }

  function tickFly(map: MapLibreMap) {
    const fly = useApp.getState().flyTo;
    if (!fly) return;
    map.flyTo({ center: [fly.lng, fly.lat], zoom: fly.zoom ?? 16.8, pitch: fly.zoom && fly.zoom < 13 ? 38 : 62, duration: 1400 });
    useApp.getState().setFlyTo(null);
  }

  return (
    <>
      <canvas className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden />
      <div ref={wrap} className="ofm-root absolute inset-0 z-0" />
    </>
  );
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
