"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DiaryEntry, LIFE_TYPE_LABELS } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  housing: "#C4744E",
  commute: "#4A8C7E",
  social: "#C19A49",
  healthcare: "#B8443C",
  work: "#5E7F6B",
  expenses: "#4A7B9D",
  safety: "#9B5F4A",
  other: "#7B8B8E",
};

function createMarkerIcon(type: string): L.DivIcon {
  const color = TYPE_COLORS[type] || "#7B8B8E";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:12px;
    ">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

interface Props {
  diaries: DiaryEntry[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  minZoom?: number;
  onMarkerClick?: (diary: DiaryEntry) => void;
  selectedDiaryId?: string | null;
  onMapReady?: (map: L.Map) => void;
}

export function MapView({ diaries, centerLat, centerLng, zoom, minZoom = 3, onMarkerClick, selectedDiaryId, onMapReady }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    diaries.forEach((diary) => {
      const marker = L.marker([diary.lat, diary.lng], {
        icon: createMarkerIcon(diary.lifeType),
      });

      const popupContent = `
        <div style="font-family:system-ui,sans-serif;max-width:260px;">
          <h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#2C2416;">${diary.title}</h3>
          <div style="font-size:11px;color:#5C5F62;margin-bottom:6px;">
            ${diary.city} · ${diary.school || ""} · ${LIFE_TYPE_LABELS[diary.lifeType]}
          </div>
          <p style="font-size:12px;color:#444;line-height:1.5;margin-bottom:8px;">
            ${diary.content.slice(0, 100)}${diary.content.length > 100 ? "..." : ""}
          </p>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11px;color:#999;">${diary.anonymous ? "匿名" : diary.authorName} · ${"⭐".repeat(diary.rating)}</span>
            <span style="font-size:11px;color:#5C5F62;">👍 ${diary.likes}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });
      marker.on("click", () => onMarkerClick?.(diary));
      markersLayerRef.current!.addLayer(marker);
    });
  }, [diaries, onMarkerClick]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      worldCopyJump: true,
      minZoom,
      zoomControl: true,
    });
    if (centerLat != null && centerLng != null) {
      map.setView([centerLat, centerLng], zoom ?? 4);
    } else {
      map.setView([25, 0], 3);
    }

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when diaries change
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Open popup for selected diary
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !selectedDiaryId) return;
    markersLayerRef.current.eachLayer((layer) => {
      const marker = layer as L.Marker;
      const popup = marker.getPopup();
      if (popup) {
        // Force close any open popup to re-trigger
        marker.closePopup();
      }
    });
  }, [selectedDiaryId]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" style={{ borderRadius: 0 }} />
    </div>
  );
}
