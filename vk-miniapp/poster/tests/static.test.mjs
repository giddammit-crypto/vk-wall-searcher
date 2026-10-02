/**
 * Статическая регрессия по пунктам плана аудита (раздел 6).
 *
 * В песочнице нет браузера и PHP, поэтому клики/скачивания/Lighthouse здесь не
 * воспроизводятся. Проверяется то, что можно проверить текстом и парсером и что
 * напрямую отвечает за пункты плана: утечки ключей (P0-1), вызовы несуществующих
 * функций (P0-2), путь экспорта (P0-3), вендор и SW (P1-1/P1-2/P1-3), CORS и
 * SSRF (P1-4), заголовки (P2-5), глобальный обработчик ошибок (P2-6) и
 * согласованность версий кэша.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const POSTER = join(here, '..');
const ROOT = join(POSTER, '..', '..');
const read = (...p) => readFileSync(join(...p), 'utf8');

/**
 * Убирает комментарии, чтобы тест не принимал пояснение вида
 * «// раньше стоял Access-Control-Allow-Origin: *» за живой код.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
    .replace(/(^|[^:\\])#[^\n]*/g, '$1');
}

const indexHtml = read(POSTER, 'index.html');
const editorJs = read(POSTER, 'editor.js');
const aiProxy = read(POSTER, 'ai_proxy.php');
const swJs = read(POSTER, 'sw.js');
const styleCss = read(POSTER, 'style.css');
const htaccess = read(ROOT, '.htaccess');
const posterHtaccess = read(POSTER, '.htaccess');

// ── P0-1: ключи не в клиентском коде ──────────────────────────────────────
test('P0-1: в клиентских файлах нет ключей ИИ и прямых URL провайдеров', () => {
  const files = ['index.html', 'editor.js', 'ai_elements.js', 'vk.js', 'ai_proxy.php'];
  const leaks = [];
  for (const f of files) {
    const src = read(POSTER, f);
    for (const re of [/sk-xt-[A-Za-z0-9]{8,}/, /\bAPI_KEYS\s*=\s*\[/, /API_DIRECT_URL\s*=\s*['"]https/g]) {
      if (re.test(src)) leaks.push(`${f}: ${re}`);
    }
  }
  assert.deepEqual(leaks, []);
});

test('P0-1: прокси берёт ключи из окружения, а не из кода', () => {
  assert.match(aiProxy, /getenv\(\s*['"]XKIRO_KEYS['"]\s*\)/);
});

// ── P0-2: пустой холст / pageerror ────────────────────────────────────────
test('P0-2: в editor.js не осталось вызовов несуществующей syncUI()', () => {
  const calls = stripComments(editorJs).match(/(?<![\w$.])syncUI\s*\(/g) || [];
  assert.deepEqual(calls, [], 'syncUI нигде не объявлена — вызов бросал pageerror');
});

test('P0-2: getActiveBrushKind существует и возвращает значение по умолчанию', () => {
  const pro = read(POSTER, 'figma_pro_tools.js');
  assert.match(pro, /function getActiveBrushKind\s*\(/);
  assert.match(pro, /\|\|\s*'pencil'/, 'должен быть фолбэк, иначе brush kind = undefined');
});

// ── P0-3: экспорт PNG ─────────────────────────────────────────────────────
test('P0-3: формат экспорта объявлен и участвует в выгрузке', () => {
  assert.match(editorJs, /let currentExportFormat\s*=\s*'png'/);
  assert.ok(editorJs.includes('currentExportFormat'), 'формат экспорта нигде не используется');
  assert.match(editorJs, /toDataURL|toBlob/, 'нет пути выгрузки изображения');
});

// ── P1-1/P1-2/P1-3: VK Bridge, Service Worker, вендор ─────────────────────
test('P1-1: vk-bridge подключён локально и до vk.js', () => {
  const bridge = indexHtml.indexOf('vendor/vk-bridge.min.js');
  const vkjs = indexHtml.indexOf('src="vk.js');
  assert.ok(bridge > -1 && vkjs > -1 && bridge < vkjs, 'vk.js загружается раньше моста');
  assert.ok(existsSync(join(POSTER, 'vendor', 'vk-bridge.min.js')));
});

test('P1-2: кэш SW соответствует версии релиза, a11y.js в пре-кэше', () => {
  const version = JSON.parse(read(ROOT, '.version.json')).version;
  assert.match(swJs, new RegExp(`aurora-poster-v${version.replace(/\./g, '\\.')}`));
  assert.ok(swJs.includes("'./a11y.js'"), 'a11y.js не попал в пре-кэш — офлайн сломается');
  assert.match(swJs, /allSettled/, 'пре-кэш должен переживать недоступность отдельных файлов');
});

test('P1-3: у каждого CDN-фолбэка есть локальная копия в vendor/', () => {
  const fallbacks = [...indexHtml.matchAll(/document\.write\('<script src="(https:\/\/[^']+)"/g)].map((m) => m[1]);
  assert.ok(fallbacks.length >= 3, `ожидали CDN-фолбэки, нашли ${fallbacks.length}`);
  const vendored = ['fabric.min.js', 'paper-core.min.js', 'jspdf.umd.min.js', 'jszip.min.js', 'vk-bridge.min.js'];
  for (const f of vendored) assert.ok(existsSync(join(POSTER, 'vendor', f)), `нет vendor/${f}`);
  for (const f of vendored) {
    assert.ok(indexHtml.includes(`vendor/${f}`), `index.html не грузит vendor/${f} напрямую`);
  }
  // qrcode.min.js исторически лежит в корне постера, а не в vendor/
  assert.ok(existsSync(join(POSTER, 'qrcode.min.js')), 'нет qrcode.min.js');
  assert.ok(indexHtml.includes('src="qrcode.min.js'), 'index.html не грузит qrcode.min.js');
});

// ── P1-4: CORS / SSRF ─────────────────────────────────────────────────────
test('P1-4: прокси не раздаёт Access-Control-Allow-Origin: *', () => {
  assert.ok(!/Access-Control-Allow-Origin:\s*\*/.test(stripComments(aiProxy)),
    'любой сайт мог расходовать квоту ИИ');
  assert.match(aiProxy, /\$allowedOrigins\s*=/);
  assert.match(aiProxy, /Vary:\s*Origin/i);
});

test('P1-4: SSRF-защита и лимит размера ответа на месте', () => {
  assert.match(aiProxy, /(127\.0\.0\.1|localhost|169\.254|10\.\d)/, 'нет фильтра приватных адресов');
  assert.match(aiProxy, /10\s*\*\s*1024\s*\*\s*1024|10485760/);
});

// ── P1-5 / P2-3: интерфейс ────────────────────────────────────────────────
test('P1-5: правило минимальной площади нажатия 44px присутствует', () => {
  assert.match(styleCss, /min-width:\s*44px/);
  assert.match(styleCss, /min-height:\s*44px/);
});

test('P2-3: a11y.js подключён в index.html и имеет глобальное кольцо фокуса', () => {
  assert.ok(indexHtml.includes('src="a11y.js'), 'a11y.js не подключён');
  assert.ok(indexHtml.indexOf('a11y.js') > indexHtml.indexOf('editor.js'), 'a11y.js должен идти после editor.js');
  assert.match(styleCss, /:focus-visible/);
  assert.match(styleCss, /prefers-reduced-motion:\s*reduce/);
});

// ── P2-5: заголовки ───────────────────────────────────────────────────────
test('P2-5: у постера заданы CSP, Referrer-Policy, Permissions-Policy', () => {
  assert.match(posterHtaccess, /Header set Content-Security-Policy "/);
  assert.match(posterHtaccess, /frame-ancestors[^"]*vk\.com/, 'иначе мини-апп не откроется во фрейме ВК');
  assert.match(posterHtaccess, /'wasm-unsafe-eval'/, 'без него WASM-вывод Transformers.js падает');
  assert.match(posterHtaccess, /Referrer-Policy/);
  assert.match(posterHtaccess, /Permissions-Policy/);
  assert.match(posterHtaccess, /clipboard-write/);
});

test('P2-5: CSP покрывает все внешние источники из кода', () => {
  const csp = posterHtaccess.match(/Header set Content-Security-Policy "([^"]+)"/)[1];
  const origins = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'image.pollinations.ai'];
  const missing = origins.filter((o) => !csp.includes(o));
  assert.deepEqual(missing, [], 'этих источников нет в CSP — запросы будут заблокированы');
});

test('P2-5: .ai_keys.php закрыт от прямого доступа', () => {
  assert.match(posterHtaccess, /\\\.ai_keys\\\.php/);
  assert.match(htaccess, /ai_keys/, 'корневой .htaccess тоже должен отсекать файл ключей');
});

// ── P2-6: обработка ошибок ────────────────────────────────────────────────
test('P2-6: глобальные обработчики ошибок показывают пользователю тост', () => {
  assert.match(editorJs, /addEventListener\(\s*'error'/);
  assert.match(editorJs, /addEventListener\(\s*'unhandledrejection'/);
  const head = editorJs.split('\n').slice(0, 120).join('\n');
  assert.match(head, /ResizeObserver/, 'нужен фильтр шума ResizeObserver');
  assert.match(head, /Script error\./, 'нужен фильтр кросс-доменных ошибок без текста');
});

// ── P2-7: тексты ──────────────────────────────────────────────────────────
test('P2-7: в CONFIG.MODELS нет маркетингового «100% Free»', () => {
  const aiElements = read(POSTER, 'ai_elements.js');
  // Проверяем именно блок со списком моделей: «100% БЕСПЛАТНО» как строка
  // макета афиши (текст объекта на холсте) — это контент пользователя, а не
  // маркетинг провайдера, и удалению не подлежит.
  const block = aiElements.match(/MODELS:\s*\[([\s\S]*?)\n\s*\]/);
  assert.ok(block, 'список CONFIG.MODELS не найден — тест потерял смысл');
  const names = [...block[1].matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(names.length >= 5, `ожидали ≥5 моделей, нашли ${names.length}`);
  const offenders = names.filter((n) => /100%\s*(Free|бесплатно)/i.test(n));
  assert.deepEqual(offenders, [], 'маркетинг провайдера не должен попадать в список моделей');
  // id моделей менять нельзя: ':free' — тег маршрутизации на стороне провайдера
  assert.match(block[1], /:free'/, 'тег :free в id моделей исчез — запросы перестанут работать');
});

// ── Версии и кэш (требование плана: бамп ?v= и CACHE_NAME) ────────────────
test('версии ?v=, CACHE_NAME и .version.json согласованы', () => {
  const version = JSON.parse(read(ROOT, '.version.json')).version;
  // qrcode.min.js версионируется по версии самой библиотеки (qrcodejs 2.1.1),
  // остальные ресурсы — по версии релиза приложения.
  const versioned = [...indexHtml.matchAll(/([^"']+?)\?v=(\d+\.\d+\.\d+)/g)]
    .filter(([, res]) => !res.includes('qrcode'));
  const vInHtml = versioned.map(([, , v]) => v); // группа 2 — сама версия
  assert.ok(vInHtml.length > 10, 'в index.html почти нет версионируемых ресурсов');
  const stale = vInHtml.filter((v) => v !== version);
  assert.deepEqual([...new Set(stale)], [], `эти ?v= не совпадают с .version.json (${version})`);
});
