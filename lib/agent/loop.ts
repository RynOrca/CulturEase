import { AgentEvent, AgentContext, ToolDefinition, ChatMessage } from "./types";
import { streamAIWithTools, StreamWithToolsResult, AIProvider } from "@/lib/ai/providers";
import { executeTool } from "./tools";

export interface RunAgentLoopOptions {
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
 * Core agent loop implementing think → act → observe.
 *
 * Each iteration:
 * 1. Stream an AI completion with tool definitions
 * 2. If the AI returns text, emit text_delta events and finish
 * 3. If the AI returns tool_calls, execute them and feed results back
 * 4. Repeat until the AI responds directly or maxSteps is reached
 */
export async function* runAgentLoop(
  options: RunAgentLoopOptions
): AsyncGenerator<AgentEvent> {
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

  // Inject API options into context for sub-agent delegation
  const enrichedContext: AgentContext = {
    ...context,
    apiOptions: { apiKey, apiBaseUrl, provider },
  };

  // Build initial messages: system prompt + conversation history
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...inputMessages,
  ];

  let finalTextContent: string | null = null;

  for (let step = 0; step < maxSteps; step++) {
    yield { type: "thinking", step: step + 1 };

    // Collect all events from the stream for this turn
    const streamEvents: (
      | { type: "text_delta"; content: string }
      | { type: "done"; result: StreamWithToolsResult }
    )[] = [];

    for await (const event of streamAIWithTools(messages, tools, {
      apiKey,
      apiBaseUrl,
      provider: provider as AIProvider | undefined,
      temperature,
      maxTokens,
    })) {
      streamEvents.push(event);
      // Don't yield text_delta yet — model may be "thinking" before a tool call.
      // Only yield text when the final response has no tool calls (i.e. real answer).
    }

    // Find the done event
    const doneEvent = streamEvents.find(
      (e): e is { type: "done"; result: StreamWithToolsResult } =>
        e.type === "done"
    );
    if (!doneEvent) break;

    const { textContent, toolCalls } = doneEvent.result;

    if (toolCalls.length === 0) {
      // No tool calls — this is the final answer, emit collected text
      for (const ev of streamEvents) {
        if (ev.type === "text_delta") {
          yield ev;
        }
      }
      finalTextContent = textContent;
      yield { type: "done", finalContent: finalTextContent };
      return;
    }

    // Build assistant message with tool calls
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: textContent,
      tool_calls: toolCalls,
    };
    messages.push(assistantMsg);

    // Execute each tool and feed results back
    for (const tc of toolCalls) {
      yield { type: "tool_exec", tool: tc.name, input: tc.arguments };

      let result: unknown;
      try {
        result = await executeTool(tc.name, tc.arguments, enrichedContext);
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : "Tool execution failed",
        };
      }

      yield { type: "tool_result", tool: tc.name, result };

      messages.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: tc.id,
      });
    }

    // Loop continues — AI will see tool results and decide next step
  }

  // Exceeded max steps — return whatever we have
  yield { type: "done", finalContent: finalTextContent };
}
