/**
 * Modul Kontrol Suara Dua Arah (Two-Way Voice Commands) untuk SMART-FIT v2.
 * Menggunakan Web Speech Recognition API (SpeechRecognition / webkitSpeechRecognition)
 * untuk mengenali perintah verbal pengguna dalam Bahasa Indonesia tanpa sentuhan tangan.
 */

export type VoiceCommandAction = 'start' | 'pause' | 'resume' | 'finish' | 'reset';

export interface VoiceCommandEvent {
  action: VoiceCommandAction;
  phrase: string;
  timestamp: number;
}

// Global declaration untuk Web Speech API
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  webkitSpeechRecognition?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class VoiceCommandListener {
  private recognition: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private lastCommandTime: number = 0;
  private onCommandCallback: ((event: VoiceCommandEvent) => void) | null = null;
  private readonly cooldownMs: number = 2000;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindowWithSpeech;
      const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        try {
          this.recognition = new SpeechRecognitionConstructor();
          this.recognition.continuous = true;
          this.recognition.interimResults = false;
          this.recognition.lang = 'id-ID';
          this.recognition.maxAlternatives = 3;

          this.setupEvents();
        } catch (e) {
          console.warn('Gagal menginisialisasi SpeechRecognition:', e);
          this.recognition = null;
        }
      }
    }
  }

  private setupEvents(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const now = Date.now();
      if (now - this.lastCommandTime < this.cooldownMs) return;

      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];
      if (!result || !result[0]) return;

      const transcript = (result[0].transcript || '').trim().toLowerCase();
      const action = this.parseTranscript(transcript);

      if (action && this.onCommandCallback) {
        this.lastCommandTime = now;
        this.onCommandCallback({
          action,
          phrase: transcript,
          timestamp: now,
        });
      }
    };

    this.recognition.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Abaikan error no-speech / aborted biasa
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Voice command recognition error:', event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Otomatis restart jika mode mendengar masih aktif (auto-keepalive)
      if (this.shouldKeepListening) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch {
          // Restart ditangani browser
        }
      }
    };
  }

  /**
   * Memetakan frasa ucapan bahasa Indonesia ke aksi sistem
   */
  public parseTranscript(text: string): VoiceCommandAction | null {
    const clean = text.toLowerCase();

    // 1. Aksi Jeda (Pause)
    if (
      clean.includes('jeda') ||
      clean.includes('pause') ||
      clean.includes('tunggu') ||
      clean.includes('stop') ||
      clean.includes('berhenti') ||
      clean.includes('istirahat')
    ) {
      return 'pause';
    }

    // 2. Aksi Lanjut (Resume)
    if (
      clean.includes('lanjut') ||
      clean.includes('resume') ||
      clean.includes('teruskan') ||
      clean.includes('lanjutkan')
    ) {
      return 'resume';
    }

    // 3. Aksi Mulai (Start)
    if (
      clean.includes('mulai') ||
      clean.includes('start') ||
      clean.includes('gas') ||
      clean.includes('ayo') ||
      clean.includes('siap')
    ) {
      return 'start';
    }

    // 4. Aksi Selesai (Finish)
    if (
      clean.includes('selesai') ||
      clean.includes('finish') ||
      clean.includes('kelar') ||
      clean.includes('sudah') ||
      clean.includes('tuntas')
    ) {
      return 'finish';
    }

    // 5. Aksi Ulang (Reset)
    if (clean.includes('ulang') || clean.includes('reset')) {
      return 'reset';
    }

    return null;
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public startListening(callback: (event: VoiceCommandEvent) => void): boolean {
    if (!this.recognition) return false;
    this.onCommandCallback = callback;
    this.shouldKeepListening = true;

    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        return true;
      } catch (err) {
        console.warn('Tidak dapat memulai pendengar suara:', err);
        return false;
      }
    }
    return true;
  }

  public stopListening(): void {
    this.shouldKeepListening = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Abaikan jika sudah berhenti
      }
      this.isListening = false;
    }
  }

  public toggleListening(callback: (event: VoiceCommandEvent) => void): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening(callback);
    }
  }
}

// Singleton instance
export const voiceCommander = new VoiceCommandListener();
