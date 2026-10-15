'use client';

import React from 'react';
import { Camera, SwitchCamera, Activity } from 'lucide-react';
import type { CameraStatus } from '@/hooks/useCamera';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: CameraStatus;
  fps: number;
  isTracking: boolean;
  onToggleFacingMode?: () => void;
}

export function CameraFeed({
  videoRef,
  canvasRef,
  status,
  fps,
  isTracking,
  onToggleFacingMode,
}: CameraFeedProps) {
  return (
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto rounded-lg overflow-hidden bg-canvas border border-separator shadow-2xl">
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
          <div className="flex items-center gap-2 bg-surface backdrop-blur-md border border-border-strong px-3 py-1.5 rounded-full text-xs font-semibold text-text shadow-lg">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>LIVE</span>
            <span className="text-text-2">|</span>
            <span className="text-success num">{fps} FPS</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-surface backdrop-blur-md border border-border-strong px-3 py-1.5 rounded-full text-xs font-semibold text-warning shadow-lg">
            <Camera className="w-3.5 h-3.5 animate-spin" />
            <span>Memulai Kamera...</span>
          </div>
        )}

        {/* Lock-on / Tracking Badge */}
        {status === 'active' && (
          <div
            className={`flex items-center gap-1.5 backdrop-blur-md border px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-colors ${
              isTracking
                ? 'bg-success-soft border-success/30 text-success'
                : 'bg-warning-soft border-warning/30 text-warning'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
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
            className="p-2.5 rounded-full bg-surface hover:bg-surface-3 backdrop-blur-md border border-border-strong text-text-2 hover:text-text transition-all shadow-lg"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Placeholder jika kamera belum aktif */}
      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-canvas backdrop-blur-sm text-text-2">
          <Camera className="w-12 h-12 mb-3 text-text-3" />
          <p className="text-headline font-semibold text-text-2">Menghubungkan ke kamera...</p>
          <p className="mt-1 max-w-xs text-footnote text-text-3">
            Pastikan memberikan izin saat browser meminta akses kamera kamu.
          </p>
        </div>
      )}
    </div>
  );
}
