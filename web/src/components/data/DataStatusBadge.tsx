import React, { useEffect, useId, useRef, useState } from 'react';
import {
  type ClientProvenance,
  getDataStatusLabel
} from '../../types/dataStatus';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  Info,
  X
} from 'lucide-react';

interface DataStatusBadgeProps {
  provenance: ClientProvenance;
  compact?: boolean;
}

export const DataStatusBadge: React.FC<DataStatusBadgeProps> = ({
  provenance,
  compact = false
}) => {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const label = getDataStatusLabel(provenance.dataStatus);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  const styleByStatus = {
    LIVE_SOURCE: {
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25',
      Icon: CheckCircle2,
      iconClass: 'text-emerald-400'
    },
    CACHED_SOURCE_SNAPSHOT: {
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25',
      Icon: Database,
      iconClass: 'text-sky-400'
    },
    SAVED_ON_DEVICE: {
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/25',
      Icon: HardDrive,
      iconClass: 'text-indigo-400'
    },
    LOCAL_DEMONSTRATION: {
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30',
      Icon: AlertTriangle,
      iconClass: 'text-amber-400'
    }
  }[provenance.dataStatus];

  const Icon = styleByStatus.Icon;

  return (
    <div ref={containerRef} className="relative inline-block">
      <div role="status" aria-live="polite" className="inline-flex items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={popoverId}
          className={`inline-flex items-center gap-1.5 rounded-full border font-mono-tabular font-semibold tracking-wider uppercase transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#52C7F5] ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } ${styleByStatus.badgeClass}`}
          title="Click to inspect full data provenance, retrieval date, and processing steps"
        >
          <Icon className={`w-3.5 h-3.5 shrink-0 ${styleByStatus.iconClass}`} />
          <span>{label}</span>
          <Info className="w-3 h-3 opacity-75" />
        </button>
      </div>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`Data Provenance Details for ${label}`}
          className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-[#0A1220] border border-[#52C7F5]/60 shadow-2xl p-4 text-xs text-[#F5F8FF] space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-mono-tabular font-bold uppercase text-[#52C7F5]">
              {label}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close provenance popover"
              className="p-1 rounded-lg hover:bg-slate-800 text-[#9AA9BD] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-[#F5F8FF] leading-relaxed bg-[#101C2D] p-2.5 rounded-xl border border-slate-800">
            {provenance.plainLanguageSummary}
          </p>

          <div className="space-y-1 font-mono-tabular text-[11px] text-[#9AA9BD]">
            <div>
              <strong className="text-[#F5F8FF]">Provider:</strong> {provenance.provider}
            </div>

            {provenance.originalStatus && (
              <div>
                <strong className="text-[#F5F8FF]">Original Server Status:</strong>{' '}
                {provenance.originalStatus}
              </div>
            )}

            {provenance.retrievedAt && (
              <div>
                <strong className="text-[#F5F8FF]">Retrieved At:</strong>{' '}
                {provenance.retrievedAt}
              </div>
            )}

            {provenance.referencePeriod && (
              <div>
                <strong className="text-[#F5F8FF]">Reference Period:</strong>{' '}
                {provenance.referencePeriod}
              </div>
            )}

            {provenance.sourceUrl && (
              <div className="pt-1">
                <a
                  href={provenance.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#52C7F5] hover:underline inline-flex items-center gap-1 break-all"
                >
                  <span>Inspect Upstream Source URL</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {provenance.processing.length > 0 && (
            <div className="border-t border-slate-800 pt-2">
              <div className="font-mono-tabular uppercase text-[10px] text-[#9AA9BD] font-semibold mb-1">
                EarthSonic Processing Applied:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                {provenance.processing.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
