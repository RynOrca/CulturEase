"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import type { AgentMessage, AgentContext, IntentMarker } from "./types";
import { extractIntent } from "./types";

interface UseAgentOptions {
  endpoint: string;
  context: AgentContext;
  initialMessages?: AgentMessage[];
  onMessagesChange?: (messages: AgentMessage[]) => void;
}

interface UseAgentReturn {
  messages: AgentMessage[];
  streaming: boolean;
  pendingIntent: IntentMarker | null;
  error: string | null;
  send: (userInput: string) => Promise<void>;
  dismissIntent: () => void;
  reset: () => void;
  cancel: () => void;
}

export function useAgentStream({
  endpoint,
  context,
  initialMessages,
  onMessagesChange,
}: UseAgentOptions): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages ?? []);
  const [streaming, setStreaming] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<IntentMarker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || streaming) return;

      setError(null);
      setStreaming(true);

      const userMsg: AgentMessage = { role: "user", content: userInput };
      const prevMessages = messages;

      setMessages((prev) => [...prev, userMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const config = getApiConfigParams();
        const fullMessages = [...prevMessages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: fullMessages,
            context,
            apiKey: (config as Record<string, unknown>)?.apiKey,
            apiBaseUrl: (config as Record<string, unknown>)?.apiBaseUrl,
            provider: (config as Record<string, unknown>)?.provider,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            (errData as Record<string, unknown>)?.message ||
            `请求失败 (${res.status})`;
          setError(errMsg as string);
          setStreaming(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const event = JSON.parse(trimmed.slice(6));

              switch (event.type) {
                case "text_delta":
                  assistantContent += event.content ?? "";
                  // Check for intent marker at the end of accumulated content
                  const { intent, cleanText } = extractIntent(assistantContent);
                  if (intent) {
                    setPendingIntent(intent);
                    assistantContent = cleanText;
                  }
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") {
                      return [
                        ...prev.slice(0, -1),
                        { role: "assistant", content: assistantContent },
                      ];
                    }
                    return [
                      ...prev,
                      { role: "assistant", content: assistantContent },
                    ];
                  });
                  break;

                case "done":
                  // Final content already set via text_delta
                  break;

                case "error":
                  setError(event.message ?? "未知错误");
                  break;
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "网络连接失败"
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, endpoint, context, streaming]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const dismissIntent = useCallback(() => {
    setPendingIntent(null);
  }, []);

  useEffect(() => {
    if (onMessagesChange && messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  return { messages, streaming, pendingIntent, error, send, dismissIntent, reset, cancel };
}
