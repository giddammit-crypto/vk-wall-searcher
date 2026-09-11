/**
 * src/events.js — Smart Events Detector & City Billboard (AURORA v3.7)
 * =============================================================================
 * Интеллектуальный анализатор анонсов мероприятий со стен 16 библиотек Владимира:
 * - Выделение дат, времени, возрастных цензов (0+, 6+, 12+, 16+)
 * - Категоризация: Детям, Мастер-классы, Лекции, Спектакли, Клубы, Свободный вход
 * - Интерактивная витрина карточек и таймлайн
 * - Формирование печатной еженедельной афиши А4 для инфостендов
 *
 * Разработка: Амброзиев О.А.
 */

import { findCanonicalBranch, escapeHtml } from './branches.js?v=3.7.0';
import { createQrSvg } from './qrcode.js?v=3.7.0';

const MONTH_NAMES_RU = {
    'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3, 'мая': 4, 'июня': 5,
    'июля': 6, 'августа': 7, 'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
};

export const EVENT_CATEGORIES = [
    { id: 'all', label: 'Все события', icon: 'event' },
    { id: 'kids', label: 'Детям и родителям', icon: 'child_care', color: '#38bdf8' },
    { id: 'masterclass', label: 'Мастер-классы', icon: 'palette', color: '#3ee6c4' },
    { id: 'lecture', label: 'Лекции и встречи', icon: 'school', color: '#a78bfa' },
    { id: 'theatre', label: 'Спектакли и концерты', icon: 'theater_comedy', color: '#f472b6' },
    { id: 'club', label: 'Клубы и игры', icon: 'casino', color: '#fbbf24' },
    { id: 'free', label: 'Вход свободный', icon: 'loyalty', color: '#34d399' }
];

/**
 * Анализирует массив постов и извлекает анонсы мероприятий
 */
export function detectEvents(posts) {
    if (!Array.isArray(posts) || posts.length === 0) return [];

    const eventMarkers = [
        'мастер-класс', 'выставка', 'концерт', 'спектакль', 'лекция', 'встреча',
        'акция', 'приглашаем', 'состоится', 'вход свободный', 'бесплатно', 'клуб',
        'квиз', 'игротека', 'литературн', 'чтения', 'праздник', 'викторин', 'вечер',
        'библионочь', 'неделя детской книги', 'гостиная', 'презентаци'
    ];

    const detected = [];

    posts.forEach(post => {
        const text = post.text || '';
        if (text.length < 25) return;

        const lower = text.toLowerCase();

        // Проверка на маркеры событий
        const matchedMarkers = eventMarkers.filter(m => lower.includes(m));
        if (matchedMarkers.length === 0) return;

        // Поиск даты и времени
        let eventDate = null;
        let eventTime = '';
        let dateStr = '';

        // 1. Поиск словесной даты: «15 сентября»
        const wordDateMatch = lower.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(\d{4}))?/i);
        if (wordDateMatch) {
            const day = parseInt(wordDateMatch[1], 10);
            const mStr = wordDateMatch[2].toLowerCase();
            const month = MONTH_NAMES_RU[mStr];
            const year = wordDateMatch[3] ? parseInt(wordDateMatch[3], 10) : new Date(post.date * 1000).getFullYear();
            if (month !== undefined && day >= 1 && day <= 31) {
                eventDate = new Date(year, month, day);
                dateStr = `${day} ${mStr} ${year}`;
            }
        }

        // 2. Поиск цифровой даты: «15.09» или «15.09.2026»
        if (!eventDate) {
            const digitDateMatch = lower.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
            if (digitDateMatch) {
                const day = parseInt(digitDateMatch[1], 10);
                const month = parseInt(digitDateMatch[2], 10) - 1;
                let year = digitDateMatch[3] ? parseInt(digitDateMatch[3], 10) : new Date(post.date * 1000).getFullYear();
                if (year < 100) year += 2000;
                if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    eventDate = new Date(year, month, day);
                    dateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
                }
            }
        }

        // 3. Поиск времени: «в 14:00» или «в 15.30»
        const timeMatch = lower.match(/(?:в|начало\s+в|время:?)\s*(\d{1,2}[:.]\d{2})/i);
        if (timeMatch) {
            eventTime = timeMatch[1].replace('.', ':');
        }

        // Если конкретная дата в тексте не названа, берём дату публикации
        if (!eventDate) {
            eventDate = new Date(post.date * 1000);
            const d = eventDate.getDate();
            const mKeys = Object.keys(MONTH_NAMES_RU);
            dateStr = `${d} ${mKeys[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
        }

        // Возрастной ценз
        const ageMatch = text.match(/\b(0\+|6\+|12\+|16\+|18\+)\b/);
        const ageRating = ageMatch ? ageMatch[1] : '';

        // Категории
        const categories = [];
        if (/детск|ребят|сказк|кукольн|малыш|родител|цдб|0\+|6\+/i.test(lower)) categories.push('kids');
        if (/мастер-класс|мк|мастерим|творческ|рисовани|лепк|рукодели|поделк/i.test(lower)) categories.push('masterclass');
        if (/лекци|бесед|истори|краевед|встреч|презентаци|урок|просвещени/i.test(lower)) categories.push('lecture');
        if (/спектакл|театр|концерт|музык|песн|выступлен|кино|показ/i.test(lower)) categories.push('theatre');
        if (/клуб|дискусси|настолк|игротек|квиз|вечер|гостин/i.test(lower)) categories.push('club');
        if (/вход свободн|бесплатн|без оплат/i.test(lower)) categories.push('free');
        if (categories.length === 0) categories.push('lecture');

        // Определение заголовка
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let title = lines[0] || 'Мероприятие';
        if (title.length > 90) {
            title = title.slice(0, 87) + '...';
        }

        // Определение филиала
        const canonical = findCanonicalBranch(post.sourceName || post.owner_id || post.from_id);

        // Изображение
        let imageUrl = null;
        if (post.attachments && post.attachments.length > 0) {
            for (const att of post.attachments) {
                if (att.type === 'photo' && att.photo && att.photo.sizes) {
                    const sorted = att.photo.sizes.slice().sort((a, b) => (b.width || 0) - (a.width || 0));
                    imageUrl = sorted[0]?.url || null;
                    break;
                }
            }
        }

        const vkPostUrl = `https://vk.com/wall${post.owner_id}_${post.id}`;

        detected.push({
            id: `${post.owner_id}_${post.id}`,
            postDate: new Date(post.date * 1000),
            eventDate,
            dateStr,
            eventTime,
            ageRating,
            title,
            fullText: text,
            categories,
            matchedMarkers,
            branch: canonical,
            imageUrl,
            vkPostUrl,
            likes: post.likes?.count || 0,
            views: post.views?.count || 0
        });
    });

    // Сортировка по дате события (сначала более свежие / будущие)
    detected.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

    return detected;
}

/**
 * Рендерит интерфейс вкладки «Афиша событий»
 */
export function renderEventsTab(container, events, options = {}) {
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="events-empty-state">
                <span class="material-symbols-outlined events-empty-icon">event_busy</span>
                <h3 class="events-empty-title">Анонсы мероприятий пока не найдены</h3>
                <p class="events-empty-desc">
                    Выполните поиск по сообществам библиотек, и алгоритм автоматически извлечёт все анонсы мастер-классов, лекций, выставок и праздников.
                </p>
            </div>
        `;
        return;
    }

    let activeCategory = 'all';
    let activeBranch = 'all';
    let activeView = 'cards'; // 'cards' | 'timeline'

    function filterAndRender() {
        let filtered = events.slice();

        if (activeCategory !== 'all') {
            filtered = filtered.filter(e => e.categories.includes(activeCategory));
        }

        if (activeBranch !== 'all') {
            filtered = filtered.filter(e => e.branch && (e.branch.shortCode === activeBranch || String(e.branch.rawId) === activeBranch));
        }

        const eventsListWrap = container.querySelector('.events-list-container');
        if (!eventsListWrap) return;

        if (filtered.length === 0) {
            eventsListWrap.innerHTML = `
                <div class="events-empty-filter">
                    <span class="material-symbols-outlined">filter_alt_off</span>
                    <p>По выбранным фильтрам анонсов не найдено. Попробуйте выбрать другую категорию или филиал.</p>
                </div>
            `;
            return;
        }

        if (activeView === 'timeline') {
            renderTimelineView(eventsListWrap, filtered);
        } else {
            renderCardsView(eventsListWrap, filtered);
        }
    }

    // Построение каркаса афиши
    const branchesOptions = [
        '<option value="all">Все 16 филиалов Владимира</option>'
    ];
    const uniqueBranches = new Map();
    events.forEach(e => {
        if (e.branch && !uniqueBranches.has(e.branch.shortCode)) {
            uniqueBranches.set(e.branch.shortCode, e.branch.canonicalName);
        }
    });
    uniqueBranches.forEach((name, code) => {
        branchesOptions.push(`<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`);
    });

    const categoryButtonsHtml = EVENT_CATEGORIES.map(cat => `
        <button class="events-cat-btn ${cat.id === 'all' ? 'active' : ''}" data-cat="${cat.id}">
            <span class="material-symbols-outlined icon">${cat.icon}</span>
            <span>${escapeHtml(cat.label)}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <div class="events-board-wrap">
            <!-- Верхняя панель управления афишей -->
            <div class="events-header-bar">
                <div class="events-title-group">
                    <div class="events-icon-pill">
                        <span class="material-symbols-outlined">local_activity</span>
                    </div>
                    <div>
                        <h2 class="events-board-title">Городская сводная афиша библиотек</h2>
                        <p class="events-board-subtitle">Найдено <b>${events.length}</b> мероприятий и анонсов в лентах филиалов</p>
                    </div>
                </div>

                <div class="events-actions-group">
                    <div class="events-view-switch segmented-control">
                        <button class="segment-btn active" id="ev-view-cards" title="Сетка карточек">
                            <span class="material-symbols-outlined segment-icon">grid_view</span>
                            <span>Карточки</span>
                        </button>
                        <button class="segment-btn" id="ev-view-timeline" title="Хронологический таймлайн">
                            <span class="material-symbols-outlined segment-icon">timeline</span>
                            <span>Таймлайн</span>
                        </button>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-print-billboard">
                        <span class="material-symbols-outlined icon">print</span>
                        <span>Печать афиши (А4)</span>
                    </button>
                </div>
            </div>

            <!-- Панель фильтрации по категориям и филиалам -->
            <div class="events-filters-toolbar">
                <div class="events-categories-scroll">
                    ${categoryButtonsHtml}
                </div>
                <div class="events-branch-select-wrap">
                    <select class="events-branch-select" id="events-branch-filter">
                        ${branchesOptions.join('')}
                    </select>
                </div>
            </div>

            <!-- Список событий -->
            <div class="events-list-container"></div>
        </div>
    `;

    // Привязка обработчиков
    const catBtns = container.querySelectorAll('.events-cat-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.cat;
            filterAndRender();
        });
    });

    const branchFilter = container.querySelector('#events-branch-filter');
    if (branchFilter) {
        branchFilter.addEventListener('change', (e) => {
            activeBranch = e.target.value;
            filterAndRender();
        });
    }

    const viewCardsBtn = container.querySelector('#ev-view-cards');
    const viewTimelineBtn = container.querySelector('#ev-view-timeline');

    if (viewCardsBtn && viewTimelineBtn) {
        viewCardsBtn.addEventListener('click', () => {
            viewCardsBtn.classList.add('active');
            viewTimelineBtn.classList.remove('active');
            activeView = 'cards';
            filterAndRender();
        });
        viewTimelineBtn.addEventListener('click', () => {
            viewTimelineBtn.classList.add('active');
            viewCardsBtn.classList.remove('active');
            activeView = 'timeline';
            filterAndRender();
        });
    }

    const printBtn = container.querySelector('#btn-print-billboard');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            openPrintableBillboard(events, activeBranch);
        });
    }

    // Первичная отрисовка
    filterAndRender();
}

/**
 * Отрисовка в виде карточек
 */
function renderCardsView(container, events) {
    const cardsHtml = events.map(e => {
        const branchName = e.branch?.canonicalName || 'Библиотека Владимира';
        const branchAddress = e.branch?.address || '';
        const avatarUrl = e.branch?.avatar || '';

        const tagsHtml = e.categories.map(catId => {
            const cat = EVENT_CATEGORIES.find(c => c.id === catId);
            if (!cat || cat.id === 'all') return '';
            return `<span class="event-tag" style="--cat-color: ${cat.color}"><span class="material-symbols-outlined tag-ico">${cat.icon}</span>${escapeHtml(cat.label)}</span>`;
        }).join('');

        const ageBadge = e.ageRating ? `<span class="event-age-badge">${escapeHtml(e.ageRating)}</span>` : '';
        const timeBadge = e.eventTime ? `<span class="event-time-badge"><span class="material-symbols-outlined">schedule</span>${escapeHtml(e.eventTime)}</span>` : '';

        const imgBlock = e.imageUrl ? `
            <div class="event-card-cover" style="background-image: url('${escapeHtml(e.imageUrl)}')">
                ${ageBadge}
            </div>
        ` : '';

        return `
            <div class="event-card">
                ${imgBlock}
                <div class="event-card-body">
                    <div class="event-card-meta-top">
                        <div class="event-date-pill">
                            <span class="material-symbols-outlined">calendar_today</span>
                            <span class="event-date-val">${escapeHtml(e.dateStr)}</span>
                        </div>
                        ${timeBadge}
                        ${!e.imageUrl && ageBadge ? ageBadge : ''}
                    </div>

                    <h4 class="event-card-title">${escapeHtml(e.title)}</h4>
                    
                    <p class="event-card-snippet">${escapeHtml(e.fullText.slice(0, 160))}...</p>

                    <div class="event-tags-row">
                        ${tagsHtml}
                    </div>

                    <div class="event-card-footer">
                        <div class="event-branch-info">
                            ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" class="event-branch-avatar" alt="">` : ''}
                            <div class="event-branch-text">
                                <span class="event-branch-name">${escapeHtml(branchName)}</span>
                                <span class="event-branch-addr">${escapeHtml(branchAddress)}</span>
                            </div>
                        </div>
                        <a href="${escapeHtml(e.vkPostUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-tonal event-vk-link" title="Открыть запись в VK">
                            <span class="material-symbols-outlined">open_in_new</span>
                            <span>ВК</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="events-grid">${cardsHtml}</div>`;
}

/**
 * Отрисовка в виде хронологического таймлайна
 */
function renderTimelineView(container, events) {
    const timelineItems = events.map(e => {
        const branchName = e.branch?.canonicalName || 'Библиотека';
        const branchAddr = e.branch?.address || '';
        return `
            <div class="timeline-row">
                <div class="timeline-date-col">
                    <span class="timeline-day">${escapeHtml(e.dateStr)}</span>
                    ${e.eventTime ? `<span class="timeline-time">${escapeHtml(e.eventTime)}</span>` : ''}
                </div>
                <div class="timeline-marker">
                    <div class="timeline-dot"></div>
                </div>
                <div class="timeline-content-col">
                    <div class="timeline-branch-lbl">${escapeHtml(branchName)} (${escapeHtml(branchAddr)})</div>
                    <div class="timeline-title">${escapeHtml(e.title)}</div>
                    <div class="timeline-snippet">${escapeHtml(e.fullText.slice(0, 180))}...</div>
                    <div class="timeline-actions">
                        <a href="${escapeHtml(e.vkPostUrl)}" target="_blank" rel="noopener noreferrer" class="timeline-link">
                            Запись в ВК <span class="material-symbols-outlined">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="events-timeline">${timelineItems}</div>`;
}

/**
 * Формирует печатную версию афиши А4 в отдельном всплывающем окне для мгновенной печати
 */
export function openPrintableBillboard(events, branchFilter = 'all') {
    let filtered = events.slice();
    if (branchFilter !== 'all') {
        filtered = filtered.filter(e => e.branch && (e.branch.shortCode === branchFilter || String(e.branch.rawId) === branchFilter));
    }

    const printWin = window.open('', '_blank', 'width=900,height=1100');
    if (!printWin) {
        alert('Пожалуйста, разрешите всплывающие окна для формирования печатной афиши');
        return;
    }

    const qrSvg = createQrSvg('https://vk.com/vladcgb', { size: 90, foreground: '#0f172a', background: '#ffffff' });

    const itemsHtml = filtered.slice(0, 10).map((e, idx) => `
        <div class="print-event-item">
            <div class="print-event-num">#${idx + 1}</div>
            <div class="print-event-content">
                <div class="print-event-header">
                    <span class="print-event-date">${escapeHtml(e.dateStr)}${e.eventTime ? ` в ${escapeHtml(e.eventTime)}` : ''}</span>
                    <span class="print-event-branch">${escapeHtml(e.branch?.canonicalName || 'Библиотека')}</span>
                    ${e.ageRating ? `<span class="print-age">${escapeHtml(e.ageRating)}</span>` : ''}
                </div>
                <div class="print-event-title">${escapeHtml(e.title)}</div>
                <div class="print-event-addr">${escapeHtml(e.branch?.address || '')} • тел: ${escapeHtml(e.branch?.phone || '')}</div>
            </div>
        </div>
    `).join('');

    printWin.document.write(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Афиша мероприятий библиотек г. Владимира</title>
    <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.35;
        }
        .billboard-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .header-title-box h1 {
            margin: 0;
            font-size: 20pt;
            letter-spacing: -0.02em;
            text-transform: uppercase;
        }
        .header-title-box p {
            margin: 4px 0 0 0;
            font-size: 10pt;
            color: #475569;
        }
        .header-qr-box {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .qr-text {
            font-size: 8pt;
            color: #475569;
            text-align: right;
            max-width: 120px;
        }
        .print-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .print-event-item {
            display: flex;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px dashed #cbd5e1;
            page-break-inside: avoid;
        }
        .print-event-num {
            font-weight: 800;
            font-size: 11pt;
            color: #1757a6;
            min-width: 28px;
        }
        .print-event-content { flex: 1; }
        .print-event-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 3px;
        }
        .print-event-date {
            font-weight: 700;
            font-size: 10.5pt;
            color: #1757a6;
        }
        .print-event-branch {
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
        }
        .print-age {
            font-size: 8pt;
            font-weight: 700;
            background: #e2e8f0;
            padding: 1px 4px;
            border-radius: 3px;
        }
        .print-event-title {
            font-size: 11pt;
            font-weight: 600;
            color: #090d16;
            margin-bottom: 2px;
        }
        .print-event-addr {
            font-size: 8.5pt;
            color: #64748b;
        }
        .billboard-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #0f172a;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="billboard-header">
        <div class="header-title-box">
            <h1>Афиша мероприятий</h1>
            <p>Муниципальные библиотеки города Владимира • Вход на события свободный</p>
        </div>
        <div class="header-qr-box">
            <div class="qr-text">Анонсы и запись онлайн в VK</div>
            <div class="qr-img">${qrSvg}</div>
        </div>
    </div>

    <div class="print-grid">
        ${itemsHtml}
    </div>

    <div class="billboard-footer">
        <span>Сформировано в системе аналитики AURORA • МБУК «ЦГБ» г. Владимира</span>
        <span>Официальный портал: biblioteka33.ru</span>
    </div>

    <script>
        window.addEventListener('load', () => {
            setTimeout(() => { window.print(); }, 400);
        });
    </script>
</body>
</html>
    `);
    printWin.document.close();
}
