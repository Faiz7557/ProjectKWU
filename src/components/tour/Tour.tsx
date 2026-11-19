'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, MousePointerClick, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/components/ui/Button';
import type { TourStep } from './tour-steps';

type Rect = { x: number; y: number; w: number; h: number };

/** Berapa lama langkah menunggu targetnya muncul sebelum lanjut (mis. saat data dimuat). */
const FIND_TIMEOUT = 6000;
const EASE = 'cubic-bezier(0.23,1,0.32,1)';

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [cardH, setCardH] = useState(220);
  const [reduce] = useState(prefersReduced);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  const next = useCallback(() => (i >= steps.length - 1 ? onClose() : setI(i + 1)), [i, steps.length, onClose]);
  const back = () => setI((x) => Math.max(0, x - 1));

  // Ikuti target tiap frame: animasi dan pemuatan data bisa menggeser layout.
  useEffect(() => {
    if (!step) return;
    const pad = step.padding ?? 8;
    const started = Date.now();
    let scrolled = false;
    let found = false;
    let raf = 0;
    const loop = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      // Target sempat tampil lalu hilang = pengguna sudah pindah layar (mis. kamera menyala): tutup, jangan menutupi sesi.
      if (!el && found) {
        onClose();
        return;
      }
      if (el) {
        found = true;
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        }
        const r = el.getBoundingClientRect();
        const n = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
        setRect((p) =>
          p && Math.abs(p.x - n.x) < 0.5 && Math.abs(p.y - n.y) < 0.5 && Math.abs(p.w - n.w) < 0.5 && Math.abs(p.h - n.h) < 0.5 ? p : n,
        );
      } else {
        setRect(null);
        if (step.target && Date.now() - started > FIND_TIMEOUT) {
          setI((x) => Math.min(steps.length - 1, x + 1));
          return;
        }
      }
      setVp((p) => (p.w === window.innerWidth && p.h === window.innerHeight ? p : { w: window.innerWidth, h: window.innerHeight }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, reduce, steps.length, onClose]);

  // Langkah "tekan": lanjut saat elemen yang dibingkai ditekan.
  const targetReady = rect !== null;
  useEffect(() => {
    if (!step?.waitForClick || !targetReady) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;
    const onPress = () => window.setTimeout(next, 150);
    el.addEventListener('click', onPress, { once: true });
    return () => el.removeEventListener('click', onPress);
  }, [step, targetReady, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && !step?.waitForClick) next();
      else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
      else if (e.key === 'Tab' && cardRef.current) {
        // Fokus tetap di kartu panduan (aria-modal).
        const f = cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        const at = document.activeElement;
        if (e.shiftKey && (at === first || !cardRef.current.contains(at))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (at === last || !cardRef.current.contains(at))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, onClose, step]);

  // Fokus ke kartu tiap langkah (kalau autoFocus tidak ada), kembalikan fokus saat panduan ditutup.
  useEffect(() => {
    if (!cardRef.current?.contains(document.activeElement)) cardRef.current?.focus();
  }, [i]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
  }, []);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, rect?.w]);

  if (!step) return null;

  // Kartu di bawah target bila muat, lalu di atas, lalu di samping. Selalu di dalam layar.
  const CW = Math.min(340, vp.w - 24);
  const gap = 16;
  let cx = vp.w / 2 - CW / 2;
  let cy = vp.h / 2 - cardH / 2;
  let side: 'top' | 'bottom' | 'center' = 'center';
  if (rect) {
    const below = vp.h - (rect.y + rect.h);
    if (below >= cardH + gap + 8) {
      cy = rect.y + rect.h + gap;
      side = 'bottom';
    } else if (rect.y >= cardH + gap + 8) {
      cy = rect.y - cardH - gap;
      side = 'top';
    } else if (vp.w - (rect.x + rect.w) >= CW + gap + 8) {
      cx = rect.x + rect.w + gap;
      cy = rect.y + rect.h / 2 - cardH / 2;
    } else if (rect.x >= CW + gap + 8) {
      cx = rect.x - CW - gap;
      cy = rect.y + rect.h / 2 - cardH / 2;
    } else {
      cy = vp.h - cardH - 16;
    }
    if (side !== 'center') cx = rect.x + rect.w / 2 - CW / 2;
    cx = Math.max(12, Math.min(vp.w - CW - 12, cx));
    cy = Math.max(12, Math.min(vp.h - cardH - 12, cy));
  }
  const move = reduce ? undefined : `280ms ${EASE}`;
  const last = i === steps.length - 1;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Panduan">
      <style>{`@keyframes sf-tour-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" width={vp.w} height={vp.h} aria-hidden="true">
        <defs>
          <mask id="sf-tour-hole">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                fill="black"
                rx={0}
                style={{
                  x: rect.x,
                  y: rect.y,
                  width: rect.w,
                  height: rect.h,
                  transition: move && `x ${move}, y ${move}, width ${move}, height ${move}`,
                }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(11 10 10 / .62)" mask="url(#sf-tour-hole)" />
      </svg>

      {/* Blokir tekan di luar lubang. Bagian yang dibingkai tetap bisa ditekan. */}
      {rect ? (
        <>
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(0, rect.y) }} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: rect.y + rect.h }} />
          <div className="pointer-events-auto absolute left-0" style={{ top: rect.y, height: rect.h, width: Math.max(0, rect.x) }} />
          <div className="pointer-events-auto absolute right-0" style={{ top: rect.y, height: rect.h, left: rect.x + rect.w }} />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0" />
      )}

      {rect && (
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: rect.w,
            height: rect.h,
            transform: `translate(${rect.x}px, ${rect.y}px)`,
            transition: move && `transform ${move}, width ${move}, height ${move}`,
          }}
        >
          <span className={cn('absolute inset-0 outline outline-[3px] outline-accent', !reduce && 'animate-pulse')} />
          {step.waitForClick && (
            <MousePointerClick aria-hidden="true" className="absolute -bottom-9 right-2 size-7 text-paper" />
          )}
        </div>
      )}

      <div
        key={i}
        ref={cardRef}
        tabIndex={-1}
        aria-live="polite"
        className="pointer-events-auto absolute outline-none border-2 border-text bg-canvas p-4 text-text"
        style={{
          width: CW,
          left: cx,
          top: cy,
          animation: reduce ? undefined : `sf-tour-in 220ms ${EASE} both`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="panel-1 inline-block px-2.5 py-1 text-caption font-semibold tabular-nums">
            Panduan · {i + 1} dari {steps.length}
          </span>
          <IconButton label="Tutup panduan" onClick={onClose} className="-mr-2 -mt-2" icon={<X className="size-5" aria-hidden="true" />} />
        </div>
        <h3 className="mt-2 font-display text-headline">{step.title}</h3>
        <p className="mt-1 text-callout text-text-2">{step.body}</p>
        {step.waitForClick && (
          <p className="mt-3 flex items-center gap-2 border-2 border-text px-3 py-2 text-footnote font-semibold">
            <MousePointerClick aria-hidden="true" className="size-4 shrink-0" />
            Tekan bagian yang dibingkai untuk melanjutkan
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <div className="mr-auto flex gap-1" aria-hidden="true">
            {steps.map((_, k) => (
              <span key={k} className={cn('h-2 transition-all duration-300', k === i ? 'w-4 bg-text' : k < i ? 'w-2 bg-text-3' : 'w-2 bg-text/20')} />
            ))}
          </div>
          {i > 0 && <IconButton label="Langkah sebelumnya" onClick={back} icon={<ArrowLeft className="size-5" aria-hidden="true" />} />}
          {step.waitForClick ? (
            <Button variant="tertiary" onClick={next}>
              Lewati langkah ini
            </Button>
          ) : (
            <Button onClick={next} autoFocus icon={last ? undefined : <ArrowRight className="size-4" aria-hidden="true" />} className="flex-row-reverse">
              {last ? 'Selesai' : 'Lanjut'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
