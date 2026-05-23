"use client";

import { motion } from "framer-motion";
import { SIM_SCENARIOS } from "@/lib/types";

interface Props {
  onSelect: (scenarioId: string) => void;
}

const SCENARIO_ICONS: Record<string, string> = {
  building: "M3 21h18M3 10h18M5 10l7-8 7 8M7 21v-6h10v6",
  hospital: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h6M9 11h6M9 15h4",
  users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  briefcase: "M20 7l-8-4-8 4m16 0v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8 4m0 0L4 7m8 4v11",
  alert: "M12 9v2m0 4h.01M10.29 3.86l-8.4 14.57A1 1 0 002.7 20h18.6a1 1 0 00.81-1.57l-8.4-14.57a1 1 0 00-1.72 0z",
  cart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
  bank: "M3 21h18M3 10h18M12 3L2 10h20L12 3zM8 14h2v4H8v-4zm6 0h2v4h-2v-4z",
};

export function ScenarioSelector({ onSelect }: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SIM_SCENARIOS.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect(s.id)}
            className="text-left p-5 bg-white rounded-card shadow-card hover:shadow-panel transition-all border border-cream/50 group"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-terracotta mb-2"
            >
              <path d={SCENARIO_ICONS[s.icon] || SCENARIO_ICONS.building} />
            </svg>
            <h3 className="font-semibold text-ink group-hover:text-terracotta transition-colors">
              {s.label}
            </h3>
            <p className="text-xs text-slate mt-1">
              AI 扮演当地人进行角色扮演对话
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
