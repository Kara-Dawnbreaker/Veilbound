import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(isStandaloneMode);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const media = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneMode());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    media.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      media.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome;
  };

  const canInstallNatively = Boolean(deferredPrompt) && !isInstalled;
  const showIosGuide = isIos && !isInstalled && !deferredPrompt;

  return {
    isInstalled,
    canInstallNatively,
    showIosGuide,
    promptInstall,
  };
}

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const { isInstalled, canInstallNatively, showIosGuide, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled || (!canInstallNatively && !showIosGuide)) {
    return null;
  }

  const handleClick = async () => {
    if (canInstallNatively) {
      await promptInstall();
      return;
    }
    if (showIosGuide) {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 bg-[#151821] hover:bg-[#1E2330] border border-[#C89B3C]/50 hover:border-[#C89B3C] text-[#EAE6DA] text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer touch-manipulation ${className}`}
      >
        <Download className="w-4 h-4 text-[#C89B3C] shrink-0" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-guide-title"
        >
          <div className="w-full max-w-md bg-[#12141B] border border-[#C89B3C]/50 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#252A36] pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#C89B3C]">
                  Offline Installation
                </p>
                <h2
                  id="pwa-ios-guide-title"
                  className="mt-1 font-serif text-xl font-bold text-[#EAE6DA]"
                >
                  Add Veilbound to Home Screen
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close installation instructions"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-[#2A303E] bg-[#181B24] text-[#9AA0A6] hover:text-[#EAE6DA] hover:border-[#C89B3C]/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-sm text-[#C9C3B4]">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[#C89B3C]/40 bg-[#1B1E28] text-xs font-bold text-[#C89B3C] tabular-nums">
                  1
                </span>
                <span>
                  Tap the <strong className="text-[#EAE6DA]">Share</strong> button{' '}
                  <Share className="inline w-3.5 h-3.5 text-[#C89B3C] mx-0.5 -mt-0.5" /> in your
                  Safari toolbar.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[#C89B3C]/40 bg-[#1B1E28] text-xs font-bold text-[#C89B3C] tabular-nums">
                  2
                </span>
                <span>
                  Scroll down and tap{' '}
                  <strong className="text-[#EAE6DA]">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[#C89B3C]/40 bg-[#1B1E28] text-xs font-bold text-[#C89B3C] tabular-nums">
                  3
                </span>
                <span>
                  Confirm <strong className="text-[#EAE6DA]">Add</strong> to launch Veilbound:
                  Ashen Crown offline in full-screen standalone mode.
                </span>
              </li>
            </ol>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[44px] px-5 py-2.5 bg-[#C89B3C] hover:bg-[#D7AA4B] text-[#0B0C10] text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
