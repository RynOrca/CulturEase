# 文化冲击分析 (Culture Shock Analysis)

## 概述

基于用户留学日记内容，AI 分析文化冲击模式，输出多维度评分和个性化建议。同时结合城市六维文化冲击数据提供参考基准。

## 两个入口

| 入口 | 端点 | 触发方式 |
|---|---|---|
| **首页自动分析** | `/api/ai/culture-analysis` | 首页加载时自动请求，有 3 小时缓存 |
| **Agent 版（analyst）** | `/api/agent/analyze` | 通过 Coach 委托调用 |

## 核心文件

| 文件 | 职责 |
|---|---|
| `app/api/ai/culture-analysis/route.ts` | API 版：接收日记、调用 AI、返回 JSON |
| `lib/agent/agents/analyst.ts` | Analyst Agent 定义：3 个工具、温度 0.5、maxTokens 2500 |
| `lib/agent/prompts/analyst.ts` | System prompt：分析流程、输出格式、评分规则 |
| `app/api/agent/analyze/route.ts` | Agent 版 API 路由 |
| `lib/storage.ts` | 缓存管理：loadCachedAnalysis / saveCachedAnalysis / isAnalysisStale |
| `app/page.tsx` | 首页展示：圆环指数 + 维度条形图 + 困难列表 + 建议 |

## Analyst Agent 配置

```typescript
export const ANALYST_AGENT: AgentConfig = {
  name: "analyst",
  tools: [
    SEARCH_DIARIES_TOOL,     // 搜索各话题日记
    GET_CITY_INFO_TOOL,      // 城市文化冲击分数基准
    GET_USER_PROFILE_TOOL,   // 用户背景
  ],
  temperature: 0.5,  // 低温度保证分析一致性
  maxTokens: 2500,
};
```

## 输出结构

```typescript
{
  overallIndex: number;       // 0-100 文化冲击综合指数
  dimensions: [               // 5 个维度
    { key: "language",   label: "语言障碍", score: 0-100, description: "..." },
    { key: "dailyLife",  label: "日常生活", score: 0-100, description: "..." },
    { key: "social",     label: "社交融入", score: 0-100, description: "..." },
    { key: "academic",   label: "学业压力", score: 0-100, description: "..." },
    { key: "culture",    label: "文化适应", score: 0-100, description: "..." }
  ];
  insights: string;           // 2-3 句话综合分析
  commonDifficulties: string[]; // 基于日记模式的常见困难 Top 3
  recommendations: string[];   // 针对性建议 Top 3
  localSayings: string[];      // 当地常用俗语/俚语（含中文解释）
}
```

## 缓存策略

```typescript
// lib/storage.ts
const ANALYSIS_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 小时

function isAnalysisStale(cached, currentDiaryCount, currentCity): boolean {
  if (Date.now() - cached.timestamp > ANALYSIS_CACHE_TTL) return true;
  if (cached.diaryCount !== currentDiaryCount) return true;  // 新日记触发刷新
  if (cached.targetCity !== currentCity) return true;         // 换城市触发刷新
  return false;
}
```

## 首页展示

1. **圆环指数**: SVG 环形进度条，颜色根据分数变化：
   - >60: 红色 (rust) — 冲击较高
   - 30-60: 琥珀色 (amber) — 冲击中等
   - <30: 绿色 (sage) — 冲击较低

2. **维度条形图**: 5 个维度的分数条，带描述

3. **常见困难**: 红色背景卡片，编号列表

4. **针对性建议**: 绿色背景卡片，箭头列表

## 分析流程

```
API 版:
  请求 → 构建 prompt（含日记文本） → callAI → 解析 JSON → 缓存 → 返回

Agent 版:
  请求 → runAgentLoop
    ├── get_user_profile → 了解背景
    ├── search_diaries → 搜索各话题日记
    ├── get_city_info → 城市基准分
    └── AI 综合输出 JSON
```

## 修改指南

- **修改维度**: 编辑 `analyst.ts` prompt 中的 dimensions 数组 → 同步修改 `culture-analysis/route.ts` 的 JSON schema → 更新首页展示
- **调整缓存 TTL**: 修改 `storage.ts` 中的 `ANALYSIS_CACHE_TTL`
- **评分算法**: 修改 prompt 中的评分规则说明
- **添加 localSayings**: 已在 `culture-analysis/route.ts` prompt 中，会自动根据有无日记生成不同内容
