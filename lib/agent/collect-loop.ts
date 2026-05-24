import type { AgentEvent, AgentContext, ToolDefinition, ChatMessage, AgentLoopOutput } from "./types";
import { streamAIWithTools, StreamWithToolsResult, AIProvider } from "@/lib/ai/providers";
import { executeTool } from "./tools";

export interface CollectAgentLoopOptions {
  systemPrompt: string;
  tools: ToolDefinition[];
  messages: ChatMessage[];
  context: AgentContext;
  apiKey: string;
  apiBaseUrl?: string;
  provider?: string;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Non-streaming version of runAgentLoop.
 * Collects all tool calls and results, returns only the final output.
 * Used for sub-agent delegation where we don't want to stream internals to the client.
 */
export async function collectAgentLoop(
  options: CollectAgentLoopOptions
): Promise<AgentLoopOutput> {
  const {
    systemPrompt,
    tools,
    messages: inputMessages,
    context,
    apiKey,
    apiBaseUrl,
    provider,
    maxSteps = 5,
    temperature,
    maxTokens,
  } = options;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...inputMessages,
  ];

  const allToolCalls: AgentLoopOutput["toolCalls"] = [];
  let finalContent: string | null = null;

  for (let step = 0; step < maxSteps; step++) {
    // Collect all streaming events
    let result: StreamWithToolsResult | null = null;

    for await (const event of streamAIWithTools(messages, tools, {
      apiKey,
      apiBaseUrl,
      provider: provider as AIProvider | undefined,
      temperature,
      maxTokens,
    })) {
      if (event.type === "done") {
        result = event.result;
      }
    }

    if (!result) break;

    const { textContent, toolCalls } = result;

    if (toolCalls.length === 0) {
      finalContent = textContent;
      break;
    }

    // Build assistant message with tool calls
    messages.push({
      role: "assistant",
      content: textContent,
      tool_calls: toolCalls,
    });

    // Execute each tool
    for (const tc of toolCalls) {
      let toolResult: unknown;
      try {
        toolResult = executeTool(tc.name, tc.arguments, context);
      } catch (err) {
        toolResult = {
          error: err instanceof Error ? err.message : "Tool execution failed",
        };
      }

      allToolCalls.push({
        name: tc.name,
        input: tc.arguments,
        result: toolResult,
      });

      messages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        tool_call_id: tc.id,
      });
    }
  }

  return {
    finalContent,
    toolCalls: allToolCalls,
    stepCount: allToolCalls.length,
  };
}
