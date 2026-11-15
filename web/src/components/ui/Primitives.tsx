import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

/* 1. GlassPanel */
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3;
  accentColor?: string;
  children: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  elevation = 2,
  accentColor,
  className = '',
  style,
  children,
  ...rest
}) => {
  const baseClass =
    elevation === 1
      ? 'bg-[#050914]/90 border border-[#1E2E48]'
      : elevation === 2
      ? 'glass-panel-deep'
      : 'glass-panel';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl ${baseClass} ${className}`}
      style={{
        ...(accentColor
          ? {
              borderColor: `${accentColor}40`,
              boxShadow: `inset 0 1px 0 rgba(245,248,255,0.06), 0 0 28px ${accentColor}14`
            }
          : {}),
        ...style
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

/* 2. SectionHeader */
interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  variant?: 'default' | 'tech';
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  accentColor = '#52C7F5',
  variant = 'default',
  action
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="max-w-[70ch]">
      {eyebrow && (
        <div
          className="text-xs font-mono-tabular uppercase tracking-widest font-semibold mb-1.5"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        className={
          variant === 'tech'
            ? 'text-2xl sm:text-3xl lg:text-[2rem] font-tech font-medium title-gradient-soft leading-tight'
            : 'text-2xl sm:text-3xl font-normal font-display title-gradient-soft tracking-[-0.02em] leading-tight'
        }
      >
        {title}
      </h2>
      {subtitle && <p className="text-base text-[#A9BAD0] mt-2 leading-relaxed">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* 3. StatTile */
interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  accentColor?: string;
  explanation?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  accentColor = '#52C7F5',
  explanation
}) => {
  const [showCalc, setShowCalc] = useState(false);

  if (!explanation) {
    return (
      <div className="rounded-2xl bg-[#050914]/80 border border-[#1E2E48] p-3.5">
        <div className="text-xs font-mono-tabular text-[#9AA9BD] uppercase tracking-wider">
          {label}
        </div>
        <div className="text-xl font-bold font-mono-tabular mt-1" style={{ color: accentColor }}>
          {value}
          {unit && <span className="text-xs font-normal text-[#9AA9BD] ml-1">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowCalc((s) => !s)}
        aria-expanded={showCalc}
        className="w-full text-left rounded-2xl bg-[#050914]/80 border border-[#1E2E48] hover:border-[#52C7F5]/60 p-3.5 transition-colors cursor-pointer min-h-[44px]"
        title="Tap to see how this was calculated"
      >
        <div className="text-xs font-mono-tabular text-[#9AA9BD] uppercase tracking-wider flex items-center justify-between gap-2">
          <span>{label}</span>
          <span className="text-[10px] text-[#52C7F5]">Formula?</span>
        </div>
        <div className="text-xl font-bold font-mono-tabular mt-1" style={{ color: accentColor }}>
          {value}
          {unit && <span className="text-xs font-normal text-[#9AA9BD] ml-1">{unit}</span>}
        </div>
      </button>
      {showCalc && (
        <div
          role="dialog"
          aria-label={`Calculation for ${label}`}
          className="mt-1.5 rounded-xl bg-[#0A1220] border border-[#52C7F5]/50 p-3 text-xs text-[#F5F8FF] shadow-xl"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono-tabular text-[11px] text-[#52C7F5] uppercase font-semibold">
              How this was calculated
            </span>
            <button
              type="button"
              onClick={() => setShowCalc(false)}
              aria-label="Close calculation note"
              className="p-1 text-[#9AA9BD] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[#9AA9BD] leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
};

/* 4. Chip */
interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  accentColor?: string;
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  accentColor = '#52C7F5',
  className = '',
  children,
  ...rest
}) => (
  <button
    type="button"
    aria-pressed={active}
    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-mono-tabular font-semibold border transition-all duration-150 inline-flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#52C7F5] ${
      active
        ? 'text-[#050914] shadow-md'
        : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#52C7F5]/60'
    } ${className}`}
    style={active ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
    {...rest}
  >
    {children}
  </button>
);

/* 5. IconButton */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  className = '',
  children,
  ...rest
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-[#0A1220] hover:bg-[#101C2D] border border-[#1E2E48] hover:border-[#52C7F5]/60 text-[#F5F8FF] inline-flex items-center justify-center transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#52C7F5] ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/* 6. Slider */
interface SliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accentColor?: string;
  onChange: (val: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  accentColor = '#52C7F5',
  onChange
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-mono-tabular">
        <label htmlFor={inputId} className="text-[#9AA9BD]">
          {label}
        </label>
        <span className="font-bold text-[#F5F8FF]">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor }}
        className="w-full h-2.5 rounded-lg bg-[#050914] cursor-pointer min-h-[44px]"
      />
    </div>
  );
};

/* 7. Tabs */
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  accentColor?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  ariaLabel,
  accentColor = '#52C7F5'
}) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className="flex flex-wrap items-center gap-1.5 bg-[#050914]/90 p-1.5 rounded-2xl border border-[#1E2E48]"
  >
    {items.map((item) => {
      const active = item.id === activeId;
      return (
        <button
          key={item.id}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(item.id)}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-display font-semibold inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#52C7F5] ${
            active ? 'text-[#050914] shadow-sm' : 'text-[#9AA9BD] hover:text-[#F5F8FF]'
          }`}
          style={active ? { backgroundColor: accentColor } : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      );
    })}
  </div>
);

/* 8. Accordion */
interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  defaultOpen = false,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <div className="rounded-2xl bg-[#0A1220]/90 border border-[#1E2E48] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between gap-3 text-left text-sm font-display font-semibold text-[#F5F8FF] hover:bg-[#101C2D]/60 transition-colors cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#9AA9BD] shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div id={contentId} className="px-4 pb-4 pt-1 text-sm text-[#9AA9BD] border-t border-[#1E2E48]/60">
          {children}
        </div>
      )}
    </div>
  );
};

/* 9. Tooltip */
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] rounded-xl bg-[#050914] border border-[#52C7F5]/60 px-3 py-1.5 text-xs text-[#F5F8FF] shadow-xl pointer-events-none"
        >
          {text}
        </span>
      )}
    </span>
  );
};

/* 10. Drawer (Esc + Focus Management) */
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, children }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/65 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 w-full sm:max-w-md max-h-[85vh] sm:max-h-full bg-[#0A1220] border-t sm:border-t-0 sm:border-l border-[#1E2E48] rounded-t-3xl sm:rounded-none p-5 overflow-y-auto shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3 mb-4">
          <h2 className="text-base font-display font-bold text-[#F5F8FF]">{title}</h2>
          <IconButton label="Close drawer" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
};

/* 11. TiltCard (max 8 deg pointer tilt, static under reduced motion) */
interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  children: React.ReactNode;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  accentColor = '#52C7F5',
  className = '',
  children,
  ...rest
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: Number((-y * 8).toFixed(2)), ry: Number((x * 8).toFixed(2)) });
  };

  return (
    <div
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
      className={`glass-panel rounded-2xl sm:rounded-3xl transition-transform duration-150 ease-out motion-reduce:transform-none ${className}`}
      style={{
        borderColor: `${accentColor}45`,
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

/* 12. NumberedCallout (1-4 PDF signature badge with outer dashed green ring) */
interface NumberedCalloutProps {
  number: 1 | 2 | 3 | 4;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const NumberedCallout: React.FC<NumberedCalloutProps> = ({
  number,
  label,
  active = false,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[44px] pl-1.5 pr-3.5 py-1.5 rounded-full border text-xs font-mono-tabular inline-flex items-center gap-2.5 transition-all cursor-pointer ${
      active
        ? 'bg-[#57D6A0]/18 border-[#57D6A0] text-[#F5F8FF] shadow-[0_0_24px_rgba(87,214,160,0.35)]'
        : 'bg-[#08101F]/90 border-[#57D6A0]/40 text-[#A9BAD0] hover:text-[#F5F8FF] hover:border-[#57D6A0]/75'
    }`}
  >
    <span className="relative inline-flex items-center justify-center w-8 h-8 shrink-0">
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-dashed border-[#6EE7B7]/70"
      />
      <span className="w-6 h-6 rounded-full bg-[#57D6A0] text-[#050914] font-bold inline-flex items-center justify-center callout-badge-halo">
        {number}
      </span>
    </span>
    <span>{label}</span>
  </button>
);

/* 13. StepCarousel */
interface StepCarouselProps {
  steps: { title: string; body: string; badge?: string }[];
  accentColor?: string;
}

export const StepCarousel: React.FC<StepCarouselProps> = ({
  steps,
  accentColor = '#52C7F5'
}) => {
  const [index, setIndex] = useState(0);
  const current = steps[index] || steps[0];

  return (
    <div className="rounded-2xl bg-[#050914]/85 border border-[#1E2E48] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-mono-tabular font-bold uppercase"
          style={{ color: accentColor }}
        >
          Step {index + 1} of {steps.length}
          {current.badge ? ` · ${current.badge}` : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <IconButton
            label="Previous step"
            onClick={() => setIndex((i) => (i - 1 + steps.length) % steps.length)}
          >
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Next step"
            onClick={() => setIndex((i) => (i + 1) % steps.length)}
          >
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-display font-bold text-[#F5F8FF]">{current.title}</h3>
        <p className="text-sm text-[#9AA9BD] mt-1 leading-relaxed">{current.body}</p>
      </div>

      <div className="flex items-center gap-1 pt-1">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to step ${i + 1}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => setIndex(i)}
            className="min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-full cursor-pointer hover:bg-white/5"
          >
            <span
              aria-hidden="true"
              className="h-2 rounded-full transition-all block"
              style={{
                width: i === index ? 24 : 8,
                backgroundColor: i === index ? accentColor : '#1E2E48'
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

/* 14. KeyCap */
interface KeyCapProps {
  label: string;
  screenReaderText?: string;
}

export const KeyCap: React.FC<KeyCapProps> = ({ label, screenReaderText }) => (
  <kbd
    aria-label={screenReaderText || label}
    className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg bg-[#050914] border border-[#334155] border-b-2 text-xs font-mono-tabular font-bold text-[#F5F8FF] shadow-sm"
  >
    {label}
  </kbd>
);

/* 15. SearchBox */
interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search'
}) => (
  <div className="relative flex items-center">
    <Search className="w-4 h-4 text-[#9AA9BD] absolute left-3.5 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-[#050914] border border-[#1E2E48] focus:border-[#52C7F5] text-sm text-[#F5F8FF] placeholder:text-[#9AA9BD] focus:outline-none"
    />
    {value && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-2 p-1.5 text-[#9AA9BD] hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);
