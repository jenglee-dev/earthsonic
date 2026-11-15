import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EARTHSONIC_KEYMAP } from '../config/keymap';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import {
  isEffectiveReducedMotionActive,
  useAccessibilityStore
} from '../store/useAccessibilityStore';
import { sonificationEngine } from '../audio/sonificationEngine';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import {
  Accordion,
  Chip,
  GlassPanel,
  KeyCap,
  SearchBox,
  SectionHeader,
  StepCarousel
} from '../components/ui/Primitives';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Contrast,
  Copy,
  Keyboard,
  MessageSquare,
  Pause,
  Play,
  ScanEye,
  ThumbsDown,
  ThumbsUp,
  Volume2
} from 'lucide-react';

const InteractiveGlobe = lazy(() =>
  import('../components/earth/InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe }))
);

const GUIDE_SECTIONS = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'task-finder', label: 'I Want To...' },
  { id: 'explorer', label: 'Explorer' },
  { id: 'globe', label: 'Practice Globe' },
  { id: 'chart', label: 'Practice Chart' },
  { id: 'hear-the-change', label: 'Hear Change & Orchestra' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'glossary', label: 'Glossary' }
];

const QUICK_START_STEPS = [
  { id: 'pick', title: '1. Pick an experience', body: 'Open Warming Planet, Water Rhythm, or Living Atmosphere.', to: '/explorer?exp=warming' },
  { id: 'play', title: '2. Press Play', body: 'Press Spacebar or Play Sonification in the sticky top transport deck below the tabs.', to: '/explorer?exp=ocean' },
  { id: 'spin', title: '3. Turn the globe', body: 'Drag the 3D Earth or press Enter on the Globe Controller to pick a site.', to: '/explorer?exp=atmosphere' },
  { id: 'diff', title: '4. Hear the difference', body: 'Compare two dates with a continuous pitch glide.', to: '/hear-the-change' }
];

const TASK_FINDER = [
  {
    id: 'temp',
    label: 'Hear temperature change',
    steps: ['Open Earth Explorer', 'Select Warming Planet', 'Press Play or scrub the timeline'],
    to: '/explorer?exp=warming'
  },
  {
    id: 'place',
    label: 'Pick a place on Earth',
    steps: ['Choose Water Rhythm or Living Atmosphere', 'Rotate the 3D globe or click Locations', 'Press Select this location'],
    to: '/explorer?exp=ocean'
  },
  {
    id: 'compare',
    label: 'Compare two years',
    steps: ['Open Hear the Change', 'Select Observation A and Observation B', 'Press HEAR THE DIFFERENCE'],
    to: '/hear-the-change'
  },
  {
    id: 'keyboard',
    label: 'Use it with a keyboard',
    steps: ['Tab to the 3D globe region', 'Use Arrow keys to spin and +/- to zoom', 'Press Spacebar to play or pause'],
    to: '/explorer'
  },
  {
    id: 'screen-reader',
    label: 'Use without seeing the screen',
    steps: ['Toggle A11y ON in the top bar', 'Use View as text on the chart', 'Listen to live audio & polite announcements'],
    to: '/explorer'
  },
  {
    id: 'install',
    label: 'Install the app',
    steps: ['Click Install App in the top bar', 'Or choose Add to Home Screen in Safari/Chrome', 'Open offline anytime'],
    to: '/data'
  }
];

const GLOSSARY_TERMS = [
  { term: 'Anomaly', def: 'How far a measurement sits above or below a long-term baseline average (such as 1951–1980).' },
  { term: 'Sonification', def: 'Translating scientific numbers into sound (pitch, rhythm, timbre) without pre-recorded audio.' },
  { term: 'Normalization', def: 'Scaling raw values into a 0 to 1 range so different datasets can drive audio parameters cleanly.' },
  { term: 'Pitch', def: 'How high or low a musical tone sounds in Hertz (Hz), mapped here to temperature anomaly, sea surface temperature, CO2 ppm, or regional NASA POWER rate.' },
  { term: 'Pulse Density', def: 'How many rhythmic beats per minute (BPM) play, driven by Global Mean Sea Level rise (mm), ocean variability, or regional precipitation when POWER grid is loaded.' },
  { term: 'Modulation', def: 'How fast a filter or timbre sweeps, driven by column CO2 / aerosol depth or tropospheric wind speed in Living Atmosphere.' },
  { term: 'GISTEMP v4', def: 'NASA Goddard Institute for Space Studies global surface temperature anomaly record.' },
  { term: 'NASA POWER', def: 'NASA Langley API providing solar, temperature, wind, and precipitation series at any lat/lon.' }
];

const PRACTICE_CHART_DATA = [
  { label: 'P1', val: 0.2 },
  { label: 'P2', val: 0.45 },
  { label: 'P3', val: 0.35 },
  { label: 'P4', val: 0.7 },
  { label: 'P5', val: 0.85 },
  { label: 'P6', val: 0.6 }
];

const VISITED_KEY = 'earthsonic_quickstart_visited_v1';

interface UserGuidePageProps {
  onRetryBackend: () => Promise<void>;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onRetryBackend }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const accessibilityMode = useEarthSonicStore((s) => s.accessibilityMode);
  const setAccessibilityMode = useEarthSonicStore((s) => s.setAccessibilityMode);
  const use2DMapFallback = useEarthSonicStore((s) => s.use2DMapFallback);
  const setUse2DMapFallback = useEarthSonicStore((s) => s.setUse2DMapFallback);
  const lowQualityMode = useEarthSonicStore((s) => s.lowQualityMode);
  const setLowQualityMode = useEarthSonicStore((s) => s.setLowQualityMode);
  const volume = useEarthSonicStore((s) => s.volume);
  const setVolume = useEarthSonicStore((s) => s.setVolume);
  const playbackSpeed = useEarthSonicStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useEarthSonicStore((s) => s.setPlaybackSpeed);
  const restartTour = useEarthSonicStore((s) => s.restartTour);
  const [a11yAudioTesting, setA11yAudioTesting] = useState(false);

  const [search, setSearch] = useState('');
  const [visitedSteps, setVisitedSteps] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(VISITED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedTask, setSelectedTask] = useState(TASK_FINDER[0]);
  const [inputMode, setInputMode] = useState<'Mouse' | 'Touch' | 'Keyboard'>('Mouse');
  const [practiceChecklist, setPracticeChecklist] = useState({
    rotate: false,
    zoom_in: false,
    zoom_out: false,
    pin: false,
    reset: false
  });
  const [practiceLat, setPracticeLat] = useState(15);
  const [practiceLon, setPracticeLon] = useState(-45);
  const [practiceIdx, setPracticeIdx] = useState(2);
  const [pressedCode, setPressedCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [helpfulVote, setHelpfulVote] = useState<'up' | 'down' | null>(null);
  const [practiceGlobeVisible, setPracticeGlobeVisible] = useState(false);
  const practiceGlobeRef = useRef<HTMLDivElement | null>(null);

  // Scroll to hash anchor on load
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      el?.scrollIntoView({
        behavior: isEffectiveReducedMotionActive() ? 'auto' : 'smooth',
        block: 'start'
      });
    }
  }, [location.hash]);

  // Lazy-mount Practice Globe only when scrolled into view
  useEffect(() => {
    const el = practiceGlobeRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPracticeGlobeVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Highlight pressed key in Shortcuts table
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setPressedCode(e.code);
      setTimeout(() => setPressedCode(null), 500);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const markVisited = (id: string, to: string) => {
    const next = Array.from(new Set([...visitedSteps, id]));
    setVisitedSteps(next);
    try {
      localStorage.setItem(VISITED_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    navigate(to);
  };

  const copyAnchor = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EARTHSONIC_KEYMAP;
    return EARTHSONIC_KEYMAP.filter(
      (s) => s.action.toLowerCase().includes(q) || s.keyLabel.toLowerCase().includes(q) || s.scope.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredGlossary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(
      (g) => g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q)
    );
  }, [search]);

  const matchingSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
  }, [search]);

  const playSafeTestTone = () => {
    sonificationEngine.playDataStep({
      point: { index: 0, dateLabel: 'Test Tone', isoDate: '2024-01-01', primaryValue: 0.4, secondaryValue: 6, tertiaryValue: 0.5 },
      experienceId: 'temperature',
      mappings: EARTH_EXPERIENCES.temperature.mappings,
      durationSec: 0.9,
      gainTrim: 0.45
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel elevation={3} accentColor="#57D6A0" className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#57D6A0] inline-flex items-center gap-1.5 mb-1">
              <BookOpen className="w-4 h-4" />
              Interactive 60-Second Guide
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#F5F8FF]">
              How to Use EarthSonic
            </h1>
            <p className="text-sm text-[#9AA9BD] mt-1">
              Task-based, hands-on walkthroughs. Practice tools below never trigger audio or API calls.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search guide, shortcuts, glossary..."
              ariaLabel="Search User Guide"
            />
          </div>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {search
            ? `Found ${matchingSections.length} sections, ${filteredShortcuts.length} shortcuts, and ${filteredGlossary.length} glossary terms.`
            : ''}
        </div>

        {search && matchingSections.length === 0 && filteredShortcuts.length === 0 && filteredGlossary.length === 0 && (
          <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 text-xs text-[#9AA9BD]">
            No guide matches for "{search}". Try clicking a task chip in "I Want To..." below.
          </div>
        )}
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Section Nav (Desktop) / Horizontal Scroll Chips (Mobile) */}
        <nav
          aria-label="User Guide Sections"
          className="lg:col-span-3 lg:sticky lg:top-20 flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0"
        >
          {GUIDE_SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A1220] hover:bg-[#101C2D] border border-[#1E2E48] text-xs font-display font-semibold text-[#F5F8FF] whitespace-nowrap inline-flex items-center justify-between"
            >
              <span>{sec.label}</span>
            </a>
          ))}
        </nav>

        {/* Right Content Sections */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* 1. QUICK START */}
          <GlassPanel id="quick-start" elevation={2} className="p-5 space-y-4 scroll-mt-24">
            <SectionHeader
              eyebrow={`Progress: ${visitedSteps.length} / ${QUICK_START_STEPS.length} visited`}
              title="1. Quick Start Stepper"
              subtitle="Follow these four steps to explore EarthSonic in under a minute."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_START_STEPS.map((st) => {
                const done = visitedSteps.includes(st.id);
                return (
                  <div key={st.id} className="rounded-2xl bg-[#050914] border border-[#1E2E48] p-4 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-display font-bold text-[#F5F8FF]">{st.title}</span>
                        {done && <CheckCircle2 className="w-4 h-4 text-[#57D6A0]" />}
                      </div>
                      <p className="text-xs text-[#9AA9BD] mt-1">{st.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => markVisited(st.id, st.to)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#52C7F5]/15 hover:bg-[#52C7F5]/25 border border-[#52C7F5]/50 text-[#52C7F5] text-xs font-mono-tabular font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Show me</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* 2. I WANT TO... TASK FINDER */}
          <GlassPanel id="task-finder" elevation={2} className="p-5 space-y-4 scroll-mt-24">
            <SectionHeader title="2. I Want To..." subtitle="Pick a goal to get a 3-step path." />
            <div className="flex flex-wrap gap-2">
              {TASK_FINDER.map((t) => (
                <Chip key={t.id} active={selectedTask.id === t.id} onClick={() => setSelectedTask(t)}>
                  {t.label}
                </Chip>
              ))}
            </div>
            <div className="rounded-2xl bg-[#050914] border border-[#1E2E48] p-4 flex flex-wrap items-center justify-between gap-4">
              <ol className="space-y-1 text-xs text-[#F5F8FF] list-decimal list-inside">
                {selectedTask.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <Link
                to={selectedTask.to}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#57D6A0] text-[#050914] font-display font-bold text-xs inline-flex items-center gap-1.5"
              >
                <span>Take me there</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </GlassPanel>

          {/* 3. EXPLORER GUIDE */}
          <GlassPanel id="explorer" elevation={2} className="p-5 space-y-4 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionHeader title="3. Earth Explorer Controls" subtitle="Swap input modes below." />
              <div className="flex gap-1.5">
                {(['Mouse', 'Touch', 'Keyboard'] as const).map((m) => (
                  <Chip key={m} active={inputMode === m} onClick={() => setInputMode(m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            </div>
            <StepCarousel
              steps={[
                {
                  badge: inputMode,
                  title: 'Choose Experience',
                  body: 'Pick Warming Planet, Water Rhythm, or Living Atmosphere at the top of Earth Explorer.'
                },
                {
                  badge: inputMode,
                  title: 'Control Playback',
                  body:
                    inputMode === 'Keyboard'
                      ? 'Press Spacebar to Play/Pause and Left/Right arrows to step observations.'
                      : inputMode === 'Touch'
                      ? 'Tap Play in the sticky top transport deck and drag the timeline scrubber.'
                      : 'Click Play Sonification or click any point on the telemetry chart.'
                },
                {
                  badge: inputMode,
                  title: 'Explore the Stage',
                  body:
                    inputMode === 'Keyboard'
                      ? 'Focus the globe and use Arrows to spin, +/- to zoom, Enter to select.'
                      : 'Toggle Interact ON on mobile, drag to spin, and switch to NASA Visualization anytime.'
                }
              ]}
            />
          </GlassPanel>

          {/* 4. PRACTICE GLOBE */}
          <GlassPanel id="globe" elevation={2} className="p-5 space-y-4 scroll-mt-24">
            <SectionHeader
              title="4. Practice Globe Sandbox"
              subtitle="Complete all 5 actions below. Starts no audio and makes no API calls."
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['rotate', 'Rotate'],
                  ['zoom_in', 'Zoom in'],
                  ['zoom_out', 'Zoom out'],
                  ['pin', 'Drop a pin'],
                  ['reset', 'Reset view']
                ] as const
              ).map(([k, label]) => (
                <span
                  key={k}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono-tabular border inline-flex items-center gap-1.5 ${
                    practiceChecklist[k]
                      ? 'bg-[#57D6A0]/20 border-[#57D6A0] text-[#57D6A0]'
                      : 'bg-[#050914] border-[#1E2E48] text-[#9AA9BD]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </span>
              ))}
            </div>
            <div ref={practiceGlobeRef}>
              {practiceGlobeVisible ? (
                <Suspense fallback={<div className="h-[320px] rounded-2xl bg-[#050914] p-4 text-xs">Loading Practice Globe...</div>}>
                  <InteractiveGlobe
                    mode="practice"
                    experienceId="ocean"
                    accentColor="#52C7F5"
                    lat={practiceLat}
                    lon={practiceLon}
                    onSelectLocation={(la, lo) => {
                      setPracticeLat(la);
                      setPracticeLon(lo);
                    }}
                    onPracticeAction={(act) =>
                      setPracticeChecklist((prev) => ({ ...prev, [act]: true }))
                    }
                    heightClass="h-[320px]"
                  />
                </Suspense>
              ) : (
                <div className="h-[320px] rounded-2xl bg-[#050914] border border-[#1E2E48] flex items-center justify-center text-xs font-mono-tabular text-[#9AA9BD]">
                  Practice Globe loads when scrolled into view...
                </div>
              )}
            </div>
          </GlassPanel>

          {/* 5. PRACTICE CHART */}
          <GlassPanel id="chart" elevation={2} className="p-5 space-y-3 scroll-mt-24">
            <SectionHeader
              eyebrow="Practice data (not real)"
              title="5. Practice Chart Scrubbing"
              subtitle="Tap any practice bar below to test scrubbing. Practice data (not real)."
            />
            <div className="flex items-end gap-2 h-28 rounded-2xl bg-[#050914] border border-[#1E2E48] p-4">
              {PRACTICE_CHART_DATA.map((d, i) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setPracticeIdx(i)}
                  className="flex-1 rounded-t-lg transition-all cursor-pointer flex flex-col justify-end items-center pb-1 text-[10px] font-mono-tabular"
                  style={{
                    height: `${Math.round(d.val * 100)}%`,
                    backgroundColor: i === practiceIdx ? '#57D6A0' : '#1E2E48',
                    color: i === practiceIdx ? '#050914' : '#9AA9BD'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono-tabular text-[#9AA9BD]">
              Practice data (not real) · Selected: <strong className="text-[#F5F8FF]">{PRACTICE_CHART_DATA[practiceIdx].label}</strong> (value {PRACTICE_CHART_DATA[practiceIdx].val})
            </div>
          </GlassPanel>

          {/* 6. HEAR THE CHANGE & ORCHESTRA */}
          <GlassPanel id="hear-the-change" elevation={2} className="p-5 space-y-4 scroll-mt-24">
            <SectionHeader title="6. Hear the Change & Earth Orchestra" />
            <div id="orchestra" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <StepCarousel
                  accentColor="#FFC66D"
                  steps={[
                    { title: '1. Choose dataset', body: 'Pick Temperature, Water, or Atmosphere.' },
                    { title: '2. Pick A and B', body: 'Use the A and B sliders or swap orbs.' },
                    { title: '3. Hear the glide', body: 'Press HEAR THE DIFFERENCE for the pitch transition.' }
                  ]}
                />
                <Link to="/hear-the-change" className="text-xs font-mono-tabular text-[#FFC66D] hover:underline inline-flex items-center gap-1">
                  Open Hear the Change <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                <StepCarousel
                  accentColor="#52C7F5"
                  steps={[
                    { title: '1. Pick shared site', body: 'Click Location to choose a spot for all layers.' },
                    { title: '2. Mix layers', body: 'Toggle or Solo Temperature, Rain, and Wind.' },
                    { title: '3. Play together', body: 'Press Play Orchestra to hear the combined mix.' }
                  ]}
                />
                <Link to="/orchestra" className="text-xs font-mono-tabular text-[#52C7F5] hover:underline inline-flex items-center gap-1">
                  Open Earth Orchestra <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </GlassPanel>

          {/* 7. ACCESSIBILITY (Slide 11 Visual Fidelity: Universal Accessibility & Auditory Control) */}
          <GlassPanel id="accessibility" elevation={2} accentColor="#52C7F5" className="p-5 sm:p-7 space-y-5 scroll-mt-24">
            <SectionHeader
              variant="tech"
              title="Universal Accessibility and Auditory Control"
              subtitle="EarthSonic is built for low-vision, keyboard-only, and auditory learners. Toggle real controls and preview the safe-limited Web Audio output below."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Card: Audio Controls + Master GainNode Safe-Limit Wave */}
              <div className="rounded-2xl bg-[#071122]/90 border border-[#52C7F5]/35 p-4 sm:p-5 space-y-4 shadow-[0_0_24px_rgba(82,199,245,0.1)]">
                <div className="text-lg font-display font-normal text-[#F5F8FF]">Audio Controls</div>

                <div className="rounded-2xl bg-[#050A16] border border-white/10 p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      aria-label={a11yAudioTesting ? 'Stop safe-limit test tone' : 'Play safe-limit test tone'}
                      onClick={() => {
                        if (a11yAudioTesting) {
                          sonificationEngine.stopAllNodes();
                          setA11yAudioTesting(false);
                        } else {
                          sonificationEngine.setVolume(volume);
                          setA11yAudioTesting(true);
                          sonificationEngine.playDataStep({
                            point: { index: 0, dateLabel: '2024', isoDate: '2024-01-01', primaryValue: 1.15, secondaryValue: 11, tertiaryValue: 0.9 },
                            experienceId: 'temperature',
                            mappings: EARTH_EXPERIENCES.temperature.mappings,
                            durationSec: 1.1
                          });
                          setTimeout(() => setA11yAudioTesting(false), 1150);
                        }
                      }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2E4F7B] to-[#122645] border-2 border-[#7CE8FF]/80 shadow-[0_0_24px_rgba(82,199,245,0.45)] flex items-center justify-center text-[#F5F8FF] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      {a11yAudioTesting ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                    </button>

                    <div className="flex-1 space-y-2.5">
                      <label className="flex items-center justify-between text-xs font-mono-tabular text-[#DCE8F8]">
                        <span>Volume ({Math.round(volume * 100)}%)</span>
                        <Volume2 className="w-3.5 h-3.5 text-[#52C7F5]" />
                      </label>
                      <input
                        type="range"
                        aria-label="Master volume test slider"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          setVolume(v);
                          sonificationEngine.setVolume(v);
                        }}
                        className="w-full h-2 accent-[#FFC66D] cursor-pointer min-h-[32px]"
                      />
                      <div className="flex items-center justify-between text-xs font-mono-tabular text-[#A9BAD0]">
                        <span>Playback Speed</span>
                        <div className="flex items-center gap-1">
                          {[0.5, 1, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => setPlaybackSpeed(spd)}
                              className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                                playbackSpeed === spd
                                  ? 'bg-[#52C7F5] text-[#050914] font-bold'
                                  : 'bg-[#0A1220] text-[#A9BAD0] border border-white/10'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Master GainNode Safe-Limit Visualization */}
                  <div className="pt-1">
                    <div className="text-[11px] font-mono-tabular text-[#A9BAD0] text-right mb-1">
                      Master GainNode Safe-Limit
                    </div>
                    <svg viewBox="0 0 360 72" className="w-full h-16" aria-hidden="true">
                      <line x1="0" y1="16" x2="360" y2="16" stroke="rgba(255,198,109,0.55)" strokeWidth="1" />
                      <line x1="0" y1="42" x2="360" y2="42" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
                      <path
                        d="M0 42 Q 30 42, 48 28 T 84 12 T 120 56 T 156 18 T 192 52 T 228 28 T 264 46 T 360 42"
                        fill="none"
                        stroke="#FFC66D"
                        strokeWidth="2"
                      />
                      <path
                        d="M0 42 Q 36 52, 64 26 T 104 60 T 144 20 T 184 54 T 224 32 T 268 48 T 360 42"
                        fill="none"
                        stroke="#52C7F5"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Card: Accessibility Features + Real App Toggles */}
              <div className="rounded-2xl bg-[#071122]/90 border border-[#52C7F5]/35 p-4 sm:p-5 space-y-4 shadow-[0_0_24px_rgba(82,199,245,0.1)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-lg font-display font-normal text-[#F5F8FF]">
                    Accessibility Features
                  </div>

                  <ul className="space-y-3 text-sm text-[#DCE8F8]">
                    <li className="flex items-center gap-3">
                      <Keyboard className="w-4 h-4 text-[#52C7F5] shrink-0" />
                      <span>Full Keyboard Navigation: `Space` Play/Pause, `→`/`←` Step, `D` Describe Sound, `R` Replay Tone Only, `A` Toggle Announcements</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ScanEye className="w-4 h-4 text-[#52C7F5] shrink-0" />
                      <span>Guided Listening Mode (sound and speech take turns: Listen → Speak → Gap) + Minimal / Standard / Detailed verbosity</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Contrast className="w-4 h-4 text-[#52C7F5] shrink-0" />
                      <span>High Contrast, Color-Blind Safe Palette, 100%–200% Text &amp; Reduced Motion</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-[#52C7F5] shrink-0" />
                      <span>Live Sound Captions &amp; Spoken Web Speech Readouts</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => useAccessibilityStore.getState().setCenterOpen(true)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#52C7F5] hover:bg-sky-300 text-[#050914] font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ScanEye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Open Accessibility Center</span>
                  </button>
                  <Chip active={accessibilityMode} accentColor="#57D6A0" onClick={() => setAccessibilityMode(!accessibilityMode)}>
                    Accessibility Mode: {accessibilityMode ? 'ON' : 'OFF'}
                  </Chip>
                  <Chip active={use2DMapFallback} accentColor="#52C7F5" onClick={() => setUse2DMapFallback(!use2DMapFallback)}>
                    2D Orthographic Map: {use2DMapFallback ? 'ON' : 'OFF'}
                  </Chip>
                  <Chip active={lowQualityMode} accentColor="#FFC66D" onClick={() => setLowQualityMode(!lowQualityMode)}>
                    Lower 3D Quality: {lowQualityMode ? 'ON' : 'OFF'}
                  </Chip>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* 8. SHORTCUTS (generated from EARTHSONIC_KEYMAP) */}
          <GlassPanel id="shortcuts" elevation={2} className="p-5 space-y-3 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionHeader
                title="8. Keyboard Shortcuts"
                subtitle="Press any listed key to highlight its row. Single-key shortcuts can be disabled in Accessibility Center."
              />
              <button
                type="button"
                onClick={() => copyAnchor('shortcuts')}
                className="min-h-[36px] px-3 py-1 rounded-xl bg-[#050914] border border-[#1E2E48] text-xs font-mono-tabular text-[#9AA9BD] inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedId === 'shortcuts' ? 'Copied!' : 'Copy link'}</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[#9AA9BD] font-mono-tabular border-b border-[#1E2E48]">
                  <tr>
                    <th className="py-2 pr-3">Key</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2">Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShortcuts.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-[#1E2E48]/60 transition-colors ${
                        pressedCode === s.code ? 'bg-[#52C7F5]/20' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <KeyCap label={s.keyLabel} screenReaderText={s.screenReaderText} />
                      </td>
                      <td className="py-2.5 pr-3 text-[#F5F8FF]">{s.action}</td>
                      <td className="py-2.5 font-mono-tabular text-[#9AA9BD]">{s.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* 9. TROUBLESHOOTING ACCORDION */}
          <GlassPanel id="troubleshooting" elevation={2} className="p-5 space-y-3 scroll-mt-24">
            <SectionHeader title="9. Troubleshooting" />
            <Accordion title="No sound when pressing Play" defaultOpen>
              <p className="mb-2">Browsers require a click before Web Audio starts. Check mute and volume, then test with a safe 1-second tone.</p>
              <Chip accentColor="#57D6A0" onClick={playSafeTestTone}>
                <Volume2 className="w-3.5 h-3.5" /> Play test tone (1s)
              </Chip>
            </Accordion>
            <Accordion title="Globe is blank or slow">
              <p className="mb-2">Switch to the 2D d3-geo orthographic map or lower 3D particle quality.</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={use2DMapFallback} onClick={() => setUse2DMapFallback(!use2DMapFallback)}>
                  Switch to 2D map
                </Chip>
                <Chip active={lowQualityMode} onClick={() => setLowQualityMode(!lowQualityMode)}>
                  Lower quality
                </Chip>
              </div>
            </Accordion>
            <Accordion title="Data says LOCAL DEMONSTRATION DATA">
              <p className="mb-2">The backend could not be reached and no recent device cache was saved. Click Retry to reconnect.</p>
              <Chip accentColor="#52C7F5" onClick={() => onRetryBackend()}>
                Retry connection
              </Chip>
            </Accordion>
            <Accordion title="Page scrolls instead of rotating the globe on mobile">
              <p>Tap the Interact: ON button in the bottom-left corner of the globe so touch gestures rotate the sphere instead of scrolling the page.</p>
            </Accordion>
          </GlassPanel>

          {/* 10. GLOSSARY */}
          <GlassPanel id="glossary" elevation={2} className="p-5 space-y-3 scroll-mt-24">
            <SectionHeader title="10. Science & Audio Glossary" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredGlossary.map((g) => (
                <div key={g.term} className="rounded-2xl bg-[#050914] border border-[#1E2E48] p-3.5">
                  <div className="text-xs font-mono-tabular font-bold text-[#52C7F5]">{g.term}</div>
                  <p className="text-xs text-[#9AA9BD] mt-1 leading-relaxed">{g.def}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* 11 & 12. REPLAY TOUR + LOCAL FEEDBACK */}
          <GlassPanel elevation={2} className="p-5 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                restartTour();
                navigate('/explorer');
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#52C7F5] text-[#050914] font-display font-bold text-xs cursor-pointer"
            >
              Replay Explorer Tour
            </button>

            <div className="flex items-center gap-2 text-xs text-[#9AA9BD]">
              <span>Was this guide helpful? (Saved locally only)</span>
              <Chip active={helpfulVote === 'up'} accentColor="#57D6A0" onClick={() => setHelpfulVote('up')}>
                <ThumbsUp className="w-3.5 h-3.5" /> Yes
              </Chip>
              <Chip active={helpfulVote === 'down'} accentColor="#FFC66D" onClick={() => setHelpfulVote('down')}>
                <ThumbsDown className="w-3.5 h-3.5" /> Needs work
              </Chip>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
