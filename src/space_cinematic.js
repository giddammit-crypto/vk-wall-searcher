/**
 * src/space_cinematic.js — AURORA «ПРИЛЁТ»: кинематографическая сцена после варпа
 * ============================================================================
 * Режиссура прилёта (Motion Director):
 *
 *   ТРИГГЕР  Space3D.open({ fromWarp: true }) — варп сам по себе НЕ растягивается
 *            (decel стартует по 'ended' голоса Беллы, см. space_warp.js).
 *            Модуль также подписывается на событие 'aurora:warp-voice-ended'
 *            (диспатчится space_warp.js в момент окончания женской озвучки),
 *            чтобы синхронизировать старт печати титра с реальным концом речи.
 *            Fallback: если событие не пришло, титр печатается по внутреннему
 *            таймеру (title.startDelayMs после старта сцены).
 *
 *   ФАЗА A «APPROACH»   ~5.5с — камера летит к Земле: pitch 0 → -42° и
 *                       zoom 1.0 → 1.9 с экспоненциальным замедлением скорости
 *                       (easeOutQuart / exp-decay — никакого линейного движения),
 *                       лёгкий крен roll ±2° по синусоиде, дрейф yaw к -14°.
 *                       Motion-полиш: первые 1.5с — затухающая микровибрация
 *                       камеры 0.15° («выход из гиперпространства»), последние
 *                       1.2с — инерционный наезд zoom +3% с возвратом
 *                       (лёгкий easeOutBack, без изломов скорости).
 *
 *   ФАЗА B «ORBIT»      ~7.5с — кинематографический облёт: yaw -14° → +11°
 *                       (+25° за фазу, два под-движения: easeInOutSine →
 *                       easeOutQuad со склейкой по скорости), pitch -42° → -28°,
 *                       zoom 1.9 → 1.55, очень медленный вертикальный дрейф
 *                       pitch (синусоида ±1.5°) — камера «плывёт». В кадре:
 *                       терминатор и городские огни Земли, Луна (стартовый yaw
 *                       сдвинут в минус, чтобы Луна на yaw ≈ -28° / pitch ≈ -20°
 *                       пересекала кадр ~2-3с), МКС и спутники проходят через
 *                       кадр по своим орбитам.
 *
 *   ФАЗА C «TRANSITION» ~3.5с — «выдох» камеры к эталонной позе обычного
 *                       открытия (pitch → 0, zoom 1.55 → 1.0, easeInOutCubic,
 *                       лёгкий overshoot −4% к зуму в середине фазы),
 *                       blur/motion импульс
 *                       (~380мс, CSS filter на canvas-слоях), каскадный вылет
 *                       карточек кольца космонавтов (родной stagger CosmonautRing),
 *                       затем сцена возвращается в обычный режим.
 *
 *   ТИТР: печатается по буквам в фазах A-B, три строки (Unbounded 700,
 *   letter-spacing 0.14em), курсор «▍», держится 3с после печати, затем
 *   РАССЫПАЕТСЯ на светящиеся частицы (canvas-оверлей .space-cine-particles,
 *   радиальный разлёт «в космос» ~1.05с, ≤2500 частиц, один rAF-цикл).
 *   Fallback: prefers-reduced-motion или сбой — обычный blur 0→14px +
 *   opacity→0 за 0.9с.
 *
 *   ПРЕРЫВАНИЕ: любой pointerdown / wheel / keydown немедленно завершает
 *   кинематику и возвращает управление пользователю (без поломки сцены).
 *   Все сбои изолированы: при ошибке сцена просто открывается как раньше.
 * ============================================================================
 */

/* ========================================================================
 * ЕДИНЫЙ КОНФИГ ТАЙМИНГОВ (тюнинг здесь)
 * ====================================================================== */
export const CINEMATIC_CONFIG = {
    // Длительности фаз, секунды
    phases: {
        approach: 5.5,     // Фаза A
        orbit: 7.5,        // Фаза B
        transition: 3.5    // Фаза C
    },
    // Фаза A «Approach»
    approach: {
        pitchFrom: 0,
        pitchTo: -42,          // наклон вниз к Земле (Земля на pitch -44 в GL-ядре)
        zoomFrom: 1.0,
        zoomTo: 1.9,
        zoomDecayRate: 3.1,    // скорость экспоненциального замедления зума
        yawFrom: 0,
        yawTo: -14,            // сдвиг влево: Луна (yaw ≈ -28°) входит в кадр в фазе B
        rollAmp: 2.0,          // амплитуда крена, градусы
        rollPeriod: 7.0,       // период синусоиды крена, секунды
        // Motion-полиш: «выход из гиперпространства» + инерционный наезд
        hyperNoiseAmp: 0.15,   // амплитуда микровибрации камеры, градусы
        hyperNoiseDur: 1.5,    // длительность микровибрации после варпа, секунды
        pushInFrac: 0.03,      // инерционный наезд: +3% к зуму с возвратом
        pushInWindow: 1.2      // окно наезда в конце фазы, секунды
    },
    // Фаза B «Cinematic orbit»
    orbit: {
        yawSweep: 25,          // +25° за фазу
        pitchFrom: -42,
        pitchTo: -28,
        zoomFrom: 1.9,
        zoomTo: 1.55,
        rollAmp: 0.8,          // остаточный микрокрен
        // Motion-полиш: два под-движения + «плавучесть» камеры.
        // Скорости на склейке под-движений согласованы при splitAt = 0.5
        // (см. getPose): 0.55·E'(0.5)/0.5 ≈ 1.73 против 2·0.45/0.5 = 1.80.
        splitAt: 0.5,          // точка склейки под-движений, доля фазы (0..1)
        splitSweep: 0.55,      // доля дуги sweep, проходимая первым под-движением
        pitchDriftAmp: 1.5,    // вертикальный дрейф pitch (синусоида), градусы
        pitchDriftPhase: 0.9   // фаза синусоиды дрейфа, радианы
    },
    // Фаза C «Transition to cards»: НЕ push-in к Земле, а плавный отвод взгляда
    // к эталонной позе обычного открытия сцены (open() без кинематики:
    // pitch 0 / zoom 1.0 / yaw свободный) — иначе кольцо карточек остаётся
    // за кадром. Карточки вылетают, когда камера уже смотрит на их орбиту.
    transition: {
        pitchTo: 0,            // взгляд от Земли обратно на плоскость кольца (эталон open())
        zoomTo: 1.0,           // эталонный зум обычного режима
        yawDrift: 2.5,         // лёгкий доворот (yaw не критичен: кольцо вокруг зрителя)
        blurDelayMs: 250,      // задержка blur-импульса от начала фазы
        blurPeakMs: 320,       // время нарастания blur до пика
        blurReleaseMs: 480,    // время спада blur
        ringDelayMs: 420,      // задержка каскадного вылета карточек
        zoomOvershoot: 0.04    // «выдох»: overshoot −4% к зуму в середине фазы
    },
    // Титр: печать → hold 3с → рассыпание на частицы (fallback — fade 0.9с)
    title: {
        startDelayMs: 900,     // пауза после старта сцены до первой буквы
        typeMsPerChar: 48,     // скорость печати (45-55 мс/символ)
        holdAfterTypedMs: 3000,// держится 3с после окончания печати
        fadeMs: 900,           // fallback: blur 0→14px + opacity→0
        // Рассыпание титра на частицы (см. _dissolveToParticles)
        particles: {
            durationMs: 1050,  // разлёт (0.9-1.2с, easeOutCubic по скорости)
            maxCount: 2500,    // бюджет частиц (производительность)
            sampleStepMin: 3,  // шаг сэмплирования пикселей текста, px (3-4)
            sampleStepMax: 4,
            radialMin: 55,     // радиальный разлёт от центра текста, px
            radialMax: 260,
            driftUp: 70,       // дрейф «в космос»: вверх, px
            driftSide: 60,     // …и в сторону, px
            twinkleFrac: 0.2   // доля мерцающих частиц (20%)
        }
    },
    hudDimOpacity: 0.35,
    zIndex: 950            // выше сцены (глубина в viewport), ниже HUD (1000+)
};

// ВАЖНО: версия запроса ДОЛЖНА совпадать с импортом в space3d.js — иначе браузер
// загрузит cosmonaut_ring.js дважды (два синглтона), и show()/update() начнут
// работать с разными DOM-узлами карточек (карточки «разлетаются» после reopen).
import { CosmonautRing } from './cosmonaut_ring.js?v=4.7.0';

/* Заголовок прилёта — ровно три строки с гарантированной печатью буквы «Ю» */
const TITLE_LINES = [
    'Галактика Млечный Путь.',
    'Планета Земля.',
    '2026 год по местному летоисчислению.'
];
const TITLE_CURSOR = '\u258D'; // ▍

/* --- Математика easing --- */
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Нормированный exp-decay: 0→1, скорость падает экспоненциально */
const expApproach = (t, rate) => (1 - Math.exp(-rate * t)) / (1 - Math.exp(-rate));
const smooth01 = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const easeOutQuad = (t) => { const x = clamp(t, 0, 1); return 1 - (1 - x) * (1 - x); };
/** easeOutBack с регулируемым лёгким «перелётом» (s=1 — небольшой overshoot,
 *  s=0 — вырождается в easeOutCubic; производная в t=1 равна нулю) */
const easeOutBack = (t, s = 1.0) => {
    const c1 = s, c3 = c1 + 1, x = clamp(t, 0, 1) - 1;
    return 1 + c3 * x * x * x + c1 * x * x;
};

class SpaceCinematicController {
    constructor() {
        this.active = false;
        this.engine = null;          // инстанс Space3D
        this.startT = 0;             // performance.now() старта
        this.phase = 'idle';
        this.ringShown = false;
        this.blurDone = false;
        this.titleEl = null;
        this.titleChars = 0;
        this.titleState = 'hidden';  // hidden | typing | holding | fading | gone
        this.titleTypedDoneAt = 0;
        this.voiceEndedAt = 0;       // timestamp окончания голоса Беллы (0 = неизвестно)
        this._lastTypedCount = -1;
        // Рассыпание титра на частицы (ленивый canvas-оверлей + один rAF)
        this._particleRAF = 0;
        this._particleCanvas = null;
        this._particleTitleEl = null;
        this._timers = [];
        // Zero-GC для покадровых путей: getPose возвращает переиспользуемый
        // объект, спаны титра кэшируются, частицы сэмплируются ЗАРАНЕЕ
        this._pose = { yaw: 0, pitch: 0, zoom: 1, roll: 0 };
        this._lineSpans = [];    // .cine-line элементы (кэш, без querySelectorAll в кадре)
        this._lineTexts = [];    // их полные тексты (без dataset-чтения в кадре)
        this._preparedDissolve = null; // предсэмплированные частицы (за ~1.2с до dissolve)
        this._flashEl = null;    // оверлей импульса фазы C (вместо CSS blur на canvas)
        this._onInterrupt = this._onInterrupt.bind(this);
        this._onWarpVoiceEnded = this._onWarpVoiceEnded.bind(this);
        this._onWatchdog = this._onWatchdog.bind(this);
    }

    isActive() { return this.active; }

    /* =====================================================================
     * Запуск (вызывается из Space3D.open({ fromWarp: true }))
     * =================================================================== */
    start(engine) {
        if (this.active || !engine || !engine.world) return false;
        this.active = true;
        this.engine = engine;
        this.phase = 'approach';
        this.ringShown = false;
        this.blurDone = false;
        this.titleState = 'hidden';
        this._lastTypedCount = -1;
        this._cleanupParticles();   // страховка от частиц предыдущего запуска
        this._preparedDissolve = null;
        this.startT = performance.now();

        // Пользовательский ввод немедленно прерывает кинематику
        document.addEventListener('pointerdown', this._onInterrupt, { capture: true, passive: true });
        document.addEventListener('wheel', this._onInterrupt, { capture: true, passive: true });
        document.addEventListener('keydown', this._onInterrupt, { capture: true });
        window.addEventListener('aurora:warp-voice-ended', this._onWarpVoiceEnded);

        // Приглушаем HUD (читаемость сохраняем), ставим камерный контроллер
        document.body.classList.add('space-cinematic-active');
        if (engine.setCinematicController) engine.setCinematicController(this);

        this._buildTitle();
        // ВАЖНО: getPose() вызывается РОВНО ОДИН раз за кадр — из Space3D._renderFrame
        // (контроллер стоит в engine.cinematicController). Собственного rAF у модуля
        // НЕТ: двойной вызов getPose за кадр рассинхронизирует потребителей времени
        // (титр, фазовые триггеры). Этот интервал — только страховочный watchdog.
        this._timers.push(setInterval(this._onWatchdog, 400));
        console.log('[SpaceCinematic] Прилёт начат: A=Approach → B=Orbit → C=Transition');
        return true;
    }

    /* =====================================================================
     * Завершение (естественное, по прерыванию или при закрытии сцены)
     * =================================================================== */
    end(reason = 'done') {
        if (!this.active) return;
        this.active = false;
        this.phase = 'idle';

        document.removeEventListener('pointerdown', this._onInterrupt, { capture: true });
        document.removeEventListener('wheel', this._onInterrupt, { capture: true });
        document.removeEventListener('keydown', this._onInterrupt, { capture: true });
        window.removeEventListener('aurora:warp-voice-ended', this._onWarpVoiceEnded);

        this._clearTimers();

        // Частицы рассыпания: при закрытии/ошибке убираем немедленно (сцена
        // уходит); при естественном завершении/прерывании даём разлёту спокойно
        // дотаять — canvas-оверлей удалит сам себя по окончании анимации.
        if (reason === 'close' || reason === 'error') this._cleanupParticles();
        this._preparedDissolve = null;

        document.body.classList.remove('space-cinematic-active');
        this._clearPulse();

        if (this.engine) {
            if (this.engine.setCinematicController) this.engine.setCinematicController(null);
            this.engine.cineRoll = 0;
            if (this.engine.world) this.engine.world.style.filter = '';
            this.engine = null;
        }

        // Титр: при естественном завершении — мягко растворить, при прерывании — быстро убрать
        this._retireTitle(reason === 'done' ? CINEMATIC_CONFIG.title.fadeMs : 350);

        // Страховка: кольцо космонавтов обязательно показано (каскад при фазе C
        // либо сразу при прерывании до фазы C)
        if (!this.ringShown && reason !== 'close') {
            this._showRing();
        }
        this.ringShown = true;
    }

    /* =====================================================================
     * Камера: покадровая поза для Space3D.setCinematicController
     * =================================================================== */
    getPose(nowMs) {
        if (!this.active) return null;
        const t = (nowMs - this.startT) / 1000;
        const P = CINEMATIC_CONFIG.phases;
        const tA = P.approach, tB = P.orbit, tC = P.transition;
        const A = CINEMATIC_CONFIG.approach, B = CINEMATIC_CONFIG.orbit, C = CINEMATIC_CONFIG.transition;

        let yaw, pitch, zoom, roll = 0;

        if (t < tA) {
            /* --- ФАЗА A «Approach»: экспоненциальное замедление --- */
            this.phase = 'approach';
            const k = clamp(t / tA, 0, 1);
            pitch = lerp(A.pitchFrom, A.pitchTo, easeOutQuart(k));
            zoom = lerp(A.zoomFrom, A.zoomTo, expApproach(k, A.zoomDecayRate));
            yaw = lerp(A.yawFrom, A.yawTo, easeOutQuart(k));
            // Крен: синусоида с мягким нарастанием и гашением к краям фазы
            const rollEnv = smooth01(k * 4) * smooth01((1 - k) * 4);
            roll = A.rollAmp * Math.sin((t / A.rollPeriod) * Math.PI * 2) * rollEnv;

            // «Выход из гиперпространства»: микровибрация камеры (0.15°),
            // затухающая за первые hyperNoiseDur секунды (гладкая огибающая —
            // без щелчка на старте и без утечки в фазу B)
            if (t < A.hyperNoiseDur) {
                const nEnv = 1 - smooth01(t / A.hyperNoiseDur);
                yaw += A.hyperNoiseAmp * nEnv
                    * (Math.sin(t * 43.7) * 0.62 + Math.sin(t * 29.3 + 1.7) * 0.38);
                pitch += A.hyperNoiseAmp * nEnv
                    * (Math.sin(t * 37.1 + 0.6) * 0.62 + Math.sin(t * 51.9 + 2.4) * 0.38);
                roll += A.hyperNoiseAmp * 0.5 * nEnv * Math.sin(t * 31.4 + 1.1);
            }

            // Инерционный наезд: в последние pushInWindow секунды — лёгкий
            // push-in +3% с возвратом (атака easeOutBack, спад smooth01,
            // мягкий onset — производная импульса на краях окна нулевая,
            // стык с фазой B без излома скорости)
            const winStart = tA - A.pushInWindow;
            if (t >= winStart) {
                const u = clamp((t - winStart) / A.pushInWindow, 0, 1);
                const attack = easeOutBack(clamp(u / 0.58, 0, 1), 1.0);
                const release = 1 - smooth01(clamp((u - 0.58) / 0.42, 0, 1));
                const onset = smooth01(clamp(u / 0.14, 0, 1));
                zoom *= 1 + A.pushInFrac * (u < 0.58 ? attack : release) * onset;
            }
        } else if (t < tA + tB) {
            /* --- ФАЗА B «Cinematic orbit»: два под-движения + дрейф pitch --- */
            this.phase = 'orbit';
            const k = clamp((t - tA) / tB, 0, 1);
            // Под-движение 1: easeInOutSine (аргумент обрезан на splitAt — так
            // скорость на склейке НЕ нулевая), под-движение 2: easeOutQuad.
            // При splitAt=0.5 / splitSweep=0.55 скорости на стыке согласованы:
            // 1.73 против 1.80 ед. s — камера не «спотыкается» на склейке.
            const s = k < B.splitAt
                ? B.splitSweep * easeInOutSine(k) / easeInOutSine(B.splitAt)
                : B.splitSweep + (1 - B.splitSweep)
                    * easeOutQuad((k - B.splitAt) / (1 - B.splitAt));
            yaw = A.yawTo + B.yawSweep * s;
            pitch = lerp(B.pitchFrom, B.pitchTo, s);
            zoom = lerp(B.zoomFrom, B.zoomTo, s);
            roll = B.rollAmp * Math.sin(k * Math.PI * 2) * smooth01((1 - k) * 3);
            // Очень медленный вертикальный дрейф pitch (синусоида ±1.5°):
            // камера «плывёт». Огибающая гасит дрейф у краёв фазы — стыки
            // с фазами A/C остаются гладкими.
            const driftEnv = smooth01(k * 4) * smooth01((1 - k) * 4);
            pitch += B.pitchDriftAmp * Math.sin(k * Math.PI * 2 + B.pitchDriftPhase) * driftEnv;
        } else if (t < tA + tB + tC) {
            /* --- ФАЗА C «Transition to cards» --- */
            this.phase = 'transition';
            const tk = (t - tA - tB);
            const k = clamp(tk / tC, 0, 1);
            const e = easeInOutCubic(k);
            yaw = A.yawTo + B.yawSweep + C.yawDrift * e;
            pitch = lerp(B.pitchTo, C.pitchTo, e);
            // «Выдох» камеры: плавный отвод 1.55 → 1.0 с лёгким overshoot −4%
            // к зуму в середине фазы (sin² — нулевая скорость на краях,
            // стыки с фазой B и финалом без изломов)
            zoom = lerp(B.zoomTo, C.zoomTo, e)
                * (1 - C.zoomOvershoot * Math.pow(Math.sin(Math.PI * k), 2));

            if (!this.blurDone && tk * 1000 >= C.blurDelayMs) {
                this.blurDone = true;
                this._motionPulse();
            }
            if (!this.ringShown && tk * 1000 >= C.ringDelayMs) {
                this._showRing();
            }
        } else {
            /* Сцена завершена — мягкая передача управления */
            this.end('done');
            return null;
        }

        this.titleTick(nowMs);
        // Переиспользуемый объект позы (вызывается 1 раз/кадр из _renderFrame):
        // литерал {yaw,pitch,zoom,roll} здесь = 60 аллокаций/с = GC-хичи
        const pose = this._pose;
        pose.yaw = yaw;
        pose.pitch = pitch;
        pose.zoom = zoom;
        pose.roll = roll;
        return pose;
    }

    /* =====================================================================
     * Титр: печать по буквам с курсором «▍»
     * =================================================================== */
    _forceCompleteText() {
        if (!this._lineSpans || !this._lineTexts) return;
        for (let i = 0; i < this._lineSpans.length; i++) {
            const span = this._lineSpans[i];
            const fullText = this._lineTexts[i] || '';
            if (span.textContent !== fullText) {
                span.textContent = fullText;
            }
        }
        if (this._cursorEl && this._lineSpans.length > 0) {
            const lastSpan = this._lineSpans[this._lineSpans.length - 1];
            if (this._cursorEl.parentNode !== lastSpan) {
                lastSpan.appendChild(this._cursorEl);
            }
        }
    }

    _buildTitle() {
        try {
            if (this.titleEl) this.titleEl.remove();
            const el = document.createElement('div');
            el.className = 'space-cinematic-title';
            el.style.zIndex = String(CINEMATIC_CONFIG.zIndex);
            el.setAttribute('aria-live', 'polite');
            el.innerHTML = `
                <div class="cine-tele-badge" aria-hidden="true">
                    <span class="cine-tele-pulse"></span>
                    <span class="cine-tele-txt">// ОРБИТАЛЬНЫЙ СЕКТОР // СОЛНЕЧНАЯ СИСТЕМА // SOL-3 //</span>
                </div>
                <div class="cine-lines-wrap">
                    ${TITLE_LINES.map((_, i) => `<span class="cine-line" data-line="${i}"></span>`).join('')}
                </div>
            `;
            // Монтируем ВНУТРЬ 3D-вьюпорта: он z-index 99999 и является
            // stacking context — титр из body оказался бы под сценой.
            const mountRoot = document.getElementById('space-3d-viewport') || document.body;
            mountRoot.appendChild(el);
            this.titleEl = el;
            this.titleState = 'hidden';
            this.titleChars = 0;
            this._lastTypedCount = -1;

            const cursor = document.createElement('span');
            cursor.className = 'cine-cursor';
            cursor.textContent = TITLE_CURSOR;
            this._cursorEl = cursor;

            // Кэш спанов и текстов: titleTick выполняется КАЖДЫЙ кадр —
            // querySelectorAll/dataset-чтение в кадре недопустимы
            this._lineSpans = Array.from(el.querySelectorAll('.cine-line'));
            this._lineTexts = this._lineSpans.map(sp => TITLE_LINES[Number(sp.dataset.line)] || '');
            this._totalChars = TITLE_LINES.join('').length;
            this._preparedDissolve = null;

            // Первоначально курсор ставим в первую строку
            if (this._lineSpans[0]) {
                this._lineSpans[0].appendChild(this._cursorEl);
            }

            const cfg = CINEMATIC_CONFIG.title;
            const totalChars = this._totalChars;
            const typeDur = totalChars * cfg.typeMsPerChar;

            // Триггер старта печати: max(внутренний таймер, окончание голоса Беллы + 300мс).
            // Fallback срабатывает, если событие 'aurora:warp-voice-ended' не пришло
            // (голос выключен / файл не загрузился) — просто печатаем по таймеру.
            const voiceBonus = this.voiceEndedAt ? Math.max(0, (this.voiceEndedAt + 300) - (this.startT + cfg.startDelayMs)) : 0;
            this._timers.push(setTimeout(() => {
                this.titleState = 'typing';
                this.titleStart = performance.now();
                this.titleTypedDoneAt = this.titleStart + typeDur;
                this._timers.push(setTimeout(() => {
                    if (this.titleState === 'typing') {
                        this.titleState = 'holding';
                        // Гарантированно выводим 100% символов во всех строках без пропуска буквы «Ю»
                        this._forceCompleteText();
                    }
                }, typeDur + 100));
                // Финал титра: hold 3с после окончания печати → рассыпание на частицы
                // (fallback: prefers-reduced-motion / сбой — обычный fade 0.9с)
                const dissolveAt = typeDur + 100 + cfg.holdAfterTypedMs;
                // Предсэмплирование частиц ЗАРАНЕЕ (idle, за ~1.2с до dissolve):
                // оффскрин-рендер текста + плотный цикл по пикселям не должны
                // попасть в кадр dissolve
                if (dissolveAt > 1400) {
                    this._timers.push(setTimeout(() => this._prepareDissolve(), dissolveAt - 1200));
                }
                this._timers.push(setTimeout(() => {
                    this._dissolveTitle();
                }, dissolveAt));
            }, cfg.startDelayMs + voiceBonus));
        } catch (e) {
            console.warn('[SpaceCinematic] Титр недоступен:', e);
            this.titleEl = null;
        }
    }

    /** Вызывается из getPose каждый кадр: обновляет напечатанный текст */
    titleTick(nowMs) {
        if (!this.titleEl || this.titleState !== 'typing') return;
        const cfg = CINEMATIC_CONFIG.title;
        const totalChars = this._totalChars || TITLE_LINES.join('').length;
        const budget = Math.floor((nowMs - this.titleStart) / cfg.typeMsPerChar);
        if (budget >= totalChars) {
            this._forceCompleteText();
            this.titleState = 'holding';
            return;
        }
        if (budget === this._lastTypedCount) return;
        this._lastTypedCount = budget;
        // Кэшированные спаны и тексты (см. _buildTitle) — без замыканий,
        // querySelectorAll и dataset-чтений в кадре; slice — только на смене буквы
        let left = budget > 0 ? budget : 0;
        const spans = this._lineSpans;
        const texts = this._lineTexts;
        let activeTarget = null;
        for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            const text = texts[i] || '';
            const take = clamp(left, 0, text.length);
            if (span.textContent.length !== take) {
                span.textContent = take > 0 ? text.slice(0, take) : '';
            }
            if (take < text.length && !activeTarget) {
                activeTarget = span;
            }
            left -= take;
        }
        if (!activeTarget && spans.length > 0) {
            activeTarget = spans[spans.length - 1];
        }
        // Курсор динамически переносится к активной печатаемой строке
        if (activeTarget && this._cursorEl && this._cursorEl.parentNode !== activeTarget) {
            activeTarget.appendChild(this._cursorEl);
        }
    }

    _retireTitle(fadeMs) {
        const el = this.titleEl;
        this.titleEl = null;
        if (!el) return;
        try {
            el.classList.add('is-fading');
            el.style.transitionDuration = `${fadeMs}ms`;
            setTimeout(() => el.remove(), fadeMs + 120);
        } catch (e) { /* noop */ }
    }

    /* =====================================================================
     * Рассыпание титра на частицы (вместо простого blur-fade)
     * -------------------------------------------------------------------
     * В момент окончания hold DOM-титр мгновенно прячется (opacity 0 без
     * transition), а его форма — посимвольные Range-боксы, перерисованные
     * тем же шрифтом в оффскрин-canvas — сэмплируется непрозрачными
     * пикселями с шагом 3-4px и превращается в облако светящихся частиц
     * (#dff5ff + примесь teal #61e8e1). Частицы радиально разлетаются
     * «в космос» (easeOutCubic по скорости) с дрейфом вверх-в сторону,
     * затуханием alpha/size и мерцанием у 20%. ≤2500 частиц, один
     * rAF-цикл с самоудалением canvas-оверлея .space-cine-particles.
     * Любой сбой / prefers-reduced-motion → обычный blur-fade (is-fading).
     * =================================================================== */
    _dissolveTitle() {
        if (this.titleState !== 'holding' && this.titleState !== 'typing') return;
        const el = this.titleEl;
        if (!el) { this.titleState = 'gone'; return; }
        this.titleState = 'fading';
        let reduced = false;
        try {
            reduced = !!(window.matchMedia
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (_) { /* noop */ }
        if (reduced) { el.classList.add('is-fading'); return; }
        try {
            // Частицы, сэмплированные заранее (requestIdleCallback за ~1.2с до
            // dissolve, см. _prepareDissolve) — в самом кадре dissolve только
            // дешёвый монтаж canvas-оверлея и запуск rAF
            const prepared = this._preparedDissolve;
            this._preparedDissolve = null;
            this._dissolveToParticles(el, prepared);
        } catch (e) {
            console.warn('[SpaceCinematic] Рассыпание на частицы не удалось — обычный fade:', e);
            this._cleanupParticles();
            try { el.classList.add('is-fading'); } catch (_e) { /* noop */ }
        }
    }

    /**
     * Предсэмплирование частиц рассыпания ЗАРАНЕЕ (вызывается за ~1.2с до
     * dissolve; работа уходит в requestIdleCallback — вне кадра). Здесь всё
     * тяжёлое: Range-боксы посимвольно, оффскрин-рендер текста, getImageData
     * и цикл по пикселям с созданием частиц.
     */
    _prepareDissolve() {
        const el = this.titleEl;
        if (!el || (this.titleState !== 'holding' && this.titleState !== 'typing')) return;
        // Если Unbounded ещё не загружен — не рискуем снять форму
        // fallback-шрифтом: синхронный путь в момент dissolve отмерит уже
        // правильную (проверка точечно по шрифту титра, не по статусу всех
        // шрифтов страницы)
        try {
            if (document.fonts && document.fonts.check) {
                const fontReady = document.fonts.check('700 32px Unbounded', 'Галактика Земля 2026')
                    || document.fonts.check('700 32px Tektur', 'Галактика Земля 2026')
                    || document.fonts.check('700 32px Montserrat', 'Галактика Земля 2026');
                if (!fontReady) return;
            }
        } catch (_) { /* noop */ }
        const run = () => {
            try {
                this._preparedDissolve = this._sampleTitleParticles(el);
            } catch (e) {
                this._preparedDissolve = null; // dissolve уйдёт в синхронный путь
            }
        };
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 700 });
        else setTimeout(run, 120);
    }

    /**
     * Тяжёлая часть рассыпания: форма титра → облако частиц.
     * Возвращает { particles, minX, minY } (координаты — клиентские px).
     * Бросает исключение при любом сбое (fallback — обычный fade).
     */
    _sampleTitleParticles(el) {
        const cfg = CINEMATIC_CONFIG.title.particles;

        /* --- 1. Точная форма текста: посимвольные боксы через Range
         *        (учитывают перенос строк, разрядку и text-indent). --- */
        const cs = getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize) || 32;
        const font = `${cs.fontWeight || 700} ${fontSize}px ${cs.fontFamily || 'monospace'}`;
        const charBoxes = [];
        const rng = document.createRange();
        el.querySelectorAll('.cine-line').forEach(sp => {
            const node = sp.firstChild;
            if (!node || node.nodeType !== Node.TEXT_NODE) return;
            for (let i = 0; i < node.length; i++) {
                rng.setStart(node, i);
                rng.setEnd(node, i + 1);
                const r = rng.getBoundingClientRect();
                if (r.width > 0.5 && r.height > 0.5) {
                    charBoxes.push({ ch: node.data[i], rect: r });
                }
            }
        });
        if (!charBoxes.length) throw new Error('титр без текста');

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        charBoxes.forEach(cb => {
            minX = Math.min(minX, cb.rect.left);  minY = Math.min(minY, cb.rect.top);
            maxX = Math.max(maxX, cb.rect.right); maxY = Math.max(maxY, cb.rect.bottom);
        });
        const pad = 6;
        const bw = Math.ceil(maxX - minX) + pad * 2;
        const bh = Math.ceil(maxY - minY) + pad * 2;

        /* --- 2. Оффскрин-рендер текста и сэмплирование непрозрачных пикселей --- */
        const off = document.createElement('canvas');
        off.width = bw;
        off.height = bh;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) throw new Error('canvas 2d недоступен');
        octx.font = font;
        octx.textBaseline = 'alphabetic';
        octx.fillStyle = '#fff';
        // Базовая линия — half-leading модель CSS line box (высота бокса
        // символа из Range соответствует line box строки)
        const probe = octx.measureText('Мг');
        const fba = probe.fontBoundingBoxAscent != null ? probe.fontBoundingBoxAscent : fontSize * 0.82;
        const fbd = probe.fontBoundingBoxDescent != null ? probe.fontBoundingBoxDescent : fontSize * 0.24;
        charBoxes.forEach(cb => {
            const halfLead = ((cb.rect.height || fontSize * 1.5) - (fba + fbd)) / 2;
            octx.fillText(cb.ch, cb.rect.left - minX + pad, cb.rect.top - minY + pad + halfLead + fba);
        });
        const img = octx.getImageData(0, 0, bw, bh).data;

        // Шаг сэмплирования подбираем по площади текста под бюджет maxCount,
        // затем жёсткая отсечка сверху (частиц ≤ 2500)
        const step = clamp(
            Math.ceil(Math.sqrt((bw * bh) * 0.15 / cfg.maxCount)),
            cfg.sampleStepMin, cfg.sampleStepMax
        );
        const palette = ['rgba(223,245,255,1)', 'rgba(97,232,225,1)', 'rgba(255,255,255,1)'];
        const pickFill = () => {
            const r = Math.random();
            return r < 0.30 ? palette[1] : (r < 0.92 ? palette[0] : palette[2]);
        };
        const cx = bw / 2, cy = bh / 2;
        const particles = [];   // координаты — в клиентских px (как у Range-боксов)
        for (let y = 0; y < bh; y += step) {
            for (let x = 0; x < bw; x += step) {
                if (img[(y * bw + x) * 4 + 3] < 110) continue;
                // Радиальная скорость от центра текста наружу (+ разброс угла)
                const dx = x - cx, dy = y - cy;
                const len = Math.hypot(dx, dy) || 1;
                const wob = (Math.random() - 0.5) * 0.9;
                const cosW = Math.cos(wob), sinW = Math.sin(wob);
                const dirX = (dx / len) * cosW - (dy / len) * sinW;
                const dirY = (dx / len) * sinW + (dy / len) * cosW;
                const spread = cfg.radialMin + Math.random() * (cfg.radialMax - cfg.radialMin);
                particles.push({
                    x: minX - pad + x,
                    y: minY - pad + y,
                    vx: dirX * spread * (0.55 + Math.random() * 0.9),
                    vy: dirY * spread * (0.55 + Math.random() * 0.9),
                    drX: (Math.random() - 0.5) * cfg.driftSide, // дрейф «в космос»:
                    drY: -cfg.driftUp * (0.35 + Math.random() * 0.65), // вверх-в сторону
                    s: step * (0.55 + Math.random() * 0.5),
                    a: 0.75 + Math.random() * 0.25,
                    fill: pickFill(),
                    tw: Math.random() < cfg.twinkleFrac,   // 20% — с мерцанием
                    twP: Math.random() * Math.PI * 2,
                    twS: 6 + Math.random() * 9
                });
            }
        }
        while (particles.length > cfg.maxCount) {
            const i = (Math.random() * particles.length) | 0;
            particles[i] = particles[particles.length - 1];
            particles.pop();
        }
        if (!particles.length) throw new Error('не удалось сэмплировать текст');

        return { particles, minX, minY };
    }

    _dissolveToParticles(el, prepared) {
        /* --- Частицы: из предсэмплированных (обычный путь) или синхронно
         *     (fallback, если prepare не успел/не удался) --- */
        let particles;
        if (prepared && prepared.particles && prepared.particles.length) {
            particles = prepared.particles;
        } else {
            particles = this._sampleTitleParticles(el).particles;
        }
        const cfg = CINEMATIC_CONFIG.title.particles;

        /* --- 3. Canvas-оверлей: fixed поверх титра, тот же z-index, лениво --- */
        const mountRoot = el.parentElement || document.body;
        const cv = document.createElement('canvas');
        cv.className = 'space-cine-particles';
        cv.style.zIndex = String(CINEMATIC_CONFIG.zIndex);
        mountRoot.appendChild(cv);
        const crect = cv.getBoundingClientRect();
        if (!(crect.width > 0 && crect.height > 0)) throw new Error('вьюпорт скрыт');
        const vw = crect.width, vh = crect.height;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(vw * dpr);
        cv.height = Math.round(vh * dpr);
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('canvas 2d недоступен');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._particleCanvas = cv;

        /* --- 4. Один rAF-цикл разлёта с самоудалением --- */
        const dur = cfg.durationMs;
        const offX = crect.left, offY = crect.top;
        const t0 = performance.now();
        const stepFn = (now) => {
            try {
                const p = clamp((now - t0) / dur, 0, 1);
                ctx.clearRect(0, 0, vw, vh);
                if (p >= 1) { this._cleanupParticles(); return; }
                const e = 1 - Math.pow(1 - p, 3);  // easeOutCubic: резкий старт, плавное торможение
                ctx.globalCompositeOperation = 'lighter';
                for (let i = 0; i < particles.length; i++) {
                    const pt = particles[i];
                    let a = pt.a * (1 - p);
                    if (pt.tw) a *= 0.55 + 0.45 * Math.sin(now * 0.001 * pt.twS + pt.twP);
                    if (a <= 0.02) continue;
                    const s = pt.s * (1 - 0.55 * p);
                    ctx.globalAlpha = a > 1 ? 1 : a;
                    ctx.fillStyle = pt.fill;
                    ctx.fillRect(
                        pt.x + pt.vx * e + pt.drX * p - offX - s / 2,
                        pt.y + pt.vy * e + pt.drY * p - offY - s / 2,
                        s, s
                    );
                }
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                this._particleRAF = requestAnimationFrame(stepFn);
            } catch (err) {
                this._cleanupParticles();
            }
        };
        /* --- 5. Мгновенно прячем DOM-титр (без transition — нет двойного
         *        текста) и запускаем единственный rAF-цикл разлёта --- */
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.filter = 'none';
        // Титр заменён частицами: снимаем с контроллера, чтобы _retireTitle
        // (прерывание/end) не трогал уже скрытый элемент
        this._particleTitleEl = el;
        this.titleEl = null;
        this._particleRAF = requestAnimationFrame(stepFn);
    }

    /** Полная уборка рассыпания: rAF, canvas-оверлей, скрытый DOM-титр */
    _cleanupParticles() {
        if (this._particleRAF) {
            try { cancelAnimationFrame(this._particleRAF); } catch (_) { /* noop */ }
            this._particleRAF = 0;
        }
        if (this._particleCanvas) {
            try { this._particleCanvas.remove(); } catch (_) { /* noop */ }
            this._particleCanvas = null;
        }
        if (this._particleTitleEl) {
            try { this._particleTitleEl.remove(); } catch (_) { /* noop */ }
            this._particleTitleEl = null;
        }
    }

    /* =====================================================================
     * Импульс перехода (фаза C) — БЕЗ CSS filter на canvas-слоях.
     * ВАЖНО (было): filter: blur(13px) на полноэкранном canvas форсирует
     * перерастеризацию слоя КАЖДЫЙ кадр анимации — кадры 15-30мс+. ВАЖНО
     * (всегда): filter на .space-3d-world (или любом предке карточек) —
     * grouping-свойство: превращает preserve-3d мира в flat, сцена уходит
     * за камеру. Дешёвая замена — только композиторные свойства:
     *   • вспышка полупрозрачным оверлеем (.space-cine-flash, opacity-анимация);
     *   • микро-наезд «камеры»: transform: scale на канвасах (без repaint);
     *   • лёгкий opacity-пульс самого оверлея — GPU-композитор, без растеризации.
     * =================================================================== */
    _motionPulse() {
        try {
            const C = CINEMATIC_CONFIG.transition;
            const engine = this.engine;
            if (!engine) return;
            // Импульс — чисто декоративное движение: при reduced-motion не
            // запускаем ни вспышку, ни микро-наезд
            try {
                if (window.matchMedia
                    && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            } catch (_rm) { /* noop */ }

            // 1. Вспышка: оверлей с radial-градиентом, анимируется ТОЛЬКО opacity
            const flash = document.createElement('div');
            flash.className = 'space-cine-flash';
            flash.style.zIndex = String(CINEMATIC_CONFIG.zIndex + 1);
            flash.style.animationDuration = `${C.blurPeakMs}ms`;
            const mountRoot = document.getElementById('space-3d-viewport') || document.body;
            mountRoot.appendChild(flash);
            this._flashEl = flash;

            // 2. Микро-наезд канвасов: transform — композиторная операция,
            //    перерастеризации слоя не происходит (в отличие от filter)
            const canvases = [engine.canvas, document.getElementById('space-3d-gl')]
                .filter(Boolean);
            canvases.forEach(el => {
                el.style.transition = `transform ${C.blurPeakMs}ms ease-in`;
                el.style.transform = 'scale(1.016)';
            });

            this._timers.push(setTimeout(() => {
                if (this._flashEl === flash) {
                    flash.classList.add('is-releasing');
                    flash.style.animationDuration = `${C.blurReleaseMs}ms`;
                }
                canvases.forEach(el => {
                    el.style.transition = `transform ${C.blurReleaseMs}ms ease-out`;
                    el.style.transform = '';
                });
                this._timers.push(setTimeout(() => {
                    if (this._flashEl === flash) {
                        try { flash.remove(); } catch (_e) { /* noop */ }
                        this._flashEl = null;
                    }
                    canvases.forEach(el => { el.style.transform = ''; el.style.transition = ''; });
                }, C.blurReleaseMs + 100));
            }, C.blurPeakMs + 60));
        } catch (e) { /* noop */ }
    }

    _clearPulse() {
        try {
            if (this._flashEl) {
                try { this._flashEl.remove(); } catch (_e) { /* noop */ }
                this._flashEl = null;
            }
            const engine = this.engine;
            [engine && engine.canvas, document.getElementById('space-3d-gl')]
                .filter(Boolean)
                .forEach(el => { el.style.transform = ''; el.style.transition = ''; });
        } catch (e) { /* noop */ }
    }

    /* =====================================================================
     * Каскадный вылет карточек (родной stagger CosmonautRing)
     * Показывает ТОТ ЖЕ синглтон, что использует space3d.js (импорт с тем же
     * version-спецификатором). Страховка: если слой в DOM не совпадает с
     * container'ом импортированного синглтона — берём window.CosmonautRing.
     * =================================================================== */
    _showRing() {
        if (this.ringShown) return;
        this.ringShown = true;
        try {
            const layer = document.getElementById('cosmo-ring-layer');
            let ring = CosmonautRing;
            if (layer && ring && ring.container !== layer) {
                const w = window.CosmonautRing;
                if (w && w.container === layer) ring = w;
            }
            if (ring && ring.show && !ring.isActive) ring.show();
        } catch (e) { /* noop */ }
    }

    /* =====================================================================
     * События
     * =================================================================== */
    _onWarpVoiceEnded() {
        this.voiceEndedAt = performance.now();
    }

    _onInterrupt(e) {
        if (!this.active) return;
        // Игнорируем клики по HUD-элементам? Нет: ЛЮБОЙ ввод прерывает кинематику,
        // но управление пользователю передаётся всегда корректно.
        this.end('user-interrupt');
    }

    _clearTimers() {
        this._timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        this._timers = [];
    }

    /**
     * Страховочный watchdog (400 мс): Kinematica приводится в движение
     * renderLoop'ом Space3D (getPose 1 раз/кадр). Watchdog лишь гарантирует,
     * что кинематика не «зависнет»: закрывает её при закрытии сцены, ошибке
     * или истечении суммарной длительности фаз + запас.
     */
    _onWatchdog() {
        if (!this.active) return;
        try {
            if (!this.engine || this.engine.isOpen === false) {
                this.end('close');
                return;
            }
            const P = CINEMATIC_CONFIG.phases;
            const totalSec = P.approach + P.orbit + P.transition + 1.5;
            if ((performance.now() - this.startT) / 1000 > totalSec) {
                this.end('done');
            }
        } catch (e) {
            console.warn('[SpaceCinematic] Watchdog остановил кинематику:', e);
            this.end('error');
        }
    }
}

/* ========================================================================
 * Публичный API: SpaceCinematic.start / end / isActive
 * ====================================================================== */
const controller = new SpaceCinematicController();

export const SpaceCinematic = {
    /** Запуск кинематографического прилёта. engine — инстанс Space3D. */
    start(engine) {
        try {
            return controller.start(engine);
        } catch (e) {
            console.warn('[SpaceCinematic] Старт не удался — сцена открывается как раньше:', e);
            try { controller.end('error'); } catch (e2) { /* noop */ }
            return false;
        }
    },
    /** Немедленное завершение кинематики (reason: done|user-interrupt|close|error) */
    end(reason) {
        try { controller.end(reason || 'done'); } catch (e) { /* noop */ }
    },
    isActive() {
        try { return controller.isActive(); } catch (e) { return false; }
    },
    /** Подписка на warp-события: вызывается space_warp.js при 'ended' голоса Беллы */
    onWarpVoiceEnded() {
        try { controller._onWarpVoiceEnded(); } catch (e) { /* noop */ }
    },
    /** Конфиг для внешней тюнинга/тестов */
    config: CINEMATIC_CONFIG
};

if (typeof window !== 'undefined') {
    window.SpaceCinematic = SpaceCinematic;
}
export default SpaceCinematic;
