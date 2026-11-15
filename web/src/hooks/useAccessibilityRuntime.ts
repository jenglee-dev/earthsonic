import { useEffect } from 'react';
import type { ExperienceId } from '../types/earthsonic';
import {
  applyAccessibilityDomEffects,
  computeEffectiveReducedMotion,
  type PaletteMode,
  useAccessibilityStore
} from '../store/useAccessibilityStore';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';

const COLORBLIND_SAFE_EXP_COLORS: Record<ExperienceId, string> = {
  temperature: '#E69F00', // Okabe-Ito Orange/Amber (high luminance on dark navy)
  ocean: '#56B4E9',       // Okabe-Ito Sky Blue
  atmosphere: '#CC79A7'   // Okabe-Ito Reddish Purple (distinguishable across protan/deutan/tritan)
};

export function getExperienceAccentColor(
  id: ExperienceId,
  palette: PaletteMode
): string {
  if (palette === 'colorblind') {
    return COLORBLIND_SAFE_EXP_COLORS[id];
  }
  return EARTH_EXPERIENCES[id].themeColor;
}

export function useExperienceAccentColor(id: ExperienceId): string {
  const palette = useAccessibilityStore((s) => s.prefs.palette);
  return getExperienceAccentColor(id, palette);
}

export function useEffectiveReducedMotion(): boolean {
  const pref = useAccessibilityStore((s) => s.prefs.reduceMotion);
  const osReduced = useAccessibilityStore((s) => s.osReducedMotion);
  return computeEffectiveReducedMotion(pref, osReduced);
}

/**
 * Keeps <html> data attributes, root font-size scaling, and OS prefers-reduced-motion
 * listener active for the lifetime of the app.
 */
export function useAccessibilityDomSync(): void {
  const prefs = useAccessibilityStore((s) => s.prefs);
  const osReduced = useAccessibilityStore((s) => s.osReducedMotion);
  const setOsReducedMotion = useAccessibilityStore((s) => s.setOsReducedMotion);

  useEffect(() => {
    applyAccessibilityDomEffects(prefs, osReduced);
  }, [prefs, osReduced]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setOsReducedMotion(Boolean(mq.matches));
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [setOsReducedMotion]);
}
