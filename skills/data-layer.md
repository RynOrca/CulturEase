# 数据持久化层 (Data Layer)

## 概述

CulturEase 完全基于客户端 localStorage 进行数据持久化，无后端数据库。所有用户数据存储在浏览器中。

## 核心文件

| 文件 | 职责 |
|---|---|
| `lib/storage.ts` | **全量持久化层**：日记/评论/点赞/用户画像/清单/缓存/作者信息 |
| `lib/ai/config-loader.ts` | AI 配置持久化：provider/apiKey/apiBaseUrl |
| `lib/agent/memory.ts` | Agent 对话记忆：会话 CRUD，最多 10 个 |

## localStorage Key 全表

| Key | 类型 | 说明 |
|---|---|---|
| `cultur-ease-profile` | `{sourceCountry, targetCountry, targetCity, stage}` | 用户画像 |
| `cultur-ease-diaries` | `DiaryEntry[]` | 全部日记 |
| `cultur-ease-comments` | `DiaryComment[]` | 全部评论 |
| `cultur-ease-liked` | `string[]` | 已点赞日记 ID 集合 |
| `cultur-ease-author-key` | `string` | 匿名作者标识（自动生成） |
| `cultur-ease-author-name` | `string` | 匿名显示名 |
| `cultur-ease-kit-progress` | `Record<string, boolean>` | 清单勾选状态 |
| `cultur-ease-kit` | `string (JSON)` | 清单数据缓存 |
| `cultur-ease-analysis-cache` | `CachedAnalysis` | 文化冲击分析缓存（3h TTL） |
| `cultur-ease-briefing` | `{text, timestamp}` | 每日简报缓存 |
| `cultur-ease-cultural-scenarios` | `CachedCulturalScenarios` | 文化场景缓存 |
| `cultur-ease-holiday-suggestions` | `CachedHolidaySuggestions` | 节日建议缓存 |
| `cultur-ease-demo` | `boolean` | Demo 模式标志 |
| `cultur-ease-agent-sessions` | `AgentSession[]` | Agent 对话历史（最多 10 个） |
| `cultur-ease-ai-config` | `{provider, apiKey, apiBaseUrl}` | AI 提供商配置 |

## 日记操作

```typescript
loadDiaries(): DiaryEntry[]
saveDiaries(diaries): void
addDiary(diary): DiaryEntry[]     // 添加到开头
deleteDiary(id): DiaryEntry[]     // 同时清理评论
likeDiary(id): DiaryEntry[]       // likes + 1
```

## 评论操作

```typescript
loadComments(diaryId): DiaryComment[]   // 按时间倒序
addComment(comment): DiaryComment[]     // 添加到开头
deleteComment(commentId): void
// 内部函数: loadAllComments / saveAllComments
// 删除日记时自动清理关联评论
```

## 点赞系统

```typescript
loadLikedSet(): Set<string>
toggleLiked(id): boolean  // 返回新状态 true=已点赞
// 使用 Set 去重，序列化为数组存储
```

## 用户画像

```typescript
loadUserProfile(): Profile | null
saveUserProfile(profile): void
// 未配置时首页自动跳转 /setup
```

## 匿名作者

```typescript
getAuthorKey(): string       // 自动生成 author-timestamp-random
getAuthorName(): string      // 默认 "匿名用户"
setAuthorName(name): void
```

## 缓存策略

| 缓存 | TTL | 失效条件 |
|---|---|---|
| 文化冲击分析 | 3 小时 | 日记数变化 / 城市变化 / 超时 |
| 每日简报 | 无自动过期 | 仅通过外部逻辑判断 |
| 文化场景 | 无过期 | 通过 sourceCountry+targetCountry+targetCity 匹配 |
| 节日建议 | 无过期 | 通过 sourceCountry+targetCountry+targetCity 匹配 |
| 生存清单 | 无过期 | 用户手动重新生成时覆盖 |

## Agent 对话记忆

```typescript
interface AgentSession {
  id: string;                    // agent-timestamp-random
  agentType: "coach" | "simulator" | "analyst" | "kit-builder";
  messages: AgentMessage[];      // { role, content }[]
  createdAt: number;
  updatedAt: number;
}

// 最多保存 10 个会话，超出时删除最旧的
const MAX_SESSIONS = 10;

loadSessions(): AgentSession[]
saveSession(session): void       // 自动 upsert
deleteSession(id): void
clearAllSessions(): void
```

## AI 配置

```typescript
// lib/ai/config-loader.ts
interface ApiConfig {
  provider: string;     // "deepseek" | "openai" | "anthropic"
  apiKey: string;
  apiBaseUrl?: string;
}

loadApiConfig(): ApiConfig | null
saveApiConfig(config): void
getApiConfigParams(): Record<string, string | undefined>  // 用于请求体
```

## 修改指南

- **添加新 localStorage key**: 在 `storage.ts` 中添加 load/save 函数，注意 `typeof window === "undefined"` 检查
- **数据迁移**: 读取旧 key → 转换为新格式 → 写入新 key → 删除旧 key
- **缓存失效策略**: 参考 `isAnalysisStale` 模式实现自定义缓存判断
- **存储空间**: 注意 localStorage 5MB 限制，大量 Mock 数据在代码中而非 localStorage
