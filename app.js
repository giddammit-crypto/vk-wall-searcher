// Статистика групп ВК (Разработка Амброзиев О.А.) — Разработка Амброзиев О.А.

document.addEventListener('DOMContentLoaded', () => {

    // Top-Level Scope Utilities & Formatters
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function linkifyText(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1e40af !important; text-decoration: underline !important; font-weight: 600;">${url}</a>`;
        });
    }

    function extractNum(val) {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null && typeof val.count === 'number') return val.count;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    function formatViews(val) {
        const num = extractNum(val);
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + ' млн';
        if (num >= 1000) return (num / 1000).toFixed(1) + ' тыс.';
        return num.toLocaleString('ru-RU');
    }

    function formatHumanDate(dateObj) {
        const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yearStr = dateObj.getFullYear();
        const hoursStr = String(dateObj.getHours()).padStart(2, '0');
        const minStr = String(dateObj.getMinutes()).padStart(2, '0');
        const dayOfWeek = days[dateObj.getDay()];
        return `${dayStr}.${monthStr}.${yearStr} ${hoursStr}:${minStr} (${dayOfWeek})`;
    }

    // State management
    const state = {
        // v3.3: сервисный ключ переехал на сервер (api/config.php), в браузере не хранится
        token: '',
        isScanning: false,
        shouldCancel: false,
        targetInfo: null, // Holds resolved owner object (name, avatar, type, raw id)
        targetsInfo: [],  // Holds list of resolved target owners
        libraryBranches: [], // VK links for library branches
        useBranches: false,  // Toggle to scan all branches
        scannedCount: 0,
        matchedCount: 0,
        totalCount: 0,
        matchedPosts: [],
        months: [
            { id: 1, name: 'Янв' }, { id: 2, name: 'Фев' }, { id: 3, name: 'Мар' }, { id: 4, name: 'Апр' },
            { id: 5, name: 'Май' }, { id: 6, name: 'Июн' }, { id: 7, name: 'Июл' }, { id: 8, name: 'Авг' },
            { id: 9, name: 'Сен' }, { id: 10, name: 'Окт' }, { id: 11, name: 'Ноя' }, { id: 12, name: 'Дек' }
        ],
        selectedMonths: new Set(), // Default none selected
        activeBranchFilter: null, // When filtering visual feed to a specific branch target ID
        activeHashtagFilter: null, // When filtering visual feed to a specific hashtag
        activeChartMetric: 'posts', // 'posts' | 'views' | 'er'
        lastGroupsStats: [], // Cached calculated stats for sorting/exporting
        // New feature state
        sortBy: 'date-desc',       // card sort order
        cardPage: 0,               // infinite scroll page
        cardPageSize: 24,          // cards per page
        andOrMode: 'or',           // 'and' | 'or' for keyword matching
        filteredPosts: [],          // current filtered + sorted posts list
    };

    // DOM Elements
    const elements = {
        tokenInput: document.getElementById('vk-token-input'),
        testTokenBtn: document.getElementById('test-token-btn'),
        tokenStatus: document.getElementById('token-status-indicator'),
        toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        
        searchForm: document.getElementById('search-form'),
        targetInput: document.getElementById('target-input'),
        monthsContainer: document.getElementById('months-container'),
        periodPresetsBar: document.getElementById('period-presets-bar'),
        selectAllMonthsBtn: document.getElementById('select-all-months'),
        clearMonthsBtn: document.getElementById('clear-months'),
        daySelect: document.getElementById('day-select'),
        yearStartInput: document.getElementById('year-start'),
        yearEndInput: document.getElementById('year-end'),
        keywordInput: document.getElementById('keyword-input'),
        submitSearchBtn: document.getElementById('submit-search-btn'),
        
        progressSection: document.getElementById('progress-section'),
        progressIcon: document.getElementById('progress-icon'),
        progressTitle: document.getElementById('progress-title'),
        progressBarFill: document.getElementById('progress-bar-fill'),
        cancelScanBtn: document.getElementById('cancel-scan-btn'),
        statScanned: document.getElementById('stat-scanned'),
        statMatched: document.getElementById('stat-matched'),
        statSpeed: document.getElementById('stat-speed'),
        progressStatusMsg: document.getElementById('progress-status-msg'),
        
        resultsSection: document.getElementById('results-section'),
        sourcesShowcaseSection: document.getElementById('sources-showcase-section'),
        sourcesShowcaseGrid: document.getElementById('sources-showcase-grid'),
        showcaseCountAll: document.getElementById('showcase-count-all'),
        showcaseCountWithPosts: document.getElementById('showcase-count-with-posts'),
        showcaseSortSelect: document.getElementById('showcase-sort-select'),
        activeBranchBanner: document.getElementById('active-branch-banner'),
        activeBranchName: document.getElementById('active-branch-name'),
        activeBranchCount: document.getElementById('active-branch-count'),
        resetBranchFilterBtn: document.getElementById('reset-branch-filter-btn'),

        countVisual: document.getElementById('count-visual'),
        countReport: document.getElementById('count-report'),
        countAnalytics: document.getElementById('count-analytics'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        postsGrid: document.getElementById('posts-grid'),
        
        // Analytics Elements
        kpiNormCount: document.getElementById('kpi-norm-count'),
        kpiTotalBranches: document.getElementById('kpi-total-branches'),
        kpiWarningCount: document.getElementById('kpi-warning-count'),
        kpiDangerCount: document.getElementById('kpi-danger-count'),
        kpiAvgEr: document.getElementById('kpi-avg-er'),
        kpiAvgReactions: document.getElementById('kpi-avg-reactions'),
        chartMetricSelector: document.getElementById('chart-metric-selector'),
        analyticsChartContainer: document.getElementById('analytics-chart-container'),
        analyticsRatingTable: document.getElementById('analytics-rating-table'),
        analyticsRatingTbody: document.getElementById('analytics-rating-tbody'),
        exportRatingCsvBtn: document.getElementById('export-rating-csv-btn'),

        // Summary Memo & Hashtags Elements
        methodistMemoTextarea: document.getElementById('methodist-memo-textarea'),
        copyMemoBtn: document.getElementById('copy-memo-btn'),
        copyMemoText: document.getElementById('copy-memo-text'),
        hashtagCloudContainer: document.getElementById('hashtag-cloud-container'),
        hashtagsTbody: document.getElementById('hashtags-tbody'),
        hashtagsTotalCount: document.getElementById('hashtags-total-count'),
        linksTbody: document.getElementById('links-tbody'),
        linksTotalCount: document.getElementById('links-total-count'),

        reportDocument: document.getElementById('report-document'),
        reportSourceName: document.getElementById('report-source-name'),
        reportDatesFilter: document.getElementById('report-dates-filter'),
        reportSearchQuery: document.getElementById('report-search-query'),
        reportGenerationTime: document.getElementById('report-generation-time'),
        reportTotalMatches: document.getElementById('report-total-matches'),
        
        toggleAllReportBtn: document.getElementById('toggle-all-report-btn'),
        copyReportBtn: document.getElementById('copy-report-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        downloadJsonBtn: document.getElementById('download-json-btn'),
        downloadDocBtn: document.getElementById('download-doc-btn'),
        downloadHtmlBtn: document.getElementById('download-html-btn'),
        printReportBtn: document.getElementById('print-report-btn'),
        quickDocBtn: document.getElementById('quick-doc-btn'),
        quickPrintBtn: document.getElementById('quick-print-btn'),
        completionModal: document.getElementById('completion-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalStatScanned: document.getElementById('modal-stat-scanned'),
        modalStatMatched: document.getElementById('modal-stat-matched'),
        branchesToggle: document.getElementById('branches-toggle'),
        branchesCountBadge: document.getElementById('branches-count-badge'),
        branchSelect: document.getElementById('branch-select'),
        // Advanced search
        excludeInput: document.getElementById('exclude-input'),
        hashtagInput: document.getElementById('hashtag-input'),
        onlyPhotosCheck: document.getElementById('only-photos-check'),
        andOrToggle: document.getElementById('and-or-toggle'),
        // Toolbar
        cardsSortSelect: document.getElementById('cards-sort-select'),
        downloadPhotosBtn: document.getElementById('download-photos-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        shareLinkBtn: document.getElementById('share-link-btn'),
        scrollSentinel: document.getElementById('scroll-sentinel'),
        // Search history
        searchHistoryBar: document.getElementById('search-history-bar'),
        shList: document.getElementById('sh-list'),
        shClearBtn: document.getElementById('sh-clear-btn'),
    };

    // Russian numeral declension helper
    function declOfNum(n, titles) {
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[(n % 10 < 5) ? n % 10 : 5]];
    }

    // Canonical Catalog for the 18 Library Branches of Vladimir (МБУК «ЦГБ», https://biblioteka33.ru/?p=19379)
    const CANONICAL_BRANCHES = [
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
            avatar: 'https://sun1-17.userapi.com/s/v1/ig2/Wa7npoXWh4sKPc9yz-At5VUMbLVxUiaRN_LTBo9Q3Z3sxuDC-T6bV1dCX3nTR_YEH-BhUVjxhm3vfjQCcWV3iPbT.jpg?quality=95&crop=0,0,752,752&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720&ava=1&cs=100x100',
            canonicalMembers: 3863,
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
            avatar: 'https://sun1-28.userapi.com/s/v1/ig1/Z2YCVelB8OSJAmOh5_i2X5q1jX1gl5sMK0Bph0mwFQajCKMxZ9C0e4fBcy5aND0IoZeXpART.jpg?quality=96&crop=309,222,1378,1378&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1080x1080,1280x1280&ava=1&cs=100x100',
            canonicalMembers: 3195,
            sortOrder: 2
        },
        {
            canonicalName: 'Библиотека — филиал №1',
            shortCode: 'Ф-1',
            branchNum: 'Ф-1',
            address: 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
            phone: '8(4922) 33-86-23',
            vkLink: 'https://vk.com/club145883298',
            screenName: 'club145883298',
            rawId: -145883298,
            branch_url: 'https://biblioteka33.ru/?p=5612',
            gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
            avatar: 'https://sun9-49.userapi.com/s/v1/ig1/2SLh-4qBdFu9wqyevWWWTmcZ0KgNyydnHuEzVR2vyp7VenpD9NZctfxdFJHV7ffoNiwqq3Up.jpg?quality=96&crop=45,32,362,362&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360&ava=1&cs=100x100',
            canonicalMembers: 183,
            sortOrder: 3
        },
        {
            canonicalName: 'Библиотека — филиал №2',
            shortCode: 'Ф-2',
            branchNum: 'Ф-2',
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
            address: 'г. Владимир, ул. Егорова, д. 10',
            phone: '8(4922) 21-96-11; 21-23-48',
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
            address: 'г. Владимир, ул. Юбилейная, д. 38',
            phone: '8(4922) 21-22-75',
            vkLink: 'https://vk.com/dobrolit',
            screenName: 'dobrolit',
            rawId: -184449519,
            branch_url: 'https://biblioteka33.ru/?p=189',
            gradient: 'linear-gradient(135deg, #4d7c0f 0%, #84cc16 100%)',
            avatar: 'https://sun1-28.userapi.com/s/v1/ig1/aWqSGyJ1JMV9pp2ax3rz9Ix3hwa7HuZR5b1D6kPsT4z78gE7RTTKDttmLTn4hJ1_dBGRt9sZ.jpg?quality=96&crop=0,0,200,200&as=32x32,48x48,72x72,108x108,160x160&ava=1&cs=100x100',
            canonicalMembers: 596,
            sortOrder: 11
        },
        {
            canonicalName: 'Библиотека — филиал №10',
            shortCode: 'Ф-10',
            branchNum: 'Ф-10',
            address: 'г. Владимир, ул. Диктора Левитана, 55',
            phone: '—',
            vkLink: '',
            screenName: '',
            branch_url: 'https://biblioteka33.ru/?p=195',
            gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            avatar: '',
            canonicalMembers: 0,
            sortOrder: 12
        },
        {
            canonicalName: 'Библиотека — филиал №11',
            shortCode: 'Ф-11',
            branchNum: 'Ф-11',
            address: 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
            phone: '8(4922) 45-57-17',
            vkLink: 'https://vk.com/club193785811',
            screenName: 'club193785811',
            rawId: -193785811,
            branch_url: 'https://biblioteka33.ru/?p=30098',
            gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
            avatar: 'https://sun9-80.userapi.com/s/v1/ig1/4Yv2AqGkBFWrd63ydM1oRsR3q-58Iux_y5N1EZO8W-URk8UYh19Y6fTF8UAbKmA8W2OpLEn2.jpg?quality=96&crop=55,29,674,674&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&ava=1&cs=100x100',
            canonicalMembers: 3068,
            sortOrder: 13
        },
        {
            canonicalName: 'Библиотека — филиал №12',
            shortCode: 'Ф-12',
            branchNum: 'Ф-12',
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

    function isDogAvatarUrl(url) {
        if (!url || typeof url !== 'string') return true;
        const u = url.trim().toLowerCase();
        if (!u) return true;
        if (u.includes('vk.com/images/')) return true;
        return u.includes('camera_') ||
            u.includes('camera.') ||
            u.includes('community_') ||
            u.includes('community.') ||
            u.includes('deactivated') ||
            u.includes('placeholder') ||
            u.includes('no_photo') ||
            u.includes('question_');
    }

    function formatBranchBadge(branchNum) {
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

    function findCanonicalBranch(target) {
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

    function enrichTargetWithCanonical(target) {
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

    // Smart Avatar and Monogram HTML Renderer
    function renderBranchAvatarHtml(targetInfo, size = 'md', extraClass = '', showBadge = true) {
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

    // Global cache for resolved VK authors (communities & profiles)
    const CACHE_STORAGE_KEY = 'vkws_author_cache_v1';
    const authorCache = new Map();

    (function initAuthorCache() {
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
        } catch (e) {}
    })();

    function persistAuthorCache() {
        try {
            if (typeof localStorage !== 'undefined') {
                const entries = Array.from(authorCache.entries()).slice(-400);
                localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
            }
        } catch (e) {}
    }

    function cacheAuthor(id, data) {
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

    function getAuthorFromCache(id) {
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

    async function resolveMissingAuthors(posts, token = '') {
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
                    const container = el.closest('.post-repost-box, .report-repost-meta, .pm-repost-box');
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

    // Video & Repost Helpers
    function bestVideoThumb(video) {
        if (!video) return null;
        if (Array.isArray(video.image) && video.image.length > 0) {
            const sorted = [...video.image].sort((a, b) => (b.width || 0) - (a.width || 0));
            if (sorted[0]?.url) return sorted[0].url;
        }
        if (Array.isArray(video.first_frame) && video.first_frame.length > 0) {
            const sorted = [...video.first_frame].sort((a, b) => (b.width || 0) - (a.width || 0));
            if (sorted[0]?.url) return sorted[0].url;
        }
        for (const k of ['photo_1280', 'photo_800', 'photo_640', 'photo_320', 'photo_130']) {
            if (video[k]) return video[k];
        }
        return null;
    }

    function extractVideoUrls(video) {
        if (!video) return { pageUrl: '', playerUrl: '' };
        const oid = video.owner_id;
        const vid = video.id;
        const accessKey = video.access_key ? `&access_key=${encodeURIComponent(video.access_key)}` : '';
        const hash = video.access_key ? `&hash=${encodeURIComponent(video.access_key)}` : '';
        const pageUrl = `https://vk.com/video${oid}_${vid}`;
        let playerUrl = video.player || '';
        if (!playerUrl && oid && vid) {
            playerUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${vid}${hash}`;
        }
        return { pageUrl, playerUrl };
    }

    function formatVideoDuration(sec) {
        if (!sec || isNaN(sec)) return '';
        const s = Math.floor(sec);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const remM = m % 60;
        const remS = s % 60;
        const pad = n => String(n).padStart(2, '0');
        if (h > 0) return `${h}:${pad(remM)}:${pad(remS)}`;
        return `${remM}:${pad(remS)}`;
    }

    function resolveRepostAuthor(repost) {
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

        // 3. Fallback
        const isGroup = Number(ownerId) < 0;
        const defaultName = isGroup ? 'Сообщество ВКонтакте' : 'Пользователь ВКонтакте';
        const authorUrl = ownerId ? (isGroup ? `https://vk.com/club${Math.abs(Number(ownerId))}` : `https://vk.com/id${ownerId}`) : (postUrl || 'https://vk.com');

        return {
            name: defaultName,
            avatar: '',
            url: authorUrl,
            postUrl: postUrl || authorUrl,
            isBranch: false,
            rawOwnerId: ownerId
        };
    }

    // Initialize inputs
    initFormInputs();
    updateTokenUI();
    loadLibraryBranches();

    // Load cached library branches (16 branches)
    async function loadLibraryBranches() {
        try {
            const res = await fetch('branches_cache.json');
            if (!res.ok) throw new Error('Failed to load branches cache');
            const data = await res.json();
            
            const branchesMap = new Map();
            data.forEach(item => {
                const name = (item.branch_name || '').replace(/\u00a0/g, ' ').trim();
                if (item.vk_links && item.vk_links.length > 0) {
                    item.vk_links.forEach(link => {
                        const cleanLink = link.trim().replace(/\/$/, '');
                        if (!branchesMap.has(cleanLink)) {
                            branchesMap.set(cleanLink, {
                                name: name,
                                link: cleanLink,
                                url: item.branch_url || ''
                            });
                        }
                    });
                }
            });
            
            // Enrich each branch with canonical metadata and sort by canonical sortOrder (1..16)
            branchesMap.forEach(branch => enrichTargetWithCanonical(branch));
            const branchesList = Array.from(branchesMap.values()).sort((a, b) => {
                return (a.sortOrder || 999) - (b.sortOrder || 999);
            });

            state.libraryBranches = branchesList.map(b => b.link);
            state.libraryBranchesList = branchesList;

            // Populate branchSelect dropdown
            if (elements.branchSelect) {
                elements.branchSelect.innerHTML = `
                    <option value="">— Выберите филиал библиотеки (или введите ниже ссылку вручную) —</option>
                    <option value="all">⚡ Все 16 филиалов одновременно (пакетный поиск)</option>
                `;

                const optGroup = document.createElement('optgroup');
                optGroup.label = 'Филиалы библиотек г. Владимира (16 источников)';

                branchesList.forEach((branch, idx) => {
                    const opt = document.createElement('option');
                    opt.value = branch.link;
                    const displayName = branch.canonicalName || branch.name;
                    const addressInfo = branch.address ? ` (${branch.address})` : '';
                    opt.textContent = `${displayName}${addressInfo}`;
                    optGroup.appendChild(opt);
                });

                elements.branchSelect.appendChild(optGroup);
            }

            if (state.libraryBranches.length > 0) {
                elements.branchesCountBadge.textContent = `${state.libraryBranches.length} филиалов`;
                elements.branchesCountBadge.style.display = 'inline-block';
            }
        } catch (err) {
            console.error('Error loading library branches:', err);
            if (CANONICAL_BRANCHES && CANONICAL_BRANCHES.length > 0) {
                const fallbackList = CANONICAL_BRANCHES.filter(b => b.vkLink || b.screenName).map(b => ({
                    name: b.canonicalName,
                    canonicalName: b.canonicalName,
                    shortCode: b.shortCode,
                    rawId: b.rawId,
                    link: b.vkLink || ('https://vk.com/' + b.screenName),
                    address: b.address
                }));
                state.libraryBranchesList = fallbackList;
                state.libraryBranches = fallbackList.map(b => b.link);

                if (elements.branchSelect) {
                    elements.branchSelect.innerHTML = `
                        <option value="">— Выберите филиал библиотеки (или введите ниже ссылку вручную) —</option>
                        <option value="all">⚡ Все 16 филиалов одновременно (пакетный поиск)</option>
                    `;
                    const optGroup = document.createElement('optgroup');
                    optGroup.label = 'Филиалы библиотек г. Владимира (16 источников)';
                    fallbackList.forEach((branch) => {
                        const opt = document.createElement('option');
                        opt.value = branch.link;
                        const displayName = branch.canonicalName || branch.name;
                        const addressInfo = branch.address ? ` (${branch.address})` : '';
                        opt.textContent = `${displayName}${addressInfo}`;
                        optGroup.appendChild(opt);
                    });
                    elements.branchSelect.appendChild(optGroup);
                }

                if (state.libraryBranches.length > 0) {
                    elements.branchesCountBadge.textContent = `${state.libraryBranches.length} филиалов`;
                    elements.branchesCountBadge.style.display = 'inline-block';
                }
            } else {
                elements.branchesCountBadge.textContent = 'ошибка загрузки';
                elements.branchesCountBadge.style.display = 'inline-block';
            }
        }
    }

    // Branch select dropdown handler
    if (elements.branchSelect) {
        elements.branchSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'all') {
                state.useBranches = true;
                elements.branchesToggle.checked = true;
                elements.targetInput.disabled = true;
                elements.targetInput.required = false;
                elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
                elements.targetInput.style.opacity = '0.6';
            } else if (val) {
                state.useBranches = false;
                elements.branchesToggle.checked = false;
                elements.targetInput.disabled = false;
                elements.targetInput.required = true;
                elements.targetInput.value = val;
                elements.targetInput.style.opacity = '1';
                elements.targetInput.focus();
            } else {
                state.useBranches = false;
                elements.branchesToggle.checked = false;
                elements.targetInput.disabled = false;
                elements.targetInput.required = true;
                elements.targetInput.value = '';
                elements.targetInput.style.opacity = '1';
            }
        });
    }

    // Branches toggle handler
    elements.branchesToggle.addEventListener('change', (e) => {
        const checked = e.target.checked;
        state.useBranches = checked;
        
        if (checked) {
            if (elements.branchSelect) elements.branchSelect.value = 'all';
            elements.targetInput.disabled = true;
            elements.targetInput.required = false;
            elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
            elements.targetInput.style.opacity = '0.6';
        } else {
            if (elements.branchSelect && elements.branchSelect.value === 'all') {
                elements.branchSelect.value = '';
            }
            elements.targetInput.disabled = false;
            elements.targetInput.required = true;
            elements.targetInput.value = '';
            elements.targetInput.style.opacity = '1';
        }
    });

    // If user manually edits targetInput, keep branchSelect in sync if it matches a known library
    elements.targetInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (elements.branchSelect && elements.branchSelect.value !== 'all') {
            const matching = state.libraryBranchesList && state.libraryBranchesList.find(b => {
                const l = b.link.toLowerCase();
                const short = l.replace('https://vk.com/', '');
                return l === val || short === val;
            });
            if (matching) {
                elements.branchSelect.value = matching.link;
            } else {
                elements.branchSelect.value = '';
            }
        }
    });

    // Event Listeners
    const SETTINGS_AUTH_PASSWORD = '1Radio14881!';
    const SETTINGS_AUTH_STORAGE_KEY = 'aurora_settings_unlocked_v1';

    function isSettingsUnlocked() {
        try {
            return localStorage.getItem(SETTINGS_AUTH_STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    let pendingSettingsAction = null;

    function openSettingsWithAuth(actionCallback) {
        if (isSettingsUnlocked()) {
            if (typeof actionCallback === 'function') actionCallback();
            return;
        }
        pendingSettingsAction = actionCallback;
        const authOverlay = document.getElementById('settings-auth-overlay');
        const authInput = document.getElementById('settings-auth-input');
        const authError = document.getElementById('settings-auth-error');
        if (authOverlay) {
            authOverlay.classList.remove('hidden');
            if (authError) authError.classList.add('hidden');
            if (authInput) {
                authInput.value = '';
                setTimeout(() => authInput.focus(), 80);
            }
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSettingsAuth() {
        const authOverlay = document.getElementById('settings-auth-overlay');
        if (authOverlay) {
            authOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
        pendingSettingsAction = null;
    }

    const authClose = document.getElementById('settings-auth-close');
    const authCancel = document.getElementById('settings-auth-cancel');
    const authOverlay = document.getElementById('settings-auth-overlay');
    const authForm = document.getElementById('settings-auth-form');
    const authInput = document.getElementById('settings-auth-input');
    const authError = document.getElementById('settings-auth-error');

    if (authClose) authClose.addEventListener('click', closeSettingsAuth);
    if (authCancel) authCancel.addEventListener('click', closeSettingsAuth);
    if (authOverlay) {
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) closeSettingsAuth();
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = authInput ? authInput.value.trim() : '';
            if (val === SETTINGS_AUTH_PASSWORD) {
                try {
                    localStorage.setItem(SETTINGS_AUTH_STORAGE_KEY, 'true');
                } catch (err) {}
                if (authError) authError.classList.add('hidden');
                closeSettingsAuth();
                showToast('Доступ к настройкам предоставлен', 'lock_open');
                if (typeof pendingSettingsAction === 'function') {
                    const cb = pendingSettingsAction;
                    pendingSettingsAction = null;
                    cb();
                }
            } else {
                if (authError) authError.classList.remove('hidden');
                if (authInput) {
                    authInput.select();
                    authInput.focus();
                }
                showToast('Неверный пароль', 'error');
            }
        });
    }

    // Forced Update Modal (?update / ?force_update / action=update)
    const fuOverlay = document.getElementById('force-update-overlay');
    const fuClose = document.getElementById('force-update-close');
    const fuCancel = document.getElementById('force-update-cancel');
    const fuForm = document.getElementById('force-update-form');
    const fuInput = document.getElementById('force-update-input');
    const fuStatus = document.getElementById('force-update-status');
    const fuSubmit = document.getElementById('force-update-submit');
    const fuBtnText = document.getElementById('force-update-btn-text');

    function openForceUpdateModal() {
        if (!fuOverlay) return;
        fuOverlay.classList.remove('hidden');
        if (fuStatus) {
            fuStatus.className = 'hidden';
            fuStatus.innerHTML = '';
        }
        if (fuInput) {
            fuInput.value = '';
            setTimeout(() => fuInput?.focus(), 120);
        }
        if (fuSubmit) fuSubmit.disabled = false;
        if (fuBtnText) fuBtnText.textContent = 'Скачать и установить';
        document.body.style.overflow = 'hidden';
    }

    function closeForceUpdateModal() {
        if (!fuOverlay) return;
        fuOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.has('update') || url.searchParams.has('force_update') || url.searchParams.get('action') === 'update') {
                url.searchParams.delete('update');
                url.searchParams.delete('force_update');
                if (url.searchParams.get('action') === 'update') url.searchParams.delete('action');
                const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash === '#update' ? '' : url.hash);
                window.history.replaceState(null, '', cleanUrl);
            }
        } catch (e) {}
    }

    function showForceUpdateStatus(msg, type = 'info') {
        if (!fuStatus) return;
        fuStatus.className = `force-update-status-box ${type}`;
        fuStatus.innerHTML = `<span>${msg}</span>`;
    }

    if (fuClose) fuClose.addEventListener('click', closeForceUpdateModal);
    if (fuCancel) fuCancel.addEventListener('click', closeForceUpdateModal);
    if (fuOverlay) {
        fuOverlay.addEventListener('click', (e) => {
            if (e.target === fuOverlay) closeForceUpdateModal();
        });
    }

    if (fuForm) {
        fuForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = fuInput ? fuInput.value.trim() : '';
            if (!pwd) {
                showForceUpdateStatus('Введите пароль администратора', 'error');
                fuInput?.focus();
                return;
            }
            if (pwd !== SETTINGS_AUTH_PASSWORD) {
                showForceUpdateStatus('Неверный пароль администратора. Попробуйте ещё раз.', 'error');
                fuInput?.select();
                fuInput?.focus();
                return;
            }
            if (fuSubmit) fuSubmit.disabled = true;
            if (fuBtnText) fuBtnText.textContent = 'Обновление...';
            showForceUpdateStatus('🔄 Подключение к GitHub и скачивание актуального релиза…', 'info');

            try {
                const res = await fetch('api/updater.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', token: pwd, force: 1 })
                });
                const data = res ? await res.json() : null;
                if (!res || !res.ok || !data || !data.ok) {
                    throw new Error(data && data.error ? data.error : `HTTP ${res ? res.status : '—'}`);
                }
                showForceUpdateStatus(`✅ Свежее обновление успешно установлено! Перезагрузка страницы…`, 'success');
                try {
                    localStorage.setItem(SETTINGS_AUTH_STORAGE_KEY, 'true');
                } catch (err) {}
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('update');
                    url.searchParams.delete('force_update');
                    if (url.searchParams.get('action') === 'update') url.searchParams.delete('action');
                    window.history.replaceState(null, '', url.pathname);
                } catch (err) {}
                setTimeout(() => {
                    window.location.href = window.location.pathname + '?v=' + Date.now();
                }, 1800);
            } catch (err) {
                showForceUpdateStatus(`❌ Ошибка обновления: ${err.message || String(err)}`, 'error');
                if (fuSubmit) fuSubmit.disabled = false;
                if (fuBtnText) fuBtnText.textContent = 'Повторить попытку';
            }
        });
    }

    function checkUrlForForceUpdate() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('update') || params.has('force_update') || params.get('action') === 'update' || window.location.hash === '#update') {
                setTimeout(() => openForceUpdateModal(), 150);
            }
        } catch (e) {}
    }
    checkUrlForForceUpdate();

    if (elements.toggleSettingsBtn) elements.toggleSettingsBtn.addEventListener('click', () => openSettingsWithAuth(toggleSettings));
    if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', toggleSettings);
    
    elements.testTokenBtn.addEventListener('click', async () => {
        const token = elements.tokenInput.value.trim();
        if (!token) {
            showTokenStatus('Токен не введен', 'error');
            return;
        }
        elements.testTokenBtn.disabled = true;
        elements.testTokenBtn.textContent = 'Проверка...';
        const isValid = await verifyToken(token);
        elements.testTokenBtn.disabled = false;
        elements.testTokenBtn.textContent = 'Проверить';
        
        if (isValid) {
            state.token = token;
            localStorage.setItem('vk_search_token', token);
            showTokenStatus('Токен успешно сохранен и работает', 'success');
            setTimeout(() => elements.settingsPanel.classList.add('collapsed'), 1500);
        } else {
            showTokenStatus('Неверный или просроченный токен', 'error');
        }
    });

    elements.searchForm.addEventListener('submit', handleSearchSubmit);
    elements.cancelScanBtn.addEventListener('click', cancelScan);
    
    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.tabContents.forEach(c => c.classList.remove('active-content'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active-content');
        });
    });

    // Report actions
    if (elements.toggleAllReportBtn) {
        elements.toggleAllReportBtn.addEventListener('click', () => {
            const sections = document.querySelectorAll('.report-group-section');
            const allExpanded = Array.from(sections).every(s => s.classList.contains('expanded'));
            sections.forEach(s => {
                if (allExpanded) {
                    s.classList.remove('expanded');
                } else {
                    s.classList.add('expanded');
                }
            });
            elements.toggleAllReportBtn.innerHTML = allExpanded ? 
                `<span class="icon">📂</span> Развернуть все` : 
                `<span class="icon">📁</span> Свернуть все`;
        });
    }
    const triggerPrint = () => {
        const reportTabBtn = document.querySelector('.tab-btn[data-tab="report-tab"]');
        if (reportTabBtn && !reportTabBtn.classList.contains('active')) {
            reportTabBtn.click();
        }
        document.querySelectorAll('.report-group-section').forEach(s => s.classList.add('expanded'));
        setTimeout(() => window.print(), 150);
    };

    if (elements.copyReportBtn) elements.copyReportBtn.addEventListener('click', copyReportToClipboard);
    if (elements.downloadCsvBtn) elements.downloadCsvBtn.addEventListener('click', downloadCSV);
    if (elements.downloadJsonBtn) elements.downloadJsonBtn.addEventListener('click', downloadJSON);
    if (elements.downloadDocBtn) elements.downloadDocBtn.addEventListener('click', downloadDOC);
    if (elements.quickDocBtn) elements.quickDocBtn.addEventListener('click', downloadDOC);
    if (elements.downloadHtmlBtn) elements.downloadHtmlBtn.addEventListener('click', downloadHTML);
    if (elements.printReportBtn) elements.printReportBtn.addEventListener('click', triggerPrint);
    if (elements.quickPrintBtn) elements.quickPrintBtn.addEventListener('click', triggerPrint);
    elements.modalCloseBtn.addEventListener('click', () => {
        elements.completionModal.classList.add('hidden');
    });

    // Sources Showcase Event Listeners
    if (elements.resetBranchFilterBtn) {
        elements.resetBranchFilterBtn.addEventListener('click', () => {
            state.activeBranchFilter = null;
            state.activeHashtagFilter = null;
            updateFilteredVisualFeed();
        });
    }

    if (elements.showcaseSortSelect) {
        elements.showcaseSortSelect.addEventListener('change', (e) => {
            if (elements.sourcesShowcaseSection) {
                elements.sourcesShowcaseSection._activeSort = e.target.value;
                if (elements.sourcesShowcaseSection._buildShowcaseCards) {
                    elements.sourcesShowcaseSection._buildShowcaseCards();
                }
            }
        });
    }

    document.querySelectorAll('.showcase-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.showcase-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (elements.sourcesShowcaseSection) {
                elements.sourcesShowcaseSection._activeFilter = btn.dataset.filter;
                if (elements.sourcesShowcaseSection._buildShowcaseCards) {
                    elements.sourcesShowcaseSection._buildShowcaseCards();
                }
            }
        });
    });

    // Chart metric segmented control
    if (elements.chartMetricSelector) {
        elements.chartMetricSelector.querySelectorAll('.segment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.chartMetricSelector.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeChartMetric = btn.getAttribute('data-metric');
                if (state.lastGroupsStats && state.lastGroupsStats.length > 0) {
                    renderActivityChart(state.lastGroupsStats);
                }
            });
        });
    }

    // Export rating table to CSV
    if (elements.exportRatingCsvBtn) {
        elements.exportRatingCsvBtn.addEventListener('click', exportRatingCsv);
    }

    // Copy Methodist Memo Text
    if (elements.copyMemoBtn) {
        elements.copyMemoBtn.addEventListener('click', async () => {
            if (!elements.methodistMemoTextarea || !elements.methodistMemoTextarea.value) return;
            try {
                await navigator.clipboard.writeText(elements.methodistMemoTextarea.value);
                const originalText = elements.copyMemoText ? elements.copyMemoText.textContent : 'Скопировать';
                if (elements.copyMemoText) elements.copyMemoText.textContent = '✓ Скопировано в буфер!';
                setTimeout(() => {
                    if (elements.copyMemoText) elements.copyMemoText.textContent = originalText;
                }, 3000);
            } catch (err) {
                elements.methodistMemoTextarea.select();
                document.execCommand('copy');
                alert('Текст пояснительной записки скопирован в буфер обмена!');
            }
        });
    }

    // Helper functions for settings
    function toggleSettings() {
        elements.settingsPanel.classList.toggle('collapsed');
    }

    function showTokenStatus(message, className) {
        elements.tokenStatus.textContent = message;
        elements.tokenStatus.className = 'status-indicator ' + className;
    }

    function updateTokenUI() {
        if (state.token) {
            elements.tokenInput.value = state.token;
            showTokenStatus('Токен сохранен', 'success');
        } else {
            elements.tokenStatus.textContent = 'Токен не установлен. Пожалуйста, откройте Настройки и введите токен.';
            elements.tokenStatus.className = 'status-indicator error';
            elements.settingsPanel.classList.remove('collapsed'); // Open settings by default if token is missing
        }
    }

    function resolveApiUrl(relPath) {
        if (typeof window === 'undefined' || !window.location || !window.location.href) {
            return 'api/vk-proxy.php';
        }
        try {
            const cleanHref = window.location.href.split('?')[0].split('#')[0];
            const dirHref = cleanHref.substring(0, cleanHref.lastIndexOf('/') + 1);
            return new URL(relPath, dirHref).href;
        } catch (e) {
            return relPath;
        }
    }

    // Endpoint for VK Proxy (relative path with auto-fallback)
    let currentProxyUrl = resolveApiUrl('api/vk-proxy.php');

    async function sendProxyRequest(payload) {
        const candidateUrls = [
            currentProxyUrl,
            resolveApiUrl('api/vk-proxy.php'),
            'api/vk-proxy.php',
            resolveApiUrl('api/vk-proxy'),
            '/api/vk-proxy.php'
        ];
        const urlsToTry = Array.from(new Set(candidateUrls.filter(Boolean)));

        for (let i = 0; i < urlsToTry.length; i++) {
            const targetUrl = urlsToTry[i];
            try {
                const resp = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (resp && resp.status !== 404 && resp.status !== 405 && resp.status !== 502) {
                    currentProxyUrl = targetUrl;
                    return resp;
                }
            } catch (e) {}
        }
        return null;
    }

    // Call VK Proxy backend API
    async function callVkApi(method, params = {}) {
        if (!state.token) {
            throw new Error('Токен доступа VK API не настроен.');
        }
        try {
            const response = await sendProxyRequest({
                method: method,
                params: params,
                token: state.token
            });
            if (!response || !response.ok) {
                let errText = 'Не удалось связаться с сервером';
                if (response) {
                    try {
                        const errorData = await response.json();
                        errText = errorData.detail || errorData.error_msg || (errorData.error && errorData.error.error_msg) || errText;
                    } catch(e) {
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
                // Rate limit exceeded – give user a helpful message
                if (code === 6 || code === 29) {
                    throw new Error(`Превышен лимит запросов VK API. Подождите несколько секунд и попробуйте снова.`);
                }
                // Access denied
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

    async function verifyToken(token) {
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

    // Fast Period Presets Handler
    function applyPeriodPreset(key) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-indexed

        let targetMonths = [];
        let targetStartYear = currentYear;
        let targetEndYear = currentYear;

        switch (key) {
            case 'current-month':
                targetMonths = [currentMonth];
                break;
            case 'prev-month':
                if (currentMonth === 1) {
                    targetMonths = [12];
                    targetStartYear = currentYear - 1;
                    targetEndYear = currentYear - 1;
                } else {
                    targetMonths = [currentMonth - 1];
                }
                break;
            case 'q1':
                targetMonths = [1, 2, 3];
                break;
            case 'q2':
                targetMonths = [4, 5, 6];
                break;
            case 'q3':
                targetMonths = [7, 8, 9];
                break;
            case 'q4':
                targetMonths = [10, 11, 12];
                break;
            case 'h1':
                targetMonths = [1, 2, 3, 4, 5, 6];
                break;
            case 'h2':
                targetMonths = [7, 8, 9, 10, 11, 12];
                break;
            case 'year':
                targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                break;
            default:
                targetMonths = [];
        }

        state.selectedMonths = new Set(targetMonths);
        if (elements.yearStartInput) elements.yearStartInput.value = targetStartYear;
        if (elements.yearEndInput) elements.yearEndInput.value = targetEndYear;

        // Update UI month badges
        document.querySelectorAll('.month-badge').forEach(badge => {
            const id = parseInt(badge.dataset.id, 10);
            if (state.selectedMonths.has(id)) {
                badge.classList.add('selected');
            } else {
                badge.classList.remove('selected');
            }
        });

        // Update preset pills active state
        document.querySelectorAll('.preset-pill').forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-preset') === key);
        });
    }

    // Populate months badges and days select dropdown
    function initFormInputs() {
        // Fast Period Presets Toolbar
        document.querySelectorAll('.preset-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const presetKey = pill.getAttribute('data-preset');
                applyPeriodPreset(presetKey);
            });
        });

        // Months grid
        state.months.forEach(m => {
            const badge = document.createElement('div');
            badge.className = state.selectedMonths.has(m.id) ? 'month-badge selected' : 'month-badge';
            badge.textContent = m.name;
            badge.dataset.id = m.id;
            
            badge.addEventListener('click', () => {
                if (state.selectedMonths.has(m.id)) {
                    state.selectedMonths.delete(m.id);
                    badge.classList.remove('selected');
                } else {
                    state.selectedMonths.add(m.id);
                    badge.classList.add('selected');
                }
                // Clear active preset pill state on manual override
                document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
            });
            elements.monthsContainer.appendChild(badge);
        });

        elements.selectAllMonthsBtn.addEventListener('click', () => {
            state.selectedMonths = new Set(state.months.map(m => m.id));
            document.querySelectorAll('.month-badge').forEach(b => b.classList.add('selected'));
            document.querySelectorAll('.preset-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-preset') === 'year');
            });
        });

        elements.clearMonthsBtn.addEventListener('click', () => {
            state.selectedMonths.clear();
            document.querySelectorAll('.month-badge').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
        });

        // Days dropdown
        for (let i = 1; i <= 31; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            elements.daySelect.appendChild(opt);
        }

        // Years default range
        const currentYear = new Date().getFullYear();
        elements.yearStartInput.value = 2010;
        elements.yearEndInput.value = currentYear;
    }

    // Extract screen name/ID from string or URL
    function parseTargetInput(val) {
        if (!val) return null;
        val = val.trim();
        if (!val) return null;

        // Strip query parameters and anchors
        val = val.split('?')[0].split('#')[0];

        // Remove trailing slashes
        while (val.endsWith('/')) {
            val = val.slice(0, -1);
        }

        // Check if URL
        try {
            if (val.startsWith('http://') || val.startsWith('https://')) {
                const url = new URL(val);
                val = url.pathname.substring(1); // e.g. "durov" or "public123"
            }
        } catch (e) {
            // Not a valid URL, treat as name
        }

        if (val.includes('vk.com/')) {
            val = val.split('vk.com/')[1];
        }

        // Take only first segment if path has slashes e.g. "public123/all"
        if (val.includes('/')) {
            val = val.split('/')[0];
        }

        return val.trim() || null;
    }

    // Resolve screen name into ID, Name, Avatar
    async function resolveTarget(targetName) {
        // Direct ID checks (e.g. Pure integer like "1234" or "-1234")
        const numericRegex = /^-?\d+$/;
        if (numericRegex.test(targetName)) {
            const rawId = parseInt(targetName, 10);
            if (rawId < 0) {
                return await fetchGroupInfo(-rawId);
            } else {
                return await fetchUserInfo(rawId);
            }
        }

        // Check for specific prefixes id/club/public/event
        const clubRegex = /^(club|public|event)(\d+)$/;
        const userRegex = /^id(\d+)$/;
        
        let match;
        if ((match = clubRegex.exec(targetName))) {
            return await fetchGroupInfo(parseInt(match[2], 10));
        } else if ((match = userRegex.exec(targetName))) {
            return await fetchUserInfo(parseInt(match[1], 10));
        }

        // Otherwise resolve screen name via API
        const res = await callVkApi('utils.resolveScreenName', { screen_name: targetName });
        
        if (!res) {
            throw new Error(`Имя или ID "${targetName}" не найдено в ВКонтакте.`);
        }

        if (res.type === 'group') {
            return await fetchGroupInfo(res.object_id);
        } else if (res.type === 'user') {
            return await fetchUserInfo(res.object_id);
        } else {
            throw new Error(`Неподдерживаемый тип объекта ВКонтакте: ${res.type}`);
        }
    }

    async function fetchGroupInfo(groupId) {
        const res = await callVkApi('groups.getById', { group_id: Math.abs(groupId), fields: 'photo_100,screen_name' });
        // VK API 5.131+ returns {groups: [...], profiles: [...]}; older returns array
        let groupList;
        if (Array.isArray(res)) {
            groupList = res;
        } else if (res && Array.isArray(res.groups)) {
            groupList = res.groups;
        } else {
            groupList = [];
        }
        if (!groupList || groupList.length === 0) {
            throw new Error(`Сообщество с ID ${groupId} не найдено.`);
        }
        const g = groupList[0];
        const groupObj = {
            id: -Math.abs(g.id), // Group ID is always negative for VK wall API
            name: g.name,
            avatar: g.photo_100 || g.photo_50 || '',
            link: `https://vk.com/${g.screen_name || ('club' + g.id)}`,
            type: 'group'
        };
        return enrichTargetWithCanonical(groupObj);
    }

    async function fetchUserInfo(userId) {
        const res = await callVkApi('users.get', { user_ids: userId, fields: 'photo_100,screen_name' });
        const userList = Array.isArray(res) ? res : (res && res.users ? res.users : []);
        if (!userList || userList.length === 0) {
            throw new Error(`Пользователь с ID ${userId} не найден.`);
        }
        const u = userList[0];
        const isDeleted = u.first_name === 'DELETED' || u.deactivated === 'deleted' || u.deactivated === 'banned';
        const userObj = {
            id: u.id, // User ID is positive
            name: isDeleted ? '' : `${u.first_name} ${u.last_name}`.trim(),
            avatar: isDeleted ? '' : (u.photo_100 || ''),
            link: `https://vk.com/${u.screen_name || ('id' + u.id)}`,
            type: 'user',
            deactivated: u.deactivated || (isDeleted ? 'deleted' : null)
        };
        return enrichTargetWithCanonical(userObj);
    }

        // Handle Form Submit and Search Execution
    async function handleSearchSubmit(e) {
        e.preventDefault();
        if (state.isScanning) return;
        
        if (!state.token) {
            alert('Пожалуйста, укажите VK access_token в настройках!');
            elements.settingsPanel.classList.remove('collapsed');
            return;
        }

        let targetsRaw = [];
        if (state.useBranches) {
            if (!state.libraryBranches || state.libraryBranches.length === 0) {
                alert('Список филиалов библиотек пуст!');
                return;
            }
            targetsRaw = state.libraryBranches;
        } else {
            const rawTarget = elements.targetInput.value;
            if (!rawTarget.trim()) {
                alert('Введите корректную ссылку или имя страницы!');
                return;
            }
            targetsRaw = rawTarget.split(',').map(t => t.trim()).filter(t => t.length > 0);
            if (targetsRaw.length === 0) {
                alert('Введите корректную ссылку или имя страницы!');
                return;
            }
        }

        if (state.selectedMonths.size === 0) {
            alert('Выберите хотя бы один месяц для поиска!');
            return;
        }

        // Get filter values
        const dayFilter = elements.daySelect.value; // "all" or number
        const yearStart = parseInt(elements.yearStartInput.value, 10) || 2006;
        const yearEnd = parseInt(elements.yearEndInput.value, 10) || new Date().getFullYear();

        if (yearStart > yearEnd) {
            alert('Начальный год не может быть больше конечного года!');
            return;
        }

        // Read advanced search params
        const keyword = elements.keywordInput.value.trim().toLowerCase();
        const excludeRaw = elements.excludeInput ? elements.excludeInput.value.trim().toLowerCase() : '';
        const hashtagRaw = elements.hashtagInput ? elements.hashtagInput.value.trim().toLowerCase().replace(/^#/, '') : '';
        const onlyPhotos = elements.onlyPhotosCheck ? elements.onlyPhotosCheck.checked : false;
        const andOrMode = state.andOrMode || 'or';

        // Parse multi-keyword lists
        const keywords = keyword ? keyword.split(',').map(s => s.trim()).filter(Boolean) : [];
        const excludeWords = excludeRaw ? excludeRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Save search to history
        saveSearchHistory({
            label: elements.targetInput.value.trim().slice(0, 40) + (keyword ? ` · ${keyword.slice(0, 20)}` : ''),
            target: elements.targetInput.value.trim(),
            keyword: elements.keywordInput.value.trim(),
            exclude: elements.excludeInput ? elements.excludeInput.value.trim() : '',
            hashtag: elements.hashtagInput ? elements.hashtagInput.value.trim() : '',
        });

        // Reset progress counters
        state.isScanning = true;
        state.shouldCancel = false;
        state.scannedCount = 0;
        state.matchedCount = 0;
        state.totalCount = 0;
        state.matchedPosts = [];
        state.seenPostKeys = new Set();
        state.targetsInfo = [];

        // UI toggles
        elements.submitSearchBtn.disabled = true;
        elements.submitSearchBtn.innerHTML = `<span class="icon spin">🔄</span> Сканирование...`;
        elements.progressSection.classList.remove('hidden');
        elements.resultsSection.classList.add('hidden');
        if (elements.progressIcon) {
            elements.progressIcon.classList.add('rotating-icon');
            elements.progressIcon.textContent = 'sync';
        }
        if (elements.cancelScanBtn) {
            elements.cancelScanBtn.textContent = 'Остановить';
            elements.cancelScanBtn.disabled = false;
        }
        
        updateProgressUI(0);

        try {
            // 1. Resolve all target profiles/groups first to ensure validity
            elements.progressTitle.textContent = `Разрешение имен страниц...`;
            elements.progressStatusMsg.textContent = `Поиск групп и пользователей в VK (${targetsRaw.length})...`;
            
            const resolvedTargets = [];
            const resolveErrors = [];

            if (state.useBranches) {
                // Мгновенный резолв филиалов из pre-cached branches_cache.json / CANONICAL_BRANCHES без 32 запросов к API
                elements.progressStatusMsg.textContent = `Мгновенный резолв филиалов из локального кэша (CANONICAL_BRANCHES)...`;
                const sourceBranches = (Array.isArray(state.libraryBranchesList) && state.libraryBranchesList.length > 0)
                    ? state.libraryBranchesList
                    : (Array.isArray(CANONICAL_BRANCHES) && CANONICAL_BRANCHES.length > 0 ? CANONICAL_BRANCHES : []);

                for (let b of sourceBranches) {
                    const canon = findCanonicalBranch(b) || b;
                    if (canon && canon.rawId) {
                        resolvedTargets.push({
                            id: canon.rawId,
                            name: canon.canonicalName || canon.name || canon.shortCode || `Филиал ${canon.rawId}`,
                            canonicalName: canon.canonicalName || canon.name || canon.shortCode || '',
                            avatar: canon.avatar || '',
                            members_count: typeof canon.canonicalMembers === 'number' ? canon.canonicalMembers : null,
                            link: canon.vkLink || b.link || (canon.screenName ? `https://vk.com/${canon.screenName}` : ''),
                            screen_name: canon.screenName || '',
                            type: canon.rawId < 0 ? 'group' : 'user',
                            shortCode: canon.shortCode || '',
                            branchNum: canon.branchNum || '',
                            address: canon.address || '',
                            phone: canon.phone || '',
                            gradient: canon.gradient || '',
                            sortOrder: canon.sortOrder || 999,
                            branch_url: canon.branch_url || ''
                        });
                    }
                }
            } else {
                for (let t of targetsRaw) {
                    const targetClean = parseTargetInput(t);
                    if (!targetClean) {
                        resolveErrors.push(`"${t}" — не удалось извлечь имя или ID из адреса`);
                        continue;
                    }
                    try {
                        elements.progressStatusMsg.textContent = `Разрешение адреса: ${targetClean}...`;
                        const info = await resolveTarget(targetClean);
                        resolvedTargets.push(info);
                    } catch(err) {
                        console.warn(`Пропуск недоступного адреса "${t}":`, err.message);
                        resolveErrors.push(`"${targetClean}" — ${err.message}`);
                    }
                }
            }

            if (resolvedTargets.length === 0) {
                const details = resolveErrors.length > 0
                    ? '\n\nПричины:\n' + resolveErrors.slice(0, 5).join('\n')
                    : '';
                throw new Error('Не удалось разрешить ни один из указанных адресов.' + details);
            }
            // Canonical sort of targets before scanning
            resolvedTargets.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
            state.targetsInfo = resolvedTargets;
            
            // Set first target as the general targetInfo for backward compatibility
            state.targetInfo = resolvedTargets[0];

            // 2. Fetch Wall Posts: параллельный опрос стен батчами по 2-3 филиала
            const BATCH_SIZE = 3;
            const targetProgressMap = new Map();
            let completedTargetsCount = 0;
            const activeTargetNames = new Set();
            const totalStartTime = Date.now();

            function updateBatchProgressUI() {
                let progressSum = 0;
                targetProgressMap.forEach(p => progressSum += p);
                const percent = Math.min(99, Math.round((progressSum / resolvedTargets.length) * 100));

                const secondsElapsed = (Date.now() - totalStartTime) / 1000;
                const speed = secondsElapsed > 0 ? Math.round(state.scannedCount / secondsElapsed) : 0;
                if (elements.statSpeed) {
                    elements.statSpeed.textContent = `${speed}/сек`;
                }

                const activeList = Array.from(activeTargetNames).slice(0, 3).join(', ');
                if (elements.progressTitle) {
                    elements.progressTitle.textContent = `Параллельное сканирование (${completedTargetsCount}/${resolvedTargets.length} завершено): ${activeList || 'филиалы...'}`;
                }
                if (elements.progressStatusMsg && !state.shouldCancel) {
                    elements.progressStatusMsg.textContent = `Опрос стен батчами (${Math.min(BATCH_SIZE, activeTargetNames.size || 1)} параллельно). Найдено совпадений: ${state.matchedCount}`;
                }

                updateProgressUI(percent);
            }

            async function scanTargetWall(targetInfo) {
                let offset = 0;
                const count = 100;
                let finished = false;
                let wallTotalCount = 0;
                let wallScannedCount = 0;

                while (!finished && !state.shouldCancel) {
                    let res;
                    try {
                        res = await callVkApi('wall.get', {
                            owner_id: targetInfo.id,
                            offset: offset,
                            count: count,
                            extended: 1
                        });
                    } catch(wallErr) {
                        console.warn(`Стена недоступна для ${targetInfo.name}:`, wallErr.message);
                        finished = true;
                        break;
                    }

                    if (state.shouldCancel) break;

                    if (!res || !res.items || res.items.length === 0) {
                        finished = true;
                        break;
                    }

                    // Populate author cache from extended response (for reposts)
                    if (res.groups && Array.isArray(res.groups)) {
                        res.groups.forEach(g => {
                            cacheAuthor(-Math.abs(g.id), g);
                        });
                    }
                    if (res.profiles && Array.isArray(res.profiles)) {
                        res.profiles.forEach(u => {
                            cacheAuthor(u.id, u);
                        });
                    }

                    if (offset === 0) {
                        wallTotalCount = res.count || res.items.length;
                        state.totalCount += wallTotalCount;
                    }

                    const posts = res.items;
                    resolveMissingAuthors(posts, state.token).catch(() => {});

                    for (let post of posts) {
                        if (state.shouldCancel) break;

                        const postDate = new Date(post.date * 1000);
                        const year = postDate.getFullYear();
                        const month = postDate.getMonth() + 1; // 1-12
                        const day = postDate.getDate();

                        if (!post.is_pinned && year < yearStart) {
                            finished = true;
                            break;
                        }

                        // Guarantee pinned posts outside target period never leak into results
                        if (post.is_pinned && year < yearStart) {
                            continue;
                        }

                        state.scannedCount++;
                        wallScannedCount++;

                        const inYearRange = year >= yearStart && year <= yearEnd;
                        const isTargetMonth = state.selectedMonths.has(month);
                        const isTargetDay = (dayFilter === 'all' || day === parseInt(dayFilter, 10));

                        let textMatches = true;
                        const txt = (post.text || '').toLowerCase();
                        if (keywords.length > 0) {
                            textMatches = andOrMode === 'and'
                                ? keywords.every(kw => txt.includes(kw))
                                : keywords.some(kw => txt.includes(kw));
                        }
                        if (textMatches && excludeWords.length > 0) {
                            textMatches = !excludeWords.some(ex => txt.includes(ex));
                        }
                        if (textMatches && hashtagRaw) {
                            const re = new RegExp('#' + hashtagRaw + '(?=[^a-zA-Zа-яА-ЯёЁ0-9_]|$)', 'i');
                            textMatches = re.test(post.text || '');
                        }
                        const hasPhoto = (post.attachments || []).some(a => a.type === 'photo');
                        if (onlyPhotos && !hasPhoto) textMatches = false;

                        if (inYearRange && isTargetMonth && isTargetDay && textMatches) {
                            const postKey = `${post.owner_id || targetInfo.id}_${post.id}`;
                            if (state.seenPostKeys && state.seenPostKeys.has(postKey)) {
                                continue;
                            }
                            if (state.seenPostKeys) {
                                state.seenPostKeys.add(postKey);
                            }

                            state.matchedCount++;
                            post.humanDate = formatHumanDate(postDate);
                            post.targetInfo = targetInfo;
                            state.matchedPosts.push(post);
                        }
                    }

                    const currentBranchProgress = wallTotalCount > 0 ? (wallScannedCount / wallTotalCount) : 0;
                    targetProgressMap.set(targetInfo.id, currentBranchProgress);
                    updateBatchProgressUI();

                    if (posts.length < count || wallScannedCount >= wallTotalCount) {
                        finished = true;
                    }

                    offset += count;
                }

                targetProgressMap.set(targetInfo.id, 1);
                completedTargetsCount++;
                activeTargetNames.delete(targetInfo.canonicalName || targetInfo.name);
                updateBatchProgressUI();
            }

            let nextTargetIndex = 0;
            async function batchWorker() {
                while (nextTargetIndex < resolvedTargets.length && !state.shouldCancel) {
                    const currentIdx = nextTargetIndex++;
                    const targetInfo = resolvedTargets[currentIdx];
                    activeTargetNames.add(targetInfo.canonicalName || targetInfo.name);
                    targetProgressMap.set(targetInfo.id, 0);
                    updateBatchProgressUI();
                    await scanTargetWall(targetInfo);
                }
            }

            const workerCount = Math.min(BATCH_SIZE, resolvedTargets.length);
            const workers = Array.from({ length: workerCount }, () => batchWorker());
            await Promise.all(workers);

            // Finish search execution
            elements.progressStatusMsg.textContent = state.shouldCancel ? 'Сканирование прервано пользователем.' : 'Поиск успешно завершен!';
            renderResults();
            if (!state.shouldCancel) {
                elements.modalStatScanned.textContent = state.scannedCount;
                elements.modalStatMatched.textContent = state.matchedCount;
                elements.completionModal.classList.remove('hidden');
            }

        } catch (error) {
            alert(`Ошибка во время поиска:\n${error.message}`);
            elements.progressStatusMsg.textContent = `Ошибка: ${error.message}`;
            if (elements.progressIcon) {
                elements.progressIcon.classList.remove('rotating-icon');
            }
            if (elements.progressSection) {
                elements.progressSection.classList.add('hidden');
            }
        } finally {
            state.isScanning = false;
            elements.submitSearchBtn.disabled = false;
            elements.submitSearchBtn.innerHTML = `<span class="icon">🚀</span> Начать поиск по записям`;
            if (elements.progressIcon) {
                elements.progressIcon.classList.remove('rotating-icon');
            }
            if (elements.progressSection) {
                elements.progressSection.classList.add('hidden');
            }
            if (elements.cancelScanBtn) {
                elements.cancelScanBtn.textContent = 'Остановить';
                elements.cancelScanBtn.disabled = false;
            }
        }
    }

    function cancelScan() {
        if (state.isScanning) {
            state.shouldCancel = true;
            elements.progressStatusMsg.textContent = 'Остановка сканирования...';
            elements.cancelScanBtn.textContent = 'Останавливаем...';
            elements.cancelScanBtn.disabled = true;
            if (elements.progressIcon) {
                elements.progressIcon.classList.remove('rotating-icon');
            }
        }
    }

    function updateProgressUI(percent) {
        elements.progressBarFill.style.width = `${percent}%`;
        elements.statScanned.textContent = state.scannedCount;
        elements.statMatched.textContent = state.matchedCount;
    }

    // Render Sources Showcase (Creative 3x3 / Responsive Matrix)
    function renderSourcesShowcase(groupsList) {
        if (!elements.sourcesShowcaseSection || !elements.sourcesShowcaseGrid) return;
        
        if (!groupsList || groupsList.length === 0) {
            elements.sourcesShowcaseSection.style.display = 'none';
            return;
        }

        elements.sourcesShowcaseSection.style.display = 'block';

        const totalSources = groupsList.length;
        const withPostsCount = groupsList.filter(g => g.posts.length > 0).length;
        
        if (elements.showcaseCountAll) elements.showcaseCountAll.textContent = totalSources;
        if (elements.showcaseCountWithPosts) elements.showcaseCountWithPosts.textContent = withPostsCount;

        elements.sourcesShowcaseSection._groupsList = groupsList;
        if (!elements.sourcesShowcaseSection._activeFilter) {
            elements.sourcesShowcaseSection._activeFilter = 'all';
        }
        if (!elements.sourcesShowcaseSection._activeSort) {
            elements.sourcesShowcaseSection._activeSort = elements.showcaseSortSelect ? elements.showcaseSortSelect.value : 'canonical';
        }

        function buildShowcaseCards() {
            let list = [...elements.sourcesShowcaseSection._groupsList];

            // Apply filter
            if (elements.sourcesShowcaseSection._activeFilter === 'with-posts') {
                list = list.filter(g => g.posts.length > 0);
            }

            // Apply sort
            const sortMode = elements.sourcesShowcaseSection._activeSort;
            list.sort((a, b) => {
                if (sortMode === 'posts-desc') {
                    return b.posts.length - a.posts.length;
                } else if (sortMode === 'likes-desc') {
                    const likesA = a.posts.reduce((s, p) => s + (p.likes ? p.likes.count : 0), 0);
                    const likesB = b.posts.reduce((s, p) => s + (p.likes ? p.likes.count : 0), 0);
                    return likesB - likesA;
                } else if (sortMode === 'name-asc') {
                    const nameA = a.info.canonicalName || a.info.name;
                    const nameB = b.info.canonicalName || b.info.name;
                    return nameA.localeCompare(nameB, 'ru');
                } else {
                    // canonical sort order (1..16)
                    return (a.info.sortOrder || 999) - (b.info.sortOrder || 999);
                }
            });

            if (list.length === 0) {
                elements.sourcesShowcaseGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">
                        Нет источников по выбранному фильтру.
                    </div>
                `;
                return;
            }

            elements.sourcesShowcaseGrid.innerHTML = list.map(g => {
                const target = g.info;
                const pCount = g.posts.length;
                let likes = 0, reposts = 0, views = 0;
                g.posts.forEach(p => {
                    likes += extractNum(p.likes);
                    reposts += extractNum(p.reposts);
                    views += extractNum(p.views);
                });
                const isSelected = state.activeBranchFilter && postMatchesBranch({ targetInfo: target, owner_id: target.id }, state.activeBranchFilter);
                const displayName = target.canonicalName || target.name;
                const avgV = pCount > 0 ? Math.round(views / pCount) : 0;
                const viewsTitle = `Суммарный охват филиала: ${views.toLocaleString('ru-RU')} просмотров (~${avgV} на пост)`;

                return `
                    <div class="source-showcase-card ${isSelected ? 'selected' : ''} ${pCount === 0 ? 'zero-posts' : 'has-posts'}" data-target-id="${target.id}">
                        <div class="source-card-top">
                            <div class="source-avatar-col">
                                ${renderBranchAvatarHtml(target, 'md')}
                            </div>
                            <div class="source-meta-col">
                                <div class="source-card-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
                                ${target.address ? `<div class="source-card-address"><span class="material-symbols-outlined addr-icon">location_on</span>${escapeHtml(target.address)}</div>` : ''}
                                <div class="source-card-links">
                                    <a href="${target.link}" target="_blank" class="source-vk-pill" onclick="event.stopPropagation();">
                                        <span class="material-symbols-outlined icon">open_in_new</span>
                                        <span>VK</span>
                                    </a>
                                    ${target.branch_url ? `<a href="${target.branch_url}" target="_blank" class="source-web-pill" onclick="event.stopPropagation();" title="Сайт biblioteka33.ru"><span class="material-symbols-outlined icon">language</span></a>` : ''}
                                </div>
                            </div>
                            <div class="source-counter-col">
                                <div class="source-posts-badge ${pCount > 0 ? 'badge-highlight' : 'badge-muted'}">
                                    <span class="badge-num">${pCount}</span>
                                    <span class="badge-text">${declOfNum(pCount, ['запись', 'записи', 'записей'])}</span>
                                </div>
                            </div>
                        </div>
                        <div class="source-card-bottom">
                            <div class="source-stats-row">
                                <span class="source-stat" title="Лайки"><span class="material-symbols-outlined stat-icon text-danger">favorite</span> ${likes}</span>
                                <span class="source-stat" title="Репосты"><span class="material-symbols-outlined stat-icon text-warning">share</span> ${reposts}</span>
                                <span class="source-stat" title="${viewsTitle}"><span class="material-symbols-outlined stat-icon text-info">visibility</span> ${formatViews(views)}${pCount > 0 ? `<span style="font-size:10px;opacity:0.75;margin-left:2px">(~${avgV})</span>` : ''}</span>
                            </div>
                            <button class="source-filter-trigger-btn" type="button" title="Фильтровать ленту по этому источнику">
                                <span>${isSelected ? 'Выбран' : 'Фильтровать'}</span>
                                <span class="material-symbols-outlined">${isSelected ? 'check' : 'arrow_forward'}</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach card click handlers
            elements.sourcesShowcaseGrid.querySelectorAll('.source-showcase-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('a')) return;
                    const targetId = card.dataset.targetId;
                    const targetData = list.find(g => String(g.info.id) === String(targetId) || String(g.info.rawId) === String(targetId));
                    toggleBranchFilter(targetId, targetData?.info);
                });
            });
        }

        elements.sourcesShowcaseSection._buildShowcaseCards = buildShowcaseCards;
        buildShowcaseCards();
    }

    function postMatchesBranch(post, branchFilter) {
        if (!branchFilter) return true;
        if (!post) return false;

        // 1. Resolve canonical branch of branchFilter
        let filterCanon = null;
        if (typeof branchFilter === 'object' && branchFilter !== null) {
            filterCanon = findCanonicalBranch(branchFilter);
        } else {
            filterCanon = findCanonicalBranch({ id: branchFilter, rawId: branchFilter, name: String(branchFilter), link: String(branchFilter) });
        }

        // 2. Resolve canonical branch of post
        const postTarget = post.targetInfo || { id: post.owner_id, rawId: post.owner_id, name: post._targetName };
        const postCanon = findCanonicalBranch(postTarget);

        if (filterCanon && postCanon) {
            return filterCanon.sortOrder === postCanon.sortOrder ||
                   filterCanon.canonicalName === postCanon.canonicalName ||
                   Math.abs(filterCanon.rawId) === Math.abs(postCanon.rawId);
        }

        // 3. Numeric ID matching
        const filterNum = parseInt(branchFilter, 10);
        const filterAbs = !isNaN(filterNum) ? Math.abs(filterNum) : null;
        if (filterAbs !== null) {
            const pOwnerAbs = post.owner_id ? Math.abs(parseInt(post.owner_id, 10)) : null;
            if (pOwnerAbs === filterAbs) return true;
            const pTargetIdAbs = post.targetInfo?.id ? Math.abs(parseInt(post.targetInfo.id, 10)) : null;
            if (pTargetIdAbs === filterAbs) return true;
            const pTargetRawAbs = post.targetInfo?.rawId ? Math.abs(parseInt(post.targetInfo.rawId, 10)) : null;
            if (pTargetRawAbs === filterAbs) return true;
        }

        // 4. Name / Shortcode matching
        const filterStr = String(branchFilter).trim().toLowerCase();
        const pName = (post.targetInfo?.canonicalName || post.targetInfo?.name || post._targetName || '').toLowerCase();
        if (pName && (pName === filterStr || pName.includes(filterStr))) return true;

        const pCode = (post.targetInfo?.shortCode || post.targetInfo?.branchNum || '').toLowerCase();
        if (pCode && pCode === filterStr) return true;

        return false;
    }

    function toggleBranchFilter(targetId, targetObj) {
        state.activeHashtagFilter = null;
        const targetIdentifier = targetId || (targetObj && (targetObj.id || targetObj.rawId || targetObj.canonicalName));
        const isCurrentActive = state.activeBranchFilter && postMatchesBranch({ targetInfo: targetObj || { id: targetId, rawId: targetId }, owner_id: targetId }, state.activeBranchFilter);

        if (isCurrentActive || String(state.activeBranchFilter) === String(targetIdentifier)) {
            state.activeBranchFilter = null;
            showToast('Фильтр по филиалу сброшен', 'info');
        } else {
            state.activeBranchFilter = targetIdentifier;
            const name = targetObj ? (targetObj.canonicalName || targetObj.name) : 'выбранному филиалу';
            showToast(`Показаны записи: ${name}`, 'filter_alt');
            const visualTabBtn = document.querySelector('.tab-btn[data-tab="visual-tab"]');
            if (visualTabBtn) {
                visualTabBtn.click();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        updateFilteredVisualFeed();
        if (elements.sourcesShowcaseSection && elements.sourcesShowcaseSection._buildShowcaseCards) {
            elements.sourcesShowcaseSection._buildShowcaseCards();
        }
    }

    function sortPosts(posts, sortBy) {
        const arr = [...posts];
        switch (sortBy) {
            case 'date-asc':
                arr.sort((a, b) => (a.date || 0) - (b.date || 0));
                break;
            case 'likes-desc':
                arr.sort((a, b) => extractNum(b.likes) - extractNum(a.likes));
                break;
            case 'views-desc':
                arr.sort((a, b) => extractNum(b.views) - extractNum(a.views));
                break;
            case 'comments-desc':
                arr.sort((a, b) => extractNum(b.comments) - extractNum(a.comments));
                break;
            case 'er-desc':
                arr.sort((a, b) => {
                    const er = p => {
                        const v = extractNum(p.views) || 1;
                        return (extractNum(p.likes) + extractNum(p.reposts) + extractNum(p.comments)) / v;
                    };
                    return er(b) - er(a);
                });
                break;
            default: // date-desc
                arr.sort((a, b) => (b.date || 0) - (a.date || 0));
        }
        return arr;
    }

    function updateFilteredVisualFeed() {
        if (!elements.postsGrid) return;

        let filteredPosts = state.matchedPosts;
        if (state.activeBranchFilter !== null) {
            filteredPosts = state.matchedPosts.filter(p => postMatchesBranch(p, state.activeBranchFilter));
            
            const activeTarget = state.targetsInfo ? state.targetsInfo.find(t => String(t.id) === String(state.activeBranchFilter)) : null;
            const targetName = activeTarget ? (activeTarget.canonicalName || activeTarget.name) : 'Филиал';
            
            if (elements.activeBranchBanner) {
                elements.activeBranchBanner.classList.remove('hidden');
                if (elements.activeBranchName) elements.activeBranchName.textContent = targetName;
                if (elements.activeBranchCount) elements.activeBranchCount.textContent = `${filteredPosts.length} ${declOfNum(filteredPosts.length, ['запись', 'записи', 'записей'])}`;
            }
        } else if (state.activeHashtagFilter !== null) {
            const re = new RegExp('#' + state.activeHashtagFilter + '(?=[^a-zA-Zа-яА-ЯёЁ0-9_]|$)', 'i');
            filteredPosts = state.matchedPosts.filter(p => (p.text && re.test(p.text)));
            
            if (elements.activeBranchBanner) {
                elements.activeBranchBanner.classList.remove('hidden');
                if (elements.activeBranchName) elements.activeBranchName.textContent = `#${state.activeHashtagFilter}`;
                if (elements.activeBranchCount) elements.activeBranchCount.textContent = `${filteredPosts.length} ${declOfNum(filteredPosts.length, ['запись', 'записи', 'записей'])}`;
            }
        } else {
            if (elements.activeBranchBanner) {
                elements.activeBranchBanner.classList.add('hidden');
            }
        }

        // Sort
        filteredPosts = sortPosts(filteredPosts, state.sortBy);
        state.filteredPosts = filteredPosts;
        state.cardPage = 0;

        elements.postsGrid.innerHTML = '';
        if (filteredPosts.length === 0) {
            elements.postsGrid.innerHTML = `
                <div class="col-12 card" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    <h3>Записи не найдены</h3>
                    <p>Для выбранного филиала нет публикаций за указанный период.</p>
                </div>
            `;
        } else {
            appendCardPage();
        }

        if (elements.countVisual) elements.countVisual.textContent = filteredPosts.length;

        if (elements.sourcesShowcaseSection && elements.sourcesShowcaseSection._buildShowcaseCards) {
            elements.sourcesShowcaseSection._buildShowcaseCards();
        }
    }

    function appendCardPage() {
        const start = state.cardPage * state.cardPageSize;
        const end   = start + state.cardPageSize;
        const slice = state.filteredPosts.slice(start, end);
        slice.forEach(post => {
            const card = createPostCard(post);
            elements.postsGrid.appendChild(card);
        });
        state.cardPage++;

        // Update sentinel
        if (elements.scrollSentinel) {
            const hasMore = end < state.filteredPosts.length;
            elements.scrollSentinel.innerHTML = hasMore
                ? '<div class="scroll-spinner">Загрузка...</div>'
                : '';
        }
    }

    // Render report for specific posts (reusable)
    function renderReportForPosts(posts, monthId = null) {
        // Group posts by target (including ALL scanned targets so 0-post groups are listed)
        const groupsList = [];
        const groupsMap = {};

        const baseTargets = (state.targetsInfo && state.targetsInfo.length > 0) 
            ? state.targetsInfo 
            : [];

        // Sort base targets canonically first
        const sortedTargets = [...baseTargets].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        sortedTargets.forEach(target => {
            enrichTargetWithCanonical(target);
            const groupObj = {
                info: target,
                posts: []
            };
            groupsMap[target.id] = groupObj;
            groupsList.push(groupObj);
        });

        posts.forEach(post => {
            const tId = post.targetInfo.id;
            enrichTargetWithCanonical(post.targetInfo);
            if (!groupsMap[tId]) {
                const groupObj = {
                    info: post.targetInfo,
                    posts: []
                };
                groupsMap[tId] = groupObj;
                groupsList.push(groupObj);
            }
            groupsMap[tId].posts.push(post);
        });

        // Ensure groupsList is strictly sorted canonically (1..16, Central first)
        groupsList.sort((a, b) => (a.info.sortOrder || 999) - (b.info.sortOrder || 999));

        // Sources Grid inside Official Passport (Clean 2-3 Column Matrix)
        const passportSourcesHtml = `
            <div class="passport-sources-grid">
                ${groupsList.map(g => {
                    const t = g.info;
                    const pCount = g.posts.length;
                    return `
                        <div class="report-source-chip">
                            ${renderBranchAvatarHtml(t, 'sm')}
                            <div class="report-chip-info">
                                <a href="${t.link}" target="_blank" class="report-chip-name">${escapeHtml(t.canonicalName || t.name)}</a>
                                ${t.address ? `<span class="report-chip-sub">${escapeHtml(t.address)}</span>` : ''}
                            </div>
                            <span class="report-chip-count ${pCount > 0 ? 'count-active' : 'count-zero'}">${pCount} ${declOfNum(pCount, ['запись', 'записи', 'записей'])}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        elements.reportSourceName.innerHTML = passportSourcesHtml || 'Неизвестно';
        elements.reportTotalMatches.textContent = posts.length;
        
        let grandTotalLikes = 0;
        let grandTotalReposts = 0;
        let grandTotalViews = 0;
        posts.forEach(post => {
            grandTotalLikes += post.likes ? post.likes.count : 0;
            grandTotalReposts += post.reposts ? post.reposts.count : 0;
            grandTotalViews += post.views ? post.views.count : 0;
        });

        const reportTotalLikesEl = document.getElementById('report-total-likes');
        const reportTotalRepostsEl = document.getElementById('report-total-reposts');
        const reportTotalViewsEl = document.getElementById('report-total-views');

        if (reportTotalLikesEl) reportTotalLikesEl.textContent = grandTotalLikes;
        if (reportTotalRepostsEl) reportTotalRepostsEl.textContent = grandTotalReposts;
        if (reportTotalViewsEl) reportTotalViewsEl.textContent = formatViews(grandTotalViews);
        
        // Month details
        if (monthId) {
            const monthName = state.months.find(m => m.id === monthId).name;
            elements.reportDatesFilter.textContent = `Месяц: ${monthName}, годы: ${elements.yearStartInput.value} - ${elements.yearEndInput.value}`;
        } else {
            const selectedMonthNames = Array.from(state.selectedMonths)
                .sort((a,b) => a-b)
                .map(mId => state.months.find(m => m.id === mId).name)
                .join(', ');
            
            const dayVal = elements.daySelect.value;
            const dayString = dayVal === 'all' ? 'Все числа' : `${dayVal}-е число`;
            const yearsRange = `${elements.yearStartInput.value} - ${elements.yearEndInput.value}`;
            elements.reportDatesFilter.textContent = `${dayString} (${selectedMonthNames || 'Не выбрано'}), годы: ${yearsRange}`;
        }
        
        elements.reportSearchQuery.textContent = elements.keywordInput.value.trim() || 'Без фильтра по тексту';
        elements.reportGenerationTime.textContent = new Date().toLocaleString('ru-RU');

        const reportTablesContainer = document.getElementById('report-tables-container');
        reportTablesContainer.innerHTML = '';

        if (posts.length === 0 && (!state.targetsInfo || state.targetsInfo.length === 0)) {
            reportTablesContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Ничего не найдено по выбранным параметрам.
                </div>
            `;
            return;
        }

        // Build structured data array for sortable Summary Table
        const summaryData = groupsList.map(group => {
            let likes = 0, reposts = 0, views = 0;
            group.posts.forEach(post => {
                likes   += post.likes   ? post.likes.count   : 0;
                reposts += post.reposts ? post.reposts.count : 0;
                views   += post.views   ? post.views.count   : 0;
            });
            return {
                info:    group.info,
                name:    group.info.canonicalName || group.info.name,
                link:    group.info.link,
                posts:   group.posts.length,
                likes,
                reposts,
                views
            };
        });

        // Current sort state stored on the container
        reportTablesContainer._summaryData  = summaryData;
        reportTablesContainer._sortCol      = null;   // 'posts'|'likes'|'reposts'|'views'
        reportTablesContainer._sortDir      = -1;     // default: descending (highest first)

        function buildSummaryRows(data) {
            if (!data.length) return '<tr><td colspan="6" style="text-align:center;color:#5f6368;padding:1rem">Нет данных</td></tr>';
            return data.map(row => `
                <tr>
                    <td style="word-break:break-word">
                        <div class="summary-source-cell">
                            ${renderBranchAvatarHtml(row.info, 'sm')}
                            <div class="summary-source-details">
                                <span class="summary-source-title">${escapeHtml(row.name)}</span>
                                ${row.info.address ? `<span class="summary-source-sub">${escapeHtml(row.info.address)}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="word-break:break-all"><a href="${row.link}" target="_blank" class="report-link">${row.link}</a></td>
                    <td style="text-align:center;font-weight:700" data-val="${row.posts}">${row.posts}</td>
                    <td style="text-align:center" data-val="${row.likes}"><span class="stat-item stat-likes"><span class="material-symbols-outlined" style="font-size:16px;">favorite</span> ${row.likes}</span></td>
                    <td style="text-align:center" data-val="${row.reposts}"><span class="stat-item stat-reposts"><span class="material-symbols-outlined" style="font-size:16px;">share</span> ${row.reposts}</span></td>
                    <td style="text-align:center" data-val="${row.views}"><span class="stat-item stat-views"><span class="material-symbols-outlined" style="font-size:16px;">visibility</span> ${row.views ? formatViews(row.views) : 0}</span></td>
                </tr>`).join('');
        }

        const summaryTableHtml = `
            <div class="report-summary-section" style="margin-bottom: 25px;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 12px; border-left: 4px solid var(--primary); padding-left: 10px;">Сводная статистика по источникам (за выбранный период)</h3>
                <div class="table-responsive">
                    <table class="report-table summary-table" style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="width: 28%; text-align: left;">Библиотека / Источник</th>
                                <th style="width: 24%; text-align: left;">Ссылка ВК</th>
                                <th data-sort="posts"   class="sortable-th" style="width: 12%; text-align: center; cursor: pointer; user-select: none;">Постов <span class="sort-arrow sort-none">⇅</span></th>
                                <th data-sort="likes"   class="sortable-th" style="width: 12%; text-align: center; cursor: pointer; user-select: none;"><span class="material-symbols-outlined" style="font-size:16px;">favorite</span> Лайков <span class="sort-arrow sort-none">⇅</span></th>
                                <th data-sort="reposts" class="sortable-th" style="width: 12%; text-align: center; cursor: pointer; user-select: none;"><span class="material-symbols-outlined" style="font-size:16px;">share</span> Репостов <span class="sort-arrow sort-none">⇅</span></th>
                                <th data-sort="views"   class="sortable-th" style="width: 12%; text-align: center; cursor: pointer; user-select: none;"><span class="material-symbols-outlined" style="font-size:16px;">visibility</span> Просмотров <span class="sort-arrow sort-none">⇅</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${buildSummaryRows(summaryData)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        reportTablesContainer.innerHTML = summaryTableHtml;

        // Attach sort click handlers
        reportTablesContainer.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (reportTablesContainer._sortCol === col) {
                    reportTablesContainer._sortDir *= -1;
                } else {
                    reportTablesContainer._sortCol = col;
                    reportTablesContainer._sortDir = -1; // default: descending (highest first)
                }

                const data   = reportTablesContainer._summaryData;
                const sorted = [...data].sort((a, b) => (a[col] - b[col]) * reportTablesContainer._sortDir);
                const tbody = reportTablesContainer.querySelector('.summary-table tbody');
                if (tbody) {
                    tbody.innerHTML = buildSummaryRows(sorted);
                }

                // Update all header arrows
                reportTablesContainer.querySelectorAll('th[data-sort]').forEach(t => {
                    const span = t.querySelector('.sort-arrow');
                    if (!span) return;
                    if (t.dataset.sort === reportTablesContainer._sortCol) {
                        span.textContent = reportTablesContainer._sortDir === 1 ? '↑' : '↓';
                        span.className   = 'sort-arrow ' + (reportTablesContainer._sortDir === 1 ? 'sort-asc' : 'sort-desc');
                    } else {
                        span.textContent = '⇅';
                        span.className   = 'sort-arrow sort-none';
                    }
                });
            });
        });

        // 2. Append Grouped tables (collapsed by default) in canonical order
        groupsList.forEach(group => {
            const section = document.createElement('div');
            section.className = 'report-group-section'; // Collapsed by default

            const displayName = group.info.canonicalName || group.info.name;
            const addressText = group.info.address ? ` <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${escapeHtml(group.info.address)})</span>` : '';
            const titleHtml = `
                <div class="report-group-title">
                    <span class="material-symbols-outlined group-toggle-arrow">expand_more</span>
                    ${renderBranchAvatarHtml(group.info, 'sm')}
                    <div style="flex:1; min-width:0; display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;">
                        <a href="${group.info.link}" target="_blank" onclick="event.stopPropagation();" style="color: var(--primary) !important; text-decoration: underline !important; font-weight: 700;">${escapeHtml(displayName)}</a>
                        ${addressText}
                    </div>
                    <span class="tab-badge" style="margin-left:auto;">${group.posts.length}</span>
                </div>
            `;

            let rowsHtml = '';
            if (group.posts.length === 0) {
                rowsHtml = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 1.2rem; font-style: italic;">
                            Записи по выбранным параметрам поиска не обнаружены (0 постов).
                        </td>
                    </tr>
                `;
            } else {
                group.posts.forEach((post, index) => {
                    const postLink = `https://vk.com/wall${post.targetInfo.id}_${post.id}`;
                    const likes = post.likes ? post.likes.count : 0;
                    const reposts = post.reposts ? post.reposts.count : 0;
                    const comments = post.comments ? post.comments.count : 0;
                    const views = post.views ? post.views.count : 0;

                    let textCellContent = '[Без текста]';
                    if (post.text && post.text.trim()) {
                        const rawText = post.text.trim();
                        // Split sentences by Russian / English punctuation
                        const sentences = rawText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [rawText];
                        if (sentences.length <= 10 && rawText.length <= 600) {
                            textCellContent = linkifyText(escapeHtml(rawText));
                        } else {
                            const previewText = sentences.slice(0, 10).join('').trim();
                            textCellContent = `
                                <div class="report-post-text-wrap" style="display:flex; flex-direction:column; gap:6px;">
                                    <div class="report-text-preview" style="white-space:pre-wrap; word-break:break-word;">${linkifyText(escapeHtml(previewText))}...</div>
                                    <div class="report-text-full" style="display:none; white-space:pre-wrap; word-break:break-word;">${linkifyText(escapeHtml(rawText))}</div>
                                    <button type="button" class="btn-report-expand-text" onclick="
                                        const wrap = this.closest('.report-post-text-wrap');
                                        const prev = wrap.querySelector('.report-text-preview');
                                        const full = wrap.querySelector('.report-text-full');
                                        const isExp = full.style.display !== 'none';
                                        if (isExp) {
                                            full.style.display = 'none';
                                            prev.style.display = 'block';
                                            this.classList.remove('is-expanded');
                                            this.innerHTML = '<span class=\\'icon\\'>expand_more</span> Развернуть полностью';
                                        } else {
                                            full.style.display = 'block';
                                            prev.style.display = 'none';
                                            this.classList.add('is-expanded');
                                            this.innerHTML = '<span class=\\'icon\\'>expand_less</span> Свернуть';
                                        }
                                    "><span class="icon">expand_more</span> Развернуть полностью</button>
                                </div>
                            `;
                        }
                    }

                    rowsHtml += `
                        <tr>
                            <td class="report-table-date" style="width: 14%; word-break: break-word;">${post.humanDate}</td>
                            <td class="report-table-link" style="width: 24%; word-break: break-all;"><a href="${postLink}" target="_blank" style="color: var(--primary) !important; text-decoration: underline !important; font-weight: 500;">${postLink}</a></td>
                            <td style="width: 50%; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;">${textCellContent}</td>
                            <td class="report-table-stats" style="width: 12%; text-align: center; word-break: break-word;">
                                <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
                                    <span class="stat-item stat-likes"><span class="material-symbols-outlined" style="font-size:14px;">favorite</span> ${likes}</span>
                                    <span class="stat-item stat-reposts"><span class="material-symbols-outlined" style="font-size:14px;">share</span> ${reposts}</span>
                                    ${views ? `<span class="stat-item stat-views"><span class="material-symbols-outlined" style="font-size:14px;">visibility</span> ${formatViews(views)}</span>` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            const tableHtml = `
                <div class="report-group-body">
                    <div class="table-responsive">
                        <table class="report-table" style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="width: 14%;">Дата</th>
                                    <th style="width: 24%;">Ссылка на пост</th>
                                    <th style="width: 50%;">Текст / Выдержка из поста</th>
                                    <th style="width: 12%; text-align: center;">Статистика</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            section.innerHTML = titleHtml + tableHtml;
            
            const titleEl = section.querySelector('.report-group-title');
            titleEl.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'a') return;
                section.classList.toggle('expanded');
            });

            reportTablesContainer.appendChild(section);
        });
    }

    // Render results into Visual tab and Report tab (grouped by target)
    function renderResults() {
        // Reset active branch filter
        state.activeBranchFilter = null;
        if (elements.activeBranchBanner) elements.activeBranchBanner.classList.add('hidden');

        // Update tab numbers
        elements.countVisual.textContent = state.matchedCount;
        elements.countReport.textContent = state.matchedCount;
        
        // Hide progress section and stop spinning animation
        if (elements.progressIcon) {
            elements.progressIcon.classList.remove('rotating-icon');
        }
        if (elements.progressSection) {
            elements.progressSection.classList.add('hidden');
        }

        // Show results section
        elements.resultsSection.classList.remove('hidden');
        
        // Restore cancel button state
        if (elements.cancelScanBtn) {
            elements.cancelScanBtn.textContent = 'Остановить';
            elements.cancelScanBtn.disabled = false;
        }

        // 1. Build canonical groups list for showcase & report
        const groupsList = [];
        const groupsMap = {};
        const baseTargets = (state.targetsInfo && state.targetsInfo.length > 0) ? state.targetsInfo : [];
        const sortedTargets = [...baseTargets].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        sortedTargets.forEach(target => {
            enrichTargetWithCanonical(target);
            const g = { info: target, posts: [] };
            groupsMap[target.id] = g;
            groupsList.push(g);
        });

        state.matchedPosts.forEach(post => {
            enrichTargetWithCanonical(post.targetInfo);
            const tId = post.targetInfo.id;
            if (!groupsMap[tId]) {
                const g = { info: post.targetInfo, posts: [] };
                groupsMap[tId] = g;
                groupsList.push(g);
            }
            groupsMap[tId].posts.push(post);
        });
        groupsList.sort((a, b) => (a.info.sortOrder || 999) - (b.info.sortOrder || 999));

        // 2. Render Sources Showcase (Creative 3x3 / Responsive Matrix)
        renderSourcesShowcase(groupsList);

        // 3. Render Visual Grid
        updateFilteredVisualFeed();

        // 4. Render Report Document (Summary + Grouped Tables)
        renderReportForPosts(state.matchedPosts);

        // 5. Render Methodologist Analytics, Activity Chart & Rating Table
        renderAnalyticsTab(groupsList);

        // 6. Render Explanatory Note & Hashtags / Links Registry
        renderSummaryTab(groupsList, state.matchedPosts);

        // 7. Resolve missing authors for reposts
        resolveMissingAuthors(state.matchedPosts, state.token).catch(() => {});
    }

    // -------------------------------------------------------------
    // Methodologist Analytics: KPI, Activity Chart & Rating Table
    // -------------------------------------------------------------
    function renderAnalyticsTab(groupsList) {
        if (!groupsList || groupsList.length === 0) return;

        // Calculate statistics for each branch
        const stats = groupsList.map(g => {
            const posts = g.posts || [];
            const postsCount = posts.length;
            const likes = posts.reduce((sum, p) => sum + (p.likes ? (p.likes.count || 0) : 0), 0);
            const reposts = posts.reduce((sum, p) => sum + (p.reposts ? (p.reposts.count || 0) : 0), 0);
            const comments = posts.reduce((sum, p) => sum + (p.comments ? (p.comments.count || 0) : 0), 0);
            const views = posts.reduce((sum, p) => sum + (p.views ? (p.views.count || 0) : 0), 0);
            const avgViews = postsCount > 0 ? Math.round(views / postsCount) : 0;
            const reactions = likes + reposts + comments;
            const er = views > 0 ? (reactions / views) * 100 : 0;
            const reactionsPerPost = postsCount > 0 ? (reactions / postsCount) : 0;

            // Plan evaluation: standard norm >= 10 posts, warning 1..9, danger 0
            let status = 'norm';
            let statusText = 'Норма (≥10)';
            if (postsCount === 0) {
                status = 'danger';
                statusText = '0 постов';
            } else if (postsCount < 10) {
                status = 'warning';
                statusText = 'Малоактивный (<10)';
            }

            return {
                info: g.info,
                postsCount,
                likes,
                reposts,
                comments,
                views,
                avgViews,
                reactions,
                reactionsPerPost,
                er,
                status,
                statusText
            };
        });

        state.lastGroupsStats = stats;

        // KPI calculations
        const totalBranches = stats.length;
        const normCount = stats.filter(s => s.status === 'norm').length;
        const warningCount = stats.filter(s => s.status === 'warning').length;
        const dangerCount = stats.filter(s => s.status === 'danger').length;
        const totalPosts = stats.reduce((sum, s) => sum + s.postsCount, 0);
        const totalViews = stats.reduce((sum, s) => sum + s.views, 0);
        const totalReactions = stats.reduce((sum, s) => sum + s.reactions, 0);

        const systemAvgEr = totalViews > 0 ? ((totalReactions / totalViews) * 100).toFixed(2) + '%' : '0.00%';
        const avgReactionsPerPost = totalPosts > 0 ? (totalReactions / totalPosts).toFixed(1) : '0.0';

        if (elements.countAnalytics) elements.countAnalytics.textContent = totalBranches;
        if (elements.kpiNormCount) elements.kpiNormCount.textContent = normCount;
        if (elements.kpiTotalBranches) elements.kpiTotalBranches.textContent = `/ ${totalBranches} ${declOfNum(totalBranches, ['филиала', 'филиалов', 'филиалов'])}`;
        if (elements.kpiWarningCount) elements.kpiWarningCount.textContent = warningCount;
        if (elements.kpiDangerCount) elements.kpiDangerCount.textContent = dangerCount;
        if (elements.kpiAvgEr) elements.kpiAvgEr.textContent = systemAvgEr;
        if (elements.kpiAvgReactions) elements.kpiAvgReactions.textContent = `${avgReactionsPerPost} реакций/пост`;

        // Render Activity Bar Chart
        renderActivityChart(stats);

        // Render Comparative Rating Table
        renderActivityTable(stats);
    }

    function renderActivityChart(stats) {
        if (!elements.analyticsChartContainer) return;
        const metric = state.activeChartMetric || 'posts';

        // Sort copy based on active metric
        const sorted = [...stats].sort((a, b) => {
            if (metric === 'views') {
                return b.views - a.views || b.postsCount - a.postsCount;
            } else if (metric === 'er') {
                return b.er - a.er || b.views - a.views;
            } else {
                return b.postsCount - a.postsCount || b.views - a.views;
            }
        });

        // Determine max value for width scaling
        let maxVal = 1;
        if (metric === 'views') {
            maxVal = Math.max(1, ...sorted.map(s => s.views));
        } else if (metric === 'er') {
            maxVal = Math.max(0.1, ...sorted.map(s => s.er));
        } else {
            maxVal = Math.max(1, ...sorted.map(s => s.postsCount));
        }

        elements.analyticsChartContainer.innerHTML = '';

        sorted.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'chart-row';

            let curVal = 0;
            let displayVal = '';
            let barClass = 'bar-posts';

            if (metric === 'views') {
                curVal = item.views;
                displayVal = `${curVal.toLocaleString('ru-RU')} просм.`;
                barClass = 'bar-views';
            } else if (metric === 'er') {
                curVal = item.er;
                displayVal = `${curVal.toFixed(2)}% ER`;
                barClass = 'bar-er';
            } else {
                curVal = item.postsCount;
                displayVal = `${curVal} ${declOfNum(curVal, ['пост', 'поста', 'постов'])}`;
                barClass = 'bar-posts';
            }

            const pct = curVal > 0 ? Math.max(3, Math.min(100, Math.round((curVal / maxVal) * 100))) : 0;
            const displayName = item.info.canonicalName || item.info.name;
            const avatarHtml = renderBranchAvatarHtml(item.info, 'sm');

            let badgeHtml = '';
            if (item.status === 'norm') {
                badgeHtml = `<span class="badge-status-norm"><span class="material-symbols-outlined" style="font-size:13px;">check_circle</span> Норма (≥10)</span>`;
            } else if (item.status === 'warning') {
                badgeHtml = `<span class="badge-status-warning"><span class="material-symbols-outlined" style="font-size:13px;">warning</span> Мало (<10)</span>`;
            } else {
                badgeHtml = `<span class="badge-status-danger"><span class="material-symbols-outlined" style="font-size:13px;">cancel</span> 0 постов</span>`;
            }

            row.innerHTML = `
                <div class="chart-rank">#${index + 1}</div>
                <div class="chart-avatar-wrap">${avatarHtml}</div>
                <div class="chart-branch-name" title="${displayName}">${displayName}</div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill ${barClass}" style="width: 0%;" data-target-width="${pct}%"></div>
                </div>
                <div class="chart-val">${displayVal}</div>
                <div class="chart-status-col">${badgeHtml}</div>
            `;
            elements.analyticsChartContainer.appendChild(row);
        });

        // Trigger staggered CSS spring animation across all 18 branch bars
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!elements.analyticsChartContainer) return;
                const fills = elements.analyticsChartContainer.querySelectorAll('.chart-bar-fill');
                fills.forEach((fill, i) => {
                    fill.style.setProperty('--bar-index', i);
                    fill.style.width = fill.dataset.targetWidth || '0%';
                });
            });
        });
    }

    function renderActivityTable(stats) {
        if (!elements.analyticsRatingTbody) return;

        // Default sort: posts desc, views desc
        const sorted = [...stats].sort((a, b) => b.postsCount - a.postsCount || b.views - a.views);

        elements.analyticsRatingTbody.innerHTML = '';

        sorted.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = `row-${item.status}`;

            const displayName = item.info.canonicalName || item.info.name;
            const address = item.info.address ? `<div class="summary-source-sub">${item.info.address}</div>` : '';
            const avatarHtml = renderBranchAvatarHtml(item.info, 'sm');

            let badgeHtml = '';
            if (item.status === 'norm') {
                badgeHtml = `<span class="badge-status-norm"><span class="material-symbols-outlined" style="font-size:13px;">check_circle</span> Норма (≥10)</span>`;
            } else if (item.status === 'warning') {
                badgeHtml = `<span class="badge-status-warning" title="Рекомендуется напомнить заведующему о плане"><span class="material-symbols-outlined" style="font-size:13px;">warning</span> Малоактивный (<10)</span>`;
            } else {
                badgeHtml = `<span class="badge-status-danger" title="0 публикаций за период"><span class="material-symbols-outlined" style="font-size:13px;">cancel</span> 0 публикаций</span>`;
            }

            const erText = item.views > 0 ? `${item.er.toFixed(2)}%` : (item.postsCount > 0 ? '—' : '0.00%');
            const avgV = item.avgViews || (item.postsCount > 0 ? Math.round(item.views / item.postsCount) : 0);

            tr.innerHTML = `
                <td style="text-align: center; font-weight: 700; color: var(--text-tertiary);">${index + 1}</td>
                <td>
                    <div class="summary-source-cell">
                        ${avatarHtml}
                        <div class="summary-source-details">
                            <span class="summary-source-title">${displayName}</span>
                            ${address}
                        </div>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 700;">${item.postsCount}</td>
                <td style="text-align: right;" title="Суммарный охват: ${item.views.toLocaleString('ru-RU')} (в среднем ~${avgV} на пост)">
                    <div>${item.views.toLocaleString('ru-RU')}</div>
                    <div style="font-size: 11px; opacity: 0.75; font-weight: 400;">~${avgV}/пост</div>
                </td>
                <td style="text-align: right;">${item.likes.toLocaleString('ru-RU')}</td>
                <td style="text-align: right;">${item.reposts.toLocaleString('ru-RU')}</td>
                <td style="text-align: right;">${item.comments.toLocaleString('ru-RU')}</td>
                <td style="text-align: right;">${item.reactionsPerPost.toFixed(1)}</td>
                <td style="text-align: right; font-weight: 700; color: var(--primary);">${erText}</td>
                <td style="text-align: center;">${badgeHtml}</td>
            `;

            elements.analyticsRatingTbody.appendChild(tr);
        });
    }

    function exportRatingCsv() {
        if (!state.lastGroupsStats || state.lastGroupsStats.length === 0) {
            alert('Нет данных для экспорта рейтинга.');
            return;
        }

        const sorted = [...state.lastGroupsStats].sort((a, b) => b.postsCount - a.postsCount || b.views - a.views);

        const rows = [
            ['№', 'Филиал', 'Код', 'Адрес', 'Постов', 'Просмотры', 'Лайки', 'Репосты', 'Комментарии', 'Реакций на пост', 'ER (%)', 'Статус нормы']
        ];

        sorted.forEach((item, idx) => {
            rows.push([
                idx + 1,
                item.info.canonicalName || item.info.name,
                item.info.shortCode || item.info.branchNum || '',
                item.info.address || '',
                item.postsCount,
                item.views,
                item.likes,
                item.reposts,
                item.comments,
                item.reactionsPerPost.toFixed(1),
                item.views > 0 ? item.er.toFixed(2) + '%' : '0.00%',
                item.statusText
            ]);
        });

        const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Рейтинг_активности_филиалов_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // -------------------------------------------------------------
    // Methodist Explanatory Note, Hashtags & External Links
    // -------------------------------------------------------------
    function renderSummaryTab(groupsList, matchedPosts) {
        // 1. Hashtag Analysis
        const hashtagMap = {};
        const hashtagPostsMap = {};

        matchedPosts.forEach(p => {
            if (!p.text) return;
            const matches = p.text.match(/(?:^|\s)#([a-zA-Zа-яА-ЯёЁ0-9_]{2,})/g);
            if (matches) {
                const uniqueInPost = new Set();
                matches.forEach(m => {
                    const tag = m.trim().replace(/^#/, '').toLowerCase();
                    if (!uniqueInPost.has(tag)) {
                        uniqueInPost.add(tag);
                        hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
                        if (!hashtagPostsMap[tag]) hashtagPostsMap[tag] = [];
                        hashtagPostsMap[tag].push(p.id);
                    }
                });
            }
        });

        const sortedTags = Object.keys(hashtagMap).map(tag => ({
            tag: tag,
            count: hashtagMap[tag],
            share: matchedPosts.length > 0 ? ((hashtagMap[tag] / matchedPosts.length) * 100).toFixed(1) : '0'
        })).sort((a, b) => b.count - a.count);

        if (elements.hashtagsTotalCount) {
            elements.hashtagsTotalCount.textContent = `${sortedTags.length} уникальных тегов`;
        }

        // Render Hashtag Cloud
        if (elements.hashtagCloudContainer) {
            elements.hashtagCloudContainer.innerHTML = '';
            if (sortedTags.length === 0) {
                elements.hashtagCloudContainer.innerHTML = '<span style="color: var(--text-tertiary); font-size: 0.85rem;">Хэштеги в найденных записях не обнаружены</span>';
            } else {
                sortedTags.slice(0, 40).forEach(item => {
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'hashtag-pill';
                    pill.innerHTML = `<span>#${item.tag}</span><span class="tag-count">${item.count}</span>`;
                    pill.addEventListener('click', () => {
                        // Switch to visual feed and filter by hashtag
                        state.activeBranchFilter = null;
                        state.activeHashtagFilter = item.tag;
                        
                        // Switch tab to visual-tab
                        elements.tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'visual-tab'));
                        elements.tabContents.forEach(c => c.classList.toggle('active-content', c.id === 'visual-tab'));

                        updateFilteredVisualFeed();
                    });
                    elements.hashtagCloudContainer.appendChild(pill);
                });
            }
        }

        // Render Hashtags Table
        if (elements.hashtagsTbody) {
            elements.hashtagsTbody.innerHTML = '';
            sortedTags.slice(0, 25).forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align: center; color: var(--text-tertiary); font-weight: 700;">${index + 1}</td>
                    <td style="font-weight: 600; color: #1d4ed8;">#${item.tag}</td>
                    <td style="text-align: right; font-weight: 700;">${item.count}</td>
                    <td style="text-align: right;">${item.share}%</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn btn-tonal btn-sm tag-filter-action" data-tag="${item.tag}">
                            <span class="material-symbols-outlined" style="font-size: 14px;">filter_alt</span>
                            <span>Показать</span>
                        </button>
                    </td>
                `;
                tr.querySelector('.tag-filter-action').addEventListener('click', () => {
                    state.activeBranchFilter = null;
                    state.activeHashtagFilter = item.tag;
                    elements.tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'visual-tab'));
                    elements.tabContents.forEach(c => c.classList.toggle('active-content', c.id === 'visual-tab'));
                    updateFilteredVisualFeed();
                });
                elements.hashtagsTbody.appendChild(tr);
            });
        }

        // 2. External Links Registry
        const linksMap = {};
        matchedPosts.forEach(p => {
            const urlsInPost = new Set();
            
            // From text
            if (p.text) {
                const urlMatches = p.text.match(/https?:\/\/[^\s<>"')]+/g);
                if (urlMatches) {
                    urlMatches.forEach(url => {
                        let cleanUrl = url.replace(/[.,;:!?)]+$/, '');
                        urlsInPost.add(cleanUrl);
                    });
                }
            }

            // From attachments
            if (p.attachments && Array.isArray(p.attachments)) {
                p.attachments.forEach(att => {
                    if (att.type === 'link' && att.link && att.link.url) {
                        let cleanUrl = att.link.url.replace(/[.,;:!?)]+$/, '');
                        urlsInPost.add(cleanUrl);
                    }
                });
            }

            urlsInPost.forEach(url => {
                linksMap[url] = (linksMap[url] || 0) + 1;
            });
        });

        const sortedLinks = Object.keys(linksMap).map(url => {
            let domain = '';
            try {
                const parsed = new URL(url);
                domain = parsed.hostname.replace(/^www\./, '');
            } catch (e) {
                domain = 'Ссылка';
            }

            let badgeTitle = domain;
            if (domain.includes('culture.ru') || domain.includes('культура.рф')) badgeTitle = 'Портал Культура.РФ';
            else if (domain.includes('biblioteka33.ru')) badgeTitle = 'Сайт biblioteka33.ru';
            else if (domain.includes('forms.yandex') || domain.includes('forms.gle')) badgeTitle = 'Опросы / Анкетирование';
            else if (domain.includes('timepad.ru')) badgeTitle = 'Регистрация / TimePad';
            else if (domain.includes('vk.cc')) badgeTitle = 'Короткая ссылка VK';

            return {
                url,
                domain: badgeTitle,
                count: linksMap[url]
            };
        }).sort((a, b) => b.count - a.count);

        if (elements.linksTotalCount) {
            elements.linksTotalCount.textContent = `${sortedLinks.length} уникальных ссылок`;
        }

        if (elements.linksTbody) {
            elements.linksTbody.innerHTML = '';
            if (sortedLinks.length === 0) {
                elements.linksTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-tertiary); padding: 1.5rem;">Внешние ссылки в записях не обнаружены</td></tr>`;
            } else {
                sortedLinks.slice(0, 30).forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="badge" style="font-size: 0.76rem; background: #e0f2fe; color: #0369a1;">${item.domain}</span></td>
                        <td>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="link-external-anchor">
                                <span>${item.url}</span>
                                <span class="material-symbols-outlined" style="font-size: 13px;">open_in_new</span>
                            </a>
                        </td>
                        <td style="text-align: right; font-weight: 700;">${item.count}</td>
                    `;
                    elements.linksTbody.appendChild(tr);
                });
            }
        }

        // 3. Generate Methodist Explanatory Note (Textual Memo)
        generateMethodistMemo(state.lastGroupsStats, sortedTags);
    }

    function generateMethodistMemo(stats, sortedTags) {
        if (!elements.methodistMemoTextarea || !stats) return;

        const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const datesFilter = elements.reportDatesFilter ? elements.reportDatesFilter.textContent : 'За период';

        const totalBranches = stats.length;
        const totalPosts = stats.reduce((sum, s) => sum + s.postsCount, 0);
        const totalViews = stats.reduce((sum, s) => sum + s.views, 0);
        const totalLikes = stats.reduce((sum, s) => sum + s.likes, 0);
        const totalReposts = stats.reduce((sum, s) => sum + s.reposts, 0);
        const totalComments = stats.reduce((sum, s) => sum + s.comments, 0);
        const totalReactions = totalLikes + totalReposts + totalComments;

        const systemAvgEr = totalViews > 0 ? ((totalReactions / totalViews) * 100).toFixed(2) + '%' : '0.00%';
        const avgReactionsPerPost = totalPosts > 0 ? (totalReactions / totalPosts).toFixed(1) : '0.0';
        const avgPostsPerBranch = totalBranches > 0 ? (totalPosts / totalBranches).toFixed(1) : '0.0';

        // Sorting for leaders
        const topPosts = [...stats].sort((a, b) => b.postsCount - a.postsCount).slice(0, 3);
        const topViews = [...stats].sort((a, b) => b.views - a.views).slice(0, 3);
        const topEr = [...stats].filter(s => s.views > 0).sort((a, b) => b.er - a.er).slice(0, 3);

        const normBranches = stats.filter(s => s.status === 'norm');
        const warningBranches = stats.filter(s => s.status === 'warning');
        const dangerBranches = stats.filter(s => s.status === 'danger');

        let normList = normBranches.map(b => `  • ${b.info.canonicalName || b.info.name} — ${b.postsCount} ${declOfNum(b.postsCount, ['пост', 'поста', 'постов'])} (охват: ${b.views.toLocaleString('ru-RU')})`).join('\n');
        if (!normList) normList = '  (нет филиалов, выполнивших норматив)';

        let warningList = warningBranches.map(b => `  ⚠ ${b.info.canonicalName || b.info.name} — ${b.postsCount} ${declOfNum(b.postsCount, ['пост', 'поста', 'постов'])} (не выполнено: не хватает ${10 - b.postsCount} до нормы)`).join('\n');
        if (!warningList) warningList = '  (малоактивные филиалы отсутствуют)';

        let dangerList = dangerBranches.map(b => `  ✕ ${b.info.canonicalName || b.info.name} — 0 публикаций (адрес: ${b.info.address || '—'})`).join('\n');
        if (!dangerList) dangerList = '  (филиалы с нулевой активностью отсутствуют)';

        let topTagsList = (sortedTags || []).slice(0, 8).map(t => `#${t.tag} (${t.count})`).join(', ');
        if (!topTagsList) topTagsList = 'хэштеги не зафиксированы';

        const memo = 
`СПРАВКА-ОТЧЕТ МЕТОДИЧЕСКОГО ОТДЕЛА
об информационной и публикационной активности филиалов МБУК «ЦГБ» г. Владимира в социальной сети ВКонтакте

Период мониторинга: ${datesFilter}
Дата составления: ${dateStr}, ${timeStr}
Охвачено мониторингом: ${totalBranches} ${declOfNum(totalBranches, ['филиал', 'филиала', 'филиалов'])}

1. ОБЩИЕ КОЛИЧЕСТВЕННЫЕ ПОКАЗАТЕЛИ СИСТЕМЫ:
- Общее число опубликованных записей за период: ${totalPosts}
- Совокупный читательский охват (просмотры): ${totalViews.toLocaleString('ru-RU')}
- Суммарная пользовательская реакция: ${totalLikes.toLocaleString('ru-RU')} отметок «Нравится», ${totalReposts.toLocaleString('ru-RU')} репостов, ${totalComments.toLocaleString('ru-RU')} комментариев (всего: ${totalReactions.toLocaleString('ru-RU')} реакций)
- Средний коэффициент вовлеченности (ER) по системе: ${systemAvgEr}
- Средний читательский отклик на 1 публикацию: ${avgReactionsPerPost} реакций
- Средняя публикационная нагрузка на 1 филиал: ${avgPostsPerBranch} постов

2. ФИЛИАЛЫ-ЛИДЕРЫ АКТИВНОСТИ:
• По количеству публикаций:
${topPosts.map((p, i) => `  ${i + 1}) ${p.info.canonicalName || p.info.name} — ${p.postsCount} ${declOfNum(p.postsCount, ['пост', 'поста', 'постов'])}`).join('\n')}

• По читательскому охвату (просмотрам):
${topViews.map((p, i) => `  ${i + 1}) ${p.info.canonicalName || p.info.name} — ${p.views.toLocaleString('ru-RU')} просмотров`).join('\n')}

• По вовлеченности аудитории (ER):
${topEr.map((p, i) => `  ${i + 1}) ${p.info.canonicalName || p.info.name} — ${p.er.toFixed(2)}% ER (${p.views.toLocaleString('ru-RU')} просмотров, ${p.reactions} реакций)`).join('\n')}

3. КОНТРОЛЬ ИСПОЛНЕНИЯ ПЛАНА ПУБЛИКАЦИОННОЙ АКТИВНОСТИ (норматив: не менее 10 постов в месяц):
А) Выполнили норматив плана (≥10 постов) — ${normBranches.length} ${declOfNum(normBranches.length, ['филиал', 'филиала', 'филиалов'])}:
${normList}

Б) Малоактивные филиалы (менее 10 постов) — ТРЕБУЕТСЯ НАПОМИНАНИЕ ЗАВЕДУЮЩЕМУ О ПЛАНЕ (${warningBranches.length} ${declOfNum(warningBranches.length, ['филиал', 'филиала', 'филиалов'])}):
${warningList}

В) Нулевая активность (0 публикаций за период) — ТРЕБУЕТСЯ СРОЧНЫЙ МЕТОДИЧЕСКИЙ КОНТРОЛЬ (${dangerBranches.length} ${declOfNum(dangerBranches.length, ['филиал', 'филиала', 'филиалов'])}):
${dangerList}

4. ТЕМАТИЧЕСКИЙ АНАЛИЗ И КЛЮЧЕВЫЕ ХЭШТЕГИ:
- Наиболее востребованные хэштеги периода:
  ${topTagsList}

5. ВЫВОДЫ И РЕКОМЕНДАЦИИ МЕТОДИЧЕСКОГО ОТДЕЛА:
1. Заведующим малоактивными филиалами указать на необходимость соблюдения установленного графика публикаций (не менее 8–10 тематических материалов в месяц).
2. Филиалам с нулевой активностью предоставить в методический отдел письменное объяснение причин отсутствия информационной работы в социальной сети за отчетный период.
3. Продолжить внедрение интерактивных форматов (опросы, викторины, обзоры новых поступлений литературы) для поддержания стабильного уровня читательской вовлеченности.

Справку составил: Методический отдел МБУК «ЦГБ» г. Владимира
`;

        elements.methodistMemoTextarea.value = memo;
    }

    // Create a DOM Element for post card
    function createPostCard(post) {
        const div = document.createElement('div');
        div.className = 'post-card';
        
        enrichTargetWithCanonical(post.targetInfo);
        const displayName = post.targetInfo.canonicalName || post.targetInfo.name;

        // Format post link using the post's specific target Info
        const postLink = `https://vk.com/wall${post.targetInfo.id}_${post.id}`;
        
        // Headers and Meta with Smart Avatar
        let headerHtml = `
            <div class="post-card-header">
                ${renderBranchAvatarHtml(post.targetInfo, 'md', 'author-avatar-wrap')}
                <div class="author-info">
                    <span class="author-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
                    <span class="post-date">${post.humanDate}</span>
                </div>
            </div>
        `;

        // Body Content
        const hasText   = !!(post.text && post.text.trim());
        const hasLongText = hasText && post.text.length > 300;
        const bodyText  = post.text || '';

        // Robust photo extraction — same priority as openPostModal
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

        // Repost detection
        const hasRepost = Array.isArray(post.copy_history) && post.copy_history.length > 0;
        const repost = hasRepost ? post.copy_history[0] : null;

        // Direct attachments
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

        // Repost attachments
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

        // Helper: render photo grid
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

        // Helper: render videos
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

        // Helper: render links
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

        // Repost HTML
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

        // Text block — only if post has text
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

        // If truly no content at all
        if (!hasText && !hasRepost && directPhotos.length === 0 && directVideos.length === 0 && directLinks.length === 0) {
            textHtml = '<div class="post-text" style="color:var(--muted);font-style:italic;">Без текста</div>';
        }

        // Footer counts
        const likes = extractNum(post.likes);
        const reposts = extractNum(post.reposts);
        const comments = extractNum(post.comments);
        const views = extractNum(post.views);

        let footerHtml = `
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
                <a href="${postLink}" target="_blank" class="btn btn-secondary btn-sm btn-open-vk">
                    <span class="material-symbols-outlined icon">open_in_new</span>
                    <span>VK</span>
                </a>
            </div>
        `;

        div.innerHTML = headerHtml + footerHtml;

        // Video inline playback
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

        // Click anywhere on card → open post modal (except links, buttons, images handled by lightbox)
        div.addEventListener('click', (e) => {
            if (e.target.closest('a, button, .attachment-img')) return;
            openPostModal(post, displayName, null, postLink);
        });

        // Expand button also opens modal
        if (hasLongText) {
            setTimeout(() => {
                const btn = div.querySelector(`.expand-text-btn[data-id="${post.id}"]`);
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openPostModal(post, displayName, null, postLink);
                    });
                }
            }, 50);
        }

        return div;
    }

    // =============================================================
    // Full-post modal ("Читать полностью")
    // =============================================================
    function openPostModal(post, displayName, _avatarHtml, postLink) {
        // Pick best URL from VK sizes array (prefer largest)
        const SIZE_PRIORITY = ['w', 'z', 'x', 'y', 'r', 'q', 'p', 'm', 's'];
        function bestPhotoUrl(photoObj) {
            if (!photoObj) return null;
            // Modern API: sizes array
            if (Array.isArray(photoObj.sizes) && photoObj.sizes.length > 0) {
                for (const t of SIZE_PRIORITY) {
                    const s = photoObj.sizes.find(s => s.type === t);
                    if (s && s.url) return s.url;
                }
                const last = photoObj.sizes[photoObj.sizes.length - 1];
                return last ? last.url : null;
            }
            // Legacy API: photo_604, photo_807, photo_1280, photo_2560
            for (const key of ['photo_2560','photo_1280','photo_807','photo_604','photo_130','photo_75']) {
                if (photoObj[key]) return photoObj[key];
            }
            return null;
        }

        const rawText = (post.text || '').trim();
        const hasText = rawText.length > 0;
        const safeText = hasText ? linkifyText(escapeHtml(post.text)) : '';

        // Repost detection
        const hasRepost = Array.isArray(post.copy_history) && post.copy_history.length > 0;
        const repost = hasRepost ? post.copy_history[0] : null;

        // Direct attachments
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

        // Repost attachments
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

        // Totals for layout calculation
        const totalPhotos = directPhotos.length + (repost ? repostPhotos.length : 0);
        const totalVideos = directVideos.length + (repost ? repostVideos.length : 0);
        const totalLinks  = directLinks.length + (repost ? repostLinks.length : 0);
        const hasAnyText  = hasText || (repost && (repost.text || '').trim().length > 0);

        // Adaptive modal modifiers
        const isSinglePhotoOnly = !hasAnyText && totalPhotos === 1 && totalVideos === 0 && totalLinks === 0;
        const isVideoOnly = !hasAnyText && totalVideos > 0 && totalPhotos === 0 && totalLinks === 0;

        let cardClasses = ['pm-card'];
        if (isSinglePhotoOnly) cardClasses.push('pm-single-photo-only');
        if (isVideoOnly) cardClasses.push('pm-video-only');

        // Modal Photos Renderer
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

        // Modal Videos Renderer
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

        // Modal Links Renderer
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
        const directLinksHtml  = renderModalLinks(directLinks);

        // Repost Modal Content
        let repostModalHtml = '';
        if (hasRepost && repost) {
            const rAuthor = resolveRepostAuthor(repost);
            const rDate = repost.date ? formatHumanDate(new Date(repost.date * 1000)) : '';
            const rText = repost.text ? linkifyText(escapeHtml(repost.text)) : '';
            const rPhotos = renderModalPhotos(repostPhotos);
            const rVideos = renderModalVideos(repostVideos);
            const rLinks  = renderModalLinks(repostLinks);
            const authorLink = rAuthor.postUrl || rAuthor.url;

            if (isSinglePhotoOnly) {
                // If single photo in repost without any text, display it directly for full-window adaptive fit
                repostModalHtml = rPhotos;
            } else {
                repostModalHtml = `
                    <div class="pm-repost-box">
                        <div class="repost-header">
                            <span class="material-symbols-outlined repost-icon-indicator" title="Репост">repeat</span>
                            ${rAuthor.avatar ? `<img class="repost-author-avatar" src="${escapeHtml(rAuthor.avatar)}" alt="${escapeHtml(rAuthor.name)}" loading="lazy">` : `<div class="repost-author-avatar" style="display:flex;align-items:center;justify-content:center;background:var(--surface);"><span class="material-symbols-outlined" style="font-size:18px;color:var(--accent);">group</span></div>`}
                            <div class="repost-author-info">
                                <a href="${escapeHtml(authorLink)}" target="_blank" rel="noopener noreferrer" class="repost-author-name" data-repost-owner-id="${rAuthor.rawOwnerId}">
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
        }

        const likes    = extractNum(post.likes);
        const reposts  = extractNum(post.reposts);
        const comments = extractNum(post.comments);
        const views    = extractNum(post.views);

        const avatarHtml = renderBranchAvatarHtml(post.targetInfo, 'md', 'author-avatar-wrap');

        const html = `
        <div class="pm-overlay" id="pm-overlay">
            <div class="${cardClasses.join(' ')}" role="dialog" aria-modal="true">
                <div class="pm-topbar">
                    <div class="pm-author">
                        ${avatarHtml}
                        <div class="pm-author-info">
                            <span class="pm-author-name">${escapeHtml(displayName)}</span>
                            <span class="pm-author-date">${escapeHtml(post.humanDate || '')}</span>
                        </div>
                    </div>
                    <div class="pm-actions">
                        <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                            <span class="material-symbols-outlined icon">open_in_new</span>
                            <span>VK</span>
                        </a>
                        <button class="pm-close-btn" id="pm-close-btn" aria-label="Закрыть">
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
                    <span class="stat-item stat-likes"><span class="material-symbols-outlined">favorite</span>${likes}</span>
                    <span class="stat-item stat-reposts"><span class="material-symbols-outlined">share</span>${reposts}</span>
                    <span class="stat-item stat-comments"><span class="material-symbols-outlined">chat_bubble</span>${comments}</span>
                    ${views ? `<span class="stat-item stat-views"><span class="material-symbols-outlined">visibility</span>${formatViews(views)}</span>` : ''}
                </div>
            </div>
        </div>`;

        // Mount
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const overlay = wrapper.firstElementChild;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Animate in
        requestAnimationFrame(() => overlay.classList.add('pm-open'));

        function closeModal() {
            overlay.classList.remove('pm-open');
            document.body.style.overflow = '';
            setTimeout(() => overlay.remove(), 300);
        }

        overlay.querySelector('#pm-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        const esc = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); } };
        document.addEventListener('keydown', esc);
    }

    // formatHumanDate and formatViews are defined at top-level scope (lines 24–40)

    // Copy formatted report in Markdown/Text to clipboard (grouped)
    function copyReportToClipboard() {
        if (state.matchedPosts.length === 0) return;
        
        let reportText = `ОТЧЕТ ПО РЕЗУЛЬТАТАМ ПОИСКА ЗАПИСЕЙ VK\n`;
        reportText += `========================================\n`;
        reportText += `Источники: ${state.targetsInfo.map(t => t.name).join(', ')}\n`;
        reportText += `Фильтр дат: ${elements.reportDatesFilter.textContent}\n`;
        reportText += `Поисковый запрос: ${elements.reportSearchQuery.textContent}\n`;
        reportText += `Дата формирования: ${elements.reportGenerationTime.textContent}\n`;
        reportText += `Всего найдено записей: ${state.matchedCount}\n\n`;
        
        // Group by target
        const groupsMap = {};
        state.matchedPosts.forEach(post => {
            const tId = post.targetInfo.id;
            if (!groupsMap[tId]) {
                groupsMap[tId] = {
                    info: post.targetInfo,
                    posts: []
                };
            }
            groupsMap[tId].posts.push(post);
        });

        // Summary Statistics Section
        reportText += `СВОДНАЯ СТАТИСТИКА ПО ИСТОЧНИКАМ\n`;
        reportText += `----------------------------------------\n`;
        Object.values(groupsMap).forEach(group => {
            let likes = 0, reposts = 0, views = 0;
            group.posts.forEach(p => {
                likes += p.likes ? p.likes.count : 0;
                reposts += p.reposts ? p.reposts.count : 0;
                views += p.views ? p.views.count : 0;
            });
            reportText += `• ${group.info.name} (${group.info.link}): ${group.posts.length} постов | ❤️ ${likes} | 🔄 ${reposts} | 👁️ ${formatViews(views)}\n`;
        });
        reportText += `========================================\n\n`;

        Object.values(groupsMap).forEach(group => {
            reportText += `ГРУППА: ${group.info.name} (${group.info.link})\n`;
            reportText += `Найдено записей: ${group.posts.length}\n`;
            reportText += `----------------------------------------\n`;
            
            group.posts.forEach((post, index) => {
                const postLink = `https://vk.com/wall${post.targetInfo.id}_${post.id}`;
                let cleanText = post.text || '[Без текста]';
                if (cleanText.length > 350) {
                    cleanText = cleanText.substring(0, 350) + '...';
                }
                
                reportText += `${index + 1}. [${post.humanDate}] Ссылка: ${postLink}\n`;
                reportText += `   Текст: ${cleanText.replace(/\n/g, '\n   ')}\n`;
                reportText += `   Статистика: Лайков: ${post.likes ? post.likes.count : 0}, Репостов: ${post.reposts ? post.reposts.count : 0}, Просмотров: ${post.views ? post.views.count : 0}\n\n`;
            });
            reportText += `========================================\n\n`;
        });

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(reportText).then(() => {
                alert('Отчёт успешно скопирован в буфер обмена!');
            }).catch(err => {
                fallbackCopyText(reportText);
            });
        } else {
            fallbackCopyText(reportText);
        }
    }

    // Clipboard fallback using execCommand for non-secure contexts
    function fallbackCopyText(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            alert('Отчёт успешно скопирован в буфер обмена!');
        } catch (e) {
            alert('Не удалось скопировать отчёт. Пожалуйста, скопируйте вручную.');
        }
        document.body.removeChild(ta);
    }

    // Export CSV with Source & Link columns
    function downloadCSV() {
        if (state.matchedPosts.length === 0) return;

        let csvRows = [];
        // Header with Montserrat-ready UTF-8 BOM
        csvRows.push(['Библиотека / Источник', 'Ссылка на группу', 'Дата публикации', 'Ссылка на пост', 'Текст поста', 'Лайки', 'Репосты', 'Комментарии', 'Просмотры'].map(escapeCSVCell).join(','));

        state.matchedPosts.forEach(post => {
            const postLink = `https://vk.com/wall${post.targetInfo.id}_${post.id}`;
            const likes = post.likes ? post.likes.count : 0;
            const reposts = post.reposts ? post.reposts.count : 0;
            const comments = post.comments ? post.comments.count : 0;
            const views = post.views ? post.views.count : 0;
            const text = post.text || '';
            const sourceName = post.targetInfo.name;
            const sourceLink = post.targetInfo.link;

            const row = [
                sourceName,
                sourceLink,
                post.humanDate,
                postLink,
                text,
                likes,
                reposts,
                comments,
                views
            ];
            csvRows.push(row.map(escapeCSVCell).join(','));
        });

        const csvContent = "\uFEFF" + csvRows.join("\n"); // Add UTF-8 BOM
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const suffix = state.targetsInfo.length === 1 ? state.targetsInfo[0].id : 'multiple';
        link.setAttribute("download", `vk_report_${suffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Export JSON (grouped & summary format)
    function downloadJSON() {
        if (state.matchedPosts.length === 0) return;
        
        const groupsMap = {};
        state.matchedPosts.forEach(post => {
            const tId = post.targetInfo.id;
            if (!groupsMap[tId]) {
                groupsMap[tId] = {
                    groupInfo: {
                        id: post.targetInfo.id,
                        name: post.targetInfo.name,
                        link: post.targetInfo.link,
                        type: post.targetInfo.type
                    },
                    summary: {
                        postsCount: 0,
                        totalLikes: 0,
                        totalReposts: 0,
                        totalViews: 0
                    },
                    posts: []
                };
            }
            const g = groupsMap[tId];
            const likes = post.likes ? post.likes.count : 0;
            const reposts = post.reposts ? post.reposts.count : 0;
            const views = post.views ? post.views.count : 0;

            g.summary.postsCount++;
            g.summary.totalLikes += likes;
            g.summary.totalReposts += reposts;
            g.summary.totalViews += views;

            g.posts.push({
                id: post.id,
                date: post.date,
                humanDate: post.humanDate,
                link: `https://vk.com/wall${post.targetInfo.id}_${post.id}`,
                text: post.text || '',
                likes: likes,
                reposts: reposts,
                comments: post.comments ? post.comments.count : 0,
                views: views
            });
        });

        const exportData = {
            reportMeta: {
                sources: state.targetsInfo.map(t => ({ name: t.name, link: t.link })),
                filters: elements.reportDatesFilter.textContent,
                searchQuery: elements.reportSearchQuery.textContent,
                generatedAt: elements.reportGenerationTime.textContent,
                totalMatches: state.matchedCount
            },
            groups: Object.values(groupsMap)
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const suffix = state.targetsInfo.length === 1 ? state.targetsInfo[0].id : 'multiple';
        link.setAttribute("download", `vk_report_${suffix}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Helper cell escape for CSV
    function escapeCSVCell(val) {
        let str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = str.replace(/"/g, '""');
            str = `"${str}"`;
        }
        return str;
    }

    // Export Official Word DOC (compatible with Microsoft Word 2007-2024, Office 365, LibreOffice)
    // Uses MSO Word HTML specification with Landscape orientation, Executive Metric Cards, and modern styling
    function downloadDOC() {
        if (state.matchedPosts.length === 0) {
            alert('Нет найденных записей для экспорта в Word (DOCX).');
            return;
        }

        const origBtnHtml = elements.downloadDocBtn ? elements.downloadDocBtn.innerHTML : '';
        if (elements.downloadDocBtn) {
            elements.downloadDocBtn.disabled = true;
            elements.downloadDocBtn.innerHTML = '<span class="material-symbols-outlined icon" style="animation:spin 1s linear infinite;">sync</span><span>Генерация Word...</span>';
        }

        const sourceNames = (state.targetsInfo || []).map(t => t.name).join(', ') || 'Все источники';
        const datesFilter = elements.reportDatesFilter ? elements.reportDatesFilter.textContent : '-';
        const searchQuery = elements.reportSearchQuery ? elements.reportSearchQuery.textContent : '-';
        const genTime = new Date().toLocaleString('ru-RU');

        let grandTotalLikes = 0;
        let grandTotalReposts = 0;
        let grandTotalViews = 0;
        let grandTotalComments = 0;

        state.matchedPosts.forEach(post => {
            grandTotalLikes += post.likes ? post.likes.count : 0;
            grandTotalReposts += post.reposts ? post.reposts.count : 0;
            grandTotalViews += post.views ? post.views.count : 0;
            grandTotalComments += post.comments ? post.comments.count : 0;
        });

        // Group posts by target (including 0-post groups)
        const groupsMap = {};
        if (state.targetsInfo && state.targetsInfo.length > 0) {
            state.targetsInfo.forEach(target => {
                groupsMap[target.id] = { info: target, posts: [] };
            });
        }
        state.matchedPosts.forEach(post => {
            const tId = post.targetInfo ? post.targetInfo.id : 'unknown';
            if (!groupsMap[tId]) {
                groupsMap[tId] = { info: post.targetInfo || { name: 'Неизвестно', link: '#' }, posts: [] };
            }
            groupsMap[tId].posts.push(post);
        });

        // 1. Build Summary Table HTML for Word (strictly in canonical order)
        const sortedGroupsForDoc = Object.values(groupsMap).sort((a, b) => {
            enrichTargetWithCanonical(a.info);
            enrichTargetWithCanonical(b.info);
            return (a.info.sortOrder || 999) - (b.info.sortOrder || 999);
        });

        let summaryRows = '';
        let sumPosts = 0, sumLikes = 0, sumReposts = 0, sumViews = 0;
        sortedGroupsForDoc.forEach(g => {
            let likes = 0, reposts = 0, views = 0;
            g.posts.forEach(p => {
                likes += p.likes ? p.likes.count : 0;
                reposts += p.reposts ? p.reposts.count : 0;
                views += p.views ? p.views.count : 0;
            });
            sumPosts += g.posts.length;
            sumLikes += likes;
            sumReposts += reposts;
            sumViews += views;

            const displayName = g.info.canonicalName || g.info.name;
            const addressNote = g.info.address ? `<br><span style="font-size:7.5pt; color:#64748b; font-weight:normal;">${escapeHtml(g.info.address)}</span>` : '';

            summaryRows += `
                <tr style="mso-yfti-irow:1;">
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; font-weight:bold; color:#0f172a; width:28%; vertical-align:middle;">${escapeHtml(displayName)}${addressNote}</td>
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; width:26%; word-break:break-all; vertical-align:middle;"><a href="${g.info.link}" style="color:#0077ff; text-decoration:underline;">${g.info.link}</a></td>
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; text-align:center; font-weight:bold; color:#0077ff; width:11%; vertical-align:middle; background-color:#f8fafc;">${g.posts.length}</td>
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; text-align:center; width:11%; vertical-align:middle; color:#b91c1c; font-weight:600;">❤️ ${likes}</td>
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; text-align:center; width:11%; vertical-align:middle; color:#15803d; font-weight:600;">🔄 ${reposts}</td>
                    <td style="padding:6pt 8pt; border:1pt solid #cbd5e1; text-align:center; width:13%; vertical-align:middle; color:#7e22ce; font-weight:600;">👁️ ${views ? formatViews(views) : 0}</td>
                </tr>
            `;
        });

        // Summary Total Row
        summaryRows += `
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2pt solid #0077ff;">
                <td colspan="2" style="padding:7pt 8pt; border:1pt solid #94a3b8; font-weight:bold; color:#0f172a; text-transform:uppercase;">ИТОГО ПО ВСЕМ ИСТОЧНИКАМ:</td>
                <td style="padding:7pt 8pt; border:1pt solid #94a3b8; text-align:center; color:#0077ff; font-size:10pt;">${sumPosts}</td>
                <td style="padding:7pt 8pt; border:1pt solid #94a3b8; text-align:center; color:#b91c1c;">❤️ ${sumLikes}</td>
                <td style="padding:7pt 8pt; border:1pt solid #94a3b8; text-align:center; color:#15803d;">🔄 ${sumReposts}</td>
                <td style="padding:7pt 8pt; border:1pt solid #94a3b8; text-align:center; color:#7e22ce;">👁️ ${formatViews(sumViews)}</td>
            </tr>
        `;

        // 2. Build Posts Tables by Group for Word
        let groupsHtml = '';
        sortedGroupsForDoc.forEach(g => {
            let postsRows = '';
            if (g.posts.length === 0) {
                postsRows = `
                    <tr>
                        <td colspan="4" style="text-align:center; color:#64748b; font-style:italic; padding:12pt; border:1pt solid #cbd5e1; background-color:#f8fafc;">
                            Записи по выбранным параметрам поиска не обнаружены (0 публикаций).
                        </td>
                    </tr>
                `;
            } else {
                g.posts.forEach((p, idx) => {
                    const postLink = `https://vk.com/wall${p.targetInfo.id}_${post.id || p.id}`;
                    const likes = p.likes ? p.likes.count : 0;
                    const reposts = p.reposts ? p.reposts.count : 0;
                    const comments = p.comments ? p.comments.count : 0;
                    const views = p.views ? p.views.count : 0;
                    const textContent = p.text ? escapeHtml(p.text) : '[Без текста]';
                    const rowBg = (idx % 2 === 1) ? '#f8fafc' : '#ffffff';

                    postsRows += `
                        <tr style="background-color:${rowBg}; page-break-inside:avoid;">
                            <td style="width:13%; padding:6pt 8pt; border:1pt solid #cbd5e1; font-weight:bold; color:#334155; vertical-align:top; font-size:8.5pt;">${p.humanDate}</td>
                            <td style="width:22%; padding:6pt 8pt; border:1pt solid #cbd5e1; word-break:break-all; vertical-align:top; font-size:8.5pt;"><a href="${postLink}" style="color:#0077ff; text-decoration:underline;">${postLink}</a></td>
                            <td style="width:53%; padding:6pt 8pt; border:1pt solid #cbd5e1; vertical-align:top; font-size:8.5pt; line-height:1.4; color:#1e293b; white-space:pre-wrap; word-break:break-word;">${textContent}</td>
                            <td style="width:12%; padding:6pt 8pt; border:1pt solid #cbd5e1; text-align:center; vertical-align:top; font-size:8.5pt; line-height:1.5;">
                                <div style="color:#b91c1c; font-weight:bold;">❤️ ${likes}</div>
                                <div style="color:#15803d; font-weight:bold;">🔄 ${reposts}</div>
                                <div style="color:#1d4ed8; font-weight:bold;">💬 ${comments}</div>
                                ${views ? `<div style="color:#7e22ce; font-weight:bold;">👁️ ${formatViews(views)}</div>` : ''}
                            </td>
                        </tr>
                    `;
                });
            }

            const displayName = g.info.canonicalName || g.info.name;
            const addressNote = g.info.address ? ` <span style="font-size:8.5pt; font-weight:normal; color:#475569;">(${escapeHtml(g.info.address)})</span>` : '';

            groupsHtml += `
                <div style="page-break-inside:avoid; margin-top:18pt; margin-bottom:12pt;">
                    <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
                        <tr>
                            <td style="background-color:#eff6ff; border-left:4pt solid #0077ff; padding:7pt 12pt; border-top:1pt solid #bfdbfe; border-right:1pt solid #bfdbfe; font-size:10.5pt; font-weight:bold; color:#0f172a;">
                                🏛️ Источник: <a href="${g.info.link}" style="color:#0077ff; text-decoration:underline;">${escapeHtml(displayName)}</a>${addressNote}
                                &nbsp;&nbsp;<span style="display:inline-block; background-color:#0077ff; color:#ffffff; padding:2pt 8pt; font-size:8.5pt; border-radius:10pt;">Найдено записей: ${g.posts.length}</span>
                            </td>
                        </tr>
                    </table>
                    <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:8.5pt;">
                        <thead>
                            <tr style="background-color:#0f172a; color:#ffffff;">
                                <th style="width:13%; padding:7pt 8pt; border:1pt solid #334155; text-align:left; color:#ffffff; font-weight:bold; font-size:8.5pt;">📅 Дата</th>
                                <th style="width:22%; padding:7pt 8pt; border:1pt solid #334155; text-align:left; color:#ffffff; font-weight:bold; font-size:8.5pt;">🔗 Ссылка на пост</th>
                                <th style="width:53%; padding:7pt 8pt; border:1pt solid #334155; text-align:left; color:#ffffff; font-weight:bold; font-size:8.5pt;">📝 Текст / Выдержка</th>
                                <th style="width:12%; padding:7pt 8pt; border:1pt solid #334155; text-align:center; color:#ffffff; font-weight:bold; font-size:8.5pt;">📊 Показатели</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${postsRows}
                        </tbody>
                    </table>
                </div>
            `;
        });

        const docHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <title>Официальный отчёт VK</title>
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
                @page WordSection1 {
                    size: 841.9pt 595.3pt; /* A4 Landscape */
                    mso-page-orientation: landscape;
                    margin: 36.0pt 36.0pt 36.0pt 36.0pt;
                    mso-header-margin: 35.4pt;
                    mso-footer-margin: 35.4pt;
                }
                div.WordSection1 {
                    page: WordSection1;
                    font-family: 'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif;
                }
                body {
                    font-family: 'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif;
                    color: #0f172a;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 0;
                }
                table {
                    mso-displayed-decimal-separator: ",";
                    mso-displayed-thousand-separator: " ";
                }
            </style>
        </head>
        <body>
            <div class="WordSection1">
                <!-- Institution Badge Banner -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:10pt;">
                    <tr>
                        <td style="background-color:#eff6ff; border-left:4pt solid #0077ff; border-top:1pt solid #dbeafe; border-right:1pt solid #dbeafe; border-bottom:1pt solid #dbeafe; padding:6pt 12pt; font-size:8.5pt; font-weight:bold; color:#1e40af; text-transform:uppercase; letter-spacing:0.4pt;">
                            🏛️ МУНИЦИПАЛЬНОЕ БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ КУЛЬТУРЫ «ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА»
                        </td>
                    </tr>
                </table>

                <!-- Main Document Title -->
                <div style="border-bottom:2pt solid #0077ff; padding-bottom:8pt; margin-bottom:14pt;">
                    <h1 style="font-size:17pt; font-weight:bold; color:#0f172a; margin:0 0 4pt 0; font-family:'Calibri', 'Segoe UI', Arial, sans-serif;">
                        Официальный отчёт об анализе и мониторинге публикаций VK
                    </h1>
                    <div style="font-size:9pt; color:#64748b; font-family:'Calibri', 'Segoe UI', Arial, sans-serif;">
                        Система анализа активности и мониторинга публикаций &bull; Дата и время: ${escapeHtml(genTime)}
                    </div>
                </div>

                <!-- Executive KPI Cards Grid (4 Columns) -->
                <table style="width:100%; border-collapse:separate; border-spacing:8pt; margin-bottom:16pt;">
                    <tr>
                        <td style="width:25%; background-color:#eff6ff; border:1.5pt solid #93c5fd; padding:10pt 12pt; vertical-align:top;">
                            <div style="font-size:8pt; font-weight:bold; color:#1e40af; text-transform:uppercase;">📊 Всего записей</div>
                            <div style="font-size:20pt; font-weight:bold; color:#1d4ed8; margin:4pt 0;">${state.matchedCount}</div>
                            <div style="font-size:8pt; color:#3b82f6;">найдено по критериям</div>
                        </td>
                        <td style="width:25%; background-color:#fef2f2; border:1.5pt solid #fca5a5; padding:10pt 12pt; vertical-align:top;">
                            <div style="font-size:8pt; font-weight:bold; color:#991b1b; text-transform:uppercase;">❤️ Всего лайков</div>
                            <div style="font-size:20pt; font-weight:bold; color:#b91c1c; margin:4pt 0;">${grandTotalLikes}</div>
                            <div style="font-size:8pt; color:#ef4444;">отметки «Нравится»</div>
                        </td>
                        <td style="width:25%; background-color:#f0fdf4; border:1.5pt solid #86efac; padding:10pt 12pt; vertical-align:top;">
                            <div style="font-size:8pt; font-weight:bold; color:#166534; text-transform:uppercase;">🔄 Всего репостов</div>
                            <div style="font-size:20pt; font-weight:bold; color:#15803d; margin:4pt 0;">${grandTotalReposts}</div>
                            <div style="font-size:8pt; color:#22c55e;">поделились записью</div>
                        </td>
                        <td style="width:25%; background-color:#faf5ff; border:1.5pt solid #d8b4fe; padding:10pt 12pt; vertical-align:top;">
                            <div style="font-size:8pt; font-weight:bold; color:#6b21a8; text-transform:uppercase;">👁️ Всего просмотров</div>
                            <div style="font-size:20pt; font-weight:bold; color:#7e22ce; margin:4pt 0;">${formatViews(grandTotalViews)}</div>
                            <div style="font-size:8pt; color:#a855f7;">суммарный охват</div>
                        </td>
                    </tr>
                </table>

                <!-- Passport Parameters Table -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:18pt; border:1.5pt solid #cbd5e1; font-size:9pt;">
                    <tr>
                        <td style="width:28%; padding:6pt 10pt; background-color:#f1f5f9; border:1pt solid #cbd5e1; font-weight:bold; color:#334155;">📌 Источники мониторинга:</td>
                        <td style="width:72%; padding:6pt 10pt; background-color:#ffffff; border:1pt solid #cbd5e1; color:#0f172a; font-weight:600;">${escapeHtml(sourceNames)}</td>
                    </tr>
                    <tr>
                        <td style="padding:6pt 10pt; background-color:#f1f5f9; border:1pt solid #cbd5e1; font-weight:bold; color:#334155;">📅 Период и фильтр дат:</td>
                        <td style="padding:6pt 10pt; background-color:#ffffff; border:1pt solid #cbd5e1; color:#0f172a; font-weight:600;">${escapeHtml(datesFilter)}</td>
                    </tr>
                    <tr>
                        <td style="padding:6pt 10pt; background-color:#f1f5f9; border:1pt solid #cbd5e1; font-weight:bold; color:#334155;">🔍 Поисковый запрос:</td>
                        <td style="padding:6pt 10pt; background-color:#ffffff; border:1pt solid #cbd5e1; color:#0f172a; font-weight:600;">${escapeHtml(searchQuery)}</td>
                    </tr>
                    <tr>
                        <td style="padding:6pt 10pt; background-color:#f1f5f9; border:1pt solid #cbd5e1; font-weight:bold; color:#334155;">🕒 Дата и время выгрузки:</td>
                        <td style="padding:6pt 10pt; background-color:#ffffff; border:1pt solid #cbd5e1; color:#0f172a;">${escapeHtml(genTime)}</td>
                    </tr>
                    <tr>
                        <td style="padding:6pt 10pt; background-color:#f1f5f9; border:1pt solid #cbd5e1; font-weight:bold; color:#334155;">💬 Комментариев за период:</td>
                        <td style="padding:6pt 10pt; background-color:#ffffff; border:1pt solid #cbd5e1; color:#1d4ed8; font-weight:bold;">${grandTotalComments}</td>
                    </tr>
                </table>

                <!-- Section 1: Summary Table by Sources -->
                <div style="font-size:12pt; font-weight:bold; color:#0077ff; border-left:4pt solid #0077ff; padding-left:8pt; margin-top:20pt; margin-bottom:10pt;">
                    Сводная статистика по источникам (за выбранный период)
                </div>
                <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:20pt; font-size:8.5pt;">
                    <thead>
                        <tr style="background-color:#0f172a; color:#ffffff;">
                            <th style="width:28%; padding:7pt 8pt; border:1pt solid #334155; text-align:left; color:#ffffff; font-weight:bold;">🏛️ Библиотека / Источник</th>
                            <th style="width:26%; padding:7pt 8pt; border:1pt solid #334155; text-align:left; color:#ffffff; font-weight:bold;">🔗 Ссылка ВК</th>
                            <th style="width:11%; padding:7pt 8pt; border:1pt solid #334155; text-align:center; color:#ffffff; font-weight:bold;">📝 Постов</th>
                            <th style="width:11%; padding:7pt 8pt; border:1pt solid #334155; text-align:center; color:#ffffff; font-weight:bold;">❤️ Лайков</th>
                            <th style="width:11%; padding:7pt 8pt; border:1pt solid #334155; text-align:center; color:#ffffff; font-weight:bold;">🔄 Репостов</th>
                            <th style="width:13%; padding:7pt 8pt; border:1pt solid #334155; text-align:center; color:#ffffff; font-weight:bold;">👁️ Просмотров</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryRows}
                    </tbody>
                </table>

                <!-- Section 2: Detailed Publication Register -->
                <div style="font-size:12pt; font-weight:bold; color:#0077ff; border-left:4pt solid #0077ff; padding-left:8pt; margin-top:22pt; margin-bottom:10pt;">
                    Детализированный реестр публикаций по группам
                </div>
                ${groupsHtml}
            </div>
        </body>
        </html>
        `;

        try {
            const blob = new Blob(["\uFEFF" + docHtml], { type: 'application/msword;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const suffix = (state.targetsInfo && state.targetsInfo.length === 1) ? state.targetsInfo[0].id : 'report';
            link.setAttribute("download", `vk_official_report_${suffix}.doc`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } finally {
            if (elements.downloadDocBtn) {
                elements.downloadDocBtn.disabled = false;
                elements.downloadDocBtn.innerHTML = origBtnHtml;
            }
        }
    }

    // Export Standalone AAA Glassmorphic HTML Report with Montserrat Font
    function downloadHTML() {
        if (state.matchedPosts.length === 0) return;

        // Group posts by target (include ALL scanned targets so 0-post groups are listed)
        const groupsMap = {};
        if (state.targetsInfo && state.targetsInfo.length > 0) {
            state.targetsInfo.forEach(target => {
                groupsMap[target.id] = {
                    info: target,
                    posts: []
                };
            });
        }
        state.matchedPosts.forEach(post => {
            const tId = post.targetInfo.id;
            if (!groupsMap[tId]) {
                groupsMap[tId] = {
                    info: post.targetInfo,
                    posts: []
                };
            }
            groupsMap[tId].posts.push(post);
        });

        // 1. Generate Summary Table HTML
        let summaryRowsHtml = '';
        Object.values(groupsMap).forEach(group => {
            const postsCount = group.posts.length;
            let totalLikes = 0;
            let totalReposts = 0;
            let totalViews = 0;
            
            group.posts.forEach(post => {
                totalLikes += post.likes ? post.likes.count : 0;
                totalReposts += post.reposts ? post.reposts.count : 0;
                totalViews += post.views ? post.views.count : 0;
            });
            
            summaryRowsHtml += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 14px 16px; color: #ffffff; font-weight: 600;">${escapeHtml(group.info.name)}</td>
                    <td style="padding: 14px 16px;"><a href="${group.info.link}" target="_blank" style="color: #1e40af; text-decoration: none;">${group.info.link}</a></td>
                    <td style="padding: 14px 16px; text-align: center; color: #ffffff; font-weight: 700;">${postsCount}</td>
                    <td style="padding: 14px 16px; text-align: center; color: #ffffff;">❤️ ${totalLikes}</td>
                    <td style="padding: 14px 16px; text-align: center; color: #ffffff;">🔄 ${totalReposts}</td>
                    <td style="padding: 14px 16px; text-align: center; color: #ffffff;">👁️ ${totalViews ? formatViews(totalViews) : 0}</td>
                </tr>
            `;
        });

        const summaryTableHtml = `
        <div class="report-summary-section">
            <h3>Сводная статистика по источникам</h3>
            <div style="overflow-x: auto;">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Библиотека / Источник</th>
                            <th>Ссылка ВК</th>
                            <th style="width: 100px; text-align: center;">Постов</th>
                            <th style="width: 100px; text-align: center;">Всего ❤️</th>
                            <th style="width: 100px; text-align: center;">Всего 🔄</th>
                            <th style="width: 120px; text-align: center;">Всего 👁️</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
        `;

        // 2. Generate Groups and Post Cards HTML
        let groupsHtml = '';
        Object.values(groupsMap).forEach(group => {
            let postsCardsHtml = '';
            
            group.posts.forEach(post => {
                const postLink = `https://vk.com/wall${post.targetInfo.id}_${post.id}`;
                
                // Extract images
                let imagesHtml = '';
                if (post.attachments && post.attachments.length > 0) {
                    const photos = post.attachments.filter(att => att.type === 'photo').map(att => {
                        const sizes = att.photo.sizes;
                        const bestSize = sizes.find(s => s.type === 'x') || sizes.find(s => s.type === 'm') || sizes[sizes.length - 1];
                        return bestSize.url;
                    });
                    
                    if (photos.length > 0) {
                        imagesHtml += '<div class="post-images">';
                        photos.forEach(pUrl => {
                            imagesHtml += `<img class="post-img" src="${pUrl}" alt="Photo Attachment" onclick="window.open('${pUrl}', '_blank')">`;
                        });
                        imagesHtml += '</div>';
                    }
                }

                // Extract link attachments
                let linksHtml = '';
                if (post.attachments && post.attachments.length > 0) {
                    const links = post.attachments.filter(att => att.type === 'link').map(att => att.link);
                    if (links.length > 0) {
                        linksHtml += '<div class="post-links">';
                        links.forEach(l => {
                            linksHtml += `<a href="${l.url}" target="_blank" class="post-link-attachment">🔗 ${escapeHtml(l.title || l.url)}</a>`;
                        });
                        linksHtml += '</div>';
                    }
                }
                
                const likes = post.likes ? post.likes.count : 0;
                const reposts = post.reposts ? post.reposts.count : 0;
                const comments = post.comments ? post.comments.count : 0;
                const views = post.views ? post.views.count : 0;
                
                // Truncate text to 200 words
                let textHtml = '';
                const rawText = post.text || '';
                const words = rawText.trim().split(/\s+/);
                
                if (words.length <= 200) {
                    textHtml = `<div class="post-text">${linkifyText(escapeHtml(rawText || '[Без текста]'))}</div>`;
                } else {
                    const truncated = words.slice(0, 200).join(' ') + '...';
                    textHtml = `
                        <div class="post-text">
                            ${linkifyText(escapeHtml(truncated))}
                            <button class="read-more-btn" data-id="${post.id}">(подробнее)</button>
                        </div>
                    `;
                }
                
                postsCardsHtml += `
                    <div class="post-card">
                        <div class="post-card-top">
                            <div class="post-card-header">
                                <img class="card-author-avatar" src="${post.targetInfo.avatar}" alt="${escapeHtml(post.targetInfo.name)}">
                                <div class="card-author-info">
                                    <span class="card-author-name">${escapeHtml(post.targetInfo.name)}</span>
                                    <span class="card-post-date">${post.humanDate}</span>
                                </div>
                            </div>
                            ${textHtml}
                            ${imagesHtml}
                            ${linksHtml}
                        </div>
                        <div class="post-footer">
                            <div class="post-stats">
                                <span class="stat-item" title="Лайки">❤️ ${likes}</span>
                                <span class="stat-item" title="Репосты">🔄 ${reposts}</span>
                                <span class="stat-item" title="Комментарии">💬 ${comments}</span>
                                ${views ? `<span class="stat-item" title="Просмотры">👁️ ${formatViews(views)}</span>` : ''}
                            </div>
                            <a href="${postLink}" target="_blank" class="btn-open">Открыть в VK</a>
                        </div>
                    </div>
                `;
            });

            groupsHtml += `
                <div class="group-section">
                    <div class="group-header">
                        <span class="group-toggle-arrow">▶</span>
                        <img class="group-avatar" src="${group.info.avatar}" alt="${escapeHtml(group.info.name)}">
                        <div class="group-title-wrapper">
                            <h2><a href="${group.info.link}" target="_blank" onclick="event.stopPropagation();">${escapeHtml(group.info.name)}</a></h2>
                            <div class="group-count">Найдено совпадений: ${group.posts.length}</div>
                        </div>
                    </div>
                    <div class="posts-grid">
                        ${postsCardsHtml}
                    </div>
                </div>
            `;
        });

        // Helper to convert URLs in text to clickable links
        function linkifyText(text) {
            if (!text) return '';
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            return text.replace(urlRegex, function(url) {
                return '<a href="' + url + '" target="_blank" class="post-text-link">' + url + '</a>';
            });
        }

        // Serialize posts array to inject in the HTML
        const serializedPosts = state.matchedPosts.map(p => ({
            id: p.id,
            humanDate: p.humanDate,
            text: p.text || '',
            likes: p.likes ? p.likes.count : 0,
            reposts: p.reposts ? p.reposts.count : 0,
            comments: p.comments ? p.comments.count : 0,
            views: p.views ? p.views.count : 0,
            targetInfo: {
                id: p.targetInfo.id,
                name: p.targetInfo.name,
                avatar: p.targetInfo.avatar,
                link: p.targetInfo.link
            },
            attachments: p.attachments || []
        }));

        const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по поиску записей VK</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-main: #070b12;
            --bg-card: rgba(17, 24, 42, 0.85);
            --border-color: rgba(255, 255, 255, 0.09);
            --accent: #0077ff;
            --accent-glow: rgba(0, 242, 254, 0.35);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }
        body {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            margin: 0;
            padding: 2.5rem 1.5rem;
            line-height: 1.6;
            background-image: 
                radial-gradient(circle at 15% 15%, rgba(0, 119, 255, 0.12) 0%, transparent 45%),
                radial-gradient(circle at 85% 85%, rgba(0, 242, 254, 0.1) 0%, transparent 45%);
            background-attachment: fixed;
        }
        .container {
            max-width: 1240px;
            margin: 0 auto;
        }
        .report-header {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 18px;
            padding: 2.5rem;
            margin-bottom: 2.5rem;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(16px);
        }
        h1 {
            font-size: 2.2rem;
            font-weight: 800;
            margin: 0 0 1rem 0;
            background: linear-gradient(135deg, #ffffff 20%, #00f2fe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .meta-item {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 1.1rem;
        }
        .meta-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.3rem;
            font-weight: 600;
        }
        .meta-value {
            font-size: 0.98rem;
            font-weight: 600;
            color: #e2e8f0;
            word-break: break-all;
        }

        /* Summary Table Styling */
        .report-summary-section {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 18px;
            padding: 2rem;
            margin-bottom: 2.5rem;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(16px);
        }
        .report-summary-section h3 {
            font-size: 1.25rem;
            font-weight: 800;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 1.5rem;
            border-left: 4px solid var(--accent);
            padding-left: 12px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 650px;
        }
        .summary-table th {
            text-align: left;
            padding: 14px 16px;
            color: var(--text-muted);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
            border-bottom: 1px solid rgba(255,255,255,0.09);
        }
        .summary-table td {
            padding: 14px 16px;
            color: #ffffff;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            font-size: 0.95rem;
        }

        .group-section {
            margin-bottom: 3.5rem;
        }
        .group-header {
            display: flex;
            align-items: center;
            gap: 1.2rem;
            background: rgba(0, 119, 255, 0.08);
            border-left: 5px solid var(--accent);
            padding: 1.2rem 1.8rem;
            border-radius: 0 14px 14px 0;
            margin-bottom: 1.8rem;
            cursor: pointer;
            user-select: none;
            transition: background 0.2s;
        }
        .group-header:hover {
            background: rgba(0, 119, 255, 0.16);
        }
        .group-toggle-arrow {
            font-size: 0.95rem;
            color: #00f2fe;
            transition: transform 0.25s ease;
            font-weight: 800;
        }
        .group-section.expanded .group-toggle-arrow {
            transform: rotate(90deg);
        }
        .posts-grid {
            display: none;
        }
        .group-section.expanded .posts-grid {
            display: grid !important;
        }
        .group-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 2px solid var(--accent);
            object-fit: cover;
        }
        .group-title-wrapper h2 {
            font-size: 1.35rem;
            font-weight: 800;
            margin: 0;
        }
        .group-title-wrapper h2 a {
            color: #ffffff;
            text-decoration: none;
            transition: color 0.2s;
        }
        .group-title-wrapper h2 a:hover {
            color: #00f2fe;
        }
        .group-count {
            font-size: 0.88rem;
            color: var(--text-muted);
            margin-top: 0.2rem;
            font-weight: 500;
        }
        .posts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.8rem;
        }
        .post-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.6rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
            box-shadow: 0 6px 24px rgba(0,0,0,0.2);
        }
        .post-card:hover {
            transform: translateY(-4px);
            border-color: rgba(0, 119, 255, 0.35);
            box-shadow: 0 12px 36px rgba(0, 119, 255, 0.25);
        }
        
        .post-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            padding-bottom: 12px;
        }
        .card-author-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
        }
        .card-author-info {
            display: flex;
            flex-direction: column;
        }
        .card-author-name {
            font-weight: 700;
            font-size: 0.95rem;
            color: #ffffff;
        }
        .card-post-date {
            font-size: 0.78rem;
            color: var(--text-muted);
            margin-top: 2px;
        }
        
        .post-text {
            font-size: 0.95rem;
            margin-bottom: 1.2rem;
            white-space: pre-wrap;
            word-break: break-word;
            color: #e2e8f0;
            line-height: 1.6;
        }
        .post-text-link {
            color: #1e40af;
            text-decoration: underline;
        }
        .post-text-link:hover {
            color: #00f2fe;
        }
        .post-images {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
            gap: 8px;
            margin-top: 10px;
            margin-bottom: 12px;
        }
        .post-img {
            width: 100%;
            height: 135px;
            object-fit: cover;
            border-radius: 10px;
            cursor: pointer;
            transition: transform 0.2s, filter 0.2s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .post-img:hover {
            transform: scale(1.03);
            filter: brightness(1.1);
        }
        .post-links {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
        }
        .post-link-attachment {
            display: inline-block;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 10px;
            padding: 9px 14px;
            color: #1e40af;
            font-size: 0.88rem;
            font-weight: 500;
            text-decoration: none;
            transition: background 0.2s;
            word-break: break-all;
        }
        .post-link-attachment:hover {
            background: rgba(255, 255, 255, 0.09);
        }

        .post-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 1.1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
        }
        .post-stats {
            display: flex;
            gap: 1.2rem;
            font-size: 0.88rem;
            color: var(--text-muted);
            font-weight: 600;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .btn-open {
            background: rgba(0, 119, 255, 0.18);
            color: #1e40af;
            border: 1px solid rgba(0, 119, 255, 0.3);
            padding: 0.45rem 1rem;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-open:hover {
            background: rgba(0, 119, 255, 0.35);
            color: #ffffff;
            transform: translateY(-2px);
        }

        /* Standalone Post Modal Overlay */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            background: rgba(7, 11, 18, 0.85);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.25s ease;
        }
        .modal-overlay.active {
            opacity: 1;
            display: flex;
        }
        
        .modal-content {
            width: 75%;
            height: 75%;
            max-width: 980px;
            max-height: 85vh;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 20px;
            position: relative;
            padding: 2.8rem;
            box-shadow: 0 24px 60px rgba(0, 119, 255, 0.3);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        @media (max-width: 768px) {
            .modal-content {
                width: 92%;
                height: 92%;
                padding: 1.8rem;
            }
        }
        .modal-close {
            position: absolute;
            top: 18px;
            right: 22px;
            font-size: 2rem;
            font-weight: bold;
            color: var(--text-muted);
            cursor: pointer;
            transition: color 0.2s;
            z-index: 100;
        }
        .modal-close:hover {
            color: #ffffff;
        }
        
        .modal-post-header {
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 18px;
            margin-bottom: 22px;
        }
        .modal-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 2px solid var(--accent);
            object-fit: cover;
        }
        .modal-author-name {
            font-weight: 800;
            font-size: 1.15rem;
            color: #ffffff;
        }
        .modal-post-date {
            font-size: 0.82rem;
            color: var(--text-muted);
            margin-top: 3px;
        }
        .modal-post-text {
            font-size: 1.05rem;
            line-height: 1.65;
            white-space: pre-wrap;
            word-break: break-word;
            color: #f1f5f9;
            margin-bottom: 22px;
        }
        .modal-images {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 25px;
        }
        .modal-img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(0,0,0,0.35);
            transition: transform 0.2s;
        }
        .modal-img:hover {
            transform: scale(1.02);
        }
        
        .read-more-btn {
            background: none;
            border: none;
            color: #1e40af;
            cursor: pointer;
            padding: 0;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: underline;
            margin-top: 5px;
            display: inline-block;
            font-family: inherit;
        }
        .read-more-btn:hover {
            color: #00f2fe;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="report-header">
            <div class="report-official-badge">
                🏛️ МУНИЦИПАЛЬНОЕ БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ КУЛЬТУРЫ «ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА»
            </div>
            <h1>Официальный отчёт об анализе и мониторинге публикаций VK</h1>
            <div class="report-passport">
                <div class="passport-grid">
                    <div class="passport-cell passport-full">
                        <span class="passport-label">📌 ИСТОЧНИКИ МОНИТОРИНГА (ФИЛИАЛЫ И СООБЩЕСТВА):</span>
                        <div class="passport-value">${state.targetsInfo.map(t => '<span class="source-official-tag">' + (t.avatar ? '<img src="' + t.avatar + '" class="source-tag-avatar">' : '') + '<a href="' + t.link + '" target="_blank" class="source-tag-link">' + escapeHtml(t.name) + '</a></span>').join(' ')}</div>
                    </div>
                    <div class="passport-cell">
                        <span class="passport-label">📅 ПЕРИОД И ФИЛЬТР ДАТ:</span>
                        <div class="passport-value">${elements.reportDatesFilter.textContent}</div>
                    </div>
                    <div class="passport-cell">
                        <span class="passport-label">🔍 ПОИСКОВЫЙ ЗАПРОС:</span>
                        <div class="passport-value">${elements.reportSearchQuery.textContent}</div>
                    </div>
                    <div class="passport-cell">
                        <span class="passport-label">🕒 ДАТА И ВРЕМЯ ФОРМИРОВАНИЯ:</span>
                        <div class="passport-value">${elements.reportGenerationTime.textContent}</div>
                    </div>
                    <div class="passport-cell">
                        <span class="passport-label">📊 ВСЕГО ОБНАРУЖЕНО ЗАПИСЕЙ:</span>
                        <div class="passport-value highlight">${state.matchedCount}</div>
                    </div>
                </div>
            </div>
        </div>

        ${summaryTableHtml}
        
        ${groupsHtml}
    </div>

    <!-- Post Detail Modal -->
    <div id="post-modal" class="modal-overlay">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div id="modal-body"></div>
        </div>
    </div>

    <script>
        window.posts = ${JSON.stringify(serializedPosts)};

        const modal = document.getElementById('post-modal');
        const modalBody = document.getElementById('modal-body');
        const closeBtn = document.querySelector('.modal-close');

        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'a') return;
                header.closest('.group-section').classList.toggle('expanded');
            });
        });

        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const postId = btn.getAttribute('data-id');
                const post = window.posts.find(p => p.id == postId);
                if (post) openModal(post);
            });
        });

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });

        function openModal(post) {
            let imagesHtml = '';
            if (post.attachments && post.attachments.length > 0) {
                const photos = post.attachments.filter(att => att.type === 'photo').map(att => {
                    const sizes = att.photo.sizes;
                    const bestSize = sizes.find(s => s.type === 'x') || sizes.find(s => s.type === 'm') || sizes[sizes.length - 1];
                    return bestSize.url;
                });
                
                if (photos.length > 0) {
                    imagesHtml += '<div class="modal-images">';
                    photos.forEach(pUrl => {
                        imagesHtml += '<img class="modal-img" src="' + pUrl + '" alt="Photo Attachment" onclick="window.open(\'' + pUrl + '\', \'_blank\')">';
                    });
                    imagesHtml += '</div>';
                }
            }

            let linksHtml = '';
            if (post.attachments && post.attachments.length > 0) {
                const links = post.attachments.filter(att => att.type === 'link').map(att => att.link);
                if (links.length > 0) {
                    linksHtml += '<div class="post-links">';
                    links.forEach(l => {
                        linksHtml += '<a href="' + l.url + '" target="_blank" class="post-link-attachment">🔗 ' + escapeHtml(l.title || l.url) + '</a>';
                    });
                    linksHtml += '</div>';
                }
            }

            const postLink = 'https://vk.com/wall' + post.targetInfo.id + '_' + post.id;
            const viewsHtml = post.views ? '<span class="stat-item">👁️ ' + formatViews(post.views) + '</span>' : '';

            modalBody.innerHTML = 
                '<div class="modal-post-header">' +
                    '<img class="modal-avatar" src="' + post.targetInfo.avatar + '" alt="' + escapeHtml(post.targetInfo.name) + '">' +
                    '<div>' +
                        '<div class="modal-author-name">' + escapeHtml(post.targetInfo.name) + '</div>' +
                        '<div class="modal-post-date">' + post.humanDate + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-post-text">' + linkifyText(escapeHtml(post.text || '[Без текста]')) + '</div>' +
                imagesHtml +
                linksHtml +
                '<div class="modal-footer">' +
                    '<div class="post-stats">' +
                        '<span class="stat-item">❤️ ' + post.likes + '</span>' +
                        '<span class="stat-item">🔄 ' + post.reposts + '</span>' +
                        '<span class="stat-item" title="Комментарии">💬 ' + post.comments + '</span>' +
                        viewsHtml +
                    '</div>' +
                    '<a href="' + postLink + '" target="_blank" class="btn-open">Открыть в VK</a>' +
                '</div>';

            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 250);
        }

        function formatViews(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num;
        }

        function linkifyText(text) {
            if (!text) return '';
            const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
            return text.replace(urlRegex, function(url) {
                return '<a href="' + url + '" target="_blank" class="post-text-link">' + url + '</a>';
            });
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const suffix = state.targetsInfo.length === 1 ? state.targetsInfo[0].id : 'multiple';
        link.setAttribute("download", `vk_report_${suffix}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // =====================================================================
    // Toast notification
    // =====================================================================
    function showToast(msg, icon = 'check_circle', duration = 2800) {
        let t = document.getElementById('__agy_toast__');
        if (!t) {
            t = document.createElement('div');
            t.id = '__agy_toast__';
            t.className = 'agy-toast';
            document.body.appendChild(t);
        }
        t.innerHTML = `<span class="material-symbols-outlined">${icon}</span>${msg}`;
        t.classList.add('toast-show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('toast-show'), duration);
    }

    // =====================================================================
    // Search History
    // =====================================================================
    const HISTORY_KEY = 'vk_search_history_v1';
    function saveSearchHistory(entry) {
        try {
            let hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            hist = hist.filter(h => h.target !== entry.target || h.keyword !== entry.keyword);
            hist.unshift({ ...entry, ts: Date.now() });
            hist = hist.slice(0, 5);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
            renderSearchHistory();
        } catch(e) {}
    }
    function renderSearchHistory() {
        try {
            const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            const bar = elements.searchHistoryBar;
            const list = elements.shList;
            if (!bar || !list) return;
            if (hist.length === 0) { bar.classList.add('hidden'); return; }
            bar.classList.remove('hidden');
            list.innerHTML = hist.map((h, i) => `<button class="sh-item" data-idx="${i}"><span class="material-symbols-outlined">history</span>${escapeHtml(h.label || h.target)}</button>`).join('');
            list.querySelectorAll('.sh-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const h = hist[+btn.dataset.idx];
                    if (elements.targetInput) elements.targetInput.value = h.target || '';
                    if (elements.keywordInput) elements.keywordInput.value = h.keyword || '';
                    if (elements.excludeInput) elements.excludeInput.value = h.exclude || '';
                    if (elements.hashtagInput) elements.hashtagInput.value = h.hashtag || '';
                    showToast('Параметры поиска восстановлены', 'restore');
                });
            });
        } catch(e) {}
    }
    renderSearchHistory();
    if (elements.shClearBtn) {
        elements.shClearBtn.addEventListener('click', () => {
            localStorage.removeItem(HISTORY_KEY);
            renderSearchHistory();
        });
    }

    // =====================================================================
    // AND/OR toggle
    // =====================================================================
    if (elements.andOrToggle) {
        elements.andOrToggle.addEventListener('click', e => {
            const btn = e.target.closest('.and-or-btn');
            if (!btn) return;
            elements.andOrToggle.querySelectorAll('.and-or-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.andOrMode = btn.dataset.mode;
        });
    }

    // =====================================================================
    // Sort select
    // =====================================================================
    if (elements.cardsSortSelect) {
        elements.cardsSortSelect.addEventListener('change', () => {
            state.sortBy = elements.cardsSortSelect.value;
            updateFilteredVisualFeed();
        });
    }

    // =====================================================================
    // Infinite scroll
    // =====================================================================
    if (elements.scrollSentinel && 'IntersectionObserver' in window) {
        const sentinelObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && state.filteredPosts.length > 0) {
                const loaded = state.cardPage * state.cardPageSize;
                if (loaded < state.filteredPosts.length) appendCardPage();
            }
        }, { rootMargin: '200px' });
        sentinelObserver.observe(elements.scrollSentinel);
    }

    // =====================================================================
    // Download all photos as ZIP
    // =====================================================================
    if (elements.downloadPhotosBtn) {
        elements.downloadPhotosBtn.addEventListener('click', async () => {
            const posts = state.filteredPosts.length > 0 ? state.filteredPosts : state.matchedPosts;
            const SIZE_PRI = ['w','z','x','y','r','q','p','m','s'];
            const photos = [];
            posts.forEach(post => {
                (post.attachments || []).filter(a => a.type === 'photo' && a.photo).forEach((a, pi) => {
                    const ph = a.photo; let url = null;
                    if (Array.isArray(ph.sizes) && ph.sizes.length > 0) {
                        for (const t of SIZE_PRI) { const s = ph.sizes.find(s => s.type === t); if (s?.url) { url = s.url; break; } }
                        if (!url) url = ph.sizes[ph.sizes.length-1]?.url;
                    } else {
                        for (const k of ['photo_2560','photo_1280','photo_807','photo_604']) { if (ph[k]) { url = ph[k]; break; } }
                    }
                    if (url) photos.push({ url, name: `vk_${post.id}_${pi+1}.jpg` });
                });
            });
            if (photos.length === 0) { showToast('Нет фотографий в результатах', 'image_not_supported'); return; }
            if (typeof JSZip === 'undefined') { showToast('JSZip не загружен', 'error'); return; }
            elements.downloadPhotosBtn.disabled = true;
            const zip = new JSZip();
            let done = 0;
            showToast(`Собираю фото 0 / ${photos.length}…`, 'download', 60000);
            for (const ph of photos) {
                try {
                    let blob = null;
                    // 1. Try direct CORS fetch
                    try {
                        const resp = await fetch(ph.url, { mode: 'cors' });
                        if (resp.ok) {
                            const b = await resp.blob();
                            if (b && b.size > 0) blob = b;
                        }
                    } catch(directErr) {}

                    // 2. Fallback to server image proxy if direct fetch failed
                    if (!blob) {
                        try {
                            const proxyUrl = resolveApiUrl('api/vk-proxy.php?action=fetch_image&url=' + encodeURIComponent(ph.url));
                            const pResp = await fetch(proxyUrl);
                            if (pResp.ok) {
                                const b = await pResp.blob();
                                if (b && b.size > 0) blob = b;
                            }
                        } catch(proxyErr) {}
                    }

                    if (blob && blob.size > 0) {
                        zip.file(ph.name, blob);
                    }
                } catch(e) {}
                done++;
                if (done % 5 === 0 || done === photos.length) showToast(`Собираю фото ${done} / ${photos.length}…`, 'download', 60000);
            }

            if (Object.keys(zip.files).length === 0) {
                elements.downloadPhotosBtn.disabled = false;
                showToast('Не удалось загрузить фотографии (ошибка доступа к CDN)', 'error');
                return;
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `vk_photos_${Date.now()}.zip`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            elements.downloadPhotosBtn.disabled = false;
            showToast(`Скачано ${Object.keys(zip.files).length} фото в ZIP`, 'check_circle');
        });
    }

    // =====================================================================
    // Export CSV
    // =====================================================================
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', () => {
            const posts = state.filteredPosts.length > 0 ? state.filteredPosts : state.matchedPosts;
            if (posts.length === 0) { showToast('Нет данных для экспорта', 'warning'); return; }
            const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const headers = ['Дата','Группа','Текст (200 симв.)','Ссылка','Лайки','Репосты','Комментарии','Просмотры','ER %'];
            const rows = posts.map(p => {
                const views = extractNum(p.views) || 1;
                const er = (((extractNum(p.likes)+extractNum(p.reposts)+extractNum(p.comments))/views)*100).toFixed(2);
                return [esc(p.humanDate||''),esc(p.targetInfo?.canonicalName||p.targetInfo?.name||''),esc((p.text||'').slice(0,200)),esc(`https://vk.com/wall${p.targetInfo?.id}_${p.id}`),extractNum(p.likes),extractNum(p.reposts),extractNum(p.comments),extractNum(p.views),er].join(';');
            });
            const blob = new Blob(['\uFEFF'+headers.join(';')+'\n'+rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `vk_export_${Date.now()}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            showToast(`Экспортировано ${posts.length} записей`, 'table_view');
        });
    }

    // =====================================================================
    // Share link
    // =====================================================================
    if (elements.shareLinkBtn) {
        elements.shareLinkBtn.addEventListener('click', () => {
            const params = {
                target: elements.targetInput?.value.trim()||'',
                keyword: elements.keywordInput?.value.trim()||'',
                exclude: elements.excludeInput?.value.trim()||'',
                hashtag: elements.hashtagInput?.value.trim()||'',
                months: [...state.selectedMonths],
                yearStart: elements.yearStartInput?.value||'',
                yearEnd: elements.yearEndInput?.value||'',
                andOr: state.andOrMode,
                onlyPhotos: elements.onlyPhotosCheck?.checked ? '1' : '',
            };
            const hash = btoa(encodeURIComponent(JSON.stringify(params)));
            const url = location.href.split('#')[0] + '#s=' + hash;
            navigator.clipboard.writeText(url).then(() => {
                showToast('Ссылка скопирована в буфер обмена', 'link');
            }).catch(() => { prompt('Скопируйте ссылку:', url); });
        });
    }

    // Restore from hash on load
    (function restoreFromHash() {
        try {
            const m = location.hash.match(/^#s=(.+)/);
            if (!m) return;
            const p = JSON.parse(decodeURIComponent(atob(m[1])));
            if (p.target && elements.targetInput) elements.targetInput.value = p.target;
            if (p.keyword && elements.keywordInput) elements.keywordInput.value = p.keyword;
            if (p.exclude && elements.excludeInput) elements.excludeInput.value = p.exclude;
            if (p.hashtag && elements.hashtagInput) elements.hashtagInput.value = p.hashtag;
            if (p.yearStart && elements.yearStartInput) elements.yearStartInput.value = p.yearStart;
            if (p.yearEnd && elements.yearEndInput) elements.yearEndInput.value = p.yearEnd;
            if (p.andOr) { state.andOrMode = p.andOr; if (elements.andOrToggle) { elements.andOrToggle.querySelectorAll('.and-or-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === p.andOr)); } }
            if (p.onlyPhotos && elements.onlyPhotosCheck) elements.onlyPhotosCheck.checked = true;
            if (Array.isArray(p.months)) {
                state.selectedMonths = new Set(p.months.map(Number));
                document.querySelectorAll('.month-check').forEach(cb => { cb.checked = state.selectedMonths.has(+cb.dataset.month); cb.closest('.month-btn')?.classList.toggle('selected', cb.checked); });
            }
            showToast('Параметры поиска восстановлены из ссылки', 'link');
        } catch(e) {}
    })();

    // Universal Interactive Table Sorter
    (function initTableSorting() {
        const RU_MONTHS = {
            'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4,
            'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'сент': 8, 'окт': 9, 'ноя': 10, 'дек': 11
        };

        function parseCellVal(cell) {
            if (!cell) return { type: 'empty', val: 0 };
            const raw = (cell.dataset && cell.dataset.sortValue !== undefined ? cell.dataset.sortValue : (cell.textContent || '')).trim();
            if (!raw || raw === '—' || raw === '-' || raw === 'база') return { type: 'empty', val: 0 };
            if (/^[+-]?\d+(?:[.,]\d+)?\s*%$/.test(raw)) {
                const num = parseFloat(raw.replace(/\s+/g, '').replace(',', '.').replace('%', ''));
                return { type: 'num', val: isNaN(num) ? 0 : num };
            }
            const cleanedNum = raw.replace(/[\s\u00A0\u202F]+/g, '').replace(/−/g, '-').replace(/±0/, '0').replace(',', '.');
            if (/^[+-]?\d+(?:\.\d+)?$/.test(cleanedNum)) {
                const num = parseFloat(cleanedNum);
                return { type: 'num', val: isNaN(num) ? 0 : num };
            }
            const ruDateMatch = /^(\d{1,2})\s+([а-яё]+)[.,]?\s+(\d{4})/i.exec(raw);
            if (ruDateMatch) {
                const d = parseInt(ruDateMatch[1], 10);
                const mKey = ruDateMatch[2].slice(0, 3).toLowerCase();
                const m = RU_MONTHS[mKey] !== undefined ? RU_MONTHS[mKey] : 0;
                const y = parseInt(ruDateMatch[3], 10);
                return { type: 'date', val: new Date(y, m, d).getTime() };
            }
            const dotDateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(raw);
            if (dotDateMatch) {
                const d = parseInt(dotDateMatch[1], 10);
                const m = parseInt(dotDateMatch[2], 10) - 1;
                const y = parseInt(dotDateMatch[3], 10);
                return { type: 'date', val: new Date(y, m, d).getTime() };
            }
            return { type: 'str', val: raw.toLowerCase() };
        }

        document.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th) return;
            const table = th.closest('table');
            if (!table) return;
            if (th.dataset.noSort !== undefined || th.classList.contains('no-sort')) return;
            const title = th.textContent.trim();
            if (title === '№' || title === '#' || title === 'Действие' || title === 'Действия' || title === 'Ссылка' || title === 'Пост') return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows.length <= 1) return;

            const tr = th.parentElement;
            const colIndex = Array.from(tr.children).indexOf(th);
            if (colIndex < 0) return;

            let dir = th.classList.contains('th-sort-asc') ? 'desc' : (th.classList.contains('th-sort-desc') ? 'asc' : null);
            if (!dir) {
                const sampleVal = parseCellVal(rows[0].children[colIndex]);
                dir = (sampleVal.type === 'num' || sampleVal.type === 'date') ? 'desc' : 'asc';
            }

            Array.from(tr.children).forEach(otherTh => {
                otherTh.classList.remove('th-sort-asc', 'th-sort-desc');
                const ind = otherTh.querySelector('.sort-indicator');
                if (ind) ind.remove();
            });

            th.classList.add(dir === 'asc' ? 'th-sort-asc' : 'th-sort-desc');
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.innerHTML = dir === 'asc' ? '&#9650;' : '&#9660;';
            th.appendChild(indicator);

            const factor = dir === 'asc' ? 1 : -1;
            rows.sort((rowA, rowB) => {
                const a = parseCellVal(rowA.children[colIndex]);
                const b = parseCellVal(rowB.children[colIndex]);
                if (a.type === 'empty' && b.type === 'empty') return 0;
                if (a.type === 'empty') return 1;
                if (b.type === 'empty') return -1;
                if ((a.type === 'num' || a.type === 'date') && (b.type === 'num' || b.type === 'date')) {
                    return (a.val - b.val) * factor;
                }
                return String(a.val).localeCompare(String(b.val), 'ru', { numeric: true, sensitivity: 'base' }) * factor;
            });

            const fragment = document.createDocumentFragment();
            rows.forEach(r => fragment.appendChild(r));
            tbody.appendChild(fragment);

            const th0 = tr.children[0];
            if (th0 && (th0.textContent.trim() === '№' || th0.textContent.trim() === '#') && colIndex !== 0) {
                rows.forEach((r, idx) => {
                    const c0 = r.children[0];
                    if (c0 && /^\d+$/.test(c0.textContent.trim())) c0.textContent = String(idx + 1);
                });
            }
        });
    })();

    // Expose for testing and verification
    window.__VK_APP__ = {
        state, elements, CANONICAL_BRANCHES,
        renderResults, applyPeriodPreset, renderAnalyticsTab, renderSummaryTab
    };
});

