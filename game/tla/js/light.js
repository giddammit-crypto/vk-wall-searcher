/**
 * THE LAST ARCHIVE — PoC-прототип
 * light.js — СВЕТ КАК ВАЛЮТА (§0.4E) + честная окклюзия стеллажами (§1.2, §2.2).
 *
 *  - rayBlocked / losClear — луч против списка прямоугольников-окклюдеров;
 *  - shadowQuads — силуэтные квады тени от окклюдера (рисуются в light-слой
 *    режимом destination-out → мягкая тень от стеллажей);
 *  - visibilityAt — насколько игрок «читается» в текущей точке: сумма света
 *    зон + фонарь игрока + фонарь врагов + пыль в луче + споры.
 *
 * Модуль чистый (без DOM).
 */

import { clamp, segRectT, angDiff, VISION_BASE } from './core.js';

/** Есть ли непрозрачное препятствие на отрезке. */
export function rayBlocked(x1, y1, x2, y2, occluders) {
  for (let i = 0; i < occluders.length; i++) {
    const o = occluders[i];
    const t = segRectT(x1, y1, x2, y2, o.x, o.y, o.w, o.h);
    if (t !== null && t < 1) return true;
  }
  return false;
}

export function losClear(x1, y1, x2, y2, occluders) {
  return !rayBlocked(x1, y1, x2, y2, occluders);
}

/**
 * Силуэтные квады тени: для каждого ребра окклюдера, отвёрнутого от источника,
 * строим четырёхугольник «ребро → далеко за источник».
 */
export function shadowQuads(lx, ly, occluders, far = 2600) {
  const quads = [];
  for (const o of occluders) {
    const corners = [
      { x: o.x, y: o.y },
      { x: o.x + o.w, y: o.y },
      { x: o.x + o.w, y: o.y + o.h },
      { x: o.x, y: o.y + o.h },
    ];
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    // рёбра, чья внешняя нормаль смотрит «от» источника
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      // внешняя нормаль (по часовой для порядка углов выше)
      let nx = ey;
      let ny = -ex;
      if (nx * (cx - a.x) + ny * (cy - a.y) > 0) { nx = -nx; ny = -ny; }
      const toLightX = lx - (a.x + b.x) / 2;
      const toLightY = ly - (a.y + b.y) / 2;
      if (nx * toLightX + ny * toLightY >= 0) continue; // ребро освещено — тени нет
      const pa = extend(lx, ly, a.x, a.y, far);
      const pb = extend(lx, ly, b.x, b.y, far);
      quads.push([a, b, pb, pa]);
    }
  }
  return quads;
}

function extend(lx, ly, px, py, far) {
  let dx = px - lx;
  let dy = py - ly;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  return { x: px + dx * far, y: py + dy * far };
}

/**
 * Освещённость точки 0..1: статические зоны + конус фонаря игрока + фонари врагов.
 * @param {{x,y,radius,intensity,color,flicker?}[]} zoneLights
 * @param {{x,y,angle,coneHalf,range,intensity}|null} playerLight
 * @param {{x,y,angle,coneHalf,range,intensity}[]} enemyLights
 */
export function lightLevelAt(x, y, zoneLights, playerLight, enemyLights) {
  let lvl = 0.05; // базовый полумрак — «почти никогда не чёрный» (§1.2)
  for (const l of zoneLights) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < l.radius) {
      const f = 1 - d / l.radius;
      lvl += l.intensity * f * f * (l.flicker ?? 1);
    }
  }
  if (playerLight && playerLight.intensity > 0) {
    const d = Math.hypot(playerLight.x - x, playerLight.y - y);
    if (d < playerLight.range) {
      const a = Math.atan2(y - playerLight.y, x - playerLight.x);
      if (Math.abs(angDiff(a, playerLight.angle)) < playerLight.coneHalf) {
        lvl += playerLight.intensity * (1 - d / playerLight.range) * 0.95;
      }
    }
  }
  if (enemyLights) {
    for (const l of enemyLights) {
      const d = Math.hypot(l.x - x, l.y - y);
      if (d >= l.range) continue;
      const a = Math.atan2(y - l.y, x - l.x);
      if (Math.abs(angDiff(a, l.angle)) >= l.coneHalf) continue;
      lvl += l.intensity * (1 - d / l.range) * 0.9;
    }
  }
  return clamp(lvl, 0, 1.4);
}

/**
 * Заметность игрока для конкретного наблюдателя.
 * Чем выше — тем легче заметить; сравнение с порогом делает вызывающий код.
 */
export function visibilityFor(viewer, target, opts) {
  const {
    zoneLights, playerLightOn, enemyLights, dustFactor = 0, sporeFactor = 0,
  } = opts;
  const d = Math.hypot(viewer.x - target.x, viewer.y - target.y);
  if (d > viewer.sightRange) return 0;

  const a = Math.atan2(target.y - viewer.y, target.x - viewer.x);
  const half = (viewer.fovDeg * Math.PI) / 360;
  const offAxis = Math.abs(angDiff(a, viewer.angle));
  if (offAxis > half) return 0;

  const coneF = 1 - (offAxis / half) * 0.65;
  const distF = 1 - (d / viewer.sightRange) * 0.72;

  const lvl = lightLevelAt(
    target.x, target.y, zoneLights,
    playerLightOn ? target.selfLight : null,
    enemyLights,
  );

  const stance = target.stanceFactor ?? 1;
  const exposure = target.lightExposure ?? 0.05;
  let v = lvl * (0.5 + exposure) * coneF * distF * stance;
  v *= 1 + dustFactor * 0.45;   // пыль в луче выдаёт движение (§0.4C)
  v *= 1 + sporeFactor * 0.25;
  return clamp(v, 0, 3);
}

export const DEFAULT_VISION_THRESHOLD = VISION_BASE;

/** Точка попадает в конус? */
export function inCone(cx, cy, angle, coneHalf, range, x, y) {
  const d = Math.hypot(x - cx, y - cy);
  if (d > range) return false;
  const a = Math.atan2(y - cy, x - cx);
  return Math.abs(angDiff(a, angle)) <= coneHalf;
}
