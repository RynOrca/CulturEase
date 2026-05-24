// ==================== OSINT 情报雷达类型 ====================

export type NodeCategory = 'academic' | 'life' | 'housing' | 'forum';
export type NodePriority = 'high' | 'medium' | 'low';

export interface PoiItem {
  id: string;
  name: string;
  nameEn: string;
  category: NodeCategory;
  lat: number;
  lng: number;
  shortLabel: string;
  summary: string;
  tags: string[];
  scores: DimensionScores;
  detail: PoiDetail;
}

export interface DimensionScores {
  convenience: number;
  costPressure: number;
  safety: number;
  noiseLevel: number;
  friendliness: number;
  cultureShockRisk: number;
}

export interface PoiDetail {
  highlights: string[];
  warnings: string[];
  recommendation: string;
  forumSignals?: string[];
}

export interface ForumPost {
  id: string;
  source: string;
  author?: string;
  text: string;
  createdAt?: string;
}

export interface ForumAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'mixed' | 'negative';
  sentimentScore: number;
  sentimentBreakdown?: { positive: number; neutral: number; negative: number };
  cultureShockRisk: number;
  friendlinessScore: number;
  topKeywords: string[];
  riskTags: string[];
  highlights: string[];
  summary: string;
}

export interface PlaceProfile {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  city: string;
  cityId: string;
  lat: number;
  lng: number;
  zoom: number;
  keywords: string[];
  overview: string;
  scores: DimensionScores;
  pois: PoiItem[];
  forumPosts: ForumPost[];
  forumAnalysis: ForumAnalysisResult;
  heatZones: HeatZone[];
}

export interface HeatZone {
  id: string;
  center: [number, number];
  radius: number;
  intensity: number;
  label: string;
  type: 'culture-shock' | 'cost' | 'safety' | 'noise';
}

export interface SearchLocation {
  id: string;
  cityId: string;
  name: string;
  nameEn: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
  keywords: string[];
}

export interface SchoolSearchResult {
  profile: PlaceProfile;
  location: SearchLocation;
}

export interface CategoryConfig {
  label: string;
  labelEn: string;
  color: string;
  glowColor: string;
  icon: string;
}

export const CATEGORY_CONFIG: Record<NodeCategory, CategoryConfig> = {
  academic: {
    label: '学术情报', labelEn: 'Academic',
    color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', icon: '◈',
  },
  life: {
    label: '生活环境', labelEn: 'Life',
    color: '#00ffb2', glowColor: 'rgba(0, 255, 178, 0.4)', icon: '◎',
  },
  housing: {
    label: '租房信息', labelEn: 'Housing',
    color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.4)', icon: '⬡',
  },
  forum: {
    label: '论坛讨论', labelEn: 'Forum',
    color: '#a78bfa', glowColor: 'rgba(167, 139, 250, 0.4)', icon: '◇',
  },
};

export const PRIORITY_CONFIG: Record<NodePriority, { label: string; pulseSpeed: string }> = {
  high: { label: '高优先', pulseSpeed: '1.5s' },
  medium: { label: '中优先', pulseSpeed: '2s' },
  low: { label: '低优先', pulseSpeed: '3s' },
};

export interface DimensionConfig {
  label: string; labelEn: string; description: string; invertColor?: boolean;
}

export const DIMENSION_CONFIG: Record<keyof DimensionScores, DimensionConfig> = {
  convenience: { label: '便利度', labelEn: 'Convenience', description: '通勤、购物、医疗可达程度' },
  costPressure: { label: '生活成本压力', labelEn: 'Cost Pressure', description: '日常消费和租房负担', invertColor: true },
  safety: { label: '安全度', labelEn: 'Safety', description: '治安与夜间安全程度' },
  noiseLevel: { label: '噪音水平', labelEn: 'Noise Level', description: '环境噪音与施工干扰', invertColor: true },
  friendliness: { label: '国际友好度', labelEn: 'Friendliness', description: '英语支持与外国学生适应度' },
  cultureShockRisk: { label: '文化冲击风险', labelEn: 'Culture Shock Risk', description: '文化差异适应难度', invertColor: true },
};

// ==================== CulturEase 旅行文化类型 ====================

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  city: string;
  country: string;
  school?: string;
  lifeType: LifeType;
  stage: JourneyStage;
  rating: number;
  likes: number;
  anonymous: boolean;
  authorName: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export type LifeType = 'housing' | 'commute' | 'social' | 'healthcare' | 'work' | 'expenses' | 'safety' | 'other';

export type JourneyStage = 'pre-departure' | 'week-1' | 'month-1' | 'month-3' | 'year-1' | 'beyond';

export interface CityData {
  name: string;
  country: string;
  lat: number;
  lng: number;
  scores: CultureShockScores;
  diaryCount: number;
}

export interface CultureShockScores {
  housing: number; social: number; language: number;
  convenience: number; safety: number; value: number;
}

export interface CulturalScenario {
  id: string; title: string; category: LifeType;
  sourceCountry: string; targetCountry: string;
  sourceBehavior: string; targetBehavior: string;
  howToAdapt: string; realQuote: string; quoteAuthor: string; tags: string[];
}

export interface DiaryComment {
  id: string; diaryId: string; content: string;
  authorName: string; authorKey: string; timestamp: number;
}

export interface CityCoord {
  city: string; country: string; lat: number; lng: number;
}

export const LIFE_TYPE_LABELS: Record<LifeType, string> = {
  housing: '房租住宿', commute: '日常通勤', social: '社交融入',
  healthcare: '看病医疗', work: '打工兼职', expenses: '日常开销',
  safety: '安全提醒', other: '其他',
};

export const STAGE_LABELS: Record<JourneyStage, string> = {
  'pre-departure': '出发前', 'week-1': '第1周', 'month-1': '第1个月',
  'month-3': '第3个月', 'year-1': '第1年', 'beyond': '1年以上',
};

export const COUNTRY_NAMES: Record<string, string> = {
  GB: '英国', US: '美国', AU: '澳大利亚', CA: '加拿大',
  JP: '日本', KR: '韩国', DE: '德国', FR: '法国', SG: '新加坡', CN: '中国',
};

export const LIFE_TYPE_COLORS: Record<string, string> = {
  housing: '#C4744E', commute: '#4A8C7E', social: '#C19A49',
  healthcare: '#B8443C', work: '#5E7F6B', expenses: '#4A7B9D',
  safety: '#9B5F4A', other: '#7B8B8E',
};

export interface SurvivalKitItem { text: string; tip?: string; checked: boolean; }
export interface SurvivalKitSection { id: string; title: string; items: SurvivalKitItem[]; }
export interface SurvivalKit { sections: SurvivalKitSection[]; }

export interface SimMessage { role: 'user' | 'ai'; content: string; feedback?: string; }
export interface SimSession { scenario: string; aiRole: string; messages: SimMessage[]; completed: boolean; report?: string; }

export const SIM_SCENARIOS = [
  { id: 'renting', label: '租房沟通', icon: 'building' },
  { id: 'healthcare', label: '看病预约', icon: 'hospital' },
  { id: 'social', label: '社交破冰', icon: 'users' },
  { id: 'academic', label: '学术讨论', icon: 'book' },
  { id: 'work', label: '兼职面试', icon: 'briefcase' },
  { id: 'emergency', label: '紧急情况', icon: 'alert' },
  { id: 'shopping', label: '购物退货', icon: 'cart' },
  { id: 'banking', label: '银行业务', icon: 'bank' },
] as const;
