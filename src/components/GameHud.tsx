import React from 'react';
import {
  ArrowRight,
  Bot,
  Camera,
  HelpCircle,
  Music,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { COLOR_DARK_HEX, COLOR_HEX, COLOR_LABELS } from '../game/boardCoords';
import {
  FINISH_PROGRESS,
  chooseAIMove,
  getCurrentPlayerColor,
  getGlobalTrackIndex,
} from '../game/rules';
import { SAFE_TRACK_INDICES } from '../game/boardCoords';
import { SecretModeState } from '../game/secretHackMode';
import {
  CameraPreset,
  MatchState,
  PlayerColor,
} from '../game/types';
import { DiceSvg } from './DiceSvg';
import { PlayerAvatar } from './PlayerAvatar';
import { CoinSvg } from './RewardsModal';
import { SecretNumberPad } from './SecretNumberPad';

export interface CutBannerInfo {
  attacker: string;
  victim: string;
  color: PlayerColor;
  key: number;
}

interface GameHudProps {
  match: MatchState;
  soundEnabled: boolean;
  musicEnabled: boolean;
  cameraPreset: CameraPreset;
  cutBanner?: CutBannerInfo | null;
  secretMode?: SecretModeState;
  onSelectSecretDice?: (val: number) => void;
  onToggleSecretPad?: () => void;
  onDisableSecretMode?: () => void;
  onRollDice: () => void;
  onSelectToken: (tokenId: string) => void;
  onCycleCamera: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
}

const CAMERA_LABEL: Record<CameraPreset, string> = {
  classic: '3D Fixed',
  top: 'Top View',
};

export const GameHud: React.FC<GameHudProps> = ({
  match,
  soundEnabled,
  musicEnabled,
  cameraPreset,
  cutBanner = null,
  secretMode,
  onSelectSecretDice,
  onToggleSecretPad,
  onDisableSecretMode,
  onRollDice,
  onSelectToken,
  onCycleCamera,
  onToggleSound,
  onToggleMusic,
  onOpenTutorial,
  onOpenSettings,
}) => {
  const activeColor = getCurrentPlayerColor(match);
  const activePlayer = match.players[activeColor];
  const isHumanTurn = activePlayer.control === 'human';
  const canRoll = isHumanTurn && match.turnPhase === 'await_roll';
  const canPickToken =
    isHumanTurn &&
    match.turnPhase === 'await_move' &&
    match.legalTokenIds.length > 0;

  // Automatically identify recommended best move for beginner Move Token button
  const recommendedTokenId =
    canPickToken && match.diceValue !== null
      ? (chooseAIMove(match, activeColor, match.diceValue, 'hard') ??
          match.legalTokenIds[0])
      : null;

  const myTokens = match.tokens.filter((t) => t.color === activeColor);
  const allInYard = myTokens.every((t) => t.progress === -1);

  const beginnerHint = !isHumanTurn
    ? `${activePlayer.name} is playing…`
    : match.turnPhase === 'rolling'
      ? 'Rolling the dice…'
      : match.turnPhase === 'animating_move'
        ? 'Moving token…'
        : canPickToken
          ? `Rolled ${match.diceValue}! Tap token or MOVE`
          : allInYard
            ? 'Roll a 6 to enter the board!'
            : 'Tap ROLL DICE or center die!';

  const getTokenActionTag = (tokenId: string): string => {
    const token = match.tokens.find((t) => t.id === tokenId);
    if (!token || match.diceValue === null) return `Token`;
    if (token.progress === -1) return `#${token.index + 1} Enter`;
    const nextP = token.progress + match.diceValue;
    if (nextP === FINISH_PROGRESS) return `#${token.index + 1} Home!`;
    const nextGlobal = getGlobalTrackIndex(token.color, nextP);
    if (nextGlobal !== null && !SAFE_TRACK_INDICES.has(nextGlobal)) {
      const canCap = match.tokens.some(
        (opp) =>
          opp.color !== token.color &&
          opp.progress >= 0 &&
          opp.progress <= 50 &&
          getGlobalTrackIndex(opp.color, opp.progress) === nextGlobal,
      );
      if (canCap) return `#${token.index + 1} Capture!`;
    }
    return `#${token.index + 1} +${match.diceValue}`;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-4 safe-top safe-bottom safe-x">
      {/* Top Fixed-Layout Perimeter Cluster */}
      <div className="flex items-start justify-between gap-2">
        {/* Player Avatar Profile Cards (fixed dimensions, no jitter) */}
        <div
          className="pointer-events-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-[238px] sm:max-w-none"
          aria-label="Players status"
        >
          {match.activeColors.map((color) => {
            const p = match.players[color];
            const isTurn = color === activeColor;
            const pTokens = match.tokens.filter((t) => t.color === color);
            const finishedCount = pTokens.filter(
              (t) => t.progress === FINISH_PROGRESS,
            ).length;

            return (
              <div
                key={color}
                className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl border-2 transition-all duration-300 flex items-center gap-1.5 sm:gap-2 min-w-0 ${
                  isTurn
                    ? 'bg-gradient-to-b from-[#2a2564] to-[#131538] shadow-[0_6px_18px_rgba(251,191,36,0.28)] scale-[1.03]'
                    : 'bg-[#0e1129]/95 border-indigo-400/25 opacity-85'
                }`}
                style={isTurn ? { borderColor: '#fbbf24' } : undefined}
              >
                <PlayerAvatar avatarId={p.avatarId} color={color} size={26} />
                <div className="flex flex-col leading-none min-w-0 flex-1">
                  <span
                    className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 min-w-0 ${
                      isTurn ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    <span className="truncate">
                      {p.control === 'ai' ? COLOR_LABELS[color] : p.name}
                    </span>
                    {p.control === 'ai' && (
                      <Bot size={11} className="text-sky-400 shrink-0" />
                    )}
                  </span>
                  <div
                    className="flex items-center gap-1 mt-1"
                    aria-label={`${COLOR_LABELS[color]} ${finishedCount} of 4 finished`}
                  >
                    {[0, 1, 2, 3].map((pipIdx) => {
                      const done = pipIdx < finishedCount;
                      return (
                        <span
                          key={pipIdx}
                          className="w-2 h-2 rounded-full border"
                          style={{
                            backgroundColor: done
                              ? COLOR_HEX[color]
                              : 'rgba(15,23,42,0.7)',
                            borderColor: done
                              ? '#fef08a'
                              : `${COLOR_HEX[color]}88`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top-Right Utility Controls (44px+ Android touch targets, clean uncrowded layout) */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenTutorial();
            }}
            aria-label="How to Play Tutorial"
            title="How to Play"
            className="min-w-[44px] h-[44px] rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#111536] border border-emerald-400/45 text-emerald-300 hover:border-emerald-300 shadow-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle size={18} />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            aria-label={`Camera view: ${CAMERA_LABEL[cameraPreset]}. Tap to switch`}
            title={`Camera: ${CAMERA_LABEL[cameraPreset]}`}
            className="hidden sm:flex min-w-[44px] h-[44px] px-3 rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#111536] border border-indigo-400/40 text-slate-100 hover:border-amber-400/60 shadow-lg items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
          >
            <Camera size={17} />
            <span className="hidden md:inline whitespace-nowrap">
              {CAMERA_LABEL[cameraPreset]}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMusic();
            }}
            aria-label={musicEnabled ? 'Mute background music' : 'Enable background music'}
            title={musicEnabled ? 'Music On' : 'Music Off'}
            className={`hidden md:flex min-w-[44px] h-[44px] rounded-2xl border shadow-lg items-center justify-center transition-colors cursor-pointer ${
              musicEnabled
                ? 'bg-gradient-to-b from-[#1e1b4b] to-[#111536] border-indigo-400/40 text-amber-300'
                : 'bg-[#10142c] border-slate-700 text-slate-400'
            }`}
          >
            <Music size={17} />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            className="min-w-[44px] h-[44px] rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#111536] border border-indigo-400/40 text-slate-100 hover:border-amber-400/60 shadow-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            aria-label="Open game settings and pause menu"
            title="Settings & Pause (Esc)"
            className="min-w-[44px] h-[44px] rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#111536] border border-indigo-400/40 text-slate-100 hover:border-amber-400/60 shadow-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause size={17} />
          </button>
        </div>
      </div>

      {/* Bottom Android-First Thumb Zone Dock */}
      <div className="flex flex-col items-center gap-1.5 relative">
        {/* Token Cut Effect Callout */}
        {cutBanner && (
          <div
            key={cutBanner.key}
            role="status"
            aria-live="polite"
            className="animate-pop-in pointer-events-none px-4 py-1.5 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-[#2e1065] via-[#7f1d1d] to-[#2e1065] shadow-[0_8px_24px_rgba(245,158,11,0.45)] flex items-center gap-2 text-xs sm:text-sm font-black text-white"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
              style={{ backgroundColor: COLOR_HEX[cutBanner.color] }}
            />
            <span>
              TOKEN CUT! {cutBanner.attacker} sent {cutBanner.victim} home · +Bonus Roll
            </span>
          </div>
        )}

        {/* Selectable Token Quick-Pick Pills when Human has legal moves */}
        {canPickToken && (
          <div
            className="pointer-events-auto flex items-center justify-center gap-1.5 flex-wrap"
            role="group"
            aria-label="Selectable tokens"
          >
            {match.legalTokenIds.map((id) => {
              const isRec = id === recommendedTokenId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectToken(id)}
                  className="min-h-[42px] px-3 py-1.5 rounded-2xl border-2 text-xs sm:text-sm font-black shadow-lg active:translate-y-[2px] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    background: `linear-gradient(180deg, ${COLOR_HEX[activeColor]} 0%, ${COLOR_DARK_HEX[activeColor]} 100%)`,
                    borderColor: isRec ? '#fde047' : 'rgba(255,255,255,0.65)',
                    color: activeColor === 'yellow' ? '#0f172a' : '#ffffff',
                    boxShadow: '0 4px 0 rgba(0,0,0,0.45)',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-black/25 shrink-0" />
                  {getTokenActionTag(id)}
                </button>
              );
            })}
          </div>
        )}

        {/* Secret Hack Mode Dice Control Pad (shown only when unlocked with PIN 7890) */}
        {secretMode?.unlocked &&
          onSelectSecretDice &&
          onToggleSecretPad &&
          onDisableSecretMode && (
            <SecretNumberPad
              secretMode={secretMode}
              onSelectNumber={onSelectSecretDice}
              onToggleVisible={onToggleSecretPad}
              onTurnOff={onDisableSecretMode}
            />
          )}

        {/* Primary Action Bar + Simple Beginner Instruction */}
        <div className="pointer-events-auto w-full max-w-[480px] rounded-3xl border-2 border-indigo-400/45 bg-gradient-to-b from-[#1d1a48] to-[#0f112d] px-3 py-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.65)] flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 rounded-xl bg-[#0b0e24] border border-indigo-400/35 shrink-0">
                <DiceSvg
                  value={match.diceValue}
                  size={34}
                  accentHex={COLOR_HEX[activeColor]}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-xs sm:text-sm font-black truncate"
                    style={{ color: COLOR_HEX[activeColor] }}
                  >
                    {activePlayer.name}
                  </span>
                  {activePlayer.playerId && (
                    <span className="text-[10px] font-mono font-bold text-[#00d4ff] shrink-0">
                      {activePlayer.playerId}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-slate-300 tabular-nums shrink-0">
                    · T{match.turnNumber}
                  </span>
                  {match.isPractice ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-violet-500/25 border border-violet-300/45 text-[10px] font-extrabold text-violet-200 shrink-0">
                      Practice
                    </span>
                  ) : match.prizePool > 0 ? (
                    <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-200 tabular-nums shrink-0">
                      <CoinSvg size={11} />
                      {match.prizePool}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-100 font-semibold truncate">
                  {beginnerHint}
                </span>
              </div>
            </div>

            {canPickToken && recommendedTokenId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectToken(recommendedTokenId);
                }}
                aria-label="Move highlighted token"
                className="min-h-[48px] px-4 sm:px-5 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border border-amber-100/80 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 hover:from-amber-200 hover:to-amber-500 active:translate-y-[2px] text-slate-950 shadow-[0_4px_0_#92400e] cursor-pointer"
              >
                MOVE TOKEN
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canRoll}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRollDice();
                }}
                aria-label="Roll Dice"
                className={`min-h-[48px] px-4 sm:px-5 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all flex items-center gap-2 border ${
                  canRoll
                    ? 'active:translate-y-[2px] cursor-pointer border-white/40'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 cursor-not-allowed'
                }`}
                style={
                  canRoll
                    ? {
                        background: `linear-gradient(180deg, ${COLOR_HEX[activeColor]} 0%, ${COLOR_DARK_HEX[activeColor]} 100%)`,
                        color: activeColor === 'yellow' ? '#0f172a' : '#ffffff',
                        boxShadow: '0 4px 0 rgba(0,0,0,0.45)',
                      }
                    : undefined
                }
              >
                {match.turnPhase === 'rolling'
                  ? 'Rolling…'
                  : match.turnPhase === 'animating_move'
                    ? 'Moving…'
                    : !isHumanTurn
                      ? 'AI Turn'
                      : 'ROLL DICE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
