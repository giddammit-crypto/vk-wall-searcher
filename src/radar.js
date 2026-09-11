/**
 * src/radar.js — Methodist Competence Radar & Spider Chart (AURORA v3.7)
 * =============================================================================
 * Многоосевой аудит компетенций филиалов библиотек:
 * - 6 осей: Регулярность, Вовлечённость (ER), Авторский контент,
 *           Мультимедийность, Анонсирование событий, Охват аудитории
 * - Векторная интерактивная паутинная диаграмма (SVG Radar)
 * - Режим сравнения: Филиал vs Среднее по городу / Филиал vs Филиал
 * - Автоматические методические выводы и зоны роста
 *
 * Разработка: Амброзиев О.А.
 */

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=3.7.8';
import { extractNum } from './analytics.js?v=3.7.8';

export const RADAR_AXES = [
    { id: 'regularity', label: 'Регулярность', desc: 'Частота и ритмичность постов' },
    { id: 'engagement', label: 'Вовлечённость (ER)', desc: 'Отклик читателей (лайки/просмотры)' },
    { id: 'originality', label: 'Авторский контент', desc: 'Доля оригинальных постов (без репостов)' },
    { id: 'multimedia', label: 'Мультимедиа', desc: 'Насыщенность видео, клипами, опросами' },
    { id: 'events', label: 'Анонсы событий', desc: 'Доля афиш и приглашений на живые встречи' },
    { id: 'reach', label: 'Охват аудитории', desc: 'Средний охват 1 поста к размеру группы' }
];

/**
 * Рассчитывает нормализованные показатели (0–100) для каждого филиала
 */
export function computeAllRadarScores(groupsStats, posts = []) {
    if (!Array.isArray(groupsStats) || groupsStats.length === 0) return new Map();

    // Группировка постов по филиалам для анализа медиа и анонсов
    const postsByBranch = new Map();
    posts.forEach(p => {
        const tInfo = p.targetInfo || p.canonicalBranch || {};
        const branchCode = tInfo.shortCode || p.canonicalBranch?.shortCode || p.sourceName || String(p.owner_id);
        if (branchCode) {
            if (!postsByBranch.has(branchCode)) {
                postsByBranch.set(branchCode, []);
            }
            postsByBranch.get(branchCode).push(p);
        }
    });

    const eventKeywords = /мастер-класс|выставка|концерт|спектакль|лекция|встреча|приглашаем|состоится|клуб|квиз|игротек|библионоч/i;

    const scoresMap = new Map();

    groupsStats.forEach((stat, idx) => {
        // Извлекаем метаданные филиала устойчиво из stat.info, stat.targetInfo или stat
        const targetInfo = stat.info || stat.targetInfo || stat;
        const canonical = targetInfo.canonicalBranch || targetInfo.branch || targetInfo;
        const code = canonical.shortCode || targetInfo.shortCode || targetInfo.id || stat.id || stat.name || `Ф-${idx + 1}`;
        const name = canonical.canonicalName || targetInfo.canonicalName || targetInfo.name || stat.name || `Филиал ${code}`;

        const bPosts = (stat.posts && Array.isArray(stat.posts) && stat.posts.length > 0)
            ? stat.posts
            : (postsByBranch.get(code) || postsByBranch.get(name) || postsByBranch.get(String(targetInfo.id)) || []);
        
        const totalPosts = stat.postsCount || bPosts.length || 0;

        // 1. Регулярность (25+ постов за период = 100 баллов)
        const regularity = Math.min(100, Math.round((totalPosts / 25) * 100));

        // 2. Вовлечённость (ER 4% = 100 баллов, средний ER в библиотеках ~1.5–3.5%)
        const erVal = parseFloat(stat.erViews ?? stat.erPosts ?? stat.er ?? 0) || 0;
        const engagement = Math.min(100, Math.round((erVal / 4.0) * 100));

        // 3. Авторский контент (% постов без репостов)
        const repostsCount = stat.repostsCount ?? bPosts.filter(p => p.copy_history && p.copy_history.length > 0).length;
        const originalRatio = totalPosts > 0 ? Math.max(0, 1 - (repostsCount / totalPosts)) : 1;
        const originality = Math.min(100, Math.round(originalRatio * 100));

        // 4. Мультимедиа (доля постов с видео, фотоальбомами, опросами)
        let mediaPosts = 0;
        bPosts.forEach(p => {
            if (p.attachments && p.attachments.some(a => ['video', 'doc', 'poll', 'album'].includes(a.type))) {
                mediaPosts++;
            } else if (p.attachments && p.attachments.filter(a => a.type === 'photo').length >= 2) {
                mediaPosts++;
            }
        });
        const multimediaRatio = bPosts.length > 0 ? (mediaPosts / bPosts.length) : 0.4;
        const multimedia = Math.min(100, Math.round(multimediaRatio * 150)); // 66%+ медиапостов = 100 баллов

        // 5. Анонсы событий (доля постов с ключевыми словами афиши)
        let eventPostsCount = 0;
        bPosts.forEach(p => {
            if (eventKeywords.test(p.text || '')) eventPostsCount++;
        });
        const eventsRatio = bPosts.length > 0 ? (eventPostsCount / bPosts.length) : 0.2;
        const eventsScore = Math.min(100, Math.round((eventsRatio / 0.35) * 100)); // 35%+ постов-анонсов = 100

        // 6. Охват аудитории (средние просмотры на пост к числу участников)
        const totalViews = stat.views || stat.totalViews || 0;
        const avgViews = stat.avgViews || (totalPosts > 0 ? Math.round(totalViews / totalPosts) : (totalViews || 250));
        const members = canonical.canonicalMembers || targetInfo.canonicalMembers || 1500;
        const reachRatio = members > 0 ? (avgViews / members) : 0.2;
        const reach = Math.min(100, Math.round((reachRatio / 0.35) * 100));

        scoresMap.set(String(code), {
            code: String(code),
            name,
            branch: canonical,
            info: targetInfo,
            regularity: Math.max(20, regularity),
            engagement: Math.max(20, engagement),
            originality: Math.max(20, originality),
            multimedia: Math.max(20, multimedia),
            events: Math.max(20, eventsScore),
            reach: Math.max(20, reach),
            raw: { totalPosts, erVal, originalRatio, avgViews }
        });
    });

    // Расчёт среднего показателя по городу (City Average)
    let avgReg = 0, avgEng = 0, avgOrig = 0, avgMed = 0, avgEv = 0, avgRch = 0;
    const count = scoresMap.size || 1;
    scoresMap.forEach(s => {
        avgReg += s.regularity;
        avgEng += s.engagement;
        avgOrig += s.originality;
        avgMed += s.multimedia;
        avgEv += s.events;
        avgRch += s.reach;
    });

    const cityAvg = {
        name: 'Среднее по ЦБС Владимира',
        shortCode: 'AVG',
        regularity: Math.round(avgReg / count),
        engagement: Math.round(avgEng / count),
        originality: Math.round(avgOrig / count),
        multimedia: Math.round(avgMed / count),
        events: Math.round(avgEv / count),
        reach: Math.round(avgRch / count)
    };
    scoresMap.set('AVG', cityAvg);

    return scoresMap;
}

/**
 * Рендерит секцию радарной диаграммы
 */
export function renderRadarSection(container, groupsStats, posts = []) {
    if (!container) return;

    const scoresMap = computeAllRadarScores(groupsStats, posts);
    if (scoresMap.size === 0) {
        container.innerHTML = `
            <div class="radar-empty">
                <p>Нет данных для построения диаграммы компетенций. Выполните поиск по сообществам.</p>
            </div>
        `;
        return;
    }

    const branchList = [];
    scoresMap.forEach((v, k) => {
        if (k !== 'AVG' && v && v.name) {
            branchList.push({ code: k, name: v.name });
        }
    });

    if (branchList.length === 0) {
        container.innerHTML = `
            <div class="radar-empty">
                <p>Нет данных по филиалам для построения диаграммы. Выполните поиск по сообществам.</p>
            </div>
        `;
        return;
    }

    let primaryBranchCode = branchList[0]?.code || 'ЦГБ';
    let compareCode = 'AVG'; // 'AVG' или код другого филиала

    function redraw() {
        const primaryData = scoresMap.get(primaryBranchCode) || scoresMap.get(branchList[0]?.code);
        const compareData = scoresMap.get(compareCode);

        const svgHtml = buildRadarSvg(primaryData, compareData);
        const adviceHtml = buildMethodistAdvice(primaryData);

        const chartWrap = container.querySelector('#radar-svg-canvas-wrap');
        const adviceWrap = container.querySelector('#radar-advice-box');
        if (chartWrap) chartWrap.innerHTML = svgHtml;
        if (adviceWrap) adviceWrap.innerHTML = adviceHtml;
    }

    const branchOptionsHtml = branchList.map(b => 
        `<option value="${escapeHtml(b.code)}" ${b.code === primaryBranchCode ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
    ).join('');

    const compareOptionsHtml = [
        '<option value="AVG" selected>Средний уровень по городу (ЦБС)</option>',
        ...branchList.map(b => `<option value="${escapeHtml(b.code)}">Сравнить с: ${escapeHtml(b.name)}</option>`)
    ].join('');

    container.innerHTML = `
        <div class="radar-module-card">
            <div class="radar-header">
                <div class="radar-title-group">
                    <span class="material-symbols-outlined radar-ico">radar</span>
                    <div>
                        <h3 class="radar-title">Диаграмма компетенций филиалов («Радар методиста»)</h3>
                        <p class="radar-subtitle">Многоосевой баланс контентной стратегии: частота, вовлечение (ER), авторство, медиа, анонсы и охваты</p>
                    </div>
                </div>

                <div class="radar-selectors-bar">
                    <div class="radar-select-group">
                        <label class="radar-lbl">Основной филиал:</label>
                        <select id="radar-primary-select" class="radar-select">
                            ${branchOptionsHtml}
                        </select>
                    </div>

                    <div class="radar-select-group">
                        <label class="radar-lbl">Сравнение:</label>
                        <select id="radar-compare-select" class="radar-select">
                            ${compareOptionsHtml}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Легенда диаграммы -->
            <div class="radar-legend-bar">
                <div class="r-leg-item primary-leg">
                    <span class="leg-color-box leg-primary"></span>
                    <span class="leg-text" id="leg-primary-name">Выбранный филиал</span>
                </div>
                <div class="r-leg-item compare-leg">
                    <span class="leg-color-box leg-compare"></span>
                    <span class="leg-text" id="leg-compare-name">Средний уровень по городу (ЦБС)</span>
                </div>
            </div>

            <div class="radar-content-grid">
                <!-- Векторный график -->
                <div class="radar-canvas-container" id="radar-svg-canvas-wrap"></div>

                <!-- Методическая оценка и рекомендации -->
                <div class="radar-advice-panel" id="radar-advice-box"></div>
            </div>
        </div>
    `;

    const primSelect = container.querySelector('#radar-primary-select');
    const compSelect = container.querySelector('#radar-compare-select');
    const legPrim = container.querySelector('#leg-primary-name');
    const legComp = container.querySelector('#leg-compare-name');

    primSelect.addEventListener('change', (e) => {
        primaryBranchCode = e.target.value;
        const b = branchList.find(x => x.code === primaryBranchCode);
        if (legPrim) legPrim.textContent = b ? b.name : primaryBranchCode;
        redraw();
    });

    compSelect.addEventListener('change', (e) => {
        compareCode = e.target.value;
        if (legComp) {
            legComp.textContent = compareCode === 'AVG' ? 'Средний уровень по городу (ЦБС)' : (branchList.find(x => x.code === compareCode)?.name || compareCode);
        }
        redraw();
    });

    if (legPrim) {
        const b = branchList.find(x => x.code === primaryBranchCode);
        if (b) legPrim.textContent = b.name;
    }
    if (legComp) {
        legComp.textContent = compareCode === 'AVG' ? 'Средний уровень по городу (ЦБС)' : (branchList.find(x => x.code === compareCode)?.name || compareCode);
    }

    redraw();
}

/**
 * Генерирует векторный SVG паутины (Radar Chart)
 */
function buildRadarSvg(primary, compare) {
    const size = 520;
    const center = size / 2;
    const radius = 145;
    const numAxes = RADAR_AXES.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Вспомогательная функция координат точки
    function getPoint(axisIdx, valRatio, r = radius) {
        const angle = axisIdx * angleStep - Math.PI / 2;
        const dist = r * Math.max(0.08, Math.min(1.0, valRatio));
        return {
            x: center + dist * Math.cos(angle),
            y: center + dist * Math.sin(angle)
        };
    }

    // 1. Концентрические сетки (20%, 40%, 60%, 80%, 100%)
    let gridSvg = '';
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((level) => {
        const pts = [];
        for (let i = 0; i < numAxes; i++) {
            const p = getPoint(i, level);
            pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        }
        gridSvg += `<polygon points="${pts.join(' ')}" class="radar-grid-poly" />`;
    });

    // 2. Оси и подписи
    let axesSvg = '';
    let labelsSvg = '';
    RADAR_AXES.forEach((axis, i) => {
        const pEdge = getPoint(i, 1.0);
        axesSvg += `<line x1="${center}" y1="${center}" x2="${pEdge.x.toFixed(1)}" y2="${pEdge.y.toFixed(1)}" class="radar-axis-line" />`;

        // Вынос подписи за пределы круга
        const pLabel = getPoint(i, 1.25);
        const val1 = primary ? (primary[axis.id] || 0) : 0;
        
        let textAnchor = 'middle';
        if (pLabel.x < center - 20) textAnchor = 'end';
        else if (pLabel.x > center + 20) textAnchor = 'start';

        labelsSvg += `
            <text x="${pLabel.x.toFixed(1)}" y="${(pLabel.y - 4).toFixed(1)}" text-anchor="${textAnchor}" class="radar-axis-label">${escapeHtml(axis.label)}</text>
            <text x="${pLabel.x.toFixed(1)}" y="${(pLabel.y + 12).toFixed(1)}" text-anchor="${textAnchor}" class="radar-axis-score">${val1} / 100</text>
        `;
    });

    // 3. Полигон сравнения (если задан)
    let comparePolygonSvg = '';
    if (compare) {
        const comparePts = RADAR_AXES.map((axis, i) => {
            const score = (compare[axis.id] || 0) / 100;
            const pt = getPoint(i, score);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        });
        comparePolygonSvg = `
            <polygon points="${comparePts.join(' ')}" class="radar-compare-poly" />
        `;
    }

    // 4. Основной полигон филиала
    let primaryPolygonSvg = '';
    let primaryDotsSvg = '';
    if (primary) {
        const primaryPts = RADAR_AXES.map((axis, i) => {
            const score = (primary[axis.id] || 0) / 100;
            const pt = getPoint(i, score);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        });
        primaryPolygonSvg = `
            <polygon points="${primaryPts.join(' ')}" class="radar-primary-poly" />
        `;

        RADAR_AXES.forEach((axis, i) => {
            const score = (primary[axis.id] || 0) / 100;
            const pt = getPoint(i, score);
            primaryDotsSvg += `
                <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5" class="radar-primary-dot">
                    <title>${escapeHtml(axis.label)}: ${primary[axis.id]} / 100</title>
                </circle>
            `;
        });
    }

    return `
        <svg viewBox="0 0 ${size} ${size}" class="radar-svg-root" xmlns="http://www.w3.org/2000/svg">
            <g class="radar-grid-group">
                ${gridSvg}
                ${axesSvg}
            </g>
            ${comparePolygonSvg}
            ${primaryPolygonSvg}
            ${primaryDotsSvg}
            <g class="radar-labels-group">
                ${labelsSvg}
            </g>
        </svg>
    `.trim();
}

/**
 * Генерирует блок методического аудита и практических рекомендаций
 */
function buildMethodistAdvice(branchData) {
    if (!branchData) return '';

    const bName = branchData.branch?.canonicalName || branchData.name;

    // Определение сильных сторон (>= 75) и зон роста (< 60)
    const strong = [];
    const weak = [];

    RADAR_AXES.forEach(axis => {
        const val = branchData[axis.id] || 0;
        if (val >= 75) strong.push({ label: axis.label, val, desc: axis.desc });
        else if (val < 65) weak.push({ label: axis.label, val, desc: axis.desc });
    });

    const strongHtml = strong.length > 0 ? strong.map(s => `
        <div class="r-diag-pill diag-strong">
            <span class="material-symbols-outlined">verified</span>
            <div>
                <b>${escapeHtml(s.label)} (${s.val}%)</b>
                <p>${escapeHtml(s.desc)}</p>
            </div>
        </div>
    `).join('') : '<div class="diag-empty-sub">Все показатели сбалансированы на среднем уровне</div>';

    const weakHtml = weak.length > 0 ? weak.map(w => `
        <div class="r-diag-pill diag-growth">
            <span class="material-symbols-outlined">trending_up</span>
            <div>
                <b>${escapeHtml(w.label)} (${w.val}%)</b>
                <p>${escapeHtml(w.desc)}</p>
            </div>
        </div>
    `).join('') : '<div class="diag-empty-sub">Явных просадок в контентной матрице не обнаружено</div>';

    // Формирование автоматической рекомендации
    let adviceText = '';
    if (branchData.events < 50) {
        adviceText = 'Рекомендуется усилить анонсирование живых встреч, клубов и мастер-классов в ленте филиала. Это повысит приток реальных читателей в библиотеку.';
    } else if (branchData.multimedia < 50) {
        adviceText = 'Рекомендуется чаще публиковать короткие видеоклипы (VK Клипы), фотоотчёты и опросы. Мультимедийный контент получает приоритет в умной ленте ВК.';
    } else if (branchData.originality < 60) {
        adviceText = 'Высокая доля репостов снижает уникальность ленты. Желательно публиковать больше собственных авторских обзоров новинок литературы и фото залов.';
    } else if (branchData.engagement < 50) {
        adviceText = 'Для роста вовлечённости (ER) задавайте открытые вопросы в конце постов, проводите книжные голосования и делитесь интересными цитатами.';
    } else {
        adviceText = 'Филиал демонстрирует гармоничную и качественную контентную стратегию с высоким балансом охватов и вовлечения аудитории.';
    }

    return `
        <div class="methodist-summary-card">
            <div class="methodist-head">
                <span class="material-symbols-outlined m-head-ico">psychology</span>
                <div>
                    <h4 class="m-head-title">Методический аудит: ${escapeHtml(bName)}</h4>
                    <p class="m-head-sub">Комплексная оценка качества ведения сообщества</p>
                </div>
            </div>

            <div class="methodist-diag-columns">
                <div class="diag-col">
                    <h5 class="diag-col-title text-success">
                        <span class="material-symbols-outlined">thumb_up</span> Сильные стороны
                    </h5>
                    <div class="diag-pills-list">${strongHtml}</div>
                </div>

                <div class="diag-col">
                    <h5 class="diag-col-title text-warning">
                        <span class="material-symbols-outlined">lightbulb</span> Точки роста
                    </h5>
                    <div class="diag-pills-list">${weakHtml}</div>
                </div>
            </div>

            <div class="methodist-action-note">
                <div class="action-note-header">
                    <span class="material-symbols-outlined">tips_and_updates</span>
                    <b>Персональная методическая рекомендация:</b>
                </div>
                <p class="action-note-body">${escapeHtml(adviceText)}</p>
            </div>
        </div>
    `;
}
