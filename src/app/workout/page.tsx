'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllExerciseConfigs } from '@/trackers';
import { getAllRoutines, deleteCustomRoutine, saveCustomRoutine, WorkoutRoutine, RoutineStep } from '@/lib/routines/presets';
import { getExerciseProgression, ProgressionResult } from '@/lib/progression/engine';
import { CustomRoutineBuilder } from '@/components/workout/CustomRoutineBuilder';
import { TopBar } from '@/components/ui/Nav';
import { Button, IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Controls';
import { Card, Badge } from '@/components/ui/Surfaces';
import { ExerciseIcon } from '@/components/ui/ExerciseIcon';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { ArrowRight, Clock, Layers, Plus, Target, Trash2, Dumbbell } from 'lucide-react';

type Tab = 'single' | 'routines';

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Mudah', challenge: 'Menantang', normal: 'Pas' };

export default function WorkoutSelectorPage() {
  const exercises = getAllExerciseConfigs();
  const [tab, setTab] = useState<Tab>('single');
  // State diisi di klien (useEffect) agar SSR dan hydrasi sama (UI_UX_BRIEF §2.1 #6).
  const [progressions, setProgressions] = useState<Record<string, ProgressionResult>>({});
  const [routines, setRoutines] = useState<WorkoutRoutine[] | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkoutRoutine | null>(null);

  useEffect(() => {
    async function hydrate() {
      const map: Record<string, ProgressionResult> = {};
      for (const ex of getAllExerciseConfigs()) map[ex.id] = getExerciseProgression(ex.id);
      setProgressions(map);
      setRoutines(getAllRoutines());
    }
    void hydrate();
  }, []);

  const refreshRoutines = () => setRoutines(getAllRoutines());

  const confirmDelete = () => {
    const target = pendingDelete;
    if (!target) return;
    deleteCustomRoutine(target.id);
    refreshRoutines();
    setPendingDelete(null);
    // Undo 5 detik menggantikan confirm() bawaan (UI_UX_BRIEF §3 Agency)
    toast({
      title: `"${target.name}" dihapus`,
      action: {
        label: 'Urungkan',
        onClick: () => {
          saveCustomRoutine(target);
          refreshRoutines();
        },
      },
    });
  };

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <TopBar title="Latihan" back={{ href: '/', label: 'Beranda' }} />

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
        <SegmentedControl<Tab>
          label="Jenis latihan"
          value={tab}
          onValueChange={setTab}
          options={[
            { value: 'single', label: 'Gerakan', icon: <Dumbbell className="size-4" aria-hidden="true" /> },
            {
              value: 'routines',
              label: routines ? `Program (${routines.length})` : 'Program',
              icon: <Layers className="size-4" aria-hidden="true" />,
            },
          ]}
        />

        {tab === 'single' && (
          <ul className="grid animate-enter grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => {
              const prog = progressions[ex.id];
              const isTimer = ex.type === 'timer';
              const isFront = ex.cameraOrientation === 'front';
              return (
                <li key={ex.id}>
                  <Link
                    href={`/workout/${ex.id}`}
                    className="pressable group flex h-full flex-col justify-between gap-5 rounded-lg bg-surface p-5 shadow-1 hover:bg-surface-2"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <ExerciseIcon exercise={ex.id} />
                        {prog && (
                          <Badge tone={prog.difficulty === 'challenge' ? 'warning' : prog.difficulty === 'easy' ? 'success' : 'neutral'}>
                            {DIFFICULTY_LABEL[prog.difficulty] ?? prog.difficulty}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-title-3 text-text">{ex.name}</h2>
                      {prog && (
                        <Badge tone="accent" icon={<Target className="size-3.5" />}>
                          Target {prog.suggestedTarget} {isTimer ? 'detik' : 'rep'}
                        </Badge>
                      )}
                      <p className="line-clamp-2 text-callout text-text-2">{prog?.coachTip || ex.instructions[0]}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-separator pt-4">
                      <span className="text-footnote text-text-2">Kamera {isFront ? 'depan' : 'samping'}</span>
                      <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-text transition-colors group-hover:bg-accent group-hover:text-on-accent">
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {tab === 'routines' && (
          <div className="animate-enter space-y-5">
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-headline text-text">Program sirkuit</h2>
                <p className="mt-1 text-footnote text-text-2">Jalankan program dengan jeda otomatis, atau buat versi kamu sendiri.</p>
              </div>
              <Button variant="secondary" onClick={() => setBuilderOpen(true)} icon={<Plus className="size-4" aria-hidden="true" />} className="shrink-0 self-start sm:self-auto">
                Buat program
              </Button>
            </Card>

            {routines === null ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Memuat program">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg bg-surface-3" />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {routines.map((routine) => {
                  const isCustom = routine.id.startsWith('custom-');
                  return (
                    <li key={routine.id}>
                      <Card className="flex h-full flex-col justify-between gap-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={routine.level === 'Pemula' ? 'success' : routine.level === 'Menengah' ? 'accent' : 'xp'}>
                                {routine.level}
                              </Badge>
                              {isCustom && <Badge tone="warning">Kustom</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="num flex items-center gap-1 text-footnote text-text-2">
                                <Clock className="size-3.5" aria-hidden="true" />~{routine.estimatedMinutes} menit
                              </span>
                              {isCustom && (
                                <IconButton label={`Hapus program ${routine.name}`} icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setPendingDelete(routine)} />
                              )}
                            </div>
                          </div>
                          <h3 className="text-title-3 text-text">{routine.name}</h3>
                          <p className="text-callout text-text-2">{routine.description}</p>
                          <ol className="space-y-1.5">
                            {routine.steps.slice(0, 3).map((st: RoutineStep, i: number) => (
                              <li key={i} className="flex items-center justify-between gap-3 rounded-sm bg-surface-3 px-3 py-2 text-footnote">
                                <span className="truncate text-text-2">
                                  {i + 1}. {st.exerciseName}
                                </span>
                                <span className="num shrink-0 font-semibold text-text">
                                  {st.targetReps ? `${st.targetReps} rep` : `${st.targetDurationSec} dtk`}
                                </span>
                              </li>
                            ))}
                            {routine.steps.length > 3 && (
                              <li className="px-1 text-footnote text-text-3">+{routine.steps.length - 3} langkah lagi</li>
                            )}
                          </ol>
                        </div>
                        <Button href={`/workout/routine/${routine.id}`} size="lg" className="w-full">
                          Mulai
                        </Button>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <nav aria-label="Tautan lain" className="flex items-center justify-center gap-4 pt-2 text-footnote">
          <Link href="/history" className="pressable inline-flex min-h-11 items-center font-medium text-accent-text">
            Lihat riwayat dan progres
          </Link>
        </nav>
      </div>

      {builderOpen && (
        <CustomRoutineBuilder
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onCreated={() => {
            refreshRoutines();
            setBuilderOpen(false);
          }}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Hapus program ini?"
        description={pendingDelete ? `Program "${pendingDelete.name}" akan dihapus dari perangkat ini.` : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Hapus
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
