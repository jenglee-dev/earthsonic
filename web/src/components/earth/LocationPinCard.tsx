import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlaceLookupResult, PlaceType } from '../../services/placeLookup';
import type { ExperienceId } from '../../types/earthsonic';
import { toExperienceQuerySlug } from '../../store/useEarthSonicStore';
import {
  Building2,
  Check,
  Copy,
  Flag,
  GitCompare,
  Globe2,
  Info,
  Link2,
  MapPin,
  Mountain,
  Snowflake,
  Star,
  Waves,
  X
} from 'lucide-react';

export function getPlaceTypeIcon(type: PlaceType, className = 'w-4 h-4') {
  switch (type) {
    case 'city':
      return <Building2 className={className} aria-hidden="true" />;
    case 'ocean':
    case 'sea':
      return <Waves className={className} aria-hidden="true" />;
    case 'polar':
      return <Snowflake className={className} aria-hidden="true" />;
    case 'region':
      return <Mountain className={className} aria-hidden="true" />;
    case 'country':
      return <Flag className={className} aria-hidden="true" />;
    default:
      return <Globe2 className={className} aria-hidden="true" />;
  }
}

export interface LocationPinCardProps {
  place: PlaceLookupResult;
  experienceId: ExperienceId;
  accentColor: string;
  isGlobalDataset: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

export const LocationPinCard: React.FC<LocationPinCardProps> = ({
  place,
  experienceId,
  accentColor,
  isGlobalDataset,
  isFavorite,
  onToggleFavorite,
  onClose
}) => {
  const [copiedMode, setCopiedMode] = useState<'none' | 'coords' | 'link'>('none');
  const [showSourceInfo, setShowSourceInfo] = useState(false);

  const subtitleParts = [place.adminRegion, place.country].filter(Boolean);
  const subtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(', ')
      : place.type === 'ocean'
      ? 'Open Ocean'
      : place.type === 'sea'
      ? 'Marginal Sea'
      : 'Earth Location';

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(place.formattedCoords);
      setCopiedMode('coords');
      window.setTimeout(() => setCopiedMode('none'), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.pathname = '/explorer';
      url.searchParams.set('exp', toExperienceQuerySlug(experienceId));
      url.searchParams.set('lat', String(Number(place.lat.toFixed(2))));
      url.searchParams.set('lon', String(Number(place.lon.toFixed(2))));
      url.searchParams.set('name', place.placeName);
      await navigator.clipboard.writeText(url.toString());
      setCopiedMode('link');
      window.setTimeout(() => setCopiedMode('none'), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const compareHref = `/hear-the-change?exp=${toExperienceQuerySlug(experienceId)}&lat=${Number(
    place.lat.toFixed(2)
  )}&lon=${Number(place.lon.toFixed(2))}&name=${encodeURIComponent(place.placeName)}`;

  return (
    <div
      role="region"
      aria-label={`Pinned location: ${place.placeName}`}
      className="w-[242px] sm:w-[248px] rounded-2xl bg-[#060D1D]/92 backdrop-blur-xl border border-white/20 shadow-[0_18px_50px_rgba(2,6,18,0.88)] p-2.5 text-[#F5F8FF] space-y-1.5 transition-opacity duration-200 motion-reduce:transition-none"
      style={{ borderColor: `${accentColor}66` }}
    >
      {/* Top Row: Type badge + Source popover toggle + Close button */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0 border border-white/15 mt-0.5"
            style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
          >
            {getPlaceTypeIcon(place.type, 'w-3.5 h-3.5')}
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] sm:text-sm font-display font-bold text-[#F5F8FF] leading-snug line-clamp-2">
              {place.placeName}
            </h3>
            <p className="text-[11px] text-[#A9BAD0] truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Place lookup source details"
            aria-expanded={showSourceInfo}
            onClick={() => setShowSourceInfo((v) => !v)}
            className="min-w-[30px] min-h-[30px] rounded-lg hover:bg-white/10 text-[#9AA9BD] hover:text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Close pin label card"
            onClick={onClose}
            className="min-w-[30px] min-h-[30px] rounded-lg hover:bg-white/10 text-[#9AA9BD] hover:text-[#F5F8FF] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Coordinates & Nearest-place distance */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono-tabular bg-[#040814]/85 border border-white/10 rounded-lg px-2 py-1">
        <span className="inline-flex items-center gap-1 text-[#7CE8FF]">
          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{place.formattedCoords}</span>
        </span>
        {place.distanceKm !== null &&
          place.nearestPlace &&
          place.placeName !== place.nearestPlace && (
            <span className="text-[#9AA9BD] truncate max-w-[118px]">
              ~{Math.round(place.distanceKm)} km {place.nearestPlace}
            </span>
          )}
      </div>

      {/* Data Applicability Chip (strictly derived from real experience metadata) */}
      <div
        className={`rounded-lg px-2 py-1 text-[10px] leading-snug border ${
          isGlobalDataset
            ? 'bg-amber-500/12 border-amber-400/35 text-amber-100'
            : 'bg-emerald-500/12 border-emerald-400/35 text-emerald-100'
        }`}
      >
        {isGlobalDataset
          ? "This experience uses global data: location doesn't change it."
          : `Water Rhythm & Living Atmosphere data available here (${place.placeName} cell).`}
      </div>

      {/* Source & Honesty Details Popover */}
      {showSourceInfo && (
        <div className="rounded-xl bg-[#040916] border border-[#52C7F5]/35 p-2 text-[10px] text-[#A9BAD0] leading-relaxed space-y-1">
          <div>
            <strong className="text-[#F5F8FF]">Source:</strong> {place.sourceLabel} (GeoNames CC BY 4.0 &amp; Natural Earth Public Domain).
          </div>
          <div>
            A name identifies the nearest known feature — atmospheric readings represent the gridded cell, not an on-site gauge.
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between gap-1 pt-0.5">
        <button
          type="button"
          onClick={handleCopyCoords}
          aria-label={copiedMode === 'coords' ? 'Done copying coordinates' : 'Coords: copy formatted coordinates'}
          className="min-h-[30px] px-1.5 py-1 rounded-lg bg-[#0B1528] hover:bg-[#13233F] border border-white/15 text-[10px] font-mono-tabular text-[#E2E8F0] inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
        >
          {copiedMode === 'coords' ? (
            <Check className="w-3 h-3 text-[#57D6A0] shrink-0" />
          ) : (
            <Copy className="w-3 h-3 text-[#52C7F5] shrink-0" />
          )}
          <span>{copiedMode === 'coords' ? 'Done' : 'Coords'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={copiedMode === 'link' ? 'Done copying link' : 'Link: copy shareable URL'}
          className="min-h-[30px] px-1.5 py-1 rounded-lg bg-[#0B1528] hover:bg-[#13233F] border border-white/15 text-[10px] font-mono-tabular text-[#E2E8F0] inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
        >
          {copiedMode === 'link' ? (
            <Check className="w-3 h-3 text-[#57D6A0] shrink-0" />
          ) : (
            <Link2 className="w-3 h-3 text-[#52C7F5] shrink-0" />
          )}
          <span>{copiedMode === 'link' ? 'Done' : 'Link'}</span>
        </button>

        <button
          type="button"
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          className={`min-h-[30px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
            isFavorite
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
              : 'bg-[#0B1528] hover:bg-[#13233F] border-white/15 text-[#E2E8F0]'
          }`}
        >
          <Star className={`w-3 h-3 shrink-0 ${isFavorite ? 'fill-amber-300 text-amber-300' : 'text-[#9AA9BD]'}`} />
          <span>{isFavorite ? 'Saved' : 'Save'}</span>
        </button>

        <Link
          to={compareHref}
          className="min-h-[30px] px-1.5 py-1 rounded-lg bg-[#0B1528] hover:bg-[#13233F] border border-white/15 text-[10px] font-mono-tabular text-[#E2E8F0] inline-flex items-center justify-center gap-1 whitespace-nowrap"
        >
          <GitCompare className="w-3 h-3 text-[#8A7CFF] shrink-0" />
          <span>Compare</span>
        </Link>
      </div>
    </div>
  );
};
