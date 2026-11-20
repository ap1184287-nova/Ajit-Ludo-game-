import React from 'react';
import { Check, Gift, Sparkles, X } from 'lucide-react';
import {
  DAILY_REWARD_SCHEDULE,
  canClaimDailyReward,
  getNextDailyRewardAmount,
} from '../game/progression';
import { PlayerProgression } from '../game/types';

interface RewardsModalProps {
  progression: PlayerProgression;
  lastClaimedAmount: number | null;
  onClaimDaily: () => void;
  onBonusRefill: () => void;
  onClose: () => void;
}

export const CoinSvg: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="7" fill="#d97706" stroke="#fde047" strokeWidth="1.2" />
    <path
      d="M12 7.5V16.5M9.5 10.5C9.5 9.4 10.6 8.8 12 8.8C13.4 8.8 14.5 9.4 14.5 10.5C14.5 12.2 9.5 11.8 9.5 13.5C9.5 14.6 10.6 15.2 12 15.2C13.4 15.2 14.5 14.6 14.5 13.5"
      stroke="#fef9c3"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const RewardsModal: React.FC<RewardsModalProps> = ({
  progression,
  lastClaimedAmount,
  onClaimDaily,
  onBonusRefill,
  onClose,
}) => {
  const claimable = canClaimDailyReward(progression);
  const nextAmount = getNextDailyRewardAmount(progression);
  const currentCycleDay = progression.dailyStreak % DAILY_REWARD_SCHEDULE.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewards-modal-title"
    >
      <div className="animate-pop-in w-full max-w-[440px] rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1a1840] to-[#0e1029] shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg border border-amber-200/50">
              <Gift size={22} className="text-slate-950" />
            </div>
            <div>
              <h2
                id="rewards-modal-title"
                className="text-xl font-extrabold text-white leading-tight"
              >
                Coins &amp; Daily Rewards
              </h2>
              <p className="text-xs text-amber-300 font-semibold">
                Streak: <span className="tabular-nums">{progression.dailyStreak}</span> Days · Balance:{' '}
                <span className="tabular-nums">{progression.coins.toLocaleString()}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rewards modal"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer border border-slate-600/60"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs font-semibold text-indigo-100 bg-[#101330] border border-indigo-400/25 rounded-xl px-3 py-1.5 text-center">
          Collect free Gold Coins every day to unlock higher-stake matches!
        </p>

        {/* 7-Day Reward Calendar */}
        <div className="grid grid-cols-4 gap-2">
          {DAILY_REWARD_SCHEDULE.map((amt, idx) => {
            const isPast = idx < currentCycleDay && (claimable || idx < currentCycleDay);
            const isTodayTarget = claimable && idx === currentCycleDay;
            const isSeventh = idx === 6;

            return (
              <div
                key={idx}
                className={`${
                  isSeventh ? 'col-span-2' : ''
                } rounded-2xl p-2.5 border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                  isTodayTarget
                    ? 'bg-gradient-to-b from-amber-500/30 to-amber-700/30 border-amber-400 shadow-md'
                    : isPast
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                  Day {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  {isPast ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <CoinSvg size={18} />
                  )}
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    +{amt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {lastClaimedAmount !== null && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/60 px-3 py-2 text-center text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-amber-300" />
            Claimed +{lastClaimedAmount.toLocaleString()} Gold Coins!
          </div>
        )}

        {/* Primary Action */}
        {claimable ? (
          <button
            type="button"
            onClick={onClaimDaily}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:translate-y-[2px] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-[0_5px_0_#92400e] border border-amber-200/70 transition-all cursor-pointer"
          >
            <CoinSvg size={22} />
            Claim +{nextAmount.toLocaleString()} Coins
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="rounded-xl bg-slate-900/90 border border-slate-700/70 py-2.5 px-3 text-center text-xs text-slate-300 font-medium">
              Today&apos;s Daily Treasure claimed! Come back tomorrow for more.
            </div>
            {progression.coins < 500 && (
              <button
                type="button"
                onClick={onBonusRefill}
                className="w-full min-h-[46px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:translate-y-[2px] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#065f46] cursor-pointer"
              >
                <CoinSvg size={18} />
                Free Refill +500 Coins
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-center text-amber-300/80 font-semibold">
          LUDO MOD · POWERED BY AJIT KUMAR
        </p>
      </div>
    </div>
  );
};
