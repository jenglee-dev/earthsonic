import type { ZodSchema } from 'zod';
import {
  type CompareRequest,
  type CompareResponse,
  CompareResponseSchema,
  type ExperienceId,
  type MappingResponse,
  MappingResponseSchema,
  type SeriesResponse,
  SeriesResponseSchema,
  type SourcesResponse,
  SourcesResponseSchema,
  type VisualFrameResponse,
  VisualFrameResponseSchema
} from '@earthsonic/shared';
import type { ApiFailureReason } from '../types/dataStatus';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ApiFailureReason; message: string };

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  return import.meta.env.DEV ? 'http://127.0.0.1:3001/api/v1' : '';
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Validated fetch wrapper:
 * - 8s timeout via AbortController
 * - 1 retry with short backoff (300ms) for network errors and 5xx
 * - No retry for 4xx
 * - Validates every response with shared Zod schema
 * - Never throws into the UI
 */
export async function requestAndValidate<T>(
  endpointPath: string,
  schema: ZodSchema<T>,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      reason: 'NETWORK',
      message: 'API base URL (VITE_API_BASE_URL) is not configured.'
    };
  }
  const url = `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
  const timeoutMs = options.timeoutMs ?? 8000;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  const maxAttempts = 2; // Initial + 1 retry

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url, {
        method: options.method ?? 'GET',
        headers: options.body
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            ok: false,
            reason: 'NOT_FOUND',
            message: `Resource not found (HTTP 404).`
          };
        }
        if (response.status === 429) {
          return {
            ok: false,
            reason: 'RATE_LIMITED',
            message: 'Rate limit exceeded (HTTP 429). Please wait and try again.'
          };
        }
        if (response.status >= 400 && response.status < 500) {
          return {
            ok: false,
            reason: 'INVALID_DATA',
            message: `Client request rejected (HTTP ${response.status}).`
          };
        }
        // 5xx server error -> retry once
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        return {
          ok: false,
          reason: 'SERVER_ERROR',
          message: `EarthSonic data service returned HTTP ${response.status}.`
        };
      }

      const rawJson = await response.json();
      const parsed = schema.safeParse(rawJson);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'INVALID_DATA',
          message: `Response failed schema validation: ${parsed.error.issues[0]?.message || 'Malformed payload'}`
        };
      }

      return { ok: true, data: parsed.data };
    } catch (err) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'));

      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      if (isAbort) {
        return {
          ok: false,
          reason: 'TIMEOUT',
          message: 'Request to the EarthSonic data service timed out after 8 seconds.'
        };
      }

      return {
        ok: false,
        reason: 'NETWORK',
        message: 'Could not reach the EarthSonic data service.'
      };
    }
  }

  return {
    ok: false,
    reason: 'NETWORK',
    message: 'Could not reach the EarthSonic data service.'
  };
}

export async function fetchExperienceSeries(
  experienceId: ExperienceId,
  params?: { start?: number; end?: number; lat?: number; lon?: number },
  fetchImpl?: typeof fetch
): Promise<ApiResult<SeriesResponse>> {
  const qs = new URLSearchParams();
  if (params?.start !== undefined) qs.set('start', String(params.start));
  if (params?.end !== undefined) qs.set('end', String(params.end));
  if (params?.lat !== undefined) qs.set('lat', String(params.lat));
  if (params?.lon !== undefined) qs.set('lon', String(params.lon));
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';

  return requestAndValidate(
    `/experiences/${experienceId}/series${queryStr}`,
    SeriesResponseSchema,
    { fetchImpl }
  );
}

export async function fetchExperienceFrames(
  experienceId: ExperienceId,
  fetchImpl?: typeof fetch
): Promise<ApiResult<VisualFrameResponse>> {
  return requestAndValidate(
    `/experiences/${experienceId}/frame`,
    VisualFrameResponseSchema,
    { fetchImpl }
  );
}

export async function fetchExperienceMapping(
  experienceId: ExperienceId,
  fetchImpl?: typeof fetch
): Promise<ApiResult<MappingResponse>> {
  return requestAndValidate(
    `/experiences/${experienceId}/mapping`,
    MappingResponseSchema,
    { fetchImpl }
  );
}

export async function postObservationComparison(
  payload: CompareRequest,
  fetchImpl?: typeof fetch
): Promise<ApiResult<CompareResponse>> {
  return requestAndValidate('/compare', CompareResponseSchema, {
    method: 'POST',
    body: payload,
    fetchImpl
  });
}

export async function fetchSourcesDocumentation(
  fetchImpl?: typeof fetch
): Promise<ApiResult<SourcesResponse>> {
  return requestAndValidate('/sources', SourcesResponseSchema, { fetchImpl });
}
