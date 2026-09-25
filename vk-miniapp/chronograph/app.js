/**
 * АВРОРА • Литературный хронограф (Календарь памятных, литературных и краеведческих дат)
 * Чистый Vanilla JS (ES6+) без внешних фреймворков и сборщиков.
 */
(function () {
  'use strict';

  const STORAGE_KEYS = {
    PLAN: 'aurora_chrono_monthly_plan',
    CUSTOM_DATES: 'aurora_chrono_custom_dates',
    THEME: 'aurora_chrono_theme',
    POSTER_DRAFTS: 'aurora_poster_drafts_v3'
  };

  const MONTHS_NOMINATIVE = [
    'Весь год', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const MONTHS_GENITIVE = [
    '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  const CATEGORY_META = {
    classics: { label: '🏛️ Классики', short: 'Классическая литература', color: '#00e5ff' },
    modern: { label: '✒️ Современные и XX век', short: 'Литература XX–XXI вв.', color: '#a855f7' },
    regional: { label: '🦌 Краеведение (Владимир)', short: 'Владимирский край', color: '#10b981' },
    children: { label: '🧸 Детская книга', short: 'Детская литература', color: '#f59e0b' },
    art_history: { label: '🎨 Искусство и история', short: 'Искусство и история', color: '#ec4899' }
  };

  const state = {
    year: 2026,
    month: 0, // 0 = Весь год, 1..12 = Январь..Декабрь
    jubilee: 'all', // 'all' | 'round' | '100' | '150' | '200'
    category: 'all', // 'all' | 'classics' | 'modern' | 'regional' | 'children' | 'art_history'
    search: '',
    view: 'cards', // 'cards' | 'calendar' | 'table'
    calendarMonth: 1,
    calendarSelectedDay: null,
    items: [],
    planIds: new Set(),
    theme: 'dark'
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  function copyTextToClipboard(text, label = 'Скопировано в буфер обмена') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(`✓ ${label}`)).catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(`✓ ${label}`);
    } catch (_) {
      showToast('Не удалось скопировать текст');
    }
    document.body.removeChild(ta);
  }

  function computeJubileeInfo(item, targetYear) {
    const age = targetYear - Number(item.birthYear || 0);
    const isRound = age > 0 && age % 5 === 0;
    const isMajor = age > 0 && age % 25 === 0;
    let badgeText = `${age} ${pluralYears(age)}`;
    if (isMajor) {
      badgeText = `★ ${age} ${pluralYears(age)} • ВЕЛИКИЙ ЮБИЛЕЙ`;
    } else if (isRound) {
      badgeText = `✦ ${age} ${pluralYears(age)} • ЮБИЛЕЙ`;
    }
    return { age, isRound, isMajor, badgeText };
  }

  function pluralYears(n) {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return 'лет';
    if (n1 > 1 && n1 < 5) return 'года';
    if (n1 === 1) return 'год';
    return 'лет';
  }

  function matchesJubileeFilter(age, isRound, filterValue) {
    if (filterValue === 'all') return true;
    if (filterValue === 'round') return isRound;
    if (filterValue === '100') return age === 100 || (isRound && age >= 90 && age <= 125);
    if (filterValue === '150') return age === 150 || (isRound && age >= 130 && age <= 175);
    if (filterValue === '200') return isRound && age >= 180;
    return true;
  }

  function matchesItemFilters(item, ignoreMonth = false) {
    if (!ignoreMonth && state.month !== 0 && Number(item.month) !== state.month) {
      return false;
    }
    if (state.category !== 'all' && item.category !== state.category) {
      return false;
    }
    const { age, isRound } = computeJubileeInfo(item, state.year);
    if (!matchesJubileeFilter(age, isRound, state.jubilee)) {
      return false;
    }
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      const hay = [
        item.name,
        item.shortName,
        item.role,
        item.bio,
        item.quote,
        ...(item.works || []),
        ...(item.tags || []),
        ...(item.exhibitionIdeas || []).map(e => `${e.title} ${e.format} ${e.concept}`)
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function getFilteredItems() {
    return state.items
      .filter(item => matchesItemFilters(item, false))
      .sort((a, b) => (a.month - b.month) || (a.day - b.day));
  }

  function loadStoredState() {
    try {
      const savedPlan = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN) || '[]');
      if (Array.isArray(savedPlan)) {
        state.planIds = new Set(savedPlan);
      }
    } catch (_) {
      state.planIds = new Set();
    }

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (_) {}
  }

  function savePlanToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(Array.from(state.planIds)));
    } catch (_) {}
  }

  function loadCustomDates() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_DATES) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustomDate(newItem) {
    const list = loadCustomDates();
    list.push(newItem);
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_DATES, JSON.stringify(list));
    } catch (_) {}
  }

  function formatExhibitionTitle(title) {
    const t = String(title || '').trim();
    if (!t) return '';
    if (t.startsWith('«') && t.endsWith('»')) return t;
    return `«${t}»`;
  }

  function normalizeItem(raw) {
    const name = raw.name || raw.title || '';
    const worksList = Array.isArray(raw.works)
      ? raw.works.map(w => {
          if (typeof w === 'object' && w !== null) {
            return w.title || '';
          }
          return String(w || '');
        }).filter(Boolean)
      : [];

    const exhibitionList = Array.isArray(raw.exhibitions)
      ? raw.exhibitions.map(ex => ({
          format: ex.type || ex.format || 'Книжная выставка',
          title: ex.title || `К юбилею: ${name}`,
          concept: ex.concept || (ex.audience ? `Аудитория: ${ex.audience}` : (raw.bio || '')),
          audience: ex.audience || ''
        }))
      : (Array.isArray(raw.exhibitionIdeas) ? raw.exhibitionIdeas : []);

    const monogram = raw.monogram || raw.portrait?.initials || getMonogram(name);
    const portraitColor = raw.portraitColor || raw.portrait?.gradient || 'var(--grad-cyan-purple)';
    const imageUrl = raw.imageUrl || raw.portraitUrl || raw.portrait?.imageUrl || raw.portrait?.url || raw.photo || '';

    return {
      ...raw,
      name,
      title: raw.title || name,
      shortName: raw.shortName || name,
      imageUrl,
      portraitUrl: imageUrl,
      works: worksList,
      exhibitions: Array.isArray(raw.exhibitions) ? raw.exhibitions : exhibitionList,
      exhibitionIdeas: exhibitionList.length ? exhibitionList : [
        { format: 'Книжная выставка', title: `К юбилею: ${name}`, concept: raw.bio || '', audience: 'Широкий круг читателей' }
      ],
      monogram,
      portraitColor
    };
  }

  async function loadChronographDatabase() {
    let baseItems = [];
    try {
      const resp = await fetch('data.json', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          baseItems = json;
        } else if (json && Array.isArray(json.items)) {
          baseItems = json.items;
        }
      }
    } catch (_) {
      // Fallback to window.CHRONOGRAPH_DATA loaded from data.js
    }
    if (!baseItems.length && window.CHRONOGRAPH_DATA) {
      if (Array.isArray(window.CHRONOGRAPH_DATA)) {
        baseItems = window.CHRONOGRAPH_DATA;
      } else if (Array.isArray(window.CHRONOGRAPH_DATA.items)) {
        baseItems = window.CHRONOGRAPH_DATA.items;
      }
    }
    const customItems = loadCustomDates();
    state.items = [...baseItems, ...customItems].map(normalizeItem);

    // If plan is empty on first visit, pre-select notable round jubilees so plan drawer is immediately demonstrable
    const planCleared = localStorage.getItem('aurora_chrono_plan_cleared');
    if (state.planIds.size === 0 && !planCleared) {
      const defaults = state.items.filter(it => computeJubileeInfo(it, state.year).isMajor).slice(0, 4);
      defaults.forEach(it => state.planIds.add(it.id));
      savePlanToStorage();
    }
  }

  function getMonogram(name) {
    const parts = String(name || '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return String(name || 'А').slice(0, 2).toUpperCase();
  }

  function formatLifespan(item) {
    if (!item.birthYear) return '';
    return item.deathYear ? `${item.birthYear}–${item.deathYear}` : `род. ${item.birthYear}`;
  }

  function updateStatsAndBadges() {
    const filtered = getFilteredItems();
    const roundInPeriod = filtered.filter(it => computeJubileeInfo(it, state.year).isRound).length;

    const elTotal = document.getElementById('stat-total-dates');
    const elMonth = document.getElementById('stat-month-dates');
    const elJubilees = document.getElementById('stat-jubilees-count');
    const elPlan = document.getElementById('stat-plan-count');
    const elPlanBadge = document.getElementById('plan-count-badge');

    if (elTotal) elTotal.textContent = String(state.items.length);
    if (elMonth) elMonth.textContent = String(filtered.length);
    if (elJubilees) elJubilees.textContent = String(roundInPeriod);
    if (elPlan) elPlan.textContent = String(state.planIds.size);
    if (elPlanBadge) elPlanBadge.textContent = String(state.planIds.size);

    // Update month ribbon badges taking current category/jubilee/search filters into account
    const allMonthMatched = state.items.filter(it => matchesItemFilters(it, true));
    const badgeAll = document.querySelector('[data-month-badge="0"]');
    if (badgeAll) badgeAll.textContent = String(allMonthMatched.length);

    for (let m = 1; m <= 12; m++) {
      const badge = document.querySelector(`[data-month-badge="${m}"]`);
      if (badge) {
        const count = allMonthMatched.filter(it => Number(it.month) === m).length;
        badge.textContent = String(count);
      }
    }

    // Active filter summary text
    const summaryText = document.getElementById('active-filters-text');
    if (summaryText) {
      const parts = [
        `Год: ${state.year}`,
        `Период: ${MONTHS_NOMINATIVE[state.month]}`,
        state.category !== 'all' ? `Категория: ${CATEGORY_META[state.category]?.short || state.category}` : 'Все категории',
        state.jubilee !== 'all' ? `Фильтр юбилея: ${state.jubilee === 'round' ? 'Круглые даты' : state.jubilee + ' лет'}` : 'Все даты',
        `Найдено: ${filtered.length}`
      ];
      summaryText.textContent = parts.join(' • ');
    }
  }

  function renderCardsView(filtered) {
    const grid = document.getElementById('chronograph-cards-grid');
    if (!grid) return;

    if (!filtered.length) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const jub = computeJubileeInfo(item, state.year);
      const cat = CATEGORY_META[item.category] || CATEGORY_META.classics;
      const inPlan = state.planIds.has(item.id);
      const firstEx = (item.exhibitionIdeas && item.exhibitionIdeas[0]) || {
        format: 'Книжная выставка',
        title: `К юбилею: ${item.shortName || item.name}`,
        concept: item.bio
      };
      const worksHtml = (item.works || []).slice(0, 4).map(w => `<span class="work-tag">📖 ${escapeHtml(w)}</span>`).join('');
      const posterTpl = (typeof window.buildChronographPosterTemplate === 'function')
        ? window.buildChronographPosterTemplate(item, state.year, 'a4_v', 0)
        : null;
      const posterDesc = posterTpl ? posterTpl.desc : (firstEx.format + ': ' + firstEx.title);

      return `
        <article class="chrono-card ${jub.isRound ? 'is-round-jubilee' : ''} ${item.category === 'regional' ? 'is-regional' : ''} ${inPlan ? 'in-plan' : ''}" data-id="${escapeHtml(item.id)}" data-category="${escapeHtml(item.category)}">
          <div>
            <div class="figma-frame-bar">
              <span class="figma-frame-tag">❖ Frame · #${escapeHtml(item.id)}</span>
              <span class="figma-frame-dim">A4 (595×842)</span>
            </div>

            <div class="card-top">
              <span class="card-date-badge">📅 ${Number(item.day)} ${MONTHS_GENITIVE[Number(item.month)]}</span>
              <span class="card-jubilee-badge ${jub.isRound ? 'is-round' : ''}">${escapeHtml(jub.badgeText)}</span>
            </div>

            <div class="card-person-row" style="margin-top: 10px;">
              <div class="card-avatar" style="background: ${escapeHtml( item.portraitColor || 'var(--grad-cyan-purple)' )};">
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="card-avatar-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="card-avatar-fallback" style="display:none;">${escapeHtml(item.monogram || getMonogram(item.name))}</span>` : `<span>${escapeHtml(item.monogram || getMonogram(item.name))}</span>`}
              </div>
              <div>
                <h3 class="card-title" data-action="open-detail" data-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</h3>
                <div class="card-role">${escapeHtml(item.role || '')} • <span class="lifespan">${escapeHtml(formatLifespan(item))}</span></div>
                <div style="margin-top: 4px;">
                  <span class="card-category-badge ${item.category === 'regional' ? 'cat-regional' : ''}">${escapeHtml(cat.label)}</span>
                </div>
              </div>
            </div>

            <p class="card-bio" style="margin-top: 10px;">${escapeHtml(item.bio)}</p>

            ${item.quote ? `<blockquote class="card-quote" style="margin-top: 8px;">«${escapeHtml(item.quote)}»</blockquote>` : ''}

            <div class="card-works" style="margin-top: 8px;">${worksHtml}</div>

            <div class="card-poster-mini" title="Готовый шаблон афиши А4 в Редакторе афиш">
              <span class="poster-mini-badge">❖ Макет:</span>
              <span class="poster-mini-title">${escapeHtml(posterDesc)}</span>
              <button type="button" class="card-btn card-btn-poster" data-action="create-poster" data-id="${escapeHtml(item.id)}" data-size="a4_v" data-idea-idx="0" title="Открыть готовый макет афиши в Редакторе Афиш АВРОРА">
                🎨 В афишу
              </button>
            </div>
          </div>

          <div class="card-footer">
            <button type="button" class="card-btn btn-detail" data-action="open-detail" data-id="${escapeHtml(item.id)}">
              <span>📚 Справка и 3 макета</span>
            </button>
            <button type="button" class="card-btn card-btn-poster" data-action="create-poster" data-id="${escapeHtml(item.id)}" data-size="a4_v" data-idea-idx="0" title="Открыть в Редакторе Афиш АВРОРА">
              <span>🎨 В Редактор афиш</span>
            </button>
            <button type="button" class="card-btn btn-plan-toggle ${inPlan ? 'in-plan' : ''}" data-action="toggle-plan" data-id="${escapeHtml(item.id)}">
              <span>${inPlan ? '✓ В плане' : '+ В план'}</span>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderCalendarView(filtered) {
    const calMonth = state.month === 0 ? state.calendarMonth : state.month;
    const heading = document.getElementById('calendar-month-heading');
    const daysGrid = document.getElementById('calendar-days-grid');
    const dayTitle = document.getElementById('calendar-selected-day-title');
    const dayEventsEl = document.getElementById('calendar-day-events');
    if (!daysGrid || !dayEventsEl) return;

    if (heading) {
      heading.textContent = `${MONTHS_NOMINATIVE[calMonth]} ${state.year} г.`;
    }

    const monthItems = state.items.filter(it => Number(it.month) === calMonth && matchesItemFilters(it, true));
    const daysInMonth = new Date(state.year, calMonth, 0).getDate();
    const firstDayJs = new Date(state.year, calMonth - 1, 1).getDay(); // 0=Sun..6=Sat
    const startOffset = (firstDayJs + 6) % 7; // Monday=0..Sunday=6

    if (!state.calendarSelectedDay || state.calendarSelectedDay > daysInMonth) {
      const firstWithEvent = monthItems[0]?.day || 1;
      state.calendarSelectedDay = firstWithEvent;
    }

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push('<div class="cal-day empty"></div>');
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const evs = monthItems.filter(it => Number(it.day) === d);
      const hasJubilee = evs.some(it => computeJubileeInfo(it, state.year).isRound);
      const isSelected = state.calendarSelectedDay === d;
      const dots = evs.map(it => {
        const jub = computeJubileeInfo(it, state.year);
        const cls = jub.isRound ? 'gold' : (it.category === 'regional' ? 'emerald' : '');
        return `<span class="cal-dot ${cls}" title="${escapeHtml(it.name)}"></span>`;
      }).join('');

      cells.push(`
        <div class="cal-day ${evs.length ? 'has-events' : ''} ${hasJubilee ? 'has-jubilee' : ''} ${isSelected ? 'active' : ''}" data-cal-day="${d}">
          <span class="cal-day-num">${d}</span>
          <div class="cal-day-dots">${dots}</div>
        </div>
      `);
    }
    daysGrid.innerHTML = cells.join('');

    const selectedEvents = monthItems.filter(it => Number(it.day) === state.calendarSelectedDay);
    if (dayTitle) {
      dayTitle.textContent = `${state.calendarSelectedDay} ${MONTHS_GENITIVE[calMonth]} ${state.year} г. (${selectedEvents.length})`;
    }

    if (!selectedEvents.length) {
      dayEventsEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">На ${state.calendarSelectedDay} ${MONTHS_GENITIVE[calMonth]} памятных дат по текущему фильтру не зафиксировано. Выберите отмеченное число в сетке календаря.</p>`;
    } else {
      dayEventsEl.innerHTML = selectedEvents.map(item => {
        const jub = computeJubileeInfo(item, state.year);
        const ex = (item.exhibitionIdeas && item.exhibitionIdeas[0])?.title || item.name;
        return `
          <div class="exhibition-idea-card">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="card-jubilee-badge ${jub.isRound ? 'is-round' : ''}">${escapeHtml(jub.badgeText)}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.role)} (${escapeHtml(formatLifespan(item))})</div>
            <div style="font-size:0.83rem;">💡 Выставка: ${escapeHtml(formatExhibitionTitle(ex))}</div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="card-btn" data-action="open-detail" data-id="${escapeHtml(item.id)}">📚 Подробнее</button>
              <button type="button" class="card-btn" data-action="toggle-plan" data-id="${escapeHtml(item.id)}">
                ${state.planIds.has(item.id) ? '✓ В плане' : '+ В план'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function renderTableView(filtered) {
    const tbody = document.getElementById('chronograph-table-body');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(item => {
      const jub = computeJubileeInfo(item, state.year);
      const cat = CATEGORY_META[item.category] || CATEGORY_META.classics;
      const inPlan = state.planIds.has(item.id);
      const firstEx = (item.exhibitionIdeas && item.exhibitionIdeas[0]) || { format: 'Выставка', title: item.name };

      return `
        <tr>
          <td style="white-space:nowrap; font-weight:700;">${Number(item.day)} ${MONTHS_GENITIVE[Number(item.month)]}</td>
          <td><span class="card-jubilee-badge ${jub.isRound ? 'is-round' : ''}">${escapeHtml(jub.badgeText)}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="table-avatar" style="width:34px; height:34px; border-radius:6px; overflow:hidden; flex-shrink:0; background: ${escapeHtml(item.portraitColor || 'var(--grad-cyan-purple)')}; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:0.75rem; font-weight:700;">
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" onerror="this.style.display='none';">` : ''}
                <span class="table-avatar-fallback">${escapeHtml(item.monogram || getMonogram(item.name))}</span>
              </div>
              <div>
                <strong style="cursor:pointer; color:var(--text-primary);" data-action="open-detail" data-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</strong>
                <div style="font-size:0.76rem; color:var(--text-muted);">${escapeHtml(item.role)} (${escapeHtml(formatLifespan(item))})</div>
              </div>
            </div>
          </td>
          <td><span class="card-category-badge ${item.category === 'regional' ? 'cat-regional' : ''}">${escapeHtml(cat.short)}</span></td>
          <td>${escapeHtml((item.works || []).slice(0, 3).join(', '))}</td>
          <td><strong>${escapeHtml(firstEx.format)}:</strong> ${escapeHtml(formatExhibitionTitle(firstEx.title))}</td>
          <td>
            <button type="button" class="card-btn btn-plan-toggle ${inPlan ? 'in-plan' : ''}" data-action="toggle-plan" data-id="${escapeHtml(item.id)}">
              ${inPlan ? '✓ В плане' : '+ В план'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderWallSheetPrintArea() {
    const subtitle = document.getElementById('wall-sheet-subtitle');
    const content = document.getElementById('wall-sheet-content');
    if (!content) return;

    const plannedItems = state.items
      .filter(it => state.planIds.has(it.id))
      .sort((a, b) => (a.month - b.month) || (a.day - b.day));
    const listToPrint = plannedItems.length ? plannedItems : getFilteredItems().slice(0, 18);

    const periodTitle = state.month === 0 ? `НА ${state.year} ГОД` : `${MONTHS_NOMINATIVE[state.month].toUpperCase()} ${state.year} ГОДА`;
    if (subtitle) {
      subtitle.textContent = `КАЛЕНДАРЬ ЗНАМЕНАТЕЛЬНЫХ ДАТ И КНИЖНЫХ ВЫСТАВОК ДЛЯ ЧИТАЛЬНОГО ЗАЛА • ${periodTitle}`;
    }

    const rowsHtml = listToPrint.map(item => {
      const jub = computeJubileeInfo(item, state.year);
      const firstEx = (item.exhibitionIdeas && item.exhibitionIdeas[0]) || { format: 'Книжная выставка', title: item.name };
      return `
        <tr>
          <td style="width:12%; font-weight:700;">${Number(item.day)} ${MONTHS_GENITIVE[Number(item.month)]}<br><span style="font-size:8.5pt; color:#475569;">${escapeHtml(jub.badgeText)}</span></td>
          <td style="width:28%;">
            <strong>${escapeHtml(item.name)}</strong> (${escapeHtml(formatLifespan(item))})<br>
            <span style="font-size:8.5pt; color:#334155;">${escapeHtml(item.role)}</span>
          </td>
          <td style="width:28%;">${escapeHtml((item.works || []).join(', '))}</td>
          <td style="width:32%;">
            <strong>${escapeHtml(firstEx.format)}:</strong><br>
            ${escapeHtml(formatExhibitionTitle(firstEx.title))}
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Дата и юбилей</th>
            <th>Персона / Памятная дата</th>
            <th>Ключевые произведения в фонде</th>
            <th>Рекомендуемая выставка в читальном зале</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  function renderAll() {
    updateStatsAndBadges();
    const filtered = getFilteredItems();

    const cardsEl = document.getElementById('chronograph-cards-grid');
    const calEl = document.getElementById('chronograph-calendar-view');
    const tableEl = document.getElementById('chronograph-table-view');
    const emptyEl = document.getElementById('chronograph-empty-state');

    if (cardsEl) cardsEl.classList.toggle('hidden', state.view !== 'cards' || filtered.length === 0);
    if (calEl) calEl.classList.toggle('hidden', state.view !== 'calendar');
    if (tableEl) tableEl.classList.toggle('hidden', state.view !== 'table' || filtered.length === 0);
    if (emptyEl) emptyEl.classList.toggle('hidden', state.view === 'calendar' || filtered.length > 0);

    if (state.view === 'cards') {
      renderCardsView(filtered);
    } else if (state.view === 'calendar') {
      renderCalendarView(filtered);
    } else if (state.view === 'table') {
      renderTableView(filtered);
    }

    renderWallSheetPrintArea();
  }

  function openDateDetailModal(itemId) {
    const item = state.items.find(it => it.id === itemId);
    if (!item) return;

    const modal = document.getElementById('date-modal-overlay');
    const body = document.getElementById('date-modal-body');
    if (!modal || !body) return;

    const jub = computeJubileeInfo(item, state.year);
    const cat = CATEGORY_META[item.category] || CATEGORY_META.classics;
    const inPlan = state.planIds.has(item.id);

    const worksTags = (item.works || []).map(w => `<span class="work-tag">📖 ${escapeHtml(w)}</span>`).join('');
    const ideasHtml = (item.exhibitionIdeas || []).map((idea, idx) => `
      <div class="exhibition-idea-card">
        <div>
          <span class="card-category-badge">${escapeHtml(idea.format || 'Книжная выставка')}</span>
          <h4 style="margin:8px 0 6px; font-size:0.98rem;">${escapeHtml(formatExhibitionTitle(idea.title))}</h4>
          <p style="font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(idea.concept || '')}</p>
          ${idea.audience ? `<div style="margin-top:6px; font-size:0.75rem; color:var(--text-muted);">Аудитория: ${escapeHtml(idea.audience)}</div>` : ''}
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
          <button type="button" class="card-btn card-btn-poster" data-action="create-poster" data-id="${escapeHtml(item.id)}" data-size="a4_v" data-idea-idx="${idx}" title="Открыть вертикальный плакат А4 в Редакторе афиш">
            🎨 Афиша A4
          </button>
          <button type="button" class="card-btn card-btn-poster" data-action="create-poster" data-id="${escapeHtml(item.id)}" data-size="square" data-idea-idx="${idx}" title="Открыть квадратный пост ВК 1:1 в Редакторе афиш">
            🟦 Пост ВК 1:1
          </button>
          <button type="button" class="card-btn card-btn-poster" data-action="create-poster" data-id="${escapeHtml(item.id)}" data-size="story" data-idea-idx="${idx}" title="Открыть сторис 9:16 в Редакторе афиш">
            📱 Сторис 9:16
          </button>
          <button type="button" class="card-btn" data-action="copy-idea" data-id="${escapeHtml(item.id)}" data-idea-idx="${idx}">
            📋 Название
          </button>
        </div>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="modal-person-hero">
        <div class="modal-avatar" style="background: ${escapeHtml(item.portraitColor || 'var(--grad-cyan-purple)')};">
          ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="modal-avatar-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="modal-avatar-fallback" style="display:none;">${escapeHtml(item.monogram || getMonogram(item.name))}</span>` : `<span>${escapeHtml(item.monogram || getMonogram(item.name))}</span>`}
        </div>
        <div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
            <span class="card-date-badge">📅 ${Number(item.day)} ${MONTHS_GENITIVE[Number(item.month)]}</span>
            <span class="card-jubilee-badge ${jub.isRound ? 'is-round' : ''}">${escapeHtml(jub.badgeText)}</span>
            <span class="card-category-badge ${item.category === 'regional' ? 'cat-regional' : ''}">${escapeHtml(cat.label)}</span>
          </div>
          <h2 id="date-modal-title" class="modal-title" style="font-size:1.4rem;">${escapeHtml(item.name)}</h2>
          <div style="color:var(--text-muted); font-size:0.88rem; margin-top:4px;">
            ${escapeHtml(item.role)} • ${escapeHtml(formatLifespan(item))}
          </div>
        </div>
      </div>

      <div>
        <div class="modal-section-title">Историко-литературная и методическая справка</div>
        <p style="line-height:1.65; color:var(--text-secondary);">${escapeHtml(item.bio)}</p>
      </div>

      ${item.quote ? `
        <div>
          <div class="modal-section-title">Цитата для эпиграфа выставки</div>
          <blockquote class="card-quote" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>«${escapeHtml(item.quote)}»</span>
            <button type="button" class="card-btn" data-action="copy-quote" data-id="${escapeHtml(item.id)}">📋 Копировать</button>
          </blockquote>
        </div>
      ` : ''}

      <div>
        <div class="modal-section-title">Ключевые произведения для книжной полки</div>
        <div class="card-works">${worksTags}</div>
      </div>

      <div>
        <div class="modal-section-title">Готовые концепции книжных выставок и массовых мероприятий</div>
        <div class="exhibition-ideas-grid">${ideasHtml}</div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding-top:14px; border-top:1px solid var(--border-subtle); flex-wrap:wrap;">
        <button type="button" class="chrono-btn chrono-btn-secondary" data-action="copy-full-card" data-id="${escapeHtml(item.id)}">
          📋 Скопировать полную методическую карточку
        </button>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="chrono-btn chrono-btn-gold" data-action="create-poster" data-id="${escapeHtml(item.id)}">
            🎨 Создать афишу выставки
          </button>
          <button type="button" class="chrono-btn chrono-btn-primary" data-action="toggle-plan" data-id="${escapeHtml(item.id)}">
            ${inPlan ? '✓ В плане мероприятий (Убрать)' : '+ Добавить в план на месяц'}
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  function renderPlanModalList() {
    const listEl = document.getElementById('plan-items-list');
    if (!listEl) return;

    const planned = state.items
      .filter(it => state.planIds.has(it.id))
      .sort((a, b) => (a.month - b.month) || (a.day - b.day));

    if (!planned.length) {
      listEl.innerHTML = `<div style="padding:28px; text-align:center; color:var(--text-muted);">План мероприятий пуст. Нажмите «+ В план» на любой карточке или кнопку «Добавить все юбилеи месяца» выше.</div>`;
      return;
    }

    listEl.innerHTML = planned.map(item => {
      const jub = computeJubileeInfo(item, state.year);
      const ex = (item.exhibitionIdeas && item.exhibitionIdeas[0]) || { format: 'Выставка', title: item.name };
      return `
        <div class="plan-item">
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="card-date-badge">${Number(item.day)} ${MONTHS_GENITIVE[Number(item.month)]}</span>
              <span class="card-jubilee-badge ${jub.isRound ? 'is-round' : ''}">${escapeHtml(jub.badgeText)}</span>
              <strong>${escapeHtml(item.name)}</strong>
            </div>
            <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
              ${escapeHtml(ex.format)}: ${escapeHtml(formatExhibitionTitle(ex.title))}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="card-btn" data-action="create-poster" data-id="${escapeHtml(item.id)}">🎨 Афиша</button>
            <button type="button" class="card-btn" data-action="toggle-plan" data-id="${escapeHtml(item.id)}">✕ Убрать</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function sendToPosterEditor(itemId, ideaIndex = 0, sizeKey = 'a4_v') {
    const item = state.items.find(it => it.id === itemId);
    if (!item) return;

    let tpl = null;
    if (typeof window.buildChronographPosterTemplate === 'function') {
      tpl = window.buildChronographPosterTemplate(item, state.year, sizeKey, ideaIndex);
    }

    if (tpl) {
      try {
        localStorage.setItem('aurora_chrono_poster_import', JSON.stringify(tpl));
        showToast(`✓ Макет «${tpl.name}» подготовлен для Редактора афиш!`);
      } catch (e) {
        console.error('Storage error:', e);
      }
    }

    setTimeout(() => {
      window.location.href = `../poster/index.html?from=chronograph&id=${encodeURIComponent(item.id)}&size=${encodeURIComponent(sizeKey)}&idea=${ideaIndex}`;
    }, 200);
  }

  function exportPlanFile(format = 'txt') {
    const planned = state.items
      .filter(it => state.planIds.has(it.id))
      .sort((a, b) => (a.month - b.month) || (a.day - b.day));
    const items = planned.length ? planned : getFilteredItems();

    const periodLabel = state.month === 0 ? `${state.year} год` : `${MONTHS_NOMINATIVE[state.month]} ${state.year} г.`;
    let content = '';
    if (format === 'md') {
      content = `# ЛИТЕРАТУРНЫЙ ХРОНОГРАФ АВРОРА — План книжных выставок (${periodLabel})\n\n`;
      content += `> МБУК «Центральная городская библиотека» г. Владимира • Всего дат в плане: **${items.length}**\n\n`;
      items.forEach((it, idx) => {
        const jub = computeJubileeInfo(it, state.year);
        const ex = (it.exhibitionIdeas && it.exhibitionIdeas[0]) || { format: 'Книжная выставка', title: it.name, concept: '' };
        content += `### ${idx + 1}. ${it.day} ${MONTHS_GENITIVE[it.month]} — ${it.name} (${formatLifespan(it)}) — **${jub.badgeText}**\n`;
        content += `- **Статус:** ${it.role}\n`;
        content += `- **Краткая справка:** ${it.bio}\n`;
        content += `- **Ключевые произведения:** ${(it.works || []).join(', ')}\n`;
        content += `- **Рекомендуемое мероприятие (${ex.format}):** ${formatExhibitionTitle(ex.title)}${ex.concept ? ' — ' + ex.concept : ''}\n\n`;
      });
    } else {
      content = `====================================================================\n`;
      content += `АВРОРА • ЛИТЕРАТУРНЫЙ ХРОНОГРАФ (${periodLabel.toUpperCase()})\n`;
      content += `План книжных выставок и памятных дат для методистов и библиотекарей\n`;
      content += `====================================================================\n\n`;
      items.forEach((it, idx) => {
        const jub = computeJubileeInfo(it, state.year);
        const ex = (it.exhibitionIdeas && it.exhibitionIdeas[0]) || { format: 'Книжная выставка', title: it.name, concept: '' };
        content += `${idx + 1}. [${it.day} ${MONTHS_GENITIVE[it.month]}] ${it.name} (${formatLifespan(it)}) — ${jub.badgeText}\n`;
        content += `   Род деятельности: ${it.role}\n`;
        content += `   Справка: ${it.bio}\n`;
        content += `   Произведения: ${(it.works || []).join(', ')}\n`;
        content += `   Выставка (${ex.format}): ${formatExhibitionTitle(ex.title)}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurora-chronograph-${state.year}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ План экспортирован в файл .${format.toUpperCase()}`);
  }

  function bindEvents() {
    const yearSelect = document.getElementById('year-select');
    if (yearSelect) {
      yearSelect.addEventListener('change', () => {
        state.year = Number(yearSelect.value) || 2026;
        renderAll();
        showToast(`Расчёт юбилеев обновлён на ${state.year} год`);
      });
    }

    const monthRibbon = document.getElementById('month-ribbon');
    if (monthRibbon) {
      monthRibbon.addEventListener('click', e => {
        const btn = e.target.closest('.month-tab');
        if (!btn) return;
        const m = Number(btn.getAttribute('data-month') || 0);
        state.month = m;
        if (m >= 1 && m <= 12) {
          state.calendarMonth = m;
          state.calendarSelectedDay = null;
        }
        monthRibbon.querySelectorAll('.month-tab').forEach(t => {
          const active = Number(t.getAttribute('data-month')) === m;
          t.classList.toggle('active', active);
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        renderAll();
      });
    }

    const jubileeFilters = document.getElementById('jubilee-filters');
    if (jubileeFilters) {
      jubileeFilters.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        state.jubilee = chip.getAttribute('data-jubilee') || 'all';
        jubileeFilters.querySelectorAll('.filter-chip').forEach(c => {
          const active = c === chip;
          c.classList.toggle('active', active);
          c.classList.toggle('is-active', active);
        });
        renderAll();
      });
    }

    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) {
      categoryFilters.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        state.category = chip.getAttribute('data-category') || 'all';
        categoryFilters.querySelectorAll('.filter-chip').forEach(c => {
          const active = c === chip;
          c.classList.toggle('active', active);
          c.classList.toggle('is-active', active);
        });
        renderAll();
      });
    }

    const viewSwitcher = document.getElementById('view-switcher');
    if (viewSwitcher) {
      viewSwitcher.addEventListener('click', e => {
        const btn = e.target.closest('.view-btn');
        if (!btn) return;
        state.view = btn.getAttribute('data-view') || 'cards';
        viewSwitcher.querySelectorAll('.view-btn').forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.classList.toggle('is-active', active);
        });
        renderAll();
      });
    }

    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('btn-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        if (searchClear) searchClear.classList.toggle('hidden', !state.search);
        renderAll();
      });
    }
    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.search = '';
        searchClear.classList.add('hidden');
        renderAll();
      });
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.month = 0;
        state.jubilee = 'all';
        state.category = 'all';
        state.search = '';
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        document.querySelectorAll('#month-ribbon .month-tab').forEach(t => {
          const active = t.getAttribute('data-month') === '0';
          t.classList.toggle('active', active);
          t.classList.toggle('is-active', active);
        });
        document.querySelectorAll('#jubilee-filters .filter-chip').forEach(c => {
          const active = c.getAttribute('data-jubilee') === 'all';
          c.classList.toggle('active', active);
          c.classList.toggle('is-active', active);
        });
        document.querySelectorAll('#category-filters .filter-chip').forEach(c => {
          const active = c.getAttribute('data-category') === 'all';
          c.classList.toggle('active', active);
          c.classList.toggle('is-active', active);
        });
        renderAll();
        showToast('Фильтры сброшены');
      });
    }

    // Delegated actions for cards, calendar, table, modals
    document.body.addEventListener('click', e => {
      const calDay = e.target.closest('[data-cal-day]');
      if (calDay) {
        state.calendarSelectedDay = Number(calDay.getAttribute('data-cal-day'));
        renderCalendarView(getFilteredItems());
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-action');
      const id = actionEl.getAttribute('data-id');

      if (action === 'open-detail') {
        openDateDetailModal(id);
      } else if (action === 'toggle-plan') {
        if (state.planIds.has(id)) {
          state.planIds.delete(id);
          showToast('Дата удалена из плана на месяц');
        } else {
          state.planIds.add(id);
          try { localStorage.removeItem('aurora_chrono_plan_cleared'); } catch (_) {}
          showToast('✓ Дата добавлена в план выставок');
        }
        savePlanToStorage();
        renderAll();
        renderPlanModalList();
        const detailModal = document.getElementById('date-modal-overlay');
        if (detailModal && !detailModal.classList.contains('hidden')) {
          openDateDetailModal(id);
        }
      } else if (action === 'create-poster') {
        const idx = Number(actionEl.getAttribute('data-idea-idx') || 0);
        const size = actionEl.getAttribute('data-size') || 'a4_v';
        sendToPosterEditor(id, idx, size);
      } else if (action === 'copy-idea') {
        const item = state.items.find(it => it.id === id);
        const idx = Number(actionEl.getAttribute('data-idea-idx') || 0);
        const idea = item?.exhibitionIdeas?.[idx];
        if (idea) {
          copyTextToClipboard(`${idea.format}: «${idea.title}» — ${idea.concept}`, 'Концепция выставки скопирована');
        }
      } else if (action === 'copy-quote') {
        const item = state.items.find(it => it.id === id);
        if (item?.quote) {
          copyTextToClipboard(`«${item.quote}» — ${item.name}`, 'Цитата скопирована');
        }
      } else if (action === 'copy-full-card') {
        const item = state.items.find(it => it.id === id);
        if (item) {
          const jub = computeJubileeInfo(item, state.year);
          const text = `${item.day} ${MONTHS_GENITIVE[item.month]} — ${item.name} (${formatLifespan(item)}), ${jub.badgeText}\n${item.role}\nСправка: ${item.bio}\nПроизведения: ${(item.works || []).join(', ')}`;
          copyTextToClipboard(text, 'Методическая карточка скопирована');
        }
      }
    });

    // Modals open/close
    const dateModal = document.getElementById('date-modal-overlay');
    const planModal = document.getElementById('plan-modal-overlay');
    const customModal = document.getElementById('custom-date-modal-overlay');

    document.getElementById('date-modal-close')?.addEventListener('click', () => dateModal?.classList.add('hidden'));
    document.getElementById('plan-modal-close')?.addEventListener('click', () => planModal?.classList.add('hidden'));
    document.getElementById('custom-date-close')?.addEventListener('click', () => customModal?.classList.add('hidden'));

    [dateModal, planModal, customModal].forEach(overlay => {
      overlay?.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        [dateModal, planModal, customModal].forEach(m => m?.classList.add('hidden'));
      }
    });

    document.getElementById('btn-open-plan-drawer')?.addEventListener('click', () => {
      renderPlanModalList();
      planModal?.classList.remove('hidden');
    });

    document.getElementById('btn-plan-select-all-month')?.addEventListener('click', () => {
      const filtered = getFilteredItems();
      filtered.forEach(it => state.planIds.add(it.id));
      try { localStorage.removeItem('aurora_chrono_plan_cleared'); } catch (_) {}
      savePlanToStorage();
      renderAll();
      renderPlanModalList();
      showToast(`✓ Добавлено в план: ${filtered.length} дат`);
    });

    document.getElementById('btn-plan-clear')?.addEventListener('click', () => {
      state.planIds.clear();
      try { localStorage.setItem('aurora_chrono_plan_cleared', 'true'); } catch (_) {}
      savePlanToStorage();
      renderAll();
      renderPlanModalList();
      showToast('План мероприятий очищен');
    });

    document.getElementById('btn-add-custom-date')?.addEventListener('click', () => {
      customModal?.classList.remove('hidden');
    });

    const customForm = document.getElementById('custom-date-form');
    if (customForm) {
      customForm.addEventListener('submit', e => {
        e.preventDefault();
        const day = Number(document.getElementById('cd-day')?.value || 1);
        const month = Number(document.getElementById('cd-month')?.value || 1);
        const birthYear = Number(document.getElementById('cd-birth-year')?.value || 1926);
        const name = (document.getElementById('cd-title')?.value || '').trim();
        const category = document.getElementById('cd-category')?.value || 'regional';
        const role = (document.getElementById('cd-role')?.value || 'Памятная дата филиала').trim();
        const bio = (document.getElementById('cd-bio')?.value || 'Памятная дата, внесённая методистом библиотеки.').trim();
        const worksRaw = (document.getElementById('cd-works')?.value || '').trim();
        const exTitle = (document.getElementById('cd-exhibition')?.value || `К юбилею: ${name}`).trim();

        if (!name) return;
        const newItem = normalizeItem({
          id: 'custom_' + Date.now(),
          day,
          month,
          birthYear,
          deathYear: null,
          name,
          title: name,
          shortName: name,
          category,
          role,
          monogram: getMonogram(name),
          portraitColor: '#10b981',
          bio,
          quote: '',
          works: worksRaw ? worksRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Материалы краеведческого фонда'],
          exhibitionIdeas: [
            { format: 'Книжная выставка', title: exTitle, concept: bio, audience: 'Широкий круг читателей' }
          ],
          tags: ['Своя дата', role]
        });

        saveCustomDate(newItem);
        state.items.push(newItem);
        state.planIds.add(newItem.id);
        savePlanToStorage();
        customForm.reset();
        customModal?.classList.add('hidden');
        renderAll();
        showToast(`✓ Дата «${name}» добавлена в хронограф и план!`);
      });
    }

    // Export & Print buttons
    document.getElementById('btn-export-txt')?.addEventListener('click', () => exportPlanFile('txt'));
    document.getElementById('btn-plan-export-txt')?.addEventListener('click', () => exportPlanFile('txt'));
    document.getElementById('btn-export-md')?.addEventListener('click', () => exportPlanFile('md'));
    document.getElementById('btn-plan-export-md')?.addEventListener('click', () => exportPlanFile('md'));

    const triggerPrintWall = () => {
      renderWallSheetPrintArea();
      showToast('Подготовка настенного листа А4 для печати...');
      setTimeout(() => window.print(), 150);
    };
    document.getElementById('btn-print-wall')?.addEventListener('click', triggerPrintWall);
    document.getElementById('btn-plan-print')?.addEventListener('click', triggerPrintWall);

    // Theme toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
      } catch (_) {}
      showToast(state.theme === 'light' ? 'Светлая тема «Читальный зал»' : 'Тёмная тема «Космическая библиотека»');
    });
  }

  async function init() {
    loadStoredState();
    await loadChronographDatabase();
    bindEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
