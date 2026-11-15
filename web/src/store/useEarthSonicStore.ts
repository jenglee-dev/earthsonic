import { create } from 'zustand';
import type { ExperienceId } from '../types/earthsonic';
import type { SoundMappingSettings } from '../audio/DataToSoundMapper';
import { formatCoords, type PlaceType } from '../services/placeLookup';

export interface SavedPlace {
  lat: number;
  lon: number;
  name: string;
  subtitle: string;
  type: PlaceType;
}

export interface GlobePresetLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export const GLOBE_PRESET_LOCATIONS: GlobePresetLocation[] = [
  { id: 'pacific-nino', name: 'Equatorial Pacific (Niño 3.4)', region: 'Central Pacific Ocean', lat: 0, lon: -140 },
  { id: 'amazon', name: 'Amazon Basin', region: 'South America', lat: -3.4, lon: -62.2 },
  { id: 'sahara', name: 'Central Sahara', region: 'North Africa', lat: 23.4, lon: 11.5 },
  { id: 'arctic', name: 'High Arctic Ocean', region: 'Svalbard / Fram Strait', lat: 78.2, lon: 15.6 },
  { id: 'atlantic-monsoon', name: 'Tropical Atlantic ITCZ', region: 'Equatorial Atlantic', lat: 5, lon: -45 },
  { id: 'bay-bengal', name: 'Bay of Bengal Monsoon', region: 'Indian Ocean', lat: 14.5, lon: 88.0 },
  { id: 'greenland', name: 'Greenland Ice Sheet', region: 'Summit Station', lat: 72.6, lon: -38.5 },
  { id: 'gulf-stream', name: 'North Atlantic Gulf Stream', region: 'Western Atlantic', lat: 36.0, lon: -68.0 },
  { id: 'great-barrier', name: 'Great Barrier Reef', region: 'Coral Sea, Australia', lat: -18.3, lon: 147.7 },
  { id: 'tibet', name: 'Tibetan Plateau', region: 'High Asia', lat: 32.0, lon: 88.0 },
  { id: 'sahel', name: 'Sahel Belt', region: 'West Africa', lat: 14.0, lon: 2.0 },
  { id: 'southern-ocean', name: 'Southern Ocean (Drake Passage)', region: 'Antarctic Circumpolar', lat: -58.0, lon: -64.0 },
  { id: 'kuroshio', name: 'Kuroshio Current', region: 'Northwest Pacific', lat: 31.0, lon: 138.0 },
  { id: 'congo', name: 'Congo Basin', region: 'Central Africa', lat: 0.5, lon: 21.5 },
  { id: 'mediterranean', name: 'Eastern Mediterranean', region: 'Southern Europe', lat: 35.0, lon: 24.0 },
  { id: 'california', name: 'California Current', region: 'Northeast Pacific', lat: 36.8, lon: -123.5 },
  { id: 'alaska', name: 'Boreal Alaska', region: 'Interior North America', lat: 64.8, lon: -147.7 },
  { id: 'antarctica', name: 'Ross Sea Shelf', region: 'Antarctica', lat: -75.0, lon: 175.0 }
];

const TOUR_STORAGE_KEY = 'earthsonic_explorer_tour_completed_v1';
const FAVORITES_STORAGE_KEY = 'earthsonic_favorite_places_v1';
const RECENT_STORAGE_KEY = 'earthsonic_recent_places_v1';

function readTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function readSavedPlaces(key: string, maxItems: number): SavedPlace[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedPlace =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as SavedPlace).lat === 'number' &&
          Number.isFinite((item as SavedPlace).lat) &&
          typeof (item as SavedPlace).lon === 'number' &&
          Number.isFinite((item as SavedPlace).lon) &&
          typeof (item as SavedPlace).name === 'string'
      )
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

function writeSavedPlaces(key: string, places: SavedPlace[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(places));
  } catch {
    // ignore storage quota errors
  }
}

export function parseExperienceParam(raw: string | null): ExperienceId | null {
  if (!raw) return null;
  const norm = raw.trim().toLowerCase();
  if (norm === 'warming' || norm === 'temperature') return 'temperature';
  if (norm === 'water' || norm === 'ocean') return 'ocean';
  if (norm === 'atmosphere' || norm === 'wind') return 'atmosphere';
  return null;
}

export function toExperienceQuerySlug(id: ExperienceId): string {
  if (id === 'temperature') return 'warming';
  if (id === 'ocean') return 'ocean';
  return 'atmosphere';
}

export function clampLatLon(lat: number, lon: number): { lat: number; lon: number } {
  const safeLat = Number.isFinite(lat) ? Math.max(-90, Math.min(90, Number(lat.toFixed(2)))) : 0;
  const safeLon = Number.isFinite(lon) ? Math.max(-180, Math.min(180, Number(lon.toFixed(2)))) : -140;
  return { lat: safeLat, lon: safeLon };
}

interface EarthSonicState {
  activeExperienceId: ExperienceId;
  selectedLat: number;
  selectedLon: number;
  selectedLocationName: string;
  pinCardOpen: boolean;
  favoritePlaces: SavedPlace[];
  recentPlaces: SavedPlace[];
  accessibilityMode: boolean;
  use2DMapFallback: boolean;
  lowQualityMode: boolean;
  tourCompleted: boolean;
  tourOpen: boolean;

  // Shared audio / transport state
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  loopEnabled: boolean;
  stepIndex: number;
  soundSettings: SoundMappingSettings;

  // Actions
  setExperienceId: (id: ExperienceId) => void;
  setLocation: (lat: number, lon: number, name?: string, subtitle?: string, type?: PlaceType, openPinCard?: boolean) => void;
  setPinCardOpen: (val: boolean) => void;
  toggleFavoritePlace: (place: SavedPlace) => void;
  toggleAccessibilityMode: () => void;
  setAccessibilityMode: (val: boolean) => void;
  setUse2DMapFallback: (val: boolean) => void;
  setLowQualityMode: (val: boolean) => void;
  completeTour: () => void;
  restartTour: () => void;
  closeTour: () => void;
  setIsPlaying: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsMuted: (val: boolean) => void;
  setVolume: (val: number) => void;
  setPlaybackSpeed: (val: number) => void;
  setLoopEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  setStepIndex: (val: number | ((prev: number) => number)) => void;
  setSoundSettings: (
    val: SoundMappingSettings | ((prev: SoundMappingSettings) => SoundMappingSettings)
  ) => void;
}

export const useEarthSonicStore = create<EarthSonicState>((set) => ({
  activeExperienceId: 'temperature',
  selectedLat: 0,
  selectedLon: -140,
  selectedLocationName: 'North Pacific Ocean',
  pinCardOpen: true,
  favoritePlaces: readSavedPlaces(FAVORITES_STORAGE_KEY, 12),
  recentPlaces: readSavedPlaces(RECENT_STORAGE_KEY, 8),
  accessibilityMode: false,
  use2DMapFallback: false,
  lowQualityMode: false,
  tourCompleted: readTourCompleted(),
  tourOpen: false,

  isPlaying: false,
  isMuted: false,
  volume: 0.6,
  playbackSpeed: 1.0,
  loopEnabled: true,
  stepIndex: 0,
  soundSettings: {
    pitchRange: 'standard',
    soundIntensity: 0.85,
    musicalComplexity: 'harmonic',
    soundStyle: 'warm_synth'
  },

  setExperienceId: (id) =>
    set((state) => {
      const style: SoundMappingSettings['soundStyle'] =
        id === 'temperature'
          ? 'warm_synth'
          : id === 'ocean'
          ? 'crystalline_fm'
          : 'atmospheric_pad';
      return {
        activeExperienceId: id,
        stepIndex: 0,
        soundSettings: { ...state.soundSettings, soundStyle: style }
      };
    }),

  setLocation: (lat, lon, name, subtitle = '', type = 'unknown', openPinCard = true) =>
    set((state) => {
      const clamped = clampLatLon(lat, lon);
      const resolvedName = name || formatCoords(clamped.lat, clamped.lon);
      const entry: SavedPlace = {
        lat: clamped.lat,
        lon: clamped.lon,
        name: resolvedName,
        subtitle,
        type
      };
      const nextRecent = [
        entry,
        ...state.recentPlaces.filter(
          (p) => Math.abs(p.lat - entry.lat) > 0.05 || Math.abs(p.lon - entry.lon) > 0.05
        )
      ].slice(0, 8);
      writeSavedPlaces(RECENT_STORAGE_KEY, nextRecent);
      return {
        selectedLat: clamped.lat,
        selectedLon: clamped.lon,
        selectedLocationName: resolvedName,
        pinCardOpen: openPinCard,
        recentPlaces: nextRecent
      };
    }),

  setPinCardOpen: (val) => set({ pinCardOpen: val }),

  toggleFavoritePlace: (place) =>
    set((state) => {
      const exists = state.favoritePlaces.some(
        (p) => Math.abs(p.lat - place.lat) <= 0.05 && Math.abs(p.lon - place.lon) <= 0.05
      );
      const next = exists
        ? state.favoritePlaces.filter(
            (p) => Math.abs(p.lat - place.lat) > 0.05 || Math.abs(p.lon - place.lon) > 0.05
          )
        : [place, ...state.favoritePlaces].slice(0, 12);
      writeSavedPlaces(FAVORITES_STORAGE_KEY, next);
      return { favoritePlaces: next };
    }),

  toggleAccessibilityMode: () =>
    set((s) => ({ accessibilityMode: !s.accessibilityMode })),
  setAccessibilityMode: (val) => set({ accessibilityMode: val }),
  setUse2DMapFallback: (val) => set({ use2DMapFallback: val }),
  setLowQualityMode: (val) => set({ lowQualityMode: val }),

  completeTour: () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    set({ tourCompleted: true, tourOpen: false });
  },

  restartTour: () => {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ tourCompleted: false, tourOpen: true });
  },

  closeTour: () => set({ tourOpen: false }),

  setIsPlaying: (val) =>
    set((s) => ({
      isPlaying: typeof val === 'function' ? val(s.isPlaying) : val
    })),
  setIsMuted: (val) => set({ isMuted: val }),
  setVolume: (val) => set({ volume: val }),
  setPlaybackSpeed: (val) => set({ playbackSpeed: val }),
  setLoopEnabled: (val) =>
    set((s) => ({
      loopEnabled: typeof val === 'function' ? val(s.loopEnabled) : val
    })),
  setStepIndex: (val) =>
    set((s) => ({
      stepIndex: typeof val === 'function' ? val(s.stepIndex) : val
    })),
  setSoundSettings: (val) =>
    set((s) => ({
      soundSettings: typeof val === 'function' ? val(s.soundSettings) : val
    }))
}));
