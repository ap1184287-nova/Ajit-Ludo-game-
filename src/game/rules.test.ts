import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAIN_TRACK_COORDS,
  SAFE_TRACK_INDICES,
  START_TRACK_INDEX,
  getGridPointForProgress,
  getTokenWorldPlacement,
} from './boardCoords';
import {
  applyDiceRoll,
  chooseAIMove,
  createDefaultSetup,
  createInitialMatch,
  executeTokenMove,
  getCurrentPlayerColor,
  getLegalTokens,
  getMatchRankings,
  getMatchStatistics,
} from './rules';

test('board perimeter has 52 unique tiles and valid safe zones', () => {
  assert.equal(MAIN_TRACK_COORDS.length, 52);
  const seen = new Set(MAIN_TRACK_COORDS.map((p) => `${p.col},${p.row}`));
  assert.equal(seen.size, 52);

  assert.equal(START_TRACK_INDEX.red, 0);
  assert.equal(START_TRACK_INDEX.green, 13);
  assert.equal(START_TRACK_INDEX.yellow, 26);
  assert.equal(START_TRACK_INDEX.blue, 39);

  for (const idx of [0, 8, 13, 21, 26, 34, 39, 47]) {
    assert.equal(SAFE_TRACK_INDICES.has(idx), true);
  }
});

test('2, 3, and 4 player modes initialize correct tokens and turn rotation', () => {
  // 2P mode: red <-> yellow
  let m2 = createInitialMatch(createDefaultSetup(2));
  assert.deepEqual(m2.activeColors, ['red', 'yellow']);
  assert.equal(m2.tokens.length, 8);
  assert.equal(getCurrentPlayerColor(m2), 'red');
  m2 = applyDiceRoll(m2, 3);
  assert.equal(getCurrentPlayerColor(m2), 'yellow');
  m2 = applyDiceRoll(m2, 2);
  assert.equal(getCurrentPlayerColor(m2), 'red');

  // 3P mode: red -> green -> yellow -> red
  let m3 = createInitialMatch(createDefaultSetup(3));
  assert.deepEqual(m3.activeColors, ['red', 'green', 'yellow']);
  assert.equal(m3.tokens.length, 12);
  m3 = applyDiceRoll(m3, 1);
  assert.equal(getCurrentPlayerColor(m3), 'green');
  m3 = applyDiceRoll(m3, 2);
  assert.equal(getCurrentPlayerColor(m3), 'yellow');
  m3 = applyDiceRoll(m3, 4);
  assert.equal(getCurrentPlayerColor(m3), 'red');

  // 4P mode: red -> green -> yellow -> blue -> red
  let m4 = createInitialMatch(createDefaultSetup(4));
  assert.deepEqual(m4.activeColors, ['red', 'green', 'yellow', 'blue']);
  assert.equal(m4.tokens.length, 16);
  m4 = applyDiceRoll(m4, 1);
  assert.equal(getCurrentPlayerColor(m4), 'green');
  m4 = applyDiceRoll(m4, 2);
  assert.equal(getCurrentPlayerColor(m4), 'yellow');
  m4 = applyDiceRoll(m4, 3);
  assert.equal(getCurrentPlayerColor(m4), 'blue');
  m4 = applyDiceRoll(m4, 5);
  assert.equal(getCurrentPlayerColor(m4), 'red');
});

test('home stretch aligns cleanly after progress 50', () => {
  assert.deepEqual(getGridPointForProgress('red', 0, 50), { col: 0, row: 7 });
  assert.deepEqual(getGridPointForProgress('red', 0, 51), { col: 1, row: 7 });
  assert.deepEqual(getGridPointForProgress('red', 0, 55), { col: 5, row: 7 });

  assert.deepEqual(getGridPointForProgress('green', 0, 50), { col: 7, row: 0 });
  assert.deepEqual(getGridPointForProgress('green', 0, 51), { col: 7, row: 1 });
  assert.deepEqual(getGridPointForProgress('green', 0, 55), { col: 7, row: 5 });

  assert.deepEqual(getGridPointForProgress('yellow', 0, 50), { col: 14, row: 7 });
  assert.deepEqual(getGridPointForProgress('yellow', 0, 51), { col: 13, row: 7 });

  assert.deepEqual(getGridPointForProgress('blue', 0, 50), { col: 7, row: 14 });
  assert.deepEqual(getGridPointForProgress('blue', 0, 51), { col: 7, row: 13 });
});

test('rolling non-6 with all tokens in yard advances turn', () => {
  const setup = createDefaultSetup(2);
  const state = createInitialMatch(setup);
  assert.equal(getCurrentPlayerColor(state), 'red');

  const afterRoll = applyDiceRoll(state, 4);
  assert.equal(afterRoll.turnPhase, 'await_roll');
  assert.equal(getCurrentPlayerColor(afterRoll), 'yellow');
});

test('rolling 6 allows deployment from yard and grants bonus roll', () => {
  const setup = createDefaultSetup(2);
  const state = createInitialMatch(setup);

  const afterRoll = applyDiceRoll(state, 6);
  assert.equal(afterRoll.turnPhase, 'await_move');
  assert.equal(afterRoll.legalTokenIds.length, 4);

  const move = executeTokenMove(afterRoll, 'red-0');
  assert.deepEqual(move.pathProgresses, [0]);
  assert.equal(move.bonusRoll, true);
  assert.equal(getCurrentPlayerColor(move.nextState), 'red');
  assert.equal(
    move.nextState.tokens.find((t) => t.id === 'red-0')?.progress,
    0,
  );
});

test('three consecutive 6s forfeits turn when enabled and continues when disabled', () => {
  const setup = createDefaultSetup(2);
  let state = createInitialMatch(setup);
  state = {
    ...state,
    consecutiveSixes: 2,
    tokens: state.tokens.map((t) =>
      t.id === 'red-0' ? { ...t, progress: 5 } : t,
    ),
  };

  const afterThirdSix = applyDiceRoll(state, 6, true);
  assert.equal(afterThirdSix.turnPhase, 'await_roll');
  assert.equal(getCurrentPlayerColor(afterThirdSix), 'yellow');
  assert.equal(afterThirdSix.consecutiveSixes, 0);

  const allowedThirdSix = applyDiceRoll(state, 6, false);
  assert.equal(allowedThirdSix.turnPhase, 'await_move');
  assert.equal(getCurrentPlayerColor(allowedThirdSix), 'red');
});

test('capturing opponent on non-safe tile resets victim to yard and grants bonus roll', () => {
  const setup = createDefaultSetup(2);
  let state = createInitialMatch(setup);
  state = {
    ...state,
    tokens: state.tokens.map((t) => {
      if (t.id === 'red-0') return { ...t, progress: 0 };
      if (t.id === 'yellow-0') return { ...t, progress: 28 };
      return t;
    }),
  };

  const rolled = applyDiceRoll(state, 2);
  const result = executeTokenMove(rolled, 'red-0');
  assert.equal(result.capturedTokens.length, 1);
  assert.equal(result.capturedTokens[0].id, 'yellow-0');
  assert.equal(result.bonusRoll, true);
  assert.equal(getCurrentPlayerColor(result.nextState), 'red');
  assert.equal(
    result.nextState.tokens.find((t) => t.id === 'yellow-0')?.progress,
    -1,
  );
  assert.equal(result.nextState.players.red.captures, 1);
});

test('all safe star and start tiles protect tokens from capture across 4P', () => {
  const setup = createDefaultSetup(4);
  for (const safeIdx of [0, 8, 13, 21, 26, 34, 39, 47]) {
    // Place blue at safeIdx, and red 2 steps behind safeIdx
    const redTargetProgress = (safeIdx - START_TRACK_INDEX.red + 52) % 52;
    const redStartProgress = (redTargetProgress - 2 + 52) % 52;
    const blueProgress = (safeIdx - START_TRACK_INDEX.blue + 52) % 52;
    // Only test perimeter indices reachable before home stretch
    if (redStartProgress <= 48 && blueProgress <= 50) {
      let state = createInitialMatch(setup);
      state = {
        ...state,
        tokens: state.tokens.map((t) => {
          if (t.id === 'red-0') return { ...t, progress: redStartProgress };
          if (t.id === 'blue-0') return { ...t, progress: blueProgress };
          return t;
        }),
      };
      const rolled = applyDiceRoll(state, 2);
      const result = executeTokenMove(rolled, 'red-0');
      assert.equal(
        result.capturedTokens.length,
        0,
        `Safe tile ${safeIdx} must prevent capture`,
      );
    }
  }
});

test('exact roll required to reach finish (56) and 4th token wins match', () => {
  const setup = createDefaultSetup(4);
  let state = createInitialMatch(setup, Date.now(), 100);
  assert.equal(state.prizePool, 400);

  state = {
    ...state,
    tokens: state.tokens.map((t) => {
      if (t.id === 'red-0' || t.id === 'red-1' || t.id === 'red-2') {
        return { ...t, progress: 56 };
      }
      if (t.id === 'red-3') return { ...t, progress: 53 };
      return t;
    }),
  };

  // Roll of 4 is too high for progress 53 (needs exact 3)
  assert.equal(getLegalTokens(state, 'red', 4).length, 0);

  // Roll of 3 finishes red-3 and wins match
  const rolled = applyDiceRoll(state, 3);
  const res = executeTokenMove(rolled, 'red-3');
  assert.equal(res.reachedHome, true);
  assert.equal(res.winner, 'red');
  assert.equal(res.nextState.turnPhase, 'game_over');

  const rankings = getMatchRankings(res.nextState);
  assert.equal(rankings.length, 4);
  assert.equal(rankings[0].color, 'red');
  assert.equal(rankings[0].rank, 1);
  assert.equal(rankings[0].finishedTokens, 4);
});

test('easy, normal, and hard AI return valid legal moves and hard prioritizes finish/capture', () => {
  const setup = createDefaultSetup(2);
  let state = createInitialMatch(setup);
  state = {
    ...state,
    tokens: state.tokens.map((t) => {
      if (t.id === 'red-0') return { ...t, progress: 54 };
      if (t.id === 'red-1') return { ...t, progress: 10 };
      return t;
    }),
  };

  assert.ok(['red-0', 'red-1'].includes(chooseAIMove(state, 'red', 2, 'easy') ?? ''));
  assert.equal(chooseAIMove(state, 'red', 2, 'normal'), 'red-0');
  assert.equal(chooseAIMove(state, 'red', 2, 'hard'), 'red-0');
});

test('multi-token placement spreads 2, 3, 4, and 5+ co-located tokens cleanly without overlapping', () => {
  const setup = createDefaultSetup(4);

  // 2 tokens on red start cell (progress 0)
  let state = createInitialMatch(setup);
  state = {
    ...state,
    tokens: state.tokens.map((t) =>
      t.id === 'red-0' || t.id === 'red-1' ? { ...t, progress: 0 } : t,
    ),
  };
  const p2 = [0, 1].map((i) =>
    getTokenWorldPlacement(
      state.tokens.find((t) => t.id === `red-${i}`)!,
      state.tokens,
    ),
  );
  assert.ok(Math.hypot(p2[0].x - p2[1].x, p2[0].z - p2[1].z) > 0.35);
  assert.equal(p2[0].scale, 0.78);

  // 3, 4, and 5 tokens co-located on safe star cell (global index 8 -> red progress 8)
  const testIds = ['red-0', 'red-1', 'red-2', 'red-3', 'green-0'];
  for (const count of [3, 4, 5]) {
    const activeIds = new Set(testIds.slice(0, count));
    const s = {
      ...state,
      tokens: state.tokens.map((t) => {
        if (!activeIds.has(t.id)) return t;
        // green start is 13; green on global 8 needs progress 47
        return { ...t, progress: t.color === 'green' ? 47 : 8 };
      }),
    };
    const placements = [...activeIds].map((id) =>
      getTokenWorldPlacement(s.tokens.find((t) => t.id === id)!, s.tokens),
    );
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const d = Math.hypot(
          placements[i].x - placements[j].x,
          placements[i].z - placements[j].z,
        );
        assert.ok(d > 0.25, `Tokens ${i} and ${j} in group of ${count} overlap (d=${d})`);
      }
      assert.ok(placements[i].scale < 0.75 && placements[i].scale >= 0.46);
    }
  }
});

test('getMatchStatistics tracks average move time, distance traveled, and capture counts', () => {
  const setup = createDefaultSetup(2);
  let state = createInitialMatch(setup, 10_000);

  // Move 1 (red): roll 6 at 10_500, deploy red-0 (-1 -> 0 = 1 tile) at 12_000 (moveTime = 2_000ms)
  state = applyDiceRoll(state, 6, true, 10_500);
  state = executeTokenMove(state, 'red-0', 12_000).nextState;

  // Move 2 (red bonus roll): roll 3 at 12_400, move red-0 (0 -> 3 = 3 tiles) at 13_000 (moveTime = 1_000ms)
  state = applyDiceRoll(state, 3, true, 12_400);
  state = executeTokenMove(state, 'red-0', 13_000).nextState;

  // Yellow turn starts at 13_000: roll 2 (no legal moves) at 14_000 -> advances back to red at 14_000
  state = applyDiceRoll(state, 2, true, 14_000);
  assert.equal(getCurrentPlayerColor(state), 'red');
  assert.equal(state.turnStartedAtMs, 14_000);

  // Move 3 (red): place yellow-0 on global 7 (yellow progress 33) and red-0 captures with roll 4
  state = {
    ...state,
    tokens: state.tokens.map((t) =>
      t.id === 'yellow-0' ? { ...t, progress: 33 } : t,
    ),
  };
  state = applyDiceRoll(state, 4, true, 15_000);
  state = executeTokenMove(state, 'red-0', 17_000).nextState; // moveTime = 3_000ms, 4 tiles, 1 capture

  const stats = getMatchStatistics(state);
  assert.equal(stats.totalMoves, 3);
  assert.equal(stats.totalRolls, 4);
  assert.equal(stats.totalSixes, 1);
  assert.equal(stats.totalDistanceTraveled, 8); // 1 + 3 + 4
  assert.equal(stats.totalCaptures, 1);
  // (2000 + 1000 + 3000) / 3 = 2000ms
  assert.equal(stats.averageMoveTimeMs, 2000);

  const redStats = stats.players.find((p) => p.color === 'red');
  const yellowStats = stats.players.find((p) => p.color === 'yellow');
  assert.ok(redStats && yellowStats);
  assert.equal(redStats.moves, 3);
  assert.equal(redStats.distanceTraveled, 8);
  assert.equal(redStats.captures, 1);
  assert.equal(redStats.averageMoveTimeMs, 2000);
  assert.equal(yellowStats.moves, 0);
  assert.equal(yellowStats.distanceTraveled, 0);
  assert.equal(yellowStats.averageMoveTimeMs, 0);
});
