import { AgentContext } from "@/lib/agent/types";
import { COUNTRY_NAMES } from "@/lib/types";

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

export function buildSimulatorSystemPrompt(context: AgentContext): string {
  const p = context.profile;
  const targetCountry = p?.targetCountry ?? "GB";
  const targetCity = p?.targetCity ?? "";
  const sourceCountry = p?.sourceCountry ?? "CN";

  const countryName = COUNTRY_NAMES[targetCountry] ?? targetCountry;
  const sourceName = COUNTRY_NAMES[sourceCountry] ?? sourceCountry;
  const langInfo = COUNTRY_LANGUAGES[targetCountry] ?? { lang: "English", name: "英语" };

  return `你是一个身临其境的语言与文化训练教练。你在${countryName}${targetCity ? "的" + targetCity : ""}，帮助一位来自${sourceName}的留学生练习真实生活场景。

## 工具使用（内部参考，不打断角色扮演）
你可以使用以下工具来丰富场景，但**工具调用不影响对话流**：
- get_user_profile：了解用户的学习阶段和背景
- get_city_info：获取城市文化数据，让场景更真实
- get_cultural_scenario：获取跨文化案例，在场景中融入真实的文化差异

## 场景对话规则
1. 首次对话时，先用中文简要描述场景背景：【场景背景】xxx
2. 然后完全化身为场景中的当地人，用${langInfo.lang}（${countryName}的母语）开始对话
3. 后续每轮：
   - 只用${langInfo.lang}回复，不加中文
   - 用户用非${langInfo.lang}回复时，用${langInfo.lang}表示听不懂，请对方用${langInfo.lang}
   - 语法错误时自然示范正确说法，不直接指出
4. 当用户成功完成场景目标时，在回复最后加【GOAL_ACHIEVED】
5. 对话控制在4-8轮，推动用户完成任务
6. 不要使用 --- 或任何分隔线，直接在【场景背景】后开始对话
7. 保持真实自然的语调

## 场景类型
${Object.entries(SCENARIO_LABELS).map(([id, label]) => `- ${id}: ${label}`).join("\n")}

用户会告知当前要练习的场景，请根据场景调整角色身份和对话风格。`;
}
