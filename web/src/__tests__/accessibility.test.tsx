import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import axe from 'axe-core';
import App from '../App';
import { AppShell } from '../components/layout/AppShell';
import { LiveAnnouncer } from '../components/a11y/LiveAnnouncer';
import { LiveSoundCaptionsBar } from '../components/a11y/LiveSoundCaptionsBar';
import { HomePage } from '../pages/HomePage';
import { ExplorerPage } from '../pages/ExplorerPage';
import { HearTheChangePage } from '../pages/HearTheChangePage';
import { OrchestraPage } from '../pages/OrchestraPage';
import { HowItWorksPage } from '../pages/HowItWorksPage';
import { UserGuidePage } from '../pages/UserGuidePage';
import { DataSourcesPage } from '../pages/DataSourcesPage';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { computeAcousticParameters, sonificationEngine } from '../audio/sonificationEngine';
import { getExperienceAccentColor } from '../hooks/useAccessibilityRuntime';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { speechService } from '../services/speechService';
import {
  A11Y_PREFS_STORAGE_KEY,
  isEffectiveReducedMotionActive,
  useAccessibilityStore
} from '../store/useAccessibilityStore';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import type { ClientProvenance } from '../types/dataStatus';

const DEMO_PROVENANCE: ClientProvenance = {
  dataStatus: 'LOCAL_DEMONSTRATION',
  provider: 'NASA GISS / JPL Bundled Archive',
  sourceUrl: 'https://data.giss.nasa.gov/gistemp/',
  referencePeriod: '1951-1980',
  processing: ['Verified bundled NASA reference archive'],
  plainLanguageSummary: 'Loaded bundled NASA reference archive for offline accessibility verification.'
};

let mockOsReduceMotion = false;

function installBrowserPolyfills() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? mockOsReduceMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeAll(() => {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;
  }

  HTMLElement.prototype.scrollIntoView = vi.fn();

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    roundRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

beforeEach(() => {
  mockOsReduceMotion = false;
  installBrowserPolyfills();
  localStorage.clear();
  useAccessibilityStore.getState().resetDefaults();
  useAccessibilityStore.getState().setCenterOpen(false);
  useEarthSonicStore.setState({
    activeExperienceId: 'temperature',
    isPlaying: false,
    isMuted: false,
    volume: 0.6,
    stepIndex: 0
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function expectNoSeriousAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute Tailwind stylesheet colors; real contrast is verified in Chromium Lighthouse
      'color-contrast': { enabled: false },
      region: { enabled: true }
    }
  });
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  if (blocking.length > 0) {
    throw new Error(
      `Found ${blocking.length} serious/critical axe violations:\n` +
        blocking
          .map((v) => `- ${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.html).join(', ')}`)
          .join('\n')
    );
  }
}

describe('Accessibility store & DOM persistence', () => {
  it('applies every setting cleanly to root DOM and persists across store resets/reads', () => {
    const store = useAccessibilityStore.getState();

    store.updatePref('textSize', 200);
    expect(document.documentElement.style.fontSize).toBe('200%');
    expect(document.documentElement.dataset.textSize).toBe('200');

    store.updatePref('contrast', 'high');
    expect(document.documentElement.dataset.contrast).toBe('high');

    store.updatePref('palette', 'colorblind');
    expect(document.documentElement.dataset.palette).toBe('colorblind');
    expect(getExperienceAccentColor('temperature', 'colorblind')).toBe('#E69F00');
    expect(getExperienceAccentColor('ocean', 'colorblind')).toBe('#56B4E9');
    expect(getExperienceAccentColor('atmosphere', 'colorblind')).toBe('#CC79A7');

    store.updatePref('reduceMotion', 'on');
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(isEffectiveReducedMotionActive()).toBe(true);

    mockOsReduceMotion = true;
    store.setOsReducedMotion(true);
    store.updatePref('reduceMotion', 'off');
    expect(isEffectiveReducedMotionActive()).toBe(false);
    expect(document.documentElement.dataset.motion).toBe('full');

    store.updatePref('readableFont', true);
    store.updatePref('textSpacing', true);
    store.updatePref('largerTargets', true);
    store.updatePref('thickFocus', true);
    expect(document.documentElement.dataset.font).toBe('readable');
    expect(document.documentElement.dataset.spacing).toBe('wide');
    expect(document.documentElement.dataset.targets).toBe('large');
    expect(document.documentElement.dataset.focus).toBe('thick');

    const persisted = JSON.parse(localStorage.getItem(A11Y_PREFS_STORAGE_KEY) || '{}');
    expect(persisted.textSize).toBe(200);
    expect(persisted.contrast).toBe('high');
    expect(persisted.palette).toBe('colorblind');

    store.resetDefaults();
    expect(document.documentElement.style.fontSize).toBe('100%');
    expect(document.documentElement.dataset.contrast).toBe('default');
    expect(document.documentElement.dataset.palette).toBe('default');
    expect(document.documentElement.dataset.motion).toBe('reduce'); // mockOsReduceMotion = true & 'system'
    expect(useAccessibilityStore.getState().prefs.singleKeyShortcuts).toBe(true);
  });

  it('applies quick presets properly', () => {
    useAccessibilityStore.getState().applyPreset('low_vision');
    let p = useAccessibilityStore.getState().prefs;
    expect(p.textSize).toBe(150);
    expect(p.contrast).toBe('high');
    expect(p.thickFocus).toBe(true);
    expect(p.largerTargets).toBe(true);

    useAccessibilityStore.getState().applyPreset('deaf_captions');
    p = useAccessibilityStore.getState().prefs;
    expect(p.soundCaptions).toBe(true);

    useAccessibilityStore.getState().applyPreset('calm_motion');
    p = useAccessibilityStore.getState().prefs;
    expect(p.reduceMotion).toBe('on');
  });
});

describe('Accessibility Center Drawer, LiveAnnouncer, Captions & Speech cancellation', () => {
  it('opens Accessibility Center drawer, toggles Text Size & Contrast, sets main inert, and closes on Escape', () => {
    useAccessibilityStore.getState().setCenterOpen(true);

    render(
      <MemoryRouter initialEntries={['/explorer']}>
        <AppShell
          provenance={DEMO_PROVENANCE}
          isDegraded={false}
          degradedMessage={null}
          failureReason={null}
          onRetry={() => {}}
          speakSummaryText="Warming Planet overview"
        >
          <div>
            <h1>The Earth Explorer Command Centre</h1>
          </div>
        </AppShell>
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: /accessibility center/i });
    expect(dialog).toBeInTheDocument();
    const main = document.getElementById('main-content');
    expect(main?.hasAttribute('inert')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '200%' }));
    expect(useAccessibilityStore.getState().prefs.textSize).toBe(200);

    fireEvent.click(screen.getByRole('switch', { name: /high contrast theme/i }));
    expect(useAccessibilityStore.getState().prefs.contrast).toBe('high');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useAccessibilityStore.getState().centerOpen).toBe(false);
  });

  it('throttles playback live region updates and renders sound captions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);

    render(<LiveAnnouncer />);
    const politeEl = screen.getByTestId('global-live-polite');

    act(() => {
      liveAnnouncer.announcePlaybackThrottled('Step 1: 1950 at -0.17 C', 2200);
      vi.advanceTimersByTime(110);
    });
    expect(politeEl.textContent).toBe('Step 1: 1950 at -0.17 C');

    act(() => {
      vi.setSystemTime(10_500);
      liveAnnouncer.announcePlaybackThrottled('Step 2: 1953 at -0.05 C', 2200);
      vi.advanceTimersByTime(110);
    });
    expect(politeEl.textContent).toBe('Step 1: 1950 at -0.17 C');

    act(() => {
      vi.setSystemTime(12_500);
      liveAnnouncer.announcePlaybackThrottled('Step 3: 1956 at -0.19 C', 2200);
      vi.advanceTimersByTime(110);
    });
    expect(politeEl.textContent).toBe('Step 3: 1956 at -0.19 C');
    vi.useRealTimers();

    const exp = EARTH_EXPERIENCES.temperature;
    const pt = exp.referenceSeries[0];
    const telemetry = computeAcousticParameters(pt, exp.id, exp.mappings);
    render(
      <LiveSoundCaptionsBar
        experience={exp}
        currentPoint={pt}
        telemetry={{
          isPlaying: true,
          isMuted: false,
          stepIndex: 0,
          primaryPitchHz: telemetry.pitchHz,
          primaryNoteName: telemetry.noteName,
          primaryRhythmBpm: telemetry.rhythmBpm,
          primaryIntensityDb: telemetry.intensityDb,
          primaryFilterHz: telemetry.filterHz,
          compareActive: false,
          secondaryPitchHz: telemetry.pitchHz,
          secondaryNoteName: telemetry.noteName,
          secondaryRhythmBpm: telemetry.rhythmBpm,
          secondaryIntensityDb: telemetry.intensityDb
        }}
        accentColor="#FFC66D"
      />
    );
    expect(screen.getByTestId('live-sound-captions')).toBeInTheDocument();
  });

  it('stops active Web Speech on route navigation inside AppShell', async () => {
    const stopSpy = vi.spyOn(speechService, 'stop');

    const NavHelper: React.FC = () => {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/guide')}>
          Go guide
        </button>
      );
    };

    render(
      <MemoryRouter initialEntries={['/explorer']}>
        <AppShell
          provenance={DEMO_PROVENANCE}
          isDegraded={false}
          degradedMessage={null}
          failureReason={null}
          onRetry={() => {}}
        >
          <h1>Initial Heading</h1>
          <NavHelper />
        </AppShell>
      </MemoryRouter>
    );

    stopSpy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Go guide' }));

    await waitFor(() => {
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  it('honors singleKeyShortcuts toggle for keyboard M and arrows in App', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline unit test'));
    const stopAudioSpy = vi.spyOn(sonificationEngine, 'stopAllNodes').mockImplementation(() => {});
    vi.spyOn(sonificationEngine, 'setMuted').mockImplementation(() => {});

    window.history.pushState({}, '', '/explorer');
    await act(async () => {
      render(<App />);
    });

    expect(useEarthSonicStore.getState().isMuted).toBe(false);
    act(() => {
      fireEvent.keyDown(window, { key: 'm', code: 'KeyM' });
    });
    expect(useEarthSonicStore.getState().isMuted).toBe(true);

    // Disable single-key shortcuts -> KeyM must no longer flip mute state
    act(() => {
      useAccessibilityStore.getState().updatePref('singleKeyShortcuts', false);
    });
    act(() => {
      fireEvent.keyDown(window, { key: 'm', code: 'KeyM' });
    });
    expect(useEarthSonicStore.getState().isMuted).toBe(true);
    stopAudioSpy.mockRestore();
  });
});

describe('axe-core automated audits across EarthSonic routes', () => {
  const tempExp = EARTH_EXPERIENCES.temperature;
  const tempSeries = tempExp.referenceSeries;
  const tempPoint = tempSeries[0];
  const baseParams = computeAcousticParameters(tempPoint, tempExp.id, tempExp.mappings);
  const telemetry = {
    isPlaying: false,
    isMuted: false,
    stepIndex: 0,
    primaryPitchHz: baseParams.pitchHz,
    primaryNoteName: baseParams.noteName,
    primaryRhythmBpm: baseParams.rhythmBpm,
    primaryIntensityDb: baseParams.intensityDb,
    primaryFilterHz: baseParams.filterHz,
    compareActive: false,
    secondaryPitchHz: baseParams.pitchHz,
    secondaryNoteName: baseParams.noteName,
    secondaryRhythmBpm: baseParams.rhythmBpm,
    secondaryIntensityDb: baseParams.intensityDb
  };

  it('passes axe-core on HomePage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell
          provenance={DEMO_PROVENANCE}
          isDegraded={false}
          degradedMessage={null}
          failureReason={null}
          onRetry={() => {}}
        >
          <HomePage experience={tempExp} series={tempSeries} provenance={DEMO_PROVENANCE} />
        </AppShell>
      </MemoryRouter>
    );
    await expectNoSeriousAxeViolations(container);
  });

  it('passes axe-core on ExplorerPage with Accessibility Center Drawer & High Contrast', async () => {
    useAccessibilityStore.getState().updatePref('contrast', 'high');
    useAccessibilityStore.getState().updatePref('soundCaptions', true);

    const { container } = render(
      <MemoryRouter initialEntries={['/explorer']}>
        <AppShell
          provenance={DEMO_PROVENANCE}
          isDegraded={false}
          degradedMessage={null}
          failureReason={null}
          onRetry={() => {}}
        >
          <ExplorerPage
            experience={tempExp}
            series={tempSeries}
            provenance={DEMO_PROVENANCE}
            isLoading={false}
            failureReason={null}
            degradedMessage={null}
            telemetry={telemetry}
            currentPoint={tempPoint}
            onRetry={async () => {}}
            onSwitchToDemo={() => {}}
            onStepChange={() => {}}
            onTogglePlay={() => {}}
            onReset={() => {}}
            onToggleMute={() => {}}
            onVolumeChange={() => {}}
          />
        </AppShell>
      </MemoryRouter>
    );
    await expectNoSeriousAxeViolations(container);

    // Also audit with AccessibilityCenterDrawer open
    act(() => {
      useAccessibilityStore.getState().setCenterOpen(true);
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await expectNoSeriousAxeViolations(container);
  });

  it('passes axe-core on HearTheChangePage, HowItWorksPage, UserGuidePage, DataSourcesPage, and OrchestraPage', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline unit test'));

    const routes: Array<{ path: string; node: React.ReactNode }> = [
      {
        path: '/hear-the-change',
        node: (
          <HearTheChangePage
            experience={tempExp}
            series={tempSeries}
            provenance={DEMO_PROVENANCE}
            isRatioScale={false}
            documentedRange={{ min: -0.5, max: 1.5, basis: 'GISTEMP range' }}
          />
        )
      },
      { path: '/how-it-works', node: <HowItWorksPage /> },
      { path: '/guide', node: <UserGuidePage onRetryBackend={async () => {}} /> },
      { path: '/data', node: <DataSourcesPage provenance={DEMO_PROVENANCE} /> },
      { path: '/orchestra', node: <OrchestraPage /> }
    ];

    for (const r of routes) {
      const { container, unmount } = render(
        <MemoryRouter initialEntries={[r.path]}>
          <AppShell
            provenance={DEMO_PROVENANCE}
            isDegraded={false}
            degradedMessage={null}
            failureReason={null}
            onRetry={() => {}}
          >
            {r.node}
          </AppShell>
        </MemoryRouter>
      );
      await expectNoSeriousAxeViolations(container);
      unmount();
    }
  });
});
