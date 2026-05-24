import { AgentConfig } from "@/lib/agent/types";
import { buildAnalystSystemPrompt } from "@/lib/agent/prompts/analyst";
import {
  SEARCH_DIARIES_TOOL,
  GET_CITY_INFO_TOOL,
  GET_USER_PROFILE_TOOL,
} from "@/lib/agent/tools";

export const ANALYST_AGENT: AgentConfig = {
  name: "analyst",
  tools: [
    SEARCH_DIARIES_TOOL,
    GET_CITY_INFO_TOOL,
    GET_USER_PROFILE_TOOL,
  ],
  buildSystemPrompt: buildAnalystSystemPrompt,
  temperature: 0.5,
  maxTokens: 2500,
};
