import * as THREE from 'three';
import type { NormalizedLandmark } from '@/trackers/types';

/*
 * Manekin bervolume dari 13 landmark inti BlazePose (data referensi hanya mengisi hidung,
 * bahu, siku, pergelangan, pinggul, lutut, pergelangan kaki). Segmen = silinder meruncing,
 * sendi = bola kontras (gaya manekin kayu), torso = blok pipih mengikuti bahu-pinggul.
 * Tangan, kaki, dan kepala diturunkan dari sendi terdekat.
 */

export interface MannequinOptions {
  bodyColor: THREE.ColorRepresentation;
  jointColor: THREE.ColorRepresentation;
}

type Seg = { a: number; b: number; mesh: THREE.Mesh };

const Y = new THREE.Vector3(0, 1, 0);
// Indeks semu untuk titik turunan.
const SH_MID = 100;
const HIP_MID = 101;
const HEAD = 102;
const FOOT_L = 103;
const FOOT_R = 104;
const HAND_L = 105;
const HAND_R = 106;

export function createMannequin(opts: MannequinOptions) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: opts.bodyColor, roughness: 0.5 });
  const jointMat = new THREE.MeshStandardMaterial({ color: opts.jointColor, roughness: 0.4 });
  const geos: THREE.BufferGeometry[] = [];
  const group = new THREE.Group();
  const P = new Map<number, THREE.Vector3>();
  const pt = (i: number) => {
    let v = P.get(i);
    if (!v) P.set(i, (v = new THREE.Vector3()));
    return v;
  };

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  // Silinder satuan sepanjang Y, jari-jari bawah rA (di a) dan atas rB (di b).
  const segs: Seg[] = [];
  const seg = (a: number, b: number, rA: number, rB: number) =>
    segs.push({ a, b, mesh: mesh(new THREE.CylinderGeometry(rB, rA, 1, 18, 1, true), bodyMat) });

  seg(11, 13, 0.05, 0.042); // lengan atas
  seg(12, 14, 0.05, 0.042);
  seg(13, 15, 0.042, 0.034); // lengan bawah
  seg(14, 16, 0.042, 0.034);
  seg(23, 25, 0.075, 0.058); // paha
  seg(24, 26, 0.075, 0.058);
  seg(25, 27, 0.056, 0.042); // betis
  seg(26, 28, 0.056, 0.042);
  seg(27, FOOT_L, 0.042, 0.034); // kaki
  seg(28, FOOT_R, 0.042, 0.034);
  seg(SH_MID, HEAD, 0.045, 0.045); // leher
  seg(23, 24, 0.085, 0.085); // panggul

  const balls: Array<{ i: number; mesh: THREE.Mesh }> = [];
  const ball = (i: number, r: number, mat = jointMat) =>
    balls.push({ i, mesh: mesh(new THREE.SphereGeometry(r, 20, 14), mat) });
  ball(11, 0.06);
  ball(12, 0.06);
  ball(13, 0.046);
  ball(14, 0.046);
  ball(HAND_L, 0.05);
  ball(HAND_R, 0.05);
  ball(23, 0.08);
  ball(24, 0.08);
  ball(25, 0.062);
  ball(26, 0.062);
  ball(27, 0.046);
  ball(28, 0.046);
  ball(FOOT_L, 0.036, bodyMat);
  ball(FOOT_R, 0.036, bodyMat);
  ball(HEAD, 0.105, bodyMat);

  // Torso: silinder meruncing (dada lebih lebar dari pinggang), dipipihkan lewat basis bahu-pinggul.
  const torso = mesh(new THREE.CylinderGeometry(1, 0.78, 1, 28), bodyMat);
  torso.matrixAutoUpdate = false;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.28 }));
  geos.push(floor.geometry);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Objek kerja dipakai ulang.
  const d = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const ax = new THREE.Vector3();
  const ay = new THREE.Vector3();
  const az = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const world = (l: NormalizedLandmark, out: THREE.Vector3) => out.set((l.x - 0.5) * 2, -(l.y - 0.5) * 2, l.z * 2);

  /** Arah jari kaki: telungkup = ke lantai, depan = ke kamera, selain itu menjauhi pinggul. */
  function footDir(ankle: number, knee: number, front: boolean, out: THREE.Vector3) {
    if (front) return out.set(0, 0, 1);
    d.subVectors(pt(ankle), pt(knee)).normalize();
    if (Math.abs(d.y) < 0.45) return out.set(0, -1, 0);
    let dx = pt(ankle).x - pt(HIP_MID).x;
    if (Math.abs(dx) < 0.06) dx = pt(0).x - pt(HIP_MID).x;
    return out.set(Math.sign(dx) || 1, 0, 0);
  }

  function update(lm: NormalizedLandmark[], orientation: 'side' | 'front') {
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) world(lm[i], pt(i));
    pt(SH_MID).addVectors(pt(11), pt(12)).multiplyScalar(0.5);
    pt(HIP_MID).addVectors(pt(23), pt(24)).multiplyScalar(0.5);
    // Kepala: sedikit di belakang hidung, ke arah leher.
    pt(HEAD).copy(pt(0)).add(tmp.subVectors(pt(SH_MID), pt(0)).normalize().multiplyScalar(0.07));
    // Tangan: lanjut sedikit dari pergelangan searah lengan bawah.
    pt(HAND_L).copy(pt(15)).add(tmp.subVectors(pt(15), pt(13)).normalize().multiplyScalar(0.045));
    pt(HAND_R).copy(pt(16)).add(tmp.subVectors(pt(16), pt(14)).normalize().multiplyScalar(0.045));
    const front = orientation === 'front';
    pt(FOOT_L).copy(pt(27)).add(footDir(27, 25, front, tmp).multiplyScalar(0.16));
    pt(FOOT_R).copy(pt(28)).add(footDir(28, 26, front, tmp).multiplyScalar(0.16));

    for (const s of segs) {
      const a = pt(s.a);
      const b = pt(s.b);
      d.subVectors(b, a);
      const length = d.length();
      if (length > 1e-6) q.setFromUnitVectors(Y, d.divideScalar(length));
      s.mesh.quaternion.copy(q);
      s.mesh.position.addVectors(a, b).multiplyScalar(0.5);
      s.mesh.scale.set(1, Math.max(length, 1e-4), 1);
    }
    for (const b of balls) b.mesh.position.copy(pt(b.i));

    // Basis torso: Y = pinggul->bahu, X = kiri->kanan (ortogonal ke Y), Z = X x Y.
    ay.subVectors(pt(SH_MID), pt(HIP_MID));
    const tl = ay.length();
    ay.divideScalar(tl || 1);
    ax.subVectors(pt(12), pt(11));
    ax.addScaledVector(ay, -ax.dot(ay));
    if (ax.lengthSq() < 1e-8) ax.set(1, 0, 0);
    ax.normalize();
    az.crossVectors(ax, ay).normalize();
    torso.matrix.makeBasis(ax.multiplyScalar(0.16), ay.multiplyScalar(tl * 1.05), az.multiplyScalar(0.1));
    torso.matrix.setPosition(tmp.addVectors(pt(SH_MID), pt(HIP_MID)).multiplyScalar(0.5));
  }

  /** Letakkan lantai bayangan di y dunia (titik terendah semua fase). */
  function setFloor(y: number) {
    floor.position.y = y;
  }

  function dispose() {
    geos.forEach((g) => g.dispose());
    bodyMat.dispose();
    jointMat.dispose();
    (floor.material as THREE.Material).dispose();
  }

  return { group, update, setFloor, dispose };
}

/** y dunia terendah dari kumpulan pose (untuk lantai), dikurangi radius kaki. */
export function floorY(poses: NormalizedLandmark[][]): number {
  let max = -Infinity;
  for (const p of poses) for (const i of [15, 16, 25, 26, 27, 28]) max = Math.max(max, p[i]?.y ?? -Infinity);
  return -(max - 0.5) * 2 - 0.05;
}
