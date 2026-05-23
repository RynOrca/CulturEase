import { DiaryEntry } from "./types";

export function searchDiaries(
  diaries: DiaryEntry[],
  query: string
): DiaryEntry[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return diaries.filter(
    (d) =>
      d.title.toLowerCase().includes(lower) ||
      d.content.toLowerCase().includes(lower) ||
      d.city.toLowerCase().includes(lower) ||
      d.school?.toLowerCase().includes(lower) ||
      d.lifeType.toLowerCase().includes(lower)
  );
}

export function searchDiariesByCity(
  diaries: DiaryEntry[],
  city: string
): DiaryEntry[] {
  const lower = city.toLowerCase();
  return diaries.filter((d) => d.city.toLowerCase().includes(lower));
}

export interface SearchResult {
  diary: DiaryEntry;
  relevance: number;
}

export function rankDiariesByRelevance(
  diaries: DiaryEntry[],
  query: string
): SearchResult[] {
  const lower = query.toLowerCase();
  return diaries
    .map((diary) => {
      let score = 0;
      if (diary.title.toLowerCase().includes(lower)) score += 3;
      if (diary.content.toLowerCase().includes(lower)) score += 2;
      if (diary.city.toLowerCase().includes(lower)) score += 2;
      if (diary.school?.toLowerCase().includes(lower)) score += 3;
      if (diary.lifeType.toLowerCase().includes(lower)) score += 1;
      return { diary, relevance: score };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}
