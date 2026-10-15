'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Toggle tombol: label tetap, status lewat aria-pressed + perubahan visual (bukan teks "ON/OFF").
interface ToggleProps {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  label: string;
  icon?: ReactNode;
  className?: string;
}

export function Toggle({ pressed, onPressedChange, label, icon, className }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'pressable inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-subhead font-medium',
        pressed ? 'bg-accent-soft text-accent-text' : 'bg-surface-3 text-text-2 hover:text-text',
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Switch iOS-style untuk Pengaturan. role="switch" + aria-checked.
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, description, disabled }: SwitchProps) {
  const descId = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={`${descId}-label`} className="text-headline text-text">
          {label}
        </p>
        {description && (
          <p id={descId} className="text-footnote text-text-3">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${descId}-label`}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-150',
          'disabled:opacity-40',
          checked ? 'bg-success' : 'bg-surface-3',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'block size-[27px] rounded-full bg-white shadow-1 transition-transform duration-[440ms] ease-spring',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

// SegmentedControl: radiogroup dengan panah kiri/kanan (WAI-ARIA).
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onValueChange: (next: T) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    onValueChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(index, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(index, -1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex w-full gap-1 rounded-md bg-surface-3 p-1', className)}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'pressable flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 text-subhead font-medium transition-colors duration-150',
              active ? 'bg-surface-2 text-text shadow-1' : 'text-text-2 hover:text-text',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
