'use client';

import { useState } from 'react';
import { Share2, Download, MessageCircle, Check, Loader2 } from 'lucide-react';
import { generateShareCard, buildWhatsAppShareUrl, ShareCardData } from '@/lib/sharing/share-card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

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

  // Native share bila tersedia; jika tidak, buka sheet pilihan
  const handleShare = async () => {
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
            text:
              data.formScore !== undefined
                ? `Saya menyelesaikan latihan ${data.exerciseName} dengan skor form ${data.formScore}%!`
                : `Saya menyelesaikan latihan ${data.exerciseName} di SMART-FIT!`,
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
    setShowModal(true);
  };

  const waUrl = buildWhatsAppShareUrl(data);

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={handleShare} icon={<Share2 className="size-4" aria-hidden="true" />}>
        Bagikan hasil
      </Button>

      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Bagikan hasil latihan" description="Tunjukkan pencapaian kamu ke teman atau media sosial.">
        <div className="space-y-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-success px-4 text-subhead font-semibold text-on-success"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            <span>Bagikan ke WhatsApp</span>
          </a>

          <Button variant="secondary" className="w-full" onClick={handleDownloadCard} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : downloaded ? (
              <Check className="size-4 text-success" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            <span>{isGenerating ? 'Membuat kartu...' : downloaded ? 'Tersimpan' : 'Unduh kartu gambar (PNG)'}</span>
          </Button>
        </div>
      </Dialog>
    </>
  );
}
