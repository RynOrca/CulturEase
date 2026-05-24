'use client';

import { useState, useEffect } from 'react';
import type { PlaceProfile, PoiItem, DimensionScores, ForumAnalysisResult, ForumPost } from '@/lib/types';
import { CATEGORY_CONFIG, DIMENSION_CONFIG } from '@/lib/types';

interface NodeDetailPanelProps {
  profile: PlaceProfile | null;
  selectedPoi: PoiItem | null;
  onPoiDeselect: () => void;
  onClose: () => void;
}

export default function NodeDetailPanel({ profile, selectedPoi, onPoiDeselect, onClose }: NodeDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (profile) requestAnimationFrame(() => setIsVisible(true));
    else setIsVisible(false);
  }, [profile]);

  if (!profile) return null;

  const activeItem = selectedPoi || null;
  const activeScores = activeItem ? activeItem.scores : profile.scores;

  return (
    <div className={`h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-l border-cream bg-white overflow-hidden shadow-lg ${isVisible ? 'w-[380px] opacity-100' : 'w-0 opacity-0'}`}>
      <div className="w-[380px] h-full flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-cream">
          <div className="flex-1 min-w-0">
            {activeItem ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${CATEGORY_CONFIG[activeItem.category].color}15`, color: CATEGORY_CONFIG[activeItem.category].color }}>
                    {CATEGORY_CONFIG[activeItem.category].icon} {CATEGORY_CONFIG[activeItem.category].label}
                  </span>
                  <button onClick={onPoiDeselect} className="text-[10px] text-slate hover:text-ink transition-colors">← 返回总览</button>
                </div>
                <h2 className="text-base font-semibold text-ink leading-tight">{activeItem.name}</h2>
                <p className="text-[11px] text-slate mt-0.5">{activeItem.nameEn}</p>
                <p className="text-xs text-slate mt-1.5 leading-relaxed">{activeItem.summary}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-terracotta/10 text-terracotta">◈ 学校总览</span>
                </div>
                <h2 className="text-base font-semibold text-ink leading-tight">{profile.name}</h2>
                <p className="text-[11px] text-slate mt-0.5">{profile.nameEn} · {profile.city}, {profile.country}</p>
                <p className="text-xs text-slate mt-1.5 leading-relaxed">{profile.overview}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-slate hover:text-ink transition-colors ml-2 mt-0.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <DimensionScoreSection scores={activeScores} />

          {activeItem && (
            <div className="p-3 rounded-lg border border-cream bg-cream/30">
              <h3 className="text-[11px] uppercase tracking-[0.08em] mb-2 font-semibold text-slate">标签</h3>
              <div className="flex flex-wrap gap-1">
                {activeItem.tags.map((tag) => <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-cream text-slate">{tag}</span>)}
              </div>
            </div>
          )}

          {activeItem && (
            <div className="space-y-3">
              {activeItem.detail.highlights.length > 0 && (
                <div className="p-3 rounded-lg border-l-2 bg-sage/5 border-l-sage">
                  <h3 className="text-[11px] uppercase tracking-[0.08em] mb-1.5 font-semibold text-sage">亮点</h3>
                  <ul className="space-y-1">{activeItem.detail.highlights.map((h, i) => <li key={i} className="text-xs text-slate flex items-start gap-1.5"><span className="text-sage mt-0.5">+</span>{h}</li>)}</ul>
                </div>
              )}
              {activeItem.detail.warnings.length > 0 && (
                <div className="p-3 rounded-lg border-l-2 bg-amber/5 border-l-amber">
                  <h3 className="text-[11px] uppercase tracking-[0.08em] mb-1.5 font-semibold text-amber">注意</h3>
                  <ul className="space-y-1">{activeItem.detail.warnings.map((w, i) => <li key={i} className="text-xs text-slate flex items-start gap-1.5"><span className="text-amber mt-0.5">!</span>{w}</li>)}</ul>
                </div>
              )}
              {activeItem.detail.recommendation && (
                <div className="p-3 rounded-lg border border-cream bg-navy/5">
                  <h3 className="text-[11px] uppercase tracking-[0.08em] mb-1 font-semibold text-navy">建议</h3>
                  <p className="text-xs text-slate leading-relaxed">{activeItem.detail.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {!activeItem && (
            <div className="p-3 rounded-lg border border-cream bg-cream/30">
              <h3 className="text-[11px] uppercase tracking-[0.08em] mb-2 font-semibold text-slate">周边情报点 ({profile.pois.length})</h3>
              <div className="space-y-1.5">
                {profile.pois.map((poi) => (
                  <div key={poi.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-cream transition-colors cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('poi-select', { detail: poi.id }))}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_CONFIG[poi.category].color }} />
                    <div className="flex-1 min-w-0"><div className="text-xs font-medium text-ink truncate">{poi.name}</div><div className="text-[10px] text-slate truncate">{poi.shortLabel}</div></div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${CATEGORY_CONFIG[poi.category].color}15`, color: CATEGORY_CONFIG[poi.category].color }}>{CATEGORY_CONFIG[poi.category].labelEn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeItem ? activeItem.detail.forumSignals : profile.forumAnalysis) && (
            <ForumSection analysis={profile.forumAnalysis} posts={profile.forumPosts} forumSignals={activeItem?.detail.forumSignals} />
          )}
        </div>
        <div className="p-3 border-t border-cream">
          <button className="w-full py-2.5 px-3 bg-terracotta text-white text-xs font-medium rounded-lg hover:bg-terracotta/90 transition-colors">查看完整报告 →</button>
        </div>
      </div>
    </div>
  );
}

function DimensionScoreSection({ scores }: { scores: DimensionScores }) {
  const dimensions = Object.keys(scores) as (keyof DimensionScores)[];
  const cx = 120, cy = 110, r = 80;
  const n = dimensions.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, value: number) => {
    const a = angle(i); const ratio = value / 100;
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };
  const gridLevels = [20, 40, 60, 80, 100];
  const dataPoints = dimensions.map((key, i) => { const p = point(i, scores[key]); return `${p.x},${p.y}`; }).join(' ');
  const getScoreColor = (key: keyof DimensionScores, value: number) => {
    const config = DIMENSION_CONFIG[key];
    return config.invertColor ? (value > 70 ? '#ef4444' : value > 50 ? '#f59e0b' : '#22c55e') : (value > 70 ? '#22c55e' : value > 50 ? '#f59e0b' : '#ef4444');
  };

  return (
    <div className="p-3 rounded-lg border border-cream bg-cream/30">
      <h3 className="text-[11px] uppercase tracking-[0.08em] mb-2.5 font-semibold text-slate">维度评分</h3>
      <div className="flex justify-center mb-3">
        <svg width="240" height="220" viewBox="0 0 240 220">
          {gridLevels.map((level) => {
            const pts = dimensions.map((_, i) => { const p = point(i, level); return `${p.x},${p.y}`; }).join(' ');
            return <polygon key={level} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={level === 100 ? 1.2 : 0.6} />;
          })}
          {dimensions.map((_, i) => { const edge = point(i, 100); return <line key={i} x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke="#e5e7eb" strokeWidth={0.6} />; })}
          <polygon points={dataPoints} fill="rgba(198,122,83,0.15)" stroke="#C67A53" strokeWidth={1.8} strokeLinejoin="round" />
          {dimensions.map((key, i) => {
            const p = point(i, scores[key]);
            const labelPos = point(i, 120);
            const color = getScoreColor(key, scores[key]);
            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r={3.5} fill="#C67A53" stroke="white" strokeWidth={1.5} />
                <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-slate" fontWeight={500}>{DIMENSION_CONFIG[key].label}</text>
                <text x={labelPos.x} y={labelPos.y + 12} textAnchor="middle" dominantBaseline="middle" className="text-[9px]" fill={color} fontFamily="monospace" fontWeight={600}>{scores[key]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {dimensions.map((key) => {
          const config = DIMENSION_CONFIG[key]; const value = scores[key]; const barColor = getScoreColor(key, value);
          return <div key={key} className="flex items-center gap-1.5"><span className="text-[10px] text-slate w-14 shrink-0">{config.label}</span><div className="flex-1 h-1 bg-cream rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: barColor }} /></div><span className="text-[9px] font-mono font-medium w-5 text-right" style={{ color: barColor }}>{value}</span></div>;
        })}
      </div>
    </div>
  );
}

function ForumSection({ analysis, posts, forumSignals }: { analysis: ForumAnalysisResult; posts: ForumPost[]; forumSignals?: string[] }) {
  const [showAllPosts, setShowAllPosts] = useState(false);
  const sentimentColor = analysis.sentiment === 'positive' ? '#22c55e' : analysis.sentiment === 'negative' ? '#ef4444' : analysis.sentiment === 'mixed' ? '#f59e0b' : '#6b7280';
  const sentimentLabel = analysis.sentiment === 'positive' ? 'Positive' : analysis.sentiment === 'negative' ? 'Negative' : analysis.sentiment === 'mixed' ? 'Mixed' : 'Neutral';

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-cream bg-cream/30">
        <h3 className="text-[11px] uppercase tracking-[0.08em] mb-2 font-semibold text-slate">论坛分析</h3>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: sentimentColor }} /><span className="text-xs font-medium" style={{ color: sentimentColor }}>{sentimentLabel}</span></div>
          <span className="text-[10px] text-slate">Score {analysis.sentimentScore}/100</span>
        </div>
        <p className="text-xs text-slate leading-relaxed">{analysis.summary}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {analysis.topKeywords.map((kw) => <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-navy/5 text-navy border border-navy/10">{kw}</span>)}
      </div>
      {analysis.riskTags.length > 0 && (
        <div className="flex flex-wrap gap-1">{analysis.riskTags.map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-rust/5 text-rust border border-rust/10">⚠ {tag}</span>)}</div>
      )}
      {forumSignals && forumSignals.length > 0 && (
        <div className="p-2.5 rounded-lg border-l-2 border-l-navy bg-navy/5"><h4 className="text-[10px] uppercase tracking-wider text-navy font-semibold mb-1">Forum Signals</h4><ul className="space-y-1">{forumSignals.map((s, i) => <li key={i} className="text-[11px] text-slate flex items-start gap-1.5"><span className="text-navy">#</span>{s}</li>)}</ul></div>
      )}
      {posts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-slate font-semibold">帖子摘录</h4>
          {(showAllPosts ? posts : posts.slice(0, 3)).map((post) => (
            <div key={post.id} className="p-2.5 rounded-lg bg-cream/40 border border-cream">
              <div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-1.5 py-0.5 rounded bg-navy/5 text-navy">{post.source}</span>{post.author && <span className="text-[10px] text-slate">{post.author}</span>}{post.createdAt && <span className="text-[9px] text-slate ml-auto">{post.createdAt}</span>}</div>
              <p className="text-[11px] text-slate leading-relaxed line-clamp-3">{post.text}</p>
            </div>
          ))}
          {posts.length > 3 && <button onClick={() => setShowAllPosts(!showAllPosts)} className="text-[10px] text-terracotta hover:underline transition-colors">{showAllPosts ? '收起' : `查看全部 ${posts.length} 条`}</button>}
        </div>
      )}
    </div>
  );
}
