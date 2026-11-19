'use client';

// Diadaptasi dari 8B Sill template (MIT): section:sitters
import { useEffect, useRef, useState } from 'react';
import { Volume2, Vibrate, Timer, Square } from 'lucide-react';
import { bindEffects } from '@/lib/motion/effects';
import { useScene } from '@/lib/motion/useScene';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { metronome } from '@/lib/audio/metronome';
import { triggerHapticFault } from '@/lib/audio/haptics';
import './landing.css';
import './landing-b.css';

// Kalimat asli dari src/app/workout/[exercise]/page.tsx:185
const VOICE_SAMPLE = 'Kendalikan tempo, turun lebih perlahan!';
const BEAT_MS = 600;
// playTick(440) -> playBottomPause(550) -> playAscentCue(880) -> playBottomPause(550)
const BEATS: Array<() => void> = [
  () => metronome.playTick(),
  () => metronome.playBottomPause(),
  () => metronome.playAscentCue(),
  () => metronome.playBottomPause(),
];

export function CoachSenses() {
  const ref = useRef<HTMLElement>(null);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [vibMsg, setVibMsg] = useState('');
  const [metroOn, setMetroOn] = useState(false);
  const [metroMsg, setMetroMsg] = useState('');
  const timers = useRef<number[]>([]);

  useScene(ref, () => {
    const undo = bindEffects(ref.current!);
    return undo;
  });

  const stopMetro = (msg = '') => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    metronome.setEnabled(false);
    setMetroOn(false);
    setMetroMsg(msg);
  };

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      metronome.setEnabled(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const playVoice = () => {
    if (!('speechSynthesis' in window)) {
      setVoiceMsg('Perangkat ini tidak mendukung suara');
      return;
    }
    voiceCoach.setEnabled(true);
    voiceCoach.speak(VOICE_SAMPLE, true);
    setVoiceMsg(`Pelatih berkata: "${VOICE_SAMPLE}"`);
  };

  const playVibrate = () => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      setVibMsg('Perangkat ini tidak mendukung getar');
      return;
    }
    triggerHapticFault();
    setVibMsg('Getar peringatan form: dua getaran tajam');
  };

  const toggleMetro = () => {
    if (metroOn) {
      stopMetro('Metronom dihentikan');
      return;
    }
    metronome.setEnabled(true);
    setMetroOn(true);
    setMetroMsg('Metronom berjalan, 4 ketukan');
    BEATS.forEach((beat, i) => {
      timers.current.push(window.setTimeout(beat, i * BEAT_MS));
    });
    timers.current.push(window.setTimeout(() => stopMetro('Selesai'), BEATS.length * BEAT_MS));
  };

  return (
    <section id="indra" ref={ref} className="ld-section" aria-labelledby="indra-title">
      <div className="lb-head">
        <h2 id="indra-title" className="ld-h2" data-motion="rise">Empat indra pelatih</h2>
        <p className="ld-lead">Pelatihmu tidak cuma menghitung. Ia bicara, bergetar, memberi irama, dan membaca gestur tanganmu.</p>
      </div>
      <ul className="cs-list">
        <li className="cs-item">
          <div className="cs-frame ld-frame bg-ink text-paper" data-motion="peek">
            <div className="cs-ico" aria-hidden="true"><Volume2 strokeWidth={1.5} /></div>
          </div>
          <div className="cs-ledge panel-1">
            <h3 className="ld-h3">Suara</h3>
            <p className="ld-body">Koreksi form diucapkan dalam bahasa Indonesia lewat voice coach, jadi kamu tidak perlu melirik layar.</p>
            <button type="button" className="ld-btn cs-btn" onClick={playVoice}>Dengar suara</button>
            <p className="cs-status" aria-live="polite">{voiceMsg}</p>
          </div>
        </li>
        <li className="cs-item">
          <div className="cs-frame ld-frame bg-ink text-paper" data-motion="peek">
            <div className="cs-ico" aria-hidden="true"><Vibrate strokeWidth={1.5} /></div>
          </div>
          <div className="cs-ledge panel-3">
            <h3 className="ld-h3">Getar</h3>
            <p className="ld-body">HP bergetar saat rep bersih, saat form salah, dan saat target tercapai. Berjalan di HP yang mendukung getar.</p>
            <button type="button" className="ld-btn ld-btn--light cs-btn" onClick={playVibrate}>Rasakan getar</button>
            <p className="cs-status" aria-live="polite">{vibMsg}</p>
          </div>
        </li>
        <li className="cs-item">
          <div className="cs-frame ld-frame bg-ink text-paper" data-motion="peek">
            <div className="cs-ico" aria-hidden="true"><Timer strokeWidth={1.5} /></div>
          </div>
          <div className="cs-ledge panel-7">
            <h3 className="ld-h3">Metronom</h3>
            <p className="ld-body">Nada 440 hingga 880 Hz memandu ritme turun, tahan, dan naik tanpa file audio.</p>
            <button type="button" className="ld-btn cs-btn" onClick={toggleMetro}>
              {metroOn ? <><Square size={16} aria-hidden="true" /> Hentikan</> : 'Putar 4 ketukan'}
            </button>
            <p className="cs-status" aria-live="polite">{metroMsg}</p>
          </div>
        </li>
        <li className="cs-item">
          <div className="cs-frame ld-frame bg-ink text-paper" data-motion="peek">
            <svg className="cs-gest" viewBox="0 0 200 150" role="img" aria-label="Angkat tangan untuk jeda, silang lengan untuk selesai">
              <g>
                <circle className="cs-head" cx="50" cy="40" r="9" />
                <path d="M50 50v36M50 86l-10 26M50 86l10 26" />
                <path d="M50 58l-14 14" />
                <path className="cs-arm cs-arm--up" d="M50 58l14-14 0-22" />
              </g>
              <g>
                <circle className="cs-head" cx="150" cy="40" r="9" />
                <path d="M150 50v36M150 86l-10 26M150 86l10 26" />
                <path className="cs-arm cs-arm--x" d="M138 62l24 10M162 62l-24 10" />
              </g>
            </svg>
          </div>
          <div className="cs-ledge panel-8">
            <h3 className="ld-h3">Gestur</h3>
            <p className="ld-body">Tanpa menyentuh layar: angkat tangan untuk jeda atau lanjut, silang lengan untuk menyelesaikan sesi.</p>
          </div>
        </li>
      </ul>
    </section>
  );
}
