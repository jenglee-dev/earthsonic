import React, { useMemo, useRef, useEffect, useState } from 'react';
import type { DataPoint, EarthExperience, SonificationTelemetry } from '../../types/earthsonic';
import { normalizeValue } from '../../audio/sonificationEngine';
import { Subtitles, Volume2, VolumeX } from 'lucide-react';

interface LiveSoundCaptionsBarProps {
  experience: EarthExperience;
  currentPoint: DataPoint;
  telemetry: SonificationTelemetry;
  accentColor: string;
}

/**
 * Real-time plain-language + visual contour captions for Deaf and hard-of-hearing
 * listeners. Translates raw acoustic parameters into intelligible musical descriptions.
 */
export const LiveSoundCaptionsBar: React.FC<LiveSoundCaptionsBarProps> = ({
  experience,
  currentPoint,
  telemetry,
  accentColor
}) => {
  const prevPitchRef = useRef<number>(telemetry.primaryPitchHz);
  const [contourDir, setContourDir] = useState<'rising' | 'falling' | 'steady'>('steady');

  useEffect(() => {
    const diff = telemetry.primaryPitchHz - prevPitchRef.current;
    if (diff > 2.5) setContourDir('rising');
    else if (diff < -2.5) setContourDir('falling');
    else setContourDir('steady');
    prevPitchRef.current = telemetry.primaryPitchHz;
  }, [telemetry.primaryPitchHz]);

  const pSpec = experience.mappings.pitch;
  const rSpec = experience.mappings.rhythm;
  const iSpec = experience.mappings.intensity;

  const pitchPct = Math.round(
    normalizeValue(currentPoint.primaryValue, pSpec.minData, pSpec.maxData) * 100
  );
  const pulsePct = Math.round(
    normalizeValue(currentPoint.secondaryValue, rSpec.minData, rSpec.maxData) * 100
  );
  const intensityPct = Math.round(
    normalizeValue(currentPoint.tertiaryValue, iSpec.minData, iSpec.maxData) * 100
  );

  const captionSummary = useMemo(() => {
    const stateLabel = !telemetry.isPlaying
      ? 'Paused (preview values)'
      : telemetry.isMuted
      ? 'Playing (audio muted)'
      : 'Playing live synthesis';
    const pitchRegister =
      pitchPct >= 75 ? 'high register' : pitchPct >= 40 ? 'mid register' : 'low register';
    const tempoDesc =
      telemetry.primaryRhythmBpm >= 115
        ? 'brisk rhythm'
        : telemetry.primaryRhythmBpm >= 85
        ? 'moderate pulse'
        : 'calm slow pulse';
    const filterDesc =
      intensityPct >= 70
        ? 'bright open overtones'
        : intensityPct >= 35
        ? 'balanced warm harmonics'
        : 'soft muted timbre';
    const contourText =
      contourDir === 'rising'
        ? 'pitch rising'
        : contourDir === 'falling'
        ? 'pitch descending'
        : 'pitch steady';

    return `${stateLabel}: ${telemetry.primaryNoteName} (${telemetry.primaryPitchHz} Hz, ${pitchRegister}, ${contourText}), ${telemetry.primaryRhythmBpm} BPM (${tempoDesc}), ${filterDesc}.`;
  }, [
    telemetry.isPlaying,
    telemetry.isMuted,
    telemetry.primaryNoteName,
    telemetry.primaryPitchHz,
    telemetry.primaryRhythmBpm,
    pitchPct,
    intensityPct,
    contourDir
  ]);

  return (
    <section
      aria-label="Live Sound Captions"
      data-testid="live-sound-captions"
      className="rounded-2xl bg-[#071122]/95 border border-[#52C7F5]/45 p-3.5 sm:p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Subtitles className="w-4 h-4 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
          <h2 className="text-xs sm:text-sm font-mono-tabular uppercase tracking-wider font-bold text-[#F5F8FF]">
            Live Sound Captions · {experience.shortTitle}
          </h2>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono-tabular border border-[#1E2E48] bg-[#050914] text-[#DCE8F8]">
          {telemetry.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[#57D6A0]" aria-hidden="true" />
          )}
          <span>{currentPoint.dateLabel} · {currentPoint.primaryValue} {pSpec.unit}</span>
        </span>
      </div>

      <p className="text-xs sm:text-sm text-[#DCE8F8] leading-relaxed font-medium" aria-live="off">
        {captionSummary}
        {currentPoint.annotation ? ` Milestone: ${currentPoint.annotation}.` : ''}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono-tabular">
        <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-2.5 space-y-1">
          <div className="flex justify-between text-[#A9BAD0]">
            <span>Pitch ({contourDir})</span>
            <span className="text-[#F5F8FF] font-bold">{telemetry.primaryNoteName} · {telemetry.primaryPitchHz} Hz</span>
          </div>
          <div className="h-2 rounded-full bg-[#101C2D] overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${pitchPct}%`, backgroundColor: accentColor }} />
          </div>
        </div>

        <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-2.5 space-y-1">
          <div className="flex justify-between text-[#A9BAD0]">
            <span>Pulse Tempo</span>
            <span className="text-[#F5F8FF] font-bold">{telemetry.primaryRhythmBpm} BPM</span>
          </div>
          <div className="h-2 rounded-full bg-[#101C2D] overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-[#57D6A0]" style={{ width: `${pulsePct}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-2.5 space-y-1">
          <div className="flex justify-between text-[#A9BAD0]">
            <span>Timbre &amp; Filter</span>
            <span className="text-[#F5F8FF] font-bold">{telemetry.primaryIntensityDb} dBFS · {telemetry.primaryFilterHz} Hz</span>
          </div>
          <div className="h-2 rounded-full bg-[#101C2D] overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-[#FFC66D]" style={{ width: `${intensityPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
};
