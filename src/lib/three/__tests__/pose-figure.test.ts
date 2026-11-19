import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
import { boneTransform, createPoseFigure, toWorld } from '../pose-figure';
import { BODY_BONES, BODY_JOINTS, interpolatePose, withDepth } from '../pose-depth';

describe('boneTransform', () => {
  it('posisi tengah, panjang, dan arah Y sejajar b-a', () => {
    const a = new THREE.Vector3(1, 2, 3);
    const b = new THREE.Vector3(4, 6, 3);
    const t = boneTransform(a, b);
    expect(t.length).toBeCloseTo(5);
    expect(t.position.toArray()).toEqual([2.5, 4, 3]);
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(t.quaternion);
    expect(y.dot(b.clone().sub(a).normalize())).toBeCloseTo(1);
  });
});

describe('toWorld', () => {
  it('membalik y dan memusatkan', () => {
    const c = toWorld({ x: 0.5, y: 0.5, z: 0 });
    expect(Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z)).toBe(0);
    const e = toWorld({ x: 1, y: 0, z: 0 });
    expect([e.x, e.y]).toEqual([1, 1]);
  });
});

describe('createPoseFigure', () => {
  it('jumlah instance benar dan update tidak error', () => {
    const fig = createPoseFigure({
      jointRadius: 0.03,
      boneRadius: 0.015,
      jointColor: 0xffffff,
      boneColor: 0xcccccc,
      highlightColor: 0xff0000,
    });
    const [bones, joints] = fig.group.children as THREE.InstancedMesh[];
    expect(joints.count).toBe(BODY_JOINTS.length);
    expect(bones.count).toBe(BODY_BONES.length);
    for (const ref of Object.values(EXERCISE_REFERENCES)) {
      for (const ph of ref.phases) {
        expect(() => fig.update(withDepth(ph.landmarks, ref.orientation))).not.toThrow();
      }
    }
    expect(() => fig.highlightBones([BODY_BONES[0]])).not.toThrow();
    expect(() => fig.highlightBones(null)).not.toThrow();
    fig.dispose();
  });
});

describe('pose-depth', () => {
  const base = Array.from({ length: 33 }, (_, i) => ({ x: i / 33, y: 0.5, z: 0 }));
  it('withDepth tidak memutasi dan memberi z berlawanan', () => {
    const copy = JSON.parse(JSON.stringify(base));
    const out = withDepth(base, 'side');
    expect(base).toEqual(copy);
    expect(out[11].z).toBeLessThan(0);
    expect(out[12].z).toBeGreaterThan(0);
    expect(out[0].z).toBe(0);
  });
  it('interpolatePose', () => {
    const b = base.map((p) => ({ x: p.x + 1, y: p.y + 1, z: 1 }));
    expect(interpolatePose(base, b, 0)[5]).toEqual(base[5]);
    expect(interpolatePose(base, b, 1)[5]).toEqual(b[5]);
    expect(interpolatePose(base, b, 0.5)[5].z).toBeCloseTo(0.5);
    expect(interpolatePose(base, b, 9)[5]).toEqual(b[5]);
  });
});
