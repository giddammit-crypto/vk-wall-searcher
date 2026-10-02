/**
 * AURORA DESIGN — доступность (п. P2-3 плана аудита от 2026-10-02).
 *
 * Симптом аудита: 358 <button>, из них только 21 с aria-label → экранному
 * ридеру нечего озвучивать; фокус после Tab теряется.
 *
 * Решение — автоматическое расширение разметки вместо ручной правки 350 кнопок
 * в HTML на 208 КБ (риск рассинхрона id выше, чем польза):
 *   1. aria-label из title / data-tooltip для кнопок без видимого текста;
 *   2. aria-pressed для кнопок-переключателей (синхронно с классом .is-active,
 *      которым редактор уже управляет) через MutationObserver;
 *   3. role="dialog" + aria-modal + ловушка фокуса для .modal-overlay.
 *
 * Скрипт аддитивен: существующие id, классы и обработчики не меняются,
 * поэтому на поведение редактора не влияет (см. tests/a11y.test.mjs).
 */
(function (global) {
  'use strict';

  const SELECTOR_BUTTON = 'button, [role="button"], a[class*="btn"]';
  const SELECTOR_OVERLAY = '.modal-overlay';
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Видимый текст элемента без пробелов — по нему решаем, нужен ли aria-label. */
  function visibleText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /** Кнопка «только иконка»: ни текста, ни собственного aria-label/aria-labelledby. */
  function isIconOnly(el) {
    if (el.getAttribute('aria-label')) return false;
    if (el.getAttribute('aria-labelledby')) return false;
    return visibleText(el) === '';
  }

  /**
   * Проставляет aria-label из title/data-tooltip.
   * @returns {number} сколько элементов расширено
   */
  function enhanceLabels(root) {
    const scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    let fixed = 0;
    const nodes = scope.querySelectorAll(SELECTOR_BUTTON);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!isIconOnly(el)) continue;
      const label = el.getAttribute('title') || el.getAttribute('data-tooltip') || '';
      if (!label) continue;
      el.setAttribute('aria-label', label.trim());
      fixed++;
    }
    return fixed;
  }

  /**
   * Переключатели редактора живут по классу .is-active (syncToggle в editor.js).
   * Даём им aria-pressed, чтобы состояние было слышно скринридеру.
   * @returns {number} сколько кнопок помечено как переключатели
   */
  function enhancePressed(root) {
    const scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    let marked = 0;
    const nodes = scope.querySelectorAll('button.hbtn, button.tool-btn, [data-toggle]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.hasAttribute('aria-pressed')) continue;
      el.setAttribute('aria-pressed', el.classList.contains('is-active') ? 'true' : 'false');
      marked++;
    }
    return marked;
  }

  /** Синхронизирует aria-pressed с .is-active для одного элемента. */
  function syncPressed(el) {
    if (!el || typeof el.hasAttribute !== 'function') return;
    if (!el.hasAttribute('aria-pressed')) return;
    el.setAttribute('aria-pressed', el.classList.contains('is-active') ? 'true' : 'false');
  }

  /** Открыт ли оверлей (редактор скрывает модалки классом hidden). Всегда boolean. */
  function isOpen(el) {
    if (!el || typeof el.classList !== 'object') return false;
    return !el.classList.contains('hidden') && el.getAttribute('aria-hidden') !== 'true';
  }

  /**
   * Даёт оверлею семантику диалога.
   * @returns {number}
   */
  function enhanceDialogs(root) {
    const scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    let marked = 0;
    const nodes = scope.querySelectorAll(SELECTOR_OVERLAY);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!el.getAttribute('role')) el.setAttribute('role', 'dialog');
      if (!el.hasAttribute('aria-modal')) el.setAttribute('aria-modal', 'true');
      marked++;
    }
    return marked;
  }

  /**
   * Ловушка фокуса: Tab внутри открытого диалога не уходит на страницу позади.
   * Чистая функция-выбор следующего элемента — тестируется без браузера.
   */
  function nextFocusable(focusables, current, shiftKey) {
    if (!focusables || focusables.length === 0) return null;
    const idx = focusables.indexOf(current);
    if (idx === -1) return shiftKey ? focusables[focusables.length - 1] : focusables[0];
    const delta = shiftKey ? -1 : 1;
    const next = (idx + delta + focusables.length) % focusables.length;
    return focusables[next];
  }

  /**
   * Автозапуск: DOMContentLoaded + наблюдение за поздними классами/узлами.
   * Не выполняется вне браузера (Node) — тогда модуль просто экспортирует функции.
   */
  function bootstrap() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

    const run = () => {
      enhanceLabels(document);
      enhancePressed(document);
      enhanceDialogs(document);

      // Кнопки-переключатели меняют .is-active постоянно (syncToggle), а новые
      // тулбары создаются на лету — поэтому наблюдаем за document целиком.
      const mo = new MutationObserver((records) => {
        for (const rec of records) {
          if (rec.type === 'attributes') {
            if (rec.attributeName === 'class') syncPressed(rec.target);
            continue;
          }
          for (const node of rec.addedNodes) {
            if (node.nodeType === 1) {
              enhanceLabels(node);
              enhancePressed(node);
              enhanceDialogs(node);
            }
          }
        }
      });
      mo.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true,
      });

      // Ловушка фокуса
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const overlays = document.querySelectorAll(SELECTOR_OVERLAY);
        let active = null;
        for (let i = 0; i < overlays.length; i++) {
          if (isOpen(overlays[i])) active = overlays[i];
        }
        if (!active) return;
        const items = Array.prototype.slice.call(active.querySelectorAll(FOCUSABLE))
          .filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const next = nextFocusable(items, document.activeElement, e.shiftKey);
        if (next && next !== document.activeElement) {
          e.preventDefault();
          next.focus();
        }
      }, true);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  const api = {
    enhanceLabels,
    enhancePressed,
    enhanceDialogs,
    syncPressed,
    isIconOnly,
    isOpen,
    nextFocusable,
    SELECTOR_BUTTON,
    SELECTOR_OVERLAY,
    FOCUSABLE,
  };

  if (global) global.AuroraA11y = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // для unit-тестов

  bootstrap();
})(typeof window !== 'undefined' ? window : globalThis);
