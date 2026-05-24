import { ToolDefinition, AgentContext, ChatMessage } from "@/lib/agent/types";
import {
  SEARCH_DIARIES_TOOL,
  executeSearchDiaries,
} from "./diary-tools";
import {
  GET_CITY_INFO_TOOL,
  executeGetCityInfo,
} from "./city-tools";
import {
  GET_CULTURAL_SCENARIO_TOOL,
  executeGetCulturalScenario,
} from "./scenario-tools";
import {
  GENERATE_EXTERNAL_LINKS_TOOL,
  executeGenerateExternalLinks,
} from "./search-tools";
import {
  GET_USER_PROFILE_TOOL,
  executeGetUserProfile,
} from "./profile-tools";
import { DELEGATE_TO_AGENT_TOOL } from "./delegate-tool";
import {
  GET_KIT_PROGRESS_TOOL,
  executeGetKitProgress,
} from "./kit-tools";
import { getAgent } from "@/lib/agent/registry";
import { collectAgentLoop } from "@/lib/agent/collect-loop";

// Re-export individual tool definitions for agent configs
export {
  SEARCH_DIARIES_TOOL,
  GET_CITY_INFO_TOOL,
  GET_CULTURAL_SCENARIO_TOOL,
  GENERATE_EXTERNAL_LINKS_TOOL,
  GET_USER_PROFILE_TOOL,
  DELEGATE_TO_AGENT_TOOL,
  GET_KIT_PROGRESS_TOOL,
};

export const ALL_TOOLS: ToolDefinition[] = [
  SEARCH_DIARIES_TOOL,
  GET_CITY_INFO_TOOL,
  GET_CULTURAL_SCENARIO_TOOL,
  GENERATE_EXTERNAL_LINKS_TOOL,
  GET_USER_PROFILE_TOOL,
  DELEGATE_TO_AGENT_TOOL,
  GET_KIT_PROGRESS_TOOL,
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentContext
): Promise<unknown> {
  switch (name) {
    case "search_diaries":
      return executeSearchDiaries(args, context);
    case "get_city_info":
      return executeGetCityInfo(args, context);
    case "get_cultural_scenario":
      return executeGetCulturalScenario(args, context);
    case "generate_external_links":
      return executeGenerateExternalLinks(args, context);
    case "get_user_profile":
      return executeGetUserProfile(args, context);
    case "get_kit_progress":
      return executeGetKitProgress(args, context);
    case "delegate_to_agent": {
      const agentType = String(args.agent_type ?? "");
      const query = String(args.query ?? "");
      const scenario = args.scenario ? String(args.scenario) : undefined;
      const apiOpts = context.apiOptions;

      const subAgent = getAgent(agentType);
      if (!subAgent) {
        return { error: `Unknown agent type: ${agentType}` };
      }
      if (!apiOpts?.apiKey) {
        return { error: "Sub-agent delegation requires API key" };
      }

      const systemPrompt = subAgent.buildSystemPrompt(context);

      const subMessages: ChatMessage[] = [
        { role: "user", content: query },
      ];

      // For simulator, add scenario context hint
      if (agentType === "simulator" && scenario) {
        subMessages[0].content = `请开始"${scenario}"场景练习。先给出【场景背景】，然后以当地人的身份开始对话。用户的原始需求：${query}`;
      }

      const result = await collectAgentLoop({
        systemPrompt,
        tools: subAgent.tools,
        messages: subMessages,
        context,
        apiKey: apiOpts.apiKey,
        apiBaseUrl: apiOpts.apiBaseUrl,
        provider: apiOpts.provider,
        maxSteps: 3,
        temperature: subAgent.temperature,
        maxTokens: subAgent.maxTokens,
      });

      return {
        delegated: true,
        agent: agentType,
        scenario,
        content: result.finalContent,
        stepsUsed: result.stepCount,
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
