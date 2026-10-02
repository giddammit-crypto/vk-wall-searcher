/**
 * THE LAST ARCHIVE — PoC-прототип
 * ai.js — поиск пути + FSM врагов (§2.2: patrol → investigate → hunt → lost).
 *
 * Враги подписаны на акустическую сетку, а не друг на друга: слух — это
 * выборка loudness в своей клетке, зрение — конус + raycast-окклюзия.
 * Модуль чистый (без DOM) — тестируется headless.
 */

import {
  MAP_W, MAP_H, clamp, angDiff, pxToTile, tileToPx, inBounds, dist, ENEMY_TYPES,
} from './core.js';
import { stepCost } from './acoustics.js';
import { losClear, visibilityFor } from './light.js';

const NB8 = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * A* по тайлам. `cautious` — враг избегает шумных материалов (крадётся по ковру).
 * @returns {{x:number,y:number}[]} путь в мировых координатах (включая цель)
 */
export function findPath(grid, sx, sy, gx, gy, opts = {}) {
  const stx = pxToTile(sx);
  const sty = pxToTile(sy);
  let gtx = pxToTile(gx);
  let gty = pxToTile(gy);

  // цель может оказаться в недоступной клетке (игрок у шкафа) — ищем ближайшую проходимую
  if (!grid.isWalkable(gtx, gty)) {
    const near = nearestWalkable(grid, gtx, gty);
    if (!near) return [];
    gtx = near.x; gty = near.y;
  }
  if (!inBounds(stx, sty) || !inBounds(gtx, gty)) return [];
  if (stx === gtx && sty === gty) return [{ x: gx, y: gy }];

  const cautious = !!opts.cautious;
  const size = MAP_W * MAP_H;
  const gScore = new Float32Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new BinaryHeap(size);

  const start = sty * MAP_W + stx;
  const goal = gty * MAP_W + gtx;
  gScore[start] = 0;
  open.push(start, heur(stx, sty, gtx, gty));

  let guard = 0;
  while (open.size && guard++ < 60000) {
    const cur = open.pop();
    if (cur === goal) return reconstruct(cameFrom, cur, gx, gy);
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % MAP_W;
    const cy = (cur / MAP_W) | 0;

    for (let i = 0; i < NB8.length; i++) {
      const nx = cx + NB8[i][0];
      const ny = cy + NB8[i][1];
      if (!inBounds(nx, ny)) continue;
      const nIdx = ny * MAP_W + nx;
      if (closed[nIdx]) continue;
      const mat = grid.matAt(nx, ny);
      if (!grid.isWalkable(nx, ny)) continue;
      // диагональ между двумя стенами — запрещена
      if (NB8[i][2] > 1) {
        if (!grid.isWalkable(cx + NB8[i][0], cy) || !grid.isWalkable(cx, cy + NB8[i][1])) continue;
      }
      let cost = NB8[i][2] * (cautious ? stepCost(mat) : 1);
      const tent = gScore[cur] + cost;
      if (tent < gScore[nIdx]) {
        gScore[nIdx] = tent;
        cameFrom[nIdx] = cur;
        open.push(nIdx, tent + heur(nx, ny, gtx, gty));
      }
    }
  }
  return [];
}

function heur(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

function reconstruct(cameFrom, cur, gx, gy) {
  const pts = [];
  let node = cur;
  while (node !== -1) {
    pts.push({ x: tileToPx(node % MAP_W), y: tileToPx((node / MAP_W) | 0) });
    node = cameFrom[node];
  }
  pts.reverse();
  pts[pts.length - 1] = { x: gx, y: gy };
  return pts;
}

/** Ближайшая проходимая клетка по спирали. */
export function nearestWalkable(grid, tx, ty) {
  for (let r = 0; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (inBounds(nx, ny) && grid.isWalkable(nx, ny)) return { x: nx, y: ny };
      }
    }
  }
  return null;
}

/** Индексированная бинарная куча для A*. */
class BinaryHeap {
  constructor(capacity) {
    this.keys = new Int32Array(capacity + 1);
    this.prio = new Float32Array(capacity + 1);
    this.n = 0;
  }
  get size() { return this.n; }
  push(key, prio) {
    if (this.n + 2 >= this.keys.length) this._grow();
    let i = ++this.n;
    while (i > 1) {
      const p = i >> 1;
      if (this.prio[p] <= prio) break;
      this.keys[i] = this.keys[p];
      this.prio[i] = this.prio[p];
      i = p;
    }
    this.keys[i] = key;
    this.prio[i] = prio;
  }
  pop() {
    const top = this.keys[1];
    const key = this.keys[this.n];
    const prio = this.prio[this.n];
    this.n--;
    let i = 1;
    if (this.n > 0) {
      for (;;) {
        const l = i << 1;
        const r = l + 1;
        let m = i;
        if (l <= this.n && this.prio[l] < this.prio[m]) m = l;
        if (r <= this.n && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.keys[i] = this.keys[m];
        this.prio[i] = this.prio[m];
        i = m;
      }
      this.keys[i] = key;
      this.prio[i] = prio;
    }
    return top;
  }

  _grow() {
    const nk = new Int32Array(this.keys.length * 2);
    const np = new Float32Array(this.prio.length * 2);
    nk.set(this.keys); np.set(this.prio);
    this.keys = nk; this.prio = np;
  }
}

/* --------------------------------------------------------------------- FSM */

export const STATES = { PATROL: 'patrol', INVESTIGATE: 'investigate', HUNT: 'hunt', LOST: 'lost' };

export class Enemy {
  constructor(def, spawn, patrol) {
    const t = ENEMY_TYPES[def];
    this.type = def;
    this.def = t;
    this.x = spawn.x;
    this.y = spawn.y;
    this.angle = 0;
    this.state = STATES.PATROL;
    this.patrol = patrol.slice();
    this.patrolIndex = 0;
    this.path = [];
    this.target = null;          // куда идём сейчас
    this.memory = null;          // последняя известная позиция игрока
    this.memoryAge = 0;
    this.stateTime = 0;
    this.alertness = 0;          // 0..1 — для UI «меня заметили?»
    this.searchTimer = 0;
    this.thermalLock = 0;
    this.speed = t.speedWalk;
    this.id = `${def}-${Math.round(spawn.x)}-${Math.round(spawn.y)}`;
    this.flashlight = t.light ? { ...t.light, intensity: t.light.brightness } : null;
    this.lastSeen = null;
  }

  get sightRange() { return this.def.sightRange; }
  get fovDeg() { return this.def.fovDeg; }

  hearThreshold(grid) {
    return Math.max(8, 30 - this.def.hearBonus + grid.thresholdBonus);
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
  }

  /**
   * @param {object} ctx {dt, player, grid, occluders, zoneLights, enemyLights,
   *   rain, sporeFactor, playerHidden, onDetect, onNoiseHeard}
   */
  update(ctx) {
    const { dt, player, grid, occluders } = ctx;
    this.stateTime += dt;
    this.alertness = Math.max(0, this.alertness - dt * 0.35);

    this._sense(ctx);
    this._think(ctx);
    this._move(ctx);
  }

  /* ---------------------------------------------------------- восприятие */
  _sense(ctx) {
    const { player, grid, occluders, playerHidden } = ctx;

    // --- СЛУХ: выборка поля громкости в своей клетке
    const loud = grid.loudnessAt(this.x, this.y);
    const th = this.hearThreshold(grid);
    if (loud >= th) {
      const heard = grid.loudestWithin(th, this.x, this.y);
      if (heard) {
        this.alertness = Math.min(1, this.alertness + 0.5);
        this.memory = { x: heard.ev.wx, y: heard.ev.wy, age: 0, isDecoy: heard.ev.isDecoy };
        this.memoryAge = 0;
        if (heard.ev.isDecoy) {
          // эхо/обманка: идём проверять НЕВЕРНУЮ точку (§0.4B)
          this.setState(STATES.INVESTIGATE);
          this._goTo(this.memory.x, this.memory.y, grid, true);
        } else if (heard.loudness > th + 22) {
          this.setState(STATES.HUNT);
          this._goTo(player.x, player.y, grid, true);
        } else {
          this.setState(STATES.INVESTIGATE);
          this._goTo(this.memory.x, this.memory.y, grid, true);
        }
        if (ctx.onNoiseHeard) ctx.onNoiseHeard(this, heard);
      }
    }

    // --- ЗРЕНИЕ: конус + окклюзия стеллажами
    if (!this.def.blind && !playerHidden) {
      const v = visibilityFor(this, player, {
        zoneLights: ctx.zoneLights,
        playerLightOn: ctx.playerLightOn,
        enemyLights: ctx.enemyLights,
        dustFactor: ctx.dustFactor || 0,
        sporeFactor: ctx.sporeFactor || 0,
      });
      if (v > 0) this.alertness = Math.min(1, this.alertness + v * 0.6);
      const sees = v > (ctx.visionThreshold || 0.155)
        && losClear(this.x, this.y, player.x, player.y, occluders);
      if (sees) {
        this.memory = { x: player.x, y: player.y, age: 0, isDecoy: false };
        this.memoryAge = 0;
        this.lastSeen = { x: player.x, y: player.y };
        this.alertness = 1;
        this.setState(STATES.HUNT);
        this._goTo(player.x, player.y, grid, true);
        if (ctx.onDetect) ctx.onDetect(this);
      }
    }

    // --- ТЕПЛОВОЙ СЛЕД в спорах (§0.4C): риск/награда за прятки в облаке
    if (this.def.thermal && ctx.sporeFactor > 0.15 && !playerHidden) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < this.def.thermalRange) {
        this.thermalLock += ctx.dt * 0.9;
        if (this.thermalLock > 0.7) {
          this.memory = { x: player.x, y: player.y, age: 0, isDecoy: false };
          this.setState(STATES.HUNT);
          this._goTo(player.x, player.y, grid, true);
        }
      } else {
        this.thermalLock = Math.max(0, this.thermalLock - ctx.dt);
      }
    } else {
      this.thermalLock = Math.max(0, this.thermalLock - ctx.dt * 0.5);
    }
  }

  /* ------------------------------------------------------------ логика */
  _think(ctx) {
    const { dt, grid } = ctx;
    if (this.memory) this.memoryAge += dt;

    switch (this.state) {
      case STATES.PATROL:
        this.speed = this.def.speedWalk;
        if (!this.path.length) this._nextPatrolPoint(grid);
        break;

      case STATES.INVESTIGATE:
        this.speed = this.def.speedWalk * 1.25;
        if (this._arrived()) {
          // дошли до точки: короткое «ослушивание» и возврат к патрулю
          this.searchTimer += dt;
          this.angle += dt * 1.1; // вертим головой
          if (this.searchTimer > 2.2) {
            this.searchTimer = 0;
            this.memory = null;
            this.setState(STATES.PATROL);
          }
        }
        break;

      case STATES.HUNT:
        this.speed = this.def.speedHunt;
        if (this.memory && this.memoryAge < 0.35) {
          this._goTo(this.memory.x, this.memory.y, grid, true);
        }
        if (this._arrived() || (this.memory && this.memoryAge > 1.4)) {
          this.searchTimer += dt;
          if (this.searchTimer > this.def.huntTime * 0.25 || !this.memory) {
            this.setState(STATES.LOST);
            this.searchTimer = 0;
          }
        }
        break;

      case STATES.LOST:
        this.speed = this.def.speedWalk * 1.1;
        this.searchTimer += dt;
        if (this.searchTimer > 1.1) {
          // обход точек вокруг последней известной позиции
          this._searchAround(grid);
          this.searchTimer = 0;
        }
        if (this.stateTime > this.def.loseTime) {
          this.memory = null;
          this.setState(STATES.PATROL);
        }
        break;
    }
  }

  _searchAround(grid) {
    const base = this.memory || { x: this.x, y: this.y };
    const tx = pxToTile(base.x);
    const ty = pxToTile(base.y);
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 4;
      const nx = Math.round(tx + Math.cos(a) * r);
      const ny = Math.round(ty + Math.sin(a) * r);
      if (inBounds(nx, ny) && grid.isWalkable(nx, ny)) {
        this._goTo(tileToPx(nx), tileToPx(ny), grid, false);
        return;
      }
    }
    this.setState(STATES.PATROL);
  }

  _nextPatrolPoint(grid) {
    if (!this.patrol.length) return;
    this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
    const p = this.patrol[this.patrolIndex];
    this._goTo(p.x, p.y, grid, false);
  }

  _goTo(x, y, grid, urgent) {
    const p = findPath(grid, this.x, this.y, x, y, { cautious: !urgent });
    if (p.length) {
      this.path = p;
      this.target = { x, y };
    }
  }

  _arrived() {
    if (!this.path.length) return true;
    const last = this.path[this.path.length - 1];
    return dist(this.x, this.y, last.x, last.y) < 18;
  }

  /* ----------------------------------------------------------- движение */
  _move(ctx) {
    const { dt, grid, occluders, onReachPlayer, player } = ctx;
    if (this.path.length) {
      const next = this.path[0];
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.path.shift();
      } else {
        const want = Math.atan2(dy, dx);
        this.angle = want;
        const step = this.speed * dt;
        const nx = this.x + Math.cos(want) * step;
        const ny = this.y + Math.sin(want) * step;
        if (!blocked(grid, occluders, nx, ny, this.def.radius)) {
          this.x = nx; this.y = ny;
        } else if (!blocked(grid, occluders, nx, this.y, this.def.radius)) {
          this.x = nx;
        } else if (!blocked(grid, occluders, this.x, ny, this.def.radius)) {
          this.y = ny;
        } else {
          this.path.shift(); // тупик — пересчитаем на следующем тике
        }
        // шум собственных шагов: враг тоже слышим (игрок может играть на этом)
        if (Math.random() < dt * 1.8) {
          grid.emit(this.x, this.y, this.state === STATES.HUNT ? 44 : 26, { owner: this, kind: 'enemyStep', ttl: 0.8 });
        }
      }
    }
    if (onReachPlayer && dist(this.x, this.y, player.x, player.y) < this.def.radius + 14) {
      onReachPlayer(this);
    }
  }

  serialize() {
    return {
      id: this.id, type: this.type, x: this.x, y: this.y, angle: this.angle,
      state: this.state, patrolIndex: this.patrolIndex, alertness: this.alertness,
      memory: this.memory, memoryAge: this.memoryAge,
    };
  }

  restore(s) {
    if (!s) return;
    this.x = s.x; this.y = s.y; this.angle = s.angle;
    this.state = s.state || STATES.PATROL;
    this.patrolIndex = s.patrolIndex || 0;
    this.alertness = s.alertness || 0;
    this.memory = s.memory || null;
    this.memoryAge = s.memoryAge || 0;
    this.path = [];
  }
}

function blocked(grid, occluders, x, y, r) {
  const tx = pxToTile(x);
  const ty = pxToTile(y);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = tx + dx;
      const cy = ty + dy;
      if (!inBounds(cx, cy)) return true;
      if (!grid.isWalkable(cx, cy)) {
        // простая проверка круга против клетки
        const rx = cx * 40;
        const ry = cy * 40;
        const nx = clamp(x, rx, rx + 40);
        const ny = clamp(y, ry, ry + 40);
        if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
      }
    }
  }
  return false;
}

/** Угол «взгляда» для конуса (вспомогательно для тестов). */
export function facingAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export { angDiff };
