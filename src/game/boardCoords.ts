import { PlayerColor, TokenState } from './types';

export interface GridPoint {
  col: number;
  row: number;
}

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
};

export const COLOR_LIGHT_HEX: Record<PlayerColor, string> = {
  red: '#fca5a5',
  green: '#86efac',
  yellow: '#fde047',
  blue: '#93c5fd',
};

export const COLOR_DARK_HEX: Record<PlayerColor, string> = {
  red: '#991b1b',
  green: '#166534',
  yellow: '#a16207',
  blue: '#1e40af',
};

export const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

/**
 * 52-tile clockwise outer perimeter on a 15x15 Ludo grid (col 0..14, row 0..14).
 * Index 0 is Red's start tile (1, 6).
 */
export const MAIN_TRACK_COORDS: readonly GridPoint[] = [
  // Red arm top row moving right (0..4)
  { col: 1, row: 6 }, // 0: RED START (Safe)
  { col: 2, row: 6 },
  { col: 3, row: 6 },
  { col: 4, row: 6 },
  { col: 5, row: 6 },
  // Top arm left col moving up (5..10)
  { col: 6, row: 5 },
  { col: 6, row: 4 },
  { col: 6, row: 3 },
  { col: 6, row: 2 }, // 8: STAR SAFE
  { col: 6, row: 1 },
  { col: 6, row: 0 },
  // Top turn (11..12)
  { col: 7, row: 0 },
  { col: 8, row: 0 },
  // Top arm right col moving down (13..17)
  { col: 8, row: 1 }, // 13: GREEN START (Safe)
  { col: 8, row: 2 },
  { col: 8, row: 3 },
  { col: 8, row: 4 },
  { col: 8, row: 5 },
  // Right arm top row moving right (18..23)
  { col: 9, row: 6 },
  { col: 10, row: 6 },
  { col: 11, row: 6 },
  { col: 12, row: 6 }, // 21: STAR SAFE
  { col: 13, row: 6 },
  { col: 14, row: 6 },
  // Right turn (24..25)
  { col: 14, row: 7 },
  { col: 14, row: 8 },
  // Right arm bottom row moving left (26..30)
  { col: 13, row: 8 }, // 26: YELLOW START (Safe)
  { col: 12, row: 8 },
  { col: 11, row: 8 },
  { col: 10, row: 8 },
  { col: 9, row: 8 },
  // Bottom arm right col moving down (31..36)
  { col: 8, row: 9 },
  { col: 8, row: 10 },
  { col: 8, row: 11 },
  { col: 8, row: 12 }, // 34: STAR SAFE
  { col: 8, row: 13 },
  { col: 8, row: 14 },
  // Bottom turn (37..38)
  { col: 7, row: 14 },
  { col: 6, row: 14 },
  // Bottom arm left col moving up (39..43)
  { col: 6, row: 13 }, // 39: BLUE START (Safe)
  { col: 6, row: 12 },
  { col: 6, row: 11 },
  { col: 6, row: 10 },
  { col: 6, row: 9 },
  // Left arm bottom row moving left (44..49)
  { col: 5, row: 8 },
  { col: 4, row: 8 },
  { col: 3, row: 8 },
  { col: 2, row: 8 }, // 47: STAR SAFE
  { col: 1, row: 8 },
  { col: 0, row: 8 },
  // Left turn (50..51)
  { col: 0, row: 7 },
  { col: 0, row: 6 },
];

export const START_TRACK_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_TRACK_INDICES = new Set<number>([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

export const STAR_TRACK_INDICES = new Set<number>([8, 21, 34, 47]);

export const HOME_STRETCH_COORDS: Record<PlayerColor, readonly GridPoint[]> = {
  red: [
    { col: 1, row: 7 },
    { col: 2, row: 7 },
    { col: 3, row: 7 },
    { col: 4, row: 7 },
    { col: 5, row: 7 },
  ],
  green: [
    { col: 7, row: 1 },
    { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 },
    { col: 7, row: 5 },
  ],
  yellow: [
    { col: 13, row: 7 },
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9, row: 7 },
  ],
  blue: [
    { col: 7, row: 13 },
    { col: 7, row: 12 },
    { col: 7, row: 11 },
    { col: 7, row: 10 },
    { col: 7, row: 9 },
  ],
};

export const YARD_SOCKET_COORDS: Record<PlayerColor, readonly GridPoint[]> = {
  red: [
    { col: 1.5, row: 1.5 },
    { col: 3.5, row: 1.5 },
    { col: 1.5, row: 3.5 },
    { col: 3.5, row: 3.5 },
  ],
  green: [
    { col: 10.5, row: 1.5 },
    { col: 12.5, row: 1.5 },
    { col: 10.5, row: 3.5 },
    { col: 12.5, row: 3.5 },
  ],
  yellow: [
    { col: 10.5, row: 10.5 },
    { col: 12.5, row: 10.5 },
    { col: 10.5, row: 12.5 },
    { col: 12.5, row: 12.5 },
  ],
  blue: [
    { col: 1.5, row: 10.5 },
    { col: 3.5, row: 10.5 },
    { col: 1.5, row: 12.5 },
    { col: 3.5, row: 12.5 },
  ],
};

export const FINISH_POCKET_COORDS: Record<PlayerColor, GridPoint> = {
  red: { col: 6.1, row: 7 },
  green: { col: 7, row: 6.1 },
  yellow: { col: 7.9, row: 7 },
  blue: { col: 7, row: 7.9 },
};

export function getGridPointForProgress(
  color: PlayerColor,
  tokenIndex: number,
  progress: number,
): GridPoint {
  if (progress < 0) {
    return YARD_SOCKET_COORDS[color][tokenIndex];
  }
  if (progress <= 50) {
    const globalIndex = (START_TRACK_INDEX[color] + progress) % 52;
    return MAIN_TRACK_COORDS[globalIndex];
  }
  if (progress <= 55) {
    return HOME_STRETCH_COORDS[color][progress - 51];
  }
  return FINISH_POCKET_COORDS[color];
}

export function gridToWorldXZ(point: GridPoint): { x: number; z: number } {
  return {
    x: point.col - 7,
    z: point.row - 7,
  };
}

/**
 * Computes final world (x, z) and scale factor for a token, including clean
 * multi-token cluster offsets when multiple pawns share a square or finish pocket.
 */
export function getTokenWorldPlacement(
  token: TokenState,
  allTokens: readonly TokenState[],
  progressOverride?: number,
): { x: number; z: number; scale: number } {
  const prog = progressOverride ?? token.progress;
  const baseGrid = getGridPointForProgress(token.color, token.index, prog);
  const baseXZ = gridToWorldXZ(baseGrid);

  if (prog < 0) {
    return { x: baseXZ.x, z: baseXZ.z, scale: 1.0 };
  }

  if (prog === 56) {
    const finishedSameColor = allTokens.filter(
      (t) => t.color === token.color && t.progress === 56,
    );
    const slotIdx = finishedSameColor.findIndex((t) => t.id === token.id);
    const count = Math.max(1, finishedSameColor.length);
    if (count === 1 || slotIdx < 0) {
      return { x: baseXZ.x, z: baseXZ.z, scale: 0.72 };
    }
    const isHorizontal = token.color === 'red' || token.color === 'yellow';
    const offset = (slotIdx - (count - 1) / 2) * 0.28;
    return {
      x: baseXZ.x + (isHorizontal ? 0 : offset),
      z: baseXZ.z + (isHorizontal ? offset : 0),
      scale: 0.62,
    };
  }

  // Group tokens sharing the same physical board tile
  const coLocated = allTokens.filter((other) => {
    if (other.progress < 0 || other.progress === 56) return false;
    const otherGrid = getGridPointForProgress(
      other.color,
      other.index,
      other.progress,
    );
    return otherGrid.col === baseGrid.col && otherGrid.row === baseGrid.row;
  });

  if (coLocated.length <= 1) {
    return { x: baseXZ.x, z: baseXZ.z, scale: 1.0 };
  }

  const idx = coLocated.findIndex((t) => t.id === token.id);
  if (idx < 0) {
    return { x: baseXZ.x, z: baseXZ.z, scale: 1.0 };
  }

  const count = coLocated.length;

  if (count === 2) {
    const sign = idx === 0 ? -1 : 1;
    return {
      x: baseXZ.x + sign * 0.2,
      z: baseXZ.z + sign * 0.14,
      scale: 0.78,
    };
  }

  if (count === 3) {
    const angle = (idx / 3) * Math.PI * 2 - Math.PI / 2;
    const radius = 0.25;
    return {
      x: baseXZ.x + Math.cos(angle) * radius,
      z: baseXZ.z + Math.sin(angle) * radius,
      scale: 0.68,
    };
  }

  if (count === 4) {
    const corners: Array<[number, number]> = [
      [-0.21, -0.21],
      [0.21, -0.21],
      [-0.21, 0.21],
      [0.21, 0.21],
    ];
    const [dx, dz] = corners[idx];
    return {
      x: baseXZ.x + dx,
      z: baseXZ.z + dz,
      scale: 0.62,
    };
  }

  const angle = (idx / count) * Math.PI * 2 + Math.PI / 6;
  const radius = 0.29;
  const scale = Math.max(0.46, 0.7 - count * 0.03);

  return {
    x: baseXZ.x + Math.cos(angle) * radius,
    z: baseXZ.z + Math.sin(angle) * radius,
    scale,
  };
}
