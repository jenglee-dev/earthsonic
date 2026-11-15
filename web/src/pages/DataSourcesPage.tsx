import React, { useEffect, useState } from 'react';
import type { SourcesResponse } from '@earthsonic/shared';
import type { ClientProvenance } from '../types/dataStatus';
import { fetchSourcesDocumentation } from '../services/apiClient';
import { DataStatusBadge } from '../components/data/DataStatusBadge';
import { Accordion, Chip, GlassPanel, Tabs } from '../components/ui/Primitives';
import { ChevronRight, Cpu, Database, ExternalLink, Headphones, Satellite, ShieldCheck } from 'lucide-react';

interface DataSourcesPageProps {
  provenance: ClientProvenance;
}

const PROVENANCE_STAGES = [
  {
    id: 'source',
    title: 'Data Source',
    subtitle: 'Public Earth Science Archives',
    detail:
      'Public CSV/JSON scientific observations (NASA GISS GISTEMP v4, NASA LaRC POWER MERRA-2) and satellite frames retrieved with strict missing-value preservation and zero synthetic fabrication.',
    Icon: Satellite,
    color: '#52C7F5',
    isRound: true
  },
  {
    id: 'engine',
    title: 'EarthSonic Engine',
    subtitle: 'Creative Mapping',
    detail:
      'Validates payloads with Zod schemas, clamps observations into [0, 1] against documented baselines, and drives Web Audio synthesizers in real time without altering raw numbers.',
    Icon: Cpu,
    color: '#57D6A0',
    isRound: false
  },
  {
    id: 'insight',
    title: 'Educational Insight',
    subtitle: 'Inclusive Multisensory Learning',
    detail:
      'Enables students, educators, and blind or low-vision learners to perceive climate anomalies, ocean shifts, and atmospheric rhythms through both sight and sound.',
    Icon: Headphones,
    color: '#FFC66D',
    isRound: false
  }
];

export const DataSourcesPage: React.FC<DataSourcesPageProps> = ({ provenance }) => {
  const [tab, setTab] = useState<'datasets' | 'about'>('datasets');
  const [filterExp, setFilterExp] = useState<'all' | 'temperature' | 'ocean' | 'atmosphere'>('all');
  const [activeStage, setActiveStage] = useState(PROVENANCE_STAGES[0]);
  const [sourcesData, setSourcesData] = useState<SourcesResponse | null>(null);

  useEffect(() => {
    fetchSourcesDocumentation().then((res) => {
      if (res.ok) setSourcesData(res.data);
    });
  }, []);

  const fallbackCards = [
    {
      id: 'gistemp',
      experienceId: 'temperature',
      name: 'NASA GISS Surface Temperature Analysis (GISTEMP v4)',
      provider: 'NASA Goddard Institute for Space Studies (GISS)',
      variable: 'Global Land-Ocean Temperature Anomaly (J-D)',
      unit: '°C',
      period: '1880–Present (Baseline 1951–1980)',
      url: 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv'
    },
    {
      id: 'power-ocean',
      experienceId: 'ocean',
      name: 'The Water Rhythm: Satellite Altimetry GMSL / GHRSST (Demo) + NASA POWER Sector',
      provider: 'NASA PO.DAAC / Sentinel-6 (Global) & NASA LaRC POWER (Regional Grid)',
      variable: 'Global Mean Sea Level & SST (bundled) · Regional MERRA-2 Precipitation when live grid queried',
      unit: '°C / mm GMSL (bundled) · mm/day (POWER)',
      period: '1993–2024 Global Reference · Monthly POWER Sector',
      url: 'https://sealevel.nasa.gov/'
    },
    {
      id: 'power-atmosphere',
      experienceId: 'atmosphere',
      name: 'The Living Atmosphere: OCO-2 Column XCO2 (Demo) + NASA POWER Wind',
      provider: 'NASA OCO-2 Science Team (Global) & NASA LaRC POWER (Regional Grid)',
      variable: 'Column-Averaged Dry-Air CO2 XCO2 (bundled) · Regional 10m Wind Speed when live grid queried',
      unit: 'ppm (bundled) · m/s (POWER)',
      period: '2014–2024 Global Reference · Monthly POWER Sector',
      url: 'https://ocov2.jpl.nasa.gov/'
    }
  ];

  const cards = (sourcesData?.sources
    ? sourcesData.sources.map((s) => ({
        id: s.id,
        experienceId: s.experienceId,
        name: s.name,
        provider: s.provider,
        variable: s.variable,
        unit: s.unit,
        period: s.observationPeriod || s.referencePeriod || 'Current Archive',
        url: s.sourceUrl
      }))
    : fallbackCards
  ).filter((c) => filterExp === 'all' || c.experienceId === filterExp);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Slide-12 Top Frosted Header Pill + Tabs */}
      <GlassPanel elevation={3} accentColor="#52C7F5" className="p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#52C7F5] inline-flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                Scientific Transparency &amp; Provenance
              </span>
              <DataStatusBadge provenance={provenance} compact />
            </div>
            <h1 className="text-2xl sm:text-3xl font-tech font-medium title-gradient-soft">
              Scientific Transparency and Educational Impact
            </h1>
          </div>

          <Tabs
            ariaLabel="Data and About sections"
            activeId={tab}
            onChange={(id) => setTab(id as 'datasets' | 'about')}
            items={[
              { id: 'datasets', label: 'Datasets & Provenance' },
              { id: 'about', label: 'About & Disclaimer' }
            ]}
          />
        </div>

        <div className="rounded-2xl bg-[#071122]/85 border border-white/12 px-5 py-3.5 text-sm sm:text-base text-[#DCE8F8] leading-relaxed">
          Every sound is grounded in documented NASA Earth observations and public Visible Earth imagery. EarthSonic operates as an independent educational tool — transparently separating original scientific data from creative acoustic mappings.
        </div>

        {tab === 'datasets' ? (
          <div className="space-y-6">
            {/* Slide-12 Signature Data Provenance Flowchart (Generic Satellite Icon, NO NASA Logo) */}
            <div className="rounded-3xl bg-[#071122]/90 border border-[#9EC5FF]/20 p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-display font-normal text-[#F5F8FF]">
                  Data Provenance Flowchart
                </h2>
                <span className="text-xs font-mono-tabular text-[#A9BAD0]">
                  Click any node to inspect
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
                {PROVENANCE_STAGES.map((st, idx) => {
                  const Icon = st.Icon;
                  const active = activeStage.id === st.id;
                  return (
                    <React.Fragment key={st.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStage(st)}
                        className="flex flex-col items-center gap-3 text-center group cursor-pointer focus:outline-none min-w-[160px]"
                      >
                        <div
                          className={`w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center border-2 transition-all ${
                            st.isRound ? 'rounded-full' : 'rounded-3xl'
                          } ${active ? 'scale-105' : 'opacity-90 group-hover:opacity-100'}`}
                          style={{
                            backgroundColor: active ? `${st.color}24` : 'rgba(12, 24, 44, 0.85)',
                            borderColor: active ? st.color : `${st.color}55`,
                            boxShadow: active ? `0 0 32px ${st.color}48` : `0 0 18px ${st.color}18`
                          }}
                        >
                          <Icon className="w-12 h-12" style={{ color: st.color }} />
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-display font-semibold text-[#F5F8FF]">
                            {st.title}
                          </div>
                          <div className="text-xs font-mono-tabular text-[#A9BAD0]">{st.subtitle}</div>
                        </div>
                      </button>

                      {idx < PROVENANCE_STAGES.length - 1 && (
                        <ChevronRight
                          aria-hidden="true"
                          className="w-8 h-8 text-[#7CE8FF]/70 rotate-90 md:rotate-0 shrink-0"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <p className="text-sm text-[#F5F8FF] bg-[#050A16] border border-white/10 rounded-2xl p-4">
                <strong style={{ color: activeStage.color }}>{activeStage.title}:</strong> {activeStage.detail}
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'temperature', 'ocean', 'atmosphere'] as const).map((f) => (
                <Chip key={f} active={filterExp === f} onClick={() => setFilterExp(f)}>
                  {f === 'all' ? 'All Experiences' : f}
                </Chip>
              ))}
            </div>

            {/* Dataset Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card) => (
                <div key={card.id} className="rounded-2xl bg-[#050914] border border-[#1E2E48] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-display font-bold text-[#F5F8FF]">{card.name}</h2>
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono-tabular text-[#52C7F5] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-xs font-mono-tabular text-[#A9BAD0] space-y-1">
                    <div><strong className="text-[#F5F8FF]">Provider:</strong> {card.provider}</div>
                    <div><strong className="text-[#F5F8FF]">Variable:</strong> {card.variable}</div>
                    <div><strong className="text-[#F5F8FF]">Period:</strong> {card.period}</div>
                  </div>
                  <Accordion title="3-Way Distinction: NASA Data vs. Processing vs. Sound">
                    <ul className="space-y-1.5 text-xs text-[#A9BAD0]">
                      <li><strong className="text-[#F5F8FF]">1. Original NASA observation:</strong> {card.variable} ({card.unit}).</li>
                      <li><strong className="text-[#F5F8FF]">2. EarthSonic processing:</strong> Validated with Zod, preserving missing data as null, normalized to [0, 1].</li>
                      <li><strong className="text-[#F5F8FF]">3. Creative audio mapping:</strong> Scale pitches, pulse subdivisions, and synth voices designed for clarity.</li>
                    </ul>
                  </Accordion>
                </div>
              ))}
            </div>

            {/* Verified Offline Gazetteer & Imagery Attributions */}
            <div className="rounded-2xl bg-[#050914]/90 border border-[#1E2E48] p-4 sm:p-5 space-y-3">
              <h2 className="text-sm font-display font-bold text-[#F5F8FF]">
                Geographic Gazetteer &amp; Earth Imagery Licenses
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#A9BAD0]">
                <div className="rounded-xl bg-[#091224] border border-white/10 p-3 space-y-1">
                  <div className="font-mono-tabular font-bold text-[#52C7F5]">
                    GeoNames Cities Gazetteer (CC BY 4.0)
                  </div>
                  <p>
                    World cities (population &ge; 15,000), administrative level-1 codes, and country metadata bundled for 100% offline place lookup.
                  </p>
                  <a
                    href="https://www.geonames.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#52C7F5] hover:underline font-mono-tabular"
                  >
                    <span>geonames.org (CC BY 4.0)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="rounded-xl bg-[#091224] border border-white/10 p-3 space-y-1">
                  <div className="font-mono-tabular font-bold text-[#57D6A0]">
                    Natural Earth Vector Geography (Public Domain)
                  </div>
                  <p>
                    Country boundaries (110m), major admin regions, oceans, seas, deserts, basins, mountain ranges, and polar areas, plus NASA Visible Earth Blue Marble &amp; Black Marble imagery.
                  </p>
                  <a
                    href="https://www.naturalearthdata.com/about/terms-of-use/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#57D6A0] hover:underline font-mono-tabular"
                  >
                    <span>naturalearthdata.com (Public Domain)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#050914] border border-[#1E2E48] p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-display font-bold text-[#52C7F5]">
                <ShieldCheck className="w-5 h-5" />
                <span>Independent Educational Project — Not an Official NASA Product</span>
              </div>
              <p className="text-sm text-[#A9BAD0] leading-relaxed">
                EarthSonic was built for the NASA Space Apps Challenge 2026 to make Earth science observations accessible through real-time Web Audio sonification. All underlying datasets, globe Blue Marble / Black Marble imagery, and EOSDIS frames remain the property of NASA and their respective science teams.
              </p>
              <p className="text-sm text-[#A9BAD0] leading-relaxed">
                EarthSonic never displays logos implying agency endorsement and never invents data points: when live APIs or snapshots are unavailable, the interface explicitly labels local cached or demonstration status via the DataStatus badge.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Disclaimer Strip matching Slide-12 */}
        <div className="rounded-2xl bg-[#071122]/80 border border-white/10 px-5 py-3 text-center text-xs sm:text-sm text-[#A9BAD0]">
          EarthSonic is an independent educational project created for NASA Space Apps Challenge 2026. Data and visualisations remain property of their respective sources.
        </div>
      </GlassPanel>
    </div>
  );
};
