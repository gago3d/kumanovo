import villagesJson from "@/lib/map/villages.json";

/** Kumanovo projected from real OSM / WGS84 into a compact 3D world. */

export const ORIGIN_LAT = 42.13232;
export const ORIGIN_LNG = 21.71442;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((ORIGIN_LAT * Math.PI) / 180);
/** 1 world unit ≈ 48 m — whole city readable in one orbit */
export const WORLD_PER_M = 1 / 48;

export type Vec2 = { x: number; z: number };
export type Neighborhood = {
  id: string;
  nameMk: string;
  nameEn: string;
  lat: number;
  lng: number;
  kind: "center" | "blocks" | "houses" | "old" | "edge";
};

const CITY: Neighborhood[] = [
  { id: "ploshtad", nameMk: "Плоштад Нова Југославија", nameEn: "Nova Jugoslavija Square", lat: 42.13232, lng: 21.71442, kind: "center" },
  { id: "centar", nameMk: "Центар", nameEn: "Center", lat: 42.1328, lng: 21.7152, kind: "center" },
  { id: "goce", nameMk: "Гоце Делчев", nameEn: "Goce Delčev", lat: 42.1339, lng: 21.7048, kind: "blocks" },
  { id: "oktomvriska", nameMk: "Октомвриска Револуција", nameEn: "Oktomvriska Revolucija", lat: 42.1284, lng: 21.7168, kind: "blocks" },
  { id: "karpos", nameMk: "Карпош", nameEn: "Karpoš", lat: 42.1402, lng: 21.7124, kind: "houses" },
  { id: "jane", nameMk: "Јане Сандански", nameEn: "Jane Sandanski", lat: 42.1266, lng: 21.7264, kind: "houses" },
  { id: "pero", nameMk: "Перо Чичо", nameEn: "Pero Čičo", lat: 42.1218, lng: 21.7092, kind: "houses" },
  { id: "zelen", nameMk: "Зелен Рид", nameEn: "Zelen Rid", lat: 42.1254, lng: 21.6986, kind: "houses" },
  { id: "sredorek", nameMk: "Средорек", nameEn: "Sredorek", lat: 42.1248, lng: 21.7196, kind: "houses" },
  { id: "sokolana", nameMk: "Соколана", nameEn: "Sokolana", lat: 42.1376, lng: 21.7218, kind: "blocks" },
  { id: "varos", nameMk: "Варош маало", nameEn: "Varoš maalo", lat: 42.1311, lng: 21.712, kind: "old" },
  { id: "velesko", nameMk: "Велешко маало", nameEn: "Veleško maalo", lat: 42.1296, lng: 21.7148, kind: "old" },
  { id: "trgovski", nameMk: "Трговски", nameEn: "Shopping area", lat: 42.1306, lng: 21.7164, kind: "center" },
  { id: "leninova", nameMk: "Ленинова", nameEn: "Leninova", lat: 42.1336, lng: 21.7106, kind: "center" },
  { id: "mub", nameMk: "3. МУБ", nameEn: "3rd Macedonian Brigade", lat: 42.1294, lng: 21.7246, kind: "blocks" },
  { id: "ilindenska", nameMk: "Илинденска", nameEn: "Ilindenska", lat: 42.1318, lng: 21.7214, kind: "center" },
  { id: "tesla", nameMk: "Никола Тесла", nameEn: "Nikola Tesla", lat: 42.1364, lng: 21.7148, kind: "blocks" },
  { id: "ajducka", nameMk: "Ајдучка Чешма", nameEn: "Ajdučka Češma", lat: 42.1394, lng: 21.7206, kind: "houses" },
];

const NEARBY: Neighborhood[] = [
  { id: "vojnik", nameMk: "Војник", nameEn: "Vojnik", lat: 42.1589, lng: 21.87184, kind: "edge" },
  { id: "celopek", nameMk: "Челопек", nameEn: "Čelopek", lat: 42.22809, lng: 21.8259, kind: "edge" },
  { id: "strezovce", nameMk: "Стрезовце", nameEn: "Strezovce", lat: 42.1498, lng: 21.87297, kind: "edge" },
  { id: "dejlovce", nameMk: "Дејловце", nameEn: "Dejlovce", lat: 42.2154, lng: 21.7622, kind: "edge" },
];

type VillageRow = { id: string; name: string; nameEn: string; lat: number; lng: number };

export const NEIGHBORHOODS: Neighborhood[] = (() => {
  const out = [...CITY];
  const have = new Set(out.map((n) => n.nameMk.toLowerCase()));
  for (const v of villagesJson as VillageRow[]) {
    const key = v.name.toLowerCase();
    if (have.has(key)) continue;
    have.add(key);
    out.push({ id: v.id, nameMk: v.name, nameEn: v.nameEn, lat: v.lat, lng: v.lng, kind: "edge" });
  }
  for (const e of NEARBY) {
    if (have.has(e.nameMk.toLowerCase())) continue;
    have.add(e.nameMk.toLowerCase());
    out.push(e);
  }
  return out;
})();

export type Landmark = {
  id: string;
  nameMk: string;
  nameEn: string;
  lat: number;
  lng: number;
  kind: "square" | "church" | "mosque" | "hall" | "monument" | "civic" | "stadium";
};

export const LANDMARKS: Landmark[] = [
  { id: "square", nameMk: "Плоштад Нова Југославија", nameEn: "Nova Jugoslavija Square", lat: 42.13232, lng: 21.71442, kind: "square" },
  { id: "poles", nameMk: "Четири бандере", nameEn: "Four Poles", lat: 42.13232, lng: 21.71442, kind: "monument" },
  { id: "nikola", nameMk: "Црква Св. Никола", nameEn: "St. Nikola Church", lat: 42.1329, lng: 21.71655, kind: "church" },
  { id: "eski", nameMk: "Татар Синан Бег џамија", nameEn: "Tatar Sinan Beg Mosque", lat: 42.13355, lng: 21.71335, kind: "mosque" },
  { id: "hall", nameMk: "Трајко Прокопиев", nameEn: "Trajko Prokopiev Hall", lat: 42.13205, lng: 21.7122, kind: "civic" },
  { id: "sokolana", nameMk: "Соколана", nameEn: "Sokolana", lat: 42.1377, lng: 21.722, kind: "hall" },
  { id: "batko", nameMk: "Батко Ѓорѓија", nameEn: "Batko Gjorgjija", lat: 42.13205, lng: 21.7149, kind: "monument" },
  { id: "cityhall", nameMk: "Општина Куманово", nameEn: "City Hall", lat: 42.13315, lng: 21.71535, kind: "civic" },
  { id: "stadium", nameMk: "Градски стадион", nameEn: "City Stadium", lat: 42.1356, lng: 21.7218, kind: "stadium" },
];

export function toWorld(lat: number, lng: number): Vec2 {
  const x = (lng - ORIGIN_LNG) * M_PER_DEG_LNG * WORLD_PER_M;
  const z = -(lat - ORIGIN_LAT) * M_PER_DEG_LAT * WORLD_PER_M;
  return { x, z };
}

/** Exact Web-Mercator tile bounds of the stitched real map (zoom 16). */
export const MAP_BOUNDS = {
  latMin: 42.11452395246425,
  latMax: 42.15118709351198,
  lngMin: 21.6815185546875,
  lngMax: 21.7474365234375,
};

const mapNw = toWorld(MAP_BOUNDS.latMax, MAP_BOUNDS.lngMin);
const mapSe = toWorld(MAP_BOUNDS.latMin, MAP_BOUNDS.lngMax);
export const MAP_PLANE = {
  x: (mapNw.x + mapSe.x) / 2,
  z: (mapNw.z + mapSe.z) / 2,
  w: Math.abs(mapSe.x - mapNw.x),
  d: Math.abs(mapSe.z - mapNw.z),
};

export const LANDMARK_WORLD = LANDMARKS.map((l) => ({ ...l, ...toWorld(l.lat, l.lng) }));

export function neighborhoodWorld(id: string): Vec2 {
  const n = NEIGHBORHOODS.find((d) => d.id === id) ?? NEIGHBORHOODS[0];
  return toWorld(n.lat, n.lng);
}

const ALIASES: { re: RegExp; id: string }[] = [
  { re: /плоштад|ploshtad|plostad|нова југославија|chetiri|бандер/i, id: "ploshtad" },
  { re: /гоце|goce|делчев|delcev|delčev/i, id: "goce" },
  { re: /октомвриска|oktomvriska|oktomvri/i, id: "oktomvriska" },
  { re: /карпош|karpos|karpoš/i, id: "karpos" },
  { re: /сандански|sandanski|бабин/i, id: "jane" },
  { re: /перо\s*чич|pero\s*cic|banevo/i, id: "pero" },
  { re: /зелен\s*рид|zelen/i, id: "zelen" },
  { re: /бедин|bedinj/i, id: "bedinje" },
  { re: /средорек|sredorek/i, id: "sredorek" },
  { re: /соколан|sokolana/i, id: "sokolana" },
  { re: /трговск|trgovsk|рамстор|ramstor|бела\s*2|bela\s*2/i, id: "trgovski" },
  { re: /ленинов|leninov|тунел/i, id: "leninova" },
  { re: /3\s*муб|3муб|ударна|brigad|булевар|bulevar/i, id: "mub" },
  { re: /илинден|ilinden/i, id: "ilindenska" },
  { re: /тесла|tesla/i, id: "tesla" },
  { re: /војник|vojnik/i, id: "vojnik" },
  { re: /романовц|romanovc/i, id: "romanovce" },
  { re: /довезен|dovezenc/i, id: "dovezence" },
  { re: /чекез|cekez|cerkez|çekez/i, id: "cekeze" },
  { re: /челопек|celopek|çelopek/i, id: "celopek" },
  { re: /стрезов|strezov/i, id: "strezovce" },
  { re: /доброшан|dobrosan|dobrošan/i, id: "dobrosane" },
  { re: /дејлов|dejlov/i, id: "dejlovce" },
  { re: /проевц|proevc/i, id: "proevce" },
  { re: /тромеѓ|tromeg/i, id: "tromegja" },
  { re: /биљанов|biljanov/i, id: "biljanovce" },
  { re: /режанов|rezanov|rezhanov/i, id: "rezanovce" },
  { re: /лопате|lopate/i, id: "lopate" },
  { re: /шупли\s*камен|supli\s*kamen/i, id: "proevce" },
  { re: /11\s*октомври|11-ти/i, id: "ilindenska" },
  { re: /центар|centar|center|строг/i, id: "centar" },
  { re: /куманово|kumanovo/i, id: "centar" },
];

export function matchNeighborhood(text: string): Neighborhood {
  for (const a of ALIASES) {
    if (a.re.test(text)) {
      const hit = NEIGHBORHOODS.find((n) => n.id === a.id);
      if (hit) return hit;
      const byName = NEIGHBORHOODS.find((n) => a.re.test(n.nameMk) || a.re.test(n.nameEn));
      if (byName) return byName;
    }
  }
  const low = text.toLowerCase();
  for (const n of NEIGHBORHOODS) {
    if (n.nameMk.length > 3 && low.includes(n.nameMk.toLowerCase())) return n;
    if (n.nameEn.length > 3 && low.includes(n.nameEn.toLowerCase())) return n;
  }
  return NEIGHBORHOODS[1];
}

export type GraphNode = { id: number; x: number; z: number; name?: string };
export type GraphEdge = { a: number; b: number; name: string; dist: number };

export type StreetGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  polylines: { name: string; width: number; points: Vec2[]; major: boolean }[];
};

function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "primary_link", "trunk_link"]);

export function buildStreetGraph(
  streets: { name: string; hw: string; width: number; pts: [number, number][] }[],
): StreetGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const polylines: StreetGraph["polylines"] = [];
  const snap: { i: number; x: number; z: number }[] = [];
  const SNAP = 0.85;

  function getNode(x: number, z: number, name?: string) {
    for (const s of snap) {
      if (Math.hypot(s.x - x, s.z - z) < SNAP) return s.i;
    }
    const id = nodes.length;
    nodes.push({ id, x, z, name });
    snap.push({ i: id, x, z });
    return id;
  }

  for (const s of streets) {
    const pts = s.pts.map(([x, z]) => ({ x, z }));
    if (pts.length < 2) continue;
    const major = MAJOR.has(s.hw) || s.name.length > 0;
    polylines.push({ name: s.name, width: s.width, points: pts, major });
    if (!major) continue;
    let prev = -1;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) {
        prev = getNode(p.x, p.z, s.name || undefined);
        continue;
      }
      const prevP = pts[i - 1];
      const d = dist(prevP, p);
      const steps = Math.max(1, Math.round(d / 4.4));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const x = prevP.x + (p.x - prevP.x) * t;
        const z = prevP.z + (p.z - prevP.z) * t;
        const nid = getNode(x, z, s.name || undefined);
        if (nid !== prev) {
          edges.push({ a: prev, b: nid, name: s.name, dist: dist(nodes[prev], nodes[nid]) });
          prev = nid;
        }
      }
    }
  }

  return { nodes, edges, polylines };
}

export function nearestNode(graph: StreetGraph, x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (const n of graph.nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}

export function astar(graph: StreetGraph, start: number, goal: number): number[] {
  if (start === goal) return [start];
  const adj = new Map<number, { to: number; w: number }[]>();
  for (const e of graph.edges) {
    (adj.get(e.a) ?? (adj.set(e.a, []), adj.get(e.a)!)).push({ to: e.b, w: e.dist });
    (adj.get(e.b) ?? (adj.set(e.b, []), adj.get(e.b)!)).push({ to: e.a, w: e.dist });
  }
  const gScore = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const open: number[] = [start];
  const f = (i: number) =>
    (gScore.get(i) ?? Infinity) +
    Math.hypot(graph.nodes[i].x - graph.nodes[goal].x, graph.nodes[i].z - graph.nodes[goal].z);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f(open[i]) < f(open[bi])) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) {
      const path = [cur];
      let c = cur;
      while (came.has(c)) {
        c = came.get(c)!;
        path.push(c);
      }
      return path.reverse();
    }
    for (const { to, w } of adj.get(cur) ?? []) {
      const ng = (gScore.get(cur) ?? Infinity) + w;
      if (ng < (gScore.get(to) ?? Infinity)) {
        came.set(to, cur);
        gScore.set(to, ng);
        if (!open.includes(to)) open.push(to);
      }
    }
  }
  return [start];
}

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function jitterFromId(id: string, spread = 2.4): Vec2 {
  const h = hash32(id);
  const a = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const r = ((h >>> 16) / 0xffff) * spread;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

/** World-unit jitter → WGS84 so MapLibre pins don't stack on a neighborhood centroid. */
export function jitterLatLng(id: string, lat: number, lng: number, spread = 2.4): { lat: number; lng: number } {
  const j = jitterFromId(id, spread);
  return {
    lat: lat - j.z / (M_PER_DEG_LAT * WORLD_PER_M),
    lng: lng + j.x / (M_PER_DEG_LNG * WORLD_PER_M),
  };
}

export type PlaceHit = { id: string; nameMk: string; nameEn: string; x: number; z: number; lat: number; lng: number; kind: string };

export function allPlaces(): PlaceHit[] {
  const places: PlaceHit[] = NEIGHBORHOODS.map((n) => {
    const p = toWorld(n.lat, n.lng);
    return { id: `n-${n.id}`, nameMk: n.nameMk, nameEn: n.nameEn, x: p.x, z: p.z, lat: n.lat, lng: n.lng, kind: "neighborhood" };
  });
  for (const l of LANDMARK_WORLD) {
    places.push({
      id: `l-${l.id}`,
      nameMk: l.nameMk,
      nameEn: l.nameEn,
      x: l.x,
      z: l.z,
      lat: l.lat,
      lng: l.lng,
      kind: l.kind,
    });
  }
  return places;
}

export function searchPlaces(q: string): PlaceHit[] {
  const s = q.trim().toLowerCase();
  if (!s) return allPlaces();
  return allPlaces().filter(
    (p) => p.nameMk.toLowerCase().includes(s) || p.nameEn.toLowerCase().includes(s),
  );
}
