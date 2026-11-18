'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Diadaptasi dari 8B Sill template (MIT)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export const REDUCED = '(prefers-reduced-motion: reduce)';
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, SplitText };
