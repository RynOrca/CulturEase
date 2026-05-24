'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchLocation, SchoolSearchResult } from '@/lib/types';
import { searchSchools, SEARCH_LOCATIONS, getProfileById } from '@/lib/data/intel';

interface SearchBarProps {
  onSelectLocation: (location: SearchLocation) => void;
  currentLocation: SearchLocation | null;
}

export default function SearchBar({ onSelectLocation, currentLocation }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) setResults(searchSchools(value));
    else setResults([]);
  }, []);

  const handleSelect = useCallback((result: SchoolSearchResult) => {
    setQuery(''); setResults([]); setIsFocused(false); setIsExpanded(false);
    onSelectLocation(result.location);
    inputRef.current?.blur();
  }, [onSelectLocation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setIsFocused(false); setIsExpanded(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSchools = SEARCH_LOCATIONS.map((loc) => {
    const profile = getProfileById(loc.id);
    return profile ? { location: loc, profile } : null;
  }).filter((r): r is SchoolSearchResult => r !== null);
  const displayedResults = isExpanded && !query.trim() ? allSchools : results;

  return (
    <div ref={containerRef} className="relative z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${isFocused || isExpanded ? 'bg-white border border-terracotta/40 shadow-md' : 'bg-cream/60 border border-cream'}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFocused ? '#C67A53' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-colors duration-200">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input ref={inputRef} type="text" value={query} onChange={(e) => handleSearch(e.target.value)} onFocus={() => setIsFocused(true)} placeholder={currentLocation ? `当前: ${currentLocation.name} · 搜索学校...` : '搜索大学、城市...'} className="bg-transparent text-sm text-ink placeholder-slate outline-none w-full font-sans" />
        {!query.trim() && (
          <button onClick={() => { setIsExpanded(!isExpanded); setIsFocused(!isExpanded); }} className="text-slate hover:text-terracotta transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        )}
      </div>
      <AnimatePresence>
        {(isFocused || isExpanded) && displayedResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 right-0 mt-1 bg-white border border-cream rounded-lg overflow-hidden shadow-lg">
            {isExpanded && !query.trim() && <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate border-b border-cream">全部学校</div>}
            {displayedResults.map((result) => (
              <button key={result.profile.id} onClick={() => handleSelect(result)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream/40 transition-colors">
                <div className="w-2 h-2 rounded-full bg-terracotta shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{result.profile.name}</div>
                  <div className="text-[11px] text-slate mt-0.5">{result.location.name} · {result.profile.nameEn}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
