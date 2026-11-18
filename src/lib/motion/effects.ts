'use client';

import { gsap, ScrollTrigger, SplitText } from './gsap';

// Diadaptasi dari 8B Sill template (MIT)
export type RiseTimeline = gsap.core.Timeline & { split: SplitText };

export function peek(frame: Element, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(frame.firstElementChild, { yPercent: 42 }, { yPercent: 0, ease: 'none', ...vars });
}

export function rise(heading: Element, vars: gsap.TimelineVars = {}): RiseTimeline {
  const split = SplitText.create(heading, { type: 'lines', mask: 'lines' });
  const timeline = gsap.timeline({
    ...vars,
    onComplete() {
      split.revert();
    },
  }) as RiseTimeline;
  timeline.from(split.lines, { yPercent: 108, duration: 0.9, stagger: 0.09, ease: 'power3.out' });
  timeline.split = split;
  return timeline;
}

// Path wajib memakai pathLength="1" dan stroke-dasharray: 1.
export function curl(svg: Element, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(svg.querySelector('path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', ...vars });
}

/** Pasang rise/peek/curl pada elemen [data-motion~=...] di dalam root. Panggil di dalam useScene/matchMedia. */
export function bindEffects(root: HTMLElement): () => void {
  const q = (name: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-motion~="${name}"]`));
  const splits: SplitText[] = [];

  q('peek').forEach((frame) =>
    ScrollTrigger.create({ trigger: frame, start: 'top bottom', end: 'top 40%', scrub: 0.5, animation: peek(frame) }),
  );
  q('rise').forEach((heading) => {
    const tl = rise(heading, { paused: true });
    splits.push(tl.split);
    ScrollTrigger.create({ trigger: heading, start: 'top 88%', once: true, animation: tl, toggleActions: 'play play none none' });
  });
  q('curl').forEach((svg) =>
    ScrollTrigger.create({ trigger: svg, start: 'top 95%', end: 'bottom 45%', scrub: 0.6, animation: curl(svg) }),
  );

  // ScrollTrigger dibersihkan oleh context/matchMedia revert; split dikembalikan di sini.
  return () => splits.forEach((s) => s.revert());
}
