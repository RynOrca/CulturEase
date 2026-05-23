import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/ai/providers";
import type { AIProvider, AICallOptions } from "@/lib/ai/providers";

const TEST_MODELS: Record<string, string> = {
  deepseek: "deepseek-chat",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
};

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, apiBaseUrl } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { valid: false, message: "请提供 API Key 和 Provider" },
        { status: 400 },
      );
    }

    const p = provider as AIProvider;
    const baseUrl = (apiBaseUrl || DEFAULT_BASE_URLS[p]).replace(/\/+$/, "");
    const model = TEST_MODELS[p];

    if (!model) {
      return NextResponse.json(
        { valid: false, message: `不支持的 Provider: ${provider}` },
        { status: 400 },
      );
    }

    // Try a simple API call to validate
    try {
      if (p === "anthropic") {
        const res = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: "user", content: "ping" }],
          }),
        });

        if (res.status === 200) {
          return NextResponse.json({ valid: true, message: "连接成功！" });
        }

        const body = await res.text();
        const detail = extractErrorMessage(body);
        return NextResponse.json({
          valid: false,
          message: `连接失败: ${detail}`,
        });
      } else {
        // OpenAI-compatible (DeepSeek, OpenAI, etc.)
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 10,
          }),
        });

        if (res.status === 200) {
          return NextResponse.json({ valid: true, message: "连接成功！" });
        }

        const body = await res.text();
        const detail = extractErrorMessage(body);
        return NextResponse.json({
          valid: false,
          message: `连接失败: ${detail}`,
        });
      }
    } catch (err) {
      return NextResponse.json({
        valid: false,
        message: `网络错误: ${err instanceof Error ? err.message : "无法连接到服务器"}`,
      });
    }
  } catch (error) {
    console.error("Validate key error:", error);
    return NextResponse.json(
      { valid: false, message: "请求处理失败" },
      { status: 500 },
    );
  }
}

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message || parsed.error?.code || body.slice(0, 100);
  } catch {
    return body.slice(0, 100);
  }
}
