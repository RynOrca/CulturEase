import { ToolDefinition, AgentContext } from "@/lib/agent/types";
import { DiaryEntry } from "@/lib/types";
import { searchDiaries, rankDiariesByRelevance } from "@/lib/search";

export const SEARCH_DIARIES_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "search_diaries",
    description:
      "搜索用户的留学日记和经验库，返回最相关的日记条目。可以用于查找特定城市、特定话题（租房、社交、医疗等）的真实留学经验。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词，如'伦敦租房'、'社交困难'、'看病'等",
        },
        city: {
          type: "string",
          description: "按城市名筛选，可选",
        },
        max_results: {
          type: "integer",
          description: "最大返回条数，默认5",
        },
      },
      required: ["query"],
    },
  },
};

export interface SearchDiariesResult {
  total: number;
  results: {
    title: string;
    city: string;
    school?: string;
    lifeType: string;
    stage: string;
    rating: number;
    snippet: string;
    authorName: string;
    timestamp: number;
  }[];
}

export function executeSearchDiaries(
  args: Record<string, unknown>,
  context: AgentContext
): SearchDiariesResult {
  const query = String(args.query ?? "");
  const city = args.city ? String(args.city) : undefined;
  const maxResults = typeof args.max_results === "number" ? args.max_results : 5;

  const allDiaries: DiaryEntry[] = context.diaries ?? [];

  let results = searchDiaries(allDiaries, query);
  if (city) {
    results = results.filter((d) =>
      d.city.toLowerCase().includes(city.toLowerCase())
    );
  }

  const ranked = rankDiariesByRelevance(results, query);
  const top = ranked.slice(0, maxResults);

  return {
    total: ranked.length,
    results: top.map((r) => ({
      title: r.diary.title,
      city: r.diary.city,
      school: r.diary.school,
      lifeType: r.diary.lifeType,
      stage: r.diary.stage,
      rating: r.diary.rating,
      snippet: r.diary.content.slice(0, 200),
      authorName: r.diary.authorName,
      timestamp: r.diary.timestamp,
    })),
  };
}
