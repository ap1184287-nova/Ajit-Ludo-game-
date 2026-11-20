import * as THREE from 'three';
import {
  COLOR_DARK_HEX,
  COLOR_HEX,
  COLOR_LIGHT_HEX,
  MAIN_TRACK_COORDS,
  STAR_TRACK_INDICES,
  START_TRACK_INDEX,
  YARD_SOCKET_COORDS,
} from '../game/boardCoords';
import { PlayerColor } from '../game/types';

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius,
    );
    rot += step;
    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius,
    );
    rot += step;
  }
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface BoardTextures {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  diceFaces: THREE.CanvasTexture[];
  contactShadow: THREE.CanvasTexture;
  tableMat: THREE.CanvasTexture;
}

export function createBoardTextures(maxAnisotropy: number): BoardTextures {
  const size = 2048;
  const cell = size / 15;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 1024;
  const bCtx = bumpCanvas.getContext('2d')!;
  const bCell = 1024 / 15;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 1024;
  roughCanvas.height = 1024;
  const rCtx = roughCanvas.getContext('2d')!;

  // Crisp royal border backing between cells
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#6e6e6e';
  bCtx.fillRect(0, 0, 1024, 1024);

  rCtx.fillStyle = '#555555';
  rCtx.fillRect(0, 0, 1024, 1024);

  // Subtle gold hairline grid inlay between tiles
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 2;
  for (let g = 0; g <= 15; g++) {
    const pos = g * cell;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Draw all 52 main track tiles in crisp ivory porcelain with Ludo King proportions
  MAIN_TRACK_COORDS.forEach((pt, idx) => {
    const x = pt.col * cell;
    const y = pt.row * cell;
    const pad = cell * 0.028;

    let borderColor = '#64748b';

    let startColor: PlayerColor | null = null;
    for (const c of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
      if (START_TRACK_INDEX[c] === idx) startColor = c;
    }

    if (startColor) {
      borderColor = '#fef3c7';
    } else if (STAR_TRACK_INDICES.has(idx)) {
      borderColor = '#d97706';
    }

    drawRoundedRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, 12);
    if (startColor) {
      const sGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      sGrad.addColorStop(0, COLOR_LIGHT_HEX[startColor]);
      sGrad.addColorStop(0.45, COLOR_HEX[startColor]);
      sGrad.addColorStop(1, COLOR_DARK_HEX[startColor]);
      ctx.fillStyle = sGrad;
    } else if (STAR_TRACK_INDICES.has(idx)) {
      const stGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      stGrad.addColorStop(0, '#fef9c3');
      stGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = stGrad;
    } else {
      const nGrad = ctx.createLinearGradient(x, y, x, y + cell);
      nGrad.addColorStop(0, '#ffffff');
      nGrad.addColorStop(1, (pt.col + pt.row) % 2 === 0 ? '#f8fafc' : '#eef2f7');
      ctx.fillStyle = nGrad;
    }
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Inner specular bevel highlight on top of each tile
    drawRoundedRect(
      ctx,
      x + pad + 4,
      y + pad + 4,
      cell - (pad + 4) * 2,
      cell - (pad + 4) * 2,
      9,
    );
    ctx.lineWidth = 2;
    ctx.strokeStyle = startColor
      ? 'rgba(255,255,255,0.55)'
      : 'rgba(255,255,255,0.92)';
    ctx.stroke();

    // Bump & roughness
    const bx = pt.col * bCell;
    const by = pt.row * bCell;
    const bPad = bCell * 0.03;
    bCtx.fillStyle = '#dcdcdc';
    bCtx.fillRect(bx + bPad, by + bPad, bCell - bPad * 2, bCell - bPad * 2);

    rCtx.fillStyle = startColor ? '#262626' : '#303030';
    rCtx.fillRect(bx + bPad, by + bPad, bCell - bPad * 2, bCell - bPad * 2);

    // Directional arrow on start tiles
    if (startColor) {
      ctx.save();
      ctx.translate(x + cell / 2, y + cell / 2);
      const angleMap: Record<PlayerColor, number> = {
        red: 0,
        green: Math.PI / 2,
        yellow: Math.PI,
        blue: -Math.PI / 2,
      };
      ctx.rotate(angleMap[startColor]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cell * 0.28, 0);
      ctx.lineTo(-cell * 0.16, -cell * 0.23);
      ctx.lineTo(-cell * 0.06, 0);
      ctx.lineTo(-cell * 0.16, cell * 0.23);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Ornate 8-point Gold Star emblem on Safe Star tiles
    if (STAR_TRACK_INDICES.has(idx)) {
      ctx.save();
      drawStar(ctx, x + cell / 2, y + cell / 2, 8, cell * 0.37, cell * 0.16);
      const starGrad = ctx.createRadialGradient(
        x + cell / 2,
        y + cell / 2,
        4,
        x + cell / 2,
        y + cell / 2,
        cell * 0.37,
      );
      starGrad.addColorStop(0, '#fef08a');
      starGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = starGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#78350f';
      ctx.stroke();
      ctx.restore();
    }
  });

  // Colored Home Stretch columns (5 glossy jewel tiles per color)
  const homeCols: Record<PlayerColor, Array<{ col: number; row: number }>> = {
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

  (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).forEach((color) => {
    homeCols[color].forEach((pt, idx) => {
      const x = pt.col * cell;
      const y = pt.row * cell;
      const pad = cell * 0.028;
      drawRoundedRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, 12);
      const tGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      tGrad.addColorStop(0, COLOR_LIGHT_HEX[color]);
      tGrad.addColorStop(0.5, COLOR_HEX[color]);
      tGrad.addColorStop(1, COLOR_DARK_HEX[color]);
      ctx.fillStyle = tGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#fef3c7';
      ctx.stroke();

      // Chevron pointing home
      ctx.save();
      ctx.translate(x + cell / 2, y + cell / 2);
      const rot: Record<PlayerColor, number> = {
        red: 0,
        green: Math.PI / 2,
        yellow: Math.PI,
        blue: -Math.PI / 2,
      };
      ctx.rotate(rot[color]);
      ctx.fillStyle =
        idx === 4 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.58)';
      ctx.beginPath();
      ctx.moveTo(cell * 0.19, 0);
      ctx.lineTo(-cell * 0.12, -cell * 0.19);
      ctx.lineTo(-cell * 0.04, 0);
      ctx.lineTo(-cell * 0.12, cell * 0.19);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const bx = pt.col * bCell;
      const by = pt.row * bCell;
      const bPad = bCell * 0.03;
      bCtx.fillStyle = '#dcdcdc';
      bCtx.fillRect(bx + bPad, by + bPad, bCell - bPad * 2, bCell - bPad * 2);
      rCtx.fillStyle = '#242424';
      rCtx.fillRect(bx + bPad, by + bPad, bCell - bPad * 2, bCell - bPad * 2);
    });
  });

  // Draw 4 Vibrant Royal Corner Yards (authentic 6x6 Ludo King proportions)
  const yards: Array<{ color: PlayerColor; col: number; row: number }> = [
    { color: 'red', col: 0, row: 0 },
    { color: 'green', col: 9, row: 0 },
    { color: 'yellow', col: 9, row: 9 },
    { color: 'blue', col: 0, row: 9 },
  ];

  yards.forEach(({ color, col, row }) => {
    const x = col * cell;
    const y = row * cell;
    const w = cell * 6;
    const pad = cell * 0.06;

    drawRoundedRect(ctx, x + pad, y + pad, w - pad * 2, w - pad * 2, 34);
    const grad = ctx.createLinearGradient(x, y, x + w, y + w);
    grad.addColorStop(0, COLOR_LIGHT_HEX[color]);
    grad.addColorStop(0.32, COLOR_HEX[color]);
    grad.addColorStop(1, COLOR_DARK_HEX[color]);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Crisp pearl-white inner home arena
    const innerPad = cell * 0.82;
    drawRoundedRect(
      ctx,
      x + innerPad,
      y + innerPad,
      w - innerPad * 2,
      w - innerPad * 2,
      26,
    );
    const innerGrad = ctx.createLinearGradient(
      x + innerPad,
      y + innerPad,
      x + w - innerPad,
      y + w - innerPad,
    );
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = COLOR_DARK_HEX[color];
    ctx.stroke();

    // Subtle decorative center diamond crest in each yard
    ctx.save();
    const ycx = x + w / 2;
    const ycy = y + w / 2;
    ctx.translate(ycx, ycy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `${COLOR_HEX[color]}1a`;
    ctx.fillRect(-cell * 0.45, -cell * 0.45, cell * 0.9, cell * 0.9);
    ctx.restore();

    // 4 Jewel Pawn Sockets inside yard (clean circular pedestals)
    YARD_SOCKET_COORDS[color].forEach((s) => {
      const sx = (s.col + 0.5) * cell;
      const sy = (s.row + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_HEX[color];
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.44, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    });

    const bx = col * bCell;
    const by = row * bCell;
    const bw = bCell * 6;
    bCtx.fillStyle = '#e2e2e2';
    bCtx.fillRect(bx + 4, by + 4, bw - 8, bw - 8);
    rCtx.fillStyle = '#262626';
    rCtx.fillRect(bx + 4, by + 4, bw - 8, bw - 8);
  });

  // Draw Center 3x3 Home Goal Triangles
  const cStart = 6 * cell;
  const cSize = 3 * cell;
  const cx = 7.5 * cell;
  const cy = 7.5 * cell;

  const triangles: Array<{
    color: PlayerColor;
    p1: [number, number];
    p2: [number, number];
  }> = [
    { color: 'red', p1: [cStart, cStart], p2: [cStart, cStart + cSize] },
    { color: 'green', p1: [cStart, cStart], p2: [cStart + cSize, cStart] },
    {
      color: 'yellow',
      p1: [cStart + cSize, cStart],
      p2: [cStart + cSize, cStart + cSize],
    },
    {
      color: 'blue',
      p1: [cStart, cStart + cSize],
      p2: [cStart + cSize, cStart + cSize],
    },
  ];

  triangles.forEach(({ color, p1, p2 }) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    const triGrad = ctx.createLinearGradient(cx, cy, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
    triGrad.addColorStop(0, COLOR_LIGHT_HEX[color]);
    triGrad.addColorStop(0.5, COLOR_HEX[color]);
    triGrad.addColorStop(1, COLOR_DARK_HEX[color]);
    ctx.fillStyle = triGrad;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();
  });

  // Sleek Center Dice Medallion leaving finish pockets crisp & visible
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAnisotropy;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = maxAnisotropy;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.anisotropy = maxAnisotropy;

  const diceFaces = [1, 2, 3, 4, 5, 6].map((val) =>
    createDieFaceTexture(val, maxAnisotropy),
  );

  // Soft radial contact shadow disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const rad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  rad.addColorStop(0, 'rgba(0,0,0,0.68)');
  rad.addColorStop(0.55, 'rgba(0,0,0,0.30)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = rad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // Rich Royal Indigo Felt Arena Tabletop
  const matCanvas = document.createElement('canvas');
  matCanvas.width = 512;
  matCanvas.height = 512;
  const mCtx = matCanvas.getContext('2d')!;
  const mGrad = mCtx.createRadialGradient(256, 256, 20, 256, 256, 256);
  mGrad.addColorStop(0, '#2a2460');
  mGrad.addColorStop(0.55, '#15193d');
  mGrad.addColorStop(1, '#080b1e');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 512, 512);
  mCtx.strokeStyle = 'rgba(251, 191, 36, 0.14)';
  mCtx.lineWidth = 3;
  mCtx.beginPath();
  mCtx.arc(256, 256, 182, 0, Math.PI * 2);
  mCtx.stroke();
  mCtx.strokeStyle = 'rgba(129, 140, 248, 0.12)';
  mCtx.beginPath();
  mCtx.arc(256, 256, 224, 0, Math.PI * 2);
  mCtx.stroke();

  const tableMat = new THREE.CanvasTexture(matCanvas);
  tableMat.colorSpace = THREE.SRGBColorSpace;
  tableMat.anisotropy = maxAnisotropy;

  return {
    albedo,
    bump,
    roughness,
    diceFaces,
    contactShadow,
    tableMat,
  };
}

function createDieFaceTexture(
  value: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Pearl-ivory porcelain die face with subtle gold chamfer border
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  drawRoundedRect(ctx, 16, 16, size - 32, size - 32, 34);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = value === 6 ? '#f59e0b' : '#cbd5e1';
  ctx.stroke();

  const pipPositions: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [
      [0.28, 0.28],
      [0.72, 0.72],
    ],
    3: [
      [0.26, 0.26],
      [0.5, 0.5],
      [0.74, 0.74],
    ],
    4: [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    5: [
      [0.26, 0.26],
      [0.74, 0.26],
      [0.5, 0.5],
      [0.26, 0.74],
      [0.74, 0.74],
    ],
    6: [
      [0.28, 0.24],
      [0.72, 0.24],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.76],
      [0.72, 0.76],
    ],
  };

  const pips = pipPositions[value] || pipPositions[1];
  const radius = value === 1 ? 32 : 21;

  pips.forEach(([px, py]) => {
    const x = px * size;
    const y = py * size;

    ctx.beginPath();
    ctx.arc(x, y + 2, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      value === 1 ? '#dc2626' : value === 6 ? '#d97706' : '#0f172a';
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
