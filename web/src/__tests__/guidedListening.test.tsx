import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import { useAccessibilityStore } from '../store/useAccessibilityStore';
import {
  estimateSpeechWaitMs,
  GuidedListeningController,
  shouldAnnounceGuidedStep,
  type GuidedPlaybackConfig
} from '../services/guidedListeningController';
import { sonificationEngine } from '../audio/sonificationEngine';
import { speechService } from '../services/speechService';
import App from '../App';

function makeConfig(
  expId: 'temperature' | 'ocean' | 'atmosphere',
  overrides: Partial<GuidedPlaybackConfig> = {}
): GuidedPlaybackConfig {
  const exp = EARTH_EXPERIENCES[expId];
  return {
    experience: exp,
    series: exp.referenceSeries,
    startStepIndex: 0,
    listenSeconds: 3,
    gapMs: 1000,
    waitScale: 'normal',
    announceFrequency: 'every',
    pauseBetweenSteps: false,
    announcePhaseChanges: false,
    announcementsEnabled: true,
    speechEnabled: false,
    pauseSoundWhileAnnouncing: false,
    loopEnabled: false,
    userVolume: 0.8,
    soundSettings: useEarthSonicStore.getState().soundSettings,
    onStepChange: () => {},
    onRunningChange: () => {},
    ...overrides
  };
}

describe('Guided Listening Mode — state machine, timing, and cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('estimates speech wait time at ~160 WPM + 1.5s margin scaled by Short / Normal / Long', () => {
    const sixteenWords = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
    // 16 words at 160 WPM = 6000ms + 1500ms margin = 7500ms
    expect(estimateSpeechWaitMs(sixteenWords, 'normal')).toBe(7500);
    expect(estimateSpeechWaitMs(sixteenWords, 'short')).toBe(6000);
    expect(estimateSpeechWaitMs(sixteenWords, 'long')).toBe(10500);
  });

  it('filters announcements according to Every / Every 5th & trend / Only when asked', () => {
    expect(
      shouldAnnounceGuidedStep({
        frequency: 'every',
        stepIndex: 2,
        prevDirection: 'rising',
        direction: 'rising'
      })
    ).toBe(true);

    expect(
      shouldAnnounceGuidedStep({
        frequency: 'on_request',
        stepIndex: 0,
        prevDirection: 'initial',
        direction: 'rising'
      })
    ).toBe(false);

    expect(
      shouldAnnounceGuidedStep({
        frequency: 'on_request',
        stepIndex: 2,
        prevDirection: 'rising',
        direction: 'rising',
        manual: true
      })
    ).toBe(true);

    expect(
      shouldAnnounceGuidedStep({
        frequency: 'every_5_or_trend',
        stepIndex: 2,
        prevDirection: 'rising',
        direction: 'rising'
      })
    ).toBe(false);

    expect(
      shouldAnnounceGuidedStep({
        frequency: 'every_5_or_trend',
        stepIndex: 4,
        prevDirection: 'rising',
        direction: 'rising'
      })
    ).toBe(true);

    expect(
      shouldAnnounceGuidedStep({
        frequency: 'every_5_or_trend',
        stepIndex: 2,
        prevDirection: 'rising',
        direction: 'falling'
      })
    ).toBe(true);
  });

  it('cycles LISTEN -> SPEAK -> GAP -> next with zero announcements during LISTEN and waits full estimated time', async () => {
    const announced: Array<{ t: number; msg: string; phase: string }> = [];
    const volumes: number[] = [];
    let currentPhase = 'IDLE';

    const ctrl = new GuidedListeningController({
      playTone: vi.fn(),
      stopAudio: vi.fn(),
      setVolume: (v) => volumes.push(Number(v.toFixed(2))),
      announcePolite: (msg) => announced.push({ t: Date.now() - 100_000, msg, phase: currentPhase }),
      speakAsync: vi.fn(async () => true),
      stopSpeech: vi.fn(),
      isSpeechSupported: () => false,
      now: () => Date.now()
    });
    ctrl.subscribe((s) => {
      currentPhase = s.phase;
    });

    const stepUpdates: number[] = [];
    ctrl.startAuto(
      makeConfig('temperature', {
        onStepChange: (idx) => stepUpdates.push(idx)
      })
    );

    // During LISTEN (first 3000ms): zero announcements
    await vi.advanceTimersByTimeAsync(2900);
    expect(ctrl.getSnapshot().phase).toBe('LISTEN');
    expect(announced).toHaveLength(0);

    // At 3000ms: transitions to SPEAK, ducks volume to 15% (0.8 * 0.15 = 0.12), announces once
    await vi.advanceTimersByTimeAsync(150);
    expect(ctrl.getSnapshot().phase).toBe('SPEAK');
    expect(announced).toHaveLength(1);
    expect(announced[0].phase).toBe('SPEAK');
    expect(announced[0].msg).toContain('1956');
    expect(announced[0].msg).toContain('131 hertz');
    expect(volumes).toContain(0.12);

    // Should NOT advance before estimated wait finishes
    const estWait = estimateSpeechWaitMs(announced[0].msg, 'normal');
    await vi.advanceTimersByTimeAsync(estWait - 500);
    expect(ctrl.getSnapshot().phase).toBe('SPEAK');
    expect(stepUpdates).toEqual([0]);

    // After estimated wait -> GAP (restores volume to 0.8) -> next step
    await vi.advanceTimersByTimeAsync(550);
    expect(ctrl.getSnapshot().phase).toBe('GAP');
    expect(volumes[volumes.length - 1]).toBe(0.8);

    await vi.advanceTimersByTimeAsync(1000);
    expect(ctrl.getSnapshot().phase).toBe('LISTEN');
    expect(stepUpdates).toEqual([0, 1]);

    ctrl.stop();
  });

  it('waits until Web Speech onend resolves when speechEnabled is true', async () => {
    let resolveSpeech!: (val: boolean) => void;
    const speakAsync = vi.fn(
      () =>
        new Promise<boolean>((res) => {
          resolveSpeech = res;
        })
    );

    const ctrl = new GuidedListeningController({
      playTone: vi.fn(),
      stopAudio: vi.fn(),
      setVolume: vi.fn(),
      announcePolite: vi.fn(),
      speakAsync,
      stopSpeech: vi.fn(),
      isSpeechSupported: () => true,
      now: () => Date.now()
    });

    const steps: number[] = [];
    ctrl.startAuto(
      makeConfig('ocean', {
        speechEnabled: true,
        onStepChange: (i) => steps.push(i)
      })
    );

    await vi.advanceTimersByTimeAsync(3050);
    expect(ctrl.getSnapshot().phase).toBe('SPEAK');
    expect(speakAsync).toHaveBeenCalledTimes(1);

    // Even after 12 seconds, still in SPEAK until onend fires
    await vi.advanceTimersByTimeAsync(12_000);
    expect(ctrl.getSnapshot().phase).toBe('SPEAK');
    expect(steps).toEqual([0]);

    // Fire onend -> enters GAP -> advances after 1000ms
    resolveSpeech(true);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(ctrl.getSnapshot().phase).toBe('GAP');

    await vi.advanceTimersByTimeAsync(1000);
    expect(ctrl.getSnapshot().phase).toBe('LISTEN');
    expect(steps).toEqual([0, 1]);

    ctrl.stop();
  });

  it('stops all timers, audio, and speech on stop() and respects pauseBetweenSteps', async () => {
    const stopAudio = vi.fn();
    const stopSpeech = vi.fn();
    const onRunningChange = vi.fn();
    const announcePolite = vi.fn();

    const ctrl = new GuidedListeningController({
      playTone: vi.fn(),
      stopAudio,
      setVolume: vi.fn(),
      announcePolite,
      speakAsync: vi.fn(async () => true),
      stopSpeech,
      isSpeechSupported: () => false,
      now: () => Date.now()
    });

    ctrl.startAuto(
      makeConfig('atmosphere', {
        pauseBetweenSteps: true,
        onRunningChange
      })
    );

    await vi.advanceTimersByTimeAsync(3050);
    expect(ctrl.getSnapshot().phase).toBe('SPEAK');
    const firstMsg = announcePolite.mock.calls[0][0] as string;
    const waitMs = estimateSpeechWaitMs(firstMsg, 'normal');

    await vi.advanceTimersByTimeAsync(waitMs + 1050);
    expect(ctrl.getSnapshot().phase).toBe('PAUSED');
    expect(onRunningChange).toHaveBeenLastCalledWith(false);

    // Start again and cancel mid-LISTEN
    ctrl.startAuto(makeConfig('atmosphere', { pauseBetweenSteps: false }));
    await vi.advanceTimersByTimeAsync(1000);
    const countBeforeStop = announcePolite.mock.calls.length;
    ctrl.stop(onRunningChange);
    expect(stopAudio).toHaveBeenCalled();
    expect(stopSpeech).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(announcePolite.mock.calls.length).toBe(countBeforeStop);
  });

  it('records 5 consecutive steps with timestamps for temperature, ocean, and atmosphere', async () => {
    for (const expId of ['temperature', 'ocean', 'atmosphere'] as const) {
      vi.setSystemTime(100_000);
      const ctrl = new GuidedListeningController({
        playTone: vi.fn(),
        stopAudio: vi.fn(),
        setVolume: vi.fn(),
        announcePolite: vi.fn(),
        speakAsync: vi.fn(async () => true),
        stopSpeech: vi.fn(),
        isSpeechSupported: () => false,
        now: () => Date.now()
      });

      ctrl.startAuto(makeConfig(expId));
      // Advance enough time for 5 full cycles
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(15_000);
      }
      ctrl.stop();

      const speakEvents = ctrl.getEventLog().filter((e) => e.phase === 'SPEAK');
      expect(speakEvents.length).toBeGreaterThanOrEqual(5);
      expect(speakEvents.slice(0, 5).map((e) => e.stepIndex)).toEqual([0, 1, 2, 3, 4]);
      for (const ev of speakEvents.slice(0, 5)) {
        expect(ev.text.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('Guided Listening UI & Slider aria-valuetext stability in App', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps slider aria-valuetext stable while auto-playing, updates on manual step, and stops on route change', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline test'));
    vi.spyOn(sonificationEngine, 'playDataStep').mockReturnValue({
      normPitch: 0.5,
      normRhythm: 0.5,
      normIntensity: 0.5,
      midiNote: 60,
      pitchHz: 261.6,
      noteName: 'C4',
      rhythmBpm: 110,
      pulseDensityHz: 2,
      modulationSpeedHz: 1,
      intensityDb: -12,
      filterHz: 1200,
      isNegativeAnomaly: false,
      explanationText: 'mocked'
    });
    const stopNodesSpy = vi.spyOn(sonificationEngine, 'stopAllNodes').mockImplementation(() => {});
    const stopSpeechSpy = vi.spyOn(speechService, 'stop').mockImplementation(() => {});

    useAccessibilityStore.getState().resetDefaults();
    useEarthSonicStore.getState().setStepIndex(0);
    useEarthSonicStore.getState().setIsPlaying(false);

    await import('../pages/ExplorerPage');
    await import('../pages/UserGuidePage');
    window.history.pushState({}, '', '/explorer');
    render(<App />);

    // One-time dismissible hint is visible and can turn on Guided Listening
    const hint = await screen.findByTestId('guided-listening-hint', {}, { timeout: 8000 });
    expect(hint.textContent).toContain('Using a screen reader? Turn on Guided listening');

    const turnOnBtn = screen.getByRole('button', { name: /Turn on Guided listening/i });
    fireEvent.click(turnOnBtn);
    expect(useAccessibilityStore.getState().prefs.guidedListening).toBe(true);
    expect(screen.queryByTestId('guided-listening-hint')).toBeNull();

    // Verify slider aria-valuetext stability while auto-playing in standard mode
    useAccessibilityStore.getState().updatePref('guidedListening', false);
    const scrubber = screen.getByRole('slider', { name: 'Timeline scrubber' });
    const initialValueText = scrubber.getAttribute('aria-valuetext');

    vi.useFakeTimers();
    vi.setSystemTime(200_000);
    try {
      const playBtns = screen.getAllByRole('button', { name: /Play sonification/i });
      await act(async () => {
        fireEvent.click(playBtns[0]);
        await vi.advanceTimersByTimeAsync(1800);
      });

      // Visual step advanced, but slider aria-valuetext remained stable during auto-play
      expect(useEarthSonicStore.getState().stepIndex).toBeGreaterThan(0);
      expect(scrubber.getAttribute('aria-valuetext')).toBe(initialValueText);

      // Manual step immediately updates aria-valuetext
      await act(async () => {
        fireEvent.change(scrubber, { target: { value: '5' } });
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(scrubber.getAttribute('aria-valuetext')).not.toBe(initialValueText);
      expect(scrubber.getAttribute('aria-valuetext')).toContain('hertz');
      expect(scrubber.getAttribute('aria-valuetext')).toMatch(/Sim Step 6|1964/);

      // Route change stops playback & speech
      stopNodesSpy.mockClear();
      stopSpeechSpy.mockClear();
      const guideLinks = screen.getAllByRole('link', { name: /User Guide|Guide/i });
      const guideLink = guideLinks.find((el) => el.getAttribute('href') === '/guide') ?? guideLinks[0];
      await act(async () => {
        fireEvent.click(guideLink);
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(window.location.pathname).toBe('/guide');
      expect(stopNodesSpy).toHaveBeenCalled();
      expect(stopSpeechSpy).toHaveBeenCalled();
      expect(useEarthSonicStore.getState().isPlaying).toBe(false);
    } finally {
      useEarthSonicStore.getState().setIsPlaying(false);
      vi.useRealTimers();
    }
  }, 15000);
});
