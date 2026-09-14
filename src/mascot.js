/**
 * src/mascot.js — Интерактивный робот-маскот Космо (Cosmo) для AURORA (v4.12.0)
 * ============================================================================
 * Персонаж: Космо (Cosmo) — величайший SMM-гуру галактики ВКонтакте.
 * Озвучка: Женский мультяшный голос Бэла (ElevenLabs, звонкий писклявый тон).
 *
 * Ключевые возможности:
 *   1. Озвучка ElevenLabs (17 аудиофайлов, голос Бэлы + pitch-shift):
 *      - 10 реплик ироничной оценки статистики после сканирования (post_scan_1..10)
 *      - 3 реплики во время сканирования стены для развлечения пользователя (scan_wait_1..3)
 *      - 4 голосовых варианта комичного игрового возмущения при перетаскивании (drag_drop_1..4)
 *   2. Непрерывный 30-секундный патруль по всей ширине экрана:
 *      - Движение от левого края (24px) до правого (innerWidth - 175px) с разворотом по курсу.
 *      - Плавный 60 FPS requestAnimationFrame без конфликтов с CSS transition.
 *      - Реплика на старте, реплика на середине пути (~15 сек) и победный финиш.
 *   3. Физика перетаскивания (Drag & Drop) и приземления («плюхание на пол»):
 *      - Перемещение зажатой ЛКМ с болтанием в воздухе.
 *      - Мягкое приземление на пол (landing squash & stretch).
 *   4. Интеллект поведения (AI Navigation Return):
 *      - После броска ворчит голосом, отряхивается и ножками топает обратно на исходный пост.
 *   5. Полная поддержка Markdown в облачке реплик:
 *      - Заголовки ## и ###, **жирный текст**, *курсив*, `код`.
 *   6. Точный расчет лидеров филиалов без галлюцинаций (Zero Hallucinations):
 *      - При отсутствии сканирования — прямо предлагает начать поиск с кнопкой [🚀 Запустить].
 *      - При наличии сканирования — точный пьедестал почета 1-го, 2-го, 3-го мест и ER.
 *   7. Видимость во время сканирования (z-index 1100 поверх модального окна).
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.12.0';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

// Базовые PNG-спрайты (100% чистый PNG, Zero SVG)
const SPRITES = {
    idle: 'assets/images/mascot/robot_idle.png?v=4.12.0',
    smile: 'assets/images/mascot/robot_smile.png?v=4.12.0',
    thinking: 'assets/images/mascot/robot_thinking.png?v=4.12.0',
    yawn: 'assets/images/mascot/robot_yawn.png?v=4.12.0',
    tired: 'assets/images/mascot/robot_tired.png?v=4.12.0',
    sleep: 'assets/images/mascot/robot_sleep.png?v=4.12.0',
    angry: 'assets/images/mascot/robot_angry.png?v=4.12.0'
};

// 17 аудиофайлов голоса Космо (Бэла, ElevenLabs + Cartoon Pitch-Shift)
const AUDIO_CLIPS = {
    post_scan_1: 'assets/audio/cosmo/post_scan_1.mp3?v=4.12.0',
    post_scan_2: 'assets/audio/cosmo/post_scan_2.mp3?v=4.12.0',
    post_scan_3: 'assets/audio/cosmo/post_scan_3.mp3?v=4.12.0',
    post_scan_4: 'assets/audio/cosmo/post_scan_4.mp3?v=4.12.0',
    post_scan_5: 'assets/audio/cosmo/post_scan_5.mp3?v=4.12.0',
    post_scan_6: 'assets/audio/cosmo/post_scan_6.mp3?v=4.12.0',
    post_scan_7: 'assets/audio/cosmo/post_scan_7.mp3?v=4.12.0',
    post_scan_8: 'assets/audio/cosmo/post_scan_8.mp3?v=4.12.0',
    post_scan_9: 'assets/audio/cosmo/post_scan_9.mp3?v=4.12.0',
    post_scan_10: 'assets/audio/cosmo/post_scan_10.mp3?v=4.12.0',

    scan_wait_1: 'assets/audio/cosmo/scan_wait_1.mp3?v=4.12.0',
    scan_wait_2: 'assets/audio/cosmo/scan_wait_2.mp3?v=4.12.0',
    scan_wait_3: 'assets/audio/cosmo/scan_wait_3.mp3?v=4.12.0',

    drag_drop_1: 'assets/audio/cosmo/drag_drop_1.mp3?v=4.12.0',
    drag_drop_2: 'assets/audio/cosmo/drag_drop_2.mp3?v=4.12.0',
    drag_drop_3: 'assets/audio/cosmo/drag_drop_3.mp3?v=4.12.0',
    drag_drop_4: 'assets/audio/cosmo/drag_drop_4.mp3?v=4.12.0'
};

const MOOD_EMOJIS = {
    idle: '',
    smile: '✨',
    thinking: '💡',
    yawn: '🥱',
    tired: '😮‍💨',
    sleep: '😴',
    angry: '💢',
    ai: '⚡',
    smm: '📈',
    tablet: '📱',
    cool: '🕶️',
    like: '❤️',
    star: '⭐',
    crown: '👑',
    wave: '👋',
    telescope: '🔭',
    scan: '🔍'
};

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\'/g, '&#039;');
}

function formatViews(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('ru-RU');
}

// Быстрые чипы для диалога
const QUICK_CHIPS = [
    { label: '📊 Кто лидер?', action: 'leader' },
    { label: '🛸 Патруль 30 сек', action: 'patrol' },
    { label: '💡 Совет по контенту', query: 'Дай один короткий совет для роста активности читателей.' },
    { label: '✨ Спросить Космо...', action: 'custom' }
];

// Локальные реплики Космо (0 токенов!)
const COSMO_LOCAL_BANTER = [
    'Библиотечные паблики рулят, если в них есть душа и юмор! Ну и я, конечно же. ✨',
    'Умная лента ВК сканирует пост за 0.03 секунды. Я делаю это быстрее, но результат тот же: шедевр! ⚡',
    'Утренние посты в 08:15 читают в автобусах. Лови сонных читателей теплым контентом! ☕',
    'Репост без своего комментария — как чай без заварки. Добавь пару мыслей для виральности! 💡',
    'Карусель из картинок удерживает взгляд на 4 секунды дольше. А это победа над лентой новостей! 🎠',
    'Инфографика в библиотеке? Читатели в восторге, методисты в экстазе! Делай чаще. 📈',
    'Хочешь виральный охват? Расскажи историю о потерянной и найденной через 30 лет книге! 📖',
    'Пока ты думаешь над темой, другие уже собирают просмотры на котиках в читальном зале! 🐱',
    'Ого, какая скорость клика! Тренируешься ставить лайки на сверхзвуке? ⚡',
    'Курсор замер... Ищешь кнопку «Сделать шедевр»? Она прямо передо мной! 🎨',
    'Не туда кликаешь, дай покажу как надо! Я же сертифицированный SMM-гуру. 💅',
    'Курсор кругами ходит... Пытаешься заколдовать алгоритмы продвижения? 🌀',
    'Быстрый скролл детектирован! Читаешь посты со скоростью света? 🔍',
    'Патрулирую периметр экрана. Ни один читатель без лайка не уйдет! 🚨',
    'Знаешь главное правило SMM? Контент — король, а Космо — его космический советник! 👑',
    'Смотрю на графики во вкладке «Аналитика»... Чистая поэзия цифр! 📊',
    'Ты работаешь, я патрулирую экран. Идеальный экипаж AURORA! 🚀'
];

export class AuroraMascot {
    constructor() {
        this.container = null;
        this.bodyEl = null;
        this.floaterEl = null;
        this.spriteImg = null;
        this.bubbleEl = null;
        this.bubbleTextEl = null;
        this.statusTitleEl = null;
        this.moodBadgeEl = null;
        this.collapsedPill = null;
        this.particlesLayerEl = null;
        this.propsLayerEl = null;
        this.aiInputWrapEl = null;
        this.aiInputEl = null;
        this.aiSendBtnEl = null;
        this.soundToggleBtn = null;

        this.currentState = 'idle';
        this.isSleeping = false;
        this.isCollapsed = false;
        this.isIn3D = false;
        this.isAiLoading = false;
        this.isPerformingActivity = false;
        this.isPatrolling = false;
        this.isDragging = false;
        this.isReturningHome = false;
        this.isMuted = false;

        this.currentAudio = null;
        this.speechTimer = null;
        this.idleTimer = null;
        this.proactiveTimer = null;
        this.activityCycleTimer = null;
        this.returnTimer = null;
        this.stateResetTimer = null;
        this.badgeResetTimer = null;
        this.clickTimeout = null;
        this.patrolAnimFrame = null;
        this.animFrameId = null;

        // Позиционирование
        this.currentPosX = 24;
        this.currentPosY = 24;
        this.homePosX = 24;

        // 2.5D трекинг курсора
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastMouseMoveTime = Date.now();
        this.mouseVelocity = 0;
        this.currentRotX = 0;
        this.currentRotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.lastTeaseCommentTime = 0;
        this.teaseCooldownMs = 28000;

        // Кэш и сканирование
        this.aiResponseCache = new Map();
        this.lastAiQueryTime = 0;
        this.aiQueryCooldownMs = 12000;
        this.lastScanStats = null;
        this.currentActivity = null;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onUserActivity = this.onUserActivity.bind(this);
        this.updateParallaxAndMotion = this.updateParallaxAndMotion.bind(this);
    }

    /* ---------------------------------------------------------------------
     * 1. Инициализация DOM-структуры Космо
     * ------------------------------------------------------------------- */
    init() {
        if (this.container) return;

        // Предзагрузка спрайтов
        Object.values(SPRITES).forEach(url => {
            const img = new Image();
            img.src = url;
        });

        const container = document.createElement('div');
        container.className = 'aurora-mascot-container';
        container.setAttribute('data-state', 'idle');
        container.style.left = `${this.currentPosX}px`;
        container.style.bottom = `${this.currentPosY}px`;

        container.innerHTML = `
            <!-- Облачко диалога и подсказок (поддержка Markdown) -->
            <div class="mascot-bubble" data-mascot-bubble>
                <div class="mascot-bubble-header">
                    <span class="mascot-status-tag">
                        <span class="mascot-status-dot"></span>
                        <span class="mascot-status-title" data-mascot-title>КОСМО • SMM-ГУРУ</span>
                        <span class="mascot-voice-bars">
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                        </span>
                    </span>
                    <button type="button" class="mascot-sound-toggle" title="Включить/выключить голос Космо" data-mascot-sound>🔊</button>
                    <button type="button" class="mascot-bubble-close" title="Закрыть реплику" data-bubble-close>&times;</button>
                </div>

                <div class="mascot-bubble-text" data-bubble-text>
                    <div class="mascot-md-h2">Салют! Я Космо 🚀</div>
                    Твой озорной робот-маскот и главный SMM-эксперт галактики. Показывай стену, **прокачаем охваты до небес!** ✨
                </div>

                <!-- Ряд быстрых чипов для экспресс-подсказок -->
                <div class="mascot-ai-chip-row" data-mascot-chips>
                    ${QUICK_CHIPS.map(c => `
                        <button type="button" class="mascot-ai-chip" data-chip="${c.label}" data-query="${c.query || ''}" data-action="${c.action || ''}">
                            ${c.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Микро-поле ввода вопроса ИИ -->
                <div class="mascot-ai-input-wrap" data-mascot-ai-wrap>
                    <input type="text" class="mascot-ai-input" data-mascot-ai-input placeholder="Спросить Космо..." maxlength="120" />
                    <button type="button" class="mascot-ai-send-btn" data-mascot-ai-send title="Отправить Космо">➤</button>
                </div>
            </div>

            <!-- Корпус Космо: drag & drop, 2.5D трекинг, моушен-слои -->
            <div class="mascot-body-wrapper" data-mascot-body title="Космо: зажми ЛКМ для переноса, клик — болтать, двойной клик — сальто!">
                <button type="button" class="mascot-toggle-btn" title="Свернуть Космо" data-mascot-collapse>&minus;</button>
                
                <div class="mascot-floater" data-mascot-floater>
                    <!-- Неоновый маячок антенны -->
                    <div class="mascot-antenna-beacon"></div>

                    <!-- Эмодзи-бейдж настроения -->
                    <div class="mascot-mood-badge" data-mascot-mood-badge></div>

                    <!-- Плазменный факел антигравитации -->
                    <div class="mascot-thruster-glow"></div>

                    <!-- 100% чистый PNG спрайт робота -->
                    <img src="${SPRITES.idle}" alt="Космо" class="mascot-sprite-img" data-mascot-img draggable="false" />

                    <!-- Слой сканлайнов визора -->
                    <div class="mascot-screen-overlay"></div>

                    <!-- Слой динамических реквизитов -->
                    <div class="mascot-props-layer" data-mascot-props></div>

                    <!-- Частицы и искры -->
                    <div class="mascot-particles-layer" data-mascot-particles></div>
                </div>

                <!-- Динамическая тень на полу -->
                <div class="mascot-shadow"></div>
            </div>
        `;

        // Пилюля для свернутого состояния
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'mascot-collapsed-pill';
        pill.title = 'Развернуть Космо';
        pill.innerHTML = `
            <img src="${SPRITES.idle}" alt="Космо" class="mascot-pill-avatar" />
            <span>Космо • SMM</span>
        `;

        document.body.appendChild(container);
        document.body.appendChild(pill);

        this.container = container;
        this.bodyEl = container.querySelector('[data-mascot-body]');
        this.floaterEl = container.querySelector('[data-mascot-floater]');
        this.spriteImg = container.querySelector('[data-mascot-img]');
        this.bubbleEl = container.querySelector('[data-mascot-bubble]');
        this.bubbleTextEl = container.querySelector('[data-bubble-text]');
        this.statusTitleEl = container.querySelector('[data-mascot-title]');
        this.moodBadgeEl = container.querySelector('[data-mascot-mood-badge]');
        this.particlesLayerEl = container.querySelector('[data-mascot-particles]');
        this.propsLayerEl = container.querySelector('[data-mascot-props]');
        this.aiInputWrapEl = container.querySelector('[data-mascot-ai-wrap]');
        this.aiInputEl = container.querySelector('[data-mascot-ai-input]');
        this.aiSendBtnEl = container.querySelector('[data-mascot-ai-send]');
        this.soundToggleBtn = container.querySelector('[data-mascot-sound]');
        this.collapsedPill = pill;

        this.bindEvents();
        this.bindDragAndDrop();
        this.bindAutonomousInteractions();
        this.startAutonomousCycle();
        this.startProactiveChatter();
        this.updateParallaxAndMotion();
        this.resetIdleTimer();

        // Приветствие через 1.6 сек
        this.greetingTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed) {
                this.say(`## Космо на связи! 🚀\nГотов помочь с аналитикой и подсказать **лучших по охватам!**`, 6500, 'smile');
            }
        }, 1600);

        // Первый автоматический 30-секундный патруль через 8.5 секунд после загрузки!
        this.initialPatrolTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed && !this.isDragging && !this.isPatrolling) {
                this.startContinuousPatrol(30000);
            }
        }, 8500);

        window.__AURORA_MASCOT__ = this;
    }

    /* ---------------------------------------------------------------------
     * 2. Markdown парсер для облачка
     * ------------------------------------------------------------------- */
    parseMarkdown(text) {
        if (!text) return '';
        let html = String(text)
            .replace(/^##\s+(.*$)/gim, '<div class="mascot-md-h2">$1</div>')
            .replace(/^###\s+(.*$)/gim, '<div class="mascot-md-h3">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="mascot-md-code">$1</code>')
            .replace(/\n/g, '<br>');
        return html;
    }

    /* ---------------------------------------------------------------------
     * 3. Аудио-движок голоса Бэлы (ElevenLabs)
     * ------------------------------------------------------------------- */
    playVoice(key) {
        if (this.isMuted || !AUDIO_CLIPS[key]) return;
        try {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            const audio = new Audio(AUDIO_CLIPS[key]);
            audio.volume = 0.88;
            this.currentAudio = audio;

            if (this.bubbleEl) this.bubbleEl.classList.add('is-speaking');

            audio.onplay = () => {
                if (this.bubbleEl) this.bubbleEl.classList.add('is-speaking');
            };
            audio.onended = () => {
                if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');
                this.currentAudio = null;
            };
            audio.onerror = () => {
                if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');
                this.currentAudio = null;
            };

            audio.play().catch(e => {
                console.debug('[Cosmo Voice] Autoplay blocked:', e.message);
            });
        } catch (e) {
            console.warn('[Cosmo Voice] Play error:', e);
        }
    }

    stopVoice() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        if (this.bubbleEl) {
            this.bubbleEl.classList.remove('is-speaking');
        }
    }

    /* ---------------------------------------------------------------------
     * 4. Привязка событий интерфейса
     * ------------------------------------------------------------------- */
    bindEvents() {
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });

        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, this.onUserActivity, { passive: true });
        });

        // Клик по роботу: одиночный — тычок и реплика, двойной — сальто
        this.bodyEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isDragging) return;
            if (this.isSleeping) {
                this.wakeUp();
                return;
            }

            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
                this.triggerEasterBackflip();
            } else {
                this.clickTimeout = setTimeout(() => {
                    this.clickTimeout = null;
                    if (!this.isDragging) this.triggerPokeSquish();
                }, 280);
            }
        });

        // Закрытие облачка
        const closeBtn = this.container.querySelector('[data-bubble-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideBubble();
            });
        }

        // Переключатель звука
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isMuted = !this.isMuted;
                this.soundToggleBtn.textContent = this.isMuted ? '🔇' : '🔊';
                this.soundToggleBtn.classList.toggle('is-muted', this.isMuted);
                if (this.isMuted) this.stopVoice();
            });
        }

        // Сворачивание / разворачивание
        const collapseBtn = this.container.querySelector('[data-mascot-collapse]');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapse();
            });
        }
        this.collapsedPill.addEventListener('click', () => this.expand());

        // Чипы в облачке
        const chipsContainer = this.container.querySelector('[data-mascot-chips]');
        if (chipsContainer) {
            chipsContainer.addEventListener('click', (e) => {
                const chip = e.target.closest('.mascot-ai-chip');
                if (!chip) return;
                const action = chip.getAttribute('data-action');
                const query = chip.getAttribute('data-query');

                if (action === 'leader') {
                    this.showLeaderReport();
                } else if (action === 'patrol') {
                    this.startContinuousPatrol(30000);
                } else if (action === 'custom') {
                    if (this.aiInputWrapEl) {
                        this.aiInputWrapEl.classList.toggle('is-visible');
                        if (this.aiInputWrapEl.classList.contains('is-visible')) {
                            this.aiInputEl?.focus();
                        }
                    }
                } else if (query) {
                    this.askAiThrifty(query);
                }
            });
        }

        // Кнопки действий внутри облачка (например, [🚀 Запустить сканирование])
        if (this.bubbleEl) {
            this.bubbleEl.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-mascot-action]');
                if (!actionBtn) return;
                const action = actionBtn.getAttribute('data-mascot-action');
                if (action === 'start-search') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.triggerSearchFromMascot();
                }
            });
        }

        // Поле ввода вопроса ИИ
        if (this.aiSendBtnEl && this.aiInputEl) {
            const submitAiQuestion = () => {
                const val = (this.aiInputEl.value || '').trim();
                if (!val || this.isAiLoading) return;
                this.aiInputEl.value = '';
                this.askAiThrifty(val);
            };

            this.aiSendBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                submitAiQuestion();
            });

            this.aiInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAiQuestion();
                }
            });
        }

        // Синхронизация 2D / 3D
        window.addEventListener('aurora:warp-started', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-opened', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-closed', () => this.setIn3D(false));
    }

    /* ---------------------------------------------------------------------
     * 5. МЕХАНИКА DRAG & DROP И ПЛЮХАНИЕ НА ПОЛ С ИИ-ВОЗВРАТОМ
     * ------------------------------------------------------------------- */
    bindDragAndDrop() {
        if (!this.bodyEl || !this.container) return;

        let startX = 0;
        let startY = 0;
        let preLeft = 0;
        let preBottom = 0;
        let hasMoved = false;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Только ЛКМ
            if (e.target.closest('[data-mascot-collapse]') || e.target.closest('[data-bubble-close]') || e.target.closest('[data-mascot-sound]')) return;

            startX = e.clientX;
            startY = e.clientY;
            preLeft = this.currentPosX;
            preBottom = this.currentPosY || 24;
            hasMoved = false;

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (!hasMoved && Math.hypot(dx, dy) > 6) {
                    hasMoved = true;
                    this.isDragging = true;
                    if (this.isPatrolling) this.stopContinuousPatrol(false);
                    clearTimeout(this.returnTimer);
                    this.container.classList.add('is-dragging');
                    this.bodyEl.classList.add('is-dragged');
                    this.setState('thinking');
                    this.setMoodBadge('😮‍💨', 5000);
                }

                if (this.isDragging) {
                    const newLeft = Math.max(10, Math.min(window.innerWidth - 130, preLeft + dx));
                    const newBottom = Math.max(10, Math.min(window.innerHeight - 150, preBottom - dy));
                    this.currentPosX = newLeft;
                    this.currentPosY = newBottom;
                    this.container.style.left = `${newLeft}px`;
                    this.container.style.bottom = `${newBottom}px`;
                }
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                if (this.isDragging) {
                    this.isDragging = false;
                    this.container.classList.remove('is-dragging');
                    this.bodyEl.classList.remove('is-dragged');

                    // Мягкое физическое падение на пол (bottom: 24px)
                    this.container.style.transition = 'bottom 0.45s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
                    this.currentPosY = 24;
                    this.container.style.bottom = '24px';

                    setTimeout(() => {
                        this.container.style.transition = '';
                        this.triggerPlopLanding(preLeft);
                    }, 460);
                }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        this.bodyEl.addEventListener('mousedown', onMouseDown);
    }

    triggerPlopLanding(originalHomeX) {
        this.bodyEl.classList.remove('is-plop-landing');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-plop-landing');
        this.spawnSparkles(10);

        // 4 голосовых варианта комичного возмущения
        const grumbles = [
            { key: 'drag_drop_1', text: `## Эй, гравитация так не работает! 🤖💥\nПоставь меня на место, **я тебе не плюшевая игрушка!**` },
            { key: 'drag_drop_2', text: `## Ой-ой-ой! Полёт нормальный, но посадка... 😵💫\n**Плюх!** Мои квантовые гироскопы кругом идут!` },
            { key: 'drag_drop_3', text: `## Куда тащишь SMM-гуру?! 🤨💅\nУ меня тут вообще-то **важные расчёты охватов** были!` },
            { key: 'drag_drop_4', text: `## Хулиганство! 😤⚡\nЛадно-ладно, сейчас отряхнусь и **сам дойду обратно** на свой законный пост!` }
        ];
        const pick = grumbles[Math.floor(Math.random() * grumbles.length)];

        this.setState('angry', 4500);
        this.setMoodBadge('💢', 3500);
        this.say(pick.text, 7500, 'angry', pick.key);

        setTimeout(() => {
            this.bodyEl.classList.remove('is-plop-landing');
        }, 850);

        // ИИ-алгоритм возврата на исходную позицию:
        const distToHome = Math.abs(this.currentPosX - originalHomeX);
        if (distToHome > 45) {
            clearTimeout(this.returnTimer);
            this.returnTimer = setTimeout(() => {
                if (!this.isDragging && !this.isIn3D && !this.isCollapsed) {
                    this.navigateBackHome(originalHomeX);
                }
            }, 3400);
        }
    }

    navigateBackHome(targetX) {
        this.isReturningHome = true;
        const goingLeft = (this.currentPosX > targetX);
        this.bodyEl.classList.toggle('is-walking-left', goingLeft);
        this.bodyEl.classList.toggle('is-walking-right', !goingLeft);
        this.floaterEl?.classList.add('patrol-walking');
        this.setState('tired', 4500);
        this.setMoodBadge('🚶‍♂️', 4000);

        this.say(`Топаю обратно на базу... **Никакой дисциплины** у пользователей! 🚶‍♂️💨`, 4000, 'tired');

        const stepSpeed = 120;
        const distance = Math.abs(this.currentPosX - targetX);
        const durationSec = Math.max(1.5, Math.min(5.5, distance / stepSpeed));

        this.container.style.transition = `left ${durationSec.toFixed(2)}s cubic-bezier(0.25, 1, 0.5, 1)`;
        this.currentPosX = targetX;
        this.container.style.left = `${targetX}px`;

        setTimeout(() => {
            this.container.style.transition = '';
            this.floaterEl?.classList.remove('patrol-walking');
            this.bodyEl?.classList.remove('is-walking-left', 'is-walking-right');
            this.isReturningHome = false;
            this.setState('smile', 3500);
            this.setMoodBadge('✨', 3000);
            this.spawnSparkles(6);
            this.say(`## Фух, добрался! 🏠✨\nНа базе **лучше всего**. Больше так не шути! 😉`, 5000, 'smile');
        }, durationSec * 1000);
    }

    /* ---------------------------------------------------------------------
     * 6. НЕПРЕРЫВНОЕ 30-СЕКУНДНОЕ ПАТРУЛИРОВАНИЕ ПО ВСЕЙ ШИРИНЕ ЭКРАНА
     * ------------------------------------------------------------------- */
    startContinuousPatrol(totalDurationMs = 30000) {
        if (!this.container || this.isIn3D || this.isCollapsed || this.isDragging || this.isReturningHome) return;

        this.isPatrolling = true;
        const body = this.bodyEl;
        const floater = this.floaterEl;
        const container = this.container;

        // Отключаем CSS-переход для абсолютной плавности 60 FPS
        container.classList.add('is-patrolling');
        container.style.transition = 'none';
        floater?.classList.add('patrol-walking');

        this.setState('smile', totalDurationMs);
        this.setMoodBadge('🛸', 4000);

        this.say(`## Патрулирование 30 секунд! 🛸\nОблетаю **всю ширину экрана**. Ни один тренд не скроется! 🚨`, 5000, 'smile');

        const startTime = performance.now();
        let lastTime = startTime;
        const minX = 24;
        const getMaxX = () => Math.max(minX + 350, window.innerWidth - 175);

        // Направление: если робот в левой половине экрана, идет вправо
        let goingRight = (this.currentPosX < window.innerWidth / 2);
        body?.classList.toggle('is-walking-right', goingRight);
        body?.classList.toggle('is-walking-left', !goingRight);

        // Скорость: ~165px в секунду (на 1920px экране сделает 3 прохода за 30с)
        const speedPxPerSec = 165;
        let midWayNotified = false;

        const patrolStep = (currentTime) => {
            if (!this.isPatrolling || this.isDragging || this.isReturningHome) {
                container.classList.remove('is-patrolling');
                container.style.transition = '';
                return;
            }

            const elapsed = currentTime - startTime;
            if (elapsed >= totalDurationMs) {
                this.stopContinuousPatrol(true);
                return;
            }

            const dtSec = Math.min(0.1, (currentTime - lastTime) / 1000);
            lastTime = currentTime;

            // Реплика на середине патрулирования (~15 сек)
            if (!midWayNotified && elapsed >= totalDurationMs * 0.48) {
                midWayNotified = true;
                this.say(`## Половина пути пройдена! 🛰️\nПериметр в норме, **квантовые датчики ловят охваты!** ✨`, 4500, 'smile');
                this.setMoodBadge('🛰️', 3500);
            }

            const maxX = getMaxX();
            if (goingRight && this.currentPosX >= maxX - 5) {
                goingRight = false;
                body?.classList.remove('is-walking-right');
                body?.classList.add('is-walking-left');
            } else if (!goingRight && this.currentPosX <= minX + 5) {
                goingRight = true;
                body?.classList.remove('is-walking-left');
                body?.classList.add('is-walking-right');
            }

            const dir = goingRight ? 1 : -1;
            this.currentPosX += dir * speedPxPerSec * dtSec;
            this.currentPosX = Math.max(minX, Math.min(maxX, this.currentPosX));
            container.style.left = `${this.currentPosX.toFixed(1)}px`;

            // Если близко к правому краю — сдвигаем облачко влево
            if (this.currentPosX > window.innerWidth - 380) {
                container.classList.add('is-near-right-edge');
            } else {
                container.classList.remove('is-near-right-edge');
            }

            this.patrolAnimFrame = requestAnimationFrame(patrolStep);
        };

        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.patrolAnimFrame = requestAnimationFrame(patrolStep);
    }

    stopContinuousPatrol(showNotice = true) {
        this.isPatrolling = false;
        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.container?.classList.remove('is-patrolling', 'is-near-right-edge');
        if (this.container) this.container.style.transition = '';
        this.floaterEl?.classList.remove('patrol-walking');
        this.bodyEl?.classList.remove('is-walking-right', 'is-walking-left');

        if (showNotice) {
            this.spawnSparkles(10);
            this.setState('smile', 4500);
            this.setMoodBadge('🛡️', 3500);
            this.say(`## Патруль 30 сек завершён! 🛡️✨\nПериметр проверен, **все посты в полном порядке!**`, 4500, 'smile');
        }
    }

    /* ---------------------------------------------------------------------
     * 7. РАСЧЕТ И ОТОБРАЖЕНИЕ ЛИДЕРОВ (Zero Hallucinations Guarantee)
     * ------------------------------------------------------------------- */
    showLeaderReport() {
        let stats = this.lastScanStats;
        if (!stats && window.__AURORA_LAST_SCAN_SNAPSHOT__) {
            stats = window.__AURORA_LAST_SCAN_SNAPSHOT__;
        }

        if (!stats || !stats.byBranch || Object.keys(stats.byBranch).length === 0) {
            this.say(`
## Статистика ещё не собрана! 📊
Чтобы определить лидера, **запусти сканирование постов** с помощью формы наверху или по кнопке ниже:
<br><br>
<button type="button" class="mascot-action-btn" data-mascot-action="start-search">
    🚀 Запустить сканирование филиалов
</button>
            `.trim(), 12000, 'thinking');
            this.setMoodBadge('💡', 4000);
            return;
        }

        const entries = Object.entries(stats.byBranch).map(([name, data]) => {
            const posts = data.posts || data.count || 0;
            const views = data.views || 0;
            const likes = data.likes || 0;
            const comments = data.comments || 0;
            const reposts = data.reposts || 0;
            const er = views > 0 ? (((likes + comments + reposts) / views) * 100).toFixed(2) : '0.00';
            return { name, posts, views, likes, er: Number(er) };
        });

        entries.sort((a, b) => b.views - a.views);

        if (entries.length === 0 || entries[0].posts === 0) {
            this.say(`## Постов не найдено 🤷‍♂️\nПопробуй расширить даты или выбрать другой поисковый запрос!`, 8000, 'tired');
            return;
        }

        const top1 = entries[0];
        const top2 = entries[1] || null;
        const top3 = entries[2] || null;

        let resHtml = `## 🏆 Пьедестал лидеров:\n`;
        resHtml += `🥇 **${escapeHtml(top1.name)}**: ${top1.posts} постов, ${formatViews(top1.views)} просм. (ER: ${top1.er}%)\n`;
        if (top2) {
            resHtml += `🥈 **${escapeHtml(top2.name)}**: ${top2.posts} постов, ${formatViews(top2.views)} просм.\n`;
        }
        if (top3) {
            resHtml += `🥉 **${escapeHtml(top3.name)}**: ${top3.posts} постов, ${formatViews(top3.views)} просм.\n`;
        }
        resHtml += `\n*Космо в восторге! Все цифры строго из результатов сканирования филиалов!* 🕶️✨`;

        this.say(resHtml, 16000, 'smile');
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(8);
        this.playActivity('smm_guru_pose', false, 4000);

        // Воспроизводим одну из 10 фраз оценки статистики
        const postClips = ['post_scan_1', 'post_scan_2', 'post_scan_3', 'post_scan_4', 'post_scan_5', 'post_scan_6', 'post_scan_7', 'post_scan_8', 'post_scan_9', 'post_scan_10'];
        const chosen = postClips[Math.floor(Math.random() * postClips.length)];
        this.playVoice(chosen);
    }

    triggerSearchFromMascot() {
        this.say(`## Погнали! 🚀⚡\nЗапускаю сканирование постов ВКонтакте! Держись крепче!`, 5000, 'smile', 'scan_wait_1');
        this.spawnSparkles(8);
        const searchForm = document.getElementById('search-form');
        const submitBtn = document.getElementById('submit-search-btn') || document.getElementById('submit-btn');
        if (searchForm) {
            searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }, 450);
    }

    /* ---------------------------------------------------------------------
     * 8. АВТОНОМНЫЙ ЦИКЛ 20 АКТИВНОСТЕЙ КОСМО
     * ------------------------------------------------------------------- */
    startAutonomousCycle() {
        const scheduleNext = () => {
            const delay = 22000 + Math.random() * 16000;
            this.activityCycleTimer = setTimeout(() => {
                if (!this.isSleeping && !this.isIn3D && !this.isCollapsed && !this.isAiLoading && !this.isPerformingActivity && !this.isDragging && !this.isPatrolling && !this.isReturningHome) {
                    this.executeRandomActivity();
                }
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }

    executeRandomActivity() {
        // Патруль имеет высокий вес в цикле (35% вероятность или случайный выбор)
        if (Math.random() < 0.35) {
            this.startContinuousPatrol(30000);
            return;
        }

        const activities = [
            'tablet_study', 'inspect_screen', 'magnifier_scan',
            'visor_wipe', 'antenna_tune', 'joy_dance', 'upside_down', 'energy_drink',
            'laser_pointer', 'shrug_confused', 'flex_muscles', 'check_watch',
            'dizzy_spin', 'cursor_dodge', 'telescope_look', 'excited_wave',
            'easter_flip', 'sleep_snooze', 'smm_guru_pose'
        ];

        const pick = activities[Math.floor(Math.random() * activities.length)];
        this.playActivity(pick);
    }

    playActivity(activityName, customText = null, forcedDuration = null) {
        if (!this.bodyEl) return;
        this.isPerformingActivity = true;
        this.currentActivity = activityName;
        this.bodyEl.setAttribute('data-activity', activityName);
        const shouldSpeak = (customText !== false);

        let duration = forcedDuration || 4500;
        let sprite = 'smile';
        let emoji = '✨';

        switch (activityName) {
            case 'tablet_study':
                sprite = 'thinking';
                emoji = '📱';
                duration = 4800;
                if (shouldSpeak) this.say(customText || `## Аналитика на планшете 📱\nУмная лента сегодня благоволит **хорошим визуалам!**`, duration, sprite);
                break;

            case 'inspect_screen':
                sprite = 'idle';
                emoji = '🔍';
                duration = 5200;
                if (shouldSpeak) this.say(customText || `## Инспекция страницы 👀\nРазворачиваюсь и **сканирую лучом** верстку сайта!`, duration, sprite);
                break;

            case 'horizontal_patrol':
                sprite = 'smile';
                emoji = '🛸';
                duration = 30000;
                this.startContinuousPatrol(30000);
                return;

            case 'magnifier_scan':
                sprite = 'thinking';
                emoji = '🔎';
                duration = 4200;
                if (shouldSpeak) this.say(customText || `## Неоновая лупа 🔎\nОбнаружен **высокий читательский потенциал!** 💡`, duration, sprite);
                break;

            case 'visor_wipe':
                sprite = 'smile';
                emoji = '🧽';
                duration = 3800;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || `## Полировка визора ✨\nТеперь каждый лайк сияет в **4K Ultra HD!**`, duration, sprite);
                break;

            case 'antenna_tune':
                sprite = 'thinking';
                emoji = '📡';
                duration = 4000;
                if (shouldSpeak) this.say(customText || `## Настройка антенны 📻\nЛовлю радиоволну **рекомендаций ВКонтакте!**`, duration, sprite);
                break;

            case 'joy_dance':
                sprite = 'smile';
                emoji = '🕺';
                duration = 3600;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || `## Победный танец! 🕺🔥\nПусть охваты растут **со скоростью света!**`, duration, sprite);
                break;

            case 'upside_down':
                sprite = 'smile';
                emoji = '🙃';
                duration = 4500;
                if (shouldSpeak) this.say(customText || `## Вверх ногами! 🙃\nВ невесомости так даже веселее! Привет с орбиты!`, duration, sprite);
                break;

            case 'energy_drink':
                sprite = 'idle';
                emoji = '🧃';
                duration = 4200;
                if (shouldSpeak) this.say(customText || `## Дозаправка 🧃⚙️\nСинтетическое масло *Cyber Oil* с ароматом новых книг!`, duration, sprite);
                break;

            case 'laser_pointer':
                sprite = 'idle';
                emoji = '🎯';
                duration = 4600;
                if (shouldSpeak) this.say(customText || `## Лазерная точка 🔴\nТренируем внимательность умной ленты!`, duration, sprite);
                break;

            case 'shrug_confused':
                sprite = 'tired';
                emoji = '❓';
                duration = 3500;
                if (shouldSpeak) this.say(customText || `## Недоумение 🤷‍♂️\nОпять пост без картинки? Ну как так, друзья?`, duration, sprite);
                break;

            case 'flex_muscles':
                sprite = 'smile';
                emoji = '💪';
                duration = 3800;
                this.spawnSparkles(7);
                if (shouldSpeak) this.say(customText || `## Сила SMM! 💪💥\nС такими бицепсами любой пост **залетит в тренды!**`, duration, sprite);
                break;

            case 'check_watch':
                sprite = 'idle';
                emoji = '⌚';
                duration = 4000;
                if (shouldSpeak) this.say(customText || `## Время постов! ⏰\nСамое время порадовать читателей свежим анонсом!`, duration, sprite);
                break;

            case 'dizzy_spin':
                sprite = 'yawn';
                emoji = '💫';
                duration = 4500;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || `## Ой, закружился! 🌀\nЗвёздочки на орбите, но Космо в строю!`, duration, sprite);
                break;

            case 'cursor_dodge':
                sprite = 'smile';
                emoji = '⚡';
                duration = 3200;
                this.spawnSparkles(5);
                if (shouldSpeak) this.say(customText || `## Ловкий уворот! 🏃‍♂️💨\nМоя квантовая реакция — \`0.001 секунды!\``, duration, sprite);
                break;

            case 'telescope_look':
                sprite = 'thinking';
                emoji = '🔭';
                duration = 4800;
                if (shouldSpeak) this.say(customText || `## Кибер-телескоп 🔭\nВижу горизонт грандиозных **библиотечных просмотров!**`, duration, sprite);
                break;

            case 'excited_wave':
                sprite = 'smile';
                emoji = '👋';
                duration = 3400;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || `## Привет всем! 👋🥰\nКосмо машет ручками всем труженикам библиотек!`, duration, sprite);
                break;

            case 'easter_flip':
                sprite = 'smile';
                emoji = '🤸';
                duration = 1800;
                this.spawnSparkles(12);
                if (shouldSpeak) this.say(customText || `## Сальто 360°! 🚀\nАнтигравы работают **на все 100%!**`, duration, sprite);
                break;

            case 'sleep_snooze':
                sprite = 'sleep';
                emoji = '😴';
                duration = 5000;
                if (shouldSpeak) this.say(customText || `Режим быстрой энергосберегающей подзарядки... zZz... 💤`, duration, sprite);
                break;

            case 'smm_guru_pose':
            default:
                sprite = 'smile';
                emoji = '👑';
                duration = 4500;
                this.spawnSparkles(10);
                if (shouldSpeak) this.say(customText || `## Космо — SMM-гуру! 👑💅\nВеличайший эксперт галактики **к вашим услугам!**`, duration, sprite);
                break;
        }

        this.setState(sprite, duration);
        this.setMoodBadge(emoji, duration);

        setTimeout(() => {
            if (this.currentActivity === activityName) {
                this.bodyEl?.removeAttribute('data-activity');
                this.currentActivity = null;
                this.isPerformingActivity = false;
            }
        }, duration);
    }

    /* ---------------------------------------------------------------------
     * 9. 2.5D трекинг курсора
     * ------------------------------------------------------------------- */
    onMouseMove(e) {
        const now = Date.now();
        const dt = Math.max(1, now - this.lastMouseMoveTime);

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const distMoved = Math.hypot(dx, dy);

        this.mouseVelocity = distMoved / dt;

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.lastMouseMoveTime = now;

        if (this.isSleeping || this.isCollapsed || !this.bodyEl || this.isDragging) {
            this.targetRotX = 0;
            this.targetRotY = 0;
            return;
        }

        const rect = this.bodyEl.getBoundingClientRect();
        const mascotCenterX = rect.left + rect.width / 2;
        const mascotCenterY = rect.top + rect.height / 2;
        const distToCosmo = Math.hypot(this.mouseX - mascotCenterX, this.mouseY - mascotCenterY);

        const relX = (this.mouseX - mascotCenterX) / window.innerWidth;
        const relY = (this.mouseY - mascotCenterY) / window.innerHeight;
        this.targetRotY = Math.max(-18, Math.min(18, relX * 34));
        this.targetRotX = Math.max(-14, Math.min(14, -relY * 24));

        // Интерактивный уворот при приближении курсора ближе 85px
        if (distToCosmo < 85 && !this.isPerformingActivity && !this.isPatrolling && Math.random() < 0.22) {
            this.playActivity('cursor_dodge', `Ой, щекотно! Мои датчики не любят прикосновений курсора! 🤖⚡`, 2400);
            return;
        }

        // Подколы над мышью
        if (now - this.lastTeaseCommentTime > this.teaseCooldownMs && !this.isPerformingActivity && !this.isPatrolling) {
            if (this.mouseVelocity > 1.9 && distToCosmo < 380) {
                this.lastTeaseCommentTime = now;
                this.say(`Ого, какая скорость курсора! Тренируешься ставить лайки на сверхзвуке? ⚡🖱️`, 4500, 'smile');
                this.setMoodBadge('⚡', 2500);
            } else if (distToCosmo < 140 && this.mouseVelocity < 0.05) {
                this.lastTeaseCommentTime = now;
                this.say(`Чего замер? Любуешься моим титановым корпусом? Я фотогеничен! 😎💅`, 4500, 'smile');
                this.setMoodBadge('✨', 2500);
            }
        }
    }

    updateParallaxAndMotion() {
        if (!this.isIn3D && !this.isCollapsed && this.floaterEl && !this.isDragging) {
            this.currentRotX += (this.targetRotX - this.currentRotX) * 0.12;
            this.currentRotY += (this.targetRotY - this.currentRotY) * 0.12;

            if (!this.isPerformingActivity) {
                this.floaterEl.style.transform = `rotateX(${this.currentRotX.toFixed(2)}deg) rotateY(${this.currentRotY.toFixed(2)}deg)`;
            }
        }
        this.animFrameId = requestAnimationFrame(this.updateParallaxAndMotion);
    }

    onUserActivity() {
        this.resetIdleTimer();
        if (this.isSleeping) {
            this.wakeUp();
        }
    }

    /* ---------------------------------------------------------------------
     * 10. Автономные реакции на действия на сайте (0 токенов!)
     * ------------------------------------------------------------------- */
    bindAutonomousInteractions() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let focusCommentTimer = null;
            searchInput.addEventListener('focus', () => {
                if (this.isSleeping || this.isIn3D || this.isCollapsed) return;
                clearTimeout(focusCommentTimer);
                focusCommentTimer = setTimeout(() => {
                    if (document.activeElement === searchInput && !searchInput.value.trim()) {
                        this.say(`Что поищем? Например: **«мастер-класс»**, **«новинки книг»** или **«выставка»**!`, 6000, 'thinking');
                    }
                }, 900);
            });
        }

        document.addEventListener('click', (e) => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed) return;

            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tabTarget = tabBtn.getAttribute('data-tab');
                const tabComments = {
                    'tab-analytics': `Вкладка **«Аналитика»** — моё любимое! Тут графики красивее колец Сатурна! 📈✨`,
                    'tab-advice': `Вкладка **«Советы филиалам»**! 20+ рекомендаций для прокачки контента! 💡`,
                    'tab-subscribers': `Статистика подписчиков! Рост аудитории — **главный показатель доверия!** 👥`,
                    'tab-promo': `О, промо-материалы! 10 дизайнерских шаблонов плакатов и закладок. **Без слопа!** 🎨`,
                    'tab-radar': `Орбитальный радар! Следит за активностью всех 18 филиалов в реальном времени! 🛰️`
                };
                if (tabComments[tabTarget] && Math.random() < 0.6) {
                    this.say(tabComments[tabTarget], 6500, 'smile');
                }
            }
        });
    }

    /* ---------------------------------------------------------------------
     * 11. Пасхалки и клики
     * ------------------------------------------------------------------- */
    triggerPokeSquish() {
        this.bodyEl.classList.remove('is-poked');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-poked');

        const pokeReplies = [
            `Ой! Щекотно! Мои квантовые датчики реагируют на каждый клик! 🤖`,
            `Тыкаешь? Лучше нажми на чип **«Кто лидер?»** или **«Патруль»**!`,
            `Космо на страже ваших охватов! Чем помочь, друг? ✨`,
            `Два быстрых клика — и я сделаю **сальто в невесомости!** Попробуй! 🤸`,
            `Я заряжен на 100% позитива и готов штурмовать алгоритмы ВК! ⚡`
        ];
        const randomReply = pokeReplies[Math.floor(Math.random() * pokeReplies.length)];
        this.say(randomReply, 5500, 'smile');
        this.spawnSparkles(6);
    }

    triggerEasterBackflip() {
        this.bodyEl.classList.remove('is-backflipping');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-backflipping');

        this.setState('smile', 1800);
        this.setMoodBadge('🤸', 2500);
        this.spawnSparkles(14);
        this.say(`## Сальто в невесомости! 🚀✨\nТройной квантовый тулуп с приземлением на орбиту!`, 4000, 'smile');

        setTimeout(() => {
            this.bodyEl.classList.remove('is-backflipping');
        }, 1200);
    }

    /* ---------------------------------------------------------------------
     * 12. Речь и диалоговое облачко (с Markdown и речью Бэлы)
     * ------------------------------------------------------------------- */
    say(text, duration = 6000, spriteMood = 'smile', voiceKey = null) {
        if (!this.bubbleEl || !this.bubbleTextEl || this.isCollapsed || this.isIn3D) return;

        this.bubbleTextEl.innerHTML = this.parseMarkdown(text);
        this.bubbleEl.classList.add('is-active');

        if (spriteMood) {
            this.setState(spriteMood, duration);
        }

        if (voiceKey && !this.isMuted) {
            this.playVoice(voiceKey);
        }

        clearTimeout(this.speechTimer);
        if (duration > 0) {
            this.speechTimer = setTimeout(() => {
                this.hideBubble();
            }, duration);
        }
    }

    hideBubble() {
        if (!this.bubbleEl) return;
        this.bubbleEl.classList.remove('is-active');
        clearTimeout(this.speechTimer);
        this.stopVoice();
    }

    setState(state, autoResetMs = 0) {
        if (!this.container || !this.spriteImg) return;
        this.currentState = state;
        this.container.setAttribute('data-state', state);

        if (SPRITES[state]) {
            this.spriteImg.src = SPRITES[state];
        }

        if (MOOD_EMOJIS[state] !== undefined) {
            this.setMoodBadge(MOOD_EMOJIS[state], autoResetMs);
        }

        clearTimeout(this.stateResetTimer);
        if (autoResetMs > 0 && state !== 'idle' && state !== 'sleep') {
            this.stateResetTimer = setTimeout(() => {
                if (this.currentState === state && !this.isSleeping) {
                    this.setState('idle');
                }
            }, autoResetMs);
        }
    }

    setMoodBadge(emoji, duration = 3000) {
        if (!this.moodBadgeEl) return;
        this.moodBadgeEl.textContent = emoji || '';
        this.moodBadgeEl.classList.toggle('is-visible', Boolean(emoji));

        clearTimeout(this.badgeResetTimer);
        if (duration > 0 && emoji) {
            this.badgeResetTimer = setTimeout(() => {
                if (this.moodBadgeEl) {
                    this.moodBadgeEl.classList.remove('is-visible');
                    this.moodBadgeEl.textContent = '';
                }
            }, duration);
        }
    }

    spawnSparkles(count = 6) {
        if (!this.particlesLayerEl) return;
        for (let i = 0; i < count; i++) {
            const sp = document.createElement('div');
            sp.className = 'mascot-sparkle';
            const size = 5 + Math.random() * 8;
            sp.style.width = `${size}px`;
            sp.style.height = `${size}px`;
            sp.style.left = `${20 + Math.random() * 60}%`;
            sp.style.top = `${20 + Math.random() * 60}%`;
            this.particlesLayerEl.appendChild(sp);

            setTimeout(() => sp.remove(), 800);
        }
    }

    /* ---------------------------------------------------------------------
     * 13. Сверхэкономный ИИ для Космо (<45 токенов, кэш Map)
     * ------------------------------------------------------------------- */
    async askAiThrifty(userQuestion) {
        if (!userQuestion || this.isAiLoading) return;

        const now = Date.now();
        if (now - this.lastAiQueryTime < this.aiQueryCooldownMs) {
            const waitSec = Math.ceil((this.aiQueryCooldownMs - (now - this.lastAiQueryTime)) / 1000);
            this.say(`Погоди \`${waitSec} сек\`, мои квантовые нейроны ещё остывают! ⏳`, 4000, 'yawn');
            return;
        }

        const normalizedKey = userQuestion.toLowerCase().trim();
        if (this.aiResponseCache.has(normalizedKey)) {
            const cached = this.aiResponseCache.get(normalizedKey);
            this.say(cached, 9000, 'smile');
            this.spawnSparkles(8);
            return;
        }

        this.isAiLoading = true;
        this.lastAiQueryTime = now;
        this.setState('thinking');
        this.setMoodBadge('⚡', 15000);
        this.say(`Обрабатываю запрос квантовым процессором... ⚡`, 10000, 'thinking');

        try {
            const systemPrompt = "Ты — Космо, робот-маскот AURORA, величайший SMM-гуру галактики. Добрый, озорной, шутливый. Отвечай ультра-кратко (до 25 слов, 1 эмодзи), бодро и по делу.";
            const response = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userQuestion }
                    ],
                    max_tokens: 80,
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const reply = data?.choices?.[0]?.message?.content || data?.reply || 'Умная лента любит смелых! Делай упор на яркие фото и искренние заголовки! ✨';

            this.aiResponseCache.set(normalizedKey, reply);
            this.say(reply, 11000, 'smile');
            this.spawnSparkles(8);
        } catch (err) {
            console.warn('[Cosmo AI] Fallback on error:', err);
            const fallbackReply = COSMO_LOCAL_BANTER[Math.floor(Math.random() * COSMO_LOCAL_BANTER.length)];
            this.say(fallbackReply, 8000, 'smile');
        } finally {
            this.isAiLoading = false;
        }
    }

    /* ---------------------------------------------------------------------
     * 14. Хуки сканирования стены (с озвучкой ElevenLabs Бэлы)
     * ------------------------------------------------------------------- */
    onScanStart() {
        this.setState('thinking', 8000);
        this.setMoodBadge('🔍', 6000);
        this.say(`## Сканирование началось! 🔍\nПроверяю стены филиалов, замеряю лайки и охваты!`, 6000, 'thinking', 'scan_wait_1');
    }

    onScanProgress(percent, count) {
        if (percent > 30 && percent < 45) {
            this.say(`## Обработано ${percent}%! 🚀\nУже собрано **${count}** постов. Не переключайтесь!`, 4000, 'smile', 'scan_wait_2');
        } else if (percent > 65 && percent < 80) {
            this.say(`## Финишная прямая (${percent}%)! ⚡\nОсталось совсем чуть-чуть. Готовлю пьедестал!`, 4000, 'smile', 'scan_wait_3');
        }
    }

    onScanComplete(count, topBranch, stats = null) {
        this.lastScanStats = stats;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = stats;

        let msg = `## Сканирование завершено! 🏆\nНайдено **${count}** постов.`;
        if (topBranch) {
            msg += ` Лидер по охвату: **${escapeHtml(topBranch)}**.`;
        }
        msg += `\nНажми на чип **«Кто лидер?»** для полного рейтинга!`;

        // Случайная ироничная фраза оценки статистики из 10 клипов
        const postClips = ['post_scan_1', 'post_scan_2', 'post_scan_3', 'post_scan_4', 'post_scan_5', 'post_scan_6', 'post_scan_7', 'post_scan_8', 'post_scan_9', 'post_scan_10'];
        const chosen = postClips[Math.floor(Math.random() * postClips.length)];

        this.say(msg, 12000, 'smile', chosen);
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(8);
    }

    onScanEmpty(query = '') {
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
        this.say(
            query
                ? `По запросу **«${escapeHtml(query)}»** ничего не нашлось. Попробуй изменить слово!`
                : 'За указанный период постов не обнаружено. Попробуй выбрать другой год или месяц!',
            9000,
            'tired'
        );
    }

    onScanError() {
        this.say(
            `## Ошибка связи! ⚠️\nСбой подключения к ВКонтакте. Проверь токен или интернет!`,
            10000,
            'angry'
        );
        this.setState('angry', 8000);
        this.setMoodBadge('💢', 6000);
    }

    onScanReset() {
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
    }

    /* ---------------------------------------------------------------------
     * 15. Проактивная жизнь
     * ------------------------------------------------------------------- */
    startProactiveChatter() {
        clearInterval(this.proactiveTimer);
        this.proactiveTimer = setInterval(() => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed || this.isAiLoading || this.isPerformingActivity || this.isDragging || this.isPatrolling) return;

            // Если было сканирование — периодически комментируем статистику одной из 10 фраз
            if (this.lastScanStats && this.lastScanStats.count > 0 && Math.random() < 0.45) {
                const statsClips = [
                    { k: 'post_scan_1', t: 'Ого, вы только посмотрите на эти охваты! Алгоритмы ВК сейчас нервно курят в сторонке!' },
                    { k: 'post_scan_2', t: 'Та-ак, вижу кучу просмотров и всего пару комментариев... Читатели что, дали обет молчания?!' },
                    { k: 'post_scan_3', t: 'Если бы за каждый этот просмотр нам давали по книге, у нас бы уже рухнули книжные полки!' },
                    { k: 'post_scan_4', t: 'Лидер филиалов просто рвёт и мечет! Остальным срочно объявлять литературную тревогу!' },
                    { k: 'post_scan_5', t: 'Хм, статистика солидная, но Космо уверен: котик на обложке удвоил бы эти цифры за пять минут!' },
                    { k: 'post_scan_6', t: 'С такой вовлечённостью пора открывать филиал на орбитальной станции! Я договорюсь с космонавтами!' },
                    { k: 'post_scan_7', t: 'Графики ползут вверх! Кажется, методисты сегодня будут спать спокойно. Ну, почти спокойно!' },
                    { k: 'post_scan_8', t: 'Внимание, зафиксирован рекордный всплеск репостов! Кто-то явно разгадал секрет виральности!' },
                    { k: 'post_scan_9', t: 'Смотрю на эти цифры и понимаю: наши посты читают даже те, кто делает вид, что очень занят!' },
                    { k: 'post_scan_10', t: 'Шедевральная статистика! Мои квантовые датчики зашкаливают от читательской любви!' }
                ];
                const p = statsClips[Math.floor(Math.random() * statsClips.length)];
                this.say(p.t, 7500, 'smile', p.k);
            }
        }, 50000);
    }

    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed && !this.isSleeping && !this.isPerformingActivity && !this.isDragging && !this.isPatrolling) {
                this.goToSleep();
            }
        }, 180000);
    }

    goToSleep() {
        this.isSleeping = true;
        this.setState('sleep');
        this.say('Космо ушёл в режим гибернации... zZz... Кликни по мне, чтобы разбудить! 💤', 8000, 'sleep');
    }

    wakeUp() {
        this.isSleeping = false;
        this.setState('smile', 3000);
        this.spawnSparkles(8);
        this.say(`## Оп! Я проснулся! 🚀\nСистемы онлайн, готов к покорению умной ленты!`, 6000, 'smile');
        this.resetIdleTimer();
    }

    collapse() {
        this.isCollapsed = true;
        this.stopVoice();
        this.container?.classList.add('mascot-hidden');
        this.collapsedPill?.classList.add('is-visible');
        this.hideBubble();
    }

    expand() {
        this.isCollapsed = false;
        this.collapsedPill?.classList.remove('is-visible');
        this.container?.classList.remove('mascot-hidden');
        this.say('Космо снова с вами! Продолжаем работу! ✨', 5000, 'smile');
        this.resetIdleTimer();
    }

    setIn3D(in3D) {
        this.isIn3D = Boolean(in3D);
        if (this.isIn3D) {
            this.stopVoice();
            this.container?.classList.add('mascot-hidden');
            this.collapsedPill?.classList.remove('is-visible');
            this.hideBubble();
        } else {
            if (!this.isCollapsed) {
                this.container?.classList.remove('mascot-hidden');
            }
        }
    }

    destroy() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.stopVoice();
        window.removeEventListener('mousemove', this.onMouseMove);
        clearInterval(this.proactiveTimer);
        clearTimeout(this.idleTimer);
        clearTimeout(this.activityCycleTimer);
        clearTimeout(this.returnTimer);
        clearTimeout(this.greetingTimer);
        clearTimeout(this.initialPatrolTimer);
        this.container?.remove();
        this.collapsedPill?.remove();
    }
}

export const Mascot = new AuroraMascot();
