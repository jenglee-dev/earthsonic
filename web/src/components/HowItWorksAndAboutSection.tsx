import React from 'react';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import type { DataPoint, EarthExperience } from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';
import { DataStatusBadge } from './data/DataStatusBadge';
import {
  BookOpen,
  ExternalLink,
  Headphones,
  ShieldCheck,
  Table
} from 'lucide-react';

interface HowItWorksAndAboutSectionProps {
  activeExperience: EarthExperience;
  activeSeries: DataPoint[];
  provenance: ClientProvenance;
  accessibilityMode: boolean;
}

export const HowItWorksAndAboutSection: React.FC<HowItWorksAndAboutSectionProps> = ({
  activeExperience,
  activeSeries,
  provenance,
  accessibilityMode
}) => {
  const allExperiences = Object.values(EARTH_EXPERIENCES);

  return (
    <section
      aria-label="How It Works, Scientific Data Transparency, and About EarthSonic"
      className="flex flex-col gap-6"
    >
      {/* 1. UNDERSTAND THE SOUND (Section 15) */}
      <div className="rounded-3xl bg-[#101C2D] border border-[#1E2E48] p-6 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
          <Headphones className="w-5 h-5 text-[#52C7F5]" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F5F8FF]">
              UNDERSTAND THE SOUND
            </h2>
            <p className="text-xs text-[#9AA9BD]">
              Plain-language educational guide to scientific sonification ({activeExperience.shortTitle})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#0A1220] border border-slate-800 p-5">
            <div className="text-xs font-mono-tabular uppercase text-[#52C7F5] font-bold mb-1.5">
              1. What You’re Hearing
            </div>
            <p className="text-sm text-[#F5F8FF] leading-relaxed">
              The pitch rises as the selected scientific variable ({activeExperience.mappings.pitch.variableName}) increases relative to the dataset’s reference range ({activeExperience.mappings.pitch.minData} to {activeExperience.mappings.pitch.maxData} {activeExperience.mappings.pitch.unit}). Rhythmic pulse density ({activeExperience.mappings.rhythm.minAudio}–{activeExperience.mappings.rhythm.maxAudio} BPM) and harmonic filter brightness respond to secondary and tertiary observations.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0A1220] border border-slate-800 p-5">
            <div className="text-xs font-mono-tabular uppercase text-[#57D6A0] font-bold mb-1.5">
              2. What The Data Tells Us
            </div>
            <p className="text-sm text-[#F5F8FF] leading-relaxed">
              {activeExperience.scientificOverview}
            </p>
          </div>

          <div className="rounded-2xl bg-[#0A1220] border border-slate-800 p-5">
            <div className="text-xs font-mono-tabular uppercase text-[#FFC66D] font-bold mb-1.5">
              3. Why Sound Helps
            </div>
            <p className="text-sm text-[#F5F8FF] leading-relaxed">
              The human auditory system excels at detecting temporal rhythm, pitch contour, and harmonic tension over time. Sonification reveals multi-decadal accelerations, seasonal breathing cycles, and anomalies that may be overlooked in static tables, while making Earth science inclusive for blind and low-vision learners.
            </p>
          </div>
        </div>
      </div>

      {/* 2. HOW THE SOUND IS CREATED (Section 13) */}
      <div className="rounded-3xl bg-[#101C2D] border border-[#1E2E48] p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#8A7CFF]" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F5F8FF]">
                HOW THE SOUND IS CREATED & SCIENTIFIC TRANSPARENCY
              </h2>
              <p className="text-xs text-[#9AA9BD]">
                Clear distinction between NASA observational data, mathematical normalization, and creative acoustic design
              </p>
            </div>
          </div>
          <DataStatusBadge provenance={provenance} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#050914] border border-slate-800 p-4">
            <div className="text-xs font-mono-tabular text-[#52C7F5] font-bold uppercase mb-1">
              Step A · Authentic NASA Source Data
            </div>
            <p className="text-xs text-[#9AA9BD] leading-relaxed">
              We retrieve documented observations from NASA GISS (GISTEMP v4), NASA JPL PO.DAAC (GHRSST & Altimetry GMSL), NASA OCO-2/MODIS, and live NASA Langley POWER MERRA-2 APIs, paired with authentic NASA GIBS Worldview & SVS visual frames.
            </p>
          </div>

          <div className="rounded-2xl bg-[#050914] border border-slate-800 p-4">
            <div className="text-xs font-mono-tabular text-[#57D6A0] font-bold uppercase mb-1">
              Step B · Mathematical Normalization
            </div>
            <p className="text-xs text-[#9AA9BD] leading-relaxed">
              Each raw scientific measurement <code className="text-[#F5F8FF]">x</code> is validated and linearly normalized against its documented domain <code className="text-[#F5F8FF]">[min, max]</code>:
              <br />
              <code className="text-[#57D6A0] font-mono-tabular block mt-1">
                normalized = clamp((x - min) / (max - min), 0, 1)
              </code>
              Missing or invalid values are never silently treated as zero.
            </p>
          </div>

          <div className="rounded-2xl bg-[#050914] border border-slate-800 p-4">
            <div className="text-xs font-mono-tabular text-[#FFC66D] font-bold uppercase mb-1">
              Step C · Creative Web Audio Synthesis
            </div>
            <p className="text-xs text-[#9AA9BD] leading-relaxed">
              Normalized values drive native browser <code className="text-[#F5F8FF]">OscillatorNode</code> frequency, <code className="text-[#F5F8FF]">BiquadFilterNode</code> cutoff, and rhythmic pulse density. These acoustic mappings are creative design choices for human perception—not physical acoustic waves traveling through Earth’s atmosphere.
            </p>
          </div>
        </div>

        {/* Complete NASA Dataset Provenance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          {allExperiences.map((exp) => (
            <div
              key={exp.id}
              className="rounded-2xl bg-[#0A1220] border border-slate-800 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono-tabular font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${exp.themeColor}20`,
                      color: exp.themeColor
                    }}
                  >
                    {exp.badgeText}
                  </span>
                  <a
                    href={exp.nasaSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono-tabular text-[#52C7F5] hover:underline inline-flex items-center gap-1"
                  >
                    Official NASA Source
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h3 className="text-sm font-bold font-display text-[#F5F8FF]">
                  {exp.title}
                </h3>

                <div className="text-xs text-[#9AA9BD] space-y-1 font-mono-tabular">
                  <div>
                    <strong className="text-[#F5F8FF]">Dataset:</strong> {exp.datasetTitle}
                  </div>
                  <div>
                    <strong className="text-[#F5F8FF]">Primary Variable:</strong>{' '}
                    {exp.mappings.pitch.variableName} ({exp.mappings.pitch.unit})
                  </div>
                  <div>
                    <strong className="text-[#F5F8FF]">Documented Range:</strong> [
                    {exp.mappings.pitch.minData}, {exp.mappings.pitch.maxData}{' '}
                    {exp.mappings.pitch.unit}]
                  </div>
                  <div>
                    <strong className="text-[#F5F8FF]">Coverage:</strong> Global & Sentinel Observatory Coordinates
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#9AA9BD] border-t border-slate-800 pt-2">
                {exp.nasaCitation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Accessible Text-Based Data Table Alternative (Section 14) */}
      {accessibilityMode && (
        <div
          role="region"
          aria-label="Accessible Text-Based Data Table"
          className="rounded-3xl bg-[#101C2D] border-2 border-[#52C7F5] p-6 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <Table className="w-5 h-5 text-[#52C7F5]" />
            <h3 className="text-lg font-bold font-display text-[#F5F8FF]">
              Accessibility Mode: Text-Based Scientific Data & Sonification Table ({activeExperience.shortTitle})
            </h3>
          </div>
          <p className="text-xs text-[#F5F8FF] mb-4">
            Complete tabular alternative to the visual chart and NASA satellite frames for screen-reader navigation.
          </p>

          <div className="overflow-x-auto max-h-80 rounded-xl border border-slate-700">
            <table className="w-full text-left border-collapse text-xs font-mono-tabular">
              <thead className="bg-[#050914] text-[#52C7F5] sticky top-0">
                <tr>
                  <th className="p-2.5 border-b border-slate-700">Step</th>
                  <th className="p-2.5 border-b border-slate-700">Observation Date</th>
                  <th className="p-2.5 border-b border-slate-700">
                    {activeExperience.mappings.pitch.variableName} ({activeExperience.mappings.pitch.unit})
                  </th>
                  <th className="p-2.5 border-b border-slate-700">
                    {activeExperience.mappings.rhythm.variableName} ({activeExperience.mappings.rhythm.unit})
                  </th>
                  <th className="p-2.5 border-b border-slate-700">
                    {activeExperience.mappings.intensity.variableName} ({activeExperience.mappings.intensity.unit})
                  </th>
                  <th className="p-2.5 border-b border-slate-700">Scientific Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-[#0A1220]">
                {activeSeries.map((pt) => (
                  <tr key={pt.index} className="hover:bg-slate-800/60">
                    <td className="p-2.5 text-[#9AA9BD]">{pt.index + 1}</td>
                    <td className="p-2.5 font-bold text-[#F5F8FF]">{pt.dateLabel}</td>
                    <td className="p-2.5 text-[#FFC66D]">{pt.primaryValue}</td>
                    <td className="p-2.5 text-[#52C7F5]">{pt.secondaryValue}</td>
                    <td className="p-2.5 text-[#57D6A0]">{pt.tertiaryValue}</td>
                    <td className="p-2.5 text-[#F5F8FF]">{pt.annotation || 'Standard observation'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Required Visible Disclaimer & Project Identity Footer Banner (Section 13) */}
      <div className="rounded-2xl bg-[#0A1220] border border-slate-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#57D6A0] shrink-0 mt-0.5" />
          <div className="text-xs text-[#9AA9BD] leading-relaxed">
            <strong className="text-[#F5F8FF] block mb-0.5">
              Official Challenge Attribution & Scientific Disclaimer
            </strong>
            EarthSonic is an independent educational project created for NASA Space Apps Challenge 2026. It is not an official NASA product. NASA data and visualizations remain the property of their respective owners and are credited to their sources.
          </div>
        </div>

        <a
          href="https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3.5 py-2 rounded-xl bg-[#101C2D] hover:bg-slate-800 border border-slate-700 text-xs font-mono-tabular text-[#52C7F5] inline-flex items-center gap-1.5"
        >
          <span>2026 Challenge Brief</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  );
};
