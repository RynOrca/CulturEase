'use client';

import type { NodeCategory } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';

interface CategoryFilterProps {
  activeFilter: NodeCategory | null;
  onFilterChange: (category: NodeCategory | null) => void;
  nodeCounts: Record<NodeCategory, number>;
}

export default function CategoryFilter({ activeFilter, onFilterChange, nodeCounts }: CategoryFilterProps) {
  const categories: NodeCategory[] = ['academic', 'life', 'housing', 'forum'];

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onFilterChange(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wider transition-all ${activeFilter === null ? 'bg-terracotta/10 text-terracotta border border-terracotta/20' : 'bg-cream/60 text-slate border border-cream hover:text-ink hover:bg-cream'}`}>
        全部
      </button>
      {categories.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isActive = activeFilter === cat;
        return (
          <button key={cat} onClick={() => onFilterChange(isActive ? null : cat)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wider transition-all flex items-center gap-1.5 ${isActive ? 'border' : 'bg-cream/60 text-slate border border-cream hover:text-ink hover:bg-cream'}`} style={isActive ? { background: `${config.color}10`, color: config.color, borderColor: `${config.color}25` } : undefined}>
            <span style={{ color: isActive ? config.color : '#9ca3af' }}>{config.icon}</span>
            <span className="hidden sm:inline">{config.label}</span>
            <span className="text-[10px] opacity-60" style={{ color: isActive ? config.color : '#9ca3af' }}>{nodeCounts[cat]}</span>
          </button>
        );
      })}
    </div>
  );
}
