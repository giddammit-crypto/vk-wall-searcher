/**
 * Тесты a11y.js (п. P2-3 плана аудита).
 *
 * a11y.js написан так, что вся логика принимает явный `root` с методом
 * querySelectorAll — поэтому функции тестируются в Node на заглушке DOM
 * без браузера: тест подаёт список узлов, который вернул бы реальный DOM,
 * и проверяет решения функции (что помечено, что пропущено).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));

// ── Заглушка элемента ─────────────────────────────────────────────────────
function el({ tag = 'button', text = '', attrs = {}, classes = [] } = {}) {
  const a = new Map(Object.entries(attrs));
  const cls = new Set(classes);
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    textContent: text,
    classList: {
      contains: (c) => cls.has(c),
      add: (c) => cls.add(c),
      remove: (c) => cls.delete(c),
    },
    getAttribute: (n) => (a.has(n) ? a.get(n) : null),
    setAttribute: (n, v) => a.set(n, String(v)),
    hasAttribute: (n) => a.has(n),
    _attrs: a,
  };
}

/**
 * a11y.js — классический браузерный скрипт (UMD-обёртка, кладёт api в window).
 * package.json содержит "type": "module", поэтому require() трактует .js как ESM
 * и module.exports там не определён; исполняем файл в песочнице vm, что ближе
 * к реальному поведению в браузере.
 */
function loadA11y() {
  const src = readFileSync(join(here, '..', 'a11y.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'a11y.js' });
  assert.ok(sandbox.window.AuroraA11y, 'a11y.js должен публиковать window.AuroraA11y');
  return sandbox.window.AuroraA11y;
}

const rootWith = (nodes) => ({ querySelectorAll: () => nodes });

// ── enhanceLabels: aria-label из title ────────────────────────────────────
test('enhanceLabels ставит aria-label из title для кнопок-иконок', () => {
  const a11y = loadA11y();
  const withTitle = el({ attrs: { title: 'Выровнять по левому краю' } });
  const withTooltip = el({ attrs: { 'data-tooltip': 'Дублировать' } });
  const withText = el({ text: 'Экспорт', attrs: { title: 'Экспорт PNG' } });
  const withoutAnything = el({});
  const alreadyLabelled = el({ attrs: { 'aria-label': 'Уже подписана', title: 'Другое' } });

  const fixed = a11y.enhanceLabels(rootWith([withTitle, withTooltip, withText, withoutAnything, alreadyLabelled]));

  assert.equal(withTitle.getAttribute('aria-label'), 'Выровнять по левому краю');
  assert.equal(withTooltip.getAttribute('aria-label'), 'Дублировать');
  assert.equal(withText.hasAttribute('aria-label'), false, 'кнопка с видимым текстом не переопределяется');
  assert.equal(withoutAnything.hasAttribute('aria-label'), false, 'без title нечего подставлять');
  assert.equal(alreadyLabelled.getAttribute('aria-label'), 'Уже подписана', 'существующий aria-label не затирается');
  assert.equal(fixed, 2);
});

test('enhanceLabels обрезает пробелы и переживает пустой title', () => {
  const a11y = loadA11y();
  const b = el({ attrs: { title: '  Слои  ' } });
  const empty = el({ attrs: { title: '' } });
  assert.equal(a11y.enhanceLabels(rootWith([b, empty])), 1);
  assert.equal(b.getAttribute('aria-label'), 'Слои');
  assert.equal(empty.hasAttribute('aria-label'), false);
});

// ── enhancePressed / syncPressed ──────────────────────────────────────────
test('enhancePressed проставляет aria-pressed по текущему .is-active', () => {
  const a11y = loadA11y();
  const active = el({ classes: ['hbtn', 'is-active'] });
  const inactive = el({ classes: ['tool-btn'] });
  const manual = el({ attrs: { 'aria-pressed': 'mixed' } });

  const marked = a11y.enhancePressed(rootWith([active, inactive, manual]));

  assert.equal(active.getAttribute('aria-pressed'), 'true');
  assert.equal(inactive.getAttribute('aria-pressed'), 'false');
  assert.equal(manual.getAttribute('aria-pressed'), 'mixed', 'ручное значение не перезаписывается');
  assert.equal(marked, 2);
});

test('syncPressed отражает переключение класса (путь MutationObserver)', () => {
  const a11y = loadA11y();
  const b = el({ classes: ['hbtn'] });
  a11y.enhancePressed(rootWith([b]));
  assert.equal(b.getAttribute('aria-pressed'), 'false');

  b.classList.add('is-active');
  a11y.syncPressed(b);
  assert.equal(b.getAttribute('aria-pressed'), 'true');

  b.classList.remove('is-active');
  a11y.syncPressed(b);
  assert.equal(b.getAttribute('aria-pressed'), 'false');
});

test('syncPressed не создаёт aria-pressed там, где его не было', () => {
  const a11y = loadA11y();
  const b = el({ classes: ['is-active'] });
  a11y.syncPressed(b);
  assert.equal(b.hasAttribute('aria-pressed'), false);
});

// ── Диалоги ───────────────────────────────────────────────────────────────
test('enhanceDialogs добавляет role=dialog и aria-modal, не затирая своё', () => {
  const a11y = loadA11y();
  const plain = el({ tag: 'div', classes: ['modal-overlay', 'hidden'] });
  const custom = el({ tag: 'div', attrs: { role: 'alertdialog', 'aria-modal': 'false' } });

  const marked = a11y.enhanceDialogs(rootWith([plain, custom]));

  assert.equal(plain.getAttribute('role'), 'dialog');
  assert.equal(plain.getAttribute('aria-modal'), 'true');
  assert.equal(custom.getAttribute('role'), 'alertdialog');
  assert.equal(custom.getAttribute('aria-modal'), 'false');
  assert.equal(marked, 2);
});

test('isOpen считает закрытым оверлей с классом hidden или aria-hidden', () => {
  const a11y = loadA11y();
  assert.equal(a11y.isOpen(el({ classes: ['modal-overlay', 'hidden'] })), false);
  assert.equal(a11y.isOpen(el({ classes: ['modal-overlay'], attrs: { 'aria-hidden': 'true' } })), false);
  assert.equal(a11y.isOpen(el({ classes: ['modal-overlay'] })), true);
  assert.equal(a11y.isOpen(null), false);
});

// ── Ловушка фокуса ────────────────────────────────────────────────────────
test('nextFocusable циклически обходит список в обе стороны', () => {
  const a11y = loadA11y();
  const [a, b, c] = [el(), el(), el()];
  const list = [a, b, c];

  assert.equal(a11y.nextFocusable(list, a, false), b);
  assert.equal(a11y.nextFocusable(list, c, false), a, 'с последнего — на первый');
  assert.equal(a11y.nextFocusable(list, a, true), c, 'с первого назад — на последний');
  assert.equal(a11y.nextFocusable(list, b, true), a);
});

test('nextFocusable не падает на пустом списке и на фокусе вне диалога', () => {
  const a11y = loadA11y();
  assert.equal(a11y.nextFocusable([], el(), false), null);
  assert.equal(a11y.nextFocusable(null, el(), false), null);
  const [a, b] = [el(), el()];
  assert.equal(a11y.nextFocusable([a, b], el(), false), a, 'чужой фокус — начинаем с первого');
  assert.equal(a11y.nextFocusable([a, b], el(), true), b, 'чужой фокус + Shift — с последнего');
});

// ── Контракт селекторов (защита от рассинхрона с CSS/HTML) ────────────────
test('селекторы a11y.js совпадают с фактической разметкой редактора', () => {
  const a11y = loadA11y();
  assert.ok(a11y.SELECTOR_BUTTON.includes('button'));
  assert.ok(a11y.SELECTOR_OVERLAY.includes('modal-overlay'));
  assert.ok(a11y.FOCUSABLE.includes('[tabindex]'));
  assert.ok(a11y.FOCUSABLE.includes('input'), 'поля ввода должны попадать в ловушку фокуса');
});
