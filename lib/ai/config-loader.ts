/**
 * Loads runtime AI API configuration from localStorage.
 * Used by frontend components to pass credentials to API routes.
 */
export interface ApiKeyConfig {
  provider: "deepseek" | "openai" | "anthropic";
  apiKey: string;
  apiBaseUrl: string;
}

const CONFIG_KEY = "cultur-ease-ai-config";

export function loadApiConfig(): ApiKeyConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveApiConfig(config: ApiKeyConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearApiConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONFIG_KEY);
}

/**
 * Returns the API config params to be spread into API request bodies.
 * All AI API routes accept apiKey, apiBaseUrl, and provider.
 */
export function getApiConfigParams(): {
  apiKey?: string;
  apiBaseUrl?: string;
  provider?: string;
} {
  const config = loadApiConfig();
  if (!config || !config.apiKey) return {};
  return {
    apiKey: config.apiKey,
    apiBaseUrl: config.apiBaseUrl || undefined,
    provider: config.provider,
  };
}
