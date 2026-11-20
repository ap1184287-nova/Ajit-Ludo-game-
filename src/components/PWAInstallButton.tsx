import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Native Chromium / Android install flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install LUDO MOD App"
        title="Install LUDO MOD PWA"
        className={
          variant === 'full'
            ? 'min-h-[44px] w-full px-3.5 py-2 rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 border border-cyan-200/60 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[0_4px_0_#1e3a8a] cursor-pointer transition-all'
            : 'min-h-[44px] px-2.5 sm:px-3 rounded-2xl border border-cyan-400/60 bg-gradient-to-b from-[#082032] to-[#061322] hover:border-cyan-300 text-cyan-200 text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors'
        }
      >
        <Download size={15} className="shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari guided install prompt + fallback manual install tip in Settings/full mode
  if (isIOS || variant === 'full') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          aria-label="How to Install LUDO MOD as an App"
          className={
            variant === 'full'
              ? 'min-h-[44px] w-full px-3.5 py-2 rounded-2xl bg-[#09182c] hover:bg-[#0f2645] border border-cyan-400/45 text-cyan-200 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors'
              : 'min-h-[44px] px-2.5 rounded-2xl border border-cyan-400/50 bg-[#082032] text-cyan-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer'
          }
        >
          <Smartphone size={15} className="shrink-0" />
          <span>{isIOS ? 'Install on iOS' : 'Add to Home Screen'}</span>
        </button>

        {showGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install LUDO MOD PWA Guide"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 safe-top safe-bottom safe-x"
          >
            <div className="animate-pop-in w-full max-w-sm rounded-3xl border-2 border-cyan-400/55 bg-[#0b1224] p-5 shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Smartphone size={18} className="text-cyan-400" />
                  Install LUDO MOD App
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install guide"
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              {isIOS ? (
                <ol className="text-xs sm:text-sm text-slate-200 space-y-2 list-decimal pl-4">
                  <li>
                    Tap the <strong>Share</strong> icon in the Safari toolbar.
                  </li>
                  <li>
                    Scroll down and select{' '}
                    <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> to launch LUDO MOD fullscreen offline!
                  </li>
                </ol>
              ) : (
                <ol className="text-xs sm:text-sm text-slate-200 space-y-2 list-decimal pl-4">
                  <li>
                    Open your browser menu (<strong>⋮</strong> in Chrome/Edge).
                  </li>
                  <li>
                    Tap <strong>Install app</strong> or{' '}
                    <strong>Add to Home screen</strong>.
                  </li>
                  <li>
                    Enjoy instant fullscreen offline gameplay anytime!
                  </li>
                </ol>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] w-full rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-600 text-slate-950 font-black text-sm cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-3 left-3 z-40 px-3 py-1.5 rounded-2xl border border-amber-400/60 bg-[#1a1406] text-amber-200 text-xs font-extrabold shadow-lg flex items-center gap-1.5 pointer-events-none"
    >
      <WifiOff size={13} className="text-amber-400 shrink-0" />
      <span>Offline Mode · Ready to Play</span>
    </div>
  );
};
