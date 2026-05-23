export type AIProvider = "deepseek" | "openai" | "anthropic";

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  /** Runtime API key (from localStorage/web UI) — overrides env var */
  apiKey?: string;
  /** Custom base URL for the API endpoint — overrides default */
  apiBaseUrl?: string;
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
        role: m.role === "ai" ? "assistant" : m.role,
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
        role: m.role === "ai" ? "assistant" : m.role,
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
