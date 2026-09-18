/**
 * src/league.js — «Лига филиалов»: Геймификация и рейтинг активности (AURORA v4.24.2)
 * =============================================================================
 * Внутренняя система соревнований и признания библиотек Владимира:
 *   • XP Engine (0–1000 очков опыта) на основе данных сканирования и радара
 *   • 4 Дивизиона: Высшая Космическая Лига, Золотой, Серебряный, Орбитальный старт
 *   • Авторские бейджи и титулы от Космо («Мастер виральности», «Гроза умной ленты» и др.)
 *   • Персональные вердикты и точки роста от Космо для каждого филиала
 *   • Печать официального наградного диплома А4 для филиалов-победителей
 *
 * Разработка: Амброзиев О.А.
 */

import { CANONICAL_BRANCHES, escapeHtml } from './branches.js?v=4.23.3';
import { computeAllRadarScores } from './radar.js?v=4.23.2';

export const LEAGUE_DIVISIONS = {
    cosmic: {
        id: 'cosmic',
        name: 'Высшая Космическая Лига',
        badgeIcon: 'rocket_launch',
        minXp: 760,
        color: '#38bdf8',
        accentGradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #c084fc 100%)',
        desc: 'Элита библиотечной сети: стабильно высокий охват, виральность и живой диалог с читателями.'
    },
    gold: {
        id: 'gold',
        name: 'Золотой Дивизион',
        badgeIcon: 'workspace_premium',
        minXp: 620,
        color: '#fbbf24',
        accentGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fbbf24 100%)',
        desc: 'Уверенные лидеры: регулярный постинг, сильный авторский контент и стабильный интерес аудитории.'
    },
    silver: {
        id: 'silver',
        name: 'Серебряный Дивизион',
        badgeIcon: 'military_tech',
        minXp: 460,
        color: '#94a3b8',
        accentGradient: 'linear-gradient(135deg, #475569 0%, #64748b 50%, #cbd5e1 100%)',
        desc: 'Крепкий костяк сети: хороший потенциал роста, требуется усиление интерактива и мультимедиа.'
    },
    ascent: {
        id: 'ascent',
        name: 'Орбитальный Старт',
        badgeIcon: 'flight_takeoff',
        minXp: 0,
        color: '#34d399',
        accentGradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #6ee7b7 100%)',
        desc: 'Зона активного роста: отличная возможность внедрить новые форматы и быстро подняться в рейтинге.'
    }
};

export const COSMO_AWARDS = {
    viral_master: {
        id: 'viral_master',
        title: 'Мастер виральности недели',
        icon: 'local_fire_department',
        emoji: '🔥',
        desc: 'Наивысший коэффициент вовлечённости (ER) читателей во всей библиотечной сети',
        color: '#f97316'
    },
    steady_rhythm: {
        id: 'steady_rhythm',
        title: 'Самый стабильный постинг',
        icon: 'event_repeat',
        emoji: '⏱️',
        desc: 'Абсолютная ритмичность и регулярность публикаций без провалов в графике',
        color: '#38bdf8'
    },
    feed_storm: {
        id: 'feed_storm',
        title: 'Гроза умной ленты',
        icon: 'bolt',
        emoji: '⚡',
        desc: 'Рекордный средний охват просмотров на публикацию — умная лента благоволит филиалу',
        color: '#eab308'
    },
    pure_author: {
        id: 'pure_author',
        title: 'Чистый авторский слог',
        icon: 'edit_note',
        emoji: '✍️',
        desc: '100% оригинальный контент без заимствований и сторонних репостов',
        color: '#a855f7'
    },
    media_genius: {
        id: 'media_genius',
        title: 'Мультимедийный гений',
        icon: 'movie_filter',
        emoji: '🎨',
        desc: 'Лидер по внедрению видео, опросов, клипов и эстетичных фотоподборок',
        color: '#ec4899'
    },
    community_heart: {
        id: 'community_heart',
        title: 'Сердце сообщества',
        icon: 'forum',
        emoji: '💬',
        desc: 'Максимальное количество живых комментариев и обсуждений с читателями',
        color: '#10b981'
    },
    star_breakthrough: {
        id: 'star_breakthrough',
        title: 'Главный прорыв недели',
        icon: 'stars',
        emoji: '🌟',
        desc: 'Наивысшая отдача аудитории на единицу подписной базы (эффективность филиала)',
        color: '#6366f1'
    }
};

/**
 * Рассчитывает рейтинг Лиги филиалов на основе данных сканирования и радарных метрик
 */
export function computeBranchLeague(groupsStats = [], posts = []) {
    if (!Array.isArray(groupsStats) || groupsStats.length === 0) return [];

    const radarScores = computeAllRadarScores(groupsStats, posts);

    // Группировка комментариев и постов
    const commentCounts = new Map();
    posts.forEach(p => {
        const tInfo = p.targetInfo || p.canonicalBranch || {};
        const code = tInfo.shortCode || p.canonicalBranch?.shortCode || p.sourceName || String(p.owner_id);
        const comms = p.comments?.count || p.commentsCount || 0;
        commentCounts.set(code, (commentCounts.get(code) || 0) + comms);
    });

    const entries = [];

    groupsStats.forEach((stat, idx) => {
        const targetInfo = stat.info || stat.targetInfo || stat;
        const canonical = targetInfo.canonicalBranch || targetInfo.branch || targetInfo;
        const code = String(canonical.shortCode || targetInfo.shortCode || targetInfo.id || stat.id || `Ф-${idx + 1}`);
        const name = canonical.canonicalName || targetInfo.canonicalName || targetInfo.name || `Филиал ${code}`;
        const avatar = canonical.avatar || targetInfo.avatar || '';

        const r = radarScores.get(code) || {
            regularity: 50,
            engagement: 50,
            originality: 70,
            multimedia: 40,
            events: 40,
            reach: 50,
            raw: { totalPosts: stat.postsCount || 0, erVal: stat.er || 0, originalRatio: 0.8, avgViews: 200 }
        };

        const totalPosts = stat.postsCount || r.raw?.totalPosts || 0;
        const erVal = parseFloat(stat.erViews ?? stat.erPosts ?? stat.er ?? r.raw?.erVal ?? 0) || 0;
        const totalViews = stat.views || stat.totalViews || (r.raw?.avgViews ? r.raw.avgViews * totalPosts : 0);
        const avgViews = stat.avgViews || (totalPosts > 0 ? Math.round(totalViews / totalPosts) : 200);
        const comments = commentCounts.get(code) || 0;
        const members = canonical.canonicalMembers || targetInfo.canonicalMembers || 1200;

        // Расчёт очков опыта (XP 0..1000)
        let xp = Math.round(
            (r.regularity * 2.1) +
            (r.engagement * 2.6) +
            (r.reach * 2.0) +
            (r.originality * 1.5) +
            (r.multimedia * 0.9) +
            (r.events * 0.9)
        );

        // Бонусы активности
        if (totalPosts >= 20) xp += 30;
        if (erVal >= 3.5) xp += 35;
        if (comments >= 15) xp += 25;
        if (r.originality >= 95) xp += 20;

        xp = Math.max(120, Math.min(995, xp));

        // Определение дивизиона
        let division = LEAGUE_DIVISIONS.ascent;
        if (xp >= LEAGUE_DIVISIONS.cosmic.minXp) {
            division = LEAGUE_DIVISIONS.cosmic;
        } else if (xp >= LEAGUE_DIVISIONS.gold.minXp) {
            division = LEAGUE_DIVISIONS.gold;
        } else if (xp >= LEAGUE_DIVISIONS.silver.minXp) {
            division = LEAGUE_DIVISIONS.silver;
        }

        entries.push({
            code,
            name,
            shortName: canonical.shortCode || code,
            canonical,
            avatar,
            members,
            totalPosts,
            erVal,
            totalViews,
            avgViews,
            comments,
            radar: r,
            xp,
            division,
            awards: [],
            cosmoTip: ''
        });
    });

    // Сортировка по убыванию XP
    entries.sort((a, b) => b.xp - a.xp);

    // Присвоение мест
    entries.forEach((e, idx) => {
        e.rank = idx + 1;
    });

    // Присуждение наград и бейджей от Космо
    if (entries.length > 0) {
        // 1. Мастер виральности (топ ER)
        const topEr = [...entries].sort((a, b) => b.erVal - a.erVal)[0];
        if (topEr && topEr.erVal > 1.5) topEr.awards.push(COSMO_AWARDS.viral_master);

        // 2. Самый стабильный постинг (топ регулярность)
        const topReg = [...entries].sort((a, b) => b.radar.regularity - a.radar.regularity)[0];
        if (topReg && topReg.totalPosts >= 10) topReg.awards.push(COSMO_AWARDS.steady_rhythm);

        // 3. Гроза умной ленты (топ просмотры на пост)
        const topViews = [...entries].sort((a, b) => b.avgViews - a.avgViews)[0];
        if (topViews && topViews.avgViews > 250) topViews.awards.push(COSMO_AWARDS.feed_storm);

        // 4. Чистый авторский слог (100% авторский)
        const topOrig = entries.find(e => e.radar.originality >= 95 && e.totalPosts >= 6);
        if (topOrig) topOrig.awards.push(COSMO_AWARDS.pure_author);

        // 5. Мультимедийный гений
        const topMedia = [...entries].sort((a, b) => b.radar.multimedia - a.radar.multimedia)[0];
        if (topMedia && topMedia.radar.multimedia >= 70) topMedia.awards.push(COSMO_AWARDS.media_genius);

        // 6. Сердце сообщества (топ комментарии)
        const topComm = [...entries].sort((a, b) => b.comments - a.comments)[0];
        if (topComm && topComm.comments >= 5) topComm.awards.push(COSMO_AWARDS.community_heart);

        // 7. Главный прорыв
        const sortedByEff = [...entries].sort((a, b) => (b.avgViews / (b.members || 1)) - (a.avgViews / (a.members || 1)));
        const breakthrough = sortedByEff.find(e => !e.awards.includes(COSMO_AWARDS.viral_master));
        if (breakthrough) breakthrough.awards.push(COSMO_AWARDS.star_breakthrough);
    }

    // Формирование персонального вердикта Космо для каждого филиала
    entries.forEach(e => {
        e.cosmoVerdict = generateCosmoVerdict(e);
    });

    return entries;
}

function generateCosmoVerdict(entry) {
    const { rank, erVal, totalPosts, radar, division } = entry;

    if (rank === 1) {
        return `🚀 **Флагман сети!** Великолепная вовлечённость (${erVal.toFixed(2)}%) и плотный контакт с читателями. Так держать, Космо гордится вами! ✨`;
    }
    if (division.id === 'cosmic') {
        return `🌟 **Космический класс!** Превосходные показатели охвата. Рекомендация Космо: добавьте интерактивный опрос в пятницу для закрепления успеха.`;
    }
    if (division.id === 'gold') {
        if (radar.engagement < 65) {
            return `💡 **Золотой уровень с точкой роста:** посты выходят отлично, но не хватает вопросов в конце текста для вызова читателей на диалог.`;
        }
        return `✨ **Уверенное лидерство!** Сильные авторские материалы. Для рывка в Высшую Лигу увеличьте число коротких видео и клипов.`;
    }
    if (division.id === 'silver') {
        if (totalPosts < 8) {
            return `⏱️ **Нужна ритмичность:** читатели ждут новинки! Увеличьте темп хотя бы до 3–4 постов в неделю, и рейтинг взлетит.`;
        }
        return `📈 **Хороший базис!** Космо рекомендует использовать карточки с цитатами и обложками книг вместо сплошного текста.`;
    }
    // ascent
    return `🌱 **Зона стремительного взлёта!** Загляните в пресеты чата с Космо: выберите готовый контент-план на 7 дней и запустите викторину! 🚀`;
}

/**
 * Рендерит интерактивный дашборд Лиги филиалов
 */
export function renderLeagueDashboard(container, leagueEntries = []) {
    if (!container) return;

    if (!Array.isArray(leagueEntries) || leagueEntries.length === 0) {
        container.innerHTML = `
            <div class="league-empty-card card">
                <div class="league-empty-icon">
                    <span class="material-symbols-outlined">emoji_events</span>
                </div>
                <h3>Данные Лиги филиалов ещё не сформированы</h3>
                <p>Выполните сканирование публикаций сообществ, чтобы Космо рассчитал рейтинг активности и распределил награды.</p>
            </div>
        `;
        return;
    }

    const cosmicCount = leagueEntries.filter(e => e.division.id === 'cosmic').length;
    const goldCount = leagueEntries.filter(e => e.division.id === 'gold').length;
    const silverCount = leagueEntries.filter(e => e.division.id === 'silver').length;
    const ascentCount = leagueEntries.filter(e => e.division.id === 'ascent').length;

    container.innerHTML = `
        <div class="league-dashboard-wrap card">
            <!-- Шапка Лиги -->
            <div class="league-header">
                <div class="league-header-left">
                    <div class="league-icon-badge">
                        <span class="material-symbols-outlined">trophy</span>
                    </div>
                    <div>
                        <div class="league-title-row">
                            <h2 class="league-title">Лига филиалов библиотек Владимира</h2>
                            <span class="league-live-tag">
                                <span class="pulse-dot"></span>
                                Сезон активности 2026
                            </span>
                        </div>
                        <p class="league-subtitle">
                            Геймифицированный мониторинг SMM-активности 16 филиалов. Рассчитано роботом Космо по 6 осям вовлечённости.
                        </p>
                    </div>
                </div>
                <div class="league-header-actions">
                    <button type="button" class="btn btn-secondary btn-sm" data-league-ask-cosmo>
                        <span class="material-symbols-outlined icon">chat</span>
                        <span>Вердикт Космо</span>
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" data-league-print-top>
                        <span class="material-symbols-outlined icon">print</span>
                        <span>Диплом лидера</span>
                    </button>
                </div>
            </div>

            <!-- Фильтры дивизионов -->
            <div class="league-division-filter">
                <button type="button" class="league-filter-btn active" data-filter-div="all">
                    <span>Все филиалы</span>
                    <span class="filter-count">${leagueEntries.length}</span>
                </button>
                <button type="button" class="league-filter-btn filter-cosmic" data-filter-div="cosmic">
                    <span class="material-symbols-outlined filter-ico">rocket_launch</span>
                    <span>Высшая Лига</span>
                    <span class="filter-count">${cosmicCount}</span>
                </button>
                <button type="button" class="league-filter-btn filter-gold" data-filter-div="gold">
                    <span class="material-symbols-outlined filter-ico">workspace_premium</span>
                    <span>Золотой</span>
                    <span class="filter-count">${goldCount}</span>
                </button>
                <button type="button" class="league-filter-btn filter-silver" data-filter-div="silver">
                    <span class="material-symbols-outlined filter-ico">military_tech</span>
                    <span>Серебряный</span>
                    <span class="filter-count">${silverCount}</span>
                </button>
                <button type="button" class="league-filter-btn filter-ascent" data-filter-div="ascent">
                    <span class="material-symbols-outlined filter-ico">flight_takeoff</span>
                    <span>Орбитальный</span>
                    <span class="filter-count">${ascentCount}</span>
                </button>
            </div>

            <!-- Турнирная сетка карточек -->
            <div class="league-roster" id="league-roster-list">
                ${leagueEntries.map(entry => renderLeagueRow(entry)).join('')}
            </div>
        </div>
    `;

    bindLeagueEvents(container, leagueEntries);
}

function renderLeagueRow(entry) {
    const { rank, code, name, avatar, xp, division, awards, erVal, avgViews, totalPosts, cosmoVerdict } = entry;

    const rankBadgeClass = rank === 1 ? 'rank-gold' : (rank === 2 ? 'rank-silver' : (rank === 3 ? 'rank-bronze' : 'rank-regular'));
    const rankLabel = rank === 1 ? '🥇 1' : (rank === 2 ? '🥈 2' : (rank === 3 ? '🥉 3' : `#${rank}`));

    const xpPercent = Math.min(100, Math.round((xp / 1000) * 100));

    return `
        <div class="league-card division-${division.id}" data-division="${division.id}">
            <!-- Место и аватар -->
            <div class="league-card-rank-col">
                <div class="league-rank-badge ${rankBadgeClass}">${rankLabel}</div>
                <div class="league-avatar-wrap">
                    ${avatar 
                        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(code)}" class="league-avatar-img" />`
                        : `<div class="league-avatar-placeholder">${escapeHtml(code)}</div>`
                    }
                </div>
            </div>

            <!-- Инфо филиала -->
            <div class="league-card-main-col">
                <div class="league-branch-top-line">
                    <h3 class="league-branch-name">${escapeHtml(name)}</h3>
                    <span class="league-div-pill div-pill-${division.id}">
                        <span class="material-symbols-outlined">${division.badgeIcon}</span>
                        ${division.name}
                    </span>
                </div>

                <!-- Шкала опыта (XP) -->
                <div class="league-xp-bar-wrap">
                    <div class="league-xp-labels">
                        <span class="league-xp-val"><strong>${xp}</strong> XP</span>
                        <span class="league-xp-max">Цель: 1000 XP</span>
                    </div>
                    <div class="league-progress-track">
                        <div class="league-progress-fill div-fill-${division.id}" style="width: ${xpPercent}%"></div>
                    </div>
                </div>

                <!-- Мини-показатели -->
                <div class="league-mini-stats">
                    <span class="mini-stat-pill" title="Вовлечённость читателей">
                        <span class="material-symbols-outlined stat-icon">trending_up</span>
                        ER: <strong>${erVal.toFixed(2)}%</strong>
                    </span>
                    <span class="mini-stat-pill" title="Суммарный охват просмотров за период">
                        <span class="material-symbols-outlined stat-icon">visibility</span>
                        <strong>${totalViews.toLocaleString('ru-RU')}</strong> охват
                    </span>
                    <span class="mini-stat-pill" title="Публикаций за период">
                        <span class="material-symbols-outlined stat-icon">article</span>
                        <strong>${totalPosts}</strong> постов
                    </span>
                </div>

                <!-- Награды от Космо (Бейджи) -->
                ${awards.length > 0 ? `
                    <div class="league-awards-strip">
                        ${awards.map(aw => `
                            <span class="league-award-badge" title="${escapeHtml(aw.desc)}" style="--award-color: ${aw.color}">
                                <span class="award-emoji">${aw.emoji}</span>
                                <span class="award-title">${escapeHtml(aw.title)}</span>
                            </span>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Вердикт Космо -->
                <div class="league-cosmo-tip">
                    <span class="material-symbols-outlined cosmo-tip-ico">smart_toy</span>
                    <div class="cosmo-tip-text">${mdToHtml(cosmoVerdict)}</div>
                </div>
            </div>

            <!-- Действия -->
            <div class="league-card-actions-col">
                <button type="button" class="btn btn-tonal btn-sm league-diploma-btn" data-print-diploma="${escapeHtml(code)}" title="Распечатать наградной диплом для информационного стенда">
                    <span class="material-symbols-outlined icon">workspace_premium</span>
                    <span>Диплом</span>
                </button>
            </div>
        </div>
    `;
}

function mdToHtml(md) {
    if (!md) return '';
    return escapeHtml(md)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function bindLeagueEvents(container, leagueEntries) {
    // Фильтрация по дивизионам
    const filterBtns = container.querySelectorAll('.league-filter-btn');
    const rosterCards = container.querySelectorAll('.league-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const div = btn.getAttribute('data-filter-div');
            rosterCards.forEach(card => {
                if (div === 'all' || card.getAttribute('data-division') === div) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Кнопка печати диплома конкретного филиала
    container.querySelectorAll('[data-print-diploma]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.getAttribute('data-print-diploma');
            const entry = leagueEntries.find(it => it.code === code);
            if (entry) {
                printLeagueDiploma(entry, leagueEntries);
            }
        });
    });

    // Кнопка печати диплома победителя
    const printTopBtn = container.querySelector('[data-league-print-top]');
    if (printTopBtn && leagueEntries.length > 0) {
        printTopBtn.addEventListener('click', () => {
            printLeagueDiploma(leagueEntries[0], leagueEntries);
        });
    }

    // Кнопка запроса вердикта Космо в чате
    const askCosmoBtn = container.querySelector('[data-league-ask-cosmo]');
    if (askCosmoBtn) {
        askCosmoBtn.addEventListener('click', () => {
            const mascot = window.__AURORA_MASCOT__;
            if (mascot && typeof mascot.openCosmoChat === 'function') {
                const topWinner = leagueEntries[0];
                const prompt = `Космо, проведи методический разбор Лиги филиалов за текущий период. Лидер рейтинга — ${topWinner.name} (#1, ${topWinner.xp} XP). Разбери ТОП-3 филиала и дай 3 совета для филиалов из зоны Орбитального старта, как им набрать очки!`;
                mascot.openCosmoChat(prompt);
            }
        });
    }
}

/**
 * Печатает официальный наградной диплом филиала А4
 */
export function printLeagueDiploma(entry, allEntries = []) {
    const win = window.open('', '_blank', 'width=960,height=1200');
    if (!win) {
        alert('Пожалуйста, разрешите всплывающие окна в браузере для печати диплома.');
        return;
    }

    const { rank, name, xp, division, awards, erVal, totalViews, totalPosts } = entry;
    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const awardsHtml = awards.map(a => `
        <div class="diploma-award-item">
            <span class="diploma-award-emoji">${a.emoji}</span>
            <div>
                <strong>${escapeHtml(a.title)}</strong>
                <p>${escapeHtml(a.desc)}</p>
            </div>
        </div>
    `).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Наградной диплом — ${escapeHtml(name)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Montserrat', -apple-system, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .diploma-sheet {
            width: 210mm;
            height: 297mm;
            background: #ffffff;
            position: relative;
            padding: 16mm 18mm 14mm 18mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        /* Декоративная двойная рамка */
        .diploma-border-outer {
            position: absolute;
            inset: 8mm;
            border: 2px solid #0284c7;
            pointer-events: none;
        }
        .diploma-border-inner {
            position: absolute;
            inset: 10.5mm;
            border: 1px solid #94a3b8;
            pointer-events: none;
        }
        /* Угловые виньетки */
        .corner-accent {
            position: absolute;
            width: 14mm;
            height: 14mm;
            border-color: #0284c7;
            border-style: solid;
        }
        .corner-tl { top: 7mm; left: 7mm; border-width: 3px 0 0 3px; }
        .corner-tr { top: 7mm; right: 7mm; border-width: 3px 3px 0 0; }
        .corner-bl { bottom: 7mm; left: 7mm; border-width: 0 0 3px 3px; }
        .corner-br { bottom: 7mm; right: 7mm; border-width: 0 3px 3px 0; }

        /* Верхняя шапка */
        .diploma-header {
            text-align: center;
            margin-top: 4mm;
            position: relative;
            z-index: 2;
        }
        .org-sup {
            font-size: 8.5pt;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 2mm;
        }
        .diploma-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 28pt;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 1.5mm;
        }
        .diploma-subtitle {
            font-size: 11pt;
            font-weight: 600;
            color: #0284c7;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        /* Центральный блок награждения */
        .diploma-body {
            text-align: center;
            margin: 6mm 0;
            position: relative;
            z-index: 2;
        }
        .awarded-to-label {
            font-size: 10pt;
            font-style: italic;
            color: #64748b;
            margin-bottom: 3mm;
        }
        .recipient-name {
            font-size: 19pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.25;
            padding: 0 10mm;
            margin-bottom: 4mm;
        }
        .rank-achievement-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f0f9ff;
            border: 1.5px solid #0284c7;
            border-radius: 30px;
            padding: 6px 18px;
            font-size: 11pt;
            font-weight: 700;
            color: #0369a1;
            margin-bottom: 6mm;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            max-width: 145mm;
            margin: 0 auto 6mm auto;
        }
        .stat-item-num {
            font-size: 14pt;
            font-weight: 800;
            color: #0284c7;
        }
        .stat-item-lbl {
            font-size: 8pt;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Бейджи */
        .diploma-awards-box {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 145mm;
            margin: 0 auto;
            text-align: left;
        }
        .diploma-award-item {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 9pt;
        }
        .diploma-award-emoji {
            font-size: 16pt;
        }
        .diploma-award-item strong {
            color: #0f172a;
            display: block;
        }
        .diploma-award-item p {
            font-size: 7.5pt;
            color: #64748b;
        }

        /* Напутствие от Космо */
        .cosmo-quote-box {
            margin: 4mm auto 0 auto;
            max-width: 145mm;
            background: #fefce8;
            border: 1px dashed #ca8a04;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 8.5pt;
            color: #854d0e;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .cosmo-quote-box img {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
        }

        /* Нижний блок подписей */
        .diploma-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 6mm;
            border-top: 1px solid #e2e8f0;
            position: relative;
            z-index: 2;
        }
        .sig-block {
            font-size: 8.5pt;
            color: #475569;
        }
        .sig-line {
            width: 50mm;
            height: 1px;
            background: #64748b;
            margin-top: 12mm;
            margin-bottom: 2mm;
        }
        .sig-title {
            font-weight: 700;
            color: #0f172a;
        }
        .seal-wrap {
            text-align: center;
            color: #0284c7;
            font-size: 8pt;
            font-weight: 700;
        }
        .seal-circle {
            width: 24mm;
            height: 24mm;
            border: 2px dashed #0284c7;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2mm auto;
            color: #0284c7;
            font-size: 7.5pt;
            text-transform: uppercase;
        }

        .no-print-bar {
            position: fixed;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 1000;
            font-size: 13px;
        }
        .print-btn {
            background: #0284c7;
            color: #fff;
            border: none;
            padding: 6px 14px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0 !important; background: #fff !important; }
            .diploma-sheet { box-shadow: none !important; border: none !important; }
        }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span>Печать наградного диплома на лист А4</span>
        <button class="print-btn" onclick="window.print()">Распечатать</button>
    </div>

    <div class="diploma-sheet">
        <div class="diploma-border-outer"></div>
        <div class="diploma-border-inner"></div>
        <div class="corner-accent corner-tl"></div>
        <div class="corner-accent corner-tr"></div>
        <div class="corner-accent corner-bl"></div>
        <div class="corner-accent corner-br"></div>

        <div class="diploma-header">
            <p class="org-sup">Муниципальные библиотеки г. Владимира • МБУК «ЦГБ»</p>
            <h1 class="diploma-title">Диплом признания</h1>
            <p class="diploma-subtitle">Лига филиалов • Сезон активности 2026</p>
        </div>

        <div class="diploma-body">
            <p class="awarded-to-label">Награждается трудовой коллектив филиала:</p>
            <h2 class="recipient-name">${escapeHtml(name)}</h2>

            <div class="rank-achievement-badge">
                <span>🏆 ${rank}-е место в рейтинге</span>
                <span>•</span>
                <span>${division.name}</span>
                <span>•</span>
                <span>${xp} XP</span>
            </div>

            <div class="stats-grid">
                <div>
                    <div class="stat-item-num">${erVal.toFixed(2)}%</div>
                    <div class="stat-item-lbl">Вовлечённость (ER)</div>
                </div>
                <div>
                    <div class="stat-item-num">${totalViews.toLocaleString('ru-RU')}</div>
                    <div class="stat-item-lbl">Суммарный охват</div>
                </div>
                <div>
                    <div class="stat-item-num">${totalPosts}</div>
                    <div class="stat-item-lbl">Публикаций</div>
                </div>
            </div>

            ${awards.length > 0 ? `
                <div class="diploma-awards-box">
                    ${awardsHtml}
                </div>
            ` : ''}

            <div class="cosmo-quote-box">
                <img src="assets/images/mascot/robot_smile.png" alt="Космо" />
                <div>
                    <strong>Слово робота-маскота Космо:</strong>
                    <p>«Ваша творческая энергия зажигает сердца читателей Владимира! Благодарим за искренний вклад в развитие культуры!»</p>
                </div>
            </div>
        </div>

        <div class="diploma-footer">
            <div class="sig-block">
                <div class="sig-title">Директор МБУК «ЦГБ»</div>
                <div class="sig-line"></div>
                <div>г. Владимир, ${dateStr}</div>
            </div>

            <div class="seal-wrap">
                <div class="seal-circle">М.П.<br>ЦГБ</div>
                <div>Официальный аудит AURORA</div>
            </div>

            <div class="sig-block" style="text-align: right;">
                <div class="sig-title">Методический совет</div>
                <div class="sig-line" style="margin-left: auto;"></div>
                <div>Верифицировано VK API</div>
            </div>
        </div>
    </div>
</body>
</html>`);

    win.document.close();
}

/**
 * Инициализация модального окна Лиги филиалов
 */
let leagueModalEl = null;
let currentLeagueEntries = [];

export function initLeagueModal() {
    if (leagueModalEl) return leagueModalEl;

    const modal = document.createElement('div');
    modal.className = 'league-modal-overlay';
    modal.id = 'league-modal-overlay';
    modal.innerHTML = `
        <div class="league-modal-dialog">
            <div class="league-modal-header">
                <div class="modal-title-wrap">
                    <span class="material-symbols-outlined header-trophy">emoji_events</span>
                    <h2>Лига филиалов библиотек Владимира</h2>
                </div>
                <button type="button" class="league-modal-close-btn" data-league-modal-close title="Закрыть">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="league-modal-body" id="league-modal-body">
                <!-- Dynamically rendered -->
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    leagueModalEl = modal;

    modal.querySelector('[data-league-modal-close]').addEventListener('click', closeLeagueModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLeagueModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeLeagueModal();
        }
    });

    return modal;
}

export function openLeagueModal(groupsStats, posts) {
    initLeagueModal();
    if (groupsStats && posts) {
        currentLeagueEntries = computeBranchLeague(groupsStats, posts);
    }

    const bodyEl = leagueModalEl.querySelector('#league-modal-body');
    renderLeagueDashboard(bodyEl, currentLeagueEntries);

    leagueModalEl.classList.add('is-open');
    document.body.classList.add('league-modal-open');
}

export function closeLeagueModal() {
    if (!leagueModalEl) return;
    leagueModalEl.classList.remove('is-open');
    document.body.classList.remove('league-modal-open');
}

/**
 * Монтирование секции в аналитический блок страницы
 */
export function renderLeagueSection(container, groupsStats, posts) {
    if (!container) return;
    const entries = computeBranchLeague(groupsStats, posts);
    currentLeagueEntries = entries;
    renderLeagueDashboard(container, entries);
}
