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

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=3.7.1';
import { createQrSvg } from './qrcode.js?v=3.7.1';

export const PROMO_SLOGANS = [
    'Читай новинки первым — подпишись на наше сообщество ВКонтакте!',
    'Все события, мастер-классы и лектории нашего района',
    'Бронируй книги онлайн, задавай вопросы и следи за фотоотчётами',
    'Интеллектуальное пространство для чтения, учёбы и вдохновения',
    'Книга — это диалог сквозь время. Присоединяйтесь к читателям Владимира!'
];

const BOOKMARK_THEMES = [
    {
        name: 'indigo',
        accent: '#1d4ed8',
        accentSoft: '#eff6ff',
        accentBorder: '#bfdbfe',
        tagBg: '#1e40af',
        tagColor: '#ffffff'
    },
    {
        name: 'pine',
        accent: '#15803d',
        accentSoft: '#f0fdf4',
        accentBorder: '#bbf7d0',
        tagBg: '#166534',
        tagColor: '#ffffff'
    },
    {
        name: 'terracotta',
        accent: '#c2410c',
        accentSoft: '#fff7ed',
        accentBorder: '#fed7aa',
        tagBg: '#c2410c',
        tagColor: '#ffffff'
    },
    {
        name: 'graphite',
        accent: '#334155',
        accentSoft: '#f8fafc',
        accentBorder: '#cbd5e1',
        tagBg: '#0f172a',
        tagColor: '#ffffff'
    }
];

function getDisplayUrl(branch) {
    if (!branch) return 'vk.com';
    if (branch.screenName) return `vk.com/${branch.screenName}`;
    if (branch.vkLink) return branch.vkLink.replace(/^https?:\/\//, '');
    return 'vk.com';
}

function getBookmarkSlogans(chosenSlogan) {
    if (chosenSlogan === PROMO_SLOGANS[0]) {
        return [
            'Читай новинки первым — подпишись на наше сообщество ВКонтакте!',
            '«Книга — это мечта, которую вы держите в руках» (Нил Гейман)',
            'Все мастер-классы, лекции и бесплатные события нашего района',
            'Бронируй книги онлайн, задавай вопросы и оставайся на связи'
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
        `<option value="${escapeHtml(b.shortCode)}">${escapeHtml(b.canonicalName)}</option>`
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
                                <span class="promo-format-desc">Стойка выдачи книг</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="bookmark">
                                <span class="material-symbols-outlined format-ico">bookmark</span>
                                <span class="promo-format-name">Закладки (4 шт/А4)</span>
                                <span class="promo-format-desc">Линии отреза для книг</span>
                            </label>
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
    const sloganSelect = modal.querySelector('#promo-slogan-select');
    const sloganCustom = modal.querySelector('#promo-slogan-custom');
    const closeBtn = modal.querySelector('#promo-modal-close-btn');
    const printBtn = modal.querySelector('#promo-print-btn');
    const viewport = modal.querySelector('#promo-preview-viewport');
    const metaBox = modal.querySelector('#promo-branch-meta');

    let currentBranch = CANONICAL_BRANCHES[0];
    let currentFormat = 'a4';
    let currentSlogan = PROMO_SLOGANS[0];

    function updatePreview() {
        if (!currentBranch) return;

        const displayUrl = getDisplayUrl(currentBranch);

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
            const qrSvgSmall = createQrSvg(currentBranch.vkLink, { size: 85, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

            viewport.innerHTML = `
                <div class="poster-sheet sheet-bookmark">
                    ${BOOKMARK_THEMES.map((theme, idx) => `
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
                                Муниципальные библиотеки г. Владимира
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
                            <div class="bm-footer">
                                <div class="bm-foot-line">${escapeHtml(currentBranch.address)}</div>
                                <div class="bm-foot-line">тел. ${escapeHtml(currentBranch.phone)}</div>
                                <div class="bm-foot-portal">biblioteka33.ru</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (currentFormat === 'a5') {
            const qrSvgA5 = createQrSvg(currentBranch.vkLink, { size: 105, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

            viewport.innerHTML = `
                <div class="poster-sheet sheet-a5">
                    <div class="poster-sheet-inner a5-inner">
                        <!-- Top Identity Bar -->
                        <header class="poster-identity-bar a5-identity">
                            <div class="poster-civic-badge">
                                <span class="civic-dot"></span>
                                <span class="civic-text">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                            </div>
                            <div class="poster-institution-portal">СТОЙКА ВЫДАЧИ КНИГ • АБОНЕМЕНТ</div>
                        </header>

                        <!-- 2-Column Core -->
                        <div class="a5-core-columns">
                            <!-- Left Column: Editorial & Features -->
                            <div class="a5-editorial-col">
                                <h2 class="a5-branch-title">${escapeHtml(currentBranch.canonicalName)}</h2>
                                <div class="a5-main-cta">Все события, новинки литературы и бронь книг онлайн</div>
                                <div class="a5-slogan-quote">«${escapeHtml(currentSlogan)}»</div>

                                <ul class="a5-feature-checklist">
                                    <li><span class="a5-check-icon">✓</span> <span>Быстрое бронирование и продление книг онлайн</span></li>
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
                                <span class="col-value">biblioteka33.ru</span>
                            </div>
                        </footer>
                    </div>
                </div>
            `;
        } else {
            // Плакат А4
            const qrSvgA4 = createQrSvg(currentBranch.vkLink, { size: 120, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

            viewport.innerHTML = `
                <div class="poster-sheet sheet-a4">
                    <div class="poster-sheet-inner">
                        <!-- Top Identity Bar -->
                        <header class="poster-identity-bar">
                            <div class="poster-civic-badge">
                                <span class="civic-dot"></span>
                                <span class="civic-text">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                            </div>
                            <div class="poster-institution-portal">biblioteka33.ru</div>
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
                                <h3 class="p-card-title">Книжный фонд & Новинки</h3>
                                <p class="p-card-desc">Актуальные бестселлеры, классика, периодика и редкие краеведческие издания</p>
                            </div>
                            <div class="p-card">
                                <div class="p-card-header">
                                    <span class="p-card-num">02</span>
                                    <span class="p-card-icon">🎨</span>
                                </div>
                                <h3 class="p-card-title">Мастер-классы & Клубы</h3>
                                <p class="p-card-desc">Интеллектуальные лектории, выставки, творческие встречи и клубы по интересам</p>
                            </div>
                            <div class="p-card">
                                <div class="p-card-header">
                                    <span class="p-card-num">03</span>
                                    <span class="p-card-icon">📸</span>
                                </div>
                                <h3 class="p-card-title">Анонсы событий & Фото</h3>
                                <p class="p-card-desc">Афиша мероприятий, бронирование изданий онлайн и яркие фотоотчёты встреч</p>
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
                                <p class="qr-prompt-sub">Свежие анонсы событий, бронирование изданий, отзывы и диалог с библиотекой</p>
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
                                <span class="col-value">biblioteka33.ru</span>
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
            b.shortCode === val || 
            b.rawId === Number(val) || 
            b.canonicalName === val
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
        printPromoPoster(currentBranch, currentFormat, currentSlogan);
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
export function printPromoPoster(branch, format, slogan) {
    const printWin = window.open('', '_blank', 'width=1000,height=1150');
    if (!printWin) {
        alert('Пожалуйста, разрешите всплывающие окна для печати промо-материалов');
        return;
    }

    const displayUrl = getDisplayUrl(branch);
    let bodyContent = '';
    let pageCss = '';

    if (format === 'bookmark') {
        const slogans = getBookmarkSlogans(slogan);
        const qrSvg = createQrSvg(branch.vkLink, { size: 105, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

        pageCss = `
            @page { size: A4 portrait; margin: 10mm 8mm 10mm 8mm; }
            body { background: #ffffff; color: #0a0f1d; }
            .print-sheet-bookmarks {
                display: flex;
                align-items: stretch;
                justify-content: space-between;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
            }
            .bm-item {
                width: 44mm;
                height: 195mm;
                border: 1px solid #cbd5e1;
                border-radius: 3mm;
                padding: 5mm 3.5mm 4mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                box-sizing: border-box;
                background: #ffffff;
            }
            .bm-tag {
                font-size: 7pt;
                font-weight: 800;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                padding: 1.5mm 3.5mm;
                border-radius: 3mm;
                margin-bottom: 3mm;
                color: #ffffff;
            }
            .bm-civic {
                font-size: 6pt;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #64748b;
                margin-bottom: 3mm;
                line-height: 1.2;
            }
            .bm-title {
                font-size: 8.5pt;
                font-weight: 800;
                color: #0a0f1d;
                line-height: 1.22;
                margin-bottom: 3mm;
            }
            .bm-quote {
                font-size: 7pt;
                font-style: italic;
                color: #334155;
                line-height: 1.35;
                padding: 2mm 2.5mm;
                background: #f8fafc;
                border-left-width: 1mm;
                border-left-style: solid;
                border-radius: 0 1.5mm 1.5mm 0;
                margin-bottom: 4mm;
                width: 100%;
                box-sizing: border-box;
            }
            .bm-qr-box {
                margin: 2mm 0;
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
            .bm-frame .corner-tl { top: 0; left: 0; border-width: 0.5mm 0 0 0.5mm; }
            .bm-frame .corner-tr { top: 0; right: 0; border-width: 0.5mm 0.5mm 0 0; }
            .bm-frame .corner-bl { bottom: 0; left: 0; border-width: 0 0 0.5mm 0.5mm; }
            .bm-frame .corner-br { bottom: 0; right: 0; border-width: 0 0.5mm 0.5mm 0; }
            .bm-frame svg {
                width: 28mm;
                height: 28mm;
                display: block;
            }
            .bm-scan-cue {
                font-size: 6pt;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: #64748b;
                margin-top: 1mm;
                margin-bottom: 1mm;
            }
            .bm-link {
                font-family: 'JetBrains Mono', monospace;
                font-size: 7pt;
                font-weight: 700;
                margin-bottom: auto;
                word-break: break-all;
            }
            .bm-foot {
                font-size: 5.8pt;
                color: #64748b;
                margin-top: 3mm;
                padding-top: 2.5mm;
                border-top: 0.3mm solid #cbd5e1;
                width: 100%;
                line-height: 1.25;
            }
            .bm-foot-portal {
                font-family: 'JetBrains Mono', monospace;
                font-weight: 600;
                color: #334155;
                margin-top: 1mm;
            }
            .bm-cut {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                width: 5mm;
                color: #94a3b8;
                user-select: none;
                padding: 2mm 0;
            }
            .cut-ico {
                font-size: 9pt;
                line-height: 1;
                transform: rotate(90deg);
            }
            .cut-line {
                flex: 1;
                width: 0;
                border-left: 0.3mm dashed #cbd5e1;
                margin: 2mm 0;
            }
        `;

        bodyContent = `
            <div class="print-sheet-bookmarks">
                ${BOOKMARK_THEMES.map((theme, idx) => `
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
                            Муниципальные библиотеки г. Владимира
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
                        <div class="bm-foot">
                            <div>${escapeHtml(branch.address)}</div>
                            <div>тел. ${escapeHtml(branch.phone)}</div>
                            <div class="bm-foot-portal">biblioteka33.ru</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (format === 'a5') {
        const qrSvgA5 = createQrSvg(branch.vkLink, { size: 140, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

        pageCss = `
            @page { size: A5 landscape; margin: 9mm 12mm 9mm 12mm; }
            body { background: #ffffff; color: #0a0f1d; }
            .print-a5-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
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
                color: #0f172a;
            }
            .a5-place {
                font-family: 'JetBrains Mono', monospace;
                font-size: 8pt;
                font-weight: 600;
                color: #475569;
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
                color: #0a0f1d;
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
                color: #475569;
                line-height: 1.35;
                margin-bottom: 3.5mm;
            }
            .a5-list {
                list-style: none;
                padding: 0;
                margin: 0;
                font-size: 8.5pt;
                color: #334155;
            }
            .a5-list li {
                margin-bottom: 1.5mm;
                display: flex;
                align-items: center;
                gap: 2mm;
            }
            .a5-check {
                color: #15803d;
                font-weight: 800;
            }
            .a5-right {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                background: #f8fafc;
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
                color: #0f172a;
                margin-top: 1mm;
            }
            .a5-foot {
                display: flex;
                justify-content: space-between;
                border-top: 0.3mm solid #cbd5e1;
                padding-top: 2.5mm;
                font-size: 8pt;
                color: #475569;
            }
            .a5-foot-item b {
                color: #0a0f1d;
            }
        `;

        bodyContent = `
            <div class="print-a5-container">
                <header class="a5-top">
                    <span class="a5-civic">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                    <span class="a5-place">СТОЙКА ВЫДАЧИ КНИГ • АБОНЕМЕНТ</span>
                </header>

                <div class="a5-cols">
                    <div class="a5-left">
                        <h1 class="a5-name">${escapeHtml(branch.canonicalName)}</h1>
                        <div class="a5-cta">Все события, новинки литературы и бронь книг онлайн</div>
                        <div class="a5-quote">«${escapeHtml(slogan)}»</div>

                        <ul class="a5-list">
                            <li><span class="a5-check">✓</span> <span>Быстрое бронирование и продление книг онлайн</span></li>
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
                    <div class="a5-foot-item"><b>Портал:</b> biblioteka33.ru</div>
                </footer>
            </div>
        `;
    } else {
        // Плакат А4
        const qrSvgA4 = createQrSvg(branch.vkLink, { size: 170, foreground: '#0a0f1d', background: '#ffffff', margin: 1 });

        pageCss = `
            @page { size: A4 portrait; margin: 12mm 14mm 12mm 14mm; }
            body { background: #ffffff; color: #0a0f1d; }
            .print-a4-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
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
                color: #0f172a;
            }
            .a4-portal {
                font-family: 'JetBrains Mono', monospace;
                font-size: 9pt;
                font-weight: 600;
                color: #475569;
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
                color: #0a0f1d;
                margin: 0 0 3.5mm 0;
                letter-spacing: -0.02em;
            }
            .a4-slogan-box {
                display: inline-block;
                padding: 2.5mm 6mm;
                background: #f8fafc;
                border-left: 1.2mm solid #1d4ed8;
                border-radius: 0 2mm 2mm 0;
                font-size: 12.5pt;
                font-style: italic;
                font-weight: 600;
                color: #1e293b;
            }
            .a4-cards {
                display: flex;
                justify-content: space-between;
                gap: 4mm;
                margin: 4mm 0 6mm;
            }
            .a4-card {
                flex: 1;
                background: #f8fafc;
                border: 0.35mm solid #cbd5e1;
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
                color: #0f172a;
                margin: 0 0 1.5mm 0;
                line-height: 1.25;
            }
            .a4-card-desc {
                font-size: 8pt;
                color: #475569;
                margin: 0;
                line-height: 1.35;
            }
            .a4-qr-block {
                display: flex;
                align-items: center;
                gap: 7mm;
                background: #f8fafc;
                border: 0.5mm solid #0f172a;
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
                color: #0a0f1d;
                line-height: 1.2;
                margin-bottom: 1.5mm;
            }
            .a4-qr-sub {
                font-size: 9.5pt;
                color: #475569;
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
                color: #334155;
                line-height: 1.25;
                display: block;
            }
        `;

        bodyContent = `
            <div class="print-a4-container">
                <header class="a4-top">
                    <span class="a4-civic">МУНИЦИПАЛЬНЫЕ БИБЛИОТЕКИ ВЛАДИМИРА</span>
                    <span class="a4-portal">biblioteka33.ru</span>
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
                        <div class="a4-card-title">Книжный фонд & Новинки</div>
                        <p class="a4-card-desc">Актуальные бестселлеры, классика, периодика и редкие краеведческие издания</p>
                    </div>
                    <div class="a4-card">
                        <div class="a4-card-head">
                            <span class="a4-card-num">02</span>
                            <span class="a4-card-ico">🎨</span>
                        </div>
                        <div class="a4-card-title">Мастер-классы & Клубы</div>
                        <p class="a4-card-desc">Интеллектуальные лектории, выставки, творческие встречи и клубы по интересам</p>
                    </div>
                    <div class="a4-card">
                        <div class="a4-card-head">
                            <span class="a4-card-num">03</span>
                            <span class="a4-card-ico">📸</span>
                        </div>
                        <div class="a4-card-title">Анонсы событий & Фото</div>
                        <p class="a4-card-desc">Афиша мероприятий, бронирование изданий онлайн и яркие фотоотчёты встреч</p>
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
                        <p class="a4-qr-sub">Свежие анонсы событий, бронирование книг, отзывы и диалог с библиотекой</p>
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
                        <span class="a4-foot-val">biblioteka33.ru</span>
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
