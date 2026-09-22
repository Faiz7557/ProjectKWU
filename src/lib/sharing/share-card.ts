export interface ShareCardData {
  exerciseName: string;
  reps: number | null;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  formScore: number;
  caloriesBurned: number;
  cleanReps?: number | null;
}

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

  // 1. Background Gradient Modern Slate-950 ke Indigo-950
  const bgGrad = ctx.createLinearGradient(0, 0, 800, 800);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0b1120');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 800);

  // 2. Lingkaran Aksen Cahaya Neon Halus
  const glowGrad = ctx.createRadialGradient(400, 200, 10, 400, 200, 350);
  glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
  glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 800, 800);

  // 3. Border Kartu
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 740, 740);

  // 4. Logo / Header
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SMART-FIT v2 • AI WORKOUT', 400, 90);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Client-Side BlazePose Vision Tracker', 400, 120);

  // 5. Nama Gerakan
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.exerciseName.toUpperCase(), 400, 210);

  // Garis Pemisah
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 240);
  ctx.lineTo(450, 240);
  ctx.stroke();

  // 6. Angka Utama (Reps atau Hold)
  const isTimer = data.holdDurationSec !== null && data.holdDurationSec > 0;
  const mainValue = isTimer ? `${data.holdDurationSec}s` : `${data.reps ?? 0}`;
  const mainLabel = isTimer ? 'DURASI HOLD ISOMETRIK' : 'TOTAL REPETISI BERSIH';

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 110px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(mainValue, 400, 380);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(mainLabel, 400, 420);

  // 7. Box Metrik (Form Score, Kalori, Waktu)
  const boxY = 470;
  const boxHeight = 160;

  // Form Score Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(80, boxY, 190, boxHeight);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, boxY, 190, boxHeight);

  ctx.fillStyle = '#10b981';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${data.formScore}%`, 175, boxY + 75);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FORM SCORE', 175, boxY + 115);

  // Kalori Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(305, boxY, 190, boxHeight);
  ctx.strokeRect(305, boxY, 190, boxHeight);

  ctx.fillStyle = '#fb923c';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${data.caloriesBurned}`, 400, boxY + 75);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('KALORI (KCAL)', 400, boxY + 115);

  // Durasi Box
  const mins = Math.floor(data.sessionDurationSec / 60);
  const secs = data.sessionDurationSec % 60;
  const timeStr = `${mins}m ${secs}s`;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(530, boxY, 190, boxHeight);
  ctx.strokeRect(530, boxY, 190, boxHeight);

  ctx.fillStyle = '#a855f7';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(timeStr, 625, boxY + 75);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL DURASI', 625, boxY + 115);

  // 8. Footer Watermark
  ctx.fillStyle = '#64748b';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
    `🎯 Form Score AI: *${data.formScore}%*\n` +
    `🔥 Kalori Terbakar: *${data.caloriesBurned} kcal*\n` +
    `⏱️ Durasi: *${Math.round(data.sessionDurationSec)} detik*\n\n` +
    `Coba latihan dengan AI vision langsung di browser Anda di SMART-FIT!`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
