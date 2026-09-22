/**
 * Audio Cadence Metronome memanfaatkan Web Audio API
 * Memandu ritme fase turun (eksentrik) dan dorongan naik (konsentrik) secara halus tanpa file audio eksternal.
 */

class AudioMetronome {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Bunyi tick halus untuk memandu ritme penurunan (Descent / Eccentric)
   */
  public playTick(freq: number = 440, duration: number = 0.08): void {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context error handling
    }
  }

  /**
   * Bunyi konfirmasi saat posisi dasar tercapai
   */
  public playBottomPause(): void {
    this.playTick(550, 0.1);
  }

  /**
   * Bunyi dorongan naik eksplosif (Ascent)
   */
  public playAscentCue(): void {
    this.playTick(880, 0.12);
  }
}

export const metronome = new AudioMetronome();
