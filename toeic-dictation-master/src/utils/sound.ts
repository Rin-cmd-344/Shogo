// Audio Synthesizer using Web Audio API for Chime (ピンポン) and Buzzer (ブザー)

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setConfig(enabled: boolean, volume: number = 0.5) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Pleasant Japanese Quiz "ピンポン" chime (2 tones: C5 -> G5)
   */
  public playCorrect() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(this.volume * 0.4, now);
      gainNode.connect(ctx.destination);

      // Tone 1: 523.25 Hz (C5) - "ピン"
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2: 783.99 Hz (G5) - "ポン"
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.15);
      osc2.connect(gainNode);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.55);

      // Envelope fade out
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }

  /**
   * Classic "ブザー" buzz sound for incorrect answer
   */
  public playIncorrect() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(this.volume * 0.35, now);
      gainNode.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.28);
      osc.connect(gainNode);

      osc.start(now);
      osc.stop(now + 0.3);

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }

  private currentSpeakId: number = 0;
  private isSpeakingActive: boolean = false;

  /**
   * Speak English text using Web Speech API as instant high-quality fallback
   * when no pre-recorded audio file is attached.
   */
  public speakText(text: string, rate: number = 1.0, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any existing speech first and invalidate previous session
    this.stopSpeaking();

    const sessionId = ++this.currentSpeakId;
    this.isSpeakingActive = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Constrain rate between 0.5 and 2.0
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    // Try finding a natural US or UK English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) && !v.name.includes('Google')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onend = () => {
      if (this.currentSpeakId === sessionId && this.isSpeakingActive) {
        this.isSpeakingActive = false;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      // Do not trigger onEnd if speech was canceled or interrupted by user action
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }
      if (this.currentSpeakId === sessionId && this.isSpeakingActive) {
        this.isSpeakingActive = false;
        if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    this.isSpeakingActive = false;
    this.currentSpeakId++;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundManager = new SoundManager();
