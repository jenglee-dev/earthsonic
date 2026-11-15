import React, { useEffect, useRef } from 'react';
import type { DataPoint, EarthExperience } from '../../types/earthsonic';
import { normalizeValue, sonificationEngine } from '../../audio/sonificationEngine';
import { isEffectiveReducedMotionActive } from '../../store/useAccessibilityStore';
import {
  useEffectiveReducedMotion,
  useExperienceAccentColor
} from '../../hooks/useAccessibilityRuntime';

/**
 * Slides 05-07 authentic real-data Experience Signature Banner:
 * - temperature: Amber real observation trend curve + frequency-modulated pitch sine wave
 * - ocean: Cyan hanging pulse intensity bars + concentric ocean ripple rings
 * - atmosphere: Violet vector arrows + double vortex wind streamline curls
 */
export const ExperienceSignatureBanner: React.FC<{
  experience: EarthExperience;
  series: DataPoint[];
  currentPoint: DataPoint;
  isPlaying: boolean;
}> = ({ experience, series, currentPoint, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useEffectiveReducedMotion();
  const accentColor = useExperienceAccentColor(experience.id);
  const pSpec = experience.mappings.pitch;
  const normalized = normalizeValue(currentPoint.primaryValue, pSpec.minData, pSpec.maxData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const freqData = new Uint8Array(48) as Uint8Array<ArrayBuffer>;

    const render = (now: number) => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 190;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (isPlaying && !reduced) {
        sonificationEngine.getFrequencyData(freqData);
      }
      const t = reduced ? 0 : now * 0.0018;

      if (experience.id === 'temperature') {
        // Slide 05: Upper area chart from REAL series + lower FM pitch sine wave
        const baseMidY = h * 0.44;
        const pts = series.length > 1 ? series : [currentPoint];

        // Area glow fill
        const areaGrad = ctx.createLinearGradient(0, 12, 0, baseMidY);
        areaGrad.addColorStop(0, 'rgba(255, 198, 109, 0.34)');
        areaGrad.addColorStop(1, 'rgba(255, 198, 109, 0.02)');

        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const x = (idx / Math.max(1, pts.length - 1)) * w;
          const norm = normalizeValue(pt.primaryValue, pSpec.minData, pSpec.maxData);
          const y = baseMidY - 6 - norm * (baseMidY - 18);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(w, baseMidY);
        ctx.lineTo(0, baseMidY);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Crisp glowing trend stroke
        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const x = (idx / Math.max(1, pts.length - 1)) * w;
          const norm = normalizeValue(pt.primaryValue, pSpec.minData, pSpec.maxData);
          const y = baseMidY - 6 - norm * (baseMidY - 18);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#FFC66D';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Horizontal datum line
        ctx.strokeStyle = 'rgba(255, 198, 109, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, baseMidY);
        ctx.lineTo(w, baseMidY);
        ctx.stroke();

        // Lower FM sine wave whose spatial frequency tracks real normalized anomalies
        const waveMidY = h * 0.74;
        ctx.strokeStyle = '#FFD98E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let phaseAcc = -t * (isPlaying ? 2.4 : 0.9);
        for (let x = 0; x <= w; x += 2) {
          const u = x / w;
          const idx = Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)));
          const localNorm = normalizeValue(pts[idx].primaryValue, pSpec.minData, pSpec.maxData);
          const instantFreq = 0.025 + Math.pow(localNorm, 1.4) * 0.16;
          phaseAcc += instantFreq * 2;
          const amp = 10 + localNorm * 22 + (isPlaying ? (freqData[idx % 32] / 255) * 10 : 0);
          const y = waveMidY + Math.sin(phaseAcc) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (experience.id === 'ocean') {
        // Slide 06: Vertical hanging cyan rain/pulse bars + horizontal water line + elliptical concentric ripples
        const waterY = h * 0.62;
        const clusterCenters = [w * 0.3, w * 0.72];

        ctx.strokeStyle = 'rgba(82, 199, 245, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, waterY);
        ctx.lineTo(w * 0.95, waterY);
        ctx.stroke();

        clusterCenters.forEach((cx, clusterIdx) => {
          const barCount = clusterIdx === 0 ? 11 : 9;
          const rippleCount = Math.max(3, Math.round(3 + normalized * 4));
          const maxRx = clusterIdx === 0 ? w * 0.21 : w * 0.16;

          // Elliptical perspective water ripples
          for (let r = 1; r <= rippleCount; r++) {
            const prog = ((r / rippleCount) + (reduced ? 0 : t * 0.12 * (0.6 + normalized))) % 1;
            const rx = 18 + prog * maxRx;
            const ry = rx * 0.24;
            ctx.strokeStyle = `rgba(82, 199, 245, ${(1 - prog) * 0.65})`;
            ctx.lineWidth = 1.6 - prog * 0.7;
            ctx.beginPath();
            ctx.ellipse(cx, waterY + 14, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Hanging vertical bars from top
          for (let b = 0; b < barCount; b++) {
            const offset = (b - (barCount - 1) / 2) * 14;
            const distNorm = 1 - Math.abs(offset) / (barCount * 7.5);
            const drop =
              26 +
              distNorm * (waterY - 12) * (0.45 + 0.55 * normalized) *
                (0.85 + 0.15 * Math.sin(t * 2.2 + b * 0.9 + clusterIdx));
            const grad = ctx.createLinearGradient(0, 6, 0, 6 + drop);
            grad.addColorStop(0, 'rgba(82, 199, 245, 0.1)');
            grad.addColorStop(1, 'rgba(124, 232, 255, 0.9)');
            ctx.fillStyle = grad;
            ctx.fillRect(cx + offset - 3, 6, 6, drop);
          }
        });
      } else {
        // Slide 07: Left vector arrows streaming into dual swirling violet vortices
        const streamCount = 15;
        const speedFactor = 0.7 + normalized * 1.4;
        for (let s = 0; s < streamCount; s++) {
          const laneY = 18 + (s / (streamCount - 1)) * (h - 36);
          const normLane = (s / (streamCount - 1)) * 2 - 1;
          ctx.strokeStyle =
            Math.abs(normLane) < 0.45
              ? 'rgba(155, 140, 255, 0.78)'
              : 'rgba(138, 124, 255, 0.45)';
          ctx.lineWidth = Math.abs(normLane) < 0.35 ? 1.8 : 1.1;

          ctx.beginPath();
          for (let x = 16; x <= w - 16; x += 4) {
            const u = x / w;
            const vortex1 = Math.exp(-Math.pow((u - 0.5) * 5.2, 2)) * Math.sin(u * 20 - t * speedFactor + s * 0.6) * 26;
            const vortex2 = Math.exp(-Math.pow((u - 0.78) * 5.6, 2)) * Math.cos(u * 18 + t * speedFactor * 1.2 + s * 0.5) * 24;
            const envelope = u < 0.28 ? (u / 0.28) * 0.2 : 1;
            const y = laneY + (vortex1 + vortex2) * envelope;
            if (x === 16) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Left laminar velocity arrow head
          const arrowX = 36 + ((s * 29 + (reduced ? 0 : now * 0.04 * speedFactor)) % (w * 0.22));
          ctx.beginPath();
          ctx.moveTo(arrowX - 5, laneY - 3);
          ctx.lineTo(arrowX, laneY);
          ctx.lineTo(arrowX - 5, laneY + 3);
          ctx.stroke();
        }
      }

      ctx.restore();
      if (!reduced) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [experience.id, series, currentPoint, isPlaying, normalized, pSpec.minData, pSpec.maxData, reducedMotion]);

  const isPowerOcean = experience.id === 'ocean' && pSpec.unit === 'mm/day';
  const isPowerAtmos = experience.id === 'atmosphere' && pSpec.unit === 'm/s';

  const titleByExp = {
    temperature: 'Tracking Temperature Anomalies Through Pitch',
    ocean: isPowerOcean
      ? 'Translating Regional Ocean-Grid Precipitation into Rhythm'
      : 'Translating Global Sea Level & Ocean Heat into Rhythm',
    atmosphere: isPowerAtmos
      ? 'Mapping Tropospheric Wind Speeds to Filter & Stereo'
      : 'Mapping Column-Averaged CO2 Dynamics to Audio Filter'
  }[experience.id];

  const copyByExp = {
    temperature:
      'Higher pitch represents a higher temperature anomaly relative to the baseline range. Positive anomalies introduce harmonic brightness so rising heat is immediately audible.',
    ocean: isPowerOcean
      ? 'Regional NASA POWER satellite precipitation drives pulse density and ocean chord warmth. Heavier rainfall triggers faster pulses while dry intervals stay sparse.'
      : 'Global mean sea level rise and ocean sea-surface warmth drive pulse density and sub-bass tides. Higher anomalies trigger faster rhythmic pulses.',
    atmosphere: isPowerAtmos
      ? 'Regional NASA POWER 10-meter wind speed modulates acoustic filter sweep brightness, shimmer texture, and stereo motion.'
      : 'Column-averaged dry-air CO2 concentration and aerosol depth shape low-pass filter openness, harmonic texture, and spatial breath.'
  }[experience.id];

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl border border-[#9EC5FF]/20 overflow-hidden p-4 sm:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-5 space-y-1.5">
          <div
            className="text-[11px] font-mono-tabular uppercase tracking-wider font-semibold"
            style={{ color: accentColor }}
          >
            {experience.badgeText}
          </div>
          <h2 className="text-lg sm:text-xl font-display font-medium text-[#F5F8FF] leading-snug">
            {titleByExp}
          </h2>
          <p className="text-sm text-[#A9BAD0] leading-relaxed">{copyByExp}</p>
        </div>

        <div className="lg:col-span-7 h-36 sm:h-44 rounded-2xl bg-[#060B18]/85 border border-white/10 overflow-hidden relative">
          <canvas
            ref={canvasRef}
            aria-label={`${titleByExp} live visualization`}
            className="w-full h-full block"
          />
          <div className="absolute bottom-2 right-3 text-[11px] font-mono-tabular text-[#A9BAD0] bg-[#050914]/70 px-2 py-0.5 rounded">
            Current: <strong className="text-[#F5F8FF]">{currentPoint.primaryValue}</strong> {pSpec.unit}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Slide 03 Panel #4: Mirrored Interactive Sound Visualiser driven by live AnalyserNode.
 */
export const SymmetricalAnalyserCanvas: React.FC<{
  accentColor: string;
  isPlaying: boolean;
}> = ({ accentColor, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useEffectiveReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    let rafId = 0;

    const render = (now: number) => {
      const reduced = reducedMotion || isEffectiveReducedMotionActive();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 380;
      const h = canvas.clientHeight || 110;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (isPlaying && !reduced) {
        sonificationEngine.getFrequencyData(freqData);
      } else {
        freqData.fill(0);
      }

      const midY = h * 0.5;
      const barCount = 44;
      const stepW = w / barCount;
      const t = now * 0.003;

      for (let i = 0; i < barCount; i++) {
        const u = i / (barCount - 1);
        const env = Math.sin(u * Math.PI);
        const bin = isPlaying ? freqData[i % 44] / 255 : 0;
        const barH =
          bin > 0
            ? Math.max(3, bin * (h * 0.46) * (0.4 + 0.6 * env))
            : Math.max(2, (0.1 + 0.14 * Math.abs(Math.sin(i * 0.6 + (reduced ? 0 : t)))) * env * h * 0.32);

        const grad = ctx.createLinearGradient(0, midY - barH, 0, midY + barH);
        grad.addColorStop(0, '#57D6A0');
        grad.addColorStop(0.5, accentColor);
        grad.addColorStop(1, '#52C7F5');
        ctx.fillStyle = grad;
        ctx.fillRect(i * stepW + 1, midY - barH, Math.max(2, stepW - 2.5), barH * 2);
      }

      // Faint centerline
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      ctx.restore();
      if (isPlaying && !reduced) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [accentColor, isPlaying, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Symmetrical Web Audio AnalyserNode sound spectrum visualizer"
      className="w-full h-28 rounded-xl bg-[#040813] border border-white/10 block"
    />
  );
};
