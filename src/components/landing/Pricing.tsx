'use client';

// Diadaptasi dari 8B Sill template (MIT), adegan "rooms"
import Link from 'next/link';
import { useRef } from 'react';
import { gsap } from '@/lib/motion/gsap';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';
import { PRICING } from './pricing-data';

export function Pricing() {
  const ref = useRef<HTMLElement>(null);

  useScene(ref, () => {
    const root = ref.current!;
    const undo = bindEffects(root);
    const rooms = gsap.utils.toArray<HTMLElement>('.la-room', root);
    // Panel terbuka dari persegi di sudut kiri atas.
    const side = (r: HTMLElement) => Math.min(r.offsetWidth, r.offsetHeight) * (window.innerWidth < 768 ? 0.62 : 0.9);
    rooms.forEach((room) => {
      gsap.fromTo(
        room,
        { clipPath: () => { const s = side(room); return `inset(${room.offsetHeight - s}px ${room.offsetWidth - s}px 0px 0px)`; } },
        {
          clipPath: 'inset(0px 0px 0px 0px)',
          ease: 'power1.inOut',
          scrollTrigger: { trigger: room, start: 'top 88%', end: 'bottom 78%', scrub: 0.5, invalidateOnRefresh: true },
        },
      );
    });
    return undo;
  });

  const { free, paid } = PRICING;
  return (
    <section id="harga" ref={ref} className="ld-section la-price" aria-labelledby="la-price-h2">
      <div className="la-price__head bg-ink text-paper">
        <h2 id="la-price-h2" className="ld-h2" data-motion="rise">Dua akun, pilih yang cocok.</h2>
      </div>
      <div className="la-price__grid">
        <article className="la-room ld-panel panel-4 la-room--free">
          <h3 className="ld-big">{free.name}</h3>
          <p className="ld-lead">{free.blurb}</p>
          {free.features.length > 0 && (
            <ul className="la-price__list">{free.features.map((f) => <li key={f} className="ld-body">{f}</li>)}</ul>
          )}
          <Link href="/workout" className="ld-btn la-price__cta"><span>Mulai gratis</span></Link>
        </article>
        <article className="la-room ld-panel panel-1 la-room--paid">
          <h3 className="ld-big">{paid.name}</h3>
          <p className="ld-lead">{paid.blurb}</p>
          <p className="la-price__amount">
            <strong className="font-display">{paid.monthly}/bulan</strong>
            <span className="ld-body">atau {paid.yearly}/tahun</span>
          </p>
          {paid.features.length > 0 && (
            <ul className="la-price__list">{paid.features.map((f) => <li key={f} className="ld-body">{f}</li>)}</ul>
          )}
          <button type="button" className="ld-btn la-price__cta" disabled>Segera hadir</button>
        </article>
      </div>
    </section>
  );
}
