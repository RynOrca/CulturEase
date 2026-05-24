import { AgentConfig } from "@/lib/agent/types";
import { buildSimulatorSystemPrompt } from "@/lib/agent/prompts/simulator";
import {
  GET_CULTURAL_SCENARIO_TOOL,
  GET_CITY_INFO_TOOL,
  GET_USER_PROFILE_TOOL,
} from "@/lib/agent/tools";

export const SIMULATOR_AGENT: AgentConfig = {
  name: "simulator",
  tools: [
    GET_CULTURAL_SCENARIO_TOOL,
    GET_CITY_INFO_TOOL,
    GET_USER_PROFILE_TOOL,
  ],
  buildSystemPrompt: buildSimulatorSystemPrompt,
  temperature: 0.8,
  maxTokens: 600,
};
