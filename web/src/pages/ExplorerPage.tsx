import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type {
  DataPoint,
  EarthExperience,
  ExperienceId,
  SonificationTelemetry
} from '../types/earthsonic';
import type { ApiFailureReason, ClientProvenance } from '../types/dataStatus';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import {
  clampLatLon,
  parseExperienceParam,
  toExperienceQuerySlug,
  useEarthSonicStore
} from '../store/useEarthSonicStore';
import {
  isValidCoordinate,
  lookupPlace,
  type PlaceLookupResult
} from '../services/placeLookup';
import { normalizeValue, sonificationEngine } from '../audio/sonificationEngine';
import { LiveSoundCaptionsBar } from '../components/a11y/LiveSoundCaptionsBar';
import {
  getExperienceAccentColor,
  useExperienceAccentColor
} from '../hooks/useAccessibilityRuntime';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { speechService } from '../services/speechService';
import { buildSoundDescription } from '../services/soundDescriptionBuilder';
import { useAccessibilityStore } from '../store/useAccessibilityStore';
import { DataStatusBadge } from '../components/data/DataStatusBadge';
import { JukeboxTransportDeck } from '../components/JukeboxTransportDeck';
import {
  ExperienceSignatureBanner,
  SymmetricalAnalyserCanvas
} from '../components/explorer/ExperienceSignatureCanvas';
import {
  Accordion,
  GlassPanel,
  NumberedCallout,
  StatTile,
  StepCarousel,
  Tabs
} from '../components/ui/Primitives';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Database,
  Droplets,
  ExternalLink,
  Flame,
  Globe,
  Headphones,
  Image as ImageIcon,
  Layers,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Subtitles,
  Table,
  Volume2,
  Wind,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

const InteractiveGlobe = lazy(() =>
  import('../components/earth/InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe }))
);

interface ExplorerPageProps {
  experience: EarthExperience;
  series: DataPoint[];
  provenance: ClientProvenance;
  isLoading: boolean;
  failureReason: ApiFailureReason | null;
  degradedMessage: string | null;
  telemetry: SonificationTelemetry;
  currentPoint: DataPoint;
  announcedStepIndex?: number;
  onRetry: () => Promise<void>;
  onSwitchToDemo: () => void;
  onStepChange: (idx: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onDescribeSound?: () => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  experience,
  series,
  provenance,
  isLoading,
  failureReason,
  degradedMessage,
  telemetry,
  currentPoint,
  announcedStepIndex,
  onRetry,
  onSwitchToDemo,
  onStepChange,
  onTogglePlay,
  onReset,
  onToggleMute,
  onVolumeChange,
  onDescribeSound
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeExperienceId = useEarthSonicStore((s) => s.activeExperienceId);
  const setExperienceId = useEarthSonicStore((s) => s.setExperienceId);
  const selectedLat = useEarthSonicStore((s) => s.selectedLat);
  const selectedLon = useEarthSonicStore((s) => s.selectedLon);
  const selectedLocationName = useEarthSonicStore((s) => s.selectedLocationName);
  const setLocation = useEarthSonicStore((s) => s.setLocation);
  const accessibilityMode = useEarthSonicStore((s) => s.accessibilityMode);
  const tourCompleted = useEarthSonicStore((s) => s.tourCompleted);
  const tourOpen = useEarthSonicStore((s) => s.tourOpen);
  const completeTour = useEarthSonicStore((s) => s.completeTour);
  const closeTour = useEarthSonicStore((s) => s.closeTour);

  const isPlaying = useEarthSonicStore((s) => s.isPlaying);
  const isMuted = useEarthSonicStore((s) => s.isMuted);
  const volume = useEarthSonicStore((s) => s.volume);
  const playbackSpeed = useEarthSonicStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useEarthSonicStore((s) => s.setPlaybackSpeed);
  const loopEnabled = useEarthSonicStore((s) => s.loopEnabled);
  const setLoopEnabled = useEarthSonicStore((s) => s.setLoopEnabled);
  const stepIndex = useEarthSonicStore((s) => s.stepIndex);
  const soundSettings = useEarthSonicStore((s) => s.soundSettings);
  const announcementVerbosity = useAccessibilityStore((s) => s.prefs.announcementVerbosity);

  const effectiveAnnouncedIdx =
    announcedStepIndex !== undefined
      ? Math.max(0, Math.min(series.length - 1, announcedStepIndex))
      : stepIndex;
  const announcedPoint = series[effectiveAnnouncedIdx] || currentPoint;

  const timelineValueText = useMemo(
    () =>
      buildSoundDescription({
        experience,
        point: announcedPoint,
        prevPoint: effectiveAnnouncedIdx > 0 ? series[effectiveAnnouncedIdx - 1] : undefined,
        stepIndex: effectiveAnnouncedIdx,
        totalSteps: series.length,
        soundSettings
      }).forLevel(announcementVerbosity),
    [experience, announcedPoint, effectiveAnnouncedIdx, series, soundSettings, announcementVerbosity]
  );

  const [stageView, setStageView] = useState<'globe' | 'nasa'>('globe');
  const [rightTab, setRightTab] = useState<'info' | 'source' | 'mapping'>('info');
  const [showTextTable, setShowTextTable] = useState(false);
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, Math.max(1, series.length - 1)]);
  const [tourStep, setTourStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSweepingChart, setIsSweepingChart] = useState(false);
  const sweepTimersRef = useRef<number[]>([]);

  const accentColor = useExperienceAccentColor(experience.id);
  const soundCaptions = useAccessibilityStore((s) => s.prefs.soundCaptions);
  const speechEnabled = useAccessibilityStore((s) => s.prefs.speechEnabled);
  const palette = useAccessibilityStore((s) => s.prefs.palette);
  const updateA11yPref = useAccessibilityStore((s) => s.updatePref);
  const setA11yCenterOpen = useAccessibilityStore((s) => s.setCenterOpen);

  useEffect(() => {
    return () => {
      sweepTimersRef.current.forEach((id) => window.clearTimeout(id));
      sweepTimersRef.current = [];
    };
  }, [experience.id]);
  const [frameIdx, setFrameIdx] = useState(0);

  const scrubbingRef = useRef(false);

  // Show green numbered callouts 1-4 in Tour or Accessibility mode
  const showCallouts = !tourCompleted || tourOpen || accessibilityMode;
  const showTourDismiss = !tourCompleted || tourOpen;

  // Hydrate /explorer?exp=&lat=&lon= query params and always recompute authoritative offline place name
  const queryString = searchParams.toString();
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(queryString);
    const expParam = parseExperienceParam(params.get('exp'));
    if (expParam && expParam !== useEarthSonicStore.getState().activeExperienceId) {
      sonificationEngine.stopAllNodes();
      setExperienceId(expParam);
    }

    const rawLat = params.get('lat');
    const rawLon = params.get('lon');
    const hasCoords = rawLat !== null && rawLat.trim() !== '' && rawLon !== null && rawLon.trim() !== '';
    const parsedLat = hasCoords ? Number(rawLat) : NaN;
    const parsedLon = hasCoords ? Number(rawLon) : NaN;

    if (hasCoords && isValidCoordinate(parsedLat, parsedLon)) {
      const { lat, lon } = clampLatLon(parsedLat, parsedLon);
      const rawHint = params.get('name')?.trim();
      const safeHint = rawHint && rawHint.length <= 80 ? rawHint : undefined;
      if (safeHint) {
        setLocation(lat, lon, safeHint, undefined, undefined, true);
      }
      void lookupPlace(lat, lon).then((res) => {
        if (!cancelled) {
          const subtitle = [res.adminRegion, res.country].filter(Boolean).join(', ');
          setLocation(lat, lon, res.placeName, subtitle, res.type, true);
        }
      });
    } else {
      const { selectedLat: sLat, selectedLon: sLon } = useEarthSonicStore.getState();
      void lookupPlace(sLat, sLon).then((res) => {
        if (!cancelled) {
          const subtitle = [res.adminRegion, res.country].filter(Boolean).join(', ');
          setLocation(sLat, sLon, res.placeName, subtitle, res.type);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [queryString, setExperienceId, setLocation]);

  useEffect(() => {
    setZoomRange([0, Math.max(1, series.length - 1)]);
  }, [series.length, experience.id]);

  // Keep NASA frame synced with stepIndex
  useEffect(() => {
    const count = experience.visualFrames.length;
    const nextIdx = Math.min(count - 1, Math.floor((stepIndex / Math.max(1, series.length)) * count));
    setFrameIdx(nextIdx);
  }, [stepIndex, series.length, experience.visualFrames.length]);

  const handleSelectExp = (id: ExperienceId) => {
    sonificationEngine.stopAllNodes();
    setExperienceId(id);
    setSearchParams(
      {
        exp: toExperienceQuerySlug(id),
        lat: selectedLat.toFixed(2),
        lon: selectedLon.toFixed(2),
        ...(selectedLocationName ? { name: selectedLocationName } : {})
      },
      { replace: true }
    );
  };

  const handleSelectLoc = (
    lat: number,
    lon: number,
    name?: string,
    meta?: PlaceLookupResult
  ) => {
    const subtitle = meta ? [meta.adminRegion, meta.country].filter(Boolean).join(', ') : undefined;
    setLocation(lat, lon, meta?.placeName || name, subtitle, meta?.type, true);
    const resolvedName = meta?.placeName || name;
    setSearchParams(
      {
        exp: toExperienceQuerySlug(activeExperienceId),
        lat: lat.toFixed(2),
        lon: lon.toFixed(2),
        ...(resolvedName ? { name: resolvedName } : {})
      },
      { replace: true }
    );
  };

  const pSpec = experience.mappings.pitch;
  const normalizedCurrent = normalizeValue(currentPoint.primaryValue, pSpec.minData, pSpec.maxData);
  const currentFrame = experience.visualFrames[frameIdx] || experience.visualFrames[0];
  const isGlobalDataset = experience.id === 'temperature';
  const obsPeriodLabel =
    series.length > 1
      ? `${series[0].dateLabel} – ${series[series.length - 1].dateLabel}`
      : currentPoint.dateLabel;

  const visibleSeries = useMemo(() => {
    const start = Math.max(0, zoomRange[0]);
    const end = Math.min(series.length - 1, zoomRange[1]);
    return series.slice(start, end + 1);
  }, [series, zoomRange]);

  // Timeline tick dates derived strictly from loaded series
  const timelineTicks = useMemo(() => {
    if (series.length <= 1) return [currentPoint.dateLabel];
    const indices = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * (series.length - 1)));
    return Array.from(new Set(indices)).map((idx) => series[idx].dateLabel);
  }, [series, currentPoint.dateLabel]);

  // SVG Chart geometry & tap/drag scrubbing
  const chartW = 720;
  const chartH = 175;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const getChartX = (localIdx: number) =>
    padL + (localIdx / Math.max(1, visibleSeries.length - 1)) * plotW;
  const getChartY = (val: number) =>
    padT + (1 - normalizeValue(val, pSpec.minData, pSpec.maxData)) * plotH;

  const chartPath = visibleSeries
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(i).toFixed(1)} ${getChartY(pt.primaryValue).toFixed(1)}`)
    .join(' ');

  const scrubFromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left - (padL / chartW) * rect.width) / ((plotW / chartW) * rect.width))
    );
    const localIdx = Math.round(relX * Math.max(0, visibleSeries.length - 1));
    const targetPt = visibleSeries[localIdx];
    if (targetPt) {
      const globalIdx = series.findIndex((s) => s.index === targetPt.index);
      if (globalIdx >= 0) onStepChange(globalIdx);
    }
  };

  const handleZoomChart = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'reset') {
      setZoomRange([0, Math.max(1, series.length - 1)]);
      return;
    }
    const [s, e] = zoomRange;
    const span = e - s;
    if (direction === 'in' && span > 6) {
      const trim = Math.max(1, Math.floor(span * 0.2));
      setZoomRange([s + trim, e - trim]);
    } else if (direction === 'out') {
      const expand = Math.max(2, Math.floor(span * 0.25));
      setZoomRange([Math.max(0, s - expand), Math.min(series.length - 1, e + expand)]);
    }
  };

  const chartSummaryText = useMemo(() => {
    if (visibleSeries.length === 0) return 'No observations currently loaded in chart window.';
    const first = visibleSeries[0];
    const last = visibleSeries[visibleSeries.length - 1];
    let minPt = visibleSeries[0];
    let maxPt = visibleSeries[0];
    for (const pt of visibleSeries) {
      if (pt.primaryValue < minPt.primaryValue) minPt = pt;
      if (pt.primaryValue > maxPt.primaryValue) maxPt = pt;
    }
    const delta = Number((last.primaryValue - first.primaryValue).toFixed(2));
    const trend = delta > 0 ? 'overall upward trend' : delta < 0 ? 'overall downward trend' : 'steady overall trend';
    return `${pSpec.variableName} across ${first.dateLabel} to ${last.dateLabel}: starts at ${first.primaryValue} ${pSpec.unit}, peaks at ${maxPt.primaryValue} ${pSpec.unit} (${maxPt.dateLabel}), dips to ${minPt.primaryValue} ${pSpec.unit} (${minPt.dateLabel}), ends at ${last.primaryValue} ${pSpec.unit} (${trend}, net ${delta >= 0 ? '+' : ''}${delta} ${pSpec.unit}). Current point: ${currentPoint.dateLabel} at ${currentPoint.primaryValue} ${pSpec.unit}.`;
  }, [visibleSeries, pSpec.variableName, pSpec.unit, currentPoint.dateLabel, currentPoint.primaryValue]);

  const stopChartSweep = () => {
    sweepTimersRef.current.forEach((id) => window.clearTimeout(id));
    sweepTimersRef.current = [];
    setIsSweepingChart(false);
  };

  const handleSweepChart = () => {
    if (isSweepingChart) {
      stopChartSweep();
      sonificationEngine.stopAllNodes();
      liveAnnouncer.announcePolite('Stopped chart audio preview.');
      return;
    }
    if (visibleSeries.length === 0) return;

    const sampleCount = Math.min(6, visibleSeries.length);
    const sampled = Array.from({ length: sampleCount }, (_, k) => {
      const idx = Math.round((k / Math.max(1, sampleCount - 1)) * (visibleSeries.length - 1));
      return visibleSeries[idx];
    });

    setIsSweepingChart(true);
    liveAnnouncer.announcePolite(
      `Playing quick ${sampleCount}-step audio sweep for ${experience.shortTitle}: ${chartSummaryText}`
    );

    sampled.forEach((pt, idx) => {
      const timerId = window.setTimeout(() => {
        sonificationEngine.playDataStep({
          point: pt,
          experienceId: experience.id,
          mappings: experience.mappings,
          durationSec: 0.2,
          gainTrim: 0.72
        });
        if (idx === sampled.length - 1) {
          setIsSweepingChart(false);
        }
      }, idx * 230);
      sweepTimersRef.current.push(timerId);
    });
  };

  const handleChartStepKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (series.length === 0) return;
    const minIdx = visibleSeries[0]?.index ?? 0;
    const maxIdx = visibleSeries[visibleSeries.length - 1]?.index ?? series.length - 1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(maxIdx, stepIndex + 1);
      onStepChange(next);
      const pt = series[next];
      if (pt) {
        liveAnnouncer.announcePolite(`${pt.dateLabel}: ${pt.primaryValue} ${pSpec.unit}.`);
        if (speechEnabled) speechService.speak(`${pt.dateLabel}, ${pt.primaryValue} ${pSpec.unit}`);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(minIdx, stepIndex - 1);
      onStepChange(prev);
      const pt = series[prev];
      if (pt) {
        liveAnnouncer.announcePolite(`${pt.dateLabel}: ${pt.primaryValue} ${pSpec.unit}.`);
        if (speechEnabled) speechService.speak(`${pt.dateLabel}, ${pt.primaryValue} ${pSpec.unit}`);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      onStepChange(minIdx);
    } else if (e.key === 'End') {
      e.preventDefault();
      onStepChange(maxIdx);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sonificationEngine.playDataStep({
        point: currentPoint,
        experienceId: experience.id,
        mappings: experience.mappings,
        durationSec: 0.28,
        gainTrim: 0.8
      });
    }
  };

  const selectorItems: {
    id: ExperienceId;
    title: string;
    sub: string;
    color: string;
    Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    {
      id: 'temperature',
      title: `1. ${EARTH_EXPERIENCES.temperature.shortTitle}`,
      sub: `${EARTH_EXPERIENCES.temperature.mappings.pitch.variableName} → Pitch`,
      color: getExperienceAccentColor('temperature', palette),
      Icon: Flame
    },
    {
      id: 'ocean',
      title: `2. ${EARTH_EXPERIENCES.ocean.shortTitle}`,
      sub: `${EARTH_EXPERIENCES.ocean.mappings.rhythm.variableName} → Rhythm & SST`,
      color: getExperienceAccentColor('ocean', palette),
      Icon: Droplets
    },
    {
      id: 'atmosphere',
      title: `3. ${EARTH_EXPERIENCES.atmosphere.shortTitle}`,
      sub: `${EARTH_EXPERIENCES.atmosphere.mappings.pitch.variableName} → Filter`,
      color: getExperienceAccentColor('atmosphere', palette),
      Icon: Wind
    }
  ];

  const progressPct = Math.round((stepIndex / Math.max(1, series.length - 1)) * 100);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-normal title-gradient-soft tracking-[-0.02em]">
          The Earth Explorer Command Centre
        </h1>
        <p className="text-sm sm:text-base text-[#A9BAD0] max-w-[68ch]">
          Synchronised 3D NASA Earth observations, provenance telemetry, and real-time Web Audio visualiser.
        </p>
      </div>

      {/* 1. Experience Selector Tabs (Read from shared EARTH_EXPERIENCES config) */}
      <div
        role="tablist"
        aria-label="Choose Earth Experience"
        className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3"
      >
        {selectorItems.map((item) => {
          const active = activeExperienceId === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => handleSelectExp(item.id)}
              className={`min-h-[50px] sm:min-h-[60px] rounded-2xl p-2.5 sm:p-3.5 text-left border transition-all flex items-center justify-between gap-3 cursor-pointer relative overflow-hidden ${
                active
                  ? 'glass-panel shadow-lg'
                  : 'bg-[#0A1220]/75 border-[#1E2E48] hover:border-slate-500/60'
              }`}
              style={active ? { borderColor: item.color } : undefined}
            >
              {active && (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-4 top-0 h-1 rounded-b-full"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}` }}
                />
              )}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0"
                  style={{ backgroundColor: `${item.color}1C`, borderColor: `${item.color}55` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-display font-semibold text-[#F5F8FF] leading-snug break-words">
                    {item.title}
                  </div>
                  <div className="text-xs font-mono-tabular text-[#A9BAD0] leading-snug break-words">
                    {item.sub}
                  </div>
                </div>
              </div>
              {active && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Prominent Sticky Top Audio Transport Deck (immediately visible above fold) */}
      <JukeboxTransportDeck
        experience={experience}
        series={series}
        currentPoint={currentPoint}
        stepIndex={stepIndex}
        announcedStepIndex={announcedStepIndex}
        totalSteps={series.length}
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        playbackSpeed={playbackSpeed}
        loopEnabled={loopEnabled}
        telemetry={telemetry}
        isLoading={isLoading}
        onTogglePlay={onTogglePlay}
        onStepChange={onStepChange}
        onReset={onReset}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onSpeedChange={setPlaybackSpeed}
        onToggleLoop={() => setLoopEnabled((l) => !l)}
        onDescribeSound={onDescribeSound}
      />

      {soundCaptions && (
        <LiveSoundCaptionsBar
          experience={experience}
          currentPoint={currentPoint}
          telemetry={telemetry}
          accentColor={accentColor}
        />
      )}

      {/* 3. Signature Experience Visual Banner (Slides 05-07 driven by REAL loaded series) */}
      <ExperienceSignatureBanner
        experience={experience}
        series={series}
        currentPoint={currentPoint}
        isPlaying={isPlaying}
      />

      {/* First-Visit Tour & Accessibility Numbered Callouts Bar (1-4 PDF Motif) */}
      {showCallouts && (
        <GlassPanel
          elevation={2}
          accentColor="#57D6A0"
          className="p-3.5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <NumberedCallout
              number={1}
              label="Main Visualisation Area"
              active={tourStep === 1}
              onClick={() => setTourStep(1)}
            />
            <NumberedCallout
              number={2}
              label="Scientific Info Panel"
              active={tourStep === 2}
              onClick={() => setTourStep(2)}
            />
            <NumberedCallout
              number={3}
              label="Data Timeline"
              active={tourStep === 3}
              onClick={() => setTourStep(3)}
            />
            <NumberedCallout
              number={4}
              label="Sound Visualiser"
              active={tourStep === 4}
              onClick={() => setTourStep(4)}
            />
          </div>
          {showTourDismiss && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A9BAD0] hidden sm:inline">
                {tourStep === 1 && 'Spin the photorealistic 3D globe or toggle the NASA frame.'}
                {tourStep === 2 && 'Inspect dataset provenance, real period & mapping recipe.'}
                {tourStep === 3 && 'Scrub the chronological timeline or press Spacebar to play.'}
                {tourStep === 4 && 'Watch the live AnalyserNode spectrum react in real time.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  completeTour();
                  closeTour();
                }}
                className="min-h-[36px] px-3 py-1 rounded-xl bg-[#57D6A0] text-[#050914] font-mono-tabular font-bold text-xs cursor-pointer"
              >
                Got it
              </button>
              <button
                type="button"
                aria-label="Dismiss tour"
                onClick={completeTour}
                className="p-1.5 text-[#A9BAD0] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </GlassPanel>
      )}

      {/* 3. SLIDE-03 COMMAND CENTRE WINDOW FRAME */}
      <GlassPanel
        elevation={3}
        accentColor={experience.themeColor}
        className="overflow-hidden border border-[#9EC5FF]/25 shadow-[0_28px_80px_rgba(2,6,18,0.85)]"
      >
        {/* Top OS-style Glass Window Chrome Bar (3 dots + Stage Switch) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/10 bg-[#0C1729]/75">
          <div className="flex flex-wrap items-center gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]/35" />
            </div>
            <DataStatusBadge provenance={provenance} compact />
            <span className="text-xs font-mono-tabular text-[#A9BAD0]">
              {isGlobalDataset ? 'Pin:' : 'Site:'}{' '}
              <strong className="text-[#F5F8FF]">{selectedLocationName}</strong>
              {isGlobalDataset && (
                <span className="text-[#9AA9BD]"> (global series)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#050914]/90 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setStageView('globe')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-display font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                stageView === 'globe' ? 'bg-[#52C7F5] text-[#050914]' : 'text-[#A9BAD0] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Globe 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setStageView('nasa')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-display font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                stageView === 'nasa' ? 'bg-[#52C7F5] text-[#050914]' : 'text-[#A9BAD0] hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>NASA Visualization</span>
            </button>
          </div>
        </div>

        {/* Inner Command Centre Two-Column Workspace */}
        <div className="p-3 sm:p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* LEFT 7 COLS: Stage (#1) + Integrated Data Timeline (#3) */}
          <div className="xl:col-span-7 flex flex-col gap-3">
            {/* #1 Main Visualisation Area (Deep letterbox stage matching slide-03) */}
            <div
              className={`relative rounded-2xl bg-[#02050D] border overflow-hidden transition-shadow ${
                showCallouts && tourStep === 1
                  ? 'border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.3)]'
                  : 'border-white/10'
              }`}
            >
              {showCallouts && (
                <div className="hidden sm:flex items-center gap-1.5 absolute top-3 left-3 z-20 pointer-events-none">
                  <span className="w-7 h-7 rounded-full bg-[#57D6A0] text-[#050914] text-xs font-mono-tabular font-bold inline-flex items-center justify-center ring-2 ring-dashed ring-[#6EE7B7]/80 callout-badge-halo">
                    1
                  </span>
                  <span className="w-6 h-px bg-[#57D6A0]/80" />
                </div>
              )}

              {stageView === 'globe' ? (
                <div className="relative">
                  <Suspense
                    fallback={
                      <div className="h-[360px] flex items-center justify-center text-xs font-mono-tabular text-[#A9BAD0]">
                        Loading photorealistic 3D Earth Stage...
                      </div>
                    }
                  >
                    <InteractiveGlobe
                      mode="explorer"
                      experienceId={experience.id}
                      accentColor={accentColor}
                      lat={selectedLat}
                      lon={selectedLon}
                      normalizedValue={normalizedCurrent}
                      rawValueLabel={`${currentPoint.primaryValue} ${pSpec.unit}`}
                      isGlobalDataset={isGlobalDataset}
                      isAudioPlaying={isPlaying}
                      onSelectLocation={handleSelectLoc}
                      topLeftOffsetClass={showCallouts ? 'sm:pl-16' : ''}
                    />
                  </Suspense>

                  {/* Picture-in-Picture NASA Frame Switcher */}
                  {currentFrame && (
                    <button
                      type="button"
                      onClick={() => setStageView('nasa')}
                      title="Switch to NASA visualization frame"
                      className="hidden sm:block absolute top-14 right-3 w-28 rounded-xl overflow-hidden border border-[#52C7F5]/60 bg-[#050914] shadow-xl hover:scale-105 transition-transform cursor-pointer z-20"
                    >
                      <img
                        src={currentFrame.fallbackImageUrl}
                        alt={currentFrame.title}
                        className="w-full h-14 object-cover"
                      />
                      <div className="px-1.5 py-0.5 text-[9px] font-mono-tabular text-[#F5F8FF] truncate">
                        NASA Frame
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative h-[360px] sm:h-[420px]">
                  <img
                    src={currentFrame.imageUrl}
                    onError={(e) => {
                      if (e.currentTarget.src !== currentFrame.fallbackImageUrl) {
                        e.currentTarget.src = currentFrame.fallbackImageUrl;
                      }
                    }}
                    alt={currentFrame.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono-tabular text-[#52C7F5] uppercase">
                        {currentFrame.dateLabel} · {currentFrame.credit}
                      </div>
                      <h3 className="text-sm sm:text-base font-display font-bold text-[#F5F8FF]">
                        {currentFrame.title}
                      </h3>
                    </div>
                    <a
                      href={currentFrame.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0A1220]/90 border border-[#52C7F5]/50 text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1"
                    >
                      <span>NASA Worldview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* #3 Data Timeline Strip Directly Beneath Stage (Slide-03 Pattern) */}
            <div
              className={`rounded-2xl bg-[#070E1B]/90 border p-3.5 space-y-2.5 transition-shadow ${
                showCallouts && tourStep === 3
                  ? 'border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                  : 'border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {showCallouts && (
                    <span className="w-6 h-6 rounded-full bg-[#57D6A0] text-[#050914] text-xs font-mono-tabular font-bold inline-flex items-center justify-center ring-2 ring-dashed ring-[#6EE7B7]/80">
                      3
                    </span>
                  )}
                  <span className="text-xs font-mono-tabular text-[#A9BAD0] uppercase tracking-wider">
                    Data Timeline
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono-tabular">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0E2440] border border-[#52C7F5]/60 text-[#7CE8FF] font-semibold">
                    {currentPoint.dateLabel}
                  </span>
                  <span className="text-[#F5F8FF]">
                    {currentPoint.primaryValue} {pSpec.unit}
                  </span>
                </div>
              </div>

              {/* Scrubber slider */}
              <div className="relative flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Chronological data timeline scrubber"
                  aria-valuetext={timelineValueText}
                  min={0}
                  max={Math.max(0, series.length - 1)}
                  value={stepIndex}
                  onChange={(e) => onStepChange(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-[#52C7F5] cursor-pointer min-h-[36px]"
                  style={{
                    background: `linear-gradient(90deg, ${experience.themeColor} 0%, #52C7F5 ${progressPct}%, rgba(148,163,184,0.25) ${progressPct}%)`
                  }}
                />
              </div>

              {/* Real date ticks + inline compact transport */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono-tabular text-[#9AA9BD]">
                <div className="flex-1 flex items-center justify-between gap-2 min-w-[200px] pr-2">
                  {timelineTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous observation step"
                    onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#F5F8FF] cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause sonification' : 'Play sonification'}
                    onClick={onTogglePlay}
                    className="px-2.5 py-1 rounded-lg bg-[#52C7F5] text-[#050914] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next observation step"
                    onClick={() => onStepChange(Math.min(series.length - 1, stepIndex + 1))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#F5F8FF] cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Stacked Scientific Information Panel (#2) + Interactive Sound Visualiser (#4) */}
          <div className="xl:col-span-5 flex flex-col gap-3 justify-between">
            {/* #2 Scientific Information Panel */}
            <div
              className={`rounded-2xl bg-[#091223]/90 border p-4 space-y-3.5 flex-1 flex flex-col justify-between transition-shadow ${
                showCallouts && tourStep === 2
                  ? 'border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                  : 'border-white/10'
              }`}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {showCallouts && (
                      <span className="w-6 h-6 rounded-full bg-[#57D6A0] text-[#050914] text-xs font-mono-tabular font-bold inline-flex items-center justify-center ring-2 ring-dashed ring-[#6EE7B7]/80">
                        2
                      </span>
                    )}
                    <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#A9BAD0]">
                      Scientific Information Panel
                    </span>
                  </div>
                </div>

                <Tabs
                  ariaLabel="Scientific panel sections"
                  accentColor={experience.themeColor}
                  activeId={rightTab}
                  onChange={(id) => setRightTab(id as typeof rightTab)}
                  items={[
                    { id: 'info', label: 'Science', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    { id: 'source', label: 'Source', icon: <Database className="w-3.5 h-3.5" /> },
                    { id: 'mapping', label: 'Sound Recipe', icon: <Sparkles className="w-3.5 h-3.5" /> }
                  ]}
                />

                {rightTab === 'info' && (
                  <div className="space-y-3">
                    <dl className="grid grid-cols-2 gap-2 text-xs bg-[#050914]/80 border border-white/10 rounded-xl p-3">
                      <div className="col-span-2">
                        <dt className="text-[#9AA9BD] font-mono-tabular">Dataset:</dt>
                        <dd className="text-[#F5F8FF] font-medium mt-0.5">{experience.datasetTitle}</dd>
                      </div>
                      <div className="pt-1 border-t border-white/10">
                        <dt className="text-[#9AA9BD] font-mono-tabular">Observation Period:</dt>
                        <dd className="text-[#F5F8FF] font-mono-tabular mt-0.5">{obsPeriodLabel}</dd>
                      </div>
                      <div className="pt-1 border-t border-white/10">
                        <dt className="text-[#9AA9BD] font-mono-tabular">Measurement:</dt>
                        <dd className="text-[#F5F8FF] font-mono-tabular mt-0.5">{pSpec.unit}</dd>
                      </div>
                    </dl>

                    <div className="grid grid-cols-3 gap-2">
                      <StatTile
                        label="Current"
                        value={currentPoint.primaryValue}
                        unit={pSpec.unit}
                        accentColor={experience.themeColor}
                      />
                      <StatTile
                        label="Normalized"
                        value={`${Math.round(normalizedCurrent * 100)}%`}
                        accentColor="#57D6A0"
                        explanation={`clamp((${currentPoint.primaryValue} - ${pSpec.minData}) / (${pSpec.maxData} - ${pSpec.minData}), 0, 1)`}
                      />
                      <StatTile
                        label="Pitch"
                        value={telemetry.primaryPitchHz}
                        unit="Hz"
                        accentColor="#52C7F5"
                      />
                    </div>

                    <Accordion title="Scientific context & what the observation means">
                      <p className="text-sm text-[#A9BAD0] leading-relaxed">{experience.scientificOverview}</p>
                    </Accordion>
                  </div>
                )}

                {rightTab === 'source' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <DataStatusBadge provenance={provenance} />
                      {provenance.sourceUrl && (
                        <a
                          href={provenance.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono-tabular text-[#52C7F5] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Source URL</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="rounded-xl bg-[#050914] border border-white/10 p-3 text-xs font-mono-tabular space-y-1.5 text-[#A9BAD0]">
                      <div><strong className="text-[#F5F8FF]">Provider:</strong> {provenance.provider}</div>
                      <div><strong className="text-[#F5F8FF]">Variable:</strong> {pSpec.variableName} ({pSpec.unit})</div>
                      <div><strong className="text-[#F5F8FF]">Period:</strong> {obsPeriodLabel}</div>
                      {provenance.referencePeriod && (
                        <div><strong className="text-[#F5F8FF]">Baseline:</strong> {provenance.referencePeriod}</div>
                      )}
                    </div>

                    {failureReason && (
                      <div role="alert" className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-100 space-y-2">
                        <div>{degradedMessage} (Reason: {failureReason})</div>
                        <div className="flex gap-2">
                          <button type="button" onClick={onRetry} className="px-3 py-1 rounded-lg bg-rose-400 text-[#050914] font-bold cursor-pointer">
                            Retry
                          </button>
                          <button type="button" onClick={onSwitchToDemo} className="px-3 py-1 rounded-lg bg-[#050914] border border-rose-400/40 text-rose-200 cursor-pointer">
                            Use demonstration data
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rightTab === 'mapping' && (
                  <StepCarousel
                    accentColor={experience.themeColor}
                    steps={[
                      { badge: 'Pitch', title: pSpec.label, body: pSpec.musicalExplanation },
                      { badge: 'Rhythm', title: experience.mappings.rhythm.label, body: experience.mappings.rhythm.musicalExplanation },
                      { badge: 'Timbre', title: experience.mappings.intensity.label, body: experience.mappings.intensity.musicalExplanation }
                    ]}
                  />
                )}
              </div>
            </div>

            {/* #4 Interactive Sound Visualiser Panel (Slide-03 bottom right box) */}
            <div
              className={`rounded-2xl bg-[#091223]/90 border p-4 space-y-2.5 transition-shadow ${
                showCallouts && tourStep === 4
                  ? 'border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <div className="flex items-center gap-2">
                  {showCallouts && (
                    <span className="w-6 h-6 rounded-full bg-[#57D6A0] text-[#050914] text-xs font-mono-tabular font-bold inline-flex items-center justify-center ring-2 ring-dashed ring-[#6EE7B7]/80">
                      4
                    </span>
                  )}
                  <Headphones className="w-3.5 h-3.5 text-[#52C7F5]" />
                  <span className="text-[#F5F8FF] font-semibold">Interactive Sound Visualiser</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={soundCaptions}
                    onClick={() => {
                      const next = !soundCaptions;
                      updateA11yPref('soundCaptions', next);
                      liveAnnouncer.announcePolite(
                        `Live sound captions ${next ? 'enabled' : 'disabled'}.`
                      );
                    }}
                    className={`min-h-[32px] px-2 py-0.5 rounded-lg border text-[11px] font-mono-tabular inline-flex items-center gap-1 cursor-pointer ${
                      soundCaptions
                        ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0] font-bold'
                        : 'bg-[#050914] border-[#1E2E48] text-[#A9BAD0] hover:text-white'
                    }`}
                  >
                    <Subtitles className="w-3 h-3" aria-hidden="true" />
                    <span>Captions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setA11yCenterOpen(true)}
                    className="min-h-[32px] px-2 py-0.5 rounded-lg bg-[#050914] border border-[#1E2E48] text-[11px] font-mono-tabular text-[#52C7F5] hover:border-[#52C7F5]/60 cursor-pointer"
                  >
                    A11y Center
                  </button>
                  <span className={isPlaying ? 'text-[#57D6A0]' : 'text-[#9AA9BD]'}>
                    {isPlaying ? 'LIVE ANALYSERNODE' : 'STANDBY'}
                  </span>
                </div>
              </div>

              <SymmetricalAnalyserCanvas accentColor={accentColor} isPlaying={isPlaying} />

              <p className="text-xs text-[#A9BAD0] leading-snug">
                <strong className="text-[#F5F8FF]">{currentPoint.dateLabel}:</strong>{' '}
                <strong style={{ color: accentColor }}>
                  {currentPoint.primaryValue} {pSpec.unit}
                </strong>{' '}
                → <strong className="text-[#F5F8FF]">{telemetry.primaryNoteName} ({telemetry.primaryPitchHz} Hz)</strong> at{' '}
                <strong className="text-[#F5F8FF]">{telemetry.primaryRhythmBpm} BPM</strong>
              </p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* 4. Interactive Telemetry & Scrubbing Chart (Zoomable + Text Table Accessible) */}
      <GlassPanel elevation={2} className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="w-4 h-4 text-[#52C7F5]" />
            <h2 className="text-sm sm:text-base font-display font-semibold text-[#F5F8FF]">
              Interactive Telemetry &amp; Scrubbing Chart
            </h2>
            <span className="text-xs font-mono-tabular text-[#9AA9BD]">
              · {isGlobalDataset ? 'Global series' : `Grid cell near ${selectedLocationName}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <DataStatusBadge provenance={provenance} compact />
            <button
              type="button"
              onClick={handleSweepChart}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer ${
                isSweepingChart
                  ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0] font-bold'
                  : 'bg-[#050914] border-[#52C7F5]/50 text-[#52C7F5] hover:bg-[#101C2D]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isSweepingChart ? 'Stop sweep' : 'Hear this chart'}</span>
            </button>
            <button
              type="button"
              aria-label="Zoom in chart time range"
              onClick={() => handleZoomChart('in')}
              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#050914] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Zoom out chart time range"
              onClick={() => handleZoomChart('out')}
              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#050914] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={showTextTable}
              onClick={() => setShowTextTable((v) => !v)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#050914] border border-[#1E2E48] text-xs font-mono-tabular text-[#A9BAD0] hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showTextTable ? 'Chart' : 'View as text'}</span>
            </button>
          </div>
        </div>

        {/* Accessible plain-language trend summary & keyboard stepper */}
        <div className="rounded-xl bg-[#050914]/90 border border-[#1E2E48] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p
            role="region"
            aria-label="Chart plain-language trend summary"
            className="text-xs text-[#C7D4E6] leading-relaxed"
          >
            {chartSummaryText}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onKeyDown={handleChartStepKeyDown}
              onClick={() =>
                sonificationEngine.playDataStep({
                  point: currentPoint,
                  experienceId: experience.id,
                  mappings: experience.mappings,
                  durationSec: 0.28,
                  gainTrim: 0.8
                })
              }
              aria-label={`Keyboard Step ${currentPoint.dateLabel}, ${currentPoint.primaryValue} ${pSpec.unit}. Press Left or Right arrows to step timeline, Enter to play.`}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-[#101C2D] hover:bg-[#1E2E48] border border-[#52C7F5]/50 text-xs font-mono-tabular text-[#F5F8FF] cursor-pointer"
            >
              Keyboard Step ({currentPoint.dateLabel})
            </button>
            <button
              type="button"
              onClick={() => speechService.speak(chartSummaryText)}
              className="min-h-[38px] px-2.5 py-1 rounded-lg bg-[#0A1220] hover:bg-[#101C2D] border border-[#1E2E48] text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Read summary</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-label="Loading telemetry chart"
            className="h-[175px] rounded-xl bg-[#050914] border border-[#1E2E48] p-4 flex items-end gap-2 animate-pulse motion-reduce:animate-none"
          >
            {[30, 48, 42, 65, 58, 75, 82, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-800/70 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : showTextTable ? (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-[#1E2E48] bg-[#050914]">
            <table className="w-full text-left text-xs font-mono-tabular">
              <thead className="bg-[#0A1220] text-[#9AA9BD] sticky top-0">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">{pSpec.variableName} ({pSpec.unit})</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleSeries.map((pt) => (
                  <tr key={pt.index} className="border-t border-[#1E2E48]/60">
                    <td className="p-2 text-[#F5F8FF]">{pt.dateLabel}</td>
                    <td className="p-2" style={{ color: experience.themeColor }}>{pt.primaryValue}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => onStepChange(pt.index)}
                        className="text-[#52C7F5] hover:underline cursor-pointer"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            onDoubleClick={() => handleZoomChart('reset')}
            onPointerDown={(e) => {
              scrubbingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              scrubFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (scrubbingRef.current) scrubFromPointer(e);
            }}
            onPointerUp={() => {
              scrubbingRef.current = false;
            }}
            className="w-full h-auto rounded-xl bg-[#050914] border border-[#1E2E48] touch-none cursor-crosshair select-none"
            role="img"
            aria-label={`Telemetry chart for ${experience.title}. Double-tap to reset zoom.`}
          >
            {[0, 0.5, 1].map((t, i) => {
              const y = padT + t * plotH;
              const val = (pSpec.maxData - t * (pSpec.maxData - pSpec.minData)).toFixed(1);
              return (
                <g key={i}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#1E2E48" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-[#9AA9BD] text-[9px] font-mono-tabular">
                    {val}
                  </text>
                </g>
              );
            })}
            <path
              d={chartPath}
              fill="none"
              stroke={accentColor}
              strokeWidth={palette === 'colorblind' ? 3 : 2.5}
              strokeDasharray={palette === 'colorblind' ? '7 3' : undefined}
              strokeLinecap="round"
            />
            {visibleSeries.map((pt, i) => {
              const active = pt.index === stepIndex;
              const cx = getChartX(i);
              const cy = getChartY(pt.primaryValue);
              return (
                <g key={pt.index}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? 6.5 : 3.2}
                    fill={active ? '#F5F8FF' : accentColor}
                    stroke={accentColor}
                    strokeWidth={active ? 2.5 : 0}
                  />
                  {(i % Math.max(1, Math.floor(visibleSeries.length / 6)) === 0 || i === visibleSeries.length - 1) && (
                    <text x={cx} y={chartH - 6} textAnchor="middle" className="fill-[#9AA9BD] text-[9px] font-mono-tabular">
                      {pt.dateLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </GlassPanel>

      {/* Cross-links to other focused pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to={`/hear-the-change?exp=${toExperienceQuerySlug(activeExperienceId)}&lat=${selectedLat.toFixed(2)}&lon=${selectedLon.toFixed(2)}&name=${encodeURIComponent(selectedLocationName)}`}
          className="glass-panel rounded-2xl p-4 hover:border-[#FFC66D]/60 transition-colors flex items-center justify-between gap-2"
        >
          <div>
            <div className="text-sm font-display font-semibold text-[#F5F8FF]">Compare Observation A → B</div>
            <div className="text-xs text-[#A9BAD0]">Open Hear the Change auditory comparison</div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#FFC66D]" />
        </Link>

        <Link
          to="/orchestra"
          className="glass-panel rounded-2xl p-4 hover:border-[#52C7F5]/60 transition-colors flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#52C7F5]" />
            <div>
              <div className="text-sm font-display font-semibold text-[#F5F8FF]">Multi-Layer Planetary Mix</div>
              <div className="text-xs text-[#A9BAD0]">Open Earth Orchestra symphony</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#52C7F5]" />
        </Link>
      </div>
    </div>
  );
};
