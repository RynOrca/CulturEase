import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";
import { searchDiaries } from "@/lib/search";
import { MOCK_DIARIES } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, targetCity, targetCountry, stage, sourceCountry, apiKey, apiBaseUrl, provider } = body;

    const countryName: string = COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";
    const contextCity = targetCity || "";

    // Build a context-aware search prompt
    const systemPrompt = `You are a helpful study abroad assistant. The user is a Chinese student going to ${countryName} (${contextCity}). Answer their question naturally in Chinese.

Rules:
- If they search for a city name, give an overview of student life there
- If they search for a topic like "美食" or "food", relate it to their destination city (${contextCity})
- If they search for "巴士" or "交通" or "transport", give practical transit advice for ${contextCity}
- If they ask a general question, answer it conversationally
- No markdown formatting, no bullet points — write naturally like a friend
- Keep it under 300 words
- Use occasional emoji or (^_^) but don't overdo it

Context: student from ${sourceCountry || "China"}, current stage: ${stage || "preparing"}`;

    // Search local diaries for matching content
    const allDiaries = [...MOCK_DIARIES];
    const localDiaries = searchDiaries(allDiaries, query)
      .filter((d) => d.city.toLowerCase() === contextCity.toLowerCase())
      .slice(0, 5);

    // Also include city-level diaries if no specific match
    const cityDiaries = localDiaries.length > 0
      ? localDiaries
      : allDiaries.filter((d) => d.city.toLowerCase() === contextCity.toLowerCase()).slice(0, 5);

    // Get AI summary
    const userMessage = query
      ? `关于"${query}"，给一些实用的建议和经验分享。`
      : `介绍一下${contextCity}的留学生活。`;

    const answer = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 600, temperature: 0.7, apiKey, apiBaseUrl, provider },
    );

    return NextResponse.json({
      summary: answer,
      diaries: cityDiaries,
    });
  } catch (error) {
    if (error instanceof ApiKeyMissing) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          summary: "AI 服务未配置。请在设置中配置 API Key 后使用搜索功能。",
          diaries: [],
          providers: getAvailableProviders(),
        },
        { status: 503 },
      );
    }
    console.error("AI Search error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", summary: null, diaries: [] },
      { status: 500 },
    );
  }
}
