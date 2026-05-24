import { AgentConfig } from "@/lib/agent/types";
import { buildCoachSystemPrompt } from "@/lib/agent/prompts/coach";
import {
  SEARCH_DIARIES_TOOL,
  GET_CITY_INFO_TOOL,
  GET_CULTURAL_SCENARIO_TOOL,
  GENERATE_EXTERNAL_LINKS_TOOL,
  GET_USER_PROFILE_TOOL,
  DELEGATE_TO_AGENT_TOOL,
  GET_KIT_PROGRESS_TOOL,
} from "@/lib/agent/tools";

export const COACH_AGENT: AgentConfig = {
  name: "coach",
  tools: [
    SEARCH_DIARIES_TOOL,
    GET_CITY_INFO_TOOL,
    GET_CULTURAL_SCENARIO_TOOL,
    GENERATE_EXTERNAL_LINKS_TOOL,
    GET_USER_PROFILE_TOOL,
    DELEGATE_TO_AGENT_TOOL,
    GET_KIT_PROGRESS_TOOL,
  ],
  buildSystemPrompt: buildCoachSystemPrompt,
  temperature: 0.7,
  maxTokens: 2000,
};
