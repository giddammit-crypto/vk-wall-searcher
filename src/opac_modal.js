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

import { escapeHtml } from './branches.js?v=4.43.3';

let opacModalEl = null;
let opacInputEl = null;
let opacClearBtnEl = null;
let opacGridEl = null;
let opacStatusEl = null;
let opacOnlyAvailableEl = null;
let currentBranchFilter = 'all';
let opacSearchBtnEl = null;

let currentSearchAbortCtrl = null;
let searchResultsCache = new Map();
const googleBooksCoversCache = new Map();

/**
 * Очистка названия и автора для точного поиска обложек в Google Books
 */
function cleanSearchTerm(text) {
    if (!text) return '';
    return text
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s*\/\s*.*$/, '')
        .replace(/[:;,\.]\s*$/g, '')
        .replace(/[\"\'«»]/g, '')
        .trim();
}

/**
 * Извлечение лучшего доступного URL обложки из ответа Google Books
 */
function extractCoverFromGbData(data) {
    if (!data || !data.items || !data.items.length) return null;
    const vol = data.items[0].volumeInfo;
    if (!vol || !vol.imageLinks) return null;
    const links = vol.imageLinks;
    const imgUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
    if (!imgUrl) return null;
    return imgUrl.replace(/^http:\/\//i, 'https://');
}

/**
 * Загрузка обложки книги через Google Books API (с умным резервным OpenLibrary)
 *
 * @param {string} rawTitle Заглавие книги
 * @param {string} rawAuthor Автор книги
 * @returns {Promise<string|null>}
 */
async function fetchGoogleBooksCover(rawTitle, rawAuthor) {
    const title = cleanSearchTerm(rawTitle);
    const author = cleanSearchTerm(rawAuthor).replace(/\s*[А-ЯA-Z]\.?\s*[А-ЯA-Z]\.?$/u, '').trim();

    if (!title) return null;

    const cacheKey = `${title.toLowerCase()}|${author.toLowerCase()}`;
    if (googleBooksCoversCache.has(cacheKey)) {
        return googleBooksCoversCache.get(cacheKey);
    }

    try {
        const stored = sessionStorage.getItem(`opac_gb_cov_${cacheKey}`);
        if (stored) {
            googleBooksCoversCache.set(cacheKey, stored);
            return stored;
        }
    } catch (e) {}

    // 1. Попытка поиска через Google Books API (intitle + inauthor)
    try {
        let q = `intitle:"${encodeURIComponent(title)}"`;
        if (author) {
            q += `+inauthor:"${encodeURIComponent(author)}"`;
        }

        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`;
        const res = await fetch(gbUrl, { headers: { 'Accept': 'application/json' } });

        if (res.ok) {
            const data = await res.json();
            const coverUrl = extractCoverFromGbData(data);
            if (coverUrl) {
                googleBooksCoversCache.set(cacheKey, coverUrl);
                try { sessionStorage.setItem(`opac_gb_cov_${cacheKey}`, coverUrl); } catch (e) {}
                return coverUrl;
            }
        }
    } catch (err) {
        // Фоллбэк
    }

    // 2. Вторая попытка Google Books (общий поисковый запрос)
    try {
        const queryText = encodeURIComponent(`${title} ${author}`.trim());
        const gbFallbackUrl = `https://www.googleapis.com/books/v1/volumes?q=${queryText}&maxResults=1&printType=books`;
        const res = await fetch(gbFallbackUrl, { headers: { 'Accept': 'application/json' } });

        if (res.ok) {
            const data = await res.json();
            const coverUrl = extractCoverFromGbData(data);
            if (coverUrl) {
                googleBooksCoversCache.set(cacheKey, coverUrl);
                try { sessionStorage.setItem(`opac_gb_cov_${cacheKey}`, coverUrl); } catch (e) {}
                return coverUrl;
            }
        }
    } catch (err) {}

    // 3. Резервный источник: OpenLibrary Covers API
    try {
        const olQuery = encodeURIComponent(`${title} ${author}`.trim());
        const olUrl = `https://openlibrary.org/search.json?q=${olQuery}&limit=1`;
        const res = await fetch(olUrl, { headers: { 'Accept': 'application/json' } });

        if (res.ok) {
            const data = await res.json();
            if (data && data.docs && data.docs[0] && data.docs[0].cover_i) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`;
                googleBooksCoversCache.set(cacheKey, coverUrl);
                try { sessionStorage.setItem(`opac_gb_cov_${cacheKey}`, coverUrl); } catch (e) {}
                return coverUrl;
            }
        }
    } catch (err) {}

    googleBooksCoversCache.set(cacheKey, null);
    return null;
}

/**
 * Асинхронная загрузка и плавное проявление обложек Google Books
 */
function loadGoogleBooksCovers(container) {
    if (!container) return;
    const coverEls = container.querySelectorAll('.opac-book-cover[data-title]');
    coverEls.forEach(async (coverEl) => {
        const title = coverEl.getAttribute('data-title');
        const author = coverEl.getAttribute('data-author') || '';
        if (!title) return;

        try {
            const coverUrl = await fetchGoogleBooksCover(title, author);
            if (!coverUrl) return;

            const img = coverEl.querySelector('.opac-book-cover-img');
            const fallback = coverEl.querySelector('.opac-cover-fallback');
            if (!img) return;

            img.onload = () => {
                img.style.display = 'block';
                requestAnimationFrame(() => {
                    img.style.opacity = '1';
                    coverEl.classList.add('has-real-cover');
                    if (fallback) {
                        fallback.style.opacity = '0';
                    }
                });
            };
            img.onerror = () => {
                img.style.display = 'none';
                coverEl.classList.remove('has-real-cover');
                if (fallback) {
                    fallback.style.opacity = '1';
                    fallback.style.display = 'flex';
                }
            };
            img.src = coverUrl;
        } catch (e) {
            // Фолбэк сохраняется
        }
    });
}

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
                        <button type="button" class="opac-search-btn btn btn-primary" data-opac-search title="Найти книги (Enter)">
                            <span class="material-symbols-outlined icon">travel_explore</span>
                            <span class="opac-search-btn-text btn-text">Искать</span>
                        </button>
                    </div>

                    <!-- Горячие чипсы быстрых категорий -->
                    <div class="opac-quick-tags">
                        <span class="opac-quick-tags-label">
                            <span class="material-symbols-outlined">trending_up</span>
                            Популярное:
                        </span>
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
                            <span class="toggle-indicator"><span class="material-symbols-outlined check-icon">check_circle</span></span>
                            <span class="toggle-label">Только в наличии</span>
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

    opacSearchBtnEl = opacModalEl.querySelector('[data-opac-search]');

    // Ввод в поисковую строку — только визуальная реакция (show/hide кнопок)
    // Поиск запускается ТОЛЬКО по Enter или кнопке «Искать»
    if (opacInputEl) {
        opacInputEl.addEventListener('input', () => {
            const query = opacInputEl.value.trim();
            if (opacClearBtnEl) {
                opacClearBtnEl.classList.toggle('hidden', query === '');
            }
            // Если поле опустело — показываем начальный экран
            if (query === '') {
                renderInitialState();
            }
        });

        opacInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = opacInputEl.value.trim();
                if (query.length >= 2) {
                    executeOpacSearch(query);
                } else if (query.length === 1) {
                    renderShortQueryState();
                }
            }
        });
    }

    // Кнопка «Искать»
    if (opacSearchBtnEl) {
        opacSearchBtnEl.addEventListener('click', () => {
            const query = opacInputEl ? opacInputEl.value.trim() : '';
            if (query.length >= 2) {
                executeOpacSearch(query);
            } else if (query.length === 1) {
                renderShortQueryState();
            } else if (opacInputEl) {
                opacInputEl.focus();
            }
        });
    }

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

    // Клик по тематическим карточкам начального экрана
    if (opacGridEl) {
        opacGridEl.addEventListener('click', (e) => {
            const card = e.target.closest('[data-quick-action]');
            if (card) {
                const action = card.getAttribute('data-quick-action');
                if (action && opacInputEl) {
                    opacInputEl.value = action;
                    if (opacClearBtnEl) opacClearBtnEl.classList.remove('hidden');
                    executeOpacSearch(action);
                }
            }
        });
    }
}

/**
 * Первоначальное состояние экрана каталога (Empty state) — стильный Hero-блок в дизайн-системе Авроры
 */
function renderInitialState() {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = '';
    opacGridEl.innerHTML = `
        <div class="opac-welcome-hero">
            <div class="opac-welcome-header">
                <div class="opac-welcome-icon-badge">
                    <span class="material-symbols-outlined">local_library</span>
                </div>
                <h3 class="opac-welcome-title">Электронный каталог библиотек Владимира</h3>
                <p class="opac-welcome-desc">
                    Единый фонд 18 филиалов города объединяет более 300&nbsp;000 изданий. Введите название книги, имя автора или выберите тему и нажмите «Искать».
                </p>
            </div>

            <!-- Быстрые тематические карточки для старта -->
            <div class="opac-welcome-cards">
                <div class="opac-welcome-card" data-quick-action="Пушкин" role="button" tabindex="0">
                    <div class="card-icon-wrap is-classic">
                        <span class="material-symbols-outlined">menu_book</span>
                    </div>
                    <div class="card-text">
                        <strong class="card-title">Классика и романы</strong>
                        <span class="card-sub">Пушкин, Чехов, Толстой, Достоевский</span>
                    </div>
                </div>

                <div class="opac-welcome-card" data-quick-action="Фантастика" role="button" tabindex="0">
                    <div class="card-icon-wrap is-scifi">
                        <span class="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div class="card-text">
                        <strong class="card-title">Фантастика и наука</strong>
                        <span class="card-sub">Стругацкие, Азимов, Брэдбери, Лем</span>
                    </div>
                </div>

                <div class="opac-welcome-card" data-quick-action="История Владимира" role="button" tabindex="0">
                    <div class="card-icon-wrap is-history">
                        <span class="material-symbols-outlined">castle</span>
                    </div>
                    <div class="card-text">
                        <strong class="card-title">Краеведение и история</strong>
                        <span class="card-sub">Летописи, Суздаль, Золотое кольцо</span>
                    </div>
                </div>

                <div class="opac-welcome-card" data-quick-action="Детские сказки" role="button" tabindex="0">
                    <div class="card-icon-wrap is-kids">
                        <span class="material-symbols-outlined">auto_stories</span>
                    </div>
                    <div class="card-text">
                        <strong class="card-title">Детская литература</strong>
                        <span class="card-sub">Сказки, повести и приключения</span>
                    </div>
                </div>
            </div>

            <!-- Лаконичная плашка-подсказка -->
            <div class="opac-welcome-hint">
                <span class="material-symbols-outlined hint-icon">verified</span>
                <span><strong>Проверка наличия:</strong> Каталог в реальном времени показывает, свободна ли книга на полке конкретного филиала или выдана на руки.</span>
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
        <div class="opac-notice-card">
            <div class="opac-notice-icon">
                <span class="material-symbols-outlined">travel_explore</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Введите минимум 2-3 символа</h3>
                <p class="opac-notice-desc">
                    Для точного поиска и бережного обращения с сервером каталога введите ключевое слово от 2 символов (например: «Чехов», «Пушкин», «Мастер»).
                </p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">🛡️ <strong>Защита OPAC:</strong> Полнотекстовый поиск по 1 букве отключён для стабильности сервера.</span>
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
        <div class="opac-notice-card is-warning">
            <div class="opac-notice-icon is-warning">
                <span class="material-symbols-outlined">shield</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Сервер каталога восстанавливает стабильность</h3>
                <p class="opac-notice-desc">${escapeHtml(message)}</p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">🛡️ <strong>Защита от сбоев:</strong> Предохранитель защитил библиотечный сервер OPAC от перегрузки. Подождите около минуты и повторите запрос.</span>
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
            <div class="opac-notice-card">
                <div class="opac-notice-icon">
                    <span class="material-symbols-outlined">search_off</span>
                </div>
                <div class="opac-notice-content">
                    <h3 class="opac-notice-title">Книга не найдена в каталоге</h3>
                    <p class="opac-notice-desc">
                        Попробуйте сократить запрос, убрать инициалы автора или проверить правильность написания.
                        Вы также можете обратиться к библиографам ЦГБ: г. Владимир, Суздальский пр., д. 2, 📞 8(4922) 21-65-63.
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
                <!-- Обложка книги с поддержкой Google Books и стильного кибер-плейсхолдера -->
                <div class="opac-book-cover genre-${genre}" data-genre="${genre}" data-title="${escapeHtml(title)}" data-author="${escapeHtml(author)}">
                    <img class="opac-book-cover-img" alt="${escapeHtml(title)}" loading="lazy" style="display: none; opacity: 0;" />
                    <div class="opac-cover-fallback">
                        <span class="material-symbols-outlined opac-cover-genre-icon">${genreIcon}</span>
                        <span class="opac-cover-title-preview">${escapeHtml(title)}</span>
                        ${year ? `<span class="opac-cover-year">${escapeHtml(year)}</span>` : ''}
                    </div>
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

                    <!-- Кнопки действий в стиле Аврора -->
                    <div class="opac-book-actions">
                        <button type="button" class="opac-ask-cosmo-btn btn btn-primary" data-ask-title="${escapeHtml(title)}" data-ask-author="${escapeHtml(author)}" title="Спросить рецензию и сюжет у робота Космо">
                            <span class="material-symbols-outlined icon">smart_toy</span>
                            <span class="btn-text">Спросить у Космо</span>
                        </button>
                        <a href="http://library.vladimir.ru/rguest_vlad_cgb.htm" target="_blank" rel="noopener noreferrer" class="opac-direct-link-btn btn btn-tonal" title="Проверить в каталоге ЦГБ">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span class="btn-text">OPAC-Global</span>
                        </a>
                    </div>
                </div>
            </article>
        `;
    });

    opacGridEl.innerHTML = cardsHtml;

    // Асинхронное фоновое обогащение обложками из Google Books
    loadGoogleBooksCovers(opacGridEl);

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
        <div class="opac-notice-card is-warning">
            <div class="opac-notice-icon is-warning">
                <span class="material-symbols-outlined">error_outline</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Не удалось получить данные из каталога</h3>
                <p class="opac-notice-desc">${escapeHtml(errMsg)}</p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">Попробуйте повторить поиск через несколько секунд или проверьте соединение.</span>
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
