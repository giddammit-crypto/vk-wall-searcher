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
 *   ФАЗА B «ORBIT»      ~22.5с (увеличена ровно на 15с) — грандиозный многоракурсный
 *                       кинематографический облёт Земли со склейкой скоростей по производным
 *                       (C1-эрмитов кубический сплайн, нулевое ускорение на границах):
 *                       • Ракурс 1 (0.0..5.6с, u 0..0.25): скольжение вдоль сумеречного
 *                         терминатора и золотых ночных огней городов, roll +1.4°;
 *                       • Ракурс 2 (5.6..12.4с, u 0.25..0.55): панорамный разворот yaw
 *                         -22.5° → +16.0° с горизонтом и свечением атмосферного лимба,
 *                         МКС и спутники пересекают кадр по орбитам;
 *                       • Ракурс 3 (12.4..18.0с, u 0.55..0.80): кинематографический наклон
 *                         (pitch -28.5° → -14.0°, yaw → -25.0°) с выходом Луны в кадр
 *                         на фоне звёздного скопления и изгиба планеты (Earthrise);
 *                       • Ракурс 4 (18.0..22.5с, u 0.80..1.00): переходная стабилизация и
 *                         плавный «подлёт» и подъём камеры к точке и плоскости орбиты
 *                         карточек космонавтов (pitch -14° → -3°, zoom 1.36 → 1.12, yaw → 0°).
 *
 *   ФАЗА C «TRANSITION» ~3.5с — «выдох» камеры к эталонной позе обычного
 *                       открытия (pitch → 0, zoom 1.12 → 1.0, easeInOutCubic,
 *                       лёгкий overshoot −3% к зуму в середине фазы),
 *                       композиторная вспышка/микро-наезд (.space-cine-flash, ~320мс),
 *                       каскадный вылет карточек кольца космонавтов (родной stagger CosmonautRing),
 *                       затем сцена возвращается в обычный интерактивный режим.
 *
 *   ТИТР: печатается по буквам в фазах A-B, три строки (Shoptronic SP 700 / Arial цифры,
 *   letter-spacing 0.14em), курсор «▍», комфортно держится 4.5с после печати, затем
 *   РАССЫПАЕТСЯ на светящиеся частицы (canvas-оверлей .space-cine-particles,
 *   радиальный разлёт «в космос» ~1.1с, ≤2500 частиц, один rAF-цикл).
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
    // Длительности фаз, секунды (облёт увеличен на 15с: 7.5с -> 22.5с)
    phases: {
        approach: 5.5,     // Фаза A
        orbit: 22.5,       // Фаза B (+15 сек)
        transition: 3.5    // Фаза C
    },
    // Фаза A «Approach»
    approach: {
        pitchFrom: -16,        // мягкий панорамный обзор горизонта планеты и космоса
        pitchTo: -42,          // глубокий наклон камеры к терминатору и океану планеты
        zoomFrom: 1.05,        // от лёгкого общего плана
        zoomTo: 1.88,          // плавное приближение к планете
        zoomDecayRate: 2.8,    // кинематографическое экспоненциальное замедление
        yawFrom: 4.0,          // правый заход по орбитальной дуге
        yawTo: -16.0,          // скольжение к терминатору
        rollAmp: 2.2,          // кинематографический наклон камеры (Dutch angle)
        rollEnd: 1.2,          // крен на выходе из фазы для бесшовной стыковки с Phase B
        // Инерционная стабилизация подвеса камеры космического челнока
        hyperNoiseAmp: 0.12,   // амплитуда микро-волн стабилизации
        hyperNoiseDur: 2.5,    // плавное успокоение подвеса
        pushInFrac: 0.025,     // инерционный наезд
        pushInWindow: 1.4      // окно наезда в конце фазы
    },
    // Фаза B «Cinematic orbit» (22.5 сек, многоракурсный кинематографический облёт Земли)
    orbit: {
        yawStart: -16.0,
        yawEnd: 0.0,
        pitchFrom: -42.0,
        pitchTo: -2.5,
        zoomFrom: 1.88,
        zoomTo: 1.10,
        pitchDriftAmp: 0.8,    // остаточная невесомая плавучесть камеры, градусы
        // 4 ключевых ракурса облёта (без изломов скорости, C1-эрмитова сплайн-склейка):
        // 1. Терминатор и ночные огни городов (u: 0.00 -> 0.25)
        // 2. Панорама горизонта, лимб, МКС и спутники (u: 0.25 -> 0.55)
        // 3. Кинематографический наклон с выходом Луны в кадр (u: 0.55 -> 0.80)
        // 4. Стабилизация и подъём к орбите карточек (u: 0.80 -> 1.00)
        waypoints: [
            { u: 0.00, yaw: -16.0, pitch: -42.0, zoom: 1.88, roll: 1.2 },
            { u: 0.25, yaw: -26.0, pitch: -36.5, zoom: 1.76, roll: 2.2 },
            { u: 0.55, yaw:  18.0, pitch: -25.0, zoom: 1.54, roll: -1.6 },
            { u: 0.80, yaw: -18.0, pitch: -13.0, zoom: 1.32, roll: -0.4 },
            { u: 1.00, yaw:   0.0, pitch:  -2.5, zoom: 1.10, roll: 0.0 }
        ],
        // Согласованные касательные Hermite-сплайна (C1-склейка)
        tangents: [
            { yaw: -20.0, pitch: 11.0, zoom: -0.24, roll: 2.0 },
            { yaw: 61.818, pitch: 30.909, zoom: -0.618, roll: -5.091 },
            { yaw: 14.545, pitch: 42.727, zoom: -0.800, roll: -4.727 },
            { yaw: -40.0, pitch: 50.0, zoom: -0.978, roll: 3.556 },
            { yaw: 0.0, pitch: 0.0, zoom: 0.0, roll: 0.0 }
        ]
    },
    // Фаза C «Transition to cards»: плавный отвод взгляда к эталонной позе
    // обычного открытия сцены (pitch 0 / zoom 1.0 / yaw 0). Карточки вылетают,
    // когда камера стабилизировалась в их орбитальной плоскости.
    transition: {
        pitchTo: 0,            // взгляд от Земли точно на горизонтальную плоскость кольца карточек
        zoomTo: 1.0,           // эталонный зум обычного режима
        yawTo: 0,              // центрирование на кольце
        yawDrift: 1.5,         // лёгкий микро-доворот
        blurDelayMs: 250,      // задержка blur/flash-импульса от начала фазы
        blurPeakMs: 320,       // время нарастания импульса до пика
        blurReleaseMs: 480,    // время спада импульса
        ringDelayMs: 420,      // задержка каскадного вылета карточек
        zoomOvershoot: 0.03    // «выдох»: overshoot −3% к зуму в середине фазы
    },
    // Титр: печать → комфортный hold 4.5с → рассыпание на частицы (fallback — fade 0.9с)
    title: {
        startDelayMs: 900,     // пауза после старта сцены до первой буквы
        typeMsPerChar: 48,     // скорость печати (45-55 мс/символ)
        holdAfterTypedMs: 4500,// комфортное удержание 4.5с после окончания печати
        fadeMs: 900,           // fallback: blur 0→14px + opacity→0
        // Рассыпание титра на частицы (см. _dissolveToParticles)
        particles: {
            durationMs: 1100,  // разлёт (easeOutCubic по скорости)
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
import { CosmonautRing } from './cosmonaut_ring.js?v=4.18.2';

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

/**
 * Эрмитов кубический сплайн (C1-непрерывность, согласование скоростей без изломов)
 * p0, p1 — значения на краях отрезка; m0, m1 — касательные (производные по u);
 * du — длина отрезка в параметрическом пространстве; t — локальный параметр (0..1).
 */
const hermite01 = (p0, p1, m0, m1, du, t) => {
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * p0 + h10 * m0 * du + h01 * p1 + h11 * m1 * du;
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
            yaw = lerp(A.yawFrom, A.yawTo, easeInOutSine(k));
            // Плавный кинематографический крен: мягкий заход в вираж и сведение к rollEnd
            const rollWave = Math.sin(k * Math.PI) * A.rollAmp;
            roll = lerp(0, A.rollEnd, smooth01(k)) + rollWave;

            // Мягкая инерционная стабилизация подвеса камеры космического челнока
            if (t < A.hyperNoiseDur) {
                const nEnv = 1 - smooth01(t / A.hyperNoiseDur);
                yaw += A.hyperNoiseAmp * nEnv
                    * (Math.sin(t * 3.1) * 0.7 + Math.sin(t * 1.7 + 0.9) * 0.3);
                pitch += A.hyperNoiseAmp * nEnv
                    * (Math.sin(t * 2.5 + 0.6) * 0.7 + Math.sin(t * 3.9 + 1.4) * 0.3);
                roll += A.hyperNoiseAmp * 0.6 * nEnv * Math.sin(t * 2.1 + 1.1);
            }

            // Инерционный наезд: в последние pushInWindow секунды — лёгкий
            // push-in с возвратом
            const winStart = tA - A.pushInWindow;
            if (t >= winStart) {
                const u = clamp((t - winStart) / A.pushInWindow, 0, 1);
                const attack = easeOutBack(clamp(u / 0.58, 0, 1), 0.8);
                const release = 1 - smooth01(clamp((u - 0.58) / 0.42, 0, 1));
                const onset = smooth01(clamp(u / 0.14, 0, 1));
                zoom *= 1 + A.pushInFrac * (u < 0.58 ? attack : release) * onset;
            }
        } else if (t < tA + tB) {
            /* --- ФАЗА B «Cinematic orbit»: 22.5с многоракурсный кинематографический облёт ---
             * 4 ракурса Земли со склейкой по производным (C1-эрмитов кубический сплайн):
             *   Ракурс 1 (u: 0.00..0.25): скольжение вдоль сумеречного терминатора и ночных огней городов
             *   Ракурс 2 (u: 0.25..0.55): панорамный разворот, горизонт и свечение лимба Земли, МКС и спутники
             *   Ракурс 3 (u: 0.55..0.80): наклон с выходом Луны в кадр на фоне звёздного скопления и изгиба планеты
             *   Ракурс 4 (u: 0.80..1.00): стабилизация и подъём к орбите карточек космонавтов
             */
            this.phase = 'orbit';
            const k = clamp((t - tA) / tB, 0, 1);
            const W = B.waypoints;
            const M = B.tangents;
            const N = W.length;
            let seg = 0;
            while (seg < N - 2 && k > W[seg + 1].u) seg++;
            const p0 = W[seg], p1 = W[seg + 1];
            const m0 = M[seg], m1 = M[seg + 1];
            const du = p1.u - p0.u;
            const tau = clamp((k - p0.u) / du, 0, 1);

            yaw = hermite01(p0.yaw, p1.yaw, m0.yaw, m1.yaw, du, tau);
            pitch = hermite01(p0.pitch, p1.pitch, m0.pitch, m1.pitch, du, tau);
            zoom = hermite01(p0.zoom, p1.zoom, m0.zoom, m1.zoom, du, tau);
            roll = hermite01(p0.roll, p1.roll, m0.roll, m1.roll, du, tau);

            // Невесомая органическая плавучесть камеры (синусоида ±0.8°):
            // Огибающая smooth01 гасит дрейф у краёв фазы k=0 и k=1, сохраняя строгую C1-гладкость
            const driftEnv = smooth01(k * 5) * smooth01((1 - k) * 5);
            pitch += B.pitchDriftAmp * Math.sin(k * Math.PI * 4 + 0.5) * driftEnv;
            yaw += (B.pitchDriftAmp * 0.4) * Math.sin(k * Math.PI * 3 + 1.2) * driftEnv;
        } else if (t < tA + tB + tC) {
            /* --- ФАЗА C «Transition to cards» --- */
            this.phase = 'transition';
            const tk = (t - tA - tB);
            const k = clamp(tk / tC, 0, 1);
            const e = easeInOutCubic(k);
            yaw = lerp(B.yawEnd, C.yawTo || 0, e);
            pitch = lerp(B.pitchTo, C.pitchTo, e);
            // «Выдох» камеры: плавный отвод 1.12 → 1.0 с лёгким overshoot −3%
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
                const fontReady = document.fonts.check('700 32px "Shoptronic SP"', 'Галактика Земля 2026')
                    || document.fonts.check('700 32px Shoptronic', 'Галактика Земля 2026')
                    || document.fonts.check('700 32px Unbounded', 'Галактика Земля 2026')
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
