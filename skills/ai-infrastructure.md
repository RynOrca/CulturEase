# AI 基础设施 (AI Infrastructure)

## 概述

CulturEase 的 AI 调用层支持 3 种提供商，统一封装普通调用、流式调用和工具调用。API Key 支持环境变量和前端配置两种方式。

## 核心文件

| 文件 | 职责 |
|---|---|
| `lib/ai/providers.ts` | **核心 AI 调用层**：callAI / streamAIWithTools / callAIWithTools |
| `lib/ai/config-loader.ts` | 前端 AI 配置管理：localStorage 持久化 |
| `lib/ai/prompts.ts` | 旧版 prompt 生成函数（chat/report/simulate/survivalKit/briefing） |
| `app/api/ai/validate-key/route.ts` | API Key 验证端点 |

---

## 一、AI 提供商层 (providers.ts)

### 支持的提供商

| 提供商 | 模型 | 默认 Base URL |
|---|---|---|
| DeepSeek | deepseek-chat | https://api.deepseek.com |
| OpenAI | gpt-4o-mini | https://api.openai.com |
| Anthropic | claude-sonnet-4-6 | https://api.anthropic.com |

### API Key 获取优先级

```
options.apiKey (前端传入) > process.env.DEEPSEEK_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY
```

```typescript
function getKeyForProvider(provider: AIProvider): string | undefined {
  switch (provider) {
    case "deepseek": return process.env.DEEPSEEK_API_KEY;
    case "openai":   return process.env.OPENAI_API_KEY;
    case "anthropic": return process.env.ANTHROPIC_API_KEY;
  }
}
```

### 默认提供商

```typescript
function getDefaultProvider(): AIProvider {
  const fromEnv = process.env.AI_DEFAULT_PROVIDER;
  if (fromEnv === "openai" || fromEnv === "anthropic") return fromEnv;
  return "deepseek";
}
```

### 三个核心函数

#### 1. callAI()
普通非流式调用，返回完整文本。

```typescript
const answer = await callAI(
  [{ role: "user", content: "..." }],
  { maxTokens: 1000, temperature: 0.7, apiKey, apiBaseUrl, provider }
);
```

#### 2. streamAIWithTools()
流式调用 + 工具使用支持。Yields text_delta 和 done 事件。

```typescript
for await (const event of streamAIWithTools(messages, tools, options)) {
  if (event.type === "text_delta") { /* 实时文本 */ }
  if (event.type === "done") { /* finalContent + toolCalls */ }
}
```

**注意**: 不支持 Anthropic（Anthropic 使用不同的 streaming 格式）。

#### 3. callAIWithTools()
非流式调用 + 工具使用，用于子 Agent 委托。

```typescript
const { textContent, toolCalls } = await callAIWithTools(messages, tools, options);
```

### 每个提供商的适配细节

- **DeepSeek**: OpenAI 兼容 API，`/v1/chat/completions`
- **OpenAI**: 标准 OpenAI API，`/v1/chat/completions`
- **Anthropic**: 使用独立的 `/v1/messages` 端点和 `x-api-key` 头，system prompt 通过单独的 `system` 字段传递

### 自定义错误类

```typescript
class ApiKeyMissing extends Error {
  provider: AIProvider;
  // message: "API_KEY_MISSING:deepseek"
}

class ApiError extends Error {
  provider: string; status: number; body: string;
  // message: "API_ERROR:DeepSeek status=401"
}
```

### 辅助函数

```typescript
// 检查哪些提供商已配置 API Key
getAvailableProviders(): { provider: AIProvider; configured: boolean }[]
```

---

## 二、前端配置管理 (config-loader.ts)

### localStorage 持久化

```typescript
// 从 localStorage 读取
loadApiConfig(): { provider, apiKey, apiBaseUrl } | null

// 保存到 localStorage
saveApiConfig(config): void

// 获取 API 调用参数（用于请求体）
getApiConfigParams(): { apiKey?, apiBaseUrl?, provider? }
```

### 配置流程

1. 用户在 `/setup` 页面选择 provider 并输入 API Key
2. 调用 `saveApiConfig()` 保存到 localStorage
3. 每次 API 调用时通过 `getApiConfigParams()` 获取配置
4. 配置作为请求体参数传给 API 路由
5. API 路由将 `apiKey` 传给 `callAI()` 的 options，覆盖环境变量

---

## 三、API Key 验证

**端点**: `POST /api/ai/validate-key`

用最小化请求验证用户提供的 API Key 是否有效。

---

## 四、提示词管理

`lib/ai/prompts.ts` 包含 5 个 prompt 生成函数：

| 函数 | 用途 | 调用方 |
|---|---|---|
| `chatSystemPrompt(context)` | 简单 AI 对话 | `/api/ai/chat` |
| `reportPrompt({...})` | 文化适应报告 | `/api/ai/report` |
| `simulatePrompt({...})` | 旧版场景模拟 | `/api/ai/simulate` |
| `survivalKitSystemPrompt({...})` | 生存工具包 | `/api/ai/survival-kit` |
| `briefingSystemPrompt({...})` | 每日简报 | `/api/ai/briefing` |

**注意**: Coach/Simulator/Analyst/Kit-Builder 的 prompt 在 `lib/agent/prompts/` 中独立管理。

---

## 修改指南

### 添加新 AI 提供商
1. 在 `providers.ts` 的 AIProvider 类型中添加
2. 在 DEFAULT_BASE_URLS 中添加默认 URL
3. 在 getKeyForProvider 中添加环境变量读取
4. 实现 callXxx 函数
5. 在 callAI / streamAIWithTools 的 switch 中添加分支

### 修改默认模型
- 修改 `callAI` 中各 provider 分支的 model 参数
- 或通过 options.model 运行时覆盖

### 处理 Anthropic 工具调用
- Anthropic 目前不支持 streamAIWithTools
- 如需支持：实现 Anthropic SSE 格式解析
- 临时方案：工具调用时自动切换到 DeepSeek/OpenAI
