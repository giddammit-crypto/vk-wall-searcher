/**
 * src/promo.js — In-Library QR Promo Poster & Bookmark Generator (AURORA v3.7)
 * =============================================================================
 * Генератор фирменных промо-материалов для привлечения живых читателей в группы ВК:
 * - Формат А4: Плакат для информационного стенда и входа
 * - Формат А5: Тейблтент для стойки выдачи книг (абонемента)
 * - Формат «Закладка»: 4 книжные закладки (5×15 см) на 1 лист А4 с линиями отреза
 * - Векторные автономные QR-коды высокой чёткости (300 DPI)
 *
 * Разработка: Амброзиев О.А.
 */

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=3.7.0';
import { createQrSvg } from './qrcode.js?v=3.7.0';

export const PROMO_SLOGANS = [
    'Читай новинки первым — подпишись на наш ВК!',
    'Все мастер-классы и бесплатные события нашего района',
    'Бронируй книги онлайн и следи за фотоотчётами',
    'Твой клуб настольных игр, лекций и живого общения',
    'Приглашаем в библиотеку: книги, творчество и уютные вечера'
];

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
        `<option value="${escapeHtml(b.shortCode)}">${escapeHtml(b.canonicalName)} (${escapeHtml(b.shortCode)})</option>`
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
                        <p class="promo-modal-subtitle">Печатные плакаты, флаеры и закладки с QR-кодом для привлечения живых читателей в группу ВК</p>
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
                        <label class="promo-label">Филиал библиотеки:</label>
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
                                <span class="format-name">Плакат А4</span>
                                <span class="format-desc">Для дверей и инфостенда</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="a5">
                                <span class="material-symbols-outlined format-ico">tablet_mac</span>
                                <span class="format-name">Тейблтент А5</span>
                                <span class="format-desc">Для стойки выдачи книг</span>
                            </label>
                            <label class="promo-format-card">
                                <input type="radio" name="promo-format" value="bookmark">
                                <span class="material-symbols-outlined format-ico">bookmark</span>
                                <span class="format-name">Закладки (4 шт/А4)</span>
                                <span class="format-desc">Вкладывать в книги</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="promo-label">Слоган / призыв к действию:</label>
                        <select id="promo-slogan-select" class="promo-select">
                            ${sloganOptions}
                            <option value="custom">-- Свой вариант текста --</option>
                        </select>
                        <input type="text" id="promo-slogan-custom" class="promo-input hidden" placeholder="Введите ваш текст слогана...">
                    </div>

                    <div class="promo-branch-preview-info" id="promo-branch-meta">
                        <!-- Заполняется динамически -->
                    </div>

                    <div class="promo-print-actions">
                        <button class="btn btn-primary btn-block" id="promo-print-btn">
                            <span class="material-symbols-outlined">print</span>
                            <span>Печать / Сохранить в PDF</span>
                        </button>
                    </div>
                </div>

                <!-- Живой предпросмотр макета -->
                <div class="promo-preview-col">
                    <div class="promo-preview-viewport" id="promo-preview-viewport">
                        <!-- Рендерится превью -->
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Логика переключений
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

        metaBox.innerHTML = `
            <div class="meta-row"><span class="meta-lbl">Адрес:</span> <b>${escapeHtml(currentBranch.address)}</b></div>
            <div class="meta-row"><span class="meta-lbl">Телефон:</span> <b>${escapeHtml(currentBranch.phone)}</b></div>
            <div class="meta-row"><span class="meta-lbl">Ссылка:</span> <b>${escapeHtml(currentBranch.vkLink)}</b></div>
        `;

        const qrSvg = createQrSvg(currentBranch.vkLink, { size: 160, foreground: '#090d16', background: '#ffffff' });

        if (currentFormat === 'bookmark') {
            // Превью 4 закладок
            viewport.innerHTML = `
                <div class="poster-preview-sheet sheet-bookmark">
                    ${[1, 2, 3, 4].map(idx => `
                        <div class="mini-bookmark">
                            <div class="bm-header">
                                <span class="bm-logo">AURORA</span>
                                <span class="bm-branch">${escapeHtml(currentBranch.shortCode)}</span>
                            </div>
                            <div class="bm-title">${escapeHtml(currentBranch.canonicalName)}</div>
                            <div class="bm-slogan">${escapeHtml(currentSlogan)}</div>
                            <div class="bm-qr">${qrSvg}</div>
                            <div class="bm-link">${escapeHtml(currentBranch.screenName ? 'vk.com/' + currentBranch.screenName : currentBranch.vkLink)}</div>
                            <div class="bm-footer">${escapeHtml(currentBranch.address)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (currentFormat === 'a5') {
            // Превью Тейблтента А5
            viewport.innerHTML = `
                <div class="poster-preview-sheet sheet-a5">
                    <div class="poster-frame">
                        <div class="poster-top-bar">
                            <span class="poster-badge-city">Муниципальные библиотеки Владимира</span>
                            <span class="poster-badge-branch">${escapeHtml(currentBranch.shortCode)}</span>
                        </div>
                        <h2 class="poster-branch-heading">${escapeHtml(currentBranch.canonicalName)}</h2>
                        <div class="poster-slogan-box">
                            <p class="poster-slogan-text">«${escapeHtml(currentSlogan)}»</p>
                        </div>
                        <div class="poster-qr-wrapper">
                            ${qrSvg}
                            <div class="poster-scan-cta">Наведите камеру смартфона</div>
                        </div>
                        <div class="poster-footer-contacts">
                            <div class="p-foot-row"><span class="material-symbols-outlined">location_on</span> ${escapeHtml(currentBranch.address)}</div>
                            <div class="p-foot-row"><span class="material-symbols-outlined">call</span> ${escapeHtml(currentBranch.phone)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Превью Плаката А4
            viewport.innerHTML = `
                <div class="poster-preview-sheet sheet-a4">
                    <div class="poster-frame">
                        <div class="poster-top-bar">
                            <span class="poster-badge-city">МБУК «Центральная городская библиотека» г. Владимира</span>
                            <span class="poster-badge-branch">${escapeHtml(currentBranch.shortCode)}</span>
                        </div>
                        <h1 class="poster-branch-heading">${escapeHtml(currentBranch.canonicalName)}</h1>
                        
                        <div class="poster-slogan-box">
                            <h3 class="poster-slogan-text">«${escapeHtml(currentSlogan)}»</h3>
                        </div>

                        <div class="poster-features-grid">
                            <div class="p-feat-item"><span class="material-symbols-outlined">book_2</span> Новинки литературы и книжные выставки</div>
                            <div class="p-feat-item"><span class="material-symbols-outlined">palette</span> Бесплатные мастер-классы и встречи</div>
                            <div class="p-feat-item"><span class="material-symbols-outlined">photo_camera</span> Фотоотчёты событий и общение</div>
                        </div>

                        <div class="poster-qr-wrapper">
                            <div class="qr-glow-box">
                                ${qrSvg}
                            </div>
                            <div class="poster-scan-cta">
                                <b>ПОДПИШИТЕСЬ НА НАШУ ГРУППУ ВКОНТАКТЕ</b>
                                <span>${escapeHtml(currentBranch.vkLink)}</span>
                            </div>
                        </div>

                        <div class="poster-footer-contacts">
                            <div class="p-foot-row">📍 ${escapeHtml(currentBranch.address)}</div>
                            <div class="p-foot-row">📞 ${escapeHtml(currentBranch.phone)}</div>
                            <div class="p-foot-row">🌐 biblioteka33.ru</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    branchSelect.addEventListener('change', () => {
        const val = branchSelect.value;
        currentBranch = CANONICAL_BRANCHES.find(b => b.shortCode === val) || CANONICAL_BRANCHES[0];
        updatePreview();
    });

    formatCards.forEach(card => {
        card.addEventListener('click', () => {
            formatCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentFormat = card.querySelector('input').value;
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
            sel.value = defaultBranchCode;
            sel.dispatchEvent(new Event('change'));
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
 * Открывает типографское окно печати плаката / закладок
 */
export function printPromoPoster(branch, format, slogan) {
    const printWin = window.open('', '_blank', 'width=950,height=1100');
    if (!printWin) {
        alert('Пожалуйста, разрешите всплывающие окна для печати промо-материалов');
        return;
    }

    const qrSvg = createQrSvg(branch.vkLink, { size: format === 'bookmark' ? 120 : 200, foreground: '#090d16', background: '#ffffff' });

    let bodyContent = '';
    let pageCss = '';

    if (format === 'bookmark') {
        pageCss = `
            @page { size: A4 portrait; margin: 10mm; }
            .bookmarks-sheet {
                display: flex;
                justify-content: space-between;
                width: 100%;
                height: 100%;
            }
            .bm-item {
                width: 46mm;
                height: 190mm;
                border: 1px dashed #94a3b8;
                padding: 12mm 5mm 8mm 5mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                box-sizing: border-box;
            }
            .bm-code { font-size: 14pt; font-weight: 800; color: #1757a6; margin-bottom: 4px; }
            .bm-title { font-size: 8pt; font-weight: 700; color: #090d16; line-height: 1.2; margin-bottom: 8px; }
            .bm-slogan { font-size: 7.5pt; color: #475569; margin-bottom: 12px; font-style: italic; line-height: 1.25; }
            .bm-qr { margin: 8px 0; }
            .bm-url { font-size: 8pt; font-weight: 700; color: #1757a6; margin-bottom: auto; }
            .bm-foot { font-size: 6.5pt; color: #64748b; margin-top: 10px; line-height: 1.2; }
        `;
        bodyContent = `
            <div class="bookmarks-sheet">
                ${[1, 2, 3, 4].map(() => `
                    <div class="bm-item">
                        <div class="bm-code">${escapeHtml(branch.shortCode)}</div>
                        <div class="bm-title">${escapeHtml(branch.canonicalName)}</div>
                        <div class="bm-slogan">«${escapeHtml(slogan)}»</div>
                        <div class="bm-qr">${qrSvg}</div>
                        <div class="bm-url">${escapeHtml(branch.screenName ? 'vk.com/' + branch.screenName : branch.vkLink)}</div>
                        <div class="bm-foot">
                            ${escapeHtml(branch.address)}<br>
                            тел: ${escapeHtml(branch.phone)}<br>
                            МБУК «ЦГБ» г. Владимира
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // А4 или А5
        const isA5 = format === 'a5';
        pageCss = `
            @page { size: ${isA5 ? 'A5 landscape' : 'A4 portrait'}; margin: ${isA5 ? '8mm' : '15mm'}; }
            .poster-container {
                border: 3px double #1757a6;
                padding: ${isA5 ? '12mm' : '20mm 15mm'};
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .poster-city { font-size: ${isA5 ? '9pt' : '11pt'}; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; font-weight: 600; margin-bottom: 6px; }
            .poster-name { font-size: ${isA5 ? '18pt' : '26pt'}; font-weight: 800; color: #090d16; line-height: 1.15; margin: 0 0 10px 0; }
            .poster-slogan { font-size: ${isA5 ? '12pt' : '16pt'}; font-weight: 600; color: #1757a6; margin-bottom: ${isA5 ? '12px' : '20px'}; font-style: italic; }
            .poster-qr-box { margin: ${isA5 ? '10px' : '20px'} 0; }
            .poster-cta-title { font-size: ${isA5 ? '13pt' : '18pt'}; font-weight: 800; color: #090d16; letter-spacing: 0.04em; margin-bottom: 4px; }
            .poster-cta-link { font-size: ${isA5 ? '10pt' : '13pt'}; color: #1757a6; font-weight: 600; }
            .poster-footer { margin-top: auto; padding-top: 15px; border-top: 1px solid #cbd5e1; width: 100%; font-size: ${isA5 ? '8.5pt' : '10pt'}; color: #334155; }
        `;
        bodyContent = `
            <div class="poster-container">
                <div class="poster-city">Муниципальные библиотеки города Владимира</div>
                <h1 class="poster-name">${escapeHtml(branch.canonicalName)}</h1>
                <div class="poster-slogan">«${escapeHtml(slogan)}»</div>

                <div class="poster-qr-box">${qrSvg}</div>

                <div class="poster-cta-title">ПОДПИШИСЬ НА НАШУ ГРУППУ ВКОНТАКТЕ</div>
                <div class="poster-cta-link">${escapeHtml(branch.vkLink)}</div>

                <div class="poster-footer">
                    <div><b>Адрес:</b> ${escapeHtml(branch.address)}</div>
                    <div><b>Телефон для справок:</b> ${escapeHtml(branch.phone)} • <b>Сайт:</b> biblioteka33.ru</div>
                </div>
            </div>
        `;
    }

    printWin.document.write(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Промо-плакат — ${escapeHtml(branch.canonicalName)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #090d16;
            background: #ffffff;
        }
        ${pageCss}
    </style>
</head>
<body>
    ${bodyContent}
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
