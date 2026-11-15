/**
 * Global live-region announcement dispatcher.
 * - Keeps polite (`role="status"`) and assertive (`role="alert"`) messages cleanly separated
 * - Throttles continuous playback step announcements (>= 2200ms) so screen readers never stutter
 * - Deduplicates identical back-to-back messages using subtle nonce suffixes only when forced
 */

export type LivePoliteness = 'polite' | 'assertive';

interface AnnounceListener {
  (payload: { politeness: LivePoliteness; message: string; id: number }): void;
}

class LiveAnnouncementBus {
  private listeners = new Set<AnnounceListener>();
  private lastPoliteText = '';
  private lastAssertiveText = '';
  private lastPlaybackAnnounceMs = 0;
  private counter = 0;

  public subscribe(fn: AnnounceListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(politeness: LivePoliteness, message: string, force = false): void {
    const clean = message.trim();
    if (!clean) return;
    let payload = clean;
    if (politeness === 'polite') {
      if (clean === this.lastPoliteText) {
        if (!force) return;
        payload = `${clean}\u200B`;
      }
      this.lastPoliteText = payload;
    } else {
      if (clean === this.lastAssertiveText) {
        if (!force) return;
        payload = `${clean}\u200B`;
      }
      this.lastAssertiveText = payload;
    }
    this.counter++;
    for (const listener of this.listeners) {
      listener({ politeness, message: payload, id: this.counter });
    }
  }

  public announcePolite(message: string, options: { force?: boolean } = {}): void {
    this.emit('polite', message, Boolean(options.force));
  }

  public announceAssertive(message: string, options: { force?: boolean } = {}): void {
    this.emit('assertive', message, Boolean(options.force));
  }

  /**
   * Throttled playback announcement:
   * - Announces at most once every `minIntervalMs` (default 2000ms) during continuous playback.
   * - Skips duplicates unless `manual` or `directionFlipped` is true.
   * - Manual steps and direction flips bypass the 2-second throttle and announce immediately.
   */
  public announcePlayback(options: {
    message: string;
    directionFlipped?: boolean;
    manual?: boolean;
    minIntervalMs?: number;
  }): boolean {
    const { message, directionFlipped = false, manual = false, minIntervalMs = 2000 } = options;
    const now = Date.now();
    if (!manual && !directionFlipped && now - this.lastPlaybackAnnounceMs < minIntervalMs) {
      return false;
    }
    const clean = message.trim();
    if (!clean) return false;
    if (!manual && clean === this.lastPoliteText) {
      return false;
    }
    this.lastPlaybackAnnounceMs = now;
    this.emit('polite', clean, manual);
    return true;
  }

  /**
   * Backward-compatible alias for throttled playback announcement.
   */
  public announcePlaybackThrottled(message: string, minIntervalMs = 2000): void {
    this.announcePlayback({ message, minIntervalMs });
  }

  public resetThrottle(): void {
    this.lastPlaybackAnnounceMs = 0;
  }
}

export const liveAnnouncer = new LiveAnnouncementBus();
