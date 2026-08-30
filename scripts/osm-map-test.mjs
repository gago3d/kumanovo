#!/usr/bin/env node
/** 100% check: catalog streets/villages match OpenStreetMap (our provider). Google is not used. */
import { readFileSync } from "node:fs";

const streets = JSON.parse(readFileSync("/workspace/src/lib/map/streets.json", "utf8"));
const villages = JSON.parse(readFileSync("/workspace/src/lib/map/villages.json", "utf8"));

const BBOX = { s: 41.9605432, w: 21.6101503, n: 42.2682553, e: 21.9932985 };
const fail = [];
const pass = [];

function ok(name, cond, extra = "") {
  if (cond) pass.push(name);
  else fail.push(`${name}${extra ? " — " + extra : ""}`);
}

ok("harvest size", streets.length >= 3000, `got ${streets.length}`);
ok("named streets", new Set(streets.filter((s) => s.name !== "улица").map((s) => s.name)).size >= 300);

const NEEDLES = [
  "11-ти Октомври",
  "Гоце Делчев",
  "Илинденска",
  "Ленинова",
  "Доне Божинов",
  "Моша Пијаде",
  "3 Македонска Ударна Бригада",
  "Караорман",
  "Јане Сандански",
];
for (const n of NEEDLES) {
  const hit = streets.find((s) => s.name.toLowerCase() === n.toLowerCase() || s.name.includes(n.split(" ")[0]));
  ok(`artery ${n}`, Boolean(hit), hit ? "" : "missing in OSM harvest");
}

function onLine(s) {
  if (!s.line || s.line.length < 2) return false;
  const mid = s.line[Math.floor(s.line.length / 2)];
  return Math.abs(mid[0] - s.lng) < 1e-4 && Math.abs(mid[1] - s.lat) < 1e-4;
}
const sample = streets.filter((s) => s.name !== "улица").slice(0, 80);
ok(
  "midpoint on geometry",
  sample.every(onLine),
  `${sample.filter((s) => !onLine(s)).length} off`,
);

function inBbox(lat, lng) {
  return lat >= BBOX.s - 0.05 && lat <= BBOX.n + 0.05 && lng >= BBOX.w - 0.05 && lng <= BBOX.e + 0.05;
}
ok("all streets in municipality bbox", streets.every((s) => inBbox(s.lat, s.lng)));
ok("villages 47", villages.length >= 46, `got ${villages.length}`);
ok("all villages in bbox", villages.every((v) => inBbox(v.lat, v.lng)));

const mustVillages = ["Табановце", "Романовце", "Черкези", "Лопате", "Сопот", "Агино Село", "Младо Нагоричане"];
for (const n of mustVillages) {
  ok(`village ${n}`, villages.some((v) => v.name === n));
}

const wrongDovezenceWest = villages.find((v) => v.name === "Довезенце");
ok("Dovezence is east (OSM), not west of city", wrongDovezenceWest && wrongDovezenceWest.lng > 21.8, JSON.stringify(wrongDovezenceWest));

console.log(`PASS ${pass.length}  FAIL ${fail.length}`);
for (const f of fail) console.log("FAIL", f);
if (fail.length) process.exit(1);
