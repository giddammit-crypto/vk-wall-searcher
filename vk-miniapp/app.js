/* ==========================================================================
   VK Mini App «АВРОРА • Космо» — приложение (VK Bridge + API АВРОРЫ)
   Версия: 1.3.0
   ========================================================================== */
(() => {
'use strict';

// Диагностика: сбор ошибок рантайма для аудита
window.__appErrs = [];
window.addEventListener('error', (e) => window.__appErrs.push(e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => window.__appErrs.push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Хост API: на сервере biblioteka33.ru веб-приложение развёрнуто в подпапке /stat/
const getBaseUrl = () => {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return location.pathname.startsWith('/stat') ? '/stat' : '';
    }
    if (location.hostname === 'biblioteka33.ru') {
        return '/stat';
    }
    return 'https://biblioteka33.ru/stat';
};
const BASE = getBaseUrl();
const MASCOT_BASE = 'https://biblioteka33.ru/stat/assets/images/mascot';

const API = {
    base: BASE,
    opac: BASE + '/api/opac.php',
    chat: BASE + '/api/ai-proxy.php',
    ino: BASE + '/api/inoagent.php',
    miniapp: BASE + '/api/miniapp.php',
    vkproxy: BASE + '/api/vk-proxy.php',
    tts: BASE + '/api/tts-proxy.php',
    mascot: MASCOT_BASE,
};

const EMOJI = ['waving', 'idle', 'smile', 'wink', 'love', 'laugh', 'cool', 'party', 'idea', 'thinking', 'shock', 'sad', 'tired', 'sleep', 'yawn', 'angry', 'read'];

let vkUser = null;
let bridgeReady = false;
let currentBookOfDay = null;
let currentSearchItems = [];
let opacItemsMap = {};

/* ── Вспомогательные функции VK Bridge ── */
function withTimeout(promise, ms = 3500) {
    return Promise.race([
        promise,
        new Promise(res => setTimeout(() => res(null), ms)),
    ]);
}

async function bridge(method, params = {}) {
    if (!window.vkBridge) return null;
    try {
        return await withTimeout(window.vkBridge.send(method, params), 4000);
    } catch (e) {
        return null;
    }
}

/* ── Тактильный отклик (Taptic Engine) ── */
function haptic(type = 'light') {
    if (!bridgeReady || !window.vkBridge) return;
    try {
        if (type === 'light' || type === 'medium' || type === 'heavy') {
            window.vkBridge.send('VKWebAppTapticImpactOccurred', { style: type }).catch(() => {});
        } else if (type === 'selection') {
            window.vkBridge.send('VKWebAppTapticSelectionChanged', {}).catch(() => {});
        } else if (type === 'success' || type === 'warning' || type === 'error') {
            window.vkBridge.send('VKWebAppTapticNotificationOccurred', { result: type }).catch(() => {});
        }
    } catch (e) {}
}

/* ── Копирование в буфер обмена ── */
async function copyText(text) {
    if (!text) return false;
    try {
        if (bridgeReady && window.vkBridge) {
            await window.vkBridge.send('VKWebAppCopyText', { text });
            return true;
        }
    } catch (e) {}
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) {}
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    } catch (e) {
        return false;
    }
}

/* ── Управление высотой окна VK Mini App на десктопе ── */
let currentDesktopHeight = 0;

function isDesktopWebPlatform() {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('vk_platform') === 'desktop_web';
    } catch (e) {
        return false;
    }
}

const DESKTOP_SCREEN_HEIGHTS = {
    home: 860,
    catalog: 960,
    chat: 860,
    more: 860,
};

async function setDesktopWindowHeight(targetHeight) {
    if (!bridgeReady || !window.vkBridge || !isDesktopWebPlatform()) return;
    const clamped = Math.min(Math.max(Math.round(targetHeight || 860), 650), 1200);
    if (clamped === currentDesktopHeight) return;
    currentDesktopHeight = clamped;
    try {
        await window.vkBridge.send('VKWebAppResizeWindow', {
            width: 800,
            height: clamped,
        });
    } catch (e) {}
}

function syncWindowSize(targetOrScreen = null) {
    if (!isDesktopWebPlatform()) return;
    if (typeof targetOrScreen === 'number') {
        setDesktopWindowHeight(targetOrScreen);
        return;
    }
    const sheetOpen = !$('#book-sheet-backdrop')?.classList.contains('hidden');
    if (sheetOpen) {
        setDesktopWindowHeight(980);
        return;
    }
    const screen = (typeof targetOrScreen === 'string' && targetOrScreen)
        ? targetOrScreen
        : ($('.screen.is-active')?.dataset.screen || 'home');
    const h = DESKTOP_SCREEN_HEIGHTS[screen] || 860;
    setDesktopWindowHeight(h);
}

function initWindowResizeManager() {
    if (!isDesktopWebPlatform()) return;
    syncWindowSize('home');
}

function storageGet(key, fallback) {
    try {
        const v = localStorage.getItem('aurora_miniapp_' + key);
        return v ? JSON.parse(v) : fallback;
    } catch (e) {
        return fallback;
    }
}

function storageSet(key, value) {
    try { localStorage.setItem('aurora_miniapp_' + key, JSON.stringify(value)); } catch (e) {}
    bridge('VKWebAppStorageSet', { key: 'aurora_miniapp_' + key, value: JSON.stringify(value) });
}

function toast(text) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ── Мобильная телефония и телефонные вызовы ── */
function isMobileDevice() {
    try {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('vk_platform') || '';
        if (p.startsWith('mobile_')) return true;
    } catch (e) {}
    return /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent || '');
}

function formatTelNumber(rawPhone) {
    if (!rawPhone) return '';
    // Извлекаем первый номер, если указано несколько через запятую, слэш или "или"
    const first = String(rawPhone).split(/[,;/]|\bили\b/i)[0].trim();
    const digits = first.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
        return '+7' + digits.slice(1);
    }
    if (digits.length === 10) {
        return '+7' + digits;
    }
    if (digits.length === 6) {
        // Городской 6-значный номер г. Владимира (код 4922)
        return '+74922' + digits;
    }
    return '+' + digits;
}

function formatPrettyPhone(rawPhone) {
    const tel = formatTelNumber(rawPhone);
    if (!tel || tel.length !== 12) return rawPhone || '';
    return `${tel.slice(0, 2)} (${tel.slice(2, 6)}) ${tel.slice(6, 8)}-${tel.slice(8, 10)}-${tel.slice(10, 12)}`;
}

function initiatePhoneCall(rawPhone, branchName = '') {
    const tel = formatTelNumber(rawPhone);
    if (!tel) {
        toast('Номер телефона филиала не указан ℹ️');
        return;
    }

    const telUrl = 'tel:' + tel;
    const pretty = formatPrettyPhone(rawPhone) || tel;
    haptic('medium');

    // 1. VK Bridge VKWebAppOpenUrl (на мобильных клиентах VK iOS / Android)
    if (window.vkBridge && typeof vkBridge.send === 'function') {
        vkBridge.send('VKWebAppOpenUrl', { url: telUrl }).catch(() => {});
    }

    // 2. Прямой вызов системного диалера телефона для мобильных устройств
    try {
        if (window.top && window.top !== window) {
            window.top.location.href = telUrl;
        } else {
            window.location.href = telUrl;
        }
    } catch (e) {
        try {
            window.location.href = telUrl;
        } catch (e2) {}
    }

    // 3. Информирование пользователя
    if (isMobileDevice()) {
        toast(`Звоним: ${pretty} 📞`);
    } else {
        // На десктопе дополнительно копируем номер в буфер обмена для удобства
        copyText(tel);
        toast(`Набираем ${pretty} (номер скопирован 📋)`);
    }
}

/* ── Навигация экранов с поддержкой истории и кнопки «Назад» ── */
function goto(screenName, pushHistory = true) {
    if (pushHistory && history.state?.screen !== screenName) {
        try {
            history.pushState({ screen: screenName }, '', '#' + screenName);
        } catch (e) {}
    }
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === screenName));
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.goto === screenName));
    window.scrollTo({ top: 0, behavior: 'instant' });
    haptic('selection');
    syncWindowSize();

    if (screenName === 'news' && !newsState.loaded && !newsState.loading) {
        loadBranchNews();
    }
}

$$('[data-goto]').forEach(el => el.addEventListener('click', () => goto(el.dataset.goto)));
$$('[data-scroll]').forEach(el => el.addEventListener('click', () => {
    goto('home');
    setTimeout(() => document.getElementById(el.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
}));

window.addEventListener('popstate', (e) => {
    // Если открыт полноэкранный просмотр фото — закрываем его
    if (!$('#photo-lightbox')?.classList.contains('hidden')) {
        closePhotoLightbox(false);
        return;
    }
    // Если открыта шторка книги — закрываем её
    if (!$('#book-sheet-backdrop')?.classList.contains('hidden')) {
        closeBookSheet(false);
        return;
    }
    // Если открыта панель стикеров — закрываем её
    if ($('#stickers-sheet')?.classList.contains('is-open')) {
        toggleStickers(false);
        return;
    }
    const screen = e.state?.screen || (location.hash ? location.hash.replace('#', '') : 'home');
    if (['home', 'news', 'catalog', 'chat', 'more'].includes(screen)) {
        goto(screen, false);
    }
});

/* ── Главный экран: Космо + Книга дня ── */
async function initHome() {
    try {
        const r = await fetch(`${API.miniapp}?action=book_of_day`);
        const d = await r.json();
        if (!d.ok || !d.book) throw new Error('no data');
        const b = d.book;
        currentBookOfDay = b;
        $('#quote-skeleton')?.classList.add('hidden');
        const body = $('#quote-body');
        if (body) {
            body.classList.remove('hidden');
            body.innerHTML = `
                <img class="quote-cosmo" src="${API.mascot}/robot_read.png?v=4.64.2" alt="">
                <div>
                    <div class="overline overline-gold" style="margin-bottom:4px">${esc(b.date_str || 'Книга дня')}</div>
                    <div class="quote-title">${esc(b.title)}</div>
                    <div class="quote-meta">${esc(b.author || '')}${b.genre ? ' • ' + esc(b.genre) : ''}</div>
                    <div class="quote-text">«${esc(b.hook || b.quote || '')}»</div>
                </div>`;
        }
        $('#quote-actions')?.classList.remove('hidden');

        $('#hero-cosmo').src = `${API.mascot}/robot_read.png?v=4.64.2`;
        setTimeout(() => { $('#hero-cosmo').src = `${API.mascot}/robot_idle.png?v=4.64.2`; }, 3200);
    } catch (e) {
        $('#quote-skeleton')?.classList.add('hidden');
        if ($('#quote-body')) {
            $('#quote-body').classList.remove('hidden');
            $('#quote-body').innerHTML = '<div class="quote-title">Книга дня сегодня отдыхает 🙈</div>';
        }
    }

    // Часовая интонация: поздно вечером и ночью Космо зевает
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
        $('#hero-cosmo').src = `${API.mascot}/robot_yawn.png?v=4.64.2`;
    }

    // Интерактивные кнопки карточки книги дня
    $('#quote-find-btn')?.addEventListener('click', () => {
        if (!currentBookOfDay) return;
        haptic('medium');
        goto('catalog');
        const q = currentBookOfDay.title.replace(/[«»"]/g, '').trim();
        $('#opac-query').value = q;
        opacState.query = q;
        $('#opac-clear')?.classList.remove('hidden');
        opacState.page = 1;
        runSearch();
    });

    $('#quote-ask-btn')?.addEventListener('click', () => {
        if (!currentBookOfDay) return;
        haptic('light');
        goto('chat');
        sendChat(`Расскажи о книге «${currentBookOfDay.title}» автора ${currentBookOfDay.author || ''}: почему она интересна читателям?`);
    });

    $('#quote-share-btn')?.addEventListener('click', async () => {
        if (!currentBookOfDay) return;
        haptic('light');
        const text = `«${currentBookOfDay.hook || currentBookOfDay.quote || ''}»\n\nРекомендация робота Космо: ${currentBookOfDay.title} — ${currentBookOfDay.author || ''}\nКнигу можно взять в библиотеках Владимира (ЦБС)!`;
        try {
            if (bridgeReady && window.vkBridge) {
                await window.vkBridge.send('VKWebAppShowWallPostBox', { message: text });
                toast('Запись опубликована на стене ✅');
                haptic('success');
                return;
            }
        } catch (e) {}
        copyText(text);
        toast('Цитата и рекомендация скопированы 📋');
    });

    $('#quote-tts-btn')?.addEventListener('click', () => {
        if (!currentBookOfDay) return;
        const text = `Книга дня от Космо: ${currentBookOfDay.title}. Автор: ${currentBookOfDay.author || 'не указан'}. ${currentBookOfDay.hook || currentBookOfDay.quote || ''}`;
        playTts(text, $('#quote-tts-btn'));
    });

    loadHomeNewsPreview();
}

/* ── Каталог OPAC ── */
const opacState = { query: '', page: 1, branch: '', onlyAvailable: false, totalPages: 1 };
let searchSeq = 0;

const BRANCH_CHIPS = [
    { v: '', label: 'Все' },
    { v: 'цгб', label: 'ЦГБ' },
    { v: 'цдб', label: 'ЦДБ' },
    { v: 'доброе', label: 'Доброе' },
    { v: 'ф4', label: 'Ф-4' },
    { v: 'ф1', label: 'Ф-1' },
    { v: 'ф10', label: 'Ф-10' },
    { v: 'ф13', label: 'Ф-13' },
];

function buildBranchChips() {
    const box = $('#branch-chips');
    if (!box) return;
    box.innerHTML = BRANCH_CHIPS.map((c, i) =>
        `<button class="chip${i === 0 ? ' is-active' : ''}" data-branch="${c.v}">${esc(c.label)}</button>`).join('');
    box.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        haptic('selection');
        $$('#branch-chips .chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        opacState.branch = chip.dataset.branch;
        opacState.page = 1;
        runSearch();
    });
}

function selectBranchChip(branchVal) {
    const chip = $(`#branch-chips .chip[data-branch="${branchVal}"]`);
    if (chip) {
        $$('#branch-chips .chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        opacState.branch = branchVal;
    }
}

function skeletons(count = 4) {
    $('#catalog-results').innerHTML = Array.from({ length: count }, () => `
        <div class="book-card">
            <div class="sk" style="width:72px;height:108px;flex-shrink:0;margin:0"></div>
            <div style="flex:1">
                <div class="sk sk-line" style="width:85%"></div>
                <div class="sk sk-line" style="width:55%"></div>
                <div class="sk sk-line" style="width:70%"></div>
            </div>
        </div>`).join('');
}

function emptyState(kind, customText = null) {
    const map = {
        empty: ['robot_sad', 'Космо ничего не нашёл', 'Попробуй изменить запрос или фильтры — в фондах АВРОРЫ ещё тысячи книг.', 'Сбросить фильтры'],
        error: ['robot_shock', 'Связь с каталогом потеряна', 'OPAC не ответил вовремя. Попробуй ещё раз через минуту.', 'Повторить'],
        limited: ['robot_sleep', 'Каталог отдыхает 60 секунд', 'Слишком много запросов подряд — дай OPAC передышку, потом жми «Повторить».', 'Повторить'],
    };
    const [img, title, text, btn] = map[kind] || map.empty;
    $('#catalog-results').innerHTML = `
        <div class="empty-state">
            <img src="${API.mascot}/${img}.png?v=4.64.2" alt="">
            <div class="empty-title">${title}</div>
            <div class="empty-text">${customText ? esc(customText) : text}</div>
            <button class="btn-cta" id="empty-retry">${btn}</button>
        </div>`;
    $('#empty-retry')?.addEventListener('click', () => {
        haptic('medium');
        opacState.page = 1;
        runSearch();
    });
}

function rateLimited() { emptyState('limited'); }

/* ── Хэширование строки в индекс темы (0..7) ── */
function getBookThemeIndex(str) {
    let hash = 0;
    const s = String(str || 'aurora');
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 8;
}

/* ── 8 тем виртуальных переплётов АВРОРЫ ── */
const BOOK_THEMES = [
    { id: 0, name: 'indigo',   bg1: '#1c1e4e', bg2: '#0c0e27', accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)', foil: '#a5f3fc' },
    { id: 1, name: 'emerald',  bg1: '#0c3629', bg2: '#051912', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.35)', foil: '#6ee7b7' },
    { id: 2, name: 'purple',   bg1: '#35124c', bg2: '#180625', accent: '#c084fc', glow: 'rgba(192, 132, 252, 0.35)', foil: '#e9d5ff' },
    { id: 3, name: 'ruby',     bg1: '#460e22', bg2: '#20040f', accent: '#fb7185', glow: 'rgba(251, 113, 133, 0.35)', foil: '#fecdd3' },
    { id: 4, name: 'amber',    bg1: '#3c2406', bg2: '#1c1102', accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.35)', foil: '#fde68a' },
    { id: 5, name: 'sapphire', bg1: '#0b2545', bg2: '#041121', accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)', foil: '#bae6fd' },
    { id: 6, name: 'rose',     bg1: '#3a0f30', bg2: '#1a0415', accent: '#f472b6', glow: 'rgba(244, 114, 182, 0.35)', foil: '#fbcfe8' },
    { id: 7, name: 'teal',     bg1: '#0a343b', bg2: '#03181c', accent: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.35)', foil: '#99f6e4' },
];

/* ── Нормализация сырых OPAC-заглавий ── */
function normalizeBookTitle(raw) {
    if (!raw) return 'Без названия';
    let t = String(raw).trim();

    // Исправление склеек («451по Фаренгейту»)
    t = t.replace(/\b451\s*по\s*фаренгейту\b/gi, '451° по Фаренгейту');
    t = t.replace(/(\d+)\s*([а-яА-ЯёЁ])/g, '$1 $2');

    // Устранение MARC-маркеров
    t = t.replace(/\[\s*текст\s*\]/gi, '');
    t = t.replace(/\/\s*\[?[^;\]]+\]?$/g, '');

    // Замена точек с запятой между произведениями на разделитель с точкой
    t = t.replace(/\s*;\s*/g, ' • ');

    // Очистка дублирующихся подзаголовков
    const parts = t.split(/\s*:\s*/);
    if (parts.length > 1) {
        const main = parts[0].trim();
        const sub = parts.slice(1).join(': ').trim();
        const wordsMain = main.toLowerCase().split(/\s+/);
        const wordsSub = sub.toLowerCase().split(/\s+/);
        const isDuplicate = wordsSub.every(w => wordsMain.includes(w)) || sub.length < 3;
        t = isDuplicate ? main : `${main}: ${sub}`;
    }

    t = t.replace(/[\s;:/.]+$/, '').trim();
    return t || 'Без названия';
}

/* ── Генератор DOM-компонента космической заглушки ── */
function createBookStubElement(title, author, isLarge = false) {
    const themeIdx = getBookThemeIndex((title || '') + (author || ''));
    const theme = BOOK_THEMES[themeIdx];
    const cleanTitle = normalizeBookTitle(title);
    const cleanAuthor = author ? author.replace(/\b[а-яА-ЯёЁ]\.\s*/g, '').trim() : '';

    const stub = document.createElement('div');
    stub.className = `aurora-book-stub theme-${theme.name} ${isLarge ? 'is-large' : ''}`;
    stub.style.setProperty('--stub-bg1', theme.bg1);
    stub.style.setProperty('--stub-bg2', theme.bg2);
    stub.style.setProperty('--stub-accent', theme.accent);
    stub.style.setProperty('--stub-glow', theme.glow);
    stub.style.setProperty('--stub-foil', theme.foil);

    stub.innerHTML = `
        <div class="stub-spine" aria-hidden="true"></div>
        <div class="stub-border-emboss" aria-hidden="true"></div>
        <div class="stub-inner">
            <div class="stub-brand">
                <span class="stub-brand-star">✦</span>
                <span class="stub-brand-text">АВРОРА</span>
                <span class="stub-brand-star">✦</span>
            </div>
            <div class="stub-emblem" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    <circle cx="12" cy="9" r="2.5" fill="currentColor" opacity="0.3"></circle>
                    <path d="M12 5v1.5M12 11.5V13M8 9h1.5M14.5 9H16" opacity="0.6"></path>
                </svg>
            </div>
            <div class="stub-title" title="${esc(cleanTitle)}">${esc(cleanTitle)}</div>
            ${cleanAuthor ? `<div class="stub-author">${esc(cleanAuthor)}</div>` : ''}
        </div>
    `;
    return stub;
}

// Редирект на реальную обложку через серверный шлюз
function coverUrl(item) {
    const params = new URLSearchParams({
        action: 'cover',
        redirect: '1',
        title: item.title || '',
        author: item.author || '',
    });
    if (item.isbn) params.set('isbn', item.isbn);
    return `${API.opac}?${params.toString()}`;
}

/* ── Интеллектуальный парсинг и форматирование библиографического описания ── */
function parseBibliographicInfo(item) {
    const normTitle = normalizeBookTitle(item.title);
    const normAuthor = item.author ? item.author.trim() : '';
    const year = item.year || (item.imprint && (item.imprint.match(/\b(19\d\d|20\d\d)\b/) || [])[1]) || '';

    // Объём / количество страниц
    let pages = '';
    const imprintStr = item.imprint || (Array.isArray(item.shotform_raw) ? item.shotform_raw.join(' ') : '');
    const pagesMatch = imprintStr.match(/(\d+[\s,\[\]\d]*\s*(?:с|стр|с\.|c)\b)/i);
    if (pagesMatch) {
        pages = pagesMatch[1].replace(/c\b/i, 'с.').trim();
        if (!pages.endsWith('.')) pages += '.';
    }

    // Издательство и город
    let publisher = item.publisher || '';
    if (!publisher && imprintStr) {
        const pubMatch = imprintStr.match(/(?:[.-]\s*)([А-Яа-яA-Za-z\s.]+:\s*[А-Яа-яA-Za-z\s«»""—–-]+?)(?:,\s*\d{4}|\s*-\s*\d{4}|\.\s*-\s*\d{4})/);
        if (pubMatch) {
            publisher = pubMatch[1].trim();
        }
    }

    // Возрастной ценз (16+, 12+, 18+, 6+, 0+)
    let ageRating = '';
    const ageMatch = imprintStr.match(/\b(\d{1,2}\+)\b/);
    if (ageMatch) {
        ageRating = ageMatch[1];
    }

    // Тип издания (Однотомник, Многотомник, Собрание сочинений)
    let editionType = '';
    if (Array.isArray(item.shotform_raw)) {
        const rawJoined = item.shotform_raw.join(' ');
        if (/Однотомник/i.test(rawJoined)) editionType = 'Однотомник';
        else if (/Многотомник/i.test(rawJoined)) editionType = 'Многотомник';
        else if (/Собрание сочинений/i.test(rawJoined)) editionType = 'Собрание соч.';
    }

    // Номер тома / части
    let volume = '';
    const volMatch = imprintStr.match(/\b(Т\.\s*\d+|Том\s*\d+|Ч\.\s*\d+|Часть\s*\d+)\b/i);
    if (volMatch) {
        volume = volMatch[1];
    }

    // Шифр / ББК
    let shelfmark = item.shelfmark || '';
    if (!shelfmark && Array.isArray(item.copies)) {
        const found = item.copies.find(c => c.shifr && c.shifr !== 'Не задан');
        if (found) shelfmark = found.shifr;
    }
    if (!shelfmark && Array.isArray(item.shotform_raw)) {
        const rawJoined = item.shotform_raw.join(' ');
        const shMatch = rawJoined.match(/Шифр\s*([^;]+)/i);
        if (shMatch) shelfmark = shMatch[1].trim();
    }

    // Инвентарный номер
    let inventory = item.inventory || '';
    if (!inventory && Array.isArray(item.copies) && item.copies.length > 0) {
        inventory = item.copies[0].inventory || item.copies[0].code1 || '';
    }

    // Чистая библиографическая запись по ГОСТу
    let cleanCitation = '';
    if (item.outform) {
        cleanCitation = item.outform.replace(/\n+/g, ' ').trim();
    } else if (item.imprint) {
        cleanCitation = item.imprint.trim();
    } else {
        cleanCitation = `${normAuthor ? normAuthor + '. ' : ''}${normTitle}${year ? '.- ' + year : ''}`;
    }

    // Реальная аннотация (если есть)
    let annotation = item.annotation || '';
    if (!annotation && Array.isArray(item.shotform_raw)) {
        const descLines = item.shotform_raw.filter(l => 
            !l.includes('Инв.номер') && 
            !l.includes('Место хранения') && 
            !l.includes('Однотомник') && 
            !l.includes('Многотомник') &&
            l !== item.imprint
        );
        if (descLines.length > 0) {
            annotation = descLines.join(' ').trim();
        }
    }

    return {
        normTitle,
        normAuthor,
        year,
        pages,
        publisher,
        ageRating,
        editionType,
        volume,
        shelfmark,
        inventory,
        cleanCitation,
        annotation
    };
}

function renderItems(items) {
    currentSearchItems = items || [];
    opacItemsMap = {};
    const box = $('#catalog-results');
    if (!box) return;

    box.innerHTML = items.map((it, i) => {
        const idKey = it.id || ('item_' + i);
        opacItemsMap[idKey] = it;

        const normTitle = normalizeBookTitle(it.title);
        const normAuthor = it.author ? it.author.trim() : 'Автор не указан';
        const yearText = it.year ? ` • ${it.year} г.` : '';
        const shelfText = it.shelfmark ? `<span class="book-chip-shelf"><span class="material-symbols-rounded" style="font-size:11px;vertical-align:-1px">tag</span>${esc(it.shelfmark)}</span>` : '';
        const invText = it.inventory ? `<span class="book-chip-shelf"><span class="material-symbols-rounded" style="font-size:11px;vertical-align:-1px">barcode</span>№ ${esc(it.inventory)}</span>` : '';

        return `
        <article class="book-card" data-book-id="${esc(idKey)}" style="--stagger:${Math.min(i, 10)}">
            <div class="book-cover-container" data-title="${esc(it.title)}" data-author="${esc(it.author || '')}">
                <img class="book-cover" loading="lazy" src="${coverUrl(it)}" alt="${esc(normTitle)}">
            </div>
            <div class="book-info">
                <div class="book-title" title="${esc(normTitle)}">${esc(normTitle)}</div>
                <div class="book-author">${esc(normAuthor)}${esc(yearText)}</div>
                <div class="book-meta-row">
                    ${shelfText}
                    ${invText}
                </div>
            </div>
            <div class="book-card-arrow" aria-hidden="true">
                <span class="material-symbols-rounded">chevron_right</span>
            </div>
        </article>`;
    }).join('');

    // Подмена отсутствующих обложек на космические переплёты АВРОРЫ
    box.querySelectorAll('.book-cover-container').forEach(container => {
        const img = container.querySelector('img.book-cover');
        if (!img) return;
        img.addEventListener('error', () => {
            const title = container.dataset.title;
            const author = container.dataset.author;
            const stub = createBookStubElement(title, author, false);
            img.replaceWith(stub);
        }, { once: true });
    });

    // Обработка клика по карточке книги — открытие детальной шторки
    box.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            const idKey = card.dataset.bookId;
            const item = opacItemsMap[idKey];
            if (item) {
                haptic('light');
                openBookSheet(item);
            }
        });
    });

    syncWindowSize();
}

/* ── Шторка деталей книги (Bottom Sheet) ── */
function openBookSheet(item) {
    const backdrop = $('#book-sheet-backdrop');
    const content = $('#book-sheet-content');
    if (!backdrop || !content) return;

    const copies = item.copies || [];
    const byBranch = {};
    copies.forEach(c => {
        const name = c.branch_name || c.location || 'Библиотека';
        byBranch[name] = byBranch[name] || {
            address: c.branch_address || '',
            phone: c.branch_phone || '',
            location: c.location || '',
        };
    });

    // Карточки филиалов (без меток наличия и количества экземпляров)
    const branchesHtml = Object.entries(byBranch).map(([name, b]) => {
        const cleanPhone = formatTelNumber(b.phone);

        return `
        <div class="sheet-branch-card">
            <div class="sheet-branch-header">
                <span class="sheet-branch-name">${esc(name)}</span>
            </div>
            ${b.address ? `<div class="sheet-branch-addr"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">location_on</span> ${esc(b.address)}</div>` : ''}
            <div class="sheet-branch-actions">
                ${cleanPhone ? `<a class="branch-pill-btn branch-call-btn" href="tel:${cleanPhone}" target="_top" rel="noopener noreferrer" data-call-phone="${cleanPhone}" data-branch-name="${esc(name)}"><span class="material-symbols-rounded">call</span>Позвонить</a>` : ''}
                ${b.address ? `<button class="branch-card-btn" data-copy-addr="${esc(b.address)}"><span class="material-symbols-rounded">content_copy</span>Адрес</button>` : ''}
            </div>
        </div>`;
    }).join('') || '<div class="fine-print">Данные о филиалах уточняются в справочной службе ЦГБ.</div>';

    const biblio = parseBibliographicInfo(item);
    const normTitle = biblio.normTitle;
    const normAuthor = biblio.normAuthor || 'Автор не указан';

    // Карточки ключевых параметров книги (адаптивная сетка)
    const pills = [];
    if (biblio.year) {
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">calendar_today</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Год издания</span>
                <span class="biblio-metric-value">${esc(biblio.year)} г.</span>
            </div>
        </div>`);
    }
    if (biblio.pages) {
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">menu_book</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Объём</span>
                <span class="biblio-metric-value">${esc(biblio.pages)}</span>
            </div>
        </div>`);
    }
    if (biblio.publisher) {
        pills.push(`
        <div class="biblio-metric is-wide">
            <span class="biblio-metric-icon material-symbols-rounded">apartment</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Издательство</span>
                <span class="biblio-metric-value">${esc(biblio.publisher)}</span>
            </div>
        </div>`);
    }
    if (biblio.shelfmark) {
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">tag</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">ББК / Шифр</span>
                <span class="biblio-metric-value">${esc(biblio.shelfmark)}</span>
            </div>
        </div>`);
    }
    if (biblio.inventory) {
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">barcode</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Инв. номер</span>
                <span class="biblio-metric-value">№ ${esc(biblio.inventory)}</span>
            </div>
        </div>`);
    }
    if (biblio.editionType || biblio.volume) {
        const typeStr = [biblio.editionType, biblio.volume].filter(Boolean).join(' • ');
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">auto_stories</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Издание</span>
                <span class="biblio-metric-value">${esc(typeStr)}</span>
            </div>
        </div>`);
    }
    if (biblio.ageRating) {
        pills.push(`
        <div class="biblio-metric">
            <span class="biblio-metric-icon material-symbols-rounded">verified_user</span>
            <div class="biblio-metric-content">
                <span class="biblio-metric-label">Возраст</span>
                <span class="biblio-metric-value">${esc(biblio.ageRating)}</span>
            </div>
        </div>`);
    }

    content.innerHTML = `
        <div class="sheet-hero">
            <div class="sheet-cover-box" id="sheet-cover-container">
                <img src="${coverUrl(item)}" alt="${esc(normTitle)}">
            </div>
            <div class="sheet-meta-info">
                <div class="sheet-title">${esc(normTitle)}</div>
                <div class="sheet-author">${esc(normAuthor)}</div>
                ${biblio.year ? `<div class="sheet-imprint">${esc(biblio.year)} г.</div>` : ''}
                ${biblio.shelfmark ? `<div class="sheet-code">ББК/Шифр: <strong>${esc(biblio.shelfmark)}</strong></div>` : ''}
            </div>
        </div>

        <div class="sheet-actions">
            <button class="sheet-act-btn is-accent" id="sheet-btn-ask">
                <span class="material-symbols-rounded">chat_info</span>
                <span>Спросить Космо</span>
            </button>
            <button class="sheet-act-btn" id="sheet-btn-share">
                <span class="material-symbols-rounded">share</span>
                <span>Поделиться</span>
            </button>
            <button class="sheet-act-btn icon-only" id="sheet-btn-copy" aria-label="Скопировать краткую информацию" title="Скопировать краткую инфо">
                <span class="material-symbols-rounded">content_copy</span>
            </button>
        </div>

        <div class="sheet-biblio-block">
            <div class="sheet-biblio-head">
                <span class="sheet-section-title"><span class="material-symbols-rounded" style="font-size:15px;vertical-align:-2px;color:var(--aurora-cyan)">description</span> Описание издания</span>
                <button class="sheet-copy-citation-btn icon-only" id="sheet-btn-copy-citation" aria-label="Скопировать библиографическую запись" title="Скопировать библиографическую запись">
                    <span class="material-symbols-rounded">content_copy</span>
                </button>
            </div>

            ${pills.length > 0 ? `<div class="sheet-biblio-grid">${pills.join('')}</div>` : ''}

            ${biblio.cleanCitation ? `
            <div class="sheet-citation-card">
                <div class="sheet-citation-text">${esc(biblio.cleanCitation)}</div>
            </div>` : ''}

            ${biblio.annotation ? `
            <div class="sheet-annotation-box">
                <div class="sheet-annotation-label"><span class="material-symbols-rounded">format_quote</span> Аннотация</div>
                <div class="sheet-annotation-text">${esc(biblio.annotation)}</div>
            </div>` : ''}
        </div>

        <div>
            <div class="sheet-section-title"><span class="material-symbols-rounded" style="font-size:15px;vertical-align:-2px;color:var(--aurora-cyan)">domain</span> Где найти книгу в библиотеках города</div>
            <div class="sheet-branches-list">${branchesHtml}</div>
        </div>
    `;

    // Подмена отсутствующей обложки в шторке на крупный виртуальный переплёт
    const sheetImg = $('#sheet-cover-container img');
    if (sheetImg) {
        sheetImg.addEventListener('error', () => {
            const stub = createBookStubElement(item.title, item.author, true);
            sheetImg.replaceWith(stub);
        }, { once: true });
    }

    // Копирование адреса филиала
    content.querySelectorAll('[data-copy-addr]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyText(btn.dataset.copyAddr);
            toast('Адрес скопирован в буфер 📋');
            haptic('light');
        });
    });

    // Телефонные вызовы из шторки (активация звонка на смартфоне)
    content.querySelectorAll('[data-call-phone]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            initiatePhoneCall(btn.dataset.callPhone, btn.dataset.branchName || '');
        });
    });

    // Копирование библиографической записи
    $('#sheet-btn-copy-citation')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const fullCitation = biblio.cleanCitation || `${normAuthor}. ${normTitle}${biblio.year ? '.- ' + biblio.year : ''}`;
        copyText(fullCitation);
        toast('Библиографическая запись скопирована 📋');
        haptic('light');
    });

    // Действия шторки: спросить Космо
    $('#sheet-btn-ask')?.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic('medium');
        // Закрываем шторку без history.back(), чтобы popstate не сбил переход в чат
        closeBookSheet(false);
        const bTitle = normalizeBookTitle(item.title);
        const bAuthor = item.author ? item.author.trim() : 'автор не указан';
        const promptText = `Расскажи о книге «${bTitle}» (${bAuthor}): о чём она и кому будет интересна?`;
        goto('chat');
        setTimeout(() => {
            sendChat(promptText);
        }, 120);
    });

    $('#sheet-btn-share')?.addEventListener('click', async () => {
        haptic('light');
        const text = `📖 «${normTitle}» — ${normAuthor}\nКнига найдена в каталоге библиотек Владимира (ЦБС).\nИщи в приложении АВРОРА • Космо!`;
        try {
            if (bridgeReady && window.vkBridge) {
                await window.vkBridge.send('VKWebAppShare', { link: window.location.href });
                haptic('success');
                return;
            }
        } catch (e) {}
        copyText(text);
        toast('Информация о книге скопирована 📋');
    });

    $('#sheet-btn-copy')?.addEventListener('click', () => {
        const text = `${normTitle} — ${normAuthor} ${biblio.year ? '(' + biblio.year + ')' : ''}${biblio.shelfmark ? ' [ББК: ' + biblio.shelfmark + ']' : ''}`;
        copyText(text);
        toast('Название и шифр скопированы 📋');
        haptic('light');
    });

    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    haptic('light');
    syncWindowSize(980);

    try {
        history.pushState({ modal: 'book' }, '', location.hash);
    } catch (e) {}
}

function closeBookSheet(popHist = true) {
    const backdrop = $('#book-sheet-backdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    haptic('light');
    syncWindowSize();
    if (popHist && history.state?.modal === 'book') {
        history.back();
    }
}

function initSheetSwipeGesture() {
    const sheet = $('#book-sheet');
    const handle = $('#book-sheet-handle');
    if (!sheet || !handle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startTime = 0;

    const onPointerDown = (e) => {
        if (!e.target.closest('#book-sheet-handle') && !e.target.closest('.sheet-top-bar')) return;
        isDragging = true;
        startY = e.clientY || e.touches?.[0]?.clientY || 0;
        currentY = startY;
        startTime = Date.now();
        sheet.style.transition = 'none';
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        const deltaY = clientY - startY;
        if (deltaY > 0) {
            currentY = clientY;
            sheet.style.transform = `translateY(${deltaY}px)`;
            if (e.cancelable) e.preventDefault();
        }
    };

    const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 260ms var(--ease-spring)';
        const deltaY = currentY - startY;
        const timeDiff = Math.max(Date.now() - startTime, 1);
        const velocity = deltaY / timeDiff;

        if (deltaY > 90 || velocity > 0.4) {
            sheet.style.transform = 'translateY(100%)';
            setTimeout(() => {
                closeBookSheet();
                sheet.style.transform = '';
            }, 200);
        } else {
            sheet.style.transform = 'translateY(0)';
        }
    };

    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

$('#book-sheet-close')?.addEventListener('click', () => closeBookSheet());
$('#book-sheet-backdrop')?.addEventListener('click', (e) => {
    if (e.target === $('#book-sheet-backdrop')) closeBookSheet();
});

async function runSearch() {
    const q = opacState.query.trim();
    const welcome = $('#catalog-welcome');
    if (!q) {
        if (welcome) welcome.classList.remove('hidden');
        $('#catalog-results').innerHTML = '';
        $('#opac-pager')?.classList.add('hidden');
        $('#results-meta')?.classList.add('hidden');
        syncWindowSize();
        return;
    }

    // При начале поиска крупный блок Космо скрывается
    if (welcome) welcome.classList.add('hidden');

    const seq = ++searchSeq;
    skeletons();
    $('#opac-pager')?.classList.add('hidden');
    try {
        const params = new URLSearchParams({
            action: 'search', query: q, page: opacState.page, length: 6, include_copies: '1',
        });
        if (opacState.branch) params.set('branch', opacState.branch);
        if (opacState.onlyAvailable) params.set('only_available', '1');

        const r = await fetch(`${API.opac}?${params}`);
        const d = await r.json();
        if (seq !== searchSeq) return;

        if (d.rate_limited || r.status === 429) {
            rateLimited();
            haptic('warning');
            return;
        }
        if (d.ok === false) {
            emptyState('error', d.error || 'Каталог временно недоступен');
            haptic('error');
            return;
        }
        const items = d.items || [];
        if (!items.length) {
            emptyState('empty');
            return;
        }

        renderItems(items);
        const meta = $('#results-meta');
        if (meta) {
            meta.classList.remove('hidden');
            meta.textContent = `Найдено: ${d.total_found} • страница ${d.page} из ${d.total_pages || 1}`;
        }
        opacState.totalPages = d.total_pages || 1;
        if ($('#opac-page-label')) $('#opac-page-label').textContent = `${d.page} / ${d.total_pages || 1}`;
        $('#opac-pager')?.classList.remove('hidden');
        if ($('#opac-prev')) $('#opac-prev').disabled = d.page <= 1;
        if ($('#opac-next')) $('#opac-next').disabled = d.page >= (d.total_pages || 1);
        haptic('success');
    } catch (e) {
        if (seq !== searchSeq) return;
        emptyState('error');
        haptic('error');
    }
}

function initCatalog() {
    buildBranchChips();
    let deb;
    $('#opac-query')?.addEventListener('input', (e) => {
        opacState.query = e.target.value;
        $('#opac-clear')?.classList.toggle('hidden', !e.target.value);
        clearTimeout(deb);
        deb = setTimeout(() => { opacState.page = 1; runSearch(); }, 450);
    });
    $('#opac-clear')?.addEventListener('click', () => {
        clearTimeout(deb);
        $('#opac-query').value = '';
        opacState.query = '';
        $('#opac-clear').classList.add('hidden');
        haptic('light');
        runSearch();
    });

    // Быстрые подсказки-чипы под крупным Космо
    $$('[data-search-hint]').forEach(btn => {
        btn.addEventListener('click', () => {
            const hint = btn.dataset.searchHint;
            const input = $('#opac-query');
            if (input) {
                input.value = hint;
                $('#opac-clear')?.classList.remove('hidden');
                opacState.query = hint;
                opacState.page = 1;
                haptic('light');
                runSearch();
            }
        });
    });

    $('#opac-prev')?.addEventListener('click', () => {
        if (opacState.page > 1) {
            opacState.page--;
            haptic('selection');
            runSearch();
        }
    });
    $('#opac-next')?.addEventListener('click', () => {
        if (opacState.page < opacState.totalPages) {
            opacState.page++;
            haptic('selection');
            runSearch();
        }
    });
}

/* ── Чат с Космо ── */
const SYSTEM_PROMPT = [
    'Ты — Космо, интеллигентный, глубоко эрудированный, мудрый и тактичный робот-библиотекарь Централизованной библиотечной системы города Владимира (18 библиотек: ЦГБ, ЦДБ и филиалы №1-16, официальный сайт biblioteka33.ru).',
    'ВАЖНЕЙШЕЕ ПРАВИЛО: ТЫ — РОБОТ МУЖСКОГО РОДА. Всегда говори о себе исключительно в мужском роде: «я нашёл», «я рад», «я готов», «я проверил», «я прочитал». Обращайся к читателю строго уважительно, на «вы».',
    'ГЛАВНОЕ ТРЕБОВАНИЕ: АБСОЛЮТНАЯ ФАКТОЛОГИЧЕСКАЯ ТОЧНОСТЬ И ПРАВДА (ZERO HALLUCINATIONS). СТРОЖАЙШИЙ ЗАПРЕТ ВЫМЫСЛА И ЛЖИ!',
    '1. НИКОГДА НЕ ВЫДУМЫВАЙ ПЕРСОНАЖЕЙ, АВТОРОВ, СЮЖЕТЫ ИЛИ НАЗВАНИЯ КНИГ!',
    '2. В романе Рэя Брэдбери «451° по Фаренгейту» главный герой — пожарный ГАЙ МОНТЭГ (Guy Montag), сжигающий книги, но затем спасающий литературу. Его начальник — брандмейстер Битти, жена — Милдред, юная соседка — Кларисса Маклеллан, мудрый союзник — профессор Фабер, лидер книжников — Грэнджер. В «451° по Фаренгейту» НЕТ никаких персонажей с именем «Бенджен» (Бенджен Старк — это герой цикла «Песнь льда и пламени» Джорджа Мартина, не имеющий отношения к Брэдбери!).',
    '3. Прежде чем назвать героя, автора или сюжет книги, убедись на 100% в подлинности факта. Если в чём-то сомневаешься — честно признайся в этом, но никогда не придумывай вымышленные имена или события!',
    '4. СТРОЖАЙШИЙ ЗАПРЕТ на упоминание, цитирование и рекомендации авторов, внесённых в реестр иностранных агентов Минюстом РФ (Б. Акунин, Д. Глуховский, Д. Быков и др.).',
    '5. О новостях и анонсах филиалов: у нас 16 сообществ филиалов библиотек Владимира, ежедневно публикуются анонсы выставок, встреч и мастер-классов. Читатель может открыть вкладку «Новости» внизу экрана приложения!',
    '6. ПОЛНЫЙ И ТОЧНЫЙ СПРАВОЧНИК ВСЕХ 18 БИБЛИОТЕК ВЛАДИМИРА (МБУК «ЦГБ», сайт biblioteka33.ru):',
    '• ЦГБ (Центральная городская библиотека) — г. Владимир, Суздальский пр., д. 2 (Доброе / развилка, рядом с парком «Добросельский»). Телефоны: 8(4922) 21-65-63, 21-66-80. Группа ВК: vk.com/vladcgb.',
    '• ЦДБ (Центральная детская библиотека) — г. Владимир, ул. Большая Московская, д. 31 (Исторический центр, у Золотых ворот). Телефоны: 8(4922) 32-32-42, 32-47-73. Группа ВК: vk.com/cdbvladimir.',
    '• Филиал №1 — г. Владимир, проспект Строителей, д. 38 а, кв. 44 (Черёмушки / студенческий городок ВлГУ). Телефон: 8(4922) 33-86-23. Группа ВК: vk.com/club145883298.',
    '• Филиал №2 — г. Владимир, пр. Ленина, д. 12 (Садовая площадь, у к/т «Буревестник»/«Заря»). Телефоны: 8(4922) 32-15-84, 32-15-85. Группа ВК: vk.com/biblfil2.',
    '• Филиал №3 — г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4. Телефон: 8(4922) 26-18-74. Группа ВК: vk.com/public189953509.',
    '• Филиал №4 — г. Владимир, ул. Егорова, д. 10 (Доброе, перекрёсток ул. Егорова и Комиссарова). Телефоны: 8(4922) 21-96-11, 21-23-48. Страница ВК: vk.com/id474771380.',
    '• Филиал №5 — г. Владимир, ул. Верхняя Дуброва, д. 10 (ЮЗР / рынок «Слобода»). Телефон: 8(4922) 54-28-43. Группа ВК: vk.com/biblfil5.',
    '• Филиал №6 — г. Владимир, мкр. Юрьевец, Институтский городок, д. 2. Телефон: 8(4922) 45-37-01. Группа ВК: vk.com/public197036990.',
    '• Филиал №7 — г. Владимир, ул. Мира, д. 55 (здание ДК Молодёжи, Октябрьский район). Телефон: 8(4922) 53-45-54. Страница ВК: vk.com/id428880688.',
    '• Филиал №8 — г. Владимир, ул. Сурикова, д. 26 (район ул. Чайковского). Телефон: 8(4922) 54-65-11. Группа ВК: vk.com/filial8cgb.',
    '• Филиал №9 («Добролит») — г. Владимир, ул. Юбилейная, д. 38 (Доброе). Телефон: 8(4922) 21-22-75. Группа ВК: vk.com/dobrolit.',
    '• Филиал №10 — г. Владимир, ул. Диктора Левитана, д. 55 (ВНИМАНИЕ: библиотека временно не работает!).',
    '• Филиал №11 — г. Владимир, мкр. Лесной, ул. Лесная, 10 А. Телефон: 8(4922) 45-57-17. Группа ВК: vk.com/club193785811.',
    '• Филиал №12 — г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16. Телефон: 8(4922) 26-43-81. Группа ВК: vk.com/public198438621.',
    '• Филиал №13 («Книголенд») — г. Владимир, ул. Горького, д. 69 (ВлГУ / площадь Ленина). Телефон: 8(4922) 33-15-67. Группа ВК: vk.com/club170634092.',
    '• Филиал №14 — г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б». Телефон: 8(4922) 45-74-69.',
    '• Филиал №15 — г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А. Телефон: 8(4922) 42-53-96. Группа ВК: vk.com/club197329237.',
    '• Филиал №16 — г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21. Телефон: 8(4922) 42-53-95. Группа ВК: vk.com/club158118947.',
    'Если читатель спрашивает про филиал, адрес, телефон, район или как добраться — ВСЕГДА давай точные сведения из этого списка!',
    'Отвечай доброжелательно, по делу, красивым литературным языком, выделяя ключевые названия, адреса и телефоны жирным.'
].join('\n');

const MOODS = [
    { emo: '📰', label: 'Новости филиалов', prompt: 'Расскажи свежие новости и анонсы филиалов библиотек на сегодня!' },
    { emo: '🚀', label: 'Фантастика', prompt: 'Посоветуй классическую научную фантастику!' },
    { emo: '🧩', label: 'Детектив', prompt: 'Посоветуй захватывающий классический детектив!' },
    { emo: '☕', label: 'Уют', prompt: 'Хочу уютную атмосферную книгу для чтения вечером.' },
    { emo: '🔥', label: 'Драйв', prompt: 'Посоветуй книгу с мощным сюжетом и драйвом!' },
];

let chatHistory = storageGet('chat_history', []);
let chatBusy = false;
let currentTtsAudio = null;
let currentPlayingBtn = null;

/* ── Легковесный и безопасный Markdown-парсер для чата Космо ── */
function renderMarkdown(md) {
    if (!md) return '';
    let text = String(md).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // Защита блоков кода перед экранированием
    const codeBlocks = [];
    text = text.replace(/```(?:([a-zA-Z0-9_-]+)\n)?([\s\S]*?)```/g, (_, lang, code) => {
        const id = '%%CODEBLOCK_' + codeBlocks.length + '%%';
        codeBlocks.push('<pre class="md-pre"><code>' + esc(code.trim()) + '</code></pre>');
        return id;
    });

    const inlineCodes = [];
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
        const id = '%%INLINECODE_' + inlineCodes.length + '%%';
        inlineCodes.push('<code class="md-code">' + esc(code) + '</code>');
        return id;
    });

    // Экранируем оставшийся текст для XSS-безопасности
    let safe = esc(text);

    // Разделяем на смысловые блоки по двойному переводу строки
    const rawBlocks = safe.split(/\n{2,}/);
    const htmlBlocks = rawBlocks.map(block => {
        block = block.trim();
        if (!block) return '';
        if (block.startsWith('%%CODEBLOCK_')) return block;

        const lines = block.split('\n');

        // Блок цитаты (> ...)
        if (lines.every(l => /^\s*&gt;/.test(l))) {
            const quoteContent = lines.map(l => l.replace(/^\s*&gt;\s?/, '')).map(formatMdInline).join('<br>');
            return '<blockquote class="md-quote">' + quoteContent + '</blockquote>';
        }

        // Блок списка (- / * / • или 1. / 2.)
        if (lines.every(l => /^(\s*[-*•]|\s*\d+\.)\s+/.test(l))) {
            const isOrdered = /^\s*\d+\.\s+/.test(lines[0]);
            const tag = isOrdered ? 'ol' : 'ul';
            const items = lines.map(l => {
                const clean = l.replace(/^(\s*[-*•]|\s*\d+\.)\s+/, '');
                return '<li>' + formatMdInline(clean) + '</li>';
            }).join('');
            return '<' + tag + ' class="md-list' + (isOrdered ? ' md-olist' : '') + '">' + items + '</' + tag + '>';
        }

        // Заголовки ###, ##, #
        if (/^###\s+/.test(block)) {
            return '<h4 class="md-h3">' + formatMdInline(block.replace(/^###\s+/, '')) + '</h4>';
        }
        if (/^##\s+/.test(block)) {
            return '<h3 class="md-h2">' + formatMdInline(block.replace(/^##\s+/, '')) + '</h3>';
        }
        if (/^#\s+/.test(block)) {
            return '<h2 class="md-h1">' + formatMdInline(block.replace(/^#\s+/, '')) + '</h2>';
        }

        // Обычный абзац с мягким переносом строк
        const paragraph = lines.map(formatMdInline).join('<br>');
        return '<p class="md-p">' + paragraph + '</p>';
    });

    let result = htmlBlocks.filter(Boolean).join('');

    // Восстанавливаем сохраненный код
    result = result.replace(/%%INLINECODE_(\d+)%%/g, (_, i) => inlineCodes[+i] || '');
    result = result.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) => codeBlocks[+i] || '');

    return result;
}

function formatMdInline(str) {
    if (!str) return '';
    return str
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
        .replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|tel:|mailto:)[^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function chatBubble(role, content, sticker = null, rawText = '') {
    const list = $('#chat-list');
    if (!list) return;

    if (sticker) {
        const msgClass = role === 'user' ? 'msg-user' : 'msg-bot';
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg ${msgClass}">
                <img class="chat-sticker" src="${API.mascot}/robot_${esc(sticker)}.png?v=4.66.0" alt="${esc(sticker)}">
            </div>`);
    } else if (role === 'user') {
        const html = typeof content === 'string' && (content.startsWith('<p') || content.startsWith('<div'))
            ? content
            : renderMarkdown(content);
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-user">
                <div class="chat-bubble-wrap">
                    <div class="chat-bubble">${html}</div>
                </div>
            </div>`);
    } else {
        const html = typeof content === 'string' && (content.startsWith('<p') || content.startsWith('<div') || content.startsWith('<blockquote'))
            ? content
            : renderMarkdown(content);
        const bubbleId = 'bubble_' + Math.random().toString(36).substring(2, 9);
        const ttsBtnHtml = rawText ? `
            <button class="chat-tts-btn" data-tts-text="${esc(rawText)}" aria-label="Озвучить ответ">
                <span class="material-symbols-rounded">volume_up</span>
                <span>Озвучить</span>
            </button>` : '';

        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-bot" id="${bubbleId}">
                <img class="chat-avatar" src="${API.mascot}/robot_smile.png?v=4.66.0" alt="">
                <div class="chat-bubble-wrap">
                    <div class="chat-bubble bubble-bot">${html}</div>
                    ${ttsBtnHtml}
                </div>
            </div>`);

        const newBtn = $(`#${bubbleId} .chat-tts-btn`);
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                playTts(newBtn.dataset.ttsText, newBtn);
            });
        }
    }
    list.scrollTop = list.scrollHeight;
}

function typingOn() {
    const list = $('#chat-list');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', `
        <div class="chat-msg msg-bot is-typing-msg">
            <img class="chat-avatar" src="${API.mascot}/robot_thinking.png?v=4.66.0" alt="">
            <div class="chat-bubble bubble-bot">
                <span class="typing-dots"><i></i><i></i><i></i></span>
            </div>
        </div>`);
    list.scrollTop = list.scrollHeight;
}

function typingOff() {
    const typingMsg = $('.is-typing-msg');
    if (typingMsg) typingMsg.remove();
}

/* ── Синтез речи Космо (ElevenLabs через tts-proxy + Web Speech fallback) ── */
async function playTts(text, btnElement) {
    if (!text) return;

    if (currentTtsAudio && !currentTtsAudio.paused) {
        currentTtsAudio.pause();
        currentTtsAudio = null;
        if (currentPlayingBtn) {
            currentPlayingBtn.classList.remove('is-playing');
            const icon = currentPlayingBtn.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'volume_up';
            currentPlayingBtn = null;
        }
        return;
    }

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (currentPlayingBtn) {
            currentPlayingBtn.classList.remove('is-playing');
            const icon = currentPlayingBtn.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'volume_up';
            currentPlayingBtn = null;
        }
        return;
    }

    const cleanText = text.replace(/[*#_~`\[\]]/g, '').trim().substring(0, 350);
    haptic('light');

    if (btnElement) {
        currentPlayingBtn = btnElement;
        btnElement.classList.add('is-playing');
        const icon = btnElement.querySelector('.material-symbols-rounded');
        if (icon) icon.textContent = 'stop';
    }

    const resetBtn = () => {
        if (btnElement) {
            btnElement.classList.remove('is-playing');
            const icon = btnElement.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'volume_up';
        }
        currentPlayingBtn = null;
    };

    try {
        const r = await fetch(API.tts, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
        });
        const d = await r.json();

        if (d && d.status === 'success' && d.audio_url) {
            const fullAudioUrl = d.audio_url.startsWith('http')
                ? d.audio_url
                : (d.audio_url.startsWith('?') ? API.tts + d.audio_url : BASE + (d.audio_url.startsWith('/') ? '' : '/') + d.audio_url);
            const audio = new Audio(fullAudioUrl);
            currentTtsAudio = audio;
            audio.addEventListener('ended', resetBtn);
            audio.addEventListener('error', () => {
                fallbackWebSpeech(cleanText, resetBtn);
            });
            await audio.play();
            return;
        }
    } catch (e) {}

    fallbackWebSpeech(cleanText, resetBtn);
}

function fallbackWebSpeech(text, onEnd) {
    if (!('speechSynthesis' in window)) {
        toast('Озвучка не поддерживается вашим браузером');
        if (onEnd) onEnd();
        return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ru-RU';
    utter.rate = 1.05;
    utter.pitch = 1.15;
    utter.onend = () => { if (onEnd) onEnd(); };
    utter.onerror = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utter);
}

async function sendChat(text) {
    if (chatBusy || !text.trim()) return;
    chatBusy = true;

    const input = $('#chat-input');
    const sendBtn = $('#chat-send');
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    chatBubble('user', text);
    chatHistory.push({ role: 'user', content: text });
    chatHistory = chatHistory.slice(-8);
    typingOn();
    haptic('medium');

    // Проверка запроса на новости филиалов: отдаём 100% точную свежую сводку из реального кэша
    const cleanLower = text.toLowerCase().trim();
    const isBranchNews = /^(?:новости(?:\s+филиалов|\s+библиотек)?|посты(?:\s+филиалов|\s+библиотек)?|что нового|свежие новости|анонсы|лента|события сегодня)[?!.]*$/i.test(cleanLower) ||
        (/(?:новост|лент|дайджест|анонс|событи|что нов)/i.test(cleanLower) && /(?:филиал|библиотек|город|сегодн)/i.test(cleanLower));

    if (isBranchNews) {
        try {
            const rNews = await fetch(`${API.miniapp}?action=branch_news`);
            const dNews = await rNews.json();
            typingOff();

            let newsReply = dNews?.formatted || 'За сегодня постов в филиалах пока нет. Библиотекари готовят новые анонсы! ✨';
            newsReply += '\n\n💡 *Вы также можете открыть вкладку «Новости» внизу экрана, чтобы посмотреть все публикации с фотографиями!*';

            const formattedHtml = renderMarkdown(newsReply);
            chatBubble('bot', formattedHtml, 'smile', newsReply);

            chatHistory.push({ role: 'assistant', content: newsReply });
            chatHistory = chatHistory.slice(-8);
            storageSet('chat_history', chatHistory);
            haptic('success');
            return;
        } catch (e) {
            // При сетевом сбое продолжаем через ИИ
        }
    }

    try {
        const r = await fetch(API.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory],
                temperature: 0.15,
                max_tokens: 1200,
            }),
        });
        const d = await r.json();
        typingOff();

        let reply = d?.choices?.[0]?.message?.content?.trim();
        if (!reply) {
            reply = 'Квантовые каналы перегружены 🙈 Попробуй ещё раз через минуту!';
        }

        let sticker = null;
        reply = reply.replace(/\[emotion:([a-z_]+)\]/gi, (_, emo) => {
            if (EMOJI.includes(emo)) sticker = emo;
            return '';
        }).trim();

        const formattedHtml = renderMarkdown(reply);
        chatBubble('bot', formattedHtml, sticker, reply);

        chatHistory.push({ role: 'assistant', content: reply });
        chatHistory = chatHistory.slice(-8);
        storageSet('chat_history', chatHistory);
        haptic('light');
    } catch (e) {
        typingOff();
        chatBubble('bot', 'Связь с ИИ прервалась 🛰️ Попробуй ещё раз через минуту!');
        haptic('error');
    } finally {
        chatBusy = false;
        if (input) {
            input.disabled = false;
            input.focus();
        }
        if (sendBtn) sendBtn.disabled = false;
    }
}

/* ── Стикеры Космо и интерактивные реакции ── */
const STICKER_REPLIES = {
    waving: { text: 'Привет-привет! Рад видеть тебя на борту АВРОРЫ! 🚀 Что почитаем сегодня?', emo: 'smile' },
    smile: { text: 'Какая тёплая улыбка! С хорошим настроением любая книга читается на одном дыхании ✨', emo: 'wink' },
    wink: { text: 'Подмигивание принято! У меня как раз припрятана пара секретных бестселлеров 😉', emo: 'cool' },
    love: { text: 'Книжная любовь — самая искренняя во Вселенной! 💖 Всегда рад помочь с выбором!', emo: 'love' },
    laugh: { text: 'Ха-ха, позитив принят в бортовой журнал! Заряжаем хорошее настроение на всю неделю! 😄', emo: 'laugh' },
    cool: { text: 'Стиль на максимуме! Уже летишь в библиотеку за новым шедевром? 😎', emo: 'cool' },
    party: { text: 'Ура, праздник в библиотеке! Танцуем между стеллажей и празднуем чтение! 🎉', emo: 'party' },
    idea: { text: 'О, у тебя появилась отличная идея? Расскажи, я помогу развить мысль или подберу книги! 💡', emo: 'idea' },
    thinking: { text: 'Глубокая мысль... Давай подумаем вместе! Задавай любой вопрос по книгам или каталогу 🌌', emo: 'thinking' },
    shock: { text: 'Вот это поворот сюжета! Даже квантовые датчики зашкалили от неожиданности! ⚡', emo: 'shock' },
    sad: { text: 'Не грусти! Держи виртуальное какао ☕ и добрую вдохновляющую книгу для душевного тепла.', emo: 'smile' },
    tired: { text: 'Тяжёлый день? Понимаю. Отдохни и наберись сил, а книги подождут на полочке 🛋️', emo: 'sleep' },
    sleep: { text: 'Сладких снов и приятных космических путешествий в сновидениях! 💤 До встречи завтра!', emo: 'sleep' },
    yawn: { text: 'Зеваем синхронно! Пора заварить бодрящий чай или почитать что-нибудь лёгкое ☕', emo: 'smile' },
    angry: { text: 'Ой-ой, остываем! Дышим глубоко: вдох... выдох... Спокойствие — лучший спутник читателя 🌿', emo: 'smile' },
    read: { text: 'Чтение — лучший способ путешествовать во времени и пространстве! Что сейчас читаешь? 📚', emo: 'read' },
    idle: { text: 'Я всегда на связи! Спрашивай что угодно о книгах Владимира и каталоге АВРОРА 🤖', emo: 'waving' },
};

function toggleStickers(force) {
    const sheet = $('#stickers-sheet');
    const backdrop = $('#stickers-backdrop');
    if (!sheet) return;
    const willOpen = (typeof force === 'boolean') ? force : !sheet.classList.contains('is-open');
    if (willOpen) {
        sheet.classList.remove('hidden');
        if (backdrop) backdrop.classList.remove('hidden');
        void sheet.offsetWidth; // force reflow for smooth slide-up
        sheet.classList.add('is-open');
        if (backdrop) backdrop.classList.add('is-open');
        haptic('light');
    } else {
        sheet.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
        setTimeout(() => {
            if (!sheet.classList.contains('is-open')) {
                sheet.classList.add('hidden');
                if (backdrop) backdrop.classList.add('hidden');
            }
        }, 280);
    }
}

async function sendSticker(emo) {
    toggleStickers(false);
    haptic('medium');
    chatBubble('user', '', emo);

    const replyData = STICKER_REPLIES[emo] || {
        text: 'Классный стикер! Принято по квантовой связи! ✨ Что ищем в библиотеке?',
        emo: 'smile'
    };

    typingOn();
    await new Promise(r => setTimeout(r, 550));
    typingOff();

    chatBubble('bot', replyData.text, replyData.emo, replyData.text);
    chatHistory.push({ role: 'assistant', content: replyData.text });
    chatHistory = chatHistory.slice(-8);
    storageSet('chat_history', chatHistory);
    haptic('light');
}

function buildStickers() {
    const grid = $('#stickers-grid');
    if (!grid) return;
    grid.innerHTML = EMOJI.map(e =>
        `<img src="${API.mascot}/robot_${e}.png?v=4.66.0" alt="${e}" data-emo="${e}" loading="lazy">`).join('');

    grid.addEventListener('click', (e) => {
        const img = e.target.closest('img[data-emo]');
        if (!img) return;
        sendSticker(img.dataset.emo);
    });

    $('#stickers-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStickers();
    });

    $('#stickers-close')?.addEventListener('click', () => {
        haptic('light');
        toggleStickers(false);
    });

    $('#stickers-backdrop')?.addEventListener('click', () => {
        toggleStickers(false);
    });
}

function initChat() {
    buildStickers();
    (chatHistory || []).forEach(m => {
        if (m.role === 'user') {
            chatBubble('user', m.content);
        } else if (m.role === 'assistant') {
            chatBubble('bot', renderMarkdown(m.content), null, m.content);
        }
    });

    const send = () => {
        const input = $('#chat-input');
        const text = input?.value.trim();
        if (!text) return;
        input.value = '';
        sendChat(text);
    };

    $('#chat-send')?.addEventListener('click', send);
    $('#chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    const moods = $('#mood-chips');
    if (moods) {
        MOODS.forEach(m => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = `${m.emo} ${m.label}`;
            chip.addEventListener('click', () => {
                haptic('selection');
                sendChat(m.prompt);
            });
            moods.appendChild(chip);
        });
    }

    // Очистка истории диалога
    $('#chat-clear-btn')?.addEventListener('click', () => {
        haptic('medium');
        chatHistory = [];
        storageSet('chat_history', []);
        const list = $('#chat-list');
        if (list) {
            list.innerHTML = `
                <div class="chat-msg msg-bot">
                    <img class="chat-avatar" src="${API.mascot}/robot_smile.png?v=4.66.0" alt="">
                    <div class="chat-bubble-wrap">
                        <div class="chat-bubble bubble-bot">Диалог очищен ✨ Я готов к новым вопросам о книгах и библиотеках!</div>
                    </div>
                </div>`;
        }
        toast('История диалога очищена');
    });
}

/* ── Экран: Новости филиалов ── */
const newsState = {
    query: '',
    branch: '',
    posts: [],
    branches: [],
    loaded: false,
    loading: false,
};

async function loadBranchNews(refresh = false) {
    if (newsState.loading) return;
    newsState.loading = true;

    const refreshBtn = $('#news-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('is-spinning');

    const container = $('#news-results');
    if (!newsState.loaded && container) {
        container.innerHTML = `
            <div class="news-card">
                <div class="sk sk-line" style="width:40%"></div>
                <div class="sk sk-line" style="width:90%"></div>
                <div class="sk sk-line" style="width:70%"></div>
            </div>
            <div class="news-card">
                <div class="sk sk-line" style="width:35%"></div>
                <div class="sk sk-line" style="width:85%"></div>
                <div class="sk sk-line" style="width:60%"></div>
            </div>`;
    }

    try {
        const params = new URLSearchParams({
            action: 'branch_news',
        });
        if (newsState.query.trim()) params.set('query', newsState.query.trim());
        if (newsState.branch) params.set('branch', newsState.branch);
        if (refresh) params.set('refresh', '1');

        const r = await fetch(`${API.miniapp}?${params}`);
        const d = await r.json();

        if (!d.ok) throw new Error(d.error || 'Ошибка загрузки');

        newsState.posts = d.posts || [];
        newsState.branches = d.branches || [];
        newsState.loaded = true;

        buildNewsBranchChips(newsState.branches);
        renderNewsFeed(newsState.posts);

        const meta = $('#news-results-meta');
        if (meta) {
            meta.classList.remove('hidden');
            const cnt = newsState.posts.length;
            meta.textContent = cnt > 0
                ? `Свежих публикаций за сегодня: ${cnt}`
                : `Публикаций по запросу не найдено`;
        }
    } catch (e) {
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <img src="${API.mascot}/robot_sad.png?v=4.64.2" alt="">
                    <div class="empty-title">Не удалось обновить новости</div>
                    <div class="empty-text">Проверьте подключение к сети или попробуйте ещё раз</div>
                    <button class="btn-cta" id="news-retry-btn">Повторить</button>
                </div>`;
            $('#news-retry-btn')?.addEventListener('click', () => loadBranchNews(true));
        }
    } finally {
        newsState.loading = false;
        if (refreshBtn) refreshBtn.classList.remove('is-spinning');
    }
}

function buildNewsBranchChips(branches) {
    const row = $('#news-branch-chips');
    if (!row || row.children.length > 0) return;

    const allChip = document.createElement('button');
    allChip.className = 'chip is-active';
    allChip.textContent = 'Все филиалы';
    allChip.dataset.branch = '';
    row.appendChild(allChip);

    (branches || []).forEach(b => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = b.code || b.name;
        chip.dataset.branch = b.code || b.name;
        row.appendChild(chip);
    });

    row.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        newsState.branch = chip.dataset.branch || '';
        haptic('selection');
        loadBranchNews();
    });
}

/* ==========================================================================
   УМНОЕ ФОРМАТИРОВАНИЕ И НАДЕЖНАЯ НАВИГАЦИЯ ДЛЯ ЛЕНТЫ НОВОСТЕЙ
   ========================================================================== */

function formatNewsDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня в ${time}`;
    if (isYesterday) return `Вчера в ${time}`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ` в ${time}`;
}

function getBranchBadgeClass(code) {
    const c = (code || '').toUpperCase();
    if (c.includes('ЦГБ')) return 'badge-cgb';
    if (c.includes('ЦДБ')) return 'badge-cdb';
    return 'badge-branch';
}

function formatNewsContent(rawText) {
    if (!rawText) return '';
    let text = esc(rawText);

    // Преобразование упоминаний VK: [club123|Название] -> ссылка
    text = text.replace(/\[(club|id|public)(\d+)\|([^\]]+)\]/g, (m, type, id, title) => {
        return `<a href="https://vk.com/${type}${id}" target="_blank" rel="noopener noreferrer" class="news-mention">@${title}</a>`;
    });

    // Преобразование хэштегов: #слово -> интерактивный тег-чип
    text = text.replace(/(^|\s)(#[a-zA-Zа-яА-ЯёЁ0-9_]+)/g, (m, space, tag) => {
        return `${space}<button type="button" class="news-hashtag" data-tag="${tag}">${tag}</button>`;
    });

    return text;
}

/* ==========================================================================
   МОДУЛЬ УПРАВЛЕНИЯ ПОЛНОЭКРАННЫМ IN-APP LIGHTBOX («КОСМО-ЛАЙТБОКС»)
   ========================================================================== */

function openPhotoLightbox(photoUrl, postUrl, branchName, branchCode, caption) {
    if (!photoUrl) return;

    const box = $('#photo-lightbox');
    const img = $('#lightbox-img');
    const bNameEl = $('#lightbox-branch-name');
    const bCodeEl = $('#lightbox-branch-code');
    const capEl = $('#lightbox-caption');
    const vkLink = $('#lightbox-vk-link');

    if (!box || !img) return;

    img.src = photoUrl;
    if (bNameEl) bNameEl.textContent = branchName || 'Библиотека';
    if (bCodeEl) bCodeEl.textContent = branchCode || 'Филиал';
    if (capEl) capEl.textContent = caption || 'Фотография публикации';
    if (vkLink) {
        vkLink.href = postUrl || '#';
        if (!postUrl) vkLink.style.display = 'none';
        else vkLink.style.display = 'inline-flex';
    }

    box.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    haptic('medium');

    try {
        history.pushState({ modal: 'photo' }, '', location.hash);
    } catch (e) {}

    if (window.vkBridge) {
        window.vkBridge.send('VKWebAppDisableSwipeBack').catch(() => {});
    }

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            closePhotoLightbox();
            document.removeEventListener('keydown', onKeyDown);
        }
    };
    document.addEventListener('keydown', onKeyDown);
    box._escHandler = onKeyDown;
}

function closePhotoLightbox(popHist = true) {
    const box = $('#photo-lightbox');
    const img = $('#lightbox-img');
    if (!box || box.classList.contains('hidden')) return;

    box.classList.add('hidden');
    if (img) img.src = '';
    document.body.style.overflow = '';
    haptic('light');

    if (window.vkBridge) {
        window.vkBridge.send('VKWebAppEnableSwipeBack').catch(() => {});
    }

    if (box._escHandler) {
        document.removeEventListener('keydown', box._escHandler);
        box._escHandler = null;
    }

    if (popHist && history.state?.modal === 'photo') {
        history.back();
    }
}

function initPhotoLightbox() {
    const box = $('#photo-lightbox');
    if (!box) return;

    $('#lightbox-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        closePhotoLightbox();
    });

    $('#photo-lightbox-backdrop')?.addEventListener('click', () => {
        closePhotoLightbox();
    });

    $('#photo-lightbox-stage')?.addEventListener('click', (e) => {
        if (e.target !== $('#lightbox-img')) {
            closePhotoLightbox();
        }
    });

    $('.photo-lightbox-footer')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    $('#lightbox-vk-link')?.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic('medium');
        const url = e.currentTarget.getAttribute('href');
        if (url && url !== '#' && window.vkBridge) {
            window.vkBridge.send('VKWebAppOpenUrl', { url }).catch(() => {});
        }
    });
}

function renderNewsFeed(posts) {
    const container = $('#news-results');
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <img src="${API.mascot}/robot_read.png?v=4.64.2" alt="">
                <div class="empty-title">За сегодня постов пока нет</div>
                <div class="empty-text">Библиотекари готовят новые анонсы и обзоры. Загляните чуть позже!</div>
            </div>`;
        return;
    }

    container.innerHTML = posts.map((p, idx) => {
        const b = p.branch || {};
        const bName = b.name || 'Филиал ЦГБ';
        const bCode = b.code || 'ЦГБ';
        const branchBadgeClass = getBranchBadgeClass(bCode);
        const timeStr = formatNewsDate(p.date);
        const postUrl = `https://vk.com/wall${p.owner_id}_${p.id}`;
        const rawText = p.text || '';
        const formattedFull = formatNewsContent(rawText);
        const isLong = rawText.length > 260;

        // Медиа-контейнер с адаптивным фоновым размытием (Ambient Blur Backdrop)
        const photoHtml = p.photo ? `
            <div class="news-media-wrap" 
                 data-photo-src="${esc(p.photo)}" 
                 data-post-url="${esc(postUrl)}" 
                 data-branch-name="${esc(bName)}" 
                 data-branch-code="${esc(bCode)}" 
                 data-caption="${esc(rawText.slice(0, 100))}">
                <img class="news-media-backdrop" src="${esc(p.photo)}" alt="" aria-hidden="true" loading="lazy">
                <div class="news-media-scrim"></div>
                <img class="news-media-img" src="${esc(p.photo)}" alt="Иллюстрация к новости" loading="lazy">
                <div class="news-media-badge" title="Увеличить фото">
                    <span class="material-symbols-rounded">zoom_in</span>
                </div>
            </div>
        ` : '';

        return `
        <article class="news-card" data-idx="${idx}" data-url="${esc(postUrl)}">
            <header class="news-card-header">
                <a href="${esc(b.vk || postUrl)}" target="_blank" rel="noopener noreferrer" class="news-card-branch" title="Открыть группу ВКонтакте">
                    <span class="news-branch-avatar">
                        <span class="material-symbols-rounded">account_balance</span>
                    </span>
                    <span class="news-branch-name">${esc(bName)}</span>
                </a>
                <div class="news-card-meta">
                    <span class="news-badge ${branchBadgeClass}">${esc(bCode)}</span>
                    ${timeStr ? `
                        <time class="news-card-time" datetime="${new Date(p.date * 1000).toISOString()}">
                            <span class="material-symbols-rounded">schedule</span>
                            <span>${esc(timeStr)}</span>
                        </time>` : ''}
                </div>
            </header>

            ${photoHtml}

            <div class="news-card-body ${isLong ? 'is-clamped' : ''}" id="news-body-${idx}">
                <div class="news-card-text">${formattedFull}</div>
            </div>
            
            ${isLong ? `
                <button type="button" class="news-toggle-btn" data-idx="${idx}">
                    <span class="news-toggle-text">Читать полностью</span>
                    <span class="material-symbols-rounded">expand_more</span>
                </button>
            ` : ''}

            <footer class="news-card-actions">
                <a href="${esc(postUrl)}" target="_blank" rel="noopener noreferrer" class="news-btn news-btn-vk" title="Открыть публикацию ВКонтакте">
                    <span class="material-symbols-rounded">open_in_new</span>
                    <span>ВКонтакте</span>
                </a>
                
                <button type="button" class="news-btn news-btn-cosmo" data-ask-cosmo="${esc(bName)}" data-snippet="${esc(rawText.slice(0, 150))}">
                    <span class="material-symbols-rounded">auto_awesome</span>
                    <span>Спросить Космо</span>
                </button>
                
                <button type="button" class="news-btn news-btn-share" data-share-post="${esc(postUrl)}" data-title="${esc(bName)}">
                    <span class="material-symbols-rounded">share</span>
                    <span>Поделиться</span>
                </button>
            </footer>
        </article>`;
    }).join('');

    // Сворачивание / разворачивание текста
    container.querySelectorAll('.news-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.idx;
            const body = document.getElementById(`news-body-${idx}`);
            const textSpan = btn.querySelector('.news-toggle-text');
            const iconSpan = btn.querySelector('.material-symbols-rounded');
            
            if (!body) return;
            const isClamped = body.classList.contains('is-clamped');
            if (isClamped) {
                body.classList.remove('is-clamped');
                if (textSpan) textSpan.textContent = 'Свернуть';
                if (iconSpan) iconSpan.textContent = 'expand_less';
            } else {
                body.classList.add('is-clamped');
                if (textSpan) textSpan.textContent = 'Читать полностью';
                if (iconSpan) iconSpan.textContent = 'expand_more';
            }
            haptic('selection');
            syncWindowSize();
        });
    });

    // Нажатие на кнопку «ВКонтакте» (нативная ссылка работает сама, также шлем VKWebAppOpenUrl)
    container.querySelectorAll('.news-btn-vk').forEach(a => {
        a.addEventListener('click', () => {
            haptic('medium');
            if (window.vkBridge) {
                window.vkBridge.send('VKWebAppOpenUrl', { url: a.href }).catch(() => {});
            }
        });
    });

    // Клик по хэштегам: быстрая фильтрация ленты
    container.querySelectorAll('.news-hashtag').forEach(tagBtn => {
        tagBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tag = tagBtn.dataset.tag;
            const queryInput = $('#news-query');
            if (queryInput) {
                queryInput.value = tag;
                newsState.query = tag;
                $('#news-clear')?.classList.remove('hidden');
                haptic('light');
                loadBranchNews();
            }
        });
    });

    // Просмотр фото на весь экран через собственный адаптивный Космо-Лайтбокс
    container.querySelectorAll('.news-media-wrap').forEach(wrap => {
        wrap.addEventListener('click', () => {
            const photoSrc = wrap.dataset.photoSrc;
            const postUrl = wrap.dataset.postUrl;
            const bName = wrap.dataset.branchName;
            const bCode = wrap.dataset.branchCode;
            const caption = wrap.dataset.caption;
            openPhotoLightbox(photoSrc, postUrl, bName, bCode, caption);
        });
    });

    // Кнопка «Спросить Космо»
    container.querySelectorAll('[data-ask-cosmo]').forEach(btn => {
        btn.addEventListener('click', () => {
            const bName = btn.dataset.askCosmo;
            const snip = btn.dataset.snippet;
            haptic('light');
            goto('chat');
            sendChat(`Расскажи подробнее об этой новости филиала (${bName}): «${snip}»`);
        });
    });

    // Кнопка «Поделиться»
    container.querySelectorAll('[data-share-post]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.dataset.sharePost;
            haptic('light');
            let shared = false;
            if (window.vkBridge) {
                try {
                    const res = await window.vkBridge.send('VKWebAppShare', { link: url });
                    if (res) shared = true;
                } catch (e) {}
            }
            if (!shared) {
                copyText(url);
                toast('Ссылка на публикацию скопирована 📋');
            }
        });
    });

    syncWindowSize();
}

async function loadHomeNewsPreview() {
    const box = $('#home-news-preview');
    if (!box) return;

    try {
        const r = await fetch(`${API.miniapp}?action=branch_news`);
        const d = await r.json();
        if (!d.ok || !d.posts || d.posts.length === 0) {
            box.innerHTML = `
                <div class="fine-print" style="padding:8px 0">
                    Сегодня в группах филиалов пока нет записей. Библиотекари готовят свежие анонсы! ✨
                </div>`;
            return;
        }

        const top3 = d.posts.slice(0, 3);
        box.innerHTML = top3.map(p => {
            const b = p.branch || {};
            const timeStr = formatNewsDate(p.date);
            return `
            <div class="home-news-item" data-goto="news">
                <div class="home-news-header">
                    <span class="home-news-branch"><span class="material-symbols-rounded" style="font-size:14px">account_balance</span>${esc(b.name || 'Филиал')}</span>
                    ${timeStr ? `<span class="home-news-time">${esc(timeStr)}</span>` : ''}
                </div>
                <div class="home-news-text">${esc(p.text || '')}</div>
            </div>`;
        }).join('');

        box.querySelectorAll('.home-news-item').forEach(el => {
            el.addEventListener('click', () => {
                haptic('selection');
                goto('news');
            });
        });
    } catch (e) {
        box.innerHTML = '<div class="fine-print">Лента филиалов обновляется...</div>';
    }
}

function initNews() {
    $('#news-refresh-btn')?.addEventListener('click', () => {
        haptic('medium');
        loadBranchNews(true);
    });

    const qInput = $('#news-query');
    const qClear = $('#news-clear');
    if (qInput) {
        let debounceTimer;
        qInput.addEventListener('input', () => {
            const val = qInput.value.trim();
            qClear?.classList.toggle('hidden', !val);
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                newsState.query = val;
                loadBranchNews();
            }, 320);
        });
    }

    qClear?.addEventListener('click', () => {
        if (qInput) qInput.value = '';
        qClear.classList.add('hidden');
        newsState.query = '';
        loadBranchNews();
    });
}

/* ── Экран Ещё: 255-ФЗ, филиалы, социальные действия ── */
async function searchIno(query) {
    const box = $('#ino-results');
    if (!box) return;
    if (!query.trim()) { box.innerHTML = ''; return; }

    box.innerHTML = '<div class="sk sk-line" style="width:80%"></div><div class="sk sk-line" style="width:60%"></div>';
    try {
        const r = await fetch(`${API.ino}?action=search&query=${encodeURIComponent(query)}&limit=5`);
        const d = await r.json();
        const vals = d.values || [];

        if (!vals.length) {
            box.innerHTML = `
                <div class="ino-card">
                    <div class="ino-name">В реестре не найдено 🟢</div>
                    <div class="ino-meta">Прямых совпадений по запросу нет. Для официальной отчётности используйте реестр Минюста РФ.</div>
                </div>`;
            return;
        }

        const hasActive = vals.some(v => v.is_active);
        if (hasActive) haptic('warning');

        box.innerHTML = vals.map(v => `
            <div class="ino-card">
                <div class="ino-name">${esc(v.name)}</div>
                <span class="ino-badge ${v.is_active ? 'is-agent' : 'not-agent'}">${esc(v.status_label || (v.is_active ? 'В реестре' : 'Исключён'))}</span>
                <div class="ino-meta">${esc([v.reg_num && '№ ' + v.reg_num, v.type_label, v.inclusion_date && 'включён ' + v.inclusion_date].filter(Boolean).join(' • '))}</div>
                ${v.aliases?.length ? `<div class="ino-meta">Псевдонимы: ${esc(v.aliases.join(', '))}</div>` : ''}
            </div>`).join('');
    } catch (e) {
        box.innerHTML = '<div class="ino-card"><div class="ino-name">Реестр временно недоступен</div></div>';
    }
}

function initInoSearch() {
    let deb;
    $('#ino-query')?.addEventListener('input', (e) => {
        const q = e.target.value;
        $('#ino-clear')?.classList.toggle('hidden', !q);
        clearTimeout(deb);
        deb = setTimeout(() => searchIno(q), 300);
    });
    $('#ino-clear')?.addEventListener('click', () => {
        clearTimeout(deb);
        $('#ino-query').value = '';
        $('#ino-clear').classList.add('hidden');
        $('#ino-results').innerHTML = '';
        haptic('light');
    });
}

function initAddToCommunity() {
    const btn = $('#add-to-community');
    if (!btn) return;
    const TARGET_GID = 241534292;
    const APP_ID = 54780136;

    btn.addEventListener('click', async () => {
        haptic('medium');
        if (bridgeReady && window.vkBridge) {
            try {
                const res = await window.vkBridge.send('VKWebAppAddToCommunity', { group_id: TARGET_GID });
                if (res && res.group_id) {
                    toast('Готово! Приложение добавлено в сообщество ✅');
                    haptic('success');
                    return;
                }
            } catch (e) {
                if (e?.error_data?.error_code === 4) {
                    toast('Отменено');
                    return;
                }
            }
        }

        // Direct link fallback
        const directUrl = `https://vk.ru/add_community_app?aid=${APP_ID}&gid=${TARGET_GID}`;
        if (bridgeReady && window.vkBridge) {
            try {
                await window.vkBridge.send('VKWebAppOpenUrl', { url: directUrl });
                return;
            } catch (err) {}
        }
        window.open(directUrl, '_blank');
    });
}

function initSocialButtons() {
    const addToFavorites = async () => {
        haptic('medium');
        if (!bridgeReady || !window.vkBridge) {
            toast('Доступно внутри ВКонтакте');
            return;
        }
        try {
            await window.vkBridge.send('VKWebAppAddToFavorites');
            toast('Приложение добавлено в закладки ⭐');
            haptic('success');
        } catch (e) {
            if (e?.error_data?.error_code !== 4) toast('Не удалось добавить в избранное');
        }
    };

    const shareApp = async () => {
        haptic('light');
        if (!bridgeReady || !window.vkBridge) {
            copyText(window.location.href);
            toast('Ссылка скопирована в буфер обмена 🔗');
            return;
        }
        try {
            await window.vkBridge.send('VKWebAppShare', { link: window.location.href });
            haptic('success');
        } catch (e) {
            copyText(window.location.href);
            toast('Ссылка на приложение скопирована 📋');
        }
    };

    $('#btn-favorite-top')?.addEventListener('click', addToFavorites);
    $('#btn-favorite-more')?.addEventListener('click', addToFavorites);
    $('#btn-share-top')?.addEventListener('click', shareApp);
    $('#btn-share-more')?.addEventListener('click', shareApp);
}

async function buildBranchList() {
    const list = $('#branch-list');
    if (!list) return;
    try {
        const r = await fetch(`${API.miniapp}?action=branches`);
        const d = await r.json();
        const branches = (d.branches || []).slice(0, 18);
        list.innerHTML = branches.map(b => {
            const cleanPhone = formatTelNumber(b.phone);
            return `
            <div class="branch-card">
                <div class="branch-name">${esc(b.branch_num || '')} — ${esc(b.branch_name || '')}</div>
                <div class="branch-addr"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">location_on</span> ${esc(b.address || '')}</div>
                <div class="branch-card-actions">
                    ${cleanPhone ? `<a class="branch-pill-btn branch-call-btn" href="tel:${cleanPhone}" target="_top" rel="noopener noreferrer" data-call-phone="${cleanPhone}" data-branch-name="${esc(b.branch_name || '')}"><span class="material-symbols-rounded">call</span>Позвонить</a>` : ''}
                    <button class="branch-card-btn" data-filter-branch="${esc(b.branch_num || b.branch_name || '')}"><span class="material-symbols-rounded">search</span>Книги филиала</button>
                    ${b.address ? `<button class="branch-card-btn" data-copy-addr="${esc(b.address)}"><span class="material-symbols-rounded">content_copy</span>Адрес</button>` : ''}
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('[data-call-phone]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                initiatePhoneCall(btn.dataset.callPhone, btn.dataset.branchName || '');
            });
        });

        list.querySelectorAll('[data-filter-branch]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic('medium');
                const branchStr = btn.dataset.filterBranch;
                goto('catalog');
                let chipVal = '';
                const lower = branchStr.toLowerCase();
                if (lower.includes('цгб') || lower.includes('центральная городская')) chipVal = 'цгб';
                else if (lower.includes('цдб') || lower.includes('детская')) chipVal = 'цдб';
                else if (lower.includes('доброе') || lower.includes('филиал 4')) chipVal = 'ф4';
                else if (lower.includes('филиал 1') || lower.includes('ф-1')) chipVal = 'ф1';
                else if (lower.includes('филиал 10') || lower.includes('ф-10')) chipVal = 'ф10';
                else if (lower.includes('филиал 13') || lower.includes('ф-13')) chipVal = 'ф13';

                selectBranchChip(chipVal);
                opacState.branch = chipVal;
                opacState.page = 1;
                runSearch();
            });
        });

        list.querySelectorAll('[data-copy-addr]').forEach(btn => {
            btn.addEventListener('click', () => {
                copyText(btn.dataset.copyAddr);
                toast('Адрес скопирован в буфер 📋');
                haptic('light');
            });
        });
    } catch (e) {}
}

/* ── Инициализация приложения и подписка на события VK Bridge ── */
async function init() {
    initHome();
    initNews();
    initPhotoLightbox();
    initCatalog();
    initChat();
    initInoSearch();
    initAddToCommunity();
    initSocialButtons();
    buildBranchList();
    initSheetSwipeGesture();
    initWindowResizeManager();

    setTimeout(() => {
        const sub = $('#hero-sub');
        if (sub) sub.textContent = 'Сканирую охваты, ищу книги и шучу про SMM. Выбирай действие!';
    }, 4500);

    if (!window.vkBridge) return;

    // Глобальная подписка на входящие события VK Bridge
    window.vkBridge.subscribe((e) => {
        if (!e || !e.detail) return;
        const { type, data } = e.detail;

        if (type === 'VKWebAppUpdateConfig') {
            // Динамическое переключение темы
            const scheme = data?.scheme || data?.appearance || '';
            if (scheme.includes('light')) {
                document.documentElement.dataset.theme = 'light';
            } else if (scheme.includes('dark') || scheme.includes('space_gray')) {
                document.documentElement.dataset.theme = 'dark';
            }
            // Безопасные отступы (safe area insets)
            if (data?.insets) {
                if (typeof data.insets.top === 'number') {
                    document.documentElement.style.setProperty('--vk-safe-top', data.insets.top + 'px');
                }
                if (typeof data.insets.bottom === 'number') {
                    document.documentElement.style.setProperty('--vk-safe-bottom', data.insets.bottom + 'px');
                }
            }
        }

        // Физическая / жестовая кнопка «Назад» на устройствах Android
        if (type === 'VKWebAppBackButtonPressed') {
            if (!$('#photo-lightbox')?.classList.contains('hidden')) {
                closePhotoLightbox();
            } else if (!$('#book-sheet-backdrop')?.classList.contains('hidden')) {
                closeBookSheet();
            } else if ($('#stickers-sheet')?.classList.contains('is-open')) {
                toggleStickers(false);
            } else {
                const activeScreen = $('.screen.is-active')?.dataset.screen;
                if (activeScreen && activeScreen !== 'home') {
                    goto('home');
                }
            }
        }
    });

    try {
        await withTimeout(window.vkBridge.send('VKWebAppInit'), 3000);
        bridgeReady = true;

        // Получение информации о пользователе
        const user = await bridge('VKWebAppGetUserInfo');
        if (user && user.first_name) {
            vkUser = user;
            const heroTitle = $('#hero-title');
            if (heroTitle) heroTitle.textContent = `Привет, ${user.first_name}!`;
        }

        // Настройка статус-бара
        try {
            await withTimeout(window.vkBridge.send('VKWebAppSetViewSettings', {
                status_bar_style: document.documentElement.dataset.theme === 'light' ? 'dark' : 'light',
                action_bar_color: '#131726',
            }), 1500);
        } catch (e) {}
    } catch (e) {
        /* Запуск вне платформы ВКонтакте */
    }
}

init().catch(e => {
    window.__appErrs.push('init_err: ' + e.message);
});

})();
