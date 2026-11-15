import React, { useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import type { ExperienceId } from '../../types/earthsonic';
import { ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

interface SvgOrthographicFallbackProps {
  experienceId: ExperienceId;
  accentColor: string;
  lat: number;
  lon: number;
  isGlobalDataset?: boolean;
  onSelectLocation?: (lat: number, lon: number) => void;
  onPracticeAction?: (action: 'rotate' | 'zoom_in' | 'zoom_out' | 'pin' | 'reset') => void;
  heightClass?: string;
}

// Lightweight simplified continent polygons (GeoJSON) so 2D fallback works 100% offline with zero network calls
const SIMPLIFIED_CONTINENTS: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'North America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-168, 65], [-140, 70], [-95, 72], [-55, 52], [-75, 25], [-105, 18], [-125, 38], [-168, 65]]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'South America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-80, 10], [-50, 5], [-35, -8], [-45, -24], [-68, -54], [-76, -42], [-80, 10]]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Europe & Asia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-10, 36], [0, 52], [25, 70], [100, 74], [170, 66], [140, 35], [105, 10], [78, 8], [55, 22], [35, 32], [-10, 36]]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-17, 15], [-6, 36], [32, 31], [51, 12], [40, -15], [20, -35], [12, -18], [9, 4], [-17, 15]]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Australia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[114, -22], [132, -12], [153, -26], [146, -38], [116, -34], [114, -22]]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Antarctica' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-180, -70], [-90, -72], [0, -70], [90, -72], [180, -70], [180, -88], [-180, -88], [-180, -70]]]
      }
    }
  ]
};

export const SvgOrthographicFallback: React.FC<SvgOrthographicFallbackProps> = ({
  accentColor,
  lat,
  lon,
  isGlobalDataset = false,
  onSelectLocation,
  onPracticeAction,
  heightClass = 'h-[360px] sm:h-[420px]'
}) => {
  const [rotation, setRotation] = useState<[number, number]>([-lon, -lat]);
  const [scale, setScale] = useState<number>(145);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const { graticulePath, landPath, pinPos } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(scale)
      .translate([200, 200])
      .rotate([rotation[0], rotation[1], 0])
      .clipAngle(90);

    const pathGen = geoPath(projection);
    const grat = pathGen(geoGraticule10()) || '';
    const land = pathGen(SIMPLIFIED_CONTINENTS) || '';
    const projectedPin = projection([lon, lat]);
    return {
      graticulePath: grat,
      landPath: land,
      pinPos: projectedPin
    };
  }, [rotation, scale, lat, lon]);

  const centerLat = Math.max(-90, Math.min(90, Number((-rotation[1]).toFixed(1))));
  const centerLon = Number(((((-rotation[0] + 180) % 360) + 360) % 360 - 180).toFixed(1));

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setRotation(([rLon, rLat]) => [
      rLon + dx * 0.45,
      Math.max(-85, Math.min(85, rLat - dy * 0.45))
    ]);
    onPracticeAction?.('rotate');
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl bg-[#050914] border border-[#1E2E48] overflow-hidden flex flex-col items-center justify-center`}
      data-testid="globe-2d-fallback"
    >
      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-[#0A1220]/90 border border-[#52C7F5]/40 text-[11px] font-mono-tabular text-[#52C7F5]">
        2D Orthographic Map Mode (d3-geo)
      </div>

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[400px] cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="img"
        aria-label={`2D orthographic projection globe centered at ${centerLat} degrees latitude, ${centerLon} degrees longitude`}
      >
        <circle cx={200} cy={200} r={scale} fill="#0A182E" stroke={accentColor} strokeWidth={1.5} strokeOpacity={0.65} />
        <path d={graticulePath} fill="none" stroke="#1E2E48" strokeWidth={0.75} />
        <path d={landPath} fill="#183254" stroke="#52C7F5" strokeWidth={0.8} strokeOpacity={0.55} />
        {/* Center Reticle */}
        <circle cx={200} cy={200} r={8} fill="none" stroke="#F5F8FF" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
        {/* Selected Pin */}
        {pinPos && !isGlobalDataset && (
          <g transform={`translate(${pinPos[0]}, ${pinPos[1]})`}>
            <circle r={6} fill={accentColor} fillOpacity={0.35} />
            <circle r={3.2} fill={accentColor} stroke="#050914" strokeWidth={1.2} />
          </g>
        )}
      </svg>

      {/* Controls overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <div className="px-2.5 py-1 rounded-xl bg-[#0A1220]/90 border border-[#1E2E48] text-[11px] font-mono-tabular text-[#9AA9BD]">
          Reticle: {centerLat}°, {centerLon}°
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Pan 2D map with arrow keys"
            onKeyDown={(e) => {
              const step = 12;
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setRotation(([rLon, rLat]) => [rLon + step, rLat]);
                onPracticeAction?.('rotate');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setRotation(([rLon, rLat]) => [rLon - step, rLat]);
                onPracticeAction?.('rotate');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setRotation(([rLon, rLat]) => [rLon, Math.max(-85, rLat - step)]);
                onPracticeAction?.('rotate');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setRotation(([rLon, rLat]) => [rLon, Math.min(85, rLat + step)]);
                onPracticeAction?.('rotate');
              }
            }}
            onClick={() => {
              setRotation(([rLon, rLat]) => [rLon - 15, rLat]);
              onPracticeAction?.('rotate');
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-[#101C2D] border border-[#1E2E48] text-[11px] font-mono-tabular text-[#F5F8FF] hover:bg-[#1E2E48] cursor-pointer"
          >
            Pan (Arrows)
          </button>
          {!isGlobalDataset && onSelectLocation && (
            <button
              type="button"
              onClick={() => {
                onSelectLocation(centerLat, centerLon);
                onPracticeAction?.('pin');
              }}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#101C2D] border border-[#52C7F5]/50 text-xs font-mono-tabular text-[#F5F8FF] hover:bg-[#1E2E48] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#52C7F5]" />
              <span>Select center</span>
            </button>
          )}
          <button
            type="button"
            aria-label="Zoom in 2D map"
            onClick={() => {
              setScale((s) => Math.min(240, s + 20));
              onPracticeAction?.('zoom_in');
            }}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out 2D map"
            onClick={() => {
              setScale((s) => Math.max(95, s - 20));
              onPracticeAction?.('zoom_out');
            }}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Reset 2D map view"
            onClick={() => {
              setRotation([-lon, -lat]);
              setScale(145);
              onPracticeAction?.('reset');
            }}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#101C2D] border border-[#1E2E48] text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
