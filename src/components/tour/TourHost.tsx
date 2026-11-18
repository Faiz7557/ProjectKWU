'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from './Tour';
import { STEPS, tourKey, type TourStep } from './tour-steps';

const storageKey = (page: string) => `sf-tour:${page}`;

const seen = (page: string) => {
  try {
    return localStorage.getItem(storageKey(page)) === '1';
  } catch {
    return true; // storage diblokir: jangan ganggu di tiap kunjungan
  }
};
const mark = (page: string) => {
  try {
    localStorage.setItem(storageKey(page), '1');
  } catch {
    /* akan tampil lagi */
  }
};

/** Memutar panduan halaman sekali saat kunjungan pertama; event window 'sf-tour' memutar ulang. */
export function TourHost() {
  const pathname = usePathname();
  const page = tourKey(pathname);
  const [active, setActive] = useState<{ page: string; steps: TourStep[] } | null>(null);

  useEffect(() => {
    if (!page || seen(page)) return;
    const id = window.setTimeout(() => setActive({ page, steps: STEPS[page] }), 1200);
    return () => window.clearTimeout(id);
  }, [page]);

  useEffect(() => {
    if (!page) return;
    const replay = () => setActive({ page, steps: STEPS[page] });
    window.addEventListener('sf-tour', replay);
    return () => window.removeEventListener('sf-tour', replay);
  }, [page]);

  const close = useCallback(() => {
    if (active) mark(active.page);
    setActive(null);
  }, [active]);

  return active && active.page === page ? <Tour key={active.page} steps={active.steps} onClose={close} /> : null;
}
