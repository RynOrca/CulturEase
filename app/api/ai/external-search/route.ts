import { NextRequest, NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/ai/providers";

interface ExternalResult {
  title: string;
  snippet: string;
  url: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
  /** Plan A = deep link, Plan B = scraped result */
  plan: "A" | "B";
}

// In-memory cache: 30 min TTL
const cache = new Map<string, { data: ExternalResult[]; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function cacheKey(query: string, targetCity: string): string {
  return `${query}::${targetCity}`;
}

function getCached(key: string): ExternalResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ExternalResult[]): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// ─── B站 (Bilibili) — Plan B: 公开 API ──────────────────────────────

async function searchBilibili(query: string): Promise<ExternalResult[]> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CulturEase/1.0 (study-abroad platform)",
        Referer: "https://www.bilibili.com",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.result ?? [];
    return items.slice(0, 20).map((item: any) => ({
      title: item.title?.replace(/<[^>]*>/g, "") ?? "",
      snippet: item.description?.replace(/<[^>]*>/g, "")?.slice(0, 120) ?? "",
      url: `https://www.bilibili.com/video/${item.bvid ?? item.aid}`,
      platform: "bilibili",
      platformLabel: "B站",
      platformColor: "#FB7299",
      plan: "B" as const,
    }));
  } catch {
    return [];
  }
}

// ─── AI 审查过滤 ─────────────────────────────────────────────────────

async function aiFilterResults(
  results: ExternalResult[],
  query: string,
  targetCity: string,
  apiKey?: string,
  apiBaseUrl?: string,
  provider?: string,
): Promise<ExternalResult[]> {
  if (results.length === 0) return [];
  if (!apiKey) {
    // Without AI, just take top 5 and hope for the best
    return results.slice(0, 5);
  }

  try {
    const resultsJson = results.map((r, i) => ({
      index: i,
      title: r.title,
      snippet: r.snippet,
    }));

    const prompt = `用户搜索"${query}"（目标城市：${targetCity}），想了解留学生活、文化、实用信息。

以下是B站搜索的原始结果。请审查并过滤：

1. 删除与留学、当地生活、文化体验完全无关的内容（如纯娱乐明星MV、游戏、与目标城市无关的八卦等）
2. 如果多个结果内容高度相似（如同一主题的多个视频），只保留最相关的一个
3. 优先保留：留学攻略、租房经验、生活vlog、景点推荐、美食探店、语言学习、文化差异等实用内容

返回纯JSON数组（只包含该保留的结果的index）：
例如: [0, 2, 5, 7]

原始结果：
${JSON.stringify(resultsJson, null, 2)}`;

    const answer = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 200, temperature: 0.3, apiKey, apiBaseUrl, provider: provider as AIProvider | undefined },
    );

    // Parse the AI response to get indices
    const jsonMatch = answer.match(/\[[\d,\s]*\]/);
    if (jsonMatch) {
      const indices: number[] = JSON.parse(jsonMatch[0]);
      return indices
        .filter((i) => i >= 0 && i < results.length)
        .map((i) => results[i]);
    }

    // Fallback: just take first 5
    return results.slice(0, 5);
  } catch {
    return results.slice(0, 5);
  }
}

// ─── Plan A: 深度链接卡片 ───────────────────────────────────────────

function deepLinkCards(query: string, targetCity: string): ExternalResult[] {
  const q = encodeURIComponent(`${targetCity} ${query}`.trim());
  return [
    {
      title: `在知乎搜索"${targetCity} ${query}"`,
      snippet: `知乎上有大量留学生分享的${targetCity}生活经验和攻略`,
      url: `https://www.zhihu.com/search?type=content&q=${q}`,
      platform: "zhihu",
      platformLabel: "知乎",
      platformColor: "#0066FF",
      plan: "A" as const,
    },
    {
      title: `在小红书搜索"${targetCity} ${query}"`,
      snippet: `小红书有最新的${targetCity}留学生活笔记、探店和避雷帖`,
      url: `https://www.xiaohongshu.com/search_result?keyword=${q}&source=web_search_result_notes`,
      platform: "xiaohongshu",
      platformLabel: "小红书",
      platformColor: "#FE2C55",
      plan: "A" as const,
    },
  ];
}

// ─── 主入口 ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, targetCity, apiKey, apiBaseUrl, provider } = body;
    const q = `${targetCity || ""} ${query || ""}`.trim();
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const key = cacheKey(q, targetCity || "");
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ results: cached });
    }

    // Plan B: Scrape B站
    const rawBilibili = await searchBilibili(q).catch(() => []);

    // AI filter B站 results
    const filteredBilibili = await aiFilterResults(rawBilibili, query, targetCity, apiKey, apiBaseUrl, provider);

    // Plan A: Deep links for 知乎 & 小红书
    const deepLinks = deepLinkCards(query, targetCity);

    // Combine: filtered B站 first, then deep links
    const results = [...filteredBilibili, ...deepLinks];

    setCache(key, results);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("External search error:", error);
    return NextResponse.json({ results: [], error: "EXTERNAL_SEARCH_ERROR" });
  }
}
