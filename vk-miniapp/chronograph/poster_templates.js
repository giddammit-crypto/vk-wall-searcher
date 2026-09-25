/**
 * АВРОРА • Генератор многослойных шаблонов афиш для «Литературного хронографа»
 * и «Редактора Афиш» (vk-miniapp/poster/).
 * Чистый Vanilla JS (ES6+) без внешних сборщиков.
 */
(function (global) {
  'use strict';

  const CUSTOM_DATES_STORAGE_KEY = 'aurora_chrono_custom_dates';

  const MONTHS_GENITIVE = [
    '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  /* ── Цветовые и типографические темы по категориям Хронографа ── */
  const CATEGORY_THEMES = {
    classics: {
      bg: '#12101b',
      accent: '#FBBF24',
      secondary: '#fef3c7',
      titleFont: 'Cormorant Garamond',
      quoteFont: 'Playfair Display',
      cardBg: 'rgba(251, 191, 36, 0.07)',
      cardStroke: 'rgba(251, 191, 36, 0.38)',
      pillTextFill: '#12101b'
    },
    modern: {
      bg: '#090d1e',
      accent: '#38BDF8',
      secondary: '#c084fc',
      titleFont: 'Unbounded',
      quoteFont: 'Cormorant Garamond',
      cardBg: 'rgba(56, 189, 248, 0.08)',
      cardStroke: 'rgba(192, 132, 252, 0.42)',
      pillTextFill: '#090d1e'
    },
    regional: {
      bg: '#06281e',
      accent: '#10B981',
      secondary: '#FBBF24',
      titleFont: 'Unbounded',
      quoteFont: 'Playfair Display',
      cardBg: 'rgba(16, 185, 129, 0.09)',
      cardStroke: 'rgba(251, 191, 36, 0.42)',
      pillTextFill: '#06281e'
    },
    children: {
      bg: '#1a1438',
      accent: '#f472b6',
      secondary: '#fde047',
      titleFont: 'Comfortaa',
      quoteFont: 'Comfortaa',
      cardBg: 'rgba(244, 114, 182, 0.09)',
      cardStroke: 'rgba(253, 224, 71, 0.42)',
      pillTextFill: '#1a1438'
    },
    art_history: {
      bg: '#1f0d18',
      accent: '#f59e0b',
      secondary: '#f472b6',
      titleFont: 'Playfair Display',
      quoteFont: 'Cormorant Garamond',
      cardBg: 'rgba(245, 158, 11, 0.08)',
      cardStroke: 'rgba(244, 114, 182, 0.42)',
      pillTextFill: '#1f0d18'
    }
  };

  /* ── Координатные сетки под форматы холста Редактора Афиш ────── */
  const LAYOUTS = {
    a4_v: {
      w: 595, h: 842, cx: 298,
      outerW: 555, outerH: 802, innerW: 541, innerH: 788,
      contentW: 500, boxW: 500, innerTextW: 462,
      rubricY: 38, rubricSize: 10.5,
      formatPillY: 72, formatPillW: 350, formatPillH: 26, formatFontSize: 10.5,
      medallionY: 124, medallionR: 28, monogramSize: 20,
      personY: 164, personSize: 25,
      lifespanY: 202, lifespanSize: 12,
      exTitleY: 234, exTitleSize: 21,
      quoteBoxY: 344, quoteBoxH: 96, quoteTextY: 306, quoteFontSize: 13,
      worksBoxY: 486, worksBoxH: 148, worksHeaderY: 424, worksListY: 450, worksFontSize: 13,
      datePillY: 610, datePillW: 460, datePillH: 42, dateFontSize: 14.5,
      badgesY: 662, badge1X: 152, badge1W: 168, badge2X: 332, badge2W: 174, badge3X: 464, badge3W: 56,
      dividerY: 718, footerY: 732, footerFontSize: 11.5
    },
    square: {
      w: 700, h: 700, cx: 350,
      outerW: 662, outerH: 662, innerW: 648, innerH: 648,
      contentW: 596, boxW: 596, innerTextW: 556,
      rubricY: 28, rubricSize: 10,
      formatPillY: 56, formatPillW: 360, formatPillH: 24, formatFontSize: 10,
      medallionY: 98, medallionR: 24, monogramSize: 17,
      personY: 130, personSize: 23,
      lifespanY: 162, lifespanSize: 11.5,
      exTitleY: 188, exTitleSize: 19,
      quoteBoxY: 278, quoteBoxH: 80, quoteTextY: 246, quoteFontSize: 12,
      worksBoxY: 400, worksBoxH: 124, worksHeaderY: 348, worksListY: 372, worksFontSize: 12,
      datePillY: 502, datePillW: 510, datePillH: 38, dateFontSize: 13.5,
      badgesY: 546, badge1X: 196, badge1W: 172, badge2X: 382, badge2W: 178, badge3X: 518, badge3W: 56,
      dividerY: 596, footerY: 608, footerFontSize: 11
    },
    story: {
      w: 540, h: 960, cx: 270,
      outerW: 502, outerH: 920, innerW: 488, innerH: 906,
      contentW: 454, boxW: 454, innerTextW: 420,
      rubricY: 44, rubricSize: 10,
      formatPillY: 84, formatPillW: 336, formatPillH: 28, formatFontSize: 10.5,
      medallionY: 146, medallionR: 32, monogramSize: 22,
      personY: 192, personSize: 25,
      lifespanY: 234, lifespanSize: 12,
      exTitleY: 272, exTitleSize: 21,
      quoteBoxY: 402, quoteBoxH: 114, quoteTextY: 356, quoteFontSize: 13,
      worksBoxY: 568, worksBoxH: 168, worksHeaderY: 498, worksListY: 526, worksFontSize: 13,
      datePillY: 706, datePillW: 440, datePillH: 44, dateFontSize: 14,
      badgesY: 764, badge1X: 130, badge1W: 162, badge2X: 302, badge2W: 166, badge3X: 428, badge3W: 52,
      dividerY: 824, footerY: 840, footerFontSize: 11
    }
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripOuterQuotes(str) {
    return String(str || '').trim().replace(/^[«"“]+|[»"”]+$/g, '').trim();
  }

  function truncateText(str, maxLen) {
    const clean = String(str || '').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen - 1).trimEnd() + '…';
  }

  function deriveMonogram(rawItem, title) {
    if (rawItem.monogram) return String(rawItem.monogram).slice(0, 3).toUpperCase();
    if (rawItem.portrait && rawItem.portrait.initials) {
      return String(rawItem.portrait.initials).slice(0, 3).toUpperCase();
    }
    const words = String(title || '').replace(/[«»"()]/g, '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return String(title || 'АВ').slice(0, 2).toUpperCase();
  }

  function extractWorksLines(rawItem) {
    const rawWorks = Array.isArray(rawItem.works) ? rawItem.works : [];
    const formatted = rawWorks.slice(0, 4).map((w) => {
      if (typeof w === 'object' && w !== null) {
        const title = stripOuterQuotes(w.title || '');
        const meta = [w.year, w.genre].filter(Boolean).join(', ');
        return meta ? `✦ «${title}» (${meta})` : `✦ «${title}»`;
      }
      return `✦ «${stripOuterQuotes(w)}»`;
    }).filter(Boolean);
    return formatted.length
      ? formatted.join('\n')
      : '✦ Прижизненные и юбилейные издания из фонда ЦГБ\n✦ Литературоведческие очерки, воспоминания и альбомы';
  }

  function extractAgeRating(exhibition, category) {
    const aud = String((exhibition && exhibition.audience) || '');
    const match = aud.match(/(\d{1,2})\+/);
    if (match) return `${match[1]}+`;
    return category === 'children' ? '6+' : '12+';
  }

  /**
   * Строит готовый многослойный шаблон афиши для одной даты Хронографа.
   */
  function buildChronographPosterTemplate(rawItem, targetYear = 2026, sizeKey = 'a4_v', ideaIndex = 0) {
    const item = rawItem || {};
    const layout = LAYOUTS[sizeKey] || LAYOUTS.a4_v;
    const categoryKey = CATEGORY_THEMES[item.category] ? item.category : 'classics';
    const theme = CATEGORY_THEMES[categoryKey];

    const day = Number(item.day) || 1;
    const monthIdx = Math.min(12, Math.max(1, Number(item.month) || 1));
    const monthGen = MONTHS_GENITIVE[monthIdx];
    const monthUpper = monthGen.toUpperCase();
    const yearNum = Number(targetYear) || 2026;

    const title = String(item.title || item.name || 'Памятная литературная дата').trim();
    const birthYear = Number(item.birthYear) || (yearNum - (Number(item.jubileeBase2026) || 100));
    const age = Math.max(1, yearNum - birthYear);
    const lifespan = item.deathYear ? `${birthYear}–${item.deathYear}` : `${birthYear}`;
    const roleText = truncateText(item.role || item.categoryLabel || 'Литературное наследие', 78);

    const rawExhibitions = Array.isArray(item.exhibitions) && item.exhibitions.length
      ? item.exhibitions
      : (Array.isArray(item.exhibitionIdeas) && item.exhibitionIdeas.length ? item.exhibitionIdeas : []);
    const chosenEx = rawExhibitions[ideaIndex] || rawExhibitions[0] || {
      type: 'Книжная выставка-портрет',
      title: `Литературный мир: ${title}`,
      audience: '12+'
    };

    const exhibitionFormat = String(chosenEx.type || chosenEx.format || 'Книжная выставка-портрет').trim();
    const exhibitionTitle = stripOuterQuotes(chosenEx.title || `К юбилею: ${title}`);
    const monogram = deriveMonogram(item, title);
    const ageRating = extractAgeRating(chosenEx, categoryKey);

    const rawQuote = stripOuterQuotes(item.quote || '');
    const quoteOrBio = rawQuote
      ? `«${truncateText(rawQuote, 135)}»\n— ${truncateText(item.bio || roleText, 110)}`
      : truncateText(item.bio || 'Юбилейная книжно-иллюстративная экспозиция в читальном зале библиотеки.', 210);

    const worksBlockText = extractWorksLines(item);
    const fmtLabel = sizeKey === 'square' ? 'ВК 1:1' : (sizeKey === 'story' ? 'Сторис 9:16' : 'A4');

    const previewHtml = `
      <div class="mp-wrap" style="border:1px solid ${theme.accent}; padding:4px; box-sizing:border-box;">
        <div>
          <div class="mp-tag" style="color:${theme.accent};">✦ ${day} ${escapeHtml(monthUpper)} · ${age} ЛЕТ ✦</div>
          <div class="mp-title" style="color:${theme.secondary}; font-size:9.5px; line-height:1.15; margin:2px 0;">${escapeHtml(truncateText(title, 34))}</div>
          <div class="mp-pill" style="border:1px solid ${theme.accent}; color:${theme.accent}; background:${theme.cardBg};">${escapeHtml(truncateText(exhibitionFormat.toUpperCase(), 24))}</div>
        </div>
        <div class="mp-box" style="border:1px solid ${theme.cardStroke}; background:rgba(15,23,42,0.78); padding:3px;">
          <div style="font-size:6px; color:${theme.secondary}; font-weight:700;">«${escapeHtml(truncateText(exhibitionTitle, 42))}»</div>
          <div style="font-size:5px; color:#cbd5e1; margin-top:1px;">${escapeHtml(truncateText(roleText, 48))}</div>
        </div>
        <div>
          <div class="mp-date" style="background:${theme.cardBg}; color:${theme.accent}; border:1px solid ${theme.accent}; font-size:6px;">${day} ${escapeHtml(monthUpper)} ${yearNum}</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#10B981; color:#070a1e;">СВОБОДНЫЙ</span>
            <span class="mp-badge" style="background:${theme.accent}; color:${theme.pillTextFill};">${escapeHtml(ageRating)}</span>
          </div>
        </div>
      </div>`;

    const objects = [
      /* 1. Двойная декоративная рамка по периметру листа */
      {
        type: 'rect',
        left: layout.cx, top: layout.h / 2,
        width: layout.outerW, height: layout.outerH,
        fill: 'transparent', stroke: theme.accent, strokeWidth: 2,
        rx: 6, ry: 6, originX: 'center', originY: 'center',
        layerName: 'Внешняя декоративная рамка'
      },
      {
        type: 'rect',
        left: layout.cx, top: layout.h / 2,
        width: layout.innerW, height: layout.innerH,
        fill: 'transparent', stroke: theme.cardStroke, strokeWidth: 1,
        rx: 4, ry: 4, originX: 'center', originY: 'center',
        layerName: 'Внутренняя декоративная рамка'
      },
      /* 2. Верхняя рубрика */
      {
        type: 'text',
        text: `✦ ЛИТЕРАТУРНЫЙ ХРОНОГРАФ · ${age} ЛЕТ СО ДНЯ РОЖДЕНИЯ ✦`,
        left: layout.cx, top: layout.rubricY, width: layout.contentW,
        fontSize: layout.rubricSize, fontFamily: 'Montserrat', fontWeight: 'bold',
        fill: theme.accent, textAlign: 'center', originX: 'center', charSpacing: 90,
        layerName: 'Верхняя рубрика'
      },
      /* 3. Плашка формата выставки */
      {
        type: 'rect',
        left: layout.cx, top: layout.formatPillY,
        width: layout.formatPillW, height: layout.formatPillH,
        rx: layout.formatPillH / 2, ry: layout.formatPillH / 2,
        fill: theme.cardBg, stroke: theme.accent, strokeWidth: 1.2,
        originX: 'center', originY: 'center',
        layerName: 'Плашка формата выставки'
      },
      {
        type: 'text',
        text: exhibitionFormat.toUpperCase(),
        left: layout.cx, top: layout.formatPillY, width: layout.formatPillW - 20,
        fontSize: layout.formatFontSize, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: theme.secondary, textAlign: 'center', originX: 'center', originY: 'center',
        layerName: 'Формат выставки'
      },
      /* 4. Круглый медальон-монограмма автора */
      {
        type: 'circle',
        left: layout.cx, top: layout.medallionY,
        radius: layout.medallionR, width: layout.medallionR * 2, height: layout.medallionR * 2,
        fill: theme.cardBg, stroke: theme.accent, strokeWidth: 2,
        originX: 'center', originY: 'center',
        shadow: `${theme.accent} 0px 0px 14px`,
        layerName: 'Медальон автора'
      },
      {
        type: 'text',
        text: monogram,
        left: layout.cx, top: layout.medallionY, width: layout.medallionR * 2,
        fontSize: layout.monogramSize, fontFamily: theme.titleFont, fontWeight: 'bold',
        fill: theme.secondary, textAlign: 'center', originX: 'center', originY: 'center',
        layerName: 'Монограмма автора'
      },
      /* 5. Крупное имя персоны / события и годы жизни */
      {
        type: 'text',
        text: title,
        left: layout.cx, top: layout.personY, width: layout.contentW,
        fontSize: layout.personSize, fontFamily: theme.titleFont, fontWeight: 'bold',
        fill: '#ffffff', textAlign: 'center', originX: 'center', lineHeight: 1.12,
        shadow: 'rgba(0,0,0,0.65) 0px 4px 14px',
        layerName: 'Персона'
      },
      {
        type: 'text',
        text: `${lifespan}  ·  ${roleText}`,
        left: layout.cx, top: layout.lifespanY, width: layout.contentW,
        fontSize: layout.lifespanSize, fontFamily: 'Montserrat', fontWeight: '600',
        fill: theme.accent, textAlign: 'center', originX: 'center',
        layerName: 'Годы жизни и статус'
      },
      /* 6. Главный заголовок выставки в кавычках */
      {
        type: 'text',
        text: `«${exhibitionTitle}»`,
        left: layout.cx, top: layout.exTitleY, width: layout.contentW,
        fontSize: layout.exTitleSize, fontFamily: theme.quoteFont, fontStyle: 'italic', fontWeight: 'bold',
        fill: theme.secondary, textAlign: 'center', originX: 'center', lineHeight: 1.18,
        layerName: 'Название выставки'
      },
      /* 7. Блок с цитатой или методической аннотацией */
      {
        type: 'rect',
        left: layout.cx, top: layout.quoteBoxY,
        width: layout.boxW, height: layout.quoteBoxH,
        rx: 10, ry: 10, fill: 'rgba(255,255,255,0.03)', stroke: theme.cardStroke, strokeWidth: 1,
        originX: 'center', originY: 'center',
        layerName: 'Подложка цитаты'
      },
      {
        type: 'text',
        text: quoteOrBio,
        left: layout.cx, top: layout.quoteTextY, width: layout.innerTextW,
        fontSize: layout.quoteFontSize, fontFamily: theme.quoteFont, fontStyle: 'italic',
        fill: '#f1f5f9', textAlign: 'center', originX: 'center', lineHeight: 1.38,
        layerName: 'Цитата и аннотация'
      },
      /* 8. Блок «В ЭКСПОЗИЦИИ ВЫСТАВКИ И ФОНДЕ:» со списком произведений */
      {
        type: 'rect',
        left: layout.cx, top: layout.worksBoxY,
        width: layout.boxW, height: layout.worksBoxH,
        rx: 12, ry: 12, fill: theme.cardBg, stroke: theme.cardStroke, strokeWidth: 1.2,
        originX: 'center', originY: 'center',
        layerName: 'Подложка экспозиции'
      },
      {
        type: 'text',
        text: 'В ЭКСПОЗИЦИИ ВЫСТАВКИ И ФОНДЕ:',
        left: layout.cx, top: layout.worksHeaderY, width: layout.innerTextW,
        fontSize: layout.worksFontSize - 0.5, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: theme.accent, textAlign: 'center', originX: 'center',
        layerName: 'Заголовок экспозиции'
      },
      {
        type: 'text',
        text: worksBlockText,
        left: layout.cx, top: layout.worksListY, width: layout.innerTextW,
        fontSize: layout.worksFontSize, fontFamily: 'Montserrat', fontWeight: '500',
        fill: '#e2e8f0', textAlign: 'left', originX: 'center', lineHeight: 1.52,
        layerName: 'Список ключевых произведений'
      },
      /* 9. Плашка даты и места */
      {
        type: 'rect',
        left: layout.cx, top: layout.datePillY,
        width: layout.datePillW, height: layout.datePillH,
        rx: layout.datePillH / 2, ry: layout.datePillH / 2,
        fill: theme.accent, stroke: theme.secondary, strokeWidth: 1.5,
        originX: 'center', originY: 'center',
        layerName: 'Плашка даты'
      },
      {
        type: 'text',
        text: `${day} ${monthUpper} ${yearNum} · ЧИТАЛЬНЫЙ ЗАЛ`,
        left: layout.cx, top: layout.datePillY, width: layout.datePillW - 24,
        fontSize: layout.dateFontSize, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: theme.pillTextFill, textAlign: 'center', originX: 'center', originY: 'center',
        layerName: 'Дата и место'
      },
      /* 10. Бейджи внизу и подвал библиотеки */
      {
        type: 'text',
        text: '★ ВХОД СВОБОДНЫЙ',
        left: layout.badge1X, top: layout.badgesY, width: layout.badge1W,
        fontSize: 11, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: '#070a1e', backgroundColor: '#10B981', padding: 6,
        textAlign: 'center', originX: 'center',
        layerName: 'Бейдж: Вход свободный'
      },
      {
        type: 'text',
        text: 'ВЫБОР БИБЛИОТЕКАРЯ',
        left: layout.badge2X, top: layout.badgesY, width: layout.badge2W,
        fontSize: 11, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: '#ffffff', backgroundColor: '#059669', padding: 6,
        textAlign: 'center', originX: 'center',
        layerName: 'Бейдж: Выбор библиотекаря'
      },
      {
        type: 'text',
        text: ageRating,
        left: layout.badge3X, top: layout.badgesY, width: layout.badge3W,
        fontSize: 11.5, fontFamily: 'Unbounded', fontWeight: 'bold',
        fill: theme.pillTextFill, backgroundColor: theme.secondary, padding: 6,
        textAlign: 'center', originX: 'center',
        layerName: 'Возрастной ценз'
      },
      {
        type: 'rect',
        left: layout.cx, top: layout.dividerY,
        width: layout.boxW, height: 1,
        fill: 'rgba(255,255,255,0.16)', originX: 'center',
        layerName: 'Разделитель подвала'
      },
      {
        type: 'text',
        text: 'МБУК «ЦГБ» г. Владимира · Проспект Ленина · biblioteka33.ru',
        left: layout.cx, top: layout.footerY, width: layout.contentW,
        fontSize: layout.footerFontSize, fontFamily: 'Montserrat', fontWeight: '600',
        fill: '#94a3b8', textAlign: 'center', originX: 'center', lineHeight: 1.4,
        layerName: 'Подвал библиотеки'
      }
    ];

    return {
      id: 'chrono_' + item.id + '_' + sizeKey + '_' + ideaIndex,
      chronoId: item.id,
      size: sizeKey,
      isSquare: sizeKey === 'square',
      category: 'chronograph',
      name: `${day} ${monthGen} — ${title} (${age} лет)`,
      desc: `${exhibitionFormat}: «${exhibitionTitle}»`,
      fmt: fmtLabel,
      bg: theme.bg,
      previewBg: theme.bg,
      previewAccent: theme.accent,
      previewHtml,
      objects
    };
  }

  /**
   * Возвращает массив готовых шаблонов афиш для всех 85+ дат Хронографа
   * (включая пользовательские даты из localStorage).
   */
  function getAllChronographPosterTemplates(targetYear = 2026, sizeKey = 'a4_v', ideaIndex = 0) {
    const rawBase = global.CHRONOGRAPH_DATES || global.CHRONOGRAPH_DATA || [];
    const baseList = Array.isArray(rawBase)
      ? rawBase
      : (rawBase && Array.isArray(rawBase.items) ? rawBase.items : []);

    let customList = [];
    try {
      if (global.localStorage) {
        const saved = JSON.parse(global.localStorage.getItem(CUSTOM_DATES_STORAGE_KEY) || '[]');
        if (Array.isArray(saved)) customList = saved;
      }
    } catch (_) {}

    const allItems = [...baseList, ...customList];
    return allItems.map((item) => buildChronographPosterTemplate(item, targetYear, sizeKey, ideaIndex));
  }

  if (global.CHRONOGRAPH_DATA && !global.CHRONOGRAPH_DATES) {
    global.CHRONOGRAPH_DATES = global.CHRONOGRAPH_DATA;
  }

  global.CHRONOGRAPH_POSTER_THEMES = CATEGORY_THEMES;
  global.buildChronographPosterTemplate = buildChronographPosterTemplate;
  global.getAllChronographPosterTemplates = getAllChronographPosterTemplates;
})(typeof window !== 'undefined' ? window : globalThis);
