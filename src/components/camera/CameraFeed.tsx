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
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
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
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE</span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-400 font-mono">{fps} FPS</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-300 shadow-lg">
            <Camera className="w-3.5 h-3.5 animate-spin" />
            <span>Memulai Kamera...</span>
          </div>
        )}

        {/* Lock-on / Tracking Badge */}
        {status === 'active' && (
          <div
            className={`flex items-center gap-1.5 backdrop-blur-md border px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-colors ${
              isTracking
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
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
            className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 text-slate-300 hover:text-white transition-all shadow-lg"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Placeholder jika kamera belum aktif */}
      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-sm text-slate-400">
          <Camera className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
          <p className="font-semibold text-slate-300 text-sm">Menghubungkan ke sensor kamera...</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Pastikan memberikan izin saat browser meminta akses kamera Anda.
          </p>
        </div>
      )}
    </div>
  );
}
