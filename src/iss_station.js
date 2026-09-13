/**
 * src/iss_station.js — International Space Station (ISS / МКС) 3D Module
 * ============================================================================
 * Разработка: Lead 3D Game Engineer & Graphics Programmer for AURORA
 *
 * Архитектура и функционал:
 * - Физическая орбита вокруг Земли: МКС физически огибает сферу Земли
 *   (центр Земли: eCoords = { yaw: 0, pitch: -44, dist: 1470 }, R_земли = 700 px,
 *   R_орбиты = 900 px — безопасный запас 1.29x у лимба).
 * - Наклонение орбиты 150° (оптимизировано численной симуляцией видимости):
 *   с периодом ~3.75 мин (225 с).
 * - Проградная ориентация (LVLH - Local Vertical Local Horizontal):
 *   продольная ось модулей выровнена по вектору скорости (полет носом вперед),
 *   ферма ITS ориентирована строго перпендикулярно вектору полета и радиальному зениту,
 *   а купол Cupola направлен прямо в надир к Земле!
 * - Трассировка лучей (Ray-Sphere Earth Occlusion Test):
 *   при уходе на дальнюю сторону Земли станция реалистично скрывается за глобусом.
 *   На краю диска (в атмосферном лимбе Рэлея) происходит плавное затухание (силуэт).
 * - Слежение за Солнцем (BGA - Beta Gimbal Assembly) и орбитальные затмения:
 *   8 солнечных батарей разворачиваются к вектору Солнца { x: 0.72, y: 0.28, z: 0.63 }.
 *   При заходе в тень Земли (Eclipse) выработка энергии падает, а навигационные
 *   стробоскопы ярко вспыхивают на темной стороне.
 * - Полная синхронизация с 3D-камерой Space3D (Yaw, Pitch, Zoom, FOV) и наведение.
 * - Глубинная сортировка (Painter's Algorithm) и полигональный рендеринг:
 *   ферма ITS (S0-S6, P1-P6), 8 панелей SAW, 3 радиатора TCS, модули Заря, Звезда,
 *   Destiny, Columbus, Kibo, Cupola, пристыкованные Crew Dragon и Союз МС, Canadarm2.
 * - Интерактивный Raycast / Hitbox с детекцией наведения, голографическим прицелом
 *   и интерактивной карточкой телеметрии.
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=4.5.1';

/**
 * Вектор направления на Солнце (синхронизирован с celestial_planets.js)
 */
const RAW_SUN_DIR = { x: 0.72, y: 0.28, z: 0.63 };
const SUN_LEN = Math.hypot(RAW_SUN_DIR.x, RAW_SUN_DIR.y, RAW_SUN_DIR.z) || 1;
export const SUN_VECTOR = {
    x: RAW_SUN_DIR.x / SUN_LEN,
    y: RAW_SUN_DIR.y / SUN_LEN,
    z: RAW_SUN_DIR.z / SUN_LEN
};

/**
 * Параметры планеты Земля и орбиты МКС
 */
export const EARTH_CONFIG = {
    yawDeg: 0,                   // Азимут центра Земли
    pitchDeg: -44,               // Возвышение центра Земли
    dist: 1470,                  // Расстояние до центра Земли от камеры (px, отдалена на 0.5 раза)
    radius: 700,                 // Радиус физической сферы Земли (px)
    atmoRadius: 700 * 1.025,     // Внешний радиус атмосферного ореола
    axialTiltDeg: 23.44          // Наклон оси вращения Земли (градусы)
};

export const ISS_CONFIG = {
    orbitAltitudePx: 200,        // Высота орбиты над поверхностью Земли (px)
    orbitRadiusPx: 900,          // 700 + 200 = 900 px от центра Земли (запас 1.29x радиуса Земли —
                                 // безопасный пролёт у лимба; компактная орбита не вылетает
                                 // за края экрана при широких ракурсах, в отличие от 1150 px)
    orbitPeriodSec: 45,          // Увеличенная в 5 раз скорость (полный виток за 45 сек)
    inclinationDeg: 150.0,       // Наклонение орбиты МКС к экватору Земли (градусы).
                                 // 150° (ретроградная, почти полярная) разворачивает ПЛОСКОСТЬ
                                 // орбиты почти ребром к оси камера->Земля: node-симуляция даёт
                                 // ~68% среднего времени видимости против 38% при 66°, а в рабочих
                                 // ракурсах на Землю (pitch -35..-44) станция видна 100% витка,
                                 // долго и эффектно проходя ПЕРЕД диском планеты
    raanDeg: 10.0,               // Долгота восходящего узла (RAAN) орбиты (оптимизирована симуляцией)
    raanPrecessionAmpDeg: 12.0,  // Лёгкая синусоидальная прецессия RAAN (±12°): картина пролётов
                                 // медленно меняется и не зацикливается скучно
    raanPrecessionPeriodSec: 2400, // Период прецессии RAAN (40 минут — очень медленный дрейф)
    stationScale: 4.28,          // Масштаб геометрии (4.5× от исходника 0.95)
    hitRadiusMultiplier: 1.35,   // Множитель экранного хитбокса
    realAltitudeKm: 418.4,       // Реальная высота орбиты (км)
    realSpeedKmS: 7.66,          // Реальная орбитальная скорость (км/с)
    realPeriodMin: 92.8,         // Реальный период обращения (мин)
    realInclinationDeg: 51.64    // Наклонение орбиты МКС
};

/**
 * Вычисление мировых координат центра Земли
 */
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const ePitchRad = EARTH_CONFIG.pitchDeg * DEG_TO_RAD;
const eYawRad = EARTH_CONFIG.yawDeg * DEG_TO_RAD;
export const EARTH_CENTER = {
    x: EARTH_CONFIG.dist * Math.cos(ePitchRad) * Math.sin(eYawRad),
    y: EARTH_CONFIG.dist * Math.sin(ePitchRad),
    z: EARTH_CONFIG.dist * Math.cos(ePitchRad) * Math.cos(eYawRad)
};

/**
 * Класс 3D-движка Международной Космической Станции (МКС)
 */
export class IssStationEngine {
    constructor() {
        // Системные ссылки
        this.canvas = null;
        this.ctx = null;
        this.viewport = null;
        this.spaceEngine = null;

        // Временная шкала и орбитальная фаза
        this.time = 0;               // Секунды с момента старта
        this.lastTimeMs = 0;         // Предыдущий timestamp
        this.orbitPhase = 0.35;      // Текущая фаза на орбите (0..2π)

        // Базис орбитальной плоскости вокруг центра Земли
        this.pNode = { x: 1, y: 0, z: 0 };  // Вектор к восходящему узлу
        this.qNode = { x: 0, y: 1, z: 0 };  // Орбитальный вектор +90° от узла
        this.orbitNormal = { x: 0, y: 0, z: 1 }; // Нормаль к плоскости орбиты
        this.initOrbitalBasis();

        // Положение и ориентация станции в 3D мировом пространстве
        this.worldPos = { x: 0, y: 0, z: 0 };
        this.relPos = { x: 0, y: 0, z: 0 };   // Положение относительно центра Земли
        this.velocity = { x: 0, y: 0, z: 0 };
        this.forward = { x: 1, y: 0, z: 0 };  // Проградный вектор (полет носом вперед)
        this.up = { x: 0, y: 1, z: 0 };       // Зенитный вектор (от Земли)
        this.right = { x: 0, y: 0, z: 1 };    // Вектор фермы (Starboard, перпендикулярно полету)

        // Окклюзия планетой Земля (Ray-Sphere Intersection)
        this.isOccluded = false;     // Находится ли за Землей
        this.inEclipse = false;      // Находится ли в тени Земли от Солнца
        this.limbVisibility = 1.0;   // Плавный коэффициент видимости (0..1)
        this.distToCamera = 1350;    // Расстояние от камеры до станции

        // Плавный переход радиуса орбиты (ease за ~0.6с при смене конфига)
        this.orbitRadiusCurrent = ISS_CONFIG.orbitRadiusPx;

        // Слежение за Солнцем (BGA - Beta Gimbal Assembly)
        this.betaAngle = 0;          // Текущий угол поворота солнечных батарей (радианы)
        this.targetBeta = 0;         // Оптимальный угол направления на Солнце
        this.sunDotProduct = 1.0;    // Эффективность освещения солнечных батарей
        this.powerOutputKW = 120.0;  // Выходная мощность солнечных батарей (кВт)

        // Проекция в экранные координаты камеры
        this.camYaw = 0;
        this.camPitch = 0;
        this.camZoom = 1.0;
        this.screenX = -9999;
        this.screenY = -9999;
        this.screenScale = 1.0;
        this.screenRadius = 40;
        this.isVisible = false;

        // Интерактивность и Raycast / Hitbox
        this.mousePos = { x: -9999, y: -9999 };
        this.isHovered = false;
        this.isTelemetryOpen = false;
        this.hoverTransition = 0;    // Плавная анимация подсветки (0..1)
        this.telemetryCardEl = null; // DOM-элемент карточки телеметрии
        this.lockReticleAngle = 0;   // Вращение голографического прицела
        this.audioCtx = null;        // Web Audio API контекст для Quindar beeps

        // Навигационные огни (Strobe Beacons)
        this.strobeTimer = 0;
        this.strobePhase = 0;

        // Оффскрин-кэши текстур
        this.isTexturesReady = false;
        this.solarPanelTex = null;
        this.radiatorTex = null;
        this.moduleTex = null;

        // Буфер геометрии для 60-120 FPS глубинной сортировки
        this.renderQueue = [];

        // Привязка методов
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    /**
     * Вычисление базиса Кеплеровой орбитальной плоскости (вызывается при init
     * и каждый кадр — для лёгкой прецессии RAAN)
     */
    initOrbitalBasis() {
        this.setOrbitalBasis(ISS_CONFIG.raanDeg);
    }

    /**
     * Построение ортонормированного базиса орбитальной плоскости (P_node, Q_node, W)
     * для заданной долготы восходящего узла (RAAN). Используется и для статического
     * базиса, и для медленной синусоидальной прецессии узла.
     */
    setOrbitalBasis(raanDeg) {
        const tilt = EARTH_CONFIG.axialTiltDeg * DEG_TO_RAD;
        const inc = ISS_CONFIG.inclinationDeg * DEG_TO_RAD;
        const raan = raanDeg * DEG_TO_RAD;

        // Ось вращения Земли (Северный полюс с наклоном 23.44°)
        const nE = { x: 0, y: Math.cos(tilt), z: -Math.sin(tilt) };
        // Экваториальная ось X (Точка весеннего равноденствия)
        const xE = { x: 1, y: 0, z: 0 };
        // Экваториальная ось Y = nE x xE
        const yE = {
            x: nE.y * xE.z - nE.z * xE.y,
            y: nE.z * xE.x - nE.x * xE.z,
            z: nE.x * xE.y - nE.y * xE.x
        };

        // Вектор восходящего узла P_node в экваториальной плоскости
        const cosR = Math.cos(raan);
        const sinR = Math.sin(raan);
        this.pNode = {
            x: cosR * xE.x + sinR * yE.x,
            y: cosR * xE.y + sinR * yE.y,
            z: cosR * xE.z + sinR * yE.z
        };

        // Вектор Q_node в орбитальной плоскости (перпендикулярен P_node)
        const cosI = Math.cos(inc);
        const sinI = Math.sin(inc);
        this.qNode = {
            x: -sinR * cosI * xE.x + cosR * cosI * yE.x + sinI * nE.x,
            y: -sinR * cosI * xE.y + cosR * cosI * yE.y + sinI * nE.y,
            z: -sinR * cosI * xE.z + cosR * cosI * yE.z + sinI * nE.z
        };

        // Нормаль к орбитальной плоскости W_orb = P_node x Q_node
        this.orbitNormal = {
            x: this.pNode.y * this.qNode.z - this.pNode.z * this.qNode.y,
            y: this.pNode.z * this.qNode.x - this.pNode.x * this.qNode.z,
            z: this.pNode.x * this.qNode.y - this.pNode.y * this.qNode.x
        };
    }

    /**
     * Инициализация подсистем станции, текстур и событий
     * Поддерживает вызовы init(spaceEngine) и init(canvas, ctx, viewport, spaceEngine)
     */
    init(arg1 = null, ctx = null, viewport = null, spaceEngine = null) {
        if (arg1 && typeof arg1 === 'object' && ('canvas' in arg1 || 'world' in arg1 || 'viewport' in arg1)) {
            this.spaceEngine = arg1;
            this.canvas = arg1.canvas || null;
            this.ctx = arg1.ctx || (this.canvas ? this.canvas.getContext('2d') : null);
            this.viewport = arg1.viewport || null;
        } else {
            if (arg1) this.canvas = arg1;
            if (ctx) this.ctx = ctx;
            if (viewport) this.viewport = viewport;
            if (spaceEngine) this.spaceEngine = spaceEngine;
        }

        if (!this.canvas) {
            this.canvas = document.getElementById('space-3d-canvas');
        }
        if (!this.ctx && this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        if (!this.viewport) {
            this.viewport = document.getElementById('space-3d-viewport');
        }

        this.initOffscreenTextures();
        this.injectStyles();
        this.buildTelemetryHud();
        this.setupEventListeners();

        this.lastTimeMs = performance.now();
        console.log('[IssStation] Physical Earth Orbit & 3D Kinematics successfully initialized.');
    }

    /**
     * Генерация оффскрин-текстур высокого разрешения для солнечных батарей и модулей
     */
    initOffscreenTextures() {
        if (this.isTexturesReady) return;

        // 1. Текстура фотоэлектрических ячеек солнечных батарей (SAW)
        // Реальные панели МКС (Si-элементы с покрытием) на солнце выглядят
        // тёмно-золотистыми/янтарно-медными — ретининг в тёплый спектр.
        // 2× разрешение (512×1024) + 2× finer pitch сетки (32×120 ячеек):
        // на экране ячейка вдвое мельче при вдвое большем запасе пикселей.
        const spW = 512;
        const spH = 1024;
        this.solarPanelTex = document.createElement('canvas');
        this.solarPanelTex.width = spW;
        this.solarPanelTex.height = spH;
        const spCtx = this.solarPanelTex.getContext('2d');

        const spGrad = spCtx.createLinearGradient(0, 0, spW, spH);
        spGrad.addColorStop(0, '#2d1a05');
        spGrad.addColorStop(0.35, '#4a2c0a');
        spGrad.addColorStop(0.7, '#3a2210');
        spGrad.addColorStop(1, '#241404');
        spCtx.fillStyle = spGrad;
        spCtx.fillRect(0, 0, spW, spH);

        spCtx.strokeStyle = 'rgba(251, 191, 36, 0.30)';
        spCtx.lineWidth = 1;
        const cols = 32;
        const rows = 120;
        const cw = spW / cols;
        const ch = spH / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = c * cw + 0.75;
                const py = r * ch + 0.75;
                const w = cw - 1.5;
                const h = ch - 1.5;

                // Ячейка кремния: медно-золотой градиент + светлая шина в центре
                const cellGrad = spCtx.createLinearGradient(px, py, px + w, py + h);
                const odd = (r + c) % 2 === 0;
                cellGrad.addColorStop(0.00, odd ? '#5c3a0e' : '#3b2407');
                cellGrad.addColorStop(0.45, odd ? '#7a4f14' : '#553310');
                cellGrad.addColorStop(1.00, odd ? '#38210a' : '#2a1704');
                spCtx.fillStyle = cellGrad;
                spCtx.fillRect(px, py, w, h);

                spCtx.strokeStyle = 'rgba(253, 230, 138, 0.26)';
                spCtx.lineWidth = 1;
                spCtx.beginPath();
                spCtx.moveTo(px, py + h * 0.5);
                spCtx.lineTo(px + w, py + h * 0.5);
                spCtx.stroke();

                // Тонкие токосъёмные полосы (по 2 на ячейку) — «силиконовый» микрорельеф
                spCtx.strokeStyle = 'rgba(254, 240, 138, 0.16)';
                spCtx.beginPath();
                spCtx.moveTo(px, py + h * 0.26);
                spCtx.lineTo(px + w, py + h * 0.26);
                spCtx.moveTo(px, py + h * 0.74);
                spCtx.lineTo(px + w, py + h * 0.74);
                spCtx.stroke();

                // Микро-блик на каждой ячейке: детерминированный короткий штрих
                // (позиция и яркость из хеша индексов — без дрожания по кадрам)
                const mgh = (r * 31 + c * 17) % 16;
                spCtx.strokeStyle = `rgba(255, 252, 225, ${0.10 + (mgh % 5) * 0.045})`;
                spCtx.lineWidth = 0.8;
                spCtx.beginPath();
                spCtx.moveTo(px + w * 0.18, py + h * (0.42 + (mgh % 3) * 0.16));
                spCtx.lineTo(px + w * 0.66, py + h * 0.16);
                spCtx.stroke();

                // «Битые» ячейки: детерминированные тёмные деградировавшие элементы
                const deadHash = (r * 73 + c * 151 + 37) % 211;
                if (deadHash < 5) {
                    spCtx.fillStyle = 'rgba(12, 8, 3, 0.82)';
                    spCtx.fillRect(px, py, w, h);
                    spCtx.strokeStyle = 'rgba(120, 53, 15, 0.55)';
                    spCtx.beginPath();
                    spCtx.moveTo(px + 1, py + h * 0.3);
                    spCtx.lineTo(px + w * 0.45, py + h * 0.62);
                    spCtx.lineTo(px + w - 1, py + h * 0.38);
                    spCtx.stroke();
                } else if (deadHash < 9) {
                    // Полудеградировавшая ячейка (потемнение)
                    spCtx.fillStyle = 'rgba(20, 12, 4, 0.45)';
                    spCtx.fillRect(px, py, w, h);
                }
            }
        }

        // Титановые токоведущие шины по краям крыла
        spCtx.fillStyle = '#78350f';
        spCtx.fillRect(0, 0, 6, spH);
        spCtx.fillRect(spW - 6, 0, 6, spH);
        spCtx.fillStyle = '#b45309';
        spCtx.fillRect(spW / 2 - 2.5, 0, 5, spH);

        // Лёгкая рамка панели: титановая окантовка по периметру крыла
        spCtx.strokeStyle = 'rgba(226, 232, 240, 0.26)';
        spCtx.lineWidth = 5;
        spCtx.strokeRect(2.5, 2.5, spW - 5, spH - 5);
        spCtx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        spCtx.lineWidth = 1.5;
        spCtx.strokeRect(7, 7, spW - 14, spH - 14);

        // 2. Текстура тепловых радиаторов охлаждения (TCS) — 2× разрешение
        const radW = 192;
        const radH = 384;
        this.radiatorTex = document.createElement('canvas');
        this.radiatorTex.width = radW;
        this.radiatorTex.height = radH;
        const radCtx = this.radiatorTex.getContext('2d');

        radCtx.fillStyle = '#e2e8f0';
        radCtx.fillRect(0, 0, radW, radH);

        radCtx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
        radCtx.lineWidth = 2.2;
        const radPanels = 12;
        const rph = radH / radPanels;
        for (let i = 0; i <= radPanels; i++) {
            const y = i * rph;
            radCtx.beginPath();
            radCtx.moveTo(0, y);
            radCtx.lineTo(radW, y);
            radCtx.stroke();

            if (i < radPanels) {
                const shadGrad = radCtx.createLinearGradient(0, y, 0, y + rph);
                shadGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                shadGrad.addColorStop(0.5, 'rgba(241, 245, 249, 0.2)');
                shadGrad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
                radCtx.fillStyle = shadGrad;
                radCtx.fillRect(0, y, radW, rph);
            }
        }

        // Продольные теплообменные трубки по длине радиатора: чётче (2×) с блик-жилой
        radCtx.strokeStyle = 'rgba(100, 116, 139, 0.60)';
        radCtx.lineWidth = 3.2;
        for (let tx = 16; tx < radW; tx += 26) {
            radCtx.beginPath();
            radCtx.moveTo(tx, 0);
            radCtx.lineTo(tx, radH);
            radCtx.stroke();
        }
        radCtx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        radCtx.lineWidth = 1.2;
        for (let tx = 16; tx < radW; tx += 26) {
            radCtx.beginPath();
            radCtx.moveTo(tx, 0);
            radCtx.lineTo(tx, radH);
            radCtx.stroke();
        }
        // Деликатный голубоватый отлив (отражение Земли на белых панелях)
        radCtx.fillStyle = 'rgba(191, 219, 254, 0.10)';
        radCtx.fillRect(0, 0, radW, radH);
        const radBlue = radCtx.createLinearGradient(0, 0, radW, 0);
        radBlue.addColorStop(0, 'rgba(147, 197, 253, 0.14)');
        radBlue.addColorStop(0.5, 'rgba(191, 219, 254, 0.02)');
        radBlue.addColorStop(1, 'rgba(147, 197, 253, 0.14)');
        radCtx.fillStyle = radBlue;
        radCtx.fillRect(0, 0, radW, radH);

        // 3. Текстура обшивки модулей — 2× разрешение + детерминированный микрошум
        const modW = 256;
        const modH = 256;
        this.moduleTex = document.createElement('canvas');
        this.moduleTex.width = modW;
        this.moduleTex.height = modH;
        const modCtx = this.moduleTex.getContext('2d');

        const modGrad = modCtx.createLinearGradient(0, 0, modW, 0);
        modGrad.addColorStop(0, '#64748b');
        modGrad.addColorStop(0.3, '#cbd5e1');
        modGrad.addColorStop(0.5, '#f8fafc');
        modGrad.addColorStop(0.8, '#94a3b8');
        modGrad.addColorStop(1, '#475569');
        modCtx.fillStyle = modGrad;
        modCtx.fillRect(0, 0, modW, modH);

        // Детерминированный микрошум (зерно металлизированной обшивки):
        // позиции и яркость точек — из хеша, без Math.random и дрожания по кадрам
        for (let n = 0; n < 1500; n++) {
            const nh = (n * 2654435761) % 4294967296;
            const nxp = nh % modW;
            const nyp = (Math.floor(nh / modW) * 7919) % modH;
            const bright = (n % 3) === 0;
            modCtx.fillStyle = bright
                ? `rgba(255, 255, 255, ${0.03 + (n % 5) * 0.012})`
                : `rgba(15, 23, 42, ${0.025 + (n % 4) * 0.011})`;
            modCtx.fillRect(nxp, nyp, 1.4, 1.4);
        }

        // Диагональная штриховка (brushed-metal) — едва заметная
        modCtx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
        modCtx.lineWidth = 1;
        for (let hx = -modH; hx < modW; hx += 10) {
            modCtx.beginPath();
            modCtx.moveTo(hx, 0);
            modCtx.lineTo(hx + modH, modH);
            modCtx.stroke();
        }

        // Стыки-панели обечайки с винтами по краям (детерминированно)
        modCtx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
        modCtx.lineWidth = 1.4;
        for (let x = 32; x < modW; x += 64) {
            modCtx.beginPath();
            modCtx.moveTo(x, 0);
            modCtx.lineTo(x, modH);
            modCtx.stroke();
        }
        for (let y = 32; y < modH; y += 64) {
            modCtx.beginPath();
            modCtx.moveTo(0, y);
            modCtx.lineTo(modW, y);
            modCtx.stroke();
        }
        // Винты: точки в пересечениях стыков и по краям панелей
        modCtx.fillStyle = 'rgba(30, 41, 59, 0.55)';
        for (let x = 32; x < modW; x += 64) {
            for (let y = 32; y < modH; y += 64) {
                modCtx.beginPath();
                modCtx.arc(x, y, 2, 0, Math.PI * 2);
                modCtx.fill();
                modCtx.beginPath();
                modCtx.arc(x + 32, y, 1.6, 0, Math.PI * 2);
                modCtx.fill();
                modCtx.beginPath();
                modCtx.arc(x, y + 32, 1.6, 0, Math.PI * 2);
                modCtx.fill();
            }
        }

        this.isTexturesReady = true;
    }

    /**
     * Внедрение аэрокосмических стилей для голографической панели МКС
     */
    injectStyles() {
        if (document.getElementById('iss-station-styles')) return;

        const style = document.createElement('style');
        style.id = 'iss-station-styles';
        style.textContent = `
            .iss-telemetry-hud {
                position: absolute;
                bottom: 84px;
                right: 32px;
                width: 390px;
                background: linear-gradient(135deg, rgba(6, 13, 27, 0.94) 0%, rgba(15, 23, 42, 0.96) 100%);
                border: 1px solid rgba(62, 230, 196, 0.45);
                box-shadow: 0 0 35px rgba(62, 230, 196, 0.18), inset 0 0 20px rgba(56, 189, 248, 0.08);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border-radius: 14px;
                color: #f1f5f9;
                font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
                padding: 18px 20px;
                z-index: 10000;
                transition: opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                opacity: 0;
                transform: translateY(18px) scale(0.96);
                pointer-events: none;
                user-select: none;
            }

            .iss-telemetry-hud.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }

            .iss-hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(62, 230, 196, 0.25);
                padding-bottom: 12px;
                margin-bottom: 14px;
            }

            .iss-hud-brand {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .iss-hud-status-dot {
                width: 10px;
                height: 10px;
                background: #3ee6c4;
                border-radius: 50%;
                box-shadow: 0 0 10px #3ee6c4;
                animation: iss-pulse 2s infinite;
            }

            @keyframes iss-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
            }

            .iss-hud-title {
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.12em;
                color: #3ee6c4;
                text-transform: uppercase;
            }

            .iss-hud-sub {
                font-size: 10px;
                color: #94a3b8;
                letter-spacing: 0.06em;
            }

            .iss-hud-close-btn {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: color 0.2s, background 0.2s;
            }

            .iss-hud-close-btn:hover {
                color: #f43f5e;
                background: rgba(244, 63, 94, 0.12);
            }

            .iss-hud-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 14px;
            }

            .iss-tele-tile {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(148, 163, 184, 0.14);
                border-radius: 8px;
                padding: 8px 10px;
            }

            .iss-tile-label {
                font-size: 9px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 3px;
            }

            .iss-tile-val {
                font-size: 13px;
                font-weight: 600;
                color: #e2e8f0;
            }

            .iss-tile-val.accent {
                color: #38bdf8;
            }

            .iss-tile-val.gold {
                color: #fbbf24;
            }

            .iss-tile-val.emerald {
                color: #34d399;
            }

            .iss-docked-list {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(148, 163, 184, 0.14);
                border-radius: 8px;
                padding: 8px 10px;
                margin-bottom: 14px;
            }

            .iss-dock-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11px;
                padding: 3px 0;
                border-bottom: 1px dashed rgba(148, 163, 184, 0.1);
            }
            .iss-dock-row:last-child {
                border-bottom: none;
            }

            .iss-dock-port {
                color: #94a3b8;
                font-size: 10px;
            }

            .iss-dock-craft {
                color: #f1f5f9;
                font-weight: 500;
            }

            .iss-dock-status {
                font-size: 9px;
                padding: 1px 6px;
                border-radius: 4px;
                background: rgba(52, 211, 153, 0.15);
                color: #34d399;
                border: 1px solid rgba(52, 211, 153, 0.3);
            }

            .iss-hud-actions {
                display: flex;
                gap: 8px;
            }

            .iss-hud-btn {
                flex: 1;
                background: rgba(62, 230, 196, 0.12);
                border: 1px solid rgba(62, 230, 196, 0.35);
                color: #3ee6c4;
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

            .iss-hud-btn:hover {
                background: rgba(62, 230, 196, 0.25);
                border-color: #3ee6c4;
                color: #ffffff;
                box-shadow: 0 0 14px rgba(62, 230, 196, 0.3);
            }

            .iss-hud-btn.sec {
                background: rgba(148, 163, 184, 0.1);
                border-color: rgba(148, 163, 184, 0.25);
                color: #cbd5e1;
            }

            .iss-hud-btn.sec:hover {
                background: rgba(148, 163, 184, 0.22);
                border-color: #94a3b8;
                color: #ffffff;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Создание интерактивной DOM-карточки телеметрии станции
     */
    buildTelemetryHud() {
        if (document.getElementById('iss-telemetry-hud')) {
            this.telemetryCardEl = document.getElementById('iss-telemetry-hud');
            return;
        }

        const card = document.createElement('div');
        card.id = 'iss-telemetry-hud';
        card.className = 'iss-telemetry-hud';
        card.innerHTML = `
            <div class="iss-hud-header">
                <div class="iss-hud-brand">
                    <div class="iss-hud-status-dot"></div>
                    <div>
                        <div class="iss-hud-title">МКС-71 // ISS-ALPHA</div>
                        <div class="iss-hud-sub">ОРБИТА ВОКРУГ ЗЕМЛИ • ЭКСПЕДИЦИЯ 71/72</div>
                    </div>
                </div>
                <button type="button" class="iss-hud-close-btn" id="iss-hud-close-btn" title="Закрыть HUD">
                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="iss-hud-grid">
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Высота над Землей</div>
                    <div class="iss-tile-val accent" id="iss-tele-alt">418.4 км</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Орбитальная скорость</div>
                    <div class="iss-tile-val accent" id="iss-tele-speed">7.66 км/с</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Период обращения</div>
                    <div class="iss-tile-val" id="iss-tele-period">92.8 мин</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Наклонение к экватору</div>
                            <div class="iss-tile-val" id="iss-tele-inc">150.0°</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">BGA Угол Солнца</div>
                    <div class="iss-tile-val gold" id="iss-tele-bga">+18.2°</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Мощность СБ (SAW)</div>
                    <div class="iss-tile-val emerald" id="iss-tele-pwr">119.4 кВт</div>
                </div>
            </div>

            <div class="iss-docked-list">
                <div class="iss-tile-label" style="margin-bottom:6px;">Пристыкованные корабли</div>
                <div class="iss-dock-row">
                    <div>
                        <span class="iss-dock-craft">Crew Dragon Freedom</span>
                        <div class="iss-dock-port">Шлюз IDA-2 / Harmony Fwd</div>
                    </div>
                    <span class="iss-dock-status">АКТИВЕН</span>
                </div>
                <div class="iss-dock-row">
                    <div>
                        <span class="iss-dock-craft">Союз МС-26</span>
                        <div class="iss-dock-port">МИМ-1 Рассвет (Nadir)</div>
                    </div>
                    <span class="iss-dock-status">ГОТОВНОСТЬ</span>
                </div>
                <div class="iss-dock-row">
                    <div>
                        <span class="iss-dock-craft">Прогресс МС-28</span>
                        <div class="iss-dock-port">СМ Звезда (Aft)</div>
                    </div>
                    <span class="iss-dock-status">ТОПЛИВО OK</span>
                </div>
            </div>

            <div class="iss-hud-actions">
                <button type="button" class="iss-hud-btn" id="iss-btn-focus" title="Навести камеру Space3D на МКС">
                    <span class="material-symbols-outlined" style="font-size:16px;">center_focus_strong</span>
                    <span>Камера на МКС</span>
                </button>
                <button type="button" class="iss-hud-btn sec" id="iss-btn-beep" title="Тестовый Quindar телеметрии">
                    <span class="material-symbols-outlined" style="font-size:16px;">graphic_eq</span>
                    <span>Квиндар-тон</span>
                </button>
            </div>
        `;

        const targetParent = this.viewport || document.body;
        targetParent.appendChild(card);
        this.telemetryCardEl = card;

        const closeBtn = card.querySelector('#iss-hud-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTelemetry();
            });
        }

        const focusBtn = card.querySelector('#iss-btn-focus');
        if (focusBtn) {
            focusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.focusCameraOnIss();
            });
        }

        const beepBtn = card.querySelector('#iss-btn-beep');
        if (beepBtn) {
            beepBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playQuindarTone(true);
            });
        }
    }

    /**
     * Настройка глобальных слушателей событий для Raycasting
     */
    setupEventListeners() {
        const vp = this.viewport || window;
        vp.addEventListener('pointermove', this.onPointerMove, { passive: true });
        vp.addEventListener('click', this.onClick);
    }

    /**
     * Скрытие наложений при выходе из 3D-режима (совместимо с Space3D)
     */
    hideOverlays() {
        this.closeTelemetry();
        if (this.viewport) this.viewport.style.cursor = '';
        this.isHovered = false;
        this.hoverTransition = 0;
    }

    /**
     * Обработка движения курсора (детектирование наведения на МКС)
     */
    onPointerMove(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        if (!this.isVisible || this.isOccluded) {
            if (this.isHovered) {
                this.isHovered = false;
                if (this.viewport) this.viewport.style.cursor = '';
            }
            return;
        }

        const dx = this.mousePos.x - this.screenX;
        const dy = this.mousePos.y - this.screenY;
        const dist = Math.hypot(dx, dy);

        const hitDist = Math.max(38, this.screenRadius * ISS_CONFIG.hitRadiusMultiplier);
        const wasHovered = this.isHovered;
        this.isHovered = dist <= hitDist;

        if (this.isHovered && !wasHovered) {
            if (this.viewport) this.viewport.style.cursor = 'pointer';
            this.playQuindarTone(false);
        } else if (!this.isHovered && wasHovered) {
            if (this.viewport) this.viewport.style.cursor = '';
        }
    }

    /**
     * Клик по МКС (открытие/переключение голографического HUD)
     */
    onClick(e) {
        if (e.target.closest('.iss-telemetry-hud') || e.target.closest('.space-3d-hud-dock') || e.target.closest('.space-3d-hud-top')) {
            return;
        }

        if (this.isHovered && this.isVisible && !this.isOccluded) {
            this.toggleTelemetry();
            e.stopPropagation();
        }
    }

    toggleTelemetry() {
        if (this.isTelemetryOpen) {
            this.closeTelemetry();
        } else {
            this.openTelemetry();
        }
    }

    openTelemetry() {
        this.isTelemetryOpen = true;
        if (this.telemetryCardEl) {
            this.telemetryCardEl.classList.add('active');
        }
        this.playQuindarTone(true);
        SpaceAudio.playVoice('focus');
    }

    closeTelemetry() {
        this.isTelemetryOpen = false;
        if (this.telemetryCardEl) {
            this.telemetryCardEl.classList.remove('active');
        }
    }

    /**
     * Плавное наведение камеры Space3D на станцию МКС на её орбите вокруг Земли
     */
    focusCameraOnIss() {
        if (!this.spaceEngine) {
            const found = window.__space3dEngine || (typeof Space3D !== 'undefined' ? Space3D : null);
            if (found) this.spaceEngine = found;
        }

        if (this.spaceEngine && this.distToCamera > 10) {
            // Вычисляем сферические углы Yaw и Pitch направления от камеры (0,0,0) на станцию
            const yawDeg = Math.atan2(this.worldPos.x, this.worldPos.z) * RAD_TO_DEG;
            const pitchDeg = Math.asin(this.worldPos.y / this.distToCamera) * RAD_TO_DEG;

            let targetYaw = yawDeg % 360;
            if (targetYaw > 180) targetYaw -= 360;
            if (targetYaw < -180) targetYaw += 360;

            this.spaceEngine.targetYaw = targetYaw;
            this.spaceEngine.targetPitch = Math.max(-65, Math.min(65, pitchDeg));
            this.spaceEngine.targetZoom = 1.35; // Кинематографичный обзор станции над Землей
            SpaceAudio.playVoice('focus');
            this.playQuindarTone(true);
        }
    }

    /**
     * Синтез легендарного космического Quindar-тона (NASA / ISS Comm Beep)
     */
    playQuindarTone(isIntro = true) {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    this.audioCtx = new AudioCtxClass();
                }
            }

            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(isIntro ? 2525 : 2475, this.audioCtx.currentTime);

            const now = this.audioCtx.currentTime;
            const dur = isIntro ? 0.20 : 0.12;

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + dur);
        } catch (e) {}
    }

    /**
     * Обновление физической орбиты МКС вокруг Земли (60-120 FPS)
     */
    update() {
        const now = performance.now();
        const dt = Math.min(0.1, (now - (this.lastTimeMs || now)) / 1000);
        this.lastTimeMs = now;
        this.time += dt;

        // 1. Орбитальное угловое движение вокруг Земли (360° за 225 сек)
        const omega = (2 * Math.PI) / ISS_CONFIG.orbitPeriodSec; // ~0.0279 рад/с
        this.orbitPhase = (this.orbitPhase + omega * dt) % (2 * Math.PI);

        // 1.5 Лёгкая прецессия восходящего узла (медленный синусоидальный дрейф RAAN
        // ±raanPrecessionAmpDeg за raanPrecessionPeriodSec): плоскость орбиты живёт,
        // картина пролётов не повторяется скучно. Базис пересчитывается за O(1).
        if (ISS_CONFIG.raanPrecessionAmpDeg) {
            const raanEff = ISS_CONFIG.raanDeg +
                ISS_CONFIG.raanPrecessionAmpDeg *
                Math.sin(2 * Math.PI * this.time / ISS_CONFIG.raanPrecessionPeriodSec);
            this.setOrbitalBasis(raanEff);
        }

        // 2. Положение МКС относительно центра Земли: r_rel = R * [cos(θ)*P_node + sin(θ)*Q_node]
        const cosTh = Math.cos(this.orbitPhase);
        const sinTh = Math.sin(this.orbitPhase);

        // Плавный переход радиуса орбиты (экспоненциальное сглаживание, tau ~ 0.4с):
        // если конфиг меняется на лету — станция дрейфует на новую орбиту без рывка
        const radiusLerp = Math.min(1.0, dt / 0.15);
        this.orbitRadiusCurrent += (ISS_CONFIG.orbitRadiusPx - this.orbitRadiusCurrent) * radiusLerp;
        const R_iss = this.orbitRadiusCurrent;

        this.relPos.x = R_iss * (cosTh * this.pNode.x + sinTh * this.qNode.x);
        this.relPos.y = R_iss * (cosTh * this.pNode.y + sinTh * this.qNode.y);
        this.relPos.z = R_iss * (cosTh * this.pNode.z + sinTh * this.qNode.z);

        // Абсолютное трехмерное мировое положение МКС
        this.worldPos.x = EARTH_CENTER.x + this.relPos.x;
        this.worldPos.y = EARTH_CENTER.y + this.relPos.y;
        this.worldPos.z = EARTH_CENTER.z + this.relPos.z;

        this.distToCamera = Math.hypot(this.worldPos.x, this.worldPos.y, this.worldPos.z) || 1;

        // 3. Проградный вектор касательной скорости (Forward = d(r_rel)/dt / |v|)
        this.forward.x = -sinTh * this.pNode.x + cosTh * this.qNode.x;
        this.forward.y = -sinTh * this.pNode.y + cosTh * this.qNode.y;
        this.forward.z = -sinTh * this.pNode.z + cosTh * this.qNode.z;
        const fLen = Math.hypot(this.forward.x, this.forward.y, this.forward.z) || 1;
        this.forward.x /= fLen;
        this.forward.y /= fLen;
        this.forward.z /= fLen;

        this.velocity.x = this.forward.x * (R_iss * omega);
        this.velocity.y = this.forward.y * (R_iss * omega);
        this.velocity.z = this.forward.z * (R_iss * omega);

        // 4. Радиальный вектор Зенита (направлен строго от Земли в космос)
        this.up.x = this.relPos.x / R_iss;
        this.up.y = this.relPos.y / R_iss;
        this.up.z = this.relPos.z / R_iss;

        // 5. Вектор фермы ITS (Starboard / Right) = Forward x Up
        this.right.x = this.forward.y * this.up.z - this.forward.z * this.up.y;
        this.right.y = this.forward.z * this.up.x - this.forward.x * this.up.z;
        this.right.z = this.forward.x * this.up.y - this.forward.y * this.up.x;
        const rLen = Math.hypot(this.right.x, this.right.y, this.right.z) || 1;
        this.right.x /= rLen;
        this.right.y /= rLen;
        this.right.z /= rLen;

        // 6. Трассировка лучей (Ray-Sphere Occlusion Test) относительно Земли
        // Луч от камеры (0,0,0) в направлении МКС
        const rayDir = {
            x: this.worldPos.x / this.distToCamera,
            y: this.worldPos.y / this.distToCamera,
            z: this.worldPos.z / this.distToCamera
        };

        // Проекция центра Земли на луч камеры к станции
        const tca = EARTH_CENTER.x * rayDir.x + EARTH_CENTER.y * rayDir.y + EARTH_CENTER.z * rayDir.z;
        const eDistSq = EARTH_CENTER.x * EARTH_CENTER.x + EARTH_CENTER.y * EARTH_CENTER.y + EARTH_CENTER.z * EARTH_CENTER.z;
        const dSq = eDistSq - tca * tca;
        const dPerp = Math.sqrt(Math.max(0, dSq));

        const eRad = EARTH_CONFIG.radius;        // 700 px — радиус видимого диска (GL-сфера)
        const atmoRad = EARTH_CONFIG.atmoRadius; // 717.5 px — внешний радиус атмосферного ореола (x1.025)

        // Поправка на размер станции: при крупном масштабе край фермы/крыльев
        // начинает уходить за диск раньше центра — расширяем fade-полосу лимба
        // на nadir-вынос станции (порядка 30 локальных единиц геометрии).
        const stationBodyRadius = 30 * ISS_CONFIG.stationScale; // ~129 px при 4.28
        const fadeStart = atmoRad + stationBodyRadius;          // начало затухания
        const fadeEnd = eRad - stationBodyRadius * 0.5;         // полное скрытие

        let targetVisibility = 1.0;
        if (this.distToCamera < tca) {
            // МКС находится ПЕРЕД Землей (между наблюдателем и планетой)
            this.isOccluded = false;
        } else {
            // МКС находится за плоскостью центра Земли
            if (dPerp <= fadeEnd) {
                // Полная окклюзия за твердым телом планеты Земля
                this.isOccluded = true;
                targetVisibility = 0.0;
            } else if (dPerp < fadeStart) {
                // Переходная область: прохождение сквозь светящийся лимб атмосферы.
                // Полоса расширена на радиус станции — силуэт гаснет целиком,
                // край фермы не «торчит» из диска при формально видимой видимости.
                this.isOccluded = false;
                const atmoFrac = (dPerp - fadeEnd) / (fadeStart - fadeEnd);
                targetVisibility = Math.max(0.05, Math.min(1.0, atmoFrac));
            } else {
                // На фоне открытого космоса рядом с планетой
                this.isOccluded = false;
            }
        }

        // Временное сглаживание видимости у лимба (~0.15с): силуэт мягко гаснет
        // при уходе за планету и мягко проявляется при выходе из-за диска
        const visLerp = Math.min(1.0, dt / 0.15);
        this.limbVisibility += (targetVisibility - this.limbVisibility) * visLerp;
        if (this.limbVisibility < 0.004) this.limbVisibility = 0;

        // 7. Проверка орбитального затмения (Eclipse) в тени Земли от Солнца
        const sProj = this.relPos.x * SUN_VECTOR.x + this.relPos.y * SUN_VECTOR.y + this.relPos.z * SUN_VECTOR.z;
        if (sProj < 0) {
            // Ночная сторона Земли относительно направления солнечных лучей
            const dShadowSq = (R_iss * R_iss) - (sProj * sProj);
            this.inEclipse = (Math.sqrt(Math.max(0, dShadowSq)) < eRad);
        } else {
            this.inEclipse = false;
        }

        // 8. Слежение солнечных батарей за Солнцем (BGA - Beta Gimbal Assembly)
        // Вращение батарей происходит вокруг оси фермы (this.right)
        const sDotF = SUN_VECTOR.x * this.forward.x + SUN_VECTOR.y * this.forward.y + SUN_VECTOR.z * this.forward.z;
        const sDotU = SUN_VECTOR.x * this.up.x + SUN_VECTOR.y * this.up.y + SUN_VECTOR.z * this.up.z;

        this.targetBeta = Math.atan2(sDotU, sDotF);

        let betaDiff = this.targetBeta - this.betaAngle;
        while (betaDiff > Math.PI) betaDiff -= Math.PI * 2;
        while (betaDiff < -Math.PI) betaDiff += Math.PI * 2;
        this.betaAngle += betaDiff * 0.04;

        if (this.inEclipse) {
            this.sunDotProduct = 0;
            this.powerOutputKW = 14.5; // Аварийное питание от буферных NiH2 аккумуляторов
        } else {
            const panelNormF = Math.cos(this.betaAngle);
            const panelNormU = Math.sin(this.betaAngle);
            const rawDot = sDotF * panelNormF + sDotU * panelNormU;
            this.sunDotProduct = Math.max(0, rawDot);
            this.powerOutputKW = 85.0 + this.sunDotProduct * 35.0; // 85 - 120 кВт
        }

        // 9. Навигационные стробоскопы
        this.strobeTimer += dt;
        this.strobePhase = (this.strobeTimer % 1.2) / 1.2;

        // 10. Плавная интерполяция наведения
        if (this.isHovered && !this.isOccluded) {
            this.hoverTransition = Math.min(1.0, this.hoverTransition + dt * 5.0);
            this.lockReticleAngle += dt * 1.8;
        } else {
            this.hoverTransition = Math.max(0.0, this.hoverTransition - dt * 4.0);
        }

        // 11. Обновление значений в телеметрии
        if (this.isTelemetryOpen && this.telemetryCardEl) {
            const bgaDeg = (this.betaAngle * RAD_TO_DEG).toFixed(1);
            const bgaEl = this.telemetryCardEl.querySelector('#iss-tele-bga');
            if (bgaEl) {
                bgaEl.textContent = this.inEclipse ? 'ЗАТМЕНИЕ [ТЕНЬ]' : `${bgaDeg >= 0 ? '+' : ''}${bgaDeg}° [BGA TRACK]`;
            }

            const pwrEl = this.telemetryCardEl.querySelector('#iss-tele-pwr');
            if (pwrEl) pwrEl.textContent = `${this.powerOutputKW.toFixed(1)} кВт`;

            const altEl = this.telemetryCardEl.querySelector('#iss-tele-alt');
            if (altEl) {
                const liveAlt = (ISS_CONFIG.realAltitudeKm + Math.sin(this.orbitPhase * 2) * 1.4).toFixed(1);
                altEl.textContent = `${liveAlt} км`;
            }
        }
    }

    /**
     * Отрисовка МКС на главном небесном холсте Space3D (ctx)
     */
    render(ctx, w, h, camYaw, camPitch, zoom) {
        if (!this.ctx && ctx) this.ctx = ctx;
        if (!ctx) return;

        // Автоматическое обновление орбиты перед кадром
        this.update();

        this.camYaw = camYaw;
        this.camPitch = camPitch;
        this.camZoom = zoom;

        const cx = w / 2;
        const cy = h / 2;
        const fov = 750 * zoom;

        // Матрица трансформации камеры Space3D
        const radCamYaw = camYaw * DEG_TO_RAD;
        const radCamPitch = camPitch * DEG_TO_RAD;

        const cosCY = Math.cos(radCamYaw);
        const sinCY = Math.sin(radCamYaw);
        const cosCP = Math.cos(radCamPitch);
        const sinCP = Math.sin(radCamPitch);

        // Трансформация положения центра станции в систему координат камеры
        const wx = this.worldPos.x;
        const wy = this.worldPos.y;
        const wz = this.worldPos.z;

        const x1 = wx * cosCY - wz * sinCY;
        const z1 = wx * sinCY + wz * cosCY;
        const y2 = wy * cosCP - z1 * sinCP;
        const z2 = wy * sinCP + z1 * cosCP;

        // Отсечение за спиной камеры
        if (z2 <= 0.1) {
            this.isVisible = false;
            return;
        }

        // Орбитальная трасса МКС: пунктирная дуга орбиты («живая карта»).
        // Рисуется до проверки окклюзии корпуса: сегменты за диском Земли
        // гаснут той же ray-sphere окклюзией, у атмосферного лимба — затухание.
        this.drawOrbitTrace(ctx, cosCY, sinCY, cosCP, sinCP, fov, cx, cy);

        // Корпус станции полностью скрыт глобусом (с учётом 0.15с fade у лимба)
        if (this.limbVisibility <= 0.02) {
            this.isVisible = false;
            return;
        }

        // Проекция центра станции на экран
        const px = cx + (x1 / z2) * fov;
        const py = cy - (y2 / z2) * fov;

        this.screenX = px;
        this.screenY = py;

        // Динамический масштаб геометрии: станция крупнее при сближении и компактнее вдали
        const baseScale = (fov / z2) * ISS_CONFIG.stationScale;
        this.screenScale = baseScale;
        this.screenRadius = 135 * baseScale;

        // LOD: 0 — крупный план (все детали), 1 — средний (без мелкого декора),
        // 2 — дистанция (только силуэтные формы, как в satellites_swarm.js)
        this.lodLevel = baseScale > 1.05 ? 0 : (baseScale > 0.5 ? 1 : 2);

        // Проверка выхода за экран
        const margin = this.screenRadius * 2;
        if (px < -margin || px > w + margin || py < -margin || py > h + margin) {
            this.isVisible = false;
            return;
        }

        this.isVisible = true;

        // Трансформация базисных векторов станции (Forward, Up, Right) в пространство камеры
        const transformDirToCam = (v) => {
            const tx1 = v.x * cosCY - v.z * sinCY;
            const tz1 = v.x * sinCY + v.z * cosCY;
            const ty2 = v.y * cosCP - tz1 * sinCP;
            const tz2 = v.y * sinCP + tz1 * cosCP;
            return { x: tx1, y: ty2, z: tz2 };
        };

        const camFwd = transformDirToCam(this.forward);
        const camUp = transformDirToCam(this.up);
        const camRight = transformDirToCam(this.right);
        const camSun = transformDirToCam(SUN_VECTOR);

        // Проекция локальной точки станции (lx=Forward, ly=Up, lz=Starboard) в экран
        const projectLocalPoint = (lx, ly, lz) => {
            const pCamX = x1 + lx * camFwd.x + ly * camUp.x + lz * camRight.x;
            const pCamY = y2 + lx * camFwd.y + ly * camUp.y + lz * camRight.y;
            const pCamZ = z2 + lx * camFwd.z + ly * camUp.z + lz * camRight.z;

            if (pCamZ <= 0.05) return null;
            return {
                x: cx + (pCamX / pCamZ) * fov,
                y: cy - (pCamY / pCamZ) * fov,
                z: pCamZ
            };
        };

        // Вектор поперечного разворота солнечных батарей BGA
        const bgaCos = Math.cos(this.betaAngle);
        const bgaSin = Math.sin(this.betaAngle);
        const panelNormL = { x: bgaCos, y: bgaSin, z: 0 };
        const panelSpanL = { x: -bgaSin, y: bgaCos, z: 0 };

        this.renderQueue.length = 0;

        // ====================================================================
        // ПОСТРОЕНИЕ И СОРТИРОВКА ДЕТАЛЕЙ СТАНЦИИ
        // ====================================================================

        // 1. Интегрированная ферма ITS (S0, S1-S6, P1-P6)
        this.queueTrussStructure(projectLocalPoint, camSun, x1, y2, z2, camRight);

        // 2. 8 Солнечных батарей (SAW) с BGA-вращением
        this.queueSolarPanels(projectLocalPoint, camSun, panelNormL, panelSpanL, camFwd, camUp);

        // 3. 3 Тепловых радиатора охлаждения (TCS)
        this.queueRadiators(projectLocalPoint, camSun);

        // 4. Герметичные модули (Заря, Звезда, Destiny, Columbus, Kibo, Cupola)
        this.queueModules(projectLocalPoint, camSun);

        // 5. Пристыкованные корабли Crew Dragon и Союз МС
        this.queueVisitingVehicles(projectLocalPoint, camSun);

        // 6. Роботизированная рука-манипулятор Canadarm2
        this.queueCanadarm2(projectLocalPoint, camSun);

        // Глубинная сортировка по Z (Painter's Algorithm)
        this.renderQueue.sort((a, b) => b.depth - a.depth);

        // Применение атмосферного затухания в лимбе Земли
        ctx.save();
        if (this.limbVisibility < 0.98) {
            ctx.globalAlpha = this.limbVisibility;
        }

        // Отрисовка геометрии
        const queueLen = this.renderQueue.length;
        for (let i = 0; i < queueLen; i++) {
            this.renderQueue[i].render(ctx);
        }

        // 7. Навигационные стробоскопы
        this.renderNavigationBeacons(ctx, projectLocalPoint);

        // 7.1 Деликатный specular-glint при развороте панелей к Солнцу/камере
        this.renderSolarSpecularGlint(ctx, projectLocalPoint);

        ctx.restore();

        // 8. Интерактивный голографический прицел
        this.renderHolographicReticle(ctx, px, py);
    }

    /**
     * Орбитальная трасса МКС: тонкая пунктирная дуга эллипса орбиты (alpha ~0.10) —
     * эффект «живой карты». Сегменты за диском Земли скрываются той же
     * ray-sphere окклюзией, что и корпус; у атмосферного лимба — плавное затухание.
     * Сегменты батчатся в непрерывные пути (1-3 stroke на кадр) — без просадки FPS.
     */
    drawOrbitTrace(ctx, cosCY, sinCY, cosCP, sinCP, fov, cx, cy) {
        const segments = 96;
        const twoPi = Math.PI * 2;
        const R = this.orbitRadiusCurrent;
        const eRad = EARTH_CONFIG.radius;
        const atmoRad = EARTH_CONFIG.atmoRadius;
        const eDistSq = EARTH_CENTER.x * EARTH_CENTER.x + EARTH_CENTER.y * EARTH_CENTER.y + EARTH_CENTER.z * EARTH_CENTER.z;

        // Видимость каждой точки трассы: 1 — открыто, 0 — за диском,
        // (0..1) — полоса атмосферного лимба
        const pts = [];
        for (let s = 0; s <= segments; s++) {
            const th = (s % segments) * (twoPi / segments);
            const cTh = Math.cos(th);
            const sTh = Math.sin(th);

            const wx = EARTH_CENTER.x + R * (cTh * this.pNode.x + sTh * this.qNode.x);
            const wy = EARTH_CENTER.y + R * (cTh * this.pNode.y + sTh * this.qNode.y);
            const wz = EARTH_CENTER.z + R * (cTh * this.pNode.z + sTh * this.qNode.z);

            const x1 = wx * cosCY - wz * sinCY;
            const z1 = wx * sinCY + wz * cosCY;
            const y2 = wy * cosCP - z1 * sinCP;
            const z2 = wy * sinCP + z1 * cosCP;

            if (z2 <= 0.1) {
                pts.push(null);
                continue;
            }

            const d = Math.hypot(wx, wy, wz) || 1;
            const tca = (EARTH_CENTER.x * wx + EARTH_CENTER.y * wy + EARTH_CENTER.z * wz) / d;
            const dPerp = Math.sqrt(Math.max(0, eDistSq - tca * tca));

            let vis;
            if (d < tca || dPerp >= atmoRad) {
                vis = 1;                                   // перед планетой / открытый космос
            } else if (dPerp > eRad) {
                vis = (dPerp - eRad) / (atmoRad - eRad);   // лимб: плавное затухание
            } else {
                vis = 0;                                   // за твердым диском
            }

            pts.push({ x: cx + (x1 / z2) * fov, y: cy - (y2 / z2) * fov, vis });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 9]);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.10)';

        // Батчинг: непрерывные участки с vis >= 1 — одним путём;
        // лимбовые участки (0 < vis < 1) — отдельными путями с затуханием
        let run = false;
        for (let s = 0; s <= segments; s++) {
            const p = pts[s];
            if (p && p.vis >= 1) {
                if (!run) { ctx.beginPath(); ctx.moveTo(p.x, p.y); run = true; }
                else ctx.lineTo(p.x, p.y);
            } else {
                if (run) { ctx.stroke(); run = false; }
                if (p && p.vis > 0) {
                    ctx.globalAlpha = p.vis;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    const q = pts[s + 1];
                    if (q && q.vis > 0) ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
        if (run) ctx.stroke();

        ctx.restore();
    }

    /**
     * Построение 3D-фермы Integrated Truss Structure (ITS)
     */
    queueTrussStructure(project, camSun, centerX, centerY, centerZ, camRight) {
        const halfSpan = 135;
        const trussRadius = 2.8;

        const segments = [
            { name: 'P6_tip', z1: -135, z2: -105, color: '#94a3b8' },
            { name: 'P4_sarj', z1: -105, z2: -65, color: '#cbd5e1' },
            { name: 'P1_truss', z1: -65, z2: -18, color: '#e2e8f0' },
            { name: 'S0_center', z1: -18, z2: 18, color: '#f8fafc' },
            { name: 'S1_truss', z1: 18, z2: 65, color: '#e2e8f0' },
            { name: 'S4_sarj', z1: 65, z2: 105, color: '#cbd5e1' },
            { name: 'S6_tip', z1: 105, z2: 135, color: '#94a3b8' }
        ];

        const fine = this.lodLevel <= 1;

        for (const seg of segments) {
            const pStart = project(0, 0, seg.z1);
            const pEnd = project(0, 0, seg.z2);
            if (!pStart || !pEnd) continue;

            const midZ = (pStart.z + pEnd.z) * 0.5;

            this.renderQueue.push({
                depth: midZ,
                render: (ctx) => {
                    const grad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
                    grad.addColorStop(0, '#64748b');
                    grad.addColorStop(0.5, seg.color);
                    grad.addColorStop(1, '#64748b');

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = Math.max(1.8, trussRadius * 2 * this.screenScale);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(pStart.x, pStart.y);
                    ctx.lineTo(pEnd.x, pEnd.y);
                    ctx.stroke();

                    if (fine) {
                        // Продольные стрингеры: 4 угловые балки — объём фермы
                        const stringers = [
                            { y: trussRadius, z: trussRadius },
                            { y: -trussRadius, z: trussRadius },
                            { y: trussRadius, z: -trussRadius },
                            { y: -trussRadius, z: -trussRadius }
                        ];
                        ctx.lineWidth = Math.max(0.55, 0.9 * this.screenScale);
                        for (const st of stringers) {
                            const a = project(st.y, st.z * 0.02, seg.z1);
                            const b = project(st.y, st.z, seg.z2);
                            if (!a || !b) continue;
                            // Освещённая сторона — светлее, теневая — темнее
                            const lit = (st.y > 0) === (camSun ? camSun.y > 0 : true);
                            ctx.strokeStyle = lit ? 'rgba(226, 232, 240, 0.75)' : 'rgba(51, 65, 85, 0.75)';
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            ctx.stroke();
                        }

                        // Кабель-трассы вдоль фермы: две тонкие тёмные линии поверх стрингеров
                        ctx.lineWidth = Math.max(0.45, 0.55 * this.screenScale);
                        for (const cTray of [
                            { y: trussRadius * 0.82, dy: 0.35 },
                            { y: -trussRadius * 0.82, dy: -0.35 }
                        ]) {
                            const cA = project(cTray.y, cTray.dy * trussRadius * 0.02, seg.z1);
                            const cB = project(cTray.y, cTray.dy, seg.z2);
                            if (cA && cB) {
                                ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
                                ctx.beginPath();
                                ctx.moveTo(cA.x, cA.y);
                                ctx.lineTo(cB.x, cB.y);
                                ctx.stroke();
                            }
                        }

                        // Поперечные крепления (прогон-«перекладины» лестницы)
                        const steps = 4;
                        const dz = (seg.z2 - seg.z1) / steps;
                        ctx.lineWidth = Math.max(0.5, 0.7 * this.screenScale);
                        for (let s = 0; s <= steps; s++) {
                            const zR = seg.z1 + s * dz;
                            const qA = project(trussRadius, 0, zR);
                            const qB = project(-trussRadius, 0, zR);
                            if (qA && qB) {
                                ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
                                ctx.beginPath();
                                ctx.moveTo(qA.x, qA.y);
                                ctx.lineTo(qB.x, qB.y);
                                ctx.stroke();
                            }
                        }

                        // Треугольные X-ферменные раскосы (обе диагонали)
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                        ctx.lineWidth = Math.max(0.7, 0.8 * this.screenScale);
                        for (let s = 0; s < steps; s++) {
                            const zA = seg.z1 + s * dz;
                            const zB = seg.z1 + (s + 1) * dz;
                            const ptA = project(trussRadius, trussRadius, zA);
                            const ptB = project(-trussRadius, -trussRadius, zB);
                            if (ptA && ptB) {
                                ctx.beginPath();
                                ctx.moveTo(ptA.x, ptA.y);
                                ctx.lineTo(ptB.x, ptB.y);
                                ctx.stroke();
                            }
                            const ptC = project(-trussRadius, trussRadius, zA);
                            const ptD = project(trussRadius, -trussRadius, zB);
                            if (ptC && ptD) {
                                ctx.beginPath();
                                ctx.moveTo(ptC.x, ptC.y);
                                ctx.lineTo(ptD.x, ptD.y);
                                ctx.stroke();
                            }
                        }

                        // Блоки оборудования на ферме: детерминированные боксы в узлах
                        const segHash = Math.abs(seg.z1) * 7 + Math.abs(seg.z2) * 3;
                        const boxSteps = 4;
                        const boxDz = (seg.z2 - seg.z1) / boxSteps;
                        for (let s = 0; s < boxSteps; s++) {
                            if ((Math.floor(segHash) + s * 31) % 3 !== 0) continue;
                            const zR = seg.z1 + (s + 0.5) * boxDz;
                            const side = (s % 2 === 0) ? 1 : -1;
                            const bp = project(side * trussRadius * 0.5, trussRadius * 1.05, zR);
                            if (!bp) continue;
                            const bw = Math.max(1.2, 2.2 * this.screenScale);
                            const bh = Math.max(0.8, 1.4 * this.screenScale);
                            // Корпус блока: тёмный металл + светлый верх (sun-side edge)
                            ctx.fillStyle = '#3f4a5c';
                            ctx.fillRect(bp.x - bw * 0.5, bp.y - bh * 0.5, bw, bh);
                            ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
                            ctx.fillRect(bp.x - bw * 0.5, bp.y - bh * 0.5, bw, Math.max(0.4, bh * 0.28));
                            ctx.strokeStyle = 'rgba(10, 16, 30, 0.5)';
                            ctx.lineWidth = Math.max(0.4, 0.5 * this.screenScale);
                            ctx.strokeRect(bp.x - bw * 0.5, bp.y - bh * 0.5, bw, bh);
                        }
                    }

                    // Солнечный терминатор: световая кромка со стороны Солнца сцены
                    if (camSun && (Math.abs(camSun.x) + Math.abs(camSun.y)) > 0.05) {
                        const sunLen = Math.hypot(camSun.x, camSun.y) || 1;
                        const off = ctx.lineWidth;
                        ctx.strokeStyle = 'rgba(255, 252, 240, 0.55)';
                        ctx.lineWidth = Math.max(0.8, off * 0.28);
                        ctx.beginPath();
                        ctx.moveTo(pStart.x + (camSun.x / sunLen) * off, pStart.y - (camSun.y / sunLen) * off);
                        ctx.lineTo(pEnd.x + (camSun.x / sunLen) * off, pEnd.y - (camSun.y / sunLen) * off);
                        ctx.stroke();
                    }

                    // Поворотные шарниры SARJ
                    if (seg.name.includes('sarj')) {
                        const sarjZ = (seg.z1 + seg.z2) * 0.5;
                        const ptSarj = project(0, 0, sarjZ);
                        if (ptSarj) {
                            const sarjR = Math.max(2, 4.2 * this.screenScale);
                            const sarjGrad = ctx.createRadialGradient(
                                ptSarj.x - sarjR * 0.3, ptSarj.y - sarjR * 0.3, sarjR * 0.1,
                                ptSarj.x, ptSarj.y, sarjR
                            );
                            sarjGrad.addColorStop(0, '#fde68a');
                            sarjGrad.addColorStop(0.5, '#f59e0b');
                            sarjGrad.addColorStop(1, '#78350f');
                            ctx.fillStyle = sarjGrad;
                            ctx.beginPath();
                            ctx.arc(ptSarj.x, ptSarj.y, sarjR, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            });
        }

        if (fine) {
            // BGA gimbal-цилиндры в узлах крепления панелей (S4/S6, P4/P6)
            const bgaAnchors = [-122, -82, 82, 122];
            for (const gz of bgaAnchors) {
                const gp = project(0, 0, gz);
                if (!gp) continue;
                this.renderQueue.push({
                    depth: gp.z + 0.01,
                    render: (ctx) => {
                        const gr = Math.max(1.6, 3.0 * this.screenScale);
                        const cyl = ctx.createLinearGradient(gp.x - gr, gp.y - gr, gp.x + gr, gp.y + gr);
                        cyl.addColorStop(0, '#cbd5e1');
                        cyl.addColorStop(0.5, '#f1f5f9');
                        cyl.addColorStop(1, '#475569');
                        ctx.fillStyle = cyl;
                        ctx.beginPath();
                        ctx.arc(gp.x, gp.y, gr, 0, Math.PI * 2);
                        ctx.fill();
                        // Тёмный стык (ambient occlusion) вокруг гимбала
                        ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
                        ctx.lineWidth = Math.max(0.5, 0.7 * this.screenScale);
                        ctx.stroke();
                    }
                });
            }

            // Стыковочные ободы на законцовках фермы (P6/S6)
            for (const tipZ of [-135, 135]) {
                const tp = project(0, 0, tipZ);
                if (!tp) continue;
                this.renderQueue.push({
                    depth: tp.z,
                    render: (ctx) => {
                        const tr2 = Math.max(1.4, 2.6 * this.screenScale);
                        ctx.strokeStyle = '#f8fafc';
                        ctx.lineWidth = Math.max(0.7, 1.0 * this.screenScale);
                        ctx.beginPath();
                        ctx.arc(tp.x, tp.y, tr2, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
                        ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                        ctx.beginPath();
                        ctx.arc(tp.x, tp.y, tr2 * 0.55, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                });
            }
        }
    }

    /**
     * Построение 8 Солнечных батарей (Solar Array Wings) с BGA-слежением
     */
    queueSolarPanels(project, camSun, panelNormL, panelSpanL, camFwd, camUp) {
        const wingLength = 58;
        const wingWidth = 18;
        const mastGap = 3.5;

        const wings = [
            { id: 'S6_fwd', zAnchor: 122, dir: 1 },
            { id: 'S6_aft', zAnchor: 122, dir: -1 },
            { id: 'S4_fwd', zAnchor: 82, dir: 1 },
            { id: 'S4_aft', zAnchor: 82, dir: -1 },
            { id: 'P4_fwd', zAnchor: -82, dir: 1 },
            { id: 'P4_aft', zAnchor: -82, dir: -1 },
            { id: 'P6_fwd', zAnchor: -122, dir: 1 },
            { id: 'P6_aft', zAnchor: -122, dir: -1 }
        ];

        for (const w of wings) {
            const zCenter = w.zAnchor;
            const halfW = wingWidth * 0.5;
            const dir = w.dir;

            const startDist = mastGap;
            const endDist = mastGap + wingLength;

            const c1 = {
                x: panelSpanL.x * startDist * dir,
                y: panelSpanL.y * startDist * dir,
                z: zCenter - halfW
            };
            const c2 = {
                x: panelSpanL.x * startDist * dir,
                y: panelSpanL.y * startDist * dir,
                z: zCenter + halfW
            };
            const c3 = {
                x: panelSpanL.x * endDist * dir,
                y: panelSpanL.y * endDist * dir,
                z: zCenter + halfW
            };
            const c4 = {
                x: panelSpanL.x * endDist * dir,
                y: panelSpanL.y * endDist * dir,
                z: zCenter - halfW
            };

            const pt1 = project(c1.x, c1.y, c1.z);
            const pt2 = project(c2.x, c2.y, c2.z);
            const pt3 = project(c3.x, c3.y, c3.z);
            const pt4 = project(c4.x, c4.y, c4.z);

            if (!pt1 || !pt2 || !pt3 || !pt4) continue;

            const avgDepth = (pt1.z + pt2.z + pt3.z + pt4.z) * 0.25;

            // Нормаль панели в системе камеры: panelNormL живёт в базисе (Forward, Up)
            const nrm = camFwd && camUp ? {
                x: camFwd.x * panelNormL.x + camUp.x * panelNormL.y,
                y: camFwd.y * panelNormL.x + camUp.y * panelNormL.y,
                z: camFwd.z * panelNormL.x + camUp.z * panelNormL.y
            } : { x: 0, y: 0, z: -1 };
            // nrm.z > 0 — камера видит тыльную (графитовую) сторону крыла
            const isBackside = nrm.z > 0;
            const litDot = camSun ? (nrm.x * camSun.x + nrm.y * camSun.y + nrm.z * camSun.z) : 1;
            const isLit = !this.inEclipse && litDot > 0.05;

            this.renderQueue.push({
                depth: avgDepth,
                render: (ctx) => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(pt1.x, pt1.y);
                    ctx.lineTo(pt2.x, pt2.y);
                    ctx.lineTo(pt3.x, pt3.y);
                    ctx.lineTo(pt4.x, pt4.y);
                    ctx.closePath();

                    const isSunFacing = isLit && !isBackside && this.sunDotProduct > 0.15;
                    const baseAlpha = 0.92;

                    if (isBackside) {
                        // Тыльная сторона: серо-графитовое покрытие с гофром
                        const backGrad = ctx.createLinearGradient(pt1.x, pt1.y, pt3.x, pt3.y);
                        backGrad.addColorStop(0, '#3f4652');
                        backGrad.addColorStop(0.45, '#565f6d');
                        backGrad.addColorStop(0.75, '#454d59');
                        backGrad.addColorStop(1, '#333a45');
                        ctx.fillStyle = backGrad;
                        ctx.globalAlpha = baseAlpha;
                        ctx.fill();
                    } else if (this.isTexturesReady && this.solarPanelTex) {
                        // Паттерн кэшируется: createPattern на каждый кадр для 8 крыльев
                        // давал ~480 аллокаций в секунду и заметные просадки FPS.
                        if (!this._solarPattern) {
                            this._solarPattern = ctx.createPattern(this.solarPanelTex, 'repeat');
                        }
                        ctx.fillStyle = this._solarPattern;
                        ctx.globalAlpha = baseAlpha;
                        ctx.fill();
                    } else {
                        ctx.fillStyle = isSunFacing ? '#4a2c0a' : '#29211a';
                        ctx.fill();
                    }

                    if (isBackside) {
                        // Гофр тыльной стороны: полосы вдоль мачты
                        ctx.save();
                        ctx.clip();
                        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
                        ctx.lineWidth = Math.max(0.5, 0.8 * this.screenScale);
                        const ribSteps = 7;
                        for (let r = 1; r < ribSteps; r++) {
                            const t = r / ribSteps;
                            const rX1 = pt1.x + (pt4.x - pt1.x) * t;
                            const rY1 = pt1.y + (pt4.y - pt1.y) * t;
                            const rX2 = pt2.x + (pt3.x - pt2.x) * t;
                            const rY2 = pt2.y + (pt3.y - pt2.y) * t;
                            ctx.beginPath();
                            ctx.moveTo(rX1, rY1);
                            ctx.lineTo(rX2, rY2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }

                    if (isSunFacing) {
                        // Солнечный терминатор: блик по вектору Солнца в экранных координатах
                        const sunGlint = ctx.createLinearGradient(pt1.x, pt1.y, pt3.x, pt3.y);
                        sunGlint.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
                        sunGlint.addColorStop(0.5, 'rgba(251, 191, 36, 0.5)');
                        sunGlint.addColorStop(1, 'rgba(217, 119, 6, 0.16)');
                        ctx.fillStyle = sunGlint;
                        ctx.globalAlpha = 0.65;
                        ctx.fill();

                        // Деликатный specular-glint: полоса вдоль направления Солнца на экране
                        const glintAxisX = camSun.x * wingLength * this.screenScale * 0.5;
                        const glintAxisY = camSun.y * wingLength * this.screenScale * 0.5;
                        const midX = (pt1.x + pt3.x) * 0.5;
                        const midY = (pt1.y + pt3.y) * 0.5;
                        const glintGrad = ctx.createLinearGradient(
                            midX - glintAxisX * 0.4, midY - glintAxisY * 0.4,
                            midX + glintAxisX * 0.4, midY + glintAxisY * 0.4
                        );
                        glintGrad.addColorStop(0, 'rgba(255, 255, 240, 0)');
                        glintGrad.addColorStop(0.5, `rgba(255, 253, 235, ${0.18 + this.sunDotProduct * 0.22})`);
                        glintGrad.addColorStop(1, 'rgba(255, 255, 240, 0)');
                        ctx.fillStyle = glintGrad;
                        ctx.globalAlpha = 0.8;
                        ctx.fill();
                    }

                    ctx.strokeStyle = isSunFacing ? 'rgba(217, 119, 6, 0.9)' : 'rgba(100, 116, 139, 0.6)';
                    ctx.lineWidth = Math.max(0.8, 1.2 * this.screenScale);
                    ctx.stroke();

                    const mastPt1 = project(c1.x, c1.y, zCenter);
                    const mastPt2 = project(c3.x, c3.y, zCenter);
                    if (mastPt1 && mastPt2) {
                        ctx.strokeStyle = '#e2e8f0';
                        ctx.lineWidth = Math.max(1.0, 1.5 * this.screenScale);
                        ctx.beginPath();
                        ctx.moveTo(mastPt1.x, mastPt1.y);
                        ctx.lineTo(mastPt2.x, mastPt2.y);
                        ctx.stroke();
                    }

                    ctx.restore();
                }
            });
        }
    }

    /**
     * Построение 3 тепловых радиаторов охлаждения (TCS Radiators)
     */
    queueRadiators(project, camSun) {
        const radiators = [
            { id: 'P1_radiator', z: -35, length: 34, width: 22 },
            { id: 'S1_radiator', z: 35, length: 34, width: 22 },
            { id: 'Center_PVR', z: 0, length: 24, width: 14 }
        ];

        for (const rad of radiators) {
            const lx1 = -8;
            const lx2 = -(8 + rad.length);
            const ly = 3.5;
            const halfW = rad.width * 0.5;

            const p1 = project(lx1, ly, rad.z - halfW);
            const p2 = project(lx1, ly, rad.z + halfW);
            const p3 = project(lx2, ly - 4, rad.z + halfW);
            const p4 = project(lx2, ly - 4, rad.z - halfW);

            if (!p1 || !p2 || !p3 || !p4) continue;

            const midZ = (p1.z + p2.z + p3.z + p4.z) * 0.25;

            this.renderQueue.push({
                depth: midZ,
                render: (ctx) => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.lineTo(p4.x, p4.y);
                    ctx.closePath();

                    if (this.isTexturesReady && this.radiatorTex) {
                        if (!this._radiatorPattern) {
                            this._radiatorPattern = ctx.createPattern(this.radiatorTex, 'repeat');
                        }
                        ctx.fillStyle = this._radiatorPattern;
                    } else {
                        ctx.fillStyle = '#f1f5f9';
                    }
                    ctx.fill();

                    // Солнечный шейдинг: освещённый край + голубой земляной отсвет снизу
                    if (camSun && (Math.abs(camSun.x) + Math.abs(camSun.y)) > 0.05) {
                        const cxm = (p1.x + p3.x) * 0.5;
                        const cym = (p1.y + p3.y) * 0.5;
                        const sunLen = Math.hypot(camSun.x, camSun.y) || 1;
                        const shadeGrad = ctx.createLinearGradient(
                            cxm - (camSun.x / sunLen) * 18, cym + (camSun.y / sunLen) * 18,
                            cxm + (camSun.x / sunLen) * 18, cym - (camSun.y / sunLen) * 18
                        );
                        shadeGrad.addColorStop(0, 'rgba(255, 255, 250, 0.22)');
                        shadeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
                        shadeGrad.addColorStop(1, 'rgba(96, 130, 180, 0.20)');
                        ctx.fillStyle = shadeGrad;
                        ctx.fill();
                    }

                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = Math.max(0.6, 1.0 * this.screenScale);
                    ctx.stroke();

                    const panels = 3;
                    for (let i = 1; i < panels; i++) {
                        const t = i / panels;
                        const sX = p1.x + (p4.x - p1.x) * t;
                        const sY = p1.y + (p4.y - p1.y) * t;
                        const eX = p2.x + (p3.x - p2.x) * t;
                        const eY = p2.y + (p3.y - p2.y) * t;
                        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
                        ctx.beginPath();
                        ctx.moveTo(sX, sY);
                        ctx.lineTo(eX, eY);
                        ctx.stroke();
                    }

                    ctx.restore();
                }
            });
        }
    }

    /**
     * Построение герметичных модулей станции
     */
    queueModules(project, camSun) {
        const modules = [
            // РОССИЙСКИЙ СЕГМЕНТ (Корма)
            {
                name: 'Zvezda',
                label: 'СМ «Звезда»',
                x1: -64, x2: -36, radius: 4.8,
                color: '#cbd5e1', hasSolar: true
            },
            {
                name: 'Zarya',
                label: 'ФГБ «Заря»',
                x1: -36, x2: -10, radius: 4.5,
                color: '#e2e8f0', hasGoldMLI: true
            },

            // АМЕРИКАНСКИЙ СЕГМЕНТ (Носовая часть)
            {
                name: 'Unity_Node1',
                label: 'Node 1 «Unity»',
                x1: -10, x2: 4, radius: 4.8,
                color: '#94a3b8'
            },
            {
                name: 'Quest_Airlock',
                label: 'Шлюз «Quest»',
                x1: -2, x2: 6, radius: 3.5,
                offsetZ: 8.5, color: '#e2e8f0'
            },
            {
                name: 'Tranquility_Node3',
                label: 'Node 3 «Tranquility»',
                x1: -2, x2: 6, radius: 4.6,
                offsetZ: -8.5, color: '#cbd5e1'
            },
            {
                name: 'Cupola',
                label: 'Купол «Cupola» (Nadir)',
                x1: 0, x2: 5, radius: 3.6,
                offsetY: -6.5, offsetZ: -8.5, isCupola: true
            },
            {
                name: 'Destiny_Lab',
                label: 'Лаборатория «Destiny»',
                x1: 4, x2: 32, radius: 4.9,
                color: '#f8fafc', isDestiny: true
            },
            {
                name: 'Harmony_Node2',
                label: 'Node 2 «Harmony»',
                x1: 32, x2: 44, radius: 4.8,
                color: '#94a3b8'
            },
            {
                name: 'Columbus_ESA',
                label: 'ЕКА «Columbus»',
                x1: 34, x2: 43, radius: 4.5,
                offsetZ: 11.5, color: '#f1f5f9', isColumbus: true
            },
            {
                name: 'Kibo_JAXA',
                label: 'JAXA «Kibo»',
                x1: 33, x2: 45, radius: 4.9,
                offsetZ: -12.5, color: '#e2e8f0', isKibo: true
            }
        ];

        for (const mod of modules) {
            const offY = mod.offsetY || 0;
            const offZ = mod.offsetZ || 0;

            const p1 = project(mod.x1, offY, offZ);
            const p2 = project(mod.x2, offY, offZ);
            if (!p1 || !p2) continue;

            const midZ = (p1.z + p2.z) * 0.5;

            this.renderQueue.push({
                depth: midZ,
                render: (ctx) => {
                    const screenR = Math.max(2.2, mod.radius * this.screenScale);
                    const fineMod = this.lodLevel <= 1 && screenR > 4.5;

                    // Цилиндрический шейдинг: градиент по нормали, развёрнутый к Солнцу сцены
                    const axX = p2.x - p1.x;
                    const axY = p2.y - p1.y;
                    const axLen = Math.hypot(axX, axY) || 1;
                    let nx = -axY / axLen;
                    let ny = axX / axLen;
                    if (camSun && (nx * camSun.x + ny * camSun.y) < 0) {
                        nx = -nx; ny = -ny; // нормаль — к освещённой стороне
                    }
                    const midX = (p1.x + p2.x) * 0.5;
                    const midY = (p1.y + p2.y) * 0.5;

                    const modGrad = ctx.createLinearGradient(
                        midX - nx * screenR, midY - ny * screenR,
                        midX + nx * screenR, midY + ny * screenR
                    );
                    if (mod.hasGoldMLI) {
                        modGrad.addColorStop(0, '#78350f');
                        modGrad.addColorStop(0.28, '#b45309');
                        modGrad.addColorStop(0.46, mod.isDestiny ? '#ffffff' : '#fde68a');
                        modGrad.addColorStop(0.62, '#d97706');
                        modGrad.addColorStop(1, '#451a03');
                    } else {
                        const dark = '#334155';
                        modGrad.addColorStop(0, dark);
                        modGrad.addColorStop(0.26, mod.color || '#e2e8f0');
                        modGrad.addColorStop(0.46, '#ffffff');
                        modGrad.addColorStop(0.58, '#dbe3ec');
                        modGrad.addColorStop(0.85, '#7c8ba1');
                        modGrad.addColorStop(1, '#1e293b');
                    }

                    ctx.strokeStyle = modGrad;
                    ctx.lineWidth = screenR * 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();

                    // Пер-модульное варьирование оттенка обшивки (детерминированное):
                    // лёгкий белый/чёрный оверлей — модули не выглядят клонами
                    let nameHash = 0;
                    for (let ci = 0; ci < (mod.name || '').length; ci++) {
                        nameHash += mod.name.charCodeAt(ci) * (ci + 3);
                    }
                    const tint = (nameHash % 7) - 3; // -3..+3
                    if (tint !== 0) {
                        ctx.strokeStyle = tint > 0
                            ? `rgba(255, 255, 255, ${tint * 0.028})`
                            : `rgba(4, 10, 22, ${-tint * 0.032})`;
                        ctx.lineWidth = screenR * 2;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }

                    if (fineMod) {
                        // Продольные стрингеры обечайки: тонкие тёмные линии вдоль оси
                        ctx.save();
                        ctx.lineWidth = Math.max(0.5, 0.65 * this.screenScale);
                        const strOffsets = [-0.62, -0.32, 0.32, 0.62];
                        for (const t of strOffsets) {
                            const ox = nx * screenR * t;
                            const oy = ny * screenR * t;
                            // теневая сторона (t>0 → от Солнца), освещённая (t<0)
                            ctx.strokeStyle = t > 0
                                ? 'rgba(15, 23, 42, 0.38)'
                                : 'rgba(255, 255, 255, 0.30)';
                            ctx.beginPath();
                            ctx.moveTo(p1.x + ox, p1.y + oy);
                            ctx.lineTo(p2.x + ox, p2.y + oy);
                            ctx.stroke();
                        }
                        ctx.restore();

                        // Стыковочные ободы-переходы (торцевые сферы стыков)
                        for (const ep of [p1, p2]) {
                            const capGrad = ctx.createRadialGradient(
                                ep.x - nx * screenR * 0.25, ep.y - ny * screenR * 0.25, screenR * 0.1,
                                ep.x, ep.y, screenR * 1.02
                            );
                            capGrad.addColorStop(0, '#f8fafc');
                            capGrad.addColorStop(0.6, '#cbd5e1');
                            capGrad.addColorStop(1, '#475569');
                            ctx.fillStyle = capGrad;
                            ctx.beginPath();
                            ctx.arc(ep.x, ep.y, screenR * 1.02, 0, Math.PI * 2);
                            ctx.fill();
                            // Микротекстура обшивки на торцевой сфере (кэш-паттерн)
                            if (this.moduleTex) {
                                if (!this._modulePattern) {
                                    this._modulePattern = ctx.createPattern(this.moduleTex, 'repeat');
                                }
                                ctx.save();
                                ctx.beginPath();
                                ctx.arc(ep.x, ep.y, screenR * 1.02, 0, Math.PI * 2);
                                ctx.clip();
                                ctx.fillStyle = this._modulePattern;
                                ctx.globalAlpha *= 0.3;
                                ctx.fill();
                                ctx.restore();
                            }
                            // Тёмный стык (ambient occlusion) в месте сочленения модулей
                            ctx.strokeStyle = 'rgba(10, 16, 30, 0.5)';
                            ctx.lineWidth = Math.max(0.6, 0.8 * this.screenScale);
                            ctx.stroke();
                            // Внутренний обод стыковочного адаптера
                            ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
                            ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                            ctx.beginPath();
                            ctx.arc(ep.x, ep.y, screenR * 0.55, 0, Math.PI * 2);
                            ctx.stroke();
                            // Заклёпки по окружности стыковочного кольца
                            if (screenR > 7) {
                                ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
                                const rivets = 10;
                                for (let rv = 0; rv < rivets; rv++) {
                                    const ra = (rv / rivets) * Math.PI * 2;
                                    ctx.beginPath();
                                    ctx.arc(
                                        ep.x + Math.cos(ra) * screenR * 0.78,
                                        ep.y + Math.sin(ra) * screenR * 0.78,
                                        Math.max(0.4, screenR * 0.055),
                                        0, Math.PI * 2
                                    );
                                    ctx.fill();
                                }
                            }
                        }

                        // Тёмные иллюминаторы (окна на освещённо-боковой стороне)
                        const winCount = Math.max(2, Math.min(4, Math.round(axLen / (screenR * 2.4))));
                        ctx.fillStyle = 'rgba(10, 18, 34, 0.85)';
                        for (let wi = 0; wi < winCount; wi++) {
                            const wt = (wi + 1) / (winCount + 1);
                            const wx = p1.x + axX * wt + nx * screenR * 0.28;
                            const wy = p1.y + axY * wt + ny * screenR * 0.28;
                            ctx.beginPath();
                            ctx.arc(wx, wy, Math.max(0.8, screenR * 0.14), 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Стыки-панели обечайки с винтами по краям (поперёк оси модуля)
                        if (screenR > 5.5) {
                            const seamCount = 2;
                            ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                            for (let sm = 1; sm <= seamCount; sm++) {
                                const st = sm / (seamCount + 1);
                                const sx = p1.x + axX * st;
                                const sy = p1.y + axY * st;
                                const half = screenR * 0.92;
                                ctx.strokeStyle = 'rgba(15, 23, 42, 0.30)';
                                ctx.beginPath();
                                ctx.moveTo(sx + nx * half, sy + ny * half);
                                ctx.lineTo(sx - nx * half, sy - ny * half);
                                ctx.stroke();
                                // Винты по краям стыка
                                ctx.fillStyle = 'rgba(71, 85, 105, 0.8)';
                                for (const sgn of [1, -1]) {
                                    ctx.beginPath();
                                    ctx.arc(
                                        sx + nx * half * sgn * 0.92,
                                        sy + ny * half * sgn * 0.92,
                                        Math.max(0.5, 0.7 * this.screenScale),
                                        0, Math.PI * 2
                                    );
                                    ctx.fill();
                                }
                            }
                        }

                        // Английская маркировка-декаль (только при крупном размере на экране)
                        if (screenR > 11 && mod.name) {
                            const decal = mod.name.split('_')[0].toUpperCase();
                            ctx.save();
                            ctx.translate(midX, midY);
                            ctx.rotate(Math.atan2(axY, axX));
                            ctx.font = `${Math.max(5, screenR * 0.55)}px "JetBrains Mono", monospace`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
                            ctx.fillText(decal, 0, 0);
                            ctx.restore();
                        }

                        // Солнечные «жалюзи» на российских модулях (Звезда / Заря):
                        // чередующиеся светлые/тёмные полоски поперёк обечайки
                        if (mod.hasSolar || mod.hasGoldMLI) {
                            const lvCount = 5;
                            ctx.lineWidth = Math.max(0.5, 0.7 * this.screenScale);
                            for (let lv = 0; lv < lvCount; lv++) {
                                const lt = 0.2 + (lv / (lvCount - 1)) * 0.58;
                                const lx = p1.x + axX * lt;
                                const ly = p1.y + axY * lt;
                                const half = screenR * 0.85;
                                ctx.strokeStyle = lv % 2 === 0
                                    ? 'rgba(180, 140, 60, 0.5)'
                                    : 'rgba(30, 41, 59, 0.5)';
                                ctx.beginPath();
                                ctx.moveTo(lx + nx * half, ly + ny * half);
                                ctx.lineTo(lx - nx * half, ly - ny * half);
                                ctx.stroke();
                            }
                        }

                        // Малые антенные тарелки (Звезда и Destiny)
                        if (mod.name === 'Zvezda' || mod.name === 'Destiny_Lab') {
                            const dishT = mod.name === 'Zvezda' ? 0.72 : 0.42;
                            const dishBase = project(
                                mod.x1 + (mod.x2 - mod.x1) * dishT, offY, offZ
                            );
                            const dishTop = project(
                                mod.x1 + (mod.x2 - mod.x1) * dishT,
                                offY + mod.radius + 2.4, offZ
                            );
                            if (dishBase && dishTop) {
                                ctx.strokeStyle = '#94a3b8';
                                ctx.lineWidth = Math.max(0.5, 0.7 * this.screenScale);
                                ctx.beginPath();
                                ctx.moveTo(dishBase.x, dishBase.y);
                                ctx.lineTo(dishTop.x, dishTop.y);
                                ctx.stroke();
                                // Зеркало тарелки: наклонный эллипс с тёмной кромкой
                                const dishR = Math.max(1.2, 2.0 * this.screenScale);
                                ctx.fillStyle = '#cbd5e1';
                                ctx.beginPath();
                                ctx.ellipse(dishTop.x, dishTop.y, dishR, dishR * 0.55, 0.5, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
                                ctx.lineWidth = Math.max(0.4, 0.5 * this.screenScale);
                                ctx.stroke();
                            }
                        }

                        // Активный Курс-антенный комплекс на кормовом стыковочном узле
                        // Звезды (штурмовой порт Прогресса): торчащие штыревые антенны
                        if (mod.name === 'Zvezda') {
                            const kursBase = project(mod.x1 + 1.2, offY, offZ);
                            if (kursBase) {
                                const kursProngs = [
                                    { dy: 2.6, dz: 1.6 },
                                    { dy: 1.6, dz: -2.4 },
                                    { dy: 0.3, dz: 3.2 }
                                ];
                                ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                                for (const pr of kursProngs) {
                                    const kp = project(mod.x1 - 2.4, offY + pr.dy, offZ + pr.dz);
                                    if (!kp) continue;
                                    ctx.strokeStyle = '#e2e8f0';
                                    ctx.beginPath();
                                    ctx.moveTo(kursBase.x, kursBase.y);
                                    ctx.lineTo(kp.x, kp.y);
                                    ctx.stroke();
                                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                    ctx.beginPath();
                                    ctx.arc(kp.x, kp.y, Math.max(0.5, 0.8 * this.screenScale), 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            }
                        }
                    }

                    // Земной rim-light: холодный голубой отблеск снизу (отражение от Земли)
                    const rimGrad = ctx.createLinearGradient(
                        midX, midY + screenR * 0.55, midX, midY + screenR * 1.15
                    );
                    rimGrad.addColorStop(0, 'rgba(147, 197, 253, 0.22)');
                    rimGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
                    ctx.strokeStyle = rimGrad;
                    ctx.lineWidth = screenR * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y + screenR * 0.82);
                    ctx.lineTo(p2.x, p2.y + screenR * 0.82);
                    ctx.stroke();

                    // Солнечный терминатор: бликовая дуга на освещённой стороне цилиндра
                    if (camSun && (Math.abs(camSun.x) + Math.abs(camSun.y)) > 0.05) {
                        const sunLen = Math.hypot(camSun.x, camSun.y) || 1;
                        const hx = (p1.x + p2.x) * 0.5 + (camSun.x / sunLen) * screenR * 0.55;
                        const hy = (p1.y + p2.y) * 0.5 - (camSun.y / sunLen) * screenR * 0.55;
                        const termGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, screenR * 0.9);
                        termGlow.addColorStop(0, 'rgba(255, 253, 245, 0.55)');
                        termGlow.addColorStop(0.6, 'rgba(255, 248, 230, 0.18)');
                        termGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                        ctx.fillStyle = termGlow;
                        ctx.beginPath();
                        ctx.arc(hx, hy, screenR * 0.9, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Модуль Cupola: иллюминаторы смотрят прямо на Землю в надир
                    if (mod.isCupola) {
                        ctx.fillStyle = '#0284c7';
                        ctx.beginPath();
                        ctx.arc(p1.x, p1.y, screenR * 1.1, 0, Math.PI * 2);
                        ctx.fill();

                        const cupolaGlow = ctx.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, screenR * 1.1);
                        cupolaGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
                        cupolaGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.7)');
                        cupolaGlow.addColorStop(1, 'rgba(2, 132, 199, 0.2)');
                        ctx.fillStyle = cupolaGlow;
                        ctx.beginPath();
                        ctx.arc(p1.x, p1.y, screenR * 0.9, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (mod.hasSolar) {
                        const solLeft = project(mod.x1 + 10, offY, offZ - 20);
                        const solRight = project(mod.x1 + 10, offY, offZ + 20);
                        if (solLeft && solRight) {
                            ctx.strokeStyle = '#0f274a';
                            ctx.lineWidth = Math.max(1.4, 3.2 * this.screenScale);
                            ctx.beginPath();
                            ctx.moveTo(solLeft.x, solLeft.y);
                            ctx.lineTo(solRight.x, solRight.y);
                            ctx.stroke();
                        }
                    }

                    if (mod.isKibo) {
                        const efPt = project(mod.x2, offY, offZ - 6);
                        if (efPt) {
                            ctx.fillStyle = '#94a3b8';
                            ctx.fillRect(efPt.x - 3, efPt.y - 3, 6, 6);
                        }
                    }
                }
            });
        }
    }

    /**
     * Построение пристыкованных космических кораблей (Crew Dragon и Союз МС)
     */
    queueVisitingVehicles(project, camSun) {
        // 1. SpaceX Crew Dragon (Harmony Fwd IDA-2, нос вперед: X: 44 -> 62)
        const dNose = project(62, 0, 0);
        const dBase = project(44, 0, 0);

        if (dNose && dBase) {
            this.renderQueue.push({
                depth: (dNose.z + dBase.z) * 0.5,
                render: (ctx) => {
                    const r = Math.max(1.8, 3.8 * this.screenScale);

                    const grad = ctx.createLinearGradient(dBase.x, dBase.y - r, dBase.x, dBase.y + r);
                    grad.addColorStop(0, '#cbd5e1');
                    grad.addColorStop(0.4, '#ffffff');
                    grad.addColorStop(1, '#64748b');

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = r * 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(dBase.x, dBase.y);
                    ctx.lineTo(dNose.x, dNose.y);
                    ctx.stroke();

                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(dBase.x, dBase.y, r * 1.05, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = Math.max(0.6, 1.0 * this.screenScale);
                    ctx.strokeRect(dBase.x - 2, dBase.y - r - 2, 4, r * 2 + 4);
                }
            });
        }

        // 2. Союз МС (Надирный узел МИМ-1 Рассвет: Y: -12, X: -22)
        const sOrb = project(-22, -14, 0);
        const sDes = project(-22, -9, 0);
        const sInst = project(-22, -4, 0);

        if (sOrb && sDes && sInst) {
            this.renderQueue.push({
                depth: (sOrb.z + sInst.z) * 0.5,
                render: (ctx) => {
                    const sr = Math.max(1.4, 2.6 * this.screenScale);

                    ctx.fillStyle = '#64748b';
                    ctx.beginPath();
                    ctx.arc(sOrb.x, sOrb.y, sr, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#475569';
                    ctx.beginPath();
                    ctx.arc(sDes.x, sDes.y, sr * 0.9, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(sInst.x - sr, sInst.y - 1.5, sr * 2, 3);

                    const sSolL = project(-22, -6, -10);
                    const sSolR = project(-22, -6, 10);
                    if (sSolL && sSolR) {
                        ctx.strokeStyle = '#0f274a';
                        ctx.lineWidth = Math.max(1.0, 1.8 * this.screenScale);
                        ctx.beginPath();
                        ctx.moveTo(sSolL.x, sSolL.y);
                        ctx.lineTo(sSolR.x, sSolR.y);
                        ctx.stroke();
                    }
                }
            });
        }
    }

    /**
     * Построение манипулятора Canadarm2 (SSRMS)
     */
    queueCanadarm2(project, camSun) {
        // Сегментированный SSRMS: база → плечо → локоть → предплечье → кисть → захваты LEE
        const joints = [
            project(18, 6.5, -3.5),   // основание (Payload Orbital Replacement Unit)
            project(20.5, 10.5, -6.5), // верхнее плечо (shoulder pitch/yaw)
            project(24, 14.5, -9.5),  // локоть (elbow joint)
            project(27.5, 11.0, -12.0), // нижняя рука
            project(30, 8.0, -14.0),  // кисть (wrist) + LEE tip
            project(32, 5.5, -15.5)   // наконечник-захват (orbiter LEE)
        ].filter(Boolean);

        if (joints.length < 2) return;

        this.renderQueue.push({
            depth: joints[2].z,
            render: (ctx) => {
                const segW = Math.max(1.2, 1.9 * this.screenScale);
                const jointR = Math.max(1.3, 2.1 * this.screenScale);

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Сегменты: тёмно-серый титановый корпус со светлой световой гранью
                for (let s = 0; s < joints.length - 1; s++) {
                    const a = joints[s];
                    const b = joints[s + 1];

                    // Основной корпус сегмента
                    ctx.strokeStyle = '#4b5563';
                    ctx.lineWidth = segW;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();

                    // Солнечная грань (rim-light от camSun) — тонкая светлая линия
                    if (camSun && (Math.abs(camSun.x) + Math.abs(camSun.y)) > 0.05) {
                        const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                        const pnx = -(b.y - a.y) / segLen;
                        const pny = (b.x - a.x) / segLen;
                        const side = (pnx * camSun.x + pny * camSun.y) < 0 ? 1 : -1;
                        ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
                        ctx.lineWidth = Math.max(0.5, segW * 0.32);
                        ctx.beginPath();
                        ctx.moveTo(a.x + pnx * side * segW * 0.45, a.y + pny * side * segW * 0.45);
                        ctx.lineTo(b.x + pnx * side * segW * 0.45, b.y + pny * side * segW * 0.45);
                        ctx.stroke();
                    }

                    // Сочленение: цилиндр-шарнир со светлыми торцами
                    const jg = ctx.createRadialGradient(
                        b.x - jointR * 0.3, b.y - jointR * 0.3, jointR * 0.1,
                        b.x, b.y, jointR
                    );
                    jg.addColorStop(0, '#e2e8f0');
                    jg.addColorStop(0.55, '#94a3b8');
                    jg.addColorStop(1, '#334155');
                    ctx.fillStyle = jg;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, jointR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(10, 16, 30, 0.55)';
                    ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                    ctx.stroke();
                }

                // Кисть (wrist joint) — акцентный шарнир
                const wrist = joints[4];
                if (wrist) {
                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath();
                    ctx.arc(wrist.x, wrist.y, jointR * 1.15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(10, 16, 30, 0.6)';
                    ctx.lineWidth = Math.max(0.5, 0.6 * this.screenScale);
                    ctx.stroke();
                }

                // Наконечник-захват LEE
                const tip = joints[joints.length - 1];
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, Math.max(1.0, 1.5 * this.screenScale), 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    /**
     * Деликатный specular-glint (аниморфный блик) при повороте панелей
     * к Солнцу и камере — вспыхивает дважды за орбитальный виток.
     */
    renderSolarSpecularGlint(ctx, project) {
        if (this.inEclipse) return;

        // Фаза блика: максимум при зеркальном выравнивании панелей (дважды за виток)
        const glintPhase = Math.pow(Math.max(0, Math.cos(this.betaAngle * 2.0)), 6.0);
        if (glintPhase < 0.12) return;

        const intensity = (glintPhase - 0.12) / 0.88;
        const glintPt = project(0, this.betaAngle > 0 ? 22 : -22, 96);
        if (!glintPt) return;

        const streak = 14 * intensity * this.screenScale * 6;

        // Аниморфная горизонтальная полоса
        const streakGrad = ctx.createLinearGradient(glintPt.x - streak, glintPt.y, glintPt.x + streak, glintPt.y);
        streakGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        streakGrad.addColorStop(0.5, `rgba(255, 255, 250, ${intensity * 0.75})`);
        streakGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = streakGrad;
        ctx.fillRect(glintPt.x - streak, glintPt.y - 1.2, streak * 2, 2.4);

        // Ядро блика
        const core = ctx.createRadialGradient(glintPt.x, glintPt.y, 0, glintPt.x, glintPt.y, 7 * intensity * this.screenScale * 4);
        core.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.95})`);
        core.addColorStop(0.35, `rgba(254, 240, 138, ${intensity * 0.6})`);
        core.addColorStop(1, 'rgba(217, 119, 6, 0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(glintPt.x, glintPt.y, 7 * intensity * this.screenScale * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Отрисовка навигационных стробоскопов
     */
    renderNavigationBeacons(ctx, project) {
        const isFlash = this.strobePhase < 0.12;
        const flashAlpha = isFlash ? 1.0 : 0.25;

        // Левый габаритный огонь (Port tip: Красный)
        const portTip = project(0, 0, -135);
        if (portTip) {
            ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(portTip.x, portTip.y, isFlash ? 3.8 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Правый габаритный огонь (Starboard tip: Зеленый)
        const stbdTip = project(0, 0, 135);
        if (stbdTip) {
            ctx.fillStyle = `rgba(34, 197, 94, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(stbdTip.x, stbdTip.y, isFlash ? 3.8 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Белый ксеноновый импульсный маяк на ферме S0
        if (isFlash) {
            const s0Pt = project(0, 5.5, 0);
            if (s0Pt) {
                const flare = ctx.createRadialGradient(s0Pt.x, s0Pt.y, 0, s0Pt.x, s0Pt.y, 9);
                flare.addColorStop(0, 'rgba(255, 255, 255, 1)');
                flare.addColorStop(0.4, 'rgba(56, 189, 248, 0.7)');
                flare.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = flare;
                ctx.beginPath();
                ctx.arc(s0Pt.x, s0Pt.y, 9, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Отрисовка интерактивного голографического прицела-локера при наведении
     */
    renderHolographicReticle(ctx, px, py) {
        if (this.hoverTransition <= 0.01 && !this.isTelemetryOpen) return;

        ctx.save();
        const alpha = Math.max(this.hoverTransition, this.isTelemetryOpen ? 0.85 : 0) * this.limbVisibility;
        ctx.globalAlpha = alpha;

        const reticleR = Math.max(36, this.screenRadius * 1.15);
        const angle = this.lockReticleAngle;

        ctx.strokeStyle = '#3ee6c4';
        ctx.lineWidth = 1.5;

        const numBrackets = 4;
        const bracketAngle = Math.PI / 6;

        for (let i = 0; i < numBrackets; i++) {
            const baseA = angle + (i * Math.PI) / 2;
            ctx.beginPath();
            ctx.arc(px, py, reticleR, baseA - bracketAngle * 0.5, baseA + bracketAngle * 0.5);
            ctx.stroke();
        }

        const crossLen = 6;
        ctx.strokeStyle = 'rgba(62, 230, 196, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - reticleR - crossLen, py);
        ctx.lineTo(px - reticleR + crossLen, py);
        ctx.moveTo(px + reticleR - crossLen, py);
        ctx.lineTo(px + reticleR + crossLen, py);
        ctx.moveTo(px, py - reticleR - crossLen);
        ctx.lineTo(px, py - reticleR + crossLen);
        ctx.moveTo(px, py + reticleR - crossLen);
        ctx.lineTo(px, py + reticleR + crossLen);
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#3ee6c4';
        ctx.fillText(`[ ISS-ZARYA // EXP-71 ]`, px + reticleR + 10, py - 6);

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`RANGE: ${ISS_CONFIG.realAltitudeKm} KM • VEL: ${ISS_CONFIG.realSpeedKmS} KM/S`, px + reticleR + 10, py + 8);

        if (this.velocity) {
            const vAngle = Math.atan2(this.velocity.y, this.velocity.x);
            const vLen = 22;
            const vx = px + Math.cos(vAngle) * (reticleR + vLen);
            const vy = py + Math.sin(vAngle) * (reticleR + vLen);

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(vAngle) * reticleR, py + Math.sin(vAngle) * reticleR);
            ctx.lineTo(vx, vy);
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(vx, vy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.isTelemetryOpen && this.telemetryCardEl) {
            const cardRect = this.telemetryCardEl.getBoundingClientRect();
            const targetX = cardRect.left;
            const targetY = cardRect.top + 25;

            ctx.strokeStyle = 'rgba(62, 230, 196, 0.45)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(px + reticleR, py);
            ctx.lineTo((px + targetX) * 0.5, py);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
}

// Экспорт синглтона и альтернативных алиасов
export const IssStation = new IssStationEngine();
export const ISSStation = IssStation;
export const ISSVisuals = IssStation;
export default IssStation;
