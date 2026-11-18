'use client';

// Diadaptasi dari 8B Sill template (MIT): section "quiet" + adegan quiet
import { useRef } from 'react';
import { useScene } from '@/lib/motion/useScene';
import { gsap } from '@/lib/motion/gsap';
import { bindEffects } from '@/lib/motion/effects';

const PROMISES = [
  { word: 'Nol video', text: 'Kamera diproses di perangkatmu. Tidak ada video yang dikirim ke server.', tone: 'panel-2' },
  { word: 'Tanpa instal', text: 'Langsung jalan di browser. Mau lebih praktis, pasang sebagai aplikasi (PWA) di layar utama.', tone: 'panel-3' },
  { word: 'Bisa offline', text: 'Model pose dan aset disimpan browser setelah sesi pertama. Sesi pertama tetap butuh internet.', tone: 'panel-6' },
  { word: 'Suara Indonesia', text: 'Pelatih suara berbahasa Indonesia mengoreksi formmu saat kamu bergerak.', tone: 'panel-7' },
] as const;

// Posisi awal tiap kartu: [rotasi, y, x]
const TILT = [[-7, -50, 34], [6, 40, -26], [-5, -26, 30], [8, 56, -36]];

export function Promises() {
  const ref = useRef<HTMLElement>(null);

  useScene(ref, () => {
    const root = ref.current!;
    const undo = bindEffects(root);
    const list = root.querySelector<HTMLElement>('.pm-list')!;
    const cards = gsap.utils.toArray<HTMLElement>('.pm-card', list);
    const words = cards.map((c) => c.querySelector<HTMLElement>('.pm-word')!);
    const css = getComputedStyle(root);
    const loud = css.getPropertyValue('--panel-1').trim();
    const loudText = css.getPropertyValue('--on-panel-1').trim();
    const rest = cards.map((c) => {
      const s = getComputedStyle(c);
      return { bg: s.backgroundColor, fg: s.color };
    });
    const weight = getComputedStyle(words[0]).fontWeight;
    const scale = window.innerWidth < 768 ? 0.45 : 1;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: list, start: 'top 95%', end: 'center 56%', scrub: 0.6 },
    });
    cards.forEach((card, i) => {
      const [r, y, x] = TILT[i];
      tl.fromTo(card, { rotation: r * scale, y: y * scale, x: x * scale }, { rotation: 0, y: 0, x: 0, duration: 1, ease: 'power2.out' }, 0);
      tl.fromTo(card, { backgroundColor: loud, color: loudText }, { backgroundColor: rest[i].bg, color: rest[i].fg, duration: 0.6 }, 0.35);
      tl.fromTo(words[i], { fontWeight: 900 }, { fontWeight: weight, duration: 0.7 }, 0.25);
    });
    return undo;
  });

  return (
    <section ref={ref} id="janji" className="ld-section pm" aria-labelledby="janji-title">
      <div className="pm-head">
        <h2 id="janji-title" className="ld-h2" data-motion="rise">Empat janji</h2>
        <p className="ld-lead">Hal yang tidak berubah, apa pun paket yang kamu pilih nanti.</p>
      </div>
      <ul className="pm-list">
        {PROMISES.map((p) => (
          <li key={p.word} className={`pm-card ${p.tone}`}>
            <h3 className="ld-big pm-word">{p.word}</h3>
            <p className="ld-body">{p.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
