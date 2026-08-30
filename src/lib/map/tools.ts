import { publicLink } from "@/lib/host";
import { KUMANOVO } from "./openfree";

export type ToolId = "openfreemap" | "photon" | "osrm" | "meteo" | "osm" | "overpass";

export type ToolStatus = {
  id: ToolId;
  mk: string;
  en: string;
  ok: boolean;
  detail: string;
};

export type WeatherNow = {
  c: number;
  code: number;
};

const TOOLS: { id: ToolId; mk: string; en: string; url: string }[] = [
  { id: "openfreemap", mk: "OpenFreeMap", en: "OpenFreeMap", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "photon", mk: "Photon пребарување", en: "Photon search", url: "https://photon.komoot.io/api/?q=Kumanovo&limit=1" },
  { id: "osrm", mk: "OSRM насоки", en: "OSRM directions", url: "https://router.project-osrm.org/route/v1/driving/21.71442,42.13232;21.716,42.133?overview=false" },
  { id: "meteo", mk: "Open-Meteo време", en: "Open-Meteo weather", url: "https://api.open-meteo.com/v1/forecast?latitude=42.13232&longitude=21.71442&current=temperature_2m" },
  { id: "osm", mk: "OpenStreetMap", en: "OpenStreetMap", url: "https://www.openstreetmap.org/api/0.6/capabilities" },
  {
    id: "overpass",
    mk: "OSM улици (Overpass)",
    en: "OSM streets (Overpass)",
    url: "https://overpass.openstreetmap.fr/api/interpreter?data=[out:json][timeout:8];way[%22highway%22][%22name%22](42.131,21.713,42.134,21.716);out ids 1;",
  },
];

async function probe(url: string, ms = 7000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function pingTools(): Promise<ToolStatus[]> {
  const rows = await Promise.all(
    TOOLS.map(async (t) => {
      const ok = await probe(t.url);
      return {
        id: t.id,
        mk: t.mk,
        en: t.en,
        ok,
        detail: ok ? "живо" : "нема одговор",
      };
    }),
  );
  return rows;
}

export async function fetchWeather(): Promise<WeatherNow | null> {
  const [lng, lat] = KUMANOVO;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const c = data.current?.temperature_2m;
    if (typeof c !== "number") return null;
    return { c: Math.round(c), code: data.current?.weather_code ?? 0 };
  } catch {
    return null;
  }
}

export function weatherLabel(code: number, lang: "mk" | "en") {
  const mk = lang === "mk";
  if (code === 0) return mk ? "ведро" : "clear";
  if (code <= 3) return mk ? "облачно" : "cloudy";
  if (code === 45 || code === 48) return mk ? "магла" : "fog";
  if (code >= 51 && code <= 67) return mk ? "дожд" : "rain";
  if (code >= 71 && code <= 77) return mk ? "снег" : "snow";
  if (code >= 80 && code <= 82) return mk ? "пороен" : "showers";
  if (code >= 95) return mk ? "грмотевици" : "storm";
  return mk ? "време" : "weather";
}

export function pageLink() {
  return publicLink();
}

export async function sharePage(title: string): Promise<"shared" | "copied" | "shown"> {
  const url = pageLink();
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, url, text: title });
      return "shared";
    }
  } catch {
    /* fall through to copy */
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "shown";
  }
}
