import React, { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  Crown,
  Gift,
  GraduationCap,
  HelpCircle,
  Music,
  Play,
  Settings,
  SlidersHorizontal,
  Swords,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { COLOR_HEX, COLOR_LABELS } from '../game/boardCoords';
import { canClaimDailyReward, DEFAULT_COLOR_AVATAR } from '../game/progression';
import {
  AIDifficulty,
  PlayerCount,
  PlayerProgression,
  PlayerSeatSetup,
} from '../game/types';
import { PlayerAvatar } from './PlayerAvatar';
import { PWAInstallButton } from './PWAInstallButton';
import { CoinSvg } from './RewardsModal';

export type QuickModePreset = 'vs-ai' | 'pass-play' | 'duel-2p' | 'practice';

interface TitleOverlayProps {
  playerCount: PlayerCount;
  seats: PlayerSeatSetup[];
  aiDifficulty: AIDifficulty;
  entryFee: number;
  isPracticeMode: boolean;
  progression: PlayerProgression;
  soundEnabled: boolean;
  musicEnabled: boolean;
  activeProfileCount: number;
  squadCount: number;
  primaryProfile?: { name: string; playerId: string; avatarId: PlayerProgression['playerAvatar']; matchesWon: number } | null;
  onSelectPlayerCount: (count: PlayerCount) => void;
  onSelectQuickMode: (mode: QuickModePreset) => void;
  onToggleSeatControl: (index: number) => void;
  onCycleSeatAvatar: (index: number) => void;
  onOpenProfiles: () => void;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onSelectEntryFee: (fee: number) => void;
  onOpenRewards: () => void;
  onOpenTutorial: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onOpenSettings: () => void;
  onStartMatch: () => void;
  onStartPractice: () => void;
}

const STAKE_OPTIONS = [0, 100, 250, 500];

const AI_LABEL: Record<AIDifficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  playerCount,
  seats,
  aiDifficulty,
  entryFee,
  isPracticeMode,
  progression,
  soundEnabled,
  musicEnabled,
  activeProfileCount,
  squadCount,
  primaryProfile = null,
  onSelectPlayerCount,
  onSelectQuickMode,
  onToggleSeatControl,
  onCycleSeatAvatar,
  onOpenProfiles,
  onSelectDifficulty,
  onSelectEntryFee,
  onOpenRewards,
  onOpenTutorial,
  onToggleSound,
  onToggleMusic,
  onOpenSettings,
  onStartMatch,
  onStartPractice,
}) => {
  const [view, setView] = useState<'home' | 'modes'>('home');
  const hasAI = seats.some((s) => s.control === 'ai');
  const dailyAvailable = canClaimDailyReward(progression);
  const prizePool = entryFee * playerCount;
  const activePreset: QuickModePreset = isPracticeMode
    ? 'practice'
    : !hasAI
      ? 'pass-play'
      : playerCount === 2
        ? 'duel-2p'
        : 'vs-ai';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 lg:p-8 safe-top safe-bottom safe-x">
      {/* Top Play Store Profile, Coins, PWA Install & Audio Utility Strip */}
      <header className="pointer-events-auto w-full flex items-center justify-between gap-2">
        {/* Player Profile System Trigger */}
        <button
          type="button"
          onClick={onOpenProfiles}
          aria-label="Open Ludo Player System profiles dashboard"
          title="LUDO PLAYER SYSTEM · Manage Profiles"
          className="min-h-[46px] pl-1.5 pr-3 py-1 rounded-2xl border border-[#00d4ff]/55 bg-gradient-to-b from-[#0a1326] to-[#050814] shadow-[0_0_20px_rgba(0,212,255,0.16)] flex items-center gap-2 cursor-pointer hover:border-[#00d4ff] transition-colors"
        >
          <PlayerAvatar
            avatarId={primaryProfile?.avatarId ?? progression.playerAvatar}
            neutralElectricBlue
            size={36}
          />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[105px] sm:max-w-[155px]">
              {primaryProfile ? primaryProfile.name : 'Player Profiles'}
            </span>
            <span className="text-[11px] font-mono font-bold text-[#00d4ff] tabular-nums whitespace-nowrap">
              {primaryProfile
                ? primaryProfile.playerId
                : `${activeProfileCount} Saved`}
            </span>
          </div>
        </button>

        {/* Right: PWA Install + Coins Wallet + How to Play + Music/Settings */}
        <div className="flex items-center gap-1.5">
          <PWAInstallButton variant="compact" />

          <button
            type="button"
            onClick={onOpenRewards}
            aria-label={`Coins balance ${progression.coins}. Tap for Daily Rewards`}
            className="min-h-[44px] px-2.5 sm:px-3 py-1 rounded-2xl border border-amber-400/60 bg-gradient-to-b from-[#2b1f4d] to-[#171235] shadow-xl flex items-center gap-1.5 cursor-pointer hover:border-amber-300 transition-colors"
          >
            <CoinSvg size={20} />
            <span className="text-xs sm:text-sm font-extrabold text-amber-200 tabular-nums">
              {progression.coins.toLocaleString()}
            </span>
            {dailyAvailable ? (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-lg bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 text-[11px] font-black uppercase tracking-tight">
                Claim
              </span>
            ) : (
              <Gift size={14} className="text-amber-300 ml-0.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenTutorial}
            aria-label="How to play beginner tutorial"
            title="How to Play"
            className="min-w-[44px] h-[44px] px-2 sm:px-3 rounded-2xl border border-emerald-400/50 bg-[#14233f] text-emerald-300 hover:bg-[#1b2e52] shadow-lg flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer transition-colors"
          >
            <HelpCircle size={17} />
            <span className="hidden md:inline">Tutorial</span>
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={musicEnabled ? 'Mute background music' : 'Enable background music'}
            title={musicEnabled ? 'Music On' : 'Music Off'}
            className={`hidden sm:flex min-w-[44px] h-[44px] rounded-2xl border shadow-lg items-center justify-center cursor-pointer transition-colors ${
              musicEnabled
                ? 'border-indigo-400/50 bg-[#181b3e] text-amber-300 hover:bg-[#232756]'
                : 'border-slate-700 bg-[#10142c] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music size={17} />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            title={soundEnabled ? 'SFX On' : 'SFX Off'}
            className="hidden md:flex min-w-[44px] h-[44px] rounded-2xl border border-indigo-400/40 bg-[#181b3e] text-slate-100 hover:bg-[#232756] shadow-lg items-center justify-center cursor-pointer transition-colors"
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open game settings"
            title="Game Settings"
            className="min-w-[44px] h-[44px] rounded-2xl border border-indigo-400/40 bg-[#181b3e] text-slate-100 hover:bg-[#232756] shadow-lg flex items-center justify-center cursor-pointer transition-colors"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* Main Home / Mode Selection Card */}
      <div className="w-full flex justify-center lg:justify-start lg:my-auto">
        {view === 'home' ? (
          <section
            className="animate-pop-in pointer-events-auto w-full max-w-[448px] max-h-[82dvh] overflow-y-auto rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-[#1e1b4b] via-[#15173c] to-[#0d102a] shadow-[0_20px_50px_rgba(0,0,0,0.72)] p-3.5 sm:p-5 flex flex-col gap-2.5"
            aria-label="LUDO MOD Home Screen"
          >
            {/* Bespoke LUDO MOD Royal Crest Lockup */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 56 56"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <rect
                    x="2"
                    y="2"
                    width="52"
                    height="52"
                    rx="14"
                    fill="#131636"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                  />
                  <rect x="8" y="8" width="18" height="18" rx="5" fill="#ef4444" />
                  <rect x="30" y="8" width="18" height="18" rx="5" fill="#10b981" />
                  <rect x="8" y="30" width="18" height="18" rx="5" fill="#3b82f6" />
                  <rect x="30" y="30" width="18" height="18" rx="5" fill="#f59e0b" />
                  <polygon
                    points="28,15 41,28 28,41 15,28"
                    fill="#131636"
                    stroke="#fde047"
                    strokeWidth="2.4"
                  />
                  <path
                    d="M22 31L24 23L28 26.5L32 23L34 31H22Z"
                    fill="#fbbf24"
                  />
                </svg>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                    LUDO <span className="text-amber-400">MOD</span>
                  </h1>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-orange-500/20 border border-amber-400/45 whitespace-nowrap">
                    <Crown size={11} className="text-amber-300 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wide text-amber-200 uppercase">
                      POWERED BY AJIT KUMAR
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTutorial}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-400/40 text-[11px] sm:text-xs font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                How to Play
              </button>
            </div>

            {/* 4 Mode Cards (1-Tap Instant Selection right on Home) */}
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Game Modes">
              <button
                type="button"
                onClick={() => onSelectQuickMode('vs-ai')}
                aria-pressed={activePreset === 'vs-ai'}
                className={`relative min-h-[60px] rounded-2xl px-3 py-2 bg-gradient-to-b from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 active:translate-y-[2px] shadow-[0_4px_0_#1e3a8a] flex items-center gap-2 text-left transition-all cursor-pointer ${
                  activePreset === 'vs-ai'
                    ? 'border-2 border-amber-300 ring-2 ring-amber-300/45'
                    : 'border border-sky-200/35 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                    VS Computer
                    {activePreset === 'vs-ai' && (
                      <Check size={13} className="text-amber-300 shrink-0" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-sky-100">
                    Solo vs Smart AI
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectQuickMode('pass-play')}
                aria-pressed={activePreset === 'pass-play'}
                className={`relative min-h-[60px] rounded-2xl px-3 py-2 bg-gradient-to-b from-emerald-500 to-teal-700 hover:from-emerald-400 hover:to-teal-600 active:translate-y-[2px] shadow-[0_4px_0_#065f46] flex items-center gap-2 text-left transition-all cursor-pointer ${
                  activePreset === 'pass-play'
                    ? 'border-2 border-amber-300 ring-2 ring-amber-300/45'
                    : 'border border-emerald-200/35 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                    Pass &amp; Play
                    {activePreset === 'pass-play' && (
                      <Check size={13} className="text-amber-300 shrink-0" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-100">
                    Friends Offline
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectQuickMode('duel-2p')}
                aria-pressed={activePreset === 'duel-2p'}
                className={`relative min-h-[60px] rounded-2xl px-3 py-2 bg-gradient-to-b from-rose-500 to-red-700 hover:from-rose-400 hover:to-red-600 active:translate-y-[2px] shadow-[0_4px_0_#881337] flex items-center gap-2 text-left transition-all cursor-pointer ${
                  activePreset === 'duel-2p'
                    ? 'border-2 border-amber-300 ring-2 ring-amber-300/45'
                    : 'border border-rose-200/35 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Swords size={18} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                    2P Duel
                    {activePreset === 'duel-2p' && (
                      <Check size={13} className="text-amber-300 shrink-0" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-100">
                    Fast 1 vs 1 Match
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={onStartPractice}
                aria-pressed={activePreset === 'practice'}
                className={`relative min-h-[60px] rounded-2xl px-3 py-2 bg-gradient-to-b from-violet-500 to-purple-700 hover:from-violet-400 hover:to-purple-600 active:translate-y-[2px] shadow-[0_4px_0_#4c1d95] flex items-center gap-2 text-left transition-all cursor-pointer ${
                  activePreset === 'practice'
                    ? 'border-2 border-amber-300 ring-2 ring-amber-300/45'
                    : 'border border-violet-200/35 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                    Practice
                    {activePreset === 'practice' && (
                      <Check size={13} className="text-amber-300 shrink-0" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-violet-100">
                    Easy + Instant Play
                  </span>
                </div>
              </button>
            </div>

            {/* Quick 1-Tap Controls: Players Count (2P/3P/4P) & AI Difficulty / Stake */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25 grid grid-cols-3 gap-1"
                role="group"
                aria-label="Quick player count"
              >
                {([2, 3, 4] as PlayerCount[]).map((cnt) => {
                  const active = playerCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onSelectPlayerCount(cnt)}
                      aria-pressed={active}
                      className={`min-h-[38px] rounded-xl text-xs font-black transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-200 hover:bg-indigo-900/50 hover:text-white'
                      }`}
                    >
                      {cnt}P
                    </button>
                  );
                })}
              </div>

              {hasAI ? (
                <div
                  className="p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25 grid grid-cols-3 gap-1"
                  role="group"
                  aria-label="Quick AI difficulty"
                >
                  {(['easy', 'normal', 'hard'] as AIDifficulty[]).map((diff) => {
                    const active = aiDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => onSelectDifficulty(diff)}
                        aria-pressed={active}
                        className={`min-h-[38px] rounded-xl text-[11px] font-extrabold capitalize transition-all cursor-pointer ${
                          active
                            ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm'
                            : 'text-slate-200 hover:bg-indigo-900/50 hover:text-white'
                        }`}
                      >
                        {AI_LABEL[diff]}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25 grid grid-cols-3 gap-1"
                  role="group"
                  aria-label="Quick match coin stake"
                >
                  {[0, 100, 250].map((fee) => {
                    const active = entryFee === fee;
                    const affordable = progression.coins >= fee;
                    return (
                      <button
                        key={fee}
                        type="button"
                        disabled={!affordable}
                        onClick={() => onSelectEntryFee(fee)}
                        aria-pressed={active}
                        className={`min-h-[38px] rounded-xl text-[11px] font-extrabold transition-all cursor-pointer tabular-nums ${
                          active
                            ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow-sm'
                            : affordable
                              ? 'text-slate-200 hover:bg-indigo-900/50 hover:text-white'
                              : 'text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {fee === 0 ? 'Free' : fee}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Setup Strip + Profiles & Customize Buttons */}
            <div className="flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-2xl bg-[#101330] border border-indigo-400/25">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  {seats.map((seat) => (
                    <PlayerAvatar
                      key={seat.color}
                      avatarId={seat.avatarId ?? DEFAULT_COLOR_AVATAR[seat.color]}
                      color={seat.color}
                      size={22}
                    />
                  ))}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[11px] sm:text-xs font-extrabold text-white truncate">
                    {isPracticeMode
                      ? 'Practice · Easy AI'
                      : `${playerCount}P · ${hasAI ? `${AI_LABEL[aiDifficulty]} AI` : `${squadCount || playerCount}P Local`}`}
                  </span>
                  <span className="text-[11px] font-bold text-amber-300 tabular-nums truncate">
                    {entryFee > 0 && !isPracticeMode
                      ? `Pool ${prizePool}`
                      : 'Free · Win Coins'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onOpenProfiles}
                  className="min-h-[40px] px-2 rounded-xl bg-[#071529] hover:bg-[#0c2140] border border-[#00d4ff]/50 text-[11px] sm:text-xs font-extrabold text-[#7dd3fc] flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                >
                  <Users size={12} className="text-[#00d4ff]" />
                  Profiles
                </button>
                <button
                  type="button"
                  onClick={() => setView('modes')}
                  className="min-h-[40px] px-2 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 border border-indigo-400/40 text-[11px] sm:text-xs font-bold text-white flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal size={12} />
                  Setup
                </button>
              </div>
            </div>

            {/* Beginner 3-Step Quick Guide */}
            <p className="text-[11px] font-semibold text-indigo-100 bg-[#0e1129] border border-indigo-400/20 rounded-xl px-2.5 py-1.5 text-center leading-snug">
              <span className="text-amber-300 font-extrabold">Easy Start:</span> Roll 6 to open · Tap glowing goti · Cut opponents for bonus turn!
            </p>

            {/* Primary Glossy 3D PLAY NOW CTA */}
            <button
              type="button"
              data-start="true"
              onClick={onStartMatch}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 hover:from-amber-200 hover:to-amber-500 active:translate-y-[2px] text-slate-950 font-black text-lg tracking-wide flex items-center justify-center gap-2.5 shadow-[0_6px_0_#92400e,0_12px_24px_rgba(245,158,11,0.35)] border border-amber-100/80 transition-all cursor-pointer"
            >
              <Play size={20} fill="currentColor" />
              PLAY NOW
            </button>
          </section>
        ) : (
          <section
            className="animate-pop-in pointer-events-auto w-full max-w-[448px] rounded-3xl border-2 border-indigo-400/45 bg-gradient-to-b from-[#1e1b4b] via-[#15173c] to-[#0d102a] shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-4 sm:p-5 flex flex-col gap-3 max-h-[78dvh] overflow-y-auto"
            aria-label="LUDO MOD Mode & Players Setup"
          >
            {/* Mode View Header */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView('home')}
                aria-label="Back to Home Screen"
                className="min-h-[40px] px-3 rounded-xl bg-[#101330] hover:bg-indigo-900/70 border border-indigo-400/30 text-xs font-bold text-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={15} />
                Home
              </button>
              <div className="text-right">
                <h2 className="text-base sm:text-lg font-black text-white leading-none">
                  Customize Match
                </h2>
                <p className="text-[11px] font-bold text-amber-300 uppercase mt-0.5">
                  POWERED BY AJIT KUMAR
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-indigo-100 bg-[#101330] border border-indigo-400/20 rounded-xl px-3 py-1.5 text-center">
              Tap an avatar to swap icon · Tap a player card to switch Human / AI!
            </p>

            {/* Player Count Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-indigo-200">
                Number of Players
              </span>
              <div
                className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25"
                role="group"
                aria-label="Player count"
              >
                {([2, 3, 4] as PlayerCount[]).map((cnt) => {
                  const active = playerCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onSelectPlayerCount(cnt)}
                      className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-200 hover:bg-indigo-900/50 hover:text-white'
                      }`}
                    >
                      {cnt} Players
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Difficulty Selector: Easy / Normal / Hard */}
            {hasAI && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-indigo-200">
                  Computer AI Difficulty
                </span>
                <div
                  className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0e1129] border border-indigo-400/25"
                  role="group"
                  aria-label="AI Difficulty"
                >
                  {(['easy', 'normal', 'hard'] as AIDifficulty[]).map((diff) => {
                    const active = aiDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => onSelectDifficulty(diff)}
                        className={`min-h-[40px] rounded-xl text-xs sm:text-sm font-extrabold capitalize transition-colors cursor-pointer ${
                          active
                            ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm'
                            : 'text-slate-200 hover:text-white hover:bg-indigo-900/40'
                        }`}
                      >
                        {AI_LABEL[diff]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Match Coin Stakes */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-200">
                  Match Coin Stake
                </span>
                <span className="text-xs font-bold text-amber-300 tabular-nums">
                  {entryFee > 0 ? `Winner gets +${prizePool}` : 'Friendly Free Match'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {STAKE_OPTIONS.map((fee) => {
                  const active = entryFee === fee;
                  const affordable = progression.coins >= fee;
                  return (
                    <button
                      key={fee}
                      type="button"
                      disabled={!affordable}
                      onClick={() => onSelectEntryFee(fee)}
                      className={`min-h-[42px] rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1 transition-all cursor-pointer tabular-nums ${
                        active
                          ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-amber-200 shadow-sm'
                          : affordable
                            ? 'bg-[#101330] border-indigo-400/25 text-slate-100 hover:border-amber-400/50'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {fee === 0 ? (
                        'Free'
                      ) : (
                        <>
                          <CoinSvg size={14} />
                          {fee}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seat Profile Cards (Name, Player ID + Human/AI Toggle) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-200">
                  Players &amp; Seats
                </span>
                <button
                  type="button"
                  onClick={onOpenProfiles}
                  className="text-[11px] font-extrabold text-[#00d4ff] hover:text-sky-200 underline cursor-pointer"
                >
                  Assign Player Profiles ({activeProfileCount})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {seats.map((seat, idx) => {
                  const isAI = seat.control === 'ai';
                  const avatarId = seat.avatarId ?? DEFAULT_COLOR_AVATAR[seat.color];
                  return (
                    <div
                      key={seat.color}
                      className="rounded-2xl border bg-[#101330] p-1.5 flex items-center gap-1.5"
                      style={{ borderColor: `${COLOR_HEX[seat.color]}66` }}
                    >
                      <button
                        type="button"
                        onClick={() => onCycleSeatAvatar(idx)}
                        aria-label={`Change ${seat.name} avatar`}
                        title="Tap to change avatar"
                        className="shrink-0 rounded-full cursor-pointer hover:scale-105 transition-transform"
                      >
                        <PlayerAvatar
                          avatarId={avatarId}
                          color={seat.color}
                          size={34}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleSeatControl(idx)}
                        aria-label={`${COLOR_LABELS[seat.color]} seat: ${isAI ? 'Computer AI' : 'Human'}. Tap to switch`}
                        className="min-h-[42px] flex-1 min-w-0 flex flex-col items-start justify-center text-left cursor-pointer px-1"
                      >
                        <span className="text-xs font-extrabold text-white truncate w-full">
                          {seat.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold truncate w-full ${
                            isAI ? 'text-sky-300' : 'text-[#00d4ff]'
                          }`}
                        >
                          {isAI ? (
                            <>
                              <Bot size={10} className="shrink-0" />
                              <span>Computer</span>
                            </>
                          ) : seat.playerId ? (
                            <span className="font-mono">{seat.playerId}</span>
                          ) : (
                            <>
                              <User size={10} className="shrink-0" />
                              <span>Human</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Match CTA */}
            <button
              type="button"
              data-start="true"
              onClick={onStartMatch}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 hover:from-emerald-300 hover:to-emerald-600 active:translate-y-[2px] text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-[0_5px_0_#065f46] border border-emerald-200/70 transition-all cursor-pointer"
            >
              <Play size={18} fill="currentColor" />
              START MATCH
            </button>
          </section>
        )}
      </div>

      {/* Subtle Bottom Branding / Controls Hint */}
      <footer className="hidden sm:flex items-center justify-center">
        <p className="px-3.5 py-1 rounded-full bg-[#0b0e24]/90 border border-indigo-400/25 text-xs font-semibold text-indigo-100">
          Tap Die or Press Space to Roll · Tap Glowing Token or MOVE TOKEN · Esc Settings
        </p>
      </footer>
    </div>
  );
};
