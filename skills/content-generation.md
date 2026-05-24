# 文化内容生成 (Content Generation)

## 概述

4 个 AI 内容生成 API，提供结构化的跨文化教育内容。每个都是独立的传统请求-响应端点。

## 功能列表

| 功能 | 端点 | 页面 |
|---|---|---|
| **文化适应测验** | `/api/ai/quiz` | /toolkit (QuizSection) |
| **节日思乡建议** | `/api/ai/holiday-suggestions` | /toolkit (HolidaySection) |
| **文化场景对比** | `/api/ai/cultural-scenarios` | /toolkit (ScenarioCards) |
| **文化适应报告** | `/api/ai/report` | /coach (Report 模式) |
| **每日简报** | `/api/ai/briefing` | 首页（可能未使用） |

---

## 一、文化适应测验

**端点**: `POST /api/ai/quiz`

**核心文件**: `app/api/ai/quiz/route.ts`、`components/quiz/QuizSection.tsx`

### 输入参数
```typescript
{ sourceCountry, targetCountry, targetCity, stage, apiKey, apiBaseUrl, provider }
```

### 输出结构
```typescript
{
  questions: [{
    question: string;          // 中文题目
    options: string[];         // 4 个选项 (A/B/C/D)
    correctIndex: number;      // 0-3
    explanation: string;       // 正确答案解释
    wrongExplanation: {
      comparison: string;      // 文化冲击对比
      correctApproach: string; // 正确做法
    }
  }]
}
```

### Prompt 要点
- 5 道选择题
- 覆盖：社交礼仪、日常生活、沟通风格、学术/工作文化、常见误解
- 每个错误选项配 culture shock 对比解释
- 问题要实用、真实 — "中国留学生出国后真正会惊讶的事"

### 前端交互
- QuizSection 组件管理答题状态
- 选择答案后展示正确/错误 + 解释 + wrongExplanation

---

## 二、节日思乡建议 "此心安处"

**端点**: `POST /api/ai/holiday-suggestions`

**核心文件**: `app/api/ai/holiday-suggestions/route.ts`、`components/toolkit/HolidaySection.tsx`

### 输出结构
```typescript
{
  holidays: [{
    name: string;                    // 节日名称（中英）
    season: string;                  // 大概时间
    whereToBuyIngredients: string;   // 在哪买食材（具体到目标城市）
    localAlternatives: string;       // 当地替代活动
    newConnections: string;          // 如何建立新传统
  }]
}
```

### 覆盖节日
春节、元宵节、端午节、中秋节、冬至、Thanksgiving (US/CA)、Christmas/New Year

### 核心理念
"此心安处" — 不是忘记思乡，而是在两种文化中建立新的连接

### 缓存
- 前端缓存到 localStorage: `cultur-ease-holiday-suggestions`
- 缓存 key 包含 sourceCountry + targetCountry + targetCity

---

## 三、文化场景对比

**端点**: `POST /api/ai/cultural-scenarios`

**核心文件**: `app/api/ai/cultural-scenarios/route.ts`

### 输出结构
```typescript
{
  scenarios: [{
    id: string;              // 如 "social-1"
    title: string;           // 中文标题
    category: LifeType;      // housing/commute/social/healthcare/work/expenses/safety/other
    sourceCountry: string;
    targetCountry: string;
    sourceBehavior: string;  // 来源国行为（2-4句中文）
    targetBehavior: string;  // 目标国行为（2-4句中文）
    howToAdapt: string;      // 适应建议（2-4句中文）
    realQuote: string;       // 真实留学生引用
    quoteAuthor: string;     // "匿名，第X年"
    tags: string[];          // 2-4 个标签
  }]
}
```

### 生成规则
- 10 个不同场景
- 覆盖广泛的生活方面
- 每个场景要有真实的 culture shock 对比
- `realQuote` 要像真实留学生会说的话

### 预置场景
`lib/data/scenarios.ts` 中有 12 个硬编码的跨文化对比案例，工具 `get_cultural_scenario` 返回这些预置数据。

### 缓存
- 前端缓存: `cultur-ease-cultural-scenarios`
- 缓存 key 包含 sourceCountry + targetCountry + targetCity

---

## 四、文化适应报告

**端点**: `POST /api/ai/report`

**核心文件**: `app/api/ai/report/route.ts`、`lib/ai/prompts.ts` (reportPrompt)

### Prompt 来源
`lib/ai/prompts.ts` 中的 `reportPrompt()` 函数，基于用户画像生成 500-800 字中文报告。

### 报告内容
- 文化差异概述
- 阶段特定建议
- 城市特定信息
- 实用准备建议

### 前端使用
Coach 页面的 Report 模式调用此 API，展示纯文本报告。

---

## 五、每日简报

**端点**: `POST /api/ai/briefing`

**核心文件**: `app/api/ai/briefing/route.ts`、`lib/ai/prompts.ts` (briefingSystemPrompt)

### Prompt 来源
`lib/ai/prompts.ts` 中的 `briefingSystemPrompt()` 函数，生成 200 字内的鼓励简报。

### 缓存
- 前端缓存: `cultur-ease-briefing`
- 包含 timestamp 用于过期判断

---

## 通用模式

所有内容生成 API 共享相同的错误处理模式：

```typescript
try {
  const answer = await callAI(messages, options);
  const parsed = JSON.parse(answer);  // 或直接使用文本
  return NextResponse.json(parsed);
} catch (error) {
  if (error instanceof ApiKeyMissing) {
    return NextResponse.json({ error: "API_KEY_MISSING", providers: getAvailableProviders() }, { status: 503 });
  }
  return NextResponse.json({ error: "AI_SERVICE_ERROR" }, { status: 500 });
}
```

## 修改指南

- **添加新内容类型**: 参考现有路由结构创建 `/api/ai/xxx/route.ts` → 添加前端组件 → 添加缓存逻辑
- **修改生成质量**: 调整 prompt 中的细节程度和示例
- **统一错误处理**: 所有路由使用相同的 ApiKeyMissing / ApiError 处理
