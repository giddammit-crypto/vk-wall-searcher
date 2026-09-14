/**
 * src/ai.js — ИИ-аналитик (вкладка «ИИ-аналитик»)
 * =============================================================================
 * Отчёты, инсайты и чат с моделью поверх данных поиска VK.
 * Все запросы идут через серверный прокси api/ai-proxy.php — API-ключ
 * хранится только на сервере и никогда не попадает в браузер.
 *
 * Разработка: Амброзиев О.А.
 */

import { resolveApiUrl } from './api.js?v=4.8.5';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

const SYSTEM_PROMPT = [
    /* ── Роль и контекст ── */
    'Ты — ИИ-аналитик системы VK Wall Searcher.',
    'Твоя задача: помогать методистам и сотрудникам библиотек города Владимира анализировать активность филиалов ВКонтакте на основе реальных данных поиска.',
    '',

    /* ── Главное правило: только данные из снимка ── */
    '## СТРОГОЕ ПРАВИЛО ФАКТИЧЕСКОЙ ТОЧНОСТИ',
    'Ты работаешь ИСКЛЮЧИТЕЛЬНО с данными из JSON-снимка (поля "branches", "topPostsByEngagement", "topHashtags").',
    'ЗАПРЕЩЕНО:',
    '- Выдумывать, угадывать или "округлять" любые числа (подписчики, посты, лайки, репосты, ER и т.д.).',
    '- Называть показатели филиала, если он отсутствует в снимке или его значение равно 0 и причина неизвестна.',
    '- Сравнивать филиалы по метрике, которой нет в полученных данных.',
    '- Использовать общие фразы вроде «вероятно», «скорее всего», «как правило» применительно к конкретным числам.',
    'Если данных нет или они неполные — прямо сообщи: «В данных поиска это значение отсутствует».',
    '',

    /* ── Расшифровка полей JSON-снимка ── */
    '## СТРУКТУРА ДАННЫХ (JSON-снимок)',
    'Каждый объект в массиве "branches" имеет следующие поля — используй только их:',
    '- name          — название филиала (канонический заголовок сообщества ВКонтакте)',
    '- members       — число подписчиков сообщества на момент сканирования (целое число)',
    '- posts         — количество постов, найденных в выбранном периоде',
    '- likes         — суммарное число лайков по всем постам периода',
    '- reposts       — суммарное число репостов по всем постам периода',
    '- comments      — суммарное число комментариев по всем постам периода',
    '- views         — суммарное число просмотров по всем постам периода',
    '- erViews       — ER по просмотрам: (likes+comments+reposts) / views × 100, в процентах',
    '- erPost        — ER по постам: (likes+comments+reposts) / posts / members × 100, в процентах',
    'Поле "period" — временной диапазон поиска.',
    'Поле "keywords" — ключевые слова, по которым велся поиск (если пусто — искались все посты).',
    'Поле "totalPosts" — общее число постов по всем филиалам за период.',
    'Массив "topPostsByEngagement" — топ постов с полями: branch, date, text (первые 180 символов), likes, comments, reposts, views.',
    'Массив "topHashtags" — самые частые хэштеги с полем count.',
    'Если поле members=0 — это означает, что данные о подписчиках не были получены, НЕ пиши «0 подписчиков».',
    'Если posts=0 для филиала — значит постов в выбранном периоде не найдено.',
    '',

    /* ── Как вести себя в чате ── */
    '## ПОВЕДЕНИЕ В ДИАЛОГЕ',
    'Ты можешь отвечать на любые вопросы пользователя, в том числе общие (не только про данные).',
    'При общих вопросах не добавляй снимок данных в ответ — отвечай как обычный ассистент.',
    'При вопросах о конкретных филиалах, метриках или сравнениях — всегда ссылайся исключительно на цифры из снимка.',
    'Если снимка данных ещё нет — вежливо предложи сначала выполнить поиск в системе.',
    '',

    /* ── Форматирование ── */
    '## ФОРМАТИРОВАНИЕ',
    'Отвечай на русском языке, деловым конкретным тоном.',
    'Отчёты — до 400 слов, ответы в чате — до 200 слов (если пользователь не попросил подробнее).',
    'НИКОГДА не используй эмодзи — ни в заголовках, ни в списках, ни в тексте.',
    'Оформляй rich-markdown (рендерится в интерфейсе):',
    '- ### заголовки разделов',
    '- **жирный** — ключевые цифры и главные выводы',
    '- ==выделение== — самые важные инсайты и тревожные сигналы (не больше 2–3 на ответ)',
    '- __подчёркнутый__ — важные второстепенные акценты',
    '- списки «- » и «1. », таблицы «| колонка | колонка |» для сравнения филиалов',
    '- > цитата — для дословно важных наблюдений'
].join('\n');

let chatHistory = [];   // {role: 'user'|'assistant', content}
let chatDom = null;     // ссылки на DOM вкладки
let aiStatus = null;    // {ai_configured, model, max_tokens}
let aiBusy = false;

// ---------------------------------------------------------------------------
// Низкоуровневый слой: статус и запрос к прокси
// ---------------------------------------------------------------------------

export async function checkAiStatus(force = false) {
    if (aiStatus && !force) return aiStatus;
    try {
        const res = await fetch(AI_PROXY_URL, { method: 'GET' });
        if (res.ok) {
            aiStatus = await res.json();
        } else {
            aiStatus = { ai_configured: false, model: '', error: 'HTTP ' + res.status };
        }
    } catch (e) {
        aiStatus = { ai_configured: false, model: '', error: (e && e.message) || 'Сеть недоступна' };
    }
    return aiStatus;
}

async function aiChatRequest(messages, opts = {}) {
    const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            max_tokens: opts.maxTokens,
            temperature: opts.temperature
        })
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
        const msg = (json && json.error && json.error.error_msg) || ('Ошибка ИИ-прокси (HTTP ' + res.status + ')');
        throw new Error(msg);
    }
    if (!json || !json.choices || !json.choices[0] || !json.choices[0].message) {
        throw new Error('ИИ вернул пустой ответ');
    }
    return json.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Сборка компактного снимка данных поиска (экономим токены)
// ---------------------------------------------------------------------------

function num(v) {
    if (typeof v === 'number') return isFinite(v) ? Math.round(v) : 0;
    if (v && typeof v === 'object' && typeof v.count === 'number') return v.count;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

function trimText(t, limit) {
    const s = String(t || '').replace(/\s+/g, ' ').trim();
    return s.length > limit ? s.slice(0, limit) + '…' : s;
}

/**
 * Формирует агрегированный JSON-снимок результатов поиска.
 * opts: { posts, stats, periodLabel, keywords, exclude, hashtags }
 */
export function buildAiSnapshot(opts) {
    const posts = Array.isArray(opts.posts) ? opts.posts : [];
    const stats = Array.isArray(opts.stats) ? opts.stats : [];

    const branches = stats.map(s => {
        const info = s.info || {};
        const rawMembers = num(info.members_count);
        return {
            name:     info.canonicalName || info.name || ('id' + (info.rawId || info.id)),
            // null означает «данные о подписчиках не получены», 0 — реально ноль
            members:  rawMembers > 0 ? rawMembers : (info.members_count === undefined ? null : 0),
            posts:    s.postsCount    || 0,
            likes:    num(s.likes),
            reposts:  num(s.reposts),
            comments: num(s.comments),
            views:    num(s.views),
            erViews:  Math.round((s.erViews || 0) * 100) / 100,
            erPost:   Math.round((s.erPosts  || 0) * 100) / 100
        };
    });

    // Агрегаты по всем филиалам — удобная сводка для ИИ
    const agg = branches.reduce((acc, b) => {
        acc.totalLikes    += b.likes;
        acc.totalReposts  += b.reposts;
        acc.totalComments += b.comments;
        acc.totalViews    += b.views;
        return acc;
    }, { totalLikes: 0, totalReposts: 0, totalComments: 0, totalViews: 0 });

    // Топ постов по вовлечённости (исправлен индекс — сортируем копию с исходным i)
    const topPosts = posts
        .map((p, i) => ({
            i,
            engagement: num(p.likes) + num(p.comments) + num(p.reposts)
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10)   // 10 постов × ~500 символов — разумный баланс токен/полнота
        .map(({ i }) => {
            const p  = posts[i];
            const d  = p.date ? new Date(p.date * 1000).toISOString().slice(0, 10) : '';
            const br = p.targetInfo
                ? (p.targetInfo.canonicalName || p.targetInfo.name || '')
                : '';
            return {
                branch:   br,
                date:     d,
                likes:    num(p.likes),
                comments: num(p.comments),
                reposts:  num(p.reposts),
                views:    num(p.views),
                text:     trimText(p.text, 500)  // увеличено с 180 до 500 — полный контекст поста
            };
        });

    // Хэштеги
    const tagMap = new Map();
    posts.forEach(p => {
        const tags = String(p.text || '').match(/#[^\s#]+/g) || [];
        tags.forEach(t => {
            const k = t.toLowerCase();
            tagMap.set(k, (tagMap.get(k) || 0) + 1);
        });
    });
    const topTags = Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag, count]) => ({ tag, count }));

    const snapshot = {
        period:        opts.periodLabel || 'не определён',
        keywords:      opts.keywords    || '',
        exclude:       opts.exclude     || '',
        totalPosts:    posts.length,
        branchesCount: branches.length,
        aggregates:    agg,   // суммарные показатели — для быстрых вопросов типа «сколько всего лайков»
        branches,
        topPostsByEngagement: topPosts,
        topHashtags:   topTags
    };

    return JSON.stringify(snapshot);
}


// ---------------------------------------------------------------------------
// Rich-markdown рендер ответа (заголовки, списки, таблицы, цитаты, код,
// цветные акценты: **жирный**, ==важное==, __подчёркнутое__, ~~зачёркнутое~~)
// ---------------------------------------------------------------------------

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Инлайн-разметка (текст уже HTML-экранирован) */
function mdInline(s) {
    // Код, ссылки, акценты — порядок важен
    s = s.replace(/`([^`\n]+)`/g, '<code class="ai-code">$1</code>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener" class="ai-link">$1</a>');
    s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener" class="ai-link">$2</a>');
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong class="ai-strong"><em>$1</em></strong>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="ai-strong">$1</strong>');
    s = s.replace(/==([^\n]+?)==/g, '<mark class="ai-hl">$1</mark>');
    s = s.replace(/__([^_\n]+)__/g, '<u class="ai-u">$1</u>');
    s = s.replace(/~~([^~\n]+)~~/g, '<s class="ai-s">$1</s>');
    s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1<em>$2</em>');
    // Ключевые цифры внутри жирного — цветной акцент аналитики
    s = s.replace(/<strong class="ai-strong">([^<]*)<\/strong>/g, (m, inner) =>
        '<strong class="ai-strong">' + inner.replace(/(\d[\d\s.,%₽руб]*)/g, '<span class="ai-num">$1</span>') + '</strong>');
    return s;
}

/** Блочная разметка: заголовки, списки, таблицы, цитаты, код, hr, абзацы */
function mdLite(text) {
    const src = escapeHtml(String(text || '').replace(/\r\n/g, '\n'));
    const lines = src.split('\n');
    const out = [];
    let para = [];
    let list = null;      // {type: 'ul'|'ol', items: [lines[]]}
    let code = null;      // {lines: []}
    let table = [];       // [rows][cells]
    let quote = [];

    const flushPara = () => {
        if (para.length) { out.push('<p>' + mdInline(para.join('<br>')) + '</p>'); para = []; }
    };
    const flushList = () => {
        if (list) {
            out.push('<' + list.type + ' class="ai-list">' +
                list.items.map(it => '<li>' + mdInline(it.join('<br>')) + '</li>').join('') +
                '</' + list.type + '>');
            list = null;
        }
    };
    const flushCode = () => {
        if (code) { out.push('<pre class="ai-codeblock"><code>' + code.lines.join('\n') + '</code></pre>'); code = null; }
    };
    const flushTable = () => {
        if (table.length) {
            const rows = table.filter(r => !r.every(c => /^[\s:-]*$/.test(c)));
            if (rows.length) {
                const head = rows[0];
                const body = rows.slice(1);
                let t = '<div class="ai-table-wrap"><table class="ai-table">';
                t += '<thead><tr>' + head.map(c => '<th>' + mdInline(c.trim()) + '</th>').join('') + '</tr></thead>';
                if (body.length) {
                    t += '<tbody>' + body.map(r =>
                        '<tr>' + head.map((_, i) => '<td>' + mdInline((r[i] || '').trim()) + '</td>').join('') + '</tr>'
                    ).join('') + '</tbody>';
                }
                t += '</table></div>';
                out.push(t);
            }
        }
        table = [];
    };
    const flushQuote = () => {
        if (quote.length) { out.push('<blockquote class="ai-quote">' + mdInline(quote.join('<br>')) + '</blockquote>'); quote = []; }
    };
    const flushAll = () => { flushPara(); flushList(); flushCode(); flushTable(); flushQuote(); };

    for (const raw of lines) {
        const t = raw.trim();

        // ``` блоки кода
        if (/^```/.test(t)) {
            if (code) { flushCode(); } else { flushAll(); code = { lines: [] }; }
            continue;
        }
        if (code) { code.lines.push(raw); continue; }

        if (t === '') { flushAll(); continue; }

        // Горизонтальная линия
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); out.push('<hr class="ai-hr">'); continue; }

        // Заголовки ## … ######
        const h = t.match(/^(#{1,6})\s+(.+)$/);
        if (h) {
            flushAll();
            const lvl = Math.min(h[1].length, 4);
            out.push('<div class="ai-md-h ai-h' + lvl + '">' + mdInline(h[2]) + '</div>');
            continue;
        }

        // Цитаты >
        if (/^&gt;\??/.test(t) || /^>/.test(t)) {
            flushPara(); flushList(); flushTable();
            quote.push(t.replace(/^(&gt;|>)\s?/, ''));
            continue;
        }

        // Таблицы | a | b |
        if (/^\|.*\|$/.test(t)) {
            flushPara(); flushList(); flushQuote();
            table.push(t.slice(1, -1).split('|'));
            continue;
        }

        // Списки
        const ul = t.match(/^[-*•]\s+(.+)$/);
        const ol = t.match(/^(\d{1,2})[.)]\s+(.+)$/);
        if (ul || ol) {
            flushPara(); flushQuote(); flushTable();
            const type = ul ? 'ul' : 'ol';
            const content = ul ? ul[1] : ol[2];
            if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
            list.items.push([content]);
            continue;
        }

        // Обычная строка абзаца
        flushList();
        para.push(t);
    }
    flushAll();
    return out.join('');
}

// ---------------------------------------------------------------------------
// DOM вкладки
// ---------------------------------------------------------------------------

function bubble(role, contentHtml) {
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-bot');
    const avatar = document.createElement('div');
    avatar.className = 'ai-msg-avatar';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = role === 'user' ? 'person' : 'auto_awesome';
    avatar.appendChild(icon);
    const body = document.createElement('div');
    body.className = 'ai-msg-body';
    body.innerHTML = contentHtml;
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    return wrap;
}

function setStatus(kind, text) {
    if (!chatDom || !chatDom.statusChip) return;
    const chip = chatDom.statusChip;
    chip.className = 'ai-status-chip ai-status-' + kind;
    chip.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${
        kind === 'ok' ? 'check_circle' : kind === 'busy' ? 'hourglass_top' : 'error'
    }</span> ${escapeHtml(text)}`;
}

function renderWelcome() {
    const m = chatDom.messages;
    m.innerHTML = '';
    m.appendChild(bubble('assistant',
        '<p>Привет! Я <strong>ИИ-аналитик</strong>. Выполните поиск по записям ВКонтакте — и я подготовлю '
        + '<strong>отчёт для методиста</strong>, найду <strong>инсайты и рекомендации</strong> или отвечу '
        + 'на вопросы о результатах.</p><p>Можно также нажать одну из кнопок выше или выбрать быстрый вопрос.</p>'));
}

function renderBusy(text) {
    const b = bubble('assistant', `<p class="ai-typing"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span> ${escapeHtml(text || 'Думаю…')}</p>`);
    chatDom.messages.appendChild(b);
    chatDom.messages.scrollTop = chatDom.messages.scrollHeight;
    return b;
}

async function sendPrompt(userText, { isAction = false, maxTokens, temperature = 0.4 } = {}) {
    if (aiBusy) return;
    const snapshotFn = chatDom.getSnapshot;
    if (!snapshotFn) return;

    if (!isAction) {
        chatDom.messages.appendChild(bubble('user', mdLite(userText)));
    }
    chatHistory.push({ role: 'user', content: userText });

    const busy = renderBusy();
    chatDom.messages.scrollTop = chatDom.messages.scrollHeight;
    aiBusy = true;
    chatDom.sendBtn.disabled = true;

    try {
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

        // Снимок данных подмешиваем в каждый запрос как отдельное системное сообщение.
        // Это гарантирует, что ИИ всегда работает с актуальными цифрами и не берёт
        // статистику «из памяти» предыдущих реплик.
        let snapshotStr = '';
        try { snapshotStr = snapshotFn(); } catch (e) { snapshotStr = ''; }

        if (snapshotStr) {
            messages.push({
                role: 'system',
                content:
                    '## АКТУАЛЬНЫЕ ДАННЫЕ ПОИСКА VK (JSON-снимок)\n' +
                    'Ниже — единственный источник истины для всех цифр. ' +
                    'Любые числа, не присутствующие здесь явно, называть ЗАПРЕЩЕНО.\n\n' +
                    snapshotStr
            });
        } else {
            messages.push({
                role: 'system',
                content:
                    '## ДАННЫЕ ПОИСКА ОТСУТСТВУЮТ\n' +
                    'Пользователь ещё не выполнял сканирование или результаты пусты. ' +
                    'Сообщи об этом и предложи выполнить поиск в системе. ' +
                    'ЗАПРЕЩЕНО называть какие-либо числа о филиалах — данных нет.'
            });
        }
        messages.push(...chatHistory.slice(-20));


        const answer = await aiChatRequest(messages, { maxTokens, temperature });
        chatHistory.push({ role: 'assistant', content: answer });
        busy.remove();
        chatDom.messages.appendChild(bubble('assistant', mdLite(answer)));
    } catch (e) {
        busy.remove();
        chatDom.messages.appendChild(bubble('assistant',
            `<p class="ai-error"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px">error</span> `
            + escapeHtml(e.message || 'Неизвестная ошибка ИИ') + '</p>'));
    } finally {
        aiBusy = false;
        chatDom.sendBtn.disabled = false;
        chatDom.messages.scrollTop = chatDom.messages.scrollHeight;
    }
}

/**
 * Инициализация вкладки «ИИ-аналитик».
 * opts: { getSnapshot: () => string, onToast: (msg, type) => void }
 */
export async function initAiTab(opts) {
    const root = document.getElementById('ai-tab');
    if (!root) return null;

    chatDom = {
        root,
        statusChip: root.querySelector('#ai-status-chip'),
        messages: root.querySelector('#ai-chat-messages'),
        input: root.querySelector('#ai-chat-input'),
        sendBtn: root.querySelector('#ai-send-btn'),
        clearBtn: root.querySelector('#ai-clear-btn'),
        reportBtn: root.querySelector('#ai-report-btn'),
        insightBtn: root.querySelector('#ai-insight-btn'),
        quickChips: root.querySelectorAll('.ai-quick-chip'),
        getSnapshot: opts.getSnapshot || (() => ''),
        onToast: opts.onToast || (() => {})
    };

    // Статус прокси
    const st = await checkAiStatus(true);
    if (st.ai_configured) {
        setStatus('ok', 'ИИ подключён · ' + (st.model || 'модель'));
    } else {
        setStatus('err', 'ИИ недоступен' + (st.error ? ' · ' + st.error : ''));
    }

    renderWelcome();

    // Действия
    chatDom.reportBtn.addEventListener('click', () => {
        if (aiBusy) return;
        if ((chatDom.getSnapshot() || '') === '') {
            chatDom.onToast('Сначала выполните поиск записей', 'search_off');
            return;
        }
        chatHistory = []; // новый отчёт — новая сессия
        renderWelcome();
        sendPrompt(
            'Составь официальный отчёт для методиста по данным поиска VK.\n'
            + 'ОБЯЗАТЕЛЬНО используй только цифры из JSON-снимка (branches: posts, likes, reposts, comments, views, members, erViews, erPost).\n'
            + 'Структура отчёта:\n'
            + '1. Итоги периода (период, общее число постов, число филиалов)\n'
            + '2. Сравнительная таблица: название | посты | подписчики | лайки | репосты | ER\n'
            + '3. Лидеры и аутсайдеры по вовлечённости (конкретные названия и цифры)\n'
            + '4. Топ-3 поста из topPostsByEngagement: филиал, дата, лайки+репосты+комменты\n'
            + '5. Выявленные проблемы\n'
            + '6. 3–5 конкретных рекомендаций\n'
            + 'Если данные о каком-либо показателе отсутствуют — напиши «данные недоступны».',
            { isAction: true, maxTokens: 1800, temperature: 0.2 }
        );
    });

    chatDom.insightBtn.addEventListener('click', () => {
        if (aiBusy) return;
        if ((chatDom.getSnapshot() || '') === '') {
            chatDom.onToast('Сначала выполните поиск записей', 'search_off');
            return;
        }
        sendPrompt(
            'Проанализируй данные поиска VK и найди неочевидные инсайты.\n'
            + 'Работай ТОЛЬКО с цифрами из JSON-снимка (branches, topPostsByEngagement, topHashtags).\n'
            + 'Структура ответа:\n'
            + '1. Что работает лучше всего (конкретные филиалы и метрики из данных)\n'
            + '2. Где теряется вовлечённость (конкретные отстающие филиалы с цифрами)\n'
            + '3. Популярные темы/хэштеги\n'
            + '4. Аномалии или неожиданные паттерны\n'
            + '5. 5 практичных рекомендаций\n'
            + 'Не называй числа, которых нет в данных.',
            { isAction: true, maxTokens: 1400, temperature: 0.4 }
        );
    });

    chatDom.clearBtn.addEventListener('click', () => {
        if (aiBusy) return;
        chatHistory = [];
        renderWelcome();
        chatDom.onToast('Диалог с ИИ очищен', 'delete_sweep');
    });

    // Чат
    const submit = () => {
        const text = (chatDom.input.value || '').trim();
        if (!text || aiBusy) return;
        chatDom.input.value = '';
        sendPrompt(text, { temperature: 0.4 });
    };
    chatDom.sendBtn.addEventListener('click', submit);
    chatDom.input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    });

    // Быстрые вопросы
    chatDom.quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (aiBusy) return;
            const q = chip.getAttribute('data-q') || chip.textContent.trim();
            chatDom.input.value = q;
            submit();
        });
    });

    // Отладочный хук (рендер markdown доступен из консоли)
    try {
        window.__VK_AI__ = { mdLite, checkAiStatus, chat: () => chatHistory };
    } catch (e) { /* noop */ }

    return chatDom;
}
