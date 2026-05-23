import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { survivalKitSystemPrompt } from "@/lib/ai/prompts";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceCountry, targetCountry, targetCity, stage, apiKey, apiBaseUrl, provider } = body;

    const targetCountryName: string =
      COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";
    const sourceName: string =
      COUNTRY_NAMES[sourceCountry as string] ?? sourceCountry ?? "中国";

    const systemPrompt = survivalKitSystemPrompt({
      sourceCountry: sourceName,
      targetCountryName,
      targetCity: targetCity ?? "",
      stage: stage ?? "pre-departure",
    });

    const answer = await callAI(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `请为我生成一份从${sourceName}到${targetCountryName}（${targetCity}）的个性化生存工具包。我当前的阶段是：${stage || "准备中"}。`,
        },
      ],
      { maxTokens: 2500, temperature: 0.7, apiKey, apiBaseUrl, provider },
    );

    let kit;
    try {
      kit = JSON.parse(answer);
    } catch {
      return NextResponse.json({ kit: null, raw: answer });
    }

    return NextResponse.json({ kit });
  } catch (error) {
    if (error instanceof ApiKeyMissing) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: `AI 服务未配置（${error.provider}）。请在页面中配置 API Key。`,
          providers: getAvailableProviders(),
        },
        { status: 503 },
      );
    }
    console.error("Survival Kit API error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
