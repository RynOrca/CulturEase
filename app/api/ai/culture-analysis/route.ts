import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing } from "@/lib/ai/providers";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceCountry, targetCountry, targetCity, stage, diaries, apiKey, apiBaseUrl, provider } = body;

    const targetCountryName: string =
      COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";

    const diariesText = (diaries || [])
      .slice(0, 10)
      .map(
        (d: { title: string; content: string; lifeType: string }) =>
          `[${d.lifeType}] ${d.title}: ${d.content}`
      )
      .join("\n\n");

        const prompt = `You are a study abroad experience analyst. Analyze the user's diary entries to uncover patterns, common difficulties, and actionable insights that a social media platform cannot provide.

User info:
- From: ${sourceCountry ?? "China"}
- To: ${targetCountryName} (${targetCity ?? ""})
- Current stage: ${stage ?? "preparing"}

User's diary entries:
${diariesText || "No entries yet"}

Output ONLY valid JSON (no markdown):

{
  "overallIndex": <0-100, culture shock level>,
  "dimensions": [
    {
      "name": "language",
      "label": "语言沟通",
      "score": <0-100>,
      "description": "<brief note in Chinese>"
    },
    {
      "name": "dailyLife",
      "label": "日常生活",
      "score": <0-100>,
      "description": "<brief note in Chinese>"
    },
    {
      "name": "social",
      "label": "社交融入",
      "score": <0-100>,
      "description": "<brief note in Chinese>"
    },
    {
      "name": "academic",
      "label": "学术工作",
      "score": <0-100>,
      "description": "<brief note in Chinese>"
    },
    {
      "name": "culture",
      "label": "文化理解",
      "score": <0-100>,
      "description": "<brief note in Chinese>"
    }
  ],
  "insights": "<2-3 sentence summary in Chinese>",
  "commonDifficulties": [
    "<most common difficulty found in diaries, in Chinese>",
    "<second most common difficulty, in Chinese>",
    "<third, in Chinese>"
  ],
  "recommendations": [
    "<specific actionable recommendation based on diary analysis, in Chinese>",
    "<second recommendation>",
    "<third>"
  ]
}

Scoring: 0 = no shock, 100 = extreme shock. If no diaries, predict based on country pair.
commonDifficulties: synthesize repeated themes across diary entries (this is what makes this analysis unique — finding patterns the user might not see themselves).
recommendations: give specific, actionable advice based on the patterns found.`;

    const answer = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 1000, temperature: 0.5, apiKey, apiBaseUrl, provider },
    );

    let analysis;
    try {
      analysis = JSON.parse(answer);
    } catch {
      return NextResponse.json({ analysis: null, raw: answer });
    }

    return NextResponse.json({ analysis });
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
    console.error("Culture analysis error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
