'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronLeft, CircleHelp, Crown, Monitor, Moon, Sun, UserRound, type LucideIcon } from 'lucide-react';
import { useEntitlement } from '@/lib/auth/use-premium';
import { cn } from '@/lib/cn';
import { resolveTheme, setThemePref, useThemePref, type ThemePref } from '@/lib/theme/use-theme';
import { tourKey } from '@/components/tour/tour-steps';
import { IconButton } from './Button';
import { SegmentedControl } from './Controls';

// ---------- TopBar: sticky, material, back selalu kiri dengan label tujuan ----------
export function TopBar({
  title,
  back,
  actions,
}: {
  title: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  const hasTour = tourKey(usePathname()) !== null;
  return (
    <header className="sticky top-0 z-10 bg-ink text-paper [&_button:hover]:bg-paper/15 [&_button]:text-paper">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
        {back ? (
          <Link
            href={back.href}
            className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-subhead font-medium text-paper decoration-2 underline-offset-[6px] hover:underline"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : (
          <span className="w-2" aria-hidden="true" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-headline text-paper">{title}</h1>
        <div className="flex min-w-11 items-center justify-end gap-1">
          {actions}
          {hasTour && (
            <IconButton
              label="Putar panduan"
              onClick={() => window.dispatchEvent(new Event('sf-tour'))}
              icon={<CircleHelp className="size-5" aria-hidden="true" />}
            />
          )}
          <ThemeToggle />
          <AccountLink />
        </div>
      </div>
    </header>
  );
}

// Status akun di top bar: tamu -> masuk, gratis -> halaman Premium, Premium -> mahkota.
function AccountLink() {
  const { tier } = useEntitlement();
  if (tier === 'loading') return <span className="size-11" aria-hidden="true" />;
  const label = tier === 'premium' ? 'Akun Premium' : tier === 'free' ? 'Akun gratis, lihat Premium' : 'Masuk';
  return (
    <Link
      href={tier === 'guest' ? '/masuk?next=/workout' : '/premium'}
      aria-label={label}
      title={label}
      className="pressable inline-flex min-h-11 min-w-11 items-center justify-center text-paper hover:bg-paper/15"
    >
      {tier === 'premium' ? <Crown className="size-5" aria-hidden="true" /> : <UserRound className="size-5" aria-hidden="true" />}
    </Link>
  );
}

// ---------- TabBar: navigasi bawah mobile (< md). Disembunyikan saat sesi latihan aktif. ----------
export interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-10 bg-ink pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'pressable flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-medium',
                  item.active ? 'text-panel-8' : 'text-paper/70',
                )}
              >
                <Icon className="size-6" aria-hidden="true" strokeWidth={item.active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------- ThemeSwitcher: Gelap / Terang / Sistem ----------
const THEME_OPTIONS: { value: ThemePref; label: string; icon: ReactNode }[] = [
  { value: 'dark', label: 'Gelap', icon: <Moon className="size-4" aria-hidden="true" /> },
  { value: 'light', label: 'Terang', icon: <Sun className="size-4" aria-hidden="true" /> },
  { value: 'system', label: 'Sistem', icon: <Monitor className="size-4" aria-hidden="true" /> },
];

export function ThemeSwitcher() {
  const pref = useThemePref();
  return (
    <SegmentedControl<ThemePref>
      label="Tema tampilan"
      options={THEME_OPTIONS}
      value={pref}
      onValueChange={setThemePref}
    />
  );
}

// Shortcut ikon di top bar: toggle gelap <-> terang (pilihan "Sistem" ada di Pengaturan).
export function ThemeToggle() {
  const pref = useThemePref();
  const resolved = resolveTheme(pref);
  const next: ThemePref = resolved === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={resolved === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      onClick={() => setThemePref(next)}
      icon={resolved === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    />
  );
}
