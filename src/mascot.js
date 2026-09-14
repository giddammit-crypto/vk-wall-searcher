/**
 * src/mascot.js — Интерактивный робот-ассистент в 2D-пространстве AURORA
 * ============================================================================
 * Роль: Живой персонаж-помощник в левом нижнем углу экрана.
 *
 * Возможности:
 *   • 100% чистый PNG без SVG с альфа-прозрачностью.
 *   • Эмоции и состояния (FSM): idle, smile, thinking, yawn, tired, sleep, angry.
 *   • 2.5D трекинг курсора мыши (живой взгляд и поворот головы).
 *   • Интерактивное облачко подсказок и рекомендаций (Speech Bubble).
 *   • Анализ данных сканирования постов ВКонтакте и инсайты.
 *   • Реакция на неактивность (35с -> зевок, 70с -> усталость, 120с -> сон с Zzz).
 *   • Эффектное пробуждение при клике или движении рядом.
 *   • Автоматическое скрытие в режиме «Пространство 3D» и возврат в 2D.
 *   • Кнопка сворачивания в компактный бейдж.
 * ============================================================================
 */

const SPRITES = {
    idle: 'assets/images/mascot/robot_idle.png?v=4.10.0',
    smile: 'assets/images/mascot/robot_smile.png?v=4.10.0',
    thinking: 'assets/images/mascot/robot_thinking.png?v=4.10.0',
    yawn: 'assets/images/mascot/robot_yawn.png?v=4.10.0',
    tired: 'assets/images/mascot/robot_tired.png?v=4.10.0',
    sleep: 'assets/images/mascot/robot_sleep.png?v=4.10.0',
    angry: 'assets/images/mascot/robot_angry.png?v=4.10.0'
};

const RANDOM_TIPS = [
    'Привет! Я твой космический ассистент. Введи поисковый запрос или нажми <strong>«Сканировать»</strong>!',
    '💡 Совет: посты с фото в библиотечных пабликах собирают на <strong>64% больше просмотров</strong>!',
    '🚀 Знаешь ли ты, что в режиме <strong>«Пространство 3D»</strong> можно облететь планету Земля и МКС?',
    '📊 Вкладка <strong>«Аналитика»</strong> строит умные графики по дням недели и часам публикаций!',
    '📖 Центральная городская библиотека Владимира — флагман всей библиотечной системы города.',
    '🕒 Лучшее время для публикации анонсов мероприятий — будни с <strong>17:00 до 19:30</strong>!',
    '🏷️ Используй фильтр <strong>«Только с фото»</strong> или <strong>«Только с видео»</strong> для точечного отбора медиа!',
    '✨ Нажми на любой пост в ленте, чтобы открыть фотографии в полноэкранном режиме.'
];

export class AuroraMascot {
    constructor() {
        this.container = null;
        this.bodyEl = null;
        this.spriteImg = null;
        this.bubbleEl = null;
        this.bubbleTextEl = null;
        this.collapsedPill = null;
        
        this.currentState = 'idle';
        this.stateResetTimer = null;
        this.bubbleHideTimer = null;
        this.idleTimer = null;
        this.isSleeping = false;
        this.isCollapsed = false;
        this.isIn3D = false;
        
        // Трекинг мыши и сглаживание (Lerp)
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
     * Инициализация DOM-элементов и событий
     * ------------------------------------------------------------------- */
    init() {
        if (this.container) return;

        // Предзагрузка изображений для мгновенного переключения без мигания
        Object.values(SPRITES).forEach(url => {
            const img = new Image();
            img.src = url;
        });

        // Создаем контейнер маскота
        const container = document.createElement('div');
        container.className = 'aurora-mascot-container';
        container.setAttribute('data-state', 'idle');

        container.innerHTML = `
            <!-- Облачко речи / мыслей -->
            <div class="mascot-bubble" data-mascot-bubble>
                <div class="mascot-bubble-header">
                    <span class="mascot-status-tag">
                        <span class="mascot-status-dot"></span>
                        <span class="mascot-status-title">АССИСТЕНТ</span>
                    </span>
                    <button type="button" class="mascot-bubble-close" title="Закрыть подсказку" data-bubble-close>&times;</button>
                </div>
                <p class="mascot-bubble-text" data-bubble-text>
                    Привет! Я твой космический ассистент. Готов помочь с поиском и аналитикой!
                </p>
            </div>

            <!-- Тело робота с 2.5D вращением и анимацией парения -->
            <div class="mascot-body-wrapper" data-mascot-body title="Нажми на меня!">
                <button type="button" class="mascot-toggle-btn" title="Свернуть помощника" data-mascot-collapse>&minus;</button>
                
                <div class="mascot-floater">
                    <img src="${SPRITES.idle}" alt="Робот-помощник" class="mascot-sprite-img" data-mascot-img />
                </div>
                
                <!-- Анимированные Zzz при засыпании -->
                <div class="mascot-sleep-particles">
                    <span class="sleep-z z-1">z</span>
                    <span class="sleep-z z-2">Z</span>
                    <span class="sleep-z z-3">Z</span>
                </div>

                <!-- Тень под парящим роботом -->
                <div class="mascot-shadow"></div>
            </div>
        `;

        // Создаем мини-бейдж для свернутого состояния
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
        this.collapsedPill = pill;

        // Привязка слушателей
        this.bindEvents();

        // Запуск цикла интерполяции параллакса
        this.updateParallax();

        // Сброс и запуск таймера неактивности
        this.resetIdleTimer();

        // Приветственное сообщение через 1.8 секунды после загрузки
        setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed) {
                this.say('Привет! Я твой космический ассистент. Готов анализировать посты библиотек Владимира! 🚀', 9000, 'smile');
            }
        }, 1800);
    }

    bindEvents() {
        // Слежение за курсором
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });

        // Отслеживание активности пользователя
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, this.onUserActivity, { passive: true });
        });

        // Клик по самому роботу — реакция, пробуждение или случайный совет
        this.bodyEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isSleeping) {
                this.wakeUp();
                return;
            }
            this.playRandomReaction();
        });

        // Кнопка закрытия облачка
        const closeBtn = this.container.querySelector('[data-bubble-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideBubble();
            });
        }

        // Кнопка сворачивания
        const collapseBtn = this.container.querySelector('[data-mascot-collapse]');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapse();
            });
        }

        // Клик по мини-бейджу разворачивает обратно
        this.collapsedPill.addEventListener('click', () => {
            this.expand();
        });

        // Интеграция с режимами 2D / 3D
        window.addEventListener('aurora:warp-started', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-opened', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-closed', () => this.setIn3D(false));
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
        }
    }

    /* ---------------------------------------------------------------------
     * Реакции на события системы сканирования ВКонтакте
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
        let msg = `Готово! Найдено <strong>${count}</strong> постов.`;
        if (topBranch) {
            msg += ` Лидер по вовлечённости: <strong>${escapeHtml(topBranch)}</strong>.`;
        }
        msg += ` Открой вкладку <strong>«Аналитика»</strong> для подробных отчётов!`;
        this.say(msg, 10000, 'smile');
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
            `Упс! Ошибка связи с ВКонтакте. Проверь токен доступа или сетевое подключение!`,
            10000,
            'angry'
        );
    }

    /* ---------------------------------------------------------------------
     * Случайный совет при клике
     * ------------------------------------------------------------------- */
    playRandomReaction() {
        const rand = RANDOM_TIPS[Math.floor(Math.random() * RANDOM_TIPS.length)];
        const emotions = ['smile', 'thinking', 'idle'];
        const em = emotions[Math.floor(Math.random() * emotions.length)];
        this.say(rand, 8000, em);
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
                this.say('<em>*Сладко зевает*</em>... Как спокойно в зале библиотеки! Что-нибудь найдём?', 7000);
            }

            // Через 70 секунд бездействия — устаёт
            this.idleTimer = setTimeout(() => {
                if (!this.isIn3D) {
                    this.setState('tired', 6000);
                    this.say('Немного притомился сканировать... Жду твоих новых поисковых запросов!', 7000);
                }

                // Через 120 секунд бездействия — засыпает
                this.idleTimer = setTimeout(() => {
                    if (!this.isIn3D) {
                        this.hideBubble();
                        this.setState('sleep');
                    }
                }, 50000); // 70 + 50 = 120с
            }, 35000); // 35 + 35 = 70с
        }, 35000);
    }

    wakeUp() {
        this.isSleeping = false;
        this.setState('smile', 6000);
        this.say('Ой! Я не спал, я просто обрабатывал базу данных в фоновом режиме! 😉 На связи!', 7000);
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

        // Пределы поворота головы робота: до 18° по горизонтали, до 14° по вертикали
        this.targetRotY = Math.max(-18, Math.min(18, dx * 34));
        this.targetRotX = Math.max(-14, Math.min(14, -dy * 24));

        this.onUserActivity();
    }

    updateParallax() {
        // Кривая пружины / интерполяция
        const ease = 0.08;
        this.currentRotX += (this.targetRotX - this.currentRotX) * ease;
        this.currentRotY += (this.targetRotY - this.currentRotY) * ease;

        if (this.bodyEl && !this.isSleeping) {
            this.bodyEl.style.transform = `perspective(600px) rotateX(${this.currentRotX.toFixed(2)}deg) rotateY(${this.currentRotY.toFixed(2)}deg)`;
        } else if (this.bodyEl && this.isSleeping) {
            this.bodyEl.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
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
            this.say('Я снова с тобой! Чем могу помочь?', 5000, 'smile');
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
        clearTimeout(this.stateResetTimer);
        clearTimeout(this.bubbleHideTimer);
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
