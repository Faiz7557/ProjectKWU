'use client';

// Diadaptasi dari 8B Sill template (MIT)
import Link from 'next/link';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { getAllExerciseConfigs } from '@/trackers';
import { EXERCISE_PANEL, ExerciseIcon } from '@/components/ui/ExerciseIcon';
import { ReferencePoseVisualizer } from '@/components/camera/ReferencePoseVisualizer';
import { useScene } from '@/lib/motion/useScene';
import { bindEffects } from '@/lib/motion/effects';

const CONFIGS = getAllExerciseConfigs();

// Kesalahan form yang dideteksi tiap tracker (name = FormFault.name di src/trackers/<gerakan>-tracker.ts).
// Config tracker belum mengekspos daftar ini, jadi disalin apa adanya dari sumbernya.
const FAULTS: Record<string, string[]> = {
  pushup: ['Pinggul Turun / Melengkung', 'Pinggul Terlalu Naik (Pike)', 'Kedalaman Kurang (Half Rep)'],
  squat: ['Dada Terlalu Membungkuk', 'Tumit Terangkat', 'Jongkok Kurang Dalam (Half Squat)'],
  situp: ['Kaki Terangkat', 'Angkatan Kurang Tinggi'],
  jumping_jack: ['Lengan Tidak Simetris', 'Kaki Tidak Dibuka Penuh', 'Lengan Tidak Terangkat Penuh'],
  plank: ['Pinggul Turun / Melengkung', 'Pinggul Terlalu Naik (Pike)'],
};

export function ExerciseExplorer() {
  const ref = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const cfg = CONFIGS[active];
  const panel = EXERCISE_PANEL[cfg.id] ?? 4;

  useScene(ref, () => bindEffects(ref.current!));

  const onKeyDown = (e: KeyboardEvent) => {
    const n = CONFIGS.length;
    const next = { ArrowRight: (active + 1) % n, ArrowLeft: (active + n - 1) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="gerakan" ref={ref} className="ld-section la-ex" aria-labelledby="la-ex-h2">
      <div className="la-ex__head bg-ink text-paper">
        <h2 id="la-ex-h2" className="ld-h2" data-motion="rise">Pilih gerakan, lihat formnya.</h2>
        <p className="ld-lead">Tiap gerakan punya posisi kamera, langkah yang benar, dan kesalahan form yang dikenali.</p>
      </div>

      <div role="tablist" aria-label="Gerakan" className="la-ex__tabs" onKeyDown={onKeyDown}>
        {CONFIGS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            id={`la-tab-${c.id}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls="la-tabpanel"
            tabIndex={i === active ? 0 : -1}
            className={`la-ex__tab panel-${EXERCISE_PANEL[c.id] ?? 4}`}
            onClick={() => setActive(i)}
          >
            <ExerciseIcon exercise={c.id} />
            <span className="ld-label">{c.name}</span>
          </button>
        ))}
      </div>

      <div
        id="la-tabpanel"
        role="tabpanel"
        aria-labelledby={`la-tab-${cfg.id}`}
        className="la-ex__panel"
        style={{ '--p': `var(--panel-${panel})` } as CSSProperties}
      >
        <div key={cfg.id} className="la-ex__fade">
          <div className="la-ex__ref">
            <ReferencePoseVisualizer exerciseId={cfg.id} />
          </div>
          <div className={`ld-panel la-ex__info panel-${panel}`}>
            <p className="ld-label">Kamera di {cfg.cameraOrientation === 'side' ? 'samping' : 'depan'} tubuh</p>
            <h3 className="ld-h3">{cfg.name}</h3>
            <div>
              <p className="ld-label">Langkah yang benar</p>
              <ol className="la-ex__list la-ex__list--num">
                {cfg.instructions.map((s) => <li key={s} className="ld-body">{s}</li>)}
              </ol>
            </div>
            <div>
              <p className="ld-label">Kesalahan yang dideteksi</p>
              <ul className="la-ex__list">
                {(FAULTS[cfg.id] ?? []).map((f) => <li key={f} className="ld-body">{f}</li>)}
              </ul>
            </div>
            <Link href={`/workout/${cfg.id}`} className="ld-btn la-ex__cta">
              <span>Coba gerakan ini</span> <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
