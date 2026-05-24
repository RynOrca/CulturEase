import { ToolDefinition, AgentContext } from "@/lib/agent/types";
import { COUNTRY_NAMES, STAGE_LABELS, JourneyStage } from "@/lib/types";

export const GET_USER_PROFILE_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_user_profile",
    description:
      "获取当前用户的留学档案信息，包括来源国、目标国家、目标城市、留学阶段、日记数量和准备清单进度。在给出个性化建议前先调用此工具了解用户背景。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

export interface UserProfileResult {
  hasProfile: boolean;
  sourceCountry?: string;
  sourceCountryName?: string;
  targetCountry?: string;
  targetCountryName?: string;
  targetCity?: string;
  stage?: string;
  stageLabel?: string;
  diaryCount?: number;
  kitProgress?: string;
}

export function executeGetUserProfile(
  _args: Record<string, unknown>,
  context: AgentContext
): UserProfileResult {
  const p = context.profile;
  if (!p) return { hasProfile: false };

  const kitProgress = context.kitProgress;
  const kitTotal = kitProgress ? Object.keys(kitProgress).length : 0;
  const kitDone = kitProgress
    ? Object.values(kitProgress).filter(Boolean).length
    : 0;

  return {
    hasProfile: true,
    sourceCountry: p.sourceCountry,
    sourceCountryName: COUNTRY_NAMES[p.sourceCountry] ?? p.sourceCountry,
    targetCountry: p.targetCountry,
    targetCountryName: COUNTRY_NAMES[p.targetCountry] ?? p.targetCountry,
    targetCity: p.targetCity,
    stage: p.stage,
    stageLabel: STAGE_LABELS[p.stage as JourneyStage] ?? p.stage,
    diaryCount: context.diaries?.length ?? 0,
    kitProgress: kitTotal > 0 ? `${kitDone}/${kitTotal} 项已完成` : "尚未生成",
  };
}
