import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/agent/loop";
import { ANALYST_AGENT } from "@/lib/agent/agents/analyst";
import { ApiKeyMissing, ApiError, getAvailableProviders } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    messages = [],
    context = {},
    apiKey,
    apiBaseUrl,
    provider,
  } = body;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "API_KEY_MISSING",
        message: "Agent 功能需要配置 API Key。请在设置中配置 DeepSeek API Key。",
        providers: getAvailableProviders(),
      },
      { status: 503 }
    );
  }

  const chatMessages: ChatMessage[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    })
  );

  // If no messages, add a default analysis trigger
  if (chatMessages.length === 0) {
    chatMessages.push({
      role: "user",
      content: "请分析我的留学日记，给出文化冲击评估报告。先用工具收集数据，然后输出分析结果。",
    });
  }

  const systemPrompt = ANALYST_AGENT.buildSystemPrompt(context);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        for await (const event of runAgentLoop({
          systemPrompt,
          tools: ANALYST_AGENT.tools,
          messages: chatMessages,
          context,
          apiKey,
          apiBaseUrl,
          provider: provider ?? "deepseek",
          maxSteps: 5,
          temperature: ANALYST_AGENT.temperature,
          maxTokens: ANALYST_AGENT.maxTokens,
        })) {
          send(event);
        }
      } catch (err) {
        if (err instanceof ApiKeyMissing) {
          send({
            type: "error",
            message: "API Key 未配置。请在设置中配置 DeepSeek API Key。",
          });
        } else if (err instanceof ApiError) {
          send({
            type: "error",
            message: `AI 服务错误 (${err.provider} ${err.status})，请稍后重试。`,
          });
        } else {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Agent 服务异常",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
