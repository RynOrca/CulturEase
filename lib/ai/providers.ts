import { ToolDefinition, ToolCall, ChatMessage } from "@/lib/agent/types";

export type AIProvider = "deepseek" | "openai" | "anthropic";

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  /** Runtime API key (from localStorage/web UI) — overrides env var */
  apiKey?: string;
  /** Custom base URL for the API endpoint — overrides default */
  apiBaseUrl?: string;
  /** Model override (for tool-use calls) */
  model?: string;
}

export interface StreamWithToolsResult {
  textContent: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

/** Default API base URLs per provider */
const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
};

/** Get the configured default provider, defaulting to deepseek */
function getDefaultProvider(): AIProvider {
  const fromEnv = process.env.AI_DEFAULT_PROVIDER;
  if (fromEnv === "openai" || fromEnv === "anthropic") return fromEnv;
  return "deepseek";
}

/** Get API key for the given provider — env var fallback */
function getKeyForProvider(provider: AIProvider): string | undefined {
  switch (provider) {
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
  }
}

/** Human-readable provider label */
function providerLabel(provider: AIProvider): string {
  switch (provider) {
    case "deepseek":
      return "DeepSeek";
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
  }
}

/**
 * Check which providers have API keys configured.
 * Useful for the frontend status indicator.
 */
export function getAvailableProviders(): { provider: AIProvider; configured: boolean }[] {
  const providers: AIProvider[] = ["deepseek", "openai", "anthropic"];
  return providers.map((p) => ({
    provider: p,
    configured: !!getKeyForProvider(p),
  }));
}

/**
 * Unified AI call. Supports DeepSeek, OpenAI, and Anthropic.
 *
 * - DeepSeek: uses deepseek-chat model (V4 Flash)
 * - OpenAI: uses gpt-4o-mini
 * - Anthropic: uses claude-sonnet-4-6
 *
 * When `apiKey` and/or `apiBaseUrl` are provided in options,
 * they override environment variables for that call.
 */
export async function callAI(
  messages: { role: string; content: string }[],
  options: AICallOptions = {},
): Promise<string> {
  const provider = options.provider ?? getDefaultProvider();
  // Runtime key overrides env var
  const apiKey = options.apiKey ?? getKeyForProvider(provider);
  // Runtime base URL overrides default
  const apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_BASE_URLS[provider]).replace(/\/+$/, "");

  if (!apiKey) {
    throw new ApiKeyMissing(provider);
  }

  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2000;

  switch (provider) {
    case "deepseek":
      return callDeepSeek(messages, apiKey, apiBaseUrl, temperature, maxTokens);
    case "openai":
      return callOpenAI(messages, apiKey, apiBaseUrl, temperature, maxTokens);
    case "anthropic":
      return callAnthropic(messages, apiKey, apiBaseUrl, temperature, maxTokens);
  }
}

// ─── DeepSeek (OpenAI-compatible) ────────────────────────────────────

async function callDeepSeek(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseUrl: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: messages.map((m) => ({
        role: (m.role as string) === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError("DeepSeek", res.status, body);
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new ApiError("DeepSeek", 0, "Empty response from API");
  return answer;
}

// ─── OpenAI ──────────────────────────────────────────────────────────

async function callOpenAI(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseUrl: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages.map((m) => ({
        role: (m.role as string) === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError("OpenAI", res.status, body);
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new ApiError("OpenAI", 0, "Empty response from API");
  return answer;
}

// ─── Anthropic ──────────────────────────────────────────────────────

async function callAnthropic(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseUrl: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  // Anthropic uses a separate "system" field (not in messages array)
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = systemMsg
    ? messages.filter((m) => m.role !== "system")
    : messages;

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemMsg?.content,
      messages: chatMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError("Anthropic", res.status, body);
  }

  const data = await res.json();
  const answer = data.content
    ?.filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n");
  if (!answer) throw new ApiError("Anthropic", 0, "Empty response from API");
  return answer;
}

// ─── Tool-use + Streaming (OpenAI-compatible) ────────────────────────

/**
 * Stream an AI chat completion with tool use support.
 * Yields text_delta events for real-time display, and a final done event
 * with accumulated text content and any tool_calls.
 *
 * Currently supports DeepSeek and OpenAI (both use /v1/chat/completions
 * with tools + stream: true). Anthropic uses a different streaming format
 * and is not supported in this function.
 */
export async function* streamAIWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  options: AICallOptions = {},
): AsyncGenerator<
  | { type: "text_delta"; content: string }
  | { type: "done"; result: StreamWithToolsResult }
> {
  const provider = options.provider ?? getDefaultProvider();
  const apiKey = options.apiKey ?? getKeyForProvider(provider);
  const apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_BASE_URLS[provider]).replace(/\/+$/, "");

  if (!apiKey) {
    throw new ApiKeyMissing(provider);
  }

  if (provider === "anthropic") {
    throw new ApiError("Anthropic", 0, "streamAIWithTools does not support Anthropic. Use DeepSeek or OpenAI for tool-use features.");
  }

  const model = options.model ?? (provider === "openai" ? "gpt-4o-mini" : "deepseek-chat");
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2000;

  // Convert ChatMessage[] to API-compatible format
  const apiMessages = messages.map((m) => {
    const msg: Record<string, unknown> = {
      role: (m.role as string) === "ai" ? "assistant" : m.role,
    };

    if (m.role === "tool") {
      msg.tool_call_id = m.tool_call_id;
      msg.content = m.content ?? "";
    } else if (m.tool_calls && m.tool_calls.length > 0) {
      msg.content = m.content;
      msg.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));
    } else {
      msg.content = m.content ?? "";
    }

    return msg;
  });

  const res = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      stream_options: { include_usage: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(provider, res.status, body);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Track accumulated state
  let textContent = "";
  const toolCallsAcc: Map<number, { id: string; name: string; args: string }> = new Map();
  let finishReason = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          if (!delta) continue;

          // Text content delta
          if (delta.content) {
            textContent += delta.content;
            yield { type: "text_delta", content: delta.content };
          }

          // Tool call deltas
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = toolCallsAcc.get(idx) || { id: "", name: "", args: "" };

              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;

              toolCallsAcc.set(idx, existing);
            }
          }

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Build final ToolCall array from accumulated deltas
  const toolCalls: ToolCall[] = [];
  for (const [, tc] of toolCallsAcc) {
    if (tc.name) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.name,
          arguments: tc.args ? JSON.parse(tc.args) : {},
        });
      } catch {
        toolCalls.push({
          id: tc.id,
          name: tc.name,
          arguments: { _raw: tc.args },
        });
      }
    }
  }

  yield {
    type: "done",
    result: {
      textContent: textContent || null,
      toolCalls,
      finishReason,
    },
  };
}

/**
 * Non-streaming AI call with tool use support.
 * Returns the text content and any tool_calls in a single response.
 */
export async function callAIWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  options: AICallOptions = {},
): Promise<StreamWithToolsResult> {
  const provider = options.provider ?? getDefaultProvider();
  const apiKey = options.apiKey ?? getKeyForProvider(provider);
  const apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_BASE_URLS[provider]).replace(/\/+$/, "");

  if (!apiKey) {
    throw new ApiKeyMissing(provider);
  }

  if (provider === "anthropic") {
    throw new ApiError("Anthropic", 0, "callAIWithTools does not support Anthropic. Use DeepSeek or OpenAI for tool-use features.");
  }

  const model = options.model ?? (provider === "openai" ? "gpt-4o-mini" : "deepseek-chat");
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2000;

  const apiMessages = messages.map((m) => {
    const msg: Record<string, unknown> = {
      role: (m.role as string) === "ai" ? "assistant" : m.role,
    };

    if (m.role === "tool") {
      msg.tool_call_id = m.tool_call_id;
      msg.content = m.content ?? "";
    } else if (m.tool_calls && m.tool_calls.length > 0) {
      msg.content = m.content;
      msg.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));
    } else {
      msg.content = m.content ?? "";
    }

    return msg;
  });

  const res = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(provider, res.status, body);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;
  const content = msg?.content ?? null;

  const toolCalls: ToolCall[] = (msg?.tool_calls ?? []).map((tc: Record<string, unknown>) => {
    const fn = (tc.function ?? {}) as Record<string, unknown>;
    let args: Record<string, unknown> = {};
    try {
      args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : (fn.arguments ?? {});
    } catch {
      args = { _raw: fn.arguments };
    }
    return {
      id: tc.id as string,
      name: fn.name as string,
      arguments: args,
    };
  });

  return {
    textContent: typeof content === "string" ? content : null,
    toolCalls,
    finishReason: choice?.finish_reason ?? "",
  };
}

// ─── Errors ──────────────────────────────────────────────────────────

export class ApiKeyMissing extends Error {
  provider: AIProvider;
  constructor(provider: AIProvider) {
    super(`API_KEY_MISSING:${provider}`);
    this.name = "ApiKeyMissing";
    this.provider = provider;
  }
}

export class ApiError extends Error {
  provider: string;
  status: number;
  body: string;
  constructor(provider: string, status: number, body: string) {
    super(`API_ERROR:${provider} status=${status}`);
    this.name = "ApiError";
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}
