import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { chatSystemPrompt } from "@/lib/ai/prompts";
import { getAvailableProviders } from "@/lib/ai/providers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context, apiKey, apiBaseUrl, provider } = body;
    const messages = [
      { role: "system", content: chatSystemPrompt(context || {}) },
      { role: "user", content: question },
    ];

    const answer = await callAI(messages, { maxTokens: 1000, apiKey, apiBaseUrl, provider });
    return NextResponse.json({ answer });
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
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}
