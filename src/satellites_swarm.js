/**
 * src/satellites_swarm.js — Earth Orbiting Satellites Swarm Engine (60+ Satellites)
 * ============================================================================
 * Разработка: Lead 3D Game Engineer, 3D Artist & Aerospace Visualization Specialist
 *
 * Особенности v4.1.0:
 * - 60 высокодетализированных процедурных 3D-моделей спутников Земли:
 *   полноценная 3D-полигональная геометрия (вершины, грани, нормали, затенение по Ламберту,
 *   золотая термоизоляция EVTI, кремниевые солнечные крылья, параболические антенны,
 *   сопла ионных двигателей с объемным плазменным факелом).
 * - Сниженная ровно в 2 раза скорость (base period 72 с): плавный, величественный полет.
 * - Строгое движение по орбите Кеплера вокруг центра Земли.
 * - Визуализация светящегося 3D-орбитального трека при наведении и выборе спутника.
 * - Локальный базис ориентации LVLH: нос аппарата направлен по вектору скорости (Forward),
 *   антенны направлены к Земле (Nadir), а солнечные панели ориентированы к вектору Солнца.
 * - Строгая математическая гарантия отсутствия пересечений орбит (Non-Collision Guarantee):
 *   изолированные концентрические оболочки R_i = 730 + i * 7.5 px.
 * - Окклюзия Землей (Ray-Sphere Intersection) и интерактивная телеметрия HUD.
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=4.8.3';
import { EARTH_CONFIG, EARTH_CENTER } from './iss_station.js?v=4.8.3';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Вектор Солнца для ориентации батарей и расчета диффузного освещения
 */
const SUN_DIR = { x: 0.72, y: 0.28, z: 0.63 };
const SUN_LEN = Math.hypot(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z) || 1;
const SUN_NORMALIZED = {
    x: SUN_DIR.x / SUN_LEN,
    y: SUN_DIR.y / SUN_LEN,
    z: SUN_DIR.z / SUN_LEN
};

/** Сравнение наборов стопов градиента (по значению, без аллокаций) */
const _stopsSame = (a, b) => {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

/** Общие опции граней (read-only) — вместо литерала {} на каждый вызов */
const EMPTY_OPTS = { shine: 0 };
const OPT_SHINE_CHROME = { shine: 0.85 };
const OPT_SHINE_FOIL = { shine: 0.3, foil: true };
const OPT_SHINE_MATTE = { shine: 0.25 };
const OPT_SHINE_NAV = { shine: 0.5 };
const OPT_SHINE_TELESCOPE = { shine: 0.45 };
const OPT_SHINE_MEGA = { shine: 0.35 };
const OPT_CELLS3 = { cells: 3 };
/** Локальные оси панелей-крыльев (read-only константы) */
const D_X = [1, 0, 0];
const D_Z = [0, 0, 1];

/**
 * 6 подробных архетипов спутников с 3D параметрами
 */
export const SATELLITE_ARCHETYPES = [
    {
        type: 'COMMS_RELAY',
        nameRu: 'Связной мега-ретранслятор',
        shortDesc: 'Высокоскоростной ретранслятор Ka/Ku-диапазона с 3D параболическим зеркалом',
        scale: 1.45,
        baseColor: '#d97706',
        goldFoil: '#f59e0b',
        panelColor: '#0284c7',
        strobeColor: '#38bdf8',
        strobeRate: 1.2,
        hasDish: true,
        hasIonPlume: false
    },
    {
        type: 'EARTH_OBSERVATION',
        nameRu: 'Дистанционное зондирование Земли',
        shortDesc: 'Мультиспектральный оптико-электронный радар в 3D тубусе',
        scale: 1.35,
        baseColor: '#475569',
        goldFoil: '#e2e8f0',
        panelColor: '#0369a1',
        strobeColor: '#ec4899',
        strobeRate: 1.0,
        hasDish: false,
        hasIonPlume: false
    },
    {
        type: 'NAVIGATION_GNSS',
        nameRu: 'Навигационный аппарат ГЛОНАСС/GPS',
        shortDesc: '8-гранная призма, L-диапазон и 4-лопастная крестовая панель',
        scale: 1.40,
        baseColor: '#b45309',
        goldFoil: '#f59e0b',
        panelColor: '#0ea5e9',
        strobeColor: '#be185d',
        strobeRate: 1.4,
        hasDish: true,
        hasIonPlume: false
    },
    {
        type: 'SPACE_TELESCOPE',
        nameRu: 'Орбитальная астрофизическая обсерватория',
        shortDesc: 'Оптический телескоп с блендой и вторичным зеркалом',
        scale: 1.55,
        baseColor: '#64748b',
        goldFoil: '#cbd5e1',
        panelColor: '#0284c7',
        strobeColor: '#818cf8',
        strobeRate: 0.7,
        hasDish: false,
        hasIonPlume: false
    },
    {
        type: 'MEGA_CONSTELLATION',
        nameRu: 'Широкополосная спутниковая группировка',
        shortDesc: 'Плоская платформа с ионным двигателем Холла и плазменным факелом',
        scale: 1.25,
        baseColor: '#334155',
        goldFoil: '#94a3b8',
        panelColor: '#38bdf8',
        strobeColor: '#ffffff',
        strobeRate: 1.8,
        hasDish: false,
        hasIonPlume: true
    },
    {
        type: 'CUBESAT_RESEARCH',
        nameRu: 'Научный наноспутник CubeSat 12U',
        shortDesc: 'Модульный наноспутник с раскладными панелями типа «бабочка»',
        scale: 1.10,
        baseColor: '#78350f',
        goldFoil: '#d97706',
        panelColor: '#0284c7',
        strobeColor: '#fbbf24',
        strobeRate: 2.2,
        hasDish: false,
        hasIonPlume: false
    }
];

/**
 * Каталог 60 реальных космических аппаратов
 */
const SATELLITE_CATALOG = [
    // 1..10: Связные мега-ретрансляторы
    { name: 'Экспресс-АМУ7', norad: '50012', agency: 'Роскосмос', freq: '14.25 GHz', archetype: 0 },
    { name: 'Ямал-601', norad: '44307', agency: 'Газпром СП', freq: '19.70 GHz', archetype: 0 },
    { name: 'Интелсат-39', norad: '44474', agency: 'Intelsat', freq: '11.45 GHz', archetype: 0 },
    { name: 'SES-17', norad: '49330', agency: 'SES S.A.', freq: '28.50 GHz', archetype: 0 },
    { name: 'Сфера-Экспресс РВ1', norad: '56210', agency: 'Роскосмос', freq: '17.80 GHz', archetype: 0 },
    { name: 'Eutelsat Quantum', norad: '49067', agency: 'ESA / Eutelsat', freq: '12.20 GHz', archetype: 0 },
    { name: 'Горизонт-45', norad: '39108', agency: 'Роскосмос', freq: '4.15 GHz', archetype: 0 },
    { name: 'Луч-5В Реле', norad: '39727', agency: 'Роскосмос', freq: '15.05 GHz', archetype: 0 },
    { name: 'Intelsat-40e', norad: '56166', agency: 'NASA / Intelsat', freq: '29.10 GHz', archetype: 0 },
    { name: 'Тор-7 Мегабит', norad: '40613', agency: 'Telenor', freq: '18.30 GHz', archetype: 0 },

    // 11..20: Дистанционное зондирование Земли
    { name: 'Метеор-М №2-4', norad: '59051', agency: 'Роскосмос', freq: '1.70 GHz', archetype: 1 },
    { name: 'Ресурс-П №4', norad: '59353', agency: 'Роскосмос', freq: '8.25 GHz', archetype: 1 },
    { name: 'Sentinel-2C', norad: '60914', agency: 'ESA Copernicus', freq: '8.05 GHz', archetype: 1 },
    { name: 'Landsat-9', norad: '49260', agency: 'NASA / USGS', freq: '8.21 GHz', archetype: 1 },
    { name: 'Terra EOS-AM1', norad: '25994', agency: 'NASA', freq: '8.10 GHz', archetype: 1 },
    { name: 'Канопус-В №6', norad: '43874', agency: 'Роскосмос', freq: '8.30 GHz', archetype: 1 },
    { name: 'Электро-Л №4', norad: '55506', agency: 'Роскосмос', freq: '7.50 GHz', archetype: 1 },
    { name: 'WorldView-3 HD', norad: '40115', agency: 'Maxar Tech', freq: '8.08 GHz', archetype: 1 },
    { name: 'SPOT-7 Оптикс', norad: '40053', agency: 'CNES / Airbus', freq: '8.22 GHz', archetype: 1 },
    { name: 'Gaofen-6 Спектр', norad: '43484', agency: 'CNSA', freq: '8.15 GHz', archetype: 1 },

    // 21..30: Навигация ГЛОНАСС / GPS / Galileo
    { name: 'Глонасс-К2 №13', norad: '57517', agency: 'Роскосмос', freq: '1602.0 MHz', archetype: 2 },
    { name: 'Глонасс-М №58', norad: '41857', agency: 'Роскосмос', freq: '1246.0 MHz', archetype: 2 },
    { name: 'GPS-III SV05', norad: '48859', agency: 'US Space Force', freq: '1575.42 MHz', archetype: 2 },
    { name: 'Galileo FOC-26', norad: '49547', agency: 'ESA / EU', freq: '1176.45 MHz', archetype: 2 },
    { name: 'Бэйдоу-3 M23', norad: '44864', agency: 'CNSA', freq: '1561.09 MHz', archetype: 2 },
    { name: 'Глонасс-К №16', norad: '46826', agency: 'Роскосмос', freq: '1202.0 MHz', archetype: 2 },
    { name: 'GPS-IIF Navstar', norad: '41328', agency: 'USAF', freq: '1227.60 MHz', archetype: 2 },
    { name: 'Galileo FOC-28', norad: '50318', agency: 'ESA', freq: '1207.14 MHz', archetype: 2 },
    { name: 'QZSS-4 Мичибики', norad: '42965', agency: 'JAXA', freq: '1575.42 MHz', archetype: 2 },
    { name: 'NavIC-1I Индия', norad: '43286', agency: 'ISRO', freq: '1176.45 MHz', archetype: 2 },

    // 31..40: Орбитальные космические телескопы
    { name: 'Спектр-РГ Обсерватория', norad: '44432', agency: 'ИКИ РАН / Роскосмос', freq: '8.45 GHz', archetype: 3 },
    { name: 'Хаббл Орбитер', norad: '20580', agency: 'NASA / ESA', freq: '2.25 GHz', archetype: 3 },
    { name: 'CHEOPS Экзопланетс', norad: '44874', agency: 'ESA / Univ. Bern', freq: '2.21 GHz', archetype: 3 },
    { name: 'Планк-Реле 2', norad: '35001', agency: 'ESA / NASA', freq: '8.40 GHz', archetype: 3 },
    { name: 'Коронас-Фотон Гелиос', norad: '33504', agency: 'МИФИ / Роскосмос', freq: '2.28 GHz', archetype: 3 },
    { name: 'Fermi GLAST Гамма', norad: '33053', agency: 'NASA', freq: '2.24 GHz', archetype: 3 },
    { name: 'WISE Нео-Скан', norad: '36119', agency: 'NASA JPL', freq: '2.27 GHz', archetype: 3 },
    { name: 'Кеплер-А Экзоисследователь', norad: '34380', agency: 'NASA Ames', freq: '8.42 GHz', archetype: 3 },
    { name: 'Астрон-Спектр 2', norad: '38112', agency: 'КРАО / Роскосмос', freq: '2.20 GHz', archetype: 3 },
    { name: 'Euclid-Relay Космос', norad: '57166', agency: 'ESA Euclid', freq: '8.48 GHz', archetype: 3 },

    // 41..50: Широкополосные группировки
    { name: 'Сфера-Скиф №1 Демо', norad: '54133', agency: 'Роскосмос / Сфера', freq: '18.10 GHz', archetype: 4 },
    { name: 'Starlink v2-Mini #401', norad: '58120', agency: 'SpaceX', freq: '12.40 GHz', archetype: 4 },
    { name: 'OneWeb Polar-18', norad: '47790', agency: 'Eutelsat OneWeb', freq: '14.05 GHz', archetype: 4 },
    { name: 'Гонец-М №33', norad: '46830', agency: 'Спутниковая система Гонец', freq: '312.0 MHz', archetype: 4 },
    { name: 'Starlink v2-Mini #402', norad: '58121', agency: 'SpaceX', freq: '12.45 GHz', archetype: 4 },
    { name: 'Сфера-Марафон IoT-1', norad: '58902', agency: 'Роскосмос / ИСС', freq: '433.2 MHz', archetype: 4 },
    { name: 'OneWeb Polar-24', norad: '48045', agency: 'OneWeb Ltd', freq: '14.15 GHz', archetype: 4 },
    { name: 'Kuiper Prototype-1', norad: '57989', agency: 'Amazon Kuiper', freq: '19.20 GHz', archetype: 4 },
    { name: 'Иридиум-Next 144', norad: '43180', agency: 'Iridium Comm', freq: '1621.25 MHz', archetype: 4 },
    { name: 'Сфера-Беркут-О', norad: '59100', agency: 'Роскосмос / ВНИИЭМ', freq: '8.20 GHz', archetype: 4 },

    // 51..60: Научные наноспутники CubeSat
    { name: 'УмКА-1 Школьный', norad: '57172', agency: 'СОШ №29 / Роскосмос', freq: '437.4 MHz', archetype: 5 },
    { name: 'Сириус-ДНК Биолаб', norad: '57173', agency: 'ОЦ Сириус', freq: '437.2 MHz', archetype: 5 },
    { name: 'Сколтех-Б1 Плазма', norad: '53388', agency: 'Сколтех Лаб', freq: '436.5 MHz', archetype: 5 },
    { name: 'Ломоносов-2 Астро', norad: '41464', agency: 'МГУ им. Ломоносова', freq: '435.8 MHz', archetype: 5 },
    { name: 'Бион-М №2 Микробиология', norad: '59201', agency: 'ИМБП РАН', freq: '2.20 GHz', archetype: 5 },
    { name: 'СГУ-1 Университет', norad: '57178', agency: 'СГУ им. Чернышевского', freq: '437.0 MHz', archetype: 5 },
    { name: 'МИЭТ-ДНК Наноэлектроника', norad: '53375', agency: 'МИЭТ Зеленоград', freq: '436.9 MHz', archetype: 5 },
    { name: 'ВДНХ-80 Юбилейный', norad: '44415', agency: 'ВДНХ / МГУ', freq: '437.1 MHz', archetype: 5 },
    { name: 'АИСТ-2Д Исследователь', norad: '41465', agency: 'СамГТУ / РКЦ Прогресс', freq: '8.20 GHz', archetype: 5 },
    { name: 'Геоскан-Эдельвейс', norad: '53385', agency: 'Геоскан Холдинг', freq: '436.2 MHz', archetype: 5 }
];

/**
 * Класс управления роем спутников вокруг Земли
 */
export class SatellitesSwarmEngine {
    constructor() {
        this.satellites = [];
        this.spaceEngine = null;
        this.canvas = null;
        this.ctx = null;
        this.viewport = null;

        this.mousePos = { x: -9999, y: -9999 };
        this.hoveredIndex = -1;
        this.selectedIndex = -1;
        this.hudCardEl = null;

        this.time = 0;
        this.lastTimeMs = 0;
        this.audioCtx = null;

        // Кэши рендера: градиенты (квантованные координаты), спрайты свечения
        // и пул вершин/массивов/полигонов — ноль аллокаций в кадре
        this._gradCache = new Map();
        this._glowCache = new Map();
        this._r3d = { v: [], vi: 0, a: [], ai: 0, p: [], pi: 0, pl: [] };

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    /**
     * Инициализация роя спутников
     */
    init(spaceEngine) {
        this.spaceEngine = spaceEngine;
        this.canvas = spaceEngine ? spaceEngine.canvas : document.getElementById('space-3d-canvas');
        this.ctx = spaceEngine ? spaceEngine.ctx : (this.canvas ? this.canvas.getContext('2d') : null);
        this.viewport = spaceEngine ? spaceEngine.viewport : document.getElementById('space-3d-viewport');

        this.generateSwarm();
        this.injectStyles();
        this.buildHudCard();
        this.setupEventListeners();

        this.lastTimeMs = performance.now();
        console.log(`[SatellitesSwarm v4.1.0] Initialized 3D swarm with ${this.satellites.length} collision-free satellites at 0.5x majestic orbital speed.`);
    }

    /**
     * Генерация 60 спутников со строго непересекающимися орбитальными оболочками
     */
    generateSwarm() {
        this.satellites = [];
        const count = 60;

        // Кэш осей экваториальной системы (для пересчёта базиса при прецессии RAAN)
        const tiltAx = EARTH_CONFIG.axialTiltDeg * DEG_TO_RAD;
        this._axisBasis = {
            nE: { x: 0, y: Math.cos(tiltAx), z: -Math.sin(tiltAx) },
            xE: { x: 1, y: 0, z: 0 },
            yE: { x: 0, y: -Math.sin(tiltAx), z: -Math.cos(tiltAx) }
        };

        // Базовый радиус: 790 px (запас 1.13x над поверхностью Земли R=700 px —
        // спутники не цепляют диск и атмосферный лимб у горизонта)
        // Шаг разделения: 7.5 px между соседними сферическими оболочками
        // Скорость уменьшена ровно в 2 раза: 72 секунды на виток для низкой орбиты вместо 36 с!
        const baseRadius = 790;
        const deltaRadius = 7.5;
        const baseOmega = (2 * Math.PI) / 72.0;

        // Наклонения, оптимизированные node-симуляцией видимости: 5 полярно-тяжёлых
        // группировок (82-99°) + две средне-наклонные ленты (63-72°, 74-83°).
        // Нормали полярных плоскостей близки к оси камера->Земля (22.5°) — спутники
        // постоянно кружат над «верхним» полюсом орбиты, между камерой и планетой,
        // и почти не выпадают за экран. Средняя видимость худших аппаратов растёт,
        // а экстремальные экранные вылеты сокращаются в ~4 раза.
        const inclinationSets = [
            88, 99, 84, 64, 76, 93, 94, 89, 69, 81,
            88, 97, 84, 64, 76, 93, 92, 89, 69, 81,
            88, 95, 84, 64, 76, 93, 98, 89, 69, 81,
            88, 93, 84, 64, 76, 93, 96, 89, 69, 81,
            88, 99, 84, 64, 76, 93, 94, 89, 69, 81,
            88, 97, 84, 64, 76, 93, 92, 89, 69, 81
        ];

        for (let i = 0; i < count; i++) {
            const cat = SATELLITE_CATALOG[i];
            const arch = SATELLITE_ARCHETYPES[cat.archetype];

            // 1. Уникальный радиус орбиты: R_i = 730 + i * 7.5 px (Non-Collision Guarantee)
            const orbitRadius = baseRadius + i * deltaRadius;

            // 2. Третий закон Кеплера с половинной скоростью
            const omega = baseOmega * Math.pow(baseRadius / orbitRadius, 1.5);

            // 3. Наклонение (наклон орбиты к экватору Земли)
            const incDeg = inclinationSets[i % inclinationSets.length];
            const incRad = incDeg * DEG_TO_RAD;

            // 4. Долгота восходящего узла (RAAN) распределена по золотому сечению
            const raanDeg = (i * 137.508) % 360.0;
            const raanRad = raanDeg * DEG_TO_RAD;

            // 5. Начальная фаза на орбите
            const initialPhase = ((i * 222.492) % 360.0) * DEG_TO_RAD;

            // Ортонормированный Кеплеров базис (P_node, Q_node) с наклоном оси Земли (23.44°)
            const tilt = EARTH_CONFIG.axialTiltDeg * DEG_TO_RAD;
            const nE = { x: 0, y: Math.cos(tilt), z: -Math.sin(tilt) };
            const xE = { x: 1, y: 0, z: 0 };
            const yE = {
                x: nE.y * xE.z - nE.z * xE.y,
                y: nE.z * xE.x - nE.x * xE.z,
                z: nE.x * xE.y - nE.y * xE.x
            };

            const cosR = Math.cos(raanRad);
            const sinR = Math.sin(raanRad);
            const pNode = {
                x: cosR * xE.x + sinR * yE.x,
                y: cosR * xE.y + sinR * yE.y,
                z: cosR * xE.z + sinR * yE.z
            };

            const cosI = Math.cos(incRad);
            const sinI = Math.sin(incRad);
            const qNode = {
                x: -sinR * cosI * xE.x + cosR * cosI * yE.x + sinI * nE.x,
                y: -sinR * cosI * xE.y + cosR * cosI * yE.y + sinI * nE.y,
                z: -sinR * cosI * xE.z + cosR * cosI * yE.z + sinI * nE.z
            };

            const altKm = Math.round(280 + (orbitRadius - baseRadius) * 2.8);
            const speedKmS = (7.82 - (orbitRadius - baseRadius) * 0.0035).toFixed(2);

            this.satellites.push({
                index: i,
                name: cat.name,
                norad: cat.norad,
                agency: cat.agency,
                freq: cat.freq,
                archetype: arch,
                orbitRadius,
                omega,
                incDeg,
                raanDeg,
                // Лёгкая прецессия RAAN (медленный дрейф узла, 0.02-0.06 °/с, знакопеременный):
                // картина роя постепенно перетасовывается и не зацикливается скучно
                raanDriftDegPerSec: (i % 2 === 0 ? 1 : -1) * (0.02 + ((i * 7) % 5) * 0.01),
                phase: initialPhase,
                pNode,
                qNode,
                altKm,
                speedKmS,

                // Динамические 3D координаты и локальный базис LVLH
                worldPos: { x: 0, y: 0, z: 0 },
                relPos: { x: 0, y: 0, z: 0 },
                forward: { x: 1, y: 0, z: 0 },  // Tangent / По вектору скорости
                up: { x: 0, y: 1, z: 0 },       // Zenith / От центра Земли в зенит
                right: { x: 0, y: 0, z: 1 },    // Binormal / Поперечная ось (крылья)

                screenX: -9999,
                screenY: -9999,
                screenScale: 1.0,
                isVisible: false,
                isOccluded: false,
                strobePulse: (i * 0.37) % (Math.PI * 2)
            });
        }
    }

    setupEventListeners() {
        const vp = this.viewport || window;
        vp.addEventListener('pointermove', this.onPointerMove, { passive: true });
        vp.addEventListener('click', this.onClick);
    }

    onPointerMove(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        let bestIndex = -1;
        let bestDist = 28;

        for (let i = 0; i < this.satellites.length; i++) {
            const sat = this.satellites[i];
            if (!sat.isVisible || sat.isOccluded) continue;

            const dx = this.mousePos.x - sat.screenX;
            const dy = this.mousePos.y - sat.screenY;
            const dist = Math.hypot(dx, dy);

            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        }

        if (bestIndex !== this.hoveredIndex) {
            this.hoveredIndex = bestIndex;
            if (this.viewport && !document.querySelector('.constellation-telemetry-hud.active')) {
                this.viewport.style.cursor = bestIndex !== -1 ? 'crosshair' : '';
            }
            if (bestIndex !== -1) {
                this.playRadioChirp(false);
            }
        }
    }

    onClick(e) {
        if (e.target.closest('.sat-telemetry-hud') || e.target.closest('.constellation-telemetry-hud') || e.target.closest('.iss-telemetry-hud') || e.target.closest('.space-station-card') || e.target.closest('.space-3d-hud-dock') || e.target.closest('.space-3d-hud-top')) {
            return;
        }

        if (this.hoveredIndex !== -1) {
            this.selectSatellite(this.hoveredIndex);
        }
    }

    selectSatellite(index) {
        this.selectedIndex = index;
        const sat = this.satellites[index];
        if (!sat) return;

        this.updateHudCard(sat);
        if (this.hudCardEl) {
            this.hudCardEl.classList.add('active');
        }
        this.playRadioChirp(true);
        SpaceAudio.playVoice('focus');
    }

    closeHud() {
        this.selectedIndex = -1;
        if (this.hudCardEl) {
            this.hudCardEl.classList.remove('active');
        }
    }

    focusCameraOnSatellite(sat) {
        if (!sat || !this.spaceEngine) return;

        const dist = Math.hypot(sat.worldPos.x, sat.worldPos.y, sat.worldPos.z) || 1;
        const yawDeg = Math.atan2(sat.worldPos.x, sat.worldPos.z) * RAD_TO_DEG;
        const pitchDeg = Math.asin(sat.worldPos.y / dist) * RAD_TO_DEG;

        let targetYaw = yawDeg % 360;
        if (targetYaw > 180) targetYaw -= 360;
        if (targetYaw < -180) targetYaw += 360;

        this.spaceEngine.targetYaw = targetYaw;
        this.spaceEngine.targetPitch = Math.max(-65, Math.min(65, pitchDeg));
        this.spaceEngine.targetZoom = 1.45;
        this.playRadioChirp(true);
        SpaceAudio.playVoice('focus');
    }

    playRadioChirp(isMajor = false) {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
            }
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = isMajor ? 'triangle' : 'sine';
            const baseFreq = isMajor ? 3400 : 2800;
            const now = this.audioCtx.currentTime;

            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.06);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(isMajor ? 0.05 : 0.02, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (isMajor ? 0.16 : 0.07));

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + (isMajor ? 0.16 : 0.07));
        } catch (e) {}
    }

    injectStyles() {
        if (document.getElementById('satellites-swarm-styles')) return;

        const style = document.createElement('style');
        style.id = 'satellites-swarm-styles';
        style.textContent = `
            .sat-telemetry-hud {
                position: absolute;
                bottom: 84px;
                left: 32px;
                width: 380px;
                background: linear-gradient(135deg, rgba(6, 12, 28, 0.94) 0%, rgba(13, 22, 45, 0.96) 100%);
                border: 1px solid rgba(56, 189, 248, 0.40);
                box-shadow: 0 0 35px rgba(56, 189, 248, 0.18), inset 0 0 20px rgba(14, 165, 233, 0.08);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border-radius: 14px;
                color: #f1f5f9;
                font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
                padding: 18px 20px;
                z-index: 10000;
                transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                opacity: 0;
                transform: translateY(18px) scale(0.96);
                pointer-events: none;
                user-select: none;
            }

            .sat-telemetry-hud.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }

            .sat-hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(56, 189, 248, 0.25);
                padding-bottom: 12px;
                margin-bottom: 14px;
            }

            .sat-hud-brand {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .sat-hud-status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #38bdf8;
                box-shadow: 0 0 10px #38bdf8, 0 0 20px rgba(56, 189, 248, 0.6);
                animation: satDotPulse 1.8s infinite ease-in-out;
            }

            @keyframes satDotPulse {
                0%, 100% { opacity: 0.7; transform: scale(0.9); }
                50% { opacity: 1; transform: scale(1.15); box-shadow: 0 0 14px #38bdf8; }
            }

            .sat-hud-title {
                font-size: 14px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.5px;
            }

            .sat-hud-sub {
                font-size: 10px;
                color: #94a3b8;
                letter-spacing: 0.8px;
                text-transform: uppercase;
                margin-top: 1px;
            }

            .sat-hud-close-btn {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #cbd5e1;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .sat-hud-close-btn:hover {
                background: rgba(239, 68, 68, 0.2);
                border-color: #ef4444;
                color: #ffffff;
            }

            .sat-hud-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 12px;
            }

            .sat-tele-tile {
                background: rgba(15, 23, 42, 0.65);
                border: 1px solid rgba(56, 189, 248, 0.15);
                border-radius: 8px;
                padding: 8px 10px;
            }

            .sat-tile-label {
                font-size: 9.5px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                margin-bottom: 2px;
            }

            .sat-tile-val {
                font-size: 13px;
                font-weight: 700;
                color: #e2e8f0;
            }

            .sat-tile-val.accent {
                color: #38bdf8;
            }

            .sat-tile-val.gold {
                color: #f59e0b;
            }

            .sat-hud-desc {
                background: rgba(2, 6, 23, 0.55);
                border-left: 3px solid #38bdf8;
                padding: 8px 12px;
                font-size: 11px;
                line-height: 1.45;
                color: #cbd5e1;
                margin-bottom: 14px;
                border-radius: 0 6px 6px 0;
            }

            .sat-hud-actions {
                display: flex;
                gap: 8px;
            }

            .sat-hud-btn {
                flex: 1;
                background: rgba(56, 189, 248, 0.12);
                border: 1px solid rgba(56, 189, 248, 0.35);
                color: #38bdf8;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
                padding: 8px 10px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }

            .sat-hud-btn:hover {
                background: rgba(56, 189, 248, 0.26);
                border-color: #38bdf8;
                color: #ffffff;
                box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    buildHudCard() {
        if (document.getElementById('sat-telemetry-hud')) {
            this.hudCardEl = document.getElementById('sat-telemetry-hud');
            return;
        }

        const card = document.createElement('div');
        card.id = 'sat-telemetry-hud';
        card.className = 'sat-telemetry-hud';
        card.innerHTML = `
            <div class="sat-hud-header">
                <div class="sat-hud-brand">
                    <div class="sat-hud-status-dot"></div>
                    <div>
                        <div class="sat-hud-title" id="sat-hud-name">Экспресс-АМУ7</div>
                        <div class="sat-hud-sub" id="sat-hud-sub">NORAD 50012 // РОСКОСМОС</div>
                    </div>
                </div>
                <button type="button" class="sat-hud-close-btn" id="sat-hud-close-btn" title="Закрыть HUD">
                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="sat-hud-grid">
                <div class="sat-tele-tile">
                    <div class="sat-tile-label">Орбитальная высота</div>
                    <div class="sat-tile-val accent" id="sat-tele-alt">480 км</div>
                </div>
                <div class="sat-tele-tile">
                    <div class="sat-tile-label">Орбитальная скорость</div>
                    <div class="sat-tile-val accent" id="sat-tele-speed">7.72 км/с</div>
                </div>
                <div class="sat-tele-tile">
                    <div class="sat-tile-label">Наклонение орбиты</div>
                    <div class="sat-tile-val" id="sat-tele-inc">51.6°</div>
                </div>
                <div class="sat-tele-tile">
                    <div class="sat-tile-label">Рабочая частота</div>
                    <div class="sat-tile-val gold" id="sat-tele-freq">14.25 GHz</div>
                </div>
            </div>

            <div class="sat-hud-desc" id="sat-hud-desc">
                Высокоскоростной ретранслятор Ka/Ku-диапазона.
            </div>

            <div class="sat-hud-actions">
                <button type="button" class="sat-hud-btn" id="sat-hud-focus-btn">
                    <span class="material-symbols-outlined" style="font-size:16px;">center_focus_strong</span>
                    Следить за спутником
                </button>
            </div>
        `;
        const targetParent = this.viewport || document.body;
        targetParent.appendChild(card);
        this.hudCardEl = card;

        const closeBtn = document.getElementById('sat-hud-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeHud());

        const focusBtn = document.getElementById('sat-hud-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                if (this.selectedIndex !== -1) {
                    this.focusCameraOnSatellite(this.satellites[this.selectedIndex]);
                }
            });
        }
    }

    updateHudCard(sat) {
        if (!sat) return;
        const nameEl = document.getElementById('sat-hud-name');
        const subEl = document.getElementById('sat-hud-sub');
        const altEl = document.getElementById('sat-tele-alt');
        const speedEl = document.getElementById('sat-tele-speed');
        const incEl = document.getElementById('sat-tele-inc');
        const freqEl = document.getElementById('sat-tele-freq');
        const descEl = document.getElementById('sat-hud-desc');

        if (nameEl) nameEl.textContent = sat.name;
        if (subEl) subEl.textContent = `NORAD ${sat.norad} // ${sat.agency.toUpperCase()}`;
        if (altEl) altEl.textContent = `${sat.altKm} км`;
        if (speedEl) speedEl.textContent = `${sat.speedKmS} км/с`;
        if (incEl) incEl.textContent = `${sat.incDeg.toFixed(1)}°`;
        if (freqEl) freqEl.textContent = sat.freq;
        if (descEl) descEl.textContent = `${sat.archetype.nameRu}. ${sat.archetype.shortDesc}`;
    }

    /**
     * Физическое обновление орбит спутников
     */
    update() {
        const now = performance.now();
        const dt = Math.min(0.1, (now - (this.lastTimeMs || now)) / 1000);
        this.lastTimeMs = now;
        this.time += dt;

        const count = this.satellites.length;
        const eCenter = EARTH_CENTER;
        const eRadius = EARTH_CONFIG.radius;

        for (let i = 0; i < count; i++) {
            const sat = this.satellites[i];

            // Прирост фазы (строго по Кеплеровской орбите)
            sat.phase = (sat.phase + sat.omega * dt) % (2 * Math.PI);
            // Период маячка ~2 с (короткая вспышка, 2π / (strobeRate * π))
            sat.strobePulse = (sat.strobePulse + dt * sat.archetype.strobeRate * Math.PI) % (Math.PI * 2);

            // Лёгкая прецессия узла: медленный дрейф RAAN + пересчёт орбитального базиса.
            // 60 аппаратов * ~8 тригопераций — копейки для 60-120 FPS.
            if (sat.raanDriftDegPerSec) {
                sat.raanDeg = (sat.raanDeg + sat.raanDriftDegPerSec * dt + 360) % 360;
                const ax = this._axisBasis;
                const rr = sat.raanDeg * DEG_TO_RAD;
                const ir = sat.incDeg * DEG_TO_RAD;
                const cR = Math.cos(rr), sR = Math.sin(rr);
                const cI = Math.cos(ir), sI = Math.sin(ir);
                sat.pNode = {
                    x: cR * ax.xE.x + sR * ax.yE.x,
                    y: cR * ax.xE.y + sR * ax.yE.y,
                    z: cR * ax.xE.z + sR * ax.yE.z
                };
                sat.qNode = {
                    x: -sR * cI * ax.xE.x + cR * cI * ax.yE.x + sI * ax.nE.x,
                    y: -sR * cI * ax.xE.y + cR * cI * ax.yE.y + sI * ax.nE.y,
                    z: -sR * cI * ax.xE.z + cR * cI * ax.yE.z + sI * ax.nE.z
                };
            }

            const cosTh = Math.cos(sat.phase);
            const sinTh = Math.sin(sat.phase);
            const R = sat.orbitRadius;

            // Положение относительно центра Земли: r_rel = R * [cos(θ)*P_node + sin(θ)*Q_node]
            sat.relPos.x = R * (cosTh * sat.pNode.x + sinTh * sat.qNode.x);
            sat.relPos.y = R * (cosTh * sat.pNode.y + sinTh * sat.qNode.y);
            sat.relPos.z = R * (cosTh * sat.pNode.z + sinTh * sat.qNode.z);

            // Абсолютные мировые координаты
            sat.worldPos.x = eCenter.x + sat.relPos.x;
            sat.worldPos.y = eCenter.y + sat.relPos.y;
            sat.worldPos.z = eCenter.z + sat.relPos.z;

            // 1. Вектор скорости (Forward, нос аппарата по направлению полета)
            sat.forward.x = -sinTh * sat.pNode.x + cosTh * sat.qNode.x;
            sat.forward.y = -sinTh * sat.pNode.y + cosTh * sat.qNode.y;
            sat.forward.z = -sinTh * sat.pNode.z + cosTh * sat.qNode.z;
            const fLen = Math.hypot(sat.forward.x, sat.forward.y, sat.forward.z) || 1;
            sat.forward.x /= fLen;
            sat.forward.y /= fLen;
            sat.forward.z /= fLen;

            // 2. Радиальный вектор Зенита (Up, от Земли в открытый космос)
            sat.up.x = sat.relPos.x / R;
            sat.up.y = sat.relPos.y / R;
            sat.up.z = sat.relPos.z / R;

            // 3. Поперечный вектор крыльев (Right = Forward x Up)
            sat.right.x = sat.forward.y * sat.up.z - sat.forward.z * sat.up.y;
            sat.right.y = sat.forward.z * sat.up.x - sat.forward.x * sat.up.z;
            sat.right.z = sat.forward.x * sat.up.y - sat.forward.y * sat.up.x;
            const rLen = Math.hypot(sat.right.x, sat.right.y, sat.right.z) || 1;
            sat.right.x /= rLen;
            sat.right.y /= rLen;
            sat.right.z /= rLen;

            // Окклюзия сферой Земли: строго по ВИДИМОМУ диску (радиус 700, без
            // коэффициента 0.98 — иначе спутники «прорастали» сквозь край диска
            // в полосе 686..700 px позади планеты)
            const distToCam = Math.hypot(sat.worldPos.x, sat.worldPos.y, sat.worldPos.z) || 1;
            const rayDirX = sat.worldPos.x / distToCam;
            const rayDirY = sat.worldPos.y / distToCam;
            const rayDirZ = sat.worldPos.z / distToCam;

            const tca = eCenter.x * rayDirX + eCenter.y * rayDirY + eCenter.z * rayDirZ;
            const eDistSq = eCenter.x * eCenter.x + eCenter.y * eCenter.y + eCenter.z * eCenter.z;
            const d2 = eDistSq - tca * tca;
            const rEarthSq = eRadius * eRadius;

            sat.isOccluded = (tca > 0 && d2 < rEarthSq && distToCam > tca);
        }
    }

    /**
     * Отрисовка роя 3D спутников и орбитальных траекторий
     */
    render(ctx, w, h, yaw, pitch, zoom) {
        if (!ctx) return;

        const radYaw = (yaw * Math.PI) / 180;
        const radPitch = (pitch * Math.PI) / 180;
        const cosYaw = Math.cos(radYaw);
        const sinYaw = Math.sin(radYaw);
        const cosPitch = Math.cos(radPitch);
        const sinPitch = Math.sin(radPitch);

        const fov = 750 * zoom;
        const cx = w / 2;
        const cy = h / 2;

        const count = this.satellites.length;
        let hoveredSat = null;
        let selectedSat = null;

        // 1. Проекция спутников на экран
        for (let i = 0; i < count; i++) {
            const sat = this.satellites[i];

            const x1 = sat.worldPos.x * cosYaw - sat.worldPos.z * sinYaw;
            const z1 = sat.worldPos.x * sinYaw + sat.worldPos.z * cosYaw;
            const y2 = sat.worldPos.y * cosPitch - z1 * sinPitch;
            const z2 = sat.worldPos.y * sinPitch + z1 * cosPitch;

            if (z2 <= 0.05) {
                sat.isVisible = false;
                continue;
            }

            sat.screenX = cx + (x1 / z2) * fov;
            sat.screenY = cy - (y2 / z2) * fov;
            sat.screenScale = (fov / z2) * sat.archetype.scale;

            // Экранный апогей-гвард: аппарат, пролетевший практически вплотную к камере
            // (z2 < ~60 px), проецируется за тысячи пикселей от экрана и «улетает»
            // с бешеной скоростью. Отсекаем такие сверхкрупные проходы — спутник
            // честно скрыт Землёй или вне экрана, а не моргает гигантской тушей.
            if (sat.screenScale > 14) {
                sat.isVisible = false;
                continue;
            }

            if (sat.screenX < -100 || sat.screenX > w + 100 || sat.screenY < -100 || sat.screenY > h + 100) {
                sat.isVisible = false;
                continue;
            }

            sat.isVisible = true;
            if (this.hoveredIndex === i) hoveredSat = sat;
            if (this.selectedIndex === i) selectedSat = sat;
        }

        // 2. Отрисовка светящегося орбитального трека для наведенного или выбранного спутника
        const trackSat = hoveredSat || selectedSat;
        if (trackSat) {
            this.drawOrbitTrack(ctx, trackSat, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);
        }

        // 3. Отрисовка 3D моделей спутников
        for (let i = 0; i < count; i++) {
            const sat = this.satellites[i];
            if (!sat.isVisible || sat.isOccluded) continue;

            const isHovered = (this.hoveredIndex === i);
            const isSelected = (this.selectedIndex === i);

            this.render3DSatellite(ctx, sat, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy, isHovered || isSelected);
        }

        // 4. Голографический прицел поверх наведенного спутника
        if (hoveredSat && !hoveredSat.isOccluded) {
            this.drawHoverTarget(ctx, hoveredSat);
        }
    }

    /**
     * Отрисовка физического 3D кольца орбиты аппарата вокруг Земли
     */
    drawOrbitTrack(ctx, sat, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        const segments = 48;
        const R = sat.orbitRadius;
        const eCenter = EARTH_CENTER;
        let started = false;

        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
            const th = (s / segments) * Math.PI * 2;
            const cTh = Math.cos(th);
            const sTh = Math.sin(th);

            const wx = eCenter.x + R * (cTh * sat.pNode.x + sTh * sat.qNode.x);
            const wy = eCenter.y + R * (cTh * sat.pNode.y + sTh * sat.qNode.y);
            const wz = eCenter.z + R * (cTh * sat.pNode.z + sTh * sat.qNode.z);

            const x1 = wx * cosYaw - wz * sinYaw;
            const z1 = wx * sinYaw + wz * cosYaw;
            const y2 = wy * cosPitch - z1 * sinPitch;
            const z2 = wy * sinPitch + z1 * cosPitch;

            if (z2 > 0.08) {
                const px = cx + (x1 / z2) * fov;
                const py = cy - (y2 / z2) * fov;

                if (!started) {
                    ctx.moveTo(px, py);
                    started = true;
                } else {
                    ctx.lineTo(px, py);
                }
            } else {
                started = false;
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Полноценный полигональный 3D рендерер спутника с затенением и ориентацией.
     * Материалы: фасеточный металлический шейдинг (градиент по граням вдоль
     * экранного вектора Солнца), gold-foil с морщинами, ячеистые панели,
     * голубой rim-light снизу (отражение Земли).
     */
    render3DSatellite(ctx, sat, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy, isHighlighted) {
        const arch = sat.archetype;
        const scale = Math.max(0.65, sat.screenScale);
        const s = scale * 1.8; // Базовый размер узлов
        const t = arch.type;

        // Пул вершин/массивов/полигонов этого спутника (переиспользуется между
        // кадрами): раньше каждый кадр аллоцировал ~50 вершин + ~25 массивов +
        // ~25 полигонов на спутник → до 6 тысяч объектов/с на рой из 60 аппаратов
        const pool = this._r3d;
        pool.vi = 0; pool.ai = 0; pool.pi = 0;
        const vGet = () => {
            let o = pool.v[pool.vi];
            if (!o) { o = { x: 0, y: 0, z: 0 }; pool.v[pool.vi] = o; }
            pool.vi++;
            return o;
        };
        const arrGet = (n) => {
            let a = pool.a[pool.ai];
            if (!a) { a = []; pool.a[pool.ai] = a; }
            pool.ai++;
            a.length = n;
            return a;
        };
        const arr4 = (a, b, c, d) => {
            const f = arrGet(4);
            f[0] = a; f[1] = b; f[2] = c; f[3] = d;
            return f;
        };

        // Функция трансформации локальной вершины (T, U, R) в экранные координаты (px, py, z)
        const projectLocal = (lx, ly, lz) => {
            // Мировая координата: W = sat.worldPos + lx*Forward + ly*Up + lz*Right
            const wx = sat.worldPos.x + lx * sat.forward.x + ly * sat.up.x + lz * sat.right.x;
            const wy = sat.worldPos.y + lx * sat.forward.y + ly * sat.up.y + lz * sat.right.y;
            const wz = sat.worldPos.z + lx * sat.forward.z + ly * sat.up.z + lz * sat.right.z;

            // Камера
            const x1 = wx * cosYaw - wz * sinYaw;
            const z1 = wx * sinYaw + wz * cosYaw;
            const y2 = wy * cosPitch - z1 * sinPitch;
            const z2 = wy * sinPitch + z1 * cosPitch;

            const o = vGet();
            o.x = cx + (x1 / z2) * fov;
            o.y = cy - (y2 / z2) * fov;
            o.z = z2;
            return o;
        };

        // Расчет ориентации панелей к Солнцу (Sun tracking)
        const sunDot = Math.max(0.2, (sat.forward.x * SUN_NORMALIZED.x + sat.forward.y * SUN_NORMALIZED.y + sat.forward.z * SUN_NORMALIZED.z));

        // ================================================================
        // LOD (Level of Detail) с плавным cross-fade: между 0.55 и 0.95
        // screenScale силуэт LOD растворяется, detail-модель проявляется.
        // ================================================================
        let detailAlpha = 1;
        if (!isHighlighted) {
            if (sat.screenScale < 0.55) {
                this.renderSatelliteLOD(ctx, sat, projectLocal, 0, sunDot, 1);
                return;
            }
            if (sat.screenScale < 0.95) {
                detailAlpha = Math.max(0, Math.min(1, (sat.screenScale - 0.55) / 0.4));
                this.renderSatelliteLOD(ctx, sat, projectLocal, 1, sunDot, 1 - detailAlpha);
            }
        }

        ctx.save();
        ctx.globalAlpha = detailAlpha;

        // Экранный вектор Солнца (согласован с камерой сцены, как camSun в iss_station)
        const camSun = this.sunToCam(cosYaw, sinYaw, cosPitch, sinPitch);
        const sun2x = camSun.x;
        const sun2y = -camSun.y; // экранная ось Y инвертирована

        // Локальная нормаль -> мировая (коэффициенты по базису Forward/Up/Right).
        // Пишет в переиспользуемый scratch: результат читается pushFace сразу.
        const _nrm = this._nrm || (this._nrm = { x: 0, y: 0, z: 0 });
        const worldNormal = (fx, fy, fz) => {
            _nrm.x = fx * sat.forward.x + fy * sat.up.x + fz * sat.right.x;
            _nrm.y = fx * sat.forward.y + fy * sat.up.y + fz * sat.right.y;
            _nrm.z = fx * sat.forward.z + fy * sat.up.z + fz * sat.right.z;
            return _nrm;
        };

        const polys = pool.pl;
        polys.length = 0;
        let foilCounter = 0;
        let faceCounter = 0;

        // Билинейная интерполяция по 4 углам квада (для декалей).
        // До 4 живых результатов одновременно — 4 переиспользуемых слота.
        const _qp = this._qp || (this._qp = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
        let _qpI = 0;
        const quadPoint = (pts, u, v) => {
            const q = _qp[_qpI++ & 3];
            const ax = pts[0].x + (pts[1].x - pts[0].x) * u;
            const ay = pts[0].y + (pts[1].y - pts[0].y) * u;
            const bx = pts[3].x + (pts[2].x - pts[3].x) * u;
            const by = pts[3].y + (pts[2].y - pts[3].y) * u;
            q.x = ax + (bx - ax) * v;
            q.y = ay + (by - ay) * v;
            return q;
        };

        /**
         * Добавить грань с фасеточным градиентным шейдингом по Солнцу
         * + голубым rim-light от Земли на надирных гранях.
         * opts: { shine: 0..1 — контраст хрома, decal: fn(ctx) — отрисовка после заливки }
         */
        const pushFace = (pts, col, normalWorld, opts) => {
            const o = opts || EMPTY_OPTS;
            const n = normalWorld;
            const nl = Math.hypot(n.x, n.y, n.z) || 1;
            // Минимальный ambient ~0.30: теневые грани не проваливаются в чёрный
            const lambert = Math.max(0.30, (n.x * SUN_NORMALIZED.x + n.y * SUN_NORMALIZED.y + n.z * SUN_NORMALIZED.z) / nl);
            const rim = Math.max(0, -(n.x * sat.up.x + n.y * sat.up.y + n.z * sat.up.z));

            let cz = 0, ccx = 0, ccy = 0;
            for (let i = 0; i < pts.length; i++) { cz += pts[i].z; ccx += pts[i].x; ccy += pts[i].y; }
            const inv = 1 / pts.length;
            cz *= inv; ccx *= inv; ccy *= inv;

            const shine = o.shine || 0;
            let poly = pool.p[pool.pi];
            if (!poly) { poly = { pts: null, z: 0, borderColor: '', decal: null, color: null }; pool.p[pool.pi] = poly; }
            pool.pi++;
            poly.pts = pts;
            poly.z = cz;
            // Тонкая светлая обводка ребра фасета — грань читается объёмом
            poly.borderColor = isHighlighted ? '#38bdf8' : 'rgba(255,255,255,0.35)';
            poly.decal = o.decal || null;
            // Gold-foil: крошечные морщины-штрихи на «горячих» гранях при крупном зуме
            if (!poly.decal && o.foil && scale >= 1.8 && !isHighlighted) {
                const rng = this.makeRng(sat.index * 17 + foilCounter++ * 13 + 5);
                poly.decal = (c, fp) => {
                    c.strokeStyle = 'rgba(120, 68, 8, 0.32)';
                    c.lineWidth = 0.7;
                    // Все морщины — ОДИН путь и один stroke (батчинг линий)
                    c.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const u = 0.15 + rng() * 0.7, v = 0.15 + rng() * 0.7;
                        const du = (rng() - 0.5) * 0.16, dv = (rng() - 0.5) * 0.16;
                        const a = quadPoint(fp, u - du, v - dv);
                        const b = quadPoint(fp, u + du, v + dv);
                        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
                    }
                    c.stroke();
                };
            }
            if (isHighlighted) {
                poly.color = '#ffffff';
            } else if (scale < 1.25) {
                // Дальний/мелкий спутник: грань < ~5px на экране — градиент по ней
                // неотличим от сплошного среднего тона. Экономит до ~1500
                // createLinearGradient за кадр на рое (главный пожиратель FPS).
                poly.color = this.faceColor(col, lambert * (0.925 + 0.225 * shine) + 0.17, rim * 0.8);
            } else {
                // Крупный план: фасетный градиент по экранному Солнцу — из кэша
                // (пересоздаётся только при смещении центра на >= 6px/смене цвета)
                const c0 = this.faceColor(col, lambert * (1.3 + 0.45 * shine) + 0.18, rim);
                const c1 = this.faceColor(col, lambert * 0.55 + 0.16, rim * 0.6);
                poly.color = this._gradLin(
                    ctx, 'sg' + sat.index + '_' + faceCounter,
                    ccx - sun2x * s, ccy - sun2y * s,
                    ccx + sun2x * s, ccy + sun2y * s,
                    [0, c0, 1, c1]
                );
            }
            faceCounter++;
            polys.push(poly);
            return poly;
        };

        /**
         * Корпус-параллелепипед: 6 граней с индивидуальным освещением.
         */
        const pushBox = (bw, bh, bd, col, opts) => {
            const v = arrGet(8);
            v[0] = projectLocal(-bw, -bh, -bd); v[1] = projectLocal(bw, -bh, -bd);
            v[2] = projectLocal(bw,  bh, -bd); v[3] = projectLocal(-bw,  bh, -bd);
            v[4] = projectLocal(-bw, -bh,  bd); v[5] = projectLocal(bw, -bh,  bd);
            v[6] = projectLocal(bw,  bh,  bd); v[7] = projectLocal(-bw,  bh,  bd);
            pushFace(arr4(v[0], v[1], v[2], v[3]), col, worldNormal(0, 0, -1), opts); // Лево
            pushFace(arr4(v[4], v[5], v[6], v[7]), col, worldNormal(0, 0, 1), opts);  // Право
            pushFace(arr4(v[1], v[5], v[6], v[2]), col, worldNormal(1, 0, 0), opts);  // Нос
            pushFace(arr4(v[0], v[4], v[7], v[3]), col, worldNormal(-1, 0, 0), opts); // Корма
            pushFace(arr4(v[3], v[2], v[6], v[7]), col, worldNormal(0, 1, 0), opts);  // Зенит
            pushFace(arr4(v[0], v[1], v[5], v[4]), col, worldNormal(0, -1, 0), opts); // Надир
        };

        /**
         * Цилиндрический корпус (8-гранная призма) — метео/научные аппараты.
         */
        const pushCylinder = (bw, rad, col, opts) => {
            const segs = 8;
            for (let k = 0; k < segs; k++) {
                const a0 = (k / segs) * Math.PI * 2;
                const a1 = ((k + 1) / segs) * Math.PI * 2;
                const y0 = Math.cos(a0) * rad, z0 = Math.sin(a0) * rad;
                const y1 = Math.cos(a1) * rad, z1 = Math.sin(a1) * rad;
                const am = (a0 + a1) * 0.5;
                pushFace(
                    arr4(projectLocal(-bw, y0, z0), projectLocal(bw, y0, z0),
                        projectLocal(bw, y1, z1), projectLocal(-bw, y1, z1)),
                    col, worldNormal(0, Math.cos(am), Math.sin(am)), opts
                );
            }
            // Носовая крышка
            const cap = arrGet(segs);
            for (let k = 0; k < segs; k++) {
                const a = (k / segs) * Math.PI * 2;
                cap[k] = projectLocal(bw, Math.cos(a) * rad, Math.sin(a) * rad);
            }
            pushFace(cap, col, worldNormal(1, 0, 0), opts);
        };

        /**
         * Солнечная панель-крыло: градиент + ячеистая текстура со случайными
         * тёмными ячейками (только при крупном экранном размере).
         */
        let wingCounter = 0;
        const pushWing = (aLocal, bLocal, dLocal, halfChord, col, opts) => {
            const o = opts || EMPTY_OPTS;
            const d = dLocal;
            const c0 = projectLocal(aLocal[0] + d[0] * halfChord, aLocal[1] + d[1] * halfChord, aLocal[2] + d[2] * halfChord);
            const c1 = projectLocal(bLocal[0] + d[0] * halfChord, bLocal[1] + d[1] * halfChord, bLocal[2] + d[2] * halfChord);
            const c2 = projectLocal(bLocal[0] - d[0] * halfChord, bLocal[1] - d[1] * halfChord, bLocal[2] - d[2] * halfChord);
            const c3 = projectLocal(aLocal[0] - d[0] * halfChord, aLocal[1] - d[1] * halfChord, aLocal[2] - d[2] * halfChord);
            const pts = arr4(c0, c1, c2, c3);

            // Нормаль: cross(b-a, d) в локальном базисе
            const ex = bLocal[0] - aLocal[0], ey = bLocal[1] - aLocal[1], ez = bLocal[2] - aLocal[2];
            const nx = ey * d[2] - ez * d[1];
            const ny = ez * d[0] - ex * d[2];
            const nz = ex * d[1] - ey * d[0];
            const nLen = Math.hypot(nx, ny, nz) || 1;
            const n = worldNormal(nx / nLen, ny / nLen, nz / nLen);

            const seed = sat.index * 31 + wingCounter * 7 + 3;
            wingCounter++;

            const decal = (scale >= 0.8) ? (() => {
                const rng = this.makeRng(seed);
                const cols = o.cells || 4;
                return (c) => {
                    c.strokeStyle = 'rgba(10, 26, 52, 0.7)';
                    c.lineWidth = 0.7;
                    // Все линии ячеек — ОДИН путь и один stroke (батчинг)
                    c.beginPath();
                    for (let i = 1; i < cols; i++) {
                        const p0 = quadPoint(pts, i / cols, 0), p1 = quadPoint(pts, i / cols, 1);
                        c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
                    }
                    {
                        const p0 = quadPoint(pts, 0, 0.5), p1 = quadPoint(pts, 1, 0.5);
                        c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
                    }
                    c.stroke();
                    // Случайные тёмные (деградировавшие) ячейки
                    c.fillStyle = 'rgba(8, 16, 34, 0.65)';
                    for (let k = 0; k < 2; k++) {
                        const u0 = rng() * 0.75, v0 = rng() * 0.75;
                        const du = 1 / cols, dv = 0.5;
                        const q0 = quadPoint(pts, u0, v0), q1 = quadPoint(pts, u0 + du, v0);
                        const q2 = quadPoint(pts, u0 + du, v0 + dv), q3 = quadPoint(pts, u0, v0 + dv);
                        c.beginPath();
                        c.moveTo(q0.x, q0.y); c.lineTo(q1.x, q1.y);
                        c.lineTo(q2.x, q2.y); c.lineTo(q3.x, q3.y);
                        c.closePath(); c.fill();
                    }
                };
            })() : null;

            return pushFace(pts, col, n, { decal });
        };

        /**
         * Параболическая антенна-тарелка: эллипс с ободом, направлена в надир,
         * с «рогом» облучателя на штанге.
         */
        const pushDish = (mountY, radius) => {
            const dR = radius;
            const rimPts = arrGet(10);
            for (let k = 0; k < 10; k++) {
                const a = (k / 10) * Math.PI * 2;
                rimPts[k] = projectLocal(Math.cos(a) * dR, mountY - s * 0.45, Math.sin(a) * dR);
            }
            const poly = pushFace(rimPts, '#dfe6ee', worldNormal(0, -1, 0), { shine: 0.4 });
            poly.borderColor = isHighlighted ? '#38bdf8' : '#9fb0c3';
            poly.decal = (c) => {
                // Рог облучателя: штанга от центра зеркала в надир + рупор
                const f0 = projectLocal(0, mountY - s * 0.2, 0);
                const f1 = projectLocal(0, mountY - s * 1.15, 0);
                c.strokeStyle = isHighlighted ? 'rgba(191, 219, 254, 0.95)' : 'rgba(148, 163, 184, 0.9)';
                c.lineWidth = Math.max(0.8, s * 0.13);
                c.beginPath(); c.moveTo(f0.x, f0.y); c.lineTo(f1.x, f1.y); c.stroke();
                c.fillStyle = '#e2e8f0';
                c.beginPath(); c.arc(f1.x, f1.y, Math.max(1.0, s * 0.16), 0, Math.PI * 2); c.fill();
            };
            return poly;
        };

        // ================================================================
        // ГЕОМЕТРИЯ ПО АРХЕТИПАМ
        // ================================================================
        const orbitPanelColor = this.panelColorForOrbit(sat.incDeg, arch.panelColor);
        const GOLD_FOIL = '#d99a26';
        let strobeTipLocal = [0, 0, s * 3.0];

        if (t === 'CUBESAT_RESEARCH') {
            // 1. Кубсат: хромированный бокс 3U с фасеточным блеском + панели-крылья
            const bw = s * 1.5, bh = s * 0.55, bd = s * 0.55;
            pushBox(bw, bh, bd, '#d3dae3', OPT_SHINE_CHROME);
            pushWing([0, 0,  bd + s * 0.15], [0, 0,  bd + s * 2.4], D_X, s * 0.5, orbitPanelColor);
            pushWing([0, 0, -bd - s * 0.15], [0, 0, -bd - s * 2.4], D_X, s * 0.5, orbitPanelColor);
            strobeTipLocal = [0, 0, bd + s * 2.4];
        } else if (t === 'COMMS_RELAY') {
            // 2. Связной GEO: золотой foil-корпус + 2 больших золотых панели + тарелка в надир
            const bw = s * 1.0, bh = s * 0.85, bd = s * 0.85;
            pushBox(bw, bh, bd, GOLD_FOIL, OPT_SHINE_FOIL);
            pushWing([0, 0,  bd + s * 0.2], [0, 0,  bd + s * 3.6], D_X, s * 0.9, GOLD_FOIL, OPT_CELLS3);
            pushWing([0, 0, -bd - s * 0.2], [0, 0, -bd - s * 3.6], D_X, s * 0.9, GOLD_FOIL, OPT_CELLS3);
            pushDish(-bh, s * 1.1);
            strobeTipLocal = [0, 0, bd + s * 3.6];
        } else if (t === 'EARTH_OBSERVATION') {
            // 3. Развед-/обзорный SSO: вытянутый корпус + объектив-телескоп в надир + панели-паруса
            const bw = s * 1.9, bh = s * 0.6, bd = s * 0.6;
            pushBox(bw, bh, bd, '#3f4a58', OPT_SHINE_MATTE);
            pushWing([0, 0,  bd + s * 0.15], [0, 0,  bd + s * 3.0], D_X, s * 0.75, orbitPanelColor);
            pushWing([0, 0, -bd - s * 0.15], [0, 0, -bd - s * 3.0], D_X, s * 0.75, orbitPanelColor);
            strobeTipLocal = [0, 0, bd + s * 3.0];
        } else if (t === 'NAVIGATION_GNSS') {
            // 4. Навигационный: корпус + 3 панели крест-накрест + антенны-решётки в надир
            const bw = s * 1.0, bh = s * 0.9, bd = s * 0.9;
            pushBox(bw, bh, bd, '#aeb7c2', OPT_SHINE_NAV);
            pushWing([0, 0,  bd + s * 0.2], [0, 0,  bd + s * 2.6], D_X, s * 0.6, orbitPanelColor);
            pushWing([ bw + s * 0.2, 0, 0], [ bw + s * 2.6, 0, 0], D_Z, s * 0.6, orbitPanelColor);
            pushWing([-bw - s * 0.2, 0, 0], [-bw - s * 2.6, 0, 0], D_Z, s * 0.6, orbitPanelColor);
            strobeTipLocal = [0, 0, bd + s * 2.6];
        } else if (t === 'SPACE_TELESCOPE') {
            // 5. Метео/научный: цилиндр с тарелкой и штангами приборов
            const bw = s * 1.1, rad = s * 0.55;
            pushCylinder(bw, rad, '#8a94a2', OPT_SHINE_TELESCOPE);
            pushWing([0, 0,  rad + s * 0.15], [0, 0,  rad + s * 2.7], D_X, s * 0.65, orbitPanelColor);
            pushWing([0, 0, -rad - s * 0.15], [0, 0, -rad - s * 2.7], D_X, s * 0.65, orbitPanelColor);
            pushDish(-rad, s * 0.95);
            strobeTipLocal = [0, 0, rad + s * 2.7];
        } else {
            // MEGA_CONSTELLATION: плоская платформа с большими крыльями
            const bw = s * 1.5, bh = s * 0.25, bd = s * 0.95;
            pushBox(bw, bh, bd, '#3a4656', OPT_SHINE_MEGA);
            pushWing([0, 0,  bd + s * 0.15], [0, 0,  bd + s * 3.3], D_X, s * 1.0, orbitPanelColor);
            pushWing([0, 0, -bd - s * 0.15], [0, 0, -bd - s * 3.3], D_X, s * 1.0, orbitPanelColor);
            strobeTipLocal = [0, 0, bd + s * 3.3];
        }

        // Глубинная сортировка граней (Painter's algorithm: дальше -> ближе)
        polys.sort((a, b) => b.z - a.z);

        // Отрисовка отсортированных граней + декалей (ячейки, морщины, рог антенны)
        // strokeStyle обводки почти у всех граней одинаков — выставляется один раз
        // (переключается только для особых граней вроде обода тарелки)
        const baseBorder = isHighlighted ? '#38bdf8' : 'rgba(255,255,255,0.35)';
        let curBorder = baseBorder;
        ctx.strokeStyle = curBorder;
        ctx.lineWidth = 1;
        for (let p = 0; p < polys.length; p++) {
            const poly = polys[p];
            ctx.fillStyle = poly.color;
            if (poly.borderColor !== curBorder) {
                curBorder = poly.borderColor;
                ctx.strokeStyle = curBorder;
            }
            ctx.beginPath();
            ctx.moveTo(poly.pts[0].x, poly.pts[0].y);
            for (let k = 1; k < poly.pts.length; k++) {
                ctx.lineTo(poly.pts[k].x, poly.pts[k].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (poly.decal) poly.decal(ctx, poly.pts);
        }

        // ================================================================
        // Специфические надстройки архетипов (поверх граней)
        // ================================================================
        if (t === 'EARTH_OBSERVATION') {
            // Объектив-телескоп в надир: тёмное стекло со стеклянным блеском
            const lc = projectLocal(0, -s * 0.62, 0);
            const rl = Math.max(1.6, s * 0.42);
            // Радиальный градиент стекла из кэша (смещённое внутреннее кольцо)
            ctx.fillStyle = this._gradRadial(
                ctx, 'lensR' + sat.index,
                lc.x - rl * 0.35, lc.y - rl * 0.35, lc.x, lc.y, rl * 0.08, rl,
                [0, '#2a3a55', 0.55, '#0a1020', 1, '#030509']
            );
            ctx.beginPath(); ctx.arc(lc.x, lc.y, rl, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#7c8aa0';
            ctx.lineWidth = Math.max(0.7, s * 0.1);
            ctx.stroke();
            // Блик на стекле
            ctx.strokeStyle = 'rgba(220, 235, 255, 0.7)';
            ctx.lineWidth = Math.max(0.6, rl * 0.16);
            ctx.beginPath();
            ctx.arc(lc.x, lc.y, rl * 0.55, Math.PI * 1.05, Math.PI * 1.55);
            ctx.stroke();
        }

        if (t === 'NAVIGATION_GNSS') {
            // Тонкие антенны-решётки в надир (фазированная решётка)
            // Батчинг: 3 штанги одним путём + 3 вершины одним путём
            const arrColor = isHighlighted ? 'rgba(191, 219, 254, 0.95)' : 'rgba(203, 213, 225, 0.85)';
            const dotR = Math.max(0.8, s * 0.11);
            ctx.strokeStyle = arrColor;
            ctx.lineWidth = Math.max(0.6, s * 0.1);
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            for (let k = -1; k <= 1; k++) {
                const b = projectLocal(k * s * 0.45, -s * 0.9, 0);
                const tp = projectLocal(k * s * 0.45, -s * 0.9 - s * 1.0, 0);
                ctx.moveTo(b.x, b.y); ctx.lineTo(tp.x, tp.y);
            }
            ctx.stroke();
            ctx.beginPath();
            for (let k = -1; k <= 1; k++) {
                const tp = projectLocal(k * s * 0.45, -s * 0.9 - s * 1.0, 0);
                ctx.moveTo(tp.x + dotR, tp.y);
                ctx.arc(tp.x, tp.y, dotR, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        if (t === 'SPACE_TELESCOPE') {
            // Штанги приборов по диагоналям с сенсорами на концах
            const boomColor = isHighlighted ? 'rgba(191, 219, 254, 0.95)' : 'rgba(148, 163, 184, 0.85)';
            const booms = [
                [s * 0.4, s * 0.35, s * 0.3, s * 1.5, s * 0.9],
                [-s * 0.4, -s * 0.35, -s * 0.3, -s * 1.5, -s * 0.9]
            ];
            const dotR = Math.max(0.8, s * 0.13);
            ctx.strokeStyle = boomColor;
            ctx.lineWidth = Math.max(0.6, s * 0.1);
            ctx.fillStyle = arch.strobeColor;
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            for (let k = 0; k < booms.length; k++) {
                const b = booms[k];
                const p0 = projectLocal(b[0], b[1], b[2]);
                const p1 = projectLocal(b[3], b[4] + s * 0.7, b[2]);
                ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
            }
            ctx.stroke();
            ctx.beginPath();
            for (let k = 0; k < booms.length; k++) {
                const b = booms[k];
                const p1 = projectLocal(b[3], b[4] + s * 0.7, b[2]);
                ctx.moveTo(p1.x + dotR, p1.y);
                ctx.arc(p1.x, p1.y, dotR, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.globalAlpha = detailAlpha;
        }

        // Антенна-палочка (whip antenna) в зенит — для компактных платформ
        if (t === 'CUBESAT_RESEARCH' || t === 'MEGA_CONSTELLATION') {
            const antBase = projectLocal(0, s * 0.6, 0);
            const antTip = projectLocal(0, s * 0.6 + s * 2.0, 0);
            if (antBase && antTip) {
                ctx.strokeStyle = isHighlighted ? 'rgba(191, 219, 254, 0.95)' : 'rgba(203, 213, 225, 0.8)';
                ctx.lineWidth = Math.max(0.7, s * 0.22);
                ctx.beginPath();
                ctx.moveTo(antBase.x, antBase.y);
                ctx.lineTo(antTip.x, antTip.y);
                ctx.stroke();
                ctx.fillStyle = arch.strobeColor;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(antTip.x, antTip.y, Math.max(0.9, s * 0.2), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = detailAlpha;
            }
        }

        // Плазменный факел ионного двигателя (для группировок типа Starlink / Сфера)
        if (arch.hasIonPlume) {
            const plumeTip = projectLocal(-s * 1.5 - s * 2.4, 0, 0);
            const plumeBase0 = projectLocal(-s * 1.5,  s * 0.3, 0);
            const plumeBase1 = projectLocal(-s * 1.5, -s * 0.3, 0);

            // Градиент факела из кэша (цвета стопов постоянны)
            ctx.fillStyle = this._gradLin(
                ctx, 'plume' + sat.index,
                plumeBase0.x, plumeBase0.y, plumeTip.x, plumeTip.y,
                [0, 'rgba(56, 189, 248, 0.9)', 0.6, 'rgba(14, 165, 233, 0.45)', 1, 'rgba(2, 6, 23, 0)']
            );
            ctx.beginPath();
            ctx.moveTo(plumeBase0.x, plumeBase0.y);
            ctx.lineTo(plumeTip.x, plumeTip.y);
            ctx.lineTo(plumeBase1.x, plumeBase1.y);
            ctx.closePath();
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;

        // Навигационный маячок: короткая вспышка раз в ~2 с, красный/зелёный
        // габарит по чётности индекса (Port red / Starboard green), с glow
        const strobePos = projectLocal(strobeTipLocal[0], strobeTipLocal[1], strobeTipLocal[2]);
        const strobeColor = this.strobeColorForSatellite(sat, arch);
        this.drawSatelliteStrobe(ctx, strobePos.x, strobePos.y, sat, strobeColor, s, isHighlighted);

        ctx.restore();
    }

    /**
     * Цвет габаритного огня: красный/зелёный по чётности, архетипный для телескопов
     */
    strobeColorForSatellite(sat, arch) {
        if (arch.type === 'SPACE_TELESCOPE') return arch.strobeColor;
        return (sat.index % 2 === 0) ? '#ec4899' : '#ef4444';
    }

    /**
     * Отрисовка маячка: короткая вспышка (~0.2 c) с радиальным glow,
     * период ~2 c (задаётся strobePulse в update)
     */
    drawSatelliteStrobe(ctx, x, y, sat, color, s, isHighlighted) {
        const cycleFrac = sat.strobePulse / (Math.PI * 2); // 0..1 за ~2 с
        const flash = cycleFrac < 0.11;                    // короткая вспышка ~0.2 с
        if (!flash && !isHighlighted) return;

        const alpha = isHighlighted ? 1.0 : (flash ? Math.min(1, (0.11 - cycleFrac) / 0.06) : 0);
        if (alpha <= 0) return;

        const haloR = Math.max(3, s * (isHighlighted ? 5.5 : 3.5));
        // Спрайт свечения из кэша (точная копия прежнего радиального градиента):
        // один drawImage вместо createRadialGradient на каждую вспышку
        const sprite = this._glowSprite(color);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, x - haloR, y - haloR, haloR * 2, haloR * 2);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, s * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Цвет солнечных панелей по типу орбиты (наклонению):
     * солнечно-синхронные (~97°) — глубокий синий,
     * средне-наклонные LEO (50–96°) — васильковый,
     * GEO/навигационные (<50°) — золотистый (GaAs-подложка).
     */
    panelColorForOrbit(incDeg, fallback) {
        // Стальной тёмно-синий (не чёрный): читается на фоне космоса
        if (incDeg >= 95) return '#1e3a5f';
        if (incDeg >= 50) return '#0a5c94';
        return '#c9861a';
    }

    /**
     * LOD-спрайты: дешёвая отрисовка дальних/мелких спутников вместо
     * полигональной модели (детали видны только при увеличении).
     * lodLevel 0 — точка с блеском; 1 — точка + силуэт панелей.
     */
    renderSatelliteLOD(ctx, sat, projectLocal, lodLevel, sunDot, lodAlpha = 1) {
        if (lodAlpha <= 0.01) return;
        const arch = sat.archetype;
        const s = Math.max(0.65, sat.screenScale) * 1.8;
        const c = projectLocal(0, 0, 0);
        if (!c) return;

        // Точка с блеском: ядро + дифракционный крест по фазе блеска
        const r = Math.max(1.1, s * 0.55);
        const glint = 0.55 + 0.45 * Math.sin(sat.strobePulse * 2.0 + sat.index);
        ctx.fillStyle = this.shadeColor(
            arch.type === 'COMMS_RELAY' || arch.type === 'NAVIGATION_GNSS' ? arch.goldFoil : arch.baseColor,
            0.7 + sunDot * 0.5
        );
        ctx.globalAlpha = Math.min(1, 0.75 + glint * 0.25) * lodAlpha;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Блеск-искра
        ctx.globalAlpha = glint * 0.55 * lodAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Уровень 1: силуэт панелей (две линии) — cheap, без полигонов
        if (lodLevel >= 1) {
            const panelColor = this.panelColorForOrbit(sat.incDeg, arch.panelColor);
            const pL = projectLocal(0, 0, -s * 3.2);
            const pR = projectLocal(0, 0, s * 3.2);
            if (pL && pR) {
                ctx.strokeStyle = panelColor;
                ctx.globalAlpha = 0.85 * lodAlpha;
                ctx.lineWidth = Math.max(1.0, r * 1.1);
                ctx.beginPath();
                ctx.moveTo(pL.x, pL.y);
                ctx.lineTo(pR.x, pR.y);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }

        // Маячок работает и в LOD-режиме
        const strobeColor = this.strobeColorForSatellite(sat, arch);
        this.drawSatelliteStrobe(ctx, c.x, c.y - r * 2, sat, strobeColor, s, false);
    }

    /**
     * Затемнение/осветление цвета по коэффициенту освещения Солнцем
     */
    shadeColor(col, factor) {
        if (!col || col.startsWith('rgba')) return col;
        let c = col;
        if (c.charAt(0) === '#') c = c.slice(1);
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];

        const num = parseInt(c, 16);
        let r = (num >> 16);
        let g = ((num >> 8) & 0x00FF);
        let b = (num & 0x0000FF);

        const f = Math.max(0.2, Math.min(1.4, factor * 1.15));
        r = Math.min(255, Math.floor(r * f));
        g = Math.min(255, Math.floor(g * f));
        b = Math.min(255, Math.floor(b * f));

        return `rgb(${r},${g},${b})`;
    }

    /**
     * Разбор hex-цвета в [r, g, b]
     */
    parseHexColor(col) {
        let c = col || '#888888';
        if (c.charAt(0) === '#') c = c.slice(1);
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        const num = parseInt(c, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    /**
     * Матовый/металлический цвет грани: диффузный фактор + голубой rim-light
     * снизу (отражение Земли на надирных гранях).
     */
    faceColor(col, factor, rim = 0) {
        const rgb = this.parseHexColor(col);
        const f = Math.max(0.16, Math.min(1.5, factor));
        let r = rgb[0] * f, g = rgb[1] * f, b = rgb[2] * f;
        if (rim > 0) {
            const k = Math.min(0.5, rim * 0.55);
            r += (150 - r) * k;
            g += (190 - g) * k;
            b += (255 - b) * k;
        }
        return `rgb(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, b) | 0})`;
    }

    /**
     * Экранная проекция вектора Солнца (согласована с камерой сцены,
     * аналог camSun в iss_station.js) — для градиентов по граням.
     */
    sunToCam(cosYaw, sinYaw, cosPitch, sinPitch) {
        const v = SUN_NORMALIZED;
        const x1 = v.x * cosYaw - v.z * sinYaw;
        const z1 = v.x * sinYaw + v.z * cosYaw;
        const y2 = v.y * cosPitch - z1 * sinPitch;
        return { x: x1, y: y2, z: v.y * sinPitch + z1 * cosPitch };
    }

    /**
     * Детерминированный ГПСЧ (LCH) для стабильных декалей (ячейки, морщины)
     */
    makeRng(seed) {
        let st = (seed >>> 0) || 1;
        return () => {
            st = (st * 1664525 + 1013904223) >>> 0;
            return st / 4294967296;
        };
    }

    /* ====================================================================
     * Кэши рендера (устранение аллокаций в кадре — главные пожиратели FPS)
     * ================================================================== */

    /**
     * Кэш линейных градиентов с квантованными опорными точками.
     * Градиент пересоздаётся ТОЛЬКО когда сменились квантованные координаты
     * (сетка 6px) или цвета стопов — визуально идентичен per-frame градиенту,
     * но в устойчивом режиме не аллоцирует ничего.
     * stops — массив [offset, color, offset, color, ...].
     */
    _gradLin(ctx, key, x1, y1, x2, y2, stops) {
        const q = 6;
        const qx1 = Math.round(x1 / q), qy1 = Math.round(y1 / q);
        const qx2 = Math.round(x2 / q), qy2 = Math.round(y2 / q);
        let e = this._gradCache.get(key);
        if (e && e.q0 === qx1 && e.q1 === qy1 && e.q2 === qx2 && e.q3 === qy2 &&
            _stopsSame(e.stops, stops)) return e.g;
        const g = ctx.createLinearGradient(qx1 * q, qy1 * q, qx2 * q, qy2 * q);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        if (!e) {
            if (this._gradCache.size > 1600) this._gradCache.clear();
            this._gradCache.set(key, e = { q0: 0, q1: 0, q2: 0, q3: 0, stops: null, g: null });
        }
        e.q0 = qx1; e.q1 = qy1; e.q2 = qx2; e.q3 = qy2; e.stops = stops; e.g = g;
        return g;
    }

    /**
     * Кэш радиальных градиентов с полными опорными окружностями
     * (x0,y0,r0) → (x1,y1,r1); координаты квантуются сеткой 6px, радиусы — 1px.
     */
    _gradRadial(ctx, key, x0, y0, x1, y1, r0, r1, stops) {
        const q = 6, qr = 1;
        const qx0 = Math.round(x0 / q), qy0 = Math.round(y0 / q);
        const qx1 = Math.round(x1 / q), qy1 = Math.round(y1 / q);
        const n0 = Math.max(0, Math.round(r0 / qr)), n1 = Math.max(1, Math.round(r1 / qr));
        let e = this._gradCache.get(key);
        if (e && e.q0 === qx0 && e.q1 === qy0 && e.q2 === qx1 && e.q3 === qy1 &&
            e.q4 === n0 && e.q5 === n1 && _stopsSame(e.stops, stops)) return e.g;
        const g = ctx.createRadialGradient(qx0 * q, qy0 * q, n0 * qr, qx1 * q, qy1 * q, n1 * qr);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        if (!e) {
            if (this._gradCache.size > 1600) this._gradCache.clear();
            this._gradCache.set(key, e = { q0: 0, q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, stops: null, g: null });
        }
        e.q0 = qx0; e.q1 = qy0; e.q2 = qx1; e.q3 = qy1; e.q4 = n0; e.q5 = n1; e.stops = stops; e.g = g;
        return g;
    }

    /**
     * Оффскрин-спрайт радиального свечения (строб-глоу) — вместо
     * createRadialGradient на каждую вспышку: один drawImage на кадр.
     * Спрайт — точная копия прежнего градиента (0: color, 0.4: белый 0.5, 1: 0).
     */
    _glowSprite(color) {
        let cv = this._glowCache.get(color);
        if (!cv) {
            const size = 96;
            cv = document.createElement('canvas');
            cv.width = size;
            cv.height = size;
            const c2 = cv.getContext('2d');
            const half = size / 2;
            const g = c2.createRadialGradient(half, half, 0, half, half, half);
            g.addColorStop(0, color);
            g.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c2.fillStyle = g;
            c2.fillRect(0, 0, size, size);
            this._glowCache.set(color, cv);
        }
        return cv;
    }

    /**
     * Отрисовка прицельной голографической рамки вокруг наведенного спутника
     */
    drawHoverTarget(ctx, sat) {
        const px = sat.screenX;
        const py = sat.screenY;
        const r = 20;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;

        const len = 7;
        // Верхний левый
        ctx.beginPath();
        ctx.moveTo(px - r, py - r + len);
        ctx.lineTo(px - r, py - r);
        ctx.lineTo(px - r + len, py - r);
        ctx.stroke();

        // Верхний правый
        ctx.beginPath();
        ctx.moveTo(px + r - len, py - r);
        ctx.lineTo(px + r, py - r);
        ctx.lineTo(px + r, py - r + len);
        ctx.stroke();

        // Нижний левый
        ctx.beginPath();
        ctx.moveTo(px - r, py + r - len);
        ctx.lineTo(px - r, py + r);
        ctx.lineTo(px - r + len, py + r);
        ctx.stroke();

        // Нижний правый
        ctx.beginPath();
        ctx.moveTo(px + r - len, py + r);
        ctx.lineTo(px + r, py + r);
        ctx.lineTo(px + r, py + r - len);
        ctx.stroke();

        // Текстовая метка цели
        ctx.font = '600 10.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(`${sat.name} [${sat.norad}]`, px + r + 8, py - 4);

        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 0;
        ctx.fillText(`H: ${sat.altKm} км • V: ${sat.speedKmS} км/с • ${sat.archetype.nameRu}`, px + r + 8, py + 8);

        ctx.restore();
    }

    /**
     * Скрытие наложений при выходе из 3D-режима
     */
    hideOverlays() {
        this.closeHud();
        this.hoveredIndex = -1;
        if (this.viewport) this.viewport.style.cursor = '';
    }
}

export const SatellitesSwarm = new SatellitesSwarmEngine();
export default SatellitesSwarm;
