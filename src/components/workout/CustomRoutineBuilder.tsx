'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Clock, Check } from 'lucide-react';
import type { WorkoutRoutine, RoutineStep } from '@/lib/routines/types';
import { saveCustomRoutine } from '@/lib/routines/presets';
import { getAllExerciseConfigs } from '@/trackers';

interface CustomRoutineBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (routine: WorkoutRoutine) => void;
}

export function CustomRoutineBuilder({
  isOpen,
  onClose,
  onCreated,
}: CustomRoutineBuilderProps) {
  const availableExercises = getAllExerciseConfigs();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'Pemula' | 'Menengah' | 'Lanjutan'>('Menengah');

  const [steps, setSteps] = useState<RoutineStep[]>([
    {
      exerciseId: 'pushup',
      exerciseName: 'Push-up',
      targetReps: 12,
      restSecAfter: 30,
    },
    {
      exerciseId: 'squat',
      exerciseName: 'Squat',
      targetReps: 15,
      restSecAfter: 30,
    },
    {
      exerciseId: 'plank',
      exerciseName: 'Plank Hold',
      targetDurationSec: 35,
      restSecAfter: 0,
    },
  ]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        exerciseId: 'jumping_jack',
        exerciseName: 'Jumping Jack',
        targetReps: 25,
        restSecAfter: 20,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('Sirkuit minimal harus memiliki 1 gerakan.');
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleUpdateStep = <K extends keyof RoutineStep>(
    index: number,
    field: K,
    value: RoutineStep[K]
  ) => {
    const updated = [...steps];
    if (field === 'exerciseId') {
      const ex = availableExercises.find((e) => e.id === value);
      if (ex) {
        updated[index] = {
          ...updated[index],
          exerciseId: ex.id,
          exerciseName: ex.name,
          ...(ex.type === 'timer'
            ? { targetDurationSec: 35, targetReps: undefined }
            : { targetReps: 12, targetDurationSec: undefined }),
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setSteps(updated);
  };

  const estimatedMinutes = Math.max(
    2,
    Math.ceil(
      steps.reduce((acc, st) => {
        const workSec = st.targetDurationSec || (st.targetReps || 10) * 3;
        return acc + workSec + (st.restSecAfter || 0);
      }, 0) / 60
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama program sirkuit wajib diisi.');
      return;
    }

    const newRoutine: WorkoutRoutine = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `Program sirkuit mandiri dengan ${steps.length} variasi latihan.`,
      level,
      estimatedMinutes,
      steps,
    };

    saveCustomRoutine(newRoutine);
    onCreated(newRoutine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Circuit Routine Builder</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100">Rancang Sirkuit Latihan Anda</h2>
          <p className="text-xs text-slate-400">
            Sesuaikan urutan gerakan, target repetisi/durasi, dan interval istirahat sesuai kapasitas tubuh Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nama & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nama Program</label>
              <input
                type="text"
                required
                placeholder="misal: Core & Chest Blaster"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tingkat Kesulitan</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as 'Pemula' | 'Menengah' | 'Lanjutan')}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Pemula">Pemula</option>
                <option value="Menengah">Menengah</option>
                <option value="Lanjutan">Lanjutan</option>
              </select>
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Deskripsi Singkat</label>
            <input
              type="text"
              placeholder="Fokus penguatan dada dan stabilitas perut..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Steps List Builder */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Urutan Gerakan ({steps.length} Langkah)
              </label>
              <span className="text-[11px] text-indigo-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Estimasi ~{estimatedMinutes} Menit
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>

                  {/* Pilih Gerakan */}
                  <select
                    value={step.exerciseId}
                    onChange={(e) => handleUpdateStep(idx, 'exerciseId', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-semibold focus:outline-none"
                  >
                    {availableExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>

                  {/* Target Reps / Detik */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={step.targetDurationSec !== undefined ? step.targetDurationSec : step.targetReps || 10}
                      onChange={(e) =>
                        handleUpdateStep(
                          idx,
                          step.targetDurationSec !== undefined ? 'targetDurationSec' : 'targetReps',
                          Number(e.target.value)
                        )
                      }
                      className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono font-bold text-slate-200"
                    />
                    <span className="text-[11px] text-slate-400">
                      {step.targetDurationSec !== undefined ? 'detik' : 'reps'}
                    </span>
                  </div>

                  {/* Istirahat */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-slate-400">Rest:</span>
                    <select
                      value={step.restSecAfter}
                      onChange={(e) => handleUpdateStep(idx, 'restSecAfter', Number(e.target.value))}
                      className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]"
                    >
                      <option value={0}>0s</option>
                      <option value={15}>15s</option>
                      <option value={20}>20s</option>
                      <option value={30}>30s</option>
                      <option value={45}>45s</option>
                      <option value={60}>60s</option>
                    </select>
                  </div>

                  {/* Hapus */}
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddStep}
              className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Gerakan ke Sirkuit</span>
            </button>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-bold text-sm text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Program Sirkuit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
