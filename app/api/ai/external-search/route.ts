import { NextRequest, NextResponse } from "next/server";

interface ExternalResult {
  title: string;
  snippet: string;
  url: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
}

const SEARCH_TAGS = ["留学", "文化冲击", "culture shock", "留学生活"];

function deepLinks(query: string, targetCity: string): ExternalResult[] {
  const q = encodeURIComponent(`${targetCity} ${query} ${SEARCH_TAGS.join(" ")}`.trim());

  return [
    {
      title: `在B站搜索"${targetCity} ${query}"`,
      snippet: `B站有大量留学生vlog、攻略视频和${targetCity}生活记录`,
      url: `https://search.bilibili.com/all?keyword=${q}`,
      platform: "bilibili",
      platformLabel: "B站",
      platformColor: "#FB7299",
    },
    {
      title: `在知乎搜索"${targetCity} ${query}"`,
      snippet: `知乎上有留学生分享的${targetCity}生活经验和深度攻略`,
      url: `https://www.zhihu.com/search?type=content&q=${q}`,
      platform: "zhihu",
      platformLabel: "知乎",
      platformColor: "#0066FF",
    },
    {
      title: `在小红书搜索"${targetCity} ${query}"`,
      snippet: `小红书有最新的${targetCity}留学生活笔记、探店和避雷帖`,
      url: `https://www.xiaohongshu.com/search_result?keyword=${q}&source=web_search_result_notes`,
      platform: "xiaohongshu",
      platformLabel: "小红书",
      platformColor: "#FE2C55",
    },
    {
      title: `在YouTube搜索"${targetCity} ${query} study abroad"`,
      snippet: `YouTube有国际视角的${targetCity}留学体验、校园tour和英文生活指南`,
      url: `https://www.youtube.com/results?search_query=${q}+study+abroad`,
      platform: "youtube",
      platformLabel: "YouTube",
      platformColor: "#FF0000",
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, targetCity } = body;
    const q = `${targetCity || ""} ${query || ""}`.trim();
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const results = deepLinks(query, targetCity || "");
    return NextResponse.json({ results });
  } catch (error) {
    console.error("External search error:", error);
    return NextResponse.json({ results: [] });
  }
}
