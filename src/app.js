/**
 * src/app.js — Main Application Orchestrator (AURORA Design System)
 * Разработка: Амброзиев О.А.
 */

import {
    callVkApi,
    callVkExecuteBatch,
    getServerTokenStatus,
    resolveTarget,
    authorCache,
    cacheAuthor,
    getAuthorFromCache,
    resolveMissingAuthors,
    resolveApiUrl
} from './api.js?v=4.19.0';

import {
    buildBranchAdvice,
    renderAdviceTab
} from './advice.js?v=4.19.0';

import {
    initAiTab,
    buildAiSnapshot
} from './ai.js?v=4.19.0';

import {
    fetchHistory,
    saveSnapshots,
    resetHistory,
    buildGroupSeries,
    computeTrends,
    snapshotsFromScan,
    renderSubscribersTab
} from './subscribers.js?v=4.19.0';

import {
    fetchUpdaterStatus,
    checkForUpdates,
    applyUpdate,
    getSavedUpdateToken,
    saveUpdateToken,
    shortSha
} from './updater.js?v=4.19.0';

import {
    CANONICAL_BRANCHES,
    findCanonicalBranch,
    enrichTargetWithCanonical,
    renderBranchAvatarHtml,
    sortBranchesCanonically,
    isDogAvatarUrl,
    declOfNum,
    escapeHtml
} from './branches.js?v=4.19.0';

import {
    calculateKPIs,
    calculateGroupStats,
    detectCrossPosts,
    renderCrossPostingSection,
    formatViews,
    extractNum
} from './analytics.js?v=4.19.0';

import {
    createPostCard,
    createSkeletonCard,
    openPostModal,
    closePostModal,
    formatHumanDate,
    linkifyText,
    copyPostToClipboard,
    truncateToSentences,
    resolveRepostAuthor
} from './render.js?v=4.19.0';

import {
    exportToCsv,
    exportToJson,
    exportToDocx,
    exportToHtmlReport,
    exportRatingToCsv,
    exportPhotosZip,
    openPrintReport
} from './export.js?v=4.19.0';

import { initTableSorting, makeTableSortable } from './tablesort.js?v=4.19.0';
import { CosmicUniverse } from './cosmic.js?v=4.19.0';

import {
    initPromoModal,
    openPromoModal,
    closePromoModal
} from './promo.js?v=4.19.0';

import {
    renderRadarSection
} from './radar.js?v=4.19.0';

import { Space3D } from './space3d.js?v=4.19.0';
import { SpaceWarp } from './space_warp.js?v=4.19.0';
import { SpaceAudio } from './space_audio.js?v=4.19.0';
import { Mascot } from './mascot.js?v=4.19.0';

/** Единая версия приложения (синхронизирована с .version.json) */
export const APP_VERSION = '4.19.0';

function initApp() {

    // =========================================================================
    // 1. Application State
    // =========================================================================
    const state = {
        // Сервисный ключ хранится на сервере (api/config.php), либо задаётся локально в браузере
        token: (function() {
            try { return localStorage.getItem('vkws_custom_token') || ''; } catch (e) { return ''; }
        })(),
        isScanning: false,
        shouldCancel: false,
        targetInfo: null,
        targetsInfo: [],
        libraryBranches: [],
        libraryBranchesList: [],
        useBranches: true,
        scannedCount: 0,
        matchedCount: 0,
        totalCount: 0,
        matchedPosts: [],
        filteredPosts: [],
        months: [
            { id: 1, name: 'Янв' }, { id: 2, name: 'Фев' }, { id: 3, name: 'Мар' }, { id: 4, name: 'Апр' },
            { id: 5, name: 'Май' }, { id: 6, name: 'Июн' }, { id: 7, name: 'Июл' }, { id: 8, name: 'Авг' },
            { id: 9, name: 'Сен' }, { id: 10, name: 'Окт' }, { id: 11, name: 'Ноя' }, { id: 12, name: 'Дек' }
        ],
        selectedMonths: new Set(),
        activeBranchFilter: null,
        activeHashtagFilter: null,
        activeChartMetric: 'posts',
        showcaseFilter: 'all',
        showcaseSort: 'canonical',
        lastGroupsStats: [],
        crossPostingData: null,
        sortBy: 'date-desc',
        cardPage: 0,
        cardPageSize: 24,
        andOrMode: 'or',
        lastDayFilter: 'all',
        lastYearStart: null,
        lastYearEnd: null,
        lastSelectedMonths: null,
        // v3.4: подписчики, советы и обновления
        subsHistory: [],
        updateAvailable: false,
        updaterStatus: null
    };

    // =========================================================================
    // 2. DOM Elements Lookup
    // =========================================================================
    const elements = {
        // Settings & Server Key Status
        tokenStatus: document.getElementById('token-status'),
        customTokenInput: document.getElementById('custom-token-input'),
        saveTokenBtn: document.getElementById('save-token-btn'),
        clearTokenBtn: document.getElementById('clear-token-btn'),
        space3dBtn: document.getElementById('space-3d-btn'),
        toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        settingsPanel: document.getElementById('settings-panel'),

        // Search Form
        searchForm: document.getElementById('search-form'),
        branchSelect: document.getElementById('branch-select'),
        branchesCountBadge: document.getElementById('branches-count-badge'),
        branchesToggle: document.getElementById('branches-toggle') || document.getElementById('use-branches-toggle'),
        useBranchesToggle: document.getElementById('branches-toggle') || document.getElementById('use-branches-toggle'),
        branchesInputWrap: document.getElementById('branches-input-wrap'),
        targetInput: document.getElementById('target-input') || document.getElementById('vk-target-input'),
        keywordInput: document.getElementById('keyword-input') || document.getElementById('vk-keyword-input'),
        excludeInput: document.getElementById('exclude-input') || document.getElementById('exclude-words-input'),
        excludeWordsInput: document.getElementById('exclude-input') || document.getElementById('exclude-words-input'),
        hashtagInput: document.getElementById('hashtag-input'),
        minLikesInput: document.getElementById('min-likes-input'),
        minViewsInput: document.getElementById('min-views-input'),
        andOrBtns: document.querySelectorAll('.and-or-btn'),
        andOrRadios: document.querySelectorAll('input[name="kw-logic"]'),

        // 6 Content Filters
        onlyPhotosCheck: document.getElementById('only-photos-check'),
        onlyVideosCheck: document.getElementById('only-videos-check'),
        excludeRepostsCheck: document.getElementById('exclude-reposts-check') || document.getElementById('filter-exclude-reposts'),
        onlyRepostsCheck: document.getElementById('only-reposts-check') || document.getElementById('filter-only-reposts'),
        onlyPollsCheck: document.getElementById('only-polls-check') || document.getElementById('filter-only-polls'),
        onlyLinksCheck: document.getElementById('only-links-check') || document.getElementById('filter-only-links'),

        // Date & Period
        monthsContainer: document.getElementById('months-container'),
        periodPresetsBar: document.getElementById('period-presets-bar'),
        selectAllMonthsBtn: document.getElementById('select-all-months'),
        clearMonthsBtn: document.getElementById('clear-months'),
        daySelect: document.getElementById('day-select'),
        yearStartInput: document.getElementById('year-start'),
        yearEndInput: document.getElementById('year-end'),

        // Progress & Controls
        submitBtn: document.getElementById('submit-search-btn') || document.getElementById('submit-btn'),
        searchModalOverlay: document.getElementById('search-modal-overlay') || document.getElementById('progress-section'),
        progressContainer: document.getElementById('search-modal-overlay') || document.getElementById('progress-section'),
        progressBar: document.getElementById('progress-bar-fill') || document.getElementById('progress-bar'),
        progressTitle: document.getElementById('progress-title'),
        progressStatusMsg: document.getElementById('progress-status-msg'),
        progressPercent: document.getElementById('progress-percent'),
        progressStats: document.getElementById('progress-stats'),
        statGroups: document.getElementById('stat-groups'),
        statScanned: document.getElementById('stat-scanned'),
        statMatched: document.getElementById('stat-matched'),
        statSpeed: document.getElementById('stat-speed'),
        cancelSearchBtn: document.getElementById('cancel-scan-btn') || document.getElementById('cancel-search-btn'),
        viewResultsBtn: document.getElementById('view-results-btn') || document.getElementById('modal-close-btn'),
        modalSearchCloseBtn: document.getElementById('modal-search-close'),
        searchCompletedActions: document.getElementById('search-completed-actions'),
        modalMatchedBadge: document.getElementById('modal-matched-badge'),

        // Results Container & Tabs
        resultsContainer: document.getElementById('results-section') || document.getElementById('results-container'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        countFeed: document.getElementById('count-visual') || document.getElementById('count-feed'),
        countPassport: document.getElementById('count-report') || document.getElementById('count-passport'),
        countAnalytics: document.getElementById('count-analytics'),
        countSummary: document.getElementById('count-summary'),
        promoModalBtn: document.getElementById('promo-modal-btn'),

        // Tab 1: Visual Feed & Toolbar
        postsGrid: document.getElementById('posts-grid'),
        sourcesShowcaseSection: document.getElementById('sources-showcase-section'),
        sourcesShowcaseGrid: document.getElementById('sources-showcase-grid'),
        showcaseSortSelect: document.getElementById('showcase-sort-select'),
        showcaseFilterBtns: document.querySelectorAll('.showcase-filter-btn'),
        showcaseCountAll: document.getElementById('showcase-count-all'),
        showcaseCountWithPosts: document.getElementById('showcase-count-with-posts'),
        activeBranchBanner: document.getElementById('active-branch-banner'),
        activeBranchName: document.getElementById('active-branch-name'),
        activeBranchCount: document.getElementById('active-branch-count'),
        resetBranchFilterBtn: document.getElementById('reset-branch-filter-btn'),
        cardsSortSelect: document.getElementById('cards-sort-select'),
        downloadPhotosBtn: document.getElementById('download-photos-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        shareLinkBtn: document.getElementById('share-link-btn'),
        scrollSentinel: document.getElementById('scroll-sentinel'),

        // Tab 2: Passport
        reportDocument: document.getElementById('report-document'),
        reportSourceName: document.getElementById('report-source-name'),
        reportTotalMatches: document.getElementById('report-total-matches'),
        reportDatesFilter: document.getElementById('report-dates-filter'),
        reportSearchQuery: document.getElementById('report-search-query'),
        reportGenerationTime: document.getElementById('report-generation-time'),
        reportTablesContainer: document.getElementById('report-tables-container'),
        toggleAllReportBtn: document.getElementById('toggle-all-report-btn'),
        copyReportBtn: document.getElementById('copy-report-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        downloadJsonBtn: document.getElementById('download-json-btn'),
        downloadDocBtn: document.getElementById('download-doc-btn'),
        downloadHtmlBtn: document.getElementById('download-html-btn'),
        printReportBtn: document.getElementById('print-report-btn'),
        quickDocBtn: document.getElementById('quick-doc-btn'),
        quickPrintBtn: document.getElementById('quick-print-btn'),

        // Tab 3: Analytics & Cross-Posting
        exportRatingCsvBtn: document.getElementById('export-rating-csv-btn'),
        kpiNormCount: document.getElementById('kpi-norm-count'),
        kpiTotalBranches: document.getElementById('kpi-total-branches'),
        kpiWarningCount: document.getElementById('kpi-warning-count'),
        kpiDangerCount: document.getElementById('kpi-danger-count'),
        kpiAvgEr: document.getElementById('kpi-avg-er'),
        kpiAvgReactions: document.getElementById('kpi-avg-reactions'),
        analyticsChartContainer: document.getElementById('analytics-chart-container'),
        chartMetricBtns: document.querySelectorAll('#chart-metric-selector .segment-btn'),
        analyticsRatingTbody: document.getElementById('analytics-rating-tbody'),
        crosspostingClustersContainer: document.getElementById('crossposting-clusters-container'),
        crosspostStatsChip: document.getElementById('crosspost-stats-chip'),

        // Tab 4: Summary Note & Meta
        methodistMemoTextarea: document.getElementById('methodist-memo-textarea'),
        copyMemoBtn: document.getElementById('copy-memo-btn'),
        copyMemoText: document.getElementById('copy-memo-text'),
        summaryHashtagsList: document.getElementById('summary-hashtags-list'),
        summaryLinksList: document.getElementById('summary-links-list'),
        hashtagCloudContainer: document.getElementById('hashtag-cloud-container'),
        hashtagsTbody: document.getElementById('hashtags-tbody'),
        hashtagsTotalCount: document.getElementById('hashtags-total-count'),
        linksTbody: document.getElementById('links-tbody'),
        linksTotalCount: document.getElementById('links-total-count'),

        // Tab 5 & 6: Советы филиалам и Подписчики (v3.4)
        adviceTabContent: document.getElementById('advice-tab-content'),
        subscribersTabContent: document.getElementById('subscribers-tab-content'),
        countAdvice: document.getElementById('count-advice'),

        // Настройки приложения и самообновление (v3.4)
        appSettingsBtn: document.getElementById('app-settings-btn'),
        appSettingsOverlay: document.getElementById('app-settings-overlay'),
        appSettingsClose: document.getElementById('app-settings-close'),
        settingsKeyStatus: document.getElementById('settings-key-status'),
        settingsOpenKeyPanel: document.getElementById('settings-open-key-panel'),
        settingsVersionBadge: document.getElementById('settings-version-badge'),
        settingsCommitBadge: document.getElementById('settings-commit-badge'),
        settingsRepoLink: document.getElementById('settings-repo-link'),
        settingsUpdateStatus: document.getElementById('settings-update-status'),
        settingsCheckUpdateBtn: document.getElementById('settings-check-update-btn'),
        settingsApplyUpdateBtn: document.getElementById('settings-apply-update-btn'),
        settingsUpdateToken: document.getElementById('settings-update-token'),
        settingsResetSubsBtn: document.getElementById('settings-reset-subs-btn'),
        settingsFootVersion: document.getElementById('settings-foot-version'),
        updateDot: document.getElementById('update-dot'),

        // Settings Auth Modal (1Radio14881!)
        settingsAuthOverlay: document.getElementById('settings-auth-overlay'),
        settingsAuthClose: document.getElementById('settings-auth-close'),
        settingsAuthCancel: document.getElementById('settings-auth-cancel'),
        settingsAuthForm: document.getElementById('settings-auth-form'),
        settingsAuthInput: document.getElementById('settings-auth-input'),
        settingsAuthError: document.getElementById('settings-auth-error'),

        // Forced Update Modal (?update)
        forceUpdateOverlay: document.getElementById('force-update-overlay'),
        forceUpdateClose: document.getElementById('force-update-close'),
        forceUpdateCancel: document.getElementById('force-update-cancel'),
        forceUpdateForm: document.getElementById('force-update-form'),
        forceUpdateInput: document.getElementById('force-update-input'),
        forceUpdateStatus: document.getElementById('force-update-status'),
        forceUpdateSubmit: document.getElementById('force-update-submit'),
        forceUpdateBtnText: document.getElementById('force-update-btn-text'),

        // Floating Scroll-To-Top
        scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
        scrollProgressCircle: document.getElementById('scroll-progress-circle'),

        // Modals
        postModal: document.getElementById('post-modal'),
        postModalContent: document.getElementById('post-modal-content'),
        postModalClose: document.getElementById('post-modal-close'),

        // Search History
        searchHistoryBar: document.getElementById('search-history-bar'),
        shList: document.getElementById('sh-list'),
        shClearBtn: document.getElementById('sh-clear-btn')
    };

    // =========================================================================
    // 3. Form & Inputs Initialization
    // =========================================================================
    function initFormInputs() {
        const currentYear = new Date().getFullYear();
        // v3.4.1: по умолчанию сканируем последние 2 года — это в разы быстрее;
        // глубокий архив доступен через явное расширение диапазона лет.
        if (elements.yearStartInput) elements.yearStartInput.value = currentYear - 1;
        if (elements.yearEndInput) elements.yearEndInput.value = currentYear;

        // Day select options
        if (elements.daySelect) {
            elements.daySelect.innerHTML = '<option value="all">Все дни месяца</option>';
            for (let i = 1; i <= 31; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `${i}-е число`;
                elements.daySelect.appendChild(opt);
            }
        }

        // Months grid — Original glassmorphic month-badge pills
        if (elements.monthsContainer) {
            elements.monthsContainer.innerHTML = '';
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
        }

        // Select all months
        if (elements.selectAllMonthsBtn) {
            elements.selectAllMonthsBtn.addEventListener('click', () => {
                state.selectedMonths = new Set(state.months.map(m => m.id));
                document.querySelectorAll('.month-badge').forEach(b => b.classList.add('selected'));
                document.querySelectorAll('.preset-pill').forEach(p => {
                    p.classList.toggle('active', p.getAttribute('data-preset') === 'year');
                });
            });
        }

        // Clear months
        if (elements.clearMonthsBtn) {
            elements.clearMonthsBtn.addEventListener('click', () => {
                state.selectedMonths.clear();
                document.querySelectorAll('.month-badge').forEach(b => b.classList.remove('selected'));
                document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
            });
        }

        // AND/OR keyword mode
        if (elements.andOrBtns) {
            elements.andOrBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    elements.andOrBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.andOrMode = btn.dataset.mode;
                });
            });
        }

        // Period presets toolbar (.preset-pill)
        if (elements.periodPresetsBar) {
            elements.periodPresetsBar.querySelectorAll('.preset-pill').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const presetKey = btn.getAttribute('data-preset');
                    applyPeriodPreset(presetKey);
                });
            });
        }

        // 6 Content Filters — UI visual card sync & mutual exclusivity
        const contentFilterCheckboxes = [
            elements.onlyPhotosCheck,
            elements.onlyVideosCheck,
            elements.excludeRepostsCheck,
            elements.onlyRepostsCheck,
            elements.onlyPollsCheck,
            elements.onlyLinksCheck
        ].filter(Boolean);

        contentFilterCheckboxes.forEach(cb => {
            const card = cb.closest('.adv-filter-card');
            const syncCard = () => {
                if (card) card.classList.toggle('is-checked', cb.checked);
            };
            cb.addEventListener('change', syncCard);
            syncCard();
        });

        // Mutual Exclusivity between «Без репостов» and «Только репосты»
        if (elements.excludeRepostsCheck && elements.onlyRepostsCheck) {
            elements.excludeRepostsCheck.addEventListener('change', () => {
                if (elements.excludeRepostsCheck.checked) {
                    elements.onlyRepostsCheck.checked = false;
                    elements.onlyRepostsCheck.closest('.adv-filter-card')?.classList.remove('is-checked');
                }
            });
            elements.onlyRepostsCheck.addEventListener('change', () => {
                if (elements.onlyRepostsCheck.checked) {
                    elements.excludeRepostsCheck.checked = false;
                    elements.excludeRepostsCheck.closest('.adv-filter-card')?.classList.remove('is-checked');
                }
            });
        }
    }

    function applyPeriodPreset(key) {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1; // 1-12

        let targetMonths = [];
        let startYear = curYear;
        let endYear = curYear;

        switch (key) {
            case 'current-month':
                targetMonths = [curMonth];
                break;
            case 'prev-month':
            case 'last-month':
                if (curMonth === 1) {
                    targetMonths = [12];
                    startYear = curYear - 1;
                    endYear = curYear - 1;
                } else {
                    targetMonths = [curMonth - 1];
                }
                break;
            case 'q1': targetMonths = [1, 2, 3]; break;
            case 'q2': targetMonths = [4, 5, 6]; break;
            case 'q3': targetMonths = [7, 8, 9]; break;
            case 'q4': targetMonths = [10, 11, 12]; break;
            case 'h1':
            case 'half1':
                targetMonths = [1, 2, 3, 4, 5, 6];
                break;
            case 'h2':
            case 'half2':
                targetMonths = [7, 8, 9, 10, 11, 12];
                break;
            case 'year':
            case 'full-year':
                targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                break;
            default:
                targetMonths = [];
        }

        if (elements.yearStartInput) elements.yearStartInput.value = startYear;
        if (elements.yearEndInput) elements.yearEndInput.value = endYear;

        state.selectedMonths = new Set(targetMonths);

        // Update month-badge elements
        document.querySelectorAll('.month-badge').forEach(badge => {
            const mId = parseInt(badge.dataset.id, 10);
            badge.classList.toggle('selected', state.selectedMonths.has(mId));
        });

        // Update preset pills active state (contour glow)
        document.querySelectorAll('.preset-pill').forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-preset') === key);
        });
    }

    // =========================================================================
    // 4. Server Service Key Status UI
    //    Ключ хранится на сервере — здесь только индикатор его доступности.
    // =========================================================================
    async function updateServerKeyUI() {
        showTokenStatus('Проверка подключения к VK API…', 'loading');
        const status = await getServerTokenStatus();

        if (elements.customTokenInput) {
            elements.customTokenInput.value = state.token;
        }

        if (status.reachable && status.configured) {
            const note = status.fallback ? ' (включая резервный)' : '';
            if (state.token) {
                showTokenStatus(`Серверный PHP-прокси активен${note}. Задан пользовательский ключ.`, 'success');
            } else {
                showTokenStatus(`Серверный PHP-прокси активен${note} — сервисный ключ настроен`, 'success');
            }
        } else if (status.reachable) {
            if (state.token) {
                showTokenStatus('Серверный PHP-прокси активен (пользовательский ключ)', 'success');
            } else {
                showTokenStatus('Серверный PHP-прокси активен (встроенный проверенный ключ)', 'success');
            }
        } else {
            // Standalone mode / static hosting (without PHP)
            if (state.token) {
                showTokenStatus('Автономный режим (прямой VK API): пользовательский ключ активен', 'success');
            } else {
                showTokenStatus('Автономный режим (прямой VK API): встроенный сервисный ключ активен', 'success');
            }
        }
    }

    function showTokenStatus(msg, className) {
        if (!elements.tokenStatus) return;
        elements.tokenStatus.textContent = msg;
        elements.tokenStatus.className = 'status-indicator ' + className;
    }

    function toggleSettings() {
        elements.settingsPanel?.classList.toggle('collapsed');
    }

    // Запуск 3D Космо-пространства по одинарному клику на кнопку «Пространство 3D»
    const spaceBadge = elements.space3dBtn?.querySelector('.space-badge-pulse');

    const resetSpaceBtn = () => {
        if (elements.space3dBtn) {
            elements.space3dBtn.classList.remove('click-step-1', 'click-step-2', 'warp-arming');
        }
        if (spaceBadge) {
            spaceBadge.textContent = '3D';
        }
    };

    window.addEventListener('aurora:space3d-closed', resetSpaceBtn);
    window.addEventListener('aurora:warp-finished', resetSpaceBtn);

    if (elements.space3dBtn) {
        elements.space3dBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Если 3D уже открыто — закрываем его сразу
            if (Space3D.isOpen) {
                Space3D.close();
                resetSpaceBtn();
                return;
            }

            // Если уже идёт гиперпереход — предотвращаем повторные срабатывания
            if (SpaceWarp.isWarping) return;

            // Одинарный клик: немедленный вход в гиперпространство
            elements.space3dBtn.classList.add('warp-arming');
            if (spaceBadge) spaceBadge.textContent = 'WARP!';
            showToast('Вход в гиперпространство!', 'rocket_launch');

            SpaceWarp.start(() => {
                Space3D.open({ fromWarp: true });
                resetSpaceBtn();
            });
        });
    }

    // Горячая клавиша Alt+S или F8 для входа в 3D Космо-пространство
    document.addEventListener('keydown', (e) => {
        if ((e.altKey && (e.key === 's' || e.key === 'ы' || e.key === 'S')) || e.key === 'F8') {
            e.preventDefault();
            if (Space3D.isOpen) {
                Space3D.close();
                resetSpaceBtn();
            } else {
                if (SpaceWarp.isWarping) return;
                elements.space3dBtn?.classList.add('warp-arming');
                if (spaceBadge) spaceBadge.textContent = 'WARP!';
                showToast('Вход в гиперпространство!', 'rocket_launch');
                SpaceWarp.start(() => {
                    Space3D.open({ fromWarp: true });
                    resetSpaceBtn();
                });
            }
        }
    });

    if (elements.toggleSettingsBtn) elements.toggleSettingsBtn.addEventListener('click', () => openSettingsWithAuth(toggleSettings));
    if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', toggleSettings);

    if (elements.saveTokenBtn) {
        elements.saveTokenBtn.addEventListener('click', async () => {
            const val = elements.customTokenInput ? elements.customTokenInput.value.trim() : '';
            state.token = val;
            try {
                if (val) {
                    localStorage.setItem('vkws_custom_token', val);
                    showToast('Ключ сохранён в браузере', 'verified_user');
                } else {
                    localStorage.removeItem('vkws_custom_token');
                    showToast('Ключ сброшен (используется серверный)', 'restart_alt');
                }
            } catch (e) {}
            await updateServerKeyUI();
        });
    }

    if (elements.clearTokenBtn) {
        elements.clearTokenBtn.addEventListener('click', async () => {
            if (elements.customTokenInput) elements.customTokenInput.value = '';
            state.token = '';
            try {
                localStorage.removeItem('vkws_custom_token');
                showToast('Сброшено на ключ по умолчанию', 'restart_alt');
            } catch (e) {}
            await updateServerKeyUI();
        });
    }

    // =========================================================================
    // 5. Branch Catalog Loading
    // =========================================================================
    function populateBranchSelectOptions(branchesList) {
        if (!elements.branchSelect) return;
        const currentVal = elements.branchSelect.value;
        elements.branchSelect.innerHTML = `
            <option value="">— Выберите филиал библиотеки (или введите ниже ссылку вручную) —</option>
            <option value="all">Все 16 филиалов одновременно (пакетный поиск)</option>
        `;
        const group = document.createElement('optgroup');
        group.label = 'Филиалы библиотек г. Владимира (16 источников)';
        branchesList.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.link;
            opt.textContent = `${b.canonicalName || b.name}${b.address ? ` (${b.address})` : ''}`;
            group.appendChild(opt);
        });
        elements.branchSelect.appendChild(group);
        if (currentVal) {
            elements.branchSelect.value = currentVal;
        }
    }

    async function loadLibraryBranches() {
        try {
            const res = await fetch(resolveApiUrl('branches_cache.json'));
            if (!res.ok) throw new Error('Branches cache fetch failed');
            const data = await res.json();
            const branchesMap = new Map();

            data.forEach(item => {
                const name = (item.branch_name || '').replace(/\u00a0/g, ' ').trim();
                if (item.vk_links && item.vk_links.length > 0) {
                    item.vk_links.forEach(link => {
                        const cleanLink = link.trim().replace(/\/$/, '');
                        if (!branchesMap.has(cleanLink)) {
                            branchesMap.set(cleanLink, {
                                name,
                                link: cleanLink,
                                url: item.branch_url || ''
                            });
                        }
                    });
                }
            });

            branchesMap.forEach(b => enrichTargetWithCanonical(b));
            const branchesList = sortBranchesCanonically(Array.from(branchesMap.values()));

            state.libraryBranches = branchesList.map(b => b.link);
            state.libraryBranchesList = branchesList;

            populateBranchSelectOptions(branchesList);

            if (elements.branchesCountBadge && state.libraryBranches.length > 0) {
                elements.branchesCountBadge.textContent = `${state.libraryBranches.length} филиалов`;
                elements.branchesCountBadge.style.display = 'inline-block';
            }

            // Sync initial UI state for 16 branches
            if (state.useBranches || elements.branchesToggle?.checked) {
                state.useBranches = true;
                if (elements.branchesToggle) elements.branchesToggle.checked = true;
                if (elements.branchSelect) elements.branchSelect.value = 'all';
                if (elements.targetInput) {
                    elements.targetInput.disabled = true;
                    elements.targetInput.required = false;
                    elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
                    elements.targetInput.style.opacity = '0.6';
                }
            }
        } catch (err) {
            console.error('Error loading branch catalog:', err);
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

                populateBranchSelectOptions(fallbackList);

                if (elements.branchesCountBadge && state.libraryBranches.length > 0) {
                    elements.branchesCountBadge.textContent = `${state.libraryBranches.length} филиалов`;
                    elements.branchesCountBadge.style.display = 'inline-block';
                }

                if (state.useBranches || elements.branchesToggle?.checked) {
                    state.useBranches = true;
                    if (elements.branchesToggle) elements.branchesToggle.checked = true;
                    if (elements.branchSelect) elements.branchSelect.value = 'all';
                    if (elements.targetInput) {
                        elements.targetInput.disabled = true;
                        elements.targetInput.required = false;
                        elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
                        elements.targetInput.style.opacity = '0.6';
                    }
                }
            }
        }
    }

    if (elements.branchSelect) {
        elements.branchSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'all') {
                state.useBranches = true;
                if (elements.branchesToggle) elements.branchesToggle.checked = true;
                if (elements.targetInput) {
                    elements.targetInput.disabled = true;
                    elements.targetInput.required = false;
                    elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
                    elements.targetInput.style.opacity = '0.6';
                }
            } else if (val) {
                state.useBranches = false;
                if (elements.branchesToggle) elements.branchesToggle.checked = false;
                if (elements.targetInput) {
                    elements.targetInput.disabled = false;
                    elements.targetInput.required = true;
                    elements.targetInput.value = val;
                    elements.targetInput.style.opacity = '1';
                    elements.targetInput.focus();
                }
            } else {
                state.useBranches = false;
                if (elements.branchesToggle) elements.branchesToggle.checked = false;
                if (elements.targetInput) {
                    elements.targetInput.disabled = false;
                    elements.targetInput.required = true;
                    elements.targetInput.value = '';
                    elements.targetInput.style.opacity = '1';
                }
            }
        });
    }

    if (elements.branchesToggle) {
        elements.branchesToggle.addEventListener('change', (e) => {
            const checked = e.target.checked;
            state.useBranches = checked;
            if (checked) {
                if (elements.branchSelect) elements.branchSelect.value = 'all';
                if (elements.targetInput) {
                    elements.targetInput.disabled = true;
                    elements.targetInput.required = false;
                    elements.targetInput.value = '[Поиск по всем 16 филиалам библиотек Владимира]';
                    elements.targetInput.style.opacity = '0.6';
                }
            } else {
                if (elements.branchSelect && elements.branchSelect.value === 'all') {
                    elements.branchSelect.value = '';
                }
                if (elements.targetInput) {
                    elements.targetInput.disabled = false;
                    elements.targetInput.required = true;
                    elements.targetInput.value = '';
                    elements.targetInput.style.opacity = '1';
                }
            }
        });
    }

    // =========================================================================
    // 6. Floating Scroll-To-Top Button with Circular Progress Ring
    // =========================================================================
    function initScrollToTop() {
        const btn = elements.scrollToTopBtn;
        const circle = elements.scrollProgressCircle;
        if (!btn || !circle) return;

        const circumference = 2 * Math.PI * 20; // r=20 => ~125.66
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = `${circumference}`;

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const progress = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0;
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = `${offset}`;

            if (scrollTop > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });

        btn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // =========================================================================
    // 7. Core Search Execution (Batch Scanner via execute with min_time)
    // =========================================================================
    function triggerModalAttention() {
        const modal = elements.searchModalOverlay?.querySelector('.search-motion-modal');
        if (!modal) return;
        modal.classList.remove('modal-locked-pulse');
        void modal.offsetWidth;
        modal.classList.add('modal-locked-pulse');
        setTimeout(() => {
            modal.classList.remove('modal-locked-pulse');
        }, 400);
    }

    function closeSearchModal(force = false) {
        // Во время активного сканирования окно НЕЛЬЗЯ закрыть или свернуть кликом по пустому месту/оверлею.
        // Прервать поиск можно ТОЛЬКО кнопкой «Остановить поиск» (cancel-scan-btn).
        if (state.isScanning && !force) {
            triggerModalAttention();
            return;
        }

        if (state.isScanning) {
            state.shouldCancel = true;
            state.isScanning = false;
            CosmicUniverse.setWarp(false);
            CosmicUniverse.stop();
            if (elements.progressStatusMsg) {
                elements.progressStatusMsg.textContent = 'Сканирование остановлено';
            }
        }
        CosmicUniverse.setWarp(false);
        CosmicUniverse.stop();
        if (elements.searchModalOverlay) {
            elements.searchModalOverlay.classList.remove('active');
            setTimeout(() => {
                elements.searchModalOverlay.classList.add('hidden');
            }, 300);
        }
        if (elements.submitBtn) {
            elements.submitBtn.disabled = false;
            const btnText = elements.submitBtn.querySelector('.btn-text') || elements.submitBtn.querySelector('span:not(.material-symbols-outlined)');
            if (btnText) btnText.textContent = 'Начать поиск';
        }
        document.body.style.overflow = '';
        if (state.matchedPosts && state.matchedPosts.length > 0 && elements.resultsContainer) {
            elements.resultsContainer.classList.remove('hidden');
        }
    }

    function handleViewResults() {
        closeSearchModal(true);
        if (elements.resultsContainer) {
            elements.resultsContainer.classList.remove('hidden');
            elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', handleSearchSubmit);
    }
    if (elements.cancelSearchBtn) {
        elements.cancelSearchBtn.addEventListener('click', () => {
            state.shouldCancel = true;
            CosmicUniverse.setWarp(false);
            if (elements.cancelSearchBtn) {
                const textSpan = elements.cancelSearchBtn.querySelector('span:not(.material-symbols-outlined):not(.icon)') || elements.cancelSearchBtn;
                textSpan.textContent = 'Останавливаем...';
                elements.cancelSearchBtn.disabled = true;
            }
            if (elements.progressStatusMsg) {
                elements.progressStatusMsg.textContent = 'Остановка сканирования...';
            }
        });
    }
    if (elements.viewResultsBtn) {
        elements.viewResultsBtn.addEventListener('click', handleViewResults);
    }
    if (elements.modalSearchCloseBtn) {
        elements.modalSearchCloseBtn.addEventListener('click', () => closeSearchModal(false));
    }

    async function handleSearchSubmit(e) {
        e.preventDefault();
        // Сервисный ключ подставляется сервером из api/config.php —
        // предварительная проверка токена пользователем больше не требуется.

        if (elements.branchesToggle?.checked) {
            state.useBranches = true;
        }

        let rawTargetInput = elements.targetInput ? elements.targetInput.value.trim() : '';
        if (rawTargetInput.startsWith('[Поиск по всем')) {
            rawTargetInput = '';
            state.useBranches = true;
        }

        if (!state.useBranches && !rawTargetInput) {
            if (elements.branchSelect?.value && elements.branchSelect.value !== 'all') {
                rawTargetInput = elements.branchSelect.value;
                if (elements.targetInput) elements.targetInput.value = rawTargetInput;
            } else {
                state.useBranches = true;
                if (elements.branchesToggle) elements.branchesToggle.checked = true;
            }
        }

        // Read and prepare filter parameters
        const yearStart = parseInt(elements.yearStartInput?.value || '2010', 10);
        const yearEnd = parseInt(elements.yearEndInput?.value || String(new Date().getFullYear()), 10);
        if (isNaN(yearStart) || isNaN(yearEnd) || yearStart > yearEnd) {
            alert('Некорректный диапазон годов!');
            return;
        }

        const dayFilter = elements.daySelect?.value || 'all';
        const keywords = elements.keywordInput?.value.trim().toLowerCase().split(/\s+/).filter(Boolean) || [];
        const excludeWords = elements.excludeInput?.value.trim().toLowerCase().split(/\s+/).filter(Boolean) || [];
        const hashtagRaw = elements.hashtagInput?.value.trim().toLowerCase() || '';
        const hashtagFilter = hashtagRaw.replace(/^#/, '');

        // 6 Content Filters flags
        const onlyPhotos = elements.onlyPhotosCheck?.checked || false;
        const onlyVideos = elements.onlyVideosCheck?.checked || false;
        const excludeReposts = elements.excludeRepostsCheck?.checked || false;
        const onlyReposts = elements.onlyRepostsCheck?.checked || false;
        const onlyPolls = elements.onlyPollsCheck?.checked || false;
        const onlyLinks = elements.onlyLinksCheck?.checked || false;

        // Reset search state
        state.isScanning = true;
        state.shouldCancel = false;
        state.scannedCount = 0;
        state.matchedCount = 0;
        state.totalCount = 0;
        state.matchedPosts = [];
        state.filteredPosts = [];
        state.activeBranchFilter = null;
        state.activeHashtagFilter = null;
        state.cardPage = 0;
        state.lastDayFilter = dayFilter;
        state.lastYearStart = yearStart;
        state.lastYearEnd = yearEnd;
        state.lastSelectedMonths = new Set(state.selectedMonths);

        // UI Reset & Open Fullscreen Dimmed Motion Search Overlay
        if (elements.submitBtn) {
            elements.submitBtn.disabled = true;
            const btnText = elements.submitBtn.querySelector('.btn-text') || elements.submitBtn.querySelector('span:not(.material-symbols-outlined)');
            if (btnText) btnText.textContent = 'Сканирование...';
        }

        const searchKeywordStr = keywords.join(' ');
        try { Mascot.onScanStart(searchKeywordStr); } catch (e) { console.warn('[Mascot] onScanStart error:', e); }

        if (elements.searchModalOverlay) {
            elements.searchModalOverlay.classList.remove('hidden');
            // Trigger reflow for CSS transition
            elements.searchModalOverlay.offsetWidth;
            elements.searchModalOverlay.classList.add('active');
        }
        CosmicUniverse.start();
        CosmicUniverse.setWarp(true);
        if (elements.searchCompletedActions) {
            elements.searchCompletedActions.classList.add('hidden');
        }
        if (elements.modalSearchCloseBtn) {
            elements.modalSearchCloseBtn.style.display = 'none';
        }
        if (elements.cancelSearchBtn) {
            elements.cancelSearchBtn.style.display = 'inline-flex';
            elements.cancelSearchBtn.disabled = false;
            const textSpan = elements.cancelSearchBtn.querySelector('span:not(.material-symbols-outlined):not(.icon)') || elements.cancelSearchBtn;
            textSpan.textContent = 'Остановить поиск';
        }
        if (elements.progressBar) {
            elements.progressBar.style.width = '0%';
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = '0%';
        }
        if (elements.progressTitle) {
            elements.progressTitle.textContent = 'Подготовка к пакетному поиску...';
        }
        if (elements.progressStatusMsg) {
            elements.progressStatusMsg.textContent = 'Разрешение адресов сообществ...';
        }
        if (elements.statGroups) {
            elements.statGroups.textContent = '0 / 0';
        }
        if (elements.statScanned) {
            elements.statScanned.textContent = '0';
        }
        if (elements.statMatched) {
            elements.statMatched.textContent = '0';
        }
        if (elements.resultsContainer) {
            elements.resultsContainer.classList.add('hidden');
        }

        // Render skeleton cards immediately to give instant visual feedback
        if (elements.postsGrid) {
            elements.postsGrid.innerHTML = '';
            for (let s = 0; s < 8; s++) {
                elements.postsGrid.appendChild(createSkeletonCard());
            }
        }

        const startTime = Date.now();

        try {
            // 1. Resolve Targets
            let targetsToScan = [];
            if (state.useBranches) {
                if (state.libraryBranchesList.length > 0) {
                    targetsToScan = [...state.libraryBranchesList];
                } else if (state.libraryBranches.length > 0) {
                    targetsToScan = state.libraryBranches.map(l => ({ link: l }));
                } else if (CANONICAL_BRANCHES && CANONICAL_BRANCHES.length > 0) {
                    targetsToScan = CANONICAL_BRANCHES.map(b => ({
                        name: b.canonicalName,
                        canonicalName: b.canonicalName,
                        shortCode: b.shortCode,
                        rawId: b.rawId,
                        link: b.vkLink || ('https://vk.com/' + b.screenName),
                        address: b.address
                    }));
                } else {
                    throw new Error('Список филиалов библиотек пуст. Проверьте branches_cache.json.');
                }
            } else {
                const parts = rawTargetInput.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
                targetsToScan = parts.map(p => ({ link: p }));
            }

            const resolvedTargets = [];
            for (let i = 0; i < targetsToScan.length; i++) {
                if (state.shouldCancel) break;
                const t = targetsToScan[i];
                elements.progressStatusMsg.textContent = `Разрешение (${i + 1}/${targetsToScan.length}): ${t.canonicalName || t.name || t.link}`;

                // Fast-path: Check canonical branches catalog first
                const canon = findCanonicalBranch(t);
                if (canon && canon.rawId) {
                    const info = {
                        id: canon.rawId,
                        name: canon.canonicalName,
                        canonicalName: canon.canonicalName,
                        avatar: canon.avatar || '',
                        members_count: typeof canon.canonicalMembers === 'number' ? canon.canonicalMembers : null,
                        link: canon.vkLink || t.link || '',
                        screen_name: canon.screenName || '',
                        type: canon.rawId < 0 ? 'group' : 'user',
                        shortCode: canon.shortCode,
                        branchNum: canon.branchNum,
                        address: canon.address,
                        phone: canon.phone,
                        gradient: canon.gradient,
                        sortOrder: canon.sortOrder,
                        branch_url: canon.branch_url
                    };
                    resolvedTargets.push(info);
                    continue;
                }

                try {
                    const info = await resolveTarget(t.link || t.name || t.id, state.token);
                    enrichTargetWithCanonical(info);
                    resolvedTargets.push(info);
                } catch (resErr) {
                    console.warn(`Не удалось разрешить адрес ${t.link}:`, resErr.message);
                }
            }

            if (resolvedTargets.length === 0) {
                throw new Error('Не удалось разрешить ни один из указанных адресов.');
            }

            // v3.5.0: живые данные сообществ и профилей одним батч-запросом —
            // аватары, короткие имена и число подписчиков (для вкладки «Подписчики»)
            try {
                const groupIds = [];
                const userIds = [];
                resolvedTargets.forEach(t => {
                    const numId = parseInt(t.id, 10);
                    if (numId < 0 || t.type === 'group') {
                        groupIds.push(Math.abs(numId));
                    } else if (numId > 0) {
                        userIds.push(numId);
                    }
                });

                if (groupIds.length > 0) {
                    const liveRes = await callVkApi('groups.getById', {
                        group_ids: groupIds.join(','),
                        fields: 'photo_100,screen_name,members_count'
                    }, state.token);
                    const liveList = Array.isArray(liveRes) ? liveRes : (liveRes && liveRes.groups ? liveRes.groups : []);
                    const liveById = new Map(liveList.map(g => [Math.abs(g.id), g]));
                    resolvedTargets.forEach(t => {
                        const g = liveById.get(Math.abs(t.id));
                        if (!g) return;
                        const gPhoto = g.photo_100 || g.photo_50 || '';
                        if (gPhoto && !isDogAvatarUrl(gPhoto)) {
                            t.avatar = gPhoto;
                        }
                        t.screen_name = g.screen_name || t.screen_name || '';
                        if (typeof g.members_count === 'number') {
                            t.members_count = g.members_count;
                        }
                        if (g.name && g.name !== 'DELETED' && !g.deactivated) {
                            t.name = g.name;
                        }
                    });
                }

                if (userIds.length > 0) {
                    const userRes = await callVkApi('users.get', {
                        user_ids: userIds.join(','),
                        fields: 'photo_100,screen_name,followers_count'
                    }, state.token);
                    const uList = Array.isArray(userRes) ? userRes : (userRes && userRes.users ? userRes.users : []);
                    const uById = new Map(uList.map(u => [u.id, u]));
                    resolvedTargets.forEach(t => {
                        const u = uById.get(parseInt(t.id, 10));
                        if (!u) return;
                        const uPhoto = u.photo_100 || '';
                        if (uPhoto && !isDogAvatarUrl(uPhoto)) {
                            t.avatar = uPhoto;
                        }
                        t.screen_name = u.screen_name || t.screen_name || `id${u.id}`;
                        if (typeof u.followers_count === 'number') {
                            t.members_count = u.followers_count;
                        }
                    });
                }

                resolvedTargets.forEach(t => enrichTargetWithCanonical(t));
            } catch (liveErr) {
                console.warn('Не удалось получить живые данные сообществ/пользователей:', liveErr.message);
            }

            // Canonical sort
            resolvedTargets.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
            state.targetsInfo = resolvedTargets;
            state.targetInfo = resolvedTargets[0];

            // 2. Batch Scanning via VK API execute
            // minTime is the Unix timestamp of the oldest date we care about (Jan 1 of yearStart)
            const minTime = yearStart > 0 ? Math.floor(new Date(yearStart, 0, 1).getTime() / 1000) : 0;

            let targetIndex = 0;
            for (let targetInfo of resolvedTargets) {
                if (state.shouldCancel) break;
                targetIndex++;

                let offset = 0;
                let finished = false;
                let wallTotalCount = 0;
                let groupPostCount = 0;
                let executeFailedForGroup = false;
                let emptyBatchStreak = 0;

                if (elements.progressTitle) {
                    elements.progressTitle.textContent = `Сканирование (${targetIndex}/${resolvedTargets.length}): ${targetInfo.canonicalName || targetInfo.name}`;
                }
                if (elements.progressStatusMsg) {
                    elements.progressStatusMsg.textContent = 'Пакетная выгрузка через execute...';
                }
                if (elements.statGroups) {
                    elements.statGroups.textContent = `${targetIndex} / ${resolvedTargets.length}`;
                }

                while (!finished && !state.shouldCancel) {
                    let res;
                    if (!executeFailedForGroup) {
                        try {
                            // Batch request: executes up to 10 x wall.get inside VK server
                            res = await callVkExecuteBatch(targetInfo.id, offset, minTime, state.token, 10);
                        } catch (batchErr) {
                            console.warn(`Execute call failed for ${targetInfo.name}, fallback to sequential wall.get:`, batchErr.message);
                            executeFailedForGroup = true;
                        }
                    }

                    if (executeFailedForGroup) {
                        if (elements.progressStatusMsg) {
                            elements.progressStatusMsg.textContent = `Выгрузка записей ${targetInfo.canonicalName || targetInfo.name} (смещение ${offset})...`;
                        }
                        try {
                            res = await callVkApi('wall.get', {
                                owner_id: targetInfo.id,
                                offset: offset,
                                count: 100,
                                extended: 1
                            }, state.token);
                            // Normalize structure
                            if (res && res.items) {
                                res.has_more = res.items.length >= 100 ? 1 : 0;
                            }
                        } catch (singleErr) {
                            console.warn(`Wall unavailable for ${targetInfo.name}:`, singleErr.message);
                            finished = true;
                            break;
                        }
                    }

                    if (!res || !res.items || res.items.length === 0) {
                        emptyBatchStreak++;
                        if (emptyBatchStreak >= 2 || !res || !res.items) {
                            finished = true;
                            break;
                        }
                    } else {
                        emptyBatchStreak = 0;
                    }

                    CosmicUniverse.pulse(6.5);

                    // Populate author cache from extended response (for reposts)
                    if (res.groups && Array.isArray(res.groups)) {
                        res.groups.forEach(g => cacheAuthor(-Math.abs(g.id), g));
                    }
                    if (res.profiles && Array.isArray(res.profiles)) {
                        res.profiles.forEach(u => cacheAuthor(u.id, u));
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
                        const month = postDate.getMonth() + 1;
                        const day = postDate.getDate();

                        // Early break check: if oldest post is older than yearStart and not pinned
                        if (!post.is_pinned && year < yearStart) {
                            finished = true;
                            break;
                        }

                        state.scannedCount++;

                        // Date filters
                        const inYearRange = year >= yearStart && year <= yearEnd;
                        const isTargetMonth = state.selectedMonths.size === 0 || state.selectedMonths.has(month);
                        const isTargetDay = (dayFilter === 'all' || day === parseInt(dayFilter, 10));

                        if (!inYearRange || !isTargetMonth || !isTargetDay) {
                            continue;
                        }

                        // Attachments and Repost checks
                        const isRepost = Array.isArray(post.copy_history) && post.copy_history.length > 0;
                        const allAtts = [
                            ...(post.attachments || []),
                            ...((post.copy_history || []).flatMap(cp => cp.attachments || []))
                        ];

                        const hasPhoto = allAtts.some(a => a.type === 'photo');
                        const hasVideo = allAtts.some(a => a.type === 'video');
                        const hasPoll = allAtts.some(a => a.type === 'poll');
                        const hasLink = allAtts.some(a => a.type === 'link');

                        // Evaluate 6 Content Filters
                        if (onlyPhotos && !hasPhoto) continue;
                        if (onlyVideos && !hasVideo) continue;
                        if (excludeReposts && isRepost) continue;
                        if (onlyReposts && !isRepost) continue;
                        if (onlyPolls && !hasPoll) continue;
                        if (onlyLinks && !hasLink) continue;

                        // Text content checks
                        const fullText = (
                            (post.text || '') + ' ' +
                            ((post.copy_history || []).map(cp => cp.text || '').join(' '))
                        ).toLowerCase();

                        // Exclude keywords
                        if (excludeWords.length > 0) {
                            const hasExcluded = excludeWords.some(w => fullText.includes(w));
                            if (hasExcluded) continue;
                        }

                        // Keywords matching (AND / OR)
                        if (keywords.length > 0) {
                            if (state.andOrMode === 'and') {
                                const allMatched = keywords.every(kw => fullText.includes(kw));
                                if (!allMatched) continue;
                            } else {
                                const anyMatched = keywords.some(kw => fullText.includes(kw));
                                if (!anyMatched) continue;
                            }
                        }

                        // Hashtag filter
                        if (hashtagFilter) {
                            const postTags = (fullText.match(/#([\p{L}\p{N}_]+)/gu) || [])
                                .map(t => t.slice(1).toLowerCase());
                            if (!postTags.includes(hashtagFilter)) continue;
                        }

                        // Passed all filters!
                        post.targetInfo = targetInfo;
                        post.humanDate = formatHumanDate(postDate);
                        state.matchedPosts.push(post);
                        state.matchedCount++;
                        groupPostCount++;
                    }

                    // Progress display: accurately compute overall progress without jumping to 100% prematurely
                    let groupRatio = 0;
                    if (wallTotalCount > 0) {
                        groupRatio = Math.min(0.95, offset / wallTotalCount);
                    } else if (posts && posts.length > 0) {
                        groupRatio = 0.5;
                    }
                    const overallRatio = (targetIndex - 1 + groupRatio) / resolvedTargets.length;
                    const pct = resolvedTargets.length > 1
                        ? Math.min(98, Math.max(1, Math.round(overallRatio * 100)))
                        : (wallTotalCount > 0 ? Math.min(99, Math.round((offset / wallTotalCount) * 100)) : 50);

                    if (elements.progressBar) elements.progressBar.style.width = `${pct}%`;
                    if (elements.progressPercent) elements.progressPercent.textContent = `${pct}%`;
                    if (elements.statScanned) elements.statScanned.textContent = state.scannedCount.toLocaleString('ru-RU');
                    if (elements.statMatched) elements.statMatched.textContent = state.matchedCount.toLocaleString('ru-RU');
                    if (elements.statGroups) elements.statGroups.textContent = `${targetIndex} / ${resolvedTargets.length}`;

                    try {
                        Mascot.onScanProgress(pct, state.matchedCount);
                    } catch (e) {}

                    // Check if more posts available on wall
                    if (finished || res.has_more === 0 || posts.length === 0) {
                        finished = true;
                        break;
                    }

                    if (wallTotalCount > 0 && offset + posts.length >= wallTotalCount) {
                        finished = true;
                        break;
                    }

                    offset += posts.length;
                }
            }

            const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

            if (elements.progressBar) elements.progressBar.style.width = '100%';
            if (elements.progressPercent) elements.progressPercent.textContent = '100%';
            if (elements.statScanned) elements.statScanned.textContent = state.scannedCount.toLocaleString('ru-RU');
            if (elements.statMatched) elements.statMatched.textContent = state.matchedCount.toLocaleString('ru-RU');
            if (elements.statGroups) elements.statGroups.textContent = `${resolvedTargets.length} / ${resolvedTargets.length}`;

            CosmicUniverse.setWarp(false);
            CosmicUniverse.stop();

            if (state.shouldCancel) {
                if (elements.progressTitle) elements.progressTitle.textContent = 'Поиск остановлен';
                if (elements.progressStatusMsg) elements.progressStatusMsg.textContent = `Поиск прерван пользователем. Найдено записей: ${state.matchedCount}`;
                showToast('Поиск остановлен пользователем', 'warning');
                try { Mascot.onScanCancel(); } catch (e) {}
            } else {
                if (elements.progressTitle) elements.progressTitle.textContent = 'Поиск успешно завершён';
                if (elements.progressStatusMsg) elements.progressStatusMsg.textContent = `Просканировано ${resolvedTargets.length} сообществ, найдено ${state.matchedCount} записей за ${elapsedSec}с.`;
                showToast(`Поиск завершен за ${elapsedSec}с! Найдено ${state.matchedCount} записей.`, 'check_circle');
            }

            // Hide cancel button, reveal "Посмотреть результаты" button
            if (elements.cancelSearchBtn) {
                elements.cancelSearchBtn.style.display = 'none';
            }
            if (elements.modalSearchCloseBtn) {
                elements.modalSearchCloseBtn.style.display = '';
                elements.modalSearchCloseBtn.classList.remove('hidden');
            }
            if (elements.searchCompletedActions) {
                elements.searchCompletedActions.classList.remove('hidden');
            }
            if (elements.modalMatchedBadge) {
                elements.modalMatchedBadge.textContent = state.matchedCount.toLocaleString('ru-RU');
            }

            // 3. Post-processing: Cross-Posting Analysis
            state.crossPostingData = detectCrossPosts(state.matchedPosts);
            renderCrossPostingSection(elements.crosspostingClustersContainer, state.crossPostingData);
            if (elements.crosspostStatsChip) {
                elements.crosspostStatsChip.textContent = `${state.crossPostingData.totalClusters} ${declOfNum(state.crossPostingData.totalClusters, ['серия', 'серии', 'серий'])} (${state.crossPostingData.totalDuplicates} повторов)`;
            }

            // 4. Render All Results & Reports (ready in background)
            renderAllResults();
            saveSearchHistory(rawTargetInput || '16 филиалов', keywords.join(' '));

        } catch (err) {
            CosmicUniverse.setWarp(false);
            CosmicUniverse.stop();
            console.error('Search error:', err);
            try { Mascot.onScanError(err.message); } catch (e) {}

            if (elements.progressTitle) elements.progressTitle.textContent = state.matchedPosts.length > 0 ? 'Сканирование частично завершено' : 'Ошибка поиска';
            if (elements.progressStatusMsg) elements.progressStatusMsg.textContent = `${err.message || 'Сбой сети'}. Найдено записей: ${state.matchedCount}`;
            if (elements.cancelSearchBtn) {
                elements.cancelSearchBtn.style.display = 'none';
            }
            if (elements.modalSearchCloseBtn) {
                elements.modalSearchCloseBtn.style.display = '';
                elements.modalSearchCloseBtn.classList.remove('hidden');
            }

            // If any posts were matched, always allow user to view results!
            if (state.matchedPosts.length > 0) {
                if (elements.searchCompletedActions) {
                    elements.searchCompletedActions.classList.remove('hidden');
                }
                if (elements.modalMatchedBadge) {
                    elements.modalMatchedBadge.textContent = state.matchedCount.toLocaleString('ru-RU');
                }
                try {
                    renderAllResults();
                } catch (rErr) {
                    console.warn('renderAllResults on partial error failed:', rErr);
                }
            } else {
                alert(`Ошибка при выполнении поиска: ${err.message}`);
            }
        } finally {
            CosmicUniverse.setWarp(false);
            CosmicUniverse.stop();
            state.isScanning = false;
            if (elements.submitBtn) {
                elements.submitBtn.disabled = false;
                const btnText = elements.submitBtn.querySelector('.btn-text') || elements.submitBtn.querySelector('span:not(.material-symbols-outlined)');
                if (btnText) btnText.textContent = 'Начать поиск по записям';
            }
        }
    }

    // =========================================================================
    // 8. Results Rendering & Tab Coordination
    // =========================================================================
    function renderAllResults() {
        elements.resultsContainer.classList.remove('hidden');

        // Update tab badges
        const count = state.matchedPosts.length;
        if (elements.countFeed) elements.countFeed.textContent = count;
        if (elements.countPassport) elements.countPassport.textContent = count;
        if (elements.countAnalytics) elements.countAnalytics.textContent = count;
        if (elements.countSummary) elements.countSummary.textContent = count;

        // Calculate KPIs & Group Stats
        const kpis = calculateKPIs(state.matchedPosts);
        const stats = calculateGroupStats(state.matchedPosts, state.targetsInfo);
        state.lastGroupsStats = stats;

        // Fill KPI cards
        if (elements.kpiTotalPosts) elements.kpiTotalPosts.textContent = kpis.count;
        if (elements.kpiTotalViews) elements.kpiTotalViews.textContent = formatViews(kpis.totalViews);
        if (elements.kpiTotalReactions) elements.kpiTotalReactions.textContent = kpis.totalInteractions.toLocaleString('ru-RU');
        if (elements.kpiAvgEr) elements.kpiAvgEr.textContent = kpis.erViews;
        if (elements.kpiAvgViews) elements.kpiAvgViews.textContent = kpis.avgViews.toLocaleString('ru-RU');

        // Render visual feed with current sort
        applySortAndFilterFeed();
        renderSourcesShowcase(stats);
        renderAnalyticsTab(stats, kpis);
        renderOfficialReport(stats);
        renderMethodistMemo(kpis, stats);
        renderHashtagsAndLinks(state.matchedPosts);

        // v3.4: вкладка «Советы филиалам» + авто-снимки подписчиков
        updateAdviceAndSubscribers(stats);

        // Информирование робота-ассистента о результатах сканирования
        if (state.matchedPosts.length > 0) {
            const validStats = (stats || []).filter(s => (s.postsCount || 0) > 0);
            const sortedByViews = [...validStats].sort((a, b) => (b.views || 0) - (a.views || 0));
            const sortedByReactions = [...validStats].sort((a, b) => (b.totalInteractions || 0) - (a.totalInteractions || 0));
            const sortedByEr = [...validStats].filter(s => (s.views || 0) >= 40).sort((a, b) => (b.erViews || 0) - (a.erViews || 0));

            // Средний ER считаем на месте: calculateKPIs() не возвращает avgEr (только erViews со знаком %)
            const avgErValue = kpis.totalViews > 0 ? ((kpis.totalInteractions / kpis.totalViews) * 100).toFixed(2) : '0.00';

            const topByViews = sortedByViews[0] ? {
                name: sortedByViews[0].info?.canonicalName || sortedByViews[0].info?.name || 'ЦГБ',
                shortCode: sortedByViews[0].info?.shortCode || '',
                views: sortedByViews[0].views || 0,
                postsCount: sortedByViews[0].postsCount || 0,
                interactions: sortedByViews[0].totalInteractions || 0,
                er: (Number(sortedByViews[0].erViews) || 0).toFixed(2)
            } : null;

            const secondByViews = sortedByViews[1] ? {
                name: sortedByViews[1].info?.canonicalName || sortedByViews[1].info?.name || '',
                shortCode: sortedByViews[1].info?.shortCode || '',
                views: sortedByViews[1].views || 0,
                postsCount: sortedByViews[1].postsCount || 0,
                interactions: sortedByViews[1].totalInteractions || 0,
                er: (Number(sortedByViews[1].erViews) || 0).toFixed(2)
            } : null;

            const thirdByViews = sortedByViews[2] ? {
                name: sortedByViews[2].info?.canonicalName || sortedByViews[2].info?.name || '',
                shortCode: sortedByViews[2].info?.shortCode || '',
                views: sortedByViews[2].views || 0,
                postsCount: sortedByViews[2].postsCount || 0,
                interactions: sortedByViews[2].totalInteractions || 0,
                er: (Number(sortedByViews[2].erViews) || 0).toFixed(2)
            } : null;

            const topByReactions = sortedByReactions[0] ? {
                name: sortedByReactions[0].info?.canonicalName || sortedByReactions[0].info?.name || '',
                shortCode: sortedByReactions[0].info?.shortCode || '',
                interactions: sortedByReactions[0].totalInteractions || 0,
                likes: sortedByReactions[0].likes || 0
            } : null;

            const topByEr = sortedByEr[0] ? {
                name: sortedByEr[0].info?.canonicalName || sortedByEr[0].info?.name || '',
                shortCode: sortedByEr[0].info?.shortCode || '',
                er: sortedByEr[0].erViews || 0
            } : null;

            const rankedBranches = sortedByViews.map(s => ({
                name: s.info?.canonicalName || s.info?.name || '',
                shortCode: s.info?.shortCode || '',
                views: s.views || 0,
                interactions: s.totalInteractions || 0,
                postsCount: s.postsCount || 0,
                er: s.erViews || 0
            }));

            try {
                Mascot.onScanSuccess({
                    count: state.matchedPosts.length,
                    topBranch: topByViews?.name || '',
                    topByViews,
                    secondByViews,
                    thirdByViews,
                    topByReactions,
                    topByEr,
                    rankedBranches,
                    totalViews: kpis.totalViews,
                    totalLikes: kpis.totalLikes,
                    totalReposts: kpis.totalReposts,
                    totalComments: kpis.totalComments,
                    avgEr: avgErValue,
                    kpis,
                    rawStats: stats,
                    byBranch: stats.byBranch,
                    matchedPosts: state.matchedPosts,
                    query: elements.keywordInput ? elements.keywordInput.value.trim() : ''
                });
            } catch (e) {
                console.warn('[Mascot] onScanSuccess error:', e);
            }
        } else {
            try {
                Mascot.onScanEmpty(elements.keywordInput ? elements.keywordInput.value : '');
            } catch (e) {}
        }

        // Resolve any remaining missing repost author names/avatars across all tabs and reports
        resolveMissingAuthors(state.matchedPosts, state.token).catch(() => {});
    }

    // =========================================================================
    // 8.1. v3.4 — Советы филиалам и статистика подписчиков
    // =========================================================================

    /** Период сканирования в неделях + человекочитаемая подпись */
    function computeScanPeriod() {
        let weeks = 4;
        let label = '';
        if (state.selectedMonths && state.selectedMonths.size > 0) {
            const names = state.months.filter(m => state.selectedMonths.has(m.id)).map(m => m.name);
            label = names.join(', ');
            weeks = state.selectedMonths.size * 4.35;
        } else {
            const dates = state.matchedPosts.map(p => p.date).filter(Boolean);
            if (dates.length >= 2) {
                weeks = Math.max((Math.max(...dates) - Math.min(...dates)) / (7 * 86400), 1);
            }
        }
        return { weeks: Math.max(weeks, 0.25), label };
    }

    /** Сопоставляет цель сканирования подписи филиала из каталога */
    function makeBranchResolver() {
        const map = new Map();
        (state.libraryBranchesList || []).forEach(b => {
            const label = `${b.branch_num ? b.branch_num + ' — ' : ''}${b.branch_name || ''}`.trim();
            (b.vk_links || []).forEach(l => {
                const key = String(l).toLowerCase()
                    .replace(/^https?:\/\/(www\.)?vk\.com\//, '')
                    .replace(/[/?#].*$/, '');
                if (key) map.set(key, label);
            });
        });
        return (t) => {
            const slug = String(t.link || '').toLowerCase()
                .replace(/^https?:\/\/(www\.)?vk\.com\//, '')
                .replace(/[/?#].*$/, '');
            return map.get(slug) || t.canonicalBranch || '';
        };
    }

    /**
     * После каждого сканирования: сохраняет подписочные снимки на сервере,
     * пересчитывает тренды и рендерит вкладки «Советы» и «Подписчики».
     */
    async function updateAdviceAndSubscribers(stats) {
        const period = computeScanPeriod();

        // 1) Снимки подписчиков (сервер хранит не более одного в день на группу)
        try {
            const snaps = snapshotsFromScan(state.targetsInfo || [], makeBranchResolver());
            if (snaps.length > 0) {
                await saveSnapshots(snaps);
            }
        } catch (e) { /* телеметрия не должна ломать выдачу результатов */ }

        // 2) История и тренды
        state.subsHistory = await fetchHistory();
        const series = buildGroupSeries(state.subsHistory);
        const trends = computeTrends(series);
        // ID целей отрицательные — даём доступ по обоим вариантам
        const trendsByGroup = new Map();
        trends.forEach((v, k) => {
            trendsByGroup.set(k, v);
            trendsByGroup.set(-k, v);
        });

        // 3) Вкладка советов
        const adviceData = buildBranchAdvice(stats, {
            periodWeeks: period.weeks,
            trendsByGroup
        });
        renderAdviceTab(elements.adviceTabContent, adviceData, { periodLabel: period.label });
        if (elements.countAdvice) elements.countAdvice.textContent = stats.length;

        // 4) Вкладка подписчиков
        renderSubscribersTab(elements.subscribersTabContent, {
            history: state.subsHistory,
            branches: state.libraryBranchesList || [],
            token: state.token,
            onToast: showToast,
            onCollectDone: h => { state.subsHistory = h; }
        });
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

    function applySortAndFilterFeed() {
        let posts = [...state.matchedPosts];

        // Filter by branch if selected
        if (state.activeBranchFilter) {
            posts = posts.filter(p => postMatchesBranch(p, state.activeBranchFilter));
        }

        // Filter by hashtag if clicked
        if (state.activeHashtagFilter) {
            posts = posts.filter(p => (p.text || '').toLowerCase().includes(state.activeHashtagFilter.toLowerCase()));
        }

        // Sort posts
        const sortBy = elements.cardsSortSelect?.value || state.sortBy;
        switch (sortBy) {
            case 'date-asc':
                posts.sort((a, b) => (a.date || 0) - (b.date || 0));
                break;
            case 'likes-desc':
                posts.sort((a, b) => extractNum(b.likes) - extractNum(a.likes));
                break;
            case 'views-desc':
                posts.sort((a, b) => extractNum(b.views) - extractNum(a.views));
                break;
            case 'comments-desc':
                posts.sort((a, b) => extractNum(b.comments) - extractNum(a.comments));
                break;
            case 'er-desc':
                posts.sort((a, b) => {
                    const erA = ((extractNum(a.likes) + extractNum(a.reposts) + extractNum(a.comments)) / (extractNum(a.views) || 1));
                    const erB = ((extractNum(b.likes) + extractNum(b.reposts) + extractNum(b.comments)) / (extractNum(b.views) || 1));
                    return erB - erA;
                });
                break;
            default: // date-desc
                posts.sort((a, b) => (b.date || 0) - (a.date || 0));
                break;
        }

        // Update Active Branch Filter Banner
        if (elements.activeBranchBanner) {
            if (state.activeBranchFilter) {
                elements.activeBranchBanner.classList.remove('hidden');
                let foundName = '';
                if (state.lastGroupsStats) {
                    const foundStat = state.lastGroupsStats.find(s => postMatchesBranch({ targetInfo: s.info, owner_id: s.info.id }, state.activeBranchFilter));
                    if (foundStat) foundName = foundStat.info.canonicalName || foundStat.info.name;
                }
                if (!foundName) {
                    const canon = CANONICAL_BRANCHES.find(b => postMatchesBranch({ targetInfo: { id: b.rawId, canonicalName: b.canonicalName, shortCode: b.shortCode } }, state.activeBranchFilter));
                    if (canon) foundName = canon.canonicalName;
                }
                if (elements.activeBranchName) elements.activeBranchName.textContent = foundName || String(state.activeBranchFilter);
                if (elements.activeBranchCount) elements.activeBranchCount.textContent = posts.length;
            } else {
                elements.activeBranchBanner.classList.add('hidden');
            }
        }

        // Update tab 1 feed counter badge
        if (elements.countFeed) {
            elements.countFeed.textContent = posts.length;
        }

        state.filteredPosts = posts;
        state.cardPage = 0;
        elements.postsGrid.innerHTML = '';

        if (posts.length === 0) {
            elements.postsGrid.innerHTML = `
                <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--muted);">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: var(--accent); margin-bottom: 12px;">search_off</span>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте скорректировать фильтры или выбрать другой филиал / диапазон дат.</p>
                </div>
            `;
            return;
        }

        appendNextCardBatch();
    }

    function appendNextCardBatch() {
        const start = state.cardPage * state.cardPageSize;
        const end = Math.min(start + state.cardPageSize, state.filteredPosts.length);
        const batch = state.filteredPosts.slice(start, end);

        batch.forEach(post => {
            const card = createPostCard(post);
            elements.postsGrid.appendChild(card);
        });

        state.cardPage++;

        if (elements.scrollSentinel) {
            elements.scrollSentinel.innerHTML = end < state.filteredPosts.length
                ? '<div class="scroll-spinner">Загрузка карточек...</div>'
                : '';
        }
    }

    // Infinite scroll observer
    if (elements.scrollSentinel && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && state.filteredPosts.length > 0) {
                if (state.cardPage * state.cardPageSize < state.filteredPosts.length) {
                    appendNextCardBatch();
                }
            }
        }, { rootMargin: '250px' });
        obs.observe(elements.scrollSentinel);
    }

    if (elements.cardsSortSelect) {
        elements.cardsSortSelect.addEventListener('change', () => {
            state.sortBy = elements.cardsSortSelect.value;
            applySortAndFilterFeed();
            try {
                const sortLabel = elements.cardsSortSelect.options[elements.cardsSortSelect.selectedIndex]?.text || state.sortBy;
                Mascot.onSortChanged(sortLabel);
            } catch (e) {}
        });
    }

    // =========================================================================
    // 9. Sources Showcase Grid
    // =========================================================================
    function renderSourcesShowcase(stats) {
        if (!elements.sourcesShowcaseGrid || !stats) return;

        // Update counts in header pills
        if (elements.showcaseCountAll) {
            elements.showcaseCountAll.textContent = stats.length;
        }
        if (elements.showcaseCountWithPosts) {
            elements.showcaseCountWithPosts.textContent = stats.filter(s => s.postsCount > 0).length;
        }

        // Filter list by pill state
        let list = [...stats];
        if (state.showcaseFilter === 'with-posts') {
            list = list.filter(s => s.postsCount > 0);
        }

        // Sort list
        const sortMode = elements.showcaseSortSelect?.value || state.showcaseSort || 'canonical';
        if (sortMode === 'posts-desc') {
            list.sort((a, b) => b.postsCount - a.postsCount || (a.info.sortOrder || 999) - (b.info.sortOrder || 999));
        } else if (sortMode === 'likes-desc') {
            list.sort((a, b) => b.likes - a.likes || (a.info.sortOrder || 999) - (b.info.sortOrder || 999));
        } else if (sortMode === 'name-asc') {
            list.sort((a, b) => (a.info.canonicalName || a.info.name).localeCompare(b.info.canonicalName || b.info.name, 'ru'));
        } else { // canonical
            list.sort((a, b) => (a.info.sortOrder || 999) - (b.info.sortOrder || 999));
        }

        elements.sourcesShowcaseGrid.innerHTML = '';

        list.forEach(item => {
            const t = item.info;
            const isSelected = state.activeBranchFilter && postMatchesBranch({ targetInfo: t, owner_id: t.id }, state.activeBranchFilter);
            const card = document.createElement('div');
            card.className = `source-showcase-card ${isSelected ? 'selected' : ''}`;
            card.dataset.targetId = t.id;

            card.innerHTML = `
                <div class="source-card-top">
                    ${renderBranchAvatarHtml(t, 'md')}
                    <div class="source-meta-col">
                        <div class="source-card-name" title="${escapeHtml(t.canonicalName || t.name)}">${escapeHtml(t.canonicalName || t.name)}</div>
                        ${t.address ? `<div class="source-card-address"><span class="material-symbols-outlined addr-icon">location_on</span>${escapeHtml(t.address)}</div>` : ''}
                        <div class="source-card-links">
                            <a href="${t.link}" target="_blank" class="source-vk-pill" onclick="event.stopPropagation();">
                                <span class="material-symbols-outlined icon">open_in_new</span>
                                <span>VK</span>
                            </a>
                            ${t.branch_url ? `<a href="${t.branch_url}" target="_blank" class="source-web-pill" onclick="event.stopPropagation();" title="Сайт biblioteka33.ru"><span class="material-symbols-outlined icon">language</span></a>` : ''}
                        </div>
                    </div>
                    <div class="source-counter-col">
                        <div class="source-posts-badge ${item.postsCount > 0 ? 'badge-highlight' : 'badge-muted'}">
                            <span class="badge-num">${item.postsCount}</span>
                            <span class="badge-text">${declOfNum(item.postsCount, ['запись', 'записи', 'записей'])}</span>
                        </div>
                    </div>
                </div>
                <div class="source-card-bottom">
                    <div class="source-stats-row">
                        <span class="source-stat" title="Лайки"><span class="material-symbols-outlined stat-icon text-danger">favorite</span> ${item.likes}</span>
                        <span class="source-stat" title="Репосты"><span class="material-symbols-outlined stat-icon text-warning">share</span> ${item.reposts}</span>
                        <span class="source-stat" title="Просмотры"><span class="material-symbols-outlined stat-icon text-info">visibility</span> ${formatViews(item.views)}</span>
                    </div>
                    <button class="source-filter-trigger-btn" type="button">
                        <span>${isSelected ? 'Выбран' : 'Фильтровать'}</span>
                        <span class="material-symbols-outlined">${isSelected ? 'check' : 'arrow_forward'}</span>
                    </button>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;

                if (state.activeBranchFilter && postMatchesBranch({ targetInfo: t, owner_id: t.id }, state.activeBranchFilter)) {
                    state.activeBranchFilter = null;
                    showToast('Фильтр по филиалу сброшен', 'info');
                    try { Mascot.onBranchFilterCleared(); } catch (e) {}
                } else {
                    state.activeBranchFilter = t.id || t.rawId || t.canonicalName;
                    state.activeHashtagFilter = null;
                    showToast(`Показаны записи: ${t.canonicalName || t.name}`, 'filter_alt');
                    try { Mascot.onBranchFiltered(t.canonicalName || t.name, t); } catch (e) {}
                    // Switch to visual feed tab when filtering to a branch
                    const visualTabBtn = document.querySelector('.tab-btn[data-tab="visual-tab"]');
                    if (visualTabBtn) {
                        visualTabBtn.click();
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                applySortAndFilterFeed();
                renderSourcesShowcase(state.lastGroupsStats);
            });

            elements.sourcesShowcaseGrid.appendChild(card);
        });
    }

    if (elements.showcaseFilterBtns) {
        elements.showcaseFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.showcaseFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.showcaseFilter = btn.dataset.filter || 'all';
                if (state.lastGroupsStats) {
                    renderSourcesShowcase(state.lastGroupsStats);
                }
            });
        });
    }

    if (elements.showcaseSortSelect) {
        elements.showcaseSortSelect.addEventListener('change', () => {
            state.showcaseSort = elements.showcaseSortSelect.value;
            if (state.lastGroupsStats) {
                renderSourcesShowcase(state.lastGroupsStats);
            }
        });
    }

    if (elements.resetBranchFilterBtn) {
        elements.resetBranchFilterBtn.addEventListener('click', () => {
            state.activeBranchFilter = null;
            applySortAndFilterFeed();
            if (state.lastGroupsStats) {
                renderSourcesShowcase(state.lastGroupsStats);
            }
        });
    }

    // =========================================================================
    // 10. Analytics Tab (Charts & Rating Table)
    // =========================================================================
    function renderAnalyticsTab(stats, kpis) {
        const activeBranches = stats.filter(s => s.postsCount >= 10);
        const lowBranches = stats.filter(s => s.postsCount > 0 && s.postsCount < 10);
        const zeroBranches = stats.filter(s => s.postsCount === 0);

        if (elements.kpiNormCount) elements.kpiNormCount.textContent = activeBranches.length;
        if (elements.kpiTotalBranches) elements.kpiTotalBranches.textContent = `/ ${stats.length} филиалов`;
        if (elements.kpiWarningCount) elements.kpiWarningCount.textContent = lowBranches.length;
        if (elements.kpiDangerCount) elements.kpiDangerCount.textContent = zeroBranches.length;

        // Fallback calculations if kpis object is missing or has missing fields
        const totalPosts = stats.reduce((sum, s) => sum + (s.postsCount || 0), 0);
        const totalViews = stats.reduce((sum, s) => sum + (s.views || 0), 0);
        const totalReactions = stats.reduce((sum, s) => sum + (s.reactions || ((s.likes || 0) + (s.reposts || 0) + (s.comments || 0))), 0);
        const fallbackEr = totalViews > 0 ? ((totalReactions / totalViews) * 100).toFixed(2) + '%' : '0.00%';
        const fallbackAvgReactions = totalPosts > 0 ? (totalReactions / totalPosts).toFixed(1) : '0.0';

        const erDisplay = (kpis && kpis.erViews != null) ? kpis.erViews : fallbackEr;
        const reactionsVal = (kpis && (kpis.avgInteractions != null || kpis.avgReactionsPerPost != null || kpis.erPosts != null))
            ? (kpis.avgInteractions ?? kpis.avgReactionsPerPost ?? kpis.erPosts)
            : fallbackAvgReactions;

        if (elements.kpiAvgEr) elements.kpiAvgEr.textContent = erDisplay;
        if (elements.kpiAvgReactions) elements.kpiAvgReactions.textContent = `${reactionsVal} реакций/пост`;

        renderAnalyticsChart(stats);
        renderAnalyticsRatingTable(stats);

        // v3.7: Диаграмма компетенций филиалов («Радар методиста»)
        const radarMount = document.getElementById('radar-chart-mount');
        if (radarMount) {
            renderRadarSection(radarMount, stats, state.matchedPosts || []);
        }
    }

    function renderAnalyticsChart(stats) {
        if (!elements.analyticsChartContainer) return;
        elements.analyticsChartContainer.innerHTML = '';
        const metric = state.activeChartMetric || 'posts';

        const sorted = [...stats].sort((a, b) => {
            if (metric === 'views') return b.views - a.views;
            if (metric === 'er') return b.erViews - a.erViews;
            return b.postsCount - a.postsCount;
        });

        const maxVal = Math.max(1, ...sorted.map(s => {
            if (metric === 'views') return s.views;
            if (metric === 'er') return s.erViews;
            return s.postsCount;
        }));

        sorted.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'chart-row';
            let curVal = item.postsCount;
            let displayVal = `${curVal} ${declOfNum(curVal, ['пост', 'поста', 'постов'])}`;
            let barClass = 'bar-posts';

            if (metric === 'views') {
                curVal = item.views;
                displayVal = `${curVal.toLocaleString('ru-RU')} просм.`;
                barClass = 'bar-views';
            } else if (metric === 'er') {
                curVal = item.erViews;
                displayVal = `${curVal.toFixed(2)}% ER`;
                barClass = 'bar-er';
            }

            const pct = curVal > 0 ? Math.max(4, Math.min(100, Math.round((curVal / maxVal) * 100))) : 0;
            const displayName = item.info.canonicalName || item.info.name;

            row.innerHTML = `
                <div class="chart-rank">#${index + 1}</div>
                <div class="chart-avatar-wrap">${renderBranchAvatarHtml(item.info, 'sm')}</div>
                <div class="chart-branch-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill ${barClass}" style="width: 0%;" data-target-width="${pct}%"></div>
                </div>
                <div class="chart-val">${displayVal}</div>
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

    if (elements.chartMetricBtns) {
        elements.chartMetricBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.chartMetricBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeChartMetric = btn.dataset.metric;
                renderAnalyticsChart(state.lastGroupsStats);
            });
        });
    }

    function renderAnalyticsRatingTable(stats) {
        if (!elements.analyticsRatingTbody) return;
        elements.analyticsRatingTbody.innerHTML = '';

        const sorted = [...stats].sort((a, b) => b.postsCount - a.postsCount || b.views - a.views);

        sorted.forEach((item, index) => {
            const tr = document.createElement('tr');
            const displayName = item.info.canonicalName || item.info.name;
            const address = item.info.address ? `<div class="summary-source-sub">${escapeHtml(item.info.address)}</div>` : '';

            tr.innerHTML = `
                <td style="text-align: center; font-weight: 700; color: var(--muted);">${index + 1}</td>
                <td>
                    <div class="rating-branch-cell">
                        ${renderBranchAvatarHtml(item.info, 'sm')}
                        <div>
                            <span class="rating-branch-name">${escapeHtml(displayName)}</span>
                            ${address}
                        </div>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 700; color: var(--accent);">${item.postsCount}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${formatViews(item.views)}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${item.likes}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${item.reposts}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${item.comments}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${item.erPosts.toFixed(1)}</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${item.erViews.toFixed(2)}%</td>
            `;
            elements.analyticsRatingTbody.appendChild(tr);
        });
    }

    // =========================================================================
    // 11. Official Passport & Summary Report Tab
    // =========================================================================

    /**
     * Helper to build post text content for the official report table,
     * properly resolving reposts, branch attribution, and media-only posts.
     */
    function buildReportPostText(p) {
        const directText = (p.text || '').trim();
        const hasRepost = Array.isArray(p.copy_history) && p.copy_history.length > 0;

        function getAttachmentHint(atts) {
            if (!atts || atts.length === 0) return '';
            const counts = {};
            atts.forEach(att => {
                counts[att.type] = (counts[att.type] || 0) + 1;
            });
            const parts = [];
            if (counts.photo) parts.push(`${counts.photo} ${declOfNum(counts.photo, ['фотография', 'фотографии', 'фотографий'])}`);
            if (counts.video) parts.push(`${counts.video} ${declOfNum(counts.video, ['видеозапись', 'видеозаписи', 'видеозаписей'])}`);
            if (counts.doc) parts.push(`${counts.doc} ${declOfNum(counts.doc, ['документ', 'документа', 'документов'])}`);
            if (counts.audio) parts.push(`${counts.audio} ${declOfNum(counts.audio, ['аудиозапись', 'аудиозаписи', 'аудиозаписей'])}`);
            if (counts.link) parts.push(`Материал с ссылкой`);
            if (parts.length > 0) {
                return `<span class="report-empty-hint">${parts.join(', ')} (без текста)</span>`;
            }
            return '';
        }

        function renderTruncatedSnippet(text) {
            const trunc = truncateToSentences(text, 10);
            if (trunc.isTruncated) {
                return `
                    <div class="report-text-wrap">
                        <div class="report-text-preview">${trunc.previewHtml}</div>
                        <div class="report-text-full hidden">${trunc.fullHtml}</div>
                        <button type="button" class="btn-report-expand-text" data-expanded="false" data-remaining="${trunc.remainingCount}">
                            <span class="btn-expand-label">Развернуть полностью (ещё ${trunc.remainingCount} ${declOfNum(trunc.remainingCount, ['предложение', 'предложения', 'предложений'])})</span>
                            <span class="material-symbols-outlined icon">expand_more</span>
                        </button>
                    </div>
                `;
            }
            return `<div class="report-text-full">${trunc.previewHtml}</div>`;
        }

        if (hasRepost) {
            const rep = p.copy_history[0];
            const repAuthor = resolveRepostAuthor(rep);
            const repOwnerId = rep.owner_id || rep.from_id;
            const repPostId = rep.id;
            const originalPostUrl = repAuthor.postUrl || (repOwnerId && repPostId ? `https://vk.com/wall${repOwnerId}_${repPostId}` : repAuthor.url);
            const repText = (rep.text || '').trim();

            const badgeHtml = repAuthor.isBranch
                ? `<span class="report-repost-pill report-badge-branch"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;">repeat</span> Репост из филиала</span>`
                : `<span class="report-repost-pill"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;">repeat</span> Репост</span>`;

            const repostMetaHtml = `
                <div class="report-repost-meta">
                    ${badgeHtml}
                    <span class="report-repost-from">из</span>
                    <a href="${escapeHtml(repAuthor.url)}" target="_blank" rel="noopener noreferrer" class="report-repost-branch-link" data-repost-owner-id="${repAuthor.rawOwnerId}" title="Перейти на страницу ${repAuthor.isBranch ? 'филиала' : 'сообщества'} ВКонтакте">
                        <span class="repost-name-text">${escapeHtml(repAuthor.name)}</span>
                    </a>
                    <a href="${escapeHtml(originalPostUrl)}" target="_blank" rel="noopener noreferrer" class="report-repost-post-link" title="Открыть оригинальную запись ВКонтакте">
                        <span>Запись репоста</span>
                        <span class="material-symbols-outlined icon" style="font-size:12px;">open_in_new</span>
                    </a>
                </div>
            `;

            const repBodyHtml = repText
                ? renderTruncatedSnippet(repText)
                : (getAttachmentHint(rep.attachments) || '<span class="report-empty-hint">(Репост публикации без текста)</span>');

            if (directText) {
                return `
                    <div class="report-direct-text" style="margin-bottom: 8px;">
                        ${renderTruncatedSnippet(directText)}
                    </div>
                    <div class="report-repost-text-wrap">
                        ${repostMetaHtml}
                        ${repBodyHtml}
                    </div>
                `;
            } else {
                return `
                    ${repostMetaHtml}
                    <div class="report-repost-text-wrap" style="border-left: none; padding-left: 0; margin-top: 2px;">
                        ${repBodyHtml}
                    </div>
                `;
            }
        }

        if (directText) {
            return renderTruncatedSnippet(directText);
        }

        const attHint = getAttachmentHint(p.attachments);
        if (attHint) {
            return attHint;
        }

        return '<span class="report-empty-hint">(Без текста)</span>';
    }

    const FULL_MONTHS_GENITIVE = [
        '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const FULL_MONTHS_NOMINATIVE = [
        '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    /**
     * Format search date period for the official report passport,
     * including exact day/month/year when specific date is selected.
     */
    function formatReportDatePeriod(yearStart, yearEnd, selectedMonths, dayValue) {
        const startY = parseInt(yearStart, 10) || 2010;
        const endY = parseInt(yearEnd, 10) || new Date().getFullYear();
        const isSingleYear = startY === endY;
        const yearStr = isSingleYear ? `${startY} г.` : `${startY}–${endY} гг.`;

        const sortedMonths = Array.from(selectedMonths || []).sort((a, b) => a - b);
        const monthShortNames = sortedMonths.map(mId => state.months.find(m => m.id === mId)?.name).filter(Boolean).join(', ');

        const hasSpecificDay = dayValue && dayValue !== 'all';

        if (hasSpecificDay) {
            const dayNum = parseInt(dayValue, 10);
            // Single month and single year (e.g. "5 сентября 2026 г.")
            if (sortedMonths.length === 1 && isSingleYear) {
                const mId = sortedMonths[0];
                const mName = FULL_MONTHS_GENITIVE[mId] || state.months.find(m => m.id === mId)?.name;
                return `${dayNum} ${mName} ${startY} г.`;
            }
            // Single month, multi-year (e.g. "5 сентября (2024–2026 гг.)")
            if (sortedMonths.length === 1 && !isSingleYear) {
                const mId = sortedMonths[0];
                const mName = FULL_MONTHS_GENITIVE[mId] || state.months.find(m => m.id === mId)?.name;
                return `${dayNum} ${mName} (${yearStr})`;
            }
            // Multiple months selected (e.g. "5 число (Янв, Сен), 2026 г.")
            if (sortedMonths.length > 1 && sortedMonths.length < 12) {
                return `${dayNum} число (${monthShortNames}), ${yearStr}`;
            }
            // All months or no months filter (e.g. "5 число каждого месяца (2026 г.)")
            return `${dayNum} число каждого месяца (${yearStr})`;
        }

        // All days (no specific day)
        if (sortedMonths.length === 1 && isSingleYear) {
            const mId = sortedMonths[0];
            const mName = FULL_MONTHS_NOMINATIVE[mId] || state.months.find(m => m.id === mId)?.name;
            return `${mName} ${startY} г.`;
        }

        return `${yearStr} (${monthShortNames || 'Все месяцы'})`;
    }

    function renderOfficialReport(stats) {
        if (!elements.reportTablesContainer) return;

        const totalPosts = state.matchedPosts.length;
        let grandLikes = 0, grandReposts = 0, grandViews = 0;
        state.matchedPosts.forEach(p => {
            grandLikes += extractNum(p.likes);
            grandReposts += extractNum(p.reposts);
            grandViews += extractNum(p.views);
        });

        if (elements.reportTotalMatches) elements.reportTotalMatches.textContent = totalPosts;
        const rLikesEl = document.getElementById('report-total-likes');
        const rRepostsEl = document.getElementById('report-total-reposts');
        const rViewsEl = document.getElementById('report-total-views');
        if (rLikesEl) rLikesEl.textContent = grandLikes;
        if (rRepostsEl) rRepostsEl.textContent = grandReposts;
        if (rViewsEl) rViewsEl.textContent = formatViews(grandViews);

        if (elements.reportDatesFilter) {
            const dayVal = state.lastDayFilter || elements.daySelect?.value || 'all';
            const yStart = state.lastYearStart ?? elements.yearStartInput?.value ?? 2010;
            const yEnd = state.lastYearEnd ?? elements.yearEndInput?.value ?? new Date().getFullYear();
            const monthsSet = state.lastSelectedMonths || state.selectedMonths;
            elements.reportDatesFilter.textContent = formatReportDatePeriod(yStart, yEnd, monthsSet, dayVal);
        }
        if (elements.reportSearchQuery) {
            elements.reportSearchQuery.textContent = elements.keywordInput?.value.trim() || 'Все темы (без фильтра по тексту)';
        }
        if (elements.reportGenerationTime) {
            elements.reportGenerationTime.textContent = new Date().toLocaleString('ru-RU');
        }

        // Summary Passport Matrix
        if (elements.reportSourceName) {
            elements.reportSourceName.innerHTML = `
                <div class="passport-sources-grid">
                    ${stats.map(s => `
                        <div class="report-source-chip">
                            ${renderBranchAvatarHtml(s.info, 'sm')}
                            <div class="report-chip-info">
                                <span class="report-chip-name">${escapeHtml(s.info.canonicalName || s.info.name)}</span>
                                ${s.info.address ? `<span class="report-chip-sub">${escapeHtml(s.info.address)}</span>` : ''}
                            </div>
                            <span class="report-chip-count ${s.postsCount > 0 ? 'count-active' : 'count-zero'}">${s.postsCount} ${declOfNum(s.postsCount, ['запись', 'записи', 'записей'])}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Tables per group (collapsed by default, accordion toggle on title)
        elements.reportTablesContainer.innerHTML = stats.map((s, idx) => {
            if (s.postsCount === 0) return '';
            const rows = s.posts.map((p, pi) => {
                const textHtml = buildReportPostText(p);

                return `
                <tr>
                    <td style="text-align:center;">${pi + 1}</td>
                    <td style="white-space:nowrap;">${p.humanDate}</td>
                    <td class="report-col-text">${textHtml}</td>
                    <td style="text-align:right;font-family:var(--font-mono);">${extractNum(p.likes)}</td>
                    <td style="text-align:right;font-family:var(--font-mono);">${extractNum(p.reposts)}</td>
                    <td style="text-align:right;font-family:var(--font-mono);">${formatViews(p.views)}</td>
                    <td style="text-align:center;">
                        <a href="https://vk.com/wall${p.targetInfo?.id || p.owner_id}_${p.id}" target="_blank" rel="noopener noreferrer" class="btn-report-link btn-outlined">
                            <span>ССЫЛКА</span>
                            <span class="material-symbols-outlined icon">open_in_new</span>
                        </a>
                    </td>
                </tr>
            `;
            }).join('');

            return `
                <div class="report-group-section" id="report-group-${idx}">
                    <div class="report-group-title">
                        <div class="report-group-title-left">
                            <span class="material-symbols-outlined group-toggle-arrow">expand_more</span>
                            ${renderBranchAvatarHtml(s.info, 'sm')}
                            <h4 class="report-group-heading">${escapeHtml(s.info.canonicalName || s.info.name)}</h4>
                            <span class="report-group-badge">${s.postsCount} ${declOfNum(s.postsCount, ['запись', 'записи', 'записей'])}</span>
                        </div>
                        <div class="report-group-title-right no-print">
                            <button type="button" class="btn btn-ghost btn-xs report-branch-print-btn" title="Распечатать официальный отчёт">
                                <span class="material-symbols-outlined icon">print</span>
                                <span>Печать</span>
                            </button>
                            <button type="button" class="btn btn-ghost btn-xs report-branch-doc-btn" title="Экспорт в Word">
                                <span class="material-symbols-outlined icon">description</span>
                                <span>Word</span>
                            </button>
                        </div>
                    </div>
                    <div class="report-group-body">
                        <div class="table-responsive">
                            <table class="report-table">
                                <thead>
                                    <tr>
                                        <th style="width:40px; text-align:center;" class="no-sort" data-no-sort>№</th>
                                        <th style="width:130px;">Дата</th>
                                        <th>Текст публикации</th>
                                        <th style="width:70px; text-align:right;">Лайки</th>
                                        <th style="width:70px; text-align:right;">Репосты</th>
                                        <th style="width:85px; text-align:right;">Просмотры</th>
                                        <th style="width:110px; text-align:center;" class="no-sort" data-no-sort>Ссылка</th>
                                    </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Make all report tables sortable
        elements.reportTablesContainer.querySelectorAll('table.report-table').forEach(tbl => {
            makeTableSortable(tbl);
        });

        // Wire accordion toggle on section title
        elements.reportTablesContainer.querySelectorAll('.report-group-section').forEach(section => {
            const titleEl = section.querySelector('.report-group-title');
            if (titleEl) {
                titleEl.addEventListener('click', (e) => {
                    if (e.target.closest('.report-branch-print-btn') || e.target.closest('.report-branch-doc-btn')) return;
                    section.classList.toggle('expanded');
                });
            }
        });

        // Wire branch print and doc buttons
        elements.reportTablesContainer.querySelectorAll('.report-branch-print-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handlePrint();
            });
        });
        elements.reportTablesContainer.querySelectorAll('.report-branch-doc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleExportDocx();
            });
        });

        // Wire expand/collapse for shortened post texts in report
        elements.reportTablesContainer.querySelectorAll('.btn-report-expand-text').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrap = btn.closest('.report-text-wrap');
                if (!wrap) return;
                const preview = wrap.querySelector('.report-text-preview');
                const full = wrap.querySelector('.report-text-full');
                const label = btn.querySelector('.btn-expand-label');
                const icon = btn.querySelector('.material-symbols-outlined');
                const isExpanded = btn.getAttribute('data-expanded') === 'true';
                const remaining = parseInt(btn.getAttribute('data-remaining') || '0', 10);

                if (isExpanded) {
                    preview?.classList.remove('hidden');
                    full?.classList.add('hidden');
                    btn.setAttribute('data-expanded', 'false');
                    btn.classList.remove('is-expanded');
                    if (label) label.textContent = `Развернуть полностью (ещё ${remaining} ${declOfNum(remaining, ['предложение', 'предложения', 'предложений'])})`;
                    if (icon) icon.textContent = 'expand_more';
                } else {
                    preview?.classList.add('hidden');
                    full?.classList.remove('hidden');
                    btn.setAttribute('data-expanded', 'true');
                    btn.classList.add('is-expanded');
                    if (label) label.textContent = 'Свернуть';
                    if (icon) icon.textContent = 'expand_less';
                }
            });
        });
    }

    if (elements.toggleAllReportBtn) {
        elements.toggleAllReportBtn.addEventListener('click', () => {
            const sections = elements.reportTablesContainer?.querySelectorAll('.report-group-section');
            if (!sections || sections.length === 0) return;
            const anyCollapsed = Array.from(sections).some(s => !s.classList.contains('expanded'));
            sections.forEach(s => {
                if (anyCollapsed) {
                    s.classList.add('expanded');
                } else {
                    s.classList.remove('expanded');
                }
            });
            const btnText = elements.toggleAllReportBtn.querySelector('span:not(.material-symbols-outlined)');
            const btnIcon = elements.toggleAllReportBtn.querySelector('.material-symbols-outlined');
            if (anyCollapsed) {
                if (btnText) btnText.textContent = 'Свернуть все';
                if (btnIcon) btnIcon.textContent = 'unfold_less';
            } else {
                if (btnText) btnText.textContent = 'Развернуть все';
                if (btnIcon) btnIcon.textContent = 'unfold_more';
            }
        });
    }

    // =========================================================================
    // 11b. Hashtag Analysis & External Links Registry
    // =========================================================================
    function renderHashtagsAndLinks(matchedPosts) {
        if (!matchedPosts || matchedPosts.length === 0) {
            if (elements.hashtagsTotalCount) elements.hashtagsTotalCount.textContent = '0 тегов';
            if (elements.linksTotalCount) elements.linksTotalCount.textContent = '0 ссылок';
            if (elements.hashtagCloudContainer) elements.hashtagCloudContainer.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.85rem;">Нет данных — выполните поиск</span>';
            if (elements.hashtagsTbody) elements.hashtagsTbody.innerHTML = '';
            if (elements.linksTbody) elements.linksTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary);padding:1.5rem;">Нет данных</td></tr>';
            return;
        }

        // 1. Hashtag Analysis
        const hashtagMap = {};
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
                    }
                });
            }
        });

        const sortedTags = Object.keys(hashtagMap).map(tag => ({
            tag,
            count: hashtagMap[tag],
            share: ((hashtagMap[tag] / matchedPosts.length) * 100).toFixed(1)
        })).sort((a, b) => b.count - a.count);

        if (elements.hashtagsTotalCount) {
            elements.hashtagsTotalCount.textContent = `${sortedTags.length} уникальных тегов`;
        }

        // Render Hashtag Cloud
        if (elements.hashtagCloudContainer) {
            elements.hashtagCloudContainer.innerHTML = '';
            if (sortedTags.length === 0) {
                elements.hashtagCloudContainer.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.85rem;">Хэштеги в найденных записях не обнаружены</span>';
            } else {
                sortedTags.slice(0, 40).forEach(item => {
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'hashtag-pill';
                    pill.innerHTML = `<span>#${escapeHtml(item.tag)}</span><span class="tag-count">${item.count}</span>`;
                    pill.addEventListener('click', () => {
                        state.activeBranchFilter = null;
                        state.activeHashtagFilter = item.tag;
                        try { Mascot.onHashtagFiltered(item.tag, item.count); } catch (e) {}
                        if (elements.tabBtns) {
                            elements.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === 'visual-tab'));
                        }
                        if (elements.tabContents) {
                            elements.tabContents.forEach(c => {
                                c.classList.remove('active', 'active-content');
                                if (c.id === 'visual-tab') { c.classList.add('active', 'active-content'); }
                            });
                        }
                        applySortAndFilterFeed();
                    });
                    elements.hashtagCloudContainer.appendChild(pill);
                });
            }
        }

        // Render Hashtags Table
        if (elements.hashtagsTbody) {
            elements.hashtagsTbody.innerHTML = '';
            if (sortedTags.length === 0) {
                elements.hashtagsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:1.5rem;">Хэштеги не обнаружены</td></tr>';
            } else {
                sortedTags.slice(0, 25).forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:center;color:var(--text-tertiary);font-weight:700;">${index + 1}</td>
                        <td style="font-weight:600;color:var(--accent);">#${escapeHtml(item.tag)}</td>
                        <td style="text-align:right;font-weight:700;">${item.count}</td>
                        <td style="text-align:right;">${item.share}%</td>
                        <td style="text-align:center;">
                            <button type="button" class="btn btn-tonal btn-sm" data-tag="${escapeHtml(item.tag)}" style="font-size:0.75rem;padding:3px 10px;">
                                <span class="material-symbols-outlined" style="font-size:13px;">filter_alt</span>
                                <span>Показать</span>
                            </button>
                        </td>
                    `;
                    tr.querySelector('button').addEventListener('click', () => {
                        state.activeBranchFilter = null;
                        state.activeHashtagFilter = item.tag;
                        try { Mascot.onHashtagFiltered(item.tag, item.count); } catch (e) {}
                        if (elements.tabBtns) {
                            elements.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === 'visual-tab'));
                        }
                        if (elements.tabContents) {
                            elements.tabContents.forEach(c => {
                                c.classList.remove('active', 'active-content');
                                if (c.id === 'visual-tab') { c.classList.add('active', 'active-content'); }
                            });
                        }
                        applySortAndFilterFeed();
                    });
                    elements.hashtagsTbody.appendChild(tr);
                });
            }
        }

        // 2. External Links Registry
        const linksMap = {};
        matchedPosts.forEach(p => {
            const urlsInPost = new Set();
            if (p.text) {
                const urlMatches = p.text.match(/https?:\/\/[^\s<>"')]+/g);
                if (urlMatches) {
                    urlMatches.forEach(url => {
                        urlsInPost.add(url.replace(/[.,;:!?)]+$/, ''));
                    });
                }
            }
            if (p.attachments && Array.isArray(p.attachments)) {
                p.attachments.forEach(att => {
                    if (att.type === 'link' && att.link && att.link.url) {
                        urlsInPost.add(att.link.url.replace(/[.,;:!?)]+$/, ''));
                    }
                });
            }
            urlsInPost.forEach(url => {
                linksMap[url] = (linksMap[url] || 0) + 1;
            });
        });

        const sortedLinks = Object.keys(linksMap).map(url => {
            let domain = url;
            try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch(e) {}
            let badgeTitle = domain;
            if (domain.includes('culture.ru') || domain.includes('культура.рф')) badgeTitle = 'Портал Культура.РФ';
            else if (domain.includes('biblioteka33.ru')) badgeTitle = 'biblioteka33.ru';
            else if (domain.includes('forms.yandex') || domain.includes('forms.gle')) badgeTitle = 'Опросы / Анкеты';
            else if (domain.includes('timepad.ru')) badgeTitle = 'TimePad';
            else if (domain.includes('vk.cc')) badgeTitle = 'Короткая ссылка VK';
            return { url, domain: badgeTitle, count: linksMap[url] };
        }).sort((a, b) => b.count - a.count);

        if (elements.linksTotalCount) {
            elements.linksTotalCount.textContent = `${sortedLinks.length} уникальных ссылок`;
        }

        if (elements.linksTbody) {
            elements.linksTbody.innerHTML = '';
            if (sortedLinks.length === 0) {
                elements.linksTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary);padding:1.5rem;">Внешние ссылки в записях не обнаружены</td></tr>';
            } else {
                sortedLinks.slice(0, 30).forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="badge" style="font-size:0.76rem; max-width: 170px; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle; white-space: nowrap;" title="${escapeHtml(item.domain)}">${escapeHtml(item.domain)}</span></td>
                        <td style="text-align:center;">
                            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="btn-report-link" title="${escapeHtml(item.url)}">
                                <span>ССЫЛКА</span>
                                <span class="material-symbols-outlined icon">open_in_new</span>
                            </a>
                        </td>
                        <td style="text-align:right;font-weight:700;">${item.count}</td>
                    `;
                    elements.linksTbody.appendChild(tr);
                });
            }
        }
    }

    function renderMethodistMemo(kpis, stats) {
        if (!elements.methodistMemoTextarea) return;
        const activeBranches = stats.filter(s => s.postsCount >= 10);
        const lowBranches = stats.filter(s => s.postsCount > 0 && s.postsCount < 10);
        const zeroBranches = stats.filter(s => s.postsCount === 0);

        const text = [
            `СПРАВКА-ОТЧЕТ ПО ДЕЯТЕЛЬНОСТИ БИБЛИОТЕК В СОЦИАЛЬНОЙ СЕТИ ВКОНТАКТЕ`,
            `Период: ${elements.reportDatesFilter?.textContent || `${elements.yearStartInput.value}-${elements.yearEndInput.value} гг.`}`,
            `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`,
            ``,
            `1. ОБЩИЕ ПОКАЗАТЕЛИ СЕТИ:`,
            `— Всего проанализировано филиалов: ${stats.length}`,
            `— Опубликовано записей за период: ${kpis.count}`,
            `— Суммарный читательский охват (просмотры): ${formatViews(kpis.totalViews)}`,
            `— Общее количество взаимодействий (лайки, репосты, комменты): ${kpis.totalInteractions}`,
            `— Средний коэффициент читательского вовлечения (ER): ${kpis.erViews}`,
            ``,
            `2. СТАТУС ВЫПОЛНЕНИЯ ПЛАНА ПУБЛИКАЦИОННОЙ АКТИВНОСТИ:`,
            `— Выполнили норматив (≥10 постов): ${activeBranches.length} филиалов (${activeBranches.map(b => b.info.canonicalName).join(', ') || 'нет'})`,
            `— Ниже нормы (<10 постов): ${lowBranches.length} филиалов (${lowBranches.map(b => b.info.canonicalName).join(', ') || 'нет'})`,
            `— Не вели активность (0 постов): ${zeroBranches.length} филиалов (${zeroBranches.map(b => b.info.canonicalName).join(', ') || 'нет'})`,
            ``,
            `3. КРОСС-ПОСТИНГ И СЕТЕВЫЕ АКЦИИ:`,
            `— Обнаружено общих серий анонсов: ${state.crossPostingData?.totalClusters || 0}`,
            `— Выявлено повторных публикаций между группами: ${state.crossPostingData?.totalDuplicates || 0}`,
            ``,
            `Методический отдел МБУК «ЦГБ» г. Владимира`
        ].join('\n');

        elements.methodistMemoTextarea.value = text;
    }

    if (elements.copyMemoBtn) {
        elements.copyMemoBtn.addEventListener('click', () => {
            if (elements.methodistMemoTextarea) {
                copyPostToClipboard(elements.methodistMemoTextarea.value, elements.copyMemoBtn);
            }
        });
    }

    function handleExportCsv() {
        const posts = state.filteredPosts.length > 0 ? state.filteredPosts : state.matchedPosts;
        if (posts.length === 0) {
            showToast('Нет данных для экспорта', 'warning');
            return;
        }
        try {
            exportToCsv(posts);
            showToast(`Экспортировано ${posts.length} записей в CSV`, 'table_view');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function handleExportDocx() {
        const posts = state.matchedPosts;
        if (posts.length === 0) {
            showToast('Нет данных для экспорта в Word', 'warning');
            return;
        }
        try {
            // Подписочные тренды для раздела «Динамика подписчиков» в DOC
            let subsRows = [];
            try {
                const series = buildGroupSeries(state.subsHistory || []);
                const trends = computeTrends(series);
                subsRows = Array.from(trends.values()).sort((a, b) =>
                    String(a.branch || a.name || '').localeCompare(String(b.branch || b.name || ''), 'ru', { numeric: true }));
            } catch (e) { /* раздел подписчиков опционален */ }
            const meta = {
                datesFilter: elements.reportDatesFilter?.textContent || '',
                searchQuery: elements.reportSearchQuery?.textContent || '',
                generationTime: elements.reportGenerationTime?.textContent || new Date().toLocaleString('ru-RU'),
                subscribers: subsRows,
                appVersion: APP_VERSION
            };
            exportToDocx(posts, state.lastGroupsStats || [], meta);
            showToast('Отчёт сформирован в формате Microsoft Word (DOC)', 'description');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function handlePrint() {
        if (state.matchedPosts.length === 0) {
            showToast('Нет данных для печати отчёта', 'warning');
            return;
        }
        // Switch to report tab if not active so DOM is visible
        const reportTabBtn = document.querySelector('.tab-btn[data-tab="report-tab"]');
        if (reportTabBtn && !reportTabBtn.classList.contains('active')) {
            reportTabBtn.click();
        }
        // Expand all sections so all rows print
        if (elements.reportTablesContainer) {
            elements.reportTablesContainer.querySelectorAll('.report-group-section').forEach(s => s.classList.add('expanded'));
        }
        setTimeout(() => {
            openPrintReport();
        }, 150);
    }

    // Print buttons
    if (elements.printReportBtn) elements.printReportBtn.addEventListener('click', handlePrint);
    if (elements.quickPrintBtn) elements.quickPrintBtn.addEventListener('click', handlePrint);

    // =========================================================================
    // 12. Tabs Navigation
    // =========================================================================
    if (elements.tabBtns) {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.dataset.tab;
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabContents.forEach(c => {
                    c.classList.remove('active');
                    c.classList.remove('active-content');
                });
                btn.classList.add('active');
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.classList.add('active-content');
                }

                // Уведомляем Космо о смене вкладки, чтобы он комментировал голосом и обновлял чипы ИИ
                try {
                    Mascot.onTabSwitched(targetTabId, state);
                } catch (e) {
                    console.warn('[Mascot] onTabSwitched error:', e);
                }

                // При переключении на вкладку «Рейтинг активности» перезапускаем плавную анимацию графиков
                if (targetTabId === 'analytics-tab' && state.lastGroupsStats && state.lastGroupsStats.length > 0) {
                    renderAnalyticsChart(state.lastGroupsStats);
                }

                // v3.4: при открытии вкладки «Подписчики» тянем свежую историю с сервера
                if (targetTabId === 'subscribers-tab' && elements.subscribersTabContent) {
                    fetchHistory().then(h => {
                        state.subsHistory = h;
                        renderSubscribersTab(elements.subscribersTabContent, {
                            history: h,
                            branches: state.libraryBranchesList || [],
                            token: state.token,
                            onToast: showToast,
                            onCollectDone: fresh => { state.subsHistory = fresh; }
                        });
                    });
                }
            });
        });
    }

    // =========================================================================
    // 13. Export & Share Handlers
    // =========================================================================
    // CSV Export buttons
    if (elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', handleExportCsv);
    if (elements.downloadCsvBtn) elements.downloadCsvBtn.addEventListener('click', handleExportCsv);

    // Word (DOCX) Export buttons
    if (elements.downloadDocBtn) elements.downloadDocBtn.addEventListener('click', handleExportDocx);
    if (elements.quickDocBtn) elements.quickDocBtn.addEventListener('click', handleExportDocx);

    // Report Tab: Export JSON
    if (elements.downloadJsonBtn) {
        elements.downloadJsonBtn.addEventListener('click', () => {
            const posts = state.matchedPosts;
            if (posts.length === 0) {
                showToast('Нет данных для экспорта в JSON', 'warning');
                return;
            }
            try {
                exportToJson(posts, state.lastGroupsStats || []);
                showToast(`Экспортировано в JSON (${posts.length} записей)`, 'data_object');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Report Tab: Export Standalone HTML
    if (elements.downloadHtmlBtn) {
        elements.downloadHtmlBtn.addEventListener('click', () => {
            const docEl = elements.reportDocument;
            if (!docEl || state.matchedPosts.length === 0) {
                showToast('Нет данных отчёта для экспорта в HTML', 'warning');
                return;
            }
            try {
                exportToHtmlReport(docEl);
                showToast('Автономный HTML-отчёт скачан', 'code');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Report Tab: Copy Report Text
    if (elements.copyReportBtn) {
        elements.copyReportBtn.addEventListener('click', async () => {
            const reportDoc = elements.reportDocument;
            if (!reportDoc) {
                showToast('Отчёт не найден', 'warning');
                return;
            }
            try {
                const text = reportDoc.innerText.trim();
                if (!text) {
                    showToast('Отчёт пуст', 'warning');
                    return;
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                showToast('Текст отчёта скопирован в буфер обмена', 'assignment_turned_in');
            } catch (err) {
                showToast('Не удалось скопировать отчёт: ' + err.message, 'error');
            }
        });
    }

    // Analytics Tab: Export Branches Rating CSV
    if (elements.exportRatingCsvBtn) {
        elements.exportRatingCsvBtn.addEventListener('click', () => {
            const stats = state.lastGroupsStats;
            if (!stats || stats.length === 0) {
                showToast('Нет данных рейтинга для экспорта', 'warning');
                return;
            }
            try {
                exportRatingToCsv(stats);
                showToast(`Рейтинг филиалов экспортирован в CSV (${stats.length} филиалов)`, 'table_view');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    if (elements.downloadPhotosBtn) {
        elements.downloadPhotosBtn.addEventListener('click', async () => {
            const posts = state.filteredPosts.length > 0 ? state.filteredPosts : state.matchedPosts;
            if (posts.length === 0) {
                showToast('Нет записей для выгрузки фото', 'warning');
                return;
            }
            elements.downloadPhotosBtn.disabled = true;
            try {
                showToast('Сбор фотографий...', 'download', 60000);
                await exportPhotosZip(posts, (done, total) => {
                    if (done % 5 === 0 || done === total) {
                        showToast(`Загрузка фото: ${done} из ${total}...`, 'download', 60000);
                    }
                });
                showToast('Архив фотографий успешно создан!', 'check_circle');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                elements.downloadPhotosBtn.disabled = false;
            }
        });
    }

    if (elements.shareLinkBtn) {
        elements.shareLinkBtn.addEventListener('click', () => {
            const params = {
                target: elements.targetInput?.value.trim() || '',
                keyword: elements.keywordInput?.value.trim() || '',
                exclude: elements.excludeInput?.value.trim() || '',
                hashtag: elements.hashtagInput?.value.trim() || '',
                months: [...state.selectedMonths],
                yearStart: elements.yearStartInput?.value || '',
                yearEnd: elements.yearEndInput?.value || '',
                andOr: state.andOrMode,
                onlyPhotos: elements.onlyPhotosCheck?.checked ? '1' : '',
                onlyVideos: elements.onlyVideosCheck?.checked ? '1' : '',
                excludeReposts: elements.excludeRepostsCheck?.checked ? '1' : '',
                onlyReposts: elements.onlyRepostsCheck?.checked ? '1' : '',
                onlyPolls: elements.onlyPollsCheck?.checked ? '1' : '',
                onlyLinks: elements.onlyLinksCheck?.checked ? '1' : ''
            };
            const hash = btoa(encodeURIComponent(JSON.stringify(params)));
            const url = location.href.split('#')[0] + '#s=' + hash;
            navigator.clipboard.writeText(url).then(() => {
                showToast('Ссылка на поиск скопирована в буфер!', 'link');
            }).catch(() => {
                prompt('Скопируйте ссылку:', url);
            });
        });
    }

    // Modal Close handlers
    function closePostModal() {
        if (!elements.postModal) return;
        elements.postModal.classList.add('hidden');
        elements.postModal.classList.remove('active', 'pm-open');
        document.body.style.overflow = '';
    }

    // Universal click delegator for closing modals
    document.addEventListener('click', (e) => {
        // Search modal close cross
        if (e.target.closest('#modal-search-close') || e.target.closest('.modal-search-close-btn')) {
            if (state.isScanning) {
                triggerModalAttention();
                return;
            }
            closeSearchModal();
            return;
        }
        // Search modal backdrop click
        if (e.target === elements.searchModalOverlay) {
            if (state.isScanning) {
                // При поиске клик по пустому месту не должен сбрасывать поиск и закрывать окно!
                triggerModalAttention();
                return;
            }
            closeSearchModal();
            return;
        }
        // Post modal close cross
        if (e.target.closest('#post-modal-close') || (e.target.closest('.pm-close-btn') && e.target.closest('#post-modal'))) {
            closePostModal();
            return;
        }
        // Post modal backdrop click
        if (e.target === elements.postModal) {
            closePostModal();
            return;
        }
        // Help modal close cross
        if (e.target.closest('#help-close-btn')) {
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.remove('help-open');
                helpModal.classList.add('hidden');
                document.body.style.overflow = '';
            }
            return;
        }
        // Help modal backdrop click
        const helpModal = document.getElementById('help-modal');
        if (helpModal && e.target === helpModal) {
            helpModal.classList.remove('help-open');
            helpModal.classList.add('hidden');
            document.body.style.overflow = '';
            return;
        }
    });

    // Universal Keyboard Shortcuts & Escape Listener for Power UX
    document.addEventListener('keydown', (e) => {
        const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
                          document.activeElement?.isContentEditable;

        // Ctrl+Enter or Cmd+Enter: Instant Search Launch
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (elements.searchForm && !state.isScanning) {
                elements.searchForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
            return;
        }

        // Escape: Close all modals & overlays
        if (e.key === 'Escape') {
            if (state.isScanning) {
                triggerModalAttention();
                return;
            }
            if (elements.searchModalOverlay && !elements.searchModalOverlay.classList.contains('hidden')) {
                closeSearchModal();
            }
            if (elements.postModal && (!elements.postModal.classList.contains('hidden') || elements.postModal.classList.contains('pm-open') || elements.postModal.classList.contains('active'))) {
                closePostModal();
            }
            const helpModal = document.getElementById('help-modal');
            if (helpModal && (helpModal.classList.contains('help-open') || !helpModal.classList.contains('hidden'))) {
                helpModal.classList.remove('help-open');
                helpModal.classList.add('hidden');
                document.body.style.overflow = '';
            }
            const videoModal = document.getElementById('video-help-modal');
            if (videoModal && (videoModal.classList.contains('video-open') || !videoModal.classList.contains('hidden'))) {
                videoModal.classList.remove('video-open');
                videoModal.classList.add('hidden');
                document.body.style.overflow = '';
                const v = document.getElementById('aurora-guide-video');
                if (v) v.pause();
            }
            return;
        }

        // Navigation hotkeys when NOT typing in inputs
        if (!isEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Quick tab switching 1, 2, 3, 4, 5, 6
            const tabMap = {
                '1': 'visual-tab',
                '2': 'report-tab',
                '3': 'analytics-tab',
                '4': 'summary-tab',
                '5': 'advice-tab',
                '6': 'subscribers-tab',
                '7': 'ai-tab'
            };
            if (tabMap[e.key]) {
                const targetTabId = tabMap[e.key];
                const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
                if (targetBtn) {
                    targetBtn.click();
                    showToast(`Вкладка: ${targetBtn.querySelector('span:not(.icon):not(.tab-badge)')?.textContent?.trim() || targetTabId}`, 'tab');
                }
                return;
            }

            // 'T' / 't': Quick theme toggle
            if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
                const themeBtn = document.getElementById('theme-toggle-btn');
                if (themeBtn) themeBtn.click();
                return;
            }

            // '/': Quick focus search keyword
            if (e.key === '/') {
                e.preventDefault();
                if (elements.keywordInput) {
                    elements.keywordInput.focus();
                    elements.keywordInput.select();
                }
                return;
            }

            // '?' or 'H' / 'h': Toggle Help
            if (e.key === '?' || e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
                const helpBtn = document.getElementById('help-btn');
                if (helpBtn) helpBtn.click();
                return;
            }

            // 'v' or 'V' / 'м' / 'М': Toggle Video Help
            if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
                const videoBtn = document.getElementById('video-help-btn');
                if (videoBtn) videoBtn.click();
                return;
            }
        }
    });

    // =========================================================================
    // 14. Toast & History
    // =========================================================================
    let toastTimeout = null;
    function showToast(msg, icon = 'info', duration = 3200) {
        let toast = document.getElementById('agy-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'agy-toast';
            toast.className = 'agy-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span>${escapeHtml(msg)}</span>`;
        toast.classList.add('toast-show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('toast-show');
        }, duration);
    }

    function saveSearchHistory(target, kw) {
        try {
            const raw = localStorage.getItem('vk_search_history');
            let list = raw ? JSON.parse(raw) : [];
            const item = { target, kw, date: Date.now() };
            list = [item, ...list.filter(x => x.target !== target || x.kw !== kw)].slice(0, 8);
            localStorage.setItem('vk_search_history', JSON.stringify(list));
            renderSearchHistory();
        } catch(e) {}
    }

    function renderSearchHistory() {
        if (!elements.shList) return;
        try {
            const raw = localStorage.getItem('vk_search_history');
            const list = raw ? JSON.parse(raw) : [];
            if (list.length === 0) {
                if (elements.searchHistoryBar) elements.searchHistoryBar.style.display = 'none';
                return;
            }
            if (elements.searchHistoryBar) elements.searchHistoryBar.style.display = 'flex';
            elements.shList.innerHTML = list.map(item => `
                <button type="button" class="sh-item" data-target="${escapeHtml(item.target)}" data-kw="${escapeHtml(item.kw || '')}">
                    <span class="material-symbols-outlined">history</span>
                    <span>${escapeHtml(item.target)} ${item.kw ? `(${escapeHtml(item.kw)})` : ''}</span>
                </button>
            `).join('');

            elements.shList.querySelectorAll('.sh-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (elements.targetInput) elements.targetInput.value = btn.dataset.target;
                    if (elements.keywordInput) elements.keywordInput.value = btn.dataset.kw;
                });
            });
        } catch(e) {}
    }

    if (elements.shClearBtn) {
        elements.shClearBtn.addEventListener('click', () => {
            localStorage.removeItem('vk_search_history');
            renderSearchHistory();
        });
    }

    // Restore from URL Hash
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
            if (p.andOr) {
                state.andOrMode = p.andOr;
                elements.andOrBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === p.andOr));
            }
            if (p.onlyPhotos && elements.onlyPhotosCheck) elements.onlyPhotosCheck.checked = true;
            if (p.onlyVideos && elements.onlyVideosCheck) elements.onlyVideosCheck.checked = true;
            if (p.excludeReposts && elements.excludeRepostsCheck) elements.excludeRepostsCheck.checked = true;
            if (p.onlyReposts && elements.onlyRepostsCheck) elements.onlyRepostsCheck.checked = true;
            if (p.onlyPolls && elements.onlyPollsCheck) elements.onlyPollsCheck.checked = true;
            if (p.onlyLinks && elements.onlyLinksCheck) elements.onlyLinksCheck.checked = true;
            if (Array.isArray(p.months)) {
                state.selectedMonths = new Set(p.months.map(Number));
                document.querySelectorAll('.month-check').forEach(cb => {
                    cb.checked = state.selectedMonths.has(+cb.dataset.month);
                    cb.closest('.month-btn')?.classList.toggle('selected', cb.checked);
                });
            }
            showToast('Параметры поиска восстановлены из ссылки', 'link');
        } catch(e) {}
    })();

    // =========================================================================
    // 14.5. v3.4 — Настройки приложения: обновления с GitHub, данные
    // =========================================================================
    function fmtUpdaterTs(ts) {
        if (!ts) return '—';
        return new Date(ts * 1000).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function applyUpdaterStatusToUI(status) {
        state.updaterStatus = status;
        if (!status || !status.ok) return;

        const local = status.local || {};
        if (elements.settingsVersionBadge) {
            elements.settingsVersionBadge.textContent = 'v' + (local.version || 'unknown');
        }
        if (elements.settingsCommitBadge) {
            elements.settingsCommitBadge.textContent = local.commit ? 'коммит ' + shortSha(local.commit) : '';
        }
        if (elements.settingsRepoLink && status.repo) {
            elements.settingsRepoLink.href = `https://github.com/${status.repo}`;
        }
        if (elements.settingsFootVersion) {
            elements.settingsFootVersion.textContent =
                `Статистика групп ВК • v${local.version || '?'} (${shortSha(local.commit) || '—'}) • ${status.repo || ''}`;
        }

        let extra = '';
        if (status.last_check && status.last_check.ok) {
            extra = ` Последняя проверка: ${fmtUpdaterTs(status.last_check.ts)}.`;
        }
        if (status.last_update) {
            extra += ` Последнее обновление: ${fmtUpdaterTs(status.last_update.ts)} → ${shortSha(status.last_update.to)}.`;
        }
        if (elements.settingsUpdateStatus && !state.updateAvailable) {
            elements.settingsUpdateStatus.innerHTML = '';
            elements.settingsUpdateStatus.textContent =
                (status.last_check && status.last_check.ok && !status.last_check.update_available
                    ? 'Установлена актуальная версия.'
                    : 'Нажмите «Проверить обновления».') + extra;
        }
    }

    /** Тихая проверка при запуске (кэш 6 ч на сервере) + точка на кнопке */
    async function initUpdater() {
        const status = await fetchUpdaterStatus();
        applyUpdaterStatusToUI(status);
        try {
            const chk = await checkForUpdates(false);
            markUpdateAvailable(chk);
        } catch (e) { /* нет сети/лимиты — молча */ }
    }

    function markUpdateAvailable(chk) {
        if (!chk || !chk.update_available) {
            state.updateAvailable = false;
            if (elements.updateDot) elements.updateDot.classList.add('hidden');
            if (elements.settingsApplyUpdateBtn) elements.settingsApplyUpdateBtn.classList.add('hidden');
            return;
        }
        state.updateAvailable = true;
        if (elements.updateDot) elements.updateDot.classList.remove('hidden');
        if (elements.settingsApplyUpdateBtn) elements.settingsApplyUpdateBtn.classList.remove('hidden');
        if (elements.settingsUpdateStatus) {
            const r = chk.remote || {};
            elements.settingsUpdateStatus.innerHTML =
                `<span class="update-available-label">Доступна новая версия!</span> ` +
                `Коммит ${shortSha(r.sha)} от ${r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '—'}: «${r.message || ''}»`;
        }
    }

    async function refreshSettingsKeyStatus() {
        if (!elements.settingsKeyStatus) return;
        elements.settingsKeyStatus.textContent = 'Проверка…';
        elements.settingsKeyStatus.className = 'status-indicator loading';
        const st = await getServerTokenStatus();
        if (st.reachable && st.configured) {
            elements.settingsKeyStatus.textContent = 'Серверный PHP-прокси активен';
            elements.settingsKeyStatus.className = 'status-indicator success';
        } else if (st.reachable) {
            elements.settingsKeyStatus.textContent = 'Серверный PHP-прокси активен (встроенный ключ)';
            elements.settingsKeyStatus.className = 'status-indicator success';
        } else {
            elements.settingsKeyStatus.textContent = state.token
                ? 'Автономный режим (пользовательский ключ)'
                : 'Автономный режим (встроенный ключ)';
            elements.settingsKeyStatus.className = 'status-indicator success';
        }
    }

    function openAppSettings() {
        if (!elements.appSettingsOverlay) return;
        elements.appSettingsOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        refreshSettingsKeyStatus();
        if (elements.settingsUpdateToken && !elements.settingsUpdateToken.value) {
            elements.settingsUpdateToken.value = getSavedUpdateToken();
        }
        if (state.updaterStatus) {
            applyUpdaterStatusToUI(state.updaterStatus);
        } else {
            fetchUpdaterStatus().then(applyUpdaterStatusToUI);
        }
    }

    function closeAppSettings() {
        if (!elements.appSettingsOverlay) return;
        elements.appSettingsOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        if (elements.settingsUpdateToken) {
            saveUpdateToken(elements.settingsUpdateToken.value.trim());
        }
    }

    // =========================================================================
    // Settings Password Protection (1Radio14881!)
    // При обновлении страницы пароль повторно не запрашивается (сохраняется в localStorage)
    // =========================================================================
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
        if (elements.settingsAuthOverlay) {
            elements.settingsAuthOverlay.classList.remove('hidden');
            if (elements.settingsAuthError) elements.settingsAuthError.classList.add('hidden');
            if (elements.settingsAuthInput) {
                elements.settingsAuthInput.value = '';
                setTimeout(() => elements.settingsAuthInput?.focus(), 80);
            }
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSettingsAuth() {
        if (elements.settingsAuthOverlay) {
            elements.settingsAuthOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
        pendingSettingsAction = null;
    }

    if (elements.settingsAuthClose) elements.settingsAuthClose.addEventListener('click', closeSettingsAuth);
    if (elements.settingsAuthCancel) elements.settingsAuthCancel.addEventListener('click', closeSettingsAuth);
    if (elements.settingsAuthOverlay) {
        elements.settingsAuthOverlay.addEventListener('click', (e) => {
            if (e.target === elements.settingsAuthOverlay) closeSettingsAuth();
        });
    }

    if (elements.settingsAuthForm) {
        elements.settingsAuthForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = elements.settingsAuthInput ? elements.settingsAuthInput.value.trim() : '';
            if (val === SETTINGS_AUTH_PASSWORD) {
                try {
                    localStorage.setItem(SETTINGS_AUTH_STORAGE_KEY, 'true');
                } catch (err) {}
                if (elements.settingsAuthError) elements.settingsAuthError.classList.add('hidden');
                closeSettingsAuth();
                showToast('Доступ к настройкам предоставлен', 'lock_open');
                if (typeof pendingSettingsAction === 'function') {
                    const cb = pendingSettingsAction;
                    pendingSettingsAction = null;
                    cb();
                }
            } else {
                if (elements.settingsAuthError) elements.settingsAuthError.classList.remove('hidden');
                if (elements.settingsAuthInput) {
                    elements.settingsAuthInput.select();
                    elements.settingsAuthInput.focus();
                }
                showToast('Неверный пароль', 'error');
            }
        });
    }

    if (elements.promoModalBtn) {
        elements.promoModalBtn.addEventListener('click', () => {
            openPromoModal();
        });
    }
    window.__openPromoModal = openPromoModal;

    if (elements.appSettingsBtn) {
        elements.appSettingsBtn.addEventListener('click', () => openSettingsWithAuth(openAppSettings));
    }
    if (elements.appSettingsClose) {
        elements.appSettingsClose.addEventListener('click', closeAppSettings);
    }
    if (elements.appSettingsOverlay) {
        elements.appSettingsOverlay.addEventListener('click', (e) => {
            if (e.target === elements.appSettingsOverlay) closeAppSettings();
        });
    }
    if (elements.settingsOpenKeyPanel) {
        elements.settingsOpenKeyPanel.addEventListener('click', () => {
            closeAppSettings();
            elements.settingsPanel?.classList.remove('collapsed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (elements.settingsCheckUpdateBtn) {
        elements.settingsCheckUpdateBtn.addEventListener('click', async () => {
            const btn = elements.settingsCheckUpdateBtn;
            btn.disabled = true;
            if (elements.settingsUpdateStatus) elements.settingsUpdateStatus.textContent = 'Проверяем репозиторий на GitHub…';
            try {
                const chk = await checkForUpdates(true);
                if (chk.update_available) {
                    markUpdateAvailable(chk);
                    showToast('Доступна новая версия — нажмите «Установить обновление»', 'system_update');
                } else {
                    markUpdateAvailable(null);
                    if (elements.settingsUpdateStatus) {
                        elements.settingsUpdateStatus.textContent =
                            `Установлена актуальная версия (коммит ${shortSha(chk.remote ? chk.remote.sha : '')}).`;
                    }
                    showToast('Обновлений нет — установлена актуальная версия', 'task_alt');
                }
            } catch (e) {
                if (elements.settingsUpdateStatus) {
                    elements.settingsUpdateStatus.textContent = 'Ошибка проверки: ' + e.message;
                }
                showToast('Не удалось проверить обновления', 'error');
            } finally {
                btn.disabled = false;
            }
        });
    }

    if (elements.settingsApplyUpdateBtn) {
        elements.settingsApplyUpdateBtn.addEventListener('click', async () => {
            const btn = elements.settingsApplyUpdateBtn;
            const token = (elements.settingsUpdateToken ? elements.settingsUpdateToken.value.trim() : '') || getSavedUpdateToken();
            if (!token) {
                if (elements.settingsUpdateStatus) {
                    elements.settingsUpdateStatus.textContent = 'Введите пароль обновления — он указан в файле api/config.php (параметр update_token).';
                }
                if (elements.settingsUpdateToken) elements.settingsUpdateToken.focus();
                return;
            }
            saveUpdateToken(token);
            btn.disabled = true;
            if (elements.settingsUpdateStatus) {
                elements.settingsUpdateStatus.textContent = 'Скачиваем релиз с GitHub и применяем… Это может занять до минуты.';
            }
            try {
                const res = await applyUpdate(token);
                if (res.skipped) {
                    if (elements.settingsUpdateStatus) elements.settingsUpdateStatus.textContent = 'Уже установлена актуальная версия.';
                    showToast('Обновление не требуется', 'task_alt');
                } else {
                    if (elements.settingsUpdateStatus) elements.settingsUpdateStatus.textContent = 'Новая версия применена! Перезагружаем страницу…';
                    showToast('Обновление установлено! Перезагрузка…', 'system_update');
                    setTimeout(() => window.location.reload(), 1200);
                    return;
                }
            } catch (e) {
                if (elements.settingsUpdateStatus) {
                    elements.settingsUpdateStatus.textContent = 'Ошибка обновления: ' + e.message;
                }
                showToast('Не удалось установить обновление', 'error');
            } finally {
                btn.disabled = false;
            }
        });
    }

    // =========================================================================
    // 14.1. Forced Update Modal (?update / ?force_update / action=update)
    // =========================================================================
    function openForceUpdateModal() {
        if (!elements.forceUpdateOverlay) return;
        elements.forceUpdateOverlay.classList.remove('hidden');
        if (elements.forceUpdateStatus) {
            elements.forceUpdateStatus.className = 'hidden';
            elements.forceUpdateStatus.innerHTML = '';
        }
        if (elements.forceUpdateInput) {
            elements.forceUpdateInput.value = '';
            setTimeout(() => elements.forceUpdateInput?.focus(), 120);
        }
        if (elements.forceUpdateSubmit) {
            elements.forceUpdateSubmit.disabled = false;
        }
        if (elements.forceUpdateBtnText) {
            elements.forceUpdateBtnText.textContent = 'Скачать и установить';
        }
        document.body.style.overflow = 'hidden';
    }

    function closeForceUpdateModal() {
        if (!elements.forceUpdateOverlay) return;
        elements.forceUpdateOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        // Очищаем параметр ?update из адресной строки без перезагрузки страницы
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

    function showForceUpdateStatus(message, type = 'info') {
        if (!elements.forceUpdateStatus) return;
        elements.forceUpdateStatus.className = `force-update-status-box ${type}`;
        elements.forceUpdateStatus.innerHTML = `<span>${message}</span>`;
    }

    async function handleForceUpdateSubmit(e) {
        if (e) e.preventDefault();
        const pwd = elements.forceUpdateInput ? elements.forceUpdateInput.value.trim() : '';
        if (!pwd) {
            showForceUpdateStatus('Введите пароль администратора', 'error');
            elements.forceUpdateInput?.focus();
            return;
        }

        if (pwd !== SETTINGS_AUTH_PASSWORD) {
            showForceUpdateStatus('Неверный пароль администратора. Попробуйте ещё раз.', 'error');
            if (elements.forceUpdateInput) {
                elements.forceUpdateInput.select();
                elements.forceUpdateInput.focus();
            }
            return;
        }

        // Блокируем кнопку и выводим статус
        if (elements.forceUpdateSubmit) elements.forceUpdateSubmit.disabled = true;
        if (elements.forceUpdateBtnText) elements.forceUpdateBtnText.textContent = 'Обновление...';
        showForceUpdateStatus('Подключение к GitHub и загрузка актуального релиза… Это займёт несколько секунд.', 'info');

        try {
            const res = await applyUpdate(pwd, true);
            const shaStr = res.sha ? shortSha(res.sha) : '';
            const msgStr = res.message ? `«${res.message}»` : 'актуальная версия';
            showForceUpdateStatus(`Обновление успешно установлено. Коммит ${shaStr}: ${msgStr}. Перезагрузка страницы…`, 'success');
            
            saveUpdateToken(pwd);
            try {
                localStorage.setItem(SETTINGS_AUTH_STORAGE_KEY, 'true');
            } catch (err) {}

            // Очищаем ?update из URL перед перезагрузкой
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
            showForceUpdateStatus(`Ошибка обновления: ${err.message || String(err)}`, 'error');
            if (elements.forceUpdateSubmit) elements.forceUpdateSubmit.disabled = false;
            if (elements.forceUpdateBtnText) elements.forceUpdateBtnText.textContent = 'Повторить попытку';
        }
    }

    if (elements.forceUpdateClose) elements.forceUpdateClose.addEventListener('click', closeForceUpdateModal);
    if (elements.forceUpdateCancel) elements.forceUpdateCancel.addEventListener('click', closeForceUpdateModal);
    if (elements.forceUpdateOverlay) {
        elements.forceUpdateOverlay.addEventListener('click', (e) => {
            if (e.target === elements.forceUpdateOverlay) closeForceUpdateModal();
        });
    }
    if (elements.forceUpdateForm) {
        elements.forceUpdateForm.addEventListener('submit', handleForceUpdateSubmit);
    }

    function checkUrlForForceUpdate() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('update') || params.has('force_update') || params.get('action') === 'update' || window.location.hash === '#update') {
                setTimeout(() => openForceUpdateModal(), 150);
            }
        } catch (e) {}
    }

    // =========================================================================
    // 15. Run Initializers
    // =========================================================================
    initFormInputs();
    updateServerKeyUI();
    initUpdater();
    loadLibraryBranches();
    initScrollToTop();
    renderSearchHistory();
    initTableSorting();
    checkUrlForForceUpdate();
    CosmicUniverse.init({ canvasId: 'cosmic-universe-canvas', containerId: 'cosmic-search-backdrop' });

    // Diagnostic / Preview helpers via URL params
    const _urlP = new URLSearchParams(window.location.search);
    if (_urlP.get('preview_tab') === 'subscribers') {
        if (elements.resultsContainer) {
            elements.resultsContainer.classList.remove('hidden');
        }
        setTimeout(() => {
            const subsBtn = document.querySelector('.tab-btn[data-tab="subscribers-tab"]');
            if (subsBtn) subsBtn.click();
        }, 150);
    }
    if (_urlP.get('preview_promo') === '1') {
        setTimeout(() => {
            openPromoModal();
        }, 200);
    }
    if (_urlP.get('preview_cosmic') === '1') {
        if (elements.searchModalOverlay) {
            elements.searchModalOverlay.classList.remove('hidden');
            elements.searchModalOverlay.offsetWidth;
            elements.searchModalOverlay.classList.add('active');
        }
        CosmicUniverse.start();
        CosmicUniverse.setWarp(true);
    }

    // Initialize 3D Space Engine
    try {
        Space3D.init();
    } catch (err) {
        console.warn('[Space3D] Deferred init error:', err);
    }

    // Initialize AI Analyst tab (src/ai.js — отчёты, инсайты и чат)
    try {
        initAiTab({
            getSnapshot: () => {
                const posts = state.filteredPosts.length > 0 ? state.filteredPosts : state.matchedPosts;
                let periodLabel = '';
                try { periodLabel = computeScanPeriod().label; } catch (e) { /* опционально */ }
                return buildAiSnapshot({
                    posts,
                    stats: state.lastGroupsStats || [],
                    periodLabel,
                    keywords: elements.keywordInput ? elements.keywordInput.value : '',
                    exclude: elements.excludeInput ? elements.excludeInput.value : ''
                });
            },
            onToast: showToast
        });
    } catch (err) {
        console.warn('[AI] Tab init error:', err);
    }

    // Инициализация интерактивного 2D робота-ассистента в нижнем левом углу
    try {
        Mascot.init();
    } catch (err) {
        console.warn('[Mascot] Init error:', err);
    }

    // Expose for testing/debugging
    window.__VK_APP__ = {
        state,
        elements,
        CANONICAL_BRANCHES,
        applyPeriodPreset,
        detectCrossPosts,
        renderAllResults,
        applySortAndFilterFeed,
        renderSourcesShowcase,
        renderAnalyticsTab,
        renderOfficialReport,
        closeSearchModal,
        closePostModal,
        CosmicUniverse,
        openPromoModal,
        closePromoModal,
        renderRadarSection,
        Space3D,
        openSpace3D: () => Space3D.open(),
        closeSpace3D: () => Space3D.close(),
        toggleSpace3D: () => Space3D.toggle(),
        Mascot
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
