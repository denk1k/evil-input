/* Procedural Web Audio Engine for Decibel Dino.
   Zero external assets — safe loudness cap with crunchy soft-clipping at high volume. */

(function (global) {
  'use strict';

  function makeClipCurve(amount) {
    const n = 512;
    const curve = new Float32Array(n);
    const k = Math.max(0.01, amount);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.musicGain = null;
      this.sfxGain = null;
      this.muffleFilter = null;
      this.clipShaper = null;
      this.masterGain = null;
      this.subMuteGain = null;
      this.subMuteOsc = null;
      this.noiseBuffer = null;

      this.stepAccum = 0;
      this.stepIndex = 0;
      this.beatPulse = 0;
      this.lastClipTier = -1;
      this.brakeTickAccum = 0;
      this.vacuumTickAccum = 0;

      // Catchy driving 16-step chiptune runner pattern (MIDI note numbers)
      this.bassPattern = [
        45, 0, 45, 0, 48, 0, 45, 52,
        43, 0, 43, 0, 47, 0, 50, 48
      ];
      this.leadPattern = [
        69, 72, 76, 72, 79, 0, 76, 72,
        67, 71, 74, 71, 76, 74, 72, 71
      ];
    }

    init() {
      if (this.ready) {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.0001;

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.22;

        this.muffleFilter = this.ctx.createBiquadFilter();
        this.muffleFilter.type = 'lowpass';
        this.muffleFilter.frequency.value = 18000;
        this.muffleFilter.Q.value = 1.2;

        this.clipShaper = this.ctx.createWaveShaper();
        this.clipShaper.curve = makeClipCurve(0.05);
        this.clipShaper.oversample = '2x';

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.30;

        this.musicGain.connect(this.muffleFilter);
        this.sfxGain.connect(this.muffleFilter);
        this.muffleFilter.connect(this.clipShaper);
        this.clipShaper.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Subtle ominous room-tone hum when sub-muted (< 0%)
        this.subMuteGain = this.ctx.createGain();
        this.subMuteGain.gain.value = 0;
        this.subMuteOsc = this.ctx.createOscillator();
        this.subMuteOsc.type = 'triangle';
        this.subMuteOsc.frequency.value = 62;
        this.subMuteOsc.connect(this.subMuteGain);
        this.subMuteGain.connect(this.masterGain);
        this.subMuteOsc.start();

        // Reusable 1-second white noise buffer
        const len = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        this.ready = true;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      } catch (_err) {
        this.ready = false;
      }
    }

    midiToFreq(m) {
      return 440 * Math.pow(2, (m - 69) / 12);
    }

    update(dt, state) {
      this.beatPulse = Math.max(0, this.beatPulse - dt * 4.5);
      if (!this.ready || !this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const volClamped = Math.max(0, Math.min(100, state.volume));
      const norm = volClamped / 100;

      // Map 0..100% smoothly to music gain (silent at 0%, punchy at 100%)
      const targetMusicGain = state.running
        ? (norm <= 0.005 ? 0.0001 : 0.04 + Math.pow(norm, 1.25) * 0.52)
        : 0.0001;
      this.musicGain.gain.setTargetAtTime(targetMusicGain, now, 0.04);

      // Sub-mute ambient room hum (< 0%)
      const subGain = state.running && state.volume < 0
        ? Math.min(0.14, Math.abs(state.volume) / 15 * 0.14)
        : 0;
      this.subMuteGain.gain.setTargetAtTime(subGain, now, 0.06);

      // Dynamic DSP muffle filter (rocket blowout > acoustic foam > clean)
      let targetFreq = 18000;
      if (state.muffleTimer > 0) {
        targetFreq = 340;
      } else if (state.foamCount > 0) {
        targetFreq = 1050 - state.foamCount * 160;
      } else if (state.shushTimer > 0) {
        targetFreq = 1600;
      }
      this.muffleFilter.frequency.setTargetAtTime(targetFreq, now, 0.04);

      // Warm crunchy soft-clip overdrive above 70%
      const clipTier = norm > 0.88 ? 3 : norm > 0.72 ? 2 : norm > 0.55 ? 1 : 0;
      if (clipTier !== this.lastClipTier) {
        this.lastClipTier = clipTier;
        const amounts = [0.05, 0.6, 2.2, 5.2];
        this.clipShaper.curve = makeClipCurve(amounts[clipTier]);
      }

      if (!state.running) return;

      // Escalating tempo: 128 BPM -> 170 BPM over 32 seconds
      const bpm = Math.min(174, 128 + state.elapsed * 1.35);
      const stepDur = 60 / bpm / 4; // 16th-note duration
      this.stepAccum += dt;

      while (this.stepAccum >= stepDur) {
        this.stepAccum -= stepDur;
        const rev = state.rewindTimer > 0;
        this.stepIndex = rev
          ? (this.stepIndex - 1 + 16) % 16
          : (this.stepIndex + 1) % 16;
        this._triggerMusicStep(this.stepIndex, stepDur, norm, rev, state.elapsed);
      }

      // Continuous subtle brake friction ticks
      if (state.braking) {
        this.brakeTickAccum += dt;
        if (this.brakeTickAccum >= 0.085) {
          this.brakeTickAccum = 0;
          this._playBrakeScreech(state.brakeProgress);
        }
      } else {
        this.brakeTickAccum = 0;
      }

      // Continuous mute-drone suction pulse
      if (state.latchedDrone) {
        this.vacuumTickAccum += dt;
        if (this.vacuumTickAccum >= 0.14) {
          this.vacuumTickAccum = 0;
          this._playTone(170, 125, 0.09, 'sawtooth', 0.16, this.sfxGain);
        }
      } else {
        this.vacuumTickAccum = 0;
      }
    }

    _triggerMusicStep(step, dur, norm, reversed, elapsed) {
      const now = this.ctx.currentTime;
      const pitchMult = reversed ? 0.92 : 1.0;

      // Kick pulse on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        this.beatPulse = 1.0;
        if (norm > 0.02) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(145 * pitchMult, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
          g.gain.setValueAtTime(0.45 + norm * 0.35, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.12);
        }
      }

      // Hi-hat on offbeats once moving
      if (step % 2 === 1 && norm > 0.05) {
        this._playNoise(0.03, 6000, 'highpass', 0.10, this.musicGain);
      }

      // Bassline
      const bassNote = this.bassPattern[step];
      if (bassNote && norm > 0.01) {
        const f = this.midiToFreq(bassNote) * pitchMult;
        this._playTone(f, reversed ? f * 0.9 : f, dur * 0.85, 'square', 0.22, this.musicGain);
      }

      // Energetic chiptune arpeggio lead (kicks in progressively or above 15%)
      const leadNote = this.leadPattern[step];
      if (leadNote && (norm > 0.12 || elapsed > 5)) {
        const octaveShift = elapsed > 22 ? 12 : 0;
        const f = this.midiToFreq(leadNote + octaveShift) * pitchMult;
        const fEnd = reversed ? f * 0.86 : f * 1.005;
        this._playTone(f, fEnd, dur * 0.72, 'triangle', 0.19, this.musicGain);
      }
    }

    _playTone(freqStart, freqEnd, duration, type, volume, dest) {
      if (!this.ready || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
      if (freqEnd && freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      }
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(g);
      g.connect(dest || this.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    _playNoise(duration, filterFreq, filterType, volume, dest) {
      if (!this.ready || !this.ctx || !this.noiseBuffer || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType || 'bandpass';
      filter.frequency.setValueAtTime(filterFreq || 1200, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(g);
      g.connect(dest || this.sfxGain);
      src.start(now);
      src.stop(now + duration + 0.01);
    }

    _playBrakeScreech(progress) {
      const f = 950 + progress * 900;
      this._playNoise(0.07, f, 'bandpass', 0.14, this.sfxGain);
      this._playTone(f * 0.75, f * 0.68, 0.06, 'sawtooth', 0.06, this.sfxGain);
    }

    // ---- Gameplay SFX ----

    playJump(heavy) {
      const base = heavy ? 190 : 270;
      this._playTone(base, base * 2.15, 0.11, 'square', 0.24);
    }

    playSlam() {
      this._playTone(230, 52, 0.15, 'triangle', 0.42);
      this._playNoise(0.11, 450, 'lowpass', 0.30);
    }

    playCactusSqueak() {
      // Silly rubber-chicken pitch bend
      if (!this.ready || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(980, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.22);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }

    playPellet() {
      this._playTone(1046, 1568, 0.09, 'sine', 0.24);
    }

    playBirdSteal() {
      this._playTone(920, 480, 0.12, 'sawtooth', 0.26);
      setTimeout(() => this._playTone(620, 820, 0.08, 'sawtooth', 0.20), 80);
    }

    playBirdReclaim() {
      this._playTone(260, 120, 0.07, 'square', 0.30);
      setTimeout(() => this._playTone(587, 880, 0.10, 'triangle', 0.28), 55);
      setTimeout(() => this._playTone(880, 1175, 0.13, 'triangle', 0.28), 115);
    }

    playFoam() {
      this._playNoise(0.16, 650, 'lowpass', 0.32);
      this._playTone(180, 110, 0.12, 'sine', 0.22);
    }

    playShush() {
      this._playNoise(0.32, 2600, 'bandpass', 0.36);
    }

    playPotatoHit(fancy) {
      this._playTone(fancy ? 260 : 340, 115, 0.11, 'triangle', 0.28);
      setTimeout(() => this._playTone(230, fancy ? 460 : 540, 0.10, 'sine', 0.24), 45);
    }

    playTungWood() {
      this._playTone(215, 165, 0.065, 'triangle', 0.16);
      this._playNoise(0.025, 1400, 'bandpass', 0.10);
    }

    playTungWhack() {
      this._playNoise(0.14, 1100, 'bandpass', 0.42);
      this._playTone(380, 140, 0.16, 'sawtooth', 0.34);
      setTimeout(() => this._playTone(290, 560, 0.14, 'triangle', 0.24), 55);
    }

    playTungStomp() {
      this._playTone(240, 130, 0.08, 'triangle', 0.32);
      setTimeout(() => this._playTone(660, 990, 0.14, 'triangle', 0.26), 50);
    }

    playDodgePop() {
      this._playTone(784, 988, 0.045, 'sine', 0.07);
    }

    playRadarBeep(locked) {
      this._playTone(locked ? 1380 : 880, locked ? 1420 : 880, locked ? 0.13 : 0.06, 'square', locked ? 0.24 : 0.14);
    }

    playRocketLaunch() {
      this._playNoise(0.22, 1100, 'bandpass', 0.24);
      this._playTone(340, 140, 0.18, 'sawtooth', 0.15);
    }

    playRocketBoom() {
      this._playNoise(0.38, 320, 'lowpass', 0.55);
      this._playTone(150, 34, 0.36, 'sawtooth', 0.45);
      // Faint cartoon ear-ringing sine routed straight to master (above muffle!)
      if (this.ready && this.ctx && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2550, now);
        g.gain.setValueAtTime(0.032, now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 1.85);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 1.9);
      }
    }

    playDroneLatch() {
      this._playTone(320, 210, 0.14, 'sawtooth', 0.28);
    }

    playDroneSmash() {
      this._playNoise(0.16, 1500, 'bandpass', 0.38);
      this._playTone(420, 920, 0.14, 'square', 0.26);
    }

    playRewind() {
      this._playTone(1400, 260, 0.24, 'sawtooth', 0.24);
    }

    playGravityFlip(toCeiling) {
      this._playTone(toCeiling ? 260 : 880, toCeiling ? 880 : 260, 0.22, 'triangle', 0.30);
    }

    playBassBlast() {
      this._playTone(130, 48, 0.20, 'sawtooth', 0.34);
    }

    playTrebleBeam() {
      this._playTone(1240, 980, 0.16, 'square', 0.18);
    }

    playStarPickup() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => {
        setTimeout(() => this._playTone(f, f * 1.03, 0.11, 'triangle', 0.26), i * 48);
      });
    }

    playPopup() {
      this._playTone(540, 740, 0.08, 'sine', 0.22);
    }

    playVictory100() {
      const chord = [523, 659, 784, 1046, 1318];
      chord.forEach((f, i) => {
        setTimeout(() => this._playTone(f, f, 0.34, 'square', 0.24, this.masterGain), i * 65);
      });
    }

    playVolumeLocked(vol) {
      if (vol <= 0) {
        // Sad descending trombone for locking 0% or negative volume
        [311, 293, 277, 261].forEach((f, i) => {
          setTimeout(() => this._playTone(f, f * 0.96, 0.19, 'sawtooth', 0.18, this.masterGain), i * 165);
        });
      } else {
        this._playTone(523, 523, 0.10, 'triangle', 0.24, this.masterGain);
        setTimeout(() => this._playTone(784, 784, 0.22, 'triangle', 0.24, this.masterGain), 100);
      }
    }
  }

  global.AudioEngine = AudioEngine;
})(window);
