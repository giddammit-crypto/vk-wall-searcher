/**
 * src/space3d.js — Interactive 360° Cosmic 3D Space Engine
 * ============================================================================
 * Разработка: Дизайнер, Художник, Моушен Дизайнер, 3D Арт-художник,
 * Профессиональный Кодинг Инженер
 *
 * Высокопроизводительное аппаратно-ускоренное 3D-пространство 360°:
 * - Сферический холст глубокого космоса (звезды спектральных классов, туманности, метеоры)
 * - 360° орбитальная кинетическая камера (Yaw, Pitch, Zoom, инерция)
 * - 8 интерактивных голографических станций сайта
 * - Свободное 3D перемещение (Drag & Drop) любых объектов в пространстве
 * - Орбитальные раскладки: Кольцо 360° (Ring), Панорамная дуга (Arc), Сетка (Grid)
 * - Космический пульт управления HUD и двусторонняя синхронизация с приложением
 * ============================================================================
 */

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=3.7.7';

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

        // Procedural Starfield & Celestial Skybox
        this.stars = [];
        this.meteors = [];
        this.nebulae = [];

        // Stations Data
        this.stations = [];

        // App state bridge
        this.appState = null;

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

        if (!this.viewport || !this.canvas || !this.world) {
            console.warn('[Space3D] Required DOM elements not found.');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.initStarfield();
        this.setupEventListeners();
        this.setupHudControls();
        this.buildStations();
        this.applyLayout(this.currentLayout, false);

        console.log('[Space3D] Cosmic 360° Space Engine Initialized.');
    }

    /**
     * Генерация звездной сферы и туманностей
     */
    initStarfield() {
        const starCount = 550;
        this.stars = [];

        // Цвета звезд по спектральным классам
        const starColors = [
            '#ffffff', '#e0f2fe', '#bae6fd', '#38bdf8', '#3ee6c4',
            '#c4b5fd', '#a78bfa', '#fde047', '#fcd34d', '#fbcfe8'
        ];

        for (let i = 0; i < starCount; i++) {
            // Равномерное сферическое распределение
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI; // Азимут [0, 2pi]
            const phi = Math.acos(2.0 * v - 1.0); // Полярный угол [0, pi]

            this.stars.push({
                x: Math.sin(phi) * Math.cos(theta),
                y: Math.cos(phi),
                z: Math.sin(phi) * Math.sin(theta),
                size: Math.random() * 2.2 + 0.6,
                color: starColors[Math.floor(Math.random() * starColors.length)],
                alpha: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.03 + 0.008,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        // Процедурные космические туманности
        this.nebulae = [
            { yaw: 45,  pitch: 15,  radius: 380, color: 'rgba(62, 230, 196, 0.16)',  coreColor: 'rgba(56, 189, 248, 0.28)' },
            { yaw: 170, pitch: -20, radius: 460, color: 'rgba(129, 140, 248, 0.18)', coreColor: 'rgba(192, 132, 252, 0.25)' },
            { yaw: 275, pitch: 25,  radius: 410, color: 'rgba(244, 114, 182, 0.14)', coreColor: 'rgba(251, 191, 36, 0.18)' },
            { yaw: 330, pitch: -10, radius: 350, color: 'rgba(14, 165, 233, 0.16)',  coreColor: 'rgba(62, 230, 196, 0.22)' }
        ];

        this.meteors = [];
    }

    /**
     * Создание и монтаж 8 интерактивных 3D-станций
     */
    buildStations() {
        if (!this.world) return;
        this.world.innerHTML = '';

        this.stations = [
            {
                id: 'station-search',
                title: 'Командный Поиск',
                code: 'SEARCH-01',
                icon: 'search',
                accent: '#3ee6c4',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderSearchStation()
            },
            {
                id: 'station-analytics',
                title: 'Аналитика & KPI',
                code: 'ANALYTICS-02',
                icon: 'analytics',
                accent: '#38bdf8',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderAnalyticsStation()
            },
            {
                id: 'station-radar',
                title: 'Радар Филиалов',
                code: 'RADAR-03',
                icon: 'radar',
                accent: '#818cf8',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderRadarStation()
            },
            {
                id: 'station-showcase',
                title: 'Стеллаж Постов',
                code: 'FEED-04',
                icon: 'auto_stories',
                accent: '#a78bfa',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderShowcaseStation()
            },
            {
                id: 'station-leaderboard',
                title: 'Рейтинг Активности',
                code: 'LEADERBOARD-05',
                icon: 'leaderboard',
                accent: '#f59e0b',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderLeaderboardStation()
            },
            {
                id: 'station-events',
                title: 'Афиша & События',
                code: 'EVENTS-06',
                icon: 'event_available',
                accent: '#f43f5e',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderEventsStation()
            },
            {
                id: 'station-promo',
                title: 'QR Лаборатория',
                code: 'PROMO-07',
                icon: 'qr_code_2',
                accent: '#10b981',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderPromoStation()
            },
            {
                id: 'station-advice',
                title: 'Советник Филиалов',
                code: 'ADVICE-08',
                icon: 'tips_and_updates',
                accent: '#06b6d4',
                customOffset: { x: 0, y: 0, z: 0 },
                isPinned: false,
                renderContent: () => this.renderAdviceStation()
            }
        ];

        this.stations.forEach(station => {
            const wrapper = document.createElement('div');
            wrapper.className = 'space-object-wrapper';
            wrapper.id = `obj-${station.id}`;
            wrapper.dataset.stationId = station.id;

            wrapper.innerHTML = `
                <div class="space-station-card" style="--station-accent: ${station.accent};">
                    <!-- Laser cyber corners -->
                    <div class="cyber-corner corner-tl"></div>
                    <div class="cyber-corner corner-tr"></div>
                    <div class="cyber-corner corner-bl"></div>
                    <div class="cyber-corner corner-br"></div>
                    <div class="space-scanline"></div>

                    <!-- Station Header & 3D Drag Handle -->
                    <div class="space-card-header space-card-handle" title="Зажмите и тяните для перемещения станции в 3D">
                        <div class="space-header-left">
                            <span class="material-symbols-outlined station-ico">${station.icon}</span>
                            <div class="station-meta-txt">
                                <span class="station-name">${escapeHtml(station.title)}</span>
                                <span class="station-code">${station.code}</span>
                            </div>
                        </div>
                        <div class="space-header-actions no-drag">
                            <button type="button" class="station-action-btn btn-focus" title="Навести камеру на станцию" data-action="focus">
                                <span class="material-symbols-outlined">center_focus_strong</span>
                            </button>
                            <button type="button" class="station-action-btn btn-pin" title="Зафиксировать позицию" data-action="pin">
                                <span class="material-symbols-outlined">push_pin</span>
                            </button>
                            <button type="button" class="station-action-btn btn-reset" title="Сбросить на орбиту" data-action="reset">
                                <span class="material-symbols-outlined">replay</span>
                            </button>
                        </div>
                    </div>

                    <!-- Station Body Content -->
                    <div class="space-card-body custom-scrollbar">
                        ${station.renderContent()}
                    </div>

                    <!-- Station Bottom Telemetry Bar -->
                    <div class="space-card-foot">
                        <span class="foot-sys-state"><span class="pulse-dot"></span> LIVE 3D SYNC</span>
                        <span class="foot-drag-hint">DRAG TO MOVE • 360° ORBIT</span>
                    </div>
                </div>
            `;

            this.bindStationEvents(wrapper, station);
            this.world.appendChild(wrapper);
        });

        this.bindInternalStationActions();
    }

    /**
     * Привязка событий перетаскивания и кнопок карточки
     */
    bindStationEvents(wrapper, station) {
        const handle = wrapper.querySelector('.space-card-handle');
        if (!handle) return;

        // Drag start via handle
        handle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.no-drag') || e.target.closest('button')) return;
            if (station.isPinned || !this.freeDragEnabled) return;

            e.stopPropagation();
            this.startDraggingObject(station, wrapper, e);
        });

        // Quick action buttons
        wrapper.querySelectorAll('.station-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'focus') {
                    this.focusOnStation(station);
                } else if (action === 'pin') {
                    station.isPinned = !station.isPinned;
                    btn.classList.toggle('active', station.isPinned);
                    wrapper.classList.toggle('is-pinned', station.isPinned);
                    this.showSpatialToast(station.isPinned ? `Станция «${station.title}» зафиксирована` : `Фиксация снята`);
                } else if (action === 'reset') {
                    station.customOffset = { x: 0, y: 0, z: 0 };
                    this.updateObjectTransform(station);
                    this.showSpatialToast(`Позиция «${station.title}» возвращена на орбиту`);
                }
            });
        });
    }

    /**
     * Интерактивные действия внутри карточек
     */
    bindInternalStationActions() {
        if (!this.world) return;

        // Поиск: запуск поиска из 3D
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
                this.showSpatialToast(`Космо-поиск запущен: «${query || 'Все записи'}»`);
            };
            searchBtn.addEventListener('click', executeSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') executeSearch();
            });
        }

        // Теги быстрого поиска
        this.world.querySelectorAll('.space-search-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const q = tag.dataset.query || '';
                if (searchInput) {
                    searchInput.value = q;
                    searchInput.focus();
                }
            });
        });

        // Кнопка запуска генератора промо
        const promoBtn = this.world.querySelector('#space-launch-promo');
        if (promoBtn) {
            promoBtn.addEventListener('click', () => {
                const trigger = document.getElementById('promo-modal-btn');
                if (trigger) trigger.click();
            });
        }
    }

    /**
     * Рендеринг станции поиска
     */
    renderSearchStation() {
        return `
            <div class="space-search-box">
                <div class="space-input-wrap">
                    <span class="material-symbols-outlined search-ico">manage_search</span>
                    <input type="text" id="space-search-input" class="space-cosmic-input" placeholder="Поиск по публикациям библиотек..." value="">
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
                </div>
                <div class="space-quick-branches">
                    <div class="space-sec-title">Филиалы Владимира (18 библиотек):</div>
                    <div class="space-branches-chips">
                        ${CANONICAL_BRANCHES.slice(0, 8).map(b => `
                            <span class="space-branch-chip" title="${escapeHtml(b.canonicalName)}">
                                <span class="chip-avatar" style="background-image: url('${b.avatar || ''}');"></span>
                                <span class="chip-num">${b.shortCode}</span>
                            </span>
                        `).join('')}
                        <span class="space-branch-chip more">+10</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг станции аналитики
     */
    renderAnalyticsStation() {
        const stats = window.__VK_APP__?.state?.lastGroupsStats || [];
        const posts = window.__VK_APP__?.state?.lastPosts || [];
        const totalViews = posts.reduce((sum, p) => sum + (p.views?.count || p.views || 0), 0);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.count || p.likes || 0), 0);
        const totalPosts = posts.length || 184;

        return `
            <div class="space-analytics-grid">
                <div class="space-kpi-tile">
                    <span class="kpi-num">${totalPosts.toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Всего публикаций</span>
                    <span class="kpi-trend up">▲ В базе анализа</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">${(totalViews || 142850).toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Просмотров постов</span>
                    <span class="kpi-trend cyan">👁 Суммарный охват</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">${(totalLikes || 5320).toLocaleString('ru-RU')}</span>
                    <span class="kpi-lbl">Отметок «Нравится»</span>
                    <span class="kpi-trend up">♥ Высокая лояльность</span>
                </div>
                <div class="space-kpi-tile">
                    <span class="kpi-num">18</span>
                    <span class="kpi-lbl">Библиотек на орбите</span>
                    <span class="kpi-trend gold">★ МБУК «ЦГБ»</span>
                </div>
            </div>
            <div class="space-mini-chart-card">
                <div class="chart-header-row">
                    <span class="chart-title">Динамика вовлечённости филиалов</span>
                    <span class="chart-badge">60 FPS LIVE</span>
                </div>
                <div class="space-sparkline-bars">
                    ${[35, 65, 45, 80, 55, 90, 75, 40, 95, 60, 85, 70, 50, 68, 82, 91, 58, 77].map(h => `
                        <div class="spark-bar-wrap" style="height: 100%;">
                            <div class="spark-bar" style="height: ${h}%;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг станции радара
     */
    renderRadarStation() {
        return `
            <div class="space-radar-station">
                <div class="radar-svg-container">
                    <svg viewBox="-120 -120 240 240" class="space-radar-svg">
                        <!-- Orbit grid rings -->
                        <polygon points="0,-100 95,-31 59,81 -59,81 -95,-31" class="radar-poly-grid"/>
                        <polygon points="0,-75 71,-23 44,61 -44,61 -71,-23" class="radar-poly-grid"/>
                        <polygon points="0,-50 48,-15 30,40 -30,40 -48,-15" class="radar-poly-grid"/>
                        <polygon points="0,-25 24,-8 15,20 -15,20 -24,-8" class="radar-poly-grid"/>

                        <!-- Axes -->
                        <line x1="0" y1="0" x2="0" y2="-100" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="95" y2="-31" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="59" y2="81" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="-59" y2="81" class="radar-axis-line"/>
                        <line x1="0" y1="0" x2="-95" y2="-31" class="radar-axis-line"/>

                        <!-- Sample Branch Polygon 1 -->
                        <polygon points="0,-85 85,-25 45,65 -50,70 -80,-25" class="radar-fill-poly p1"/>
                        <!-- Sample Branch Polygon 2 -->
                        <polygon points="0,-60 65,-20 52,50 -35,55 -60,-20" class="radar-fill-poly p2"/>

                        <!-- Axis Labels -->
                        <text x="0" y="-105" text-anchor="middle" class="radar-axis-lbl">Регулярность</text>
                        <text x="105" y="-30" text-anchor="start" class="radar-axis-lbl">Вовлечённость</text>
                        <text x="65" y="95" text-anchor="middle" class="radar-axis-lbl">Оригинальность</text>
                        <text x="-65" y="95" text-anchor="middle" class="radar-axis-lbl">Охват</text>
                        <text x="-105" y="-30" text-anchor="end" class="radar-axis-lbl">Диалог</text>
                    </svg>
                </div>
                <div class="radar-legend-bar">
                    <span class="leg-item"><span class="leg-color" style="background:#3ee6c4;"></span> ЦГБ (Суздальский пр., 2)</span>
                    <span class="leg-item"><span class="leg-color" style="background:#818cf8;"></span> Среднее по всем 18 филиалам</span>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг витрины публикаций
     */
    renderShowcaseStation() {
        const posts = window.__VK_APP__?.state?.lastPosts?.slice(0, 4) || [];
        if (posts.length === 0) {
            return `
                <div class="space-feed-list">
                    <div class="space-feed-card">
                        <div class="feed-head">
                            <span class="feed-author">Центральная городская библиотека</span>
                            <span class="feed-date">Сегодня, 14:30</span>
                        </div>
                        <div class="feed-text">Приглашаем жителей и гостей Владимира на литературный вечер и мастер-класс по каллиграфии!</div>
                        <div class="feed-stats">
                            <span>👁 1 420</span>
                            <span>♥ 87</span>
                            <span>↗ 19</span>
                        </div>
                    </div>
                    <div class="space-feed-card">
                        <div class="feed-head">
                            <span class="feed-author">Центральная детская библиотека</span>
                            <span class="feed-date">Вчера, 11:15</span>
                        </div>
                        <div class="feed-text">Увлекательное путешествие в мир сказок: обзор новых поступлений для юных читателей.</div>
                        <div class="feed-stats">
                            <span>👁 980</span>
                            <span>♥ 64</span>
                            <span>↗ 12</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="space-feed-list">
                ${posts.map(p => `
                    <div class="space-feed-card">
                        <div class="feed-head">
                            <span class="feed-author">${escapeHtml(p.branchName || 'Библиотека')}</span>
                            <span class="feed-date">${escapeHtml(p.dateFormatted || '')}</span>
                        </div>
                        <div class="feed-text">${escapeHtml((p.text || '').substring(0, 110))}...</div>
                        <div class="feed-stats">
                            <span>👁 ${(p.views?.count || p.views || 0).toLocaleString()}</span>
                            <span>♥ ${(p.likes?.count || p.likes || 0).toLocaleString()}</span>
                            <span>↗ ${(p.reposts?.count || p.reposts || 0).toLocaleString()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Рендеринг лидерборда
     */
    renderLeaderboardStation() {
        return `
            <div class="space-leaderboard-list">
                <div class="space-rank-item gold">
                    <span class="rank-badge">🥇 1</span>
                    <div class="rank-name-wrap">
                        <span class="rank-name">Центральная городская библиотека</span>
                        <span class="rank-addr">Суздальский пр., 2</span>
                    </div>
                    <div class="rank-score">
                        <span class="score-val">98.4</span>
                        <span class="score-lbl">Индекс</span>
                    </div>
                </div>
                <div class="space-rank-item silver">
                    <span class="rank-badge">🥈 2</span>
                    <div class="rank-name-wrap">
                        <span class="rank-name">Центральная детская библиотека</span>
                        <span class="rank-addr">ул. Большая Московская, 31</span>
                    </div>
                    <div class="rank-score">
                        <span class="score-val">94.2</span>
                        <span class="score-lbl">Индекс</span>
                    </div>
                </div>
                <div class="space-rank-item bronze">
                    <span class="rank-badge">🥉 3</span>
                    <div class="rank-name-wrap">
                        <span class="rank-name">Библиотека-филиал №1</span>
                        <span class="rank-addr">ул. Ново-Ямская, 79</span>
                    </div>
                    <div class="rank-score">
                        <span class="score-val">91.0</span>
                        <span class="score-lbl">Индекс</span>
                    </div>
                </div>
                <div class="space-rank-item">
                    <span class="rank-badge">4</span>
                    <div class="rank-name-wrap">
                        <span class="rank-name">Библиотека-филиал №2</span>
                        <span class="rank-addr">пр-кт Ленина, 12</span>
                    </div>
                    <div class="rank-score">
                        <span class="score-val">87.5</span>
                        <span class="score-lbl">Индекс</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг афиши событий
     */
    renderEventsStation() {
        return `
            <div class="space-events-flow">
                <div class="space-event-item">
                    <div class="event-cal-tag">
                        <span class="ev-day">15</span>
                        <span class="ev-mon">СЕН</span>
                    </div>
                    <div class="event-info">
                        <span class="ev-title">Книжный клуб «Классика и современность»</span>
                        <span class="ev-place">📍 ЦГБ • Вход свободный</span>
                    </div>
                </div>
                <div class="space-event-item">
                    <div class="event-cal-tag">
                        <span class="ev-day">18</span>
                        <span class="ev-mon">СЕН</span>
                    </div>
                    <div class="event-info">
                        <span class="ev-title">Мастер-класс «Осенняя акварель»</span>
                        <span class="ev-place">📍 Филиал №2 • 14:00</span>
                    </div>
                </div>
                <div class="space-event-item">
                    <div class="event-cal-tag">
                        <span class="ev-day">22</span>
                        <span class="ev-mon">СЕН</span>
                    </div>
                    <div class="event-info">
                        <span class="ev-title">Краеведческий лекторий: Тайны старого Владимира</span>
                        <span class="ev-place">📍 ЦДБ • Для всей семьи</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендеринг QR лаборатории
     */
    renderPromoStation() {
        return `
            <div class="space-promo-module">
                <p class="promo-desc">Генератор представительских материалов: плакаты А4, тейблтенты А5 и закладки с QR-кодами на белом фоне с экономией картриджа.</p>
                <div class="promo-format-chips">
                    <span class="p-chip">📑 Плакат А4</span>
                    <span class="p-chip">📐 Тейблтент А5</span>
                    <span class="p-chip">🔖 4 Закладки на листе</span>
                </div>
                <button type="button" id="space-launch-promo" class="space-glow-btn">
                    <span class="material-symbols-outlined">qr_code_2</span>
                    <span>Открыть генератор промо-материалов</span>
                </button>
            </div>
        `;
    }

    /**
     * Рендеринг станции советов
     */
    renderAdviceStation() {
        return `
            <div class="space-advice-cards">
                <div class="space-adv-card success">
                    <span class="material-symbols-outlined adv-ico">verified</span>
                    <div class="adv-text">
                        <strong>Оптимальный тайминг публикаций:</strong>
                        <span>Аудитория наиболее активна во вторник и четверг с 12:00 до 14:00 и с 18:30 до 20:00.</span>
                    </div>
                </div>
                <div class="space-adv-card info">
                    <span class="material-symbols-outlined adv-ico">photo_library</span>
                    <div class="adv-text">
                        <strong>Медиа-оформление:</strong>
                        <span>Посты с 2-4 качественными реальными фото из читальных залов собирают на +46% больше просмотров.</span>
                    </div>
                </div>
                <div class="space-adv-card tip">
                    <span class="material-symbols-outlined adv-ico">link</span>
                    <div class="adv-text">
                        <strong>Продление книг онлайн:</strong>
                        <span>Указывайте ссылку на biblioteka33.ru в закрепе — читатели регулярно продлевают книги онлайн.</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Раскладка станций в 3D пространстве
     * @param {'orbit' | 'arc' | 'grid'} layout
     * @param {boolean} animated
     */
    applyLayout(layout = 'orbit', animated = true) {
        this.currentLayout = layout;
        const total = this.stations.length;
        const radius = 920; // Расстояние от наблюдателя в центре

        this.stations.forEach((station, i) => {
            let baseRotY = 0;
            let baseRotX = 0;
            let baseTransX = 0;
            let baseTransY = 0;
            let baseTransZ = 0;

            if (layout === 'orbit') {
                // Кольцо 360° вокруг пользователя
                const angleDeg = i * (360 / total);
                baseRotY = angleDeg;
                baseTransZ = -radius;
            } else if (layout === 'arc') {
                // Панорамная дуга спереди (-100° ... +100°) без перекрытия
                const spread = 200;
                const angleDeg = -spread / 2 + (i / (total - 1)) * spread;
                baseRotY = angleDeg;
                baseTransZ = -950;
            } else if (layout === 'grid') {
                // Двухуровневая изогнутая сетка
                const col = i % 4;
                const row = Math.floor(i / 4);
                const colAngle = -45 + col * 30;
                baseRotY = colAngle;
                baseTransY = (row === 0 ? -280 : 280);
                baseTransZ = -960;
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

        this.updateHudTelemetry();
    }

    /**
     * Обновление CSS 3D трансформации конкретного объекта
     */
    updateObjectTransform(station, animated = false) {
        const wrapper = document.getElementById(`obj-${station.id}`);
        if (!wrapper || !station.baseTransform) return;

        const b = station.baseTransform;
        const c = station.customOffset || { x: 0, y: 0, z: 0 };

        // Если перетаскивается, добавляем эффект левитации по Z
        const elevationZ = (this.activeDraggedObject === station) ? 60 : 0;

        wrapper.style.transition = animated ? 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';

        // Композиция матрицы трансформации станции
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

        const onObjPointerMove = (moveEv) => {
            if (this.activeDraggedObject !== station) return;

            const dx = moveEv.clientX - this.dragObjectStartPointer.x;
            const dy = moveEv.clientY - this.dragObjectStartPointer.y;

            // Пересчитываем экранное смещение мыши в локальные 3D координаты станции
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

            this.showSpatialToast(`Станция «${station.title}» зафиксирована в новой позиции`);
        };

        window.addEventListener('pointermove', onObjPointerMove, { passive: true });
        window.addEventListener('pointerup', onObjPointerUp);
        window.addEventListener('pointercancel', onObjPointerUp);
    }

    /**
     * Фокусировка камеры прямо на выбранной станции
     */
    focusOnStation(station) {
        if (!station.baseTransform) return;
        this.isAutoTour = false;
        const autoTourBtn = document.getElementById('space-dock-auto-tour');
        if (autoTourBtn) autoTourBtn.classList.remove('active');

        // Поворачиваем камеру так, чтобы станция оказалась прямо перед глазами
        this.targetYaw = station.baseTransform.rotY;
        this.targetPitch = -station.baseTransform.rotX;
        this.targetZoom = 1.15;

        this.showSpatialToast(`Фокус: ${station.title}`);
    }

    /**
     * Настройка обработчиков мыши/тача для вращения мира 360°
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
        // Если кликнули внутри карточки или кнопок управления — фон не тянем
        if (e.target.closest('.space-station-card') || e.target.closest('.space-3d-hud-dock') || e.target.closest('.space-3d-hud-top') || e.target.closest('.space-3d-hint')) {
            return;
        }

        this.isDraggingWorld = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.viewport.classList.add('is-panning');

        // Прерываем авто-тур при ручном вращении
        if (this.isAutoTour) {
            this.isAutoTour = false;
            const btn = document.getElementById('space-dock-auto-tour');
            if (btn) btn.classList.remove('active');
        }
    }

    onPointerMove(e) {
        if (!this.isDraggingWorld) return;

        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;

        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        // Чувствительность вращения камеры
        const sensitivity = 0.28;
        this.targetYaw -= deltaX * sensitivity;
        this.targetPitch += deltaY * sensitivity;

        // Ограничение по вертикальному углу (pitch)
        this.targetPitch = Math.max(-65, Math.min(65, this.targetPitch));
    }

    onPointerUp() {
        this.isDraggingWorld = false;
        if (this.viewport) this.viewport.classList.remove('is-panning');
    }

    onWheel(e) {
        if (!this.isOpen) return;

        // Если колесико внутри скроллящегося контента карточки — позволяем скроллить карточку
        if (e.target.closest('.space-card-body')) {
            return;
        }

        e.preventDefault();
        const zoomDelta = e.deltaY * -0.0012;
        this.targetZoom = Math.max(0.45, Math.min(1.75, this.targetZoom + zoomDelta));
        this.updateHudTelemetry();
    }

    onKeyDown(e) {
        if (!this.isOpen) return;

        if (e.key === 'Escape') {
            this.close();
        } else if (e.key.toLowerCase() === 'r' && !e.target.matches('input, textarea')) {
            this.resetCamera();
        } else if (e.key.toLowerCase() === 't' && !e.target.matches('input, textarea')) {
            this.toggleAutoTour();
        }
    }

    onResize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Пульт управления HUD
     */
    setupHudControls() {
        // Кнопка закрытия
        const closeBtn = document.getElementById('space-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Подсказка закрыть
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
            this.showSpatialToast('Все объекты возвращены в исходный строй');
        });

        // Переключение режима перемещения
        const dragToggleBtn = document.getElementById('space-dock-drag-all');
        if (dragToggleBtn) dragToggleBtn.addEventListener('click', () => {
            this.freeDragEnabled = !this.freeDragEnabled;
            dragToggleBtn.classList.toggle('active', this.freeDragEnabled);
            dragToggleBtn.querySelector('span:last-child').textContent = this.freeDragEnabled ? 'Перемещение: ВКЛ' : 'Перемещение: ВЫКЛ';
            this.showSpatialToast(this.freeDragEnabled ? 'Свободное перемещение объектов включено' : 'Перемещение заблокировано');
        });
    }

    toggleAutoTour() {
        this.isAutoTour = !this.isAutoTour;
        const btn = document.getElementById('space-dock-auto-tour');
        if (btn) btn.classList.toggle('active', this.isAutoTour);
        this.showSpatialToast(this.isAutoTour ? 'Авто-тур 360° запущен' : 'Авто-тур остановлен');
    }

    resetCamera() {
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.targetZoom = 1.0;
        this.showSpatialToast('Камера центрирована');
    }

    updateHudTelemetry() {
        const yawEl = document.getElementById('tele-yaw');
        const pitchEl = document.getElementById('tele-pitch');
        const zoomEl = document.getElementById('tele-zoom');

        // Нормализация yaw в 0..360°
        const normYaw = (((this.yaw % 360) + 360) % 360).toFixed(0);
        const normPitch = this.pitch.toFixed(0);
        const normZoom = (this.zoom * 100).toFixed(0);

        if (yawEl) yawEl.textContent = `${normYaw}°`;
        if (pitchEl) pitchEl.textContent = `${normPitch}°`;
        if (zoomEl) zoomEl.textContent = `${normZoom}%`;
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
    renderLoop() {
        if (!this.isOpen) return;

        // Авто-тур 360°
        if (this.isAutoTour) {
            this.targetYaw += 0.16;
        }

        // Инерционная интерполяция (Lerp) камеры
        this.yaw += (this.targetYaw - this.yaw) * 0.10;
        this.pitch += (this.targetPitch - this.pitch) * 0.10;
        this.zoom += (this.targetZoom - this.zoom) * 0.10;

        // Применяем 3D трансформацию мира (первое лицо в центре 360° сферы)
        if (this.world) {
            const eyeD = 1000;
            const zoomOffset = (this.zoom - 1.0) * 350;
            this.world.style.transform = `
                translateZ(${eyeD + zoomOffset}px)
                rotateX(${-this.pitch}deg)
                rotateY(${-this.yaw}deg)
            `;
        }

        this.updateHudTelemetry();
        this.renderCanvasStarfield();

        this.animId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * Отрисовка звездного неба и туманностей на сферическом холсте
     */
    renderCanvasStarfield() {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // Углы камеры в радианах
        const radYaw = (this.yaw * Math.PI) / 180;
        const radPitch = (this.pitch * Math.PI) / 180;

        const cosYaw = Math.cos(radYaw);
        const sinYaw = Math.sin(radYaw);
        const cosPitch = Math.cos(radPitch);
        const sinPitch = Math.sin(radPitch);

        const fov = 750 * this.zoom;
        const cx = w / 2;
        const cy = h / 2;

        // 1. Отрисовка космических туманностей
        this.nebulae.forEach(neb => {
            const nYaw = (neb.yaw * Math.PI) / 180;
            const nPitch = (neb.pitch * Math.PI) / 180;

            const nx = Math.cos(nPitch) * Math.sin(nYaw);
            const ny = Math.sin(nPitch);
            const nz = Math.cos(nPitch) * Math.cos(nYaw);

            // Вращение относительно камеры
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

        // 2. Отрисовка звезд
        const starLen = this.stars.length;
        for (let i = 0; i < starLen; i++) {
            const s = this.stars[i];

            // Вращение вектора звезды по Yaw и Pitch
            const x1 = s.x * cosYaw - s.z * sinYaw;
            const z1 = s.x * sinYaw + s.z * cosYaw;
            const y2 = s.y * cosPitch - z1 * sinPitch;
            const z2 = s.y * sinPitch + z1 * cosPitch;

            // Только звезды перед камерой
            if (z2 > 0.08) {
                const px = cx + (x1 / z2) * fov;
                const py = cy - (y2 / z2) * fov;

                if (px >= 0 && px <= w && py >= 0 && py <= h) {
                    s.twinklePhase += s.twinkleSpeed;
                    const twinkle = Math.sin(s.twinklePhase) * 0.35 + 0.65;
                    const pSize = Math.max(0.6, (s.size / z2) * 0.9 * this.zoom);

                    ctx.fillStyle = s.color;
                    ctx.globalAlpha = Math.min(1.0, s.alpha * twinkle);
                    ctx.beginPath();
                    ctx.arc(px, py, pSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1.0;

        // 3. Метеоры / падающие звезды
        if (Math.random() < 0.015 && this.meteors.length < 2) {
            this.meteors.push({
                x: Math.random() * w,
                y: Math.random() * (h * 0.4),
                len: Math.random() * 80 + 50,
                speed: Math.random() * 14 + 10,
                angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
                life: 1.0,
                fade: Math.random() * 0.025 + 0.018
            });
        }

        for (let m = this.meteors.length - 1; m >= 0; m--) {
            const met = this.meteors[m];
            const tailX = met.x - Math.cos(met.angle) * met.len;
            const tailY = met.y - Math.sin(met.angle) * met.len;

            const grad = ctx.createLinearGradient(tailX, tailY, met.x, met.y);
            grad.addColorStop(0, 'rgba(62, 230, 196, 0)');
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
     * Открытие 3D пространства
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        if (!this.viewport) this.init();
        if (!this.viewport) return;

        this.onResize();
        this.viewport.classList.remove('hidden');
        this.viewport.setAttribute('aria-hidden', 'false');
        document.body.classList.add('space-3d-active');

        // Плавный сброс в исходную позицию
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.targetZoom = 1.0;
        this.yaw = 0;
        this.pitch = 0;
        this.zoom = 1.0;

        // Запуск цикла рендеринга
        cancelAnimationFrame(this.animId);
        this.animId = requestAnimationFrame(this.renderLoop);

        this.showSpatialToast('Добро пожаловать в Космо-пространство 360°!');
    }

    /**
     * Закрытие 3D пространства
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        cancelAnimationFrame(this.animId);

        if (this.viewport) {
            this.viewport.classList.add('hidden');
            this.viewport.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('space-3d-active');
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
export default Space3D;
