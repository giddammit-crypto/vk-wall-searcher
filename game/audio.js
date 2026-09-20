/**
 * COSMO: LIBRARY RUNNER & CYBER FIXER — Web Audio API Procedural Audio Engine
 * Zero external audio files — 100% procedurally synthesized retro-modern chiptune
 */

class GameAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        
        this.isMuted = localStorage.getItem('cosmo_game_muted') === 'true';
        this.musicPlaying = false;
        this.currentPatternIndex = 0;
        this.musicTimer = null;
        this.tempo = 138; // BPM
        
        this.initialized = false;
    }

    init() {
        if (this.initialized && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('cosmo_game_muted', this.isMuted);
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    // --- SFX SYNTHESIZERS ---

    playJump() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playDoubleJump() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.18);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playLand() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playRepairHum() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180 + Math.random() * 40, now);
        osc.frequency.linearRampToValueAtTime(320 + Math.random() * 50, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playSpark() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(900 + Math.random() * 600, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    playFixComplete() {
        if (!this.initialized || this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.28);
        });
    }

    playHit() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.38);
    }

    playPowerup(type = 'coffee') {
        if (!this.initialized || this.isMuted) return;
        let notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
        if (type === 'flash') notes = [659, 880, 1108, 1318];
        if (type === 'shield') notes = [330, 440, 554, 659];

        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.2);
        });
    }

    playLevelWin() {
        if (!this.initialized || this.isMuted) return;
        const melody = [
            { f: 523.25, d: 0.12 }, // C5
            { f: 659.25, d: 0.12 }, // E5
            { f: 783.99, d: 0.12 }, // G5
            { f: 1046.50, d: 0.25 }, // C6
            { f: 880.00, d: 0.12 }, // A5
            { f: 1046.50, d: 0.4 }  // C6 long
        ];

        let offset = 0;
        melody.forEach(item => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(item.f, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + item.d);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + item.d);

            offset += item.d + 0.02;
        });
    }

    playGameOver() {
        if (!this.initialized || this.isMuted) return;
        const notes = [440, 392, 349, 293]; // A, G, F, D
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.22;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    // --- PROCEDURAL CHIPTUNE BACKGROUND MUSIC ---

    startMusic() {
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        this.stepIndex = 0;
        this.scheduleMusicStep();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusicStep() {
        if (!this.musicPlaying || !this.ctx) return;

        const secondsPerBeat = 60.0 / this.tempo;
        const stepDuration = secondsPerBeat / 2; // 8th notes

        // 16-step bassline & arpeggio pattern in D-minor / C-major cyber mode
        const bassNotes = [
            146.83, 0, 146.83, 174.61, 146.83, 0, 220.00, 196.00, // D3, F3, A3, G3
            130.81, 0, 130.81, 164.81, 130.81, 0, 196.00, 174.61  // C3, E3, G3, F3
        ];
        const leadNotes = [
            293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 392.00, 293.66,
            261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 349.23, 261.63
        ];

        const step = this.stepIndex % 16;
        const now = this.ctx.currentTime;

        // Play Bass Note
        const bassFreq = bassNotes[step];
        if (bassFreq > 0 && !this.isMuted) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(bassFreq, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.02, now + stepDuration * 0.9);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + stepDuration * 0.9);
        }

        // Play Chiptune Arp/Lead
        const leadFreq = leadNotes[step];
        if (leadFreq > 0 && !this.isMuted && step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(leadFreq, now);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + stepDuration * 0.7);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + stepDuration * 0.7);
        }

        // Play Hi-Hat / Click on off-beats
        if (step % 2 === 1 && !this.isMuted) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200 + Math.random() * 800, now);

            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.04);
        }

        this.stepIndex++;
        const nextTime = (stepDuration * 1000);
        this.musicTimer = setTimeout(() => this.scheduleMusicStep(), nextTime);
    }
}

// Global Audio Instance
window.gameAudio = new GameAudio();
