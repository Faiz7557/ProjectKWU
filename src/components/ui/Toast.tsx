'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ToastOptions {
  title: string;
  tone?: 'neutral' | 'success' | 'danger';
  /** Mis. "Urungkan" untuk undo. Klik action juga menutup toast. */
  action?: { label: string; onClick: () => void };
  /** Durasi tampil dalam ms. Default 5000 (UI_UX_BRIEF §6). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

// Store modul kecil: satu antrean untuk seluruh app, tanpa Context.
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(opts: ToastOptions): number {
  const id = nextId++;
  const item: ToastItem = { duration: 5000, tone: 'neutral', ...opts, id };
  items = [...items, item].slice(-3);
  emit();
  return id;
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => items;
// Harus referensi stabil; array baru tiap panggilan membuat useSyncExternalStore loop.
const EMPTY: ToastItem[] = [];
const getServerSnapshot = () => EMPTY;

// Pasang sekali di layout. Live region selalu ada di DOM agar pengumuman terbaca.
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);

  // Auto-dismiss; jeda saat hover/fokus agar sempat dibaca.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismissToast(item.id), item.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [paused, item]);

  return (
    <div
      role={item.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md bg-surface-2 px-4 py-3 text-callout text-text shadow-3 animate-enter',
        item.tone === 'success' && 'border border-success/30',
        item.tone === 'danger' && 'border border-danger/30',
      )}
    >
      <p className="min-w-0 flex-1">{item.title}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            dismissToast(item.id);
          }}
          className="pressable min-h-11 rounded-sm px-3 font-semibold text-accent-text"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={() => dismissToast(item.id)}
        className="pressable grid size-11 place-items-center rounded-full text-text-2 hover:text-text"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
