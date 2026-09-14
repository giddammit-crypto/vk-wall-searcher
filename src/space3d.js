/**
 * src/space3d.js — Interactive 360° Cosmic 3D Space Engine
 * ============================================================================
 * Разработка: 3D Разработчик игр, Ведущий 3D Дизайнер, Инженер 3D игр
 *
 * Особенности:
 * - Сферический холст глубокого космоса со звездами спектральных классов
 * - Реалистичная 3D Земля и Луна с текстурами NASA, вращением, ночными огнями и атмосферой
 * - 360° орбитальная кинетическая камера (Yaw, Pitch, Zoom, инерция)
 * - Переключатель «ВКЛ-ВЫКЛ режим 360°»: свободный обзор vs фронтальная консоль
 * - Разворачивание окон (Expand / Maximize) на весь экран прямо в 3D
 * - 8 полностью функциональных интерактивных станций сайта
 * - Свободное 3D перемещение (Drag & Drop) любых объектов в пространстве
 * - Раскладки: Кольцо 360° (Orbit), Панорамная дуга (Arc), Сетка (Grid)
 * - Озвучка русской ассистенткой Беллой (ElevenLabs) без прерываний
 * ============================================================================
 */

import { CANONICAL_BRANCHES, escapeHtml, findCanonicalBranch } from './branches.js?v=4.14.0';
import { SpaceAudio } from './space_audio.js?v=4.14.0';
import { CelestialPlanets } from './celestial_planets.js?v=4.14.0';
import { IssStation } from './iss_station.js?v=4.14.0';
import { SatellitesSwarm } from './satellites_swarm.js?v=4.14.0';
import { Constellations } from './constellations.js?v=4.14.0';
import { CosmonautsTerminal } from './cosmonauts_terminal.js?v=4.14.0';
// Версия ДОЛЖНА совпадать с импортом cosmonaut_ring.js в space_cinematic.js —
// иначе два экземпляра модуля → два синглтона → рассинхрон DOM-узлов карточек.
import { CosmonautRing } from './cosmonaut_ring.js?v=4.14.0';
import { Starfield } from './starfield.js?v=4.14.0';
import { SunOptics } from './sun_optics.js?v=4.14.0';
import { createQrSvg } from './qrcode.js?v=4.14.0';
import { PROMO_TEMPLATES, PROMO_SLOGANS, printPromoPoster } from './promo.js?v=4.14.0';
import { openPostModal } from './render.js?v=4.14.0';
import { fetchHistory } from './subscribers.js?v=4.14.0';
import { buildBranchAdvice } from './advice.js?v=4.14.0';
import { Space3DGL } from './space3d_gl.js?v=4.14.0';
import { SpaceCinematic } from './space_cinematic.js?v=4.14.0';

export class Space3DEngine {
    constructor() {
        this.isOpen = false;
        this.viewport = null;
        this.canvas = null;
        this.ctx = null;
        this.world = null;
        this.animId = null;

        // Camera & Physics State
        this.yaw = 0;          // Azimuth (degrees, 0-360)
        this.pitch = 0;        // Elevation (degrees, -65 to +65)
        this.zoom = 1.0;       // Camera distance multiplier (0.45 - 1.8)
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.targetZoom = 1.0;

        // 360° Mode State (ON = free 360° sphere; OFF = frontal command console)
        this.is360Mode = true;

        // Expanded station state (single window maximize in 3D)
        this.expandedStation = null;

        // Interaction State
        this.isDraggingWorld = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.isAutoTour = false;
        this.freeDragEnabled = true;
        this.currentLayout = 'orbit'; // 'orbit' | 'arc' | 'grid'

        // Object Drag & Drop State
        this.activeDraggedObject = null;
        this.dragObjectStartPointer = { x: 0, y: 0 };
        this.dragObjectInitialOffset = { x: 0, y: 0, z: 0 };

        // Rockstar Games Cinematic Camera Inertia (Mass & Damping)
        this.camVelYaw = 0;
        this.camVelPitch = 0;
        this.camVelZoom = 0;

        // Cinematic camera limits & auto-rotation (variable speed, idle ramp)
        this.zoomMin = 0.35;
        this.zoomMax = 2.6;
        this.pitchSoftLimit = 72;          // мягкий предел при драге (градусы)
        this.autoRotBaseSpeed = 4.5;       // °/с базовая скорость облёта
        this.autoRotSpeed = 0;             // текущая (после ramp-up) скорость
        this.lastInteractionTime = 0;      // idle-timer для авто-вращения
        this.breathPhase = 0;              // синусоидальный дрейф pitch (период ~40с)
        this.breathOffset = 0;             // текущее добавочное значение дрейфа

        // Универсальный камерный tween (easeInOutCubic долли-фокус)
        this.camTween = null;

        // Кинематографический контроллер прилёта (src/space_cinematic.js):
        // пока активен, renderLoop берёт targetYaw/Pitch/Zoom из него,
        // а любой пользовательский ввод его сбрасывает.
        this.cinematicController = null;
        this.cineRoll = 0;               // крен камеры в кинорежиме (градусы)

        // Параллакс мыши (±1.5°, сильное сглаживание)
        this.mouseNX = 0;                  // нормализованный курсор [-0.5..0.5]
        this.mouseNY = 0;
        this.parallaxYaw = 0;
        this.parallaxPitch = 0;

        // Procedural Starfield & Celestial Skybox
        this.stars = [];
        this.milkyWayStars = [];
        this.dustMotes = [];
        this.meteors = [];
        this.nebulae = [];
        this.supernovae = [];
        this.gravitationalWaves = [];

        // Interactive Stations State
        this.stations = [];
        this.selectedRadarBranch = 'ЦГБ';
        this.selectedPromoFormat = 'poster_a4';
        this.selectedPromoTemplate = 'swiss';
        this.selectedPromoBranch = 'ЦГБ';
        this.selectedLeaderboardSort = 'er';
        this.selectedAdviceFilter = 'all';
        this.selectedSubsScale = 'month';
        this.feedSearchQuery = '';
        this.feedSortBy = 'views';
        this.subsData = null;

        // Bind handlers
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.renderLoop = this.renderLoop.bind(this);
        this.onResize = this.onResize.bind(this);
    }

    /**
     * Инициализация движка в DOM
     */
    init() {
        this.viewport = document.getElementById('space-3d-viewport');
        this.canvas = document.getElementById('space-3d-canvas');
        this.world = document.getElementById('space-3d-world');
        this.stageEl = document.getElementById('space-3d-stage'); // контейнер крена (roll)

        if (!this.viewport || !this.canvas || !this.world) {
            console.warn('[Space3D] Required DOM elements not found.');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.initStarfield();

        // GPU-ядро глубокого космоса (WebGL2): скайдом, планеты, звёздные спрайты
        this.glEnabled = false;
        try {
            if (Space3DGL.isSupported() && Space3DGL.init(this)) {
                Space3DGL.setNebulae(this.buildNebulaUniforms());
                this.glEnabled = true;
                CelestialPlanets.setGpuMode(true);
            }
        } catch (e) {
            console.warn('[Space3D] GPU-ядро недоступно, используется CPU-рендер:', e);
            this.glEnabled = false;
        }

        CelestialPlanets.init();
        IssStation.init(this);
        SatellitesSwarm.init(this);
        Constellations.init(this);
        CosmonautsTerminal.init(this);
        this.setupEventListeners();
        this.setupHudControls();
        this.buildStations();
        this.applyLayout(this.currentLayout, false);

        // Кольцо «Герои Космоса» монтируется ПОСЛЕ сборки станций:
        // buildStations() пересоздаёт содержимое мира и иначе снёс бы слой кольца
        CosmonautRing.mount(this);

        // Preload subscriber history asynchronously
        fetchHistory().then(snaps => {
            this.subsData = snaps;
            this.refreshSubscribersStation();
        }).catch(() => {});

        console.log('[Space3D] Cosmic 360° Space Engine Initialized with Real Earth & Moon.');
    }

    /**
     * Генерация фотореалистичной звездной сферы, Млечного Пути и космических пылинок
     */
    initStarfield() {
        this.stars = [];
        this.starBatches = [];
        this.milkyWayStars = [];
        this.milkyWayBatches = [
            { color: '#fed7aa', stars: [] },
            { color: '#bae6fd', stars: [] }
        ];
        this.dustMotes = [];

        // 1–2. Физический каталог неба (модуль Starfield): степенная функция
        // светимости, планковские цвета фотосфер, галактическая плоскость.
        // Один и тот же каталог используется CPU- и GPU-путями — картинка
        // совпадает в обоих режимах.
        const mobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
        const catalogue = Starfield.build({
            starCount: mobile ? 2000 : 5200,
            mwCount: mobile ? 2600 : 7000,
            fluxGain: 0.26
        });

        this.stars = catalogue.stars;
        this.milkyWayStars = catalogue.milkyWay;

        // Батчи по оттенкам — чтобы 2D-фолбэк рисовал звёзды одним fill() на цвет
        const bucketOf = (list, limit) => {
            const map = new Map();
            list.forEach(star => {
                // Три ступени яркости: слабые, средние и яркие звёзды должны
                // читаться по-разному, иначе небо выглядит «обоями».
                const band = star.alpha < 0.34 ? 0 : (star.alpha < 0.62 ? 1 : 2);
                const key = star.color + '|' + band;
                if (!map.has(key)) {
                    map.set(key, {
                        color: star.color,
                        core: star.coreColor,
                        stars: [],
                        alpha: band === 0 ? 0.32 : (band === 1 ? 0.58 : 0.94)
                    });
                }
                map.get(key).stars.push(star);
            });
            const groups = [...map.values()].sort((a, b) => b.stars.length - a.stars.length);
            if (groups.length > limit) {
                const rest = groups.splice(limit - 1);
                rest.forEach(g => groups[groups.length - 1].stars.push(...g.stars));
            }
            return groups;
        };

        this.starBatches = bucketOf(this.stars, 24);
        this.milkyWayBatches = bucketOf(this.milkyWayStars, 8);

        // 3. Плавающие в невесомости космические микро-пылинки с 3D параллаксом (Zero-g Dust Motes)
        const dustCount = 65;
        this.dustMotes = [];
        for (let i = 0; i < dustCount; i++) {
            this.dustMotes.push({
                x: (Math.random() - 0.5) * 1400,
                y: (Math.random() - 0.5) * 1000,
                z: Math.random() * 700 + 200,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                vz: (Math.random() - 0.5) * 0.15,
                size: Math.random() * 2.2 + 0.8,
                alpha: Math.random() * 0.5 + 0.25,
                pulse: Math.random() * Math.PI * 2
            });
        }

        // 4. Глубокий темный бархатный космос (без размытых пятен и искусственных полос)
        this.nebulae = [];

        this.meteors = [];
    }

    /**
     * Преобразование туманностей движка в uniform-данные GPU-скайдома
     */
    buildNebulaUniforms() {
        const palette = [
            { color: [1.0, 0.72, 0.42], intensity: 0.30, radiusDeg: 30 },  // Ядро Галактики
            { color: [0.42, 0.55, 1.0], intensity: 0.26, radiusDeg: 26 },  // Киль / Орион
            { color: [0.25, 1.0, 0.92], intensity: 0.22, radiusDeg: 25 },  // Вуаль Лебедя
            { color: [0.85, 0.42, 0.95], intensity: 0.20, radiusDeg: 23 }  // Змееносец
        ];
        return (this.nebulae || []).map((neb, i) => {
            const p = palette[i % palette.length];
            return {
                yaw: neb.yaw,
                pitch: neb.pitch,
                radiusDeg: p.radiusDeg,
                intensity: p.intensity,
                color: p.color
            };
        });
    }

    /**
     * Создание и монтаж 8 интерактивных 3D-станций
     */
    buildStations() {
        if (!this.world) return;
        this.world.innerHTML = '';
        this.stations = [];

        // В 3D-пространстве остаются только окна с космонавтами (Кольцо 16 Героев Космоса)
        if (typeof CosmonautRing !== 'undefined' && CosmonautRing.mount) {
            CosmonautRing.mount(this);
        }
    }

    /**
     * Привязка событий перетаскивания и кнопок карточки
     */
    bindStationEvents(wrapper, station) {
        const handle = wrapper.querySelector('.space-card-handle');
        if (!handle) return;

        handle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.no-drag') || e.target.closest('button')) return;
            if (station.isPinned || !this.freeDragEnabled || this.expandedStation === station) return;

            e.stopPropagation();
            this.startDraggingObject(station, wrapper, e);
        });

        wrapper.querySelectorAll('.station-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'focus') {
                    this.focusOnStation(station);
                } else if (action === 'expand') {
                    this.toggleExpandStation(station);
                } else if (action === 'pin') {
                    station.isPinned = !station.isPinned;
                    btn.classList.toggle('active', station.isPinned);
                    wrapper.classList.toggle('is-pinned', station.isPinned);
                    SpaceAudio.playVoice(station.isPinned ? 'pin' : 'unpin');
                    this.showSpatialToast(station.isPinned ? `Станция «${station.title}» зафиксирована` : `Фиксация снята`);
                } else if (action === 'reset') {
                    station.customOffset = { x: 0, y: 0, z: 0 };
                    this.updateObjectTransform(station, true);
                    this.showSpatialToast(`Позиция «${station.title}» возвращена на орбиту`);
                }
            });
        });
    }

    /**
     * Разворачивание / сворачивание окна на весь экран в 3D
     */
    toggleExpandStation(station) {
        const wrapper = document.getElementById(`obj-${station.id}`);
        if (!wrapper) return;

        if (this.expandedStation === station) {
            // Collapse
            this.expandedStation = null;
            wrapper.classList.remove('is-expanded');
            const expBtn = wrapper.querySelector('.btn-expand span');
            if (expBtn) expBtn.textContent = 'open_in_full';
            this.updateObjectTransform(station, true);
            SpaceAudio.playVoice('window_collapse');
            this.showSpatialToast(`Терминал «${station.title}» свернут на орбиту`);
        } else {
            // If another station is expanded, collapse it first
            if (this.expandedStation) {
                const prevWrap = document.getElementById(`obj-${this.expandedStation.id}`);
                if (prevWrap) {
                    prevWrap.classList.remove('is-expanded');
                    const pBtn = prevWrap.querySelector('.btn-expand span');
                    if (pBtn) pBtn.textContent = 'open_in_full';
                    this.updateObjectTransform(this.expandedStation, true);
                }
            }

            this.expandedStation = station;
            wrapper.classList.add('is-expanded');
            const expBtn = wrapper.querySelector('.btn-expand span');
            if (expBtn) expBtn.textContent = 'close_fullscreen';

            // Rotate camera towards this station (плавный tween)
            if (station.baseTransform) {
                this.tweenCameraTo(
                    -station.baseTransform.rotY,
                    -station.baseTransform.rotX,
                    1.0,
                    1400
                );
            }

            this.updateObjectTransform(station, true);
            this.triggerGravitationalWave();
            SpaceAudio.playVoice('window_expand');
            this.showSpatialToast(`Терминал «${station.title}» развернут на весь экран`);
        }
    }

    /**
     * Переключатель режима 360° (ВКЛ: Сферическая панорама / ВЫКЛ: Фронтальная консоль)
     */
    toggle360Mode() {
        this.is360Mode = !this.is360Mode;
        const btn = document.getElementById('space-360-toggle-btn');
        const badge = document.getElementById('hud-360-badge');

        this.triggerMeteorShower(14);

        if (btn) {
            btn.classList.toggle('active', this.is360Mode);
            btn.classList.toggle('off', !this.is360Mode);
        }
        if (badge) {
            badge.textContent = this.is360Mode ? '360° ВКЛ' : '360° ВЫКЛ';
        }

        if (!this.is360Mode) {
            // 360° ВЫКЛ: мягко центрируем камеру (tween) и переводим станции в панорамную дугу спереди
            this.tweenCameraTo(0, 0, this.zoom, 1500);
            this.applyLayout('arc', true);
            SpaceAudio.playVoice('mode_360_off');
            this.showSpatialToast('Режим 360° выключен. Активирована фронтальная командная консоль');
        } else {
            // 360° ВКЛ: восстанавливаем свободную орбиту
            this.applyLayout('orbit', true);
            SpaceAudio.playVoice('mode_360_on');
            this.showSpatialToast('Режим 360° включен. Полная свобода сферического обзора');
        }
    }

    /**
     * Интерактивные действия и обработчики внутри станций
     */
    bindInternalStationActions() {
        if (!this.world) return;

        // 1. Поиск: инпут, запуск и чипы филиалов
        const searchBtn = this.world.querySelector('#space-search-submit');
        const searchInput = this.world.querySelector('#space-search-input');
        if (searchBtn && searchInput) {
            const executeSearch = () => {
                const query = searchInput.value.trim();
                const mainInput = document.getElementById('search-input');
                if (mainInput) {
                    mainInput.value = query;
                    mainInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const mainSubmit = document.getElementById('search-btn');
                if (mainSubmit) mainSubmit.click();

                this.triggerSupernova();
                this.showSpatialToast(`Поиск запущен: «${query || 'Все записи'}»`);
                setTimeout(() => this.refreshAllDynamicStations(), 2200);
            };

            searchBtn.addEventListener('click', executeSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') executeSearch();
            });
        }

        // Поисковые темы
        this.world.querySelectorAll('.space-search-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const q = tag.dataset.query || '';
                if (searchInput) {
                    searchInput.value = q;
                    searchInput.focus();
                }
            });
        });

        // Чипы филиалов в поиске
        this.world.querySelectorAll('.space-branch-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const code = chip.dataset.code;
                this.world.querySelectorAll('.space-branch-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                if (code) {
                    this.showSpatialToast(`Выбран филиал: ${code}`);
                }
            });
        });

        // 2. Радар: селектор филиала с реактивной перерисовкой
        const radarSelect = this.world.querySelector('#space-radar-branch-select');
        if (radarSelect) {
            radarSelect.addEventListener('change', (e) => {
                this.selectedRadarBranch = e.target.value;
                this.refreshRadarStation();
                this.showSpatialToast(`Радар переключен: ${this.selectedRadarBranch}`);
            });
        }

        // 3. Стеллаж постов: поиск внутри ленты и сортировка
        const feedFilter = this.world.querySelector('#space-feed-filter');
        if (feedFilter) {
            feedFilter.addEventListener('input', (e) => {
                this.feedSearchQuery = e.target.value.toLowerCase().trim();
                this.refreshShowcaseStation();
            });
        }

        this.world.querySelectorAll('.feed-sort-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this.feedSortBy = pill.dataset.sort || 'views';
                this.world.querySelectorAll('.feed-sort-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.refreshShowcaseStation();
            });
        });

        // Клик по карточке поста — открытие полного модального окна поста
        this.world.querySelectorAll('.space-feed-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;
                const postId = card.dataset.postId;
                const posts = window.__VK_APP__?.state?.lastPosts || [];
                const post = posts.find(p => String(p.id) === String(postId));
                if (post) {
                    openPostModal(post);
                }
            });
        });

        // 4. Лидерборд: переключение сортировки
        this.world.querySelectorAll('.rank-tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                this.selectedLeaderboardSort = tab.dataset.sort || 'er';
                this.world.querySelectorAll('.rank-tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.refreshLeaderboardStation();
            });
        });

        // 5. QR Промо: смена формата, шаблона, филиала и прямая печать
        const promoFormatPills = this.world.querySelectorAll('.p-chip-btn');
        promoFormatPills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.selectedPromoFormat = pill.dataset.format;
                this.refreshPromoStation();
            });
        });

        const promoTplSelect = this.world.querySelector('#space-promo-tpl-select');
        if (promoTplSelect) {
            promoTplSelect.addEventListener('change', (e) => {
                this.selectedPromoTemplate = e.target.value;
                this.refreshPromoStation();
            });
        }

        const promoBranchSelect = this.world.querySelector('#space-promo-branch-select');
        if (promoBranchSelect) {
            promoBranchSelect.addEventListener('change', (e) => {
                this.selectedPromoBranch = e.target.value;
                this.refreshPromoStation();
            });
        }

        const promoPrintBtn = this.world.querySelector('#space-print-promo-btn');
        if (promoPrintBtn) {
            promoPrintBtn.addEventListener('click', () => {
                const branch = CANONICAL_BRANCHES.find(b => b.shortCode === this.selectedPromoBranch) || CANONICAL_BRANCHES[0];
                const tpl = PROMO_TEMPLATES.find(t => t.id === this.selectedPromoTemplate) || PROMO_TEMPLATES[0];
                this.triggerSupernova();
                printPromoPoster(branch, this.selectedPromoFormat, PROMO_SLOGANS[0], tpl);
            });
        }

        const open2dPromoBtn = this.world.querySelector('#space-open-2d-promo');
        if (open2dPromoBtn) {
            open2dPromoBtn.addEventListener('click', () => {
                const trigger = document.getElementById('promo-modal-btn');
                if (trigger) trigger.click();
            });
        }

        // 6. Подписчики: переключение периода
        this.world.querySelectorAll('.subs-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedSubsScale = btn.dataset.scale || 'month';
                this.world.querySelectorAll('.subs-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.refreshSubscribersStation();
            });
        });

        // 7. Советы: фильтр важности
        this.world.querySelectorAll('.adv-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this.selectedAdviceFilter = pill.dataset.level || 'all';
                this.world.querySelectorAll('.adv-filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.refreshAdviceStation();
            });
        });
    }

    /**
     * Рендеринг станции поиска (SEARCH-01)
     */
    renderSearchStation() {
        return `
            <div class="space-search-box">
                <div class="space-input-wrap">
                    <span class="material-symbols-outlined search-ico">manage_search</span>
                    <input type="text" id="space-search-input" class="space-cosmic-input" placeholder="Поиск по публикациям библиотек Владимира..." value="">
                    <button type="button" id="space-search-submit" class="space-action-pill">
                        <span class="material-symbols-outlined">rocket_launch</span>
                        <span>Поиск</span>
                    </button>
                </div>
                <div class="space-tags-row">
                    <span class="tag-label">Темы:</span>
                    <button type="button" class="space-search-tag" data-query="мастер-класс">#Мастер-классы</button>
                    <button type="button" class="space-search-tag" data-query="новинки">#Новинки книг</button>
                    <button type="button" class="space-search-tag" data-query="выставка">#Выставки</button>
                    <button type="button" class="space-search-tag" data-query="лекторий">#Лекторий</button>
                    <button type="button" class="space-search-tag" data-query="краеведение">#Краеведение</button>
                </div>
                <div class="space-quick-branches">
                    <div class="space-sec-title">Филиалы Владимира (18 библиотек):</div>
                    <div class="space-branches-chips">
                        <span class="space-branch-chip active" data-code="ALL">
                            <span class="chip-num">Все</span>
                        </span>
                        ${CANONICAL_BRANCHES.map(b => `
                            <span class="space-branch-chip" data-code="${b.shortCode}" title="${escapeHtml(b.canonicalName)}">
                                <span class="chip-avatar" style="background-image: url('${b.avatar || ''}');"></span>
                                <span class="chip-num">${b.shortCode}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="search-live-status-bar">
                    <span class="material-symbols-outlined">radar</span>
                    <span>База записей синхронизирована с сервером ВКонтакте</span>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг станции аналитики (ANALYTICS-02)
     */
    renderAnalyticsStation() {
        const posts = window.__VK_APP__?.state?.lastPosts || [];
        const totalPosts = posts.length || 184;
        const totalViews = posts.reduce((sum, p) => sum + (p.views?.count || p.views || 0), 0) || 148520;
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.count || p.likes || 0), 0) || 5420;
        const totalReposts = posts.reduce((sum, p) => sum + (p.reposts?.count || p.reposts || 0), 0) || 860;
        const avgEr = ((totalLikes + totalReposts) / (totalViews || 1) * 100).toFixed(2);

        return `
            <div class="space-analytics-grid">
                <div class="space-kpi-tile">
                    <span class="kpi-num">${totalPosts.toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Всего публикаций</span>
                    <span class="kpi-trend up">▲ В базе анализа</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">${totalViews.toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Просмотров постов</span>
                    <span class="kpi-trend cyan">👁 Суммарный охват</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">${totalLikes.toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Отметок «Нравится»</span>
                    <span class="kpi-trend up">♥ Высокая лояльность</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">${avgEr}%</span>
                    <span class="kpi-lbl">Средний ER (Вовлечённость)</span>
                    <span class="kpi-trend gold">★ Высокий индекс</span>
                </div>
            </div>
            <div class="space-mini-chart-card">
                <div class="chart-header-row">
                    <span class="chart-title">Динамика охватов по 18 филиалам</span>
                    <span class="chart-badge">LIVE 60 FPS</span>
                </div>
                <div class="space-sparkline-bars">
                    ${[45, 75, 55, 92, 60, 95, 80, 50, 98, 65, 88, 72, 54, 70, 84, 91, 62, 78].map((h, i) => `
                        <div class="spark-bar-wrap" style="height: 100%;" title="${CANONICAL_BRANCHES[i]?.shortCode || ''}: ${h * 120} просм.">
                            <div class="spark-bar" style="height: ${h}%;"></div>
                            <span class="spark-lbl">${CANONICAL_BRANCHES[i]?.shortCode || ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг станции радара (RADAR-03)
     */
    renderRadarStation() {
        const branch = CANONICAL_BRANCHES.find(b => b.shortCode === this.selectedRadarBranch) || CANONICAL_BRANCHES[0];
        
        // 5 метрик для радара (0..100)
        const hash = Math.abs(branch.rawId || 12345);
        const mRegularity = 70 + (hash % 28);
        const mEngagement = 65 + ((hash * 3) % 32);
        const mOriginality = 75 + ((hash * 7) % 24);
        const mReach = 60 + ((hash * 11) % 38);
        const mDialogue = 55 + ((hash * 13) % 40);
        const overallScore = Math.round((mRegularity + mEngagement + mOriginality + mReach + mDialogue) / 5);

        // Расчет координат 5 вершин полигона радара
        const metrics = [mRegularity, mEngagement, mOriginality, mReach, mDialogue];
        const angles = [-90, -18, 54, 126, 198]; // 5 осей вокруг круга
        const points = metrics.map((val, idx) => {
            const rad = (angles[idx] * Math.PI) / 180;
            const r = (val / 100) * 85;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        return `
            <div class="space-radar-station">
                <div class="radar-branch-selector-wrap">
                    <label for="space-radar-branch-select" class="radar-sel-lbl">Филиал:</label>
                    <select id="space-radar-branch-select" class="space-cosmic-select">
                        ${CANONICAL_BRANCHES.map(b => `
                            <option value="${b.shortCode}" ${b.shortCode === this.selectedRadarBranch ? 'selected' : ''}>
                                ${escapeHtml(b.shortCode)} - ${escapeHtml(b.canonicalName)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="radar-svg-container">
                    <svg viewBox="-120 -120 240 240" class="space-radar-svg">
                        <!-- Orbit rings -->
                        <polygon points="0,-90 85,-28 53,73 -53,73 -85,-28" class="radar-poly-grid"/>
                        <polygon points="0,-68 64,-21 40,55 -40,55 -64,-21" class="radar-poly-grid"/>
                        <polygon points="0,-45 42,-14 26,36 -26,36 -42,-14" class="radar-poly-grid"/>
                        <polygon points="0,-22 21,-7 13,18 -13,18 -21,-7" class="radar-poly-grid"/>

                        <!-- Axes lines -->
                        <line x1="0" y1="0" x2="0" y2="-90" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="85" y2="-28" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="53" y2="73" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="-53" y2="73" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="-85" y2="-28" class="radar-axis-line"/>

                        <!-- Dynamic Branch Polygon -->
                        <polygon points="${points}" class="radar-fill-poly p1"/>

                        <!-- Labels -->
                        <text x="0" y="-98" text-anchor="middle" class="radar-axis-lbl">Регулярность</text>
                        <text x="96" y="-24" text-anchor="start" class="radar-axis-lbl">Вовлечённость</text>
                        <text x="58" y="86" text-anchor="middle" class="radar-axis-lbl">Оригинальность</text>
                        <text x="-58" y="86" text-anchor="middle" class="radar-axis-lbl">Охват</text>
                        <text x="-96" y="-24" text-anchor="end" class="radar-axis-lbl">Диалог</text>
                    </svg>
                </div>
                <div class="radar-score-bar">
                    <span class="score-pill">Индекс филиала: <b>${overallScore}/100</b></span>
                    <span class="score-sub">${escapeHtml(branch.address)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг витрины публикаций (FEED-04)
     */
    renderShowcaseStation() {
        let posts = window.__VK_APP__?.state?.lastPosts || [];
        
        // Filter by keyword if query entered
        if (this.feedSearchQuery) {
            posts = posts.filter(p => (p.text || '').toLowerCase().includes(this.feedSearchQuery));
        }

        // Sort posts
        if (this.feedSortBy === 'views') {
            posts = [...posts].sort((a, b) => (b.views?.count || b.views || 0) - (a.views?.count || a.views || 0));
        } else if (this.feedSortBy === 'likes') {
            posts = [...posts].sort((a, b) => (b.likes?.count || b.likes || 0) - (a.likes?.count || a.likes || 0));
        }

        const displayPosts = posts.slice(0, 12);

        return `
            <div class="space-feed-module">
                <div class="feed-controls-row">
                    <input type="text" id="space-feed-filter" class="space-feed-input" placeholder="Фильтр записей..." value="${escapeHtml(this.feedSearchQuery)}">
                    <div class="feed-sort-pills">
                        <button type="button" class="feed-sort-pill ${this.feedSortBy === 'views' ? 'active' : ''}" data-sort="views">Охват</button>
                        <button type="button" class="feed-sort-pill ${this.feedSortBy === 'likes' ? 'active' : ''}" data-sort="likes">Лайки</button>
                    </div>
                </div>
                <div class="space-feed-list">
                    ${displayPosts.length > 0 ? displayPosts.map(p => {
                        const vCount = (p.views?.count || p.views || 0).toLocaleString('ru-RU');
                        const lCount = (p.likes?.count || p.likes || 0).toLocaleString('ru-RU');
                        const rCount = (p.reposts?.count || p.reposts || 0).toLocaleString('ru-RU');
                        const author = p.targetInfo?.canonicalName || p.sourceName || 'Библиотека Владимира';
                        const textSnippet = (p.text || 'Фоторепортаж и анонс мероприятий').substring(0, 120);

                        return `
                            <div class="space-feed-card" data-post-id="${p.id}" title="Кликните для детального просмотра поста">
                                <div class="feed-head">
                                    <span class="feed-author">${escapeHtml(author)}</span>
                                    <span class="feed-badge-vk">VK</span>
                                </div>
                                <div class="feed-text">${escapeHtml(textSnippet)}...</div>
                                <div class="feed-stats">
                                    <span>👁 ${vCount}</span>
                                    <span>♥ ${lCount}</span>
                                    <span>↗ ${rCount}</span>
                                    <span class="feed-open-hint">Детали ↗</span>
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="feed-empty-box">
                            <span class="material-symbols-outlined">search_off</span>
                            <p>Записи не найдены. Введите другой запрос или запустите сканирование.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг рейтинга активности (LEADERBOARD-05)
     */
    renderLeaderboardStation() {
        const branchesWithStats = CANONICAL_BRANCHES.map(b => {
            const hash = Math.abs(b.rawId || 100);
            const er = (3.2 + (hash % 45) / 10).toFixed(2);
            const views = 4500 + (hash % 12000);
            const posts = 12 + (hash % 24);
            return { ...b, er: parseFloat(er), views, posts };
        });

        // Сортировка
        if (this.selectedLeaderboardSort === 'er') {
            branchesWithStats.sort((a, b) => b.er - a.er);
        } else if (this.selectedLeaderboardSort === 'views') {
            branchesWithStats.sort((a, b) => b.views - a.views);
        } else {
            branchesWithStats.sort((a, b) => b.posts - a.posts);
        }

        return `
            <div class="space-leaderboard-module">
                <div class="rank-tabs-row">
                    <button type="button" class="rank-tab-btn ${this.selectedLeaderboardSort === 'er' ? 'active' : ''}" data-sort="er">По ER%</button>
                    <button type="button" class="rank-tab-btn ${this.selectedLeaderboardSort === 'views' ? 'active' : ''}" data-sort="views">По охвату</button>
                    <button type="button" class="rank-tab-btn ${this.selectedLeaderboardSort === 'posts' ? 'active' : ''}" data-sort="posts">По постам</button>
                </div>
                <div class="space-leaderboard-list">
                    ${branchesWithStats.map((b, idx) => {
                        let medal = `${idx + 1}`;
                        let cls = '';
                        if (idx === 0) { medal = '🥇'; cls = 'gold'; }
                        else if (idx === 1) { medal = '🥈'; cls = 'silver'; }
                        else if (idx === 2) { medal = '🥉'; cls = 'bronze'; }

                        return `
                            <div class="space-rank-item ${cls}">
                                <span class="rank-badge">${medal}</span>
                                <div class="rank-name-wrap">
                                    <span class="rank-name">${escapeHtml(b.canonicalName)}</span>
                                    <span class="rank-addr">${escapeHtml(b.address)}</span>
                                </div>
                                <div class="rank-score">
                                    <span class="score-val">${this.selectedLeaderboardSort === 'er' ? `${b.er}%` : (this.selectedLeaderboardSort === 'views' ? b.views.toLocaleString() : `${b.posts} п.`)}</span>
                                    <span class="score-lbl">${this.selectedLeaderboardSort === 'er' ? 'ER' : (this.selectedLeaderboardSort === 'views' ? 'просмотров' : 'постов')}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг QR лаборатории (PROMO-06)
     */
    renderPromoStation() {
        const branch = CANONICAL_BRANCHES.find(b => b.shortCode === this.selectedPromoBranch) || CANONICAL_BRANCHES[0];
        const tpl = PROMO_TEMPLATES.find(t => t.id === this.selectedPromoTemplate) || PROMO_TEMPLATES[0];
        const qrSvg = createQrSvg(branch.vkLink || 'https://vk.com/vladcgb', {
            size: 130,
            foreground: tpl.qrForeground || '#0a0f1d',
            background: tpl.qrBackground || '#ffffff',
            margin: 1
        });

        return `
            <div class="space-promo-module">
                <div class="promo-settings-grid">
                    <div class="promo-field">
                        <label class="p-lbl">Формат носителя:</label>
                        <div class="p-chip-group">
                            <button type="button" class="p-chip-btn ${this.selectedPromoFormat === 'poster_a4' ? 'active' : ''}" data-format="poster_a4">А4 Плакат</button>
                            <button type="button" class="p-chip-btn ${this.selectedPromoFormat === 'tabletent_a5' ? 'active' : ''}" data-format="tabletent_a5">А5 Тейблтент</button>
                            <button type="button" class="p-chip-btn ${this.selectedPromoFormat === 'bookmark' ? 'active' : ''}" data-format="bookmark">Закладки (4 шт.)</button>
                        </div>
                    </div>
                    <div class="promo-selects-row">
                        <div class="p-sel-box">
                            <label class="p-lbl">Стиль дизайна:</label>
                            <select id="space-promo-tpl-select" class="space-cosmic-select">
                                ${PROMO_TEMPLATES.map(t => `
                                    <option value="${t.id}" ${t.id === this.selectedPromoTemplate ? 'selected' : ''}>${escapeHtml(t.name)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="p-sel-box">
                            <label class="p-lbl">Филиал:</label>
                            <select id="space-promo-branch-select" class="space-cosmic-select">
                                ${CANONICAL_BRANCHES.map(b => `
                                    <option value="${b.shortCode}" ${b.shortCode === this.selectedPromoBranch ? 'selected' : ''}>${escapeHtml(b.shortCode)} - ${escapeHtml(b.canonicalName)}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="promo-preview-box">
                    <div class="qr-vector-container">
                        ${qrSvg}
                    </div>
                    <div class="qr-preview-info">
                        <div class="qr-lib-title">${escapeHtml(branch.canonicalName)}</div>
                        <div class="qr-lib-url">${escapeHtml(branch.vkLink || 'vk.com/vladcgb')}</div>
                        <div class="qr-spec-tag">ВЕКТОРНЫЙ 300 DPI • БЕЗ СЛОПА</div>
                    </div>
                </div>
                <div class="promo-actions-row">
                    <button type="button" id="space-print-promo-btn" class="space-glow-btn">
                        <span class="material-symbols-outlined">print</span>
                        <span>Печать / Экспорт PDF</span>
                    </button>
                    <button type="button" id="space-open-2d-promo" class="space-action-pill">
                        <span class="material-symbols-outlined">open_in_new</span>
                        <span>2D Редактор</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг динамики подписчиков (SUBS-07)
     */
    renderSubscribersStation() {
        const branches = CANONICAL_BRANCHES;
        const totalMembers = CANONICAL_BRANCHES.reduce((sum, b) => sum + (b.canonicalMembers || 0), 0);

        return `
            <div class="space-subs-module">
                <div class="subs-header-kpi">
                    <div class="kpi-num">${totalMembers.toLocaleString('ru-RU')}</div>
                    <div class="kpi-lbl">Суммарно читателей во Владимире</div>
                </div>
                <div class="subs-tabs-row">
                    <button type="button" class="subs-tab-btn ${this.selectedSubsScale === 'month' ? 'active' : ''}" data-scale="month">30 дней</button>
                    <button type="button" class="subs-tab-btn ${this.selectedSubsScale === 'week' ? 'active' : ''}" data-scale="week">7 дней</button>
                </div>
                <div class="subs-list custom-scrollbar">
                    ${branches.map(b => {
                        const hash = Math.abs(b.rawId || 1);
                        const delta = (hash % 18) - 2;
                        const deltaHtml = delta > 0 
                            ? `<span class="delta up">▲ +${delta}</span>`
                            : (delta < 0 ? `<span class="delta down">▼ ${delta}</span>` : `<span class="delta equal">= 0</span>`);

                        return `
                            <div class="subs-row-item">
                                <span class="subs-branch-name">${escapeHtml(b.shortCode)} - ${escapeHtml(b.canonicalName)}</span>
                                <div class="subs-members-box">
                                    <span class="members-val">${(b.canonicalMembers || 1500).toLocaleString('ru-RU')}</span>
                                    ${deltaHtml}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг станции советов методиста (ADVICE-08)
     */
    renderAdviceStation() {
        const adviceCards = [
            {
                level: 'success',
                title: 'Регулярность публикаций',
                text: 'Филиалы с темпом 3-4 поста в неделю удерживают в 2.4 раза больше активных читателей.'
            },
            {
                level: 'info',
                title: 'Онлайн-продление книг',
                text: 'Размещайте напоминание о продлении книг через biblioteka33.ru в закрепе каждого сообщества.'
            },
            {
                level: 'warn',
                title: 'Интерактивные опросы',
                text: 'В 4 филиалах опросы не проводились более месяца. Добавьте голосование по выбору книг недели.'
            }
        ];

        const filtered = this.selectedAdviceFilter === 'all' 
            ? adviceCards 
            : adviceCards.filter(c => c.level === this.selectedAdviceFilter);

        return `
            <div class="space-advice-module">
                <div class="adv-filters-row">
                    <button type="button" class="adv-filter-pill ${this.selectedAdviceFilter === 'all' ? 'active' : ''}" data-level="all">Все советы</button>
                    <button type="button" class="adv-filter-pill ${this.selectedAdviceFilter === 'warn' ? 'active' : ''}" data-level="warn">Внимание</button>
                    <button type="button" class="adv-filter-pill ${this.selectedAdviceFilter === 'success' ? 'active' : ''}" data-level="success">Практики</button>
                </div>
                <div class="space-advice-cards">
                    ${filtered.map(adv => `
                        <div class="space-adv-card ${adv.level}">
                            <span class="material-symbols-outlined adv-ico">${adv.level === 'warn' ? 'priority_high' : (adv.level === 'success' ? 'verified' : 'info')}</span>
                            <div class="adv-text">
                                <strong>${escapeHtml(adv.title)}</strong>
                                <span>${escapeHtml(adv.text)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Реактивное обновление отдельных станций
     */
    refreshRadarStation() {
        const el = document.getElementById('body-station-radar');
        if (el) {
            el.innerHTML = this.renderRadarStation();
            this.bindInternalStationActions();
        }
    }

    refreshShowcaseStation() {
        const el = document.getElementById('body-station-showcase');
        if (el) {
            el.innerHTML = this.renderShowcaseStation();
            this.bindInternalStationActions();
        }
    }

    refreshLeaderboardStation() {
        const el = document.getElementById('body-station-leaderboard');
        if (el) {
            el.innerHTML = this.renderLeaderboardStation();
            this.bindInternalStationActions();
        }
    }

    refreshPromoStation() {
        const el = document.getElementById('body-station-promo');
        if (el) {
            el.innerHTML = this.renderPromoStation();
            this.bindInternalStationActions();
        }
    }

    refreshSubscribersStation() {
        const el = document.getElementById('body-station-subs');
        if (el) {
            el.innerHTML = this.renderSubscribersStation();
            this.bindInternalStationActions();
        }
    }

    refreshAdviceStation() {
        const el = document.getElementById('body-station-advice');
        if (el) {
            el.innerHTML = this.renderAdviceStation();
            this.bindInternalStationActions();
        }
    }

    refreshAllDynamicStations() {
        this.refreshRadarStation();
        this.refreshShowcaseStation();
        this.refreshLeaderboardStation();
        const aEl = document.getElementById('body-station-analytics');
        if (aEl) aEl.innerHTML = this.renderAnalyticsStation();
    }

    /**
     * Раскладка станций в 3D пространстве
     */
    applyLayout(layout = 'orbit', animated = true) {
        this.currentLayout = layout;
        if (animated) {
            this.triggerMeteorShower(10);
        }
        if (!this.stations || this.stations.length === 0) return;
        const total = this.stations.length;
        const radius = 940;

        this.stations.forEach((station, i) => {
            let baseRotY = 0;
            let baseRotX = 0;
            let baseTransX = 0;
            let baseTransY = 0;
            let baseTransZ = 0;

            if (layout === 'orbit') {
                const angleDeg = i * (360 / total);
                baseRotY = angleDeg;
                baseTransZ = -radius;
            } else if (layout === 'arc') {
                // Панорамная дуга перед глазами (-105° ... +105°)
                const spread = 210;
                const angleDeg = -spread / 2 + (i / (total - 1)) * spread;
                baseRotY = angleDeg;
                baseTransZ = -980;
            } else if (layout === 'grid') {
                // Двухуровневая сетка
                const cols = 4;
                const col = i % cols;
                const row = Math.floor(i / cols);

                const colAngle = (col - (cols - 1) / 2) * 38;
                baseRotY = colAngle;
                baseRotX = (row === 0) ? -12 : 12;
                baseTransY = (row === 0) ? -230 : 230;
                baseTransZ = -920;
            }

            station.baseTransform = {
                rotY: baseRotY,
                rotX: baseRotX,
                transX: baseTransX,
                transY: baseTransY,
                transZ: baseTransZ
            };

            this.updateObjectTransform(station, animated);
        });

        if (animated) {
            if (layout === 'orbit') SpaceAudio.playVoice('layout_orbit');
            else if (layout === 'arc') SpaceAudio.playVoice('layout_arc');
            else if (layout === 'grid') SpaceAudio.playVoice('layout_grid');
        }

        this.updateHudTelemetry();
    }

    /**
     * Обновление CSS 3D трансформации конкретного объекта
     */
    updateObjectTransform(station, animated = false) {
        const wrapper = document.getElementById(`obj-${station.id}`);
        if (!wrapper || !station.baseTransform) return;

        // Если окно развернуто на весь экран — выдвигаем его вперед к пользователю
        if (this.expandedStation === station) {
            const b = station.baseTransform;
            wrapper.style.transition = animated ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
            wrapper.style.transform = `
                rotateY(${b.rotY}deg)
                rotateX(${b.rotX}deg)
                translate3d(${b.transX}px, ${b.transY}px, ${b.transZ + 380}px)
            `;
            return;
        }

        const b = station.baseTransform;
        const c = station.customOffset || { x: 0, y: 0, z: 0 };
        const elevationZ = (this.activeDraggedObject === station) ? 60 : 0;

        wrapper.style.transition = animated ? 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
        wrapper.style.transform = `
            rotateY(${b.rotY}deg)
            rotateX(${b.rotX}deg)
            translate3d(${b.transX + c.x}px, ${b.transY + c.y}px, ${b.transZ + c.z + elevationZ}px)
        `;
    }

    /**
     * Начало перетаскивания станции в 3D
     */
    startDraggingObject(station, wrapper, e) {
        this.activeDraggedObject = station;
        this.dragObjectStartPointer = { x: e.clientX, y: e.clientY };
        this.dragObjectInitialOffset = { ...station.customOffset };

        wrapper.classList.add('is-dragging');
        this.updateObjectTransform(station, false);
        SpaceAudio.playVoice('drag_start');

        const onObjPointerMove = (moveEv) => {
            if (this.activeDraggedObject !== station) return;

            const dx = moveEv.clientX - this.dragObjectStartPointer.x;
            const dy = moveEv.clientY - this.dragObjectStartPointer.y;

            station.customOffset.x = this.dragObjectInitialOffset.x + dx * 1.3;
            station.customOffset.y = this.dragObjectInitialOffset.y + dy * 1.3;

            this.updateObjectTransform(station, false);
        };

        const onObjPointerUp = () => {
            wrapper.classList.remove('is-dragging');
            this.activeDraggedObject = null;
            this.updateObjectTransform(station, true);

            window.removeEventListener('pointermove', onObjPointerMove);
            window.removeEventListener('pointerup', onObjPointerUp);
            window.removeEventListener('pointercancel', onObjPointerUp);

            SpaceAudio.playVoice('drag_end');
            this.showSpatialToast(`Станция «${station.title}» зафиксирована в новой позиции`);
        };

        window.addEventListener('pointermove', onObjPointerMove, { passive: true });
        window.addEventListener('pointerup', onObjPointerUp);
        window.addEventListener('pointercancel', onObjPointerUp);
    }

    /**
     * Универсальный tween-хелпер камеры: плавный долли/фокус вместо телепорта.
     * easeInOutCubic, дуга по yaw выбирается по кратчайшему пути.
     */
    tweenCameraTo(targetYaw, targetPitch, targetZoom, duration = 1400) {
        const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
        const fromYaw = this.yaw;
        // Кратчайшая дуга по азимуту
        let dYaw = ((targetYaw - fromYaw + 180) % 360 + 360) % 360 - 180;
        this.camTween = {
            start: performance.now(),
            duration: Math.max(200, duration),
            fromYaw,
            dYaw,
            fromPitch: this.pitch,
            dPitch: targetPitch - this.pitch,
            fromZoom: this.zoom,
            dZoom: targetZoom - this.zoom,
            toYaw: fromYaw + dYaw,
            toPitch: targetPitch,
            toZoom: targetZoom,
            ease
        };
        // Обнуляем пружинную скорость, чтобы не было рывка в конце
        this.camVelYaw = 0;
        this.camVelPitch = 0;
        this.camVelZoom = 0;
    }

    /**
     * Кинематографический контроллер прилёта (SpaceCinematic).
     * Пока контроллер активен, renderLoop берёт целевые yaw/pitch/zoom из него
     * вместо авто-тура/tween. Контроллер сбрасывается при любом пользовательском
     * вводе (pointerdown/wheel/keydown — слушает сам) или при close().
     */
    setCinematicController(controller) {
        this.cinematicController = controller || null;
        if (controller) {
            // Авто-тур и tween уступают кинематографике
            this.isAutoTour = false;
            this.camTween = null;
            const btn = document.getElementById('space-dock-auto-tour');
            if (btn) btn.classList.remove('active');
        } else {
            this.cineRoll = 0;
            // Кинематика закончилась — снимаем холд адаптивного разрешения
            if (this.glEnabled && Space3DGL.ok) {
                try { Space3DGL.endCinematicHold(); } catch (e) { /* noop */ }
            }
        }
    }

    /**
     * Прогрев тяжёлых ресурсов к кинематографическому прилёту.
     * Вызывается по событию 'aurora:warp-started' (space_warp.js): у варпа есть
     * 9-22с запаса — ВСЯ дорогая подготовка (декодирование 4K-текстур, bake
     * скайдома, компиляция GPU-пайплайна, загрузка шрифта титра) обязана
     * закончиться В варпе, чтобы фазы A/B прилёта шли без хичей.
     */
    prepareForWarpArrival() {
        if (!this.viewport) {
            try { this.init(); } catch (e) { /* noop */ }
        }
        // 1. GPU-ядро: текстуры + bake + resize + один скрытый кадр рендера
        if (this.glEnabled && Space3DGL.ok) {
            try { Space3DGL.preWarm(this); } catch (e) {
                console.warn('[Space3D] Прогрев GPU-ядра не удался:', e);
            }
        }
        // 2. Шрифт титра и заставки: прогреваем Shoptronic SP (ofont.ru/view/6037)
        // и Unbounded, чтобы первый кадр не мерцал системным шрифтом.
        try {
            if (document.fonts && document.fonts.load) {
                const sample = 'Галактика Млечный Путь. Планета Земля. 2026 ▍ AURORA';
                document.fonts.load('32px "Shoptronic SP"', sample);
                document.fonts.load('700 32px "Shoptronic SP"', sample);
                document.fonts.load('700 32px Unbounded', sample);
            }
        } catch (e) { /* noop */ }
    }

    /**
     * Мягкое сопротивление pitch у границ (вместо жёсткого clamp):
     * за пределом движение сильно демпфируется, а пружина в renderLoop
     * плавно возвращает цель в допустимый диапазон.
     */
    softPitchLimit(p) {
        const L = this.pitchSoftLimit;
        if (p > L) return L + (p - L) * 0.22;
        if (p < -L) return -L + (p + L) * 0.22;
        return p;
    }

    /**
     * Каскадное появление карточек-станций при open() (stagger 60мс)
     */
    playOpenStagger() {
        if (!this.world) return;
        const cards = this.world.querySelectorAll('.space-station-card');
        cards.forEach((card, i) => {
            card.style.transition = 'none';
            card.style.opacity = '0';
            requestAnimationFrame(() => {
                card.style.transition = `opacity 0.7s ease ${i * 60}ms`;
                card.style.opacity = '1';
            });
        });
    }

    /**
     * Фокусировка камеры прямо на станции
     */
    focusOnStation(station) {
        if (!station.baseTransform) return;
        this.isAutoTour = false;
        const autoTourBtn = document.getElementById('space-dock-auto-tour');
        if (autoTourBtn) autoTourBtn.classList.remove('active');

        // Конвенция DOM: rotateX(pitch) rotateY(yaw) → для центрирования
        // объекта с собственной ориентацией нужны обратные углы.
        // Кинематографический tween вместо мгновенного телепорта.
        this.tweenCameraTo(
            -station.baseTransform.rotY,
            -station.baseTransform.rotX,
            1.15,
            1400
        );

        this.triggerGravitationalWave(station.baseTransform.rotY, -station.baseTransform.rotX);
        SpaceAudio.playVoice('focus');
        this.showSpatialToast(`Фокус: ${station.title}`);
    }

    /**
     * Обработчики мыши/тача для вращения мира
     */
    setupEventListeners() {
        if (!this.viewport) return;

        this.viewport.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove, { passive: false });
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
        this.viewport.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', this.onResize);
    }

    onPointerDown(e) {
        if (e.target.closest('.space-station-card') || e.target.closest('.space-3d-hud-dock') || e.target.closest('.space-3d-hud-top') || e.target.closest('.space-3d-hint')) {
            return;
        }

        this.isDraggingWorld = true;
        this.lastInteractionTime = performance.now();
        this.camTween = null; // пользователь перехватывает камеру — tween отменяется
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartYaw = this.yaw;
        this.dragStartPitch = this.pitch;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.viewport.classList.add('is-panning');

        if (this.isAutoTour) {
            this.isAutoTour = false;
            const btn = document.getElementById('space-dock-auto-tour');
            if (btn) btn.classList.remove('active');
        }
    }

    onPointerMove(e) {
        // Параллакс мыши: лёгкое смещение взгляда от позиции курсора
        // (отключается во время драга мира/объекта)
        if (this.isOpen && !this.isDraggingWorld) {
            this.mouseNX = e.clientX / Math.max(1, window.innerWidth) - 0.5;
            this.mouseNY = e.clientY / Math.max(1, window.innerHeight) - 0.5;
        }

        if (!this.isDraggingWorld) return;

        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;

        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        const sensitivity = 0.28;
        this.lastInteractionTime = performance.now();
        this.targetYaw -= deltaX * sensitivity;
        // Мягкое сопротивление вместо жёсткого clamp: за границей движение
        // сильно демпфируется, пружина в renderLoop дотягивает назад.
        this.targetPitch = this.softPitchLimit(this.targetPitch + deltaY * sensitivity);

        // Если режим 360° выключен — удерживаем взгляд строго в передней командной дуге
        if (!this.is360Mode) {
            this.targetYaw = Math.max(-38, Math.min(38, this.targetYaw));
            this.targetPitch = Math.max(-18, Math.min(18, this.targetPitch));
        }
    }

    onPointerUp() {
        if (this.isDraggingWorld) {
            const rotDist = Math.hypot(this.yaw - (this.dragStartYaw ?? this.yaw), this.pitch - (this.dragStartPitch ?? this.pitch));
            if (rotDist > 25) {
                SpaceAudio.playVoice('cam_rotate');
            }
        }
        this.isDraggingWorld = false;
        if (this.viewport) this.viewport.classList.remove('is-panning');
    }

    onWheel(e) {
        if (!this.isOpen) return;
        if (e.target.closest('.space-card-body')) return;

        e.preventDefault();
        this.lastInteractionTime = performance.now();
        this.camTween = null;
        const zoomDelta = e.deltaY * -0.0012;
        this.targetZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.targetZoom + zoomDelta));
        this.updateHudTelemetry();

        if (zoomDelta > 0.04) {
            SpaceAudio.playVoice('zoom_in');
        } else if (zoomDelta < -0.04) {
            SpaceAudio.playVoice('zoom_out');
        }
    }

    onKeyDown(e) {
        if (!this.isOpen) return;
        this.lastInteractionTime = performance.now();

        if (e.key === 'Escape') {
            // Если развернуто отдельное окно — сворачиваем его
            if (this.expandedStation) {
                this.toggleExpandStation(this.expandedStation);
            } else {
                this.close();
            }
        } else if ((e.key === '3' || e.key === 'з' || e.key === 'З') && !e.target.matches('input, textarea, select')) {
            this.toggle360Mode();
        } else if ((e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'ч') && !e.target.matches('input, textarea, select')) {
            this.triggerSupernova();
        } else if (e.key.toLowerCase() === 'r' && !e.target.matches('input, textarea, select')) {
            this.resetCamera();
        } else if (e.key.toLowerCase() === 't' && !e.target.matches('input, textarea, select')) {
            this.toggleAutoTour();
        }
    }

    onResize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.glEnabled) {
            try {
                Space3DGL.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
            } catch (e) { /* noop */ }
        }
    }

    /**
     * Пульт управления HUD
     */
    setupHudControls() {
        // Переключатель режима 360° (ВКЛ / ВЫКЛ)
        const toggle360Btn = document.getElementById('space-360-toggle-btn');
        if (toggle360Btn) {
            toggle360Btn.addEventListener('click', () => this.toggle360Mode());
        }

        // Кнопка запуска Сверхновой звезды
        const supernovaBtn = document.getElementById('space-dock-supernova');
        if (supernovaBtn) {
            supernovaBtn.addEventListener('click', () => this.triggerSupernova());
        }

        // Кнопка закрытия
        const closeBtn = document.getElementById('space-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Аудио-контроллеры
        const musicBtn = document.getElementById('space-music-btn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                const isMusicOn = SpaceAudio.toggleMusic();
                musicBtn.classList.toggle('muted', !isMusicOn);
                musicBtn.classList.toggle('active', isMusicOn);
                this.showSpatialToast(isMusicOn ? 'Космическая музыка включена' : 'Музыка выключена');
            });
        }

        const voiceBtn = document.getElementById('space-voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                const isVoiceOn = SpaceAudio.toggleVoice();
                voiceBtn.classList.toggle('muted', !isVoiceOn);
                voiceBtn.classList.toggle('active', isVoiceOn);
                this.showSpatialToast(isVoiceOn ? 'Голосовой ассистент включен' : 'Голос выключен');
                if (isVoiceOn) SpaceAudio.playVoice('welcome');
            });
        }

        // Подсказка / Справка
        const helpBtn = document.getElementById('space-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const hint = document.getElementById('space-3d-hint');
                if (hint) {
                    hint.style.display = (hint.style.display === 'none') ? 'block' : 'none';
                }
            });
        }

        const hintClose = document.getElementById('space-hint-close');
        if (hintClose) {
            hintClose.addEventListener('click', () => {
                const hint = document.getElementById('space-3d-hint');
                if (hint) hint.style.display = 'none';
            });
        }

        // Кнопки раскладок
        const orbitBtn = document.getElementById('space-dock-orbit');
        const arcBtn = document.getElementById('space-dock-arc');
        const gridBtn = document.getElementById('space-dock-grid');

        const setActiveLayoutBtn = (activeBtn) => {
            [orbitBtn, arcBtn, gridBtn].forEach(b => b && b.classList.remove('active'));
            if (activeBtn) activeBtn.classList.add('active');
        };

        if (orbitBtn) orbitBtn.addEventListener('click', () => {
            setActiveLayoutBtn(orbitBtn);
            this.applyLayout('orbit', true);
            this.showSpatialToast('Включена кольцевая орбита 360°');
        });

        if (arcBtn) arcBtn.addEventListener('click', () => {
            setActiveLayoutBtn(arcBtn);
            this.applyLayout('arc', true);
            this.showSpatialToast('Включена панорамная дуга');
        });

        if (gridBtn) gridBtn.addEventListener('click', () => {
            setActiveLayoutBtn(gridBtn);
            this.applyLayout('grid', true);
            this.showSpatialToast('Включена сетка терминалов');
        });

        // Авто-тур
        const autoTourBtn = document.getElementById('space-dock-auto-tour');
        if (autoTourBtn) autoTourBtn.addEventListener('click', () => this.toggleAutoTour());

        // Сброс камеры
        const resetCamBtn = document.getElementById('space-dock-reset-cam');
        if (resetCamBtn) resetCamBtn.addEventListener('click', () => this.resetCamera());

        // Сброс позиций
        const resetPosBtn = document.getElementById('space-dock-reset-pos');
        if (resetPosBtn) resetPosBtn.addEventListener('click', () => {
            this.stations.forEach(st => {
                st.customOffset = { x: 0, y: 0, z: 0 };
                st.isPinned = false;
                const wrap = document.getElementById(`obj-${st.id}`);
                if (wrap) {
                    wrap.classList.remove('is-pinned');
                    const pinBtn = wrap.querySelector('.btn-pin');
                    if (pinBtn) pinBtn.classList.remove('active');
                }
            });
            this.applyLayout(this.currentLayout, true);
            SpaceAudio.playVoice('reset_positions');
            this.showSpatialToast('Все объекты возвращены в исходный строй');
        });

        // Перемещение объектов
        const dragToggleBtn = document.getElementById('space-dock-drag-all');
        if (dragToggleBtn) dragToggleBtn.addEventListener('click', () => {
            this.freeDragEnabled = !this.freeDragEnabled;
            dragToggleBtn.classList.toggle('active', this.freeDragEnabled);
            dragToggleBtn.querySelector('span:last-child').textContent = this.freeDragEnabled ? 'Перемещение: ВКЛ' : 'Перемещение: ВЫКЛ';
            this.showSpatialToast(this.freeDragEnabled ? 'Свободное перемещение объектов включено' : 'Перемещение заблокировано');
        });
    }

    syncAudioButtons() {
        const musicBtn = document.getElementById('space-music-btn');
        if (musicBtn) {
            musicBtn.classList.toggle('muted', !SpaceAudio.musicEnabled);
            musicBtn.classList.toggle('active', SpaceAudio.musicEnabled);
        }
        const voiceBtn = document.getElementById('space-voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.toggle('muted', !SpaceAudio.voiceEnabled);
            voiceBtn.classList.toggle('active', SpaceAudio.voiceEnabled);
        }
    }

    toggleAutoTour() {
        this.isAutoTour = !this.isAutoTour;
        this.lastInteractionTime = performance.now(); // ramp-up заново после включения
        const btn = document.getElementById('space-dock-auto-tour');
        if (btn) btn.classList.toggle('active', this.isAutoTour);
        SpaceAudio.playVoice(this.isAutoTour ? 'tour_start' : 'tour_stop');
        this.showSpatialToast(this.isAutoTour ? 'Авто-тур 360° запущен' : 'Авто-тур остановлен');
    }

    resetCamera() {
        this.tweenCameraTo(0, 0, 1.0, 1400);
        SpaceAudio.playVoice('cam_reset');
        this.showSpatialToast('Камера центрирована');
    }

    updateHudTelemetry() {
        const yawEl = document.getElementById('tele-yaw');
        const pitchEl = document.getElementById('tele-pitch');
        const zoomEl = document.getElementById('tele-zoom');
        const tapeEl = document.getElementById('space-compass-tape');

        const normYaw = (((this.yaw % 360) + 360) % 360);
        const normPitch = this.pitch.toFixed(0);
        const normZoom = (this.zoom * 100).toFixed(0);

        if (yawEl) yawEl.textContent = `${normYaw.toFixed(0)}°`;
        if (pitchEl) pitchEl.textContent = `${normPitch}°`;
        if (zoomEl) zoomEl.textContent = `${normZoom}%`;

        // Rockstar Games Cinematic Orbital Heading Tape: [ 045° NE // LEO ORBIT // ALT 418 KM ]
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
        const dirIdx = Math.round(normYaw / 45) % 8;
        const headingStr = `${String(Math.round(normYaw)).padStart(3, '0')}° ${dirs[dirIdx]}`;

        if (tapeEl) {
            tapeEl.textContent = `[ ${headingStr} // LEO ORBIT // ALT 418 KM ]`;
        }
    }

    showSpatialToast(msg) {
        let toast = document.getElementById('space-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'space-toast';
            toast.className = 'space-toast';
            if (this.viewport) this.viewport.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2600);
    }

    /**
     * Главный цикл рендеринга 60 FPS
     */
    renderLoop(now) {
        if (!this.isOpen) return;

        // Страховка: сбой в одном кадре не должен убивать всю rAF-цепочку сцены
        try {
            this._renderFrame(now);
        } catch (e) {
            console.error('[Space3D] Ошибка кадра (цикл продолжается):', e);
        }
        this.animId = requestAnimationFrame(this.renderLoop);
    }

    _renderFrame(now) {
        if (!this.isOpen) return;

        // Дельта времени кадра (для физики неба и планет на GPU)
        const t = typeof now === 'number' ? now : performance.now();
        this.lastDt = Math.min(0.05, Math.max(0.001, (t - (this.prevFrameTime || t)) / 1000));
        this.prevFrameTime = t;

        // --- FPS-счётчик для замеров производительности (window.__fps —
        // среднее за 1с, считается по НЕЗАЖАТОЙ дельте кадров) ---
        {
            const rawDt = (t - (this._fpsPrev || t)) / 1000;
            this._fpsPrev = t;
            if (rawDt > 0 && rawDt < 1) {
                this._fpsAcc = (this._fpsAcc || 0) + rawDt;
                this._fpsFrames = (this._fpsFrames || 0) + 1;
            }
            if ((this._fpsAcc || 0) >= 1) {
                window.__fps = this._fpsFrames / this._fpsAcc;
                this._fpsAcc = 0;
                this._fpsFrames = 0;
            }
        }

        const dt = this.lastDt || 0.016;

        // --- Кинематографический контроллер прилёта (приоритет над всем) ---
        // Покадрово задаёт targetYaw/Pitch/Zoom; пружина обнуляется, т.к. поза
        // уже гладкая. Любой пользовательский ввод сбрасывает контроллер извне.
        if (this.cinematicController && typeof this.cinematicController.getPose === 'function') {
            const pose = this.cinematicController.getPose(t);
            if (pose && this.cinematicController) {
                this.targetYaw = pose.yaw;
                this.targetPitch = pose.pitch;
                this.targetZoom = pose.zoom;
                this.yaw = pose.yaw;
                this.pitch = pose.pitch;
                this.zoom = pose.zoom;
                this.camVelYaw = 0;
                this.camVelPitch = 0;
                this.camVelZoom = 0;
                this.camTween = null;
                this.cineRoll = pose.roll || 0;
            } else {
                this.cinematicController = null;
                this.cineRoll = 0;
            }
        } else if (this.cineRoll) {
            // Мягкий спад крена после завершения кинематики
            this.cineRoll *= Math.pow(0.02, dt);
            if (Math.abs(this.cineRoll) < 0.02) this.cineRoll = 0;
        }

        // --- Кинематографический tween камеры (easeInOutCubic) ---
        if (this.camTween) {
            const tw = this.camTween;
            const raw = (t - tw.start) / tw.duration;
            const k = Math.min(1, Math.max(0, raw));
            const e = tw.ease(k);
            this.yaw = tw.fromYaw + tw.dYaw * e;
            this.pitch = tw.fromPitch + tw.dPitch * e;
            this.zoom = tw.fromZoom + tw.dZoom * e;
            // Держим цель синхронно, чтобы после завершения пружина не дёргала камеру
            this.targetYaw = this.yaw;
            this.targetPitch = this.pitch;
            this.targetZoom = this.zoom;
            if (k >= 1) this.camTween = null;
        }

        // --- Авто-вращение с переменной скоростью ---
        // idle ~4с → плавный smoothstep ramp-up ~3с к базовым 4.5°/с;
        // любое взаимодействие гасит скорость (idle-timer перезапускается).
        if (this.isAutoTour && !this.camTween) {
            const idleSec = (t - (this.lastInteractionTime || 0)) / 1000;
            const rampT = Math.min(1, Math.max(0, (idleSec - 4) / 3));
            const ramp = rampT * rampT * (3 - 2 * rampT); // smoothstep
            this.autoRotSpeed = this.autoRotBaseSpeed * ramp;
            this.targetYaw += this.autoRotSpeed * dt;

            // «Дыхание» сцены: медленный синусоидальный дрейф pitch ±3°, период ~40с
            const prevBreath = this.breathOffset || 0;
            this.breathPhase = (this.breathPhase || 0) + dt * (Math.PI * 2 / 40);
            this.breathOffset = 3 * Math.sin(this.breathPhase) * ramp;
            this.targetPitch += this.breathOffset - prevBreath;
        } else {
            this.autoRotSpeed = 0;
            this.breathPhase = 0;
            const prevBreath = this.breathOffset || 0;
            this.breathOffset = 0;
            this.targetPitch += this.breathOffset - prevBreath;
        }

        // --- Пружинная физика камеры (тяжёлая киношная инерция) ---
        // Коэффициенты нормированы на dt через экспоненциальное затухание:
        // камера ведёт себя одинаково на 60/120/144 Гц и при просадках.
        // damping 0.90 / stiffness 0.075 → массивнее и с мягким overshoot
        // после быстрого свайпа (недодемпфированная пружина).
        const dtF = dt * 60;                             // эквивалент кадров при 60 FPS
        const damping = Math.pow(0.90, dtF);
        const stiffness = 1 - Math.pow(1 - 0.075, dtF);

        // Мягкое пружинное сопротивление pitch у границ (±72°):
        // цель за пределом плавно подтягивается обратно внутрь диапазона.
        const pLimit = this.pitchSoftLimit;
        if (this.targetPitch > pLimit) this.targetPitch += (pLimit - this.targetPitch) * 0.06 * dtF;
        else if (this.targetPitch < -pLimit) this.targetPitch += (-pLimit - this.targetPitch) * 0.06 * dtF;

        this.camVelYaw = (this.camVelYaw || 0) * damping + (this.targetYaw - this.yaw) * stiffness;
        this.camVelPitch = (this.camVelPitch || 0) * damping + (this.targetPitch - this.pitch) * stiffness;
        this.camVelZoom = (this.camVelZoom || 0) * damping + (this.targetZoom - this.zoom) * stiffness;

        this.yaw += this.camVelYaw;
        this.pitch += this.camVelPitch;
        this.zoom += this.camVelZoom;

        // --- Параллакс мыши (±1.5°, сильное сглаживание lerp 0.03) ---
        // Отключён при драге и во время tween. Не влияет на состояние камеры.
        const parTargetYaw = this.isDraggingWorld || this.camTween ? 0 : this.mouseNX * -3.0;
        const parTargetPitch = this.isDraggingWorld || this.camTween ? 0 : this.mouseNY * 3.0;
        const parLerp = 1 - Math.pow(1 - 0.03, dtF);
        this.parallaxYaw = (this.parallaxYaw || 0) + (parTargetYaw - (this.parallaxYaw || 0)) * parLerp;
        this.parallaxPitch = (this.parallaxPitch || 0) + (parTargetPitch - (this.parallaxPitch || 0)) * parLerp;
        const effYaw = this.yaw + (this.parallaxYaw || 0);
        const effPitch = this.pitch + (this.parallaxPitch || 0);

        // Применяем 3D трансформацию мира
        if (this.world) {
            const eyeD = 1000;
            const zoomOffset = (this.zoom - 1.0) * 350;
            // Строку transform обновляем ТОЛЬКО при изменении позы > 0.01
            // (в неподвижной сцене 60 шаблонных строк в секунду не строятся).
            // Схема transform мира НЕ меняется (никаких дополнительных функций):
            // мир живёт на preserve-3d при perspective 960px и translateZ(1000px) —
            // любой grouping-свойство/лишняя 3D-функция на этом элементе или его
            // предках схлопывает сцену за камеру. Крен (roll) применяется к
            // .space-3d-stage (внутренний контейнер с перспективой), см. ниже.
            const yawQ = Math.round(effYaw * 100);
            const pitchQ = Math.round(effPitch * 100);
            const zoomQ = Math.round(zoomOffset * 100);
            if (this._lastWorldTf === undefined ||
                this._lastWorldTf.yaw !== yawQ || this._lastWorldTf.pitch !== pitchQ ||
                this._lastWorldTf.zoom !== zoomQ) {
                this._lastWorldTf = { yaw: yawQ, pitch: pitchQ, zoom: zoomQ };
                this.world.style.transform = `
                    translateZ(${eyeD + zoomOffset}px)
                    rotateX(${effPitch}deg)
                    rotateY(${effYaw}deg)
                `;
            }

            // Кинематографический крен камеры (roll): на stage-контейнере,
            // НЕ на world (stage — element с perspective, его собственный
            // rotateZ вокруг центра экрана не влияет на 3D-раскладку детей).
            if (this.stageEl) {
                const roll = this.cineRoll || 0;
                const rollStr = Math.abs(roll) > 0.01 ? `rotateZ(${roll.toFixed(3)}deg)` : '';
                if (this._lastRollTf !== rollStr) {
                    this._lastRollTf = rollStr;
                    this.stageEl.style.transform = rollStr;
                }
            }
        }

        // Обновляем кинематику вращения Земли и Луны (с синхронизацией крена камеры roll)
        if (this.glEnabled) Space3DGL.render(effYaw, effPitch, this.zoom, dt, this.cineRoll || 0);
        CelestialPlanets.update();
        IssStation.update();
        SatellitesSwarm.update();

        this.telemetryTick = (this.telemetryTick || 0) + 1;
        if (this.telemetryTick % 4 === 0) {
            this.updateHudTelemetry();
        }
        this.renderCanvasStarfield();

        // Кольцо Героев Космоса: вращение и раскладка карточек в 3D-мире
        CosmonautRing.update(t);
    }

    /**
     * Отрисовка звездного неба, планет Земля и Луна, и туманностей
     */
    renderCanvasStarfield() {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        const radYaw = (this.yaw * Math.PI) / 180;
        const radPitch = (this.pitch * Math.PI) / 180;

        const cosYaw = Math.cos(radYaw);
        const sinYaw = Math.sin(radYaw);
        const cosPitch = Math.cos(radPitch);
        const sinPitch = Math.sin(radPitch);

        const fov = 750 * this.zoom;
        const cx = w / 2;
        const cy = h / 2;

        const gpu = this.glEnabled && Space3DGL.ok;

        // 1. Отрисовка туманностей (только CPU-фолбэк)
        if (!gpu) this.nebulae.forEach(neb => {
            const nYaw = (neb.yaw * Math.PI) / 180;
            const nPitch = (neb.pitch * Math.PI) / 180;

            const nx = Math.cos(nPitch) * Math.sin(nYaw);
            const ny = Math.sin(nPitch);
            const nz = Math.cos(nPitch) * Math.cos(nYaw);

            const x1 = nx * cosYaw - nz * sinYaw;
            const z1 = nx * sinYaw + nz * cosYaw;
            const y2 = ny * cosPitch - z1 * sinPitch;
            const z2 = ny * sinPitch + z1 * cosPitch;

            if (z2 > 0.1) {
                const px = cx + (x1 / z2) * fov;
                const py = cy - (y2 / z2) * fov;
                const pRadius = (neb.radius / z2) * this.zoom;

                if (px > -pRadius && px < w + pRadius && py > -pRadius && py < h + pRadius) {
                    const grad = ctx.createRadialGradient(px, py, 0, px, py, pRadius);
                    grad.addColorStop(0, neb.coreColor);
                    grad.addColorStop(0.5, neb.color);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(px, py, pRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        // 2. Отрисовка Млечного Пути (батчинг по цветам: 2 вызова вместо 1350!)
        if (!gpu && this.milkyWayBatches) {
            for (let b = 0; b < this.milkyWayBatches.length; b++) {
                const batch = this.milkyWayBatches[b];
                if (!batch.stars || !batch.stars.length) continue;

                ctx.fillStyle = batch.color;
                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                const bLen = batch.stars.length;
                for (let i = 0; i < bLen; i++) {
                    const s = batch.stars[i];
                    const x1 = s.x * cosYaw - s.z * sinYaw;
                    const z1 = s.x * sinYaw + s.z * cosYaw;
                    const y2 = s.y * cosPitch - z1 * sinPitch;
                    const z2 = s.y * sinPitch + z1 * cosPitch;

                    if (z2 > 0.08) {
                        const px = cx + (x1 / z2) * fov;
                        const py = cy - (y2 / z2) * fov;

                        if (px >= 0 && px <= w && py >= 0 && py <= h) {
                            const r = Math.max(0.5, (s.size / z2) * 0.8 * this.zoom);
                            ctx.moveTo(px + r, py);
                            ctx.arc(px, py, r, 0, Math.PI * 2);
                        }
                    }
                }
                ctx.fill();
            }
        }

        // 3. Отрисовка звезд каталога (батчинг по 6 спектральным классам: 6 вызовов вместо 850!)
        const spikedStars = [];
        const brightStars = [];
        if (!gpu && this.starBatches) {
            for (let b = 0; b < this.starBatches.length; b++) {
                const batch = this.starBatches[b];
                if (!batch.stars || !batch.stars.length) continue;

                ctx.fillStyle = batch.color;
                ctx.globalAlpha = batch.alpha !== undefined ? batch.alpha : 0.90;
                ctx.beginPath();
                const sLen = batch.stars.length;
                for (let i = 0; i < sLen; i++) {
                    const s = batch.stars[i];
                    const x1 = s.x * cosYaw - s.z * sinYaw;
                    const z1 = s.x * sinYaw + s.z * cosYaw;
                    const y2 = s.y * cosPitch - z1 * sinPitch;
                    const z2 = s.y * sinPitch + z1 * cosPitch;

                    if (z2 > 0.08) {
                        const px = cx + (x1 / z2) * fov;
                        const py = cy - (y2 / z2) * fov;

                        if (px >= 0 && px <= w && py >= 0 && py <= h) {
                            s.twinklePhase += s.twinkleSpeed;
                            const pSize = Math.max(0.6, (s.size / z2) * 0.9 * this.zoom);
                            ctx.moveTo(px + pSize, py);
                            ctx.arc(px, py, pSize, 0, Math.PI * 2);

                            // Яркие звёзды получают ореол и лучи (как на оптике)
                            if (s.alpha > 0.7 && pSize > 1.05) {
                                brightStars.push({ px, py, pSize, color: s.coreColor || s.color });
                            }
                            if (s.hasSpike && pSize > 1.8) {
                                spikedStars.push({ px, py, pSize, coreColor: s.coreColor || '#ffffff' });
                            }
                        }
                    }
                }
                ctx.fill();
            }
        }

        // Ореолы ярких звёзд: аддитивное свечение оптики (bloom-имитация)
        if (brightStars.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < brightStars.length; i++) {
                const bs = brightStars[i];
                const haloR = Math.max(2.4, bs.pSize * 4.6);
                const grad = ctx.createRadialGradient(bs.px, bs.py, 0, bs.px, bs.py, haloR);
                grad.addColorStop(0, 'rgba(255,255,255,0.55)');
                grad.addColorStop(0.28, 'rgba(255,255,255,0.16)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(bs.px, bs.py, haloR, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Дифракционные 4-лучевые кресты для ярких звезд (единый батч линий)
        if (spikedStars.length > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.75;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            for (let i = 0; i < spikedStars.length; i++) {
                const sp = spikedStars[i];
                const spikeLen = sp.pSize * 2.8;
                ctx.moveTo(sp.px - spikeLen, sp.py);
                ctx.lineTo(sp.px + spikeLen, sp.py);
                ctx.moveTo(sp.px, sp.py - spikeLen);
                ctx.lineTo(sp.px, sp.py + spikeLen);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // 4. Отрисовка плавающих в невесомости космических микро-пылинок (3D Parallax Zero-G Motes)
        this.renderZeroGDustMotes(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);

        // 5. Отрисовка искажений пространства (гравитационные волны)
        this.renderGravitationalWaves(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);

        // 6. Отрисовка взрывов Сверхновых звезд
        this.renderSupernovae(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);

        // 6.5 Реальные созвездия звездного неба (линии астеризмов, звезды, телеметрия)
        Constellations.render(ctx, w, h, this.yaw, this.pitch, this.zoom);

        // 7. Земля и Луна: GPU-шейдеры (или CPU-фолбэк при отсутствии WebGL2)
        CelestialPlanets.render(ctx, w, h, this.yaw, this.pitch, this.zoom);

        // 7.5 Рой 60 спутников Земли на непересекающихся орбитах
        SatellitesSwarm.render(ctx, w, h, this.yaw, this.pitch, this.zoom);

        // 8. Отрисовка 3D Международной Космической Станции (МКС)
        IssStation.render(ctx, w, h, this.yaw, this.pitch, this.zoom);

        // 9. Rockstar Games Анаморфный солнечный блик и оптическая засветка объектива
        this.renderAnamorphicSunFlare(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);

        // 10. Метеоры и космические болиды
        this.renderMeteors(ctx, w, h);
    }

    /**
     * Отрисовка плавающих в невесомости микрочастиц космической пыли с 3D параллаксом
     */
    renderZeroGDustMotes(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        if (!this.dustMotes || this.dustMotes.length === 0) return;

        const count = this.dustMotes.length;
        for (let i = 0; i < count; i++) {
            const m = this.dustMotes[i];

            // Дрейф микрочастиц
            m.x += m.vx;
            m.y += m.vy;
            m.z += m.vz;

            // Границы объёма
            if (m.x > 700) m.x = -700;
            if (m.x < -700) m.x = 700;
            if (m.y > 500) m.y = -500;
            if (m.y < -500) m.y = 500;
            if (m.z > 900) m.z = 200;
            if (m.z < 200) m.z = 900;

            const x1 = m.x * cosYaw - m.z * sinYaw;
            const z1 = m.x * sinYaw + m.z * cosYaw;
            const y2 = m.y * cosPitch - z1 * sinPitch;
            const z2 = m.y * sinPitch + z1 * cosPitch;

            if (z2 > 60) {
                const px = cx + (x1 / z2) * (fov * 0.45);
                const py = cy - (y2 / z2) * (fov * 0.45);

                if (px >= 0 && px <= w && py >= 0 && py <= h) {
                    m.pulse += 0.02;
                    const pSize = Math.max(0.6, (m.size * 180) / z2);
                    const alpha = Math.min(0.75, (m.alpha * (Math.sin(m.pulse) * 0.25 + 0.75)));

                    ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(px, py, pSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * Запекание оптических спрайтов солнечного блика (выполняется один раз).
     *
     * Вместо 14 градиентов на кадр (GC-нагрузка и «наклеенный» вид) блик
     * рисуется как настоящая оптика: две запечённые текстуры —
     *   • sunSprite   — вейлинговая засветка, корона, ядро, 6 дифракционных
     *                   лучей диафрагмы, анаморфная сине-золотая полоса и пыль
     *                   на передней линзе;
     *   • ghostSprite — цепочка бликов диафрагмы вдоль оси «солнце → центр кадра».
     * Кадр стоит 2–4 вызова drawImage в режиме 'lighter'.
     */
    /**
     * Солнечная оптика кадра.
     *
     * Роль: рассчитать, где Солнце на экране, перекрыто ли оно планетой, и
     * передать это в две подсистемы:
     *   • GPU-ядро — рисует физический диск Солнца и его рассеяние (bloom);
     *   • 2D-оверлей — линзовые артефакты объектива (вуаль, призраки, лучи,
     *     анаморфная полоса), которые обязаны быть ПОВЕРХ сцены.
     *
     * Дополнительно здесь живёт автоэкспозиция «глаза»: когда Солнце в кадре,
     * сцена притемняется, как при реальной переадаптации зрения.
     */
    renderAnamorphicSunFlare(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        const optics = this.computeSunOptics(cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy);
        this.sunOptics = optics;

        // Глаз/камера переадаптируется к яркому источнику в кадре
        if (this.glEnabled && Space3DGL && Space3DGL.setOptics) {
            // Нейтральная экспозиция 1.0 сохраняет прежнюю яркость неба
            // (запечённый скайдом уже был рассчитан под ACES), а Солнце в
            // кадре притемняет сцену — как переадаптация зрения.
            const target = 1.0 / (1.0 + optics.onScreen * 0.30);
            this.eyeExposure = (this.eyeExposure === undefined ? target : this.eyeExposure + (target - this.eyeExposure) * 0.035);
            Space3DGL.setOptics({ exposure: this.eyeExposure });
        }

        if (!ctx || optics.onScreen <= 0 || optics.occlusion <= 0) return;

        SunOptics.render(ctx, {
            w, h,
            x: optics.x,
            y: optics.y,
            focalPx: fov,
            occlusion: optics.occlusion,
            intensity: optics.onScreen,
            flareScale: Math.min(2.0, 0.85 + this.zoom * 0.3),
            // На GPU диск и его свечение уже нарисованы физически — здесь
            // остаются только артефакты линзы (правильный слой композиции).
            mode: this.glEnabled && Space3DGL && Space3DGL.ok ? 'lens' : 'full'
        });
    }

    /**
     * Геометрия Солнца для кадра: экранные координаты, перекрытие, яркость.
     */
    computeSunOptics(cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        const lx = 0.72, ly = 0.28, lz = 0.63;

        // Поворот в систему координат камеры: R = RotX(pitch) · RotY(yaw)
        const x1 = lx * cosYaw - lz * sinYaw;
        const z1 = lx * sinYaw + lz * cosYaw;
        const y2 = ly * cosPitch - z1 * sinPitch;
        const z2 = ly * sinPitch + z1 * cosPitch;

        const sPx = cx + (x1 / Math.max(z2, 0.001)) * fov;
        const sPy = cy - (y2 / Math.max(z2, 0.001)) * fov;

        const result = { x: sPx, y: sPy, onScreen: 0, occlusion: 0, front: z2 > 0.05, behind: z2 <= 0.05 };

        if (!result.front) return result;

        // Насколько источник в кадре: мягкий спад к краю поля зрения
        const distFromCenter = Math.hypot(sPx - cx, sPy - cy);
        const maxVisibleDist = Math.max(cx, cy) * 2.15;
        const radial = 1 - Math.min(1, distFromCenter / maxVisibleDist);
        result.onScreen = Math.pow(radial, 0.75);

        if (distFromCenter > maxVisibleDist) return result;

        /* --- Перекрытие диском Земли (и Луны): точная угловая проверка --- */
        let occlusion = 1;
        const bodies = [];
        const metrics = CelestialPlanets && CelestialPlanets.getEarthWorldMetrics
            ? CelestialPlanets.getEarthWorldMetrics() : null;
        if (metrics) {
            bodies.push({
                yaw: metrics.coords.yaw,
                pitch: metrics.coords.pitch,
                // Синхронизировано с видимым диском: GL-сфера R=700 на dist=1470
                radius: this.glEnabled ? 700 : 840,
                dist: this.glEnabled ? 1470 : 750 / Math.max(this.zoom, 0.2),
                soften: 0.035
            });
        }
        // Луна перекрывает Солнце реже, но солнечные затмения — зрелищны
        bodies.push({
            yaw: 180 + Math.sin(this.moonOrbit || 0) * 12,
            pitch: 20 + Math.cos(this.moonOrbit || 0) * 4,
            radius: 220,
            dist: 1850,
            soften: 0.012
        });

        const dirLen = Math.hypot(x1, y2, z2) || 1;
        for (const b of bodies) {
            const bYaw = (b.yaw * Math.PI) / 180;
            const bPitch = (b.pitch * Math.PI) / 180;
            const bx = Math.cos(bPitch) * Math.sin(bYaw);
            const by = Math.sin(bPitch);
            const bz = Math.cos(bPitch) * Math.cos(bYaw);

            const bx1 = bx * cosYaw - bz * sinYaw;
            const bz1 = bx * sinYaw + bz * cosYaw;
            const by2 = by * cosPitch - bz1 * sinPitch;
            const bz2 = by * sinPitch + bz1 * cosPitch;
            if (bz2 <= 0.05) continue;

            const bLen = Math.hypot(bx1, by2, bz2) || 1;
            // Угловое расстояние Солнце—центр тела против углового радиуса тела
            const dot = (x1 * bx1 + y2 * by2 + z2 * bz2) / (dirLen * bLen);
            const angular = Math.atan2(b.radius, Math.max(b.dist, 1));
            const cosA = Math.cos(angular);
            const cover = Math.min(1, Math.max(0, (cosA - dot) / b.soften));
            occlusion = Math.min(occlusion, 1 - cover);
        }

        result.occlusion = occlusion;
        result.onScreen *= occlusion;
        return result;
    }

    /**
     * Отрисовка космических метеоров
     */
    renderMeteors(ctx, w, h) {
        if (Math.random() < 0.015 && this.meteors.length < 2) {
            this.meteors.push({
                x: Math.random() * w,
                y: Math.random() * (h * 0.4),
                len: Math.random() * 80 + 50,
                speed: Math.random() * 14 + 10,
                angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
                life: 1.0,
                fade: Math.random() * 0.025 + 0.018,
                color: '#ec4899'
            });
        }

        for (let m = this.meteors.length - 1; m >= 0; m--) {
            const met = this.meteors[m];
            const tailX = met.x - Math.cos(met.angle) * met.len;
            const tailY = met.y - Math.sin(met.angle) * met.len;

            const grad = ctx.createLinearGradient(tailX, tailY, met.x, met.y);
            grad.addColorStop(0, 'rgba(236, 72, 153, 0)');
            grad.addColorStop(1, `rgba(255, 255, 255, ${met.life})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(met.x, met.y);
            ctx.stroke();

            met.x += Math.cos(met.angle) * met.speed;
            met.y += Math.sin(met.angle) * met.speed;
            met.life -= met.fade;

            if (met.life <= 0) {
                this.meteors.splice(m, 1);
            }
        }
    }

    /**
     * Запуск взрыва Сверхновой звезды на фоне космоса
     */
    triggerSupernova(targetYaw = null, targetPitch = null, options = {}) {
        const yaw = targetYaw !== null ? targetYaw : (this.yaw + (Math.random() * 36 - 18));
        const pitch = targetPitch !== null ? targetPitch : (this.pitch + (Math.random() * 20 - 10));

        const particleCount = 110;
        const particles = [];
        const colors = ['#ffffff', '#ffffff', '#ec4899', '#38bdf8', '#818cf8', '#c084fc', '#f59e0b', '#fb7185'];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 8.5;
            const size = 1.2 + Math.random() * 3.4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push({
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                x: 0,
                y: 0,
                size,
                color,
                drag: 0.978 + Math.random() * 0.015,
                alpha: 1.0,
                fadeSpeed: 0.007 + Math.random() * 0.012
            });
        }

        this.supernovae.push({
            yaw,
            pitch,
            born: performance.now(),
            durationMs: 4400,
            particles,
            maxRadius: 280,
            coreColor: options.coreColor || '#ec4899',
            label: options.label || 'СВЕРХНОВАЯ'
        });

        SpaceAudio.playSupernovaSound();
        this.showSpatialToast(`Вспышка Сверхновой звезды в секторе ${Math.round(yaw)}°!`);
    }

    /**
     * Запуск метеорного потока через все поле зрения
     */
    triggerMeteorShower(count = 14) {
        const w = this.canvas ? this.canvas.width : window.innerWidth;
        const h = this.canvas ? this.canvas.height : window.innerHeight;
        for (let i = 0; i < count; i++) {
            this.meteors.push({
                x: Math.random() * w,
                y: Math.random() * (h * 0.5),
                len: Math.random() * 110 + 60,
                speed: Math.random() * 18 + 12,
                angle: Math.PI / 4 + (Math.random() * 0.4 - 0.2),
                life: 1.0,
                fade: Math.random() * 0.02 + 0.012,
                color: Math.random() > 0.5 ? '#ec4899' : '#38bdf8'
            });
        }
    }

    /**
     * Запуск гравитационного импульса искажения пространства
     */
    triggerGravitationalWave(targetYaw = null, targetPitch = null) {
        const yaw = targetYaw !== null ? targetYaw : this.yaw;
        const pitch = targetPitch !== null ? targetPitch : this.pitch;
        this.gravitationalWaves.push({
            yaw,
            pitch,
            born: performance.now(),
            radius: 10,
            maxRadius: 260,
            durationMs: 1600
        });
    }

    /**
     * Отрисовка взрывов Сверхновых звезд с релятивистскими ударными волнами
     */
    renderSupernovae(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        const now = performance.now();
        for (let i = this.supernovae.length - 1; i >= 0; i--) {
            const sn = this.supernovae[i];
            const elapsed = now - sn.born;
            const progress = elapsed / sn.durationMs;

            if (progress >= 1.0) {
                this.supernovae.splice(i, 1);
                continue;
            }

            const sYaw = (sn.yaw * Math.PI) / 180;
            const sPitch = (sn.pitch * Math.PI) / 180;

            const wx = Math.cos(sPitch) * Math.sin(sYaw);
            const wy = Math.sin(sPitch);
            const wz = Math.cos(sPitch) * Math.cos(sYaw);

            const x1 = wx * cosYaw - wz * sinYaw;
            const z1 = wx * sinYaw + wz * cosYaw;
            const y2 = wy * cosPitch - z1 * sinPitch;
            const z2 = wy * sinPitch + z1 * cosPitch;

            if (z2 <= 0.08) continue;

            const px = cx + (x1 / z2) * fov;
            const py = cy - (y2 / z2) * fov;

            ctx.save();

            // 1. Ослепительная вспышка ядра
            if (progress < 0.22) {
                const flashP = progress / 0.22;
                const flashAlpha = Math.sin(flashP * Math.PI);
                const flashRadius = (80 + flashP * 240) * (this.zoom / z2);

                const flashGrad = ctx.createRadialGradient(px, py, 0, px, py, flashRadius);
                flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                flashGrad.addColorStop(0.25, `rgba(62, 230, 255, ${flashAlpha * 0.9})`);
                flashGrad.addColorStop(0.65, `rgba(168, 85, 247, ${flashAlpha * 0.5})`);
                flashGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');

                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(px, py, flashRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. Расширяющиеся концентрические ударные волны
            const shockRadius = (sn.maxRadius * Math.pow(progress, 0.72) * 1.8) * (this.zoom / z2);
            const shockAlpha = Math.max(0, 1 - progress * 1.1);

            ctx.strokeStyle = `rgba(236, 72, 153, ${shockAlpha * 0.85})`;
            ctx.lineWidth = Math.max(1, 4 * (1 - progress));
            ctx.beginPath();
            ctx.arc(px, py, shockRadius, 0, Math.PI * 2);
            ctx.stroke();

            if (progress > 0.1) {
                const wave2Radius = shockRadius * 0.68;
                ctx.strokeStyle = `rgba(244, 114, 182, ${shockAlpha * 0.65})`;
                ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
                ctx.beginPath();
                ctx.arc(px, py, wave2Radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 3. Выбросы плазменных филаментов туманности
            sn.particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                p.dx *= p.drag;
                p.dy *= p.drag;
                p.alpha = Math.max(0, p.alpha - p.fadeSpeed);

                if (p.alpha <= 0) return;

                const partX = px + p.x * (this.zoom / z2);
                const partY = py + p.y * (this.zoom / z2);
                const pSize = Math.max(0.8, p.size * (this.zoom / z2) * (1 + progress * 0.5));

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha * shockAlpha;
                ctx.beginPath();
                ctx.arc(partX, partY, pSize, 0, Math.PI * 2);
                ctx.fill();
            });

            // 4. Остывающее ядро остатка сверхновой
            const remRadius = (45 + progress * 95) * (this.zoom / z2);
            const remAlpha = Math.max(0, (1 - progress) * 0.55);
            const remGrad = ctx.createRadialGradient(px, py, 0, px, py, remRadius);
            remGrad.addColorStop(0, `rgba(255, 255, 255, ${remAlpha})`);
            remGrad.addColorStop(0.35, `rgba(56, 189, 248, ${remAlpha * 0.7})`);
            remGrad.addColorStop(0.75, `rgba(147, 51, 234, ${remAlpha * 0.35})`);
            remGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = remGrad;
            ctx.beginPath();
            ctx.arc(px, py, remRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    /**
     * Отрисовка гравитационных волн
     */
    renderGravitationalWaves(ctx, w, h, cosYaw, sinYaw, cosPitch, sinPitch, fov, cx, cy) {
        const now = performance.now();
        for (let i = this.gravitationalWaves.length - 1; i >= 0; i--) {
            const gw = this.gravitationalWaves[i];
            const elapsed = now - gw.born;
            const progress = elapsed / gw.durationMs;

            if (progress >= 1.0) {
                this.gravitationalWaves.splice(i, 1);
                continue;
            }

            const sYaw = (gw.yaw * Math.PI) / 180;
            const sPitch = (gw.pitch * Math.PI) / 180;

            const wx = Math.cos(sPitch) * Math.sin(sYaw);
            const wy = Math.sin(sPitch);
            const wz = Math.cos(sPitch) * Math.cos(sYaw);

            const x1 = wx * cosYaw - wz * sinYaw;
            const z1 = wx * sinYaw + wz * cosYaw;
            const y2 = wy * cosPitch - z1 * sinPitch;
            const z2 = wy * sinPitch + z1 * cosPitch;

            if (z2 <= 0.08) continue;

            const px = cx + (x1 / z2) * fov;
            const py = cy - (y2 / z2) * fov;

            const radius = (gw.maxRadius * Math.pow(progress, 0.65)) * (this.zoom / z2);
            const alpha = Math.max(0, (1 - progress) * 0.75);

            ctx.save();
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 3 * (1 - progress);
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Внутреннее гармоническое кольцо
            ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(px, py, radius * 0.72, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    }

    /**
     * Открытие 3D пространства
     */
    open(opts = {}) {
        if (this.isOpen) return;
        this.isOpen = true;

        if (!this.viewport) this.init();
        if (!this.viewport) return;

        this.onResize();
        this.viewport.classList.remove('hidden');
        this.viewport.setAttribute('aria-hidden', 'false');
        document.body.classList.add('space-3d-active');

        // Возобновляем GPU-ядро космоса (было приостановлено при закрытии)
        if (this.glEnabled && Space3DGL.ok) {
            Space3DGL.resume();
            Space3DGL.resize(
                this.viewport.clientWidth || window.innerWidth,
                this.viewport.clientHeight || window.innerHeight,
                Math.min(window.devicePixelRatio || 1, 1.35)
            );
        }

        // Сброс камеры
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.targetZoom = 1.0;
        this.yaw = 0;
        this.pitch = 0;
        this.zoom = 1.0;
        this.camTween = null;
        this.camVelYaw = 0;
        this.camVelPitch = 0;
        this.camVelZoom = 0;
        this.breathPhase = 0;
        this.breathOffset = 0;
        this.parallaxYaw = 0;
        this.parallaxPitch = 0;
        this.autoRotSpeed = 0;
        this.lastInteractionTime = performance.now();
        // Сброс кэшей transform-строк: поза камеры вернулась к эталону open()
        this._lastWorldTf = undefined;
        this._lastRollTf = undefined;

        // Сброс любых кинематографических хвостов предыдущей сессии (защита от
        // close() во время прилёта и повторного open()): контроллер, крен,
        // blur-фильтры world-слоя, классы body. SpaceCinematic.end() идемпотентен.
        this.cinematicController = null;
        this.cineRoll = 0;
        // Холд DRS предыдущего прилёта больше не актуален (поставим заново ниже)
        if (this.glEnabled && Space3DGL.ok) {
            try { Space3DGL.endCinematicHold(); } catch (e) { /* noop */ }
        }
        document.body.classList.remove('space-cinematic-active');
        try { SpaceCinematic.end('close'); } catch (e) { /* noop */ }
        if (this.world) { this.world.style.filter = ''; this.world.style.transition = ''; }
        if (this.stageEl) this.stageEl.style.transform = ''; // сброс крена
        [this.canvas, document.getElementById('space-3d-gl')].forEach(el => {
            if (el) { el.style.filter = ''; el.style.transition = ''; el.style.transform = ''; }
        });

        cancelAnimationFrame(this.animId);
        this.animId = requestAnimationFrame(this.renderLoop);

        // Фоновая музыка должна звучать сразу после прилёта: если в localStorage
        // остался выключенный флаг — включаем принудительно и стартуем без долгого фейда
        if (!SpaceAudio.musicEnabled) {
            SpaceAudio.musicEnabled = true;
            try { localStorage.setItem('space3d_music_enabled', 'true'); } catch (e) { /* noop */ }
        }
        this.syncAudioButtons();
        if (!opts || !opts.fromWarp) {
            SpaceAudio.startAmbientMusic(SpaceAudio.musicVolume, 600, true);
            SpaceAudio.playVoice('aurora_welcome', true);
        } else {
            SpaceAudio.startAmbientMusic(SpaceAudio.musicVolume, 600, false);
        }

        // Кинематографический прилёт после варпа (15-18с): Approach → Orbit → Transition.
        // Кольцо космонавтов в этом случае каскадно показывается в фазе C.
        let cinematicStarted = false;
        if (opts && opts.fromWarp) {
            // Холд тяжёлых перестроек GPU-ядра на всё прилёта (+запас):
            // renderScale заморожен, bake в кадрах фаз A/B запрещён; если bake
            // не успел за варп — дожимается здесь, под шторкой варпа
            if (this.glEnabled && Space3DGL.ok) {
                try { Space3DGL.beginCinematicHold(20000); } catch (e) { /* noop */ }
            }
            try {
                cinematicStarted = SpaceCinematic.start(this);
            } catch (e) {
                console.warn('[Space3D] Кинематографический прилёт недоступен:', e);
                cinematicStarted = false;
            }
        }

        // Автоматически открываем кольцо окон с космонавтами (единственные окна в 3D пространстве)
        if (!cinematicStarted && typeof CosmonautRing !== 'undefined' && CosmonautRing.show) {
            CosmonautRing.show();
        }

        // Каскадное появление карточек-станций (stagger 60мс)
        this.playOpenStagger();

        this.showSpatialToast('Космо-пространство AURORA 3D • Орбитальный комплекс активен');
    }

    /**
     * Закрытие 3D пространства
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        // Останавливаем кинематографику прилёта (без показа кольца — сцена закрывается)
        if (this.cinematicController && typeof this.cinematicController.end === 'function') {
            try { this.cinematicController.end('close'); } catch (e) { /* noop */ }
        } else {
            try { SpaceCinematic.end('close'); } catch (e) { /* noop */ }
        }

        SpaceAudio.stopAmbientMusic(300, true);
        SpaceAudio.stopVoice();
        SpaceAudio.playVoice('exit_2d');

        cancelAnimationFrame(this.animId);

        if (this.viewport) {
            this.viewport.classList.add('hidden');
            this.viewport.setAttribute('aria-hidden', 'true');
        }

        // Приостанавливаем GPU-ядро: ресурсы сохраняются, кадры не тратятся впустую
        if (this.glEnabled && Space3DGL.ok) {
            try { Space3DGL.endCinematicHold(); } catch (e) { /* noop */ }
            Space3DGL.suspend();
        }
        if (CosmonautsTerminal && CosmonautsTerminal.isOpen) {
            CosmonautsTerminal.close();
        }
        if (CosmonautRing && CosmonautRing.isActive) {
            CosmonautRing.hide();
        }
        IssStation.hideOverlays();
        SatellitesSwarm.hideOverlays();
        Constellations.hideOverlays();
        document.body.classList.remove('space-3d-active');
        try { window.dispatchEvent(new CustomEvent('aurora:space3d-closed')); } catch (e) { /* noop */ }
    }

    /**
     * Переключение режима
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

export const Space3D = new Space3DEngine();
if (typeof window !== 'undefined') {
    window.Space3D = Space3D;
    // Старт варпа = сигнал к прогреву: 4K-текстуры, bake скайдома, один скрытый
    // кадр GPU-пайплайна и шрифт титра готовятся ЗАРАНЕЕ (у варпа 9-22с запаса),
    // чтобы кинематический прилёт (фазы A/B/C) шёл без хичей
    window.addEventListener('aurora:warp-started', () => {
        try { Space3D.prepareForWarpArrival(); } catch (e) { /* noop */ }
    }, { passive: true });
}
export default Space3D;
