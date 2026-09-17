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

import { escapeHtml } from './branches.js?v=4.44.0';

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
const bookCoversCache = new Map();

/**
 * Очистка названия для точного поиска обложек
 */
function cleanSearchTerm(text) {
    if (!text) return '';
    let t = String(text);
    // Отрезаем незакрытые скобки OPAC [..., (...
    t = t.replace(/\[.*$/, '').replace(/\(.*$/, '');
    // Отрезаем подзаголовки через двоеточие, тире или точку с запятой
    t = t.split(/[:;–—]/)[0];
    // Удаляем кавычки, слэши, знаки препинания в конце
    t = t.replace(/[\"\'«»]/g, '').replace(/\s*\/\s*.*$/, '').replace(/[,.]\s*$/g, '');
    return t.trim();
}

/**
 * Очистка автора книги для поиска обложек (удаление инициалов)
 */
function cleanAuthorForCover(rawAuthor) {
    if (!rawAuthor) return '';
    let a = cleanSearchTerm(rawAuthor);
    // Отрезаем инициалы: "Пушкин А. С." -> "Пушкин", "Чехов А.П." -> "Чехов"
    a = a.replace(/\s+[А-ЯA-Z]\.?\s*[А-ЯA-Z]?\.?$/u, '').trim();
    // На случай "Пушкин, Александр Сергеевич"
    a = a.split(/[,]/)[0].trim();
    return a;
}

/**
 * Источник 1: Яндекс Книги (Bookmate API)
 * Открытый CORS (*), HD retina-обложки (cover.large), фоновый цвет cover.background_color_hex
 */
async function fetchYandexBookmateCover(cleanTitle, cleanAuthor) {
    try {
        const query = cleanAuthor ? `${cleanTitle} ${cleanAuthor}` : cleanTitle;
        const url = `https://api.bookmate.com/api/v5/books/search?query=${encodeURIComponent(query)}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);

        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !Array.isArray(data.objects) || data.objects.length === 0) return null;

        const targetTitle = cleanTitle.toLowerCase();
        const targetAuthor = cleanAuthor.toLowerCase();
        let bestObj = null;
        let bestScore = -1;

        for (const obj of data.objects) {
            if (!obj || !obj.cover) continue;
            const coverUrl = obj.cover.large || obj.cover.small;
            if (!coverUrl) continue;

            const objTitle = String(obj.title || '').trim().toLowerCase();
            const objAuthors = String(obj.authors || '').trim().toLowerCase();
            let score = 10;

            if (objTitle === targetTitle) {
                score += 100;
            } else if (objTitle.startsWith(targetTitle)) {
                score += 50;
            } else if (objTitle.includes(targetTitle)) {
                score += 25;
            }

            if (targetAuthor && objAuthors) {
                if (objAuthors.includes(targetAuthor)) {
                    score += 50;
                }
            }

            // Штраф для кратких пересказов, анализов и статей
            if (/кратк|комментар|пересказ|стать|анализ|пьес/i.test(objTitle)) {
                score -= 40;
            }

            if (score > bestScore) {
                bestScore = score;
                bestObj = obj;
            }
        }

        if (bestObj && bestScore > 0) {
            const finalUrl = bestObj.cover.large || bestObj.cover.small;
            return {
                url: finalUrl.replace(/^http:\/\//i, 'https://'),
                source: 'Яндекс Книги',
                sourceId: 'yandex',
                color: bestObj.cover.background_color_hex || null
            };
        }
    } catch (e) {}
    return null;
}

/**
 * Источник 2: Google Книги API
 * С улучшением резкости (удаление &edge=curl, замена zoom=1 на zoom=2)
 */
async function fetchGoogleBooksCoverEnhanced(cleanTitle, cleanAuthor) {
    try {
        let q = `intitle:"${encodeURIComponent(cleanTitle)}"`;
        if (cleanAuthor) {
            q += `+inauthor:"${encodeURIComponent(cleanAuthor)}"`;
        }
        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);

        const res = await fetch(gbUrl, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            const vol = data?.items?.[0]?.volumeInfo;
            if (vol?.imageLinks) {
                let img = vol.imageLinks.extraLarge || vol.imageLinks.large || vol.imageLinks.medium || vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail;
                if (img) {
                    img = img.replace(/^http:\/\//i, 'https://');
                    img = img.replace(/&edge=curl/g, '');
                    img = img.replace(/zoom=[15]/g, 'zoom=2');
                    return {
                        url: img,
                        source: 'Google Книги',
                        sourceId: 'google',
                        color: null
                    };
                }
            }
        }
    } catch (e) {}

    // Общий поисковый запрос Google Books
    try {
        const queryText = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`.trim());
        const gbFallbackUrl = `https://www.googleapis.com/books/v1/volumes?q=${queryText}&maxResults=1&printType=books`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);

        const res = await fetch(gbFallbackUrl, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            const vol = data?.items?.[0]?.volumeInfo;
            if (vol?.imageLinks) {
                let img = vol.imageLinks.extraLarge || vol.imageLinks.large || vol.imageLinks.medium || vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail;
                if (img) {
                    img = img.replace(/^http:\/\//i, 'https://');
                    img = img.replace(/&edge=curl/g, '');
                    img = img.replace(/zoom=[15]/g, 'zoom=2');
                    return {
                        url: img,
                        source: 'Google Книги',
                        sourceId: 'google',
                        color: null
                    };
                }
            }
        }
    } catch (e) {}

    return null;
}

/**
 * Источник 3: Серверный шлюз ЛитРес / Авроры (api/opac.php?action=cover)
 */
async function fetchBackendGatewayCover(cleanTitle, cleanAuthor, rawIsbn = '') {
    try {
        const params = new URLSearchParams({
            action: 'cover',
            title: cleanTitle
        });
        if (cleanAuthor) params.append('author', cleanAuthor);
        if (rawIsbn) params.append('isbn', rawIsbn);

        const url = resolveApiUrl('api/opac.php') + '?' + params.toString();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);

        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data && data.ok && data.found && data.url) {
                return {
                    url: data.url.replace(/^http:\/\//i, 'https://'),
                    source: data.source || 'ЛитРес',
                    sourceId: data.source_id || 'litres',
                    color: data.color || null
                };
            }
        }
    } catch (e) {}

    return null;
}

/**
 * Источник 4: OpenLibrary Covers API (-L.jpg)
 */
async function fetchOpenLibraryCover(cleanTitle, cleanAuthor) {
    try {
        const olQuery = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`.trim());
        const olUrl = `https://openlibrary.org/search.json?q=${olQuery}&limit=5`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);

        const res = await fetch(olUrl, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.docs)) {
                for (const doc of data.docs) {
                    if (doc.cover_i) {
                        return {
                            url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
                            source: 'OpenLibrary',
                            sourceId: 'openlibrary',
                            color: null
                        };
                    }
                }
            }
        }
    } catch (e) {}

    return null;
}

/**
 * Источник 5: Русская Википедия REST API (для классики и мировых авторов)
 */
async function fetchWikipediaCover(cleanTitle) {
    try {
        const wikiUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);

        const res = await fetch(wikiUrl, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data && data.thumbnail && data.thumbnail.source) {
                return {
                    url: data.thumbnail.source.replace(/^http:\/\//i, 'https://'),
                    source: 'Википедия',
                    sourceId: 'wikipedia',
                    color: null
                };
            }
        }
    } catch (e) {}

    return null;
}

/**
 * Полный многоуровневый каскад поиска обложек книги с двухуровневым кэшированием
 *   1. Двухуровневый кэш (Map в памяти + sessionStorage)
 *   2. Источник 1: Яндекс Книги (Bookmate API) — HD retina + фон
 *   3. Источник 2: Google Книги API — резкий HD зум
 *   4. Источник 3: Серверный шлюз ЛитРес / Авроры (api/opac.php?action=cover)
 *   5. Источник 4: OpenLibrary Covers API (-L.jpg)
 *   6. Источник 5: Русская Википедия REST API
 *
 * @param {string} rawTitle Заглавие книги
 * @param {string} rawAuthor Автор книги
 * @param {string} rawIsbn ISBN (опционально)
 * @returns {Promise<{url: string, source: string, sourceId: string, color: string|null}|null>}
 */
async function fetchBookCoverCascade(rawTitle, rawAuthor = '', rawIsbn = '') {
    const title = cleanSearchTerm(rawTitle);
    const author = cleanAuthorForCover(rawAuthor);

    if (!title) return null;

    const cacheKey = `${title.toLowerCase()}|${author.toLowerCase()}`;

    // 1. Проверка кэша в памяти Map
    if (bookCoversCache.has(cacheKey)) {
        return bookCoversCache.get(cacheKey);
    }

    // 2. Проверка localStorage (кэш на 7 дней)
    try {
        const stored = localStorage.getItem(`opac_cov_v2_${cacheKey}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (!parsed.exp || parsed.exp > Date.now())) {
                bookCoversCache.set(cacheKey, parsed.data);
                return parsed.data;
            }
        }
    } catch (e) {}

    const saveToCache = (result) => {
        bookCoversCache.set(cacheKey, result);
        try {
            localStorage.setItem(`opac_cov_v2_${cacheKey}`, JSON.stringify({
                data: result,
                exp: Date.now() + (result ? 7 * 86400 * 1000 : 24 * 3600 * 1000)
            }));
        } catch (e) {}
        return result;
    };

    // 1. Яндекс Книги (Bookmate API) — прямой CORS из браузера
    const yandexRes = await fetchYandexBookmateCover(title, author);
    if (yandexRes && yandexRes.url) {
        return saveToCache(yandexRes);
    }

    // 2. Google Книги API — прямой CORS из браузера
    const googleRes = await fetchGoogleBooksCoverEnhanced(title, author);
    if (googleRes && googleRes.url) {
        return saveToCache(googleRes);
    }

    // 3. OpenLibrary Covers API — прямой CORS из браузера
    const olRes = await fetchOpenLibraryCover(title, author);
    if (olRes && olRes.url) {
        return saveToCache(olRes);
    }

    // 4. Русская Википедия REST API — прямой CORS из браузера
    const wikiRes = await fetchWikipediaCover(title);
    if (wikiRes && wikiRes.url) {
        return saveToCache(wikiRes);
    }

    // 5. Серверный шлюз ЛитРес / Авроры (только если остальные источники не дали результат)
    const backendRes = await fetchBackendGatewayCover(title, author, rawIsbn);
    if (backendRes && backendRes.url) {
        return saveToCache(backendRes);
    }

    // Запоминаем null на 24 часа, чтобы исключить повторный перебор
    saveToCache(null);
    return null;
}

// -----------------------------------------------------------------------------
// Очередь загрузки обложек с ограничением параллельности (MAX 2 активных запроса)
// и ленивой загрузкой по IntersectionObserver
// -----------------------------------------------------------------------------
let activeCoverFetches = 0;
const coverTaskQueue = [];

function processCoverTaskQueue() {
    while (activeCoverFetches < 2 && coverTaskQueue.length > 0) {
        const task = coverTaskQueue.shift();
        activeCoverFetches++;
        task().finally(() => {
            activeCoverFetches--;
            processCoverTaskQueue();
        });
    }
}

function queueCoverElementLoad(coverEl) {
    if (!coverEl || coverEl.dataset.coverQueued === 'true') return;
    coverEl.dataset.coverQueued = 'true';

    coverTaskQueue.push(async () => {
        const title = coverEl.getAttribute('data-title');
        const author = coverEl.getAttribute('data-author') || '';
        const isbn = coverEl.getAttribute('data-isbn') || '';
        if (!title) return;

        try {
            const coverData = await fetchBookCoverCascade(title, author, isbn);
            if (!coverData || !coverData.url) return;

            const img = coverEl.querySelector('.opac-book-cover-img');
            const fallback = coverEl.querySelector('.opac-cover-fallback');
            const badge = coverEl.querySelector('.opac-cover-source-badge');
            if (!img) return;

            const testImg = new Image();
            testImg.onload = () => {
                img.src = coverData.url;
                img.style.display = 'block';
                if (coverData.color) {
                    coverEl.style.setProperty('--cover-accent-color', coverData.color);
                }
                requestAnimationFrame(() => {
                    img.style.opacity = '1';
                    coverEl.classList.add('has-real-cover');
                    coverEl.setAttribute('data-cover-url', coverData.url);
                    coverEl.setAttribute('data-cover-source', coverData.source || '');
                    coverEl.setAttribute('data-cover-source-id', coverData.sourceId || '');
                    if (fallback) fallback.style.opacity = '0';
                    if (badge) {
                        badge.textContent = coverData.source;
                        badge.className = `opac-cover-source-badge source-${coverData.sourceId || 'generic'}`;
                        badge.style.display = 'inline-flex';
                    }
                });
            };
            testImg.onerror = () => {
                img.style.display = 'none';
                coverEl.classList.remove('has-real-cover');
                if (badge) badge.style.display = 'none';
                if (fallback) {
                    fallback.style.opacity = '1';
                    fallback.style.display = 'flex';
                }
            };
            testImg.src = coverData.url;
        } catch (e) {
            // Фолбэк сохраняется
        }
    });

    processCoverTaskQueue();
}

let coverIntersectionObserver = null;

/**
 * Асинхронная загрузка обложек через IntersectionObserver (только видимые карточки)
 */
function loadBookCovers(container) {
    if (!container) return;
    const coverEls = container.querySelectorAll('.opac-book-cover[data-title]');

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
        if (!coverIntersectionObserver) {
            coverIntersectionObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target);
                        queueCoverElementLoad(entry.target);
                    }
                });
            }, { rootMargin: '150px 0px' });
        }
        coverEls.forEach(el => {
            if (el.dataset.coverQueued !== 'true') {
                coverIntersectionObserver.observe(el);
            }
        });
    } else {
        coverEls.forEach(el => queueCoverElementLoad(el));
    }
}

// Алиас для обратной совместимости
const loadGoogleBooksCovers = loadBookCovers;

/**
 * Singleton модального окна увеличенного 3D-просмотра обложки в HD качестве
 */
let coverZoomModalEl = null;

function initCoverZoomModal() {
    if (coverZoomModalEl) return;
    const modal = document.createElement('div');
    modal.className = 'opac-cover-zoom-modal hidden';
    modal.id = 'opac-cover-zoom-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Увеличенный просмотр обложки книги');
    modal.innerHTML = `
        <div class="opac-cover-zoom-backdrop" data-zoom-close></div>
        <div class="opac-cover-zoom-dialog">
            <button type="button" class="opac-cover-zoom-close" data-zoom-close aria-label="Закрыть (Esc)">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="opac-cover-zoom-card">
                <div class="opac-cover-zoom-3d-wrap">
                    <div class="opac-zoom-spine-fold"></div>
                    <div class="opac-zoom-pages-edge"></div>
                    <img class="opac-cover-zoom-img" src="" alt="Обложка книги" />
                </div>
                <div class="opac-cover-zoom-meta">
                    <div class="opac-cover-zoom-source-badge" data-zoom-source></div>
                    <h3 class="opac-cover-zoom-title" data-zoom-title></h3>
                    <div class="opac-cover-zoom-author" data-zoom-author></div>
                    <div class="opac-cover-zoom-extra" data-zoom-extra></div>
                    <div class="opac-cover-zoom-actions">
                        <button type="button" class="opac-zoom-ask-btn" data-zoom-ask>
                            <span class="material-symbols-outlined icon">smart_toy</span>
                            <span>Спросить у Космо об этой книге</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    coverZoomModalEl = modal;

    const closeBtns = modal.querySelectorAll('[data-zoom-close]');
    closeBtns.forEach(b => b.addEventListener('click', closeCoverZoomModal));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && coverZoomModalEl && coverZoomModalEl.classList.contains('is-open')) {
            closeCoverZoomModal();
        }
    });
}

function openCoverZoomModal({ coverUrl, title, author, source, year, shelfmark }) {
    initCoverZoomModal();
    if (!coverZoomModalEl) return;

    const imgEl = coverZoomModalEl.querySelector('.opac-cover-zoom-img');
    const titleEl = coverZoomModalEl.querySelector('[data-zoom-title]');
    const authorEl = coverZoomModalEl.querySelector('[data-zoom-author]');
    const sourceEl = coverZoomModalEl.querySelector('[data-zoom-source]');
    const extraEl = coverZoomModalEl.querySelector('[data-zoom-extra]');
    const askBtn = coverZoomModalEl.querySelector('[data-zoom-ask]');

    if (imgEl) imgEl.src = coverUrl || '';
    if (titleEl) titleEl.textContent = title || 'Без названия';
    if (authorEl) authorEl.textContent = author ? `✍️ ${author}` : '';
    if (sourceEl) {
        if (source) {
            sourceEl.textContent = `Источник обложки: ${source}`;
            sourceEl.style.display = 'inline-flex';
        } else {
            sourceEl.style.display = 'none';
        }
    }
    if (extraEl) {
        let metaHtml = '';
        if (year) metaHtml += `<span class="opac-badge-bbk">Год: ${escapeHtml(year)}</span>`;
        if (shelfmark) metaHtml += `<span class="opac-badge-bbk">ББК: ${escapeHtml(shelfmark)}</span>`;
        extraEl.innerHTML = metaHtml;
    }

    if (askBtn) {
        askBtn.onclick = () => {
            closeCoverZoomModal();
            closeOpacModal();
            triggerCosmoChatQuery(title, author);
        };
    }

    coverZoomModalEl.classList.remove('hidden');
    coverZoomModalEl.classList.add('is-open');
}

function closeCoverZoomModal() {
    if (!coverZoomModalEl) return;
    coverZoomModalEl.classList.remove('is-open');
    coverZoomModalEl.classList.add('hidden');
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
                        <button type="button" class="opac-search-btn" data-opac-search title="Найти книги (Enter)">
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

                    <!-- Панель фильтров: выпадающий список всех 18 филиалов слева, тумблер наличия справа -->
                    <div class="opac-filters-bar">
                        <div class="opac-branch-select-wrap">
                            <label for="opac-branch-select" class="opac-branch-select-label">
                                <span class="material-symbols-outlined icon">domain</span>
                                <span class="label-text">Филиал:</span>
                            </label>
                            <select id="opac-branch-select" class="opac-branch-select" data-opac-branch-select title="Выбор конкретного филиала из 18 библиотек Владимира">
                                <option value="all">🏢 Все 18 библиотек Владимира</option>
                                <option value="cgb">📚 ЦГБ (Суздальский пр., 2)</option>
                                <option value="cdb">🏛 ЦДБ — Детская (ул. Большая Московская, 31)</option>
                                <option value="f4">🌟 Филиал №4 — Доброе (ул. Егорова, 10)</option>
                                <option value="f1">📍 Филиал №1 (пр-т Строителей, 38 а)</option>
                                <option value="f2">📍 Филиал №2 (пр. Ленина, 12)</option>
                                <option value="f3">📍 Филиал №3 (мкр. Юрьевец, Школьный пр., 4)</option>
                                <option value="f5">📍 Филиал №5 (ул. Верхняя Дуброва, 10)</option>
                                <option value="f6">📍 Филиал №6 (мкр. Юрьевец, Институтский гор., 2)</option>
                                <option value="f7">📍 Филиал №7 (ул. Мира, 55, ДК Молодежи)</option>
                                <option value="f8">📍 Филиал №8 (ул. Сурикова, 26)</option>
                                <option value="f9">📍 Филиал №9 — Добролит (ул. Юбилейная, 38)</option>
                                <option value="f10">📍 Филиал №10 (ул. Диктора Левитана, 55)</option>
                                <option value="f11">📍 Филиал №11 (мкр. Лесной, ул. Лесная, 10 А)</option>
                                <option value="f12">📍 Филиал №12 (мкр. Энергетик, ул. Энергетиков, 27)</option>
                                <option value="f13">📍 Филиал №13 — Книголенд (ул. Горького, 69)</option>
                                <option value="f14">📍 Филиал №14 (мкр. Оргтруд, ул. Октябрьская, 26 «б»)</option>
                                <option value="f15">📍 Филиал №15 (пос. Заклязьменский, ул. Центральная, 11 А)</option>
                                <option value="f16">📍 Филиал №16 (мкр. Коммунар, ул. Песочная, 15)</option>
                            </select>
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

    // Выпадающий список всех 18 филиалов
    const branchSelectEl = opacModalEl.querySelector('[data-opac-branch-select]');
    if (branchSelectEl) {
        branchSelectEl.addEventListener('change', () => {
            currentBranchFilter = branchSelectEl.value || 'all';
            const query = opacInputEl ? opacInputEl.value.trim() : '';
            if (query) {
                executeOpacSearch(query, true);
            }
        });
    }

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

let isSearchInProgress = false;
let lastSearchTimestamp = 0;

function setSearchBtnLoading(loading) {
    if (!opacSearchBtnEl) return;
    opacSearchBtnEl.disabled = loading;
    if (loading) {
        opacSearchBtnEl.classList.add('is-searching');
        const icon = opacSearchBtnEl.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.dataset.prevIcon = icon.textContent;
            icon.textContent = 'sync';
            icon.classList.add('opac-spin-icon');
        }
    } else {
        opacSearchBtnEl.classList.remove('is-searching');
        const icon = opacSearchBtnEl.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = icon.dataset.prevIcon || 'travel_explore';
            icon.classList.remove('opac-spin-icon');
        }
    }
}

/**
 * Выполнение асинхронного поиска через API с защитой от флуда и двухуровневым кэшированием
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

    const now = Date.now();
    if (isSearchInProgress && now - lastSearchTimestamp < 800) {
        return;
    }
    lastSearchTimestamp = now;

    const onlyAvailable = opacOnlyAvailableEl && opacOnlyAvailableEl.checked;
    const cacheKey = `${query.trim().toLowerCase()}|${currentBranchFilter}|${onlyAvailable ? 1 : 0}`;

    // 1. Проверка памяти Map и sessionStorage (0мс без сети)
    if (!forceRefresh) {
        if (searchResultsCache.has(cacheKey)) {
            renderSearchResults(searchResultsCache.get(cacheKey), query);
            return;
        }
        try {
            const stored = sessionStorage.getItem(`opac_q_v2_${cacheKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.data) {
                    searchResultsCache.set(cacheKey, parsed.data);
                    renderSearchResults(parsed.data, query);
                    return;
                }
            }
        } catch (e) {}
    }

    if (currentSearchAbortCtrl) {
        currentSearchAbortCtrl.abort();
    }
    currentSearchAbortCtrl = new AbortController();

    isSearchInProgress = true;
    setSearchBtnLoading(true);
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

        if (response.status === 429) {
            const errData = await response.json().catch(() => ({}));
            renderRateLimitState(errData.error || 'Слишком много запросов. Пожалуйста, подождите несколько секунд.');
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data && data.rate_limited) {
            renderRateLimitState(data.error || 'Слишком много запросов. Пожалуйста, подождите несколько секунд.');
            return;
        }
        if (data && data.circuit_breaker) {
            renderCircuitBreakerState(data.error || 'Сервер каталога OPAC временно восстанавливает связь');
            return;
        }

        searchResultsCache.set(cacheKey, data);
        try {
            sessionStorage.setItem(`opac_q_v2_${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));
        } catch (e) {}

        renderSearchResults(data, query);

    } catch (err) {
        if (err.name === 'AbortError') return;
        renderErrorState(err.message || 'Сбой подключения к каталогу OPAC');
    } finally {
        isSearchInProgress = false;
        setSearchBtnLoading(false);
    }
}

/**
 * Отрисовка предупреждения Rate Limit
 */
function renderRateLimitState(message) {
    if (!opacGridEl || !opacStatusEl) return;

    opacStatusEl.innerHTML = `
        <div class="opac-status-empty" style="color: #f59e0b;">
            <span class="material-symbols-outlined" style="vertical-align: middle;">speed</span>
            <span>Бережный режим каталога (Rate Limit)</span>
        </div>
    `;

    opacGridEl.innerHTML = `
        <div class="opac-notice-card is-warning">
            <div class="opac-notice-icon is-warning">
                <span class="material-symbols-outlined">speed</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Бережный режим каталога</h3>
                <p class="opac-notice-desc">${escapeHtml(message)}</p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">🛡️ <strong>Защита от перегрузки:</strong> Для стабильности сервера библиотек Владимира установлена секундная пауза между частыми запросами.</span>
                </div>
            </div>
        </div>
    `;
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
 * Проверка соответствия экземпляра книги выбранному фильтру филиала
 */
function matchesBranchFilter(copy, filter) {
    if (!copy || !filter || filter === 'all') return true;
    const f = String(filter).toLowerCase();
    const sub = String(copy.subfield_b || '').toLowerCase();
    const code = String(copy.branch_code || '').toLowerCase();
    const name = String(copy.branch_name || '').toLowerCase();
    const loc = String(copy.permanent_location || '').toLowerCase();
    const addr = String(copy.branch_address || '').toLowerCase();

    if (f === 'f4' || f === 'ф4') {
        return sub === 'ф4' || sub === 'ф4д' || code.includes('4') || name.includes('4') || loc.includes('ф4') || addr.includes('егорова');
    }
    if (f === 'cgb' || f === 'цгб') {
        return ['аб', 'чз', 'до', 'кх', 'ибо', 'ооо'].includes(sub) || code === 'цгб' || name.includes('центральная городская') || loc.includes('цгб');
    }
    if (f === 'cdb' || f === 'цдб') {
        return ['цдб', 'цдч', 'цди', 'цки'].includes(sub) || code === 'цдб' || name.includes('детская') || loc.includes('цдб');
    }
    if (f.startsWith('f') || f.startsWith('ф')) {
        const num = f.replace(/^[fф]-?/i, '');
        return sub === `ф${num}` || sub === `ф${num}д` || sub === `ф${num}н` || sub === `ф${num}нд` || code.includes(`№${num}`) || name.includes(`№${num}`) || loc.includes(`ф${num}`);
    }
    return sub.includes(f) || code.includes(f) || name.includes(f) || loc.includes(f);
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

    // Фильтрация на клиенте по выбранному филиалу
    let itemsToDisplay = data.items;
    if (currentBranchFilter && currentBranchFilter !== 'all') {
        itemsToDisplay = itemsToDisplay.filter(item => {
            const copies = item.copies || [];
            return copies.some(c => matchesBranchFilter(c, currentBranchFilter));
        });
    }

    if (itemsToDisplay.length === 0) {
        opacStatusEl.innerHTML = `
            <div class="opac-status-empty">
                По запросу «<strong>${escapeHtml(query)}</strong>» в выбранном филиале книг не найдено.
            </div>
        `;
        opacGridEl.innerHTML = `
            <div class="opac-notice-card">
                <div class="opac-notice-icon">
                    <span class="material-symbols-outlined">filter_alt_off</span>
                </div>
                <div class="opac-notice-content">
                    <h3 class="opac-notice-title">В выбранном филиале эта книга отсутствует</h3>
                    <p class="opac-notice-desc">
                        Книга найдена в других филиалах Владимира! Переключите фильтр филиалов на «🏢 Все 18 библиотек Владимира», чтобы увидеть наличие по всей сети города.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    const totalFound = itemsToDisplay.length;
    opacStatusEl.innerHTML = `
        <div class="opac-status-summary">
            <span>Найдено изданий: <strong>${totalFound}</strong> по запросу «${escapeHtml(query)}»</span>
            ${data._cached ? '<span class="opac-cache-tag" title="Данные ускорены кэшем каталога">⚡ Кэш</span>' : ''}
        </div>
    `;

    let cardsHtml = '';
    itemsToDisplay.forEach((item, index) => {
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
                <!-- 3D-обложка книги с каскадом Google Books / Яндекс Книги / ЛитРес / OpenLibrary -->
                <div class="opac-book-cover genre-${genre}" data-genre="${genre}" data-title="${escapeHtml(title)}" data-author="${escapeHtml(author)}" data-isbn="${escapeHtml(item.isbn || '')}" tabindex="0" role="button" aria-label="Обложка книги ${escapeHtml(title)}, нажмите для увеличения" title="Нажмите для увеличенного 3D-просмотра обложки">
                    <div class="opac-book-pages-edge" aria-hidden="true"></div>
                    <div class="opac-book-spine-fold" aria-hidden="true"></div>
                    <img class="opac-book-cover-img" alt="${escapeHtml(title)}" loading="lazy" style="display: none; opacity: 0;" />
                    <span class="opac-cover-source-badge" style="display: none;"></span>
                    <div class="opac-cover-fallback">
                        <div class="opac-fallback-border">
                            <span class="material-symbols-outlined opac-cover-genre-icon">${genreIcon}</span>
                            <span class="opac-cover-title-preview">${escapeHtml(title)}</span>
                            ${year ? `<span class="opac-cover-year">${escapeHtml(year)}</span>` : ''}
                        </div>
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
                            <span class="material-symbols-outlined icon">account_balance</span>
                            <strong>Экземпляры в библиотеках (${copies.length}):</strong>
                        </div>
                        <div class="opac-copies-list">
                            ${renderCopiesListHtml(copies, currentBranchFilter)}
                        </div>
                    </div>

                    <!-- Кнопки действий в стиле Аврора -->
                    <div class="opac-book-actions">
                        <button type="button" class="opac-ask-cosmo-btn" data-ask-title="${escapeHtml(title)}" data-ask-author="${escapeHtml(author)}" title="Спросить рецензию и сюжет у робота Космо">
                            <span class="material-symbols-outlined icon">smart_toy</span>
                            <span class="btn-text">Спросить у Космо</span>
                        </button>
                        <a href="http://library.vladimir.ru/rguest_vlad_cgb.htm" target="_blank" rel="noopener noreferrer" class="opac-direct-link-btn" title="Проверить в каталоге ЦГБ">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span class="btn-text">OPAC-Global</span>
                        </a>
                    </div>
                </div>
            </article>
        `;
    });

    opacGridEl.innerHTML = cardsHtml;

    // Асинхронное фоновое обогащение обложками из 5-уровневого каскада
    loadBookCovers(opacGridEl);

    // Привязка кликов по обложке книги для увеличенного 3D-просмотра в HD
    const coverCards = opacGridEl.querySelectorAll('.opac-book-cover');
    coverCards.forEach(coverEl => {
        const handleCoverClick = () => {
            const title = coverEl.getAttribute('data-title') || '';
            const author = coverEl.getAttribute('data-author') || '';
            const realImg = coverEl.querySelector('.opac-book-cover-img');
            const coverUrl = coverEl.getAttribute('data-cover-url') || (realImg && realImg.style.display !== 'none' ? realImg.src : null);
            const source = coverEl.getAttribute('data-cover-source') || '';
            const cardEl = coverEl.closest('.opac-book-card');
            const shelfmark = cardEl ? (cardEl.querySelector('.opac-badge-bbk')?.textContent?.replace(/^[^\wА-Яа-я0-9.]+/, '')?.trim() || '') : '';
            const year = coverEl.querySelector('.opac-cover-year')?.textContent || '';

            if (coverUrl) {
                openCoverZoomModal({ coverUrl, title, author, source, year, shelfmark });
            }
        };

        coverEl.addEventListener('click', handleCoverClick);
        coverEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCoverClick();
            }
        });
    });

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
 * Отрисовка списка экземпляров по филиалам с группировкой и бейджами точного наличия
 */
function renderCopiesListHtml(copies, activeFilter = 'all') {
    if (!copies || copies.length === 0) {
        return `<div class="opac-no-copies">ℹ️ Детальные сведения об экземплярах уточняются в ЦГБ.</div>`;
    }

    // Группировка экземпляров по филиалу для чистого и информативного отображения
    const branchMap = new Map();
    copies.forEach(c => {
        const key = c.branch_name || c.branch_code || c.subfield_b || 'Библиотека';
        if (!branchMap.has(key)) {
            branchMap.set(key, {
                branch_name: key,
                branch_code: c.branch_code || '',
                subfield_b: c.subfield_b || '',
                branch_address: c.branch_address || '',
                branch_phone: c.branch_phone || '',
                permanent_location: c.permanent_location || '',
                total_count: 0,
                available_count: 0,
                inventories: [],
                rawCopy: c
            });
        }
        const b = branchMap.get(key);
        b.total_count++;
        if (c.is_available) {
            b.available_count++;
        }
        if (c.inventory) {
            b.inventories.push(c.inventory);
        }
    });

    const branchList = Array.from(branchMap.values());

    // Сортировка: сначала целевой филиал фильтра, затем наличие, затем общее количество
    branchList.sort((a, b) => {
        if (activeFilter && activeFilter !== 'all') {
            const aMatch = matchesBranchFilter(a.rawCopy, activeFilter) ? 1 : 0;
            const bMatch = matchesBranchFilter(b.rawCopy, activeFilter) ? 1 : 0;
            if (bMatch !== aMatch) return bMatch - aMatch;
        }
        if ((b.available_count > 0 ? 1 : 0) !== (a.available_count > 0 ? 1 : 0)) {
            return (b.available_count > 0 ? 1 : 0) - (a.available_count > 0 ? 1 : 0);
        }
        return b.available_count - a.available_count;
    });

    return branchList.map(b => {
        const isBranch4 = (b.subfield_b === 'ф4' || b.branch_code === 'Филиал №4' || (b.permanent_location && b.permanent_location.includes('Ф4')));
        const isTargetBranch = (activeFilter && activeFilter !== 'all' && matchesBranchFilter(b.rawCopy, activeFilter));
        const isAvailable = b.available_count > 0;
        const bName = b.branch_name;
        const bAddress = b.branch_address;
        const bPhone = b.branch_phone;
        const invStr = b.inventories.length > 0 ? `Инв. № ${b.inventories.slice(0, 3).join(', ')}${b.inventories.length > 3 ? '...' : ''}` : '';

        // Формирование бейджа доступности: «🟢 На полке (N экз.)»
        let badgeText = '';
        let badgeClass = '';
        if (b.available_count > 0) {
            badgeClass = 'badge-available is-available';
            if (b.total_count > 1 && b.available_count < b.total_count) {
                badgeText = `🟢 На полке (${b.available_count} из ${b.total_count} экз.)`;
            } else if (b.total_count > 1) {
                badgeText = `🟢 На полке (${b.total_count} экз.)`;
            } else {
                badgeText = `🟢 На полке (1 экз.)`;
            }
        } else {
            badgeClass = 'badge-unavailable is-unavailable';
            badgeText = b.total_count > 1 ? `⏳ На руках (${b.total_count} экз.)` : `⏳ На руках / фонд`;
        }

        const itemClass = [
            'opac-copy-item',
            isTargetBranch ? 'is-target-branch' : '',
            isBranch4 ? 'is-f4' : '',
            isAvailable ? 'has-availability' : 'no-availability'
        ].filter(Boolean).join(' ');

        return `
            <div class="${itemClass}">
                <div class="opac-copy-top">
                    <span class="opac-copy-name">
                        ${isTargetBranch ? '🎯 <strong>' + escapeHtml(bName) + '</strong>' : (isBranch4 ? '🌟 <strong>[Доброе] ' + escapeHtml(bName) + '</strong>' : escapeHtml(bName))}
                    </span>
                    <span class="opac-copy-badge ${badgeClass}">
                        ${badgeText}
                    </span>
                </div>
                <div class="opac-copy-details">
                    ${bAddress ? `<span class="opac-copy-addr">📍 ${escapeHtml(bAddress)}</span>` : ''}
                    ${bPhone ? `<span class="opac-copy-phone">• 📞 <a href="tel:${escapeHtml(bPhone.replace(/[^\\d+]/g, ''))}">${escapeHtml(bPhone)}</a></span>` : ''}
                    ${invStr ? `<span class="opac-copy-inv">• 🔖 [${escapeHtml(invStr)}]</span>` : ''}
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
