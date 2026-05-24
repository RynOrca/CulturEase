import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/agent/loop";
import { SIMULATOR_AGENT } from "@/lib/agent/agents/simulator";
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
    scenario,
    targetCountry,
    targetCity,
    sourceCountry,
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

  // Enrich context with scenario info if provided
  const enrichedContext = {
    ...context,
    profile: {
      ...(context.profile ?? {}),
      targetCountry: targetCountry ?? context.profile?.targetCountry ?? "GB",
      targetCity: targetCity ?? context.profile?.targetCity ?? "",
      sourceCountry: sourceCountry ?? context.profile?.sourceCountry ?? "CN",
    },
  };

  const chatMessages: ChatMessage[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    })
  );

  // If first message, prepend the scenario start instruction
  const isFirstMessage = chatMessages.length === 0;
  if (isFirstMessage && scenario) {
    chatMessages.push({
      role: "user",
      content: `请开始"${scenario}"场景练习。先给出【场景背景】，然后以当地人的身份开始对话。`,
    });
  }

  const systemPrompt = SIMULATOR_AGENT.buildSystemPrompt(enrichedContext);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        for await (const event of runAgentLoop({
          systemPrompt,
          tools: SIMULATOR_AGENT.tools,
          messages: chatMessages,
          context: enrichedContext,
          apiKey,
          apiBaseUrl,
          provider: provider ?? "deepseek",
          maxSteps: 3,
          temperature: SIMULATOR_AGENT.temperature,
          maxTokens: SIMULATOR_AGENT.maxTokens,
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
