/**
 * Voice Coach: Real-time Audio Guidance menggunakan Web Speech API native browser.
 * Tidak membutuhkan network/server eksternal dan tidak memakan bandwidth.
 */

class VoiceCoach {
  private isEnabled: boolean = true;
  private lastSpeechTime: number = 0;
  private minIntervalMs: number = 1800; // Mencegah suara bertumpuk
  private synth: SpeechSynthesis | null = null;
  private idVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Cari suara berbahasa Indonesia (id-ID)
    this.idVoice =
      voices.find((v) => v.lang.includes('id') || v.lang.includes('ID')) ||
      voices.find((v) => v.lang.includes('en')) ||
      voices[0] ||
      null;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Mengucapkan teks dengan throttle agar tidak tumpang tindih
   * @param text Kalimat yang akan diucapkan
   * @param priority Jika true, akan langsung diucapkan (contoh: countdown atau rep count)
   */
  public speak(text: string, priority: boolean = false) {
    if (!this.isEnabled || !this.synth) return;

    const now = performance.now();
    if (!priority && now - this.lastSpeechTime < this.minIntervalMs) {
      return;
    }

    if (priority) {
      this.synth.cancel(); // Batalkan antrian sebelumnya jika prioritas
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.idVoice) {
      utterance.voice = this.idVoice;
    }
    utterance.rate = 1.1; // Sedikit lebih cepat agar tanggap
    utterance.pitch = 1.0;

    this.lastSpeechTime = now;
    this.synth.speak(utterance);
  }

  /**
   * Mengucapkan hitungan repetisi (Prioritas tinggi)
   */
  public speakRep(repNumber: number) {
    this.speak(String(repNumber), true);
  }

  /**
   * Memberikan instruksi koreksi form latihan
   */
  public speakCorrection(feedback: string) {
    this.speak(feedback, false);
  }
}

export const voiceCoach = new VoiceCoach();
