import React from 'react';
import type {
  DataPoint,
  EarthExperience,
  ObservatorySite,
  SonificationTelemetry
} from '../types/earthsonic';
import type { ApiFailureReason, ClientProvenance } from '../types/dataStatus';
import { DataStatusBadge } from './data/DataStatusBadge';
import { normalizeValue } from '../audio/sonificationEngine';
import {
  AlertTriangle,
  BookOpen,
  Compass,
  ExternalLink,
  Headphones,
  Info,
  Music,
  Radio,
  RefreshCw,
  Sliders,
  Volume2
} from 'lucide-react';

interface SonificationMatrixPanelProps {
  experience: EarthExperience;
  currentPoint: DataPoint;
  telemetry: SonificationTelemetry;
  onAuditionNormalizedStep: (normPitch: number, normRhythm: number, normIntensity: number) => void;
  selectedSite: ObservatorySite;
  onSelectSite: (site: ObservatorySite) => void;
  onRetryBackend: () => void;
  onSwitchToDemoData: () => void;
  isFetchingLive: boolean;
  provenance: ClientProvenance;
  failureReason?: ApiFailureReason | null;
  degradedMessage?: string | null;
}

export const SonificationMatrixPanel: React.FC<SonificationMatrixPanelProps> = ({
  experience,
  currentPoint,
  telemetry,
  onAuditionNormalizedStep,
  selectedSite,
  onSelectSite,
  onRetryBackend,
  onSwitchToDemoData,
  isFetchingLive,
  provenance,
  failureReason,
  degradedMessage
}) => {
  const { pitch, rhythm, intensity } = experience.mappings;

  const normP = Math.round(normalizeValue(currentPoint.primaryValue, pitch.minData, pitch.maxData) * 100);
  const normR = Math.round(normalizeValue(currentPoint.secondaryValue, rhythm.minData, rhythm.maxData) * 100);
  const normI = Math.round(normalizeValue(currentPoint.tertiaryValue, intensity.minData, intensity.maxData) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1: Sonification Mapping Matrix */}
      <div className="rounded-2xl bg-[#0D1526]/90 border border-slate-800/80 shadow-xl p-4 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold font-display text-white">
                Web Audio API Sonification Mapping Matrix
              </h2>
              <p className="text-[11px] text-slate-400">
                Voice: <span className="text-slate-200 font-medium">{experience.synthPresetName}</span>
              </p>
            </div>
          </div>

          <DataStatusBadge provenance={provenance} compact />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {experience.synthDescription}
        </p>

        {/* Mapping 1: Pitch */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" style={{ color: experience.themeColor }} />
              {pitch.label}
            </span>
            <span
              className="text-xs font-mono-tabular font-bold"
              style={{ color: experience.themeColor }}
            >
              {telemetry.primaryNoteName} · {telemetry.primaryPitchHz} Hz
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
            <span>
              NASA Variable: <strong className="text-slate-200">{pitch.variableName}</strong>
            </span>
            <span>
              {currentPoint.primaryValue} {pitch.unit} ({normP}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{ width: `${normP}%`, backgroundColor: experience.themeColor }}
            />
          </div>

          <div className="text-[10px] font-mono-tabular text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80">
            {pitch.formulaDescription}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {pitch.musicalExplanation}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAuditionNormalizedStep(0.05, 0.3, 0.5)}
              className="text-[11px] font-mono-tabular px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3 text-sky-400" />
              Hear Low ({pitch.minData} {pitch.unit})
            </button>
            <button
              type="button"
              onClick={() => onAuditionNormalizedStep(0.96, 0.3, 0.7)}
              className="text-[11px] font-mono-tabular px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3 text-amber-400" />
              Hear High ({pitch.maxData} {pitch.unit})
            </button>
          </div>
        </div>

        {/* Mapping 2: Rhythm */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              {rhythm.label}
            </span>
            <span className="text-xs font-mono-tabular font-bold text-amber-300">
              {telemetry.primaryRhythmBpm} {rhythm.audioUnit}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
            <span>
              NASA Variable: <strong className="text-slate-200">{rhythm.variableName}</strong>
            </span>
            <span>
              {currentPoint.secondaryValue} {rhythm.unit} ({normR}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${normR}%` }}
            />
          </div>

          <div className="text-[10px] font-mono-tabular text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80">
            {rhythm.formulaDescription}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {rhythm.musicalExplanation}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAuditionNormalizedStep(0.5, 0.08, 0.6)}
              className="text-[11px] font-mono-tabular px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3 text-sky-400" />
              Hear Slow Pulse ({rhythm.minAudio} BPM)
            </button>
            <button
              type="button"
              onClick={() => onAuditionNormalizedStep(0.5, 0.96, 0.75)}
              className="text-[11px] font-mono-tabular px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3 text-amber-400" />
              Hear Rapid Pulse ({rhythm.maxAudio} BPM)
            </button>
          </div>
        </div>

        {/* Mapping 3: Sound Intensity & Harmonic Filter */}
        <div className="rounded-xl bg-[#060A12]/80 border border-slate-800/90 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              {intensity.label}
            </span>
            <span className="text-xs font-mono-tabular font-bold text-emerald-300">
              {telemetry.primaryIntensityDb} dB · {telemetry.primaryFilterHz} Hz
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
            <span>
              NASA Variable: <strong className="text-slate-200">{intensity.variableName}</strong>
            </span>
            <span>
              {currentPoint.tertiaryValue} {intensity.unit} ({normI}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${normI}%` }}
            />
          </div>

          <div className="text-[10px] font-mono-tabular text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80">
            {intensity.formulaDescription}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {intensity.musicalExplanation}
          </p>
        </div>
      </div>

      {/* Card 2: Educational Guide & Scientific Info Panel */}
      <div className="rounded-2xl bg-[#0D1526]/90 border border-slate-800/80 shadow-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold font-display text-white">
              Scientific Info & What You Are Hearing
            </h2>
          </div>
          <DataStatusBadge provenance={provenance} compact />
        </div>

        {isFetchingLive ? (
          <div
            role="status"
            aria-label="Loading scientific overview"
            className="space-y-3 py-1 animate-pulse motion-reduce:animate-none"
          >
            <div className="h-3 w-full rounded bg-slate-800/80" />
            <div className="h-3 w-5/6 rounded bg-slate-800/80" />
            <div className="h-14 w-full rounded-xl bg-slate-800/60" />
            <div className="h-14 w-full rounded-xl bg-slate-800/60" />
            <div className="h-16 w-full rounded-xl bg-slate-800/60" />
            <span className="sr-only">Loading scientific overview and attribution...</span>
          </div>
        ) : (
          <>
        <p className="text-xs text-slate-300 leading-relaxed">
          {experience.scientificOverview}
        </p>

        <ul className="space-y-2">
          {experience.whatYouAreHearing.map((bullet, idx) => (
            <li
              key={idx}
              className="text-xs text-slate-200 bg-[#060A12]/70 border border-slate-800/80 rounded-xl p-2.5 flex items-start gap-2.5"
            >
              <span
                className="w-5 h-5 rounded-full text-[11px] font-mono-tabular font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${experience.themeColor}22`,
                  color: experience.themeColor
                }}
              >
                {idx + 1}
              </span>
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-3 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-mono-tabular uppercase text-slate-300 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Official NASA Data Attribution
            </span>
            {provenance.sourceUrl && (
              <a
                href={provenance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                Dataset Source
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="leading-relaxed text-slate-300">{experience.nasaCitation}</p>
          <p className="text-slate-400">
            <strong>Instruments:</strong> {experience.instrumentSummary}
          </p>
        </div>
          </>
        )}
      </div>

      {/* Card 3: Backend Sentinel Query & Fallback Controls */}
      <div className="rounded-2xl bg-[#0D1526]/90 border border-slate-800/80 shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold font-display text-white">
                EarthSonic API Sentinel & Fallback Controls
              </h2>
              <p className="text-[11px] text-slate-400">
                Query validated NASA telemetry via /api/v1/experiences/{experience.id}/series
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sentinel-site-select"
            className="text-[11px] font-mono-tabular uppercase text-slate-400"
          >
            Select Earth Observatory Coordinate Site:
          </label>
          <select
            id="sentinel-site-select"
            value={selectedSite.id}
            onChange={(e) => {
              const found = experience.observatorySites.find((s) => s.id === e.target.value);
              if (found) onSelectSite(found);
            }}
            className="bg-[#060A12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono-tabular"
          >
            {experience.observatorySites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.region}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">{selectedSite.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isFetchingLive}
            onClick={onRetryBackend}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLive ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            {isFetchingLive ? 'Syncing EarthSonic API...' : 'Refresh NASA Series from Server'}
          </button>

          <button
            type="button"
            onClick={onSwitchToDemoData}
            className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-mono-tabular transition-colors cursor-pointer"
            title="Switch to bundled local demonstration data (Section 7)"
          >
            Use demonstration data
          </button>
        </div>

        {failureReason && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-100 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                Data Service Unavailable
              </span>
              <span className="font-mono-tabular text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200">
                Reason: {failureReason}
              </span>
            </div>
            <p className="text-[11px] text-rose-100/90 leading-relaxed">
              {degradedMessage ||
                'Could not reach the EarthSonic data service. You can retry the request or switch to bundled demonstration data.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={onRetryBackend}
                className="px-2.5 py-1 rounded-lg bg-rose-400 hover:bg-rose-300 text-slate-950 font-mono-tabular font-bold text-[11px] cursor-pointer"
              >
                Retry
              </button>
              {provenance.dataStatus !== 'LOCAL_DEMONSTRATION' && (
                <button
                  type="button"
                  onClick={onSwitchToDemoData}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-200 border border-rose-500/40 font-mono-tabular text-[11px] cursor-pointer"
                >
                  Use demonstration data
                </button>
              )}
            </div>
          </div>
        )}

        {provenance.dataStatus === 'LOCAL_DEMONSTRATION' && !failureReason && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/50 p-3 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">
                Local Demonstration Data Active — Simulated Values
              </div>
              <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                {degradedMessage ||
                  'Showing bundled illustrative demonstration values. Click "Refresh NASA Series from Server" to reload validated NASA data.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
