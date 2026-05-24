'use client';

import type { SearchLocation } from '@/lib/types';

interface StatusBarProps {
  location: SearchLocation | null;
  totalNodes: number;
  hoveredNode: string | null;
}

export default function StatusBar({ location, totalNodes, hoveredNode }: StatusBarProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="h-7 px-4 flex items-center justify-between bg-cream/60 border-t border-cream text-[10px] font-mono text-slate">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
          <span className="text-ink font-medium">在线</span>
        </span>
        {location && (
          <>
            <span>{location.lat.toFixed(4)}N {Math.abs(location.lng).toFixed(4)}{location.lng >= 0 ? 'E' : 'W'}</span>
            <span>{totalNodes} 个情报节点</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {hoveredNode && <span className="text-terracotta">{hoveredNode}</span>}
        <span>UTC+{-(now.getTimezoneOffset() / 60)}</span>
        <span>{timeStr}</span>
      </div>
    </div>
  );
}
