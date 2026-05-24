# CulturEase × OSINT 项目融合说明

> **目标读者：** 已 fork 原始 CulturEase 仓库的开发者 / AI 工具。本文档说明在原始 CulturEase 基础上新增了哪些模块、修改了哪些文件，以及如何与这些新增接口对接。

---

## 1. 融合架构总览

```
原始 CulturEase（壳项目）      ←     OSINT 情报雷达项目（移植源）
─────────────────────────────────────────────────────────────
/ (首页)                      保留原始功能，仅文案微调
/setup (入口)                  重写：3D Globe 背景 + 5步问卷 + fly-to 动画
/explore (全球探索)             重写：双模式地图（情报地图 / 日记地图）
/map                           新增：302 重定向 → /explore
/coach, /survival-kit,         保留原始功能，未改动
/toolkit, /diary, /share
```

**关键设计决策：**
- CulturEase 是**壳项目**（接收方），OSINT 组件移植进来
- 3D Globe 作为 `/setup` 入口页面的背景，替代原始静态问卷页
- 两种地图合并到 `/explore`，通过 toggle 切换，不是两个独立页面
- 配色统一为 CulturEase 暖色主题（terracotta/amber/cream/sage/navy）
- 所有原始 CulturEase 功能（AI导师、生存工具包、文化差异、日记档案）完整保留

---

## 2. 新增文件清单

### 2.1 组件（`components/`）

| 文件 | 用途 | 关键 Props / 接口 |
|---|---|---|
| `Globe.tsx` | Three.js 3D 地球，支持城市光点 + fly-to 动画 | `hotspots`, `flyToTarget`, `onFlyComplete`, `onHoldStart`, `onCityHover`, `onCityClick` |
| `RadarMap.tsx` | Leaflet 地图，双模式（intel/diary），Canvas 热力图 | `mode`, `pois`, `diaries`, `heatZones`, `showHeatmap`, `onDiaryClick` |
| `SearchBar.tsx` | 学校/城市搜索下拉框 | `onSelectLocation`, `currentLocation` |
| `CategoryFilter.tsx` | 情报分类筛选按钮组（学术/生活/租房/论坛） | `activeFilter`, `onFilterChange`, `nodeCounts` |
| `StatusBar.tsx` | 地图底部状态栏（坐标/节点数/时间） | `location`, `totalNodes`, `hoveredNode` |
| `NodeDetailPanel.tsx` | 学校情报侧边详情面板（雷达图+POI列表+论坛分析） | `profile`, `selectedPoi`, `onPoiDeselect`, `onClose` |

### 2.2 数据与逻辑（`lib/`）

| 文件 | 用途 |
|---|---|
| `lib/data/intel.ts` | 情报数据：4所学校完整档案（东工大/早稻田/UCL/MIT），含 POI、论坛帖子、热力网格、搜索索引 |
| `lib/search.ts` | 日记全文搜索与相关性排序 |
| `lib/utils.ts` | `cn()` 工具函数（clsx + tailwind-merge） |

### 2.3 页面（`app/`）

| 路由 | 文件 | 说明 |
|---|---|---|
| `/explore` | `app/explore/page.tsx` | 双模式地图主页面 |
| `/map` | `app/map/page.tsx` | 重定向到 `/explore` |

---

## 3. 修改文件清单

### 3.1 `app/layout.tsx`

**改动：** 条件式全屏布局。`/setup` 路由隐藏 NavBar/Footer，使用深色全屏背景；其他路由保持原始布局。

**关键逻辑：**
```ts
const isFullscreen = pathname === '/setup';
// isFullscreen → bg-[#0d1016] h-screen overflow-hidden, 不渲染 NavBar/Footer
// 非全屏 → bg-parchment, 正常渲染 NavBar/Footer
```

**如果你是 fork 开发者：** 如果你需要新增全屏页面，在 `isFullscreen` 条件中加入你的路由即可。NavBar 自身也会在 `/setup` 返回 `null`（见 `components/ui/NavBar.tsx`），两者互相独立。

### 3.2 `app/setup/page.tsx`

**改动：** 完全重写。原始静态问卷页替换为 3D Globe 背景 + 5 步问卷 + fly-to 动画。

**状态机流程：**
```
form (填表) → flying (Globe 旋转+缩放) → holding (城市情报卡停顿1s) → done (路由跳转)
```

**向外部暴露的接口（通过 localStorage）：**
```ts
// 写入 —— setup 完成后
saveUserProfile({
  sourceCountry: string,   // 来源国代码，如 "CN"
  targetCountry: string,   // 目标国代码，如 "GB"
  targetCity: string,      // 城市英文名，如 "London"
  stage: string,           // 阶段，如 "pre-departure"
});

// API 配置 —— 可选，用户填写后
saveApiConfig({
  provider: 'deepseek' | 'openai' | 'anthropic',
  apiKey: string,
  apiBaseUrl: string,
});
```

**读取 —— 所有其他页面检查的键：**
```ts
// localStorage key: "cultur-ease-profile"
const profile = loadUserProfile();
if (!profile) router.replace('/setup'); // 无 profile 强制回 setup
```

**Fly-to 动画的 Globe props 契约：**
```ts
// 设置飞入目标 → Globe 自动执行 rotate(1.2s) → zoom(0.8s) → hold(1s)
<Globe flyToTarget={{ lat, lng, name }} />

// 回调时机
onHoldStart={() => setPhase('holding')}     // hold 阶段开始 → 显示城市情报卡
onFlyComplete={() => router.push('/')}      // 动画全部结束 → 跳转首页
```

### 3.3 `app/explore/page.tsx`

**改动：** 完全重写。融合原始 OSINT 地图和 CulturEase 日记地图。

**对外接口（事件通信）：**
```ts
// NodeDetailPanel → ExplorePage 的跨组件通信
// 通过 CustomEvent 实现，避免 prop drilling
window.dispatchEvent(new CustomEvent('poi-select', { detail: poiId }));
// explore/page.tsx 中监听：
window.addEventListener('poi-select', handler);
```

**双模式数据结构：**
- **Intel 模式：** `PlaceProfile` → `.pois` (PoiItem[]) → 按 `NodeCategory` 筛选
- **Diary 模式：** `DiaryEntry[]` → 按 `country` / `lifeType` 筛选

### 3.4 `app/page.tsx`

**改动：** 微小文案修改（全球探索描述文字）。核心逻辑不变：检查 `loadUserProfile()` → 无则 redirect `/setup`。

### 3.5 `lib/types.ts`

**改动：** 文件头部新增完整 OSINT 类型定义（第 1-145 行）。原始 CulturEase 类型全部保留（第 147 行起）。

**新增的关键类型：**
```ts
type NodeCategory = 'academic' | 'life' | 'housing' | 'forum';

interface PoiItem { id, name, nameEn, category, lat, lng, shortLabel, summary, tags, scores, detail }
interface PlaceProfile { id, name, nameEn, country, city, cityId, lat, lng, zoom, keywords, overview, scores, pois, forumPosts, forumAnalysis, heatZones }
interface HeatZone { id, center, radius, intensity, label, type }
interface SearchLocation { id, cityId, name, nameEn, country, lat, lng, zoom, keywords }

// 分类配置（颜色/图标）
const CATEGORY_CONFIG: Record<NodeCategory, CategoryConfig>
// 维度配置（便利度/成本/安全/噪音/友好度/文化冲击）
const DIMENSION_CONFIG: Record<keyof DimensionScores, DimensionConfig>
```

### 3.6 `package.json`

**新增依赖：**
```json
"@react-three/drei": "^10.7.7",   // Three.js React 工具集
"@react-three/fiber": "^9.6.1",   // Three.js React 渲染器
"framer-motion": "^12.40.0",       // 动画库（问卷过渡、搜索下拉）
"leaflet": "^1.9.4",               // 地图库
"leaflet.heat": "^0.2.0",          // Leaflet 热力插件
"react-leaflet": "^5.0.0",         // Leaflet React 绑定
"three": "^0.184.0",               // Three.js 3D 引擎
"tailwind-merge": "^3.6.0",        // Tailwind 类名合并
"@types/leaflet": "^1.9.21",       // Leaflet 类型定义
```

### 3.7 `app/api/ai/external-search/route.ts`

**改动：** 原有外部搜索 API，仅格式化差异（160 行 diff），功能逻辑未变。

### 3.8 `components/home/GlobalSearch.tsx`

**改动：** 城市搜索组件优化（24 行 diff），主要是 autocomplete 列表的数据源调整。

---

## 4. 关键数据流

### 4.1 用户注册 → 全站可用

```
/setup (用户填表)
  │
  ├─ saveUserProfile({ sourceCountry, targetCountry, targetCity, stage })
  │     └─ localStorage key: "cultur-ease-profile"
  │
  ├─ saveApiConfig({ provider, apiKey, apiBaseUrl })  [可选]
  │     └─ localStorage key: "cultur-ease-api-config"
  │
  └─ handleStartExplore()
        ├─ getCoords(city) → flyTarget → Globe 动画
        └─ router.push('/') → 首页检查 loadUserProfile() !== null ✓
```

### 4.2 情报地图数据加载

```
/explore → useEffect
  │
  ├─ loadUserProfile() → targetCity → getCoords() → centerCoords
  │
  ├─ cityIdMap[targetCity] → getFirstProfileByCityId(cityId)
  │     └─ 返回 PlaceProfile (含 pois, heatZones, forumPosts, forumAnalysis)
  │
  └─ SEARCH_LOCATIONS.find(l => l.cityId === cityId) → setLocation()
```

### 4.3 日记地图数据加载

```
/explore → useEffect
  │
  ├─ loadDiaries() → 用户日记
  ├─ MOCK_DIARIES → 内置 mock 数据
  └─ 合并去重 → setDiaries() → 传入 RadarMap
```

---

## 5. Globe 组件技术细节

### 5.1 依赖与初始化

```ts
// 必须 dynamic import，Three.js 不支持 SSR
const DynamicGlobe = dynamic(() => import('@/components/Globe'), { ssr: false });
```

### 5.2 Hotspots 接口

```ts
interface GlobeProps {
  hotspots?: { id: string; name: string; lat: number; lng: number }[];
  // 如果 hotspots 非空，用这些标记替换默认的 SEARCH_LOCATIONS
  // 如果 hotspots 为空或未传，fallback 到 SEARCH_LOCATIONS（学校标记）
}
```

### 5.3 Fly-to 动画状态机

```
null → { phase:'rotating', targetX, targetY }  // flyToTarget 变化时触发
rotating (1.2s, ease-in cubic) → zooming
zooming (0.8s, ease-out quad) → holding
holding (1.0s) → done → null
         ↑              ↑
    onHoldStart()   onFlyComplete()
```

**坐标系转换：**
```ts
const latRad = (lat * Math.PI) / 180;
const lngRad = (lng * Math.PI) / 180;
// Globe 旋转目标:
targetX = latRad;           // globeGroup.rotation.x
targetY = Math.PI - lngRad; // globeGroup.rotation.y
```

### 5.4 颜色主题

```ts
const COLORS = {
  landCore:  0xE8A87C,  // warm peach
  landMid:   0xC67A53,  // terracotta
  coast:     0xF3EFE8,  // cream
  glow:      0xC19A49,  // amber
  grid:      0x5E7F6B,  // sage
  beam:      0xF3EFE8,  // cream
};
```

### 5.5 渲染管线

Eight layers, z-ordered:
1. Star field (800 stars, additive blending)
2. Outer glow shell (双 shader: Fresnel rim, back-side only)
3. Ocean particles (~1200, 蓝色调)
4. Land particles (~8000, 暖色调渐变)
5. Wireframe sphere (sage, opacity 0.06)
6. Latitude rings (5 条: 0°, ±23.5°, ±66.5°) + meridian lines (每 30°)
7. City hotspot markers (sphere dot + double ring + vertical beam + pulse animation)
8. City-to-city arcs (quadratic bezier, traveling particle dots)

---

## 6. RadarMap 组件技术细节

### 6.1 双模式渲染

```ts
type MapMode = 'intel' | 'diary';

// Intel 模式：分类色 POI 标记 + Canvas 热力图 overlay
// Diary 模式：LifeType 色圆形标记 + Leaflet popup
```

### 6.2 热力图实现

Canvas overlay（非 Leaflet.heat 插件），手写双线性插值：
```ts
// 数据源：HeatZone[] → gridMap (sparse) → bilinear sample → hsla color
// 刷新绑定：map 'move'/'zoom'/'resize' 事件 → requestAnimationFrame
```

### 6.3 地图 tiles

CARTO Voyager（无需 API key）：
```
https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
```

---

## 7. 如果你要接入 / 修改

### 7.1 新增情报数据（学校/城市）

编辑 `lib/data/intel.ts`：

1. 定义 POI 列表 → `yourPois: PoiItem[]`
2. 用 `generateHeatGrid()` 生成热力区
3. 组装 `PlaceProfile` 对象
4. 加入 `ALL_PROFILES` 数组
5. 在 `SEARCH_LOCATIONS` 中加入对应条目

```ts
export const YOUR_PROFILE: PlaceProfile = {
  id: 'unique-id',
  name: '中文名',
  nameEn: 'English Name',
  country: '国家', city: '城市', cityId: 'city-slug',
  lat: xx, lng: xx, zoom: 15,
  keywords: ['关键词1', '关键词2'],
  overview: '一句话描述',
  scores: { convenience: 80, costPressure: 60, safety: 85, noiseLevel: 40, friendliness: 70, cultureShockRisk: 45 },
  pois: yourPois,
  forumPosts: [],
  forumAnalysis: { sentiment:'mixed', sentimentScore:65, cultureShockRisk:45, friendlinessScore:70, topKeywords:[], riskTags:[], highlights:[], summary:'' },
  heatZones: generateHeatGrid(lat, lng, polesArray),
};

// 注册
ALL_PROFILES.push(YOUR_PROFILE);
SEARCH_LOCATIONS.push({ id:'unique-id', cityId:'city-slug', name:'中文名', nameEn:'English', country:'国家', lat, lng, zoom:15, keywords:[...] });
```

### 7.2 自定义 Globe 城市光点

```tsx
<DynamicGlobe
  hotspots={[
    { id: 'tokyo', name: '东京', lat: 35.6762, lng: 139.6503 },
    // ... 最多支持任意数量，arc 自动取前 6 对
  ]}
  onCityClick={(city) => { /* city 类型为 SearchLocation */ }}
  onCityHover={(city) => { /* city 或 null */ }}
  flyToTarget={{ lat: 35.6762, lng: 139.6503, name: '东京' }}
  onFlyComplete={() => router.push('/')}
  onHoldStart={() => setShowIntelCard(true)}
/>
```

### 7.3 添加新的全屏页面

在 `app/layout.tsx` 的 `isFullscreen` 条件中加入你的路由：
```ts
const isFullscreen = pathname === '/setup' || pathname === '/your-route';
```

同时确保该页面内的组件在 isFullscreen 时不需要 NavBar/Footer。

### 7.4 使用 cn() 工具函数

```ts
import { cn } from '@/lib/utils';
// clsx + tailwind-merge 的快捷封装
<div className={cn('base-class', isActive && 'active-class', className)} />
```

### 7.5 与 NodeDetailPanel 通信

```ts
// 在 explore/page.tsx 中监听 POI 选择事件
useEffect(() => {
  const handler = (e: Event) => {
    const poiId = (e as CustomEvent).detail as string;
    // 查找 POI 并设置选中状态
  };
  window.addEventListener('poi-select', handler);
  return () => window.removeEventListener('poi-select', handler);
}, [profile]);
```

---

## 8. 已知注意事项

1. **所有页面必须在客户端渲染后才能访问 localStorage** — 使用 `useEffect` + `useState(mounted)` 模式，否则 SSR 阶段 `localStorage is not defined`。

2. **Three.js / Leaflet 组件必须 dynamic import**：
   ```ts
   const DynamicGlobe = dynamic(() => import('@/components/Globe'), { ssr: false });
   const DynamicRadarMap = dynamic(() => import('@/components/RadarMap'), { ssr: false });
   ```

3. **RadarMap 的 Leaflet 类型断言**：`@types/leaflet` 的 `MapOptions` 不含 `updateWhenIdle`/`updateInterval`，需要通过 `as L.MapOptions` 绕过。

4. **Globe 的 `arcLineGroups`**：必须在 `if/else` 外部声明，否则 animate 闭包无法访问。

5. **profile 检查链**：所有 CulturEase 功能页面（`/coach`、`/survival-kit`、`/toolkit` 等）都会检查 `loadUserProfile()`，无 profile 则 `router.replace('/setup')`。如果你新增页面，需要加入相同检查。

6. **城市中文名 → 坐标**：`getCoords()` 在 `lib/data/cities.ts`，支持中英文名双向查找。如果你新增城市，需要同时更新 `CITY_COORDS` 和 `CITY_NAME_MAP`。

---

## 9. 文件树变更摘要

```
 CulturEase/
 ├── app/
 │   ├── explore/page.tsx        ← 重写（双模式地图）
 │   ├── layout.tsx              ← 修改（条件全屏）
 │   ├── map/page.tsx            ← 新增（302 → /explore）
 │   ├── page.tsx                ← 修改（微调文案）
 │   └── setup/page.tsx          ← 重写（Globe 入口 + 5步 + fly-to）
 ├── components/
 │   ├── CategoryFilter.tsx      ← 新增
 │   ├── Globe.tsx               ← 新增（Three.js 3D 地球）
 │   ├── NodeDetailPanel.tsx     ← 新增
 │   ├── RadarMap.tsx            ← 新增（Leaflet 双模式地图）
 │   ├── SearchBar.tsx           ← 新增
 │   └── StatusBar.tsx           ← 新增
 ├── lib/
 │   ├── data/intel.ts           ← 新增（情报数据 + mock）
 │   ├── search.ts               ← 新增（日记搜索）
 │   ├── types.ts                ← 修改（头部新增 OSINT 类型）
 │   └── utils.ts                ← 新增（cn 工具）
 └── package.json                ← 修改（新增 10 个依赖）
```

---

*最后更新: 2026-05-24 · Turbopack build ✓*
