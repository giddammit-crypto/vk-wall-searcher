/**
 * src/branches.js — Canonical Catalog & Branch Resolvers
 * Разработка: Амброзиев О.А.
 */

// Russian numeral declension helper
export function declOfNum(n, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[(n % 10 < 5) ? n % 10 : 5]];
}

export function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Canonical Catalog for the 18 Library Branches of Vladimir (МБУК «ЦГБ», https://biblioteka33.ru/?p=19379)
export const CANONICAL_BRANCHES = [
    {
        canonicalName: 'Центральная городская библиотека',
        shortCode: 'ЦГБ',
        branchNum: 'ЦГБ',
        address: 'г. Владимир, Суздальский пр., д. 2',
        phone: '8(4922) 21-65-63, 21-66-80',
        vkLink: 'https://vk.com/vladcgb',
        screenName: 'vladcgb',
        rawId: -51714771,
        branch_url: 'https://biblioteka33.ru/?p=251',
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        sortOrder: 1
    },
    {
        canonicalName: 'Центральная детская библиотека',
        shortCode: 'ЦДБ',
        branchNum: 'ЦДБ',
        address: 'г. Владимир, ул. Большая Московская, д. 31',
        phone: '8(4922) 32-32-42, 32-47-73',
        vkLink: 'https://vk.com/cdbvladimir',
        screenName: 'cdbvladimir',
        rawId: -168804106,
        branch_url: 'https://biblioteka33.ru/?p=198',
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
        sortOrder: 2
    },
    {
        canonicalName: 'Библиотека — филиал №1',
        shortCode: 'Ф-1',
        branchNum: '1',
        address: 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
        phone: '8(4922) 33-86-23',
        vkLink: 'https://vk.com/club145883298',
        screenName: 'club145883298',
        rawId: -145883298,
        branch_url: 'https://biblioteka33.ru/?p=5612',
        gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
        sortOrder: 3
    },
    {
        canonicalName: 'Библиотека — филиал №2',
        shortCode: 'Ф-2',
        branchNum: '2',
        address: 'г. Владимир, пр. Ленина, д. 12',
        phone: '8(4922) 32-15-84, 32-15-85',
        vkLink: 'https://vk.com/biblfil2',
        screenName: 'biblfil2',
        rawId: -53422825,
        branch_url: 'https://biblioteka33.ru/?p=142',
        gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
        sortOrder: 4
    },
    {
        canonicalName: 'Библиотека — филиал №3',
        shortCode: 'Ф-3',
        branchNum: '3',
        address: 'г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4',
        phone: '8(4922) 26-18-74',
        vkLink: 'https://vk.com/public189953509',
        screenName: 'public189953509',
        rawId: -189953509,
        branch_url: 'https://biblioteka33.ru/?p=164',
        gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
        sortOrder: 5
    },
    {
        canonicalName: 'Библиотека — филиал №4',
        shortCode: 'Ф-4',
        branchNum: '4',
        address: 'г. Владимир, ул. Егорова, д. 10',
        phone: '8(4922) 21-96-11; 21-23-48',
        vkLink: 'https://vk.com/id474771380',
        screenName: 'id474771380',
        rawId: 474771380,
        branch_url: 'https://biblioteka33.ru/?p=168',
        gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
        sortOrder: 6
    },
    {
        canonicalName: 'Библиотека — филиал №5',
        shortCode: 'Ф-5',
        branchNum: '5',
        address: 'г. Владимир, ул. Верхняя Дуброва, д. 10',
        phone: '8(4922) 54-28-43',
        vkLink: 'https://vk.com/biblfil5',
        screenName: 'biblfil5',
        rawId: -145827789,
        branch_url: 'https://biblioteka33.ru/?p=172',
        gradient: 'linear-gradient(135deg, #a21caf 0%, #d946ef 100%)',
        sortOrder: 7
    },
    {
        canonicalName: 'Библиотека — филиал №6',
        shortCode: 'Ф-6',
        branchNum: '6',
        address: 'г. Владимир, мкр. Юрьевец, Институтский гор., д. 2',
        phone: '8(4922) 45-37-01',
        vkLink: 'https://vk.com/public197036990',
        screenName: 'public197036990',
        rawId: -197036990,
        branch_url: 'https://biblioteka33.ru/?p=178',
        gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
        sortOrder: 8
    },
    {
        canonicalName: 'Библиотека — филиал №7',
        shortCode: 'Ф-7',
        branchNum: '7',
        address: 'г. Владимир, ул. Мира, д. 55 (здание ДК Молодежи)',
        phone: '8(4922) 53-45-54',
        vkLink: 'https://vk.com/id428880688',
        screenName: 'id428880688',
        rawId: 428880688,
        branch_url: 'https://biblioteka33.ru/?p=183',
        gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
        sortOrder: 9
    },
    {
        canonicalName: 'Библиотека — филиал №8',
        shortCode: 'Ф-8',
        branchNum: '8',
        address: 'г. Владимир, ул. Сурикова, д. 26',
        phone: '8(4922) 54-65-11',
        vkLink: 'https://vk.com/filial8cgb',
        screenName: 'filial8cgb',
        rawId: -168966246,
        branch_url: 'https://biblioteka33.ru/?p=186',
        gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        sortOrder: 10
    },
    {
        canonicalName: 'Библиотека — филиал №9',
        shortCode: 'Ф-9',
        branchNum: '9',
        address: 'г. Владимир, ул. Юбилейная, д. 38',
        phone: '8(4922) 21-22-75',
        vkLink: 'https://vk.com/dobrolit',
        screenName: 'dobrolit',
        rawId: -184449519,
        branch_url: 'https://biblioteka33.ru/?p=189',
        gradient: 'linear-gradient(135deg, #4d7c0f 0%, #84cc16 100%)',
        sortOrder: 11
    },
    {
        canonicalName: 'Библиотека — филиал №10',
        shortCode: 'Ф-10',
        branchNum: '10',
        address: 'г. Владимир, ул. Диктора Левитана, 55',
        phone: '—',
        vkLink: '',
        screenName: '',
        branch_url: 'https://biblioteka33.ru/?p=195',
        gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
        sortOrder: 12
    },
    {
        canonicalName: 'Библиотека — филиал №11',
        shortCode: 'Ф-11',
        branchNum: '11',
        address: 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
        phone: '8(4922) 45-57-17',
        vkLink: 'https://vk.com/club193785811',
        screenName: 'club193785811',
        rawId: -193785811,
        branch_url: 'https://biblioteka33.ru/?p=30098',
        gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
        sortOrder: 13
    },
    {
        canonicalName: 'Библиотека — филиал №12',
        shortCode: 'Ф-12',
        branchNum: '12',
        address: 'г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16',
        phone: '8(4922) 26-43-81',
        vkLink: 'https://vk.com/public198438621',
        screenName: 'public198438621',
        rawId: -198438621,
        branch_url: 'https://biblioteka33.ru/?p=5805',
        gradient: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)',
        sortOrder: 14
    },
    {
        canonicalName: 'Библиотека — филиал №13',
        shortCode: 'Ф-13',
        branchNum: '13',
        address: 'г. Владимир, ул. Горького, д. 69',
        phone: '8(4922) 33-15-67',
        vkLink: 'https://vk.com/club170634092',
        screenName: 'club170634092',
        rawId: -170634092,
        branch_url: 'https://biblioteka33.ru/?p=192',
        gradient: 'linear-gradient(135deg, #3730a3 0%, #818cf8 100%)',
        sortOrder: 15
    },
    {
        canonicalName: 'Библиотека — филиал №14',
        shortCode: 'Ф-14',
        branchNum: '14',
        address: 'г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б»',
        phone: '8(4922) 45-74-69',
        vkLink: '',
        screenName: '',
        branch_url: 'https://biblioteka33.ru/?p=5784',
        gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
        sortOrder: 16
    },
    {
        canonicalName: 'Библиотека — филиал №15',
        shortCode: 'Ф-15',
        branchNum: '15',
        address: 'г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А',
        phone: '8(4922) 42-53-96',
        vkLink: 'https://vk.com/club197329237',
        screenName: 'club197329237',
        rawId: -197329237,
        branch_url: 'https://biblioteka33.ru/?p=5775',
        gradient: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
        sortOrder: 17
    },
    {
        canonicalName: 'Библиотека — филиал №16',
        shortCode: 'Ф-16',
        branchNum: '16',
        address: 'г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21',
        phone: '8(4922) 42-53-95',
        vkLink: 'https://vk.com/club158118947',
        screenName: 'club158118947',
        rawId: -158118947,
        branch_url: 'https://biblioteka33.ru/?p=5792',
        gradient: 'linear-gradient(135deg, #831843 0%, #f43f5e 100%)',
        sortOrder: 18
    }
];

export function findCanonicalBranch(target) {
    if (!target) return null;
    const link = (target.link || '').toLowerCase().replace(/\/+$/, '');
    const name = (target.name || '').toLowerCase();
    const url = (target.url || target.branch_url || '').toLowerCase().replace(/\/+$/, '');
    const screenName = (target.screen_name || target.screenName || '').toLowerCase();
    const id = target.id !== undefined && target.id !== null ? target.id : null;

    for (let b of CANONICAL_BRANCHES) {
        // Match by VK Link or ScreenName
        if (b.vkLink) {
            const bLink = b.vkLink.toLowerCase().replace(/\/+$/, '');
            if (link && (link === bLink || link.endsWith('/' + b.screenName.toLowerCase()))) {
                return b;
            }
        }
        if (screenName && b.screenName && screenName === b.screenName.toLowerCase()) {
            return b;
        }
        // Match by raw VK ID
        if (id !== null && b.rawId !== undefined && Math.abs(id) === Math.abs(b.rawId)) {
            return b;
        }
        // Match by official website branch URL
        if (url && b.branch_url && url === b.branch_url.toLowerCase().replace(/\/+$/, '')) {
            return b;
        }
        // Match by specific branch number or name with strict word boundary
        if (b.branchNum !== 'ЦГБ' && b.branchNum !== 'ЦДБ') {
            const num = b.branchNum;
            const numRegex = new RegExp(`(?:филиал\\s*№?\\s*|№\\s*)${num}(?!\\d)`, 'i');
            if (numRegex.test(name)) {
                return b;
            }
        } else if (b.branchNum === 'ЦГБ' && (name.includes('центральная городская') || name.includes('владцгб'))) {
            return b;
        } else if (b.branchNum === 'ЦДБ' && (name.includes('центральная детская') || name.includes('цдб'))) {
            return b;
        }
    }
    return null;
}

export function formatBranchBadge(branchNum) {
    if (!branchNum) return '';
    const s = String(branchNum).trim();
    if (s === 'ЦГБ' || s === 'ЦДБ') return s;
    if (/^Ф\s*[-–—]?\s*\d+$/i.test(s)) {
        const m = /\d+/.exec(s);
        return m ? `Ф-${m[0]}` : s;
    }
    if (/^\d+$/.test(s)) return `Ф-${s}`;
    return s;
}

export function enrichTargetWithCanonical(target) {
    if (!target) return target;
    const b = findCanonicalBranch(target);
    const isDeletedName = !target.name || target.name === 'DELETED' || target.name.trim() === '' || target.name === 'DELETED DELETED';
    if (b) {
        target.canonicalName = b.canonicalName;
        if (isDeletedName) {
            target.name = b.canonicalName;
        }
        target.shortCode = b.shortCode;
        target.branchNum = b.branchNum;
        target.address = b.address;
        target.phone = b.phone;
        target.gradient = b.gradient;
        target.sortOrder = b.sortOrder;
        if (!target.branch_url) target.branch_url = b.branch_url;
    } else {
        target.canonicalName = (!isDeletedName && target.name) ? target.name : 'Источник';
        if (isDeletedName) {
            target.name = 'Филиал библиотеки';
        }
        const letters = (target.name || 'ВК').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'ВК';
        target.shortCode = letters.slice(0, 3);
        target.branchNum = 'VK';
        target.address = '';
        target.gradient = 'linear-gradient(135deg, #334155 0%, #64748b 100%)';
        target.sortOrder = 999;
    }

    if (target.avatar && (
        target.avatar.includes('community_100.png') ||
        target.avatar.includes('camera_100.png') ||
        target.avatar.includes('deactivated_') ||
        target.avatar.includes('community_50.png') ||
        isDeletedName
    )) {
        target.avatar = '';
    }

    return target;
}

export function renderBranchAvatarHtml(targetInfo, size = 'md', extraClass = '', showBadge = true) {
    if (!targetInfo) return '';
    enrichTargetWithCanonical(targetInfo);
    
    const avatarUrl = targetInfo.avatar && targetInfo.avatar.trim() ? targetInfo.avatar.trim() : '';
    const isDeadAvatar = avatarUrl.includes('community_100.png') ||
        avatarUrl.includes('camera_100.png') ||
        avatarUrl.includes('deactivated_') ||
        avatarUrl.includes('community_50.png');
    const hasAvatar = avatarUrl.length > 0 && !isDeadAvatar && targetInfo.name !== 'DELETED';
    const shortCode = escapeHtml(targetInfo.shortCode || 'ВК');
    const branchBadge = formatBranchBadge(targetInfo.branchNum || targetInfo.shortCode || '');
    const gradient = targetInfo.gradient || 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
    const name = escapeHtml(targetInfo.canonicalName || targetInfo.name || '');

    let imgHtml = '';
    if (hasAvatar) {
        imgHtml = `<img class="avatar-img" src="${escapeHtml(avatarUrl)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">`;
    }

    const monogramDisplay = hasAvatar ? 'style="display:none; background:' + gradient + ';"' : 'style="display:flex; background:' + gradient + ';"';

    return `
        <div class="branch-avatar-wrap branch-avatar-${size} ${extraClass}" title="${name}">
            ${imgHtml}
            <div class="avatar-monogram" ${monogramDisplay}>
                <span class="monogram-text">${shortCode}</span>
                <span class="material-symbols-outlined monogram-icon">local_library</span>
            </div>
            ${showBadge && branchBadge ? `<span class="avatar-num-badge">${escapeHtml(branchBadge)}</span>` : ''}
        </div>
    `;
}

export function sortBranchesCanonically(branches) {
    return [...branches].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
}

