'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { notFound } from 'next/navigation';
import { createTracker, ExerciseTracker } from '@/trackers';
import { persistCalibration } from '@/trackers/calibration';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { CameraGuide } from '@/components/camera/CameraGuide';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { EnvironmentCheck } from '@/components/camera/EnvironmentCheck';
import { WorkoutHUD } from '@/components/workout/WorkoutHUD';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { CountdownOverlay } from '@/components/workout/CountdownOverlay';
import { SessionSummary } from '@/components/workout/SessionSummary';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { triggerHapticSuccess, triggerHapticFault, triggerHapticMilestone } from '@/lib/audio/haptics';
import { metronome } from '@/lib/audio/metronome';
import { voiceCommander, VoiceCommandEvent } from '@/lib/audio/voice-commands';
import { ReferencePoseVisualizer } from '@/components/camera/ReferencePoseVisualizer';
import { getExerciseProgression, DEFAULT_TARGETS } from '@/lib/progression/engine';
import { useEntitlement } from '@/lib/auth/use-premium';
import { recordWorkoutSessionCompletion } from '@/lib/gamification/streak';
import { AchievementToast } from '@/components/ui/AchievementToast';
import type { Achievement } from '@/lib/gamification/types';
import { estimateCalories, summarizeFaults, hasWork } from '@/lib/workout/session-metrics';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface WorkoutPageProps {
  params: Promise<{
    exercise: string;
  }>;
}

// Sound effect synthesizer sederhana via Web Audio API
function playBeep(freq: number = 600, duration: number = 0.15) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context permission restrictions
  }
}

export default function WorkoutSessionPage({ params }: WorkoutPageProps) {
  const resolvedParams = use(params);
  const exerciseId = resolvedParams.exercise;

  const [tracker] = useState<ExerciseTracker | null>(() => {
    try {
      return createTracker(exerciseId);
    } catch {
      return null;
    }
  });
  const [sessionPhase, setSessionPhase] = useState<'guide' | 'env-check' | 'countdown' | 'active' | 'summary'>('guide');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  // Metrik form quality & kalori
  const [formScore, setFormScore] = useState<number | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [cleanRepsCount, setCleanRepsCount] = useState(0);
  const [faultsSummary, setFaultsSummary] = useState<
    { name: string; count: number; description: string }[]
  >([]);

  // Adaptive Progression & Gamification State
  const [adaptiveTarget] = useState<number>(() => {
    try {
      return getExerciseProgression(exerciseId).suggestedTarget;
    } catch {
      return 15;
    }
  });
  // Target adaptif = analisis lanjutan (Premium); akun gratis memakai target standar.
  const { isPremium } = useEntitlement();
  const progressionTarget = isPremium ? adaptiveTarget : (DEFAULT_TARGETS[exerciseId] ?? 15);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [levelName, setLevelName] = useState('Pemula');

  // Ghost Skeleton & Metronom State
  const [showGhostSkeleton, setShowGhostSkeleton] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);

  // Status Asimetri & Voice Command
  const [averageSymmetryScore, setAverageSymmetryScore] = useState<number | null>(null);
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);

  const prevPhaseRef = useRef<string>('idle');
  const handleTogglePauseRef = useRef<() => void>(() => {});
  const handleFinishRef = useRef<() => void>(() => {});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRepCountRef = useRef(0);
  const lastFeedbackSpokenRef = useRef<string>('');

  useEffect(() => {
    if (!tracker) {
      notFound();
    }
  }, [tracker]);

  const {
    videoRef,
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    toggleFacingMode,
  } = useCamera();

  const {
    modelError,
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
  } = usePoseDetection(videoRef, canvasRef, tracker, {
    showGhostSkeleton,
    exerciseId: tracker?.config.id,
    enableGestures: sessionPhase === 'active',
    onGestureAction: (action) => {
      if (action === 'toggle_pause') {
        handleTogglePauseRef.current();
      } else if (action === 'finish_workout') {
        handleFinishRef.current();
      }
    },
  });

  // Stopwatch timer untuk durasi latihan
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionPhase === 'active' && isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionPhase, isRunning]);

  // Voice coach + Sound effect & Haptics saat repetisi bertambah
  useEffect(() => {
    const currentReps = trackingResult?.repCount ?? 0;
    if (currentReps > prevRepCountRef.current) {
      playBeep(880, 0.15); // Nada tinggi ceria
      triggerHapticSuccess();

      if (currentReps % 5 === 0 || currentReps === progressionTarget) {
        triggerHapticMilestone();
      }

      if (isVoiceEnabled) {
        voiceCoach.speakRep(currentReps);

        // Anti-rushing: peringatan jika repetisi dilakukan terburu-buru
        if (isPremium && tempoState?.lastRepTempo?.isRushed) {
          setTimeout(() => {
            voiceCoach.speakCorrection('Kendalikan tempo, turun lebih perlahan!');
          }, 650);
        }
      }
    }
    prevRepCountRef.current = currentReps;
  }, [trackingResult?.repCount, isVoiceEnabled, progressionTarget, tempoState?.lastRepTempo?.isRushed, isPremium]);

  // Haptic feedback & Voice coach koreksi form otomatis
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
    if (!isMetronomeEnabled || !isRunning || sessionPhase !== 'active') return;
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
  }, [tempoState?.currentPhase, isMetronomeEnabled, isRunning, sessionPhase]);

  // Handler: User selesai membaca panduan kamera -> Masuk Pemeriksaan Lingkungan (Env Check)
  const handleGuideReady = async () => {
    if (!tracker) return;
    const initialMode = tracker.config.cameraOrientation === 'front' ? 'user' : 'user';
    await startCamera(initialMode);
    setSessionPhase('env-check');
    startInference();
  };

  // Handler: Pemeriksaan lingkungan selesai/dilewati -> Masuk Countdown
  const handleEnvCheckPassed = () => {
    pauseInference();
    setSessionPhase('countdown');
  };

  // Handler: Countdown 3-2-1 selesai -> Mulai inferensi aktif
  const handleCountdownComplete = () => {
    resetInference();
    setSessionPhase('active');
    startInference();
  };

  // Handler: Toggle Voice Coach
  const handleToggleVoice = () => {
    const nextVal = !isVoiceEnabled;
    setIsVoiceEnabled(nextVal);
    voiceCoach.setEnabled(nextVal);
  };

  // Handler: Pause / Resume
  const handleTogglePause = () => {
    if (isRunning) {
      pauseInference();
      triggerHapticFault();
      if (isVoiceEnabled) {
        voiceCoach.speakCorrection('Latihan dijeda');
      }
    } else {
      startInference();
      triggerHapticSuccess();
      if (isVoiceEnabled) {
        voiceCoach.speakCorrection('Lanjut latihan');
      }
    }
  };

  // Handler: Toggle Perintah Suara Dua Arah (Voice Commands)
  // Callback didaftarkan sekali saat toggle; lewat ref agar selalu membaca state terbaru
  // (sebelumnya "jeda"/"lanjut" memakai isRunning basi dari saat mikrofon dinyalakan).
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
      if (sessionPhase === 'active') handleFinish();
    } else if (evt.action === 'reset') {
      if (sessionPhase === 'active') handleReset();
    } else if (evt.action === 'start') {
      if (sessionPhase === 'guide') {
        handleGuideReady();
      } else if (sessionPhase === 'env-check') {
        handleEnvCheckPassed();
      }
    }
  };
  const voiceCommandRef = useRef(handleVoiceCommand);

  useEffect(() => {
    return () => {
      voiceCommander.stopListening();
    };
  }, []);

  // Handler: Reset Sesi
  const handleReset = () => {
    resetInference();
    setElapsedSeconds(0);
    prevRepCountRef.current = 0;
    startInference();
  };

  // Handler: Selesai Sesi Latihan
  const handleFinish = async () => {
    if (!tracker) return;
    pauseInference();
    stopCamera();
    triggerHapticMilestone();

    // Hitung rata-rata skor simetri bilateral sesi ini
    const symScore = getAverageSymmetryScore();
    setAverageSymmetryScore(symScore);

    const isCounter = tracker.config.type === 'counter';
    const reps = isCounter ? trackingResult?.repCount ?? 0 : 0;
    const holdSec = !isCounter ? trackingResult?.holdDuration ?? 0 : 0;

    const cleanReps = tracker.getCleanRepCount();
    setCleanRepsCount(cleanReps);

    // Kalibrasi otomatis: ROM rep penuh sesi ini menjadi ambang personal sesi berikutnya.
    persistCalibration(tracker);

    const summarizedFaults = summarizeFaults(tracker.getFaults());
    setFaultsSummary(summarizedFaults);

    // Form score dari tracker: rep bersih / rep total (plank: waktu tahan bersih / waktu terlacak).
    // Null bila belum ada rep, tampil "—" (bukan angka karangan / lantai buatan).
    const calculatedFormScore = trackingResult?.formScore ?? null;

    // Kalori berbasis MET gerakan × waktu aktif (bukan rumus flat yang sama untuk semua gerakan).
    const calculatedCalories = Math.round(estimateCalories(tracker.config.id, elapsedSeconds));

    setCaloriesBurned(calculatedCalories);
    setFormScore(calculatedFormScore);
    setSessionPhase('summary');

    const sessionId = `local-${Date.now()}`;
    const sessionPayload = {
      id: sessionId,
      exercise: tracker.config.id,
      exerciseName: tracker.config.name,
      reps: isCounter ? reps : null,
      cleanReps: isCounter ? cleanReps : null,
      holdDurationSec: !isCounter ? holdSec : null,
      sessionDurationSec: elapsedSeconds,
      caloriesBurned: calculatedCalories,
      formScore: calculatedFormScore ?? undefined,
      symmetryScore: symScore ?? undefined,
      faultsSummary: summarizedFaults,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
    };

    // 1. Simpan ke LocalStorage agar halaman /history langsung tampil instan
    try {
      const existingStr = localStorage.getItem('smartfit_workout_history');
      const history = existingStr ? JSON.parse(existingStr) : [];
      history.unshift(sessionPayload);
      localStorage.setItem('smartfit_workout_history', JSON.stringify(history.slice(0, 50)));
    } catch (err) {
      console.warn('Gagal menyimpan sesi ke localStorage (kuota penyimpanan penuh):', err);
    }

    // 2. Perbarui status Gamifikasi (Streak, XP, Level, & Pencapaian).
    //    Sesi tanpa rep / waktu tahan tidak memberi streak atau XP (mencegah "farming" sesi kosong).
    if (hasWork(reps, holdSec)) try {
      const gamificationResult = recordWorkoutSessionCompletion({
        exercise: tracker.config.id,
        reps: isCounter ? reps : null,
        holdDurationSec: !isCounter ? holdSec : null,
        sessionDurationSec: elapsedSeconds,
        formScore: calculatedFormScore,
      });

      if (gamificationResult.newlyUnlocked.length > 0) {
        setUnlockedAchievements(gamificationResult.newlyUnlocked);
      }
      if (gamificationResult.leveledUp) {
        setLeveledUp(true);
        setNewLevel(gamificationResult.newLevel);
        setLevelName(gamificationResult.state.levelName);
      }
    } catch (err) {
      console.warn('Gagal memperbarui status gamifikasi:', err);
    }

    // 3. Kirim data ringkasan sesi ke backend /api/sessions.
    //    Nama field mengikuti sessionPayloadSchema (calories/faults/clientSessionId); sebelumnya
    //    caloriesBurned & faultsSummary dibuang diam-diam oleh validasi zod.
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSessionId: sessionId,
          exercise: sessionPayload.exercise,
          reps: sessionPayload.reps,
          cleanReps: sessionPayload.cleanReps,
          holdDurationSec: sessionPayload.holdDurationSec,
          sessionDurationSec: sessionPayload.sessionDurationSec,
          formScore: calculatedFormScore,
          symmetryScore: symScore,
          calories: calculatedCalories,
          faults: summarizedFaults.slice(0, 20),
          startedAt: sessionPayload.startedAt,
        }),
      });
      if (!res.ok) {
        console.warn('API /api/sessions mengembalikan status non-OK:', res.status);
      }
    } catch (err) {
      console.info('Tidak dapat mengirim sesi ke backend (koneksi offline/lokal aktif):', err);
    }
  };

  // Sinkronisasi handler refs untuk callback gestur hands-free
  useEffect(() => {
    handleTogglePauseRef.current = handleTogglePause;
    handleFinishRef.current = handleFinish;
    voiceCommandRef.current = handleVoiceCommand;
  });

  // Handler: Mulai Ulang setelah Selesai
  const handleRestart = () => {
    setElapsedSeconds(0);
    prevRepCountRef.current = 0;
    handleGuideReady();
  };

  if (!tracker) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-text-2">
        Memuat tracker latihan...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-[1fr_auto_1fr] items-center mb-6">
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
            Latihan
          </span>
          <h1 className="font-display text-lg font-bold text-text">{tracker.config.name}</h1>
        </div>

      </div>

      {/* Main Content Area Berdasarkan Phase */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        {/* FASE 1: Panduan Kamera & Pose Ideal */}
        {sessionPhase === 'guide' && (
          <CameraGuide config={tracker.config} onReady={handleGuideReady} />
        )}

        {/* FASE 2: Pemeriksaan Lingkungan & Kesiapan AI (Env Check) */}
        {sessionPhase === 'env-check' && (
          <div className="w-full space-y-6 animate-enter">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
              error={cameraError || modelError}
            />

            <EnvironmentCheck
              config={tracker.config}
              videoRef={videoRef}
              trackingResult={trackingResult}
              onPassed={handleEnvCheckPassed}
              onSkip={handleEnvCheckPassed}
            />
          </div>
        )}

        {/* FASE 3: Countdown Buffer Sebelum Latihan Dimulai */}
        {sessionPhase === 'countdown' && (
          <div className="relative min-h-72">
            <CountdownOverlay seconds={5} onComplete={handleCountdownComplete} />
          </div>
        )}

        {/* FASE 4: Active Workout Flow */}
        {sessionPhase === 'active' && (
          <div className="w-full space-y-6 animate-enter">
            {/* Video + Skeleton Overlay */}
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
              error={cameraError || modelError}
            />

            {/* HUD Metrik, Voice Coach, dan Kontrol */}
            <WorkoutHUD
              config={tracker.config}
              trackingResult={trackingResult}
              isRunning={isRunning}
              elapsedSeconds={elapsedSeconds}
              isVoiceEnabled={isVoiceEnabled}
              targetValue={progressionTarget}
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
              onToggleVoice={handleToggleVoice}
              onTogglePause={handleTogglePause}
              onReset={handleReset}
              onFinish={handleFinish}
              onOpenReference={() => {
                pauseInference();
                setShowReferenceModal(true);
              }}
            />
          </div>
        )}

        {/* Modal Pop-up Contoh Form Ideal saat Latihan Berjalan */}
        <Dialog
          open={showReferenceModal}
          onClose={() => {
            setShowReferenceModal(false);
            startInference();
          }}
          title="Contoh form"
          description="Ikuti gerakan ini. Latihan lanjut setelah dialog ditutup."
        >
          {/* <dialog> native tetap me-mount isi saat tertutup; unmount agar scene 3D tidak hidup saat inferensi lanjut */}
          {showReferenceModal && <ReferencePoseVisualizer exerciseId={tracker.config.id} autoPlayDefault={true} />}
          <Button
            className="mt-5 w-full"
            onClick={() => {
              setShowReferenceModal(false);
              startInference();
            }}
          >
            Tutup dan lanjutkan latihan
          </Button>
        </Dialog>

        {/* FASE 5: Ringkasan Selesai */}
        {sessionPhase === 'summary' && (
          <>
            <SessionSummary
              config={tracker.config}
              reps={trackingResult?.repCount ?? 0}
              cleanReps={cleanRepsCount}
              holdDurationSec={trackingResult?.holdDuration ?? 0}
              sessionDurationSec={elapsedSeconds}
              formScore={formScore ?? undefined}
              symmetryScore={averageSymmetryScore ?? undefined}
              tempoRatio={tempoState?.averageTempo?.tempoFormat}
              avgTutSec={tempoState?.averageTempo?.totalTUTSec}
              caloriesBurned={caloriesBurned}
              faultsSummary={faultsSummary}
              celebrate={unlockedAchievements.length > 0 || leveledUp}
              onRestart={handleRestart}
            />

            {/* Toast Notifikasi Pencapaian & Naik Level */}
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

    </div>
  );
}
