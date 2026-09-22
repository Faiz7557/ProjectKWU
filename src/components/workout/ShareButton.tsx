'use client';

import React, { useState } from 'react';
import { Share2, Download, MessageCircle, Check, Loader2 } from 'lucide-react';
import { generateShareCard, buildWhatsAppShareUrl, ShareCardData } from '@/lib/sharing/share-card';

interface ShareButtonProps {
  data: ShareCardData;
}

export function ShareButton({ data }: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDownloadCard = async () => {
    try {
      setIsGenerating(true);
      const dataUrl = await generateShareCard(data);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `smartfit-${data.exerciseName.toLowerCase().replace(/\s+/g, '-')}-summary.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (e) {
      console.error('Gagal membuat gambar kartu:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        setIsGenerating(true);
        const dataUrl = await generateShareCard(data);
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'workout-summary.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Latihan ${data.exerciseName} di SMART-FIT`,
            text: `Saya menyelesaikan latihan ${data.exerciseName} dengan Form Score ${data.formScore}%!`,
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.warn('Native share dialog ditutup atau gagal:', err);
      } finally {
        setIsGenerating(false);
      }
    }

    // Fallback: Tampilkan pop-up pilihan
    setShowModal(true);
  };

  const waUrl = buildWhatsAppShareUrl(data);

  return (
    <>
      <button
        onClick={handleNativeShare}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
      >
        <Share2 className="w-4 h-4" />
        <span>Bagikan Prestasi Latihan</span>
      </button>

      {/* Modal Pilihan Share */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Bagikan Hasil Latihan</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Tunjukkan pencapaian kebugaran Anda ke teman atau media sosial:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* WhatsApp */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Bagikan ke WhatsApp</span>
              </a>

              {/* Unduh Kartu Grafis PNG */}
              <button
                onClick={handleDownloadCard}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : downloaded ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {isGenerating
                    ? 'Merender Kartu AI...'
                    : downloaded
                    ? 'Tersimpan ke Galeri!'
                    : 'Unduh Kartu Grafis (PNG)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
