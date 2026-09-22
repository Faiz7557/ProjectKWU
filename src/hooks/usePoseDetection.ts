'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { NormalizedLandmark, TrackingResult, ExerciseTracker, BilateralSymmetry } from '@/trackers/types';
import { LandmarkSmoother } from '@/trackers/base-tracker';
import { getPoseDetector, releasePoseDetector } from '@/lib/mediapipe/pose-detector';
import { drawSkeleton, drawGhostSkeleton, drawGestureIndicator } from '@/lib/mediapipe/drawing-utils';
import { REFERENCE_POSES } from '@/lib/mediapipe/reference-poses';
import { HandsFreeGestureDetector, GestureDetectionResult, GestureAction } from '@/lib/gestures/detector';
import { TempoTracker, TempoState } from '@/lib/tempo/tempo-tracker';
import { analyzeBilateralSymmetry, AsymmetryAccumulator } from '@/lib/biomechanics/asymmetry';

export interface UsePoseDetectionOptions {
  showSkeleton?: boolean;
  showAngles?: boolean;
  showGhostSkeleton?: boolean;
  exerciseId?: string;
  enableGestures?: boolean;
  onGestureAction?: (action: GestureAction) => void;
}

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  tracker: ExerciseTracker | null,
  options: UsePoseDetectionOptions = {}
) {
  const {
    showSkeleton = true,
    showAngles = true,
    showGhostSkeleton = false,
    exerciseId,
    enableGestures = true,
    onGestureAction,
  } = options;

  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Status Real-Time Tempo, Gestur & Simetri Bilateral
  const [tempoState, setTempoState] = useState<TempoState | null>(null);
  const [gestureResult, setGestureResult] = useState<GestureDetectionResult | null>(null);
  const [symmetryState, setSymmetryState] = useState<BilateralSymmetry | null>(null);

  const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(33, 1.0, 0.007));
  const gestureDetectorRef = useRef<HandsFreeGestureDetector>(new HandsFreeGestureDetector());
  const tempoTrackerRef = useRef<TempoTracker>(new TempoTracker());
  const asymmetryAccumulatorRef = useRef<AsymmetryAccumulator>(new AsymmetryAccumulator());

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const frameSkipRef = useRef<number>(0);
  const lastSmoothedLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const processFrameRef = useRef<() => void>(() => {});

  // Inisialisasi model MediaPipe sekali saat hook dimuat
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;
    getPoseDetector()
      .then(() => {
        if (!isCancelled && isMountedRef.current) setIsModelReady(true);
      })
      .catch((err) => {
        if (!isCancelled && isMountedRef.current) {
          console.error('Pose detector load error:', err);
          setModelError('Gagal memuat model deteksi MediaPipe di browser.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const processFrame = useCallback(async () => {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !video.paused &&
      !video.ended
    ) {
      const currentTime = video.currentTime;
      if (currentTime !== lastTimeRef.current) {
        lastTimeRef.current = currentTime;

        // Adaptive frame throttling jika performa gawai rendah (< 22 FPS)
        frameSkipRef.current++;
        const shouldSkipInference = fps > 0 && fps < 22 && frameSkipRef.current % 2 !== 0;

        try {
          const now = performance.now();
          let smoothed: NormalizedLandmark[] | null = null;

          if (!shouldSkipInference) {
            const detector = await getPoseDetector();
            const result = detector.detectForVideo(video, now);

            if (result.landmarks && result.landmarks.length > 0) {
              const rawLandmarks = result.landmarks[0] as NormalizedLandmark[];
              smoothed = smootherRef.current.smooth(rawLandmarks, now / 1000);
              lastSmoothedLandmarksRef.current = smoothed;
            } else {
              lastSmoothedLandmarksRef.current = null;
            }
          } else {
            // Gunakan landmark terakhir yang sudah di-smooth pada frame yang di-skip
            smoothed = lastSmoothedLandmarksRef.current;
          }

          if (smoothed && smoothed.length >= 33) {
            // 1. Jalankan Hands-Free Gesture Detector
            if (enableGestures) {
              const gRes = gestureDetectorRef.current.processLandmarks(smoothed, now);
              if (isMountedRef.current) {
                setGestureResult(gRes);
              }

              if (gRes.triggeredAction !== 'none' && onGestureAction) {
                onGestureAction(gRes.triggeredAction);
              }
            }

            // 2. Jalankan logika hitung repetisi gerakan
            if (tracker) {
              const res = tracker.processLandmarks(smoothed, now);
              if (isMountedRef.current) {
                setTrackingResult(res);
              }

              // 3. Jalankan Tempo & TUT Tracker
              const tState = tempoTrackerRef.current.update(res.state, res.repCount, now);
              if (isMountedRef.current) {
                setTempoState(tState);
              }

              // 3b. Jalankan Analisis Asimetri Bilateral (Kiri vs Kanan)
              const sym = analyzeBilateralSymmetry(smoothed, exerciseId);
              if (isMountedRef.current) {
                setSymmetryState(sym);
              }
              if (sym) {
                asymmetryAccumulatorRef.current.addSample(sym);
              }

              // 4. Render overlay Canvas (User skeleton + Ghost skeleton + Gesture meter)
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                  }

                  ctx.clearRect(0, 0, canvas.width, canvas.height);

                  // 4a. Render Bayangan Form Ideal (Ghost Skeleton) jika aktif
                  if (showGhostSkeleton && exerciseId) {
                    const refPose = REFERENCE_POSES[exerciseId];
                    if (refPose && refPose.phases.length >= 2) {
                      drawGhostSkeleton(
                        ctx,
                        refPose.phases[0].landmarks,
                        refPose.phases[1].landmarks,
                        now,
                        canvas.width,
                        canvas.height,
                        smoothed
                      );
                    } else if (refPose && refPose.phases.length === 1) {
                      // Dukungan latihan isometrik (misal: plank)
                      drawGhostSkeleton(
                        ctx,
                        refPose.phases[0].landmarks,
                        refPose.phases[0].landmarks,
                        now,
                        canvas.width,
                        canvas.height,
                        smoothed
                      );
                    }
                  }

                  // 4b. Render User Skeleton
                  if (showSkeleton) {
                    drawSkeleton(ctx, smoothed, canvas.width, canvas.height, {
                      angles: res.angles,
                      showAngles,
                      hasFault: res.hasFault,
                    });
                  }

                  // 4c. Render Indikator Progres Gestur
                  if (
                    enableGestures &&
                    gestureDetectorRef.current &&
                    gestureResult?.activeGesture !== 'none' &&
                    gestureResult?.targetPoint
                  ) {
                    drawGestureIndicator(
                      ctx,
                      gestureResult.targetPoint,
                      gestureResult.progress,
                      gestureResult.label || 'Gestur',
                      canvas.width,
                      canvas.height
                    );
                  }
                }
              }
            }
          } else {
            // Landmark tidak terdeteksi
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
          }

          // Hitung real-time FPS
          frameCountRef.current++;
          if (lastFpsTimeRef.current === 0) {
            lastFpsTimeRef.current = now;
          } else if (now - lastFpsTimeRef.current >= 1000) {
            if (isMountedRef.current) {
              setFps(frameCountRef.current);
            }
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }
        } catch (e) {
          console.warn('Frame processing exception:', e);
        }
      }
    }

    if (isRunningRef.current && isMountedRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        processFrameRef.current();
      });
    }
  }, [
    videoRef,
    canvasRef,
    tracker,
    showSkeleton,
    showAngles,
    showGhostSkeleton,
    exerciseId,
    enableGestures,
    gestureResult,
    fps,
    onGestureAction,
  ]);

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    if (isMountedRef.current) {
      setIsRunning(true);
    }
    smootherRef.current.reset();
    gestureDetectorRef.current.reset();
    rafIdRef.current = requestAnimationFrame(() => {
      processFrameRef.current();
    });
  }, []);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    if (isMountedRef.current) {
      setIsRunning(false);
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef]);

  const reset = useCallback(() => {
    pause();
    tracker?.reset();
    smootherRef.current.reset();
    gestureDetectorRef.current.reset();
    tempoTrackerRef.current.reset();
    asymmetryAccumulatorRef.current.reset();
    if (isMountedRef.current) {
      setTrackingResult(null);
      setTempoState(null);
      setGestureResult(null);
      setSymmetryState(null);
    }
  }, [pause, tracker]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      releasePoseDetector();
    };
  }, []);

  const getAverageSymmetryScore = useCallback(() => {
    return asymmetryAccumulatorRef.current.getAverageScore();
  }, []);

  return {
    isModelReady,
    modelError,
    isRunning,
    trackingResult,
    tempoState,
    gestureResult,
    symmetryState,
    getAverageSymmetryScore,
    fps,
    start,
    pause,
    reset,
  };
}
