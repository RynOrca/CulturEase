# 改动日志 / Changelog

> 所有项目改动均记录在此文件中。
> All project changes are tracked in this file.

---

## 2026-05-24

### 新增：CHANGELOG.md 文件

- 创建了本文件，用于追踪所有项目改动。
- 根据用户要求，从此之后所有代码改动、新增功能、bug 修复、重构等都需要在此记录。
- 对之前的改动若有完善/更新，也在此文件中同步更新记录。

---

### Task 1：外部平台搜索添加留学标签

**文件修改：**
- `app/api/ai/external-search/route.ts`

**改动内容：**
- 添加 `SEARCH_TAGS` 常量：`["留学", "文化冲击", "culture shock", "留学生活"]`
- 在生成各平台深层链接时，将标签追加到搜索关键词中，使搜索结果更贴合留学场景
- 用户搜索任意内容（如"租房"）时，实际搜索词变为"租房 留学 文化冲击 culture shock 留学生活"，帮助找到更相关的留学内容

---

### Task 2：AI 分析无日记时补充文化冲击与俗语

**文件修改：**
- `app/api/ai/culture-analysis/route.ts`
- `app/page.tsx`（前端展示层）

**改动内容：**
- 增加 `hasNoDiaries` 变量，无日记时在 prompt 中显式要求 AI 输出：
  - 常见文化冲击（社交礼仪、饮食文化、沟通风格等）
  - 当地俗语/俚语（`localSayings` 字段，2-3条，含中文解释）
- 前端 `CultureAnalysis` 类型增加 `localSayings?: string[]`
- 在分析结果中新增"当地俗语 · 俚语"展示区块，用 💬 图标标识

---

### Task 3：AI 导师下新增"知识测试"模块

**新增文件：**
- `app/api/ai/quiz/route.ts` — AI 生成 5 道文化冲击选择题的 API
- `components/quiz/QuizSection.tsx` — 测验交互组件

**文件修改：**
- `app/coach/page.tsx` — 在场景模拟下方引入 QuizSection

**改动内容：**
- API 根据用户目标城市/国家生成 5 道多选题，覆盖社交礼仪、日常生活、沟通风格等文化差异场景
- QuizSection 组件支持完整的测验流程：
  - **idle** → 展示"开始测试"按钮
  - **loading** → 加载动画
  - **playing** → 逐题展示选项，含进度条
  - **answered** → 回答正确显示恭喜 + 解释；回答错误显示**文化冲击对比**与**正确做法**
  - **completed** → 显示得分 + 每道题完整回顾，可重新测试

---

### Task 4："文化差异"模块新增"此心安处"节日反失落专区

**新增文件：**
- `app/api/ai/holiday-suggestions/route.ts` — AI 根据目的地生成节日指南的 API
- `components/toolkit/HolidaySection.tsx` — 节日反失落交互组件

**文件修改：**
- `app/toolkit/page.tsx` — 在文化对比卡片下方引入 HolidaySection

**改动内容：**
- 专区名："此心安处"（出自苏轼"此心安处是吾乡"，寓意在异乡找到归属）
- 覆盖的节日：春节、元宵节、端午、中秋、冬至、感恩节（美/加）、圣诞节/元旦
- 每个节日提供三个维度的解决方案：
  1. **🛒 家乡味道 · 食材采购** — 具体到目标城市的食材购买地点（中超、唐人街等）
  2. **🎉 当地替代 · 新的体验** — 当地同期可参与的庆祝活动或传统
  3. **🤝 新的联结 · 此心安处** — 如何建立新传统、邀请当地朋友、融合两种文化
- 核心信息：不是让你忘记乡愁，而是帮你建立新的联结
- 后续移除各小项前的 emoji（🛒 🎉 🤝）

---

### Task 5：文化差异指南改为 AI 驱动 + 加载更多

**新增文件：**
- `app/api/ai/cultural-scenarios/route.ts` — AI 根据用户出发地→目的地生成文化对比场景的 API

**文件修改：**
- `app/toolkit/page.tsx` — 全面重构，从静态数据改为 AI 动态生成

**改动内容：**
- 移除对硬编码 `CULTURAL_SCENARIOS` 的依赖，改为点击"生成"后由 AI 根据用户的具体国家/城市对生成 10 个定制化文化对比场景
- 首屏显示 CTA，引导用户生成个性化内容
- 初始显示 5 个卡片，点击"展开更多"可逐步查看更多
- 所有场景显示完毕后，底部提示"可以试试在主页询问 AI 哦~"
- 仍保留分类筛选（按生活类型）和卡片展开/收起交互
- 保留"重新生成"功能，可随时刷新内容

---

### Task 6：文化差异指南 & 此心安处 加入持久缓存

**文件修改：**
- `lib/storage.ts` — 新增 `CachedCulturalScenarios`、`CachedHolidaySuggestions` 缓存类型及存取函数
- `app/toolkit/page.tsx` — 页面加载时优先从缓存读取，无缓存时自动生成，生成后持久化到 localStorage
- `components/toolkit/HolidaySection.tsx` — 同上，首次自动获取后缓存，每次访问直接展示

**改动内容：**
- 文化差异指南首次生成后自动保存到 `cultur-ease-cultural-scenarios`，后续访问直接读取（缓存含出发地/目的地校验）
- 此心安处首次生成后自动保存到 `cultur-ease-holiday-suggestions`，后续访问直接读取
- 只有点击"重新生成"才会重新请求 AI 并更新缓存
- 切换目的地后缓存自动失效，重新生成
