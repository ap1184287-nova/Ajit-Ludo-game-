import React from 'react';
import {
  Crown,
  Dices,
  GraduationCap,
  Play,
  ShieldCheck,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
  onStartPractice?: () => void;
}

const STEPS = [
  {
    step: 1,
    title: 'Roll a 6 to Start',
    desc: 'Tap ROLL DICE (or tap the center 3D die). Rolling a 6 lets you bring a token out of your Home Yard and gives you a bonus roll!',
    icon: Dices,
    gradient: 'from-sky-500 to-blue-700',
  },
  {
    step: 2,
    title: 'Tap Glowing Token or MOVE TOKEN',
    desc: 'After rolling, valid tokens glow with a golden ring. Tap any glowing token on the board or simply tap the big MOVE TOKEN button.',
    icon: Sparkles,
    gradient: 'from-amber-400 to-orange-600',
  },
  {
    step: 3,
    title: 'Safe Stars & Captures',
    desc: 'Gold Star tiles and colored Start tiles keep your tokens safe. Land on an opponent on any normal tile to send them back and win a bonus roll!',
    icon: ShieldCheck,
    gradient: 'from-emerald-500 to-teal-700',
  },
  {
    step: 4,
    title: 'Reach Center Crown to Win',
    desc: 'Guide all 4 tokens through your colored Home Path using an exact dice roll to enter the Center Crown and win Gold Coins!',
    icon: Crown,
    gradient: 'from-purple-500 to-indigo-700',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  onClose,
  onStartPractice,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div className="animate-pop-in w-full max-w-[460px] max-h-[90dvh] overflow-y-auto rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1e1b4b] via-[#15173c] to-[#0e1029] shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-lg border border-amber-100/60 shrink-0">
              <GraduationCap size={22} className="text-slate-950" />
            </div>
            <div>
              <h2
                id="tutorial-modal-title"
                className="text-lg sm:text-xl font-black text-white leading-tight"
              >
                How to Play LUDO MOD
              </h2>
              <p className="text-xs font-bold text-amber-300">
                Quick Beginner Guide · POWERED BY AJIT KUMAR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-[#101330] hover:bg-indigo-900/70 border border-indigo-400/35 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 Clear Visual Step Cards */}
        <div className="flex flex-col gap-2.5">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-2xl bg-[#101330] border border-indigo-400/30 p-3 flex items-start gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-b ${item.gradient} flex items-center justify-center shrink-0 shadow-md border border-white/25`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-[11px] font-black text-amber-300">
                      STEP {item.step}
                    </span>
                    <h3 className="text-sm font-extrabold text-white leading-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Practice vs Play CTA */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {onStartPractice && (
            <button
              type="button"
              onClick={onStartPractice}
              className="flex-1 min-h-[48px] rounded-2xl bg-gradient-to-b from-violet-400 to-purple-700 hover:from-violet-300 hover:to-purple-600 active:translate-y-[2px] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#4c1d95] border border-violet-200/40 cursor-pointer"
            >
              <Swords size={16} />
              Try Practice Mode
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 active:translate-y-[2px] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#92400e] border border-amber-100/70 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            Got It, Let&apos;s Play
          </button>
        </div>
      </div>
    </div>
  );
};
