import { describe, expect, it } from 'vitest';
import {
  computeObservationComparison,
  normalizeObservation
} from '@earthsonic/shared';
import { parseGistempCell, parseGistempCsv } from '../src/services/gistemp.js';
import { cleanPowerValue } from '../src/services/power.js';
import { buildServer } from '../src/app.js';

describe('Shared Normalization & Comparison Logic', () => {
  it('handles null, undefined, NaN, and min >= max safely by returning null', () => {
    expect(normalizeObservation(null, 0, 10)).toBeNull();
    expect(normalizeObservation(undefined, 0, 10)).toBeNull();
    expect(normalizeObservation(Number.NaN, 0, 10)).toBeNull();
    expect(normalizeObservation(5, 10, 10)).toBeNull();
    expect(normalizeObservation(5, 12, 10)).toBeNull();
  });

  it('clamps out-of-range values to [0, 1]', () => {
    expect(normalizeObservation(-5, 0, 10)).toBe(0);
    expect(normalizeObservation(25, 0, 10)).toBe(1);
    expect(normalizeObservation(5, 0, 10)).toBe(0.5);
  });

  it('rejects percentage difference for interval scales (°C anomaly) or zero baseline', () => {
    const tempComp = computeObservationComparison({
      experienceId: 'temperature',
      variable: 'Global Temp Anomaly',
      unit: '°C',
      isRatioScale: false,
      documentedRange: { min: -0.5, max: 1.5, basis: 'GISTEMP range' },
      observationA: { date: '1956-07-15', value: -0.19 },
      observationB: { date: '2024-07-15', value: 1.28 }
    });
    expect(tempComp.absoluteDifference).toBe(1.47);
    expect(tempComp.percentageDifferenceValid).toBe(false);
    expect(tempComp.percentageDifference).toBeNull();

    const zeroBaseComp = computeObservationComparison({
      experienceId: 'ocean',
      variable: 'Precipitation',
      unit: 'mm/day',
      isRatioScale: true,
      documentedRange: { min: 0, max: 14, basis: 'POWER range' },
      observationA: { date: '2022-01-15', value: 0 },
      observationB: { date: '2023-07-15', value: 6.5 }
    });
    expect(zeroBaseComp.percentageDifferenceValid).toBe(false);
    expect(zeroBaseComp.percentageDifference).toBeNull();
  });

  it('computes valid percentage difference for ratio-scale positive baseline (mm/day, m/s)', () => {
    const windComp = computeObservationComparison({
      experienceId: 'atmosphere',
      variable: '10m Wind Speed',
      unit: 'm/s',
      isRatioScale: true,
      documentedRange: { min: 2, max: 14, basis: 'POWER WS10M' },
      observationA: { date: '2022-01-15', value: 5.0 },
      observationB: { date: '2023-01-15', value: 7.5 }
    });
    expect(windComp.percentageDifferenceValid).toBe(true);
    expect(windComp.percentageDifference).toBe(50);
    expect(windComp.absoluteDifference).toBe(2.5);
  });
});

describe('GISTEMP CSV & POWER Missing Marker Parsing', () => {
  it('converts GISTEMP "***" missing markers to null, never 0', () => {
    expect(parseGistempCell('***')).toBeNull();
    expect(parseGistempCell(' *** ')).toBeNull();
    expect(parseGistempCell('')).toBeNull();
    expect(parseGistempCell('.00')).toBe(0);
    expect(parseGistempCell('-.19')).toBe(-0.19);
    expect(parseGistempCell('1.28')).toBe(1.28);
  });

  it('parses GISTEMP CSV rows with missing J-D column as value: null', () => {
    const sampleCsv = [
      'Land-Ocean: Global Means',
      'Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON',
      '1956,-.14,-.22,-.21,-.28,-.30,-.14,-.08,-.26,-.20,-.25,-.15,-.06,-.19,-.18,-.18,-.26,-.16,-.20',
      '2026,1.08,1.23,1.30,1.16,1.13,1.18,1.24,1.42,1.39,1.55,***,***,***,***,1.12,1.20,1.28,***'
    ].join('\n');

    const parsed = parseGistempCsv(sampleCsv, { maxPoints: 10 });
    expect(parsed).toHaveLength(2);
    expect(parsed[0].date).toBe('1956-07-15');
    expect(parsed[0].value).toBe(-0.19);
    expect(parsed[1].date).toBe('2026-07-15');
    expect(parsed[1].value).toBeNull();
    expect(parsed[1].normalized).toBeNull();
  });

  it('converts NASA POWER -999 fill values to null', () => {
    expect(cleanPowerValue(-999)).toBeNull();
    expect(cleanPowerValue(-999.0)).toBeNull();
    expect(cleanPowerValue(4.256)).toBe(4.26);
  });
});

describe('Fastify API v1 Integration Tests', () => {
  it('serves /api/v1/health, /experiences, /series (snapshot), /frame, /mapping, /compare, and /sources', async () => {
    const app = await buildServer({
      forceSnapshotForExperiences: ['temperature', 'ocean', 'atmosphere']
    });

    const health = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe('ok');

    const exps = await app.inject({ method: 'GET', url: '/api/v1/experiences' });
    expect(exps.statusCode).toBe(200);
    expect(exps.json().experiences).toHaveLength(3);

    const tempSeries = await app.inject({
      method: 'GET',
      url: '/api/v1/experiences/temperature/series'
    });
    expect(tempSeries.statusCode).toBe(200);
    const seriesBody = tempSeries.json();
    expect(seriesBody.provenance.dataStatus).toBe('CACHED_SOURCE_SNAPSHOT');
    expect(seriesBody.provenance.referencePeriod).toBe('1951-1980');
    expect(seriesBody.observations.length).toBeGreaterThan(10);

    const mapping = await app.inject({
      method: 'GET',
      url: '/api/v1/experiences/temperature/mapping'
    });
    expect(mapping.statusCode).toBe(200);
    expect(mapping.json().mappings.pitch.unit).toBe('°C vs 1951–1980');

    const frame = await app.inject({
      method: 'GET',
      url: '/api/v1/experiences/ocean/frame'
    });
    expect(frame.statusCode).toBe(200);
    expect(frame.json().frames.length).toBeGreaterThan(0);

    const compare = await app.inject({
      method: 'POST',
      url: '/api/v1/compare',
      payload: {
        experienceId: 'ocean',
        observationA: { date: '2022-01-15', value: 2.0 },
        observationB: { date: '2023-07-15', value: 6.0 }
      }
    });
    expect(compare.statusCode).toBe(200);
    expect(compare.json().percentageDifferenceValid).toBe(true);
    expect(compare.json().percentageDifference).toBe(200);

    const sources = await app.inject({ method: 'GET', url: '/api/v1/sources' });
    expect(sources.statusCode).toBe(200);
    expect(sources.json().sources.length).toBeGreaterThanOrEqual(4);

    const notFound = await app.inject({
      method: 'GET',
      url: '/api/v1/experiences/unknown-planet/series'
    });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.json().error.code).toBe('NOT_FOUND');

    await app.close();
  });
});
