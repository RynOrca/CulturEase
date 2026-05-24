# CulturEase Skill 包

面向 AI 代理（如 Claude Code）的 CulturEase 项目技能定义包。每个 skill 文件详细描述一个功能模块的架构、核心文件、数据流和修改指南。

## 技能索引

### 核心 AI 功能

| Skill | 文件 | 说明 |
|---|---|---|
| **AI 导师对话** | [coach-conversation.md](coach-conversation.md) | Coach Agent 架构：7 个工具、Agent Loop、Intent 标记系统、子 Agent 委托、对话记忆 |
| **场景模拟训练** | [scenario-simulation.md](scenario-simulation.md) | 8 种场景的沉浸式语言训练：Simulator Agent、语言映射、GOAL_ACHIEVED 机制 |
| **文化冲击分析** | [culture-analysis.md](culture-analysis.md) | AI 日记分析：Analyst Agent、五维评分、3 小时缓存策略、首页展示 |
| **生存工具包** | [survival-kit.md](survival-kit.md) | 6 大类准备清单：Kit Builder Agent、进度追踪、Coach 对话式交互 |

### 搜索与内容

| Skill | 文件 | 说明 |
|---|---|---|
| **智能搜索** | [smart-search.md](smart-search.md) | HomeInput 双模式（Agent/搜索）：AI 总结 + 日记匹配 + 外部平台深链接 |
| **文化内容生成** | [content-generation.md](content-generation.md) | 5 个内容 API：测验、节日建议、文化场景、适应报告、每日简报 |

### 数据与可视化

| Skill | 文件 | 说明 |
|---|---|---|
| **OSINT 情报雷达** | [osint-intel-map.md](osint-intel-map.md) | Leaflet 双模式地图：POI 节点、热力图层、论坛分析、3D 地球 |
| **留学日记系统** | [diary-system.md](diary-system.md) | 日记 CRUD：全文搜索、评论互动、点赞、匿名发布、30 篇 Mock 数据 |

### 基础设施

| Skill | 文件 | 说明 |
|---|---|---|
| **AI 基础设施** | [ai-infrastructure.md](ai-infrastructure.md) | 多提供商 AI 调用层：DeepSeek/OpenAI/Anthropic、流式+工具调用、配置管理 |
| **数据持久化层** | [data-layer.md](data-layer.md) | localStorage 全量持久化：15 个 key、缓存策略、Agent 对话记忆 |

## 项目架构速览

```
app/
├── page.tsx                    # 首页：HomeInput + 文化分析 + 日记卡片
├── setup/page.tsx              # 设置向导：3D 地球选目的地
├── explore/page.tsx            # 全球探索：OSINT 情报雷达地图
├── coach/page.tsx              # AI 导师：报告 + 对话 + 场景模拟
├── survival-kit/page.tsx       # 生存工具包：6 大类清单
├── toolkit/page.tsx            # 文化工具箱：场景 + 节日 + 测验
├── diary/                      # 日记列表 + 日记详情
├── share/page.tsx              # 写新日记
├── city/[slug]/page.tsx        # 城市详情
└── api/
    ├── agent/                  # 4 个 Agent 端点 (SSE 流式)
    │   ├── coach/              #   AI 导师（主 Agent）
    │   ├── simulate/           #   场景模拟
    │   ├── analyze/            #   文化分析
    │   └── survival-kit/       #   清单生成
    └── ai/                     # 13 个 AI 端点（请求-响应）
        ├── chat/               #   简单对话
        ├── search/             #   智能搜索
        ├── external-search/    #   外部平台链接
        ├── report/             #   文化报告
        ├── briefing/           #   每日简报
        ├── culture-analysis/   #   文化冲击分析
        ├── quiz/               #   文化测验
        ├── holiday-suggestions/#   节日建议
        ├── cultural-scenarios/ #   文化场景
        ├── survival-kit/       #   工具包生成
        ├── simulate/           #   旧版场景模拟
        ├── simulate-conversation/ # 新版交互式场景
        └── validate-key/       #   API Key 验证

lib/
├── agent/                      # Agent 架构
│   ├── agents/                 # 4 个 Agent 定义
│   ├── prompts/                # 4 个 Agent Prompt
│   ├── tools/                  # 7 个 Tool 定义 + 执行器
│   ├── loop.ts                 # Agent Loop 主循环
│   ├── types.ts                # 类型系统
│   ├── useAgent.ts             # 前端 Hook
│   ├── memory.ts               # 对话记忆
│   └── registry.ts             # Agent 注册表
├── ai/                         # AI 调用层
│   ├── providers.ts            # 多提供商统一封装
│   ├── prompts.ts              # 旧版 Prompt
│   └── config-loader.ts        # 前端配置管理
├── data/                       # 数据模块
│   ├── mock-diaries.ts         # 30 篇 Mock 日记 + 城市评分
│   ├── intel.ts                # 4 所学校情报数据
│   ├── scenarios.ts            # 12 个预置文化场景
│   └── cities.ts               # 25 个城市坐标
├── storage.ts                  # localStorage 持久化
├── search.ts                   # 日记全文搜索
├── types.ts                    # 全局类型定义
└── utils.ts                    # Tailwind 工具函数
```

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 + Framer Motion |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| 地图 | Leaflet + react-leaflet + leaflet.heat |
| 图表 | Chart.js + react-chartjs-2 |
| AI | DeepSeek (deepseek-chat) / OpenAI (gpt-4o-mini) / Anthropic (claude-sonnet-4-6) |
| 数据 | localStorage 客户端持久化 |
