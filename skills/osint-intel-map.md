# OSINT 情报雷达 (Intel Radar Map)

## 概述

基于 Leaflet 的交互式地图，整合 POI 节点、论坛情感分析、热力图层和留学日记标记。双模式切换：情报视图 / 日记视图。

## 核心文件

| 文件 | 职责 |
|---|---|
| `app/explore/page.tsx` | 全球探索页面主入口：地图 + 搜索栏 + 分类过滤 + 状态栏 |
| `components/RadarMap.tsx` | 核心地图组件：Leaflet 集成热力图层 + POI 标记 + 日记标记 |
| `components/Globe.tsx` | Three.js 3D 地球：用于 /setup 页面选目的地 |
| `components/SearchBar.tsx` | 学校搜索栏：自动补全 |
| `components/CategoryFilter.tsx` | 情报分类过滤器：学术/生活/租房/论坛 |
| `components/NodeDetailPanel.tsx` | 节点详情面板：POI 信息 + 论坛信号 |
| `components/StatusBar.tsx` | 底部状态栏 |
| `lib/data/intel.ts` | 4 所学校情报数据 |
| `lib/data/cities.ts` | 25 个城市经纬度 + 中英文名称映射 |

## 数据结构

### PlaceProfile（学校/地点完整画像）
```typescript
interface PlaceProfile {
  id: string;
  name: string; nameEn: string;
  lat: number; lng: number;
  scores: DimensionScores;          // 六维评分
  pois: PoiItem[];                   // POI 节点列表
  heatZones: HeatZone[];            // 热力区域
  forumAnalysis?: ForumAnalysisResult; // 论坛分析
}
```

### PoiItem（情报节点）
```typescript
interface PoiItem {
  id: string; name: string; nameEn: string;
  category: NodeCategory;  // "academic" | "life" | "housing" | "forum"
  lat: number; lng: number;
  shortLabel: string;       // 地图标注缩写
  summary: string;          // 一句话概述
  tags: string[];
  scores: DimensionScores;
  detail: {
    highlights: string[];    // 亮点
    warnings: string[];      // 注意事项
    recommendation: string;  // 一句话建议
    forumSignals: string[];  // 论坛信号
  };
}
```

### DimensionScores（六维评分）
```typescript
interface DimensionScores {
  convenience: number;       // 便利度
  costPressure: number;      // 成本压力
  safety: number;            // 安全
  noiseLevel: number;        // 噪音
  friendliness: number;     // 友好度
  cultureShockRisk: number; // 文化冲击风险
}
```

### HeatZone（热力区域）
```typescript
interface HeatZone {
  id: string;
  center: [number, number];
  radius: number;      // 米
  intensity: number;   // 0-1
  label: string;
  type: "culture-shock" | "cost" | "safety" | "noise";
}
```

### ForumAnalysisResult（论坛情感分析）
```typescript
interface ForumAnalysisResult {
  sentimentScore: number;     // -1 到 1
  keywords: string[];
  riskTags: string[];
  summary: string;
  posts: ForumPost[];         // 来源：知乎/小红书/Reddit/5ch
}
```

## 4 所学校情报数据

| 学校 | 位置 | 节点数 |
|---|---|---|
| 东京工业大学 | 东京 | ~8 个 POI + 热力图 + 论坛分析 |
| 早稻田大学 | 东京 | ~6 个 POI + 热力图 |
| UCL | 伦敦 | ~6 个 POI + 热力图 |
| MIT | 波士顿 | ~6 个 POI + 热力图 |

每所学校包含：
- 学术节点（主校区、图书馆、实验室）
- 生活节点（食堂、便利店、健身房）
- 租房节点（推荐区域、避坑区域）
- 论坛节点（知乎/小红书讨论热点）
- 热力网格（自动生成的文化冲击/成本热力分布）

## 热力网格生成算法

```typescript
// lib/data/intel.ts
function generateHeatGrid(centerLat, centerLng, poles, gridSize, radius): HeatZone[] {
  // 在中心点周围生成网格
  // 每个网格点根据到各个风险极点的距离计算强度
  // 只保留强度 > 0.05 的区域
  // 返回 HeatZone 数组供 Leaflet.heat 使用
}
```

## 地图双模式

1. **情报视图**: 热力图层 + POI 标记点（彩色圆圈，按分类着色）
2. **日记视图**: 日记标记点（显示日记卡片预览）

## 3D 地球 (Globe)

**文件**: `components/Globe.tsx`

- 基于 Three.js + @react-three/fiber + @react-three/drei
- 显示热点标记（目标城市位置）
- 支持飞行动画：点击城市 → 相机旋转到对应经纬度
- 用于 `/setup` 页面选择目的地

### 关键配置
```typescript
// 地球纹理和标记
// 热点数据来自 CITY_DATA 中的城市坐标
// 飞行: camera.position 动画过渡到目标经纬度
```

## 城市数据

`lib/data/cities.ts` 提供 25 个城市的：
- 经纬度坐标 `getCoords(cityName)`
- 中英文名称双向映射 `CITY_EN_TO_CN` / `CITY_NAME_MAP`
- 自动补全列表 `ALL_CITY_NAMES`

## 修改指南

- **添加学校**: 在 `lib/data/intel.ts` 中新增 PlaceProfile → 添加 POI 列表 → 配置热力极点 → 生成热力网格
- **添加城市**: 在 `lib/data/cities.ts` 中添加坐标 → 在 `lib/data/mock-diaries.ts` 中添加 CITY_DATA
- **修改热力图**: 调整 `generateHeatGrid` 的 gridSize 和 radius 参数
- **切换地图模式**: 修改 RadarMap 组件的 mode state
