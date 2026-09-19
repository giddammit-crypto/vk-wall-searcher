/* ==========================================================================
   VK Mini App «АВРОРА • Космо» — приложение (VK Bridge + API АВРОРЫ)
   ========================================================================== */
(() => {
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Внутри VK десктоп-iframe контент отдаётся через прокси-домен VK
// (prod-appXXX-pages-vk-apps.com) — все запросы к API только абсолютными URL
const BASE = location.hostname === 'biblioteka33.ru' ? '' : 'https://biblioteka33.ru';
const API = {
    opac: BASE + '/api/opac.php',
    chat: BASE + '/api/ai-proxy.php',
    ino: BASE + '/api/inoagent.php',
    miniapp: BASE + '/api/miniapp.php',
    vkproxy: BASE + '/api/vk-proxy.php',
    mascot: BASE + '/assets/images/mascot',
};
const EMOJI = ['waving', 'idle', 'smile', 'wink', 'love', 'laugh', 'cool', 'party', 'idea', 'thinking', 'shock', 'sad', 'tired', 'sleep', 'yawn', 'angry', 'read'];

let vkUser = null;
let bridgeReady = false;

/* ── VK Bridge (деградирует вне ВК): все вызовы с таймаутом —
   снаружи ВК VKWebAppInit может не резолвиться и подвесить init ── */
function withTimeout(promise, ms = 3000) {
    return Promise.race([
        promise,
        new Promise(res => setTimeout(() => res(null), ms)),
    ]);
}
async function bridge(method, params = {}) {
    if (!bridgeReady || !window.vkBridge) return null;
    try { return await withTimeout(window.vkBridge.send(method, params), 3000); }
    catch (e) { return null; }
}

function storageGet(key, fallback) {
    try { const v = localStorage.getItem('aurora_miniapp_' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
}
function storageSet(key, value) {
    try { localStorage.setItem('aurora_miniapp_' + key, JSON.stringify(value)); } catch (e) {}
    bridge('VKWebAppStorageSet', { key: 'aurora_miniapp_' + key, value: JSON.stringify(value) });
}
function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('hidden'), 2400);
}

/* ── Навигация ── */
function goto(screenName) {
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === screenName));
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.goto === screenName));
    window.scrollTo({ top: 0 });
}
$$('[data-goto]').forEach(el => el.addEventListener('click', () => goto(el.dataset.goto)));
$$('[data-scroll]').forEach(el => el.addEventListener('click', () => {
    goto('home');
    setTimeout(() => document.getElementById(el.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
}));

/* ── Главное: Космо + книга дня ── */
async function initHome() {
    const user = await bridge('VKWebAppGetUserInfo');
    if (user && user.first_name) {
        $('#hero-title').textContent = `Привет, ${user.first_name}!`;
    }
    try {
        const r = await fetch(`${API.miniapp}?action=book_of_day`);
        const d = await r.json();
        if (!d.ok) throw new Error('no data');
        const b = d.book;
        $('#quote-skeleton').classList.add('hidden');
        const body = $('#quote-body');
        body.classList.remove('hidden');
        body.innerHTML = `
            <img class="quote-cosmo" src="../assets/images/mascot/robot_read.png?v=4.64.2" alt="">
            <div>
                <div class="overline overline-gold" style="margin-bottom:4px">${esc(b.date_str || 'Книга дня')}</div>
                <div class="quote-title">${esc(b.title)}</div>
                <div class="quote-meta">${esc(b.author || '')} • ${esc(b.genre || '')}</div>
                <div class="quote-text">«${esc(b.hook || b.quote || '')}»</div>
            </div>`;
        $('#hero-cosmo').src = `../assets/images/mascot/robot_read.png?v=4.64.2`;
        setTimeout(() => { $('#hero-cosmo').src = `../assets/images/mascot/robot_idle.png?v=4.64.2`; }, 3000);
    } catch (e) {
        $('#quote-skeleton').classList.add('hidden');
        $('#quote-body').innerHTML = '<div class="quote-title">Книга дня сегодня недоступна 🙈</div>';
    }
    // Часовая интонация: вечером — сонный Космо
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) $('#hero-cosmo').src = `../assets/images/mascot/robot_yawn.png?v=4.64.2`;
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
    box.innerHTML = BRANCH_CHIPS.map((c, i) =>
        `<button class="chip${i === 0 ? ' is-active' : ''}" data-branch="${c.v}">${esc(c.label)}</button>`).join('');
    box.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('#branch-chips .chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        opacState.branch = chip.dataset.branch;
        opacState.page = 1;
        runSearch();
    });
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

function emptyState(kind) {
    const map = {
        empty: ['robot_sad', 'Космо ничего не нашёл', 'Попробуй изменить запрос или фильтры — в фондах АВРОРЫ ещё тысячи книг.', 'Сбросить фильтры'],
        error: ['robot_shock', 'Связь с каталогом потеряна', 'OPAC не ответил вовремя. Попробуй ещё раз через минуту.', 'Повторить'],
    };
    const [img, title, text, btn] = map[kind] || map.empty;
    $('#catalog-results').innerHTML = `
        <div class="empty-state">
            <img src="../assets/images/mascot/${img}.png?v=4.64.2" alt="">
            <div class="empty-title">${title}</div>
            <div class="empty-text">${text}</div>
            <button class="btn-cta" id="empty-retry">${btn}</button>
        </div>`;
    $('#empty-retry')?.addEventListener('click', () => { opacState.page = 1; runSearch(); });
}

function coverUrl(item) {
    return `${API.opac}?action=cover&title=${encodeURIComponent(item.title || '')}&author=${encodeURIComponent(item.author || '')}`;
}

function renderItems(items) {
    const box = $('#catalog-results');
    box.innerHTML = items.map((it, i) => {
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
        <article class="book-card" style="animation-delay:${Math.min(i, 8) * 60}ms">
            <img class="book-cover" loading="lazy" data-title="${esc(it.title || '')}" data-author="${esc(it.author || '')}"
                 src="${coverUrl(it)}" alt="Обложка">
            <div style="flex:1;min-width:0">
                <div class="book-title">${esc(it.title || 'Без названия')}</div>
                <div class="book-author">${esc(it.author || 'автор не указан')}${it.year ? ' • ' + esc(it.year) : ''}</div>
                <div class="book-branches">${badges.join('') || '<span class="branch-badge b-no">нет данных о наличии</span>'}</div>
            </div>
        </article>`;
    }).join('');
    box.querySelectorAll('img.book-cover').forEach(img => {
        img.addEventListener('error', () => {
            img.classList.add('is-empty');
            img.alt = 'нет обложки';
            img.removeAttribute('src');
        }, { once: true });
    });
}

async function runSearch() {
    const q = opacState.query.trim();
    if (!q) {
        $('#catalog-results').innerHTML = `
            <div class="empty-state">
                <img src="../assets/images/mascot/robot_thinking.png?v=4.64.2" alt="">
                <div class="empty-title">Что будем искать?</div>
                <div class="empty-text">Например: «Мастер и Маргарита», «Булгаков» или инвентарный номер</div>
            </div>`;
        $('#opac-pager').classList.add('hidden');
        $('#results-meta').classList.add('hidden');
        return;
    }
    const seq = ++searchSeq;
    skeletons();
    $('#opac-pager').classList.add('hidden');
    try {
        const params = new URLSearchParams({
            action: 'search', query: q, page: opacState.page, length: 6, include_copies: '1',
        });
        if (opacState.branch) params.set('branch', opacState.branch);
        if (opacState.onlyAvailable) params.set('only_available', '1');
        const r = await fetch(`${API.opac}?${params}`);
        const d = await r.json();
        if (seq !== searchSeq) return;
        const items = d.items || [];
        if (!items.length) { emptyState('empty'); return; }
        renderItems(items);
        const meta = $('#results-meta');
        meta.classList.remove('hidden');
        meta.textContent = `Найдено: ${d.total_found} • страница ${d.page} из ${d.total_pages || 1}`;
        opacState.totalPages = d.total_pages || 1;
        $('#opac-page-label').textContent = `${d.page} / ${d.total_pages || 1}`;
        $('#opac-pager').classList.remove('hidden');
        $('#opac-prev').disabled = d.page <= 1;
        $('#opac-next').disabled = d.page >= (d.total_pages || 1);
    } catch (e) {
        if (seq !== searchSeq) return;
        emptyState('error');
    }
}

function initCatalog() {
    buildBranchChips();
    let deb;
    $('#opac-query').addEventListener('input', (e) => {
        opacState.query = e.target.value;
        $('#opac-clear').classList.toggle('hidden', !e.target.value);
        clearTimeout(deb);
        deb = setTimeout(() => { opacState.page = 1; runSearch(); }, 550);
    });
    $('#opac-clear').addEventListener('click', () => {
        $('#opac-query').value = ''; opacState.query = '';
        $('#opac-clear').classList.add('hidden');
        runSearch();
    });
    $('#only-available').addEventListener('change', (e) => {
        opacState.onlyAvailable = e.target.checked; opacState.page = 1; runSearch();
    });
    $('#opac-prev').addEventListener('click', () => { if (opacState.page > 1) { opacState.page--; runSearch(); } });
    $('#opac-next').addEventListener('click', () => { if (opacState.page < opacState.totalPages) { opacState.page++; runSearch(); } });
    runSearch();
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

function chatBubble(role, html, sticker = null) {
    const list = $('#chat-list');
    if (sticker) {
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-bot"><img class="chat-sticker" src="${API.mascot}/robot_${esc(sticker)}.png?v=4.64.2" alt="${esc(sticker)}"></div>`);
    } else if (role === 'user') {
        list.insertAdjacentHTML('beforeend', `<div class="chat-msg msg-user"><div class="chat-bubble">${html}</div></div>`);
    } else {
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-msg msg-bot">
                <img class="chat-avatar" src="${API.mascot}/robot_smile.png?v=4.64.2" alt="">
                <div class="chat-bubble bubble-bot">${html}</div>
            </div>`);
    }
    list.scrollTop = list.scrollHeight;
}
function typingOn() {
    chatBubble('bot', '<img class="chat-cosmo-mini" src="../assets/images/mascot/robot_thinking.png?v=4.64.2" alt=""> <span class="typing-dots"><i></i><i></i><i></i></span>');
}
function typingOff() {
    const list = $('#chat-list');
    const msgs = [...list.querySelectorAll('.chat-msg')];
    const last = msgs[msgs.length - 1];
    if (last && last.querySelector('.typing-dots')) last.remove();
}

async function sendChat(text) {
    if (chatBusy || !text.trim()) return;
    chatBusy = true;
    chatBubble('user', esc(text));
    chatHistory.push({ role: 'user', content: text });
    chatHistory = chatHistory.slice(-8);
    typingOn();
    try {
        const r = await fetch(API.chat, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory],
                temperature: 0.4, max_tokens: 1200,
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
        chatBubble('bot', esc(reply).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'), sticker);
        chatHistory.push({ role: 'assistant', content: reply });
        chatHistory = chatHistory.slice(-8);
        storageSet('chat_history', chatHistory);
    } catch (e) {
        typingOff();
        chatBubble('bot', esc('Связь с ИИ прервалась 🛰️ Попробуй ещё раз через минуту!'));
    }
    chatBusy = false;
}

function buildStickers() {
    const grid = $('#stickers-grid');
    grid.innerHTML = EMOJI.map(e =>
        `<img src="${API.mascot}/robot_${e}.png?v=4.64.2" alt="${e}" data-emo="${e}" loading="lazy">`).join('');
    grid.addEventListener('click', (e) => {
        const img = e.target.closest('img[data-emo]');
        if (!img) return;
        const emo = img.dataset.emo;
        chatBubble('bot', '', emo);
        $('#stickers-sheet').classList.remove('is-open');
    });
    $('#stickers-btn').addEventListener('click', () => $('#stickers-sheet').classList.add('is-open'));
    $('#stickers-close').addEventListener('click', () => $('#stickers-sheet').classList.remove('is-open'));
}

function initChat() {
    buildStickers();
    (chatHistory || []).forEach(m => {
        if (m.role === 'user') chatBubble('user', esc(m.content));
        else if (m.role === 'assistant') chatBubble('bot', esc(m.content).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'));
    });
    const send = () => {
        const input = $('#chat-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendChat(text);
    };
    $('#chat-send').addEventListener('click', send);
    $('#chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    const moods = $('#mood-chips');
    MOODS.forEach(m => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = `${m.emo} ${m.label}`;
        chip.addEventListener('click', () => sendChat(m.prompt));
        moods.appendChild(chip);
    });
}

/* ── Ещё: Иноагенты + филиалы ── */
async function searchIno(query) {
    const box = $('#ino-results');
    if (!query.trim()) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="sk sk-line" style="width:80%"></div><div class="sk sk-line" style="width:60%"></div>';
    try {
        const r = await fetch(`${API.ino}?action=search&query=${encodeURIComponent(query)}&limit=5`);
        const d = await r.json();
        const vals = d.values || [];
        if (!vals.length) {
            box.innerHTML = '<div class="ino-card"><div class="ino-name">В реестре не найдено 🟢</div><div class="ino-meta">Совпадений по запросу нет. Для точной сверки используйте официальный реестр Минюста.</div></div>';
            return;
        }
        box.innerHTML = vals.map(v => `
            <div class="ino-card">
                <div class="ino-name">${esc(v.name)}</div>
                <span class="ino-badge ${v.is_active ? 'is-agent' : 'not-agent'}">${esc(v.status_label || (v.is_active ? 'В реестре' : 'Исключён'))}</span>
                <div class="ino-meta">${esc([v.reg_num && '№ ' + v.reg_num, v.type_label, v.inclusion_date && 'включён ' + v.inclusion_date].filter(Boolean).join(' • '))}</div>
                ${v.aliases?.length ? `<div class="ino-meta">Псевдонимы: ${esc(v.aliases.join(', '))}</div>` : ''}
            </div>`).join('');
    } catch (e) {
        box.innerHTML = '<div class="ino-card"><div class="ino-name">Реестр недоступен</div></div>';
    }
}

function initAddToCommunity() {
    const btn = $('#add-to-community');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!bridgeReady || !window.vkBridge) {
            toast('Доступно внутри ВКонтакте — открой приложение из сообщества');
            return;
        }
        try {
            await window.vkBridge.send('VKWebAppAddToCommunity');
            toast('Готово! Приложение добавлено в сообщество ✅');
        } catch (e) {
            if (e?.error_data?.error_code === 4) toast('Отменено');
            else toast('Не получилось — добавь через меню «⋯» приложения');
        }
    });
}

async function buildBranchList() {
    try {
        const r = await fetch(`${API.miniapp}?action=branches`);
        const d = await r.json();
        const branches = (d.branches || []).slice(0, 18);
        $('#branch-list').innerHTML = branches.map(b => `
            <div class="branch-card">
                <div class="branch-name">${esc(b.branch_num || '')} — ${esc(b.branch_name || '')}</div>
                <div class="branch-addr">${esc(b.address || '')}</div>
                ${b.phone ? `<a class="branch-phone" href="tel:${esc(b.phone.split(',')[0].replace(/[^\d+]/g, ''))}">${esc(b.phone.split(',')[0])}</a>` : ''}
            </div>`).join('');
    } catch (e) { /* филиалы не критичны */ }
}

/* ── Запуск ── */
async function init() {
    // UI запускаем сразу — VK Bridge подхватывается параллельно и не блокирует
    initHome();
    initCatalog();
    initChat();
    initAddToCommunity();
    buildBranchList();
    setTimeout(() => {
        $('#hero-sub').textContent = 'Сканирую охваты, ищу книги и шучу про SMM. Выбирай действие!';
    }, 4000);

    if (!window.vkBridge) return;
    try {
        await withTimeout(window.vkBridge.send('VKWebAppInit'), 2500);
        bridgeReady = true;
        const cfg = await bridge('VKWebAppUpdateConfig', {});
        const scheme = cfg?.scheme || cfg?.appearance || '';
        if (scheme.includes('light')) document.documentElement.dataset.theme = 'light';
        const user = await bridge('VKWebAppGetUserInfo');
        if (user && user.first_name) {
            $('#hero-title').textContent = `Привет, ${user.first_name}!`;
        }
        try {
            await withTimeout(window.vkBridge.send('VKWebAppSetViewSettings', {
                status_bar_style: document.documentElement.dataset.theme === 'light' ? 'dark' : 'light',
                action_bar_color: '#131726',
            }), 1500);
        } catch (e) {}
    } catch (e) { /* вне ВК */ }
}

init().catch(e => { document.title = 'MIAPP ERR: ' + e.message; });
})();
