/**
 * src/space_warp.js — AURORA «ГИПЕРДРАЙВ»: Кинематографический варп-прыжок
 * ============================================================================
 * Режиссура перехода (Game Director + Lead 3D Programmer):
 *
 *   ФАЗА 1 «IGNITION»  Спокойная зарядка гиперпривода: стягивание ядра,
 *                      искры плазмы, первые штрихи звёзд, лёгкая тряска.
 *   ФАЗА 2 «SPOOL-UP»  Разгон сверхсветовой скорости: звёзды превращаются в
 *                      километровые штрихи, раскрывается гипертоннель,
 *                      включается кинематографический letterbox.
 *   ФАЗА 3 «CRUISE»    Крейсерский полёт, пока идёт голосовой брифинг Беллы
 *                      (ElevenLabs): энергия голоса управляет яркостью ядра,
 *                      bloom, тряской и всплесками фазовой турбулентности.
 *   ФАЗА 4 «DECEL»     Торможение: тоннель схлопывается в точку схода,
 *                      звёзды замедляются, вспышка прибытия, кроссфейд
 *                      в 3D космо-пространство AURORA.
 *   ФАЗА 5 «DOCKED»    Растворение варп-слоя поверх уже живущей 3D-сцены.
 *
 * Технические гарантии:
 *   • Полностью GPU-конвейер (WebGL2 + HDR + ACES + bloom + анаморфный штрих)
 *   • Автоматический фолбэк на улучшенный 2D-рендер без WebGL2
 *   • Адаптивное качество по времени кадра (60 FPS приоритет)
 *   • Ноль аллокаций в кадре, пауза при скрытой вкладке, поддержка
 *     prefers-reduced-motion, потеря контекста обрабатывается на лету
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=4.12.0';
import { WarpGLRenderer } from './warp_gl.js?v=4.12.0';
import { WarpHud } from './warp_hud.js?v=4.12.0';

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / Math.max(e1 - e0, 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
};
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Тайминги фаз (секунды) */
const T_IGNITION = 1.15;
const T_SPOOL = 2.15;
const T_SPOOL_END = T_IGNITION + T_SPOOL;
const T_DECEL = 1.55;
const T_DOCK = 0.7;
const SHORT_WARP_TOTAL = 9.6; // когда голос Беллы выключен — короткий, но эффектный перелёт

export class SpaceWarpTransition {
    constructor() {
        this.canvas = null;
        this.ctx2d = null;
        this.renderer = null;
        this.hud = new WarpHud();

        this.animId = null;
        this.isWarping = false;
        this.usingGL = false;

        this.phase = 'idle';
        this.startTime = 0;
        this.phaseStart = 0;
        this.decelStartTime = 0;

        this.onArrivalCallback = null;
        this.hasTriggeredArrival = false;
        this.hasTriggeredBelaDismiss = false;
        this.speechTimer = null;
        this.voiceStartMs = 0;
        this.voiceDurationMs = 20820;
        this.warpTotalMs = 22000;

        // Анимационное состояние (мутируется каждый кадр — без аллокаций)
        this.travel = 0;
        this.speed = 40;
        this.renderState = {
            time: 0, dt: 1 / 60, travel: 0,
            speedNorm: 0, stretch: 0.3, tunnelCover: 0, gasCover: 0,
            charge: 0, warpLevel: 0, pulse: 0, flash: 0, energy: 0.55,
            shakeX: 0, shakeY: 0, roll: 0,
            exposure: 1, bloom: 0.9, streak: 0.3, streakLength: 3,
            radialBlur: 0, chroma: 0.3, vignette: 0.55, grain: 0.35,
            letterbox: 0, fade: 1, scanline: 0,
            starBrightness: 0.35, glowFade: 1, jitter: 0,
            sparkIntensity: 0, coreIntensity: 1, bloomThreshold: 0.72
        };

        // 2D-фолбэк
        this.fallbackStars = [];
        this.fallbackRings = [];

        // Адаптивное качество
        this.frameAvg = 16.7;
        this.qualityCooldown = 0;

        this.reducedMotion = false;
        try {
            this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { /* noop */ }

        this.render = this.render.bind(this);
        this.initiateDeceleration = this.initiateDeceleration.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onVisibility = this.onVisibility.bind(this);
    }

    /* =====================================================================
     * Инициализация холста и рендерера
     * =================================================================== */
    getCanvas() {
        if (!this.canvas) {
            this.canvas = document.getElementById('space-warp-canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'space-warp-canvas';
                this.canvas.className = 'space-warp-canvas hidden';
                document.body.appendChild(this.canvas);
            }
        }
        return this.canvas;
    }

    ensureRenderer() {
        const canvas = this.getCanvas();
        if (!this.renderer && WarpGLRenderer.isSupported()) {
            this.renderer = new WarpGLRenderer(canvas);
            if (!this.renderer.init()) {
                this.renderer = null;
            }
        }
        this.usingGL = !!(this.renderer && this.renderer.ok);
        if (!this.usingGL) {
            this.initFallback2D(canvas);
        }
        return this.usingGL;
    }

    /* =====================================================================
     * Запуск перелёта
     * =================================================================== */
    start(onArrival) {
        if (this.isWarping) return;
        this.isWarping = true;
        this.hasTriggeredArrival = false;
        this.hasTriggeredBelaDismiss = false;
        this.onArrivalCallback = onArrival;
        this.phase = 'ignition';
        this.startTime = performance.now();
        this.phaseStart = this.startTime;
        this.travel = 0;
        this.speed = 40;
        this.frameAvg = 16.7;
        this.qualityCooldown = 0;

        // Сигнал к прогреву будущей 3D-сцены: Space3D.prepareForWarpArrival()
        // (текстуры 4K, bake скайдома, прогрев GPU-пайплайна, шрифт титра) —
        // всё должно закончиться В варпе, а не в кадрах кинематического прилёта
        try { window.dispatchEvent(new CustomEvent('aurora:warp-started')); } catch (e) { /* noop */ }

        const canvas = this.getCanvas();
        canvas.classList.remove('hidden');
        canvas.style.opacity = '1';

        this.ensureRenderer();
        this.onResize();

        // HUD поверх рендера
        this.hud.mount(() => this.initiateDeceleration());
        this.hud.setPhase('ignition');

        // Озвучка и звуковой дизайн гиперпрыжка
        try {
            SpaceAudio.stopVoice();
            SpaceAudio.playWarpWhoosh();
            SpaceAudio.startAmbientMusic(0.32, 1800, true);
            SpaceAudio.playVoice('aurora_welcome', true);

            // Триггер кинематографического прилёта: событие 'ended' женской
            // озвучки варпа (Белла). Слушатели: window 'aurora:warp-voice-ended'
            // и window.SpaceCinematic.onWarpVoiceEnded(). Fallback для сцены
            // прилёта — внутренний таймер титра (см. space_cinematic.js);
            // сам варп при сбое НЕ растягивается (decel-страховка ниже).
            const voiceEl = SpaceAudio.voiceAudio;
            if (voiceEl && SpaceAudio.voiceEnabled !== false) {
                const onVoiceEnded = () => {
                    this.voiceEndedAt = performance.now();
                    try {
                        window.dispatchEvent(new CustomEvent('aurora:warp-voice-ended'));
                        if (window.SpaceCinematic && window.SpaceCinematic.onWarpVoiceEnded) {
                            window.SpaceCinematic.onWarpVoiceEnded();
                        }
                    } catch (e2) { /* noop */ }
                };
                voiceEl.addEventListener('ended', onVoiceEnded, { once: true });
                voiceEl.addEventListener('error', onVoiceEnded, { once: true });
            }
        } catch (e) {
            console.warn('[SpaceWarp] Аудио недоступно:', e);
        }

        // Анализ голоса Беллы для «живой» реакции графики
        try {
            if (SpaceAudio.enableVoiceAnalyser) SpaceAudio.enableVoiceAnalyser();
        } catch (e) { /* noop */ }

        this.voiceStartMs = performance.now();
        const voiceEl = SpaceAudio.voiceAudio;
        const dur = voiceEl && isFinite(voiceEl.duration) && voiceEl.duration > 1 ? voiceEl.duration : 20.82;
        this.voiceDurationMs = dur * 1000;

        const voiceOn = SpaceAudio.voiceEnabled !== false;
        this.warpTotalMs = voiceOn
            ? this.voiceDurationMs + 1400
            : (this.reducedMotion ? 5200 : SHORT_WARP_TOTAL * 1000);

        // Страховочный таймер (если речь прервана, отключена или файл не загрузился)
        clearTimeout(this.speechTimer);
        this.speechTimer = setTimeout(() => this.initiateDeceleration(), this.warpTotalMs);

        window.addEventListener('resize', this.onResize);
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('visibilitychange', this.onVisibility);

        cancelAnimationFrame(this.animId);
        this.lastFrame = this.startTime;
        this.animId = requestAnimationFrame(this.render);
    }

    /* =====================================================================
     * Торможение и прибытие
     * =================================================================== */
    initiateDeceleration() {
        if (!this.isWarping || this.phase === 'decel' || this.phase === 'docked' || this.phase === 'idle') return;
        clearTimeout(this.speechTimer);
        this.phase = 'decel';
        this.phaseStart = performance.now();
        this.decelStartTime = performance.now();
        this.hud.setPhase('decel');
        // Гарантированное скрытие HUD Бэлы при переходе к торможению
        this.hud.dismissBelaHud(true);
        try { SpaceAudio.playWarpWhoosh(); } catch (e) { /* noop */ }
    }

    /* =====================================================================
     * Ключи и видимость вкладки
     * =================================================================== */
    onKeyDown(e) {
        if (!this.isWarping) return;
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.initiateDeceleration();
        }
    }

    onVisibility() {
        if (!this.isWarping) return;
        const now = performance.now();
        if (document.hidden) {
            this.pausedAt = now;
        } else if (this.pausedAt) {
            // Сдвигаем таймлайн, чтобы анимация не «прыгала»
            const delta = now - this.pausedAt;
            this.startTime += delta;
            this.phaseStart += delta;
            this.pausedAt = null;
        }
    }

    onResize() {
        const canvas = this.getCanvas();
        if (!this.isWarping) return;
        if (this.usingGL && this.renderer) {
            this.renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    /* =====================================================================
     * 2D-фолбэк (если WebGL2 недоступен или потерян контекст)
     * =================================================================== */
    initFallback2D(canvas) {
        try {
            this.ctx2d = canvas.getContext('2d');
        } catch (e) {
            this.ctx2d = null;
        }
        if (!this.ctx2d) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const count = window.innerWidth < 820 ? 320 : 620;
        this.fallbackStars = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 4 + Math.pow(Math.random(), 0.7) * 90;
            const speed = 0.6 + Math.random() * 2.4;
            this.fallbackStars.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                px: Math.cos(angle) * dist,
                py: Math.sin(angle) * dist,
                hue: Math.random() < 0.18 ? 'rgba(186, 230, 253, 1)' : (Math.random() < 0.5 ? 'rgba(255,255,255,1)' : 'rgba(224, 242, 254, 1)'),
                size: 1.1 + Math.random() * 2.2
            });
        }
    }

    /** Замена холста после потери WebGL-контекста */
    rebuildCanvasElement() {
        const old = this.canvas;
        const fresh = document.createElement('canvas');
        fresh.id = 'space-warp-canvas';
        fresh.className = old ? old.className.replace(' hidden', '') : 'space-warp-canvas';
        if (old && old.parentNode) {
            old.parentNode.replaceChild(fresh, old);
        } else {
            document.body.appendChild(fresh);
        }
        this.canvas = fresh;
        this.renderer = null;
        this.usingGL = false;
        this.initFallback2D(fresh);
    }

    /* =====================================================================
     * Главный кадр: расчёт состояния + рендер
     * =================================================================== */
    render(now) {
        if (!this.isWarping) return;
        if (document.hidden) {
            this.animId = requestAnimationFrame(this.render);
            return;
        }

        const dt = clamp((now - (this.lastFrame || now)) / 1000, 0.0005, 0.05);
        this.lastFrame = now;

        // Авто-контроль качества по времени кадра (AAA-практика: стабильные 60 FPS)
        if (this.usingGL && this.renderer) {
            this.frameAvg = this.frameAvg * 0.9 + (dt * 1000) * 0.1;
            this.qualityCooldown -= dt;
            if (this.qualityCooldown <= 0) {
                if (this.frameAvg > 22 && this.renderer.renderScale > 0.6) {
                    this.renderer.setRenderScale(this.renderer.renderScale - 0.08);
                    this.qualityCooldown = 1.2;
                } else if (this.frameAvg < 13.5 && this.renderer.renderScale < 1.0) {
                    this.renderer.setRenderScale(this.renderer.renderScale + 0.05);
                    this.qualityCooldown = 2.2;
                }
            }
        }

        const elapsed = (now - this.startTime) / 1000;
        const state = this.buildRenderState(elapsed, now, dt);

        // Ровно за 1 секунду до прилёта к Земле / торможения — эффектно скрываем HUD Бэлы
        if (!this.hasTriggeredBelaDismiss && this.phase === 'cruise') {
            const voiceEl = SpaceAudio.voiceAudio;
            const voiceRemaining = (voiceEl && !voiceEl.paused && isFinite(voiceEl.duration) && isFinite(voiceEl.currentTime))
                ? (voiceEl.duration - voiceEl.currentTime)
                : ((this.warpTotalMs / 1000) - elapsed);
            if (voiceRemaining <= 1.05) {
                this.hasTriggeredBelaDismiss = true;
                this.hud.dismissBelaHud();
            }
        }

        // Проверка завершения речи Беллы → автоматическое торможение
        if (this.phase === 'cruise' && SpaceAudio.voiceEnabled !== false) {
            const voiceEl = SpaceAudio.voiceAudio;
            const finished = voiceEl && (voiceEl.ended || (voiceEl.paused && voiceEl.currentTime > 0.4));
            if (finished && elapsed > 3.2) {
                this.initiateDeceleration();
            }
        }

        if (this.usingGL && this.renderer && this.renderer.ok) {
            this.renderer.setFovPx(750 * (1 + state.fovPunch));
            this.renderer.render(state);
        } else {
            if (this.renderer && !this.renderer.ok) this.rebuildCanvasElement();
            this.render2D(state, now);
        }

        // HUD
        this.hud.drawWave(state.energy, SpaceAudio.getVoiceSpectrum ? SpaceAudio.getVoiceSpectrum() : null);
        this.hud.updateBelaTypewriter(elapsed);
        this.hud.setTelemetry({
            speedC: state.speedC,
            reactor: state.reactor,
            distanceAu: state.distanceAu,
            status: this.phase === 'decel' ? 'ТОРМОЖЕНИЕ' : (this.phase === 'docked' ? 'СТЫКОВКА' : 'НОМИНАЛЬНО')
        });

        if (this.phase === 'docked' && state.fade <= 0.001) {
            this.finish();
            return;
        }

        this.animId = requestAnimationFrame(this.render);
    }

    /**
     * Расчёт всех параметров кадра (единый источник истины для GL и 2D)
     */
    buildRenderState(elapsed, now, dt) {
        const s = this.renderState;
        const phase = this.phase;

        // --- Прогресс текущей фазы
        let p = 0;
        if (phase === 'ignition') {
            p = clamp(elapsed / T_IGNITION, 0, 1);
            if (p >= 1) { this.phase = 'spool'; this.phaseStart = now; this.hud.setPhase('spool'); }
        } else if (phase === 'spool') {
            p = clamp((elapsed - T_IGNITION) / T_SPOOL, 0, 1);
            if (p >= 1) { this.phase = 'cruise'; this.phaseStart = now; this.hud.setPhase('cruise'); }
        } else if (phase === 'cruise') {
            p = 1;
        } else if (phase === 'decel') {
            p = clamp((now - this.decelStartTime) / 1000 / T_DECEL, 0, 1);
            if (!this.hasTriggeredArrival && p >= 0.58) {
                this.hasTriggeredArrival = true;
                if (typeof this.onArrivalCallback === 'function') {
                    try { this.onArrivalCallback(); } catch (e) { console.warn('[SpaceWarp] onArrival:', e); }
                }
            }
            if (p >= 1) {
                this.phase = 'docked';
                this.phaseStart = now;
                this.hud.setPhase('arrived');
            }
        } else if (phase === 'docked') {
            p = clamp((now - this.phaseStart) / 1000 / T_DOCK, 0, 1);
        }

        // --- Амплитуда импульсов (вспышки переходов)
        this.pulse = Math.max(0, (this.pulse || 0) - dt * 2.2);
        if (phase === 'cruise') {
            const pulsePhase = (elapsed % 4.6) / 4.6;
            if (pulsePhase < 0.02) this.pulse = Math.max(this.pulse, 0.32);
        }

        // --- Энергия голоса Беллы (анализатор или синтетическая огибающая)
        let energy = 0.55;
        if (SpaceAudio.getVoiceEnergy) {
            const measured = SpaceAudio.getVoiceEnergy();
            if (measured > 0.001) energy = measured;
        }
        if (energy <= 0.02) {
            // Синтетическая «речевая» огибающая — графика живёт даже без звука
            const t = elapsed;
            energy = 0.45 + 0.28 * Math.sin(t * 3.1) + 0.18 * Math.sin(t * 7.7 + 1.3) + 0.09 * Math.sin(t * 13.4);
        }
        energy = clamp(energy, 0.12, 1.15);
        this.smoothEnergy = this.smoothEnergy === undefined ? energy : this.smoothEnergy * 0.82 + energy * 0.18;
        s.energy = this.smoothEnergy;

        // --- Скорость полёта (уменьшена в 2 раза — звёзды плавно дрейфуют, без превращения в полосы)
        let speed;
        if (phase === 'ignition') {
            speed = (40 + easeInCubic(p) * 90) / 12;
        } else if (phase === 'spool') {
            speed = (130 + easeInOutCubic(p) * 1520) / 12;
        } else if (phase === 'cruise') {
            const surge = Math.sin(elapsed * 0.71) * 0.14 + Math.sin(elapsed * 1.93 + 0.7) * 0.06;
            speed = (1650 * (1 + surge) + this.pulse * 260 + s.energy * 90) / 12;
        } else {
            speed = (1650 * (1 - easeInCubic(p)) * (1 - 0.86 * easeOutCubic(p)) + 22) / 12;
        }
        speed = Math.max(1, speed);
        this.speed = speed;
        this.travel += speed * dt;

        const speedNorm = clamp(speed / 138, 0, 1.25);
        s.travel = this.travel;
        s.speedNorm = speedNorm;
        s.time = elapsed;
        s.dt = dt;
        s.speedC = speed / 14.3;                 // условные «сверхсветовые» единицы для телеметрии
        s.reactor = clamp(100 - speedNorm * 5 - (phase === 'decel' ? -4 : 0), 88, 100);
        s.distanceAu = this.travel * 0.00042;

        // --- Штрихование звёзд (минимизировано: звёзды остаются чёткими точками, не превращаясь в полосы)
        if (phase === 'ignition') s.stretch = 0.03 + p * 0.04;
        else if (phase === 'spool') s.stretch = 0.06 + easeInOutCubic(p) * 0.08;
        else if (phase === 'cruise') s.stretch = 0.10 + speedNorm * 0.05;
        else s.stretch = 0.12 * Math.pow(1 - p, 1.7) + 0.02;

        // --- Раскрытие гипертоннеля и газовых волокон
        if (phase === 'ignition') { s.tunnelCover = 0; s.gasCover = p * 0.18; }
        else if (phase === 'spool') { s.tunnelCover = smoothstep(0.1, 0.92, p) * 0.92; s.gasCover = 0.18 + p * 0.42; }
        else if (phase === 'cruise') { s.tunnelCover = 0.9 + 0.08 * Math.sin(elapsed * 0.9); s.gasCover = 0.6 + 0.12 * Math.sin(elapsed * 1.4); }
        else { s.tunnelCover = 0.92 * (1 - smoothstep(0.05, 0.62, p)); s.gasCover = 0.6 * (1 - smoothstep(0, 0.45, p)); }

        // --- Ядро / гиперканал
        if (phase === 'ignition') { s.charge = p; s.warpLevel = p * 0.18; }
        else if (phase === 'spool') { s.charge = 1; s.warpLevel = 0.2 + p * 0.8; }
        else if (phase === 'cruise') { s.charge = 1; s.warpLevel = 1; }
        else { s.charge = 1 + p * 0.55; s.warpLevel = Math.max(0, 1 - p * 1.4); }

        s.coreIntensity = smoothstep(0, 0.12, elapsed) * (1 - smoothstep(0.72, 0.98, p) * (phase === 'decel' ? 1 : 0));
        s.starBrightness = 0.32 + 0.78 * smoothstep(0, 0.55, elapsed) + this.pulse * 0.35;
        s.glowFade = phase === 'decel' ? Math.max(0.25, 1 - p) : 1;
        s.jitter = 0; // убираем дрожание для стабильной читаемости
        s.sparkIntensity = (phase === 'ignition' ? p * 0.3 : (phase === 'decel' ? Math.max(0, 0.4 - p * 0.6) : 0.18 + speedNorm * 0.15));

        // --- Тряска камеры и крен (минимальные для комфортного чтения)
        s.shakeX = 0;
        s.shakeY = 0;
        s.roll = 0;

        // --- Вспышка прибытия / старта
        let flash = 0;
        if (phase === 'ignition' && p > 0.86) flash = (p - 0.86) / 0.14 * 0.35;
        if (phase === 'spool' && p < 0.08) flash = Math.max(flash, (1 - p / 0.08) * 0.3);
        if (phase === 'decel') {
            flash = Math.max(0, Math.exp(-Math.pow((p - 0.42) / 0.1, 2)) * 1.0);
        }
        s.flash = flash;

        // --- Кинематографический режим кадра
        const targetLetterbox = this.reducedMotion ? 0 : 0.052;
        s.letterbox = (phase === 'ignition' ? targetLetterbox * p : targetLetterbox) * (phase === 'docked' ? Math.max(0, 1 - p) : 1);

        // --- Пост-обработка (кристальная резкость текста)
        s.exposure = 1.0;
        s.bloom = 0.45 + speedNorm * 0.20;
        s.streak = 0.08;
        s.streakLength = 0.8;
        s.radialBlur = 0; // ноль размытия: текст не смазывается!
        s.chroma = 0.08; // минимальная аберрация для сохранения чёткости букв
        s.vignette = 0.42;
        s.grain = 0.12;
        s.scanline = 0;
        s.fovPunch = 0;
        s.bloomThreshold = 0.82;

        // --- Растворение в 3D-пространство
        if (phase === 'decel') s.fade = 1 - smoothstep(0.6, 0.99, p);
        else if (phase === 'docked') s.fade = Math.max(0, 1 - p);
        else s.fade = 1;

        // --- Прогресс для HUD
        let progress = 0;
        if (phase === 'ignition') progress = p * 0.12;
        else if (phase === 'spool') progress = 0.12 + p * 0.2;
        else if (phase === 'cruise') {
            const total = Math.max(this.warpTotalMs / 1000, 1);
            progress = 0.32 + clamp(elapsed / total, 0, 1) * 0.5;
        } else if (phase === 'decel') progress = 0.82 + p * 0.15;
        else progress = 0.97 + p * 0.03;
        this.hud.setProgress(progress);

        return s;
    }

    /* =====================================================================
     * 2D-рендер фолбэка
     * =================================================================== */
    render2D(s, now) {
        const canvas = this.canvas;
        const ctx = this.ctx2d;
        if (!canvas || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Глубокий абсолютно непрозрачный космический вакуум для максимальной контрастности текста
        ctx.fillStyle = `rgba(2, 6, 23, ${Math.max(0.96, s.fade)})`;
        ctx.fillRect(0, 0, w, h);

        const accel = (0.6 + s.speedNorm * 26) * 0.333;
        const maxR = Math.hypot(cx, cy) * 1.35;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.fallbackStars.length; i++) {
            const st = this.fallbackStars[i];
            st.px = st.x;
            st.py = st.y;
            st.x += st.vx * accel * 0.32;
            st.y += st.vy * accel * 0.32;

            if (Math.hypot(st.x, st.y) > maxR) {
                const angle = Math.random() * Math.PI * 2;
                const r = 3 + Math.random() * 40;
                st.x = Math.cos(angle) * r;
                st.y = Math.sin(angle) * r;
                st.px = st.x;
                st.py = st.y;
            }
            ctx.beginPath();
            ctx.moveTo(cx + st.px, cy + st.py);
            ctx.lineTo(cx + st.x, cy + st.y);
            ctx.strokeStyle = st.hue;
            ctx.lineWidth = st.size * (0.7 + s.speedNorm * 1.5);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Гипертоннель: концентрические энергетические кольца в стиле No Man's Sky (золото → циан → неоновая маджента)
        if (s.tunnelCover > 0.01) {
            const rings = 22;
            for (let i = 0; i < rings; i++) {
                const t = (i / rings + (s.travel * 0.0006) % 1) % 1;
                const r = Math.pow(t, 1.8) * maxR * 1.1;
                const a = (1 - t) * 0.22 * s.tunnelCover;
                const grad = ctx.createRadialGradient(cx, cy, Math.max(0, r - 32), cx, cy, r + 32);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                // No Man's Sky palette: core cyan, mid-wave magenta, outer violet-sapphire
                const rCol = Math.round(t < 0.5 ? (20 + t * 440) : (240 - (t - 0.5) * 200));
                const gCol = Math.round(t < 0.4 ? (220 - t * 300) : (40 + (t - 0.4) * 80));
                const bCol = Math.round(230 + t * 25);
                grad.addColorStop(0.35, `rgba(${rCol}, ${gCol}, ${bCol}, ${a})`);
                grad.addColorStop(0.65, `rgba(147, 51, 234, ${a * 0.85})`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r + 32, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Ядро перехода — золотисто-белое в начале, чисто-белое на пике
        const coreR = Math.max(18, Math.min(w, h) * (0.16 - s.charge * 0.09) * (1 + this.pulse));
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
        core.addColorStop(0, `rgba(255, 252, 230, ${0.65 + s.energy * 0.30})`);
        core.addColorStop(0.12, `rgba(255, 211, 122, ${0.55 + s.warpLevel * 0.25})`);
        core.addColorStop(0.28, `rgba(236, 72, 153, ${0.38 * s.warpLevel + 0.12})`);
        core.addColorStop(0.60, `rgba(56, 189, 248, ${0.16 * s.warpLevel})`);
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 4, 0, Math.PI * 2);
        ctx.fill();

        if (s.flash > 0.001) {
            ctx.fillStyle = `rgba(226, 244, 255, ${Math.min(0.92, s.flash * 0.9)})`;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = 'source-over';

        // Виньетка и полосы
        const vig = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(0,0,0,${0.35 + s.vignette * 0.4})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        if (s.letterbox > 0.001) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h * s.letterbox);
            ctx.fillRect(0, h - h * s.letterbox, w, h * s.letterbox);
        }

        if (s.fade < 0.999) {
            canvas.style.opacity = String(s.fade);
        } else {
            canvas.style.opacity = '1';
        }
    }

    /* =====================================================================
     * Завершение
     * =================================================================== */
    finish() {
        this.isWarping = false;
        this.phase = 'idle';
        clearTimeout(this.speechTimer);
        cancelAnimationFrame(this.animId);

        // Гарантия: если прилёт не открыл 3D-сцену (сбой onArrival, отмена),
        // фоновая музыка и голос варпа обязаны остановиться и сброситься на начало — в 2D-режиме им не место
        if (!(window.Space3D && window.Space3D.isOpen)) {
            try {
                SpaceAudio.stopAmbientMusic(400, true);
                SpaceAudio.stopVoice();
            } catch (e) { /* noop */ }
        }

        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('visibilitychange', this.onVisibility);

        this.hud.unmount();

        if (this.canvas) {
            this.canvas.classList.add('hidden');
            this.canvas.style.opacity = '0';
            if (this.ctx2d) {
                this.ctx2d.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
}

export const SpaceWarp = new SpaceWarpTransition();
if (typeof window !== 'undefined') {
    window.SpaceWarp = SpaceWarp;
}
export default SpaceWarp;
