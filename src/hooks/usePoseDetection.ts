'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { NormalizedLandmark, TrackingResult, ExerciseTracker, BilateralSymmetry } from '@/trackers/types';
import { LandmarkSmoother } from '@/trackers/base-tracker';
import {
  getPoseDetector,
  getLoadedPoseDetector,
  releasePoseDetector,
  WEBGL_UNAVAILABLE_MESSAGE,
} from '@/lib/mediapipe/pose-detector';
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

/**
 * Interval minimum publish hasil per-frame ke React. Tracking tetap berjalan tiap frame video;
 * hanya re-render halaman yang dibatasi (sebelumnya 3-4 setState per frame = render ulang
 * seluruh halaman workout 30x/detik, membuat FPS turun di HP dan memicu frame skip).
 * Perubahan penting (rep, fase, feedback, fault, status lacak, gestur) tetap dipublish seketika.
 */
const PUBLISH_INTERVAL_MS = 100;

/** Di bawah FPS ini inferensi dilewati selang-seling agar perangkat lemah tetap responsif. */
const LOW_FPS = 22;

function resultKey(r: TrackingResult): string {
  return `${r.repCount}|${r.phase}|${r.state}|${r.feedback}|${r.isTracking}|${r.activeFault?.id ?? ''}`;
}

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  tracker: ExerciseTracker | null,
  options: UsePoseDetectionOptions = {}
) {
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Status Real-Time Tempo, Gestur & Simetri Bilateral
  const [tempoState, setTempoState] = useState<TempoState | null>(null);
  const [gestureResult, setGestureResult] = useState<GestureDetectionResult | null>(null);
  const [symmetryState, setSymmetryState] = useState<BilateralSymmetry | null>(null);

  // Parameter default LandmarkSmoother sudah disetel untuk koordinat ternormalisasi (lihat base-tracker).
  const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother());
  const gestureDetectorRef = useRef<HandsFreeGestureDetector>(new HandsFreeGestureDetector());
  const tempoTrackerRef = useRef<TempoTracker>(new TempoTracker());
  const asymmetryAccumulatorRef = useRef<AsymmetryAccumulator>(new AsymmetryAccumulator());

  // Opsi & tracker dibaca lewat ref: loop per-frame stabil, tidak dibuat ulang tiap render/FPS update.
  const configRef = useRef({ tracker, options });
  useEffect(() => {
    configRef.current = { tracker, options };
  });

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const frameSkipRef = useRef<number>(0);
  const publishRef = useRef({ t: 0, key: '', gesture: 'none' as string });
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
          const noWebGL = err instanceof Error && err.message === WEBGL_UNAVAILABLE_MESSAGE;
          // WebGL mati = kondisi browser yang sudah dijelaskan di banner, bukan bug -> warn saja.
          (noWebGL ? console.warn : console.error)('Pose detector load error:', err);
          setModelError(noWebGL ? WEBGL_UNAVAILABLE_MESSAGE : 'Gagal memuat model deteksi MediaPipe di browser.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  /** Publish ke React: seketika bila ada perubahan penting, selain itu maksimal tiap PUBLISH_INTERVAL_MS. */
  const publish = useCallback(
    (
      now: number,
      res: TrackingResult,
      tempo: TempoState | null,
      sym: BilateralSymmetry | null,
      gesture: GestureDetectionResult | null
    ) => {
      if (!isMountedRef.current) return;
      const last = publishRef.current;
      const key = resultKey(res);
      const gestureKey = gesture?.activeGesture ?? 'none';
      if (key === last.key && gestureKey === last.gesture && now - last.t < PUBLISH_INTERVAL_MS) return;
      publishRef.current = { t: now, key, gesture: gestureKey };
      setTrackingResult(res);
      if (tempo) setTempoState(tempo);
      setSymmetryState(sym);
      setGestureResult(gesture);
    },
    []
  );

  const processFrame = useCallback(() => {
    if (!isRunningRef.current) return;

    const { tracker: activeTracker, options: opts } = configRef.current;
    const {
      showSkeleton = true,
      showAngles = true,
      showGhostSkeleton = false,
      exerciseId,
      enableGestures = true,
      onGestureAction,
    } = opts;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Hanya pakai detector yang sudah termuat (dimuat di effect mount); null = lewati frame ini.
    const detector = getLoadedPoseDetector();

    // Satu inferensi per frame video baru (rAF 60 Hz, kamera 30 fps: frame duplikat dilewati).
    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !video.paused &&
      !video.ended &&
      detector &&
      video.currentTime !== lastTimeRef.current
    ) {
      lastTimeRef.current = video.currentTime;

      // Frame yang dilewati tidak diproses sama sekali. Sebelumnya landmark lama diumpankan ulang
      // dengan timestamp baru, sehingga sinyal sudut bertangga dan dwell timer menghitung data basi.
      frameSkipRef.current++;
      const skip = fpsRef.current > 0 && fpsRef.current < LOW_FPS && frameSkipRef.current % 2 !== 0;

      if (!skip) {
        try {
          const now = performance.now();
          const result = detector.detectForVideo(video, now);
          const raw = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
          const smoothed = raw && raw.length >= 33 ? smootherRef.current.smooth(raw, now / 1000) : null;
          const ctx = canvas?.getContext('2d') ?? null;

          if (smoothed && activeTracker) {
            // 1. Hitung repetisi. Ukuran frame asli agar sudut tidak terdistorsi aspect ratio.
            const frame = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
            const res = activeTracker.processLandmarks(smoothed, now, frame);

            // 2. Gestur hands-free hanya saat tidak sedang di tengah rep (fase istirahat / timer).
            //    Tangan di atas kepala saat jumping jack "open" atau sit-up bukan perintah jeda.
            let gRes: GestureDetectionResult | null = null;
            if (enableGestures) {
              if (res.phase === undefined || res.phase === 'top') {
                gRes = gestureDetectorRef.current.processLandmarks(smoothed, now);
                if (gRes.triggeredAction !== 'none') onGestureAction?.(gRes.triggeredAction);
              } else {
                gestureDetectorRef.current.reset();
              }
            }

            // 3. Tempo & simetri tetap diakumulasi tiap frame (tidak ikut throttle).
            const tState = tempoTrackerRef.current.update(res, exerciseId);
            const sym = analyzeBilateralSymmetry(smoothed, exerciseId, frame);
            if (sym) asymmetryAccumulatorRef.current.addSample(sym);
            publish(now, res, tState, sym, gRes);

            // 4. Overlay canvas digambar tiap frame (bukan lewat React).
            if (canvas && ctx) {
              if (canvas.width !== frame.width || canvas.height !== frame.height) {
                canvas.width = frame.width;
                canvas.height = frame.height;
              }
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              const refPose = showGhostSkeleton && exerciseId ? REFERENCE_POSES[exerciseId] : undefined;
              if (refPose && refPose.phases.length >= 1) {
                const a = refPose.phases[0].landmarks;
                // Latihan isometrik (plank) hanya punya satu fase.
                const b = refPose.phases[refPose.phases.length >= 2 ? 1 : 0].landmarks;
                drawGhostSkeleton(ctx, a, b, now, canvas.width, canvas.height, smoothed);
              }

              if (showSkeleton) {
                drawSkeleton(ctx, smoothed, canvas.width, canvas.height, {
                  angles: res.angles,
                  showAngles,
                  hasFault: res.hasFault,
                });
              }

              if (gRes && gRes.activeGesture !== 'none' && gRes.targetPoint) {
                drawGestureIndicator(
                  ctx,
                  gRes.targetPoint,
                  gRes.progress,
                  gRes.label || 'Gestur',
                  canvas.width,
                  canvas.height
                );
              }
            }
          } else {
            // Landmark tidak terdeteksi: tetap beri tahu tracker agar rep yang berjalan dibatalkan
            // dan waktu tahan plank berhenti.
            if (activeTracker) publish(now, activeTracker.processLandmarks([], now), null, null, null);
            ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
          }

          // FPS inferensi nyata (frame yang diproses per detik)
          frameCountRef.current++;
          if (lastFpsTimeRef.current === 0) {
            lastFpsTimeRef.current = now;
          } else if (now - lastFpsTimeRef.current >= 1000) {
            fpsRef.current = frameCountRef.current;
            if (isMountedRef.current) setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }
        } catch (e) {
          console.warn('Frame processing exception:', e);
        }
      }
    }

    if (isRunningRef.current && isMountedRef.current) {
      rafIdRef.current = requestAnimationFrame(() => processFrameRef.current());
    }
  }, [videoRef, canvasRef, publish]);

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
    publishRef.current = { t: 0, key: '', gesture: 'none' };
    rafIdRef.current = requestAnimationFrame(() => processFrameRef.current());
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

  const getAverageSymmetryScore = useCallback((): number | null => {
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
