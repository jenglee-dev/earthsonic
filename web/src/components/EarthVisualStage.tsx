import React, { useEffect, useRef, useState } from 'react';
import type {
  DataPoint,
  EarthExperience,
  NasaVisualFrame,
  SonificationTelemetry
} from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { DataStatusBadge } from './data/DataStatusBadge';
import { sonificationEngine } from '../audio/sonificationEngine';
import { isEffectiveReducedMotionActive } from '../store/useAccessibilityStore';
import { useEffectiveReducedMotion, useExperienceAccentColor } from '../hooks/useAccessibilityRuntime';
import {
  ExternalLink,
  Eye,
  Layers,
  Satellite,
  Sparkles,
  Volume2
} from 'lucide-react';

interface EarthVisualStageProps {
  experience: EarthExperience;
  currentPoint: DataPoint;
  stepIndex: number;
  totalSteps: number;
  telemetry: SonificationTelemetry;
  provenance: ClientProvenance;
  activeFrameIndex: number;
  onSelectFrame: (idx: number) => void;
  autoSyncFrame: boolean;
  onToggleAutoSyncFrame: () => void;
}

export const EarthVisualStage: React.FC<EarthVisualStageProps> = ({
  experience,
  currentPoint,
  stepIndex,
  totalSteps,
  telemetry,
  provenance,
  activeFrameIndex,
  onSelectFrame,
  autoSyncFrame,
  onToggleAutoSyncFrame
}) => {
  const [imgLoading, setImgLoading] = useState(true);
  const [useFallbackImg, setUseFallbackImg] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useEffectiveReducedMotion();
  const accentColor = useExperienceAccentColor(experience.id);

  const activeFrame: NasaVisualFrame =
    experience.visualFrames[activeFrameIndex] || experience.visualFrames[0];

  useEffect(() => {
    setImgLoading(true);
    setUseFallbackImg(false);
  }, [activeFrame.id, experience.id]);

  // Real-time Web Audio API FFT spectrum & waveform visualizer loop
  useEffect(() => {
    let animId = 0;
    const freqArray = new Uint8Array(64);
    const waveArray = new Uint8Array(64);

    const renderSpectrum = () => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (telemetry.isPlaying && !reduced) {
            sonificationEngine.getFrequencyData(freqArray);
            sonificationEngine.getWaveformData(waveArray);
          } else {
            freqArray.fill(0);
            waveArray.fill(128);
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barCount = 28;
          const barWidth = canvas.width / barCount - 1.5;

          for (let i = 0; i < barCount; i++) {
            const raw = freqArray[i] || 0;
            const idleWave =
              telemetry.isPlaying || reduced
                ? reduced
                  ? 4
                  : 0
                : Math.sin(Date.now() * 0.003 + i * 0.35) * 3 + 4;
            const barHeight = Math.max(3, (raw / 255) * (canvas.height - 6) + idleWave);
            const x = i * (barWidth + 1.5);
            const y = canvas.height - barHeight;

            ctx.fillStyle = accentColor;
            ctx.globalAlpha = telemetry.isPlaying ? 0.85 : 0.32;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 1.5);
            ctx.fill();
          }

          ctx.beginPath();
          ctx.strokeStyle = '#F5F8FF';
          ctx.lineWidth = 1.3;
          ctx.globalAlpha = telemetry.isPlaying ? 0.95 : 0.4;
          for (let i = 0; i < waveArray.length; i++) {
            const wx = (i / (waveArray.length - 1)) * canvas.width;
            const wy = ((waveArray[i] || 128) / 255) * canvas.height;
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.stroke();
        }
      }
      if (telemetry.isPlaying || !reduced) {
        animId = requestAnimationFrame(renderSpectrum);
      }
    };

    animId = requestAnimationFrame(renderSpectrum);
    return () => cancelAnimationFrame(animId);
  }, [accentColor, telemetry.isPlaying, reducedMotion]);

  const currentImageSrc = useFallbackImg ? activeFrame.fallbackImageUrl : activeFrame.imageUrl;

  return (
    <div className="relative rounded-2xl bg-[#0D1526]/90 border border-slate-800/80 shadow-2xl overflow-visible flex flex-col">
      {/* Top Telemetry Header Bar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-[#060A12]/60 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-tabular font-semibold uppercase tracking-wider border"
            style={{
              backgroundColor: `${experience.themeColor}18`,
              borderColor: `${experience.themeColor}50`,
              color: experience.themeColor
            }}
          >
            <Satellite className="w-3.5 h-3.5" />
            {experience.badgeText}
          </span>

          {/* Reusable Accessible DataStatusBadge with Provenance Popover */}
          <DataStatusBadge provenance={provenance} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleAutoSyncFrame}
            className={`text-xs font-mono-tabular px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              autoSyncFrame
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically advance NASA satellite frame as timeline progresses"
          >
            <Layers className="w-3.5 h-3.5" />
            Frame Sync: {autoSyncFrame ? 'AUTO' : 'MANUAL'}
          </button>

          <a
            href={activeFrame.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono-tabular text-slate-300 hover:text-sky-400 inline-flex items-center gap-1 transition-colors"
          >
            NASA Worldview / Source
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Visual Frame Viewport */}
      <div className="relative aspect-[16/9] min-h-[260px] max-h-[420px] w-full bg-[#050811] overflow-hidden flex items-center justify-center">
        {imgLoading && (
          <div className="absolute inset-0 bg-slate-900/80 animate-pulse motion-reduce:animate-none flex flex-col items-center justify-center gap-2 z-10">
            <Satellite className="w-7 h-7 text-sky-400 animate-spin motion-reduce:animate-none" />
            <span className="text-xs font-mono-tabular text-slate-300">
              Loading authentic NASA Earth Information Center frame ({activeFrame.gibsLayer})...
            </span>
          </div>
        )}

        <img
          src={currentImageSrc}
          alt={activeFrame.title}
          loading="lazy"
          onLoad={() => setImgLoading(false)}
          onError={() => {
            if (!useFallbackImg) {
              setUseFallbackImg(true);
            } else {
              setImgLoading(false);
            }
          }}
          className="w-full h-full object-cover transition-opacity duration-500"
        />

        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 55%, rgba(6, 10, 18, 0.85) 100%)`,
            boxShadow: telemetry.isPlaying
              ? `inset 0 0 50px ${experience.themeColor}33`
              : 'none'
          }}
        />

        {/* Top-Left Live Step & Milestone HUD Overlay */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
          <div className="bg-[#060A12]/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg">
            <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-slate-400">
              Active Observation Step [{stepIndex + 1}/{totalSteps}]
            </div>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-xl font-bold font-display text-white">
                {currentPoint.dateLabel}
              </span>
              <span
                className="text-sm font-mono-tabular font-semibold"
                style={{ color: experience.themeColor }}
              >
                {currentPoint.primaryValue} {experience.mappings.pitch.unit}
              </span>
            </div>
          </div>

          {/* Real-time Audio Output Readout + FFT Spectrum & Waveform Canvas */}
          <div className="bg-[#060A12]/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3">
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-sky-400" />
                Acoustic Voice
              </div>
              <div className="text-xs font-mono-tabular font-semibold text-slate-100 mt-0.5">
                {telemetry.primaryNoteName} ({telemetry.primaryPitchHz} Hz) · {telemetry.primaryRhythmBpm} BPM · {telemetry.primaryIntensityDb} dB
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={112}
              height={32}
              className="rounded bg-slate-950/70 border border-slate-800"
              aria-label="Real-time audio frequency spectrum and waveform"
            />
          </div>
        </div>

        {/* Scientific Milestone Callout Banner when present on current step */}
        {currentPoint.annotation && (
          <div className="absolute bottom-14 left-3 right-3 pointer-events-none flex justify-center">
            <div className="bg-[#060A12]/90 backdrop-blur-md border border-sky-400/50 text-sky-100 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{currentPoint.annotation}</span>
            </div>
          </div>
        )}

        {/* Bottom Overlay: Color Scale Bar & Frame Date */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#060A12] via-[#060A12]/90 to-transparent px-4 pt-6 pb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <div className="text-xs font-mono-tabular text-sky-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Frame: {activeFrame.dateLabel} — {activeFrame.missionInstrument}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
              {activeFrame.caption}
            </p>
          </div>

          <div className="w-56 shrink-0 bg-[#060A12]/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <div className="text-[10px] font-mono-tabular text-slate-400 truncate">
              {activeFrame.colorScaleLabel}
            </div>
            <div
              className="h-2 w-full rounded-sm my-1 border border-white/10"
              style={{ background: activeFrame.colorScaleGradient }}
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-300">
              <span>{activeFrame.colorScaleMin}</span>
              <span>{activeFrame.colorScaleMax}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe Selector Strip */}
      <div className="p-3 bg-[#090F1D] border-t border-slate-800/80 rounded-b-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Authentic NASA Earth Information Center / GIBS Visual Frames ({experience.visualFrames.length})
          </span>
          <span className="text-[11px] font-mono-tabular text-slate-400 truncate max-w-md">
            Provider: {provenance.provider}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {experience.visualFrames.map((frame, idx) => {
            const isSelected = idx === activeFrameIndex;
            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => onSelectFrame(idx)}
                className={`text-left p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-sky-400 shadow-md'
                    : 'bg-[#060A12]/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono-tabular font-semibold text-sky-400 truncate">
                    FRAME 0{idx + 1}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 motion-reduce:animate-none animate-ping" />
                  )}
                </div>
                <div className="text-xs font-medium text-slate-100 truncate mt-0.5">
                  {frame.dateLabel.split('—')[0].trim()}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {frame.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
