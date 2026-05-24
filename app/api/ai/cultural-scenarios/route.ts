import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceCountry, targetCountry, targetCity, stage, apiKey, apiBaseUrl, provider } = body;

    const targetCountryName: string =
      COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";
    const sourceName = sourceCountry === "CN" ? "中国" : (COUNTRY_NAMES[sourceCountry as string] ?? sourceCountry ?? "中国");

    const prompt = `You are a cross-cultural comparison expert. Generate a set of cultural scenario comparisons for a Chinese student studying abroad.

User context:
- From: ${sourceName}
- To: ${targetCountryName} (${targetCity ?? ""})
- Current stage: ${stage ?? "preparing"}

Create 10 distinct cultural scenarios comparing how things are done in ${sourceName} vs ${targetCountryName}. Cover a wide range of life aspects: social etiquette, daily routines, academic/work culture, communication styles, food culture, transportation, healthcare, shopping, friendship, time management, etc.

For each scenario, output in this JSON structure:

{
  "scenarios": [
    {
      "id": "<unique-id-like 'social-1', 'food-2'>",
      "title": "<scenario title in Chinese, e.g. '如何打招呼'>",
      "category": "<one of: housing, commute, social, healthcare, work, expenses, safety, other>",
      "sourceCountry": "${sourceName}",
      "targetCountry": "${targetCountryName}",
      "sourceBehavior": "<how things are done in ${sourceName}, in Chinese, 2-4 sentences>",
      "targetBehavior": "<how things are done in ${targetCountryName}, in Chinese, 2-4 sentences>",
      "howToAdapt": "<practical advice for adapting, in Chinese, 2-4 sentences>",
      "realQuote": "<a realistic quote from a Chinese student about this difference, in Chinese>",
      "quoteAuthor": "<anonymous student, year X>",
      "tags": ["<tag1>", "<tag2>", "<tag3>"]
    }
  ]
}

Rules:
- Each scenario must be unique and specific to ${sourceName} → ${targetCountryName} cultural differences
- Use natural, conversational Chinese
- Make the comparison practical and useful for someone preparing to study abroad
- Vary the categories across scenarios
- The "realQuote" should sound like something a real student would say
- Each scenario should have 2-4 relevant tags

Output ONLY valid JSON, no markdown, no trailing commas.`;

    const answer = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 3000, temperature: 0.7, apiKey, apiBaseUrl, provider },
    );

    let scenarios;
    try {
      scenarios = JSON.parse(answer);
    } catch {
      return NextResponse.json({ error: "解析场景数据失败", raw: answer }, { status: 500 });
    }

    return NextResponse.json(scenarios);
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
    console.error("Cultural scenarios generation error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
