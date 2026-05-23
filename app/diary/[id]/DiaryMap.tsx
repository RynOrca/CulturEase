"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DiaryEntry } from "@/lib/types";

interface Props {
  diary: DiaryEntry;
}

export default function DiaryMap({ diary }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!ref.current || initialized.current) return;
    initialized.current = true;

    const map = L.map(ref.current, {
      center: [diary.lat, diary.lng],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Simple dot marker
    L.circleMarker([diary.lat, diary.lng], {
      radius: 10,
      fillColor: "#C67A53",
      color: "#fff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    return () => {
      map.remove();
      initialized.current = false;
    };
  }, [diary.lat, diary.lng]);

  return <div ref={ref} className="w-full h-full rounded-t-card" />;
}
