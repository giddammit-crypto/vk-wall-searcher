/**
 * src/analytics.js — Analytics, KPIs, ER calculations & Cross-posting detection
 * Разработка: Амброзиев О.А.
 */

import { enrichTargetWithCanonical, renderBranchAvatarHtml, declOfNum, escapeHtml } from './branches.js?v=4.8.2';

export function extractNum(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null && typeof val.count === 'number') return val.count;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
}

export function formatViews(val) {
    const num = extractNum(val);
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
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
    const avgLikes = count > 0 ? (totalLikes / count).toFixed(1) : 0;
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

/**
 * Calculate per-branch statistics for comparison and ranking
 */
export function calculateGroupStats(posts, targets = []) {
    const map = new Map();

    // Initialize all scanned targets so 0-post branches are included
    targets.forEach(t => {
        const targetObj = enrichTargetWithCanonical({ ...t });
        const key = targetObj.id || targetObj.rawId || targetObj.canonicalName || targetObj.name;
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
        const key = t.id || t.rawId || t.canonicalName || t.name;
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
        return {
            ...s,
            totalInteractions,
            erViews,
            erPosts
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
