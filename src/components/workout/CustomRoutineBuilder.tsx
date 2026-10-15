'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Clock, Check } from 'lucide-react';
import type { WorkoutRoutine, RoutineStep } from '@/lib/routines/types';
import { saveCustomRoutine } from '@/lib/routines/presets';
import { getAllExerciseConfigs } from '@/trackers';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface CustomRoutineBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (routine: WorkoutRoutine) => void;
}

const FIELD = 'w-full rounded-sm border border-separator bg-canvas px-3 py-2.5 text-callout text-text placeholder:text-text-3';

export function CustomRoutineBuilder({ isOpen, onClose, onCreated }: CustomRoutineBuilderProps) {
  const availableExercises = getAllExerciseConfigs();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'Pemula' | 'Menengah' | 'Lanjutan'>('Menengah');
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<RoutineStep[]>([
    { exerciseId: 'pushup', exerciseName: 'Push-up', targetReps: 12, restSecAfter: 30 },
    { exerciseId: 'squat', exerciseName: 'Squat', targetReps: 15, restSecAfter: 30 },
    { exerciseId: 'plank', exerciseName: 'Plank', targetDurationSec: 35, restSecAfter: 0 },
  ]);

  const handleAddStep = () => {
    setSteps([...steps, { exerciseId: 'jumping_jack', exerciseName: 'Jumping Jack', targetReps: 25, restSecAfter: 20 }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setError('Sirkuit minimal punya 1 gerakan.');
      return;
    }
    setError(null);
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleUpdateStep = <K extends keyof RoutineStep>(index: number, field: K, value: RoutineStep[K]) => {
    const updated = [...steps];
    if (field === 'exerciseId') {
      const ex = availableExercises.find((e) => e.id === value);
      if (ex) {
        updated[index] = {
          ...updated[index],
          exerciseId: ex.id,
          exerciseName: ex.name,
          ...(ex.type === 'timer' ? { targetDurationSec: 35, targetReps: undefined } : { targetReps: 12, targetDurationSec: undefined }),
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSteps(updated);
  };

  const estimatedMinutes = Math.max(
    2,
    Math.ceil(
      steps.reduce((acc, st) => {
        const workSec = st.targetDurationSec || (st.targetReps || 10) * 3;
        return acc + workSec + (st.restSecAfter || 0);
      }, 0) / 60,
    ),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama program wajib diisi.');
      return;
    }
    setError(null);

    const newRoutine: WorkoutRoutine = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `Program sirkuit mandiri dengan ${steps.length} gerakan.`,
      level,
      estimatedMinutes,
      steps,
    };

    saveCustomRoutine(newRoutine);
    onCreated(newRoutine);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Rancang program sirkuit" description="Atur urutan gerakan, target, dan jeda sesuai kemampuan kamu.">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="routine-name" className="text-subhead font-medium text-text-2">
              Nama program
            </label>
            <input
              id="routine-name"
              type="text"
              placeholder="contoh: Core dan dada"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error?.includes('Nama') || undefined}
              className={FIELD}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="routine-level" className="text-subhead font-medium text-text-2">
              Tingkat
            </label>
            <select
              id="routine-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as 'Pemula' | 'Menengah' | 'Lanjutan')}
              className={FIELD}
            >
              <option value="Pemula">Pemula</option>
              <option value="Menengah">Menengah</option>
              <option value="Lanjutan">Lanjutan</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="routine-desc" className="text-subhead font-medium text-text-2">
            Deskripsi (opsional)
          </label>
          <input
            id="routine-desc"
            type="text"
            placeholder="contoh: fokus dada dan perut"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-subhead font-semibold text-text">Urutan gerakan ({steps.length})</p>
            <span className="num flex items-center gap-1 text-footnote text-text-2">
              <Clock className="size-3.5" aria-hidden="true" />~{estimatedMinutes} menit
            </span>
          </div>

          <ol className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {steps.map((step, idx) => (
              <li key={idx} className="flex flex-wrap items-center gap-2.5 rounded-md border border-separator bg-canvas p-3">
                <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-footnote font-semibold text-text-2">
                  {idx + 1}
                </span>

                <label className="sr-only" htmlFor={`step-ex-${idx}`}>
                  Gerakan langkah {idx + 1}
                </label>
                <select
                  id={`step-ex-${idx}`}
                  value={step.exerciseId}
                  onChange={(e) => handleUpdateStep(idx, 'exerciseId', e.target.value)}
                  className="min-h-11 rounded-sm border border-border-strong bg-surface px-2.5 text-subhead font-medium text-text"
                >
                  {availableExercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <label className="sr-only" htmlFor={`step-target-${idx}`}>
                    Target langkah {idx + 1}
                  </label>
                  <input
                    id={`step-target-${idx}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    value={step.targetDurationSec !== undefined ? step.targetDurationSec : step.targetReps || 10}
                    onChange={(e) =>
                      handleUpdateStep(idx, step.targetDurationSec !== undefined ? 'targetDurationSec' : 'targetReps', Number(e.target.value))
                    }
                    className="num min-h-11 w-16 rounded-sm border border-border-strong bg-surface px-2 text-center text-text"
                  />
                  <span className="text-footnote text-text-2">{step.targetDurationSec !== undefined ? 'detik' : 'rep'}</span>
                </div>

                <div className="ml-auto flex items-center gap-1.5">
                  <label className="text-footnote text-text-2" htmlFor={`step-rest-${idx}`}>
                    Jeda
                  </label>
                  <select
                    id={`step-rest-${idx}`}
                    value={step.restSecAfter}
                    onChange={(e) => handleUpdateStep(idx, 'restSecAfter', Number(e.target.value))}
                    className="num min-h-11 rounded-sm border border-border-strong bg-surface px-2 text-footnote text-text"
                  >
                    <option value={0}>0 dtk</option>
                    <option value={15}>15 dtk</option>
                    <option value={20}>20 dtk</option>
                    <option value={30}>30 dtk</option>
                    <option value={45}>45 dtk</option>
                    <option value={60}>60 dtk</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    aria-label={`Hapus langkah ${idx + 1}`}
                    className="pressable grid size-11 place-items-center rounded-full text-text-2 hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <Button variant="secondary" className="w-full" onClick={handleAddStep} icon={<Plus className="size-4" aria-hidden="true" />}>
            Tambah gerakan
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-footnote text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" icon={<Check className="size-4" aria-hidden="true" />}>
          Simpan program
        </Button>
      </form>
    </Dialog>
  );
}
