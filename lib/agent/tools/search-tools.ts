import { ToolDefinition, AgentContext } from "@/lib/agent/types";

export const GENERATE_EXTERNAL_LINKS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "generate_external_links",
    description:
      "生成外部平台的搜索链接，包括B站（Bilibili）、知乎、小红书、YouTube。帮助用户找到相关的留学生vlog、攻略、深度讨论和生活笔记。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索主题，如'租房攻略'、'兼职经验'、'校园生活'等",
        },
        city: {
          type: "string",
          description: "目标城市",
        },
      },
      required: ["query", "city"],
    },
  },
};

export interface ExternalLinkResult {
  links: {
    title: string;
    snippet: string;
    url: string;
    platform: string;
    platformLabel: string;
    platformColor: string;
  }[];
}

export function executeGenerateExternalLinks(
  args: Record<string, unknown>,
  _context: AgentContext
): ExternalLinkResult {
  const query = String(args.query ?? "");
  const city = String(args.city ?? "");
  const q = encodeURIComponent(`${city} ${query}`.trim());

  return {
    links: [
      {
        title: `在B站搜索"${city} ${query}"`,
        snippet: `B站有大量留学生vlog、攻略视频和${city}生活记录`,
        url: `https://search.bilibili.com/all?keyword=${q}`,
        platform: "bilibili",
        platformLabel: "B站",
        platformColor: "#FB7299",
      },
      {
        title: `在知乎搜索"${city} ${query}"`,
        snippet: `知乎上有留学生分享的${city}生活经验和深度攻略`,
        url: `https://www.zhihu.com/search?type=content&q=${q}`,
        platform: "zhihu",
        platformLabel: "知乎",
        platformColor: "#0066FF",
      },
      {
        title: `在小红书搜索"${city} ${query}"`,
        snippet: `小红书有最新的${city}留学生活笔记、探店和避雷帖`,
        url: `https://www.xiaohongshu.com/search_result?keyword=${q}&source=web_search_result_notes`,
        platform: "xiaohongshu",
        platformLabel: "小红书",
        platformColor: "#FE2C55",
      },
      {
        title: `在YouTube搜索"${city} ${query} study abroad"`,
        snippet: `YouTube有国际视角的${city}留学体验、校园tour和英文生活指南`,
        url: `https://www.youtube.com/results?search_query=${q}+study+abroad`,
        platform: "youtube",
        platformLabel: "YouTube",
        platformColor: "#FF0000",
      },
    ],
  };
}
