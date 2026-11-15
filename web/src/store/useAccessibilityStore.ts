import { create } from 'zustand';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { speechService } from '../services/speechService';
import type { AnnouncementVerbosity } from '../services/soundDescriptionBuilder';

export type { AnnouncementVerbosity };
export type TextSizeScale = 100 | 125 | 150 | 175 | 200;
export type ContrastMode = 'default' | 'high';
export type PaletteMode = 'default' | 'colorblind';
export type ReduceMotionPref = 'system' | 'on' | 'off';
export type GuidedListenSeconds = 2 | 3 | 5 | 8;
export type GuidedWaitScale = 'short' | 'normal' | 'long';
export type GuidedAnnounceFrequency = 'every' | 'every_5_or_trend' | 'on_request';
export type AccessibilityPresetId =
  | 'default'
  | 'low_vision'
  | 'screen_reader'
  | 'deaf_captions'
  | 'calm_motion';

export interface AccessibilityPreferences {
  textSize: TextSizeScale;
  contrast: ContrastMode;
  palette: PaletteMode;
  reduceMotion: ReduceMotionPref;
  readableFont: boolean;
  textSpacing: boolean;
  largerTargets: boolean;
  thickFocus: boolean;
  soundCaptions: boolean;
  speechEnabled: boolean;
  singleKeyShortcuts: boolean;
  announcementsEnabled: boolean;
  announcementVerbosity: AnnouncementVerbosity;
  pauseSoundWhileAnnouncing: boolean;
  announceOnlyWhenPausedOrRequested: boolean;
  guidedListening: boolean;
  guidedListenSeconds: GuidedListenSeconds;
  guidedWaitScale: GuidedWaitScale;
  guidedAnnounceFrequency: GuidedAnnounceFrequency;
  guidedPauseBetweenSteps: boolean;
  guidedAnnouncePhaseChanges: boolean;
  guidedHintDismissed: boolean;
}

export const A11Y_PREFS_STORAGE_KEY = 'earthsonic_a11y_prefs_v1';

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPreferences = {
  textSize: 100,
  contrast: 'default',
  palette: 'default',
  reduceMotion: 'system',
  readableFont: false,
  textSpacing: false,
  largerTargets: false,
  thickFocus: false,
  soundCaptions: false,
  speechEnabled: false,
  singleKeyShortcuts: true,
  announcementsEnabled: true,
  announcementVerbosity: 'standard',
  pauseSoundWhileAnnouncing: false,
  announceOnlyWhenPausedOrRequested: false,
  guidedListening: false,
  guidedListenSeconds: 3,
  guidedWaitScale: 'normal',
  guidedAnnounceFrequency: 'every',
  guidedPauseBetweenSteps: false,
  guidedAnnouncePhaseChanges: false,
  guidedHintDismissed: false
};

const VALID_TEXT_SIZES: readonly TextSizeScale[] = [100, 125, 150, 175, 200];
const VALID_LISTEN_SECONDS: readonly GuidedListenSeconds[] = [2, 3, 5, 8];

export function sanitizeAccessibilityPrefs(raw: unknown): AccessibilityPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ACCESSIBILITY_PREFS };
  const obj = raw as Record<string, unknown>;
  const rawSize = Number(obj.textSize);
  const textSize = (VALID_TEXT_SIZES.includes(rawSize as TextSizeScale)
    ? rawSize
    : 100) as TextSizeScale;

  const verbosity =
    obj.announcementVerbosity === 'minimal' ||
    obj.announcementVerbosity === 'standard' ||
    obj.announcementVerbosity === 'detailed'
      ? obj.announcementVerbosity
      : 'standard';

  const rawListen = Number(obj.guidedListenSeconds);
  const guidedListenSeconds = (VALID_LISTEN_SECONDS.includes(rawListen as GuidedListenSeconds)
    ? rawListen
    : 3) as GuidedListenSeconds;

  const guidedWaitScale: GuidedWaitScale =
    obj.guidedWaitScale === 'short' ||
    obj.guidedWaitScale === 'normal' ||
    obj.guidedWaitScale === 'long'
      ? obj.guidedWaitScale
      : 'normal';

  const guidedAnnounceFrequency: GuidedAnnounceFrequency =
    obj.guidedAnnounceFrequency === 'every' ||
    obj.guidedAnnounceFrequency === 'every_5_or_trend' ||
    obj.guidedAnnounceFrequency === 'on_request'
      ? obj.guidedAnnounceFrequency
      : 'every';

  return {
    textSize,
    contrast: obj.contrast === 'high' ? 'high' : 'default',
    palette: obj.palette === 'colorblind' ? 'colorblind' : 'default',
    reduceMotion:
      obj.reduceMotion === 'on' || obj.reduceMotion === 'off' || obj.reduceMotion === 'system'
        ? obj.reduceMotion
        : 'system',
    readableFont: Boolean(obj.readableFont),
    textSpacing: Boolean(obj.textSpacing),
    largerTargets: Boolean(obj.largerTargets),
    thickFocus: Boolean(obj.thickFocus),
    soundCaptions: Boolean(obj.soundCaptions),
    speechEnabled: Boolean(obj.speechEnabled),
    singleKeyShortcuts:
      typeof obj.singleKeyShortcuts === 'boolean' ? obj.singleKeyShortcuts : true,
    announcementsEnabled:
      typeof obj.announcementsEnabled === 'boolean' ? obj.announcementsEnabled : true,
    announcementVerbosity: verbosity,
    pauseSoundWhileAnnouncing: Boolean(obj.pauseSoundWhileAnnouncing),
    announceOnlyWhenPausedOrRequested: Boolean(obj.announceOnlyWhenPausedOrRequested),
    guidedListening: Boolean(obj.guidedListening),
    guidedListenSeconds,
    guidedWaitScale,
    guidedAnnounceFrequency,
    guidedPauseBetweenSteps: Boolean(obj.guidedPauseBetweenSteps),
    guidedAnnouncePhaseChanges: Boolean(obj.guidedAnnouncePhaseChanges),
    guidedHintDismissed: Boolean(obj.guidedHintDismissed)
  };
}

function readStoredPrefs(): AccessibilityPreferences {
  try {
    const raw = localStorage.getItem(A11Y_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ACCESSIBILITY_PREFS };
    return sanitizeAccessibilityPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFS };
  }
}

function writeStoredPrefs(prefs: AccessibilityPreferences): void {
  try {
    localStorage.setItem(A11Y_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function getOsReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
}

export function computeEffectiveReducedMotion(
  pref: ReduceMotionPref,
  osReduced = getOsReducedMotion()
): boolean {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return osReduced;
}

export function applyAccessibilityDomEffects(
  prefs: AccessibilityPreferences,
  osReduced = getOsReducedMotion()
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const reduced = computeEffectiveReducedMotion(prefs.reduceMotion, osReduced);

  root.style.fontSize = `${prefs.textSize}%`;
  root.setAttribute('data-text-size', String(prefs.textSize));
  root.setAttribute('data-contrast', prefs.contrast);
  root.setAttribute('data-palette', prefs.palette);
  root.setAttribute('data-motion', reduced ? 'reduce' : 'full');
  root.setAttribute('data-font', prefs.readableFont ? 'readable' : 'default');
  root.setAttribute('data-spacing', prefs.textSpacing ? 'wide' : 'default');
  root.setAttribute('data-targets', prefs.largerTargets ? 'large' : 'default');
  root.setAttribute('data-focus', prefs.thickFocus ? 'thick' : 'default');
  root.setAttribute('data-shortcuts', prefs.singleKeyShortcuts ? 'on' : 'off');
}

export function isEffectiveReducedMotionActive(): boolean {
  const pref = useAccessibilityStore.getState().prefs.reduceMotion;
  return computeEffectiveReducedMotion(pref, getOsReducedMotion());
}

export const ACCESSIBILITY_PRESETS: {
  id: AccessibilityPresetId;
  label: string;
  description: string;
  patch: Partial<AccessibilityPreferences>;
}[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Standard dark telemetry palette, OS motion preference, 100% scale.',
    patch: { ...DEFAULT_ACCESSIBILITY_PREFS }
  },
  {
    id: 'low_vision',
    label: 'Low Vision',
    description: '150% text, High Contrast borders & ink, readable font, thick focus rings.',
    patch: {
      textSize: 150,
      contrast: 'high',
      readableFont: true,
      textSpacing: true,
      largerTargets: true,
      thickFocus: true
    }
  },
  {
    id: 'screen_reader',
    label: 'Screen Reader / Speech',
    description: 'Detailed sound announcements, spoken readouts on, thick focus rings, single-key off.',
    patch: {
      announcementsEnabled: true,
      announcementVerbosity: 'detailed',
      speechEnabled: true,
      thickFocus: true,
      singleKeyShortcuts: false
    }
  },
  {
    id: 'deaf_captions',
    label: 'Deaf / Captions',
    description: 'Live Sound Captions stream on with pitch, rhythm, and filter descriptions.',
    patch: {
      soundCaptions: true,
      thickFocus: true
    }
  },
  {
    id: 'calm_motion',
    label: 'Calm / Reduce Motion',
    description: 'Stops 3D globe idle spin, particle sweeps, ripples, and animated waves.',
    patch: {
      reduceMotion: 'on',
      thickFocus: true
    }
  }
];

interface AccessibilityStoreState {
  prefs: AccessibilityPreferences;
  osReducedMotion: boolean;
  centerOpen: boolean;
  activePreset: AccessibilityPresetId | 'custom';
  setCenterOpen: (open: boolean) => void;
  setOsReducedMotion: (val: boolean) => void;
  updatePref: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
    announcement?: string
  ) => void;
  applyPreset: (presetId: AccessibilityPresetId) => void;
  resetDefaults: () => void;
}

const initialPrefs = readStoredPrefs();
const initialOsReduced = getOsReducedMotion();
applyAccessibilityDomEffects(initialPrefs, initialOsReduced);

export const useAccessibilityStore = create<AccessibilityStoreState>((set, get) => ({
  prefs: initialPrefs,
  osReducedMotion: initialOsReduced,
  centerOpen: false,
  activePreset: 'custom',

  setCenterOpen: (open) => set({ centerOpen: open }),

  setOsReducedMotion: (val) => {
    const prefs = get().prefs;
    applyAccessibilityDomEffects(prefs, val);
    set({ osReducedMotion: val });
  },

  updatePref: (key, value, announcement) => {
    const nextPrefs: AccessibilityPreferences = sanitizeAccessibilityPrefs({
      ...get().prefs,
      [key]: value
    });
    if (key === 'speechEnabled' && !value) {
      speechService.stop();
    }
    writeStoredPrefs(nextPrefs);
    applyAccessibilityDomEffects(nextPrefs, get().osReducedMotion);
    set({ prefs: nextPrefs, activePreset: 'custom' });
    if (announcement) {
      liveAnnouncer.announcePolite(announcement);
    }
  },

  applyPreset: (presetId) => {
    const preset = ACCESSIBILITY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const base = presetId === 'default' ? DEFAULT_ACCESSIBILITY_PREFS : { ...DEFAULT_ACCESSIBILITY_PREFS, ...preset.patch };
    const nextPrefs = sanitizeAccessibilityPrefs(base);
    if (!nextPrefs.speechEnabled) {
      speechService.stop();
    }
    writeStoredPrefs(nextPrefs);
    applyAccessibilityDomEffects(nextPrefs, get().osReducedMotion);
    set({ prefs: nextPrefs, activePreset: presetId });
    liveAnnouncer.announcePolite(`Applied accessibility preset: ${preset.label}.`);
  },

  resetDefaults: () => {
    speechService.stop();
    const nextPrefs = { ...DEFAULT_ACCESSIBILITY_PREFS };
    writeStoredPrefs(nextPrefs);
    applyAccessibilityDomEffects(nextPrefs, get().osReducedMotion);
    set({ prefs: nextPrefs, activePreset: 'default' });
    liveAnnouncer.announcePolite('Accessibility settings reset to defaults.');
  }
}));
