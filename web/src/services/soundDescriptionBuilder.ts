import { computeAcousticParameters } from '../audio/sonificationEngine';
import type { SoundMappingSettings } from '../audio/DataToSoundMapper';
import type { DataPoint, EarthExperience } from '../types/earthsonic';

export type AnnouncementVerbosity = 'minimal' | 'standard' | 'detailed';
export type DirectionOfChange = 'rising' | 'falling' | 'steady' | 'initial';

export interface SoundDescriptionInput {
  experience: EarthExperience;
  point: DataPoint | undefined;
  prevPoint?: DataPoint;
  stepIndex: number;
  totalSteps: number;
  soundSettings?: SoundMappingSettings;
}

export interface SoundDescriptionResult {
  minimal: string;
  standard: string;
  detailed: string;
  forLevel: (level: AnnouncementVerbosity) => string;
  direction: DirectionOfChange;
  telemetry: {
    pitchHz: number;
    noteName: string;
    rhythmBpm: number;
    pulseDensityHz: number;
    modulationSpeedHz: number;
    filterHz: number;
    normPitch: number;
    normRhythm: number;
    normIntensity: number;
  };
}

export function formatSpokenNumber(value: number, signedPlus = false): string {
  if (!Number.isFinite(value)) return 'unavailable';
  const rounded = Number(value.toFixed(2));
  if (Object.is(rounded, -0) || rounded === 0) return '0';
  if (rounded < 0) return `minus ${Math.abs(rounded)}`;
  if (signedPlus && rounded > 0) return `plus ${rounded}`;
  return String(rounded);
}

export function formatSpokenUnit(unit: string): string {
  if (!unit) return '';
  if (unit.includes('°C')) {
    return unit.startsWith('°C') ? 'degrees C' : unit.replace('°C', 'degrees C');
  }
  if (unit.includes('mm/day')) return 'millimeters per day';
  if (unit.startsWith('mm')) return 'millimeters';
  if (unit === 'ppm') return 'parts per million CO2';
  if (unit === 'm/s') return 'meters per second';
  return unit;
}

function bandPitch(norm: number): 'very low' | 'low' | 'mid' | 'high' {
  if (norm < 0.25) return 'very low';
  if (norm < 0.5) return 'low';
  if (norm < 0.75) return 'mid';
  return 'high';
}

function bandPulse(bpm: number): 'very slow' | 'slow' | 'moderate' | 'brisk' {
  if (bpm < 80) return 'very slow';
  if (bpm < 100) return 'slow';
  if (bpm < 120) return 'moderate';
  return 'brisk';
}

function bandFilter(norm: number): 'very dark' | 'muted' | 'balanced' | 'bright' {
  if (norm < 0.25) return 'very dark';
  if (norm < 0.5) return 'muted';
  if (norm < 0.75) return 'balanced';
  return 'bright';
}

function bandModulation(hz: number): 'slow' | 'moderate' | 'fast' {
  if (hz < 1.2) return 'slow';
  if (hz < 2.6) return 'moderate';
  return 'fast';
}

function capitalize(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

export function computeDirection(
  currentValue: number,
  prevValue: number | undefined,
  epsilon = 0.005
): DirectionOfChange {
  if (prevValue === undefined || !Number.isFinite(prevValue) || !Number.isFinite(currentValue)) {
    return 'initial';
  }
  const delta = currentValue - prevValue;
  if (delta > epsilon) return 'rising';
  if (delta < -epsilon) return 'falling';
  return 'steady';
}

function buildBaselineContext(
  experience: EarthExperience,
  point: DataPoint,
  normPitch: number
): string {
  const unit = experience.mappings.pitch.unit;
  const val = point.primaryValue;
  if (unit.includes('1951')) {
    const relation = val < 0 ? 'below' : val > 0 ? 'above' : 'at';
    return `Anomaly is ${relation} the 1951 to 1980 baseline.`;
  }
  if (unit.includes('1982')) {
    const relation = val < 0 ? 'below' : val > 0 ? 'above' : 'at';
    return `Sea surface temperature is ${relation} the 1982 to 2010 baseline.`;
  }
  if (experience.id === 'atmosphere' && unit === 'ppm') {
    const pos =
      normPitch >= 0.75
        ? 'in the upper part of the'
        : normPitch <= 0.25
        ? 'in the lower part of the'
        : 'within the';
    return `CO2 concentration is ${pos} ${experience.mappings.pitch.minData} to ${experience.mappings.pitch.maxData} parts per million range.`;
  }
  return `Observation lies within the ${experience.mappings.pitch.minData} to ${experience.mappings.pitch.maxData} ${formatSpokenUnit(unit)} range.`;
}

function buildChangeSentence(
  experienceId: EarthExperience['id'],
  direction: DirectionOfChange,
  deltaMagnitude: number,
  span: number
): string {
  if (direction === 'initial') return 'First observation in the series.';
  const slight = span > 0 && deltaMagnitude / span < 0.08;
  const degree = slight ? ' slightly' : '';

  if (experienceId === 'ocean') {
    if (direction === 'rising') return `Pulse and pitch rose${degree} from the previous step.`;
    if (direction === 'falling') return `Pulse and pitch fell${degree} from the previous step.`;
    return 'Pulse and pitch held steady from the previous step.';
  }
  if (experienceId === 'atmosphere') {
    if (direction === 'rising') return `Filter brightness and pitch rose${degree} from the previous step.`;
    if (direction === 'falling') return `Filter brightness and pitch fell${degree} from the previous step.`;
    return 'Filter brightness and pitch held steady from the previous step.';
  }
  if (direction === 'rising') return `Pitch rose${degree} from the previous observation.`;
  if (direction === 'falling') return `Pitch fell${degree} from the previous observation.`;
  return 'Pitch held steady from the previous observation.';
}

export function buildSoundDescription(input: SoundDescriptionInput): SoundDescriptionResult {
  const { experience, point, prevPoint, stepIndex, totalSteps, soundSettings } = input;
  const safeTotal = Math.max(1, totalSteps);
  const safeStep = Math.max(0, Math.min(safeTotal - 1, stepIndex));

  if (!point || !Number.isFinite(point.primaryValue)) {
    const fallback = `${experience.shortTitle}. Observation unavailable. Step ${safeStep + 1} of ${safeTotal}.`;
    return {
      minimal: fallback,
      standard: fallback,
      detailed: fallback,
      forLevel: () => fallback,
      direction: 'initial',
      telemetry: {
        pitchHz: 0,
        noteName: 'N/A',
        rhythmBpm: 0,
        pulseDensityHz: 0,
        modulationSpeedHz: 0,
        filterHz: 0,
        normPitch: 0,
        normRhythm: 0,
        normIntensity: 0
      }
    };
  }

  const params = computeAcousticParameters(point, experience.id, experience.mappings, soundSettings);
  const spokenUnit = formatSpokenUnit(experience.mappings.pitch.unit);
  const isSignedScale = experience.mappings.pitch.minData < 0;
  const spokenVal = formatSpokenNumber(point.primaryValue, isSignedScale && point.primaryValue > 0);
  const minimal = `${point.dateLabel}, ${spokenVal} ${spokenUnit}.`;

  const comparisonVal =
    experience.id === 'ocean' ? point.secondaryValue : point.primaryValue;
  const prevComparisonVal =
    prevPoint && Number.isFinite(prevPoint.primaryValue)
      ? experience.id === 'ocean'
        ? prevPoint.secondaryValue
        : prevPoint.primaryValue
      : undefined;
  const direction = computeDirection(comparisonVal, prevComparisonVal);
  const deltaMag =
    prevComparisonVal !== undefined ? Math.abs(comparisonVal - prevComparisonVal) : 0;
  const span =
    experience.id === 'ocean'
      ? Math.abs(experience.mappings.rhythm.maxData - experience.mappings.rhythm.minData)
      : Math.abs(experience.mappings.pitch.maxData - experience.mappings.pitch.minData);

  const pitchBand = bandPitch(params.normPitch);
  const pulseBand = bandPulse(params.rhythmBpm);
  const filterBand = bandFilter(params.normIntensity);
  const modBand = bandModulation(params.modulationSpeedHz);
  const roundedHz = Math.round(params.pitchHz);
  const roundedFilterHz = Math.round(params.filterHz);

  let soundPhrase = '';
  if (experience.id === 'temperature') {
    const dirClause = direction !== 'initial' ? `, pitch ${direction}` : '';
    soundPhrase = `${capitalize(pitchBand)} tone, ${params.noteName}, ${roundedHz} hertz, ${pulseBand} pulse${dirClause}.`;
  } else if (experience.id === 'ocean') {
    const dirClause = direction !== 'initial' ? `, pulse ${direction}` : '';
    soundPhrase = `${capitalize(pulseBand)} pulse, ${params.rhythmBpm} beats per minute, ${pitchBand} tone ${params.noteName}, ${roundedHz} hertz${dirClause}.`;
  } else {
    const dirClause = direction !== 'initial' ? `, pitch ${direction}` : '';
    soundPhrase = `${capitalize(filterBand)} filter, ${roundedFilterHz} hertz cutoff, ${modBand} modulation (${params.modulationSpeedHz.toFixed(1)} hertz), ${pitchBand} tone ${params.noteName}${dirClause}.`;
  }

  const standard = `${minimal} ${soundPhrase}`;
  const changeSentence = buildChangeSentence(experience.id, direction, deltaMag, span);
  const contextSentence = buildBaselineContext(experience, point, params.normPitch);
  const stepSentence = `Step ${safeStep + 1} of ${safeTotal}.`;
  const detailed = `${standard} ${changeSentence} ${contextSentence} ${stepSentence}`;

  return {
    minimal,
    standard,
    detailed,
    forLevel: (level: AnnouncementVerbosity) =>
      level === 'minimal' ? minimal : level === 'detailed' ? detailed : standard,
    direction,
    telemetry: {
      pitchHz: params.pitchHz,
      noteName: params.noteName,
      rhythmBpm: params.rhythmBpm,
      pulseDensityHz: params.pulseDensityHz,
      modulationSpeedHz: params.modulationSpeedHz,
      filterHz: params.filterHz,
      normPitch: params.normPitch,
      normRhythm: params.normRhythm,
      normIntensity: params.normIntensity
    }
  };
}

export function buildHearTheChangeAnnouncement(
  experience: EarthExperience,
  pointA: DataPoint | undefined,
  pointB: DataPoint | undefined,
  soundSettings?: SoundMappingSettings
): string {
  if (!pointA || !pointB || !Number.isFinite(pointA.primaryValue) || !Number.isFinite(pointB.primaryValue)) {
    return `${experience.shortTitle}. Select two valid observations to compare.`;
  }

  const paramsA = computeAcousticParameters(pointA, experience.id, experience.mappings, soundSettings);
  const paramsB = computeAcousticParameters(pointB, experience.id, experience.mappings, soundSettings);
  const unit = formatSpokenUnit(experience.mappings.pitch.unit);
  const isSignedScale = experience.mappings.pitch.minData < 0;

  const valA = formatSpokenNumber(pointA.primaryValue, isSignedScale && pointA.primaryValue > 0);
  const valB = formatSpokenNumber(pointB.primaryValue, isSignedScale && pointB.primaryValue > 0);
  const bandA = bandPitch(paramsA.normPitch);
  const bandB = bandPitch(paramsB.normPitch);

  const octaves =
    paramsA.pitchHz > 0 && paramsB.pitchHz > 0 ? Math.log2(paramsB.pitchHz / paramsA.pitchHz) : 0;
  const absOct = Math.abs(octaves);
  const pitchCompare =
    absOct < 0.05
      ? 'The pitch remains nearly unchanged.'
      : `The pitch ${octaves > 0 ? 'rises' : 'falls'} by about ${absOct.toFixed(1)} octaves.`;

  return `Observation A: ${pointA.dateLabel}, ${valA} ${unit}, ${bandA} tone (${paramsA.noteName}, ${Math.round(paramsA.pitchHz)} hertz). Observation B: ${pointB.dateLabel}, ${valB} ${unit}, ${bandB} tone (${paramsB.noteName}, ${Math.round(paramsB.pitchHz)} hertz). ${pitchCompare}`;
}

export function buildOrchestraAnnouncement(
  locationLabel: string,
  tempPoint: DataPoint | undefined,
  tempExp: EarthExperience,
  waterPoint: DataPoint | undefined,
  waterExp: EarthExperience,
  atmoPoint: DataPoint | undefined,
  atmoExp: EarthExperience,
  mix: { temperatureEnabled: boolean; waterEnabled: boolean; atmosphereEnabled: boolean },
  soundSettings?: SoundMappingSettings
): string {
  const parts: string[] = [];
  if (mix.temperatureEnabled && tempPoint && Number.isFinite(tempPoint.primaryValue)) {
    const p = computeAcousticParameters(tempPoint, tempExp.id, tempExp.mappings, soundSettings);
    parts.push(
      `Temperature ${formatSpokenNumber(tempPoint.primaryValue, true)} ${formatSpokenUnit(tempExp.mappings.pitch.unit)} (${p.noteName}, ${Math.round(p.pitchHz)} hertz)`
    );
  }
  if (mix.waterEnabled && waterPoint && Number.isFinite(waterPoint.primaryValue)) {
    const p = computeAcousticParameters(waterPoint, waterExp.id, waterExp.mappings, soundSettings);
    parts.push(
      `Water ${formatSpokenNumber(waterPoint.primaryValue)} ${formatSpokenUnit(waterExp.mappings.pitch.unit)} (${p.rhythmBpm} beats per minute)`
    );
  }
  if (mix.atmosphereEnabled && atmoPoint && Number.isFinite(atmoPoint.primaryValue)) {
    const p = computeAcousticParameters(atmoPoint, atmoExp.id, atmoExp.mappings, soundSettings);
    parts.push(
      `Atmosphere ${formatSpokenNumber(atmoPoint.primaryValue)} ${formatSpokenUnit(atmoExp.mappings.pitch.unit)} (${Math.round(p.filterHz)} hertz filter)`
    );
  }
  if (parts.length === 0) {
    return `Earth Orchestra at ${locationLabel}. No layers active.`;
  }
  return `Earth Orchestra at ${locationLabel}. Active layers: ${parts.join('; ')}.`;
}
