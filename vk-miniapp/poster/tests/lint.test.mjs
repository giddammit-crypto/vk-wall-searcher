/**
 * Тест ESLint-конфига (п. P2-2 / класс дефектов P0-2 и P0-3).
 *
 * Смысл не в том, чтобы «просто прогнать линтер», а в том, чтобы доказать:
 *   1) текущий код чист по no-undef / no-dupe-keys (0 ошибок);
 *   2) конфиг РЕАЛЬНО ловит дефекты такого класса — иначе он ничего не защищает.
 * Пункт 2 проверяется прогоном заведомо сломанных фрагментов через lintText:
 * ровно те два бага, что нашлись при аудите (syncUI и дубль ключа), должны
 * падать, а легальная кросс-файловая ссылка — нет.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const POSTER = join(dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: POSTER });

const only = (messages, rule) => messages.filter((m) => m.ruleId === rule);

test('весь код постера проходит ESLint без ошибок', async () => {
  const results = await eslint.lintFiles('.');
  const errors = results.flatMap((r) => r.messages
    .filter((m) => m.severity === 2)
    .map((m) => `${r.filePath.split('/poster/').pop()}:${m.line} [${m.ruleId}] ${m.message}`));
  assert.deepEqual(errors, [], 'ошибки ESLint (severity=2)');
});

test('no-undef и no-dupe-keys чисты по всему проекту', async () => {
  const results = await eslint.lintFiles('.');
  const bad = results.flatMap((r) => r.messages
    .filter((m) => m.ruleId === 'no-undef' || m.ruleId === 'no-dupe-keys')
    .map((m) => `${r.filePath.split('/poster/').pop()}:${m.line} [${m.ruleId}] ${m.message}`));
  assert.deepEqual(bad, [], 'это ровно те правила, что ловят «пустой холст» из P0-2');
});

async function rulesOf(code) {
  const [r] = await eslint.lintText(code, { filePath: join(POSTER, 'probe.js') });
  return r.messages.map((m) => m.ruleId);
}

test('конфиг ловит вызов несуществующей функции (баг syncUI из P0-2)', async () => {
  const rules = await rulesOf('function f(){ syncUI(); }\n');
  assert.ok(rules.includes('no-undef'), `no-undef не сработал: ${rules.join(', ')}`);
});

test('конфиг ловит дубль ключа в объекте API (баг getActiveBrushKind из P0-2)', async () => {
  const rules = await rulesOf('const api = { getActiveBrushKind: () => 1, getActiveBrushKind: () => 2 };\n');
  assert.ok(rules.includes('no-dupe-keys'), `no-dupe-keys не сработал: ${rules.join(', ')}`);
});

test('конфиг ловит необъявленную переменную экспорта (P0-3)', async () => {
  const rules = await rulesOf('function g(){ return currentExportFormatX; }\n');
  assert.ok(rules.includes('no-undef'), `no-undef не сработал: ${rules.join(', ')}`);
});

test('легальные кросс-файловые глобалы не режутся (иначе правило бесполезно)', async () => {
  // onSelection объявлена в editor.js, CANVAS_PADDING — тоже; enhancer.js их использует
  const rules = await rulesOf('function h(){ onSelection(); return CANVAS_PADDING + currentSize; }\n');
  assert.deepEqual(rules.filter((r) => r === 'no-undef'), [],
    'кросс-файловые глобалы должны быть видны — см. eslint.globals.mjs');
});

test('eslint.globals.mjs актуален (перегенерация не меняет набор)', async () => {
  const { PROJECT_GLOBALS } = await import('../eslint.globals.mjs');
  for (const name of ['onSelection', 'CANVAS_PADDING', 'currentSize', 'currentExportFormat']) {
    assert.ok(name in PROJECT_GLOBALS, `${name} пропал из глобалов — перегенерируйте: npm run globals`);
  }
});
