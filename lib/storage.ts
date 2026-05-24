import { DiaryEntry, DiaryComment, CulturalScenario } from "./types";

export function loadDiaries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cultur-ease-diaries");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDiaries(diaries: DiaryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-diaries", JSON.stringify(diaries));
}

export function addDiary(diary: DiaryEntry): DiaryEntry[] {
  const diaries = loadDiaries();
  diaries.unshift(diary);
  saveDiaries(diaries);
  return diaries;
}

export function likeDiary(id: string): DiaryEntry[] {
  const diaries = loadDiaries();
  const updated = diaries.map((d) =>
    d.id === id ? { ...d, likes: d.likes + 1 } : d
  );
  saveDiaries(updated);
  return updated;
}

export function loadUserProfile(): { sourceCountry: string; targetCountry: string; targetCity: string; stage: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("cultur-ease-profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: { sourceCountry: string; targetCountry: string; targetCity: string; stage: string }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-profile", JSON.stringify(profile));
}

export function loadDemoFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("cultur-ease-demo") === "true";
}

export function setDemoFlag(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-demo", "true");
}

// ─── Survival Kit Progress ─────────────────────────────────────────────

export function loadKitProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("cultur-ease-kit-progress");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveKitProgress(progress: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-kit-progress", JSON.stringify(progress));
}

export function toggleKitItem(itemKey: string): Record<string, boolean> {
  const progress = loadKitProgress();
  progress[itemKey] = !progress[itemKey];
  saveKitProgress(progress);
  return progress;
}

// ─── Survival Kit Cached Data ──────────────────────────────────────────

export function loadCachedKit(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("cultur-ease-kit");
  } catch {
    return null;
  }
}

export function saveCachedKit(kitJson: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-kit", kitJson);
}

// ─── Culture Analysis Cache ──────────────────────────────────────────

const ANALYSIS_CACHE_KEY = "cultur-ease-analysis-cache";
const ANALYSIS_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

export interface CachedAnalysis {
  analysis: object;
  timestamp: number;
  diaryCount: number;
  targetCity: string;
}

export function loadCachedAnalysis(): CachedAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANALYSIS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(cache: CachedAnalysis): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
}

export function isAnalysisStale(cached: CachedAnalysis, currentDiaryCount: number, currentCity: string): boolean {
  if (Date.now() - cached.timestamp > ANALYSIS_CACHE_TTL) return true;
  if (cached.diaryCount !== currentDiaryCount) return true;
  if (cached.targetCity !== currentCity) return true;
  return false;
}

// ─── AI Briefing Cache ─────────────────────────────────────────────────

export function loadCachedBriefing(): { text: string; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("cultur-ease-briefing");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedBriefing(briefing: { text: string; timestamp: number }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-briefing", JSON.stringify(briefing));
}

// ─── Liked Diary IDs ────────────────────────────────────────────────

const LIKED_KEYS = "cultur-ease-liked";

export function loadLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LIKED_KEYS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveLikedSet(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIKED_KEYS, JSON.stringify([...ids]));
}

export function toggleLiked(id: string): boolean {
  const set = loadLikedSet();
  const has = set.has(id);
  if (has) set.delete(id);
  else set.add(id);
  saveLikedSet(set);
  return !has; // returns new state: true = liked, false = unliked
}

export function deleteDiary(id: string): DiaryEntry[] {
  const diaries = loadDiaries().filter((d) => d.id !== id);
  saveDiaries(diaries);
  // Also clean up orphaned comments
  const comments = loadAllComments().filter((c) => c.diaryId !== id);
  saveAllComments(comments);
  return diaries;
}

// ─── Comments ───────────────────────────────────────────────────────────

function loadAllComments(): DiaryComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cultur-ease-comments");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllComments(comments: DiaryComment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-comments", JSON.stringify(comments));
}

export function loadComments(diaryId: string): DiaryComment[] {
  return loadAllComments()
    .filter((c) => c.diaryId === diaryId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function addComment(comment: DiaryComment): DiaryComment[] {
  const comments = loadAllComments();
  comments.unshift(comment);
  saveAllComments(comments);
  return loadComments(comment.diaryId);
}

export function deleteComment(commentId: string): void {
  const comments = loadAllComments().filter((c) => c.id !== commentId);
  saveAllComments(comments);
}

export function getAuthorKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem("cultur-ease-author-key");
  if (!key) {
    key = `author-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("cultur-ease-author-key", key);
  }
  return key;
}

export function getAuthorName(): string {
  if (typeof window === "undefined") return "匿名用户";
  return localStorage.getItem("cultur-ease-author-name") || "匿名用户";
}

export function setAuthorName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cultur-ease-author-name", name);
}

// ─── Cultural Scenarios Cache ──────────────────────────────────────────

export interface CachedCulturalScenarios {
  scenarios: CulturalScenario[];
  sourceCountry: string;
  targetCountry: string;
  targetCity: string;
}

const CULTURAL_SCENARIOS_CACHE_KEY = "cultur-ease-cultural-scenarios";

export function loadCachedCulturalScenarios(): CachedCulturalScenarios | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CULTURAL_SCENARIOS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedCulturalScenarios(cache: CachedCulturalScenarios): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CULTURAL_SCENARIOS_CACHE_KEY, JSON.stringify(cache));
}

// ─── Holiday Suggestions Cache ─────────────────────────────────────────

const HOLIDAY_SUGGESTIONS_CACHE_KEY = "cultur-ease-holiday-suggestions";

export interface CachedHolidaySuggestions {
  holidays: { name: string; season: string; whereToBuyIngredients: string; localAlternatives: string; newConnections: string }[];
  sourceCountry: string;
  targetCountry: string;
  targetCity: string;
}

export function loadCachedHolidaySuggestions(): CachedHolidaySuggestions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HOLIDAY_SUGGESTIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedHolidaySuggestions(cache: CachedHolidaySuggestions): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HOLIDAY_SUGGESTIONS_CACHE_KEY, JSON.stringify(cache));
}
