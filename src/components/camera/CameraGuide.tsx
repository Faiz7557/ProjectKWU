'use client';

import React, { useState } from 'react';
import type { ExerciseConfig } from '@/trackers/types';
import { Camera, Smartphone, ArrowRight, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';
import { ReferencePoseVisualizer } from './ReferencePoseVisualizer';

interface CameraGuideProps {
  config: ExerciseConfig;
  onReady: () => void;
}

export function CameraGuide({ config, onReady }: CameraGuideProps) {
  const isFront = config.cameraOrientation === 'front';
  const [activeTab, setActiveTab] = useState<'pose' | 'camera'>('pose');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-8 max-w-xl mx-auto shadow-2xl text-white space-y-6 animate-fade-in">
      {/* Header Info & Tab Nav */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                Persiapan Latihan
              </span>
              <h2 className="text-xl font-extrabold text-slate-100">
                {config.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Pose Ideal vs Posisi Kamera */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('pose')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pose'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Contoh Pose Ideal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'camera'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Posisi Kamera</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONTOH FORM SKELETAL IDEAL */}
      {activeTab === 'pose' && (
        <div className="space-y-4">
          <ReferencePoseVisualizer exerciseId={config.id} autoPlayDefault={true} />
        </div>
      )}

      {/* TAB 2: PANDUAN PENEMPATAN KAMERA */}
      {activeTab === 'camera' && (
        <div className="space-y-5 animate-fade-in">
          {/* Ilustrasi Orientasi Kamera */}
          <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-400/40 flex items-center justify-center mb-4">
              <Smartphone className="w-10 h-10 text-blue-400" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-xs mb-2">
              Orientasi: {isFront ? 'Menghadap DEPAN' : 'Arahkan dari SAMPING'}
            </div>

            <p className="text-xs text-slate-300 max-w-sm">
              {isFront
                ? 'Letakkan ponsel atau laptop tegak lurus di DEPAN Anda agar seluruh tubuh dari kepala hingga kaki terlihat di layar.'
                : 'Posisikan kamera di SAMPING tubuh Anda (jarak ~1.5 - 2 meter) agar sendi lutut, pinggul, atau siku terlihat jelas.'}
            </p>
          </div>

          {/* Checklist Petunjuk */}
          <div className="space-y-2.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4">
            {config.instructions.map((inst, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{inst}</span>
              </div>
            ))}
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Privasi 100% terjaga: Video Anda tidak pernah dikirim ke server manapun.</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onReady}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98]"
      >
        <span>Aktifkan Kamera & Mulai</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
