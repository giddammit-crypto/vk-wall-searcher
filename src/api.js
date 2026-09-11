/**
 * src/api.js — VK API Network Layer & Smart Execute Batcher
 * Разработка: Амброзиев О.А.
 */

export let currentProxyUrl = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? `${window.location.origin}/api/vk-proxy.php`
    : 'http://127.0.0.1:8000/api/vk-proxy.php';
export const authorCache = new Map();

/**
 * Send JSON payload to VK Proxy backend with automatic path fallback
 */
export async function sendProxyRequest(payload) {
    let response = null;
    try {
        response = await fetch(currentProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (netErr) {
        response = null;
    }

    // If 405 Method Not Allowed or 404 Not Found, fallback to alternate URL
    if (!response || response.status === 404 || response.status === 405) {
        const fallbackUrl = currentProxyUrl.includes('.php') ? '/api/vk-proxy' : 'api/vk-proxy.php';
        try {
            const altResp = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (altResp && altResp.status !== 405 && altResp.status !== 404) {
                currentProxyUrl = fallbackUrl;
                return altResp;
            }
        } catch (e) {
            // Ignore
        }
    }

    return response;
}

/**
 * Call a single VK API method via proxy
 */
export async function callVkApi(method, params = {}, token = '') {
    if (!token) {
        throw new Error('Токен доступа VK API не настроен.');
    }
    try {
        const response = await sendProxyRequest({
            method: method,
            params: params,
            token: token
        });
        if (!response || !response.ok) {
            let errText = 'Не удалось связаться с сервером';
            if (response) {
                try {
                    const errorData = await response.json();
                    errText = errorData.detail || errorData.error_msg || (errorData.error && errorData.error.error_msg) || errText;
                } catch (e) {
                    errText = await response.text();
                }
                throw new Error(`Ошибка сервера [${response.status}]: ${errText}`);
            }
            throw new Error('Сетевая ошибка при обращении к серверу');
        }
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
    } catch (error) {
        console.error('VK API Call Error:', error);
        throw error;
    }
}

/**
 * Smart Batch Scanner via VK API execute
 * Executes up to maxCalls (default 10) wall.get calls inside VK servers in 1 network roundtrip.
 * Returns up to 1000 posts, profiles, groups, and has_more flag.
 * Supports early-break on server when min_time boundary is crossed.
 */
export async function callVkExecuteBatch(ownerId, offset = 0, minTime = 0, token = '', maxCalls = 10) {
    const safeOwnerId = parseInt(ownerId, 10);
    const safeOffset = parseInt(offset, 10);
    const safeMinTime = parseInt(minTime, 10) || 0;
    const safeMaxCalls = Math.min(Math.max(parseInt(maxCalls, 10) || 10, 1), 15);

    const code = `
var owner_id = ${safeOwnerId};
var offset = ${safeOffset};
var min_time = ${safeMinTime};
var max_calls = ${safeMaxCalls};
var i = 0;
var items = [];
var profiles = [];
var groups = [];
var total = 0;
var has_more = 1;

while (i < max_calls) {
    var r = API.wall.get({
        "owner_id": owner_id,
        "offset": offset + (i * 100),
        "count": 100,
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
    if (r.items.length < 100) {
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
 * Verify if access token is alive
 */
export async function verifyToken(token) {
    try {
        const response = await sendProxyRequest({
            method: 'users.get',
            params: {},
            token: token
        });
        if (!response || !response.ok) return false;
        const data = await response.json();
        return !data.error;
    } catch (e) {
        return false;
    }
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
    const res = await callVkApi('groups.getById', { group_id: Math.abs(groupId), fields: 'photo_100,screen_name' }, token);
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
    return {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        avatar: u.photo_100 || '',
        link: `https://vk.com/${u.screen_name || ('id' + u.id)}`,
        screen_name: u.screen_name || '',
        type: 'user'
    };
}
