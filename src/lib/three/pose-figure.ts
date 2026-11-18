import * as THREE from 'three';
import type { NormalizedLandmark } from '@/trackers/types';
import { BODY_BONES, BODY_JOINTS } from './pose-depth';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Transform silinder satuan (tinggi 1 sepanjang Y) yang menghubungkan a ke b. */
export function boneTransform(a: THREE.Vector3, b: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  const quaternion = new THREE.Quaternion();
  if (length > 1e-9) quaternion.setFromUnitVectors(Y_AXIS, dir.divideScalar(length));
  const position = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return { position, quaternion, length };
}

export function toWorld(l: NormalizedLandmark, scale = 2): THREE.Vector3 {
  return new THREE.Vector3((l.x - 0.5) * scale, -(l.y - 0.5) * scale, l.z * scale);
}

export interface PoseFigureOptions {
  jointRadius: number;
  boneRadius: number;
  jointColor: THREE.ColorRepresentation;
  boneColor: THREE.ColorRepresentation;
  highlightColor: THREE.ColorRepresentation;
}

export function createPoseFigure(opts: PoseFigureOptions) {
  const gradientMap = new THREE.DataTexture(
    new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]),
    3,
    1,
    THREE.RGBAFormat,
  );
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  const jointGeo = new THREE.SphereGeometry(opts.jointRadius, 16, 12);
  const boneGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const jointMat = new THREE.MeshToonMaterial({ color: opts.jointColor, gradientMap });
  const boneMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });

  const joints = new THREE.InstancedMesh(jointGeo, jointMat, BODY_JOINTS.length);
  const bones = new THREE.InstancedMesh(boneGeo, boneMat, BODY_BONES.length);
  joints.frustumCulled = false;
  bones.frustumCulled = false;

  const baseColor = new THREE.Color(opts.boneColor);
  const hiColor = new THREE.Color(opts.highlightColor);
  for (let i = 0; i < BODY_BONES.length; i++) bones.setColorAt(i, baseColor);

  const group = new THREE.Group();
  group.add(bones, joints);

  // Objek kerja dipakai ulang agar update() tidak mengalokasi per frame.
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const sc = new THREE.Vector3();

  const setWorld = (l: NormalizedLandmark, out: THREE.Vector3) =>
    out.set((l.x - 0.5) * 2, -(l.y - 0.5) * 2, l.z * 2);

  function update(landmarks: NormalizedLandmark[]) {
    q.identity();
    for (let i = 0; i < BODY_JOINTS.length; i++) {
      const l = landmarks[BODY_JOINTS[i]];
      if (!l) continue;
      m.compose(setWorld(l, pos), q, one);
      joints.setMatrixAt(i, m);
    }
    for (let i = 0; i < BODY_BONES.length; i++) {
      const la = landmarks[BODY_BONES[i][0]];
      const lb = landmarks[BODY_BONES[i][1]];
      if (!la || !lb) continue;
      setWorld(la, pa);
      setWorld(lb, pb);
      dir.subVectors(pb, pa);
      const len = dir.length();
      if (len > 1e-9) q.setFromUnitVectors(Y_AXIS, dir.divideScalar(len));
      else q.identity();
      pos.addVectors(pa, pb).multiplyScalar(0.5);
      sc.set(opts.boneRadius, len, opts.boneRadius);
      m.compose(pos, q, sc);
      bones.setMatrixAt(i, m);
    }
    joints.instanceMatrix.needsUpdate = true;
    bones.instanceMatrix.needsUpdate = true;
  }

  function highlightBones(pairs: [number, number][] | null) {
    for (let i = 0; i < BODY_BONES.length; i++) {
      const [a, b] = BODY_BONES[i];
      const hit = pairs?.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
      bones.setColorAt(i, hit ? hiColor : baseColor);
    }
    if (bones.instanceColor) bones.instanceColor.needsUpdate = true;
  }

  function dispose() {
    jointGeo.dispose();
    boneGeo.dispose();
    jointMat.dispose();
    boneMat.dispose();
    gradientMap.dispose();
    joints.dispose();
    bones.dispose();
  }

  return { group, update, highlightBones, dispose };
}
