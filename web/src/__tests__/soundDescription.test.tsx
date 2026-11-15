import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { computeAcousticParameters } from '../audio/sonificationEngine';
import {
  buildHearTheChangeAnnouncement,
  buildOrchestraAnnouncement,
  buildSoundDescription
} from '../services/soundDescriptionBuilder';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { LiveAnnouncer } from '../components/a11y/LiveAnnouncer';
import { LiveSoundCaptionsBar } from '../components/a11y/LiveSoundCaptionsBar';
import { JukeboxTransportDeck } from '../components/JukeboxTransportDeck';
import { useAccessibilityStore } from '../store/useAccessibilityStore';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import { sonificationEngine } from '../audio/sonificationEngine';
import App from '../App';

describe('soundDescriptionBuilder — real mapped descriptions', () => {
  it('builds Minimal, Standard, and Detailed strings for temperature, ocean, and atmosphere using real mapped values', () => {
    for (const id of ['temperature', 'ocean', 'atmosphere'] as const) {
      const exp = EARTH_EXPERIENCES[id];
      const pt = exp.referenceSeries[1];
      const prev = exp.referenceSeries[0];
      const expectedParams = computeAcousticParameters(pt, exp.id, exp.mappings);

      const result = buildSoundDescription({
        experience: exp,
        point: pt,
        prevPoint: prev,
        stepIndex: 1,
        totalSteps: exp.referenceSeries.length
      });

      expect(result.minimal).toContain(pt.dateLabel);
      expect(result.standard).toContain(result.minimal);
      expect(result.standard).toContain(expectedParams.noteName);
      expect(result.detailed).toContain(result.standard);
      expect(result.detailed).toContain(`Step 2 of ${exp.referenceSeries.length}.`);

      if (id === 'temperature') {
        expect(result.standard).toContain(`${Math.round(expectedParams.pitchHz)} hertz`);
        expect(result.detailed).toContain('1951 to 1980 baseline');
      } else if (id === 'ocean') {
        expect(result.standard).toContain(`${expectedParams.rhythmBpm} beats per minute`);
        expect(result.detailed).toContain('1982 to 2010 baseline');
      } else {
        expect(result.standard).toContain(`${Math.round(expectedParams.filterHz)} hertz cutoff`);
        expect(result.detailed).toContain('parts per million range');
      }
    }
  });

  it('accurately detects rising, falling, steady, and initial direction without inventing comparisons', () => {
    const exp = EARTH_EXPERIENCES.temperature;
    const base = exp.referenceSeries[0]; // -0.17

    const initial = buildSoundDescription({
      experience: exp,
      point: base,
      stepIndex: 0,
      totalSteps: exp.referenceSeries.length
    });
    expect(initial.direction).toBe('initial');
    expect(initial.detailed).toContain('First observation in the series.');

    const rising = buildSoundDescription({
      experience: exp,
      point: { ...base, primaryValue: 0.45 },
      prevPoint: base,
      stepIndex: 1,
      totalSteps: exp.referenceSeries.length
    });
    expect(rising.direction).toBe('rising');
    expect(rising.standard).toContain('pitch rising');
    expect(rising.detailed).toContain('Pitch rose');

    const falling = buildSoundDescription({
      experience: exp,
      point: { ...base, primaryValue: -0.35 },
      prevPoint: base,
      stepIndex: 1,
      totalSteps: exp.referenceSeries.length
    });
    expect(falling.direction).toBe('falling');
    expect(falling.standard).toContain('pitch falling');
    expect(falling.detailed).toContain('Pitch fell');

    const steady = buildSoundDescription({
      experience: exp,
      point: { ...base, primaryValue: base.primaryValue },
      prevPoint: base,
      stepIndex: 1,
      totalSteps: exp.referenceSeries.length
    });
    expect(steady.direction).toBe('steady');
    expect(steady.standard).toContain('pitch steady');
    expect(steady.detailed).toContain('held steady');
  });

  it('handles missing or non-finite values safely without inventing numbers', () => {
    const exp = EARTH_EXPERIENCES.temperature;
    const missing = buildSoundDescription({
      experience: exp,
      point: undefined,
      stepIndex: 0,
      totalSteps: 10
    });
    expect(missing.minimal).toBe('The Warming Planet. Observation unavailable. Step 1 of 10.');
    expect(missing.standard).toBe(missing.minimal);

    const nanPt = buildSoundDescription({
      experience: exp,
      point: { ...exp.referenceSeries[0], primaryValue: Number.NaN },
      stepIndex: 0,
      totalSteps: 10
    });
    expect(nanPt.detailed).toContain('Observation unavailable.');
  });

  it('computes real Hear the Change octave differences and Earth Orchestra layer mixes', () => {
    const exp = EARTH_EXPERIENCES.temperature;
    const ptA = exp.referenceSeries[0];
    const ptB = exp.referenceSeries[exp.referenceSeries.length - 1];
    const pA = computeAcousticParameters(ptA, exp.id, exp.mappings);
    const pB = computeAcousticParameters(ptB, exp.id, exp.mappings);
    const expectedOctaves = Math.abs(Math.log2(pB.pitchHz / pA.pitchHz)).toFixed(1);

    const compareMsg = buildHearTheChangeAnnouncement(exp, ptA, ptB);
    expect(compareMsg).toContain(`Observation A: ${ptA.dateLabel}`);
    expect(compareMsg).toContain(`Observation B: ${ptB.dateLabel}`);
    expect(compareMsg).toContain(`${expectedOctaves} octaves`);

    const orchMsg = buildOrchestraAnnouncement(
      'Pacific Ocean',
      EARTH_EXPERIENCES.ocean.referenceSeries[0],
      EARTH_EXPERIENCES.temperature,
      EARTH_EXPERIENCES.ocean.referenceSeries[0],
      EARTH_EXPERIENCES.ocean,
      EARTH_EXPERIENCES.atmosphere.referenceSeries[0],
      EARTH_EXPERIENCES.atmosphere,
      { temperatureEnabled: true, waterEnabled: true, atmosphereEnabled: false }
    );
    expect(orchMsg).toContain('Earth Orchestra at Pacific Ocean');
    expect(orchMsg).toContain('Temperature');
    expect(orchMsg).toContain('Water');
    expect(orchMsg).not.toContain('Atmosphere ');
  });
});

describe('liveAnnouncer throttle, deduplication, direction flip, and live region presence', () => {
  beforeEach(() => {
    liveAnnouncer.resetThrottle();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throttles playback to >= 2s, skips duplicates, and bypasses throttle on direction flip or manual step', () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    render(<LiveAnnouncer />);
    const polite = screen.getByTestId('global-live-polite');
    expect(polite.getAttribute('role')).toBe('status');
    expect(polite.getAttribute('aria-live')).toBe('polite');

    act(() => {
      const fired1 = liveAnnouncer.announcePlayback({ message: '1950, minus 0.17 degrees C.', minIntervalMs: 2000 });
      expect(fired1).toBe(true);
      vi.advanceTimersByTime(110);
    });
    expect(polite.textContent).toBe('1950, minus 0.17 degrees C.');

    // Within 2 seconds and no flip -> throttled
    act(() => {
      vi.setSystemTime(21_000);
      const fired2 = liveAnnouncer.announcePlayback({ message: '1953, minus 0.05 degrees C.', minIntervalMs: 2000 });
      expect(fired2).toBe(false);
      vi.advanceTimersByTime(110);
    });
    expect(polite.textContent).toBe('1950, minus 0.17 degrees C.');

    // Direction flipped within 2 seconds -> fires immediately
    act(() => {
      vi.setSystemTime(21_200);
      const fired3 = liveAnnouncer.announcePlayback({
        message: '1956, minus 0.19 degrees C.',
        directionFlipped: true,
        minIntervalMs: 2000
      });
      expect(fired3).toBe(true);
      vi.advanceTimersByTime(110);
    });
    expect(polite.textContent).toBe('1956, minus 0.19 degrees C.');

    // Duplicate message after 2s -> skipped
    act(() => {
      vi.setSystemTime(24_000);
      const firedDup = liveAnnouncer.announcePlayback({
        message: '1956, minus 0.19 degrees C.',
        minIntervalMs: 2000
      });
      expect(firedDup).toBe(false);
      vi.advanceTimersByTime(110);
    });

    // Manual step within 2s -> fires immediately
    act(() => {
      vi.setSystemTime(24_100);
      const firedManual = liveAnnouncer.announcePlayback({
        message: '1960, minus 0.03 degrees C.',
        manual: true,
        minIntervalMs: 2000
      });
      expect(firedManual).toBe(true);
      vi.advanceTimersByTime(110);
    });
    expect(polite.textContent).toBe('1960, minus 0.03 degrees C.');
    vi.useRealTimers();
  });

  it('exposes LiveSoundCaptionsBar to AT without aria-hidden or double live announcement', () => {
    const exp = EARTH_EXPERIENCES.temperature;
    const pt = exp.referenceSeries[0];
    const params = computeAcousticParameters(pt, exp.id, exp.mappings);

    render(
      <LiveSoundCaptionsBar
        experience={exp}
        currentPoint={pt}
        telemetry={{
          isPlaying: true,
          isMuted: false,
          stepIndex: 0,
          primaryPitchHz: params.pitchHz,
          primaryNoteName: params.noteName,
          primaryRhythmBpm: params.rhythmBpm,
          primaryIntensityDb: params.intensityDb,
          primaryFilterHz: params.filterHz,
          compareActive: false,
          secondaryPitchHz: params.pitchHz,
          secondaryNoteName: params.noteName,
          secondaryRhythmBpm: params.rhythmBpm,
          secondaryIntensityDb: params.intensityDb
        }}
        accentColor="#FFC66D"
      />
    );

    const captions = screen.getByTestId('live-sound-captions');
    expect(captions.getAttribute('aria-hidden')).toBeNull();
    expect(captions.querySelector('[aria-live="off"]')).not.toBeNull();
    expect(captions.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('sets timeline slider aria-valuetext to sound description and invokes Describe current sound without toggling playback', () => {
    useAccessibilityStore.getState().updatePref('announcementVerbosity', 'standard');
    const exp = EARTH_EXPERIENCES.temperature;
    const pt = exp.referenceSeries[1];
    const params = computeAcousticParameters(pt, exp.id, exp.mappings);
    const onTogglePlay = vi.fn();
    const onDescribeSound = vi.fn();

    render(
      <JukeboxTransportDeck
        experience={exp}
        series={exp.referenceSeries}
        currentPoint={pt}
        stepIndex={1}
        totalSteps={exp.referenceSeries.length}
        isPlaying={false}
        isMuted={false}
        volume={0.8}
        playbackSpeed={1}
        loopEnabled={true}
        telemetry={{
          isPlaying: false,
          isMuted: false,
          stepIndex: 1,
          primaryPitchHz: params.pitchHz,
          primaryNoteName: params.noteName,
          primaryRhythmBpm: params.rhythmBpm,
          primaryIntensityDb: params.intensityDb,
          primaryFilterHz: params.filterHz,
          compareActive: false,
          secondaryPitchHz: params.pitchHz,
          secondaryNoteName: params.noteName,
          secondaryRhythmBpm: params.rhythmBpm,
          secondaryIntensityDb: params.intensityDb
        }}
        onTogglePlay={onTogglePlay}
        onStepChange={() => {}}
        onReset={() => {}}
        onToggleMute={() => {}}
        onVolumeChange={() => {}}
        onSpeedChange={() => {}}
        onToggleLoop={() => {}}
        onDescribeSound={onDescribeSound}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Timeline scrubber' });
    const expectedDesc = buildSoundDescription({
      experience: exp,
      point: pt,
      prevPoint: exp.referenceSeries[0],
      stepIndex: 1,
      totalSteps: exp.referenceSeries.length
    }).standard;
    expect(slider.getAttribute('aria-valuetext')).toBe(expectedDesc);

    const describeBtn = screen.getByRole('button', { name: /Describe current sound/i });
    fireEvent.click(describeBtn);
    expect(onDescribeSound).toHaveBeenCalledTimes(1);
    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it('persists announcement verbosity, enabled flag, ducking, and paused-only setting in localStorage', () => {
    const store = useAccessibilityStore.getState();
    store.updatePref('announcementVerbosity', 'detailed');
    store.updatePref('pauseSoundWhileAnnouncing', true);
    store.updatePref('announceOnlyWhenPausedOrRequested', true);
    store.updatePref('announcementsEnabled', false);

    const saved = JSON.parse(localStorage.getItem('earthsonic_a11y_prefs_v1') || '{}');
    expect(saved.announcementVerbosity).toBe('detailed');
    expect(saved.pauseSoundWhileAnnouncing).toBe(true);
    expect(saved.announceOnlyWhenPausedOrRequested).toBe(true);
    expect(saved.announcementsEnabled).toBe(false);

    store.resetDefaults();
    expect(useAccessibilityStore.getState().prefs.announcementVerbosity).toBe('standard');
    expect(useAccessibilityStore.getState().prefs.announcementsEnabled).toBe(true);
    expect(useAccessibilityStore.getState().prefs.pauseSoundWhileAnnouncing).toBe(false);
    expect(useAccessibilityStore.getState().prefs.announceOnlyWhenPausedOrRequested).toBe(false);
  });

  it('Explorer playback updates live region, changes across steps, stays visible to AT, and updates slider aria-valuetext', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline unit test'));
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
    vi.spyOn(sonificationEngine, 'stopAllNodes').mockImplementation(() => {});
    useAccessibilityStore.getState().resetDefaults();
    useEarthSonicStore.getState().setStepIndex(0);
    useEarthSonicStore.getState().setIsPlaying(false);

    await import('../pages/ExplorerPage');
    window.history.pushState({}, '', '/explorer');
    render(<App />);

    const playButtons = await screen.findAllByRole('button', { name: /Play sonification/i }, { timeout: 8000 });
    const playBtn = playButtons[0];

    const polite = screen.getByTestId('global-live-polite');
    expect(polite.getAttribute('role')).toBe('status');
    expect(polite.getAttribute('aria-live')).toBe('polite');
    expect(polite.getAttribute('aria-hidden')).toBeNull();
    expect(getComputedStyle(polite).display).not.toBe('none');

    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    try {
      // Start playback
      await act(async () => {
        fireEvent.click(playBtn);
        await vi.advanceTimersByTimeAsync(150);
      });

      const firstAnnouncement = polite.textContent || '';
      expect(firstAnnouncement).toContain('hertz');
      expect(firstAnnouncement).toContain('pulse');

      // Advance playback past 2s throttle and verify live region + slider aria-valuetext change
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2400);
      });

      const secondAnnouncement = polite.textContent || '';
      expect(secondAnnouncement).toContain('hertz');
      expect(secondAnnouncement).not.toBe(firstAnnouncement);

      const scrubber = screen.getByRole('slider', { name: 'Timeline scrubber' });
      const dataScrubber = screen.getByRole('slider', { name: 'Chronological data timeline scrubber' });
      expect(scrubber.getAttribute('aria-valuetext')).toContain('hertz');
      expect(dataScrubber.getAttribute('aria-valuetext')).toBe(scrubber.getAttribute('aria-valuetext'));
      expect(screen.getByTestId('now-playing-description').textContent).toContain('hertz');
    } finally {
      useEarthSonicStore.getState().setIsPlaying(false);
      vi.useRealTimers();
    }
  }, 15000);
});
