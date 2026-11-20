import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECRET_MODE_PIN,
  consumeNextDiceValue,
  createInitialSecretModeState,
  deactivateSecretMode,
  selectSecretDiceValue,
  toggleSecretPadVisibility,
  unlockSecretMode,
} from './secretHackMode';

test('Secret Mode unlocks only with exact PIN 7890 and rejects wrong PINs', () => {
  const initial = createInitialSecretModeState();
  assert.equal(initial.unlocked, false);

  const wrongEmpty = unlockSecretMode(initial, '');
  assert.equal(wrongEmpty.ok, false);
  assert.equal(wrongEmpty.state.unlocked, false);

  const wrongCode = unlockSecretMode(initial, '1234');
  assert.equal(wrongCode.ok, false);
  assert.equal(wrongCode.state.unlocked, false);

  const valid = unlockSecretMode(initial, SECRET_MODE_PIN);
  assert.equal(valid.ok, true);
  assert.equal(valid.state.unlocked, true);
  assert.equal(valid.state.padVisible, true);
  assert.equal(valid.state.queuedDiceValue, null);
});

test('Selecting 1-6 controls only the next human dice roll and falls back to random otherwise', () => {
  const unlocked = unlockSecretMode(createInitialSecretModeState(), '7890').state;

  // Selecting 6 forces the next human roll to return 6
  const withSix = selectSecretDiceValue(unlocked, 6);
  assert.equal(withSix.queuedDiceValue, 6);

  // Computer AI roll must remain random and must NOT consume human queued number
  const aiRoll = consumeNextDiceValue(withSix, true, () => 0.1);
  assert.equal(aiRoll.rolledValue, 1);
  assert.equal(aiRoll.wasForced, false);
  assert.equal(aiRoll.nextState.queuedDiceValue, 6);

  // Human roll gets the exact queued 6 and clears the queue afterward
  const humanRoll = consumeNextDiceValue(aiRoll.nextState, false, () => 0.1);
  assert.equal(humanRoll.rolledValue, 6);
  assert.equal(humanRoll.wasForced, true);
  assert.equal(humanRoll.nextState.queuedDiceValue, null);

  // Next human roll with no queued number rolls randomly
  const normalRoll = consumeNextDiceValue(humanRoll.nextState, false, () => 0.55);
  assert.equal(normalRoll.rolledValue, 4);
  assert.equal(normalRoll.wasForced, false);
});

test('Supports selecting all numbers 1-6, toggling selection off, hiding pad, and turning Secret Mode OFF', () => {
  let state = unlockSecretMode(createInitialSecretModeState(), '7890').state;

  for (let face = 1; face <= 6; face++) {
    state = selectSecretDiceValue(state, face);
    const res = consumeNextDiceValue(state, false, () => 0.99);
    assert.equal(res.rolledValue, face);
    assert.equal(res.wasForced, true);
    state = res.nextState;
  }

  // Tapping same number toggles selection off
  state = selectSecretDiceValue(state, 5);
  assert.equal(state.queuedDiceValue, 5);
  state = selectSecretDiceValue(state, 5);
  assert.equal(state.queuedDiceValue, null);

  // Hide & Show pad toggle preserves unlocked & queued state
  state = selectSecretDiceValue(state, 3);
  state = toggleSecretPadVisibility(state);
  assert.equal(state.padVisible, false);
  assert.equal(state.queuedDiceValue, 3);
  state = toggleSecretPadVisibility(state);
  assert.equal(state.padVisible, true);

  // Deactivating restores normal random dice mode
  const off = deactivateSecretMode();
  assert.equal(off.unlocked, false);
  assert.equal(off.queuedDiceValue, null);
  const afterOff = consumeNextDiceValue(off, false, () => 0.2);
  assert.equal(afterOff.wasForced, false);
  assert.equal(afterOff.rolledValue, 2);
});
