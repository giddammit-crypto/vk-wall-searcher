/**
 * src/promo.js — In-Library QR Promo Poster & Bookmark Generator
 * =============================================================================
 * Генератор презентационных промо-материалов для привлечения читателей в группы ВК:
 * - Формат А4: Плакат для информационного стенда и входной группы (210×297 мм)
 * - Формат А5: Тейблтент для стойки выдачи книг и абонемента (210×148 мм)
 * - Формат «Закладка»: 4 книжные закладки на лист А4 с направляющими линиями реза
 * - Векторные автономные QR-коды высокой чёткости (300 DPI)
 *
 * Разработка: Амброзиев О.А.
 */

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=4.23.3';
import { createQrSvg } from './qrcode.js?v=4.23.3';

export const PROMO_SLOGANS = [
    'Читай новинки первым — подпишись на наше сообщество ВКонтакте!',
    'Все события, мастер-классы и лектории нашего района',
    'Продлевай книги онлайн, задавай вопросы и следи за фотоотчётами',
    'Интеллектуальное пространство для чтения, учёбы и вдохновения',
    'Книга — это диалог сквозь время. Присоединяйтесь к читателям Владимира!'
];

export const SHELF_GENRES = [
    { id: 'universal', name: 'Любая литература (Универсальная)', icon: 'auto_awesome', desc: 'Универсальный помощник по чтению' },
    { id: 'detective', name: 'Детективы и остросюжетная литература', icon: 'search', desc: 'Загадки, расследования и саспенс' },
    { id: 'sci_fi', name: 'Фантастика и фэнтези', icon: 'rocket_launch', desc: 'Космос, магия и путешествия во времени' },
    { id: 'modern_prose', name: 'Современная проза и бестселлеры', icon: 'menu_book', desc: 'Глубокие сюжеты, лауреаты литературных премий' },
    { id: 'romance', name: 'Романтическая и сентиментальная проза', icon: 'favorite', desc: 'Любовь, искренние чувства и тёплые истории' },
    { id: 'vladimir_history', name: 'Краеведение и история Владимира', icon: 'account_balance', desc: 'Владимирский край, летописи и исторические тайны' },
    { id: 'children', name: 'Детская и подростковая литература', icon: 'face', desc: 'Сказки, приключения и YA-литература' },
    { id: 'non_fiction', name: 'Нон-фикшн и саморазвитие', icon: 'psychology', desc: 'Психология, наука, продуктивность и мотивация' }
];

export const PROMO_TEMPLATES = [
    {
        id: 'swiss',
        name: 'Швейцарский модернизм',
        category: 'Модернизм',
        description: 'Чистый лист, строгая модульная сетка, кобальтовый синий акцент и прецизионные угловые метки',
        swatches: ['#ffffff', '#1d4ed8', '#0a0f1d'],
        dark: false,
        qrForeground: '#0a0f1d',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'cobalt', accent: '#1d4ed8', accentSoft: '#eff6ff', accentBorder: '#bfdbfe', tagBg: '#1d4ed8', tagColor: '#ffffff' },
            { name: 'graphite', accent: '#0f172a', accentSoft: '#f8fafc', accentBorder: '#cbd5e1', tagBg: '#0f172a', tagColor: '#ffffff' },
            { name: 'slate', accent: '#334155', accentSoft: '#f1f5f9', accentBorder: '#94a3b8', tagBg: '#334155', tagColor: '#ffffff' },
            { name: 'steel', accent: '#2563eb', accentSoft: '#f0f9ff', accentBorder: '#93c5fd', tagBg: '#1e40af', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'bauhaus',
        name: 'Баухаус И Авангард',
        category: 'Авангард',
        description: 'Архитектурная геометрия Дессау, чистый белый фон, терракота, тёплая охра и плотная типографика',
        swatches: ['#ffffff', '#c2410c', '#1e293b'],
        dark: false,
        qrForeground: '#1e293b',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'terracotta', accent: '#c2410c', accentSoft: '#fff7ed', accentBorder: '#fed7aa', tagBg: '#c2410c', tagColor: '#ffffff' },
            { name: 'ochre', accent: '#d97706', accentSoft: '#fefce8', accentBorder: '#fde047', tagBg: '#b45309', tagColor: '#ffffff' },
            { name: 'indigo', accent: '#1e293b', accentSoft: '#f8fafc', accentBorder: '#cbd5e1', tagBg: '#1e293b', tagColor: '#ffffff' },
            { name: 'rust', accent: '#9a3412', accentSoft: '#ffedd5', accentBorder: '#fdba74', tagBg: '#7c2d12', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'scandi',
        name: 'Скандинавский минимализм',
        category: 'Минимализм',
        description: 'Эстетика библиотеки Oodi в Хельсинки: чистый белый фон, эвкалиптовый шалфей и тактильный покой',
        swatches: ['#ffffff', '#0f766e', '#1c1917'],
        dark: false,
        qrForeground: '#1c1917',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'eucalyptus', accent: '#0f766e', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#0f766e', tagColor: '#ffffff' },
            { name: 'sage', accent: '#115e59', accentSoft: '#f2fbf9', accentBorder: '#f9a8d4', tagBg: '#134e4a', tagColor: '#ffffff' },
            { name: 'stone', accent: '#44403c', accentSoft: '#fafaf9', accentBorder: '#d6d3d1', tagBg: '#292524', tagColor: '#ffffff' },
            { name: 'spruce', accent: '#86198f', accentSoft: '#f0fdf4', accentBorder: '#fbcfe8', tagBg: '#9d174d', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'editorial',
        name: 'Литературная классика',
        category: 'Классика',
        description: 'Академическое книжное издательство: чистый белый фон, благородный бордо и классическая рамка',
        swatches: ['#ffffff', '#831843', '#1c1917'],
        dark: false,
        qrForeground: '#1c1917',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'burgundy', accent: '#831843', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#831843', tagColor: '#ffffff' },
            { name: 'plum', accent: '#701a75', accentSoft: '#fdf4ff', accentBorder: '#f5d0fe', tagBg: '#701a75', tagColor: '#ffffff' },
            { name: 'wine', accent: '#9f1239', accentSoft: '#fff1f2', accentBorder: '#fecdd3', tagBg: '#881337', tagColor: '#ffffff' },
            { name: 'leather', accent: '#3b0764', accentSoft: '#faf5ff', accentBorder: '#e9d5ff', tagBg: '#581c87', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'botanical',
        name: 'Эко-библиотека И Природа',
        category: 'Экология',
        description: 'Биофильный дизайн: чистый белый фон, хвоя, лесной мох и гармония природного чтения',
        swatches: ['#ffffff', '#9d174d', '#3b0a24'],
        dark: false,
        qrForeground: '#3b0a24',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'emerald', accent: '#9d174d', accentSoft: '#f0fdf4', accentBorder: '#fbcfe8', tagBg: '#9d174d', tagColor: '#ffffff' },
            { name: 'moss', accent: '#581c87', accentSoft: '#f7fee7', accentBorder: '#fbcfe8', tagBg: '#4a044e', tagColor: '#ffffff' },
            { name: 'forest', accent: '#86198f', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#86198f', tagColor: '#ffffff' },
            { name: 'fern', accent: '#9d174d', accentSoft: '#f0fdf4', accentBorder: '#f9a8d4', tagBg: '#9d174d', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'craft',
        name: 'Винтажный архив',
        category: 'Архив',
        description: 'Чистый белый фон, типографская кофейная сепия, сургучный красный и шарм экслибриса',
        swatches: ['#ffffff', '#991b1b', '#292524'],
        dark: false,
        qrForeground: '#292524',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'crimson-wax', accent: '#991b1b', accentSoft: '#ede4d4', accentBorder: '#d6c7b2', tagBg: '#991b1b', tagColor: '#ffffff' },
            { name: 'sepia', accent: '#574e44', accentSoft: '#f2eae0', accentBorder: '#cbbba7', tagBg: '#3d362e', tagColor: '#ffffff' },
            { name: 'chestnut', accent: '#7c2d12', accentSoft: '#eedfd2', accentBorder: '#d9c2b0', tagBg: '#64240d', tagColor: '#ffffff' },
            { name: 'amber-wax', accent: '#b45309', accentSoft: '#f5eee3', accentBorder: '#decaba', tagBg: '#92400e', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'gallery',
        name: 'Галерея современного искусства',
        category: 'Галерея',
        description: 'Монохромный контраст White Cube, чистый белый фон, швейцарские кресты (+) и масштабная верстка',
        swatches: ['#ffffff', '#18181b', '#71717a'],
        dark: false,
        qrForeground: '#09090b',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'carbon', accent: '#09090b', accentSoft: '#f4f4f5', accentBorder: '#d4d4d8', tagBg: '#09090b', tagColor: '#ffffff' },
            { name: 'zinc', accent: '#27272a', accentSoft: '#fafafa', accentBorder: '#e4e4e7', tagBg: '#18181b', tagColor: '#ffffff' },
            { name: 'concrete', accent: '#52525b', accentSoft: '#f4f4f5', accentBorder: '#a1a1aa', tagBg: '#3f3f46', tagColor: '#ffffff' },
            { name: 'plinth', accent: '#18181b', accentSoft: '#f1f1f2', accentBorder: '#71717a', tagBg: '#000000', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'kids',
        name: 'Детство И Семейное чтение',
        category: 'Детство',
        description: 'Чистый белый фон, солнечный мандариновый янтарь, лазурное небо и мягкие формы',
        swatches: ['#ffffff', '#ea580c', '#0284c7'],
        dark: false,
        qrForeground: '#1e293b',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'sunshine', accent: '#ea580c', accentSoft: '#fff7ed', accentBorder: '#fed7aa', tagBg: '#ea580c', tagColor: '#ffffff' },
            { name: 'cerulean', accent: '#0284c7', accentSoft: '#f0f9ff', accentBorder: '#bae6fd', tagBg: '#0284c7', tagColor: '#ffffff' },
            { name: 'emerald-kids', accent: '#be185d', accentSoft: '#f0fdf4', accentBorder: '#fbcfe8', tagBg: '#be185d', tagColor: '#ffffff' },
            { name: 'berry', accent: '#db2777', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#db2777', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'neo',
        name: 'Цифровая лаборатория И Медиахаб',
        category: 'Технологии',
        description: 'Чистый белый фон, высокотехнологичный ультрамарин, лазурный циан, моноширинные теги [ LAB ] и технологичный драйв',
        swatches: ['#ffffff', '#0284c7', '#2563eb'],
        dark: false,
        qrForeground: '#0f172a',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'neo-blue', accent: '#2563eb', accentSoft: '#eff6ff', accentBorder: '#bfdbfe', tagBg: '#2563eb', tagColor: '#ffffff' },
            { name: 'neo-cyan', accent: '#0284c7', accentSoft: '#f0f9ff', accentBorder: '#bae6fd', tagBg: '#0284c7', tagColor: '#ffffff' },
            { name: 'neo-teal', accent: '#be185d', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#0f766e', tagColor: '#ffffff' },
            { name: 'neo-indigo', accent: '#4f46e5', accentSoft: '#eef2ff', accentBorder: '#c7d2fe', tagBg: '#4338ca', tagColor: '#ffffff' }
        ]
    },
    {
        id: 'poetry',
        name: 'Арт-резиденция И Креатив',
        category: 'Искусство',
        description: 'Чистый белый фон, смелая маджента, чернильный индиго, тёплый шафран, творческая свобода и экспрессивный литературный стиль',
        swatches: ['#ffffff', '#be185d', '#1e1b4b'],
        dark: false,
        qrForeground: '#1e1b4b',
        qrBackground: '#ffffff',
        bookmarkThemes: [
            { name: 'art-magenta', accent: '#be185d', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#be185d', tagColor: '#ffffff' },
            { name: 'art-indigo', accent: '#3730a3', accentSoft: '#eef2ff', accentBorder: '#c7d2fe', tagBg: '#312e81', tagColor: '#ffffff' },
            { name: 'art-saffron', accent: '#d97706', accentSoft: '#fefce8', accentBorder: '#fde047', tagBg: '#b45309', tagColor: '#ffffff' },
            { name: 'art-emerald', accent: '#a81a5e', accentSoft: '#fdf2f8', accentBorder: '#fbcfe8', tagBg: '#9d174d', tagColor: '#ffffff' }
        ]
    }
];

function getDisplayUrl(branch) {
    if (!branch) return 'biblioteka33.ru';
    if (branch.screenName) return `vk.com/${branch.screenName}`;
    if (branch.vkLink && branch.vkLink.trim()) return branch.vkLink.replace(/^https?:\/\//, '');
    if (branch.branch_url && branch.branch_url.trim()) return branch.branch_url.replace(/^https?:\/\//, '');
    return 'biblioteka33.ru';
}

export function getShelfUrl(branch, genreId = 'universal') {
    const branchCode = (branch && (branch.shortCode || branch.canonicalName)) ? (branch.shortCode || branch.canonicalName) : 'cgb';
    const base = window.location.origin + window.location.pathname;
    return `${base}?mode=shelf_recommend&genre=${encodeURIComponent(genreId)}&branch=${encodeURIComponent(branchCode)}`;
}

function getBookmarkSlogans(chosenSlogan) {
    if (chosenSlogan === PROMO_SLOGANS[0]) {
        return [
            'Читай новинки первым — подпишись на наше сообщество ВКонтакте!',
            '«Книга — это мечта, которую вы держите в руках» (Нил Гейман)',
            'Все мастер-классы, лекции и бесплатные события нашего района',
            'Продлевай книги онлайн, задавай вопросы и оставайся на связи'
        ];
    }
    return [chosenSlogan, chosenSlogan, chosenSlogan, chosenSlogan];
}

/**
 * Инициализирует модальное окно конструктора промо-материалов
 */
export function initPromoModal() {
    let modal = document.getElementById('promo-modal-overlay');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'promo-modal-overlay';
    modal.className = 'promo-modal-overlay hidden';

    const branchOptions = CANONICAL_BRANCHES.map(b => 
        `<option value="${escapeHtml(b.canonicalName)}">${escapeHtml(b.canonicalName)}</option>`
    ).join('');

    const sloganOptions = PROMO_SLOGANS.map(s => 
        `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`
    ).join('');

    modal.innerHTML = `
        <div class="promo-modal-window">
            <div class="promo-modal-header">
                <div class="promo-modal-title-group">
                    <span class="material-symbols-outlined promo-icon">qr_code_scanner</span>
                    <div>
                        <h3 class="promo-modal-title">Генератор промо-материалов филиала</h3>
                        <p class="promo-modal-subtitle">Типографские плакаты, настольные тейблтенты и книжные закладки с векторным QR-кодом сообщества</p>
                    </div>
                </div>
                <button class="promo-modal-close" id="promo-modal-close-btn" aria-label="Закрыть">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="promo-modal-body">
                <!-- Панель настроек -->
                <div class="promo-controls-col">
                    <div class="form-group">
                        <label class="promo-label">Библиотека:</label>
                        <select id="promo-branch-select" class="promo-select">
                            ${branchOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="promo-label">Формат промо-материала:</label>
                        <div class="promo-format-selector">
                            <label class="promo-format-card active">
                                <input type="radio" name="promo-format" value="a4" checked>
                                <span class="material-symbols-outlined format-ico">picture_as_pdf</span>
                                <span class="promo-format-name">Плакат А4</span>
                                <span class="promo-format-desc">Инфостенд и входная зона</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="a5">
                                <span class="material-symbols-outlined format-ico">tablet_mac</span>
                                <span class="promo-format-name">Тейблтент А5</span>
                                <span class="promo-format-desc">Настольный тейблтент</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="bookmark">
                                <span class="material-symbols-outlined format-ico">bookmark</span>
                                <span class="promo-format-name">Закладки (4 шт/А4)</span>
                                <span class="promo-format-desc">Альбомный лист А4 (линии реза)</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="shelf">
                                <span class="material-symbols-outlined format-ico">shelves</span>
                                <span class="promo-format-name">Полка с Космо</span>
                                <span class="promo-format-desc">Тейблтент/наклейка (3 шт/А4)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group bookmark-scale-group" id="bookmark-scale-group" style="display: none;">
                        <label class="promo-label">Параметры печати закладок (А4 Альбомная):</label>
                        <div class="promo-scale-chips" id="bookmark-scale-chips">
                            <button type="button" class="promo-scale-chip" data-scale="1.00">100% (Компакт)</button>
                            <button type="button" class="promo-scale-chip" data-scale="1.10">110%</button>
                            <button type="button" class="promo-scale-chip active" data-scale="1.25">125% (По умолчанию)</button>
                            <button type="button" class="promo-scale-chip" data-scale="1.30">130% (Макс)</button>
                        </div>
                        <div class="promo-scale-info">
                            <span class="material-symbols-outlined scale-info-ico">tune</span>
                            <span>Пользовательский масштаб <strong>125%</strong> выставлен по умолчанию (оптимально для листа А4 и уверенного считывания QR-кода)</span>
                        </div>
                    </div>

                    <div class="form-group shelf-genre-group" id="shelf-genre-group" style="display: none;">
                        <label class="promo-label">Жанр / тематика книжного стеллажа:</label>
                        <select id="shelf-genre-select" class="promo-select">
                            ${SHELF_GENRES.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}
                        </select>
                        <div class="promo-scale-info" style="margin-top: 6px;">
                            <span class="material-symbols-outlined scale-info-ico">qr_code_scanner</span>
                            <span>QR-код направит читателя к Космо с предвыбранным жанром и библиотекой</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="promo-label">Шаблон оформления (10 дизайн-систем):</label>
                        <div class="promo-templates-selector" id="promo-templates-picker">
                            ${PROMO_TEMPLATES.map(tpl => `
                                <div class="promo-tpl-card ${tpl.id === 'swiss' ? 'active' : ''}" data-tpl-id="${tpl.id}" title="${escapeHtml(tpl.description)}">
                                    <div class="tpl-swatches">
                                        <span class="tpl-swatch" style="background: ${tpl.swatches[0]}; border: 1px solid rgba(0,0,0,0.12);"></span>
                                        <span class="tpl-swatch" style="background: ${tpl.swatches[1]};"></span>
                                        <span class="tpl-swatch" style="background: ${tpl.swatches[2]};"></span>
                                    </div>
                                    <div class="tpl-info">
                                        <span class="tpl-name">${escapeHtml(tpl.name)}</span>
                                        <span class="tpl-badge">${escapeHtml(tpl.category)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="promo-label">Слоган / призыв к действию:</label>
                        <select id="promo-slogan-select" class="promo-select">
                            ${sloganOptions}
                            <option value="custom">— Свой вариант текста —</option>
                        </select>
                        <input type="text" id="promo-slogan-custom" class="promo-input hidden" placeholder="Введите текст слогана..." maxlength="120">
                    </div>

                    <div class="promo-branch-preview-info" id="promo-branch-meta">
                        <!-- Заполняется динамически -->
                    </div>

                    <div class="promo-print-actions">
                        <button class="btn btn-primary btn-block promo-print-btn" id="promo-print-btn">
                            <span class="material-symbols-outlined">print</span>
                            <span>Печать / Сохранить в PDF</span>
                        </button>
                    </div>
                </div>

                <!-- Предпросмотр макета -->
                <div class="promo-preview-col">
                    <div class="promo-preview-viewport" id="promo-preview-viewport">
                        <!-- Рендерится превью -->
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Логика элементов управления
    const branchSelect = modal.querySelector('#promo-branch-select');
    const formatCards = modal.querySelectorAll('.promo-format-card');
    const tplCards = modal.querySelectorAll('.promo-tpl-card');
    const sloganSelect = modal.querySelector('#promo-slogan-select');
    const sloganCustom = modal.querySelector('#promo-slogan-custom');
    const closeBtn = modal.querySelector('#promo-modal-close-btn');
    const printBtn = modal.querySelector('#promo-print-btn');
    const viewport = modal.querySelector('#promo-preview-viewport');
    const metaBox = modal.querySelector('#promo-branch-meta');

    let currentBranch = CANONICAL_BRANCHES[0];
    let currentFormat = 'a4';
    let currentBookmarkScale = 1.25;
    let currentShelfGenre = 'universal';
    let currentSlogan = PROMO_SLOGANS[0];
    let currentTemplate = PROMO_TEMPLATES[0];

    function updatePreview() {
        if (!currentBranch) return;

        const displayUrl = getDisplayUrl(currentBranch);
        const qrFg = currentTemplate.qrForeground || '#0a0f1d';
        const qrBg = currentTemplate.qrBackground || '#ffffff';

        metaBox.innerHTML = `
            <div class="meta-row">
                <span class="meta-lbl">БИБЛИОТЕКА</span>
                <span class="meta-val">${escapeHtml(currentBranch.canonicalName)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-lbl">АДРЕС</span>
                <span class="meta-val">${escapeHtml(currentBranch.address)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-lbl">ТЕЛЕФОН</span>
                <span class="meta-val">${escapeHtml(currentBranch.phone)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-lbl">СООБЩЕСТВО</span>
                <span class="meta-val mono-val">${escapeHtml(displayUrl)}</span>
            </div>
        `;

        if (currentFormat === 'bookmark') {
            const slogans = getBookmarkSlogans(currentSlogan);
            const targetUrl = (currentBranch.vkLink && currentBranch.vkLink.trim()) || currentBranch.branch_url || 'https://biblioteka33.ru';
            const qrSvgSmall = createQrSvg(targetUrl, { size: 95, foreground: qrFg, background: qrBg, margin: 4 });
            const bThemes = currentTemplate.bookmarkThemes;

            viewport.innerHTML = `
                <div class="poster-sheet sheet-bookmark sheet-theme-${currentTemplate.id}">
                    ${bThemes.map((theme, idx) => `
                        ${idx > 0 ? `
                            <div class="bm-cutting-guide">
                                <span class="bm-cut-icon">✂</span>
                                <span class="bm-cut-line"></span>
                                <span class="bm-cut-icon">✂</span>
                            </div>
                        ` : ''}
                        <div class="bm-card theme-${theme.name}" style="border-color: ${theme.accentBorder};">
                            <div class="bm-top-tag" style="background: ${theme.tagBg}; color: ${theme.tagColor};">
                                КНИЖНАЯ ЗАКЛАДКА
                            </div>
                            <div class="bm-civic-seal">
                                <span class="bm-civic-org">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ</span>
                                <span class="bm-city-line">Г.&nbsp;ВЛАДИМИРА</span>
                            </div>
                            <div class="bm-branch-name">
                                ${escapeHtml(currentBranch.canonicalName)}
                            </div>
                            <div class="bm-quote-container" style="border-left-color: ${theme.accent};">
                                «${escapeHtml(slogans[idx])}»
                            </div>
                            <div class="bm-qr-wrapper">
                                <div class="qr-architectural-frame bm-frame" style="--corner-color: ${theme.accent};">
                                    <span class="corner corner-tl"></span>
                                    <span class="corner corner-tr"></span>
                                    <span class="corner corner-bl"></span>
                                    <span class="corner corner-br"></span>
                                    <div class="qr-svg-holder">
                                        ${qrSvgSmall}
                                    </div>
                                </div>
                            </div>
                            <div class="bm-scan-cue">НАВЕДИТЕ КАМЕРУ</div>
                            <div class="bm-url" style="color: ${theme.accent};">${escapeHtml(displayUrl)}</div>
                            <div class="bm-chips">
                                <span class="bm-chip">Продление онлайн</span>
                                <span class="bm-chip">Афиша событий</span>
                            </div>
                            <div class="bm-footer">
                                <div class="bm-foot-line">${escapeHtml(currentBranch.address)}</div>
                                <div class="bm-foot-line">тел. ${escapeHtml(currentBranch.phone)}</div>
                                <div class="bm-foot-portal">https://biblioteka33.ru</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (currentFormat === 'a5') {
            const targetUrl = (currentBranch.vkLink && currentBranch.vkLink.trim()) || currentBranch.branch_url || 'https://biblioteka33.ru';
            const qrSvgA5 = createQrSvg(targetUrl, { size: 105, foreground: qrFg, background: qrBg, margin: 4 });

            viewport.innerHTML = `
                <div class="poster-sheet sheet-a5 sheet-theme-${currentTemplate.id}">
                    <div class="poster-sheet-inner a5-inner">
                        <!-- Top Identity Bar -->
                        <header class="poster-identity-bar a5-identity">
                            <div class="poster-civic-badge">
                                <span class="civic-text">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                            </div>
                            <div class="poster-institution-portal">https://biblioteka33.ru</div>
                        </header>

                        <!-- 2-Column Core -->
                        <div class="a5-core-columns">
                            <!-- Left Column: Editorial & Features -->
                            <div class="a5-editorial-col">
                                <h2 class="a5-branch-title">${escapeHtml(currentBranch.canonicalName)}</h2>
                                <div class="a5-main-cta">Все события, новинки литературы и продление книг онлайн</div>
                                <div class="a5-slogan-quote">«${escapeHtml(currentSlogan)}»</div>

                                <ul class="a5-feature-checklist">
                                    <li><span class="a5-check-icon">✓</span> <span>Быстрое и удобное продление книг онлайн</span></li>
                                    <li><span class="a5-check-icon">✓</span> <span>Анонсы бесплатных лекций, мастер-классов и клубов</span></li>
                                    <li><span class="a5-check-icon">✓</span> <span>Прямой диалог с библиотекарем в сообщениях группы</span></li>
                                </ul>
                            </div>

                            <!-- Right Column: Architectural QR Focus -->
                            <div class="a5-qr-col">
                                <div class="qr-architectural-frame a5-qr-frame">
                                    <span class="corner corner-tl"></span>
                                    <span class="corner corner-tr"></span>
                                    <span class="corner corner-bl"></span>
                                    <span class="corner corner-br"></span>
                                    <div class="qr-svg-holder">
                                        ${qrSvgA5}
                                    </div>
                                </div>
                                <div class="a5-scan-prompt">
                                    <div class="qr-prompt-tag">НАВЕДИТЕ КАМЕРУ СМАРТФОНА</div>
                                    <div class="a5-url-chip">${escapeHtml(displayUrl)}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Colophon Bar -->
                        <footer class="poster-colophon a5-colophon">
                            <div class="colophon-col col-address">
                                <span class="col-label">АДРЕС БИБЛИОТЕКИ</span>
                                <span class="col-value">${escapeHtml(currentBranch.address)}</span>
                            </div>
                            <div class="colophon-col col-phone">
                                <span class="col-label">ТЕЛЕФОН</span>
                                <span class="col-value">${escapeHtml(currentBranch.phone)}</span>
                            </div>
                            <div class="colophon-col col-web">
                                <span class="col-label">САЙТ</span>
                                <span class="col-value">https://biblioteka33.ru</span>
                            </div>
                        </footer>
                    </div>
                </div>
            `;
        } else if (currentFormat === 'shelf') {
            const shelfUrl = getShelfUrl(currentBranch, currentShelfGenre);
            const genreObj = SHELF_GENRES.find(g => g.id === currentShelfGenre) || SHELF_GENRES[0];
            const qrSvgShelf = createQrSvg(shelfUrl, { size: 74, foreground: qrFg, background: qrBg, margin: 2 });

            const renderTentCard = () => `
                <div class="shelf-tent-card">
                    <div class="shelf-tent-fold-zone">
                        <span class="fold-cue">⌃ ЛИНИЯ СГИБА ТЕЙБЛТЕНТА (ПОСТАВИТЬ НА ПОЛКУ ШАЛАШИКОМ) ⌃</span>
                        <span class="fold-portal">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                    </div>
                    <div class="shelf-tent-front">
                        <div class="shelf-tent-main">
                            <div class="shelf-badge-row">
                                <span class="shelf-cosmo-badge">
                                    <img src="assets/images/mascot/robot_smile.png?v=4.24.2" class="cosmo-mini-avatar" alt="Космо" />
                                    <span>КНИЖНАЯ ПОЛКА С КОСМО</span>
                                </span>
                                <span class="shelf-genre-pill">
                                    <span class="material-symbols-outlined">${genreObj.icon}</span>
                                    <span>${escapeHtml(genreObj.name)}</span>
                                </span>
                            </div>
                            <h3 class="shelf-tent-title">Не знаешь, что почитать? Наведи камеру — Космо подберёт книгу!</h3>
                            <p class="shelf-tent-sub">Библиотечный робот Космо задаст 2 быстрых вопроса и моментально порекомендует ТОП-3 книги с этого стеллажа под твоё настроение и темп чтения.</p>
                            <div class="shelf-steps-row">
                                <span class="shelf-step"><span class="step-num">1</span> Сканируй QR</span>
                                <span class="shelf-step-arrow">→</span>
                                <span class="shelf-step"><span class="step-num">2</span> 2 вопроса от Космо</span>
                                <span class="shelf-step-arrow">→</span>
                                <span class="shelf-step"><span class="step-num">3</span> ТОП-3 книги на полке</span>
                            </div>
                            <div class="shelf-org-tag">🏛 ${escapeHtml(currentBranch.canonicalName)}${currentBranch.address ? ' &bull; ' + escapeHtml(currentBranch.address) : ''}</div>
                        </div>
                        <div class="shelf-tent-qr-col">
                            <div class="shelf-qr-frame">
                                ${qrSvgShelf}
                            </div>
                            <div class="shelf-qr-cue">ВЕБ-ЧАТ С КОСМО</div>
                            <div class="shelf-qr-sub">Без приложений &bull; С телефона</div>
                        </div>
                    </div>
                </div>
            `;

            viewport.innerHTML = `
                <div class="poster-sheet sheet-shelf sheet-theme-${currentTemplate.id}">
                    ${renderTentCard()}
                    <div class="shelf-cut-guide">
                        <span class="shelf-cut-line"></span>
                        <span class="shelf-cut-badge">✂ ЛИНИЯ РЕЗА (3 МАКЕТА НА ЛИСТ А4)</span>
                        <span class="shelf-cut-line"></span>
                    </div>
                    ${renderTentCard()}
                    <div class="shelf-cut-guide">
                        <span class="shelf-cut-line"></span>
                        <span class="shelf-cut-badge">✂ ЛИНИЯ РЕЗА</span>
                        <span class="shelf-cut-line"></span>
                    </div>
                    ${renderTentCard()}
                </div>
            `;
        } else {
            // Плакат А4
            const targetUrl = (currentBranch.vkLink && currentBranch.vkLink.trim()) || currentBranch.branch_url || 'https://biblioteka33.ru';
            const qrSvgA4 = createQrSvg(targetUrl, { size: 120, foreground: qrFg, background: qrBg, margin: 4 });

            viewport.innerHTML = `
                <div class="poster-sheet sheet-a4 sheet-theme-${currentTemplate.id}">
                    <div class="poster-sheet-inner">
                        <!-- Top Identity Bar -->
                        <header class="poster-identity-bar">
                            <div class="poster-civic-badge">
                                <span class="civic-text">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                            </div>
                            <div class="poster-institution-portal">https://biblioteka33.ru</div>
                        </header>

                        <!-- Main Title & Kicker -->
                        <div class="poster-hero-section">
                            <div class="poster-kicker">ГОРОДСКОЕ КУЛЬТУРНОЕ ПРОСТРАНСТВО</div>
                            <h1 class="poster-branch-title">${escapeHtml(currentBranch.canonicalName)}</h1>
                            <div class="poster-slogan-editorial">
                                <span class="quote-symbol">«</span>
                                <span class="slogan-content">${escapeHtml(currentSlogan)}</span>
                                <span class="quote-symbol">»</span>
                            </div>
                        </div>

                        <!-- 3 Curated Value Cards -->
                        <section class="poster-cards-triptych">
                            <div class="p-card">
                                <div class="p-card-header">
                                    <span class="p-card-num">01</span>
                                    <span class="p-card-icon">📖</span>
                                </div>
                                <h3 class="p-card-title">Книжный фонд И Новинки</h3>
                                <p class="p-card-desc">Актуальные бестселлеры, классика, периодика и редкие краеведческие издания</p>
                            </div>
                            <div class="p-card">
                                <div class="p-card-header">
                                    <span class="p-card-num">02</span>
                                    <span class="p-card-icon">🎨</span>
                                </div>
                                <h3 class="p-card-title">Мастер-классы И Клубы</h3>
                                <p class="p-card-desc">Интеллектуальные лектории, выставки, творческие встречи и клубы по интересам</p>
                            </div>
                            <div class="p-card">
                                <div class="p-card-header">
                                    <span class="p-card-num">03</span>
                                    <span class="p-card-icon">📸</span>
                                </div>
                                <h3 class="p-card-title">Анонсы событий И Фото</h3>
                                <p class="p-card-desc">Афиша мероприятий, продление изданий онлайн и яркие фотоотчёты встреч</p>
                            </div>
                        </section>

                        <!-- Architectural QR Focus Module -->
                        <section class="poster-qr-architecture">
                            <div class="qr-architectural-frame">
                                <span class="corner corner-tl"></span>
                                <span class="corner corner-tr"></span>
                                <span class="corner corner-bl"></span>
                                <span class="corner corner-br"></span>
                                <div class="qr-svg-holder">
                                    ${qrSvgA4}
                                </div>
                            </div>
                            <div class="qr-architecture-info">
                                <div class="qr-prompt-tag">НАВЕДИТЕ КАМЕРУ СМАРТФОНА</div>
                                <div class="qr-prompt-heading">Официальное сообщество ВКонтакте</div>
                                <p class="qr-prompt-sub">Свежие анонсы событий, продление книг онлайн, отзывы и диалог с библиотекой</p>
                                <div class="qr-target-url">${escapeHtml(displayUrl)}</div>
                            </div>
                        </section>

                        <!-- Colophon / Footer -->
                        <footer class="poster-colophon">
                            <div class="colophon-col col-address">
                                <span class="col-label">АДРЕС БИБЛИОТЕКИ</span>
                                <span class="col-value">${escapeHtml(currentBranch.address)}</span>
                            </div>
                            <div class="colophon-col col-phone">
                                <span class="col-label">ТЕЛЕФОН ДЛЯ СПРАВОК</span>
                                <span class="col-value">${escapeHtml(currentBranch.phone)}</span>
                            </div>
                            <div class="colophon-col col-web">
                                <span class="col-label">ОФИЦИАЛЬНЫЙ САЙТ</span>
                                <span class="col-value">https://biblioteka33.ru</span>
                            </div>
                        </footer>
                    </div>
                </div>
            `;
        }
    }

    branchSelect.addEventListener('change', () => {
        const val = branchSelect.value;
        currentBranch = CANONICAL_BRANCHES.find(b => 
            b.canonicalName === val ||
            b.shortCode === val || 
            b.rawId === Number(val)
        ) || CANONICAL_BRANCHES[0];
        updatePreview();
    });

    formatCards.forEach(card => {
        card.addEventListener('click', () => {
            formatCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input');
            if (radio) radio.checked = true;
            currentFormat = radio ? radio.value : 'a4';
            const scaleGroup = modal.querySelector('#bookmark-scale-group');
            if (scaleGroup) {
                scaleGroup.style.display = currentFormat === 'bookmark' ? 'block' : 'none';
            }
            const shelfGroup = modal.querySelector('#shelf-genre-group');
            if (shelfGroup) {
                shelfGroup.style.display = currentFormat === 'shelf' ? 'block' : 'none';
            }
            updatePreview();
        });
    });

    const shelfGenreSelect = modal.querySelector('#shelf-genre-select');
    if (shelfGenreSelect) {
        shelfGenreSelect.addEventListener('change', () => {
            currentShelfGenre = shelfGenreSelect.value;
            updatePreview();
        });
    }

    const scaleChips = modal.querySelectorAll('.promo-scale-chip');
    scaleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            scaleChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentBookmarkScale = parseFloat(chip.getAttribute('data-scale')) || 1.25;
        });
    });

    tplCards.forEach(card => {
        card.addEventListener('click', () => {
            tplCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const tplId = card.getAttribute('data-tpl-id');
            currentTemplate = PROMO_TEMPLATES.find(t => t.id === tplId) || PROMO_TEMPLATES[0];
            updatePreview();
        });
    });

    sloganSelect.addEventListener('change', () => {
        if (sloganSelect.value === 'custom') {
            sloganCustom.classList.remove('hidden');
            currentSlogan = sloganCustom.value.trim() || 'Приглашаем в нашу библиотеку!';
        } else {
            sloganCustom.classList.add('hidden');
            currentSlogan = sloganSelect.value;
        }
        updatePreview();
    });

    sloganCustom.addEventListener('input', () => {
        currentSlogan = sloganCustom.value.trim() || 'Приглашаем в нашу библиотеку!';
        updatePreview();
    });

    closeBtn.addEventListener('click', () => {
        closePromoModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePromoModal();
    });

    printBtn.addEventListener('click', () => {
        printPromoPoster(currentBranch, currentFormat, currentSlogan, currentTemplate, currentBookmarkScale, currentShelfGenre);
    });

    updatePreview();
}

export function openPromoModal(defaultBranchCode = null) {
    initPromoModal();
    const modal = document.getElementById('promo-modal-overlay');
    if (!modal) return;

    if (defaultBranchCode) {
        const sel = modal.querySelector('#promo-branch-select');
        if (sel) {
            const targetBranch = CANONICAL_BRANCHES.find(b => 
                b.shortCode === defaultBranchCode || 
                b.rawId === Number(defaultBranchCode) || 
                b.canonicalName === defaultBranchCode
            );
            if (targetBranch) {
                sel.value = targetBranch.shortCode;
                sel.dispatchEvent(new Event('change'));
            }
        }
    }

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

export function closePromoModal() {
    const modal = document.getElementById('promo-modal-overlay');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

/**
 * Открывает окно типографской печати плаката / тейблтента / закладок
 */
export function printPromoPoster(branch, format, slogan, template = PROMO_TEMPLATES[0], bookmarkScale = 1.25, shelfGenre = 'universal') {
    const printWin = window.open('', '_blank', 'width=1000,height=1150');
    if (!printWin) {
        alert('Пожалуйста, разрешите всплывающие окна для печати промо-материалов');
        return;
    }

    const displayUrl = getDisplayUrl(branch);
    const qrFg = template.qrForeground || '#0a0f1d';
    const qrBg = template.qrBackground || '#ffffff';
    let bodyContent = '';
    let pageCss = '';

    const themePrintRules = `
        /* Theme Overrides for Print */
        .print-theme-swiss { background: #ffffff; color: #0a0f1d; }
        .print-theme-swiss .a5-cta, .print-theme-swiss .a4-slogan-box, .print-theme-swiss .a4-qr-prompt, .print-theme-swiss .a4-qr-link, .print-theme-swiss .a4-card-num { color: #1d4ed8; }
        .print-theme-swiss .a4-slogan-box { border-left-color: #1d4ed8; }
        .print-theme-swiss .a4-frame .corner, .print-theme-swiss .a5-frame .corner { border-color: #1d4ed8; }

        .print-theme-bauhaus { background: #faf8f5; color: #111827; }
        .print-theme-bauhaus .a4-top, .print-theme-bauhaus .a5-top { border-bottom-width: 0.8mm; border-bottom-color: #111827; }
        .print-theme-bauhaus .a5-cta, .print-theme-bauhaus .a4-kicker, .print-theme-bauhaus .a4-qr-prompt, .print-theme-bauhaus .a4-qr-link, .print-theme-bauhaus .a4-card-num { color: #c2410c; }
        .print-theme-bauhaus .a4-slogan-box { border-left-color: #c2410c; background: #fff7ed; border-radius: 0; }
        .print-theme-bauhaus .a4-card, .print-theme-bauhaus .a5-right, .print-theme-bauhaus .a4-qr-block { border-radius: 0; }
        .print-theme-bauhaus .a4-card { border-top: 1mm solid #c2410c; }
        .print-theme-bauhaus .a4-card:nth-child(2) { border-top-color: #d97706; }
        .print-theme-bauhaus .a4-card:nth-child(3) { border-top-color: #1e293b; }
        .print-theme-bauhaus .a4-frame .corner, .print-theme-bauhaus .a5-frame .corner { border-color: #c2410c; }

        .print-theme-scandi { background: #fcfbfa; color: #1c1917; }
        .print-theme-scandi .a5-cta, .print-theme-scandi .a4-slogan-box, .print-theme-scandi .a4-qr-prompt, .print-theme-scandi .a4-qr-link, .print-theme-scandi .a4-card-num { color: #0f766e; }
        .print-theme-scandi .a4-slogan-box { border-left-color: #0f766e; background: #fdf2f8; border-radius: 3mm; }
        .print-theme-scandi .a4-card, .print-theme-scandi .a5-right, .print-theme-scandi .a4-qr-block { border-radius: 3.5mm; border-color: #fbcfe8; background: #fdf2f8; }
        .print-theme-scandi .a4-frame .corner, .print-theme-scandi .a5-frame .corner { border-color: #0f766e; }

        .print-theme-editorial { background: #fdfbf7; color: #1c1917; }
        .print-theme-editorial .a4-name, .print-theme-editorial .a5-name, .print-theme-editorial .bm-title { font-family: Georgia, serif; }
        .print-theme-editorial .a4-top, .print-theme-editorial .a5-top { border-bottom: 0.8mm double #831843; }
        .print-theme-editorial .a5-cta, .print-theme-editorial .a4-kicker, .print-theme-editorial .a4-qr-prompt, .print-theme-editorial .a4-qr-link, .print-theme-editorial .a4-card-num { color: #831843; }
        .print-theme-editorial .a4-slogan-box { border-left-color: #831843; background: #fdf2f8; font-family: Georgia, serif; }
        .print-theme-editorial .a4-card, .print-theme-editorial .a5-right, .print-theme-editorial .a4-qr-block { border-color: #fbcfe8; background: #fdf2f8; }
        .print-theme-editorial .a4-frame .corner, .print-theme-editorial .a5-frame .corner { border-color: #831843; }

        .print-theme-botanical { background: #f6f8f5; color: #3b0a24; }
        .print-theme-botanical .a4-top, .print-theme-botanical .a5-top { border-bottom-color: #9d174d; }
        .print-theme-botanical .a5-cta, .print-theme-botanical .a4-kicker, .print-theme-botanical .a4-qr-prompt, .print-theme-botanical .a4-qr-link, .print-theme-botanical .a4-card-num { color: #9d174d; }
        .print-theme-botanical .a4-slogan-box { border-left-color: #9d174d; background: #f0fdf4; border-radius: 2.5mm; }
        .print-theme-botanical .a4-card, .print-theme-botanical .a5-right, .print-theme-botanical .a4-qr-block { border-color: #fbcfe8; background: #f0fdf4; }
        .print-theme-botanical .a4-frame .corner, .print-theme-botanical .a5-frame .corner { border-color: #9d174d; }

        .print-theme-craft { background: #f6f0e6; color: #292524; }
        .print-theme-craft .a4-top, .print-theme-craft .a5-top { border-bottom-color: #574e44; }
        .print-theme-craft .a5-cta, .print-theme-craft .a4-kicker, .print-theme-craft .a4-qr-prompt, .print-theme-craft .a4-qr-link, .print-theme-craft .a4-card-num { color: #991b1b; }
        .print-theme-craft .a4-slogan-box { border-left-color: #991b1b; background: #ede4d4; }
        .print-theme-craft .a4-card { border-style: dashed; border-color: #a89a85; background: #faf5ec; }
        .print-theme-craft .a5-right, .print-theme-craft .a4-qr-block { border-color: #574e44; background: #ede4d4; }
        .print-theme-craft .a4-frame .corner, .print-theme-craft .a5-frame .corner { border-color: #991b1b; }

        .print-theme-gallery { background: #ffffff; color: #09090b; }
        .print-theme-gallery .a4-top, .print-theme-gallery .a5-top { border-bottom-width: 0.6mm; border-bottom-color: #09090b; }
        .print-theme-gallery .a5-cta, .print-theme-gallery .a4-kicker, .print-theme-gallery .a4-qr-prompt, .print-theme-gallery .a4-qr-link, .print-theme-gallery .a4-card-num { color: #09090b; font-weight: 900; }
        .print-theme-gallery .a4-slogan-box { border-left-color: #09090b; background: #f4f4f5; border-radius: 0; }
        .print-theme-gallery .a4-card, .print-theme-gallery .a5-right, .print-theme-gallery .a4-qr-block { border-radius: 0; border-color: #09090b; background: #f4f4f5; }
        .print-theme-gallery .a4-frame .corner, .print-theme-gallery .a5-frame .corner { border-color: #09090b; }

        .print-theme-kids { background: #fffbf5; color: #1e293b; }
        .print-theme-kids .a4-top, .print-theme-kids .a5-top { border-bottom-color: #ea580c; }
        .print-theme-kids .a5-cta, .print-theme-kids .a4-kicker, .print-theme-kids .a4-qr-prompt, .print-theme-kids .a4-qr-link, .print-theme-kids .a4-card-num { color: #ea580c; }
        .print-theme-kids .a4-slogan-box { border-left-color: #ea580c; background: #fff7ed; border-radius: 3mm; }
        .print-theme-kids .a4-card, .print-theme-kids .a5-right, .print-theme-kids .a4-qr-block { border-radius: 3.5mm; border-color: #fed7aa; background: #fff7ed; }
        .print-theme-kids .a4-card:nth-child(2) { background: #f0f9ff; border-color: #bae6fd; }
        .print-theme-kids .a4-card:nth-child(3) { background: #f0fdf4; border-color: #fbcfe8; }
        .print-theme-kids .a4-frame .corner, .print-theme-kids .a5-frame .corner { border-color: #ea580c; }

        .print-theme-neo, .print-theme-cyber { background: #ffffff; color: #0f172a; }
        .print-theme-neo .a4-top, .print-theme-neo .a5-top,
        .print-theme-cyber .a4-top, .print-theme-cyber .a5-top { border-bottom-color: #2563eb; }
        .print-theme-neo .a4-name, .print-theme-neo .a5-name, .print-theme-neo .bm-title,
        .print-theme-cyber .a4-name, .print-theme-cyber .a5-name, .print-theme-cyber .bm-title { color: #0f172a; }
        .print-theme-neo .a5-cta, .print-theme-neo .a4-kicker, .print-theme-neo .a4-qr-prompt, .print-theme-neo .a4-qr-link, .print-theme-neo .a4-card-num,
        .print-theme-cyber .a5-cta, .print-theme-cyber .a4-kicker, .print-theme-cyber .a4-qr-prompt, .print-theme-cyber .a4-qr-link, .print-theme-cyber .a4-card-num { color: #2563eb; }
        .print-theme-neo .a4-slogan-box,
        .print-theme-cyber .a4-slogan-box { border-left-color: #2563eb; background: #f0f9ff; color: #0f172a; }
        .print-theme-neo .a4-card, .print-theme-neo .a5-right, .print-theme-neo .a4-qr-block,
        .print-theme-cyber .a4-card, .print-theme-cyber .a5-right, .print-theme-cyber .a4-qr-block { border-color: #bae6fd; background: #f8fafc; }
        .print-theme-neo .a4-card-title, .print-theme-neo .a4-qr-heading,
        .print-theme-cyber .a4-card-title, .print-theme-cyber .a4-qr-heading { color: #0f172a; }
        .print-theme-neo .a4-card-desc, .print-theme-neo .a4-qr-sub,
        .print-theme-cyber .a4-card-desc, .print-theme-cyber .a4-qr-sub { color: #475569; }
        .print-theme-neo .a4-frame .corner, .print-theme-neo .a5-frame .corner,
        .print-theme-cyber .a4-frame .corner, .print-theme-cyber .a5-frame .corner { border-color: #2563eb; }
        .print-theme-neo .a4-foot-val, .print-theme-neo .a5-foot-item, .print-theme-neo .a5-list,
        .print-theme-cyber .a4-foot-val, .print-theme-cyber .a5-foot-item, .print-theme-cyber .a5-list { color: #334155; }
        .print-theme-neo .bm-item,
        .print-theme-cyber .bm-item { background: #ffffff; border-color: #bfdbfe; }
        .print-theme-neo .bm-quote,
        .print-theme-cyber .bm-quote { background: #f0f9ff; color: #1e293b; border-left-color: #2563eb; }
        .print-theme-neo .bm-foot,
        .print-theme-cyber .bm-foot { border-top-color: #cbd5e1; color: #64748b; }

        .print-theme-poetry, .print-theme-midnight { background: #ffffff; color: #1e1b4b; }
        .print-theme-poetry .a4-top, .print-theme-poetry .a5-top,
        .print-theme-midnight .a4-top, .print-theme-midnight .a5-top { border-bottom-color: #be185d; }
        .print-theme-poetry .a4-name, .print-theme-poetry .a5-name, .print-theme-poetry .bm-title,
        .print-theme-midnight .a4-name, .print-theme-midnight .a5-name, .print-theme-midnight .bm-title { color: #1e1b4b; }
        .print-theme-poetry .a5-cta, .print-theme-poetry .a4-kicker, .print-theme-poetry .a4-qr-prompt, .print-theme-poetry .a4-qr-link, .print-theme-poetry .a4-card-num,
        .print-theme-midnight .a5-cta, .print-theme-midnight .a4-kicker, .print-theme-midnight .a4-qr-prompt, .print-theme-midnight .a4-qr-link, .print-theme-midnight .a4-card-num { color: #be185d; }
        .print-theme-poetry .a4-slogan-box,
        .print-theme-midnight .a4-slogan-box { border-left-color: #be185d; background: #fdf2f8; color: #1e1b4b; }
        .print-theme-poetry .a4-card, .print-theme-poetry .a5-right, .print-theme-poetry .a4-qr-block,
        .print-theme-midnight .a4-card, .print-theme-midnight .a5-right, .print-theme-midnight .a4-qr-block { border-color: #fbcfe8; background: #fdf4ff; }
        .print-theme-poetry .a4-card-title, .print-theme-poetry .a4-qr-heading,
        .print-theme-midnight .a4-card-title, .print-theme-midnight .a4-qr-heading { color: #1e1b4b; }
        .print-theme-poetry .a4-card-desc, .print-theme-poetry .a4-qr-sub,
        .print-theme-midnight .a4-card-desc, .print-theme-midnight .a4-qr-sub { color: #475569; }
        .print-theme-poetry .a4-frame .corner, .print-theme-poetry .a5-frame .corner,
        .print-theme-midnight .a4-frame .corner, .print-theme-midnight .a5-frame .corner { border-color: #be185d; }
        .print-theme-poetry .a4-foot-val, .print-theme-poetry .a5-foot-item, .print-theme-poetry .a5-list,
        .print-theme-midnight .a4-foot-val, .print-theme-midnight .a5-foot-item, .print-theme-midnight .a5-list { color: #334155; }
        .print-theme-poetry .bm-item,
        .print-theme-midnight .bm-item { background: #ffffff; border-color: #fbcfe8; }
        .print-theme-poetry .bm-quote,
        .print-theme-midnight .bm-quote { background: #fdf2f8; color: #1e1b4b; border-left-color: #be185d; }
        .print-theme-poetry .bm-foot,
        .print-theme-midnight .bm-foot { border-top-color: #cbd5e1; color: #64748b; }

        .print-theme-bauhaus .bm-item { border-radius: 0; }
        .print-theme-gallery .bm-item { border-radius: 0; border: 0.45mm solid #09090b; }
        .print-theme-scandi .bm-item { border-radius: 4mm; }
        .print-theme-kids .bm-item { border-radius: 4.5mm; }
        .print-theme-botanical .bm-item { border-radius: 3.5mm; }
        .print-theme-craft .bm-item { border-radius: 2mm; background: #faf5ec; }
    `;

    if (format === 'bookmark') {
        const slogans = getBookmarkSlogans(slogan);
        const targetUrl = (branch.vkLink && branch.vkLink.trim()) || branch.branch_url || 'https://biblioteka33.ru';
        const qrSvg = createQrSvg(targetUrl, { size: 120, foreground: qrFg, background: qrBg, margin: 4 });
        const bThemes = template.bookmarkThemes;

        const scale = typeof bookmarkScale === 'number' && bookmarkScale > 0 ? bookmarkScale : 1.25;
        const baseWidthMm = Math.round((282 / scale) * 10) / 10;
        const baseMaxItemWidthMm = Math.round((66 / scale) * 10) / 10;

        pageCss = `
            @page {
                size: A4 landscape;
                margin: 4mm 5mm 4mm 5mm;
            }
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                background: #ffffff !important;
                color: #0a0f1d;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 0;
            }
            .print-guide-banner {
                width: 100%;
                max-width: 960px;
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 8px 14px;
                margin: 6px auto 10px;
                font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 12px;
                line-height: 1.45;
                color: #1e3a8a;
                box-sizing: border-box;
                text-align: center;
                box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
            }
            .print-guide-banner strong {
                color: #1d4ed8;
            }
            @media print {
                .print-guide-banner {
                    display: none !important;
                }
            }
            .print-sheet-bookmarks-wrapper {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0 auto;
            }
            .print-sheet-bookmarks {
                zoom: ${scale};
                transform-origin: top center;
                display: flex;
                align-items: stretch;
                justify-content: space-between;
                width: 100%;
                max-width: ${baseWidthMm}mm;
                box-sizing: border-box;
                page-break-inside: avoid;
                break-inside: avoid;
                background: #ffffff !important;
            }
            @supports not (zoom: 1) {
                .print-sheet-bookmarks {
                    transform: scale(${scale});
                    transform-origin: top center;
                }
            }
            .bm-item {
                flex: 1;
                min-width: 0;
                max-width: ${baseMaxItemWidthMm}mm;
                border: 1px solid #cbd5e1;
                border-radius: 3mm;
                padding: 5mm 4mm 4mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                box-sizing: border-box;
                background: #ffffff !important;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .bm-tag {
                font-size: 7.5pt;
                font-weight: 800;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                padding: 1.6mm 4mm;
                border-radius: 3mm;
                margin-bottom: 2mm;
                color: #ffffff;
                line-height: 1;
                flex-shrink: 0;
            }
            .bm-civic {
                font-size: 6.8pt;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: ${template.dark ? '#94a3b8' : '#64748b'};
                margin-bottom: 2mm;
                line-height: 1.25;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                width: 100%;
            }
            .bm-civic .bm-civic-org {
                display: block;
                line-height: 1.2;
            }
            .bm-civic .bm-city-line {
                display: inline-block;
                white-space: nowrap !important;
                word-break: keep-all !important;
                line-height: 1.2;
                margin-top: 0.3mm;
            }
            .bm-title {
                font-size: 9.5pt;
                font-weight: 800;
                color: ${template.dark ? '#ffffff' : '#0a0f1d'};
                line-height: 1.25;
                margin-bottom: 2.2mm;
                flex-shrink: 0;
            }
            .bm-quote {
                font-size: 7.5pt;
                font-style: italic;
                color: ${template.dark ? '#e2e8f0' : '#334155'};
                line-height: 1.35;
                padding: 2.2mm 2.8mm;
                background: ${template.dark ? '#0b1120' : '#f8fafc'};
                border-left-width: 1.2mm;
                border-left-style: solid;
                border-radius: 0 1.5mm 1.5mm 0;
                margin-bottom: 2.2mm;
                width: 100%;
                box-sizing: border-box;
                flex-shrink: 0;
            }
            .bm-qr-box {
                margin: 1.5mm 0 1.8mm;
                flex-shrink: 0;
            }
            .bm-frame {
                position: relative;
                padding: 2mm;
                background: #ffffff;
                display: inline-flex;
            }
            .bm-frame .corner {
                position: absolute;
                width: 3mm;
                height: 3mm;
                border-style: solid;
            }
            .bm-frame .corner-tl { top: 0; left: 0; border-width: 0.6mm 0 0 0.6mm; }
            .bm-frame .corner-tr { top: 0; right: 0; border-width: 0.6mm 0.6mm 0 0; }
            .bm-frame .corner-bl { bottom: 0; left: 0; border-width: 0 0 0.6mm 0.6mm; }
            .bm-frame .corner-br { bottom: 0; right: 0; border-width: 0 0.6mm 0.6mm 0; }
            .bm-frame svg {
                width: 34mm;
                height: 34mm;
                display: block;
            }
            .bm-scan-cue {
                font-size: 6.2pt;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: ${template.dark ? '#94a3b8' : '#64748b'};
                margin-top: 1mm;
                margin-bottom: 1mm;
                flex-shrink: 0;
            }
            .bm-link {
                font-family: 'JetBrains Mono', monospace;
                font-size: 7.5pt;
                font-weight: 700;
                margin-bottom: 1.5mm;
                word-break: break-all;
                flex-shrink: 0;
            }
            .bm-chips {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 1.2mm;
                margin-top: 0.8mm;
                margin-bottom: 2mm;
                width: 100%;
                flex-shrink: 0;
            }
            .bm-chip {
                font-size: 5.6pt;
                font-weight: 700;
                padding: 0.8mm 2mm;
                border-radius: 2mm;
                background: ${template.dark ? '#1e293b' : '#f1f5f9'};
                color: ${template.dark ? '#cbd5e1' : '#475569'};
                border: 0.25mm solid ${template.dark ? '#334155' : '#e2e8f0'};
                letter-spacing: 0.02em;
                line-height: 1.2;
            }
            .bm-foot {
                font-size: 6.5pt;
                color: ${template.dark ? '#94a3b8' : '#64748b'};
                margin-top: 1mm;
                padding-top: 2.2mm;
                border-top: 0.35mm solid #cbd5e1;
                width: 100%;
                line-height: 1.3;
                white-space: normal;
                word-break: break-word;
                text-align: center;
                flex-shrink: 0;
            }
            .bm-foot-item {
                white-space: normal;
                word-break: break-word;
                margin-bottom: 0.8mm;
            }
            .bm-foot-portal {
                font-family: 'JetBrains Mono', monospace;
                font-weight: 700;
                font-size: 6.8pt;
                color: ${template.dark ? '#38bdf8' : '#1d4ed8'};
                margin-top: 1mm;
                white-space: normal;
                word-break: break-all;
                text-align: center;
            }
            .bm-cut {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                width: 5mm;
                flex-shrink: 0;
                color: #64748b !important;
                background: #ffffff !important;
                user-select: none;
                padding: 3mm 0;
            }
            .cut-ico {
                font-size: 10pt;
                line-height: 1;
                transform: rotate(90deg);
                color: #64748b !important;
            }
            .cut-line {
                flex: 1;
                width: 0;
                border-left: 0.35mm dashed #cbd5e1 !important;
                margin: 3mm 0;
            }
            ${themePrintRules}
        `;

        bodyContent = `
            <div class="print-guide-banner">
                🔖 <strong>Параметры печати закладок (А4 Альбомная):</strong>
                В макет закладок по умолчанию встроен пользовательский масштаб <strong>${Math.round(scale * 100)}%</strong>. В окне печати браузера выберите: Ориентация: <strong>«Альбомная»</strong>, Масштаб: <strong>«По умолчанию (100%)»</strong>, Поля: <strong>«Минимум» или «По умолчанию»</strong>.
            </div>
            <div class="print-sheet-bookmarks-wrapper">
                <div class="print-sheet-bookmarks print-theme-${template.id}">
                    ${bThemes.map((theme, idx) => `
                        ${idx > 0 ? `
                            <div class="bm-cut">
                                <span class="cut-ico">✂</span>
                                <span class="cut-line"></span>
                                <span class="cut-ico">✂</span>
                            </div>
                        ` : ''}
                        <div class="bm-item" style="border-color: ${theme.accentBorder};">
                            <div class="bm-tag" style="background: ${theme.tagBg}; color: ${theme.tagColor};">
                                КНИЖНАЯ ЗАКЛАДКА
                            </div>
                            <div class="bm-civic">
                                <span class="bm-civic-org">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ</span>
                                <span class="bm-city-line">Г.&nbsp;ВЛАДИМИРА</span>
                            </div>
                            <div class="bm-title">
                                ${escapeHtml(branch.canonicalName)}
                            </div>
                            <div class="bm-quote" style="border-left-color: ${theme.accent};">
                                «${escapeHtml(slogans[idx])}»
                            </div>
                            <div class="bm-qr-box">
                                <div class="bm-frame" style="border-color: ${theme.accent};">
                                    <span class="corner corner-tl" style="border-color: ${theme.accent};"></span>
                                    <span class="corner corner-tr" style="border-color: ${theme.accent};"></span>
                                    <span class="corner corner-bl" style="border-color: ${theme.accent};"></span>
                                    <span class="corner corner-br" style="border-color: ${theme.accent};"></span>
                                    ${qrSvg}
                                </div>
                            </div>
                            <div class="bm-scan-cue">НАВЕДИТЕ КАМЕРУ</div>
                            <div class="bm-link" style="color: ${theme.accent};">${escapeHtml(displayUrl)}</div>
                            <div class="bm-chips">
                                <span class="bm-chip">Продление книг онлайн</span>
                                <span class="bm-chip">Афиша событий</span>
                            </div>
                            <div class="bm-foot">
                                <div class="bm-foot-item">${escapeHtml(branch.address)}</div>
                                <div class="bm-foot-item">тел. ${escapeHtml(branch.phone)}</div>
                                <div class="bm-foot-portal">https://biblioteka33.ru</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (format === 'a5') {
        const targetUrl = (branch.vkLink && branch.vkLink.trim()) || branch.branch_url || 'https://biblioteka33.ru';
        const qrSvgA5 = createQrSvg(targetUrl, { size: 140, foreground: qrFg, background: qrBg, margin: 4 });

        pageCss = `
            @page { size: A5 landscape; margin: 9mm 12mm 9mm 12mm; }
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                background: #ffffff !important;
                color: #0a0f1d;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .print-a5-container {
                height: 100%;
                max-height: 130mm;
                width: 100%;
                max-width: 186mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                padding: 3.5mm 4.5mm;
                border: 0.4mm solid #cbd5e1;
                border-radius: 3mm;
                background: #ffffff !important;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .a5-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 0.5mm solid #0f172a;
                padding-bottom: 2.5mm;
            }
            .a5-civic {
                font-size: 8pt;
                font-weight: 800;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: ${template.dark ? '#f8fafc' : '#0f172a'};
            }
            .a5-place {
                font-family: 'JetBrains Mono', monospace;
                font-size: 8pt;
                font-weight: 600;
                color: ${template.dark ? '#38bdf8' : '#475569'};
            }
            .a5-cols {
                display: flex;
                align-items: center;
                gap: 8mm;
                margin: 4mm 0;
                flex: 1;
            }
            .a5-left {
                flex: 1.4;
                text-align: left;
            }
            .a5-name {
                font-size: 16pt;
                font-weight: 800;
                line-height: 1.18;
                color: ${template.dark ? '#ffffff' : '#0a0f1d'};
                margin: 0 0 3mm 0;
            }
            .a5-cta {
                font-size: 11pt;
                font-weight: 800;
                color: #1d4ed8;
                line-height: 1.25;
                margin-bottom: 2mm;
            }
            .a5-quote {
                font-size: 9pt;
                font-style: italic;
                color: ${template.dark ? '#94a3b8' : '#475569'};
                line-height: 1.35;
                margin-bottom: 3.5mm;
            }
            .a5-list {
                list-style: none;
                padding: 0;
                margin: 0;
                font-size: 8.5pt;
                color: ${template.dark ? '#cbd5e1' : '#334155'};
            }
            .a5-list li {
                margin-bottom: 1.5mm;
                display: flex;
                align-items: center;
                gap: 2mm;
            }
            .a5-check {
                color: #9d174d;
                font-weight: 800;
            }
            .a5-right {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                background: ${template.dark ? '#131d33' : '#f8fafc'};
                border: 0.4mm solid #0f172a;
                border-radius: 3mm;
                padding: 4mm 3mm;
            }
            .a5-frame {
                position: relative;
                padding: 2.5mm;
                background: #ffffff;
                display: inline-flex;
            }
            .a5-frame .corner {
                position: absolute;
                width: 3.5mm;
                height: 3.5mm;
                border-color: #0f172a;
                border-style: solid;
            }
            .a5-frame .corner-tl { top: 0; left: 0; border-width: 0.6mm 0 0 0.6mm; }
            .a5-frame .corner-tr { top: 0; right: 0; border-width: 0.6mm 0.6mm 0 0; }
            .a5-frame .corner-bl { bottom: 0; left: 0; border-width: 0 0 0.6mm 0.6mm; }
            .a5-frame .corner-br { bottom: 0; right: 0; border-width: 0 0.6mm 0.6mm 0; }
            .a5-frame svg {
                width: 34mm;
                height: 34mm;
                display: block;
            }
            .a5-scan-tag {
                font-size: 7.5pt;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: #1d4ed8;
                margin-top: 2.5mm;
            }
            .a5-url {
                font-family: 'JetBrains Mono', monospace;
                font-size: 8.5pt;
                font-weight: 700;
                color: ${template.dark ? '#38bdf8' : '#0f172a'};
                margin-top: 1mm;
            }
            .a5-foot {
                display: flex;
                justify-content: space-between;
                border-top: 0.3mm solid #cbd5e1;
                padding-top: 2.5mm;
                font-size: 8pt;
                color: ${template.dark ? '#94a3b8' : '#475569'};
            }
            .a5-foot-item b {
                color: ${template.dark ? '#ffffff' : '#0a0f1d'};
            }
            ${themePrintRules}
        `;

        bodyContent = `
            <div class="print-a5-container print-theme-${template.id}">
                <header class="a5-top">
                    <span class="a5-civic">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                    <span class="a5-place">https://biblioteka33.ru</span>
                </header>

                <div class="a5-cols">
                    <div class="a5-left">
                        <h1 class="a5-name">${escapeHtml(branch.canonicalName)}</h1>
                        <div class="a5-cta">Все события, новинки литературы и продление книг онлайн</div>
                        <div class="a5-quote">«${escapeHtml(slogan)}»</div>

                        <ul class="a5-list">
                            <li><span class="a5-check">✓</span> <span>Быстрое и удобное продление книг онлайн</span></li>
                            <li><span class="a5-check">✓</span> <span>Анонсы бесплатных лекций, мастер-классов и клубов</span></li>
                            <li><span class="a5-check">✓</span> <span>Прямой диалог с библиотекарем в сообщениях группы</span></li>
                        </ul>
                    </div>

                    <div class="a5-right">
                        <div class="a5-frame">
                            <span class="corner corner-tl"></span>
                            <span class="corner corner-tr"></span>
                            <span class="corner corner-bl"></span>
                            <span class="corner corner-br"></span>
                            ${qrSvgA5}
                        </div>
                        <div class="a5-scan-tag">НАВЕДИТЕ КАМЕРУ СМАРТФОНА</div>
                        <div class="a5-url">${escapeHtml(displayUrl)}</div>
                    </div>
                </div>

                <footer class="a5-foot">
                    <div class="a5-foot-item"><b>Адрес:</b> ${escapeHtml(branch.address)}</div>
                    <div class="a5-foot-item"><b>Телефон:</b> ${escapeHtml(branch.phone)}</div>
                    <div class="a5-foot-item"><b>Портал:</b> https://biblioteka33.ru</div>
                </footer>
            </div>
        `;
    } else if (format === 'shelf') {
        const shelfUrl = getShelfUrl(branch, shelfGenre);
        const genreObj = SHELF_GENRES.find(g => g.id === shelfGenre) || SHELF_GENRES[0];
        const qrSvgShelf = createQrSvg(shelfUrl, { size: 90, foreground: qrFg, background: qrBg, margin: 2 });

        pageCss = `
            @page {
                size: A4 portrait;
                margin: 6mm 8mm 6mm 8mm;
            }
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                background: #ffffff !important;
                color: #0a0f1d;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                box-sizing: border-box;
                padding: 0;
            }
            .print-shelf-container {
                width: 100%;
                max-width: 194mm;
                height: 282mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .print-shelf-card {
                height: 87mm;
                border: 0.4mm solid #cbd5e1;
                border-radius: 3mm;
                padding: 3.5mm 5mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                background: #ffffff !important;
                position: relative;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .print-shelf-fold {
                border-bottom: 0.3mm dashed #94a3b8;
                font-family: 'JetBrains Mono', monospace;
                font-size: 6pt;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1mm 2mm;
                margin-bottom: 2mm;
                background: #f8fafc;
                border-radius: 1mm 1mm 0 0;
            }
            .print-fold-cue {
                color: #0284c7;
                font-weight: 700;
            }
            .print-fold-portal {
                color: #94a3b8;
                font-weight: 600;
            }
            .print-shelf-front {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 4.5mm;
                flex: 1;
                padding: 0 1mm;
            }
            .print-shelf-main {
                flex: 1;
                text-align: left;
                min-width: 0;
            }
            .print-shelf-badges {
                display: flex;
                align-items: center;
                gap: 2.5mm;
                margin-bottom: 2mm;
            }
            .print-shelf-badge-cosmo {
                font-size: 7.5pt;
                font-weight: 800;
                background: #0284c7;
                color: #ffffff;
                padding: 1mm 2.5mm;
                border-radius: 1.5mm;
                letter-spacing: 0.04em;
                display: inline-flex;
                align-items: center;
                gap: 1.5mm;
            }
            .print-cosmo-mini-avatar {
                width: 3.8mm;
                height: 3.8mm;
                object-fit: contain;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.25);
            }
            .print-shelf-badge-genre {
                font-size: 7pt;
                font-weight: 700;
                background: #f8fafc;
                color: #0f172a;
                border: 0.25mm solid #cbd5e1;
                padding: 1mm 2.5mm;
                border-radius: 1.5mm;
                display: inline-block;
            }
            .print-shelf-title {
                font-size: 11pt;
                font-weight: 900;
                line-height: 1.25;
                color: #0f172a;
                margin: 0 0 1.5mm 0;
                letter-spacing: -0.01em;
            }
            .print-shelf-sub {
                font-size: 7.5pt;
                line-height: 1.35;
                color: #334155;
                margin: 0 0 2.5mm 0;
            }
            .print-shelf-steps {
                display: flex;
                align-items: center;
                gap: 2mm;
                font-size: 6.5pt;
                margin-bottom: 2mm;
                flex-wrap: wrap;
            }
            .print-shelf-step {
                display: inline-flex;
                align-items: center;
                gap: 1mm;
                background: #f0f9ff;
                border: 0.25mm solid #bae6fd;
                color: #0369a1;
                padding: 0.6mm 1.8mm;
                border-radius: 1mm;
                font-weight: 700;
            }
            .print-shelf-step-num {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 3mm;
                height: 3mm;
                background: #0284c7;
                color: #ffffff;
                border-radius: 50%;
                font-size: 5pt;
                font-weight: 800;
            }
            .print-shelf-step-arrow {
                color: #94a3b8;
                font-size: 6.5pt;
                font-weight: bold;
            }
            .print-shelf-branch {
                font-size: 6.5pt;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .print-shelf-qr-box {
                width: 28mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                flex-shrink: 0;
            }
            .print-shelf-qr-frame {
                width: 25mm;
                height: 25mm;
                padding: 1mm;
                border: 0.3mm solid #cbd5e1;
                border-radius: 1.5mm;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #ffffff;
                box-shadow: 0 0.5mm 2mm rgba(0,0,0,0.05);
            }
            .print-shelf-qr-frame svg {
                width: 23mm;
                height: 23mm;
                display: block;
            }
            .print-shelf-qr-cue {
                font-size: 6pt;
                font-weight: 800;
                color: #0284c7;
                margin-top: 1mm;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }
            .print-shelf-qr-sub {
                font-size: 5pt;
                color: #64748b;
                margin-top: 0.3mm;
            }
            .print-shelf-cut-guide {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2mm;
                font-size: 6.5pt;
                color: #94a3b8;
                height: 4mm;
                user-select: none;
            }
            .print-shelf-cut-line {
                flex: 1;
                border-top: 0.3mm dashed #cbd5e1;
                height: 0;
            }
            .print-shelf-cut-badge {
                display: inline-flex;
                align-items: center;
                gap: 1mm;
                background: #f8fafc;
                border: 0.25mm dashed #cbd5e1;
                border-radius: 1mm;
                padding: 0.5mm 2mm;
                color: #64748b;
                font-weight: 700;
            }

            /* Print Theme Overrides for Shelf Table-Tents */
            .print-theme-swiss .print-shelf-badge-cosmo { background: #1d4ed8; }
            .print-theme-swiss .print-shelf-step { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
            .print-theme-swiss .print-shelf-step-num { background: #1d4ed8; }
            .print-theme-swiss .print-shelf-qr-cue { color: #1d4ed8; }
            .print-theme-swiss .print-fold-cue { color: #1d4ed8; }

            .print-theme-bauhaus .print-shelf-badge-cosmo { background: #c2410c; border-radius: 0; }
            .print-theme-bauhaus .print-shelf-badge-genre { border-radius: 0; border-color: #fed7aa; background: #fff7ed; color: #111827; }
            .print-theme-bauhaus .print-shelf-step { background: #fff7ed; border-color: #fed7aa; color: #c2410c; border-radius: 0; }
            .print-theme-bauhaus .print-shelf-step-num { background: #c2410c; border-radius: 0; }
            .print-theme-bauhaus .print-shelf-qr-cue { color: #c2410c; }
            .print-theme-bauhaus .print-shelf-card { border-radius: 0; border-color: #111827; }
            .print-theme-bauhaus .print-shelf-qr-frame { border-radius: 0; border-color: #c2410c; }
            .print-theme-bauhaus .print-fold-cue { color: #c2410c; }

            .print-theme-scandi .print-shelf-badge-cosmo { background: #0f766e; }
            .print-theme-scandi .print-shelf-step { background: #f0fdfa; border-color: #ccfbf1; color: #0f766e; }
            .print-theme-scandi .print-shelf-step-num { background: #0f766e; }
            .print-theme-scandi .print-shelf-qr-cue { color: #0f766e; }
            .print-theme-scandi .print-fold-cue { color: #0f766e; }

            .print-theme-editorial .print-shelf-title { font-family: Georgia, serif; }
            .print-theme-editorial .print-shelf-badge-cosmo { background: #831843; font-family: Georgia, serif; }
            .print-theme-editorial .print-shelf-step { background: #fdf2f8; border-color: #fbcfe8; color: #831843; }
            .print-theme-editorial .print-shelf-step-num { background: #831843; }
            .print-theme-editorial .print-shelf-qr-cue { color: #831843; }
            .print-theme-editorial .print-fold-cue { color: #831843; }

            .print-theme-botanical .print-shelf-badge-cosmo { background: #15803d; }
            .print-theme-botanical .print-shelf-step { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
            .print-theme-botanical .print-shelf-step-num { background: #15803d; }
            .print-theme-botanical .print-shelf-qr-cue { color: #15803d; }
            .print-theme-botanical .print-fold-cue { color: #15803d; }

            .print-theme-craft .print-shelf-card { background: #faf5ec !important; border-color: #d6cbba; }
            .print-theme-craft .print-shelf-fold { background: #f4ecdf; }
            .print-theme-craft .print-shelf-badge-cosmo { background: #991b1b; }
            .print-theme-craft .print-shelf-step { background: #f5ede0; border-color: #e6dac6; color: #991b1b; }
            .print-theme-craft .print-shelf-step-num { background: #991b1b; }
            .print-theme-craft .print-shelf-qr-cue { color: #991b1b; }
            .print-theme-craft .print-fold-cue { color: #991b1b; }

            .print-theme-kids .print-shelf-badge-cosmo { background: #ea580c; border-radius: 3mm; }
            .print-theme-kids .print-shelf-card { border-radius: 4mm; border-color: #fed7aa; }
            .print-theme-kids .print-shelf-step { border-radius: 2mm; background: #fff7ed; color: #c2410c; }
            .print-theme-kids .print-shelf-step-num { background: #ea580c; }
            .print-theme-kids .print-shelf-qr-cue { color: #ea580c; }
            .print-theme-kids .print-fold-cue { color: #ea580c; }

            .print-theme-neo .print-shelf-badge-cosmo { background: #2563eb; }
            .print-theme-neo .print-shelf-step { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
            .print-theme-neo .print-shelf-step-num { background: #2563eb; }
            .print-theme-neo .print-shelf-qr-cue { color: #2563eb; }
            .print-theme-neo .print-fold-cue { color: #2563eb; }

            .print-theme-poetry .print-shelf-badge-cosmo { background: #be185d; }
            .print-theme-poetry .print-shelf-step { background: #fdf2f8; border-color: #fbcfe8; color: #be185d; }
            .print-theme-poetry .print-shelf-step-num { background: #be185d; }
            .print-theme-poetry .print-shelf-qr-cue { color: #be185d; }
            .print-theme-poetry .print-fold-cue { color: #be185d; }
        `;

        const renderPrintTent = () => `
            <div class="print-shelf-card">
                <div class="print-shelf-fold">
                    <span class="print-fold-cue">⌃ ЛИНИЯ СГИБА ТЕЙБЛТЕНТА (ПОСТАВИТЬ НА ПОЛКУ ШАЛАШИКОМ) ⌃</span>
                    <span class="print-fold-portal">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                </div>
                <div class="print-shelf-front">
                    <div class="print-shelf-main">
                        <div class="print-shelf-badges">
                            <span class="print-shelf-badge-cosmo">
                                <img src="assets/images/mascot/robot_smile.png?v=4.24.2" class="print-cosmo-mini-avatar" alt="Космо" />
                                <span>КНИЖНАЯ ПОЛКА С КОСМО</span>
                            </span>
                            <span class="print-shelf-badge-genre">${escapeHtml(genreObj.name)}</span>
                        </div>
                        <h2 class="print-shelf-title">Не знаешь, что почитать? Наведи камеру — Космо подберёт книгу!</h2>
                        <p class="print-shelf-sub">Библиотечный робот Космо задаст 2 быстрых вопроса и моментально порекомендует ТОП-3 книги с этого стеллажа под твоё настроение и темп чтения.</p>
                        <div class="print-shelf-steps">
                            <span class="print-shelf-step"><span class="print-shelf-step-num">1</span> Сканируй QR</span>
                            <span class="print-shelf-step-arrow">→</span>
                            <span class="print-shelf-step"><span class="print-shelf-step-num">2</span> 2 вопроса от Космо</span>
                            <span class="print-shelf-step-arrow">→</span>
                            <span class="print-shelf-step"><span class="print-shelf-step-num">3</span> ТОП-3 книги на полке</span>
                        </div>
                        <div class="print-shelf-branch">🏛 ${escapeHtml(branch.canonicalName)}${branch.address ? ' &bull; ' + escapeHtml(branch.address) : ''}</div>
                    </div>
                    <div class="print-shelf-qr-box">
                        <div class="print-shelf-qr-frame">
                            ${qrSvgShelf}
                        </div>
                        <div class="print-shelf-qr-cue">ВЕБ-ЧАТ С КОСМО</div>
                        <div class="print-shelf-qr-sub">Без приложений &bull; С телефона</div>
                    </div>
                </div>
            </div>
        `;

        bodyContent = `
            <div class="print-shelf-container print-theme-${template.id}">
                ${renderPrintTent()}
                <div class="print-shelf-cut-guide">
                    <span class="print-shelf-cut-line"></span>
                    <span class="print-shelf-cut-badge">✂ ЛИНИЯ РЕЗА (3 МАКЕТА НА ЛИСТ А4)</span>
                    <span class="print-shelf-cut-line"></span>
                </div>
                ${renderPrintTent()}
                <div class="print-shelf-cut-guide">
                    <span class="print-shelf-cut-line"></span>
                    <span class="print-shelf-cut-badge">✂ ЛИНИЯ РЕЗА</span>
                    <span class="print-shelf-cut-line"></span>
                </div>
                ${renderPrintTent()}
            </div>
        `;
    } else {
        // Плакат А4
        const targetUrl = (branch.vkLink && branch.vkLink.trim()) || branch.branch_url || 'https://biblioteka33.ru';
        const qrSvgA4 = createQrSvg(targetUrl, { size: 170, foreground: qrFg, background: qrBg, margin: 4 });

        pageCss = `
            @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                background: #ffffff !important;
                color: #0a0f1d;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .print-a4-container {
                height: 275mm;
                max-height: 275mm;
                width: 186mm;
                max-width: 186mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                padding: 4.5mm 5.5mm;
                border: 0.4mm solid #cbd5e1;
                border-radius: 3mm;
                background: #ffffff !important;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .a4-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 0.6mm solid #0f172a;
                padding-bottom: 3mm;
            }
            .a4-civic {
                font-size: 9pt;
                font-weight: 800;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: ${template.dark ? '#f8fafc' : '#0f172a'};
            }
            .a4-portal {
                font-family: 'JetBrains Mono', monospace;
                font-size: 9pt;
                font-weight: 600;
                color: ${template.dark ? '#38bdf8' : '#475569'};
            }
            .a4-hero {
                text-align: center;
                margin: 4mm 0 5mm;
            }
            .a4-kicker {
                font-size: 8.5pt;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #64748b;
                margin-bottom: 2.5mm;
            }
            .a4-name {
                font-size: 24pt;
                font-weight: 900;
                line-height: 1.15;
                color: ${template.dark ? '#ffffff' : '#0a0f1d'};
                margin: 0 0 3.5mm 0;
                letter-spacing: -0.02em;
            }
            .a4-slogan-box {
                display: inline-block;
                padding: 2.5mm 6mm;
                background: ${template.dark ? '#131d33' : '#f8fafc'};
                border-left: 1.2mm solid #1d4ed8;
                border-radius: 0 2mm 2mm 0;
                font-size: 12.5pt;
                font-style: italic;
                font-weight: 600;
                color: ${template.dark ? '#e2e8f0' : '#1e293b'};
            }
            .a4-cards {
                display: flex;
                justify-content: space-between;
                gap: 4mm;
                margin: 4mm 0 6mm;
            }
            .a4-card {
                flex: 1;
                background: ${template.dark ? '#131d33' : '#f8fafc'};
                border: 0.35mm solid ${template.dark ? '#1e3a5f' : '#cbd5e1'};
                border-radius: 2.5mm;
                padding: 3.5mm 3mm;
                text-align: left;
            }
            .a4-card-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2mm;
            }
            .a4-card-num {
                font-family: 'JetBrains Mono', monospace;
                font-size: 8pt;
                font-weight: 700;
                color: #94a3b8;
            }
            .a4-card-ico {
                font-size: 13pt;
                line-height: 1;
            }
            .a4-card-title {
                font-size: 9.5pt;
                font-weight: 800;
                color: ${template.dark ? '#f8fafc' : '#0f172a'};
                margin: 0 0 1.5mm 0;
                line-height: 1.25;
            }
            .a4-card-desc {
                font-size: 8pt;
                color: ${template.dark ? '#94a3b8' : '#475569'};
                margin: 0;
                line-height: 1.35;
            }
            .a4-qr-block {
                display: flex;
                align-items: center;
                gap: 7mm;
                background: ${template.dark ? '#131d33' : '#f8fafc'};
                border: 0.5mm solid ${template.dark ? '#38bdf8' : '#0f172a'};
                border-radius: 3.5mm;
                padding: 5mm 6mm;
                margin: 2mm 0 5mm;
            }
            .a4-frame {
                position: relative;
                padding: 3mm;
                background: #ffffff;
                display: inline-flex;
                flex-shrink: 0;
            }
            .a4-frame .corner {
                position: absolute;
                width: 4mm;
                height: 4mm;
                border-color: #0f172a;
                border-style: solid;
            }
            .a4-frame .corner-tl { top: 0; left: 0; border-width: 0.7mm 0 0 0.7mm; }
            .a4-frame .corner-tr { top: 0; right: 0; border-width: 0.7mm 0.7mm 0 0; }
            .a4-frame .corner-bl { bottom: 0; left: 0; border-width: 0 0 0.7mm 0.7mm; }
            .a4-frame .corner-br { bottom: 0; right: 0; border-width: 0 0.7mm 0.7mm 0; }
            .a4-frame svg {
                width: 42mm;
                height: 42mm;
                display: block;
            }
            .a4-qr-info {
                text-align: left;
                flex: 1;
            }
            .a4-qr-prompt {
                font-size: 8.5pt;
                font-weight: 800;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #1d4ed8;
                margin-bottom: 1.5mm;
            }
            .a4-qr-heading {
                font-size: 15pt;
                font-weight: 900;
                color: ${template.dark ? '#f8fafc' : '#0a0f1d'};
                line-height: 1.2;
                margin-bottom: 1.5mm;
            }
            .a4-qr-sub {
                font-size: 9.5pt;
                color: ${template.dark ? '#94a3b8' : '#475569'};
                margin: 0 0 3mm 0;
                line-height: 1.35;
            }
            .a4-qr-link {
                display: inline-block;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11pt;
                font-weight: 700;
                color: #1d4ed8;
            }
            .a4-foot {
                display: flex;
                justify-content: space-between;
                border-top: 0.35mm solid #cbd5e1;
                padding-top: 3.5mm;
                text-align: left;
            }
            .a4-foot-col {
                flex: 1;
            }
            .a4-foot-col.col-wide {
                flex: 1.4;
            }
            .a4-foot-lbl {
                font-size: 6.8pt;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: #94a3b8;
                margin-bottom: 1mm;
                display: block;
            }
            .a4-foot-val {
                font-size: 8.8pt;
                font-weight: 600;
                color: ${template.dark ? '#cbd5e1' : '#334155'};
                line-height: 1.25;
                display: block;
            }
            ${themePrintRules}
        `;

        bodyContent = `
            <div class="print-a4-container print-theme-${template.id}">
                <header class="a4-top">
                    <span class="a4-civic">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                    <span class="a4-portal">https://biblioteka33.ru</span>
                </header>

                <div class="a4-hero">
                    <div class="a4-kicker">ГОРОДСКОЕ КУЛЬТУРНОЕ ПРОСТРАНСТВО</div>
                    <h1 class="a4-name">${escapeHtml(branch.canonicalName)}</h1>
                    <div class="a4-slogan-box">«${escapeHtml(slogan)}»</div>
                </div>

                <div class="a4-cards">
                    <div class="a4-card">
                        <div class="a4-card-head">
                            <span class="a4-card-num">01</span>
                            <span class="a4-card-ico">📖</span>
                        </div>
                        <div class="a4-card-title">Книжный фонд И Новинки</div>
                        <p class="a4-card-desc">Актуальные бестселлеры, классика, периодика и редкие краеведческие издания</p>
                    </div>
                    <div class="a4-card">
                        <div class="a4-card-head">
                            <span class="a4-card-num">02</span>
                            <span class="a4-card-ico">🎨</span>
                        </div>
                        <div class="a4-card-title">Мастер-классы И Клубы</div>
                        <p class="a4-card-desc">Интеллектуальные лектории, выставки, творческие встречи и клубы по интересам</p>
                    </div>
                    <div class="a4-card">
                        <div class="a4-card-head">
                            <span class="a4-card-num">03</span>
                            <span class="a4-card-ico">📸</span>
                        </div>
                        <div class="a4-card-title">Анонсы событий И Фото</div>
                        <p class="a4-card-desc">Афиша мероприятий, продление изданий онлайн и яркие фотоотчёты встреч</p>
                    </div>
                </div>

                <div class="a4-qr-block">
                    <div class="a4-frame">
                        <span class="corner corner-tl"></span>
                        <span class="corner corner-tr"></span>
                        <span class="corner corner-bl"></span>
                        <span class="corner corner-br"></span>
                        ${qrSvgA4}
                    </div>
                    <div class="a4-qr-info">
                        <div class="a4-qr-prompt">НАВЕДИТЕ КАМЕРУ СМАРТФОНА</div>
                        <div class="a4-qr-heading">Официальное сообщество ВКонтакте</div>
                        <p class="a4-qr-sub">Свежие анонсы событий, продление книг онлайн, отзывы и диалог с библиотекой</p>
                        <div class="a4-qr-link">${escapeHtml(displayUrl)}</div>
                    </div>
                </div>

                <footer class="a4-foot">
                    <div class="a4-foot-col col-wide">
                        <span class="a4-foot-lbl">АДРЕС БИБЛИОТЕКИ</span>
                        <span class="a4-foot-val">${escapeHtml(branch.address)}</span>
                    </div>
                    <div class="a4-foot-col">
                        <span class="a4-foot-lbl">ТЕЛЕФОН ДЛЯ СПРАВОК</span>
                        <span class="a4-foot-val">${escapeHtml(branch.phone)}</span>
                    </div>
                    <div class="a4-foot-col">
                        <span class="a4-foot-lbl">ОФИЦИАЛЬНЫЙ САЙТ</span>
                        <span class="a4-foot-val">https://biblioteka33.ru</span>
                    </div>
                </footer>
            </div>
        `;
    }

    printWin.document.write(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Промо-материалы — ${escapeHtml(branch.canonicalName)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        ${pageCss}
    </style>
</head>
<body>
    ${bodyContent}
    <script>
        window.addEventListener('load', () => {
            setTimeout(() => { window.print(); }, 450);
        });
    </script>
</body>
</html>
    `);
    printWin.document.close();
}
