import React from 'react';
import { Eye, EyeOff, Power, Terminal } from 'lucide-react';
import { SecretModeState } from '../game/secretHackMode';

interface SecretNumberPadProps {
  secretMode: SecretModeState;
  onSelectNumber: (value: number) => void;
  onToggleVisible: () => void;
  onTurnOff: () => void;
}

const DICE_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export const SecretNumberPad: React.FC<SecretNumberPadProps> = ({
  secretMode,
  onSelectNumber,
  onToggleVisible,
  onTurnOff,
}) => {
  if (!secretMode.unlocked) return null;

  if (!secretMode.padVisible) {
    return (
      <div className="pointer-events-auto flex items-center justify-center gap-1.5 lg:fixed lg:right-5 lg:bottom-4">
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label="Show Secret Number Pad"
          className="min-h-[42px] px-3.5 py-1.5 rounded-2xl border border-emerald-400/60 bg-gradient-to-b from-[#0a1d19] to-[#050d0c] hover:border-emerald-300 shadow-[0_6px_18px_rgba(16,185,129,0.25)] text-xs font-black text-emerald-200 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Eye size={15} className="text-emerald-400 shrink-0" />
          <span>Show Dice Pad</span>
          {secretMode.queuedDiceValue !== null && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[11px] font-black tabular-nums">
              Next: {secretMode.queuedDiceValue}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onTurnOff}
          aria-label="Turn Off Secret Hack Mode"
          title="Turn Off Secret Hack Mode"
          className="min-w-[42px] min-h-[42px] rounded-2xl border border-rose-500/45 bg-[#180a12] hover:bg-rose-950 text-rose-300 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Power size={15} />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Secret Hack Mode Dice Number Pad"
      className="animate-pop-in pointer-events-auto w-full max-w-[480px] lg:fixed lg:right-5 lg:bottom-4 lg:w-[320px] rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-b from-[#081714] via-[#061013] to-[#04090d] shadow-[0_10px_28px_rgba(0,0,0,0.72),0_0_24px_rgba(16,185,129,0.2)] px-3 py-2 flex flex-col gap-2"
    >
      {/* Compact Header with Status, Hide & OFF Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs font-black tracking-wide text-emerald-300 uppercase whitespace-nowrap">
            Secret Pad
          </span>
          <span className="text-[11px] font-bold text-slate-200 truncate tabular-nums">
            ·{' '}
            {secretMode.queuedDiceValue !== null
              ? `Next: ${secretMode.queuedDiceValue}`
              : 'Random'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleVisible}
            aria-label="Hide Secret Number Pad"
            className="min-h-[34px] px-2.5 rounded-xl bg-[#0d221f] hover:bg-[#13332e] border border-emerald-400/40 text-[11px] font-extrabold text-emerald-100 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <EyeOff size={13} />
            Hide
          </button>
          <button
            type="button"
            onClick={onTurnOff}
            aria-label="Turn Off Secret Hack Mode"
            className="min-h-[34px] px-2.5 rounded-xl bg-[#1d0c15] hover:bg-rose-950 border border-rose-400/45 text-[11px] font-extrabold text-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Power size={12} />
            Off
          </button>
        </div>
      </div>

      {/* Dedicated Tactile Buttons for 1, 2, 3, 4, 5, 6 */}
      <div
        className="grid grid-cols-6 gap-1.5"
        role="group"
        aria-label="Choose next dice result 1 to 6"
      >
        {DICE_NUMBERS.map((num) => {
          const isSelected = secretMode.queuedDiceValue === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onSelectNumber(num)}
              aria-label={`Set next dice roll to ${num}`}
              aria-pressed={isSelected}
              className={`min-h-[46px] rounded-xl border-2 text-base sm:text-lg font-black tabular-nums flex flex-col items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-300 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_3px_0_#065f46,0_0_16px_rgba(16,185,129,0.5)] -translate-y-[1px]'
                  : 'border-emerald-500/35 bg-[#0a161b] hover:bg-[#10262b] hover:border-emerald-400/70 text-emerald-100 active:translate-y-[1px]'
              }`}
            >
              <span>{num}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
