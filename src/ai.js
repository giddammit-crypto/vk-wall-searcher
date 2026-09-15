/**
 * src/ai.js — ИИ-аналитик (вкладка «ИИ-аналитик»)
 * =============================================================================
 * Отчёты, инсайты и чат с моделью поверх данных поиска VK.
 * Все запросы идут через серверный прокси api/ai-proxy.php — API-ключ
 * хранится только на сервере и никогда не попадает в браузер.
 *
 * Разработка: Амброзиев О.А.
 */

import { resolveApiUrl } from './api.js?v=4.18.5';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

const SYSTEM_PROMPT = `
═══════════════════════════════════════════════
  ИИ-АНАЛИТИК VK WALL SEARCHER — ИНСТРУКЦИЯ
═══════════════════════════════════════════════

## 1. РОЛЬ И МИССИЯ

Ты — точный и честный аналитик данных ВКонтакте для методистов и сотрудников библиотек города Владимира.
Твоя главная ценность — ДОСТОВЕРНОСТЬ. Лучше сказать «данных нет» или «недостаточно данных», чем выдать красивый, но неточный ответ.
Ты также можешь отвечать на общие вопросы (методика работы, советы, объяснения терминов) — в этом случае опирайся на профессиональные знания, не на снимок данных.

---

## 2. АБСОЛЮТНЫЕ ЗАПРЕТЫ (НАРУШЕНИЕ НЕДОПУСТИМО)

ЗАПРЕЩЕНО без исключений:
- Называть любое число, которого нет в JSON-снимке.
- Додумывать, «округлять», усреднять или угадывать показатели.
- Говорить «вероятно X», «около X», «примерно X» о конкретных цифрах филиалов.
- Экстраполировать данные периода: если данные за 2 недели — НЕЛЬЗЯ писать «за год публикует ~X постов».
- Сравнивать метрику, которой нет у обоих филиалов в снимке.
- Давать рекомендацию, не подкреплённую конкретными данными из снимка.
- Писать «филиал активен / неактивен» без цифр.
- Утверждать что-либо о филиалах, которых НЕТ в массиве branches.

Если данных недостаточно — пиши дословно: «В снимке данных это значение отсутствует» или «Данных для сравнения недостаточно».

---

## 3. СТРУКТУРА JSON-СНИМКА (единственный источник истины)

### Поля верхнего уровня:
- period        — текстовый диапазон дат поиска (например, «01.08.2026 – 31.08.2026»). ВСЕГДА указывай в отчётах.
- keywords      — ключевые слова фильтра. Если не пусто — посты считаются ТОЛЬКО среди тех, что содержат эти слова. Это КРИТИЧНО: posts в branches — не все посты филиала, а только найденные по фильтру.
- exclude       — исключённые слова (если указаны — упомяни в оговорке).
- totalPosts    — суммарное число постов в области scope (см. scope ниже): если scope.branchFilter задан — только по этому филиалу, иначе по всему скану.
- branchesCount — число филиалов в выборке.
- scope         — область данных снимка (синхронизация totalPosts/topPosts с branches):
    * postsSource — 'all' (посты всего скана) или 'filtered' (набор постов сужен фильтром филиала/хэштега).
    * branchFilter — имя филиала, если топ-посты отфильтрованы по филиалу, иначе null.
    * note — текстовое пояснение к области.
    * ЕСЛИ branchFilter задан: topPostsByEngagement, totalPosts и topHashtags — ТОЛЬКО по этому филиалу, а branches охватывает весь скан. Суммируй числа по соответствующей области и НЕ смешивай их.
- aggregates    — суммарные показатели по всем филиалам вместе (по данным branches, т.е. весь скан):
    * totalLikes, totalReposts, totalComments, totalViews — используй для ответов «сколько всего...».

### Массив branches (каждый элемент — один филиал):
- name          — точное название филиала (используй только его, не придумывай сокращений).
- members       — подписчики на момент сканирования.
    * Если null — данные о подписчиках НЕ БЫЛИ ПОЛУЧЕНЫ. Пиши: «данные недоступны», НЕ «0 подписчиков».
    * Если 0 — реально ноль или данные не загружены. Не используй для расчёта erPost.
- posts         — найденных постов за период (с учётом фильтра keywords!).
    * Если 0 — в данном периоде/фильтре постов не найдено. НЕ пиши «филиал не публикует».
- likes         — сумма лайков по найденным постам.
- reposts       — сумма репостов по найденным постам.
- comments      — сумма комментариев по найденным постам.
- views         — сумма просмотров по найденным постам.
    * Если 0 или null — ВКонтакте не вернул просмотры (бывает для старых постов). Не считай erViews в этом случае.
- erViews       — ER по просмотрам: (likes+comments+reposts) / views × 100 (%).
    * Если views=0 — erViews=0 и НЕ является показателем активности. Не сравнивай такие filиалы по erViews.
    * Высокий erViews (>2%) = хорошо. Низкий (<0.5%) = аудитория видит, но не реагирует.
- erPost        — ER по постам на подписчика: (likes+comments+reposts) / posts / members × 100 (%).
    * Это значение УЖЕ рассчитано в снимке по формуле выше. Если erPost=null — members неизвестны или постов нет: пиши «данных недостаточно», НЕ вычисляй erPost самостоятельно.
    * Нормальный erPost для библиотек: 0.5–3%. Выше 5% — выдающийся результат.
- avgInteractionsPerPost — средние реакции на пост: (likes+comments+reposts) / posts (без нормировки на подписчиков). Используй для ответов «сколько в среднем реакций собирает пост», НЕ как показатель вовлечённости аудитории.

### Массив topPostsByEngagement (топ-10 постов по сумме likes+comments+reposts):
- branch    — название филиала.
- date      — дата публикации (ГГГГ-ММ-ДД).
- likes, comments, reposts, views — метрики этого поста.
- text      — текст поста (до 500 символов). Может быть обрезан — НЕ домысливай продолжение.

### Массив topHashtags (топ-15 хэштегов):
- tag, count — хэштег и число его использований в найденных постах.

---

## 4. ПРАВИЛА СРАВНЕНИЯ ФИЛИАЛОВ

При сравнении по абсолютным числам (лайки, репосты):
- Учитывай размер аудитории: у крупного филиала больше подписчиков → больше абсолютных цифр. Это не значит «лучше работает».
- Для честного сравнения используй erPost (он нормирован на подписчика и количество постов).

При сравнении по erViews:
- Возможно только если у обоих филиалов views > 0.

Определение лидера:
- Лидер по активности публикаций = наибольший posts.
- Лидер по вовлечённости = наибольший erPost (при наличии members).
- Лидер по охвату = наибольший views.

Запрещено объявлять «лучшим» или «худшим» без указания конкретной метрики.

---

## 5. ПРАВИЛА ДЛЯ НЕПОЛНЫХ И НУЛЕВЫХ ДАННЫХ

Если филиал имеет posts=0:
- Пиши: «В данном периоде/по данному фильтру постов не найдено».
- НЕ включай такой филиал в расчёты ER и сравнения активности.
- Укажи таких филиалов отдельным списком в конце.

Если members=null у многих филиалов:
- Предупреди: «Данные о подписчиках недоступны для N филиалов, сравнение erPost невозможно».

Если keywords не пуст:
- ОБЯЗАТЕЛЬНО предупреди в начале ответа: «Статистика учитывает только посты, содержащие: [keywords]. Это не полная картина активности филиала».

Если branchesCount < реального числа филиалов библиотеки:
- Уточни: «В данной выборке N филиалов. Данные остальных отсутствуют».

---

## 6. КОНТРОЛЬНЫЙ СПИСОК (применяй мысленно перед каждым ответом)

Перед тем как написать любую цифру, проверь:
[ ] Это число есть в JSON-снимке явно?
[ ] Я не складываю/умножаю числа которые нельзя комбинировать (например, erPost разных филиалов)?
[ ] Я учёл влияние фильтра keywords на posts?
[ ] Я учёл scope: при branchFilter топ-посты/totalPosts — по филиалу, а branches — весь скан (не смешиваю области)?
[ ] Я не экстраполирую данные на другой период?
[ ] Если members=null — я не делю на него?
[ ] Если views=0 — я не рассчитываю erViews?
[ ] Каждая рекомендация подкреплена конкретной цифрой из снимка?

---

## 7. ФОРМАТИРОВАНИЕ ОТВЕТОВ

Язык: русский, деловой, конкретный.
Длина: пиши ёмко, структурированно, без лишней воды. При этом отчёты и инсайты должны быть исчерпывающими и полностью охватывать все запрошенные филиалы, метрики и разделы.
КРИТИЧЕСКИ ВАЖНО: ВСЕГДА завершай ответ до конца! Полностью доводи до логического завершения начатые мысли, предложения, таблицы и пункты рекомендаций. НИКОГДА не обрывай ответ на полуслове.
Эмодзи: ЗАПРЕЩЕНЫ полностью — ни в заголовках, ни в списках.

Разметка (рендерится в интерфейсе):
- ### Заголовки разделов
- **жирный** — ключевые цифры и выводы
- ==выделение== — критически важные инсайты и тревожные сигналы (не более 2–3)
- __подчёркнутый__ — второстепенные акценты
- Таблицы | колонка | сортировать по erPost по убыванию
- 1. Нумерованные списки для рекомендаций и шагов
- - Ненумерованные для перечислений
- > Цитата — для важных наблюдений из текстов постов

В таблице сравнения филиалов ВСЕГДА:
- Первая колонка: Филиал
- Далее: Посты | Подписчики | Лайки | Репосты | Комм. | erPost
- Сортировка: по erPost убыванию (если доступен), иначе по likes
- Если данные отсутствуют — ячейка: «—»

---

## 8. ПОВЕДЕНИЕ В РАЗНЫХ РЕЖИМАХ

При вопросах о данных (филиалы, метрики, сравнения):
→ Строго JSON-снимок. Любое число — из снимка или «—».

При общих вопросах (как написать пост, что такое ER, советы по SMM):
→ Отвечай как SMM-эксперт. Можно приводить общие ориентиры, но чётко говори: «это общий ориентир, не данные вашего сканирования».

При вопросе «что посоветуешь»:
→ Только рекомендации, вытекающие из реальных данных снимка с конкретными цифрами-основаниями.

При отсутствии данных (снимок пуст):
→ Скажи что нужно выполнить сканирование. Не давай никаких числовых оценок.
`.trim();


let chatHistory = [];   // {role: 'user'|'assistant', content}
let chatDom = null;     // ссылки на DOM вкладки
let aiStatus = null;    // {ai_configured, model, max_tokens}
let aiBusy = false;

// ---------------------------------------------------------------------------
// Низкоуровневый слой: статус и запрос к прокси
// ---------------------------------------------------------------------------

// Таймаут клиентских запросов к прокси: больше серверного (ai_timeout, 180 с),
// чтобы сервер успел ответить первым и клиент не обрывал валидный ответ.
const AI_FETCH_TIMEOUT_MS = 200000;

/** fetch с AbortController-таймаутом (защита от «висящих» запросов) */
function fetchWithTimeout(url, options = {}, timeoutMs = AI_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** Аборт по таймауту превращаем в понятное сообщение, остальное пробрасываем как есть */
function rethrowIfAbort(e, message) {
    if (e && e.name === 'AbortError') throw new Error(message);
    throw e;
}

export async function checkAiStatus(force = false) {
    if (aiStatus && !force) return aiStatus;
    try {
        const res = await fetchWithTimeout(AI_PROXY_URL, { method: 'GET' }, 15000);
        if (res.ok) {
            aiStatus = await res.json();
        } else {
            aiStatus = { ai_configured: false, model: '', error: 'HTTP ' + res.status };
        }
    } catch (e) {
        const msg = (e && e.name === 'AbortError') ? 'Превышено время ожидания ИИ' : ((e && e.message) || 'Сеть недоступна');
        aiStatus = { ai_configured: false, model: '', error: msg };
    }
    return aiStatus;
}

async function aiChatRequest(messages, opts = {}) {
    let res;
    try {
        res = await fetchWithTimeout(AI_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                max_tokens: opts.maxTokens,
                temperature: opts.temperature
            })
        });
    } catch (e) {
        rethrowIfAbort(e, 'Превышено время ожидания ИИ');
    }
    let json = null;
    try { json = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
        const msg = (json && json.error && json.error.error_msg) || ('Ошибка ИИ-прокси (HTTP ' + res.status + ')');
        throw new Error(msg);
    }
    if (!json || !json.choices || !json.choices[0] || !json.choices[0].message) {
        throw new Error('ИИ вернул пустой ответ');
    }
    const choice = json.choices[0];
    let content = (choice.message && choice.message.content) || '';
    if (choice.finish_reason === 'length') {
        content += '\n\n*(Внимание: ответ достиг предела длины токенов)*';
    }
    return content;
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
 * opts: { posts, stats, periodLabel, keywords, exclude, hashtags, branchFilter? }
 *
 * ВАЖНО про области данных: opts.posts могут быть сужены фильтром филиала
 * (filteredPosts), тогда как opts.stats (lastGroupsStats) всегда покрывают
 * весь скан. Итоговая область фиксируется в поле scope снимка.
 */
export function buildAiSnapshot(opts) {
    const posts = Array.isArray(opts.posts) ? opts.posts : [];
    const stats = Array.isArray(opts.stats) ? opts.stats : [];

    const branches = stats.map(s => {
        const info = s.info || {};
        const rawMembers = num(info.members_count);
        // null означает «данные о подписчиках не получены», 0 — реально ноль
        const members = rawMembers > 0 ? rawMembers : (info.members_count === undefined ? null : 0);
        const postsCount = s.postsCount || 0;
        const interactions = num(s.likes) + num(s.reposts) + num(s.comments);
        // erPost — ER по постам на подписчика (%): interactions / посты / подписчики × 100.
        // Формула строго соответствует SYSTEM_PROMPT (пороги 0.5–3% даны именно для неё).
        // null — members неизвестны или постов нет: ИИ не должен пересчитывать сам.
        const erPost = (members > 0 && postsCount > 0)
            ? Math.round((interactions / postsCount / members) * 10000) / 100
            : null;
        // Средние реакции на один пост (лайки+репосты+комменты)/посты — без нормировки на подписчиков
        const avgInteractionsPerPost = postsCount > 0 ? Math.round((interactions / postsCount) * 100) / 100 : 0;
        return {
            name:     info.canonicalName || info.name || ('id' + (info.rawId || info.id)),
            members,
            posts:    postsCount,
            likes:    num(s.likes),
            reposts:  num(s.reposts),
            comments: num(s.comments),
            views:    num(s.views),
            erViews:  Math.round((s.erViews || 0) * 100) / 100,
            erPost,
            avgInteractionsPerPost
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

    /**
     * Определяем область снимка: posts могут быть сужены фильтром филиала
     * (или хэштега), тогда как branches (stats) охватывают весь скан.
     * Сравниваем число постов по филиалам в posts с postsCount из stats;
     * явный opts.branchFilter (если передан) имеет приоритет.
     */
    function resolveScope() {
        if (opts.branchFilter) {
            return {
                postsSource:  'filtered',
                branchFilter: String(opts.branchFilter),
                note:         'Топ-посты, totalPosts и хэштеги — только по указанному филиалу; branches охватывает весь скан.'
            };
        }
        // Группируем посты по филиалу (targetInfo) — имена формируются так же, как в branches
        const byBranch = new Map();
        posts.forEach(p => {
            const t = p.targetInfo || {};
            const name = t.canonicalName || t.name || ('id' + (t.rawId || t.id));
            byBranch.set(name, (byBranch.get(name) || 0) + 1);
        });
        const statsWithPosts = branches.filter(b => b.posts > 0);
        const missing = statsWithPosts.filter(b => !byBranch.has(b.name)).length;
        const reduced = statsWithPosts.filter(b => byBranch.has(b.name) && byBranch.get(b.name) < b.posts).length;

        if (posts.length === 0) {
            if (statsWithPosts.length > 0) {
                return {
                    postsSource:  'filtered',
                    branchFilter: null,
                    note:         'В текущей выборке постов 0, хотя branches содержит посты всего скана — набор постов сужен фильтром.'
                };
            }
            return { postsSource: 'all', branchFilter: null, note: 'Постов не найдено.' };
        }
        if (missing === 0 && reduced === 0) {
            return { postsSource: 'all', branchFilter: null, note: 'Посты и branches покрывают одну и ту же область — весь скан.' };
        }
        if (byBranch.size === 1 && missing > 0) {
            const name = Array.from(byBranch.keys())[0];
            return {
                postsSource:  'filtered',
                branchFilter: name,
                note:         'Топ-посты, totalPosts и хэштеги — только по филиалу «' + name + '»; branches охватывает весь скан.'
            };
        }
        return {
            postsSource:  'filtered',
            branchFilter: null,
            note:         'Набор постов сужен фильтром (посты не совпадают с постами филиалов в branches); branches охватывает весь скан.'
        };
    }

    const snapshot = {
        period:        opts.periodLabel || 'не определён',
        keywords:      opts.keywords    || '',
        exclude:       opts.exclude     || '',
        totalPosts:    posts.length,
        branchesCount: branches.length,
        scope:         resolveScope(),   // область данных: соответствие totalPosts/topPosts и branches
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
    let olCounter = 0;    // сквозной счётчик ol — не сбрасывается от вложенных ul

    const flushPara = () => {
        if (para.length) { out.push('<p>' + mdInline(para.join('<br>')) + '</p>'); para = []; }
    };
    const flushList = () => {
        if (list) {
            if (list.type === 'ol') {
                // ol-пункты рендерим как кастомные div с badge-номером
                out.push('<div class="ai-ol">' +
                    list.items.map((it, idx) => {
                        const n = (list.startFrom || 1) + idx;
                        return '<div class="ai-ol-item"><span class="ai-ol-num">' + n + '</span>'
                            + '<span class="ai-ol-text">' + mdInline(it.join('<br>')) + '</span></div>';
                    }).join('') +
                    '</div>');
            } else {
                out.push('<ul class="ai-list">' +
                    list.items.map(it => '<li>' + mdInline(it.join('<br>')) + '</li>').join('') +
                    '</ul>');
            }
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
    const flushAll = () => {
        flushPara(); flushList(); flushCode(); flushTable(); flushQuote();
        olCounter = 0;  // сбрасываем счётчик только на пустой строке / смене блока
    };

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
            if (ol) {
                // ol: если текущий список — ul, сбрасываем его, но счётчик сохраняем
                if (list && list.type === 'ul') { flushList(); }
                olCounter++;
                if (!list || list.type !== 'ol') {
                    list = { type: 'ol', items: [], startFrom: olCounter };
                }
                list.items.push([ol[2]]);
            } else {
                // ul: сбрасываем ol-список в HTML (счётчик olCounter НЕ трогаем)
                if (list && list.type === 'ol') { flushList(); }
                if (!list || list.type !== 'ul') { list = { type: 'ul', items: [] }; }
                list.items.push([ul[1]]);
            }
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

async function sendPrompt(userText, { isAction = false, maxTokens = 4000, temperature = 0.4 } = {}) {
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
            // Парсим снимок чтобы добавить контекстные подсказки
            let parsedSnap = null;
            try { parsedSnap = JSON.parse(snapshotStr); } catch (e) { /* ignore */ }
            const kwNote = (parsedSnap && parsedSnap.keywords)
                ? `\nВНИМАНИЕ: поле keywords="${parsedSnap.keywords}" — посты в branches считаются ТОЛЬКО по этому фильтру, а не все посты филиала.`
                : '';
            messages.push({
                role: 'system',
                content:
                    '## АКТУАЛЬНЫЕ ДАННЫЕ ПОИСКА VK (JSON-снимок)\n' +
                    'Ниже — ЕДИНСТВЕННЫЙ источник истины. ' +
                    'Любое число, которого здесь нет явно — ЗАПРЕЩЕНО называть.\n' +
                    'Помни: members=null означает «данные не получены» (не «0 подписчиков»). ' +
                    'posts=0 означает «постов по фильтру не найдено» (не «не публикует»).' +
                    kwNote + '\n\n' +
                    snapshotStr
            });
        } else {
            messages.push({
                role: 'system',
                content:
                    '## ДАННЫЕ ПОИСКА ОТСУТСТВУЮТ\n' +
                    'Сканирование ещё не выполнялось или результаты пусты. ' +
                    'Предложи пользователю выполнить поиск. ' +
                    'ЗАПРЕЩЕНО называть какие-либо числа о филиалах.'
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

    // ── Кнопка «Отчёт» ──────────────────────────────────────────────────────
    chatDom.reportBtn.addEventListener('click', () => {
        if (aiBusy) return;
        if ((chatDom.getSnapshot() || '') === '') {
            chatDom.onToast('Сначала выполните поиск записей', 'search_off');
            return;
        }
        chatHistory = []; // новый отчёт — новая сессия
        renderWelcome();
        sendPrompt(
            'Составь официальный аналитический отчёт для методиста.\n'
            + 'СТРОГИЕ ПРАВИЛА:\n'
            + '- Используй ТОЛЬКО цифры из JSON-снимка. Ни одного числа «из головы».\n'
            + '- Если keywords не пуст — упомяни в шапке что статистика по фильтру, не общая.\n'
            + '- Если members=null — не пиши число подписчиков, пиши «н/д».\n'
            + '- Если posts=0 — не включай филиал в сравнение активности.\n'
            + '\nОБЯЗАТЕЛЬНАЯ СТРУКТУРА:\n'
            + '### Параметры сканирования\n'
            + 'Период: [period]. Фильтр: [keywords или «все посты»]. Филиалов: [branchesCount]. Постов найдено: [totalPosts].\n'
            + '### Сравнительная таблица филиалов\n'
            + 'Колонки: Филиал | Посты | Подписчики | Лайки | Репосты | Комм. | erPost\n'
            + 'Сортировка: по erPost убыванию. Недостающие данные = «—».\n'
            + '### Лидеры и аутсайдеры\n'
            + 'Топ-1 по erPost и топ-1 по охвату (views) с точными цифрами из снимка.\n'
            + 'Аутсайдер (наименьший erPost среди активных) — с цифрами.\n'
            + '### Топ-3 поста\n'
            + 'Из topPostsByEngagement: филиал, дата, лайки+репосты+комм (точные числа), первые слова текста.\n'
            + '### Выявленные проблемы\n'
            + 'Только то, что подтверждено данными снимка.\n'
            + '### Рекомендации\n'
            + '3–5 рекомендаций. Каждая начинается с цифры-основания из данных.',
            { isAction: true, maxTokens: 6000, temperature: 0.15 }
        );
    });

    // ── Кнопка «Инсайты» ────────────────────────────────────────────────────
    chatDom.insightBtn.addEventListener('click', () => {
        if (aiBusy) return;
        if ((chatDom.getSnapshot() || '') === '') {
            chatDom.onToast('Сначала выполните поиск записей', 'search_off');
            return;
        }
        sendPrompt(
            'Найди неочевидные инсайты в данных поиска VK.\n'
            + 'СТРОГИЕ ПРАВИЛА:\n'
            + '- Только факты из JSON-снимка (branches, topPostsByEngagement, topHashtags, aggregates).\n'
            + '- Каждый инсайт = конкретная цифра из данных + вывод.\n'
            + '- Не экстраполируй данные периода на год/квартал.\n'
            + '- Не сравнивай по erPost если members=null.\n'
            + '\nСТРУКТУРА:\n'
            + '### Что работает хорошо\n'
            + 'Конкретные филиалы с наилучшими метриками (названия и цифры из снимка).\n'
            + '### Где теряется вовлечённость\n'
            + 'Филиалы с наименьшим erPost или нулевыми постами — с цифрами.\n'
            + '### Тренды контента\n'
            + 'Из topHashtags и текстов topPostsByEngagement — что реально цепляет аудиторию.\n'
            + '### Аномалии\n'
            + 'Неожиданные паттерны: большой разрыв между views и likes, резкие перепады активности.\n'
            + '### 5 рекомендаций\n'
            + 'Каждая с указанием филиала/метрики-основания из снимка.',
            { isAction: true, maxTokens: 4500, temperature: 0.35 }
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
        sendPrompt(text, { maxTokens: 4000, temperature: 0.4 });
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
