import { jsPDF } from 'jspdf';

export interface WorkoutReportData {
  sessionId?: string;
  exerciseName: string;
  totalReps: number;
  cleanReps?: number;
  holdDurationSec?: number | null;
  sessionDurationSec: number;
  caloriesBurned: number;
  formScore: number;
  symmetryScore?: number;
  faultsSummary?: { name: string; count: number; description: string }[];
  tempoRatio?: string;
  avgTutSec?: number;
  coachAdvice?: string;
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

  // 1. Header Banner (Dark Theme)
  doc.setFillColor(15, 23, 42); // slate-950
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SMART-FIT v2', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Smart Motion Analysis & Biomechanical AI Workout Audit', 15, 22);

  // Report Tag / Date (Right Aligned)
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`ID: ${reportId}`, pageWidth - 15, 16, { align: 'right' });
  doc.text(dateStr, pageWidth - 15, 22, { align: 'right' });
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('● 100% Client-Side Private AI Inference', pageWidth - 15, 28, { align: 'right' });

  // 2. Title Section
  let y = 56;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Laporan Evaluasi Latihan: ${data.exerciseName}`, 15, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
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
      color: [37, 99, 235], // blue
    },
    {
      label: 'Repetisi Bersih',
      val: `${data.cleanReps ?? data.totalReps} Reps`,
      color: [16, 185, 129], // emerald
    },
    {
      label: 'Durasi Total',
      val: `${Math.floor(data.sessionDurationSec / 60)}m ${data.sessionDurationSec % 60}s`,
      color: [99, 102, 241], // indigo
    },
    {
      label: 'Estimasi Kalori',
      val: `${data.caloriesBurned} kcal`,
      color: [249, 115, 22], // orange
    },
  ];

  metrics.forEach((m, idx) => {
    const x = 15 + idx * (colWidth + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, colWidth, cardHeight, 2, 2, 'FD');

    // Accent top bar
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.rect(x, y, colWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, x + colWidth / 2, y + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + colWidth / 2, y + 19, { align: 'center' });
  });

  // 4. Panel Skor Biomekanika (Form Score, Simetri, & Tempo)
  y += cardHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Analisis Biomekanika & Keseimbangan Otot', 15, y);

  y += 5;
  const scoreCardWidth = (pageWidth - 30 - 6) / 3;
  const scoreCardHeight = 28;

  const symmetry = data.symmetryScore ?? 95;
  const formScore = data.formScore;
  const tempo = data.tempoRatio || '3-1-1 (Ideal)';

  const scoreSections = [
    {
      title: 'Skor Form & Postur',
      score: `${formScore}/100`,
      desc: formScore >= 85 ? 'Sangat Baik (Konsisten)' : formScore >= 70 ? 'Cukup (Perlu Koreksi)' : 'Perlu Bimbingan',
      color: formScore >= 85 ? [16, 185, 129] : [234, 179, 8],
    },
    {
      title: 'Keseimbangan Bilateral',
      score: `${symmetry}%`,
      desc: symmetry >= 90 ? 'Simetri Sangat Tinggi' : symmetry >= 80 ? 'Sedikit Deviasi' : 'Asimetri Perlu Evaluasi',
      color: symmetry >= 88 ? [16, 185, 129] : [239, 68, 68],
    },
    {
      title: 'Kontrol Ritme / Tempo',
      score: tempo,
      desc: data.avgTutSec ? `Rata-rata TUT: ${data.avgTutSec}s/rep` : 'Fase Eksentrik Stabil',
      color: [59, 130, 246],
    },
  ];

  scoreSections.forEach((s, idx) => {
    const x = 15 + idx * (scoreCardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, scoreCardWidth, scoreCardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(s.title, x + 5, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(s.score, x + 5, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(s.desc, x + 5, y + 23);
  });

  // 5. Tabel Audit Kesalahan Postur Tubuh
  y += scoreCardHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Daftar Observasi & Kesalahan Form Terdeteksi', 15, y);

  y += 5;
  const faults = data.faultsSummary && data.faultsSummary.length > 0
    ? data.faultsSummary
    : [{ name: 'Postur Sempurna', count: 0, description: 'Tidak ada kesalahan postur signifikan terdeteksi sepanjang sesi latihan.' }];

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('JENIS KESALAHAN FORM', 18, y + 4.8);
  doc.text('FREKUENSI', 85, y + 4.8);
  doc.text('DESKRIPSI & REKOMENDASI KOREKSI FISIOLOGIS', 115, y + 4.8);

  y += 7;
  faults.forEach((f, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(f.name, 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(f.count > 0 ? 220 : 16, f.count > 0 ? 38 : 185, f.count > 0 ? 38 : 129);
    doc.text(f.count > 0 ? `${f.count} kali` : 'Bersih', 85, y + 6);

    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(f.description, pageWidth - 30 - 105);
    doc.text(splitDesc[0] || '', 115, y + 6);

    y += 9;
  });

  // 6. Rencana Tindak Lanjut & Catatan AI Coach
  y += 6;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.roundedRect(15, y, pageWidth - 30, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text('🎯 Rekomendasi Pelatih Pintar (AI Coach Action Plan):', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const defaultAdvice = formScore >= 85
    ? 'Postur tubuh Anda sangat stabil dan terkendali. Pada sesi berikutnya, coba tingkatkan target repetisi sebanyak 10-15% atau tambahkan waktu jeda di titik bawah (isometric bottom pause) untuk merangsang hipertrofi optimal.'
    : 'Fokuskan latihan berikutnya pada pengendalian kecepatan turun (fase eksentrik). Pertahankan garis lurus tulang punggung dan pastikan beban terdistribusi seimbang pada kedua sisi tubuh sebelum menambah jumlah repetisi.';

  const coachText = data.coachAdvice || defaultAdvice;
  const splitCoach = doc.splitTextToSize(coachText, pageWidth - 45);
  doc.text(splitCoach, 20, y + 13);

  // 7. Footer
  const footerY = 285;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Laporan ini digenerate secara otomatis di sisi klien peramban (Client-Side WASM). Nol byte video disimpan atau dikirim ke cloud.',
    15,
    footerY
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('SMART-FIT v2 Biomechanics Intelligence', pageWidth - 15, footerY, { align: 'right' });

  // Simpan dan unduh file
  const filename = `smartfit-audit-${data.exerciseName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
