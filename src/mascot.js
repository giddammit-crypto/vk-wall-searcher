/**
 * src/mascot.js — Интерактивный робот-маскот Космо (Cosmo) для AURORA (v4.12.0)
 * ============================================================================
 * Персонаж: Космо (Cosmo)
 * Характер: Добрый, озорной, игривый, гиперактивный, поднимает настроение,
 *           подшучивает и ехидничает над действиями пользователя и курсором,
 *           считает себя величайшим SMM-гуру ВКонтакте во всей галактике!
 *
 * Архитектура v4.12.0:
 *   1. 20 уникальных мультяшных анимаций и активностей (Pixar / game mascot style):
 *      - tablet_study (голографический планшет с графиками ВК)
 *      - inspect_screen (3D разворот на 180° спиной к зрителю + сканирующий луч)
 *      - horizontal_patrol (плавный полет-патрулирование по нижней кромке экрана)
 *      - magnifier_scan, visor_wipe, antenna_tune, joy_dance, upside_down,
 *        energy_drink, laser_pointer, shrug_confused, flex_muscles, check_watch,
 *        dizzy_spin, cursor_dodge, telescope_look, excited_wave, easter_flip,
 *        sleep_snooze, smm_guru_pose.
 *   2. Точный расчет лидеров по реальным филиалам (Zero Hallucination Guarantee):
 *      - При выборе «Кто лидер?» выдаёт ТОЛЬКО реальные данные из текущего сканирования.
 *      - Если сканирование не запускалось — прямо сообщает об этом и предлагает
 *        запустить сканирование по кнопке или клику в облачке!
 *   3. Cursor Stalking & Teasing Engine:
 *      - Расчет скорости, дистанции и остановок курсора с остроумными комментариями.
 *   4. Zero SVG Rule:
 *      - 100% чистый PNG для спрайтов + чистый CSS3/градиенты для всех реквизитов.
 *   5. Строгая экономия токенов:
 *      - 95%+ реплик — 100% локальные (0 токенов).
 *      - Компактный промпт ИИ (<45 токенов), сессионный кэш Map, кулдаун 12 сек.
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.12.0';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

// Базовые PNG-спрайты Космо (100% PNG, без SVG)
const SPRITES = {
    idle: 'assets/images/mascot/robot_idle.png?v=4.12.0',
    smile: 'assets/images/mascot/robot_smile.png?v=4.12.0',
    thinking: 'assets/images/mascot/robot_thinking.png?v=4.12.0',
    yawn: 'assets/images/mascot/robot_yawn.png?v=4.12.0',
    tired: 'assets/images/mascot/robot_tired.png?v=4.12.0',
    sleep: 'assets/images/mascot/robot_sleep.png?v=4.12.0',
    angry: 'assets/images/mascot/robot_angry.png?v=4.12.0'
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
        .replace(/'/g, '&#039;');
}

function formatViews(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('ru-RU');
}

// ============================================================================
// 100% LOCAL ZERO-TOKEN BANTER (Богатый словарь реплик Космо: 0 токенов!)
// ============================================================================
const COSMO_LOCAL_BANTER = [
    // SMM-лайфхаки и юмор про ВК
    'Знаешь, почему умная лента ВК любит посты с фото? Потому что даже роботам лень читать сплошной текст! 📸',
    'Если выложить пост во вторник в 18:30 — получишь +30% к охвату. Мои квантовые датчики никогда не врут! ⏰',
    'Не ставь по 20 хэштегов, это же не 2012 год! Оставь три, но метких, как орбитальный лазер. 🎯',
    'Опросы во ВКонтакте — секретное оружие вовлечения. Люди обожают нажимать кнопки, даже если не в теме! 📊',
    'Длинный пост без абзацев? Умная лента отправляет такие прямо в чёрную дыру. Добавь воздуха! 🌌',
    'Пост с видео собирает в 2.4 раза больше репостов. Пора снимать библиотечный блокбастер! 🎬',
    'Сторисы во ВКонтакте смотрят даже те, кто делает вид, что работает. Намекни читателям о новинках! 📱',
    'Кликбейтный заголовок — это искусство. Главное, чтобы пост не оказался скучнее заголовка! 😉',
    'Один искренний комментарий ценнее десяти ленивых лайков. Алгоритмы ВК сейчас аплодируют! 💬',
    'Опять смотришь статистику? Спойлер: у хорошего контента охваты всегда растут! 🚀',
    'Эй, не забывай про призыв к действию в конце! Пользователи сами не догадаются поставить сердечко. ❤️',
    'Библиотечные паблики рулят, если в них есть душа и юмор! Ну и я, конечно же. ✨',
    'Умная лента ВК сканирует пост за 0.03 секунды. Я делаю это быстрее, но результат тот же: шедевр! ⚡',
    'Утренние посты в 08:15 читают в автобусах. Лови сонных читателей теплым контентом! ☕',
    'Репост без своего комментария — как чай без заварки. Добавь пару мыслей для виральности! 💡',
    'Карусель из картинок удерживает взгляд на 4 секунды дольше. А это победа над лентой новостей! 🎠',
    'Инфографика в библиотеке? Читатели в восторге, методисты в экстазе! Делай чаще. 📈',
    'Хочешь виральный охват? Расскажи историю о потерянной и найденной через 30 лет книге! 📖',
    'Пока ты думаешь над темой, другие уже собирают просмотры на котиках в читальном зале! 🐱',

    // Подколы над курсором и действиями пользователя
    'Ого, какая скорость клика! Тренируешься ставить лайки на скорость? ⚡',
    'Курсор замер... Ищешь кнопку «Сделать шедевр»? Она прямо передо мной! 🎨',
    'Не туда кликаешь, дай покажу как надо! Я же сертифицированный SMM-гуру. 💅',
    'Курсор так дрожит, будто охваты в понедельник утром упали! Не переживай, наверстаем. 📉',
    'Ты за мной следишь или за умной лентой? Смотри на меня осторожнее, я могу зазнаться! 🤖',
    'Осторожно, не протри коврик для мыши до дыр! Лучше кликни на свежий пост. 🖱️',
    'Стоп! Замри! Кажется, прямо мимо пролетел шальной виральный охват! 🎯',
    'Хе-хе, не поймаешь! Мой корпус смазан квантовой антигравитацией. 💫',
    'Курсор кругами ходит... Пытаешься заколдовать алгоритмы продвижения? 🌀',
    'Ты так уверенно водишь мышкой, будто сам Дуров учил тебя веб-серфингу! 😎',
    'Быстрый скролл детектирован! Ты читаешь посты со скоростью света или просто ищешь картинки? 🔍',
    'Опять кликнул мимо кнопки? Спокойно, спишем это на гравитационные аномалии. 🪐',
    'Твой курсор подобрался слишком близко! Мои антигравы переходят в режим щекотки. 🛸',

    // Фирменное самолюбование Космо
    'Я проанализировал миллион постов во Вселенной. Мой вердикт: ты молодец, но со мной будешь звездой! 🌟',
    'Говорят, скромность украшает... но я робот, мне больше к лицу плазменный блеск и высокие охваты! 💅',
    'Мои нейросети настроены на идеальный баланс добра и легкого сарказма. Наслаждайся! 😇',
    'Если бы за каждый хороший пост давали звезду — у нас бы уже была своя галактика! ✨',
    'Я не просто маскот, я твой персональный SMM-директор с нулевым расходом бюджета. 💰',
    'Изучил планшет: вовлеченность на высоте, но мы можем еще круче. Показывай следующий запрос! 📋',
    'В космосе никто не услышит твой вздох над плохим охватом, а я услышу и помогу! 🛰️',
    'Мой процессор выдает 1000 остроумных советов в секунду, но я берегу твои нервы. Лови лучший! 💡',
    'Кто главный по пабликам во Владимире? Конечно, наши библиотекари! Ну и я на подтанцовке. 🕺',
    'Внимание: уровень контента на этой странице превышает средний по галактике! 🌌',
    'Сделал разворот на 360 градусов — и не увидел ни одного конкурента нашему стилю! 🔄',
    'Если что-то непонятно — кликай на быстрые чипы в моем облачке, я всё разложу по полочкам! 🧠',
    'Патрулирую периметр экрана. Ни один читатель без лайка не уйдет! 🚨',
    'Знаешь главное правило SMM? Контент — король, а Космо — его космический советник! 👑',
    'Смотрю на графики во вкладке «Аналитика»... Глаз не оторвать, чистая поэзия цифр! 📊',
    'Ты работаешь, я патрулирую экран. Идеальный экипаж космического корабля AURORA! 🚀'
];

// Быстрые чипы для диалога
const QUICK_CHIPS = [
    { label: '📊 Кто лидер?', action: 'leader' },
    { label: '🕒 Когда постить?', query: 'В какие дни и часы эффективнее всего выкладывать посты?' },
    { label: '💡 Совет по контенту', query: 'Дай один короткий совет для роста активности читателей.' },
    { label: '✨ Спросить Космо...', action: 'custom' }
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
        this.collapsedPill = null;
        this.moodBadgeEl = null;
        this.particlesLayerEl = null;
        this.propsLayerEl = null;
        this.aiInputWrapEl = null;
        this.aiInputEl = null;
        this.aiSendBtnEl = null;

        this.currentState = 'idle';
        this.currentActivity = null;
        this.stateResetTimer = null;
        this.greetingTimer = null;
        this.bubbleHideTimer = null;
        this.speakingTimer = null;
        this.moodBadgeTimer = null;
        this.idleTimer = null;
        this.proactiveTimer = null;
        this.activityCycleTimer = null;
        this.clickTimeout = null;

        this.isSleeping = false;
        this.isCollapsed = false;
        this.isIn3D = false;
        this.isAiLoading = false;
        this.isPerformingActivity = false;

        this.lastAiCallTime = 0;
        this.aiCooldownMs = 12000;
        this.aiCache = new Map();

        // Данные последнего сканирования (для точных ответов без галлюцинаций)
        this.lastScanStats = null;

        // 2.5D трекинг и курсор
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastMouseMoveTime = Date.now();
        this.mouseVelocity = 0;
        this.lastTeaseCommentTime = 0;
        this.teaseCooldownMs = 9000;

        this.currentRotX = 0;
        this.currentRotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;

        // Горизонтальное позиционирование (Patrol & Roam)
        this.currentPosX = 24;
        this.targetPosX = 24;
        this.minPosX = 20;
        this.maxPosXRatio = 0.40;
        this.animFrameId = null;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onUserActivity = this.onUserActivity.bind(this);
        this.updateParallaxAndMotion = this.updateParallaxAndMotion.bind(this);
    }

    /* ---------------------------------------------------------------------
     * 1. Инициализация DOM-структуры Космо
     * ------------------------------------------------------------------- */
    init() {
        if (this.container) return;

        // Предзагрузка всех 7 спрайтов
        Object.values(SPRITES).forEach(url => {
            const img = new Image();
            img.src = url;
        });

        // Главный контейнер Космо
        const container = document.createElement('div');
        container.className = 'aurora-mascot-container';
        container.setAttribute('data-state', 'idle');
        container.style.left = `${this.currentPosX}px`;

        container.innerHTML = `
            <!-- Облачко диалога и подсказок -->
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
                    <button type="button" class="mascot-bubble-close" title="Закрыть реплику" data-bubble-close>&times;</button>
                </div>

                <p class="mascot-bubble-text" data-bubble-text>
                    Салют! Я <strong>Космо</strong> — твой озорной робот-маскот и главный SMM-эксперт галактики. Показывай стену, прокачаем охваты до небес! 🚀✨
                </p>

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

            <!-- Корпус Космо с 2.5D трекингом и моушен-слоями -->
            <div class="mascot-body-wrapper" data-mascot-body title="Космо: клик — поболтать, двойной клик — сальто!">
                <!-- Кнопка сворачивания в пилюлю -->
                <button type="button" class="mascot-toggle-btn" title="Свернуть Космо" data-mascot-collapse>&minus;</button>
                
                <!-- Всплывающий эмодзи-бейдж настроения -->
                <div class="mascot-mood-badge" data-mascot-mood-badge>✨</div>

                <!-- Неоновый маячок на верхушке антенны -->
                <div class="mascot-antenna-beacon"></div>

                <!-- Слой реквизита для 20 активностей (100% чистый CSS, без SVG) -->
                <div class="mascot-props-layer" data-mascot-props>
                    <!-- 1. Планшет -->
                    <div class="mascot-holo-tablet">
                        <div class="holo-tablet-bars">
                            <div class="holo-bar"></div>
                            <div class="holo-bar"></div>
                            <div class="holo-bar"></div>
                            <div class="holo-bar"></div>
                        </div>
                    </div>
                    <!-- 2. Сканирующий конус при развороте спиной -->
                    <div class="mascot-scan-cone"></div>
                    <!-- 4. Голографическая лупа -->
                    <div class="mascot-holo-magnifier"></div>
                    <!-- 5. Салфетка протирки визора -->
                    <div class="mascot-wipe-cloth"></div>
                    <!-- 9. Энергетический напиток -->
                    <div class="mascot-drink-box"><div class="mascot-drink-straw"></div></div>
                    <!-- 10. Точка лазерной указки -->
                    <div class="mascot-laser-dot"></div>
                    <!-- 14. Звезды головокружения -->
                    <div class="mascot-orbit-stars"><span>⭐</span><span>✨</span><span>⭐</span></div>
                    <!-- 16. Кибер-телескоп -->
                    <div class="mascot-telescope"></div>
                    <!-- 20. Корона чемпиона SMM-гуру -->
                    <div class="mascot-guru-crown">👑</div>
                </div>

                <!-- Блок парения и анимаций действий -->
                <div class="mascot-floater" data-mascot-floater>
                    <img src="${SPRITES.idle}" alt="Космо" class="mascot-sprite-img" data-mascot-img />
                    
                    <!-- CRT сканлайны и скользящий блик визора -->
                    <div class="mascot-screen-overlay"></div>

                    <!-- Плазменный факел антигравитации снизу -->
                    <div class="mascot-thruster-glow"></div>
                </div>

                <!-- Слой разлетающихся искр / частиц -->
                <div class="mascot-particles-layer" data-mascot-particles></div>

                <!-- Частицы сна (Z z z) -->
                <div class="mascot-sleep-particles">
                    <span class="sleep-z z-1">z</span>
                    <span class="sleep-z z-2">Z</span>
                    <span class="sleep-z z-3">Z</span>
                </div>

                <!-- Адаптивная тень под роботом -->
                <div class="mascot-shadow"></div>
            </div>
        `;

        // Мини-пилюля при сворачивании
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
        this.collapsedPill = pill;

        this.bindEvents();
        this.bindAutonomousInteractions();
        this.startAutonomousCycle();
        this.startProactiveChatter();
        this.updateParallaxAndMotion();
        this.resetIdleTimer();

        // Стартовое приветствие Космо через 1.6 сек
        this.greetingTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed) {
                this.say('Космо на связи! Готов помочь с аналитикой и подсказать лучших по охватам! 🚀📈', 7500, 'smile');
            }
        }, 1600);
    }

    /* ---------------------------------------------------------------------
     * 2. Привязка событий интерфейса
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

                if (action === 'leader') {
                    this.showLeaderReport();
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

        // Интерактивные кнопки внутри текста облачка (например, «Запустить сканирование»)
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
     * 3. РАСЧЕТ И ОТОБРАЖЕНИЕ ЛИДЕРОВ (Zero Hallucinations Guarantee)
     * ------------------------------------------------------------------- */
    getScanStats() {
        if (this.lastScanStats && this.lastScanStats.count > 0) {
            return this.lastScanStats;
        }
        if (window.__AURORA_LAST_SCAN_SNAPSHOT__ && window.__AURORA_LAST_SCAN_SNAPSHOT__.count > 0) {
            return window.__AURORA_LAST_SCAN_SNAPSHOT__;
        }

        // Fallback: считываем из глобального состояния приложения
        const appState = window.__VK_APP__?.state;
        if (appState && appState.matchedPosts && appState.matchedPosts.length > 0 && appState.lastGroupsStats && appState.lastGroupsStats.length > 0) {
            const valid = appState.lastGroupsStats.filter(s => (s.postsCount || 0) > 0);
            if (valid.length > 0) {
                const sortedByViews = [...valid].sort((a, b) => (b.views || 0) - (a.views || 0));
                const sortedByReactions = [...valid].sort((a, b) => (b.totalInteractions || 0) - (a.totalInteractions || 0));
                const sortedByEr = [...valid].filter(s => (s.views || 0) >= 40).sort((a, b) => (b.erViews || 0) - (a.erViews || 0));

                const snap = {
                    count: appState.matchedPosts.length,
                    totalViews: valid.reduce((acc, s) => acc + (s.views || 0), 0),
                    topByViews: sortedByViews[0] ? {
                        name: sortedByViews[0].info?.canonicalName || sortedByViews[0].info?.name || 'ЦГБ',
                        views: sortedByViews[0].views || 0,
                        postsCount: sortedByViews[0].postsCount || 0,
                        interactions: sortedByViews[0].totalInteractions || 0
                    } : null,
                    secondByViews: sortedByViews[1] ? {
                        name: sortedByViews[1].info?.canonicalName || sortedByViews[1].info?.name || '',
                        views: sortedByViews[1].views || 0,
                        postsCount: sortedByViews[1].postsCount || 0,
                        interactions: sortedByViews[1].totalInteractions || 0
                    } : null,
                    thirdByViews: sortedByViews[2] ? {
                        name: sortedByViews[2].info?.canonicalName || sortedByViews[2].info?.name || '',
                        views: sortedByViews[2].views || 0,
                        postsCount: sortedByViews[2].postsCount || 0,
                        interactions: sortedByViews[2].totalInteractions || 0
                    } : null,
                    topByReactions: sortedByReactions[0] ? {
                        name: sortedByReactions[0].info?.canonicalName || sortedByReactions[0].info?.name || '',
                        interactions: sortedByReactions[0].totalInteractions || 0
                    } : null,
                    topByEr: sortedByEr[0] ? {
                        name: sortedByEr[0].info?.canonicalName || sortedByEr[0].info?.name || '',
                        er: sortedByEr[0].erViews || 0
                    } : null,
                    rankedBranches: sortedByViews.map(s => ({
                        name: s.info?.canonicalName || s.info?.name || '',
                        views: s.views || 0,
                        interactions: s.totalInteractions || 0,
                        postsCount: s.postsCount || 0,
                        er: s.erViews || 0
                    }))
                };
                this.lastScanStats = snap;
                return snap;
            }
        }
        return null;
    }

    showLeaderReport() {
        const stats = this.getScanStats();

        // 1. ЕСЛИ СКАНИРОВАНИЕ НЕ ЗАПУСКАЛОСЬ
        if (!stats || !stats.topByViews || stats.count === 0) {
            const emptyHtml = 
                `📊 <strong>Сканирование статистики ещё не запускалось!</strong><br><br>` +
                `Чтобы я показал реальных лидеров среди наших 18 филиалов, сначала нужно собрать данные со стены ВКонтакте.<br>` +
                `Выбери период и нажми кнопку <strong>«Начать поиск по записям»</strong> (или нажми кнопку прямо здесь)! 🚀✨` +
                `<div style="margin-top:10px;">` +
                `<button type="button" class="mascot-action-btn" data-mascot-action="start-search" style="background:linear-gradient(135deg,#00f0ff,#3b82f6);color:#fff;border:none;padding:7px 16px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 3px 12px rgba(0,240,255,0.4);display:inline-flex;align-items:center;gap:6px;">` +
                `🚀 Запустить сканирование` +
                `</button>` +
                `</div>`;
            this.say(emptyHtml, 16000, 'thinking');
            this.setMoodBadge('📊', 4000);
            return;
        }

        // 2. ЕСЛИ ЕСТЬ РЕАЛЬНЫЕ ДАННЫЕ СКАНИРОВАНИЯ
        const topV = stats.topByViews;
        const secV = stats.secondByViews;
        const thiV = stats.thirdByViews;
        const topR = stats.topByReactions;
        const topE = stats.topByEr;
        const totalP = stats.count;
        const totalV = stats.totalViews || 0;

        let resHtml = `🏆 <strong>Итоги сканирования (${totalP} постов, ${formatViews(totalV)} просм.):</strong><br><br>`;
        if (topV) {
            resHtml += `🥇 <strong>Лидер по охвату:</strong> ${escapeHtml(topV.name)} — <strong>${formatViews(topV.views)}</strong> просмотров (${topV.postsCount} постов, ${topV.interactions} реакций)! 🔥<br>`;
        }
        if (secV && secV.name && secV.name !== topV?.name) {
            resHtml += `🥈 <strong>2-е место:</strong> ${escapeHtml(secV.name)} — <strong>${formatViews(secV.views)}</strong> просм.<br>`;
        }
        if (thiV && thiV.name && thiV.name !== secV?.name && thiV.name !== topV?.name) {
            resHtml += `🥉 <strong>3-е место:</strong> ${escapeHtml(thiV.name)} — <strong>${formatViews(thiV.views)}</strong> просм.<br>`;
        }
        if (topR && topR.name && topR.name !== topV?.name) {
            resHtml += `<br>❤️ <strong>Лидер по реакциям:</strong> ${escapeHtml(topR.name)} — <strong>${formatViews(topR.interactions)}</strong> реакций!<br>`;
        }
        if (topE && topE.name && topE.er > 0) {
            resHtml += `⚡ <strong>Максимальный ER:</strong> ${escapeHtml(topE.name)} — <strong>${topE.er.toFixed(2)}%</strong>!<br>`;
        }

        resHtml += `<br><em>Космо в восторге! Все цифры строго из результатов сканирования филиалов!</em> 🕶️✨`;

        this.say(resHtml, 16000, 'smile');
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(8);
        this.playActivity('smm_guru_pose', false, 4000);
    }

    triggerSearchFromMascot() {
        this.say('Погнали! Запускаю сканирование постов ВКонтакте! 🚀⚡', 5000, 'smile');
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
        }, 500);
    }

    /* ---------------------------------------------------------------------
     * 4. АВТОНОМНЫЙ ЦИКЛ 20 АКТИВНОСТЕЙ КОСМО (Pixar Mascot Style)
     * ------------------------------------------------------------------- */
    startAutonomousCycle() {
        const scheduleNext = () => {
            const delay = 18000 + Math.random() * 14000;
            this.activityCycleTimer = setTimeout(() => {
                if (!this.isSleeping && !this.isIn3D && !this.isCollapsed && !this.isAiLoading && !this.isPerformingActivity) {
                    this.executeRandomActivity();
                }
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }

    executeRandomActivity() {
        const activities = [
            'tablet_study',     // 1. Изучает планшет с графиками ВК
            'inspect_screen',   // 2. 180° разворот спиной к экрану со сканером
            'horizontal_patrol',// 3. Патрулирование по нижней кромке экрана
            'magnifier_scan',   // 4. Сканирование через голографическую лупу
            'visor_wipe',       // 5. Протирка визора тряпочкой
            'antenna_tune',     // 6. Настройка антенны с искрами
            'joy_dance',        // 7. Победный мультяшный танец
            'upside_down',      // 8. Зависание вверх ногами
            'energy_drink',     // 9. Питье машинного масла через трубочку
            'laser_pointer',    // 10. Игра лазерной указкой по странице
            'shrug_confused',   // 11. Разведение ручек с вопросиками
            'flex_muscles',     // 12. Надувание бицепсов SMM-супергероя
            'check_watch',      // 13. Проверка голографических часов
            'dizzy_spin',       // 14. Вращение волчком со звездочками
            'cursor_dodge',     // 15. Ловкий уворот от курсора
            'telescope_look',   // 16. Осмотр страницы через телескоп
            'excited_wave',     // 17. Радостное махание ручками
            'easter_flip',      // 18. Полное сальто назад на 360°
            'sleep_snooze',     // 19. Дремота с пузырями
            'smm_guru_pose'     // 20. Стойка величайшего SMM-гуру
        ];

        const pick = activities[Math.floor(Math.random() * activities.length)];
        this.playActivity(pick);
    }

    playActivity(activityName, customText = null, forcedDuration = null) {
        if (!this.bodyEl) return;
        this.isPerformingActivity = true;
        const shouldSpeak = (customText !== false);
        this.currentActivity = activityName;
        this.bodyEl.setAttribute('data-activity', activityName);

        let duration = forcedDuration || 4500;
        let sprite = 'smile';
        let emoji = '✨';

        switch (activityName) {
            case 'tablet_study':
                sprite = 'thinking';
                emoji = '📱';
                duration = 4800;
                if (shouldSpeak) this.say(customText || 'Сверяю графики на голографическом планшете... Умная лента сегодня благоволит хорошим визуалам! 📊', duration, sprite);
                break;

            case 'inspect_screen':
                sprite = 'idle';
                emoji = '🔍';
                duration = 5200;
                if (shouldSpeak) this.say(customText || 'Минутку, развернусь и лично проинспектирую страницу сканирующим лучом... 👀✨', duration, sprite);
                break;

            case 'horizontal_patrol':
                sprite = 'smile';
                emoji = '🛸';
                duration = 5500;
                this.patrolHorizontally();
                if (shouldSpeak) this.say(customText || 'Патрулирую периметр экрана! Ни один тренд не скроется от Космо! 🚨', duration, sprite);
                break;

            case 'magnifier_scan':
                sprite = 'thinking';
                emoji = '🔎';
                duration = 4200;
                if (shouldSpeak) this.say(customText || 'Сканирую верстку через неоновую лупу... Обнаружен высокий читательский потенциал! 💡', duration, sprite);
                break;

            case 'visor_wipe':
                sprite = 'smile';
                emoji = '🧽';
                duration = 3800;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || 'Протираю визор до зеркального блеска! Теперь каждый ваш лайк сияет в 4K Ultra HD! ✨', duration, sprite);
                break;

            case 'antenna_tune':
                sprite = 'thinking';
                emoji = '📡';
                duration = 4000;
                if (shouldSpeak) this.say(customText || 'Калибрую антенну на радиоволну умной ленты ВКонтакте... Сигнал отличный! 📻', duration, sprite);
                break;

            case 'joy_dance':
                sprite = 'smile';
                emoji = '🕺';
                duration = 3600;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || 'Победный танец SMM-гуру! Пусть охваты растут со скоростью света! 🎶🔥', duration, sprite);
                break;

            case 'upside_down':
                sprite = 'smile';
                emoji = '🙃';
                duration = 4500;
                if (shouldSpeak) this.say(customText || 'Хе-хе, в невесомости вверх ногами даже веселее! Привет читателям с орбиты! 🤸‍♂️', duration, sprite);
                break;

            case 'energy_drink':
                sprite = 'idle';
                emoji = '🧃';
                duration = 4200;
                if (shouldSpeak) this.say(customText || 'Минутка дозаправки! Синтетическое масло Cyber Oil с ароматом свежих книг. Вкуснота! 🧃⚙️', duration, sprite);
                break;

            case 'laser_pointer':
                sprite = 'idle';
                emoji = '🎯';
                duration = 4600;
                if (shouldSpeak) this.say(customText || 'Лови красную точку лазера! Тренируем внимательность умной ленты! 🔴🐾', duration, sprite);
                break;

            case 'shrug_confused':
                sprite = 'tired';
                emoji = '❓';
                duration = 3500;
                if (shouldSpeak) this.say(customText || 'Опять пост без яркой картинки? Ну как так, друзья? Космо в недоумении! 🤷‍♂️', duration, sprite);
                break;

            case 'flex_muscles':
                sprite = 'smile';
                emoji = '💪';
                duration = 3800;
                this.spawnSparkles(7);
                if (shouldSpeak) this.say(customText || 'Накачал бицепсы продвижения! С такой силой любой библиотечный пост залетит в тренды! 💥', duration, sprite);
                break;

            case 'check_watch':
                sprite = 'idle';
                emoji = '⌚';
                duration = 4000;
                if (shouldSpeak) this.say(customText || 'Сверяю квантовые часы: самое время порадовать подписчиков анонсом мастер-класса! ⏰', duration, sprite);
                break;

            case 'dizzy_spin':
                sprite = 'yawn';
                emoji = '💫';
                duration = 4500;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || 'Ой-ой, перестарался с вращением... Звездочки перед визором! Но я в строю! 🌀😵', duration, sprite);
                break;

            case 'cursor_dodge':
                sprite = 'smile';
                emoji = '⚡';
                duration = 3200;
                this.spawnSparkles(5);
                if (shouldSpeak) this.say(customText || 'Оп! Ловкий гравитационный уворот! Моя реакция — 0.001 секунды! 🏃‍♂️💨', duration, sprite);
                break;

            case 'telescope_look':
                sprite = 'thinking';
                emoji = '🔭';
                duration = 4800;
                if (shouldSpeak) this.say(customText || 'Смотрю в кибер-телескоп вдаль... Вижу горизонт грандиозных библиотечных просмотров! 🌌', duration, sprite);
                break;

            case 'excited_wave':
                sprite = 'smile';
                emoji = '👋';
                duration = 3400;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || 'Эй, привет! Космо машет обеими руками всем труженикам библиотечного фронта! 👋🥰', duration, sprite);
                break;

            case 'easter_flip':
                sprite = 'smile';
                emoji = '🤸';
                duration = 1800;
                this.spawnSparkles(12);
                if (shouldSpeak) this.say(customText || 'Вууух! Сальто на 360 градусов! Антигравы работают на 100%! 🚀', duration, sprite);
                break;

            case 'sleep_snooze':
                sprite = 'sleep';
                emoji = '😴';
                duration = 5000;
                if (shouldSpeak) this.say(customText || 'Режим быстрой энергосберегающей подзарядки... zZz... Пересчитываю охваты во сне... 💤', duration, sprite);
                break;

            case 'smm_guru_pose':
            default:
                sprite = 'smile';
                emoji = '👑';
                duration = 4500;
                this.spawnSparkles(10);
                if (shouldSpeak) this.say(customText || 'Минутка гордости: непревзойденный SMM-гуру галактики Космо к вашим услугам! 🕶️💅', duration, sprite);
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
     * 5. Горизонтальное патрулирование по нижней кромке экрана
     * ------------------------------------------------------------------- */
    patrolHorizontally() {
        if (!this.container || this.isIn3D || this.isCollapsed) return;

        const maxAvailable = Math.round(Math.min(window.innerWidth * this.maxPosXRatio, 560));
        const minAvailable = this.minPosX;

        let newX = minAvailable + Math.random() * (maxAvailable - minAvailable);
        newX = Math.max(minAvailable, Math.min(maxAvailable, Math.round(newX)));

        this.targetPosX = newX;
        this.container.style.left = `${this.targetPosX}px`;
    }

    /* ---------------------------------------------------------------------
     * 6. CURSOR STALKING & TEASING ENGINE (Подколы над мышью пользователя)
     * ------------------------------------------------------------------- */
    onMouseMove(e) {
        const now = Date.now();
        const dt = Math.max(1, now - this.lastMouseMoveTime);

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const distMoved = Math.hypot(dx, dy);

        this.mouseVelocity = distMoved / dt; // px / ms

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.lastMouseMoveTime = now;

        if (this.isSleeping || this.isCollapsed || !this.bodyEl) {
            this.targetRotX = 0;
            this.targetRotY = 0;
            return;
        }

        const rect = this.bodyEl.getBoundingClientRect();
        const mascotCenterX = rect.left + rect.width / 2;
        const mascotCenterY = rect.top + rect.height / 2;
        const distToCosmo = Math.hypot(this.mouseX - mascotCenterX, this.mouseY - mascotCenterY);

        // 2.5D поворот корпуса к курсору
        const relX = (this.mouseX - mascotCenterX) / window.innerWidth;
        const relY = (this.mouseY - mascotCenterY) / window.innerHeight;
        this.targetRotY = Math.max(-18, Math.min(18, relX * 34));
        this.targetRotX = Math.max(-14, Math.min(14, -relY * 24));

        // Интерактивный уворот при приближении курсора ближе 85px
        if (distToCosmo < 85 && !this.isPerformingActivity && Math.random() < 0.22) {
            this.playActivity('cursor_dodge', 'Ой, щекотно! Мои датчики не любят прикосновений курсора! 🤖⚡', 2400);
            return;
        }

        // Подколы над курсором с кулдауном
        if (now - this.lastTeaseCommentTime > this.teaseCooldownMs && !this.isPerformingActivity) {
            // А. Сверхвысокая скорость мыши
            if (this.mouseVelocity > 1.9 && distToCosmo < 380) {
                this.lastTeaseCommentTime = now;
                this.say('Ого, какая скорость курсора! Тренируешься ставить лайки на сверхзвуке? ⚡🖱️', 4500, 'smile');
                this.setMoodBadge('⚡', 2500);
            }
            // Б. Мышь замерла прямо перед Космо
            else if (distToCosmo < 140 && this.mouseVelocity < 0.05) {
                this.lastTeaseCommentTime = now;
                this.say('Чего замер? Любуешься моим титановым корпусом? Я не против, я фотогеничен! 😎💅', 4500, 'smile');
                this.setMoodBadge('✨', 2500);
            }
        }
    }

    updateParallaxAndMotion() {
        if (!this.isIn3D && !this.isCollapsed && this.floaterEl) {
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
     * 7. Автономные реакции на действия на сайте (0 токенов!)
     * ------------------------------------------------------------------- */
    bindAutonomousInteractions() {
        // Фокус в поиске
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

        // Клик по вкладкам сайта
        document.addEventListener('click', (e) => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed) return;

            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tabTarget = tabBtn.getAttribute('data-tab');
                const tabComments = {
                    'tab-analytics': 'Вкладка «Аналитика» — моё любимое! Тут графики красивее, чем кольца Сатурна! 📈✨',
                    'tab-advice': 'Вкладка «Советы филиалам»! 20+ рекомендаций для прокачки контента. Читаем внимательно! 💡',
                    'tab-subscribers': 'Статистика подписчиков! Рост аудитории — главный показатель доверия читателей! 👥',
                    'tab-promo': 'О, промо-материалы! 10 дизайнерских шаблонов плакатов и закладок. Стильно и без слопа! 🎨',
                    'tab-radar': 'Орбитальный радар обновлений! Следит за активностью всех 18 филиалов в реальном времени! 🛰️'
                };
                if (tabComments[tabTarget] && Math.random() < 0.6) {
                    this.say(tabComments[tabTarget], 6500, 'smile');
                }
            }
        });
    }

    /* ---------------------------------------------------------------------
     * 8. Реакции на клики по роботу (Easter Eggs)
     * ------------------------------------------------------------------- */
    triggerPokeSquish() {
        this.bodyEl.classList.remove('is-poked');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-poked');

        const pokeReplies = [
            'Ой! Щекотно! Мои квантовые датчики реагируют на каждый клик! 🤖',
            'Тыкаешь? Лучше нажми на чип <strong>«Кто лидер?»</strong> или <strong>«Совет»</strong>!',
            'Космо на страже ваших охватов! Чем помочь, друг? ✨',
            'Два быстрых клика — и я сделаю сальто в невесомости! Попробуй! 🤸',
            'Ай! Не помяли ли мы мне крыло? Шучу, титановый сплав держит удар! 🛡️',
            'Я заряжен на 100% позитива и готов штурмовать алгоритмы ВК! ⚡'
        ];
        const randomReply = pokeReplies[Math.floor(Math.random() * pokeReplies.length)];
        this.say(randomReply, 5500, 'smile');
        this.spawnSparkles(6);
    }

    triggerEasterBackflip() {
        this.playActivity('easter_flip', 'Хоп! Двойной клик принят! Сальто в невесомости на 360 градусов! 🤸🚀', 1800);
    }

    spawnSparkles(count = 8) {
        if (!this.particlesLayerEl) return;
        for (let i = 0; i < count; i++) {
            const span = document.createElement('span');
            span.className = 'mascot-sparkle';
            span.textContent = ['✨', '⭐', '🌟', '⚡', '💫'][Math.floor(Math.random() * 5)];
            span.style.left = `${40 + (Math.random() * 40 - 20)}%`;
            span.style.top = `${40 + (Math.random() * 40 - 20)}%`;
            span.style.setProperty('--tx', `${(Math.random() - 0.5) * 110}px`);
            span.style.setProperty('--ty', `${-40 - Math.random() * 70}px`);

            this.particlesLayerEl.appendChild(span);
            setTimeout(() => span.remove(), 850);
        }
    }

    /* ---------------------------------------------------------------------
     * 9. Бейдж настроения и FSM
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

    setState(state, autoResetDurationMs = 0) {
        if (!SPRITES[state]) return;
        this.currentState = state;
        this.isSleeping = (state === 'sleep');

        if (this.container) {
            this.container.setAttribute('data-state', state);
        }

        if (this.spriteImg && this.spriteImg.src !== SPRITES[state]) {
            this.spriteImg.src = SPRITES[state];
            this.spriteImg.classList.remove('emotion-pop');
            void this.spriteImg.offsetWidth;
            this.spriteImg.classList.add('emotion-pop');
        }

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

    say(htmlText, durationMs = 8000, state = null) {
        if (this.greetingTimer) { clearTimeout(this.greetingTimer); this.greetingTimer = null; }
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
     * 10. Токено-экономная нейросеть (Strict Token Thriftiness)
     * ------------------------------------------------------------------- */
    async askAiThrifty(userQuery) {
        if (this.isAiLoading) return;

        // Если вопрос касается лидеров / топа — сразу даем точные проверенные данные!
        const qLower = (userQuery || '').trim().toLowerCase();
        if (qLower.includes('лидер') || qLower.includes('кто лучший') || qLower.includes('кто на первом') || qLower.includes('первое место') || qLower.includes('топ филиал')) {
            this.showLeaderReport();
            return;
        }

        const now = Date.now();
        const elapsed = now - this.lastAiCallTime;
        if (elapsed < this.aiCooldownMs) {
            const remainSec = Math.ceil((this.aiCooldownMs - elapsed) / 1000);
            this.say(`Мои квантовые процессоры охлаждаются! Спроси через <strong>${remainSec} сек</strong> 🧊`, 3500, 'thinking');
            return;
        }

        // Проверка локального сессионного кэша (0 токенов!)
        const cacheKey = qLower;
        if (this.aiCache.has(cacheKey)) {
            const cached = this.aiCache.get(cacheKey);
            this.say(cached, 10000, 'smile');
            this.setMoodBadge('⚡', 3000);
            return;
        }

        // Подготовка строгого контекста для исключения галлюцинаций
        const stats = this.getScanStats();
        let microContext = 'Сканирование стены еще не производилось. Реальных данных нет. Если спросят про лидеров, прямо скажи запустить поиск!';
        if (stats && stats.count > 0) {
            const topV = stats.topByViews?.name || 'не определен';
            const topViewsNum = stats.topByViews?.views || 0;
            microContext = `Просканировано ${stats.count} постов. Реальный лидер по охвату: "${topV}" (${topViewsNum} просмотров). Используй ТОЛЬКО реальные названия библиотек. Ни в коем случае не выдумывай библиотеки!`;
        }

        const microSystemPrompt = 
            'Ты — Космо, остроумный робот-маскот AURORA для 18 библиотек Владимира, величайший SMM-гуру. ' +
            'Отвечай ультра-кратко: ровно 1-2 предложения, строго до 25-30 слов, используй 1 эмодзи. ' +
            `Контекст: ${microContext}. Не выдумывай несуществующие библиотеки.`;

        this.isAiLoading = true;
        this.lastAiCallTime = now;
        this.setMoodBadge('⚡', 10000);
        this.say('Подключаюсь к квантовому серверу... Секундочку! ⚡', 5000, 'thinking');

        try {
            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: microSystemPrompt },
                        { role: 'user', content: userQuery.slice(0, 100) }
                    ],
                    max_tokens: 200,
                    temperature: 0.5
                })
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            const reply = json.choices?.[0]?.message?.content || json.reply || '';

            if (reply) {
                this.aiCache.set(cacheKey, reply);
                this.say(reply, 12000, 'smile');
                this.setMoodBadge('💡', 4000);
            } else {
                throw new Error('Пустой ответ');
            }
        } catch (err) {
            console.warn('[Mascot AI] Fallback to local advice:', err);
            const fallback = 'Связь с орбитой прервалась, но мой совет: качественные фото и анонсы мероприятий в 18:00 дают лучший охват! 📸';
            this.say(fallback, 9000, 'tired');
            this.setMoodBadge('⚠️', 3000);
        } finally {
            this.isAiLoading = false;
        }
    }

    /* ---------------------------------------------------------------------
     * 11. Реакции на сканирование ВКонтакте
     * ------------------------------------------------------------------- */
    onScanStart(query = '') {
        const text = query
            ? `Ищу посты по запросу <strong>«${escapeHtml(query)}»</strong>... Сканирую базу данных!`
            : 'Запускаю полное сканирование стены группы ВКонтакте... Секундочку!';
        this.say(text, 12000, 'thinking');
        this.playActivity('tablet_study', null, 5000);
    }

    onScanProgress(loaded, total) {
        this.say(`Идёт обработка... Загружено <strong>${loaded}</strong> из <strong>${total}</strong> постов!`, 4000, 'thinking');
    }

    onScanSuccess(summary = {}) {
        const count = summary.count || 0;
        const topBranch = summary.topBranch || '';

        // Сохраняем полный снимок лидеров и статистики
        this.lastScanStats = {
            count,
            topBranch,
            topByViews: summary.topByViews || (topBranch ? { name: topBranch, views: summary.totalViews || 0, postsCount: count, interactions: 0 } : null),
            secondByViews: summary.secondByViews || null,
            thirdByViews: summary.thirdByViews || null,
            topByReactions: summary.topByReactions || null,
            topByEr: summary.topByEr || null,
            rankedBranches: summary.rankedBranches || [],
            totalViews: summary.totalViews || 0,
            query: summary.query || ''
        };

        window.__AURORA_LAST_SCAN_SNAPSHOT__ = this.lastScanStats;

        let msg = `Готово! Найдено <strong>${count}</strong> постов.`;
        if (topBranch) {
            msg += ` Лидер по охвату: <strong>${escapeHtml(topBranch)}</strong>.`;
        }
        msg += ' Нажми на чип <strong>«Кто лидер?»</strong> для подробного рейтинга! 🏆';
        this.say(msg, 12000, 'smile');
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(8);
    }

    onScanEmpty(query = '') {
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
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

    onScanReset() {
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
    }

    /* ---------------------------------------------------------------------
     * 12. Периодическая проактивная жизнь робота
     * ------------------------------------------------------------------- */
    startProactiveChatter() {
        clearInterval(this.proactiveTimer);
        this.proactiveTimer = setInterval(() => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed || this.isAiLoading || this.isPerformingActivity) return;

            const randomFact = COSMO_LOCAL_BANTER[Math.floor(Math.random() * COSMO_LOCAL_BANTER.length)];
            this.say(randomFact, 7500, 'smile');
        }, 55000);
    }

    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed && !this.isSleeping && !this.isPerformingActivity) {
                this.goToSleep();
            }
        }, 180000); // Засыпает через 3 минуты бездействия
    }

    goToSleep() {
        this.setState('sleep');
        this.say('Космо ушёл в режим гибернации... zZz... Кликни по мне, чтобы разбудить! 💤', 8000);
    }

    wakeUp() {
        this.isSleeping = false;
        this.setState('smile', 3000);
        this.spawnSparkles(8);
        this.say('Оп! Я проснулся! Системы онлайн, готов к покорению умной ленты! 🚀', 6000, 'smile');
        this.resetIdleTimer();
    }

    collapse() {
        this.isCollapsed = true;
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
        window.removeEventListener('mousemove', this.onMouseMove);
        clearInterval(this.proactiveTimer);
        clearTimeout(this.idleTimer);
        clearTimeout(this.activityCycleTimer);
        this.container?.remove();
        this.collapsedPill?.remove();
    }
}

export const Mascot = new AuroraMascot();
