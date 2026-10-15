'use client';

import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';

// Satu komponen untuk semua error.tsx (UI_UX_BRIEF §7.6): primary "Coba lagi", tertiary "Beranda".
// Pesan teknis disembunyikan di <details>, bukan ditampilkan ke pengguna awam.
export function ErrorState({
  title,
  description,
  reset,
  detail,
  secondary = { href: '/', label: 'Beranda' },
  retryLabel = 'Coba lagi',
}: {
  title: string;
  description: string;
  reset: () => void;
  detail?: string;
  secondary?: { href: string; label: string };
  retryLabel?: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="text-title-2 text-text">{title}</h1>
      <p className="text-callout text-text-2">{description}</p>
      <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button onClick={() => reset()}>{retryLabel}</Button>
        <Button variant="tertiary" href={secondary.href}>
          {secondary.label}
        </Button>
      </div>
      {detail && (
        <details className="mt-4 w-full text-left text-footnote text-text-3">
          <summary className="cursor-pointer">Detail teknis</summary>
          <pre className="num mt-2 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-surface p-3">{detail}</pre>
        </details>
      )}
    </main>
  );
}
