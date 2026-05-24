# 生存工具包 (Survival Kit)

## 概述

个性化留学准备清单。AI 基于目标城市数据、留学日记经验和用户阶段，生成 6 大类待办事项。用户可逐项勾选追踪进度。

## 三个入口

| 入口 | 端点 | 特点 |
|---|---|---|
| **页面独立使用** | `/api/ai/survival-kit` | 用户点击生成，传统请求-响应 |
| **Agent 版（kit-builder）** | `/api/agent/survival-kit` | 通过 Coach 委托，支持工具调用 |
| **Coach 对话交互** | `/api/agent/coach` | 用户可对话式检查/更新清单 |

## 核心文件

| 文件 | 职责 |
|---|---|
| `app/api/ai/survival-kit/route.ts` | API 版路由 |
| `lib/agent/agents/kit-builder.ts` | Kit Builder Agent：3 个工具、温度 0.6、maxTokens 3000 |
| `lib/agent/prompts/kit-builder.ts` | System prompt：生成规则、JSON 格式 |
| `lib/agent/tools/kit-tools.ts` | get_kit_progress 工具定义和执行器 |
| `lib/storage.ts` | 进度持久化：loadKitProgress / saveKitProgress / toggleKitItem |
| `components/survival/SurvivalKitMain.tsx` | 前端主体：展开/折叠 + 勾选 + 进度环 |
| `components/survival/ChecklistSection.tsx` | 清单分类区块 |
| `components/survival/ProgressRing.tsx` | SVG 环形进度图 |

## Kit Builder Agent 配置

```typescript
export const KIT_BUILDER_AGENT: AgentConfig = {
  name: "kit-builder",
  tools: [
    SEARCH_DIARIES_TOOL,     // 搜索留学生真实经验
    GET_CITY_INFO_TOOL,      // 城市数据影响清单侧重
    GET_USER_PROFILE_TOOL,   // 了解阶段和背景
  ],
  temperature: 0.6,
  maxTokens: 3000,
};
```

## 6 大类清单

```typescript
{
  sections: [
    { id: "documents",  title: "证件文档", items: [{ text: "...", tip: "..." }] },
    { id: "housing",    title: "住宿租房", items: [...] },
    { id: "healthcare", title: "医疗健康", items: [...] },
    { id: "finance",    title: "财务金融", items: [...] },
    { id: "phrases",    title: "关键用语", items: [...] },
    { id: "emergency",  title: "紧急情况", items: [...] },
  ]
}
```

## 生成规则

1. 必须基于 `get_city_info` 的城市数据和 `search_diaries` 的真实经验
2. 每项具体到目标城市的实际情况（当地紧急电话、本地银行名、常见租房平台）
3. 每个 section 包含 3-5 个 items
4. 根据用户阶段调整侧重（出发前侧重准备，到达后侧重落地事项）
5. 城市数据影响内容：
   - 房租评分高 → 文档/租房部分更详细
   - 安全评分低 → 应急部分更重要

## 进度追踪

```typescript
// lib/storage.ts
localStorage key: "cultur-ease-kit-progress"
格式: { "itemKey1": true, "itemKey2": false, ... }

// 切换勾选
function toggleKitItem(itemKey: string): Record<string, boolean> {
  const progress = loadKitProgress();
  progress[itemKey] = !progress[itemKey];
  saveKitProgress(progress);
  return progress;
}
```

清单数据缓存到 `localStorage` key `cultur-ease-kit`（JSON 字符串）。

## Coach 对话式交互

用户可以通过对话管理清单：

```
用户: "我还缺什么？" / "清单进度怎么样？"
  → Coach 调用 get_kit_progress → 列出未完成项

用户: "签证已经办好了"
  → Coach 调用 get_kit_progress → 找到匹配项
  → 回复末尾加 <!--INTENT:kit-toggle:visa_key-->
  → 前端自动勾选该项

用户: "签证办了吗？"
  → Coach 调用 get_kit_progress → 查看该项状态 → 如实告知
```

## 前端展示

- **ProgressRing**: SVG 圆环显示完成百分比
- **ChecklistSection**: 可展开/折叠的分类区块
- 已勾选项显示删除线样式
- 本地操作即时更新，无需等待服务器

## 修改指南

- **添加清单分类**: 修改 `kit-builder.ts` prompt 中的 sections 数组 → 更新前端 SurvivalKitMain
- **调整进度存储**: 修改 `storage.ts` 中的 kit progress 相关函数
- **修改生成规则**: 编辑 `prompts/kit-builder.ts` 中的规则
