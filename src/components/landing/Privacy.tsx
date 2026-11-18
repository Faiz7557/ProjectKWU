'use client';

// Diadaptasi dari 8B Sill template (MIT): scene:courtyard
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { bindEffects } from '@/lib/motion/effects';
import { gsap } from '@/lib/motion/gsap';
import { useScene } from '@/lib/motion/useScene';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import './landing.css';
import './landing-b.css';

// [kolom, baris] tiap panel; offset awal sesuai template
const PANES: Array<[number, number]> = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
const OFFSETS = [[-5, -20], [4, 16], [-3, -11], [6, 22], [-6, 12], [3, -18]];

// Sumber: README.md:14 dan :40 (RAM/GPU, nol byte video), PrivacyBadge.tsx POINTS
const POINTS = [
  'Dihitung langsung di browser, bukan di server',
  'Tidak ada satu frame video atau foto pun yang dikirim',
  'Yang disimpan hanya angka: rep, durasi, skor form',
];

function CameraFrame() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect className="pv-bg" width="300" height="200" />
      <path className="pv-corner" d="M18 46V18h28M254 18h28v28M282 154v28h-28M46 182H18v-28" />
      <g className="pv-bone">
        <path d="M150 52v52M150 64l-30 22M150 64l30 22M150 104l-20 40M150 104l22 40" />
        <path className="pv-bone--bad" d="M120 86l-16 24" />
      </g>
      <circle className="pv-joint" cx="150" cy="38" r="12" />
      {[[150, 64], [120, 86], [180, 86], [150, 104], [130, 144], [172, 144]].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="pv-joint" cx={x} cy={y} r="4" />
      ))}
    </svg>
  );
}

export function Privacy() {
  const ref = useRef<HTMLElement>(null);
  const win = useRef<HTMLDivElement>(null);

  useScene(ref, () => {
    const undo = bindEffects(ref.current!);
    const panes = gsap.utils.toArray<HTMLElement>('.pv-pane', win.current!);
    const tints = gsap.utils.toArray<HTMLElement>('.pv-tint', win.current!);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: win.current, start: 'top 92%', end: 'center 52%', scrub: 0.6 },
    });
    panes.forEach((p, i) =>
      tl.fromTo(p, { xPercent: OFFSETS[i][0], yPercent: OFFSETS[i][1] }, { xPercent: 0, yPercent: 0, duration: 1, ease: 'power2.out' }, 0),
    );
    tints.forEach((t, i) => tl.fromTo(t, { opacity: 0.94 }, { opacity: 0, duration: 0.55 }, 0.3 + i * 0.03));
    return undo;
  });

  return (
    <section id="privasi" ref={ref} className="ld-section" aria-labelledby="privasi-title">
      <div className="pv-grid">
        <div
          ref={win}
          className="pv-window"
          role="img"
          aria-label="Ilustrasi bingkai kamera dengan kerangka tubuh, diproses di dalam perangkat"
        >
          {PANES.map(([c, r], i) => (
            <div key={i} className="pv-pane" style={{ '--c': c, '--r': r } as React.CSSProperties}>
              <CameraFrame />
              <div className="pv-tint" />
            </div>
          ))}
        </div>
        <div className="pv-text bg-ink text-paper">
          <h2 id="privasi-title" className="ld-h2" data-motion="rise">Video tetap di perangkatmu</h2>
          <p className="ld-body">
            Bingkai kamera diproses di memori RAM dan GPU perangkatmu. Nol byte video dikirim ke server.
          </p>
          <ul className="ld-body">
            {POINTS.map((p) => (
              <li key={p}>
                <Check size={20} aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="pv-more">
            <PrivacyBadge />
          </div>
        </div>
      </div>
    </section>
  );
}
