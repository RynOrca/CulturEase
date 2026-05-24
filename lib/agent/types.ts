import { DiaryEntry, CityData, CulturalScenario, SurvivalKit } from "@/lib/types";

// ─── Tool Definition (OpenAI function-calling compatible) ──────────────

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ─── Chat Message (OpenAI-compatible, supports tool results) ───────────

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// ─── Agent Context (data passed from client via request body) ──────────

export interface AgentContext {
  profile?: {
    sourceCountry: string;
    targetCountry: string;
    targetCity: string;
    stage: string;
  };
  diaries?: DiaryEntry[];
  cityData?: Record<string, CityData>;
  scenarios?: CulturalScenario[];
  kitProgress?: Record<string, boolean>;
  kitData?: SurvivalKit;
  /** API config for sub-agent delegation */
  apiOptions?: {
    apiKey: string;
    apiBaseUrl?: string;
    provider?: string;
  };
}

// ─── Agent Loop Input ──────────────────────────────────────────────────

export interface AgentLoopInput {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  context: AgentContext;
  systemPrompt: string;
  apiKey: string;
  apiBaseUrl?: string;
  provider?: string;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
}

// ─── Agent Events (SSE streamed to client) ─────────────────────────────

export type AgentEvent =
  | { type: "text_delta"; content: string }
  | { type: "thinking"; step: number }
  | { type: "tool_exec"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: unknown }
  | { type: "done"; finalContent: string | null }
  | { type: "error"; message: string };

// ─── Agent Config ──────────────────────────────────────────────────────

export interface AgentConfig {
  name: string;
  tools: ToolDefinition[];
  buildSystemPrompt: (context: AgentContext) => string;
  temperature?: number;
  maxTokens?: number;
}

// ─── UseAgent Hook Types ───────────────────────────────────────────────

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Intent Marker (for conversational routing) ───────────────────────

export interface IntentMarker {
  type: "simulate" | "analyze" | "kit-check" | "kit-generate" | "kit-toggle";
  param?: string;
}

export const INTENT_PATTERN = /<!--INTENT:([\w-]+)(?::([\w-]+))?-->/;

export function extractIntent(text: string): {
  intent: IntentMarker | null;
  cleanText: string;
} {
  const match = text.match(INTENT_PATTERN);
  if (!match) return { intent: null, cleanText: text };
  return {
    intent: { type: match[1] as IntentMarker["type"], param: match[2] },
    cleanText: text.replace(INTENT_PATTERN, "").trim(),
  };
}

// ─── UseAgent Hook Types ───────────────────────────────────────────────

export interface UseAgentOptions {
  endpoint: string;
  context: AgentContext;
}

export interface UseAgentReturn {
  messages: AgentMessage[];
  streaming: boolean;
  pendingIntent: IntentMarker | null;
  error: string | null;
  send: (userInput: string) => Promise<void>;
  dismissIntent: () => void;
  reset: () => void;
}

// ─── Agent Loop Output (for non-streaming collect) ────────────────────

export interface AgentLoopOutput {
  finalContent: string | null;
  toolCalls: { name: string; input: Record<string, unknown>; result: unknown }[];
  stepCount: number;
}
