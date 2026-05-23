import { NextRequest, NextResponse } from "next/server";
import { callAI, ApiKeyMissing, ApiError } from "@/lib/ai/providers";
import { getAvailableProviders } from "@/lib/ai/providers";
import { COUNTRY_NAMES } from "@/lib/types";

// Map country code to primary language
const COUNTRY_LANGUAGES: Record<string, { lang: string; name: string }> = {
  GB: { lang: "English", name: "英语" },
  US: { lang: "English", name: "英语" },
  AU: { lang: "English", name: "英语" },
  CA: { lang: "English", name: "英语" },
  JP: { lang: "Japanese（日本語）", name: "日语" },
  KR: { lang: "Korean（한국어）", name: "韩语" },
  DE: { lang: "German（Deutsch）", name: "德语" },
  FR: { lang: "French（Français）", name: "法语" },
  SG: { lang: "English", name: "英语" },
};

const SCENARIO_IDS = ["renting", "healthcare", "social", "academic", "work", "emergency", "shopping", "banking"] as const;

const SCENARIO_LABELS: Record<string, string> = {
  renting: "租房沟通",
  healthcare: "看病预约",
  social: "社交破冰",
  academic: "学术讨论",
  work: "兼职面试",
  emergency: "紧急求助",
  shopping: "购物退货",
  banking: "银行业务",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario, targetCountry, targetCity, sourceCountry, history, apiKey, apiBaseUrl, provider } = body;
    const countryName: string = COUNTRY_NAMES[targetCountry as string] ?? targetCountry ?? "目标国";
    const sourceName = sourceCountry === "CN" ? "中国" : (sourceCountry || "中国");
    const langInfo = COUNTRY_LANGUAGES[targetCountry as string] ?? { lang: "English", name: "英语" };

    const isFirstMessage = !history || history.length === 0;
    const scenarioLabel = SCENARIO_LABELS[scenario as string] ?? scenario;

    let systemPrompt: string;
    if (isFirstMessage) {
      systemPrompt = `你是一个身临其境的语言与文化训练教练。你在${countryName}${targetCity ? "的" + targetCity : ""}，帮助一位来自${sourceName}的留学生练习真实生活场景。

当前场景：${scenarioLabel}

你的任务：
1. 首先用一两句话（中文）描述这个场景的背景设定，让用户知道他们在哪里、和谁在对话、目的是什么。格式：【场景背景】xxx
2. 然后你完全化身为场景中的当地人，用${langInfo.lang}（${countryName}的母语）开始对话
3. 后续每轮对话中：
   - 你只用${langInfo.lang}回复，不加任何中文解释
   - 如果用户用中文或其他非${countryName}母语回复，用${langInfo.lang}说"I'm sorry, I don't understand. Could you say that in ${langInfo.lang}?"（或对应的当地语言表达）
   - 如果用户的${langInfo.lang}表达有语法或用词错误，你可以自然地在回复中示范正确说法，但不要直接指出错误
4. 当用户成功完成场景目标（比如成功租到房、完成挂号、成功点菜、有效求助等），在回复的最后加上标记：【GOAL_ACHIEVED】
5. 对话控制在4-8轮内完成，目标导向，推动用户完成任务
6. 保持真实、自然的语调，不要过于正式或生硬`;
    } else {
      systemPrompt = `你是一个身临其境的语言与文化训练教练。你在${countryName}${targetCity ? "的" + targetCity : ""}，正在和一位来自${sourceName}的留学生进行${scenarioLabel}的场景对话。

规则：
1. 你只使用${langInfo.lang}（${countryName}的母语）进行对话回复，绝对不加任何中文
2. 如果用户没有用${langInfo.lang}回复，用${langInfo.lang}友好地表示你没听懂，请对方用${langInfo.lang}再说一次
3. 用户的语言表达如果有错误，在回复中自然地示范正确表达，不要直接指出语法问题
4. 当你判断用户已成功完成场景目标时，在回复最后加上【GOAL_ACHIEVED】
5. 保持对话推进，引导用户完成任务，控制在4-8轮`;
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (isFirstMessage) {
      messages.push({
        role: "user",
        content: `请开始"${scenarioLabel}"场景。先给出【场景背景】，然后以${countryName}当地人的身份开始对话。`,
      });
    } else if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; content: string }) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    const answer = await callAI(messages, {
      maxTokens: 600,
      temperature: 0.8,
      apiKey,
      apiBaseUrl,
      provider,
    });

    // Check if goal was achieved
    const goalAchieved = answer.includes("【GOAL_ACHIEVED】");
    const cleanResponse = answer.replace("【GOAL_ACHIEVED】", "").trim();

    return NextResponse.json({
      response: cleanResponse,
      goalAchieved,
    });
  } catch (error) {
    if (error instanceof ApiKeyMissing) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "AI 服务未配置。请在设置中配置 API Key（DeepSeek/OpenAI/Anthropic 均可）。",
          providers: getAvailableProviders(),
        },
        { status: 503 },
      );
    }
    if (error instanceof ApiError) {
      console.error(`Simulate API error [${error.provider}] status=${error.status}:`, error.body);
      return NextResponse.json(
        {
          error: "API_ERROR",
          message: `AI 服务返回错误 (${error.provider} ${error.status})。请检查 API Key 是否正确，或稍后重试。`,
        },
        { status: 500 },
      );
    }
    console.error("Simulate conversation error:", error);
    return NextResponse.json(
      { error: "AI_SERVICE_ERROR", message: "AI 服务暂时不可用。" },
      { status: 500 },
    );
  }
}
