"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { DiaryEntry, DiaryComment, LIFE_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";
import { loadDiaries, deleteDiary, loadComments, addComment, deleteComment, getAuthorKey, getAuthorName, setAuthorName } from "@/lib/storage";
import { MOCK_DIARIES } from "@/lib/data";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

const DiaryMap = dynamic(
  () => import("./DiaryMap"),
  { ssr: false, loading: () => <div className="w-full h-full bg-cream/40 rounded-card animate-pulse" /> },
);

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const authorKey = getAuthorKey();

  useEffect(() => {
    setMounted(true);
    const all = [...loadDiaries(), ...MOCK_DIARIES];
    const found = all.find((d) => d.id === params.id);
    if (found) {
      setDiary(found);
      setComments(loadComments(found.id));
    }
    setCommentAuthor(getAuthorName());
  }, [params.id]);

  const handleDeleteDiary = () => {
    if (!diary || !diary.id.startsWith("user-")) return;
    if (!confirm("确定要删除这篇日记吗？此操作不可撤销。")) return;
    deleteDiary(diary.id);
    router.push("/diary");
  };

  const handleAddComment = async () => {
    if (!diary || !commentText.trim() || submitting) return;
    setSubmitting(true);
    const name = commentAuthor.trim() || "匿名用户";
    setAuthorName(name);

    const newComment: DiaryComment = {
      id: `comment-${Date.now()}`,
      diaryId: diary.id,
      content: commentText.trim(),
      authorName: name,
      authorKey,
      timestamp: Date.now(),
    };

    const updated = addComment(newComment);
    setComments(updated);
    setCommentText("");
    setSubmitting(false);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？")) return;
    deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-slate">加载中...</div>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-ink mb-4">日记未找到</h1>
        <p className="text-slate mb-6">这篇日记可能已被删除或不存在</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  const isOwner = diary.id.startsWith("user-");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-slate hover:text-ink inline-flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          {isOwner && (
            <button
              onClick={handleDeleteDiary}
              disabled={deleting}
              className="text-sm text-rust hover:text-rust/80 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rust/20 hover:bg-rust/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              删除日记
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Content + Comments */}
          <div className="lg:col-span-3 space-y-6">
            <article className="bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8">
              {/* Meta tags */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-xs px-2 py-0.5 rounded-full bg-cream text-slate">
                  {diary.city}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage">
                  {LIFE_TYPE_LABELS[diary.lifeType]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-navy/10 text-navy">
                  {STAGE_LABELS[diary.stage]}
                </span>
                {diary.school && (
                  <span className="text-xs text-slate">{diary.school}</span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-4 leading-tight">
                {diary.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-cream/50">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill={i < diary.rating ? "#C19A49" : "#E5E0D5"}
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-slate/60">
                  {diary.anonymous ? "匿名" : diary.authorName} · {new Date(diary.timestamp).toLocaleDateString("zh-CN")}
                </span>
              </div>

              {/* Full content */}
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={diary.content} />
              </div>
            </article>

            {/* Comments section */}
            <section className="bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8">
              <h2 className="font-display text-lg font-semibold text-ink mb-5">
                评论 ({comments.length})
              </h2>

              {/* Comment form */}
              <div className="mb-6 pb-6 border-b border-cream/50">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full px-4 py-2 text-sm rounded-lg border border-cream bg-white text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta mb-2"
                  maxLength={20}
                />
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta resize-y"
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate/60">{commentText.length}/500</span>
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submitting}
                    className="px-5 py-2 text-sm rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "发送中..." : "发表评论"}
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-cream/40"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-ink">
                          {comment.authorName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate/50">
                            {new Date(comment.timestamp).toLocaleDateString("zh-CN")}
                          </span>
                          {comment.authorKey === authorKey && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-slate/40 hover:text-rust transition-colors"
                              title="删除评论"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate text-sm">
                  暂无评论，来说点什么吧
                </div>
              )}
            </section>
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden">
                <div className="h-[300px] lg:h-[400px] w-full">
                  <DiaryMap diary={diary} />
                </div>
                <div className="p-4 border-t border-cream/50">
                  <h3 className="font-display font-semibold text-ink text-sm mb-1">位置信息</h3>
                  <p className="text-xs text-slate">{diary.city}，{diary.country}</p>
                  {diary.school && (
                    <p className="text-xs text-slate mt-0.5">{diary.school}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
