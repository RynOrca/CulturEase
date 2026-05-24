# 留学日记系统 (Diary System)

## 概述

完整的日记 CRUD 系统，包含全文搜索、评论互动、点赞、匿名发布。30 篇 Mock 日记覆盖 25 个城市的真实留学经验。

## 核心文件

| 文件 | 职责 |
|---|---|
| `lib/data/mock-diaries.ts` | 30 篇 Mock 日记 + 25 个城市六维评分 (CITY_DATA) |
| `lib/storage.ts` | localStorage 全量持久化：日记/评论/点赞/作者信息 |
| `lib/search.ts` | 日记全文检索 + 相关性排序算法 |
| `app/share/page.tsx` | 写新日记页面 |
| `app/diary/page.tsx` | 日记列表页（全部日记 + 筛选排序） |
| `app/diary/[id]/page.tsx` | 日记详情页（全文 + 地图定位 + 评论区） |
| `components/diary/DiaryCard.tsx` | 日记卡片组件 |
| `lib/types.ts` | DiaryEntry 类型定义 |

## DiaryEntry 类型

```typescript
interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  city: string;
  school?: string;
  lifeType: LifeType;      // housing/commute/social/healthcare/work/expenses/safety/other
  stage: JourneyStage;     // 出发前/第1周/第1月/第3月/第1年/1年以上
  rating?: number;          // 1-5 城市评分
  authorName: string;       // 匿名显示
  authorKey: string;        // localStorage 生成的匿名标识
  likes: number;
  timestamp: number;
  location?: { lat: number; lng: number };
}
```

## 生活分类 (LifeType)

```typescript
type LifeType = "housing" | "commute" | "social" | "healthcare" | "work" | "expenses" | "safety" | "other";

const LIFE_TYPE_LABELS = {
  housing: "住宿", commute: "交通", social: "社交",
  healthcare: "医疗", work: "兼职/学业", expenses: "花费",
  safety: "安全", other: "其他"
};
```

## 留学阶段 (JourneyStage)

```typescript
type JourneyStage = "pre-departure" | "week1" | "month1" | "month3" | "year1" | "year1+";
```

## localStorage 持久化

| Key | 内容 | 操作函数 |
|---|---|---|
| `cultur-ease-diaries` | DiaryEntry[] | loadDiaries / saveDiaries / addDiary / deleteDiary |
| `cultur-ease-comments` | DiaryComment[] | loadComments / addComment / deleteComment |
| `cultur-ease-liked` | string[] (diary IDs) | loadLikedSet / toggleLiked |
| `cultur-ease-author-key` | string (匿名标识) | getAuthorKey |
| `cultur-ease-author-name` | string (显示名) | getAuthorName / setAuthorName |

## 评论系统

```typescript
interface DiaryComment {
  id: string;
  diaryId: string;
  authorName: string;
  content: string;
  timestamp: number;
}
```

- 评论按时间倒序排列
- 删除日记时自动清理关联评论
- 匿名发布（使用 authorKey）

## 日记搜索

```typescript
// lib/search.ts
function searchDiaries(diaries: DiaryEntry[], query: string): DiaryEntry[] {
  // 对标题和内容进行中文分词匹配
  // 标题匹配权重 > 内容匹配权重
  // 返回按相关性排序的结果
}
```

## Mock 日记概况

30 篇 Mock 日记覆盖：
- 25 个城市、9 个国家
- 8 种生活分类
- 6 个留学阶段
- 真实留学场景：租房经历、看病体验、社交技巧、文化冲击、语言障碍等

每篇包含标题、内容、城市、学校、分类、阶段、评分。

## 城市六维评分 (CITY_DATA)

```typescript
interface CityData {
  name: string;
  scores: {
    housing: number;      // 房租压力
    social: number;       // 社交难度
    language: number;     // 语言障碍
    convenience: number;  // 生活便利
    safety: number;       // 安全指数
    value: number;        // 性价比
  };
  diaryCount: number;
}
```

25 个城市的评分数据存储在 `lib/data/mock-diaries.ts` 的 CITY_DATA 中。

## 页面路由

| 路由 | 功能 |
|---|---|
| `/diary` | 全部日记列表，支持按分类筛选和排序（最新/最热） |
| `/diary/[id]` | 日记详情：全文 + Leaflet 地图定位 + 评论区（增删） |
| `/share` | 写新日记：标题/内容/城市/学校/分类/阶段/评分/匿名选项 |
| `/city/[slug]` | 城市详情：文化冲击雷达图 + 关联日记列表 |

## 修改指南

- **添加 Mock 日记**: 在 `lib/data/mock-diaries.ts` 的 MOCK_DIARIES 数组中添加
- **添加城市评分**: 在 CITY_DATA 对象中添加
- **修改搜索算法**: 编辑 `lib/search.ts`
- **添加日记字段**: 修改 `lib/types.ts` 的 DiaryEntry → 更新 share 表单 → 更新 DiaryCard 展示
