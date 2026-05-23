"use client";

import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { CultureShockScores } from "@/lib/types";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface Props {
  scores: CultureShockScores;
}

const LABELS = ["房租压力", "社交难度", "语言障碍", "生活便利", "安全指数", "性价比"];
const LABEL_MAP: (keyof CultureShockScores)[] = [
  "housing",
  "social",
  "language",
  "convenience",
  "safety",
  "value",
];

export function RadarChartView({ scores }: Props) {
  const data = {
    labels: LABELS,
    datasets: [
      {
        label: "文化冲击指数",
        data: LABEL_MAP.map((k) => scores[k]),
        backgroundColor: "rgba(198, 122, 83, 0.15)",
        borderColor: "rgba(198, 122, 83, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(198, 122, 83, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          font: { size: 10 },
          color: "#999",
          backdropColor: "transparent",
        },
        pointLabels: {
          font: { size: 12, weight: 500 as const },
          color: "#2C2416",
        },
        grid: {
          color: "rgba(44, 36, 22, 0.1)",
        },
        angleLines: {
          color: "rgba(44, 36, 22, 0.1)",
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#2C2416",
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <Radar data={data} options={options} />
      <p className="text-xs text-center text-slate mt-3">
        数值越高 = 压力/难度越大（安全指数和性价比越高越好）
      </p>
    </div>
  );
}
