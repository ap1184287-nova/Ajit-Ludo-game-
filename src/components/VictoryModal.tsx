import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  Crown,
  Footprints,
  Home,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { COLOR_HEX } from '../game/boardCoords';
import { getMatchRankings, getMatchStatistics } from '../game/rules';
import { MatchState } from '../game/types';
import { PlayerAvatar } from './PlayerAvatar';
import { CoinSvg } from './RewardsModal';

interface VictoryModalProps {
  match: MatchState;
  coinsEarned: number;
  onPlayAgain: () => void;
  onExitToTitle: () => void;
}

type VictoryTab = 'summary' | 'statistics';

const CONFETTI_PIECES = [
  { left: '8%', delay: '0s', color: '#fbbf24' },
  { left: '18%', delay: '0.35s', color: '#ef4444' },
  { left: '29%', delay: '0.7s', color: '#10b981' },
  { left: '41%', delay: '0.2s', color: '#3b82f6' },
  { left: '53%', delay: '0.55s', color: '#f59e0b' },
  { left: '66%', delay: '0.15s', color: '#f472b6' },
  { left: '78%', delay: '0.45s', color: '#38bdf8' },
  { left: '90%', delay: '0.8s', color: '#a855f7' },
];

function formatDuration(ms: number): string {
  const secs = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMoveTime(ms: number): string {
  if (ms <= 0) return '0.0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  match,
  coinsEarned,
  onPlayAgain,
  onExitToTitle,
}) => {
  const [activeTab, setActiveTab] = useState<VictoryTab>('summary');

  if (!match.winner) return null;
  const winnerStats = match.players[match.winner];
  const rankings = getMatchRankings(match);
  const stats = getMatchStatistics(match);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div className="animate-pop-in relative overflow-hidden w-full max-w-[460px] max-h-[90dvh] overflow-y-auto rounded-3xl border-2 border-amber-400/70 bg-gradient-to-b from-[#241f57] via-[#15173c] to-[#0d102a] shadow-[0_24px_60px_rgba(0,0,0,0.8)] p-5 sm:p-6 flex flex-col gap-4">
        {/* Confetti Ribbon Celebration */}
        <div
          className="absolute inset-x-0 top-0 h-44 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              className="animate-confetti absolute top-0 w-2.5 h-4 rounded-sm"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
              }}
            />
          ))}
        </div>

        {/* Winner Crest & Avatar */}
        <div className="relative z-10 flex flex-col items-center text-center gap-2 pt-1">
          <div className="animate-float-slow relative flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${COLOR_HEX[match.winner]}55 0%, rgba(251,191,36,0.22) 55%, transparent 72%)`,
              }}
            >
              <PlayerAvatar
                avatarId={winnerStats.avatarId}
                color={match.winner}
                size={76}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center shadow-lg">
              <Trophy size={18} className="text-slate-950" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 text-xs font-extrabold uppercase tracking-wider mt-1">
            <Crown size={13} className="text-amber-300" />
            Royal Champion
          </div>

          <h2 id="victory-title" className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {winnerStats.name} Wins!
          </h2>
          {winnerStats.playerId && (
            <span className="text-xs font-mono font-bold text-[#00d4ff] tabular-nums">
              Player ID: {winnerStats.playerId}
            </span>
          )}
          <p className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wide">
            LUDO MOD Championship · POWERED BY AJIT KUMAR
          </p>
        </div>

        {/* Coins Reward Banner */}
        {coinsEarned > 0 && (
          <div className="relative z-10 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border border-amber-400/60 px-3.5 py-2.5 flex items-center justify-center gap-2 shadow-md">
            <CoinSvg size={22} />
            <span className="text-sm font-black text-amber-100 tabular-nums">
              +{coinsEarned.toLocaleString()} Gold Coins Earned!
            </span>
            <Sparkles size={16} className="text-amber-300 shrink-0" />
          </div>
        )}

        {/* View Switcher: Summary vs Statistics */}
        <div
          role="tablist"
          aria-label="Match results view"
          className="relative z-10 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0b0d24] border border-indigo-400/25"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-sm'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={15} />
            Summary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'statistics'}
            onClick={() => setActiveTab('statistics')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'statistics'
                ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-sm'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={15} />
            Statistics
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div role="tabpanel" aria-label="Match Summary" className="relative z-10 flex flex-col gap-3">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 text-center">
                <div className="text-[11px] font-semibold text-indigo-200">Turns</div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {match.turnNumber}
                </div>
              </div>
              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 text-center">
                <div className="text-[11px] font-semibold text-indigo-200">Captures</div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {stats.totalCaptures}
                </div>
              </div>
              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 text-center">
                <div className="text-[11px] font-semibold text-indigo-200">Time</div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {formatDuration(match.elapsedMs)}
                </div>
              </div>
            </div>

            {/* Standings with Player Avatars */}
            <div className="flex flex-col gap-1.5">
              {rankings.map((r) => (
                <div
                  key={r.color}
                  className={`px-3 py-2 rounded-2xl border flex items-center justify-between text-sm ${
                    r.rank === 1
                      ? 'bg-[#1d1c4d] border-amber-400/60'
                      : 'bg-[#101330] border-indigo-400/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-black text-amber-300 tabular-nums w-5 shrink-0">
                      #{r.rank}
                    </span>
                    <PlayerAvatar avatarId={r.avatarId} color={r.color} size={28} />
                    <span className="font-extrabold text-white truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-300 tabular-nums shrink-0">
                    <span>{r.finishedTokens}/4 Home</span>
                    <span>{r.captures} Captures</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Match Statistics" className="relative z-10 flex flex-col gap-3">
            {/* Primary Match Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-200">
                  <Clock size={12} className="text-sky-300 shrink-0" />
                  <span>Avg Move</span>
                </div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {formatMoveTime(stats.averageMoveTimeMs)}
                </div>
              </div>

              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-200">
                  <Footprints size={12} className="text-emerald-300 shrink-0" />
                  <span>Distance</span>
                </div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {stats.totalDistanceTraveled.toLocaleString()}
                  <span className="text-[11px] font-bold text-indigo-200 ml-1">tiles</span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#101330] border border-indigo-400/25 p-2.5 flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-200">
                  <Swords size={12} className="text-rose-300 shrink-0" />
                  <span>Captures</span>
                </div>
                <div className="text-lg font-black text-white tabular-nums mt-0.5">
                  {stats.totalCaptures}
                </div>
              </div>
            </div>

            {/* Secondary Activity Strip */}
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-[#101330] border border-indigo-400/20 px-2.5 py-2 text-center">
              <div>
                <div className="text-[11px] font-semibold text-indigo-300">Moves</div>
                <div className="text-sm font-black text-white tabular-nums">{stats.totalMoves}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-indigo-300">Rolls</div>
                <div className="text-sm font-black text-white tabular-nums">{stats.totalRolls}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-indigo-300">Sixes</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">{stats.totalSixes}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-indigo-300">Duration</div>
                <div className="text-sm font-black text-white tabular-nums">
                  {formatDuration(match.elapsedMs)}
                </div>
              </div>
            </div>

            {/* Per-Player Detailed Breakdown */}
            <div className="flex flex-col gap-2">
              {stats.players.map((p) => {
                const isWinner = p.color === match.winner;
                return (
                  <div
                    key={p.color}
                    className={`rounded-2xl border p-2.5 flex flex-col gap-2 ${
                      isWinner
                        ? 'bg-[#1d1c4d] border-amber-400/60'
                        : 'bg-[#101330] border-indigo-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar avatarId={p.avatarId} color={p.color} size={28} />
                        <span className="text-sm font-extrabold text-white truncate">
                          {p.name}
                        </span>
                        {isWinner && (
                          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide shrink-0">
                            Winner
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-indigo-200 tabular-nums shrink-0">
                        {p.sixes}/{p.rolls} sixes
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center rounded-xl bg-[#0b0e24]/80 px-2 py-1.5">
                      <div>
                        <div className="text-[11px] font-medium text-indigo-300">Avg Move</div>
                        <div className="text-xs font-black text-white tabular-nums">
                          {formatMoveTime(p.averageMoveTimeMs)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-indigo-300">Distance</div>
                        <div className="text-xs font-black text-emerald-300 tabular-nums">
                          {p.distanceTraveled} tiles
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-indigo-300">Captures</div>
                        <div className="text-xs font-black text-rose-300 tabular-nums">
                          {p.captures}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="min-h-[50px] rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 active:translate-y-[2px] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#92400e] cursor-pointer"
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="min-h-[50px] rounded-2xl bg-gradient-to-b from-indigo-700 to-indigo-900 hover:from-indigo-600 hover:to-indigo-800 border border-indigo-400/40 text-slate-100 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#1e1b4b] cursor-pointer"
          >
            <Home size={16} />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
