import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { EARTH_EXPERIENCES } from '../../data/earthDatasets';
import {
  parseExperienceParam,
  toExperienceQuerySlug,
  useEarthSonicStore
} from '../../store/useEarthSonicStore';
import { sonificationEngine } from '../../audio/sonificationEngine';
import { DataStatusBadge } from '../data/DataStatusBadge';
import { OfflineAndUpdateBanner, PwaInstallButton } from '../pwa/PwaStatusController';
import { Drawer, IconButton } from '../ui/Primitives';
import { LiveAnnouncer } from '../a11y/LiveAnnouncer';
import { AccessibilityCenterDrawer } from '../a11y/AccessibilityCenterDrawer';
import { useAccessibilityDomSync, useExperienceAccentColor } from '../../hooks/useAccessibilityRuntime';
import { useAccessibilityStore, DEFAULT_ACCESSIBILITY_PREFS } from '../../store/useAccessibilityStore';
import { liveAnnouncer } from '../../services/a11yAnnouncer';
import { speechService } from '../../services/speechService';
import type { ClientProvenance } from '../../types/dataStatus';
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Compass,
  Database,
  Disc3,
  GitCompare,
  HelpCircle,
  Home,
  Layers,
  Menu,
  Sparkles
} from 'lucide-react';

interface ContextualGuideEntry {
  anchor: string;
  title: string;
  steps: string[];
}

const CONTEXTUAL_HELP_BY_ROUTE: Record<string, ContextualGuideEntry> = {
  '/': {
    anchor: 'quick-start',
    title: 'Welcome to EarthSonic',
    steps: [
      'Tap "Tap to hear a sample" in the hero to hear a real loaded observation.',
      'Drag the before/after slider to compare silent vs. sonified Earth data.',
      'Choose any experience card to launch the 3D Earth Explorer.'
    ]
  },
  '/explorer': {
    anchor: 'explorer',
    title: 'Earth Explorer Controls',
    steps: [
      'Pick Warming Planet, Water Rhythm, or Living Atmosphere at the top.',
      'Drag the 3D globe to rotate, or use arrow keys + Enter to select a location.',
      'Press Spacebar or Play Sonification in the top transport deck below the tabs to hear the timeline.',
      'Switch between 3D Globe and NASA Visualization in the stage header.'
    ]
  },
  '/hear-the-change': {
    anchor: 'hear-the-change',
    title: 'Hear the Change Guide',
    steps: [
      'Choose an experience in Step 1.',
      'Select Observation A (earlier) and Observation B (later) on the mini chart or sliders.',
      'Press HEAR THE DIFFERENCE to listen to the continuous pitch glide.'
    ]
  },
  '/orchestra': {
    anchor: 'orchestra',
    title: 'Earth Orchestra Guide',
    steps: [
      'Toggle Temperature (pitch), Precipitation (pulse), and Wind (modulation) layers.',
      'Use the shared location chip to pick a location on the compact globe.',
      'Press Play to hear all active Earth systems together.'
    ]
  },
  '/how-it-works': {
    anchor: 'quick-start',
    title: 'How Sonification Works',
    steps: [
      'Click any stage in the pipeline diagram to inspect how raw numbers become sound.',
      'Drag the sliders in "Try the mapping" to test pitch, pulse, and modulation live.'
    ]
  },
  '/guide': {
    anchor: 'quick-start',
    title: 'Using the Interactive Guide',
    steps: [
      'Use the Search box at the top to filter topics, shortcuts, or glossary terms.',
      'Try the Practice Globe and Practice Chart safely with no audio or API calls.'
    ]
  },
  '/data': {
    anchor: 'troubleshooting',
    title: 'Data & Provenance Transparency',
    steps: [
      'Filter datasets by experience or live status using the chips.',
      'Click any status badge anywhere in the app to inspect its source URL and timestamp.'
    ]
  }
};

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explorer', label: 'Explorer', icon: Compass },
  { to: '/hear-the-change', label: 'Hear Change', icon: GitCompare },
  { to: '/orchestra', label: 'Orchestra', icon: Layers },
  { to: '/how-it-works', label: 'How It Works', icon: Sparkles },
  { to: '/guide', label: 'User Guide', icon: BookOpen },
  { to: '/data', label: 'Data & Sources', icon: Database }
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home — EarthSonic',
  '/explorer': 'Earth Explorer Command Centre — EarthSonic',
  '/hear-the-change': 'Hear the Change — EarthSonic',
  '/orchestra': 'The Earth Orchestra — EarthSonic',
  '/how-it-works': 'How Sonification Works — EarthSonic',
  '/guide': 'User Guide & Accessibility — EarthSonic',
  '/data': 'Data Sources & Provenance — EarthSonic'
};

interface AppShellProps {
  provenance: ClientProvenance;
  isDegraded: boolean;
  degradedMessage: string | null;
  failureReason: string | null;
  onRetry: () => void;
  speakSummaryText?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  provenance,
  isDegraded,
  degradedMessage,
  failureReason,
  onRetry,
  speakSummaryText,
  children
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeExperienceId = useEarthSonicStore((s) => s.activeExperienceId);
  const selectedLat = useEarthSonicStore((s) => s.selectedLat);
  const selectedLon = useEarthSonicStore((s) => s.selectedLon);
  const accessibilityMode = useEarthSonicStore((s) => s.accessibilityMode);
  const isPlaying = useEarthSonicStore((s) => s.isPlaying);
  const setIsPlaying = useEarthSonicStore((s) => s.setIsPlaying);
  const restartTour = useEarthSonicStore((s) => s.restartTour);

  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const experience = EARTH_EXPERIENCES[activeExperienceId];

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const syncNavHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height) || 65;
      document.documentElement.style.setProperty('--nav-height', `${h}px`);
      if (!document.documentElement.style.getPropertyValue('--scroll-pad-top')) {
        document.documentElement.style.setProperty('--scroll-pad-top', `${h + 16}px`);
      }
    };
    syncNavHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(syncNavHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hydrate store from URL query params (?exp=warming&lat=..&lon=..)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parsedExp = parseExperienceParam(params.get('exp'));
    const curState = useEarthSonicStore.getState();
    if (parsedExp && parsedExp !== curState.activeExperienceId) {
      curState.setExperienceId(parsedExp);
    }
    const rawLat = params.get('lat');
    const rawLon = params.get('lon');
    if (rawLat !== null && rawLon !== null) {
      const latNum = parseFloat(rawLat);
      const lonNum = parseFloat(rawLon);
      if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
        curState.setLocation(latNum, lonNum);
      }
    }
  }, [location.search]);

  // Stop & release audio cleanly on every route change (Section 4 rule)
  useEffect(() => {
    sonificationEngine.stopAllNodes();
    speechService.stop();
    setIsPlaying(false);
    setMobileMenuOpen(false);
  }, [location.pathname, setIsPlaying]);

  useAccessibilityDomSync();
  const a11yOpen = useAccessibilityStore((s) => s.centerOpen);
  const setA11yOpen = useAccessibilityStore((s) => s.setCenterOpen);
  const a11yPrefs = useAccessibilityStore((s) => s.prefs);
  const effectiveAccentColor = useExperienceAccentColor(activeExperienceId);

  const hasCustomA11y =
    accessibilityMode ||
    a11yPrefs.textSize !== DEFAULT_ACCESSIBILITY_PREFS.textSize ||
    a11yPrefs.contrast !== DEFAULT_ACCESSIBILITY_PREFS.contrast ||
    a11yPrefs.palette !== DEFAULT_ACCESSIBILITY_PREFS.palette ||
    a11yPrefs.reduceMotion !== DEFAULT_ACCESSIBILITY_PREFS.reduceMotion ||
    a11yPrefs.readableFont ||
    a11yPrefs.textSpacing ||
    a11yPrefs.largerTargets ||
    a11yPrefs.thickFocus ||
    a11yPrefs.soundCaptions ||
    a11yPrefs.speechEnabled ||
    !a11yPrefs.singleKeyShortcuts;

  const prevPathnameRef = useRef(location.pathname);

  // Route title update + focus to <h1> on navigation + polite announcement
  useEffect(() => {
    const nextTitle = ROUTE_TITLES[location.pathname] || 'EarthSonic';
    document.title = nextTitle;

    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      liveAnnouncer.announcePolite(`Navigated to ${nextTitle.replace(' — EarthSonic', '')}.`);
      const raf = window.requestAnimationFrame(() => {
        const h1 = document.querySelector('#main-content h1') as HTMLElement | null;
        if (h1) {
          if (!h1.hasAttribute('tabindex')) {
            h1.setAttribute('tabindex', '-1');
          }
          h1.focus({ preventScroll: false });
        }
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [location.pathname]);

  // Update CSS signature accent variable --exp-accent
  useEffect(() => {
    document.documentElement.style.setProperty('--exp-accent', effectiveAccentColor);
  }, [effectiveAccentColor]);

  const helpInfo =
    CONTEXTUAL_HELP_BY_ROUTE[location.pathname] || CONTEXTUAL_HELP_BY_ROUTE['/'];

  const shareQuery = `?exp=${toExperienceQuerySlug(activeExperienceId)}&lat=${selectedLat}&lon=${selectedLon}`;

  const anyDrawerOpen = mobileMenuOpen || helpOpen || a11yOpen;

  const handleSpeakSummary = () => {
    const fallbackText =
      document.querySelector('#main-content h1')?.textContent?.trim() || 'EarthSonic';
    const spoke = speechService.speak(speakSummaryText || fallbackText);
    if (!spoke) {
      liveAnnouncer.announcePolite('Spoken output is unavailable in this browser environment.');
    }
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col bg-[#050914] text-[#F5F8FF] earthsonic-starfield overflow-x-clip ${
        accessibilityMode ? 'accessibility-mode-active' : ''
      }`}
    >
      <LiveAnnouncer />
      {/* Subtle Faint Crossing Orbital Arcs Backdrop (slides 02-12) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full opacity-25 z-0"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="orbitArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52C7F5" stopOpacity="0.04" />
            <stop offset="50%" stopColor="#93C5FD" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#8A7CFF" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <ellipse
          cx="820"
          cy="430"
          rx="760"
          ry="280"
          transform="rotate(-22 820 430)"
          fill="none"
          stroke="url(#orbitArcGrad)"
          strokeWidth="1"
        />
        <ellipse
          cx="720"
          cy="470"
          rx="900"
          ry="340"
          transform="rotate(-14 720 470)"
          fill="none"
          stroke="url(#orbitArcGrad)"
          strokeWidth="0.9"
        />
        <ellipse
          cx="660"
          cy="440"
          rx="1050"
          ry="410"
          transform="rotate(-28 660 440)"
          fill="none"
          stroke="url(#orbitArcGrad)"
          strokeWidth="0.7"
          strokeDasharray="6 8"
        />
      </svg>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#52C7F5] focus:text-[#050914] focus:font-bold"
      >
        Skip to main content
      </a>

      <OfflineAndUpdateBanner />

      {/* Sticky Glass Top Bar */}
      <header
        ref={headerRef}
        inert={anyDrawerOpen ? true : undefined}
        className="sticky top-0 z-40 glass-panel-deep border-b border-[#1E2E48] px-3 sm:px-5 py-2.5"
      >
        <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            to={`/${shareQuery}`}
            className="flex items-center gap-2.5 min-h-[44px] pr-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52C7F5]"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md shrink-0"
              style={{
                backgroundColor: `${experience.themeColor}1A`,
                borderColor: `${experience.themeColor}66`
              }}
            >
              <Disc3
                className={`w-5 h-5 ${isPlaying ? 'animate-spin motion-reduce:animate-none' : ''}`}
                style={{ color: experience.themeColor }}
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold font-display tracking-tight text-[#F5F8FF] block leading-none">
                EARTHSONIC
              </span>
              <span className="text-[10px] font-mono-tabular text-[#9AA9BD] uppercase tracking-wider hidden sm:block mt-0.5">
                Space Apps 2026
              </span>
            </div>
          </Link>

          {/* Desktop 7-route Nav */}
          <nav aria-label="Primary navigation" className="hidden xl:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to === '/' ? '/' : `${item.to}${item.to === '/explorer' ? shareQuery : ''}`}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `min-h-[44px] px-3 py-2 rounded-xl text-xs font-display font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'bg-[#52C7F5] text-[#050914]'
                        : 'text-[#9AA9BD] hover:text-[#F5F8FF] hover:bg-[#101C2D]/80'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Utilities: DataStatusBadge, Accessibility, PWA Install, Help ?, Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:block">
              <DataStatusBadge provenance={provenance} compact />
            </div>

            <PwaInstallButton />

            <button
              type="button"
              onClick={() => setA11yOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={a11yOpen}
              aria-label={`Open Accessibility Center${hasCustomA11y ? ' (Custom settings active)' : ''}`}
              className={`min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-mono-tabular font-semibold border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                hasCustomA11y
                  ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0]'
                  : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#52C7F5]'
              }`}
            >
              <Accessibility className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {hasCustomA11y ? 'A11y: Active' : 'A11y'}
              </span>
            </button>

            <IconButton
              label="Open contextual page help"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="w-4 h-4 text-[#52C7F5]" />
            </IconButton>

            <div className="xl:hidden">
              <IconButton
                label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </header>

      {/* Degraded Backend Banner (non-blocking) */}
      {isDegraded && degradedMessage && (
        <div
          inert={anyDrawerOpen ? true : undefined}
          role={failureReason ? 'alert' : 'status'}
          aria-live={failureReason ? 'assertive' : 'polite'}
          className="max-w-[1520px] w-full mx-auto px-4 pt-3"
        >
          <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100">
            <span>{degradedMessage}</span>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[36px] px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#050914] font-mono-tabular font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Route Content */}
      <main
        id="main-content"
        inert={anyDrawerOpen ? true : undefined}
        className="relative z-10 flex-1 max-w-[1520px] w-full mx-auto px-4 py-5 sm:py-7 page-transition"
      >
        {children}
      </main>

      {/* Compact Footer */}
      <footer
        inert={anyDrawerOpen ? true : undefined}
        className="relative z-10 border-t border-[#1E2E48]/80 bg-[#050914]/90 px-4 py-5 text-xs text-[#9AA9BD]"
      >
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[70ch]">
            EarthSonic is an independent educational project created for NASA Space Apps Challenge 2026. It is not an official NASA product. NASA data and visualizations remain the property of their respective owners.
          </p>
          <div className="flex items-center gap-4 font-mono-tabular">
            <Link to="/data" className="text-[#52C7F5] hover:underline">
              Data & Sources
            </Link>
            <Link to="/guide" className="text-[#52C7F5] hover:underline">
              User Guide
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Navigate EarthSonic"
      >
        <div className="flex flex-col gap-2">
          <div className="mb-2">
            <DataStatusBadge provenance={provenance} />
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-display font-semibold flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-[#52C7F5] text-[#050914]'
                      : 'bg-[#050914] text-[#F5F8FF] border border-[#1E2E48]'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </Drawer>

      {/* Contextual "?" Help Drawer (never interrupts playing audio) */}
      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={helpInfo.title}
      >
        <div className="space-y-4">
          <p className="text-xs text-[#9AA9BD]">
            Quick steps for this page. Opening help never interrupts playing audio.
          </p>
          <ol className="space-y-2.5">
            {helpInfo.steps.map((step, i) => (
              <li
                key={i}
                className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 text-sm text-[#F5F8FF] flex items-start gap-2.5"
              >
                <span className="w-6 h-6 rounded-full bg-[#52C7F5]/20 text-[#52C7F5] font-mono-tabular font-bold text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setHelpOpen(false);
                navigate(`/guide#${helpInfo.anchor}`);
              }}
              className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl bg-[#52C7F5] text-[#050914] font-display font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open full guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {location.pathname === '/explorer' && (
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(false);
                  restartTour();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#050914] border border-[#1E2E48] text-[#F5F8FF] font-display font-semibold text-xs cursor-pointer"
              >
                Replay Tour
              </button>
            )}
          </div>
        </div>
      </Drawer>

      {/* Accessibility Center Drawer (Real Settings + Live Controls) */}
      <AccessibilityCenterDrawer onSpeakCurrentView={handleSpeakSummary} />
    </div>
  );
};
