import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  type ExperienceId,
  type ObservationPoint,
  type SeriesResponse,
  SeriesResponseSchema,
  normalizeObservation
} from '@earthsonic/shared';
import { LruCache } from '../cache/lruCache.js';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const POWER_OCEAN_SNAPSHOT_PATH = path.resolve(
  __dirname,
  '../../data/snapshots/power-ocean.json'
);
export const POWER_ATMOSPHERE_SNAPSHOT_PATH = path.resolve(
  __dirname,
  '../../data/snapshots/power-atmosphere.json'
);

export const OCEAN_DOCUMENTED_RANGE = {
  min: 0.0,
  max: 14.0,
  basis:
    'Documented NASA POWER MERRA-2 monthly bias-corrected precipitation rate (PRECTOTCORR, 0.0 to 14.0 mm/day) across marine and tropical convergence zones.'
};

export const ATMOSPHERE_DOCUMENTED_RANGE = {
  min: 2.0,
  max: 14.0,
  basis:
    'Documented NASA POWER MERRA-2 monthly 10-meter wind speed (WS10M, 2.0 to 14.0 m/s) across global atmospheric circulation sentinels.'
};

const powerCache = new LruCache<SeriesResponse>(
  32,
  Number(process.env.CACHE_TTL_MS || 15 * 60 * 1000)
);

const PowerParameterMapSchema = z.record(z.string(), z.number());

export const PowerApiResponseSchema = z.object({
  properties: z.object({
    parameter: z.object({
      PRECTOTCORR: PowerParameterMapSchema.optional(),
      WS10M: PowerParameterMapSchema.optional(),
      T2M: PowerParameterMapSchema.optional(),
      T2M_RANGE: PowerParameterMapSchema.optional(),
      PS: PowerParameterMapSchema.optional()
    })
  })
});

const MONTH_CODES = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12'
];

export function cleanPowerValue(val: number | undefined): number | null {
  if (val === undefined || !Number.isFinite(val) || val <= -900) {
    return null;
  }
  return Number(val.toFixed(2));
}

export function buildPowerApiUrl(params: {
  lat: number;
  lon: number;
  startYear: number;
  endYear: number;
}): string {
  const { lat, lon, startYear, endYear } = params;
  return `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,WS10M,T2M,T2M_RANGE,PS&community=RE&longitude=${lon}&latitude=${lat}&start=${startYear}&end=${endYear}&format=JSON`;
}

export async function getPowerSeries(options: {
  experienceId: Extract<ExperienceId, 'ocean' | 'atmosphere'>;
  lat?: number;
  lon?: number;
  startYear?: number;
  endYear?: number;
  forceSnapshot?: boolean;
}): Promise<SeriesResponse> {
  const { experienceId } = options;
  // Default coordinates:
  // - ocean: Tropical Pacific ITCZ / Niño 3.4 Maritime Sentinel (lat: 4.0, lon: -140.0)
  // - atmosphere: Mauna Loa / North Pacific Atmospheric Baseline (lat: 19.54, lon: -155.58)
  const defaultLat = experienceId === 'ocean' ? 4.0 : 19.54;
  const defaultLon = experienceId === 'ocean' ? -140.0 : -155.58;

  const lat = options.lat ?? defaultLat;
  const lon = options.lon ?? defaultLon;
  const startYear = options.startYear ?? 2022;
  const endYear = options.endYear ?? 2023;

  const cacheKey = `power:${experienceId}:${lat}:${lon}:${startYear}:${endYear}`;

  if (!options.forceSnapshot) {
    const cached = powerCache.get(cacheKey);
    if (cached) return cached;
  }

  const sourceUrl = buildPowerApiUrl({ lat, lon, startYear, endYear });

  if (!options.forceSnapshot) {
    try {
      const response = await fetchWithRetry(sourceUrl);
      const rawJson = await response.json();
      const parsed = PowerApiResponseSchema.parse(rawJson);
      const paramObj = parsed.properties.parameter;

      const observations: ObservationPoint[] = [];

      for (let yr = startYear; yr <= endYear; yr++) {
        for (let mIdx = 0; mIdx < MONTH_CODES.length; mIdx++) {
          const m = MONTH_CODES[mIdx];
          const key = `${yr}${m}`;

          const precip = cleanPowerValue(paramObj.PRECTOTCORR?.[key]);
          const wind = cleanPowerValue(paramObj.WS10M?.[key]);
          const t2m = cleanPowerValue(paramObj.T2M?.[key]);
          const t2mRange = cleanPowerValue(paramObj.T2M_RANGE?.[key]);
          const ps = cleanPowerValue(paramObj.PS?.[key]);

          const isoDate = `${yr}-${m}-15`;

          if (experienceId === 'ocean') {
            const norm = normalizeObservation(
              precip,
              OCEAN_DOCUMENTED_RANGE.min,
              OCEAN_DOCUMENTED_RANGE.max
            );
            observations.push({
              date: isoDate,
              value: precip,
              secondaryValue: wind,
              tertiaryValue: t2m,
              normalized: norm,
              annotation:
                precip !== null && precip >= 8.0
                  ? `${yr}-${m}: High ITCZ Precipitation Pulse (${precip} mm/day)`
                  : undefined
            });
          } else {
            const norm = normalizeObservation(
              wind,
              ATMOSPHERE_DOCUMENTED_RANGE.min,
              ATMOSPHERE_DOCUMENTED_RANGE.max
            );
            observations.push({
              date: isoDate,
              value: wind,
              secondaryValue: t2mRange,
              tertiaryValue: ps,
              normalized: norm,
              annotation:
                wind !== null && wind >= 8.5
                  ? `${yr}-${m}: Elevated Tropospheric Wind Transport (${wind} m/s)`
                  : undefined
            });
          }
        }
      }

      if (observations.length === 0) {
        throw new Error('NASA POWER API returned 0 monthly observations');
      }

      const payload: SeriesResponse =
        experienceId === 'ocean'
          ? {
              experienceId: 'ocean',
              variable: 'MERRA-2 Bias-Corrected Precipitation Rate (PRECTOTCORR)',
              unit: 'mm/day',
              isRatioScale: true,
              documentedRange: OCEAN_DOCUMENTED_RANGE,
              observations,
              provenance: {
                dataStatus: 'LIVE_SOURCE',
                provider: 'NASA Langley Research Center (LaRC) POWER Project / GMAO MERRA-2',
                sourceUrl,
                retrievedAt: new Date().toISOString(),
                processing: [
                  `Fetched monthly PRECTOTCORR, WS10M, and T2M from power.larc.nasa.gov for (${lat}°, ${lon}°)`,
                  'Validated payload with Zod schema and converted -999 fill markers to null (never 0)',
                  'Normalized PRECTOTCORR linearly against documented range [0.0, 14.0 mm/day]'
                ]
              }
            }
          : {
              experienceId: 'atmosphere',
              variable: 'MERRA-2 10-Meter Tropospheric Wind Speed (WS10M)',
              unit: 'm/s',
              isRatioScale: true,
              documentedRange: ATMOSPHERE_DOCUMENTED_RANGE,
              observations,
              provenance: {
                dataStatus: 'LIVE_SOURCE',
                provider: 'NASA Langley Research Center (LaRC) POWER Project / GMAO MERRA-2',
                sourceUrl,
                retrievedAt: new Date().toISOString(),
                processing: [
                  `Fetched monthly WS10M, T2M_RANGE, and PS from power.larc.nasa.gov for (${lat}°, ${lon}°)`,
                  'Validated payload with Zod schema and converted -999 fill markers to null (never 0)',
                  'Normalized WS10M linearly against documented range [2.0, 14.0 m/s]'
                ]
              }
            };

      const validated = SeriesResponseSchema.parse(payload);
      powerCache.set(cacheKey, validated);
      return validated;
    } catch {
      // Upstream failed -> fall back to committed snapshot
    }
  }

  const snapPath =
    experienceId === 'ocean' ? POWER_OCEAN_SNAPSHOT_PATH : POWER_ATMOSPHERE_SNAPSHOT_PATH;
  const rawSnap = await fs.readFile(snapPath, 'utf-8');
  const parsedSnap = SeriesResponseSchema.parse(JSON.parse(rawSnap));

  return SeriesResponseSchema.parse({
    ...parsedSnap,
    provenance: {
      ...parsedSnap.provenance,
      dataStatus: 'CACHED_SOURCE_SNAPSHOT'
    }
  });
}
