/**
 * src/space_warp.js — Cosmic Warp Screen-Fill Transition Engine
 * ============================================================================
 * Кинематографичный переход со средней скоростью:
 * 1. Радиальный гиперпространственный разгон звезд и туманностей из центра
 * 2. Полное заполнение экрана светящимся космическим потоком
 * 3. Бесшовное раскрытие 3D Космо-пространства на пике заполнения
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=3.7.8';

export class SpaceWarpTransition {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.isWarping = false;
        this.stars = [];
        this.durationMs = 1450; // Средняя скорость заполнения экрана (~1.45 сек)
        this.startTime = 0;
        this.onPeakCallback = null;
        this.hasTriggeredPeak = false;

        this.render = this.render.bind(this);
    }

    /**
     * Создание или получение холста варп-перехода
     */
    getCanvas() {
        if (!this.canvas) {
            this.canvas = document.getElementById('space-warp-canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'space-warp-canvas';
                this.canvas.className = 'space-warp-canvas hidden';
                document.body.appendChild(this.canvas);
            }
            this.ctx = this.canvas.getContext('2d');
        }
        return this.canvas;
    }

    /**
     * Инициализация частиц для радиального гиперпространственного разгона
     */
    initParticles(w, h) {
        const count = 420;
        this.stars = [];
        const colors = [
            '#ffffff', '#ffffff', '#e0f2fe', '#bae6fd',
            '#3ee6c4', '#38bdf8', '#818cf8', '#c084fc'
        ];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 80 + 5; // Начинают около центра
            const speed = 0.8 + Math.random() * 2.2;
            const size = 1.2 + Math.random() * 2.5;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.stars.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                prevX: Math.cos(angle) * dist,
                prevY: Math.sin(angle) * dist,
                color,
                size,
                streakLen: 1
            });
        }
    }

    /**
     * Запуск перехода с заполнением экрана
     * @param {Function} onPeak - функция, вызываемая в момент полного заполнения (100%)
     */
    start(onPeak) {
        if (this.isWarping) return;
        this.isWarping = true;
        this.hasTriggeredPeak = false;
        this.onPeakCallback = onPeak;

        const canvas = this.getCanvas();
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.classList.remove('hidden');
        canvas.style.opacity = '1';

        this.initParticles(canvas.width, canvas.height);
        this.startTime = performance.now();

        // Озвучка: фраза «Запуск гиперпространственного перехода» и звуковой разгон
        SpaceAudio.playVoice('warp_launch', true);
        SpaceAudio.playWarpWhoosh();

        cancelAnimationFrame(this.animId);
        this.animId = requestAnimationFrame(this.render);
    }

    /**
     * Рендеринг одного кадра варп-анимации
     */
    render(now) {
        if (!this.isWarping) return;

        const elapsed = now - this.startTime;
        const progress = Math.min(1, elapsed / this.durationMs);

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const ctx = this.ctx;

        // Космическое затухание следов (Trail effect)
        ctx.fillStyle = 'rgba(3, 7, 18, 0.22)';
        ctx.fillRect(0, 0, w, h);

        // Коэффициент экспоненциального ускорения
        const accel = 1 + Math.pow(progress, 2.5) * 28;

        // Отрисовка лучей звезд
        this.stars.forEach(s => {
            s.prevX = s.x;
            s.prevY = s.y;

            s.x += s.vx * accel;
            s.y += s.vy * accel;

            // Если вылетела за пределы экрана — респавн ближе к центру для непрерывного потока
            const distFromCenter = Math.hypot(s.x, s.y);
            const maxRadius = Math.hypot(cx, cy) * 1.3;
            if (distFromCenter > maxRadius && progress < 0.8) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 40 + 5;
                s.x = Math.cos(angle) * r;
                s.y = Math.sin(angle) * r;
                s.prevX = s.x;
                s.prevY = s.y;
            }

            const drawX = cx + s.x;
            const drawY = cy + s.y;
            const prevDrawX = cx + s.prevX;
            const prevDrawY = cy + s.prevY;

            ctx.beginPath();
            ctx.moveTo(prevDrawX, prevDrawY);
            ctx.lineTo(drawX, drawY);
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.size * (1 + progress * 1.5);
            ctx.lineCap = 'round';
            ctx.stroke();
        });

        // Растущее свечение туманности из центра (заполнение экрана)
        if (progress > 0.3) {
            const fillProgress = (progress - 0.3) / 0.7; // 0 to 1
            const fillRadius = Math.hypot(cx, cy) * Math.pow(fillProgress, 1.8) * 1.2;

            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(10, fillRadius));
            glow.addColorStop(0, `rgba(62, 230, 196, ${0.45 * fillProgress})`);
            glow.addColorStop(0.35, `rgba(56, 189, 248, ${0.40 * fillProgress})`);
            glow.addColorStop(0.75, `rgba(139, 92, 246, ${0.55 * fillProgress})`);
            glow.addColorStop(1, `rgba(3, 7, 18, ${0.90 * fillProgress})`);

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, fillRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Момент полного заполнения экрана (Пик: 82% времени)
        if (progress >= 0.82 && !this.hasTriggeredPeak) {
            this.hasTriggeredPeak = true;
            if (typeof this.onPeakCallback === 'function') {
                this.onPeakCallback();
            }
        }

        // Финальное растворение варп-оверлея (открывает 3D сцену под ним)
        if (progress >= 0.82) {
            const fadeProgress = (progress - 0.82) / 0.18; // 0 to 1
            this.canvas.style.opacity = String(Math.max(0, 1 - fadeProgress));
        }

        if (progress < 1) {
            this.animId = requestAnimationFrame(this.render);
        } else {
            this.finish();
        }
    }

    /**
     * Завершение анимации и скрытие
     */
    finish() {
        this.isWarping = false;
        cancelAnimationFrame(this.animId);
        if (this.canvas) {
            this.canvas.classList.add('hidden');
            this.canvas.style.opacity = '0';
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
}

export const SpaceWarp = new SpaceWarpTransition();
export default SpaceWarp;
