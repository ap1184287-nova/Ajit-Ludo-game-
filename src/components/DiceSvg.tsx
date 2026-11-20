import React from 'react';

interface DiceSvgProps {
  value: number | null;
  size?: number;
  accentHex?: string;
}

const PIP_MAP: Record<number, Array<[number, number]>> = {
  1: [[12, 12]],
  2: [
    [7, 7],
    [17, 17],
  ],
  3: [
    [7, 7],
    [12, 12],
    [17, 17],
  ],
  4: [
    [7, 7],
    [17, 7],
    [7, 17],
    [17, 17],
  ],
  5: [
    [7, 7],
    [17, 7],
    [12, 12],
    [7, 17],
    [17, 17],
  ],
  6: [
    [7, 6.5],
    [17, 6.5],
    [7, 12],
    [17, 12],
    [7, 17.5],
    [17, 17.5],
  ],
};

export const DiceSvg: React.FC<DiceSvgProps> = ({
  value,
  size = 28,
  accentHex = '#fbbf24',
}) => {
  const pips = value && PIP_MAP[value] ? PIP_MAP[value] : PIP_MAP[6];
  const pipColor =
    value === 6 ? '#fbbf24' : value === 1 ? '#ef4444' : '#f8fafc';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4.5"
        fill="#0f172a"
        stroke={value === 6 ? '#fbbf24' : accentHex}
        strokeWidth="1.75"
      />
      {pips.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={value === 1 ? 2.6 : 1.75}
          fill={pipColor}
        />
      ))}
    </svg>
  );
};
