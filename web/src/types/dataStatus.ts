import type { ServerDataStatus } from '@earthsonic/shared';

export type DataStatus =
  | 'LIVE_SOURCE'
  | 'CACHED_SOURCE_SNAPSHOT'
  | 'SAVED_ON_DEVICE'
  | 'LOCAL_DEMONSTRATION';

export type ApiFailureReason =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'INVALID_DATA'
  | 'NOT_FOUND'
  | 'RATE_LIMITED';

export interface ClientProvenance {
  dataStatus: DataStatus;
  originalStatus?: ServerDataStatus;
  provider: string;
  sourceUrl?: string;
  retrievedAt?: string;
  referencePeriod?: string;
  processing: string[];
  plainLanguageSummary: string;
}

export function getDataStatusLabel(status: DataStatus): string {
  switch (status) {
    case 'LIVE_SOURCE':
      return 'LIVE SOURCE DATA';
    case 'CACHED_SOURCE_SNAPSHOT':
      return 'CACHED SOURCE SNAPSHOT';
    case 'SAVED_ON_DEVICE':
      return 'SAVED ON THIS DEVICE';
    case 'LOCAL_DEMONSTRATION':
      return 'LOCAL DEMONSTRATION DATA';
  }
}

export function getPlainLanguageStatusSummary(
  status: DataStatus,
  originalStatus?: ServerDataStatus,
  retrievedAt?: string
): string {
  const dateText = retrievedAt ? new Date(retrievedAt).toISOString().slice(0, 10) : 'an earlier session';
  switch (status) {
    case 'LIVE_SOURCE':
      return `Fetched directly from the upstream NASA data source by the EarthSonic API server (${dateText}).`;
    case 'CACHED_SOURCE_SNAPSHOT':
      return `Served from a verified NASA data snapshot committed on the EarthSonic server (retrieved on ${dateText}).`;
    case 'SAVED_ON_DEVICE':
      return `The EarthSonic backend is currently unreachable; showing a validated ${
        originalStatus === 'LIVE_SOURCE' ? 'live NASA response' : 'NASA server snapshot'
      } previously saved on this device on ${dateText}.`;
    case 'LOCAL_DEMONSTRATION':
      return 'Simulated illustrative series bundled with the app for offline audio demonstration. Not real NASA observations.';
  }
}
