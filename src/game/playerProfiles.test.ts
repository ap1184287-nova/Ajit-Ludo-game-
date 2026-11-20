import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySquadToSeats,
  computeIntegrityHash,
  createDefaultProfileStore,
  createEmptyProfileStore,
  createPlayerProfile,
  deletePlayerProfile,
  recordMatchOutcomeForProfiles,
  toggleProfileInSquad,
  updatePlayerProfile,
  verifyProfileStoreIntegrity,
} from './playerProfiles';
import {
  applyDiceRoll,
  createDefaultSetup,
  createInitialMatch,
  executeTokenMove,
} from './rules';

test('auto-generates unique LPS-XXXXXX Player ID and keeps it immutable on edit', () => {
  let store = createEmptyProfileStore();
  const r1 = createPlayerProfile(store, {
    name: 'Aarav Sharma',
    age: 22,
    avatarId: 'knight',
  });
  assert.equal(r1.ok, true);
  assert.ok(r1.profile);
  assert.match(r1.profile.playerId, /^LPS-[A-Z0-9]{6}$/);
  assert.equal('color' in (r1.profile as unknown as Record<string, unknown>), false);

  store = r1.store;
  const r2 = createPlayerProfile(store, {
    name: 'Priya Singh',
    age: 19,
    avatarId: 'queen',
  });
  assert.equal(r2.ok, true);
  assert.ok(r2.profile);
  assert.notEqual(r1.profile.playerId, r2.profile.playerId);

  const edited = updatePlayerProfile(r2.store, r1.profile.id, {
    name: 'Aarav K',
    age: 23,
    avatarId: 'dragon',
  });
  assert.equal(edited.ok, true);
  assert.equal(edited.profile?.playerId, r1.profile.playerId);
  assert.equal(edited.profile?.name, 'Aarav K');
  assert.equal(edited.profile?.age, 23);
});

test('prevents duplicate player profiles and validates name and age bounds', () => {
  let store = createEmptyProfileStore();
  const badName = createPlayerProfile(store, {
    name: 'A',
    age: 20,
    avatarId: 'king',
  });
  assert.equal(badName.ok, false);

  const badAge = createPlayerProfile(store, {
    name: 'Rohan',
    age: 3,
    avatarId: 'king',
  });
  assert.equal(badAge.ok, false);

  const created = createPlayerProfile(store, {
    name: 'Rohan Verma',
    age: 24,
    avatarId: 'lion',
  });
  assert.equal(created.ok, true);
  store = created.store;

  const duplicate = createPlayerProfile(store, {
    name: '  rohan   verma ',
    age: 28,
    avatarId: 'fox',
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error ?? '', /already exists/i);
});

test('PIN protection blocks unauthorized profile edits and deletions', () => {
  let store = createEmptyProfileStore();
  const res = createPlayerProfile(store, {
    name: 'Vikram',
    age: 26,
    avatarId: 'falcon',
    pin: '4821',
  });
  assert.equal(res.ok, true);
  store = res.store;
  const id = res.profile!.id;

  // Attempt edit without PIN
  const unauthEdit = updatePlayerProfile(store, id, {
    name: 'Hacked',
    age: 30,
    avatarId: 'fox',
  });
  assert.equal(unauthEdit.ok, false);

  // Attempt delete with wrong PIN
  const unauthDelete = deletePlayerProfile(store, id, '9999');
  assert.equal(unauthDelete.ok, false);
  assert.equal(unauthDelete.store.profiles.length, 1);

  // Authorized edit with valid PIN succeeds
  const authEdit = updatePlayerProfile(
    store,
    id,
    { name: 'Vikram Rana', age: 27, avatarId: 'astro' },
    '4821',
  );
  assert.equal(authEdit.ok, true);
  assert.equal(authEdit.profile?.name, 'Vikram Rana');

  // Active match lock prevents deleting participating profile
  const matchBlocked = deletePlayerProfile(authEdit.store, id, '4821', [id]);
  assert.equal(matchBlocked.ok, false);

  // Authorized delete succeeds when not in active match
  const authDelete = deletePlayerProfile(authEdit.store, id, '4821');
  assert.equal(authDelete.ok, true);
  assert.equal(authDelete.store.profiles.length, 0);
});

test('integrity verification detects tampered external data and blocks color injection', () => {
  const store = createDefaultProfileStore(1000);
  assert.equal(verifyProfileStoreIntegrity(store), true);

  const tamperedName = {
    ...store,
    profiles: store.profiles.map((p) => ({ ...p, matchesWon: 999 })),
  };
  assert.equal(verifyProfileStoreIntegrity(tamperedName), false);

  const injectedColorProfile = {
    ...store.profiles[0],
    color: 'red',
  };
  const forged = {
    ...store,
    profiles: [injectedColorProfile as never],
    integrityHash: computeIntegrityHash(
      [injectedColorProfile as never],
      store.activeSquadProfileIds,
    ),
  };
  assert.equal(verifyProfileStoreIntegrity(forged), false);
});

test('allows maximum 4 unique players in a match squad and isolates per-player multiplayer stats', () => {
  let store = createEmptyProfileStore();
  const names = ['Player One', 'Player Two', 'Player Three', 'Player Four', 'Player Five'];
  for (const name of names) {
    const r = createPlayerProfile(store, { name, age: 20, avatarId: 'king' });
    assert.equal(r.ok, true);
    store = r.store;
  }

  // First 4 automatically join squad; 5th cannot exceed max 4
  assert.equal(store.activeSquadProfileIds.length, 4);
  const fifthId = store.profiles[4].id;
  const addFifth = toggleProfileInSquad(store, fifthId);
  assert.equal(addFifth.ok, false);

  // Remove 4th, add 5th
  const remFourth = toggleProfileInSquad(store, store.profiles[3].id);
  assert.equal(remFourth.ok, true);
  const swapFifth = toggleProfileInSquad(remFourth.store, fifthId);
  assert.equal(swapFifth.ok, true);
  store = swapFifth.store;
  assert.equal(store.activeSquadProfileIds.length, 4);
  assert.equal(new Set(store.activeSquadProfileIds).size, 4);

  // Apply squad to 2-player seats and verify independent profile stats after match win
  const baseSeats = createDefaultSetup(2);
  const mappedSeats = applySquadToSeats(baseSeats, store);
  assert.equal(mappedSeats[0].name, 'Player One');
  assert.equal(mappedSeats[0].playerId, store.profiles[0].playerId);
  assert.equal(mappedSeats[1].name, 'Player Two');
  assert.equal(mappedSeats[1].playerId, store.profiles[1].playerId);

  let match = createInitialMatch(mappedSeats);
  match = {
    ...match,
    tokens: match.tokens.map((t) => {
      if (t.id === 'red-0' || t.id === 'red-1' || t.id === 'red-2') {
        return { ...t, progress: 56 };
      }
      if (t.id === 'red-3') return { ...t, progress: 54 };
      return t;
    }),
  };
  match = applyDiceRoll(match, 2);
  match = executeTokenMove(match, 'red-3').nextState;
  assert.equal(match.winner, 'red');

  const afterOutcome = recordMatchOutcomeForProfiles(store, match);
  assert.equal(afterOutcome.profiles[0].matchesPlayed, 1);
  assert.equal(afterOutcome.profiles[0].matchesWon, 1);
  assert.equal(afterOutcome.profiles[1].matchesPlayed, 1);
  assert.equal(afterOutcome.profiles[1].matchesWon, 0);
  assert.equal(afterOutcome.profiles[4].matchesPlayed, 0);
  assert.equal(verifyProfileStoreIntegrity(afterOutcome), true);
});
