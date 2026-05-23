"use client";

import { Suspense } from "react";
import { SurvivalKitMain } from "@/components/survival/SurvivalKitMain";

export default function SurvivalKitPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="inline-block w-10 h-10 border-4 border-cream border-t-terracotta rounded-full animate-spin" />
          </div>
        }
      >
        <SurvivalKitMain />
      </Suspense>
    </div>
  );
}
