/**
 * src/iss_station.js — International Space Station (ISS / МКС) 3D Module
 * ============================================================================
 * Разработка: Lead 3D Game Engineer & Graphics Programmer for AURORA
 *
 * Архитектура и функционал:
 * - Орбитальная кинематика МКС: R = 1800-2100 px, период ~3.75 мин (360°),
 *   наклонение орбиты: yaw = (baseYaw + time * speed) % 360,
 *   pitch = basePitch + Math.sin(time * 0.5) * 5.2°.
 * - Проградная ориентация: продольная ось модулей выровнена по вектору скорости,
 *   ферма ITS ориентирована строго перпендикулярно вектору полета.
 * - Слежение за Солнцем (BGA - Beta Gimbal Assembly): 8 солнечных панелей
 *   непрерывно разворачиваются вокруг осей фермы к виртуальному вектору Солнца
 *   { x: 0.72, y: 0.28, z: 0.63 }, идентичному celestial_planets.js.
 * - Полная синхронизация с 3D-камерой Space3D (Yaw, Pitch, Zoom, FOV).
 * - Детальная 3D-геометрия: основная ферма (ITS S0-S6, P1-P6), 8 солнечных батарей (SAW),
 *   3 радиатора охлаждения (TCS), модули Заря, Звезда, Destiny, Columbus, Kibo, Cupola,
 *   пристыкованные корабли Crew Dragon и Союз МС, манипулятор Canadarm2.
 * - Глубинная сортировка (Depth-Sorting / Painter's Algorithm) и полигональный рендеринг.
 * - Интерактивный хитбокс (Raycast / Screen-space Bounding Sphere) с детекцией наведения
 *   мыши, голографическим прицелом-локером и интерактивной карточкой телеметрии.
 * - Звуковые эффекты: аутентичные квиндар-тоны (Quindar Beeps) через Web Audio API
 *   и голосовые уведомления ассистентки через SpaceAudio.
 * - Высокая производительность: оффскрин-кэширование текстур солнечных панелей,
 *   радиаторов и обшивки модулей; стабильные 60-120 FPS без аллокаций в цикле кадра.
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=3.8.0';

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
 * Конфигурация орбиты и параметров станции
 */
export const ISS_CONFIG = {
    orbitRadius: 1950,           // Радиус орбиты вокруг пользователя (1800 - 2100 px)
    orbitPeriodSec: 225,         // Полный оборот 360° за 3.75 минуты (225 сек)
    baseYaw: 38,                 // Начальный азимут орбиты (градусы)
    basePitch: -11,              // Базовое возвышение над горизонтом Земли (градусы)
    inclinationAmp: 5.2,         // Амплитуда орбитального наклонения (градусы)
    inclinationFreq: 0.5,        // Частота гармонического колебания наклонения (Math.sin(time * 0.5))
    stationScale: 1.0,           // Масштабный коэффициент геометрии
    hitRadiusMultiplier: 1.25,   // Множитель экранного хитбокса
    realAltitudeKm: 418.4,       // Реальная высота орбиты МКС (км)
    realSpeedKmS: 7.66,          // Реальная орбитальная скорость (км/с)
    realPeriodMin: 92.8,         // Реальный период обращения (мин)
    realInclinationDeg: 51.64    // Реальное наклонение орбиты МКС (градусы)
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

        // Временная шкала и кинематика орбиты
        this.time = 0;               // Секунды с момента старта
        this.lastTimeMs = 0;         // Предыдущий timestamp
        this.lastUpdateFrame = 0;    // Защита от дублирования update в одном кадре
        this.yaw = ISS_CONFIG.baseYaw;
        this.pitch = ISS_CONFIG.basePitch;
        this.orbitRadius = ISS_CONFIG.orbitRadius;

        // Положение и ориентация в 3D мировом пространстве
        this.worldPos = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.forward = { x: 1, y: 0, z: 0 };   // Проградный вектор (полет носом вперед)
        this.up = { x: 0, y: 1, z: 0 };        // Локальный вектор зенита (от Земли)
        this.right = { x: 0, y: 0, z: 1 };     // Вектор фермы (Starboard, перпендикулярно полету)

        // Слежение за Солнцем (BGA - Beta Gimbal Assembly)
        this.betaAngle = 0;          // Текущий угол поворота солнечных батарей (радианы)
        this.targetBeta = 0;         // Оптимальный угол направления на Солнце
        this.bgaMode = 'auto';       // 'auto' | 'feather' | 'parked'
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
        this.cameraDist = 2000;

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
        this.earthReflectionTex = null;

        // Буфер геометрии для бесперебойной 60 FPS глубинно-сортированной отрисовки
        this.renderQueue = [];

        // Привязка методов
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    /**
     * Инициализация подсистем станции, текстур и событий
     * Поддерживает вызовы init(spaceEngine) и init(canvas, ctx, viewport, spaceEngine)
     */
    init(arg1 = null, ctx = null, viewport = null, spaceEngine = null) {
        if (arg1 && typeof arg1 === 'object' && ('canvas' in arg1 || 'world' in arg1 || 'viewport' in arg1)) {
            // Вызов вида init(spaceEngine)
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
        console.log('[IssStation] ISS 3D Module & Orbital Kinematics successfully initialized.');
    }

    /**
     * Генерация оффскрин-текстур высокого разрешения для солнечных батарей и модулей
     */
    initOffscreenTextures() {
        if (this.isTexturesReady) return;

        // 1. Текстура фотоэлектрических ячеек солнечных батарей (SAW)
        const spW = 128;
        const spH = 256;
        this.solarPanelTex = document.createElement('canvas');
        this.solarPanelTex.width = spW;
        this.solarPanelTex.height = spH;
        const spCtx = this.solarPanelTex.getContext('2d');

        // Глубокий космический кремниевый сине-золотой градиент
        const spGrad = spCtx.createLinearGradient(0, 0, spW, spH);
        spGrad.addColorStop(0, '#0d1e3d');
        spGrad.addColorStop(0.35, '#132c54');
        spGrad.addColorStop(0.7, '#0f2445');
        spGrad.addColorStop(1, '#09152b');
        spCtx.fillStyle = spGrad;
        spCtx.fillRect(0, 0, spW, spH);

        // Фотоэлементы и серебряные токоведущие шины
        spCtx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        spCtx.lineWidth = 1;
        const cols = 6;
        const rows = 18;
        const cw = spW / cols;
        const ch = spH / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = c * cw + 1.5;
                const py = r * ch + 1.5;
                const w = cw - 3;
                const h = ch - 3;

                // Индивидуальный кристалл с антибликовым покрытием
                spCtx.fillStyle = ((r + c) % 2 === 0) ? '#10284d' : '#0e2344';
                spCtx.fillRect(px, py, w, h);

                // Тонкие микро-сетки сбора тока
                spCtx.strokeStyle = 'rgba(125, 211, 252, 0.18)';
                spCtx.beginPath();
                spCtx.moveTo(px, py + h * 0.5);
                spCtx.lineTo(px + w, py + h * 0.5);
                spCtx.stroke();
            }
        }

        // Золотые каптоновые краевые полосы и центральный силовой лонжерон
        spCtx.fillStyle = '#d97706';
        spCtx.fillRect(0, 0, 4, spH);
        spCtx.fillRect(spW - 4, 0, 4, spH);
        spCtx.fillStyle = '#f59e0b';
        spCtx.fillRect(spW / 2 - 2, 0, 4, spH);

        // 2. Текстура тепловых радиаторов охлаждения (TCS)
        const radW = 96;
        const radH = 192;
        this.radiatorTex = document.createElement('canvas');
        this.radiatorTex.width = radW;
        this.radiatorTex.height = radH;
        const radCtx = this.radiatorTex.getContext('2d');

        // Белое отражающее керамическое покрытие с микротенением гофр
        radCtx.fillStyle = '#e2e8f0';
        radCtx.fillRect(0, 0, radW, radH);

        radCtx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
        radCtx.lineWidth = 1.2;
        const radPanels = 12;
        const rph = radH / radPanels;
        for (let i = 0; i <= radPanels; i++) {
            const y = i * rph;
            radCtx.beginPath();
            radCtx.moveTo(0, y);
            radCtx.lineTo(radW, y);
            radCtx.stroke();

            if (i < radPanels) {
                // Теневой рельеф гармошки
                const shadGrad = radCtx.createLinearGradient(0, y, 0, y + rph);
                shadGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                shadGrad.addColorStop(0.5, 'rgba(241, 245, 249, 0.2)');
                shadGrad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
                radCtx.fillStyle = shadGrad;
                radCtx.fillRect(0, y, radW, rph);
            }
        }

        // 3. Текстура обшивки модулей (аэрокосмический алюминий и термоизоляция)
        const modW = 128;
        const modH = 128;
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

        // Швы панелей защиты от микрометеороидов (MMOD)
        modCtx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        modCtx.lineWidth = 1;
        for (let x = 16; x < modW; x += 32) {
            modCtx.beginPath();
            modCtx.moveTo(x, 0);
            modCtx.lineTo(x, modH);
            modCtx.stroke();
        }
        for (let y = 16; y < modH; y += 32) {
            modCtx.beginPath();
            modCtx.moveTo(0, y);
            modCtx.lineTo(modW, y);
            modCtx.stroke();
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
                width: 380px;
                background: linear-gradient(135deg, rgba(6, 13, 27, 0.92) 0%, rgba(15, 23, 42, 0.95) 100%);
                border: 1px solid rgba(62, 230, 196, 0.45);
                box-shadow: 0 0 35px rgba(62, 230, 196, 0.18), inset 0 0 20px rgba(56, 189, 248, 0.08);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border-radius: 14px;
                color: #f1f5f9;
                font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
                padding: 18px 20px;
                z-index: 100005;
                transition: opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s;
                opacity: 0;
                visibility: hidden;
                transform: translateY(18px) scale(0.96);
                pointer-events: none;
                user-select: none;
            }

            .iss-telemetry-hud.active,
            .iss-telemetry-hud.visible {
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateY(0) scale(1) !important;
                pointer-events: auto !important;
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
                        <div class="iss-hud-sub">ОРБИТАЛЬНЫЙ КОМПЛЕКС • ЭКСПЕДИЦИЯ 71/72</div>
                    </div>
                </div>
                <button type="button" class="iss-hud-close-btn" id="iss-hud-close-btn" title="Закрыть HUD">
                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="iss-hud-grid">
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Высота / Апогей</div>
                    <div class="iss-tile-val accent" id="iss-tele-alt">418.4 км</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Скорость полета</div>
                    <div class="iss-tile-val accent" id="iss-tele-speed">7.66 км/с</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Период обращения</div>
                    <div class="iss-tile-val" id="iss-tele-period">92.8 мин</div>
                </div>
                <div class="iss-tele-tile">
                    <div class="iss-tile-label">Наклонение</div>
                    <div class="iss-tile-val" id="iss-tele-inc">51.64°</div>
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

        // Обработчики кнопок карточки
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

        if (!this.isVisible) {
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
            this.playQuindarTone(false); // Мягкий пинг детекции
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

        if (this.isHovered && this.isVisible) {
            this.toggleTelemetry();
            e.stopPropagation();
        }
    }

    /**
     * Открытие/закрытие карточки телеметрии
     */
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
            this.telemetryCardEl.classList.add('active', 'visible');
            this.telemetryCardEl.classList.remove('hidden');
        }
        this.playQuindarTone(true);
        SpaceAudio.playVoice('focus');
    }

    closeTelemetry() {
        this.isTelemetryOpen = false;
        if (this.telemetryCardEl) {
            this.telemetryCardEl.classList.remove('active', 'visible');
        }
    }

    /**
     * Плавное наведение камеры Space3D на станцию МКС
     */
    focusCameraOnIss() {
        if (!this.spaceEngine) {
            const found = window.__space3dEngine || (typeof Space3D !== 'undefined' ? Space3D : null);
            if (found) this.spaceEngine = found;
        }

        if (this.spaceEngine) {
            let targetYaw = this.yaw % 360;
            if (targetYaw > 180) targetYaw -= 360;
            if (targetYaw < -180) targetYaw += 360;

            this.spaceEngine.targetYaw = targetYaw;
            this.spaceEngine.targetPitch = Math.max(-60, Math.min(60, this.pitch));
            this.spaceEngine.targetZoom = 1.35; // Кинематографичный обзор
            SpaceAudio.playVoice('focus');
            this.playQuindarTone(true);
        }
    }

    /**
     * Синтез легендарного космического Quindar-тона (NASA / ISS Comm Beep)
     * частоты 2525 Гц (Intro) и 2475 Гц (Outro) через Web Audio API
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
        } catch (e) {
            // Безопасный откат при отключенном аудио
        }
    }

    /**
     * Обновление орбитальной кинематики и ориентации МКС (60-120 FPS)
     */
    update() {
        const now = performance.now();
        const dt = Math.min(0.1, (now - (this.lastTimeMs || now)) / 1000);
        this.lastTimeMs = now;
        this.time += dt;

        // 1. Орбитальная скорость и углы
        const orbitalSpeedDegPerSec = 360 / ISS_CONFIG.orbitPeriodSec; // ~1.6° в секунду
        this.yaw = (ISS_CONFIG.baseYaw + this.time * orbitalSpeedDegPerSec) % 360;

        // Наклонение орбиты: синусоидальное колебание с амплитудой 5.2°
        const incOffset = Math.sin(this.time * ISS_CONFIG.inclinationFreq) * ISS_CONFIG.inclinationAmp;
        this.pitch = ISS_CONFIG.basePitch + incOffset;

        // 2. Вычисление трехмерного положения станции в мировых координатах
        const radYaw = (this.yaw * Math.PI) / 180;
        const radPitch = (this.pitch * Math.PI) / 180;

        const cosPitch = Math.cos(radPitch);
        const sinPitch = Math.sin(radPitch);
        const cosYaw = Math.cos(radYaw);
        const sinYaw = Math.sin(radYaw);

        const R = this.orbitRadius;
        this.worldPos.x = R * cosPitch * sinYaw;
        this.worldPos.y = R * sinPitch;
        this.worldPos.z = R * cosPitch * cosYaw;

        // 3. Вычисление проградного вектора скорости (tangent flight path)
        const dTheta = (orbitalSpeedDegPerSec * Math.PI) / 180;
        const dPhi = (ISS_CONFIG.inclinationFreq * (ISS_CONFIG.inclinationAmp * Math.PI / 180)) * Math.cos(this.time * ISS_CONFIG.inclinationFreq);

        const vx = R * (-sinPitch * sinYaw * dPhi + cosPitch * cosYaw * dTheta);
        const vy = R * (cosPitch * dPhi);
        const vz = R * (-sinPitch * cosYaw * dPhi - cosPitch * sinYaw * dTheta);

        const vLen = Math.hypot(vx, vy, vz) || 1;
        this.velocity.x = vx;
        this.velocity.y = vy;
        this.velocity.z = vz;

        // Проградная ориентация: Forward = нормализованный вектор скорости
        this.forward.x = vx / vLen;
        this.forward.y = vy / vLen;
        this.forward.z = vz / vLen;

        // Вектор Up (радиальный от центра Земли)
        const pLen = Math.hypot(this.worldPos.x, this.worldPos.y, this.worldPos.z) || 1;
        const radialUp = {
            x: this.worldPos.x / pLen,
            y: this.worldPos.y / pLen,
            z: this.worldPos.z / pLen
        };

        // Вектор фермы ITS (Right / Starboard): ортогонален полету и направлению на Землю
        // Right = Forward x Up
        const rx = this.forward.y * radialUp.z - this.forward.z * radialUp.y;
        const ry = this.forward.z * radialUp.x - this.forward.x * radialUp.z;
        const rz = this.forward.x * radialUp.y - this.forward.y * radialUp.x;
        const rLen = Math.hypot(rx, ry, rz) || 1;

        this.right.x = rx / rLen;
        this.right.y = ry / rLen;
        this.right.z = rz / rLen;

        // Точный ортонормированный Up = Right x Forward
        this.up.x = this.right.y * this.forward.z - this.right.z * this.forward.y;
        this.up.y = this.right.z * this.forward.x - this.right.x * this.forward.z;
        this.up.z = this.right.x * this.forward.y - this.right.y * this.forward.x;

        // 4. Слежение солнечных батарей за Солнцем (BGA - Beta Gimbal Assembly)
        // Вращение батарей происходит вокруг оси фермы (this.right)
        // Проецируем вектор Солнца на плоскость [Forward, Up]
        const sDotF = SUN_VECTOR.x * this.forward.x + SUN_VECTOR.y * this.forward.y + SUN_VECTOR.z * this.forward.z;
        const sDotU = SUN_VECTOR.x * this.up.x + SUN_VECTOR.y * this.up.y + SUN_VECTOR.z * this.up.z;

        // Оптимальный угол направления панелей к Солнцу
        this.targetBeta = Math.atan2(sDotU, sDotF);

        // Плавная работа электроприводов BGA с кинематическим сглаживанием
        let betaDiff = this.targetBeta - this.betaAngle;
        while (betaDiff > Math.PI) betaDiff -= Math.PI * 2;
        while (betaDiff < -Math.PI) betaDiff += Math.PI * 2;
        this.betaAngle += betaDiff * 0.04;

        // Расчет эффективности освещения панелей и генерируемой мощности
        const panelNormF = Math.cos(this.betaAngle);
        const panelNormU = Math.sin(this.betaAngle);
        const rawDot = sDotF * panelNormF + sDotU * panelNormU;
        this.sunDotProduct = Math.max(0, rawDot);
        this.powerOutputKW = 85.0 + this.sunDotProduct * 35.0; // 85 - 120 кВт

        // 5. Обновление навигационных стробоскопов (1 раз в 1.2 сек)
        this.strobeTimer += dt;
        this.strobePhase = (this.strobeTimer % 1.2) / 1.2;

        // 6. Плавная интерполяция эффектов наведения мыши
        if (this.isHovered) {
            this.hoverTransition = Math.min(1.0, this.hoverTransition + dt * 5.0);
            this.lockReticleAngle += dt * 1.8;
        } else {
            this.hoverTransition = Math.max(0.0, this.hoverTransition - dt * 4.0);
        }

        // 7. Обновление значений в HUD если он открыт
        if (this.isTelemetryOpen && this.telemetryCardEl) {
            const bgaDeg = (this.betaAngle * 180 / Math.PI).toFixed(1);
            const bgaEl = this.telemetryCardEl.querySelector('#iss-tele-bga');
            if (bgaEl) bgaEl.textContent = `${bgaDeg >= 0 ? '+' : ''}${bgaDeg}° [BGA TRACK]`;

            const pwrEl = this.telemetryCardEl.querySelector('#iss-tele-pwr');
            if (pwrEl) pwrEl.textContent = `${this.powerOutputKW.toFixed(1)} кВт`;

            const altEl = this.telemetryCardEl.querySelector('#iss-tele-alt');
            if (altEl) {
                const liveAlt = (ISS_CONFIG.realAltitudeKm + Math.sin(this.time * 0.2) * 1.2).toFixed(1);
                altEl.textContent = `${liveAlt} км`;
            }
        }
    }

    /**
     * Отрисовка МКС на главном небесном холсте Space3D (ctx)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - ширина холста
     * @param {number} h - высота холста
     * @param {number} camYaw - азимут камеры Space3D
     * @param {number} camPitch - возвышение камеры Space3D
     * @param {number} zoom - множитель зума
     */
    render(ctx, w, h, camYaw, camPitch, zoom) {
        if (!this.ctx && ctx) this.ctx = ctx;
        if (!ctx) return;

        // Автоматическое обновление кинематики если render вызван напрямую
        this.update();

        this.camYaw = camYaw;
        this.camPitch = camPitch;
        this.camZoom = zoom;

        const cx = w / 2;
        const cy = h / 2;
        const fov = 750 * zoom;

        // Матрица трансформации камеры Space3D
        const radCamYaw = (camYaw * Math.PI) / 180;
        const radCamPitch = (camPitch * Math.PI) / 180;

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

        this.cameraDist = z2;

        // Отсечение, если станция за спиной камеры
        if (z2 <= 0.1) {
            this.isVisible = false;
            return;
        }

        // Проекция центра станции на экран
        const px = cx + (x1 / z2) * fov;
        const py = cy - (y2 / z2) * fov;

        this.screenX = px;
        this.screenY = py;

        // Базовый масштаб геометрии на экране
        const baseScale = (fov / z2) * ISS_CONFIG.stationScale;
        this.screenScale = baseScale;
        this.screenRadius = 145 * baseScale; // Оценочный радиус станции

        // Проверка вхождения в границы холста
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

        // Функция проекции локальной точки станции (lx=Forward, ly=Up, lz=Starboard) в экран
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
        // Нормаль к панели в локальных координатах станции
        const panelNormL = { x: bgaCos, y: bgaSin, z: 0 };
        // Поперечный вектор плоскости панели
        const panelSpanL = { x: -bgaSin, y: bgaCos, z: 0 };

        // Очищаем очередь отрисовки
        this.renderQueue.length = 0;

        // ====================================================================
        // ПОСТРОЕНИЕ И СОРТИРОВКА ДЕТАЛЕЙ СТАНЦИИ
        // ====================================================================

        // 1. Основная интегрированная ферма ITS (S0, S1-S6, P1-P6)
        this.queueTrussStructure(projectLocalPoint, camSun, x1, y2, z2, camRight);

        // 2. 8 Солнечных батарей (SAW) с вращением BGA
        this.queueSolarPanels(projectLocalPoint, camSun, panelNormL, panelSpanL);

        // 3. 3 Тепловых радиатора охлаждения (TCS)
        this.queueRadiators(projectLocalPoint, camSun);

        // 4. Герметичные модули (Заря, Звезда, Destiny, Columbus, Kibo, Cupola)
        this.queueModules(projectLocalPoint, camSun);

        // 5. Пристыкованные космические корабли (Crew Dragon и Союз МС)
        this.queueVisitingVehicles(projectLocalPoint, camSun);

        // 6. Роботизированная рука-манипулятор Canadarm2
        this.queueCanadarm2(projectLocalPoint, camSun);

        // ГЛУБИННАЯ СОРТИРОВКА ПО Z (Painter's Algorithm: от дальних к ближним)
        this.renderQueue.sort((a, b) => b.depth - a.depth);

        // ОТРИСОВКА ВСЕХ СОРТИРОВАННЫХ ЭЛЕМЕНТОВ
        const queueLen = this.renderQueue.length;
        for (let i = 0; i < queueLen; i++) {
            this.renderQueue[i].render(ctx);
        }

        // 7. Навигационные стробоскопы и антиколлизионные огни
        this.renderNavigationBeacons(ctx, projectLocalPoint);

        // 8. Интерактивный голографический прицел и HUD-наведение
        this.renderHolographicReticle(ctx, px, py);
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

                    // Решетчатые треугольные ферменные раскосы
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.lineWidth = Math.max(0.7, 0.8 * this.screenScale);
                    const steps = 4;
                    const dz = (seg.z2 - seg.z1) / steps;
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
                    }

                    // Золотые поворотные шарниры SARJ (Solar Alpha Rotary Joint)
                    if (seg.name.includes('sarj')) {
                        const sarjZ = (seg.z1 + seg.z2) * 0.5;
                        const ptSarj = project(0, 0, sarjZ);
                        if (ptSarj) {
                            ctx.fillStyle = '#f59e0b';
                            ctx.beginPath();
                            ctx.arc(ptSarj.x, ptSarj.y, Math.max(2, 4.2 * this.screenScale), 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            });
        }
    }

    /**
     * Построение 8 Солнечных батарей (Solar Array Wings) с BGA-слежением
     */
    queueSolarPanels(project, camSun, panelNormL, panelSpanL) {
        const wingLength = 58;  // Длина по выносу
        const wingWidth = 18;   // Ширина по оси фермы
        const mastGap = 3.5;    // Зазор между полукрыльями для мачты

        const wings = [
            // Starboard S6 (Внешние правые)
            { id: 'S6_fwd', zAnchor: 122, dir: 1 },
            { id: 'S6_aft', zAnchor: 122, dir: -1 },
            // Starboard S4 (Внутренние правые)
            { id: 'S4_fwd', zAnchor: 82, dir: 1 },
            { id: 'S4_aft', zAnchor: 82, dir: -1 },
            // Port P4 (Внутренние левые)
            { id: 'P4_fwd', zAnchor: -82, dir: 1 },
            { id: 'P4_aft', zAnchor: -82, dir: -1 },
            // Port P6 (Внешние левые)
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

                    const isSunFacing = this.sunDotProduct > 0.15;
                    const baseAlpha = 0.92;

                    if (this.isTexturesReady && this.solarPanelTex) {
                        ctx.fillStyle = ctx.createPattern(this.solarPanelTex, 'repeat');
                        ctx.globalAlpha = baseAlpha;
                        ctx.fill();
                    } else {
                        ctx.fillStyle = isSunFacing ? '#0f274a' : '#1e293b';
                        ctx.fill();
                    }

                    // Золотистый блик от прямого солнечного света
                    if (isSunFacing) {
                        const sunGlint = ctx.createLinearGradient(pt1.x, pt1.y, pt3.x, pt3.y);
                        sunGlint.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
                        sunGlint.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
                        sunGlint.addColorStop(1, 'rgba(14, 165, 233, 0.2)');
                        ctx.fillStyle = sunGlint;
                        ctx.globalAlpha = 0.65;
                        ctx.fill();
                    }

                    // Золотая каптоновая окантовка панели
                    ctx.strokeStyle = isSunFacing ? 'rgba(245, 158, 11, 0.85)' : 'rgba(100, 116, 139, 0.6)';
                    ctx.lineWidth = Math.max(0.8, 1.2 * this.screenScale);
                    ctx.stroke();

                    // Центральная несущая телескопическая мачта крыла
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
                        ctx.fillStyle = ctx.createPattern(this.radiatorTex, 'repeat');
                    } else {
                        ctx.fillStyle = '#f1f5f9';
                    }
                    ctx.fill();

                    // Контурная рамка тепловых панелей
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = Math.max(0.6, 1.0 * this.screenScale);
                    ctx.stroke();

                    // Линии секций гармошки
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
     * (Звезда, Заря, Unity, Destiny, Harmony, Columbus, Kibo, Cupola)
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
                label: 'Купол «Cupola»',
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

                    const modGrad = ctx.createLinearGradient(p1.x, p1.y - screenR, p1.x, p1.y + screenR);
                    if (mod.hasGoldMLI) {
                        modGrad.addColorStop(0, '#d97706');
                        modGrad.addColorStop(0.35, '#fde68a');
                        modGrad.addColorStop(0.7, '#b45309');
                        modGrad.addColorStop(1, '#78350f');
                    } else {
                        modGrad.addColorStop(0, '#64748b');
                        modGrad.addColorStop(0.3, mod.color || '#e2e8f0');
                        modGrad.addColorStop(0.5, '#ffffff');
                        modGrad.addColorStop(0.85, '#94a3b8');
                        modGrad.addColorStop(1, '#334155');
                    }

                    ctx.strokeStyle = modGrad;
                    ctx.lineWidth = screenR * 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();

                    // Швы обшивки и маркировка модуля
                    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
                    ctx.lineWidth = Math.max(0.6, 0.8 * this.screenScale);
                    ctx.beginPath();
                    ctx.moveTo((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5 - screenR);
                    ctx.lineTo((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5 + screenR);
                    ctx.stroke();

                    // Особенность модуля Cupola: 7 иллюминаторов с голубым отражением Земли
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

                    // Небольшие собственные солнечные панели модуля Звезда
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

                    // Выносная платформа JAXA Exposed Facility на модуле Kibo
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
        // 1. SpaceX Crew Dragon (Пристыкован к Harmony Fwd IDA-2, нос вперед: X: 44 -> 62)
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

                    // Черное защитное кольцо адаптера стыковки IDA
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(dBase.x, dBase.y, r * 1.05, 0, Math.PI * 2);
                    ctx.fill();

                    // Аэродинамические стабилизаторы грузового отсека (Trunk fins)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = Math.max(0.6, 1.0 * this.screenScale);
                    ctx.strokeRect(dBase.x - 2, dBase.y - r - 2, 4, r * 2 + 4);
                }
            });
        }

        // 2. Союз МС (Пристыкован к надирному узлу МИМ-1 Рассвет: Y: -12, X: -22)
        const sOrb = project(-22, -14, 0);
        const sDes = project(-22, -9, 0);
        const sInst = project(-22, -4, 0);

        if (sOrb && sDes && sInst) {
            this.renderQueue.push({
                depth: (sOrb.z + sInst.z) * 0.5,
                render: (ctx) => {
                    const sr = Math.max(1.4, 2.6 * this.screenScale);

                    // Бытовой отсек (сфера)
                    ctx.fillStyle = '#64748b';
                    ctx.beginPath();
                    ctx.arc(sOrb.x, sOrb.y, sr, 0, Math.PI * 2);
                    ctx.fill();

                    // Спускаемый аппарат (фара)
                    ctx.fillStyle = '#475569';
                    ctx.beginPath();
                    ctx.arc(sDes.x, sDes.y, sr * 0.9, 0, Math.PI * 2);
                    ctx.fill();

                    // Приборно-агрегатный отсек (цилиндр)
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(sInst.x - sr, sInst.y - 1.5, sr * 2, 3);

                    // Крылья солнечных батарей Союза
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
     * Построение многозвенного манипулятора Canadarm2 (SSRMS)
     */
    queueCanadarm2(project, camSun) {
        const base = project(18, 6.5, -3.5);
        const elbow = project(24, 14.5, -9.5);
        const tip = project(30, 8.0, -14.0);

        if (base && elbow && tip) {
            this.renderQueue.push({
                depth: elbow.z,
                render: (ctx) => {
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = Math.max(1.0, 1.6 * this.screenScale);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Первое плечо Canadarm2 (Boom 1)
                    ctx.beginPath();
                    ctx.moveTo(base.x, base.y);
                    ctx.lineTo(elbow.x, elbow.y);
                    ctx.stroke();

                    // Локтевой шарнир
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(elbow.x, elbow.y, Math.max(1.2, 2.0 * this.screenScale), 0, Math.PI * 2);
                    ctx.fill();

                    // Второе плечо (Boom 2)
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(elbow.x, elbow.y);
                    ctx.lineTo(tip.x, tip.y);
                    ctx.stroke();

                    // Захват Latching End Effector (LEE)
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(tip.x, tip.y, Math.max(1.0, 1.5 * this.screenScale), 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }

    /**
     * Отрисовка навигационных стробоскопов (красный левый, зеленый правый, белые ксеноны)
     */
    renderNavigationBeacons(ctx, project) {
        const isFlash = this.strobePhase < 0.12;
        const flashAlpha = isFlash ? 1.0 : 0.25;

        // 1. Левый габаритный огонь (Port tip: Красный)
        const portTip = project(0, 0, -135);
        if (portTip) {
            ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(portTip.x, portTip.y, isFlash ? 3.8 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Правый габаритный огонь (Starboard tip: Зеленый)
        const stbdTip = project(0, 0, 135);
        if (stbdTip) {
            ctx.fillStyle = `rgba(34, 197, 94, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(stbdTip.x, stbdTip.y, isFlash ? 3.8 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Белый ксеноновый импульсный маяк на ферме S0 (каждые 1.2 сек)
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
        const alpha = Math.max(this.hoverTransition, this.isTelemetryOpen ? 0.85 : 0);
        ctx.globalAlpha = alpha;

        const reticleR = Math.max(36, this.screenRadius * 1.15);
        const angle = this.lockReticleAngle;

        // Вращающиеся угловые скобки прицеливания
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

        // Внутреннее перекрестие наведения
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

        // Голографические текстовые маркеры
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#3ee6c4';
        ctx.fillText(`[ ISS-ZARYA // EXP-71 ]`, px + reticleR + 10, py - 6);

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`RANGE: ${ISS_CONFIG.realAltitudeKm} KM • VEL: ${ISS_CONFIG.realSpeedKmS} KM/S`, px + reticleR + 10, py + 8);

        // Вектор путевой скорости (Flight Vector)
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

            // Стрелочка вектора скорости
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(vx, vy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Голографическая связующая линия к открытой карточке HUD
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
if (typeof window !== 'undefined') {
    window.IssStation = IssStation;
    window.ISSVisuals = IssStation;
}
export default IssStation;
