import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { simulatePrompt } from "@/lib/ai/prompts";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario, targetCountry, apiKey, apiBaseUrl, provider } = body;
    const countryName: string = COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";

    const prompt = simulatePrompt(scenario ?? "跨文化对话", countryName);
    const dialogue = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 1000, apiKey, apiBaseUrl, provider },
    );
    return NextResponse.json({ dialogue });
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
    console.error("AI Simulate error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}
