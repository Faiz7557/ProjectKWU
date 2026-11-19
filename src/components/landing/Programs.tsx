'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { bindEffects } from '@/lib/motion/effects';
import { gsap, ScrollTrigger } from '@/lib/motion/gsap';
import { useScene } from '@/lib/motion/useScene';
import { WORKOUT_ROUTINES } from '@/lib/routines/presets';
import './landing.css';
import './landing-b.css';

const TONES = ['panel-4', 'panel-5', 'panel-7'];

export function Programs() {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, () => {
    const undo = bindEffects(ref.current!);
    const cards = gsap.utils.toArray<HTMLElement>('.pr-item', ref.current!);
    gsap.from(cards, {
      opacity: 0,
      y: 12,
      duration: 0.3,
      ease: 'power3.out',
      stagger: 0.05,
      scrollTrigger: { trigger: cards[0], start: 'top 88%', once: true },
    });
    return () => {
      undo();
      ScrollTrigger.refresh();
    };
  });

  return (
    <section id="program" ref={ref} className="ld-section" aria-labelledby="program-title">
      <div className="lb-head">
        <h2 id="program-title" className="ld-h2" data-motion="rise">Program sirkuit siap pakai</h2>
        <p className="ld-lead">Rangkaian gerakan dengan target dan waktu istirahat sudah diatur. Tinggal buka dan mulai.</p>
      </div>
      <ul className="pr-grid">
        {WORKOUT_ROUTINES.map((r, i) => (
          <li key={r.id} className="pr-item">
            <article className={`pr-card ${TONES[i % TONES.length]}`}>
              <h3 className="ld-h3">{r.name}</h3>
              <p className="pr-meta ld-label">
                <span>{r.level}</span>
                <span>±{r.estimatedMinutes} menit</span>
              </p>
              <p className="ld-body">{r.description}</p>
              <ol className="pr-steps">
                {r.steps.map((s, j) => (
                  <li key={j}>
                    <b>{s.exerciseName}</b>
                    <span>
                      {s.targetReps ? `${s.targetReps} rep` : `${s.targetDurationSec} detik`}
                      {s.restSecAfter > 0 ? ` · istirahat ${s.restSecAfter} dtk` : ''}
                    </span>
                  </li>
                ))}
              </ol>
              <Link href={`/workout/routine/${r.id}`} className="ld-btn pr-cta">
                Mulai program <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </article>
          </li>
        ))}
        <li className="pr-item">
          <article className="pr-card panel-8">
            <h3 className="ld-h3">Buat program sendiri</h3>
            <p className="ld-body">Pilih kombinasi dari 5 gerakan, atur target, dan simpan di perangkatmu.</p>
            <Link href="/workout" className="ld-btn pr-cta">
              Buka latihan <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </article>
        </li>
      </ul>
    </section>
  );
}
