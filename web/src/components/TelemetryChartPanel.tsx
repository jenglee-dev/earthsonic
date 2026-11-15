import React, { useState } from 'react';
import type {
  DataPoint,
  EarthExperience,
  ExperienceId,
  SonificationTelemetry
} from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { DataStatusBadge } from './data/DataStatusBadge';
import { normalizeValue } from '../audio/sonificationEngine';
import {
  Activity,
  GitCompare,
  Sparkles,
  Volume2,
  Sliders,
  Table
} from 'lucide-react';
import { useExperienceAccentColor } from '../hooks/useAccessibilityRuntime';
import { useAccessibilityStore } from '../store/useAccessibilityStore';

export type ComparisonModeType = 'historical_baseline' | 'cross_domain';

interface TelemetryChartPanelProps {
  experience: EarthExperience;
  series: DataPoint[];
  stepIndex: number;
  onSelectStep: (idx: number) => void;
  telemetry: SonificationTelemetry;
  provenance: ClientProvenance;
  isLoading?: boolean;
  // Comparison mode props
  comparisonActive: boolean;
  onToggleComparison: () => void;
  comparisonType: ComparisonModeType;
  onChangeComparisonType: (t: ComparisonModeType) => void;
  secondaryExperience: EarthExperience;
  onChangeSecondaryExperienceId: (id: ExperienceId) => void;
  comparisonSeries: DataPoint[];
  stereoBalance: number;
  onChangeStereoBalance: (val: number) => void;
}

export const TelemetryChartPanel: React.FC<TelemetryChartPanelProps> = ({
  experience,
  series,
  stepIndex,
  onSelectStep,
  telemetry,
  provenance,
  isLoading = false,
  comparisonActive,
  onToggleComparison,
  comparisonType,
  onChangeComparisonType,
  secondaryExperience,
  onChangeSecondaryExperienceId,
  comparisonSeries,
  stereoBalance,
  onChangeStereoBalance
}) => {
  const [showSecondaryVariables, setShowSecondaryVariables] = useState(true);
  const [showAsTable, setShowAsTable] = useState(false);
  const accentColor = useExperienceAccentColor(experience.id);
  const palette = useAccessibilityStore((s) => s.prefs.palette);

  const currentPoint = series[stepIndex] || series[0];
  const compPoint = comparisonSeries[stepIndex] || comparisonSeries[0];

  const width = 760;
  const height = 220;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const pSpec = experience.mappings.pitch;
  const rSpec = experience.mappings.rhythm;
  const iSpec = experience.mappings.intensity;

  // For historical baseline comparison, normalize using a unified range so the vertical gap is visually unmistakable
  const minPrimary = comparisonActive && comparisonType === 'historical_baseline'
    ? Math.min(pSpec.minData, ...comparisonSeries.map(d => d.primaryValue))
    : pSpec.minData;
  const maxPrimary = pSpec.maxData;

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, series.length - 1)) * plotW;

  const getPrimaryY = (val: number) =>
    padTop + (1 - normalizeValue(val, minPrimary, maxPrimary)) * plotH;

  const getSecondaryY = (val: number) =>
    padTop + (1 - normalizeValue(val, rSpec.minData, rSpec.maxData)) * plotH;

  const getTertiaryY = (val: number) =>
    padTop + (1 - normalizeValue(val, iSpec.minData, iSpec.maxData)) * plotH;

  const getCompY = (point: DataPoint) => {
    if (comparisonType === 'historical_baseline') {
      return padTop + (1 - normalizeValue(point.primaryValue, minPrimary, maxPrimary)) * plotH;
    }
    const secSpec = secondaryExperience.mappings.pitch;
    return padTop + (1 - normalizeValue(point.primaryValue, secSpec.minData, secSpec.maxData)) * plotH;
  };

  // Build SVG path strings
  const primaryPath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getPrimaryY(pt.primaryValue).toFixed(1)}`)
    .join(' ');

  const primaryAreaPath = `${primaryPath} L ${getX(series.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${padLeft} ${(padTop + plotH).toFixed(1)} Z`;

  const rhythmPath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getSecondaryY(pt.secondaryValue).toFixed(1)}`)
    .join(' ');

  const intensityPath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getTertiaryY(pt.tertiaryValue).toFixed(1)}`)
    .join(' ');

  const comparisonPath = comparisonSeries
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getCompY(pt).toFixed(1)}`)
    .join(' ');

  const activeX = getX(stepIndex);
  const activeY = getPrimaryY(currentPoint.primaryValue);

  const compColor =
    comparisonType === 'historical_baseline'
      ? '#38BDF8'
      : secondaryExperience.themeColor;

  return (
    <div className="rounded-2xl bg-[#0D1526]/90 border border-slate-800/80 shadow-xl p-4 flex flex-col gap-3">
      {/* Header & Comparison Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold font-display text-white tracking-tight">
              Synchronized NASA Telemetry & Sonification Waveform
            </h2>
            <p className="text-xs text-slate-400">
              Click any data node to scrub the timeline and audition its real-time synthesized chord
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataStatusBadge provenance={provenance} compact />
          <button
            type="button"
            aria-pressed={showAsTable}
            onClick={() => setShowAsTable((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular border bg-slate-900/60 text-slate-300 border-slate-700 hover:text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <Table className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showAsTable ? 'Chart' : 'View as table'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSecondaryVariables((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular border transition-colors cursor-pointer ${
              showSecondaryVariables
                ? 'bg-slate-800 text-slate-200 border-slate-600'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {showSecondaryVariables ? 'Hide Rhythm/Intensity Traces' : 'Show All 3 Traces'}
          </button>

          <button
            type="button"
            onClick={onToggleComparison}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              comparisonActive
                ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-sm'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-sky-500/50'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Comparison Mode: {comparisonActive ? 'ACTIVE (DUAL AUDIO)' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Comparison Mode Configuration Toolbar when active (Requirement #6) */}
      {comparisonActive && (
        <div className="rounded-xl bg-[#060A12]/90 border border-sky-500/30 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono-tabular uppercase tracking-wider text-sky-400 font-semibold">
              Dual-Dataset Acoustic Split:
            </span>
            <button
              type="button"
              onClick={() => onChangeComparisonType('historical_baseline')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                comparisonType === 'historical_baseline'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Historical Baseline vs. Modern Record
            </button>
            <button
              type="button"
              onClick={() => onChangeComparisonType('cross_domain')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                comparisonType === 'cross_domain'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cross-Experience Earth Comparison
            </button>

            {comparisonType === 'cross_domain' && (
              <select
                aria-label="Select second Earth experience to compare"
                value={secondaryExperience.id}
                onChange={(e) => onChangeSecondaryExperienceId(e.target.value as ExperienceId)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-md px-2.5 py-1 font-mono-tabular"
              >
                {(['temperature', 'ocean', 'atmosphere'] as ExperienceId[])
                  .filter((id) => id !== experience.id)
                  .map((id) => (
                    <option key={id} value={id}>
                      Compare with: {id === 'temperature' ? 'Surface Temperature' : id === 'ocean' ? 'Ocean Conditions' : 'Atmosphere & CO2'}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Stereo Crossfader Balance */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-mono-tabular text-slate-300">
              Ch A (Left)
            </span>
            <input
              type="range"
              aria-label="Comparison stereo balance"
              min={-0.8}
              max={0.8}
              step={0.1}
              value={stereoBalance}
              onChange={(e) => onChangeStereoBalance(parseFloat(e.target.value))}
              className="w-24 accent-sky-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono-tabular text-sky-300">
              Ch B (Right)
            </span>
          </div>
        </div>
      )}

      {/* Live Values Readout Strip Driving the Sound */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Pitch Variable Card */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 px-3 py-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: experience.themeColor }}
              />
              <span className="text-[11px] font-mono-tabular uppercase text-slate-400">
                1. Pitch Driver ({pSpec.variableCode})
              </span>
            </div>
            <div className="text-base font-bold font-mono-tabular text-white mt-0.5">
              {currentPoint.primaryValue} <span className="text-xs font-normal text-slate-400">{pSpec.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono-tabular font-semibold" style={{ color: experience.themeColor }}>
              → {telemetry.primaryNoteName} ({telemetry.primaryPitchHz} Hz)
            </div>
            {comparisonActive && (
              <div className="text-[11px] font-mono-tabular text-sky-300">
                Ch B: {compPoint.primaryValue} → {telemetry.secondaryNoteName} ({telemetry.secondaryPitchHz} Hz)
              </div>
            )}
          </div>
        </div>

        {/* Rhythm Variable Card */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 px-3 py-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-400" />
              <span className="text-[11px] font-mono-tabular uppercase text-slate-400">
                2. Rhythm Driver ({rSpec.variableCode})
              </span>
            </div>
            <div className="text-base font-bold font-mono-tabular text-white mt-0.5">
              {currentPoint.secondaryValue} <span className="text-xs font-normal text-slate-400">{rSpec.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono-tabular font-semibold text-amber-300">
              → {telemetry.primaryRhythmBpm} BPM Pulse
            </div>
            {comparisonActive && (
              <div className="text-[11px] font-mono-tabular text-sky-300">
                Ch B: {telemetry.secondaryRhythmBpm} BPM
              </div>
            )}
          </div>
        </div>

        {/* Intensity Variable Card */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 px-3 py-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-400" />
              <span className="text-[11px] font-mono-tabular uppercase text-slate-400">
                3. Intensity Driver ({iSpec.variableCode})
              </span>
            </div>
            <div className="text-base font-bold font-mono-tabular text-white mt-0.5">
              {currentPoint.tertiaryValue} <span className="text-xs font-normal text-slate-400">{iSpec.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono-tabular font-semibold text-emerald-300">
              → {telemetry.primaryIntensityDb} dB · {telemetry.primaryFilterHz} Hz LPF
            </div>
            {comparisonActive && (
              <div className="text-[11px] font-mono-tabular text-sky-300">
                Ch B: {telemetry.secondaryIntensityDb} dB
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive SVG Telemetry Chart */}
      <div className="relative w-full overflow-x-auto bg-[#060A12]/90 rounded-xl border border-slate-800/90 p-2">
        {isLoading ? (
          <div
            role="status"
            aria-label="Loading scientific telemetry series"
            className="w-full h-[220px] flex flex-col justify-between p-4 animate-pulse motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-48 rounded bg-slate-800/80" />
              <div className="h-3 w-24 rounded bg-slate-800/80" />
            </div>
            <div className="flex items-end gap-2 h-32 px-2">
              {[38, 45, 52, 41, 60, 55, 68, 74, 66, 82, 78, 90].map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t bg-slate-800/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-12 rounded bg-slate-800/80" />
              <div className="h-2.5 w-12 rounded bg-slate-800/80" />
              <div className="h-2.5 w-12 rounded bg-slate-800/80" />
              <div className="h-2.5 w-12 rounded bg-slate-800/80" />
            </div>
            <span className="sr-only">Loading validated NASA telemetry series...</span>
          </div>
        ) : showAsTable ? (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-[#050914]">
            <table className="w-full text-left text-xs font-mono-tabular">
              <thead className="bg-[#0A1220] text-slate-300 sticky top-0">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">{pSpec.variableName} ({pSpec.unit})</th>
                  <th className="p-2">Step</th>
                </tr>
              </thead>
              <tbody>
                {series.map((pt, idx) => (
                  <tr key={pt.index} className="border-t border-slate-800/70">
                    <td className="p-2 text-slate-100">{pt.dateLabel}</td>
                    <td className="p-2" style={{ color: accentColor }}>{pt.primaryValue}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => onSelectStep(idx)}
                        className="text-sky-400 hover:underline cursor-pointer"
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
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[540px] select-none"
          role="img"
          aria-label={`Interactive sonification telemetry chart for ${experience.title}`}
        >
          <defs>
            <linearGradient id={`grad-${experience.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={experience.themeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={experience.themeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
            const y = padTop + t * plotH;
            const valLabel = (maxPrimary - t * (maxPrimary - minPrimary)).toFixed(2);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeDasharray={t === 0.5 ? 'none' : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[9px] font-mono-tabular"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Primary Variable Shaded Area */}
          <path d={primaryAreaPath} fill={`url(#grad-${experience.id})`} />

          {/* Secondary & Tertiary Variable Traces (Rhythm & Intensity) */}
          {showSecondaryVariables && (
            <>
              <path
                d={rhythmPath}
                fill="none"
                stroke="#FBBF24"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.65}
              />
              <path
                d={intensityPath}
                fill="none"
                stroke="#34D399"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                opacity={0.65}
              />
            </>
          )}

          {/* Comparison Dataset Trace (Channel B) */}
          {comparisonActive && (
            <path
              d={comparisonPath}
              fill="none"
              stroke={compColor}
              strokeWidth={2.2}
              strokeDasharray="6 3"
            />
          )}

          {/* Primary Dataset Trace (Channel A) */}
          <path
            d={primaryPath}
            fill="none"
            stroke={accentColor}
            strokeWidth={palette === 'colorblind' ? 3 : 2.75}
            strokeDasharray={palette === 'colorblind' ? '7 3' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Playhead Vertical Line */}
          <line
            x1={activeX}
            y1={padTop - 8}
            x2={activeX}
            y2={padTop + plotH}
            stroke="#F8FAFC"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />

          {/* Interactive Data Nodes */}
          {series.map((pt, i) => {
            const cx = getX(i);
            const cy = getPrimaryY(pt.primaryValue);
            const isCurrent = i === stepIndex;
            const hasAnnotation = Boolean(pt.annotation);

            return (
              <g
                key={pt.index}
                className="cursor-pointer group"
                onClick={() => onSelectStep(i)}
              >
                {/* Invisible wider hit target for effortless clicking/scrubbing */}
                <rect
                  x={cx - plotW / series.length / 2}
                  y={padTop}
                  width={plotW / series.length}
                  height={plotH}
                  fill="transparent"
                />

                {/* Comparison node if active */}
                {comparisonActive && comparisonSeries[i] && (
                  <circle
                    cx={cx}
                    cy={getCompY(comparisonSeries[i])}
                    r={isCurrent ? 5 : 3}
                    fill={compColor}
                    stroke="#060A12"
                    strokeWidth={1.5}
                  />
                )}

                {/* Primary node */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? 6.5 : hasAnnotation ? 4.5 : 3.2}
                  fill={isCurrent ? '#FFFFFF' : experience.themeColor}
                  stroke={isCurrent ? experience.themeColor : '#060A12'}
                  strokeWidth={isCurrent ? 3 : 1.5}
                />

                {/* X-Axis Date Labels (every 2nd or 3rd step) */}
                {(i % 2 === 0 || i === series.length - 1) && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className={`text-[9px] font-mono-tabular ${
                      isCurrent ? 'fill-white font-bold' : 'fill-slate-400'
                    }`}
                  >
                    {pt.dateLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Highlight Ring on Current Step */}
          <circle
            cx={activeX}
            cy={activeY}
            r={11}
            fill="none"
            stroke={experience.themeColor}
            strokeWidth={1.5}
            opacity={0.6}
          />
        </svg>
        )}

        {/* Legend Footer inside Chart Container */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 border-t border-slate-800/70 text-[11px] font-mono-tabular text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: experience.themeColor }} />
              Ch A Primary: {pSpec.variableName} ({pSpec.unit})
            </span>
            {showSecondaryVariables && (
              <>
                <span className="inline-flex items-center gap-1.5 text-amber-300/90">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                  Rhythm: {rSpec.variableName}
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                  Intensity: {iSpec.variableName}
                </span>
              </>
            )}
            {comparisonActive && (
              <span className="inline-flex items-center gap-1.5 text-sky-300 font-semibold">
                <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: compColor }} />
                Ch B Comparison: {comparisonType === 'historical_baseline' ? experience.comparisonBaselineTitle : secondaryExperience.title}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-sky-400">
            <Volume2 className="w-3 h-3" />
            Click any point to audition sound
          </span>
        </div>
      </div>

      {/* Milestone Event Quick-Jump Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-mono-tabular text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-sky-400" />
          Key NASA Events:
        </span>
        {series
          .filter((pt) => Boolean(pt.annotation))
          .slice(0, 5)
          .map((pt) => (
            <button
              key={pt.index}
              type="button"
              onClick={() => onSelectStep(pt.index)}
              className={`text-[11px] font-mono-tabular px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                stepIndex === pt.index
                  ? 'bg-sky-500/20 border-sky-400 text-white font-semibold'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {pt.dateLabel}: {pt.annotation?.split('(')[0].trim()}
            </button>
          ))}
      </div>
    </div>
  );
};
