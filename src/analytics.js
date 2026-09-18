/**
 * src/analytics.js — Analytics, KPIs, ER calculations & Cross-posting detection
 * Разработка: Амброзиев О.А.
 */

import { enrichTargetWithCanonical, renderBranchAvatarHtml, declOfNum, escapeHtml } from './branches.js?v=4.21.0';

export function extractNum(val) {
    if (val == null) return 0;
    if (typeof val === 'number') return isFinite(val) ? Math.trunc(val) : 0;
    if (typeof val === 'object') {
        if ('count' in val) {
            const c = Number(val.count);
            return (!isNaN(c) && isFinite(c)) ? Math.trunc(c) : 0;
        }
        return 0;
    }
    const parsed = Number(val);
    return (!isNaN(parsed) && isFinite(parsed)) ? Math.trunc(parsed) : 0;
}

export function formatExactNum(val) {
    return extractNum(val).toLocaleString('ru-RU');
}

export function formatViews(val) {
    const num = extractNum(val);
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + '\u00A0млн';
    if (num >= 10000) return (num / 1000).toFixed(1) + '\u00A0тыс.';
    if (num >= 1000) return num.toLocaleString('ru-RU');
    return num.toString();
}

/**
 * Calculate high-level KPIs across all posts
 */
export function calculateKPIs(posts) {
    let totalLikes = 0;
    let totalReposts = 0;
    let totalViews = 0;
    let totalComments = 0;

    posts.forEach(p => {
        totalLikes += extractNum(p.likes);
        totalReposts += extractNum(p.reposts);
        totalViews += extractNum(p.views);
        totalComments += extractNum(p.comments);
    });

    const count = posts.length;
    const totalInteractions = totalLikes + totalReposts + totalComments;
    const avgViews = count > 0 ? Math.round(totalViews / count) : 0;
    const avgLikes = count > 0 ? Math.round(totalLikes / count) : 0;
    const avgReposts = count > 0 ? Math.round(totalReposts / count) : 0;
    const avgComments = count > 0 ? Math.round(totalComments / count) : 0;
    const erViews = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(2) : '0.00';
    const erPosts = count > 0 ? ((totalInteractions / count)).toFixed(1) : '0.0';

    return {
        count,
        totalLikes,
        totalReposts,
        totalViews,
        totalComments,
        totalInteractions,
        avgViews,
        avgLikes,
        avgInteractions: erPosts,
        avgReactionsPerPost: erPosts,
        erViews: `${erViews}%`,
        erPosts
    };
}

function getBranchKey(targetObj) {
    if (!targetObj) return 'unknown';
    if (targetObj.sortOrder != null && targetObj.sortOrder !== 999) {
        return `canon_${targetObj.sortOrder}`;
    }
    const numId = parseInt(targetObj.id || targetObj.rawId, 10);
    if (!isNaN(numId) && numId !== 0) {
        return `id_${Math.abs(numId)}`;
    }
    return `name_${String(targetObj.canonicalName || targetObj.name || '').trim().toLowerCase()}`;
}

/**
 * Calculate per-branch statistics for comparison and ranking
 */
export function calculateGroupStats(posts, targets = []) {
    const map = new Map();

    // Initialize all scanned targets so 0-post branches are included
    targets.forEach(t => {
        const targetObj = enrichTargetWithCanonical({ ...t });
        const key = getBranchKey(targetObj);
        if (!key) return;
        map.set(key, {
            info: targetObj,
            postsCount: 0,
            likes: 0,
            reposts: 0,
            views: 0,
            comments: 0,
            posts: []
        });
    });

    posts.forEach(p => {
        const t = p.targetInfo || { id: p.owner_id, rawId: p.owner_id, name: p._targetName || 'Источник' };
        enrichTargetWithCanonical(t);
        const key = getBranchKey(t);
        if (!map.has(key)) {
            map.set(key, {
                info: t,
                postsCount: 0,
                likes: 0,
                reposts: 0,
                views: 0,
                comments: 0,
                posts: []
            });
        }
        const s = map.get(key);
        s.postsCount++;
        s.likes += extractNum(p.likes);
        s.reposts += extractNum(p.reposts);
        s.views += extractNum(p.views);
        s.comments += extractNum(p.comments);
        s.posts.push(p);
    });

    const stats = Array.from(map.values()).map(s => {
        const totalInteractions = s.likes + s.reposts + s.comments;
        const erViews = s.views > 0 ? (totalInteractions / s.views) * 100 : 0;
        const erPosts = s.postsCount > 0 ? (totalInteractions / s.postsCount) : 0;
        const avgViews = s.postsCount > 0 ? Math.round(s.views / s.postsCount) : 0;
        const avgLikes = s.postsCount > 0 ? Math.round(s.likes / s.postsCount) : 0;
        const avgReposts = s.postsCount > 0 ? Math.round(s.reposts / s.postsCount) : 0;
        const avgComments = s.postsCount > 0 ? Math.round(s.comments / s.postsCount) : 0;
        return {
            ...s,
            totalInteractions,
            erViews,
            erPosts,
            avgViews,
            avgLikes,
            avgReposts,
            avgComments
        };
    });

    // Default sort by canonical branch order
    stats.sort((a, b) => (a.info.sortOrder || 999) - (b.info.sortOrder || 999));
    return stats;
}

/**
 * Normalize text for duplicate / cross-posting analysis
 */
export function normalizePostText(rawText) {
    if (!rawText) return '';
    return rawText
        .replace(/https?:\/\/[^\s<]+/gi, '')
        .replace(/#\S+/g, '')
        .replace(/\[(?:club|id|public)\d+\|[^\]]+\]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Shingles generator (N-grams of words)
 */
function getShingles(cleanedText, n = 3) {
    const words = cleanedText.split(' ').filter(w => w.length >= 3);
    const set = new Set();
    if (words.length < n) {
        if (words.length > 0) set.add(words.join(' '));
        return set;
    }
    for (let i = 0; i <= words.length - n; i++) {
        set.add(words.slice(i, i + n).join(' '));
    }
    return set;
}

/**
 * Words set generator for Jaccard similarity
 */
function getWordsSet(cleanedText) {
    const words = cleanedText.split(' ').filter(w => w.length >= 4);
    return new Set(words);
}

/**
 * Jaccard coefficient between two sets
 */
function jaccardSimilarity(setA, setB) {
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;
    for (let item of setA) {
        if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Cross-posting & Duplicate Announcement Detector
 * Groups matching announcements across different library branches.
 * Identifies:
 * - Original publisher (первоисточник): earliest post date
 * - Engagement leader (лидер по реакциям): max likes + reposts*2 + comments*3 + views*0.05
 */
export function detectCrossPosts(posts) {
    if (!posts || posts.length < 2) {
        return { clusters: [], totalClusters: 0, totalDuplicates: 0 };
    }

    // 1. Prepare candidates: only posts with substantial text (>= 35 chars)
    const candidates = [];
    posts.forEach((p, idx) => {
        const clean = normalizePostText(p.text || '');
        if (clean.length >= 35) {
            candidates.push({
                index: idx,
                post: p,
                clean: clean,
                words: getWordsSet(clean),
                shingles: getShingles(clean, 3)
            });
        }
    });

    if (candidates.length < 2) {
        return { clusters: [], totalClusters: 0, totalDuplicates: 0 };
    }

    // 2. Disjoint Set Union (Union-Find) for clustering
    const parent = new Array(candidates.length).fill(0).map((_, i) => i);
    function find(i) {
        if (parent[i] === i) return i;
        return (parent[i] = find(parent[i]));
    }
    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    }

    // 3. Compare pairs from DIFFERENT owners
    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const a = candidates[i];
            const b = candidates[j];

            // Only consider cross-branch posts
            if (a.post.owner_id === b.post.owner_id) continue;

            // Substring match for substantial quotes
            let isMatch = false;
            if (a.clean.length >= 60 && b.clean.length >= 60) {
                const headA = a.clean.slice(0, 70);
                const headB = b.clean.slice(0, 70);
                if (a.clean.includes(headB) || b.clean.includes(headA)) {
                    isMatch = true;
                }
            }

            if (!isMatch) {
                const simShingles = jaccardSimilarity(a.shingles, b.shingles);
                const simWords = jaccardSimilarity(a.words, b.words);
                if (simShingles >= 0.45 || simWords >= 0.55) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                union(i, j);
            }
        }
    }

    // 4. Group candidate posts into clusters
    const clusterMap = new Map();
    candidates.forEach((c, idx) => {
        const root = find(idx);
        if (!clusterMap.has(root)) clusterMap.set(root, []);
        clusterMap.get(root).push(c.post);
    });

    // 5. Filter clusters: must contain posts from at least 2 distinct branches
    const validClusters = [];
    let totalDuplicates = 0;

    clusterMap.forEach(clusterPosts => {
        const uniqueOwners = new Set(clusterPosts.map(p => p.owner_id));
        if (uniqueOwners.size >= 2) {
            // Sort chronologically ascending to find original
            clusterPosts.sort((a, b) => (a.date || 0) - (b.date || 0));

            const originalPost = clusterPosts[0];
            const originalDate = new Date(originalPost.date * 1000);

            // Calculate engagement score for each post in cluster
            let leaderPost = clusterPosts[0];
            let maxScore = -1;
            let grandLikes = 0;
            let grandReposts = 0;
            let grandComments = 0;
            let grandViews = 0;

            const participants = clusterPosts.map(p => {
                const likes = extractNum(p.likes);
                const reposts = extractNum(p.reposts);
                const comments = extractNum(p.comments);
                const views = extractNum(p.views);

                grandLikes += likes;
                grandReposts += reposts;
                grandComments += comments;
                grandViews += views;

                // Engagement score: likes (1) + reposts (2) + comments (3) + views (0.02)
                const score = likes + (reposts * 2) + (comments * 3) + (views * 0.02);
                if (score > maxScore) {
                    maxScore = score;
                    leaderPost = p;
                }

                // Time delta relative to original
                const pDate = new Date(p.date * 1000);
                const diffSec = Math.max(0, p.date - originalPost.date);
                let delayStr = 'Первоисточник';
                if (diffSec >= 86400) {
                    const days = Math.round(diffSec / 86400);
                    delayStr = `+${days} ${declOfNum(days, ['день', 'дня', 'дней'])}`;
                } else if (diffSec >= 3600) {
                    const hours = Math.round(diffSec / 3600);
                    delayStr = `+${hours} ч`;
                } else if (diffSec >= 60) {
                    const mins = Math.round(diffSec / 60);
                    delayStr = `+${mins} мин`;
                }

                return {
                    post: p,
                    targetInfo: enrichTargetWithCanonical(p.targetInfo || { id: p.owner_id, name: p._targetName || 'Филиал' }),
                    date: pDate,
                    delayStr,
                    likes,
                    reposts,
                    comments,
                    views,
                    score: Math.round(score * 10) / 10
                };
            });

            // Extract title snippet
            const firstLine = (originalPost.text || '').split('\n').map(l => l.trim()).filter(l => l.length > 5)[0] || originalPost.text || '';
            const snippet = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;

            validClusters.push({
                id: `cluster_${originalPost.id}_${originalPost.owner_id}`,
                snippet,
                fullText: originalPost.text || '',
                originalPost,
                originalBranch: enrichTargetWithCanonical(originalPost.targetInfo || { id: originalPost.owner_id, name: originalPost._targetName || 'Филиал' }),
                originalDate,
                leaderPost,
                leaderBranch: enrichTargetWithCanonical(leaderPost.targetInfo || { id: leaderPost.owner_id, name: leaderPost._targetName || 'Филиал' }),
                participants,
                totalPosts: clusterPosts.length,
                totalBranches: uniqueOwners.size,
                grandLikes,
                grandReposts,
                grandComments,
                grandViews,
                grandInteractions: grandLikes + grandReposts + grandComments
            });

            totalDuplicates += (clusterPosts.length - 1);
        }
    });

    // Sort clusters by grand interactions descending (most popular events first)
    validClusters.sort((a, b) => b.grandInteractions - a.grandInteractions);

    return {
        clusters: validClusters,
        totalClusters: validClusters.length,
        totalDuplicates
    };
}

/**
 * Render Cross-Posting block HTML
 */
export function renderCrossPostingSection(containerEl, crossPostingData, onFilterBranchCb) {
    if (!containerEl) return;

    if (!crossPostingData || crossPostingData.totalClusters === 0) {
        containerEl.innerHTML = `
            <div class="crosspost-empty-state">
                <span class="material-symbols-outlined crosspost-empty-icon">compare_arrows</span>
                <h4>Дубликатов и кросс-постинга не обнаружено</h4>
                <p>Все найденные публикации филиалов уникальны по содержанию за выбранный период.</p>
            </div>
        `;
        return;
    }

    const clustersHtml = crossPostingData.clusters.map((cluster, idx) => {
        const orig = cluster.originalBranch;
        const leader = cluster.leaderBranch;
        const origTimeStr = cluster.originalDate.toLocaleString('ru-RU', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const participantsRows = cluster.participants.map(part => {
            const t = part.targetInfo;
            const isOrig = part.post.id === cluster.originalPost.id && part.post.owner_id === cluster.originalPost.owner_id;
            const isLeader = part.post.id === cluster.leaderPost.id && part.post.owner_id === cluster.leaderPost.owner_id;

            return `
                <tr class="${isOrig ? 'row-original' : ''} ${isLeader ? 'row-leader' : ''}">
                    <td class="cp-branch-col">
                        <div class="cp-branch-cell">
                            ${renderBranchAvatarHtml(t, 'sm')}
                            <div class="cp-branch-info">
                                <span class="cp-branch-name">${escapeHtml(t.canonicalName || t.name)}</span>
                                <div class="cp-branch-badges">
                                    ${isOrig ? '<span class="cp-micro-badge orig-badge">Первоисточник</span>' : ''}
                                    ${isLeader ? '<span class="cp-micro-badge leader-badge">Лидер реакций</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="cp-date-col">
                        <span class="cp-date-text">${part.date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="cp-delay-pill ${isOrig ? 'pill-orig' : ''}">${part.delayStr}</span>
                    </td>
                    <td class="cp-metric-col">${part.likes}</td>
                    <td class="cp-metric-col">${part.reposts}</td>
                    <td class="cp-metric-col">${part.comments}</td>
                    <td class="cp-metric-col">${formatViews(part.views)}</td>
                    <td class="cp-action-col">
                        <a href="https://vk.com/wall${part.post.owner_id}_${part.post.id}" target="_blank" rel="noopener noreferrer" class="cp-vk-link" title="Открыть в ВКонтакте">
                            <span class="material-symbols-outlined">open_in_new</span>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="crosspost-cluster-card">
                <div class="crosspost-cluster-header">
                    <div class="cp-header-badge-row">
                        <span class="cp-cluster-number">Серия #${idx + 1}</span>
                        <span class="cp-count-pill">${cluster.totalPosts} ${declOfNum(cluster.totalPosts, ['публикация', 'публикации', 'публикаций'])} в ${cluster.totalBranches} ${declOfNum(cluster.totalBranches, ['филиале', 'филиалах', 'филиалах'])}</span>
                    </div>
                    <h4 class="crosspost-snippet-title">${escapeHtml(cluster.snippet)}</h4>
                    
                    <div class="crosspost-spotlight-grid">
                        <div class="cp-spotlight-card spotlight-original">
                            <div class="spotlight-icon-wrap">
                                <span class="material-symbols-outlined spotlight-icon">rocket_launch</span>
                            </div>
                            <div class="spotlight-body">
                                <span class="spotlight-label">Первоисточник анонса</span>
                                <div class="spotlight-branch-line">
                                    <strong>${escapeHtml(orig.canonicalName || orig.name)}</strong>
                                </div>
                                <span class="spotlight-time">Опубликовано: ${origTimeStr}</span>
                            </div>
                        </div>

                        <div class="cp-spotlight-card spotlight-leader">
                            <div class="spotlight-icon-wrap">
                                <span class="material-symbols-outlined spotlight-icon">trending_up</span>
                            </div>
                            <div class="spotlight-body">
                                <span class="spotlight-label">Лидер по читательскому вовлечению</span>
                                <div class="spotlight-branch-line">
                                    <strong>${escapeHtml(leader.canonicalName || leader.name)}</strong>
                                </div>
                                <span class="spotlight-stats">
                                    <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">favorite</span> ${extractNum(cluster.leaderPost.likes)} &nbsp;|&nbsp;
                                    <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">repeat</span> ${extractNum(cluster.leaderPost.reposts)} &nbsp;|&nbsp;
                                    <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">visibility</span> ${formatViews(cluster.leaderPost.views)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="crosspost-table-wrapper">
                    <table class="crosspost-table">
                        <thead>
                            <tr>
                                <th>Филиал библиотеки</th>
                                <th>Дата и время</th>
                                <th>Лайки</th>
                                <th>Репосты</th>
                                <th>Комменты</th>
                                <th>Просмотры</th>
                                <th>Пост</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participantsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    containerEl.innerHTML = `
        <div class="crosspost-summary-banner">
            <div class="cp-summary-item">
                <span class="cp-sum-val">${crossPostingData.totalClusters}</span>
                <span class="cp-sum-label">Общих тем / инфоповодов</span>
            </div>
            <div class="cp-summary-divider"></div>
            <div class="cp-summary-item">
                <span class="cp-sum-val">${crossPostingData.totalDuplicates}</span>
                <span class="cp-sum-label">Повторных кросс-постов</span>
            </div>
        </div>
        <div class="crosspost-clusters-list">
            ${clustersHtml}
        </div>
    `;
}

/**
 * -----------------------------------------------------------------------------
 * Аналитический движок тепловой матрицы публикаций (Timing Heatmap Engine)
 * -----------------------------------------------------------------------------
 * 7 дней недели (0 = Пн, 6 = Вс) x 24 часа (0..23).
 * Подсчитывает: count, views, likes, reposts, comments, interactions, er.
 * Находит глобальный maxCount и maxEr для нормализации интенсивности (0..1).
 * Определяет ТОП-3 «золотых окна» публикаций с экспертным обоснованием.
 */

export const HEATMAP_DAY_NAMES = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье'
];

export const HEATMAP_SHORT_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function computeTimingHeatmap(posts) {
    // 1. Инициализация матрицы 7 дней x 24 часа
    const matrix = [];
    for (let d = 0; d < 7; d++) {
        const dayRow = [];
        for (let h = 0; h < 24; h++) {
            const nextH = (h + 1) % 24;
            const timeSlot = `${String(h).padStart(2, '0')}:00–${String(nextH).padStart(2, '0')}:00`;
            dayRow.push({
                day: d,
                dayName: HEATMAP_DAY_NAMES[d],
                dayShort: HEATMAP_SHORT_DAYS[d],
                hour: h,
                timeSlot,
                count: 0,
                views: 0,
                likes: 0,
                reposts: 0,
                comments: 0,
                interactions: 0,
                er: 0,
                intensityCount: 0,
                intensityEr: 0,
                score: 0
            });
        }
        matrix.push(dayRow);
    }

    if (!Array.isArray(posts) || posts.length === 0) {
        return {
            matrix,
            days: HEATMAP_DAY_NAMES,
            shortDays: HEATMAP_SHORT_DAYS,
            hours: Array.from({ length: 24 }, (_, i) => i),
            maxCount: 0,
            maxEr: 0,
            totalPosts: 0,
            avgEr: 0,
            peakActivitySlot: null,
            peakErSlot: null,
            goldenWindows: []
        };
    }

    let totalLikes = 0;
    let totalReposts = 0;
    let totalComments = 0;
    let totalViews = 0;

    // 2. Агрегация метрик по дням и часам
    posts.forEach(p => {
        let postDate = null;
        if (typeof p.date === 'number' && !isNaN(p.date)) {
            postDate = new Date(p.date > 1e11 ? p.date : p.date * 1000);
        } else if (p.date) {
            postDate = new Date(p.date);
        } else if (p.humanDate) {
            postDate = new Date(p.humanDate);
        }

        if (!postDate || isNaN(postDate.getTime())) {
            return;
        }

        // JS getDay(): 0 = Вс, 1 = Пн ... 6 = Сб. Преобразуем к 0 = Пн ... 6 = Вс:
        const jsDay = postDate.getDay();
        const dayIdx = (jsDay + 6) % 7;
        const hour = postDate.getHours();

        if (dayIdx < 0 || dayIdx > 6 || hour < 0 || hour > 23) {
            return;
        }

        const likes = extractNum(p.likes);
        const reposts = extractNum(p.reposts);
        const comments = extractNum(p.comments);
        const views = extractNum(p.views);
        const interactions = likes + reposts + comments;

        totalLikes += likes;
        totalReposts += reposts;
        totalComments += comments;
        totalViews += views;

        const cell = matrix[dayIdx][hour];
        cell.count += 1;
        cell.likes += likes;
        cell.reposts += reposts;
        cell.comments += comments;
        cell.views += views;
        cell.interactions += interactions;
    });

    const totalPosts = posts.length;
    const totalInteractions = totalLikes + totalReposts + totalComments;
    const avgEr = totalViews > 0
        ? Math.round(((totalInteractions / totalViews) * 100) * 100) / 100
        : (totalPosts > 0 ? Math.round((totalInteractions / totalPosts) * 100) / 100 : 0);

    let maxCount = 0;
    let maxEr = 0;
    let peakActivitySlot = null;
    let peakErSlot = null;

    // 3. Расчёт ER для каждой ячейки и поиск экстремумов
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const cell = matrix[d][h];
            if (cell.count > 0) {
                if (cell.views > 0) {
                    cell.er = Math.round(((cell.interactions / cell.views) * 100) * 100) / 100;
                } else {
                    cell.er = Math.round((cell.interactions / cell.count) * 100) / 100;
                }

                if (cell.count > maxCount) {
                    maxCount = cell.count;
                    peakActivitySlot = cell;
                }
                if (cell.er > maxEr) {
                    maxEr = cell.er;
                    peakErSlot = cell;
                }
            }
        }
    }

    // 4. Нормализация интенсивности (0..1) для визуализации
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const cell = matrix[d][h];
            cell.intensityCount = maxCount > 0 ? Math.round((cell.count / maxCount) * 1000) / 1000 : 0;
            cell.intensityEr = maxEr > 0 ? Math.round((cell.er / maxEr) * 1000) / 1000 : 0;

            if (cell.count > 0) {
                const avgCellViews = Math.round(cell.views / cell.count);
                const avgCellInteractions = cell.interactions / cell.count;
                const volumeBonus = Math.min(2.0, 1.0 + Math.log10(1 + cell.count) * 0.5);
                const reachBonus = Math.log10(1 + avgCellViews);
                cell.score = (cell.er * 2.5 + avgCellInteractions * 1.5 + reachBonus * 2.0) * volumeBonus;
            }
        }
    }

    // 5. Определение ТОП-3 «золотых окон» публикаций
    const activeCells = [];
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const cell = matrix[d][h];
            if (cell.count > 0) {
                activeCells.push(cell);
            }
        }
    }

    activeCells.sort((a, b) => b.score - a.score || b.er - a.er || b.views - a.views);

    const goldenWindows = activeCells.slice(0, 3).map((cell, idx) => {
        const avgViews = Math.round(cell.views / cell.count);
        const avgInteractions = +(cell.interactions / cell.count).toFixed(1);
        const erMultiple = avgEr > 0 ? (cell.er / avgEr).toFixed(1) : '1.0';

        let slotContext = '';
        if (cell.hour >= 7 && cell.hour <= 10) {
            slotContext = 'Утренний слот: читатели просматривают анонсы перед началом рабочего дня.';
        } else if (cell.hour >= 11 && cell.hour <= 14) {
            slotContext = 'Обеденный прайм-тайм: повышенное внимание к афишам мероприятий и обзорам книг.';
        } else if (cell.hour >= 15 && cell.hour <= 18) {
            slotContext = 'Вторая половина дня: читатели активно планируют досуг и делятся публикациями.';
        } else if (cell.hour >= 19 && cell.hour <= 22) {
            slotContext = 'Вечерний прайм: вдумчивое чтение лонгридов, максимальная глубина обсуждений.';
        } else {
            slotContext = 'Нишевый временной интервал с концентрированным вниманием целевой аудитории.';
        }

        const reason = `ER ${cell.er}% (в ${erMultiple}× выше среднего по сообществам), в среднем ${avgViews.toLocaleString('ru-RU')} просмотров и ${avgInteractions} реакций на публикацию. ${slotContext}`;

        return {
            rank: idx + 1,
            day: cell.day,
            dayName: cell.dayName,
            dayShort: cell.dayShort,
            hour: cell.hour,
            timeSlot: cell.timeSlot,
            count: cell.count,
            views: cell.views,
            likes: cell.likes,
            reposts: cell.reposts,
            comments: cell.comments,
            er: cell.er,
            avgViews,
            avgInteractions,
            score: Math.round(cell.score * 10) / 10,
            reason
        };
    });

    return {
        matrix,
        days: HEATMAP_DAY_NAMES,
        shortDays: HEATMAP_SHORT_DAYS,
        hours: Array.from({ length: 24 }, (_, i) => i),
        maxCount,
        maxEr,
        totalPosts,
        avgEr,
        peakActivitySlot,
        peakErSlot,
        goldenWindows
    };
}

/**
 * -----------------------------------------------------------------------------
 * Визуализация тепловой матрицы публикаций 24×7 и витрины «Золотых окон»
 * -----------------------------------------------------------------------------
 */

export function renderTimingHeatmapSection(container, heatmapData) {
    if (!container) return;

    if (!heatmapData || !heatmapData.matrix || heatmapData.totalPosts === 0) {
        container.innerHTML = `
            <div class="card analytics-card heatmap-card">
                <div class="analytics-card-header">
                    <div class="analytics-card-title-wrap">
                        <div class="showcase-icon-badge">
                            <span class="material-symbols-outlined">schedule</span>
                        </div>
                        <div>
                            <h3 class="analytics-card-title">Тепловая карта времени публикаций (24×7 Heatmap)</h3>
                            <p class="analytics-card-subtitle">Анализ плотности постов и эффективности вовлечённости читателей по часам и дням недели</p>
                        </div>
                    </div>
                </div>
                <div class="heatmap-empty-card">
                    <span class="material-symbols-outlined heatmap-empty-icon">calendar_clock</span>
                    <p class="heatmap-empty-title">Нет данных о датах публикаций для построения тепловой сетки</p>
                    <p class="heatmap-empty-sub">Выполните поиск или сканирование постов в сообществах филиалов для расчёта матрицы прайм-тайма.</p>
                </div>
            </div>
        `;
        return;
    }

    let currentMetric = 'count'; // 'count' | 'er'

    function getCellLevel(cell, metric) {
        if (cell.count === 0) return 0;
        const intensity = metric === 'er' ? cell.intensityEr : cell.intensityCount;
        if (intensity >= 0.75) return 4;
        if (intensity >= 0.50) return 3;
        if (intensity >= 0.25) return 2;
        return 1;
    }

    function buildGridRowsHtml(metric) {
        let html = '';
        heatmapData.matrix.forEach((dayRow, dayIdx) => {
            const dayName = heatmapData.days[dayIdx];
            const dayShort = heatmapData.shortDays[dayIdx];

            let cellsHtml = '';
            dayRow.forEach((cell, hour) => {
                const lvl = getCellLevel(cell, metric);
                const isGolden = lvl === 4;
                const cellClasses = `heatmap-cell heatmap-lvl-${lvl}${isGolden ? ' heatmap-cell-golden' : ''}`;
                const valDisplay = metric === 'er'
                    ? (cell.count > 0 ? (cell.er > 0 ? `${cell.er}%` : '0%') : '·')
                    : (cell.count > 0 ? cell.count : '·');

                const tooltipTitle = `${cell.dayName}, ${cell.timeSlot}\nПубликаций: ${cell.count}\nПросмотров: ${cell.views.toLocaleString('ru-RU')}\nЛайков: ${cell.likes.toLocaleString('ru-RU')}\nВовлечённость (ER): ${cell.er}%`;

                cellsHtml += `
                    <div class="${cellClasses}"
                         data-day-idx="${dayIdx}"
                         data-hour="${hour}"
                         data-day="${escapeHtml(cell.dayName)}"
                         data-timeslot="${escapeHtml(cell.timeSlot)}"
                         data-count="${cell.count}"
                         data-views="${cell.views}"
                         data-likes="${cell.likes}"
                         data-er="${cell.er}"
                         title="${escapeHtml(tooltipTitle)}">
                        <span class="heatmap-cell-val">${valDisplay}</span>
                    </div>
                `;
            });

            html += `
                <div class="heatmap-grid-row">
                    <div class="heatmap-day-label" title="${escapeHtml(dayName)}">
                        <span class="day-short-text">${escapeHtml(dayShort)}</span>
                    </div>
                    <div class="heatmap-cells-track">
                        ${cellsHtml}
                    </div>
                </div>
            `;
        });
        return html;
    }

    // Рендер ТОП-3 «Золотых окон» публикаций
    let goldenCardsHtml = '';
    const medals = ['🥇', '🥈', '🥉'];
    const rankTitles = [
        'Абсолютный прайм-тайм (№1)',
        'Окно максимального охвата (№2)',
        'Перспективный слот вовлечения (№3)'
    ];

    if (heatmapData.goldenWindows && heatmapData.goldenWindows.length > 0) {
        goldenCardsHtml = heatmapData.goldenWindows.map((gw, idx) => {
            const medal = medals[idx] || '⭐';
            const title = rankTitles[idx] || `Золотой слот №${gw.rank}`;
            return `
                <div class="golden-window-card golden-rank-${gw.rank}">
                    <div class="gw-card-header">
                        <span class="gw-medal-badge">${medal}</span>
                        <div class="gw-title-wrap">
                            <h5 class="gw-card-title">${title}</h5>
                            <span class="gw-slot-badge">${escapeHtml(gw.dayName)}, ${escapeHtml(gw.timeSlot)}</span>
                        </div>
                    </div>

                    <div class="gw-metrics-grid">
                        <div class="gw-metric-item">
                            <span class="gw-metric-lbl">Публикаций</span>
                            <b class="gw-metric-val">${gw.count}</b>
                        </div>
                        <div class="gw-metric-item">
                            <span class="gw-metric-lbl">Ср. просмотры</span>
                            <b class="gw-metric-val">${gw.avgViews.toLocaleString('ru-RU')}</b>
                        </div>
                        <div class="gw-metric-item">
                            <span class="gw-metric-lbl">Вовлечённость ER</span>
                            <b class="gw-metric-val gw-metric-accent">${gw.er}%</b>
                        </div>
                        <div class="gw-metric-item">
                            <span class="gw-metric-lbl">Реакций / пост</span>
                            <b class="gw-metric-val">${gw.avgInteractions}</b>
                        </div>
                    </div>

                    <div class="golden-window-reason">
                        <span class="material-symbols-outlined gw-reason-ico">auto_awesome</span>
                        <div class="gw-reason-content">
                            <span class="gw-reason-tag">Методическая рекомендация:</span>
                            <p class="gw-reason-text">${escapeHtml(gw.reason)}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        goldenCardsHtml = `
            <div class="gw-empty-note">
                <p>Недостаточно постов с реакциями для выделения контрастных золотых окон публикаций.</p>
            </div>
        `;
    }

    // Заголовки часов 00..23
    let hoursHeaderHtml = '';
    for (let h = 0; h < 24; h++) {
        const hStr = String(h).padStart(2, '0');
        hoursHeaderHtml += `<div class="heatmap-hour-th" title="Интервал ${hStr}:00–${String((h+1)%24).padStart(2, '0')}:00">${hStr}</div>`;
    }

    container.innerHTML = `
        <div class="card analytics-card heatmap-card">
            <div class="analytics-card-header">
                <div class="analytics-card-title-wrap">
                    <div class="showcase-icon-badge">
                        <span class="material-symbols-outlined">schedule</span>
                    </div>
                    <div>
                        <h3 class="analytics-card-title">Тепловая карта времени публикаций (24×7 Heatmap)</h3>
                        <p class="analytics-card-subtitle">Анализ плотности постов и эффективности вовлечённости читателей по часам и дням недели</p>
                    </div>
                </div>

                <div class="heatmap-header-controls">
                    <div class="segment-control heatmap-mode-switcher">
                        <button type="button" class="segment-btn active" data-heatmap-metric="count">
                            <span class="material-symbols-outlined segment-icon">grid_view</span>
                            Число постов (Плотность)
                        </button>
                        <button type="button" class="segment-btn" data-heatmap-metric="er">
                            <span class="material-symbols-outlined segment-icon">trending_up</span>
                            Вовлечённость (ER)
                        </button>
                    </div>
                </div>
            </div>

            <div class="heatmap-body-wrap">
                <!-- Сетка тепловой карты с горизонтальным скроллом -->
                <div class="heatmap-grid-scroll-wrap">
                    <div class="heatmap-grid">
                        <div class="heatmap-header-row">
                            <div class="heatmap-corner-label">День \ Час</div>
                            <div class="heatmap-hours-track">
                                ${hoursHeaderHtml}
                            </div>
                        </div>
                        <div class="heatmap-rows-container" id="heatmap-rows-body">
                            ${buildGridRowsHtml(currentMetric)}
                        </div>
                    </div>
                </div>

                <!-- Легенда градиентной шкалы интенсивности -->
                <div class="heatmap-legend-bar">
                    <span class="heatmap-leg-title">Шкала интенсивности:</span>
                    <div class="heatmap-legend-scale">
                        <div class="heatmap-leg-item">
                            <span class="heatmap-leg-chip heatmap-lvl-0"></span>
                            <span class="heatmap-leg-txt">0 постов (вакуум)</span>
                        </div>
                        <div class="heatmap-leg-item">
                            <span class="heatmap-leg-chip heatmap-lvl-1"></span>
                            <span class="heatmap-leg-txt">Мягкий циан (1-й ур.)</span>
                        </div>
                        <div class="heatmap-leg-item">
                            <span class="heatmap-leg-chip heatmap-lvl-2"></span>
                            <span class="heatmap-leg-txt">Электрический циан (2-й ур.)</span>
                        </div>
                        <div class="heatmap-leg-item">
                            <span class="heatmap-leg-chip heatmap-lvl-3"></span>
                            <span class="heatmap-leg-txt">Ультрамарин / фиолетовый (3-й ур.)</span>
                        </div>
                        <div class="heatmap-leg-item">
                            <span class="heatmap-leg-chip heatmap-lvl-4 heatmap-cell-golden"></span>
                            <span class="heatmap-leg-txt">Золотой слот / Пик</span>
                        </div>
                    </div>
                </div>

                <!-- Витрина ТОП-3 «Золотых окон» -->
                <div class="golden-windows-section">
                    <div class="golden-windows-header">
                        <div class="gw-sec-title-wrap">
                            <span class="material-symbols-outlined gw-sec-ico">stars</span>
                            <div>
                                <h4 class="golden-windows-title">ТОП-3 Золотых окна публикаций</h4>
                                <p class="golden-windows-subtitle">Лучшее время для публикаций на основе охвата, вовлечения и читательского отклика</p>
                            </div>
                        </div>
                    </div>
                    <div class="golden-windows-grid">
                        ${goldenCardsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Интерактивный переключатель метрик
    const switcherBtns = container.querySelectorAll('[data-heatmap-metric]');
    const rowsBody = container.querySelector('#heatmap-rows-body');

    switcherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetMetric = btn.getAttribute('data-heatmap-metric');
            if (targetMetric === currentMetric) return;

            currentMetric = targetMetric;
            switcherBtns.forEach(b => b.classList.toggle('active', b === btn));

            if (rowsBody) {
                const cells = rowsBody.querySelectorAll('.heatmap-cell');
                cells.forEach(cellEl => {
                    const dayIdx = parseInt(cellEl.getAttribute('data-day-idx'), 10);
                    const hour = parseInt(cellEl.getAttribute('data-hour'), 10);
                    const cell = heatmapData.matrix[dayIdx]?.[hour];
                    if (!cell) return;

                    const lvl = getCellLevel(cell, currentMetric);
                    const isGolden = lvl === 4;
                    cellEl.className = `heatmap-cell heatmap-lvl-${lvl}${isGolden ? ' heatmap-cell-golden' : ''}`;

                    const valDisplay = currentMetric === 'er'
                        ? (cell.count > 0 ? (cell.er > 0 ? `${cell.er}%` : '0%') : '·')
                        : (cell.count > 0 ? cell.count : '·');

                    const valSpan = cellEl.querySelector('.heatmap-cell-val');
                    if (valSpan) valSpan.textContent = valDisplay;
                });
            }
        });
    });
}

/**
 * -----------------------------------------------------------------------------
 * Экспорт диалога чата с Космо в форматы Markdown (.md) и текст (.txt)
 * -----------------------------------------------------------------------------
 */

export function formatCosmoChat(messages, format = 'md') {
    if (!Array.isArray(messages) || messages.length === 0) {
        return format === 'md' ? '# Чат с Космо\n\n_Диалог пуст._\n' : 'Диалог пуст.\n';
    }

    const nowStr = new Date().toLocaleString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    if (format === 'txt') {
        const lines = [
            '================================================================================',
            'ДИАЛОГ С ИИ-АССИСТЕНТОМ «КОСМО» — AURORA SMM & БИБЛИОТЕЧНЫЙ ПОМОЩНИК',
            `Дата экспорта: ${nowStr}`,
            `Всего сообщений: ${messages.length}`,
            '================================================================================',
            ''
        ];

        messages.forEach((m, idx) => {
            const roleName = m.role === 'assistant' ? 'КОСМО' : (m.role === 'user' ? 'ПОЛЬЗОВАТЕЛЬ' : 'СИСТЕМА');
            const timeStr = m.time || m.timestamp || '';
            const header = timeStr ? `[${roleName} — ${timeStr}]` : `[${roleName}]`;
            lines.push(header);
            lines.push(String(m.content || '').trim());
            lines.push('');
            lines.push('--------------------------------------------------------------------------------');
            lines.push('');
        });

        return lines.join('\n');
    }

    // По умолчанию: Markdown
    const mdLines = [
        '# 🚀 Диалог с ИИ-ассистентом Космо (AURORA)',
        '',
        `> **Дата экспорта:** ${nowStr}  `,
        `> **Всего сообщений:** ${messages.length}  `,
        `> **Система:** AURORA VK Wall Searcher & Library AI Assistant  `,
        '',
        '---',
        ''
    ];

    messages.forEach((m, idx) => {
        const isAssistant = m.role === 'assistant';
        const isSystem = m.role === 'system';
        const author = isAssistant ? '🤖 **Космо**' : (isSystem ? '⚙️ **Системный контекст**' : '👤 **Пользователь**');
        const timeBadge = m.time || m.timestamp ? ` \`${m.time || m.timestamp}\`` : '';

        mdLines.push(`### ${author}${timeBadge}`);
        mdLines.push('');
        mdLines.push(String(m.content || '').trim());
        mdLines.push('');
        mdLines.push('---');
        mdLines.push('');
    });

    return mdLines.join('\n');
}

export function exportCosmoChat(messages, format = 'md', filename = null) {
    const text = formatCosmoChat(messages, format);
    const dateStr = new Date().toISOString().slice(0, 10);
    const ext = format === 'txt' ? 'txt' : 'md';
    const mimeType = format === 'txt' ? 'text/plain;charset=utf-8;' : 'text/markdown;charset=utf-8;';
    const finalFilename = filename || `cosmo_chat_${dateStr}.${ext}`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    return text;
}

