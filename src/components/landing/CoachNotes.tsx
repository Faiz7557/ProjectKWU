'use client';

// Diadaptasi dari 8B Sill template (MIT): section:letters
import { useRef } from 'react';
import { bindEffects } from '@/lib/motion/effects';
import { useScene } from '@/lib/motion/useScene';
import './landing.css';
import './landing-b.css';

const NOTES = [
  {
    // src/trackers/squat-tracker.ts:123
    move: 'Squat',
    tone: 'panel-4',
    quote: 'Jaga tumit tetap menapak lantai selama squat.',
    pose: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d="M6 84h108" />
        <circle className="cn-solid" cx="40" cy="18" r="7" />
        <path d="M42 26l18 26M60 52l24 4M84 56l-6 22M42 28l28 6" />
        <path className="cn-hot" d="M78 78l14 4" />
      </svg>
    ),
  },
  {
    // src/trackers/pushup-tracker.ts:103
    move: 'Push-up',
    tone: 'panel-5',
    quote: 'Jaga otot perut kencang agar pinggul sejajar dengan bahu dan kaki.',
    pose: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d="M6 84h108" />
        <circle className="cn-solid" cx="14" cy="46" r="6" />
        <path d="M20 52l40 10M24 52v28" />
        <path className="cn-hot" d="M44 56l16 8 22-4" />
        <path d="M82 60l22-4" />
      </svg>
    ),
  },
  {
    // src/trackers/plank-tracker.ts:128
    move: 'Plank',
    tone: 'panel-8',
    quote: 'Kencangkan otot inti (core) agar pinggul tidak merosot ke bawah.',
    pose: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d="M6 84h108" />
        <circle className="cn-solid" cx="14" cy="50" r="6" />
        <path d="M22 56l38 8M24 58v22l18 0" />
        <path className="cn-hot" d="M44 60l16 6 24-4" />
        <path d="M84 62l22-4" />
      </svg>
    ),
  },
];

export function CoachNotes() {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, () => bindEffects(ref.current!));

  return (
    <section id="catatan" ref={ref} className="ld-section" aria-labelledby="catatan-title">
      <div className="cn-grid">
        <div className="cn-intro">
          <h2 id="catatan-title" className="ld-h2" data-motion="rise">Bisikan pelatih</h2>
          <p className="ld-lead">Tiga contoh koreksi yang benar-benar diucapkan pelatih saat form kamu mulai melenceng.</p>
          <svg className="ld-curl" data-motion="curl" viewBox="0 0 110 90" aria-hidden="true">
            <path pathLength={1} d="M8 80C30 10 60 10 56 44S20 70 50 78s50-20 52-66" />
          </svg>
        </div>
        <ul className="cn-list">
          {NOTES.map((n) => (
            <li key={n.move} className={`cn-letter ${n.tone}`}>
              <div className="cn-frame ld-frame bg-ink text-paper" data-motion="peek">
                <div className="cn-pose">{n.pose}</div>
              </div>
              <div className="cn-body">
                <p className="ld-label">{n.move}</p>
                <blockquote>
                  <p className="ld-hand">&ldquo;{n.quote}&rdquo;</p>
                </blockquote>
                <p className="ld-hand cn-sign">Pelatih SMART-FIT</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
