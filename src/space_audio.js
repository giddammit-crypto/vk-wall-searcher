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
        this.musicVolume = 0.35;
        this.voiceVolume = 0.90;

        this.ambientAudio = null;
        this.voiceAudio = null;
        this.fadeInterval = null;
        this.lastVoiceTime = {};
        this.currentVoiceId = null;

        // Voice Cues Registry (22 curated Russian phrases by Bella)
        this.voiceRegistry = {
            click_1: 'audio/voice/click_1.mp3',
            click_2: 'audio/voice/click_2.mp3',
            warp_launch: 'audio/voice/warp_launch.mp3',
            welcome: 'audio/voice/welcome.mp3',
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
            station_analytics: 'audio/voice/station_analytics.mp3'
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
     * Инициализация фоновой амбиент-музыки
     */
    initAmbientMusic() {
        if (!this.ambientAudio) {
            this.ambientAudio = new Audio('audio/ambient/space_ambient_calm.mp3');
            this.ambientAudio.loop = true;
            this.ambientAudio.preload = 'auto';
            this.ambientAudio.volume = 0;
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
     * Воспроизведение реплики голосового ассистента
     * @param {string} phraseKey
     * @param {boolean} force - игнорировать кулдаун
     */
    playVoice(phraseKey, force = false) {
        if (!this.voiceEnabled) return;
        const src = this.voiceRegistry[phraseKey];
        if (!src) return;

        const now = Date.now();
        const cd = this.voiceCooldowns[phraseKey] || 0;
        if (!force && cd > 0 && this.lastVoiceTime[phraseKey]) {
            if (now - this.lastVoiceTime[phraseKey] < cd) {
                return; // На кулдауне
            }
        }
        this.lastVoiceTime[phraseKey] = now;

        // Если уже играет предыдущая реплика, останавливаем её
        if (this.voiceAudio) {
            try {
                this.voiceAudio.pause();
                this.voiceAudio.currentTime = 0;
            } catch (e) {}
        }

        this.currentVoiceId = phraseKey;
        this.voiceAudio = new Audio(src);
        this.voiceAudio.volume = this.voiceVolume;

        // Если играет амбиент-музыка, слегка приглушаем её (ducking)
        if (this.ambientAudio && this.ambientAudio.volume > 0.15) {
            const origVol = this.ambientAudio.volume;
            this.ambientAudio.volume = 0.12;
            this.voiceAudio.addEventListener('ended', () => {
                if (this.ambientAudio && this.musicEnabled) {
                    this.ambientAudio.volume = origVol;
                }
            }, { once: true });
        }

        this.voiceAudio.play().catch(err => {
            if (err.name !== 'AbortError') {
                console.warn(`[SpaceAudio] Voice playback error for "${phraseKey}":`, err);
            }
        });
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
}

export const SpaceAudio = new SpaceAudioEngine();
export default SpaceAudio;
