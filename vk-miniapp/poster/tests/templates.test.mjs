/**
 * Тесты шаблонов (п. P1-6 и P3 плана аудита).
 *
 * Аудит требует: «дождаться document.fonts.load для всех шрифтов шаблона и
 * прогнать автотест на наложения текста по всем 129 шаблонам». В песочнице нет
 * браузера, поэтому здесь проверяется то, что определяет «пустой холст» и
 * «поехавший текст» ДО рендера: структура объектов, координаты в границах
 * макета, наличие шрифтов в списке FONTS редактора и уникальность id.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const POSTER = join(here, '..');
const CHRONO = join(POSTER, '..', 'chronograph');

/** Исполняем классические скрипты редактора в песочнице (в браузере это window). */
function loadEditorWorld() {
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [join(CHRONO, 'data.js'), join(CHRONO, 'poster_templates.js')]) {
    vm.runInContext(readFileSync(f, 'utf8'), sandbox, { filename: f });
  }
  return sandbox.window;
}

/** Список шрифтов редактора — единственный источник правды для автозагрузки (P1-6). */
function loadFontIds() {
  const src = readFileSync(join(POSTER, 'editor.js'), 'utf8');
  const block = src.match(/^const FONTS = \[([\s\S]*?)^\];/m);
  assert.ok(block, 'в editor.js должен быть массив FONTS верхнего уровня');
  const ids = [...block[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ids.length >= 20, `ожидали ≥20 шрифтов, получили ${ids.length}`);
  return new Set(ids);
}

const SIZES = ['a4_v', 'square', 'story'];
const world = loadEditorWorld();
const FONT_IDS = loadFontIds();

test('генератор шаблонов опубликован и отдаёт непустой список', () => {
  assert.equal(typeof world.getAllChronographPosterTemplates, 'function');
  assert.equal(typeof world.buildChronographPosterTemplate, 'function');
  assert.ok(world.CHRONOGRAPH_DATA.length >= 85, `в data.js ожидалось ≥85 дат, нашли ${world.CHRONOGRAPH_DATA.length}`);
});

test('каждый формат даёт полный набор шаблонов без пропусков', () => {
  for (const size of SIZES) {
    const list = world.getAllChronographPosterTemplates(2026, size, 0);
    assert.equal(list.length, world.CHRONOGRAPH_DATA.length,
      `формат ${size}: часть дат не превратилась в шаблоны`);
    assert.ok(list.length >= 100, `формат ${size}: ожидалось ≥100 шаблонов, получили ${list.length}`);
  }
});

test('id шаблонов уникальны в пределах формата (иначе карточки слипаются)', () => {
  for (const size of SIZES) {
    const ids = world.getAllChronographPosterTemplates(2026, size, 0).map((t) => t.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual([...new Set(dupes)], [], `формат ${size}: дубли id`);
  }
});

test('ни один шаблон не пустой — причина «пустого холста» из P0-2', () => {
  const problems = [];
  for (const size of SIZES) {
    for (const t of world.getAllChronographPosterTemplates(2026, size, 0)) {
      if (!Array.isArray(t.objects) || t.objects.length === 0) {
        problems.push(`${size}/${t.id}: нет objects`);
        continue;
      }
      if (!t.objects.some((o) => o.type === 'textbox' || o.type === 'text' || o.type === 'i-text')) {
        problems.push(`${size}/${t.id}: нет ни одного текстового объекта`);
      }
    }
  }
  assert.deepEqual(problems.slice(0, 5), [], `пустые шаблоны (первые 5 из ${problems.length})`);
});

test('обязательные поля есть у каждого шаблона и объекта', () => {
  const badTemplates = [];
  const badObjects = [];
  for (const size of SIZES) {
    for (const t of world.getAllChronographPosterTemplates(2026, size, 0)) {
      for (const f of ['id', 'name', 'desc', 'size', 'bg']) {
        if (!t[f]) badTemplates.push(`${t.id}: нет ${f}`);
      }
      for (const [i, o] of t.objects.entries()) {
        if (!o.type) badObjects.push(`${t.id}[${i}]: нет type`);
        if (!Number.isFinite(o.left) || !Number.isFinite(o.top)) {
          badObjects.push(`${t.id}[${i}]: left/top не числа`);
        }
        if (o.type === 'rect' || o.type === 'textbox' || o.type === 'text' || o.type === 'image') {
          if (!Number.isFinite(o.width) || o.width <= 0) badObjects.push(`${t.id}[${i}]: width=${o.width}`);
        }
      }
    }
  }
  assert.deepEqual(badTemplates.slice(0, 5), [], `сломанные шаблоны (первые 5 из ${badTemplates.length})`);
  assert.deepEqual(badObjects.slice(0, 5), [], `сломанные объекты (первые 5 из ${badObjects.length})`);
});

test('шрифты шаблонов есть в FONTS редактора — иначе текст поедет (P1-6)', () => {
  const unknown = new Map();
  for (const size of SIZES) {
    for (const t of world.getAllChronographPosterTemplates(2026, size, 0)) {
      for (const o of t.objects) {
        const fam = o.fontFamily;
        if (!fam) continue;
        // fontFamily может быть стеком вида "Unbounded, Arial, sans-serif"
        for (const raw of String(fam).split(',')) {
          const f = raw.trim().replace(/^["']|["']$/g, '');
          if (!f) continue;
          if (FONT_IDS.has(f)) continue;
          if (/^(sans-serif|serif|monospace|system-ui|Arial|Helvetica|Times)$/i.test(f)) continue;
          unknown.set(f, (unknown.get(f) || 0) + 1);
        }
      }
    }
  }
  assert.deepEqual([...unknown.keys()], [],
    'шрифты шаблонов отсутствуют в FONTS — editor.js не вызовет для них document.fonts.load');
});

test('текстовые объекты не вылезают за границы макета (наложения из P1-6)', () => {
  // Проверка грубая, но ловит класс дефектов «текст уехал за край»:
  // координаты и размеры должны оставаться в пределах листа.
  const CANVAS = { a4_v: { w: 1240, h: 1754 }, square: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };
  const out = [];
  for (const size of SIZES) {
    const { w, h } = CANVAS[size];
    for (const t of world.getAllChronographPosterTemplates(2026, size, 0)) {
      for (const [i, o] of t.objects.entries()) {
        if (!Number.isFinite(o.left) || !Number.isFinite(o.top)) continue;
        const origin = o.originX === 'center' ? o.left - (o.width || 0) / 2 : o.left;
        const top = o.originY === 'center' ? o.top - (o.height || 0) / 2 : o.top;
        if (origin < -50 || top < -50) out.push(`${t.id}[${i}] ${o.type}: left=${o.left} top=${o.top}`);
        if (origin + (o.width || 0) > w + 80 || top + (o.height || 0) > h + 80) {
          out.push(`${t.id}[${i}] ${o.type}: выходит за ${w}x${h}`);
        }
      }
    }
  }
  assert.deepEqual(out.slice(0, 5), [], `объекты вне листа (первые 5 из ${out.length})`);
});
