'use client';

import { useState, useEffect } from 'react';
import { Flame, Clock, Trophy, Award, Calendar, Lock, Sparkles, CheckCircle2, TriangleAlert, Trash2, Plus, Target } from 'lucide-react';
import { getGamificationState } from '@/lib/gamification/streak';
import { ALL_ACHIEVEMENTS, getLevelInfo } from '@/lib/gamification/achievements';
import type { UserGamificationState } from '@/lib/gamification/types';
import { TopBar } from '@/components/ui/Nav';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Stat, ProgressBar } from '@/components/ui/Surfaces';
import { Toggle } from '@/components/ui/Controls';
import { Dialog } from '@/components/ui/Dialog';
import { ExerciseIcon } from '@/components/ui/ExerciseIcon';

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

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'pushup', label: 'Push-up' },
  { id: 'squat', label: 'Squat' },
  { id: 'situp', label: 'Sit-up' },
  { id: 'jumping_jack', label: 'Jumping Jack' },
  { id: 'plank', label: 'Plank' },
];

const formatMinSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m} mnt ${s} dtk` : `${s} dtk`;
};

const formatDate = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleDateString('id-ID', {
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

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gamification, setGamification] = useState<UserGamificationState | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Muat data dari localStorage dan API backend
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      let localSessions: SavedSession[] = [];

      try {
        const stored = localStorage.getItem('smartfit_workout_history');
        if (stored) localSessions = JSON.parse(stored);
      } catch {
        // Abaikan data rusak; tampilkan kosong
      }

      setGamification(getGamificationState());

      // Gabungkan dengan API bila tersedia; jika gagal, tetap pakai data lokal
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const json = await res.json();
          if (json.sessions && Array.isArray(json.sessions) && json.sessions.length > 0) {
            const apiMap = new Map<string, SavedSession>(json.sessions.map((s: SavedSession) => [s.id, s]));
            for (const s of localSessions) {
              if (!apiMap.has(s.id)) apiMap.set(s.id, s);
            }
            localSessions = Array.from(apiMap.values());
          }
        }
      } catch {
        // Fallback ke data lokal
      }

      localSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setSessions(localSessions);
      setIsLoading(false);
    }

    loadHistory();
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem('smartfit_workout_history');
    } catch {
      // Abaikan: state tetap dikosongkan di layar
    }
    setSessions([]);
    setConfirmClear(false);
  };

  // Agregat. Form rata-rata hanya dari sesi yang punya formScore; tanpa data = null (tampil "—").
  const totalReps = sessions.reduce((acc, s) => acc + (s.reps ?? 0), 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.sessionDurationSec, 0);
  const totalCalories = sessions.reduce(
    (acc, s) => acc + (s.caloriesBurned ?? Math.round(s.sessionDurationSec * 0.14)),
    0,
  );
  const scored = sessions.filter((s) => typeof s.formScore === 'number');
  const avgFormScore = scored.length > 0 ? Math.round(scored.reduce((acc, s) => acc + (s.formScore ?? 0), 0) / scored.length) : null;

  const filteredSessions = selectedFilter === 'all' ? sessions : sessions.filter((s) => s.exercise === selectedFilter);

  const levelInfo = gamification ? getLevelInfo(gamification.totalXp) : null;
  const xpProgress = levelInfo
    ? Math.min(
        100,
        Math.round(
          ((gamification!.totalXp - levelInfo.currentTierBaseXp) /
            Math.max(1, levelInfo.nextLevelXp - levelInfo.currentTierBaseXp)) *
            100,
        ),
      )
    : 0;

  const streakMessage = !gamification
    ? ''
    : gamification.streak.current >= 7
      ? 'Konsistensi kamu sudah di level tertinggi. Pertahankan.'
      : gamification.streak.current >= 3
        ? 'Bagus. Lanjutkan sampai dapat lencana 7 hari berturut-turut.'
        : 'Bangun kebiasaan harian dengan satu sesi setiap hari.';

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <TopBar title="Riwayat" back={{ href: '/workout', label: 'Latihan' }} />

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
        {/* Streak & level */}
        {gamification && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-subhead font-semibold text-data-streak">
                  <Flame className="size-4" aria-hidden="true" /> Streak harian
                </p>
                <span className="text-caption text-text-2">Terpanjang {gamification.streak.longest} hari</span>
              </div>
              <p className="flex items-baseline gap-2">
                <span className="num text-metric-l text-data-streak">{gamification.streak.current}</span>
                <span className="text-headline text-text">hari berturut-turut</span>
              </p>
              <p className="text-footnote text-text-2">{streakMessage}</p>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-subhead font-semibold text-data-xp">
                  <Sparkles className="size-4" aria-hidden="true" /> Level dan XP
                </p>
                <span className="num text-caption text-text-2">{gamification.totalXp} XP</span>
              </div>
              <p className="flex items-baseline gap-2">
                <span className="num text-metric-l text-data-xp">Lv. {gamification.level}</span>
                <span className="text-headline text-text">{gamification.levelName}</span>
              </p>
              {levelInfo && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-footnote text-text-2">
                    <span>Menuju level {gamification.level + 1}</span>
                    <span className="num font-semibold text-text">{xpProgress}%</span>
                  </div>
                  <ProgressBar value={xpProgress / 100} tone="xp" label={`Progres ke level ${gamification.level + 1}`} />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Pencapaian */}
        {gamification && (
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-headline text-text">
              <Trophy className="size-5 text-data-streak" aria-hidden="true" />
              Pencapaian ({gamification.unlockedAchievementIds.length}/{ALL_ACHIEVEMENTS.length})
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {ALL_ACHIEVEMENTS.map((ach) => {
                const unlocked = gamification.unlockedAchievementIds.includes(ach.id);
                return (
                  <li
                    key={ach.id}
                    className={`flex flex-col justify-between gap-3 rounded-md p-3.5 ${unlocked ? 'bg-surface-3' : 'bg-surface-3/60'}`}
                  >
                    <div className="space-y-1">
                      <span className={`grid size-9 place-items-center rounded-full ${unlocked ? 'bg-warning-soft text-data-streak' : 'bg-surface text-text-3'}`} aria-hidden="true">
                        {unlocked ? <Award className="size-5" /> : <Lock className="size-4" />}
                      </span>
                      <h3 className={`line-clamp-1 text-subhead font-semibold ${unlocked ? 'text-text' : 'text-text-2'}`}>{ach.name}</h3>
                      <p className="line-clamp-2 text-caption leading-snug text-text-2">{ach.description}</p>
                    </div>
                    {unlocked ? (
                      <span className="flex items-center gap-1 text-caption font-semibold text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>+{ach.xpReward} XP</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-caption font-medium text-text-3">
                        <Lock className="size-3" aria-hidden="true" />
                        <span>Belum terbuka</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><Stat label="Total rep" value={totalReps} tone="reps" icon={Target} /></Card>
          <Card><Stat label="Total durasi" value={Math.round(totalSeconds / 60)} unit="mnt" icon={Clock} /></Card>
          <Card><Stat label="Kalori" value={totalCalories} unit="kkal" tone="kcal" icon={Flame} /></Card>
          <Card>
            <Stat label="Rata-rata form" value={avgFormScore} unit={avgFormScore !== null ? '%' : undefined} tone="form" />
            {avgFormScore !== null && <p className="mt-1 text-caption text-text-3">Dari {scored.length} sesi</p>}
          </Card>
        </div>

        {/* Filter */}
        <div role="group" aria-label="Filter gerakan" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <Toggle
              key={f.id}
              pressed={selectedFilter === f.id}
              onPressedChange={() => setSelectedFilter(f.id)}
              label={f.label}
              className="shrink-0 rounded-full"
            />
          ))}
        </div>

        {/* Daftar sesi */}
        {isLoading ? (
          <p className="py-12 text-center text-callout text-text-3" role="status">
            Memuat riwayat latihan...
          </p>
        ) : filteredSessions.length === 0 ? (
          <Card className="space-y-4 p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-3 text-text-3">
              <Calendar className="size-7" aria-hidden="true" />
            </span>
            <h2 className="text-title-3 text-text">Belum ada sesi tercatat</h2>
            <p className="mx-auto max-w-sm text-callout text-text-2">
              Selesaikan satu sesi latihan untuk mulai melihat progres dan membuka lencana.
            </p>
            <Button href="/workout" icon={<Plus className="size-4" aria-hidden="true" />}>
              Mulai latihan
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filteredSessions.map((session, idx) => {
              const name = session.exerciseName || EXERCISE_NAMES[session.exercise] || session.exercise;
              const isPlank = session.exercise === 'plank';
              const kcal = session.caloriesBurned ?? Math.round(session.sessionDurationSec * 0.14);
              const faults = session.faultsSummary ?? [];
              return (
                <li key={session.id || idx}>
                  <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <ExerciseIcon exercise={session.exercise} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-headline text-text">{name}</span>
                          {typeof session.formScore === 'number' && <Badge tone="form">{session.formScore}% form</Badge>}
                        </div>
                        <p className="flex items-center gap-1.5 text-footnote text-text-2">
                          <Calendar className="size-3.5 text-text-3" aria-hidden="true" />
                          {formatDate(session.startedAt)}
                        </p>
                        {faults.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {faults.slice(0, 2).map((f, i) => (
                              <Badge key={i} tone="danger" icon={<TriangleAlert className="size-3" />}>
                                {f.name} ({f.count}x)
                              </Badge>
                            ))}
                            {faults.length > 2 && <Badge tone="neutral">+{faults.length - 2}</Badge>}
                          </div>
                        )}
                      </div>
                    </div>

                    <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-6">
                      <div className="text-right">
                        <dt className="text-caption text-text-3">{isPlank ? 'Waktu hold' : 'Repetisi'}</dt>
                        <dd className="num text-title-3 text-text">{isPlank ? formatMinSec(session.holdDurationSec ?? 0) : `${session.reps ?? 0}`}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-caption text-text-3">Durasi</dt>
                        <dd className="num text-subhead text-text-2">{formatMinSec(session.sessionDurationSec)}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-caption text-text-3">Kalori</dt>
                        <dd className="num text-subhead text-data-kcal">~{kcal} kkal</dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {sessions.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button variant="tertiary" className="text-danger" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirmClear(true)}>
              Hapus semua riwayat
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Hapus semua riwayat?"
        description={`${sessions.length} sesi di perangkat ini akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={clearHistory}>
            Hapus semua
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
