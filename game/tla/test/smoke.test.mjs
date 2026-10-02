/**
 * THE LAST ARCHIVE — PoC: дымовой прогон браузерного слоя.
 * Запуск: node game/tla/test/smoke.test.mjs
 *
 * Здесь нет ни jsdom, ни headless-браузера, поэтому поднимается минимальный
 * стаб DOM/Canvas2D и в нём крутится НАСТОЯЩИЙ класс Game из js/main.js
 * (update + render, без переписывания логики): ловим ошибки инициализации,
 * обращений к несуществующим элементам и падения в игровом цикле.
 */

import { strict as assert } from 'node:assert';

/* ------------------------------------------------------- стаб Canvas2D */
function makeCtx(canvas) {
  const noop = () => {};
  const ctx = {
    canvas,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    save: noop, restore: noop,
    setTransform: noop, transform: noop, resetTransform: noop,
    translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop,
    arc: noop, ellipse: noop, rect: noop,
    fill: noop, stroke: noop, clip: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop,
    setLineDash: noop, getLineDash: () => [],
    drawImage: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: () => ({ width: 10 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    putImageData: noop,
  };
  return ctx;
}

function makeCanvas() {
  const canvas = { width: 1280, height: 720 };
  const ctx = makeCtx(canvas);
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
  canvas.addEventListener = () => {};
  canvas.style = {};
  return canvas;
}

/* ----------------------------------------------------------- стаб DOM */
const IDS = [
  'game', 'hud-stance', 'hud-battery', 'hud-health', 'hud-inv', 'hud-weather',
  'hud-noise-fill', 'hud-noise-val', 'hud-noise-note', 'hud-fps',
  'prompt', 'hint', 'btn-save', 'btn-load', 'btn-archive', 'btn-close-archive',
  'btn-restart', 'overlay-read', 'read-title', 'read-lore', 'read-actions',
  'overlay-breath', 'breath-bar', 'breath-calm',
  'overlay-craft', 'craft-marker', 'craft-hits', 'craft-list', 'craft-inv',
  'overlay-archive', 'archive-body', 'overlay-end', 'end-title', 'end-text', 'end-stats',
];

function makeEl(id) {
  const el = {
    id,
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      contains(c) { return this._s.has(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._s.has(c) : !!force;
        if (on) this._s.add(c); else this._s.delete(c);
        return on;
      },
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
  };
  return el;
}

const elements = new Map();
for (const id of IDS) {
  elements.set(id, id === 'game' ? makeCanvas() : makeEl(id));
}

globalThis.document = {
  getElementById: (id) => {
    if (!elements.has(id)) throw new Error(`Нет элемента #${id} в index.html`);
    return elements.get(id);
  },
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl(tag)),
  addEventListener: (type, fn) => { globalThis.__domReady = fn; },
};

const listeners = [];
globalThis.window = {
  devicePixelRatio: 1,
  addEventListener: (type, fn) => {
    listeners.push([type, fn]);
    if (type === 'DOMContentLoaded') globalThis.__domReady = fn;
  },
  removeEventListener: () => {},
  AudioContext: undefined,
  requestAnimationFrame: () => 0,
};
globalThis.requestAnimationFrame = () => 0;
globalThis.localStorage = (() => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
})();
globalThis.performance = globalThis.performance || { now: () => Date.now() };

/* ------------------------------------------------------ поднимаем игру */
let pass = 0;
const failures = [];
function ok(name, fn) {
  try { fn(); pass++; console.log(`  [PASS] ${name}`); }
  catch (e) { failures.push(`${name}: ${e.message}`); console.log(`  [FAIL] ${name}: ${e.message}`); }
}

await import('../js/main.js');
assert.equal(typeof globalThis.__domReady, 'function', 'main.js не зарегистрировал DOMContentLoaded');
globalThis.__domReady();
const game = globalThis.window.TLA;
assert.ok(game, 'Game не создан');

console.log('\n— Дымовой прогон браузного слоя (реальный класс Game)');

ok('уровень собрался без претензий sanity', () => {
  assert.deepEqual(game.problems, []);
});

ok('600 кадров update+render без исключений', () => {
  for (let i = 0; i < 600; i++) {
    game.update(1 / 60);
    game.render(1 / 60);
  }
  assert.ok(game.time > 9, `время не идёт: ${game.time}`);
  assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y), 'у игрока NaN-координаты');
});

ok('игрок уходит со спавна по вводу «вверх»', () => {
  const y0 = game.player.y;
  const x0 = game.player.x;
  game.input.up = 1;
  for (let i = 0; i < 90; i++) game.update(1 / 60);
  game.input.up = 0;
  assert.ok(game.player.y < y0 - 40, `y: ${y0} → ${game.player.y}`);
  assert.equal(game.player.x, x0, 'чистое движение по Y сдвинуло X');
});

ok('игрок не проходит сквозь стену (600 кадров в стену)', () => {
  game.input.left = 1;
  for (let i = 0; i < 600; i++) game.update(1 / 60);
  game.input.left = 0;
  const tx = Math.floor(game.player.x / 40);
  const ty = Math.floor(game.player.y / 40);
  assert.ok(game.grid.isWalkable(tx, ty), `игрок в стене: ${tx},${ty}`);
});

ok('движение по диагонали скользит вдоль стены, а не телепортирует', () => {
  const p = game.player;
  p.x = game.level.spawn.x;
  p.y = game.level.spawn.y;
  game.input.up = 1;
  game.input.left = 1;
  for (let i = 0; i < 200; i++) game.update(1 / 60);
  game.input.up = 0;
  game.input.left = 0;
  const tx = Math.floor(p.x / 40);
  const ty = Math.floor(p.y / 40);
  assert.ok(game.grid.isWalkable(tx, ty), `игрок в стене: ${tx},${ty}`);
  assert.ok(p.y < game.level.spawn.y - 100, 'диагональ не двигает игрока');
});

ok('фонарь включается и расходует батарею', () => {
  game.player.battery = 1;
  game.toggleLight();
  assert.equal(game.player.lightOn, true);
  const b0 = game.player.battery;
  for (let i = 0; i < 300; i++) game.update(1 / 60);
  assert.ok(game.player.battery < b0, 'батарея не тратится');
});

ok('укрытие в каталожном шкафу + миниигра дыхания', () => {
  const cab = game.level.propsById.cabinet;
  game.player.x = cab.x;
  game.player.y = cab.y + 20;
  game.player.health = 3;
  game.toggleHide();
  assert.equal(game.state, 'breath');
  assert.equal(game.player.hidden, true);
  for (let i = 0; i < 400 && game.breath.calm < 0.9; i++) {
    game.update(1 / 60);
    if (Math.abs(game.breath.pos - 0.5) < 0.02) game.breathTap();
  }
  assert.ok(game.breath.calm > 0.5, `спокойствие не растёт: ${game.breath.calm}`);
  game.closePanels();
  assert.equal(game.player.hidden, false);
});

ok('крафт на верстаке: светлячок по чертежу', () => {
  const p = game.player;
  p.blueprints.firefly = true;
  p.inv.junk = 5;
  p.inv.pages = 200;
  game.openCraft();
  assert.equal(game.state, 'craft');
  const recipe = game.craft.recipe;
  game.craft.recipe = { id: 'firefly', needs: { junk: 2, pages: 30 } };
  const before = p.inv.fireflies;
  for (let i = 0; i < 20 && p.inv.fireflies === before; i++) {
    game.craft.pos = 0.5;
    game.craftTap();
  }
  assert.ok(p.inv.fireflies > before, 'крафт не выдал светлячка');
  game.closePanels();
});

ok('сейв → лоад сохраняет позицию и архив', () => {
  game.player.x = 500;
  game.player.y = 900;
  game.player.inv.pages = 77;
  game.doSave();
  game.player.x = 1;
  game.player.y = 1;
  game.player.inv.pages = 0;
  game.doLoad();
  assert.equal(Math.round(game.player.x), 500);
  assert.equal(game.player.inv.pages, 77);
});

ok('дождь приходит и поднимает порог слышимости', () => {
  game.rainPhase = 'dry';
  game.weatherTimer = 0.01;
  for (let i = 0; i < 400; i++) game.update(1 / 60);
  assert.ok(game.rain > 0.5, `rain = ${game.rain}`);
  assert.ok(game.grid.thresholdBonus > 5, `bonus = ${game.grid.thresholdBonus}`);
});

ok('враги живут: FSM крутится, пути строятся', () => {
  for (let i = 0; i < 600; i++) game.update(1 / 60);
  const moving = game.enemies.filter((e) => e.path.length > 0 || e.state !== 'patrol');
  assert.ok(moving.length > 0, 'ни один враг не шевелится');
  for (const e of game.enemies) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'у врага NaN-координаты');
  }
});

ok('финал: выход через пролом завершает сессию', () => {
  game.level.gate.closed = false;
  const ex = game.level.exitZone.rect;
  game.player.x = ex.x + 20;
  game.player.y = ex.y + 20;
  game.update(1 / 60);
  assert.equal(game.state, 'win');
  assert.ok(elements.get('end-text').textContent.length > 20, 'нет текста финала');
});

console.log(`\nИтого: ${pass} проверок, ${failures.length} провалов.`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('БРАУЗЕРНЫЙ СЛОЙ PoC ЗАПУСКАЕТСЯ И КРУТИТСЯ БЕЗ ПАДЕНИЙ.');
