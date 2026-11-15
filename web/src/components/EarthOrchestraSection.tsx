import React, { useEffect, useState } from 'react';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import {
  computeAcousticParameters,
  type OrchestraLayerMix,
  sonificationEngine
} from '../audio/sonificationEngine';
import type { SoundMappingSettings } from '../audio/DataToSoundMapper';
import {
  Flame,
  Layers,
  Pause,
  Play,
  Sliders,
  Volume2,
  Waves,
  Wind
} from 'lucide-react';

interface EarthOrchestraSectionProps {
  soundSettings: SoundMappingSettings;
  onChangeSoundSettings: (next: SoundMappingSettings) => void;
  playbackSpeed: number;
  onChangePlaybackSpeed: (spd: number) => void;
}

export const EarthOrchestraSection: React.FC<EarthOrchestraSectionProps> = ({
  soundSettings,
  onChangeSoundSettings,
  playbackSpeed,
  onChangePlaybackSpeed
}) => {
  const [isOrchestraPlaying, setIsOrchestraPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [mix, setMix] = useState<OrchestraLayerMix>({
    temperatureEnabled: true,
    temperatureVolume: 0.85,
    waterEnabled: true,
    waterVolume: 0.75,
    atmosphereEnabled: true,
    atmosphereVolume: 0.7
  });

  const tempExp = EARTH_EXPERIENCES.temperature;
  const waterExp = EARTH_EXPERIENCES.ocean;
  const atmoExp = EARTH_EXPERIENCES.atmosphere;

  const totalSteps = 24;
  const tempPt = tempExp.referenceSeries[stepIdx] || tempExp.referenceSeries[0];
  const waterPt = waterExp.referenceSeries[stepIdx] || waterExp.referenceSeries[0];
  const atmoPt = atmoExp.referenceSeries[stepIdx] || atmoExp.referenceSeries[0];

  const tempTelemetry = computeAcousticParameters(tempPt, 'temperature', tempExp.mappings, soundSettings);
  const waterTelemetry = computeAcousticParameters(waterPt, 'ocean', waterExp.mappings, soundSettings);
  const atmoTelemetry = computeAcousticParameters(atmoPt, 'atmosphere', atmoExp.mappings, soundSettings);

  useEffect(() => {
    if (!isOrchestraPlaying) return;
    const stepMs = 640 / playbackSpeed;
    const durationSec = (stepMs / 1000) * 0.92;

    sonificationEngine.playOrchestraStep({
      tempPoint: tempPt,
      tempMappings: tempExp.mappings,
      waterPoint: waterPt,
      waterMappings: waterExp.mappings,
      atmoPoint: atmoPt,
      atmoMappings: atmoExp.mappings,
      mix,
      durationSec
    });

    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % totalSteps);
    }, stepMs);

    return () => clearInterval(timer);
  }, [
    isOrchestraPlaying,
    stepIdx,
    playbackSpeed,
    mix,
    tempPt,
    waterPt,
    atmoPt,
    tempExp.mappings,
    waterExp.mappings,
    atmoExp.mappings
  ]);

  const togglePlay = () => {
    if (isOrchestraPlaying) {
      sonificationEngine.stopAllNodes();
      setIsOrchestraPlaying(false);
    } else {
      setIsOrchestraPlaying(true);
    }
  };

  return (
    <section
      aria-label="The Earth Orchestra and Sound Studio"
      className="rounded-3xl bg-[#101C2D] border border-[#1E2E48] shadow-2xl p-6 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono-tabular uppercase tracking-widest text-[#8A7CFF]">
            <Layers className="w-4 h-4" />
            Multi-Stream Symphonic Sonification & Sound Studio
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#F5F8FF] mt-1">
            THE EARTH ORCHESTRA
          </h2>
          <p className="text-sm text-[#9AA9BD] mt-0.5 max-w-2xl">
            Combine three coupled Earth system data streams into a single multi-layered acoustic ensemble: Temperature Anomaly drives the main harmonic voice (left), Ocean & Water Cycle drives rhythmic pulses (center), and Atmospheric Carbon/Wind drives the spectral pad (right).
          </p>
        </div>

        <button
          type="button"
          onClick={togglePlay}
          className="px-6 py-3.5 rounded-2xl bg-[#57D6A0] hover:opacity-95 text-[#050914] font-display font-bold text-sm flex items-center gap-2.5 shadow-[0_0_28px_rgba(87,214,160,0.4)] transition-all cursor-pointer"
        >
          {isOrchestraPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE EARTH ORCHESTRA</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY EARTH ORCHESTRA</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Layer Mixer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Layer 1: Temperature */}
        <div
          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
            mix.temperatureEnabled
              ? 'bg-[#0A1220] border-[#FFC66D]/50 shadow-lg'
              : 'bg-[#050914]/60 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-bold font-display text-[#FFC66D]">
                <Flame className="w-4 h-4" />
                Layer 1: The Warming Planet
              </span>
              <button
                type="button"
                onClick={() =>
                  setMix((m) => ({ ...m, temperatureEnabled: !m.temperatureEnabled }))
                }
                className={`px-3 py-1 rounded-full text-xs font-mono-tabular font-bold cursor-pointer ${
                  mix.temperatureEnabled
                    ? 'bg-[#FFC66D] text-[#050914]'
                    : 'bg-slate-800 text-[#9AA9BD]'
                }`}
              >
                {mix.temperatureEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            <p className="text-xs text-[#9AA9BD]">
              <strong>Scientific Variable:</strong> {tempExp.mappings.pitch.variableName} ({tempExp.mappings.pitch.unit})
            </p>

            <div className="rounded-xl bg-[#101C2D] p-3 font-mono-tabular text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Observation ({tempPt.dateLabel}):</span>
                <span className="text-[#FFC66D] font-bold">
                  {tempPt.primaryValue} {tempExp.mappings.pitch.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Main Harmonic Pitch:</span>
                <span className="text-[#F5F8FF]">
                  {tempTelemetry.noteName} ({tempTelemetry.pitchHz} Hz)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono-tabular text-[#9AA9BD]">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[#FFC66D]" />
                Layer 1 Volume
              </span>
              <span>{Math.round(mix.temperatureVolume * 100)}%</span>
            </div>
            <input
              type="range"
              aria-label="Layer 1 Temperature volume"
              min={0}
              max={1}
              step={0.05}
              value={mix.temperatureVolume}
              onChange={(e) =>
                setMix((m) => ({ ...m, temperatureVolume: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#FFC66D] cursor-pointer"
            />
          </div>
        </div>

        {/* Layer 2: Water Rhythm */}
        <div
          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
            mix.waterEnabled
              ? 'bg-[#0A1220] border-[#52C7F5]/50 shadow-lg'
              : 'bg-[#050914]/60 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-bold font-display text-[#52C7F5]">
                <Waves className="w-4 h-4" />
                Layer 2: The Water Rhythm
              </span>
              <button
                type="button"
                onClick={() => setMix((m) => ({ ...m, waterEnabled: !m.waterEnabled }))}
                className={`px-3 py-1 rounded-full text-xs font-mono-tabular font-bold cursor-pointer ${
                  mix.waterEnabled
                    ? 'bg-[#52C7F5] text-[#050914]'
                    : 'bg-slate-800 text-[#9AA9BD]'
                }`}
              >
                {mix.waterEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            <p className="text-xs text-[#9AA9BD]">
              <strong>Scientific Variable:</strong> {waterExp.mappings.rhythm.variableName} ({waterExp.mappings.rhythm.unit})
            </p>

            <div className="rounded-xl bg-[#101C2D] p-3 font-mono-tabular text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Observation ({waterPt.dateLabel}):</span>
                <span className="text-[#52C7F5] font-bold">
                  +{waterPt.secondaryValue} {waterExp.mappings.rhythm.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Rhythmic Pulse Rate:</span>
                <span className="text-[#F5F8FF]">
                  {waterTelemetry.rhythmBpm} BPM ({waterTelemetry.noteName})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono-tabular text-[#9AA9BD]">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[#52C7F5]" />
                Layer 2 Volume
              </span>
              <span>{Math.round(mix.waterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              aria-label="Layer 2 Water volume"
              min={0}
              max={1}
              step={0.05}
              value={mix.waterVolume}
              onChange={(e) =>
                setMix((m) => ({ ...m, waterVolume: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#52C7F5] cursor-pointer"
            />
          </div>
        </div>

        {/* Layer 3: Living Atmosphere */}
        <div
          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
            mix.atmosphereEnabled
              ? 'bg-[#0A1220] border-[#8A7CFF]/50 shadow-lg'
              : 'bg-[#050914]/60 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-bold font-display text-[#8A7CFF]">
                <Wind className="w-4 h-4" />
                Layer 3: The Living Atmosphere
              </span>
              <button
                type="button"
                onClick={() =>
                  setMix((m) => ({ ...m, atmosphereEnabled: !m.atmosphereEnabled }))
                }
                className={`px-3 py-1 rounded-full text-xs font-mono-tabular font-bold cursor-pointer ${
                  mix.atmosphereEnabled
                    ? 'bg-[#8A7CFF] text-[#050914]'
                    : 'bg-slate-800 text-[#9AA9BD]'
                }`}
              >
                {mix.atmosphereEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            <p className="text-xs text-[#9AA9BD]">
              <strong>Scientific Variable:</strong> {atmoExp.mappings.pitch.variableName} ({atmoExp.mappings.pitch.unit})
            </p>

            <div className="rounded-xl bg-[#101C2D] p-3 font-mono-tabular text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Observation ({atmoPt.dateLabel}):</span>
                <span className="text-[#8A7CFF] font-bold">
                  {atmoPt.primaryValue} {atmoExp.mappings.pitch.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA9BD]">Spectral Filter & Pitch:</span>
                <span className="text-[#F5F8FF]">
                  {atmoTelemetry.filterHz} Hz · {atmoTelemetry.noteName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono-tabular text-[#9AA9BD]">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[#8A7CFF]" />
                Layer 3 Volume
              </span>
              <span>{Math.round(mix.atmosphereVolume * 100)}%</span>
            </div>
            <input
              type="range"
              aria-label="Layer 3 Atmosphere volume"
              min={0}
              max={1}
              step={0.05}
              value={mix.atmosphereVolume}
              onChange={(e) =>
                setMix((m) => ({ ...m, atmosphereVolume: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#8A7CFF] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Sound Studio Customizer Controls (Section 9 Required Sonification Controls) */}
      <div className="rounded-2xl bg-[#0A1220] border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-[#52C7F5]" />
          <h3 className="text-sm font-bold font-display text-[#F5F8FF]">
            Sound Studio Parameters (Applies Across Explorer & Orchestra)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Sound Intensity */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio-intensity" className="text-xs font-mono-tabular text-[#9AA9BD]">
              1. Sound Intensity ({Math.round(soundSettings.soundIntensity * 100)}%)
            </label>
            <input
              id="studio-intensity"
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={soundSettings.soundIntensity}
              onChange={(e) =>
                onChangeSoundSettings({
                  ...soundSettings,
                  soundIntensity: parseFloat(e.target.value)
                })
              }
              className="w-full accent-[#52C7F5] cursor-pointer"
            />
          </div>

          {/* 2. Pitch Range */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio-pitch-range" className="text-xs font-mono-tabular text-[#9AA9BD]">
              2. Pitch Range
            </label>
            <select
              id="studio-pitch-range"
              value={soundSettings.pitchRange}
              onChange={(e) =>
                onChangeSoundSettings({
                  ...soundSettings,
                  pitchRange: e.target.value as SoundMappingSettings['pitchRange']
                })
              }
              className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono-tabular text-[#F5F8FF]"
            >
              <option value="low">Warm Baritone (A2–D4)</option>
              <option value="standard">Standard Scientific (D3–D5)</option>
              <option value="wide">Wide Dynamic (C3–F#5)</option>
            </select>
          </div>

          {/* 3. Playback Speed */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio-speed" className="text-xs font-mono-tabular text-[#9AA9BD]">
              3. Playback Speed
            </label>
            <select
              id="studio-speed"
              value={playbackSpeed}
              onChange={(e) => onChangePlaybackSpeed(parseFloat(e.target.value))}
              className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono-tabular text-[#F5F8FF]"
            >
              <option value={0.5}>0.5× (Detailed Inspection)</option>
              <option value={1}>1.0× (Standard Tempo)</option>
              <option value={1.5}>1.5× (Accelerated Trend)</option>
              <option value={2}>2.0× (Rapid Scan)</option>
            </select>
          </div>

          {/* 4. Musical Complexity */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio-complexity" className="text-xs font-mono-tabular text-[#9AA9BD]">
              4. Musical Complexity
            </label>
            <select
              id="studio-complexity"
              value={soundSettings.musicalComplexity}
              onChange={(e) =>
                onChangeSoundSettings({
                  ...soundSettings,
                  musicalComplexity: e.target.value as SoundMappingSettings['musicalComplexity']
                })
              }
              className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono-tabular text-[#F5F8FF]"
            >
              <option value="pure">Pure Continuous Tone</option>
              <option value="harmonic">Harmonic Scale + Arpeggio</option>
              <option value="rich">Rich Polyphonic Overtones</option>
            </select>
          </div>

          {/* 5. Sound Style */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio-style" className="text-xs font-mono-tabular text-[#9AA9BD]">
              5. Sound Style
            </label>
            <select
              id="studio-style"
              value={soundSettings.soundStyle}
              onChange={(e) =>
                onChangeSoundSettings({
                  ...soundSettings,
                  soundStyle: e.target.value as SoundMappingSettings['soundStyle']
                })
              }
              className="bg-[#050914] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono-tabular text-[#F5F8FF]"
            >
              <option value="warm_synth">Warm Analog Synth</option>
              <option value="crystalline_fm">Crystalline FM Pluck</option>
              <option value="atmospheric_pad">Spectral Choir Pad</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
};
