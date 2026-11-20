import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  GraduationCap,
  Home,
  KeyRound,
  Music,
  Play,
  Power,
  RotateCcw,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { AIDifficulty, CameraPreset, GameSettings, GameSpeed } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  inActiveMatch: boolean;
  secretModeUnlocked: boolean;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onOpenTutorial: () => void;
  onOpenProfiles?: () => void;
  onOpenSecretPin: () => void;
  onDisableSecretMode: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  inActiveMatch,
  secretModeUnlocked,
  onUpdateSettings,
  onOpenTutorial,
  onOpenProfiles,
  onOpenSecretPin,
  onDisableSecretMode,
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  const [confirmAction, setConfirmAction] = useState<'restart' | 'exit' | null>(
    null,
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="animate-pop-in w-full max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-3xl border-2 border-indigo-400/50 bg-gradient-to-b from-[#1e1b4b] via-[#15173c] to-[#0e1029] shadow-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              id="settings-modal-title"
              className="text-lg sm:text-xl font-black text-white"
            >
              Game Settings
            </h2>
            <p className="text-[11px] font-bold text-amber-300 mt-0.5 uppercase tracking-wide">
              LUDO MOD · POWERED BY AJIT KUMAR
            </p>
          </div>
          <button
            type="button"
            onClick={onResume}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-[#101330] hover:bg-indigo-900/70 border border-indigo-400/35 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toggle Rows */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ musicEnabled: !settings.musicEnabled })
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25 hover:border-indigo-400/50 flex items-center justify-between text-sm font-semibold text-slate-100 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Music size={16} className={settings.musicEnabled ? 'text-amber-300' : 'text-slate-400'} />
              Background Music
            </span>
            <span
              className={`text-xs font-extrabold ${
                settings.musicEnabled ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.musicEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25 hover:border-indigo-400/50 flex items-center justify-between text-sm font-semibold text-slate-100 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              {settings.soundEnabled ? (
                <Volume2 size={16} className="text-amber-400" />
              ) : (
                <VolumeX size={16} className="text-slate-400" />
              )}
              Sound Effects
            </span>
            <span
              className={`text-xs font-extrabold ${
                settings.soundEnabled ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.soundEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25 hover:border-indigo-400/50 flex items-center justify-between text-sm font-semibold text-slate-100 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Smartphone size={16} className="text-sky-400" />
              Android Vibration / Haptics
            </span>
            <span
              className={`text-xs font-extrabold ${
                settings.hapticsEnabled ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.hapticsEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ autoMoveSingle: !settings.autoMoveSingle })
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25 hover:border-indigo-400/50 flex items-center justify-between text-sm font-semibold text-slate-100 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Zap size={16} className="text-amber-400" />
              Auto-Move Single Choice
            </span>
            <span
              className={`text-xs font-extrabold ${
                settings.autoMoveSingle ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.autoMoveSingle ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                threeSixesForfeit: !settings.threeSixesForfeit,
              })
            }
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25 hover:border-indigo-400/50 flex items-center justify-between text-sm font-semibold text-slate-100 cursor-pointer"
          >
            <span>Three 6s Forfeit Rule</span>
            <span
              className={`text-xs font-extrabold ${
                settings.threeSixesForfeit ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.threeSixesForfeit ? 'Classic On' : 'Off'}
            </span>
          </button>
        </div>

        {/* AI Difficulty, Speed & Fixed Board View Selectors */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-indigo-200">
            Computer AI Difficulty
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25">
            {(['easy', 'normal', 'hard'] as AIDifficulty[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => onUpdateSettings({ aiDifficulty: diff })}
                className={`min-h-[36px] rounded-xl text-xs font-extrabold capitalize cursor-pointer ${
                  settings.aiDifficulty === diff
                    ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-indigo-200">
              Animation Speed
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25">
              {(['normal', 'fast'] as GameSpeed[]).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onUpdateSettings({ speed: spd })}
                  className={`min-h-[36px] rounded-xl text-xs font-extrabold capitalize cursor-pointer ${
                    settings.speed === spd
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Camera size={13} />
              Fixed Board View
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25">
              {(['classic', 'top'] as CameraPreset[]).map((cam) => (
                <button
                  key={cam}
                  type="button"
                  onClick={() => onUpdateSettings({ cameraPreset: cam })}
                  className={`min-h-[36px] rounded-xl text-xs font-extrabold capitalize cursor-pointer ${
                    settings.cameraPreset === cam
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {cam === 'classic' ? '3D' : 'Top'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Beginner Tutorial & Player Profiles Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenTutorial}
            className="min-h-[44px] px-3 py-2 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-400/45 flex items-center justify-center gap-1.5 text-xs font-extrabold text-emerald-200 cursor-pointer"
          >
            <GraduationCap size={16} />
            Tutorial &amp; Rules
          </button>
          {onOpenProfiles && (
            <button
              type="button"
              onClick={onOpenProfiles}
              className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#071529] hover:bg-[#0c2140] border border-[#00d4ff]/50 flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#7dd3fc] cursor-pointer"
            >
              <Users size={16} className="text-[#00d4ff]" />
              Player Profiles
            </button>
          )}
        </div>

        {/* Secret Mode PIN Unlock / Active Disable */}
        {!secretModeUnlocked ? (
          <button
            type="button"
            onClick={onOpenSecretPin}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#081617] hover:bg-[#0d2424] border border-emerald-500/40 flex items-center justify-between text-xs sm:text-sm font-extrabold text-emerald-200 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <KeyRound size={16} className="text-emerald-400 shrink-0" />
              Secret Mode
            </span>
            <span className="text-[11px] font-bold text-emerald-400/90">
              PIN Locked
            </span>
          </button>
        ) : (
          <div className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#091f1a] border border-emerald-400/65 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-200">
              <KeyRound size={16} className="text-emerald-400 shrink-0" />
              Secret Hack Mode: ON
            </span>
            <button
              type="button"
              onClick={onDisableSecretMode}
              className="min-h-[34px] px-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-400/50 text-xs font-black text-rose-200 flex items-center gap-1 cursor-pointer"
            >
              <Power size={13} />
              Turn Off
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 active:translate-y-[2px] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#92400e] cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            {inActiveMatch ? 'Resume Match' : 'Back to Home'}
          </button>
          {inActiveMatch && confirmAction === null && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction('restart')}
                className="min-h-[44px] rounded-2xl bg-gradient-to-b from-indigo-700 to-indigo-900 hover:from-indigo-600 hover:to-indigo-800 border border-indigo-400/35 text-slate-100 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={15} />
                Restart
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('exit')}
                className="min-h-[44px] rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 border border-slate-500/35 text-slate-100 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home size={15} />
                Main Menu
              </button>
            </div>
          )}

          {inActiveMatch && confirmAction !== null && (
            <div
              role="alertdialog"
              aria-label={
                confirmAction === 'exit'
                  ? 'Confirm exit match'
                  : 'Confirm restart match'
              }
              className="rounded-2xl border-2 border-rose-400/55 bg-[#221024] p-3 flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-100">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span>
                  {confirmAction === 'exit'
                    ? 'Exit current match and return to Home screen?'
                    : 'Restart the current match from the beginning?'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action === 'exit') {
                      onExitToTitle();
                    } else {
                      onRestart();
                    }
                  }}
                  className="min-h-[44px] rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 border border-rose-300/60 text-white text-xs sm:text-sm font-black cursor-pointer"
                >
                  {confirmAction === 'exit' ? 'Confirm Exit' : 'Confirm Restart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
