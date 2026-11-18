'use client';

// Diadaptasi dari 8B Sill template (MIT): section "contact" + adegan contact
import Link from 'next/link';
import { useRef, type CSSProperties } from 'react';
import { useScene } from '@/lib/motion/useScene';
import { gsap } from '@/lib/motion/gsap';
import { bindEffects } from '@/lib/motion/effects';

const len = (n: number) => ({ '--len': n }) as CSSProperties;

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);

  useScene(
    ref,
    ({ conditions }) => {
      const root = ref.current!;
      const undo = bindEffects(root);
      const q = (s: string) => root.querySelector<HTMLElement>(s)!;
      const wide = !!conditions.wide;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: q('.fc-grid'), start: 'top 92%', end: wide ? 'top 22%' : 'top 40%', scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.fromTo(q('.fc-kamera'), { xPercent: wide ? -80 : -40 }, { xPercent: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(q('.fc-privasi'), { xPercent: wide ? 80 : 40 }, { xPercent: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(q('.fc-perangkat'), { yPercent: -60 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(q('.fc-harga'), { yPercent: 60 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, 0);
      if (wide) {
        tl.fromTo(q('.fc-kamera .fc-label'), { rotation: 0 }, { rotation: -90, duration: 0.6, ease: 'power2.inOut' }, 0.35)
          .fromTo(q('.fc-privasi .fc-label'), { rotation: 0 }, { rotation: 90, duration: 0.6, ease: 'power2.inOut' }, 0.35);
      }
      return undo;
    },
    { wide: '(min-width: 900.02px)', narrow: '(max-width: 900px)' },
  );

  return (
    <section ref={ref} id="mulai" className="ld-section fc" aria-labelledby="mulai-title">
      <div className="fc-grid">
        <div className="fc-side fc-kamera panel-3">
          <h3 className="ld-big fc-label" style={len(6)}>Kamera</h3>
          <p className="ld-body">Kamera HP atau laptop sudah cukup</p>
        </div>
        <div className="fc-side fc-privasi panel-2">
          <h3 className="ld-big fc-label" style={len(7)}>Privasi</h3>
          <p className="ld-body">Video tetap di perangkatmu</p>
        </div>
        <div className="fc-side fc-perangkat panel-7">
          <h3 className="ld-big fc-label">Perangkat</h3>
          <p className="ld-body">Browser modern, tanpa instal</p>
        </div>
        <div className="fc-main panel-1">
          <h2 id="mulai-title" className="ld-h2" data-motion="rise">Siap mulai?</h2>
          <Link href="/workout" className="ld-btn fc-btn">Mulai latihan sekarang</Link>
        </div>
        <div className="fc-side fc-harga panel-8">
          <h3 className="ld-big fc-label">Harga</h3>
          <p className="ld-body">Mulai gratis</p>
        </div>
      </div>
    </section>
  );
}
