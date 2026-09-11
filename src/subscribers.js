/**
 * src/subscribers.js — статистика подписок/отписок филиалов (вкладка «Подписчики»)
 * =============================================================================
 * История накапливается на сервере (api/data.php → data/subscribers.json):
 * не более одного снимка на сообщество в день. Клиент считает динамику
 * за день / неделю / месяц и строит общий график.
 *
 * Разработка: Амброзиев О.А. (модуль 3.4)
 */

import { callVkApi, resolveApiUrl } from './api.js';
import { escapeHtml, renderBranchAvatarHtml, findCanonicalBranch } from './branches.js';

const DATA_URL = resolveApiUrl('api/data.php');

const DAY = 86400;

// ---------------------------------------------------------------------------
// Серверное хранилище
// ---------------------------------------------------------------------------
export async function fetchHistory() {
    try {
        const res = await fetch(`${DATA_URL}?action=history`);
        if (!res || !res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.snapshots) ? data.snapshots : [];
    } catch (e) {
        return [];
    }
}

export async function saveSnapshots(snapshots) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) return { ok: true, added: 0 };
    try {
        const res = await fetch(DATA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save', snapshots })
        });
        return res ? await res.json() : { ok: false };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}

export async function resetHistory() {
    try {
        const res = await fetch(DATA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset' })
        });
        return res ? await res.json() : { ok: false };
    } catch (e) {
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// Агрегация
// ---------------------------------------------------------------------------

/**
 * Группирует снимки по сообществам и сортирует по времени.
 * @returns {Map<number, Array>} groupId → [{members, ts, name, branch, screen_name}]
 */
export function buildGroupSeries(snapshots) {
    const map = new Map();
    snapshots.forEach(s => {
        const gid = parseInt(s.group_id, 10);
        if (!gid || gid <= 0) return;
        if (!map.has(gid)) map.set(gid, []);
        map.get(gid).push({
            members: parseInt(s.members, 10) || 0,
            ts: parseInt(s.ts, 10) || 0,
            name: s.name || '',
            branch: s.branch || '',
            screen_name: s.screen_name || ''
        });
    });
    map.forEach(arr => arr.sort((a, b) => a.ts - b.ts));
    return map;
}

/**
 * Дельта за период: сравнивает текущее значение с последним снимком ДО
 * границы окна. Если старых снимков нет, но есть хотя бы один старше
 * половины окна — используем его как приближённую базу.
 */
function deltaAt(series, windowDays) {
    if (series.length === 0) return null;
    const now = Date.now() / 1000;
    const cutoff = now - windowDays * DAY;
    const current = series[series.length - 1];

    let baseline = null;
    for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].ts <= cutoff) {
            baseline = series[i];
            break;
        }
    }
    if (!baseline && series.length > 1) {
        const oldest = series[0];
        if (oldest.ts < now - (windowDays / 2) * DAY && oldest.ts < current.ts) {
            baseline = oldest;
        }
    }
    if (!baseline) return null;
    return current.members - baseline.members;
}

/**
 * Тренды по каждому сообществу: текущее значение и дельты день/неделя/месяц.
 * @returns {Map<number, object>}
 */
export function computeTrends(seriesMap) {
    const trends = new Map();
    seriesMap.forEach((series, gid) => {
        const last = series[series.length - 1];
        trends.set(gid, {
            gid,
            current: last.members,
            day: deltaAt(series, 1),
            week: deltaAt(series, 7),
            month: deltaAt(series, 30),
            points: series.length,
            firstTs: series[0].ts,
            lastTs: last.ts,
            name: last.name,
            branch: last.branch,
            screen_name: last.screen_name
        });
    });
    return trends;
}

/**
 * Суммарная аудитория по дням (для общего графика).
 * Для каждой даты берём последнее известное значение каждого сообщества.
 */
export function buildTotalByDay(seriesMap) {
    const daySet = new Set();
    seriesMap.forEach(series => series.forEach(s => {
        daySet.add(new Date(s.ts * 1000).toISOString().slice(0, 10));
    }));
    const days = Array.from(daySet).sort();
    if (days.length === 0) return [];

    return days.map(day => {
        const dayEnd = Date.parse(day + 'T23:59:59Z') / 1000;
        let total = 0;
        let known = 0;
        seriesMap.forEach(series => {
            let last = null;
            for (let i = series.length - 1; i >= 0; i--) {
                if (series[i].ts <= dayEnd) {
                    last = series[i];
                    break;
                }
            }
            if (last) {
                total += last.members;
                known++;
            }
        });
        return { day, total, known };
    });
}

// ---------------------------------------------------------------------------
// Сбор свежих данных по каталогу филиалов
// ---------------------------------------------------------------------------

/**
 * Разбирает ссылку вида https://vk.com/xxx на короткое имя или числовой ID.
 */
function parseVkLink(link) {
    const m = /vk\.com\/(?:wall\-?\d+\?|)(club\d+|public\d+|event\d+|[a-zA-Z][\w.]*)/i.exec(String(link));
    if (!m) return null;
    const slug = m[1];
    const num = /^(club|public|event)(\d+)$/i.exec(slug);
    if (num) return { type: 'id', id: parseInt(num[2], 10) };
    return { type: 'screen', name: slug };
}

/**
 * Собирает свежие members_count по всем филиалам из каталога и сохраняет
 * снимки на сервере. Возвращает массив собранных снимков.
 */
export async function collectFreshData(branches, token = '') {
    const targets = [];
    branches.forEach(b => {
        const link = Array.isArray(b.vk_links) ? b.vk_links[0] : b.vk_links;
        if (!link) return;
        const parsed = parseVkLink(link);
        if (!parsed) return;
        const label = `${b.branch_num ? b.branch_num + ' — ' : ''}${b.branch_name || ''}`.trim();
        targets.push({ ...parsed, branch: label });
    });

    if (targets.length === 0) return [];

    // 1. Резолвим короткие имена в числовые ID
    for (const t of targets) {
        if (t.type === 'screen') {
            try {
                const res = await callVkApi('utils.resolveScreenName', { screen_name: t.name }, token);
                if (res && res.type === 'group') {
                    t.id = res.object_id;
                }
            } catch (e) { /* пропускаем неразрешимые */ }
        }
    }

    const ids = targets.filter(t => t.id).map(t => t.id);
    if (ids.length === 0) return [];

    // 2. Массовый запрос подписчиков (по 100 групп за вызов)
    const snapshots = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        try {
            const res = await callVkApi('groups.getById', {
                group_ids: chunk.join(','),
                fields: 'members_count,screen_name'
            }, token);
            const groups = Array.isArray(res) ? res : (res && res.groups ? res.groups : []);
            groups.forEach(g => {
                const src = targets.find(t => t.id === g.id);
                snapshots.push({
                    group_id: g.id,
                    name: g.name || '',
                    screen_name: g.screen_name || '',
                    branch: src ? src.branch : '',
                    members: typeof g.members_count === 'number' ? g.members_count : 0,
                    ts: now
                });
            });
        } catch (e) { /* часть пакета не критична */ }
    }

    if (snapshots.length > 0) {
        await saveSnapshots(snapshots);
    }
    return snapshots;
}

/**
 * Снимки из результатов сканирования (авто-сохранение после поиска).
 * @param {Array} targetsInfo — разрешённые цели сканирования
 * @param {Function|null} branchResolver — (targetInfo) → подпись филиала
 */
export function snapshotsFromScan(targetsInfo, branchResolver) {
    const now = Math.floor(Date.now() / 1000);
    const out = [];
    targetsInfo.forEach(t => {
        if (!t || typeof t.id !== 'number') return;
        const gid = Math.abs(t.id);
        if (gid <= 0 || typeof t.members_count !== 'number') return;
        out.push({
            group_id: gid,
            name: t.name || '',
            screen_name: t.screen_name || '',
            branch: branchResolver ? (branchResolver(t) || '') : '',
            members: t.members_count,
            ts: now
        });
    });
    return out;
}

// ---------------------------------------------------------------------------
// Рендер вкладки
// ---------------------------------------------------------------------------
function fmtDelta(v) {
    if (v === null || v === undefined) return '<span class="delta na" title="Это первый снимок — базовая точка. Изменения появятся со следующего сканирования.">база</span>';
    if (v > 0) return `<span class="delta up">+${v.toLocaleString('ru-RU')}</span>`;
    if (v < 0) return `<span class="delta down">−${Math.abs(v).toLocaleString('ru-RU')}</span>`;
    return '<span class="delta zero">±0</span>';
}

function fmtDate(ts) {
    return new Date(ts * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderChart(points) {
    if (points.length < 2) {
        return `<div class="subs-chart-empty">
            <span class="material-symbols-outlined">monitoring</span>
            <p>График общей аудитории появится, когда накопится не менее двух дней наблюдений.<br>
            Снимки сохраняются автоматически после каждого сканирования и по кнопке «Снять свежие показатели».</p>
        </div>`;
    }

    const W = 860, H = 240, PAD_L = 64, PAD_R = 20, PAD_T = 18, PAD_B = 34;
    const values = points.map(p => p.total);
    let min = Math.min(...values), max = Math.max(...values);
    if (max === min) { max += 1; min = Math.max(0, min - 1); }
    const span = max - min;
    const pad = Math.max(1, Math.round(span * 0.12));
    min = Math.max(0, min - pad);
    max = max + pad;

    const x = i => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
    const y = v => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B);

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${x(points.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)} L${PAD_L},${(H - PAD_B).toFixed(1)} Z`;

    // Сетка: 4 горизонтальных уровня
    let grid = '';
    for (let g = 0; g <= 4; g++) {
        const v = min + (g / 4) * (max - min);
        const yy = y(v);
        grid += `<line x1="${PAD_L}" y1="${yy.toFixed(1)}" x2="${W - PAD_R}" y2="${yy.toFixed(1)}" class="subs-grid-line"/>` +
                `<text x="${PAD_L - 8}" y="${(yy + 4).toFixed(1)}" class="subs-grid-label" text-anchor="end">${Math.round(v).toLocaleString('ru-RU')}</text>`;
    }

    const dots = points.map((p, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="3.2" class="subs-dot">
            <title>${p.day} — ${p.total.toLocaleString('ru-RU')} подписчиков (${p.known} сообществ)</title>
        </circle>`).join('');

    const xLabels = [];
    const step = Math.max(1, Math.ceil(points.length / 7));
    for (let i = 0; i < points.length; i += step) {
        const d = new Date(points[i].day + 'T00:00:00');
        xLabels.push(`<text x="${x(i).toFixed(1)}" y="${H - 10}" class="subs-grid-label" text-anchor="middle">${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</text>`);
    }

    return `<svg viewBox="0 0 ${W} ${H}" class="subs-chart" preserveAspectRatio="none" role="img" aria-label="Динамика суммарной аудитории">
        <defs>
            <linearGradient id="subsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#36d4b4" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#36d4b4" stop-opacity="0.02"/>
            </linearGradient>
        </defs>
        ${grid}
        <path d="${areaPath}" fill="url(#subsAreaGrad)"/>
        <path d="${linePath}" class="subs-line"/>
        ${dots}
        ${xLabels.join('')}
    </svg>`;
}

/**
 * Полный рендер вкладки «Подписчики».
 * @param {HTMLElement} container
 * @param {object} ctx — { history, branches, token, onToast, onCollectDone }
 */
export function renderSubscribersTab(container, ctx = {}) {
    if (!container) return;
    const history = ctx.history || [];
    const seriesMap = buildGroupSeries(history);
    const trends = computeTrends(seriesMap);
    const totalByDay = buildTotalByDay(seriesMap);

    function resolveRowTitle(r) {
        let bName = r.branch || '';
        if (!bName || bName === 'DELETED') {
            const canon = findCanonicalBranch({ id: r.gid, screen_name: r.screen_name, link: r.screen_name ? `https://vk.com/${r.screen_name}` : '' });
            if (canon) bName = canon.canonicalName;
            else if (r.name && r.name !== 'DELETED') bName = r.name;
            else bName = 'Филиал библиотеки';
        }
        return bName;
    }

    const rows = Array.from(trends.values()).map(r => ({
        ...r,
        resolvedBranch: resolveRowTitle(r)
    })).sort((a, b) => {
        return (a.resolvedBranch || '').localeCompare(b.resolvedBranch || '', 'ru', { numeric: true });
    });

    const totalMembers = rows.reduce((s, r) => s + r.current, 0);
    const weekNet = rows.reduce((s, r) => s + (r.week || 0), 0);
    const monthNet = rows.reduce((s, r) => s + (r.month || 0), 0);
    const daysObserved = totalByDay.length;
    const lastPoint = totalByDay.length ? totalByDay[totalByDay.length - 1] : null;
    const isFirstSnapshot = rows.length > 0 && rows.every(r => r.day === null && r.week === null && r.month === null);

    const tableRows = rows.map(r => `
        <tr>
            <td class="subs-branch-cell">
                ${r.screen_name ? `<a href="https://vk.com/${escapeHtml(r.screen_name)}" target="_blank" rel="noopener">${escapeHtml(r.resolvedBranch)}</a>` : escapeHtml(r.resolvedBranch)}
            </td>
            <td class="num">${r.current.toLocaleString('ru-RU')}</td>
            <td class="num">${fmtDelta(r.day)}</td>
            <td class="num">${fmtDelta(r.week)}</td>
            <td class="num">${fmtDelta(r.month)}</td>
            <td class="num muted">${r.points}</td>
            <td class="muted">${fmtDate(r.lastTs)}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="subs-toolbar card no-print">
            <div class="subs-toolbar-left">
                <span class="material-symbols-outlined">manage_history</span>
                <div>
                    <b>История накапливается на сервере</b>
                    <span class="subs-toolbar-hint">Первое сканирование собирает базовые данные по всем филиалам, каждое следующее показывает прирост или отток подписчиков по каждому филиалу (1 снимок на сообщество в день).</span>
                </div>
            </div>
            <div class="subs-toolbar-right">
                <button id="subs-refresh-btn" class="btn btn-primary">
                    <span class="material-symbols-outlined icon">sync</span>
                    <span>Снять свежие показатели</span>
                </button>
            </div>
        </div>

        <div class="subs-kpi-grid">
            <div class="card subs-kpi">
                <span class="material-symbols-outlined subs-kpi-icon">groups</span>
                <div class="subs-kpi-value">${totalMembers.toLocaleString('ru-RU')}</div>
                <div class="subs-kpi-label">подписчиков суммарно${rows.length ? ` (${rows.length} сообществ)` : ''}</div>
            </div>
            <div class="card subs-kpi">
                <span class="material-symbols-outlined subs-kpi-icon">date_range</span>
                <div class="subs-kpi-value">${daysObserved}</div>
                <div class="subs-kpi-label">${daysObserved === 1 ? 'день наблюдений' : 'дней наблюдений'}${lastPoint ? ` • последний: ${lastPoint.day.split('-').reverse().slice(0, 2).join('.')}` : ''}</div>
            </div>
            <div class="card subs-kpi">
                <span class="material-symbols-outlined subs-kpi-icon">timeline</span>
                <div class="subs-kpi-value">${fmtDelta(rows.some(r => r.week !== null) ? weekNet : null)}</div>
                <div class="subs-kpi-label">чистый прирост за 7 дней</div>
            </div>
            <div class="card subs-kpi">
                <span class="material-symbols-outlined subs-kpi-icon">calendar_month</span>
                <div class="subs-kpi-value">${fmtDelta(rows.some(r => r.month !== null) ? monthNet : null)}</div>
                <div class="subs-kpi-label">чистый прирост за 30 дней</div>
            </div>
        </div>

        ${isFirstSnapshot ? `
        <div class="card subs-first-note">
            <span class="material-symbols-outlined">database</span>
            <div>
                <b>Собрана базовая точка по всем филиалам.</b>
                <span>Это первый снимок — он нужен как точка отсчёта. Со следующего сканирования по каждому филиалу будет виден прирост или отток подписчиков за сутки, неделю и месяц.</span>
            </div>
        </div>` : ''}

        <div class="card subs-chart-card">
            <div class="subs-chart-head">
                <h3><span class="material-symbols-outlined">monitoring</span> Суммарная аудитория филиалов</h3>
            </div>
            ${renderChart(totalByDay)}
        </div>

        <div class="card subs-table-card">
            <div class="subs-chart-head">
                <h3><span class="material-symbols-outlined">table_chart</span> Динамика по филиалам</h3>
            </div>
            ${rows.length === 0 ? `
                <div class="subs-chart-empty">
                    <span class="material-symbols-outlined">inbox</span>
                    <p>Снимков пока нет. Нажмите «Снять свежие показатели» или выполните поиск по филиалам — данные сохранятся автоматически.</p>
                </div>` : `
                <div class="table-responsive">
                    <table class="report-table subs-table">
                        <thead>
                            <tr>
                                <th>Филиал</th>
                                <th>Подписчики</th>
                                <th>За 24 часа</th>
                                <th>За 7 дней</th>
                                <th>За 30 дней</th>
                                <th>Снимков</th>
                                <th>Обновлено</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>`}
        </div>`;

    // Кнопка сбора свежих данных
    const refreshBtn = container.querySelector('#subs-refresh-btn');
    if (refreshBtn && ctx.branches && ctx.branches.length > 0) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            const icon = refreshBtn.querySelector('.icon');
            if (icon) icon.textContent = 'autorenew';
            refreshBtn.classList.add('btn-loading');
            try {
                const snaps = await collectFreshData(ctx.branches, ctx.token || '');
                if (ctx.onToast) ctx.onToast(`Сохранено снимков: ${snaps.length}`, 'group_add');
                const fresh = await fetchHistory();
                if (ctx.onCollectDone) ctx.onCollectDone(fresh);
                renderSubscribersTab(container, { ...ctx, history: fresh });
            } catch (e) {
                if (ctx.onToast) ctx.onToast('Не удалось собрать показатели: ' + e.message, 'error');
                refreshBtn.disabled = false;
                if (icon) icon.textContent = 'sync';
                refreshBtn.classList.remove('btn-loading');
            }
        });
    } else if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.title = 'Каталог филиалов ещё не загружен';
    }

    return trends;
}
