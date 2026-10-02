/**
 * THE LAST ARCHIVE — PoC-прототип (docs/THE_LAST_ARCHIVE_PRODUCTION_PLAN.md)
 * core.js — константы, палитра (§1.1), сетка, утилиты.
 *
 * Модуль не трогает DOM, поэтому импортируется и браузером, и headless-тестами
 * (game/tla/test/core.test.mjs).
 */

export const TILE = 40;
export const MAP_W = 54;
export const MAP_H = 36;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** Материалы пола/препятствий. abs — акустическое поглощение (дБ на тайл). */
export const MAT = {
  WALL: 0,     // стена: звук не проходит
  PARQUET: 1,  // паркет читальных залов — самый «громкий»
  MARBLE: 2,   // пыльный мрамор вестибюля
  CARPET: 3,   // ковёр — глушит
  METAL: 4,    // металл стеллажей / решётка пролома
  WATER: 5,    // вода по колено — сильно глушит
  GRASS: 6,    // плющ/мох
  CONCRETE: 7, // бетон подвала с плесенью
  DOME: 8,     // мрамор под куполом — даёт эхо
  SHELF: 9,    // стеллаж (препятствие, но звук проходит слабо)
};

export const MATERIALS = [
  { id: MAT.WALL,     name: 'Стена',       abs: 99, walkable: false, opaque: true,  color: '#131A22', accent: '#1C2530' },
  { id: MAT.PARQUET,  name: 'Паркет',      abs: 0.0, walkable: true,  opaque: false, color: '#4A3324', accent: '#6B4A2F' },
  { id: MAT.MARBLE,   name: 'Мрамор',      abs: 0.2, walkable: true,  opaque: false, color: '#7E8288', accent: '#9AA0A6' },
  { id: MAT.CARPET,   name: 'Ковёр',       abs: 1.3, walkable: true,  opaque: false, color: '#5A3A2C', accent: '#6E4836' },
  { id: MAT.METAL,    name: 'Металл',      abs: 0.1, walkable: true,  opaque: false, color: '#5D646B', accent: '#7A4A2B' },
  { id: MAT.WATER,    name: 'Вода',        abs: 2.1, walkable: true,  opaque: false, color: '#22303C', accent: '#3A4E5E' },
  { id: MAT.GRASS,    name: 'Плющ',        abs: 1.7, walkable: true,  opaque: false, color: '#3E5A3A', accent: '#5E7D4C' },
  { id: MAT.CONCRETE, name: 'Бетон',       abs: 0.5, walkable: true,  opaque: false, color: '#4C4F52', accent: '#5C6636' },
  { id: MAT.DOME,     name: 'Купол',       abs: 0.0, walkable: true,  opaque: false, color: '#8A8F96', accent: '#9FB8D8' },
  { id: MAT.SHELF,    name: 'Стеллаж',     abs: 2.6, walkable: false, opaque: true,  color: '#4A3324', accent: '#8F6A3E' },
];

/** Палитра арт-библии (§1.1 плана). */
export const PALETTE = {
  dark0: '#0B0E13',
  dark1: '#131A22',
  wood0: '#4A3324',
  wood1: '#6B4A2F',
  woodHi: '#8F6A3E',
  paper0: '#C9B48A',
  paper1: '#A08A5F',
  stone0: '#7E8288',
  stone1: '#9AA0A6',
  ivy0: '#3E5A3A',
  ivy1: '#5E7D4C',
  spore0: '#8FA05A',
  sporeRot: '#5C6636',
  sporeAcc: '#C7D96B',
  rust: '#7A4A2B',
  lampWarm: '#FFD9A0',
  moon: '#9FB8D8',
  candle: '#FFB25E',
  blood: '#7E2A22',
};

/** Профили движения: разные уровни шума (§0.4B, чек-лист §3.2 п.1). */
export const MOVE = {
  CROUCH: { key: 'crouch', label: 'Крадусь', speed: 82,  interval: 0.56, intensity: 36, stamina: 0,    color: '#5E7D4C' },
  WALK:   { key: 'walk',   label: 'Шаг',     speed: 152, interval: 0.40, intensity: 62, stamina: 0,    color: '#C9B48A' },
  RUN:    { key: 'run',    label: 'Бег',     speed: 262, interval: 0.30, intensity: 92, stamina: 26,   color: '#C7D96B' },
};

export const FLASHLIGHT = {
  coneHalfDeg: 27,
  range: 350,
  brightness: 0.92,
  drainPerSec: 0.0105,   // батарея 0..1
  batteryPickup: 0.55,
};

/** Порог видимости: враг замечает игрока, если visibility > порога. */
export const VISION_BASE = 0.155;

export const HEARING = {
  rainAttenuation: 0.55, // дождь гасит распространение шума (§0.4B)
  rainThresholdBonus: 11, // и поднимает порог слышимости — «окно тишины»
};

export const ECHO = {
  minLoudness: 55,  // эхо даёт только громкий звук (бег/бросок), крадущийся шаг — нет
  delay: 0.95,      // секунды до «фантома»
  intensityFactor: 0.62,
  maxOffset: 7.5,   // тайлов от источника
};

/** Архетипы врагов (§1.5: Читатель / Смотритель / Спороносец). */
export const ENEMY_TYPES = {
  reader: {
    key: 'reader', name: 'Читатель', color: '#8FA05A', glow: '#C7D96B',
    blind: true, sightRange: 0, fovDeg: 0,
    hearBonus: 9, speedWalk: 62, speedHunt: 152, radius: 13,
    huntTime: 9, loseTime: 6.5, thermal: false,
  },
  watcher: {
    key: 'watcher', name: 'Смотритель', color: '#C9B48A', glow: '#FFD9A0',
    blind: false, sightRange: 300, fovDeg: 104,
    hearBonus: 2, speedWalk: 74, speedHunt: 196, radius: 14,
    huntTime: 13, loseTime: 6, thermal: false,
    light: { coneHalfDeg: 24, range: 270, brightness: 0.8 },
  },
  sporebearer: {
    key: 'sporebearer', name: 'Спороносец', color: '#5C6636', glow: '#8FA05A',
    blind: false, sightRange: 165, fovDeg: 130,
    hearBonus: 3, speedWalk: 38, speedHunt: 96, radius: 15,
    huntTime: 8, loseTime: 5, thermal: true, thermalRange: 200,
  },
};

export const WEATHER = {
  cycleMin: 52,
  cycleMax: 96,
  rainMin: 26,
  rainMax: 44,
  ramp: 3.2,
};

/* ------------------------------------------------------------------ utils */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const pxToTile = (p) => Math.floor(p / TILE);
export const tileToPx = (t) => t * TILE + TILE / 2;
export const inBounds = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

/** Нормализованный угол в [-PI, PI]. */
export function angDiff(a, b) {
  const TAU = Math.PI * 2;
  // Нормализация в [-PI, PI). Критично: цель строго позади (d = ±PI) обязана
  // попасть на -PI, иначе конус зрения разворачивается назад.
  let d = ((a - b) % TAU + TAU) % TAU;
  if (d >= Math.PI) d -= TAU;
  return d;
}

/** Круг против AABB: точка ближайшая к центру круга, ограничена прямоугольником. */
export function circleRectCollide(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** Проталкивание круга из прямоугольника (возвращает смещение). */
export function resolveCircleRect(pos, r, rect) {
  const nx = clamp(pos.x, rect.x, rect.x + rect.w);
  const ny = clamp(pos.y, rect.y, rect.y + rect.h);
  let dx = pos.x - nx;
  let dy = pos.y - ny;
  let d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    pos.x = nx + (dx / d) * r;
    pos.y = ny + (dy / d) * r;
    return true;
  }
  // центр внутри прямоугольника — выталкиваем по кратчайшей оси
  const left = pos.x - rect.x;
  const right = rect.x + rect.w - pos.x;
  const top = pos.y - rect.y;
  const bottom = rect.y + rect.h - pos.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) pos.x = rect.x - r;
  else if (m === right) pos.x = rect.x + rect.w + r;
  else if (m === top) pos.y = rect.y - r;
  else pos.y = rect.y + rect.h + r;
  return true;
}

/** Пересечение отрезка и AABB (slab method). Возвращает t входа или null. */
export function segRectT(x1, y1, x2, y2, rx, ry, rw, rh) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  const edges = [
    [x1, dx, rx, rx + rw],
    [y1, dy, ry, ry + rh],
  ];
  for (const [o, d, lo, hi] of edges) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

/** Детерминированный ПСЧ (mulberry32) — для повторяемой генерации уровня. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
