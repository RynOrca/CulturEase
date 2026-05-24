'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SEARCH_LOCATIONS } from '@/lib/data/intel';
import type { SearchLocation } from '@/lib/types';

// ─── CulturEase 暖色主题 ───
const COLORS = {
  landCore: new THREE.Color(0xE8A87C),    // warm peach
  landMid: new THREE.Color(0xC67A53),     // terracotta
  landEdge: new THREE.Color(0xA06040),    // warm brown
  coast: new THREE.Color(0xF3EFE8),       // cream
  ocean: new THREE.Color(0x1a2228),       // deep cool (contrast)
  oceanDot: new THREE.Color(0x2a3844),
  glow: new THREE.Color(0xC19A49),        // amber
  glowOuter: new THREE.Color(0xD4956B),
  grid: new THREE.Color(0x5E7F6B),        // sage
  beam: new THREE.Color(0xF3EFE8),        // cream
};

interface GlobeProps {
  onCityHover: (city: SearchLocation | null) => void;
  onCityClick: (city: SearchLocation) => void;
  flyToTarget?: { lat: number; lng: number; name?: string; nameEn?: string } | null;
  onFlyComplete?: () => void;
  onHoldStart?: () => void;
  hotspots?: { id: string; name: string; lat: number; lng: number }[];
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return new THREE.Vector3(radius * Math.cos(latRad) * Math.sin(lngRad), radius * Math.sin(latRad), radius * Math.cos(latRad) * Math.cos(lngRad));
}

// 简化大陆轮廓
const CONTINENTS: [number, number][][] = [
  [[-17,15],[-12,25],[-5,35],[10,37],[12,33],[32,32],[35,30],[42,12],[50,2],[42,-5],[40,-12],[35,-25],[28,-34],[20,-35],[17,-30],[12,-18],[10,-5],[5,5],[-5,5],[-8,5],[-15,10],[-17,15]],
  [[-10,36],[0,43],[-2,47],[-5,48],[-10,52],[-5,58],[5,62],[10,60],[18,64],[25,70],[32,70],[42,68],[45,55],[30,45],[29,36],[25,36],[20,35],[10,36],[0,36],[-10,36]],
  [[29,36],[30,45],[42,55],[42,68],[50,70],[60,72],[70,72],[80,70],[90,72],[100,72],[120,70],[135,65],[142,55],[145,45],[140,38],[130,35],[125,30],[122,25],[120,22],[110,18],[105,10],[100,5],[95,10],[88,22],[80,8],[77,8],[73,10],[68,24],[60,25],[55,25],[50,28],[45,30],[35,30],[29,36]],
  [[-168,68],[-158,62],[-140,60],[-130,55],[-125,50],[-124,42],[-120,35],[-117,33],[-110,30],[-105,25],[-100,20],[-97,18],[-90,18],[-85,12],[-83,10],[-80,8],[-78,18],[-75,22],[-80,25],[-85,30],[-82,32],[-75,35],[-65,45],[-55,47],[-55,52],[-60,55],[-65,60],[-75,62],[-80,65],[-95,70],[-105,72],[-130,72],[-168,68]],
  [[-80,10],[-78,5],[-75,5],[-70,5],[-60,5],[-50,0],[-45,-5],[-40,-5],[-35,-10],[-38,-18],[-40,-23],[-45,-25],[-50,-30],[-55,-35],[-60,-40],[-65,-45],[-68,-50],[-70,-53],[-75,-52],[-75,-45],[-72,-35],[-70,-20],[-75,-15],[-78,-5],[-80,5],[-80,10]],
  [[115,-15],[120,-12],[130,-12],[135,-12],[140,-15],[145,-15],[150,-18],[152,-25],[150,-30],[148,-35],[140,-38],[135,-35],[130,-33],[125,-33],[115,-25],[114,-22],[115,-15]],
  [[-55,60],[-45,60],[-22,70],[-18,75],[-20,80],[-30,82],[-45,82],[-55,78],[-55,72],[-55,60]],
  [[-8,50],[-5,50],[2,52],[2,56],[-2,58],[-5,58],[-8,55],[-10,52],[-8,50]],
  [[130,31],[132,34],[136,35],[140,38],[142,42],[145,44],[145,42],[140,38],[137,35],[134,33],[130,31]],
  [[166,-47],[168,-45],[172,-42],[175,-40],[178,-38],[178,-40],[174,-42],[170,-44],[166,-47]],
  [[44,-12],[48,-14],[50,-18],[50,-23],[47,-25],[44,-24],[43,-18],[44,-12]],
  [[95,-5],[100,-2],[105,-5],[108,-7],[112,-8],[115,-8],[120,-8],[125,-5],[130,-3],[135,-5],[140,-6],[140,-8],[135,-8],[125,-8],[115,-10],[108,-8],[105,-7],[100,-5],[95,-5]],
  [[5,58],[8,60],[12,64],[15,68],[18,70],[25,71],[30,70],[28,65],[22,62],[18,60],[15,58],[10,58],[5,58]],
  [[-24,64],[-22,65],[-18,66],[-14,65],[-14,64],[-18,63],[-22,63],[-24,64]],
  [[120,22],[121,24],[122,25],[122,24],[121,22],[120,22]],
  [[80,6],[81,8],[82,8],[82,7],[81,6],[80,6]],
  [[118,7],[120,10],[122,14],[124,18],[126,18],[125,14],[122,10],[120,8],[118,7]],
];

function createLandMask(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 360;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 720, 360);
  ctx.fillStyle = '#ffffff';
  CONTINENTS.forEach((continent) => {
    ctx.beginPath();
    continent.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * 720;
      const y = ((90 - lat) / 180) * 360;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath(); ctx.fill();
  });
  return canvas;
}

function isLand(lon: number, lat: number, mask: HTMLCanvasElement): boolean {
  const ctx = mask.getContext('2d')!;
  const x = Math.floor(((lon + 180) / 360) * 720);
  const y = Math.floor(((90 - lat) / 180) * 360);
  return ctx.getImageData(Math.max(0, Math.min(719, x)), Math.max(0, Math.min(359, y)), 1, 1).data[0] > 128;
}

export default function Globe({ onCityHover, onCityClick, flyToTarget, onFlyComplete, onHoldStart, hotspots }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCityHoverRef = useRef(onCityHover);
  const onCityClickRef = useRef(onCityClick);
  const onFlyCompleteRef = useRef(onFlyComplete);
  const onHoldStartRef = useRef(onHoldStart);
  const flyTargetRef = useRef(flyToTarget);

  useEffect(() => { onCityHoverRef.current = onCityHover; }, [onCityHover]);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);
  useEffect(() => { onFlyCompleteRef.current = onFlyComplete; }, [onFlyComplete]);
  useEffect(() => { onHoldStartRef.current = onHoldStart; }, [onHoldStart]);
  useEffect(() => { flyTargetRef.current = flyToTarget; }, [flyToTarget]);

  const handleCityHover = useCallback((city: SearchLocation | null) => { onCityHoverRef.current(city); }, []);
  const handleCityClick = useCallback((city: SearchLocation) => { onCityClickRef.current(city); }, []);

  const flyAnimRef = useRef<{ phase: 'rotating' | 'zooming' | 'holding' | 'done'; targetX: number; targetY: number; startX: number; startY: number; startZ: number; startTiltZ: number; elapsed: number } | null>(null);

  useEffect(() => {
    if (!flyToTarget) return;
    const latRad = (flyToTarget.lat * Math.PI) / 180;
    const lngRad = (flyToTarget.lng * Math.PI) / 180;
    flyAnimRef.current = { phase: 'rotating', targetX: latRad, targetY: Math.PI - lngRad, startX: 0, startY: 0, startZ: 26, startTiltZ: 0, elapsed: 0 };
  }, [flyToTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1016, 0.0008);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 23.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0d1016, 1);
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.9;

    const RADIUS = 9.2;
    const landMask = createLandMask();

    // ─── 粒子球体 ───
    const LAND_COUNT = 8000;
    const OCEAN_COUNT = 1200;

    const landPositions = new Float32Array(LAND_COUNT * 3);
    const landColors = new Float32Array(LAND_COUNT * 3);
    let landIdx = 0;
    let attempts = 0;
    while (landIdx < LAND_COUNT && attempts < LAND_COUNT * 10) {
      attempts++;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const lat = 90 - (phi * 180) / Math.PI;
      const lng = (theta * 180) / Math.PI - 180;
      if (!isLand(lng, lat, landMask)) continue;
      const point = latLngToVector3(lat, lng, RADIUS + (Math.random() - 0.5) * 0.12);
      landPositions[landIdx * 3] = point.x; landPositions[landIdx * 3 + 1] = point.y; landPositions[landIdx * 3 + 2] = point.z;
      const t = Math.random();
      let c: THREE.Color;
      if (t > 0.75) c = COLORS.landCore.clone().lerp(COLORS.coast, Math.random() * 0.25);
      else if (t > 0.35) c = COLORS.landMid.clone().lerp(COLORS.landCore, Math.random() * 0.4);
      else c = COLORS.landEdge.clone().lerp(COLORS.landMid, Math.random() * 0.4);
      landColors[landIdx * 3] = c.r; landColors[landIdx * 3 + 1] = c.g; landColors[landIdx * 3 + 2] = c.b;
      landIdx++;
    }
    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute('position', new THREE.BufferAttribute(landPositions.subarray(0, landIdx * 3), 3));
    landGeo.setAttribute('color', new THREE.BufferAttribute(landColors.subarray(0, landIdx * 3), 3));
    const landMat = new THREE.PointsMaterial({ size: 0.1, transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    globeGroup.add(new THREE.Points(landGeo, landMat));

    const oceanPositions = new Float32Array(OCEAN_COUNT * 3);
    const oceanColorsArr = new Float32Array(OCEAN_COUNT * 3);
    let oceanIdx = 0;
    attempts = 0;
    while (oceanIdx < OCEAN_COUNT && attempts < OCEAN_COUNT * 6) {
      attempts++;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const lat = 90 - (phi * 180) / Math.PI;
      const lng = (theta * 180) / Math.PI - 180;
      if (isLand(lng, lat, landMask)) continue;
      const point = latLngToVector3(lat, lng, RADIUS);
      oceanPositions[oceanIdx * 3] = point.x; oceanPositions[oceanIdx * 3 + 1] = point.y; oceanPositions[oceanIdx * 3 + 2] = point.z;
      const c = COLORS.oceanDot.clone().lerp(COLORS.ocean, Math.random() * 0.5);
      oceanColorsArr[oceanIdx * 3] = c.r; oceanColorsArr[oceanIdx * 3 + 1] = c.g; oceanColorsArr[oceanIdx * 3 + 2] = c.b;
      oceanIdx++;
    }
    const oceanGeo = new THREE.BufferGeometry();
    oceanGeo.setAttribute('position', new THREE.BufferAttribute(oceanPositions.subarray(0, oceanIdx * 3), 3));
    oceanGeo.setAttribute('color', new THREE.BufferAttribute(oceanColorsArr.subarray(0, oceanIdx * 3), 3));
    const oceanMat = new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.3, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    globeGroup.add(new THREE.Points(oceanGeo, oceanMat));

    // ─── 线框 ───
    const wireframeGeo = new THREE.SphereGeometry(RADIUS * 1.005, 48, 24);
    const wireframeMat = new THREE.MeshBasicMaterial({ color: 0x5E7F6B, transparent: true, opacity: 0.06, wireframe: true, depthWrite: false });
    globeGroup.add(new THREE.Mesh(wireframeGeo, wireframeMat));

    // ─── 经纬环 ───
    function createRing(latDeg: number, color: THREE.Color, opacity: number) {
      const phi = (90 - latDeg) * (Math.PI / 180);
      const r = RADIUS * Math.cos(phi) * 1.002;
      const y = RADIUS * Math.sin(phi);
      const ringGeo = new THREE.TorusGeometry(r, 0.015, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = y; ring.rotation.x = Math.PI / 2;
      return ring;
    }
    globeGroup.add(createRing(0, COLORS.grid, 0.10));
    globeGroup.add(createRing(23.5, COLORS.grid, 0.05));
    globeGroup.add(createRing(-23.5, COLORS.grid, 0.05));
    globeGroup.add(createRing(66.5, COLORS.grid, 0.03));
    globeGroup.add(createRing(-66.5, COLORS.grid, 0.03));

    for (let lng = 0; lng < 360; lng += 30) {
      const points: THREE.Vector3[] = [];
      for (let lat = -85; lat <= 85; lat += 2) points.push(latLngToVector3(lat, lng - 180, RADIUS * 1.003));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity: 0.04, depthWrite: false });
      globeGroup.add(new THREE.Line(lineGeo, lineMat));
    }

    // ─── 大气辉光 ───
    const glowGeo = new THREE.SphereGeometry(RADIUS * 1.15, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: COLORS.glow } },
      vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main() { vec4 worldPos = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vPosition = worldPos.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vPosition; uniform vec3 uColor; void main() { vec3 viewDir = normalize(cameraPosition - vPosition); float rim = 1.0 - abs(dot(vNormal, viewDir)); float alpha = pow(rim, 3.5) * 0.22; gl_FragColor = vec4(uColor, alpha); }`,
      transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    const glowOuterGeo = new THREE.SphereGeometry(RADIUS * 1.35, 64, 64);
    const glowOuterMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: COLORS.glowOuter } },
      vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main() { vec4 worldPos = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vPosition = worldPos.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vPosition; uniform vec3 uColor; void main() { vec3 viewDir = normalize(cameraPosition - vPosition); float rim = 1.0 - abs(dot(vNormal, viewDir)); float alpha = pow(rim, 5.0) * 0.10; gl_FragColor = vec4(uColor, alpha); }`,
      transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowOuterGeo, glowOuterMat));

    // ─── 星场 ───
    const starsGeo = new THREE.BufferGeometry();
    const STAR_COUNT = 800;
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = RADIUS * (1.8 + Math.random() * 3);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.45, color: 0xffeedd, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // ─── 城市标记 ───
    const cityGroup = new THREE.Group();
    globeGroup.add(cityGroup);

    const hotspotMeshes: THREE.Mesh[] = [];
    const cityDataList: { id: string; name: string; lat: number; lng: number }[] = [];
    const cityOriginalScales: THREE.Vector3[] = [];
    const beamGroups: THREE.Group[] = [];

    const cityMarkers: { id: string; name: string; lat: number; lng: number }[] = hotspots && hotspots.length > 0
      ? hotspots
      : SEARCH_LOCATIONS.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

    cityMarkers.forEach((city) => {
      const pos = latLngToVector3(city.lat, city.lng, RADIUS);
      const normal = pos.clone().normalize();

      const dotGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xC19A49 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData = { cityId: city.id };
      hotspotMeshes.push(dot);
      cityDataList.push(city);
      cityOriginalScales.push(dot.scale.clone());
      cityGroup.add(dot);

      const ringGeo = new THREE.TorusGeometry(0.22, 0.025, 16, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xC19A49, transparent: true, opacity: 0.4, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      ring.userData = { isRing: true, baseOpacity: 0.4 };
      cityGroup.add(ring);

      const outerRingGeo = new THREE.TorusGeometry(0.32, 0.018, 16, 32);
      const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xC19A49, transparent: true, opacity: 0.2, depthWrite: false });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRing.position.copy(pos);
      outerRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      outerRing.userData = { isOuterRing: true, baseOpacity: 0.2 };
      cityGroup.add(outerRing);

      const beamGroup = new THREE.Group();
      const beamHeight = 0.6;
      const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, beamHeight, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xF3EFE8, transparent: true, opacity: 0.5, depthWrite: false });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(normal.clone().multiplyScalar(RADIUS + beamHeight / 2));
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      beamGroup.add(beam);
      beamGroup.userData = { isBeam: true };
      cityGroup.add(beamGroup);
      beamGroups.push(beamGroup);
    });

    // ─── 城市间弧线 ───
    const arcLineGroups: THREE.Group[] = [];
    if (cityMarkers.length >= 2) {
      const arcPairCount = Math.min(cityMarkers.length, 6);
      for (let i = 0; i < arcPairCount - 1; i++) {
        const a = i, b = (i + 1) % cityMarkers.length;
        if (b <= a) continue;
        const start = latLngToVector3(cityMarkers[a].lat, cityMarkers[a].lng, RADIUS);
        const end = latLngToVector3(cityMarkers[b].lat, cityMarkers[b].lng, RADIUS);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(RADIUS * 1.35);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const curvePoints = curve.getPoints(60);
        const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const arcMat = new THREE.LineBasicMaterial({ color: 0xD4956B, transparent: true, opacity: 0.15, depthWrite: false });
        cityGroup.add(new THREE.Line(arcGeo, arcMat));
        const group = new THREE.Group();
        const dotCount = 3;
        for (let j = 0; j < dotCount; j++) {
          const dGeo = new THREE.SphereGeometry(0.06, 4, 4);
          const dMat = new THREE.MeshBasicMaterial({ color: 0xF3EFE8, transparent: true, opacity: 0.8, depthWrite: false });
          const d = new THREE.Mesh(dGeo, dMat);
          d.userData = { tOffset: j / dotCount, speed: 0.15 + Math.random() * 0.1 };
          group.add(d);
        }
        group.userData = { curvePoints, isArcParticles: true };
        cityGroup.add(group);
        arcLineGroups.push(group);
      }
    }

    // ─── Raycaster ───
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.8;
    const mouse = new THREE.Vector2();
    let hoveredIdx = -1;
    let isHoveringCity = false;

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      scene.updateMatrixWorld(true);
      const intersects = raycaster.intersectObjects(hotspotMeshes, false);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const idx = hotspotMeshes.indexOf(obj as THREE.Mesh);
        if (idx !== hoveredIdx) {
          if (hoveredIdx >= 0) hotspotMeshes[hoveredIdx].scale.copy(cityOriginalScales[hoveredIdx]);
          hoveredIdx = idx;
          obj.scale.set(2.5, 2.5, 2.5);
          handleCityHover(cityDataList[idx] as unknown as SearchLocation);
          isHoveringCity = true;
        }
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (hoveredIdx >= 0) { hotspotMeshes[hoveredIdx].scale.copy(cityOriginalScales[hoveredIdx]); hoveredIdx = -1; handleCityHover(null); isHoveringCity = false; }
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      scene.updateMatrixWorld(true);
      const intersects = raycaster.intersectObjects(hotspotMeshes, false);
      if (intersects.length > 0) {
        const idx = hotspotMeshes.indexOf(intersects[0].object as THREE.Mesh);
        if (idx >= 0) handleCityClick(cityDataList[idx] as unknown as SearchLocation);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // ─── 动画循环 ───
    const autoRotateSpeed = 0.0008;
    globeGroup.rotation.z = 23.5 * Math.PI / 180;
    globeGroup.rotation.y = -20 * Math.PI / 180;

    let lastFrameTime = performance.now();
    let elapsedSeconds = 0;
    let isDragging = false;
    let dragTimeout: ReturnType<typeof setTimeout>;

    container.addEventListener('pointerdown', () => { isDragging = true; clearTimeout(dragTimeout); });
    container.addEventListener('pointerup', () => { dragTimeout = setTimeout(() => { isDragging = false; }, 1500); });

    const animate = () => {
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;
      elapsedSeconds += dt;

      const fly = flyAnimRef.current;
      if (fly && fly.phase === 'rotating') {
        if (fly.elapsed === 0) { fly.startX = globeGroup.rotation.x; fly.startY = globeGroup.rotation.y; fly.startZ = camera.position.z; fly.startTiltZ = globeGroup.rotation.z; }
        fly.elapsed += dt;
        const t = Math.min(fly.elapsed / 1.2, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        let diffY = fly.targetY - fly.startY;
        while (diffY > Math.PI) diffY -= Math.PI * 2;
        while (diffY < -Math.PI) diffY += Math.PI * 2;
        globeGroup.rotation.y = fly.startY + diffY * ease;
        globeGroup.rotation.x = fly.startX + (fly.targetX - fly.startX) * ease;
        if (t >= 1) { globeGroup.rotation.y = fly.targetY; globeGroup.rotation.x = fly.targetX; fly.phase = 'zooming'; fly.elapsed = 0; }
      } else if (fly && fly.phase === 'zooming') {
        fly.elapsed += dt;
        const t = Math.min(fly.elapsed / 0.8, 1);
        const ease = 1 - Math.pow(1 - t, 2);
        camera.position.z = fly.startZ - (fly.startZ - 10.8) * ease;
        globeGroup.rotation.z = fly.startTiltZ - fly.startTiltZ * ease;
        if (t >= 1) { camera.position.z = 12; globeGroup.rotation.z = 0; fly.phase = 'holding'; fly.elapsed = 0; onHoldStartRef.current?.(); }
      } else if (fly && fly.phase === 'holding') {
        fly.elapsed += dt;
        if (fly.elapsed >= 1.0) { fly.phase = 'done'; flyAnimRef.current = null; onFlyCompleteRef.current?.(); }
      }

      if ((!fly || fly.phase === 'done') && !isDragging && !isHoveringCity) globeGroup.rotation.y += autoRotateSpeed;

      hotspotMeshes.forEach((mesh, i) => {
        if (i !== hoveredIdx) mesh.scale.setScalar(1 + Math.sin(elapsedSeconds * 2.5 + i * 1.3) * 0.35);
      });

      cityGroup.children.forEach((child) => {
        if (child.userData.isRing && child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).opacity = (child.userData.baseOpacity as number) + Math.sin(elapsedSeconds * 2 + 0.5) * 0.15;
        }
        if (child.userData.isOuterRing && child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).opacity = (child.userData.baseOpacity as number) + Math.sin(elapsedSeconds * 1.8 + 1) * 0.08;
        }
      });

      beamGroups.forEach((group, i) => {
        ((group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(elapsedSeconds * 2 + i * 1.5) * 0.2;
      });

      arcLineGroups.forEach((group) => {
        const points = group.userData.curvePoints as THREE.Vector3[];
        group.children.forEach((child) => {
          const d = child as THREE.Mesh;
          let t = (((elapsedSeconds * (d.userData.speed as number) + (d.userData.tOffset as number)) % 1) + 1) % 1;
          const idx = t * (points.length - 1);
          const i0 = Math.floor(idx), i1 = Math.min(i0 + 1, points.length - 1);
          d.position.lerpVectors(points[i0], points[i1], idx - i0);
        });
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [handleCityHover, handleCityClick]);

  return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />;
}
