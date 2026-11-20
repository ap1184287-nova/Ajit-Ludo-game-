import React, { useState } from 'react';
import {
  AlertTriangle,
  Delete,
  KeyRound,
  Lock,
  ShieldAlert,
  Unlock,
  X,
} from 'lucide-react';

interface SecretPinModalProps {
  onUnlockAttempt: (pin: string) => { ok: boolean; error?: string };
  onClose: () => void;
}

const KEYPAD_ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['CLEAR', '0', 'BACK'],
];

export const SecretPinModal: React.FC<SecretPinModalProps> = ({
  onUnlockAttempt,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const appendDigit = (digit: string) => {
    setError(null);
    setPin((prev) => (prev.length < 4 ? `${prev}${digit}` : prev));
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onUnlockAttempt(pin);
    if (!res.ok) {
      setError(res.error ?? 'Incorrect PIN. Secret Hack Mode stays locked.');
      setPin('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-pin-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-pop-in w-full max-w-[380px] rounded-3xl border-2 border-emerald-400/60 bg-gradient-to-b from-[#071411] via-[#060c12] to-[#04070b] shadow-[0_0_45px_rgba(16,185,129,0.24)] p-4 sm:p-5 flex flex-col gap-3.5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/60 flex items-center justify-center shrink-0">
              <KeyRound size={19} className="text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2
                id="secret-pin-modal-title"
                className="text-base sm:text-lg font-black tracking-wide text-white truncate"
              >
                SECRET <span className="text-emerald-400">HACK MODE</span>
              </h2>
              <p className="text-[11px] font-semibold text-emerald-200/80 flex items-center gap-1 truncate">
                <Lock size={11} className="text-emerald-400 shrink-0" />
                <span>Enter 4-Digit Security PIN</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Secret Mode PIN screen"
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-[#0b1918] hover:bg-[#122b29] border border-emerald-400/35 text-emerald-100 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X size={19} />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/65 bg-rose-950/60 px-3 py-2 flex items-center gap-2 text-xs font-bold text-rose-100"
          >
            <AlertTriangle size={15} className="text-rose-300 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Slot Visual PIN Indicator + Direct Keyboard Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="secret-pin-input"
            className="text-xs font-bold text-emerald-200 flex items-center justify-between"
          >
            <span>Access Code</span>
            <span className="text-[11px] font-mono text-emerald-400/85">
              LUDO MOD ONLY
            </span>
          </label>

          <div className="grid grid-cols-4 gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((slotIdx) => {
              const filled = slotIdx < pin.length;
              const active = slotIdx === pin.length;
              return (
                <div
                  key={slotIdx}
                  className={`h-12 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                    filled
                      ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.28)]'
                      : active
                        ? 'border-emerald-400/65 bg-[#071110] text-slate-500'
                        : 'border-emerald-500/25 bg-[#050b0c] text-slate-600'
                  }`}
                >
                  {filled ? '•' : ''}
                </div>
              );
            })}
          </div>

          <input
            id="secret-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setError(null);
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            }}
            placeholder="Type 4-digit PIN"
            aria-label="Enter 4-digit Secret Mode PIN"
            className="min-h-[42px] px-3.5 rounded-xl bg-[#050b0c] border border-emerald-500/35 focus:border-emerald-400 focus:outline-none text-sm font-mono tracking-[0.35em] text-center text-white placeholder:tracking-normal placeholder:text-slate-500"
          />
        </div>

        {/* Touch Keypad for Android & Desktop */}
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Secret PIN numeric keypad"
        >
          {KEYPAD_ROWS.flat().map((key) => {
            if (key === 'CLEAR') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear PIN"
                  className="min-h-[46px] rounded-2xl bg-[#0b1518] hover:bg-[#132429] border border-slate-700 text-xs font-extrabold text-slate-200 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              );
            }
            if (key === 'BACK') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace digit"
                  className="min-h-[46px] rounded-2xl bg-[#0b1518] hover:bg-[#132429] border border-slate-700 text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Delete size={17} />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => appendDigit(key)}
                className="min-h-[46px] rounded-2xl bg-[#0c1c1a] hover:bg-[#14302c] active:translate-y-[1px] border border-emerald-500/35 text-lg font-black text-white tabular-nums cursor-pointer transition-all"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Submit / Cancel Footer */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] rounded-2xl bg-[#0b1318] hover:bg-[#132028] border border-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[46px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:translate-y-[1px] text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_0_#065f46] cursor-pointer"
          >
            <Unlock size={16} />
            Unlock
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
          <ShieldAlert size={12} className="text-emerald-400/80 shrink-0" />
          <span>Affects only your LUDO MOD session</span>
        </p>
      </form>
    </div>
  );
};
