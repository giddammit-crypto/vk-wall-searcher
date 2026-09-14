/**
 * src/api.js — VK API Network Layer & Smart Execute Batcher
 * Разработка: Амброзиев О.А.
 */

/**
 * Helper to resolve relative API URLs against the current document's base URL.
 * Works seamlessly in root domain (/), subdirectories (/vk-wall-searcher/, /stat/),
 * and local file servers without relying on window.location.origin.
 */
export function resolveApiUrl(relPath) {
    if (typeof window === 'undefined' || !window.location || !window.location.href) {
        return `http://127.0.0.1:8000/${relPath}`;
    }
    try {
        const cleanHref = window.location.href.split('?')[0].split('#')[0];
        const dirHref = cleanHref.substring(0, cleanHref.lastIndexOf('/') + 1);
        return new URL(relPath, dirHref).href;
    } catch (e) {
        return relPath;
    }
}

export let currentProxyUrl = resolveApiUrl('api/vk-proxy.php');
export let isServerProxyAvailable = true;
export const authorCache = new Map();

const CACHE_STORAGE_KEY = 'aurora_author_cache_v1';

// Restore authorCache from localStorage on initialization
try {
    if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CACHE_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parsed.forEach(([k, v]) => authorCache.set(k, v));
            }
        }
    }
} catch (e) {
    // Ignore localStorage restore errors
}

function persistAuthorCache() {
    try {
        if (typeof localStorage !== 'undefined') {
            const entries = Array.from(authorCache.entries()).slice(-400);
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
        }
    } catch (e) {}
}

/**
 * Cache author (group or user) under numeric, string, positive, negative and screen_name keys
 */
export function cacheAuthor(id, data) {
    if (!id || !data) return;
    const numId = Number(id);
    authorCache.set(id, data);
    authorCache.set(String(id), data);
    if (!isNaN(numId)) {
        authorCache.set(numId, data);
        authorCache.set(-Math.abs(numId), data);
        authorCache.set(Math.abs(numId), data);
        authorCache.set(String(-Math.abs(numId)), data);
        authorCache.set(String(Math.abs(numId)), data);
    }
    if (data.screen_name) {
        authorCache.set(data.screen_name.toLowerCase(), data);
    }
    persistAuthorCache();
}

/**
 * Lookup author in authorCache across all possible key variations
 */
export function getAuthorFromCache(id) {
    if (!id) return null;
    if (authorCache.has(id)) return authorCache.get(id);
    const numId = Number(id);
    if (!isNaN(numId)) {
        if (authorCache.has(numId)) return authorCache.get(numId);
        if (authorCache.has(-Math.abs(numId))) return authorCache.get(-Math.abs(numId));
        if (authorCache.has(Math.abs(numId))) return authorCache.get(Math.abs(numId));
        if (authorCache.has(String(numId))) return authorCache.get(String(numId));
        if (authorCache.has(String(-Math.abs(numId)))) return authorCache.get(String(-Math.abs(numId)));
        if (authorCache.has(String(Math.abs(numId)))) return authorCache.get(String(Math.abs(numId)));
    }
    const strId = String(id).toLowerCase();
    if (authorCache.has(strId)) return authorCache.get(strId);
    return null;
}

/**
 * Scan a list of posts for repost authors that are missing in cache,
 * batch-resolve them via VK API (groups.getById / users.get) and hydrate DOM live.
 */
export async function resolveMissingAuthors(posts, token = '') {
    if (!posts || !Array.isArray(posts) || posts.length === 0) return;

    const missingGroupIds = new Set();
    const missingUserIds = new Set();

    posts.forEach(p => {
        if (p && p.copy_history && Array.isArray(p.copy_history) && p.copy_history.length > 0) {
            const rep = p.copy_history[0];
            const repOwnerId = rep.owner_id || rep.from_id;
            if (repOwnerId) {
                const cached = getAuthorFromCache(repOwnerId);
                if (!cached) {
                    const n = Number(repOwnerId);
                    if (!isNaN(n)) {
                        if (n < 0) missingGroupIds.add(Math.abs(n));
                        else missingUserIds.add(n);
                    }
                }
            }
        }
    });

    if (missingGroupIds.size === 0 && missingUserIds.size === 0) return;

    // Resolve groups in batches of up to 100
    const gIds = Array.from(missingGroupIds);
    for (let i = 0; i < gIds.length; i += 100) {
        const chunk = gIds.slice(i, i + 100);
        try {
            const res = await callVkApi('groups.getById', { group_ids: chunk.join(','), fields: 'photo_100,photo_50,screen_name' }, token);
            const groupsList = Array.isArray(res) ? res : (res?.groups || []);
            groupsList.forEach(g => {
                const gObj = {
                    id: -Math.abs(g.id),
                    name: g.name,
                    screen_name: g.screen_name || '',
                    photo_100: g.photo_100 || g.photo_50 || '',
                    photo_50: g.photo_50 || '',
                    type: 'group'
                };
                cacheAuthor(gObj.id, gObj);
            });
        } catch (err) {
            console.warn('Failed to resolve missing groups:', chunk, err);
        }
    }

    // Resolve users in batches of up to 100
    const uIds = Array.from(missingUserIds);
    for (let i = 0; i < uIds.length; i += 100) {
        const chunk = uIds.slice(i, i + 100);
        try {
            const res = await callVkApi('users.get', { user_ids: chunk.join(','), fields: 'photo_100,photo_50,screen_name' }, token);
            const userList = Array.isArray(res) ? res : (res?.users || []);
            userList.forEach(u => {
                const uObj = {
                    id: u.id,
                    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Пользователь ВКонтакте',
                    screen_name: u.screen_name || '',
                    photo_100: u.photo_100 || u.photo_50 || '',
                    photo_50: u.photo_50 || '',
                    type: 'user'
                };
                cacheAuthor(uObj.id, uObj);
            });
        } catch (err) {
            console.warn('Failed to resolve missing users:', chunk, err);
        }
    }

    // Live-update all rendered elements waiting for resolved author names
    if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-repost-owner-id]').forEach(el => {
            const oid = el.getAttribute('data-repost-owner-id');
            const author = getAuthorFromCache(oid);
            if (author && author.name) {
                const nameEl = el.querySelector('.repost-name-text') || el;
                if (nameEl) nameEl.textContent = author.name;
                const container = el.closest('.post-repost-box, .report-repost-meta');
                if (container) {
                    const avatarImg = container.querySelector('.repost-author-avatar');
                    if (avatarImg && author.photo_100 && avatarImg.tagName === 'IMG') {
                        avatarImg.src = author.photo_100;
                    }
                }
            }
        });
    }
}

// Проверенный публичный сервисный ключ для прямого автономного режима (статический хостинг)
export const DEFAULT_STANDALONE_TOKEN = '1543ce801543ce801543ce80d0167df366115431543ce807c1370050b48ab4c01eabc6a';

/**
 * Send JSON payload to VK Proxy backend with multi-candidate path fallback
 */
export async function sendProxyRequest(payload) {
    const candidateUrls = [
        currentProxyUrl,
        resolveApiUrl('api/vk-proxy.php'),
        'api/vk-proxy.php',
        resolveApiUrl('api/vk-proxy'),
        '/api/vk-proxy.php'
    ];

    // Remove duplicates while preserving order
    const urlsToTry = Array.from(new Set(candidateUrls.filter(Boolean)));

    for (let i = 0; i < urlsToTry.length; i++) {
        const targetUrl = urlsToTry[i];
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 25000) : null;
        try {
            const resp = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            });
            if (timeoutId) clearTimeout(timeoutId);

            // If we got any HTTP response from the proxy server (even 500/502/504), the endpoint exists!
            if (resp && resp.status !== 404 && resp.status !== 405) {
                currentProxyUrl = targetUrl;
                isServerProxyAvailable = true;
                return resp;
            }
        } catch (netErr) {
            if (timeoutId) clearTimeout(timeoutId);
            // If the verified working URL timed out or had network error, avoid wasting 25s x 4 retrying exact aliases
            if (currentProxyUrl && targetUrl === currentProxyUrl) {
                break;
            }
        }
    }

    isServerProxyAvailable = false;
    return null;
}

/**
 * Direct browser call to VK API using JSONP (zero CORS limitations).
 * Works on any static hosting without PHP / Node / Vite!
 */
export function callVkApiJsonp(method, params = {}, token = '') {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return reject(new Error('JSONP поддерживается только в браузере.'));
        }

        const activeToken = token || DEFAULT_STANDALONE_TOKEN;
        const callbackName = 'vk_jsonp_cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const script = document.createElement('script');
        script.type = 'text/javascript';

        const queryObj = {
            ...params,
            access_token: activeToken,
            v: params.v || '5.131',
            callback: callbackName
        };

        const searchParams = new URLSearchParams();
        for (const [k, v] of Object.entries(queryObj)) {
            if (v !== undefined && v !== null) {
                searchParams.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
            }
        }

        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Превышено время ожидания ответа от VK API (JSONP). Проверьте интернет-соединение.'));
        }, 25000);

        function cleanup() {
            clearTimeout(timeoutId);
            try {
                delete window[callbackName];
            } catch (e) {
                window[callbackName] = undefined;
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }

        window[callbackName] = function(data) {
            cleanup();
            if (!data) {
                return reject(new Error('Пустой ответ от VK API'));
            }
            if (data.error) {
                const code = data.error.error_code;
                const msg = data.error.error_msg || 'Неизвестная ошибка VK API';
                if (code === 6 || code === 29) {
                    return reject(new Error('Превышен лимит запросов VK API. Подождите несколько секунд и попробуйте снова.'));
                }
                if (code === 15 || code === 200 || code === 201 || code === 203) {
                    return reject(new Error(`Доступ запрещён: ${msg}. Проверьте токен в настройках.`));
                }
                return reject(new Error(`Ошибка VK API [${code}]: ${msg}`));
            }
            resolve(data.response);
        };

        script.onerror = function() {
            cleanup();
            reject(new Error('Сетевая ошибка при обращении к api.vk.com. Проверьте соединение или блокировщики рекламы.'));
        };

        script.src = `https://api.vk.com/method/${encodeURIComponent(method)}?${searchParams.toString()}`;
        document.head.appendChild(script);
    });
}

/**
 * Call a single VK API method via proxy with automatic direct JSONP fallback.
 */
export async function callVkApi(method, params = {}, token = '') {
    // 1. Попытка через PHP-прокси сервера
    if (isServerProxyAvailable) {
        try {
            const payload = {
                method: method,
                params: params
            };
            if (token) {
                payload.token = token;
            }
            const response = await sendProxyRequest(payload);
            if (response) {
                if (response.ok) {
                    const data = await response.json();
                    if (data.error) {
                        const code = data.error.error_code;
                        const msg = data.error.error_msg || 'Неизвестная ошибка';
                        if (code === 6 || code === 29) {
                            throw new Error('Превышен лимит запросов VK API. Подождите несколько секунд и попробуйте снова.');
                        }
                        if (code === 15 || code === 200 || code === 201 || code === 203) {
                            throw new Error(`Доступ запрещён: ${msg}. Проверьте права токена.`);
                        }
                        throw new Error(`Ошибка VK API [${code}]: ${msg}`);
                    }
                    return data.response;
                } else {
                    // Сервер вернул ошибку (например 502/504) с JSON-ответом
                    try {
                        const errData = await response.json();
                        if (errData && errData.error) {
                            throw new Error(`Ошибка VK API [${errData.error.error_code}]: ${errData.error.error_msg}`);
                        }
                    } catch (parseErr) {
                        if (parseErr.message && parseErr.message.includes('VK API')) throw parseErr;
                    }
                    throw new Error(`Ошибка VK API (HTTP ${response.status})`);
                }
            }
        } catch (error) {
            // Если ошибка VK API, а не сетевой сбой — пробрасываем, чтобы не маскировать под сбой прокси
            if (error && error.message && error.message.includes('VK API')) {
                throw error;
            }
            console.warn('Серверный прокси недоступен, переключаемся на прямой клиентский режим (JSONP):', error);
        }
    }

    // 2. Автономный режим прямого обращения к VK API (работает на любом хостинге)
    return await callVkApiJsonp(method, params, token);
}

/**
 * Smart Batch Scanner via VK API execute
 * Executes up to maxCalls wall.get calls inside VK servers in 1 network roundtrip.
 * Returns posts, profiles, groups and has_more flag.
 * Supports early-break on server when min_time boundary is crossed.
 *
 * v3.4.1+: адаптивные комбинации «порция × число вызовов» — при ошибке VK 13
 * («response size is too big») или таймауте (504) автоматический повтор с меньшим объёмом
 * вместо медленного последовательного fallback.
 */
export async function callVkExecuteBatch(ownerId, offset = 0, minTime = 0, token = '', maxCalls = 10) {
    const attempts = [
        { perPage: 100, calls: Math.min(maxCalls, 5) },
        { perPage: 50,  calls: Math.min(maxCalls, 4) },
        { perPage: 25,  calls: Math.min(maxCalls, 4) }
    ];
    let lastErr = null;
    for (let a = 0; a < attempts.length; a++) {
        try {
            return await executeBatchInternal(ownerId, offset, minTime, token, attempts[a].calls, attempts[a].perPage);
        } catch (e) {
            lastErr = e;
            const msg = String((e && e.message) || '');
            const isSizeOverflow = /too big|error_code.{0,4}13|\[13\]|504|timeout|таймаут/i.test(msg);
            if (!isSizeOverflow || a === attempts.length - 1) {
                throw e;
            }
            console.warn(`execute: ответ превышает лимит VK или таймаут — уменьшаю объём до ${attempts[a + 1].perPage}×${attempts[a + 1].calls}`);
        }
    }
    throw lastErr;
}

async function executeBatchInternal(ownerId, offset = 0, minTime = 0, token = '', maxCalls = 10, perPage = 100) {
    const safeOwnerId = parseInt(ownerId, 10);
    const safeOffset = parseInt(offset, 10);
    const safeMinTime = parseInt(minTime, 10) || 0;
    const safeMaxCalls = Math.min(Math.max(parseInt(maxCalls, 10) || 10, 1), 15);
    const safePerPage = Math.min(Math.max(parseInt(perPage, 10) || 100, 10), 100);

    const code = `
var owner_id = ${safeOwnerId};
var offset = ${safeOffset};
var min_time = ${safeMinTime};
var max_calls = ${safeMaxCalls};
var per_page = ${safePerPage};
var i = 0;
var items = [];
var profiles = [];
var groups = [];
var total = 0;
var has_more = 1;

while (i < max_calls) {
    var r = API.wall.get({
        "owner_id": owner_id,
        "offset": offset + (i * per_page),
        "count": per_page,
        "extended": 1
    });
    if (!r || !r.items || r.items.length == 0) {
        has_more = 0;
        return { "count": total, "items": items, "profiles": profiles, "groups": groups, "has_more": has_more, "calls": i };
    }
    if (total == 0) {
        total = r.count;
    }
    items = items + r.items;
    if (r.profiles) {
        profiles = profiles + r.profiles;
    }
    if (r.groups) {
        groups = groups + r.groups;
    }
    if (r.items.length < per_page) {
        has_more = 0;
        return { "count": total, "items": items, "profiles": profiles, "groups": groups, "has_more": has_more, "calls": i + 1 };
    }
    if (min_time > 0) {
        var last_item = r.items[r.items.length - 1];
        if (last_item.date < min_time) {
            has_more = 0;
            return { "count": total, "items": items, "profiles": profiles, "groups": groups, "has_more": has_more, "calls": i + 1 };
        }
    }
    i = i + 1;
}
return { "count": total, "items": items, "profiles": profiles, "groups": groups, "has_more": has_more, "calls": i };
`.trim();

    return await callVkApi('execute', { code: code }, token);
}

/**
 * Verify if access token is alive (works via proxy or direct JSONP)
 */
export async function verifyToken(token) {
    try {
        const res = await callVkApi('users.get', {}, token);
        return Array.isArray(res);
    } catch (e) {
        return false;
    }
}

/**
 * Probe the server-side service key configuration.
 * Сервер отвечает только флагами доступности — сам ключ клиенту не отдаётся.
 * При недоступности PHP возвращает mode: 'standalone'.
 * @returns {Promise<{reachable: boolean, configured: boolean, fallback: boolean, mode: string}>}
 */
export async function getServerTokenStatus() {
    try {
        const response = await sendProxyRequest({
            method: '__server_status__',
            params: {}
        });
        if (response && response.ok) {
            const data = await response.json();
            return {
                reachable: true,
                configured: !!(data && data.server_token_configured),
                fallback: !!(data && data.fallback_configured),
                mode: 'proxy'
            };
        }
    } catch (e) {
        // Continue to standalone mode
    }
    return {
        reachable: false,
        configured: false,
        fallback: false,
        mode: 'standalone'
    };
}

/**
 * Resolve VK screen name or numeric ID to target object
 */
export async function resolveTarget(targetName, token) {
    targetName = String(targetName).trim();
    if (!targetName) {
        throw new Error('Укажите ID или короткое имя сообщества.');
    }

    // Strip query parameters (?w=wall...) and hashes
    targetName = targetName.split('?')[0].split('#')[0].trim();

    // Remove full vk.com URL prefix if provided
    targetName = targetName.replace(/^(https?:\/\/)?(www\.)?vk\.com\//i, '').replace(/\/+$/, '');

    // Take only the first segment if path has slashes (e.g. "club123/all")
    if (targetName.includes('/')) {
        targetName = targetName.split('/')[0].trim();
    }

    // Check if directly a negative/positive number
    const isNum = /^-?\d+$/.test(targetName);
    if (isNum) {
        const rawId = parseInt(targetName, 10);
        if (rawId < 0) {
            return await fetchGroupInfo(Math.abs(rawId), token);
        } else {
            return await fetchUserInfo(rawId, token);
        }
    }

    // Check for prefixes club/public/event/id
    const clubRegex = /^(club|public|event)(\d+)$/;
    const userRegex = /^id(\d+)$/;
    let match;
    if ((match = clubRegex.exec(targetName))) {
        return await fetchGroupInfo(parseInt(match[2], 10), token);
    } else if ((match = userRegex.exec(targetName))) {
        return await fetchUserInfo(parseInt(match[1], 10), token);
    }

    // Resolve via utils.resolveScreenName
    const res = await callVkApi('utils.resolveScreenName', { screen_name: targetName }, token);
    if (!res) {
        throw new Error(`Имя или ID "${targetName}" не найдено в ВКонтакте.`);
    }

    if (res.type === 'group') {
        return await fetchGroupInfo(res.object_id, token);
    } else if (res.type === 'user') {
        return await fetchUserInfo(res.object_id, token);
    } else {
        throw new Error(`Неподдерживаемый тип объекта ВКонтакте: ${res.type}`);
    }
}

export async function fetchGroupInfo(groupId, token) {
    const res = await callVkApi('groups.getById', { group_id: Math.abs(groupId), fields: 'photo_100,screen_name,members_count' }, token);
    let groupList = [];
    if (Array.isArray(res)) {
        groupList = res;
    } else if (res && Array.isArray(res.groups)) {
        groupList = res.groups;
    }
    if (!groupList || groupList.length === 0) {
        throw new Error(`Сообщество с ID ${groupId} не найдено.`);
    }
    const g = groupList[0];
    return {
        id: -Math.abs(g.id),
        name: g.name,
        avatar: g.photo_100 || g.photo_50 || '',
        link: `https://vk.com/${g.screen_name || ('club' + g.id)}`,
        screen_name: g.screen_name || '',
        // Текущее число подписчиков — используется вкладкой «Подписчики»
        members_count: typeof g.members_count === 'number' ? g.members_count : null,
        type: 'group'
    };
}

export async function fetchUserInfo(userId, token) {
    const res = await callVkApi('users.get', { user_ids: userId, fields: 'photo_100,screen_name' }, token);
    const userList = Array.isArray(res) ? res : (res && res.users ? res.users : []);
    if (!userList || userList.length === 0) {
        throw new Error(`Пользователь с ID ${userId} не найден.`);
    }
    const u = userList[0];
    const isDeleted = u.first_name === 'DELETED' || u.deactivated === 'deleted' || u.deactivated === 'banned';
    return {
        id: u.id,
        name: isDeleted ? '' : `${u.first_name} ${u.last_name}`.trim(),
        avatar: isDeleted ? '' : (u.photo_100 || ''),
        link: `https://vk.com/${u.screen_name || ('id' + u.id)}`,
        screen_name: u.screen_name || '',
        type: 'user',
        deactivated: u.deactivated || (isDeleted ? 'deleted' : null)
    };
}

