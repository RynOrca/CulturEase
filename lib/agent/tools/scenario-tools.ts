import { ToolDefinition, AgentContext } from "@/lib/agent/types";
import { CULTURAL_SCENARIOS } from "@/lib/data/scenarios";
import { LIFE_TYPE_LABELS } from "@/lib/types";

export const GET_CULTURAL_SCENARIO_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_cultural_scenario",
    description:
      "获取跨文化差异场景案例。这些是预先整理的中外文化对比案例，包含两国行为差异、适应建议和真实留学生引用。用于帮助用户理解特定场景下的文化差异。",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "话题关键词，如'医疗'、'租房'、'社交'、'小费'、'学术'等",
        },
        target_country: {
          type: "string",
          description: "目标国家代码，如'GB'（英国）、'US'（美国）、'AU'（澳大利亚）等",
        },
        max_results: {
          type: "integer",
          description: "最大返回条数，默认3",
        },
      },
      required: ["target_country"],
    },
  },
};

export interface ScenarioResult {
  total: number;
  results: {
    title: string;
    category: string;
    sourceBehavior: string;
    targetBehavior: string;
    howToAdapt: string;
    realQuote: string;
    quoteAuthor: string;
    tags: string[];
  }[];
}

export function executeGetCulturalScenario(
  args: Record<string, unknown>,
  _context: AgentContext
): ScenarioResult {
  const topic = args.topic ? String(args.topic).toLowerCase() : "";
  const targetCountry = args.target_country ? String(args.target_country).toUpperCase() : "";
  const maxResults = typeof args.max_results === "number" ? args.max_results : 3;

  let filtered = CULTURAL_SCENARIOS.filter((s) => {
    const matchCountry = !targetCountry || s.targetCountry === targetCountry;
    const matchTopic =
      !topic ||
      s.title.toLowerCase().includes(topic) ||
      s.category.toLowerCase().includes(topic) ||
      s.tags.some((t) => t.toLowerCase().includes(topic)) ||
      s.sourceBehavior.includes(topic) ||
      s.targetBehavior.includes(topic);
    return matchCountry && matchTopic;
  });

  // If no results with topic filter, drop topic filter
  if (filtered.length === 0 && topic) {
    filtered = CULTURAL_SCENARIOS.filter((s) => s.targetCountry === targetCountry);
  }

  const top = filtered.slice(0, maxResults);

  return {
    total: filtered.length,
    results: top.map((s) => ({
      title: s.title,
      category: LIFE_TYPE_LABELS[s.category] ?? s.category,
      sourceBehavior: s.sourceBehavior,
      targetBehavior: s.targetBehavior,
      howToAdapt: s.howToAdapt,
      realQuote: s.realQuote,
      quoteAuthor: s.quoteAuthor,
      tags: s.tags,
    })),
  };
}
