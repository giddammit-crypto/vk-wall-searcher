/**
 * src/space_warp.js — Cosmic Warp Screen-Fill Transition Engine
 * ============================================================================
 * Кинематографичный переход и гиперпространственный перелёт:
 * 1. Радиальный разгон звезд и туманностей из центра со спокойной скоростью
 * 2. Полноэкранное космическое заполнение и фирменная надпись AURORA
 * 3. Вступительная речь Беллы (ElevenLabs) об эксперименте ко Дню космонавтики
 * 4. Непрерывный гиперпространственный полёт, пока говорит Белла
 * 5. Плавное торможение и прибытие в 3D Космо-пространство по окончании речи
 *    (или по кнопке быстрого пропуска «Прибыть на станцию»)
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=3.7.9';

export class SpaceWarpTransition {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.isWarping = false;
        this.stars = [];
        this.skipBtn = null;

        // Modes: 'idle' | 'takeoff' | 'cruise' | 'decelerating'
        this.mode = 'idle';
        this.startTime = 0;
        this.decelStartTime = 0;
        this.takeoffDurationMs = 2400; // Размеренная величественная скорость появления космоса (~2.4 сек)
        this.decelDurationMs = 1200;   // Плавное торможение корабля при прибытии (~1.2 сек)
        this.onArrivalCallback = null;
        this.hasTriggeredArrival = false;
        this.speechFallbackTimer = null;

        this.render = this.render.bind(this);
        this.initiateDeceleration = this.initiateDeceleration.bind(this);
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
     * Кнопка пропуска для мгновенного входа в 3D
     */
    ensureSkipButton() {
        this.removeSkipButton();

        this.skipBtn = document.createElement('button');
        this.skipBtn.id = 'space-warp-skip-btn';
        this.skipBtn.className = 'space-warp-skip-btn';
        this.skipBtn.setAttribute('type', 'button');
        this.skipBtn.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 18px;">rocket_launch</span>
            <span>Прибыть на станцию (Пропустить)</span>
            <span class="material-symbols-outlined" style="font-size: 16px;">fast_forward</span>
        `;

        this.skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.initiateDeceleration();
        });

        document.body.appendChild(this.skipBtn);
    }

    removeSkipButton() {
        if (this.skipBtn && this.skipBtn.parentNode) {
            this.skipBtn.parentNode.removeChild(this.skipBtn);
        }
        this.skipBtn = null;
        const old = document.getElementById('space-warp-skip-btn');
        if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    /**
     * Инициализация частиц для гиперпространственного разгона
     */
    initParticles(w, h) {
        const count = 520;
        this.stars = [];
        const colors = [
            '#ffffff', '#ffffff', '#e0f2fe', '#bae6fd',
            '#3ee6c4', '#38bdf8', '#818cf8', '#c084fc', '#fcd34d'
        ];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 80 + 4;
            const speed = 0.5 + Math.random() * 1.5;
            const size = 1.1 + Math.random() * 2.4;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.stars.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                prevX: Math.cos(angle) * dist,
                prevY: Math.sin(angle) * dist,
                color,
                size
            });
        }
    }

    /**
     * Запуск перехода с заполнением экрана и речью Беллы
     * @param {Function} onArrival - функция, вызываемая в момент выхода из гиперпространства в 3D
     */
    start(onArrival) {
        if (this.isWarping) return;
        this.isWarping = true;
        this.mode = 'takeoff';
        this.hasTriggeredArrival = false;
        this.onArrivalCallback = onArrival;

        const canvas = this.getCanvas();
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.classList.remove('hidden');
        canvas.style.opacity = '1';

        this.initParticles(canvas.width, canvas.height);
        this.startTime = performance.now();
        this.ensureSkipButton();

        // 1. Звуковой разгон космоса
        SpaceAudio.playWarpWhoosh();

        // 2. Старт легкой амбиент-музыки
        SpaceAudio.startAmbientMusic(0.35, 2000);

        // 3. Запуск вступительной речи девушки Беллы (ElevenLabs)
        SpaceAudio.playVoice('aurora_welcome', true);

        // 4. Ожидание завершения речи для автоматического перехода к станции
        clearTimeout(this.speechFallbackTimer);
        const checkVoiceEnded = () => {
            if (SpaceAudio.voiceAudio) {
                SpaceAudio.voiceAudio.addEventListener('ended', () => {
                    this.initiateDeceleration();
                }, { once: true });
            }
        };
        setTimeout(checkVoiceEnded, 300);

        // Таймер безопасности: если звук отключен или прерван, переход произойдет через 22 сек
        this.speechFallbackTimer = setTimeout(() => {
            this.initiateDeceleration();
        }, 22000);

        cancelAnimationFrame(this.animId);
        this.animId = requestAnimationFrame(this.render);
    }

    /**
     * Инициация плавного торможения и прибытия на орбитальную станцию
     */
    initiateDeceleration() {
        if (!this.isWarping || this.mode === 'decelerating') return;
        clearTimeout(this.speechFallbackTimer);
        this.mode = 'decelerating';
        this.decelStartTime = performance.now();
        this.removeSkipButton();

        // Звук прибытия / выхода из гиперпространства
        SpaceAudio.playWarpWhoosh();
    }

    /**
     * Рендеринг одного кадра варп-анимации
     */
    render(now) {
        if (!this.isWarping) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const ctx = this.ctx;

        const elapsed = now - this.startTime;

        // Определяем фазу полета
        let accel = 1;
        let fillProgress = 1;
        let titleAlpha = 1;

        if (this.mode === 'takeoff') {
            const takeoffProg = Math.min(1, elapsed / this.takeoffDurationMs);
            // Спокойный размеренный разгон
            accel = 1 + Math.pow(takeoffProg, 2.0) * 16;
            fillProgress = takeoffProg;
            titleAlpha = Math.min(1, Math.max(0, (takeoffProg - 0.35) / 0.45));

            if (takeoffProg >= 1) {
                this.mode = 'cruise';
            }
        } else if (this.mode === 'cruise') {
            // Непрерывный крейсерский гиперпространственный полет со стабильной скоростью
            accel = 17;
            fillProgress = 1;
            titleAlpha = 1;
        } else if (this.mode === 'decelerating') {
            // Торможение перед орбитальным комплексом
            const decelElapsed = now - this.decelStartTime;
            const decelProg = Math.min(1, decelElapsed / this.decelDurationMs);

            accel = Math.max(0.6, 17 * Math.pow(1 - decelProg, 1.8));
            fillProgress = 1;
            titleAlpha = Math.max(0, 1 - decelProg * 1.3);

            // Плавное растворение холста варп-перехода
            if (decelProg >= 0.65) {
                const fadeOut = (decelProg - 0.65) / 0.35;
                this.canvas.style.opacity = String(Math.max(0, 1 - fadeOut));
            }

            // На пике торможения (88%) открываем 3D пространство!
            if (decelProg >= 0.88 && !this.hasTriggeredArrival) {
                this.hasTriggeredArrival = true;
                if (typeof this.onArrivalCallback === 'function') {
                    this.onArrivalCallback();
                }
            }

            if (decelProg >= 1) {
                this.finish();
                return;
            }
        }

        // 1. Космическое затухание следов (Trail effect)
        ctx.fillStyle = 'rgba(3, 7, 18, 0.24)';
        ctx.fillRect(0, 0, w, h);

        // 2. Отрисовка лучей звезд
        this.stars.forEach(s => {
            s.prevX = s.x;
            s.prevY = s.y;

            s.x += s.vx * accel;
            s.y += s.vy * accel;

            // Если вылетела за пределы экрана — респавн ближе к центру для непрерывного космического потока
            const distFromCenter = Math.hypot(s.x, s.y);
            const maxRadius = Math.hypot(cx, cy) * 1.35;
            if (distFromCenter > maxRadius) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 40 + 4;
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
            ctx.lineWidth = s.size * (1 + (accel / 17) * 1.2);
            ctx.lineCap = 'round';
            ctx.stroke();
        });

        // 3. Радиальное свечение туманности из центра (заполнение экрана)
        if (fillProgress > 0.15) {
            const normFill = (fillProgress - 0.15) / 0.85;
            const fillRadius = Math.hypot(cx, cy) * Math.pow(normFill, 1.4) * 1.3;

            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(10, fillRadius));
            glow.addColorStop(0, `rgba(62, 230, 196, ${0.44 * normFill})`);
            glow.addColorStop(0.35, `rgba(56, 189, 248, ${0.38 * normFill})`);
            glow.addColorStop(0.75, `rgba(139, 92, 246, ${0.52 * normFill})`);
            glow.addColorStop(1, `rgba(3, 7, 18, ${0.88 * normFill})`);

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, fillRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Приветственная надпись AURORA фирменным шрифтом
        if (titleAlpha > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Мягкое дыхание надписи во время полета
            const breathe = 1 + Math.sin(now * 0.0022) * 0.025;
            ctx.translate(cx, cy);
            ctx.scale(breathe, breathe);

            // Фирменный заголовок AURORA (Montserrat 900)
            const fontSize = Math.min(88, Math.max(46, Math.round(w * 0.075)));
            ctx.font = `900 ${fontSize}px 'Montserrat', sans-serif`;

            // Неоновый ореол
            ctx.shadowColor = 'rgba(62, 230, 196, 0.9)';
            ctx.shadowBlur = 42 * titleAlpha;

            const grad = ctx.createLinearGradient(-190, -fontSize / 2, 190, fontSize / 2);
            grad.addColorStop(0, `rgba(255, 255, 255, ${titleAlpha})`);
            grad.addColorStop(0.5, `rgba(62, 230, 196, ${titleAlpha})`);
            grad.addColorStop(1, `rgba(56, 189, 248, ${titleAlpha})`);

            ctx.fillStyle = grad;
            ctx.fillText('AURORA', 0, -32);

            // Подзаголовок: 3D Исследовательский эксперимент
            ctx.shadowBlur = 14 * titleAlpha;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
            ctx.font = `700 ${Math.max(10, Math.round(fontSize * 0.17))}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = `rgba(224, 242, 254, ${titleAlpha * 0.95})`;
            ctx.fillText('3D ИССЛЕДОВАТЕЛЬСКИЙ ЭКСПЕРИМЕНТ', 0, fontSize * 0.22);

            // Линия-разделитель
            ctx.strokeStyle = `rgba(62, 230, 196, ${titleAlpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-160, fontSize * 0.42);
            ctx.lineTo(160, fontSize * 0.42);
            ctx.stroke();

            // Посвящение Дню космонавтики
            ctx.font = `800 ${Math.max(10, Math.round(fontSize * 0.15))}px 'Montserrat', sans-serif`;
            ctx.fillStyle = `rgba(253, 224, 71, ${titleAlpha * 0.95})`;
            ctx.fillText('ПОСВЯЩАЕТСЯ ДНЮ КОСМОНАВТИКИ И ДНЮ КОСМОСА', 0, fontSize * 0.62);

            // Бейдж библиотек Владимира
            ctx.font = `700 ${Math.max(9, Math.round(fontSize * 0.13))}px 'Montserrat', sans-serif`;
            ctx.fillStyle = `rgba(186, 230, 253, ${titleAlpha * 0.85})`;
            ctx.fillText('ОРБИТАЛЬНЫЙ КОМПЛЕКС • МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА', 0, fontSize * 0.86);

            // Индикатор звукового брифинга Беллы
            if (this.mode === 'cruise' || (this.mode === 'takeoff' && elapsed > 1500)) {
                const pulseBar = (Math.sin(now * 0.005) + 1) * 0.5;
                ctx.font = `600 11px 'JetBrains Mono', monospace`;
                ctx.fillStyle = `rgba(62, 230, 196, ${0.75 + pulseBar * 0.25})`;
                ctx.fillText('● СВЯЗЬ С ОРБИТАЛЬНЫМ КОМПЛЕКСОМ: ГОЛОСОВОЙ БРИФИНГ...', 0, fontSize * 1.18);
            }

            ctx.restore();
        }

        this.animId = requestAnimationFrame(this.render);
    }

    /**
     * Завершение анимации и скрытие
     */
    finish() {
        this.isWarping = false;
        this.mode = 'idle';
        clearTimeout(this.speechFallbackTimer);
        cancelAnimationFrame(this.animId);
        this.removeSkipButton();

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
