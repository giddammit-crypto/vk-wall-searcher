/**
 * src/export.js — Data Export (CSV/Excel, ZIP Photos, Print Report)
 * Разработка: Амброзиев О.А.
 */

import { extractNum, formatViews } from './analytics.js';
import { escapeHtml, declOfNum, findCanonicalBranch } from './branches.js';

/**
 * Trigger file download from a Blob
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Export matching posts to CSV format (UTF-8 with BOM, readable by Excel)
 */
export function exportToCsv(posts) {
    if (!posts || posts.length === 0) {
        throw new Error('Нет данных для экспорта');
    }

    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
        'Дата',
        'Филиал',
        'Текст (первые 200 симв.)',
        'Ссылка на запись',
        'Лайки',
        'Репосты',
        'Комментарии',
        'Просмотры',
        'Коэффициент вовлечения (ER %)'
    ];

    const rows = posts.map(p => {
        const views = extractNum(p.views) || 1;
        const likes = extractNum(p.likes);
        const reposts = extractNum(p.reposts);
        const comments = extractNum(p.comments);
        const er = (((likes + reposts + comments) / views) * 100).toFixed(2);
        const targetName = p.targetInfo?.canonicalName || p.targetInfo?.name || p._targetName || 'Источник';
        const postLink = `https://vk.com/wall${p.targetInfo?.id || p.owner_id}_${p.id}`;

        let textExport = (p.text || '').trim();
        if (!textExport && p.copy_history && p.copy_history[0]) {
            const rep = p.copy_history[0];
            const repOwnerId = rep.owner_id || rep.from_id;
            const branch = findCanonicalBranch({ id: repOwnerId });
            const srcName = branch ? branch.canonicalName : (repOwnerId < 0 ? `club${Math.abs(repOwnerId)}` : `id${repOwnerId}`);
            textExport = `[Репост: ${srcName}] ${(rep.text || '').trim()}`;
        }

        return [
            esc(p.humanDate || ''),
            esc(targetName),
            esc(textExport.replace(/\r?\n/g, ' ').slice(0, 200)),
            esc(postLink),
            likes,
            reposts,
            comments,
            extractNum(p.views),
            er
        ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `vk_posts_export_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export matching posts and summary statistics to JSON format
 */
export function exportToJson(posts, stats = []) {
    if (!posts || posts.length === 0) {
        throw new Error('Нет данных для экспорта в JSON');
    }

    const exportData = {
        meta: {
            title: 'Экспорт записей ВКонтакте — Мониторинг библиотек г. Владимира',
            exportedAt: new Date().toISOString(),
            totalPosts: posts.length,
            branchesCount: stats.length
        },
        branchesSummary: stats.map(s => ({
            name: s.info?.canonicalName || s.info?.name || 'Источник',
            address: s.info?.address || '',
            vkLink: s.info?.vkLink || s.info?.link || '',
            postsCount: s.postsCount,
            likes: s.likes,
            reposts: s.reposts,
            views: s.views,
            comments: s.comments
        })),
        posts: posts.map(p => ({
            id: p.id,
            ownerId: p.targetInfo?.id || p.owner_id,
            branchName: p.targetInfo?.canonicalName || p.targetInfo?.name || 'Источник',
            date: p.humanDate,
            timestamp: p.date,
            text: p.text || '',
            likes: extractNum(p.likes),
            reposts: extractNum(p.reposts),
            views: extractNum(p.views),
            comments: extractNum(p.comments),
            url: `https://vk.com/wall${p.targetInfo?.id || p.owner_id}_${p.id}`,
            hasPhotos: (p.attachments || []).some(a => a.type === 'photo'),
            hasVideos: (p.attachments || []).some(a => a.type === 'video'),
            isRepost: Boolean(p.copy_history && p.copy_history.length > 0)
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `vk_posts_data_${new Date().toISOString().slice(0, 10)}.json`);
}

/**
 * Export report to formatted Microsoft Word document (.doc format)
 */
export function exportToDocx(posts, stats = [], meta = {}) {
    if (!posts || posts.length === 0) {
        throw new Error('Нет данных для экспорта в Word');
    }

    const docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Официальный отчёт об анализе публикаций VK</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.4; margin: 20mm; }
    h1 { font-size: 16pt; color: #1e3a8a; text-align: center; margin-bottom: 6px; }
    .org-title { font-size: 9pt; text-align: center; text-transform: uppercase; color: #4b5563; margin-bottom: 12px; font-weight: bold; border-bottom: 1px solid #9ca3af; padding-bottom: 6px; }
    .passport-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
    .passport-table td { padding: 6px 10px; border: 1px solid #d1d5db; }
    .passport-label { font-weight: bold; color: #4b5563; background: #f3f4f6; width: 35%; }
    .group-header { font-size: 13pt; color: #1e40af; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
    .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt; }
    .report-table th { background: #f3f4f6; color: #1f2937; font-weight: bold; border: 1px solid #9ca3af; padding: 6px 8px; text-align: left; }
    .report-table td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .post-link { color: #2563eb; text-decoration: underline; }
    .post-text { word-break: break-word; }
</style>
</head>
<body>
    <div class="org-title">МУНИЦИПАЛЬНОЕ БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ КУЛЬТУРЫ «ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА»</div>
    <h1>Официальный отчёт об анализе публикаций VK</h1>
    <div style="text-align: center; font-size: 10pt; color: #6b7280; margin-bottom: 16px;">Сформировано: ${new Date().toLocaleString('ru-RU')}</div>

    <table class="passport-table">
        <tr>
            <td class="passport-label">Период поиска:</td>
            <td>${escapeHtml(meta.datesFilter || 'Все периоды')}</td>
        </tr>
        <tr>
            <td class="passport-label">Поисковый запрос / Ключевые слова:</td>
            <td>${escapeHtml(meta.searchQuery || 'Все темы (без фильтра по тексту)')}</td>
        </tr>
        <tr>
            <td class="passport-label">Всего найдено записей:</td>
            <td><b>${posts.length}</b></td>
        </tr>
        <tr>
            <td class="passport-label">Суммарный охват (просмотры):</td>
            <td><b>${formatViews(meta.totalViews || 0)}</b></td>
        </tr>
        <tr>
            <td class="passport-label">Суммарно реакций (лайки + репосты):</td>
            <td><b>${(meta.totalLikes || 0) + (meta.totalReposts || 0)}</b></td>
        </tr>
    </table>

    ${stats.filter(s => s.postsCount > 0).map((s, idx) => `
        <div class="group-header">
            ${idx + 1}. ${escapeHtml(s.info?.canonicalName || s.info?.name)} — ${s.postsCount} ${declOfNum(s.postsCount, ['запись', 'записи', 'записей'])}
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 30px;" class="text-center">№</th>
                    <th style="width: 110px;">Дата</th>
                    <th>Текст публикации</th>
                    <th style="width: 50px;" class="text-right">Лайки</th>
                    <th style="width: 50px;" class="text-right">Репосты</th>
                    <th style="width: 65px;" class="text-right">Просмотры</th>
                    <th style="width: 80px;" class="text-center">Ссылка</th>
                </tr>
            </thead>
            <tbody>
                ${s.posts.map((p, pi) => {
                    let docPostText = '';
                    const directText = (p.text || '').trim();
                    if (p.copy_history && p.copy_history.length > 0) {
                        const rep = p.copy_history[0];
                        const repOwnerId = rep.owner_id || rep.from_id;
                        const branch = findCanonicalBranch({ id: repOwnerId });
                        const repSource = branch ? branch.canonicalName : (repOwnerId < 0 ? `Сообщество [club${Math.abs(repOwnerId)}]` : `Пользователь [id${repOwnerId}]`);
                        const repText = (rep.text || '').trim();
                        const header = `[Репост из: ${repSource}]`;
                        if (directText && repText) {
                            docPostText = `${escapeHtml(directText)}<br><br><b>${escapeHtml(header)}</b><br>${escapeHtml(repText)}`.replace(/\r?\n/g, '<br>');
                        } else if (repText) {
                            docPostText = `<b>${escapeHtml(header)}</b><br>${escapeHtml(repText)}`.replace(/\r?\n/g, '<br>');
                        } else {
                            docPostText = `<b>${escapeHtml(header)}</b>`;
                        }
                    } else if (directText) {
                        docPostText = escapeHtml(directText).replace(/\r?\n/g, '<br>');
                    } else {
                        docPostText = '<i>(Без текста)</i>';
                    }

                    return `
                    <tr>
                        <td class="text-center">${pi + 1}</td>
                        <td style="white-space: nowrap;">${p.humanDate || ''}</td>
                        <td class="post-text">${docPostText}</td>
                        <td class="text-right">${extractNum(p.likes)}</td>
                        <td class="text-right">${extractNum(p.reposts)}</td>
                        <td class="text-right">${formatViews(p.views)}</td>
                        <td class="text-center"><a class="post-link" href="https://vk.com/wall${p.targetInfo?.id || p.owner_id}_${p.id}">Ссылка VK</a></td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `).join('')}
</body>
</html>
    `;

    const blob = new Blob(['\uFEFF' + docContent], { type: 'application/msword;charset=utf-8;' });
    downloadBlob(blob, `vk_report_official_${new Date().toISOString().slice(0, 10)}.doc`);
}

/**
 * Export self-contained standalone HTML report document
 */
export function exportToHtmlReport(documentEl) {
    if (!documentEl) {
        throw new Error('Элемент отчёта не найден.');
    }

    const clone = documentEl.cloneNode(true);
    // Expand any collapsed groups or texts in the export
    clone.querySelectorAll('.report-group-section').forEach(s => s.classList.add('expanded'));
    clone.querySelectorAll('.report-text-full').forEach(f => f.classList.remove('hidden'));
    clone.querySelectorAll('.report-text-preview').forEach(p => p.classList.add('hidden'));
    clone.querySelectorAll('.btn-report-expand-text').forEach(b => b.remove());
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Официальный отчёт по публикациям VK</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 2rem; line-height: 1.5; }
    .report-document { max-width: 1200px; margin: 0 auto; background: #ffffff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .report-header { text-align: center; margin-bottom: 2rem; }
    .report-official-badge { font-size: 0.8125rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 0.5rem; }
    .report-title { font-size: 1.5rem; color: #0f172a; margin-bottom: 1.5rem; }
    .passport-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 2rem; text-align: left; background: #f1f5f9; padding: 1.25rem; border-radius: 8px; }
    .passport-cell { font-size: 0.875rem; }
    .passport-label { font-weight: 600; color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 2px; }
    .passport-value { font-weight: 700; color: #0f172a; }
    .passport-full { grid-column: 1 / -1; }
    .report-group-section { margin-bottom: 2rem; }
    .report-group-title { font-size: 1.125rem; font-weight: 700; color: #0284c7; padding: 0.75rem 0; border-bottom: 2px solid #0284c7; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px; }
    .report-group-badge { font-size: 0.75rem; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 999px; margin-left: auto; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .report-table th { background: #f8fafc; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-weight: 600; }
    .report-table td { padding: 8px 12px; border: 1px solid #e2e8f0; vertical-align: top; }
    .report-col-text { max-width: 500px; word-break: break-word; }
    .btn-report-link { color: #0284c7; text-decoration: none; font-weight: 600; font-size: 0.75rem; border: 1px solid #0284c7; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    .avatar-icon { display: none; }
</style>
</head>
<body>
    ${clone.outerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    downloadBlob(blob, `vk_report_page_${new Date().toISOString().slice(0, 10)}.html`);
}

/**
 * Export branch activity rating ranking to CSV format
 */
export function exportRatingToCsv(groupsStats = []) {
    if (!groupsStats || groupsStats.length === 0) {
        throw new Error('Нет данных рейтинга для экспорта');
    }

    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
        '№',
        'Филиал библиотеки',
        'Адрес',
        'Количество публикаций',
        'Просмотры',
        'Лайки',
        'Репосты',
        'Комментарии',
        'Реакций на пост',
        'Коэффициент вовлечения (ER %)'
    ];

    const rows = groupsStats.map((s, idx) => {
        const views = extractNum(s.views) || 1;
        const totalReactions = s.likes + s.reposts + s.comments;
        const avgReactions = s.postsCount > 0 ? (totalReactions / s.postsCount).toFixed(1) : '0.0';
        const er = (((totalReactions) / views) * 100).toFixed(2);

        return [
            idx + 1,
            esc(s.info?.canonicalName || s.info?.name || 'Источник'),
            esc(s.info?.address || ''),
            s.postsCount,
            s.views,
            s.likes,
            s.reposts,
            s.comments,
            avgReactions,
            er
        ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `vk_branches_rating_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export all high-resolution photos in posts to a ZIP archive using JSZip
 */
export async function exportPhotosZip(posts, onProgress) {
    if (!posts || posts.length === 0) {
        throw new Error('Нет постов для выгрузки фото');
    }

    if (typeof JSZip === 'undefined') {
        throw new Error('Библиотека JSZip не загружена.');
    }

    const SIZE_PRI = ['w', 'z', 'x', 'y', 'r', 'q', 'p', 'm', 's'];
    const photos = [];

    posts.forEach(post => {
        const atts = [
            ...(post.attachments || []),
            ...((post.copy_history || []).flatMap(cp => cp.attachments || []))
        ];

        atts.filter(a => a.type === 'photo' && a.photo).forEach((a, pi) => {
            const ph = a.photo;
            let url = null;
            if (Array.isArray(ph.sizes) && ph.sizes.length > 0) {
                for (const t of SIZE_PRI) {
                    const s = ph.sizes.find(s => s.type === t);
                    if (s?.url) {
                        url = s.url;
                        break;
                    }
                }
                if (!url) url = ph.sizes[ph.sizes.length - 1]?.url;
            } else {
                for (const k of ['photo_2560', 'photo_1280', 'photo_807', 'photo_604']) {
                    if (ph[k]) {
                        url = ph[k];
                        break;
                    }
                }
            }

            if (url) {
                const prefix = post.targetInfo?.shortCode || 'post';
                photos.push({
                    url,
                    name: `${prefix}_${post.id}_photo_${pi + 1}.jpg`
                });
            }
        });
    });

    if (photos.length === 0) {
        throw new Error('В найденных записях нет прикреплённых фотографий.');
    }

    const zip = new JSZip();
    let downloaded = 0;

    for (const ph of photos) {
        try {
            const resp = await fetch(ph.url);
            if (resp.ok) {
                const blob = await resp.blob();
                zip.file(ph.name, blob);
            }
        } catch (e) {
            console.warn(`Не удалось загрузить фото ${ph.url}:`, e);
        }
        downloaded++;
        if (onProgress) {
            onProgress(downloaded, photos.length);
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `vk_photos_archive_${new Date().toISOString().slice(0, 10)}.zip`);
}

/**
 * Trigger Print Report
 */
export function openPrintReport() {
    window.print();
}

