import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ExperienceId } from '../../types/earthsonic';
import {
  clampLatLon,
  GLOBE_PRESET_LOCATIONS,
  useEarthSonicStore
} from '../../store/useEarthSonicStore';
import { sonificationEngine } from '../../audio/sonificationEngine';
import {
  isEffectiveReducedMotionActive,
  useAccessibilityStore
} from '../../store/useAccessibilityStore';
import { liveAnnouncer } from '../../services/a11yAnnouncer';
import { speechService } from '../../services/speechService';
import { SvgOrthographicFallback } from './SvgOrthographicFallback';
import { LocationPinCard, getPlaceTypeIcon } from './LocationPinCard';
import {
  formatCoords,
  lookupPlace,
  preloadPlaceLookup,
  searchPlacesOffline,
  type PlaceLookupResult,
  type PlaceSearchItem
} from '../../services/placeLookup';
import {
  Compass,
  Eye,
  Hand,
  Info,
  MapPin,
  RotateCcw,
  Search,
  Volume2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export type GlobeMode = 'hero' | 'explorer' | 'compact' | 'practice';

export interface InteractiveGlobeProps {
  mode?: GlobeMode;
  experienceId: ExperienceId;
  accentColor: string;
  lat: number;
  lon: number;
  normalizedValue?: number; // 0..1 from real loaded observation
  rawValueLabel?: string;
  isGlobalDataset?: boolean;
  isAudioPlaying?: boolean;
  onSelectLocation?: (lat: number, lon: number, name?: string, meta?: PlaceLookupResult) => void;
  onPracticeAction?: (action: 'rotate' | 'zoom_in' | 'zoom_out' | 'pin' | 'reset') => void;
  heightClass?: string;
  topLeftOffsetClass?: string;
}

function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vector3ToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
  const norm = vec.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);
  const lon = ((Math.atan2(norm.z, -norm.x) * (180 / Math.PI)) - 180 + 540) % 360 - 180;
  return clampLatLon(lat, lon);
}

/**
 * Generates an equirectangular procedural Earth texture (deep navy oceans, illuminated landmass silhouettes,
 * and subtle 15° graticule) so the 3D navigation globe works 100% offline with zero CORS issues.
 */
function createProceduralEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0B1D36');
  grad.addColorStop(0.5, '#071426');
  grad.addColorStop(1, '#0B1D36');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Helper to convert (lon, lat) -> (x, y)
  const px = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * 1024,
    ((90 - lat) / 180) * 512
  ];

  // Simplified continental landmass polygons
  const continents: [number, number][][] = [
    // North America
    [[-168, 65], [-140, 70], [-95, 72], [-55, 52], [-75, 25], [-92, 16], [-105, 18], [-125, 38], [-168, 65]],
    // Greenland
    [[-52, 60], [-42, 82], [-18, 78], [-28, 66], [-52, 60]],
    // South America
    [[-80, 10], [-50, 5], [-35, -8], [-42, -24], [-66, -54], [-76, -40], [-80, 10]],
    // Europe & Asia
    [[-10, 36], [0, 52], [25, 70], [100, 74], [172, 66], [142, 35], [105, 10], [78, 8], [56, 22], [35, 32], [-10, 36]],
    // Africa
    [[-17, 15], [-6, 36], [32, 31], [51, 12], [40, -15], [20, -35], [12, -18], [9, 4], [-17, 15]],
    // Australia
    [[114, -22], [132, -12], [153, -26], [146, -38], [116, -34], [114, -22]],
    // Antarctica
    [[-180, -70], [-90, -72], [0, -70], [90, -72], [180, -70], [180, -89], [-180, -89], [-180, -70]]
  ];

  ctx.fillStyle = '#143052';
  ctx.strokeStyle = 'rgba(82, 199, 245, 0.45)';
  ctx.lineWidth = 1.5;
  for (const poly of continents) {
    ctx.beginPath();
    poly.forEach(([lo, la], i) => {
      const [x, y] = px(lo, la);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Subtle 15° graticule grid
  ctx.strokeStyle = 'rgba(82, 199, 245, 0.12)';
  ctx.lineWidth = 1;
  for (let lon = -165; lon <= 180; lon += 15) {
    const [x] = px(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = px(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({
  mode = 'explorer',
  experienceId,
  accentColor,
  lat,
  lon,
  normalizedValue = 0.5,
  rawValueLabel,
  isGlobalDataset = false,
  isAudioPlaying = false,
  onSelectLocation,
  onPracticeAction,
  heightClass,
  topLeftOffsetClass = ''
}) => {
  const use2DMapFallback = useEarthSonicStore((s) => s.use2DMapFallback);
  const lowQualityMode = useEarthSonicStore((s) => s.lowQualityMode);
  const setLowQualityMode = useEarthSonicStore((s) => s.setLowQualityMode);
  const pinCardOpen = useEarthSonicStore((s) => s.pinCardOpen);
  const setPinCardOpen = useEarthSonicStore((s) => s.setPinCardOpen);
  const favoritePlaces = useEarthSonicStore((s) => s.favoritePlaces);
  const toggleFavoritePlace = useEarthSonicStore((s) => s.toggleFavoritePlace);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pinCardWrapRef = useRef<HTMLDivElement | null>(null);
  const leaderSvgRef = useRef<SVGSVGElement | null>(null);
  const leaderLineRef = useRef<SVGLineElement | null>(null);
  const leaderDotRef = useRef<SVGCircleElement | null>(null);

  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const [texturesReady, setTexturesReady] = useState<boolean>(false);
  const [interactEnabled, setInteractEnabled] = useState<boolean>(mode !== 'hero');
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showLocationTools, setShowLocationTools] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [offlineSearchResults, setOfflineSearchResults] = useState<PlaceSearchItem[]>([]);
  const [latInput, setLatInput] = useState<string>(String(lat));
  const [lonInput, setLonInput] = useState<string>(String(lon));
  const [reticleCoords, setReticleCoords] = useState<{ lat: number; lon: number }>({ lat, lon });
  const [reticlePlace, setReticlePlace] = useState<PlaceLookupResult | null>(null);
  const [pinnedPlace, setPinnedPlace] = useState<PlaceLookupResult | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    x: number;
    y: number;
    place: PlaceLookupResult;
  } | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [showViewDescription, setShowViewDescription] = useState(false);
  const speechEnabled = useAccessibilityStore((s) => s.prefs.speechEnabled);

  const viewDescriptionText = useMemo(() => {
    const centerName = reticlePlace?.placeName || formatCoords(reticleCoords.lat, reticleCoords.lon);
    const hemiNs = reticleCoords.lat >= 0 ? 'Northern Hemisphere' : 'Southern Hemisphere';
    const pinInfo = pinnedPlace
      ? ` Selected pin: ${pinnedPlace.placeName} (${pinnedPlace.formattedCoords}).`
      : '';
    const layerInfo =
      experienceId === 'temperature'
        ? 'Showing NASA temperature anomaly height column around the active sector.'
        : experienceId === 'ocean'
        ? 'Showing ocean sea-level and sea-surface temperature particle flux.'
        : 'Showing atmospheric column CO2 and aerosol streamline overlay.';
    return `3D Blue Marble globe centered near ${centerName} (${formatCoords(reticleCoords.lat, reticleCoords.lon)}, ${hemiNs}). ${layerInfo}${rawValueLabel ? ` Current reading: ${rawValueLabel}.` : ''}${pinInfo}`;
  }, [reticlePlace, reticleCoords.lat, reticleCoords.lon, pinnedPlace, experienceId, rawValueLabel]);

  // Keep refs synced for rAF loop without restarting WebGL scene
  const latestPropsRef = useRef({
    experienceId,
    accentColor,
    lat,
    lon,
    normalizedValue,
    isGlobalDataset,
    isAudioPlaying,
    lowQualityMode,
    mode,
    pinCardOpen
  });
  latestPropsRef.current = {
    experienceId,
    accentColor,
    lat,
    lon,
    normalizedValue,
    isGlobalDataset,
    isAudioPlaying,
    lowQualityMode,
    mode,
    pinCardOpen
  };

  // Lazy-load offline gazetteer only when globe mounts, and resolve initial pin & reticle places
  useEffect(() => {
    preloadPlaceLookup();
  }, []);

  useEffect(() => {
    let active = true;
    lookupPlace(lat, lon).then((res) => {
      if (active) setPinnedPlace(res);
    });
    return () => {
      active = false;
    };
  }, [lat, lon]);

  // Debounced live reticle name lookup (max once per 100ms while turning the globe)
  const reticleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode === 'hero') return;
    if (reticleTimerRef.current !== null) {
      window.clearTimeout(reticleTimerRef.current);
    }
    reticleTimerRef.current = window.setTimeout(() => {
      void lookupPlace(reticleCoords.lat, reticleCoords.lon).then((res) => {
        setReticlePlace(res);
      });
    }, 100);
    return () => {
      if (reticleTimerRef.current !== null) {
        window.clearTimeout(reticleTimerRef.current);
      }
    };
  }, [reticleCoords.lat, reticleCoords.lon, mode]);

  // Live gazetteer search suggestions in Locations panel
  useEffect(() => {
    if (!showLocationTools) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void searchPlacesOffline(searchQuery, 8).then((res) => {
        if (active) setOfflineSearchResults(res);
      });
    }, 90);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, showLocationTools]);

  useEffect(() => {
    setLatInput(String(lat));
    setLonInput(String(lon));
  }, [lat, lon]);

  // Camera spherical state (yaw, pitch, distance) matched to latLonToVector3
  const clampCameraPitch = (latDeg: number) =>
    Math.max(-1.515, Math.min(1.515, latDeg * (Math.PI / 180) * 0.96));

  const camStateRef = useRef({
    yaw: (lon + 90) * (Math.PI / 180),
    pitch: clampCameraPitch(lat),
    distance: mode === 'hero' ? 3.05 : 3.35,
    targetYaw: (lon + 90) * (Math.PI / 180),
    targetPitch: clampCameraPitch(lat),
    targetDistance: mode === 'hero' ? 3.05 : 3.35,
    velYaw: 0,
    velPitch: 0,
    lastUserInteractionMs: 0,
    isVisible: true
  });

  // Smooth fly-to when external lat/lon changes
  useEffect(() => {
    const targetYaw = (lon + 90) * (Math.PI / 180);
    const targetPitch = clampCameraPitch(lat);
    camStateRef.current.lastUserInteractionMs = performance.now();
    if (isEffectiveReducedMotionActive()) {
      camStateRef.current.yaw = targetYaw;
      camStateRef.current.pitch = targetPitch;
    }
    camStateRef.current.targetYaw = targetYaw;
    camStateRef.current.targetPitch = targetPitch;
  }, [lat, lon]);

  const resetCamera = useCallback(() => {
    const targetYaw = (lon + 90) * (Math.PI / 180);
    const targetPitch = clampCameraPitch(lat);
    const defaultDist = mode === 'hero' ? 3.05 : 3.35;
    camStateRef.current.targetYaw = targetYaw;
    camStateRef.current.targetPitch = targetPitch;
    camStateRef.current.targetDistance = defaultDist;
    if (isEffectiveReducedMotionActive()) {
      camStateRef.current.yaw = targetYaw;
      camStateRef.current.pitch = targetPitch;
      camStateRef.current.distance = defaultDist;
    }
    onPracticeAction?.('reset');
    setStatusAnnouncement('Globe view reset.');
  }, [lat, lon, mode, onPracticeAction]);

  const adjustZoom = useCallback(
    (delta: number) => {
      camStateRef.current.targetDistance = Math.max(
        2.0,
        Math.min(5.0, camStateRef.current.targetDistance + delta)
      );
      onPracticeAction?.(delta < 0 ? 'zoom_in' : 'zoom_out');
    },
    [onPracticeAction]
  );

  // Main Three.js WebGL initialization with NASA Visible Earth / Blue Marble textures
  useEffect(() => {
    if (use2DMapFallback || webglFailed || !mountRef.current) return;
    const container = mountRef.current;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowQualityMode,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, lowQualityMode ? 1.25 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth || 480, container.clientHeight || 400);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 480) / Math.max(1, container.clientHeight || 400),
      0.1,
      120
    );

    // Physical Sunlight + Cool Space Fill
    const sunDirection = new THREE.Vector3(5.2, 3.6, 2.4).normalize();
    const ambient = new THREE.AmbientLight(0x284775, 0.36);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x050914, 0.34);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sun.position.copy(sunDirection).multiplyScalar(8);
    scene.add(sun);

    const rimFill = new THREE.DirectionalLight(0x2e6bb8, 0.2);
    rimFill.position.set(-5, -2, -3);
    scene.add(rimFill);

    // Choose 1024px mobile/low-power textures vs 2048px desktop textures
    const isCompactViewport = window.innerWidth < 768;
    const texRes = lowQualityMode || isCompactViewport ? '1024' : '2048';
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

    const fallbackProcTex = createProceduralEarthTexture();
    const disposableTextures: THREE.Texture[] = [fallbackProcTex];
    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];

    const earthGeom = new THREE.SphereGeometry(
      1,
      lowQualityMode ? 48 : 80,
      lowQualityMode ? 32 : 64
    );
    disposableGeometries.push(earthGeom);

    const earthMat = new THREE.MeshStandardMaterial({
      map: fallbackProcTex,
      roughness: 0.88,
      metalness: 0.02,
      bumpScale: 0.018,
      emissive: new THREE.Color('#ffbe6a'),
      emissiveIntensity: 0.0
    });
    disposableMaterials.push(earthMat);

    // Inject world-space day/night terminator mask for Black Marble city lights on dark side
    earthMat.onBeforeCompile = (shader) => {
      shader.uniforms.earthSunDir = { value: sunDirection };
      shader.vertexShader =
        'varying vec3 vEarthWorldNormal;\n' +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n  vEarthWorldNormal = normalize(mat3(modelMatrix) * objectNormal);'
        );
      shader.fragmentShader =
        'varying vec3 vEarthWorldNormal;\nuniform vec3 earthSunDir;\n' +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>\n  float sunDot = dot(normalize(vEarthWorldNormal), normalize(earthSunDir));\n  float nightMask = smoothstep(0.14, -0.18, sunDot);\n  totalEmissiveRadiance *= nightMask;`
        );
    };

    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    scene.add(earthMesh);

    // Separate Rotating Cloud Layer (r = 1.012)
    const cloudGeom = new THREE.SphereGeometry(
      1.012,
      lowQualityMode ? 40 : 64,
      lowQualityMode ? 28 : 48
    );
    disposableGeometries.push(cloudGeom);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf6fbff),
      transparent: true,
      opacity: 0.0,
      roughness: 0.94,
      metalness: 0.0,
      depthWrite: false
    });
    disposableMaterials.push(cloudMat);
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    scene.add(cloudMesh);

    // Load local verified NASA Blue Marble / Black Marble / Bump / Roughness / Cloud JPEGs
    let cancelled = false;
    setTexturesReady(false);
    const loader = new THREE.TextureLoader();

    const configureTex = (tex: THREE.Texture, isSrgb: boolean) => {
      if (isSrgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.needsUpdate = true;
      disposableTextures.push(tex);
      return tex;
    };

    const loadTex = (url: string, isSrgb: boolean) =>
      new Promise<THREE.Texture | null>((resolve) => {
        loader.load(
          url,
          (tex) => {
            if (cancelled) {
              tex.dispose();
              resolve(null);
              return;
            }
            resolve(configureTex(tex, isSrgb));
          },
          undefined,
          () => resolve(null)
        );
      });

    Promise.all([
      loadTex(`/textures/earth-day-${texRes}.jpg`, true),
      loadTex(`/textures/earth-night-${texRes}.jpg`, true),
      loadTex(`/textures/earth-roughness-${texRes}.jpg`, false),
      loadTex(`/textures/earth-bump-${texRes}.jpg`, false),
      loadTex(`/textures/earth-clouds-${texRes}.jpg`, false)
    ]).then(([dayTex, nightTex, roughTex, bumpTex, cloudTex]) => {
      if (cancelled) return;
      if (dayTex) earthMat.map = dayTex;
      if (nightTex) {
        earthMat.emissiveMap = nightTex;
        earthMat.emissiveIntensity = 1.45;
      }
      if (roughTex) {
        earthMat.roughnessMap = roughTex;
        earthMat.roughness = 1.0;
      }
      if (bumpTex) {
        earthMat.bumpMap = bumpTex;
      }
      earthMat.needsUpdate = true;
      if (cloudTex) {
        cloudMat.alphaMap = cloudTex;
        cloudMat.opacity = 0.68;
        cloudMat.needsUpdate = true;
      }
      setTexturesReady(true);
    });

    // Inner Atmospheric Rayleigh Rim Scatter (FrontSide limb glow)
    const innerAtmosGeom = new THREE.SphereGeometry(1.03, 56, 40);
    disposableGeometries.push(innerAtmosGeom);
    const innerAtmosMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        sunDir: { value: sunDirection },
        atmosColor: { value: new THREE.Color('#66D3FF') },
        accentTint: { value: new THREE.Color(accentColor) }
      },
      vertexShader: `
        varying vec3 vViewNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewPos;
        void main() {
          vViewNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDir;
        uniform vec3 atmosColor;
        uniform vec3 accentTint;
        varying vec3 vViewNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 V = normalize(vViewPos);
          float fresnel = pow(1.0 - max(dot(vViewNormal, V), 0.0), 3.4);
          float sunSide = smoothstep(-0.35, 0.85, dot(vWorldNormal, normalize(sunDir)));
          vec3 col = mix(atmosColor, accentTint, 0.16);
          gl_FragColor = vec4(col, 1.0) * fresnel * (0.28 + 0.72 * sunSide) * 0.9;
        }
      `
    });
    disposableMaterials.push(innerAtmosMat);
    const innerAtmosMesh = new THREE.Mesh(innerAtmosGeom, innerAtmosMat);
    scene.add(innerAtmosMesh);

    // Outer Space Atmosphere Halo (BackSide soft fade)
    const outerAtmosGeom = new THREE.SphereGeometry(1.16, 48, 32);
    disposableGeometries.push(outerAtmosGeom);
    const outerAtmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color('#52C7F5') }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float rim = pow(clamp(0.58 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.1);
          gl_FragColor = vec4(glowColor, 1.0) * rim * 0.72;
        }
      `
    });
    disposableMaterials.push(outerAtmosMat);
    const outerAtmosMesh = new THREE.Mesh(outerAtmosGeom, outerAtmosMat);
    scene.add(outerAtmosMesh);

    // Subtle Nebula / Galactic Glow Sprite behind Earth
    const nebCanvas = document.createElement('canvas');
    nebCanvas.width = 256;
    nebCanvas.height = 256;
    const nebCtx = nebCanvas.getContext('2d')!;
    const nebGrad = nebCtx.createRadialGradient(128, 128, 12, 128, 128, 128);
    nebGrad.addColorStop(0, 'rgba(62, 142, 224, 0.24)');
    nebGrad.addColorStop(0.45, 'rgba(30, 74, 142, 0.10)');
    nebGrad.addColorStop(1, 'rgba(5, 9, 20, 0)');
    nebCtx.fillStyle = nebGrad;
    nebCtx.fillRect(0, 0, 256, 256);
    const nebTex = new THREE.CanvasTexture(nebCanvas);
    disposableTextures.push(nebTex);
    const nebMat = new THREE.SpriteMaterial({
      map: nebTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    disposableMaterials.push(nebMat);
    const nebSprite = new THREE.Sprite(nebMat);
    nebSprite.scale.set(6.5, 5.2, 1);
    nebSprite.position.set(0.3, 0.25, -4);
    scene.add(nebSprite);

    // Deep Starfield (2 tiers of crisp stars with subtle warm/cool color variation)
    const starCount = lowQualityMode ? 550 : 1450;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color('#eef6ff'),
      new THREE.Color('#bde0fe'),
      new THREE.Color('#fff2d9'),
      new THREE.Color('#9ec5ff')
    ];
    for (let i = 0; i < starCount; i++) {
      const r = 14 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[i % palette.length];
      const bright = 0.55 + Math.random() * 0.45;
      starCol[i * 3] = c.r * bright;
      starCol[i * 3 + 1] = c.g * bright;
      starCol[i * 3 + 2] = c.b * bright;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    disposableGeometries.push(starGeom);
    const starMat = new THREE.PointsMaterial({
      size: lowQualityMode ? 0.08 : 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    disposableMaterials.push(starMat);
    const starPoints = new THREE.Points(starGeom, starMat);
    scene.add(starPoints);

    // Outer Faint Orbital Trajectory Arcs (matching slide-01 aesthetic)
    const createGuideRing = (radius: number, rx: number, rz: number, opacity: number) => {
      const pts: number[] = [];
      const segs = 128;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      disposableGeometries.push(g);
      const m = new THREE.LineBasicMaterial({
        color: new THREE.Color('#7cb8f5'),
        transparent: true,
        opacity,
        depthWrite: false
      });
      disposableMaterials.push(m);
      const loop = new THREE.LineLoop(g, m);
      loop.rotation.set(rx, 0, rz);
      scene.add(loop);
      return loop;
    };
    createGuideRing(1.56, 0.42, -0.24, 0.16);
    createGuideRing(1.74, 0.24, 0.28, 0.11);

    // Audio-Reactive Glowing Orbit Waveform Ring (192 vertices + glowing harmonic halo)
    const ringCount = 192;
    const ringPos = new Float32Array(ringCount * 3);
    const ringGlowPos = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      ringPos[i * 3] = Math.cos(a) * 1.38;
      ringPos[i * 3 + 1] = 0;
      ringPos[i * 3 + 2] = Math.sin(a) * 1.38;
      ringGlowPos[i * 3] = Math.cos(a) * 1.38;
      ringGlowPos[i * 3 + 1] = 0;
      ringGlowPos[i * 3 + 2] = Math.sin(a) * 1.38;
    }
    const ringGeom = new THREE.BufferGeometry();
    ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    disposableGeometries.push(ringGeom);
    const ringMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(mode === 'hero' ? '#8BE9FD' : accentColor),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    disposableMaterials.push(ringMat);
    const orbitRing = new THREE.LineLoop(ringGeom, ringMat);
    orbitRing.rotation.set(0.32, 0, -0.2);
    scene.add(orbitRing);

    const ringGlowGeom = new THREE.BufferGeometry();
    ringGlowGeom.setAttribute('position', new THREE.BufferAttribute(ringGlowPos, 3));
    disposableGeometries.push(ringGlowGeom);
    const ringGlowMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(mode === 'hero' ? '#52C7F5' : accentColor),
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });
    disposableMaterials.push(ringGlowMat);
    const orbitGlowRing = new THREE.LineLoop(ringGlowGeom, ringGlowMat);
    orbitGlowRing.rotation.copy(orbitRing.rotation);
    scene.add(orbitGlowRing);

    // 3 Small Generic Geometric Satellite Markers (no NASA logo or agency branding)
    const satGeoBody = new THREE.BoxGeometry(0.022, 0.016, 0.016);
    const satGeoWing = new THREE.BoxGeometry(0.068, 0.002, 0.014);
    disposableGeometries.push(satGeoBody, satGeoWing);
    const satMatBody = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.3
    });
    const satMatWing = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.45,
      metalness: 0.4,
      roughness: 0.4
    });
    disposableMaterials.push(satMatBody, satMatWing);

    const satellites = [
      { radius: 1.56, rx: 0.42, rz: -0.24, speed: 0.14, phase: 0.6 },
      { radius: 1.74, rx: 0.24, rz: 0.28, speed: -0.1, phase: 2.8 },
      { radius: 1.44, rx: -0.35, rz: 0.32, speed: 0.12, phase: 4.5 }
    ].map((cfg) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(satGeoBody, satMatBody);
      const wing = new THREE.Mesh(satGeoWing, satMatWing);
      grp.add(body, wing);
      scene.add(grp);
      return { ...cfg, grp };
    });

    // Pin marker, expanding surface ripple ring & Data-driven layer group
    const pinGeom = new THREE.SphereGeometry(0.028, 16, 16);
    disposableGeometries.push(pinGeom);
    const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor) });
    disposableMaterials.push(pinMat);
    const pinMesh = new THREE.Mesh(pinGeom, pinMat);
    scene.add(pinMesh);

    const rippleGeom = new THREE.RingGeometry(0.036, 0.052, 32);
    disposableGeometries.push(rippleGeom);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });
    disposableMaterials.push(rippleMat);
    const pinRippleMesh = new THREE.Mesh(rippleGeom, rippleMat);
    scene.add(pinRippleMesh);

    // Heat Column (Warming Planet)
    const heatGeom = new THREE.CylinderGeometry(0.015, 0.04, 1, 16);
    heatGeom.translate(0, 0.5, 0);
    disposableGeometries.push(heatGeom);
    const heatMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#FFC66D'),
      transparent: true,
      opacity: 0.78
    });
    disposableMaterials.push(heatMat);
    const heatColumn = new THREE.Mesh(heatGeom, heatMat);
    scene.add(heatColumn);

    // Rain/Wind Particles (Water Rhythm / Living Atmosphere)
    const pCount = lowQualityMode ? 45 : 110;
    const pPos = new Float32Array(pCount * 3);
    const pSeeds = new Float32Array(pCount);
    for (let i = 0; i < pCount; i++) {
      pSeeds[i] = Math.random();
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    disposableGeometries.push(pGeom);
    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(accentColor),
      size: 0.032,
      transparent: true,
      opacity: 0.85
    });
    disposableMaterials.push(pMat);
    const dataParticles = new THREE.Points(pGeom, pMat);
    scene.add(dataParticles);

    const freqData = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    // Pointer drag, click-to-pin & desktop hover / touch long-press preview
    let dragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let lastPointerPos = { x: 0, y: 0 };
    let lastHoverLookupMs = 0;
    let longPressTimer: number | null = null;
    let longPressTriggered = false;

    const triggerHoverPreview = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      pointerNdc.x = (localX / rect.width) * 2 - 1;
      pointerNdc.y = -(localY / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(earthMesh);
      if (hits.length > 0) {
        const coords = vector3ToLatLon(hits[0].point);
        void lookupPlace(coords.lat, coords.lon).then((place) => {
          setHoverPreview({ x: localX, y: localY, place });
        });
      } else {
        setHoverPreview(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (mode === 'hero' && !interactEnabled) return;
      dragging = true;
      longPressTriggered = false;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastPointerPos = { x: e.clientX, y: e.clientY };
      camStateRef.current.lastUserInteractionMs = performance.now();

      if (e.pointerType === 'touch' && mode !== 'hero') {
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        const cx = e.clientX;
        const cy = e.clientY;
        longPressTimer = window.setTimeout(() => {
          longPressTriggered = true;
          triggerHoverPreview(cx, cy);
        }, 420);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        const movedFromDown = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (movedFromDown > 5 && longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        const dx = e.clientX - lastPointerPos.x;
        const dy = e.clientY - lastPointerPos.y;
        lastPointerPos = { x: e.clientX, y: e.clientY };
        camStateRef.current.targetYaw -= dx * 0.0075;
        camStateRef.current.targetPitch = Math.max(
          -1.515,
          Math.min(1.515, camStateRef.current.targetPitch + dy * 0.0075)
        );
        camStateRef.current.velYaw = -dx * 0.0025;
        camStateRef.current.velPitch = dy * 0.0025;
        camStateRef.current.lastUserInteractionMs = performance.now();
        setHoverPreview(null);
        onPracticeAction?.('rotate');
      } else if (e.pointerType !== 'touch' && mode !== 'hero') {
        const nowMs = performance.now();
        if (nowMs - lastHoverLookupMs >= 110) {
          lastHoverLookupMs = nowMs;
          triggerHoverPreview(e.clientX, e.clientY);
        }
      }
    };

    const onPointerLeave = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      setHoverPreview(null);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (!dragging) return;
      dragging = false;
      const movedDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (movedDist < 5 && !longPressTriggered && onSelectLocation) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObject(earthMesh);
        if (hits.length > 0) {
          const coords = vector3ToLatLon(hits[0].point);
          setHoverPreview(null);
          setPinCardOpen(true);
          void lookupPlace(coords.lat, coords.lon).then((place) => {
            setPinnedPlace(place);
            onSelectLocation(coords.lat, coords.lon, place.placeName, place);
            setStatusAnnouncement(`Pinned ${place.placeName}, ${place.formattedCoords}.`);
          });
          onPracticeAction?.('pin');
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactEnabled && mode !== 'explorer') return;
      e.preventDefault();
      adjustZoom(e.deltaY > 0 ? 0.25 : -0.25);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 400;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        camStateRef.current.isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let slowFrameCount = 0;
    const satEuler = new THREE.Euler();
    const satVec = new THREE.Vector3();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden || !camStateRef.current.isVisible) {
        lastTime = now;
        return;
      }

      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Adaptive quality: step down if frames exceed 55ms consistently
      if (dt > 0.055 && !latestPropsRef.current.lowQualityMode) {
        slowFrameCount++;
        if (slowFrameCount > 25) {
          setLowQualityMode(true);
        }
      } else {
        slowFrameCount = Math.max(0, slowFrameCount - 1);
      }

      const reducedMotion = isEffectiveReducedMotionActive();
      const state = camStateRef.current;

      // Gentle cloud drift + Earth idle orbit in hero mode (only when user isn't pinning/exploring)
      if (!reducedMotion) {
        cloudMesh.rotation.y += dt * 0.011;
        starPoints.rotation.y += dt * 0.002;
        if (
          !dragging &&
          latestPropsRef.current.mode === 'hero' &&
          now - state.lastUserInteractionMs > 3000
        ) {
          state.targetYaw += dt * 0.085;
        }
      }

      // Apply inertia + smooth damping
      state.targetYaw += state.velYaw;
      state.targetPitch = Math.max(-1.515, Math.min(1.515, state.targetPitch + state.velPitch));
      state.velYaw *= 0.9;
      state.velPitch *= 0.9;

      const lerpFactor = reducedMotion ? 1 : Math.min(1, dt * 6);
      state.yaw += (state.targetYaw - state.yaw) * lerpFactor;
      state.pitch += (state.targetPitch - state.pitch) * lerpFactor;
      state.distance += (state.targetDistance - state.distance) * lerpFactor;

      camera.position.set(
        state.distance * Math.cos(state.pitch) * Math.sin(state.yaw),
        state.distance * Math.sin(state.pitch),
        state.distance * Math.cos(state.pitch) * Math.cos(state.yaw)
      );
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      // Update reticle coordinates periodically
      const camCoords = vector3ToLatLon(camera.position);
      setReticleCoords((prev) =>
        Math.abs(prev.lat - camCoords.lat) > 0.25 || Math.abs(prev.lon - camCoords.lon) > 0.25
          ? camCoords
          : prev
      );

      // Update accent tints from active experience
      const props = latestPropsRef.current;
      innerAtmosMat.uniforms.accentTint.value.set(props.accentColor);
      outerAtmosMat.uniforms.glowColor.value.set(
        props.mode === 'hero' ? '#52C7F5' : props.accentColor
      );
      ringMat.color.set(props.mode === 'hero' ? '#8BE9FD' : props.accentColor);
      ringGlowMat.color.set(props.mode === 'hero' ? '#52C7F5' : props.accentColor);
      pinMat.color.set(props.accentColor);
      rippleMat.color.set(props.accentColor);
      pMat.color.set(props.accentColor);

      // Update Satellite Markers
      const tSec = reducedMotion ? 0 : now * 0.001;
      for (const sat of satellites) {
        const angle = sat.phase + tSec * sat.speed;
        satVec.set(Math.cos(angle) * sat.radius, 0, Math.sin(angle) * sat.radius);
        satEuler.set(sat.rx, 0, sat.rz);
        satVec.applyEuler(satEuler);
        sat.grp.position.copy(satVec);
        sat.grp.lookAt(0, 0, 0);
      }

      // Audio-reactive Orbit Ring (AnalyserNode + subtle standby wave on hero)
      const arr = ringGeom.attributes.position.array as Float32Array;
      const glowArr = ringGlowGeom.attributes.position.array as Float32Array;
      if (props.isAudioPlaying && !reducedMotion) {
        sonificationEngine.getFrequencyData(freqData);
      }
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const binAmp = props.isAudioPlaying && !reducedMotion ? freqData[i % 48] / 255 : 0;
        const standbyWave =
          !reducedMotion && props.mode === 'hero'
            ? (0.04 + Math.max(0, Math.sin(a * 6 + tSec * 1.1)) * 0.05) *
              Math.abs(Math.sin(a * 19 - tSec * 2.4))
            : 0;
        const energy = binAmp > 0 ? binAmp * 0.24 : standbyWave;
        const yJitter =
          binAmp > 0
            ? (binAmp * 0.14 * Math.sin(a * 12 + tSec * 7))
            : (!reducedMotion && props.mode === 'hero' ? Math.sin(a * 24 + tSec * 2) * standbyWave * 1.4 : 0);
        const r = 1.38 + energy;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        arr[i * 3] = x;
        arr[i * 3 + 1] = yJitter;
        arr[i * 3 + 2] = z;

        const r2 = 1.39 + energy * 1.35;
        glowArr[i * 3] = Math.cos(a) * r2;
        glowArr[i * 3 + 1] = -yJitter * 0.85;
        glowArr[i * 3 + 2] = Math.sin(a) * r2;
      }
      ringGeom.attributes.position.needsUpdate = true;
      ringGlowGeom.attributes.position.needsUpdate = true;

      // Pin, Expanding Surface Ripple & Data-driven 3D layers
      const pinVec = latLonToVector3(props.lat, props.lon, 1.015);
      const showPin = props.mode !== 'hero' && (props.pinCardOpen || !props.isGlobalDataset);
      pinMesh.visible = showPin;
      pinMesh.position.copy(pinVec);

      const pinNormal = pinVec.clone().normalize();
      pinRippleMesh.visible = showPin;
      pinRippleMesh.position.copy(pinNormal.clone().multiplyScalar(1.012));
      pinRippleMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pinNormal);
      const ripplePhase = reducedMotion ? 0.35 : ((now * 0.0012) % 1);
      const rippleScale = 1 + ripplePhase * 1.9;
      pinRippleMesh.scale.set(rippleScale, rippleScale, 1);
      rippleMat.opacity = (1 - ripplePhase) * 0.72;

      // Project 3D Pin -> 2D Screen Card with Far-Side Fade & Reticle/Edge Collision Handling
      const wrapEl = pinCardWrapRef.current;
      const lineEl = leaderLineRef.current;
      const dotEl = leaderDotRef.current;
      const svgEl = leaderSvgRef.current;
      if (wrapEl && svgEl && lineEl && dotEl) {
        const w = renderer.domElement.clientWidth || container.clientWidth || 480;
        const h = renderer.domElement.clientHeight || container.clientHeight || 400;
        const proj = pinVec.clone().project(camera);
        const px = (proj.x * 0.5 + 0.5) * w;
        const py = (-proj.y * 0.5 + 0.5) * h;
        const facing = pinNormal.dot(camera.position.clone().normalize());
        const canShowFloating =
          props.mode !== 'hero' && props.pinCardOpen && proj.z < 1 && w >= 420 && facing > 0.04;
        const opacity = canShowFloating ? Math.max(0, Math.min(1, (facing - 0.04) / 0.2)) : 0;

        wrapEl.style.opacity = String(opacity);
        wrapEl.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none';
        svgEl.style.opacity = String(opacity);

        if (opacity > 0.01) {
          const cardW = wrapEl.offsetWidth || 248;
          const cardH = wrapEl.offsetHeight || 176;
          const margin = 10;
          const topPad = 48;
          const bottomPad = 112;

          const minX = margin;
          const maxX = Math.max(margin, w - cardW - margin);
          const minY = topPad;
          const maxY = Math.max(topPad, h - cardH - bottomPad);
          const clampRect = (rx: number, ry: number) => ({
            x: Math.max(minX, Math.min(maxX, rx)),
            y: Math.max(minY, Math.min(maxY, ry))
          });

          const overlapArea = (
            ax: number,
            ay: number,
            aw: number,
            ah: number,
            bx1: number,
            by1: number,
            bx2: number,
            by2: number
          ) => {
            const ox = Math.max(0, Math.min(ax + aw, bx2) - Math.max(ax, bx1));
            const oy = Math.max(0, Math.min(ay + ah, by2) - Math.max(ay, by1));
            return ox * oy;
          };

          // Protected zones: center reticle + pill, NASA PiP frame (top-right), pin marker itself
          const retLeft = w * 0.5 - 98;
          const retRight = w * 0.5 + 98;
          const retTop = h * 0.5 - 22;
          const retBottom = h * 0.5 + 54;
          const pipLeft = w - 134;
          const pipRight = w - 6;
          const pipTop = 48;
          const pipBottom = 140;

          const candidates = [
            clampRect(px + 34, py - cardH * 0.5),
            clampRect(px - cardW - 34, py - cardH * 0.5),
            clampRect(margin, topPad + 2),
            clampRect(margin, h - cardH - bottomPad),
            clampRect(w - cardW - margin, pipBottom + 6),
            clampRect(w - cardW - margin, h - cardH - bottomPad)
          ];

          let best = candidates[0];
          let bestScore = Infinity;
          for (const c of candidates) {
            const retOvl = overlapArea(c.x, c.y, cardW, cardH, retLeft, retTop, retRight, retBottom);
            const pinOvl = overlapArea(c.x, c.y, cardW, cardH, px - 22, py - 22, px + 22, py + 22);
            const pipOvl = overlapArea(c.x, c.y, cardW, cardH, pipLeft, pipTop, pipRight, pipBottom);
            const cxCenter = c.x + cardW * 0.5;
            const cyCenter = c.y + cardH * 0.5;
            const dist = Math.hypot(cxCenter - px, cyCenter - py);
            const score = retOvl * 12 + pinOvl * 10 + pipOvl * 8 + dist * 0.04;
            if (score < bestScore) {
              bestScore = score;
              best = c;
            }
          }

          const cx = best.x;
          const cy = best.y;
          wrapEl.style.transform = `translate3d(${Math.round(cx)}px, ${Math.round(cy)}px, 0)`;

          const anchorX =
            cx > px + 8 ? cx : cx + cardW < px - 8 ? cx + cardW : Math.max(cx + 16, Math.min(cx + cardW - 16, px));
          const anchorY =
            cy > py + 8 ? cy : cy + cardH < py - 8 ? cy + cardH : Math.max(cy + 16, Math.min(cy + cardH - 16, py));
          dotEl.setAttribute('cx', String(px));
          dotEl.setAttribute('cy', String(py));
          lineEl.setAttribute('x1', String(px));
          lineEl.setAttribute('y1', String(py));
          lineEl.setAttribute('x2', String(anchorX));
          lineEl.setAttribute('y2', String(anchorY));
        }
      }

      const normVal = Math.max(0, Math.min(1, props.normalizedValue));

      if (props.experienceId === 'temperature' && props.mode !== 'hero') {
        heatColumn.visible = true;
        dataParticles.visible = false;
        const anchor = props.isGlobalDataset ? latLonToVector3(0, 0, 1.0) : pinVec.clone().normalize();
        heatColumn.position.copy(anchor);
        heatColumn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), anchor);
        heatColumn.scale.set(1, 0.12 + normVal * 0.55, 1);
        heatMat.color.set(normVal < 0.3 ? '#52C7F5' : '#FFC66D');
      } else if (props.mode !== 'hero') {
        heatColumn.visible = false;
        dataParticles.visible = true;
        const center = pinVec.clone().normalize();
        const tangentA = new THREE.Vector3(-center.z, 0, center.x).normalize();
        const tangentB = new THREE.Vector3().crossVectors(center, tangentA).normalize();
        const pArr = pGeom.attributes.position.array as Float32Array;
        const activeCount = Math.max(12, Math.floor(pCount * (0.25 + normVal * 0.75)));

        for (let i = 0; i < pCount; i++) {
          if (i >= activeCount) {
            pArr[i * 3] = 999;
            pArr[i * 3 + 1] = 999;
            pArr[i * 3 + 2] = 999;
            continue;
          }
          const seed = pSeeds[i];
          const t = reducedMotion ? seed : (seed + now * 0.00035 * (0.5 + normVal)) % 1;
          const angle = seed * Math.PI * 2 + (props.experienceId === 'atmosphere' ? t * 4 : 0);
          const spread = 0.22;
          const radialOffset =
            props.experienceId === 'ocean'
              ? 1.02 + (1 - t) * 0.35
              : 1.06 + Math.sin(t * Math.PI) * 0.12;
          const pos = center
            .clone()
            .multiplyScalar(radialOffset)
            .addScaledVector(tangentA, Math.cos(angle) * spread)
            .addScaledVector(tangentB, Math.sin(angle) * spread);
          pArr[i * 3] = pos.x;
          pArr[i * 3 + 1] = pos.y;
          pArr[i * 3 + 2] = pos.z;
        }
        pGeom.attributes.position.needsUpdate = true;
      } else {
        heatColumn.visible = false;
        dataParticles.visible = false;
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      for (const g of disposableGeometries) g.dispose();
      for (const m of disposableMaterials) m.dispose();
      for (const t of disposableTextures) t.dispose();
      renderer.dispose();
    };
  }, [use2DMapFallback, webglFailed, lowQualityMode, mode, interactEnabled, adjustZoom, onPracticeAction, onSelectLocation, setLowQualityMode, accentColor, setPinCardOpen]);

  // Keyboard navigation on role="application" container
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const yawStep = e.shiftKey ? 0.45 : 0.2;
    const pitchStep = e.shiftKey ? 0.32 : 0.15;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      camStateRef.current.targetYaw -= yawStep;
      onPracticeAction?.('rotate');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      camStateRef.current.targetYaw += yawStep;
      onPracticeAction?.('rotate');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      camStateRef.current.targetPitch = Math.min(1.515, camStateRef.current.targetPitch + pitchStep);
      onPracticeAction?.('rotate');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      camStateRef.current.targetPitch = Math.max(-1.515, camStateRef.current.targetPitch - pitchStep);
      onPracticeAction?.('rotate');
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      adjustZoom(-0.3);
    } else if (e.key === '-') {
      e.preventDefault();
      adjustZoom(0.3);
    } else if (e.key === 'Home') {
      e.preventDefault();
      resetCamera();
    } else if (e.key === 'Escape') {
      setPinCardOpen(false);
      setShowLegend(false);
    } else if ((e.key === 'Enter' || e.key === ' ') && onSelectLocation) {
      e.preventDefault();
      if (e.key === ' ' && pinCardOpen) {
        setPinCardOpen(false);
        return;
      }
      setPinCardOpen(true);
      void lookupPlace(reticleCoords.lat, reticleCoords.lon).then((place) => {
        setPinnedPlace(place);
        onSelectLocation(reticleCoords.lat, reticleCoords.lon, place.placeName, place);
        setStatusAnnouncement(`Selected ${place.placeName}, ${place.formattedCoords}.`);
      });
      onPracticeAction?.('pin');
    }
  };

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GLOBE_PRESET_LOCATIONS.slice(0, 8);
    return GLOBE_PRESET_LOCATIONS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const applyManualLatLon = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLon = parseFloat(lonInput);
    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setStatusAnnouncement('Latitude must be between -90 and 90.');
      return;
    }
    if (!Number.isFinite(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      setStatusAnnouncement('Longitude must be between -180 and 180.');
      return;
    }
    const clamped = clampLatLon(parsedLat, parsedLon);
    setPinCardOpen(true);
    void lookupPlace(clamped.lat, clamped.lon).then((place) => {
      setPinnedPlace(place);
      onSelectLocation?.(clamped.lat, clamped.lon, place.placeName, place);
      setStatusAnnouncement(`Flew to ${place.placeName}, ${place.formattedCoords}.`);
    });
    onPracticeAction?.('pin');
  };

  const resolvedHeight =
    heightClass ||
    (mode === 'hero'
      ? 'h-[340px] sm:h-[440px]'
      : mode === 'compact'
      ? 'h-[280px]'
      : mode === 'practice'
      ? 'h-[320px]'
      : 'h-[55vh] min-h-[360px] max-h-[540px]');

  if (use2DMapFallback || webglFailed) {
    return (
      <div className="flex flex-col gap-3">
        <SvgOrthographicFallback
          experienceId={experienceId}
          accentColor={accentColor}
          lat={lat}
          lon={lon}
          isGlobalDataset={isGlobalDataset}
          onSelectLocation={onSelectLocation}
          onPracticeAction={onPracticeAction}
          heightClass={resolvedHeight}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <div
        role="region"
        aria-label="Interactive 3D Earth Globe"
        className={`relative w-full ${resolvedHeight} overflow-hidden ${
          mode === 'hero'
            ? 'rounded-2xl sm:rounded-3xl bg-transparent'
            : 'rounded-2xl sm:rounded-3xl bg-[#050914] border border-[#1E2E48]'
        }`}
      >
        <button
          type="button"
          onKeyDown={handleKeyDown}
          aria-label="Interactive 3D Earth Globe keyboard controller. Use arrow keys to rotate, plus and minus to zoom, Enter to select center location, Home to reset view."
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-40 px-3 py-1.5 rounded-xl bg-[#050914] border-2 border-[#52C7F5] text-xs font-mono-tabular text-[#F5F8FF] shadow-xl cursor-pointer"
        >
          Globe Keys: Arrows Rotate · +/- Zoom · Enter Select · Home Reset
        </button>
        {/* Screen-reader polite announcement */}
        <div className="sr-only" role="status" aria-live="polite">
          {statusAnnouncement}
        </div>

        {/* WebGL Canvas Mount */}
        <div
          ref={mountRef}
          className={`w-full h-full ${interactEnabled ? 'touch-none cursor-grab active:cursor-grabbing' : 'touch-pan-y'}`}
        />

        {/* Subtle Starfield Shimmer While Earth Textures Decode */}
        {!texturesReady && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-radial from-[#102646]/25 via-transparent to-transparent animate-pulse"
          >
            <span className="px-3 py-1 rounded-full bg-[#0A1220]/80 border border-[#52C7F5]/30 text-[11px] font-mono-tabular text-[#9AA9BD]">
              Loading NASA Blue Marble textures...
            </span>
          </div>
        )}

        {/* Required NASA Visible Earth Imagery Credit */}
        <div
          className={`pointer-events-none absolute z-10 text-[10px] font-mono-tabular text-[#9AA9BD]/85 px-2 py-0.5 rounded bg-[#050914]/65 backdrop-blur-sm ${
            mode === 'hero' ? 'bottom-2 right-3 sm:right-6' : 'top-3 right-3 sm:top-auto sm:bottom-[112px] sm:right-3'
          }`}
        >
          Earth imagery: NASA Visible Earth / Blue Marble
        </div>

        {/* Center Reticle + Live Reticle Name Chip (non-hero modes) */}
        {mode !== 'hero' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10"
          >
            <div className="w-7 h-7 rounded-full border border-dashed border-[#F5F8FF]/65 flex items-center justify-center shadow-[0_0_12px_rgba(82,199,245,0.45)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#52C7F5]" />
            </div>
            <div className="mt-2 px-2 py-1 rounded-full bg-[#050914]/82 backdrop-blur-md border border-white/15 shadow-lg flex items-center gap-1.5 max-w-[184px] transition-opacity duration-150 motion-reduce:transition-none">
              <span className="text-[#52C7F5] shrink-0">
                {getPlaceTypeIcon(reticlePlace?.type || 'unknown', 'w-3 h-3')}
              </span>
              <span className="text-[11px] font-display font-semibold text-[#F5F8FF] truncate">
                {reticlePlace?.placeName || 'Scanning Earth...'}
              </span>
              <span className="text-[10px] font-mono-tabular text-[#9AA9BD] shrink-0">
                {formatCoords(reticleCoords.lat, reticleCoords.lon)}
              </span>
            </div>
          </div>
        )}

        {/* Desktop Hover / Touch Long-Press Temporary Preview (without dropping pin) */}
        {mode !== 'hero' && hoverPreview && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 px-2.5 py-1 rounded-xl bg-[#071124]/92 backdrop-blur-md border border-[#52C7F5]/45 shadow-lg text-[11px] text-[#F5F8FF] flex items-center gap-1.5"
            style={{
              left: `${Math.max(10, hoverPreview.x + 14)}px`,
              top: `${Math.max(42, hoverPreview.y - 26)}px`
            }}
          >
            <span className="text-[#52C7F5]">{getPlaceTypeIcon(hoverPreview.place.type, 'w-3 h-3')}</span>
            <span className="font-display font-medium">{hoverPreview.place.placeName}</span>
            <span className="font-mono-tabular text-[10px] text-[#9AA9BD]">
              {hoverPreview.place.formattedCoords}
            </span>
          </div>
        )}

        {/* Thin 3D-Projected Leader Line SVG + Pin Label Card (desktop/tablet floating with far-side fade) */}
        {mode !== 'hero' && (
          <>
            <svg
              ref={leaderSvgRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full z-20 transition-opacity duration-150 motion-reduce:transition-none"
              style={{ opacity: 0 }}
            >
              <circle
                ref={leaderDotRef}
                r="4"
                fill={accentColor}
                stroke="#F5F8FF"
                strokeWidth="1.5"
              />
              <line
                ref={leaderLineRef}
                stroke={accentColor}
                strokeWidth="1.5"
                strokeOpacity="0.85"
                strokeDasharray="3 2"
              />
            </svg>

            <div
              ref={pinCardWrapRef}
              className="hidden sm:block absolute top-0 left-0 z-30 transition-opacity duration-150 motion-reduce:transition-none"
              style={{ opacity: 0, pointerEvents: 'none' }}
            >
              {pinnedPlace && pinCardOpen && (
                <LocationPinCard
                  place={pinnedPlace}
                  experienceId={experienceId}
                  accentColor={accentColor}
                  isGlobalDataset={Boolean(isGlobalDataset)}
                  isFavorite={favoritePlaces.some(
                    (f) =>
                      Math.abs(f.lat - pinnedPlace.lat) <= 0.05 &&
                      Math.abs(f.lon - pinnedPlace.lon) <= 0.05
                  )}
                  onToggleFavorite={() =>
                    toggleFavoritePlace({
                      lat: pinnedPlace.lat,
                      lon: pinnedPlace.lon,
                      name: pinnedPlace.placeName,
                      subtitle: [pinnedPlace.adminRegion, pinnedPlace.country]
                        .filter(Boolean)
                        .join(', '),
                      type: pinnedPlace.type
                    })
                  }
                  onClose={() => setPinCardOpen(false)}
                />
              )}
            </div>
          </>
        )}

        {/* Top-Left Globe Label & Data Layer Readout */}
        {mode !== 'hero' && (
          <div className={`absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none ${topLeftOffsetClass}`}>
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#0A1220]/90 border border-[#1E2E48] text-[11px] font-mono-tabular text-[#9AA9BD]">
                Navigation Globe · NASA Blue Marble
              </span>
              {isGlobalDataset && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-[11px] font-mono-tabular text-amber-200">
                  Global dataset: location doesn’t apply
                </span>
              )}
              {mode === 'practice' && (
                <span className="px-2.5 py-1 rounded-full bg-[#52C7F5]/20 border border-[#52C7F5]/50 text-[11px] font-mono-tabular text-[#52C7F5]">
                  Practice Sandbox (No audio / No API)
                </span>
              )}
            </div>

            {mode === 'explorer' && (
              <div className="pointer-events-auto relative">
                <button
                  type="button"
                  onClick={() => setShowLegend((s) => !s)}
                  className="min-h-[36px] px-2.5 py-1 rounded-full bg-[#0A1220]/90 border border-[#1E2E48] hover:border-[#52C7F5]/60 text-[11px] font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-[#52C7F5]" />
                  <span>What drives this animation?</span>
                </button>
                {showLegend && (
                  <div
                    role="dialog"
                    aria-label="3D animation legend"
                    className="absolute right-0 top-full mt-2 z-30 w-72 rounded-2xl bg-[#0A1220] border border-[#52C7F5]/50 p-3 text-xs text-[#F5F8FF] shadow-2xl space-y-1.5"
                  >
                    <div className="font-mono-tabular font-bold text-[#52C7F5] uppercase text-[11px]">
                      Data-Driven vs. Decorative
                    </div>
                    <p className="text-[#9AA9BD] leading-relaxed">
                      <strong className="text-[#F5F8FF]">Data-driven:</strong>{' '}
                      {experienceId === 'temperature'
                        ? `Thermal column height & hue respond to ${rawValueLabel || 'temperature anomaly'}.`
                        : experienceId === 'ocean'
                        ? `Ocean particle flux responds to ${rawValueLabel || 'sea level & SST observations'}.`
                        : `Atmospheric streamlines respond to ${rawValueLabel || 'CO2, wind & aerosols'}.`}
                    </p>
                    <p className="text-[#9AA9BD] leading-relaxed">
                      <strong className="text-[#F5F8FF]">Audio-reactive:</strong> Orbit ring pulses with the live Web Audio AnalyserNode. Starfield is decorative.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Controls Bar */}
        {mode !== 'hero' && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Mobile scroll guard Interact toggle */}
              <button
                type="button"
                aria-pressed={interactEnabled}
                onClick={() => setInteractEnabled((v) => !v)}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer ${
                  interactEnabled
                    ? 'bg-[#52C7F5] text-[#050914] border-[#52C7F5] font-bold'
                    : 'bg-[#0A1220]/90 text-[#F5F8FF] border-[#1E2E48]'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>{interactEnabled ? 'Interact: ON' : 'Interact: OFF'}</span>
              </button>

              <div className="px-2.5 py-2 rounded-xl bg-[#0A1220]/90 border border-[#1E2E48] text-[11px] font-mono-tabular text-[#F5F8FF] max-w-[230px] truncate">
                {reticlePlace?.placeName ? `${reticlePlace.placeName} · ` : ''}
                {formatCoords(reticleCoords.lat, reticleCoords.lon)}
              </div>

              {onSelectLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setPinCardOpen(true);
                    void lookupPlace(reticleCoords.lat, reticleCoords.lon).then((place) => {
                      setPinnedPlace(place);
                      onSelectLocation(reticleCoords.lat, reticleCoords.lon, place.placeName, place);
                      setStatusAnnouncement(`Selected ${place.placeName}, ${place.formattedCoords}.`);
                    });
                    onPracticeAction?.('pin');
                  }}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#101C2D]/95 hover:bg-[#1E2E48] border border-[#52C7F5]/60 text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#52C7F5]" />
                  <span>Select this location</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onSelectLocation && (
                <button
                  type="button"
                  onClick={() => setShowLocationTools((s) => !s)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#0A1220]/90 hover:bg-[#101C2D] border border-[#1E2E48] text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#52C7F5]" />
                  <span>Locations</span>
                </button>
              )}
              <button
                type="button"
                aria-expanded={showViewDescription}
                onClick={() => {
                  const next = !showViewDescription;
                  setShowViewDescription(next);
                  setStatusAnnouncement(viewDescriptionText);
                  liveAnnouncer.announcePolite(viewDescriptionText);
                  if (next && speechEnabled) {
                    speechService.speak(viewDescriptionText);
                  }
                }}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer ${
                  showViewDescription
                    ? 'bg-[#52C7F5] text-[#050914] border-[#52C7F5] font-bold'
                    : 'bg-[#0A1220]/90 hover:bg-[#101C2D] border-[#1E2E48] text-[#F5F8FF]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Describe view</span>
              </button>
              <button
                type="button"
                aria-label="Zoom in globe"
                onClick={() => adjustZoom(-0.35)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0A1220]/90 hover:bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Zoom out globe"
                onClick={() => adjustZoom(0.35)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0A1220]/90 hover:bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Reset globe view"
                onClick={resetCamera}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0A1220]/90 hover:bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Textual View Description Card (accessible globe summary for non-visual/low-vision users) */}
      {mode !== 'hero' && showViewDescription && (
        <section
          aria-label="Globe text description"
          data-testid="globe-view-description"
          className="rounded-xl bg-[#0A1220] border border-[#52C7F5]/60 p-3 text-xs text-[#E2ECFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <p className="leading-relaxed">{viewDescriptionText}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => speechService.speak(viewDescriptionText)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#101C2D] hover:bg-[#1E2E48] border border-[#52C7F5]/50 text-[#52C7F5] font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Speak</span>
            </button>
            <button
              type="button"
              aria-label="Close globe text description"
              onClick={() => setShowViewDescription(false)}
              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#050914] hover:bg-[#101C2D] border border-[#1E2E48] text-[#A9BAD0] hover:text-white inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Compact/Mobile Docked Pin Label Card (avoids cramping small screens) */}
      {mode !== 'hero' && pinnedPlace && pinCardOpen && (
        <div className="sm:hidden">
          <LocationPinCard
            place={pinnedPlace}
            experienceId={experienceId}
            accentColor={accentColor}
            isGlobalDataset={Boolean(isGlobalDataset)}
            isFavorite={favoritePlaces.some(
              (f) =>
                Math.abs(f.lat - pinnedPlace.lat) <= 0.05 &&
                Math.abs(f.lon - pinnedPlace.lon) <= 0.05
            )}
            onToggleFavorite={() =>
              toggleFavoritePlace({
                lat: pinnedPlace.lat,
                lon: pinnedPlace.lon,
                name: pinnedPlace.placeName,
                subtitle: [pinnedPlace.adminRegion, pinnedPlace.country].filter(Boolean).join(', '),
                type: pinnedPlace.type
              })
            }
            onClose={() => setPinCardOpen(false)}
          />
        </div>
      )}

      {/* Location Search, Offline Gazetteer Results, Presets & Keyboard Lat/Lon Alternative */}
      {showLocationTools && onSelectLocation && (
        <div className="rounded-2xl bg-[#0A1220]/95 border border-[#1E2E48] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#9AA9BD] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cities, oceans, regions, North Pole..."
                aria-label="Search world places or Earth observatory presets"
                className="w-full min-h-[44px] pl-9 pr-3 py-1.5 rounded-xl bg-[#050914] border border-[#1E2E48] text-xs text-[#F5F8FF]"
              />
            </div>

            <form onSubmit={applyManualLatLon} className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-mono-tabular text-[#9AA9BD]">
                Lat:
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="ml-1 w-20 min-h-[44px] px-2 rounded-lg bg-[#050914] border border-[#1E2E48] text-xs text-[#F5F8FF]"
                />
              </label>
              <label className="text-xs font-mono-tabular text-[#9AA9BD]">
                Lon:
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="ml-1 w-20 min-h-[44px] px-2 rounded-lg bg-[#050914] border border-[#1E2E48] text-xs text-[#F5F8FF]"
                />
              </label>
              <button
                type="submit"
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#52C7F5] text-[#050914] font-mono-tabular font-bold text-xs cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>

          {searchQuery.trim().length > 0 && offlineSearchResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#9AA9BD]">
                Offline Gazetteer Matches
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {offlineSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPinCardOpen(true);
                      onSelectLocation(item.lat, item.lon, item.placeName);
                      onPracticeAction?.('pin');
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#050914] hover:bg-[#101C2D] border border-[#1E2E48] hover:border-[#52C7F5]/60 text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="text-[#52C7F5] shrink-0">
                        {getPlaceTypeIcon(item.type, 'w-3.5 h-3.5')}
                      </span>
                      <span className="text-xs font-display font-semibold text-[#F5F8FF] truncate">
                        {item.placeName}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#9AA9BD] truncate shrink-0">
                      {item.subtitle}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPinCardOpen(true);
                  onSelectLocation(preset.lat, preset.lon, preset.name);
                  onPracticeAction?.('pin');
                }}
                className="min-h-[36px] px-2.5 py-1 rounded-full bg-[#050914] hover:bg-[#101C2D] border border-[#1E2E48] hover:border-[#52C7F5]/60 text-xs font-mono-tabular text-[#F5F8FF] cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
