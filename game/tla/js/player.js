/**
 * THE LAST ARCHIVE — PoC-прототип
 * player.js — игрок: движение/присед/бег с профилями шума (§3.2 п.1),
 * фонарь с батареей (§3.2 п.4), инвентарь «на коленке», книги как топливо/знание.
 */

import {
  MOVE, FLASHLIGHT, clamp, dist, circleRectCollide, pxToTile, inBounds,
} from './core.js';

export const CRAFT_RECIPES = [
  {
    id: 'firefly',
    name: 'Фонарь-«светлячок» (обманка)',
    needs: { junk: 2, pages: 30 },
    needsBlueprint: true,
    desc: 'Бросаемый источник света и шума: уводит Читателей и Смотрителя.',
  },
  {
    id: 'bandage',
    name: 'Бинт из гессиана',
    needs: { pages: 25 },
    needsBlueprint: false,
    desc: 'Восстанавливает силы после поимки (лечит 1 деление).',
  },
  {
    id: 'batteryPack',
    name: 'Самодельная батарея',
    needs: { junk: 1, pages: 15 },
    needsBlueprint: false,
    desc: '+40% заряда фонаря. Бумага горит — цена знания.',
  },
];

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    r: 13,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    stance: 'walk',           // 'crouch' | 'walk' | 'run'
    moving: false,
    speed: MOVE.WALK.speed,
    stamina: 1,
    health: 3,
    /* фонарь */
    lightOn: false,
    battery: 1,
    lightFlicker: 1,
    /* инвентарь «на коленке» (§2.2) */
    inv: { books: [], pages: 0, junk: 0, fireflies: 0, bandages: 0 },
    blueprints: {},           // id → true
    archive: { read: [], burned: [], rareRead: false, rareBurned: false, cards: [] },
    /* шум */
    stepTimer: 0,
    lastNoise: 0,
    noiseLevel: 0,
    dust: 0,                  // пыль в луче — индикатор заметности
    /* состояния */
    hidden: false,
    hiddenIn: null,
    breathSkill: 0,
    interactTarget: null,
    catches: 0,
    selfLight: null,          // конус собственного фонаря для расчёта заметности
  };
}

export function playerSpeed(p) {
  return MOVE[p.stance.toUpperCase()].speed;
}

export function moveProfile(p) {
  return MOVE[p.stance.toUpperCase()];
}

/**
 * Движение игрока с коллизиями и эмиссией шума шагов.
 * @returns {{steps: {x:number,y:number,intensity:number}[]}}
 */
export function updatePlayer(p, dt, input, grid, occluders, level) {
  const steps = [];

  if (p.hidden) {
    // в укрытии: движение невозможно, шум — только от дыхания
    p.vx = 0; p.vy = 0; p.moving = false;
    p.noiseLevel = Math.max(0, p.noiseLevel - dt * 40);
    return { steps };
  }

  let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(ix, iy);
  p.moving = len > 0.01;
  if (p.moving) { ix /= len; iy /= len; }

  // выбор профиля движения
  const wantStance = input.run && p.stamina > 0.05 && p.moving ? 'run'
    : input.crouch ? 'crouch' : 'walk';
  p.stance = wantStance;
  const prof = moveProfile(p);
  p.speed = prof.speed;

  if (prof.stamina > 0 && p.moving) p.stamina = clamp(p.stamina - (prof.stamina / 100) * dt, 0, 1);
  else p.stamina = clamp(p.stamina + dt * 0.16, 0, 1);

  const step = p.speed * dt;
  // Оси обрабатываются раздельно — иначе не будет скольжения вдоль стен.
  let nx = positionFree(p.x + ix * step, p.y, p.r, grid) ? p.x + ix * step : p.x;
  let ny = positionFree(nx, p.y + iy * step, p.r, grid) ? p.y + iy * step : p.y;
  if (Math.abs(nx - p.x) < 0.01 && Math.abs(ny - p.y) < 0.01 && p.moving) {
    // упёрся в стену: скрежет — чуть громче шага
    p.noiseLevel = Math.max(p.noiseLevel, 12);
  }
  p.x = nx;
  p.y = ny;

  if (p.moving) {
    p.angle = Math.atan2(iy, ix);
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = prof.interval;
      // материал пола усиливает/гасит шаг (§0.4B)
      const tx = pxToTile(p.x);
      const ty = pxToTile(p.y);
      const mat = level.grid.material(tx, ty);
      const matBonus = mat.id === 4 ? 8 : mat.id === 3 || mat.id === 6 ? -12 : mat.id === 5 ? -16 : 0;
      const intensity = clamp(prof.intensity + matBonus, 6, 100);
      grid.emit(p.x, p.y, intensity, { owner: p, kind: 'step', ttl: 1.1 });
      steps.push({ x: p.x, y: p.y, intensity });
      p.noiseLevel = intensity;
      p.lastNoise = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    }
  } else {
    p.stepTimer = Math.min(p.stepTimer, 0.12);
    p.noiseLevel = Math.max(0, p.noiseLevel - dt * 45);
  }

  // фонарь: батарея + мерцание
  if (p.lightOn) {
    p.battery = clamp(p.battery - FLASHLIGHT.drainPerSec * dt, 0, 1);
    if (p.battery <= 0) p.lightOn = false;
    p.lightFlicker = 0.9 + Math.random() * 0.1;
  }

  // пыль в луче света (§0.4C) — растёт от быстрого движения
  const targetDust = p.moving ? (p.stance === 'run' ? 1 : p.stance === 'walk' ? 0.45 : 0.15) : 0;
  p.dust += (targetDust - p.dust) * Math.min(1, dt * 2.2);

  return { steps };
}

/** Кандидат допустим, если круг игрока не задевает непроходимые тайлы. */
function positionFree(x, y, r, grid) {
  const tx = pxToTile(x);
  const ty = pxToTile(y);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = tx + dx;
      const cy = ty + dy;
      if (!inBounds(cx, cy)) return false;
      if (grid.isWalkable(cx, cy)) continue;
      if (circleRectCollide(x, y, r, cx * 40, cy * 40, 40, 40)) return false;
    }
  }
  return true;
}



/** Конус собственного фонаря (нужен light.js для расчёта заметности). */
export function playerLightCone(p) {
  if (!p.lightOn || p.battery <= 0) return null;
  return {
    x: p.x, y: p.y, angle: p.angle,
    coneHalf: (FLASHLIGHT.coneHalfDeg * Math.PI) / 180,
    range: FLASHLIGHT.range,
    intensity: FLASHLIGHT.brightness * p.lightFlicker * (0.35 + 0.65 * p.battery),
  };
}

/** Заметность игрока: свет × стойка × пыль. */
export function exposureState(p, lightLevel) {
  const stanceFactor = p.stance === 'crouch' ? 0.52 : p.stance === 'run' ? 1.18 : 1;
  return {
    stanceFactor,
    lightExposure: clamp(lightLevel, 0, 1.4),
  };
}

export function addItem(p, kind, amount = 1) {
  if (kind === 'junk') p.inv.junk += amount;
  else if (kind === 'pages') p.inv.pages += amount;
  else if (kind === 'firefly') p.inv.fireflies += amount;
  else if (kind === 'bandage') p.inv.bandages += amount;
}

export function canCraft(p, recipe) {
  if (recipe.needsBlueprint && !p.blueprints[recipe.id]) return { ok: false, why: 'нужен чертёж' };
  if ((recipe.needs.junk || 0) > p.inv.junk) return { ok: false, why: 'мало хлама' };
  if ((recipe.needs.pages || 0) > p.inv.pages) return { ok: false, why: 'мало страниц' };
  return { ok: true };
}

/** Сжечь книгу: тепло + свет-отвлечение, но знание утрачено навсегда (§0.4A). */
export function burnBook(p, book) {
  p.archive.burned.push(book.name);
  p.inv.pages += Math.round((book.pages || 60) * 0.4);
  if (book.rare) {
    p.archive.rareBurned = true;
  }
}

export function readBook(p, book) {
  p.archive.read.push(book.name);
  if (book.blueprint) p.blueprints[book.blueprint] = true;
  if (book.rare) p.archive.rareRead = true;
  p.inv.pages += Math.round((book.pages || 60) * 0.5);
}

export function serializePlayer(p) {
  return {
    x: p.x, y: p.y, angle: p.angle, stance: p.stance, health: p.health, stamina: p.stamina,
    lightOn: p.lightOn, battery: p.battery,
    inv: JSON.parse(JSON.stringify(p.inv)),
    blueprints: { ...p.blueprints },
    archive: JSON.parse(JSON.stringify(p.archive)),
    catches: p.catches,
  };
}

export function restorePlayer(p, s) {
  if (!s) return;
  Object.assign(p, {
    x: s.x, y: s.y, angle: s.angle, stance: s.stance, health: s.health, stamina: s.stamina,
    lightOn: s.lightOn, battery: s.battery, catches: s.catches || 0,
  });
  p.inv = s.inv;
  p.blueprints = s.blueprints || {};
  p.archive = s.archive || p.archive;
  p.hidden = false;
  p.hiddenIn = null;
}

export { dist, CRAFT_RECIPES as RECIPES };
