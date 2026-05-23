export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  city: string;
  country: string;
  school?: string;
  lifeType: LifeType;
  stage: JourneyStage;
  rating: number; // 1-5
  likes: number;
  anonymous: boolean;
  authorName: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export type LifeType =
  | "housing"
  | "commute"
  | "social"
  | "healthcare"
  | "work"
  | "expenses"
  | "safety"
  | "other";

export type JourneyStage =
  | "pre-departure"
  | "week-1"
  | "month-1"
  | "month-3"
  | "year-1"
  | "beyond";

export interface CityData {
  name: string;
  country: string;
  lat: number;
  lng: number;
  scores: CultureShockScores;
  diaryCount: number;
}

export interface CultureShockScores {
  housing: number;    // 房租压力（越高越贵）
  social: number;     // 社交融入难度（越高越难）
  language: number;   // 语言障碍（越高越难）
  convenience: number; // 生活便利度（越高越方便）
  safety: number;     // 安全指数（越高越安全）
  value: number;      // 性价比（越高越值）
}

export interface CulturalScenario {
  id: string;
  title: string;
  category: LifeType;
  sourceCountry: string;
  targetCountry: string;
  sourceBehavior: string;
  targetBehavior: string;
  howToAdapt: string;
  realQuote: string;
  quoteAuthor: string;
  tags: string[];
}

export interface DiaryComment {
  id: string;
  diaryId: string;
  content: string;
  authorName: string;
  authorKey: string;
  timestamp: number;
}

export interface CityCoord {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const LIFE_TYPE_LABELS: Record<LifeType, string> = {
  housing: "房租住宿",
  commute: "日常通勤",
  social: "社交融入",
  healthcare: "看病医疗",
  work: "打工兼职",
  expenses: "日常开销",
  safety: "安全提醒",
  other: "其他",
};

export const STAGE_LABELS: Record<JourneyStage, string> = {
  "pre-departure": "出发前",
  "week-1": "第1周",
  "month-1": "第1个月",
  "month-3": "第3个月",
  "year-1": "第1年",
  "beyond": "1年以上",
};

export const COUNTRY_NAMES: Record<string, string> = {
  GB: "英国",
  US: "美国",
  AU: "澳大利亚",
  CA: "加拿大",
  JP: "日本",
  KR: "韩国",
  DE: "德国",
  FR: "法国",
  SG: "新加坡",
  CN: "中国",
};

// ─── Survival Kit ──────────────────────────────────────────────────────

export interface SurvivalKitItem {
  text: string;
  tip?: string;
  checked: boolean;
}

export interface SurvivalKitSection {
  id: string;
  title: string;
  items: SurvivalKitItem[];
}

export interface SurvivalKit {
  sections: SurvivalKitSection[];
}

// ─── Culture Shock Simulator ───────────────────────────────────────────

export interface SimMessage {
  role: "user" | "ai";
  content: string;
  feedback?: string;
}

export interface SimSession {
  scenario: string;
  aiRole: string;
  messages: SimMessage[];
  completed: boolean;
  report?: string;
}

export const SIM_SCENARIOS = [
  { id: "renting", label: "租房沟通", icon: "building" },
  { id: "healthcare", label: "看病预约", icon: "hospital" },
  { id: "social", label: "社交破冰", icon: "users" },
  { id: "academic", label: "学术讨论", icon: "book" },
  { id: "work", label: "兼职面试", icon: "briefcase" },
  { id: "emergency", label: "紧急情况", icon: "alert" },
  { id: "shopping", label: "购物退货", icon: "cart" },
  { id: "banking", label: "银行业务", icon: "bank" },
] as const;
