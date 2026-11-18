'use client';

// Diadaptasi dari 8B Sill template (MIT): footer
import Link from 'next/link';
import { useRef, type CSSProperties } from 'react';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';

const SECTIONS = [
  ['Cara kerja', '#cara-kerja'],
  ['Gerakan', '#gerakan'],
  ['Privasi', '#privasi'],
  ['Harga', '#harga'],
  ['FAQ', '#faq'],
] as const;

const WORDMARK = 'SMART-FIT';

export function LandingFooter() {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, () => bindEffects(ref.current!));

  return (
    <footer ref={ref} className="lf bg-ink text-paper">
      <div className="lf-grid">
        <nav aria-label="Bagian halaman">
          <p className="ld-label lf-title">Di halaman ini</p>
          <ul className="lf-links">
            {SECTIONS.map(([label, href]) => (
              <li key={href}><a className="ld-link lf-link" href={href}>{label}</a></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Aplikasi">
          <p className="ld-label lf-title">Aplikasi</p>
          <ul className="lf-links">
            <li><Link className="ld-link lf-link" href="/workout">Latihan</Link></li>
            <li><Link className="ld-link lf-link" href="/history">Riwayat</Link></li>
          </ul>
        </nav>
        <div className="lf-note">
          <p className="ld-body">Video tidak pernah keluar dari perangkatmu.</p>
          <p className="lf-credit">
            Desain diadaptasi dari template Sill oleh 8B (MIT){' '}
            <a className="ld-link" href="https://github.com/8bsite/pet-boarding-website-template" target="_blank" rel="noopener noreferrer">sumber</a>
            {' · '}© 2026 SMART-FIT
          </p>
        </div>
      </div>
      <div className="lf-mark ld-frame" data-motion="peek">
        <p className="lf-word" aria-hidden="true" style={{ '--len': WORDMARK.length } as CSSProperties}>{WORDMARK}</p>
      </div>
    </footer>
  );
}
