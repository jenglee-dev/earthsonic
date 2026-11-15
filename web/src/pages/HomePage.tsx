import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DataPoint, EarthExperience, ExperienceId } from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { toExperienceQuerySlug, useEarthSonicStore } from '../store/useEarthSonicStore';
import { sonificationEngine } from '../audio/sonificationEngine';
import { isEffectiveReducedMotionActive, useAccessibilityStore } from '../store/useAccessibilityStore';
import { getExperienceAccentColor, useEffectiveReducedMotion } from '../hooks/useAccessibilityRuntime';
import { DataStatusBadge } from '../components/data/DataStatusBadge';
import { Chip, GlassPanel, SectionHeader, TiltCard } from '../components/ui/Primitives';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Database,
  Droplets,
  Flame,
  GitCompare,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Wind
} from 'lucide-react';

const InteractiveGlobe = lazy(() =>
  import('../components/earth/InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe }))
);

interface HomePageProps {
  experience: EarthExperience;
  series: DataPoint[];
  provenance: ClientProvenance;
}

/**
 * Multi-harmonic spectrum wave canvas matching slide-02 "Sonified Audio Data".
 * Reacts directly to live Web Audio AnalyserNode when audio plays, and displays
 * gentle harmonic previews otherwise (frozen under prefers-reduced-motion).
 */
const SonifiedSpectrumPreviewCanvas: React.FC<{ isPlaying: boolean; emphasis: number }> = ({
  isPlaying,
  emphasis
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotionSetting = useEffectiveReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    let rafId = 0;

    const render = (now: number) => {
      const reducedMotion = reducedMotionSetting || isEffectiveReducedMotionActive();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 440;
      const h = canvas.clientHeight || 220;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (isPlaying && !reducedMotion) {
        sonificationEngine.getFrequencyData(freqData);
      }

      const t = reducedMotion ? 0 : now * 0.0022;
      const midY = h * 0.5;
      const ampScale = (0.45 + (emphasis / 100) * 0.55) * (isPlaying ? 1.15 : 0.85);

      // Subtle center baseline glow
      const baseGrad = ctx.createLinearGradient(0, 0, w, 0);
      baseGrad.addColorStop(0, 'rgba(82, 199, 245, 0.08)');
      baseGrad.addColorStop(0.5, 'rgba(139, 233, 253, 0.7)');
      baseGrad.addColorStop(1, 'rgba(138, 124, 255, 0.1)');
      ctx.strokeStyle = baseGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Multi-band mirrored wave envelopes (cyan, emerald, amber, violet)
      const bands = [
        { color: '#52C7F5', phase: 0.0, freq: 2.8, weight: 0.36 },
        { color: '#57D6A0', phase: 1.2, freq: 3.9, weight: 0.28 },
        { color: '#FFC66D', phase: 2.5, freq: 5.2, weight: 0.24 },
        { color: '#8A7CFF', phase: 3.7, freq: 6.4, weight: 0.22 }
      ];

      // Vertical bar ticks behind waveform
      const barCount = 52;
      for (let i = 0; i < barCount; i++) {
        const u = i / (barCount - 1);
        const x = u * w;
        const bin = isPlaying ? freqData[i % 48] / 255 : 0;
        const env = Math.sin(u * Math.PI);
        const barH = (bin > 0 ? bin * h * 0.42 : (0.08 + 0.14 * Math.abs(Math.sin(u * 14 + t))) * h * 0.36) * env * ampScale;
        ctx.fillStyle = `rgba(120, 210, 255, ${0.15 + env * 0.25})`;
        ctx.fillRect(x - 1, midY - barH, 2, barH * 2);
      }

      for (const band of bands) {
        ctx.strokeStyle = band.color;
        ctx.lineWidth = 1.75;
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const u = x / w;
          const env = Math.pow(Math.sin(u * Math.PI), 1.35);
          const bin = isPlaying ? freqData[Math.floor(u * 40)] / 255 : 0.26;
          const wave =
            Math.sin(u * Math.PI * band.freq + t + band.phase) *
            (0.45 + Math.cos(u * 11 - t * 0.7) * 0.35);
          const y = midY + wave * env * h * band.weight * (0.55 + bin * 0.9) * ampScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Mirrored lower harmonic trace
        ctx.globalAlpha = 0.48;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const u = x / w;
          const env = Math.pow(Math.sin(u * Math.PI), 1.35);
          const bin = isPlaying ? freqData[Math.floor(u * 40)] / 255 : 0.26;
          const wave =
            Math.sin(u * Math.PI * band.freq + t + band.phase) *
            (0.45 + Math.cos(u * 11 - t * 0.7) * 0.35);
          const y = midY - wave * env * h * band.weight * (0.55 + bin * 0.9) * ampScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      if (!reducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, emphasis, reducedMotionSetting]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Live sonified Web Audio multi-harmonic waveform visualizer"
      className="w-full h-full block"
    />
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  experience,
  series,
  provenance
}) => {
  const navigate = useNavigate();
  const setExperienceId = useEarthSonicStore((s) => s.setExperienceId);
  const palette = useAccessibilityStore((s) => s.prefs.palette);
  const [samplePlaying, setSamplePlaying] = useState(false);
  const [compareSplit, setCompareSplit] = useState(65);
  const [frameImgError, setFrameImgError] = useState(false);

  const latestPoint = series[series.length - 1] || series[0];
  const heroFrame = experience.visualFrames[0];

  const handlePlaySample = () => {
    if (!latestPoint) return;
    setSamplePlaying(true);
    sonificationEngine.playDataStep({
      point: latestPoint,
      experienceId: experience.id,
      mappings: experience.mappings,
      durationSec: 1.4
    });
    setTimeout(() => setSamplePlaying(false), 1450);
  };

  const handleSilenceSample = () => {
    sonificationEngine.stopAllNodes();
    setSamplePlaying(false);
  };

  const openExperience = (id: ExperienceId) => {
    setExperienceId(id);
    navigate(`/explorer?exp=${toExperienceQuerySlug(id)}`);
  };

  // Single source of truth from shared EARTH_EXPERIENCES config
  const experienceCards: {
    id: ExperienceId;
    title: string;
    domain: string;
    variable: string;
    audioParam: string;
    color: string;
    Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    {
      id: 'temperature',
      title: EARTH_EXPERIENCES.temperature.shortTitle,
      domain: 'Global Surface',
      variable: EARTH_EXPERIENCES.temperature.mappings.pitch.variableName,
      audioParam: `${EARTH_EXPERIENCES.temperature.mappings.pitch.label} & Harmonic Tension`,
      color: getExperienceAccentColor('temperature', palette),
      Icon: Flame
    },
    {
      id: 'ocean',
      title: EARTH_EXPERIENCES.ocean.shortTitle,
      domain: 'Oceans & Sea Level',
      variable: `${EARTH_EXPERIENCES.ocean.mappings.pitch.variableName} & ${EARTH_EXPERIENCES.ocean.mappings.rhythm.variableName}`,
      audioParam: `${EARTH_EXPERIENCES.ocean.mappings.rhythm.label} & FM Pitch`,
      color: getExperienceAccentColor('ocean', palette),
      Icon: Droplets
    },
    {
      id: 'atmosphere',
      title: EARTH_EXPERIENCES.atmosphere.shortTitle,
      domain: 'Atmosphere & Carbon',
      variable: `${EARTH_EXPERIENCES.atmosphere.mappings.pitch.variableName} & Filter`,
      audioParam: `${EARTH_EXPERIENCES.atmosphere.mappings.intensity.label}`,
      color: getExperienceAccentColor('atmosphere', palette),
      Icon: Wind
    }
  ];

  return (
    <div className="flex flex-col gap-12 sm:gap-16 pb-6">
      {/* 1. HERO (Slide 01 Layout: Centered Light Gradient H1 + 70vh Realistic Globe Behind + Centered Frosted Lower-Middle Card) */}
      <section aria-label="EarthSonic Hero" className="relative pt-2 sm:pt-4">
        <div className="text-center max-w-4xl mx-auto space-y-3 relative z-20">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <DataStatusBadge provenance={provenance} compact />
            <Chip
              active={samplePlaying}
              accentColor={experience.themeColor}
              onClick={samplePlaying ? handleSilenceSample : handlePlaySample}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{samplePlaying ? 'Playing real observation...' : 'Tap to hear a sample'}</span>
            </Chip>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[4.15rem] font-display font-normal tracking-[-0.025em] leading-[1.08] title-gradient-hero mb-4 sm:mb-6">
            Listen to the Changing Planet
          </h1>
        </div>

        {/* 70vh Centered Photorealistic 3D Globe Behind */}
        <div className="relative mt-1">
          <Suspense
            fallback={
              <div className="h-[380px] sm:h-[58vh] lg:h-[68vh] min-h-[380px] max-h-[660px] rounded-3xl bg-[#050914] flex items-center justify-center text-xs font-mono-tabular text-[#A9BAD0]">
                Loading photorealistic 3D Earth...
              </div>
            }
          >
            <InteractiveGlobe
              mode="hero"
              experienceId={experience.id}
              accentColor={experience.themeColor}
              lat={18}
              lon={-82}
              isAudioPlaying={samplePlaying}
              heightClass="h-[380px] sm:h-[58vh] lg:h-[68vh] min-h-[380px] max-h-[660px]"
            />
          </Suspense>

          {/* Centered Lower-Middle Frosted Glass Overlay Card (matching Slide 01) */}
          <div className="relative z-20 -mt-10 sm:-mt-40 md:-mt-48 mx-auto max-w-[540px] px-2">
            <div className="glass-panel rounded-3xl border border-[#BCE3FF]/30 px-6 sm:px-9 py-6 sm:py-7 text-center shadow-[0_24px_70px_rgba(3,7,18,0.82)] space-y-4">
              <p className="text-base sm:text-lg text-[#DCE8F8] leading-relaxed font-normal">
                EarthSonic translates NASA&apos;s visual environmental data into immersive, real-time auditory experiences. One planet. Countless stories. Hear them all.
              </p>

              {latestPoint && (
                <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-[#050914]/75 border border-[#52C7F5]/30 px-4 py-1.5 text-xs font-mono-tabular">
                  <span className="text-[#A9BAD0]">Latest Loaded ({latestPoint.dateLabel}):</span>
                  <span className="font-bold text-[#F5F8FF]">
                    {latestPoint.primaryValue} {experience.mappings.pitch.unit}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openExperience(experience.id)}
                  className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#52C7F5] hover:bg-sky-300 text-[#050914] font-display font-bold text-sm inline-flex items-center gap-2 shadow-[0_0_28px_rgba(82,199,245,0.42)] transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>EXPLORE EARTH</span>
                </button>

                <Link
                  to="/how-it-works"
                  className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#0A1220]/85 hover:bg-[#101C2D] border border-[#9EC5FF]/30 text-[#F5F8FF] font-display font-semibold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#8A7CFF]" />
                  <span>HOW IT WORKS</span>
                </Link>
              </div>

              <div>
                <Link
                  to="/guide#quick-start"
                  className="text-xs font-mono-tabular text-[#7CE8FF] hover:underline inline-flex items-center gap-1"
                >
                  <span>New here? Quick start</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MOVING BEYOND THE VISUAL SPECTRUM (Slide 02 Layout: Desaturated Visual Left <-> Glowing Arrow Pill <-> Live Spectrum Right) */}
      <section aria-label="Moving Beyond the Visual Spectrum" className="space-y-6">
        <SectionHeader
          title="Moving Beyond the Visual Spectrum"
          subtitle="Visual frames alone can obscure subtle temporal rhythms and limit accessibility. EarthSonic pairs NASA Earth observations with real-time Web Audio sonification so planetary trends can be heard as they unfold."
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Panel: Silent Visual Data */}
          <button
            type="button"
            onClick={handleSilenceSample}
            className="glass-panel rounded-3xl p-4 sm:p-5 text-left flex flex-col gap-3 group hover:border-slate-400/40 transition-all cursor-pointer"
            style={{ opacity: Math.max(0.45, 1.15 - compareSplit / 140) }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-base font-display font-normal text-[#F5F8FF]">
                Silent Visual Data
              </span>
              <span className="text-xs font-mono-tabular text-[#A9BAD0] inline-flex items-center gap-1.5">
                <VolumeX className="w-3.5 h-3.5" />
                Tap to silence
              </span>
            </div>

            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-[#0A1220] border border-white/10">
              {heroFrame && !frameImgError ? (
                <img
                  src={heroFrame.imageUrl}
                  alt={heroFrame.title}
                  onError={() => setFrameImgError(true)}
                  className="w-full h-full object-cover grayscale contrast-125 brightness-90"
                />
              ) : (
                <svg viewBox="0 0 400 220" className="w-full h-full opacity-75">
                  <rect width="400" height="220" fill="#17202c" />
                  <path
                    d="M0 150 Q 90 95, 180 130 T 400 85"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M0 110 Q 110 60, 230 95 T 400 45"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M0 185 Q 140 135, 260 175 T 400 130"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                </svg>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050914]/85 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 text-[11px] font-mono-tabular text-[#CBD5E1] flex flex-wrap justify-between gap-2">
                <span className="truncate">{heroFrame?.title || 'NASA Earth Observation'}</span>
                <span className="text-[#94A3B8]">{heroFrame?.credit || 'NASA EOSDIS GIBS'}</span>
              </div>
            </div>
          </button>

          {/* Center Glowing Interactive Arrow Pill (desktop bridges the gap; mobile stacks cleanly) */}
          <div className="flex items-center justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20">
            <button
              type="button"
              onClick={samplePlaying ? handleSilenceSample : handlePlaySample}
              className="min-h-[54px] px-5 py-2.5 rounded-2xl bg-[#0F2744]/95 hover:bg-[#16365E] border-2 border-[#7CE8FF]/80 text-[#F5F8FF] shadow-[0_0_32px_rgba(82,199,245,0.48)] inline-flex items-center gap-2.5 text-xs font-display font-semibold transition-all cursor-pointer backdrop-blur-md"
            >
              <span className="text-left leading-tight">
                Real-Time<br className="hidden lg:inline" /> Web Audio Translation
              </span>
              <ArrowRight className="w-4 h-4 text-[#7CE8FF] shrink-0" />
            </button>
          </div>

          {/* Right Panel: Sonified Audio Data */}
          <button
            type="button"
            onClick={handlePlaySample}
            className="glass-panel rounded-3xl p-4 sm:p-5 text-left flex flex-col gap-3 group hover:border-[#52C7F5]/60 transition-all cursor-pointer"
            style={{ opacity: Math.max(0.45, 0.35 + compareSplit / 130) }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-base font-display font-normal text-[#F5F8FF]">
                Sonified Audio Data
              </span>
              <span className="text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                {samplePlaying ? 'Playing live audio' : 'Tap to hear audio'}
              </span>
            </div>

            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-[#050B18] border border-[#52C7F5]/25">
              <SonifiedSpectrumPreviewCanvas isPlaying={samplePlaying} emphasis={compareSplit} />
              <div className="absolute bottom-2.5 left-3 right-3 text-[11px] font-mono-tabular text-[#A9BAD0] flex justify-between">
                <span>Live AnalyserNode Spectrum</span>
                <span className="text-[#7CE8FF]">Pitch · Pulse · Filter</span>
              </div>
            </div>
          </button>
        </div>

        {/* Comparison Emphasis Control */}
        <GlassPanel elevation={1} className="px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-mono-tabular text-[#A9BAD0] shrink-0">Silent Frame</span>
          <input
            type="range"
            aria-label="Compare silent visual vs sonified audio emphasis"
            min={0}
            max={100}
            value={compareSplit}
            onChange={(e) => setCompareSplit(Number(e.target.value))}
            className="flex-1 h-2 accent-[#52C7F5] cursor-pointer min-h-[44px]"
          />
          <span className="text-xs font-mono-tabular text-[#52C7F5] shrink-0">Sonified Wave</span>
        </GlassPanel>
      </section>

      {/* 3. EXPERIENCE MATRIX (Slide 04 Layout inside outer Glass Panel) */}
      <GlassPanel elevation={2} className="p-6 sm:p-10 space-y-6">
        <SectionHeader
          title="The Earth Science Experience Matrix"
          subtitle="Every sound maintains a strict, documented relationship with a NASA dataset variable. Our mappings translate environmental metrics into intuitive acoustic parameters."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {experienceCards.map((card) => {
            const Icon = card.Icon;
            return (
              <TiltCard
                key={card.id}
                accentColor={card.color}
                className="relative overflow-hidden group"
              >
                {/* Signature Top Glowing Bar (Slide 04) */}
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-[78%] rounded-b-full"
                  style={{
                    backgroundColor: card.color,
                    boxShadow: `0 0 18px ${card.color}`
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-20"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${card.color}, transparent 72%)`
                  }}
                />

                <button
                  type="button"
                  onClick={() => openExperience(card.id)}
                  className="relative w-full text-center p-6 sm:p-7 flex flex-col items-center justify-between gap-4 cursor-pointer rounded-3xl min-h-[290px]"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${card.color}16`,
                      borderColor: `${card.color}55`
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color: card.color }} />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-display font-semibold text-[#F5F8FF] group-hover:underline">
                      {card.title}
                    </h3>
                    <div
                      className="text-sm font-display font-normal"
                      style={{ color: card.color }}
                    >
                      ({card.domain})
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-[#DCE8F8] leading-snug max-w-[30ch]">
                    <div>
                      <span className="text-[#A9BAD0]">Scientific Variable: </span>
                      <span className="font-medium text-[#F5F8FF]">{card.variable}</span>
                    </div>
                    <div>
                      <span className="text-[#A9BAD0]">Audio Parameter: </span>
                      <span className="font-medium text-[#F5F8FF]">{card.audioParam}</span>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-mono-tabular uppercase tracking-wider font-semibold pt-2"
                    style={{ color: card.color }}
                  >
                    <span>Launch 3D Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </TiltCard>
            );
          })}
        </div>
      </GlassPanel>

      {/* 4. FEATURE NAVIGATION CARDS */}
      <section aria-label="Explore More Tools" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            to: '/hear-the-change',
            title: 'Hear the Change',
            desc: 'Compare past and present observations with a continuous pitch glide.',
            icon: GitCompare,
            color: '#FFC66D'
          },
          {
            to: '/orchestra',
            title: 'Earth Orchestra',
            desc: 'Layer temperature, rain, and wind at one shared location.',
            icon: Layers,
            color: '#52C7F5'
          },
          {
            to: '/guide',
            title: '60-Second User Guide',
            desc: 'Practice the 3D globe, test shortcuts, and troubleshoot audio.',
            icon: BookOpen,
            color: '#57D6A0'
          },
          {
            to: '/data',
            title: 'Data & Sources',
            desc: 'Inspect NASA datasets, provenance rules, and attribution.',
            icon: Database,
            color: '#8A7CFF'
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="glass-panel rounded-2xl p-5 hover:border-[#52C7F5]/60 transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-5 h-5" style={{ color: item.color }} />
                <h3 className="text-base font-display font-semibold text-[#F5F8FF]">{item.title}</h3>
              </div>
              <p className="text-sm text-[#A9BAD0] leading-relaxed">{item.desc}</p>
              <span className="text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
};
