'use client';

// Diadaptasi dari 8B Sill template (MIT)
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { Dumbbell, ShieldCheck } from 'lucide-react';
import { getAllExerciseConfigs } from '@/trackers';
import { EXERCISE_ICONS, EXERCISE_PANEL } from '@/components/ui/ExerciseIcon';
import { Icon3D } from '@/components/three/Icon3D';
import type { IconMotion } from '@/lib/three/icon-motion';
import { gsap } from '@/lib/motion/gsap';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';
import { cn } from '@/lib/cn';

// Nama gerakan dari config tracker (sumber tunggal), diambil sekali.
const EXERCISES = getAllExerciseConfigs().map((c) => ({ id: c.id, name: c.name }));

// Hover/fokus: ikon 3D memeragakan satu rep gerakannya (find-animation #2).
const REP_MOTION: Record<string, IconMotion> = {
  pushup: 'lift',
  squat: 'dip',
  situp: 'crunch',
  jumping_jack: 'hop',
  plank: 'spin',
};

const CURL = 'M100 296 C58 236 38 158 90 110 C140 64 200 92 190 140 C181 184 121 186 115 146 C110 116 150 104 158 130';

export function Opening({ hero }: { hero?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useScene(
    ref,
    ({ conditions }) => {
      const root = ref.current!;
      const undo = bindEffects(root);
      const wide = conditions.wide;
      const first = root.querySelector<HTMLElement>('.la-s1')!;
      const second = root.querySelector<HTMLElement>('.la-s2')!;
      const ink = root.querySelector<HTMLElement>('.la-ink')!;
      const inkCurl = ink.querySelector('.la-ink__curl path');
      const cells = ['.la-a', '.la-e', '.la-c', '.la-d', '.la-b'].map((s) => root.querySelector<HTMLElement>(s)!);
      const wins = gsap.utils.toArray<HTMLElement>('.la-win', root);
      const house = root.querySelector<HTMLElement>('.la-house')!;
      root.setAttribute('data-ink', '');

      const shear = wide
        ? [[-0.03, -0.16], [0.05, -0.3], [-0.06, 0.02], [0.01, -0.1], [0.06, -0.2]]
        : [[-0.04, -0.12], [0.06, -0.22], [-0.05, 0.02], [0.02, -0.08], [-0.06, -0.18]];
      const jitter = [0.03, 0, 0.05, 0.02, 0.06];
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: second, start: 'top bottom', end: 'top top', scrub: 0.5, invalidateOnRefresh: true },
      });
      tl.fromTo(ink, { y: 0 }, { y: () => -1.02 * first.offsetHeight, duration: 1 }, 0);
      if (inkCurl) tl.fromTo(inkCurl, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.42 }, 0.06);
      cells.forEach((cell, i) =>
        tl.fromTo(cell, { x: 0, y: 0 }, {
          x: () => shear[i][0] * window.innerWidth,
          y: () => shear[i][1] * window.innerHeight,
          duration: 0.85,
          ease: 'power1.in',
        }, 0),
      );
      // 5 panel fasad terbuka lewat clip-path (dari 12 jendela di template).
      wins.forEach((win, i) => {
        const at = Math.min(0.84, (house.offsetTop + win.offsetTop) / first.offsetHeight + 0.05 + jitter[i % jitter.length]);
        tl.fromTo(win, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.14, ease: 'power1.out' }, at);
        // Panel terbuka penuh: ikon 3D-nya mulai "tergambar" (Icon3D mendengar sf-icon-draw / data-drawn).
        tl.call(() => {
          win.setAttribute('data-drawn', '');
          window.dispatchEvent(new CustomEvent('sf-icon-draw', { detail: win }));
        }, undefined, at + 0.14);
      });
      return () => {
        undo();
        root.removeAttribute('data-ink');
      };
    },
    // Adegan ink + shear hanya di layar lebar; di < 768px layar 1 tingginya otomatis dan adegan merusak tata letak.
    { wide: '(min-width: 768px)' },
  );

  return (
    <section id="top" ref={ref} className="ld-section la-opening" aria-labelledby="la-opening-h1">
      <div className="la-s1">
        <div className="la-grid">
          <div className="la-a">
            <div className="ld-panel panel-1">
              <h1 id="la-opening-h1" className="ld-hero">Hitung rep. Perbaiki form.</h1>
            </div>
          </div>
          <div className="la-b">
            <div className="ld-panel panel-7 la-hero" data-hero-slot>
              {hero ?? (
                <svg viewBox="0 0 120 160" className="la-hero__fallback" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
                  <circle cx="60" cy="22" r="12" />
                  <path d="M60 36 V90 M60 52 L26 74 M60 52 L94 74 M60 90 L38 144 M60 90 L82 144" />
                </svg>
              )}
            </div>
          </div>
          <div className="la-e">
            <div className="ld-panel panel-2 la-privacy">
              <ShieldCheck className="size-6" aria-hidden="true" />
              <div>
                <p className="ld-label">Privasi</p>
                <p className="ld-body">Video tidak pernah keluar dari perangkatmu.</p>
              </div>
            </div>
          </div>
          <div className="la-c">
            <div className="ld-panel panel-3">
              <p className="ld-body">
                Kamera HP atau laptop sudah cukup. Rep dihitung otomatis, koreksi form muncul langsung, dan pelatih bersuara dalam bahasa Indonesia.
              </p>
            </div>
          </div>
          <div className="la-d">
            <div className="ld-panel panel-4 la-cta">
              <svg className="ld-curl la-curl" viewBox="0 0 200 300" aria-hidden="true"><path pathLength="1" d={CURL} /></svg>
              <p className="ld-label">Gratis untuk mulai · tanpa instal</p>
              <div className="la-actions">
                <Link href="/workout" className="ld-btn"><span>Mulai latihan</span></Link>
                <a href="#gerakan" className="ld-link">Lihat gerakan</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="la-ink" aria-hidden="true">
        <svg className="la-ink__hill" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="M0 1000 V200 C70 200 150 26 370 12 C560 2 640 150 810 168 C900 177 960 180 1000 180 V1000 Z" /></svg>
        <svg className="ld-curl la-ink__curl" viewBox="0 0 200 300"><path pathLength="1" d={CURL} /></svg>
      </div>

      <div className="la-s2">
        <p className="ld-big la-s2__text" data-motion="rise">Lima gerakan, satu kamera.</p>
        <ul className="la-house">
          {EXERCISES.map((ex) => (
            <li key={ex.id} className={cn('la-win', `panel-${EXERCISE_PANEL[ex.id] ?? 4}`, `la-win--${ex.id}`)}>
              <Link href={`/workout/${ex.id}`} className="la-win__link">
                <Icon3D
                  icon={EXERCISE_ICONS[ex.id] ?? Dumbbell}
                  className="la-win__icon"
                  drawIn
                  hoverMotion={REP_MOTION[ex.id]}
                />
                <span className="ld-h3">{ex.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
