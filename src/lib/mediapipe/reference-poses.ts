import type { NormalizedLandmark } from '@/trackers/types';
import { PoseLandmark } from './landmarks';

export interface PosePhase {
  name: string;
  subtitle: string;
  description: string;
  keyAngles: { joint: string; angle: string; position: { x: number; y: number } }[];
  checkpoints: string[];
  landmarks: NormalizedLandmark[];
}

export interface ExerciseReference {
  id: string;
  name: string;
  orientation: 'side' | 'front';
  phases: PosePhase[];
}

function createEmptyPose(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.95,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUSH-UP REFERENCE POSES (Side View)
// ─────────────────────────────────────────────────────────────────────────────

// Push-up Up Phase (Plank/Lengan Lurus)
const pushupUpPose = createEmptyPose();
pushupUpPose[PoseLandmark.NOSE] = { x: 0.20, y: 0.40, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.28, y: 0.45, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.28, y: 0.45, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_ELBOW] = { x: 0.28, y: 0.60, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.28, y: 0.60, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_WRIST] = { x: 0.28, y: 0.75, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_WRIST] = { x: 0.28, y: 0.75, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_HIP] = { x: 0.52, y: 0.52, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_HIP] = { x: 0.52, y: 0.52, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_KNEE] = { x: 0.66, y: 0.62, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_KNEE] = { x: 0.66, y: 0.62, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.LEFT_ANKLE] = { x: 0.80, y: 0.72, z: 0, visibility: 0.95 };
pushupUpPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.80, y: 0.72, z: 0, visibility: 0.95 };

// Push-up Down Phase (Dada Turun, Siku 90°)
const pushupDownPose = createEmptyPose();
pushupDownPose[PoseLandmark.NOSE] = { x: 0.20, y: 0.62, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.28, y: 0.65, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.28, y: 0.65, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_ELBOW] = { x: 0.36, y: 0.65, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.36, y: 0.65, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_WRIST] = { x: 0.36, y: 0.75, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_WRIST] = { x: 0.36, y: 0.75, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_HIP] = { x: 0.53, y: 0.68, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_HIP] = { x: 0.53, y: 0.68, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_KNEE] = { x: 0.66, y: 0.70, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_KNEE] = { x: 0.66, y: 0.70, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.LEFT_ANKLE] = { x: 0.80, y: 0.73, z: 0, visibility: 0.95 };
pushupDownPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.80, y: 0.73, z: 0, visibility: 0.95 };

// ─────────────────────────────────────────────────────────────────────────────
// 2. SQUAT REFERENCE POSES (Side View)
// ─────────────────────────────────────────────────────────────────────────────

// Squat Standing Phase (Berdiri Tegak)
const squatStandingPose = createEmptyPose();
squatStandingPose[PoseLandmark.NOSE] = { x: 0.50, y: 0.15, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.50, y: 0.25, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.50, y: 0.25, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_ELBOW] = { x: 0.44, y: 0.35, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.44, y: 0.35, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_WRIST] = { x: 0.40, y: 0.30, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_WRIST] = { x: 0.40, y: 0.30, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_HIP] = { x: 0.50, y: 0.50, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_HIP] = { x: 0.50, y: 0.50, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_KNEE] = { x: 0.50, y: 0.68, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_KNEE] = { x: 0.50, y: 0.68, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.LEFT_ANKLE] = { x: 0.50, y: 0.88, z: 0, visibility: 0.95 };
squatStandingPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.50, y: 0.88, z: 0, visibility: 0.95 };

// Squat Deep Phase (Paha Paralel, Pinggul ke Belakang, Lutut Tidak Melewati Jari Kaki)
const squatDeepPose = createEmptyPose();
squatDeepPose[PoseLandmark.NOSE] = { x: 0.42, y: 0.30, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.44, y: 0.38, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.44, y: 0.38, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_ELBOW] = { x: 0.35, y: 0.45, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.35, y: 0.45, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_WRIST] = { x: 0.30, y: 0.42, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_WRIST] = { x: 0.30, y: 0.42, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_HIP] = { x: 0.62, y: 0.62, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_HIP] = { x: 0.62, y: 0.62, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_KNEE] = { x: 0.48, y: 0.62, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_KNEE] = { x: 0.48, y: 0.62, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.LEFT_ANKLE] = { x: 0.50, y: 0.88, z: 0, visibility: 0.95 };
squatDeepPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.50, y: 0.88, z: 0, visibility: 0.95 };

// ─────────────────────────────────────────────────────────────────────────────
// 3. SIT-UP REFERENCE POSES (Side View)
// ─────────────────────────────────────────────────────────────────────────────

// Sit-up Lying Phase
const situpLyingPose = createEmptyPose();
situpLyingPose[PoseLandmark.NOSE] = { x: 0.18, y: 0.68, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.25, y: 0.72, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.25, y: 0.72, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_ELBOW] = { x: 0.20, y: 0.62, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.20, y: 0.62, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_WRIST] = { x: 0.24, y: 0.60, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_WRIST] = { x: 0.24, y: 0.60, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_HIP] = { x: 0.48, y: 0.75, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_HIP] = { x: 0.48, y: 0.75, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_KNEE] = { x: 0.65, y: 0.55, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_KNEE] = { x: 0.65, y: 0.55, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.LEFT_ANKLE] = { x: 0.80, y: 0.75, z: 0, visibility: 0.95 };
situpLyingPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.80, y: 0.75, z: 0, visibility: 0.95 };

// Sit-up Crunched Phase (Torso Terangkat Tinggi)
const situpCrunchedPose = createEmptyPose();
situpCrunchedPose[PoseLandmark.NOSE] = { x: 0.42, y: 0.40, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.44, y: 0.48, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.44, y: 0.48, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_ELBOW] = { x: 0.38, y: 0.42, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.38, y: 0.42, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_WRIST] = { x: 0.42, y: 0.38, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_WRIST] = { x: 0.42, y: 0.38, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_HIP] = { x: 0.48, y: 0.75, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_HIP] = { x: 0.48, y: 0.75, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_KNEE] = { x: 0.65, y: 0.55, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_KNEE] = { x: 0.65, y: 0.55, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.LEFT_ANKLE] = { x: 0.80, y: 0.75, z: 0, visibility: 0.95 };
situpCrunchedPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.80, y: 0.75, z: 0, visibility: 0.95 };

// ─────────────────────────────────────────────────────────────────────────────
// 4. JUMPING JACK REFERENCE POSES (Front View)
// ─────────────────────────────────────────────────────────────────────────────

// Jumping Jack Closed Phase (Rapat)
const jjClosedPose = createEmptyPose();
jjClosedPose[PoseLandmark.NOSE] = { x: 0.50, y: 0.15, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.45, y: 0.26, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.55, y: 0.26, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_ELBOW] = { x: 0.43, y: 0.40, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.57, y: 0.40, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_WRIST] = { x: 0.43, y: 0.55, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_WRIST] = { x: 0.57, y: 0.55, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_HIP] = { x: 0.47, y: 0.52, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_HIP] = { x: 0.53, y: 0.52, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_KNEE] = { x: 0.47, y: 0.70, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_KNEE] = { x: 0.53, y: 0.70, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.LEFT_ANKLE] = { x: 0.47, y: 0.88, z: 0, visibility: 0.95 };
jjClosedPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.53, y: 0.88, z: 0, visibility: 0.95 };

// Jumping Jack Open Phase (Bintang / Star Shape)
const jjOpenPose = createEmptyPose();
jjOpenPose[PoseLandmark.NOSE] = { x: 0.50, y: 0.15, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.45, y: 0.26, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.55, y: 0.26, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_ELBOW] = { x: 0.35, y: 0.16, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.65, y: 0.16, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_WRIST] = { x: 0.42, y: 0.05, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_WRIST] = { x: 0.58, y: 0.05, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_HIP] = { x: 0.47, y: 0.52, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_HIP] = { x: 0.53, y: 0.52, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_KNEE] = { x: 0.38, y: 0.70, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_KNEE] = { x: 0.62, y: 0.70, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.LEFT_ANKLE] = { x: 0.30, y: 0.88, z: 0, visibility: 0.95 };
jjOpenPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.70, y: 0.88, z: 0, visibility: 0.95 };

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLANK REFERENCE POSES (Side View)
// ─────────────────────────────────────────────────────────────────────────────

// Plank Solid Hold Phase (Lurus Sempurna 180°)
const plankHoldPose = createEmptyPose();
plankHoldPose[PoseLandmark.NOSE] = { x: 0.20, y: 0.48, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_SHOULDER] = { x: 0.28, y: 0.52, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.RIGHT_SHOULDER] = { x: 0.28, y: 0.52, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_ELBOW] = { x: 0.28, y: 0.68, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.RIGHT_ELBOW] = { x: 0.28, y: 0.68, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_WRIST] = { x: 0.20, y: 0.68, z: 0, visibility: 0.95 }; // Lengan bawah menempel lantai
plankHoldPose[PoseLandmark.RIGHT_WRIST] = { x: 0.20, y: 0.68, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_HIP] = { x: 0.52, y: 0.58, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.RIGHT_HIP] = { x: 0.52, y: 0.58, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_KNEE] = { x: 0.66, y: 0.63, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.RIGHT_KNEE] = { x: 0.66, y: 0.63, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.LEFT_ANKLE] = { x: 0.80, y: 0.68, z: 0, visibility: 0.95 };
plankHoldPose[PoseLandmark.RIGHT_ANKLE] = { x: 0.80, y: 0.68, z: 0, visibility: 0.95 };

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY SELURUH EXERCISE REFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export const EXERCISE_REFERENCES: Record<string, ExerciseReference> = {
  pushup: {
    id: 'pushup',
    name: 'Push-up',
    orientation: 'side',
    phases: [
      {
        name: 'Posisi Bawah (Down)',
        subtitle: 'Titik Kontraksi Maksimal',
        description: 'Turunkan dada hingga siku membentuk sudut sekitar 90°. Tubuh tetap lurus kaku.',
        keyAngles: [
          { joint: 'Siku', angle: '85° - 95°', position: { x: 0.38, y: 0.63 } },
          { joint: 'Garis Punggung', angle: '180°', position: { x: 0.53, y: 0.65 } },
        ],
        checkpoints: [
          'Siku menekuk membentuk sudut siku-siku (~90°)',
          'Dada berjarak sekitar 5-10 cm dari lantai',
          'Pinggul tidak melorot dan tidak menungging',
        ],
        landmarks: pushupDownPose,
      },
      {
        name: 'Posisi Atas (Up / Lockout)',
        subtitle: 'Titik Awal & Akhir Repetisi',
        description: 'Lengan lurus menopang tubuh dengan garis bahu, pinggul, dan tumit sejajar.',
        keyAngles: [
          { joint: 'Siku', angle: '> 160°', position: { x: 0.29, y: 0.58 } },
          { joint: 'Garis Tubuh', angle: '180°', position: { x: 0.52, y: 0.49 } },
        ],
        checkpoints: [
          'Kedua siku lurus terkunci di atas',
          'Bahu sejajar di atas pergelangan tangan',
          'Kencangkan otot perut dan bokong',
        ],
        landmarks: pushupUpPose,
      },
    ],
  },

  squat: {
    id: 'squat',
    name: 'Squat',
    orientation: 'side',
    phases: [
      {
        name: 'Posisi Jongkok (Deep Squat)',
        subtitle: 'Titik Kedalaman Paha Paralel',
        description: 'Pinggul didorong ke belakang, paha sejajar lantai, dan dada tetap membusung tegap.',
        keyAngles: [
          { joint: 'Lutut', angle: '90° - 100°', position: { x: 0.48, y: 0.59 } },
          { joint: 'Torso', angle: '> 65°', position: { x: 0.50, y: 0.45 } },
        ],
        checkpoints: [
          'Paha sejajar dengan permukaan lantai (sudut lutut < 100°)',
          'Lutut tidak terdorong jauh melewati ujung jari kaki',
          'Dada tetap tegap, tidak membungkuk ke lantai',
        ],
        landmarks: squatDeepPose,
      },
      {
        name: 'Posisi Berdiri (Standing Lockout)',
        subtitle: 'Posisi Awal & Akhir Repetisi',
        description: 'Berdiri tegak lurus dengan kaki dibuka selebar bahu dan lutut lurus.',
        keyAngles: [
          { joint: 'Lutut', angle: '> 160°', position: { x: 0.52, y: 0.68 } },
        ],
        checkpoints: [
          'Kaki dibuka selebar bahu',
          'Lutut dan pinggul lurus tegak',
          'Pandangan lurus ke arah depan',
        ],
        landmarks: squatStandingPose,
      },
    ],
  },

  situp: {
    id: 'situp',
    name: 'Sit-up',
    orientation: 'side',
    phases: [
      {
        name: 'Posisi Angkat (Crunch Up)',
        subtitle: 'Kontraksi Otot Inti (Core)',
        description: 'Torso diangkat tinggi ke arah lutut menggunakan kekuatan murni otot perut.',
        keyAngles: [
          { joint: 'Sudut Torso', angle: '< 90°', position: { x: 0.48, y: 0.60 } },
        ],
        checkpoints: [
          'Torso terangkat mendekati paha',
          'Dada mengarah ke lutut tanpa menarik paksa leher',
          'Kedua telapak kaki tetap menapak di lantai',
        ],
        landmarks: situpCrunchedPose,
      },
      {
        name: 'Posisi Berbaring (Lying)',
        subtitle: 'Titik Ekstensi Awal',
        description: 'Punggung kembali menempel ke matras dengan lutut tetap ditekuk 90°.',
        keyAngles: [
          { joint: 'Sudut Torso', angle: '> 145°', position: { x: 0.38, y: 0.72 } },
        ],
        checkpoints: [
          'Punggung dan bahu menyentuh lantai dengan terkontrol',
          'Lutut ditekuk sekitar 90 derajat',
        ],
        landmarks: situpLyingPose,
      },
    ],
  },

  jumping_jack: {
    id: 'jumping_jack',
    name: 'Jumping Jack',
    orientation: 'front',
    phases: [
      {
        name: 'Posisi Terbuka (Open / Star)',
        subtitle: 'Lompatan Tangan & Kaki Lebar',
        description: 'Tangan diangkat tinggi melengkung ke atas kepala dan kaki dibuka lebar melampaui bahu.',
        keyAngles: [
          { joint: 'Bukaan Lengan', angle: '> 130°', position: { x: 0.40, y: 0.12 } },
          { joint: 'Rasio Kaki', angle: '> 1.5x Bahu', position: { x: 0.50, y: 0.88 } },
        ],
        checkpoints: [
          'Kedua tangan diangkat tinggi di atas kepala secara simetris',
          'Kaki mendarat dengan bukaan sekitar 1.5 hingga 2 kali lebar bahu',
          'Mendarat dengan lembut di bagian depan telapak kaki',
        ],
        landmarks: jjOpenPose,
      },
      {
        name: 'Posisi Tertutup (Closed)',
        subtitle: 'Posisi Rapat Awal',
        description: 'Berdiri tegak dengan kedua lengan lurus di samping paha dan kedua kaki rapat.',
        keyAngles: [
          { joint: 'Lengan', angle: '< 60°', position: { x: 0.40, y: 0.45 } },
          { joint: 'Kaki', angle: '< 1.1x Bahu', position: { x: 0.50, y: 0.88 } },
        ],
        checkpoints: [
          'Kedua tangan berada tepat di samping tubuh',
          'Kaki rapat berdekatan',
          'Tubuh tegak menghadap ke depan',
        ],
        landmarks: jjClosedPose,
      },
    ],
  },

  plank: {
    id: 'plank',
    name: 'Plank',
    orientation: 'side',
    phases: [
      {
        name: 'Postur Lurus Sempurna (Solid Plank)',
        subtitle: 'Ketahanan Isometrik Otot Inti',
        description: 'Lengan bawah menopang tubuh dengan garis lurus stabil dari kepala, pinggul, hingga tumit.',
        keyAngles: [
          { joint: 'Garis Punggung', angle: '170° - 180°', position: { x: 0.52, y: 0.55 } },
          { joint: 'Siku', angle: '90° di lantai', position: { x: 0.28, y: 0.70 } },
        ],
        checkpoints: [
          'Garis lurus dari kepala, bahu, pinggul, sampai mata kaki',
          'Siku berada tepat vertikal di bawah bahu di lantai',
          'Kencangkan perut, jangan biarkan pinggul merosot ke bawah',
        ],
        landmarks: plankHoldPose,
      },
    ],
  },
};

export const REFERENCE_POSES = EXERCISE_REFERENCES;

