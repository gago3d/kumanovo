import { AGENT_DEFS, type AgentId } from "@/lib/listings/agents";
import { KUMANOVO } from "@/lib/map/openfree";

export type LiveAgent = {
  id: AgentId;
  lng: number;
  lat: number;
  target: { lat: number; lng: number; id: string | null } | null;
  walked: number;
  scanAcc: number;
  lastStreet: string;
};

const OFFSET: Record<AgentId, [number, number]> = {
  home: [0, 0],
  biz: [0.0021, 0.0014],
  land: [-0.0032, -0.0024],
  seek: [0.0016, -0.0028],
};

export const liveAgents: LiveAgent[] = AGENT_DEFS.map((a) => ({
  id: a.id,
  lng: KUMANOVO[0] + OFFSET[a.id][0],
  lat: KUMANOVO[1] + OFFSET[a.id][1],
  target: null,
  walked: 0,
  scanAcc: 0,
  lastStreet: "",
}));

export function agentById(id: AgentId) {
  return liveAgents.find((a) => a.id === id) ?? liveAgents[0];
}

/** @deprecated single-agent shim — first-person still uses home agent pose */
export const mapAgent = liveAgents[0];
