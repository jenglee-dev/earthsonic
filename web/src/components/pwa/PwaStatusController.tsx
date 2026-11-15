import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const IOS_HINT_DISMISSED_KEY = 'earthsonic_ios_install_hint_dismissed_v1';

export const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const dismissed = localStorage.getItem(IOS_HINT_DISMISSED_KEY) === 'true';
    if (isIos && isSafari && !dismissed) {
      setShowIosHint(true);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const dismissIosHint = () => {
    localStorage.setItem(IOS_HINT_DISMISSED_KEY, 'true');
    setShowIosHint(false);
  };

  if (isInstalled) return null;

  return (
    <>
      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-2 rounded-xl text-xs font-mono-tabular font-semibold bg-[#52C7F5]/15 hover:bg-[#52C7F5]/25 text-[#52C7F5] border border-[#52C7F5]/50 flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#52C7F5]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install EarthSonic</span>
        </button>
      )}

      {showIosHint && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-4 z-50 max-w-xs rounded-2xl bg-[#101C2D] border border-[#52C7F5]/50 shadow-2xl p-3 text-xs text-[#F5F8FF] flex items-start gap-2.5"
        >
          <Share className="w-4 h-4 text-[#52C7F5] shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block text-[#52C7F5]">Install on iOS</strong>
            <span>Tap Share, then Add to Home Screen.</span>
          </div>
          <button
            type="button"
            onClick={dismissIosHint}
            aria-label="Dismiss iOS install hint"
            className="text-[#9AA9BD] hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};

export const OfflineAndUpdateBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [swWaitingReg, setSwWaitingReg] = useState<ServiceWorkerRegistration | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service worker registration & periodic update check (production builds only)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) {
          setSwWaitingReg(reg);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setSwWaitingReg(reg);
              setUpdateDismissed(false);
            }
          });
        });

        // Check for updates every 3 hours
        intervalId = setInterval(() => {
          reg.update().catch(() => {});
        }, 3 * 60 * 60 * 1000);
      })
      .catch(() => {
        // Ignore SW registration errors in restricted contexts
      });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleReloadForUpdate = () => {
    if (swWaitingReg?.waiting) {
      swWaitingReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  return (
    <>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-1.5 text-xs font-mono-tabular text-amber-200 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>
            You’re offline — Web Audio synthesis and Hear the Change remain active using saved device data or local demonstration data.
          </span>
        </div>
      )}

      {swWaitingReg && !updateDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 z-50 rounded-2xl bg-[#101C2D] border border-[#52C7F5] shadow-2xl p-4 text-xs text-[#F5F8FF] flex items-center gap-3"
        >
          <RefreshCw className="w-4 h-4 text-[#52C7F5] shrink-0" />
          <span>A new version is ready. Reload to update.</span>
          <button
            type="button"
            onClick={handleReloadForUpdate}
            className="px-3 py-1.5 rounded-lg bg-[#52C7F5] text-[#050914] font-bold cursor-pointer"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => setUpdateDismissed(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-[#9AA9BD] hover:text-white cursor-pointer"
          >
            Later
          </button>
        </div>
      )}
    </>
  );
};
