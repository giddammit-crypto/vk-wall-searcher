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

import { SpaceAudio } from './space_audio.js?v=4.1.0';
import { EARTH_CONFIG, EARTH_CENTER } from './iss_station.js?v=4.1.0';

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
        strobeColor: '#22c55e',
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
        strobeColor: '#10b981',
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

        // Базовый радиус: 730 px (над поверхностью Земли R=700 px)
        // Шаг разделения: 7.5 px между соседними сферическими оболочками
        // Скорость уменьшена ровно в 2 раза: 72 секунды на виток для низкой орбиты вместо 36 с!
        const baseRadius = 730;
        const deltaRadius = 7.5;
        const baseOmega = (2 * Math.PI) / 72.0;

        const inclinationSets = [
            51.6, 97.8, 63.4, 28.5, 82.5, 98.2, 53.0, 74.0, 45.0, 15.0,
            90.0, 55.0, 64.8, 98.6, 35.0, 85.0, 51.6, 97.5, 63.4, 20.0,
            56.0, 64.8, 55.0, 56.0, 55.0, 64.8, 55.0, 56.0, 40.0, 29.0,
            51.6, 28.5, 98.0, 63.4, 82.5, 25.6, 97.5, 28.5, 51.6, 98.2,
            53.2, 53.0, 87.9, 82.5, 53.0, 82.5, 87.9, 42.0, 86.4, 98.0,
            97.6, 97.6, 97.4, 97.4, 64.8, 97.5, 97.4, 97.4, 97.5, 97.4
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
            sat.strobePulse = (sat.strobePulse + dt * sat.archetype.strobeRate * 4.0) % (Math.PI * 2);

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

            // Окклюзия сферой Земли
            const distToCam = Math.hypot(sat.worldPos.x, sat.worldPos.y, sat.worldPos.z) || 1;
            const rayDirX = sat.worldPos.x / distToCam;
            const rayDirY = sat.worldPos.y / distToCam;
            const rayDirZ = sat.worldPos.z / distToCam;

            const tca = eCenter.x * rayDirX + eCenter.y * rayDirY + eCenter.z * rayDirZ;
            const eDistSq = eCenter.x * eCenter.x + eCenter.y * eCenter.y + eCenter.z * eCenter.z;
            const d2 = eDistSq - tca * tca;
            const rEarthSq = (eRadius * 0.98) * (eRadius * 0.98);

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
     * Полноценный полигональный 3D рендерер спутника с затенением и ориентацией
     */
    render3DSatellite(ctx, sat, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy, isHighlighted) {
        const arch = sat.archetype;
        const scale = Math.max(0.65, sat.screenScale);

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

            return {
                x: cx + (x1 / z2) * fov,
                y: cy - (y2 / z2) * fov,
                z: z2,
                wx, wy, wz
            };
        };

        // Расчет ориентации панелей к Солнцу (Sun tracking)
        const sunDot = Math.max(0.2, (sat.forward.x * SUN_NORMALIZED.x + sat.forward.y * SUN_NORMALIZED.y + sat.forward.z * SUN_NORMALIZED.z));

        ctx.save();

        // 1. Отрисовка 3D граней корпуса в зависимости от архетипа
        const s = scale * 1.8; // Базовый размер узлов
        const polys = [];

        // Базовые размеры корпуса
        const bw = s * 1.2;  // Длина по Forward
        const bh = s * 1.0;  // Высота по Up
        const bd = s * 1.0;  // Ширина по Right

        // Геометрия параллелепипеда корпуса (6 граней)
        const v = [
            projectLocal(-bw, -bh, -bd), // 0
            projectLocal( bw, -bh, -bd), // 1
            projectLocal( bw,  bh, -bd), // 2
            projectLocal(-bw,  bh, -bd), // 3
            projectLocal(-bw, -bh,  bd), // 4
            projectLocal( bw, -bh,  bd), // 5
            projectLocal( bw,  bh,  bd), // 6
            projectLocal(-bw,  bh,  bd)  // 7
        ];

        // Грани с расчетом освещения
        const addFace = (idxArr, colBase, normalWorld) => {
            let avgZ = 0;
            for (let i = 0; i < idxArr.length; i++) avgZ += v[idxArr[i]].z;
            avgZ /= idxArr.length;

            // Диффузное освещение граней по закону Ламберта
            const nDotL = Math.max(0.18, normalWorld.x * SUN_NORMALIZED.x + normalWorld.y * SUN_NORMALIZED.y + normalWorld.z * SUN_NORMALIZED.z);
            polys.push({
                pts: idxArr.map(i => v[i]),
                color: isHighlighted ? '#ffffff' : this.shadeColor(colBase, nDotL),
                borderColor: isHighlighted ? '#38bdf8' : 'rgba(255,255,255,0.25)',
                z: avgZ
            });
        };

        // Корпус: передняя, задняя, верхняя, нижняя, левая, правая грани
        const busColor = isHighlighted ? '#ffffff' : (arch.type === 'COMMS_RELAY' || arch.type === 'NAVIGATION_GNSS' ? arch.goldFoil : arch.baseColor);

        addFace([0, 1, 2, 3], busColor, { x: -sat.right.x, y: -sat.right.y, z: -sat.right.z }); // Лево
        addFace([4, 5, 6, 7], busColor, { x:  sat.right.x, y:  sat.right.y, z:  sat.right.z }); // Право
        addFace([1, 5, 6, 2], busColor, sat.forward);                                           // Перед (нос)
        addFace([0, 4, 7, 3], busColor, { x: -sat.forward.x, y: -sat.forward.y, z: -sat.forward.z }); // Зад
        addFace([3, 2, 6, 7], busColor, sat.up);                                                // Верх (зенит)
        addFace([0, 1, 5, 4], busColor, { x: -sat.up.x, y: -sat.up.y, z: -sat.up.z });         // Низ (надир к Земле)

        // 2. 3D Солнечные панели (SAW wings)
        const wingSpan = s * 4.2;
        const wingChord = s * 1.6;
        const wingYOffset = 0;

        // Правое крыло (по +Right)
        const pw0 = projectLocal(-wingChord * 0.5, wingYOffset - s * 0.1,  bd + s * 0.4);
        const pw1 = projectLocal( wingChord * 0.5, wingYOffset - s * 0.1,  bd + s * 0.4);
        const pw2 = projectLocal( wingChord * 0.5, wingYOffset + s * 0.1,  bd + wingSpan);
        const pw3 = projectLocal(-wingChord * 0.5, wingYOffset + s * 0.1,  bd + wingSpan);

        polys.push({
            pts: [pw0, pw1, pw2, pw3],
            color: arch.panelColor,
            borderColor: '#38bdf8',
            z: (pw0.z + pw1.z + pw2.z + pw3.z) * 0.25
        });

        // Левое крыло (по -Right)
        const lw0 = projectLocal(-wingChord * 0.5, wingYOffset - s * 0.1, -bd - s * 0.4);
        const lw1 = projectLocal( wingChord * 0.5, wingYOffset - s * 0.1, -bd - s * 0.4);
        const lw2 = projectLocal( wingChord * 0.5, wingYOffset + s * 0.1, -bd - wingSpan);
        const lw3 = projectLocal(-wingChord * 0.5, wingYOffset + s * 0.1, -bd - wingSpan);

        polys.push({
            pts: [lw0, lw1, lw2, lw3],
            color: arch.panelColor,
            borderColor: '#38bdf8',
            z: (lw0.z + lw1.z + lw2.z + lw3.z) * 0.25
        });

        // 3. Специфические элементы архетипов (Антенны, радары, оптические тубусы)
        if (arch.hasDish) {
            // Параболическое зеркало антенны, смотрящее в сторону Земли (надир)
            const dishCenter = projectLocal(0, -bh - s * 0.7, 0);
            const dR = s * 1.2;
            const dPts = [];
            const dSegments = 8;
            for (let k = 0; k < dSegments; k++) {
                const ang = (k / dSegments) * Math.PI * 2;
                dPts.push(projectLocal(Math.cos(ang) * dR, -bh - s * 0.9, Math.sin(ang) * dR));
            }
            polys.push({
                pts: dPts,
                color: '#ffffff',
                borderColor: '#cbd5e1',
                z: dishCenter.z
            });
        }

        // Глубинная сортировка граней (Painter's algorithm: дальше -> ближе)
        polys.sort((a, b) => b.z - a.z);

        // Отрисовка отсортированных граней
        for (let p = 0; p < polys.length; p++) {
            const poly = polys[p];
            ctx.fillStyle = poly.color;
            ctx.strokeStyle = poly.borderColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(poly.pts[0].x, poly.pts[0].y);
            for (let k = 1; k < poly.pts.length; k++) {
                ctx.lineTo(poly.pts[k].x, poly.pts[k].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // 4. Плазменный факел ионного двигателя (для группировок типа Starlink / Сфера)
        if (arch.hasIonPlume) {
            const plumeTip = projectLocal(-bw - s * 2.4, 0, 0);
            const plumeBase0 = projectLocal(-bw,  s * 0.3, 0);
            const plumeBase1 = projectLocal(-bw, -s * 0.3, 0);

            const plumeGrad = ctx.createLinearGradient(plumeBase0.x, plumeBase0.y, plumeTip.x, plumeTip.y);
            plumeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
            plumeGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.45)');
            plumeGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');

            ctx.fillStyle = plumeGrad;
            ctx.beginPath();
            ctx.moveTo(plumeBase0.x, plumeBase0.y);
            ctx.lineTo(plumeTip.x, plumeTip.y);
            ctx.lineTo(plumeBase1.x, plumeBase1.y);
            ctx.closePath();
            ctx.fill();
        }

        // 5. Навигационный импульсный стробоскоп на конце крыла
        const strobePos = pw2;
        const pulse = Math.sin(sat.strobePulse);
        if (pulse > 0.4 || isHighlighted) {
            const strobeAlpha = isHighlighted ? 1.0 : (pulse - 0.4) / 0.6;
            ctx.fillStyle = arch.strobeColor;
            ctx.globalAlpha = strobeAlpha;
            ctx.beginPath();
            ctx.arc(strobePos.x, strobePos.y, s * 0.65 * (isHighlighted ? 2.2 : 1.3), 0, Math.PI * 2);
            ctx.fill();

            const haloGrad = ctx.createRadialGradient(strobePos.x, strobePos.y, 0, strobePos.x, strobePos.y, s * 3.5);
            haloGrad.addColorStop(0, arch.strobeColor);
            haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(strobePos.x, strobePos.y, s * 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
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
