import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  DataPoint,
  EarthExperience,
  SonificationTelemetry
} from '../types/earthsonic';
import {
  Check,
  MessageSquareText,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { buildSoundDescription } from '../services/soundDescriptionBuilder';
import {
  guidedListeningController,
  type GuidedStateSnapshot
} from '../services/guidedListeningController';
import { useAccessibilityStore } from '../store/useAccessibilityStore';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import { liveAnnouncer } from '../services/a11yAnnouncer';

interface JukeboxTransportDeckProps {
  experience: EarthExperience;
  series?: DataPoint[];
  currentPoint: DataPoint;
  stepIndex: number;
  announcedStepIndex?: number;
  totalSteps: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  loopEnabled: boolean;
  telemetry: SonificationTelemetry;
  isLoading?: boolean;
  onTogglePlay: () => void;
  onStepChange: (idx: number) => void;
  onReset: () => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onDescribeSound?: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

export const JukeboxTransportDeck: React.FC<JukeboxTransportDeckProps> = ({
  experience,
  series,
  currentPoint,
  stepIndex,
  announcedStepIndex,
  totalSteps,
  isPlaying,
  isMuted,
  volume,
  playbackSpeed,
  loopEnabled,
  telemetry,
  isLoading = false,
  onTogglePlay,
  onStepChange,
  onReset,
  onToggleMute,
  onVolumeChange,
  onSpeedChange,
  onToggleLoop,
  onDescribeSound
}) => {
  const deckRef = useRef<HTMLElement | null>(null);
  const soundTriggerRef = useRef<HTMLButtonElement | null>(null);
  const soundDialogRef = useRef<HTMLDivElement | null>(null);
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);

  const announcementVerbosity = useAccessibilityStore((s) => s.prefs.announcementVerbosity);
  const guidedListening = useAccessibilityStore((s) => s.prefs.guidedListening);
  const guidedHintDismissed = useAccessibilityStore((s) => s.prefs.guidedHintDismissed);
  const updateA11yPref = useAccessibilityStore((s) => s.updatePref);
  const soundSettings = useEarthSonicStore((s) => s.soundSettings);

  const [guidedState, setGuidedState] = useState<GuidedStateSnapshot>(() =>
    guidedListeningController.getSnapshot()
  );
  useEffect(() => guidedListeningController.subscribe(setGuidedState), []);

  const volumePct = Math.round(volume * 100);
  const effectivePct = isMuted ? 0 : volumePct;
  const progressPct = Math.round((stepIndex / Math.max(1, totalSteps - 1)) * 100);

  const timelineTicks = useMemo(() => {
    if (!series || series.length <= 1) return [currentPoint.dateLabel];
    const indices = [0, 0.25, 0.5, 0.75, 1].map((t) =>
      Math.round(t * (series.length - 1))
    );
    return Array.from(new Set(indices)).map((i) => series[i].dateLabel);
  }, [series, currentPoint.dateLabel]);

  const effectiveAnnouncedIdx =
    announcedStepIndex !== undefined
      ? Math.max(0, Math.min(totalSteps - 1, announcedStepIndex))
      : stepIndex;
  const announcedPoint = series?.[effectiveAnnouncedIdx] || currentPoint;

  const soundDescription = useMemo(
    () =>
      buildSoundDescription({
        experience,
        point: announcedPoint,
        prevPoint: effectiveAnnouncedIdx > 0 ? series?.[effectiveAnnouncedIdx - 1] : undefined,
        stepIndex: effectiveAnnouncedIdx,
        totalSteps,
        soundSettings
      }),
    [experience, announcedPoint, effectiveAnnouncedIdx, series, totalSteps, soundSettings]
  );

  const timelineValueText = soundDescription.forLevel(announcementVerbosity);

  const guidedPhaseLabel =
    guidedState.phase === 'LISTEN'
      ? 'Listening'
      : guidedState.phase === 'SPEAK'
      ? 'Describing'
      : guidedState.phase === 'GAP'
      ? 'Next'
      : isPlaying
      ? 'Listening'
      : 'Paused';

  const handleDescribeClick = () => {
    if (onDescribeSound) {
      onDescribeSound();
    } else {
      liveAnnouncer.announcePolite(soundDescription.detailed, { force: true });
    }
  };

  // Publish sticky deck height for scroll-padding-top so focused items never hide under sticky bars
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    const syncPad = () => {
      const navH =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
        ) || 65;
      const deckH = Math.round(el.getBoundingClientRect().height) || 140;
      document.documentElement.style.setProperty('--transport-height', `${deckH}px`);
      document.documentElement.style.setProperty(
        '--scroll-pad-top',
        `${navH + deckH + 14}px`
      );
    };
    syncPad();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(syncPad);
    ro.observe(el);
    return () => {
      ro.disconnect();
      const navH =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
        ) || 65;
      document.documentElement.style.setProperty('--scroll-pad-top', `${navH + 16}px`);
    };
  }, []);

  // Focus trap + Esc + return focus for Mobile "Sound" Popover/Sheet
  useEffect(() => {
    if (!soundSheetOpen) return;
    const dialog = soundDialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSoundSheetOpen(false);
        soundTriggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const items = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [soundSheetOpen]);

  const closeSoundSheet = () => {
    setSoundSheetOpen(false);
    setTimeout(() => soundTriggerRef.current?.focus(), 0);
  };

  const tooltipIdPrefix = useId();
  const speedGroupLabelId = useId();
  const sheetSpeedGroupId = useId();
  const sheetId = useId();

  return (
    <>
      <section
        ref={deckRef}
        aria-label="Sonification transport controls"
        className="sticky z-30 w-full rounded-2xl sm:rounded-3xl bg-[#071122]/94 backdrop-blur-xl border border-white/15 shadow-[0_14px_38px_rgba(2,6,18,0.82)] transition-colors px-2.5 sm:px-4 py-2.5 sm:py-3"
        style={{
          top: 'var(--nav-height, 65px)',
          borderTopWidth: '3px',
          borderTopColor: experience.themeColor,
          paddingLeft: 'max(0.625rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.625rem, env(safe-area-inset-right))'
        }}
      >
        <div className="flex flex-col gap-2.5">
          {/* ROW 1: Primary Transport Controls + (Desktop) Speed & Volume / (Mobile) Sound Sheet Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Transport Cluster (>= 8px spacing between all targets) */}
            <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-start">
              <div className="relative group order-2 md:order-1 shrink-0">
                <button
                  type="button"
                  onClick={onReset}
                  aria-label="Restart timeline from first observation"
                  aria-describedby={`${tooltipIdPrefix}-reset`}
                  className="w-[44px] h-[44px] md:w-auto md:min-w-[48px] md:min-h-[48px] md:px-2.5 py-1.5 rounded-xl bg-[#0B172B] hover:bg-[#132544] text-[#E2E8F0] border border-[#2A3F63] hover:border-[#52C7F5] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                >
                  <RotateCcw className="w-7 h-7 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:inline text-xs font-mono-tabular font-semibold">
                    Restart
                  </span>
                </button>
                <span
                  id={`${tooltipIdPrefix}-reset`}
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-[#050914] border border-[#52C7F5]/60 px-2.5 py-1 text-xs font-mono-tabular text-[#F5F8FF] shadow-xl"
                >
                  Restart series
                </span>
              </div>

              <div className="relative group order-3 md:order-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onStepChange((stepIndex - 1 + totalSteps) % totalSteps)}
                  aria-label="Previous observation step"
                  aria-describedby={`${tooltipIdPrefix}-prev`}
                  className="w-[44px] h-[44px] md:w-auto md:min-w-[48px] md:min-h-[48px] md:px-2.5 py-1.5 rounded-xl bg-[#0B172B] hover:bg-[#132544] text-[#E2E8F0] border border-[#2A3F63] hover:border-[#52C7F5] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                >
                  <SkipBack className="w-7 h-7 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:inline text-xs font-mono-tabular font-semibold">
                    Previous
                  </span>
                </button>
                <span
                  id={`${tooltipIdPrefix}-prev`}
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-[#050914] border border-[#52C7F5]/60 px-2.5 py-1 text-xs font-mono-tabular text-[#F5F8FF] shadow-xl"
                >
                  Previous step (Left Arrow)
                </span>
              </div>

              {/* PRIMARY PLAY / PAUSE SONIFICATION BUTTON */}
              <button
                type="button"
                onClick={onTogglePlay}
                aria-pressed={isPlaying}
                aria-label={isPlaying ? 'Pause sonification' : 'Play sonification'}
                className="order-1 md:order-3 min-w-[64px] min-h-[56px] md:min-h-[60px] px-2.5 md:px-5 rounded-2xl font-display font-bold text-sm sm:text-base text-[#050914] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 shadow-xl transition-transform active:scale-95 cursor-pointer border-2 border-white/40 shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5F8FF]"
                style={{
                  background: `linear-gradient(135deg, ${experience.themeColor} 0%, #FFE4A3 100%)`,
                  boxShadow: isPlaying
                    ? `0 0 28px ${experience.themeColor}88`
                    : `0 6px 22px ${experience.themeColor}44`
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span className="hidden md:inline tracking-wide whitespace-nowrap">PAUSE SONIFICATION</span>
                    <span className="md:hidden text-[10px] font-extrabold leading-none tracking-wider">PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-7 h-7 md:w-8 md:h-8 fill-current shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span className="hidden md:inline tracking-wide whitespace-nowrap">PLAY SONIFICATION</span>
                    <span className="md:hidden text-[10px] font-extrabold leading-none tracking-wider">PLAY</span>
                  </>
                )}
              </button>

              <div className="relative group order-4 shrink-0">
                <button
                  type="button"
                  onClick={() => onStepChange((stepIndex + 1) % totalSteps)}
                  aria-label="Next observation step"
                  aria-describedby={`${tooltipIdPrefix}-next`}
                  className="w-[44px] h-[44px] md:w-auto md:min-w-[48px] md:min-h-[48px] md:px-2.5 py-1.5 rounded-xl bg-[#0B172B] hover:bg-[#132544] text-[#E2E8F0] border border-[#2A3F63] hover:border-[#52C7F5] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                >
                  <SkipForward className="w-7 h-7 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:inline text-xs font-mono-tabular font-semibold">
                    Next
                  </span>
                </button>
                <span
                  id={`${tooltipIdPrefix}-next`}
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-[#050914] border border-[#52C7F5]/60 px-2.5 py-1 text-xs font-mono-tabular text-[#F5F8FF] shadow-xl"
                >
                  Next step (Right Arrow)
                </span>
              </div>

              <div className="relative group order-5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleLoop}
                  aria-pressed={loopEnabled}
                  aria-label={`Loop playback: ${loopEnabled ? 'ON' : 'OFF'}`}
                  aria-describedby={`${tooltipIdPrefix}-loop`}
                  className={`w-[44px] h-[44px] md:w-auto md:min-w-[48px] md:min-h-[48px] md:px-2.5 py-1.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5] ${
                    loopEnabled
                      ? 'bg-[#52C7F5]/20 border-2 border-[#52C7F5] text-[#F5F8FF]'
                      : 'bg-[#0B172B] border border-[#2A3F63] text-[#CBD5E1] hover:text-white hover:border-[#52C7F5]'
                  }`}
                >
                  <Repeat
                    className={`w-7 h-7 shrink-0 ${loopEnabled ? 'text-[#52C7F5]' : ''}`}
                    strokeWidth={loopEnabled ? 2.4 : 2}
                    aria-hidden="true"
                  />
                  <span className="sr-only md:not-sr-only md:inline text-xs font-mono-tabular font-semibold">
                    {loopEnabled ? 'Loop: On' : 'Loop'}
                  </span>
                </button>
                <span
                  id={`${tooltipIdPrefix}-loop`}
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-[#050914] border border-[#52C7F5]/60 px-2.5 py-1 text-xs font-mono-tabular text-[#F5F8FF] shadow-xl"
                >
                  Toggle loop ({loopEnabled ? 'Currently ON' : 'Currently OFF'})
                </span>
              </div>

              {/* Mobile Compact Sound Popover/Sheet Trigger (< 768px) */}
              <div className="relative order-6 md:hidden shrink-0">
                <button
                  ref={soundTriggerRef}
                  type="button"
                  onClick={() => setSoundSheetOpen(true)}
                  aria-expanded={soundSheetOpen}
                  aria-haspopup="dialog"
                  aria-controls={sheetId}
                  aria-label={`Sound settings: ${playbackSpeed}x speed, ${isMuted ? 'muted' : `${volumePct}% volume`}`}
                  className="w-[44px] h-[44px] rounded-xl bg-[#0B172B] hover:bg-[#132544] border-2 border-[#2A3F63] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                >
                  <SlidersHorizontal className="w-7 h-7 text-[#52C7F5] shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only">Sound</span>
                </button>
              </div>
            </div>

            {/* Desktop / Tablet Speed & Master Volume (>= 768px) */}
            <div className="hidden md:flex flex-wrap items-center gap-3">
              {/* Speed segmented control */}
              <div
                role="group"
                aria-labelledby={speedGroupLabelId}
                className="flex items-center gap-1.5 bg-[#050914]/90 border border-[#243656] rounded-xl p-1"
              >
                <span id={speedGroupLabelId} className="sr-only">
                  Playback speed
                </span>
                {SPEED_OPTIONS.map((spd) => {
                  const selected = playbackSpeed === spd;
                  return (
                    <button
                      key={spd}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSpeedChange(spd)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-mono-tabular inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5] ${
                        selected
                          ? 'bg-[#52C7F5] text-[#050914] font-bold border-2 border-[#F5F8FF]'
                          : 'text-[#DCE8F8] hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                      <span>{spd}×</span>
                    </button>
                  );
                })}
              </div>

              {/* Mute button + 24px-thumb volume slider + percentage */}
              <div className="flex items-center gap-2.5 bg-[#050914]/90 border border-[#243656] rounded-xl px-3 py-1">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-pressed={isMuted}
                    aria-label={isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                    aria-describedby={`${tooltipIdPrefix}-mute`}
                    className={`min-w-[48px] min-h-[48px] rounded-xl inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5] ${
                      isMuted
                        ? 'bg-rose-500/20 border-2 border-rose-400 text-rose-200'
                        : 'hover:bg-white/10 border border-transparent text-[#F5F8FF]'
                    }`}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-7 h-7 text-rose-300" strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-7 h-7 text-[#52C7F5]" strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                  <span
                    id={`${tooltipIdPrefix}-mute`}
                    role="tooltip"
                    className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-[#050914] border border-[#52C7F5]/60 px-2.5 py-1 text-xs font-mono-tabular text-[#F5F8FF] shadow-xl"
                  >
                    {isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                  </span>
                </div>

                <input
                  type="range"
                  aria-label="Master volume"
                  aria-valuetext={isMuted ? 'Muted, 0 percent' : `${volumePct} percent`}
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="earthsonic-vol-slider w-24 lg:w-28 cursor-pointer"
                  style={{
                    background: `linear-gradient(90deg, #52C7F5 0%, #52C7F5 ${effectivePct}%, rgba(148,163,184,0.28) ${effectivePct}%)`
                  }}
                />

                <span className="text-sm font-mono-tabular font-semibold text-[#F5F8FF] min-w-[3.25rem] text-right">
                  {isMuted ? 'MUTE' : `${volumePct}%`}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: Enlarged Readouts & Thick Timeline Scrubber + Real Date Ticks */}
          <div className="w-full flex flex-col gap-1.5 pt-1 border-t border-white/10">
            {isLoading ? (
              <div
                role="status"
                aria-label="Loading timeline observations"
                className="space-y-2 py-1 animate-pulse motion-reduce:animate-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-5 w-48 rounded bg-slate-800/80" />
                  <div className="h-4 w-56 rounded bg-slate-800/80" />
                </div>
                <div className="h-2.5 w-full rounded-lg bg-slate-800/80" />
                <span className="sr-only">Loading observation timeline...</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[18px] sm:text-[20px] font-bold font-mono-tabular text-[#F5F8FF] leading-snug break-words">
                    <span>{currentPoint.dateLabel}</span>
                    <span className="mx-1.5 text-[#9AA9BD]">—</span>
                    <span style={{ color: experience.themeColor }}>
                      {currentPoint.primaryValue} {experience.mappings.pitch.unit}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="text-[14px] sm:text-[15px] font-mono-tabular text-[#DCE8F8] leading-snug break-words">
                      {telemetry.primaryNoteName} ({telemetry.primaryPitchHz} Hz) ·{' '}
                      {telemetry.primaryRhythmBpm} BPM · Step {stepIndex + 1}/{totalSteps}
                    </div>
                    <button
                      type="button"
                      onClick={handleDescribeClick}
                      aria-label="Describe current sound (D)"
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#0B172B] hover:bg-[#132544] border border-[#2A3F63] hover:border-[#52C7F5] text-xs font-mono-tabular font-semibold text-[#F5F8FF] inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                    >
                      <MessageSquareText className="w-4 h-4 text-[#52C7F5] shrink-0" aria-hidden="true" />
                      <span>Describe current sound</span>
                    </button>
                  </div>
                </div>

                <div className="py-1.5">
                  <input
                    type="range"
                    aria-label="Timeline scrubber"
                    aria-valuetext={timelineValueText}
                    min={0}
                    max={Math.max(0, totalSteps - 1)}
                    value={stepIndex}
                    onChange={(e) => onStepChange(Number(e.target.value))}
                    className="earthsonic-slider-lg w-full cursor-pointer"
                    style={
                      {
                        '--slider-accent': experience.themeColor,
                        background: `linear-gradient(90deg, ${experience.themeColor} 0%, #52C7F5 ${progressPct}%, rgba(148,163,184,0.28) ${progressPct}%)`
                      } as React.CSSProperties
                    }
                  />
                </div>

                <div
                  aria-hidden="true"
                  className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-[#B8C7DB]"
                >
                  {timelineTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>

                {/* Visible browse-mode text equivalent + Guided Listening phase/progress (never a live region to avoid double-announcing) */}
                <div
                  data-testid="now-playing-description"
                  aria-live="off"
                  className="text-xs text-[#DCE8F8] bg-[#050914]/80 border border-[#1E2E48] rounded-xl px-3 py-1.5 leading-relaxed space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular uppercase tracking-wider text-[#52C7F5] font-semibold">
                      {isPlaying || guidedState.active ? 'Now playing:' : 'Sound preview:'}
                    </span>
                    {guidedListening && (
                      <span
                        data-testid="guided-phase-badge"
                        className="px-2 py-0.5 rounded-full bg-[#57D6A0]/15 border border-[#57D6A0]/50 text-[#57D6A0] font-mono-tabular text-[11px] font-bold uppercase tracking-wider"
                      >
                        {guidedPhaseLabel}
                      </span>
                    )}
                    <span>{guidedListening && guidedState.nowPlayingText ? guidedState.nowPlayingText : timelineValueText}</span>
                  </div>
                  {guidedListening && (
                    <div
                      role="progressbar"
                      aria-label="Guided listening phase progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={guidedState.progressPct}
                      className="h-1.5 w-full rounded-full bg-[#13203A] overflow-hidden"
                    >
                      <div
                        className="h-full bg-[#57D6A0] transition-all duration-100 motion-reduce:transition-none"
                        style={{ width: `${guidedState.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* One-time dismissible Guided Listening hint near the transport bar */}
                {!guidedListening && !guidedHintDismissed && (
                  <div
                    role="region"
                    aria-label="Guided listening suggestion"
                    data-testid="guided-listening-hint"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0B172B]/90 border border-[#57D6A0]/40 px-3 py-1.5 text-xs text-[#DCE8F8]"
                  >
                    <span>Using a screen reader? Turn on Guided listening so sound and speech take turns.</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateA11yPref('announcementsEnabled', true);
                          updateA11yPref(
                            'guidedListening',
                            true,
                            'Guided listening enabled. Sound and speech will take turns.'
                          );
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-[#57D6A0] hover:bg-emerald-300 text-[#050914] font-display font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F8FF]"
                      >
                        Turn on Guided listening
                      </button>
                      <button
                        type="button"
                        aria-label="Dismiss guided listening hint"
                        onClick={() =>
                          updateA11yPref('guidedHintDismissed', true, 'Guided listening hint dismissed.')
                        }
                        className="min-h-[36px] min-w-[36px] px-2 py-1 rounded-lg bg-[#050914] border border-[#243656] hover:border-[#52C7F5] text-[#B8C7DB] hover:text-[#F5F8FF] font-mono-tabular text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile (<768px) Focus-Trapped Sound Popover / Sheet */}
      {soundSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:hidden">
          <div className="fixed inset-0" onClick={closeSoundSheet} aria-hidden="true" />
          <div
            id={sheetId}
            ref={soundDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Playback speed and volume"
            className="relative z-10 w-full max-w-md rounded-t-3xl bg-[#0A1220] border-t border-x border-[#52C7F5]/45 p-5 shadow-2xl space-y-5"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))'
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3">
              <h2 className="text-base font-display font-bold text-[#F5F8FF]">
                Sound: Speed &amp; Volume
              </h2>
              <button
                type="button"
                aria-label="Close sound settings"
                onClick={closeSoundSheet}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#050914] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52C7F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div id={sheetSpeedGroupId} className="text-xs font-mono-tabular uppercase tracking-wider text-[#B8C7DB]">
                Playback speed
              </div>
              <div
                role="group"
                aria-labelledby={sheetSpeedGroupId}
                className="grid grid-cols-4 gap-2"
              >
                {SPEED_OPTIONS.map((spd) => {
                  const selected = playbackSpeed === spd;
                  return (
                    <button
                      key={spd}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSpeedChange(spd)}
                      className={`min-h-[48px] rounded-xl text-sm font-mono-tabular inline-flex items-center justify-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#52C7F5] text-[#050914] font-bold border-2 border-[#F5F8FF]'
                          : 'bg-[#050914] text-[#F5F8FF] border border-[#243656]'
                      }`}
                    >
                      {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                      <span>{spd}×</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-[#B8C7DB]">
                <span>Master volume (safe-limited)</span>
                <span className="text-sm font-bold text-[#F5F8FF]">
                  {isMuted ? 'MUTE' : `${volumePct}%`}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-[#050914] border border-[#1E2E48] rounded-2xl p-3">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className={`min-w-[48px] min-h-[48px] rounded-xl inline-flex items-center justify-center cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 border-2 border-rose-400 text-rose-200'
                      : 'bg-[#0B172B] border border-[#2A3F63] text-[#F5F8FF]'
                  }`}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-7 h-7 text-rose-300" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-7 h-7 text-[#52C7F5]" strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Master volume"
                  aria-valuetext={isMuted ? 'Muted, 0 percent' : `${volumePct} percent`}
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="earthsonic-vol-slider flex-1 cursor-pointer"
                  style={{
                    background: `linear-gradient(90deg, #52C7F5 0%, #52C7F5 ${effectivePct}%, rgba(148,163,184,0.28) ${effectivePct}%)`
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={closeSoundSheet}
              className="w-full min-h-[48px] rounded-2xl bg-[#52C7F5] text-[#050914] font-display font-bold text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
