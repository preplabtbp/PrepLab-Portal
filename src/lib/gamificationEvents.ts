// PrepLab Vanguard Gamification Events & Dynamic Audio Synthesizer
// Clean Web Audio API synthesis (100% zero external audio asset dependencies)

export interface ExpGainEventDetail {
  amount: number;
  title: string;
  subtitle?: string;
  icon?: string;
}

export interface AchievementEventDetail {
  branchCode: string;
  branchName: string;
  tierLevel: number;
  tierName: string;
  titleReward: string;
  xpReward: number;
  isMaster: boolean;
  frameReward?: string;
}

export interface RankUpEventDetail {
  oldRankId: number;
  newRankId: number;
  oldRankName: string;
  newRankName: string;
  newRankIcon: string;
  oldRankIcon?: string;
  isMaxRank: boolean; // Rank 51 (Supreme Vanguard Commander)
  totalXp: number;
  nextRankName?: string;
}

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playExpGain() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playAchievementNormal() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 melodic arpeggio
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      });
    } catch (e) {}
  }

  playMasterAchievement() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major triumphant flourish
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      });
    } catch (e) {}
  }

  playRankUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5 military fanfare
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + (idx === 3 ? 0.32 : idx * 0.11);
        const dur = idx === 3 ? 0.75 : 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.05);
      });
    } catch (e) {}
  }

  playSupremeCommander() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // Grand Orchestral Fanfare for 5-Star General
      const chords = [
        [261.63, 329.63, 392.00], // C chord
        [293.66, 369.99, 440.00], // D chord
        [329.63, 415.30, 493.88], // E chord
        [523.25, 659.25, 783.99, 1046.50] // High C major imperial crescendo
      ];
      chords.forEach((chord, step) => {
        const stepTime = ctx.currentTime + (step < 3 ? step * 0.22 : 0.7);
        const dur = step === 3 ? 1.6 : 0.3;
        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, stepTime);
          gain.gain.setValueAtTime(0.11, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stepTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(stepTime);
          osc.stop(stepTime + dur + 0.05);
        });
      });
    } catch (e) {}
  }
}

export const soundEffects = new SoundEffects();

// 1. Pop-up Kecil Trigger
export function triggerExpGain(amount: number, title: string, subtitle?: string, icon?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gamification_exp_gain', {
    detail: { amount, title, subtitle, icon }
  }));
  soundEffects.playExpGain();
}

// 2 & 3. Achievement Tier Biasa & Tertinggi Trigger
export function triggerAchievementUnlocked(detail: AchievementEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gamification_achievement_unlocked', { detail }));
  if (detail.isMaster) {
    soundEffects.playMasterAchievement();
  } else {
    soundEffects.playAchievementNormal();
  }
}

// 4 & 5. Naik Pangkat Biasa & Tertinggi (Bintang 5) Trigger
export function triggerRankUp(detail: RankUpEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gamification_rank_up', { detail }));
  if (detail.isMaxRank) {
    soundEffects.playSupremeCommander();
  } else {
    soundEffects.playRankUp();
  }
}

// Global browser window attachment for accessibility from any component
if (typeof window !== 'undefined') {
  (window as any).triggerExpGain = triggerExpGain;
  (window as any).triggerAchievementUnlocked = triggerAchievementUnlocked;
  (window as any).triggerRankUp = triggerRankUp;
}
