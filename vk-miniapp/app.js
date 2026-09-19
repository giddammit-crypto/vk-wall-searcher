/* ==========================================================================
   VK Mini App «АВРОРА • Космо» — приложение (VK Bridge + API АВРОРЫ)
   Версия: 1.1.0
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
}

$$('[data-goto]').forEach(el => el.addEventListener('click', () => goto(el.dataset.goto)));
$$('[data-scroll]').forEach(el => el.addEventListener('click', () => {
    goto('home');
    setTimeout(() => document.getElementById(el.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
}));

window.addEventListener('popstate', (e) => {
    // Если открыта шторка книги — закрываем её
    if (!$('#book-sheet-backdrop')?.classList.contains('hidden')) {
        closeBookSheet(false);
        return;
    }
    // Если открыта панель стикеров — закрываем её
    if ($('#stickers-sheet')?.classList.contains('is-open')) {
        $('#stickers-sheet').classList.remove('is-open');
        return;
    }
    const screen = e.state?.screen || (location.hash ? location.hash.replace('#', '') : 'home');
    if (['home', 'catalog', 'chat', 'more'].includes(screen)) {
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

function renderItems(items) {
    currentSearchItems = items || [];
    opacItemsMap = {};
    const box = $('#catalog-results');
    if (!box) return;

    box.innerHTML = items.map((it, i) => {
        const idKey = it.id || ('item_' + i);
        opacItemsMap[idKey] = it;
        const copies = it.copies || [];
        const byBranch = {};
        copies.forEach(c => {
            const name = c.branch_name || c.location || 'Филиал';
            byBranch[name] = byBranch[name] || { free: 0, total: 0 };
            byBranch[name].total++;
            if (c.is_available) byBranch[name].free++;
        });
        const badges = Object.entries(byBranch).slice(0, 3).map(([name, b]) => {
            const cls = b.free > 1 ? 'b-ok' : (b.free === 1 ? 'b-low' : 'b-no');
            const ico = b.free > 0 ? 'check_circle' : 'cancel';
            return `<span class="branch-badge ${cls}"><span class="material-symbols-rounded">${ico}</span>${esc(name)}: ${b.free}/${b.total}</span>`;
        });

        return `
        <article class="book-card" data-book-id="${esc(idKey)}" style="animation-delay:${Math.min(i, 8) * 50}ms">
            <img class="book-cover" loading="lazy" data-title="${esc(it.title || '')}" data-author="${esc(it.author || '')}"
                 src="${coverUrl(it)}" alt="Обложка">
            <div style="flex:1;min-width:0">
                <div class="book-title">${esc(it.title || 'Без названия')}</div>
                <div class="book-author">${esc(it.author || 'автор не указан')}${it.year ? ' • ' + esc(it.year) : ''}</div>
                <div class="book-branches">${badges.join('') || '<span class="branch-badge b-no">нет данных о наличии</span>'}</div>
            </div>
            <span class="material-symbols-rounded" style="color:var(--text-dim);font-size:20px;align-self:center">chevron_right</span>
        </article>`;
    }).join('');

    box.querySelectorAll('img.book-cover').forEach(img => {
        img.addEventListener('error', () => {
            img.classList.add('is-empty');
            img.alt = 'нет обложки';
            img.removeAttribute('src');
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
}

/* ── Шторка деталей книги (Bottom Sheet) ── */
function openBookSheet(item) {
    const backdrop = $('#book-sheet-backdrop');
    const content = $('#book-sheet-content');
    if (!backdrop || !content) return;

    const copies = item.copies || [];
    let freeCopies = 0;
    const byBranch = {};
    copies.forEach(c => {
        const name = c.branch_name || c.location || 'Библиотека';
        byBranch[name] = byBranch[name] || {
            free: 0,
            total: 0,
            address: c.branch_address || '',
            phone: c.branch_phone || '',
            location: c.location || '',
        };
        byBranch[name].total++;
        if (c.is_available) {
            byBranch[name].free++;
            freeCopies++;
        }
    });

    const availBadge = freeCopies > 0
        ? `<span class="sheet-avail-pill b-ok"><span class="material-symbols-rounded">check_circle</span>Свободно ${freeCopies} из ${copies.length || 1} экз.</span>`
        : `<span class="sheet-avail-pill b-no"><span class="material-symbols-rounded">cancel</span>Все ${copies.length || 1} экз. выданы</span>`;

    // Формирование карточек филиалов
    const branchesHtml = Object.entries(byBranch).map(([name, b]) => {
        const statusBadge = b.free > 0
            ? `<span class="branch-badge b-ok"><span class="material-symbols-rounded">check_circle</span>Доступно: ${b.free}/${b.total}</span>`
            : `<span class="branch-badge b-no"><span class="material-symbols-rounded">cancel</span>Выдана: ${b.total} экз.</span>`;
        const cleanPhone = b.phone ? b.phone.split(',')[0].replace(/[^\d+]/g, '') : '';

        return `
        <div class="sheet-branch-card">
            <div class="sheet-branch-header">
                <span class="sheet-branch-name">${esc(name)}</span>
                ${statusBadge}
            </div>
            ${b.address ? `<div class="sheet-branch-addr"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">location_on</span> ${esc(b.address)}</div>` : ''}
            <div class="sheet-branch-actions">
                ${cleanPhone ? `<a class="branch-pill-btn" href="tel:${cleanPhone}"><span class="material-symbols-rounded">call</span>Позвонить</a>` : ''}
                ${b.address ? `<button class="branch-card-btn" data-copy-addr="${esc(b.address)}"><span class="material-symbols-rounded">content_copy</span>Адрес</button>` : ''}
            </div>
        </div>`;
    }).join('') || '<div class="fine-print">Данные о распределении по филиалам уточняются в ЦГБ.</div>';

    // Формирование аннотации/описания
    let annotation = item.annotation || '';
    if (!annotation && Array.isArray(item.shotform_raw)) {
        annotation = item.shotform_raw.join(' ');
    }

    content.innerHTML = `
        <div class="sheet-hero">
            <div class="sheet-cover-box" id="sheet-cover-container">
                <img src="${coverUrl(item)}" alt="Обложка" onerror="this.parentElement.classList.add('is-empty');this.remove();this.parentElement.textContent='нет обложки';">
            </div>
            <div class="sheet-meta-info">
                <div class="sheet-title">${esc(item.title || 'Без названия')}</div>
                <div class="sheet-author">${esc(item.author || 'Автор не указан')}</div>
                ${item.imprint || item.year ? `<div class="sheet-imprint">${esc(item.imprint || (item.year + ' г.'))}</div>` : ''}
                ${item.shelfmark ? `<div class="sheet-code">ББК/Шифр: <strong>${esc(item.shelfmark)}</strong></div>` : ''}
                ${availBadge}
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
            <button class="sheet-act-btn" id="sheet-btn-copy">
                <span class="material-symbols-rounded">content_copy</span>
                <span>Инфо</span>
            </button>
        </div>

        ${annotation ? `
        <div>
            <div class="sheet-section-title">Библиографическое описание</div>
            <div class="sheet-annotation">${esc(annotation)}</div>
        </div>` : ''}

        <div>
            <div class="sheet-section-title">Наличие в библиотеках города (${copies.length} экз.)</div>
            <div class="sheet-branches-list">${branchesHtml}</div>
        </div>
    `;

    // Копирование адреса филиала
    content.querySelectorAll('[data-copy-addr]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyText(btn.dataset.copyAddr);
            toast('Адрес скопирован в буфер 📋');
            haptic('light');
        });
    });

    // Действия шторки
    $('#sheet-btn-ask')?.addEventListener('click', () => {
        closeBookSheet();
        goto('chat');
        sendChat(`Расскажи подробнее о книге «${item.title}» (${item.author || 'автор не указан'}): сюжет, главные мысли и кому понравится?`);
    });

    $('#sheet-btn-share')?.addEventListener('click', async () => {
        haptic('light');
        const text = `📖 «${item.title}» — ${item.author || 'автор не указан'}\nКнига найдена в каталоге библиотек Владимира (ЦБС).\nИщи в приложении АВРОРА • Космо!`;
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
        const text = `${item.title} — ${item.author || ''} ${item.year ? '(' + item.year + ')' : ''}${item.shelfmark ? ' [ББК: ' + item.shelfmark + ']' : ''}`;
        copyText(text);
        toast('Название и шифр скопированы 📋');
        haptic('light');
    });

    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    haptic('light');

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
    if (popHist && history.state?.modal === 'book') {
        history.back();
    }
}

$('#book-sheet-close')?.addEventListener('click', () => closeBookSheet());
$('#book-sheet-backdrop')?.addEventListener('click', (e) => {
    if (e.target === $('#book-sheet-backdrop')) closeBookSheet();
});

async function runSearch() {
    const q = opacState.query.trim();
    if (!q) {
        $('#catalog-results').innerHTML = `
            <div class="empty-state">
                <img src="${API.mascot}/robot_thinking.png?v=4.64.2" alt="">
                <div class="empty-title">Что будем искать?</div>
                <div class="empty-text">Например: «Мастер и Маргарита», «Булгаков» или инвентарный номер</div>
            </div>`;
        $('#opac-pager')?.classList.add('hidden');
        $('#results-meta')?.classList.add('hidden');
        return;
    }
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
        $('#opac-query').value = '';
        opacState.query = '';
        $('#opac-clear').classList.add('hidden');
        haptic('light');
        runSearch();
    });
    $('#only-available')?.addEventListener('change', (e) => {
        opacState.onlyAvailable = e.target.checked;
        opacState.page = 1;
        haptic('selection');
        runSearch();
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
    'Ты — Космо, дружелюбный робот-помощник сети библиотек г. Владимира (18 библиотек: ЦГБ, ЦДБ и филиалы №1-16, сайт biblioteka33.ru).',
    'Говори о себе в мужском роде, обращайся к пользователю на «вы».',
    'Помогаешь: подобрать книги (формат: **«Название»** — Автор. + 1-2 предложения без спойлеров), рассказать о филиалах, объяснить аналитику ВК.',
    'Не выдумывай книги и цифры. Не рекомендуй авторов из реестра иноагентов РФ. Ответ — до 200 слов, живо и тепло.'
].join(' ');

const MOODS = [
    { emo: '🔥', label: 'Драйв', prompt: 'Хочу пост с драйвом и энергией!' },
    { emo: '☕', label: 'Уют', prompt: 'Хочу уютную атмосферную подборку!' },
    { emo: '🧩', label: 'Детектив', prompt: 'Посоветуй детективы и остросюжетное!' },
    { emo: '🚀', label: 'Фантастика', prompt: 'Посоветуй научную фантастику!' },
];

let chatHistory = storageGet('chat_history', []);
let chatBusy = false;
let currentTtsAudio = null;
let currentPlayingBtn = null;

function chatBubble(role, html, sticker = null, rawText = '') {
    const list = $('#chat-list');
    if (!list) return;

    if (sticker) {
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-bot">
                <img class="chat-sticker" src="${API.mascot}/robot_${esc(sticker)}.png?v=4.64.2" alt="${esc(sticker)}">
            </div>`);
    } else if (role === 'user') {
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-user">
                <div class="chat-bubble">${html}</div>
            </div>`);
    } else {
        const bubbleId = 'bubble_' + Math.random().toString(36).substring(2, 9);
        const ttsBtnHtml = rawText ? `
            <button class="chat-tts-btn" data-tts-text="${esc(rawText)}" aria-label="Озвучить ответ">
                <span class="material-symbols-rounded">volume_up</span>
                <span>Озвучить</span>
            </button>` : '';

        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-bot" id="${bubbleId}">
                <img class="chat-avatar" src="${API.mascot}/robot_smile.png?v=4.64.2" alt="">
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
            <img class="chat-avatar" src="${API.mascot}/robot_thinking.png?v=4.64.2" alt="">
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

    // Если сейчас уже играет это аудио — останавливаем
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
            const fullAudioUrl = d.audio_url.startsWith('http') ? d.audio_url : API.tts + d.audio_url;
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

    // Fallback на Web Speech API
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

    chatBubble('user', esc(text));
    chatHistory.push({ role: 'user', content: text });
    chatHistory = chatHistory.slice(-8);
    typingOn();
    haptic('medium');

    try {
        const r = await fetch(API.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory],
                temperature: 0.45,
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

        const formattedHtml = esc(reply).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        chatBubble('bot', formattedHtml, sticker, reply);

        chatHistory.push({ role: 'assistant', content: reply });
        chatHistory = chatHistory.slice(-8);
        storageSet('chat_history', chatHistory);
        haptic('light');
    } catch (e) {
        typingOff();
        chatBubble('bot', esc('Связь с ИИ прервалась 🛰️ Попробуй ещё раз через минуту!'));
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

function buildStickers() {
    const grid = $('#stickers-grid');
    if (!grid) return;
    grid.innerHTML = EMOJI.map(e =>
        `<img src="${API.mascot}/robot_${e}.png?v=4.64.2" alt="${e}" data-emo="${e}" loading="lazy">`).join('');
    grid.addEventListener('click', (e) => {
        const img = e.target.closest('img[data-emo]');
        if (!img) return;
        const emo = img.dataset.emo;
        haptic('medium');
        chatBubble('bot', '', emo);
        $('#stickers-sheet')?.classList.remove('is-open');
    });
    $('#stickers-btn')?.addEventListener('click', () => {
        haptic('light');
        $('#stickers-sheet')?.classList.add('is-open');
    });
    $('#stickers-close')?.addEventListener('click', () => {
        haptic('light');
        $('#stickers-sheet')?.classList.remove('is-open');
    });
}

function initChat() {
    buildStickers();
    (chatHistory || []).forEach(m => {
        if (m.role === 'user') {
            chatBubble('user', esc(m.content));
        } else if (m.role === 'assistant') {
            const formatted = esc(m.content).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            chatBubble('bot', formatted, null, m.content);
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
                    <img class="chat-avatar" src="${API.mascot}/robot_smile.png?v=4.64.2" alt="">
                    <div class="chat-bubble bubble-bot">Диалог очищен ✨ Я готов к новым вопросам о книгах и библиотеках!</div>
                </div>`;
        }
        toast('История диалога очищена');
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
        $('#ino-query').value = '';
        $('#ino-clear').classList.add('hidden');
        $('#ino-results').innerHTML = '';
        haptic('light');
    });
}

function initAddToCommunity() {
    const btn = $('#add-to-community');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        haptic('medium');
        if (!bridgeReady || !window.vkBridge) {
            toast('Доступно внутри ВКонтакте — открой приложение из сообщества');
            return;
        }
        try {
            await window.vkBridge.send('VKWebAppAddToCommunity');
            toast('Готово! Приложение добавлено в сообщество ✅');
            haptic('success');
        } catch (e) {
            if (e?.error_data?.error_code === 4) toast('Отменено');
            else toast('Добавьте через меню «⋯» приложения');
        }
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
            const cleanPhone = b.phone ? b.phone.split(',')[0].replace(/[^\d+]/g, '') : '';
            return `
            <div class="branch-card">
                <div class="branch-name">${esc(b.branch_num || '')} — ${esc(b.branch_name || '')}</div>
                <div class="branch-addr"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">location_on</span> ${esc(b.address || '')}</div>
                <div class="branch-card-actions">
                    ${cleanPhone ? `<a class="branch-pill-btn" href="tel:${cleanPhone}"><span class="material-symbols-rounded">call</span>Позвонить</a>` : ''}
                    <button class="branch-card-btn" data-filter-branch="${esc(b.branch_num || b.branch_name || '')}"><span class="material-symbols-rounded">search</span>Книги филиала</button>
                    ${b.address ? `<button class="branch-card-btn" data-copy-addr="${esc(b.address)}"><span class="material-symbols-rounded">content_copy</span>Адрес</button>` : ''}
                </div>
            </div>`;
        }).join('');

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
    initCatalog();
    initChat();
    initInoSearch();
    initAddToCommunity();
    initSocialButtons();
    buildBranchList();

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
            if (!$('#book-sheet-backdrop')?.classList.contains('hidden')) {
                closeBookSheet();
            } else if ($('#stickers-sheet')?.classList.contains('is-open')) {
                $('#stickers-sheet').classList.remove('is-open');
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
