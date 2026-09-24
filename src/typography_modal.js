/**
 * src/typography_modal.js — Модальное окно «Инструменты для текста: Типограф» для AURORA
 * =============================================================================
 * Полнофункциональный интерфейс очистки типографики:
 *  • Двухпанельный адаптивный редактор (Исходный текст / Результат)
 *  • Мгновенная типографика на лету (Realtime) и по кнопке
 *  • Выбор формата: Unicode, HTML Entities (&laquo; &mdash; &nbsp;), HTML-абзацы, Markdown
 *  • Детальная статистика символов, слов, строк и количества исправлений
 *  • Переключатели правил (кавычки, тире, неразрывные пробелы, спецсимволы, удаление мусора)
 *  • Подсветка неразрывных пробелов
 *  • Копирование в буфер обмена в 1 клик, вставка примера текста, очистка и обмен панелей
 * =============================================================================
 */

import {
  cleanTypography,
  DEFAULT_TYPO_OPTIONS,
  SAMPLE_TEXT,
  calculateStats
} from './typography.js?v=4.75.3';

let modalOverlayEl = null;
let sourceTextareaEl = null;
let resultTextareaEl = null;
let currentOptions = { ...DEFAULT_TYPO_OPTIONS, realtime: true };

/**
 * Создание HTML-разметки модального окна
 */
export function getTypographyModalHtml() {
  return `
  <div class="typo-dialog" role="document">
    <!-- Шапка -->
    <header class="typo-header">
      <div class="typo-header-left">
        <div class="typo-cosmo-avatar" title="Космо — типограф и редактор">
          <img src="assets/images/mascot/robot_idea.png?v=4.63.0" alt="Космо" class="typo-cosmo-img" />
        </div>
        <div class="typo-title-block">
          <div class="typo-title-row">
            <h2 id="typo-modal-title" class="typo-title">Инструменты для текста: Типограф</h2>
            <span class="typo-badge">
              <span class="typo-badge-dot"></span>
              AURORA TYPOGRAPHY
            </span>
          </div>
          <p class="typo-subtitle">
            Профессиональная очистка типографики: замена дефисов на тире, кавычки-ёлочки, неразрывные пробелы и спецсимволы
          </p>
        </div>
      </div>
      <div class="typo-header-right">
        <button type="button" class="typo-icon-btn" id="typo-btn-close" data-typo-close title="Закрыть окно (Esc)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </header>

    <!-- Панель быстрых действий и пресетов -->
    <div class="typo-toolbar">
      <div class="typo-toolbar-left">
        <button type="button" class="typo-btn typo-btn-primary" id="typo-btn-process" title="Оттипографить текст">
          <span class="material-symbols-outlined">auto_fix_high</span>
          <span>Оттипографить</span>
        </button>
        <button type="button" class="typo-btn typo-btn-success" id="typo-btn-copy" title="Скопировать готовый текст в буфер">
          <span class="material-symbols-outlined">content_copy</span>
          <span>Скопировать</span>
        </button>
        <button type="button" class="typo-btn typo-btn-subtle" id="typo-btn-sample" title="Вставить пример текста с типичными ошибками">
          <span class="material-symbols-outlined">notes</span>
          <span>Пример текста</span>
        </button>
        <button type="button" class="typo-btn typo-btn-subtle" id="typo-btn-swap" title="Поменять местами исходный текст и результат">
          <span class="material-symbols-outlined">swap_horiz</span>
          <span class="hide-mobile">Обмен</span>
        </button>
        <button type="button" class="typo-btn typo-btn-danger" id="typo-btn-clear" title="Очистить поля">
          <span class="material-symbols-outlined">delete_sweep</span>
          <span class="hide-mobile">Очистить</span>
        </button>
      </div>

      <div class="typo-toolbar-right">
        <!-- Селектор формата вывода -->
        <div class="typo-format-picker" title="Формат вывода">
          <label for="typo-select-format" class="typo-format-label">
            <span class="material-symbols-outlined" style="font-size:16px;">code</span> Формат:
          </label>
          <select id="typo-select-format" class="typo-select">
            <option value="unicode" selected>Текст (Unicode)</option>
            <option value="html-entities">HTML сущности (&amp;laquo; &amp;mdash;)</option>
            <option value="html-p">HTML код (&lt;p&gt; абзацы)</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>

        <button type="button" class="typo-btn typo-btn-toggle" id="typo-btn-toggle-options" title="Настройки правил типографики">
          <span class="material-symbols-outlined">tune</span>
          <span class="hide-mobile">Настройки</span>
        </button>
      </div>
    </div>

    <!-- Выпадающая / сворачиваемая панель настроек правил -->
    <div class="typo-options-drawer" id="typo-options-drawer">
      <div class="typo-options-grid">
        <label class="typo-checkbox-item" title="Заменять прямые кавычки на русские «ёлочки» и вложенные „лапки“">
          <input type="checkbox" id="opt-quotes" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Кавычки «ёлочки» и „лапки“</span>
        </label>

        <label class="typo-checkbox-item" title="Заменять дефисы на длинные тире (—) между словами и короткие (–) в датах">
          <input type="checkbox" id="opt-dashes" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Тире (—) и числовые диапазоны (–)</span>
        </label>

        <label class="typo-checkbox-item" title="Привязывать неразрывным пробелом 1-3 буквенные предлоги и союзы">
          <input type="checkbox" id="opt-nbsp-prep" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Неразрывные пробелы после предлогов</span>
        </label>

        <label class="typo-checkbox-item" title="Неразрывные пробелы перед частицами (бы, ли, же) и перед длинным тире">
          <input type="checkbox" id="opt-nbsp-part" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Пробелы перед частицами (бы, ли, же) и тире</span>
        </label>

        <label class="typo-checkbox-item" title="Связывать неразрывным пробелом инициалы с фамилией и числа с единицами">
          <input type="checkbox" id="opt-nbsp-units" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Инициалы (А. С. Пушкин) и единицы (10 кг, 2026 г.)</span>
        </label>

        <label class="typo-checkbox-item" title="Замена знаков: ... на …, (c) на ©, (r) на ®, +- на ±, 1920x1080 на 1920×1080">
          <input type="checkbox" id="opt-symbols" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Спецсимволы (©, ®, ™, ±, ×, …, →)</span>
        </label>

        <label class="typo-checkbox-item" title="Убирать пробелы перед запятыми и двоеточиями, добавлять после">
          <input type="checkbox" id="opt-punctuation" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Нормализация пунктуации (, . ! ? : ;)</span>
        </label>

        <label class="typo-checkbox-item" title="Удалять лишние повторяющиеся пробелы и пустые хвосты строк">
          <input type="checkbox" id="opt-clean-spaces" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Удалять двойные пробелы</span>
        </label>

        <label class="typo-checkbox-item" title="Отображать неразрывные пробелы видимой точкой (·)">
          <input type="checkbox" id="opt-highlight-nbsp">
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Подсветка неразрывных пробелов (·)</span>
        </label>

        <label class="typo-checkbox-item" title="Автоматически типографить при вводе текста">
          <input type="checkbox" id="opt-realtime" checked>
          <span class="typo-checkbox-box"></span>
          <span class="typo-checkbox-text">Типографика на лету (в реальном времени)</span>
        </label>
      </div>
    </div>

    <!-- Мобильные переключатели панелей -->
    <div class="typo-mobile-tabs" role="tablist">
      <button type="button" class="typo-mobile-tab-btn active" data-pane="source">Исходный текст</button>
      <button type="button" class="typo-mobile-tab-btn" data-pane="result">Результат</button>
    </div>

    <!-- Двухпанельная рабочая область -->
    <div class="typo-body-grid">
      <!-- Левая панель: Исходный текст -->
      <section class="typo-pane typo-pane-source is-active" id="typo-pane-source">
        <div class="typo-pane-header">
          <div class="typo-pane-title">
            <span class="material-symbols-outlined">edit_document</span>
            <span>Исходный текст</span>
          </div>
          <div class="typo-pane-actions">
            <button type="button" class="typo-pane-action-btn" id="typo-btn-paste" title="Вставить из буфера обмена">
              <span class="material-symbols-outlined">content_paste</span>
              <span class="hide-mobile">Вставить</span>
            </button>
          </div>
        </div>

        <div class="typo-textarea-wrap">
          <textarea
            id="typo-source-input"
            class="typo-textarea"
            placeholder="Вставьте или напечатайте текст для типографики сюда... (например: Библиотека \"Аврора\" - лучший проект в г. Москва с 10-00 до 20-00...)"
            spellcheck="false"
          ></textarea>
        </div>

        <div class="typo-pane-footer">
          <div class="typo-stats" id="typo-stats-source">
            <span>Знаков: <b id="stat-src-chars">0</b></span>
            <span>Без пробелов: <b id="stat-src-nospace">0</b></span>
            <span>Слов: <b id="stat-src-words">0</b></span>
            <span>Строк: <b id="stat-src-lines">0</b></span>
          </div>
        </div>
      </section>

      <!-- Разделитель с кнопкой мгновенного применения -->
      <div class="typo-divider-bar">
        <button type="button" class="typo-arrow-process-btn" id="typo-btn-mid-process" title="Оттипографить (Ctrl+Enter)">
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      <!-- Правая панель: Результат -->
      <section class="typo-pane typo-pane-result" id="typo-pane-result">
        <div class="typo-pane-header">
          <div class="typo-pane-title">
            <span class="material-symbols-outlined">verified</span>
            <span>Результат очистки</span>
          </div>
          <div class="typo-pane-actions">
            <span class="typo-changes-badge hidden" id="typo-changes-badge">0 замен</span>
            <button type="button" class="typo-pane-action-btn typo-copy-inline-btn" id="typo-btn-copy-pane" title="Скопировать результат">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Копировать</span>
            </button>
          </div>
        </div>

        <div class="typo-textarea-wrap">
          <textarea
            id="typo-result-output"
            class="typo-textarea typo-result-textarea"
            placeholder="Здесь появится готовый оттипографированный текст..."
            readonly
            spellcheck="false"
          ></textarea>
        </div>

        <div class="typo-pane-footer">
          <div class="typo-stats" id="typo-stats-result">
            <span>Знаков: <b id="stat-res-chars">0</b></span>
            <span>Без пробелов: <b id="stat-res-nospace">0</b></span>
            <span>Слов: <b id="stat-res-words">0</b></span>
            <span class="typo-fixes-label" id="typo-fixes-summary"></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Подвал модального окна -->
    <footer class="typo-footer">
      <div class="typo-footer-hints">
        <span class="typo-hint-item"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> — Оттипографить</span>
        <span class="typo-hint-item"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> — Скопировать результат</span>
        <span class="typo-hint-item"><kbd>Esc</kbd> — Закрыть</span>
      </div>
      <div class="typo-footer-branding">
        <span>АВРОРА Типограф &bull; Версия 1.0</span>
      </div>
    </footer>
  </div>
  `;
}

/**
 * Инициализация модального окна Типографа
 */
export function initTypographyModal() {
  modalOverlayEl = document.getElementById('typography-modal');
  if (!modalOverlayEl) {
    console.warn('[Typography] #typography-modal container not found in DOM');
    return;
  }

  // Заполняем разметку
  modalOverlayEl.innerHTML = getTypographyModalHtml();

  sourceTextareaEl = modalOverlayEl.querySelector('#typo-source-input');
  resultTextareaEl = modalOverlayEl.querySelector('#typo-result-output');

  bindEvents();
}

/**
 * Привязка событий элементов управления
 */
function bindEvents() {
  if (!modalOverlayEl) return;

  // Закрытие
  modalOverlayEl.querySelectorAll('[data-typo-close]').forEach(btn => {
    btn.addEventListener('click', closeTypographyModal);
  });

  // Клик по подложке вне диалога
  modalOverlayEl.addEventListener('click', e => {
    if (e.target === modalOverlayEl) {
      closeTypographyModal();
    }
  });

  // Основная кнопка "Оттипографить"
  modalOverlayEl.querySelector('#typo-btn-process')?.addEventListener('click', runTypo);
  modalOverlayEl.querySelector('#typo-btn-mid-process')?.addEventListener('click', runTypo);

  // Кнопка "Скопировать"
  modalOverlayEl.querySelector('#typo-btn-copy')?.addEventListener('click', copyResult);
  modalOverlayEl.querySelector('#typo-btn-copy-pane')?.addEventListener('click', copyResult);

  // Кнопка "Пример текста"
  modalOverlayEl.querySelector('#typo-btn-sample')?.addEventListener('click', () => {
    if (sourceTextareaEl) {
      sourceTextareaEl.value = SAMPLE_TEXT;
      runTypo();
      showTypoToast('Пример текста с ошибками загружен', 'notes');
    }
  });

  // Кнопка "Вставить"
  modalOverlayEl.querySelector('#typo-btn-paste')?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && sourceTextareaEl) {
          sourceTextareaEl.value = text;
          runTypo();
          showTypoToast('Текст вставлен из буфера', 'content_paste');
        }
      } else {
        sourceTextareaEl?.focus();
        showTypoToast('Нажмите Ctrl+V для вставки текста', 'info');
      }
    } catch (e) {
      sourceTextareaEl?.focus();
      showTypoToast('Нажмите Ctrl+V для вставки', 'info');
    }
  });

  // Кнопка "Обмен" (Swap)
  modalOverlayEl.querySelector('#typo-btn-swap')?.addEventListener('click', () => {
    if (!sourceTextareaEl || !resultTextareaEl) return;
    const res = resultTextareaEl.value;
    if (res) {
      sourceTextareaEl.value = res;
      runTypo();
      showTypoToast('Текст из результата перемещен в исходный', 'swap_horiz');
    }
  });

  // Кнопка "Очистить"
  modalOverlayEl.querySelector('#typo-btn-clear')?.addEventListener('click', () => {
    if (sourceTextareaEl) sourceTextareaEl.value = '';
    if (resultTextareaEl) resultTextareaEl.value = '';
    updateStats('', '');
    showTypoToast('Поля очищены', 'delete_sweep');
  });

  // Селектор формата вывода
  modalOverlayEl.querySelector('#typo-select-format')?.addEventListener('change', e => {
    currentOptions.format = e.target.value;
    runTypo();
  });

  // Переключение видимости панели настроек
  const toggleBtn = modalOverlayEl.querySelector('#typo-btn-toggle-options');
  const drawer = modalOverlayEl.querySelector('#typo-options-drawer');
  toggleBtn?.addEventListener('click', () => {
    drawer?.classList.toggle('is-open');
    toggleBtn.classList.toggle('is-active', drawer?.classList.contains('is-open'));
  });

  // Чекбоксы правил
  bindOptionCheckbox('#opt-quotes', 'quotes');
  bindOptionCheckbox('#opt-dashes', 'dashes');
  bindOptionCheckbox('#opt-nbsp-prep', 'nbspPrepositions');
  bindOptionCheckbox('#opt-nbsp-part', 'nbspParticles');
  bindOptionCheckbox('#opt-nbsp-units', 'nbspUnits');
  bindOptionCheckbox('#opt-symbols', 'symbols');
  bindOptionCheckbox('#opt-punctuation', 'punctuation');
  bindOptionCheckbox('#opt-clean-spaces', 'cleanSpaces');
  bindOptionCheckbox('#opt-highlight-nbsp', 'highlightNbsp');
  bindOptionCheckbox('#opt-realtime', 'realtime');

  // Ввод текста в исходное поле
  if (sourceTextareaEl) {
    sourceTextareaEl.addEventListener('input', () => {
      if (currentOptions.realtime) {
        runTypo();
      } else {
        updateSourceStatsOnly(sourceTextareaEl.value);
      }
    });

    // Горячие клавиши
    sourceTextareaEl.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runTypo();
      }
    });
  }

  // Мобильные табы
  modalOverlayEl.querySelectorAll('.typo-mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalOverlayEl.querySelectorAll('.typo-mobile-tab-btn').forEach(b => b.classList.remove('active'));
      modalOverlayEl.querySelectorAll('.typo-pane').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('active');
      const pane = modalOverlayEl.querySelector(`.typo-pane-${btn.dataset.pane}`);
      pane?.classList.add('is-active');
    });
  });

  // Глобальные горячие клавиши внутри модалки
  modalOverlayEl.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeTypographyModal();
    } else if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'С')) {
      e.preventDefault();
      copyResult();
    }
  });
}

function bindOptionCheckbox(selector, optionKey) {
  const cb = modalOverlayEl?.querySelector(selector);
  if (cb) {
    cb.addEventListener('change', e => {
      currentOptions[optionKey] = e.target.checked;
      runTypo();
    });
  }
}

/**
 * Запуск очистки типографики
 */
export function runTypo() {
  if (!sourceTextareaEl || !resultTextareaEl) return;
  const src = sourceTextareaEl.value;

  if (!src.trim()) {
    resultTextareaEl.value = '';
    updateStats('', '');
    return;
  }

  const { result, stats } = cleanTypography(src, currentOptions);
  resultTextareaEl.value = result;

  updateStats(src, result, stats);
}

/**
 * Обновление счетчиков статистики
 */
function updateStats(src, res, stats = null) {
  if (!stats) {
    stats = calculateStats(src, res);
  }

  // Исходная статистика
  const srcChars = modalOverlayEl?.querySelector('#stat-src-chars');
  const srcNoSpace = modalOverlayEl?.querySelector('#stat-src-nospace');
  const srcWords = modalOverlayEl?.querySelector('#stat-src-words');
  const srcLines = modalOverlayEl?.querySelector('#stat-src-lines');

  if (srcChars) srcChars.textContent = src.length;
  if (srcNoSpace) srcNoSpace.textContent = src.replace(/\s/g, '').length;
  if (srcWords) srcWords.textContent = (src.trim().match(/[А-Яа-яЁёA-Za-z0-9_-]+/g) || []).length;
  if (srcLines) srcLines.textContent = src ? src.split('\n').length : 0;

  // Статистика результата
  const resChars = modalOverlayEl?.querySelector('#stat-res-chars');
  const resNoSpace = modalOverlayEl?.querySelector('#stat-res-nospace');
  const resWords = modalOverlayEl?.querySelector('#stat-res-words');
  const changesBadge = modalOverlayEl?.querySelector('#typo-changes-badge');
  const fixesSummary = modalOverlayEl?.querySelector('#typo-fixes-summary');

  if (resChars) resChars.textContent = res.length;
  if (resNoSpace) resNoSpace.textContent = res.replace(/\s/g, '').length;
  if (resWords) resWords.textContent = stats.words;

  if (changesBadge) {
    if (stats.changesCount > 0) {
      changesBadge.classList.remove('hidden');
      changesBadge.textContent = `${stats.changesCount} замен`;
    } else {
      changesBadge.classList.add('hidden');
    }
  }

  if (fixesSummary && stats.details) {
    const parts = [];
    if (stats.details.quotes) parts.push(`Кавычек: ${stats.details.quotes}`);
    if (stats.details.nbsp) parts.push(`Неразрывных: ${stats.details.nbsp}`);
    if (stats.details.dashes) parts.push(`Тире: ${stats.details.dashes}`);
    if (stats.details.symbols) parts.push(`Символов: ${stats.details.symbols}`);

    fixesSummary.textContent = parts.length > 0 ? `✨ ${parts.join(' · ')}` : '';
  }
}

function updateSourceStatsOnly(src) {
  const srcChars = modalOverlayEl?.querySelector('#stat-src-chars');
  const srcNoSpace = modalOverlayEl?.querySelector('#stat-src-nospace');
  const srcWords = modalOverlayEl?.querySelector('#stat-src-words');
  const srcLines = modalOverlayEl?.querySelector('#stat-src-lines');

  if (srcChars) srcChars.textContent = src.length;
  if (srcNoSpace) srcNoSpace.textContent = src.replace(/\s/g, '').length;
  if (srcWords) srcWords.textContent = (src.trim().match(/[А-Яа-яЁёA-Za-z0-9_-]+/g) || []).length;
  if (srcLines) srcLines.textContent = src ? src.split('\n').length : 0;
}

/**
 * Копирование оттипографированного текста
 */
export async function copyResult() {
  if (!resultTextareaEl) return;
  const text = resultTextareaEl.value;
  if (!text) {
    showTypoToast('Нет текста для копирования', 'warning');
    return;
  }

  let success = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      success = true;
    } else {
      resultTextareaEl.select();
      success = document.execCommand('copy');
    }
  } catch (err) {
    resultTextareaEl.select();
    success = document.execCommand('copy');
  }

  if (success) {
    const copyBtns = modalOverlayEl?.querySelectorAll('#typo-btn-copy, #typo-btn-copy-pane');
    copyBtns?.forEach(b => {
      b.classList.add('is-copied');
      const icon = b.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'check';
      setTimeout(() => {
        b.classList.remove('is-copied');
        if (icon) icon.textContent = 'content_copy';
      }, 2000);
    });
    showTypoToast('Текст скопирован в буфер обмена!', 'check_circle');
  } else {
    showTypoToast('Не удалось скопировать текст', 'error');
  }
}

/**
 * Всплывающее уведомление внутри модального окна
 */
function showTypoToast(msg, icon = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, icon, 2600);
    return;
  }

  let toast = document.getElementById('typo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'typo-toast';
    toast.className = 'typo-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">${icon}</span><span>${msg}</span>`;
  toast.classList.add('is-visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2500);
}

/**
 * Открытие модального окна
 * @param {string} [initialText] Текст для первичного заполнения
 */
export function openTypographyModal(initialText = '') {
  if (!modalOverlayEl) {
    initTypographyModal();
  }
  if (!modalOverlayEl) return;

  modalOverlayEl.classList.remove('hidden');
  modalOverlayEl.classList.add('is-open');
  document.body.classList.add('typo-modal-open');

  if (initialText && sourceTextareaEl) {
    sourceTextareaEl.value = initialText;
    runTypo();
  } else if (sourceTextareaEl && !sourceTextareaEl.value) {
    sourceTextareaEl.value = SAMPLE_TEXT;
    runTypo();
  }

  setTimeout(() => {
    sourceTextareaEl?.focus();
  }, 100);
}

/**
 * Закрытие модального окна
 */
export function closeTypographyModal() {
  if (!modalOverlayEl) return;
  modalOverlayEl.classList.remove('is-open');
  modalOverlayEl.classList.add('hidden');
  document.body.classList.remove('typo-modal-open');
}
