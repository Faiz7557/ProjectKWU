'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mountScene } from '@/lib/three/mount';
import { createPoseFigure } from '@/lib/three/pose-figure';
import { withDepth } from '@/lib/three/pose-depth';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { dark, panels } from '@/lib/design/tokens';
import { PoseFigureSvg } from './PoseFigureSvg';

type Orientation = 'side' | 'front';

interface Props {
  orientation: Orientation;
  className?: string;
}

// Gerakan yang mewakili tiap orientasi kamera (pose fase pertama).
const EXERCISE_FOR = { side: 'squat', front: 'jumping_jack' } as const;
// Azimut HP terhadap +z: depan = 0, samping = 90 derajat (HP di sisi +x).
const THETA = { side: Math.PI / 2, front: 0 } as const;
const TWEEN_MS = 600;
const DIST = 2.2; // ~1,5-2 m dalam satuan dunia (1 unit ~ 0,8 m)

const ease = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

interface Controller {
  setOrientation: (o: Orientation) => void;
}

export function CameraSetupScene({ orientation, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Controller | null>(null);
  const orientRef = useRef(orientation);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const label = labelRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const figGroup = new THREE.Group();
    const phone = new THREE.Group();
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linePos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    const mid = new THREE.Vector3();
    const target = new THREE.Vector3(0, 0.7, 0);
    let theta: number = THETA[orientRef.current];
    let from = theta;
    let to = theta;
    let start = 0;
    let raf = 0;
    let fig: ReturnType<typeof createPoseFigure> | null = null;
    let lineObj: THREE.Line | null = null;
    let shownOrientation: Orientation | null = null;

    const showPose = (o: Orientation) => {
      if (shownOrientation === o) return;
      shownOrientation = o;
      const ref = EXERCISE_REFERENCES[EXERCISE_FOR[o]];
      const lm = withDepth(ref.phases[0].landmarks, ref.orientation);
      fig?.update(lm);
      let minY = Infinity;
      for (const i of [27, 28, 29, 30, 31, 32]) minY = Math.min(minY, -(lm[i].y - 0.5) * 2);
      figGroup.position.y = -minY;
    };

    const handle = mountScene(host, {
      continuous: false,
      fov: 35,
      onContextLost: () => setFallback(true),
      build: ({ scene }) => {
        fig = createPoseFigure({
          jointRadius: 0.04,
          boneRadius: 0.022,
          jointColor: dark.text,
          boneColor: panels[6].bg,
          highlightColor: dark.danger,
        });
        figGroup.add(fig.group);
        scene.add(figGroup);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(5, 5),
          new THREE.MeshToonMaterial({ color: panels[3].bg }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.005;
        scene.add(floor);

        // HP di tripod: batang + kaki (silinder) dan badan HP (box).
        const dark3 = new THREE.MeshToonMaterial({ color: panels[0].on });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), dark3);
        pole.position.y = 0.5;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.04, 16), dark3);
        foot.position.y = 0.02;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.48, 0.04),
          new THREE.MeshToonMaterial({ color: panels[0].bg }),
        );
        body.position.y = 1.1;
        phone.add(pole, foot, body);
        scene.add(phone);

        lineObj = new THREE.Line(
          lineGeo,
          new THREE.LineDashedMaterial({ color: dark.text, dashSize: 0.08, gapSize: 0.06 }),
        );
        scene.add(lineObj);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dl = new THREE.DirectionalLight(0xffffff, 2);
        dl.position.set(2, 4, 3);
        scene.add(dl);

        return () => fig?.dispose();
      },
    });

    if (!handle) {
      queueMicrotask(() => setFallback(true));
      lineGeo.dispose();
      return;
    }
    const { camera, renderOnce } = handle;

    const apply = () => {
      const sx = Math.sin(theta);
      const cz = Math.cos(theta);
      figGroup.rotation.y = theta;
      phone.position.set(sx * DIST, 0, cz * DIST);
      phone.rotation.y = theta + Math.PI;
      const ca = theta + 0.6;
      camera.position.set(Math.sin(ca) * 6, 2.4, Math.cos(ca) * 6);
      camera.lookAt(target);
      linePos.setXYZ(0, phone.position.x, 0.03, phone.position.z);
      linePos.setXYZ(1, 0, 0.03, 0);
      linePos.needsUpdate = true;
      lineObj?.computeLineDistances();
      if (label) {
        mid.set(phone.position.x / 2, 0.03, phone.position.z / 2).project(camera);
        label.style.transform = `translate(-50%, -50%) translate(${(mid.x * 0.5 + 0.5) * host.clientWidth}px, ${(-mid.y * 0.5 + 0.5) * host.clientHeight}px)`;
      }
      renderOnce();
    };

    const frame = (now: number) => {
      const k = Math.min(1, (now - start) / TWEEN_MS);
      theta = from + (to - from) * ease(k);
      apply();
      raf = k < 1 ? requestAnimationFrame(frame) : 0;
    };

    const setOrientation = (o: Orientation) => {
      showPose(o);
      to = THETA[o];
      from = theta;
      cancelAnimationFrame(raf);
      if (reduced.matches || from === to) {
        theta = to;
        apply();
        return;
      }
      start = performance.now();
      raf = requestAnimationFrame(frame);
    };
    ctrlRef.current = { setOrientation };

    showPose(orientRef.current);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctrlRef.current = null;
      lineGeo.dispose();
      handle.dispose();
    };
  }, []);

  useEffect(() => {
    orientRef.current = orientation;
    ctrlRef.current?.setOrientation(orientation);
  }, [orientation]);

  return (
    <div
      className={`relative ${className ?? ''}`}
      role="img"
      aria-label={
        orientation === 'side'
          ? 'Diagram: letakkan HP di tripod di sisi tubuh, sekitar 1,5 sampai 2 meter dari kamu.'
          : 'Diagram: letakkan HP di tripod menghadap tubuh dari depan, sekitar 1,5 sampai 2 meter dari kamu.'
      }
    >
      {fallback ? (
        <PoseFigureSvg
          landmarks={EXERCISE_REFERENCES[EXERCISE_FOR[orientation]].phases[0].landmarks}
          orientation={orientation}
          className="h-full w-full text-text"
        />
      ) : (
        <>
          <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
          <div
            ref={labelRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-xs font-medium"
          >
            1,5–2 m
          </div>
        </>
      )}
    </div>
  );
}
