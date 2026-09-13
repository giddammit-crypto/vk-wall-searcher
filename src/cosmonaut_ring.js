/**
 * src/cosmonaut_ring.js — AURORA 3.9: «Кольцо Героев Космоса» в 3D-пространстве
 * ============================================================================
 * Роли команды:
 *   • Game Designer      — цикл показа: карточки проходят полный круг перед
 *                          зрителем и останавливаются на избранной;
 *   • 3D Environment
 *     Artist             — кольцевая выкладка (carousel) внутри 3D-мира
 *                          станций: те же перспектива, камера и масштаб;
 *   • UI Lead            — карточка-терминал: архивное фото, позывной, цитата,
 *                          статистика полётов и исторический факт.
 *
 * Отличие от прежней выдвижной панели: карточки живут в самом космосе,
 * вращаются вокруг наблюдателя и подчиняются камере (наклон, зум, обзор 360°).
 *
 * Геометрия кольца:
 *   • радиус 1180 px, 16 секторов по 22.5°;
 *   • карточка i стоит на азимуте (i · 22.5° + rotation) и смотрит ВНУТРЬ
 *     кольца (rotateY(a) translateZ(radius) с разворотом на 180°);
 *   • rotation растёт во времени: за T_SPIN_MS кольцо проходит ровно 360°
 *     и останавливается — «пока не сделают полный круг перед пользователем»;
 *   • карточки вне конуса видимости (±82°) не рисуются: нет ни зеркальных
 *     спрайтов, ни лишних слоёв композитинга.
 * ============================================================================
 */

import { COSMONAUTS_DATA } from './cosmonauts_data.js?v=4.5.1';
import { SpaceAudio } from './space_audio.js?v=4.5.1';

const DEG = Math.PI / 180;

export const RING_CONFIG = {
    radius: 1180,
    cardWidth: 336,
    cardHeight: 452,
    visibleConeDeg: 82,      // за этим углом карточка не рисуется
    fullTurnMs: 92000,       // время полного оборота уменьшено в 0.5 раз (92с вместо 46с — 5.75 с на каждого героя)
    easeInMs: 2400,          // плавный разгон
    easeOutMs: 3600,         // плавное торможение перед остановкой
    idleResumeMs: 9000       // после ручного управления автопрокрутка возвращается
};

class CosmonautRingEngine {
    constructor() {
        this.data = COSMONAUTS_DATA;
        this.container = null;
        this.cards = [];
        this.engine = null;

        this.isMounted = false;
        this.isActive = false;

        // Состояние вращения
        this.rotation = 0;              // текущий азимут кольца, градусы
        this.spinStart = 0;             // время старта оборота
        this.spinOffset = 0;            // накопленный ручной сдвиг
        this.spinning = false;
        this.holdIndex = 0;             // карточка, на которой остановились
        this.lastUserAction = 0;
        this.hintShown = false;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onExpKeydown = this._onExpKeydown.bind(this);
        this._onExpCloseClick = this._onExpCloseClick.bind(this);
        this._onExpBackdropClick = this._onExpBackdropClick.bind(this);

        this.dragState = null;
        this._expanded = null;      // текущее FLIP-раскрытие карточки
        this._prevFrameT = 0;       // для замедления вращения ×4 при раскрытии
    }

    /* =====================================================================
     * Монтирование в 3D-мир
     * =================================================================== */
    mount(engine) {
        if (engine) this.engine = engine;

        const world = document.getElementById('space-3d-world');
        if (!world) return false;

        // Контейнер живёт внутри мира станций: наследует камеру и перспективу.
        // ВАЖНО: движок пересобирает мир при инициализации (buildStations),
        // поэтому слой ищется в DOM каждый раз, а не только один раз —
        // иначе после пересборки кольцо оказалось бы в «отсоединённом» узле.
        let layer = document.getElementById('cosmo-ring-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'cosmo-ring-layer';
            layer.className = 'cosmo-ring-layer hidden';
            layer.setAttribute('aria-hidden', 'true');
            layer.innerHTML = `
                <div class="cosmo-ring-cards" id="cosmo-ring-cards"></div>
            `;
            world.appendChild(layer);
            this.isMounted = false;      // карточки нужно построить заново
        } else if (layer.parentNode !== world) {
            world.appendChild(layer);    // вернули в мир после пересборки
        }

        this.container = layer;

        if (!this.isMounted) {
            const cardsRoot = layer.querySelector('#cosmo-ring-cards') || layer;
            this._buildCards(cardsRoot);
            this._buildHud();
            this._preloadPhotos();
            this.isMounted = true;
        }
        return true;
    }

    /**
     * Тихая предзагрузка HD-портретов в кэш браузера (фоновыми срезами):
     * к моменту поворота кольца фото уже в кэше — карточки не «моргают»
     * при первом показе. Ленивое подключение <img> в update() сохранено.
     */
    _preloadPhotos() {
        if (this._preloaded) return;
        this._preloaded = true;
        const queue = this.data
            .map(p => (p.photo || '').replace('assets/cosmonauts/', 'assets/cosmonauts_hd/'))
            .filter(src => src && !this.cards.some(c => c.img && c.img.src === src));
        let i = 0;
        const step = () => {
            if (i >= queue.length) return;
            const img = new Image();
            img.decoding = 'async';
            img.src = queue[i++];
            const idle = typeof requestIdleCallback === 'function'
                ? requestIdleCallback : (cb) => setTimeout(cb, 120);
            idle(step);
        };
        step();
    }

    /**
     * Карточки строятся один раз: 16 узлов, тяжёлые фото подгружаются лениво.
     */
    _buildCards(root) {
        if (!root) return;
        root.innerHTML = '';
        this.cards = [];

        this.data.forEach((person, idx) => {
            const node = document.createElement('article');
            node.className = 'cosmo-ring-card is-entering';
            node.dataset.index = String(idx);
            // Каскадный stagger-вход: 60 мс на карточку (см. cosmoCardEnter в CSS).
            node.style.setProperty('--enter-delay', `${(idx * 60).toFixed(0)}ms`);
            node.style.setProperty('--cosmo-accent', person.badgeColor || '#3ee6c4');
            node.style.width = RING_CONFIG.cardWidth + 'px';
            node.style.height = RING_CONFIG.cardHeight + 'px';
            node.style.marginLeft = (-RING_CONFIG.cardWidth / 2) + 'px';
            node.style.marginTop = (-RING_CONFIG.cardHeight / 2) + 'px';

            const stats = this._statsMarkup(person);
            const photo = (person.photo || '').replace('assets/cosmonauts/', 'assets/cosmonauts_hd/');

            node.innerHTML = `
                <div class="cosmo-ring-card-inner">
                    <header class="cosmo-ring-head">
                        <span class="cosmo-ring-index">${String(idx + 1).padStart(2, '0')} / ${String(this.data.length).padStart(2, '0')}</span>
                        <span class="cosmo-ring-callsign">${this._esc(person.callsign || '')}</span>
                    </header>

                    <figure class="cosmo-ring-photo">
                        <img data-src="${photo}" alt="${this._esc(person.name)}" decoding="async" loading="lazy">
                        <figcaption class="cosmo-ring-photo-meta">
                            <span class="cosmo-ring-agency">${this._esc(person.agency || '')}</span>
                            <span class="cosmo-ring-date">${this._esc(person.dates || '')}</span>
                        </figcaption>
                    </figure>

                    <div class="cosmo-ring-body">
                        <h3 class="cosmo-ring-name">${this._esc(person.name)}</h3>
                        <p class="cosmo-ring-title">${this._esc(person.title || '')}</p>
                        <blockquote class="cosmo-ring-quote">${this._esc(person.quote || '')}</blockquote>
                        <p class="cosmo-ring-fact">${this._esc(person.fact || '')}</p>
                        <div class="cosmo-ring-stats">${stats}</div>
                    </div>
                </div>
            `;

            node.addEventListener('pointerenter', () => this._focusFlow());
            root.appendChild(node);

            const img = node.querySelector('img');
            // Lazy-fade портрета: placeholder shimmer → плавное проявление при load.
            img.addEventListener('load', () => {
                img.classList.add('is-loaded');
                const fig = img.closest('.cosmo-ring-photo');
                if (fig) fig.classList.add('has-photo');
            }, { once: true });

            // Нижняя mask-кромка гаснет, когда текст прокручен до конца
            const body = node.querySelector('.cosmo-ring-body');
            if (body) {
                const syncFade = () => {
                    body.classList.toggle('at-end',
                        body.scrollTop + body.clientHeight >= body.scrollHeight - 4);
                };
                body.addEventListener('scroll', syncFade, { passive: true });
                syncFade();
            }

            this.cards.push({ node, img, loaded: false, person });
        });
    }

    _statsMarkup(person) {
        const s = person.stats || {};
        const tiles = [];
        if (s.flights !== undefined) tiles.push(['ПОЛЁТЫ', `${s.flights}`]);
        if (s.timeInSpace) tiles.push(['В КОСМОСЕ', s.timeInSpace]);
        if (s.spacewalks !== undefined) tiles.push(['ВЫХОДЫ', `${s.spacewalks}`]);
        if (s.moonwalks !== undefined) tiles.push(['НА ЛУНЕ', `${s.moonwalks}`]);
        if (s.evaDuration) tiles.push(['ВКД', s.evaDuration]);
        if (s.moonDuration) tiles.push(['НА ПОВЕРХНОСТИ', s.moonDuration]);
        if (s.orbitAltitude) tiles.push(['АПОГЕЙ', s.orbitAltitude]);
        if (s.orbits) tiles.push(['ВИТКИ', `${s.orbits}`]);
        if (s.spaceStations) tiles.push(['СТАНЦИИ', `${s.spaceStations}`]);

        return tiles.slice(0, 6).map(([label, value]) => `
            <div class="cosmo-ring-stat">
                <span class="cosmo-ring-stat-lbl">${this._esc(label)}</span>
                <span class="cosmo-ring-stat-val">${this._esc(value)}</span>
            </div>
        `).join('');
    }

    _buildHud() {
        // ВАЖНО: HUD крепится к <body>, а не внутрь 3D-мира. У #space-3d-world
        // есть transform, поэтому он становится содержащим блоком для
        // position: fixed — панель управления уезжала бы вместе с камерой.
        const existing = this.hud && this.hud.parentNode;
        const hud = existing || document.createElement('div');
        hud.className = 'cosmo-ring-hud hidden';
        hud.innerHTML = `
            <div class="cosmo-ring-progress" aria-hidden="true"><i data-ring-progress></i></div>
            <div class="cosmo-ring-actions">
                <button type="button" class="cosmo-ring-btn" data-ring-prev title="Предыдущий герой (←)">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
                <button type="button" class="cosmo-ring-btn cosmo-ring-btn-main" data-ring-toggle title="Пауза / продолжить вращение (Пробел)">
                    <span class="material-symbols-outlined" data-ring-toggle-icon>pause</span>
                    <span>Прокрутка</span>
                </button>
                <button type="button" class="cosmo-ring-btn" data-ring-next title="Следующий герой (→)">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
                <button type="button" class="cosmo-ring-btn" data-ring-registry title="Открыть подробный бортовой реестр">
                    <span class="material-symbols-outlined">list_alt</span>
                </button>
                <button type="button" class="cosmo-ring-btn cosmo-ring-btn-close" data-ring-close title="Свернуть кольцо (Esc)">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
        if (!existing) document.body.appendChild(hud);
        this.hud = hud;
        this.progressEl = hud.querySelector('[data-ring-progress]');
        this.toggleIcon = hud.querySelector('[data-ring-toggle-icon]');

        // Опциональная привязка: разметка HUD может быть урезана темой —
        // в этом случае кольцо продолжает работать с клавиатуры.
        const on = (sel, fn) => {
            const el = hud.querySelector(sel);
            if (el && el.addEventListener) el.addEventListener('click', fn);
        };
        on('[data-ring-prev]', () => this.step(-1));
        on('[data-ring-next]', () => this.step(1));
        on('[data-ring-close]', () => this.hide());
        on('[data-ring-toggle]', () => this.toggleSpin());
        on('[data-ring-registry]', () => {
            if (window.CosmonautsTerminal && window.CosmonautsTerminal.open) {
                window.CosmonautsTerminal.open();
            }
        });
    }

    /* =====================================================================
     * Показ / скрытие
     * =================================================================== */
    show(opts = {}) {
        // Монтируем (или перемонтируем после пересборки мира) перед показом
        if (!this.mount(this.engine)) return false;
        if (this.isActive) return true;
        this.isActive = true;

        this.container.classList.remove('hidden');
        this.container.setAttribute('aria-hidden', 'false');
        if (this.hud) this.hud.classList.remove('hidden');
        document.body.classList.add('cosmo-ring-active');

        // Всегда начинаем с первого героя на переднем плане
        const startIdx = typeof opts.startIndex === 'number' ? opts.startIndex : 0;
        this.rotation = -startIdx * (360 / this.data.length);
        this.holdIndex = startIdx;

        this.spinning = true;
        this.spinStart = performance.now();
        this.spinBase = this.rotation;
        this.lastUserAction = this.spinStart;
        this._setToggleIcon(true);

        // Слушатели: перетаскивание мышью/пальцем и колесо — ручное управление
        this.container.addEventListener('pointerdown', this._onPointerDown);
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        this.container.addEventListener('wheel', this._onWheel, { passive: false });
        document.addEventListener('keydown', this._onKeyDown);

        try { SpaceAudio.playVoice('tour_start'); } catch (e) { /* noop */ }

        // Снимаем класс каскадного входа после завершения stagger-анимации
        // (по одному таймеру на показ; на кадры вращения не влияет).
        if (this._enterTimer) clearTimeout(this._enterTimer);
        this._enterTimer = setTimeout(() => {
            this.cards.forEach(c => c.node.classList.remove('is-entering'));
        }, this.data.length * 60 + 800);

        if (this.engine && this.engine.showSpatialToast) {
            this.engine.showSpatialToast('Бортовой реестр: 16 Героев Космоса • кольцо вращается');
        }
        return true;
    }

    hide() {
        if (!this.isActive || !this.container) return;
        this.isActive = false;
        this.spinning = false;
        if (this._expanded) this._closeExpanded(true);
        this.container.classList.add('hidden');
        this.container.setAttribute('aria-hidden', 'true');
        if (this.hud) this.hud.classList.add('hidden');
        document.body.classList.remove('cosmo-ring-active');

        this.container.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('wheel', this._onWheel);
        document.removeEventListener('keydown', this._onKeyDown);

        try { SpaceAudio.playVoice('tour_stop'); } catch (e) { /* noop */ }
    }

    toggle() {
        if (this.isActive) this.hide();
        else this.show();
    }

    /* =====================================================================
     * Управление
     * =================================================================== */
    toggleSpin() {
        this.spinning = !this.spinning;
        this.lastUserAction = performance.now();
        if (this.spinning) {
            // Продолжаем оборот от текущего азимута, досчитывая до полного круга
            this.spinBase = this.rotation;
            this.spinStart = performance.now();
            this.spinRemaining = 360;
        }
        this._setToggleIcon(this.spinning);
    }

    _setToggleIcon(spinning) {
        if (this.toggleIcon) this.toggleIcon.textContent = spinning ? 'pause' : 'play_arrow';
    }

    _focusFlow() {
        // Наведение курсора не срывает обязательный полный оборот: карточка
        // просто подсвечивается (CSS :hover), а таймер простоя продлевается,
        // чтобы после полного круга кольцо не «уехало» само.
        this.lastUserAction = performance.now();
    }

    step(dir) {
        this.lastUserAction = performance.now();
        const stepDeg = 360 / this.data.length;
        this.rotation += -dir * stepDeg;
        this.spinning = false;
        this._setToggleIcon(false);
        this.holdIndex = this._frontIndex();
        try { SpaceAudio.playVoice(dir > 0 ? 'click_2' : 'click_1'); } catch (e) { /* noop */ }
    }

    goTo(index) {
        const stepDeg = 360 / this.data.length;
        this.rotation = -index * stepDeg;
        this.holdIndex = index;
        this.lastUserAction = performance.now();
        this.spinning = false;
        this._setToggleIcon(false);
        this._flashCard(index);
    }

    /**
     * Карточка, которая сейчас прямо перед наблюдателем.
     */
    _frontIndex() {
        const stepDeg = 360 / this.data.length;
        let idx = Math.round(-this.rotation / stepDeg) % this.data.length;
        if (idx < 0) idx += this.data.length;
        return idx;
    }

    _flashCard(index) {
        const card = this.cards[index];
        if (!card) return;
        card.node.classList.remove('is-focused');
        // reflow, чтобы анимация перезапустилась
        void card.node.offsetWidth;
        card.node.classList.add('is-focused');
    }

    /* =====================================================================
     * Ввод
     * =================================================================== */
    _onPointerDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target.closest('.cosmo-ring-hud')) return;
        this.dragState = {
            x: e.clientX,
            y: e.clientY,
            rotation: this.rotation,
            wasSpinning: this.spinning,
            moved: false,
            // Карточка, на которой нажали: если это оказался клик (не драг) —
            // открываем кинематографичное раскрытие.
            cardNode: e.target.closest('.cosmo-ring-card')
        };
        this.spinning = false;
        this._setToggleIcon(false);
        this.lastUserAction = performance.now();
    }

    _onPointerMove(e) {
        if (!this.dragState) return;
        const dx = e.clientX - this.dragState.x;
        const dy = e.clientY - this.dragState.y;
        // Порог различения «клик vs драг» — 6 px (по любой оси)
        if (Math.hypot(dx, dy) > 6) this.dragState.moved = true;
        // 250 px драга ≈ 22.5° (один сектор)
        this.rotation = this.dragState.rotation - dx * (360 / this.data.length) / 250;
    }

    _onPointerUp() {
        if (!this.dragState) return;
        const moved = this.dragState.moved;
        const cardNode = this.dragState.cardNode;
        this.dragState = null;
        if (!moved && cardNode) {
            // Это клик, а не драг кольца — раскрываем карточку
            const card = this.cards[Number(cardNode.dataset.index)];
            if (card && !cardNode.classList.contains('is-hidden')) {
                this._openExpanded(card);
                this.lastUserAction = performance.now();
                return;
            }
        }
        // Магнитим к ближайшей карточке и ждём возврата автопрокрутки
        const stepDeg = 360 / this.data.length;
        this.rotation = Math.round(this.rotation / stepDeg) * stepDeg;
        this.holdIndex = this._frontIndex();
        if (moved) this._flashCard(this.holdIndex);
        this.lastUserAction = performance.now();
    }

    _onWheel(e) {
        if (!this.isActive) return;
        e.preventDefault();
        this.rotation -= e.deltaY * 0.06;
        this.lastUserAction = performance.now();
        if (this.spinning) {
            this.spinning = false;
            this._setToggleIcon(false);
        }
    }

    _onKeyDown(e) {
        if (!this.isActive) return;
        if (e.key === 'Escape') {
            this.hide();
        } else if (e.key === 'ArrowRight') {
            this.step(1);
        } else if (e.key === 'ArrowLeft') {
            this.step(-1);
        } else if (e.key === ' ') {
            e.preventDefault();
            this.toggleSpin();
        }
    }

    /* =====================================================================
     * Кинематографичное раскрытие карточки (FLIP-клон)
     * =================================================================== */

    _prefersReducedMotion() {
        return !!(window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /**
     * Клик по карточке → «вылет» к зрителю. Реализация — FLIP-клон:
     * замеряем экранный прямоугольник карточки, строим fixed-оверлей
     * с полным содержимым (биография целиком), стартуем из прямоугольника
     * оригинала и анимируем к центру экрана. Вращение кольца продолжается,
     * но замедляется (см. update), оригинал приглушается классом .is-dimmed.
     */
    _openExpanded(card) {
        if (this._expanded || !card || !card.person) return;
        const person = card.person;
        const sourceNode = card.node;
        const rect = sourceNode.getBoundingClientRect();
        if (!rect || rect.width < 4) return;
        const idx = this.cards.indexOf(card);
        const reduce = this._prefersReducedMotion();

        const overlay = document.createElement('div');
        overlay.className = 'cosmo-expanded-backdrop';
        overlay.innerHTML = `
            <section class="cosmo-expanded" role="dialog" aria-modal="true"
                     aria-label="${this._esc(person.name)}"
                     style="--cosmo-accent:${person.badgeColor || '#3ee6c4'}">
                <div class="cosmo-ring-card-inner">
                    <header class="cosmo-ring-head">
                        <span class="cosmo-ring-index">${String(idx + 1).padStart(2, '0')} / ${String(this.data.length).padStart(2, '0')}</span>
                        <span class="cosmo-ring-callsign">${this._esc(person.callsign || '')}</span>
                    </header>
                    <figure class="cosmo-ring-photo exp-st" style="--stagger-i:0">
                        <img class="is-loaded" src="${(person.photo || '').replace('assets/cosmonauts/', 'assets/cosmonauts_hd/')}" alt="${this._esc(person.name)}" decoding="async">
                        <figcaption class="cosmo-ring-photo-meta">
                            <span class="cosmo-ring-agency">${this._esc(person.agency || '')}</span>
                            <span class="cosmo-ring-date">${this._esc(person.dates || '')}</span>
                        </figcaption>
                    </figure>
                    <div class="cosmo-ring-body cosmo-expanded-body">
                        <h3 class="cosmo-ring-name exp-st" style="--stagger-i:1">${this._esc(person.name)}</h3>
                        <p class="cosmo-ring-title exp-st" style="--stagger-i:1">${this._esc(person.title || '')}</p>
                        <blockquote class="cosmo-ring-quote exp-st" style="--stagger-i:2">${this._esc(person.quote || '')}</blockquote>
                        <p class="cosmo-ring-fact exp-st" style="--stagger-i:3">${this._esc(person.fact || '')}</p>
                        <div class="cosmo-ring-stats exp-st" style="--stagger-i:4">${this._statsMarkup(person)}</div>
                    </div>
                </div>
                <button type="button" class="cosmo-expanded-close" aria-label="Свернуть карточку (Esc)">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </section>
        `;
        document.body.appendChild(overlay);

        const panel = overlay.querySelector('.cosmo-expanded');
        const closeBtn = overlay.querySelector('.cosmo-expanded-close');

        this._expanded = { overlay, panel, sourceNode, reduce, timer: null };
        sourceNode.classList.add('is-dimmed');

        closeBtn.addEventListener('click', this._onExpCloseClick);
        overlay.addEventListener('click', this._onExpBackdropClick);
        // Capture-фаза: перехватываем Esc раньше обработчика space3d.js,
        // пока раскрытие открыто.
        document.addEventListener('keydown', this._onExpKeydown, true);

        // FLIP: старт из текущего экранного прямоугольника карточки.
        const final = panel.getBoundingClientRect();
        const dx = (rect.left + rect.width / 2) - (final.left + final.width / 2);
        const dy = (rect.top + rect.height / 2) - (final.top + final.height / 2);
        const sx = rect.width / final.width;
        const sy = rect.height / final.height;
        panel.style.setProperty('--fx', `${dx.toFixed(1)}px`);
        panel.style.setProperty('--fy', `${dy.toFixed(1)}px`);
        panel.style.setProperty('--fsx', sx.toFixed(4));
        panel.style.setProperty('--fsy', sy.toFixed(4));
        panel.classList.add(reduce ? 'is-opening-simple' : 'is-opening');

        // Фокус на кнопку закрытия (доступность)
        try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); }
    }

    _onExpCloseClick(e) {
        e.stopPropagation();
        this._closeExpanded();
    }

    _onExpBackdropClick(e) {
        if (e.target === e.currentTarget) this._closeExpanded();
    }

    _onExpKeydown(e) {
        if (!this._expanded) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // не даём space3d.js закрыть сцену
            this._closeExpanded();
        }
    }

    /**
     * Сворачивание: раскрытая карточка летит ОБРАТНО к актуальному экранному
     * прямоугольнику исходной карточки (она могла сместиться — вращение
     * кольца продолжалось), фон-блюр растворяется, затем клон удаляется
     * и фокус возвращается на карточку в кольце.
     */
    _closeExpanded(immediate = false) {
        const exp = this._expanded;
        if (!exp) return;
        this._expanded = null;
        this._prevFrameT = 0;

        document.removeEventListener('keydown', this._onExpKeydown, true);
        exp.overlay.querySelector('.cosmo-expanded-close')
            .removeEventListener('click', this._onExpCloseClick);
        exp.overlay.removeEventListener('click', this._onExpBackdropClick);
        if (exp.timer) clearTimeout(exp.timer);

        const finish = () => {
            exp.overlay.remove();
            exp.sourceNode.classList.remove('is-dimmed');
            // Возврат фокуса на карточку в кольце
            try {
                exp.sourceNode.setAttribute('tabindex', '-1');
                exp.sourceNode.focus({ preventScroll: true });
                exp.sourceNode.removeAttribute('tabindex');
            } catch (e) { /* noop */ }
        };

        if (immediate || exp.reduce) {
            finish();
            return;
        }

        // Актуальный прямоугольник исходной карточки на момент закрытия
        const r = exp.sourceNode.getBoundingClientRect();
        const f = exp.panel.getBoundingClientRect();
        const gone = exp.sourceNode.classList.contains('is-hidden') ||
            r.width < 4 || r.bottom < -80 || r.top > innerHeight + 80;
        const panel = exp.panel;
        if (gone) {
            // Карточка ушла из конуса видимости — просто растворяем клон
            panel.style.setProperty('--fx', '0px');
            panel.style.setProperty('--fy', `${Math.round(innerHeight / 6)}px`);
            panel.style.setProperty('--fsx', '0.6');
            panel.style.setProperty('--fsy', '0.6');
        } else {
            const dx = (r.left + r.width / 2) - (f.left + f.width / 2);
            const dy = (r.top + r.height / 2) - (f.top + f.height / 2);
            panel.style.setProperty('--fx', `${dx.toFixed(1)}px`);
            panel.style.setProperty('--fy', `${dy.toFixed(1)}px`);
            panel.style.setProperty('--fsx', (r.width / f.width).toFixed(4));
            panel.style.setProperty('--fsy', (r.height / f.height).toFixed(4));
        }
        panel.classList.remove('is-opening', 'is-opening-simple');
        panel.classList.add('is-closing');
        exp.overlay.classList.add('is-closing');
        exp.sourceNode.classList.remove('is-dimmed'); // оригинал проявляется сразу
        exp.timer = setTimeout(finish, 520);
    }

    /* =====================================================================
     * Кадр: вращение и раскладка карточек
     * =================================================================== */
    update(now) {
        if (!this.isActive || !this.container) return;

        const t = typeof now === 'number' ? now : performance.now();

        // Пока карточка раскрыта — вращение кольца замедляется в 4 раза
        // (эффектно, но не останавливается): сдвигаем точку старта оборота.
        if (this._expanded && this.spinning) {
            this.spinStart += (t - (this._prevFrameT || t)) * 0.75;
        }
        this._prevFrameT = t;

        // 1. Автопрокрутка: ровно один полный оборот с разгоном и торможением
        if (this.spinning) {
            const elapsed = t - this.spinStart;
            const total = RING_CONFIG.fullTurnMs;
            if (elapsed >= total) {
                this.rotation = this.spinBase - 360;
                this.spinning = false;
                this.holdIndex = this._frontIndex();
                this._setToggleIcon(false);
                this._flashCard(this.holdIndex);
                if (!this.hintShown) {
                    this.hintShown = true;
                    if (this.engine && this.engine.showSpatialToast) {
                        this.engine.showSpatialToast('Полный круг завершён • 16 героев показаны');
                    }
                }
            } else {
                // Кривая с разгоном/торможением: линейная скорость + сглаживание
                const p = elapsed / total;
                const eased = this._easeInOut(p);
                this.rotation = this.spinBase - eased * 360;
            }
        } else if (t - this.lastUserAction > RING_CONFIG.idleResumeMs) {
            // Пользователь не трогал кольцо — продолжаем оборот автоматически
            this.spinning = true;
            this.spinBase = this.rotation;
            this.spinStart = t;
            this._setToggleIcon(true);
        }

        // 2. Раскладка: азимут + разворот внутрь кольца
        const R = RING_CONFIG.radius;
        const cone = RING_CONFIG.visibleConeDeg;
        const stepDeg = 360 / this.data.length;
        const front = this._frontIndex();

        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const angle = i * stepDeg + this.rotation;
            // Приводим к диапазону (-180, 180]
            let a = ((angle + 180) % 360 + 360) % 360 - 180;
            const absA = Math.abs(a);

            const visible = absA <= cone;
            const node = card.node;
            if (node.dataset.visible !== (visible ? '1' : '0')) {
                node.dataset.visible = visible ? '1' : '0';
                node.classList.toggle('is-hidden', !visible);
            }
            if (!visible) continue;

            // Плавное затухание к краям конуса восприятия
            const edge = Math.min(1, Math.max(0, 1 - Math.pow(absA / cone, 3)));
            node.style.opacity = (0.18 + 0.82 * edge).toFixed(3);
            node.style.transform = `rotateY(${a.toFixed(2)}deg) translate3d(0px, 0px, ${-R}px)`;
            node.style.zIndex = String(1000 - Math.round(absA));
            // Blur дорог на transform-элементах: применяем только к боковым
            // карточкам, заметно отклонившимся от фронта (и градиентно гасим)
            if (edge > 0.9) {
                if (node.dataset.blurred) { node.style.filter = 'none'; delete node.dataset.blurred; }
            } else {
                node.style.filter = `blur(${((1 - edge) * 1.6).toFixed(2)}px)`;
                node.dataset.blurred = '1';
            }

            // Ленивое подключение фото: грузим только то, что реально видно
            if (!card.loaded && edge > 0.35) {
                card.loaded = true;
                card.img.src = card.img.dataset.src;
            }

            // Передняя карточка получает акцентную рамку
            const isFront = i === front;
            if (node.classList.contains('is-front') !== isFront) {
                node.classList.toggle('is-front', isFront);
            }
        }

        // 3. Индикатор оборота: сколько из 360° уже пройдено
        if (this.progressEl) {
            const base = typeof this.spinBase === 'number' ? this.spinBase : this.rotation;
            const turned = Math.abs(this.rotation - base) / 360;
            this.progressEl.style.transform = `scaleX(${Math.min(1, Math.max(0, turned)).toFixed(3)})`;
        }
    }

    /**
     * Нормированный пройденный путь при трапециевидном профиле скорости:
     * разгон → равномерное движение → торможение. Интеграл по [0..1] равен 1,
     * поэтому за fullTurnMs кольцо проходит ровно 360° и останавливается мягко.
     */
    _easeInOut(p) {
        const ei = RING_CONFIG.easeInMs / RING_CONFIG.fullTurnMs;
        const eo = RING_CONFIG.easeOutMs / RING_CONFIG.fullTurnMs;
        const total = 1 - (ei + eo) / 2;                 // площадь трапеции
        const A1 = ei / 2;
        const A2 = 1 - ei - eo;

        let s;
        if (p < ei) {
            s = (p * p) / (2 * ei);
        } else if (p <= 1 - eo) {
            s = A1 + (p - ei);
        } else {
            const k = (1 - p) / eo;
            s = A1 + A2 + (eo / 2) * (1 - k * k);
        }
        return Math.min(1, Math.max(0, s / total));
    }

    _esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

export const CosmonautRing = new CosmonautRingEngine();
if (typeof window !== 'undefined') {
    window.CosmonautRing = CosmonautRing;
}
export default CosmonautRing;
