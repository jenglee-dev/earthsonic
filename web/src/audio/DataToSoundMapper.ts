export interface NormalizationConfig {
  min: number;
  max: number;
  unit: string;
  variableName: string;
  useLogarithmic?: boolean;
}

export interface SoundMappingSettings {
  pitchRange: 'low' | 'standard' | 'wide';
  soundIntensity: number;      // 0.2 to 1.0 user preference multiplier
  musicalComplexity: 'pure' | 'harmonic' | 'rich';
  soundStyle: 'warm_synth' | 'crystalline_fm' | 'atmospheric_pad';
}

export interface DataToSoundMappingResult {
  isValid: boolean;
  errorReason?: string;
  originalValue: number | null;
  unit: string;
  variableName: string;
  normalizedValue: number;     // Clamped 0.0 to 1.0
  // Audio parameters
  frequencyHz: number;
  noteName: string;
  midiNote: number;
  isNegativeAnomaly: boolean;
  pulseDensityHz: number;      // Pulses per second (1.0 to 5.5 Hz)
  tempoBpm: number;            // Equivalent rhythmic pulse BPM (60 to 168 BPM)
  modulationSpeedHz: number;   // LFO modulation rate (0.4 to 8.0 Hz)
  filterCutoffHz: number;      // BiquadFilter cutoff (280 to 3800 Hz)
  harmonicTension: number;     // 0.0 to 1.0 (detune / upper harmonic overtone mix)
  gainLinear: number;          // Safe linear gain (0.02 to 0.35)
  intensityDb: number;         // -28 dB to -3 dB
  explanationText: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Expressive harmonic scale degrees (D Dorian / Pentatonic blend)
const HARMONIC_SCALE_OFFSETS = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToNoteName(freq: number): string {
  if (!Number.isFinite(freq) || freq <= 0) return 'N/A';
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Validates and normalizes a scientific measurement into a clamped [0, 1] range.
 * Never silently treats missing or NaN values as zero.
 */
export function normalizeMeasurement(
  value: number | null | undefined,
  min: number,
  max: number,
  useLogarithmic = false
): { valid: boolean; normalized: number; errorReason?: string } {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return {
      valid: false,
      normalized: 0,
      errorReason: 'Missing or non-numeric scientific observation value.'
    };
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return {
      valid: false,
      normalized: 0,
      errorReason: `Invalid dataset range [${min}, ${max}].`
    };
  }

  const clampedRaw = Math.max(min, Math.min(max, value));

  if (useLogarithmic && min > 0) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logVal = Math.log10(clampedRaw);
    const norm = (logVal - logMin) / (logMax - logMin);
    return { valid: true, normalized: Math.max(0, Math.min(1, norm)) };
  }

  const linearNorm = (clampedRaw - min) / (max - min);
  return { valid: true, normalized: Math.max(0, Math.min(1, linearNorm)) };
}

/**
 * Core DataToSoundMapper function that converts a documented NASA scientific value
 * into validated, perceptually balanced Web Audio API synthesis parameters.
 */
export function mapDataToSound(
  value: number | null | undefined,
  config: NormalizationConfig,
  settings: SoundMappingSettings = {
    pitchRange: 'standard',
    soundIntensity: 0.8,
    musicalComplexity: 'harmonic',
    soundStyle: 'warm_synth'
  },
  secondaryValue?: number,
  secondaryRange?: { min: number; max: number },
  tertiaryValue?: number,
  tertiaryRange?: { min: number; max: number }
): DataToSoundMappingResult {
  const normResult = normalizeMeasurement(value, config.min, config.max, config.useLogarithmic);

  if (!normResult.valid || value === null || value === undefined) {
    return {
      isValid: false,
      errorReason: normResult.errorReason || 'Invalid measurement',
      originalValue: null,
      unit: config.unit,
      variableName: config.variableName,
      normalizedValue: 0,
      frequencyHz: 220,
      noteName: 'N/A',
      midiNote: 57,
      isNegativeAnomaly: false,
      pulseDensityHz: 1,
      tempoBpm: 60,
      modulationSpeedHz: 0.5,
      filterCutoffHz: 400,
      harmonicTension: 0,
      gainLinear: 0,
      intensityDb: -60,
      explanationText: normResult.errorReason || 'Missing data observation — audio output muted for this step.'
    };
  }

  const norm = normResult.normalized;

  // Normalize optional secondary (pulse/rhythm) and tertiary (modulation/filter) drivers
  const normSec =
    secondaryValue !== undefined && secondaryRange
      ? normalizeMeasurement(secondaryValue, secondaryRange.min, secondaryRange.max).normalized
      : norm;

  const normTer =
    tertiaryValue !== undefined && tertiaryRange
      ? normalizeMeasurement(tertiaryValue, tertiaryRange.min, tertiaryRange.max).normalized
      : norm;

  // Pitch range selection
  const baseMidi =
    settings.pitchRange === 'low' ? 46 : settings.pitchRange === 'wide' ? 48 : 50; // D3 (50) standard
  const spanSemitones =
    settings.pitchRange === 'low' ? 18 : settings.pitchRange === 'wide' ? 30 : 24;

  // Smooth continuous frequency + harmonic quantization
  let midiFloat = baseMidi + norm * spanSemitones;
  if (settings.musicalComplexity !== 'pure') {
    const scaleIdx = Math.min(
      HARMONIC_SCALE_OFFSETS.length - 1,
      Math.floor(norm * HARMONIC_SCALE_OFFSETS.length)
    );
    const baseOctaveMidi = settings.pitchRange === 'low' ? 45 : 50;
    midiFloat = baseOctaveMidi + HARMONIC_SCALE_OFFSETS[scaleIdx];
  }

  const frequencyHz = Number(midiToFrequency(midiFloat).toFixed(1));
  const noteName = frequencyToNoteName(frequencyHz);
  const isNegativeAnomaly = value < 0 && config.min < 0;

  // Pulse density (1.0 to 4.8 pulses/sec) & BPM (64 to 156 BPM)
  const pulseDensityHz = Number((1.0 + normSec * 3.8).toFixed(2));
  const tempoBpm = Math.round(64 + normSec * 92);

  // Modulation speed (0.5 Hz calm to 7.5 Hz rapid atmospheric/wind modulation)
  const modulationSpeedHz = Number((0.5 + normTer * 7.0).toFixed(2));

  // Filter cutoff (320 Hz warm low-pass up to 3600 Hz bright open spectrum)
  const filterCutoffHz = Math.round(320 + Math.pow(normTer, 1.25) * 3280);

  // Harmonic tension increases for positive extremes
  const harmonicTension = Number(Math.max(0, Math.min(1, norm * 0.85 + normTer * 0.15)).toFixed(2));

  // Safe acoustic output intensity
  const safeUserScale = Math.max(0.1, Math.min(1.0, settings.soundIntensity));
  const intensityDb = Number((-20 + normTer * 16).toFixed(1));
  const gainLinear = Number(
    Math.min(0.32, (0.06 + normTer * 0.22) * safeUserScale).toFixed(3)
  );

  const explanationText = `Measured ${config.variableName} of ${value} ${config.unit} normalizes to ${(norm * 100).toFixed(0)}% of the [${config.min}, ${config.max} ${config.unit}] range, generating a ${noteName} (${frequencyHz} Hz) tone at ${tempoBpm} BPM (${pulseDensityHz} pulses/s) with a ${filterCutoffHz} Hz filter cutoff.`;

  return {
    isValid: true,
    originalValue: value,
    unit: config.unit,
    variableName: config.variableName,
    normalizedValue: Number(norm.toFixed(3)),
    frequencyHz,
    noteName,
    midiNote: Math.round(midiFloat),
    isNegativeAnomaly,
    pulseDensityHz,
    tempoBpm,
    modulationSpeedHz,
    filterCutoffHz,
    harmonicTension,
    gainLinear,
    intensityDb,
    explanationText
  };
}
