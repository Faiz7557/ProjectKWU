'use client';

// Halaman uji sementara untuk scene Three.js (T3.3). DIHAPUS di Gelombang 6.
import { useState } from 'react';
import { HeroFigureLazy } from '@/components/three/HeroFigureLazy';
import { CameraSetupSceneLazy } from '@/components/three/CameraSetupSceneLazy';
import { ReferenceFigure3DLazy } from '@/components/three/ReferenceFigure3DLazy';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';

export default function DevThreePage() {
  const [orientation, setOrientation] = useState<'side' | 'front'>('side');
  const [exerciseId, setExerciseId] = useState('squat');
  const [phase, setPhase] = useState(0);
  const phases = EXERCISE_REFERENCES[exerciseId].phases;

  return (
    <main className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Uji scene 3D (sementara)</h1>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="h-96 bg-surface"><HeroFigureLazy exercise="squat" className="h-full" /></div>
        <div className="h-96 bg-surface"><HeroFigureLazy exercise="pushup" className="h-full" /></div>
      </section>
      <section className="space-y-2">
        <div className="flex gap-2">
          {(['side', 'front'] as const).map((o) => (
            <button key={o} type="button" className="bg-surface-2 px-3 py-1" onClick={() => setOrientation(o)}>
              {o}
            </button>
          ))}
        </div>
        <div className="h-96 bg-surface"><CameraSetupSceneLazy orientation={orientation} className="h-full" /></div>
      </section>
      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {Object.keys(EXERCISE_REFERENCES).map((id) => (
            <button
              key={id}
              type="button"
              className="bg-surface-2 px-3 py-1"
              onClick={() => {
                setExerciseId(id);
                setPhase(0);
              }}
            >
              {id}
            </button>
          ))}
          {phases.map((p, i) => (
            <button key={p.name} type="button" className="bg-surface-3 px-3 py-1" onClick={() => setPhase(i)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="h-96 bg-surface"><ReferenceFigure3DLazy exerciseId={exerciseId} phaseIndex={phase} className="h-full" /></div>
      </section>
    </main>
  );
}
