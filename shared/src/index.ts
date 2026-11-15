import { z } from 'zod';

/**
 * 1. Experience Identifiers
 * - temperature: The Warming Planet (NASA GISS GISTEMP v4 Global Temperature Anomaly)
 * - ocean: The Water Rhythm (NASA POWER Precipitation PRECTOTCORR & Marine Dynamics)
 * - atmosphere: The Living Atmosphere (NASA POWER 10m Wind Speed WS10M & Surface Temp/Pressure)
 */
export const ExperienceIdSchema = z.enum(['temperature', 'ocean', 'atmosphere']);
export type ExperienceId = z.infer<typeof ExperienceIdSchema>;

/**
 * 2. Server-Side & Client-Side Data Provenance Status Model
 */
export const ServerDataStatusSchema = z.enum([
  'LIVE_SOURCE',
  'CACHED_SOURCE_SNAPSHOT',
  'LOCAL_DEMONSTRATION'
]);
export type ServerDataStatus = z.infer<typeof ServerDataStatusSchema>;

export const ClientDataStatusSchema = z.enum([
  'LIVE_SOURCE',
  'CACHED_SOURCE_SNAPSHOT',
  'SAVED_ON_DEVICE',
  'LOCAL_DEMONSTRATION'
]);
export type ClientDataStatus = z.infer<typeof ClientDataStatusSchema>;

/**
 * 3. Series Response Schema (/api/v1/experiences/:id/series)
 * Matches Section 4 specification:
 * - Missing values are null, never 0.
 * - Dates come from the source, never fabricated.
 */
export const ObservationPointSchema = z.object({
  date: z.string().min(1),
  value: z.number().nullable(),
  secondaryValue: z.number().nullable().optional(),
  tertiaryValue: z.number().nullable().optional(),
  normalized: z.number().min(0).max(1).nullable().optional(),
  annotation: z.string().optional()
});
export type ObservationPoint = z.infer<typeof ObservationPointSchema>;

export const DocumentedRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  basis: z.string()
});
export type DocumentedRange = z.infer<typeof DocumentedRangeSchema>;

export const ProvenanceSchema = z.object({
  dataStatus: ServerDataStatusSchema,
  provider: z.string(),
  sourceUrl: z.string().url(),
  retrievedAt: z.string(),
  referencePeriod: z.string().optional(),
  processing: z.array(z.string())
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const SeriesResponseSchema = z.object({
  experienceId: ExperienceIdSchema,
  variable: z.string(),
  unit: z.string(),
  isRatioScale: z.boolean().optional(),
  documentedRange: DocumentedRangeSchema,
  observations: z.array(ObservationPointSchema),
  provenance: ProvenanceSchema
});
export type SeriesResponse = z.infer<typeof SeriesResponseSchema>;

/**
 * 4. Visual Frame Schema (/api/v1/experiences/:id/frame)
 */
export const VisualFrameItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  dateLabel: z.string(),
  isoDate: z.string(),
  imageUrl: z.string().url(),
  fallbackImageUrl: z.string().url(),
  gibsLayer: z.string(),
  missionInstrument: z.string(),
  credit: z.string(),
  sourceUrl: z.string().url(),
  caption: z.string(),
  colorScaleLabel: z.string(),
  colorScaleGradient: z.string(),
  colorScaleMin: z.string(),
  colorScaleMax: z.string()
});

export const VisualFrameResponseSchema = z.object({
  experienceId: ExperienceIdSchema,
  frames: z.array(VisualFrameItemSchema)
});
export type VisualFrameResponse = z.infer<typeof VisualFrameResponseSchema>;

/**
 * 5. Mapping Schema (/api/v1/experiences/:id/mapping)
 * Single source of truth for "HOW THE SOUND IS CREATED"
 */
export const ParameterMappingItemSchema = z.object({
  parameter: z.enum(['pitch', 'rhythm', 'intensity']),
  label: z.string(),
  variableName: z.string(),
  variableCode: z.string(),
  unit: z.string(),
  documentedRange: DocumentedRangeSchema,
  audioRange: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.string()
  }),
  curve: z.enum(['linear', 'logarithmic']),
  formula: z.string(),
  explanation: z.string()
});

export const MappingResponseSchema = z.object({
  experienceId: ExperienceIdSchema,
  synthPresetName: z.string(),
  synthDescription: z.string(),
  howSoundIsCreatedPlainLanguage: z.string(),
  mappings: z.object({
    pitch: ParameterMappingItemSchema,
    rhythm: ParameterMappingItemSchema,
    intensity: ParameterMappingItemSchema
  })
});
export type MappingResponse = z.infer<typeof MappingResponseSchema>;

/**
 * 6. Experience Metadata Schema (/api/v1/experiences & /api/v1/experiences/:id)
 */
export const ExperienceMetaSchema = z.object({
  id: ExperienceIdSchema,
  title: z.string(),
  shortTitle: z.string(),
  subtitle: z.string(),
  themeColor: z.string(),
  badgeText: z.string(),
  variable: z.string(),
  unit: z.string(),
  isRatioScale: z.boolean(),
  observationPeriod: z.string(),
  referencePeriod: z.string().optional(),
  provider: z.string(),
  sourceUrl: z.string().url(),
  scientificOverview: z.string()
});
export type ExperienceMeta = z.infer<typeof ExperienceMetaSchema>;

export const ExperiencesListResponseSchema = z.object({
  experiences: z.array(ExperienceMetaSchema)
});

/**
 * 7. Compare Endpoint Schema (POST /api/v1/compare)
 */
export const CompareObservationInputSchema = z.object({
  date: z.string(),
  value: z.number().nullable()
});

export const CompareRequestSchema = z.object({
  experienceId: ExperienceIdSchema,
  observationA: CompareObservationInputSchema,
  observationB: CompareObservationInputSchema
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;

export const CompareResponseSchema = z.object({
  experienceId: ExperienceIdSchema,
  variable: z.string(),
  unit: z.string(),
  documentedRange: DocumentedRangeSchema,
  observationA: z.object({
    date: z.string(),
    value: z.number().nullable(),
    normalized: z.number().nullable(),
    mappedFrequencyHz: z.number().nullable()
  }),
  observationB: z.object({
    date: z.string(),
    value: z.number().nullable(),
    normalized: z.number().nullable(),
    mappedFrequencyHz: z.number().nullable()
  }),
  absoluteDifference: z.number().nullable(),
  percentageDifference: z.number().nullable(),
  percentageDifferenceValid: z.boolean(),
  percentageDifferenceReason: z.string(),
  normalizedDifference: z.number().nullable()
});
export type CompareResponse = z.infer<typeof CompareResponseSchema>;

/**
 * 8. Sources Endpoint Schema (GET /api/v1/sources)
 */
export const SourceDocumentationItemSchema = z.object({
  id: z.string(),
  experienceId: ExperienceIdSchema,
  name: z.string(),
  provider: z.string(),
  sourceUrl: z.string().url(),
  variable: z.string(),
  unit: z.string(),
  observationPeriod: z.string(),
  referencePeriod: z.string().optional(),
  processing: z.array(z.string()),
  creativeMappingSummary: z.string()
});

export const SourcesResponseSchema = z.object({
  sources: z.array(SourceDocumentationItemSchema),
  disclaimer: z.string()
});
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>;

/**
 * 9. Health & Error Schemas
 */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  version: z.string()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * 10. Shared Normalization & Comparison Functions
 * Rules (Section 5):
 * - normalized = clamp((value - min) / (max - min), 0, 1)
 * - Safe handling of null, NaN, Infinity, and min >= max.
 * - Missing values return null, never 0.
 */
export function normalizeObservation(
  value: number | null | undefined,
  min: number,
  max: number,
  useLogarithmic = false
): number | null {
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return null;
  }

  const clamped = Math.max(min, Math.min(max, value));

  if (useLogarithmic) {
    // Logarithmic normalization is only valid when min > 0
    if (min <= 0) {
      return null;
    }
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logVal = Math.log10(clamped);
    const norm = (logVal - logMin) / (logMax - logMin);
    return Number(Math.max(0, Math.min(1, norm)).toFixed(4));
  }

  const norm = (clamped - min) / (max - min);
  return Number(Math.max(0, Math.min(1, norm)).toFixed(4));
}

export function normalizedToFrequencyHz(
  normalized: number | null,
  minFreqHz = 130.81,
  maxFreqHz = 587.33
): number | null {
  if (normalized === null || !Number.isFinite(normalized)) {
    return null;
  }
  const octaves = Math.log2(maxFreqHz / minFreqHz);
  return Number((minFreqHz * Math.pow(2, normalized * octaves)).toFixed(1));
}

/**
 * Computes observation comparison (Section 4 & 10):
 * Percentage difference is ONLY returned when mathematically valid:
 * 1. Unit is a ratio scale (isRatioScale === true; e.g. mm/day precipitation or m/s wind speed have a true zero,
 *    whereas °C temperature anomaly is an interval scale relative to an arbitrary 1951-1980 baseline).
 * 2. Baseline observationA.value is strictly positive (> 0).
 */
export function computeObservationComparison(params: {
  experienceId: ExperienceId;
  variable: string;
  unit: string;
  isRatioScale: boolean;
  documentedRange: DocumentedRange;
  observationA: { date: string; value: number | null };
  observationB: { date: string; value: number | null };
}): CompareResponse {
  const {
    experienceId,
    variable,
    unit,
    isRatioScale,
    documentedRange,
    observationA,
    observationB
  } = params;

  const normA = normalizeObservation(observationA.value, documentedRange.min, documentedRange.max);
  const normB = normalizeObservation(observationB.value, documentedRange.min, documentedRange.max);

  const freqA = normalizedToFrequencyHz(normA);
  const freqB = normalizedToFrequencyHz(normB);

  const bothValid =
    observationA.value !== null &&
    observationB.value !== null &&
    Number.isFinite(observationA.value) &&
    Number.isFinite(observationB.value);

  const absoluteDifference = bothValid
    ? Number(((observationB.value as number) - (observationA.value as number)).toFixed(3))
    : null;

  const normalizedDifference =
    normA !== null && normB !== null
      ? Number((normB - normA).toFixed(4))
      : null;

  let percentageDifference: number | null = null;
  let percentageDifferenceValid = false;
  let percentageDifferenceReason = '';

  if (!bothValid) {
    percentageDifferenceReason = 'One or both observations contain missing (null) measurements.';
  } else if (!isRatioScale) {
    percentageDifferenceReason = `Unit "${unit}" is an interval anomaly scale without an absolute zero; use absolute difference (${absoluteDifference} ${unit}) and normalized range shift instead of percentage change.`;
  } else if ((observationA.value as number) <= 0) {
    percentageDifferenceReason = 'Baseline Observation A is zero or negative; percentage change is undefined.';
  } else {
    percentageDifferenceValid = true;
    percentageDifference = Number(
      ((((observationB.value as number) - (observationA.value as number)) /
        (observationA.value as number)) *
        100).toFixed(2)
    );
    percentageDifferenceReason = 'Valid ratio-scale percentage change from positive baseline.';
  }

  return {
    experienceId,
    variable,
    unit,
    documentedRange,
    observationA: {
      date: observationA.date,
      value: observationA.value,
      normalized: normA,
      mappedFrequencyHz: freqA
    },
    observationB: {
      date: observationB.date,
      value: observationB.value,
      normalized: normB,
      mappedFrequencyHz: freqB
    },
    absoluteDifference,
    percentageDifference,
    percentageDifferenceValid,
    percentageDifferenceReason,
    normalizedDifference
  };
}
