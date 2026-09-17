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
        district: 'Доброе (Фрунзенский район)',
        districtNote: 'Развилка Доброе, рядом с парком «Добросельский»',
        address: 'г. Владимир, Суздальский пр., д. 2',
        phone: '8(4922) 21-65-63, 21-66-80',
        vkLink: 'https://vk.com/vladcgb',
        screenName: 'vladcgb',
        rawId: -51714771,
        branch_url: 'https://biblioteka33.ru/?p=251',
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        avatar: 'https://sun1-17.userapi.com/s/v1/ig2/Wa7npoXWh4sKPc9yz-At5VUMbLVxUiaRN_LTBo9Q3Z3sxuDC-T6bV1dCX3nTR_YEH-BhUVjxhm3vfjQCcWV3iPbT.jpg?quality=95&crop=0,0,752,752&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720&ava=1&cs=100x100',
        canonicalMembers: 3863,
        sortOrder: 1
    },
    {
        canonicalName: 'Центральная детская библиотека',
        shortCode: 'ЦДБ',
        branchNum: 'ЦДБ',
        district: 'Исторический центр (Октябрьский район)',
        districtNote: 'Единственная библиотека муниципальной сети в историческом центре г. Владимира (Золотые ворота)',
        address: 'г. Владимир, ул. Большая Московская, д. 31',
        phone: '8(4922) 32-32-42, 32-47-73',
        vkLink: 'https://vk.com/cdbvladimir',
        screenName: 'cdbvladimir',
        rawId: -168804106,
        branch_url: 'https://biblioteka33.ru/?p=198',
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
        avatar: 'https://sun1-28.userapi.com/s/v1/ig1/Z2YCVelB8OSJAmOh5_i2X5q1jX1gl5sMK0Bph0mwFQajCKMxZ9C0e4fBcy5aND0IoZeXpART.jpg?quality=96&crop=309,222,1378,1378&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1080x1080,1280x1280&ava=1&cs=100x100',
        canonicalMembers: 3195,
        sortOrder: 2
    },
    {
        canonicalName: 'Библиотека — филиал №1',
        shortCode: 'Ф-1',
        branchNum: 'Ф-1',
        district: 'Черёмушки / ВлГУ (Ленинский район)',
        districtNote: 'Проспект Строителей, студенческий городок ВлГУ',
        address: 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
        phone: '8(4922) 33-86-23',
        vkLink: 'https://vk.com/club145883298',
        screenName: 'club145883298',
        rawId: -145883298,
        branch_url: 'https://biblioteka33.ru/?p=5612',
        gradient: 'linear-gradient(135deg, #9d174d 0%, #be185d 100%)',
        avatar: 'https://sun9-49.userapi.com/s/v1/ig1/2SLh-4qBdFu9wqyevWWWTmcZ0KgNyydnHuEzVR2vyp7VenpD9NZctfxdFJHV7ffoNiwqq3Up.jpg?quality=96&crop=45,32,362,362&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360&ava=1&cs=100x100',
        canonicalMembers: 183,
        sortOrder: 3
    },
    {
        canonicalName: 'Библиотека — филиал №2',
        shortCode: 'Ф-2',
        branchNum: 'Ф-2',
        district: 'Садовая площадь / «Заря» (Ленинский район)',
        districtNote: 'Проспект Ленина, кинотеатр «Буревестник» / «Заря»',
        address: 'г. Владимир, пр. Ленина, д. 12',
        phone: '8(4922) 32-15-84, 32-15-85',
        vkLink: 'https://vk.com/biblfil2',
        screenName: 'biblfil2',
        rawId: -53422825,
        branch_url: 'https://biblioteka33.ru/?p=142',
        gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
        avatar: 'https://sun1-85.userapi.com/s/v1/ig2/09QkbEQmoLwZryqU1oHjgVozuQNzjbuam8MCjqYPV2nfwupPSuDmpHE3L96S-23T4H92jMpMkcGmk7jh0gIlrbAg.jpg?quality=95&crop=332,172,614,614&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540&ava=1&cs=100x100',
        canonicalMembers: 1114,
        sortOrder: 4
    },
    {
        canonicalName: 'Библиотека — филиал №3',
        shortCode: 'Ф-3',
        branchNum: 'Ф-3',
        district: 'мкр. Юрьевец',
        districtNote: 'Юрьевец, Школьный проезд',
        address: 'г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4',
        phone: '8(4922) 26-18-74',
        vkLink: 'https://vk.com/public189953509',
        screenName: 'public189953509',
        rawId: -189953509,
        branch_url: 'https://biblioteka33.ru/?p=164',
        gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
        avatar: 'https://sun1-57.userapi.com/s/v1/ig1/FzjTmM-UtNq9HKmEmCWRZoVTq-wcdvRdZiyE_dHp3owc4ecmVF6ONkCP7Knfn18hyXKrpEfk.jpg?quality=96&crop=73,49,237,237&as=32x32,48x48,72x72,108x108,160x160&ava=1&cs=100x100',
        canonicalMembers: 243,
        sortOrder: 5
    },
    {
        canonicalName: 'Библиотека — филиал №4',
        shortCode: 'Ф-4',
        branchNum: 'Ф-4',
        district: 'Доброе (Фрунзенский район)',
        districtNote: 'Жилой массив Доброе (перекрёсток ул. Егорова и ул. Комиссарова, рядом с парком «Добросельский»). ВНИМАНИЕ: находится строго в Добром, а НЕ в центре!',
        address: 'г. Владимир, ул. Егорова, д. 10',
        phone: '8(4922) 21-96-11, 21-23-48',
        vkLink: 'https://vk.com/id474771380',
        screenName: 'id474771380',
        rawId: 474771380,
        branch_url: 'https://biblioteka33.ru/?p=168',
        gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
        avatar: 'https://sun1-18.userapi.com/s/v1/ig2/ZW-Yue-0_sbeplkP2bPPgk-ZPx9IHmygMogfkvqtWcjKJL2CFkw76neI3k0jFZzSKn3UY_xz5l2yyfKVy8tNIimV.jpg?quality=95&crop=330,113,491,491&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480&ava=1&cs=100x100',
        canonicalMembers: 8038,
        sortOrder: 6
    },
    {
        canonicalName: 'Библиотека — филиал №5',
        shortCode: 'Ф-5',
        branchNum: 'Ф-5',
        district: 'ЮЗР / Верхняя Дуброва (Ленинский район)',
        districtNote: 'Юго-Западный район, Верхняя Дуброва, рынок «Слобода»',
        address: 'г. Владимир, ул. Верхняя Дуброва, д. 10',
        phone: '8(4922) 54-28-43',
        vkLink: 'https://vk.com/biblfil5',
        screenName: 'biblfil5',
        rawId: -145827789,
        branch_url: 'https://biblioteka33.ru/?p=172',
        gradient: 'linear-gradient(135deg, #a21caf 0%, #d946ef 100%)',
        avatar: 'https://sun1-30.userapi.com/s/v1/ig1/qnBwZlrVt0qqLAnssY3MhoovPQAHSxjzz7uhIMwbAxgq-WVpI8fIHNWpJ4onbk93BOHVFc6v.jpg?quality=96&crop=419,33,704,704&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&ava=1&cs=100x100',
        canonicalMembers: 795,
        sortOrder: 7
    },
    {
        canonicalName: 'Библиотека — филиал №6',
        shortCode: 'Ф-6',
        branchNum: 'Ф-6',
        district: 'мкр. Юрьевец',
        districtNote: 'Юрьевец, Институтский городок',
        address: 'г. Владимир, мкр. Юрьевец, Институтский гор., д. 2',
        phone: '8(4922) 45-37-01',
        vkLink: 'https://vk.com/public197036990',
        screenName: 'public197036990',
        rawId: -197036990,
        branch_url: 'https://biblioteka33.ru/?p=178',
        gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
        avatar: 'https://sun1-25.userapi.com/s/v1/ig1/sDKCgX8roucUi7oFhkIey9SKMDMHfvF46FXqlSBeNsjgXzDvYQ3Ka6B3dzdXZXWnaoBSrZ9W.jpg?quality=96&crop=312,178,1020,1020&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720&ava=1&cs=100x100',
        canonicalMembers: 192,
        sortOrder: 8
    },
    {
        canonicalName: 'Библиотека — филиал №7',
        shortCode: 'Ф-7',
        branchNum: 'Ф-7',
        district: 'ДК Молодёжи / Северная (Октябрьский район)',
        districtNote: 'Улица Мира, здание ДК Молодёжи, бассейн',
        address: 'г. Владимир, ул. Мира, д. 55 (здание ДК Молодежи)',
        phone: '8(4922) 53-45-54',
        vkLink: 'https://vk.com/id428880688',
        screenName: 'id428880688',
        rawId: 428880688,
        branch_url: 'https://biblioteka33.ru/?p=183',
        gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
        avatar: 'https://sun1-85.userapi.com/s/v1/ig2/QlQLMb0V47zeL_ATICZchiehvVol4LWq6CtioOfPNwCqHtuHrwpoEuRQ7eDoP8-5VDBMf7ONG_JsXmrsaxcqct10.jpg?quality=96&crop=202,0,675,675&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&ava=1&cs=100x100',
        canonicalMembers: 3321,
        sortOrder: 9
    },
    {
        canonicalName: 'Библиотека — филиал №8',
        shortCode: 'Ф-8',
        branchNum: 'Ф-8',
        district: 'ул. Сурикова / Чайковского (Ленинский район)',
        districtNote: 'Улица Сурикова, район ул. Чайковского',
        address: 'г. Владимир, ул. Сурикова, д. 26',
        phone: '8(4922) 54-65-11',
        vkLink: 'https://vk.com/filial8cgb',
        screenName: 'filial8cgb',
        rawId: -168966246,
        branch_url: 'https://biblioteka33.ru/?p=186',
        gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        avatar: 'https://sun1-29.userapi.com/s/v1/ig2/-FYkh88EAnbqHfEzXSb_TBVLTq1vSNUEkkeguRL5fFToyEmYIlpQJ9DFgmOanXLcMSRgy87c3beiFbW1CehYkESf.jpg?quality=95&crop=140,2,431,431&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360&ava=1&cs=100x100',
        canonicalMembers: 755,
        sortOrder: 10
    },
    {
        canonicalName: 'Библиотека — филиал №9',
        shortCode: 'Ф-9',
        branchNum: 'Ф-9',
        district: 'Доброе (Фрунзенский район)',
        districtNote: 'Улица Юбилейная, проект «Добролит»',
        address: 'г. Владимир, ул. Юбилейная, д. 38',
        phone: '8(4922) 21-22-75',
        vkLink: 'https://vk.com/dobrolit',
        screenName: 'dobrolit',
        rawId: -184449519,
        branch_url: 'https://biblioteka33.ru/?p=189',
        gradient: 'linear-gradient(135deg, #9d174d 0%, #ec4899 100%)',
        avatar: 'https://sun1-28.userapi.com/s/v1/ig1/aWqSGyJ1JMV9pp2ax3rz9Ix3hwa7HuZR5b1D6kPsT4z78gE7RTTKDttmLTn4hJ1_dBGRt9sZ.jpg?quality=96&crop=0,0,200,200&as=32x32,48x48,72x72,108x108,160x160&ava=1&cs=100x100',
        canonicalMembers: 596,
        sortOrder: 11
    },
    {
        canonicalName: 'Библиотека-филиал 10 - временно не работает!',
        shortCode: 'Ф-10',
        branchNum: 'Ф-10',
        district: 'Диктора Левитана (Ленинский район)',
        districtNote: 'Улица Диктора Левитана (временно не работает)',
        address: 'г. Владимир, ул. Диктора Левитана, 55',
        phone: 'нет телефона',
        note: 'Библиотека-филиал 10 - временно не работает!',
        vkLink: '',
        screenName: '',
        branch_url: 'https://biblioteka33.ru/?p=195',
        gradient: 'linear-gradient(135deg, #9d174d 0%, #ec4899 100%)',
        avatar: '',
        canonicalMembers: 0,
        sortOrder: 12
    },
    {
        canonicalName: 'Библиотека — филиал №11',
        shortCode: 'Ф-11',
        branchNum: 'Ф-11',
        district: 'мкр. Лесной',
        districtNote: 'Микрорайон Лесной',
        address: 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
        phone: '8(4922) 45-57-17',
        vkLink: 'https://vk.com/club193785811',
        screenName: 'club193785811',
        rawId: -193785811,
        branch_url: 'https://biblioteka33.ru/?p=30098',
        gradient: 'linear-gradient(135deg, #0f766e 0%, #db2777 100%)',
        avatar: 'https://sun9-80.userapi.com/s/v1/ig1/4Yv2AqGkBFWrd63ydM1oRsR3q-58Iux_y5N1EZO8W-URk8UYh19Y6fTF8UAbKmA8W2OpLEn2.jpg?quality=96&crop=55,29,674,674&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&ava=1&cs=100x100',
        canonicalMembers: 3068,
        sortOrder: 13
    },
    {
        canonicalName: 'Библиотека — филиал №12',
        shortCode: 'Ф-12',
        branchNum: 'Ф-12',
        district: 'мкр. Энергетик',
        districtNote: 'Микрорайон Энергетик',
        address: 'г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16',
        phone: '8(4922) 26-43-81',
        vkLink: 'https://vk.com/public198438621',
        screenName: 'public198438621',
        rawId: -198438621,
        branch_url: 'https://biblioteka33.ru/?p=5805',
        gradient: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)',
        avatar: 'https://sun9-73.userapi.com/s/v1/ig2/b820F6JcyCzhch4kHrR7ORS2hrN60-Oyb4GhUGgCyBYYCTk6RensFnL6KiwkdvA_kPevxyywhlE0cT0tPXDOFZdp.jpg?quality=96&crop=35,0,679,679&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&ava=1&cs=100x100',
        canonicalMembers: 148,
        sortOrder: 14
    },
    {
        canonicalName: 'Библиотека — филиал №13',
        shortCode: 'Ф-13',
        branchNum: 'Ф-13',
        district: 'ВлГУ / пл. Ленина (Октябрьский район)',
        districtNote: 'Улица Горького, проект «Книголенд»',
        address: 'г. Владимир, ул. Горького, д. 69',
        phone: '8(4922) 33-15-67',
        vkLink: 'https://vk.com/club170634092',
        screenName: 'knigoland33',
        rawId: -170634092,
        branch_url: 'https://biblioteka33.ru/?p=192',
        gradient: 'linear-gradient(135deg, #3730a3 0%, #818cf8 100%)',
        avatar: 'https://sun1-28.userapi.com/s/v1/ig2/yj2F4WEXl5wb7wnxFcWhHa3TLmRxOkOWPOSzFCoSXNoCAeyB9tooIdbWiqSZ_6WWuCyXkgQEVhJFE88LSNkRmqvC.jpg?quality=95&crop=181,150,769,769&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720&ava=1&cs=100x100',
        canonicalMembers: 948,
        sortOrder: 15
    },
    {
        canonicalName: 'Библиотека — филиал №14',
        shortCode: 'Ф-14',
        branchNum: 'Ф-14',
        district: 'мкр. Оргтруд',
        districtNote: 'Микрорайон Оргтруд',
        address: 'г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б»',
        phone: '8(4922) 45-74-69',
        vkLink: '',
        screenName: '',
        branch_url: 'https://biblioteka33.ru/?p=5784',
        gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
        avatar: '',
        canonicalMembers: 0,
        sortOrder: 16
    },
    {
        canonicalName: 'Библиотека — филиал №15',
        shortCode: 'Ф-15',
        branchNum: 'Ф-15',
        district: 'пос. Заклязьменский',
        districtNote: 'Посёлок Заклязьменский',
        address: 'г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А',
        phone: '8(4922) 42-53-96',
        vkLink: 'https://vk.com/club197329237',
        screenName: 'filial15cgb',
        rawId: -197329237,
        branch_url: 'https://biblioteka33.ru/?p=5775',
        gradient: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
        avatar: 'https://sun1-89.userapi.com/s/v1/ig2/WWKH8MdxPWN_uJqdiMlkhGW150n-_g0F6wvhVOnRS3GpF_tHtijyKlgK3ec_wIPd07ANoJxiAgCfbXESM-lF79M-.jpg?quality=96&crop=0,0,229,229&as=32x32,48x48,72x72,108x108,160x160&ava=1&cs=100x100',
        canonicalMembers: 175,
        sortOrder: 17
    },
    {
        canonicalName: 'Библиотека — филиал №16',
        shortCode: 'Ф-16',
        branchNum: 'Ф-16',
        district: 'мкр. Коммунар',
        districtNote: 'Микрорайон Коммунар',
        address: 'г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21',
        phone: '8(4922) 42-53-95',
        vkLink: 'https://vk.com/club158118947',
        screenName: 'club158118947',
        rawId: -158118947,
        branch_url: 'https://biblioteka33.ru/?p=5792',
        gradient: 'linear-gradient(135deg, #831843 0%, #f43f5e 100%)',
        avatar: 'https://sun1-27.userapi.com/s/v1/ig2/lSu3AeVgyRn9nSEdg_oAtZudezaCi638pYNwxcLnqyyocDAWMcK93t9MEXQrnevenuHoM1cINxttmY2zX42IyBva.jpg?quality=96&crop=101,105,1599,1599&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1080x1080,1280x1280,1440x1440&ava=1&cs=100x100',
        canonicalMembers: 1927,
        sortOrder: 18
    }
];

export function isDogAvatarUrl(url) {
    if (!url || typeof url !== 'string') return true;
    const u = url.trim().toLowerCase();
    if (!u) return true;
    if (u.includes('vk.com/images/')) return true;
    return u.includes('camera_') || u.includes('camera.') || u.includes('community_') ||
           u.includes('community.') || u.includes('deactivated') || u.includes('placeholder') ||
           u.includes('no_photo') || u.includes('question_');
}

export function findCanonicalBranch(target) {
    if (!target) return null;
    const link = (target.link || target.vk_links || '').toString().toLowerCase().replace(/\/+$/, '');
    const name = (target.name || target.canonicalName || '').toLowerCase();
    const url = (target.url || target.branch_url || '').toLowerCase().replace(/\/+$/, '');
    const screenName = (target.screen_name || target.screenName || '').toLowerCase();
    const id = target.id !== undefined && target.id !== null ? target.id : (target.rawId !== undefined ? target.rawId : null);

    for (let b of CANONICAL_BRANCHES) {
        // Match by raw VK ID
        if (id !== null && b.rawId !== undefined && Math.abs(id) === Math.abs(b.rawId)) {
            return b;
        }
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
        // Match by official website branch URL
        if (url && b.branch_url && url === b.branch_url.toLowerCase().replace(/\/+$/, '')) {
            return b;
        }
        // Match by specific branch number or name with strict word boundary
        if (b.branchNum !== 'ЦГБ' && b.branchNum !== 'ЦДБ') {
            const num = String(b.branchNum).replace(/\D+/g, '');
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
        if (b.rawId) {
            target.rawId = b.rawId;
            if (target.id === undefined || target.id === null) {
                target.id = b.rawId;
            }
        }

        // Fallback to authentic canonical avatar if missing or dog placeholder
        if (!target.avatar || isDogAvatarUrl(target.avatar)) {
            target.avatar = b.avatar || '';
        }
        // Fallback to authentic canonical subscriber count if missing
        if ((target.members_count === undefined || target.members_count === null) && typeof b.canonicalMembers === 'number') {
            target.members_count = b.canonicalMembers;
        }
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
        if (target.avatar && isDogAvatarUrl(target.avatar)) {
            target.avatar = '';
        }
    }

    return target;
}

export function renderBranchAvatarHtml(targetInfo, size = 'md', extraClass = '', showBadge = true) {
    if (!targetInfo) return '';
    enrichTargetWithCanonical(targetInfo);
    
    let avatarUrl = targetInfo.avatar && typeof targetInfo.avatar === 'string' ? targetInfo.avatar.trim() : '';
    const isDead = isDogAvatarUrl(avatarUrl);
    if (isDead) {
        const canon = findCanonicalBranch(targetInfo);
        if (canon && canon.avatar && !isDogAvatarUrl(canon.avatar)) {
            avatarUrl = canon.avatar;
        } else {
            avatarUrl = '';
        }
    }

    const hasAvatar = avatarUrl.length > 0 && targetInfo.name !== 'DELETED';
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

/**
 * Реестр библиотечных сигл OPAC-Global (БД 62 ЦГБ г. Владимира)
 * Полный маппинг сигл к каноническим филиалам с адресами, районами и телефонами
 * Источник: docs/opac_spec.json
 */
export const OPAC_BRANCH_SIGLAS = {
    'аб': {
        code: 'аб',
        canonical_id: 'cgb_ab',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Абонемент',
        branch_name: 'Центральная городская библиотека, Абонемент',
        branchName: 'Центральная городская библиотека, Абонемент',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63, 21-66-80',
        permanent_location_pattern: '^ЦГБ-АБ'
    },
    'чз': {
        code: 'чз',
        canonical_id: 'cgb_chz',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Читальный зал',
        branch_name: 'Центральная городская библиотека, Читальный зал',
        branchName: 'Центральная городская библиотека, Читальный зал',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63, 21-66-80',
        permanent_location_pattern: '^ЦГБ-ЧЗ'
    },
    'до': {
        code: 'до',
        canonical_id: 'cdb',
        branch_number: 'ЦДБ',
        branchNum: 'ЦДБ',
        department: 'Центральная детская библиотека',
        branch_name: 'Центральная детская библиотека',
        branchName: 'Центральная детская библиотека',
        address: 'г. Владимир, ул. Большая Московская, д. 31',
        district: 'Исторический центр',
        is_dobroye: false,
        isDobroye: false,
        is_center: true,
        isCenter: true,
        phone: '8(4922) 32-32-42, 32-47-73',
        permanent_location_pattern: '^ЦГБ-ДО'
    },
    'кх': {
        code: 'кх',
        canonical_id: 'cgb_kh',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Книгохранилище',
        branch_name: 'Центральная городская библиотека, Книгохранилище',
        branchName: 'Центральная городская библиотека, Книгохранилище',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63',
        permanent_location_pattern: '^ЦГБ-КХ'
    },
    'ибо': {
        code: 'ибо',
        canonical_id: 'cgb_ibo',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Информационно-библиографический отдел',
        branch_name: 'Центральная городская библиотека, ИБО',
        branchName: 'Центральная городская библиотека, ИБО',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63',
        permanent_location_pattern: '^ЦГБ-ИБО'
    },
    'ооо': {
        code: 'ооо',
        canonical_id: 'cgb_ooo',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Отдел обслуживания',
        branch_name: 'Центральная городская библиотека, Отдел обслуживания',
        branchName: 'Центральная городская библиотека, Отдел обслуживания',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63',
        permanent_location_pattern: '^ЦГБ-ООО'
    },
    'цдб': {
        code: 'цдб',
        aliases: ['до', 'цди', 'цки'],
        canonical_id: 'cdb',
        branch_number: 'ЦДБ',
        branchNum: 'ЦДБ',
        department: 'Центральная детская библиотека',
        branch_name: 'Центральная детская библиотека',
        branchName: 'Центральная детская библиотека',
        address: 'г. Владимир, ул. Большая Московская, д. 31',
        district: 'Исторический центр',
        is_dobroye: false,
        isDobroye: false,
        is_center: true,
        isCenter: true,
        phone: '8(4922) 32-32-42, 32-47-73',
        permanent_location_pattern: '^ЦГБ-ЦД[БИ]'
    },
    'цдч': {
        code: 'цдч',
        aliases: [],
        canonical_id: 'cgb_cdch',
        branch_number: 'ЦГБ',
        branchNum: 'ЦГБ',
        department: 'Отдел детского чтения',
        branch_name: 'Центральная городская библиотека, Отдел детского чтения',
        branchName: 'Центральная городская библиотека, Отдел детского чтения',
        address: 'г. Владимир, Суздальский пр., д. 2',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-65-63, 21-66-80',
        permanent_location_pattern: '^ЦГБ-ЦДЧ'
    },
    'ф1': {
        code: 'ф1',
        aliases: ['ф1д'],
        canonical_id: 'f1',
        branch_number: 'Филиал №1',
        branchNum: 'Филиал №1',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №1',
        branchName: 'Библиотека — филиал №1',
        address: 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
        district: 'Черёмушки / ВлГУ',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 33-86-23',
        permanent_location_pattern: '^ЦГБ-Ф1[Д]?'
    },
    'ф2': {
        code: 'ф2',
        aliases: ['ф2д'],
        canonical_id: 'f2',
        branch_number: 'Филиал №2',
        branchNum: 'Филиал №2',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №2',
        branchName: 'Библиотека — филиал №2',
        address: 'г. Владимир, пр. Ленина, д. 12',
        district: 'Садовая площадь / «Заря»',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 32-15-84, 32-15-85',
        permanent_location_pattern: '^ЦГБ-Ф2[Д]?'
    },
    'ф3': {
        code: 'ф3',
        aliases: ['ф3сд'],
        canonical_id: 'f3',
        branch_number: 'Филиал №3',
        branchNum: 'Филиал №3',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №3',
        branchName: 'Библиотека — филиал №3',
        address: 'г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4',
        district: 'мкр. Юрьевец',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 26-18-74',
        permanent_location_pattern: '^ЦГБ-Ф3'
    },
    'ф4': {
        code: 'ф4',
        aliases: ['ф4д'],
        canonical_id: 'f4',
        branch_number: 'Филиал №4',
        branchNum: 'Филиал №4',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №4',
        branchName: 'Библиотека — филиал №4',
        address: 'г. Владимир, ул. Егорова, д. 10',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-96-11; 21-23-48',
        permanent_location_pattern: '^ЦГБ-Ф4[Д]?',
        note: 'КРИТИЧЕСКИ ВАЖНО: филиал №4 расположен именно в жилом районе «Доброе»!'
    },
    'ф5': {
        code: 'ф5',
        aliases: ['ф5д'],
        canonical_id: 'f5',
        branch_number: 'Филиал №5',
        branchNum: 'Филиал №5',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №5',
        branchName: 'Библиотека — филиал №5',
        address: 'г. Владимир, ул. Верхняя Дуброва, д. 10',
        district: 'ЮЗР / Верхняя Дуброва',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 54-28-43',
        permanent_location_pattern: '^ЦГБ-Ф5[Д]?'
    },
    'ф6': {
        code: 'ф6',
        canonical_id: 'f6',
        branch_number: 'Филиал №6',
        branchNum: 'Филиал №6',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №6',
        branchName: 'Библиотека — филиал №6',
        address: 'г. Владимир, мкр. Юрьевец, Институтский гор., д. 2',
        district: 'мкр. Юрьевец',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 45-37-01',
        permanent_location_pattern: '^ЦГБ-Ф6$'
    },
    'ф7': {
        code: 'ф7',
        aliases: ['ф7н', 'ф7нд'],
        canonical_id: 'f7',
        branch_number: 'Филиал №7',
        branchNum: 'Филиал №7',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №7',
        branchName: 'Библиотека — филиал №7',
        address: 'г. Владимир, ул. Мира, д. 55 (здание ДК Молодежи)',
        district: 'ДК Молодёжи / Северная',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 53-45-54',
        permanent_location_pattern: '^ЦГБ-Ф7[НД]?'
    },
    'ф8': {
        code: 'ф8',
        aliases: ['ф8д'],
        canonical_id: 'f8',
        branch_number: 'Филиал №8',
        branchNum: 'Филиал №8',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №8',
        branchName: 'Библиотека — филиал №8',
        address: 'г. Владимир, ул. Сурикова, д. 26',
        district: 'ул. Сурикова / Чайковского',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 54-65-11',
        permanent_location_pattern: '^ЦГБ-Ф8[Д]?'
    },
    'ф9': {
        code: 'ф9',
        aliases: ['добролит'],
        canonical_id: 'f9',
        branch_number: 'Филиал №9',
        branchNum: 'Филиал №9',
        department: 'Литературно-краеведческий проект «Добролит»',
        branch_name: 'Библиотека — филиал №9',
        branchName: 'Библиотека — филиал №9',
        address: 'г. Владимир, ул. Юбилейная, д. 38',
        district: 'Доброе',
        is_dobroye: true,
        isDobroye: true,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 21-22-75',
        permanent_location_pattern: '^ЦГБ-Ф9$'
    },
    'ф10': {
        code: 'ф10',
        aliases: ['ф10д'],
        canonical_id: 'f10',
        branch_number: 'Филиал №10',
        branchNum: 'Филиал №10',
        department: 'Основной абонемент',
        branch_name: 'Библиотека-филиал 10 - временно не работает!',
        branchName: 'Библиотека-филиал 10 - временно не работает!',
        address: 'г. Владимир, ул. Диктора Левитана, 55',
        district: 'Диктора Левитана',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: 'нет телефона',
        permanent_location_pattern: '^ЦГБ-Ф10[Д]?'
    },
    'ф11': {
        code: 'ф11',
        aliases: ['ф11д'],
        canonical_id: 'f11',
        branch_number: 'Филиал №11',
        branchNum: 'Филиал №11',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №11',
        branchName: 'Библиотека — филиал №11',
        address: 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
        district: 'мкр. Лесной',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 45-57-17',
        permanent_location_pattern: '^ЦГБ-Ф11[Д]?'
    },
    'ф12': {
        code: 'ф12',
        aliases: ['ф12д'],
        canonical_id: 'f12',
        branch_number: 'Филиал №12',
        branchNum: 'Филиал №12',
        department: 'Взрослый и детский абонементы',
        branch_name: 'Библиотека — филиал №12',
        branchName: 'Библиотека — филиал №12',
        address: 'г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16',
        district: 'мкр. Энергетик',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 26-43-81',
        permanent_location_pattern: '^ЦГБ-Ф12[Д]?'
    },
    'ф13': {
        code: 'ф13',
        aliases: ['ф13н', 'ф13нд', 'книголенд'],
        canonical_id: 'f13',
        branch_number: 'Филиал №13',
        branchNum: 'Филиал №13',
        department: 'Библиотечный проект «Книголенд»',
        branch_name: 'Библиотека — филиал №13',
        branchName: 'Библиотека — филиал №13',
        address: 'г. Владимир, ул. Горького, д. 69',
        district: 'ВлГУ / пл. Ленина',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 33-15-67',
        permanent_location_pattern: '^ЦГБ-Ф13[НД]?'
    },
    'ф14': {
        code: 'ф14',
        aliases: ['ф14н', 'ф14нд'],
        canonical_id: 'f14',
        branch_number: 'Филиал №14',
        branchNum: 'Филиал №14',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №14',
        branchName: 'Библиотека — филиал №14',
        address: 'г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б»',
        district: 'мкр. Оргтруд',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 45-74-69',
        permanent_location_pattern: '^ЦГБ-Ф14[НД]?'
    },
    'ф15': {
        code: 'ф15',
        aliases: ['ф15н', 'ф15нд'],
        canonical_id: 'f15',
        branch_number: 'Филиал №15',
        branchNum: 'Филиал №15',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №15',
        branchName: 'Библиотека — филиал №15',
        address: 'г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А',
        district: 'пос. Заклязьменский',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 42-53-96',
        permanent_location_pattern: '^ЦГБ-Ф15[НД]?'
    },
    'ф16': {
        code: 'ф16',
        aliases: ['ф16н', 'ф16нд'],
        canonical_id: 'f16',
        branch_number: 'Филиал №16',
        branchNum: 'Филиал №16',
        department: 'Основной абонемент',
        branch_name: 'Библиотека — филиал №16',
        branchName: 'Библиотека — филиал №16',
        address: 'г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21',
        district: 'мкр. Коммунар',
        is_dobroye: false,
        isDobroye: false,
        is_center: false,
        isCenter: false,
        phone: '8(4922) 42-53-95',
        permanent_location_pattern: '^ЦГБ-Ф16[НД]?'
    }
};

export const OPAC_BRANCH_REGISTRY = OPAC_BRANCH_SIGLAS;

/**
 * Нормализация и сопоставление сигла OPAC к филиалу ЦГБ Владимира
 * @param {string} rawSigla
 * @returns {object|null}
 */
export function resolveBranchBySigla(rawSigla) {
    if (!rawSigla || typeof rawSigla !== 'string') return null;
    let code = rawSigla.trim().toLowerCase();
    code = code.replace(/^(цгб[-_\s]+|мбук[-_\s]+)/gi, '');

    // 1. Прямой поиск по коду
    if (OPAC_BRANCH_SIGLAS[code]) {
        return OPAC_BRANCH_SIGLAS[code];
    }

    // 2. Поиск по алиасам (например, цдч, ф4д, ф7н)
    for (const info of Object.values(OPAC_BRANCH_SIGLAS)) {
        if (info.aliases && info.aliases.includes(code)) {
            return info;
        }
    }

    // 3. Регулярное выражение филиалов: ф4, ф-4, филиал 4
    const numMatch = code.match(/^(?:ф[\s-]*|филиал\s*№?\s*)(\d+)/i);
    if (numMatch) {
        const key = 'ф' + numMatch[1];
        if (OPAC_BRANCH_SIGLAS[key]) {
            return OPAC_BRANCH_SIGLAS[key];
        }
    }

    // 4. Проверка паттернов постоянного хранения (ЦГБ-АБ, ЦГБ-Ф4 и т.д.)
    for (const info of Object.values(OPAC_BRANCH_SIGLAS)) {
        if (info.permanent_location_pattern) {
            try {
                const re = new RegExp(info.permanent_location_pattern, 'i');
                if (re.test(rawSigla)) {
                    return info;
                }
            } catch (e) {}
        }
    }

    return null;
}


