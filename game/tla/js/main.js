/**
 * THE LAST ARCHIVE — PoC-прототип
 * main.js — сборка уровня, игровой цикл, взаимодействия, HUD, сейв/лоад.
 */

import {
  TILE, MAP_W, MAP_H, MOVE, FLASHLIGHT, PALETTE, clamp, dist, rand, pxToTile, tileToPx,
  ENEMY_TYPES, WEATHER, VISION_BASE,
} from './core.js';
import { Enemy, STATES } from './ai.js';
import { buildLevel, sanityCheck } from './level.js';
import {
  createPlayer, updatePlayer, playerLightCone, exposureState, addItem, canCraft,
  burnBook, readBook, serializePlayer, restorePlayer, CRAFT_RECIPES,
} from './player.js';
import { lightLevelAt } from './light.js';
import { createSaveSystem } from './save.js';
import { Renderer } from './render.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.canvas = $('game');
    this.renderer = new Renderer(this.canvas);
    this.save = createSaveSystem();
    this.level = buildLevel();
    this.grid = this.level.grid;
    this.renderer.buildFloor(this.level);
    this.player = createPlayer(this.level.spawn);
    this.enemies = this.level.enemies.map((e) => new Enemy(e.type, e.spawn, e.patrol));
    this.visited = new Uint8Array(MAP_W * MAP_H);
    this.revealed = new Set();
    this.ripples = [];
    this.particles = [];
    this.fireflies = [];
    this.projectiles = [];
    this.time = 0;
    this.rain = 0;
    this.rainPhase = 'dry';
    this.weatherTimer = rand(WEATHER.cycleMin * 0.4, WEATHER.cycleMin);
    this.state = 'play';            // play | dead | win | paused | craft | breath | read
    this.input = { up: 0, down: 0, left: 0, right: 0, crouch: false, run: false };
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
    this.prompt = '';
    this.hint = '';
    this.hintTimer = 0;
    this.journal = [];
    this.escapeTriggered = false;
    this.catchCooldown = 0;
    this.breath = null;
    this.craft = null;
    this.reading = null;
    this.audMask = null;
    this.audTimer = 0;
    this.stats = { detected: 0, echoes: 0, booksBurned: 0, booksRead: 0, sessionStart: Date.now() };
    this.problems = sanityCheck(this.level);
    if (this.problems.length) console.warn('[TLA] level sanity:', this.problems);
    this.bindInput();
    this.pushHint('WASD — идти. Ctrl — красться, Shift — бежать. F — фонарь. E — взаимодействие. G — бросить.', 9);
    this.pushJournal('Интро: ты — архивариус. Здание отвоёвывает природа. Книги здесь — топливо, чертежи и память.');
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------- ввод */
  bindInput() {
    const map = {
      KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    window.addEventListener('keydown', (e) => {
      if (map[e.code]) { this.input[map[e.code]] = 1; e.preventDefault(); }
      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') this.input.crouch = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.run = true;
      this.onKey(e.code, e);
    });
    window.addEventListener('keyup', (e) => {
      if (map[e.code]) this.input[map[e.code]] = 0;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') this.input.crouch = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.run = false;
    });
    window.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    window.addEventListener('mousedown', (e) => {
      if (this.state === 'breath') { this.breathTap(); return; }
      if (this.state === 'craft') { this.craftTap(); return; }
      if (e.button === 0 && this.state === 'play') this.interact();
      if (e.button === 2) this.toggleLight();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.renderer.resize());
    $('btn-save').addEventListener('click', () => this.doSave());
    $('btn-load').addEventListener('click', () => this.doLoad());
    $('btn-archive').addEventListener('click', () => this.toggleArchive());
    $('btn-close-archive').addEventListener('click', () => $('overlay-archive').classList.add('hidden'));
    $('btn-restart').addEventListener('click', () => location.reload());
  }

  onKey(code, e) {
    if (code === 'KeyF') this.toggleLight();
    if (code === 'KeyE') this.interact();
    if (code === 'KeyG') this.throwItem();
    if (code === 'KeyH' || code === 'KeyQ') this.toggleHide();
    if (code === 'Tab') { e.preventDefault(); this.toggleArchive(); }
    if (code === 'Escape') this.closePanels();
    if (code === 'KeyM') this.pushHint(this.muted ? 'Звук выключен' : 'Звук включён', 2);
  }

  /* --------------------------------------------------------- цикл игры */
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.state === 'play' || this.state === 'breath' || this.state === 'craft') this.update(dt);
    this.render(dt);
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.time += dt;
    this.updateWeather(dt);
    this.updatePlayer(dt);
    this.grid.update(dt);
    this.updateProjectiles(dt);
    this.updateFireflies(dt);
    this.updateEnemies(dt);
    this.updateRipples(dt);
    this.updateParticles(dt);
    this.updateVisited();
    this.updateAudibility(dt);
    this.updateBreath(dt);
    this.updateCraft(dt);
    this.updateHints(dt);
    this.updateCamera(dt);
    this.checkObjectives();
    this.updateHud();
  }

  /* ---------------------------------------------------------- погода */
  updateWeather(dt) {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.rainPhase === 'dry') {
        this.rainPhase = 'raining';
        this.weatherTimer = rand(WEATHER.rainMin, WEATHER.rainMax);
        this.pushHint('Дождь по крыше: порог слышимости вырос — «окно тишины» (§0.4B).', 6);
        this.pushJournal('Дождь глушит шаги. У тебя есть несколько минут, когда здание почти ничего не слышит.');
      } else {
        this.rainPhase = 'dry';
        this.weatherTimer = rand(WEATHER.cycleMin, WEATHER.cycleMax);
        this.pushHint('Дождь стихает — мир снова слышит каждый шаг.', 5);
      }
    }
    const target = this.rainPhase === 'raining' ? 1 : 0;
    this.rain += (target - this.rain) * Math.min(1, dt / WEATHER.ramp);
    this.grid.setRain(this.rain);
  }

  /* ---------------------------------------------------------- игрок */
  updatePlayer(dt) {
    const p = this.player;
    // прицел по мыши (фонарь и направление взгляда)
    const cam = this.renderer.cam;
    const z = cam.zoom * this.renderer.dpr;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.worldX = cam.x + (this.mouse.x - rect.width / 2) / z;
    this.mouse.worldY = cam.y + (this.mouse.y - rect.height / 2) / z;
    if (!p.hidden && (Math.abs(this.mouse.worldX - p.x) > 8 || Math.abs(this.mouse.worldY - p.y) > 8)) {
      p.angle = Math.atan2(this.mouse.worldY - p.y, this.mouse.worldX - p.x);
    }

    const { steps } = updatePlayer(p, dt, this.input, this.grid, this.level.occluders, this.level);
    for (const s of steps) {
      this.ripples.push({
        x: s.x, y: s.y, t: 0, ttl: 1.1, maxTtl: 1.1,
        radius: 40 + s.intensity * 2.6,
        color: s.intensity > 70 ? '199,217,107' : s.intensity > 45 ? '201,180,138' : '94,125,76',
      });
      this.sfx('step', s.intensity);
    }

    p.selfLight = playerLightCone(p);
    const lightLevel = lightLevelAt(
      p.x, p.y, this.level.zoneLights, p.selfLight, this.enemyLights(),
    );
    p.lightLevel = lightLevel;
    const exp = exposureState(p, lightLevel);
    p.stanceFactor = exp.stanceFactor;
    p.lightExposure = exp.lightExposure;
    // споры рядом
    p.sporeFactor = this.sporeFactorAt(p.x, p.y);
    if (p.sporeFactor > 0.2) {
      p.stamina = clamp(p.stamina - dt * 0.05, 0, 1);
      if (Math.random() < dt * 3) {
        this.particles.push({
          x: p.x + rand(-14, 14), y: p.y + rand(-14, 14), vx: rand(-6, 6), vy: rand(-14, -4),
          life: 1, size: 2, color: 'rgba(199,217,107,0.7)',
        });
      }
    }
    if (this.catchCooldown > 0) this.catchCooldown -= dt;
  }

  sporeFactorAt(x, y) {
    let f = 0;
    for (const s of this.level.sporePatches) {
      if (x > s.x - 20 && x < s.x + s.w + 20 && y > s.y - 20 && y < s.y + s.h + 20) {
        const cx = clamp(x, s.x, s.x + s.w);
        const cy = clamp(y, s.y, s.y + s.h);
        const d = dist(x, y, cx, cy);
        f = Math.max(f, clamp(1 - d / 60, 0, 1));
      }
    }
    return f;
  }

  enemyLights() {
    const out = [];
    for (const e of this.enemies) {
      if (!e.flashlight) continue;
      out.push({
        x: e.x, y: e.y, angle: e.angle,
        coneHalf: (e.flashlight.coneHalfDeg * Math.PI) / 180,
        range: e.flashlight.range, intensity: e.flashlight.intensity,
      });
    }
    return out;
  }

  /* ----------------------------------------------------------- враги */
  updateEnemies(dt) {
    const p = this.player;
    const zone = this.level.zoneAt(p.x, p.y);
    const ctxBase = {
      dt, player: p, grid: this.grid, occluders: this.level.occluders,
      zoneLights: this.level.zoneLights, enemyLights: this.enemyLights(),
      playerLightOn: !!p.selfLight, rain: this.rain,
      dustFactor: p.dust, sporeFactor: p.sporeFactor,
      playerHidden: p.hidden,
      visionThreshold: VISION_BASE,
      onDetect: (e) => this.onDetected(e),
      onNoiseHeard: (e, heard) => this.onNoiseHeard(e, heard),
      onReachPlayer: (e) => this.onCaught(e),
    };
    for (const e of this.enemies) e.update(ctxBase);
    // «зона базы» — враги не входят в читальный зал архивариуса (§3.1 п.1)
    for (const e of this.enemies) {
      const z = this.level.zoneAt(e.x, e.y);
      if (z && z.id === 'base' && e.state === STATES.PATROL) {
        e.path = [];
      }
    }
  }

  onDetected(e) {
    this.stats.detected++;
    if (this._lastDetectWarn === undefined || this.time - this._lastDetectWarn > 3) {
      this._lastDetectWarn = this.time;
      this.pushHint(`${e.def.name} тебя видит! Гаси фонарь и уходи в тень.`, 3);
      this.sfx('alert');
    }
  }

  onNoiseHeard(e, heard) {
    if (heard.ev.isDecoy) {
      this.stats.echoes++;
      if (this.time - (this._lastEchoHint || -99) > 12) {
        this._lastEchoHint = this.time;
        this.pushHint('Эхо купола увело врага к фантомной точке — обманка сработала (§0.4B).', 5);
      }
    }
  }

  onCaught(e) {
    if (this.catchCooldown > 0 || this.player.hidden) return;
    this.catchCooldown = 3;
    const p = this.player;
    p.health -= 1;
    p.catches++;
    this.sfx('caught');
    this.pushHint(`${e.def.name} настиг тебя. Ты теряешь силы и часть находок.`, 4);
    // выронить часть добычи на месте поимки
    const dropPages = Math.min(p.inv.pages, 30);
    p.inv.pages -= dropPages;
    if (p.inv.fireflies > 0) p.inv.fireflies--;
    this.level.junk.push({ id: `drop-${Date.now()}`, x: p.x, y: p.y, taken: false });
    if (p.health <= 0) {
      this.state = 'dead';
      $('overlay-end').classList.remove('hidden');
      $('end-title').textContent = 'Архив потерял тебя';
      $('end-text').textContent = 'Силы кончились в тёмном зале. Здание продолжало дышать без тебя.';
      this.showEndStats();
      return;
    }
    // возврат на базу (§3.1: «ВОЗВРАТ»)
    p.x = this.level.spawn.x;
    p.y = this.level.spawn.y;
    p.stance = 'crouch';
    for (const en of this.enemies) {
      en.memory = null;
      en.setState(STATES.PATROL);
      en.path = [];
    }
  }

  /* --------------------------------------------------- взаимодействия */
  nearbyInteractable() {
    const p = this.player;
    let best = null;
    const consider = (o, name, action) => {
      const d = dist(p.x, p.y, o.x, o.y);
      if (d < 46 && (!best || d < best.d)) best = { d, o, name, action };
    };
    for (const b of this.level.books) if (!b.taken) consider(b, b.name, 'book');
    for (const c of this.level.cards) if (!c.taken) consider(c, c.name, 'card');
    for (const j of this.level.junk) if (!j.taken) consider(j, 'Хлам для крафта', 'junk');
    for (const b of this.level.batteries) if (!b.taken) consider(b, 'Батарея', 'battery');
    for (const pr of this.level.props) consider(pr, pr.name, pr.kind);
    return best;
  }

  updatePrompt() {
    const t = this.nearbyInteractable();
    this.promptTarget = t;
    const hints = {
      book: 'E — прочитать/взять · R у жаровни — сжечь',
      card: 'E — взять карточку каталога (откроет план зоны)',
      junk: 'E — подобрать хлам',
      battery: 'E — взять батарею',
      workbench: 'E — крафт (тихая миниигра)',
      brazier: 'E — сжечь книгу (костёр-отвлечение)',
      cabinet: 'H — спрятаться в каталожном шкафу',
    };
    this.prompt = t ? `${t.name} — ${hints[t.action] || 'E'}` : '';
    $('prompt').textContent = this.prompt;
    $('prompt').classList.toggle('hidden', !this.prompt);
  }

  interact() {
    if (this.state !== 'play') return;
    const t = this.nearbyInteractable();
    if (!t) return;
    const p = this.player;
    switch (t.action) {
      case 'book': {
        this.reading = t.o;
        this.state = 'read';
        $('overlay-read').classList.remove('hidden');
        $('read-title').textContent = t.o.name;
        $('read-lore').textContent = t.o.lore || '';
        $('read-actions').innerHTML = '';
        const take = document.createElement('button');
        take.textContent = t.o.rare ? 'Прочитать (чертёж светлячка) и взять' : 'Прочитать и взять в архив';
        take.onclick = () => {
          readBook(p, t.o);
          t.o.taken = true;
          this.stats.booksRead++;
          this.pushJournal(`Прочитано: ${t.o.name}`);
          if (t.o.blueprint) {
            p.blueprints[t.o.blueprint] = true;
            this.pushHint('Получен чертёж: фонарь-«светлячок» (крафт на верстаке).', 6);
          }
          this.closeRead();
        };
        const burn = document.createElement('button');
        burn.textContent = t.o.rare ? 'СЖЕЧЬ редкий том (топливо + костёр)' : 'Сжечь на топливо (страницы)';
        burn.className = 'danger';
        burn.onclick = () => {
          burnBook(p, t.o);
          t.o.taken = true;
          this.stats.booksBurned++;
          this.pushJournal(`Сожжено: ${t.o.name}`);
          if (t.o.rare) {
            this.pushHint('Кодекс сгорел. Чертёж светлячка утрачен навсегда — зато тепла хватит на ночь.', 8);
            this.lightBrazier(60);
          }
          this.closeRead();
        };
        const close = document.createElement('button');
        close.textContent = 'Оставить';
        close.onclick = () => this.closeRead();
        $('read-actions').append(take, burn, close);
        this.sfx('page');
        break;
      }
      case 'card':
        t.o.taken = true;
        this.revealed.add(t.o.zone);
        p.archive.cards.push(t.o.zone);
        this.renderer.markMinimapDirty();
        this.pushHint(`План зоны открыт: ${this.level.zones[t.o.zone].name} (§0.4D).`, 6);
        this.pushJournal(`Карточка каталога: ${t.o.name}`);
        this.sfx('card');
        break;
      case 'junk':
        t.o.taken = true;
        addItem(p, 'junk', 1);
        this.pushHint('Хлам +1 (нужен для крафта).', 2.5);
        break;
      case 'battery':
        t.o.taken = true;
        p.battery = clamp(p.battery + FLASHLIGHT.batteryPickup, 0, 1);
        this.pushHint(`Батарея: +${Math.round(FLASHLIGHT.batteryPickup * 100)}% заряда фонаря.`, 3);
        break;
      case 'workbench':
        this.openCraft();
        break;
      case 'brazier':
        this.burnAtBrazier();
        break;
      case 'cabinet':
        this.toggleHide();
        break;
      default:
        break;
    }
  }

  closeRead() {
    this.reading = null;
    this.state = 'play';
    $('overlay-read').classList.add('hidden');
  }

  burnAtBrazier() {
    const p = this.player;
    const last = p.archive.read[p.archive.read.length - 1];
    if (!p.inv.pages && !last) {
      this.pushHint('Нечего жечь: нужны страницы или книга.', 3);
      return;
    }
    const spent = Math.min(p.inv.pages, 40);
    p.inv.pages -= spent;
    this.lightBrazier(45 + spent);
    this.pushHint(`Костёр разожжён (${spent} страниц). Свет и треск уводят врагов.`, 5);
    this.pushJournal(`Сожжено страниц на топливо: ${spent}`);
    this.sfx('fire');
  }

  lightBrazier(seconds) {
    const b = this.level.brazier;
    b.lit = true;
    b.fuel = seconds;
    this.grid.emit(b.x, b.y, 78, { kind: 'fire', ttl: 3 });
    this.pushHint('Огонь шумит и светит: враги идут проверять жаровню.', 5);
  }

  toggleLight() {
    const p = this.player;
    if (p.battery <= 0) {
      this.pushHint('Батарея пуста. Ищи новые или сделай самодельную на верстаке.', 3);
      return;
    }
    p.lightOn = !p.lightOn;
    this.pushHint(p.lightOn ? 'Фонарь включён: ты видишь, но и тебя видно.' : 'Фонарь выключен.', 2.5);
    this.sfx('click');
  }

  throwItem() {
    const p = this.player;
    if (p.inv.fireflies > 0) {
      p.inv.fireflies--;
      this.projectiles.push({
        x: p.x, y: p.y, angle: p.angle, speed: 420, life: 0.75, kind: 'firefly',
      });
      this.pushHint('Светлячок брошен: свет + шум в точке падения.', 3);
    } else {
      this.projectiles.push({
        x: p.x, y: p.y, angle: p.angle, speed: 380, life: 0.6, kind: 'book',
      });
      this.pushHint('Книга брошена как обманка (§0.4B).', 2.5);
    }
    this.sfx('throw');
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += Math.cos(pr.angle) * pr.speed * dt;
      pr.y += Math.sin(pr.angle) * pr.speed * dt;
      pr.speed *= 0.94;
      const blocked = !this.grid.isWalkable(pxToTile(pr.x), pxToTile(pr.y));
      if (pr.life <= 0 || blocked) {
        this.projectiles.splice(i, 1);
        if (pr.kind === 'firefly') {
          this.fireflies.push({ x: pr.x, y: pr.y, life: 1, ttl: 26, radius: 210 });
          this.grid.emit(pr.x, pr.y, 72, { kind: 'firefly', ttl: 2.4 });
        } else {
          this.grid.emit(pr.x, pr.y, 52, { kind: 'thrownBook', ttl: 1.4 });
        }
        this.ripples.push({
          x: pr.x, y: pr.y, t: 0, ttl: 1.4, maxTtl: 1.4, radius: 190, color: '199,217,107',
        });
        this.sfx('thud');
      }
    }
  }

  updateFireflies(dt) {
    for (let i = this.fireflies.length - 1; i >= 0; i--) {
      const f = this.fireflies[i];
      f.ttl -= dt;
      f.life = clamp(f.ttl / 26, 0, 1);
      f.radius = 210 * (0.6 + 0.4 * f.life);
      if (Math.random() < dt * 1.5) this.grid.emit(f.x, f.y, 40, { kind: 'fireflyCrackle', ttl: 0.9 });
      if (f.ttl <= 0) this.fireflies.splice(i, 1);
    }
    if (this.level.brazier.lit) {
      this.level.brazier.fuel -= dt;
      if (Math.random() < dt * 2) this.grid.emit(this.level.brazier.x, this.level.brazier.y, 44, { kind: 'fireCrackle', ttl: 0.9 });
      if (this.level.brazier.fuel <= 0) this.level.brazier.lit = false;
    }
  }

  /* ------------------------------------------------ укрытие + дыхание */
  toggleHide() {
    const p = this.player;
    const cab = this.level.propsById.cabinet;
    if (p.hidden) {
      p.hidden = false;
      p.hiddenIn = null;
      this.pushHint('Ты вышел из шкафа.', 2);
      return;
    }
    if (dist(p.x, p.y, cab.x, cab.y) > 60) {
      this.pushHint('Каталожный шкаф далеко — подойди ближе (§0.4D).', 3);
      return;
    }
    p.hidden = true;
    p.hiddenIn = cab.id;
    p.x = cab.x;
    p.y = cab.y;
    this.state = 'breath';
    this.breath = { pos: 0.5, dir: 1, speed: 0.55, calm: 0, noise: 0 };
    $('overlay-breath').classList.remove('hidden');
    this.pushHint('Дыхание: кликай/жми SPACE, чтобы держать курсор в зоне. Срыв = шум.', 6);
  }

  breathTap() {
    if (!this.breath) return;
    const b = this.breath;
    const err = Math.abs(b.pos - 0.5);
    if (err < 0.16) {
      b.calm = clamp(b.calm + 0.22, 0, 1);
      this.sfx('breathGood');
    } else {
      b.calm = clamp(b.calm - 0.18, 0, 1);
      b.noise = 1;
      this.grid.emit(this.player.x, this.player.y, 58, { kind: 'breathSlip', ttl: 1.2 });
      this.sfx('breathBad');
    }
  }

  updateBreath(dt) {
    if (this.state !== 'breath' || !this.breath) return;
    const b = this.breath;
    b.pos += b.dir * b.speed * dt;
    if (b.pos > 1) { b.pos = 1; b.dir = -1; }
    if (b.pos < 0) { b.pos = 0; b.dir = 1; }
    b.noise = Math.max(0, b.noise - dt);
    // чем спокойнее дыхание — тем тише ты для врагов
    this.player.noiseLevel = 8 + (1 - b.calm) * 26 + b.noise * 30;
    $('breath-bar').style.transform = `translateX(${(b.pos - 0.5) * 200}px)`;
    $('breath-calm').style.width = `${Math.round(b.calm * 100)}%`;
    if (b.calm >= 0.99) {
      this.pushHint('Дыхание ровное — ты стал почти неслышим.', 3);
      b.calm = 0.9;
    }
    if (this.input.up || this.input.down || this.input.left || this.input.right) {
      // движение наружу
      this.toggleHide();
      $('overlay-breath').classList.add('hidden');
      this.state = 'play';
      this.breath = null;
    }
  }

  /* --------------------------------------------------------- крафт */
  openCraft() {
    this.state = 'craft';
    this.craft = { recipe: null, pos: 0, dir: 1, speed: 0.85, hits: 0, need: 3, noise: 0 };
    this.renderCraftPanel();
    $('overlay-craft').classList.remove('hidden');
  }

  renderCraftPanel() {
    const p = this.player;
    const box = $('craft-list');
    box.innerHTML = '';
    for (const r of CRAFT_RECIPES) {
      const st = canCraft(p, r);
      const row = document.createElement('div');
      row.className = 'craft-row' + (st.ok ? '' : ' disabled');
      const needs = [];
      if (r.needs.junk) needs.push(`хлам ×${r.needs.junk}`);
      if (r.needs.pages) needs.push(`страницы ×${r.needs.pages}`);
      if (r.needsBlueprint) needs.push('чертёж');
      row.innerHTML = `<div><b>${r.name}</b><div class="craft-desc">${r.desc}</div>
        <div class="craft-needs">нужно: ${needs.join(', ')}${st.ok ? '' : ` — ${st.why}`}</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Крафт';
      btn.disabled = !st.ok;
      btn.onclick = () => { this.craft.recipe = r; this.craft.hits = 0; };
      row.appendChild(btn);
      box.appendChild(row);
    }
    $('craft-inv').textContent =
      `Хлам: ${p.inv.junk} · Страницы: ${p.inv.pages} · Светлячки: ${p.inv.fireflies} · Бинты: ${p.inv.bandages}`;
  }

  craftTap() {
    const c = this.craft;
    if (!c) return;
    if (!c.recipe) {
      this.pushHint('Сначала выбери рецепт.', 2);
      return;
    }
    const err = Math.abs(c.pos - 0.5);
    if (err < 0.12) {
      c.hits++;
      this.sfx('craftHit');
      if (c.hits >= c.need) {
        this.finishCraft(c.recipe);
        c.recipe = null;
        c.hits = 0;
      }
    } else {
      c.noise = 1;
      this.grid.emit(this.player.x, this.player.y, 62, { kind: 'craftSlip', ttl: 1.2 });
      this.pushHint('Инструмент лязгнул — крафт требует тишины (§2.2).', 3);
      this.sfx('craftMiss');
    }
  }

  finishCraft(recipe) {
    const p = this.player;
    p.inv.junk -= recipe.needs.junk || 0;
    p.inv.pages -= recipe.needs.pages || 0;
    if (recipe.id === 'firefly') addItem(p, 'firefly', 2);
    if (recipe.id === 'bandage') { addItem(p, 'bandage', 1); p.health = clamp(p.health + 1, 0, 3); }
    if (recipe.id === 'batteryPack') p.battery = clamp(p.battery + 0.4, 0, 1);
    this.pushHint(`Скрафчено: ${recipe.name}`, 4);
    this.pushJournal(`Крафт: ${recipe.name}`);
    this.renderCraftPanel();
  }

  updateCraft(dt) {
    if (this.state !== 'craft' || !this.craft) return;
    const c = this.craft;
    c.pos += c.dir * c.speed * dt;
    if (c.pos > 1) { c.pos = 1; c.dir = -1; }
    if (c.pos < 0) { c.pos = 0; c.dir = 1; }
    c.noise = Math.max(0, c.noise - dt);
    $('craft-marker').style.transform = `translateX(${(c.pos - 0.5) * 260}px)`;
    $('craft-hits').textContent = c.recipe ? `${c.hits}/${c.need} — ${c.recipe.name}` : 'выбери рецепт';
  }

  closePanels() {
    if (this.state === 'read') this.closeRead();
    if (this.state === 'craft') {
      this.state = 'play';
      this.craft = null;
      $('overlay-craft').classList.add('hidden');
    }
    if (this.state === 'breath') {
      this.toggleHide();
      $('overlay-breath').classList.add('hidden');
      this.state = 'play';
      this.breath = null;
    }
    $('overlay-archive').classList.add('hidden');
  }

  /* --------------------------------------------------- карта/туман */
  updateVisited() {
    const p = this.player;
    const tx = pxToTile(p.x);
    const ty = pxToTile(p.y);
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (Math.hypot(dx, dy) <= 5.2) this.visited[y * MAP_W + x] = 1;
      }
    }
  }

  updateAudibility(dt) {
    this.audTimer -= dt;
    if (this.audTimer > 0) return;
    this.audTimer = 0.3;
    const p = this.player;
    const prof = MOVE[p.stance.toUpperCase()];
    this.audMask = this.grid.audibilityMask(p.x, p.y, prof.intensity);
    this.audIntensity = prof.intensity;
  }

  updateRipples(dt) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dt;
      r.ttl -= dt;
      if (r.ttl <= 0) this.ripples.splice(i, 1);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 0.9;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const cam = this.renderer.cam;
    const leadX = Math.cos(p.angle) * 40;
    const leadY = Math.sin(p.angle) * 40;
    cam.x += (p.x + leadX - cam.x) * Math.min(1, dt * 4.2);
    cam.y += (p.y + leadY - cam.y) * Math.min(1, dt * 4.2);
    const targetZoom = p.stance === 'crouch' ? 1.22 : 1.05;
    cam.zoom += (targetZoom - cam.zoom) * Math.min(1, dt * 2);
  }

  updateHints(dt) {
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint = '';
    }
    $('hint').textContent = this.hint;
    $('hint').classList.toggle('hidden', !this.hint);
    this.updatePrompt();
  }

  pushHint(text, seconds = 4) {
    this.hint = text;
    this.hintTimer = seconds;
  }

  pushJournal(text) {
    this.journal.unshift(`${new Date().toLocaleTimeString('ru-RU')} — ${text}`);
    if (this.journal.length > 60) this.journal.pop();
  }

  /* -------------------------------------------------- цели и финал */
  checkObjectives() {
    const p = this.player;
    const z = this.level.zoneAt(p.x, p.y);
    if (z && z.id === 'escape' && !this.escapeTriggered) {
      this.escapeTriggered = true;
      const ready = p.archive.rareRead || p.archive.rareBurned || p.inv.fireflies > 0;
      this.level.gate.closed = !ready;
      if (ready) {
        this.rainPhase = 'raining';
        this.weatherTimer = 34;
        const w = this.enemies.find((e) => e.type === 'watcher');
        if (w) {
          w.memory = { x: p.x, y: p.y, age: 0, isDecoy: false };
          w.setState(STATES.HUNT);
        }
        this.pushHint('Пролом открыт. Дождь хлещет — но Смотритель уже идёт по следу.', 7);
        this.pushJournal('Финальная погоня: дождь глушит звук, Смотритель охотится.');
      } else {
        this.pushHint('Ворота запечатаны. Нужен чертёж светлячка (прочитать Кодекс) или топливо — сжечь его в жаровне.', 9);
      }
    }
    if (!this.level.gate.closed) {
      const ex = this.level.exitZone.rect;
      if (p.x > ex.x && p.x < ex.x + ex.w && p.y > ex.y && p.y < ex.y + ex.h) {
        this.state = 'win';
        $('overlay-end').classList.remove('hidden');
        $('end-title').textContent = 'Ты вышел из здания';
        $('end-text').textContent = this.endingText();
        this.showEndStats();
      }
    }
  }

  endingText() {
    const a = this.player.archive;
    if (a.rareRead && a.burned.length === 0) {
      return 'Финал «Хранитель»: Кодекс спасён, ни одна страница не ушла в огонь. Знание дороже тепла — сегодня ты выбрал память.';
    }
    if (a.rareBurned) {
      return 'Финал «Тепло»: Кодекс Светлячка сгорел, согрев одну ночь. Чертежа больше нет ни у кого в мире.';
    }
    if (a.rareRead) {
      return 'Финал «Прагматик»: чертёж у тебя в руках, часть фонда — в пепле. Здание запомнит и то и другое.';
    }
    return 'Финал «Уцелевший»: ты вышел без Кодекса. Спецхран так и остался закрытой главой.';
  }

  showEndStats() {
    const mins = ((Date.now() - this.stats.sessionStart) / 60000).toFixed(1);
    const a = this.player.archive;
    $('end-stats').innerHTML = `
      <div>Сессия: <b>${mins} мин</b></div>
      <div>Замечаний врагов: <b>${this.stats.detected}</b> · Поимок: <b>${this.player.catches}</b></div>
      <div>Эхо-обманок сработало: <b>${this.stats.echoes}</b></div>
      <div>Прочитано книг: <b>${this.stats.booksRead}</b> · Сожжено: <b>${this.stats.booksBurned}</b></div>
      <div>Карточек каталога: <b>${a.cards.length}/3</b> · Страниц в архиве: <b>${this.player.inv.pages}</b></div>`;
  }

  /* ------------------------------------------------------- сейв/лоад */
  snapshot() {
    return {
      player: serializePlayer(this.player),
      enemies: this.enemies.map((e) => e.serialize()),
      acoustics: this.grid.serialize(),
      visited: Array.from(this.visited),
      revealed: Array.from(this.revealed),
      taken: {
        books: this.level.books.filter((b) => b.taken).map((b) => b.id),
        cards: this.level.cards.filter((c) => c.taken).map((c) => c.id),
        junk: this.level.junk.filter((j) => j.taken).map((j) => j.id),
        batteries: this.level.batteries.filter((b) => b.taken).map((b) => b.id),
      },
      gateClosed: this.level.gate.closed,
      brazier: { lit: this.level.brazier.lit, fuel: this.level.brazier.fuel },
      escapeTriggered: this.escapeTriggered,
      rainPhase: this.rainPhase,
      weatherTimer: this.weatherTimer,
      stats: this.stats,
    };
  }

  doSave() {
    this.save.save(this.snapshot());
    this.pushHint('Сохранено (схема v1).', 3);
    this.pushJournal('Игра сохранена.');
  }

  doLoad() {
    const payload = this.save.load();
    if (!payload) {
      this.pushHint('Сохранений нет.', 3);
      return;
    }
    const s = payload.state;
    restorePlayer(this.player, s.player);
    s.enemies.forEach((es) => {
      const e = this.enemies.find((x) => x.id === es.id);
      if (e) e.restore(es);
    });
    this.grid.restore(s.acoustics);
    this.visited = Uint8Array.from(s.visited);
    this.revealed = new Set(s.revealed);
    for (const id of s.taken.books) { const b = this.level.propsById[id]; if (b) b.taken = true; }
    for (const id of s.taken.cards) { const c = this.level.cards.find((x) => x.id === id); if (c) c.taken = true; }
    for (const id of s.taken.junk) { const j = this.level.junk.find((x) => x.id === id); if (j) j.taken = true; }
    for (const id of s.taken.batteries) { const b = this.level.batteries.find((x) => x.id === id); if (b) b.taken = true; }
    this.level.gate.closed = s.gateClosed;
    this.level.brazier.lit = s.brazier.lit;
    this.level.brazier.fuel = s.brazier.fuel;
    this.escapeTriggered = s.escapeTriggered;
    this.rainPhase = s.rainPhase;
    this.weatherTimer = s.weatherTimer;
    this.stats = s.stats || this.stats;
    this.state = 'play';
    this.pushHint('Загружено.', 3);
    this.pushJournal('Игра загружена.');
  }

  toggleArchive() {
    const ov = $('overlay-archive');
    if (ov.classList.contains('hidden')) {
      const p = this.player;
      const a = p.archive;
      $('archive-body').innerHTML = `
        <h3>Личный архив (§0.4A)</h3>
        <p><b>Прочитано (${a.read.length}):</b> ${a.read.length ? a.read.join('; ') : '—'}</p>
        <p><b>Сожжено (${a.burned.length}):</b> ${a.burned.length ? a.burned.join('; ') : '—'}</p>
        <p><b>Чертежи:</b> ${Object.keys(p.blueprints).length ? Object.keys(p.blueprints).join(', ') : '—'}</p>
        <p><b>Карточки каталога:</b> ${a.cards.length}/3</p>
        <h3>Журнал</h3>
        <ul>${this.journal.map((j) => `<li>${j}</li>`).join('')}</ul>`;
      ov.classList.remove('hidden');
    } else {
      ov.classList.add('hidden');
    }
  }

  /* ----------------------------------------------------------- HUD */
  updateHud() {
    const p = this.player;
    const prof = MOVE[p.stance.toUpperCase()];
    setTxt('hud-stance', `${prof.label} · ${Math.round(prof.speed)} px/с`);
    setTxt('hud-battery', `${Math.round(p.battery * 100)}%`);
    setTxt('hud-health', '♥'.repeat(Math.max(0, p.health)) + '·'.repeat(Math.max(0, 3 - p.health)));
    setTxt('hud-inv', `📚 ${p.archive.read.length + p.archive.burned.length} · 📄 ${p.inv.pages} · 🔩 ${p.inv.junk} · ✨ ${p.inv.fireflies}`);
    const rain = this.rain;
    setTxt('hud-weather', rain > 0.4 ? 'ДОЖДЬ (окно тишины)' : rain > 0.05 ? 'морось' : 'сухо');
    // индикатор «насколько меня слышно» (§3.2 п.2)
    const loudest = this.grid.loudnessAt(p.x, p.y);
    const pct = clamp((p.noiseLevel / 100) * 100, 0, 100);
    $('hud-noise-fill').style.width = `${pct}%`;
    setTxt('hud-noise-val', `${Math.round(p.noiseLevel)}`);
    const th = 30 - ENEMY_TYPES.reader.hearBonus + this.grid.thresholdBonus;
    setTxt('hud-noise-note', p.noiseLevel >= th ? 'СЛЫШНО ЧИТАТЕЛЮ' : 'тихо');
    setTxt('hud-fps', `${Math.round(this._fps || 60)} fps`);
  }

  /* -------------------------------------------------------- рендер */
  render(dt) {
    this._fpsAcc = (this._fpsAcc || 0) * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
    this._fps = this._fpsAcc;
    const cam = this.renderer.cam;
    this.renderer.render({
      dt,
      level: this.level,
      player: this.player,
      enemies: this.enemies,
      rain: this.rain,
      ripples: this.ripples,
      particles: this.particles,
      fireflies: this.fireflies,
      projectiles: this.projectiles,
      visited: this.visited,
      revealed: this.revealed,
      camera: cam,
      ui: { prompt: this.prompt, audMask: this.audMask, audIntensity: this.audIntensity },
    });
    this.drawAudibilityOverlay();
  }

  /** Контур «откуда меня слышно» поверх кадра (экранные координаты). */
  drawAudibilityOverlay() {
    const mask = this.audMask;
    if (!mask) return;
    const g = this.renderer.ctx;
    const cam = this.renderer.cam;
    const z = cam.zoom * this.renderer.dpr;
    const W = this.renderer.canvas.width;
    const H = this.renderer.canvas.height;
    const th = 30 - ENEMY_TYPES.reader.hearBonus;
    g.save();
    g.translate(W / 2, H / 2);
    g.scale(z, z);
    g.translate(-cam.x, -cam.y);
    g.fillStyle = 'rgba(199,217,107,0.10)';
    g.strokeStyle = 'rgba(199,217,107,0.55)';
    g.lineWidth = 1.5 / z;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const v = mask[ty * MAP_W + tx];
        if (v < th) continue;
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    g.restore();
  }

  /* --------------------------------------------------------- звук */
  sfx(kind, intensity = 0) {
    if (this.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this._ac = this._ac || new AC();
      const ac = this._ac;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const freqs = {
        step: 90 + intensity, page: 1400, card: 900, click: 500, throw: 300, thud: 70,
        alert: 220, caught: 60, fire: 120, craftHit: 660, craftMiss: 140,
        breathGood: 420, breathBad: 180,
      };
      osc.type = kind === 'page' || kind === 'card' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freqs[kind] || 200, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'step' ? 0.05 : 0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) { /* звук не критичен для PoC */ }
  }
}

function setTxt(id, v) {
  const el = document.getElementById(id);
  if (el && el.textContent !== v) el.textContent = v;
}

window.addEventListener('DOMContentLoaded', () => {
  window.TLA = new Game();
});
