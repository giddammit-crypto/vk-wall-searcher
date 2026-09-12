/**
 * AURORA 3.9 — Оптическая модель Солнца (линзовый блик)
 *
 * Прошлый блик был набором «мультяшных» спрайтов: ровные круги, одинаковые
 * лучи, отсутствие связи с физикой объектива. Здесь модель построена так,
 * как это делают в кино-графике: отдельно считаются ФИЗИЧЕСКИЕ компоненты
 * рассеяния в объективе, и каждая имеет свою причину.
 *
 *   1. Диск Солнца      — угловой радиус 0.2665°, потемнение к краю (limb
 *                         darkening) по закону I(μ) = 1 − u(1 − μ), u ≈ 0.6.
 *   2. Венец (corona)   — свечение хромосферы, спад ∝ r^-2.
 *   3. Вуаль (veiling)  — рассеяние на неоднородностях стекла, ∝ r^-2.5
 *                         с «зерном» сенсора, чтобы убрать ступеньки градиента.
 *   4. Дифракция        — 6 лучей от шестилепестковой диафрагмы + длинные
 *                         горизонтальные лучи от кромки оправы.
 *   5. Анаморфная полоса — горизонтальная растяжка анаморфной оптики с
 *                         дисперсией: сине-фиолетовый по краям, тёплый в центре.
 *   6. Призраки          — цепочка отражений между линзами вдоль оси
 *                         «солнце → центр кадра», с хроматическим сдвигом
 *                         каналов и гексагональной формой диафрагмы.
 *
 * Всё строится один раз в спрайтовый атлас (bake), а в кадре остаётся только
 * ~14 вызовов drawImage в режиме 'lighter' — это дёшево и не даёт пересчёта
 * градиентов каждый кадр (важно для 60 FPS).
 */

const DEG = Math.PI / 180;
const SUN_ANGULAR_RADIUS = 0.2665 * DEG;   // радиан: половина углового диаметра

/** Детерминированный ГПСЧ — «пыль» на оптике не должна меняться каждый кадр. */
function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/**
 * Функция рассеяния объектива (glare spread function).
 *
 * x — угловое расстояние от Солнца, выраженное в РАДИУСАХ ДИСКА Солнца.
 * Реальная оптика даёт степенной спад: сильное ядро ∝ x^-2.4 и очень широкая
 * «дымка» ∝ x^-0.55, из-за которой чёрное небо рядом с Солнцем светлеет на
 * проценты. Прошлый блик был «мыльной заливкой» всего кадра — именно потому,
 * что профиль не спадал с расстоянием.
 */
function glareCore(x) {
    return Math.min(0.34, 0.16 * Math.pow(Math.max(x, 0.5), -2.2));
}
function glareWide(x) {
    return Math.min(0.05, 0.022 * Math.pow(Math.max(x, 1), -0.55));
}

/* --------------------------------------------------------------------------
 * Спрайтовый атлас оптики
 * ------------------------------------------------------------------------ */
const ATLAS = { scale: 0, key: '' };

function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}

/**
 * Спрайт вуали: радиальный профиль, заданный в радиусах диска Солнца.
 * Спрайт затем рисуется с размером, пропорциональным радиусу диска, поэтому
 * одна запечённая текстура корректно работает при любом зуме камеры.
 *
 * @param {number} size  — размер спрайта, px
 * @param {number} xFrom — минимальное угловое расстояние (в радиусах диска)
 * @param {number} xTo   — максимальное угловое расстояние
 * @param {function} fn  — функция рассеяния fn(x) → альфа
 */
function bakeGlare(size, rng, xFrom, xTo, fn) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const r = size / 2;
    // Профиль в t (0 — центр спрайта, 1 — край). 40 ступеней дают гладкую
    // кривую: степень кодируется точно, колец не видно.
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = xFrom + (xTo - xFrom) * t;
        // Плавное гашение у края спрайта: за его пределами профиль ~0, а
        // резкая граница читалась бы как квадрат на чёрном небе.
        const taper = t > 0.86 ? Math.pow((1 - t) / 0.14, 1.6) : 1;
        const a = Math.min(1, Math.max(0, fn(x) * taper));
        g.addColorStop(t, `rgba(255, 250, 240, ${a.toFixed(5)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Зерно сенсора: ломает ступеньки 8-битного градиента (dithering)
    const grain = ctx.getImageData(0, 0, size, size);
    const d = grain.data;
    for (let i = 0; i < d.length; i += 4) {
        const n = (rng() - 0.5) * 5.5;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(grain, 0, 0);
    return c;
}

/**
 * Диск Солнца с потемнением к краю и венцом хромосферы.
 * Радиус диска в спрайте — 26% (остальное — венец и переход к вуали).
 */
function bakeDisc(size) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const r = size / 2;
    const discR = r * 0.26;

    // Венец: r^-2 наружу от диска
    const halo = ctx.createRadialGradient(r, r, discR * 0.8, r, r, r);
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = discR * 0.8 + (r - discR * 0.8) * t;
        const rel = discR / Math.max(dist, 1);
        const a = Math.pow(rel, 2.1) * 0.55;
        halo.addColorStop(t, `rgba(255, 244, 214, ${a.toFixed(4)})`);
    }
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Диск: потемнение к краю I(μ) = 1 − 0.6(1 − μ)
    const g = ctx.createRadialGradient(r, r, 0, r, r, discR);
    const ds = 10;
    for (let i = 0; i <= ds; i++) {
        const t = i / ds;
        const mu = Math.sqrt(Math.max(0, 1 - t * t));
        const v = 1 - 0.6 * (1 - mu);
        const vv = Math.round(255 * Math.min(1, v));
        g.addColorStop(t, `rgb(${vv}, ${Math.round(vv * 0.985)}, ${Math.round(vv * 0.955)})`);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, discR, 0, Math.PI * 2);
    ctx.fill();

    // Ядро: пересвет в центре
    const core = ctx.createRadialGradient(r, r, 0, r, r, discR * 0.5);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(r - discR, r - discR, discR * 2, discR * 2);

    return c;
}

/** Анаморфная полоса: горизонтальная растяжка с дисперсией по краям. */
function bakeStreak(w, h) {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const cy = h / 2;

    // Основа: тёплая полоса с резким затуханием к краям
    const warm = ctx.createLinearGradient(0, 0, w, 0);
    const stops = 22;
    for (let i = 0; i <= stops; i++) {
        const t = i / stops;
        const x = Math.abs(t - 0.5) * 2;                 // 0 центр → 1 край
        const a = Math.pow(Math.max(0, 1 - x), 5.0) * 0.62;
        // Дисперсия: к краям полоса уходит в сине-фиолетовый
        const blue = Math.pow(x, 1.7);
        const r = Math.round(255 * (1 - blue * 0.45));
        const g = Math.round(250 * (1 - blue * 0.30));
        const b = Math.round(235 + blue * 20);
        warm.addColorStop(t, `rgba(${r}, ${g}, ${b}, ${a.toFixed(4)})`);
    }
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);

    // Мягкий вертикальный профиль: анаморфная нить — не «брусок», а полоса
    // с плавным затуханием к верхней и нижней кромке.
    const softV = ctx.createLinearGradient(0, 0, 0, h);
    softV.addColorStop(0.00, 'rgba(255,255,255,0)');
    softV.addColorStop(0.20, 'rgba(255,255,255,0.10)');
    softV.addColorStop(0.38, 'rgba(255,255,255,0.48)');
    softV.addColorStop(0.50, 'rgba(255,255,255,0.85)');
    softV.addColorStop(0.62, 'rgba(255,255,255,0.48)');
    softV.addColorStop(0.80, 'rgba(255,255,255,0.10)');
    softV.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = softV;
    ctx.fillRect(0, 0, w, h);

    // Пересвеченная нить по центру — световая «жила» блика
    const inside = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= stops; i++) {
        const t = i / stops;
        const x = Math.abs(t - 0.5) * 2;
        inside.addColorStop(t, `rgba(255,255,255,${Math.pow(Math.max(0, 1 - x), 6.5).toFixed(4)})`);
    }
    const maskC = makeCanvas(w, h);
    const mctx = maskC.getContext('2d');
    mctx.fillStyle = inside;
    mctx.fillRect(0, 0, w, h);
    mctx.globalCompositeOperation = 'destination-in';
    const coreV = mctx.createLinearGradient(0, cy - h * 0.16, 0, cy + h * 0.16);
    coreV.addColorStop(0, 'rgba(255,255,255,0)');
    coreV.addColorStop(0.5, 'rgba(255,255,255,0.90)');
    coreV.addColorStop(1, 'rgba(255,255,255,0)');
    mctx.fillStyle = coreV;
    mctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(maskC, 0, 0);
    return c;
}

/** Лучи диафрагмы: 6 лепестков + 2 длинных горизонтальных. */
function bakeSpikes(size, arms, longH) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const rng = makeRng(0x51ec7a);

    for (let i = 0; i < arms; i++) {
        const ang = (i / arms) * Math.PI * 2 + (i % 2 ? 0.035 : 0);
        const len = size * 0.5 * (i % 3 === 0 ? 0.92 : 0.68) * (0.94 + rng() * 0.12);
        const halfW = size * 0.0052 * (0.8 + rng() * 0.4);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        const steps = 12;
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const a = Math.pow(Math.max(0, 1 - t), 1.8) * 0.42;
            g.addColorStop(t, `rgba(255, 250, 235, ${a.toFixed(4)})`);
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -halfW);
        ctx.lineTo(len, -halfW * 0.18);
        ctx.lineTo(len, halfW * 0.18);
        ctx.lineTo(0, halfW);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Длинные горизонтальные лучи (кромка оправы)
    const gl = ctx.createLinearGradient(0, 0, size, 0);
    for (let s = 0; s <= 20; s++) {
        const t = s / 20;
        const x = Math.abs(t - 0.5) * 2;
        gl.addColorStop(t, `rgba(255, 252, 240, ${Math.pow(Math.max(0, 1 - x), 3.6).toFixed(4)})`);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gl;
    ctx.fillRect(0, cy - size * 0.006 * longH, size, size * 0.012 * longH);

    return c;
}

/** Призрак линзы: гексагональная диафрагма с мягкими краями. */
function bakeGhost(size, shape, tint) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const r = size / 2;

    const hexPath = (radius) => {
        ctx.beginPath();
        if (shape === 'hex') {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
                const x = r + Math.cos(a) * radius;
                const y = r + Math.sin(a) * radius;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else {
            ctx.arc(r, r, radius, 0, Math.PI * 2);
        }
    };

    const [cr, cg, cb] = tint;

    // Мягкая кромка диафрагмы: вложенные контуры с нарастающей плотностью.
    // Жёсткий шестиугольник читался бы как «пузырь», а не как отражение линзы.
    const layers = 8;
    for (let k = 0; k < layers; k++) {
        const spread = 1 - k / layers;
        ctx.globalAlpha = 0.10 + (k / (layers - 1)) * 0.34;
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.26)`;
        hexPath(r * (0.62 + 0.36 * spread));
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Внутренняя структура отражения: край ярче центра (кольцевой отблеск)
    ctx.save();
    hexPath(r * 0.94);
    ctx.clip();
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const edge = 0.26 + Math.pow(t, 3.4) * 0.80;
        const a = Math.min(1, edge * (1 - Math.pow(t, 7.0)));
        g.addColorStop(t, `rgba(${cr}, ${cg}, ${cb}, ${(a * 0.34).toFixed(4)})`);
    }
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    if (shape === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255, 240, 220, 0.16)';
        ctx.lineWidth = Math.max(1, size * 0.035);
        ctx.beginPath();
        ctx.arc(r, r, r * 0.86, 0, Math.PI * 2);
        ctx.stroke();
    }
    return c;
}

/* --------------------------------------------------------------------------
 * ПУБЛИЧНЫЙ ИНТЕРФЕЙС
 * ------------------------------------------------------------------------ */
export const SunOptics = {
    SUN_ANGULAR_RADIUS,
    /** Радиус диска Солнца в пикселях для фокусного расстояния f (px). */
    discRadiusPx(focalPx) {
        return Math.max(1.6, focalPx * Math.tan(SUN_ANGULAR_RADIUS));
    },

    /**
     * Однократное запекание оптики под текущий масштаб экрана.
     * @param {number} scale — коэффициент размера (напр. min(w,h)/900)
     */
    ensureSprites(scale) {
        const s = Math.max(0.45, Math.min(2.4, scale));
        const key = s.toFixed(2);
        if (ATLAS.key === key && ATLAS.veil) return ATLAS;

        const rng = makeRng(0x9e3779b9);
        ATLAS.key = key;
        ATLAS.scale = s;
        // Две составляющие рассеяния: ближнее ядро (1…6 радиусов диска) и
        // широкая дымка (3…400 радиусов) — как у настоящего объектива.
        ATLAS.veilCore = bakeGlare(Math.round(384 * s), rng, 0.0, 6.0, (x) => glareCore(x) + 0.01);
        ATLAS.veilWide = bakeGlare(Math.round(512 * s), rng, 3.0, 400.0, (x) => glareWide(x));
        ATLAS.disc = bakeDisc(Math.round(320 * s));
        ATLAS.streak = bakeStreak(Math.round(1280 * s), Math.round(160 * s));
        ATLAS.spikes6 = bakeSpikes(Math.round(1024 * s), 6, 1.0);
        ATLAS.ghosts = [
            { img: bakeGhost(Math.round(120 * s), 'hex', [255, 214, 170]) },
            { img: bakeGhost(Math.round(190 * s), 'circle', [170, 220, 255]) },
            { img: bakeGhost(Math.round(74 * s), 'ring', [255, 235, 210]) },
            { img: bakeGhost(Math.round(260 * s), 'hex', [210, 235, 255]) },
            { img: bakeGhost(Math.round(150 * s), 'circle', [190, 255, 235]) },
            { img: bakeGhost(Math.round(96 * s), 'hex', [255, 190, 200]) },
            { img: bakeGhost(Math.round(340 * s), 'circle', [240, 245, 255]) }
        ];
        return ATLAS;
    },

    /**
     * Отрисовка оптики Солнца.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} p
     *   w, h        — размер кадра
     *   x, y        — экранные координаты Солнца
     *   focalPx     — фокусное расстояние в пикселях (= fov движка)
     *   occlusion   — 0…1, перекрытие диском Земли/Луны
     *   intensity   — 0…1, общая сила блика (зависит от близости к центру кадра)
     *   flareScale  — 0…2, художественный масштаб (зум)
     *   mode        — 'full' (диск+оптика) | 'lens' (только линзовые артефакты,
     *                 когда диск и его свечение уже посчитаны в GPU-рендере)
     */
    render(ctx, p) {
        const { w, h, x, y, occlusion, intensity, mode } = p;
        if (occlusion <= 0.001 || intensity <= 0.001) return;

        const s = Math.max(0.45, Math.min(2.4, p.flareScale || 1));
        const atlas = this.ensureSprites(s);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const occ = Math.min(1, Math.max(0, occlusion));
        // Ближе к оптической оси — блик сильнее (реальная зависимость слабая,
        // поэтому кривая мягкая, без «вспыхивания» на краю кадра)
        const g = Math.pow(Math.min(1, Math.max(0, intensity)), 0.85);
        const amp = occ * g;

        const discR = this.discRadiusPx(p.focalPx) * Math.max(0.75, s);
        const dx = cx - x;
        const dy = cy - y;
        const axisDist = Math.hypot(dx, dy) || 1;
        const diag = Math.hypot(w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        /* 1. Вуаль рассеяния — «свет в объективе»: ядро + широкая дымка.
         *    Размеры кратны радиусу диска Солнца, поэтому физика сохраняется
         *    при любом зуме (величина блика не «плывёт»). */
        const coreSize = discR * 12.0;          // 1…6 радиусов диска
        const wideSize = discR * 800.0;         // 3…400 радиусов: дымка на весь кадр
        ctx.globalAlpha = Math.min(1, amp * 1.0);
        ctx.drawImage(atlas.veilCore, x - coreSize / 2, y - coreSize / 2, coreSize, coreSize);
        ctx.globalAlpha = Math.min(1, amp * 0.95);
        ctx.drawImage(atlas.veilWide, x - wideSize / 2, y - wideSize / 2, wideSize, wideSize);

        if (mode !== 'lens') {
            /* 2. Диск Солнца + венец */
            const discSize = Math.max(3, discR / 0.26);
            ctx.globalAlpha = Math.min(1, amp * 1.15);
            ctx.drawImage(atlas.disc, x - discSize / 2, y - discSize / 2, discSize, discSize);
        }

        /* 3. Анаморфная полоса (горизонтальная, как у анаморфной оптики) */
        const streakW = Math.max(w, diag) * 1.15;
        const streakH = streakW * 0.038;        // реальная анаморфная нить тонкая
        ctx.globalAlpha = Math.min(1, amp * 0.46);
        ctx.drawImage(atlas.streak, x - streakW / 2, y - streakH / 2, streakW, streakH);

        /* 4. Дифракционные лучи: масштаб растёт с яркостью диска */
        const spikeSize = Math.max(w, h) * (0.5 + Math.min(0.45, amp * 0.5));
        ctx.globalAlpha = Math.min(1, amp * 0.34);
        ctx.drawImage(atlas.spikes6, x - spikeSize / 2, y - spikeSize / 2, spikeSize, spikeSize);

        /* 5. Цепочка призраков вдоль оси «солнце → центр кадра» */
        // Призраки диафрагмы — слабый эффект: несколько процентов от диска
        // Призраки диафрагмы — слабый эффект: проценты от диска, не более
        const ghostAmp = Math.min(1, amp * 0.15);
        if (ghostAmp > 0.01 && axisDist > 4) {
            const ux = dx / axisDist;
            const uy = dy / axisDist;
            const ghosts = atlas.ghosts;
            // Позиции отражений: доля пути от Солнца к центру и ЗА центр
            const path = [0.30, 0.62, 0.88, 1.16, 1.45, 1.74, 2.10];
            const sizes = [0.045, 0.070, 0.028, 0.100, 0.058, 0.038, 0.135];

            for (let i = 0; i < ghosts.length; i++) {
                const t = path[i];
                const gx = x + ux * axisDist * t;
                const gy = y + uy * axisDist * t;
                const gs = sizes[i] * diag * (0.85 + 0.3 * s);
                const falloff = Math.pow(Math.max(0, 1 - Math.min(1, (t - 0.2) / 2.0)), 0.6);
                ctx.globalAlpha = Math.min(1, ghostAmp * falloff * (i % 2 ? 0.85 : 1.0));
                ctx.drawImage(ghosts[i].img, gx - gs / 2, gy - gs / 2, gs, gs);

                // Хроматический сдвиг: каналы одного отражения смещены по-разному
                ctx.globalAlpha = Math.min(1, ghostAmp * falloff * 0.28);
                const shift = gs * 0.035;
                ctx.drawImage(ghosts[(i + 1) % ghosts.length].img,
                    gx - gs / 2 - shift, gy - gs / 2 + shift * 0.4, gs * 1.02, gs * 1.02);
            }
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }
};

export default SunOptics;
