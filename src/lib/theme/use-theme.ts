'use client';
import { useSyncExternalStore } from 'react';

export type ThemePref = 'dark' | 'light' | 'system';
const KEY = 'smartfit-theme';
const mql = () => matchMedia('(prefers-color-scheme: light)');
export const resolveTheme = (p: ThemePref) => (p === 'system' ? (mql().matches ? 'light' : 'dark') : p);

function apply(p: ThemePref) {
  const t = resolveTheme(p), d = document.documentElement;
  const swap = () => {
    d.dataset.theme = t;
    d.style.colorScheme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#F5F5F7' : '#09090B');
  };
  // Apple: hindari lonjakan kecerahan mendadak → cross-fade, kecuali reduced motion
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'startViewTransition' in document) document.startViewTransition(swap);
  else swap();
}

const listeners = new Set<() => void>();
export function setThemePref(p: ThemePref) {
  localStorage.setItem(KEY, p);
  apply(p);
  listeners.forEach((l) => l());
}
export const getThemePref = (): ThemePref => (localStorage.getItem(KEY) as ThemePref) || 'dark';

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onSys = () => {
    if (getThemePref() === 'system') {
      apply('system');
      cb();
    }
  };
  mql().addEventListener('change', onSys);
  return () => {
    listeners.delete(cb);
    mql().removeEventListener('change', onSys);
  };
}

export const useThemePref = () => useSyncExternalStore(subscribe, getThemePref, () => 'dark' as ThemePref);
