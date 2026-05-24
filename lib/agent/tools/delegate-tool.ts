import type { ToolDefinition } from "@/lib/agent/types";

export const DELEGATE_TO_AGENT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "delegate_to_agent",
    description: `将复杂任务委托给专项 agent 处理。当你需要生成场景模拟对话、分析日记中的文化冲击模式、或生成/检查生存清单时，使用此工具委托给对应的专项 agent。

各 agent 的用途：
- simulator: 生成跨文化场景模拟对话，用户练习在目标国家的真实对话
- analyst: 分析用户的留学日记，检测文化冲击模式，给出评估报告
- kit-builder: 生成或检查个性化的留学生存清单，列出具体未完成事项`,
    parameters: {
      type: "object",
      properties: {
        agent_type: {
          type: "string",
          enum: ["simulator", "analyst", "kit-builder"],
          description: "要委托的专项 agent 类型",
        },
        query: {
          type: "string",
          description: "给子 agent 的具体任务描述，包含场景、城市、用户需求等上下文",
        },
        scenario: {
          type: "string",
          description: "仅 simulator 需要：场景ID (renting/healthcare/social/academic/work/emergency/shopping/banking)",
        },
      },
      required: ["agent_type", "query"],
    },
  },
};
