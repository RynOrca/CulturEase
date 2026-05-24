"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiConfigParams } from "@/lib/ai/config-loader";

const NAV_ITEMS = [
  { href: "/", label: "我的主页" },
  { href: "/explore", label: "全球探索" },
  { href: "/coach", label: "AI 导师" },
  { href: "/survival-kit", label: "生存工具包" },
  { href: "/toolkit", label: "文化差异" },
  { href: "/diary", label: "日记档案" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"loading" | "connected" | "missing">("loading");

  useEffect(() => {
    // Check API status client-side — include user's API key from localStorage
    const config = getApiConfigParams();
    fetch("/api/ai/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((r) => {
        if (r.ok) setApiStatus("connected");
        else setApiStatus("missing");
      })
      .catch(() => setApiStatus("missing"));
  }, []);

  // Don't render nav on setup page
  if (pathname === "/setup") return null;

  return (
    <header className="sticky top-0 z-50 bg-parchment/90 backdrop-blur-sm border-b border-cream/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-xl font-semibold text-navy tracking-tight">
            CulturEase
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "text-terracotta"
                    : "text-slate hover:text-ink hover:bg-cream/60"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-terracotta rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* API Status indicator */}
          <div className="ml-3 pl-3 border-l border-cream/80">
            <div
              className="group relative"
              title={
                apiStatus === "connected"
                  ? "AI 服务已连接"
                  : apiStatus === "missing"
                  ? "AI 服务未配置"
                  : "检查中..."
              }
            >
              <span
                className={`block w-2.5 h-2.5 rounded-full transition-colors ${
                  apiStatus === "connected"
                    ? "bg-sage"
                    : apiStatus === "missing"
                    ? "bg-amber"
                    : "bg-slate/30 animate-pulse"
                }`}
              />
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-ink text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {apiStatus === "connected"
                  ? "AI 服务已连接"
                  : apiStatus === "missing"
                  ? "AI 未配置"
                  : "检查 AI 服务..."}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-cream/60 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {mobileOpen ? (
              <path d="M6 6l8 8M14 6l-8 8" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-cream/80 bg-parchment overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-terracotta/10 text-terracotta"
                        : "text-slate hover:bg-cream/60 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="px-3 py-2.5 flex items-center gap-2 text-xs text-slate border-t border-cream/50 mt-2 pt-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === "connected"
                      ? "bg-sage"
                      : apiStatus === "missing"
                      ? "bg-amber"
                      : "bg-slate/30"
                  }`}
                />
                {apiStatus === "connected"
                  ? "AI 已连接"
                  : apiStatus === "missing"
                  ? "AI 未配置"
                  : "检查中"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
