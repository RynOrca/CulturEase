import { NextRequest, NextResponse } from "next/server";

interface ExternalResult {
  title: string;
  snippet: string;
  url: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
}

// In-memory cache: 30 min TTL
const cache = new Map<string, { data: ExternalResult[]; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

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

// ─── B站 (Bilibili) — 公开 API ──────────────────────────────────────

async function searchBilibili(query: string): Promise<ExternalResult[]> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CulturEase/1.0 (study-abroad platform; contact@example.com)",
        Referer: "https://www.bilibili.com",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.result ?? [];
    return items.slice(0, 6).map((item: any) => ({
      title: item.title?.replace(/<[^>]*>/g, "") ?? "",
      snippet: item.description?.replace(/<[^>]*>/g, "")?.slice(0, 120) ?? "",
      url: `https://www.bilibili.com/video/${item.bvid ?? item.aid}`,
      platform: "bilibili",
      platformLabel: "B站",
      platformColor: "#FB7299",
    }));
  } catch {
    return [];
  }
}

// ─── 知乎 — 内部搜索 API ────────────────────────────────────────────

async function searchZhihu(query: string): Promise<ExternalResult[]> {
  try {
    const url = `https://www.zhihu.com/api/v4/search_v3?q=${encodeURIComponent(query)}&type=content&t=general&limit=6`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CulturEase/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data ?? [];
    return items.slice(0, 6).map((item: any) => {
      const obj = item.object ?? item.target ?? item;
      return {
        title: (obj.title ?? obj.excerpt_title ?? "").replace(/<[^>]*>/g, ""),
        snippet: (obj.excerpt ?? obj.content ?? "").replace(/<[^>]*>/g, "").slice(0, 150),
        url: obj.url ?? `https://www.zhihu.com/question/${obj.id}`,
        platform: "zhihu",
        platformLabel: "知乎",
        platformColor: "#0066FF",
      };
    });
  } catch {
    return [];
  }
}

// ─── 小红书 — HTML 抓取（有限支持）─────────────────────────────────

async function searchXiaohongshu(query: string): Promise<ExternalResult[]> {
  try {
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const html = await res.text();

    // Extract __INITIAL_STATE__ JSON from HTML
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/);
    if (!stateMatch) return [];

    // Replace undefined values (not valid JSON) with null before parsing
    const cleaned = stateMatch[1].replace(/undefined/g, "null");
    const state = JSON.parse(cleaned);

    const notes = state?.search?.notes?.items ?? [];
    return notes.slice(0, 6).map((item: any) => ({
      title: item.noteCard?.displayTitle ?? item.title ?? "",
      snippet: (item.noteCard?.desc ?? "").slice(0, 150),
      url: `https://www.xiaohongshu.com/explore/${item.noteId ?? item.id}`,
      platform: "xiaohongshu",
      platformLabel: "小红书",
      platformColor: "#FE2C55",
    }));
  } catch {
    return [];
  }
}

// ─── 主入口 ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, targetCity } = body;
    const q = `${targetCity || ""} ${query || ""}`.trim();
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const key = cacheKey(q, targetCity || "");
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ results: cached });
    }

    // Run all platform searches in parallel
    const [bilibili, zhihu, xiaohongshu] = await Promise.all([
      searchBilibili(q).catch(() => []),
      searchZhihu(q).catch(() => []),
      searchXiaohongshu(q).catch(() => []),
    ]);

    // Interleave results for diversity
    const all: ExternalResult[] = [];
    const maxLen = Math.max(bilibili.length, zhihu.length, xiaohongshu.length);
    for (let i = 0; i < maxLen; i++) {
      if (bilibili[i]) all.push(bilibili[i]);
      if (zhihu[i]) all.push(zhihu[i]);
      if (xiaohongshu[i]) all.push(xiaohongshu[i]);
    }

    const results = all.slice(0, 12);
    setCache(key, results);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("External search error:", error);
    return NextResponse.json({ results: [], error: "EXTERNAL_SEARCH_ERROR" });
  }
}
