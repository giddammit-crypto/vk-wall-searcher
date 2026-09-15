/**
 * src/updater.js — клиент самообновления приложения с GitHub
 * =============================================================================
 * Бэкенд: api/updater.php. Пароль обновления (update_token) вводится
 * пользователем в настройках и хранится в localStorage.
 *
 * Разработка: Амброзиев О.А. (модуль 3.4)
 */

import { resolveApiUrl } from './api.js?v=4.18.2';

const UPDATER_URL = resolveApiUrl('api/updater.php');

const TOKEN_KEY = 'vkws_update_token';

export function getSavedUpdateToken() {
    try {
        return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
        return '';
    }
}

export function saveUpdateToken(token) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch (e) { /* приватный режим — игнорируем */ }
}

/**
 * Текущая версия и данные о последних проверках/обновлениях.
 */
export async function fetchUpdaterStatus() {
    try {
        const res = await fetch(`${UPDATER_URL}?action=status`);
        if (!res || !res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

/**
 * Проверка наличия новой версии на GitHub.
 * @param {boolean} force — игнорировать 6-часовой кэш
 */
export async function checkForUpdates(force = false) {
    const res = await fetch(UPDATER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', force: force ? 1 : undefined })
    });
    const data = res ? await res.json() : null;
    if (!res || !res.ok || !data || !data.ok) {
        throw new Error(data && data.error ? data.error : `HTTP ${res ? res.status : '—'}`);
    }
    return data;
}

/**
 * Скачивание и немедленное применение новой версии.
 */
export async function applyUpdate(token, force = false) {
    const res = await fetch(UPDATER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', token, force: force ? 1 : undefined })
    });
    const data = res ? await res.json() : null;
    if (!res || !res.ok || !data || !data.ok) {
        throw new Error(data && data.error ? data.error : `HTTP ${res ? res.status : '—'}`);
    }
    return data;
}

/**
 * Короткий хеш коммита для бейджей
 */
export function shortSha(sha) {
    return String(sha || '').slice(0, 7);
}
