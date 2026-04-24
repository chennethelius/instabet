'use client';

import { useMemo } from 'react';
import type { CalibrationRegion } from '@/lib/types/schema';

type Props = {
  regions: CalibrationRegion[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  onRegionClick?: (index: number) => void;
  selectedIndex?: number | null;
};

const TYPE_COLORS: Record<string, string> = {
  home_score: '#22d3ee',
  away_score: '#f472b6',
  clock: '#facc15',
  period: '#a78bfa',
  player_score: '#4ade80',
  timer: '#fb923c',
  counter: '#e879f9',
  other: '#94a3b8',
};

/**
 * Renders an SVG overlay of bounding boxes on top of a camera/video element.
 * Boxes scale from source image dimensions to the container dimensions.
 */
export function BboxOverlay({
  regions,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  onRegionClick,
  selectedIndex,
}: Props) {
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  const scaled = useMemo(
    () =>
      regions.map(r => ({
        ...r,
        scaledBbox: [r.bbox[0] * scaleX, r.bbox[1] * scaleY, r.bbox[2] * scaleX, r.bbox[3] * scaleY] as [
          number,
          number,
          number,
          number,
        ],
      })),
    [regions, scaleX, scaleY],
  );

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      width={containerWidth}
      height={containerHeight}
    >
      {scaled.map((r, i) => {
        const [x, y, w, h] = r.scaledBbox;
        const color = TYPE_COLORS[r.type] || TYPE_COLORS.other;
        const selected = selectedIndex === i;
        return (
          <g
            key={i}
            onClick={() => onRegionClick?.(i)}
            style={{ pointerEvents: onRegionClick ? 'auto' : 'none', cursor: onRegionClick ? 'pointer' : 'default' }}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={color}
              fillOpacity={selected ? 0.28 : 0.12}
              stroke={color}
              strokeWidth={selected ? 3 : 2}
              rx={6}
            />
            <rect x={x} y={Math.max(y - 22, 0)} width={Math.max(120, w)} height={22} fill={color} rx={4} />
            <text x={x + 6} y={Math.max(y - 8, 14)} fill="#0b0b0d" fontSize="12" fontWeight={700}>
              {r.label} {r.currentValue ? `· ${r.currentValue}` : ''} ({r.confidence}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
}
