'use client';

import dynamic from 'next/dynamic';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { PoseFigureSvg } from './PoseFigureSvg';

export const HeroFigureLazy = dynamic(() => import('./HeroFigure').then((m) => m.HeroFigure), {
  ssr: false,
  loading: () => (
    <PoseFigureSvg landmarks={EXERCISE_REFERENCES.squat.phases[0].landmarks} className="h-full w-full text-text" />
  ),
});
