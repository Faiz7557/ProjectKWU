'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mountScene } from '@/lib/three/mount';
import { createPoseFigure } from '@/lib/three/pose-figure';
import { withDepth } from '@/lib/three/pose-depth';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { dark, panels } from '@/lib/design/tokens';
import type { NormalizedLandmark } from '@/trackers/types';
import { PoseFigureSvg } from './PoseFigureSvg';

interface Props {
  exerciseId: string;
  phaseIndex?: number;
  className?: string;
}

const RAD = Math.PI / 180;
const YAW = 70 * RAD;
const PITCH_MIN = -15 * RAD;
const PITCH_MAX = 25 * RAD;
const OVERDRAG = 0.35; // rad di luar batas yang boleh ditarik
const K = 80; // kekakuan pegas
const C = 8.2; // redaman: zeta ~0,46 => bounce ~0,2
const TWEEN_MS = 400;
const KEY_STEP = 10 * RAD;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

interface Controller {
  setPhase: (i: number) => void;
  nudgeYaw: (d: number) => void;
}

export function ReferenceFigure3D({ exerciseId, phaseIndex = 0, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Controller | null>(null);
  const phaseRef = useRef(phaseIndex);
  const [fallback, setFallback] = useState(false);
  const ref = EXERCISE_REFERENCES[exerciseId] ?? EXERCISE_REFERENCES.squat;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const poses = ref.phases.map((p) => withDepth(p.landmarks, ref.orientation));
    const idx = (i: number) => clamp(i, 0, poses.length - 1);
    const cur: NormalizedLandmark[] = poses[idx(phaseRef.current)].map((l) => ({ ...l }));
    const from: NormalizedLandmark[] = cur.map((l) => ({ ...l }));
    let to = poses[idx(phaseRef.current)];
    let tweenStart = -1;

    // Sudut: nilai, target, kecepatan (yaw lalu pitch).
    let yaw = 0;
    let yawT = 0;
    let yawV = 0;
    let pitch = 0;
    let pitchT = 0;
    let pitchV = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let last = 0;
    let fig: ReturnType<typeof createPoseFigure> | null = null;
    let renderOnce: () => void = () => {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const step = (now: number) => {
      const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
      last = now;
      let busy = false;
      if (!dragging) {
        yawV += (yawT - yaw) * K * dt;
        yawV *= Math.max(0, 1 - C * dt);
        yaw += yawV * dt;
        pitchV += (pitchT - pitch) * K * dt;
        pitchV *= Math.max(0, 1 - C * dt);
        pitch += pitchV * dt;
        if (Math.abs(yawT - yaw) + Math.abs(yawV) + Math.abs(pitchT - pitch) + Math.abs(pitchV) > 1e-3) busy = true;
        else {
          yaw = yawT;
          pitch = pitchT;
        }
      }
      if (fig) {
        fig.group.rotation.set(pitch, yaw, 0, 'YXZ');
        if (tweenStart >= 0) {
          const k = Math.min(1, (now - tweenStart) / TWEEN_MS);
          const e = ease(k);
          for (let i = 0; i < cur.length; i++) {
            const p = from[i];
            const q = to[i];
            const o = cur[i];
            o.x = p.x + (q.x - p.x) * e;
            o.y = p.y + (q.y - p.y) * e;
            o.z = p.z + (q.z - p.z) * e;
          }
          fig.update(cur);
          if (k >= 1) tweenStart = -1;
          else busy = true;
        }
      }
      renderOnce();
      raf = busy ? requestAnimationFrame(step) : 0;
      if (!busy) last = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    const handle = mountScene(host, {
      continuous: false,
      onContextLost: () => setFallback(true),
      build: ({ scene, camera }) => {
        fig = createPoseFigure({
          jointRadius: 0.045,
          boneRadius: 0.025,
          jointColor: dark.text,
          boneColor: panels[6].bg,
          highlightColor: dark.danger,
        });
        fig.update(cur);
        scene.add(fig.group);
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dl = new THREE.DirectionalLight(0xffffff, 2);
        dl.position.set(2, 3, 4);
        scene.add(dl);
        camera.position.set(0, 0, 3.6);
        return () => fig?.dispose();
      },
    });
    if (!handle) {
      queueMicrotask(() => setFallback(true));
      return;
    }
    renderOnce = handle.renderOnce;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw = clamp(yaw + (e.clientX - lastX) * 0.01, -YAW - OVERDRAG, YAW + OVERDRAG);
      pitch = clamp(pitch + (e.clientY - lastY) * 0.008, PITCH_MIN - OVERDRAG, PITCH_MAX + OVERDRAG);
      lastX = e.clientX;
      lastY = e.clientY;
      yawV = 0;
      pitchV = 0;
      yawT = yaw;
      pitchT = pitch;
      if (fig) fig.group.rotation.set(pitch, yaw, 0, 'YXZ');
      renderOnce();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      yawT = clamp(yaw, -YAW, YAW);
      pitchT = clamp(pitch, PITCH_MIN, PITCH_MAX);
      kick();
    };
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);

    ctrlRef.current = {
      setPhase: (i) => {
        for (let j = 0; j < cur.length; j++) {
          from[j].x = cur[j].x;
          from[j].y = cur[j].y;
          from[j].z = cur[j].z;
        }
        to = poses[idx(i)];
        if (reduced.matches) {
          tweenStart = -1;
          for (let j = 0; j < cur.length; j++) {
            cur[j].x = to[j].x;
            cur[j].y = to[j].y;
            cur[j].z = to[j].z;
          }
          fig?.update(cur);
        } else {
          tweenStart = performance.now();
        }
        kick();
      },
      nudgeYaw: (d) => {
        yawT = clamp(yawT + d, -YAW, YAW);
        kick();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      ctrlRef.current = null;
      handle.dispose();
    };
  }, [ref]);

  useEffect(() => {
    phaseRef.current = phaseIndex;
    ctrlRef.current?.setPhase(phaseIndex);
  }, [phaseIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') ctrlRef.current?.nudgeYaw(-KEY_STEP);
    else if (e.key === 'ArrowRight') ctrlRef.current?.nudgeYaw(KEY_STEP);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`relative ${className ?? ''}`}
      role="group"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Figur 3D pose referensi ${ref.name}. Seret atau gunakan panah kiri dan kanan untuk memutar.`}
    >
      {fallback ? (
        <PoseFigureSvg
          landmarks={ref.phases[clamp(phaseIndex, 0, ref.phases.length - 1)].landmarks}
          orientation={ref.orientation}
          className="h-full w-full text-text"
        />
      ) : (
        <div ref={hostRef} className="h-full w-full touch-none" aria-hidden="true" />
      )}
    </div>
  );
}
