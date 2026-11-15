import { sonificationEngine } from '../audio/sonificationEngine';
import type { SoundMappingSettings } from '../audio/DataToSoundMapper';
import type { DataPoint, EarthExperience } from '../types/earthsonic';
import type {
  GuidedAnnounceFrequency,
  GuidedListenSeconds,
  GuidedWaitScale
} from '../store/useAccessibilityStore';
import { liveAnnouncer } from './a11yAnnouncer';
import { buildSoundDescription, type DirectionOfChange } from './soundDescriptionBuilder';
import { speechService } from './speechService';

export type GuidedPhase = 'IDLE' | 'LISTEN' | 'SPEAK' | 'GAP' | 'PAUSED';

export interface GuidedStateSnapshot {
  phase: GuidedPhase;
  stepIndex: number;
  announcedStepIndex: number;
  nowPlayingText: string;
  progressPct: number;
  active: boolean;
}

export interface GuidedEventLogEntry {
  tMs: number;
  phase: GuidedPhase;
  stepIndex: number;
  text: string;
}

export interface GuidedPlaybackConfig {
  experience: EarthExperience;
  series: DataPoint[];
  startStepIndex: number;
  listenSeconds: GuidedListenSeconds;
  gapMs?: number;
  waitScale: GuidedWaitScale;
  announceFrequency: GuidedAnnounceFrequency;
  pauseBetweenSteps: boolean;
  announcePhaseChanges: boolean;
  announcementsEnabled: boolean;
  speechEnabled: boolean;
  pauseSoundWhileAnnouncing: boolean;
  loopEnabled: boolean;
  userVolume: number;
  soundSettings: SoundMappingSettings;
  onStepChange: (stepIndex: number) => void;
  onRunningChange: (running: boolean) => void;
}

export interface GuidedDeps {
  playTone: (opts: {
    point: DataPoint;
    experience: EarthExperience;
    durationSec: number;
    soundSettings: SoundMappingSettings;
  }) => void;
  stopAudio: () => void;
  setVolume: (vol: number) => void;
  announcePolite: (msg: string) => void;
  speakAsync: (msg: string, fallbackTimeoutMs: number) => Promise<boolean>;
  stopSpeech: () => void;
  isSpeechSupported: () => boolean;
  now: () => number;
}

const WAIT_SCALE_FACTORS: Record<GuidedWaitScale, number> = {
  short: 0.8,
  normal: 1.0,
  long: 1.4
};

/**
 * Estimates screen-reader speaking duration at ~160 WPM plus a 1.5 s margin,
 * scaled by the user's Short / Normal / Long wait setting.
 */
export function estimateSpeechWaitMs(text: string, waitScale: GuidedWaitScale): number {
  const words = Math.max(1, text.trim().split(/\s+/).filter(Boolean).length);
  const baseMs = Math.round((words / 160) * 60_000) + 1500;
  const factor = WAIT_SCALE_FACTORS[waitScale] ?? 1.0;
  return Math.max(1500, Math.round(baseMs * factor));
}

export function shouldAnnounceGuidedStep(opts: {
  frequency: GuidedAnnounceFrequency;
  stepIndex: number;
  prevDirection: DirectionOfChange;
  direction: DirectionOfChange;
  manual?: boolean;
}): boolean {
  if (opts.manual) return true;
  if (opts.frequency === 'every') return true;
  if (opts.frequency === 'on_request') return false;
  const isFifth = opts.stepIndex === 0 || (opts.stepIndex + 1) % 5 === 0;
  const trendFlipped =
    (opts.prevDirection === 'rising' && opts.direction === 'falling') ||
    (opts.prevDirection === 'falling' && opts.direction === 'rising');
  return isFifth || trendFlipped;
}

const DEFAULT_DEPS: GuidedDeps = {
  playTone: ({ point, experience, durationSec, soundSettings }) => {
    sonificationEngine.playDataStep({
      point,
      experienceId: experience.id,
      mappings: experience.mappings,
      durationSec,
      pan: 0,
      gainTrim: 1,
      settings: soundSettings
    });
  },
  stopAudio: () => sonificationEngine.stopAllNodes(),
  setVolume: (vol) => sonificationEngine.setVolume(vol),
  announcePolite: (msg) => liveAnnouncer.announcePolite(msg, { force: true }),
  speakAsync: (msg, fallbackTimeoutMs) => speechService.speakAsync(msg, { fallbackTimeoutMs }),
  stopSpeech: () => speechService.stop(),
  isSpeechSupported: () => speechService.isSupported(),
  now: () => Date.now()
};

/**
 * Turn-taking Guided Listening state machine:
 * LISTEN (sound alone) -> SPEAK (ducked sound + complete description, waits for onend/estimate) -> GAP (silence) -> next.
 */
export class GuidedListeningController {
  private deps: GuidedDeps;
  private listeners = new Set<(snap: GuidedStateSnapshot) => void>();
  private eventLog: GuidedEventLogEntry[] = [];
  private activeTimers = new Set<ReturnType<typeof setTimeout>>();
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private runToken = 0;
  private lastUserVolume = 0.8;
  private prevDirection: DirectionOfChange = 'initial';
  private startedAtMs = 0;

  private snapshot: GuidedStateSnapshot = {
    phase: 'IDLE',
    stepIndex: 0,
    announcedStepIndex: 0,
    nowPlayingText: '',
    progressPct: 0,
    active: false
  };

  constructor(deps: Partial<GuidedDeps> = {}) {
    this.deps = { ...DEFAULT_DEPS, ...deps };
  }

  public getSnapshot(): GuidedStateSnapshot {
    return this.snapshot;
  }

  public getEventLog(): GuidedEventLogEntry[] {
    return [...this.eventLog];
  }

  public clearEventLog(): void {
    this.eventLog = [];
    this.startedAtMs = this.deps.now();
  }

  public subscribe(listener: (snap: GuidedStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(patch: Partial<GuidedStateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private recordEvent(phase: GuidedPhase, stepIndex: number, text: string): void {
    const tMs = Math.max(0, this.deps.now() - this.startedAtMs);
    this.eventLog.push({ tMs, phase, stepIndex, text });
  }

  private clearTimers(): void {
    for (const id of this.activeTimers) {
      clearTimeout(id);
    }
    this.activeTimers.clear();
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private waitMs(ms: number, token: number): Promise<boolean> {
    if (ms <= 0) return Promise.resolve(token === this.runToken);
    return new Promise<boolean>((resolve) => {
      const id = setTimeout(() => {
        this.activeTimers.delete(id);
        resolve(token === this.runToken);
      }, ms);
      this.activeTimers.add(id);
    });
  }

  private startProgressBar(durationMs: number, token: number): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    const start = this.deps.now();
    this.emit({ progressPct: 0 });
    this.progressTimer = setInterval(() => {
      if (token !== this.runToken) {
        if (this.progressTimer !== null) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
        return;
      }
      const elapsed = this.deps.now() - start;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / Math.max(1, durationMs)) * 100)));
      this.emit({ progressPct: pct });
    }, 100);
  }

  public startAuto(config: GuidedPlaybackConfig): void {
    this.cancelInternal(config.userVolume);
    this.clearEventLog();
    this.prevDirection = 'initial';
    const token = this.runToken;
    this.lastUserVolume = config.userVolume;
    config.onRunningChange(true);
    void this.runCycle(config.startStepIndex, config, token, { manual: false, singleStep: false });
  }

  public playManualStep(stepIndex: number, config: GuidedPlaybackConfig, continueAuto = false): void {
    this.cancelInternal(config.userVolume);
    if (this.eventLog.length === 0) {
      this.startedAtMs = this.deps.now();
    }
    const token = this.runToken;
    this.lastUserVolume = config.userVolume;
    const clamped = Math.max(0, Math.min(config.series.length - 1, stepIndex));
    // Manual arrow-key / button stepping updates announcedStepIndex immediately.
    this.emit({ stepIndex: clamped, announcedStepIndex: clamped });
    config.onStepChange(clamped);
    config.onRunningChange(continueAuto);
    void this.runCycle(clamped, config, token, { manual: true, singleStep: !continueAuto });
  }

  public replayTone(stepIndex: number, config: GuidedPlaybackConfig): void {
    this.cancelInternal(config.userVolume);
    const token = this.runToken;
    this.lastUserVolume = config.userVolume;
    const clamped = Math.max(0, Math.min(config.series.length - 1, stepIndex));
    const pt = config.series[clamped];
    if (!pt) return;

    this.emit({
      phase: 'LISTEN',
      stepIndex: clamped,
      active: true,
      progressPct: 0
    });
    this.recordEvent('LISTEN', clamped, `Replay tone: ${pt.dateLabel}`);
    this.deps.setVolume(Math.min(0.95, config.userVolume));
    this.deps.playTone({
      point: pt,
      experience: config.experience,
      durationSec: config.listenSeconds,
      soundSettings: config.soundSettings
    });
    this.startProgressBar(config.listenSeconds * 1000, token);
    void this.waitMs(config.listenSeconds * 1000, token).then((ok) => {
      if (!ok) return;
      this.deps.stopAudio();
      this.emit({ phase: 'PAUSED', active: false, progressPct: 100 });
    });
  }

  public stop(onRunningChange?: (running: boolean) => void): void {
    this.cancelInternal(this.lastUserVolume);
    onRunningChange?.(false);
    this.emit({ phase: 'PAUSED', active: false, progressPct: 0 });
    this.recordEvent('PAUSED', this.snapshot.stepIndex, 'Stopped');
  }

  public reset(onRunningChange?: (running: boolean) => void): void {
    this.cancelInternal(this.lastUserVolume);
    onRunningChange?.(false);
    this.prevDirection = 'initial';
    this.emit({
      phase: 'IDLE',
      stepIndex: 0,
      announcedStepIndex: 0,
      nowPlayingText: '',
      progressPct: 0,
      active: false
    });
  }

  private cancelInternal(restoreVolume: number): void {
    this.runToken += 1;
    this.clearTimers();
    this.deps.stopSpeech();
    this.deps.stopAudio();
    this.deps.setVolume(Math.min(0.95, Math.max(0, restoreVolume)));
  }

  private async runCycle(
    stepIndex: number,
    config: GuidedPlaybackConfig,
    token: number,
    mode: { manual: boolean; singleStep: boolean }
  ): Promise<void> {
    if (token !== this.runToken) return;
    const pt = config.series[stepIndex];
    if (!pt) {
      this.stop(config.onRunningChange);
      return;
    }

    this.lastUserVolume = config.userVolume;
    const prevPt = stepIndex > 0 ? config.series[stepIndex - 1] : undefined;
    const desc = buildSoundDescription({
      experience: config.experience,
      point: pt,
      prevPoint: prevPt,
      stepIndex,
      totalSteps: config.series.length,
      soundSettings: config.soundSettings
    });

    // Phase 1: LISTEN (tone alone, no announcements, slider aria-valuetext NOT updated)
    this.emit({
      phase: 'LISTEN',
      stepIndex,
      active: true,
      progressPct: 0
    });
    config.onStepChange(stepIndex);
    this.recordEvent('LISTEN', stepIndex, '');

    if (config.announcePhaseChanges && config.announcementsEnabled) {
      this.deps.announcePolite('Listening.');
    }

    const listenMs = config.listenSeconds * 1000;
    this.deps.setVolume(Math.min(0.95, Math.max(0, config.userVolume)));
    this.deps.playTone({
      point: pt,
      experience: config.experience,
      durationSec: config.listenSeconds,
      soundSettings: config.soundSettings
    });
    this.startProgressBar(listenMs, token);

    const listenOk = await this.waitMs(listenMs, token);
    if (!listenOk) return;

    // Phase 2: SPEAK (duck sound down smoothly, commit announcedStepIndex, speak once & wait)
    const shouldAnnounce = shouldAnnounceGuidedStep({
      frequency: config.announceFrequency,
      stepIndex,
      prevDirection: this.prevDirection,
      direction: desc.direction,
      manual: mode.manual
    });
    this.prevDirection = desc.direction;

    const text = desc.standard;
    this.emit({
      phase: 'SPEAK',
      stepIndex,
      announcedStepIndex: stepIndex,
      nowPlayingText: text,
      progressPct: 100
    });

    if (shouldAnnounce && config.announcementsEnabled) {
      const duckVol = config.pauseSoundWhileAnnouncing
        ? 0
        : Math.min(0.95, Math.max(0, config.userVolume * 0.15));
      this.deps.setVolume(duckVol);

      const estimatedMs = estimateSpeechWaitMs(text, config.waitScale);
      this.recordEvent('SPEAK', stepIndex, text);
      this.startProgressBar(estimatedMs, token);
      this.deps.announcePolite(text);

      if (config.speechEnabled && this.deps.isSpeechSupported()) {
        await this.deps.speakAsync(text, estimatedMs + 2500);
        if (token !== this.runToken) return;
      } else {
        const waitOk = await this.waitMs(estimatedMs, token);
        if (!waitOk) return;
      }
    } else {
      this.recordEvent('SPEAK', stepIndex, '(skipped per announce setting)');
    }

    // Phase 3: GAP (silence, restore master volume, pause or advance)
    this.deps.stopAudio();
    this.deps.setVolume(Math.min(0.95, Math.max(0, config.userVolume)));
    const gapMs = config.gapMs ?? 1000;
    this.emit({ phase: 'GAP', progressPct: 0 });
    this.recordEvent('GAP', stepIndex, '');

    if (config.announcePhaseChanges && config.announcementsEnabled && !config.pauseBetweenSteps && !mode.singleStep) {
      this.deps.announcePolite('Next observation.');
    }

    const gapOk = await this.waitMs(gapMs, token);
    if (!gapOk) return;

    if (config.pauseBetweenSteps || mode.singleStep) {
      config.onRunningChange(false);
      this.emit({ phase: 'PAUSED', active: false, progressPct: 0 });
      this.recordEvent('PAUSED', stepIndex, 'Waiting for user');
      return;
    }

    const nextIndex = stepIndex + 1;
    if (nextIndex >= config.series.length) {
      if (config.loopEnabled) {
        void this.runCycle(0, config, token, { manual: false, singleStep: false });
      } else {
        config.onRunningChange(false);
        this.emit({ phase: 'PAUSED', active: false, progressPct: 0 });
        this.recordEvent('PAUSED', stepIndex, 'Completed series');
      }
      return;
    }

    void this.runCycle(nextIndex, config, token, { manual: false, singleStep: false });
  }
}

export const guidedListeningController = new GuidedListeningController();
