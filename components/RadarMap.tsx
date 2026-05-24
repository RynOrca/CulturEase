'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SearchLocation, NodeCategory, PoiItem, HeatZone, DiaryEntry, LifeType } from '@/lib/types';
import { CATEGORY_CONFIG, LIFE_TYPE_COLORS, LIFE_TYPE_LABELS } from '@/lib/types';

export type MapMode = 'intel' | 'diary';

interface RadarMapProps {
  location: SearchLocation;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  activeNodeId: string | null;
  categoryFilter: NodeCategory | null;
  pois?: PoiItem[];
  heatZones?: HeatZone[];
  showHeatmap?: boolean;
  mode?: MapMode;
  diaries?: DiaryEntry[];
  onDiaryClick?: (diary: DiaryEntry) => void;
  flyToTarget?: { lat: number; lng: number; zoom: number };
}

function createDiaryIcon(type: LifeType): L.DivIcon {
  const color = LIFE_TYPE_COLORS[type] || '#7B8B8E';
  return L.divIcon({
    className: 'diary-marker',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;">📍</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

export default function RadarMap({
  location, onNodeClick, onNodeHover, activeNodeId, categoryFilter,
  pois, heatZones, showHeatmap, mode = 'intel', diaries, onDiaryClick, flyToTarget,
}: RadarMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const diaryMarkersRef = useRef<L.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [location.lat, location.lng],
      zoom: location.zoom,
      minZoom: 4,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
      updateWhenIdle: false,
      updateInterval: 150,
    } as L.MapOptions);
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19, keepBuffer: 4, updateWhenZooming: false,
    });
    tileLayer.on('load', () => setTilesLoading(false));
    tileLayer.addTo(map);
    const loadingTimer = setTimeout(() => setTilesLoading(false), 1500);
    mapInstanceRef.current = map;
    setMapReady(true);
    return () => { clearTimeout(loadingTimer); map.remove(); mapInstanceRef.current = null; setMapReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 热力图 Canvas 层
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const prev = map.getContainer().querySelector('.heatmap-canvas');
    if (prev) prev.remove();
    if (!showHeatmap || !heatZones || heatZones.length === 0) return;

    const GRID = 0.003;
    const allLats = heatZones.map((z) => z.center[0]);
    const allLngs = heatZones.map((z) => z.center[1]);
    const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
    const gridMap = new Map<string, number>();
    for (const zone of heatZones) {
      const i = Math.round((zone.center[0] - minLat) / GRID);
      const j = Math.round((zone.center[1] - minLng) / GRID);
      gridMap.set(`${i},${j}`, zone.intensity);
    }
    function sample(lat: number, lng: number): number {
      const fi = (lat - minLat) / GRID, fj = (lng - minLng) / GRID;
      const i0 = Math.floor(fi), j0 = Math.floor(fj), di = fi - i0, dj = fj - j0;
      const v00 = gridMap.get(`${i0},${j0}`) ?? 0, v10 = gridMap.get(`${i0 + 1},${j0}`) ?? 0;
      const v01 = gridMap.get(`${i0},${j0 + 1}`) ?? 0, v11 = gridMap.get(`${i0 + 1},${j0 + 1}`) ?? 0;
      return v00 * (1 - di) * (1 - dj) + v10 * di * (1 - dj) + v01 * (1 - di) * dj + v11 * di * dj;
    }
    function toColor(v: number): string {
      if (v < 0.06) return 'transparent';
      const t = Math.min(v, 1);
      const hue = 240 - t * 240;
      const alpha = 0.28 + t * 0.42;
      return `hsla(${hue}, 80%, ${58 - t * 18}%, ${alpha})`;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'heatmap-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:400;';
    map.getContainer().appendChild(canvas);

    const render = () => {
      const size = map.getSize();
      const w = Math.floor(size.x), h = Math.floor(size.y);
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const STEP = 2;
      for (let py = 0; py < h; py += STEP) {
        for (let px = 0; px < w; px += STEP) {
          const latlng = map.containerPointToLatLng([px, py]);
          if (latlng.lat < minLat - 0.002 || latlng.lat > maxLat + 0.002 || latlng.lng < minLng - 0.002 || latlng.lng > maxLng + 0.002) continue;
          const v = sample(latlng.lat, latlng.lng);
          if (v > 0.06) { ctx.fillStyle = toColor(v); ctx.fillRect(px, py, STEP, STEP); }
        }
      }
    };
    render();
    let raf = 0;
    const scheduleRender = () => { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
    map.on('move', scheduleRender); map.on('zoom', render); map.on('resize', render);
    return () => { map.off('move', scheduleRender); map.off('zoom', render); map.off('resize', render); if (raf) cancelAnimationFrame(raf); canvas.remove(); };
  }, [heatZones, showHeatmap]);

  // 地点切换 flyTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([location.lat, location.lng], location.zoom, { duration: 1.2 });
  }, [location]);

  // 外部 flyTo（国家切换、POI 点击等）
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, { duration: 1.2 });
  }, [flyToTarget]);

  // 渲染情报 POI 标记
  const renderIntelMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (mode !== 'intel' || !pois) return;

    const items = categoryFilter ? pois.filter((p) => p.category === categoryFilter) : pois;
    items.forEach((item) => {
      const catConfig = CATEGORY_CONFIG[item.category];
      const isActive = activeNodeId === item.id;
      const icon = L.divIcon({
        className: 'radar-node-marker',
        html: `<div class="radar-node-wrapper" style="position:relative;width:40px;height:40px;">
          <div class="radar-pulse-ring" style="position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:1px solid ${catConfig.color};opacity:${isActive ? '1' : '0.5'};"></div>
          <div class="node-breathe" style="position:absolute;top:50%;left:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:${catConfig.color};box-shadow:0 0 12px ${catConfig.glowColor};${isActive ? 'transform:scale(1.4);box-shadow:0 0 20px ' + catConfig.color + ';' : ''}"></div>
        </div>`,
        iconSize: [40, 40], iconAnchor: [20, 20],
      });
      for (const lngOffset of [-360, 0, 360]) {
        const marker = L.marker([item.lat, item.lng + lngOffset], { icon }).addTo(map)
          .on('click', () => onNodeClick(item.id))
          .on('mouseover', () => onNodeHover(item.id))
          .on('mouseout', () => onNodeHover(null));
        marker.bindTooltip(`<div style="font-family:'PingFang SC',sans-serif;font-size:11px;line-height:1.5;"><div style="color:${catConfig.color};font-size:10px;font-weight:500;margin-bottom:2px;">${catConfig.icon} ${catConfig.label}</div><div style="color:#1f2937;font-weight:600;">${item.name}</div><div style="color:#6b7280;font-size:10px;margin-top:2px;">${item.shortLabel}</div></div>`, { direction: 'top', offset: [0, -16], className: 'radar-tooltip-light' });
        markersRef.current.push(marker);
      }
    });
  }, [pois, categoryFilter, activeNodeId, onNodeClick, onNodeHover, mode]);

  // 渲染日记标记
  const renderDiaryMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    diaryMarkersRef.current.forEach((m) => m.remove());
    diaryMarkersRef.current = [];
    if (mode !== 'diary' || !diaries) return;

    diaries.forEach((diary) => {
      for (const lngOffset of [-360, 0, 360]) {
        const marker = L.marker([diary.lat, diary.lng + lngOffset], { icon: createDiaryIcon(diary.lifeType) });
        marker.bindPopup(`<div style="font-family:system-ui,sans-serif;max-width:260px;"><h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#2C2416;">${diary.title}</h3><div style="font-size:11px;color:#5C5F62;margin-bottom:6px;">${diary.city} · ${LIFE_TYPE_LABELS[diary.lifeType]}</div><p style="font-size:12px;color:#444;line-height:1.5;margin-bottom:8px;">${diary.content.slice(0, 100)}${diary.content.length > 100 ? '...' : ''}</p><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:11px;color:#999;">${diary.anonymous ? '匿名' : diary.authorName} · ${'⭐'.repeat(diary.rating)}</span><span style="font-size:11px;color:#5C5F62;">👍 ${diary.likes}</span></div></div>`, { maxWidth: 280 });
        marker.on('click', () => onDiaryClick?.(diary));
        marker.addTo(map);
        diaryMarkersRef.current.push(marker);
      }
    });
  }, [diaries, mode, onDiaryClick]);

  useEffect(() => {
    if (mapReady) {
      if (mode === 'intel') {
        diaryMarkersRef.current.forEach((m) => m.remove());
        diaryMarkersRef.current = [];
        renderIntelMarkers();
      } else {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        renderDiaryMarkers();
      }
    }
  }, [mapReady, mode, renderIntelMarkers, renderDiaryMarkers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {tilesLoading && (
        <div className="absolute inset-0 bg-parchment flex items-center justify-center z-[1000] transition-opacity duration-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cream border-t-terracotta rounded-full animate-spin" />
            <span className="text-slate text-sm font-mono">MAP LOADING...</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.015]">
        <div className="scan-line absolute left-0 right-0 h-[1px] bg-terracotta" />
      </div>
    </div>
  );
}
