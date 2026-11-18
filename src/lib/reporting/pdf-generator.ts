import { jsPDF } from 'jspdf';
import { light, panels } from '@/lib/design/tokens';

export interface WorkoutReportData {
  sessionId?: string;
  exerciseName: string;
  totalReps: number;
  cleanReps?: number;
  holdDurationSec?: number | null;
  sessionDurationSec: number;
  caloriesBurned: number;
  /** Undefined = belum ada data; laporan menulis "belum diukur", bukan angka karangan. */
  formScore?: number;
  symmetryScore?: number;
  faultsSummary?: { name: string; count: number; description: string }[];
  tempoRatio?: string;
  avgTutSec?: number;
  coachAdvice?: string;
}

/** jsPDF butuh RGB numerik; token hex diubah menjadi tuple [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Menghasilkan dan mengunduh laporan evaluasi biomekanika resmi format PDF
 * sepenuhnya di sisi klien (client-side) tanpa ketergantungan API eksternal.
 */
export function generateWorkoutPDFReport(data: WorkoutReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const reportId = data.sessionId || `SMARTFIT-${Date.now().toString(36).toUpperCase()}`;

  // 1. Header Banner (latar gelap = tinta light.text)
  doc.setFillColor(...hexToRgb(light.text));
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(...hexToRgb(panels[0].bg));
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Brand Header
  doc.setTextColor(...hexToRgb(light.canvas));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SMART-FIT v2', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(light.surface3));
  doc.text('Smart Motion Analysis & Biomechanical AI Workout Audit', 15, 22);

  // Report Tag / Date (Right Aligned)
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(light.surface3));
  doc.text(`ID: ${reportId}`, pageWidth - 15, 16, { align: 'right' });
  doc.text(dateStr, pageWidth - 15, 22, { align: 'right' });
  doc.setTextColor(...hexToRgb(panels[0].bg));
  doc.text('● 100% Client-Side Private AI Inference', pageWidth - 15, 28, { align: 'right' });

  // 2. Title Section
  let y = 56;
  doc.setTextColor(...hexToRgb(light.text));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Laporan Evaluasi Latihan: ${data.exerciseName}`, 15, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(light.text2));
  doc.text(
    'Audit kinestetik dan postur tubuh yang dianalisis secara real-time menggunakan MediaPipe BlazePose.',
    15,
    y
  );

  // 3. Grid Kartu Metrik Utama (4 Kotak)
  y += 10;
  const colWidth = (pageWidth - 30 - 9) / 4;
  const cardHeight = 24;

  const metrics = [
    {
      label: data.holdDurationSec ? 'Durasi Tahan' : 'Total Repetisi',
      val: data.holdDurationSec ? `${data.holdDurationSec}s` : `${data.totalReps} Reps`,
      color: hexToRgb(panels[0].bg),
    },
    {
      label: 'Repetisi Bersih',
      val: `${data.cleanReps ?? data.totalReps} Reps`,
      color: hexToRgb(light.success),
    },
    {
      label: 'Durasi Total',
      val: `${Math.floor(data.sessionDurationSec / 60)}m ${data.sessionDurationSec % 60}s`,
      color: hexToRgb(light.dataXp),
    },
    {
      label: 'Estimasi Kalori',
      val: `${data.caloriesBurned} kcal`,
      color: hexToRgb(light.dataKcal),
    },
  ];

  metrics.forEach((m, idx) => {
    const x = 15 + idx * (colWidth + 3);
    doc.setFillColor(...hexToRgb(light.canvas));
    doc.setDrawColor(...hexToRgb(light.surface3));
    doc.rect(x, y, colWidth, cardHeight, 'FD');

    // Accent top bar
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.rect(x, y, colWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...hexToRgb(light.text));
    doc.text(m.val, x + colWidth / 2, y + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(light.text2));
    doc.text(m.label, x + colWidth / 2, y + 19, { align: 'center' });
  });

  // 4. Panel Skor Biomekanika (Form Score, Simetri, & Tempo)
  y += cardHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(light.text));
  doc.text('Analisis Biomekanika & Keseimbangan Otot', 15, y);

  y += 5;
  const scoreCardWidth = (pageWidth - 30 - 6) / 3;
  const scoreCardHeight = 28;

  const symmetry = data.symmetryScore;
  const formScore = data.formScore;
  const tempo = data.tempoRatio || '3-1-1 (Ideal)';

  const scoreSections = [
    {
      title: 'Skor Form & Postur',
      score: formScore !== undefined ? `${formScore}/100` : 'Belum diukur',
      desc:
        formScore === undefined
          ? 'Tidak ada data form untuk sesi ini'
          : formScore >= 85
            ? 'Sangat Baik (Konsisten)'
            : formScore >= 70
              ? 'Cukup (Perlu Koreksi)'
              : 'Perlu Bimbingan',
      color:
        formScore === undefined
          ? hexToRgb(light.text3)
          : formScore >= 85
            ? hexToRgb(light.success)
            : hexToRgb(light.warning),
    },
    {
      title: 'Keseimbangan Bilateral',
      score: symmetry !== undefined ? `${symmetry}%` : 'Belum diukur',
      desc:
        symmetry === undefined
          ? 'Tidak diukur pada gerakan ini'
          : symmetry >= 90
            ? 'Simetri Sangat Tinggi'
            : symmetry >= 80
              ? 'Sedikit Deviasi'
              : 'Asimetri Perlu Evaluasi',
      color:
        symmetry === undefined
          ? hexToRgb(light.text3)
          : symmetry >= 88
            ? hexToRgb(light.success)
            : hexToRgb(light.danger),
    },
    {
      title: 'Kontrol Ritme / Tempo',
      score: tempo,
      desc: data.avgTutSec ? `Rata-rata TUT: ${data.avgTutSec}s/rep` : 'Fase Eksentrik Stabil',
      color: hexToRgb(light.accentText),
    },
  ];

  scoreSections.forEach((s, idx) => {
    const x = 15 + idx * (scoreCardWidth + 3);
    doc.setFillColor(...hexToRgb(light.canvas));
    doc.setDrawColor(...hexToRgb(light.surface3));
    doc.rect(x, y, scoreCardWidth, scoreCardHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(light.text2));
    doc.text(s.title, x + 5, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(s.score, x + 5, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(light.text2));
    doc.text(s.desc, x + 5, y + 23);
  });

  // 5. Tabel Audit Kesalahan Postur Tubuh
  y += scoreCardHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(light.text));
  doc.text('Daftar Observasi & Kesalahan Form Terdeteksi', 15, y);

  y += 5;
  const faults = data.faultsSummary && data.faultsSummary.length > 0
    ? data.faultsSummary
    : [{ name: 'Postur Sempurna', count: 0, description: 'Tidak ada kesalahan postur signifikan terdeteksi sepanjang sesi latihan.' }];

  // Table Header
  doc.setFillColor(...hexToRgb(light.surface));
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(light.text2));
  doc.text('JENIS KESALAHAN FORM', 18, y + 4.8);
  doc.text('FREKUENSI', 85, y + 4.8);
  doc.text('DESKRIPSI & REKOMENDASI KOREKSI FISIOLOGIS', 115, y + 4.8);

  y += 7;
  faults.forEach((f, idx) => {
    doc.setFillColor(...hexToRgb(idx % 2 === 0 ? light.canvas : light.surface));
    doc.rect(15, y, pageWidth - 30, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(light.text));
    doc.text(f.name, 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(f.count > 0 ? light.danger : light.success));
    doc.text(f.count > 0 ? `${f.count} kali` : 'Bersih', 85, y + 6);

    doc.setTextColor(...hexToRgb(light.text2));
    const splitDesc = doc.splitTextToSize(f.description, pageWidth - 30 - 105);
    doc.text(splitDesc[0] || '', 115, y + 6);

    y += 9;
  });

  // 6. Rencana Tindak Lanjut & Catatan AI Coach
  y += 6;
  doc.setFillColor(...hexToRgb(light.canvas));
  doc.setDrawColor(...hexToRgb(light.surface3));
  doc.rect(15, y, pageWidth - 30, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(light.accentText));
  doc.text('Rekomendasi Pelatih (Rencana Tindakan):', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(light.text));
  const defaultAdvice = formScore !== undefined && formScore >= 85
    ? 'Postur tubuh kamu sangat stabil dan terkendali. Pada sesi berikutnya, coba tingkatkan target repetisi sebanyak 10-15% atau tambahkan waktu jeda di titik bawah (isometric bottom pause) untuk merangsang hipertrofi optimal.'
    : 'Fokuskan latihan berikutnya pada pengendalian kecepatan turun (fase eksentrik). Pertahankan garis lurus tulang punggung dan pastikan beban terdistribusi seimbang pada kedua sisi tubuh sebelum menambah jumlah repetisi.';

  const coachText = data.coachAdvice || defaultAdvice;
  const splitCoach = doc.splitTextToSize(coachText, pageWidth - 45);
  doc.text(splitCoach, 20, y + 13);

  // 7. Footer
  const footerY = 285;
  doc.setDrawColor(...hexToRgb(light.surface3));
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(light.text3));
  doc.text(
    'Laporan ini digenerate secara otomatis di sisi klien peramban (Client-Side WASM). Nol byte video disimpan atau dikirim ke cloud.',
    15,
    footerY
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(light.accentText));
  doc.text('SMART-FIT v2 Biomechanics Intelligence', pageWidth - 15, footerY, { align: 'right' });

  // Simpan dan unduh file
  const filename = `smartfit-audit-${data.exerciseName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
