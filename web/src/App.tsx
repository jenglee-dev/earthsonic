import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EARTH_EXPERIENCES } from './data/earthDatasets';
import { useEarthSonicStore } from './store/useEarthSonicStore';
import { useAccessibilityStore } from './store/useAccessibilityStore';
import { useEarthData } from './hooks/useEarthData';
import { computeAcousticParameters, sonificationEngine } from './audio/sonificationEngine';
import { liveAnnouncer } from './services/a11yAnnouncer';
import { speechService } from './services/speechService';
import {
  guidedListeningController,
  type GuidedPlaybackConfig,
  type GuidedStateSnapshot
} from './services/guidedListeningController';
import {
  buildSoundDescription,
  type DirectionOfChange
} from './services/soundDescriptionBuilder';
import { AppShell } from './components/layout/AppShell';
import type { EarthExperience, SonificationTelemetry } from './types/earthsonic';

function RouteCleanupObserver({ onStop }: { onStop: () => void }) {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      onStopRef.current();
    }
  }, [pathname]);

  useEffect(() => () => onStopRef.current(), []);
  return null;
}

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage').then((m) => ({ default: m.ExplorerPage })));
const HearTheChangePage = lazy(() =>
  import('./pages/HearTheChangePage').then((m) => ({ default: m.HearTheChangePage }))
);
const OrchestraPage = lazy(() => import('./pages/OrchestraPage').then((m) => ({ default: m.OrchestraPage })));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const UserGuidePage = lazy(() => import('./pages/UserGuidePage').then((m) => ({ default: m.UserGuidePage })));
const DataSourcesPage = lazy(() => import('./pages/DataSourcesPage').then((m) => ({ default: m.DataSourcesPage })));

const RouteFallback = () => (
  <div className="min-h-[50vh] rounded-3xl glass-panel-deep p-8 flex items-center justify-center text-xs font-mono-tabular text-[#9AA9BD]">
    Loading EarthSonic view...
  </div>
);

export function App() {
  const activeExperienceId = useEarthSonicStore((s) => s.activeExperienceId);
  const selectedLat = useEarthSonicStore((s) => s.selectedLat);
  const selectedLon = useEarthSonicStore((s) => s.selectedLon);
  const isPlaying = useEarthSonicStore((s) => s.isPlaying);
  const setIsPlaying = useEarthSonicStore((s) => s.setIsPlaying);
  const isMuted = useEarthSonicStore((s) => s.isMuted);
  const setIsMuted = useEarthSonicStore((s) => s.setIsMuted);
  const volume = useEarthSonicStore((s) => s.volume);
  const setVolume = useEarthSonicStore((s) => s.setVolume);
  const playbackSpeed = useEarthSonicStore((s) => s.playbackSpeed);
  const loopEnabled = useEarthSonicStore((s) => s.loopEnabled);
  const stepIndex = useEarthSonicStore((s) => s.stepIndex);
  const setStepIndex = useEarthSonicStore((s) => s.setStepIndex);
  const soundSettings = useEarthSonicStore((s) => s.soundSettings);

  useEffect(() => {
    sonificationEngine.setVolume(volume);
  }, [volume]);

  const experience = EARTH_EXPERIENCES[activeExperienceId];

  const siteQuery = useMemo(
    () =>
      activeExperienceId === 'temperature'
        ? undefined
        : { lat: selectedLat, lon: selectedLon },
    [activeExperienceId, selectedLat, selectedLon]
  );

  const {
    series: activeSeries,
    provenance,
    documentedRange,
    variable: loadedVariable,
    unit: loadedUnit,
    isRatioScale,
    isLoading,
    isDegraded,
    failureReason,
    degradedMessage,
    retry,
    switchToDemonstrationData
  } = useEarthData(activeExperienceId, isPlaying, siteQuery);

  // Align normalization bounds & displayed unit/variable with the actual fetched payload
  const effectiveExperience: EarthExperience = useMemo(() => {
    const basePitch = experience.mappings.pitch;
    if (
      loadedUnit &&
      loadedVariable &&
      loadedUnit !== basePitch.unit
    ) {
      return {
        ...experience,
        mappings: {
          ...experience.mappings,
          pitch: {
            ...basePitch,
            variableName: loadedVariable,
            unit: loadedUnit,
            minData: documentedRange.min,
            maxData: documentedRange.max
          }
        }
      };
    }
    return experience;
  }, [experience, loadedUnit, loadedVariable, documentedRange.min, documentedRange.max]);

  const safeStepIndex = Math.min(Math.max(0, stepIndex), Math.max(0, activeSeries.length - 1));
  const currentPoint = activeSeries[safeStepIndex] || activeSeries[0];

  const telemetry: SonificationTelemetry = useMemo(() => {
    const primaryParams = computeAcousticParameters(
      currentPoint,
      activeExperienceId,
      effectiveExperience.mappings,
      soundSettings
    );
    return {
      isPlaying,
      isMuted,
      stepIndex: safeStepIndex,
      primaryPitchHz: primaryParams.pitchHz,
      primaryNoteName: primaryParams.noteName,
      primaryRhythmBpm: primaryParams.rhythmBpm,
      primaryIntensityDb: primaryParams.intensityDb,
      primaryFilterHz: primaryParams.filterHz,
      compareActive: false,
      secondaryPitchHz: primaryParams.pitchHz,
      secondaryNoteName: primaryParams.noteName,
      secondaryRhythmBpm: primaryParams.rhythmBpm,
      secondaryIntensityDb: primaryParams.intensityDb
    };
  }, [currentPoint, activeExperienceId, effectiveExperience.mappings, soundSettings, isPlaying, isMuted, safeStepIndex]);

  const synthesizeStep = useCallback(
    (idx: number, durationSec: number) => {
      const pt = activeSeries[idx];
      if (!pt) return;
      sonificationEngine.playDataStep({
        point: pt,
        experienceId: activeExperienceId,
        mappings: experience.mappings,
        durationSec,
        pan: 0,
        gainTrim: 1,
        settings: soundSettings
      });
    },
    [activeSeries, activeExperienceId, experience.mappings, soundSettings]
  );

  const stepRef = useRef(safeStepIndex);
  stepRef.current = safeStepIndex;

  const guidedListening = useAccessibilityStore((s) => s.prefs.guidedListening);
  const guidedListenSeconds = useAccessibilityStore((s) => s.prefs.guidedListenSeconds);
  const guidedWaitScale = useAccessibilityStore((s) => s.prefs.guidedWaitScale);
  const guidedAnnounceFrequency = useAccessibilityStore((s) => s.prefs.guidedAnnounceFrequency);
  const guidedPauseBetweenSteps = useAccessibilityStore((s) => s.prefs.guidedPauseBetweenSteps);
  const guidedAnnouncePhaseChanges = useAccessibilityStore((s) => s.prefs.guidedAnnouncePhaseChanges);
  const speechEnabled = useAccessibilityStore((s) => s.prefs.speechEnabled);
  const announcementsEnabled = useAccessibilityStore((s) => s.prefs.announcementsEnabled);
  const announcementVerbosity = useAccessibilityStore((s) => s.prefs.announcementVerbosity);
  const pauseSoundWhileAnnouncing = useAccessibilityStore(
    (s) => s.prefs.pauseSoundWhileAnnouncing
  );
  const announceOnlyWhenPausedOrRequested = useAccessibilityStore(
    (s) => s.prefs.announceOnlyWhenPausedOrRequested
  );

  const [guidedState, setGuidedState] = useState<GuidedStateSnapshot>(() =>
    guidedListeningController.getSnapshot()
  );
  useEffect(() => guidedListeningController.subscribe(setGuidedState), []);

  const buildGuidedConfig = useCallback(
    (overrideStep?: number): GuidedPlaybackConfig => ({
      experience: effectiveExperience,
      series: activeSeries,
      startStepIndex: overrideStep ?? stepRef.current,
      listenSeconds: guidedListenSeconds,
      gapMs: 1000,
      waitScale: guidedWaitScale,
      announceFrequency: guidedAnnounceFrequency,
      pauseBetweenSteps: guidedPauseBetweenSteps,
      announcePhaseChanges: guidedAnnouncePhaseChanges,
      announcementsEnabled,
      speechEnabled,
      pauseSoundWhileAnnouncing,
      loopEnabled,
      userVolume: isMuted ? 0 : volume,
      soundSettings,
      onStepChange: setStepIndex,
      onRunningChange: setIsPlaying
    }),
    [
      effectiveExperience,
      activeSeries,
      guidedListenSeconds,
      guidedWaitScale,
      guidedAnnounceFrequency,
      guidedPauseBetweenSteps,
      guidedAnnouncePhaseChanges,
      announcementsEnabled,
      speechEnabled,
      pauseSoundWhileAnnouncing,
      loopEnabled,
      isMuted,
      volume,
      soundSettings,
      setStepIndex,
      setIsPlaying
    ]
  );

  const stopAllPlaybackAndSpeech = useCallback(() => {
    guidedListeningController.stop(setIsPlaying);
    speechService.stop();
    sonificationEngine.stopAllNodes();
    sonificationEngine.setVolume(isMuted ? 0 : volume);
  }, [isMuted, setIsPlaying, volume]);

  // Standard (non-guided) auto-play loop
  useEffect(() => {
    if (!isPlaying || guidedListening) return;
    const baseStepMs = 580 / playbackSpeed;
    const durationSec = (baseStepMs / 1000) * 0.95;

    synthesizeStep(stepRef.current, durationSec);

    const timer = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        if (next >= activeSeries.length) {
          if (loopEnabled) {
            synthesizeStep(0, durationSec);
            return 0;
          }
          setIsPlaying(false);
          return prev;
        }
        synthesizeStep(next, durationSec);
        return next;
      });
    }, baseStepMs);

    return () => clearInterval(timer);
  }, [isPlaying, guidedListening, playbackSpeed, activeSeries.length, loopEnabled, synthesizeStep, setStepIndex, setIsPlaying]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && (isPlaying || guidedState.active)) {
        stopAllPlaybackAndSpeech();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isPlaying, guidedState.active, stopAllPlaybackAndSpeech]);
  const a11yMountRef = useRef(false);
  const prevDirectionRef = useRef<DirectionOfChange>('initial');
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const duckEnabledRef = useRef(pauseSoundWhileAnnouncing);
  duckEnabledRef.current = pauseSoundWhileAnnouncing;

  const currentSoundDescription = useMemo(
    () =>
      buildSoundDescription({
        experience: effectiveExperience,
        point: currentPoint,
        prevPoint: safeStepIndex > 0 ? activeSeries[safeStepIndex - 1] : undefined,
        stepIndex: safeStepIndex,
        totalSteps: activeSeries.length,
        soundSettings
      }),
    [effectiveExperience, currentPoint, safeStepIndex, activeSeries, soundSettings]
  );

  // Duck master sonification volume while Web Speech is speaking when enabled
  useEffect(() => {
    let wasDucked = false;
    return speechService.subscribe((speaking) => {
      if (speaking && duckEnabledRef.current) {
        wasDucked = true;
        sonificationEngine.setVolume(Math.min(0.08, volumeRef.current));
      } else if (!speaking && wasDucked) {
        wasDucked = false;
        sonificationEngine.setVolume(volumeRef.current);
      }
    });
  }, []);

  const [stableStepIndex, setStableStepIndex] = useState(safeStepIndex);

  useEffect(() => {
    if (!isPlaying && !guidedListening) {
      setStableStepIndex(safeStepIndex);
    }
  }, [isPlaying, guidedListening, safeStepIndex]);

  const announcedStepIndex = guidedListening
    ? guidedState.announcedStepIndex
    : isPlaying
    ? stableStepIndex
    : safeStepIndex;

  const handleManualStep = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(activeSeries.length - 1, idx));
      setStableStepIndex(clamped);
      if (guidedListening) {
        guidedListeningController.playManualStep(clamped, buildGuidedConfig(clamped), false);
        return;
      }
      setStepIndex(clamped);
      if (!isPlaying) {
        synthesizeStep(clamped, 0.45);
      }
      const pt = activeSeries[clamped];
      if (pt) {
        const desc = buildSoundDescription({
          experience: effectiveExperience,
          point: pt,
          prevPoint: clamped > 0 ? activeSeries[clamped - 1] : undefined,
          stepIndex: clamped,
          totalSteps: activeSeries.length,
          soundSettings
        });
        prevDirectionRef.current = desc.direction;
        if (announcementsEnabled) {
          const msg = desc.forLevel(announcementVerbosity);
          liveAnnouncer.announcePlayback({ message: msg, manual: true });
          if (speechEnabled) speechService.speak(msg, { interrupt: true });
        }
      }
    },
    [
      activeSeries,
      guidedListening,
      buildGuidedConfig,
      isPlaying,
      setStepIndex,
      synthesizeStep,
      effectiveExperience,
      soundSettings,
      announcementsEnabled,
      announcementVerbosity,
      speechEnabled
    ]
  );

  const handleTogglePlay = useCallback(() => {
    if (guidedListening) {
      if (isPlaying || guidedState.active) {
        guidedListeningController.stop(setIsPlaying);
      } else {
        guidedListeningController.startAuto(buildGuidedConfig(stepRef.current));
      }
      return;
    }
    setIsPlaying((p) => {
      if (p) {
        sonificationEngine.stopAllNodes();
        speechService.stop();
      }
      return !p;
    });
  }, [guidedListening, isPlaying, guidedState.active, setIsPlaying, buildGuidedConfig]);

  const handleReplayCurrentTone = useCallback(() => {
    if (guidedListening) {
      guidedListeningController.replayTone(stepRef.current, buildGuidedConfig(stepRef.current));
    } else {
      synthesizeStep(stepRef.current, 0.8);
    }
  }, [guidedListening, buildGuidedConfig, synthesizeStep]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sonificationEngine.setMuted(nextMuted);
  }, [isMuted, setIsMuted]);

  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
      if (val > 0 && isMuted) {
        setIsMuted(false);
        sonificationEngine.setMuted(false);
      }
      sonificationEngine.setVolume(val);
    },
    [isMuted, setIsMuted, setVolume]
  );

  const handleDescribeCurrentSound = useCallback(() => {
    const msg = guidedListening
      ? currentSoundDescription.standard
      : currentSoundDescription.detailed;
    liveAnnouncer.announcePolite(msg, { force: true });
    if (speechEnabled) {
      speechService.speak(msg, { interrupt: true });
    }
  }, [currentSoundDescription.detailed, currentSoundDescription.standard, guidedListening, speechEnabled]);

  const prevExpIdRef = useRef(activeExperienceId);
  const prevPlayingRef = useRef(isPlaying);

  // Playback start/pause, experience change, and throttled playback sound descriptions (>= 2s gap)
  useEffect(() => {
    if (!a11yMountRef.current) {
      a11yMountRef.current = true;
      prevExpIdRef.current = activeExperienceId;
      prevPlayingRef.current = isPlaying;
      return;
    }

    const expChanged = prevExpIdRef.current !== activeExperienceId;
    const playChanged = prevPlayingRef.current !== isPlaying;
    prevExpIdRef.current = activeExperienceId;
    prevPlayingRef.current = isPlaying;

    if (expChanged && guidedListening) {
      guidedListeningController.stop(setIsPlaying);
      speechService.stop();
    }

    if (!announcementsEnabled) return;

    if (expChanged && currentPoint) {
      prevDirectionRef.current = currentSoundDescription.direction;
      liveAnnouncer.announcePlayback({
        message: `Switched to ${effectiveExperience.shortTitle}. ${currentSoundDescription.forLevel(announcementVerbosity)}`,
        manual: true
      });
      return;
    }

    // Guided Listening owns its own LISTEN -> SPEAK -> GAP announcements
    if (guidedListening) return;

    if (playChanged) {
      if (isPlaying && currentPoint) {
        prevDirectionRef.current = currentSoundDescription.direction;
        liveAnnouncer.announcePlayback({
          message: `Playing ${effectiveExperience.shortTitle}. ${currentSoundDescription.forLevel(announcementVerbosity)}`,
          manual: true
        });
      } else {
        liveAnnouncer.announcePolite('Sonification paused.');
      }
      return;
    }

    if (!isPlaying || !currentPoint || announceOnlyWhenPausedOrRequested) return;

    const prevDir = prevDirectionRef.current;
    const nextDir = currentSoundDescription.direction;
    const directionFlipped =
      (prevDir === 'rising' && nextDir === 'falling') ||
      (prevDir === 'falling' && nextDir === 'rising');
    prevDirectionRef.current = nextDir;

    liveAnnouncer.announcePlayback({
      message: currentSoundDescription.forLevel(announcementVerbosity),
      directionFlipped,
      minIntervalMs: 2000
    });
  }, [
    isPlaying,
    guidedListening,
    activeExperienceId,
    safeStepIndex,
    currentPoint,
    announcementsEnabled,
    announceOnlyWhenPausedOrRequested,
    announcementVerbosity,
    effectiveExperience.shortTitle,
    currentSoundDescription,
    setIsPlaying
  ]);

  const speakSummaryText = currentSoundDescription.forLevel(announcementVerbosity);

  // Global keyboard shortcuts matching EARTHSONIC_KEYMAP (respects singleKeyShortcuts setting & open dialogs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!useAccessibilityStore.getState().prefs.singleKeyShortcuts) return;
      if (document.querySelector('[role="dialog"]')) return;

      const targetEl = e.target instanceof Element ? e.target : null;
      const htmlTarget = e.target instanceof HTMLElement ? e.target : null;
      const tag = targetEl?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || htmlTarget?.isContentEditable) {
        return;
      }
      const insideGlobe = Boolean(
        targetEl?.closest('[role="application"], [aria-label*="Interactive 3D Earth globe" i], button[aria-label*="Globe keyboard controller" i]')
      );
      const onInteractiveControl = Boolean(
        targetEl?.closest('button, a, [role="button"], [role="tab"], [role="switch"], [role="slider"]')
      );
      const onCustomArrows = Boolean(
        targetEl?.closest('[role="slider"], button[aria-label*="Keyboard Step" i]')
      );

      if (e.code === 'Space' && !insideGlobe && !onInteractiveControl) {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        handleDescribeCurrentSound();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReplayCurrentTone();
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        const store = useAccessibilityStore.getState();
        const next = !store.prefs.announcementsEnabled;
        store.updatePref(
          'announcementsEnabled',
          next,
          `Screen reader sound announcements ${next ? 'enabled' : 'disabled'}.`
        );
      } else if (!insideGlobe && !onCustomArrows && e.code === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (safeStepIndex + 1) % activeSeries.length;
        handleManualStep(nextIdx);
      } else if (!insideGlobe && !onCustomArrows && e.code === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (safeStepIndex - 1 + activeSeries.length) % activeSeries.length;
        handleManualStep(prevIdx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleTogglePlay,
    handleToggleMute,
    handleDescribeCurrentSound,
    handleReplayCurrentTone,
    handleManualStep,
    safeStepIndex,
    activeSeries.length
  ]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteCleanupObserver onStop={stopAllPlaybackAndSpeech} />
      <AppShell
        provenance={provenance}
        isDegraded={isDegraded}
        degradedMessage={degradedMessage}
        failureReason={failureReason}
        onRetry={retry}
        speakSummaryText={speakSummaryText}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  experience={effectiveExperience}
                  series={activeSeries}
                  provenance={provenance}
                />
              }
            />
            <Route
              path="/explorer"
              element={
                <ExplorerPage
                  experience={effectiveExperience}
                  series={activeSeries}
                  provenance={provenance}
                  isLoading={isLoading}
                  failureReason={failureReason}
                  degradedMessage={degradedMessage}
                  telemetry={telemetry}
                  currentPoint={currentPoint}
                  announcedStepIndex={announcedStepIndex}
                  onRetry={retry}
                  onSwitchToDemo={switchToDemonstrationData}
                  onStepChange={handleManualStep}
                  onTogglePlay={handleTogglePlay}
                  onReset={() => {
                    guidedListeningController.reset(setIsPlaying);
                    speechService.stop();
                    sonificationEngine.stopAllNodes();
                    setIsPlaying(false);
                    setStepIndex(0);
                    setStableStepIndex(0);
                    liveAnnouncer.announcePolite('Timeline reset to first observation.');
                  }}
                  onToggleMute={handleToggleMute}
                  onVolumeChange={handleVolumeChange}
                  onDescribeSound={handleDescribeCurrentSound}
                />
              }
            />
            <Route
              path="/hear-the-change"
              element={
                <HearTheChangePage
                  experience={effectiveExperience}
                  series={activeSeries}
                  provenance={provenance}
                  isRatioScale={isRatioScale}
                  documentedRange={documentedRange}
                />
              }
            />
            <Route path="/orchestra" element={<OrchestraPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/guide" element={<UserGuidePage onRetryBackend={retry} />} />
            <Route path="/data" element={<DataSourcesPage provenance={provenance} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
