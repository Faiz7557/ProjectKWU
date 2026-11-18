'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger, MOTION_OK } from './gsap';

// Diadaptasi dari 8B Sill template (MIT)
const NO_PREF = '(prefers-reduced-motion: no-preference)';

/** Query selalu digabung dengan MOTION_OK, sehingga reduced motion tidak pernah menjalankan setup. */
export function motionQueries(media?: Record<string, string>): Record<string, string> {
  if (!media) return { motion: MOTION_OK };
  return Object.fromEntries(Object.entries(media).map(([k, q]) => [k, `${q} and ${NO_PREF}`]));
}

export function useScene(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: { conditions: Record<string, boolean> }) => void | (() => void),
  media?: Record<string, string>,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      motionQueries(media),
      (ctx) => setup({ conditions: (ctx.conditions ?? {}) as Record<string, boolean> }),
      scope.current ?? undefined,
    );
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    return () => {
      alive = false;
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
