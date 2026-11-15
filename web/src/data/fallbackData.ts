import type { ExperienceId } from '@earthsonic/shared';
import type { DataPoint } from '../types/earthsonic';
import type { ClientProvenance } from '../types/dataStatus';

export interface BundledDemoDataset {
  experienceId: ExperienceId;
  variable: string;
  unit: string;
  isRatioScale: boolean;
  documentedRange: { min: number; max: number; basis: string };
  series: DataPoint[];
  provenance: ClientProvenance;
}

/**
 * Bundled demonstration datasets used ONLY when both the EarthSonic backend
 * and device local storage have no saved NASA data for an experience.
 * Explicitly labelled as LOCAL_DEMONSTRATION (simulated/illustrative, never presented as NASA observations).
 */
export const BUNDLED_DEMO_DATASETS: Record<ExperienceId, BundledDemoDataset> = {
  temperature: {
    experienceId: 'temperature',
    variable: 'Simulated Temperature Anomaly Demonstration Series',
    unit: '°C',
    isRatioScale: false,
    documentedRange: {
      min: -0.5,
      max: 1.5,
      basis: 'Illustrative [-0.50°C, +1.50°C] demonstration scale for offline sonification.'
    },
    series: Array.from({ length: 24 }, (_, idx) => {
      const t = idx / 23;
      const val = Number((-0.2 + t * 1.4 + Math.sin(idx * 0.7) * 0.08).toFixed(2));
      return {
        index: idx,
        dateLabel: `Sim Step ${idx + 1}`,
        isoDate: `Sim-${String(idx + 1).padStart(2, '0')}`,
        primaryValue: val,
        secondaryValue: Number((8.5 + t * 5.0).toFixed(1)),
        tertiaryValue: Number((0.25 + t * 1.05).toFixed(2)),
        annotation:
          idx === 0
            ? 'Illustrative Demonstration Start (Simulated — Not NASA Data)'
            : idx === 23
            ? 'Illustrative Demonstration Peak (Simulated — Not NASA Data)'
            : undefined
      };
    }),
    provenance: {
      dataStatus: 'LOCAL_DEMONSTRATION',
      provider: 'EarthSonic Bundled Offline Demonstration Generator (Simulated)',
      processing: [
        'Generated synthetic illustrative curve for offline Web Audio API verification',
        'No external NASA source was contacted for this demonstration series'
      ],
      plainLanguageSummary:
        'Simulated illustrative series bundled with the app for offline audio demonstration. Not real NASA observations.'
    }
  },
  ocean: {
    experienceId: 'ocean',
    variable: 'Simulated Precipitation Rate Demonstration Series',
    unit: 'mm/day',
    isRatioScale: true,
    documentedRange: {
      min: 0.0,
      max: 14.0,
      basis: 'Illustrative [0.0, 14.0 mm/day] demonstration scale for offline sonification.'
    },
    series: Array.from({ length: 24 }, (_, idx) => {
      const wave = (Math.sin((idx / 12) * Math.PI * 2) + 1) * 0.5;
      const val = Number((1.2 + wave * 9.5 + (idx / 23) * 1.8).toFixed(2));
      return {
        index: idx,
        dateLabel: `Sim Step ${idx + 1}`,
        isoDate: `Sim-${String(idx + 1).padStart(2, '0')}`,
        primaryValue: val,
        secondaryValue: Number((4.0 + wave * 6.5).toFixed(1)),
        tertiaryValue: Number((22.0 + wave * 5.5).toFixed(1)),
        annotation:
          idx === 12 ? 'Illustrative Seasonal Pulse (Simulated — Not NASA Data)' : undefined
      };
    }),
    provenance: {
      dataStatus: 'LOCAL_DEMONSTRATION',
      provider: 'EarthSonic Bundled Offline Demonstration Generator (Simulated)',
      processing: [
        'Generated synthetic seasonal wave for offline water-rhythm sonification',
        'No external NASA source was contacted for this demonstration series'
      ],
      plainLanguageSummary:
        'Simulated illustrative series bundled with the app for offline audio demonstration. Not real NASA observations.'
    }
  },
  atmosphere: {
    experienceId: 'atmosphere',
    variable: 'Simulated Wind Speed Demonstration Series',
    unit: 'm/s',
    isRatioScale: true,
    documentedRange: {
      min: 2.0,
      max: 14.0,
      basis: 'Illustrative [2.0, 14.0 m/s] demonstration scale for offline sonification.'
    },
    series: Array.from({ length: 24 }, (_, idx) => {
      const wave = (Math.cos((idx / 12) * Math.PI * 2) + 1) * 0.5;
      const val = Number((3.5 + wave * 7.8 + (idx / 23) * 1.2).toFixed(2));
      return {
        index: idx,
        dateLabel: `Sim Step ${idx + 1}`,
        isoDate: `Sim-${String(idx + 1).padStart(2, '0')}`,
        primaryValue: val,
        secondaryValue: Number((5.0 + wave * 6.0).toFixed(1)),
        tertiaryValue: Number((68.0 + wave * 4.0).toFixed(1)),
        annotation:
          idx === 6 ? 'Illustrative Wind Modulation Step (Simulated — Not NASA Data)' : undefined
      };
    }),
    provenance: {
      dataStatus: 'LOCAL_DEMONSTRATION',
      provider: 'EarthSonic Bundled Offline Demonstration Generator (Simulated)',
      processing: [
        'Generated synthetic atmospheric modulation curve for offline sonification',
        'No external NASA source was contacted for this demonstration series'
      ],
      plainLanguageSummary:
        'Simulated illustrative series bundled with the app for offline audio demonstration. Not real NASA observations.'
    }
  }
};
