import type {
  AcousticMappingSpec,
  DataPoint,
  ExperienceId,
  SonificationTelemetry
} from '../types/earthsonic';
import {
  type SoundMappingSettings,
  mapDataToSound
} from './DataToSoundMapper';

const SCALES: Record<ExperienceId, number[]> = {
  // D Dorian: D3 (50) to E5 (76)
  temperature: [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76],
  // A Minor Pentatonic: A2 (45) to E5 (76)
  ocean: [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74, 76],
  // E Lydian: E3 (52) to E5 (76)
  atmosphere: [52, 54, 56, 58, 59, 61, 63, 64, 66, 68, 70, 71, 73, 75, 76]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function normalizeValue(val: number, min: number, max: number): number {
  if (max === min || !Number.isFinite(val)) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

export function computeAcousticParameters(
  point: DataPoint,
  experienceId: ExperienceId,
  mappings: {
    pitch: AcousticMappingSpec;
    rhythm: AcousticMappingSpec;
    intensity: AcousticMappingSpec;
  },
  settings?: SoundMappingSettings
) {
  const mapped = mapDataToSound(
    point.primaryValue,
    {
      min: mappings.pitch.minData,
      max: mappings.pitch.maxData,
      unit: mappings.pitch.unit,
      variableName: mappings.pitch.variableName
    },
    settings,
    point.secondaryValue,
    { min: mappings.rhythm.minData, max: mappings.rhythm.maxData },
    point.tertiaryValue,
    { min: mappings.intensity.minData, max: mappings.intensity.maxData }
  );

  const scale = SCALES[experienceId];
  const scaleIdx = Math.min(scale.length - 1, Math.floor(mapped.normalizedValue * scale.length));
  const pitchOffset = settings?.pitchRange === 'low' ? -5 : settings?.pitchRange === 'wide' ? 2 : 0;
  const midiNote = scale[scaleIdx] + pitchOffset;
  const pitchHz = Number(midiToFreq(midiNote).toFixed(1));
  const noteName = midiToNoteName(midiNote);

  return {
    normPitch: mapped.normalizedValue,
    normRhythm: normalizeValue(point.secondaryValue, mappings.rhythm.minData, mappings.rhythm.maxData),
    normIntensity: normalizeValue(point.tertiaryValue, mappings.intensity.minData, mappings.intensity.maxData),
    midiNote,
    pitchHz,
    noteName,
    rhythmBpm: mapped.tempoBpm,
    pulseDensityHz: mapped.pulseDensityHz,
    modulationSpeedHz: mapped.modulationSpeedHz,
    intensityDb: mapped.intensityDb,
    filterHz: mapped.filterCutoffHz,
    isNegativeAnomaly: point.primaryValue < 0,
    explanationText: mapped.explanationText
  };
}

export interface OrchestraLayerMix {
  temperatureEnabled: boolean;
  temperatureVolume: number;
  waterEnabled: boolean;
  waterVolume: number;
  atmosphereEnabled: boolean;
  atmosphereVolume: number;
}

class EarthSonificationEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeNodes: Set<AudioScheduledSourceNode> = new Set();

  private isMuted = false;
  private masterVolume = 0.8;
  private lastFreqHz = 0;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.01;
      this.compressor.release.value = 0.2;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : Math.min(0.95, this.masterVolume);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.createPinkNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private createPinkNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buffer;
  }

  private trackSourceNode(node: AudioScheduledSourceNode) {
    this.activeNodes.add(node);
    node.onended = () => {
      this.activeNodes.delete(node);
    };
  }

  public stopAllNodes() {
    for (const node of this.activeNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeNodes.clear();
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : Math.min(0.95, this.masterVolume),
        this.ctx.currentTime,
        0.03
      );
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : Math.min(0.95, this.masterVolume),
        this.ctx.currentTime,
        0.03
      );
    }
  }

  public getFrequencyData(targetArray: Uint8Array<ArrayBuffer>): void {
    if (!this.analyser) {
      targetArray.fill(0);
      return;
    }
    this.analyser.getByteFrequencyData(targetArray);
  }

  public getWaveformData(targetArray: Uint8Array<ArrayBuffer>): void {
    if (!this.analyser) {
      targetArray.fill(128);
      return;
    }
    this.analyser.getByteTimeDomainData(targetArray);
  }

  public getLiveAudioMetrics(): { dominantFreqHz: number; rmsIntensity: number } {
    if (!this.analyser || !this.ctx) {
      return { dominantFreqHz: 0, rmsIntensity: 0 };
    }
    const freqBins = new Uint8Array(this.analyser.frequencyBinCount);
    const waveBins = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqBins);
    this.analyser.getByteTimeDomainData(waveBins);

    let maxBinVal = 0;
    let maxBinIdx = 0;
    for (let i = 1; i < freqBins.length; i++) {
      if (freqBins[i] > maxBinVal) {
        maxBinVal = freqBins[i];
        maxBinIdx = i;
      }
    }

    let sumSq = 0;
    for (let i = 0; i < waveBins.length; i++) {
      const centered = (waveBins[i] - 128) / 128;
      sumSq += centered * centered;
    }
    const rms = Math.sqrt(sumSq / waveBins.length);

    const nyquist = this.ctx.sampleRate / 2;
    const dominantFreqHz =
      maxBinVal > 20 ? Math.round((maxBinIdx / freqBins.length) * nyquist) : 0;

    return {
      dominantFreqHz,
      rmsIntensity: Number(Math.min(1, rms * 3.2).toFixed(2))
    };
  }

  public playDataStep(options: {
    point: DataPoint;
    experienceId: ExperienceId;
    mappings: {
      pitch: AcousticMappingSpec;
      rhythm: AcousticMappingSpec;
      intensity: AcousticMappingSpec;
    };
    durationSec: number;
    pan?: number;
    gainTrim?: number;
    isBaselineVoice?: boolean;
    settings?: SoundMappingSettings;
  }): SonificationTelemetry['primaryPitchHz'] extends number
    ? ReturnType<typeof computeAcousticParameters>
    : never {
    const ctx = this.ensureContext();
    const {
      point,
      experienceId,
      mappings,
      durationSec,
      pan = 0,
      gainTrim = 1.0,
      isBaselineVoice = false,
      settings
    } = options;

    const params = computeAcousticParameters(point, experienceId, mappings, settings);
    if (!this.compressor) return params;

    const now = ctx.currentTime;
    const userIntensityScale = settings?.soundIntensity ?? 0.85;
    const linearAmp =
      Math.pow(10, params.intensityDb / 20) * 0.38 * gainTrim * userIntensityScale;

    const pulseCount =
      settings?.musicalComplexity === 'pure'
        ? 1
        : params.rhythmBpm >= 122
        ? 3
        : params.rhythmBpm >= 92
        ? 2
        : 1;
    const subDuration = durationSec / pulseCount;

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);
    panner.connect(this.compressor);

    const voiceStyle =
      settings?.soundStyle ||
      (experienceId === 'temperature'
        ? 'warm_synth'
        : experienceId === 'ocean'
        ? 'crystalline_fm'
        : 'atmospheric_pad');

    for (let p = 0; p < pulseCount; p++) {
      const startTime = now + p * subDuration;
      const noteLen = subDuration * 0.94;

      // Distinguish negative vs positive anomalies with minor vs major/fifth intervals
      const intervalSemitones =
        p === 0 ? 0 : p === 1 ? (params.isNegativeAnomaly ? 3 : 7) : 12;
      const pulseFreq = midiToFreq(params.midiNote + intervalSemitones);
      const pulseAmp = p === 0 ? linearAmp : linearAmp * 0.58;

      if (voiceStyle === 'warm_synth') {
        this.triggerThermalVoice(
          ctx,
          panner,
          startTime,
          noteLen,
          pulseFreq,
          pulseAmp,
          params.filterHz,
          params.normIntensity,
          isBaselineVoice || params.isNegativeAnomaly
        );
      } else if (voiceStyle === 'crystalline_fm') {
        this.triggerOceanVoice(
          ctx,
          panner,
          startTime,
          noteLen,
          pulseFreq,
          pulseAmp,
          params.filterHz,
          params.normIntensity,
          isBaselineVoice
        );
      } else {
        this.triggerAtmosphereVoice(
          ctx,
          panner,
          startTime,
          noteLen,
          pulseFreq,
          pulseAmp,
          params.filterHz,
          params.normIntensity,
          isBaselineVoice
        );
      }
    }

    this.lastFreqHz = params.pitchHz;
    return params;
  }

  /**
   * Signature Feature (Section 10): "HEAR THE DIFFERENCE"
   * Plays Observation A, smoothly glides frequency & filter to Observation B using
   * exponentialRampToValueAtTime, and notifies UI callbacks at each stage.
   */
  public playHearTheDifferenceTransition(options: {
    pointA: DataPoint;
    pointB: DataPoint;
    experienceId: ExperienceId;
    mappings: {
      pitch: AcousticMappingSpec;
      rhythm: AcousticMappingSpec;
      intensity: AcousticMappingSpec;
    };
    onPhaseChange?: (phase: 'A' | 'TRANSITION' | 'B' | 'DONE') => void;
  }) {
    this.stopAllNodes();
    const ctx = this.ensureContext();
    if (!this.compressor) return;

    const { pointA, pointB, experienceId, mappings, onPhaseChange } = options;
    const paramsA = computeAcousticParameters(pointA, experienceId, mappings);
    const paramsB = computeAcousticParameters(pointB, experienceId, mappings);

    const now = ctx.currentTime;
    const holdA = 1.2;
    const glideTime = 1.1;
    const holdB = 1.3;
    const totalDuration = holdA + glideTime + holdB;

    const oscMain = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    oscMain.type = experienceId === 'temperature' ? 'sawtooth' : 'triangle';
    oscHarmonic.type = 'sine';

    // Smooth frequency schedule: Hold A -> Exponential Glide -> Hold B
    oscMain.frequency.setValueAtTime(paramsA.pitchHz, now);
    oscMain.frequency.setValueAtTime(paramsA.pitchHz, now + holdA);
    oscMain.frequency.exponentialRampToValueAtTime(
      Math.max(40, paramsB.pitchHz),
      now + holdA + glideTime
    );

    oscHarmonic.frequency.setValueAtTime(paramsA.pitchHz * 1.5, now);
    oscHarmonic.frequency.setValueAtTime(paramsA.pitchHz * 1.5, now + holdA);
    oscHarmonic.frequency.exponentialRampToValueAtTime(
      Math.max(60, paramsB.pitchHz * 1.5),
      now + holdA + glideTime
    );

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(paramsA.filterHz, now);
    filter.frequency.setValueAtTime(paramsA.filterHz, now + holdA);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(200, paramsB.filterHz),
      now + holdA + glideTime
    );
    filter.Q.value = 3.2;

    const ampA = Math.pow(10, paramsA.intensityDb / 20) * 0.32;
    const ampB = Math.pow(10, paramsB.intensityDb / 20) * 0.36;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(ampA, now + 0.08);
    env.gain.setValueAtTime(ampA, now + holdA);
    env.gain.linearRampToValueAtTime(ampB, now + holdA + glideTime);
    env.gain.setValueAtTime(ampB, now + totalDuration - 0.15);
    env.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

    oscMain.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    this.trackSourceNode(oscMain);
    this.trackSourceNode(oscHarmonic);

    oscMain.start(now);
    oscHarmonic.start(now);
    oscMain.stop(now + totalDuration + 0.04);
    oscHarmonic.stop(now + totalDuration + 0.04);

    onPhaseChange?.('A');
    setTimeout(() => onPhaseChange?.('TRANSITION'), holdA * 1000);
    setTimeout(() => onPhaseChange?.('B'), (holdA + glideTime) * 1000);
    setTimeout(() => onPhaseChange?.('DONE'), totalDuration * 1000);
  }

  /**
   * Section 12: "THE EARTH ORCHESTRA" multi-layer synthesis
   */
  public playOrchestraStep(options: {
    tempPoint: DataPoint;
    tempMappings: { pitch: AcousticMappingSpec; rhythm: AcousticMappingSpec; intensity: AcousticMappingSpec };
    waterPoint: DataPoint;
    waterMappings: { pitch: AcousticMappingSpec; rhythm: AcousticMappingSpec; intensity: AcousticMappingSpec };
    atmoPoint: DataPoint;
    atmoMappings: { pitch: AcousticMappingSpec; rhythm: AcousticMappingSpec; intensity: AcousticMappingSpec };
    mix: OrchestraLayerMix;
    durationSec: number;
  }) {
    const {
      tempPoint,
      tempMappings,
      waterPoint,
      waterMappings,
      atmoPoint,
      atmoMappings,
      mix,
      durationSec
    } = options;

    if (mix.temperatureEnabled && mix.temperatureVolume > 0) {
      this.playDataStep({
        point: tempPoint,
        experienceId: 'temperature',
        mappings: tempMappings,
        durationSec,
        pan: -0.35,
        gainTrim: mix.temperatureVolume
      });
    }

    if (mix.waterEnabled && mix.waterVolume > 0) {
      this.playDataStep({
        point: waterPoint,
        experienceId: 'ocean',
        mappings: waterMappings,
        durationSec,
        pan: 0.0,
        gainTrim: mix.waterVolume
      });
    }

    if (mix.atmosphereEnabled && mix.atmosphereVolume > 0) {
      this.playDataStep({
        point: atmoPoint,
        experienceId: 'atmosphere',
        mappings: atmoMappings,
        durationSec,
        pan: 0.35,
        gainTrim: mix.atmosphereVolume
      });
    }
  }

  private triggerThermalVoice(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    duration: number,
    freq: number,
    amp: number,
    filterHz: number,
    normIntensity: number,
    isCoolOrBaseline: boolean
  ) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = isCoolOrBaseline ? 'sine' : 'sawtooth';
    osc2.type = 'triangle';

    // Smooth frequency glide from previous note if close in time
    const startFreq = this.lastFreqHz > 50 ? this.lastFreqHz : freq;
    osc1.frequency.setValueAtTime(startFreq, startTime);
    osc1.frequency.exponentialRampToValueAtTime(
      Math.max(40, freq),
      startTime + Math.min(0.09, duration * 0.35)
    );

    osc2.frequency.setValueAtTime(freq * (isCoolOrBaseline ? 0.5 : 1.005), startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz * 0.65, startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(250, filterHz * 1.25),
      startTime + duration * 0.25
    );
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(200, filterHz * 0.55),
      startTime + duration
    );
    filter.Q.value = 2.2 + normIntensity * 3.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(amp, startTime + Math.min(0.04, duration * 0.18));
    env.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, amp * 0.38),
      startTime + duration * 0.82
    );
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    this.trackSourceNode(osc1);
    this.trackSourceNode(osc2);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  private triggerOceanVoice(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    duration: number,
    freq: number,
    amp: number,
    filterHz: number,
    normIntensity: number,
    isBaseline: boolean
  ) {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();

    carrier.type = 'sine';
    modulator.type = 'sine';

    const fmRatio = isBaseline ? 1.5 : 2.0;
    carrier.frequency.setValueAtTime(freq, startTime);
    modulator.frequency.setValueAtTime(freq * fmRatio, startTime);

    const modIndex = freq * (0.4 + normIntensity * 2.0);
    modGain.gain.setValueAtTime(modIndex, startTime);
    modGain.gain.exponentialRampToValueAtTime(1, startTime + duration * 0.75);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, startTime);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz * 1.1, startTime);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(amp * 1.05, startTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    subOsc.connect(subGain);
    subGain.connect(filter);
    filter.connect(env);
    env.connect(dest);

    this.trackSourceNode(carrier);
    this.trackSourceNode(modulator);
    this.trackSourceNode(subOsc);

    carrier.start(startTime);
    modulator.start(startTime);
    subOsc.start(startTime);
    carrier.stop(startTime + duration + 0.02);
    modulator.stop(startTime + duration + 0.02);
    subOsc.stop(startTime + duration + 0.02);
  }

  private triggerAtmosphereVoice(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    duration: number,
    freq: number,
    amp: number,
    filterHz: number,
    normIntensity: number,
    isBaseline: boolean
  ) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * (isBaseline ? 1.498 : 1.5), startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterHz * 0.75, startTime);
    filter.Q.value = 1.4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(amp, startTime + Math.min(0.08, duration * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    this.trackSourceNode(osc1);
    this.trackSourceNode(osc2);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);

    if (this.noiseBuffer && normIntensity > 0.25) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(freq * 2, startTime);
      windFilter.Q.value = 5.5;

      const windEnv = ctx.createGain();
      const windAmp = amp * normIntensity * 0.42;
      windEnv.gain.setValueAtTime(0.0001, startTime);
      windEnv.gain.linearRampToValueAtTime(windAmp, startTime + duration * 0.4);
      windEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noiseSrc.connect(windFilter);
      windFilter.connect(windEnv);
      windEnv.connect(dest);

      this.trackSourceNode(noiseSrc);
      noiseSrc.start(startTime);
      noiseSrc.stop(startTime + duration + 0.02);
    }
  }
}

export const sonificationEngine = new EarthSonificationEngine();
export { EarthSonificationEngine };
