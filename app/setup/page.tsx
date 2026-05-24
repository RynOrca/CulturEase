'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { saveUserProfile } from '@/lib/storage';
import { getAvailableProviders } from '@/lib/ai/providers';
import { saveApiConfig } from '@/lib/ai/config-loader';
import type { AIProvider } from '@/lib/ai/providers';
import { getCoords } from '@/lib/data/cities';

const DynamicGlobe = dynamic(() => import('@/components/Globe'), { ssr: false });

// ─── 地球城市光点 ───
const GLOBE_CITIES = [
  { id: 'tokyo', name: '东京', lat: 35.6762, lng: 139.6503 },
  { id: 'london', name: '伦敦', lat: 51.5074, lng: -0.1278 },
  { id: 'newyork', name: '纽约', lat: 40.7128, lng: -74.006 },
  { id: 'sydney', name: '悉尼', lat: -33.8688, lng: 151.2093 },
  { id: 'paris', name: '巴黎', lat: 48.8566, lng: 2.3522 },
  { id: 'seoul', name: '首尔', lat: 37.5665, lng: 126.978 },
  { id: 'berlin', name: '柏林', lat: 52.52, lng: 13.405 },
  { id: 'toronto', name: '多伦多', lat: 43.6532, lng: -79.3832 },
  { id: 'singapore', name: '新加坡', lat: 1.3521, lng: 103.8198 },
  { id: 'sanfrancisco', name: '旧金山', lat: 37.7749, lng: -122.4194 },
  { id: 'boston', name: '波士顿', lat: 42.3601, lng: -71.0589 },
  { id: 'melbourne', name: '墨尔本', lat: -37.8136, lng: 144.9631 },
  { id: 'vancouver', name: '温哥华', lat: 49.2827, lng: -123.1207 },
  { id: 'osaka', name: '大阪', lat: 34.6937, lng: 135.5023 },
  { id: 'munich', name: '慕尼黑', lat: 48.1351, lng: 11.582 },
  { id: 'losangeles', name: '洛杉矶', lat: 34.0522, lng: -118.2437 },
  { id: 'manchester', name: '曼彻斯特', lat: 53.4808, lng: -2.2426 },
  { id: 'chicago', name: '芝加哥', lat: 41.8781, lng: -87.6298 },
  { id: 'edinburgh', name: '爱丁堡', lat: 55.9533, lng: -3.1883 },
  { id: 'montreal', name: '蒙特利尔', lat: 45.5017, lng: -73.5673 },
];

const SOURCE_COUNTRIES = [
  { code: 'CN', label: '中国' }, { code: 'TW', label: '中国台湾' },
  { code: 'HK', label: '中国香港' }, { code: 'MO', label: '中国澳门' },
  { code: 'IN', label: '印度' }, { code: 'KR', label: '韩国' },
  { code: 'JP', label: '日本' }, { code: 'VN', label: '越南' },
  { code: 'TH', label: '泰国' }, { code: 'MY', label: '马来西亚' },
  { code: 'ID', label: '印度尼西亚' }, { code: 'PH', label: '菲律宾' },
  { code: 'SG', label: '新加坡' },
];

const TARGET_COUNTRIES = [
  { code: 'GB', label: '英国' }, { code: 'US', label: '美国' },
  { code: 'AU', label: '澳大利亚' }, { code: 'CA', label: '加拿大' },
  { code: 'JP', label: '日本' }, { code: 'KR', label: '韩国' },
  { code: 'DE', label: '德国' }, { code: 'FR', label: '法国' },
  { code: 'SG', label: '新加坡' },
];

const STAGES = [
  { code: 'pre-departure', label: '出发前 — 还在准备' },
  { code: 'week-1', label: '第 1 周 — 刚到' },
  { code: 'month-1', label: '第 1 个月 — 正在适应' },
  { code: 'month-3', label: '第 3 个月 — 逐渐习惯' },
  { code: 'year-1', label: '第 1 年 — 老司机' },
];

const CITY_SUGGESTIONS: Record<string, string[]> = {
  GB: ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Glasgow'],
  US: ['New York', 'Los Angeles', 'Boston', 'San Francisco', 'Chicago', 'Seattle', 'Austin'],
  AU: ['Sydney', 'Melbourne', 'Brisbane'],
  CA: ['Toronto', 'Vancouver', 'Montreal'],
  JP: ['Tokyo', 'Osaka'],
  KR: ['Seoul'],
  DE: ['Berlin', 'Munich'],
  FR: ['Paris'],
  SG: ['Singapore'],
};

const PROVIDER_OPTIONS: { code: AIProvider; label: string; defaultBaseUrl: string }[] = [
  { code: 'deepseek', label: 'DeepSeek（默认）', defaultBaseUrl: 'https://api.deepseek.com' },
  { code: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com' },
  { code: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com' },
];

const STEP_LABELS = ['来源地', '目标国', '城市与阶段', 'AI 配置', '就绪'];

export default function SetupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  // Form state
  const [source, setSource] = useState('CN');
  const [target, setTarget] = useState('GB');
  const [city, setCity] = useState('');
  const [stage, setStage] = useState('pre-departure');

  // API config
  const [aiProvider, setAiProvider] = useState<AIProvider>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.deepseek.com');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Fly-to state
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [phase, setPhase] = useState<'form' | 'flying' | 'holding' | 'done'>('form');
  const [navigating, setNavigating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const cities = CITY_SUGGESTIONS[target] || [];
  const selectedCountryName = TARGET_COUNTRIES.find((c) => c.code === target)?.label ?? target;
  const hasServerKey = getAvailableProviders().some((p) => p.configured);
  const finalCity = city || cities[0];

  const handleProviderChange = (code: AIProvider) => {
    setAiProvider(code);
    const provider = PROVIDER_OPTIONS.find((p) => p.code === code);
    if (provider) setApiBaseUrl(provider.defaultBaseUrl);
    setValidationResult(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) { setValidationResult({ valid: false, message: '请先输入 API Key' }); return; }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, apiKey, apiBaseUrl }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch {
      setValidationResult({ valid: false, message: '网络错误，无法验证' });
    }
    setValidating(false);
  };

  const handleStartExplore = useCallback(() => {
    if (!finalCity) return;
    saveUserProfile({ sourceCountry: source, targetCountry: target, targetCity: finalCity, stage });

    if (apiKey.trim()) {
      saveApiConfig({ provider: aiProvider, apiKey: apiKey.trim(), apiBaseUrl });
    }

    const coords = getCoords(finalCity);
    if (coords) {
      setPhase('flying');
      setFlyTarget({ lat: coords.lat, lng: coords.lng, name: finalCity });
    } else {
      setNavigating(true);
      setTimeout(() => router.push('/'), 400);
    }
  }, [finalCity, source, target, stage, apiKey, aiProvider, apiBaseUrl, router]);

  const handleHoldStart = useCallback(() => {
    setPhase('holding');
  }, []);

  const handleFlyComplete = useCallback(() => {
    setNavigating(true);
    setTimeout(() => router.push('/'), 650);
  }, [router]);

  const cityCoords = finalCity ? getCoords(finalCity) : null;
  const cityMetrics = cityCoords ? { pressure: 55 + Math.floor(Math.random() * 30), happiness: 50 + Math.floor(Math.random() * 35), adaptation: 45 + Math.floor(Math.random() * 40) } : null;

  if (!mounted) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1016] overflow-hidden relative">
      {/* 3D Globe with city hotspots */}
      {mounted && (
        <DynamicGlobe
          hotspots={GLOBE_CITIES}
          onCityClick={() => {}}
          onCityHover={() => {}}
          flyToTarget={flyTarget}
          onFlyComplete={handleFlyComplete}
          onHoldStart={handleHoldStart}
        />
      )}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1016]/70 via-transparent to-[#0d1016]/75" />
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0d1016] to-transparent" />
      </div>

      {/* 飞入渐隐遮罩 */}
      {navigating && <div className="absolute inset-0 z-[5] bg-[#0a0805] animate-[fadeIn_0.5s_ease-out]" />}

      {/* 停顿期城市情报卡 */}
      {phase === 'holding' && flyTarget && cityMetrics && (
        <div className="absolute inset-0 z-[3] pointer-events-none animate-[fadeIn_0.35s_ease-out]">
          <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_18px_rgba(193,154,73,0.9)]" />
          <div className="absolute left-1/2 top-1/2 w-24 h-[1px] bg-amber/55 -translate-y-1/2" />
          <div className="absolute left-[calc(50%+6rem)] top-[calc(50%-3.5rem)] h-[3.5rem] w-[1px] bg-amber/45" />
          <div className="absolute left-[calc(50%+6rem)] top-[calc(50%-9rem)] w-[320px]">
            <div className="relative rounded-2xl border border-amber/20 bg-[#0a0805]/78 backdrop-blur-md px-5 py-4 shadow-[0_0_40px_rgba(193,154,73,0.08)]">
              <div className="absolute top-0 left-0 w-3 h-[1px] bg-amber/40" />
              <div className="absolute top-0 left-0 h-3 w-[1px] bg-amber/40" />
              <div className="absolute top-0 right-0 w-3 h-[1px] bg-amber/40" />
              <div className="absolute top-0 right-0 h-3 w-[1px] bg-amber/40" />
              <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-amber/40" />
              <div className="absolute bottom-0 left-0 h-3 w-[1px] bg-amber/40" />
              <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-amber/40" />
              <div className="absolute bottom-0 right-0 h-3 w-[1px] bg-amber/40" />
              <div className="text-[10px] text-amber/50 font-mono uppercase tracking-[0.22em] mb-1">City Intelligence</div>
              <div className="text-2xl text-white font-medium tracking-wide">{flyTarget.name}</div>
              <div className="text-xs text-slate font-mono mt-0.5">SNAPSHOT · LOCKED</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-slate font-mono uppercase tracking-[0.15em]">压力指数</div>
                  <div className="text-lg text-white mt-1">{cityMetrics.pressure}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-slate font-mono uppercase tracking-[0.15em]">幸福度</div>
                  <div className="text-lg text-white mt-1">{cityMetrics.happiness}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-slate font-mono uppercase tracking-[0.15em]">适应度</div>
                  <div className="text-lg text-white mt-1">{cityMetrics.adaptation}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 顶部标识 */}
      <header className={`relative z-10 shrink-0 px-6 pt-6 transition-opacity duration-500 ${phase !== 'form' ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 relative">
            <div className="absolute inset-0 rounded-full border border-amber/60" />
            <div className="absolute inset-1 rounded-full bg-amber/20" />
            <div className="absolute inset-[7px] rounded-full bg-amber" />
          </div>
          <span className="text-sm font-medium text-cream tracking-wide font-display">CulturEase</span>
          <span className="text-[10px] text-slate font-mono uppercase tracking-[0.2em]">Setup</span>
        </div>
      </header>

      {/* 问卷面板 */}
      {phase === 'form' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} className="w-full max-w-lg">
            <div className="bg-[#0a0805]/80 border border-amber/15 rounded-2xl backdrop-blur-md shadow-[0_0_50px_rgba(193,154,73,0.05)] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06]">
                <div className="text-[10px] text-amber/50 font-mono uppercase tracking-[0.25em] mb-3">
                  Step {step + 1} / 5 · {STEP_LABELS[step]}
                </div>
                <div className="flex items-center gap-1.5">
                  {STEP_LABELS.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-300 ${i <= step ? 'bg-amber' : 'bg-white/[0.08]'}`} />
                  ))}
                </div>
              </div>

              <div className="p-6 min-h-[340px] flex flex-col justify-between gap-5">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                    {/* Step 0: Source */}
                    {step === 0 && (
                      <>
                        <h2 className="text-xl text-cream/90 mb-1">你从哪里出发？</h2>
                        <p className="text-sm text-slate mb-4">你的文化背景是我们定制建议的基础</p>
                        <div className="grid grid-cols-3 gap-2">
                          {SOURCE_COUNTRIES.map((c) => (
                            <button key={c.code} onClick={() => { setSource(c.code); setStep(1); }}
                              className={`px-3 py-3 text-sm rounded-lg border transition-all ${source === c.code ? 'border-amber/40 bg-amber/10 text-cream' : 'border-white/[0.08] bg-white/[0.02] text-slate hover:border-white/[0.14]'}`}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Step 1: Target */}
                    {step === 1 && (
                      <>
                        <h2 className="text-xl text-cream/90 mb-1">你要去哪里留学？</h2>
                        <p className="text-sm text-slate mb-4">选择你的目的地国家</p>
                        <div className="grid grid-cols-3 gap-2.5">
                          {TARGET_COUNTRIES.map((c) => (
                            <button key={c.code} onClick={() => { setTarget(c.code); setCity(''); setStep(2); }}
                              className={`px-3 py-4 text-sm rounded-lg border transition-all ${target === c.code ? 'border-amber/40 bg-amber/10 text-cream' : 'border-white/[0.08] bg-white/[0.02] text-slate hover:border-white/[0.14]'}`}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Step 2: City + Stage */}
                    {step === 2 && (
                      <>
                        <h2 className="text-xl text-cream/90 mb-1">选择城市和阶段</h2>
                        <p className="text-sm text-slate mb-1">你将在 {selectedCountryName} 的哪个城市？</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {cities.map((c) => (
                            <button key={c} onClick={() => setCity(c)}
                              className={`px-4 py-2 text-sm rounded-lg border transition-all ${city === c ? 'border-amber/40 bg-amber/10 text-cream' : 'border-white/[0.08] bg-white/[0.02] text-slate hover:border-white/[0.14]'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-slate mb-2">目前处于哪个阶段？</p>
                        <div className="space-y-2">
                          {STAGES.map((s) => (
                            <button key={s.code} onClick={() => setStage(s.code)}
                              className={`w-full text-left px-4 py-3 text-sm rounded-lg border transition-all ${stage === s.code ? 'border-amber/40 bg-amber/10 text-cream' : 'border-white/[0.08] bg-white/[0.02] text-slate hover:border-white/[0.14]'}`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Step 3: API Config */}
                    {step === 3 && (
                      <div>
                        <h2 className="text-xl text-cream/90 mb-1">配置 AI 服务（可选）</h2>
                        <p className="text-sm text-slate mb-4">
                          AI 驱动所有核心功能。输入 API Key 即可启用。
                          {hasServerKey && <span className="block mt-1 text-sage">系统检测到服务端 API Key。</span>}
                        </p>

                        <div className="flex gap-2 mb-4">
                          {PROVIDER_OPTIONS.map((p) => (
                            <button key={p.code} onClick={() => handleProviderChange(p.code)}
                              className={`px-3 py-2 text-xs rounded-lg border transition-all ${aiProvider === p.code ? 'border-amber/40 bg-amber/10 text-cream' : 'border-white/[0.08] bg-white/[0.02] text-slate hover:border-white/[0.14]'}`}>
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3 mb-4">
                          <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); }}
                            placeholder="sk-..." className="w-full px-4 py-2.5 text-sm rounded-lg border border-white/[0.08] bg-white/[0.02] text-cream/90 placeholder:text-white/20 outline-none focus:border-amber/40 transition-colors" />
                          <input type="text" value={apiBaseUrl} onChange={(e) => { setApiBaseUrl(e.target.value); setValidationResult(null); }}
                            placeholder="https://api.deepseek.com" className="w-full px-4 py-2.5 text-sm rounded-lg border border-white/[0.08] bg-white/[0.02] text-cream/90 placeholder:text-white/20 outline-none focus:border-amber/40 transition-colors" />
                          <div className="flex items-center gap-3">
                            <button onClick={handleTestConnection} disabled={validating || !apiKey.trim()}
                              className="px-4 py-2 text-xs rounded-lg border border-white/[0.08] text-slate hover:text-cream hover:border-white/[0.14] transition-colors disabled:opacity-40">
                              {validating ? '验证中...' : '测试连接'}
                            </button>
                            {validationResult && (
                              <span className={`text-xs ${validationResult.valid ? 'text-sage' : 'text-rust'}`}>{validationResult.message}</span>
                            )}
                          </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${hasServerKey || apiKey.trim() ? 'bg-sage/10 text-sage' : 'bg-amber/10 text-amber'}`}>
                          <span className={`w-2 h-2 rounded-full ${hasServerKey || apiKey.trim() ? 'bg-sage' : 'bg-amber'}`} />
                          {hasServerKey ? 'AI 已配置（服务器）' : apiKey.trim() ? 'API Key 已填写' : '未配置 API Key'}
                        </div>
                      </div>
                    )}

                    {/* Step 4: Summary */}
                    {step === 4 && (
                      <div className="text-center space-y-4">
                        <h2 className="text-xl text-cream/90">准备好了</h2>
                        <p className="text-sm text-slate">确认信息后，点击下方按钮开始探索</p>
                        <div className="space-y-3 text-left">
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-xs text-slate">出发地</span>
                            <p className="text-sm text-cream/90 mt-0.5">{SOURCE_COUNTRIES.find((s) => s.code === source)?.label}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-xs text-slate">目标</span>
                            <p className="text-sm text-cream/90 mt-0.5">{finalCity} · {selectedCountryName}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-xs text-slate">当前阶段</span>
                            <p className="text-sm text-cream/90 mt-0.5">{STAGES.find((s) => s.code === stage)?.label}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${step === 0 ? 'text-white/15 cursor-not-allowed' : 'text-slate hover:text-cream hover:bg-white/[0.04]'}`}
                    disabled={step === 0}>上一步</button>

                  {step < 3 ? (
                    <button onClick={() => setStep(4)} className="px-5 py-2 rounded-lg text-sm font-medium bg-amber/12 text-amber border border-amber/20 hover:bg-amber/18 transition-colors">
                      跳过，直接开始
                    </button>
                  ) : step === 3 ? (
                    <button onClick={() => setStep(4)} className="px-5 py-2 rounded-lg text-sm font-medium bg-amber/12 text-amber border border-amber/20 hover:bg-amber/18 transition-colors">
                      查看总结
                    </button>
                  ) : (
                    <button onClick={handleStartExplore} className="px-6 py-2.5 rounded-lg text-sm font-medium bg-terracotta text-white hover:bg-terracotta/90 transition-colors shadow-sm">
                      开始探索
                    </button>
                  )}

                  {step < 4 && step > 0 && (
                    <button onClick={() => setStep((s) => s + 1)} className="px-5 py-2 rounded-lg text-sm font-medium bg-amber/12 text-amber border border-amber/20 hover:bg-amber/18 transition-colors">
                      下一步
                    </button>
                  )}
                  {step === 0 && (
                    <button onClick={() => setStep(1)} className="px-5 py-2 rounded-lg text-sm font-medium bg-amber/12 text-amber border border-amber/20 hover:bg-amber/18 transition-colors">
                      下一步
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 底部提示 */}
      {phase === 'form' && (
        <footer className="relative z-10 shrink-0 h-7 flex items-center justify-center border-t border-white/[0.04]">
          <span className="text-[10px] font-mono text-slate">DRAG TO ROTATE · EXPLORE THE GLOBE</span>
        </footer>
      )}
    </div>
  );
}
