'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

// Native <dialog>: top-layer, Esc, inert latar, fokus awal + restore fokus dibawa browser.
// Di layar kecil tampil sebagai sheet dari bawah; di sm ke atas sebagai dialog tengah.
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sinkronkan prop open -> showModal()/close()
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Esc & close native -> beri tahu parent
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onCloseRef.current();
    el.addEventListener('close', handle);
    return () => el.removeEventListener('close', handle);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        // Klik di latar (backdrop) menutup dialog
        if (e.target === ref.current) onCloseRef.current();
      }}
      className={cn(
        'm-0 max-h-[85dvh] w-full max-w-md overflow-auto rounded-t-xl bg-surface-2 p-0 text-text shadow-3 backdrop:bg-scrim',
        'inset-x-0 top-auto bottom-0 sm:inset-auto sm:m-auto sm:rounded-xl',
        'open:animate-enter',
        className,
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title-2 text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-callout text-text-2">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Tutup" onClick={() => onCloseRef.current()} icon={<X className="size-5" aria-hidden="true" />} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
