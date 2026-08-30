import { AGENT_DEFS, AGENT_IDS, type AgentId } from "./agents";

export const SKILL_IDS = ["pace", "radar", "scan", "memory", "upgrade", "learn"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const SKILL_MAX = 10;
export const LEVEL_MAX = 20;
export const SKILL_XP = 100;

export type AgentSkills = Record<SkillId, number>;
export type SkillXp = Record<SkillId, number>;

export type AgentProgress = {
  id: AgentId;
  xp: number;
  level: number;
  skills: AgentSkills;
  skillXp: SkillXp;
  lastSkill: SkillId | null;
  flashAt: number;
  found: number;
  walked: number;
  meters: number;
};

export type HuntBonuses = {
  speedHunt: number;
  speedIdle: number;
  radarM: number;
  scanSec: number;
  streetRadius: number;
  xpMul: number;
  walkFeed: number;
  pickN: number;
  learnRadius: number;
  autoLearn: number;
};

const SAVE_KEY = "kumanovo-agent-skills-v1";

export function emptySkills(): AgentSkills {
  return { pace: 0, radar: 0, scan: 0, memory: 0, upgrade: 1, learn: 0 };
}

export function emptySkillXp(): SkillXp {
  return { pace: 0, radar: 0, scan: 0, memory: 0, upgrade: 0, learn: 0 };
}

export function blankProgress(id: AgentId): AgentProgress {
  return {
    id,
    xp: 0,
    level: 1,
    skills: emptySkills(),
    skillXp: emptySkillXp(),
    lastSkill: null,
    flashAt: 0,
    found: 0,
    walked: 0,
    meters: 0,
  };
}

export function xpToNext(level: number) {
  return Math.round(70 * level * (1 + level * 0.12));
}

export function xpRatio(p: AgentProgress) {
  return Math.min(1, p.xp / Math.max(1, xpToNext(p.level)));
}

export function skillRatio(p: AgentProgress, id: SkillId) {
  return Math.min(1, p.skillXp[id] / SKILL_XP);
}

export function bonuses(p: AgentProgress): HuntBonuses {
  const s = p.skills;
  return {
    speedHunt: 58 * (1 + s.pace * 0.11),
    speedIdle: 24 * (1 + s.pace * 0.09),
    radarM: 28 + s.radar * 16,
    scanSec: s.scan <= 0 ? 16 : 7.2 / (1 + s.scan * 0.28),
    streetRadius: 160 + s.memory * 70,
    xpMul: 1 + s.upgrade * 0.18,
    walkFeed: 0.1 + s.memory * 0.045,
    pickN: 3 + s.scan,
    learnRadius: 90 + s.learn * 55,
    autoLearn: Math.max(0, Math.floor(s.learn * 0.7)),
  };
}

export function skillLabel(id: SkillId, lang: "mk" | "en") {
  const mk: Record<SkillId, string> = {
    pace: "Ход",
    radar: "Радар",
    scan: "Скен",
    memory: "Меморија",
    upgrade: "Апгрејд",
    learn: "Учење",
  };
  const en: Record<SkillId, string> = {
    pace: "Pace",
    radar: "Radar",
    scan: "Scan",
    memory: "Memory",
    upgrade: "Upgrade",
    learn: "Learn",
  };
  return lang === "mk" ? mk[id] : en[id];
}

export function skillHint(id: SkillId, lang: "mk" | "en") {
  const mk: Record<SkillId, string> = {
    pace: "побрзо по улиците",
    radar: "гледа огласи од подалеку",
    scan: "открива додека минува",
    memory: "памети повеќе улици",
    upgrade: "се качува во живо додека бара",
    learn: "ја проширува мапата додека истражува",
  };
  const en: Record<SkillId, string> = {
    pace: "faster on the streets",
    radar: "spots ads from farther",
    scan: "discovers while passing",
    memory: "remembers more streets",
    upgrade: "levels in real time while hunting",
    learn: "grows the map while exploring",
  };
  return lang === "mk" ? mk[id] : en[id];
}

function clampSkill(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(SKILL_MAX, Math.floor(n)));
}

function clampLevel(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(LEVEL_MAX, Math.floor(n)));
}

export function cloneProgress(p: AgentProgress): AgentProgress {
  return {
    ...p,
    skills: { ...p.skills },
    skillXp: { ...p.skillXp },
  };
}

function sanitize(id: AgentId, raw: Partial<AgentProgress> | null | undefined): AgentProgress {
  const base = blankProgress(id);
  if (!raw || raw.id !== id) return base;
  const skills = emptySkills();
  const skillXp = emptySkillXp();
  for (const k of SKILL_IDS) {
    skills[k] = clampSkill(raw.skills?.[k] ?? skills[k]);
    skillXp[k] = Math.max(0, Math.min(SKILL_XP, Number(raw.skillXp?.[k] ?? 0) || 0));
  }
  return {
    id,
    xp: Math.max(0, Number(raw.xp) || 0),
    level: clampLevel(raw.level ?? 1),
    skills,
    skillXp,
    lastSkill: SKILL_IDS.includes(raw.lastSkill as SkillId) ? (raw.lastSkill as SkillId) : null,
    flashAt: 0,
    found: Math.max(0, Math.floor(Number(raw.found) || 0)),
    walked: Math.max(0, Math.floor(Number(raw.walked) || 0)),
    meters: Math.max(0, Number(raw.meters) || 0),
  };
}

export const liveSkill: Record<AgentId, AgentProgress> = {
  home: blankProgress("home"),
  biz: blankProgress("biz"),
  land: blankProgress("land"),
  seek: blankProgress("seek"),
};

export function loadProgress(): Record<AgentId, AgentProgress> {
  const next: Record<AgentId, AgentProgress> = {
    home: blankProgress("home"),
    biz: blankProgress("biz"),
    land: blankProgress("land"),
    seek: blankProgress("seek"),
  };
  if (typeof window === "undefined") return next;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return next;
    const parsed = JSON.parse(raw) as Partial<Record<AgentId, Partial<AgentProgress>>>;
    for (const id of AGENT_IDS) next[id] = sanitize(id, parsed[id]);
  } catch {
    /* keep blanks */
  }
  return next;
}

export function hydrateSkills() {
  const loaded = loadProgress();
  for (const id of AGENT_IDS) liveSkill[id] = loaded[id];
}

export function snapshotSkills(): AgentProgress[] {
  return AGENT_IDS.map((id) => cloneProgress(liveSkill[id]));
}

let persistAt = 0;

export function persistSkills(force = false) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - persistAt < 4000) return;
  persistAt = now;
  try {
    const payload = Object.fromEntries(AGENT_IDS.map((id) => [id, liveSkill[id]])) as Record<
      AgentId,
      AgentProgress
    >;
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export type SkillEvent = { kind: "level"; level: number } | { kind: "skill"; skill: SkillId; value: number };

function bumpSkill(p: AgentProgress, skill: SkillId, now: number): SkillEvent | null {
  if (p.skills[skill] >= SKILL_MAX) {
    const other = SKILL_IDS.find((k) => k !== skill && p.skills[k] < SKILL_MAX);
    if (!other) return null;
    return bumpSkill(p, other, now);
  }
  p.skills[skill] += 1;
  p.lastSkill = skill;
  p.flashAt = now;
  if (skill === "upgrade") {
    for (const k of SKILL_IDS) {
      if (k === "upgrade") continue;
      p.skillXp[k] = Math.min(SKILL_XP, p.skillXp[k] + 22);
    }
  }
  return { kind: "skill", skill, value: p.skills[skill] };
}

function drainSkillXp(p: AgentProgress, now: number, out: SkillEvent[]) {
  for (const k of SKILL_IDS) {
    let guard = 0;
    while (p.skillXp[k] >= SKILL_XP && p.skills[k] < SKILL_MAX && guard < 6) {
      p.skillXp[k] -= SKILL_XP;
      const ev = bumpSkill(p, k, now);
      if (ev) out.push(ev);
      guard += 1;
    }
    if (p.skills[k] >= SKILL_MAX) p.skillXp[k] = 0;
  }
}

function drainLevel(p: AgentProgress, now: number, hint: SkillId, out: SkillEvent[]) {
  let guard = 0;
  while (p.level < LEVEL_MAX && p.xp >= xpToNext(p.level) && guard < 8) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    out.push({ kind: "level", level: p.level });
    const ev = bumpSkill(p, hint, now);
    if (ev) out.push(ev);
    guard += 1;
  }
  if (p.level >= LEVEL_MAX) p.xp = 0;
}

export function grantHunt(
  id: AgentId,
  amount: number,
  skillGain: Partial<SkillXp>,
  hint: SkillId,
): SkillEvent[] {
  const p = liveSkill[id];
  const mul = bonuses(p).xpMul;
  const now = Date.now();
  const out: SkillEvent[] = [];
  if (amount > 0) p.xp += amount * mul;
  for (const k of SKILL_IDS) {
    const add = skillGain[k];
    if (add && add > 0) p.skillXp[k] += add * mul;
  }
  drainSkillXp(p, now, out);
  drainLevel(p, now, hint, out);
  if (out.length) persistSkills(true);
  return out;
}

export function noteFound(id: AgentId) {
  liveSkill[id].found += 1;
}

export function noteWalked(id: AgentId, meters: number) {
  liveSkill[id].walked += 1;
  liveSkill[id].meters += meters;
}

export function agentTitle(id: AgentId, lang: "mk" | "en") {
  const a = AGENT_DEFS.find((x) => x.id === id) ?? AGENT_DEFS[0];
  return lang === "mk" ? a.mk : a.en;
}

export function rankOf(level: number): "low" | "mid" | "high" {
  if (level >= 10) return "high";
  if (level >= 5) return "mid";
  return "low";
}

hydrateSkills();

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistSkills(true);
  });
  window.addEventListener("pagehide", () => persistSkills(true));
}
