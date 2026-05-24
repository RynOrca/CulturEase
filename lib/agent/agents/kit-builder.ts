import { AgentConfig } from "@/lib/agent/types";
import { buildKitBuilderSystemPrompt } from "@/lib/agent/prompts/kit-builder";
import {
  SEARCH_DIARIES_TOOL,
  GET_CITY_INFO_TOOL,
  GET_USER_PROFILE_TOOL,
} from "@/lib/agent/tools";

export const KIT_BUILDER_AGENT: AgentConfig = {
  name: "kit-builder",
  tools: [
    SEARCH_DIARIES_TOOL,
    GET_CITY_INFO_TOOL,
    GET_USER_PROFILE_TOOL,
  ],
  buildSystemPrompt: buildKitBuilderSystemPrompt,
  temperature: 0.6,
  maxTokens: 3000,
};
