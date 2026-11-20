import {
  COLOR_LABELS,
  SAFE_TRACK_INDICES,
  STAR_TRACK_INDICES,
  START_TRACK_INDEX,
} from './boardCoords';
import { DEFAULT_COLOR_AVATAR } from './progression';
import {
  AIDifficulty,
  MatchState,
  MatchStatistics,
  MoveResult,
  PlayerColor,
  PlayerCount,
  PlayerMatchStatistics,
  PlayerRanking,
  PlayerSeatSetup,
  PlayerStats,
  TokenState,
} from './types';

export const FINISH_PROGRESS = 56;
export const MAX_CONSECUTIVE_SIXES = 3;

export function getActiveColorsForCount(count: PlayerCount): PlayerColor[] {
  if (count === 2) return ['red', 'yellow'];
  if (count === 3) return ['red', 'green', 'yellow'];
  return ['red', 'green', 'yellow', 'blue'];
}

export function createDefaultSetup(count: PlayerCount): PlayerSeatSetup[] {
  const active = getActiveColorsForCount(count);
  return active.map((color, idx) => ({
    color,
    name: idx === 0 ? 'You' : `${COLOR_LABELS[color]} AI`,
    control: idx === 0 ? 'human' : 'ai',
    avatarId: DEFAULT_COLOR_AVATAR[color],
  }));
}

export function createInitialMatch(
  setups: PlayerSeatSetup[],
  nowMs: number = Date.now(),
  entryFee: number = 0,
  isPractice: boolean = false,
): MatchState {
  const activeColors = setups.map((s) => s.color);
  const players = {} as Record<PlayerColor, PlayerStats>;
  const tokens: TokenState[] = [];

  for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
    const found = setups.find((s) => s.color === color);
    players[color] = {
      color,
      name: found ? found.name : COLOR_LABELS[color],
      control: found ? found.control : 'ai',
      avatarId: found?.avatarId ?? DEFAULT_COLOR_AVATAR[color],
      profileId: found?.profileId,
      playerId: found?.playerId,
      captures: 0,
      rolls: 0,
      sixes: 0,
      moves: 0,
      moveTimeMs: 0,
      distanceTraveled: 0,
      finishedOrder: null,
    };
  }

  for (const setup of setups) {
    for (let i = 0; i < 4; i++) {
      tokens.push({
        id: `${setup.color}-${i}`,
        color: setup.color,
        index: i,
        progress: -1,
      });
    }
  }

  const firstColor = activeColors[0];
  const firstName = players[firstColor].name;
  const turnText = firstName === 'You' ? 'Your turn' : `${firstName}'s turn`;
  const baseReward = isPractice
    ? 100
    : setups.length === 2
      ? 200
      : setups.length === 3
        ? 350
        : 500;
  const prizePool = entryFee > 0 ? entryFee * setups.length : baseReward;

  return {
    playerCount: setups.length as PlayerCount,
    activeColors,
    players,
    tokens,
    currentTurnIndex: 0,
    turnPhase: 'await_roll',
    diceValue: null,
    consecutiveSixes: 0,
    legalTokenIds: [],
    winner: null,
    turnNumber: 1,
    statusMessage: `${turnText} · Tap Roll Dice`,
    startedAtMs: nowMs,
    turnStartedAtMs: nowMs,
    elapsedMs: 0,
    totalMoves: 0,
    totalMoveTimeMs: 0,
    entryFee,
    prizePool,
    isPractice,
  };
}

export function getCurrentPlayerColor(state: MatchState): PlayerColor {
  return state.activeColors[state.currentTurnIndex];
}

export function getGlobalTrackIndex(
  color: PlayerColor,
  progress: number,
): number | null {
  if (progress < 0 || progress > 50) return null;
  return (START_TRACK_INDEX[color] + progress) % 52;
}

export function isSafeProgress(color: PlayerColor, progress: number): boolean {
  if (progress < 0 || progress >= 51) return true;
  const globalIdx = getGlobalTrackIndex(color, progress);
  return globalIdx !== null && SAFE_TRACK_INDICES.has(globalIdx);
}

export function canTokenMove(token: TokenState, roll: number): boolean {
  if (roll < 1 || roll > 6) return false;
  if (token.progress === -1) {
    return roll === 6;
  }
  if (token.progress >= FINISH_PROGRESS) {
    return false;
  }
  return token.progress + roll <= FINISH_PROGRESS;
}

export function getLegalTokens(
  state: MatchState,
  color: PlayerColor,
  roll: number,
): TokenState[] {
  return state.tokens.filter(
    (t) => t.color === color && canTokenMove(t, roll),
  );
}

export function advanceTurn(
  state: MatchState,
  messagePrefix?: string,
  nowMs: number = Date.now(),
): MatchState {
  const nextIdx = (state.currentTurnIndex + 1) % state.activeColors.length;
  const nextColor = state.activeColors[nextIdx];
  const nextName = state.players[nextColor].name;
  const turnText = nextName === 'You' ? 'Your turn' : `${nextName}'s turn`;

  return {
    ...state,
    currentTurnIndex: nextIdx,
    turnPhase: 'await_roll',
    diceValue: null,
    consecutiveSixes: 0,
    legalTokenIds: [],
    turnNumber: state.turnNumber + 1,
    turnStartedAtMs: nowMs,
    statusMessage: messagePrefix
      ? `${messagePrefix} · ${turnText}`
      : `${turnText} · Tap Roll Dice`,
  };
}

export function applyDiceRoll(
  state: MatchState,
  roll: number,
  threeSixesForfeit: boolean = true,
  nowMs: number = Date.now(),
): MatchState {
  const color = getCurrentPlayerColor(state);
  const player = state.players[color];
  const nextConsecutiveSixes = roll === 6 ? state.consecutiveSixes + 1 : 0;

  const updatedPlayers: Record<PlayerColor, PlayerStats> = {
    ...state.players,
    [color]: {
      ...player,
      rolls: player.rolls + 1,
      sixes: player.sixes + (roll === 6 ? 1 : 0),
    },
  };

  if (threeSixesForfeit && nextConsecutiveSixes >= MAX_CONSECUTIVE_SIXES) {
    return advanceTurn(
      {
        ...state,
        players: updatedPlayers,
        diceValue: roll,
      },
      `${player.name} rolled three 6s (forfeited)`,
      nowMs,
    );
  }

  const legal = getLegalTokens(state, color, roll);
  if (legal.length === 0) {
    return advanceTurn(
      {
        ...state,
        players: updatedPlayers,
        diceValue: roll,
      },
      `${player.name} rolled ${roll} (no moves)`,
      nowMs,
    );
  }

  return {
    ...state,
    players: updatedPlayers,
    diceValue: roll,
    consecutiveSixes: nextConsecutiveSixes,
    legalTokenIds: legal.map((t) => t.id),
    turnPhase: 'await_move',
    statusMessage: `${player.name} rolled ${roll} · Tap glowing token or Move Token`,
  };
}

export function executeTokenMove(
  state: MatchState,
  tokenId: string,
  nowMs: number = Date.now(),
): MoveResult {
  const roll = state.diceValue;
  if (roll === null) {
    throw new Error('Cannot execute move without an active dice roll');
  }

  const movingToken = state.tokens.find((t) => t.id === tokenId);
  if (!movingToken) {
    throw new Error(`Token ${tokenId} not found`);
  }

  const activeColor = getCurrentPlayerColor(state);
  if (movingToken.color !== activeColor || !canTokenMove(movingToken, roll)) {
    throw new Error(`Illegal move for token ${tokenId} with roll ${roll}`);
  }

  const startProgress = movingToken.progress;
  const targetProgress = startProgress === -1 ? 0 : startProgress + roll;

  const pathProgresses: number[] = [];
  if (startProgress === -1) {
    pathProgresses.push(0);
  } else {
    for (let p = startProgress + 1; p <= targetProgress; p++) {
      pathProgresses.push(p);
    }
  }

  // Check captures on main track (0..50) if target is not a safe tile
  const targetGlobalIdx = getGlobalTrackIndex(movingToken.color, targetProgress);
  const isSafeSquare =
    targetGlobalIdx === null || SAFE_TRACK_INDICES.has(targetGlobalIdx);

  const capturedTokens: TokenState[] = [];
  const nextTokens = state.tokens.map((t) => {
    if (t.id === movingToken.id) {
      return { ...t, progress: targetProgress };
    }
    if (
      !isSafeSquare &&
      targetGlobalIdx !== null &&
      t.color !== movingToken.color &&
      t.progress >= 0 &&
      t.progress <= 50
    ) {
      const oppGlobal = getGlobalTrackIndex(t.color, t.progress);
      if (oppGlobal === targetGlobalIdx) {
        capturedTokens.push(t);
        return { ...t, progress: -1 };
      }
    }
    return t;
  });

  const reachedHome = targetProgress === FINISH_PROGRESS;
  const finishedCount = nextTokens.filter(
    (t) => t.color === activeColor && t.progress === FINISH_PROGRESS,
  ).length;
  const hasWon = finishedCount === 4;

  const stepsMoved = pathProgresses.length;
  const moveDurationMs = Math.max(0, nowMs - state.turnStartedAtMs);
  const currentStats = state.players[activeColor];
  const updatedPlayers: Record<PlayerColor, PlayerStats> = {
    ...state.players,
    [activeColor]: {
      ...currentStats,
      captures: currentStats.captures + capturedTokens.length,
      moves: currentStats.moves + 1,
      moveTimeMs: currentStats.moveTimeMs + moveDurationMs,
      distanceTraveled: currentStats.distanceTraveled + stepsMoved,
      finishedOrder: hasWon ? 1 : currentStats.finishedOrder,
    },
  };
  const nextTotalMoves = state.totalMoves + 1;
  const nextTotalMoveTimeMs = state.totalMoveTimeMs + moveDurationMs;

  if (hasWon) {
    const nextState: MatchState = {
      ...state,
      players: updatedPlayers,
      tokens: nextTokens,
      turnPhase: 'game_over',
      legalTokenIds: [],
      winner: activeColor,
      totalMoves: nextTotalMoves,
      totalMoveTimeMs: nextTotalMoveTimeMs,
      turnStartedAtMs: nowMs,
      statusMessage: `${currentStats.name} wins the match!`,
    };
    return {
      nextState,
      movedTokenId: tokenId,
      pathProgresses,
      capturedTokens,
      reachedHome,
      bonusRoll: false,
      winner: activeColor,
    };
  }

  const bonusRoll =
    roll === 6 || capturedTokens.length > 0 || reachedHome;

  if (bonusRoll) {
    const reason =
      capturedTokens.length > 0
        ? 'Capture bonus'
        : reachedHome
          ? 'Home bonus'
          : 'Rolled 6';
    const nextState: MatchState = {
      ...state,
      players: updatedPlayers,
      tokens: nextTokens,
      turnPhase: 'await_roll',
      diceValue: null,
      legalTokenIds: [],
      totalMoves: nextTotalMoves,
      totalMoveTimeMs: nextTotalMoveTimeMs,
      turnStartedAtMs: nowMs,
      statusMessage: `${reason}! ${currentStats.name} rolls again`,
    };
    return {
      nextState,
      movedTokenId: tokenId,
      pathProgresses,
      capturedTokens,
      reachedHome,
      bonusRoll: true,
      winner: null,
    };
  }

  const nextTurnState = advanceTurn(
    {
      ...state,
      players: updatedPlayers,
      tokens: nextTokens,
      totalMoves: nextTotalMoves,
      totalMoveTimeMs: nextTotalMoveTimeMs,
    },
    undefined,
    nowMs,
  );

  return {
    nextState: nextTurnState,
    movedTokenId: tokenId,
    pathProgresses,
    capturedTokens,
    reachedHome,
    bonusRoll: false,
    winner: null,
  };
}

/**
 * Evaluates all legal moves and returns the best token ID for Computer AI
 * (or recommended hint move for beginners) across Easy, Normal, and Hard levels.
 */
export function chooseAIMove(
  state: MatchState,
  color: PlayerColor,
  roll: number,
  difficulty: AIDifficulty = 'normal',
): string | null {
  const legal = getLegalTokens(state, color, roll);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0].id;

  // Easy AI: plays casually with minimal capture/safety optimization
  if (difficulty === 'easy') {
    const finishMove = legal.find((t) => t.progress >= 0 && t.progress + roll === FINISH_PROGRESS);
    if (finishMove) return finishMove.id;
    const yardToken = legal.find((t) => t.progress === -1);
    if (yardToken && roll === 6) return yardToken.id;
    const idx = (state.turnNumber + roll) % legal.length;
    return legal[idx].id;
  }

  let bestToken = legal[0];
  let bestScore = -Infinity;

  for (const token of legal) {
    let score = 0;
    const startP = token.progress;
    const endP = startP === -1 ? 0 : startP + roll;
    const endGlobal = getGlobalTrackIndex(color, endP);
    const startGlobal = getGlobalTrackIndex(color, startP);

    // 1. Exact Home Goal is always top priority
    if (endP === FINISH_PROGRESS) {
      score += 1000;
    }

    // 2. Capture opponent token on non-safe square
    if (endGlobal !== null && !SAFE_TRACK_INDICES.has(endGlobal)) {
      const victims = state.tokens.filter((opp) => {
        if (opp.color === color || opp.progress < 0 || opp.progress > 50) {
          return false;
        }
        return getGlobalTrackIndex(opp.color, opp.progress) === endGlobal;
      });
      if (victims.length > 0) {
        const maxVictimProgress = Math.max(...victims.map((v) => v.progress));
        score += 650 + maxVictimProgress * 5;
      }
    }

    // 3. Deploy out of yard on 6
    if (startP === -1 && endP === 0) {
      score += 420;
    }

    // 4. Enter safe home stretch (immune from capture forever)
    if (startP <= 50 && endP >= 51) {
      score += 360;
    }

    // 5. Land on safe star or safe start square
    if (endGlobal !== null && SAFE_TRACK_INDICES.has(endGlobal)) {
      score += STAR_TRACK_INDICES.has(endGlobal) ? 210 : 170;
    }

    if (difficulty === 'hard') {
      // Check if current position is under threat (opponent 1..6 steps behind)
      const inDangerNow =
        startGlobal !== null &&
        !SAFE_TRACK_INDICES.has(startGlobal) &&
        hasOpponentBehind(state.tokens, color, startGlobal, 6);

      if (inDangerNow) {
        score += 240 + startP * 3;
      }

      // Penalty for leaving a safe square into a threatened square
      const leavingSafe =
        startGlobal !== null && SAFE_TRACK_INDICES.has(startGlobal);
      const dangerousDest =
        endGlobal !== null &&
        !SAFE_TRACK_INDICES.has(endGlobal) &&
        hasOpponentBehind(state.tokens, color, endGlobal, 6);

      if (leavingSafe && dangerousDest) {
        score -= 140;
      } else if (dangerousDest) {
        score -= 60;
      }

      // Preference for advancing further tokens
      score += endP * 2.2;
    } else {
      // Normal AI: balanced forward advancement without deep threat dodging
      score += endP * 1.4 + token.index * 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestToken = token;
    }
  }

  return bestToken.id;
}

function hasOpponentBehind(
  tokens: readonly TokenState[],
  myColor: PlayerColor,
  myGlobalIdx: number,
  maxSteps: number,
): boolean {
  return tokens.some((opp) => {
    if (opp.color === myColor || opp.progress < 0 || opp.progress > 50) {
      return false;
    }
    const oppGlobal = getGlobalTrackIndex(opp.color, opp.progress);
    if (oppGlobal === null) return false;
    const dist = (myGlobalIdx - oppGlobal + 52) % 52;
    return dist >= 1 && dist <= maxSteps;
  });
}

export function getMatchRankings(state: MatchState): PlayerRanking[] {
  const entries = state.activeColors.map((color) => {
    const player = state.players[color];
    const playerTokens = state.tokens.filter((t) => t.color === color);
    const finishedTokens = playerTokens.filter(
      (t) => t.progress === FINISH_PROGRESS,
    ).length;
    const totalProgress = playerTokens.reduce(
      (sum, t) => sum + (t.progress < 0 ? 0 : t.progress + 1),
      0,
    );
    return {
      color,
      name: player.name,
      control: player.control,
      avatarId: player.avatarId,
      finishedTokens,
      totalProgress,
      captures: player.captures,
      isWinner: state.winner === color,
    };
  });

  entries.sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    if (b.finishedTokens !== a.finishedTokens) {
      return b.finishedTokens - a.finishedTokens;
    }
    if (b.totalProgress !== a.totalProgress) {
      return b.totalProgress - a.totalProgress;
    }
    return b.captures - a.captures;
  });

  return entries.map((e, idx) => ({
    rank: idx + 1,
    color: e.color,
    name: e.name,
    control: e.control,
    avatarId: e.avatarId,
    finishedTokens: e.finishedTokens,
    totalProgress: e.totalProgress,
    captures: e.captures,
  }));
}

export function getMatchStatistics(state: MatchState): MatchStatistics {
  const players: PlayerMatchStatistics[] = state.activeColors.map((color) => {
    const p = state.players[color];
    const avgMs =
      p.moves > 0 ? Math.round(p.moveTimeMs / p.moves) : 0;
    return {
      color,
      name: p.name,
      control: p.control,
      avatarId: p.avatarId,
      captures: p.captures,
      rolls: p.rolls,
      sixes: p.sixes,
      moves: p.moves,
      averageMoveTimeMs: avgMs,
      distanceTraveled: p.distanceTraveled,
    };
  });

  const totalDistanceTraveled = players.reduce(
    (sum, p) => sum + p.distanceTraveled,
    0,
  );
  const totalCaptures = players.reduce((sum, p) => sum + p.captures, 0);
  const totalRolls = players.reduce((sum, p) => sum + p.rolls, 0);
  const totalSixes = players.reduce((sum, p) => sum + p.sixes, 0);
  const averageMoveTimeMs =
    state.totalMoves > 0
      ? Math.round(state.totalMoveTimeMs / state.totalMoves)
      : state.elapsedMs > 0
        ? Math.round(state.elapsedMs / Math.max(1, state.turnNumber))
        : 0;

  return {
    averageMoveTimeMs,
    totalDistanceTraveled,
    totalCaptures,
    totalMoves: state.totalMoves,
    totalRolls,
    totalSixes,
    players,
  };
}
