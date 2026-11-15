import React from 'react';
import type { EarthExperience, ExperienceId } from '../types/earthsonic';
import {
  ArrowRight,
  BookOpen,
  Flame,
  Headphones,
  Play,
  Radio,
  Sparkles,
  Waves,
  Wind
} from 'lucide-react';

interface LandingHeroSectionProps {
  experiences: Record<ExperienceId, EarthExperience>;
  onExploreEarth: (expId?: ExperienceId, autoPlay?: boolean) => void;
  onNavigateSection: (section: 'explorer' | 'hear-change' | 'orchestra' | 'how-it-works') => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({
  experiences,
  onExploreEarth,
  onNavigateSection
}) => {
  return (
    <section
      aria-label="EarthSonic Hero Introduction"
      className="relative overflow-hidden rounded-3xl bg-[#0A1220] border border-[#1E2E48] shadow-2xl p-6 sm:p-10 lg:p-12"
    >
      {/* Subtle atmospheric radial glow */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #52C7F5 0%, #8A7CFF 50%, transparent 75%)'
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left 7 Columns: Hero Copy & Primary Actions */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-tabular font-semibold bg-[#52C7F5]/15 text-[#52C7F5] border border-[#52C7F5]/40">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Created for NASA Space Apps Challenge 2026 — The Earth Information Jukebox
            </span>
            <span className="text-xs font-mono-tabular text-[#9AA9BD] px-2.5 py-1 rounded-full bg-[#101C2D] border border-slate-800">
              One Planet. Countless Stories. Hear Them All.
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-[#F5F8FF] leading-[1.08]">
            LISTEN TO THE{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#52C7F5] via-[#57D6A0] to-[#FFC66D]">
              CHANGING PLANET.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#9AA9BD] max-w-2xl leading-relaxed">
            Discover the hidden rhythms of Earth. Explore NASA Earth science visualizations and transform environmental observations into immersive sound.
          </p>

          {/* Primary & Secondary CTA Buttons (Section 7A) */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => onExploreEarth('temperature', true)}
              className="px-6 py-3.5 rounded-xl bg-[#52C7F5] hover:bg-[#38BDF8] text-[#050914] font-display font-bold text-sm tracking-wide flex items-center gap-2.5 shadow-[0_0_28px_rgba(82,199,245,0.4)] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>EXPLORE EARTH</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('how-it-works')}
              className="px-5 py-3.5 rounded-xl bg-[#101C2D] hover:bg-slate-800 text-[#F5F8FF] border border-slate-700 font-display font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#52C7F5]" />
              <span>HOW IT WORKS</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('hear-change')}
              className="px-4 py-3.5 rounded-xl bg-[#8A7CFF]/15 hover:bg-[#8A7CFF]/25 text-[#F5F8FF] border border-[#8A7CFF]/40 font-display font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#8A7CFF]" />
              <span>HEAR THE CHANGE</span>
            </button>
          </div>

          {/* Floating Scientific Telemetry Indicators */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            <div className="rounded-xl bg-[#101C2D]/90 border border-slate-800 p-3">
              <div className="text-[11px] font-mono-tabular text-[#9AA9BD] uppercase">
                GISTEMP v4 (2024)
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#FFC66D] mt-0.5">
                +1.28 °C
              </div>
              <div className="text-[11px] text-[#9AA9BD]">
                Pitch → D5 (587.3 Hz)
              </div>
            </div>

            <div className="rounded-xl bg-[#101C2D]/90 border border-slate-800 p-3">
              <div className="text-[11px] font-mono-tabular text-[#9AA9BD] uppercase">
                NASA Altimetry GMSL
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#52C7F5] mt-0.5">
                +103.8 mm
              </div>
              <div className="text-[11px] text-[#9AA9BD]">
                Pulse → 155 BPM
              </div>
            </div>

            <div className="rounded-xl bg-[#101C2D]/90 border border-slate-800 p-3">
              <div className="text-[11px] font-mono-tabular text-[#9AA9BD] uppercase">
                OCO-2 Column XCO2
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#8A7CFF] mt-0.5">
                424.6 ppm
              </div>
              <div className="text-[11px] text-[#9AA9BD]">
                Modulation → 7.1 Hz
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Animated Earth Visual Frame & Acoustic Wave Preview */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-[#050914] shadow-2xl group">
            <img
              src="https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-07-01&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1000&HEIGHT=500"
              alt="NASA Earth Information Center Global Surface Air Temperature Visualization"
              className="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/40 to-transparent" />

            {/* Animated Sound-Wave Overlay */}
            <div className="absolute bottom-3 inset-x-3 bg-[#0A1220]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#52C7F5]/20 border border-[#52C7F5]/50 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-[#52C7F5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F8FF]">
                    Live Web Audio API Synthesis
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[#9AA9BD]">
                    NASA Aqua AIRS & GISTEMP v4 → Real-Time Sound
                  </div>
                </div>
              </div>

              {/* Animated SVG Waveform Bars */}
              <div className="flex items-end gap-1 h-7" aria-hidden="true">
                {[45, 75, 95, 60, 85, 100, 70, 50, 90, 65].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-[#52C7F5] to-[#57D6A0] animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 110}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick-Select Experience Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  id: 'temperature',
                  title: 'The Warming Planet',
                  sub: 'Temp Anomaly → Pitch',
                  icon: Flame,
                  color: '#FFC66D'
                },
                {
                  id: 'ocean',
                  title: 'The Water Rhythm',
                  sub: 'Water/SST → Pulse',
                  icon: Waves,
                  color: '#52C7F5'
                },
                {
                  id: 'atmosphere',
                  title: 'The Living Atmosphere',
                  sub: 'CO2/Wind → Timbre',
                  icon: Wind,
                  color: '#8A7CFF'
                }
              ] as const
            ).map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onExploreEarth(card.id, true)}
                  className="text-left p-3 rounded-xl bg-[#101C2D] hover:bg-slate-800/90 border border-slate-800 hover:border-[#52C7F5]/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                    <span className="text-[10px] font-mono-tabular text-[#52C7F5] opacity-80 group-hover:opacity-100">
                      LISTEN →
                    </span>
                  </div>
                  <div className="text-xs font-bold font-display text-[#F5F8FF] mt-1.5">
                    {experiences[card.id].shortTitle}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[#9AA9BD] mt-0.5">
                    {card.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
