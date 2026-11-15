/**
 * Safe Web Speech API (speechSynthesis) service with:
 * - Capability detection & graceful fallback when unavailable
 * - Asynchronous `voiceschanged` handling with English voice selection
 * - Automatic cancellation before new utterances and on route change
 */

type SpeechStateListener = (speaking: boolean) => void;

class EarthSonicSpeechService {
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private listeners = new Set<SpeechStateListener>();
  private speaking = false;
  private initialized = false;
  private pendingResolve: ((completed: boolean) => void) | null = null;
  private pendingFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  private settlePending(completed: boolean): void {
    if (this.pendingFallbackTimer !== null) {
      clearTimeout(this.pendingFallbackTimer);
      this.pendingFallbackTimer = null;
    }
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    if (resolve) resolve(completed);
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    );
  }

  public init(): void {
    if (this.initialized || !this.isSupported()) return;
    this.initialized = true;
    this.refreshVoices();
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', this.refreshVoices);
    } catch {
      // Some older implementations use onvoiceschanged property only
    }
  }

  private refreshVoices = (): void => {
    if (!this.isSupported()) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (Array.isArray(voices) && voices.length > 0) {
        this.cachedVoices = voices;
      }
    } catch {
      // Ignore browser speech synthesis failures
    }
  };

  private setSpeaking(next: boolean): void {
    this.speaking = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public subscribe(listener: SpeechStateListener): () => void {
    this.listeners.add(listener);
    listener(this.speaking);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPreferredVoice(): SpeechSynthesisVoice | null {
    this.init();
    const voices =
      this.cachedVoices.length > 0
        ? this.cachedVoices
        : this.isSupported()
        ? window.speechSynthesis.getVoices()
        : [];
    if (!voices || voices.length === 0) return null;
    const localEn = voices.find((v) => v.lang.toLowerCase().startsWith('en') && v.localService);
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return localEn || anyEn || voices[0] || null;
  }

  public speak(text: string, options: { rate?: number; interrupt?: boolean } = {}): boolean {
    const clean = text.trim();
    if (!clean || !this.isSupported()) return false;
    this.init();

    const { rate = 1.0, interrupt = true } = options;
    try {
      if (interrupt) {
        this.settlePending(false);
        window.speechSynthesis.cancel();
      }
      const utterance = new window.SpeechSynthesisUtterance(clean);
      const voice = this.getPreferredVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = Math.max(0.7, Math.min(1.6, rate));
      utterance.onstart = () => this.setSpeaking(true);
      utterance.onend = () => {
        this.setSpeaking(false);
        this.settlePending(true);
      };
      utterance.onerror = () => {
        this.setSpeaking(false);
        this.settlePending(false);
      };
      window.speechSynthesis.speak(utterance);
      this.setSpeaking(true);
      return true;
    } catch {
      this.setSpeaking(false);
      this.settlePending(false);
      return false;
    }
  }

  /**
   * Speaks `text` via Web Speech API and resolves when `onend` (or `onerror`) fires,
   * cancelling any prior utterance first. Returns `false` if unsupported or cancelled.
   */
  public speakAsync(
    text: string,
    options: { rate?: number; interrupt?: boolean; fallbackTimeoutMs?: number } = {}
  ): Promise<boolean> {
    const clean = text.trim();
    if (!clean || !this.isSupported()) return Promise.resolve(false);
    this.init();

    const { rate = 1.0, interrupt = true, fallbackTimeoutMs = 20_000 } = options;
    if (interrupt) {
      this.settlePending(false);
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser errors
      }
    }

    return new Promise<boolean>((resolve) => {
      try {
        const utterance = new window.SpeechSynthesisUtterance(clean);
        const voice = this.getPreferredVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || 'en-US';
        utterance.rate = Math.max(0.7, Math.min(1.6, rate));

        this.pendingResolve = resolve;
        this.pendingFallbackTimer = setTimeout(() => {
          this.setSpeaking(false);
          this.settlePending(true);
        }, Math.max(2500, fallbackTimeoutMs));

        utterance.onstart = () => this.setSpeaking(true);
        utterance.onend = () => {
          this.setSpeaking(false);
          this.settlePending(true);
        };
        utterance.onerror = () => {
          this.setSpeaking(false);
          this.settlePending(false);
        };

        window.speechSynthesis.speak(utterance);
        this.setSpeaking(true);
      } catch {
        this.setSpeaking(false);
        this.settlePending(false);
      }
    });
  }

  public stop(): void {
    this.settlePending(false);
    if (!this.isSupported()) {
      if (this.speaking) this.setSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore browser errors
    }
    this.setSpeaking(false);
  }
}

export const speechService = new EarthSonicSpeechService();
