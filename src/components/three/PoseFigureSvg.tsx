import type { NormalizedLandmark } from '@/trackers/types';
import { BODY_BONES, BODY_JOINTS } from '@/lib/three/pose-depth';

interface Props {
  landmarks: NormalizedLandmark[];
  orientation?: 'side' | 'front';
  className?: string;
  /** Pasangan landmark yang digambar warna danger. */
  highlight?: [number, number][];
}

/** Figur SVG statis: fallback tanpa WebGL, placeholder saat chunk dimuat, dan render SSR. */
export function PoseFigureSvg({ landmarks, orientation = 'side', className, highlight }: Props) {
  const isHi = (a: number, b: number) =>
    !!highlight?.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      data-orientation={orientation}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      fill="currentColor"
    >
      {BODY_BONES.map(([a, b]) => {
        const la = landmarks[a];
        const lb = landmarks[b];
        if (!la || !lb) return null;
        const hi = isHi(a, b);
        return (
          <line
            key={`${a}-${b}`}
            x1={la.x * 100}
            y1={la.y * 100}
            x2={lb.x * 100}
            y2={lb.y * 100}
            stroke={hi ? 'var(--danger)' : 'currentColor'}
            strokeWidth={hi ? 2.4 : 1.6}
            strokeLinecap="round"
          />
        );
      })}
      {BODY_JOINTS.map((i) => {
        const l = landmarks[i];
        return l ? <circle key={i} cx={l.x * 100} cy={l.y * 100} r={1.8} /> : null;
      })}
    </svg>
  );
}
