export interface RepTempoResult {
  eccentricSec: number;
  bottomPauseSec: number;
  concentricSec: number;
  totalTUTSec: number;
  tempoFormat: string; // Misal: "3-1-1"
  isRushed: boolean;
}

export interface TempoState {
  currentPhase: 'idle' | 'descending' | 'bottom' | 'ascending';
  phaseDurationSec: number;
  lastRepTempo: RepTempoResult | null;
  totalTUTSec: number;
  averageTUTPerRep: number;
  rushedRepsCount: number;
  feedback?: string;
}

export class TempoTracker {
  private phase: 'idle' | 'descending' | 'bottom' | 'ascending' = 'idle';
  private phaseStartTime: number = 0;

  private descentDuration: number = 0;
  private bottomDuration: number = 0;
  private concentricDuration: number = 0;

  private lastRepCount: number = 0;
  private lastRepTempo: RepTempoResult | null = null;

  private totalTUTSec: number = 0;
  private completedRepsCount: number = 0;
  private rushedRepsCount: number = 0;

  /**
   * Evaluasi perubahan state tracker gerakan (up/down/holding, dll)
   * @param exerciseState State saat ini dari tracker (misal 'up', 'down', 'squatting')
   * @param repCount Total hitungan rep saat ini
   * @param now Performance timestamp dalam milidetik
   */
  public update(exerciseState: string, repCount: number, now: number): TempoState {
    const isBottomState =
      exerciseState === 'down' ||
      exerciseState === 'squatting' ||
      exerciseState === 'crunched' ||
      exerciseState === 'open';

    const isTopState = exerciseState === 'up' || exerciseState === 'closed';

    let feedback: string | undefined;

    // Deteksi jika repetisi bertambah (Rep selesai)
    if (repCount > this.lastRepCount) {
      if (this.phase === 'ascending' || this.phase === 'bottom') {
        this.concentricDuration = (now - this.phaseStartTime) / 1000;
      }

      const ecc = Math.max(0.3, Math.min(6.0, this.descentDuration));
      const bot = Math.max(0.1, Math.min(3.0, this.bottomDuration));
      const con = Math.max(0.3, Math.min(4.0, this.concentricDuration));
      const totalTUT = ecc + bot + con;

      const isRushed = ecc < 1.1;
      if (isRushed) {
        this.rushedRepsCount++;
        feedback = 'Gerakan terlalu terburu-buru. Tahan fase turun 2-3 detik!';
      }

      this.completedRepsCount++;
      this.totalTUTSec += totalTUT;

      const eccRounded = Math.round(ecc);
      const botRounded = Math.round(bot);
      const conRounded = Math.round(con);

      this.lastRepTempo = {
        eccentricSec: Number(ecc.toFixed(1)),
        bottomPauseSec: Number(bot.toFixed(1)),
        concentricSec: Number(con.toFixed(1)),
        totalTUTSec: Number(totalTUT.toFixed(1)),
        tempoFormat: `${Math.max(1, eccRounded)}-${botRounded}-${Math.max(1, conRounded)}`,
        isRushed,
      };

      // Reset timer fase per-rep
      this.phase = 'idle';
      this.descentDuration = 0;
      this.bottomDuration = 0;
      this.concentricDuration = 0;
      this.phaseStartTime = now;
      this.lastRepCount = repCount;
    } else {
      // Transisi fase internal
      if (isTopState) {
        if (this.phase !== 'idle' && this.phase !== 'ascending') {
          this.concentricDuration = (now - this.phaseStartTime) / 1000;
        }
        if (this.phase === 'bottom') {
          this.phase = 'ascending';
          this.phaseStartTime = now;
        }
      } else if (isBottomState) {
        if (this.phase === 'descending') {
          this.descentDuration = (now - this.phaseStartTime) / 1000;
          this.phase = 'bottom';
          this.phaseStartTime = now;
        } else if (this.phase === 'idle') {
          // Gerakan mulai turun
          this.phase = 'descending';
          this.phaseStartTime = now;
        }
      }
    }

    const currentPhaseDuration = this.phaseStartTime > 0 ? (now - this.phaseStartTime) / 1000 : 0;
    const avgTUT = this.completedRepsCount > 0 ? this.totalTUTSec / this.completedRepsCount : 0;

    return {
      currentPhase: this.phase,
      phaseDurationSec: Number(currentPhaseDuration.toFixed(1)),
      lastRepTempo: this.lastRepTempo,
      totalTUTSec: Number(this.totalTUTSec.toFixed(1)),
      averageTUTPerRep: Number(avgTUT.toFixed(1)),
      rushedRepsCount: this.rushedRepsCount,
      feedback,
    };
  }

  public reset(): void {
    this.phase = 'idle';
    this.phaseStartTime = 0;
    this.descentDuration = 0;
    this.bottomDuration = 0;
    this.concentricDuration = 0;
    this.lastRepCount = 0;
    this.lastRepTempo = null;
    this.totalTUTSec = 0;
    this.completedRepsCount = 0;
    this.rushedRepsCount = 0;
  }
}
