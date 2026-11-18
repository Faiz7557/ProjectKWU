import { light, panels } from '@/lib/design/tokens';

export interface ShareCardData {
  exerciseName: string;
  reps: number | null;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  /** Undefined = belum ada data; kartu menampilkan "—". */
  formScore?: number;
  caloriesBurned: number;
  cleanReps?: number | null;
}

// Judul/angka memakai Gabarito, body memakai Rethink Sans.
const DISPLAY_FONT = '"Gabarito", "Rethink Sans", sans-serif';
const BODY_FONT = '"Rethink Sans", "Gabarito", sans-serif';
const ACCENT = panels[0].bg;

/**
 * Generate sebuah grafis kartu hasil latihan beresolusi tinggi (800x800)
 * menggunakan Canvas 2D API di browser.
 */
export async function generateShareCard(data: ShareCardData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context tidak tersedia');

  // 1. Latar kartu (canvas terang)
  ctx.fillStyle = light.canvas;
  ctx.fillRect(0, 0, 800, 800);

  // 2. Lingkaran Aksen Cahaya Halus (memudar ke latar)
  const glowGrad = ctx.createRadialGradient(400, 200, 10, 400, 200, 350);
  glowGrad.addColorStop(0, light.accentSoft);
  glowGrad.addColorStop(1, light.canvas);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 800, 800);

  // 3. Border Kartu
  ctx.strokeStyle = light.surface3;
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 740, 740);

  // 4. Logo / Header
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 24px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SMART-FIT v2 • AI WORKOUT', 400, 90);

  ctx.fillStyle = light.text3;
  ctx.font = `16px ${BODY_FONT}`;
  ctx.fillText('Client-Side BlazePose Vision Tracker', 400, 120);

  // 5. Nama Gerakan
  ctx.fillStyle = light.text;
  ctx.font = `900 48px ${DISPLAY_FONT}`;
  ctx.fillText(data.exerciseName.toUpperCase(), 400, 210);

  // Garis Pemisah
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 240);
  ctx.lineTo(450, 240);
  ctx.stroke();

  // 6. Angka Utama (Reps atau Hold)
  const isTimer = data.holdDurationSec !== null && data.holdDurationSec > 0;
  const mainValue = isTimer ? `${data.holdDurationSec}s` : `${data.reps ?? 0}`;
  const mainLabel = isTimer ? 'DURASI HOLD ISOMETRIK' : 'TOTAL REPETISI BERSIH';

  ctx.fillStyle = ACCENT;
  ctx.font = `900 110px ${DISPLAY_FONT}`;
  ctx.fillText(mainValue, 400, 380);

  ctx.fillStyle = light.text3;
  ctx.font = `bold 18px ${BODY_FONT}`;
  ctx.fillText(mainLabel, 400, 420);

  // 7. Box Metrik (Form Score, Kalori, Waktu)
  const boxY = 470;
  const boxHeight = 160;

  // Form Score Box
  ctx.fillStyle = light.surface;
  ctx.fillRect(80, boxY, 190, boxHeight);
  ctx.strokeStyle = light.surface3;
  ctx.lineWidth = 2;
  ctx.strokeRect(80, boxY, 190, boxHeight);

  ctx.fillStyle = light.dataForm;
  ctx.font = `900 42px ${DISPLAY_FONT}`;
  ctx.fillText(data.formScore !== undefined ? `${data.formScore}%` : '—', 175, boxY + 75);
  ctx.fillStyle = light.text3;
  ctx.font = `bold 14px ${BODY_FONT}`;
  ctx.fillText('FORM SCORE', 175, boxY + 115);

  // Kalori Box
  ctx.fillStyle = light.surface;
  ctx.fillRect(305, boxY, 190, boxHeight);
  ctx.strokeRect(305, boxY, 190, boxHeight);

  ctx.fillStyle = light.dataKcal;
  ctx.font = `900 42px ${DISPLAY_FONT}`;
  ctx.fillText(`${data.caloriesBurned}`, 400, boxY + 75);
  ctx.fillStyle = light.text3;
  ctx.font = `bold 14px ${BODY_FONT}`;
  ctx.fillText('KALORI (KCAL)', 400, boxY + 115);

  // Durasi Box
  const mins = Math.floor(data.sessionDurationSec / 60);
  const secs = data.sessionDurationSec % 60;
  const timeStr = `${mins}m ${secs}s`;

  ctx.fillStyle = light.surface;
  ctx.fillRect(530, boxY, 190, boxHeight);
  ctx.strokeRect(530, boxY, 190, boxHeight);

  ctx.fillStyle = light.dataXp;
  ctx.font = `900 42px ${DISPLAY_FONT}`;
  ctx.fillText(timeStr, 625, boxY + 75);
  ctx.fillStyle = light.text3;
  ctx.font = `bold 14px ${BODY_FONT}`;
  ctx.fillText('TOTAL DURASI', 625, boxY + 115);

  // 8. Footer Watermark
  ctx.fillStyle = light.text3;
  ctx.font = `14px ${BODY_FONT}`;
  ctx.fillText('🔒 100% Privacy-Guaranteed • Zero Video Uploaded to Server', 400, 710);

  return canvas.toDataURL('image/png');
}

/**
 * Format pesan share ke WhatsApp
 */
export function buildWhatsAppShareUrl(data: ShareCardData): string {
  const isTimer = data.holdDurationSec !== null && data.holdDurationSec > 0;
  const mainStat = isTimer
    ? `tahan ${data.holdDurationSec} detik`
    : `${data.reps} repetisi (${data.cleanReps ?? data.reps} form bersih)`;

  const text = `🔥 Saya baru saja menyelesaikan latihan *${data.exerciseName}* di SMART-FIT!\n\n` +
    `⚡ Hasil: *${mainStat}*\n` +
    (data.formScore !== undefined ? `🎯 Form Score AI: *${data.formScore}%*\n` : '') +
    `🔥 Kalori Terbakar: *${data.caloriesBurned} kcal*\n` +
    `⏱️ Durasi: *${Math.round(data.sessionDurationSec)} detik*\n\n` +
    `Coba latihan dengan AI vision langsung di browser kamu di SMART-FIT!`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
