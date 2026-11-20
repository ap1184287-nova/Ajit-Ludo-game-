import {
  AvatarId,
  MatchState,
  PlayerProfile,
  PlayerProfileStore,
  PlayerSeatSetup,
} from './types';

export const PLAYER_PROFILES_STORAGE_KEY = 'ludo_player_system_store_v1';
export const MAX_MATCH_PLAYERS = 4;
export const MIN_PLAYER_AGE = 5;
export const MAX_PLAYER_AGE = 120;

const INTEGRITY_SALT = 'LUDO_PLAYER_SYSTEM_AJIT_KUMAR_V1';
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ProfileInput {
  name: string;
  age: number | string;
  avatarId: AvatarId;
  pin?: string;
}

export interface ProfileMutationResult {
  ok: boolean;
  store: PlayerProfileStore;
  profile?: PlayerProfile;
  error?: string;
}

export interface StoreLoadResult {
  store: PlayerProfileStore;
  tamperDetected: boolean;
}

function fnv1aHex(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function computeIntegrityHash(
  profiles: readonly PlayerProfile[],
  activeSquadProfileIds: readonly string[],
): string {
  const canonical = JSON.stringify({
    v: 1,
    profiles: profiles.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      age: p.age,
      avatarId: p.avatarId,
      pinHash: p.pinHash,
      matchesPlayed: p.matchesPlayed,
      matchesWon: p.matchesWon,
      totalCaptures: p.totalCaptures,
      createdAtMs: p.createdAtMs,
      updatedAtMs: p.updatedAtMs,
    })),
    squad: activeSquadProfileIds,
  });
  const partA = fnv1aHex(`${INTEGRITY_SALT}|A|${canonical}`, 0x811c9dc5);
  const partB = fnv1aHex(`${canonical}|B|${INTEGRITY_SALT}`, 0x9e3779b9);
  return `${partA}${partB}`;
}

export function hashPin(pin: string, profileId: string): string {
  const trimmed = pin.trim();
  const a = fnv1aHex(`${INTEGRITY_SALT}:PIN:${profileId}:${trimmed}`, 0x811c9dc5);
  const b = fnv1aHex(`${trimmed}:${profileId}:LOCK`, 0x9e3779b9);
  return `${a}${b}`;
}

export function verifyProfilePin(profile: PlayerProfile, pin?: string): boolean {
  if (!profile.pinHash) return true;
  if (!pin || !/^\d{4}$/.test(pin.trim())) return false;
  return hashPin(pin.trim(), profile.id) === profile.pinHash;
}

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateProfileInput(input: ProfileInput): {
  valid: boolean;
  error?: string;
  cleanName: string;
  cleanAge: number;
  cleanPin: string | null;
} {
  const cleanName = normalizePlayerName(input.name);
  if (cleanName.length < 2) {
    return {
      valid: false,
      error: 'Player name must be at least 2 characters.',
      cleanName,
      cleanAge: 0,
      cleanPin: null,
    };
  }
  if (cleanName.length > 24) {
    return {
      valid: false,
      error: 'Player name must be 24 characters or fewer.',
      cleanName,
      cleanAge: 0,
      cleanPin: null,
    };
  }

  const parsedAge =
    typeof input.age === 'number' ? input.age : Number(String(input.age).trim());
  if (
    !Number.isFinite(parsedAge) ||
    !Number.isInteger(parsedAge) ||
    parsedAge < MIN_PLAYER_AGE ||
    parsedAge > MAX_PLAYER_AGE
  ) {
    return {
      valid: false,
      error: `Age must be a whole number between ${MIN_PLAYER_AGE} and ${MAX_PLAYER_AGE}.`,
      cleanName,
      cleanAge: 0,
      cleanPin: null,
    };
  }

  const rawPin = (input.pin ?? '').trim();
  if (rawPin.length > 0 && !/^\d{4}$/.test(rawPin)) {
    return {
      valid: false,
      error: 'Security PIN must be exactly 4 digits (or leave blank).',
      cleanName,
      cleanAge: parsedAge,
      cleanPin: null,
    };
  }

  return {
    valid: true,
    cleanName,
    cleanAge: parsedAge,
    cleanPin: rawPin.length === 4 ? rawPin : null,
  };
}

export function generateUniquePlayerId(
  existingProfiles: readonly PlayerProfile[],
): string {
  const existing = new Set(existingProfiles.map((p) => p.playerId));
  for (let attempt = 0; attempt < 200; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * ID_ALPHABET.length);
      suffix += ID_ALPHABET[idx];
    }
    const candidate = `LPS-${suffix}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  const fallback = Date.now().toString(36).toUpperCase().slice(-6).padStart(6, 'X');
  return `LPS-${fallback}`;
}

function generateInternalId(existingProfiles: readonly PlayerProfile[]): string {
  const existing = new Set(existingProfiles.map((p) => p.id));
  let candidate = `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  while (existing.has(candidate)) {
    candidate = `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return candidate;
}

function buildSignedStore(
  profiles: PlayerProfile[],
  activeSquadProfileIds: string[],
): PlayerProfileStore {
  const profileSet = new Set(profiles.map((p) => p.id));
  const seenSquad = new Set<string>();
  const cleanSquad: string[] = [];
  for (const id of activeSquadProfileIds) {
    if (profileSet.has(id) && !seenSquad.has(id) && cleanSquad.length < MAX_MATCH_PLAYERS) {
      seenSquad.add(id);
      cleanSquad.push(id);
    }
  }
  return {
    version: 1,
    profiles,
    activeSquadProfileIds: cleanSquad,
    integrityHash: computeIntegrityHash(profiles, cleanSquad),
  };
}

export function createEmptyProfileStore(): PlayerProfileStore {
  return buildSignedStore([], []);
}

export function createDefaultProfileStore(nowMs: number = Date.now()): PlayerProfileStore {
  const starterId = 'prof_starter_01';
  const starter: PlayerProfile = {
    id: starterId,
    playerId: 'LPS-100001',
    name: 'Player 1',
    age: 21,
    avatarId: 'king',
    pinHash: null,
    matchesPlayed: 0,
    matchesWon: 0,
    totalCaptures: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
  return buildSignedStore([starter], [starterId]);
}

export function verifyProfileStoreIntegrity(store: unknown): store is PlayerProfileStore {
  if (!store || typeof store !== 'object') return false;
  const s = store as Partial<PlayerProfileStore>;
  if (s.version !== 1 || !Array.isArray(s.profiles) || !Array.isArray(s.activeSquadProfileIds)) {
    return false;
  }
  if (typeof s.integrityHash !== 'string' || s.integrityHash.length !== 16) {
    return false;
  }

  const seenIds = new Set<string>();
  const seenPlayerIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const p of s.profiles) {
    if (!p || typeof p !== 'object') return false;
    // Reject unauthorized token color association inside profile schema
    if ('color' in (p as unknown as Record<string, unknown>)) return false;
    if (typeof p.id !== 'string' || !p.id) return false;
    if (typeof p.playerId !== 'string' || !/^LPS-[A-Z0-9]{6}$/.test(p.playerId)) return false;
    if (typeof p.name !== 'string') return false;
    const normName = normalizePlayerName(p.name).toLowerCase();
    if (normName.length < 2 || normName.length > 24) return false;
    if (
      typeof p.age !== 'number' ||
      !Number.isInteger(p.age) ||
      p.age < MIN_PLAYER_AGE ||
      p.age > MAX_PLAYER_AGE
    ) {
      return false;
    }
    if (seenIds.has(p.id) || seenPlayerIds.has(p.playerId) || seenNames.has(normName)) {
      return false;
    }
    seenIds.add(p.id);
    seenPlayerIds.add(p.playerId);
    seenNames.add(normName);
  }

  if (s.activeSquadProfileIds.length > MAX_MATCH_PLAYERS) return false;
  const expected = computeIntegrityHash(s.profiles, s.activeSquadProfileIds);
  return s.integrityHash === expected;
}

export function createPlayerProfile(
  store: PlayerProfileStore,
  input: ProfileInput,
  nowMs: number = Date.now(),
): ProfileMutationResult {
  const check = validateProfileInput(input);
  if (!check.valid) {
    return { ok: false, store, error: check.error };
  }

  const dup = store.profiles.some(
    (p) => p.name.toLowerCase() === check.cleanName.toLowerCase(),
  );
  if (dup) {
    return {
      ok: false,
      store,
      error: `Profile "${check.cleanName}" already exists. Duplicate profiles are not allowed.`,
    };
  }

  const internalId = generateInternalId(store.profiles);
  const playerId = generateUniquePlayerId(store.profiles);
  const profile: PlayerProfile = {
    id: internalId,
    playerId,
    name: check.cleanName,
    age: check.cleanAge,
    avatarId: input.avatarId,
    pinHash: check.cleanPin ? hashPin(check.cleanPin, internalId) : null,
    matchesPlayed: 0,
    matchesWon: 0,
    totalCaptures: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };

  const nextProfiles = [...store.profiles, profile];
  const nextSquad =
    store.activeSquadProfileIds.length < MAX_MATCH_PLAYERS
      ? [...store.activeSquadProfileIds, profile.id]
      : [...store.activeSquadProfileIds];

  const nextStore = buildSignedStore(nextProfiles, nextSquad);
  return { ok: true, store: nextStore, profile };
}

export function updatePlayerProfile(
  store: PlayerProfileStore,
  profileId: string,
  input: ProfileInput,
  authPin?: string,
  nowMs: number = Date.now(),
  clearPin: boolean = false,
): ProfileMutationResult {
  const existing = store.profiles.find((p) => p.id === profileId);
  if (!existing) {
    return { ok: false, store, error: 'Profile not found.' };
  }

  if (!verifyProfilePin(existing, authPin)) {
    return {
      ok: false,
      store,
      error: 'Invalid 4-digit PIN. Unauthorized profile edit blocked.',
    };
  }

  const check = validateProfileInput(input);
  if (!check.valid) {
    return { ok: false, store, error: check.error };
  }

  const dup = store.profiles.some(
    (p) =>
      p.id !== profileId &&
      p.name.toLowerCase() === check.cleanName.toLowerCase(),
  );
  if (dup) {
    return {
      ok: false,
      store,
      error: `Another profile already uses the name "${check.cleanName}".`,
    };
  }

  const nextPinHash = clearPin
    ? null
    : check.cleanPin
      ? hashPin(check.cleanPin, existing.id)
      : existing.pinHash;

  const updated: PlayerProfile = {
    ...existing,
    // playerId and id remain strictly immutable
    name: check.cleanName,
    age: check.cleanAge,
    avatarId: input.avatarId,
    pinHash: nextPinHash,
    updatedAtMs: nowMs,
  };

  const nextProfiles = store.profiles.map((p) =>
    p.id === profileId ? updated : p,
  );
  const nextStore = buildSignedStore(nextProfiles, store.activeSquadProfileIds);
  return { ok: true, store: nextStore, profile: updated };
}

export function deletePlayerProfile(
  store: PlayerProfileStore,
  profileId: string,
  authPin?: string,
  lockedMatchProfileIds: readonly string[] = [],
): ProfileMutationResult {
  const existing = store.profiles.find((p) => p.id === profileId);
  if (!existing) {
    return { ok: false, store, error: 'Profile not found.' };
  }

  if (lockedMatchProfileIds.includes(profileId)) {
    return {
      ok: false,
      store,
      error: 'Finish or exit the active match before deleting this profile.',
    };
  }

  if (!verifyProfilePin(existing, authPin)) {
    return {
      ok: false,
      store,
      error: 'Invalid 4-digit PIN. Unauthorized profile deletion blocked.',
    };
  }

  const nextProfiles = store.profiles.filter((p) => p.id !== profileId);
  const nextSquad = store.activeSquadProfileIds.filter((id) => id !== profileId);
  const nextStore = buildSignedStore(nextProfiles, nextSquad);
  return { ok: true, store: nextStore };
}

export function toggleProfileInSquad(
  store: PlayerProfileStore,
  profileId: string,
): ProfileMutationResult {
  const exists = store.profiles.some((p) => p.id === profileId);
  if (!exists) {
    return { ok: false, store, error: 'Profile does not exist.' };
  }

  const isSelected = store.activeSquadProfileIds.includes(profileId);
  if (isSelected) {
    const nextSquad = store.activeSquadProfileIds.filter((id) => id !== profileId);
    return {
      ok: true,
      store: buildSignedStore(store.profiles, nextSquad),
    };
  }

  if (store.activeSquadProfileIds.length >= MAX_MATCH_PLAYERS) {
    return {
      ok: false,
      store,
      error: `Maximum ${MAX_MATCH_PLAYERS} players can be added to a match.`,
    };
  }

  const nextSquad = [...store.activeSquadProfileIds, profileId];
  return {
    ok: true,
    store: buildSignedStore(store.profiles, nextSquad),
  };
}

export function applySquadToSeats(
  seats: readonly PlayerSeatSetup[],
  store: PlayerProfileStore,
): PlayerSeatSetup[] {
  const profileMap = new Map(store.profiles.map((p) => [p.id, p]));
  const squadProfiles = store.activeSquadProfileIds
    .map((id) => profileMap.get(id))
    .filter((p): p is PlayerProfile => Boolean(p))
    .slice(0, seats.length);

  return seats.map((seat, idx) => {
    const assigned = squadProfiles[idx];
    if (assigned) {
      return {
        ...seat,
        control: 'human',
        name: assigned.name,
        avatarId: assigned.avatarId,
        profileId: assigned.id,
        playerId: assigned.playerId,
      };
    }
    return {
      ...seat,
      profileId: undefined,
      playerId: undefined,
    };
  });
}

export function recordMatchOutcomeForProfiles(
  store: PlayerProfileStore,
  match: MatchState,
  nowMs: number = Date.now(),
): PlayerProfileStore {
  if (!match.winner) return store;

  const statsByProfileId = new Map<
    string,
    { won: boolean; captures: number }
  >();

  for (const color of match.activeColors) {
    const pStats = match.players[color];
    if (pStats.profileId) {
      statsByProfileId.set(pStats.profileId, {
        won: color === match.winner,
        captures: pStats.captures,
      });
    }
  }

  if (statsByProfileId.size === 0) return store;

  const nextProfiles = store.profiles.map((prof) => {
    const delta = statsByProfileId.get(prof.id);
    if (!delta) return prof;
    return {
      ...prof,
      matchesPlayed: prof.matchesPlayed + 1,
      matchesWon: prof.matchesWon + (delta.won ? 1 : 0),
      totalCaptures: prof.totalCaptures + delta.captures,
      updatedAtMs: nowMs,
    };
  });

  return buildSignedStore(nextProfiles, store.activeSquadProfileIds);
}

export function loadProfileStore(): StoreLoadResult {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILES_STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultProfileStore();
      saveProfileStore(initial);
      return { store: initial, tamperDetected: false };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!verifyProfileStoreIntegrity(parsed)) {
      return {
        store: createEmptyProfileStore(),
        tamperDetected: true,
      };
    }
    return { store: parsed, tamperDetected: false };
  } catch {
    return {
      store: createEmptyProfileStore(),
      tamperDetected: true,
    };
  }
}

export function saveProfileStore(store: PlayerProfileStore): void {
  try {
    localStorage.setItem(PLAYER_PROFILES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}
