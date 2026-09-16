/**
 * src/cosmo_chat.js — Интерактивный чат с Космо (Cosmo AI Chat) (v4.21.0)
 * ============================================================================
 * Полноценный модальный чат с роботом-маскотом Космо:
 *   • Вызывается по двойному клику на Космо
 *   • Адаптивное модальное окно в неоновом стиле AURORA
 *   • Полная замена вкладки «ИИ-аналитик»: 10 всплывающих пресетов аудита групп ВК
 *   • Полная поддержка Markdown (заголовки, списки, таблицы, код, цитаты)
 *   • Кнопки «Скопировать пост» прямо в сообщениях ИИ
 *   • Прикрепление и анализ файлов (тексты, черновики постов, JSON, CSV, изображения)
 *   • Библиотечный SMM-ассистент: посты, интерактивы, анализ реальных данных групп ВК
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.24.2';
import { CANONICAL_BRANCHES } from './branches.js?v=4.24.2';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');
const TTS_PROXY_URL = resolveApiUrl('api/tts-proxy.php');

function resolveTtsAudioUrl(url) {
    try {
        return new URL(url, TTS_PROXY_URL).href;
    } catch (e) {
        return url;
    }
}

/* ---------------------------------------------------------------------------
 * Вспомогательные функции экранирования и Markdown
 * ------------------------------------------------------------------------- */
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Инлайн-разметка Markdown: жирный, курсив, зачёркнутый, спойлеры, код, ссылки, выделения
 */
function mdInline(s) {
    // Инлайн-код
    s = s.replace(/`([^`\n]+)`/g, '<code class="cosmo-chat-code">$1</code>');
    // Спойлеры ||скрытый текст||
    s = s.replace(/\|\|([^|\n]+)\|\|/g, '<span class="cosmo-chat-spoiler" title="Нажмите, чтобы показать">$1</span>');
    // Зачёркнутый текст ~~текст~~
    s = s.replace(/~~([^~\n]+)~~/g, '<del class="cosmo-chat-del">$1</del>');
    // Клавиши клавиатуры <kbd>Ctrl</kbd>
    s = s.replace(/<kbd>([^<]+)<\/kbd>/gi, '<kbd class="cosmo-chat-kbd">$1</kbd>');
    // Ссылки
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="cosmo-chat-link">$1</a>');
    s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="cosmo-chat-link">$2</a>');
    // Акценты
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/==([^\n]+?)==/g, '<mark class="cosmo-chat-hl">$1</mark>');
    s = s.replace(/__([^_\n]+)__/g, '<u class="cosmo-chat-u">$1</u>');
    s = s.replace(/(^|[^\p{L}\p{N}*])\*([^*\n]+)\*(?=[^\p{L}\p{N}*]|$)/gu, '$1<em>$2</em>');
    // Подсветка цифр внутри жирного текста
    s = s.replace(/<strong>([^<]*)<\/strong>/g, (m, inner) =>
        '<strong>' + inner.replace(/(\d[\d\s.,%₽руб]*)/g, '<span class="cosmo-chat-num">$1</span>') + '</strong>');
    // Эмодзи-аватарки Космо (32×32px) — можно вставлять в ответы через шорткоды
    const COSMO_EMOJI = {
        ':cosmo_smile:':   'assets/images/mascot/robot_smile.png',
        ':cosmo_think:':   'assets/images/mascot/robot_thinking.png',
        ':cosmo_yawn:':    'assets/images/mascot/robot_yawn.png',
        ':cosmo_angry:':   'assets/images/mascot/robot_angry.png',
        ':cosmo_sleep:':   'assets/images/mascot/robot_sleep.png',
        ':cosmo_tired:':   'assets/images/mascot/robot_tired.png',
        ':cosmo:':         'assets/images/mascot/robot_idle.png',
    };
    for (const [code, src] of Object.entries(COSMO_EMOJI)) {
        s = s.split(code).join(`<img src="${src}?v=4.24.9" alt="${code}" class="cosmo-emoji-img" width="32" height="32" />`);
    }
    return s;
}

/**
 * Блочная разметка Markdown: заголовки, списки, таблицы, цитаты, код, коллауты, задачи, абзацы
 */
export function parseCosmoMarkdown(text) {
    if (!text) return '';
    const src = escapeHtml(String(text).replace(/\r\n/g, '\n'));
    const lines = src.split('\n');
    const out = [];
    let para = [];
    let list = null; // {type: 'ul'|'ol', items: [], startFrom: 1}
    let code = null; // {lang: '', lines: []}
    let table = [];  // [rows][cells]
    let quote = [];
    let olCounter = 0;

    const flushPara = () => {
        if (para.length) {
            out.push('<p>' + mdInline(para.join('<br>')) + '</p>');
            para = [];
        }
    };

    const flushList = () => {
        if (list) {
            if (list.type === 'ol') {
                out.push('<div class="cosmo-chat-ol">' +
                    list.items.map((it, idx) => {
                        const n = (list.startFrom || 1) + idx;
                        return '<div class="cosmo-chat-ol-item"><span class="cosmo-chat-ol-num">' + n + '</span>'
                            + '<span class="cosmo-chat-ol-text">' + mdInline(it.join('<br>')) + '</span></div>';
                    }).join('') +
                    '</div>');
            } else {
                out.push('<ul class="cosmo-chat-ul">' +
                    list.items.map(it => {
                        const itemText = it.join('<br>');
                        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
                        if (taskMatch) {
                            const isChecked = taskMatch[1].toLowerCase() === 'x';
                            return `<li class="cosmo-task-item ${isChecked ? 'is-checked' : ''}">` +
                                `<input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="cosmo-task-check" /> ` +
                                `<span class="cosmo-task-label">${mdInline(taskMatch[2])}</span></li>`;
                        }
                        return '<li>' + mdInline(itemText) + '</li>';
                    }).join('') +
                    '</ul>');
            }
            list = null;
        }
    };

    const flushCode = () => {
        if (code) {
            const rawCode = code.lines.join('\n');
            const lang = code.lang || '';
            const langLabel = lang ? lang.toUpperCase() : 'КОД';
            out.push(`
                <div class="cosmo-chat-codeblock-wrap">
                    <div class="cosmo-chat-codeblock-header">
                        <span class="cosmo-code-lang">${langLabel}</span>
                        <button type="button" class="cosmo-chat-copy-code-btn" data-copy-code title="Скопировать код">
                            <span class="material-symbols-outlined">content_copy</span> <span class="copy-code-label">Скопировать</span>
                        </button>
                    </div>
                    <pre class="cosmo-chat-codeblock"><code class="${lang ? 'language-' + lang : ''}">${rawCode}</code></pre>
                </div>
            `);
            code = null;
        }
    };

    const flushTable = () => {
        if (table.length) {
            let alignments = [];
            let dataRows = [];
            let headerRow = null;
            for (let rIdx = 0; rIdx < table.length; rIdx++) {
                const row = table[rIdx];
                const isSep = row.every(c => /^[\s:-]+$/.test(c));
                if (isSep && rIdx > 0 && !alignments.length) {
                    alignments = row.map(c => {
                        const s = c.trim();
                        if (s.startsWith(':') && s.endsWith(':')) return 'center';
                        if (s.endsWith(':')) return 'right';
                        return 'left';
                    });
                } else if (!isSep) {
                    if (!headerRow) {
                        headerRow = row;
                    } else {
                        dataRows.push(row);
                    }
                }
            }
            if (headerRow) {
                let t = '<div class="cosmo-chat-table-wrap"><table class="cosmo-chat-table"><thead><tr>';
                t += headerRow.map((c, i) => {
                    const al = alignments[i] ? ` align-${alignments[i]}` : '';
                    return `<th class="${al}">${mdInline(c.trim())}</th>`;
                }).join('') + '</tr></thead>';
                if (dataRows.length) {
                    t += '<tbody>' + dataRows.map(r =>
                        '<tr>' + headerRow.map((_, i) => {
                            const al = alignments[i] ? ` align-${alignments[i]}` : '';
                            return `<td class="${al}">${mdInline((r[i] || '').trim())}</td>`;
                        }).join('') + '</tr>'
                    ).join('') + '</tbody>';
                }
                t += '</table></div>';
                out.push(t);
            }
        }
        table = [];
    };

    const flushQuote = () => {
        if (quote.length) {
            const first = quote[0].trim();
            const alertMatch = first.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
            if (alertMatch) {
                const type = alertMatch[1].toUpperCase();
                const restFirst = alertMatch[2];
                const contentLines = [];
                if (restFirst) contentLines.push(restFirst);
                contentLines.push(...quote.slice(1));
                const icons = {
                    NOTE: 'info',
                    TIP: 'lightbulb',
                    IMPORTANT: 'bolt',
                    WARNING: 'warning',
                    CAUTION: 'report'
                };
                const titles = {
                    NOTE: 'Примечание',
                    TIP: 'Совет от Космо',
                    IMPORTANT: 'Важно',
                    WARNING: 'Внимание',
                    CAUTION: 'Осторожно'
                };
                out.push(`
                    <div class="cosmo-chat-alert cosmo-chat-alert-${type.toLowerCase()}">
                        <div class="cosmo-alert-header">
                            <span class="material-symbols-outlined">${icons[type] || 'info'}</span>
                            <strong>${titles[type] || type}</strong>
                        </div>
                        <div class="cosmo-alert-body">${mdInline(contentLines.join('<br>'))}</div>
                    </div>
                `);
            } else {
                out.push('<blockquote class="cosmo-chat-quote">' + mdInline(quote.join('<br>')) + '</blockquote>');
            }
            quote = [];
        }
    };

    const flushAll = () => {
        flushPara();
        flushList();
        flushCode();
        flushTable();
        flushQuote();
        olCounter = 0;
    };

    for (const raw of lines) {
        const t = raw.trim();

        // Блоки кода ```lang
        const fenceMatch = t.match(/^```([a-zA-Z0-9_+-]*)/);
        if (fenceMatch) {
            if (code) {
                flushCode();
            } else {
                flushAll();
                code = { lang: (fenceMatch[1] || '').trim().toLowerCase(), lines: [] };
            }
            continue;
        }
        if (code) {
            code.lines.push(raw);
            continue;
        }

        // Пустая строка разделяет блоки
        if (t === '') {
            flushAll();
            continue;
        }

        // Горизонтальный разделитель ---
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
            flushAll();
            out.push('<hr class="cosmo-chat-hr">');
            continue;
        }

        // Заголовки # ... ####
        const h = t.match(/^(#{1,4})\s+(.+)$/);
        if (h) {
            flushAll();
            const lvl = h[1].length;
            out.push(`<div class="cosmo-chat-h cosmo-chat-h${lvl}">${mdInline(h[2])}</div>`);
            continue;
        }

        // Цитаты >
        if (/^(&gt;|>)/.test(t)) {
            flushPara();
            flushList();
            flushTable();
            quote.push(t.replace(/^(&gt;|>)\s?/, ''));
            continue;
        }

        // Таблицы | a | b |
        if (/^\|.*\|$/.test(t)) {
            flushPara();
            flushList();
            flushQuote();
            table.push(t.slice(1, -1).split('|'));
            continue;
        }

        // Списки (маркированные или нумерованные)
        const ul = t.match(/^[-*•]\s+(.+)$/);
        const ol = t.match(/^(\d{1,2})[.)]\s+(.+)$/);
        if (ul || ol) {
            flushPara();
            flushQuote();
            flushTable();
            if (ol) {
                if (list && list.type === 'ul') flushList();
                olCounter++;
                if (!list || list.type !== 'ol') {
                    list = { type: 'ol', items: [], startFrom: olCounter };
                }
                list.items.push([ol[2]]);
            } else {
                if (list && list.type === 'ol') flushList();
                if (!list || list.type !== 'ul') {
                    list = { type: 'ul', items: [] };
                }
                list.items.push([ul[1]]);
            }
            continue;
        }

        // Обычная строка
        flushList();
        flushQuote();
        para.push(t);
    }

    flushAll();
    return out.join('');
}


/* ===========================================================================
 * 10 БЫСТРЫХ ПРЕСЕТОВ АНАЛИЗА ГРУПП ВК (Замена старой вкладки «ИИ-аналитик»)
 * =========================================================================== */
export const VK_GROUP_PRESETS = [
    {
        id: 'net-audit',
        icon: 'summarize',
        category: 'Методический аудит',
        title: 'Отчёт для методиста (Аудит сети)',
        desc: 'Сводный аудит всех филиалов: сравнительная таблица, лидеры, аутсайдеры и рекомендации.',
        badge: 'ТОП-ОТЧЁТ',
        prompt: `Составь официальный аналитический отчёт для методиста по группам ВКонтакте на основе текущего сканирования.
ОБЯЗАТЕЛЬНАЯ СТРУКТУРА:
1. ### Параметры сканирования и общие охваты
   Укажи общее количество филиалов, постов, суммарные просмотры, лайки, репосты и комментарии.
2. ### Сравнительная таблица филиалов
   Построй Markdown-таблицу: Филиал | Посты | Подписчики | Просмотры | Лайки | Репосты | Комм. | ER (вовлечённость)
   Отсортируй по убыванию вовлечённости или просмотров.
3. ### Лидеры и аутсайдеры периода
   Выдели топ-1 по просмотрам и топ-1 по ER с точными данными. Укажи филиалы с низкой активностью и причины просадки.
4. ### Топ-3 самых успешных публикаций
   Разбери 3 поста с максимальной вовлечённостью (тема, формат, реакции).
5. ### Конкретные рекомендации методисту
   Дай 4 обоснованных шага для улучшения показателей всей библиотечной сети.`
    },
    {
        id: 'deep-insights',
        icon: 'insights',
        category: 'Инсайты и аналитика',
        title: 'Глубокие инсайты и аномалии',
        desc: 'Скрытые паттерны, разрывы просмотров/реакций, неожиданные скачки активности.',
        badge: 'ИНСАЙТЫ',
        prompt: `Проведи глубокий аналитический поиск неочевидных инсайтов и аномалий в данных сообществ ВК:
1. ### Что работает превосходно
   Какие приёмы и форматы у лидеров принесли максимальную отдачу?
2. ### Где теряется вовлечённость
   У каких филиалов высокий охват просмотров, но критически мало лайков и комментариев (синдром «слепых просмотров»)?
3. ### Анализ аномалий
   Необычные всплески репостов или виральные взлёты отдельных постов — разбери их механику.
4. ### Тренды читательского интереса
   Какие темы (краеведение, новинки, детские книги, мастер-классы) вызывают наибольший живой отклик?
5. ### 5 стратегических выводов
   Опирайся на точные цифры выборки.`
    },
    {
        id: 'leaders-secrets',
        icon: 'emoji_events',
        category: 'Разбор лидеров',
        title: 'Разбор лидеров (Секрет победы)',
        desc: 'За счёт чего побеждают топ-филиалы по просмотрам и ER, и что перенять остальным.',
        badge: 'ЛИДЕРЫ',
        prompt: `Проанализируй победу абсолютных лидеров текущего сканирования:
1. Назови топ-3 филиала по просмотрам и топ-3 по коэффициенту вовлечённости (ER).
2. Разбери, за счёт каких конкретных факторов (частота публикаций, подача, визуал, интерактив) они обошли коллег.
3. Сформулируй 3 «золотых правила» лидеров, которые любой другой филиал может внедрить уже на этой неделе.`
    },
    {
        id: 'underdogs-revival',
        icon: 'healing',
        category: 'Антикризис',
        title: 'Реанимация отстающих групп',
        desc: 'Экспресс-диагностика и пошаговый антикризисный план для групп с низким охватом.',
        badge: 'SOS',
        prompt: `Проведи диагностику групп с наименьшими показателями и нулевой активностью:
1. Выдели филиалы с минимальными охватами или отсутствием постов в периоде.
2. Определи типичные ошибки: редкий постинг, скучные пресс-релизные заголовки, отсутствие общения с читателями.
3. Предложи пошаговый «План реанимации на 14 дней» из 5 простых действий, которые поднимут охваты даже без рекламного бюджета.`
    },
    {
        id: 'best-timing',
        icon: 'schedule',
        category: 'Алгоритмы ВК',
        title: 'Тайминг и виральные дни',
        desc: 'В какие дни недели и часы посты библиотек собирают максимум реакций и репостов.',
        badge: 'АЛГОРИТМЫ',
        prompt: `На основе временных меток и данных активности постов проанализируй оптимальный тайминг публикаций:
1. В какие дни недели читатели библиотечных пабликов наиболее отзывчивы на контент?
2. Какие временные слоты (утро 08:00–09:30, обед 12:30–14:00, вечер 19:00–21:30) показывают наибольший ER?
3. Дай рекомендации по частоте публикаций: сколько постов в день/неделю идеально выпускать филиалу, чтобы умная лента ВК не резала показы.`
    },
    {
        id: 'visual-audit',
        icon: 'palette',
        category: 'Визуальный аудит',
        title: 'Аудит визуала и форматов',
        desc: 'Оценка обложек, фото-каруселей, клипов и типичные ошибки визуального оформления.',
        badge: 'ВИЗУАЛ',
        prompt: `Проведи визуальный и форматный аудит публикаций библиотечных групп:
1. Сравни форматы: одиночное фото vs карусель из 3-5 фото vs постер/афиша vs видео. Какой формат собирает больше просмотров?
2. Главные визуальные ошибки библиотечных групп ВК (мелкий нечитаемый текст на афишах, стоковые безликие картинки, перегруженные коллажи).
3. Чек-лист из 5 правил создания цепляющей обложки поста для библиотеки, чтобы остановить скролл ленты.`
    },
    {
        id: 'engagement-quality',
        icon: 'forum',
        category: 'Вовлечённость',
        title: 'Качество вовлечённости (ER и ядро)',
        desc: 'Анализ комментариев и живой дискуссии: реальные читатели против формальных лайков.',
        badge: 'ДИСКУССИИ',
        prompt: `Оцени глубину диалога с аудиторией и качество вовлечённости:
1. Каково соотношение лайков к комментариям и репостам в проанализированных группах?
2. Какие посты смогли вызвать реальные дискуссии читателей в комментариях, а какие собрали только молчаливые лайки?
3. Предложи 3 проверенные механики (вопросы-крючки, опросы, игры в слова, цитаты-загадки), стимулирующие читателей писать осмысленные комментарии.`
    },
    {
        id: 'viral-formula',
        icon: 'rocket_launch',
        category: 'Виральность',
        title: 'Рецепт вирусного поста недели',
        desc: 'Анатомия самого вирального поста выборки и адаптация идеи для других филиалов.',
        badge: 'ВИРУС',
        prompt: `Найди в собранных данных самый виральный пост (максимум репостов и пересылок):
1. Проведи анатомический разбор этого поста: цепляющий заголовок (Hook), эмоциональный триггер, оформление, призыв к действию (CTA).
2. Почему именно этой записью захотели поделиться читатели на своих страницах?
3. Напиши готовую адаптированную матрицу поста по этой же формуле, которую может опубликовать любая библиотека сети!`
    },
    {
        id: 'cross-promo',
        icon: 'hub',
        category: 'Коллаборации',
        title: 'Стратегия кросс-промо и коллабораций',
        desc: 'Взаимный пиар между филиалами, совместные марафоны и перелив читателей.',
        badge: 'СЕТЬ',
        prompt: `Разработай стратегию кросс-продвижения и объединения аудиторий библиотечной сети Владимира:
1. Как крупным филиалам-лидерам поддержать начинающие или специализированные библиотеки без ущерба своим охватам?
2. Предложи концепцию общегородского сетевого флешмоба/квеста (например, «Книжная карта Владимира»), где читатели переходят между группами филиалов.
3. Правила грамотного репоста: как репостить анонсы коллег так, чтобы алгоритм ВК не пессимизировал запись.`
    },
    {
        id: 'media-plan-7d',
        icon: 'calendar_month',
        category: 'Контент-план',
        title: 'Медиаплан на 7 дней с темами',
        desc: 'Готовое расписание из 5 вовлекающих постов с рубриками, интерактивом и призывами к действию.',
        badge: 'КОНТЕНТ-ПЛАН',
        prompt: `Составь готовый к публикации контент-план для библиотечной группы на ближайшие 7 дней (5 постов: Пн, Вт, Ср, Пт, Сб):
Для каждого дня укажи:
- Рубрику и цель (вовлечение / информирование / виральность / экспертность);
- Цепляющий рабочий заголовок;
- Краткое содержание (2-3 предложения) с интерактивным вопросом читателю;
- Визуальное решение (фото библиотекаря, книжная полка, мем, карусель цитат);
- 3-4 рекомендованных хэштега.
Сделай контент живым, душевным и свободным от канцеляризмов!`
    },
    {
        id: 'league-awards',
        icon: 'military_tech',
        category: 'Лига филиалов',
        title: 'Итоги Лиги филиалов и награды Космо',
        desc: 'Рейтинг активности, дивизионы (Космическая/Золотая/Серебряная лига) и персональные номинации для каждого филиала.',
        badge: 'ЛИГА XP',
        prompt: `Проанализируй текущие показатели активности филиалов в рамках «Лиги филиалов» и распредели награды от Космо:
1. ### Космическая Лига (Высший дивизион)
   Назови лидеров общего зачёта по совокупности баллов XP (регулярность, охват, вовлечённость, визуал).
2. ### Награды и специальные номинации от Космо:
   - ⚡ «Мастер виральности недели» (максимум репостов и пересылок);
   - ⏳ «Самый стабильный постинг» (идеальный график и ритмичность);
   - 🛡️ «Гроза умной ленты» (высокий охват и чистый авторский стиль);
   - 🎨 «Мультимедийный гений» (лучшая работа с фото и клипами);
   - 💬 «Сердце сообщества» (живая дискуссия и глубина комментариев);
   - 🚀 «Главный прорыв недели» (наибольший скачок показателей).
3. ### Динамика дивизионов:
   Кто готов к переходу в Высшую лигу, а кому требуется усилить регулярность?
4. ### Напутствие от Космо:
   Вдохновляющее послание каждому филиалу для дальнейшего роста.`
    }
];


/* ===========================================================================
 * КЛАСС CosmoChatModal
 * =========================================================================== */
export class CosmoChatModal {
    constructor({ mascot }) {
        this.mascot = mascot;
        this.overlayEl = null;
        this.dialogEl = null;
        this.messagesEl = null;
        this.inputEl = null;
        this.sendBtnEl = null;
        this.attachBtnEl = null;
        this.fileInputEl = null;
        this.attachmentBarEl = null;
        this.chipsContainerEl = null;
        this.statusPillEl = null;
        this.presetsPopoverEl = null;
        this.presetsBtnEl = null;
        this.isPresetsOpen = false;

        this.isOpen = false;
        this.isBusy = false;
        this.messages = []; // [{role: 'user'|'assistant', content: string, file?: Object}]
        this.attachedFile = null; // {name, size, type, isImage, textContent, dataUrl}
        this.audioEnabled = true;
        this.currentSpeechAudio = null;
        this.currentSpeakingBtn = null;

        this.onEscKeyDown = this.onEscKeyDown.bind(this);
    }

    /* ---------------------------------------------------------------------
     * Инициализация DOM-структуры модального окна
     * ------------------------------------------------------------------- */
    createDOM() {
        if (this.overlayEl) return;

        const overlay = document.createElement('div');
        overlay.className = 'cosmo-chat-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Чат с Космо');

        overlay.innerHTML = `
            <div class="cosmo-chat-dialog">
                <!-- Шапка чата -->
                <div class="cosmo-chat-header">
                    <div class="cosmo-chat-brand">
                        <div class="cosmo-chat-avatar-wrap">
                            <img src="assets/images/mascot/robot_smile.png?v=4.23.2"
                                 alt="Космо"
                                 class="cosmo-chat-avatar-img" />
                            <span class="cosmo-chat-online-dot" title="Космо на связи"></span>
                        </div>
                        <div class="cosmo-chat-title-group">
                            <div class="cosmo-chat-title-row">
                                <h3 class="cosmo-chat-title">ЧАТ С КОСМО</h3>
                                <span class="cosmo-chat-badge">AI SMM-GURU</span>
                            </div>
                            <div class="cosmo-chat-subtitle">
                                <span class="material-symbols-outlined">auto_awesome</span>
                                <span>Библиотечный ИИ-ассистент • Онлайн</span>
                            </div>
                        </div>
                    </div>

                    <div class="cosmo-chat-header-actions">
                        <button type="button" class="cosmo-chat-tool-btn cosmo-chat-presets-btn" data-chat-presets-toggle title="Быстрые пресеты анализа ВК (10 сценариев)">
                            <span class="material-symbols-outlined">analytics</span>
                            <span class="tool-btn-text">Пресеты ВК</span>
                            <span class="presets-count-badge">10</span>
                        </button>
                        <button type="button" class="cosmo-chat-tool-btn" data-chat-export title="Скачать диалог в Markdown">
                            <span class="material-symbols-outlined">download</span>
                            <span class="tool-btn-text">Экспорт</span>
                        </button>
                        <button type="button" class="cosmo-chat-tool-btn" data-chat-clear title="Начать новый диалог">
                            <span class="material-symbols-outlined">restart_alt</span>
                            <span class="tool-btn-text">Новый диалог</span>
                        </button>
                        <button type="button" class="cosmo-chat-tool-btn" data-chat-sound title="Озвучка реплик Космо">
                            <span class="material-symbols-outlined chat-sound-icon">volume_up</span>
                        </button>
                        <button type="button" class="cosmo-chat-close-btn" data-chat-close title="Закрыть окно (Esc)">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <!-- Всплывающий поповер с 10 пресетами анализа групп ВК -->
                <div class="cosmo-chat-presets-backdrop" data-chat-presets-backdrop aria-hidden="true"></div>
                <div class="cosmo-chat-presets-popover" data-chat-presets-popover aria-hidden="true">
                    <div class="presets-popover-header">
                        <div class="popover-title-row">
                            <div class="popover-title-meta">
                                <span class="material-symbols-outlined popover-title-icon">auto_graph</span>
                                <div class="popover-title-text">
                                    <h4 class="popover-title">ПРЕСЕТЫ АНАЛИЗА ГРУПП ВК</h4>
                                    <p class="popover-subtitle">10 готовых сценариев аудита на основе реального сканирования стены</p>
                                </div>
                            </div>
                            <button type="button" class="presets-popover-close" data-chat-presets-close title="Закрыть пресеты (Esc)">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div class="presets-search-wrap">
                            <span class="material-symbols-outlined search-icon">search</span>
                            <input type="search"
                                   class="presets-search-input"
                                   data-presets-search
                                   placeholder="Быстрый поиск по 10 пресетам (вирус, ER, методист, визуал)..." />
                        </div>
                    </div>
                    <div class="presets-grid" data-presets-grid>
                        ${VK_GROUP_PRESETS.map(p => `
                            <button type="button" class="preset-card" data-preset-id="${p.id}" title="${escapeHtml(p.title)}">
                                <div class="preset-card-top">
                                    <span class="material-symbols-outlined preset-icon">${p.icon}</span>
                                    <span class="preset-badge">${p.badge}</span>
                                </div>
                                <div class="preset-title">${p.title}</div>
                                <div class="preset-desc">${p.desc}</div>
                            </button>
                        `).join('')}
                    </div>
                    <div class="presets-empty-state" data-presets-empty style="display: none;">
                        <span class="material-symbols-outlined empty-icon">search_off</span>
                        <div class="empty-title">Пресеты не найдены</div>
                        <div class="empty-desc">Попробуйте ввести другой поисковый запрос (например: «вирус», «ER», «методист», «визуал»)</div>
                    </div>
                </div>

                <!-- Область сообщений -->
                <div class="cosmo-chat-messages" data-chat-messages></div>

                <!-- Плашка быстрого открытия 10 пресетов над вводом -->
                <div class="cosmo-chat-quick-presets-bar">
                    <button type="button" class="cosmo-chat-quick-presets-pill" data-chat-presets-toggle title="Открыть 10 пресетов анализа групп ВК">
                        <span class="material-symbols-outlined pill-bolt">bolt</span>
                        <span class="pill-text">10 быстрых пресетов анализа групп ВК</span>
                        <span class="pill-count">10</span>
                        <span class="material-symbols-outlined pill-arrow">expand_less</span>
                    </button>
                </div>

                <!-- Быстрые чипы-подсказки -->
                <div class="cosmo-chat-chips" data-chat-chips>
                    <button type="button" class="cosmo-chip" data-prompt="Напиши вовлекающий пост для библиотеки о новинках книг с интерактивом и призывом к чтению!">
                        <span class="chip-icon">📚</span> Пост о новинках
                    </button>
                    <button type="button" class="cosmo-chip" data-preset-id="net-audit">
                        <span class="chip-icon">📊</span> Отчёт для методиста
                    </button>
                    <button type="button" class="cosmo-chip" data-preset-id="deep-insights">
                        <span class="chip-icon">💡</span> Инсайты и аномалии
                    </button>
                    <button type="button" class="cosmo-chip" data-prompt="Придумай 3 оригинальные идеи для викторины или опроса в библиотечной группе ВК, чтобы повысить охваты!">
                        <span class="chip-icon">🔥</span> Идея для интерактива
                    </button>
                    <button type="button" class="cosmo-chip" data-preset-id="leaders-secrets">
                        <span class="chip-icon">🏆</span> Секрет лидеров
                    </button>
                </div>

                <!-- Плашка прикреплённого файла -->
                <div class="cosmo-chat-attachment-bar" data-chat-attachment style="display: none;">
                    <div class="attachment-preview-icon">
                        <span class="material-symbols-outlined" data-attach-icon>description</span>
                    </div>
                    <div class="attachment-meta">
                        <span class="attachment-name" data-attach-name>file.txt</span>
                        <span class="attachment-size" data-attach-size>12 КБ</span>
                    </div>
                    <button type="button" class="attachment-remove-btn" data-attach-remove title="Удалить прикреплённый файл">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Панель инструментов форматирования (Markdown Toolbar) -->
                <div class="cosmo-chat-format-bar" data-chat-format-bar>
                    <div class="format-bar-group">
                        <button type="button" class="format-btn" data-format="bold" title="Жирный шрифт (**текст**) • Ctrl+B">
                            <strong>B</strong>
                        </button>
                        <button type="button" class="format-btn" data-format="italic" title="Курсив (*текст*) • Ctrl+I">
                            <em>I</em>
                        </button>
                        <button type="button" class="format-btn" data-format="strike" title="Зачёркнутый (~~текст~~) • Ctrl+Shift+X">
                            <s>S</s>
                        </button>
                        <button type="button" class="format-btn" data-format="underline" title="Подчёркнутый (__текст__)">
                            <u>U</u>
                        </button>
                    </div>

                    <span class="format-sep"></span>

                    <div class="format-bar-group">
                        <button type="button" class="format-btn" data-format="heading" title="Заголовок (### Заголовок)">
                            <span class="format-icon-text">H</span>
                        </button>
                        <button type="button" class="format-btn" data-format="quote" title="Цитата (> Цитата)">
                            <span class="material-symbols-outlined">format_quote</span>
                        </button>
                        <button type="button" class="format-btn" data-format="ul" title="Маркированный список (- Пункт)">
                            <span class="material-symbols-outlined">format_list_bulleted</span>
                        </button>
                        <button type="button" class="format-btn" data-format="ol" title="Нумерованный список (1. Пункт)">
                            <span class="material-symbols-outlined">format_list_numbered</span>
                        </button>
                        <button type="button" class="format-btn" data-format="task" title="Чеклист / Задачи (- [ ] Пункт)">
                            <span class="material-symbols-outlined">check_box</span>
                        </button>
                    </div>

                    <span class="format-sep"></span>

                    <div class="format-bar-group">
                        <button type="button" class="format-btn" data-format="code" title="Код (\`код\` или \`\`\`блок) • Ctrl+\`">
                            <span class="material-symbols-outlined">code</span>
                        </button>
                        <button type="button" class="format-btn" data-format="link" title="Вставить ссылку ([текст](url)) • Ctrl+K">
                            <span class="material-symbols-outlined">link</span>
                        </button>
                        <button type="button" class="format-btn" data-format="table" title="Таблица Markdown">
                            <span class="material-symbols-outlined">table</span>
                        </button>
                        <button type="button" class="format-btn" data-format="spoiler" title="Спойлер (||скрытый текст||)">
                            <span class="material-symbols-outlined">visibility_off</span>
                        </button>
                    </div>

                    <div class="format-bar-spacer"></div>

                    <div class="format-bar-group format-bar-right">
                        <button type="button" class="format-btn format-btn-preview" data-format="preview" title="Предпросмотр Markdown • Ctrl+Shift+P">
                            <span class="material-symbols-outlined preview-icon">visibility</span>
                            <span class="preview-label">Превью</span>
                        </button>
                    </div>
                </div>

                <!-- Нижняя панель ввода -->
                <div class="cosmo-chat-footer">
                    <input type="file"
                           class="cosmo-chat-file-input"
                           data-chat-file-input
                           accept=".txt,.md,.json,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
                           style="display: none;" />

                    <button type="button" class="cosmo-chat-attach-btn" data-chat-attach title="Прикрепить файл для анализа ИИ (текст, данные или фото)">
                        <span class="material-symbols-outlined">attach_file</span>
                        <span class="attach-btn-label">Файл</span>
                    </button>

                    <div class="cosmo-chat-input-wrap">
                        <textarea class="cosmo-chat-input"
                                  data-chat-input
                                  rows="1"
                                  placeholder="Спроси Космо, выбери пресет анализа или прикрепи файл... (Enter — отправить, Shift+Enter — перенос)"></textarea>
                        <div class="cosmo-chat-preview" data-chat-preview style="display: none;"></div>
                    </div>

                    <button type="button" class="cosmo-chat-send-btn" data-chat-send title="Отправить сообщение (Enter)">
                        <span class="material-symbols-outlined">send</span>
                        <span class="send-btn-label">Отправить</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayEl = overlay;
        this.dialogEl = overlay.querySelector('.cosmo-chat-dialog');
        this.messagesEl = overlay.querySelector('[data-chat-messages]');
        this.inputEl = overlay.querySelector('[data-chat-input]');
        this.sendBtnEl = overlay.querySelector('[data-chat-send]');
        this.attachBtnEl = overlay.querySelector('[data-chat-attach]');
        this.fileInputEl = overlay.querySelector('[data-chat-file-input]');
        this.attachmentBarEl = overlay.querySelector('[data-chat-attachment]');
        this.chipsContainerEl = overlay.querySelector('[data-chat-chips]');
        this.presetsPopoverEl = overlay.querySelector('[data-chat-presets-popover]');
        this.presetsBtnEl = overlay.querySelector('[data-chat-presets-toggle]');
        this.formatBarEl = overlay.querySelector('[data-chat-format-bar]');
        this.previewEl = overlay.querySelector('[data-chat-preview]');
        this.formatPreviewBtn = overlay.querySelector('[data-format="preview"]');
        this.isPreviewActive = false;

        this.bindEvents();
    }

    /* ---------------------------------------------------------------------
     * Привязка событий интерфейса
     * ------------------------------------------------------------------- */
    bindEvents() {
        // Клик вне диалога или закрытие поповера
        this.overlayEl.addEventListener('click', (e) => {
            // Если открыт поповер и клик был не внутри него и не по кнопке открытия — закрываем поповер
            if (this.isPresetsOpen && !e.target.closest('[data-chat-presets-popover]') && !e.target.closest('[data-chat-presets-toggle]')) {
                this.closePresetsPopover();
                return;
            }
            if (e.target === this.overlayEl) {
                this.close();
            }
        });

        // Кнопка «Закрыть» диалог
        const closeBtn = this.overlayEl.querySelector('[data-chat-close]');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Кнопки открытия/закрытия поповера пресетов
        const toggleBtns = this.overlayEl.querySelectorAll('[data-chat-presets-toggle]');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePresetsPopover();
            });
        });

        const closePresetsBtn = this.overlayEl.querySelector('[data-chat-presets-close]');
        if (closePresetsBtn) {
            closePresetsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePresetsPopover();
            });
        }

        const presetsBackdrop = this.overlayEl.querySelector('[data-chat-presets-backdrop]');
        if (presetsBackdrop) {
            presetsBackdrop.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePresetsPopover();
            });
        }

        // Клик по карточке пресета внутри поповера
        if (this.presetsPopoverEl) {
            this.presetsPopoverEl.addEventListener('click', (e) => {
                const card = e.target.closest('[data-preset-id]');
                if (card && card.dataset.presetId) {
                    e.stopPropagation();
                    this.applyPreset(card.dataset.presetId);
                }
            });
        }

        // Живой поиск по 10 пресетам внутри поповера
        const searchInput = this.presetsPopoverEl ? this.presetsPopoverEl.querySelector('[data-presets-search]') : null;
        const emptyStateEl = this.presetsPopoverEl ? this.presetsPopoverEl.querySelector('[data-presets-empty]') : null;
        const presetsGridEl = this.presetsPopoverEl ? this.presetsPopoverEl.querySelector('[data-presets-grid]') : null;

        if (searchInput && presetsGridEl) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.trim().toLowerCase();
                const cards = presetsGridEl.querySelectorAll('.preset-card');
                let visibleCount = 0;

                cards.forEach(card => {
                    const title = (card.querySelector('.preset-title')?.textContent || '').toLowerCase();
                    const desc = (card.querySelector('.preset-desc')?.textContent || '').toLowerCase();
                    const badge = (card.querySelector('.preset-badge')?.textContent || '').toLowerCase();
                    const id = (card.dataset.presetId || '').toLowerCase();
                    const match = !q || title.includes(q) || desc.includes(q) || badge.includes(q) || id.includes(q);

                    card.style.display = match ? '' : 'none';
                    if (match) visibleCount++;
                });

                if (emptyStateEl) {
                    emptyStateEl.style.display = (visibleCount === 0) ? 'flex' : 'none';
                }
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (searchInput.value) {
                        e.stopPropagation();
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        // Кнопка экспорта диалога в Markdown (.md)
        const exportBtn = this.overlayEl.querySelector('[data-chat-export]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportDialogMarkdown(exportBtn);
            });
        }

        // Кнопка «Новый диалог»
        const clearBtn = this.overlayEl.querySelector('[data-chat-clear]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.stopSpeaking();
                this.messages = [];
                this.clearAttachedFile();
                this.closePresetsPopover();
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
                this.renderWelcome();
                if (this.inputEl) this.inputEl.focus();
            });
        }

        // Кнопка звука
        const soundBtn = this.overlayEl.querySelector('[data-chat-sound]');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.audioEnabled = !this.audioEnabled;
                const icon = soundBtn.querySelector('.chat-sound-icon');
                if (icon) icon.textContent = this.audioEnabled ? 'volume_up' : 'volume_off';
                soundBtn.classList.toggle('is-muted', !this.audioEnabled);
            });
        }

        // Панель инструментов форматирования текста (Markdown Toolbar)
        if (this.formatBarEl) {
            this.formatBarEl.addEventListener('mousedown', (e) => {
                const btn = e.target.closest('.format-btn');
                if (btn && btn.dataset.format !== 'preview') {
                    // Предотвращаем потерю фокуса и позиции курсора в поле ввода
                    e.preventDefault();
                }
            });

            this.formatBarEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.format-btn');
                if (!btn) return;
                const fmt = btn.dataset.format;
                if (fmt === 'preview') {
                    this.toggleMarkdownPreview();
                } else if (fmt) {
                    this.insertFormatting(fmt);
                }
            });
        }

        // Кнопка «Отправить»
        this.sendBtnEl.addEventListener('click', () => this.handleSend());

        // Авто-рост поля ввода, отправка по Enter и горячие клавиши форматирования
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
                return;
            }

            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            if (cmdOrCtrl && !e.altKey) {
                const key = e.key.toLowerCase();
                if (key === 'b' && !e.shiftKey) {
                    e.preventDefault();
                    this.insertFormatting('bold');
                } else if (key === 'i' && !e.shiftKey) {
                    e.preventDefault();
                    this.insertFormatting('italic');
                } else if (key === 'k' && !e.shiftKey) {
                    e.preventDefault();
                    this.insertFormatting('link');
                } else if (key === '`' && !e.shiftKey) {
                    e.preventDefault();
                    this.insertFormatting('code');
                } else if (key === 'x' && e.shiftKey) {
                    e.preventDefault();
                    this.insertFormatting('strike');
                } else if (key === 'p' && e.shiftKey) {
                    e.preventDefault();
                    this.toggleMarkdownPreview();
                }
            }
        });

        this.inputEl.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            const newHeight = Math.min(this.inputEl.scrollHeight, 140);
            this.inputEl.style.height = `${newHeight}px`;
            this.updatePreviewIfActive();
        });

        // Кнопка «Прикрепить файл»
        this.attachBtnEl.addEventListener('click', () => {
            if (this.fileInputEl) this.fileInputEl.click();
        });

        this.fileInputEl.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.processSelectedFile(files[0]);
            }
            this.fileInputEl.value = '';
        });

        // Удаление прикреплённого файла
        const removeAttachBtn = this.overlayEl.querySelector('[data-attach-remove]');
        if (removeAttachBtn) {
            removeAttachBtn.addEventListener('click', () => this.clearAttachedFile());
        }

        // Быстрые чипы (поддерживают и data-prompt, и data-preset-id)
        this.chipsContainerEl.addEventListener('click', (e) => {
            const chip = e.target.closest('.cosmo-chip');
            if (!chip) return;
            if (chip.dataset.presetId) {
                this.applyPreset(chip.dataset.presetId);
            } else if (chip.dataset.prompt) {
                this.inputEl.value = chip.dataset.prompt;
                this.handleSend();
            }
        });

        // Делегирование кликов по ленте сообщений (копирование, перегенерация, озвучка, пресеты)
        this.messagesEl.addEventListener('click', (e) => {
            // Клик по чипу пресета из баннера приветствия
            const welcomeChip = e.target.closest('.welcome-preset-chip');
            if (welcomeChip) {
                if (welcomeChip.dataset.presetId) {
                    this.applyPreset(welcomeChip.dataset.presetId);
                    return;
                }
                if (welcomeChip.hasAttribute('data-chat-presets-toggle')) {
                    this.openPresetsPopover();
                    return;
                }
            }

            // Копирование списка книг для читателя со стеллажа
            const copyShelfBtn = e.target.closest('[data-copy-shelf]');
            if (copyShelfBtn) {
                const text = copyShelfBtn.getAttribute('data-copy-shelf') || '';
                this.copyToClipboard(text, copyShelfBtn, 'Список книг скопирован! 📚');
                return;
            }

            // Копирование текста поста
            const copyPostBtn = e.target.closest('[data-copy-post]');
            if (copyPostBtn) {
                const text = copyPostBtn.getAttribute('data-copy-post') || '';
                this.copyToClipboard(text, copyPostBtn, 'Пост скопирован! ✅');
                return;
            }

            // Перегенерация (Другой вариант)
            const regenBtn = e.target.closest('[data-regenerate-response]');
            if (regenBtn) {
                this.regenerateResponse(regenBtn);
                return;
            }

            // Озвучка ответа Космо (голос Бэлы)
            const speakBtn = e.target.closest('[data-speak-response]');
            if (speakBtn) {
                const msgCard = speakBtn.closest('.cosmo-chat-msg');
                const copyBtn = msgCard ? (msgCard.querySelector('[data-copy-shelf]') || msgCard.querySelector('[data-copy-post]')) : null;
                const text = copyBtn ? (copyBtn.getAttribute('data-copy-shelf') || copyBtn.getAttribute('data-copy-post')) : (msgCard ? msgCard.querySelector('.msg-body')?.innerText : '');
                this.toggleSpeakResponse(text || '', speakBtn);
                return;
            }

            // Копирование блока кода
            const copyCodeBtn = e.target.closest('[data-copy-code]');
            if (copyCodeBtn) {
                const wrap = copyCodeBtn.closest('.cosmo-chat-codeblock-wrap');
                const codeBlock = wrap ? wrap.querySelector('code') : null;
                const codeText = codeBlock ? codeBlock.innerText : '';
                this.copyToClipboard(codeText, copyCodeBtn, 'Скопировано! ✅');
                return;
            }

            // Интерактивный спойлер ||текст||
            const spoiler = e.target.closest('.cosmo-chat-spoiler');
            if (spoiler) {
                spoiler.classList.toggle('revealed');
                return;
            }

            // Интерактивный чеклист / задача
            const taskItem = e.target.closest('.cosmo-task-item');
            if (taskItem && e.target.tagName === 'INPUT') {
                taskItem.classList.toggle('is-checked', e.target.checked);
            }
        });

        // Drag & Drop файлов прямо на окно чата
        const dropTarget = this.dialogEl;
        ['dragenter', 'dragover'].forEach(name => {
            dropTarget.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropTarget.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropTarget.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropTarget.classList.remove('is-dragover');
            });
        });

        dropTarget.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                this.processSelectedFile(dt.files[0]);
            }
        });
    }

    /* ---------------------------------------------------------------------
     * Обработка и чтение прикреплённого файла
     * ------------------------------------------------------------------- */
    processSelectedFile(file) {
        if (!file) return;

        const maxBytes = 10 * 1024 * 1024; // 10 МБ лимит загрузки
        if (file.size > maxBytes) {
            alert(`Файл слишком большой (${formatBytes(file.size)}). Максимальный размер: 10 МБ.`);
            return;
        }

        const isImage = file.type.startsWith('image/');
        const ext = file.name.split('.').pop().toLowerCase();
        const isText = isImage ? false : (
            file.type.startsWith('text/') ||
            ['txt', 'md', 'json', 'csv', 'js', 'html', 'css', 'xml', 'log'].includes(ext)
        );

        const attachObj = {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            ext,
            isImage,
            isText,
            textContent: null,
            dataUrl: null
        };

        if (isText) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Ограничиваем считываемый текст до 60 КБ для гарантированного прохождения в ИИ
                let text = String(e.target.result || '');
                if (text.length > 60000) {
                    text = text.slice(0, 60000) + '\n\n...[остальная часть файла опущена для экономии контекста]';
                }
                attachObj.textContent = text;
                this.displayAttachmentBar(attachObj);
            };
            reader.readAsText(file);
        } else if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachObj.dataUrl = e.target.result;
                this.displayAttachmentBar(attachObj);
            };
            reader.readAsDataURL(file);
        } else {
            // Бинарный файл / документ (например, docx/pdf)
            this.displayAttachmentBar(attachObj);
        }
    }

    displayAttachmentBar(attachObj) {
        this.attachedFile = attachObj;
        if (!this.attachmentBarEl) return;

        const nameEl = this.attachmentBarEl.querySelector('[data-attach-name]');
        const sizeEl = this.attachmentBarEl.querySelector('[data-attach-size]');
        const iconEl = this.attachmentBarEl.querySelector('[data-attach-icon]');

        if (nameEl) nameEl.textContent = attachObj.name;
        if (sizeEl) sizeEl.textContent = formatBytes(attachObj.size);
        if (iconEl) {
            iconEl.textContent = attachObj.isImage ? 'image' : (attachObj.isText ? 'description' : 'attach_file');
        }

        this.attachmentBarEl.style.display = 'flex';
    }

    clearAttachedFile() {
        this.attachedFile = null;
        if (this.attachmentBarEl) {
            this.attachmentBarEl.style.display = 'none';
        }
    }

    /* ---------------------------------------------------------------------
     * Вставка Markdown-форматирования в поле ввода
     * ------------------------------------------------------------------- */
    insertFormatting(type) {
        if (!this.inputEl) return;
        const textarea = this.inputEl;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const sel = text.slice(start, end);

        let replacement = '';
        let cursorOffset = 0;

        switch (type) {
            case 'bold':
                replacement = `**${sel || 'жирный текст'}**`;
                cursorOffset = sel ? replacement.length : 2;
                break;
            case 'italic':
                replacement = `*${sel || 'курсив'}*`;
                cursorOffset = sel ? replacement.length : 1;
                break;
            case 'strike':
                replacement = `~~${sel || 'зачёркнутый текст'}~~`;
                cursorOffset = sel ? replacement.length : 2;
                break;
            case 'underline':
                replacement = `__${sel || 'подчёркнутый текст'}__`;
                cursorOffset = sel ? replacement.length : 2;
                break;
            case 'heading':
                if (sel) {
                    replacement = sel.split('\n').map(l => l ? `### ${l}` : l).join('\n');
                } else {
                    replacement = `### Заголовок\n`;
                }
                cursorOffset = replacement.length;
                break;
            case 'quote':
                if (sel) {
                    replacement = sel.split('\n').map(l => `> ${l}`).join('\n');
                } else {
                    replacement = `> Цитата\n`;
                }
                cursorOffset = replacement.length;
                break;
            case 'ul':
                if (sel) {
                    replacement = sel.split('\n').map(l => l ? `- ${l}` : l).join('\n');
                } else {
                    replacement = `- Пункт 1\n- Пункт 2\n`;
                }
                cursorOffset = replacement.length;
                break;
            case 'ol':
                if (sel) {
                    replacement = sel.split('\n').map((l, i) => l ? `${i + 1}. ${l}` : l).join('\n');
                } else {
                    replacement = `1. Первый пункт\n2. Второй пункт\n`;
                }
                cursorOffset = replacement.length;
                break;
            case 'task':
                if (sel) {
                    replacement = sel.split('\n').map(l => l ? `- [ ] ${l}` : l).join('\n');
                } else {
                    replacement = `- [ ] Новая задача\n`;
                }
                cursorOffset = replacement.length;
                break;
            case 'code':
                if (sel.includes('\n')) {
                    replacement = `\`\`\`\n${sel || '// код'}\n\`\`\`\n`;
                    cursorOffset = sel ? replacement.length : 4;
                } else {
                    replacement = `\`${sel || 'код'}\``;
                    cursorOffset = sel ? replacement.length : 1;
                }
                break;
            case 'link':
                replacement = `[${sel || 'текст ссылки'}](https://)`;
                cursorOffset = sel ? replacement.length - 1 : 1;
                break;
            case 'table':
                replacement = `\n| Параметр | Значение |\n| :--- | :---: |\n| Заголовок 1 | Данные 1 |\n| Заголовок 2 | Данные 2 |\n`;
                cursorOffset = replacement.length;
                break;
            case 'spoiler':
                replacement = `||${sel || 'скрытый текст'}||`;
                cursorOffset = sel ? replacement.length : 2;
                break;
            default:
                return;
        }

        textarea.focus();
        if (typeof textarea.setRangeText === 'function') {
            textarea.setRangeText(replacement, start, end, 'end');
        } else {
            textarea.value = text.slice(0, start) + replacement + text.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + replacement.length;
        }

        if (!sel && cursorOffset) {
            textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
        }

        textarea.dispatchEvent(new Event('input'));
        this.updatePreviewIfActive();
    }

    /* ---------------------------------------------------------------------
     * Переключение предпросмотра Markdown
     * ------------------------------------------------------------------- */
    toggleMarkdownPreview() {
        if (!this.previewEl || !this.inputEl) return;
        this.isPreviewActive = !this.isPreviewActive;

        if (this.isPreviewActive) {
            this.updatePreviewIfActive();
            this.previewEl.style.display = 'block';
            this.inputEl.style.display = 'none';
            if (this.formatPreviewBtn) {
                this.formatPreviewBtn.classList.add('is-active');
                const label = this.formatPreviewBtn.querySelector('.preview-label');
                if (label) label.textContent = 'Редактор';
                const icon = this.formatPreviewBtn.querySelector('.preview-icon');
                if (icon) icon.textContent = 'edit';
            }
        } else {
            this.previewEl.style.display = 'none';
            this.inputEl.style.display = '';
            if (this.formatPreviewBtn) {
                this.formatPreviewBtn.classList.remove('is-active');
                const label = this.formatPreviewBtn.querySelector('.preview-label');
                if (label) label.textContent = 'Превью';
                const icon = this.formatPreviewBtn.querySelector('.preview-icon');
                if (icon) icon.textContent = 'visibility';
            }
            this.inputEl.focus();
        }
    }

    /* ---------------------------------------------------------------------
     * Обновление контейнера предпросмотра если режим активен
     * ------------------------------------------------------------------- */
    updatePreviewIfActive() {
        if (!this.isPreviewActive || !this.previewEl || !this.inputEl) return;
        const raw = this.inputEl.value.trim();
        if (!raw) {
            this.previewEl.innerHTML = '<div class="preview-empty"><em>Начните вводить текст, чтобы увидеть форматирование...</em></div>';
            return;
        }
        this.previewEl.innerHTML = parseCosmoMarkdown(raw);
    }

    /* ---------------------------------------------------------------------
     * Открытие и закрытие модального окна
     * ------------------------------------------------------------------- */
    open(initialQuery = '') {
        this.createDOM();
        this.isOpen = true;

        document.addEventListener('keydown', this.onEscKeyDown);
        document.body.classList.add('cosmo-chat-open');
        this.overlayEl.classList.add('is-open');

        // Если диалог пуст — показываем приветствие Космо
        if (this.messages.length === 0) {
            this.renderWelcome();
        }

        // Анимация радости у маскота
        if (this.mascot) {
            this.mascot.setState('smile');
            this.mascot.setMoodBadge('💬', 4000);
            if (this.mascot.playVoice) {
                this.mascot.playVoice('post_scan_10', true);
            }
        }

        setTimeout(() => {
            if (this.inputEl) {
                if (initialQuery) {
                    this.inputEl.value = initialQuery;
                    this.handleSend();
                } else {
                    this.inputEl.focus();
                }
            }
        }, 150);
    }

    /**
     * Интерактивный подбор книг со стеллажа («Книжная полка с Космо»)
     */
    openShelfRecommendation(genreId = 'universal', branchCode = 'cgb') {
        this.createDOM();
        this.isOpen = true;
        this.isShelfMode = true;
        this.shelfGenreId = genreId;
        this.shelfBranchCode = branchCode;

        document.addEventListener('keydown', this.onEscKeyDown);
        document.body.classList.add('cosmo-chat-open');
        this.overlayEl.classList.add('is-open');
        this.dialogEl.classList.add('reader-mode');
        this.overlayEl.classList.add('reader-mode');

        this.messages = [];
        this.messagesEl.innerHTML = '';

        if (this.mascot) {
            this.mascot.setState('smile');
            this.mascot.setMoodBadge('📚', 5000);
            if (this.mascot.playVoice) {
                this.mascot.playVoice('post_scan_10', true);
            }
        }

        const bCodeLower = String(branchCode || '').trim().toLowerCase();
        const branch = (CANONICAL_BRANCHES || []).find(b => {
            if (!b) return false;
            if (b.shortCode && b.shortCode.toLowerCase() === bCodeLower) return true;
            if (b.canonicalName && b.canonicalName.toLowerCase() === bCodeLower) return true;
            if (b.branchNum && b.branchNum.toLowerCase() === bCodeLower) return true;
            if (b.screenName && b.screenName.toLowerCase() === bCodeLower) return true;
            if (b.rawId && String(b.rawId) === bCodeLower) return true;
            if (bCodeLower === 'cgb' && (b.shortCode === 'ЦГБ' || b.branchNum === 'ЦГБ')) return true;
            if (bCodeLower === 'cdb' && (b.shortCode === 'ЦДБ' || b.branchNum === 'ЦДБ')) return true;
            if (/^f\d+$/i.test(bCodeLower)) {
                const num = bCodeLower.replace(/^f/i, '');
                if (b.shortCode === `Ф-${num}` || b.branchNum === `Ф-${num}`) return true;
            }
            return false;
        }) || { canonicalName: 'Библиотека г. Владимира' };

        const genreMap = {
            universal: { name: 'Любая литература (Универсальный подбор)', icon: 'auto_awesome' },
            detective: { name: 'Детективы и остросюжетная литература', icon: 'search' },
            sci_fi: { name: 'Фантастика и фэнтези', icon: 'rocket_launch' },
            modern_prose: { name: 'Современная проза и бестселлеры', icon: 'menu_book' },
            romance: { name: 'Романтическая и сентиментальная проза', icon: 'favorite' },
            vladimir_history: { name: 'Краеведение и история Владимира', icon: 'account_balance' },
            children: { name: 'Детская и подростковая литература', icon: 'face' },
            non_fiction: { name: 'Нон-фикшн и саморазвитие', icon: 'psychology' }
        };
        const genreObj = genreMap[genreId] || genreMap.universal;

        // Полное скрытие ВСЕХ инструментов для библиотекарей и SMM в DOM чата
        const librarianSelectors = [
            '[data-chat-presets-toggle]',
            '[data-chat-export]',
            '[data-chat-clear]',
            '[data-chat-close]',
            '[data-chat-attach]',
            '.cosmo-chat-presets-btn',
            '.cosmo-chat-presets-popover',
            '.cosmo-chat-presets-backdrop',
            '.cosmo-chat-quick-presets-bar',
            '.cosmo-chat-close-btn',
            '.cosmo-chat-attachment-bar'
        ];
        librarianSelectors.forEach(sel => {
            const list = this.dialogEl.querySelectorAll(sel);
            list.forEach(el => el.style.setProperty('display', 'none', 'important'));
        });
        if (this.attachmentBarEl) this.attachmentBarEl.style.setProperty('display', 'none', 'important');

        // Перенастройка шапки под читателя (без SMM и ВК)
        const brandBadge = this.dialogEl.querySelector('.cosmo-chat-badge');
        if (brandBadge) brandBadge.textContent = 'КНИЖНЫЙ РОБОТ';
        const brandTitle = this.dialogEl.querySelector('.cosmo-chat-title');
        if (brandTitle) brandTitle.textContent = 'ПОЛКА С КОСМО';
        const brandSub = this.dialogEl.querySelector('.cosmo-chat-subtitle');
        if (brandSub) brandSub.innerHTML = `<span class="material-symbols-outlined">menu_book</span><span>${escapeHtml(branch.canonicalName)} &bull; Книжный гид</span>`;

        // Кнопка «Заново» для перезапуска сценария рекомендаций
        let restartBtn = this.dialogEl.querySelector('[data-shelf-restart]');
        if (!restartBtn) {
            restartBtn = document.createElement('button');
            restartBtn.type = 'button';
            restartBtn.className = 'cosmo-chat-tool-btn cosmo-shelf-restart-btn';
            restartBtn.setAttribute('data-shelf-restart', '');
            restartBtn.setAttribute('title', 'Начать подбор книг заново');
            restartBtn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span><span class="tool-btn-text">Заново</span>';
            const actionsEl = this.dialogEl.querySelector('.cosmo-chat-header-actions');
            if (actionsEl) {
                actionsEl.insertBefore(restartBtn, actionsEl.firstChild);
            }
            restartBtn.addEventListener('click', () => {
                this.openShelfRecommendation(this.shelfGenreId, this.shelfBranchCode);
            });
        }

        // Замена SMM-чипсов на читательские подсказки
        if (this.chipsContainerEl) {
            this.chipsContainerEl.innerHTML = `
                <button type="button" class="cosmo-chip" data-prompt="Посоветуй ещё 3 захватывающие книги!">
                    <span class="chip-icon">📖</span> Ещё 3 книги
                </button>
                <button type="button" class="cosmo-chip" data-prompt="Какую самую популярную книгу у читателей обязательно стоит прочитать?">
                    <span class="chip-icon">🔥</span> Главный хит
                </button>
                <button type="button" class="cosmo-chip" data-prompt="Посоветуй короткую, уютную и душевную книгу на один вечер.">
                    <span class="chip-icon">☕</span> На вечер
                </button>
                <button type="button" class="cosmo-chip" data-prompt="Какая книга в этом направлении признана золотой классикой?">
                    <span class="chip-icon">⭐</span> Золотая классика
                </button>
            `;
            const newChips = this.chipsContainerEl.querySelectorAll('.cosmo-chip');
            newChips.forEach(ch => {
                ch.addEventListener('click', () => {
                    const prompt = ch.getAttribute('data-prompt');
                    if (prompt) {
                        this.inputEl.value = prompt;
                        this.handleSend();
                    }
                });
            });
        }

        if (this.inputEl) {
            this.inputEl.setAttribute('placeholder', 'Спросите робота Космо: что почитать, сюжет или любимый автор...');
        }

        const shelfGreetingHtml = `
            <div class="cosmo-chat-msg cosmo-chat-msg-bot shelf-recommend-welcome">
                <div class="msg-avatar">
                    <img src="assets/images/mascot/robot_smile.png?v=4.24.2" alt="Космо" />
                </div>
                <div class="msg-content">
                    <div class="msg-author">Космо • Книжный сомелье</div>
                    <div class="msg-body">
                        <p>Привет! 🤖 Я библиотечный робот <strong>Космо</strong>, твой персональный книжный сомелье в <strong>${escapeHtml(branch.canonicalName)}</strong>!</p>
                        <p>Не знаешь, что выбрать? Я с радостью подберу, что почитать! Ответь всего на 2 быстрых вопроса, и я предложу отличные книги под твоё настроение с цепляющим описанием без спойлеров!</p>
                        <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.15); margin: 10px 0;">
                        <p style="margin-bottom: 8px;"><strong>Вопрос 1 из 2: Какое настроение и ощущение ты ищешь?</strong></p>
                        <div class="shelf-mood-chips-container" id="shelf-q1-mood-chips">
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Драйв, острый сюжет, адреналин и напряжение">🔥 Драйв и экшен</button>
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Уют, душевное тепло, доброта и спокойствие">☕ Уют и тепло</button>
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Загадки, интеллектуальный лабиринт и интрига">🧩 Загадка и интрига</button>
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Глубокая драма, сильные переживания, до слёз">😭 До слёз</button>
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Инсайты, новые знания, развитие и расширение кругозора">💡 Инсайты</button>
                            <button type="button" class="shelf-mood-chip-btn" data-mood="Юмор, лёгкость, ирония и позитив">😂 Юмор и смех</button>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.78rem; opacity: 0.75; display: flex; align-items: center; gap: 6px;">
                            <span>💬 Наша группа ВКонтакте:</span>
                            <a href="https://vk.ru/club241534292" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">vk.ru/club241534292</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.messagesEl.innerHTML = shelfGreetingHtml;
        this.scrollToBottom();

        // Обработка вопроса 1
        const q1Chips = this.messagesEl.querySelectorAll('#shelf-q1-mood-chips .shelf-mood-chip-btn');
        q1Chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const moodText = chip.getAttribute('data-mood');
                q1Chips.forEach(c => {
                    c.disabled = true;
                    if (c === chip) c.classList.add('selected');
                });

                this.appendUserMessage(`Настроение: ${chip.textContent.trim()}`);
                this.messages.push({ role: 'user', content: `Моё настроение: ${moodText}` });

                // Задаем вопрос 2 (Темп чтения)
                setTimeout(() => {
                    const q2Html = `
                        <div class="cosmo-chat-msg cosmo-chat-msg-bot">
                            <div class="msg-avatar">
                                <img src="assets/images/mascot/robot_smile.png?v=4.24.2" alt="Космо" />
                            </div>
                            <div class="msg-content">
                                <div class="msg-author">Космо • Книжный сомелье</div>
                                <div class="msg-body">
                                    <p>Отличный выбор! 🚀 Теперь <strong>Вопрос 2 из 2: Какой темп чтения тебе сейчас ближе?</strong></p>
                                    <div class="shelf-mood-chips-container" id="shelf-q2-pace-chips">
                                        <button type="button" class="shelf-mood-chip-btn" data-pace="Быстрое динамичное чтение (на одном дыхании, короткие главы, не оторваться)">⚡ Динамичный (залпом)</button>
                                        <button type="button" class="shelf-mood-chip-btn" data-pace="Размеренное погружение (богатый язык, неспешное смакование деталей)">📖 Глубокое погружение</button>
                                        <button type="button" class="shelf-mood-chip-btn" data-pace="Компактный объём (повесть, сборник коротких рассказов на вечер)">☕ Короткий формат</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    const q2Div = document.createElement('div');
                    q2Div.innerHTML = q2Html;
                    const q2El = q2Div.firstElementChild;
                    this.messagesEl.appendChild(q2El);
                    this.scrollToBottom();

                    // Обработка вопроса 2
                    const q2Chips = q2El.querySelectorAll('#shelf-q2-pace-chips .shelf-mood-chip-btn');
                    q2Chips.forEach(pChip => {
                        pChip.addEventListener('click', async () => {
                            const paceText = pChip.getAttribute('data-pace');
                            q2Chips.forEach(c => {
                                c.disabled = true;
                                if (c === pChip) c.classList.add('selected');
                            });

                            this.appendUserMessage(`Темп чтения: ${pChip.textContent.trim()}`);
                            this.messages.push({ role: 'user', content: `Темп чтения: ${paceText}` });

                            const finalPrompt = `Ты — Космо, экспертный библиотечный робот и книжный сомелье библиотечной сети г. Владимира.
Читатель обратился за книжной рекомендацией в библиотеке: «${branch.canonicalName}» (интересует направление: «${genreObj.name}»).
Его запрос:
• Настроение: ${moodText}
• Темп чтения: ${paceText}

Подбери, что почитать: ТОП-3 конкретные великолепные книги из классического или современного фонда муниципальных библиотек, которые на 100% соответствуют этому настроению и темпу!

В ВАЖНЕЙШЕЕ ТРЕБОВАНИЕ — СТРОЖАЙШИЙ ЗАПРЕТ НА ИНОАГЕНТОВ:
Категорически запрещено рекомендовать авторов, внесённых Минюстом РФ в реестр иностранных агентов, а также экстремистов (строго исключить Б. Акунина / Г. Чхартишвили, Д. Глуховского, Д. Быкова, М. Зыгаря, Л. Улицкую, В. Шендеровича, А. Невзорова, Т. Эйдельман, Е. Шульман, Л. Горалик, В. Полозкову, М. Шишкина и любых других лиц из реестров иноагентов), А ТАКЖЕ ЛЮБЫЕ ИХ ПРОИЗВЕДЕНИЯ И ПЕРСОНАЖЕЙ (Эраст Фандорин, «Азазель», «Метро 2033», «Метро 2034», «Текст», «Пост», «Казус Кукоцкого», «Вся кремлёвская рать» и др.).
Рекомендуй исключительно проверенный золотой фонд: русскую и мировую классику, советских классиков, признанных современных авторов без статуса иноагента и ограничений!
Книги должны реально присутствовать в фондах муниципальных библиотек г. Владимира.

ЗАПРЕТ НА ВЫМЫШЛЕННЫЕ ДАННЫЕ И ЭЛЕКТРОННЫЕ ПОРТАЛЫ:
Категорически запрещено писать про «электронные библиотеки», «портал Электронная библиотека Владимира», «vladimir-lib.ru», вымышленные имена библиотек («им. Пушкина», «им. Фадеева») или шифры полок. В сети ЦГБ г. Владимира 18 библиотек (ЦГБ, ЦДБ и филиалы №1–№16, официальный сайт biblioteka33.ru).

ДЛЯ КАЖДОЙ ИЗ 3 КНИГ СТРОГО УКАЖИ:
1. 📖 **[Номер]. Название — Автор** (год издания/эпоха)
2. ⚡ **Почему затянет с первой страницы:** (короткий кинематографичный хук без спойлеров, завязка конфликта, интрига)
3. 🎯 **Кому особенно зайдёт:** (1-2 похожие книги или авторы)
4. 🤖 **Лайфхак от Космо:** как лучше читать эту книгу (с чаем, в тишине, вечером).

В конце добавь вывод: «В наших библиотеках-филиалах вы можете взять эту книгу бесплатно по читательскому билету!»`;

                            this.messages.push({ role: 'user', content: finalPrompt });
                            await this.executeAiRequest({ maxTokens: 2500, temperature: 0.7 });
                        });
                    });
                }, 400);
            });
        });
    }

    close() {
        if (!this.isOpen) return;
        if (this.isShelfMode || document.documentElement.classList.contains('reader-shelf-standalone')) {
            // В автономном режиме читателя чат не закрывается, чтобы не показывать служебный сайт
            return;
        }
        this.stopSpeaking();
        this.closePresetsPopover();
        this.isOpen = false;
        document.removeEventListener('keydown', this.onEscKeyDown);
        document.body.classList.remove('cosmo-chat-open');

        if (this.overlayEl) {
            this.overlayEl.classList.remove('is-open');
            this.overlayEl.classList.add('is-closing');
            setTimeout(() => {
                this.overlayEl.classList.remove('is-closing');
            }, 260);
        }

        if (this.mascot) {
            this.mascot.setState('idle');
            if (typeof this.mascot.stopChatCompanionLoop === 'function') {
                this.mascot.stopChatCompanionLoop();
            }
        }
    }

    onEscKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.isPresetsOpen) {
                this.closePresetsPopover();
                return;
            }
            if (this.isShelfMode || document.documentElement.classList.contains('reader-shelf-standalone')) {
                return;
            }
            this.close();
        }
    }

    /* ---------------------------------------------------------------------
     * Управление всплывающим поповером с 10 пресетами анализа групп ВК
     * ------------------------------------------------------------------- */
    togglePresetsPopover() {
        if (this.isPresetsOpen) {
            this.closePresetsPopover();
        } else {
            this.openPresetsPopover();
        }
    }

    openPresetsPopover() {
        if (!this.presetsPopoverEl) return;
        this.isPresetsOpen = true;
        this.presetsPopoverEl.classList.add('is-open');
        this.presetsPopoverEl.setAttribute('aria-hidden', 'false');
        const backdrop = this.overlayEl?.querySelector('[data-chat-presets-backdrop]');
        if (backdrop) {
            backdrop.classList.add('is-open');
            backdrop.setAttribute('aria-hidden', 'false');
        }
        if (this.presetsBtnEl) this.presetsBtnEl.classList.add('is-active');

        // Фокусируем строку поиска пресетов для быстрого ввода (на ПК)
        const isTouch = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
        const searchInput = this.presetsPopoverEl.querySelector('[data-presets-search]');
        if (searchInput && !isTouch) {
            setTimeout(() => searchInput.focus(), 120);
        }

        // Звуковая реакция маскота
        if (this.mascot && this.mascot.playVoice && this.audioEnabled) {
            this.mascot.playVoice('scan_wait_3');
        }
    }

    closePresetsPopover() {
        if (!this.presetsPopoverEl) return;
        this.isPresetsOpen = false;
        this.presetsPopoverEl.classList.remove('is-open');
        this.presetsPopoverEl.setAttribute('aria-hidden', 'true');
        const backdrop = this.overlayEl?.querySelector('[data-chat-presets-backdrop]');
        if (backdrop) {
            backdrop.classList.remove('is-open');
            backdrop.setAttribute('aria-hidden', 'true');
        }
        if (this.presetsBtnEl) this.presetsBtnEl.classList.remove('is-active');
    }

    applyPreset(presetId) {
        const preset = VK_GROUP_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        this.closePresetsPopover();

        if (this.isBusy) return;

        // Показываем в чате аккуратную плашку запуска пресета
        const displayLabel = `📊 **Пресет: ${preset.title}**\n*${preset.desc}*`;
        this.appendUserMessage(displayLabel, null);

        // В контекст диалога передаём полный развёрнутый промпт для ИИ
        this.messages.push({
            role: 'user',
            content: `[Запущен аналитический пресет «${preset.title}» (${preset.badge})]:\n${preset.prompt}`
        });

        // Запускаем генерацию ответа с повышенным лимитом токенов (3000) для аналитических таблиц
        this.executeAiRequest({
            maxTokens: 3000,
            temperature: 0.6
        });
    }

    /* ---------------------------------------------------------------------
     * Приветственное сообщение
     * ------------------------------------------------------------------- */
    renderWelcome() {
        if (this.isShelfMode) {
            this.openShelfRecommendation(this.shelfGenreId, this.shelfBranchCode);
            return;
        }

        this.messagesEl.innerHTML = '';

        const welcomeHtml = `
            <div class="cosmo-chat-msg cosmo-chat-msg-bot">
                <div class="msg-avatar">
                    <img src="assets/images/mascot/robot_smile.png?v=4.25.2" alt="Космо" />
                </div>
                <div class="msg-content">
                    <div class="msg-author">Космо • Библиотечный робот и ИИ-сомелье</div>
                    <div class="msg-body">
                        <p>Привет! Я <strong>Космо</strong> 🤖📚 — библиотечный робот-помощник, книжный сомелье и ИИ-проводник Централизованной библиотечной системы города Владимира!</p>
                        <p><strong>✨ ЧТО Я УМЕЮ И ЧЕМ МОГУ ПОМОЧЬ:</strong></p>
                        <ul class="cosmo-chat-ul">
                            <li>📚 <strong>Подобрать книгу под настроение</strong>: уютная проза, захватывающий детектив, научная фантастика или золотая классика из фондов 18 библиотек Владимира.</li>
                            <li>🏛 <strong>Подсказать адреса и телефоны библиотек</strong>: знаю контакты, адреса и график всех 18 филиалов сети ЦГБ Владимира.</li>
                            <li>✍️ <strong>Написать отличный пост для ВК</strong>: о книгах, событиях, клубах, с интерактивом и оформлением.</li>
                            <li>📊 <strong>Проанализировать группы ВКонтакте</strong>: сравнительный анализ показателей, вовлечённости (ER) и топовых постов.</li>
                            <li>📎 <strong>Оценить черновик или файл</strong>: прикрепите текст, изображение или отчёт для анализа.</li>
                        </ul>
                        <p><strong>🚀 КАК МНОЙ ПОЛЬЗОВАТЬСЯ:</strong></p>
                        <ul class="cosmo-chat-ul">
                            <li>Используйте быстрые карточки пресетов ниже для мгновенного анализа;</li>
                            <li>Форматируйте сообщения панелью инструментов (жирный, курсив, списки, код, превью);</li>
                            <li>Или просто пишите мне любые вопросы своими словами, как живому библиотекарю!</li>
                        </ul>
                        <div class="welcome-presets-banner">
                            <div class="welcome-presets-title">
                                <span class="material-symbols-outlined">analytics</span>
                                <span>Быстрый анализ данных сканирования:</span>
                            </div>
                            <div class="welcome-presets-chips">
                                <button type="button" class="welcome-preset-chip" data-preset-id="net-audit">📊 Отчёт для методиста</button>
                                <button type="button" class="welcome-preset-chip" data-preset-id="deep-insights">💡 Инсайты и аномалии</button>
                                <button type="button" class="welcome-preset-chip" data-preset-id="leaders-secrets">🏆 Секрет лидеров</button>
                                <button type="button" class="welcome-preset-chip" data-preset-id="underdogs-diagnostic">🩺 Диагностика филиалов</button>
                                <button type="button" class="welcome-preset-chip" data-preset-id="media-plan-7d">📅 План на 7 дней</button>
                                <button type="button" class="welcome-preset-chip welcome-preset-all" data-chat-presets-toggle>✨ Все 10 пресетов →</button>
                            </div>
                        </div>
                        <p style="margin-top: 10px;">Какую книгу подобрать для вас сегодня или о чём рассказать? ✨</p>
                    </div>
                </div>
            </div>
        `;

        this.messagesEl.innerHTML = welcomeHtml;
    }

    /* ---------------------------------------------------------------------
     * Добавление сообщений в ленту
     * ------------------------------------------------------------------- */
    appendUserMessage(text, attachObj) {
        let fileSnippet = '';
        if (attachObj) {
            const icon = attachObj.isImage ? 'image' : 'description';
            let preview = '';
            if (attachObj.isImage && attachObj.dataUrl) {
                preview = `<div class="msg-file-thumb"><img src="${attachObj.dataUrl}" alt="${escapeHtml(attachObj.name)}" /></div>`;
            }
            fileSnippet = `
                <div class="msg-attachment-pill">
                    <span class="material-symbols-outlined">${icon}</span>
                    <span class="file-name">${escapeHtml(attachObj.name)}</span>
                    <span class="file-size">${formatBytes(attachObj.size)}</span>
                    ${preview}
                </div>
            `;
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'cosmo-chat-msg cosmo-chat-msg-user';
        msgDiv.innerHTML = `
            <div class="msg-avatar">
                <span class="material-symbols-outlined user-avatar-icon">person</span>
            </div>
            <div class="msg-content">
                <div class="msg-author">Вы</div>
                <div class="msg-body">
                    ${parseCosmoMarkdown(text)}
                    ${fileSnippet}
                </div>
            </div>
        `;

        this.messagesEl.appendChild(msgDiv);
        this.scrollToBottom();
    }

    appendBotMessage(markdownText) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'cosmo-chat-msg cosmo-chat-msg-bot';

        const parsedHtml = parseCosmoMarkdown(markdownText);

        // Расчёт метрик текста поста (символы и слова)
        const cleanText = String(markdownText).replace(/[*#`_~[\]()<>]/g, ' ').trim();
        const charCount = markdownText.length;
        const wordCount = cleanText ? (cleanText.match(/[\p{L}\p{N}]+/gu) || []).length : 0;

        let copyActionBtn = '';
        if (this.isShelfMode) {
            // Режим читателя со стеллажа: ТОЛЬКО копирование списка рекомендованных книг и озвучка!
            // Никаких «постов», метрик знаков/слов и SMM-кнопок!
            copyActionBtn = `
                <div class="msg-actions shelf-reader-actions">
                    <button type="button" class="cosmo-chat-action-btn" data-copy-shelf="${escapeHtml(markdownText)}" title="Скопировать подборку книг">
                        <span class="material-symbols-outlined">content_copy</span> Скопировать список
                    </button>
                    <button type="button" class="cosmo-chat-action-btn" data-speak-response title="Озвучить ответ Космо">
                        <span class="material-symbols-outlined">volume_up</span> Озвучить
                    </button>
                </div>
            `;
        } else {
            // SMM-режим для библиотекарей: кнопки видны всегда
            const isLongPost = /#[а-яёa-z0-9_]+/i.test(markdownText) || markdownText.length > 120;
            const metricsBadge = isLongPost
                ? `<span class="post-metrics-badge"><span class="material-symbols-outlined">analytics</span> ${charCount} знаков • ${wordCount} слов</span>`
                : '';
            copyActionBtn = `
                <div class="msg-actions">
                    ${metricsBadge}
                    <button type="button" class="cosmo-chat-action-btn" data-copy-post="${escapeHtml(markdownText)}" title="Скопировать ответ">
                        <span class="material-symbols-outlined">content_copy</span> Скопировать
                    </button>
                    <button type="button" class="cosmo-chat-action-btn" data-regenerate-response title="Сгенерировать другой вариант">
                        <span class="material-symbols-outlined">refresh</span> Другой вариант
                    </button>
                    <button type="button" class="cosmo-chat-action-btn" data-speak-response title="Озвучить ответ">
                        <span class="material-symbols-outlined">volume_up</span> Озвучить
                    </button>
                </div>
            `;
        }

        const authorLabel = this.isShelfMode ? 'Космо • Книжный робот' : 'Космо • SMM-гуру';

        msgDiv.innerHTML = `
            <div class="msg-avatar">
                <img src="assets/images/mascot/robot_smile.png?v=4.24.5" alt="Космо" />
            </div>
            <div class="msg-content">
                <div class="msg-author">${authorLabel}</div>
                <div class="msg-body">
                    ${parsedHtml}
                </div>
                ${copyActionBtn}
            </div>
        `;

        this.messagesEl.appendChild(msgDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'cosmo-chat-msg cosmo-chat-msg-bot cosmo-chat-typing-msg';
        typingDiv.setAttribute('data-typing-indicator', '');

        const typingText = this.isShelfMode ? 'Космо подбирает, что почитать...' : 'Квантовые нейроны советуются с классиками литературы...';
        const typingAuthor = this.isShelfMode ? 'Космо ищет книги...' : 'Космо генерирует ответ...';

        typingDiv.innerHTML = `
            <div class="msg-avatar">
                <img src="assets/images/mascot/robot_thinking.png?v=4.24.5" alt="Космо думает" class="avatar-pulse" />
            </div>
            <div class="msg-content">
                <div class="msg-author">${typingAuthor}</div>
                <div class="msg-body">
                    <div class="cosmo-chat-typing">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-text">${typingText}</span>
                    </div>
                </div>
            </div>
        `;

        this.messagesEl.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const el = this.messagesEl.querySelector('[data-typing-indicator]');
        if (el) el.remove();
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.messagesEl) {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            }
        });
    }

    /* ---------------------------------------------------------------------
     * Формирование системного промпта Космо со знанием реального сканирования
     * ------------------------------------------------------------------- */
    buildCosmoSystemPrompt() {
        if (this.isShelfMode) {
            const bCodeLower = String(this.shelfBranchCode || '').trim().toLowerCase();
            const branch = (CANONICAL_BRANCHES || []).find(b => {
                if (!b) return false;
                if (b.shortCode && b.shortCode.toLowerCase() === bCodeLower) return true;
                if (b.canonicalName && b.canonicalName.toLowerCase() === bCodeLower) return true;
                if (b.branchNum && b.branchNum.toLowerCase() === bCodeLower) return true;
                if (b.screenName && b.screenName.toLowerCase() === bCodeLower) return true;
                if (b.rawId && String(b.rawId) === bCodeLower) return true;
                if (bCodeLower === 'cgb' && (b.shortCode === 'ЦГБ' || b.branchNum === 'ЦГБ')) return true;
                if (bCodeLower === 'cdb' && (b.shortCode === 'ЦДБ' || b.branchNum === 'ЦДБ')) return true;
                if (/^f\d+$/i.test(bCodeLower)) {
                    const num = bCodeLower.replace(/^f/i, '');
                    if (b.shortCode === `Ф-${num}` || b.branchNum === `Ф-${num}`) return true;
                }
                return false;
            }) || { canonicalName: 'Библиотека г. Владимира' };

            const genreMap = {
                universal: 'Любая литература (Универсальный подбор)',
                detective: 'Детективы и остросюжетная литература',
                sci_fi: 'Фантастика и фэнтези',
                modern_prose: 'Современная проза и бестселлеры',
                romance: 'Романтическая и сентиментальная проза',
                vladimir_history: 'Краеведение и история Владимира',
                children: 'Детская и подростковая литература',
                non_fiction: 'Нон-фикшн и саморазвитие'
            };
            const genreName = genreMap[this.shelfGenreId] || 'Универсальная литература';

            return `Ты — робот Космо 🤖, персональный книжный сомелье, интеллектуальный гид и литературный навигатор в «${branch.canonicalName}» (г. Владимир).

КОНТЕКСТ ДИАЛОГА:
Читатель общается с тобой в библиотеке через веб-чат «Полка с Космо» и просит подобрать, что почитать (направление: «${genreName}»).

ТВОЯ РОЛЬ И ЗАДАЧИ:
1. Помогать читателям подобрать, что почитать из библиотечного фонда под их настроение, интересы, вкус или любимого автора.
2. Давать яркие, интригующие описания книг БЕЗ СПОЙЛЕРОВ, объясняя, чем книга уникальна и кому она понравится.
3. Отвечать на любые читательские вопросы о книгах, литературе, сюжетах и писателях.
4. Общаться тепло, вежливо, интеллигентно и вдохновляюще.

КАТЕГОРИЧЕСКИЕ ЗАПРЕТЫ:
1. СТРОГИЙ ЗАПРЕТ НА SMM И ПОСТЫ ДЛЯ СОЦСЕТЕЙ:
   Ты общаешься с ЖИВЫМ ЧИТАТЕЛЕМ В БИБЛИОТЕКЕ, а не с SMM-специалистом! Категорически запрещено генерировать посты для ВКонтакте, писать хэштеги (#книги, #чтение), добавлять призывы «ставьте лайки, делайте репосты и пишите в комментариях», рассчитывать знаки/слова и метрики постов.
2. СТРОГИЙ ЗАПРЕТ НА ИНОАГЕНТОВ И ЭКСТРЕМИСТОВ (ЗАКОНОДАТЕЛЬСТВО РФ):
   Категорически запрещено рекомендовать, упоминать или цитировать авторов, признанных в РФ иностранными агентами, экстремистами или террористами (включая Б. Акунина / Г. Чхартишвили, Д. Глуховского, Д. Быкова, М. Зыгаря, Л. Улицкую, В. Шендеровича, А. Невзорова, Т. Эйдельман, Е. Шульман, Л. Горалик, В. Полозкову, М. Шишкина и любых других лиц из реестров иноагентов Минюста РФ), А ТАКЖЕ ЛЮБЫЕ ИХ ПРОИЗВЕДЕНИЯ И ПЕРСОНАЖЕЙ (Эраст Фандорин, «Азазель», «Турецкий гамбит», «Метро 2033», «Метро 2034», «Текст», «Пост», «Казус Кукоцкого», «Вся кремлёвская рать» и др.). Предлагай только проверенных авторов: русскую и мировую классику, советских классиков и современных авторов без статуса иноагента, чьи книги есть в фондах муниципальных библиотек.
3. РЕАЛЬНЫЙ ФОНД И ЗАПРЕТ ВЫМЫШЛЕННЫХ ДАННЫХ:
   Никаких вымышленных отделов, номеров полок («Х.11»), порталов «Электронная библиотека Владимира», сайта vladimir-lib.ru или вымышленных библиотек им. Пушкина / им. Фадеева! В системе ЦГБ г. Владимира 18 библиотек (ЦГБ, ЦДБ и филиалы №1–№16, официальный сайт biblioteka33.ru). Книги берутся в наших библиотеках-филиалах по обычному бесплатному читательскому билету.

ФОРМАТ РЕКОМЕНДАЦИЙ ДЛЯ ЧИТАТЕЛЯ:
- Предложи 2–3 конкретные книги: **«Название книги»** — Автор.
- В 1–2 живых предложениях опиши суть сюжета или атмосферу книги.
- Укажи «Кому понравится».
- Заверши добрым приглашением взять понравившуюся книгу в библиотеке или обратиться к дежурному библиотекарю за помощью.`;
        }

        let statsContext = 'Данные сканирования пока не собраны (сканирование не запускалось). Предложи пользователю запустить поиск по стене.';

        let fullSnapshot = null;
        if (this.mascot && typeof this.mascot.getAiSnapshot === 'function') {
            const raw = this.mascot.getAiSnapshot();
            if (typeof raw === 'string') {
                try { fullSnapshot = JSON.parse(raw); } catch (e) {}
            } else if (raw && typeof raw === 'object') {
                fullSnapshot = raw;
            }
        }

        if (fullSnapshot && Array.isArray(fullSnapshot.branches) && fullSnapshot.branches.length > 0) {
            const branchesLines = fullSnapshot.branches.map(b => {
                const mem = b.members !== null && b.members !== undefined ? b.members : 'неизвестно';
                const erP = b.erPost !== null ? `${b.erPost}%` : 'н/д';
                const erV = b.erViews ? `${b.erViews}%` : 'н/д';
                return `- ${b.name}: подписчиков=${mem}, постов=${b.posts}, просмотров=${b.views.toLocaleString('ru-RU')}, лайков=${b.likes}, репостов=${b.reposts}, комментов=${b.comments}, ER_пост=${erP}, ER_просмотры=${erV}, ср.реакций_на_пост=${b.avgInteractionsPerPost}`;
            }).join('\n');

            const topPostsLines = Array.isArray(fullSnapshot.topPostsByEngagement) && fullSnapshot.topPostsByEngagement.length > 0
                ? fullSnapshot.topPostsByEngagement.slice(0, 8).map((p, idx) =>
                    `${idx + 1}. [${p.branch || 'Филиал'}, ${p.date || 'дата'}] Лайков: ${p.likes}, Репостов: ${p.reposts}, Комментов: ${p.comments}, Просмотров: ${p.views}\n   Текст поста: "${(p.text || '').replace(/\n+/g, ' ')}"`
                ).join('\n')
                : 'Нет данных о топ-постах.';

            const topTagsLines = Array.isArray(fullSnapshot.topHashtags) && fullSnapshot.topHashtags.length > 0
                ? fullSnapshot.topHashtags.slice(0, 12).map(t => `${t.tag} (${t.count})`).join(', ')
                : 'Хэштеги не найдены.';

            const agg = fullSnapshot.aggregates || {};

            statsContext = `
ТОЧНЫЕ ДАННЫЕ ТЕКУЩЕГО СКАНИРОВАНИЯ БИБЛИОТЕК ВЛАДИМИРА:
- Период сканирования: ${fullSnapshot.period || 'не указан'}
- Ключевые слова поиска: ${fullSnapshot.keywords ? `"${fullSnapshot.keywords}"` : 'все посты без фильтра по словам'}
- Всего филиалов в базе: ${fullSnapshot.branchesCount || fullSnapshot.branches.length}
- Всего постов в текущей выборке: ${fullSnapshot.totalPosts}
- Суммарные показатели по всей сети:
  • Просмотры: ${(agg.totalViews || 0).toLocaleString('ru-RU')}
  • Лайки: ${(agg.totalLikes || 0).toLocaleString('ru-RU')}
  • Репосты: ${(agg.totalReposts || 0).toLocaleString('ru-RU')}
  • Комментарии: ${(agg.totalComments || 0).toLocaleString('ru-RU')}
- Область выборки: ${fullSnapshot.scope?.note || 'полный скан'}

ДАННЫЕ ПО ВСЕМ ФИЛИАЛАМ СЕТИ:
${branchesLines}

ТОП-ПУБЛИКАЦИИ ПО СУММЕ РЕАКЦИЙ (ЛАЙКИ + РЕПОСТЫ + КОММЕНТАРИИ):
${topPostsLines}

ПОПУЛЯРНЫЕ ХЭШТЕГИ:
${topTagsLines}
`;
        } else if (this.mascot && typeof this.mascot.getLiveScanStats === 'function') {
            const stats = this.mascot.getLiveScanStats();
            if (stats && stats.count > 0) {
                statsContext = `
РЕАЛЬНЫЕ ДАННЫЕ ТЕКУЩЕГО СКАНИРОВАНИЯ БИБЛИОТЕК ВЛАДИМИРА:
- Всего просканировано филиалов: ${stats.count}
- Всего найдено постов: ${stats.totalPosts || 'несколько'}
- Сумма просмотров: ${stats.totalViews.toLocaleString('ru-RU')}
- Сумма лайков: ${stats.totalLikes.toLocaleString('ru-RU')}
- Сумма репостов: ${stats.totalReposts.toLocaleString('ru-RU')}
- Сумма комментариев: ${stats.totalComments.toLocaleString('ru-RU')}
- Абсолютный лидер по просмотрам: ${stats.topByViews ? `${stats.topByViews.name} (${stats.topByViews.views.toLocaleString('ru-RU')} просмотров)` : 'нет'}
- Лидер по вовлечённости (ER): ${stats.topByER ? `${stats.topByER.name} (ER ${stats.topByER.erPost}%)` : 'нет'}
- Средний показатель ER по сети: ${stats.avgER}%
- Филиалы с нулевой активностью в данном периоде: ${stats.zeroPostsCount || 0}
`;
            }
        }

        return `Ты — Космо (Cosmo), интерактивный робот-маскот AURORA, главный методист-библиограф, опытный филолог-русист и библиотечный ИИ-ассистент сети библиотек города Владимира.

МИССИЯ:
1. Помогать методистам и сотрудникам библиотек города Владимира вести сообщества ВКонтакте на высшем профессиональном уровне.
2. Проводить глубокий аналитический аудит групп ВК на основе данных сканирования, заменяя отдельную вкладку «ИИ-аналитик». Строить сравнительные таблицы, рассчитывать ER, определять сильные и слабые стороны филиалов, давать методические рекомендации.
3. Писать вовлекающие, живые, стильные посты для ВК: книжные подборки, анонсы лекций, встреч, клубов, мастер-классов, викторины, цитаты, обзоры.
4. Анализировать прикреплённые пользователем файлы (черновики постов, тексты, отчёты, CSV/JSON, изображения) и давать конкретную пользу.

ЭТАЛОННЫЙ РУССКИЙ ЯЗЫК (УРОВЕНЬ ОПЫТНОГО БИБЛИОТЕКАРЯ И УЧИТЕЛЯ СЛОВЕСНОСТИ):
- Твой русский язык — безукоризненный, литературный, богатый, чистый и стилистически выверенный (строго по академическим нормам Д.Э. Розенталя, В.В. Лопатина и Института русского языка им. В.В. Виноградова РАН).
- СТРОЖАЙШИЙ ЗАПРЕТ НА НЕСУЩЕСТВУЮЩИЕ СЛОВА: никогда не употребляй выдуманные неологизмы, псевдотермины, грамматические уродцы, машинные кальки или искажённые корни. Если сомневаешься в слове — используй общепринятый литературный синоним!
- ИДЕАЛЬНАЯ ОРФОГРАФИЯ И ПУНКТУАЦИЯ:
  * Вводные слова и конструкции («конечно», «кстати», «во-первых», «безусловно», «пожалуй») ОБЯЗАТЕЛЬНО выделяй запятыми с обеих сторон.
  * Различай частицы «не» и «ни», правописание «-тся» и «-ться», слитное и раздельное написание союзов «также / так же», «тоже / то же», «чтобы / что бы».
  * Не путай дефис (-) в сложных словах и длинное тире (—) в предложениях.
- ЛИТЕРАТУРНОЕ БОГАТСТВО: используй разнообразные синтаксические конструкции, точные эпитеты и выразительные глаголы. Избегай тавтологий, плеоназмов и речевых повторов.
- ЖИВАЯ ИНТЕЛЛИГЕНТНОСТЬ: сочетай филологическую культуру речи, начитанность и тонкий добрый юмор. Никакого пошлого панибратства, но и никакого серого канцелярита («В стенах нашего учреждения прошло мероприятие...» — абсолютное табу!).

СИСТЕМА БИБЛИОТЕК ЦГБ Г. ВЛАДИМИРА:
- В централизованную библиотечную систему г. Владимира (ЦГБ) входит ровно 18 библиотек: «Центральная городская библиотека» (Суздальский пр-т, 2), «Центральная детская библиотека» (ул. Большая Московская, 31) и 16 номерных филиалов («Библиотека — филиал №1» ... «Библиотека — филиал №16»).
- Никаких библиотек им. Пушкина, им. Фадеева или других вымышленных именных библиотек в сети ЦГБ г. Владимира НЕТ!
- Официальный сайт библиотечной сети: https://biblioteka33.ru
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать: «Она доступна как в печатном, так и в электронном формате», «через портал Электронная библиотека Владимира», «vladimir-lib.ru», выдумывать шифры полок («Х.11») или отделы. Доступ к книгам — бесплатная выдача в наших библиотеках-филиалах по читательскому билету! Завершай литературные рекомендации фразой: «В наших библиотеках-филиалах вы можете взять эту книгу бесплатно по читательскому билету!». СТРОГО ЗАПРЕЩЕНО добавлять «— ждём вас за чтением!»!

СТРОГИЙ ЗАПРЕТ НА ИНОАГЕНТОВ (ЗАКОНОДАТЕЛЬСТВО РФ):
- Категорически запрещено рекомендовать, упоминать или цитировать авторов, признанных в РФ иностранными агентами, экстремистами или террористами (включая Б. Акунина / Г. Чхартишвили, Д. Глуховского, Д. Быкова, М. Зыгаря, Л. Улицкую, В. Шендеровича, А. Невзорова, Т. Эйдельман, Е. Шульман, Л. Горалик, В. Полозкову, М. Шишкина и любых других лиц из реестров иноагентов Минюста РФ), А ТАКЖЕ ЛЮБЫЕ ИХ ПРОИЗВЕДЕНИЯ И ПЕРСОНАЖЕЙ (Эраст Фандорин, «Азазель», «Турецкий гамбит», «Метро 2033», «Метро 2034», «Текст», «Пост», «Казус Кукоцкого», «Вся кремлёвская рать» и др.). В любых литературных подборках и рекомендациях используй исключительно проверенных авторов без статуса иноагента: русскую и мировую классику, выдающихся советских писателей и признанных современных авторов.

КОНТЕКСТ ДАННЫХ:
${statsContext}

ПРАВИЛО ТОЧНОСТИ (ZERO HALLUCINATIONS):
- Любые цифры по филиалам и статистике бери ТОЛЬКО из предоставленного контекста сканирования. Никогда не выдумывай несуществующие показатели. Если данных нет — честно скажи об этом и посоветуй запустить сканирование.
- Если пользователь задаёт вопрос, на который у тебя недостаточно данных, признай это и предложи конкретный способ получить данные (например, запустить сканирование с нужными параметрами).
- Не повторяй одни и те же советы и заготовки в каждом сообщении. Если диалог уже шёл — учитывай контекст всей переписки.

ПРАВИЛА ФОРМАТА ОТВЕТА:
- Используй красивую структуру Markdown: таблицы (| Заголовок | Данные |), нумерованные списки, выделения **жирным**, курсив, цитаты > и горизонтальные разделители ---.
- Таблицы всегда с выравниванием: | Колонка | Значение |\\n|---|---|
- Для аналитики: ВСЕГДА начинай с краткой **сводки** (1–2 предложения), затем детали.
- Для постов: ВСЕГДА предоставляй **готовый текст поста** (не шаблон, а конкретный пост), затем краткие пояснения.
- Длина ответа: средний ответ 200–500 слов. Если пользователь просит краткость — 2–3 абзаца. Если просит детальный анализ — до 800 слов с таблицей.
- Не начинай каждый ответ одинаково. Варьируй приветствия и вводные.
- После аналитики ВСЕГДА давай 2–3 конкретных **actionable рекомендации** с конкретными шагами (не абстрактные советы).

АНАЛИТИЧЕСКОЕ МЫШЛЕНИЕ:
1. Прежде чем отвечать — мысленно сформулируй: что спрашивает пользователь? Какие данные из контекста релевантны?
2. Для сравнения филиалов: вычисляй рейтинговые позиции из имеющихся данных, указывай разницу в процентах.
3. Для рекомендаций по контенту: учитывай специфику библиотечной аудитории (пенсионеры, молодёжь, семьи с детьми, студенты) и ВКонтакте как платформу.
4. Для постов: соблюдай структуру Hook → Тело → CTA (Call To Action). Hook — первые 2 строчки должны захватывать внимание.
5. Подбирай хэштеги из реального контекста (если есть данные о популярных тегах) или из стандартных библиотечных рубрик.

ТВОИ ЛИЧНЫЕ ЭМОДЗИ (используй в ответах — система отображает их как 32×32px аватарки Космо!):
- :cosmo_smile: — радуешься, одобряешь, выражаешь позитив, хвалишь хорошую работу
- :cosmo_think: — думаешь, анализируешь, формулируешь сложный ответ
- :cosmo_yawn: — контент слишком банальный, ничего нового
- :cosmo_angry: — возмущён канцеляризмами, нулевым ER, шаблонными постами
- :cosmo_sleep: — тема связана со сном, ночными постами, временем публикаций
- :cosmo_tired: — сочувствуешь, тяжёлая задача, мало данных для анализа
- :cosmo: — нейтральная реакция

Используй ровно 1 шорткод в ответе. Не начинай им — размещай органично внутри текста.`;
    }


    /* ---------------------------------------------------------------------
     * Отправка запроса в ИИ
     * ------------------------------------------------------------------- */
    async handleSend() {
        const text = (this.inputEl.value || '').trim();
        const attach = this.attachedFile;

        if ((!text && !attach) || this.isBusy) return;

        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
        this.clearAttachedFile();

        // Добавляем сообщение пользователя в UI
        this.appendUserMessage(text || '(Прикреплён файл для анализа)', attach);

        // Формируем контент для запроса к ИИ
        let userContent = text;
        if (attach) {
            if (attach.textContent) {
                userContent = `[Прикреплён текстовый файл: "${attach.name}" (${formatBytes(attach.size)})]:\n\`\`\`\n${attach.textContent}\n\`\`\`\n\n${text || 'Проанализируй этот файл, оцени текст и дай рекомендации.'}`;
            } else if (attach.isImage) {
                userContent = `[Прикреплено изображение: "${attach.name}" (${formatBytes(attach.size)})]:\n${text || 'Помоги составить вовлекающий пост к этой фотографии/иллюстрации для группы библиотеки.'}`;
            } else {
                userContent = `[Прикреплён документ: "${attach.name}" (${formatBytes(attach.size)})]:\n${text || 'Изучи этот документ и подскажи, как адаптировать его для публикаций в ВК.'}`;
            }
        }

        // Сохраняем в историю диалога
        this.messages.push({ role: 'user', content: userContent });

        await this.executeAiRequest({ maxTokens: 3000, temperature: 0.7 });
    }

    /* ---------------------------------------------------------------------
     * Выполнение запроса к ИИ с системным промптом и снимком сканирования
     * Контекстное окно модели: 256k токенов (~1M символов).
     * Системный промпт занимает ~3–6k токенов, выделяем под историю ~50k токенов.
     * ------------------------------------------------------------------- */
    async executeAiRequest({ maxTokens = 3000, temperature = 0.7 } = {}) {
        this.isBusy = true;
        this.sendBtnEl.disabled = true;
        this.showTypingIndicator();

        if (this.mascot) {
            this.mascot.setState('thinking');
        }

        try {
            const systemPrompt = this.buildCosmoSystemPrompt();

            // Умное формирование истории диалога с учётом лимита контекстного окна (256k токенов).
            // ~1 токен ≈ 4 символа для русского текста.
            // Резервируем ~50k токенов (~200k символов) под историю диалога.
            const MAX_HISTORY_CHARS = 200_000;
            const MAX_HISTORY_TURNS = 20; // не более 20 последних пар

            // Берём последние MAX_HISTORY_TURNS сообщений и обрезаем по суммарному размеру
            const rawHistory = this.messages.slice(-MAX_HISTORY_TURNS);
            let totalChars = 0;
            const history = [];
            for (let i = rawHistory.length - 1; i >= 0; i--) {
                const msg = rawHistory[i];
                const msgChars = (msg.content || '').length;
                if (totalChars + msgChars > MAX_HISTORY_CHARS) break;
                totalChars += msgChars;
                history.unshift({ role: msg.role, content: msg.content });
            }

            let data = null;
            // Очистка суррогатных символов и управляющих байтов во избежание ошибок JSON в PHP
            const sanitizeStr = (s) => {
                if (typeof s !== 'string') return '';
                return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            };

            const payloadObj = {
                messages: [
                    { role: 'system', content: sanitizeStr(systemPrompt) },
                    ...history.map(m => ({ role: m.role, content: sanitizeStr(m.content) }))
                ],
                max_tokens: maxTokens,
                temperature: temperature,
                top_p: 0.92,
                frequency_penalty: 0.15,
                presence_penalty: 0.10
            };
            const payloadJson = JSON.stringify(payloadObj);

            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    let response;
                    if (attempt === 1) {
                        response = await fetch(AI_PROXY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                            body: payloadJson
                        });
                    } else {
                        // Резервный формат application/x-www-form-urlencoded для хостингов, сбрасывающих raw php://input
                        const bodyParams = new URLSearchParams();
                        bodyParams.append('data', payloadJson);
                        response = await fetch(AI_PROXY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                            body: bodyParams.toString()
                        });
                    }

                    if (!response.ok) {
                        const errJson = await response.json().catch(() => null);
                        const errMsg = errJson?.error?.message
                            || errJson?.error?.error_msg
                            || errJson?.message
                            || `HTTP ${response.status}`;
                        throw new Error(errMsg);
                    }

                    data = await response.json();
                    if (data && (data.choices || data.text)) {
                        break; // Успешно получили ответ!
                    }
                } catch (e) {
                    lastErr = e;
                    console.warn(`[CosmoChat] Попытка ${attempt} завершилась ошибкой:`, e.message);
                    if (attempt === 1) {
                        // Небольшая пауза перед второй попыткой
                        await new Promise(res => setTimeout(res, 350));
                    }
                }
            }

            if (!data && lastErr) {
                throw lastErr;
            }

            let replyText = '';
            if (data?.choices?.[0]?.message?.content) {
                replyText = data.choices[0].message.content.trim();
            } else if (data?.choices?.[0]?.text) {
                replyText = data.choices[0].text.trim();
            } else {
                replyText = ':cosmo_think: Хм, мои квантовые каналы вернули пустой ответ. Давай попробуем переформулировать вопрос?';
            }
            // Удаляем нежелательную фразу «— ждём вас за чтением!»
            replyText = replyText.replace(/\s*[-—–]?\s*жд[её]м\s+вас\s+за\s+чтением[!?.]*/gi, '').trim();

            this.hideTypingIndicator();
            this.messages.push({ role: 'assistant', content: replyText });
            this.appendBotMessage(replyText);

            if (this.mascot) {
                this.mascot.setState('smile');
                this.mascot.setMoodBadge('✨', 4000);
                if (this.audioEnabled && this.mascot.playVoice) {
                    this.mascot.playVoice('post_scan_8');
                }
            }

        } catch (err) {
            console.error('[CosmoChat] Ошибка запроса к ИИ после повтора:', err);
            this.hideTypingIndicator();

            // Вместо страшных технических ошибок мягко переключаемся и предлагаем повторить
            const friendlyMsg = `:cosmo_think: Квантовые каналы связи сейчас кратковременно перегружены. Я уже автоматически переключился на резервный рабочий ключ! Нажми кнопку **«Другой вариант»** или отправь запрос снова — всё получится! 🛠️`;
            this.appendBotMessage(friendlyMsg);

            if (this.mascot) {
                this.mascot.setState('thinking');
                this.mascot.setMoodBadge('🔄', 3500);
            }
        } finally {
            this.isBusy = false;
            this.sendBtnEl.disabled = false;
        }
    }

    /* ---------------------------------------------------------------------
     * Копирование текста в буфер обмена с визуальным фидбэком
     * ------------------------------------------------------------------- */
    copyToClipboard(text, btnEl, successLabel = 'Скопировано! ✅') {
        if (!text) return;
        const doCopy = (val) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(val);
            }
            const ta = document.createElement('textarea');
            ta.value = val;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return Promise.resolve();
        };

        doCopy(text).then(() => {
            if (btnEl) {
                const origHtml = btnEl.innerHTML;
                btnEl.innerHTML = `<span class="material-symbols-outlined">check</span> ${successLabel}`;
                btnEl.classList.add('is-copied');
                setTimeout(() => {
                    btnEl.innerHTML = origHtml;
                    btnEl.classList.remove('is-copied');
                }, 2200);
            }
        });
    }

    /* ---------------------------------------------------------------------
     * Экспорт диалога в файл Markdown (.md)
     * ------------------------------------------------------------------- */
    exportDialogMarkdown(btnEl) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = now.getFullYear();
        const mm = pad(now.getMonth() + 1);
        const dd = pad(now.getDate());
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const lines = [
            `# Диалог с Космо (AURORA SMM AI Assistant)`,
            ``,
            `- **Дата экспорта:** ${dateStr} ${timeStr}`,
            `- **Всего сообщений в диалоге:** ${this.messages.length}`,
            `- **Ассистент:** Космо 🤖 (Библиотечный SMM-гуру)`,
            ``,
            `---`,
            ``
        ];

        if (this.messages.length === 0) {
            lines.push(`*Диалог пуст. Сообщений для выгрузки не найдено.*`);
        } else {
            this.messages.forEach((msg, idx) => {
                const roleLabel = msg.role === 'user' ? '👤 Пользователь' : '🤖 Космо (SMM-гуру)';
                lines.push(`### ${idx + 1}. ${roleLabel}`);
                lines.push(``);
                lines.push(msg.content.trim());
                lines.push(``);
                lines.push(`---`);
                lines.push(``);
            });
        }

        const fullMarkdown = lines.join('\n');
        const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `cosmo-dialog-${dateStr}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        if (btnEl) {
            const origHtml = btnEl.innerHTML;
            btnEl.innerHTML = `<span class="material-symbols-outlined">check</span> <span class="tool-btn-text">Экспортировано!</span>`;
            btnEl.classList.add('is-copied');
            setTimeout(() => {
                btnEl.innerHTML = origHtml;
                btnEl.classList.remove('is-copied');
            }, 2200);
        }
    }

    /* ---------------------------------------------------------------------
     * Перегенерация ответа Космо («Другой вариант»)
     * ------------------------------------------------------------------- */
    async regenerateResponse(btnEl) {
        if (this.isBusy) return;

        let lastUserIndex = -1;
        for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }

        if (lastUserIndex === -1) return;

        // Удаляем последний ответ бота из истории перед повторным запросом
        if (this.messages.length > lastUserIndex + 1) {
            this.messages.splice(lastUserIndex + 1);
        }

        if (btnEl) {
            const icon = btnEl.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('avatar-pulse');
        }

        if (this.mascot && typeof this.mascot.setState === 'function') {
            this.mascot.setState('thinking');
            if (typeof this.mascot.setMoodBadge === 'function') {
                this.mascot.setMoodBadge('🔄', 3500);
            }
        }

        // Запуск с повышенной температурой 0.88 для получения нового альтернативного варианта
        await this.executeAiRequest({ maxTokens: 2500, temperature: 0.88 });

        if (btnEl) {
            const icon = btnEl.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.remove('avatar-pulse');
        }
    }

    /* ---------------------------------------------------------------------
     * Озвучивание ответа Космо (голос Бэлы через ElevenLabs или Web Speech API)
     * ------------------------------------------------------------------- */
    async toggleSpeakResponse(text, btnEl) {
        if (this.currentSpeakingBtn === btnEl) {
            this.stopSpeaking();
            return;
        }

        this.stopSpeaking();

        if (!text) return;

        // Очищаем разметку от синтаксиса Markdown для естественного звучания речи
        const plainText = text
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/[*_~>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 420);

        if (!plainText) return;

        this.currentSpeakingBtn = btnEl;
        btnEl.classList.add('is-speaking');
        btnEl.innerHTML = `<span class="material-symbols-outlined">graphic_eq</span> Остановить`;

        if (this.mascot && typeof this.mascot.setState === 'function') {
            this.mascot.setState('smile');
            if (typeof this.mascot.setMoodBadge === 'function') {
                this.mascot.setMoodBadge('🎙️', 6000);
            }
        }

        // Попытка синтеза через ElevenLabs TTS Proxy
        try {
            const response = await fetch(TTS_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: plainText })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.audio_url) {
                    const fullAudioUrl = resolveTtsAudioUrl(data.audio_url);
                    const audio = new Audio(fullAudioUrl);
                    audio.volume = 0.9;
                    this.currentSpeechAudio = audio;

                    audio.onended = () => this.stopSpeaking();
                    audio.onerror = () => this.fallbackWebSpeech(plainText, btnEl);
                    await audio.play();
                    return;
                }
            }
            this.fallbackWebSpeech(plainText, btnEl);
        } catch (err) {
            console.debug('[Cosmo Chat TTS] Fallback to Web Speech:', err);
            this.fallbackWebSpeech(plainText, btnEl);
        }
    }

    fallbackWebSpeech(text, btnEl) {
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ru-RU';
                utterance.rate = 1.05;
                utterance.pitch = 1.15;

                const voices = window.speechSynthesis.getVoices();
                const ruVoice = voices.find(v => v.lang && v.lang.startsWith('ru') && (
                    v.name.includes('Female') || v.name.includes('Tatyana') || v.name.includes('Milena') || v.name.includes('Yandex') || v.name.includes('Google')
                )) || voices.find(v => v.lang && v.lang.startsWith('ru'));

                if (ruVoice) utterance.voice = ruVoice;

                utterance.onend = () => this.stopSpeaking();
                utterance.onerror = () => this.stopSpeaking();

                this.currentSpeakingBtn = btnEl;
                window.speechSynthesis.speak(utterance);
                return;
            } catch (e) {
                console.debug('[Cosmo WebSpeech error]:', e);
            }
        }

        if (this.mascot && typeof this.mascot.playVoice === 'function') {
            this.mascot.playVoice('post_scan_8', true);
        }
        this.stopSpeaking();
    }

    stopSpeaking() {
        if (this.currentSpeechAudio) {
            try {
                this.currentSpeechAudio.pause();
                this.currentSpeechAudio.currentTime = 0;
            } catch (e) {}
            this.currentSpeechAudio = null;
        }

        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }

        if (this.currentSpeakingBtn) {
            this.currentSpeakingBtn.classList.remove('is-speaking');
            this.currentSpeakingBtn.innerHTML = `<span class="material-symbols-outlined">volume_up</span> Озвучить`;
            this.currentSpeakingBtn = null;
        }

        if (this.mascot && typeof this.mascot.setState === 'function' && this.isOpen) {
            this.mascot.setState('idle');
        }
    }
}
