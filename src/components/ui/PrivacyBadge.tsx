'use client';

import React, { useState } from 'react';
import { ShieldCheck, Info, X, Lock } from 'lucide-react';

interface PrivacyBadgeProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function PrivacyBadge({ variant = 'compact', className = '' }: PrivacyBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  if (variant === 'full') {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className={`cursor-pointer inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all ${className}`}
          role="button"
          tabIndex={0}
          aria-label="Jaminan Privasi SMART-FIT"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
              <span>Privasi Terlindungi</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                100% Lokal
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/80">
              Video dianalisis di browser Anda &bull; Nol video ke server
            </p>
          </div>
        </div>

        {/* Modal Info Detail */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative space-y-4 shadow-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">Jaminan Privasi Zero-Server</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Bagaimana SMART-FIT v2 menjaga privasi penuh pengguna:
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Inferensi On-Device:</strong> Model MediaPipe BlazePose dijalankan via WebAssembly langsung di prosesor/GPU perangkat Anda.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Zero Video Streaming:</strong> Tidak ada satu frame video atau foto pun yang pernah dikirimkan ke cloud atau server kami.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Hanya Metadata Disimpan:</strong> Hanya total repetisi, durasi latihan, dan skor form yang dicatat ke akun riwayat Anda.</span>
                </li>
              </ul>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Variant: Compact (untuk header camera atau bar atas)
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all text-xs font-medium ${className}`}
        title="Klik untuk detail privasi"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold">Video 100% On-Device</span>
        <Info className="w-3 h-3 text-emerald-400/60 ml-0.5" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative space-y-4 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Privasi Kamera Terjamin</h3>
              <p className="text-sm text-slate-400 mt-1">
                Video Anda diproses 100% di browser lokal Anda menggunakan WebAssembly. Video tidak pernah keluar dari gawai Anda.
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
