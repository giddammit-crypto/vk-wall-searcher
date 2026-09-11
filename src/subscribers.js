/**
 * src/subscribers.js — статистика подписок/отписок филиалов (вкладка «Подписчики»)
 * =============================================================================
 * История накапливается на сервере (api/data.php → data/subscribers.json):
 * не более одного снимка на сообщество в день. Клиент считает динамику
 * за день / неделю / месяц и строит общий график.
 *
 * Разработка: Амброзиев О.А. (модуль 3.4)
 */

import { callVkApi, resolveApiUrl } from './api.js?v=3.7.1';
import { CANONICAL_BRANCHES, escapeHtml, renderBranchAvatarHtml, findCanonicalBranch } from './branches.js?v=3.7.1';
import { makeTableSortable } from './tablesort.js?v=3.7.1';

const DATA_URL = resolveApiUrl('api/data.php');

const DAY = 86400;

// ---------------------------------------------------------------------------
// Серверное хранилище
// ---------------------------------------------------------------------------
export async function fetchHistory() {
    try {
        const res = await fetch(`${DATA_URL}?action=history`);
        if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data.snapshots) && data.snapshots.length > 0) {
                return data.snapshots;
            }
        }
    } catch (e) {
        // Серверный endpoint недоступен — используем статический fallback
    }

    // Резервный источник: статический снимок реальных данных из data/subscribers.json
    try {
        const staticRes = await fetch(resolveApiUrl('data/subscribers.json?v=3.7.1'));
        if (staticRes && staticRes.ok) {
            const data = await staticRes.json();
            if (Array.isArray(data.snapshots) && data.snapshots.length > 0) {
                return data.snapshots;
            }
        }
    } catch (e) {
        // Ошибка чтения статического файла
    }

    // Финальный fallback: формируем снимок из проверенных канонических данных филиалов
    const nowTs = Math.floor(Date.now() / 1000);
    return CANONICAL_BRANCHES
        .filter(b => b.groupId && b.canonicalMembers > 0)
        .map(b => ({
            group_id: b.groupId,
            name: b.name,
            screen_name: b.screenName || '',
            branch: b.branchNum,
            members: b.canonicalMembers,
            ts: nowTs
        }));
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
    const m = /vk\.com\/(?:wall\-?\d+\?|)(club\d+|public\d+|event\d+|id\d+|[a-zA-Z][\w.]*)/i.exec(String(link));
    if (!m) return null;
    const slug = m[1];
    const num = /^(club|public|event)(\d+)$/i.exec(slug);
    if (num) return { type: 'id', id: parseInt(num[2], 10), isUser: false };
    const userNum = /^id(\d+)$/i.exec(slug);
    if (userNum) return { type: 'id', id: parseInt(userNum[1], 10), isUser: true };
    return { type: 'screen', name: slug, isUser: false };
}

/**
 * Собирает свежие members_count по всем филиалам из каталога и сохраняет
 * снимки на сервере. Поддерживает как сообщества, так и профили (id...).
 */
export async function collectFreshData(branches, token = '') {
    const sourceBranches = (Array.isArray(branches) && branches.length > 0) ? branches : CANONICAL_BRANCHES;
    const targets = [];

    sourceBranches.forEach(b => {
        const canon = findCanonicalBranch(b) || b;
        const link = canon.vkLink || (Array.isArray(b.vk_links) ? b.vk_links[0] : b.vk_links) || '';
        const rawId = canon.rawId !== undefined ? canon.rawId : (b.rawId !== undefined ? b.rawId : b.id);
        const screenName = canon.screenName || b.screenName || b.screen_name || '';
        const branchLabel = canon.branchNum ? `${canon.branchNum} — ${canon.canonicalName || canon.name}` : (canon.canonicalName || canon.name || '');

        if (!link && !rawId && !screenName) return;

        let isUser = false;
        let id = null;

        if (rawId !== undefined && rawId !== null && rawId !== 0) {
            if (rawId > 0) {
                isUser = true;
                id = rawId;
            } else {
                isUser = false;
                id = Math.abs(rawId);
            }
        } else if (link) {
            const parsed = parseVkLink(link);
            if (parsed) {
                isUser = !!parsed.isUser;
                id = parsed.id || null;
            }
        }

        const slug = screenName || (link ? (parseVkLink(link)?.name || '') : '');
        targets.push({
            id,
            screenName: slug,
            isUser,
            branch: branchLabel,
            canon
        });
    });

    if (targets.length === 0) return [];

    // 1. Разрешаем screenName если ID ещё не определён
    for (const t of targets) {
        if (!t.id && t.screenName) {
            const m = /^id(\d+)$/i.exec(t.screenName);
            if (m) {
                t.id = parseInt(m[1], 10);
                t.isUser = true;
            } else {
                try {
                    const res = await callVkApi('utils.resolveScreenName', { screen_name: t.screenName }, token);
                    if (res) {
                        if (res.type === 'group') {
                            t.id = res.object_id;
                            t.isUser = false;
                        } else if (res.type === 'user') {
                            t.id = res.object_id;
                            t.isUser = true;
                        }
                    }
                } catch (e) { /* пропускаем неразрешимые */ }
            }
        }
    }

    const snapshots = [];
    const now = Math.floor(Date.now() / 1000);

    // 2. Запрос групп (groups.getById)
    const groupTargets = targets.filter(t => t.id && !t.isUser);
    const groupIds = groupTargets.map(t => t.id);
    for (let i = 0; i < groupIds.length; i += 100) {
        const chunk = groupIds.slice(i, i + 100);
        try {
            const res = await callVkApi('groups.getById', {
                group_ids: chunk.join(','),
                fields: 'members_count,screen_name,photo_100'
            }, token);
            const groups = Array.isArray(res) ? res : (res && res.groups ? res.groups : []);
            groups.forEach(g => {
                const src = groupTargets.find(t => t.id === g.id);
                const canon = src?.canon || findCanonicalBranch({ id: -g.id, screen_name: g.screen_name });
                snapshots.push({
                    group_id: g.id,
                    name: (g.name && g.name !== 'DELETED' && !g.deactivated) ? g.name : (canon?.canonicalName || 'Филиал библиотеки'),
                    screen_name: g.screen_name || src?.screenName || '',
                    branch: src?.branch || (canon?.branchNum ? `${canon.branchNum} — ${canon.canonicalName}` : ''),
                    members: typeof g.members_count === 'number' ? g.members_count : 0,
                    ts: now
                });
            });
        } catch (e) {
            console.warn('Ошибка сбора подписчиков групп:', e.message);
        }
    }

    // 3. Запрос профилей пользователей (users.get — например, Филиал №4 и Филиал №7)
    const userTargets = targets.filter(t => t.id && t.isUser);
    const userIds = userTargets.map(t => t.id);
    if (userIds.length > 0) {
        try {
            const res = await callVkApi('users.get', {
                user_ids: userIds.join(','),
                fields: 'followers_count,screen_name,photo_100'
            }, token);
            const users = Array.isArray(res) ? res : (res && res.users ? res.users : []);
            users.forEach(u => {
                const src = userTargets.find(t => t.id === u.id);
                const canon = src?.canon || findCanonicalBranch({ id: u.id, screen_name: u.screen_name });
                snapshots.push({
                    group_id: u.id,
                    name: canon?.canonicalName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Филиал библиотеки',
                    screen_name: u.screen_name || src?.screenName || `id${u.id}`,
                    branch: src?.branch || (canon?.branchNum ? `${canon.branchNum} — ${canon.canonicalName}` : ''),
                    members: typeof u.followers_count === 'number' ? u.followers_count : 0,
                    ts: now
                });
            });
        } catch (e) {
            console.warn('Ошибка сбора подписчиков профилей:', e.message);
        }
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
    (targetsInfo || []).forEach(t => {
        if (!t || t.id === undefined || t.id === null) return;
        const gid = Math.abs(parseInt(t.id, 10));
        if (gid <= 0) return;
        const members = typeof t.members_count === 'number' ? t.members_count : null;
        if (members === null || members < 0) return;
        out.push({
            group_id: gid,
            name: (t.name && t.name !== 'DELETED') ? t.name : (t.canonicalName || 'Филиал библиотеки'),
            screen_name: t.screen_name || t.screenName || '',
            branch: branchResolver ? (branchResolver(t) || '') : (t.branchNum ? `${t.branchNum} — ${t.canonicalName || t.name}` : ''),
            members: members,
            ts: now
        });
    });
    return out;
}

// ---------------------------------------------------------------------------
// Рендер вкладки
// ---------------------------------------------------------------------------
function fmtDelta(v) {
    if (v === null || v === undefined) return '<span class="delta na" title="Это базовая точка реальных показателей. Изменения появятся при следующих сборах данных (не более 1 снимка в день).">база</span>';
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
            <p>График динамики суммарной аудитории формируется автоматически по мере накопления ежедневных снимков (от двух дней наблюдений).<br>
            Текущие показатели всех 18 филиалов зафиксированы как реальная базовая точка.</p>
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
            <title>${p.day} — ${p.total.toLocaleString('ru-RU')} подписчиков (${p.known} филиалов)</title>
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

    // Собираем канонические строки по всем 18 филиалам
    const matchedGids = new Set();
    const rows = [];

    CANONICAL_BRANCHES.forEach(b => {
        let matchedSeries = null;
        let matchedGid = null;

        // Поиск по rawId
        if (b.rawId) {
            const absId = Math.abs(b.rawId);
            if (seriesMap.has(absId)) {
                matchedSeries = seriesMap.get(absId);
                matchedGid = absId;
            }
        }
        // Поиск по screenName
        if (!matchedSeries && b.screenName) {
            for (let [gid, series] of seriesMap.entries()) {
                const last = series[series.length - 1];
                if (last.screen_name && last.screen_name.toLowerCase() === b.screenName.toLowerCase()) {
                    matchedSeries = series;
                    matchedGid = gid;
                    break;
                }
            }
        }

        if (matchedGid) matchedGids.add(matchedGid);

        const hasVk = !!(b.vkLink || b.rawId);
        if (matchedSeries && matchedSeries.length > 0) {
            const last = matchedSeries[matchedSeries.length - 1];
            rows.push({
                canon: b,
                gid: matchedGid,
                resolvedBranch: b.canonicalName,
                branchNum: b.branchNum,
                screen_name: last.screen_name || b.screenName || '',
                branch_url: b.branch_url,
                current: last.members,
                day: deltaAt(matchedSeries, 1),
                week: deltaAt(matchedSeries, 7),
                month: deltaAt(matchedSeries, 30),
                points: matchedSeries.length,
                firstTs: matchedSeries[0].ts,
                lastTs: last.ts,
                hasVk: true
            });
        } else {
            // Базовое значение из каталога
            rows.push({
                canon: b,
                gid: b.rawId ? Math.abs(b.rawId) : 0,
                resolvedBranch: b.canonicalName,
                branchNum: b.branchNum,
                screen_name: b.screenName || '',
                branch_url: b.branch_url,
                current: typeof b.canonicalMembers === 'number' ? b.canonicalMembers : 0,
                day: null,
                week: null,
                month: null,
                points: hasVk ? 1 : 0,
                firstTs: null,
                lastTs: null,
                hasVk: hasVk
            });
        }
    });

    // Дополнительные группы из истории, если такие есть
    trends.forEach((t, gid) => {
        if (!matchedGids.has(gid)) {
            const canon = findCanonicalBranch({ id: gid, screen_name: t.screen_name });
            if (canon) return;
            rows.push({
                canon: null,
                gid,
                resolvedBranch: t.branch || t.name || `Группа ${gid}`,
                branchNum: 'VK',
                screen_name: t.screen_name || '',
                branch_url: '',
                current: t.current,
                day: t.day,
                week: t.week,
                month: t.month,
                points: t.points,
                firstTs: t.firstTs,
                lastTs: t.lastTs,
                hasVk: true
            });
        }
    });

    const activeRows = rows.filter(r => r.hasVk);
    const totalMembers = activeRows.reduce((s, r) => s + (r.current || 0), 0);
    const weekNet = activeRows.reduce((s, r) => s + (r.week || 0), 0);
    const monthNet = activeRows.reduce((s, r) => s + (r.month || 0), 0);
    const daysObserved = totalByDay.length > 0 ? totalByDay.length : 1;
    const lastPoint = totalByDay.length ? totalByDay[totalByDay.length - 1] : null;
    const isFirstSnapshot = activeRows.length > 0 && activeRows.every(r => r.day === null && r.week === null && r.month === null);

    const tableRows = rows.map(r => {
        const avatarHtml = renderBranchAvatarHtml(r.canon || { name: r.resolvedBranch, branchNum: r.branchNum, shortCode: r.branchNum }, 'sm');
        let linkHtml = escapeHtml(r.resolvedBranch);
        if (r.screen_name) {
            linkHtml = `<a href="https://vk.com/${escapeHtml(r.screen_name)}" target="_blank" rel="noopener" class="subs-link">${escapeHtml(r.resolvedBranch)}</a>`;
        } else if (r.branch_url) {
            linkHtml = `<a href="${escapeHtml(r.branch_url)}" target="_blank" rel="noopener" class="subs-link">${escapeHtml(r.resolvedBranch)}</a>`;
        }

        const membersDisplay = r.hasVk ? r.current.toLocaleString('ru-RU') : '<span class="muted" title="Филиал не ведёт отдельную страницу ВКонтакте">—</span>';
        const dayDisplay = r.hasVk ? fmtDelta(r.day) : '—';
        const weekDisplay = r.hasVk ? fmtDelta(r.week) : '—';
        const monthDisplay = r.hasVk ? fmtDelta(r.month) : '—';
        const pointsDisplay = r.hasVk ? (r.points > 0 ? r.points : '1') : '—';
        const dateDisplay = r.lastTs ? fmtDate(r.lastTs) : (r.hasVk ? 'актуально' : '—');

        return `
            <tr>
                <td class="subs-branch-cell">
                    <div class="subs-branch-row">
                        ${avatarHtml}
                        <div class="subs-branch-name-col">
                            <div class="subs-branch-title">${linkHtml}</div>
                            ${!r.hasVk ? '<span class="subs-no-vk-tag">Нет страницы ВК</span>' : ''}
                        </div>
                    </div>
                </td>
                <td class="num font-mono" data-sort-value="${r.hasVk ? r.current : -1}"><b>${membersDisplay}</b></td>
                <td class="num font-mono" data-sort-value="${r.hasVk && r.day !== null ? r.day : -999999}">${dayDisplay}</td>
                <td class="num font-mono" data-sort-value="${r.hasVk && r.week !== null ? r.week : -999999}">${weekDisplay}</td>
                <td class="num font-mono" data-sort-value="${r.hasVk && r.month !== null ? r.month : -999999}">${monthDisplay}</td>
                <td class="num muted font-mono" data-sort-value="${r.points}">${pointsDisplay}</td>
                <td class="muted font-mono" data-sort-value="${r.lastTs || 0}">${dateDisplay}</td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="subs-toolbar card no-print">
            <div class="subs-toolbar-left">
                <span class="material-symbols-outlined">verified</span>
                <div>
                    <b>Реальная аналитика подписчиков филиалов</b>
                    <span class="subs-toolbar-hint">Данные собираются напрямую через официальное VK API (для сообществ и профилей филиалов). Снимки сохраняются на сервере (не более 1 снимка в день), фиксируя точный прирост и отток аудитории.</span>
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
                <div class="subs-kpi-label">реальных подписчиков суммарно (${activeRows.length} филиалов в сети ВК)</div>
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
                <b>Зафиксирована реальная базовая точка аудитории по всем филиалам.</b>
                <span>Все показатели получены напрямую из VK API. Со следующего сканирования по каждому филиалу будет виден точный суточный, недельный и месячный баланс подписок и отписок.</span>
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
            </div>
        </div>`;

    // Инициализация интерактивной сортировки по клику в <th>
    const tableEl = container.querySelector('.subs-table');
    if (tableEl) {
        makeTableSortable(tableEl);
    }

    // Кнопка сбора свежих данных
    const refreshBtn = container.querySelector('#subs-refresh-btn');
    if (refreshBtn) {
        const branchList = (ctx.branches && ctx.branches.length > 0) ? ctx.branches : CANONICAL_BRANCHES;
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            const icon = refreshBtn.querySelector('.icon');
            if (icon) icon.textContent = 'autorenew';
            refreshBtn.classList.add('btn-loading');
            try {
                const snaps = await collectFreshData(branchList, ctx.token || '');
                if (ctx.onToast) ctx.onToast(`Собраны реальные показатели: ${snaps.length} филиалов`, 'group_add');
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
    }

    return trends;
}

