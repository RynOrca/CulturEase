import type { AgentConfig } from "./types";
import { COACH_AGENT } from "./agents/coach";
import { SIMULATOR_AGENT } from "./agents/simulator";
import { ANALYST_AGENT } from "./agents/analyst";
import { KIT_BUILDER_AGENT } from "./agents/kit-builder";

export const AGENT_REGISTRY: Record<string, AgentConfig> = {
  coach: COACH_AGENT,
  simulator: SIMULATOR_AGENT,
  analyst: ANALYST_AGENT,
  "kit-builder": KIT_BUILDER_AGENT,
};

export type AgentType = keyof typeof AGENT_REGISTRY;

export function getAgent(type: string): AgentConfig | undefined {
  return AGENT_REGISTRY[type];
}
