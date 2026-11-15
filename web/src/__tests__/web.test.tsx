import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { HealthResponseSchema, type SeriesResponse } from '@earthsonic/shared';
import { requestAndValidate } from '../services/apiClient';
import {
  buildClientProvenanceFromServer,
  getDeviceStorageKey,
  readValidatedSeriesFromDevice,
  saveValidatedSeriesToDevice,
  useEarthData
} from '../hooks/useEarthData';
import { getPlainLanguageStatusSummary } from '../types/dataStatus';
import { DataStatusBadge } from '../components/data/DataStatusBadge';

const mockSeriesResponse: SeriesResponse = {
  experienceId: 'temperature',
  variable: 'Global Temp Anomaly',
  unit: '°C',
  isRatioScale: false,
  documentedRange: {
    min: -0.5,
    max: 1.5,
    basis: 'GISTEMP range'
  },
  observations: [
    { date: '1980-07-15', value: 0.26, normalized: 0.38 },
    { date: '2024-07-15', value: 1.28, normalized: 0.89 }
  ],
  provenance: {
    dataStatus: 'LIVE_SOURCE',
    provider: 'NASA GISS GISTEMP v4',
    sourceUrl: 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
    retrievedAt: '2026-11-15T05:00:00.000Z',
    referencePeriod: '1951-1980',
    processing: ['Parsed J-D column', 'Converted *** to null']
  }
};

describe('web/src/services/apiClient', () => {
  it('retries once on 5xx server error and succeeds on second attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Server Error', { status: 502 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok', uptime: 12.3, version: '1.0.0' }), {
          status: 200
        })
      );

    const res = await requestAndValidate('/health', HealthResponseSchema, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      timeoutMs: 2000
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('ok');
    }
  });

  it('does NOT retry on 404 client error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Not found', { status: 404 }));

    const res = await requestAndValidate('/unknown', HealthResponseSchema, {
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('NOT_FOUND');
    }
  });

  it('returns INVALID_DATA when payload fails Zod schema validation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'wrong_value', uptime: 'bad' }), { status: 200 })
      );

    const res = await requestAndValidate('/health', HealthResponseSchema, {
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('INVALID_DATA');
    }
  });

  it('returns TIMEOUT when request aborts and retries once', async () => {
    const abortErr = new Error('The operation was aborted.');
    abortErr.name = 'AbortError';
    const fetchMock = vi.fn().mockRejectedValue(abortErr);

    const res = await requestAndValidate('/health', HealthResponseSchema, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      timeoutMs: 50
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('TIMEOUT');
    }
  });
});

describe('Provenance Derivation & Device Cache Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('derives LIVE_SOURCE, CACHED_SOURCE_SNAPSHOT, SAVED_ON_DEVICE, and LOCAL_DEMONSTRATION accurately', () => {
    const live = buildClientProvenanceFromServer(mockSeriesResponse.provenance, false);
    expect(live.dataStatus).toBe('LIVE_SOURCE');

    const snap = buildClientProvenanceFromServer(
      { ...mockSeriesResponse.provenance, dataStatus: 'CACHED_SOURCE_SNAPSHOT' },
      false
    );
    expect(snap.dataStatus).toBe('CACHED_SOURCE_SNAPSHOT');

    const device = buildClientProvenanceFromServer(mockSeriesResponse.provenance, true);
    expect(device.dataStatus).toBe('SAVED_ON_DEVICE');
    expect(device.originalStatus).toBe('LIVE_SOURCE');
    expect(device.retrievedAt).toBe('2026-11-15T05:00:00.000Z');

    const demoSummary = getPlainLanguageStatusSummary('LOCAL_DEMONSTRATION');
    expect(demoSummary).toMatch(/Not real NASA observations/i);
  });

  it('saves valid series to device storage and discards corrupted or expired (>30 days) entries safely', () => {
    saveValidatedSeriesToDevice('temperature', mockSeriesResponse);
    const readBack = readValidatedSeriesFromDevice('temperature');
    expect(readBack).not.toBeNull();
    expect(readBack?.observations).toHaveLength(2);

    // Expired entry (>30 days old)
    const oldEntry = {
      schemaVersion: 1,
      savedAtMs: Date.now() - 31 * 24 * 60 * 60 * 1000,
      payload: mockSeriesResponse
    };
    localStorage.setItem(getDeviceStorageKey('temperature'), JSON.stringify(oldEntry));
    expect(readValidatedSeriesFromDevice('temperature')).toBeNull();
    expect(localStorage.getItem(getDeviceStorageKey('temperature'))).toBeNull();

    // Corrupt the stored JSON entry
    localStorage.setItem(getDeviceStorageKey('temperature'), '{bad json!!!');
    const corruptedRead = readValidatedSeriesFromDevice('temperature');
    expect(corruptedRead).toBeNull();
    expect(localStorage.getItem(getDeviceStorageKey('temperature'))).toBeNull();
  });

  it('useEarthData follows fallback order: API -> Device Storage -> Local Demo without interrupting playing audio', async () => {
    // 1. No API, no device storage -> LOCAL_DEMONSTRATION
    const fetchFail = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchFail);

    const { result, unmount } = renderHook(() => useEarthData('temperature', false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.provenance.dataStatus).toBe('LOCAL_DEMONSTRATION');
    expect(result.current.isDegraded).toBe(true);
    expect(result.current.failureReason).toBe('NETWORK');
    unmount();

    // 2. Valid device storage present, API down -> SAVED_ON_DEVICE
    saveValidatedSeriesToDevice('temperature', mockSeriesResponse);
    const { result: res2, unmount: unmount2 } = renderHook(() => useEarthData('temperature', false));
    await waitFor(() => expect(res2.current.isLoading).toBe(false));
    expect(res2.current.provenance.dataStatus).toBe('SAVED_ON_DEVICE');
    expect(res2.current.provenance.originalStatus).toBe('LIVE_SOURCE');
    expect(res2.current.series).toHaveLength(2);
    unmount2();

    // 3. API succeeds -> LIVE_SOURCE, then retry fails while audio is playing -> keeps loaded observations
    const fetchMixed = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSeriesResponse), { status: 200 }))
      .mockRejectedValue(new TypeError('Network lost'));
    vi.stubGlobal('fetch', fetchMixed);

    const { result: res3, rerender } = renderHook(
      ({ playing }: { playing: boolean }) => useEarthData('temperature', playing),
      { initialProps: { playing: false } }
    );
    await waitFor(() => expect(res3.current.isLoading).toBe(false));
    expect(res3.current.provenance.dataStatus).toBe('LIVE_SOURCE');

    // Start playing and trigger retry when backend goes down
    rerender({ playing: true });
    await res3.current.retry();
    await waitFor(() => expect(res3.current.isLoading).toBe(false));
    expect(res3.current.isDegraded).toBe(true);
    expect(res3.current.provenance.dataStatus).toBe('LIVE_SOURCE'); // Kept active dataset without interrupting audio
    expect(res3.current.series).toHaveLength(2);

    vi.unstubAllGlobals();
  });
});

describe('DataStatusBadge Component & Accessibility', () => {
  it('renders correct status label, role="status", aria-live="polite", and opens/closes popover on click & Escape', () => {
    const prov = buildClientProvenanceFromServer(
      { ...mockSeriesResponse.provenance, dataStatus: 'CACHED_SOURCE_SNAPSHOT' },
      false
    );

    render(<DataStatusBadge provenance={prov} />);

    const statusContainer = screen.getByRole('status');
    expect(statusContainer.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('CACHED SOURCE SNAPSHOT')).toBeDefined();

    // Click to open popover
    const btn = screen.getByRole('button', { name: /CACHED SOURCE SNAPSHOT/i });
    fireEvent.click(btn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/NASA GISS GISTEMP v4/i)).toBeDefined();

    // Press Escape to close popover
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
