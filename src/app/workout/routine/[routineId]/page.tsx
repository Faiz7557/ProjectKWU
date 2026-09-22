'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { getRoutineById, WorkoutRoutine, RoutineStep } from '@/lib/routines/presets';
import { createTracker, ExerciseTracker } from '@/trackers';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
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

interface RoutinePageProps {
  params: Promise<{
    routineId: string;
  }>;
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

  // Status Asimetri & Voice Command
  const [averageSymmetryScore, setAverageSymmetryScore] = useState(96);
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);

  const prevPhaseRef = useRef<string>('idle');
  const handleTogglePauseRef = useRef<() => void>(() => {});
  const handleStepCompleteRef = useRef<() => void>(() => {});

  // Kumulatif metrik seluruh sirkuit
  const [totalReps, setTotalReps] = useState(0);
  const [totalCleanReps, setTotalCleanReps] = useState(0);
  const [circuitFaults, setCircuitFaults] = useState<FaultSummaryItem[]>([]);
  const [circuitCalories, setCircuitCalories] = useState(0);
  const [circuitFormScore, setCircuitFormScore] = useState(95);

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

  // Stopwatch total durasi circuit
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if ((phase === 'exercise' || phase === 'rest') && isRunning) {
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

  // Handler: Toggle Perintah Suara Dua Arah (Voice Commands)
  const handleToggleVoiceCommand = () => {
    const next = voiceCommander.toggleListening((evt: VoiceCommandEvent) => {
      setLastVoiceCommand(evt.phrase);
      triggerHapticSuccess();
      setTimeout(() => setLastVoiceCommand(null), 3500);

      if (evt.action === 'pause') {
        if (isRunning) handleTogglePause();
      } else if (evt.action === 'resume') {
        if (!isRunning) handleTogglePause();
      } else if (evt.action === 'finish') {
        handleStepComplete();
      } else if (evt.action === 'start') {
        if (phase === 'overview') {
          handleStartRoutine();
        } else if (phase === 'env-check') {
          handleEnvCheckPassed();
        }
      }
    });
    setIsVoiceCommandListening(next);
  };

  useEffect(() => {
    return () => {
      voiceCommander.stopListening();
    };
  }, []);

  // Handler: Langkah selesai (Next Step atau Rest)
  const handleStepComplete = () => {
    if (!routine || !currentStep) return;
    pauseInference();
    triggerHapticMilestone();

    // Kumpulkan metrik dari tracker langkah ini
    if (currentTracker) {
      const stepReps = currentTracker.config.type === 'counter' ? trackingResult?.repCount ?? 0 : 0;
      const clean = currentTracker.getCleanRepCount();
      setTotalReps((prev) => prev + stepReps);
      setTotalCleanReps((prev) => prev + clean);

      const stepFaults = currentTracker.getFaults();
      for (const f of stepFaults) {
        setCircuitFaults((prev) => {
          const idx = prev.findIndex((item) => item.name === f.name);
          if (idx >= 0) {
            prev[idx].count++;
            return [...prev];
          }
          return [...prev, { name: f.name, count: 1, description: f.description }];
        });
      }
    }

    const isLastStep = stepIndex >= routine.steps.length - 1;
    const hasRest = currentStep.restSecAfter > 0;

    if (!isLastStep && hasRest) {
      setPhase('rest');
    } else if (!isLastStep) {
      // Langsung gerakan berikutnya tanpa istirahat
      setStepIndex((prev) => prev + 1);
      setPhase('countdown');
    } else {
      // Seluruh sirkuit tuntas!
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

    const cal = Math.max(15, Math.round(elapsedSeconds * 0.16 + totalReps * 0.4));
    setCircuitCalories(cal);

    const score = Math.max(65, Math.round(100 - circuitFaults.length * 3));
    setCircuitFormScore(score);

    const symScore = getAverageSymmetryScore();
    setAverageSymmetryScore(symScore);

    setPhase('summary');

    const sessionPayload = {
      id: `circuit-${Date.now()}`,
      exercise: routine.id,
      exerciseName: routine.name,
      reps: totalReps,
      cleanReps: totalCleanReps,
      holdDurationSec: null,
      sessionDurationSec: elapsedSeconds,
      caloriesBurned: cal,
      formScore: score,
      symmetryScore: symScore,
      faultsSummary: circuitFaults,
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

    try {
      const gamification = recordWorkoutSessionCompletion({
        exercise: routine.id,
        reps: totalReps,
        holdDurationSec: null,
        sessionDurationSec: elapsedSeconds,
        formScore: score,
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

  // Sinkronisasi callback ref untuk gestur hands-free
  useEffect(() => {
    handleTogglePauseRef.current = handleTogglePause;
    handleStepCompleteRef.current = handleStepComplete;
  });

  if (!routine) {
    if (!isLoaded) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Memuat program sirkuit...
        </div>
      );
    }
    notFound();
  }

  if (!currentStep) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Gerakan sirkuit tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/workout"
          onClick={() => stopCamera()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        <div className="text-center">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
            Program Sirkuit
          </span>
          <h1 className="text-base font-bold text-slate-200">{routine.name}</h1>
        </div>

        <div className="w-16" />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full space-y-4">
        {/* PHASE 1: OVERVIEW ROUTINE */}
        {phase === 'overview' && (
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-left animate-fade-in">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">
                {routine.level} &bull; ~{routine.estimatedMinutes} Menit
              </span>
              <h2 className="text-2xl font-black text-slate-100">{routine.name}</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{routine.description}</p>
            </div>

            {/* List Steps */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Urutan Sirkuit ({routine.steps.length} Gerakan)
              </span>
              <div className="space-y-2">
                {routine.steps.map((st: RoutineStep, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                        {i + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">
                          {st.exerciseName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {st.targetReps ? `${st.targetReps} repetisi` : `${st.targetDurationSec} detik`}
                        </span>
                      </div>
                    </div>
                    {st.restSecAfter > 0 && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        Istirahat {st.restSecAfter}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartRoutine}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 font-bold text-sm text-white shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Mulai Sirkuit Sekarang</span>
            </button>
          </div>
        )}

        {/* PHASE 2: ENV CHECK */}
        {phase === 'env-check' && currentTracker && (
          <div className="w-full space-y-4">
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
          <CountdownOverlay seconds={5} onComplete={handleCountdownComplete} />
        )}

        {/* PHASE 4: ACTIVE EXERCISE */}
        {phase === 'exercise' && currentTracker && (
          <div className="w-full space-y-4">
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
              onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
              onTogglePause={handleTogglePause}
              onReset={() => {
                resetInference();
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
        {phase === 'summary' && (
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
              reps={totalReps}
              cleanReps={totalCleanReps}
              holdDurationSec={0}
              sessionDurationSec={elapsedSeconds}
              formScore={circuitFormScore}
              symmetryScore={averageSymmetryScore}
              tempoRatio={tempoState?.lastRepTempo?.tempoFormat}
              avgTutSec={tempoState?.lastRepTempo?.totalTUTSec}
              caloriesBurned={circuitCalories}
              faultsSummary={circuitFaults}
              onRestart={() => {
                setStepIndex(0);
                setTotalReps(0);
                setTotalCleanReps(0);
                setCircuitFaults([]);
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

      <div className="text-center pt-6 text-xs text-slate-600">
        SMART-FIT v2 &bull; Multi-Exercise Routine Engine
      </div>
    </div>
  );
}
