'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { notFound } from 'next/navigation';
import { createTracker, ExerciseTracker } from '@/trackers';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { CameraGuide } from '@/components/camera/CameraGuide';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { EnvironmentCheck } from '@/components/camera/EnvironmentCheck';
import { WorkoutHUD } from '@/components/workout/WorkoutHUD';
import { CountdownOverlay } from '@/components/workout/CountdownOverlay';
import { SessionSummary } from '@/components/workout/SessionSummary';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { triggerHapticSuccess, triggerHapticFault, triggerHapticMilestone } from '@/lib/audio/haptics';
import { metronome } from '@/lib/audio/metronome';
import { voiceCommander, VoiceCommandEvent } from '@/lib/audio/voice-commands';
import { ReferencePoseVisualizer } from '@/components/camera/ReferencePoseVisualizer';
import { getExerciseProgression } from '@/lib/progression/engine';
import { recordWorkoutSessionCompletion } from '@/lib/gamification/streak';
import { AchievementToast } from '@/components/ui/AchievementToast';
import type { Achievement } from '@/lib/gamification/types';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, X } from 'lucide-react';

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
  const [formScore, setFormScore] = useState(94);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [cleanRepsCount, setCleanRepsCount] = useState(0);
  const [faultsSummary, setFaultsSummary] = useState<
    { name: string; count: number; description: string }[]
  >([]);

  // Adaptive Progression & Gamification State
  const [progressionTarget] = useState<number>(() => {
    try {
      return getExerciseProgression(exerciseId).suggestedTarget;
    } catch {
      return 15;
    }
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [levelName, setLevelName] = useState('Pemula');

  // Ghost Skeleton & Metronom State
  const [showGhostSkeleton, setShowGhostSkeleton] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);

  // Status Asimetri & Voice Command
  const [averageSymmetryScore, setAverageSymmetryScore] = useState(96);
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
        if (tempoState?.lastRepTempo?.isRushed) {
          setTimeout(() => {
            voiceCoach.speakCorrection('Kendalikan tempo, turun lebih perlahan!');
          }, 650);
        }
      }
    }
    prevRepCountRef.current = currentReps;
  }, [trackingResult?.repCount, isVoiceEnabled, progressionTarget, tempoState?.lastRepTempo?.isRushed]);

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
        handleFinish();
      } else if (evt.action === 'reset') {
        handleReset();
      } else if (evt.action === 'start') {
        if (sessionPhase === 'guide') {
          handleGuideReady();
        } else if (sessionPhase === 'env-check') {
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

    // Hitung estimasi kalori dan form score
    const reps = tracker.config.type === 'counter' ? trackingResult?.repCount ?? 0 : 0;
    const holdSec = tracker.config.type === 'timer' ? trackingResult?.holdDuration ?? 0 : 0;

    const recordedFaults = tracker.getFaults();
    const cleanReps = tracker.getCleanRepCount();
    setCleanRepsCount(cleanReps);

    // Hitung frekuensi tiap jenis kesalahan
    const faultCounts = new Map<string, { name: string; count: number; description: string }>();
    for (const f of recordedFaults) {
      const existing = faultCounts.get(f.name);
      if (existing) {
        existing.count++;
      } else {
        faultCounts.set(f.name, {
          name: f.name,
          count: 1,
          description: f.description,
        });
      }
    }
    const summarizedFaults = Array.from(faultCounts.values());
    setFaultsSummary(summarizedFaults);

    // Form Score dihitung realistis:
    // Base 100%, kurangi 4% per kesalahan yang terdeteksi, batas minimum 60%
    const totalFaultsCount = recordedFaults.length;
    const calculatedFormScore = Math.max(
      60,
      Math.min(100, Math.round(100 - totalFaultsCount * 4))
    );

    // Rumus MET: Rata-rata 0.12 - 0.15 kcal per detik latihan
    const calculatedCalories = Math.max(1, Math.round(elapsedSeconds * 0.14 + reps * 0.35));

    setCaloriesBurned(calculatedCalories);
    setFormScore(calculatedFormScore);
    setSessionPhase('summary');

    const sessionPayload = {
      id: `local-${Date.now()}`,
      exercise: tracker.config.id,
      exerciseName: tracker.config.name,
      reps: tracker.config.type === 'counter' ? reps : null,
      cleanReps: tracker.config.type === 'counter' ? cleanReps : null,
      holdDurationSec: tracker.config.type === 'timer' ? holdSec : null,
      sessionDurationSec: elapsedSeconds,
      caloriesBurned: calculatedCalories,
      formScore: calculatedFormScore,
      symmetryScore: symScore,
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

    // 2. Perbarui status Gamifikasi (Streak, XP, Level, & Pencapaian)
    try {
      const gamificationResult = recordWorkoutSessionCompletion({
        exercise: tracker.config.id,
        reps: tracker.config.type === 'counter' ? reps : null,
        holdDurationSec: tracker.config.type === 'timer' ? holdSec : null,
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

    // 3. Kirim data ringkasan sesi ke backend /api/sessions
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload),
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
  });

  // Handler: Mulai Ulang setelah Selesai
  const handleRestart = () => {
    setElapsedSeconds(0);
    prevRepCountRef.current = 0;
    handleGuideReady();
  };

  if (!tracker) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Memuat tracker latihan...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-6">
        <Link
          href="/workout"
          onClick={() => stopCamera()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        <div className="text-center">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
            Latihan
          </span>
          <h1 className="text-lg font-bold text-slate-200">{tracker.config.name}</h1>
        </div>

        <div className="w-16" /> {/* Spacer untuk balance centering */}
      </div>

      {/* Main Content Area Berdasarkan Phase */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        {/* FASE 1: Panduan Kamera & Pose Ideal */}
        {sessionPhase === 'guide' && (
          <CameraGuide config={tracker.config} onReady={handleGuideReady} />
        )}

        {/* FASE 2: Pemeriksaan Lingkungan & Kesiapan AI (Env Check) */}
        {sessionPhase === 'env-check' && (
          <div className="w-full space-y-6">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
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
          <CountdownOverlay seconds={5} onComplete={handleCountdownComplete} />
        )}

        {/* FASE 4: Active Workout Flow */}
        {sessionPhase === 'active' && (
          <div className="w-full space-y-6">
            {/* Error handling jika kamera ditolak / model gagal */}
            {(cameraError || modelError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-300 max-w-2xl mx-auto">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{cameraError || modelError}</span>
              </div>
            )}

            {/* Video + Skeleton Overlay */}
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              fps={fps}
              isTracking={trackingResult?.isTracking ?? false}
              onToggleFacingMode={toggleFacingMode}
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
        {showReferenceModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-lg relative space-y-3">
              <button
                onClick={() => {
                  setShowReferenceModal(false);
                  startInference();
                }}
                className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-xl border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>

              <ReferencePoseVisualizer exerciseId={tracker.config.id} autoPlayDefault={true} />

              <button
                onClick={() => {
                  setShowReferenceModal(false);
                  startInference();
                }}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white shadow-lg shadow-blue-500/25 transition-all"
              >
                Tutup & Lanjutkan Latihan
              </button>
            </div>
          </div>
        )}

        {/* FASE 5: Ringkasan Selesai */}
        {sessionPhase === 'summary' && (
          <>
            <SessionSummary
              config={tracker.config}
              reps={trackingResult?.repCount ?? 0}
              cleanReps={cleanRepsCount}
              holdDurationSec={trackingResult?.holdDuration ?? 0}
              sessionDurationSec={elapsedSeconds}
              formScore={formScore}
              symmetryScore={averageSymmetryScore}
              tempoRatio={tempoState?.lastRepTempo?.tempoFormat}
              avgTutSec={tempoState?.lastRepTempo?.totalTUTSec}
              caloriesBurned={caloriesBurned}
              faultsSummary={faultsSummary}
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

      {/* Footer Info */}
      <div className="text-center pt-8 text-xs text-slate-600">
        SMART-FIT v2 &bull; Client-Side BlazePose &bull; Zero Server Video
      </div>
    </div>
  );
}
