'use client';

import dynamic from 'next/dynamic';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { PoseFigureSvg } from './PoseFigureSvg';

export const ReferenceFigure3DLazy = dynamic(
  () => import('./ReferenceFigure3D').then((m) => m.ReferenceFigure3D),
  {
    ssr: false,
    loading: () => (
      <PoseFigureSvg landmarks={EXERCISE_REFERENCES.squat.phases[0].landmarks} className="h-full w-full text-text" />
    ),
  },
);
