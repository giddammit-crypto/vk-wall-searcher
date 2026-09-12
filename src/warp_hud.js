/**
 * src/warp_hud.js — Кинематографический HUD гиперпрыжка AURORA
 * ============================================================================
 * Роль: UI/UX Lead дизайнер космических интерфейсов + Motion-дизайнер
 *
 * Слой интерфейса поверх GPU-рендера варпа:
 *   • Миссионный патч, телеметрия скорости/дистанции/реактора
 *   • Живой осциллограф голоса Беллы (Waveform на 2D-канве)
 *   • Фазовый трекер перехода с подписью текущей фазы
 *   • Кинематографические полосы (letterbox), рамка-видоискатель, сетка
 *   • Кнопка досрочного прибытия и подсказки управления
 * ============================================================================
 */

const PHASE_TEXT = {
    ignition: {
        label: 'ЗАПУСК ГИПЕРПРИВОДА',
        log: 'Гиперпривод заряжается. Все системы орбитального комплекса — в норме.',
        short: 'IGNITION'
    },
    spool: {
        label: 'РАЗГОН • ВЕКТОР: НИЗКАЯ ОРБИТА 418 КМ',
        log: 'Разгон до крейсерской скорости. Курс — низкая околоземная орбита.',
        short: 'SPOOL-UP'
    },
    cruise: {
        label: 'КРЕЙСЕРСКИЙ ПОЛЁТ СВЕРХСВЕТОВОЙ СКОРОСТИ',
        log: 'Эксперимент AURORA: 18 библиотек Владимира в едином 3D-пространстве.',
        short: 'CRUISE'
    },
    decel: {
        label: 'ТОРМОЖЕНИЕ • СТЫКОВКА С ОРБИТАЛЬНЫМ КОМПЛЕКСОМ',
        log: 'Торможение. Прибываем на орбитальную станцию. Приготовьтесь к осмотру.',
        short: 'DECEL'
    },
    arrived: {
        label: 'СТЫКОВКА ЗАВЕРШЕНА • ДОБРО ПОЖАЛОВАТЬ',
        log: 'Стыковка завершена. Добро пожаловать на борт космо-пространства AURORA.',
        short: 'DOCKED'
    }
};

const LETTERS = ['A', 'U', 'R', 'O', 'R', 'A'];

export class WarpHud {
    constructor() {
        this.root = null;
        this.waveCanvas = null;
        this.waveCtx = null;
        this.phaseName = null;
        this.phaseFill = null;
        this.phaseTicks = null;
        this.logEl = null;
        this.skipBtn = null;
        this.teleEls = {};
        this.waveHistory = new Float32Array(96);
        this.waveHead = 0;
        this.currentPhase = null;
        this.onSkip = null;
        this.onAbort = null;
    }

    /* ---------------------------------------------------------------------
     * Построение DOM-слоя HUD
     * ------------------------------------------------------------------- */
    mount(onSkip) {
        if (this.root) {
            this.root.classList.remove('hidden');
            return;
        }
        this.onSkip = onSkip;

        const root = document.createElement('div');
        root.className = 'warp-hud';
        root.setAttribute('aria-hidden', 'true');

        root.innerHTML = `
            <div class="warp-bar warp-bar-top"></div>
            <div class="warp-bar warp-bar-bottom"></div>
            <div class="warp-grid"></div>
            <div class="warp-vignette"></div>

            <div class="warp-frame">
                <span class="wf-corner wf-tl"></span>
                <span class="wf-corner wf-tr"></span>
                <span class="wf-corner wf-bl"></span>
                <span class="wf-corner wf-br"></span>
                <span class="wf-edge wf-left"></span>
                <span class="wf-edge wf-right"></span>
            </div>

            <div class="warp-patch">
                <div class="patch-badge">
                    <span class="material-symbols-outlined">rocket_launch</span>
                </div>
                <div class="patch-text">
                    <span class="patch-title">AURORA</span>
                    <span class="patch-sub">HYPERDRIVE • ORBITAL EXPRESS</span>
                    <span class="patch-ver">ЭКСПЕРИМЕНТ КО ДНЮ КОСМОНАВТИКИ</span>
                </div>
            </div>

            <div class="warp-telemetry">
                <div class="tele-row">
                    <span class="tele-key">V • СКОРОСТЬ</span>
                    <span class="tele-num" data-tele="speed">0.00 c</span>
                </div>
                <div class="tele-bar"><i data-bar="speed"></i></div>
                <div class="tele-row">
                    <span class="tele-key">РЕАКТОР</span>
                    <span class="tele-num" data-tele="reactor">100%</span>
                </div>
                <div class="tele-bar"><i data-bar="reactor"></i></div>
                <div class="tele-row">
                    <span class="tele-key">ДИСТАНЦИЯ</span>
                    <span class="tele-num" data-tele="distance">0.000 a.e.</span>
                </div>
                <div class="tele-row">
                    <span class="tele-key">КУРС</span>
                    <span class="tele-num" data-tele="heading">LEO • 418 КМ</span>
                </div>
                <div class="tele-row tele-row-sys">
                    <span class="tele-key">СИСТЕМЫ</span>
                    <span class="tele-num tele-ok" data-tele="status">НОМИНАЛЬНО</span>
                </div>
            </div>

            <div class="warp-title">
                <div class="title-letters">${LETTERS.map(l => `<span class="white-letter" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; background: none !important; text-shadow: 0 0 20px #ffffff, 0 0 45px rgba(255, 255, 255, 0.9), 0 0 70px rgba(56, 189, 248, 0.6);">${l}</span>`).join('')}</div>
                <div class="title-sub">3D ИССЛЕДОВАТЕЛЬСКИЙ ЭКСПЕРИМЕНТ • КОСМО-ПРОСТРАНСТВО 360°</div>
                <div class="title-divider"><i></i></div>
                <div class="title-dedication">ПОСВЯЩАЕТСЯ ДНЮ КОСМОНАВТИКИ И ДНЮ КОСМОСА</div>
                <div class="title-org">ОРБИТАЛЬНЫЙ КОМПЛЕКС • МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</div>
            </div>

            <div class="warp-briefing">
                <div class="briefing-avatar">
                    <span class="briefing-ring ring-1"></span>
                    <span class="briefing-ring ring-2"></span>
                    <span class="material-symbols-outlined">record_voice_over</span>
                </div>
                <div class="briefing-body">
                    <div class="briefing-head">
                        <span class="briefing-dot"></span>
                        <span>БЭЛА • ГОЛОСОВОЙ БРИФИНГ</span>
                        <span class="briefing-live">В ЭФИРЕ</span>
                    </div>
                    <canvas class="briefing-wave" width="520" height="88"></canvas>
                    <div class="briefing-log">
                        <span class="briefing-log-tag">ЛОГ МИССИИ</span>
                        <span class="briefing-log-text" data-log>Связь с орбитальным комплексом установлена…</span>
                    </div>
                </div>
            </div>

            <div class="warp-phase">
                <div class="phase-row">
                    <span class="phase-label">ФАЗА ПЕРЕЛЁТА</span>
                    <span class="phase-name" data-phase-name>ПОДГОТОВКА</span>
                    <span class="phase-code" data-phase-code>STANDBY</span>
                </div>
                <div class="phase-track">
                    <div class="phase-fill" data-phase-fill></div>
                    <div class="phase-marker"></div>
                </div>
                <div class="phase-ticks">
                    ${['IGNITION', 'SPOOL-UP', 'CRUISE', 'DECEL', 'DOCKED'].map(t => `<span>${t}</span>`).join('')}
                </div>
            </div>

            <button type="button" class="warp-skip-btn" data-skip>
                <span class="material-symbols-outlined">fast_forward</span>
                <span class="skip-label">Прибыть на станцию</span>
                <span class="skip-hint">ESC</span>
            </button>

            <div class="warp-controls-hint">
                <span><b>ESC</b> — пропустить перелёт</span>
                <span class="hint-sep">•</span>
                <span><b>3D</b> — управление камерой после стыковки</span>
            </div>
        `;

        document.body.appendChild(root);
        this.root = root;

        this.phaseName = root.querySelector('[data-phase-name]');
        this.phaseCode = root.querySelector('[data-phase-code]');
        this.phaseFill = root.querySelector('[data-phase-fill]');
        this.logEl = root.querySelector('[data-log]');
        this.skipBtn = root.querySelector('[data-skip]');
        this.waveCanvas = root.querySelector('.briefing-wave');
        this.waveCtx = this.waveCanvas ? this.waveCanvas.getContext('2d') : null;

        root.querySelectorAll('[data-tele]').forEach(el => {
            this.teleEls[el.dataset.tele] = el;
        });
        this.barEls = {};
        root.querySelectorAll('[data-bar]').forEach(el => {
            this.barEls[el.dataset.bar] = el;
        });

        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof this.onSkip === 'function') this.onSkip();
            });
        }

        // Запуск анимаций появления элементов
        requestAnimationFrame(() => {
            if (this.root) this.root.classList.add('is-visible');
        });
    }

    unmount() {
        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        this.root = null;
        this.waveCtx = null;
        this.waveCanvas = null;
        this.teleEls = {};
        this.barEls = {};
        this.currentPhase = null;
    }

    hide() {
        if (this.root) this.root.classList.add('hidden');
    }

    show() {
        if (this.root) this.root.classList.remove('hidden');
    }

    /* ---------------------------------------------------------------------
     * Переключение фазы
     * ------------------------------------------------------------------- */
    setPhase(phaseKey) {
        if (this.currentPhase === phaseKey) return;
        this.currentPhase = phaseKey;
        const info = PHASE_TEXT[phaseKey];
        if (!info || !this.root) return;

        if (this.phaseName) this.phaseName.textContent = info.label;
        if (this.phaseCode) this.phaseCode.textContent = info.short;
        if (this.logEl) {
            this.logEl.classList.remove('log-in');
            void this.logEl.offsetWidth; // reflow → перезапуск анимации
            this.logEl.textContent = info.log;
            this.logEl.classList.add('log-in');
        }

        this.root.classList.remove(...Object.keys(PHASE_TEXT).map(k => `phase-${k}`));
        this.root.classList.add(`phase-${phaseKey}`);

        if (phaseKey === 'arrived' || phaseKey === 'decel') {
            this.root.classList.add('is-arriving');
        }
    }

    /* ---------------------------------------------------------------------
     * Телеметрия: скорость, реактор, дистанция
     * ------------------------------------------------------------------- */
    setTelemetry({ speedC, reactor, distanceAu, status }) {
        if (this.teleEls.speed && typeof speedC === 'number') {
            this.teleEls.speed.textContent = `${speedC.toFixed(2)} c`;
        }
        if (this.barEls.speed && typeof speedC === 'number') {
            const pct = Math.max(3, Math.min(100, (speedC / 9.6) * 100));
            this.barEls.speed.style.width = `${pct}%`;
        }
        if (this.teleEls.reactor && typeof reactor === 'number') {
            this.teleEls.reactor.textContent = `${Math.round(reactor)}%`;
        }
        if (this.barEls.reactor && typeof reactor === 'number') {
            this.barEls.reactor.style.width = `${Math.max(2, Math.min(100, reactor))}%`;
        }
        if (this.teleEls.distance && typeof distanceAu === 'number') {
            this.teleEls.distance.textContent = `${distanceAu.toFixed(3)} a.e.`;
        }
        if (this.teleEls.status && status) {
            this.teleEls.status.textContent = status;
        }
    }

    /* ---------------------------------------------------------------------
     * Прогресс перехода (0..1)
     * ------------------------------------------------------------------- */
    setProgress(p) {
        if (this.phaseFill) this.phaseFill.style.width = `${Math.max(0, Math.min(100, p * 100))}%`;
    }

    /* ---------------------------------------------------------------------
     * Живой осциллограф голоса Беллы
     * ------------------------------------------------------------------- */
    drawWave(energy, spectrum) {
        const ctx = this.waveCtx;
        if (!ctx || !this.waveCanvas) return;

        const w = this.waveCanvas.width;
        const h = this.waveCanvas.height;
        const mid = h / 2;

        // Запись истории в кольцевой буфер (для скролла справа налево)
        const bars = 48;
        if (spectrum && spectrum.length) {
            const step = Math.floor(spectrum.length / bars) || 1;
            for (let i = 0; i < bars; i++) {
                let sum = 0;
                for (let k = 0; k < step; k++) sum += spectrum[i * step + k] || 0;
                const v = (sum / step) / 255;
                this.waveHistory[(this.waveHead + i) % this.waveHistory.length] = v;
            }
            this.waveHead = (this.waveHead + 1) % this.waveHistory.length;
        } else {
            // Синтетическая огибающая (когда анализ недоступен или звук выключен)
            const t = performance.now() * 0.001;
            for (let i = 0; i < 2; i++) {
                const v = Math.max(0, Math.min(1,
                    (Math.sin(t * 9.1 + i * 1.7) * 0.32 + Math.sin(t * 3.3 + i) * 0.28 + 0.42) * energy
                ));
                this.waveHistory[(this.waveHead + i) % this.waveHistory.length] = v;
            }
            this.waveHead = (this.waveHead + 2) % this.waveHistory.length;
        }

        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(62, 230, 196, 0.15)');
        grad.addColorStop(0.4, 'rgba(62, 230, 196, 0.9)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.95)');
        ctx.fillStyle = grad;

        const bw = w / this.waveHistory.length;
        for (let i = 0; i < this.waveHistory.length; i++) {
            const v = this.waveHistory[(this.waveHead + i) % this.waveHistory.length];
            const bh = Math.max(1.5, v * (h * 0.86));
            ctx.globalAlpha = 0.35 + v * 0.65;
            ctx.fillRect(i * bw, mid - bh / 2, Math.max(1, bw - 1.6), bh);
        }
        ctx.globalAlpha = 1;

        // Центральная осевая линия
        ctx.strokeStyle = 'rgba(148, 197, 253, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, mid + 0.5);
        ctx.lineTo(w, mid + 0.5);
        ctx.stroke();
    }
}

export default WarpHud;
