/**
 * src/space_audio.js — High-Fidelity Audio System for 3D Cosmic Space
 * ============================================================================
 * - ElevenLabs Russian Multilingual Voice Assistant (Bella)
 * - Seamless Calming Ambient Cosmic Music with fade-in/fade-out
 * - Sound FX (Warp Whoosh, Beeps)
 * - HUD Sound Controls & Persistent Preferences
 * ============================================================================
 */

export class SpaceAudioEngine {
    constructor() {
        this.musicEnabled = localStorage.getItem('space3d_music_enabled') !== 'false';
        this.voiceEnabled = localStorage.getItem('space3d_voice_enabled') !== 'false';
        this.musicVolume = 0.65; // David Bowie - Space Oddity 65% volume
        this.voiceVolume = 0.90;

        this.ambientAudio = null;
        this.voiceAudio = null;
        this.fadeInterval = null;
        this.lastVoiceTime = {};
        this.currentVoiceId = null;
        this.isSpeaking = false;
        this.currentPriority = 0;

        // Voice Cues Registry (Curated Russian phrases by Bella)
        this.voiceRegistry = {
            click_1: 'audio/voice/click_1.mp3',
            click_2: 'audio/voice/click_2.mp3',
            warp_launch: 'audio/voice/warp_launch.mp3',
            aurora_welcome: 'audio/voice/aurora_welcome.mp3',
            welcome: 'audio/voice/aurora_welcome.mp3', // Map welcome to full majestic greeting
            exit_2d: 'audio/voice/exit_2d.mp3',
            cam_rotate: 'audio/voice/cam_rotate.mp3',
            cam_reset: 'audio/voice/cam_reset.mp3',
            zoom_in: 'audio/voice/zoom_in.mp3',
            zoom_out: 'audio/voice/zoom_out.mp3',
            drag_start: 'audio/voice/drag_start.mp3',
            drag_end: 'audio/voice/drag_end.mp3',
            reset_positions: 'audio/voice/reset_positions.mp3',
            pin: 'audio/voice/pin.mp3',
            unpin: 'audio/voice/unpin.mp3',
            layout_orbit: 'audio/voice/layout_orbit.mp3',
            layout_arc: 'audio/voice/layout_arc.mp3',
            layout_grid: 'audio/voice/layout_grid.mp3',
            tour_start: 'audio/voice/tour_start.mp3',
            tour_stop: 'audio/voice/tour_stop.mp3',
            focus: 'audio/voice/focus.mp3',
            station_search: 'audio/voice/station_search.mp3',
            station_analytics: 'audio/voice/station_analytics.mp3',
            mode_360_on: 'audio/voice/mode_360_on.mp3',
            mode_360_off: 'audio/voice/mode_360_off.mp3',
            window_expand: 'audio/voice/window_expand.mp3',
            window_collapse: 'audio/voice/window_collapse.mp3'
        };

        // Priority weights to eliminate voice interruptions (higher number = cannot be interrupted by lower)
        this.voicePriorities = {
            aurora_welcome: 10,
            welcome: 10,
            mode_360_on: 9,
            mode_360_off: 9,
            warp_launch: 8,
            click_1: 8,
            click_2: 8,
            window_expand: 7,
            window_collapse: 7,
            exit_2d: 7,
            layout_orbit: 5,
            layout_arc: 5,
            layout_grid: 5,
            reset_positions: 5,
            tour_start: 5,
            tour_stop: 5,
            pin: 4,
            unpin: 4,
            focus: 4,
            station_search: 4,
            station_analytics: 4,
            drag_start: 2,
            drag_end: 2,
            cam_reset: 2,
            cam_rotate: 1,
            zoom_in: 1,
            zoom_out: 1
        };

        // Cooldowns to prevent speech spamming on continuous gestures (e.g. cam rotation or zoom)
        this.voiceCooldowns = {
            cam_rotate: 15000,
            zoom_in: 8000,
            zoom_out: 8000,
            drag_start: 5000,
            drag_end: 4000,
            focus: 4000
        };
    }

    /**
     * Инициализация фоновой амбиент-музыки (David Bowie - Space Oddity)
     */
    initAmbientMusic(src = 'audio/ambient/david_bowie_space_oddity.mp3') {
        if (!this.ambientAudio) {
            this.ambientAudio = new Audio(src);
            this.ambientAudio.loop = true;
            this.ambientAudio.preload = 'auto';
            this.ambientAudio.volume = 0;
        } else if (src && this.ambientAudio.src && !this.ambientAudio.src.includes(src)) {
            this.ambientAudio.src = src;
        }
    }

    /**
     * Плавный старт амбиент-музыки
     */
    startAmbientMusic(targetVol = this.musicVolume, durationMs = 1500) {
        if (!this.musicEnabled) return;
        this.initAmbientMusic();

        clearInterval(this.fadeInterval);
        this.ambientAudio.play().catch(e => {
            console.warn('[SpaceAudio] Ambient autoplay prevented by browser policy:', e);
        });

        const stepTime = 50;
        const totalSteps = durationMs / stepTime;
        let step = 0;
        const startVol = this.ambientAudio.volume;

        this.fadeInterval = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            const cur = startVol + (targetVol - startVol) * progress;
            if (this.ambientAudio) {
                this.ambientAudio.volume = Math.max(0, Math.min(1, cur));
            }
            if (step >= totalSteps) {
                clearInterval(this.fadeInterval);
                if (this.ambientAudio) this.ambientAudio.volume = targetVol;
            }
        }, stepTime);
    }

    /**
     * Плавная остановка музыки
     */
    stopAmbientMusic(durationMs = 900) {
        if (!this.ambientAudio) return;
        clearInterval(this.fadeInterval);

        const stepTime = 50;
        const totalSteps = durationMs / stepTime;
        let step = 0;
        const startVol = this.ambientAudio.volume;

        this.fadeInterval = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            const cur = startVol * (1 - progress);
            if (this.ambientAudio) {
                this.ambientAudio.volume = Math.max(0, cur);
            }
            if (step >= totalSteps) {
                clearInterval(this.fadeInterval);
                if (this.ambientAudio) {
                    this.ambientAudio.pause();
                    this.ambientAudio.volume = 0;
                }
            }
        }, stepTime);
    }

    /**
     * Воспроизведение звука варп-перехода
     */
    playWarpWhoosh() {
        try {
            const whoosh = new Audio('audio/ambient/warp_whoosh.mp3');
            whoosh.volume = 0.75;
            whoosh.play().catch(() => {});
        } catch (e) {
            console.warn('[SpaceAudio] Failed to play warp whoosh:', e);
        }
    }

    /**
     * Воспроизведение реплики голосового ассистента без прерываний
     * @param {string} phraseKey
     * @param {boolean} force - игнорировать кулдаун
     */
    playVoice(phraseKey, force = false) {
        if (!this.voiceEnabled) return;
        const src = this.voiceRegistry[phraseKey];
        if (!src) return;

        const newPriority = this.voicePriorities[phraseKey] || 3;

        // Если прямо сейчас звучит речь более высокого приоритета — НЕ ПРЕРЫВАТЬ!
        if (this.isSpeaking && this.voiceAudio && !this.voiceAudio.paused) {
            if (newPriority < this.currentPriority) {
                return; // Младший приоритет (поворот, зум, клик) не может перебить приветствие или переключение режима!
            }
            // Если приоритет равен или выше — плавно гасим предыдущую реплику
            try {
                this.voiceAudio.pause();
                this.voiceAudio.currentTime = 0;
            } catch (e) {}
        }

        const now = Date.now();
        const cd = this.voiceCooldowns[phraseKey] || 0;
        if (!force && cd > 0 && this.lastVoiceTime[phraseKey]) {
            if (now - this.lastVoiceTime[phraseKey] < cd) {
                return; // На кулдауне
            }
        }
        this.lastVoiceTime[phraseKey] = now;

        this.currentVoiceId = phraseKey;
        this.currentPriority = newPriority;
        this.isSpeaking = true;

        this.voiceAudio = new Audio(src);
        this.voiceAudio.volume = this.voiceVolume;
        // Живой анализ голоса для реакции графики варп-перехода
        this._attachAnalyser(this.voiceAudio);

        // Дакинг амбиент-музыки: плавно приглушаем фон, пока говорит Белла
        let restoreVolume = null;
        if (this.ambientAudio && this.ambientAudio.volume > 0.12) {
            restoreVolume = this.ambientAudio.volume;
            this.ambientAudio.volume = 0.08;
        }

        const finishVoice = () => {
            this.isSpeaking = false;
            this.currentPriority = 0;
            if (this.ambientAudio && this.musicEnabled && restoreVolume !== null) {
                this.ambientAudio.volume = restoreVolume;
            }
        };

        this.voiceAudio.addEventListener('ended', finishVoice, { once: true });
        this.voiceAudio.addEventListener('error', finishVoice, { once: true });

        this.voiceAudio.play().catch(err => {
            finishVoice();
            if (err.name !== 'AbortError') {
                console.warn(`[SpaceAudio] Voice playback error for "${phraseKey}":`, err);
            }
        });
    }

    /* =====================================================================
     * ЖИВОЙ АНАЛИЗ ГОЛОСА БЕЛЛЫ (WebAudio AnalyserNode)
     * Используется графикой гиперпрыжка: громкость и тембр речи управляют
     * яркостью ядра, bloom, тряской камеры и всплесками турбулентности.
     * =================================================================== */

    /**
     * Включение анализатора голоса (безопасно: звук никогда не теряется —
     * маршрут WebAudio подключается ТОЛЬКО при гарантированно работающем
     * AudioContext, иначе используется синтетическая огибающая).
     */
    enableVoiceAnalyser() {
        if (!this._audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            try {
                this._audioCtx = new AC();
                this._analyser = this._audioCtx.createAnalyser();
                this._analyser.fftSize = 512;
                this._analyser.smoothingTimeConstant = 0.74;
                this._spectrum = new Uint8Array(this._analyser.frequencyBinCount);
                this._waveform = new Uint8Array(this._analyser.fftSize);
            } catch (e) {
                console.warn('[SpaceAudio] Анализатор голоса недоступен:', e);
                this._audioCtx = null;
                return false;
            }
        }

        const finish = () => {
            this._analyserReady = this._audioCtx && this._audioCtx.state === 'running';
            if (this._analyserReady) this._attachAnalyser(this.voiceAudio);
        };

        if (this._audioCtx.state === 'running') {
            finish();
            return true;
        }
        this._audioCtx.resume().then(finish).catch(() => { this._analyserReady = false; });
        return false;
    }

    /**
     * Подключение анализатора к медиа-элементу (однократно на элемент)
     */
    _attachAnalyser(el) {
        if (!el || !this._analyserReady || !this._audioCtx || el.__auroraAnalysed) return;
        try {
            const source = this._audioCtx.createMediaElementSource(el);
            source.connect(this._analyser);
            this._analyser.connect(this._audioCtx.destination);
            el.__auroraAnalysed = true;
        } catch (e) {
            // Элемент уже занят другим маршрутом — просто продолжаем без анализа
            el.__auroraAnalysed = true;
        }
    }

    /**
     * Энергия голоса 0..1 (RMS) — для реактивной графики
     */
    getVoiceEnergy() {
        if (!this._analyserReady || !this._analyser || !this._spectrum) return 0;
        const voice = this.voiceAudio;
        if (!voice || voice.paused || voice.ended) return 0;
        try {
            this._analyser.getByteFrequencyData(this._spectrum);
        } catch (e) {
            return 0;
        }
        let sum = 0;
        const n = this._spectrum.length;
        for (let i = 0; i < n; i++) sum += this._spectrum[i];
        const avg = sum / (n * 255);
        return Math.min(1.15, Math.pow(avg * 2.35, 0.85));
    }

    /**
     * Спектр голоса (Uint8Array) — для осциллографа HUD
     */
    getVoiceSpectrum() {
        if (!this._analyserReady || !this._analyser || !this._spectrum) return null;
        const voice = this.voiceAudio;
        if (!voice || (voice.paused && !voice.ended)) return null;
        if (!voice.paused) {
            try { this._analyser.getByteFrequencyData(this._spectrum); } catch (e) { return null; }
        }
        return this._spectrum;
    }

    /**
     * Переключение музыки
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('space3d_music_enabled', String(this.musicEnabled));
        if (this.musicEnabled) {
            this.startAmbientMusic();
        } else {
            this.stopAmbientMusic(400);
        }
        return this.musicEnabled;
    }

    /**
     * Переключение голоса
     */
    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        localStorage.setItem('space3d_voice_enabled', String(this.voiceEnabled));
        if (!this.voiceEnabled && this.voiceAudio) {
            try {
                this.voiceAudio.pause();
            } catch (e) {}
        }
        return this.voiceEnabled;
    }

    /**
     * Синтез глубокого кинематографичного звука взрыва Сверхновой (Web Audio API)
     */
    playSupernovaSound() {
        if (!this.musicEnabled && !this.voiceEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audioCtx) this.audioCtx = new AudioContext();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const now = this.audioCtx.currentTime;

            // 1. Ультранизкий саб-бас детонации
            const osc = this.audioCtx.createOscillator();
            const oscGain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(26, now + 1.9);
            oscGain.gain.setValueAtTime(0.55, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            osc.connect(oscGain);
            oscGain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 2.6);

            // 2. Рокот ударной волны (фильтрованный шум)
            const bufLen = Math.floor(this.audioCtx.sampleRate * 2.2);
            const noiseBuf = this.audioCtx.createBuffer(1, bufLen, this.audioCtx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = noiseBuf;

            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(45, now + 2.2);
            filter.Q.setValueAtTime(4.5, now);

            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.48, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.audioCtx.destination);
            noise.start(now);
            noise.stop(now + 2.3);

            // 3. Космический ионизационный перезвон
            const chime = this.audioCtx.createOscillator();
            const chimeGain = this.audioCtx.createGain();
            chime.type = 'triangle';
            chime.frequency.setValueAtTime(880, now);
            chime.frequency.exponentialRampToValueAtTime(220, now + 1.2);
            chimeGain.gain.setValueAtTime(0.22, now);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            chime.connect(chimeGain);
            chimeGain.connect(this.audioCtx.destination);
            chime.start(now);
            chime.stop(now + 1.3);
        } catch (e) {
            console.warn('[SpaceAudio] Supernova sound synth failed:', e);
        }
    }

    /**
     * Высокотехнологичный сигнал телеметрии МКС (двойной короткий чирп 1760 Гц -> 2640 Гц)
     */
    playIssTelemetrySound() {
        try {
            this.initAudioContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;

            [0, 0.09].forEach((delay, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                const f = idx === 0 ? 1760 : 2640;
                osc.frequency.setValueAtTime(f, now + delay);
                osc.frequency.exponentialRampToValueAtTime(f * 1.12, now + delay + 0.055);

                gain.gain.setValueAtTime(0.18, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.055);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.065);
            });
        } catch (e) {
            console.warn('[SpaceAudio] ISS telemetry sound synth failed:', e);
        }
    }

    /**
     * Легендарный Quindar-тон связи с экипажем (2525 Гц короткий тон космической связи)
     */
    playQuindarTone(isIntro = true) {
        try {
            this.initAudioContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            const freq = isIntro ? 2525 : 2475;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {
            // silent fallback
        }
    }
}

export const SpaceAudio = new SpaceAudioEngine();
if (typeof window !== 'undefined') {
    window.SpaceAudio = SpaceAudio;
}
export default SpaceAudio;
