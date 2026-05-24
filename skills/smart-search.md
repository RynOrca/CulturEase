# 智能搜索 (Smart Search)

## 概述

首页搜索框支持两种模式：搜索模式（AI 总结 + 日记匹配 + 外部链接）和 Agent 模式（AI 对话）。搜索模式并行请求两个 API。

## 核心文件

| 文件 | 职责 |
|---|---|
| `components/home/HomeInput.tsx` | 首页搜索组件：双模式切换、搜索结果展示、Agent 对话 |
| `app/api/ai/search/route.ts` | AI 搜索：日记全文匹配 + AI 总结 |
| `app/api/ai/external-search/route.ts` | 外部链接：B站/知乎/小红书/YouTube 搜索链接生成 |
| `lib/search.ts` | 日记全文检索 + 相关性排序算法 |
| `lib/agent/tools/search-tools.ts` | generate_external_links 工具（Agent 版） |

## 搜索模式工作流程

```
用户输入查询 → HomeInput.handleSearch()
  ├── fetch /api/ai/search     ─┐
  └── fetch /api/ai/external-search ─┘ 并行执行
  
/api/ai/search:
  1. searchDiaries(allDiaries, query) — 全文搜索
  2. 过滤目标城市的日记
  3. callAI(systemPrompt + userMessage) — AI 总结
  4. 返回 { summary, diaries }

/api/ai/external-search:
  1. 构建搜索关键词: "${targetCity} ${query} 留学 文化冲击"
  2. 生成 4 个平台的深链接:
     - B站: https://search.bilibili.com/all?keyword=...
     - 知乎: https://www.zhihu.com/search?type=content&q=...
     - 小红书: https://www.xiaohongshu.com/search_result?keyword=...
     - YouTube: https://www.youtube.com/results?search_query=...
  3. 返回 { results: [{ title, snippet, url, platform, platformLabel, platformColor }] }
```

## 平台链接配置

```typescript
const PLATFORMS = [
  { platform: "bilibili",     label: "B站",    color: "#FB7299" },
  { platform: "zhihu",        label: "知乎",   color: "#0066FF" },
  { platform: "xiaohongshu",  label: "小红书", color: "#FE2C55" },
  { platform: "youtube",      label: "YouTube", color: "#FF0000" },
];
```

## HomeInput 组件

```typescript
type InputMode = "agent" | "search";

// 模式切换
<ModeSelector mode={mode} onSwitch={handleModeSwitch} />

// 搜索模式：显示 AI 摘要 + 日记卡片 + 外部链接
// Agent 模式：useAgentStream 连接 /api/agent/coach

// 发送按钮根据模式变化：
// - 搜索模式: "搜索" → handleSearch()
// - Agent 模式: "发送" → handleChatSend()
```

## 日记全文搜索

```typescript
// lib/search.ts
function searchDiaries(diaries: DiaryEntry[], query: string): DiaryEntry[] {
  // 分词匹配标题和内容
  // 按相关性排序（标题匹配权重更高）
}
```

## Agent 模式

Agent 模式下使用 `useAgentStream` hook 连接 `/api/agent/coach`：
- 对话开始后仅保留发送框
- 支持 Intent 标记处理
- 支持多轮对话记忆
- 显示消息数量和"新对话"按钮

## 修改指南

- **添加新平台**: 在 `external-search/route.ts` 的 deepLinks 函数中添加 → 更新 `search-tools.ts` 的工具实现
- **修改搜索算法**: 编辑 `lib/search.ts`
- **调整搜索 UI**: 编辑 `components/home/HomeInput.tsx`
- **切换默认模式**: 修改 `useState<InputMode>("agent")` 的初始值
