import {
  LANDMARK_WORLD,
  NEIGHBORHOODS,
  buildStreetGraph,
  toWorld,
  type StreetGraph,
  type Vec2,
} from "./map";
import osmJson from "./osm-data.json";

export type OsmBuilding = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  kind: string;
};

type OsmData = {
  streets: { name: string; hw: string; width: number; pts: [number, number][] }[];
  buildings: OsmBuilding[];
  parks: { name: string; ring: [number, number][]; kind: string }[];
  water: { name: string; pts: [number, number][]; width: number }[];
  rails: [number, number][][];
  pois: { name: string; kind: string; x: number; z: number }[];
};

const osm = osmJson as OsmData;

export type Building = OsmBuilding & { hue: number; district: string; y: number };

export type Prop = { x: number; z: number; s: number; rot: number };

export type RoadSeg = {
  x: number;
  z: number;
  y: number;
  w: number;
  len: number;
  rot: number;
};

export type CityData = {
  graph: StreetGraph;
  buildings: Building[];
  trees: Prop[];
  lamps: Prop[];
  plaza: Vec2;
  parks: OsmData["parks"];
  water: OsmData["water"];
  rails: OsmData["rails"];
  roads: RoadSeg[];
  pois: OsmData["pois"];
};

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function districtAt(x: number, z: number) {
  let best = NEIGHBORHOODS[0];
  let bd = Infinity;
  for (const n of NEIGHBORHOODS) {
    const p = toWorld(n.lat, n.lng);
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

function hueOf(kind: string, distKind: Neighborhood["kind"]) {
  if (kind === "apartments" || kind === "residential") return 0.58;
  if (kind === "commercial" || kind === "retail" || kind === "office") return 0.1;
  if (kind === "industrial" || kind === "warehouse") return 0.04;
  if (distKind === "old") return 0.07;
  if (distKind === "blocks") return 0.56;
  if (distKind === "center") return 0.09;
  return 0.08;
}

type Neighborhood = (typeof NEIGHBORHOODS)[number];

function inRing(x: number, z: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function generateCity(): CityData {
  const graph = buildStreetGraph(osm.streets);
  const rng = mulberry(0x4b756d61);
  const plaza = toWorld(42.13232, 21.71442);

  const buildings: Building[] = [];
  for (const b of osm.buildings) {
    if (Math.hypot(b.x - plaza.x, b.z - plaza.z) < 4.2) continue;
    let skip = false;
    for (const l of LANDMARK_WORLD) {
      if (l.kind === "church" || l.kind === "mosque" || l.kind === "civic" || l.kind === "hall") {
        if (Math.hypot(b.x - l.x, b.z - l.z) < 2.6) {
          skip = true;
          break;
        }
      }
    }
    if (skip) continue;
    const dist = districtAt(b.x, b.z);
    buildings.push({
      ...b,
      y: b.h / 2,
      hue: hueOf(b.kind, dist.kind),
      district: dist.id,
    });
  }

  const roads: RoadSeg[] = [];
  for (const pl of graph.polylines) {
    for (let i = 1; i < pl.points.length; i++) {
      const a = pl.points[i - 1];
      const b = pl.points[i];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.08) continue;
      roads.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        y: 0.03,
        w: pl.width,
        len: len + 0.12,
        rot: Math.atan2(dx, dz),
      });
    }
  }

  const trees: Prop[] = [];
  const lamps: Prop[] = [];

  for (const park of osm.parks) {
    const n = Math.min(18, 4 + Math.floor(park.ring.length / 2));
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of park.ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    let tries = 0;
    while (trees.length < 400 && tries < n * 8) {
      tries++;
      const x = minX + rng() * (maxX - minX);
      const z = minZ + rng() * (maxZ - minZ);
      if (!inRing(x, z, park.ring)) continue;
      trees.push({ x, z, s: 0.7 + rng() * 0.7, rot: rng() * Math.PI });
    }
  }

  for (const pl of graph.polylines) {
    if (!pl.major) continue;
    for (let i = 1; i < pl.points.length; i++) {
      const a = pl.points[i - 1];
      const b = pl.points[i];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      const steps = Math.max(1, Math.floor(len / 3.2));
      for (let s = 0; s < steps; s++) {
        if ((s + i) % 2 !== 0) continue;
        const t = (s + 0.5) / steps;
        lamps.push({
          x: a.x + dx * t + px * (pl.width * 0.42),
          z: a.z + dz * t + pz * (pl.width * 0.42),
          s: 1,
          rot: Math.atan2(dx / len, dz / len),
        });
      }
    }
  }

  if (trees.length < 80) {
    for (let i = 0; i < 90; i++) {
      const x = (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 60;
      if (Math.hypot(x - plaza.x, z - plaza.z) < 6) continue;
      trees.push({ x, z, s: 0.65 + rng() * 0.5, rot: rng() * Math.PI });
    }
  }

  return {
    graph,
    buildings,
    trees: trees.slice(0, 280),
    lamps: lamps.filter((_, i) => i % 3 === 0).slice(0, 180),
    plaza,
    parks: osm.parks,
    water: osm.water,
    rails: osm.rails,
    roads,
    pois: osm.pois,
  };
}

export const CITY = generateCity();
export { LANDMARK_WORLD, osm };
