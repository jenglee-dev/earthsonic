import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { EARTH_EXPERIENCES } from '../data/earthDatasets';
import { useEarthData } from '../hooks/useEarthData';
import { useEarthSonicStore } from '../store/useEarthSonicStore';
import { sonificationEngine } from '../audio/sonificationEngine';
import { isEffectiveReducedMotionActive, useAccessibilityStore } from '../store/useAccessibilityStore';
import { useEffectiveReducedMotion } from '../hooks/useAccessibilityRuntime';
import { liveAnnouncer } from '../services/a11yAnnouncer';
import { speechService } from '../services/speechService';
import { buildOrchestraAnnouncement } from '../services/soundDescriptionBuilder';
import { DataStatusBadge } from '../components/data/DataStatusBadge';
import { Chip, SectionHeader, Slider } from '../components/ui/Primitives';
import { Flame, Layers, MapPin, MessageSquareText, Pause, Play, Square, Waves, Wind } from 'lucide-react';

const InteractiveGlobe = lazy(() =>
  import('../components/earth/InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe }))
);

export const OrchestraPage: React.FC = () => {
  const selectedLat = useEarthSonicStore((s) => s.selectedLat);
  const selectedLon = useEarthSonicStore((s) => s.selectedLon);
  const selectedLocationName = useEarthSonicStore((s) => s.selectedLocationName);
  const setLocation = useEarthSonicStore((s) => s.setLocation);

  const reducedMotion = useEffectiveReducedMotion();
  const [showGlobePicker, setShowGlobePicker] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [masterVol, setMasterVol] = useState(0.6);

  const [layers, setLayers] = useState({
    temp: { enabled: true, volume: 0.8, solo: false },
    precip: { enabled: true, volume: 0.75, solo: false },
    wind: { enabled: true, volume: 0.7, solo: false }
  });

  // Fetch NASA POWER Ocean (T2M + WS10M + PRECTOTCORR) for the SAME shared lat/lon (memoized to prevent refetch loops)
  const sharedSiteQuery = useMemo(
    () => ({ lat: selectedLat, lon: selectedLon }),
    [selectedLat, selectedLon]
  );
  const powerOcean = useEarthData('ocean', playing, sharedSiteQuery);
  const powerAtmos = useEarthData('atmosphere', playing, sharedSiteQuery);

  const series = powerOcean.series;
  const totalSteps = series.length;
  const safeIdx = Math.min(Math.max(0, stepIdx), Math.max(0, totalSteps - 1));
  const currentOceanPt = series[safeIdx] || series[0];
  const currentAtmosPt = powerAtmos.series[safeIdx] || powerAtmos.series[0];

  const announcementsEnabled = useAccessibilityStore((s) => s.prefs.announcementsEnabled);
  const announceOnlyWhenPausedOrRequested = useAccessibilityStore(
    (s) => s.prefs.announceOnlyWhenPausedOrRequested
  );
  const speechEnabled = useAccessibilityStore((s) => s.prefs.speechEnabled);

  const orchestraSummary = useMemo(
    () =>
      buildOrchestraAnnouncement(
        selectedLocationName,
        currentOceanPt,
        EARTH_EXPERIENCES.temperature,
        currentAtmosPt,
        EARTH_EXPERIENCES.ocean,
        currentAtmosPt,
        EARTH_EXPERIENCES.atmosphere,
        {
          temperatureEnabled: layers.temp.solo || (!layers.precip.solo && !layers.wind.solo && layers.temp.enabled),
          waterEnabled: layers.precip.solo || (!layers.temp.solo && !layers.wind.solo && layers.precip.enabled),
          atmosphereEnabled: layers.wind.solo || (!layers.temp.solo && !layers.precip.solo && layers.wind.enabled)
        }
      ),
    [selectedLocationName, currentOceanPt, currentAtmosPt, layers]
  );

  useEffect(() => {
    if (!playing || !announcementsEnabled || announceOnlyWhenPausedOrRequested) return;
    liveAnnouncer.announcePlayback({ message: orchestraSummary, minIntervalMs: 2500 });
  }, [playing, safeIdx, orchestraSummary, announcementsEnabled, announceOnlyWhenPausedOrRequested]);

  const braidCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    sonificationEngine.setVolume(masterVol);
  }, [masterVol]);

  // Synchronized multi-layer playback timer
  useEffect(() => {
    if (!playing) return;
    const anySolo = layers.temp.solo || layers.precip.solo || layers.wind.solo;

    const triggerStep = (idx: number) => {
      const oPt = series[idx] || series[0];
      const aPt = powerAtmos.series[idx] || powerAtmos.series[0];
      if (!oPt || !aPt) return;

      const tempActive = anySolo ? layers.temp.solo : layers.temp.enabled;
      const precipActive = anySolo ? layers.precip.solo : layers.precip.enabled;
      const windActive = anySolo ? layers.wind.solo : layers.wind.enabled;

      if (tempActive) {
        sonificationEngine.playDataStep({
          point: { ...oPt, primaryValue: oPt.primaryValue },
          experienceId: 'temperature',
          mappings: EARTH_EXPERIENCES.temperature.mappings,
          durationSec: 0.52,
          pan: -0.35,
          gainTrim: layers.temp.volume * 0.45
        });
      }
      if (precipActive) {
        sonificationEngine.playDataStep({
          point: aPt,
          experienceId: 'ocean',
          mappings: EARTH_EXPERIENCES.ocean.mappings,
          durationSec: 0.52,
          pan: 0,
          gainTrim: layers.precip.volume * 0.45
        });
      }
      if (windActive) {
        sonificationEngine.playDataStep({
          point: aPt,
          experienceId: 'atmosphere',
          mappings: EARTH_EXPERIENCES.atmosphere.mappings,
          durationSec: 0.52,
          pan: 0.35,
          gainTrim: layers.wind.volume * 0.45
        });
      }
    };

    triggerStep(safeIdx);
    const timer = setInterval(() => {
      setStepIdx((prev) => {
        const next = (prev + 1) % Math.max(1, totalSteps);
        triggerStep(next);
        return next;
      });
    }, 620);

    return () => clearInterval(timer);
  }, [playing, layers, series, powerAtmos.series, totalSteps, safeIdx]);

  // Stop orchestra audio on unmount
  useEffect(() => {
    return () => {
      sonificationEngine.stopAllNodes();
    };
  }, []);

  // Slide-10 Braided Multi-Layer Symphony + Master AnalyserNode Visualizer
  useEffect(() => {
    const canvas = braidCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const freqData = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    let raf = 0;

    const draw = (now: number) => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 290;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (playing && !reduced) {
        sonificationEngine.getFrequencyData(freqData);
      } else {
        freqData.fill(0);
      }

      const t = reduced ? 0 : now * 0.0022;
      const anySolo = layers.temp.solo || layers.precip.solo || layers.wind.solo;
      const activeTemp = anySolo ? layers.temp.solo : layers.temp.enabled;
      const activePrecip = anySolo ? layers.precip.solo : layers.precip.enabled;
      const activeWind = anySolo ? layers.wind.solo : layers.wind.enabled;

      const strands = [
        { active: activeTemp, startY: h * 0.2, color: '#FFC66D', phase: 0, gain: layers.temp.volume },
        { active: activePrecip, startY: h * 0.5, color: '#52C7F5', phase: 2.1, gain: layers.precip.volume },
        { active: activeWind, startY: h * 0.8, color: '#8A7CFF', phase: 4.2, gain: layers.wind.volume }
      ];

      // Draw multi-filament braiding strands entering from left track strips into unified burst on right
      const mergeEndX = w * 0.64;
      for (const st of strands) {
        const ribbonCount = st.active ? 4 : 1;
        for (let r = 0; r < ribbonCount; r++) {
          ctx.strokeStyle = st.active ? st.color : 'rgba(148, 163, 184, 0.2)';
          ctx.globalAlpha = st.active ? 0.8 - r * 0.16 : 0.3;
          ctx.lineWidth = st.active ? 2.1 - r * 0.3 : 1;
          ctx.beginPath();
          for (let x = 0; x <= mergeEndX; x += 4) {
            const u = x / mergeEndX;
            const converge = st.startY + (h * 0.5 - st.startY) * Math.pow(u, 1.35);
            const braid =
              Math.sin(u * Math.PI * 3.5 + t + st.phase + r * 0.25) *
              (h * 0.18 * Math.sin(u * Math.PI)) *
              (0.5 + st.gain * 0.6);
            const y = converge + braid;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Master Combined Output Harmonic Envelope on right third (x >= w * 0.58)
      const masterStart = w * 0.58;
      const masterGrad = ctx.createLinearGradient(masterStart, 0, w, 0);
      masterGrad.addColorStop(0, '#52C7F5');
      masterGrad.addColorStop(0.5, '#FFC66D');
      masterGrad.addColorStop(1, '#8A7CFF');
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = masterGrad;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = masterStart; x <= w - 8; x += 2) {
        const u = (x - masterStart) / (w - 8 - masterStart);
        const env = Math.sin(u * Math.PI);
        const bin = playing ? freqData[Math.floor(u * 40)] / 255 : 0.35;
        const carrier = Math.sin(u * 38 - t * 3.2) * (0.55 + bin * 0.95);
        const y = h * 0.5 + carrier * env * h * 0.34 * masterVol;
        if (x === masterStart) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Mirrored faint lower envelope
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      for (let x = masterStart; x <= w - 8; x += 2) {
        const u = (x - masterStart) / (w - 8 - masterStart);
        const env = Math.sin(u * Math.PI);
        const bin = playing ? freqData[Math.floor(u * 40)] / 255 : 0.35;
        const carrier = Math.sin(u * 38 - t * 3.2) * (0.55 + bin * 0.95);
        const y = h * 0.5 - carrier * env * h * 0.34 * masterVol;
        if (x === masterStart) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.restore();
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, layers, masterVol, reducedMotion]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Slide-10 Outer Signature Gradient Border (Amber -> Cyan -> Violet) */}
      <div className="p-[1.5px] rounded-3xl bg-gradient-to-r from-[#FFC66D]/70 via-[#52C7F5]/75 to-[#8A7CFF]/75 shadow-[0_24px_70px_rgba(4,8,20,0.75)]">
        <div className="glass-panel rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#52C7F5] inline-flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Multi-Layer Planetary Symphony
                </span>
                <DataStatusBadge provenance={powerOcean.provenance} compact />
              </div>
              <h1 className="text-2xl sm:text-3xl font-tech font-medium title-gradient-soft">
                The Earth Orchestra: A Planetary Symphony
              </h1>
              <p className="text-sm sm:text-base text-[#A9BAD0] mt-2 max-w-[74ch]">
                Combine compatible NASA POWER streams for a shared location: temperature dictates pitch, precipitation sets rhythmic pulse, and atmospheric wind shapes filter modulation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                active={showGlobePicker}
                accentColor="#52C7F5"
                onClick={() => setShowGlobePicker((v) => !v)}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Location: {selectedLocationName}</span>
              </Chip>
              <button
                type="button"
                onClick={() => {
                  liveAnnouncer.announcePolite(orchestraSummary, { force: true });
                  if (speechEnabled) speechService.speak(orchestraSummary);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#0B172B] hover:bg-[#132544] border border-[#2A3F63] hover:border-[#52C7F5] text-xs font-mono-tabular font-semibold text-[#F5F8FF] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4 text-[#52C7F5]" aria-hidden="true" />
                <span>Describe current mix</span>
              </button>
            </div>
          </div>

          {showGlobePicker && (
            <Suspense fallback={<div className="h-[280px] rounded-2xl bg-[#050914] p-4 text-xs">Loading globe picker...</div>}>
              <InteractiveGlobe
                mode="compact"
                experienceId="ocean"
                accentColor="#52C7F5"
                lat={selectedLat}
                lon={selectedLon}
                onSelectLocation={(la, lo, name) => setLocation(la, lo, name)}
                heightClass="h-[280px]"
              />
            </Suspense>
          )}

          {/* Slide-10 Core Composition: 3 Frosted Track Strips (Left) + Braided Filament Mix & Master Output (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch rounded-3xl bg-[#050A16]/90 border border-white/10 p-4">
            {/* Left Frosted Multi-Track Console */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {[
                {
                  key: 'temp' as const,
                  title: 'Pitch (Temperature)',
                  metric: `${currentOceanPt?.primaryValue ?? '—'} °C`,
                  color: '#FFC66D',
                  Icon: Flame
                },
                {
                  key: 'precip' as const,
                  title: 'Pulse (Precipitation)',
                  metric: `${currentAtmosPt?.primaryValue ?? '—'} mm/day`,
                  color: '#52C7F5',
                  Icon: Waves
                },
                {
                  key: 'wind' as const,
                  title: 'Modulation (Atmospheric)',
                  metric: `${currentAtmosPt?.secondaryValue ?? '—'} m/s`,
                  color: '#8A7CFF',
                  Icon: Wind
                }
              ].map((layer) => {
                const st = layers[layer.key];
                const Icon = layer.Icon;
                return (
                  <div
                    key={layer.key}
                    className="rounded-2xl bg-[#0A1324]/90 border p-3.5 space-y-2.5 transition-all"
                    style={{ borderColor: st.enabled ? `${layer.color}66` : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" style={{ color: layer.color }} />
                        <span className="text-xs sm:text-sm font-display font-medium text-[#F5F8FF] truncate">
                          {layer.title}
                        </span>
                      </div>
                      <span className="text-xs font-mono-tabular font-bold shrink-0" style={{ color: layer.color }}>
                        {layer.metric}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Chip
                          active={st.enabled}
                          accentColor={layer.color}
                          onClick={() =>
                            setLayers((prev) => ({
                              ...prev,
                              [layer.key]: { ...prev[layer.key], enabled: !prev[layer.key].enabled }
                            }))
                          }
                        >
                          {st.enabled ? 'ON' : 'OFF'}
                        </Chip>
                        <Chip
                          active={st.solo}
                          accentColor="#57D6A0"
                          onClick={() =>
                            setLayers((prev) => ({
                              ...prev,
                              [layer.key]: { ...prev[layer.key], solo: !prev[layer.key].solo }
                            }))
                          }
                        >
                          Solo
                        </Chip>
                      </div>

                      <div className="w-28 sm:w-32">
                        <Slider
                          label="Gain"
                          value={Math.round(st.volume * 100)}
                          min={0}
                          max={100}
                          unit="%"
                          accentColor={layer.color}
                          onChange={(v) =>
                            setLayers((prev) => ({
                              ...prev,
                              [layer.key]: { ...prev[layer.key], volume: v / 100 }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Braided Harmonic Filaments + Combined Output Envelope */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#040813] border border-white/10 p-3 relative overflow-hidden min-h-[260px]">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#A9BAD0] z-10 px-1">
                <span>Braided Streamlines → Combined Safe-Limited Mix</span>
                <span className={playing ? 'text-[#57D6A0]' : 'text-[#A9BAD0]'}>
                  {playing ? 'PLAYING' : 'READY'}
                </span>
              </div>
              <canvas
                ref={braidCanvasRef}
                aria-label="Multi-layer Earth Orchestra braided harmonic visualization"
                className="w-full h-56 sm:h-64 block"
              />
            </div>
          </div>

          {/* Master Transport & Shared Timeline Scrubber */}
          <div className="rounded-2xl bg-[#050A16]/90 border border-white/10 p-4 space-y-3">
            <SectionHeader
              eyebrow={`Observation ${currentOceanPt?.dateLabel || ''}`}
              title="Master Orchestra Mix (Safe-Limited)"
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (playing) sonificationEngine.stopAllNodes();
                      setPlaying((p) => !p);
                    }}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[#52C7F5] text-[#050914] font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{playing ? 'Pause' : 'Play Orchestra'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Stop orchestra"
                    onClick={() => {
                      sonificationEngine.stopAllNodes();
                      setPlaying(false);
                      setStepIdx(0);
                    }}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0A1220] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Slider
                label={`Shared Timeline Step (${safeIdx + 1}/${totalSteps})`}
                value={safeIdx}
                min={0}
                max={Math.max(0, totalSteps - 1)}
                accentColor="#52C7F5"
                onChange={setStepIdx}
              />
              <Slider
                label="Master Volume (Safe Limiter Active)"
                value={Math.round(masterVol * 100)}
                min={0}
                max={100}
                unit="%"
                accentColor="#57D6A0"
                onChange={(v) => setMasterVol(v / 100)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
