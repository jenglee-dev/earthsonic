export type ExperienceId = 'temperature' | 'ocean' | 'atmosphere';

export type DataProvenanceStatus =
  | 'PUBLISHED_NASA_REFERENCE'
  | 'LIVE_NASA_POWER_API'
  | 'DEMO_FALLBACK';

export interface DataPoint {
  index: number;
  dateLabel: string;      // e.g., "1980", "2023-07", "Jan 2023"
  isoDate: string;        // YYYY-MM-DD for NASA GIBS snapshot synchronization
  primaryValue: number;   // Drives Pitch (Hz)
  secondaryValue: number; // Drives Rhythm / Pulse Rate (BPM / Hz)
  tertiaryValue: number;  // Drives Sound Intensity / Filter Cutoff & Amplitude (dB / %)
  annotation?: string;    // Notable scientific event at this point (e.g., "1991 Mt. Pinatubo Eruption", "2016 Super El Niño")
}

export interface NasaVisualFrame {
  id: string;
  title: string;
  dateLabel: string;
  isoDate: string;
  imageUrl: string;
  fallbackImageUrl: string;
  gibsLayer: string;
  missionInstrument: string;
  credit: string;
  sourceUrl: string;
  caption: string;
  colorScaleLabel: string;
  colorScaleGradient: string;
  colorScaleMin: string;
  colorScaleMax: string;
}

export interface AcousticMappingSpec {
  parameter: 'pitch' | 'rhythm' | 'intensity';
  label: string;
  variableName: string;
  variableCode: string;
  unit: string;
  minData: number;
  maxData: number;
  minAudio: number;
  maxAudio: number;
  audioUnit: string;
  formulaDescription: string;
  musicalExplanation: string;
}

export interface ObservatorySite {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface EarthExperience {
  id: ExperienceId;
  title: string;
  shortTitle: string;
  subtitle: string;
  themeColor: string;         // Hex color
  themeGlowClass: string;
  badgeText: string;
  datasetTitle: string;
  nasaCitation: string;
  nasaSourceUrl: string;
  instrumentSummary: string;
  scientificOverview: string;
  whatYouAreHearing: string[];
  synthPresetName: string;
  synthDescription: string;
  mappings: {
    pitch: AcousticMappingSpec;
    rhythm: AcousticMappingSpec;
    intensity: AcousticMappingSpec;
  };
  visualFrames: NasaVisualFrame[];
  referenceSeries: DataPoint[];
  comparisonBaselineTitle: string;
  comparisonBaselineSeries: DataPoint[];
  observatorySites: ObservatorySite[];
}

export interface SonificationTelemetry {
  isPlaying: boolean;
  isMuted: boolean;
  stepIndex: number;
  primaryPitchHz: number;
  primaryNoteName: string;
  primaryRhythmBpm: number;
  primaryIntensityDb: number;
  primaryFilterHz: number;
  // Comparison channel B telemetry
  compareActive: boolean;
  secondaryPitchHz: number;
  secondaryNoteName: string;
  secondaryRhythmBpm: number;
  secondaryIntensityDb: number;
}
