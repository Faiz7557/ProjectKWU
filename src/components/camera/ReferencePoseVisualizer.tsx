'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EXERCISE_REFERENCES, type PosePhase } from '@/lib/mediapipe/reference-poses';
import { POSE_CONNECTIONS, PoseLandmark } from '@/lib/mediapipe/landmarks';
import { Play, Pause, CheckCircle2, Sparkles, Compass } from 'lucide-react';

interface ReferencePoseVisualizerProps {
  exerciseId: string;
  className?: string;
  autoPlayDefault?: boolean;
}

export function ReferencePoseVisualizer({
  exerciseId,
  className = '',
  autoPlayDefault = true,
}: ReferencePoseVisualizerProps) {
  const refData = EXERCISE_REFERENCES[exerciseId] || EXERCISE_REFERENCES.pushup;
  const phases = refData.phases;

  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlayDefault && phases.length > 1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentPhase: PosePhase = phases[activePhaseIndex] || phases[0];

  // Auto-play loop bergantian antar phase
  useEffect(() => {
    if (!isAutoPlaying || phases.length <= 1) return;

    const interval = setInterval(() => {
      setActivePhaseIndex((prev) => (prev + 1) % phases.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, phases.length]);

  // Render skeleton pada canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const landmarks = currentPhase.landmarks;

    ctx.clearRect(0, 0, width, height);

    // 1. Gambar grid latar belakang tipis bertema AI vision
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Gambar garis tulang (Bones)
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)'; // Neon cyan
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 8;

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Gambar titik sendi (Joints)
    ctx.save();
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (i > PoseLandmark.NOSE && i <= PoseLandmark.MOUTH_RIGHT) continue; // Skip facial clutter

      const px = lm.x * width;
      const py = lm.y * height;

      // Glow circle
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Border circle
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
    }
    ctx.restore();

    // 4. Gambar target angle badge dan penunjuk
    ctx.save();
    for (const angleInfo of currentPhase.keyAngles) {
      const px = angleInfo.position.x * width;
      const py = angleInfo.position.y * height;

      // Target joint marker ring
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)'; // Neon yellow
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label background pill
      ctx.font = 'bold 11px system-ui, sans-serif';
      const text = `${angleInfo.joint}: ${angleInfo.angle}`;
      const textWidth = ctx.measureText(text).width;

      const pillX = px + 14;
      const pillY = py - 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 1;

      // Draw rounded rect
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY - 14, textWidth + 12, 20, radius);
      ctx.fill();
      ctx.stroke();

      // Label text
      ctx.fillStyle = '#fef08a';
      ctx.fillText(text, pillX + 6, pillY);
    }
    ctx.restore();
  }, [currentPhase]);

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
              Contoh Form Skeletal Ideal
            </span>
            <h3 className="text-base font-bold text-slate-100">
              {currentPhase.name}
            </h3>
          </div>
        </div>

        {/* Phase selector tabs / toggle buttons */}
        {phases.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {phases.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setActivePhaseIndex(idx);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePhaseIndex === idx
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Posisi {idx + 1}
              </button>
            ))}

            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              title={isAutoPlaying ? 'Jeda Animasi' : 'Putar Animasi Bergantian'}
              className={`p-1 rounded-lg transition-colors ml-1 ${
                isAutoPlaying
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Visual Canvas Skeleton */}
      <div className="relative w-full aspect-[4/3] max-h-64 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 mb-4 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          className="w-full h-full object-contain"
        />

        {/* Orientation badge */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Compass className="w-3 h-3 text-blue-400" />
          <span>Tampak {refData.orientation === 'front' ? 'Depan' : 'Samping'}</span>
        </div>

        {/* Indicator phase subtitle */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 text-[10px] font-semibold text-blue-300">
          {currentPhase.subtitle}
        </div>
      </div>

      {/* Deskripsi & Checkpoint Form yang Benar */}
      <div className="space-y-2.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3.5">
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentPhase.description}
        </p>

        <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
          {currentPhase.checkpoints.map((cp, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{cp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
