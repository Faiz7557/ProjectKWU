import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'md' | 'lg' | 'xl';

const base =
  'pressable inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none whitespace-nowrap ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface-3 text-text',
  tertiary: 'bg-transparent text-accent-text',
  destructive: 'bg-danger text-on-danger',
};

// Tinggi minimal 44px (hit target WCAG); kontrol latihan memakai xl (56px).
const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-subhead',
  lg: 'min-h-[3.25rem] px-5 text-headline',
  xl: 'min-h-14 px-6 text-headline',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  /** Bila diisi, render sebagai <Link> (navigasi, bukan aksi). */
  href?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  href,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} aria-disabled={loading || undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Wajib: menjadi aria-label. Ikon saja tidak cukup untuk screen reader. */
  label: string;
  icon: ReactNode;
  size?: 'md' | 'lg';
  variant?: 'ghost' | 'filled';
}

export function IconButton({ label, icon, size = 'md', variant = 'ghost', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'pressable inline-flex items-center justify-center rounded-full text-text-2 hover:text-text',
        'disabled:opacity-40 disabled:pointer-events-none',
        size === 'md' ? 'size-11' : 'size-14',
        variant === 'filled' ? 'bg-surface-3 hover:bg-surface-2' : 'hover:bg-surface-3',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
