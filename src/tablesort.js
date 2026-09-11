/**
 * src/tablesort.js — Universal Interactive Table Sorter
 * ======================================================
 * Обеспечивает мгновенную сортировку по клику в заголовках (<th>)
 * для всех таблиц приложения: «Динамика по филиалам», «Рейтинг»,
 * «Хэштеги», «Реестр ссылок», «Перекрёстные публикации» и др.
 *
 * Разработка: Амброзиев О.А.
 */

const RU_MONTHS = {
    'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4,
    'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'сент': 8, 'окт': 9, 'ноя': 10, 'дек': 11
};

export function parseCellVal(cell) {
    if (!cell) return { type: 'empty', val: 0, raw: '' };
    const raw = (cell.dataset && cell.dataset.sortValue !== undefined ? cell.dataset.sortValue : (cell.textContent || '')).trim();
    if (!raw || raw === '—' || raw === '-' || raw === 'база') {
        return { type: 'empty', val: 0, raw: '' };
    }

    // Проценты: "75%", "0.52%"
    if (/^[+-]?\d+(?:[.,]\d+)?\s*%$/.test(raw)) {
        const num = parseFloat(raw.replace(/\s+/g, '').replace(',', '.').replace('%', ''));
        return { type: 'num', val: isNaN(num) ? 0 : num, raw };
    }

    // Числа с разделителями (пробелы, узкие пробелы, запятые, знаки +/-): "1 114", "+6", "−5", "±0"
    const cleanedNum = raw.replace(/[\s\u00A0\u202F]+/g, '').replace(/−/g, '-').replace(/±0/, '0').replace(',', '.');
    if (/^[+-]?\d+(?:\.\d+)?$/.test(cleanedNum)) {
        const num = parseFloat(cleanedNum);
        return { type: 'num', val: isNaN(num) ? 0 : num, raw };
    }

    // Дата формата "11 сент. 2026 г." или "11 сен 2026"
    const ruDateMatch = /^(\d{1,2})\s+([а-яё]+)[.,]?\s+(\d{4})/i.exec(raw);
    if (ruDateMatch) {
        const d = parseInt(ruDateMatch[1], 10);
        const mKey = ruDateMatch[2].slice(0, 3).toLowerCase();
        const m = RU_MONTHS[mKey] !== undefined ? RU_MONTHS[mKey] : 0;
        const y = parseInt(ruDateMatch[3], 10);
        return { type: 'date', val: new Date(y, m, d).getTime(), raw };
    }

    // Дата формата "11.09.2026" или "2026-09-11"
    const dotDateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(raw);
    if (dotDateMatch) {
        const d = parseInt(dotDateMatch[1], 10);
        const m = parseInt(dotDateMatch[2], 10) - 1;
        const y = parseInt(dotDateMatch[3], 10);
        return { type: 'date', val: new Date(y, m, d).getTime(), raw };
    }
    const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (isoDateMatch) {
        return { type: 'date', val: Date.parse(raw) || 0, raw };
    }

    return { type: 'str', val: raw.toLowerCase(), raw };
}

export function sortTableByColumn(table, th, forcedDir = null) {
    if (!table || !th) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length <= 1) return;

    const tr = th.parentElement;
    const colIndex = Array.from(tr.children).indexOf(th);
    if (colIndex < 0) return;

    // Определяем направление
    let dir = forcedDir;
    if (!dir) {
        if (th.classList.contains('th-sort-asc')) {
            dir = 'desc';
        } else if (th.classList.contains('th-sort-desc')) {
            dir = 'asc';
        } else {
            // По умолчанию числа/даты сортируем desc (от большего к меньшему), текст — asc
            const firstCell = rows[0].children[colIndex];
            const sampleVal = parseCellVal(firstCell);
            dir = (sampleVal.type === 'num' || sampleVal.type === 'date') ? 'desc' : 'asc';
        }
    }

    // Сбрасываем индикаторы со всех th в этой строке заголовка
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
        const cellA = rowA.children[colIndex];
        const cellB = rowB.children[colIndex];
        const a = parseCellVal(cellA);
        const b = parseCellVal(cellB);

        if (a.type === 'empty' && b.type === 'empty') return 0;
        if (a.type === 'empty') return 1;
        if (b.type === 'empty') return -1;

        if ((a.type === 'num' || a.type === 'date') && (b.type === 'num' || b.type === 'date')) {
            return (a.val - b.val) * factor;
        }
        return String(a.val).localeCompare(String(b.val), 'ru', { numeric: true, sensitivity: 'base' }) * factor;
    });

    // Переставляем отсортированные строки
    const fragment = document.createDocumentFragment();
    rows.forEach(r => fragment.appendChild(r));
    tbody.appendChild(fragment);

    // Если первая колонка — это порядковый номер №, пересчитываем её
    const th0 = tr.children[0];
    if (th0 && (th0.textContent.trim() === '№' || th0.textContent.trim() === '#') && colIndex !== 0) {
        rows.forEach((r, idx) => {
            const c0 = r.children[0];
            if (c0 && /^\d+$/.test(c0.textContent.trim())) {
                c0.textContent = String(idx + 1);
            }
        });
    }
}

/**
 * Инициализация делегированного обработчика клика по заголовкам таблиц.
 * Работает для ВСЕХ существующих и динамически добавляемых таблиц.
 */
export function initTableSorting() {
    if (window._auroraTableSortingInit) return;
    window._auroraTableSortingInit = true;

    // Делегированный клик
    document.addEventListener('click', (e) => {
        const th = e.target.closest('th');
        if (!th) return;
        const table = th.closest('table');
        if (!table) return;

        // Не сортируем по колонкам действий или колонкам с data-no-sort
        if (th.dataset.noSort !== undefined || th.classList.contains('no-sort')) return;
        const title = th.textContent.trim();
        if (title === 'Действие' || title === 'Действия' || title === 'Ссылка' || title === 'Пост') return;

        sortTableByColumn(table, th);
    });

    // Добавляем класс th-sortable ко всем заголовкам при наведении
    document.addEventListener('mouseover', (e) => {
        const th = e.target.closest('th');
        if (!th) return;
        if (th.dataset.noSort !== undefined || th.classList.contains('no-sort')) return;
        const title = th.textContent.trim();
        if (title === 'Действие' || title === 'Действия' || title === 'Ссылка' || title === 'Пост') return;

        if (!th.classList.contains('th-sortable')) {
            th.classList.add('th-sortable');
            if (!th.title) th.title = 'Нажмите для сортировки';
        }
    });
}
