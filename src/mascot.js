/**
 * src/mascot.js — Интерактивный 2D робот-ассистент AURORA (v4.11.0)
 * ============================================================================
 * Роль: Живой персонаж-помощник в левом нижнем углу экрана.
 *
 * Возможности:
 *   • 100% чистый PNG без SVG с альфа-прозрачностью.
 *   • Эмоции и состояния (FSM): idle, smile, thinking, yawn, tired, sleep, angry.
 *   • 2.5D трекинг курсора мыши (живой взгляд и наклон корпуса с Lerp).
 *   • Motion Design v2.0:
 *     - Составные гармоники парения (Compound Harmonics: Float + Roll + Breathing).
 *     - Плазменный факел антигравитации (Thruster Glow).
 *     - Голографический луч визора и CRT-сканлайны (Screen Overlay).
 *     - Неоновый маячок на антенне (Antenna Beacon).
 *     - Squish-and-stretch реакция на клик (Poke Bounce).
 *     - 360° сальто назад при двойном клике (Easter Egg Backflip) с искрами.
 *     - Всплывающие эмодзи-бейджи настроения (Mood Badges: ✨ 💡 ⚡ 😴 💢).
 *     - Анимированный звуковой эквалайзер речи в облачке (Voice Equalizer).
 *   • Автономная жизнь и проактивные реплики:
 *     - Сам комментирует действия (ввод в поиск, вкладки, пресеты, скролл).
 *     - Периодические полезные советы библиотекарю (0 токенов, локально!).
 *   • Токено-экономная интеграция с нейросетью:
 *     - Прямое подключение к api/ai-proxy.php.
 *     - Ультра-компактный системный промпт (< 40 токенов).
 *     - Быстрые чипы («Кто лидер?», «Когда постить?», «Совет по контенту»).
 *     - Сессионное кэширование (Map) — 0 токенов на повторные вопросы!
 *     - Кулдаун анти-спама (12 сек) с шутливым отказом при частых кликах.
 *   • Авто-скрытие в режиме «Пространство 3D» и возврат в 2D.
 *   • Кнопка сворачивания в компактную пилюлю.
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.11.0';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

const SPRITES = {
    idle: 'assets/images/mascot/robot_idle.png?v=4.11.0',
    smile: 'assets/images/mascot/robot_smile.png?v=4.11.0',
    thinking: 'assets/images/mascot/robot_thinking.png?v=4.11.0',
    yawn: 'assets/images/mascot/robot_yawn.png?v=4.11.0',
    tired: 'assets/images/mascot/robot_tired.png?v=4.11.0',
    sleep: 'assets/images/mascot/robot_sleep.png?v=4.11.0',
    angry: 'assets/images/mascot/robot_angry.png?v=4.11.0'
};

const MOOD_EMOJIS = {
    idle: '',
    smile: '✨',
    thinking: '💡',
    yawn: '🥱',
    tired: '😮‍💨',
    sleep: '😴',
    angry: '💢',
    ai: '⚡'
};

// Локальная база советов и реакций (0 токенов)
const PROACTIVE_CHATS = [
    '💡 Совет: посты с фотографиями в пабликах библиотек собирают на <strong>64% больше просмотров</strong>!',
    '🚀 Знаешь ли ты, что в режиме <strong>«Пространство 3D»</strong> можно облететь Землю и МКС?',
    '📊 Вкладка <strong>«Аналитика»</strong> строит точные графики по дням недели и часам публикаций!',
    '📖 Центральная городская библиотека Владимира — методический флагман всей сети филиалов!',
    '🕒 Лучшее время для библиотечных анонсов — будни с <strong>17:00 до 19:30</strong>, когда читатели едут домой!',
    '🏷️ Используй фильтр <strong>«Только с фото»</strong> или <strong>«Только с видео»</strong> для медиа-отчётов!',
    '✨ Если кликнуть по мне <strong>дважды</strong>, я сделаю сальто в невесомости! 🤸',
    '🎯 В поисковой строке можно исключать лишнее: например, напиши <em>выставка -онлайн</em>!',
    '🎨 Во вкладке <strong>«Промо-материалы»</strong> есть 10 стильных дизайнерских шаблонов плакатов и закладок!',
    '🛰️ Орбитальный радар в реальном времени отслеживает частоту обновлений во всех 18 филиалах!',
    '🔍 Попробуй поискать посты со словом <em>«мастер-класс»</em> — это абсолютный хит читательского интереса!',
    '⚡ Если нужен быстрый вывод по поиску — нажми на чип <strong>«Совет по контенту»</strong> в моем облачке!'
];

// Быстрые чипы для диалога
const QUICK_CHIPS = [
    { label: '📊 Кто лидер?', query: 'Кто сейчас лидер по охвату и вовлеченности?' },
    { label: '🕒 Когда постить?', query: 'В какие дни и часы эффективнее всего выкладывать посты?' },
    { label: '💡 Совет по контенту', query: 'Дай один короткий совет для роста активности читателей.' },
    { label: '✨ Спросить ИИ...', action: 'custom' }
];

export class AuroraMascot {
    constructor() {
        this.container = null;
        this.bodyEl = null;
        this.spriteImg = null;
        this.bubbleEl = null;
        this.bubbleTextEl = null;
        this.statusTitleEl = null;
        this.collapsedPill = null;
        this.moodBadgeEl = null;
        this.particlesLayerEl = null;
        this.aiInputWrapEl = null;
        this.aiInputEl = null;
        this.aiSendBtnEl = null;
        
        this.currentState = 'idle';
        this.stateResetTimer = null;
        this.bubbleHideTimer = null;
        this.speakingTimer = null;
        this.moodBadgeTimer = null;
        this.idleTimer = null;
        this.proactiveTimer = null;
        this.clickTimeout = null;
        
        this.isSleeping = false;
        this.isCollapsed = false;
        this.isIn3D = false;
        this.isAiLoading = false;
        this.lastAiCallTime = 0;
        this.aiCooldownMs = 12000; // Минимальный интервал между вызовами ИИ (защита токенов)
        
        // Локальный кэш ответов ИИ (0 токенов на повторные запросы)
        this.aiCache = new Map();
        
        // 2.5D трекинг и сглаживание
        this.mouseX = 0;
        this.mouseY = 0;
        this.currentRotX = 0;
        this.currentRotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.animFrameId = null;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onUserActivity = this.onUserActivity.bind(this);
        this.updateParallax = this.updateParallax.bind(this);
    }

    /* ---------------------------------------------------------------------
     * Инициализация DOM-структуры маскота
     * ------------------------------------------------------------------- */
    init() {
        if (this.container) return;

        // Предзагрузка всех 7 эмоций для бесшовного переключения
        Object.values(SPRITES).forEach(url => {
            const img = new Image();
            img.src = url;
        });

        // Создаем контейнер
        const container = document.createElement('div');
        container.className = 'aurora-mascot-container';
        container.setAttribute('data-state', 'idle');

        container.innerHTML = `
            <!-- Облачко диалога / реплик -->
            <div class="mascot-bubble" data-mascot-bubble>
                <div class="mascot-bubble-header">
                    <span class="mascot-status-tag">
                        <span class="mascot-status-dot"></span>
                        <span class="mascot-status-title" data-mascot-title>АССИСТЕНТ</span>
                        <span class="mascot-voice-bars">
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                        </span>
                    </span>
                    <button type="button" class="mascot-bubble-close" title="Закрыть подсказку" data-bubble-close>&times;</button>
                </div>

                <p class="mascot-bubble-text" data-bubble-text>
                    Привет! Я твой живой навигатор по библиотекам. Готов помочь с поиском и анализом! 🚀
                </p>

                <!-- Ряд быстрых чипов для экспресс-подсказок (экономно по токенам) -->
                <div class="mascot-ai-chip-row" data-mascot-chips>
                    ${QUICK_CHIPS.map(c => `
                        <button type="button" class="mascot-ai-chip" data-chip="${c.label}" data-query="${c.query || ''}" data-action="${c.action || ''}">
                            ${c.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Микро-поле ввода для вопроса ИИ -->
                <div class="mascot-ai-input-wrap" data-mascot-ai-wrap>
                    <input type="text" class="mascot-ai-input" data-mascot-ai-input placeholder="Спросить робота..." maxlength="90" />
                    <button type="button" class="mascot-ai-send-btn" data-mascot-ai-send title="Отправить вопрос">➤</button>
                </div>
            </div>

            <!-- Тело робота с 2.5D трекингом и моушен-слоями -->
            <div class="mascot-body-wrapper" data-mascot-body title="Одинарный клик — реакция, Двойной клик — сальто!">
                <!-- Кнопка сворачивания в пилюлю -->
                <button type="button" class="mascot-toggle-btn" title="Свернуть помощника" data-mascot-collapse>&minus;</button>
                
                <!-- Всплывающий эмодзи-бейдж настроения -->
                <div class="mascot-mood-badge" data-mascot-mood-badge></div>

                <!-- Неоновый маячок на верхушке антенны -->
                <div class="mascot-antenna-beacon"></div>

                <!-- Основной блок парения (Compound Harmonics) -->
                <div class="mascot-floater">
                    <img src="${SPRITES.idle}" alt="Робот-помощник" class="mascot-sprite-img" data-mascot-img />
                    
                    <!-- CRT сканлайны и скользящий голографический луч -->
                    <div class="mascot-screen-overlay"></div>

                    <!-- Плазменный факел антигравитации снизу -->
                    <div class="mascot-thruster-glow"></div>
                </div>

                <!-- Слой разлетающихся искр/звёзд -->
                <div class="mascot-particles-layer" data-mascot-particles></div>

                <!-- Частицы сна (Z z z) -->
                <div class="mascot-sleep-particles">
                    <span class="sleep-z z-1">z</span>
                    <span class="sleep-z z-2">Z</span>
                    <span class="sleep-z z-3">Z</span>
                </div>

                <!-- Адаптивная динамическая тень -->
                <div class="mascot-shadow"></div>
            </div>
        `;

        // Создаем мини-бейдж для свернутого режима
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'mascot-collapsed-pill';
        pill.title = 'Развернуть робота-помощника';
        pill.innerHTML = `
            <img src="${SPRITES.idle}" alt="Ассистент" class="mascot-pill-avatar" />
            <span>Ассистент</span>
        `;

        document.body.appendChild(container);
        document.body.appendChild(pill);

        this.container = container;
        this.bodyEl = container.querySelector('[data-mascot-body]');
        this.spriteImg = container.querySelector('[data-mascot-img]');
        this.bubbleEl = container.querySelector('[data-mascot-bubble]');
        this.bubbleTextEl = container.querySelector('[data-bubble-text]');
        this.statusTitleEl = container.querySelector('[data-mascot-title]');
        this.moodBadgeEl = container.querySelector('[data-mascot-mood-badge]');
        this.particlesLayerEl = container.querySelector('[data-mascot-particles]');
        this.aiInputWrapEl = container.querySelector('[data-mascot-ai-wrap]');
        this.aiInputEl = container.querySelector('[data-mascot-ai-input]');
        this.aiSendBtnEl = container.querySelector('[data-mascot-ai-send]');
        this.collapsedPill = pill;

        this.bindEvents();
        this.bindAutonomousInteractions();
        this.updateParallax();
        this.resetIdleTimer();
        this.startProactiveChatter();

        // Приветствие через 1.6 секунды после загрузки
        setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed) {
                this.say('Привет! Я твой живой навигатор по постам и событиям. С чего начнём? 🚀', 8000, 'smile');
            }
        }, 1600);
    }

    /* ---------------------------------------------------------------------
     * Привязка событий интерфейса
     * ------------------------------------------------------------------- */
    bindEvents() {
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });

        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, this.onUserActivity, { passive: true });
        });

        // Клик по роботу: одиночный — тычок и реплика, двойной — 360° сальто
        this.bodyEl.addEventListener('click', (e) => {
            e.stopPropagation();
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
                    this.triggerPokeSquish();
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

        // Сворачивание / разворачивание
        const collapseBtn = this.container.querySelector('[data-mascot-collapse]');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapse();
            });
        }
        this.collapsedPill.addEventListener('click', () => this.expand());

        // Обработка кликов по чипам в облачке
        const chipsContainer = this.container.querySelector('[data-mascot-chips]');
        if (chipsContainer) {
            chipsContainer.addEventListener('click', (e) => {
                const chip = e.target.closest('.mascot-ai-chip');
                if (!chip) return;
                const action = chip.getAttribute('data-action');
                const query = chip.getAttribute('data-query');

                if (action === 'custom') {
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

        // Отправка вопроса из мини-инпута
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

        // Интеграция с режимами 2D / 3D
        window.addEventListener('aurora:warp-started', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-opened', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-closed', () => this.setIn3D(false));
    }

    /* ---------------------------------------------------------------------
     * Автономные реакции на действия пользователя на сайте (0 токенов!)
     * ------------------------------------------------------------------- */
    bindAutonomousInteractions() {
        // 1. Реакция на фокус в поисковой строке
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let focusCommentTimer = null;
            searchInput.addEventListener('focus', () => {
                if (this.isSleeping || this.isIn3D || this.isCollapsed) return;
                clearTimeout(focusCommentTimer);
                focusCommentTimer = setTimeout(() => {
                    if (document.activeElement === searchInput && !searchInput.value.trim()) {
                        this.say('Что поищем? Например: <strong>«мастер-класс»</strong>, <strong>«новинки книг»</strong> или <strong>«выставка»</strong>!', 6000, 'thinking');
                    }
                }, 900);
            });
        }

        // 2. Реакция на переключение вкладок сайта
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (!tabBtn || this.isIn3D || this.isCollapsed) return;
            const tabId = tabBtn.getAttribute('data-tab') || '';

            switch (tabId) {
                case 'events':
                    this.say('📅 <strong>Календарь событий!</strong> Все мастер-классы, встречи и выставки филиалов по датам.', 6000, 'smile');
                    break;
                case 'promo':
                    this.say('🎨 <strong>Генератор промо-материалов!</strong> Печатаем постеры А4, тейблтенты и закладки для книг!', 6000, 'smile');
                    break;
                case 'ai':
                    this.say('🧠 <strong>Раздел ИИ-аналитика!</strong> Мой коллега готов составить глубокий структурированный отчёт.', 6000, 'thinking');
                    break;
                case 'radar':
                    this.say('🛰️ <strong>Радар активности!</strong> Сканирует частоту публикаций библиотек Владимира в реальном времени.', 6000, 'smile');
                    break;
                case 'cosmonauts':
                    this.say('👨‍🚀 <strong>Терминал космонавтов!</strong> Прямая телеметрия экспедиций и визитов на МКС.', 6000, 'smile');
                    break;
                default:
                    break;
            }
        });

        // 3. Реакция на клик по поисковым пресетам
        document.addEventListener('click', (e) => {
            const preset = e.target.closest('.preset-pill, .showcase-filter-btn');
            if (preset && !this.isIn3D && !this.isCollapsed) {
                const text = preset.textContent.trim();
                this.say(`Отличный фильтр: <strong>«${escapeHtml(text)}»</strong>! Смотрим интересное.`, 4500, 'smile');
            }
        });

        // 4. Реакция на глубокую прокрутку страницы
        let scrollAnnounced = false;
        window.addEventListener('scroll', () => {
            if (this.isIn3D || this.isCollapsed || scrollAnnounced) return;
            if (window.scrollY > 1600) {
                scrollAnnounced = true;
                this.say('Ого, сколько постов пролистали! Если нужно вернуться — справа внизу есть кнопка наверх ⬆️', 5000, 'smile');
                setTimeout(() => { scrollAnnounced = false; }, 45000);
            }
        }, { passive: true });

        // 5. Реакция на переключение темы
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                if (this.isIn3D || this.isCollapsed) return;
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                this.say(isLight ? '☀️ Светлая тема! Текст на странице читается как на свежей странице книги.' : '🌙 Космическая тёмная тема! Включаю ночные датчики.', 4500, 'smile');
            });
        }
    }

    /* ---------------------------------------------------------------------
     * Микро-взаимодействия (Poke Squish + 360° Сальто)
     * ------------------------------------------------------------------- */
    triggerPokeSquish() {
        if (!this.bodyEl) return;
        this.bodyEl.classList.remove('is-poked');
        void this.bodyEl.offsetWidth; // force reflow
        this.bodyEl.classList.add('is-poked');

        this.setMoodBadge('✨', 1800);
        this.spawnSparkles(4);

        const reactions = [
            'Щекотно! Мои микросхемы боятся щекотки! 😄',
            'На связи! Системы сканирования работают на 100%!',
            'Пик! Всегда рад пообщаться. Что ищем?',
            'Хе-хе, я тут! Готов к новым поискам!'
        ];
        const r = reactions[Math.floor(Math.random() * reactions.length)];
        this.say(r, 4500, 'smile');

        setTimeout(() => {
            this.bodyEl?.classList.remove('is-poked');
        }, 650);
    }

    triggerEasterBackflip() {
        if (!this.bodyEl) return;
        this.bodyEl.classList.remove('is-backflipping');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-backflipping');

        this.setMoodBadge('🚀', 3000);
        this.spawnSparkles(12);

        this.say('Уиии! Полный гравитационный переворот на 360°! Все гироскопы откалиброваны! 💫', 6000, 'smile');

        setTimeout(() => {
            this.bodyEl?.classList.remove('is-backflipping');
        }, 1000);
    }

    /* ---------------------------------------------------------------------
     * Разлетающиеся искры / звёздочки
     * ------------------------------------------------------------------- */
    spawnSparkles(count = 6) {
        if (!this.particlesLayerEl) return;
        const emojis = ['✨', '⭐', '⚡', '💫', '🌟'];

        for (let i = 0; i < count; i++) {
            const span = document.createElement('span');
            span.className = 'mascot-sparkle';
            span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

            const dx = (Math.random() - 0.5) * 120 + 'px';
            const dy = (Math.random() - 0.7) * 90 + 'px';
            const rot = (Math.random() - 0.5) * 220 + 'deg';

            span.style.setProperty('--dx', dx);
            span.style.setProperty('--dy', dy);
            span.style.setProperty('--rot', rot);
            span.style.left = '50%';
            span.style.top = '45%';

            this.particlesLayerEl.appendChild(span);
            setTimeout(() => span.remove(), 850);
        }
    }

    /* ---------------------------------------------------------------------
     * Бейдж настроения (Mood Badge)
     * ------------------------------------------------------------------- */
    setMoodBadge(emoji, durationMs = 2500) {
        if (!this.moodBadgeEl) return;
        if (!emoji) {
            this.moodBadgeEl.classList.remove('is-visible');
            return;
        }

        this.moodBadgeEl.textContent = emoji;
        this.moodBadgeEl.classList.add('is-visible');

        clearTimeout(this.moodBadgeTimer);
        if (durationMs > 0) {
            this.moodBadgeTimer = setTimeout(() => {
                this.moodBadgeEl?.classList.remove('is-visible');
            }, durationMs);
        }
    }

    /* ---------------------------------------------------------------------
     * Управление состояниями (FSM)
     * ------------------------------------------------------------------- */
    setState(state, autoResetDurationMs = 0) {
        if (!SPRITES[state]) return;
        this.currentState = state;
        this.isSleeping = (state === 'sleep');

        if (this.container) {
            this.container.setAttribute('data-state', state);
        }

        if (this.spriteImg && this.spriteImg.src !== SPRITES[state]) {
            this.spriteImg.src = SPRITES[state];
            // Анимация эластичного поп-эффекта при смене спрайта
            this.spriteImg.classList.remove('emotion-pop');
            void this.spriteImg.offsetWidth;
            this.spriteImg.classList.add('emotion-pop');
        }

        // Обновляем бейдж настроения
        if (MOOD_EMOJIS[state]) {
            this.setMoodBadge(MOOD_EMOJIS[state], autoResetDurationMs || 3000);
        }

        clearTimeout(this.stateResetTimer);
        if (autoResetDurationMs > 0 && state !== 'idle') {
            this.stateResetTimer = setTimeout(() => {
                if (this.currentState === state && !this.isSleeping) {
                    this.setState('idle');
                }
            }, autoResetDurationMs);
        }
    }

    /* ---------------------------------------------------------------------
     * Диалоговое облачко (Speech Bubble)
     * ------------------------------------------------------------------- */
    say(htmlText, durationMs = 8000, state = null) {
        if (this.isIn3D || this.isCollapsed) return;
        if (!this.bubbleEl || !this.bubbleTextEl) return;

        if (state) {
            this.setState(state, durationMs);
        }

        this.bubbleTextEl.innerHTML = htmlText;
        this.bubbleEl.classList.add('is-active');
        this.bubbleEl.classList.add('is-speaking');

        clearTimeout(this.speakingTimer);
        this.speakingTimer = setTimeout(() => {
            this.bubbleEl?.classList.remove('is-speaking');
        }, Math.min(3000, durationMs));

        clearTimeout(this.bubbleHideTimer);
        if (durationMs > 0) {
            this.bubbleHideTimer = setTimeout(() => {
                this.hideBubble();
            }, durationMs);
        }
    }

    hideBubble() {
        if (this.bubbleEl) {
            this.bubbleEl.classList.remove('is-active');
            this.bubbleEl.classList.remove('is-speaking');
        }
        if (this.aiInputWrapEl) {
            this.aiInputWrapEl.classList.remove('is-visible');
        }
    }

    /* ---------------------------------------------------------------------
     * Токено-экономная нейросеть (Strict Token Thriftiness)
     * ------------------------------------------------------------------- */
    async askAiThrifty(userQuery) {
        if (this.isAiLoading) return;
        const now = Date.now();

        // 1. Защита от спама и перерасхода токенов по таймеру
        const elapsed = now - this.lastAiCallTime;
        if (elapsed < this.aiCooldownMs) {
            const remainSec = Math.ceil((this.aiCooldownMs - elapsed) / 1000);
            this.say(`Мои квантовые процессоры охлаждаются! Спроси через <strong>${remainSec} сек</strong> 🧊`, 3500, 'thinking');
            return;
        }

        // 2. Проверка локального сессионного кэша (0 токенов!)
        const cacheKey = userQuery.trim().toLowerCase();
        if (this.aiCache.has(cacheKey)) {
            const cached = this.aiCache.get(cacheKey);
            this.say(cached, 10000, 'smile');
            this.setMoodBadge('⚡', 3000);
            return;
        }

        // 3. Формирование ультра-компактного контекста сканирования (минимум токенов)
        const snapshot = window.__AURORA_LAST_SCAN_SNAPSHOT__ || null;
        let microContext = 'Сканирование стены еще не запускалось.';
        if (snapshot) {
            microContext = `Найдено ${snapshot.count || 0} постов. Запрос: "${snapshot.query || 'все'}". Лидер: "${snapshot.topBranch || 'нет'}" (просмотров: ${snapshot.totalViews || 0}).`;
        }

        const microSystemPrompt = 
            'Ты — остроумный карманный робот-маскот AURORA для библиотек Владимира. ' +
            'Отвечай ультра-кратко: ровно 1-2 предложения, строго до 25-30 слов, используй 1 эмодзи. ' +
            `Контекст данных: ${microContext}. Никаких выдуманных цифр.`;

        this.isAiLoading = true;
        this.lastAiCallTime = now;
        this.setMoodBadge('⚡', 10000);
        this.say('Подключаюсь к нейросети... Секундочку! ⚡', 5000, 'thinking');

        try {
            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: microSystemPrompt },
                        { role: 'user', content: userQuery.slice(0, 100) }
                    ],
                    max_tokens: 200, // Минимальный лимит серверного прокси
                    temperature: 0.5
                })
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            const reply = json.choices?.[0]?.message?.content || json.reply || '';

            if (reply) {
                // Сохраняем в кэш
                this.aiCache.set(cacheKey, reply);
                this.say(reply, 12000, 'smile');
                this.setMoodBadge('💡', 4000);
            } else {
                throw new Error('Пустой ответ');
            }
        } catch (err) {
            console.warn('[Mascot AI] Fallback to local advice:', err);
            // Резервный локальный ответ без ошибки
            const fallback = 'Связь с орбитой прервалась, но мой совет: фото анонсов мастер-классов в 18:00 дают лучший охват! 📸';
            this.say(fallback, 9000, 'tired');
            this.setMoodBadge('⚠️', 3000);
        } finally {
            this.isAiLoading = false;
        }
    }

    /* ---------------------------------------------------------------------
     * Реакции на события сканирования ВКонтакте
     * ------------------------------------------------------------------- */
    onScanStart(query = '') {
        const text = query
            ? `Ищу посты по запросу <strong>«${escapeHtml(query)}»</strong>... Сканирую базу данных!`
            : 'Запускаю полное сканирование стены группы ВКонтакте... Секундочку!';
        this.say(text, 12000, 'thinking');
    }

    onScanProgress(loaded, total) {
        this.say(`Идёт обработка... Загружено <strong>${loaded}</strong> из <strong>${total}</strong> постов!`, 4000, 'thinking');
    }

    onScanSuccess(summary = {}) {
        const count = summary.count || 0;
        const topBranch = summary.topBranch || '';
        
        // Сохраняем глобальный компактный снимок
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = {
            count,
            topBranch,
            totalViews: summary.totalViews || 0,
            query: summary.query || ''
        };

        let msg = `Готово! Найдено <strong>${count}</strong> постов.`;
        if (topBranch) {
            msg += ` Лидер: <strong>${escapeHtml(topBranch)}</strong>.`;
        }
        msg += ' Нажми на чип <strong>«Кто лидер?»</strong> или <strong>«Совет»</strong> ниже!';
        this.say(msg, 12000, 'smile');
    }

    onScanEmpty(query = '') {
        this.say(
            query
                ? `По запросу <strong>«${escapeHtml(query)}»</strong> ничего не нашлось. Попробуй изменить слово или расширить даты!`
                : 'За указанный период постов не обнаружено. Попробуй выбрать другой год или месяц!',
            9000,
            'tired'
        );
    }

    onScanError(errorMsg = '') {
        this.say(
            'Упс! Ошибка связи с ВКонтакте. Проверь токен доступа или сетевое подключение!',
            10000,
            'angry'
        );
    }

    /* ---------------------------------------------------------------------
     * Периодическая проактивная жизнь робота (Autonomous Chatter)
     * ------------------------------------------------------------------- */
    startProactiveChatter() {
        clearInterval(this.proactiveTimer);
        // Каждые 50-70 секунд робот сам делится интересным фактом или советом
        this.proactiveTimer = setInterval(() => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed) return;
            if (this.bubbleEl && this.bubbleEl.classList.contains('is-active')) return;

            const chat = PROACTIVE_CHATS[Math.floor(Math.random() * PROACTIVE_CHATS.length)];
            const states = ['smile', 'thinking', 'idle'];
            const st = states[Math.floor(Math.random() * states.length)];
            this.say(chat, 9000, st);
        }, 55000);
    }

    /* ---------------------------------------------------------------------
     * Сон и бездействие (Idle Timers)
     * ------------------------------------------------------------------- */
    onUserActivity() {
        if (this.isSleeping) {
            this.wakeUp();
            return;
        }
        this.resetIdleTimer();
    }

    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        if (this.isSleeping) return;

        // Через 35 секунд бездействия — зевает
        this.idleTimer = setTimeout(() => {
            if (this.currentState === 'idle' && !this.isIn3D) {
                this.setState('yawn', 5000);
                this.say('<em>*Сладко зевает*</em>... Как спокойно в зале библиотеки! Что-нибудь поищем?', 7000);
            }

            // Через 70 секунд бездействия — устаёт
            this.idleTimer = setTimeout(() => {
                if (!this.isIn3D) {
                    this.setState('tired', 6000);
                    this.say('Немного притомился... Жду твоих новых поисковых запросов!', 7000);
                }

                // Через 120 секунд бездействия — засыпает
                this.idleTimer = setTimeout(() => {
                    if (!this.isIn3D) {
                        this.hideBubble();
                        this.setState('sleep');
                    }
                }, 50000);
            }, 35000);
        }, 35000);
    }

    wakeUp() {
        this.isSleeping = false;
        this.setState('smile', 6000);
        this.say('Ой! Я не спал, я просто анализировал базу данных в фоновом режиме! 😉 На связи!', 7000);
        this.resetIdleTimer();
    }

    /* ---------------------------------------------------------------------
     * Плавный 2.5D трекинг взгляда за курсором
     * ------------------------------------------------------------------- */
    onMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;

        if (this.isSleeping || this.isCollapsed || !this.bodyEl) {
            this.targetRotX = 0;
            this.targetRotY = 0;
            return;
        }

        const rect = this.bodyEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = (this.mouseX - centerX) / window.innerWidth;
        const dy = (this.mouseY - centerY) / window.innerHeight;

        this.targetRotY = Math.max(-18, Math.min(18, dx * 34));
        this.targetRotX = Math.max(-14, Math.min(14, -dy * 24));

        this.onUserActivity();
    }

    updateParallax() {
        const ease = 0.08;
        this.currentRotX += (this.targetRotX - this.currentRotX) * ease;
        this.currentRotY += (this.targetRotY - this.currentRotY) * ease;

        if (this.bodyEl && !this.isSleeping) {
            this.bodyEl.style.transform = `perspective(800px) rotateX(${this.currentRotX.toFixed(2)}deg) rotateY(${this.currentRotY.toFixed(2)}deg)`;
        } else if (this.bodyEl && this.isSleeping) {
            this.bodyEl.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
        }

        this.animFrameId = requestAnimationFrame(this.updateParallax);
    }

    /* ---------------------------------------------------------------------
     * Сворачивание и скрытие при переходе в 3D
     * ------------------------------------------------------------------- */
    collapse() {
        this.isCollapsed = true;
        if (this.container) this.container.classList.add('mascot-hidden');
        if (this.collapsedPill) this.collapsedPill.classList.add('is-visible');
    }

    expand() {
        this.isCollapsed = false;
        if (this.collapsedPill) this.collapsedPill.classList.remove('is-visible');
        if (this.container && !this.isIn3D) {
            this.container.classList.remove('mascot-hidden');
            this.say('Я снова с тобой! Чем могу помочь? 🚀', 5000, 'smile');
        }
    }

    setIn3D(isIn3D) {
        this.isIn3D = isIn3D;
        if (!this.container) return;

        if (isIn3D) {
            this.container.classList.add('mascot-hidden');
            if (this.collapsedPill) this.collapsedPill.classList.remove('is-visible');
        } else {
            if (!this.isCollapsed) {
                this.container.classList.remove('mascot-hidden');
            } else if (this.collapsedPill) {
                this.collapsedPill.classList.add('is-visible');
            }
        }
    }

    destroy() {
        window.removeEventListener('mousemove', this.onMouseMove);
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        clearTimeout(this.idleTimer);
        clearInterval(this.proactiveTimer);
        clearTimeout(this.stateResetTimer);
        clearTimeout(this.bubbleHideTimer);
        clearTimeout(this.speakingTimer);
        clearTimeout(this.moodBadgeTimer);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.collapsedPill && this.collapsedPill.parentNode) {
            this.collapsedPill.parentNode.removeChild(this.collapsedPill);
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export const Mascot = new AuroraMascot();
export default Mascot;
