'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsIOS(ios);

    if (ios && !standalone) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-xl p-4 shadow-xl flex items-start gap-3">
      <Download className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        {isIOS ? (
          <p>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong> to install this app.</p>
        ) : (
          <p>Install <strong>Numero Uno</strong> for quick access from your home screen.</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {!isIOS && (
          <button onClick={install} className="text-xs font-semibold underline">Install</button>
        )}
        <button onClick={dismiss} aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
