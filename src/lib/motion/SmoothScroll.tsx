'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, MOTION_OK } from './gsap';

// Diadaptasi dari 8B Sill template (MIT)
const LenisContext = createContext<Lenis | null>(null);

export const useLenis = (): Lenis | null => useContext(LenisContext);

/** Pasang hanya di landing (route `/`), bukan di layout. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const l = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: { offset: -72 } });
      const tick = (t: number) => l.raf(t * 1000);
      l.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setLenis(l);
      return () => {
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        l.destroy();
        setLenis(null);
      };
    });
    return () => mm.revert();
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
