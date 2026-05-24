"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DiaryEntry } from "@/lib/types";
import { loadUserProfile, loadDiaries, loadCachedAnalysis, saveCachedAnalysis, isAnalysisStale } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { MOCK_DIARIES, CITY_DATA } from "@/lib/data";
import { DiaryCard } from "@/components/diary/DiaryCard";
import { GlobalSearch } from "@/components/home/GlobalSearch";

const COUNTRY_MAP: Record<string, string> = {
  GB: "英国", US: "美国", AU: "澳大利亚", CA: "加拿大",
  JP: "日本", KR: "韩国", DE: "德国", FR: "法国", SG: "新加坡",
};

const QUICK_ACTIONS = [
  { href: "/coach", label: "AI 导师", desc: "个性化报告与场景模拟", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
  { href: "/survival-kit", label: "生存工具包", desc: "个性化清单，从容出发", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/explore", label: "全球探索", desc: "情报地图与留学生日记", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    sourceCountry: string;
    targetCountry: string;
    targetCity: string;
    stage: string;
  } | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [cultureAnalysis, setCultureAnalysis] = useState<{
    overallIndex: number;
    dimensions: { name: string; label?: string; score: number; description: string }[];
    insights: string;
    commonDifficulties?: string[];
    recommendations?: string[];
    localSayings?: string[];
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = loadUserProfile();
    if (!saved) {
      router.replace("/setup");
      return;
    }
    setProfile(saved);

    const userDiaries = loadDiaries();
    const allDiaries = [...userDiaries, ...MOCK_DIARIES];
    const ids = new Set<string>();
    const unique = allDiaries.filter((d) => {
      if (ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    });
    setDiaries(unique);
  }, [router]);

  useEffect(() => {
    if (!profile) return;

    const userDiaries = loadDiaries();
    const cached = loadCachedAnalysis();

    if (cached && !isAnalysisStale(cached, userDiaries.length, profile.targetCity)) {
      setCultureAnalysis(cached.analysis as typeof cultureAnalysis);
      return;
    }

    setAnalysisLoading(true);
    fetch("/api/ai/culture-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCountry: profile.sourceCountry,
        targetCountry: profile.targetCountry,
        targetCity: profile.targetCity,
        stage: profile.stage,
        diaries: userDiaries.map((d) => ({
          title: d.title,
          content: d.content,
          lifeType: d.lifeType,
        })),
        ...getApiConfigParams(),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.analysis) {
          setCultureAnalysis(data.analysis);
          saveCachedAnalysis({
            analysis: data.analysis,
            timestamp: Date.now(),
            diaryCount: userDiaries.length,
            targetCity: profile.targetCity,
          });
        }
      })
      .catch(() => {})
      .finally(() => setAnalysisLoading(false));
  }, [profile]);

  if (!mounted || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-slate">Loading...</div>
      </div>
    );
  }

  const targetCountryName = COUNTRY_MAP[profile.targetCountry] ?? profile.targetCountry;

  const relevantDiaries = diaries.filter(
    (d) => d.city.toLowerCase() === profile.targetCity.toLowerCase()
  );

  const cityData = CITY_DATA[profile.targetCity] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Global Search */}
        <section className="mb-10">
          <GlobalSearch
            targetCity={profile.targetCity}
            targetCountry={profile.targetCountry}
            stage={profile.stage}
            sourceCountry={profile.sourceCountry}
            onSearchActive={setSearchActive}
          />
        </section>

        <AnimatePresence>
          {!searchActive && (
            <motion.div
              key="home-content"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Welcome section */}
              <section className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-2">
                      你好，未来的旅人
                    </h1>
                    <p className="text-slate text-lg">
                      从{" "}
                      <span className="font-semibold text-ink">
                        {profile.sourceCountry === "CN" ? "中国" : profile.sourceCountry}
                      </span>{" "}
                      到{" "}
                      <span className="font-semibold text-ink">
                        {profile.targetCity} · {targetCountryName}
                      </span>
                      ，一切从这里开始
                    </p>
                  </div>
                  <Link
                    href="/setup"
                    className="px-4 py-2 text-sm rounded-lg border border-cream hover:bg-cream/60 text-slate transition-colors"
                  >
                    修改目的地
                  </Link>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content: 2/3 */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Quick actions */}
                  <section>
                    <h2 className="font-display text-xl font-semibold text-ink mb-4">
                      快速开始
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {QUICK_ACTIONS.map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="group p-5 bg-white rounded-card shadow-card hover:shadow-panel transition-all border border-cream/50"
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-terracotta mb-2">
                            <path d={action.icon} />
                          </svg>
                          <h3 className="font-semibold text-ink group-hover:text-terracotta transition-colors">
                            {action.label}
                          </h3>
                          <p className="text-sm text-slate mt-1">
                            {action.desc}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>

                  {/* AI Culture Shock Analysis */}
                  {cultureAnalysis && (
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h2 className="font-display text-xl font-semibold text-ink mb-4">
                        文化冲击分析
                      </h2>
                      <div className="bg-white rounded-card shadow-card border border-cream/50 p-5">
                        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-cream/50">
                          <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F3EFE8" strokeWidth="3" />
                              <circle
                                cx="18" cy="18" r="15.5" fill="none"
                                stroke={cultureAnalysis.overallIndex > 60 ? "#B8443C" : cultureAnalysis.overallIndex > 30 ? "#C19A49" : "#5E7F6B"}
                                strokeWidth="3"
                                strokeDasharray={`${cultureAnalysis.overallIndex * 0.97} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">
                              {cultureAnalysis.overallIndex}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-display font-semibold text-ink">
                              文化冲击指数
                              <span className="text-xs text-slate font-normal ml-2">
                                {cultureAnalysis.overallIndex > 60 ? "较高" : cultureAnalysis.overallIndex > 30 ? "中等" : "较低"}
                              </span>
                            </h4>
                            <p className="text-sm text-slate mt-1">{cultureAnalysis.insights}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                          {cultureAnalysis.dimensions.map((dim) => (
                            <div key={dim.name || dim.label} className="p-3 rounded-lg bg-cream/40">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-slate">{dim.label || dim.name}</span>
                                <span className={`text-xs font-semibold ${
                                  dim.score > 60 ? "text-rust" : dim.score > 30 ? "text-amber" : "text-sage"
                                }`}>
                                  {dim.score}/100
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-cream rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    dim.score > 60 ? "bg-rust" : dim.score > 30 ? "bg-amber" : "bg-sage"
                                  }`}
                                  style={{ width: `${dim.score}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate mt-1">{dim.description}</p>
                            </div>
                          ))}
                        </div>

                        {cultureAnalysis.commonDifficulties && cultureAnalysis.commonDifficulties.length > 0 && (
                          <div className="mb-4 p-4 rounded-lg bg-rust/5 border border-rust/15">
                            <h4 className="text-xs font-semibold text-rust mb-2 uppercase tracking-wider">
                              常见困难（基于日记分析）
                            </h4>
                            <ul className="space-y-1.5">
                              {cultureAnalysis.commonDifficulties.map((d: string, i: number) => (
                                <li key={i} className="text-sm text-slate flex items-start gap-2">
                                  <span className="text-rust mt-0.5 shrink-0">{i + 1}.</span>
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {cultureAnalysis.recommendations && cultureAnalysis.recommendations.length > 0 && (
                          <div className="p-4 rounded-lg bg-sage/5 border border-sage/15">
                            <h4 className="text-xs font-semibold text-sage mb-2 uppercase tracking-wider">
                              针对性建议
                            </h4>
                            <ul className="space-y-1.5">
                              {cultureAnalysis.recommendations.map((r: string, i: number) => (
                                <li key={i} className="text-sm text-slate flex items-start gap-2">
                                  <span className="text-sage mt-0.5 shrink-0">→</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Local sayings & slang */}
                        {cultureAnalysis.localSayings && cultureAnalysis.localSayings.length > 0 && (
                          <div className="mt-3 p-4 rounded-lg bg-amber/5 border border-amber/15">
                            <h4 className="text-xs font-semibold text-amber mb-2 uppercase tracking-wider">
                              当地俗语 · 俚语
                            </h4>
                            <ul className="space-y-1.5">
                              {cultureAnalysis.localSayings.map((s: string, i: number) => (
                                <li key={i} className="text-sm text-slate flex items-start gap-2">
                                  <span className="text-amber mt-0.5 shrink-0">💬</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.section>
                  )}
                  {analysisLoading && (
                    <section>
                      <h2 className="font-display text-xl font-semibold text-ink mb-4">
                        文化冲击分析
                      </h2>
                      <div className="bg-white rounded-card shadow-card border border-cream/50 p-8 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-cream border-t-terracotta rounded-full animate-spin mb-3" />
                        <p className="text-sm text-slate">AI 正在分析你的日记...</p>
                      </div>
                    </section>
                  )}
                </div>

                {/* Sidebar: 1/3 */}
                <div className="space-y-6">
                  {cityData && (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-5 bg-white rounded-card shadow-card border border-cream/50"
                    >
                      <h3 className="font-display text-lg font-semibold text-ink mb-3">
                        {profile.targetCity} · 城市速览
                      </h3>
                      <div className="space-y-2.5">
                        {[
                          { label: "房租压力", key: "housing" as const },
                          { label: "社交难度", key: "social" as const },
                          { label: "语言障碍", key: "language" as const },
                          { label: "生活便利", key: "convenience" as const },
                          { label: "安全指数", key: "safety" as const },
                          { label: "性价比", key: "value" as const },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center gap-3">
                            <span className="text-xs text-slate w-16 shrink-0">{item.label}</span>
                            <div className="flex-1 h-2 bg-cream rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  cityData.scores[item.key] > 75
                                    ? "bg-rust"
                                    : cityData.scores[item.key] > 50
                                    ? "bg-amber"
                                    : "bg-sage"
                                }`}
                                style={{ width: `${cityData.scores[item.key]}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate w-6 text-right font-medium">
                              {cityData.scores[item.key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display text-base font-semibold text-ink">
                        {profile.targetCity}的经验分享
                      </h2>
                      <Link
                        href="/diary"
                        className="text-xs text-terracotta hover:underline"
                      >
                        查看更多 →
                      </Link>
                    </div>
                    {relevantDiaries.length > 0 ? (
                      <div className="space-y-3">
                        {relevantDiaries.slice(0, 4).map((diary, i) => (
                          <motion.div
                            key={diary.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.4 }}
                          >
                            <DiaryCard diary={diary} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-white rounded-card shadow-card border border-cream/50">
                        <p className="text-slate text-sm mb-2">
                          还没有{profile.targetCity}的经验分享
                        </p>
                        <Link
                          href="/share"
                          className="text-xs font-medium text-terracotta hover:underline"
                        >
                          成为第一个分享的人 →
                        </Link>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
