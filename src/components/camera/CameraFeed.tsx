'use client';

import React from 'react';
import { Camera, SwitchCamera, Activity, AlertCircle } from 'lucide-react';
import type { CameraStatus } from '@/hooks/useCamera';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: CameraStatus;
  fps: number;
  isTracking: boolean;
  onToggleFacingMode?: () => void;
  /** Error kamera/model; ditampilkan di atas video agar terlihat di semua fase. */
  error?: string | null;
}

export function CameraFeed({
  videoRef,
  canvasRef,
  status,
  fps,
  isTracking,
  onToggleFacingMode,
  error,
}: CameraFeedProps) {
  return (
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto overflow-hidden bg-ink">
      {/* Video Element dari Kamera Browser (WebRTC) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover -scale-x-100" // Cermin horizontal untuk kenyamanan pengguna
      />

      {/* HTML5 Canvas Skeleton Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
      />

      {/* Status Overlay di Pojok Kiri Atas */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {status === 'active' ? (
          <div className="flex items-center gap-2 bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            <span className="w-2 h-2 bg-danger" />
            <span>LIVE</span>
            <span aria-hidden="true">|</span>
            <span className="num">{fps} FPS</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-panel-8 px-3 py-1.5 text-xs font-semibold text-on-panel-8">
            <Camera className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>Memulai Kamera...</span>
          </div>
        )}

        {/* Lock-on / Tracking Badge */}
        {status === 'active' && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              isTracking ? 'bg-panel-7 text-on-panel-7' : 'bg-panel-8 text-on-panel-8'
            }`}
          >
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isTracking ? 'Subjek Terkunci' : 'Mencari Tubuh...'}</span>
          </div>
        )}
      </div>

      {/* Area Kontrol Kanan Atas */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <PrivacyBadge variant="compact" />
        {onToggleFacingMode && status === 'active' && (
          <button
            onClick={onToggleFacingMode}
            title="Balik kamera (depan/belakang)"
            aria-label="Balik kamera"
            className="p-2.5 bg-paper text-ink transition-colors hover:bg-panel-1"
          >
            <SwitchCamera className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="absolute z-10 bottom-4 inset-x-4 flex items-start gap-2 bg-danger-soft border border-danger/30 p-3 text-sm text-danger"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Placeholder jika kamera belum aktif */}
      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-ink text-paper">
          <Camera className="w-12 h-12 mb-3" aria-hidden="true" />
          <p className="text-headline font-semibold">Menghubungkan ke kamera...</p>
          <p className="mt-1 max-w-xs text-footnote">
            Pastikan memberikan izin saat browser meminta akses kamera kamu.
          </p>
        </div>
      )}
    </div>
  );
}
