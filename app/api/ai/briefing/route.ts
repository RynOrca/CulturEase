import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { briefingSystemPrompt } from "@/lib/ai/prompts";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceCountry, targetCountry, targetCity, stage, diaryCount, kitProgress, apiKey, apiBaseUrl, provider } = body;

    const targetCountryName: string =
      COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "";
    const sourceName: string =
      COUNTRY_NAMES[sourceCountry as string] ?? sourceCountry ?? "中国";

    const systemPrompt = briefingSystemPrompt({
      sourceCountry: sourceName,
      targetCountryName,
      targetCity: targetCity ?? "",
      stage: stage ?? "pre-departure",
      diaryCount: diaryCount ?? 0,
      kitProgress: kitProgress ?? 0,
    });

    const briefing = await callAI(
      [{ role: "system", content: systemPrompt }, { role: "user", content: "请生成今日简报。" }],
      { temperature: 0.7, maxTokens: 500, apiKey, apiBaseUrl, provider },
    );

    return NextResponse.json({ briefing });
  } catch (error) {
    if (error instanceof ApiKeyMissing) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "AI 服务未配置。",
          providers: getAvailableProviders(),
        },
        { status: 503 },
      );
    }
    console.error("Briefing API error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
