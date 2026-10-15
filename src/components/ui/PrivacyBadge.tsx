'use client';

import React, { useState } from 'react';
import { ShieldCheck, Info, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface PrivacyBadgeProps {
  variant?: 'compact' | 'full';
  className?: string;
}

const POINTS = [
  { title: 'Analisis di perangkat', body: 'Gerakan kamu dihitung langsung di browser, tidak di server.' },
  { title: 'Video tidak dikirim', body: 'Tidak ada satu frame video atau foto pun yang dikirim ke server kami.' },
  { title: 'Yang disimpan hanya angka', body: 'Jumlah rep, durasi, dan skor form saja yang dicatat di riwayat kamu.' },
];

export function PrivacyBadge({ variant = 'compact', className = '' }: PrivacyBadgeProps) {
  const [open, setOpen] = useState(false);

  const dialog = (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Privasi kamera terjamin"
      description="Video kamu diproses sepenuhnya di perangkat ini. Tidak pernah keluar dari HP atau laptop kamu."
    >
      <ul className="space-y-3">
        {POINTS.map((p) => (
          <li key={p.title} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-subhead font-semibold text-text">{p.title}</strong>
              <span className="text-footnote text-text-2">{p.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="mt-6 w-full" onClick={() => setOpen(false)}>
        Mengerti
      </Button>
    </Dialog>
  );

  if (variant === 'full') {
    return (
      <>
        <Button
          variant="tertiary"
          onClick={() => setOpen(true)}
          className={cn('h-auto justify-start rounded-md bg-success-soft px-4 py-3 text-left text-success', className)}
          icon={<ShieldCheck className="size-5 shrink-0" aria-hidden="true" />}
        >
          <span className="flex flex-col items-start">
            <span className="text-subhead font-semibold">Privasi terlindungi</span>
            <span className="text-footnote font-normal text-text-2">Video diproses di perangkat kamu</span>
          </span>
          <Info className="ml-auto size-4 shrink-0 text-text-3" aria-hidden="true" />
        </Button>
        {dialog}
      </>
    );
  }

  // Compact: untuk header kamera / bar atas
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'pressable inline-flex min-h-11 items-center gap-1.5 rounded-full bg-success-soft px-3 text-caption font-semibold text-success',
          className,
        )}
      >
        <ShieldCheck className="size-4" aria-hidden="true" />
        <span>Video tetap di perangkat</span>
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      {dialog}
    </>
  );
}
