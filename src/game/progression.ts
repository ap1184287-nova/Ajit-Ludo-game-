import { AvatarId, PlayerColor, PlayerProgression } from './types';

const PROGRESSION_STORAGE_KEY = 'ludo_mod_progression_v1';

export const ALL_AVATARS: readonly { id: AvatarId; label: string }[] = [
  { id: 'king', label: 'Royal King' },
  { id: 'queen', label: 'Crown Queen' },
  { id: 'knight', label: 'Cyber Knight' },
  { id: 'dragon', label: 'Jade Dragon' },
  { id: 'lion', label: 'Golden Lion' },
  { id: 'falcon', label: 'Sapphire Falcon' },
  { id: 'fox', label: 'Mystic Fox' },
  { id: 'astro', label: 'Star Voyager' },
];

export const DEFAULT_COLOR_AVATAR: Record<PlayerColor, AvatarId> = {
  red: 'king',
  green: 'dragon',
  yellow: 'lion',
  blue: 'falcon',
};

export const DAILY_REWARD_SCHEDULE = [500, 750, 1000, 1250, 1500, 2000, 3000];

export const DEFAULT_PROGRESSION: PlayerProgression = {
  coins: 2500,
  matchesPlayed: 0,
  matchesWon: 0,
  dailyStreak: 0,
  lastClaimDate: null,
  playerName: 'Player 1',
  playerAvatar: 'king',
};

export function getTodayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canClaimDailyReward(
  prog: PlayerProgression,
  now: Date = new Date(),
): boolean {
  return prog.lastClaimDate !== getTodayKey(now);
}

export function getNextDailyRewardAmount(prog: PlayerProgression): number {
  const idx = prog.dailyStreak % DAILY_REWARD_SCHEDULE.length;
  return DAILY_REWARD_SCHEDULE[idx];
}

export function claimDailyReward(
  prog: PlayerProgression,
  now: Date = new Date(),
): { updated: PlayerProgression; reward: number } {
  const today = getTodayKey(now);
  if (prog.lastClaimDate === today) {
    return { updated: prog, reward: 0 };
  }
  const reward = getNextDailyRewardAmount(prog);
  const updated: PlayerProgression = {
    ...prog,
    coins: prog.coins + reward,
    dailyStreak: prog.dailyStreak + 1,
    lastClaimDate: today,
  };
  saveProgression(updated);
  return { updated, reward };
}

export function loadProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESSION;
    const parsed = JSON.parse(raw) as Partial<PlayerProgression>;
    return { ...DEFAULT_PROGRESSION, ...parsed };
  } catch {
    return DEFAULT_PROGRESSION;
  }
}

export function saveProgression(prog: PlayerProgression): void {
  try {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(prog));
  } catch {
    // Ignore storage quota errors in offline WebViews
  }
}
