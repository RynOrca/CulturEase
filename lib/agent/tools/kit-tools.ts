import { ToolDefinition, AgentContext } from "@/lib/agent/types";
import type { SurvivalKitSection } from "@/lib/types";

export const GET_KIT_PROGRESS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_kit_progress",
    description:
      "获取用户生存工具包的完整进度信息，包括所有待办事项及其完成状态，按分类整理。当用户询问\"我还缺什么\"\"准备得怎么样\"\"清单进度\"\"帮我看看还有什么没做\"时调用此工具。也可用于查找特定事项的 itemKey 以便后续标记完成。",
    parameters: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "pending", "done"],
          description: "筛选条件：all=全部, pending=仅未完成, done=仅已完成。默认 all",
        },
      },
    },
  },
};

export interface KitProgressResult {
  hasKit: boolean;
  totalItems: number;
  doneCount: number;
  pendingCount: number;
  percent: number;
  sections: {
    id: string;
    title: string;
    items: {
      key: string;
      text: string;
      tip?: string;
      checked: boolean;
    }[];
  }[];
}

export function executeGetKitProgress(
  args: Record<string, unknown>,
  context: AgentContext
): KitProgressResult {
  const kitData = context.kitData;
  const progress = context.kitProgress ?? {};

  if (!kitData?.sections) {
    return {
      hasKit: false,
      totalItems: 0,
      doneCount: 0,
      pendingCount: 0,
      percent: 0,
      sections: [],
    };
  }

  const filter = (args.filter as string) ?? "all";

  const sections: KitProgressResult["sections"] = kitData.sections.map(
    (section: SurvivalKitSection, si: number) => {
      const items = section.items
        .map((item, ii) => {
          const key = `${section.id}-${ii}`;
          return {
            key,
            text: item.text,
            tip: item.tip,
            checked: progress[key] ?? false,
          };
        })
        .filter((item) => {
          if (filter === "pending") return !item.checked;
          if (filter === "done") return item.checked;
          return true;
        });

      return {
        id: section.id,
        title: section.title,
        items,
      };
    }
  );

  const allItems = sections.flatMap((s) => s.items);
  const doneCount = allItems.filter((i) => i.checked).length;
  const totalItems = allItems.length;

  return {
    hasKit: true,
    totalItems,
    doneCount,
    pendingCount: totalItems - doneCount,
    percent: totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0,
    sections: sections.filter((s) => s.items.length > 0),
  };
}
