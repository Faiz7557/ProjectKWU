'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100">Terjadi Kendala Sistem</h2>
          <p className="text-sm text-slate-400 mt-2">
            Aplikasi mengalami kesalahan yang tidak terduga. Silakan coba muat ulang atau kembali ke beranda.
          </p>
          {error?.message && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-red-300 font-mono text-left overflow-x-auto">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <Home className="w-4 h-4" />
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
