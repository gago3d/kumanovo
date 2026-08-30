import { LANDMARKS, NEIGHBORHOODS, ORIGIN_LAT, ORIGIN_LNG, hash32, matchNeighborhood, toWorld } from "@/lib/city/map";
import { OSM_POIS, STREETS, VILLAGES, allStreets, type NamedStreet } from "@/lib/map/places";
import type { Listing } from "./types";

const SKIP_STREET = /^(улица|street|road)?\s*\d*$/i;

const STREET_ALIAS: [RegExp, string][] = [
  [/илинденск|ilindensk/i, "Илинденска"],
  [/октомвриска|oktomvriska/i, "Октомвриска Револуција"],
  [/ленинов|leninov/i, "Ленинова"],
  [/11[.\s-]*ти\s*октомври|11\s*октомври/i, "11-ти Октомври"],
  [/3\s*муб|3муб|ударна\s*бригад|3\s*македонска/i, "3 Македонска Ударна Бригада"],
  [/гоце\s*делч|goce\s*delc/i, "Гоце Делчев"],
  [/перо\s*чич|pero\s*cic/i, "Перо Чичо"],
  [/народна\s*револуц/i, "Народна Револуција"],
  [/кирил\s*и\s*методи/i, "Св. Кирил и Методиј"],
  [/бајрам\s*шабан/i, "Бајрам Шабани"],
  [/доне\s*божин/i, "Доне Божинов"],
  [/крсте\s*мисирк/i, "Крсте Мисирков"],
  [/србо\s*томов/i, "Србо Томовиќ"],
  [/иво\s*лола|лола\s*рибар/i, "Иво Лола Рибар"],
  [/ѓорче\s*петров|gorce\s*petrov/i, "Ѓорче Петров"],
  [/пионерск/i, "Пионерска"],
  [/тесла|tesla/i, "Никола Тесла"],
];

const PLACE_ALIAS: [RegExp, { lat: number; lng: number; name: string }][] = [
  [/рамстор|ram\s*stor/i, { lat: 42.130355, lng: 21.720568, name: "RAM Store" }],
  [/гарнизон|garnizon/i, { lat: 42.134397, lng: 21.717436, name: "Гарнизон" }],
  [/бела\s*2|ла\s*плаза|la\s*plaza/i, { lat: 42.132799, lng: 21.710431, name: "ТЦ Ла Плаза" }],
  [/судск|основен\s*суд/i, { lat: 42.137284, lng: 21.716461, name: "Основен Суд" }],
  [/плоштад|четири\s*бандер|нова\s*југославија/i, { lat: 42.135248, lng: 21.720093, name: "Градски Плоштад" }],
  [/строг\s*центар|во\s*центар|центар\s*на\s*градот/i, { lat: 42.135248, lng: 21.720093, name: "Градски Плоштад" }],
  [/џамија|sinan/i, { lat: 42.13756, lng: 21.714739, name: "Татар Синан Бег џамија" }],
  [/автобуск/i, { lat: 42.140519, lng: 21.719016, name: "Автобуска станица" }],
  [/стадион/i, { lat: 42.139417, lng: 21.714172, name: "Градски Стадион" }],
  [/болниц/i, { lat: 42.136894, lng: 21.709058, name: "Болница" }],
  [/општин/i, { lat: 42.137408, lng: 21.715897, name: "Општина Куманово" }],
];

function fold(s: string) {
  return s
    .toLowerCase()
    .replace(/ѓ/g, "г")
    .replace(/ќ/g, "к")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function along(line: [number, number][], t: number): { lng: number; lat: number } {
  if (!line.length) return { lng: 21.71442, lat: 42.13232 };
  if (line.length === 1) return { lng: line[0][0], lat: line[0][1] };
  const u = Math.min(0.92, Math.max(0.08, t));
  let total = 0;
  const seg: number[] = [0];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(total);
  }
  if (total <= 0) return { lng: line[0][0], lat: line[0][1] };
  const want = u * total;
  for (let i = 1; i < line.length; i++) {
    if (seg[i] >= want) {
      const span = seg[i] - seg[i - 1] || 1;
      const k = (want - seg[i - 1]) / span;
      const a = line[i - 1];
      const b = line[i];
      return { lng: a[0] + (b[0] - a[0]) * k, lat: a[1] + (b[1] - a[1]) * k };
    }
  }
  const last = line[line.length - 1];
  return { lng: last[0], lat: last[1] };
}

function longestStreet(name: string, nearLat = ORIGIN_LAT, nearLng = ORIGIN_LNG): NamedStreet | null {
  const want = fold(name);
  let best: NamedStreet | null = null;
  let bestScore = Infinity;
  for (const s of allStreets().length ? allStreets() : STREETS) {
    if (!s.name || SKIP_STREET.test(s.name)) continue;
    if (fold(s.name) !== want) continue;
    const d = Math.hypot(s.lat - nearLat, s.lng - nearLng);
    const len = Math.min(80, s.line?.length ?? 0);
    const score = d * 1000 - len;
    if (score < bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

function houseNo(text: string): number | null {
  const m = text.match(/(?:бр\.?|број|broj)\s*(\d{1,3})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tOnStreet(id: string, no: number | null) {
  if (no && no > 0) return Math.min(0.88, Math.max(0.12, no / 180));
  return 0.18 + ((hash32(id) % 650) / 650) * 0.64;
}

function namedStreets() {
  const out: NamedStreet[] = [];
  const seen = new Set<string>();
  for (const s of allStreets().length ? allStreets() : STREETS) {
    if (!s.name || SKIP_STREET.test(s.name) || s.name.length < 5) continue;
    const k = fold(s.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.sort((a, b) => b.name.length - a.name.length);
}

export type PinPlace = {
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
};

export function locatePin(id: string, text: string): PinPlace {
  const blob = text.replace(/[-_/]+/g, " ");
  const nhood = matchNeighborhood(blob);
  const no = houseNo(`${blob.split("http")[0]} ${blob.split("oglas")[0]}`);

  for (const [re, name] of STREET_ALIAS) {
    if (!re.test(blob)) continue;
    const s = longestStreet(name, nhood.lat, nhood.lng);
    if (!s) continue;
    const pt = along(s.line, tOnStreet(id, no));
    return { lat: pt.lat, lng: pt.lng, address: no ? `${s.name} бр. ${no}, Куманово` : `${s.name}, Куманово`, neighborhood: nhood.nameMk };
  }

  const folded = fold(blob);
  for (const s of namedStreets()) {
    const fn = fold(s.name);
    if (fn.length < 6) continue;
    if (!folded.includes(fn)) continue;
    const full = longestStreet(s.name, nhood.lat, nhood.lng) ?? s;
    const pt = along(full.line, tOnStreet(id, no));
    return {
      lat: pt.lat,
      lng: pt.lng,
      address: no ? `${full.name} бр. ${no}, Куманово` : `${full.name}, Куманово`,
      neighborhood: nhood.nameMk,
    };
  }

  for (const v of VILLAGES) {
    if (v.name.length < 4) continue;
    const hit = blob.toLowerCase().includes(v.name.toLowerCase()) || blob.toLowerCase().includes(v.nameEn.toLowerCase());
    if (!hit) continue;
    return { lat: v.lat, lng: v.lng, address: `${v.name}, Општина Куманово`, neighborhood: v.name };
  }

  for (const n of NEIGHBORHOODS) {
    if (n.kind !== "edge" || n.nameMk.length < 4) continue;
    if (blob.toLowerCase().includes(n.nameMk.toLowerCase()) || blob.toLowerCase().includes(n.nameEn.toLowerCase())) {
      return { lat: n.lat, lng: n.lng, address: `${n.nameMk}, Општина Куманово`, neighborhood: n.nameMk };
    }
  }

  for (const [re, p] of PLACE_ALIAS) {
    if (!re.test(blob)) continue;
    return { lat: p.lat, lng: p.lng, address: `${p.name}, Куманово`, neighborhood: nhood.nameMk };
  }

  const low = blob.toLowerCase();
  for (const p of OSM_POIS) {
    if (p.name.length < 6) continue;
    if (/bus_stop|parking|atm|улица|^куманово$|^kumanovo$/i.test(p.name)) continue;
    if (low.includes(p.name.toLowerCase()) || (p.nameEn.length > 5 && low.includes(p.nameEn.toLowerCase()))) {
      return { lat: p.lat, lng: p.lng, address: `${p.name}, Куманово`, neighborhood: nhood.nameMk };
    }
  }

  for (const l of LANDMARKS) {
    if (l.nameMk.length < 5) continue;
    if (low.includes(l.nameMk.toLowerCase()) || low.includes(l.nameEn.toLowerCase())) {
      return { lat: l.lat, lng: l.lng, address: `${l.nameMk}, Куманово`, neighborhood: nhood.nameMk };
    }
  }

  return {
    lat: nhood.lat,
    lng: nhood.lng,
    address: `${nhood.nameMk}, Куманово`,
    neighborhood: nhood.nameMk,
  };
}

export function placeListing<T extends Pick<Listing, "id" | "title" | "address" | "neighborhood" | "sourceUrl" | "description">>(
  listing: T,
): T & { lat: number; lng: number; worldX: number; worldZ: number; address: string; neighborhood: string } {
  const pin = locatePin(
    listing.id,
    `${listing.title} ${listing.address ?? ""} ${listing.neighborhood ?? ""} ${listing.description ?? ""} ${listing.sourceUrl}`,
  );
  const w = toWorld(pin.lat, pin.lng);
  return { ...listing, lat: pin.lat, lng: pin.lng, worldX: w.x, worldZ: w.z, address: pin.address, neighborhood: pin.neighborhood };
}
