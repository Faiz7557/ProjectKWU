'use client';

// Diadaptasi dari 8B Sill template (MIT), adegan "day"
import { useRef } from 'react';
import { gsap } from '@/lib/motion/gsap';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';

// Alur fase dari src/app/workout/[exercise]/page.tsx: guide, env-check, countdown (5 dtk), active, summary, lalu simpan progres.
const STEPS = [
  { title: 'Panduan kamera', panel: 1, text: 'Lihat posisi kamera dan contoh form ideal sebelum mulai.' },
  { title: 'Cek lingkungan', panel: 3, text: 'Kamera memeriksa apakah tubuhmu terlihat dan terdeteksi.' },
  { title: 'Hitung mundur', panel: 4, text: 'Hitung mundur 5 detik supaya kamu sempat bersiap.' },
  { title: 'Latihan', panel: 5, text: 'Rep dihitung otomatis. Peringatan form dan suara pelatih muncul saat kamu bergerak.' },
  { title: 'Ringkasan', panel: 7, text: 'Lihat rep, rep bersih, skor form, dan durasi sesimu.' },
  { title: 'Progres', panel: 8, text: 'Sesi masuk riwayat, dan XP, level, serta lencana ikut diperbarui.' },
];

export function SessionDay() {
  const ref = useRef<HTMLElement>(null);

  useScene(
    ref,
    () => {
      const root = ref.current!;
      const undo = bindEffects(root);
      const stage = root.querySelector<HTMLElement>('.la-day__stage')!;
      const rail = root.querySelector<HTMLElement>('.la-day__rail')!;
      const track = root.querySelector<HTMLElement>('.la-day__track')!;
      const sky = root.querySelector<HTMLElement>('.la-day__sky')!;
      const disc = root.querySelector<HTMLElement>('.la-day__disc')!;
      const num = root.querySelector<HTMLElement>('.la-day__num')!;
      const cs = getComputedStyle(document.documentElement);
      const colors = STEPS.map((s) => cs.getPropertyValue(`--panel-${s.panel}`).trim());
      root.setAttribute('data-track', '');
      gsap.set(sky, { backgroundColor: colors[0] });

      const travel = () => Math.max(0, track.scrollWidth - rail.clientWidth);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${Math.max(window.innerHeight, travel() * 1.15)}`,
          pin: stage,
          scrub: 0.6,
          invalidateOnRefresh: true,
          // Angka rep 0 sampai 12 mengikuti progres scroll.
          onUpdate: (self) => { num.textContent = String(Math.round(self.progress * 12)); },
        },
      });
      tl.fromTo(track, { x: 0 }, { x: () => -travel(), duration: 1 }, 0);
      colors.slice(1).forEach((c, i) => tl.to(sky, { backgroundColor: c, duration: 1 / (colors.length - 1) }, i / (colors.length - 1)));
      tl.fromTo(disc, { x: () => sky.clientWidth * 0.06 }, { x: () => sky.clientWidth - disc.offsetWidth - sky.clientWidth * 0.06, duration: 1 }, 0);
      tl.fromTo(disc, { y: () => sky.clientHeight + 4 }, { y: () => sky.clientHeight * 0.12, duration: 0.42, ease: 'sine.out' }, 0.02);
      tl.to(disc, { y: () => sky.clientHeight + 4, duration: 0.4, ease: 'sine.in' }, 0.58);
      return () => {
        undo();
        root.removeAttribute('data-track');
        num.textContent = '0';
      };
    },
    { wide: '(min-width: 768px)' },
  );

  return (
    <section id="cara-kerja" ref={ref} className="ld-section la-day" aria-labelledby="la-day-h2">
      <div className="la-day__stage">
        <div className="la-day__head bg-ink text-paper">
          <h2 id="la-day-h2" className="ld-h2" data-motion="rise">Satu sesi, enam langkah</h2>
        </div>
        <div className="la-day__sky" aria-hidden="true">
          <div className="la-day__disc bg-ink text-paper">
            <span className="la-day__num font-display">0</span>
          </div>
        </div>
        <div className="la-day__rail">
          <ol className="la-day__track">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`la-day__step ld-panel panel-${s.panel}`}>
                <span className="la-day__idx ld-big" aria-hidden="true">{i + 1}</span>
                <h3 className="ld-h3">{s.title}</h3>
                <p className="ld-body">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
