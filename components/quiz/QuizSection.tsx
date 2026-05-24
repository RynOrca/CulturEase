"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiConfigParams } from "@/lib/ai/config-loader";

interface WrongExplanation {
  comparison: string;
  correctApproach: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  wrongExplanation: WrongExplanation;
}

interface QuizData {
  questions: QuizQuestion[];
}

type QuizState = "idle" | "loading" | "playing" | "completed";

interface Props {
  sourceCountry: string;
  targetCountry: string;
  targetCity: string;
  stage: string;
}

export function QuizSection({ sourceCountry, targetCountry, targetCity, stage }: Props) {
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<
    { question: string; correct: boolean; explanation: string; wrongExplanation?: WrongExplanation }[]
  >([]);
  const [error, setError] = useState("");

  const startQuiz = useCallback(async () => {
    setQuizState("loading");
    setError("");
    setQuizData(null);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setResults([]);

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry,
          targetCountry,
          targetCity,
          stage,
          ...getApiConfigParams(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setError("AI 服务未配置。请在设置中配置 API Key。");
        } else {
          setError("生成测验失败，请稍后重试");
        }
        setQuizState("idle");
        return;
      }

      const data = await res.json();
      if (data?.questions && data.questions.length > 0) {
        setQuizData(data);
        setQuizState("playing");
      } else {
        setError("未能生成有效的测验题目，请重试");
        setQuizState("idle");
      }
    } catch {
      setError("网络错误，请检查连接");
      setQuizState("idle");
    }
  }, [sourceCountry, targetCountry, targetCity, stage]);

  const handleAnswer = (index: number) => {
    if (answered || !quizData) return;
    setSelectedAnswer(index);
    setAnswered(true);

    const q = quizData.questions[currentQ];
    const correct = index === q.correctIndex;
    if (correct) setScore((s) => s + 1);

    setResults((prev) => [
      ...prev,
      {
        question: q.question,
        correct,
        explanation: q.explanation,
        wrongExplanation: q.wrongExplanation,
      },
    ]);
  };

  const nextQuestion = () => {
    if (currentQ < (quizData?.questions.length ?? 1) - 1) {
      setCurrentQ((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setQuizState("completed");
    }
  };

  const resetQuiz = () => {
    setQuizState("idle");
    setQuizData(null);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setResults([]);
    setError("");
  };

  // Idle state: show CTA
  if (quizState === "idle") {
    return (
      <section className="mt-10 pt-8 border-t border-cream">
        <div className="bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            知识测试
          </h2>
          <p className="text-sm text-slate mb-6 max-w-md mx-auto">
            由 AI 根据你的目的地生成 5 道文化冲击选择题。答错会看到中西方文化对比与正确做法，帮你提前避坑。
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-sm">
              {error}
            </div>
          )}
          <button
            onClick={startQuiz}
            className="px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
          >
            开始测试
          </button>
        </div>
      </section>
    );
  }

  // Loading state
  if (quizState === "loading") {
    return (
      <section className="mt-10 pt-8 border-t border-cream">
        <div className="bg-white rounded-card shadow-card border border-cream/50 p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-cream border-t-terracotta rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate">AI 正在生成文化冲击测试题...</p>
        </div>
      </section>
    );
  }

  // Completed state: show score + review
  if (quizState === "completed") {
    const total = results.length;
    return (
      <section className="mt-10 pt-8 border-t border-cream">
        <div className="bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{score >= 4 ? "🎉" : score >= 3 ? "👍" : "💪"}</div>
            <h2 className="font-display text-2xl font-bold text-ink mb-1">
              测试完成
            </h2>
            <p className="text-slate">
              你的得分：<span className="font-bold text-terracotta text-lg">{score}</span> / {total}
            </p>
          </div>

          <div className="space-y-4">
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`p-4 rounded-lg border ${
                  r.correct
                    ? "bg-sage/5 border-sage/20"
                    : "bg-rust/5 border-rust/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">
                    {r.correct ? "✅" : "❌"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink mb-2">
                      第{i + 1}题：{r.question}
                    </p>
                    {r.correct ? (
                      <p className="text-xs text-sage leading-relaxed">{r.explanation}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 rounded bg-rust/5 border border-rust/10">
                          <p className="text-xs font-medium text-rust mb-1">文化冲击对比</p>
                          <p className="text-xs text-slate leading-relaxed">
                            {r.wrongExplanation?.comparison}
                          </p>
                        </div>
                        <div className="p-3 rounded bg-sage/5 border border-sage/10">
                          <p className="text-xs font-medium text-sage mb-1">正确做法</p>
                          <p className="text-xs text-slate leading-relaxed">
                            {r.wrongExplanation?.correctApproach}
                          </p>
                        </div>
                        <p className="text-xs text-slate/60">{r.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={resetQuiz}
              className="px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
            >
              重新测试
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Playing state: show current question
  if (!quizData || !quizData.questions[currentQ]) return null;

  const q = quizData.questions[currentQ];
  const total = quizData.questions.length;

  return (
    <section className="mt-10 pt-8 border-t border-cream">
      <div className="bg-white rounded-card shadow-card border border-cream/50 p-6 sm:p-8">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-terracotta rounded-full transition-all"
              style={{ width: `${((currentQ + (answered ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate font-medium shrink-0">
            {currentQ + 1} / {total}
          </span>
        </div>

        {/* Question */}
        <h3 className="font-display text-base font-semibold text-ink mb-4">
          {q.question}
        </h3>

        {/* Options */}
        <div className="space-y-2.5 mb-5">
          {q.options.map((option, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = i === q.correctIndex;
            let optionStyle = "border-cream hover:border-terracotta/40 hover:bg-cream/30";

            if (answered) {
              if (isCorrect) {
                optionStyle = "border-sage bg-sage/5 text-sage";
              } else if (isSelected && !isCorrect) {
                optionStyle = "border-rust bg-rust/5 text-rust";
              } else {
                optionStyle = "border-cream/40 text-slate/40";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className={`w-full text-left p-3.5 rounded-lg border-2 text-sm transition-colors ${optionStyle}`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Feedback after answering */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 mb-5"
            >
              {selectedAnswer === q.correctIndex ? (
                <div className="p-4 rounded-lg bg-sage/5 border border-sage/20">
                  <p className="text-xs font-medium text-sage mb-1">✅ 回答正确</p>
                  <p className="text-xs text-slate leading-relaxed">{q.explanation}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-4 rounded-lg bg-rust/5 border border-rust/20">
                    <p className="text-xs font-medium text-rust mb-1">❌ 回答错误 · 文化冲击对比</p>
                    <p className="text-xs text-slate leading-relaxed">
                      {q.wrongExplanation?.comparison}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-sage/5 border border-sage/10">
                    <p className="text-xs font-medium text-sage mb-1">正确做法</p>
                    <p className="text-xs text-slate leading-relaxed">
                      {q.wrongExplanation?.correctApproach}
                    </p>
                  </div>
                  <p className="text-xs text-slate/60">{q.explanation}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next / Finish button */}
        {answered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <button
              onClick={nextQuestion}
              className="px-5 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
            >
              {currentQ < total - 1 ? "下一题 →" : "查看结果"}
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
