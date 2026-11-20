export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type PlayerControl = 'human' | 'ai';
export type PlayerCount = 2 | 3 | 4;
export type AIDifficulty = 'easy' | 'normal' | 'hard';
export type CameraPreset = 'classic' | 'top';
export type GameSpeed = 'normal' | 'fast';
export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type TurnPhase =
  | 'await_roll'
  | 'rolling'
  | 'await_move'
  | 'animating_move'
  | 'game_over';

export type AvatarId =
  | 'king'
  | 'knight'
  | 'dragon'
  | 'falcon'
  | 'fox'
  | 'astro'
  | 'lion'
  | 'queen';

export interface PlayerProfile {
  readonly id: string; // Internal immutable UUID/record key
  readonly playerId: string; // Auto-generated immutable public Unique Player ID (e.g. LPS-8K4M2P)
  name: string;
  age: number;
  avatarId: AvatarId;
  pinHash: string | null; // Optional 4-digit PIN hash preventing unauthorized edit/delete
  matchesPlayed: number;
  matchesWon: number;
  totalCaptures: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface PlayerProfileStore {
  version: 1;
  profiles: PlayerProfile[];
  activeSquadProfileIds: string[]; // Ordered unique profile IDs assigned to match seats (max 4)
  integrityHash: string;
}

export interface PlayerSeatSetup {
  color: PlayerColor;
  name: string;
  control: PlayerControl;
  avatarId?: AvatarId;
  profileId?: string;
  playerId?: string;
}

export interface TokenState {
  id: string;
  color: PlayerColor;
  index: number; // 0..3
  /**
   * -1 = inside home yard
   * 0..50 = steps along outer 52-tile perimeter from color's start tile
   * 51..55 = colored home stretch (5 tiles)
   * 56 = reached center crown finish
   */
  progress: number;
}

export interface PlayerStats {
  color: PlayerColor;
  name: string;
  control: PlayerControl;
  avatarId: AvatarId;
  profileId?: string;
  playerId?: string;
  captures: number;
  rolls: number;
  sixes: number;
  moves: number;
  moveTimeMs: number;
  distanceTraveled: number;
  finishedOrder: number | null; // 1 = winner, etc.
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  speed: GameSpeed;
  cameraPreset: CameraPreset;
  aiDifficulty: AIDifficulty;
  autoMoveSingle: boolean;
  threeSixesForfeit: boolean;
}

export interface PlayerProgression {
  coins: number;
  matchesPlayed: number;
  matchesWon: number;
  dailyStreak: number;
  lastClaimDate: string | null; // YYYY-MM-DD
  playerName: string;
  playerAvatar: AvatarId;
  tutorialSeen?: boolean;
}

export interface MatchState {
  playerCount: PlayerCount;
  activeColors: PlayerColor[];
  players: Record<PlayerColor, PlayerStats>;
  tokens: TokenState[];
  currentTurnIndex: number;
  turnPhase: TurnPhase;
  diceValue: number | null;
  consecutiveSixes: number;
  legalTokenIds: string[];
  winner: PlayerColor | null;
  turnNumber: number;
  statusMessage: string;
  startedAtMs: number;
  turnStartedAtMs: number;
  elapsedMs: number;
  totalMoves: number;
  totalMoveTimeMs: number;
  entryFee: number;
  prizePool: number;
  isPractice: boolean;
}

export interface MoveResult {
  nextState: MatchState;
  movedTokenId: string;
  pathProgresses: number[];
  capturedTokens: TokenState[];
  reachedHome: boolean;
  bonusRoll: boolean;
  winner: PlayerColor | null;
}

export interface PlayerRanking {
  rank: number;
  color: PlayerColor;
  name: string;
  control: PlayerControl;
  avatarId: AvatarId;
  finishedTokens: number;
  totalProgress: number;
  captures: number;
}

export interface PlayerMatchStatistics {
  color: PlayerColor;
  name: string;
  control: PlayerControl;
  avatarId: AvatarId;
  captures: number;
  rolls: number;
  sixes: number;
  moves: number;
  averageMoveTimeMs: number;
  distanceTraveled: number;
}

export interface MatchStatistics {
  averageMoveTimeMs: number;
  totalDistanceTraveled: number;
  totalCaptures: number;
  totalMoves: number;
  totalRolls: number;
  totalSixes: number;
  players: PlayerMatchStatistics[];
}
