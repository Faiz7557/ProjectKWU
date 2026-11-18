'use client';

// Diadaptasi dari 8B Sill template (MIT): section "faq"
import { useRef, type ReactNode } from 'react';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';

const ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Perangkat dan browser apa yang didukung?',
    a: 'Browser modern seperti Chrome, Edge, Brave, Safari, atau Firefox yang mendukung WebAssembly dan WebGL, di laptop, tablet, atau HP. Tidak perlu alat tambahan selain kamera.',
  },
  {
    q: 'Apakah videoku dikirim ke server?',
    a: 'Tidak. Gambar kamera diproses di memori dan GPU perangkatmu. Yang disimpan hanya angka latihan, seperti jumlah rep dan skor form.',
  },
  {
    q: 'Bagaimana rep dihitung?',
    a: 'Model pose MediaPipe BlazePose menemukan 33 titik tubuh di setiap gambar. Dari titik itu aplikasi menghitung sudut sendi, misalnya siku atau lutut, lalu menghitung satu rep saat kamu turun dan kembali naik dengan benar.',
  },
  {
    q: 'Seberapa akurat, dan bagaimana menaruh kamera?',
    a: 'Belum ada angka akurasi yang kami umumkan. Hasil terbaik didapat bila seluruh tubuh terlihat. Untuk push-up, squat, sit-up, dan plank, taruh kamera di samping tubuhmu sekitar 1,5 sampai 2 meter. Untuk jumping jack, taruh tegak lurus di depanmu. Pastikan ruangan cukup terang.',
  },
  {
    q: 'Bisa dipakai tanpa internet?',
    a: 'Bisa, setelah sesi pertama. Model pose dan aset disimpan oleh browser lewat service worker, terutama bila aplikasi dipasang ke layar utama. Sesi pertama tetap butuh internet untuk mengunduhnya.',
  },
  {
    q: 'Gerakan apa saja yang ada?',
    a: 'Lima gerakan: push-up, squat, sit-up, jumping jack, dan plank.',
  },
  {
    q: 'Bagaimana menjeda tanpa menyentuh layar?',
    a: 'Pakai gestur saat latihan. Angkat satu tangan dan tahan sebentar untuk menjeda atau melanjutkan. Silangkan lengan untuk mengakhiri sesi, dan acungkan jempol untuk konfirmasi.',
  },
  {
    q: 'Apa beda Akun Gratis dan Berbayar?',
    a: (
      <>
        Rincian paket ada di bagian{' '}
        <a className="ld-link" href="#harga">Harga</a>.
      </>
    ),
  },
];

export function Faq() {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, () => bindEffects(ref.current!));

  return (
    <section ref={ref} id="faq" className="ld-section fq" aria-labelledby="faq-title">
      <div className="ld-grid fq-grid">
        <div className="ld-panel panel-2 fq-head">
          <h2 id="faq-title" className="ld-h2" data-motion="rise">Pertanyaan yang sering muncul</h2>
          <p className="ld-lead">Tidak menemukan jawabanmu? Coba saja satu sesi, gratis.</p>
        </div>
        <div className="fq-list">
          {ITEMS.map((it) => (
            <details key={it.q} className="fq-item panel-4">
              <summary className="ld-h3">{it.q}</summary>
              <p className="ld-body fq-a">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
