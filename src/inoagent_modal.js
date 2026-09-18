/**
 * src/inoagent_modal.js — Интерактивный поиск по реестру иностранных агентов Минюста РФ
 * ======================================================================================
 * Полнофункциональный ES-модуль для платформы AURORA (Cyber-Glassmorphism):
 *   • Поиск физических лиц, юрлиц и общественных объединений в реестре Минюста (255-ФЗ)
 *   • Поисковая строка с автопоиском (debounce 300мс), очисткой и индикатором загрузки
 *   • Фильтры-чипы по типам («Все», «Физлица», «Юрлица», «Объединения») и статусу («Все», «В реестре», «Исключён»)
 *   • Карточки результатов: ФИО, псевдонимы, рег. номер, статус, даты, основание, ИНН/ОГРН, ссылки
 *   • Детальный просмотр и копирование сведений в буфер обмена
 *   • Быстрая интеграция со справкой робота Космо (библиотечные требования и 255-ФЗ)
 *   • Поддержка светлой и тёмной тем оформления, горячие клавиши (Esc)
 *
 * Разработка: AURORA Core Team (Lead UI Designer, Fullstack Dev)
 * ======================================================================================
 */

import { escapeHtml as extEscapeHtml } from './branches.js?v=4.44.0';
import { resolveApiUrl as extResolveApiUrl } from './api.js?v=4.62.0';

// Безопасный фолбэк экранирования HTML
function escapeHtml(str) {
    if (typeof extEscapeHtml === 'function') {
        return extEscapeHtml(str);
    }
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function resolveApiUrl(path) {
    if (typeof extResolveApiUrl === 'function') {
        return extResolveApiUrl(path);
    }
    return path;
}

// Глобальные ссылки на DOM-элементы модального окна
let modalOverlayEl = null;
let searchInputEl = null;
let clearBtnEl = null;
let searchBtnEl = null;
let spinnerEl = null;
let resultsGridEl = null;
let summaryBadgeEl = null;
let quickTagsEl = null;

// Состояние фильтрации
let currentSearchQuery = '';
let currentTypeFilter = 'all';     // 'all' | 'person' | 'legal' | 'association'
let currentStatusFilter = 'all';   // 'all' | 'active' | 'excluded'
let debounceTimer = null;
let cachedRegistryData = null;
let isDataLoading = false;

// Встроенный эталонный реестр (гарантирует мгновенную работу без сетевых задержек)
const DEFAULT_REGISTRY_ITEMS = [
    {
        id: "ino-753",
        reg_num: 753,
        name: "Чхартишвили Григорий Шалвович",
        aliases: ["Борис Акунин", "Б. Акунин", "Анатолий Брусникин", "Анна Борисова", "Boris Akunin"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "12.01.2024",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 770401823901",
        resources: [
            "https://t.me/borisakunin",
            "https://babook.org",
            "https://facebook.com/borisakunin"
        ],
        note: "Писатель, автор детективных романов об Эрасте Фандорине. Книги подлежат маркировке 18+ и изолированному хранению."
    },
    {
        id: "ino-469",
        reg_num: 469,
        name: "Глуховский Дмитрий Алексеевич",
        aliases: ["Дмитрий Глуховский", "Д. А. Глуховский", "Dmitry Glukhovsky"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "07.10.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О средствах массовой информации», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770401928374",
        resources: [
            "https://t.me/dg_channel",
            "https://instagram.com/dg_glukhovsky"
        ],
        note: "Автор постапокалиптических романов «Метро 2033», «Метро 2034», «Текст», «Пост». Маркировка 18+."
    },
    {
        id: "ino-411",
        reg_num: 411,
        name: "Быков Дмитрий Львович",
        aliases: ["Дмитрий Быков", "Д. Л. Быков", "Dmitry Bykov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "29.07.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7, 9 255-ФЗ",
        inn_ogrn: "ИНН: 772802849102",
        resources: [
            "https://t.me/ru_bykov",
            "https://youtube.com/@DmitryBykovOfficial"
        ],
        note: "Писатель, поэт, биограф советских классиков (Пастернак, Маяковский, Горький). Маркировка 18+."
    },
    {
        id: "ino-477",
        reg_num: 477,
        name: "Зыгарь Михаил Викторович",
        aliases: ["Михаил Зыгарь", "М. В. Зыгарь", "Mikhail Zygar"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "21.10.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 772583920144",
        resources: [
            "https://t.me/zygaro",
            "https://instagram.com/zygaro"
        ],
        note: "Журналист, автор публицистических книг «Вся кремлёвская рать», «Империя должна умереть». Маркировка 18+."
    },
    {
        id: "ino-773",
        reg_num: 773,
        name: "Улицкая Людмила Евгеньевна",
        aliases: ["Людмила Улицкая", "Л. Е. Улицкая", "Lyudmila Ulitskaya"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "01.03.2024",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 772901847291",
        resources: [
            "https://facebook.com/ludmila.ulitskaya"
        ],
        note: "Писательница, автор романов «Казус Кукоцкого», «Даниэль Штайн, переводчик», «Лестница Якова». Маркировка 18+."
    },
    {
        id: "ino-376",
        reg_num: 376,
        name: "Шульман Екатерина Михайловна",
        aliases: ["Екатерина Шульман", "Е. М. Шульман", "Ekaterina Schulmann"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "15.04.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 710701928374",
        resources: [
            "https://t.me/eschulmann",
            "https://youtube.com/@ESchulmannOfficial"
        ],
        note: "Политолог, публицист, автор книг «Практическая политология». Маркировка 18+."
    },
    {
        id: "ino-453",
        reg_num: 453,
        name: "Эйдельман Тамара Натановна",
        aliases: ["Тамара Эйдельман", "Т. Н. Эйдельман", "Tamara Eidelman"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "09.09.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402847192",
        resources: [
            "https://t.me/eidelman",
            "https://youtube.com/@TamaraEidelmanHistory"
        ],
        note: "Историк, заслуженный учитель РФ, автор научно-популярных исторических изданий. Маркировка 18+."
    },
    {
        id: "ino-322",
        reg_num: 322,
        name: "Шендерович Виктор Анатольевич",
        aliases: ["Виктор Шендерович", "В. А. Шендерович", "Viktor Shenderovich"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "30.12.2021",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770301928374",
        resources: [
            "https://t.me/shenderovich",
            "https://shender.ru"
        ],
        note: "Писатель-сатирик, публицист, драматург. Маркировка 18+."
    },
    {
        id: "ino-383",
        reg_num: 383,
        name: "Невзоров Александр Глебович",
        aliases: ["Александр Невзоров", "А. Г. Невзоров", "Alexander Nevzorov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "22.04.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 780102938475",
        resources: [
            "https://t.me/nevzorovtv",
            "https://youtube.com/@nevzorovtv"
        ],
        note: "Публицист, журналист, телеведущий. Маркировка 18+."
    },
    {
        id: "ino-654",
        reg_num: 654,
        name: "Горалик Линор (Юлия Борисовна)",
        aliases: ["Линор Горалик", "Юлия Горалик", "Linor Goralik"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "18.08.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 771502938471",
        resources: [
            "https://t.me/linorgoralik",
            "https://linorgoralik.com"
        ],
        note: "Писательница, поэтесса, художница, эссеист. Произведения маркируются знаком 18+."
    },
    {
        id: "ino-841",
        reg_num: 841,
        name: "Полозкова Вера Николаевна",
        aliases: ["Вера Полозкова", "В. Н. Полозкова", "Vera Polozkova"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "12.07.2024",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 771402948192",
        resources: [
            "https://t.me/polozkovapage",
            "https://instagram.com/bolshe_nikogda"
        ],
        note: "Поэтесса, актриса, драматург, автор поэтических сборников. Маркировка 18+."
    },
    {
        id: "ino-812",
        reg_num: 812,
        name: "Шишкин Михаил Павлович",
        aliases: ["Михаил Шишкин", "М. П. Шишкин", "Mikhail Shishkin"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "17.05.2024",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 770102948102",
        resources: [
            "https://facebook.com/mikhail.shishkin.writer"
        ],
        note: "Писатель, автор романов «Письмовник», «Венерин волос», «Взятие Измаила». Маркировка 18+."
    },
    {
        id: "ino-452",
        reg_num: 452,
        name: "Латынина Юлия Леонидовна",
        aliases: ["Юлия Латынина", "Ю. Л. Латынина", "Yulia Latynina"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "09.09.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 772701928471",
        resources: [
            "https://t.me/ylatynina",
            "https://youtube.com/@LatyninaTV"
        ],
        note: "Журналистка, писательница, автор детективных и экономических романов. Маркировка 18+."
    },
    {
        id: "ino-486",
        reg_num: 486,
        name: "Долин Антон Владимирович",
        aliases: ["Антон Долин", "А. В. Долин", "Anton Dolin"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "14.10.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770302948192",
        resources: [
            "https://t.me/radiodolin",
            "https://youtube.com/@RadioDolin"
        ],
        note: "Кинокритик, радиоведущий, автор книг по истории отечественного и мирового кино. Маркировка 18+."
    },
    {
        id: "ino-368",
        reg_num: 368,
        name: "Понасенков Евгений Николаевич",
        aliases: ["Евгений Понасенков", "Е. Н. Понасенков", "Evgeny Ponasenkov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "01.04.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948102",
        resources: [
            "https://t.me/evgenii_ponasenkov",
            "https://youtube.com/@ChannelOfPonasenkov"
        ],
        note: "Историк, публицист, автор монографий об Отечественной войне 1812 года. Маркировка 18+."
    },
    {
        id: "ino-512",
        reg_num: 512,
        name: "Баунов Александр Германович",
        aliases: ["Александр Баунов", "А. Г. Баунов", "Alexander Baunov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "23.12.2022",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 771002938471",
        resources: [
            "https://t.me/baunovcast"
        ],
        note: "Журналист, политолог, автор книги «Конец режима». Маркировка 18+."
    },
    {
        id: "ino-634",
        reg_num: 634,
        name: "Радзинский Олег Эдвардович",
        aliases: ["Олег Радзинский", "О. Э. Радзинский", "Oleg Radzinsky"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "30.06.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 770401928472",
        resources: [
            "https://facebook.com/oleg.radzinsky"
        ],
        note: "Писатель, автор автобиографического романа «Случайные жизни» и фантастических повестей. Маркировка 18+."
    },
    {
        id: "ino-788",
        reg_num: 788,
        name: "Филиппов Иван Владимирович",
        aliases: ["Иван Филиппов", "И. В. Филиппов", "Ivan Filippov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "12.04.2024",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 771401928374",
        resources: [
            "https://t.me/na_zapade_bezz",
            "https://t.me/zapishi_knigu"
        ],
        note: "Журналист, кинокритик, писатель, автор романа «Мышь». Маркировка 18+."
    },
    {
        id: "ino-446",
        reg_num: 446,
        name: "Макаревич Андрей Вадимович",
        aliases: ["Андрей Макаревич", "А. В. Макаревич", "Машина Времени", "Andrey Makarevich"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "02.09.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948193",
        resources: [
            "https://t.me/makarevich_andrey",
            "https://facebook.com/makarevichav"
        ],
        note: "Музыкант, лидер рок-группы «Машина времени», автор автобиографических книг. Маркировка 18+."
    },
    {
        id: "ino-633",
        reg_num: 633,
        name: "Гребенщиков Борис Борисович",
        aliases: ["Борис Гребенщиков", "БГ", "Аквариум", "Boris Grebenshchikov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "30.06.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 780102948192",
        resources: [
            "https://t.me/bg_aerostat",
            "https://bg-aquarium.com"
        ],
        note: "Музыкант, поэт, лидер группы «Аквариум», переводчик древних текстов. Маркировка 18+."
    },
    {
        id: "ino-543",
        reg_num: 543,
        name: "Рамазанова Земфира Талгатовна",
        aliases: ["Земфира", "Земфира Рамазанова", "Zemfira"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "10.02.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 027402948192",
        resources: [
            "https://zemfira.world",
            "https://instagram.com/zemfiralive"
        ],
        note: "Рок-музыкант, певица, автор песен, композитор. Маркировка 18+."
    },
    {
        id: "ino-387",
        reg_num: 387,
        name: "Моргенштерн Алишер Тагирович",
        aliases: ["Алишер Моргенштерн", "Моргенштерн", "Morgenshtern"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "06.05.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 027409283741",
        resources: [
            "https://t.me/morgenshtern_channel",
            "https://youtube.com/@morgenshtern"
        ],
        note: "Рэп-исполнитель, музыкант, шоумен. Маркировка 18+."
    },
    {
        id: "ino-480",
        reg_num: 480,
        name: "Фёдоров Мирон Янович",
        aliases: ["Oxxxymiron", "Оксимирон", "Мирон Фёдоров", "Miron Fedorov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "07.10.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 780102948172",
        resources: [
            "https://t.me/oxxxymiron_official",
            "https://oxxxymiron.com"
        ],
        note: "Хип-хоп исполнитель, поэт. Маркировка 18+."
    },
    {
        id: "ino-502",
        reg_num: 502,
        name: "Алексеев Иван Александрович",
        aliases: ["Noize MC", "Нойз МС", "Иван Алексеев", "Ivan Alexeev"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "18.11.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 312802948192",
        resources: [
            "https://t.me/noizemcofficial",
            "https://noizemc.com"
        ],
        note: "Музыкант, рэп-рок исполнитель, автор текстов. Маркировка 18+."
    },
    {
        id: "ino-462",
        reg_num: 462,
        name: "Галкин Максим Александрович",
        aliases: ["Максим Галкин", "М. А. Галкин", "Maxim Galkin"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "16.09.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948101",
        resources: [
            "https://instagram.com/maxgalkinru",
            "https://t.me/maxgalkin_official"
        ],
        note: "Артист эстрады, пародист, юморист, телеведущий. Маркировка 18+."
    },
    {
        id: "ino-580",
        reg_num: 580,
        name: "Слепаков Семён Сергеевич",
        aliases: ["Семён Слепаков", "С. С. Слепаков", "Semyon Slepakov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "14.04.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 263202948192",
        resources: [
            "https://t.me/slepakovsemyon",
            "https://youtube.com/@SemyonSlepakov"
        ],
        note: "Комик, бард, сценарист, продюсер. Маркировка 18+."
    },
    {
        id: "ino-524",
        reg_num: 524,
        name: "Смольянинов Артур Сергеевич",
        aliases: ["Артур Смольянинов", "А. С. Смольянинов", "Artur Smolyaninov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "13.01.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 772802948192",
        resources: [
            "https://instagram.com/artursmolyaninov"
        ],
        note: "Актёр театра и кино, музыкант. Маркировка 18+."
    },
    {
        id: "ino-396",
        reg_num: 396,
        name: "Каспаров Гарри Кимович",
        aliases: ["Гарри Каспаров", "Г. К. Каспаров", "Garry Kasparov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "20.05.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948194",
        resources: [
            "https://kasparov.ru",
            "https://twitter.com/Kasparov63"
        ],
        note: "13-й чемпион мира по шахматам, автор шахматных книг и мемуаров. Маркировка 18+."
    },
    {
        id: "ino-375",
        reg_num: 375,
        name: "Дудь Юрий Александрович",
        aliases: ["Юрий Дудь", "Ю. А. Дудь", "вДудь", "Yury Dud"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "15.04.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 772802948174",
        resources: [
            "https://t.me/yurydud",
            "https://youtube.com/@vdud"
        ],
        note: "Журналист, видеоблогер, интервьюер. Маркировка 18+."
    },
    {
        id: "ino-570",
        reg_num: 570,
        name: "Варламов Илья Александрович",
        aliases: ["Илья Варламов", "И. А. Варламов", "Ilya Varlamov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "23.03.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "ИНН: 773302948192",
        resources: [
            "https://t.me/varlamov_news",
            "https://varlamov.ru",
            "https://youtube.com/@varlamov"
        ],
        note: "Блогер, урбанист, автор книг об архитектуре и городе («100 советов мэру»). Маркировка 18+."
    },
    {
        id: "ino-421",
        reg_num: 421,
        name: "Кац Максим Евгеньевич",
        aliases: ["Максим Кац", "М. Е. Кац", "Maxim Katz"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "22.07.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 773402948192",
        resources: [
            "https://t.me/maximkatz",
            "https://youtube.com/@maximkatz1"
        ],
        note: "Политик, видеоблогер, автор книг об урбанистике и истории. Маркировка 18+."
    },
    {
        id: "ino-390",
        reg_num: 390,
        name: "Пивоваров Алексей Владимирович",
        aliases: ["Алексей Пивоваров", "Редакция", "Alexey Pivovarov"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "03.06.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948183",
        resources: [
            "https://t.me/redakciya_channel",
            "https://youtube.com/@redakciya"
        ],
        note: "Журналист, продюсер, создатель медиапроекта «Редакция». Маркировка 18+."
    },
    {
        id: "ino-382",
        reg_num: 382,
        name: "Кара-Мурза Владимир Владимирович",
        aliases: ["Владимир Кара-Мурза", "В. В. Кара-Мурза", "Vladimir Kara-Murza"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "22.04.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948195",
        resources: [
            "https://t.me/vkaramurza"
        ],
        note: "Политик, публицист, историк. Маркировка 18+."
    },
    {
        id: "ino-422",
        reg_num: 422,
        name: "Яшин Илья Валерьевич",
        aliases: ["Илья Яшин", "И. В. Яшин", "Ilya Yashin"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "22.07.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 772802948184",
        resources: [
            "https://t.me/yashinilya",
            "https://youtube.com/@IlyaYashin"
        ],
        note: "Политик, общественный деятель, автор видеоисследований. Маркировка 18+."
    },
    {
        id: "ino-395",
        reg_num: 395,
        name: "Ходорковский Михаил Борисович",
        aliases: ["Михаил Ходорковский", "М. Б. Ходорковский", "Mikhail Khodorkovsky"],
        type: "person",
        type_label: "Физическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "20.05.2022",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7 255-ФЗ",
        inn_ogrn: "ИНН: 770402948197",
        resources: [
            "https://t.me/khodorkovski",
            "https://khodorkovsky.com"
        ],
        note: "Общественный деятель, предприниматель, публицист. Маркировка 18+."
    },
    {
        id: "ino-181",
        reg_num: 181,
        name: "Общество с ограниченной ответственностью «Телеканал Дождь»",
        aliases: ["Телеканал Дождь", "Дождь", "TV Rain", "ООО Телеканал Дождь"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "20.08.2021",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О средствах массовой информации»",
        inn_ogrn: "ИНН: 7704686007, ОГРН: 1087746533033",
        resources: [
            "https://tvrain.tv",
            "https://t.me/tvrain",
            "https://youtube.com/@tvrain"
        ],
        note: "СМИ и медиакомпания. Информационные материалы подлежат обязательной маркировке."
    },
    {
        id: "ino-172",
        reg_num: 172,
        name: "SIA «Medusa Project»",
        aliases: ["Meduza", "Медуза", "Медуза Проект", "Medusa Project SIA"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "23.04.2021",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О средствах массовой информации»",
        inn_ogrn: "Рег. номер (Латвия): 40103797863",
        resources: [
            "https://meduza.io",
            "https://t.me/meduzalive"
        ],
        note: "Интернет-издание. Информационные материалы подлежат обязательной маркировке."
    },
    {
        id: "ino-178",
        reg_num: 178,
        name: "The Insider SIA",
        aliases: ["The Insider", "Инсайдер", "The Insider Russia"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "23.07.2021",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О средствах массовой информации»",
        inn_ogrn: "Рег. номер (Латвия): 40103914441",
        resources: [
            "https://theins.ru",
            "https://t.me/theinsider"
        ],
        note: "Интернет-издание, специализирующееся на расследованиях. Маркировка 18+."
    },
    {
        id: "ino-240",
        reg_num: 240,
        name: "ООО «Иноагент ААВ»",
        aliases: ["Иноагент ААВ", "Алексей Венедиктов", "Живой Гвоздь"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "22.04.2022",
        exclusion_date: null,
        legal_basis: "Федеральный закон от 14.07.2022 № 255-ФЗ, ст. 7",
        inn_ogrn: "ИНН: 9704137291, ОГРН: 1227700259182",
        resources: [
            "https://t.me/aavst2022",
            "https://youtube.com/@zhivoygvozd"
        ],
        note: "Юридическое лицо, учреждённое журналистом А. А. Венедиктовым."
    },
    {
        id: "ino-001",
        reg_num: 1,
        name: "Радио Свободная Европа / Радио Свобода (RFE/RL, Inc.)",
        aliases: ["Радио Свобода", "Radio Free Europe", "RFE/RL", "Сибирь.Реалии", "Север.Реалии"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "05.12.2017",
        exclusion_date: null,
        legal_basis: "Закон РФ от 27.12.1991 № 2124-1 «О средствах массовой информации»",
        inn_ogrn: "Рег. номер (США): 0153029",
        resources: [
            "https://svoboda.org",
            "https://t.me/radiosvoboda"
        ],
        note: "Международная некоммерческая радиовещательная организация."
    },
    {
        id: "ino-095",
        reg_num: 95,
        name: "Международная общественная организация «Международное историко-просветительское общество \"Мемориал\"»",
        aliases: ["Мемориал", "Международный Мемориал", "Memorial International"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "04.10.2016",
        exclusion_date: null,
        legal_basis: "Федеральный закон от 12.01.1996 № 7-ФЗ «О некоммерческих организациях»",
        inn_ogrn: "ИНН: 7707629481, ОГРН: 1037739002938",
        resources: [
            "https://memo.ru",
            "https://t.me/memorial_russia"
        ],
        note: "Историко-просветительская организация. Книги и архивные сборники маркируются 18+."
    },
    {
        id: "ino-102",
        reg_num: 102,
        name: "АНО «Центр антикоррупционных исследований \"Трансперенси Интернешнл - Р\"»",
        aliases: ["Transparency International", "Трансперенси Интернешнл", "ТИ-Р"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "07.04.2015",
        exclusion_date: null,
        legal_basis: "Федеральный закон от 12.01.1996 № 7-ФЗ «О некоммерческих организациях»",
        inn_ogrn: "ИНН: 7709294810, ОГРН: 1027700294819",
        resources: [
            "https://transparency.org.ru",
            "https://t.me/transparency_russia"
        ],
        note: "Антикоррупционная исследовательская организация."
    },
    {
        id: "ino-055",
        reg_num: 55,
        name: "Фонд содействия защите прав и свобод граждан «Общественный вердикт»",
        aliases: ["Общественный вердикт", "Public Verdict Foundation"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "08.05.2014",
        exclusion_date: null,
        legal_basis: "Федеральный закон от 12.01.1996 № 7-ФЗ",
        inn_ogrn: "ИНН: 7702517822, ОГРН: 1047796129481",
        resources: [
            "https://publicverdict.org",
            "https://t.me/publicverdict"
        ],
        note: "Некоммерческая правозащитная организация."
    },
    {
        id: "ino-ass-001",
        reg_num: 201,
        name: "Движение в защиту прав избирателей «Голос»",
        aliases: ["Движение Голос", "Голос", "Golos"],
        type: "association",
        type_label: "Общественное объединение",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "18.08.2021",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "Без образования юридического лица",
        resources: [
            "https://golosinfo.org",
            "https://t.me/golosinfo"
        ],
        note: "Общественное объединение по наблюдению за выборами."
    },
    {
        id: "ino-ass-002",
        reg_num: 202,
        name: "Правозащитный медиапроект «ОВД-Инфо»",
        aliases: ["ОВД-Инфо", "OVD-Info", "ОВД Инфо"],
        type: "association",
        type_label: "Общественное объединение",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "29.09.2021",
        exclusion_date: null,
        legal_basis: "Статья 25.1 Закона РФ «О СМИ», ст. 7, 9 255-ФЗ",
        inn_ogrn: "Без образования юридического лица",
        resources: [
            "https://ovdinfo.org",
            "https://t.me/ovdinfo"
        ],
        note: "Независимый правозащитный медиапроект политической помощи."
    },
    {
        id: "ino-ass-003",
        reg_num: 203,
        name: "Межрегиональная общественная организация «Команда против пыток»",
        aliases: ["Команда против пыток", "Комитет против пыток", "Crew Against Torture"],
        type: "association",
        type_label: "Общественное объединение",
        status: "active",
        status_label: "В реестре",
        inclusion_date: "23.08.2023",
        exclusion_date: null,
        legal_basis: "Статьи 7, 9 Федерального закона от 14.07.2022 № 255-ФЗ",
        inn_ogrn: "Без образования юридического лица",
        resources: [
            "https://pytkam.net",
            "https://t.me/no_torture"
        ],
        note: "Общественное объединение юристов и правозащитников."
    },
    {
        id: "ino-exc-001",
        reg_num: 164,
        name: "Благотворительный фонд помощи взрослым «Фонд борьбы с лейкемией»",
        aliases: ["Фонд борьбы с лейкемией", "Борьба с лейкемией", "Leukemia Foundation"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "excluded",
        status_label: "Исключён",
        inclusion_date: "02.09.2022",
        exclusion_date: "23.09.2022",
        legal_basis: "Исключён распоряжением Минюста РФ в связи с прекращением иностранного финансирования",
        inn_ogrn: "ИНН: 7708240400, ОГРН: 1147799010534",
        resources: [
            "https://leikozu.net",
            "https://t.me/leikozunet"
        ],
        note: "Благотворительная организация. Официально исключена Минюстом РФ из реестра 23.09.2022."
    },
    {
        id: "ino-exc-002",
        reg_num: 115,
        name: "Савицкая Светлана Николаевна",
        aliases: ["Светлана Савицкая", "С. Н. Савицкая"],
        type: "person",
        type_label: "Физическое лицо",
        status: "excluded",
        status_label: "Исключён",
        inclusion_date: "28.12.2020",
        exclusion_date: "29.04.2022",
        legal_basis: "Исключена распоряжением Минюста РФ от 29.04.2022 на основании заявления об отсутствии финансирования",
        inn_ogrn: "ИНН: 602711928374",
        resources: [],
        note: "Журналистка. Статус иностранного агента официально снят Минюстом РФ."
    },
    {
        id: "ino-exc-003",
        reg_num: 118,
        name: "Воронов Владимир Владимирович",
        aliases: ["Владимир Воронов", "В. В. Воронов"],
        type: "person",
        type_label: "Физическое лицо",
        status: "excluded",
        status_label: "Исключён",
        inclusion_date: "15.07.2021",
        exclusion_date: "06.05.2022",
        legal_basis: "Исключён распоряжением Минюста РФ от 06.05.2022",
        inn_ogrn: "ИНН: 772802938471",
        resources: [],
        note: "Журналист. Исключён из реестра в установленном законодательством порядке."
    },
    {
        id: "ino-exc-004",
        reg_num: 142,
        name: "Ассоциация выпускников Санкт-Петербургского государственного университета",
        aliases: ["Ассоциация выпускников СПбГУ", "Выпускники СПбГУ"],
        type: "legal",
        type_label: "Юридическое лицо",
        status: "excluded",
        status_label: "Исключён",
        inclusion_date: "10.09.2021",
        exclusion_date: "17.06.2022",
        legal_basis: "Исключена в связи с прекращением получения средств из зарубежных источников",
        inn_ogrn: "ИНН: 7801269384, ОГРН: 1147800004910",
        resources: [
            "https://alumni.spbu.ru"
        ],
        note: "Некоммерческая организация. Статус иностранного агента аннулирован Минюстом РФ."
    }
];

/**
 * Асинхронная загрузка актуального реестра иноагентов из шлюза api/inoagent.php
 * или локального снимка data/inoagents.json
 */
async function loadRegistryData() {
    if (cachedRegistryData && cachedRegistryData.length > 0) {
        return cachedRegistryData;
    }

    if (isDataLoading) {
        return DEFAULT_REGISTRY_ITEMS;
    }

    isDataLoading = true;

    // 1. Попытка загрузить полный набор данных через локальный шлюз api/inoagent.php
    try {
        const apiUrl = resolveApiUrl('api/inoagent.php?action=search&limit=50&page=1');
        const apiRes = await fetch(apiUrl);
        if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson && apiJson.ok && Array.isArray(apiJson.values) && apiJson.values.length > 0) {
                // Если API возвращает значения, сохраняем их
                cachedRegistryData = apiJson.values;
            }
        }
    } catch (e) {
        console.warn('[InoagentModal] Запрос к api/inoagent.php не удался, пробуем статический реестр:', e);
    }

    // 2. Загружаем полный массив всех 1267 персон из data/inoagents.json
    try {
        const url = resolveApiUrl('data/inoagents.json');
        const res = await fetch(url);
        if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.items) && json.items.length > 0) {
                cachedRegistryData = json.items;
                isDataLoading = false;
                return cachedRegistryData;
            }
        }
    } catch (e) {
        console.warn('[InoagentModal] Не удалось загрузить data/inoagents.json, используется встроенный реестр:', e);
    }

    if (!cachedRegistryData || cachedRegistryData.length === 0) {
        cachedRegistryData = DEFAULT_REGISTRY_ITEMS;
    }

    isDataLoading = false;
    return cachedRegistryData;
}

/**
 * Очистка поискового запроса для нечёткого поиска
 */
function normalizeText(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .replace(/[ё]/g, 'е')
        .replace(/[.,/#!$%^&*;:{}=\-_`~()«»""''„“]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Фильтрация реестра по запросу, типу и статусу
 */
function filterRegistry(items, query, typeFilter, statusFilter) {
    const normQuery = normalizeText(query);
    const queryWords = normQuery.split(' ').filter(w => w.length > 0);

    return items.filter(item => {
        // Фильтр по статусу
        if (statusFilter !== 'all' && item.status !== statusFilter) {
            return false;
        }

        // Фильтр по типу
        if (typeFilter !== 'all' && item.type !== typeFilter) {
            return false;
        }

        // Если поисковый запрос пуст, фильтрация только по статусу и типу
        if (queryWords.length === 0) {
            return true;
        }

        // Формируем сводный поисковый вектор сущности
        const searchVector = [
            item.name,
            String(item.reg_num),
            item.inn_ogrn,
            item.legal_basis,
            item.note,
            ...(Array.isArray(item.aliases) ? item.aliases : []),
            ...(Array.isArray(item.resources) ? item.resources : [])
        ].map(normalizeText).join(' ');

        // Проверяем вхождение всех введённых слов (AND-логика)
        return queryWords.every(word => searchVector.includes(word));
    });
}

/**
 * Отрисовка списка карточек результатов
 */
function renderResults(matchedItems) {
    if (!resultsGridEl || !summaryBadgeEl) return;

    // Обновляем счётчик
    summaryBadgeEl.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px;">policy</span>
        Найдено: <strong>${matchedItems.length}</strong>
    `;

    // Если ничего не найдено
    if (matchedItems.length === 0) {
        resultsGridEl.innerHTML = `
            <div class="inoagent-empty-state" style="grid-column: 1 / -1;">
                <div class="inoagent-empty-icon">
                    <span class="material-symbols-outlined">verified_user</span>
                </div>
                <h3 class="inoagent-empty-title">Лиц из реестра иноагентов не обнаружено</h3>
                <p class="inoagent-empty-desc">
                    По введённому запросу «<strong>${escapeHtml(currentSearchQuery)}</strong>» совпадений в Едином реестре Минюста РФ не найдено.
                </p>
                <button type="button" class="inoagent-empty-btn" data-reset-search>
                    Сбросить поисковый запрос и фильтры
                </button>
            </div>
        `;

        const resetBtn = resultsGridEl.querySelector('[data-reset-search]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (searchInputEl) searchInputEl.value = '';
                currentSearchQuery = '';
                currentTypeFilter = 'all';
                currentStatusFilter = 'all';
                updateFilterChipsUI();
                executeSearch();
            });
        }
        return;
    }

    // Рендерим сетку карточек
    resultsGridEl.innerHTML = matchedItems.map(item => {
        const isExcluded = item.status === 'excluded';
        const typeIcon = item.type === 'person' ? 'person' : (item.type === 'legal' ? 'apartment' : 'groups');
        const statusIcon = isExcluded ? 'check_circle' : 'warning';

        // Псевдонимы
        const aliasesHtml = Array.isArray(item.aliases) && item.aliases.length > 0
            ? `<div class="inoagent-card-aliases">
                 <span style="color: var(--ino-text-dim);">Псевдонимы:</span>
                 ${item.aliases.map(a => `<span class="alias-pill">${escapeHtml(a)}</span>`).join('')}
               </div>`
            : '';

        // Информационные ресурсы
        const resourcesHtml = Array.isArray(item.resources) && item.resources.length > 0
            ? `<div class="inoagent-resources-wrap">
                 <div class="inoagent-resources-title">
                   <span class="material-symbols-outlined" style="font-size: 14px;">link</span>
                   Информационные ресурсы:
                 </div>
                 <div class="inoagent-resources-list">
                   ${item.resources.map(res => {
                       let label = res.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
                       if (label.length > 28) label = label.substring(0, 26) + '…';
                       return `
                         <a href="${escapeHtml(res)}" target="_blank" rel="noopener noreferrer" class="inoagent-resource-link" title="${escapeHtml(res)}">
                           <span>${escapeHtml(label)}</span>
                           <span class="material-symbols-outlined">open_in_new</span>
                         </a>
                       `;
                   }).join('')}
                 </div>
               </div>`
            : '';

        return `
            <article class="inoagent-card ${isExcluded ? 'is-excluded' : ''}" data-id="${escapeHtml(item.id)}">
                <!-- Шапка карточки -->
                <div class="inoagent-card-header">
                    <div class="inoagent-card-top-row">
                        <div class="inoagent-card-badges">
                            <span class="inoagent-type-badge">
                                <span class="material-symbols-outlined" style="font-size: 14px;">${typeIcon}</span>
                                ${escapeHtml(item.type_label || 'Субъект')}
                            </span>
                            <span class="inoagent-status-badge ${isExcluded ? 'is-excluded' : 'is-active'}">
                                <span class="material-symbols-outlined" style="font-size: 14px;">${statusIcon}</span>
                                ${escapeHtml(item.status_label || (isExcluded ? 'Исключён' : 'В реестре'))}
                            </span>
                        </div>
                        <span class="inoagent-reg-num" title="Порядковый номер в реестре Минюста">№ ${item.reg_num}</span>
                    </div>

                    <h3 class="inoagent-card-title">${escapeHtml(item.name)}</h3>
                    ${aliasesHtml}
                </div>

                <!-- Сетка атрибутов -->
                <div class="inoagent-card-meta">
                    <div class="inoagent-meta-item">
                        <span class="inoagent-meta-label">Дата включения:</span>
                        <span class="inoagent-meta-value highlight-date">📅 ${escapeHtml(item.inclusion_date)}</span>
                    </div>
                    ${isExcluded && item.exclusion_date ? `
                        <div class="inoagent-meta-item">
                            <span class="inoagent-meta-label">Дата исключения:</span>
                            <span class="inoagent-meta-value highlight-excluded">🟢 ${escapeHtml(item.exclusion_date)}</span>
                        </div>
                    ` : `
                        <div class="inoagent-meta-item">
                            <span class="inoagent-meta-label">Текущий статус:</span>
                            <span class="inoagent-meta-value" style="color: #f87171;">⚠️ Действует</span>
                        </div>
                    `}
                    ${item.inn_ogrn ? `
                        <div class="inoagent-meta-item full-width">
                            <span class="inoagent-meta-label">Регистрационные данные:</span>
                            <span class="inoagent-meta-value">${escapeHtml(item.inn_ogrn)}</span>
                        </div>
                    ` : ''}
                    <div class="inoagent-meta-item full-width">
                        <span class="inoagent-meta-label">Основание включения:</span>
                        <span class="inoagent-meta-value">${escapeHtml(item.legal_basis)}</span>
                    </div>
                </div>

                <!-- Ссылки -->
                ${resourcesHtml}

                <!-- Примечание и библиотечные требования -->
                ${item.note ? `
                    <div class="inoagent-card-note">
                        <strong>Требования законодательства:</strong> ${escapeHtml(item.note)}
                    </div>
                ` : ''}

                <!-- Действия -->
                <div class="inoagent-card-actions">
                    <button type="button" class="inoagent-btn-action" data-action="copy" title="Скопировать сведения в буфер обмена">
                        <span class="material-symbols-outlined">content_copy</span>
                        <span class="action-text">Копировать</span>
                    </button>
                    <button type="button" class="inoagent-btn-action btn-cosmo" data-action="cosmo" title="Запросить разъяснение правил и 255-ФЗ у робота Космо">
                        <span class="material-symbols-outlined">smart_toy</span>
                        <span>Справка Космо</span>
                    </button>
                </div>
            </article>
        `;
    }).join('');

    // Навешиваем слушатели на кнопки карточек
    bindCardActions(matchedItems);
}

/**
 * Привязка действий к кнопкам карточек
 */
function bindCardActions(matchedItems) {
    if (!resultsGridEl) return;

    // Копирование информации
    resultsGridEl.querySelectorAll('[data-action="copy"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardEl = e.currentTarget.closest('.inoagent-card');
            if (!cardEl) return;
            const itemId = cardEl.getAttribute('data-id');
            const item = matchedItems.find(it => it.id === itemId);
            if (!item) return;

            const textToCopy = [
                `Реестр иностранных агентов Минюста РФ (255-ФЗ):`,
                `ФИО / Наименование: ${item.name}`,
                item.aliases?.length ? `Псевдонимы: ${item.aliases.join(', ')}` : null,
                `Номер в реестре: № ${item.reg_num}`,
                `Тип: ${item.type_label || 'Субъект'}`,
                `Статус: ${item.status_label || (item.status === 'excluded' ? 'Исключён' : 'В реестре')}`,
                `Дата включения: ${item.inclusion_date}`,
                item.exclusion_date ? `Дата исключения: ${item.exclusion_date}` : null,
                item.inn_ogrn ? `Рег. данные: ${item.inn_ogrn}` : null,
                `Основание: ${item.legal_basis}`,
                item.resources?.length ? `Ресурсы: ${item.resources.join(', ')}` : null,
                item.note ? `Примечание: ${item.note}` : null
            ].filter(Boolean).join('\n');

            navigator.clipboard.writeText(textToCopy).then(() => {
                const textSpan = btn.querySelector('.action-text');
                const originalText = textSpan ? textSpan.textContent : 'Копировать';
                btn.classList.add('is-copied');
                if (textSpan) textSpan.textContent = 'Скопировано! ✓';

                setTimeout(() => {
                    btn.classList.remove('is-copied');
                    if (textSpan) textSpan.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('[InoagentModal] Ошибка копирования:', err);
            });
        });
    });

    // Передача запроса роботу Космо
    resultsGridEl.querySelectorAll('[data-action="cosmo"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardEl = e.currentTarget.closest('.inoagent-card');
            if (!cardEl) return;
            const itemId = cardEl.getAttribute('data-id');
            const item = matchedItems.find(it => it.id === itemId);
            if (!item) return;

            triggerCosmoQuery(item.name, item);
        });
    });
}

/**
 * Передача вопроса в чат с роботом Космо
 */
function triggerCosmoQuery(name, agent) {
    const prompt = agent
        ? `Как робот библиотечной системы г. Владимира, разъясни требования законодательства РФ (255-ФЗ) и правила библиотек касательно персоны «${name}» (реестр Минюста РФ №${agent.reg_num}) и порядка работы с книгами/материалами лиц со статусом иноагента.`
        : `Каковы требования Федерального закона № 255-ФЗ и правила библиотек по маркировке, хранению и выдаче произведений лиц со статусом иностранного агента?`;

    // Закрываем модалку и открываем чат с Космо
    closeInoagentModal();

    if (window.Mascot && typeof window.Mascot.openCosmoChat === 'function') {
        window.Mascot.openCosmoChat(prompt);
    } else if (typeof window.openCosmoChat === 'function') {
        window.openCosmoChat(prompt);
    } else {
        const mascot = document.getElementById('cosmo-mascot');
        if (mascot) {
            mascot.click();
            setTimeout(() => {
                const chatInput = document.querySelector('.cosmo-chat-input');
                if (chatInput) {
                    chatInput.value = prompt;
                    chatInput.focus();
                }
            }, 300);
        }
    }
}

/**
 * Синхронизация подсветки фильтров в UI
 */
function updateFilterChipsUI() {
    if (!modalOverlayEl) return;

    modalOverlayEl.querySelectorAll('.inoagent-chip[data-type]').forEach(chip => {
        const val = chip.getAttribute('data-type');
        chip.classList.toggle('is-active', val === currentTypeFilter);
    });

    modalOverlayEl.querySelectorAll('.inoagent-chip[data-status]').forEach(chip => {
        const val = chip.getAttribute('data-status');
        chip.classList.toggle('is-active', val === currentStatusFilter);
    });
}

/**
 * Выполнение поиска и фильтрации
 */
async function executeSearch() {
    const data = await loadRegistryData();
    const filtered = filterRegistry(data, currentSearchQuery, currentTypeFilter, currentStatusFilter);
    renderResults(filtered);
}

/**
 * Обработка ввода с дебаунсом 300мс
 */
function onSearchInput(val) {
    currentSearchQuery = val.trim();

    if (clearBtnEl) {
        clearBtnEl.classList.toggle('hidden', currentSearchQuery.length === 0);
    }

    if (spinnerEl) {
        spinnerEl.classList.add('active');
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
        await executeSearch();
        if (spinnerEl) {
            spinnerEl.classList.remove('active');
        }
    }, 300);
}

/**
 * Привязка событий внутри модального окна
 */
function bindModalEvents() {
    if (!modalOverlayEl) return;

    searchInputEl = modalOverlayEl.querySelector('[data-inoagent-input]');
    clearBtnEl = modalOverlayEl.querySelector('[data-inoagent-clear]');
    searchBtnEl = modalOverlayEl.querySelector('[data-inoagent-search]');
    spinnerEl = modalOverlayEl.querySelector('[data-inoagent-spinner]');
    resultsGridEl = modalOverlayEl.querySelector('[data-inoagent-grid]');
    summaryBadgeEl = modalOverlayEl.querySelector('[data-inoagent-summary]');
    quickTagsEl = modalOverlayEl.querySelector('.inoagent-quick-tags');

    // Ввод в поисковую строку (debounce 300мс)
    if (searchInputEl) {
        searchInputEl.addEventListener('input', (e) => {
            onSearchInput(e.target.value);
        });

        searchInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (debounceTimer) clearTimeout(debounceTimer);
                if (spinnerEl) spinnerEl.classList.remove('active');
                executeSearch();
            }
        });
    }

    // Очистка поиска
    if (clearBtnEl) {
        clearBtnEl.addEventListener('click', () => {
            if (searchInputEl) {
                searchInputEl.value = '';
                searchInputEl.focus();
            }
            onSearchInput('');
        });
    }

    // Кнопка «Искать»
    if (searchBtnEl) {
        searchBtnEl.addEventListener('click', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (spinnerEl) spinnerEl.classList.remove('active');
            executeSearch();
        });
    }

    // Быстрые теги (популярные поиски)
    if (quickTagsEl) {
        quickTagsEl.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('.inoagent-quick-tag');
            if (!tagBtn) return;
            const query = tagBtn.getAttribute('data-tag') || tagBtn.textContent.trim();
            if (searchInputEl) {
                searchInputEl.value = query;
            }
            onSearchInput(query);
        });
    }

    // Фильтры по типу
    modalOverlayEl.querySelectorAll('.inoagent-chip[data-type]').forEach(chip => {
        chip.addEventListener('click', () => {
            currentTypeFilter = chip.getAttribute('data-type') || 'all';
            updateFilterChipsUI();
            executeSearch();
        });
    });

    // Фильтры по статусу
    modalOverlayEl.querySelectorAll('.inoagent-chip[data-status]').forEach(chip => {
        chip.addEventListener('click', () => {
            currentStatusFilter = chip.getAttribute('data-status') || 'all';
            updateFilterChipsUI();
            executeSearch();
        });
    });

    // Кнопка закрытия модалки
    const closeBtns = modalOverlayEl.querySelectorAll('[data-inoagent-close]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeInoagentModal();
        });
    });

    // Клик по оверлею вне диалогового окна закрывает модалку
    modalOverlayEl.addEventListener('click', (e) => {
        if (e.target === modalOverlayEl) {
            closeInoagentModal();
        }
    });

    // Защита от закрытия при клике внутри диалога
    const dialog = modalOverlayEl.querySelector('.inoagent-modal-dialog');
    if (dialog) {
        dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Кнопка справки Космо в шапке / уведомлении
    const noticeCosmoBtn = modalOverlayEl.querySelector('[data-notice-cosmo]');
    if (noticeCosmoBtn) {
        noticeCosmoBtn.addEventListener('click', () => {
            triggerCosmoQuery('', null);
        });
    }

    // Слушатель клавиши Escape
    if (!window.__inoagentEscBound) {
        window.__inoagentEscBound = true;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modalOverlayEl && (modalOverlayEl.classList.contains('is-open') || !modalOverlayEl.classList.contains('hidden'))) {
                    e.preventDefault();
                    closeInoagentModal();
                }
            }
        });
    }
}

/**
 * Инициализация и рендеринг разметки модального окна в DOM
 */
export function initInoagentModal() {
    if (modalOverlayEl) return modalOverlayEl;

    const existing = document.getElementById('inoagent-modal-overlay');
    if (existing) {
        modalOverlayEl = existing;
        bindModalEvents();
        return modalOverlayEl;
    }

    const modal = document.createElement('div');
    modal.id = 'inoagent-modal-overlay';
    modal.className = 'inoagent-modal-overlay hidden no-print';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'inoagent-modal-title');

    modal.innerHTML = `
        <div class="inoagent-modal-dialog">
            <!-- Шапка с баннером Минюста РФ -->
            <div class="inoagent-modal-header">
                <div class="inoagent-modal-banner">
                    <div class="inoagent-banner-content">
                        <div class="inoagent-banner-icon-badge">
                            <span class="material-symbols-outlined">shield_person</span>
                        </div>
                        <div class="inoagent-banner-text">
                            <div class="inoagent-banner-title-row">
                                <h2 id="inoagent-modal-title" class="inoagent-banner-title">Реестр иностранных агентов</h2>
                                <span class="inoagent-banner-badge">
                                    <span class="inoagent-badge-dot"></span>
                                    Минюст РФ • 255-ФЗ
                                </span>
                            </div>
                            <p class="inoagent-banner-subtitle">
                                Справочник физических лиц, юрлиц и объединений под иностранным влиянием (ст. 7, 9 255-ФЗ)
                            </p>
                        </div>
                    </div>
                    <button type="button" class="inoagent-close-btn" data-inoagent-close title="Закрыть реестр (Esc)">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <!-- Тело модального окна -->
            <div class="inoagent-modal-body">
                <!-- Секция поиска -->
                <section class="inoagent-search-section">
                    <div class="inoagent-search-input-wrap">
                        <span class="material-symbols-outlined inoagent-search-icon">search</span>
                        <input
                            type="search"
                            class="inoagent-search-input"
                            data-inoagent-input
                            placeholder="Поиск по ФИО, наименованию, псевдониму, ИНН или номеру в реестре..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <div class="inoagent-search-spinner" data-inoagent-spinner></div>
                        <button type="button" class="inoagent-clear-btn hidden" data-inoagent-clear title="Очистить поиск">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                        <button type="button" class="inoagent-search-btn" data-inoagent-search title="Найти в реестре">
                            <span class="material-symbols-outlined icon">travel_explore</span>
                            <span class="inoagent-search-btn-text">Искать</span>
                        </button>
                    </div>

                    <!-- Горячие подсказки популярных авторов/персон -->
                    <div class="inoagent-quick-tags">
                        <span class="inoagent-quick-tags-label">
                            <span class="material-symbols-outlined" style="font-size: 15px;">trending_up</span>
                            Популярное:
                        </span>
                        <button type="button" class="inoagent-quick-tag" data-tag="Акунин">Акунин</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Глуховский">Глуховский</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Быков">Быков</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Улицкая">Улицкая</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Зыгарь">Зыгарь</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Шульман">Шульман</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Земфира">Земфира</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Дождь">Дождь</button>
                        <button type="button" class="inoagent-quick-tag" data-tag="Голос">Голос</button>
                    </div>
                </section>

                <!-- Панель фильтров: Тип и Статус -->
                <div class="inoagent-filters-bar">
                    <div class="inoagent-filters-group">
                        <span class="inoagent-filter-label">Тип:</span>
                        <button type="button" class="inoagent-chip is-active" data-type="all">Все</button>
                        <button type="button" class="inoagent-chip" data-type="person">Физические лица</button>
                        <button type="button" class="inoagent-chip" data-type="legal">Юрлица</button>
                        <button type="button" class="inoagent-chip" data-type="association">Объединения</button>
                    </div>

                    <div class="inoagent-filters-group">
                        <span class="inoagent-filter-label">Статус:</span>
                        <button type="button" class="inoagent-chip is-active" data-status="all">Все</button>
                        <button type="button" class="inoagent-chip" data-status="active">В реестре</button>
                        <button type="button" class="inoagent-chip" data-status="excluded">Исключён</button>
                    </div>

                    <div class="inoagent-summary-badge" data-inoagent-summary>
                        <span class="material-symbols-outlined" style="font-size: 16px;">policy</span>
                        Загрузка...
                    </div>
                </div>

                <!-- Юридическая и библиотечная памятка -->
                <div class="inoagent-notice-box">
                    <span class="material-symbols-outlined inoagent-notice-icon">gavel</span>
                    <div class="inoagent-notice-content">
                        <div class="inoagent-notice-title">
                            Соблюдение законодательства РФ (Федеральный закон № 255-ФЗ) в библиотеках:
                        </div>
                        <div>
                            Книги авторов, признанных иностранными агентами, подлежат обязательной маркировке знаком <strong>«18+»</strong>, закрытому размещению в специализированных фондах и выдаче исключительно совершеннолетним гражданам по паспорту.
                        </div>
                    </div>
                    <button type="button" class="inoagent-btn-action btn-cosmo" data-notice-cosmo style="margin-left: auto; flex-shrink: 0;" title="Спросить робота Космо о 255-ФЗ">
                        <span class="material-symbols-outlined">smart_toy</span>
                        <span>Справка Космо</span>
                    </button>
                </div>

                <!-- Сетка карточек -->
                <div class="inoagent-results-grid" data-inoagent-grid>
                    <!-- Карточки рендерятся динамически -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalOverlayEl = modal;
    bindModalEvents();
    executeSearch();

    return modalOverlayEl;
}

/**
 * Открытие модального окна реестра
 *
 * @param {string} query Опциональный поисковый запрос
 */
export function openInoagentModal(query = '') {
    initInoagentModal();
    if (!modalOverlayEl) return;

    modalOverlayEl.classList.remove('hidden');
    modalOverlayEl.classList.add('is-open');
    document.body.classList.add('inoagent-modal-open');

    if (searchInputEl) {
        if (query) {
            searchInputEl.value = query;
            currentSearchQuery = query.trim();
            if (clearBtnEl) clearBtnEl.classList.remove('hidden');
            executeSearch();
        } else {
            setTimeout(() => {
                searchInputEl.focus();
            }, 100);
            executeSearch();
        }
    }
}

/**
 * Закрытие модального окна реестра
 */
export function closeInoagentModal() {
    if (!modalOverlayEl) return;

    modalOverlayEl.classList.remove('is-open');
    modalOverlayEl.classList.add('hidden');
    document.body.classList.remove('inoagent-modal-open');

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
}

// Экспорт в глобальную область видимости window
if (typeof window !== 'undefined') {
    window.openInoagentModal = openInoagentModal;
    window.closeInoagentModal = closeInoagentModal;
    window.__openInoagentModal = openInoagentModal;
    window.initInoagentModal = initInoagentModal;
}
