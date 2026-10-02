/**
 * THE LAST ARCHIVE — PoC-прототип
 * acoustics.js — АКУСТИЧЕСКАЯ СЕТКА (модуль риска №1 по §4 плана).
 *
 * Модель (§0.4B, §2.2):
 *  - шум — эфемерное событие {x, y, intensity, ttl};
 *  - распространение = волновой Dijkstra по тайлам: стоимость прохода
 *    cost = 1 + abs(материал тайла), громкость L = I - cost, L <= 0 → не слышно;
 *  - стены (abs=99) — полный экран, стеллажи — сильный поглотитель;
 *  - купольные тайлы дают ЭХО: отложенный «фантомный» источник в зеркальной
 *    точке зала, из-за которого враги проверяют неверное место;
 *  - дождь гасит распространение и поднимает порог слышимости.
 *
 * Модуль чистый (без DOM) — тестируется в headless-режиме.
 */

import { MAP_W, MAP_H, MAT, MATERIALS, TILE, pxToTile, tileToPx, inBounds, HEARING, ECHO } from './core.js';

/** Вес дистанции: 1 тайл = DIST_PENALTY «децибел» + поглощение материала. */
export const DIST_PENALTY = 6.2;

const NEIGHBORS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Простейшая бинарная куча для Dijkstra (без внешних зависимостей). */
/**
 * Бинарная min-куча. ВАЖНО: физический массив не уменьшается при pop(),
 * поэтому размер храним отдельно (иначе a.length всегда 1 и волна обрывается).
 */
class MinHeap {
  constructor() { this.a = []; this.n = 0; }
  get size() { return this.n; }
  push(item) {
    const a = this.a;
    const i = this.n++;
    a[i] = item;
    let k = i;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (a[p][0] <= a[k][0]) break;
      const t = a[p]; a[p] = a[k]; a[k] = t;
      k = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a[--this.n];
    if (this.n > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.n && a[l][0] < a[m][0]) m = l;
        if (r < this.n && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        const t = a[m]; a[m] = a[i]; a[i] = t;
        i = m;
      }
    }
    return top;
  }
}

export class AcousticGrid {
  /**
   * @param {Uint8Array} mats материалы тайлов (MAP_W*MAP_H)
   * @param {{echo:boolean, cx:number, cy:number}[]} [echoZones] купольные зоны
   */
  constructor(mats, echoZones = []) {
    this.mats = mats;
    this.echoZones = echoZones;
    this.field = new Float32Array(MAP_W * MAP_H); // накопленная слышимая громкость
    this.events = [];   // активные источники шума
    this.echoQueue = [];
    this.rain = 0;      // 0..1 интенсивность дождя
    this._best = new Float64Array(MAP_W * MAP_H);
  }

  matAt(tx, ty) { return inBounds(tx, ty) ? this.mats[ty * MAP_W + tx] : MAT.WALL; }

  material(tx, ty) { return MATERIALS[this.matAt(tx, ty)] || MATERIALS[MAT.WALL]; }

  isWalkable(tx, ty) { return this.material(tx, ty).walkable; }

  isOpaque(tx, ty) { return this.material(tx, ty).opaque; }

  setRain(v) { this.rain = v; }

  /** Дождевая поправка: чем сильнее дождь, тем тише мир (§0.4B «окна тишины»). */
  get atten() { return 1 - (1 - HEARING.rainAttenuation) * this.rain; }
  get thresholdBonus() { return HEARING.rainThresholdBonus * this.rain; }

  /**
   * Создать событие шума.
   * @param {number} wx мировая X
   * @param {number} wy мировая Y
   * @param {number} intensity 0..100
   * @param {object} [opts] {ttl, owner, echo, decoy}
   */
  emit(wx, wy, intensity, opts = {}) {
    if (intensity <= 0) return null;
    const tx = pxToTile(wx);
    const ty = pxToTile(wy);
    const ev = {
      wx, wy, tx, ty,
      intensity: intensity * this.atten,
      ttl: opts.ttl ?? 1.15,
      owner: opts.owner ?? null,
      isDecoy: !!opts.decoy,
      kind: opts.kind || 'step',
    };
    this.events.push(ev);
    if (!opts.decoy) this._scheduleEcho(tx, ty, ev.intensity);
    return ev;
  }

  /** Эхо купольных залов: зеркальный «фантом» источника (§0.4B). */
  _scheduleEcho(tx, ty, intensity) {
    if (intensity < ECHO.minLoudness) return;
    for (const z of this.echoZones) {
      if (tx < z.x0 || tx > z.x1 || ty < z.y0 || ty > z.y1) continue;
      const mx = Math.round((z.x0 + z.x1) / 2);
      const my = Math.round((z.y0 + z.y1) / 2);
      const ex = Math.round(mx + (mx - tx));
      const ey = Math.round(my + (my - ty));
      if (!inBounds(ex, ey) || !this.isWalkable(ex, ey)) continue;
      this.echoQueue.push({
        t: ECHO.delay,
        wx: tileToPx(ex),
        wy: tileToPx(ey),
        intensity: intensity * ECHO.intensityFactor,
      });
      return;
    }
  }

  /** Пересчитать накопленное поле громкости по всем активным событиям. */
  update(dt) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i];
      ev.ttl -= dt;
      if (ev.ttl <= 0) this.events.splice(i, 1);
    }
    for (let i = this.echoQueue.length - 1; i >= 0; i--) {
      const e = this.echoQueue[i];
      e.t -= dt;
      if (e.t <= 0) {
        this.echoQueue.splice(i, 1);
        this.emit(e.wx, e.wy, e.intensity, { decoy: true, kind: 'echo', ttl: 1.3 });
      }
    }
    this.recompute();
  }

  /** Волна распространения от всех источников (Dijkstra по стоимости тайлов). */
  recompute() {
    const field = this.field;
    field.fill(0);
    for (const ev of this.events) {
      this._flood(ev.tx, ev.ty, ev.intensity);
      const peak = Math.min(ev.intensity, 100);
      const idx = ev.ty * MAP_W + ev.tx;
      if (peak > field[idx]) field[idx] = peak;
    }
  }

  _flood(tx, ty, intensity) {
    const best = this._best;
    best.fill(Infinity);
    const heap = new MinHeap();
    const startIdx = ty * MAP_W + tx;
    best[startIdx] = 0;
    heap.push([0, tx, ty]);
    const field = this.field;
    const mats = this.mats;

    let pops = 0;
    while (heap.size) {
      const top = heap.pop();
      pops++;
      const c = top[0];
      const cx = top[1];
      const cy = top[2];
      const cIdx = cy * MAP_W + cx;
      // best — Float32Array: строгое сравнение отбросило бы узел из-за
      // округления (4.6 > 4.5999999), поэтому допуск EPS.
      if (c > best[cIdx] + 1e-4) continue;
      const loud = intensity - c;
      if (loud > field[cIdx]) field[cIdx] = loud;
      if (loud <= 1) continue;

      for (let n = 0; n < NEIGHBORS.length; n++) {
        const nx = cx + NEIGHBORS[n][0];
        const ny = cy + NEIGHBORS[n][1];
        if (!inBounds(nx, ny)) continue;
        const nIdx = ny * MAP_W + nx;
        const matId = mats[nIdx];
        if (matId === MAT.WALL) continue; // звук не проходит сквозь стену
        const absorb = MATERIALS[matId] ? MATERIALS[matId].abs : 0;
        const nc = c + NEIGHBORS[n][2] * DIST_PENALTY + absorb;
        if (intensity - nc <= 0) continue;
        if (nc < best[nIdx]) {
          best[nIdx] = nc;
          heap.push([nc, nx, ny]);
        }
      }
    }
  }

  /** Громкость в мировых координатах (для сенсоров слуха врагов). */
  loudnessAt(wx, wy) {
    const tx = pxToTile(wx);
    const ty = pxToTile(wy);
    if (!inBounds(tx, ty)) return 0;
    return this.field[ty * MAP_W + tx];
  }

  loudnessAtTile(tx, ty) {
    if (!inBounds(tx, ty)) return 0;
    return this.field[ty * MAP_W + tx];
  }

  /** Ближайшее активное событие, слышимое на пороге threshold (для FSM). */
  loudestWithin(threshold, wx, wy) {
    let best = null;
    for (const ev of this.events) {
      const l = this.loudnessAt(ev.wx, ev.wy);
      if (l < threshold) continue;
      const d = Math.hypot(ev.wx - wx, ev.wy - wy);
      if (!best || d < best.d) best = { ev, d, loudness: l };
    }
    return best;
  }

  /**
   * Маска «откуда меня слышно» для UI-индикатора (§3.2 п.2):
   * для каждой клетки — максимальный порог слуха, при котором шаг ещё слышен.
   * @returns {Float32Array} MAP_W*MAP_H
   */
  audibilityMask(wx, wy, intensity) {
    const mask = new Float32Array(MAP_W * MAP_H);
    const tx = pxToTile(wx);
    const ty = pxToTile(wy);
    const best = new Float64Array(MAP_W * MAP_H);
    best.fill(Infinity);
    const heap = new MinHeap();
    best[ty * MAP_W + tx] = 0;
    heap.push([0, tx, ty]);
    const I = intensity * this.atten;
    let pops = 0;
    while (heap.size) {
      const top = heap.pop();
      pops++;
      const c = top[0];
      const cx = top[1];
      const cy = top[2];
      const cIdx = cy * MAP_W + cx;
      if (c > best[cIdx] + 1e-4) continue;
      const loud = I - c;
      if (loud > 0) mask[cIdx] = loud;
      if (loud <= 1) continue;
      for (let n = 0; n < NEIGHBORS.length; n++) {
        const nx = cx + NEIGHBORS[n][0];
        const ny = cy + NEIGHBORS[n][1];
        if (!inBounds(nx, ny)) continue;
        const nIdx = ny * MAP_W + nx;
        const matId = this.mats[nIdx];
        if (matId === MAT.WALL) continue;
        const absorb = MATERIALS[matId] ? MATERIALS[matId].abs : 0;
        const nc = c + NEIGHBORS[n][2] * DIST_PENALTY + absorb;
        if (I - nc <= 0) continue;
        if (nc < best[nIdx]) { best[nIdx] = nc; heap.push([nc, nx, ny]); }
      }
    }
    return mask;
  }

  /** Радиус (в тайлах) слышимости шага данной интенсивности «в чистом поле». */
  static reachTiles(intensity, absorb = 0) {
    return Math.max(0, intensity / (DIST_PENALTY + absorb));
  }

  /** Серийное представление акустического состояния (для сейва). */
  serialize() {
    return {
      rain: this.rain,
      events: this.events.map((e) => ({
        wx: e.wx, wy: e.wy, intensity: e.intensity, ttl: e.ttl, kind: e.kind, isDecoy: e.isDecoy,
      })),
    };
  }

  restore(data) {
    if (!data) return;
    this.rain = data.rain ?? 0;
    this.events = (data.events || []).map((e) => ({
      ...e, tx: pxToTile(e.wx), ty: pxToTile(e.wy), owner: null,
    }));
    this.recompute();
  }
}

/** Стоимость прохода тайла для поиска пути (враги избегают «громких» полов). */
export function stepCost(matId) {
  switch (matId) {
    case MAT.CARPET: return 1;
    case MAT.GRASS: return 1.15;
    case MAT.WATER: return 1.6;
    case MAT.CONCRETE: return 1.05;
    case MAT.MARBLE: case MAT.DOME: return 1.25;
    case MAT.METAL: return 1.35;
    default: return 1.1; // паркет
  }
}

export const ACOUSTIC_TILE_PX = TILE;
