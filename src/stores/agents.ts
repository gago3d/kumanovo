import { create } from "zustand";
import { AGENT_IDS, type AgentId } from "@/lib/listings/agents";
import {
  cloneProgress,
  liveSkill,
  snapshotSkills,
  type AgentProgress,
} from "@/lib/listings/skills";

type AgentsState = {
  byId: Record<AgentId, AgentProgress>;
  sync: (rows?: AgentProgress[]) => void;
};

const start = Object.fromEntries(AGENT_IDS.map((id) => [id, cloneProgress(liveSkill[id])])) as Record<
  AgentId,
  AgentProgress
>;

export const useAgents = create<AgentsState>((set) => ({
  byId: start,
  sync: (rows) => {
    const list = rows ?? snapshotSkills();
    const byId = { ...useAgents.getState().byId };
    for (const row of list) byId[row.id] = row;
    set({ byId });
  },
}));
