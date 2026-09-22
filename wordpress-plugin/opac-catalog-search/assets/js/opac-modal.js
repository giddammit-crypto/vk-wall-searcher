/**
 * assets/js/opac-modal.js — Модальное окно поиска по электронному каталогу OPAC-Global.
 *
 * Портировано из src/opac_modal.js проекта vk_wall_searcher_php (ES-модуль -> standalone IIFE):
 *   • Поиск библиографических записей в БД 62 (ЦГБ г. Владимира)
 *   • Холдинги (экземпляры) по всем 18 филиалам, фильтр по филиалам
 *   • Обложки: ЛитРес -> Яндекс Книги -> OpenLibrary -> Google Книги
 *   • Открытие: window.OpacCatalog.open(), кнопки .opac-open-trigger, ссылки #opac-catalog
 */

(function () {
'use strict';

// Автоматическое определение хоста и директории плагина при встраивании на сторонний сайт
var detectedOrigin = '';
var detectedAjaxUrl = '/wp-admin/admin-ajax.php';
var detectedAssetUrl = '';

if (typeof document !== 'undefined') {
    var curScript = document.currentScript;
    if (!curScript) {
        var allScripts = document.querySelectorAll('script[src*="opac-modal.js"], script[src*="opac-catalog"]');
        if (allScripts.length > 0) {
            curScript = allScripts[allScripts.length - 1];
        }
    }
    if (curScript && curScript.src) {
        try {
            var sUrl = new URL(curScript.src, window.location.href);
            detectedOrigin = sUrl.origin;
            var path = sUrl.pathname;
            var assetsIdx = path.lastIndexOf('/assets/');
            if (assetsIdx !== -1) {
                detectedAssetUrl = detectedOrigin + path.substring(0, assetsIdx + 8);
            }
            var wpContentIdx = path.indexOf('/wp-content/');
            if (wpContentIdx !== -1) {
                var wpRoot = path.substring(0, wpContentIdx);
                detectedAjaxUrl = detectedOrigin + wpRoot + '/wp-admin/admin-ajax.php';
            } else if (sUrl.origin !== window.location.origin) {
                detectedAjaxUrl = detectedOrigin + '/wp-admin/admin-ajax.php';
            }
        } catch (e) {}
    }
}

function getOpacConfig() {
    var userCfg = (typeof window !== 'undefined' && window.OpacCatalogConfig) ? window.OpacCatalogConfig : {};
    var fallbackAjax = (typeof window !== 'undefined' && window.ajaxurl) ? window.ajaxurl : detectedAjaxUrl;
    var baseAsset = userCfg.assetUrl || detectedAssetUrl || '';

    return {
        ajaxUrl: userCfg.ajaxUrl || fallbackAjax || '/wp-admin/admin-ajax.php',
        assetUrl: baseAsset,
        bannerUrl: userCfg.bannerUrl || (baseAsset ? baseAsset + 'img/catalog_banner.svg' : ''),
        noCoverImgUrl: userCfg.noCoverImgUrl || (baseAsset ? baseAsset + 'img/robot_shock.png' : ''),
        directUrl: userCfg.directUrl || 'http://library.vladimir.ru/rguest_vlad_cgb.htm',
        enableCovers: userCfg.enableCovers !== undefined ? Boolean(userCfg.enableCovers) : true,
        actions: userCfg.actions || {
            search: 'opac_search',
            copies: 'opac_copies',
            cover: 'opac_cover',
            status: 'opac_status'
        }
    };
}

var OPAC_CFG = getOpacConfig();

// Автоподключение CSS стилей и иконок при внешнем встраивании (если они не были подключены на странице)
if (typeof document !== 'undefined') {
    var initialCfg = getOpacConfig();
    if (initialCfg.assetUrl && !document.querySelector('link[href*="opac-search.css"]')) {
        var cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = initialCfg.assetUrl + 'css/opac-search.css';
        document.head.appendChild(cssLink);
    }
    if (!document.querySelector('link[href*="Material+Symbols"]') && !document.querySelector('link[href*="material-symbols"]')) {
        var matLink = document.createElement('link');
        matLink.rel = 'stylesheet';
        matLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        document.head.appendChild(matLink);
    }
}

/**
 * Экранирование HTML (порт escapeHtml из branches.js)
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
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


let opacModalEl = null;
let opacInputEl = null;
let opacClearBtnEl = null;
let opacGridEl = null;
let opacStatusEl = null;
let opacOnlyAvailableEl = null;
let opacPaginationEl = null;
let currentBranchFilter = 'all';
let opacSearchBtnEl = null;

const CARDS_PER_PAGE = 4;
let currentOpacPage = 1;
let lastSearchQuery = '';

let currentSearchAbortCtrl = null;
let searchResultsCache = new Map();
const bookCoversCache = new Map();

// Принудительная очистка старого sessionStorage кэша поиска при загрузке
// и устаревших кэшей обложек v4 (для применения нового приоритета ЛитРес -> Яндекс Книги -> Google)
try {
    const keysToDelete = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('opac_q_v4_')) keysToDelete.push(k);
    }
    keysToDelete.forEach(k => sessionStorage.removeItem(k));

    const covKeysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('opac_cov_v4_')) covKeysToDelete.push(k);
    }
    covKeysToDelete.forEach(k => localStorage.removeItem(k));
} catch (e) {}


/**
 * Очистка названия для точного поиска обложек
 */
function cleanSearchTerm(text) {
    if (!text) return '';
    let t = String(text);
    // Очистка BBCode [color] и HTML-тегов
    t = t.replace(/\[\/?color[^\]]*\]/gi, '').replace(/<[^>]+>/g, '');
    // Отрезаем скобочный мусор OPAC: [роман], (сборник)
    t = t.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');
    t = t.replace(/\[.*$/, '').replace(/\(.*$/, '');
    // Отрезаем подзаголовки через двоеточие, тире, слэш ответственности или точку с запятой
    t = t.split(/[:;–—\/]/)[0];
    // Отрезаем подзаголовки после точки, если они начинаются с заглавной буквы (. Драмы, . Роман)
    if (/\.\s+[А-ЯA-Z]/u.test(t)) {
        t = t.split(/\.\s+/)[0];
    }
    // Удаляем кавычки и знаки препинания по краям
    t = t.replace(/[\"\'«»“”]/g, '').replace(/[,.]\s*$/g, '');
    return t.trim();
}

function escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Очистка автора книги и извлечение фамилии для поиска обложек
 * Поддерживает любые форматы:
 * - Инициалы сзади: "Пушкин А. С.", "Пушкин А.С.", "Пушкин А."
 * - Инициалы впереди: "А. С. Пушкин", "А.С. Пушкин", "А. Пушкин", "А.С.Пушкин"
 * - Разделитель запятая: "Пушкин, Александр Сергеевич", "Пушкин, А. С."
 * - Полное имя: "Александр Сергеевич Пушкин" (отчество в центре -> фамилия в конце)
 *               "Пушкин Александр Сергеевич" (отчество в конце -> фамилия в начале)
 * - 2 слова: "Александр Пушкин" vs "Пушкин Александр", "Лев Толстой" vs "Толстой Лев"
 */
function cleanAuthorForCover(rawAuthor) {
    if (!rawAuthor) return '';
    let a = String(rawAuthor).trim();
    a = a.replace(/\[\/?color[^\]]*\]/gi, '');
    a = a.replace(/<[^>]+>/g, '');
    a = a.replace(/[\[\]\(\)\"\'«»“”]/g, ' ');
    // Добавляем пробел между точкой инициала и следующей буквой ("А.С.Пушкин" -> "А. С. Пушкин")
    a = a.replace(/([A-Za-zА-Яа-яЁё])\./gu, '$1. ');
    a = a.replace(/\s+/g, ' ').trim();
    if (!a) return '';

    // Если есть запятая, часть до запятой часто содержит фамилию: "Пушкин, Александр Сергеевич"
    if (a.includes(',')) {
        const commaPart = a.split(',')[0].trim();
        if (commaPart.length >= 2) {
            a = commaPart;
        }
    }

    const rawWords = a.split(/\s+/).filter(w => w.length > 0);
    if (rawWords.length === 0) return '';

    const isInitial = (w) => {
        const clean = w.replace(/[.,\s]/g, '');
        return clean.length === 1 || (clean.length === 2 && w.includes('.'));
    };

    // Отрезаем ведущие инициалы
    while (rawWords.length > 0 && isInitial(rawWords[0])) {
        rawWords.shift();
    }
    // Отрезаем замыкающие инициалы
    while (rawWords.length > 0 && isInitial(rawWords[rawWords.length - 1])) {
        rawWords.pop();
    }

    const words = rawWords.map(w => w.replace(/[.,]/g, '').trim()).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];

    const patronymicRe = /(?:ович|евич|ич|овна|евна|ична|инична)$/i;
    if (words.length === 3) {
        if (patronymicRe.test(words[1])) return words[2];
        if (patronymicRe.test(words[2])) return words[0];
        return words[words.length - 1];
    }

    if (words.length === 2) {
        const commonFirstNames = new Set([
            'александр', 'алексей', 'анатолий', 'андрей', 'антон', 'аркадий', 'артем', 'артём', 'артур',
            'борис', 'вадим', 'валентин', 'валерий', 'василий', 'виктор', 'виталий', 'владимир', 'владислав',
            'всеволод', 'вячеслав', 'геннадий', 'георгий', 'глеб', 'григорий', 'даниил', 'денис', 'дмитрий',
            'евгений', 'егор', 'захар', 'иван', 'игорь', 'илья', 'кирилл', 'константин', 'лев', 'леонид',
            'максим', 'матвей', 'михаил', 'никита', 'николай', 'олег', 'павел', 'петр', 'пётр', 'платон',
            'роман', 'ростислав', 'руслан', 'семен', 'семён', 'сергей', 'станислав', 'степан', 'тимофей',
            'тимур', 'федор', 'фёдор', 'филипп', 'эдуард', 'юрий', 'ярослав',
            'анна', 'анастасия', 'валентина', 'валерия', 'варвара', 'василиса', 'вера', 'вероника', 'виктория',
            'галина', 'дарья', 'диана', 'евгения', 'екатерина', 'елена', 'елизавета', 'жанна', 'зинаида', 'зоя',
            'инна', 'ирина', 'кира', 'кристина', 'ксения', 'лариса', 'лидия', 'любовь', 'людмила', 'маргарита',
            'марина', 'мария', 'мирослава', 'надежда', 'наталья', 'нина', 'оксана', 'олеся', 'ольга', 'полина',
            'раиса', 'римма', 'светлана', 'софия', 'софья', 'тамара', 'татьяна', 'ульяна', 'юлия', 'яна',
            'стивен', 'джон', 'джордж', 'марк', 'джек', 'роберт', 'уильям', 'томас', 'майкл', 'дэвид',
            'эдгар', 'эрнест', 'франц', 'герман', 'жюль', 'чарльз', 'рей', 'рэй', 'айзек', 'клиффорд',
            'агата', 'джейн', 'вирджиния', 'джоан'
        ]);

        const w0 = words[0].toLowerCase().replace(/ё/g, 'е');
        const w1 = words[1].toLowerCase().replace(/ё/g, 'е');

        const surnameSuffixRe = /(?:ов|ова|ев|ева|ин|ина|ын|ына|ский|ская|цкий|цкая|ых|их|ой|ый)$/i;
        if (commonFirstNames.has(w0) && !commonFirstNames.has(w1)) return words[1];
        if (commonFirstNames.has(w1) && !commonFirstNames.has(w0)) return words[0];
        if (surnameSuffixRe.test(w0) && !surnameSuffixRe.test(w1)) return words[0];
        if (surnameSuffixRe.test(w1) && !surnameSuffixRe.test(w0)) return words[1];
        return words[0];
    }

    return words[0];
}

/**
 * Строгая проверка совпадения названия и автора книги для обложки (защита от чужих обложек)
 * 1. Если у книги в ОПАК есть автор, найденная книга ОБЯЗАНА содержать фамилию автора.
 * 2. Название должно строго совпадать (>= 80% значимых слов).
 * Если не совпадает — отдавать null/отклонять!
 */
function isStrictBookCoverMatch(foundTitle, foundAuthors, targetTitle, targetAuthor) {
    if (!foundTitle || !targetTitle) return false;

    const norm = (str) => String(str || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\"\'«»“”\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tTitleNorm = norm(targetTitle);
    const fTitleNorm = norm(foundTitle);
    if (!tTitleNorm || !fTitleNorm) return false;

    // -------------------------------------------------------------------------
    // 1. Проверка автора: если автор есть в ОПАК, найденная книга ОБЯЗАНА его содержать
    // -------------------------------------------------------------------------
    const rawTargetAuthor = String(targetAuthor || '').trim();
    if (rawTargetAuthor.length > 0) {
        const targetSurname = cleanAuthorForCover(rawTargetAuthor);
        const tSurnameNorm = norm(targetSurname);

        if (tSurnameNorm.length >= 2) {
            const fAuthorsNorm = norm(foundAuthors);
            const fTitleCheck = norm(foundTitle);

            const stem = tSurnameNorm.length >= 4 ? tSurnameNorm.slice(0, -1) : tSurnameNorm;
            const authorWordRegex = new RegExp('(?:^|\\s)' + escapeRegExp(stem) + '[а-яa-z]*(?:$|\\s)', 'i');

            const authorInAuthors = fAuthorsNorm ? authorWordRegex.test(' ' + fAuthorsNorm + ' ') : false;
            const authorInTitle = authorWordRegex.test(' ' + fTitleCheck + ' ');

            if (!authorInAuthors && !authorInTitle) {
                return false;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. Строгая проверка названия: >= 80% значимых слов
    // -------------------------------------------------------------------------
    if (fTitleNorm === tTitleNorm) return true;

    // Отсекаем подзаголовки (после :, ;, —, –, /)
    const stripSub = (str) => {
        const parts = String(str || '').split(/[:;–—\/]/);
        const m = (parts[0] || '').trim();
        return m || str;
    };
    const tTitleClean = norm(stripSub(targetTitle));
    const fTitleClean = norm(stripSub(foundTitle));
    if (tTitleClean && fTitleClean && tTitleClean === fTitleClean) {
        return true;
    }

    // Сравнение без указания тома/части/книги
    const tShort = (tTitleClean || tTitleNorm).split(/\s+том\b|\s+ч\b|\s+кн\b/)[0].trim();
    const fShort = (fTitleClean || fTitleNorm).split(/\s+том\b|\s+ч\b|\s+кн\b/)[0].trim();
    if (tShort && tShort === fShort) return true;

    const stopWords = new Set([
        'и', 'в', 'во', 'не', 'на', 'с', 'со', 'что', 'он', 'по', 'к', 'ко',
        'из', 'у', 'за', 'от', 'о', 'об', 'обо', 'для', 'до', 'же', 'бы',
        'то', 'ли', 'но', 'да', 'или', 'а', 'как', 'так', 'том', 'часть',
        'книга', 'выпуск', 'т', 'ч', 'кн', 'the', 'a', 'an', 'and', 'or',
        'in', 'on', 'at', 'of', 'to', 'for', 'with', 'by'
    ]);

    const extractSignificantWords = (title) => {
        return title
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w.length >= 2 && !stopWords.has(w));
    };

    const tWords = extractSignificantWords(tShort || tTitleNorm);
    const fWords = extractSignificantWords(fShort || fTitleNorm);

    if (tWords.length === 0 || fWords.length === 0) {
        return tTitleNorm === fTitleNorm;
    }

    const wordsMatch = (w1, w2) => {
        if (w1 === w2) return true;
        if (w1.length >= 4 && w2.length >= 4) {
            if (w1.startsWith(w2.slice(0, -1)) || w2.startsWith(w1.slice(0, -1))) return true;
            if (w1.length >= 5 && w2.length >= 5 && w1.slice(0, -2) === w2.slice(0, -2)) return true;
        }
        return false;
    };

    let matchedTargetWords = 0;
    for (const tw of tWords) {
        if (fWords.some(fw => wordsMatch(tw, fw))) {
            matchedTargetWords++;
        }
    }
    const ratioTarget = matchedTargetWords / tWords.length;

    let matchedFoundWords = 0;
    for (const fw of fWords) {
        if (tWords.some(tw => wordsMatch(tw, fw))) {
            matchedFoundWords++;
        }
    }
    const ratioFound = matchedFoundWords / fWords.length;

    if (ratioTarget >= 0.8 && ratioFound >= 0.6) {
        return true;
    }

    return false;
}

const opac_is_strict_cover_match = isStrictBookCoverMatch;

/**
 * Источник 1: Яндекс Книги (Bookmate API) со строгой проверкой названия и автора
 */
async function fetchYandexBookmateCover(cleanTitle, cleanAuthor) {
    try {
        const queries = cleanAuthor ? [`${cleanTitle} ${cleanAuthor}`, cleanTitle] : [cleanTitle];
        for (const query of queries) {
            const url = `https://api.bookmate.com/api/v5/books/search?query=${encodeURIComponent(query)}`;
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3500);

            const res = await fetch(url, {
                signal: ctrl.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timer);

            if (!res.ok) continue;
            const data = await res.json();
            if (!data || !Array.isArray(data.objects) || data.objects.length === 0) continue;

            for (const obj of data.objects) {
                if (!obj || !obj.cover) continue;
                const coverUrl = obj.cover.large || obj.cover.small;
                if (!coverUrl) continue;

                const objTitle = String(obj.title || '').trim();
                const objAuthors = String(obj.authors || '').trim();

                // Исключаем статьи, краткие пересказы и сторонние анализы
                if (/кратк|комментар|пересказ|стать|анализ/i.test(objTitle)) {
                    continue;
                }

                if (isStrictBookCoverMatch(objTitle, objAuthors, cleanTitle, cleanAuthor)) {
                    return {
                        url: coverUrl.replace(/^http:\/\//i, 'https://'),
                        source: 'Яндекс Книги',
                        sourceId: 'yandex',
                        color: obj.cover.background_color_hex || null
                    };
                }
            }
        }
    } catch (e) {}
    return null;
}

/**
 * Источник 2: Google Книги API со строгой проверкой
 */
async function fetchGoogleBooksCoverEnhanced(cleanTitle, cleanAuthor) {
    try {
        let q = `intitle:"${encodeURIComponent(cleanTitle)}"`;
        if (cleanAuthor) {
            q += `+inauthor:"${encodeURIComponent(cleanAuthor)}"`;
        }
        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);

        const res = await fetch(gbUrl, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.items)) {
                for (const item of data.items) {
                    const vol = item.volumeInfo;
                    if (!vol || !vol.imageLinks) continue;
                    const gTitle = String(vol.title || '').trim();
                    const gAuthors = Array.isArray(vol.authors) ? vol.authors.join(', ') : '';

                    if (isStrictBookCoverMatch(gTitle, gAuthors, cleanTitle, cleanAuthor)) {
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
            }
        }
    } catch (e) {}
    return null;
}

/**
 * Источник: Серверный шлюз ЛитРес / Авроры (api/opac.php?action=cover) со строгой проверкой
 */
async function fetchBackendGatewayCover(cleanTitle, cleanAuthor, rawIsbn = '', source = '') {
    try {
        const params = new URLSearchParams({
            action: OPAC_CFG.actions.cover,
            title: cleanTitle
        });
        if (cleanAuthor) params.append('author', cleanAuthor);
        if (rawIsbn) params.append('isbn', rawIsbn);
        if (source) params.append('source', source);

        const url = resolveApiUrl('api/opac.php') + '?' + params.toString();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4500);

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
                    source: data.source || (source === 'litres' ? 'ЛитРес' : 'Аврора'),
                    sourceId: data.source_id || (source === 'litres' ? 'litres' : 'gateway'),
                    color: data.color || null
                };
            }
        }
    } catch (e) {}

    return null;
}

/**
 * Источник 4: OpenLibrary Covers API (-L.jpg) со строгой проверкой
 */
async function fetchOpenLibraryCover(cleanTitle, cleanAuthor) {
    try {
        const olQuery = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`.trim());
        const olUrl = `https://openlibrary.org/search.json?q=${olQuery}&limit=6`;
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
                    if (!doc.cover_i) continue;
                    const oTitle = String(doc.title || '').trim();
                    const oAuthors = Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '';

                    if (isStrictBookCoverMatch(oTitle, oAuthors, cleanTitle, cleanAuthor)) {
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
 * Полный многоуровневый каскад поиска обложек книги с двухуровневым кэшированием (префикс v5)
 * Приоритет источников:
 *   1. ЛитРес (наивысший приоритет)
 *   2. Яндекс Книги (Bookmate)
 *   3. OpenLibrary
 *   4. Google Книги (самый низкий приоритет)
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

    // 2. Проверка localStorage (кэш v5 на 7 дней)
    try {
        const stored = localStorage.getItem(`opac_cov_v5_${cacheKey}`);
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
            localStorage.setItem(`opac_cov_v5_${cacheKey}`, JSON.stringify({
                data: result,
                exp: Date.now() + (result ? 7 * 86400 * 1000 : 24 * 3600 * 1000)
            }));
        } catch (e) {}
        return result;
    };

    // 1. ПРИОРИТЕТ 1 (НАИВЫСШИЙ): ЛитРес (через серверный шлюз Авроры api/opac.php?action=cover&source=litres)
    const litresRes = await fetchBackendGatewayCover(title, author, rawIsbn, 'litres');
    if (litresRes && litresRes.url) {
        return saveToCache(litresRes);
    }

    // 2. ПРИОРИТЕТ 2: Яндекс Книги (Bookmate API) — открытый прямой CORS
    const yandexRes = await fetchYandexBookmateCover(title, author);
    if (yandexRes && yandexRes.url) {
        return saveToCache(yandexRes);
    }

    // 3. ПРИОРИТЕТ 3: OpenLibrary Covers API (-L.jpg)
    const olRes = await fetchOpenLibraryCover(title, author);
    if (olRes && olRes.url) {
        return saveToCache(olRes);
    }

    // 4. САМЫЙ НИЗКИЙ ПРИОРИТЕТ: Google Книги API — опрашивается в самом конце
    const googleRes = await fetchGoogleBooksCoverEnhanced(title, author);
    if (googleRes && googleRes.url) {
        return saveToCache(googleRes);
    }

    // 5. Запасной общий серверный шлюз (на случай, если клиентские запросы заблокированы сетью)
    const fallbackRes = await fetchBackendGatewayCover(title, author, rawIsbn);
    if (fallbackRes && fallbackRes.url) {
        return saveToCache(fallbackRes);
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
    if (!OPAC_CFG.enableCovers) return;
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
 * Асинхронная загрузка обложек (для порции из 4 карточек страницы запускаем напрямую)
 */
function loadBookCovers(container) {
    if (!container) return;
    const coverEls = container.querySelectorAll('.opac-book-cover[data-title]');
    coverEls.forEach(el => queueCoverElementLoad(el));
}

// Алиас для обратной совместимости
const loadGoogleBooksCovers = loadBookCovers;

/**
 * Singleton модального окна подробного просмотра книги и обложки
 */
let coverZoomModalEl = null;

function initCoverZoomModal() {
    if (coverZoomModalEl) return;
    OPAC_CFG = getOpacConfig();
    const modal = document.createElement('div');
    modal.className = 'opac-cover-zoom-modal hidden';
    modal.id = 'opac-cover-zoom-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Подробные сведения об издании и наличии в библиотеках');
    modal.innerHTML = `
        <div class="opac-cover-zoom-backdrop" data-zoom-close></div>
        <div class="opac-cover-zoom-dialog">
            <button type="button" class="opac-cover-zoom-close" data-zoom-close aria-label="Закрыть окно (Esc)" title="Закрыть (Esc)">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="opac-cover-zoom-card">
                <div class="opac-cover-zoom-left">
                    <div class="opac-cover-zoom-3d-wrap">
                        <div class="opac-zoom-spine-fold"></div>
                        <div class="opac-zoom-pages-edge"></div>
                        <img class="opac-cover-zoom-img" src="" alt="Обложка книги" style="display: none;" />
                        <div class="opac-cover-zoom-fallback" style="display: flex;">
                            <div class="opac-zoom-fallback-border">
                                <span class="opac-zoom-fallback-no-cover-badge">НЕТ ОБЛОЖКИ !</span>
                                <img class="opac-zoom-fallback-cosmo-img" src="${OPAC_CFG.noCoverImgUrl}" alt="Космо удивлен" />
                                <span class="material-symbols-outlined opac-zoom-genre-icon" data-zoom-genre-icon style="display: none;">menu_book</span>
                                <span class="opac-zoom-title-preview" data-zoom-fallback-title></span>
                                <span class="opac-zoom-year" data-zoom-fallback-year></span>
                            </div>
                        </div>
                    </div>
                    <div class="opac-cover-zoom-source-badge" data-zoom-source style="display: none;"></div>
                </div>

                <div class="opac-cover-zoom-meta">
                    <div class="opac-cover-zoom-header-block">
                        <h3 class="opac-cover-zoom-title" data-zoom-title></h3>
                        <div class="opac-cover-zoom-author" data-zoom-author></div>
                        <div class="opac-cover-zoom-imprint" data-zoom-imprint></div>
                    </div>

                    <!-- Мета-бейджи: ББК, IDBR, Сиглы -->
                    <div class="opac-cover-zoom-extra" data-zoom-extra></div>

                    <!-- Блок экземпляров: какой филиал, адрес, телефон, наличие, инвентарь -->
                    <div class="opac-cover-zoom-copies-wrap">
                        <div class="opac-copies-header">
                            <span class="material-symbols-outlined icon">account_balance</span>
                            <strong data-zoom-copies-header>Экземпляры в библиотеках Владимира:</strong>
                        </div>
                        <div class="opac-copies-list opac-zoom-copies-list" data-zoom-copies-list>
                            <!-- Список экземпляров -->
                        </div>
                    </div>

                    <div class="opac-cover-zoom-actions">
                        <button type="button" class="opac-zoom-ask-btn" data-zoom-ask title="Спросить рецензию и сюжет у робота Космо">
                            <span class="material-symbols-outlined icon">smart_toy</span>
                            <span>Спросить у Космо</span>
                        </button>
                        <a href="${OPAC_CFG.directUrl}" target="_blank" rel="noopener noreferrer" class="opac-direct-link-btn" title="Проверить в каталоге ЦГБ">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span class="btn-text">OPAC-Global</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    coverZoomModalEl = modal;

    // Закрытие по крестику или клику на фон
    const closeBtns = modal.querySelectorAll('[data-zoom-close]');
    closeBtns.forEach(b => b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCoverZoomModal();
    }));

    const zoomDialog = modal.querySelector('.opac-cover-zoom-dialog');
    if (zoomDialog) {
        zoomDialog.addEventListener('click', (e) => e.stopPropagation());
    }
}

function openCoverZoomModal({ coverUrl, title, author, source, year, shelfmark, idbr, imprint, locations, copies, genre, inventory, targetInventory }) {
    initCoverZoomModal();
    if (!coverZoomModalEl) return;

    const imgEl = coverZoomModalEl.querySelector('.opac-cover-zoom-img');
    const fallbackEl = coverZoomModalEl.querySelector('.opac-cover-zoom-fallback');
    const fallbackTitleEl = coverZoomModalEl.querySelector('[data-zoom-fallback-title]');
    const fallbackYearEl = coverZoomModalEl.querySelector('[data-zoom-fallback-year]');
    const genreIconEl = coverZoomModalEl.querySelector('[data-zoom-genre-icon]');

    const titleEl = coverZoomModalEl.querySelector('[data-zoom-title]');
    const authorEl = coverZoomModalEl.querySelector('[data-zoom-author]');
    const imprintEl = coverZoomModalEl.querySelector('[data-zoom-imprint]');
    const sourceEl = coverZoomModalEl.querySelector('[data-zoom-source]');
    const extraEl = coverZoomModalEl.querySelector('[data-zoom-extra]');
    const copiesHeaderEl = coverZoomModalEl.querySelector('[data-zoom-copies-header]');
    const copiesListEl = coverZoomModalEl.querySelector('[data-zoom-copies-list]');
    const askBtn = coverZoomModalEl.querySelector('[data-zoom-ask]');

    // Обложка или 3D-фолбэк
    if (coverUrl) {
        if (imgEl) {
            imgEl.src = coverUrl;
            imgEl.style.display = 'block';
        }
        if (fallbackEl) fallbackEl.style.display = 'none';
    } else {
        if (imgEl) {
            imgEl.src = '';
            imgEl.style.display = 'none';
        }
        if (fallbackEl) {
            fallbackEl.style.display = 'flex';
            if (fallbackTitleEl) fallbackTitleEl.textContent = title || 'Книга без названия';
            if (fallbackYearEl) fallbackYearEl.textContent = year || '';
            if (genreIconEl && genre) {
                genreIconEl.textContent = getGenreIcon(genre);
            }
        }
    }

    if (titleEl) titleEl.textContent = title || 'Без названия';
    if (authorEl) authorEl.textContent = author ? `✍️ ${author}` : '';
    if (imprintEl) {
        if (imprint) {
            imprintEl.textContent = `🏛 ${imprint}`;
            imprintEl.style.display = 'block';
        } else {
            imprintEl.style.display = 'none';
        }
    }

    if (sourceEl) {
        if (source && coverUrl) {
            sourceEl.textContent = `Источник обложки: ${source}`;
            sourceEl.style.display = 'inline-flex';
        } else {
            sourceEl.style.display = 'none';
        }
    }

    // Мета-бейджи (ББК, OPAC ID, Год, Инвентарный номер, Сиглы с очисткой от BBCode/HTML)
    let activeInv = targetInventory || inventory;
    if (!activeInv && Array.isArray(copies) && copies.length > 0) {
        const foundInv = copies.map(c => c.inventory || c.code1).filter(Boolean)[0];
        if (foundInv) activeInv = foundInv;
    }

    if (extraEl) {
        let metaHtml = '';
        if (year) metaHtml += `<span class="opac-badge-bbk" title="Год издания">📅 ${escapeHtml(year)}</span>`;
        if (shelfmark) metaHtml += `<span class="opac-badge-bbk" title="Шифр классификации ББК">🔖 ${escapeHtml(shelfmark)}</span>`;
        if (idbr) metaHtml += `<span class="opac-badge-idbr" title="Системный ID в OPAC">🆔 ${escapeHtml(idbr)}</span>`;
        if (activeInv) {
            metaHtml += `<span class="opac-badge-inv ${targetInventory ? 'is-target-inventory' : ''}" title="Инвентарный номер издания">🏷️ Инв. №${escapeHtml(activeInv)}</span>`;
        }
        if (locations && locations.length > 0) {
            const cleanLocs = locations.map(loc => String(loc).replace(/\[\/?color[^\]]*\]/gi, '').replace(/<[^>]+>/g, '').trim()).filter(Boolean);
            if (cleanLocs.length > 0) {
                metaHtml += `<span class="opac-badge-sigla" title="Сигла подразделений хранения">📦 ${escapeHtml(cleanLocs.join(', '))}</span>`;
            }
        }
        extraEl.innerHTML = metaHtml;
    }

    // Экземпляры и филиалы (Какой филиал, адрес, телефон, наличие, инвентарь)
    const copiesList = copies || [];
    if (copiesHeaderEl) {
        copiesHeaderEl.textContent = `Экземпляры в библиотеках (${copiesList.length}):`;
    }
    if (copiesListEl) {
        copiesListEl.innerHTML = renderCopiesListHtml(copiesList, currentBranchFilter, targetInventory, activeInv);
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
    var cfg = getOpacConfig();
    return cfg.ajaxUrl;
}

/**
 * Инициализация и монтирование DOM-структуры модального окна
 */
function initOpacModal() {
    OPAC_CFG = getOpacConfig();
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
                    <img src="${OPAC_CFG.bannerUrl}" alt="Каталог OPAC" class="opac-banner-img" />
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
                    </div>
                </section>

                <!-- Контейнер результатов поиска -->
                <div class="opac-results-container">
                    <div class="opac-results-status" data-opac-status></div>
                    <div class="opac-books-grid" data-opac-grid></div>
                    <div class="opac-pagination-wrap" data-opac-pagination></div>
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
    opacPaginationEl = opacModalEl.querySelector('[data-opac-pagination]');

    // Кнопка закрытия (крестик) — ЕДИНСТВЕННЫЙ способ закрытия по клику
    const closeBtns = opacModalEl.querySelectorAll('[data-opac-close]');
    closeBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeOpacModal();
    }));

    // Закрытие по клавише Escape (сначала окно увеличенной обложки, затем модалка каталога)
    if (!window.__opacEscBound) {
        window.__opacEscBound = true;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (coverZoomModalEl && coverZoomModalEl.classList.contains('is-open')) {
                    e.preventDefault();
                    closeCoverZoomModal();
                    return;
                }
                if (opacModalEl && opacModalEl.classList.contains('is-open')) {
                    e.preventDefault();
                    closeOpacModal();
                }
            }
        });
    }

    // Защита от прокликивания насквозь и запрет закрытия по клику на пустое место
    opacModalEl.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    opacModalEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });
    opacModalEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
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

    // Клик и навигация с клавиатуры (Enter/Space) по тематическим карточкам начального экрана
    if (opacGridEl) {
        const handleQuickCard = (card) => {
            const action = card.getAttribute('data-quick-action');
            if (action && opacInputEl) {
                opacInputEl.value = action;
                if (opacClearBtnEl) opacClearBtnEl.classList.remove('hidden');
                executeOpacSearch(action);
            }
        };

        opacGridEl.addEventListener('click', (e) => {
            const card = e.target.closest('[data-quick-action]');
            if (card) {
                handleQuickCard(card);
            }
        });

        opacGridEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('[data-quick-action]');
                if (card) {
                    e.preventDefault();
                    handleQuickCard(card);
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

    if (opacPaginationEl) opacPaginationEl.innerHTML = '';
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
                <span class="material-symbols-outlined hint-icon">info</span>
                <span>Наличие книги в филиале уточняйте по телефонам филиала!</span>
                <span class="opac-hint-sep">·</span>
                <span class="material-symbols-outlined hint-icon">auto_stories</span>
                <span>Обложки могут отличаться!</span>
            </div>
        </div>
    `;
}

/**
 * Подсказка о слишком коротком запросе (защита от перегрузки OPAC)
 */
function renderShortQueryState() {
    if (!opacGridEl || !opacStatusEl) return;

    if (opacPaginationEl) opacPaginationEl.innerHTML = '';
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

    if (opacPaginationEl) opacPaginationEl.innerHTML = '';
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
 * Выполнение асинхронного поиска через API с постраничной пагинацией (CARDS_PER_PAGE = 4)
 */
async function executeOpacSearch(query, pageOrRefresh = 1, forceRefresh = false) {
    if (!query || query.trim().length < 2) {
        if (!query || query.trim().length === 0) {
            renderInitialState();
        } else {
            renderShortQueryState();
        }
        return;
    }

    let page = 1;
    if (typeof pageOrRefresh === 'number') {
        page = Math.max(1, pageOrRefresh);
    } else if (typeof pageOrRefresh === 'boolean') {
        forceRefresh = pageOrRefresh;
        page = 1;
    }

    currentOpacPage = page;
    lastSearchQuery = query;

    const now = Date.now();
    if (isSearchInProgress && now - lastSearchTimestamp < 500) {
        return;
    }
    lastSearchTimestamp = now;

    const onlyAvailable = opacOnlyAvailableEl && opacOnlyAvailableEl.checked;
    const cacheKey = `${query.trim().toLowerCase()}|${currentBranchFilter}|${onlyAvailable ? 1 : 0}|p${page}`;

    // Кэш результатов поиска отключён — всегда идём в API за свежими данными
    // (in-memory Map и sessionStorage не используются для поиска по каталогу)

    if (currentSearchAbortCtrl) {
        currentSearchAbortCtrl.abort();
    }
    currentSearchAbortCtrl = new AbortController();
    coverTaskQueue.length = 0; // Сбрасываем очередь обложек старого поиска/страницы

    isSearchInProgress = true;
    setSearchBtnLoading(true);
    renderSkeletons();

    try {
        const start = (page - 1) * CARDS_PER_PAGE;
        const params = new URLSearchParams({
            action: OPAC_CFG.actions.search,
            q: query,
            length: String(CARDS_PER_PAGE), // Строго 4 карточки на странице для защиты сервера OPAC
            page: String(page),
            start: String(start),
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
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
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
        if (data && !data.ok) {
            renderErrorState(data.error || 'Сбой подключения к каталогу OPAC');
            return;
        }

        // Гарантируем метаданные пагинации в ответе
        data.page = page;
        data.per_page = CARDS_PER_PAGE;

        // Кэширование результатов отключено — не пишем в Map и sessionStorage
        // searchResultsCache.set(cacheKey, data);
        // sessionStorage.setItem(`opac_q_v4_${cacheKey}`, ...);

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
    if (opacPaginationEl) opacPaginationEl.innerHTML = '';

    opacStatusEl.innerHTML = `
        <div class="opac-status-empty" style="color: #f59e0b;">
            <span class="material-symbols-outlined" style="vertical-align: middle;">speed</span>
            <span>Бережный режим каталога (Rate Limit)</span>
        </div>
    `;

    opacGridEl.innerHTML = `
        <div class="opac-notice-card is-warning">
            <div class="opac-notice-icon is-warning">
                <span class="material-symbols-outlined">hourglass_top</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Пауза для защиты каталога OPAC</h3>
                <p class="opac-notice-desc">${escapeHtml(message)}</p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">Сервер бережёт базу данных библиотек. Повторите запрос через 3-5 секунд.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовка состояния Circuit Breaker
 */
function renderCircuitBreakerState(message) {
    if (!opacGridEl || !opacStatusEl) return;
    if (opacPaginationEl) opacPaginationEl.innerHTML = '';

    opacStatusEl.innerHTML = `
        <div class="opac-status-empty" style="color: #ef4444;">
            <span class="material-symbols-outlined" style="vertical-align: middle;">cloud_sync</span>
            <span>Восстановление связи с ЦГБ</span>
        </div>
    `;

    opacGridEl.innerHTML = `
        <div class="opac-notice-card is-warning">
            <div class="opac-notice-icon is-warning">
                <span class="material-symbols-outlined">network_check</span>
            </div>
            <div class="opac-notice-content">
                <h3 class="opac-notice-title">Автоматическая стабилизация шлюза</h3>
                <p class="opac-notice-desc">${escapeHtml(message)}</p>
                <div class="opac-notice-meta">
                    <span class="opac-tip-badge">Шлюз OPAC-Global восстанавливает соединение. Подождите несколько секунд.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовка блока пагинации страниц
 */
function renderPaginationHtml(currentPage, totalPages, totalFound) {
    if (totalPages <= 1) return '';

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    let html = `
        <nav class="opac-pagination" aria-label="Пагинация результатов каталога">
            <div class="opac-pagination-info">
                Страница <strong>${currentPage}</strong> из <strong>${totalPages}</strong>
                <span class="opac-pagination-total">(${totalFound.toLocaleString('ru-RU')} изданий)</span>
            </div>
            <div class="opac-pagination-controls">
                <button type="button" class="opac-page-btn opac-page-prev" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Предыдущая страница">
                    <span class="material-symbols-outlined">chevron_left</span>
                    <span class="btn-text">Назад</span>
                </button>
                <div class="opac-pages-list">
    `;

    if (startPage > 1) {
        html += `<button type="button" class="opac-page-num" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="opac-page-ellipsis">…</span>`;
        }
    }

    for (let p = startPage; p <= endPage; p++) {
        const isActive = p === currentPage;
        html += `
            <button type="button" class="opac-page-num ${isActive ? 'is-active' : ''}" data-page="${p}" ${isActive ? 'aria-current="page"' : ''}>
                ${p}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="opac-page-ellipsis">…</span>`;
        }
        html += `<button type="button" class="opac-page-num" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `
                </div>
                <button type="button" class="opac-page-btn opac-page-next" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Следующая страница">
                    <span class="btn-text">Вперёд</span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </nav>
    `;
    return html;
}

/**
 * Привязка кликов к кнопкам пагинации
 */
function bindPaginationEvents(container, query) {
    if (!container) return;
    const pageBtns = container.querySelectorAll('[data-page]');
    pageBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetPage = parseInt(btn.getAttribute('data-page'), 10);
            if (!targetPage || isNaN(targetPage) || btn.disabled || btn.classList.contains('is-active')) return;

            const resultsContainer = opacModalEl ? opacModalEl.querySelector('.opac-results-container') : null;
            if (resultsContainer) {
                resultsContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            executeOpacSearch(query, targetPage);
        });
    });
}

/**
 * Проверка соответствия экземпляра или филиала выбранному фильтру филиалов
 * Поддерживает все 18 филиалов Владимира (ЦГБ, ЦДБ, Доброе/Филиал №4, ф1..ф16)
 * @param {Object} copy Экземпляр книги или агрегированный объект филиала
 * @param {string} filter Код филиала ('all', 'cgb', 'cdb', 'f4', 'dobroye', 'f1'..'f16')
 * @returns {boolean}
 */
function matchesBranchFilter(copy, filter) {
    if (!copy || !filter || filter === 'all') return true;
    const item = copy.rawCopy || copy;
    const filterKey = String(filter).trim().toLowerCase();
    if (!filterKey || filterKey === 'all') return true;

    const sub = String(item.subfield_b || '').trim().toLowerCase();
    const code = String(item.branch_code || '').trim().toLowerCase();
    const name = String(item.branch_name || '').trim().toLowerCase();
    const loc = String(item.permanent_location || item.location || '').trim().toLowerCase();
    const addr = String(item.branch_address || '').trim().toLowerCase();

    // 1. ЦГБ (Центральная городская библиотека, Суздальский пр., 2)
    if (filterKey === 'cgb' || filterKey === 'цгб') {
        if (sub === 'до') return false; // Сигла ДО — это ЦДБ, а не ЦГБ!
        return code.includes('цгб') ||
               ['аб', 'чз', 'кх'].includes(sub) ||
               name.includes('цгб') ||
               name.includes('суздальский') ||
               loc.includes('цгб') ||
               addr.includes('суздальск');
    }

    // 2. ЦДБ (Центральная детская библиотека, Большая Московская, 31)
    if (filterKey === 'cdb' || filterKey === 'цдб') {
        return item.is_center === true ||
               sub === 'цдб' ||
               sub === 'до' ||
               code.includes('цдб') ||
               name.includes('цдб') ||
               name.includes('детская') ||
               loc.includes('цдб') ||
               loc.includes('цгб-до') ||
               addr.includes('большая московская');
    }

    // 3. Филиал №4 / Доброе (ул. Егорова, 10)
    if (filterKey === 'dobroye' || filterKey === 'доброе' || filterKey === 'f4' || filterKey === 'ф4') {
        return item.is_dobroye === true ||
               sub === 'ф4' ||
               code.includes('№4') ||
               code.includes('филиал 4') ||
               name.includes('доброе') ||
               name.includes('филиал №4') ||
               name.includes('филиал 4') ||
               loc.includes('ф4') ||
               addr.includes('егорова');
    }

    // 4. Филиалы по номеру: f1..f16, ф1..ф16
    const fMatch = filterKey.match(/^[fф]-?(\d+)$/i);
    if (fMatch) {
        const num = parseInt(fMatch[1], 10);
        const sigla = 'ф' + num;
        const filialNum = '№' + num;
        const filialStr = 'филиал ' + num;
        const filialNoStr = 'филиал №' + num;

        if (sub === sigla || sub.startsWith(sigla + ' ') || sub.endsWith(' ' + sigla)) {
            return true;
        }
        if (code === filialNoStr || code.includes(filialNum) || code.includes(filialStr)) {
            return true;
        }
        if (name.includes(filialNum) || name.includes(filialStr)) {
            return true;
        }
        if (loc.includes(sigla) || loc.includes(filialNum)) {
            return true;
        }
        return false;
    }

    return sub.includes(filterKey) ||
           code.includes(filterKey) ||
           name.includes(filterKey) ||
           loc.includes(filterKey) ||
           addr.includes(filterKey);
}

/**
 * Отрисовка результатов поиска книг с пагинацией и подробным окном сведений
 */
function renderSearchResults(data, query) {
    if (!opacGridEl || !opacStatusEl) return;

    if (!data || !data.ok) {
        renderErrorState((data && data.error) ? data.error : 'Не удалось получить ответ от сервера каталога.');
        return;
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
        if (opacPaginationEl) opacPaginationEl.innerHTML = '';
        opacStatusEl.innerHTML = `
            <div class="opac-status-empty">
                По запросу «<strong>${escapeHtml(query)}</strong>» ничего не найдено
            </div>
        `;
        opacGridEl.innerHTML = `
            <div class="opac-notice-card">
                <div class="opac-notice-icon">
                    <span class="material-symbols-outlined">search_off</span>
                </div>
                <div class="opac-notice-content">
                    <h3 class="opac-notice-title">Издание не найдено в фонде</h3>
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
        if (opacPaginationEl) opacPaginationEl.innerHTML = '';
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

    // Точный подсчёт общего числа найденных изданий из базы данных
    const grandTotal = parseInt(data.total_found || data.count || itemsToDisplay.length, 10);
    const currentPage = parseInt(data.page || currentOpacPage || 1, 10);
    const totalPages = parseInt(data.total_pages || (grandTotal > 0 ? Math.ceil(grandTotal / CARDS_PER_PAGE) : 1), 10);

    // Определение инвентарного поиска
    const invMatch = query ? query.match(/^(?:\/инв(?:\.|\b)|\/inv\b|инв(?:\.|\b|\s*№)|инвентар(?:ный)?(?:\s*номер)?\s*(?:№)?|IN)\s*([0-9A-Za-zА-Яа-я/-]+)/i) : null;
    const targetInventory = invMatch ? invMatch[1].trim() : (/^\d{4,10}$/.test(query?.trim() || '') ? query.trim() : null);
    const isInvQuery = Boolean(targetInventory);

    const statusText = isInvQuery
        ? `Найдено по инвентарному номеру <strong>№${escapeHtml(targetInventory)}</strong>: <strong>${grandTotal.toLocaleString('ru-RU')}</strong> ${grandTotal === 1 ? 'издание' : (grandTotal < 5 && grandTotal > 0 ? 'издания' : 'изданий')} (страница ${currentPage} из ${totalPages})`
        : `Найдено изданий: <strong>${grandTotal.toLocaleString('ru-RU')}</strong> по запросу «${escapeHtml(query)}» (страница ${currentPage} из ${totalPages})`;

    opacStatusEl.innerHTML = `
        <div class="opac-status-summary">
            <span>${statusText}</span>
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

        // Очистка сиглы от BBCode [color=...] и HTML
        const cleanLocations = locations.map(loc => {
            return String(loc).replace(/\[\/?color[^\]]*\]/gi, '').replace(/<[^>]+>/g, '').trim();
        }).filter(Boolean);

        // Инвентарный номер издания с надежным fallback на массив копий
        let itemInv = item.inventory || null;
        if (!itemInv && Array.isArray(copies) && copies.length > 0) {
            const foundCopyInv = copies.map(c => c.inventory || c.code1).filter(Boolean)[0];
            if (foundCopyInv) itemInv = foundCopyInv;
        }
        if (!itemInv && targetInventory) {
            itemInv = targetInventory;
        }

        // Карточка книги (по 4 на страницу)
        cardsHtml += `
            <article class="opac-book-card" data-card-index="${index}" data-idbr="${escapeHtml(idbr)}">
                <!-- 3D-обложка книги с каскадом и строгим соответствием -->
                <div class="opac-book-cover genre-${genre}" data-genre="${genre}" data-title="${escapeHtml(title)}" data-author="${escapeHtml(author)}" data-isbn="${escapeHtml(item.isbn || '')}" tabindex="0" role="button" aria-label="Обложка книги ${escapeHtml(title)}, нажмите для просмотра сведений и наличия" title="Нажмите для просмотра издания и наличия по филиалам">
                    <div class="opac-book-pages-edge" aria-hidden="true"></div>
                    <div class="opac-book-spine-fold" aria-hidden="true"></div>
                    <img class="opac-book-cover-img" alt="${escapeHtml(title)}" loading="lazy" style="display: none; opacity: 0;" />
                    <span class="opac-cover-source-badge" style="display: none;"></span>
                    <div class="opac-cover-fallback">
                        <div class="opac-fallback-border">
                            <span class="opac-fallback-no-cover-badge">НЕТ ОБЛОЖКИ !</span>
                            <img class="opac-fallback-cosmo-img" src="${OPAC_CFG.noCoverImgUrl}" alt="Космо удивлен" loading="lazy" />
                            <span class="opac-cover-title-preview">${escapeHtml(title)}</span>
                            ${year ? `<span class="opac-cover-year">${escapeHtml(year)}</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Содержимое карточки -->
                <div class="opac-book-content">
                    <div class="opac-book-header">
                        <h4 class="opac-book-title" role="button" tabindex="0" title="Нажмите для подробных сведений об издании и наличии">${escapeHtml(title)}</h4>
                        ${author ? `<div class="opac-book-author">✍️ ${escapeHtml(author)}</div>` : ''}
                        ${imprint ? `<div class="opac-book-imprint">${escapeHtml(imprint)}</div>` : ''}
                    </div>

                    <!-- Мета-бейджи: ББК, OPAC ID, Сигла, Инвентарный номер -->
                    <div class="opac-book-badges">
                        ${shelfmark ? `<span class="opac-badge-bbk" title="Шифр классификации ББК">🔖 ${escapeHtml(shelfmark)}</span>` : ''}
                        ${idbr ? `<span class="opac-badge-idbr" title="Системный ID записи в БД 62 OPAC-Global">🆔 ${escapeHtml(idbr)}</span>` : ''}
                        ${itemInv ? `<span class="opac-badge-inv ${targetInventory && itemInv.toLowerCase() === targetInventory.toLowerCase() ? 'is-target-inventory' : ''}" title="Инвентарный номер издания">🏷️ Инв. №${escapeHtml(itemInv)}</span>` : ''}
                        ${cleanLocations.length > 0 ? `<span class="opac-badge-sigla" title="Сигла подразделений хранения">📦 ${escapeHtml(cleanLocations.join(', '))}</span>` : ''}
                    </div>

                    <!-- Блок экземпляров и филиалов (Какой филиал, адрес, телефон, наличие, инвентарь) -->
                    <div class="opac-copies-section">
                        <div class="opac-copies-header">
                            <span class="material-symbols-outlined icon">account_balance</span>
                            <strong>Экземпляры в библиотеках (${copies.length}):</strong>
                        </div>
                        <div class="opac-copies-list">
                            ${renderCopiesListHtml(copies, currentBranchFilter, targetInventory, itemInv)}
                        </div>
                    </div>

                    <!-- Кнопки действий в стиле Аврора -->
                    <div class="opac-book-actions">
                        <button type="button" class="opac-ask-cosmo-btn" data-ask-title="${escapeHtml(title)}" data-ask-author="${escapeHtml(author)}" title="Спросить рецензию и сюжет у робота Космо">
                            <span class="material-symbols-outlined icon">smart_toy</span>
                            <span class="btn-text">Спросить у Космо</span>
                        </button>
                        <a href="${OPAC_CFG.directUrl}" target="_blank" rel="noopener noreferrer" class="opac-direct-link-btn" title="Проверить в каталоге ЦГБ">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span class="btn-text">OPAC-Global</span>
                        </a>
                    </div>
                </div>
            </article>
        `;
    });

    opacGridEl.innerHTML = cardsHtml;

    // Отрисовка интерактивной пагинации
    if (opacPaginationEl) {
        opacPaginationEl.innerHTML = renderPaginationHtml(currentPage, totalPages, grandTotal);
        bindPaginationEvents(opacPaginationEl, query);
    }

    // Запуск прямой загрузки 4 обложек текущей страницы
    loadBookCovers(opacGridEl);

    // Привязка кликов по обложке и названию книги для подробного модального окна с филиалами
    const cards = opacGridEl.querySelectorAll('.opac-book-card');
    cards.forEach(cardEl => {
        const idx = parseInt(cardEl.getAttribute('data-card-index'), 10);
        const item = itemsToDisplay[idx];
        if (!item) return;

        const openCardDetail = () => {
            const coverEl = cardEl.querySelector('.opac-book-cover');
            const realImg = coverEl ? coverEl.querySelector('.opac-book-cover-img') : null;
            const coverUrl = coverEl?.getAttribute('data-cover-url') || (realImg && realImg.style.display !== 'none' ? realImg.src : null);
            const source = coverEl?.getAttribute('data-cover-source') || '';
            const copies = item.copies || [];
            let itemInv = item.inventory || null;
            if (!itemInv && Array.isArray(copies) && copies.length > 0) {
                const foundCopyInv = copies.map(c => c.inventory || c.code1).filter(Boolean)[0];
                if (foundCopyInv) itemInv = foundCopyInv;
            }
            if (!itemInv && targetInventory) itemInv = targetInventory;

            openCoverZoomModal({
                coverUrl,
                title: item.title || '',
                author: item.author || '',
                source,
                year: item.year ? `${item.year} г.` : '',
                shelfmark: item.shelfmark && item.shelfmark !== 'Не задан' ? item.shelfmark : '',
                idbr: item.id || '',
                inventory: itemInv,
                targetInventory,
                imprint: item.imprint || '',
                locations: item.locations || [],
                copies: item.copies || [],
                genre: detectBookGenre(item)
            });
        };

        const coverEl = cardEl.querySelector('.opac-book-cover');
        if (coverEl) {
            coverEl.addEventListener('click', openCardDetail);
            coverEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCardDetail();
                }
            });
        }

        const titleEl = cardEl.querySelector('.opac-book-title');
        if (titleEl) {
            titleEl.addEventListener('click', openCardDetail);
            titleEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCardDetail();
                }
            });
        }
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
function renderCopiesListHtml(copies, activeFilter = 'all', targetInventory = null, fallbackInventory = null) {
    if (!copies || copies.length === 0) {
        return `<div class="opac-no-copies">ℹ️ Детальные сведения об экземплярах уточняются в ЦГБ.</div>`;
    }

    const cleanTargetInv = targetInventory ? String(targetInventory).trim().toLowerCase() : null;

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
                has_target_inv: false,
                rawCopy: c
            });
        }
        const b = branchMap.get(key);
        b.total_count++;
        if (c.is_available) {
            b.available_count++;
        }
        const cInv = c.inventory || c.code1 || (copies.length === 1 && fallbackInventory ? fallbackInventory : '');
        if (cInv) {
            if (!b.inventories.includes(cInv)) {
                b.inventories.push(cInv);
            }
            if (cleanTargetInv && String(cInv).trim().toLowerCase() === cleanTargetInv) {
                b.has_target_inv = true;
            }
        }
    });

    if (fallbackInventory && branchMap.size === 1) {
        const onlyBranch = branchMap.values().next().value;
        if (onlyBranch && onlyBranch.inventories.length === 0) {
            onlyBranch.inventories.push(fallbackInventory);
        }
    }

    const branchList = Array.from(branchMap.values());

    // Сортировка: сначала филиал с целевым инвентарным номером, затем целевой филиал фильтра, затем наличие, затем общее количество
    branchList.sort((a, b) => {
        if (a.has_target_inv !== b.has_target_inv) {
            return a.has_target_inv ? -1 : 1;
        }
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

        let invStr = '';
        const invList = b.inventories.length > 0 ? b.inventories : (fallbackInventory ? [fallbackInventory] : []);
        if (invList.length > 0) {
            const formattedInvs = invList.slice(0, 3).map(inv => {
                const isTarget = cleanTargetInv && String(inv).trim().toLowerCase() === cleanTargetInv;
                return isTarget ? `<strong class="opac-inv-highlight">№${escapeHtml(inv)}</strong>` : `№${escapeHtml(inv)}`;
            });
            invStr = `Инв. ${formattedInvs.join(', ')}${invList.length > 3 ? '...' : ''}`;
        }

        // Формирование бейджа доступности: «🟢 На полке (N экз.)»
        let badgeText = '';
        let badgeClass = '';
        // Метки наличия убраны по запросу администратора
        // Наличие уточняется по телефону филиала

        const itemClass = [
            'opac-copy-item',
            b.has_target_inv ? 'is-target-inventory' : '',
            isTargetBranch ? 'is-target-branch' : '',
            isBranch4 ? 'is-f4' : '',
            isAvailable ? 'has-availability' : 'no-availability'
        ].filter(Boolean).join(' ');

        return `
            <div class="${itemClass}">
                <div class="opac-copy-top">
                    <span class="opac-copy-name">
                        ${b.has_target_inv ? '🎯 <strong>' + escapeHtml(bName) + '</strong>' : (isTargetBranch ? '🎯 <strong>' + escapeHtml(bName) + '</strong>' : (isBranch4 ? '🌟 <strong>[Доброе] ' + escapeHtml(bName) + '</strong>' : escapeHtml(bName)))}
                    </span>
                </div>
                <div class="opac-copy-details">
                    ${bAddress ? `<span class="opac-copy-addr">📍 ${escapeHtml(bAddress)}</span>` : ''}
                    ${bPhone ? `<span class="opac-copy-phone">• 📞 <a href="tel:${escapeHtml(bPhone.replace(/[^\d+]/g, ''))}">${escapeHtml(bPhone)}</a></span>` : ''}
                    ${invStr ? `<span class="opac-copy-inv">• 🔖 [${invStr}]</span>` : ''}
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

    if (window.__cosmoChatModal && typeof window.__cosmoChatModal.open === 'function') {
        window.__cosmoChatModal.open(prompt);
    } else if (window.__cosmoChatModal && typeof window.__cosmoChatModal.openWithMessage === 'function') {
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
function openOpacModal(initialQuery = '') {
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
function closeOpacModal() {
    if (!opacModalEl) return;

    opacModalEl.classList.remove('is-open');
    opacModalEl.classList.add('hidden');
    document.body.classList.remove('opac-modal-open');

    if (currentSearchAbortCtrl) {
        currentSearchAbortCtrl.abort();
    }
}

// Экспорт в глобальную область видимости для шорткатов и вызовов из любой темы
if (typeof window !== 'undefined') {
    window.openOpacModal = openOpacModal;
    window.closeOpacModal = closeOpacModal;
    window.__openOpacModal = openOpacModal;
    window.OpacCatalog = {
        init: initOpacModal,
        open: openOpacModal,
        close: closeOpacModal
    };
}

/**
 * Делегированные триггеры открытия каталога:
 *  - элементы с классом .opac-open-trigger (шорткод [opac_catalog], плавающая кнопка)
 *  - ссылки меню вида <a href="#opac-catalog"> (произвольная ссылка в меню WordPress)
 */
function bindOpacGlobalTriggers() {
    if (window.__opacTriggersBound) return;
    window.__opacTriggersBound = true;

    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('.opac-open-trigger, a[href="#opac-catalog"]');
        if (!trigger) return;
        e.preventDefault();
        e.stopPropagation();
        openOpacModal();
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initOpacModal();
            bindOpacGlobalTriggers();
        });
    } else {
        initOpacModal();
        bindOpacGlobalTriggers();
    }
}
})();
