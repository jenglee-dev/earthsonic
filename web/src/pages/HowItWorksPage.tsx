import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MappingResponse } from '@earthsonic/shared';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { fetchExperienceMapping } from '../services/apiClient';
import { normalizeValue, sonificationEngine } from '../audio/sonificationEngine';
import { isEffectiveReducedMotionActive } from '../store/useAccessibilityStore';
import { useEffectiveReducedMotion } from '../hooks/useAccessibilityRuntime';
import {
  Accordion,
  Chip,
  GlassPanel,
  SectionHeader,
  Slider,
  StepCarousel
} from '../components/ui/Primitives';
import { ArrowRight, Cpu, Play, Sliders, Volume2 } from 'lucide-react';

const PIPELINE_STAGES = [
  {
    id: 'input',
    title: 'Input',
    subtitle: 'Raw Scientific Value',
    summary: 'Real numerical observations from NASA GISS and NASA POWER enter with missing values preserved as null.'
  },
  {
    id: 'norm',
    title: 'Normalisation Node',
    subtitle: 'sonificationEngine.ts',
    summary: 'Values clamp linearly into a mathematically valid [0, 1] scale against documented dataset bounds.'
  },
  {
    id: 'core',
    title: 'Web Audio API Core',
    subtitle: 'AudioContext DSP',
    summary: 'Routes normalized values to OscillatorNode (frequency), BiquadFilterNode (timbre), and GainNode with setTargetAtTime smoothing.'
  },
  {
    id: 'output',
    title: 'Output',
    subtitle: 'Synthesised Sound Wave',
    summary: 'Live AnalyserNode frequency data drives the orbit ring and spectrum visualizers in real time.'
  }
];

export const HowItWorksPage: React.FC = () => {
  const [activeStage, setActiveStage] = useState(PIPELINE_STAGES[0]);
  const [serverMappings, setServerMappings] = useState<MappingResponse | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive mapping playground sliders
  const [tempVal, setTempVal] = useState(0.85);
  const [precipVal, setPrecipVal] = useState(8.5);
  const [windVal, setWindVal] = useState(9.2);

  useEffect(() => {
    fetchExperienceMapping('temperature').then((res) => {
      if (res.ok) setServerMappings(res.data);
    });
  }, []);

  const tempSpec = serverMappings?.mappings.pitch
    ? {
        variableName: serverMappings.mappings.pitch.variableName,
        variableUnit: serverMappings.mappings.pitch.unit,
        variableRange: {
          min: serverMappings.mappings.pitch.documentedRange.min,
          max: serverMappings.mappings.pitch.documentedRange.max
        },
        audioRange: {
          min: serverMappings.mappings.pitch.audioRange.min,
          max: serverMappings.mappings.pitch.audioRange.max,
          unit: 'Hz'
        }
      }
    : {
        variableName: EARTH_EXPERIENCES.temperature.mappings.pitch.variableName,
        variableUnit: EARTH_EXPERIENCES.temperature.mappings.pitch.unit,
        variableRange: {
          min: EARTH_EXPERIENCES.temperature.mappings.pitch.minData,
          max: EARTH_EXPERIENCES.temperature.mappings.pitch.maxData
        },
        audioRange: {
          min: EARTH_EXPERIENCES.temperature.mappings.pitch.minAudio,
          max: EARTH_EXPERIENCES.temperature.mappings.pitch.maxAudio,
          unit: 'Hz'
        }
      };

  const normTemp = normalizeValue(tempVal, tempSpec.variableRange.min, tempSpec.variableRange.max);
  const previewHz = Number(
    (tempSpec.audioRange.min * Math.pow(tempSpec.audioRange.max / tempSpec.audioRange.min, normTemp)).toFixed(1)
  );
  const reducedMotion = useEffectiveReducedMotion();

  // Live Mini Output Wave Canvas in Slide-08 node 4
  useEffect(() => {
    const canvas = outputCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const render = (now: number) => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const t = reduced ? 0 : now * 0.004;
      const cycles = 3 + normTemp * 8;

      ctx.strokeStyle = '#57D6A0';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const u = x / w;
        const env = Math.sin(u * Math.PI);
        const y = h / 2 + Math.sin(u * Math.PI * cycles - t) * env * (h * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!reduced) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [normTemp, reducedMotion]);

  const triggerStageAudio = (stage: typeof PIPELINE_STAGES[number]) => {
    setActiveStage(stage);
    sonificationEngine.playDataStep({
      point: {
        index: 0,
        dateLabel: 'Live Slider',
        isoDate: '2024-07-15',
        primaryValue: tempVal,
        secondaryValue: precipVal,
        tertiaryValue: windVal
      },
      experienceId: 'temperature',
      mappings: EARTH_EXPERIENCES.temperature.mappings,
      durationSec: 0.55
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* 1. Interactive Pipeline Diagram (Slide 08 Visual Fidelity) */}
      <GlassPanel elevation={3} accentColor="#57D6A0" className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#57D6A0] inline-flex items-center gap-1.5 mb-1.5">
              <Cpu className="w-4 h-4" />
              Real-Time Web Audio Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-tech font-medium title-gradient-soft">
              The Real-Time Sonification Pipeline
            </h1>
            <p className="text-sm sm:text-base text-[#A9BAD0] mt-2 max-w-[70ch]">
              EarthSonic does not rely on pre-recorded audio files. Tap any circuit stage below to hear the live mathematical translation from your slider inputs.
            </p>
          </div>
          <Link
            to="/data"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#050914] border border-[#1E2E48] hover:border-[#52C7F5]/60 text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1.5"
          >
            <span>Inspect Data Sources</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Glowing Circuit Architecture Flow */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          {/* Connector trace behind nodes on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#57D6A0]/20 via-[#57D6A0]/80 to-[#57D6A0]/20 shadow-[0_0_16px_rgba(87,214,160,0.45)] pointer-events-none"
          />

          {/* Stage 1: Input */}
          <button
            type="button"
            onClick={() => triggerStageAudio(PIPELINE_STAGES[0])}
            className={`relative z-10 rounded-2xl p-4 text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer backdrop-blur-md ${
              activeStage.id === 'input'
                ? 'bg-[#10253A]/90 border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                : 'bg-[#091322]/90 border-white/15 hover:border-[#57D6A0]/60'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-display font-semibold text-[#F5F8FF]">Input</div>
              <div className="text-xs text-[#A9BAD0]">Raw Scientific Value</div>
            </div>
            <div className="text-xs font-mono-tabular text-[#FFC66D] bg-[#050914]/80 rounded-lg px-2.5 py-1.5 border border-[#FFC66D]/30">
              Current slider: {tempVal >= 0 ? `+${tempVal.toFixed(2)}` : tempVal.toFixed(2)} °C
            </div>
          </button>

          {/* Stage 2: Normalisation Node */}
          <button
            type="button"
            onClick={() => triggerStageAudio(PIPELINE_STAGES[1])}
            className={`relative z-10 rounded-2xl p-4 text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer backdrop-blur-md ${
              activeStage.id === 'norm'
                ? 'bg-[#10253A]/90 border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                : 'bg-[#091322]/90 border-white/15 hover:border-[#57D6A0]/60'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-display font-semibold text-[#F5F8FF]">Normalisation Node</div>
              <div className="text-xs font-mono-tabular text-[#57D6A0]">clamp([0, 1])</div>
            </div>
            <div className="text-xs text-[#A9BAD0]">
              Normalized = <strong className="text-[#F5F8FF] font-mono-tabular">{normTemp.toFixed(2)}</strong>
            </div>
          </button>

          {/* Stage 3: Web Audio API Core (DSP Chip Motif) */}
          <button
            type="button"
            onClick={() => triggerStageAudio(PIPELINE_STAGES[2])}
            className={`relative z-10 rounded-2xl p-4 text-left border-2 transition-all flex flex-col justify-between gap-2 cursor-pointer backdrop-blur-md ${
              activeStage.id === 'core'
                ? 'bg-[#13293F]/95 border-[#57D6A0] shadow-[0_0_30px_rgba(87,214,160,0.38)]'
                : 'bg-[#0C192C]/95 border-[#57D6A0]/55 hover:border-[#57D6A0]'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-display font-bold text-[#F5F8FF]">Web Audio API Core</div>
              <ul className="text-[11px] font-mono-tabular text-[#A9BAD0] space-y-0.5">
                <li>• OscillatorNode ({previewHz} Hz)</li>
                <li>• BiquadFilter &amp; GainNode</li>
                <li>• setTargetAtTime smoothing</li>
              </ul>
            </div>
            <div className="text-[11px] font-mono-tabular text-[#57D6A0]">Safe Output Limiter Active</div>
          </button>

          {/* Stage 4: Output */}
          <button
            type="button"
            onClick={() => triggerStageAudio(PIPELINE_STAGES[3])}
            className={`relative z-10 rounded-2xl p-4 text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer backdrop-blur-md ${
              activeStage.id === 'output'
                ? 'bg-[#10253A]/90 border-[#57D6A0] shadow-[0_0_24px_rgba(87,214,160,0.28)]'
                : 'bg-[#091322]/90 border-white/15 hover:border-[#57D6A0]/60'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-display font-semibold text-[#F5F8FF]">Output</div>
              <div className="text-xs text-[#A9BAD0]">Synthesised Sound Wave</div>
            </div>
            <canvas ref={outputCanvasRef} width={220} height={44} className="w-full h-11 rounded-lg bg-[#050914]/90 border border-white/10" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#050914]/85 border border-[#57D6A0]/30 px-4 py-3 text-sm text-[#DCE8F8]">
          <strong className="text-[#57D6A0]">{activeStage.title}:</strong> {activeStage.summary}
        </div>
      </GlassPanel>

      {/* 2. Try the Mapping (3 Live Playgrounds) */}
      <GlassPanel elevation={2} className="p-6 space-y-4">
        <SectionHeader
          eyebrow="Interactive Sound Lab"
          title="Try the Mapping Live"
          subtitle="Drag any scientific variable slider and press Play to hear the formula in action."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pitch */}
          <div className="rounded-2xl bg-[#050914] border border-[#FFC66D]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular font-bold text-[#FFC66D]">1. Pitch (Temperature)</span>
              <Chip
                accentColor="#FFC66D"
                onClick={() =>
                  sonificationEngine.playDataStep({
                    point: { index: 0, dateLabel: 'Test', isoDate: '2024-01-01', primaryValue: tempVal, secondaryValue: 5, tertiaryValue: 0.6 },
                    experienceId: 'temperature',
                    mappings: EARTH_EXPERIENCES.temperature.mappings,
                    durationSec: 0.8
                  })
                }
              >
                <Play className="w-3 h-3" /> Play
              </Chip>
            </div>
            <Slider
              label={`Temp Anomaly (${tempSpec.variableUnit})`}
              value={tempVal}
              min={tempSpec.variableRange.min}
              max={tempSpec.variableRange.max}
              step={0.05}
              accentColor="#FFC66D"
              onChange={setTempVal}
            />
            <div className="text-xs font-mono-tabular text-[#A9BAD0]">
              Normalized: <strong className="text-[#F5F8FF]">{normTemp.toFixed(2)}</strong> →{' '}
              <strong className="text-[#FFC66D]">{previewHz} Hz</strong>
            </div>
          </div>

          {/* Pulse */}
          <div className="rounded-2xl bg-[#050914] border border-[#52C7F5]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular font-bold text-[#52C7F5]">2. Pulse (Precipitation)</span>
              <Chip
                accentColor="#52C7F5"
                onClick={() =>
                  sonificationEngine.playDataStep({
                    point: { index: 0, dateLabel: 'Test', isoDate: '2024-01-01', primaryValue: precipVal, secondaryValue: 8, tertiaryValue: 26 },
                    experienceId: 'ocean',
                    mappings: EARTH_EXPERIENCES.ocean.mappings,
                    durationSec: 0.8
                  })
                }
              >
                <Play className="w-3 h-3" /> Play
              </Chip>
            </div>
            <Slider
              label="Rain Rate (mm/day)"
              value={precipVal}
              min={0}
              max={18}
              step={0.5}
              accentColor="#52C7F5"
              onChange={setPrecipVal}
            />
            <div className="text-xs font-mono-tabular text-[#A9BAD0]">
              Normalized: <strong className="text-[#F5F8FF]">{normalizeValue(precipVal, 0, 18).toFixed(2)}</strong> →{' '}
              <strong className="text-[#52C7F5]">Pulse Density</strong>
            </div>
          </div>

          {/* Modulation */}
          <div className="rounded-2xl bg-[#050914] border border-[#8A7CFF]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular font-bold text-[#8A7CFF]">3. Modulation (Wind)</span>
              <Chip
                accentColor="#8A7CFF"
                onClick={() =>
                  sonificationEngine.playDataStep({
                    point: { index: 0, dateLabel: 'Test', isoDate: '2024-01-01', primaryValue: 6, secondaryValue: windVal, tertiaryValue: 5 },
                    experienceId: 'atmosphere',
                    mappings: EARTH_EXPERIENCES.atmosphere.mappings,
                    durationSec: 0.8
                  })
                }
              >
                <Play className="w-3 h-3" /> Play
              </Chip>
            </div>
            <Slider
              label="Wind Speed (m/s)"
              value={windVal}
              min={0}
              max={16}
              step={0.4}
              accentColor="#8A7CFF"
              onChange={setWindVal}
            />
            <div className="text-xs font-mono-tabular text-[#A9BAD0]">
              Normalized: <strong className="text-[#F5F8FF]">{normalizeValue(windVal, 0, 16).toFixed(2)}</strong> →{' '}
              <strong className="text-[#8A7CFF]">Filter Sweep</strong>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* 3. Understand the Sound Carousel + FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassPanel elevation={2} className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-[#52C7F5]">
            <Volume2 className="w-4 h-4" />
            <span>Understand the Sound</span>
          </div>
          <StepCarousel
            accentColor="#52C7F5"
            steps={[
              {
                badge: '1 / 3',
                title: 'What is measured',
                body: 'NASA instruments measure global surface temperature anomalies, ocean/rainfall rates, and atmospheric wind dynamics.'
              },
              {
                badge: '2 / 3',
                title: 'What a change means',
                body: 'Rising values signal warming trends, heavier monsoon pulses, or faster atmospheric circulation relative to baseline.'
              },
              {
                badge: '3 / 3',
                title: 'How it becomes sound',
                body: 'EarthSonic maps normalized values to pitch, tempo, and filter brightness. These mappings are educational design choices, not NASA standards.'
              }
            ]}
          />
        </GlassPanel>

        <GlassPanel elevation={2} className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-[#8A7CFF]">
            <Sliders className="w-4 h-4" />
            <span>Common Questions</span>
          </div>
          <Accordion title="Is this real recorded sound from Earth?" defaultOpen>
            No. Space is silent to human ears, and these are numerical telemetry records translated in real time by Web Audio synthesizers (data sonification).
          </Accordion>
          <Accordion title="Are these audio mappings official NASA standards?">
            No. Only the underlying measurements and satellite frames come from NASA sources; the musical scales, instruments, and tempo mappings are EarthSonic’s creative design choices.
          </Accordion>
          <Accordion title="Where can I learn how to use every control?">
            Visit the <Link to="/guide" className="text-[#52C7F5] underline">60-Second User Guide</Link> for interactive practice tools and keyboard shortcuts.
          </Accordion>
        </GlassPanel>
      </div>
    </div>
  );
};
