/**
 * src/cosmonauts_terminal.js — Бортовой терминал «Герои Космоса»
 * ============================================================================
 * Разработка: Художник, Дизайнер, 3D Дизайнер и Гейм-разработчик AURORA
 *
 * Особенности:
 * - Выдвижная консоль космического корабля прямо из верхнего меню 3D пространства
 * - 16 архивных фото реальных исследователей космоса с цитатами и фактами
 * - Автопереключение каждые 10 секунд с плавным индикатором прогресса
 * - Интеллектуальная пауза при наведении мыши (для комфортного чтения фактов)
 * - Звуковые сигналы Quindar-tone при смене космонавта
 * - Полная адаптивность для мобильных устройств, планшетов и широкоформатных мониторов
 * ============================================================================
 */

import { COSMONAUTS_DATA } from './cosmonauts_data.js?v=3.9.8';
import { SpaceAudio } from './space_audio.js?v=3.9.8';

export class CosmonautsTerminalEngine {
    constructor() {
        this.isOpen = false;
        this.currentIndex = 0;
        this.isPaused = false;
        this.isHoverPaused = false;
        this.timerInterval = null;
        this.elapsedMs = 0;
        this.slideDurationMs = 10000; // 10 секунд
        this.data = COSMONAUTS_DATA;
        this.panelEl = null;
        this.toggleBtn = null;
        this.spaceEngine = null;

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    /**
     * Инициализация терминала в 3D окружении
     */
    init(spaceEngine) {
        this.spaceEngine = spaceEngine;
        this.toggleBtn = document.getElementById('space-cosmonauts-btn');
        this.createOrBindPanel();
        this.bindEvents();
        console.log('[CosmonautsTerminal] Initialized with', this.data.length, 'space heroes.');
    }

    /**
     * Создание или привязка разметки панели в DOM
     */
    createOrBindPanel() {
        let panel = document.getElementById('space-cosmonauts-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'space-cosmonauts-panel';
            panel.className = 'space-cosmonauts-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Бортовой реестр Герои Космоса');

            panel.innerHTML = `
                <div class="cosmo-panel-frame">
                    <!-- Угловые метки визора корабля -->
                    <span class="cosmo-reticle reticle-tl"></span>
                    <span class="cosmo-reticle reticle-tr"></span>
                    <span class="cosmo-reticle reticle-bl"></span>
                    <span class="cosmo-reticle reticle-br"></span>

                    <!-- Лазерная полоса 10-секундного таймера -->
                    <div class="cosmo-progress-container" title="Таймер автопереключения (10 сек)">
                        <div id="cosmo-progress-bar" class="cosmo-progress-bar"></div>
                    </div>

                    <!-- Верхняя телеметрическая планка -->
                    <div class="cosmo-header-bar">
                        <div class="cosmo-header-title">
                            <span class="cosmo-beacon-dot"></span>
                            <span class="cosmo-header-tag">БОРТОВОЙ РЕЕСТР // СЕКТОР МКС</span>
                            <span id="cosmo-index-badge" class="cosmo-index-badge">[ 01 / 16 ]</span>
                            <span id="cosmo-callsign-badge" class="cosmo-callsign-badge">ПОЗЫВНОЙ: КЕДР</span>
                        </div>
                        <div class="cosmo-header-actions">
                            <div class="cosmo-timer-readout" id="cosmo-timer-readout" title="Автопереключение каждые 10 сек">10.0с</div>
                            <button id="cosmo-pause-btn" class="cosmo-btn-icon" title="Пауза / Продолжить автопереключение" aria-label="Пауза таймера">
                                <span class="material-symbols-outlined" id="cosmo-pause-icon">pause</span>
                            </button>
                            <button id="cosmo-close-btn" class="cosmo-close-btn" title="Свернуть терминал в верхнее меню" aria-label="Свернуть терминал">
                                <span class="material-symbols-outlined">expand_less</span>
                                <span class="cosmo-close-text">СВЕРНУТЬ</span>
                            </button>
                        </div>
                    </div>

                    <!-- Основное интерактивное тело карточки -->
                    <div class="cosmo-card-body" id="cosmo-card-body">
                        <!-- Левая колонка: Архивный портрет и телеметрия полетов -->
                        <div class="cosmo-col-photo">
                            <div class="cosmo-photo-wrapper">
                                <img id="cosmo-photo-img" src="" alt="Портрет космонавта" class="cosmo-photo-img" loading="eager" />
                                <div class="cosmo-photo-grid"></div>
                                <div class="cosmo-photo-scanline"></div>
                                <div id="cosmo-agency-tag" class="cosmo-agency-tag">СССР // Восток-1</div>
                            </div>
                            <div class="cosmo-stats-grid" id="cosmo-stats-grid">
                                <!-- Динамические метрики -->
                            </div>
                        </div>

                        <!-- Правая колонка: Персональные данные, цитата и исторический факт -->
                        <div class="cosmo-col-info">
                            <div class="cosmo-identity">
                                <h2 id="cosmo-name" class="cosmo-name">Юрий Алексеевич Гагарин</h2>
                                <div class="cosmo-subtitle-row">
                                    <span id="cosmo-title" class="cosmo-title-badge">Первый человек в космосе</span>
                                    <span id="cosmo-date" class="cosmo-date-badge">12 апреля 1961</span>
                                </div>
                            </div>

                            <blockquote class="cosmo-quote-box">
                                <span class="cosmo-quote-mark">“</span>
                                <p id="cosmo-quote-text" class="cosmo-quote-text"></p>
                            </blockquote>

                            <div class="cosmo-fact-box">
                                <div class="cosmo-fact-header">
                                    <span class="material-symbols-outlined cosmo-fact-icon">verified</span>
                                    <span class="cosmo-fact-label">ИСТОРИЧЕСКИЙ ФАКТ</span>
                                </div>
                                <p id="cosmo-fact-text" class="cosmo-fact-text"></p>
                            </div>

                            <!-- Навигационные кнопки и быстрый выбор -->
                            <div class="cosmo-nav-bar">
                                <div class="cosmo-nav-arrows">
                                    <button id="cosmo-prev-btn" class="cosmo-nav-btn" title="Предыдущий космонавт (Стрелка влево)" aria-label="Предыдущий">
                                        <span class="material-symbols-outlined">chevron_left</span>
                                        <span>НАЗАД</span>
                                    </button>
                                    <button id="cosmo-next-btn" class="cosmo-nav-btn" title="Следующий космонавт (Стрелка вправо)" aria-label="Следующий">
                                        <span>ВПЕРЁД</span>
                                        <span class="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                                <div class="cosmo-dots-bar" id="cosmo-dots-bar" title="Прямой переход к космонавту">
                                    <!-- 16 интерактивных кнопок -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const viewport = document.getElementById('space-3d-viewport') || document.body;
            viewport.appendChild(panel);
        }
        this.panelEl = panel;
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // 3.9.0: данные о космонавтах перенесены в 3D-пространство —
                // кнопка запускает «Кольцо Героев Космоса» (16 карточек,
                // вращающихся перед наблюдателем). Подробный реестр, который
                // раньше открывался этой кнопкой, доступен из HUD кольца,
                // поэтому прежняя панель остаётся полностью рабочей.
                if (window.CosmonautRing && typeof window.CosmonautRing.toggle === 'function') {
                    window.CosmonautRing.toggle();
                    return;
                }
                this.toggle();
            });
        }

        const closeBtn = document.getElementById('cosmo-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const prevBtn = document.getElementById('cosmo-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prev());
        }

        const nextBtn = document.getElementById('cosmo-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.next());
        }

        const pauseBtn = document.getElementById('cosmo-pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        // Интеллектуальная пауза таймера при наведении курсора на панель (комфортное чтение)
        if (this.panelEl) {
            this.panelEl.addEventListener('mouseenter', () => {
                this.isHoverPaused = true;
                this.updateTimerReadout();
            });
            this.panelEl.addEventListener('mouseleave', () => {
                this.isHoverPaused = false;
                this.updateTimerReadout();
            });
        }

        window.addEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(e) {
        if (!this.isOpen) return;

        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prev();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.next();
        } else if (e.key === ' ') {
            // Spacebar toggles pause
            if (e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.togglePause();
            }
        }
    }

    /**
     * Открыть выдвижной терминал
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        if (this.panelEl) {
            this.panelEl.classList.add('is-open');
        }
        if (this.toggleBtn) {
            this.toggleBtn.classList.add('active');
        }

        this.renderCosmonaut();
        this.startTimer();
        SpaceAudio.playQuindarTone(true);
    }

    /**
     * Закрыть выдвижной терминал (уезжает обратно в верхнее меню)
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.panelEl) {
            this.panelEl.classList.remove('is-open');
        }
        if (this.toggleBtn) {
            this.toggleBtn.classList.remove('active');
        }

        this.stopTimer();
        SpaceAudio.playQuindarTone(false);
    }

    /**
     * Переключение видимости терминала
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Переход к следующему космонавту
     */
    next(isAuto = false) {
        this.currentIndex = (this.currentIndex + 1) % this.data.length;
        this.resetTimer();
        this.renderCosmonaut();
        if (!isAuto) {
            SpaceAudio.playQuindarTone(true);
        }
    }

    /**
     * Переход к предыдущему космонавту
     */
    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.data.length) % this.data.length;
        this.resetTimer();
        this.renderCosmonaut();
        SpaceAudio.playQuindarTone(true);
    }

    /**
     * Прямой переход по индексу (0..15)
     */
    goTo(index) {
        if (index < 0 || index >= this.data.length || index === this.currentIndex) return;
        this.currentIndex = index;
        this.resetTimer();
        this.renderCosmonaut();
        SpaceAudio.playQuindarTone(true);
    }

    /**
     * Переключение ручной паузы таймера
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        const icon = document.getElementById('cosmo-pause-icon');
        const pauseBtn = document.getElementById('cosmo-pause-btn');

        if (icon) {
            icon.textContent = this.isPaused ? 'play_arrow' : 'pause';
        }
        if (pauseBtn) {
            pauseBtn.classList.toggle('active', this.isPaused);
        }
        this.updateTimerReadout();
    }

    /**
     * Сброс таймера на 0с
     */
    resetTimer() {
        this.elapsedMs = 0;
        const bar = document.getElementById('cosmo-progress-bar');
        if (bar) {
            bar.style.width = '0%';
        }
        this.updateTimerReadout();
    }

    /**
     * Запуск 10-секундного тикера автопереключения
     */
    startTimer() {
        this.stopTimer();
        this.resetTimer();

        this.timerInterval = setInterval(() => {
            if (!this.isOpen) return;

            // Если включена ручная пауза или пользователь читает (курсор над карточкой)
            if (this.isPaused || this.isHoverPaused) {
                return;
            }

            this.elapsedMs += 100;
            const pct = Math.min(100, (this.elapsedMs / this.slideDurationMs) * 100);

            const bar = document.getElementById('cosmo-progress-bar');
            if (bar) {
                bar.style.width = `${pct}%`;
            }

            this.updateTimerReadout();

            if (this.elapsedMs >= this.slideDurationMs) {
                this.next(true);
            }
        }, 100);
    }

    /**
     * Остановка тикера
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Обновление текстового дисплея таймера
     */
    updateTimerReadout() {
        const readout = document.getElementById('cosmo-timer-readout');
        if (!readout) return;

        if (this.isPaused) {
            readout.textContent = 'ПАУЗА';
            readout.classList.add('is-paused');
            return;
        }

        if (this.isHoverPaused) {
            readout.textContent = 'ЧТЕНИЕ';
            readout.classList.add('is-paused');
            return;
        }

        readout.classList.remove('is-paused');
        const remaining = Math.max(0, (this.slideDurationMs - this.elapsedMs) / 1000);
        readout.textContent = `${remaining.toFixed(1)}с`;
    }

    /**
     * Рендеринг активного космонавта
     */
    renderCosmonaut() {
        const c = this.data[this.currentIndex];
        if (!c) return;

        // 1. Бейджи заголовка
        const idxEl = document.getElementById('cosmo-index-badge');
        const callsignEl = document.getElementById('cosmo-callsign-badge');
        if (idxEl) {
            const curStr = String(this.currentIndex + 1).padStart(2, '0');
            const totStr = String(this.data.length).padStart(2, '0');
            idxEl.textContent = `[ ${curStr} / ${totStr} ]`;
        }
        if (callsignEl) {
            callsignEl.textContent = `ПОЗЫВНОЙ: ${c.callsign}`;
            callsignEl.style.borderColor = c.badgeColor || '#3ee6c4';
            callsignEl.style.color = c.badgeColor || '#3ee6c4';
        }

        // 2. Фотография и агентство
        const imgEl = document.getElementById('cosmo-photo-img');
        const agencyEl = document.getElementById('cosmo-agency-tag');
        if (imgEl) {
            imgEl.src = c.photo;
            imgEl.alt = c.name;
        }
        if (agencyEl) {
            agencyEl.textContent = c.agency;
        }

        // 3. Статистика полетов
        const statsGrid = document.getElementById('cosmo-stats-grid');
        if (statsGrid && c.stats) {
            const items = [];
            items.push({ label: 'ПОЛЁТЫ', val: `${c.stats.flights} мисс.` });
            items.push({ label: 'В КОСМОСЕ', val: c.stats.timeInSpace });

            if (c.stats.spacewalks !== undefined) {
                items.push({ label: 'ВЫХОД В ВКД', val: `${c.stats.spacewalks} раз` });
            } else if (c.stats.moonwalks !== undefined) {
                items.push({ label: 'НА ЛУНЕ', val: `${c.stats.moonwalks} вых.` });
            }

            const extraKey = c.stats.evaDuration ? { label: 'ВРЕМЯ ВКД', val: c.stats.evaDuration }
                : c.stats.moonDuration ? { label: 'НА ПОВЕРХНОСТИ', val: c.stats.moonDuration }
                : c.stats.orbitAltitude ? { label: 'АПОГЕЙ', val: c.stats.orbitAltitude }
                : c.stats.orbits ? { label: 'ВИТКИ', val: c.stats.orbits }
                : c.stats.spaceStations ? { label: 'СТАНЦИИ', val: c.stats.spaceStations }
                : null;

            if (extraKey) items.push(extraKey);

            statsGrid.innerHTML = items.map(it => `
                <div class="cosmo-stat-card">
                    <span class="cosmo-stat-label">${it.label}</span>
                    <span class="cosmo-stat-val">${it.val}</span>
                </div>
            `).join('');
        }

        // 4. Текстовая информация
        const nameEl = document.getElementById('cosmo-name');
        const titleEl = document.getElementById('cosmo-title');
        const dateEl = document.getElementById('cosmo-date');
        const quoteEl = document.getElementById('cosmo-quote-text');
        const factEl = document.getElementById('cosmo-fact-text');

        if (nameEl) nameEl.textContent = c.name;
        if (titleEl) titleEl.textContent = c.title;
        if (dateEl) dateEl.textContent = c.dates;
        if (quoteEl) quoteEl.textContent = c.quote;
        if (factEl) factEl.textContent = c.fact;

        // 5. Точки / нумераторы навигации
        this.renderDots();
    }

    /**
     * Рендеринг 16 номеров для быстрого выбора
     */
    renderDots() {
        const dotsBar = document.getElementById('cosmo-dots-bar');
        if (!dotsBar) return;

        dotsBar.innerHTML = this.data.map((item, idx) => {
            const isActive = idx === this.currentIndex;
            const numStr = String(idx + 1).padStart(2, '0');
            return `
                <button class="cosmo-dot-btn ${isActive ? 'active' : ''}" 
                        data-index="${idx}" 
                        title="${numStr}: ${item.name}"
                        aria-label="${numStr}: ${item.name}">
                    ${numStr}
                </button>
            `;
        }).join('');

        // Привязка кликов
        dotsBar.querySelectorAll('.cosmo-dot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                this.goTo(idx);
            });
        });
    }
}

export const CosmonautsTerminal = new CosmonautsTerminalEngine();
if (typeof window !== 'undefined') {
    window.CosmonautsTerminal = CosmonautsTerminal;
}
export default CosmonautsTerminal;
