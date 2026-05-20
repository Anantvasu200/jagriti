class SosAlarmGenerator {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;

    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Create nodes
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      // Configure connections
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      // Sound parameters
      this.oscillator.type = 'sawtooth'; // piercing siren sound
      this.gainNode.gain.setValueAtTime(0.35, this.audioCtx.currentTime); // safe and moderate volume

      // Start oscillating
      this.oscillator.start();
      this.isPlaying = true;

      // Classic sweeping emergency siren effect
      let goingUp = true;
      const minFreq = 650;
      const maxFreq = 1200;
      let currentFreq = minFreq;

      this.intervalId = setInterval(() => {
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
        
        if (goingUp) {
          currentFreq += 45;
          if (currentFreq >= maxFreq) goingUp = false;
        } else {
          currentFreq -= 45;
          if (currentFreq <= minFreq) goingUp = true;
        }

        // Apply smooth frequency ramp
        if (this.oscillator) {
          this.oscillator.frequency.exponentialRampToValueAtTime(
            currentFreq,
            this.audioCtx.currentTime + 0.05
          );
        }
      }, 50);

    } catch (e) {
      console.error('Failed to start Web Audio API alarm:', e);
    }
  }

  stop() {
    if (!this.isPlaying) return;

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }

      this.isPlaying = false;
    } catch (e) {
      console.error('Failed to stop Web Audio API alarm:', e);
    }
  }
}

const alarmGenerator = new SosAlarmGenerator();
export default alarmGenerator;
