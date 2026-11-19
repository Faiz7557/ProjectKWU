'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { getRoutineById, WorkoutRoutine, RoutineStep } from '@/lib/routines/presets';
import { createTracker, ExerciseTracker } from '@/trackers';
import type { FormFault } from '@/trackers/types';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { EXERCISE_PANEL } from '@/components/ui/ExerciseIcon';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { EnvironmentCheck } from '@/components/camera/EnvironmentCheck';
import { WorkoutHUD } from '@/components/workout/WorkoutHUD';
import { CountdownOverlay } from '@/components/workout/CountdownOverlay';
import { RestTimer } from '@/components/workout/RestTimer';
import { CircuitProgress } from '@/components/workout/CircuitProgress';
import { SessionSummary, FaultSummaryItem } from '@/components/workout/SessionSummary';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { triggerHapticSuccess, triggerHapticFault, triggerHapticMilestone } from '@/lib/audio/haptics';
import { metronome } from '@/lib/audio/metronome';
import { voiceCommander, VoiceCommandEvent } from '@/lib/audio/voice-commands';
import { recordWorkoutSessionCompletion } from '@/lib/gamification/streak';
import { AchievementToast } from '@/components/ui/AchievementToast';
import type { Achievement } from '@/lib/gamification/types';
import { estimateCalories, summarizeFaults, hasWork } from '@/lib/workout/session-metrics';

interface RoutinePageProps {
  params: Promise<{
    routineId: string;
  }>;
}

/** Hasil satu langkah sirkuit, dicatat saat langkah selesai. */
interface CircuitStepResult {
  exerciseId: string;
  reps: number;
  cleanReps: number;
  holdSec: number;
  faults: FormFault[];
  formScore: number | null;
  symmetryScore: number | null;
  kcal: number;
}

interface CircuitSummary {
  reps: number;
  cleanReps: number;
  holdSec: number;
  faults: FaultSummaryItem[];
  formScore: number | null;
  symmetryScore: number | null;
  kcal: number;
}

const mean = (xs: number[]): number | null =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

/** Gabungkan hasil seluruh langkah. Skor = rata-rata langkah yang punya data (bukan 100 - n×3). */
function summarizeCircuit(steps: CircuitStepResult[]): CircuitSummary {
  return {
    reps: steps.reduce((a, s) => a + s.reps, 0),
    cleanReps: steps.reduce((a, s) => a + s.cleanReps, 0),
    holdSec: steps.reduce((a, s) => a + s.holdSec, 0),
    faults: summarizeFaults(steps.flatMap((s) => s.faults)),
    formScore: mean(steps.map((s) => s.formScore).filter((v): v is number => v !== null)),
    symmetryScore: mean(steps.map((s) => s.symmetryScore).filter((v): v is number => v !== null)),
    kcal: Math.round(steps.reduce((a, s) => a + s.kcal, 0)),
  };
}

export default function RoutineWorkoutPage({ params }: RoutinePageProps) {
  const resolvedParams = use(params);
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(() => getRoutineById(resolvedParams.routineId) || null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const r = getRoutineById(resolvedParams.routineId);
      if (r) {
        setRoutine(r);
      }
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [resolvedParams.routineId]);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'overview' | 'env-check' | 'countdown' | 'exercise' | 'rest' | 'summary'>('overview');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // Ghost Skeleton & Metronom State
  const [showGhostSkeleton, setShowGhostSkeleton] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);

  // Voice Command
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);

  const prevPhaseRef = useRef<string>('idle');
  const handleTogglePauseRef = useRef<() => void>(() => {});
  const handleStepCompleteRef = useRef<() => void>(() => {});
  const voiceCommandRef = useRef<(evt: VoiceCommandEvent) => void>(() => {});

  // Hasil per langkah disimpan di ref (sinkron). Sebelumnya total disimpan di useState lalu dibaca
  // pada render yang sama, sehingga rep & fault langkah TERAKHIR hilang dari ringkasan dan riwayat.
  const stepResultsRef = useRef<CircuitStepResult[]>([]);
  const stepStartElapsedRef = useRef(0);
  const stepDoneRef = useRef(false);
  const [circuitSummary, setCircuitSummary] = useState<CircuitSummary | null>(null);

  // Gamifikasi
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [levelName, setLevelName] = useState('Pemula');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRepRef = useRef(0);
  const lastFeedbackSpokenRef = useRef<string>('');

  const currentStep = routine?.steps[stepIndex] || routine?.steps[0] || null;

  // Inisialisasi tracker untuk gerakan saat ini secara terderivasi (useMemo)
  const currentTracker = useMemo<ExerciseTracker | null>(() => {
    if (!currentStep) return null;
    try {
      return createTracker(currentStep.exerciseId);
    } catch {
      console.warn('Gagal memuat tracker gerakan:', currentStep.exerciseId);
      return null;
    }
  }, [currentStep]);

  const {
    videoRef,
    status: cameraStatus,
    startCamera,
    stopCamera,
    toggleFacingMode,
  } = useCamera();

  const {
    isRunning,
    trackingResult,
    tempoState,
    gestureResult,
    symmetryState,
    getAverageSymmetryScore,
    fps,
    start: startInference,
    pause: pauseInference,
    reset: resetInference,
  } = usePoseDetection(videoRef, canvasRef, currentTracker, {
    showGhostSkeleton,
    exerciseId: currentTracker?.config.id,
    enableGestures: phase === 'exercise',
    onGestureAction: (action) => {
      if (action === 'toggle_pause') {
        handleTogglePauseRef.current();
      } else if (action === 'finish_workout') {
        handleStepCompleteRef.current();
      }
    },
  });

  // Stopwatch waktu aktif sirkuit (hanya saat inferensi berjalan; istirahat & jeda tidak dihitung)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (phase === 'exercise' && isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, isRunning]);

  // Voice coach count + Haptics saat repetisi bertambah
  useEffect(() => {
    const reps = trackingResult?.repCount ?? 0;
    if (reps > prevRepRef.current) {
      triggerHapticSuccess();
      if (isVoiceEnabled) {
        voiceCoach.speakRep(reps);
        if (tempoState?.lastRepTempo?.isRushed) {
          setTimeout(() => {
            voiceCoach.speakCorrection('Kendalikan tempo, jangan terburu-buru!');
          }, 600);
        }
      }
    }
    prevRepRef.current = reps;
  }, [trackingResult?.repCount, isVoiceEnabled, tempoState?.lastRepTempo?.isRushed]);

  // Haptic feedback & voice coach koreksi otomatis
  useEffect(() => {
    const feedback = trackingResult?.feedback;
    if (isVoiceEnabled && feedback && feedback !== lastFeedbackSpokenRef.current && isRunning) {
      lastFeedbackSpokenRef.current = feedback;
      voiceCoach.speakCorrection(feedback);
    }
    if (trackingResult?.activeFault && isRunning) {
      triggerHapticFault();
    }
  }, [trackingResult?.feedback, trackingResult?.activeFault, isVoiceEnabled, isRunning]);

  // Metronome audio ticks berdasarkan fase tempo gerakan
  useEffect(() => {
    if (!isMetronomeEnabled || !isRunning || phase !== 'exercise') return;
    const currentPhase = tempoState?.currentPhase;
    if (currentPhase && currentPhase !== prevPhaseRef.current) {
      if (currentPhase === 'descending') {
        metronome.playTick(440);
      } else if (currentPhase === 'bottom') {
        metronome.playBottomPause();
      } else if (currentPhase === 'ascending') {
        metronome.playAscentCue();
      }
      prevPhaseRef.current = currentPhase;
    }
  }, [tempoState?.currentPhase, isMetronomeEnabled, isRunning, phase]);

  // Auto-lanjut: langkah selesai otomatis saat target rep / durasi tahan tercapai,
  // agar sirkuit benar-benar hands-free (sebelumnya harus menekan Selesai tiap gerakan).
  useEffect(() => {
    if (phase !== 'exercise' || !isRunning || !currentStep || !trackingResult) return;
    const reached = currentStep.targetReps
      ? trackingResult.repCount >= currentStep.targetReps
      : currentStep.targetDurationSec
        ? (trackingResult.holdDuration ?? 0) >= currentStep.targetDurationSec
        : false;
    if (reached) handleStepCompleteRef.current();
  }, [trackingResult, phase, isRunning, currentStep]);

  // Handler: Mulai dari Overview -> Masuk ke Env Check
  const handleStartRoutine = async () => {
    await startCamera('user');
    setPhase('env-check');
    startInference();
  };

  // Handler: Selesai Env Check -> Countdown
  const handleEnvCheckPassed = () => {
    pauseInference();
    setPhase('countdown');
  };

  // Handler: Countdown selesai -> Mulai Exercise
  const handleCountdownComplete = () => {
    resetInference();
    stepStartElapsedRef.current = elapsedSeconds;
    stepDoneRef.current = false;
    setPhase('exercise');
    startInference();
  };

  // Handler: Pause / Resume Sirkuit
  const handleTogglePause = () => {
    if (isRunning) {
      pauseInference();
      triggerHapticFault();
      if (isVoiceEnabled) voiceCoach.speakCorrection('Sirkuit dijeda');
    } else {
      startInference();
      triggerHapticSuccess();
      if (isVoiceEnabled) voiceCoach.speakCorrection('Lanjut sirkuit');
    }
  };

  // Handler: Toggle Perintah Suara. Callback lewat ref agar selalu membaca state terbaru.
  const handleToggleVoiceCommand = () => {
    const next = voiceCommander.toggleListening((evt: VoiceCommandEvent) => voiceCommandRef.current(evt));
    setIsVoiceCommandListening(next);
  };

  const handleVoiceCommand = (evt: VoiceCommandEvent) => {
    setLastVoiceCommand(evt.phrase);
    triggerHapticSuccess();
    setTimeout(() => setLastVoiceCommand(null), 3500);

    if (evt.action === 'pause') {
      if (isRunning) handleTogglePause();
    } else if (evt.action === 'resume') {
      if (!isRunning) handleTogglePause();
    } else if (evt.action === 'finish') {
      if (phase === 'exercise') handleStepComplete();
    } else if (evt.action === 'start') {
      if (phase === 'overview') {
        handleStartRoutine();
      } else if (phase === 'env-check') {
        handleEnvCheckPassed();
      }
    }
  };

  useEffect(() => {
    return () => {
      voiceCommander.stopListening();
    };
  }, []);

  // Handler: Langkah selesai (Next Step atau Rest)
  const handleStepComplete = () => {
    if (!routine || !currentStep || stepDoneRef.current) return; // cegah dobel (auto-lanjut + tombol/gestur)
    stepDoneRef.current = true;
    pauseInference();
    triggerHapticMilestone();

    if (currentTracker) {
      const isCounter = currentTracker.config.type === 'counter';
      stepResultsRef.current.push({
        exerciseId: currentTracker.config.id,
        reps: isCounter ? trackingResult?.repCount ?? 0 : 0,
        cleanReps: isCounter ? currentTracker.getCleanRepCount() : 0,
        holdSec: !isCounter ? trackingResult?.holdDuration ?? 0 : 0,
        faults: [...currentTracker.getFaults()],
        formScore: trackingResult?.formScore ?? null,
        // Simetri per langkah: akumulator di-reset tiap countdown, jadi harus diambil sekarang.
        symmetryScore: getAverageSymmetryScore(),
        kcal: estimateCalories(currentTracker.config.id, elapsedSeconds - stepStartElapsedRef.current),
      });
    }

    const isLastStep = stepIndex >= routine.steps.length - 1;
    const hasRest = currentStep.restSecAfter > 0;

    if (!isLastStep && hasRest) {
      setPhase('rest');
    } else if (!isLastStep) {
      setStepIndex((prev) => prev + 1);
      setPhase('countdown');
    } else {
      handleFinishCircuit();
    }
  };

  // Handler: Istirahat tuntas -> Lanjut ke step berikutnya
  const handleRestFinished = () => {
    setStepIndex((prev) => prev + 1);
    setPhase('countdown');
  };

  // Handler: Selesai Seluruh Sirkuit
  const handleFinishCircuit = () => {
    if (!routine) return;
    stopCamera();
    pauseInference();

    const steps = stepResultsRef.current;
    const summary = summarizeCircuit(steps);
    setCircuitSummary(summary);
    setPhase('summary');

    const sessionPayload = {
      id: `circuit-${Date.now()}`,
      exercise: routine.id,
      exerciseName: routine.name,
      reps: summary.reps,
      cleanReps: summary.cleanReps,
      holdDurationSec: summary.holdSec > 0 ? summary.holdSec : null,
      sessionDurationSec: elapsedSeconds,
      caloriesBurned: summary.kcal,
      formScore: summary.formScore ?? undefined,
      symmetryScore: summary.symmetryScore ?? undefined,
      faultsSummary: summary.faults,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
    };

    try {
      const existingStr = localStorage.getItem('smartfit_workout_history');
      const history = existingStr ? JSON.parse(existingStr) : [];
      history.unshift(sessionPayload);
      localStorage.setItem('smartfit_workout_history', JSON.stringify(history.slice(0, 50)));
    } catch {
      // Storage safe
    }

    if (!hasWork(summary.reps, summary.holdSec)) return;
    try {
      const gamification = recordWorkoutSessionCompletion({
        exercise: routine.id,
        exerciseIds: [...new Set(steps.map((s) => s.exerciseId))],
        reps: summary.reps,
        // Lencana plank dinilai dari satu tahanan terpanjang, bukan jumlah beberapa plank.
        holdDurationSec: Math.max(0, ...steps.map((s) => s.holdSec)) || null,
        sessionDurationSec: elapsedSeconds,
        formScore: summary.formScore,
      });

      if (gamification.newlyUnlocked.length > 0) {
        setUnlockedAchievements(gamification.newlyUnlocked);
      }
      if (gamification.leveledUp) {
        setLeveledUp(true);
        setNewLevel(gamification.newLevel);
        setLevelName(gamification.state.levelName);
      }
    } catch (e) {
      console.warn('Gagal record gamification:', e);
    }
  };

  // Sinkronisasi callback ref untuk gestur & suara hands-free
  useEffect(() => {
    handleTogglePauseRef.current = handleTogglePause;
    handleStepCompleteRef.current = handleStepComplete;
    voiceCommandRef.current = handleVoiceCommand;
  });

  if (!routine) {
    if (!isLoaded) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center text-text-2">
          Memuat program sirkuit...
        </div>
      );
    }
    notFound();
  }

  if (!currentStep) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-text-2">
        Gerakan sirkuit tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-[1fr_auto_1fr] items-center mb-4">
        <Link
          href="/workout"
          onClick={() => stopCamera()}
          className="inline-flex items-center gap-2 justify-self-start text-sm font-semibold text-text-2 hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali</span>
        </Link>

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-accent-text block">
            Program Sirkuit
          </span>
          <h1 className="font-display text-base font-bold text-text">{routine.name}</h1>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full space-y-4">
        {/* PHASE 1: OVERVIEW ROUTINE */}
        {phase === 'overview' && (
          <div className="w-full max-w-lg space-y-6 text-left animate-enter">
            {/* blok teks terbalik, bukan oranye: langkah pertama sering push-up (panel-1) tepat di bawahnya */}
            <div className="bg-text text-canvas p-6 md:p-8">
              <span className="text-xs font-bold uppercase tracking-[0.06em] block mb-1">
                {routine.level} &bull; ~{routine.estimatedMinutes} Menit
              </span>
              <h2 className="font-display text-2xl font-bold">{routine.name}</h2>
              <p className="text-xs mt-2 leading-relaxed">{routine.description}</p>
            </div>

            {/* List Steps: tangga panel berurutan */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-text-2 block">
                Urutan Sirkuit ({routine.steps.length} Gerakan)
              </span>
              <div data-tour="rt-steps">
                {routine.steps.map((st: RoutineStep, i: number) => (
                  <div
                    key={i}
                    className={`panel-${EXERCISE_PANEL[st.exerciseId] ?? 4} p-3.5 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-ink text-paper flex items-center justify-center font-display text-xs font-bold num">
                        {i + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">
                          {st.exerciseName}
                        </span>
                        <span className="text-xs">
                          {st.targetReps ? `${st.targetReps} repetisi` : `${st.targetDurationSec} detik`}
                        </span>
                      </div>
                    </div>
                    {st.restSecAfter > 0 && (
                      <span className="text-xs font-medium bg-ink text-paper px-2 py-0.5">
                        Istirahat {st.restSecAfter}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              data-tour="rt-start"
              onClick={handleStartRoutine}
              className="pressable w-full py-4 bg-accent font-bold text-sm text-on-accent hover:bg-panel-8 hover:text-on-panel-8 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Mulai Sirkuit Sekarang</span>
            </button>
          </div>
        )}

        {/* PHASE 2: ENV CHECK */}
        {phase === 'env-check' && currentTracker && (
          <div className="w-full space-y-4 animate-enter">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
            />

            <EnvironmentCheck
              config={currentTracker.config}
              videoRef={videoRef}
              trackingResult={trackingResult}
              onPassed={handleEnvCheckPassed}
              onSkip={handleEnvCheckPassed}
            />
          </div>
        )}

        {/* PHASE 3: COUNTDOWN */}
        {phase === 'countdown' && (
          <div className="relative min-h-72">
            <CountdownOverlay seconds={5} onComplete={handleCountdownComplete} />
          </div>
        )}

        {/* PHASE 4: ACTIVE EXERCISE */}
        {phase === 'exercise' && currentTracker && (
          <div className="w-full space-y-4 animate-enter">
            <CircuitProgress
              steps={routine.steps}
              currentStepIndex={stepIndex}
              routineName={routine.name}
            />

            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
            />

            <WorkoutHUD
              config={currentTracker.config}
              trackingResult={trackingResult}
              isRunning={isRunning}
              elapsedSeconds={elapsedSeconds}
              isVoiceEnabled={isVoiceEnabled}
              targetValue={currentStep.targetReps || currentStep.targetDurationSec}
              tempoState={tempoState}
              symmetry={symmetryState}
              showGhostSkeleton={showGhostSkeleton}
              onToggleGhostSkeleton={() => setShowGhostSkeleton((prev) => !prev)}
              isMetronomeEnabled={isMetronomeEnabled}
              onToggleMetronome={() => {
                setIsMetronomeEnabled((prev) => {
                  const next = !prev;
                  metronome.setEnabled(next);
                  return next;
                });
              }}
              isVoiceCommandListening={isVoiceCommandListening}
              onToggleVoiceCommand={handleToggleVoiceCommand}
              lastVoiceCommand={lastVoiceCommand}
              gestureResult={gestureResult}
              onToggleVoice={() => {
                const next = !isVoiceEnabled;
                setIsVoiceEnabled(next);
                voiceCoach.setEnabled(next);
              }}
              onTogglePause={handleTogglePause}
              onReset={() => {
                resetInference();
                stepStartElapsedRef.current = elapsedSeconds;
                startInference();
              }}
              onFinish={handleStepComplete}
            />
          </div>
        )}

        {/* PHASE 5: REST INTERVAL */}
        {phase === 'rest' && (
          <RestTimer
            durationSec={currentStep.restSecAfter}
            nextStep={routine.steps[stepIndex + 1] || null}
            onComplete={handleRestFinished}
            onSkip={handleRestFinished}
          />
        )}

        {/* PHASE 6: SUMMARY */}
        {phase === 'summary' && circuitSummary && (
          <>
            <SessionSummary
              config={{
                id: routine.id,
                name: routine.name,
                type: 'counter',
                cameraOrientation: 'side',
                instructions: [],
                requiredLandmarks: [],
                minVisibility: 0.5,
              }}
              reps={circuitSummary.reps}
              cleanReps={circuitSummary.cleanReps}
              holdDurationSec={circuitSummary.holdSec}
              sessionDurationSec={elapsedSeconds}
              formScore={circuitSummary.formScore ?? undefined}
              symmetryScore={circuitSummary.symmetryScore ?? undefined}
              caloriesBurned={circuitSummary.kcal}
              faultsSummary={circuitSummary.faults}
              celebrate={unlockedAchievements.length > 0 || leveledUp}
              onRestart={() => {
                stepResultsRef.current = [];
                setCircuitSummary(null);
                setStepIndex(0);
                setElapsedSeconds(0);
                setPhase('overview');
              }}
            />

            {(unlockedAchievements.length > 0 || leveledUp) && (
              <AchievementToast
                achievements={unlockedAchievements}
                leveledUp={leveledUp}
                newLevel={newLevel}
                levelName={levelName}
                onClose={() => {
                  setUnlockedAchievements([]);
                  setLeveledUp(false);
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="text-center pt-6 text-xs text-text-3">
        SMART-FIT v2 &bull; Multi-Exercise Routine Engine
      </div>
    </div>
  );
}
