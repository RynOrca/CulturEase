"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DiaryEntry, LifeType, JourneyStage } from "@/lib/types";
import { addDiary, loadUserProfile } from "@/lib/storage";
import { getCoords, ALL_CITY_NAMES, CITY_COORDS, CITY_NAME_MAP } from "@/lib/data";

const LIFE_TYPES: { value: LifeType; label: string }[] = [
  { value: "housing", label: "房租住宿" },
  { value: "commute", label: "日常通勤" },
  { value: "social", label: "社交融入" },
  { value: "healthcare", label: "看病医疗" },
  { value: "work", label: "打工兼职" },
  { value: "expenses", label: "日常开销" },
  { value: "safety", label: "安全提醒" },
  { value: "other", label: "其他" },
];

const STAGES: { value: JourneyStage; label: string }[] = [
  { value: "pre-departure", label: "出发前" },
  { value: "week-1", label: "第1周" },
  { value: "month-1", label: "第1个月" },
  { value: "month-3", label: "第3个月" },
  { value: "year-1", label: "第1年" },
  { value: "beyond", label: "1年以上" },
];

export default function SharePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    content: "",
    city: "",
    school: "",
    lifeType: "other" as LifeType,
    stage: "month-1" as JourneyStage,
    rating: 4,
    anonymous: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const handleCityChange = (value: string) => {
    setForm({ ...form, city: value });
    if (value.trim()) {
      const filtered = ALL_CITY_NAMES.filter((c) =>
        c.toLowerCase().includes(value.trim().toLowerCase())
      ).slice(0, 8);
      setCitySuggestions(filtered);
    } else {
      setCitySuggestions([]);
    }
  };

  const selectCity = (city: string) => {
    setForm({ ...form, city });
    setCitySuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.content.trim() || !form.city.trim()) {
      setError("标题、内容和城市为必填项");
      return;
    }
    if (form.content.length < 50) {
      setError("内容至少50字，分享更多细节对其他人更有帮助");
      return;
    }

    const coords = getCoords(form.city.trim());
    if (!coords) {
      setError(
        `未找到城市"${form.city}"的坐标。目前支持的城市：伦敦、纽约、洛杉矶、波士顿、旧金山、芝加哥、西雅图、奥斯汀、多伦多、温哥华、蒙特利尔、悉尼、墨尔本、布里斯班、东京、大阪、首尔、柏林、慕尼黑、巴黎、新加坡、曼彻斯特、爱丁堡、伯明翰、格拉斯哥`
      );
      return;
    }

    const resolvedCity = CITY_NAME_MAP[form.city.trim()] || form.city.trim();
    const cityEntry = CITY_COORDS.find(
      (c) => c.city.toLowerCase() === resolvedCity.toLowerCase()
    );

    const diary: DiaryEntry = {
      id: `user-${Date.now()}`,
      title: form.title.trim(),
      content: form.content.trim(),
      city: resolvedCity,
      country: cityEntry?.country ?? "新加坡",
      school: form.school.trim() || undefined,
      lifeType: form.lifeType,
      stage: form.stage,
      rating: form.rating,
      likes: 0,
      anonymous: form.anonymous,
      authorName: form.anonymous ? "匿名" : "一位留学生",
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(),
    };

    addDiary(diary);
    setSubmitted(true);
    setTimeout(() => {
      router.push("/diary");
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <h1 className="font-display text-3xl font-bold text-ink mb-3">
            故事已发出
          </h1>
          <p className="text-slate mb-6">
            你的经验已添加到地图和日记档案中，会帮助到正在准备出发的人。
          </p>
          <p className="text-sm text-slate/60">即将跳转到日记档案...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-3xl font-bold text-ink mb-2">
          分享你的故事
        </h1>
        <p className="text-slate mb-8">
          你的经验可能是别人最需要的指南
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 31px, #F3EFE8 31px, #F3EFE8 32px)",
            backgroundSize: "100% 32px",
          }}
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              标题 *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="给你的经验一个吸引人的标题"
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta"
              maxLength={80}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              内容 *（至少50字）
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="分享你的真实经历...细节越丰富，对别人的帮助越大。比如：具体多少钱、在哪个街区、用了什么方法解决..."
              rows={6}
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta resize-y"
              maxLength={1000}
            />
            <div className="text-xs text-slate/60 mt-1 text-right">
              {form.content.length}/1000
            </div>
          </div>

          {/* City + School */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-ink mb-1.5">
                城市 *
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleCityChange(e.target.value)}
                onFocus={() => {
                  if (form.city.trim()) {
                    const filtered = ALL_CITY_NAMES.filter((c) =>
                      c.toLowerCase().includes(form.city.trim().toLowerCase())
                    ).slice(0, 8);
                    setCitySuggestions(filtered);
                  }
                }}
                onBlur={() => setTimeout(() => setCitySuggestions([]), 200)}
                placeholder="例如：伦敦 / London"
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta"
              />
              {citySuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-cream rounded-lg shadow-panel overflow-hidden">
                  {citySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={() => selectCity(c)}
                      className="w-full text-left px-4 py-2 text-sm text-slate hover:bg-cream/60 hover:text-ink transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                学校（选填）
              </label>
              <input
                type="text"
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                placeholder="例如：UCL"
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta"
              />
            </div>
          </div>

          {/* Life type + Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                生活类型
              </label>
              <select
                value={form.lifeType}
                onChange={(e) =>
                  setForm({ ...form, lifeType: e.target.value as LifeType })
                }
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink focus:outline-none focus:border-terracotta"
              >
                {LIFE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                留学阶段
              </label>
              <select
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as JourneyStage })
                }
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white/80 text-ink focus:outline-none focus:border-terracotta"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              推荐程度
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className={`text-2xl transition-colors ${
                    star <= form.rating ? "text-amber" : "text-cream"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="self-center text-sm text-slate ml-2">
                {form.rating}/5
              </span>
            </div>
          </div>

          {/* Anonymous */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) =>
                setForm({ ...form, anonymous: e.target.checked })
              }
              className="w-4 h-4 rounded border-cream text-terracotta focus:ring-terracotta"
            />
            <span className="text-sm text-slate">匿名发布</span>
          </label>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors text-sm"
          >
            发布我的故事
          </button>
        </form>
      </motion.div>
    </div>
  );
}
