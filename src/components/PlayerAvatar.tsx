import React from 'react';
import { COLOR_DARK_HEX, COLOR_HEX } from '../game/boardCoords';
import { AvatarId, PlayerColor } from '../game/types';

interface PlayerAvatarProps {
  avatarId: AvatarId;
  color?: PlayerColor;
  size?: number;
  className?: string;
  neutralElectricBlue?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatarId,
  color = 'red',
  size = 38,
  className = '',
  neutralElectricBlue = false,
}) => {
  const bg = neutralElectricBlue ? '#0284c7' : COLOR_HEX[color];
  const dark = neutralElectricBlue ? '#050b18' : COLOR_DARK_HEX[color];
  const strokeCol = neutralElectricBlue ? '#00d4ff' : '#fbbf24';
  const gradId = `av-bg-${neutralElectricBlue ? 'eb' : color}-${avatarId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradId})`}
        stroke={strokeCol}
        strokeWidth="2.5"
      />
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1"
      />

      {avatarId === 'king' && (
        <g>
          <path d="M12 31 L14 18 L20 23 L24 14 L28 23 L34 18 L36 31 Z" fill="#fef08a" stroke="#78350f" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="13" y="31" width="22" height="4" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.4" />
          <circle cx="24" cy="24" r="2.2" fill="#ef4444" />
        </g>
      )}

      {avatarId === 'queen' && (
        <g>
          <path d="M13 31 L16 17 L21 24 L24 15 L27 24 L32 17 L35 31 Z" fill="#fbcfe8" stroke="#831843" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="24" cy="14" r="2.5" fill="#fbbf24" />
          <circle cx="16" cy="16" r="2" fill="#fbbf24" />
          <circle cx="32" cy="16" r="2" fill="#fbbf24" />
          <rect x="14" y="31" width="20" height="4" rx="1.5" fill="#f472b6" />
        </g>
      )}

      {avatarId === 'knight' && (
        <g>
          <path d="M15 34 V21 C15 15 20 12 24 12 C28 12 33 15 33 21 V34 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.6" />
          <rect x="17" y="21" width="14" height="5" rx="2" fill="#0f172a" />
          <rect x="19" y="22.5" width="4" height="2" rx="1" fill="#38bdf8" />
          <rect x="25" y="22.5" width="4" height="2" rx="1" fill="#38bdf8" />
          <path d="M24 12 V20" stroke="#64748b" strokeWidth="1.6" />
        </g>
      )}

      {avatarId === 'dragon' && (
        <g>
          <path d="M15 33 L13 19 L19 22 L24 13 L29 22 L35 19 L33 33 Z" fill="#86efac" stroke="#14532d" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="20" cy="25" r="2.1" fill="#fbbf24" />
          <circle cx="28" cy="25" r="2.1" fill="#fbbf24" />
          <path d="M21 30 Q24 33 27 30" stroke="#14532d" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {avatarId === 'lion' && (
        <g>
          <circle cx="24" cy="25" r="11" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="24" cy="25" r="7.5" fill="#fde68a" />
          <circle cx="21" cy="24" r="1.4" fill="#1e293b" />
          <circle cx="27" cy="24" r="1.4" fill="#1e293b" />
          <polygon points="24,26 22,28.5 26,28.5" fill="#78350f" />
        </g>
      )}

      {avatarId === 'falcon' && (
        <g>
          <path d="M12 27 L24 13 L36 27 L28 25 L24 34 L20 25 Z" fill="#e0f2fe" stroke="#0c4a6e" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="24,20 21,25 27,25" fill="#fbbf24" />
        </g>
      )}

      {avatarId === 'fox' && (
        <g>
          <polygon points="14,15 21,21 15,27" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.4" />
          <polygon points="34,15 27,21 33,27" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.4" />
          <path d="M15 22 L24 35 L33 22 Z" fill="#fb923c" stroke="#7c2d12" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="21" cy="25" r="1.5" fill="#0f172a" />
          <circle cx="27" cy="25" r="1.5" fill="#0f172a" />
        </g>
      )}

      {avatarId === 'astro' && (
        <g>
          <circle cx="24" cy="25" r="10.5" fill="#f8fafc" stroke="#334155" strokeWidth="1.6" />
          <rect x="17" y="19" width="14" height="9" rx="4.5" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1.4" />
          <path d="M19 22 H24" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};
