/**
 * src/opac_modal.js — Интерактивный поиск по электронному каталогу OPAC-Global
 * =============================================================================
 * Полнофункциональный ES-модуль для сайта AURORA:
 *   • Поиск библиографических записей в БД 62 (ЦГБ г. Владимира)
 *   • Подгрузка холдингов (экземпляров) по всем 18 филиалам за 1 запрос
 *   • Фильтрация по филиалам (Доброе / ул. Егорова 10, Центр / ЦДБ, ЦГБ, все 18)
 *   • Тумблер «🟢 Только в наличии на полке»
 *   • Жанровая стилизация обложек книг (Cyber-Glassmorphism)
 *   • Быстрая передача книги в чат с роботом Космо для рецензии и анализа
 *   • Точные канонические адреса и телефоны всех библиотечных подразделений
 *
 * Разработка: AURORA Core Team (Дизайнер, Художник, Фулстак разработчик)
 * =============================================================================
 */

import { escapeHtml } from './branches.js?v=4.43.1';

let opacModalEl = null;
let opacInputEl = null;
let opacClearBtnEl = null;
let opacGridEl = null;
let opacStatusEl = null;
let opacOnlyAvailableEl = null;
let currentBranchFilter = 'all';
let searchDebounceTimer = null;
let currentSearchAbortCtrl = null;
let searchResultsCache = new Map();

/**
 * Определение жанровой категории книги для выбора обложки
 *
 * @param {Object} item Данные книги из OPAC
 * @returns {string} scifi | classic | kids | history | science | psychology
 */
function detectBookGenre(item) {
    const text = ((item.title || '') + ' ' + (item.author || '') + ' ' + (item.shelfmark || '')).toLowerCase();

    if (/фантастик|космос|звезд|галактик|кибер|робот|стругацк|азимов|брэдбери|лем\b|лукъяненко/i.test(text)) {
        return 'scifi';
    }
    if (/сказк|детск|малыш|ребенок|чуковск|барто|маршак|носов|волков|андерсен|перро/i.test(text)) {
        return 'kids';
    }
    if (/владимир|суздаль|краеведен|русь|древн|летопис|владимирск|золотое кольцо/i.test(text)) {
        return 'history';
    }
    if (/психолог|саморазвит|эмоци|мышлени|мозг|интеллект|отношени/i.test(text)) {
        return 'psychology';
    }
    if (/физик|математик|биолог|хими|энциклопед|справочник|наук|техник|программир/i.test(text)) {
        return 'science';
    }
    return 'classic';
}

/**
 * Иконка жанра для обложки книги
 */
function getGenreIcon(genre) {
    switch (genre) {
        case 'scifi': return 'rocket_launch';
        case 'kids': return 'auto_stories';
        case 'history': return 'castle';
        case 'psychology': return 'psychology';
        case 'science': return 'science';
        default: return 'menu_book';
    }
}

/**
 * Формирование абсолютного или относительного URL к API
 */
function resolveApiUrl(endpoint) {
    if (typeof window.__resolveApiUrl === 'function') {
        return window.__resolveApiUrl(endpoint);
    }
    return endpoint;
}

/**
 * Инициализация и монтирование DOM-структуры модального окна
 */
export function initOpacModal() {
    if (opacModalEl) return opacModalEl;

    const existing = document.getElementById('opac-search-modal');
    if (existing) {
        opacModalEl = existing;
        bindModalEvents();
        return opacModalEl;
    }

    const modal = document.createElement('div');
    modal.id = 'opac-search-modal';
    modal.className = 'opac-modal-overlay hidden no-print';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'opac-modal-title');

    modal.innerHTML = `
        <div class="opac-modal-dialog">
            <!-- Шапка с баннером космической библиотеки -->
            <div class="opac-modal-header">
                <div class="opac-modal-banner">
                    <img src="assets/images/opac/catalog_banner.svg" alt="Каталог OPAC" class="opac-banner-img" />
                    <div class="opac-banner-content">
                        <div class="opac-banner-icon-badge">
                            <span class="material-symbols-outlined">menu_book</span>
                        </div>
                        <div class="opac-banner-text">
                            <div class="opac-banner-title-row">
                                <h2 id="opac-modal-title" class="opac-banner-title">Электронный каталог OPAC</h2>
                                <span class="opac-banner-badge">
                                    <span class="opac-badge-dot"></span>
                                    БД 62 Онлайн
                                </span>
                            </div>
                            <p class="opac-banner-subtitle">
                                Поиск изданий, проверка наличия на полках и бронирование по 18 библиотекам г. Владимира
                            </p>
                        </div>
                        <button type="button" class="opac-close-btn" data-opac-close title="Закрыть каталог (Esc)">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Тело модального окна: поиск, фильтры и результаты -->
            <div class="opac-modal-body">
                <section class="opac-search-section">
                    <!-- Поисковая строка -->
                    <div class="opac-search-input-wrap">
                        <span class="material-symbols-outlined opac-search-icon">search</span>
                        <input
                            type="search"
                            class="opac-search-input"
                            data-opac-input
                            placeholder="Поиск по названию, автору или теме (например: Пушкин, Чехов, Мастер и Маргарита, Космос)..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button type="button" class="opac-clear-btn hidden" data-opac-clear title="Очистить поиск">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Горячие чипсы быстрых категорий -->
                    <div class="opac-quick-tags">
                        <span class="opac-quick-tags-label">Популярное:</span>
                        <button type="button" class="opac-quick-tag" data-tag="Пушкин">Пушкин</button>
                        <button type="button" class="opac-quick-tag" data-tag="Чехов">Чехов</button>
                        <button type="button" class="opac-quick-tag" data-tag="Достоевский">Достоевский</button>
                        <button type="button" class="opac-quick-tag" data-tag="Фантастика">Фантастика</button>
                        <button type="button" class="opac-quick-tag" data-tag="Детские сказки">Сказки</button>
                        <button type="button" class="opac-quick-tag" data-tag="История Владимира">Владимир</button>
                    </div>

                    <!-- Панель быстрых фильтров -->
                    <div class="opac-filters-bar">
                        <div class="opac-branch-chips">
                            <button type="button" class="opac-branch-chip is-active" data-branch="all">
                                Все 18 библиотек
                            </button>
                            <button type="button" class="opac-branch-chip is-dobroe" data-branch="f4" title="Филиал №4 на ул. Егорова, 10 (жилой район Доброе)">
                                📍 Доброе (Филиал №4)
                            </button>
                            <button type="button" class="opac-branch-chip" data-branch="cdb" title="Центральная детская библиотека (ул. Большая Московская, 31)">
                                🏛 Центр (ЦДБ)
                            </button>
                            <button type="button" class="opac-branch-chip" data-branch="cgb" title="Центральная городская библиотека (Суздальский пр., 2)">
                                📚 ЦГБ (Суздальский, 2)
                            </button>
                        </div>

                        <label class="opac-available-toggle" title="Показывать только издания, которые прямо сейчас есть на полке">
                            <input type="checkbox" data-opac-only-available />
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                            <span class="toggle-label">🟢 Только в наличии</span>
                        </label>
                    </div>
                </section>

                <!-- Контейнер результатов поиска -->
                <div class="opac-results-container">
                    <div class="opac-results-status" data-opac-status></div>
                    <div class="opac-books-grid" data-opac-grid></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    opacModalEl = modal;

    bindModalEvents();
    renderInitialState();

    return opacModalEl;
}

/**
 * Привязка обработчиков событий
 */
function bindModalEvents() {
    if (!opacModalEl) return;

    opacInputEl = opacModalEl.querySelector('[data-opac-input]');
    opacClearBtnEl = opacModalEl.querySelector('[data-opac-clear]');
    opacGridEl = opacModalEl.querySelector('[data-opac-grid]');
    opacStatusEl = opacModalEl.querySelector('[data-opac-status]');
    opacOnlyAvailableEl = opacModalEl.querySelector('[data-opac-only-available]');

    // Кнопка закрытия
    const closeBtns = opacModalEl.querySelectorAll('[data-opac-close]');
    closeBtns.forEach(btn => btn.addEventListener('click', closeOpacModal));

    // Закрытие по клику на оверлей
    opacModalEl.addEventListener('click', (e) => {
        if (e.target === opacModalEl) {
            closeOpacModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && opacModalEl.classList.contains('is-open')) {
            closeOpacModal();
        }
    });

    // Ввод в поисковую строку с дебаунсом 500мс для бережного обращения с OPAC-Global
    if (opacInputEl) {
        opacInputEl.addEventListener('input', () => {
            const query = opacInputEl.value.trim();
            if (opacClearBtnEl) {
                opacClearBtnEl.classList.toggle('hidden', query === '');
            }
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

            if (query === '') {
                renderInitialState();
                return;
            }
            if (query.length < 2) {
                renderShortQueryState();
                return;
            }

            searchDebounceTimer = setTimeout(() => {
                executeOpacSearch(query);
            }, 500);
        });

        opacInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
                const query = opacInputEl.value.trim();
                if (query.length >= 2) {
                    executeOpacSearch(query);
                } else if (query.length === 1) {
                    renderShortQueryState();
                }
            }
        });
    }

    // Кнопка быстрой очистки
    if (opacClearBtnEl) {
        opacClearBtnEl.addEventListener('click', () => {
            if (opacInputEl) {
                opacInputEl.value = '';
                opacInputEl.focus();
            }
            opacClearBtnEl.classList.add('hidden');
            renderInitialState();
        });
    }

    // Горячие чипсы запросов
    const quickTags = opacModalEl.querySelectorAll('.opac-quick-tag');
    quickTags.forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
            const tag = tagBtn.getAttribute('data-tag');
            if (tag && opacInputEl) {
                opacInputEl.value = tag;
                if (opacClearBtnEl) opacClearBtnEl.classList.remove('hidden');
                executeOpacSearch(tag);
            }
        });
    });

    // Фильтры по филиалам
    const branchChips = opacModalEl.querySelectorAll('.opac-branch-chip');
    branchChips.forEach(chip => {
        chip.addEventListener('click', () => {
            branchChips.forEach(c => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            currentBranchFilter = chip.getAttribute('data-branch') || 'all';

            const query = opacInputEl ? opacInputEl.value.trim() : '';
            if (query) {
                executeOpacSearch(query, true);
            }
        });
    });

    // Тумблер «Только в наличии»
    if (opacOnlyAvailableEl) {
        opacOnlyAvailableEl.addEventListener('change', () => {
            const query = opacInputEl ? opacInputEl.value.trim() : '';
            if (query) {
                executeOpacSearch(query, true);
            }
        });
    }
}

/**
 * Первоначальное состояние экрана каталога (Empty state)
 */
function renderInitialState() {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = '';
    opacGridEl.innerHTML = `
        <div class="opac-empty-state">
            <div class="opac-empty-avatar">
                <img src="assets/images/mascot/robot_read.png" alt="Космо читает" />
            </div>
            <div class="opac-empty-content">
                <h3 class="opac-empty-title">Электронный каталог библиотек Владимира</h3>
                <p class="opac-empty-desc">
                    Введите название книги, фамилию автора или выберите тему из быстрых тегов выше.
                    База данных объединяет фонды всех 18 библиотек города и показывает наличие экземпляров в реальном времени.
                </p>
                <div class="opac-empty-tips">
                    <span class="opac-tip-badge">💡 <strong>Подсказка:</strong> Книги филиала №4 на ул. Егорова, 10 выделяются специальной меткой района «Доброе».</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Подсказка о слишком коротком запросе (защита от перегрузки OPAC)
 */
function renderShortQueryState() {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = '';
    opacGridEl.innerHTML = `
        <div class="opac-empty-state">
            <div class="opac-empty-avatar">
                <img src="assets/images/mascot/robot_thinking.png" alt="Космо задумался" />
            </div>
            <div class="opac-empty-content">
                <h3 class="opac-empty-title">Введите минимум 2-3 символа</h3>
                <p class="opac-empty-desc">
                    Для защиты электронного каталога от перегрузки поиск выполняется по запросам от 2 символов (например: «Чехов», «Пушкин», «Мастер»).
                </p>
                <div class="opac-empty-tips">
                    <span class="opac-tip-badge">🛡️ <strong>Защита OPAC:</strong> Полнотекстовый поиск по 1 букве отключён, чтобы не вызывать зависание сервера библиотечной базы.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовка скелетон-загрузчика во время запроса
 */
function renderSkeletons() {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = `
        <div class="opac-status-loading">
            <span class="material-symbols-outlined opac-spin-icon">sync</span>
            <span>Запрос к OPAC-Global (БД 62 ЦГБ г. Владимира)...</span>
        </div>
    `;

    let html = '';
    for (let i = 0; i < 4; i++) {
        html += `
            <div class="opac-skeleton-card">
                <div class="opac-skeleton-cover"></div>
                <div class="opac-skeleton-content">
                    <div class="opac-skeleton-line is-title"></div>
                    <div class="opac-skeleton-line is-author"></div>
                    <div class="opac-skeleton-line is-meta"></div>
                    <div class="opac-skeleton-line is-badges"></div>
                </div>
            </div>
        `;
    }
    opacGridEl.innerHTML = html;
}

/**
 * Выполнение асинхронного поиска через API
 */
async function executeOpacSearch(query, forceRefresh = false) {
    if (!query || query.trim().length < 2) {
        if (!query || query.trim().length === 0) {
            renderInitialState();
        } else {
            renderShortQueryState();
        }
        return;
    }

    const onlyAvailable = opacOnlyAvailableEl && opacOnlyAvailableEl.checked;
    const cacheKey = `${query}|${currentBranchFilter}|${onlyAvailable ? 1 : 0}`;

    if (!forceRefresh && searchResultsCache.has(cacheKey)) {
        renderSearchResults(searchResultsCache.get(cacheKey), query);
        return;
    }

    if (currentSearchAbortCtrl) {
        currentSearchAbortCtrl.abort();
    }
    currentSearchAbortCtrl = new AbortController();

    renderSkeletons();

    try {
        const params = new URLSearchParams({
            action: 'search',
            q: query,
            length: '6', // Безопасный лимит (6 книг), чтобы беречь сервер OPAC-Global
            include_copies: '1',
            cascade: '1'
        });

        if (currentBranchFilter && currentBranchFilter !== 'all') {
            params.append('branch', currentBranchFilter);
        }
        if (onlyAvailable) {
            params.append('only_available', '1');
        }

        const url = resolveApiUrl('api/opac.php') + '?' + params.toString();
        const response = await fetch(url, {
            signal: currentSearchAbortCtrl.signal,
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data && data.circuit_breaker) {
            renderCircuitBreakerState(data.error || 'Сервер каталога OPAC временно восстанавливает связь');
            return;
        }

        searchResultsCache.set(cacheKey, data);
        renderSearchResults(data, query);

    } catch (err) {
        if (err.name === 'AbortError') return;
        renderErrorState(err.message || 'Сбой подключения к каталогу OPAC');
    }
}

/**
 * Отрисовка состояния предохранителя (Circuit Breaker)
 */
function renderCircuitBreakerState(message) {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = `
        <div class="opac-status-empty" style="color: #f59e0b;">
            <span class="material-symbols-outlined" style="vertical-align: middle;">shield</span>
            <span>Защитный кулдаун OPAC активен</span>
        </div>
    `;

    opacGridEl.innerHTML = `
        <div class="opac-empty-state">
            <div class="opac-empty-avatar">
                <img src="assets/images/mascot/robot_tired.png" alt="Космо отдыхает" />
            </div>
            <div class="opac-empty-content">
                <h3 class="opac-empty-title">Сервер каталога восстанавливает стабильность</h3>
                <p class="opac-empty-desc">${escapeHtml(message)}</p>
                <div class="opac-empty-tips">
                    <span class="opac-tip-badge">🛡️ <strong>Защита от сбоев:</strong> Автоматический предохранитель защитил сервер библиотеки от перегрузки. Подождите около минуты и повторите запрос.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовка результатов поиска
 */
function renderSearchResults(data, query) {
    if (!opacGridEl || !opacStatusEl) return;

    if (!data || !data.ok || !data.items || data.items.length === 0) {
        opacStatusEl.innerHTML = `
            <div class="opac-status-empty">
                По запросу «<strong>${escapeHtml(query)}</strong>» ничего не найдено в каталоге.
            </div>
        `;
        opacGridEl.innerHTML = `
            <div class="opac-empty-state">
                <div class="opac-empty-avatar">
                    <img src="assets/images/mascot/robot_thinking.png" alt="Космо задумался" />
                </div>
                <div class="opac-empty-content">
                    <h3 class="opac-empty-title">Книга не найдена</h3>
                    <p class="opac-empty-desc">
                        Попробуйте сократить запрос, убрать инициалы автора или проверить правильность написания.
                        Вы также можете обратиться к библиографам ЦГБ: Суздальский пр., д. 2, 📞 8(4922) 21-65-63.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    const totalFound = data.total_found || data.items.length;
    opacStatusEl.innerHTML = `
        <div class="opac-status-summary">
            <span>Найдено в каталоге: <strong>${totalFound}</strong> изд. по запросу «${escapeHtml(query)}»</span>
            ${data._cached ? '<span class="opac-cache-tag" title="Данные ускорены кэшем каталога">⚡ Кэш</span>' : ''}
        </div>
    `;

    let cardsHtml = '';
    data.items.forEach((item, index) => {
        const title = item.title || 'Книга без заглавия';
        const author = item.author || '';
        const year = item.year ? `${item.year} г.` : '';
        const imprint = item.imprint || '';
        const shelfmark = item.shelfmark && item.shelfmark !== 'Не задан' ? item.shelfmark : '';
        const idbr = item.id || '';
        const locations = item.locations || [];
        const genre = detectBookGenre(item);
        const genreIcon = getGenreIcon(genre);
        const copies = item.copies || [];

        // Подсчёт доступных экземпляров
        let availableCopiesCount = 0;
        copies.forEach(c => {
            if (c.is_available) availableCopiesCount++;
        });

        // Карточка книги
        cardsHtml += `
            <article class="opac-book-card" data-idbr="${escapeHtml(idbr)}">
                <!-- Обложка -->
                <div class="opac-book-cover genre-${genre}" data-genre="${genre}">
                    <span class="material-symbols-outlined opac-cover-genre-icon">${genreIcon}</span>
                    <span class="opac-cover-title-preview">${escapeHtml(title)}</span>
                    ${year ? `<span class="opac-cover-year">${escapeHtml(year)}</span>` : ''}
                </div>

                <!-- Содержимое карточки -->
                <div class="opac-book-content">
                    <div class="opac-book-header">
                        <h4 class="opac-book-title" title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
                        ${author ? `<div class="opac-book-author">✍️ ${escapeHtml(author)}</div>` : ''}
                        ${imprint ? `<div class="opac-book-imprint">${escapeHtml(imprint)}</div>` : ''}
                    </div>

                    <!-- Мета-бейджи: ББК, OPAC ID, Сигла -->
                    <div class="opac-book-badges">
                        ${shelfmark ? `<span class="opac-badge-bbk" title="Шифр классификации ББК">🔖 ${escapeHtml(shelfmark)}</span>` : ''}
                        ${idbr ? `<span class="opac-badge-idbr" title="Системный ID записи в БД 62 OPAC-Global">🆔 ${escapeHtml(idbr)}</span>` : ''}
                        ${locations.length > 0 ? `<span class="opac-badge-sigla" title="Сигла подразделений хранения">📦 ${escapeHtml(locations.join(', '))}</span>` : ''}
                    </div>

                    <!-- Блок экземпляров и филиалов -->
                    <div class="opac-copies-section">
                        <div class="opac-copies-header">
                            <span class="material-symbols-outlined">account_balance</span>
                            <strong>Экземпляры в библиотеках (${copies.length}):</strong>
                        </div>
                        <div class="opac-copies-list">
                            ${renderCopiesListHtml(copies)}
                        </div>
                    </div>

                    <!-- Кнопки действий -->
                    <div class="opac-book-actions">
                        <button type="button" class="opac-ask-cosmo-btn" data-ask-title="${escapeHtml(title)}" data-ask-author="${escapeHtml(author)}">
                            <span class="material-symbols-outlined">smart_toy</span>
                            <span>Спросить у Космо</span>
                        </button>
                        <a href="http://library.vladimir.ru/rguest_vlad_cgb.htm" target="_blank" rel="noopener noreferrer" class="opac-direct-link-btn" title="Проверить в каталоге ЦГБ">
                            <span class="material-symbols-outlined">open_in_new</span>
                            <span>OPAC-Global</span>
                        </a>
                    </div>
                </div>
            </article>
        `;
    });

    opacGridEl.innerHTML = cardsHtml;

    // Привязка кнопок «Спросить у Космо»
    const askBtns = opacGridEl.querySelectorAll('.opac-ask-cosmo-btn');
    askBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const bTitle = btn.getAttribute('data-ask-title') || '';
            const bAuthor = btn.getAttribute('data-ask-author') || '';
            closeOpacModal();
            triggerCosmoChatQuery(bTitle, bAuthor);
        });
    });
}

/**
 * Отрисовка списка экземпляров по филиалам
 */
function renderCopiesListHtml(copies) {
    if (!copies || copies.length === 0) {
        return `<div class="opac-no-copies">ℹ️ Детальные сведения об экземплярах уточняются в ЦГБ.</div>`;
    }

    return copies.map(c => {
        const isBranch4 = (c.subfield_b === 'ф4' || c.branch_code === 'Филиал №4' || (c.permanent_location && c.permanent_location.includes('Ф4')));
        const isAvailable = !!c.is_available;
        const bName = c.branch_name || c.branch_code || 'Библиотека';
        const bAddress = c.branch_address || '';
        const bPhone = c.branch_phone || '';
        const inv = c.inventory ? ` [Инв. № ${c.inventory}]` : '';

        const itemClass = [
            'opac-copy-item',
            isBranch4 ? 'is-f4' : '',
            isAvailable ? 'is-available' : 'is-unavailable'
        ].filter(Boolean).join(' ');

        return `
            <div class="${itemClass}">
                <div class="opac-copy-top">
                    <span class="opac-copy-name">
                        ${isBranch4 ? '🌟 <strong>[Доброе] ' + escapeHtml(bName) + '</strong>' : escapeHtml(bName)}
                    </span>
                    <span class="opac-copy-badge ${isAvailable ? 'badge-available' : 'badge-unavailable'}">
                        ${isAvailable ? '🟢 В наличии' : '⏳ На руках / фонд'}
                    </span>
                </div>
                <div class="opac-copy-details">
                    ${bAddress ? `<span class="opac-copy-addr">📍 ${escapeHtml(bAddress)}</span>` : ''}
                    ${bPhone ? `<span class="opac-copy-phone">• 📞 <a href="tel:${escapeHtml(bPhone.replace(/[^\\d+]/g, ''))}">${escapeHtml(bPhone)}</a></span>` : ''}
                    ${inv ? `<span class="opac-copy-inv">${escapeHtml(inv)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Отрисовка сообщения об ошибке
 */
function renderErrorState(errMsg) {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = '';
    opacGridEl.innerHTML = `
        <div class="opac-empty-state is-error">
            <div class="opac-empty-avatar">
                <img src="assets/images/mascot/robot_shock.png" alt="Космо удивлён" />
            </div>
            <div class="opac-empty-content">
                <h3 class="opac-empty-title">Не удалось получить данные из каталога</h3>
                <p class="opac-empty-desc">${escapeHtml(errMsg)}</p>
                <div class="opac-empty-tips">
                    <span>Попробуйте повторить поиск через несколько секунд или проверьте соединение.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Передача вопроса о книге роботу Космо в чат
 */
function triggerCosmoChatQuery(title, author) {
    const prompt = author
        ? `Расскажи о книге «${title}» автора ${author}: сюжет без спойлеров, главная мысль, почему стоит прочитать и кому она понравится?`
        : `Расскажи о книге «${title}»: сюжет, жанр и почему её стоит прочитать?`;

    if (window.__cosmoChatModal && typeof window.__cosmoChatModal.openWithMessage === 'function') {
        window.__cosmoChatModal.openWithMessage(prompt);
    } else if (typeof window.openCosmoChat === 'function') {
        window.openCosmoChat();
        setTimeout(() => {
            const chatInput = document.querySelector('.cosmo-chat-input');
            if (chatInput) {
                chatInput.value = prompt;
                chatInput.focus();
            }
        }, 300);
    } else {
        // Fallback: имитация клика по маскоту
        const mascot = document.getElementById('cosmo-mascot');
        if (mascot) {
            mascot.click();
            setTimeout(() => {
                const chatInput = document.querySelector('.cosmo-chat-input');
                if (chatInput) {
                    chatInput.value = prompt;
                    chatInput.focus();
                }
            }, 300);
        }
    }
}

/**
 * Открытие модального окна каталога
 *
 * @param {string} initialQuery Опциональный поисковый запрос
 */
export function openOpacModal(initialQuery = '') {
    initOpacModal();
    if (!opacModalEl) return;

    opacModalEl.classList.remove('hidden');
    opacModalEl.classList.add('is-open');
    document.body.classList.add('opac-modal-open');

    if (opacInputEl) {
        if (initialQuery) {
            opacInputEl.value = initialQuery;
            if (opacClearBtnEl) opacClearBtnEl.classList.remove('hidden');
            executeOpacSearch(initialQuery);
        } else {
            setTimeout(() => {
                opacInputEl.focus();
            }, 100);
        }
    }
}

/**
 * Закрытие модального окна каталога
 */
export function closeOpacModal() {
    if (!opacModalEl) return;

    opacModalEl.classList.remove('is-open');
    opacModalEl.classList.add('hidden');
    document.body.classList.remove('opac-modal-open');

    if (currentSearchAbortCtrl) {
        currentSearchAbortCtrl.abort();
    }
}

// Экспорт в глобальную область видимости для шорткатов и вызовов из любого модуля
if (typeof window !== 'undefined') {
    window.openOpacModal = openOpacModal;
    window.closeOpacModal = closeOpacModal;
    window.__openOpacModal = openOpacModal;
}
