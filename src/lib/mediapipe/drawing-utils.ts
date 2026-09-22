import type { NormalizedLandmark } from '@/trackers/types';
import { POSE_CONNECTIONS, PoseLandmark } from './landmarks';

export interface DrawSkeletonOptions {
  boneColor?: string;
  jointColor?: string;
  accentColor?: string;
  lineWidth?: number;
  jointRadius?: number;
  angles?: Record<string, number>;
  showAngles?: boolean;
  hasFault?: boolean;
}

/**
 * Menggambar skeleton pose dan sudut sendi secara real-time pada 2D HTML Canvas overlay.
 * Jika hasFault=true, warna tulang dan sendi berubah menjadi merah neon sebagai peringatan visual instan.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  options: DrawSkeletonOptions = {}
): void {
  const {
    hasFault = false,
    boneColor = hasFault ? 'rgba(255, 23, 68, 0.95)' : 'rgba(0, 230, 118, 0.85)',
    jointColor = hasFault ? '#ff5252' : 'rgba(255, 255, 255, 0.95)',
    accentColor = hasFault ? '#ff1744' : '#00e5ff',
    lineWidth = hasFault ? 4 : 3,
    jointRadius = hasFault ? 5 : 4,
    angles = {},
    showAngles = true,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length < 33) return;

  // 1. Gambar sambungan tulang (Bones)
  ctx.save();
  ctx.strokeStyle = boneColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (hasFault) {
    ctx.shadowColor = 'rgba(255, 23, 68, 0.6)';
    ctx.shadowBlur = 8;
  }

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];

    if ((p1.visibility ?? 1) < 0.4 || (p2.visibility ?? 1) < 0.4) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Gambar titik sendi (Joints)
  ctx.save();
  ctx.fillStyle = jointColor;
  ctx.strokeStyle = hasFault ? '#ff1744' : boneColor;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if ((lm.visibility ?? 1) < 0.4) continue;

    // Sederhanakan landmark wajah selain hidung
    if (i > PoseLandmark.NOSE && i <= PoseLandmark.MOUTH_RIGHT) continue;

    const px = lm.x * width;
    const py = lm.y * height;

    ctx.beginPath();
    ctx.arc(px, py, jointRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 3. Gambar label sudut sendi jika tersedia
  if (showAngles && Object.keys(angles).length > 0) {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = accentColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;

    const angleToLandmark: Record<string, number> = {
      leftElbow: PoseLandmark.LEFT_ELBOW,
      rightElbow: PoseLandmark.RIGHT_ELBOW,
      leftKnee: PoseLandmark.LEFT_KNEE,
      rightKnee: PoseLandmark.RIGHT_KNEE,
      leftTorso: PoseLandmark.LEFT_HIP,
      rightTorso: PoseLandmark.RIGHT_HIP,
      leftArm: PoseLandmark.LEFT_SHOULDER,
      rightArm: PoseLandmark.RIGHT_SHOULDER,
      leftSpine: PoseLandmark.LEFT_HIP,
      rightSpine: PoseLandmark.RIGHT_HIP,
      torsoLean: PoseLandmark.LEFT_HIP,
      bodyLine: PoseLandmark.LEFT_HIP,
    };

    for (const [key, val] of Object.entries(angles)) {
      const lmIdx = angleToLandmark[key];
      if (lmIdx !== undefined) {
        const pt = landmarks[lmIdx];
        if (pt && (pt.visibility ?? 1) >= 0.4) {
          const px = pt.x * width + 8;
          const py = pt.y * height - 8;
          ctx.fillText(`${Math.round(val)}°`, px, py);
        }
      }
    }
    ctx.restore();
  }
}

/**
 * Menggambar bayangan skeleton ideal (Ghost Skeleton) semi-transparan
 * yang bergerak terus-menerus sesuai ritme tempo target.
 */
export function drawGhostSkeleton(
  ctx: CanvasRenderingContext2D,
  referenceLandmarksA: NormalizedLandmark[],
  referenceLandmarksB: NormalizedLandmark[],
  elapsedMs: number,
  width: number,
  height: number,
  userLandmarks?: NormalizedLandmark[]
): void {
  if (!referenceLandmarksA || !referenceLandmarksB) return;

  // Siklus interpolasi 3.2 detik (ritme repetisi standar)
  const cycle = (Math.sin((elapsedMs / 3200) * 2 * Math.PI) + 1) / 2;

  // Hitung bounding box tubuh pengguna jika ada untuk penyelarasan skala
  let shiftX = 0;
  let shiftY = 0;
  let scale = 1.0;

  if (userLandmarks && userLandmarks.length >= 33) {
    const validUserPts = userLandmarks.filter((p) => (p.visibility ?? 1) >= 0.4);
    if (validUserPts.length >= 8) {
      const uMinX = Math.min(...validUserPts.map((p) => p.x));
      const uMaxX = Math.max(...validUserPts.map((p) => p.x));
      const uMinY = Math.min(...validUserPts.map((p) => p.y));
      const uMaxY = Math.max(...validUserPts.map((p) => p.y));

      const uCenterX = (uMinX + uMaxX) / 2;
      const uCenterY = (uMinY + uMaxY) / 2;
      const uHeight = uMaxY - uMinY;

      // Pusat referensi pose
      const rMinY = Math.min(...referenceLandmarksA.map((p) => p.y));
      const rMaxY = Math.max(...referenceLandmarksA.map((p) => p.y));
      const rCenterY = (rMinY + rMaxY) / 2;
      const rHeight = rMaxY - rMinY;

      if (rHeight > 0 && uHeight > 0) {
        scale = Math.max(0.6, Math.min(1.4, uHeight / rHeight));
      }
      shiftX = uCenterX - 0.5;
      shiftY = uCenterY - rCenterY;
    }
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)'; // Neon purple/violet ghost
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 5]); // Garis putus-putus
  ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
  ctx.shadowBlur = 6;

  // Gambar sambungan tulang bayangan
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const a1 = referenceLandmarksA[startIdx];
    const b1 = referenceLandmarksB[startIdx];
    const a2 = referenceLandmarksA[endIdx];
    const b2 = referenceLandmarksB[endIdx];

    if (!a1 || !b1 || !a2 || !b2) continue;

    // Interpolasi halus
    const rawX1 = a1.x * (1 - cycle) + b1.x * cycle;
    const rawY1 = a1.y * (1 - cycle) + b1.y * cycle;
    const rawX2 = a2.x * (1 - cycle) + b2.x * cycle;
    const rawY2 = a2.y * (1 - cycle) + b2.y * cycle;

    const x1 = ((rawX1 - 0.5) * scale + 0.5 + shiftX) * width;
    const y1 = (rawY1 * scale + shiftY) * height;
    const x2 = ((rawX2 - 0.5) * scale + 0.5 + shiftX) * width;
    const y2 = (rawY2 * scale + shiftY) * height;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Label penanda bayangan
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = 'rgba(216, 180, 254, 0.7)';
  ctx.fillText('👻 Bayangan Ritme Ideal', 16, height - 16);
  ctx.restore();
}

/**
 * Menggambar indikator progres gestur tangan melingkar (Circular Progress Meter)
 */
export function drawGestureIndicator(
  ctx: CanvasRenderingContext2D,
  targetPoint: { x: number; y: number },
  progress: number,
  label: string,
  width: number,
  height: number
): void {
  const px = targetPoint.x * width;
  const py = targetPoint.y * height;
  const radius = 28;

  ctx.save();

  // Lingkaran latar belakang
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Busur progres aktif
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + progress * 2 * Math.PI;
  ctx.arc(px, py, radius, startAngle, endAngle);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Label persentase di tengah
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress * 100)}%`, px, py);

  // Label keterangan di atas
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, px, py - radius - 10);

  ctx.restore();
}
