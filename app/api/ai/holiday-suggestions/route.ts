import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceCountry, targetCountry, targetCity, apiKey, apiBaseUrl, provider } = body;

    const targetCountryName: string =
      COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";

    const prompt = `You are a cross-cultural counselor specializing in helping Chinese international students cope with homesickness during traditional holidays.

User context:
- From: China
- To: ${targetCountryName} (${targetCity ?? ""})

For each of these holidays that a Chinese student might feel homesick about:
- 春节/Chinese New Year (Lunar New Year)
- 元宵节/Lantern Festival
- 端午节/Dragon Boat Festival
- 中秋节/Mid-Autumn Festival
- 冬至/Winter Solstice
- Thanksgiving (if in US/Canada)
- Christmas/New Year (if different from Chinese experience)

Provide practical, specific advice:

1. WHERE TO BUY INGREDIENTS: Suggest specific types of local stores, neighborhoods, or online options in ${targetCity} where they can find ingredients for traditional holiday foods. Be specific — mention likely store names, Chinatown areas, or Asian grocery chains relevant to ${targetCity}.
2. LOCAL ALTERNATIVES: Suggest local celebrations, events, or traditions happening around the same time that they could participate in — festivals, community events, public celebrations.
3. NEW CONNECTIONS: Suggest how they can build new traditions — invite local friends, join student clubs, create fusion celebrations.
4. The core message: don't try to forget homesickness, but build NEW connections that honor both cultures.

Output ONLY valid JSON (no markdown):

{
  "holidays": [
    {
      "name": "<holiday name in Chinese and local language>",
      "season": "<when it falls, approximate>",
      "whereToBuyIngredients": "<specific advice about where to find ingredients in ${targetCity} for traditional foods, in Chinese>",
      "localAlternatives": "<local events or celebrations they can join, in Chinese>",
      "newConnections": "<how to build new traditions and connections around this holiday, in Chinese>"
    }
  ]
}

Be warm, specific to ${targetCity}, and practical. Use natural Chinese. This section is called "此心安处" — the message is about finding peace and belonging, not about forgetting home.`;

    const answer = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 2000, temperature: 0.7, apiKey, apiBaseUrl, provider },
    );

    let suggestions;
    try {
      suggestions = JSON.parse(answer);
    } catch {
      return NextResponse.json({ error: "解析节日建议失败", raw: answer }, { status: 500 });
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    if (error instanceof ApiKeyMissing) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "AI 服务未配置。",
          providers: getAvailableProviders(),
        },
        { status: 503 },
      );
    }
    console.error("Holiday suggestions error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
