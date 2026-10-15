import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ---------- Card ----------
export function Card({
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface p-4 shadow-1 sm:p-5',
        interactive && 'pressable transition-colors duration-150 hover:bg-surface-2',
        className,
      )}
      {...rest}
    />
  );
}

// ---------- Badge / Chip ----------
// Tone semantik SELALU disertai ikon (WCAG 1.4.1): warna saja tidak cukup.
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'reps' | 'form' | 'kcal' | 'sym' | 'xp' | 'streak';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-text-2',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  reps: 'bg-accent-soft text-data-reps',
  form: 'bg-success-soft text-data-form',
  kcal: 'bg-data-kcal/10 text-data-kcal',
  sym: 'bg-data-sym/10 text-data-sym',
  xp: 'bg-data-xp/10 text-data-xp',
  streak: 'bg-warning-soft text-data-streak',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold', toneClass[tone], className)}>
      {icon && <span aria-hidden="true" className="inline-flex">{icon}</span>}
      {children}
    </span>
  );
}

// ---------- Stat ----------
// Nilai kosong = "—" + aria-label "belum ada data" (UI_UX_BRIEF §10: tidak ada angka palsu).
const statValue = {
  m: 'text-metric-m',
  l: 'text-metric-l',
  xl: 'text-metric-xl',
} as const;

const statTone: Record<string, string> = {
  reps: 'text-data-reps',
  form: 'text-data-form',
  kcal: 'text-data-kcal',
  sym: 'text-data-sym',
  xp: 'text-data-xp',
  streak: 'text-data-streak',
  neutral: 'text-text',
};

export function Stat({
  label,
  value,
  unit,
  tone = 'neutral',
  icon: Icon,
  size = 'm',
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  tone?: keyof typeof statTone;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  size?: keyof typeof statValue;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="flex items-center gap-1.5 text-subhead text-text-2">
        {Icon && <Icon className="size-4" aria-hidden={true} />}
        {label}
      </p>
      <p
        className={cn('num flex items-baseline gap-1.5 font-bold', statValue[size], statTone[tone])}
        aria-label={empty ? `${label}: belum ada data` : undefined}
      >
        <span>{empty ? '—' : value}</span>
        {!empty && unit && <span className="text-footnote font-medium text-text-2">{unit}</span>}
      </p>
    </div>
  );
}

// ---------- ProgressBar ----------
// Animasi transform scaleX (bukan width) agar tidak memicu layout tiap frame.
export function ProgressBar({
  value,
  tone = 'accent',
  label,
  className,
}: {
  value: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'reps' | 'xp' | 'streak';
  label: string;
  className?: string;
}) {
  const v = Math.min(1, Math.max(0, value));
  const fill: Record<string, string> = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    reps: 'bg-data-reps',
    xp: 'bg-data-xp',
    streak: 'bg-data-streak',
  };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div
        className={cn('h-full w-full origin-left rounded-full transition-transform duration-[440ms] ease-spring', fill[tone])}
        style={{ transform: `scaleX(${v})` }}
      />
    </div>
  );
}

// ---------- ProgressRing ----------
export function ProgressRing({
  value,
  size = 96,
  stroke = 10,
  tone = 'reps',
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'accent' | 'success' | 'reps' | 'form' | 'streak';
  label: string;
  children?: ReactNode;
}) {
  const v = Math.min(1, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color: Record<string, string> = {
    accent: 'stroke-accent-text',
    success: 'stroke-success',
    reps: 'stroke-data-reps',
    form: 'stroke-data-form',
    streak: 'stroke-data-streak',
  };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn('transition-[stroke-dashoffset] duration-[440ms] ease-spring', color[tone])}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
