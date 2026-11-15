import React, { useEffect, useMemo, useRef, useState } from 'react';
import { computeObservationComparison } from '@earthsonic/shared';
import type { DataPoint, EarthExperience, ExperienceId } from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import { computeAcousticParameters, sonificationEngine } from '../audio/sonificationEngine';
import { isEffectiveReducedMotionActive, useAccessibilityStore } from '../store/useAccessibilityStore';
import { useEffectiveReducedMotion } from '../hooks/useAccessibilityRuntime';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { speechService } from '../services/speechService';
import {
  buildHearTheChangeAnnouncement,
  buildSoundDescription
} from '../services/soundDescriptionBuilder';
import { estimateSpeechWaitMs } from '../services/guidedListeningController';
import { postObservationComparison } from '../services/apiClient';
import { DataStatusBadge } from '../components/data/DataStatusBadge';
import { Chip, GlassPanel, SectionHeader, Slider, StatTile } from '../components/ui/Primitives';
import { ArrowLeftRight, Clock, Droplets, Flame, GitCompare, Play, Sparkles, Table, Volume2, Wind } from 'lucide-react';

interface HearTheChangePageProps {
  experience: EarthExperience;
  series: DataPoint[];
  provenance: ClientProvenance;
  isRatioScale: boolean;
  documentedRange: { min: number; max: number; basis: string };
}

export const HearTheChangePage: React.FC<HearTheChangePageProps> = ({
  experience,
  series,
  provenance,
  isRatioScale,
  documentedRange
}) => {
  const activeExperienceId = useEarthSonicStore((s) => s.activeExperienceId);
  const setExperienceId = useEarthSonicStore((s) => s.setExperienceId);

  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Math.max(0, series.length - 1));
  const [phase, setPhase] = useState<'IDLE' | 'A' | 'TRANSITION' | 'B' | 'DONE'>('IDLE');
  const [serverCompare, setServerCompare] = useState<ReturnType<typeof computeObservationComparison> | null>(null);
  const [showCompareTable, setShowCompareTable] = useState(false);
  const burstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useEffectiveReducedMotion();

  useEffect(() => {
    setIndexA(0);
    setIndexB(Math.max(0, series.length - 1));
    setPhase('IDLE');
  }, [experience.id, series.length]);

  const safeA = Math.min(series.length - 1, Math.max(0, indexA));
  const safeB = Math.min(series.length - 1, Math.max(0, indexB));
  const pointA = series[safeA] || series[0];
  const pointB = series[safeB] || series[series.length - 1];

  const localComp = useMemo(
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

  useEffect(() => {
    let cancelled = false;
    postObservationComparison({
      experienceId: experience.id,
      observationA: { date: pointA.isoDate, value: pointA.primaryValue },
      observationB: { date: pointB.isoDate, value: pointB.primaryValue }
    }).then((res) => {
      if (!cancelled) setServerCompare(res.ok ? res.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [experience.id, pointA.isoDate, pointA.primaryValue, pointB.isoDate, pointB.primaryValue]);

  const activeComp = serverCompare || localComp;
  const paramsA = useMemo(() => computeAcousticParameters(pointA, experience.id, experience.mappings), [pointA, experience]);
  const paramsB = useMemo(() => computeAcousticParameters(pointB, experience.id, experience.mappings), [pointB, experience]);
  const rawDiff = activeComp.absoluteDifference ?? Number((pointB.primaryValue - pointA.primaryValue).toFixed(2));
  const freqDiff = Number((paramsB.pitchHz - paramsA.pitchHz).toFixed(1));

  // Slide 09 Visual Canvas: Dual sinuous strands converging into central concentric shockwave AnalyserNode burst
  useEffect(() => {
    const canvas = burstCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const freqData = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    let raf = 0;

    const draw = (now: number) => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 220;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const active = phase !== 'IDLE' && phase !== 'DONE';
      if (active && !reduced) {
        sonificationEngine.getFrequencyData(freqData);
      } else {
        freqData.fill(0);
      }

      const t = reduced ? 0 : now * 0.0024;
      const orbX = w * 0.12;
      const orbAY = h * 0.28;
      const orbBY = h * 0.72;
      const midY = h * 0.5;
      const burstCenterX = w * 0.72;

      // Two sinuous waves merging into center junction (u ~ 0.44)
      const drawStrand = (startY: number, color: string, freqScale: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let x = orbX; x <= burstCenterX - 65; x += 3) {
          const u = (x - orbX) / Math.max(1, burstCenterX - 65 - orbX);
          const base = startY + (midY - startY) * Math.pow(u, 1.3);
          const wave = Math.sin(u * 14 * freqScale - t) * (1 - u * 0.85) * 14;
          const y = base + wave;
          if (x === orbX) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawStrand(orbAY, '#52C7F5', Math.max(0.8, paramsA.pitchHz / 220));
      drawStrand(orbBY, '#57D6A0', Math.max(0.8, paramsB.pitchHz / 220));

      // Concentric glowing rings around Delta Burst
      const maxRingR = Math.min(w * 0.22, h * 0.44);
      [0.45, 0.72, 1.0].forEach((scale, idx) => {
        ctx.strokeStyle =
          idx === 1 ? 'rgba(138, 124, 255, 0.55)' : 'rgba(82, 199, 245, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(burstCenterX, midY, maxRingR * scale, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Symmetrical spiky waveform burst across the circular Delta zone
      const burstSpan = maxRingR * 1.9;
      const startBX = burstCenterX - burstSpan * 0.6;
      const endBX = Math.min(w - 14, burstCenterX + burstSpan * 0.8);
      const grad = ctx.createLinearGradient(startBX, 0, endBX, 0);
      grad.addColorStop(0, '#52C7F5');
      grad.addColorStop(0.5, '#A78BFA');
      grad.addColorStop(1, '#52C7F5');

      const bins = 48;
      for (let i = 0; i < bins; i++) {
        const u = i / (bins - 1);
        const x = startBX + u * (endBX - startBX);
        const env = Math.pow(Math.sin(u * Math.PI), 1.6);
        const liveVal = active ? freqData[i] / 255 : 0;
        const deltaRatio = Math.min(1, Math.abs(freqDiff) / 260);
        const spikeH =
          (liveVal > 0
            ? liveVal * h * 0.44
            : (0.18 + deltaRatio * 0.36 + 0.16 * Math.abs(Math.sin(i * 1.3 + t))) * h * 0.5) * env;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, midY - spikeH);
        ctx.lineTo(x, midY + spikeH);
        ctx.stroke();
      }

      // Draw Past (A) and Present (B) radiant orbs
      [
        { y: orbAY, color: '#52C7F5' },
        { y: orbBY, color: '#57D6A0' }
      ].forEach(({ y, color }) => {
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(orbX, y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(orbX, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, paramsA.pitchHz, paramsB.pitchHz, freqDiff, reducedMotion]);

  const announcementsEnabled = useAccessibilityStore((s) => s.prefs.announcementsEnabled);
  const guidedListening = useAccessibilityStore((s) => s.prefs.guidedListening);
  const guidedListenSeconds = useAccessibilityStore((s) => s.prefs.guidedListenSeconds);
  const guidedWaitScale = useAccessibilityStore((s) => s.prefs.guidedWaitScale);
  const speechEnabled = useAccessibilityStore((s) => s.prefs.speechEnabled);
  const guidedTokenRef = useRef(0);
  const guidedTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const cancelGuidedCompare = () => {
    guidedTokenRef.current += 1;
    for (const id of guidedTimersRef.current) clearTimeout(id);
    guidedTimersRef.current.clear();
    speechService.stop();
    sonificationEngine.stopAllNodes();
  };

  useEffect(() => () => cancelGuidedCompare(), []);
  useEffect(() => {
    cancelGuidedCompare();
  }, [experience.id, indexA, indexB]);

  const comparisonAnnouncement = useMemo(
    () => buildHearTheChangeAnnouncement(experience, pointA, pointB),
    [experience, pointA, pointB]
  );

  useEffect(() => {
    if (!announcementsEnabled || guidedListening) return;
    if (phase === 'A') {
      const descA = buildSoundDescription({
        experience,
        point: pointA,
        stepIndex: indexA,
        totalSteps: series.length
      });
      liveAnnouncer.announcePolite(`Observation A: ${descA.standard}`);
    } else if (phase === 'TRANSITION') {
      liveAnnouncer.announcePolite(comparisonAnnouncement);
    } else if (phase === 'B') {
      const descB = buildSoundDescription({
        experience,
        point: pointB,
        prevPoint: pointA,
        stepIndex: indexB,
        totalSteps: series.length
      });
      liveAnnouncer.announcePolite(`Observation B: ${descB.standard}`);
    }
  }, [phase, announcementsEnabled, guidedListening, experience, pointA, pointB, indexA, indexB, series.length, comparisonAnnouncement]);

  const waitGuidedMs = (ms: number, token: number) =>
    new Promise<boolean>((resolve) => {
      const id = setTimeout(() => {
        guidedTimersRef.current.delete(id);
        resolve(token === guidedTokenRef.current);
      }, ms);
      guidedTimersRef.current.add(id);
    });

  const speakAndWait = async (text: string, token: number) => {
    if (token !== guidedTokenRef.current) return false;
    if (announcementsEnabled) {
      liveAnnouncer.announcePolite(text, { force: true });
    }
    const estMs = estimateSpeechWaitMs(text, guidedWaitScale);
    if (speechEnabled && speechService.isSupported()) {
      await speechService.speakAsync(text, { fallbackTimeoutMs: estMs + 2500 });
      return token === guidedTokenRef.current;
    }
    return waitGuidedMs(estMs, token);
  };

  const handleHearDifference = async () => {
    if (!guidedListening) {
      sonificationEngine.playHearTheDifferenceTransition({
        pointA,
        pointB,
        experienceId: experience.id,
        mappings: experience.mappings,
        onPhaseChange: setPhase
      });
      return;
    }

    cancelGuidedCompare();
    const token = guidedTokenRef.current;
    const descA = buildSoundDescription({
      experience,
      point: pointA,
      stepIndex: indexA,
      totalSteps: series.length
    });
    const descB = buildSoundDescription({
      experience,
      point: pointB,
      prevPoint: pointA,
      stepIndex: indexB,
      totalSteps: series.length
    });

    // 1. Play A tone -> Describe A
    setPhase('A');
    sonificationEngine.playDataStep({
      point: pointA,
      experienceId: experience.id,
      mappings: experience.mappings,
      durationSec: guidedListenSeconds
    });
    if (!(await waitGuidedMs(guidedListenSeconds * 1000, token))) return;
    sonificationEngine.stopAllNodes();
    if (!(await speakAndWait(`Observation A: ${descA.standard}`, token))) return;
    if (!(await waitGuidedMs(1000, token))) return;

    // 2. Play B tone -> Describe B
    setPhase('B');
    sonificationEngine.playDataStep({
      point: pointB,
      experienceId: experience.id,
      mappings: experience.mappings,
      durationSec: guidedListenSeconds
    });
    if (!(await waitGuidedMs(guidedListenSeconds * 1000, token))) return;
    sonificationEngine.stopAllNodes();
    if (!(await speakAndWait(`Observation B: ${descB.standard}`, token))) return;
    if (!(await waitGuidedMs(1000, token))) return;

    // 3. Describe real computed change
    setPhase('TRANSITION');
    if (!(await speakAndWait(comparisonAnnouncement, token))) return;
    if (token === guidedTokenRef.current) setPhase('DONE');
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <GlassPanel elevation={3} accentColor={experience.themeColor} className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#52C7F5] inline-flex items-center gap-1.5">
                <GitCompare className="w-4 h-4" />
                Auditory Historical Comparison
              </span>
              <DataStatusBadge provenance={provenance} compact />
            </div>
            <h1 className="text-2xl sm:text-3xl font-tech font-medium title-gradient-soft">
              Hear the Change: Auditory Historical Comparison
            </h1>
            <p className="text-sm sm:text-base text-[#A9BAD0] mt-2 max-w-[72ch]">
              Isolate any two real observations from {experience.shortTitle} and listen as Observation A glides smoothly into Observation B.
            </p>
          </div>

          <button
            type="button"
            onClick={handleHearDifference}
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-[#52C7F5] to-[#8A7CFF] text-[#050914] font-display font-bold text-sm inline-flex items-center gap-2 shadow-[0_0_28px_rgba(82,199,245,0.42)] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>HEAR THE DIFFERENCE (A → B)</span>
          </button>
        </div>

        {/* Step 1: Choose Experience */}
        <div className="space-y-2">
          <div className="text-xs font-mono-tabular uppercase text-[#A9BAD0]">
            Step 1 · Choose Experience (Compatible Unit: {experience.mappings.pitch.unit})
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'temperature', label: 'Warming Planet', color: '#FFC66D', Icon: Flame },
                { id: 'ocean', label: 'Water Rhythm', color: '#52C7F5', Icon: Droplets },
                { id: 'atmosphere', label: 'Living Atmosphere', color: '#8A7CFF', Icon: Wind }
              ] as const
            ).map((item) => {
              const Icon = item.Icon;
              return (
                <Chip
                  key={item.id}
                  active={activeExperienceId === item.id}
                  accentColor={item.color}
                  onClick={() => setExperienceId(item.id as ExperienceId)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Chip>
              );
            })}
          </div>
        </div>

        {/* Slide-09 Dual Merging Orbs Canvas Showcase + Interactive Pickers */}
        <div className="rounded-3xl bg-[#050A17]/95 border border-white/15 p-4 sm:p-5 space-y-4">
          <div className="relative h-52 sm:h-60 rounded-2xl overflow-hidden bg-[#040814] border border-white/10">
            <canvas
              ref={burstCanvasRef}
              aria-label="Dual observation waves converging into central acoustic delta burst"
              className="w-full h-full block"
            />
            <div className="pointer-events-none absolute top-3 inset-x-3 sm:inset-x-5 flex flex-wrap items-center justify-between gap-2">
              <div className="px-3 py-1 rounded-xl bg-[#091529]/90 border border-[#52C7F5]/50 text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#52C7F5]" />
                <span>Observation A ({pointA.dateLabel}) · {paramsA.pitchHz} Hz</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#0E1E38]/95 border border-[#8A7CFF]/60 text-xs font-mono-tabular text-[#E2E8F0]">
                The Audible Difference (Δ):{' '}
                <strong className="text-[#FFC66D]">
                  {freqDiff >= 0 ? `+${freqDiff}` : freqDiff} Hz
                </strong>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 sm:left-5 px-3 py-1 rounded-xl bg-[#091529]/90 border border-[#57D6A0]/50 text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#57D6A0]" />
              <span>Observation B ({pointB.dateLabel}) · {paramsB.pitchHz} Hz</span>
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 sm:right-5 text-[11px] font-mono-tabular text-[#A9BAD0]">
              Phase: <strong className="text-[#52C7F5]">{phase}</strong>
            </div>
          </div>

          {/* Interactive Sliders + Swap Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 rounded-2xl bg-[#091223] border border-[#52C7F5]/35 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#52C7F5]">
                  Step 2A · Observation A ({pointA.dateLabel})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    sonificationEngine.playDataStep({
                      point: pointA,
                      experienceId: experience.id,
                      mappings: experience.mappings,
                      durationSec: 0.9
                    })
                  }
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#52C7F5]/20 text-[#52C7F5] text-xs font-mono-tabular inline-flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Play A
                </button>
              </div>
              <Slider
                label={`Date: ${pointA.dateLabel}`}
                value={safeA}
                min={0}
                max={Math.max(0, series.length - 1)}
                accentColor="#52C7F5"
                onChange={setIndexA}
              />
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const tmp = safeA;
                  setIndexA(safeB);
                  setIndexB(tmp);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0A1220] hover:bg-[#101C2D] border border-[#52C7F5]/40 text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5 cursor-pointer"
                title="Swap A and B"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#52C7F5]" />
                <span>Swap A / B</span>
              </button>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-[#091223] border border-[#57D6A0]/35 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#57D6A0]">
                  Step 2B · Observation B ({pointB.dateLabel})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    sonificationEngine.playDataStep({
                      point: pointB,
                      experienceId: experience.id,
                      mappings: experience.mappings,
                      durationSec: 0.9
                    })
                  }
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#57D6A0]/20 text-[#57D6A0] text-xs font-mono-tabular inline-flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Play B
                </button>
              </div>
              <Slider
                label={`Date: ${pointB.dateLabel}`}
                value={safeB}
                min={0}
                max={Math.max(0, series.length - 1)}
                accentColor="#57D6A0"
                onChange={setIndexB}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Tap-to-inspect Result Tiles */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeader
            eyebrow="Step 3 · Measured Shift"
            title="Comparison Results"
            subtitle="Tap any tile with Formula? to see how the numerical difference was calculated."
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                speechService.speak(
                  `Comparing ${pointA.dateLabel} at ${pointA.primaryValue} ${experience.mappings.pitch.unit} (${paramsA.pitchHz} Hertz) with ${pointB.dateLabel} at ${pointB.primaryValue} ${experience.mappings.pitch.unit} (${paramsB.pitchHz} Hertz). Difference ${rawDiff >= 0 ? 'plus ' : ''}${rawDiff} ${experience.mappings.pitch.unit}.`
                )
              }
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#050914] border border-[#1E2E48] text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Speak summary</span>
            </button>
            <button
              type="button"
              aria-pressed={showCompareTable}
              onClick={() => setShowCompareTable((v) => !v)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#050914] border border-[#1E2E48] text-xs font-mono-tabular text-[#F5F8FF] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showCompareTable ? 'Card view' : 'View as table'}</span>
            </button>
          </div>
        </div>

        {showCompareTable ? (
          <div className="overflow-x-auto rounded-xl border border-[#1E2E48] bg-[#050914]">
            <table className="w-full text-left text-xs font-mono-tabular">
              <thead className="bg-[#0A1220] text-[#9AA9BD]">
                <tr>
                  <th className="p-2.5">Observation</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Measured Value</th>
                  <th className="p-2.5">Pitch</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#1E2E48]">
                  <td className="p-2.5 text-[#52C7F5] font-semibold">Observation A</td>
                  <td className="p-2.5 text-[#F5F8FF]">{pointA.dateLabel}</td>
                  <td className="p-2.5 text-[#F5F8FF]">{pointA.primaryValue} {experience.mappings.pitch.unit}</td>
                  <td className="p-2.5 text-[#F5F8FF]">{paramsA.pitchHz} Hz</td>
                </tr>
                <tr className="border-t border-[#1E2E48]">
                  <td className="p-2.5 text-[#57D6A0] font-semibold">Observation B</td>
                  <td className="p-2.5 text-[#F5F8FF]">{pointB.dateLabel}</td>
                  <td className="p-2.5 text-[#F5F8FF]">{pointB.primaryValue} {experience.mappings.pitch.unit}</td>
                  <td className="p-2.5 text-[#F5F8FF]">{paramsB.pitchHz} Hz</td>
                </tr>
                <tr className="border-t border-[#1E2E48] bg-[#091223]">
                  <td className="p-2.5 text-[#FFC66D] font-semibold">Measured Shift (Δ)</td>
                  <td className="p-2.5 text-[#A9BAD0]">A → B</td>
                  <td className="p-2.5 text-[#FFC66D]">{rawDiff >= 0 ? `+${rawDiff}` : rawDiff} {experience.mappings.pitch.unit}</td>
                  <td className="p-2.5 text-[#FFC66D]">{freqDiff >= 0 ? `+${freqDiff}` : freqDiff} Hz</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile
            label={`Value A (${pointA.dateLabel})`}
            value={pointA.primaryValue}
            unit={experience.mappings.pitch.unit}
            accentColor="#52C7F5"
          />
          <StatTile
            label={`Value B (${pointB.dateLabel})`}
            value={pointB.primaryValue}
            unit={experience.mappings.pitch.unit}
            accentColor="#57D6A0"
          />
          <StatTile
            label="Difference (Δ)"
            value={rawDiff >= 0 ? `+${rawDiff}` : rawDiff}
            unit={experience.mappings.pitch.unit}
            accentColor="#FFC66D"
            explanation={`Calculated as Value B (${pointB.primaryValue}) - Value A (${pointA.primaryValue}).`}
          />
          <StatTile
            label="% Difference"
            value={
              activeComp.percentageDifferenceValid && activeComp.percentageDifference !== null
                ? `${activeComp.percentageDifference >= 0 ? '+' : ''}${activeComp.percentageDifference}%`
                : 'N/A'
            }
            accentColor="#8A7CFF"
            explanation={activeComp.percentageDifferenceReason}
          />
          <StatTile
            label="Normalized A → B"
            value={`${activeComp.observationA.normalized ?? 'N/A'} → ${activeComp.observationB.normalized ?? 'N/A'}`}
            accentColor="#F5F8FF"
            explanation="Normalized to [0, 1] against the dataset's documented range."
          />
        </div>
      </GlassPanel>
    </div>
  );
};
