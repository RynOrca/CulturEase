import { ToolDefinition, AgentContext } from "@/lib/agent/types";
import { CITY_DATA } from "@/lib/data";

export const GET_CITY_INFO_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_city_info",
    description:
      "获取指定城市的文化适应信息和文化冲击评分。返回房租压力、社交融入难度、语言障碍、生活便利度、安全指数、性价比等六个维度的评分，以及该城市的日记数量。",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "城市名称，如'伦敦'、'London'、'纽约'、'New York'等",
        },
      },
      required: ["city"],
    },
  },
};

export interface CityInfoResult {
  found: boolean;
  city?: string;
  country?: string;
  scores?: Record<string, number>;
  scoreInterpretation?: Record<string, string>;
  diaryCount?: number;
  message?: string;
}

export function executeGetCityInfo(
  args: Record<string, unknown>,
  _context: AgentContext
): CityInfoResult {
  const city = String(args.city ?? "");
  if (!city) return { found: false, message: "请提供城市名称" };

  // Try exact match first, then case-insensitive
  let cityData = CITY_DATA[city];
  if (!cityData) {
    const lower = city.toLowerCase();
    const key = Object.keys(CITY_DATA).find(
      (k) => k.toLowerCase() === lower
    );
    if (key) cityData = CITY_DATA[key];
  }

  if (!cityData) {
    return {
      found: false,
      message: `未找到城市"${city}"的数据。可用的城市包括：${Object.keys(CITY_DATA).slice(0, 10).join("、")}等`,
    };
  }

  const s = cityData.scores;
  return {
    found: true,
    city: cityData.name,
    country: cityData.country,
    scores: { ...s },
    scoreInterpretation: {
      housing: s.housing > 70 ? "房租压力较大" : s.housing > 40 ? "房租适中" : "房租相对便宜",
      social: s.social > 70 ? "社交融入较难" : s.social > 40 ? "社交难度适中" : "社交相对容易",
      language: s.language > 70 ? "语言障碍较大" : s.language > 40 ? "语言障碍适中" : "语言障碍较小",
      convenience: s.convenience > 70 ? "生活便利度高" : s.convenience > 40 ? "便利度适中" : "便利度有待提升",
      safety: s.safety > 70 ? "安全指数高" : s.safety > 40 ? "安全指数适中" : "需注意安全",
      value: s.value > 70 ? "性价比较高" : s.value > 40 ? "性价比适中" : "生活成本较高",
    },
    diaryCount: cityData.diaryCount,
  };
}
