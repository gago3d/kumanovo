import type { ListingType } from "./types";

export const AGENT_IDS = ["home", "biz", "land", "seek"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export type AgentRole = "hunt" | "seek";

export type AgentDef = {
  id: AgentId;
  types: ListingType[];
  mk: string;
  en: string;
  huntMk: string;
  huntEn: string;
  pin: "home" | "biz" | "land" | "seek";
  role: AgentRole;
};

export const AGENT_DEFS: AgentDef[] = [
  {
    id: "home",
    types: ["stan", "kukja"],
    mk: "Дом",
    en: "Home",
    huntMk: "куќи и станови",
    huntEn: "houses and apartments",
    pin: "home",
    role: "hunt",
  },
  {
    id: "biz",
    types: ["lokal"],
    mk: "Локал",
    en: "Shop",
    huntMk: "локали и објекти за работа",
    huntEn: "shops and work spaces",
    pin: "biz",
    role: "hunt",
  },
  {
    id: "land",
    types: ["vikend", "niva"],
    mk: "Земја",
    en: "Land",
    huntMk: "викенди, ниви и плацови",
    huntEn: "weekend houses, fields and plots",
    pin: "land",
    role: "hunt",
  },
  {
    id: "seek",
    types: ["stan", "kukja", "lokal", "vikend", "niva"],
    mk: "Барач",
    en: "Seeker",
    huntMk: "купувачи и проверка на огласи",
    huntEn: "buyers and listing checks",
    pin: "seek",
    role: "seek",
  },
];

export function agentForType(type: ListingType): AgentDef {
  return AGENT_DEFS.find((a) => a.role === "hunt" && a.types.includes(type)) ?? AGENT_DEFS[0];
}

export function agentLabel(id: AgentId, lang: "mk" | "en") {
  const a = AGENT_DEFS.find((x) => x.id === id) ?? AGENT_DEFS[0];
  return lang === "mk" ? a.mk : a.en;
}

export function agentHunt(id: AgentId, lang: "mk" | "en") {
  const a = AGENT_DEFS.find((x) => x.id === id) ?? AGENT_DEFS[0];
  return lang === "mk" ? a.huntMk : a.huntEn;
}
