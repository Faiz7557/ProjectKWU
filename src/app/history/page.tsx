'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Flame,
  Clock,
  Trophy,
  Award,
  ArrowLeft,
  Calendar,
  Filter,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { getGamificationState } from '@/lib/gamification/streak';
import { ALL_ACHIEVEMENTS, getLevelInfo } from '@/lib/gamification/achievements';
import type { UserGamificationState } from '@/lib/gamification/types';

interface SavedSession {
  id: string;
  exercise: string;
  exerciseName?: string;
  reps: number | null;
  cleanReps?: number | null;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  caloriesBurned?: number;
  formScore?: number;
  faultsSummary?: { name: string; count: number; description: string }[];
  startedAt: string;
}

const EXERCISE_NAMES: Record<string, string> = {
  pushup: 'Push-up',
  squat: 'Squat',
  situp: 'Sit-up',
  jumping_jack: 'Jumping Jack',
  plank: 'Plank',
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gamification, setGamification] = useState<UserGamificationState | null>(null);

  // Muat data dari localStorage dan API backend
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      let localSessions: SavedSession[] = [];

      try {
        const stored = localStorage.getItem('smartfit_workout_history');
        if (stored) {
          localSessions = JSON.parse(stored);
        }
      } catch {
        // Ignore
      }

      // Muat data gamifikasi
      const gState = getGamificationState();
      setGamification(gState);

      // Coba fetch dari API jika ada
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const json = await res.json();
          if (json.sessions && Array.isArray(json.sessions) && json.sessions.length > 0) {
            const apiMap = new Map<string, SavedSession>(
              json.sessions.map((s: SavedSession) => [s.id, s])
            );
            for (const s of localSessions) {
              if (!apiMap.has(s.id)) {
                apiMap.set(s.id, s);
              }
            }
            localSessions = Array.from(apiMap.values());
          }
        }
      } catch {
        // Fallback to local
      }

      localSessions.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      setSessions(localSessions);
      setIsLoading(false);
    }

    loadHistory();
  }, []);

  const handleClearHistory = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat latihan di perangkat ini?')) {
      localStorage.removeItem('smartfit_workout_history');
      setSessions([]);
    }
  };

  // Kalkulasi agregat metrik
  const totalReps = sessions.reduce((acc, s) => acc + (s.reps ?? 0), 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.sessionDurationSec, 0);
  const totalCalories = sessions.reduce(
    (acc, s) => acc + (s.caloriesBurned ?? Math.round(s.sessionDurationSec * 0.14)),
    0
  );
  const avgFormScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((acc, s) => acc + (s.formScore ?? 92), 0) / sessions.length
        )
      : 0;

  const filteredSessions =
    selectedFilter === 'all'
      ? sessions
      : sessions.filter((s) => s.exercise === selectedFilter);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const levelInfo = gamification ? getLevelInfo(gamification.totalXp) : null;
  const xpProgress = levelInfo
    ? Math.min(
        100,
        Math.round(
          ((gamification!.totalXp - levelInfo.currentTierBaseXp) /
            Math.max(1, levelInfo.nextLevelXp - levelInfo.currentTierBaseXp)) *
            100
        )
      )
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/workout"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Latihan</span>
          </Link>

          {sessions.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 text-xs text-red-400/80 hover:text-red-400 transition-colors p-2"
              title="Hapus riwayat lokal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Riwayat</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            <span>Dashboard Progres & Gamifikasi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Pusat Kebugaran & Prestasi
          </h1>
        </div>

        {/* GAMIFIKASI: STREAK & LEVEL XP BANNER */}
        {gamification && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Streak Card */}
            <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Flame className="w-4 h-4" />
                  <span>Streak Latihan Harian</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Rekor Terpanjang: {gamification.streak.longest} hari
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-400 font-mono">
                  {gamification.streak.current}
                </span>
                <span className="text-base font-semibold text-amber-200">
                  Hari Berturut-turut
                </span>
              </div>

              <p className="text-xs text-slate-400">
                {gamification.streak.current >= 7
                  ? '🔥 Luar biasa! Konsistensi Anda berada di level atletis tertinggi.'
                  : gamification.streak.current >= 3
                  ? '⚡ Hebat! Pertahankan api streak Anda untuk meraih badge 7-Day Warrior.'
                  : 'Mulai bangun kebiasaan sehat harian Anda dengan menyelesaikan 1 sesi per hari.'}
              </p>
            </div>

            {/* Level & XP Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-500/30 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Level & Poin Pengalaman (XP)</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-300">
                  {gamification.totalXp} XP
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-indigo-400 font-mono">
                  Lv. {gamification.level}
                </span>
                <span className="text-base font-semibold text-slate-200">
                  {gamification.levelName}
                </span>
              </div>

              {levelInfo && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Progres ke Level {gamification.level + 1}</span>
                    <span className="font-mono text-indigo-300 font-bold">{xpProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-400 transition-all duration-500"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PENCAPAIAN / ACHIEVEMENT BADGES GRID */}
        {gamification && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Pencapaian Saya ({gamification.unlockedAchievementIds.length}/{ALL_ACHIEVEMENTS.length} Terbuka)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ALL_ACHIEVEMENTS.map((ach) => {
                const isUnlocked = gamification.unlockedAchievementIds.includes(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                      isUnlocked
                        ? 'bg-slate-800/80 border-amber-500/40 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-50'
                    }`}
                  >
                    <div>
                      <div className="text-3xl mb-1.5">{isUnlocked ? ach.icon : '🔒'}</div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{ach.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {ach.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1">
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>+{ach.xpReward} XP</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Highlight Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Trophy className="w-4 h-4 text-blue-400" />
              <span>Total Reps</span>
            </div>
            <div className="text-3xl font-black text-blue-400 font-mono">
              {totalReps}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Total Durasi</span>
            </div>
            <div className="text-3xl font-black text-slate-100 font-mono">
              {Math.round(totalSeconds / 60)}m
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Kalori</span>
            </div>
            <div className="text-3xl font-black text-orange-400 font-mono">
              {totalCalories}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Rata-rata Form</span>
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {avgFormScore > 0 ? `${avgFormScore}%` : '-'}
            </div>
          </div>
        </div>

        {/* Filter Gerakan */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold">
          <span className="text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pushup', label: 'Push-up' },
            { id: 'squat', label: 'Squat' },
            { id: 'situp', label: 'Sit-up' },
            { id: 'jumping_jack', label: 'Jumping Jack' },
            { id: 'plank', label: 'Plank' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedFilter(btn.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                selectedFilter === btn.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* List Riwayat Sesi */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Memuat riwayat latihan...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-300">Belum Ada Sesi Tercatat</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Selesaikan sesi latihan pertama Anda untuk membuka badge dan memantau perkembangan Anda.
            </p>
            <Link
              href="/workout"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Mulai Latihan Sekarang</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session, idx) => {
              const name =
                session.exerciseName ||
                EXERCISE_NAMES[session.exercise] ||
                session.exercise;
              const isPlank = session.exercise === 'plank';

              return (
                <div
                  key={session.id || idx}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-100">
                        {name}
                      </span>
                      {session.formScore && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          {session.formScore}% Form
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDate(session.startedAt)}</span>
                    </div>

                    {session.faultsSummary && session.faultsSummary.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {session.faultsSummary.map((f, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] font-semibold"
                          >
                            ⚠️ {f.name} ({f.count}x)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-500 block">
                        {isPlank ? 'Waktu Hold' : 'Repetisi'}
                      </span>
                      <span className="text-xl font-bold font-mono text-blue-400">
                        {isPlank
                          ? formatMinSec(session.holdDurationSec ?? 0)
                          : `${session.reps ?? 0} reps`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-500 block">
                        Durasi
                      </span>
                      <span className="text-sm font-semibold font-mono text-slate-300">
                        {formatMinSec(session.sessionDurationSec)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-500 block">
                        Kalori
                      </span>
                      <span className="text-sm font-semibold font-mono text-orange-400">
                        {session.caloriesBurned ??
                          Math.round(session.sessionDurationSec * 0.14)}{' '}
                        kcal
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
