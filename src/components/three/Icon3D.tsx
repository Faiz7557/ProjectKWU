'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { IconMotion } from '@/lib/three/icon-motion';
import type { IconHandle } from '@/lib/three/icon-stage';

export interface Icon3DHandle {
  play(m: IconMotion): void;
}

interface Icon3DProps {
  icon: LucideIcon;
  strokeWidth?: number;
  className?: string;
  /** Tabung "tergambar" saat ikon pertama terlihat (atau saat adegan scroll mengirim sf-icon-draw). */
  drawIn?: boolean;
  /** Gerakan saat tautan induk di-hover (pointer halus) atau difokus keyboard. */
  hoverMotion?: IconMotion;
  ref?: Ref<Icon3DHandle>;
}

/**
 * Ikon lucide yang dirender ulang sebagai tabung 3D lewat panggung bersama (lib/three/icon-stage).
 * SVG tetap ada sebagai isi SSR dan fallback (tanpa WebGL / konteks hilang).
 * three dimuat lewat import() dinamis, jadi chunk-nya terpisah dan baru diambil di browser.
 */
export function Icon3D({ icon: Icon, strokeWidth = 1.75, className, drawIn = false, hoverMotion, ref }: Icon3DProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<IconHandle | null>(null);

  useImperativeHandle(ref, () => ({ play: (m) => handleRef.current?.play(m) }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    import('@/lib/three/icon-stage').then(({ registerIcon }) => {
      const svg = host.querySelector('svg');
      if (cancelled || !svg) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const h = registerIcon(host, svg, { drawn: !drawIn || reduce });
      if (!h) return;
      handleRef.current = h;
      cleanups.push(() => {
        h.dispose();
        handleRef.current = null;
      });

      if (drawIn && !reduce) {
        // Di bawah adegan scroll Opening (data-ink): tunggu panelnya terbuka (data-drawn / event).
        const gate = host.closest('[data-ink]');
        if (gate) {
          if (host.closest('[data-drawn]')) h.drawIn();
          const onDraw = (e: Event) => {
            const target = (e as CustomEvent<Element>).detail;
            if (target?.contains(host)) h.drawIn();
          };
          window.addEventListener('sf-icon-draw', onDraw);
          cleanups.push(() => window.removeEventListener('sf-icon-draw', onDraw));
        } else {
          const io = new IntersectionObserver(
            ([e]) => {
              if (e?.isIntersecting) {
                h.drawIn();
                io.disconnect();
              }
            },
            { threshold: 0.6 },
          );
          io.observe(host);
          cleanups.push(() => io.disconnect());
        }
      }

      const link = hoverMotion ? host.closest('a') : null;
      if (link && hoverMotion) {
        const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
        const onEnter = () => fine.matches && h.play(hoverMotion);
        const onFocus = () => link.matches(':focus-visible') && h.play(hoverMotion);
        link.addEventListener('pointerenter', onEnter);
        link.addEventListener('focus', onFocus);
        cleanups.push(() => {
          link.removeEventListener('pointerenter', onEnter);
          link.removeEventListener('focus', onFocus);
        });
      }
    });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [drawIn, hoverMotion]);

  return (
    <span ref={hostRef} aria-hidden="true" className={cn('icon3d relative inline-block', className)}>
      <Icon strokeWidth={strokeWidth} />
    </span>
  );
}
