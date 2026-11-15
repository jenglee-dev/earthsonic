export interface ShortcutEntry {
  id: string;
  keyLabel: string;
  code: string;
  screenReaderText: string;
  action: string;
  scope: 'Global' | '3D Globe' | 'Chart & Timeline';
}

export const EARTHSONIC_KEYMAP: ShortcutEntry[] = [
  {
    id: 'play-pause',
    keyLabel: 'Space',
    code: 'Space',
    screenReaderText: 'Press Spacebar to play or pause sonification',
    action: 'Play / Pause sonification playback',
    scope: 'Global'
  },
  {
    id: 'mute-toggle',
    keyLabel: 'M',
    code: 'KeyM',
    screenReaderText: 'Press M to mute or unmute audio',
    action: 'Mute / Unmute master audio',
    scope: 'Global'
  },
  {
    id: 'step-next',
    keyLabel: '→',
    code: 'ArrowRight',
    screenReaderText: 'Press Right Arrow to step forward one observation',
    action: 'Next observation (or rotate globe East when globe focused)',
    scope: 'Chart & Timeline'
  },
  {
    id: 'step-prev',
    keyLabel: '←',
    code: 'ArrowLeft',
    screenReaderText: 'Press Left Arrow to step backward one observation',
    action: 'Previous observation (or rotate globe West when globe focused)',
    scope: 'Chart & Timeline'
  },
  {
    id: 'globe-zoom-in',
    keyLabel: '+',
    code: 'Equal',
    screenReaderText: 'Press Plus to zoom in on the globe or chart',
    action: 'Zoom in (Globe when focused, or Chart time range)',
    scope: '3D Globe'
  },
  {
    id: 'globe-zoom-out',
    keyLabel: '-',
    code: 'Minus',
    screenReaderText: 'Press Minus to zoom out on the globe or chart',
    action: 'Zoom out (Globe when focused, or Chart time range)',
    scope: '3D Globe'
  },
  {
    id: 'globe-select',
    keyLabel: 'Enter',
    code: 'Enter',
    screenReaderText: 'Press Enter to select the location under the globe reticle',
    action: 'Select location under center reticle',
    scope: '3D Globe'
  },
  {
    id: 'globe-reset',
    keyLabel: 'Home',
    code: 'Home',
    screenReaderText: 'Press Home to reset globe camera view',
    action: 'Reset globe camera view',
    scope: '3D Globe'
  },
  {
    id: 'describe-sound',
    keyLabel: 'D',
    code: 'KeyD',
    screenReaderText: 'Press D to announce the detailed description of the current sound',
    action: 'Describe current sound (repeats current description without toggling playback)',
    scope: 'Global'
  },
  {
    id: 'replay-tone',
    keyLabel: 'R',
    code: 'KeyR',
    screenReaderText: 'Press R to replay the current observation tone only without speech',
    action: 'Replay current tone only (Guided Listening / Explorer)',
    scope: 'Global'
  },
  {
    id: 'toggle-announcements',
    keyLabel: 'A',
    code: 'KeyA',
    screenReaderText: 'Press A to toggle screen-reader sound announcements on or off',
    action: 'Toggle screen-reader sound announcements on/off',
    scope: 'Global'
  },
  {
    id: 'close-modal',
    keyLabel: 'Esc',
    code: 'Escape',
    screenReaderText: 'Press Escape to close open drawers or popovers',
    action: 'Close open drawer, tour, or provenance popover',
    scope: 'Global'
  }
];
