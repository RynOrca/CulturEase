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

    const prompt = `You are a cross-cultural education expert. Create a 5-question multiple-choice quiz about culture shock and cultural adaptation for a Chinese student going to study abroad.

User context:
- From: China
- To: ${targetCountryName} (${targetCity ?? ""})
- Current stage: ${stage ?? "preparing"}

Create realistic scenarios that this student might face when adapting to ${targetCountryName}'s culture. Cover topics like: social etiquette, daily life differences, communication styles, academic/work culture, and common misunderstandings.

For each question:
- Write the question in Chinese
- Provide 4 options in Chinese (A/B/C/D)
- Mark the correct answer index (0-3)
- Write an explanation in Chinese explaining why the correct answer is right
- For wrong answers, prepare a "wrongExplanation" with:
  - "comparison": a culture shock contrast showing the difference between Chinese and ${targetCountryName} culture
  - "correctApproach": what the correct behavior should be

Output ONLY valid JSON (no markdown), no trailing commas:

{
  "questions": [
    {
      "question": "<question text in Chinese>",
      "options": ["<option A in Chinese>", "<option B in Chinese>", "<option C in Chinese>", "<option D in Chinese>"],
      "correctIndex": <0-3>,
      "explanation": "<why this answer is correct, in Chinese, include cultural context>",
      "wrongExplanation": {
        "comparison": "<culture shock comparison showing Chinese vs local culture difference, in Chinese>",
        "correctApproach": "<what the correct behavior or response should be, in Chinese>"
      }
    }
  ]
}

Make questions practical and realistic — the kind of things that actually surprise Chinese students abroad. Vary the difficulty.`;

    const answer = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 2000, temperature: 0.7, apiKey, apiBaseUrl, provider },
    );

    let quiz;
    try {
      quiz = JSON.parse(answer);
    } catch {
      return NextResponse.json({ error: "解析测验数据失败", raw: answer }, { status: 500 });
    }

    return NextResponse.json(quiz);
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
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
