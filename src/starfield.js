/**
 * AURORA 3.9 — Фотореалистичный звёздный каталог
 *
 * Задача модуля — дать «научную» основу небу вместо равномерных точек:
 *   • функция светимости: N(> F) ∝ F^-1.5  (звёзды рождаются по степенному
 *     закону, поэтому ярких звёзд мало, а слабых — подавляющее большинство);
 *   • цвет = цвет абсолютно чёрного тела (Планк) для реальной температуры
 *     фотосферы: 2400 K (красный сверхгигант) … 32000 K (голубой гигант);
 *   • размер пятна рассеяния (PSF) растёт с потоком, а дифракционные лучи
 *     появляются только у самых ярких звёзд — как на реальных астрофото;
 *   • Млечный Путь: экспоненциальная концентрация к галактической плоскости,
 *     тёплое ядро ( bulge ) и голубоватые рукава, плюс Великий Разлом пыли.
 *
 * Экономика кадра: каталог генерируется один раз и разделяется CPU- и
 * GPU-путями, чтобы картинка в обоих режимах была идентичной.
 */

/* --------------------------------------------------------------------------
 * ФИЗИКА ЦВЕТА: температура фотосферы → линейный RGB
 * ------------------------------------------------------------------------ */

/**
 * Цвет абсолютно чёрного тела в линейном sRGB (нормирован по максимуму канала).
 * Используется аппроксимация Планка (Planckian locus), применимая в диапазоне
 * 1000…40000 K — этого достаточно для всех спектральных классов.
 */
export function blackbodyLinear(tempK) {
    const t = Math.min(40000, Math.max(1000, tempK)) / 100;
    let r, g, b;

    if (t <= 66) {
        r = 255;
        g = 99.4708025861 * Math.log(t) - 161.1195681661;
        b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    } else {
        r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
        g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
        b = 255;
    }

    const clamp255 = (v) => Math.min(255, Math.max(0, v)) / 255;
    const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

    const lin = [
        srgbToLinear(clamp255(r)),
        srgbToLinear(clamp255(g)),
        srgbToLinear(clamp255(b))
    ];

    // Нормировка по максимуму: яркость несёт поток, цвет — только оттенок
    const max = Math.max(lin[0], lin[1], lin[2]) || 1;
    return [lin[0] / max, lin[1] / max, lin[2] / max];
}

/** Линейный RGB → CSS-строка для 2D-фолбэка (гамма-кодирование sRGB). */
export function linearToCss(lin) {
    const toSrgb = (v) => {
        const c = Math.min(1, Math.max(0, v));
        return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
    };
    return `rgb(${toSrgb(lin[0])}, ${toSrgb(lin[1])}, ${toSrgb(lin[2])})`;
}

/* --------------------------------------------------------------------------
 * НАСЕЛЕНИЕ ЗВЁЗД
 * Спектральные классы: доля в каталоге и типичная температура фотосферы.
 * Доли подобраны так, чтобы картинка соответствовала «видимой» части неба
 * (слабые красные карлики преобладают, но яркие звёзды — это О/B/A/F).
 * ------------------------------------------------------------------------ */
const SPECTRAL_MIX = [
    { type: 'B', temp: 22000, share: 0.030, fluxBoost: 26.0, spike: true },
    { type: 'A', temp: 9500, share: 0.105, fluxBoost: 9.0, spike: true },
    { type: 'F', temp: 7000, share: 0.150, fluxBoost: 3.4, spike: false },
    { type: 'G', temp: 5800, share: 0.205, fluxBoost: 1.7, spike: false },
    { type: 'K', temp: 4600, share: 0.215, fluxBoost: 1.0, spike: false },
    { type: 'M', temp: 3300, share: 0.295, fluxBoost: 0.55, spike: false }
];

/* --------------------------------------------------------------------------
 * ГЕНЕРАТОР
 * ------------------------------------------------------------------------ */
export const Starfield = {
    SPECTRAL_MIX,
    blackbodyLinear,
    linearToCss,

    /** Случайная точка на единичной сфере (равномерно по телесному углу). */
    randomDirection() {
        const theta = Math.random() * Math.PI * 2;
        const cosPhi = Math.random() * 2 - 1;
        const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
        return [sinPhi * Math.cos(theta), cosPhi, sinPhi * Math.sin(theta)];
    },

    /**
     * Поток звезды по функции светимости N(> F) ∝ F^-1.5.
     * Отсюда берётся характерный «фотографический» вид неба: слабых звёзд
     * на порядки больше, чем ярких.
     */
    sampleFlux(scale = 1) {
        const u = 1 - Math.random();                 // (0, 1]
        const flux = Math.pow(u, -0.667);            // степенной хвост
        return Math.min(flux, 18) * scale;           // ограничение сверху
    },

    /**
     * Полный каталог неба.
     * @param {object} opts
     *   starCount  — число звёзд основного каталога
     *   mwCount    — число звёзд галактической полосы
     *   fluxGain   — масштаб потока (HDR-диапазон для GPU-пути)
     */
    build(opts = {}) {
        const starCount = opts.starCount || 900;
        const mwCount = opts.mwCount || 1400;
        const fluxGain = opts.fluxGain !== undefined ? opts.fluxGain : 1;

        /* --- 1. Основной каталог: изотропно, со степенной светимостью --- */
        const stars = [];
        const mixWeight = SPECTRAL_MIX.reduce((a, s) => a + s.share, 0);

        for (let i = 0; i < starCount; i++) {
            // Класс по долям населения
            let r = Math.random() * mixWeight;
            let spec = SPECTRAL_MIX[0];
            for (const s of SPECTRAL_MIX) {
                if (r <= s.share) { spec = s; break; }
                r -= s.share;
            }

            const [x, y, z] = this.randomDirection();

            // Поток: у ярких классов дополнительный подъём (светимость ∝ массам)
            const flux = this.sampleFlux(fluxGain) * spec.fluxBoost;

            // Температура слегка разбросана внутри класса
            const temp = spec.temp * (0.88 + Math.random() * 0.24);
            const lin = blackbodyLinear(temp);

            // PSF: слабые звёзды — почти точки, яркие — заметные диски
            const size = 0.95 + Math.pow(Math.min(flux, 60) / 60, 0.42) * 2.9;

            // Лучи — только у самых ярких (реальный эффект диафрагмы объектива)
            const hasSpike = spec.spike && flux > 7.5;

            const coreMix = [Math.min(1, lin[0] * 0.55 + 0.45), Math.min(1, lin[1] * 0.55 + 0.45), Math.min(1, lin[2] * 0.55 + 0.45)];

            stars.push({
                x, y, z,
                flux,
                temp,
                type: spec.type,
                size,
                hasSpike,
                // Совместимость с 2D-фолбэком (canvas):
                color: linearToCss(lin),
                coreColor: linearToCss(coreMix),
                colorLin: lin,
                alpha: Math.min(1, 0.20 + Math.pow(Math.min(flux, 40) / 40, 0.30) * 0.80),
                // В открытом космосе звёзды не мерцают (сцинтилляция — эффект
                // атмосферы), остаётся лишь микродрожание оптики:
                twinkleSpeed: Math.random() * 0.006 + 0.002,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        /* --- 2. Млечный Путь: плоскость наклонена ~62° --- */
        const mwTilt = 1.08;
        const cm = Math.cos(mwTilt), sm = Math.sin(mwTilt);
        const milkyWay = [];

        for (let i = 0; i < mwCount; i++) {
            const lon = Math.random() * Math.PI * 2;
            // Концентрация к плоскости: среднее двух равномерных → треугольное
            const lat = (Math.random() - 0.5 + Math.random() - 0.5) * 0.30;

            // Великий Разлом: тёмные пылевые облака в полосе
            const inRift = Math.abs(lat) < 0.075 && lon > 0.4 && lon < 2.3;
            if (inRift && Math.random() < 0.55) continue;

            const gx = Math.cos(lat) * Math.cos(lon);
            const gy = Math.sin(lat);
            const gz = Math.cos(lat) * Math.sin(lon);

            const x = gx;
            const y = gy * cm - gz * sm;
            const z = gy * sm + gz * cm;

            // Ядро галактики (Sagittarius): тёплое и плотное
            const coreProx = Math.exp(-Math.pow(Math.abs(lon - 1.25) / 0.85, 2));
            const temp = 5200 + coreProx * 1200 + Math.random() * 5200 + 2600;
            const lin = blackbodyLinear(temp);

            // Слабые звёзды фона: поток малый, но их много — даёт «зерно»
            const flux = Math.pow(Math.random(), 2.1) * (0.35 + coreProx * 0.9) * fluxGain;

            milkyWay.push({
                x, y, z,
                flux,
                temp,
                size: 0.85 + Math.random() * 1.15 + coreProx * 0.35,
                hasSpike: false,
                color: linearToCss(lin),
                coreColor: linearToCss(lin),
                colorLin: lin,
                alpha: 0.10 + Math.min(0.62, flux * 0.9),
                twinkleSpeed: 0,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        return { stars, milkyWay };
    }
};

export default Starfield;
