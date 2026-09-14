/**
 * src/render.js — Post Card, Skeleton Loader, Media & Modal Renderers
 * Разработка: Амброзиев О.А.
 */

import { enrichTargetWithCanonical, renderBranchAvatarHtml, escapeHtml, findCanonicalBranch } from './branches.js?v=4.8.3';
import { extractNum, formatViews } from './analytics.js?v=4.8.3';
import { authorCache, getAuthorFromCache } from './api.js?v=4.8.3';

export function linkifyText(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #ec4899 !important; text-decoration: underline !important; font-weight: 600;">${url}</a>`;
    });
}

/**
 * Truncate text to maxSentences (default 10) with awareness of Russian abbreviations,
 * returning preview HTML, full HTML and truncation metadata.
 */
export function truncateToSentences(text, maxSentences = 10) {
    if (!text || !text.trim()) {
        return {
            isTruncated: false,
            previewHtml: '<span style="color:var(--muted);font-style:italic;">(Без текста)</span>',
            fullHtml: '',
            sentenceCount: 0,
            remainingCount: 0
        };
    }

    const trimmed = text.trim();

    // Map to protect common Russian abbreviations and numeric patterns from false sentence splits
    const abbrMap = new Map();
    let abbrIndex = 0;
    const saveAbbr = (match) => {
        const placeholder = `__ABBR_${abbrIndex++}__`;
        abbrMap.set(placeholder, match);
        return placeholder;
    };

    // Protect known Russian abbreviations (г., ул., д., им., пр., просп., пер., стр., корп., кв., т.д., т.п., т.е., руб., коп., тел., факс.)
    let protectedText = trimmed.replace(/(?:^|\s)(?:г|ул|д|им|пр|просп|пер|стр|корп|кв|т\.д|т\.п|т\.е|руб|коп|тел|факс)\./gi, saveAbbr);
    
    // Protect decimal numbers and dates like 12.05.2024 or 1.5
    protectedText = protectedText.replace(/\b\d+\.\d+(?:\.\d+)?\b/g, saveAbbr);

    // Split text into sentences by [.!?…] followed by space or newline, or by multiple newlines
    const sentenceRegex = /[^.!?…\n]+(?:[.!?…]+(?=\s+|$|\n)|\n+|$)/g;
    const matches = protectedText.match(sentenceRegex) || [protectedText];

    // Restore protected abbreviations for each sentence
    const restore = (str) => {
        let res = str;
        abbrMap.forEach((val, key) => {
            res = res.replaceAll(key, val);
        });
        return res.trim();
    };

    const sentences = matches.map(restore).filter(s => s.length > 0);
    const sentenceCount = sentences.length;
    const fullHtml = escapeHtml(trimmed).replace(/\r?\n/g, '<br>');

    if (sentenceCount <= maxSentences) {
        return {
            isTruncated: false,
            previewHtml: fullHtml,
            fullHtml: fullHtml,
            sentenceCount,
            remainingCount: 0
        };
    }

    // Truncate to first maxSentences
    const firstSentences = sentences.slice(0, maxSentences).join(' ');
    const previewHtml = escapeHtml(firstSentences).replace(/\r?\n/g, '<br>') + '…';

    return {
        isTruncated: true,
        previewHtml,
        fullHtml,
        sentenceCount,
        remainingCount: sentenceCount - maxSentences
    };
}

export function formatHumanDate(dateInput) {
    if (!dateInput) return '';
    let dateObj = dateInput;
    if (typeof dateInput === 'number') {
        dateObj = new Date(dateInput < 1e11 ? dateInput * 1000 : dateInput);
    } else if (typeof dateInput === 'string') {
        dateObj = new Date(dateInput);
    }
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yearStr = dateObj.getFullYear();
    const hoursStr = String(dateObj.getHours()).padStart(2, '0');
    const minStr = String(dateObj.getMinutes()).padStart(2, '0');
    const dayOfWeek = days[dateObj.getDay()];
    return `${dayStr}.${monthStr}.${yearStr} ${hoursStr}:${minStr} (${dayOfWeek})`;
}

export function formatVideoDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) {
        return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${min}:${String(sec).padStart(2, '0')}`;
}

export function bestVideoThumb(video) {
    if (!video) return '';
    if (video.image && Array.isArray(video.image) && video.image.length > 0) {
        const sorted = [...video.image].sort((a, b) => (b.width || 0) - (a.width || 0));
        return sorted[0].url;
    }
    return video.photo_800 || video.photo_640 || video.photo_320 || video.photo_130 || '';
}

export function extractVideoUrls(video) {
    if (!video) return { pageUrl: '', playerUrl: '' };
    const ownerId = video.owner_id;
    const videoId = video.id;
    const accessKey = video.access_key ? `&access_key=${video.access_key}` : '';
    const pageUrl = `https://vk.com/video${ownerId}_${videoId}`;
    const playerUrl = video.player || `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}${accessKey}`;
    return { pageUrl, playerUrl };
}

export function resolveRepostAuthor(repost) {
    if (!repost) return { name: 'ВКонтакте', avatar: '', url: 'https://vk.com', postUrl: '', isBranch: false, rawOwnerId: 0 };
    const ownerId = repost.owner_id || repost.from_id;
    const postId = repost.id;
    const postUrl = ownerId && postId ? `https://vk.com/wall${ownerId}_${postId}` : '';

    // 1. Check if the repost author is one of the 18 library branches
    let branch = findCanonicalBranch({ id: ownerId });
    if (!branch) {
        const cached = getAuthorFromCache(ownerId);
        if (cached) {
            branch = findCanonicalBranch({
                id: ownerId,
                name: cached.name,
                link: cached.screen_name ? `https://vk.com/${cached.screen_name}` : ''
            });
        }
    }

    if (branch) {
        const fallbackUrl = Number(ownerId) < 0 ? `https://vk.com/club${Math.abs(Number(ownerId))}` : `https://vk.com/id${ownerId}`;
        return {
            name: branch.canonicalName,
            avatar: branch.avatar || '',
            url: branch.vkLink || fallbackUrl,
            postUrl: postUrl || branch.vkLink || fallbackUrl,
            isBranch: true,
            branch: branch,
            rawOwnerId: ownerId
        };
    }

    // 2. Check authorCache for VK profiles / groups
    const cached = getAuthorFromCache(ownerId);
    if (cached) {
        const isGroup = Number(ownerId) < 0 || cached.type === 'group';
        if (isGroup) {
            return {
                name: cached.name || 'Сообщество ВКонтакте',
                avatar: cached.photo_100 || cached.photo_50 || '',
                url: `https://vk.com/${cached.screen_name || ('club' + Math.abs(Number(ownerId)))}`,
                postUrl: postUrl || `https://vk.com/${cached.screen_name || ('club' + Math.abs(Number(ownerId)))}`,
                isBranch: false,
                rawOwnerId: ownerId
            };
        } else {
            return {
                name: `${cached.first_name || ''} ${cached.last_name || ''}`.trim() || cached.name || 'Пользователь ВКонтакте',
                avatar: cached.photo_100 || cached.photo_50 || '',
                url: `https://vk.com/${cached.screen_name || ('id' + ownerId)}`,
                postUrl: postUrl || `https://vk.com/${cached.screen_name || ('id' + ownerId)}`,
                isBranch: false,
                rawOwnerId: ownerId
            };
        }
    }

    // 3. Clean fallback (never display raw ID, async resolver will hydrate real name)
    const isGroup = Number(ownerId) < 0;
    return {
        name: isGroup ? 'Сообщество ВКонтакте' : 'Пользователь ВКонтакте',
        avatar: '',
        url: isGroup ? `https://vk.com/club${Math.abs(Number(ownerId))}` : `https://vk.com/id${ownerId}`,
        postUrl: postUrl || (isGroup ? `https://vk.com/club${Math.abs(Number(ownerId))}` : `https://vk.com/id${ownerId}`),
        isBranch: false,
        rawOwnerId: ownerId
    };
}

/**
 * Copy post link to clipboard with instant feedback animation
 */
export async function copyPostToClipboard(url, btnElement) {
    try {
        await navigator.clipboard.writeText(url);
    } catch(e) {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    if (btnElement) {
        const originalContent = btnElement.innerHTML;
        btnElement.classList.add('copy-success');
        btnElement.innerHTML = `<span class="material-symbols-outlined icon" style="color:var(--accent,#ec4899); font-size:16px;">check</span><span>Скопировано!</span>`;
        setTimeout(() => {
            btnElement.classList.remove('copy-success');
            btnElement.innerHTML = originalContent;
        }, 2000);
    }
}

/**
 * Create Shimmer Skeleton Card for smooth loading feedback
 */
export function createSkeletonCard() {
    const div = document.createElement('div');
    div.className = 'post-card skeleton-card';
    div.innerHTML = `
        <div class="post-card-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-meta">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-subtitle"></div>
            </div>
        </div>
        <div class="post-card-body">
            <div class="skeleton-line skeleton-text-1"></div>
            <div class="skeleton-line skeleton-text-2"></div>
            <div class="skeleton-line skeleton-text-3"></div>
            <div class="skeleton-media"></div>
        </div>
        <div class="post-card-footer">
            <div class="skeleton-stats-pills">
                <div class="skeleton-pill"></div>
                <div class="skeleton-pill"></div>
                <div class="skeleton-pill"></div>
            </div>
            <div class="skeleton-pill skeleton-btn"></div>
        </div>
    `;
    return div;
}

/**
 * Create Post Card DOM element
 */
export function createPostCard(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    
    const target = post.targetInfo || post.canonicalBranch || { name: post.sourceName || 'Библиотека', id: Math.abs(post.owner_id || 0) };
    enrichTargetWithCanonical(target);
    post.targetInfo = target;
    const displayName = target.canonicalName || target.name || 'Библиотека';
    const postLink = `https://vk.com/wall${target.id || Math.abs(post.owner_id || 0)}_${post.id}`;
    const dateStr = post.humanDate || (post.date ? formatHumanDate(post.date) : '');
    
    // Header
    const headerHtml = `
        <div class="post-card-header">
            ${renderBranchAvatarHtml(target, 'md', 'author-avatar-wrap')}
            <div class="author-info">
                <span class="author-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
                <span class="post-date">${dateStr}</span>
            </div>
        </div>
    `;

    // Body
    const hasText = !!(post.text && post.text.trim());
    const hasLongText = hasText && post.text.length > 300;
    const bodyText = post.text || '';

    const SIZE_PRI_CARD = ['w','z','x','y','r','q','p','m','s'];
    function bestCardPhotoUrl(ph) {
        if (!ph) return null;
        if (Array.isArray(ph.sizes) && ph.sizes.length > 0) {
            for (const t of SIZE_PRI_CARD) { const s = ph.sizes.find(s => s.type === t); if (s?.url) return s.url; }
            return ph.sizes[ph.sizes.length - 1]?.url || null;
        }
        for (const k of ['photo_2560','photo_1280','photo_807','photo_604','photo_130']) { if (ph[k]) return ph[k]; }
        return null;
    }

    const hasRepost = Array.isArray(post.copy_history) && post.copy_history.length > 0;
    const repost = hasRepost ? post.copy_history[0] : null;

    const directAttachments = post.attachments || [];
    const directPhotos = directAttachments
        .filter(att => att.type === 'photo' && att.photo)
        .map(att => bestCardPhotoUrl(att.photo))
        .filter(Boolean);
    const directVideos = directAttachments
        .filter(att => att.type === 'video' && att.video)
        .map(att => att.video);
    const directLinks = directAttachments
        .filter(att => att.type === 'link' && att.link?.url)
        .map(att => att.link);

    const repostAttachments = repost ? (repost.attachments || []) : [];
    const repostPhotos = repostAttachments
        .filter(att => att.type === 'photo' && att.photo)
        .map(att => bestCardPhotoUrl(att.photo))
        .filter(Boolean);
    const repostVideos = repostAttachments
        .filter(att => att.type === 'video' && att.video)
        .map(att => att.video);
    const repostLinks = repostAttachments
        .filter(att => att.type === 'link' && att.link?.url)
        .map(att => att.link);

    function renderCardPhotos(photoList, isPhotoOnly = false) {
        if (!photoList || photoList.length === 0) return '';
        let gridClass = 'count-1';
        if (photoList.length === 2) gridClass = 'count-2';
        else if (photoList.length === 3) gridClass = 'count-3';
        else if (photoList.length === 4) gridClass = 'count-4';
        else if (photoList.length > 4) gridClass = 'more';
        const poClass = isPhotoOnly ? ' photo-only' : '';
        return `<div class="post-attachments ${gridClass}${poClass}">` +
            photoList.map(pUrl => `<img class="attachment-img" src="${pUrl}" alt="Фото" data-src="${pUrl}" loading="lazy">`).join('') +
            `</div>`;
    }

    function renderCardVideos(videoList) {
        if (!videoList || videoList.length === 0) return '';
        return videoList.map(v => {
            const { pageUrl, playerUrl } = extractVideoUrls(v);
            const thumbUrl = bestVideoThumb(v);
            const duration = formatVideoDuration(v.duration);
            return `
            <div class="post-video-card" data-player-url="${playerUrl}" data-page-url="${pageUrl}">
                <div class="video-preview-wrap">
                    ${thumbUrl ? `<img class="video-thumb" src="${thumbUrl}" alt="${escapeHtml(v.title || 'Видео')}" loading="lazy">` : `<div class="video-thumb-placeholder"><span class="material-symbols-outlined">smart_display</span></div>`}
                    <button class="video-play-btn" type="button" aria-label="Воспроизвести">
                        <span class="material-symbols-outlined">play_arrow</span>
                    </button>
                    ${duration ? `<span class="video-duration-badge">${duration}</span>` : ''}
                </div>
                <div class="video-card-meta">
                    <span class="material-symbols-outlined video-meta-icon">play_circle</span>
                    <span class="video-card-title">${escapeHtml(v.title || 'Видеозапись')}</span>
                    <a href="${pageUrl}" target="_blank" rel="noopener noreferrer" class="video-open-vk-link" title="Открыть в VK" onclick="event.stopPropagation();">
                        <span class="material-symbols-outlined">open_in_new</span>
                    </a>
                </div>
            </div>`;
        }).join('');
    }

    function renderCardLinks(linkList) {
        if (!linkList || linkList.length === 0) return '';
        let html = '';
        linkList.forEach(link => {
            let hostname = '';
            try { hostname = new URL(link.url).hostname; } catch(e) { hostname = link.url; }
            html += `
                <div class="attachment-link-card" onclick="window.open('${escapeHtml(link.url)}', '_blank')" style="cursor:pointer;">
                    <span class="material-symbols-outlined link-icon">link</span>
                    <div class="link-info">
                        <div class="link-title">${escapeHtml(link.title || 'Внешняя ссылка')}</div>
                        <div class="link-url">${escapeHtml(hostname)}</div>
                    </div>
                </div>`;
        });
        return html;
    }

    let repostHtml = '';
    if (hasRepost && repost) {
        const rAuthor = resolveRepostAuthor(repost);
        const rDate = repost.date ? formatHumanDate(new Date(repost.date * 1000)) : '';
        const rText = repost.text ? linkifyText(escapeHtml(repost.text)) : '';
        const rPhotos = renderCardPhotos(repostPhotos, !rText);
        const rVideos = renderCardVideos(repostVideos);
        const rLinks = renderCardLinks(repostLinks);
        const authorLink = rAuthor.postUrl || rAuthor.url;
        repostHtml = `
            <div class="post-repost-box">
                <div class="repost-header">
                    <span class="material-symbols-outlined repost-icon-indicator" title="Репост">repeat</span>
                    ${rAuthor.avatar ? `<img class="repost-author-avatar" src="${escapeHtml(rAuthor.avatar)}" alt="${escapeHtml(rAuthor.name)}" loading="lazy">` : `<div class="repost-author-avatar" style="display:flex;align-items:center;justify-content:center;background:var(--surface);"><span class="material-symbols-outlined" style="font-size:16px;color:var(--accent);">group</span></div>`}
                    <div class="repost-author-info">
                        <a href="${escapeHtml(authorLink)}" target="_blank" rel="noopener noreferrer" class="repost-author-name" data-repost-owner-id="${rAuthor.rawOwnerId}" onclick="event.stopPropagation();">
                            <span class="repost-name-text">${escapeHtml(rAuthor.name)}</span>
                        </a>
                        ${rDate ? `<span class="repost-date">${escapeHtml(rDate)}</span>` : ''}
                    </div>
                </div>
                ${rText ? `<div class="repost-text">${rText}</div>` : ''}
                ${rPhotos}
                ${rVideos}
                ${rLinks}
            </div>
        `;
    }

    let textHtml = '';
    if (hasText) {
        const safeBodyText = linkifyText(escapeHtml(bodyText));
        textHtml = `
            <div class="post-text" id="post-text-${post.id}">${safeBodyText}</div>
            ${hasLongText ? `<button class="expand-text-btn" data-id="${post.id}">Читать полностью</button>` : ''}
        `;
    }

    const directPhotosHtml = renderCardPhotos(directPhotos, !hasText && directVideos.length === 0 && !hasRepost);
    const directVideosHtml = renderCardVideos(directVideos);
    const directLinksHtml = renderCardLinks(directLinks);

    if (!hasText && !hasRepost && directPhotos.length === 0 && directVideos.length === 0 && directLinks.length === 0) {
        textHtml = '<div class="post-text" style="color:var(--muted);font-style:italic;">Без текста</div>';
    }

    const likes = extractNum(post.likes);
    const reposts = extractNum(post.reposts);
    const comments = extractNum(post.comments);
    const views = extractNum(post.views);

    const footerHtml = `
        <div class="post-card-body">
            ${textHtml}
            ${directPhotosHtml}
            ${directVideosHtml}
            ${directLinksHtml}
            ${repostHtml}
        </div>
        <div class="post-card-footer">
            <div class="post-stats-row">
                <span class="stat-item stat-likes" title="Лайки"><span class="material-symbols-outlined">favorite</span> ${likes}</span>
                <span class="stat-item stat-reposts" title="Репосты"><span class="material-symbols-outlined">share</span> ${reposts}</span>
                <span class="stat-item stat-comments" title="Комментарии"><span class="material-symbols-outlined">chat_bubble</span> ${comments}</span>
                ${views ? `<span class="stat-item stat-views" title="Просмотры"><span class="material-symbols-outlined">visibility</span> ${formatViews(views)}</span>` : ''}
            </div>
            <div class="post-actions-row">
                <button type="button" class="btn btn-secondary btn-sm post-copy-link-btn" title="Скопировать ссылку на запись VK" data-post-url="${postLink}">
                    <span class="material-symbols-outlined icon">content_copy</span>
                    <span>Копия</span>
                </button>
                <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm btn-open-vk">
                    <span class="material-symbols-outlined icon">open_in_new</span>
                    <span>VK</span>
                </a>
            </div>
        </div>
    `;

    div.innerHTML = headerHtml + footerHtml;

    // Inline video playback
    div.querySelectorAll('.video-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.post-video-card');
            if (!card) return;
            const playerUrl = card.getAttribute('data-player-url');
            const wrap = card.querySelector('.video-preview-wrap');
            if (playerUrl && wrap) {
                wrap.innerHTML = `<iframe class="video-card-iframe" src="${playerUrl}&autoplay=1" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
            }
        });
    });

    // Copy link button handler
    const copyBtn = div.querySelector('.post-copy-link-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyPostToClipboard(postLink, copyBtn);
        });
    }

    // Click card to open modal
    div.addEventListener('click', (e) => {
        if (e.target.closest('a, button, .attachment-img, .video-play-btn')) return;
        openPostModal(post);
    });

    return div;
}

/**
 * Open full-featured Post Modal Window
 */
export function openPostModal(post) {
    const modal = document.getElementById('post-modal');
    const content = document.getElementById('post-modal-content');
    if (!modal || !content) return;

    const target = post.targetInfo || post.canonicalBranch || { name: post.sourceName || 'Библиотека', id: Math.abs(post.owner_id || 0) };
    enrichTargetWithCanonical(target);
    post.targetInfo = target;
    const displayName = target.canonicalName || target.name;
    const postLink = `https://vk.com/wall${target.id || Math.abs(post.owner_id || 0)}_${post.id}`;

    const SIZE_PRIORITY = ['w', 'z', 'y', 'x', 'm', 's'];
    function bestPhotoUrl(photoObj) {
        if (!photoObj) return null;
        if (Array.isArray(photoObj.sizes) && photoObj.sizes.length > 0) {
            for (const t of SIZE_PRIORITY) {
                const s = photoObj.sizes.find(s => s.type === t);
                if (s && s.url) return s.url;
            }
            return photoObj.sizes[photoObj.sizes.length - 1]?.url || null;
        }
        for (const key of ['photo_2560','photo_1280','photo_807','photo_604','photo_130']) {
            if (photoObj[key]) return photoObj[key];
        }
        return null;
    }

    const rawText = (post.text || '').trim();
    const hasText = rawText.length > 0;
    const safeText = hasText ? linkifyText(escapeHtml(post.text)) : '';

    const hasRepost = Array.isArray(post.copy_history) && post.copy_history.length > 0;
    const repost = hasRepost ? post.copy_history[0] : null;

    const directAttachments = post.attachments || [];
    const directPhotos = directAttachments
        .filter(a => a.type === 'photo' && a.photo)
        .map(a => bestPhotoUrl(a.photo))
        .filter(Boolean);
    const directVideos = directAttachments
        .filter(a => a.type === 'video' && a.video)
        .map(a => a.video);
    const directLinks = directAttachments
        .filter(a => a.type === 'link' && a.link && a.link.url)
        .map(a => a.link);

    const repostAttachments = repost ? (repost.attachments || []) : [];
    const repostPhotos = repostAttachments
        .filter(a => a.type === 'photo' && a.photo)
        .map(a => bestPhotoUrl(a.photo))
        .filter(Boolean);
    const repostVideos = repostAttachments
        .filter(a => a.type === 'video' && a.video)
        .map(a => a.video);
    const repostLinks = repostAttachments
        .filter(a => a.type === 'link' && a.link && a.link.url)
        .map(a => a.link);

    const totalPhotos = directPhotos.length + (repost ? repostPhotos.length : 0);
    const totalVideos = directVideos.length + (repost ? repostVideos.length : 0);
    const totalLinks = directLinks.length + (repost ? repostLinks.length : 0);
    const hasAnyText = hasText || (repost && (repost.text || '').trim().length > 0);

    const isSinglePhotoOnly = !hasAnyText && totalPhotos === 1 && totalVideos === 0 && totalLinks === 0;
    const isVideoOnly = !hasAnyText && totalVideos > 0 && totalPhotos === 0 && totalLinks === 0;

    const cardClasses = ['pm-card'];
    if (isSinglePhotoOnly) cardClasses.push('pm-single-photo-only');
    if (isVideoOnly) cardClasses.push('pm-video-only');

    function renderModalPhotos(photoList) {
        if (!photoList || photoList.length === 0) return '';
        let gc = 'count-1';
        if (photoList.length === 2) gc = 'count-2';
        else if (photoList.length === 3) gc = 'count-3';
        else if (photoList.length >= 4) gc = 'count-4';
        return `<div class="pm-photos post-attachments ${gc}">` +
            photoList.map(u => `<img class="attachment-img pm-photo" src="${u}" data-src="${u}" alt="Фото">`).join('') +
            `</div>`;
    }

    function renderModalVideos(videoList) {
        if (!videoList || videoList.length === 0) return '';
        return `<div class="pm-videos-wrap ${videoList.length === 1 ? 'single-video' : 'multi-video'}">` +
            videoList.map((v, idx) => {
                const { pageUrl, playerUrl } = extractVideoUrls(v);
                const thumbUrl = bestVideoThumb(v);
                const durationStr = formatVideoDuration(v.duration);
                return `
                <div class="pm-video-card" data-video-index="${idx}">
                    <div class="pm-video-player-wrap">
                        ${playerUrl ? `
                            <iframe class="pm-video-iframe" src="${playerUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>
                        ` : `
                            <div class="pm-video-fallback">
                                ${thumbUrl ? `<img src="${thumbUrl}" class="pm-video-fallback-thumb" alt="${escapeHtml(v.title || '')}">` : ''}
                                <a href="${pageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary pm-video-open-btn">
                                    <span class="material-symbols-outlined">play_arrow</span>
                                    <span>Смотреть во ВКонтакте</span>
                                </a>
                            </div>
                        `}
                    </div>
                    <div class="pm-video-meta">
                        <div class="pm-video-title-wrap">
                            <span class="material-symbols-outlined pm-video-icon">play_circle</span>
                            <span class="pm-video-title">${escapeHtml(v.title || 'Видеозапись')}</span>
                            ${durationStr ? `<span class="pm-video-duration">${durationStr}</span>` : ''}
                        </div>
                        <a href="${pageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm pm-video-ext-btn">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span>VK</span>
                        </a>
                    </div>
                </div>`;
            }).join('') +
        `</div>`;
    }

    function renderModalLinks(linkList) {
        if (!linkList || linkList.length === 0) return '';
        return linkList.map(link => {
            let host = '';
            try { host = new URL(link.url).hostname; } catch(e) { host = link.url; }
            return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="pm-link-card">
                <span class="material-symbols-outlined pm-link-icon">link</span>
                <span class="pm-link-text">
                    <span class="pm-link-title">${escapeHtml(link.title || 'Внешняя ссылка')}</span>
                    <span class="pm-link-host">${escapeHtml(host)}</span>
                </span>
                <span class="material-symbols-outlined pm-link-arrow">open_in_new</span>
            </a>`;
        }).join('');
    }

    const directPhotosHtml = renderModalPhotos(directPhotos);
    const directVideosHtml = renderModalVideos(directVideos);
    const directLinksHtml = renderModalLinks(directLinks);

    let repostModalHtml = '';
    if (hasRepost && repost) {
        const rAuthor = resolveRepostAuthor(repost);
        const rDate = repost.date ? formatHumanDate(new Date(repost.date * 1000)) : '';
        const rText = repost.text ? linkifyText(escapeHtml(repost.text)) : '';
        const rPhotos = renderModalPhotos(repostPhotos);
        const rVideos = renderModalVideos(repostVideos);
        const rLinks = renderModalLinks(repostLinks);
        const authorLink = rAuthor.postUrl || rAuthor.url;

        repostModalHtml = `
            <div class="pm-repost-box">
                <div class="pm-repost-header">
                    <span class="material-symbols-outlined pm-repost-icon" title="Репост">repeat</span>
                    ${rAuthor.avatar ? `<img class="pm-repost-avatar" src="${escapeHtml(rAuthor.avatar)}" alt="${escapeHtml(rAuthor.name)}" loading="lazy">` : `<div class="pm-repost-avatar" style="display:flex;align-items:center;justify-content:center;background:var(--surface);"><span class="material-symbols-outlined" style="font-size:18px;color:var(--accent);">group</span></div>`}
                    <div class="pm-repost-meta">
                        <a href="${escapeHtml(authorLink)}" target="_blank" rel="noopener noreferrer" class="pm-repost-author-name" data-repost-owner-id="${rAuthor.rawOwnerId}">
                            <span class="repost-name-text">${escapeHtml(rAuthor.name)}</span>
                        </a>
                        ${rDate ? `<span class="pm-repost-date">${escapeHtml(rDate)}</span>` : ''}
                    </div>
                </div>
                ${rText ? `<div class="pm-repost-text">${rText}</div>` : ''}
                ${rPhotos}
                ${rVideos}
                ${rLinks}
            </div>
        `;
    }

    const likes = extractNum(post.likes);
    const reposts = extractNum(post.reposts);
    const comments = extractNum(post.comments);
    const views = extractNum(post.views);

    content.innerHTML = `
        <div class="${cardClasses.join(' ')}" role="dialog" aria-modal="true">
            <div class="pm-topbar">
                <div class="pm-author">
                    ${renderBranchAvatarHtml(post.targetInfo, 'lg', 'author-avatar-wrap')}
                    <div class="pm-author-info">
                        <span class="pm-author-name">${escapeHtml(displayName)}</span>
                        <span class="pm-author-date">${post.humanDate}</span>
                    </div>
                </div>
                <div class="pm-actions">
                    <button type="button" class="btn btn-secondary btn-sm pm-copy-link-btn" title="Скопировать ссылку на запись VK">
                        <span class="material-symbols-outlined icon">content_copy</span>
                        <span>Скопировать</span>
                    </button>
                    <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                        <span class="material-symbols-outlined icon">open_in_new</span>
                        <span>VK</span>
                    </a>
                    <button id="post-modal-close" class="pm-close-btn" aria-label="Закрыть (Esc)" title="Закрыть (Esc)">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div class="pm-body">
                ${hasText ? `<div class="pm-text">${safeText}</div>` : ''}
                ${directPhotosHtml}
                ${directVideosHtml}
                ${directLinksHtml}
                ${repostModalHtml}
            </div>

            <div class="pm-footer">
                <span class="stat-item stat-likes"><span class="material-symbols-outlined">favorite</span> ${likes}</span>
                <span class="stat-item stat-reposts"><span class="material-symbols-outlined">share</span> ${reposts}</span>
                <span class="stat-item stat-comments"><span class="material-symbols-outlined">chat_bubble</span> ${comments}</span>
                ${views ? `<span class="stat-item stat-views"><span class="material-symbols-outlined">visibility</span> ${formatViews(views)}</span>` : ''}
            </div>
        </div>
    `;

    // Bind copy link in modal
    const modalCopyBtn = content.querySelector('.pm-copy-link-btn');
    if (modalCopyBtn) {
        modalCopyBtn.addEventListener('click', () => {
            copyPostToClipboard(postLink, modalCopyBtn);
        });
    }

    // Direct binding for modal close button
    const closeBtn = content.querySelector('#post-modal-close') || content.querySelector('.pm-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closePostModal();
        });
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
    requestAnimationFrame(() => modal.classList.add('pm-open'));
    document.body.style.overflow = 'hidden';
}

/**
 * Close full-post modal window
 */
export function closePostModal() {
    const modal = document.getElementById('post-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('active', 'pm-open');
    document.body.style.overflow = '';
}

