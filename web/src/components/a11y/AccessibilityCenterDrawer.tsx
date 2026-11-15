import React, { useEffect, useState } from 'react';
import { Drawer } from '../ui/Primitives';
import {
  ACCESSIBILITY_PRESETS,
  type AnnouncementVerbosity,
  type ReduceMotionPref,
  type TextSizeScale,
  useAccessibilityStore
} from '../../store/useAccessibilityStore';
import { useEarthSonicStore } from '../../store/useEarthSonicStore';
import { useEffectiveReducedMotion } from '../../hooks/useAccessibilityRuntime';
import { speechService } from '../../services/speechService';
import { RotateCcw, Square, Volume2 } from 'lucide-react';

interface AccessibilityCenterDrawerProps {
  onSpeakCurrentView: () => void;
}

const TEXT_SIZE_OPTIONS: TextSizeScale[] = [100, 125, 150, 175, 200];

const MOTION_OPTIONS: { value: ReduceMotionPref; label: string }[] = [
  { value: 'system', label: 'Follow OS' },
  { value: 'on', label: 'Always Reduce' },
  { value: 'off', label: 'Full Motion' }
];

const VERBOSITY_OPTIONS: { value: AnnouncementVerbosity; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' }
];

export const AccessibilityCenterDrawer: React.FC<AccessibilityCenterDrawerProps> = ({
  onSpeakCurrentView
}) => {
  const open = useAccessibilityStore((s) => s.centerOpen);
  const setOpen = useAccessibilityStore((s) => s.setCenterOpen);
  const prefs = useAccessibilityStore((s) => s.prefs);
  const osReducedMotion = useAccessibilityStore((s) => s.osReducedMotion);
  const activePreset = useAccessibilityStore((s) => s.activePreset);
  const updatePref = useAccessibilityStore((s) => s.updatePref);
  const applyPreset = useAccessibilityStore((s) => s.applyPreset);
  const resetDefaults = useAccessibilityStore((s) => s.resetDefaults);

  const use2DMapFallback = useEarthSonicStore((s) => s.use2DMapFallback);
  const setUse2DMapFallback = useEarthSonicStore((s) => s.setUse2DMapFallback);
  const lowQualityMode = useEarthSonicStore((s) => s.lowQualityMode);
  const setLowQualityMode = useEarthSonicStore((s) => s.setLowQualityMode);
  const setAccessibilityMode = useEarthSonicStore((s) => s.setAccessibilityMode);

  const effectiveReduced = useEffectiveReducedMotion();
  const [speechSupported] = useState(() => speechService.isSupported());
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return speechService.subscribe(setIsSpeaking);
  }, []);

  const ToggleRow: React.FC<{
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onToggle: (next: boolean) => void;
  }> = ({ id, label, description, checked, onToggle }) => (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-[#050914] border border-[#1E2E48] p-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-display font-semibold text-[#F5F8FF] cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-[#A9BAD0] mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className={`min-w-[68px] min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular font-bold shrink-0 cursor-pointer transition-colors ${
          checked
            ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0]'
            : 'bg-[#0A1220] text-[#DCE8F8] border-[#2B3E5E] hover:border-[#52C7F5]'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </button>
    </div>
  );

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Accessibility Center">
      <div className="space-y-5 text-sm">
        <p className="text-xs text-[#A9BAD0] leading-relaxed">
          All settings apply immediately across every EarthSonic route and persist locally on your device.
        </p>

        {/* Presets */}
        <section aria-labelledby="a11y-presets-heading" className="space-y-2">
          <h3 id="a11y-presets-heading" className="text-xs font-mono-tabular uppercase tracking-wider text-[#52C7F5] font-bold">
            Quick Presets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACCESSIBILITY_PRESETS.map((preset) => {
              const selected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    applyPreset(preset.id);
                    setAccessibilityMode(preset.id !== 'default');
                  }}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#52C7F5]/20 border-[#52C7F5] text-[#F5F8FF]'
                      : 'bg-[#050914] border-[#1E2E48] text-[#DCE8F8] hover:border-[#52C7F5]/60'
                  }`}
                >
                  <div className="text-xs font-display font-bold">{preset.label}</div>
                  <div className="text-[11px] text-[#A9BAD0] mt-0.5 leading-snug">{preset.description}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Visual Settings */}
        <section aria-labelledby="a11y-visual-heading" className="space-y-2.5">
          <h3 id="a11y-visual-heading" className="text-xs font-mono-tabular uppercase tracking-wider text-[#52C7F5] font-bold">
            Vision &amp; Typography
          </h3>

          <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-display font-semibold text-[#F5F8FF]">Text Size Scale</span>
              <span className="text-xs font-mono-tabular font-bold text-[#52C7F5]">{prefs.textSize}%</span>
            </div>
            <div role="group" aria-label="Text size scale" className="grid grid-cols-5 gap-1.5">
              {TEXT_SIZE_OPTIONS.map((sz) => {
                const selected = prefs.textSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      updatePref('textSize', sz, `Text size set to ${sz} percent.`);
                      setAccessibilityMode(sz > 100 || prefs.contrast === 'high');
                    }}
                    className={`min-h-[44px] rounded-lg border text-xs font-mono-tabular font-bold cursor-pointer ${
                      selected
                        ? 'bg-[#52C7F5] text-[#050914] border-[#52C7F5]'
                        : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#52C7F5]/60'
                    }`}
                  >
                    {sz}%
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            id="a11y-high-contrast"
            label="High Contrast Theme"
            description="Pure dark background, pure white primary text, and solid high-contrast control borders."
            checked={prefs.contrast === 'high'}
            onToggle={(next) => {
              updatePref('contrast', next ? 'high' : 'default', `High contrast ${next ? 'enabled' : 'disabled'}.`);
              setAccessibilityMode(next || prefs.textSize > 100);
            }}
          />

          <ToggleRow
            id="a11y-colorblind"
            label="Color-Blind Safe Palette"
            description="Okabe-Ito colorblind-safe accents paired with distinct pattern dashes and labels."
            checked={prefs.palette === 'colorblind'}
            onToggle={(next) =>
              updatePref(
                'palette',
                next ? 'colorblind' : 'default',
                `Color-blind safe palette ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />

          <ToggleRow
            id="a11y-readable-font"
            label="Readable Sans Font"
            description="Switches decorative display headings to clean uniform sans-serif letterforms."
            checked={prefs.readableFont}
            onToggle={(next) =>
              updatePref('readableFont', next, `Readable sans font ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <ToggleRow
            id="a11y-text-spacing"
            label="Extra Text Spacing"
            description="Increases line height, letter spacing, and word spacing across labels and prose."
            checked={prefs.textSpacing}
            onToggle={(next) =>
              updatePref('textSpacing', next, `Extra text spacing ${next ? 'enabled' : 'disabled'}.`)
            }
          />
        </section>

        {/* Motion & Interaction */}
        <section aria-labelledby="a11y-motion-heading" className="space-y-2.5">
          <h3 id="a11y-motion-heading" className="text-xs font-mono-tabular uppercase tracking-wider text-[#52C7F5] font-bold">
            Motion &amp; Keyboard Interaction
          </h3>

          <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-display font-semibold text-[#F5F8FF]">Reduce Motion</span>
              <span className="text-[11px] font-mono-tabular text-[#A9BAD0]">
                Active: <strong className="text-[#57D6A0]">{effectiveReduced ? 'REDUCED' : 'FULL'}</strong>
                {prefs.reduceMotion === 'system' ? ` (OS: ${osReducedMotion ? 'Reduce' : 'Normal'})` : ''}
              </span>
            </div>
            <div role="group" aria-label="Reduce motion preference" className="grid grid-cols-3 gap-1.5">
              {MOTION_OPTIONS.map((opt) => {
                const selected = prefs.reduceMotion === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      updatePref('reduceMotion', opt.value, `Motion mode set to ${opt.label}.`)
                    }
                    className={`min-h-[44px] px-2 rounded-lg border text-xs font-mono-tabular font-bold cursor-pointer ${
                      selected
                        ? 'bg-[#52C7F5] text-[#050914] border-[#52C7F5]'
                        : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#52C7F5]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            id="a11y-thick-focus"
            label="Thick Focus Rings"
            description="High-contrast yellow 3.5px focus outlines around every interactive control."
            checked={prefs.thickFocus}
            onToggle={(next) =>
              updatePref('thickFocus', next, `Thick focus outlines ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <ToggleRow
            id="a11y-larger-targets"
            label="Larger Touch & Click Targets"
            description="Enforces at least 48px height/width and enlarged slider handles."
            checked={prefs.largerTargets}
            onToggle={(next) =>
              updatePref('largerTargets', next, `Larger targets ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <ToggleRow
            id="a11y-single-key"
            label="Single-Key Global Shortcuts (Space, M, Arrows)"
            description="Turn OFF if using voice dictation, single-key assistive switches, or to avoid accidental triggers."
            checked={prefs.singleKeyShortcuts}
            onToggle={(next) =>
              updatePref(
                'singleKeyShortcuts',
                next,
                `Single-key global shortcuts ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />
        </section>

        {/* Guided Listening Mode (Sound and Speech Take Turns) */}
        <section aria-labelledby="a11y-guided-heading" className="space-y-2.5">
          <h3 id="a11y-guided-heading" className="text-xs font-mono-tabular uppercase tracking-wider text-[#57D6A0] font-bold">
            Guided Listening (Turn-Taking)
          </h3>

          <ToggleRow
            id="a11y-guided-listening"
            label="Guided listening: sound and speech take turns"
            description="Plays each observation tone alone, ducks audio for one complete description, waits for speech to finish, then pauses briefly before advancing."
            checked={prefs.guidedListening}
            onToggle={(next) =>
              updatePref(
                'guidedListening',
                next,
                `Guided listening ${next ? 'enabled. Sound and speech will take turns.' : 'disabled.'}`
              )
            }
          />

          <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-semibold text-[#F5F8FF]">
                  Listen time per step
                </span>
                <span className="text-[11px] font-mono-tabular text-[#A9BAD0]">
                  {prefs.guidedListenSeconds}s
                </span>
              </div>
              <div role="group" aria-label="Listen time per step" className="grid grid-cols-4 gap-1.5">
                {([2, 3, 5, 8] as const).map((sec) => {
                  const selected = prefs.guidedListenSeconds === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updatePref('guidedListenSeconds', sec, `Listen time set to ${sec} seconds.`)
                      }
                      className={`min-h-[40px] px-2 rounded-lg border text-xs font-mono-tabular font-bold cursor-pointer ${
                        selected
                          ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0]'
                          : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#57D6A0]/60'
                      }`}
                    >
                      {sec}s
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-semibold text-[#F5F8FF]">
                  Announcement wait time
                </span>
                <span className="text-[11px] font-mono-tabular text-[#A9BAD0] capitalize">
                  {prefs.guidedWaitScale}
                </span>
              </div>
              <div role="group" aria-label="Announcement wait time" className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'short', label: 'Short' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'long', label: 'Long' }
                  ] as const
                ).map((opt) => {
                  const selected = prefs.guidedWaitScale === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updatePref('guidedWaitScale', opt.value, `Announcement wait time set to ${opt.label}.`)
                      }
                      className={`min-h-[40px] px-2 rounded-lg border text-xs font-mono-tabular font-bold cursor-pointer ${
                        selected
                          ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0]'
                          : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#57D6A0]/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-display font-semibold text-[#F5F8FF] block">
                Announce frequency
              </span>
              <div role="group" aria-label="Guided listening announce frequency" className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { value: 'every', label: 'Every step' },
                    { value: 'every_5_or_trend', label: 'Every 5th step & trend change' },
                    { value: 'on_request', label: 'Only when I ask (D)' }
                  ] as const
                ).map((opt) => {
                  const selected = prefs.guidedAnnounceFrequency === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updatePref('guidedAnnounceFrequency', opt.value, `Guided announcements set to ${opt.label}.`)
                      }
                      className={`min-h-[40px] px-3 rounded-lg border text-xs font-mono-tabular font-bold text-left cursor-pointer ${
                        selected
                          ? 'bg-[#57D6A0] text-[#050914] border-[#57D6A0]'
                          : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#57D6A0]/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <ToggleRow
            id="a11y-guided-pause-between"
            label="Pause between steps (manual stepping)"
            description="Plays tone then speaks for one observation, then stops and waits for Next, Previous, or Space."
            checked={prefs.guidedPauseBetweenSteps}
            onToggle={(next) =>
              updatePref(
                'guidedPauseBetweenSteps',
                next,
                `Pause between steps ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />

          <ToggleRow
            id="a11y-guided-phase-announcements"
            label="Announce phase changes (Listening / Next observation)"
            description="Briefly announces when Guided Listening switches phases."
            checked={prefs.guidedAnnouncePhaseChanges}
            onToggle={(next) =>
              updatePref(
                'guidedAnnouncePhaseChanges',
                next,
                `Phase change announcements ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />
        </section>

        {/* Audio, Speech & Globe Fallbacks */}
        <section aria-labelledby="a11y-assistive-heading" className="space-y-2.5">
          <h3 id="a11y-assistive-heading" className="text-xs font-mono-tabular uppercase tracking-wider text-[#52C7F5] font-bold">
            Captions, Speech &amp; Globe Fallbacks
          </h3>

          <ToggleRow
            id="a11y-announcements-enabled"
            label="Screen Reader Sound Announcements"
            description="Announces live sonification sound changes (pitch, pulse, filter) to assistive tech. Shortcut: A."
            checked={prefs.announcementsEnabled}
            onToggle={(next) =>
              updatePref('announcementsEnabled', next, `Sound announcements ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <div className="rounded-xl bg-[#050914] border border-[#1E2E48] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-display font-semibold text-[#F5F8FF]">
                Announcement Verbosity
              </span>
              <span className="text-[11px] font-mono-tabular text-[#A9BAD0] capitalize">
                {prefs.announcementVerbosity}
              </span>
            </div>
            <p className="text-xs text-[#A9BAD0]">
              Minimal: data only · Standard: value + sound tone · Detailed: change, baseline context &amp; step.
            </p>
            <div role="group" aria-label="Announcement verbosity level" className="grid grid-cols-3 gap-1.5">
              {VERBOSITY_OPTIONS.map((opt) => {
                const selected = prefs.announcementVerbosity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      updatePref('announcementVerbosity', opt.value, `Announcement verbosity set to ${opt.label}.`)
                    }
                    className={`min-h-[44px] px-2 rounded-lg border text-xs font-mono-tabular font-bold cursor-pointer ${
                      selected
                        ? 'bg-[#52C7F5] text-[#050914] border-[#52C7F5]'
                        : 'bg-[#0A1220] text-[#F5F8FF] border-[#1E2E48] hover:border-[#52C7F5]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            id="a11y-announce-paused-only"
            label="Announce only when sound is paused or on request"
            description="Stops automatic announcements during playback; manual steps and Describe Sound still announce."
            checked={prefs.announceOnlyWhenPausedOrRequested}
            onToggle={(next) =>
              updatePref(
                'announceOnlyWhenPausedOrRequested',
                next,
                `Announce only when paused or requested ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />

          <ToggleRow
            id="a11y-pause-sound-announcing"
            label="Pause sound while announcing"
            description="Temporarily fades master audio volume down during spoken readouts, then restores it afterwards."
            checked={prefs.pauseSoundWhileAnnouncing}
            onToggle={(next) =>
              updatePref(
                'pauseSoundWhileAnnouncing',
                next,
                `Pause sound while announcing ${next ? 'enabled' : 'disabled'}.`
              )
            }
          />

          <ToggleRow
            id="a11y-sound-captions"
            label="Live Sound Captions"
            description="Displays real-time pitch, tempo, and filter text captions in Earth Explorer."
            checked={prefs.soundCaptions}
            onToggle={(next) =>
              updatePref('soundCaptions', next, `Live sound captions ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <ToggleRow
            id="a11y-speech"
            label="Spoken Readouts (Web Speech API)"
            description={
              speechSupported
                ? 'Reads selected globe views and current observation telemetry aloud via browser speech.'
                : 'Browser SpeechSynthesis API is unavailable in this browser environment.'
            }
            checked={prefs.speechEnabled}
            onToggle={(next) =>
              updatePref('speechEnabled', next, `Spoken readouts ${next ? 'enabled' : 'disabled'}.`)
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!speechSupported}
              onClick={onSpeakCurrentView}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#52C7F5] disabled:opacity-45 text-[#050914] font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Speak Current Summary</span>
            </button>
            <button
              type="button"
              onClick={() => speechService.stop()}
              aria-label="Stop speaking"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#050914] border border-[#1E2E48] hover:border-[#52C7F5] text-[#F5F8FF] font-display font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isSpeaking ? 'Stop Speaking (Active)' : 'Stop Speaking'}</span>
            </button>
          </div>

          <ToggleRow
            id="a11y-2d-map"
            label="2D Orthographic Map (Instead of 3D Globe)"
            description="Replaces the WebGL 3D globe with an accessible SVG orthographic map."
            checked={use2DMapFallback}
            onToggle={(next) => {
              setUse2DMapFallback(next);
            }}
          />

          <ToggleRow
            id="a11y-low-quality"
            label="Lower 3D Visual Quality"
            description="Reduces particle count and pixel ratio for calmer rendering and battery savings."
            checked={lowQualityMode}
            onToggle={(next) => {
              setLowQualityMode(next);
            }}
          />
        </section>

        <div className="pt-2 border-t border-[#1E2E48] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              resetDefaults();
              setAccessibilityMode(false);
              setUse2DMapFallback(false);
              setLowQualityMode(false);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#050914] border border-amber-400/60 hover:bg-amber-400/15 text-amber-200 font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset to defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#101C2D] border border-[#1E2E48] hover:border-[#52C7F5] text-[#F5F8FF] font-display font-semibold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Drawer>
  );
};
