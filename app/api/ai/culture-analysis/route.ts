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

    const hasNoDiaries = !diaries || diaries.length === 0;

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
  "insights": "<2-3 sentence summary in Chinese>${
    hasNoDiaries
      ? ', also include the most notable cultural differences and a useful local saying or slang term'
      : ''
  }",
  "commonDifficulties": [
    "<most common difficulty found in diaries, in Chinese>${
      hasNoDiaries
        ? ', e.g. social etiquette differences, food culture, communication styles'
        : ''
    }",
    "<second most common difficulty, in Chinese>${
      hasNoDiaries
        ? ', e.g. academic culture differences, time perception, personal space norms'
        : ''
    }",
    "<third, in Chinese>${
      hasNoDiaries
        ? ', e.g. homesickness patterns, common misunderstandings'
        : ''
    }"
  ],
  "recommendations": [
    "<specific actionable recommendation, in Chinese>${
      hasNoDiaries
        ? ', e.g. recommended local slang/phrases to learn first'
        : ''
    }",
    "<second recommendation>${
      hasNoDiaries
        ? ', e.g. useful local customs, common dos and don\'ts'
        : ''
    }",
    "<third>${
      hasNoDiaries
        ? ', e.g. social norms around greetings, gift-giving, dining'
        : ''
    }"
  ],
  "localSayings": [
    "<common local saying/slang with Chinese explanation>${
      hasNoDiaries ? ', e.g. local greeting customs' : ''
    }",
    "<another useful saying>${
      hasNoDiaries ? '' : ''
    }",
    "<third saying if applicable>${
      hasNoDiaries ? '' : ''
    }"
  ]
}

Scoring: 0 = no shock, 100 = extreme shock. If no diaries, predict based on country pair — include the MOST impactful culture shocks and useful local sayings/slang for this destination.
commonDifficulties: synthesize repeated themes across diary entries. If no diaries, list predicted common culture shocks for this destination.
recommendations: give specific, actionable advice. If no diaries, suggest useful local phrases, customs, and preparation tips.
localSayings: provide 2-3 common local sayings, slang, or idiomatic expressions with Chinese explanations. Especially important when there are no diaries.`;

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
