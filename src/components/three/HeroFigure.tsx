'use client';

import { useEffect, useRef, useState } from 'react';
import { mountScene } from '@/lib/three/mount';
import { createPoseFigure } from '@/lib/three/pose-figure';
import { withDepth } from '@/lib/three/pose-depth';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { dark, panels } from '@/lib/design/tokens';
import type { NormalizedLandmark } from '@/trackers/types';
import { PoseFigureSvg } from './PoseFigureSvg';
import * as THREE from 'three';

interface Props {
  className?: string;
  exercise?: 'squat' | 'pushup';
}

const CYCLE = 3; // detik per siklus a -> b -> a
const HI_START = 1.2;
const HI_END = 1.8;
const MAX_SCROLL_DEG = 40;
const RAD = Math.PI / 180;

// Kalimat dari fault message asli di src/trackers/*.
const FAULT = {
  squat: {
    bones: [[11, 23], [12, 24]] as [number, number][],
    text: 'Busungkan dada dan jaga pandangan tetap lurus ke depan.',
  },
  pushup: {
    bones: [[11, 23], [12, 24]] as [number, number][],
    text: 'Jaga otot perut kencang agar pinggul sejajar dengan bahu dan kaki.',
  },
};
const OK_TEXT = 'Form benar';
const LABEL = { squat: 'squat', pushup: 'push-up' };

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

function lerpInto(out: NormalizedLandmark[], a: NormalizedLandmark[], b: NormalizedLandmark[], k: number) {
  for (let i = 0; i < out.length; i++) {
    const p = a[i];
    const q = b[i];
    const o = out[i];
    o.x = p.x + (q.x - p.x) * k;
    o.y = p.y + (q.y - p.y) * k;
    o.z = p.z + (q.z - p.z) * k;
  }
}

export function HeroFigure({ className, exercise = 'squat' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const ref = EXERCISE_REFERENCES[exercise];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const caption = captionRef.current;
    const poses = ref.phases.map((p) => withDepth(p.landmarks, ref.orientation));
    const a = poses[0];
    const b = poses[1] ?? poses[0];
    const cur: NormalizedLandmark[] = a.map((l) => ({ ...l }));
    const fault = FAULT[exercise];

    let scrollDeg = 0;
    const onScroll = () => {
      const r = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      scrollDeg = (p - 0.5) * 2 * MAX_SCROLL_DEG;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    let fig: ReturnType<typeof createPoseFigure> | null = null;
    let hi = false;
    const R = 3.6;

    const handle = mountScene(host, {
      onContextLost: () => setFallback(true),
      build: ({ scene }) => {
        fig = createPoseFigure({
          jointRadius: 0.045,
          boneRadius: 0.025,
          // Hero duduk di panel sage: tulang tinta + sendi kertas agar kontras di kedua tema.
          jointColor: dark.text,
          boneColor: panels[6].on,
          highlightColor: dark.danger,
        });
        scene.add(fig.group);
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dl = new THREE.DirectionalLight(0xffffff, 2);
        dl.position.set(2, 3, 4);
        scene.add(dl);
        return () => fig?.dispose();
      },
      onFrame: ({ camera }, t) => {
        // t = 0 pada mode statis (reduced motion): pose a, tanpa orbit.
        const phase = (t % CYCLE) / CYCLE;
        const k = easeInOutSine(phase < 0.5 ? phase * 2 : 2 - phase * 2);
        lerpInto(cur, a, b, k);
        fig?.update(cur);

        const inCycle = t % CYCLE;
        const want = t > 0 && inCycle >= HI_START && inCycle < HI_END;
        if (want !== hi) {
          hi = want;
          fig?.highlightBones(hi ? fault.bones : null);
          if (caption) caption.textContent = hi ? fault.text : OK_TEXT;
        }

        const ang = t > 0 ? Math.sin(t * 0.3) * 0.25 + scrollDeg * RAD : 0;
        camera.position.set(Math.sin(ang) * R, 0.2, Math.cos(ang) * R);
        camera.lookAt(0, 0, 0);
      },
    });
    if (!handle) {
      queueMicrotask(() => setFallback(true));
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      handle?.dispose();
    };
  }, [exercise, ref]);

  return (
    <div
      className={`relative ${className ?? ''}`}
      role="img"
      aria-label={`Figur 3D memeragakan ${LABEL[exercise]}; satu bagian tubuh menyala merah sesaat untuk menunjukkan koreksi form.`}
    >
      {fallback ? (
        <PoseFigureSvg
          landmarks={ref.phases[0].landmarks}
          orientation={ref.orientation}
          className="h-full w-full text-text"
        />
      ) : (
        <>
          <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
          <div
            ref={captionRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-3 px-3 text-center text-sm font-medium"
          >
            {OK_TEXT}
          </div>
        </>
      )}
    </div>
  );
}
