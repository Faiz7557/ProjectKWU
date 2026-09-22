'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getAllExerciseConfigs } from '@/trackers';
import { getAllRoutines, deleteCustomRoutine, WorkoutRoutine, RoutineStep } from '@/lib/routines/presets';
import { getExerciseProgression, ProgressionResult } from '@/lib/progression/engine';
import { CustomRoutineBuilder } from '@/components/workout/CustomRoutineBuilder';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Layers,
  Dumbbell,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';

const EXERCISE_ICONS: Record<string, string> = {
  pushup: '💪',
  squat: '🦵',
  situp: '🤸',
  jumping_jack: '⭐',
  plank: '🧘',
};

export default function WorkoutSelectorPage() {
  const exercises = getAllExerciseConfigs();
  const [activeTab, setActiveTab] = useState<'single' | 'routines'>('single');
  const [progressions] = useState<Record<string, ProgressionResult>>(() => {
    const map: Record<string, ProgressionResult> = {};
    for (const ex of getAllExerciseConfigs()) {
      map[ex.id] = getExerciseProgression(ex.id);
    }
    return map;
  });
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => getAllRoutines());
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>AI Client-Side Inference</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Pilih Mode Latihan Kamu
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Deteksi pose tubuh real-time di browser Anda menggunakan MediaPipe BlazePose. Video 100% lokal, aman, dan tanpa biaya server.
          </p>
        </div>

        {/* Feature Highlights Pill */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Zero Video ke Server
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <Activity className="w-4 h-4 text-blue-400" />
            Target Adaptif Otomatis
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <Smartphone className="w-4 h-4 text-purple-400" />
            PWA & Mobile Ready
          </span>
        </div>

        {/* Tab Switcher: Gerakan Satuan vs Program Sirkuit */}
        <div className="flex items-center justify-center">
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'single'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Gerakan Satuan (5)</span>
            </button>
            <button
              onClick={() => setActiveTab('routines')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'routines'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Program Sirkuit ({routines.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: GERAKAN SATUAN DENGAN TARGET ADAPTIF */}
        {activeTab === 'single' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
            {exercises.map((ex) => {
              const icon = EXERCISE_ICONS[ex.id] || '🏋️';
              const isFront = ex.cameraOrientation === 'front';
              const isTimer = ex.type === 'timer';
              const prog = progressions[ex.id];

              return (
                <Link
                  key={ex.id}
                  href={`/workout/${ex.id}`}
                  className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-4xl p-3 bg-slate-800/80 rounded-2xl border border-slate-700/50 group-hover:scale-110 transition-transform">
                        {icon}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                        {ex.type}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors mb-1">
                      {ex.name}
                    </h3>

                    {/* Target Adaptif Badge */}
                    {prog && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
                          🎯 Target: {prog.suggestedTarget} {isTimer ? 'detik' : 'reps'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            prog.difficulty === 'challenge'
                              ? 'bg-amber-500/20 text-amber-300'
                              : prog.difficulty === 'easy'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {prog.difficulty}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {prog?.coachTip || ex.instructions[0]}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Kamera {isFront ? 'Depan' : 'Samping'}
                      </span>
                      <span className="text-[10px] text-blue-400 font-medium block">
                        Pose Skeletal & Sudut Tersedia
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* TAB 2: PROGRAM SIRKUIT RUTIN */}
        {activeTab === 'routines' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Action Bar: Info & Buat Sirkuit Kustom */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Koleksi Program Sirkuit</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {routines.length} Program
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Jalankan sirkuit latihan terstruktur dengan waktu istirahat otomatis atau racik rutinitas Anda sendiri.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBuilderOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-indigo-500/25 transition-all self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Sirkuit Kustom</span>
              </button>
            </div>

            {/* Routines Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {routines.map((routine) => {
                const isCustom = routine.id.startsWith('custom-');

                return (
                  <div
                    key={routine.id}
                    className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                              routine.level === 'Pemula'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : routine.level === 'Menengah'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {routine.level}
                          </span>

                          {isCustom && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Kustom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            ~{routine.estimatedMinutes}m
                          </span>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Hapus program sirkuit "${routine.name}"?`)) {
                                  deleteCustomRoutine(routine.id);
                                  setRoutines(getAllRoutines());
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Hapus Program Kustom"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors mb-2">
                        {routine.name}
                      </h3>

                      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                        {routine.description}
                      </p>

                      {/* Steps preview list */}
                      <div className="space-y-2 mb-6">
                        {routine.steps.map((st: RoutineStep, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-800/40 border border-slate-800"
                          >
                            <span className="text-slate-300 font-medium">
                              {i + 1}. {st.exerciseName}
                            </span>
                            <span className="text-indigo-400 font-bold font-mono">
                              {st.targetReps ? `${st.targetReps} reps` : `${st.targetDurationSec}s`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      href={`/workout/routine/${routine.id}`}
                      className="pt-4 border-t border-slate-800/80 flex items-center justify-between group-hover:text-indigo-300 transition-colors"
                    >
                      <span className="text-xs font-semibold text-indigo-400">
                        Mulai Sirkuit
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Pembuat Program Sirkuit Kustom */}
        {isBuilderOpen && (
          <CustomRoutineBuilder
            isOpen={isBuilderOpen}
            onClose={() => setIsBuilderOpen(false)}
            onCreated={() => {
              setRoutines(getAllRoutines());
              setIsBuilderOpen(false);
            }}
          />
        )}

        {/* Navigation Links */}
        <div className="flex items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            ← Kembali ke Beranda
          </Link>
          <span className="text-slate-700">&bull;</span>
          <Link
            href="/history"
            className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Lihat Riwayat & Progres</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
