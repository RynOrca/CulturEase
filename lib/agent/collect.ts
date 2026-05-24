/**
 * Helper to call an agent endpoint and collect the full text response.
 * Used for one-shot operations (analysis, kit generation) that don't need streaming UI.
 */
export async function collectAgentResponse(
  endpoint: string,
  body: Record<string, unknown>
): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

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
        if (event.type === "text_delta") {
          fullContent += event.content ?? "";
        } else if (event.type === "error") {
          return null;
        }
      } catch {
        // skip
      }
    }
  }

  return fullContent || null;
}
