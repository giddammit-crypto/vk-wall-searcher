/**
 * THE LAST ARCHIVE — PoC-прототип
 * level.js — уровень «Главный читальный зал» (§3.1): 5 зон, 25–35 минут,
 * полная петля Core Loop: вестибюль-«шлюз» → каталожная галерея →
 * читальный зал под куполом → спецхран (моральный выбор) → побег через пролом.
 *
 * Уровень собирается детерминированно (mulberry32) — чтобы headless-тесты
 * и браузер видели одну и ту же геометрию.
 */

import {
  MAP_W, MAP_H, TILE, MAT, mulberry32, tileToPx, pxToTile, clamp,
} from './core.js';
import { AcousticGrid } from './acoustics.js';

export const ZONES = {
  base:      { id: 'base',      name: 'Читальный зал (база)', rect: { x: 2,  y: 21, w: 13, h: 13 } },
  vestibule: { id: 'vestibule', name: 'Вестибюль-«шлюз»',     rect: { x: 2,  y: 20, w: 15, h: 14 } },
  gallery:   { id: 'gallery',   name: 'Каталожная галерея',   rect: { x: 2,  y: 3,  w: 15, h: 15 } },
  dome:      { id: 'dome',      name: 'Читальный зал под куполом', rect: { x: 17, y: 7,  w: 15, h: 12 } },
  spechhran: { id: 'spechhran', name: 'Сектор спецхрана',     rect: { x: 36, y: 5,  w: 17, h: 12 } },
  escape:    { id: 'escape',    name: 'Пролом (побег)',       rect: { x: 36, y: 17, w: 17, h: 12 } },
};

const BOOK_TITLES = [
  '«О природе эха в высоких залах»',
  '«Каталог утраченного: том XIV»',
  '«Зодчество библиотек. Купола»',
  '«Тихая охота: повадки Читателей»',
  '«Споры и плесень подвального фонда»',
  '«Дневник архивариуса М.»',
  '«Огнестойкость переплёта»',
  '«Картография этажей: ключи-шифры»',
  '«Лунный цикл сквозь стекло купола»',
  '«Ремонт самодельного фонаря»',
];

const RARE_TITLE = '«Кодекс Светлячка» — редкий том спецхрана';
const BLUEPRINT_TITLE = '«Чертёж: фонарь-«светлячок»»';

/** Прямоугольник в тайлах → пиксельный прямоугольник. */
function rpx(t) {
  return { x: t.x * TILE, y: t.y * TILE, w: t.w * TILE, h: t.h * TILE };
}

export function buildLevel() {
  const rng = mulberry32(20261002);
  const mats = new Uint8Array(MAP_W * MAP_H).fill(MAT.WALL);
  const occluders = [];   // непрозрачные прямоугольники (стены + стеллажи)
  const doors = [];
  const zoneLights = [];
  const shelves = [];
  const books = [];
  const cards = [];
  const junk = [];
  const sporePatches = [];
  const ivyPatches = [];
  const props = [];

  const setMat = (x, y, m) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    mats[y * MAP_W + x] = m;
  };
  const fillRect = (x, y, w, h, m) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setMat(i, j, m);
  };
  /** Стена: материал + окклюдер. */
  const wall = (x, y, w, h) => {
    fillRect(x, y, w, h, MAT.WALL);
    occluders.push(rpx({ x, y, w, h }));
  };

  /* ------------------------------------------------------------ оболочка */
  wall(0, 0, MAP_W, 1);
  wall(0, MAP_H - 1, MAP_W, 1);
  wall(0, 0, 1, MAP_H);
  wall(MAP_W - 1, 0, 1, MAP_H);

  /* ------------------------------------------------- ЗОНА 2: вестибюль */
  fillRect(2, 20, 15, 14, MAT.MARBLE);
  // колонны парадной лестницы — первые честные тени
  for (const [cx, cy] of [[5, 23], [11, 23], [5, 29], [11, 29]]) {
    fillRect(cx, cy, 1, 1, MAT.WALL);
    occluders.push(rpx({ x: cx, y: cy, w: 1, h: 1 }));
  }
  // плющ, пробившийся сквозь пол
  ivyPatches.push(rpx({ x: 13, y: 30, w: 3, h: 3 }));
  fillRect(13, 30, 3, 3, MAT.GRASS);

  /* ------------------------------------------------- ЗОНА 1: база */
  fillRect(2, 21, 13, 13, MAT.PARQUET);
  zoneLights.push({
    x: tileToPx(8), y: tileToPx(24), radius: 260, intensity: 0.34, color: '#FFD9A0', name: 'Лампа базы',
  });

  /* -------------------------------------------- ЗОНА 3: каталожная галерея */
  fillRect(2, 3, 15, 15, MAT.CARPET);
  // каталожные шкафы вдоль северной стены
  for (let i = 0; i < 6; i++) {
    const x = 3 + i * 2;
    fillRect(x, 4, 1, 1, MAT.SHELF);
    shelves.push({ ...rpx({ x, y: 4, w: 1, h: 1 }), kind: 'catalog' });
  }
  // ряды стеллажей галереи: короче, чем зал, чтобы проходы (y=8..9, y=11..12)
  // и коридор к купольному залу (x=14..15) оставались свободными
  addShelfRows(3, 7, 12, 11, 3, shelves, (x, y, w, h) => { fillRect(x, y, w, h, MAT.SHELF); occluders.push(rpx({ x, y, w, h })); });
  addShelfRows(3, 13, 12, 16, 3, shelves, (x, y, w, h) => { fillRect(x, y, w, h, MAT.SHELF); occluders.push(rpx({ x, y, w, h })); });
  // споры в тёмном углу — риск/награда (§0.4C)
  sporePatches.push(rpx({ x: 12, y: 14, w: 3, h: 3 }));
  zoneLights.push({
    x: tileToPx(8), y: tileToPx(9), radius: 200, intensity: 0.2, color: '#9FB8D8', name: 'Свет галереи',
  });

  /* ------------------------------------------------ ЗОНА 4: купольный зал */
  fillRect(17, 7, 15, 12, MAT.MARBLE);
  // мраморный круг купола + эхо-зона
  const dcx = 24;
  const dcy = 13;
  const dR = 4.6;
  const echoZones = [];
  {
    const x0 = Math.round(dcx - dR);
    const x1 = Math.round(dcx + dR);
    const y0 = Math.round(dcy - dR);
    const y1 = Math.round(dcy + dR);
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d = Math.hypot(i - dcx, j - dcy);
        if (d <= dR) setMat(i, j, MAT.DOME);
      }
    }
    echoZones.push({ x0, x1, y0, y1, echo: true, cx: dcx, cy: dcy });
  }
  // лунные полосы сквозь купол (§1.2 zone lights)
  for (let i = 0; i < 4; i++) {
    zoneLights.push({
      x: tileToPx(20 + i * 3), y: tileToPx(9 + (i % 2) * 6),
      radius: 150, intensity: 0.42, color: '#9FB8D8', name: 'Лунная полоса', moon: true,
    });
  }
  // стеллажи-лабиринт купольного зала
  addShelfRows(18, 8, 13, 17, 3, shelves, (x, y, w, h) => { fillRect(x, y, w, h, MAT.SHELF); occluders.push(rpx({ x, y, w, h })); });

  /* -------------------------------------------------- ЗОНА 5: спецхран */
  fillRect(36, 5, 17, 12, MAT.CONCRETE);
  fillRect(49, 14, 3, 2, MAT.CONCRETE); // плесень
  sporePatches.push(rpx({ x: 49, y: 14, w: 3, h: 2 }));
  // два ряда металлических стеллажей: проходы y=7..9 и y=11..15
  addShelfRows(37, 6, 51, 6, 3, shelves, (x, y, w, h) => { fillRect(x, y, w, h, MAT.SHELF); occluders.push(rpx({ x, y, w, h })); });
  addShelfRows(37, 10, 51, 10, 3, shelves, (x, y, w, h) => { fillRect(x, y, w, h, MAT.SHELF); occluders.push(rpx({ x, y, w, h })); });
  zoneLights.push({
    x: tileToPx(44), y: tileToPx(8), radius: 210, intensity: 0.16, color: '#C7D96B', name: 'Аварийная лампа спецхрана',
  });

  /* --------------------------------------------------- ЗОНА 6: пролом */
  fillRect(36, 17, 17, 12, MAT.METAL);
  fillRect(44, 22, 6, 4, MAT.WATER);
  fillRect(36, 19, 3, 3, MAT.WATER);
  zoneLights.push({
    x: tileToPx(50), y: tileToPx(26), radius: 180, intensity: 0.22, color: '#7E2A22', name: 'Аварийный свет пролома',
  });

  /* ------------------------------------------------------- перегородки */
  // южная стена галереи (y=18) с проходом к вестибюлю (x=5..6)
  wall(1, 18, 4, 1);
  wall(7, 18, 10, 1);
  // западная стена купольного зала (x=16) с проходом из галереи
  wall(16, 1, 1, 9);
  wall(16, 13, 1, 24);
  // северная стена вестибюля (y=19) с проходом в купольный зал
  wall(1, 19, 23, 1);
  wall(26, 19, 8, 1);
  // стена спецхрана (x=35) с проходом из купола
  wall(35, 1, 1, 9);
  wall(35, 13, 1, 24);
  // северная стена пролома (y=16) с проходом
  wall(34, 16, 6, 1);
  wall(42, 16, 12, 1);
  // перегородка пролома с запечатанными воротами
  wall(36, 21, 4, 1);
  wall(42, 21, 12, 1);
  // Проходы прорезаем ПОСЛЕ всех стен: wall() перезаписывает материал тайлов.
  fillRect(5, 18, 2, 2, MAT.MARBLE);   // галерея → вестибюль (сквозь y=18 и y=19)
  fillRect(16, 10, 1, 3, MAT.MARBLE);  // галерея → купольный зал
  fillRect(24, 19, 2, 1, MAT.MARBLE);  // вестибюль → купольный зал
  fillRect(32, 10, 4, 3, MAT.MARBLE);  // купольный зал → спецхран (коридор x=32..35)
  fillRect(40, 16, 2, 1, MAT.CONCRETE);// спецхран → пролом

  const gate = {
    id: 'gate', name: 'Запечатанные ворота пролома', closed: true,
    rect: rpx({ x: 40, y: 21, w: 2, h: 1 }),
  };
  doors.push(gate);
  occluders.push(gate.rect);
  // выход наружу
  const exitZone = { id: 'exit', name: 'Пролом наружу', rect: rpx({ x: 51, y: 27, w: 2, h: 2 }) };

  /* ---------------------------------------------------- интерактивное */
  const propsById = {};
  const addProp = (p) => { props.push(p); propsById[p.id] = p; return p; };

  addProp({
    id: 'workbench', kind: 'workbench', name: 'Верстак архивариуса',
    x: tileToPx(4), y: tileToPx(24), r: 26,
  });
  const brazier = addProp({
    id: 'brazier', kind: 'brazier', name: 'Жаровня (костёр-отвлечение)',
    x: tileToPx(11), y: tileToPx(24), r: 26, lit: false, fuel: 0,
  });
  addProp({
    id: 'cabinet', kind: 'cabinet', name: 'Каталожный шкаф (укрытие)',
    x: tileToPx(9), y: tileToPx(9), r: 26, occupied: false,
  });
  const rare = addProp({
    id: 'rare', kind: 'book', name: RARE_TITLE, rare: true,
    x: tileToPx(46), y: tileToPx(7), r: 20, taken: false,
    blueprint: 'firefly', lore: 'Тонкий пергамент с чертежом самодельного фонаря-«светлячка».',
  });
  addProp({
    id: 'blueprint', kind: 'book', name: BLUEPRINT_TITLE, blueprintPage: true,
    x: tileToPx(20), y: tileToPx(17), r: 20, taken: false,
    lore: 'Поля исписаны расчётами: сколько страниц нужно, чтобы светлячок горел минуту.',
  });

  // карточки каталога — единственный способ открыть план зон (§0.4D)
  cards.push({ id: 'card-gallery', zone: 'gallery', name: 'Карточка каталога: галерея', x: tileToPx(6), y: tileToPx(5), taken: false });
  cards.push({ id: 'card-dome', zone: 'dome', name: 'Карточка каталога: купольный зал', x: tileToPx(28), y: tileToPx(11), taken: false });
  cards.push({ id: 'card-spechhran', zone: 'spechhran', name: 'Карточка каталога: спецхран', x: tileToPx(37), y: tileToPx(14), taken: false });

  // книги: топливо ИЛИ знание (§0.4A)
  const bookSpots = [
    [4, 11], [10, 12], [13, 8], [21, 10], [26, 15], [29, 8], [38, 9], [43, 12], [50, 7], [8, 26],
  ];
  bookSpots.forEach(([bx, by], i) => {
    addProp({
      id: `book-${i}`, kind: 'book', name: BOOK_TITLES[i % BOOK_TITLES.length],
      x: tileToPx(bx), y: tileToPx(by), r: 18, taken: false, read: false,
      lore: 'Страницы пахнут сыростью. Одна страница — чертёж, другая — чья-то память.',
      pages: 40 + Math.floor(rng() * 90),
    });
  });

  // хлам для крафта + батарейки
  const junkSpots = [[3, 27], [12, 22], [6, 31], [14, 12], [22, 16], [30, 17], [37, 12], [48, 12], [40, 26], [50, 24]];
  junkSpots.forEach(([jx, jy], i) => {
    junk.push({ id: `junk-${i}`, x: tileToPx(jx), y: tileToPx(jy), taken: false });
  });
  const batterySpots = [[15, 30], [27, 9], [51, 12]];
  const batteries = batterySpots.map(([bx, by], i) => ({
    id: `battery-${i}`, x: tileToPx(bx), y: tileToPx(by), taken: false,
  }));

  /* ---------------------------------------------------------- спавны */
  const spawn = { x: tileToPx(7), y: tileToPx(30) };
  const enemies = [
    {
      type: 'reader', spawn: { x: tileToPx(21), y: tileToPx(12) },
      patrol: [{ x: tileToPx(21), y: tileToPx(12) }, { x: tileToPx(28), y: tileToPx(15) }, { x: tileToPx(19), y: tileToPx(16) }],
    },
    {
      type: 'reader', spawn: { x: tileToPx(44), y: tileToPx(12) },
      patrol: [{ x: tileToPx(44), y: tileToPx(12) }, { x: tileToPx(49), y: tileToPx(8) }, { x: tileToPx(38), y: tileToPx(12) }],
    },
    {
      type: 'reader', spawn: { x: tileToPx(6), y: tileToPx(12) },
      patrol: [{ x: tileToPx(6), y: tileToPx(12) }, { x: tileToPx(13), y: tileToPx(15) }, { x: tileToPx(4), y: tileToPx(15) }],
    },
    {
      type: 'sporebearer', spawn: { x: tileToPx(13), y: tileToPx(15) },
      patrol: [{ x: tileToPx(13), y: tileToPx(15) }, { x: tileToPx(5), y: tileToPx(8) }],
    },
    {
      type: 'watcher', spawn: { x: tileToPx(47), y: tileToPx(12) },
      patrol: [{ x: tileToPx(47), y: tileToPx(12) }, { x: tileToPx(38), y: tileToPx(12) }, { x: tileToPx(43), y: tileToPx(15) }],
    },
  ];

  /* --------------------------------------------------------- акустика */
  const grid = new AcousticGrid(mats, echoZones);

  return {
    mats, occluders, shelves, doors, gate, exitZone, zoneLights, props, propsById,
    books: props.filter((p) => p.kind === 'book'),
    cards, junk, batteries, sporePatches, ivyPatches,
    enemies, spawn, grid, echoZones, brazier, rare,
    zones: ZONES,
    zoneAt(wx, wy) {
      const tx = pxToTile(wx);
      const ty = pxToTile(wy);
      for (const z of Object.values(ZONES)) {
        const r = z.rect;
        if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return z;
      }
      return null;
    },
  };
}

/** Ряды стеллажей: горизонтальные «грядки» с проходами. */
function addShelfRows(x0, y0, x1, y1, spacing, out, fill) {
  for (let y = y0; y <= y1; y += spacing) {
    let x = x0;
    while (x < x1) {
      const len = Math.min(3, x1 - x);
      if (len <= 0) break;
      out.push(rpx({ x, y, w: len, h: 1 }));
      fill(x, y, len, 1);
      x += len + 1; // проход в 1 тайл
    }
  }
}

/** Проверяем, что спавн игрока и ключевые точки достижимы (для тестов). */
export function sanityCheck(level) {
  const problems = [];
  const walk = (wx, wy) => level.grid.isWalkable(pxToTile(wx), pxToTile(wy));
  if (!walk(level.spawn.x, level.spawn.y)) problems.push('спавн игрока в стене');
  for (const e of level.enemies) {
    if (!walk(e.spawn.x, e.spawn.y)) problems.push(`спавн ${e.type} в стене`);
    for (const p of e.patrol) if (!walk(p.x, p.y)) problems.push(`патруль ${e.type} в стене`);
  }
  for (const c of level.cards) if (!walk(c.x, c.y)) problems.push(`карточка ${c.id} в стене`);
  if (!walk(level.exitZone.rect.x + TILE, level.exitZone.rect.y + TILE)) problems.push('выход в стене');
  return problems;
}

export { clamp };
