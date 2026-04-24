'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Corners, Point } from '@/lib/vision/homography';

type Props = {
  corners: Corners;
  onChange: (corners: Corners) => void;
  width: number;
  height: number;
  className?: string;
};

const CORNER_KEYS: Array<keyof Corners> = ['tl', 'tr', 'br', 'bl'];
const CORNER_COLORS: Record<keyof Corners, string> = {
  tl: '#22d3ee', tr: '#f472b6', br: '#facc15', bl: '#a78bfa',
};
const CORNER_LABELS: Record<keyof Corners, string> = {
  tl: 'TL', tr: 'TR', br: 'BR', bl: 'BL',
};

/**
 * A draggable 4-corner overlay for homography calibration.
 * Renders an SVG polygon with 4 handles the user can drag onto the scoreboard corners.
 */
export function CornerDragger({ corners, onChange, width, height, className }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<keyof Corners | null>(null);

  const toSvgCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * width;
      const y = ((clientY - rect.top) / rect.height) * height;
      return { x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) };
    },
    [width, height],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const point = 'touches' in e ? e.touches[0] : e;
      const pos = toSvgCoords(point.clientX, point.clientY);
      onChange({ ...corners, [dragging]: pos });
    };
    const handleEnd = () => setDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragging, corners, onChange, toSvgCoords]);

  const pathPts = CORNER_KEYS.map(k => `${corners[k].x},${corners[k].y}`).join(' ');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={`absolute inset-0 w-full h-full ${className ?? ''}`}
      style={{ touchAction: 'none' }}
    >
      <polygon
        points={pathPts}
        fill="rgba(34, 211, 238, 0.08)"
        stroke="#22d3ee"
        strokeWidth={2}
        strokeDasharray="8 4"
      />
      {CORNER_KEYS.map(key => {
        const p = corners[key];
        const color = CORNER_COLORS[key];
        return (
          <g
            key={key}
            onMouseDown={() => setDragging(key)}
            onTouchStart={() => setDragging(key)}
            style={{ cursor: 'grab' }}
          >
            <circle cx={p.x} cy={p.y} r={22} fill={color} fillOpacity={0.25} />
            <circle cx={p.x} cy={p.y} r={10} fill={color} stroke="#000" strokeWidth={2} />
            <text
              x={p.x}
              y={p.y - 18}
              fill={color}
              fontSize="14"
              fontWeight="700"
              textAnchor="middle"
            >
              {CORNER_LABELS[key]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
