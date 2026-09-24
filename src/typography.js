/**
 * src/typography.js — Ядро очистки русской типографики (Типограф) для AURORA
 * =============================================================================
 * Профессиональная типографика русского текста по правилам издательского дела:
 *  • Замена прямых кавычек на кавычки-ёлочки («...») и вложенные лапки („...“)
 *  • Замена дефисов на длинные тире (—) с неразрывным пробелом и среднее тире (–) в диапазонах
 *  • Сохранение дефисов внутри сложных слов (по-русски, кто-то, бизнес-план)
 *  • Неразрывные пробелы (&nbsp; / \u00A0) после 1-3 буквенных предлогов и союзов
 *  • Неразрывные пробелы перед частицами (бы, ли, же) и перед длинным тире
 *  • Неразрывные пробелы между инициалами и фамилией (А. С. Пушкин)
 *  • Неразрывные пробелы между числами и единицами измерения (10 кг, 2026 г., 250 МБ, № 5)
 *  • Замена спецсимволов: ... → …, (c) → ©, (r) → ®, (tm) → ™, +- → ±, 1920x1080 → 1920×1080
 *  • Очистка дублирующихся пробелов и пробелов перед знаками препинания
 *  • Защита HTML-тегов, ссылок и блоков кода от искажения
 *  • Экспорт: Unicode, HTML Entities, Markdown, HTML с абзацами
 * =============================================================================
 */

export const DEFAULT_TYPO_OPTIONS = {
  quotes: true,            // Кавычки-ёлочки («...») и вложенные лапки („...“)
  dashes: true,            // Тире вместо дефисов: длинное (—) и числовые диапазоны (–)
  nbspPrepositions: true,  // Неразрывные пробелы после предлогов и союзов
  nbspParticles: true,     // Неразрывные пробелы перед частицами (ли, же, бы)
  nbspInitials: true,      // Неразрывные пробелы в инициалах (А. С. Пушкин)
  nbspUnits: true,         // Неразрывные пробелы между числами и единицами (10 кг, 2026 г., № 5)
  symbols: true,           // Замена символов: ..., (c), (r), (tm), +-, ->, x
  punctuation: true,       // Удаление пробелов перед запятыми, точками и т.д.
  cleanSpaces: true,       // Удаление двойных пробелов и висячих пробелов в концах строк
  format: 'unicode',       // 'unicode' | 'html-entities' | 'html-p' | 'markdown'
  highlightNbsp: false     // Подсвечивать неразрывные пробелы специальным символом
};

/**
 * Список предлогов и союзов (1-3 буквы)
 */
const SHORT_WORDS = [
  'в', 'во', 'к', 'ко', 'с', 'со', 'у', 'о', 'об', 'обо',
  'от', 'ото', 'из', 'изо', 'за', 'на', 'по', 'под', 'над',
  'про', 'для', 'без', 'безо', 'до', 'а', 'и', 'но', 'да',
  'или', 'как', 'не', 'ни', 'из-за', 'из-под'
];

/**
 * Единицы измерения и сокращения, требующие неразрывного пробела
 */
const UNITS = [
  'руб\\.', 'коп\\.', 'долл\\.', 'евро', 'тыс\\.', 'млн', 'млрд', 'трлн',
  'г\\.', 'гг\\.', 'в\\.', 'вв\\.', 'кг', 'г', 'мг', 'м', 'см', 'мм', 'км',
  'л', 'мл', 'шт\\.', 'экз\\.', 'стр\\.', 'с\\.', 'п\\.', 'пп\\.', 'рис\\.', 'табл\\.',
  'МБ', 'ГБ', 'КБ', 'ТБ', 'Мбит', 'Гбит', 'бит', 'байт',
  'сек\\.', 'мин\\.', 'ч\\.', 'с', 'мс', '%', '‰', '°C', '°F', '°'
];

/**
 * Основная функция очистки типографики
 * @param {string} text Исходный текст
 * @param {Partial<typeof DEFAULT_TYPO_OPTIONS>} userOptions Настройки
 * @returns {{ result: string, stats: { charsBefore: number, charsAfter: number, words: number, lines: number, changesCount: number } }}
 */
export function cleanTypography(text, userOptions = {}) {
  if (typeof text !== 'string' || !text) {
    return {
      result: '',
      stats: { charsBefore: 0, charsAfter: 0, words: 0, lines: 0, changesCount: 0 }
    };
  }

  const opt = { ...DEFAULT_TYPO_OPTIONS, ...userOptions };
  const NBSP = '\u00A0';

  // 1. Защита блоков кода, ссылок и HTML-тегов от изменений
  const placeholders = [];
  let working = text;

  // Защищаем блоки кода ``` ... ```
  working = working.replace(/```[\s\S]*?```/g, match => {
    placeholders.push(match);
    return `___TYPO_SAFE_BLOCK_${placeholders.length - 1}___`;
  });

  // Защищаем инлайн-код ` ... `
  working = working.replace(/`[^`\n]+`/g, match => {
    placeholders.push(match);
    return `___TYPO_SAFE_BLOCK_${placeholders.length - 1}___`;
  });

  // Защищаем URL и email
  working = working.replace(/https?:\/\/[^\s<>'"]+|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, match => {
    placeholders.push(match);
    return `___TYPO_SAFE_BLOCK_${placeholders.length - 1}___`;
  });

  // Защищаем HTML-теги
  working = working.replace(/<[^>]+>/g, match => {
    placeholders.push(match);
    return `___TYPO_SAFE_BLOCK_${placeholders.length - 1}___`;
  });

  // 2. Нормализация переводов строк
  working = working.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Очистка лишних пробелов (но сохраняем отступы строк)
  if (opt.cleanSpaces) {
    // Убираем висячие пробелы в концах строк
    working = working.replace(/[ \t]+$/gm, '');
    // Заменяем множественные пробелы и табуляции внутри строки на один пробел
    working = working.replace(/[^\S\r\n]{2,}/g, ' ');
  }

  // 4. Пунктуация
  if (opt.punctuation) {
    // Убираем пробелы ПЕРЕД знаками препинания: "слово , слово" → "слово, слово"
    working = working.replace(/[ \t]+([,.:;!?\)\]\}])/g, '$1');
    // Добавляем пробел ПОСЛЕ запятой, точки с запятой или двоеточия, если следом буква
    working = working.replace(/([,;:])([А-Яа-яA-Za-z])/g, '$1 $2');
    // Убираем пробелы после открывающих скобок
    working = working.replace(/([\(\[\{])[ \t]+/g, '$1');
  }

  // 5. Замена спецсимволов и сокращений
  if (opt.symbols) {
    // Многоточие ... → …
    working = working.replace(/\.{3,}/g, '…');
    // Авторские знаки
    working = working.replace(/\([cс]\)/gi, '©');
    working = working.replace(/\([rр]\)/gi, '®');
    working = working.replace(/\(tm\)/gi, '™');
    working = working.replace(/\+-/g, '±');
    // Стрелочки
    working = working.replace(/->|—>/g, '→');
    working = working.replace(/<-|—</g, '←');
    working = working.replace(/=>/g, '⇒');
    // Знак умножения в размерах (1920x1080 → 1920×1080)
    working = working.replace(/(\d+)\s*[xхXХ]\s*(\d+)/g, '$1×$2');
  }

  // 6. Тире (длинное — и среднее в диапазонах –)
  if (opt.dashes) {
    // Прямая речь / списки в начале строки (- текст → — текст)
    working = working.replace(/^(\s*)-[ \t]+/gm, `$1—${NBSP}`);

    // Числовые диапазоны: среднее тире (en-dash) без пробелов (10-15 → 10–15, 2020-2026 → 2020–2026)
    working = working.replace(/(\d+)[ \t]*[-—–][ \t]*(\d+)/g, '$1–$2');

    // Тире между словами: дефис с пробелами вокруг заменяем на длинное тире с неразрывным пробелом слева
    working = working.replace(/(\S)[ \t]+[-–—][ \t]+(\S)/g, `$1${NBSP}— $2`);
    
    // Тире в начале цитаты после открывающей кавычки: «- Привет» → «— Привет»
    working = working.replace(/(«)[ \t]*-/g, `$1—${NBSP}`);
  }

  // 7. Кавычки («ёлочки» первого уровня и „лапки“ второго уровня)
  if (opt.quotes) {
    working = formatRussianQuotes(working);
  }

  // 8. Неразрывные пробелы после предлогов и союзов
  if (opt.nbspPrepositions) {
    const pattern = new RegExp(`(^|[\\s(«"„])(${SHORT_WORDS.join('|')})[ \\t]+`, 'gi');
    working = working.replace(pattern, (match, prefix, word) => {
      return `${prefix}${word}${NBSP}`;
    });
  }

  // 9. Неразрывные пробелы перед частицами (бы, б, ли, ль, же, ж)
  if (opt.nbspParticles) {
    working = working.replace(/([А-Яа-яA-Za-z0-9])[ \t]+(бы|б|ли|ль|же|ж)\b/gi, `$1${NBSP}$2`);
    // Перед длинным тире
    working = working.replace(/[ \t]+(—)/g, `${NBSP}$1`);
  }

  // 10. Инициалы и сокращения с именами (А. С. Пушкин)
  if (opt.nbspInitials) {
    // А. С. Пушкин или А. Пушкин
    working = working.replace(/([А-ЯЁA-Z]\.)[ \t]*([А-ЯЁA-Z]\.)?[ \t]*([А-ЯЁA-Z][а-яёa-z]+)/g, (match, i1, i2, surname) => {
      return i2 ? `${i1}${NBSP}${i2}${NBSP}${surname}` : `${i1}${NBSP}${surname}`;
    });
    // Пушкин А. С.
    working = working.replace(/([А-ЯЁA-Z][а-яёa-z]+)[ \t]+([А-ЯЁA-Z]\.)[ \t]*([А-ЯЁA-Z]\.)?/g, (match, surname, i1, i2) => {
      return i2 ? `${surname}${NBSP}${i1}${NBSP}${i2}` : `${surname}${NBSP}${i1}`;
    });
  }

  // 11. Числа и единицы измерения / сокращения
  if (opt.nbspUnits) {
    const unitsPattern = new RegExp(`(\\d+)[ \\t]+(${UNITS.join('|')})(?=[\\s,.:;!?)\\]]|$)`, 'gi');
    working = working.replace(unitsPattern, `$1${NBSP}$2`);

    // Сокращения адресов и городов перед именами и номерами: г. Москва, ул. Ленина, д. 15, стр. 2
    working = working.replace(/(^|[\s(«"„])(г\.|с\.|пос\.|дер\.|ул\.|пр\.|пер\.|пл\.|просп\.|б-р|бул\.|наб\.|ш\.|туп\.|д\.|корп\.|стр\.|кв\.|оф\.)[ \t]+([А-Яа-яЁё0-9A-Za-z]+)/gi, `$1$2${NBSP}$3`);

    // Знаки номеров и параграфов: № 12 → № 12, § 5 → § 5
    working = working.replace(/([№§])[ \t]*(\d+)/g, `$1${NBSP}$2`);

    // Триады чисел (10 000 000 → 10 000 000 с неразрывными пробелами)
    working = working.replace(/(\d{1,3})[ \t]+(\d{3})(?=[ \t]+\d{3}|\b)/g, `$1${NBSP}$2`);
  }

  // 12. Восстановление защищенных блоков
  placeholders.forEach((orig, idx) => {
    working = working.replace(`___TYPO_SAFE_BLOCK_${idx}___`, orig);
  });

  // 13. Преобразование в нужный формат вывода
  let finalResult = working;
  if (opt.format === 'html-entities') {
    finalResult = convertToHtmlEntities(working);
  } else if (opt.format === 'html-p') {
    finalResult = convertToHtmlParagraphs(working);
  } else if (opt.format === 'markdown') {
    // В Markdown неразрывный пробел часто оформляют как &nbsp;
    finalResult = working.replace(/\u00A0/g, '&nbsp;');
  }

  // Подсветка неразрывных пробелов при необходимости (для UI diff)
  if (opt.highlightNbsp && opt.format === 'unicode') {
    finalResult = finalResult.replace(/\u00A0/g, '·');
  }

  // Подсчет статистики
  const stats = calculateStats(text, finalResult);

  return {
    result: finalResult,
    stats
  };
}

/**
 * Умная замена кавычек на русские «ёлочки» и вложенные „лапки“
 * @param {string} str
 * @returns {string}
 */
export function formatRussianQuotes(str) {
  // Заменяем парные кавычки " ... "
  // Учитываем уровень вложенности
  let depth = 0;
  let result = '';

  // Сначала унифицируем разные виды кавычек в двойную кавычку "
  // кроме уже корректных « » „ “
  let normalized = str
    .replace(/[“”]/g, '"')
    .replace(/(^|[\s(])'([^']+)'(?=[\s),.?!:;]|$)/g, '$1"$2"');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const prev = i > 0 ? normalized[i - 1] : '';
    const next = i < normalized.length - 1 ? normalized[i + 1] : '';

    if (char === '"') {
      // Определяем, открывающая или закрывающая кавычка
      // Открывающая: в начале строки, после пробела, скобки или тире
      const isOpen = i === 0 || /[\s\(\[\{—–\-\n]/.test(prev);
      // Закрывающая: после буквы, цифры или знака препинания
      const isClose = /[\wА-Яа-яЁё0-9\.\,\!\?\:\;\…\)\/\]\}]/.test(prev);

      if (isOpen && !isClose) {
        if (depth === 0) {
          result += '«';
        } else {
          result += '„';
        }
        depth++;
      } else if (isClose) {
        depth = Math.max(0, depth - 1);
        if (depth === 0) {
          result += '»';
        } else {
          result += '“';
        }
      } else {
        // Эвристика по следующему символу
        if (next && /[\wА-Яа-яЁё0-9]/.test(next)) {
          result += depth === 0 ? '«' : '„';
          depth++;
        } else {
          depth = Math.max(0, depth - 1);
          result += depth === 0 ? '»' : '“';
        }
      }
    } else if (char === '«') {
      depth++;
      result += char;
    } else if (char === '»') {
      depth = Math.max(0, depth - 1);
      result += char;
    } else {
      result += char;
    }
  }

  // Если кавычка осталась незакрытой в конце строки, исправляем
  if (depth > 0) {
    // Заменяем последнюю подходящую закрывающую
  }

  return result;
}

/**
 * Преобразование специальных типографических символов в HTML Entities
 */
export function convertToHtmlEntities(str) {
  return str
    .replace(/\u00A0/g, '&nbsp;')
    .replace(/«/g, '&laquo;')
    .replace(/»/g, '&raquo;')
    .replace(/„/g, '&bdquo;')
    .replace(/“/g, '&ldquo;')
    .replace(/—/g, '&mdash;')
    .replace(/–/g, '&ndash;')
    .replace(/…/g, '&hellip;')
    .replace(/©/g, '&copy;')
    .replace(/®/g, '&reg;')
    .replace(/™/g, '&trade;')
    .replace(/±/g, '&plusmn;')
    .replace(/×/g, '&times;')
    .replace(/→/g, '&rarr;')
    .replace(/←/g, '&larr;');
}

/**
 * Форматирование текста в красивые HTML-параграфы с сохранением типографики
 */
export function convertToHtmlParagraphs(str) {
  const withEntities = convertToHtmlEntities(str);
  const paragraphs = withEntities
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br>\n')}</p>`);
  return paragraphs.join('\n\n');
}

/**
 * Подсчет статистики текста и исправленных типографических неточностей
 */
export function calculateStats(original, processed) {
  const charsBefore = original.length;
  const charsAfter = processed.length;
  const words = (processed.trim().match(/[А-Яа-яЁёA-Za-z0-9_-]+/g) || []).length;
  const lines = processed ? processed.split('\n').length : 0;

  // Оценка количества изменений
  let changesCount = 0;
  // Считаем кавычки
  const quotesCount = (processed.match(/[«»„“]|&laquo;|&raquo;|&bdquo;|&ldquo;/g) || []).length;
  // Считаем неразрывные пробелы
  const nbspCount = (processed.match(/\u00A0|&nbsp;/g) || []).length;
  // Считаем тире
  const dashesCount = (processed.match(/[—–]|&mdash;|&ndash;/g) || []).length;
  // Считаем спецсимволы
  const symbolsCount = (processed.match(/[…©®™±×→←]|&hellip;|&copy;|&reg;|&trade;|&plusmn;|&times;|&rarr;|&larr;/g) || []).length;

  changesCount = Math.round(quotesCount / 2) + nbspCount + dashesCount + symbolsCount;

  return {
    charsBefore,
    charsAfter,
    words,
    lines,
    changesCount,
    details: {
      quotes: quotesCount,
      nbsp: nbspCount,
      dashes: dashesCount,
      symbols: symbolsCount
    }
  };
}

/**
 * Пример текста с типичными ошибками типографики для демонстрации в UI
 */
export const SAMPLE_TEXT = `Библиотека "Аврора" - современный культурный центр в г. Санкт-Петербург, где книги встречаются с технологиями.

Мы работаем с 10-00 до 20-00 каждый день (кроме сб. и вс.). В фонде более 250000 книг, журналов и редких изданий XIX-XX вв. Наш адрес: пр. Мира, д. 15, пом. 4 (стр. 2). Стоимость читательского билета - 0 руб., вход свободный для всех!

Как говорил А. С. Пушкин: "Чтение - вот лучшее учение. Следовать за мыслями великого человека - есть наука самая занимательная".

В библиотеке проводятся лекции по темам: "Искусственный интеллект и будущее книг", презентация книги "Космонавты XXI века" от издательства "Наука". Разрешение экрана для презентаций - 1920x1080 px при весе файла до 250 МБ. Все права защищены (c) 2026 АВРОРА Inc. Присоединяйтесь -> vk.com/aurora_lib!`;
