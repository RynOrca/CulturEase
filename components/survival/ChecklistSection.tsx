"use client";

import { motion } from "framer-motion";
import type { SurvivalKitSection } from "@/lib/types";

interface Props {
  section: SurvivalKitSection;
  onToggle: (itemIndex: number) => void;
}

export function ChecklistSection({ section, onToggle }: Props) {
  const checkedCount = section.items.filter((i) => i.checked).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-cream/50 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">
          {section.title}
        </h3>
        <span className="text-xs text-slate bg-cream/60 px-2.5 py-1 rounded-full">
          {checkedCount}/{section.items.length}
        </span>
      </div>
      <div className="divide-y divide-cream/30">
        {section.items.map((item, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-cream/20 transition-colors group"
          >
            <span
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                item.checked
                  ? "bg-terracotta border-terracotta text-white"
                  : "border-slate/20 group-hover:border-terracotta/50"
              }`}
            >
              {item.checked && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm transition-colors ${
                  item.checked ? "text-slate/50 line-through" : "text-ink"
                }`}
              >
                {item.text}
              </span>
              {item.tip && !item.checked && (
                <p className="text-xs text-slate/60 mt-0.5">💡 {item.tip}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
