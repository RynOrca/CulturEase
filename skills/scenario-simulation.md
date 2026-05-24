# 场景模拟训练 (Scenario Simulation)

## 概述

沉浸式跨文化语言训练功能。AI 化身目标国家的当地人，用目标语言与用户进行真实生活场景对话。支持 8 种场景，4-8 轮对话，目标导向。

## 两个实现

项目中有两套场景模拟实现：

| 实现 | 端点 | 特点 |
|---|---|---|
| **Agent 版（主要）** | `/api/agent/simulate` | 流式 SSE，支持 Tool Use，通过 Coach 委托调用 |
| **API 版（备用）** | `/api/ai/simulate-conversation` | 传统请求-响应，多轮历史，GOAL_ACHIEVED 检测 |

## 核心文件

| 文件 | 职责 |
|---|---|
| `lib/agent/agents/simulator.ts` | Simulator Agent 定义：3 个工具、温度 0.8、maxTokens 600 |
| `lib/agent/prompts/simulator.ts` | System prompt：语言映射、场景规则、GOAL_ACHIEVED 标记 |
| `app/api/agent/simulate/route.ts` | Agent 版 API 路由 |
| `app/api/ai/simulate-conversation/route.ts` | API 版路由（多轮历史支持） |
| `components/simulator/SimChat.tsx` | 前端聊天界面 |
| `components/simulator/ScenarioSelector.tsx` | 场景选择器 |

## 8 种场景

| ID | 标签 | 描述 |
|---|---|---|
| `renting` | 租房沟通 | 与房东/中介沟通租房事宜 |
| `healthcare` | 看病预约 | 诊所挂号、描述症状、取药 |
| `social` | 社交破冰 | 认识新朋友、派对闲聊 |
| `academic` | 学术讨论 | 与教授/同学讨论学术问题 |
| `work` | 兼职面试 | 应聘兼职/实习 |
| `emergency` | 紧急求助 | 遗失物品、紧急情况求助 |
| `shopping` | 购物退货 | 购物、退换货沟通 |
| `banking` | 银行业务 | 开户、转账等银行业务 |

## 目标语言映射

```typescript
const COUNTRY_LANGUAGES: Record<string, { lang: string; name: string }> = {
  GB: { lang: "English", name: "英语" },
  US: { lang: "English", name: "英语" },
  JP: { lang: "Japanese（日本語）", name: "日语" },
  KR: { lang: "Korean（한국어）", name: "韩语" },
  DE: { lang: "German（Deutsch）", name: "德语" },
  FR: { lang: "French（Français）", name: "法语" },
  // ...
};
```

## Simulator Agent 配置

```typescript
export const SIMULATOR_AGENT: AgentConfig = {
  name: "simulator",
  tools: [
    GET_CULTURAL_SCENARIO_TOOL, // 获取跨文化案例丰富场景
    GET_CITY_INFO_TOOL,         // 获取城市数据让场景更真实
    GET_USER_PROFILE_TOOL,      // 了解用户背景
  ],
  temperature: 0.8,  // 较高温度保证对话多样性
  maxTokens: 600,     // 限制长度模拟真实对话
};
```

## 对话流程

```
首次对话:
  AI 输出: 【场景背景】中文场景描述
  AI 输出: 目标语言的第一句话

后续对话:
  用户: 目标语言回复
  AI: 目标语言回复（只纠正语法，不指出错误）
  
  如果用户不用目标语言:
  AI: "I'm sorry, I don't understand..."（目标语言）

完成条件:
  AI 输出末尾包含: 【GOAL_ACHIEVED】
```

## 关键设计细节

### 1. 不使用分隔线
Prompt 规则第 6 条：`不要使用 --- 或任何分隔线，直接在【场景背景】后开始对话`

### 2. 前端清理逻辑
```typescript
// components/simulator/SimChat.tsx
const cleanContent = content
  .replace(/^---+$/gm, "")       // 移除分隔线
  .replace(/\n{3,}/g, "\n\n")    // 压缩多余空行
  .trim();
```

### 3. 目标语言强制
- 用户用中文回复时，AI 用目标语言表示听不懂
- 语法错误时自然示范正确说法，不直接指出
- 保持真实自然的语调

### 4. GOAL_ACHIEVED 检测
- Agent 版：AI 在回复中包含 `【GOAL_ACHIEVED】`
- API 版：`answer.includes("【GOAL_ACHIEVED】")` → `goalAchieved: true`
- 前端显示完成状态，结束当前对话

## 通过 Coach 调用

最常用的调用方式是通过 Coach Agent 的 `delegate_to_agent` 工具：

```
用户: "我想练习在英国看病的对话"
  → Coach 检测到 simulate 需求
  → 调用 delegate_to_agent(agent_type="simulator", scenario="healthcare", query="...")
  → Simulator Agent 生成场景
  → Coach 在回复末尾添加 <!--INTENT:simulate:healthcare-->
  → 前端弹出跳转卡片
```

## 修改指南

- **添加新场景**: 在 `lib/agent/prompts/simulator.ts` 的 SCENARIO_LABELS 中添加 → 在 `lib/types.ts` 的 SIM_SCENARIOS 中添加
- **添加新语言**: 在 COUNTRY_LANGUAGES 中添加映射
- **调整对话风格**: 修改 `simulator.ts` prompt 中的规则
- **GOAL_ACHIEVED 触发条件**: 修改 prompt 中的完成标准描述
