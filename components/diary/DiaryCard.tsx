"use client";

import { DiaryEntry, LIFE_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";
import { toggleLiked, loadLikedSet } from "@/lib/storage";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  diary: DiaryEntry;
  onLike?: () => void;
}

export function DiaryCard({ diary, onLike }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(diary.likes);

  useEffect(() => {
    const likedSet = loadLikedSet();
    setLiked(likedSet.has(diary.id));
  }, [diary.id]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleLiked(diary.id);
    setLiked(newState);
    setLikes((prev) => prev + (newState ? 1 : -1));
    onLike?.();
  };

  const handleClick = () => {
    router.push(`/diary/${diary.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="p-5 bg-white rounded-card shadow-card border border-cream/50 hover:shadow-panel transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink leading-snug line-clamp-2 group-hover:text-terracotta transition-colors">
            {diary.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-cream text-slate">
              {diary.city}
            </span>
            {diary.school && (
              <span className="text-xs text-slate">{diary.school}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage">
              {LIFE_TYPE_LABELS[diary.lifeType]}
            </span>
            <span className="text-xs text-slate/60">
              {STAGE_LABELS[diary.stage]}
            </span>
          </div>
        </div>
        {/* Rating stars */}
        <div className="flex items-center gap-0.5 shrink-0" title={`评分 ${diary.rating}/5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill={i < diary.rating ? "#C19A49" : "#E5E0D5"}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate leading-relaxed line-clamp-3 mb-4">
        {diary.content}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate/60">
          {diary.anonymous ? "匿名" : diary.authorName}
        </span>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${
            liked
              ? "bg-rust/10 text-rust"
              : "bg-cream/60 text-slate hover:bg-cream hover:text-rust"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likes}</span>
        </button>
      </div>
    </div>
  );
}
