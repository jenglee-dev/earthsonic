import React, { useEffect, useMemo, useState } from 'react';
import {
  type CompareResponse,
  computeObservationComparison
} from '@earthsonic/shared';
import type { DataPoint, EarthExperience } from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { DataStatusBadge } from './data/DataStatusBadge';
import { postObservationComparison } from '../services/apiClient';
import {
  computeAcousticParameters,
  sonificationEngine
} from '../audio/sonificationEngine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  ArrowRight,
  GitCompare,
  Play,
  Sparkles,
  Volume2
} from 'lucide-react';

interface HearTheChangeSectionProps {
  experience: EarthExperience;
  series: DataPoint[];
  provenance: ClientProvenance;
  isRatioScale: boolean;
  documentedRange: { min: number; max: number; basis: string };
}

export const HearTheChangeSection: React.FC<HearTheChangeSectionProps> = ({
  experience,
  series,
  provenance,
  isRatioScale,
  documentedRange
}) => {
  const [indexA, setIndexA] = useState<number>(0);
  const [indexB, setIndexB] = useState<number>(Math.max(0, series.length - 1));
  const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'A' | 'TRANSITION' | 'B' | 'DONE'>('IDLE');
  const [serverCompare, setServerCompare] = useState<CompareResponse | null>(null);

  useEffect(() => {
    setIndexA(0);
    setIndexB(Math.max(0, series.length - 1));
  }, [experience.id, series.length]);

  const safeIdxA = Math.min(series.length - 1, Math.max(0, indexA));
  const safeIdxB = Math.min(series.length - 1, Math.max(0, indexB));

  const pointA = series[safeIdxA] || series[0];
  const pointB = series[safeIdxB] || series[series.length - 1];

  // Local shared calculation (always available immediately and used as fallback if /compare fails)
  const localComparison = useMemo(
    () =>
      computeObservationComparison({
        experienceId: experience.id,
        variable: experience.mappings.pitch.variableName,
        unit: experience.mappings.pitch.unit,
        isRatioScale,
        documentedRange,
        observationA: { date: pointA.isoDate, value: pointA.primaryValue },
        observationB: { date: pointB.isoDate, value: pointB.primaryValue }
      }),
    [experience, isRatioScale, documentedRange, pointA, pointB]
  );

  // Query POST /api/v1/compare when observations change; fall back to localComparison if unreachable
  useEffect(() => {
    let cancelled = false;
    postObservationComparison({
      experienceId: experience.id,
      observationA: { date: pointA.isoDate, value: pointA.primaryValue },
      observationB: { date: pointB.isoDate, value: pointB.primaryValue }
    }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setServerCompare(res.data);
      } else {
        setServerCompare(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [experience.id, pointA.isoDate, pointA.primaryValue, pointB.isoDate, pointB.primaryValue]);

  const activeComparison = serverCompare || localComparison;

  const paramsA = useMemo(
    () => computeAcousticParameters(pointA, experience.id, experience.mappings),
    [pointA, experience]
  );
  const paramsB = useMemo(
    () => computeAcousticParameters(pointB, experience.id, experience.mappings),
    [pointB, experience]
  );

  const rawDiff = activeComparison.absoluteDifference ?? Number((pointB.primaryValue - pointA.primaryValue).toFixed(2));
  const freqDiff = Number((paramsB.pitchHz - paramsA.pitchHz).toFixed(1));
  const bpmDiff = paramsB.rhythmBpm - paramsA.rhythmBpm;

  const percentageDiffDisplay = useMemo(() => {
    if (activeComparison.percentageDifferenceValid && activeComparison.percentageDifference !== null) {
      const pct = activeComparison.percentageDifference;
      return `${pct >= 0 ? '+' : ''}${pct}%`;
    }
    const normShift = (((activeComparison.normalizedDifference ?? 0) * 100)).toFixed(1);
    return `${Number(normShift) >= 0 ? '+' : ''}${normShift}% of documented range`;
  }, [activeComparison]);

  const handlePlaySingle = (pt: DataPoint) => {
    sonificationEngine.stopAllNodes();
    setTransitionPhase('IDLE');
    sonificationEngine.playDataStep({
      point: pt,
      experienceId: experience.id,
      mappings: experience.mappings,
      durationSec: 1.1
    });
  };

  const handleHearTheDifference = () => {
    sonificationEngine.playHearTheDifferenceTransition({
      pointA,
      pointB,
      experienceId: experience.id,
      mappings: experience.mappings,
      onPhaseChange: (phase) => setTransitionPhase(phase)
    });
  };

  const chartData = useMemo(
    () =>
      series.map((pt, i) => ({
        dateLabel: pt.dateLabel,
        value: pt.primaryValue,
        role: i === safeIdxA ? 'Observation A' : i === safeIdxB ? 'Observation B' : 'Other'
      })),
    [series, safeIdxA, safeIdxB]
  );

  return (
    <section
      aria-label="Hear the Change Observation Comparison"
      className="rounded-3xl bg-[#101C2D] border border-[#1E2E48] shadow-2xl p-6 flex flex-col gap-6"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular uppercase tracking-widest text-[#52C7F5]">
              <GitCompare className="w-4 h-4" />
              Signature Experience · Direct Observation Comparison
            </span>
            <DataStatusBadge provenance={provenance} compact />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#F5F8FF]">
            HEAR THE CHANGE: {experience.shortTitle}
          </h2>
          <p className="text-sm text-[#9AA9BD] mt-0.5">
            Select two observations from the active dataset to compare their measurements and hear a continuous acoustic transition between them.
          </p>
        </div>

        <button
          type="button"
          onClick={handleHearTheDifference}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#52C7F5] to-[#8A7CFF] hover:opacity-95 text-[#050914] font-display font-bold text-sm tracking-wide flex items-center gap-2.5 shadow-[0_0_30px_rgba(82,199,245,0.4)] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>HEAR THE DIFFERENCE (A → B)</span>
        </button>
      </div>

      {/* Live Visual Transition Progress Bar */}
      {transitionPhase !== 'IDLE' && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-[#050914] border border-[#52C7F5]/50 p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className={transitionPhase === 'A' ? 'text-[#52C7F5] font-bold' : 'text-[#9AA9BD]'}>
              1. Observation A ({pointA.dateLabel}: {paramsA.pitchHz} Hz)
            </span>
            <span className={transitionPhase === 'TRANSITION' ? 'text-[#FFC66D] font-bold animate-pulse motion-reduce:animate-none' : 'text-[#9AA9BD]'}>
              2. Acoustic Glide ({freqDiff >= 0 ? `+${freqDiff}` : freqDiff} Hz Shift)
            </span>
            <span className={transitionPhase === 'B' || transitionPhase === 'DONE' ? 'text-[#57D6A0] font-bold' : 'text-[#9AA9BD]'}>
              3. Observation B ({pointB.dateLabel}: {paramsB.pitchHz} Hz)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#52C7F5] via-[#FFC66D] to-[#57D6A0]"
              style={{
                width:
                  transitionPhase === 'A'
                    ? '33%'
                    : transitionPhase === 'TRANSITION'
                    ? '68%'
                    : '100%'
              }}
            />
          </div>
        </div>
      )}

      {/* 3-Column Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Observation A */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0A1220] border border-[#52C7F5]/40 p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono-tabular font-bold bg-[#52C7F5]/20 text-[#52C7F5]">
                OBSERVATION A (EARLIER / BASELINE)
              </span>
              <span className="text-xs font-mono-tabular text-[#9AA9BD]">
                Step #{safeIdxA + 1}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="select-obs-a" className="text-xs font-mono-tabular text-[#9AA9BD]">
                Select Observation A Date:
              </label>
              <select
                id="select-obs-a"
                value={safeIdxA}
                onChange={(e) => setIndexA(Number(e.target.value))}
                className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono-tabular text-[#F5F8FF]"
              >
                {series.map((pt, i) => (
                  <option key={pt.index} value={i}>
                    {pt.dateLabel} — {pt.primaryValue} {experience.mappings.pitch.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs text-[#9AA9BD]">
                {experience.mappings.pitch.variableName}
              </div>
              <div className="text-3xl font-bold font-mono-tabular text-[#52C7F5] mt-0.5">
                {pointA.primaryValue}{' '}
                <span className="text-sm font-normal text-[#9AA9BD]">
                  {experience.mappings.pitch.unit}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#101C2D] p-3 text-xs font-mono-tabular space-y-1">
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Normalized [0–1]:</span>
                <span className="text-[#F5F8FF]">{activeComparison.observationA.normalized ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Mapped Pitch:</span>
                <span className="text-[#F5F8FF] font-semibold">
                  {paramsA.noteName} ({paramsA.pitchHz} Hz)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Pulse Tempo:</span>
                <span className="text-[#F5F8FF]">{paramsA.rhythmBpm} BPM</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePlaySingle(pointA)}
            className="w-full py-2.5 rounded-xl bg-[#52C7F5]/20 hover:bg-[#52C7F5]/30 border border-[#52C7F5]/50 text-[#52C7F5] font-display font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY OBSERVATION A ({pointA.dateLabel})</span>
          </button>
        </div>

        {/* Center Delta & Scientific Explanation Card */}
        <div className="lg:col-span-4 rounded-2xl bg-[#050914] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#FFC66D] font-semibold flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4" />
              Measured Scientific & Acoustic Shift
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="rounded-xl bg-[#101C2D] border border-slate-800 p-3">
                <div className="text-[11px] font-mono-tabular text-[#9AA9BD]">
                  Value Difference (Δ)
                </div>
                <div className="text-xl font-bold font-mono-tabular text-[#FFC66D] mt-0.5">
                  {rawDiff >= 0 ? `+${rawDiff}` : rawDiff} {experience.mappings.pitch.unit}
                </div>
                <div className="text-[11px] font-mono-tabular text-[#57D6A0] mt-0.5">
                  {percentageDiffDisplay}
                </div>
              </div>

              <div className="rounded-xl bg-[#101C2D] border border-slate-800 p-3">
                <div className="text-[11px] font-mono-tabular text-[#9AA9BD]">
                  Pitch Shift (Δ Hz)
                </div>
                <div className="text-xl font-bold font-mono-tabular text-[#52C7F5] mt-0.5">
                  {freqDiff >= 0 ? `+${freqDiff}` : freqDiff} Hz
                </div>
                <div className="text-[11px] font-mono-tabular text-[#9AA9BD] mt-0.5">
                  {paramsA.noteName} → {paramsB.noteName} ({bpmDiff >= 0 ? `+${bpmDiff}` : bpmDiff} BPM)
                </div>
              </div>
            </div>

            <div className="text-xs text-[#F5F8FF] leading-relaxed bg-[#101C2D]/70 border border-slate-800/90 rounded-xl p-3 space-y-1.5">
              <div>
                <strong className="text-[#52C7F5] block mb-0.5">
                  What This Difference Means:
                </strong>
                Between <strong>{pointA.dateLabel}</strong> ({pointA.primaryValue} {experience.mappings.pitch.unit}) and{' '}
                <strong>{pointB.dateLabel}</strong> ({pointB.primaryValue} {experience.mappings.pitch.unit}),{' '}
                {experience.mappings.pitch.variableName} changed by{' '}
                <strong>
                  {rawDiff >= 0 ? `+${rawDiff}` : rawDiff} {experience.mappings.pitch.unit}
                </strong>
                , shifting the synthesized tone from{' '}
                <strong>
                  {paramsA.noteName} ({paramsA.pitchHz} Hz)
                </strong>{' '}
                to{' '}
                <strong>
                  {paramsB.noteName} ({paramsB.pitchHz} Hz)
                </strong>
                .
              </div>
              <div className="text-[11px] font-mono-tabular text-[#9AA9BD]">
                Scale Note: {activeComparison.percentageDifferenceReason}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleHearTheDifference}
            className="w-full py-3 rounded-xl bg-[#FFC66D] hover:bg-amber-300 text-[#050914] font-display font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>HEAR THE DIFFERENCE (GLIDE A → B)</span>
          </button>
        </div>

        {/* Observation B */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0A1220] border border-[#57D6A0]/40 p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono-tabular font-bold bg-[#57D6A0]/20 text-[#57D6A0]">
                OBSERVATION B (LATER / COMPARISON)
              </span>
              <span className="text-xs font-mono-tabular text-[#9AA9BD]">
                Step #{safeIdxB + 1}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="select-obs-b" className="text-xs font-mono-tabular text-[#9AA9BD]">
                Select Observation B Date:
              </label>
              <select
                id="select-obs-b"
                value={safeIdxB}
                onChange={(e) => setIndexB(Number(e.target.value))}
                className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono-tabular text-[#F5F8FF]"
              >
                {series.map((pt, i) => (
                  <option key={pt.index} value={i}>
                    {pt.dateLabel} — {pt.primaryValue} {experience.mappings.pitch.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs text-[#9AA9BD]">
                {experience.mappings.pitch.variableName}
              </div>
              <div className="text-3xl font-bold font-mono-tabular text-[#57D6A0] mt-0.5">
                {pointB.primaryValue}{' '}
                <span className="text-sm font-normal text-[#9AA9BD]">
                  {experience.mappings.pitch.unit}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#101C2D] p-3 text-xs font-mono-tabular space-y-1">
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Normalized [0–1]:</span>
                <span className="text-[#F5F8FF]">{activeComparison.observationB.normalized ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Mapped Pitch:</span>
                <span className="text-[#F5F8FF] font-semibold">
                  {paramsB.noteName} ({paramsB.pitchHz} Hz)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Pulse Tempo:</span>
                <span className="text-[#F5F8FF]">{paramsB.rhythmBpm} BPM</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePlaySingle(pointB)}
            className="w-full py-2.5 rounded-xl bg-[#57D6A0]/20 hover:bg-[#57D6A0]/30 border border-[#57D6A0]/50 text-[#57D6A0] font-display font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY OBSERVATION B ({pointB.dateLabel})</span>
          </button>
        </div>
      </div>

      {/* Recharts Comparison Chart */}
      <div className="rounded-2xl bg-[#050914] border border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono-tabular uppercase text-[#9AA9BD]">
            Recharts Time-Series Context — Highlighting Observation A ({pointA.dateLabel}) vs. Observation B ({pointB.dateLabel})
          </span>
          <div className="flex items-center gap-4 text-xs font-mono-tabular">
            <span className="flex items-center gap-1.5 text-[#52C7F5]">
              <span className="w-3 h-3 rounded-sm bg-[#52C7F5] inline-block" />
              Observation A ({pointA.dateLabel})
            </span>
            <span className="flex items-center gap-1.5 text-[#57D6A0]">
              <span className="w-3 h-3 rounded-sm bg-[#57D6A0] inline-block" />
              Observation B ({pointB.dateLabel})
            </span>
          </div>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="dateLabel"
                stroke="#9AA9BD"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA9BD"
                fontSize={11}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A1220',
                  borderColor: '#1E2E48',
                  borderRadius: '12px',
                  color: '#F5F8FF',
                  fontSize: '12px'
                }}
              />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      entry.role === 'Observation A'
                        ? '#52C7F5'
                        : entry.role === 'Observation B'
                        ? '#57D6A0'
                        : '#1E293B'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
