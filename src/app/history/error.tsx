'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { History, RefreshCw, Home } from 'lucide-react';

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('History Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <History className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100">Gagal Memuat Riwayat</h2>
          <p className="text-sm text-slate-400 mt-2">
            Terjadi masalah saat membaca data riwayat latihan dari penyimpanan perangkat atau database.
          </p>
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
