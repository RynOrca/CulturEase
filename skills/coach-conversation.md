# AI 导师对话 (Coach Agent)

## 概述

CulturEase 的核心 AI 对话功能，基于 Agent Loop 架构实现。用户可以与 AI 导师自由对话，AI 导师能主动调用工具获取真实数据、委托子 Agent 执行专项任务，并通过 Intent 标记驱动前端跳转。

## 架构

```
用户输入 → useAgentStream (SSE) → /api/agent/coach → runAgentLoop()
                                                         ├── streamAIWithTools()
                                                         ├── executeTool() × N
                                                         └── delegate_to_agent → 子 Agent
```

## 核心文件

| 文件 | 职责 |
|---|---|
| `lib/agent/agents/coach.ts` | Coach Agent 定义：7 个工具、温度 0.7、maxTokens 2000 |
| `lib/agent/prompts/coach.ts` | System prompt 生成：身份设定、工具使用规则、子 Agent 委托规则、Intent 标记格式 |
| `lib/agent/loop.ts` | Agent Loop 主循环：think → act → observe，文本缓冲机制 |
| `lib/agent/useAgent.ts` | 前端 Hook：消费 SSE 流、管理消息状态、检测 Intent 标记 |
| `lib/agent/memory.ts` | 对话记忆：localStorage 持久化，最多 10 个会话 |
| `app/api/agent/coach/route.ts` | API 路由：解析请求、调用 runAgentLoop、SSE 流式返回 |

## Coach Agent 配置

```typescript
// lib/agent/agents/coach.ts
export const COACH_AGENT: AgentConfig = {
  name: "coach",
  tools: [
    SEARCH_DIARIES_TOOL,        // 搜索日记
    GET_CITY_INFO_TOOL,         // 城市数据
    GET_CULTURAL_SCENARIO_TOOL, // 文化场景
    GENERATE_EXTERNAL_LINKS_TOOL, // 外部链接
    GET_USER_PROFILE_TOOL,      // 用户画像
    DELEGATE_TO_AGENT_TOOL,     // 委托子 Agent
    GET_KIT_PROGRESS_TOOL,      // 清单进度
  ],
  temperature: 0.7,
  maxTokens: 2000,
};
```

## 7 个工具说明

### 1. search_diaries
- **定义**: `lib/agent/tools/diary-tools.ts`
- **功能**: 全文搜索留学日记，参数 `query` (string)，返回匹配日记列表
- **数据源**: 用户日记 + 30 篇 Mock 日记

### 2. get_city_info
- **定义**: `lib/agent/tools/city-tools.ts`
- **功能**: 查询城市六维文化冲击评分（住房压力/社交融入/语言障碍/便利度/安全/性价比）
- **参数**: `city` (string)

### 3. get_cultural_scenario
- **定义**: `lib/agent/tools/scenario-tools.ts`
- **功能**: 获取预置跨文化对比案例，12 个硬编码场景
- **参数**: `topic` (string, 可选), `category` (string, 可选)

### 4. generate_external_links
- **定义**: `lib/agent/tools/search-tools.ts`
- **功能**: 生成 B站/知乎/小红书/YouTube 四平台搜索链接
- **参数**: `query` (string), `targetCity` (string)

### 5. get_user_profile
- **定义**: `lib/agent/tools/profile-tools.ts`
- **功能**: 获取用户画像：来源国/目标国/城市/阶段/日记数/清单进度
- **无参数**

### 6. delegate_to_agent
- **定义**: `lib/agent/tools/delegate-tool.ts`
- **功能**: 委托子 Agent (simulator/analyst/kit-builder) 执行专项任务
- **参数**: `agent_type` (enum), `query` (string), `scenario` (string, 可选)
- **⚠️ 关键**: 子 Agent 需要 API Key，通过 `context.apiOptions` 传递

### 7. get_kit_progress
- **定义**: `lib/agent/tools/kit-tools.ts`
- **功能**: 获取生存清单完整进度，支持按分类/完成状态过滤
- **参数**: `category` (string, 可选), `completed` (boolean, 可选)

## Agent Loop 工作流程

```
1. 接收用户消息 + 系统 prompt + 工具列表
2. 调用 streamAIWithTools() 获取 AI 响应
3. 检查响应中是否有 tool_calls：
   - 无 tool_calls → 这是最终回复，输出文本
   - 有 tool_calls → 执行工具，将结果反馈给 AI，回到步骤 2
4. 最多循环 5 步（maxSteps=5）
```

**文本缓冲机制** (`lib/agent/loop.ts:66-96`):
- 流式响应中的 text_delta 不会立即输出
- 只有当 AI 最终回复不包含 tool_calls 时才输出
- 避免用户看到 "Let me first check your profile..." 等思考过程

## Intent 标记系统

Coach 在回复末尾输出 HTML 注释格式的标记，前端自动检测并弹出跳转卡片：

| 标记 | 触发条件 | 前端行为 |
|---|---|---|
| `<!--INTENT:simulate:场景ID-->` | 委托 simulator 后 | 弹出"开始练习"卡片，点击跳转 /coach?simulate=xxx |
| `<!--INTENT:analyze-->` | 委托 analyst 后 | 弹出"查看报告"卡片，点击跳转 /coach |
| `<!--INTENT:kit-check-->` | 检查清单后 | 弹出"去看看"卡片，点击跳转 /coach |
| `<!--INTENT:kit-generate-->` | 生成清单后 | 弹出"去生成"卡片，点击跳转 /coach |
| `<!--INTENT:kit-toggle:itemKey-->` | 确认完成某项 | 前端自动打勾，不弹卡片 |

**检测逻辑** (`lib/agent/types.ts:109-119`):
```typescript
const INTENT_PATTERN = /<!--INTENT:([\w-]+)(?::([\w-]+))?-->/;
```

## 子 Agent 委托

Coach 通过 `delegate_to_agent` 工具委托给 3 个子 Agent：

| 子 Agent | 用途 | 场景参数 |
|---|---|---|
| simulator | 场景模拟对话 | renting/healthcare/social/academic/work/emergency/shopping/banking |
| analyst | 日记文化冲击分析 | 无 |
| kit-builder | 生成/检查生存清单 | 无 |

委托流程 (`lib/agent/tools/index.ts:69-114`):
1. 查找子 Agent 配置 (`getAgent()`)
2. 构建子 Agent 的 system prompt
3. 调用 `collectAgentLoop()`（非流式版本）
4. 返回子 Agent 的完整输出给 Coach

## 前端使用

```typescript
// components/home/HomeInput.tsx (Agent 模式)
const { messages, streaming, pendingIntent, error, send, dismissIntent, reset } = useAgentStream({
  endpoint: "/api/agent/coach",
  context: {
    profile: { sourceCountry, targetCountry, targetCity, stage },
    diaries: uniqueDiaries,
    cityData: CITY_DATA,
    kitProgress,
    kitData,
  },
});

// 发送消息
send("在伦敦怎么找房子？");

// 处理 Intent
if (pendingIntent?.type === "simulate") {
  window.open(`/coach?simulate=${pendingIntent.param}`, "_self");
}
```

## 对话记忆

`lib/agent/memory.ts` 提供会话持久化：
- `loadSessions()` / `saveSession()` — 最多保存 10 个会话
- `generateSessionId()` — 生成唯一会话 ID
- 每个会话包含：agentType、messages、createdAt、updatedAt

## 修改指南

- **添加新工具**: 在 `lib/agent/tools/` 创建工具文件 → 注册到 `tools/index.ts` 的 ALL_TOOLS → 在 `agents/coach.ts` 添加 → 更新 `prompts/coach.ts` 的使用说明
- **修改回复风格**: 编辑 `lib/agent/prompts/coach.ts` 中的 buildCoachSystemPrompt
- **添加新 Intent**: 在 `lib/agent/types.ts` 的 IntentMarker.type 联合类型中添加 → 在 HomeInput.tsx 添加处理逻辑
- **调整 Agent Loop 行为**: 修改 `lib/agent/loop.ts` 中的 maxSteps 或文本缓冲逻辑
