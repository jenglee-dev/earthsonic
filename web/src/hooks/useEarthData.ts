import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  type ExperienceId,
  type SeriesResponse,
  SeriesResponseSchema
} from '@earthsonic/shared';
import {
  type ApiFailureReason,
  type ClientProvenance,
  getPlainLanguageStatusSummary
} from '../types/dataStatus';
import type { DataPoint } from '../types/earthsonic';
import { fetchExperienceSeries } from '../services/apiClient';
import { BUNDLED_DEMO_DATASETS } from '../data/fallbackData';

const API_VERSION = 'v1';
const DEVICE_CACHE_SCHEMA_VERSION = 1 as const;
const MAX_DEVICE_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const StoredDeviceEntrySchema = z.object({
  schemaVersion: z.literal(DEVICE_CACHE_SCHEMA_VERSION),
  savedAtMs: z.number(),
  payload: SeriesResponseSchema
});

export function getDeviceStorageKey(experienceId: ExperienceId): string {
  return `earthsonic_api_${API_VERSION}_device_cache_v${DEVICE_CACHE_SCHEMA_VERSION}_${experienceId}`;
}

export function saveValidatedSeriesToDevice(
  experienceId: ExperienceId,
  payload: SeriesResponse,
  storage: Storage = globalThis.localStorage
): void {
  try {
    const validated = SeriesResponseSchema.parse(payload);
    const entry = {
      schemaVersion: DEVICE_CACHE_SCHEMA_VERSION,
      savedAtMs: Date.now(),
      payload: validated
    };
    storage.setItem(getDeviceStorageKey(experienceId), JSON.stringify(entry));
  } catch {
    // Ignore storage quota or serialization errors
  }
}

export function readValidatedSeriesFromDevice(
  experienceId: ExperienceId,
  storage: Storage = globalThis.localStorage
): SeriesResponse | null {
  const key = getDeviceStorageKey(experienceId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsedJson = JSON.parse(raw);
    const validated = StoredDeviceEntrySchema.safeParse(parsedJson);
    if (!validated.success) {
      // Corrupted or outdated schema -> discard immediately
      storage.removeItem(key);
      return null;
    }
    const ageMs = Date.now() - validated.data.savedAtMs;
    if (ageMs > MAX_DEVICE_CACHE_AGE_MS || ageMs < -60000) {
      storage.removeItem(key);
      return null;
    }
    return validated.data.payload;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function mapSeriesResponseToDataPoints(seriesResp: SeriesResponse): DataPoint[] {
  const points: DataPoint[] = [];
  let idx = 0;

  for (const obs of seriesResp.observations) {
    // Keep only observations with a valid primary number for interactive chart nodes,
    // or represent missing observations cleanly without turning null into 0
    if (obs.value === null) continue;

    const dateLabel =
      seriesResp.experienceId === 'temperature'
        ? obs.date.slice(0, 4)
        : obs.date.slice(0, 7);

    points.push({
      index: idx,
      dateLabel,
      isoDate: obs.date,
      primaryValue: obs.value,
      secondaryValue: obs.secondaryValue ?? (seriesResp.experienceId === 'temperature' ? 10.5 : 6.5),
      tertiaryValue: obs.tertiaryValue ?? (seriesResp.experienceId === 'temperature' ? 0.65 : 25.0),
      annotation: obs.annotation
    });
    idx++;
  }

  return points;
}

export function buildClientProvenanceFromServer(
  serverProv: SeriesResponse['provenance'],
  isFromDeviceCache: boolean
): ClientProvenance {
  if (isFromDeviceCache) {
    return {
      dataStatus: 'SAVED_ON_DEVICE',
      originalStatus: serverProv.dataStatus,
      provider: serverProv.provider,
      sourceUrl: serverProv.sourceUrl,
      retrievedAt: serverProv.retrievedAt,
      referencePeriod: serverProv.referencePeriod,
      processing: [
        ...serverProv.processing,
        'Loaded from validated local device storage while EarthSonic backend was unreachable'
      ],
      plainLanguageSummary: getPlainLanguageStatusSummary(
        'SAVED_ON_DEVICE',
        serverProv.dataStatus,
        serverProv.retrievedAt
      )
    };
  }

  return {
    dataStatus: serverProv.dataStatus,
    provider: serverProv.provider,
    sourceUrl: serverProv.sourceUrl,
    retrievedAt: serverProv.retrievedAt,
    referencePeriod: serverProv.referencePeriod,
    processing: serverProv.processing,
    plainLanguageSummary: getPlainLanguageStatusSummary(
      serverProv.dataStatus,
      undefined,
      serverProv.retrievedAt
    )
  };
}

export interface UseEarthDataResult {
  series: DataPoint[];
  provenance: ClientProvenance;
  documentedRange: { min: number; max: number; basis: string };
  variable: string;
  unit: string;
  isRatioScale: boolean;
  isLoading: boolean;
  isDegraded: boolean;
  failureReason: ApiFailureReason | null;
  degradedMessage: string | null;
  retry: () => Promise<void>;
  switchToDemonstrationData: () => void;
}

export function useEarthData(
  experienceId: ExperienceId,
  isAudioPlaying: boolean,
  queryParams?: { lat?: number; lon?: number }
): UseEarthDataResult {
  const demoFallback = BUNDLED_DEMO_DATASETS[experienceId];

  const [series, setSeries] = useState<DataPoint[]>(demoFallback.series);
  const [provenance, setProvenance] = useState<ClientProvenance>(demoFallback.provenance);
  const [documentedRange, setDocumentedRange] = useState(demoFallback.documentedRange);
  const [variable, setVariable] = useState(demoFallback.variable);
  const [unit, setUnit] = useState(demoFallback.unit);
  const [isRatioScale, setIsRatioScale] = useState(demoFallback.isRatioScale);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [failureReason, setFailureReason] = useState<ApiFailureReason | null>(null);
  const [degradedMessage, setDegradedMessage] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef<Record<string, boolean>>({});
  const isPlayingRef = useRef(isAudioPlaying);
  isPlayingRef.current = isAudioPlaying;

  const loadExperienceData = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!isBackgroundRefresh) {
        setIsLoading(true);
        // Isolate per-experience error state so a failure on a previous experience never bleeds over
        setIsDegraded(false);
        setFailureReason(null);
        setDegradedMessage(null);
      }

      const apiRes = await fetchExperienceSeries(experienceId, queryParams);

      if (apiRes.ok) {
        const points = mapSeriesResponseToDataPoints(apiRes.data);
        if (points.length > 0) {
          saveValidatedSeriesToDevice(experienceId, apiRes.data);
          setSeries(points);
          setProvenance(buildClientProvenanceFromServer(apiRes.data.provenance, false));
          setDocumentedRange(apiRes.data.documentedRange);
          setVariable(apiRes.data.variable);
          setUnit(apiRes.data.unit);
          setIsRatioScale(Boolean(apiRes.data.isRatioScale));
          setIsDegraded(false);
          setFailureReason(null);
          setDegradedMessage(null);
          setIsLoading(false);
          hasLoadedOnceRef.current[experienceId] = true;
          return;
        }
      }

      // API failed -> Record failure reason
      const reason: ApiFailureReason = !apiRes.ok ? apiRes.reason : 'INVALID_DATA';
      setFailureReason(reason);

      // Rule (Section 6): If audio is playing during a background failure and we already have data for this experience,
      // do NOT interrupt playback or swap out the active dataset.
      if (isPlayingRef.current && hasLoadedOnceRef.current[experienceId]) {
        setIsDegraded(true);
        setDegradedMessage(
          'Couldn’t reach the EarthSonic data service during playback. Continuing with active loaded observations without interrupting audio.'
        );
        setIsLoading(false);
        return;
      }

      // Fallback Step 2: Check validated device storage (localStorage)
      const savedOnDevice = readValidatedSeriesFromDevice(experienceId);
      if (savedOnDevice) {
        const savedPoints = mapSeriesResponseToDataPoints(savedOnDevice);
        if (savedPoints.length > 0) {
          const savedDate = savedOnDevice.provenance.retrievedAt.slice(0, 10);
          setSeries(savedPoints);
          setProvenance(buildClientProvenanceFromServer(savedOnDevice.provenance, true));
          setDocumentedRange(savedOnDevice.documentedRange);
          setVariable(savedOnDevice.variable);
          setUnit(savedOnDevice.unit);
          setIsRatioScale(Boolean(savedOnDevice.isRatioScale));
          setIsDegraded(true);
          setDegradedMessage(
            `Couldn’t reach the EarthSonic data service (${reason}). Showing saved data from ${savedDate}.`
          );
          setIsLoading(false);
          hasLoadedOnceRef.current[experienceId] = true;
          return;
        }
      }

      // Fallback Step 3: Bundled local demonstration data
      const bundled = BUNDLED_DEMO_DATASETS[experienceId];
      setSeries(bundled.series);
      setProvenance(bundled.provenance);
      setDocumentedRange(bundled.documentedRange);
      setVariable(bundled.variable);
      setUnit(bundled.unit);
      setIsRatioScale(bundled.isRatioScale);
      setIsDegraded(true);
      setDegradedMessage(
        `Couldn’t reach the EarthSonic data service (${reason}). Showing demonstration data.`
      );
      setIsLoading(false);
      hasLoadedOnceRef.current[experienceId] = true;
    },
    [experienceId, queryParams]
  );

  useEffect(() => {
    loadExperienceData(false);
  }, [loadExperienceData]);

  // Auto-retry when browser fires "online" event
  useEffect(() => {
    const handleOnline = () => {
      if (isDegraded) {
        loadExperienceData(true);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isDegraded, loadExperienceData]);

  const switchToDemonstrationData = useCallback(() => {
    const bundled = BUNDLED_DEMO_DATASETS[experienceId];
    setSeries(bundled.series);
    setProvenance(bundled.provenance);
    setDocumentedRange(bundled.documentedRange);
    setVariable(bundled.variable);
    setUnit(bundled.unit);
    setIsRatioScale(bundled.isRatioScale);
    setIsDegraded(true);
    setFailureReason(null);
    setDegradedMessage(
      'Switched to bundled local demonstration data (simulated values — not NASA observations).'
    );
  }, [experienceId]);

  return {
    series,
    provenance,
    documentedRange,
    variable,
    unit,
    isRatioScale,
    isLoading,
    isDegraded,
    failureReason,
    degradedMessage,
    retry: () => loadExperienceData(false),
    switchToDemonstrationData
  };
}
