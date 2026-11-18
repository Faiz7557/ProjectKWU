'use client';

import { useRef, useState } from 'react';
import { bindEffects } from '@/lib/motion/effects';
import { useScene } from '@/lib/motion/useScene';
import { ALL_ACHIEVEMENTS, LEVEL_TIERS } from '@/lib/gamification/achievements';
import './landing.css';
import './landing-b.css';

const TONES = ['panel-4', 'panel-5', 'panel-7', 'panel-8', 'panel-1', 'panel-3', 'panel-6', 'panel-2'];
const BADGE_TONES = ['panel-4', 'panel-7', 'panel-8', 'panel-5', 'panel-1'];
const TIER_LABEL: Record<string, string> = { bronze: 'Perunggu', silver: 'Perak', gold: 'Emas', diamond: 'Berlian' };
const STREAKS = ALL_ACHIEVEMENTS.filter((a) => a.id.startsWith('streak_'));

export function ProgressPreview() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  useScene(ref, () => bindEffects(ref.current!));

  return (
    <section id="progres" ref={ref} className="ld-section" aria-labelledby="progres-title">
      <div className="lb-head">
        <h2 id="progres-title" className="ld-h2" data-motion="rise">Progres yang terasa</h2>
        <p className="ld-lead">Setiap sesi menambah XP, menaikkan level, dan membuka lencana. Ini pratinjau sistemnya, bukan datamu.</p>
      </div>
      <div className="pg-top">
        <ol className="pg-ladder" aria-label="Tangga level">
          {LEVEL_TIERS.map((t, i) => (
            <li key={t.level} className={`pg-step ${TONES[i % TONES.length]}`} style={{ '--i': i } as React.CSSProperties}>
              <span>Level {t.level}</span>
              <b>{t.name}</b>
              <span>{t.minXp} XP</span>
            </li>
          ))}
        </ol>
        <div className="pg-streak bg-ink text-paper">
          <h3 className="ld-h3">Streak harian</h3>
          <p className="ld-body">Latihan berturut-turut tiap hari menjaga apimu tetap menyala dan membuka lencana streak.</p>
          <ul>
            {STREAKS.map((a) => (
              <li key={a.id}>{a.id.replace('streak_', '')} hari</li>
            ))}
          </ul>
        </div>
      </div>
      <ul className="pg-badges">
        {ALL_ACHIEVEMENTS.map((a, i) => {
          const isOpen = open === a.id;
          return (
            <li key={a.id} className={`pg-badge ${BADGE_TONES[i % BADGE_TONES.length]}`}>
              <button
                type="button"
                className="pg-badge-btn"
                aria-expanded={isOpen}
                aria-controls={`lencana-${a.id}`}
                onClick={() => setOpen(a.id)}
                onMouseEnter={() => setOpen(a.id)}
                onMouseLeave={() => setOpen((o) => (o === a.id ? null : o))}
                onFocus={() => setOpen(a.id)}
                onBlur={() => setOpen((o) => (o === a.id ? null : o))}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}
              >
                <span className="pg-badge-ico" aria-hidden="true">{a.icon}</span>
                <span className="pg-badge-name">{a.name}</span>
                <span className="pg-badge-meta">{TIER_LABEL[a.tier]} · +{a.xpReward} XP</span>
              </button>
              <p id={`lencana-${a.id}`} className="pg-badge-req" hidden={!isOpen}>
                {a.description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
