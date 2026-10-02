/**
 * THE LAST ARCHIVE — PoC-прототип
 * render.js — top-down ¾ рендер: три слоя света (§1.2), тени от окклюдеров,
 * туман войны «память карты», споры/дождь, шумовые круги, миникарта.
 */

import {
  TILE, MAP_W, MAP_H, WORLD_W, WORLD_H, MATERIALS, PALETTE, pxToTile, clamp, mulberry32,
} from './core.js';
import { shadowQuads } from './light.js';
import { STATES } from './ai.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 1 };
    this._floor = null;
    this._light = document.createElement('canvas');
    this._lightCtx = this._light.getContext('2d');
    this._fog = document.createElement('canvas');
    this._fogCtx = this._fog.getContext('2d');
    this._mini = document.createElement('canvas');
    this._miniCtx = this._mini.getContext('2d');
    this._miniDirty = true;
    this._audibility = null;
    this._audTimer = 0;
    this.time = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(320, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(240, Math.floor(rect.height * this.dpr));
    this._light.width = this.canvas.width;
    this._light.height = this.canvas.height;
    this._fog.width = this.canvas.width;
    this._fog.height = this.canvas.height;
  }

  /** Пре-рендер пола (один раз на уровень) — 60 FPS на среднем ПК (§3.2 Gate VS). */
  buildFloor(level) {
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const g = c.getContext('2d');
    const rng = mulberry32(7717);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const mat = level.grid.matAt(tx, ty);
        const M = MATERIALS[mat];
        const x = tx * TILE;
        const y = ty * TILE;
        g.fillStyle = M.color;
        g.fillRect(x, y, TILE, TILE);
        g.globalAlpha = 0.35;
        g.fillStyle = M.accent;
        switch (mat) {
          case 1: // паркет: доски
            for (let i = 0; i < 4; i++) {
              const oy = y + i * (TILE / 4) + (tx % 2 ? 4 : 0);
              g.fillRect(x + 1, oy, TILE - 2, 2);
            }
            break;
          case 2: case 8: // мрамор: прожилки
            g.fillRect(x + (rng() * TILE) | 0, y, 2, TILE);
            g.fillRect(x, y + (rng() * TILE) | 0, TILE, 2);
            break;
          case 3: // ковёр: ворс
            for (let i = 0; i < 6; i++) g.fillRect(x + rng() * TILE, y + rng() * TILE, 2, 2);
            break;
          case 5: // вода
            g.fillRect(x, y + 6 + (rng() * 20) | 0, TILE, 3);
            break;
          case 6: // плющ
            for (let i = 0; i < 8; i++) {
              g.beginPath();
              g.arc(x + rng() * TILE, y + rng() * TILE, 3 + rng() * 4, 0, Math.PI * 2);
              g.fill();
            }
            break;
          case 7: // бетон с плесенью
            for (let i = 0; i < 4; i++) g.fillRect(x + rng() * TILE, y + rng() * TILE, 4, 4);
            break;
          case 4: // металл: решётка
            g.fillRect(x + 6, y, 2, TILE);
            g.fillRect(x + TILE - 8, y, 2, TILE);
            g.fillRect(x, y + 6, TILE, 2);
            g.fillRect(x, y + TILE - 8, TILE, 2);
            break;
          default: break;
        }
        g.globalAlpha = 1;
        // сетка-фаска
        g.strokeStyle = 'rgba(0,0,0,0.28)';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
    this._floor = c;
  }

  markMinimapDirty() { this._miniDirty = true; }

  render(ctxState) {
    const { ctx: g } = this;
    const { level, player, enemies, rain, ripples, camera, visited, revealed, ui, particles } = ctxState;
    this.time += ctxState.dt;
    this.cam = camera;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const z = camera.zoom * this.dpr;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = PALETTE.dark0;
    g.fillRect(0, 0, W, H);

    g.save();
    g.translate(W / 2, H / 2);
    g.scale(z, z);
    g.translate(-camera.x, -camera.y);

    // 1. ПОЛ
    if (this._floor) g.drawImage(this._floor, 0, 0);

    // 2. споры / плющ / вода — «живое здание»
    this._drawPatches(g, level);

    // 3. предметы
    this._drawItems(g, level, player);

    // 4. стены и стеллажи (высокая мебель — окклюдеры)
    this._drawShelves(g, level);
    this._drawWalls(g, level);

    // 5. шумовые круги — игрок ВИДИТ, куда докатился звук (§0.2 pillar 1)
    this._drawRipples(g, ripples, level);

    // 6. персонажи
    for (const e of enemies) this._drawEnemy(g, e, player);
    this._drawPlayer(g, player);

    // 7. три слоя света (§1.2)
    this._drawLighting(g, ctxState, W, H, z);

    // 8. туман войны / память карты
    this._drawFog(g, ctxState, W, H, z);

    // 9. дождь
    if (rain > 0.02) this._drawRain(g, camera, W, H, z, rain);

    // 10. партиклы (искры, пыль)
    this._drawParticles(g, particles);

    g.restore();

    // 11. миникарта
    this._drawMinimap(g, ctxState, W);
  }

  /* ------------------------------------------------------------- слои */

  _drawPatches(g, level) {
    g.save();
    const t = this.time;
    for (const p of level.sporePatches) {
      const grad = g.createRadialGradient(
        p.x + p.w / 2, p.y + p.h / 2, 4,
        p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) * 0.7,
      );
      grad.addColorStop(0, 'rgba(143,160,90,0.34)');
      grad.addColorStop(1, 'rgba(92,102,54,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) * 0.7 + Math.sin(t * 0.8) * 6, 0, Math.PI * 2);
      g.fill();
    }
    for (const p of level.ivyPatches) {
      g.strokeStyle = 'rgba(94,125,76,0.5)';
      g.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const x = p.x + ((i * 37) % p.w);
        g.beginPath();
        g.moveTo(x, p.y + p.h);
        g.quadraticCurveTo(x + Math.sin(t * 0.4 + i) * 8, p.y + p.h / 2, x + 6, p.y);
        g.stroke();
      }
    }
    g.restore();
  }

  _drawItems(g, level, player) {
    g.save();
    // книги
    for (const b of level.books) {
      if (b.taken) continue;
      g.save();
      g.translate(b.x, b.y);
      g.rotate((b.id.charCodeAt(5) || 0) % 5 * 0.2 - 0.4);
      g.fillStyle = b.rare ? '#7A4A2B' : '#A08A5F';
      g.fillRect(-11, -7, 22, 14);
      g.fillStyle = b.rare ? '#C7D96B' : '#C9B48A';
      g.fillRect(-9, -5, 18, 10);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(-11, 5, 22, 2);
      if (b.rare) {
        g.strokeStyle = '#FFD9A0';
        g.lineWidth = 1.5;
        g.strokeRect(-13, -9, 26, 18);
      }
      g.restore();
    }
    // карточки каталога
    for (const c of level.cards) {
      if (c.taken) continue;
      g.save();
      g.translate(c.x, c.y + Math.sin(this.time * 2 + c.x) * 3);
      g.fillStyle = '#C9B48A';
      g.fillRect(-9, -6, 18, 12);
      g.strokeStyle = '#6B4A2F';
      g.lineWidth = 1;
      g.strokeRect(-9, -6, 18, 12);
      g.fillStyle = '#6B4A2F';
      g.fillRect(-6, -3, 12, 1);
      g.fillRect(-6, 0, 12, 1);
      g.restore();
    }
    // хлам
    for (const j of level.junk) {
      if (j.taken) continue;
      g.fillStyle = '#7A4A2B';
      g.fillRect(j.x - 6, j.y - 4, 12, 8);
      g.fillStyle = '#5D646B';
      g.fillRect(j.x - 3, j.y - 6, 6, 3);
    }
    // батарейки
    for (const b of level.batteries) {
      if (b.taken) continue;
      g.fillStyle = '#FFD9A0';
      g.fillRect(b.x - 5, b.y - 8, 10, 16);
      g.fillStyle = '#7A4A2B';
      g.fillRect(b.x - 2, b.y - 11, 4, 3);
    }
    // верстак
    const wb = level.propsById.workbench;
    g.fillStyle = '#6B4A2F';
    g.fillRect(wb.x - 26, wb.y - 18, 52, 36);
    g.fillStyle = '#8F6A3E';
    g.fillRect(wb.x - 22, wb.y - 14, 44, 28);
    g.fillStyle = '#5D646B';
    g.fillRect(wb.x - 14, wb.y - 8, 12, 5);
    g.fillRect(wb.x + 4, wb.y - 2, 14, 6);
    // жаровня
    const br = level.brazier;
    g.beginPath();
    g.arc(br.x, br.y, 20, 0, Math.PI * 2);
    g.fillStyle = '#4A3324';
    g.fill();
    g.beginPath();
    g.arc(br.x, br.y, 13, 0, Math.PI * 2);
    g.fillStyle = br.lit ? '#FFB25E' : '#241A12';
    g.fill();
    if (br.lit) {
      for (let i = 0; i < 5; i++) {
        const a = this.time * 3 + i;
        g.fillStyle = `rgba(255,178,94,${0.5 - i * 0.08})`;
        g.beginPath();
        g.arc(br.x + Math.cos(a) * 6, br.y - 6 - i * 4, 5 - i * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    // каталожный шкаф-укрытие
    const cab = level.propsById.cabinet;
    g.fillStyle = '#4A3324';
    g.fillRect(cab.x - 24, cab.y - 24, 48, 48);
    g.fillStyle = '#6B4A2F';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        g.fillRect(cab.x - 21 + c * 15, cab.y - 21 + r * 15, 13, 13);
      }
    }
    if (player.hidden) {
      g.strokeStyle = 'rgba(201,180,138,0.6)';
      g.lineWidth = 2;
      g.strokeRect(cab.x - 24, cab.y - 24, 48, 48);
    }
    // ворота пролома
    if (level.gate.closed) {
      const r = level.gate.rect;
      g.fillStyle = '#5D646B';
      g.fillRect(r.x, r.y, r.w, r.h);
      g.strokeStyle = '#7A4A2B';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(r.x + 4, r.y + 4);
      g.lineTo(r.x + r.w - 4, r.y + r.h - 4);
      g.moveTo(r.x + r.w - 4, r.y + 4);
      g.lineTo(r.x + 4, r.y + r.h - 4);
      g.stroke();
    }
    // выход
    const ex = level.exitZone.rect;
    g.fillStyle = 'rgba(159,184,216,0.16)';
    g.fillRect(ex.x, ex.y, ex.w, ex.h);
    g.strokeStyle = 'rgba(159,184,216,0.6)';
    g.setLineDash([6, 6]);
    g.lineWidth = 2;
    g.strokeRect(ex.x, ex.y, ex.w, ex.h);
    g.setLineDash([]);
    g.restore();
  }

  _drawShelves(g, level) {
    for (const s of level.shelves) {
      g.fillStyle = '#3A281C';
      g.fillRect(s.x, s.y + 4, s.w, s.h);
      g.fillStyle = '#4A3324';
      g.fillRect(s.x, s.y, s.w, s.h);
      // корешки книг
      const cells = Math.floor(s.w / 10);
      for (let i = 0; i < cells; i++) {
        const hue = [PALETTE.paper1, PALETTE.rust, PALETTE.woodHi, PALETTE.paper0][i % 4];
        g.fillStyle = hue;
        g.globalAlpha = 0.85;
        g.fillRect(s.x + 3 + i * 10, s.y + 5, 7, s.h - 10);
        g.globalAlpha = 1;
      }
      g.fillStyle = 'rgba(143,106,62,0.55)';
      g.fillRect(s.x, s.y, s.w, 3);
    }
  }

  _drawWalls(g, level) {
    const seen = new Set();
    for (const o of level.occluders) {
      const key = `${o.x},${o.y},${o.w},${o.h}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isGate = level.gate.rect === o;
      if (isGate) continue;
      g.fillStyle = '#0B0E13';
      g.fillRect(o.x + 3, o.y + 5, o.w, o.h);
      g.fillStyle = '#131A22';
      g.fillRect(o.x, o.y, o.w, o.h);
      g.fillStyle = '#1C2530';
      g.fillRect(o.x, o.y, o.w, 3);
    }
  }

  _drawRipples(g, ripples, level) {
    for (const r of ripples) {
      const life = r.ttl / r.maxTtl;
      const radius = (1 - life) * r.radius;
      g.strokeStyle = `rgba(${r.color},${(life * 0.55).toFixed(3)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(r.x, r.y, radius, 0, Math.PI * 2);
      g.stroke();
    }
  }

  _drawPlayer(g, p) {
    g.save();
    g.translate(p.x, p.y);
    // тень-блоб (§1.2: низкие предметы — мягкая тень)
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(2, 4, p.r + 3, (p.r + 3) * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    g.rotate(p.angle);
    const crouch = p.stance === 'crouch';
    const bodyR = crouch ? p.r - 3 : p.r;
    g.fillStyle = crouch ? '#3E5A3A' : '#C9B48A';
    g.beginPath();
    g.arc(0, 0, bodyR, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#6B4A2F';
    g.fillRect(bodyR - 4, -3, 8, 6); // направление взгляда
    if (p.lightOn) {
      g.fillStyle = '#FFD9A0';
      g.beginPath();
      g.arc(bodyR + 2, 0, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    if (p.hidden) {
      g.strokeStyle = 'rgba(201,180,138,0.8)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(p.x, p.y, p.r + 8 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
      g.stroke();
    }
  }

  _drawEnemy(g, e, player) {
    const t = ENEMY_LOOK[e.type] || { body: '#8FA05A', glow: '#C7D96B' };
    g.save();
    // конус зрения (для зрячих)
    if (!e.def.blind) {
      const half = (e.def.fovDeg * Math.PI) / 360;
      const grad = g.createRadialGradient(e.x, e.y, 8, e.x, e.y, e.def.sightRange);
      const alert = e.alertness;
      grad.addColorStop(0, `rgba(${alert > 0.5 ? '199,217,107' : '201,180,138'},0.16)`);
      grad.addColorStop(1, 'rgba(201,180,138,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(e.x, e.y);
      g.arc(e.x, e.y, e.def.sightRange, e.angle - half, e.angle + half);
      g.closePath();
      g.fill();
    }
    // слуховой ореол — игрок видит, что враг что-то услышал
    if (e.alertness > 0.05) {
      g.strokeStyle = `rgba(199,217,107,${(e.alertness * 0.5).toFixed(3)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(e.x, e.y, e.def.radius + 10 + e.alertness * 14, 0, Math.PI * 2);
      g.stroke();
    }
    g.translate(e.x, e.y);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath();
    g.ellipse(2, 4, e.def.radius + 3, (e.def.radius + 3) * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    g.rotate(e.angle);
    g.fillStyle = t.body;
    g.beginPath();
    g.arc(0, 0, e.def.radius, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = t.glow;
    g.fillRect(e.def.radius - 4, -3, 8, 6);
    g.restore();

    // маркер состояния FSM (для playtest-наблюдения)
    const label = e.state === STATES.HUNT ? '!' : e.state === STATES.INVESTIGATE ? '?' : e.state === STATES.LOST ? '~' : '';
    if (label) {
      g.fillStyle = e.state === STATES.HUNT ? '#C7D96B' : '#C9B48A';
      g.font = 'bold 18px monospace';
      g.textAlign = 'center';
      g.fillText(label, e.x, e.y - e.def.radius - 8);
    }
    if (e.memory && e.state !== STATES.PATROL) {
      g.strokeStyle = 'rgba(126,42,34,0.55)';
      g.setLineDash([4, 6]);
      g.beginPath();
      g.moveTo(e.x, e.y);
      g.lineTo(e.memory.x, e.memory.y);
      g.stroke();
      g.setLineDash([]);
      g.beginPath();
      g.arc(e.memory.x, e.memory.y, 6, 0, Math.PI * 2);
      g.stroke();
    }
  }

  /** Слой света: ambient → zone lights → dynamic (фонарь), с тенями от окклюдеров. */
  _drawLighting(g, s, W, H, z) {
    const { level, player, enemies, camera, ui } = s;
    const lc = this._lightCtx;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, W, H);
    lc.save();
    lc.translate(W / 2, H / 2);
    lc.scale(z, z);
    lc.translate(-camera.x, -camera.y);

    const cam = camera;
    const viewR = Math.hypot(W, H) / (2 * z) + 80;
    const near = (o) => Math.hypot(o.x + o.w / 2 - cam.x, o.y + o.h / 2 - cam.y) < viewR + 400;
    const occ = level.occluders.filter(near);

    // ambient: тёплый сепийный полумрак
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = 'rgba(60,44,28,0.30)';
    lc.fillRect(cam.x - viewR, cam.y - viewR, viewR * 2, viewR * 2);

    const punchShadows = (lx, ly) => {
      const quads = shadowQuads(lx, ly, occ, 1600);
      lc.globalCompositeOperation = 'destination-out';
      lc.fillStyle = 'rgba(0,0,0,0.92)';
      for (const q of quads) {
        lc.beginPath();
        lc.moveTo(q[0].x, q[0].y);
        for (let i = 1; i < q.length; i++) lc.lineTo(q[i].x, q[i].y);
        lc.closePath();
        lc.fill();
      }
      lc.globalCompositeOperation = 'source-over';
    };

    // zone lights
    for (const l of level.zoneLights) {
      if (Math.hypot(l.x - cam.x, l.y - cam.y) > viewR + l.radius) continue;
      const flick = l.flicker ?? (l.moon ? 1 : 0.92 + Math.sin(this.time * 7 + l.x) * 0.05);
      const grad = lc.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.radius);
      grad.addColorStop(0, hexA(l.color, 0.5 * l.intensity * flick));
      grad.addColorStop(1, hexA(l.color, 0));
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
      lc.fill();
      punchShadows(l.x, l.y);
    }

    // жаровня — динамический огонь
    if (level.brazier.lit) {
      const b = level.brazier;
      const rad = 190 + Math.sin(this.time * 9) * 14;
      const grad = lc.createRadialGradient(b.x, b.y, 4, b.x, b.y, rad);
      grad.addColorStop(0, hexA('#FFB25E', 0.75));
      grad.addColorStop(1, hexA('#FFB25E', 0));
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(b.x, b.y, rad, 0, Math.PI * 2);
      lc.fill();
      punchShadows(b.x, b.y);
    }

    // брошенные светлячки
    for (const f of s.fireflies || []) {
      const grad = lc.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.radius);
      grad.addColorStop(0, hexA('#FFD9A0', 0.8 * f.life));
      grad.addColorStop(1, hexA('#FFD9A0', 0));
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      lc.fill();
      punchShadows(f.x, f.y);
    }

    // фонари врагов
    for (const e of enemies) {
      if (!e.flashlight) continue;
      this._cone(lc, e.x, e.y, e.angle, (e.flashlight.coneHalfDeg * Math.PI) / 180,
        e.flashlight.range, '#FFD9A0', 0.5, occ, punchShadows);
    }

    // фонарь игрока — dynamic light, честные тени от стеллажей
    const cone = player.selfLight;
    if (cone) {
      this._cone(lc, cone.x, cone.y, cone.angle, cone.coneHalf, cone.range, '#FFD9A0',
        0.85 * cone.intensity, occ, punchShadows);
    }

    lc.filter = 'blur(3px)';
    lc.restore();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.drawImage(this._light, 0, 0);
    g.restore();
    lc.filter = 'none';
  }

  _cone(lc, x, y, angle, half, range, color, alpha, occ, punchShadows) {
    const grad = lc.createRadialGradient(x, y, 6, x, y, range);
    grad.addColorStop(0, hexA(color, alpha));
    grad.addColorStop(0.55, hexA(color, alpha * 0.5));
    grad.addColorStop(1, hexA(color, 0));
    lc.fillStyle = grad;
    lc.beginPath();
    lc.moveTo(x, y);
    lc.arc(x, y, range, angle - half, angle + half);
    lc.closePath();
    lc.fill();
    punchShadows(x, y);
  }

  /** Туман войны: неизвестное — чёрное, посещённое — серая «память карты». */
  _drawFog(g, s, W, H, z) {
    const { visited, camera, revealed } = s;
    const fc = this._fogCtx;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.clearRect(0, 0, W, H);
    fc.fillStyle = 'rgba(4,6,9,0.93)';
    fc.fillRect(0, 0, W, H);
    fc.save();
    fc.translate(W / 2, H / 2);
    fc.scale(z, z);
    fc.translate(-camera.x, -camera.y);
    fc.globalCompositeOperation = 'destination-out';
    const cam = camera;
    const viewR = Math.hypot(W, H) / (2 * z) + 80;
    const tx0 = Math.max(0, pxToTile(cam.x - viewR));
    const ty0 = Math.max(0, pxToTile(cam.y - viewR));
    const tx1 = Math.min(MAP_W - 1, pxToTile(cam.x + viewR));
    const ty1 = Math.min(MAP_H - 1, pxToTile(cam.y + viewR));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const idx = ty * MAP_W + tx;
        let a = 0;
        if (visited[idx] > 0) a = 0.55;
        const d = Math.hypot(tx * TILE + TILE / 2 - cam.x, ty * TILE + TILE / 2 - cam.y);
        if (d < 300) a = Math.max(a, 1 - d / 340);
        if (a > 0) {
          fc.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
          fc.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }
    // карточки каталога открывают план зоны полностью (§0.4D)
    for (const zoneId of revealed) {
      const z2 = s.level.zones[zoneId];
      if (!z2) continue;
      fc.fillStyle = 'rgba(0,0,0,0.82)';
      fc.fillRect(z2.rect.x * TILE, z2.rect.y * TILE, z2.rect.w * TILE, z2.rect.h * TILE);
    }
    fc.restore();
    g.save();
    g.drawImage(this._fog, 0, 0);
    g.restore();
  }

  _drawRain(g, camera, W, H, z, rain) {
    const n = Math.floor(rain * 220);
    g.save();
    g.strokeStyle = `rgba(159,184,216,${(0.1 + rain * 0.22).toFixed(3)})`;
    g.lineWidth = 1;
    const t = this.time;
    for (let i = 0; i < n; i++) {
      const seed = i * 97.13;
      const x = camera.x - W / (2 * z) + ((seed * 13.7 + t * 260) % (W / z));
      const y = camera.y - H / (2 * z) + ((seed * 29.3 + t * 620) % (H / z));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 3, y + 14);
      g.stroke();
    }
    g.restore();
  }

  _drawParticles(g, particles) {
    if (!particles || !particles.length) return;
    for (const p of particles) {
      g.fillStyle = p.color;
      g.globalAlpha = p.life;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  /** Миникарта: план этажа = коллекция карточек каталога. */
  _drawMinimap(g, s, W) {
    const { level, player, enemies, revealed, visited } = s;
    const scale = 4;
    const mw = MAP_W * scale;
    const mh = MAP_H * scale;
    const mc = this._miniCtx;
    if (this._mini.width !== mw || this._mini.height !== mh) {
      this._mini.width = mw;
      this._mini.height = mh;
      this._miniDirty = true;
    }
    if (this._miniDirty) {
      mc.clearRect(0, 0, mw, mh);
      mc.fillStyle = 'rgba(11,14,19,0.85)';
      mc.fillRect(0, 0, mw, mh);
      for (const z of Object.values(level.zones)) {
        const known = revealed.has(z.id);
        mc.fillStyle = known ? 'rgba(201,180,138,0.14)' : 'rgba(201,180,138,0.04)';
        mc.fillRect(z.rect.x * scale, z.rect.y * scale, z.rect.w * scale, z.rect.h * scale);
        if (known) {
          mc.strokeStyle = 'rgba(201,180,138,0.5)';
          mc.lineWidth = 1;
          mc.strokeRect(z.rect.x * scale, z.rect.y * scale, z.rect.w * scale, z.rect.h * scale);
        }
      }
      for (const o of level.occluders) {
        mc.fillStyle = 'rgba(11,14,19,0.9)';
        mc.fillRect((o.x / TILE) * scale, (o.y / TILE) * scale, (o.w / TILE) * scale, (o.h / TILE) * scale);
      }
      this._miniDirty = false;
    }
    mc.save();
    mc.clearRect(0, 0, mw, mh);
    this._miniDirty = true; // простая версия: перерисовываем каждый кадр (миникарта мала)
    mc.restore();

    const pad = 14;
    const x = W - mw - pad * this.dpr;
    const y = pad * this.dpr;
    g.save();
    g.globalAlpha = 0.92;
    g.drawImage(this._mini, x, y);
    // игрок
    g.fillStyle = '#C7D96B';
    g.beginPath();
    g.arc(x + (player.x / TILE) * scale, y + (player.y / TILE) * scale, 3 * this.dpr, 0, Math.PI * 2);
    g.fill();
    // враги — только если зона раскрыта карточкой
    for (const e of enemies) {
      const z = s.level.zoneAt(e.x, e.y);
      if (!z || !revealed.has(z.id)) continue;
      g.fillStyle = e.state === STATES.HUNT ? '#7E2A22' : '#8FA05A';
      g.beginPath();
      g.arc(x + (e.x / TILE) * scale, y + (e.y / TILE) * scale, 2.5 * this.dpr, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(201,180,138,0.4)';
    g.lineWidth = 1;
    g.strokeRect(x, y, mw, mh);
    g.restore();
  }
}

const ENEMY_LOOK = {
  reader: { body: '#6E7B45', glow: '#C7D96B' },
  watcher: { body: '#8A7A55', glow: '#FFD9A0' },
  sporebearer: { body: '#4E5A32', glow: '#8FA05A' },
};

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const gg = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${gg},${b},${clamp(a, 0, 1).toFixed(3)})`;
}
