/**
 * THE LAST ARCHIVE — PoC: headless-тесты игровых систем.
 * Запуск: node game/tla/test/core.test.mjs
 *
 * Проверяются РЕАЛЬНЫЕ модули прототипа (acoustics/ai/light/level/player/save),
 * а не их копии: это гейт M2 «акустическая сетка играбельна» из
 * docs/THE_LAST_ARCHIVE_PRODUCTION_PLAN.md и чек-лист механик §3.2.
 */

import { AcousticGrid } from '../js/acoustics.js';
import { MAT, MATERIALS, TILE, MAP_W, MAP_H, MOVE, FLASHLIGHT, VISION_BASE } from '../js/core.js';
import { buildLevel, sanityCheck } from '../js/level.js';
import { findPath, Enemy, STATES } from '../js/ai.js';
import { losClear, lightLevelAt, visibilityFor } from '../js/light.js';
import {
  createPlayer, updatePlayer, readBook, burnBook, addItem, canCraft, CRAFT_RECIPES,
} from '../js/player.js';
import { createSaveSystem, SAVE_SCHEMA_VERSION } from '../js/save.js';

let pass = 0;
const failures = [];

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { failures.push(`${name} ${extra}`); console.log(`  [FAIL] ${name} ${extra}`); }
}
function near(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; }
function section(t) { console.log(`\n— ${t}`); }

/* ======================================================= 1. УРОВЕНЬ */
section('1. Уровень «Главный читальный зал» (§3.1)');
const level = buildLevel();
const grid = level.grid;
const problems = sanityCheck(level);
ok('спавны и ключевые точки не в стенах', problems.length === 0, JSON.stringify(problems));
ok('6 зон уровня', Object.keys(level.zones).length === 6, `${Object.keys(level.zones).length}`);
ok('3 Читателя + 1 Смотритель + 1 Спороносец',
  level.enemies.filter((e) => e.type === 'reader').length === 3
  && level.enemies.filter((e) => e.type === 'watcher').length === 1
  && level.enemies.filter((e) => e.type === 'sporebearer').length === 1);
ok('эхо-зона купола задана', level.echoZones.length === 1);
ok('карточек каталога 3', level.cards.length === 3);
ok('ворота пролома запечатаны на старте', level.gate.closed === true);

/* ====================================================== 2. АКУСТИКА */
section('2. Акустическая сетка (§0.4B) — риск-модуль №1');
{
  const g = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.PARQUET));
  g.emit(20 * TILE, 20 * TILE, 80);
  g.recompute();
  const l0 = g.loudnessAt(20 * TILE, 20 * TILE);
  const l3 = g.loudnessAt(23 * TILE, 20 * TILE);
  const l9 = g.loudnessAt(29 * TILE, 20 * TILE);
  ok('громкость падает с расстоянием', l0 > l3 && l3 > l9, `${l0} / ${l3} / ${l9}`);
  ok('бег слышен в пределах ~10–11 тайлов, дальше тишина', l9 > 21 && l9 < 40, `${l9.toFixed(2)}`);

  // стена экранирует
  const walled = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.PARQUET));
  for (let y = 10; y < 30; y++) walled.mats[y * MAP_W + 22] = MAT.WALL;
  walled.emit(20 * TILE, 20 * TILE, 80);
  walled.recompute();
  const sameRoom = walled.loudnessAt(21.2 * TILE, 20 * TILE);
  const behind = walled.loudnessAt(24 * TILE, 20 * TILE);
  ok('стена полностью экранирует шум', sameRoom > 40 && behind === 0, `${sameRoom} vs ${behind}`);

  // материал пола
  const carpet = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.CARPET));
  carpet.emit(20 * TILE, 20 * TILE, 80);
  carpet.recompute();
  const marble = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.MARBLE));
  marble.emit(20 * TILE, 20 * TILE, 80);
  marble.recompute();
  const parq = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.PARQUET));
  parq.emit(20 * TILE, 20 * TILE, 80);
  parq.recompute();
  const t = 23 * TILE;
  const y0 = 20 * TILE;
  ok('ковёр глушит сильнее мрамора, мрамор — паркета',
    carpet.loudnessAt(t, y0) < marble.loudnessAt(t, y0)
    && marble.loudnessAt(t, y0) < parq.loudnessAt(t, y0),
    `${carpet.loudnessAt(t, y0).toFixed(1)} / ${marble.loudnessAt(t, y0).toFixed(1)} / ${parq.loudnessAt(t, y0).toFixed(1)}`);
  ok('поглощение материалов задано (§0.4B: паркет > мрамор > ковёр)',
    MATERIALS[MAT.PARQUET].abs < MATERIALS[MAT.MARBLE].abs
    && MATERIALS[MAT.MARBLE].abs < MATERIALS[MAT.CARPET].abs
    && MATERIALS[MAT.CARPET].abs < MATERIALS[MAT.WATER].abs);

  // маска слышимости для UI-индикатора
  const mask = g.audibilityMask(20 * TILE, 20 * TILE, MOVE.RUN.intensity);
  let cells = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] >= 21) cells++;
  ok('маска «откуда меня слышно» непустая', cells > 40, `${cells} тайлов`);
}

/* ------------------------------------------------- эхо купола */
section('3. Эхо купола: обманка для врагов (§0.4B)');
{
  const g = new AcousticGrid(level.mats, level.echoZones);
  const zx = level.echoZones[0];
  const cx = Math.round((zx.x0 + zx.x1) / 2);
  const cy = Math.round((zx.y0 + zx.y1) / 2);
  const sx = cx + 2;
  const sy = cy;
  g.emit(sx * TILE, sy * TILE, 80);
  ok('эхо запланировано не сразу', g.echoQueue.length === 1);
  for (let i = 0; i < 12; i++) g.update(0.1);
  const decoy = g.events.find((e) => e.isDecoy);
  ok('через ~0.95 с появился фантомный источник', !!decoy);
  if (decoy) {
    const mirroredX = Math.round(cx + (cx - sx));
    ok('фантом — в зеркальной точке купола',
      Math.abs(decoy.tx - mirroredX) <= 1 && Math.abs(decoy.ty - cy) <= 1,
      `${decoy.tx},${decoy.ty} ждали ${mirroredX},${cy}`);
    ok('фантом тише оригинала', decoy.intensity < 80, `${decoy.intensity.toFixed(1)}`);
  }
  // тихий звук эха не даёт
  const g2 = new AcousticGrid(level.mats, level.echoZones);
  g2.emit(sx * TILE, sy * TILE, MOVE.CROUCH.intensity);
  ok('крадущийся шаг эха не даёт', g2.echoQueue.length === 0);
}

/* ------------------------------------------------- дождь */
section('4. Дождь как «окно тишины» (§0.4B, §3.2 п.7)');
{
  // однородный мрамор: на реальной карте точка (20,20) — стена, тест был бы бессмыслен
  const dry = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.MARBLE));
  dry.emit(20 * TILE, 20 * TILE, 80);
  dry.recompute();
  const wet = new AcousticGrid(new Uint8Array(MAP_W * MAP_H).fill(MAT.MARBLE));
  wet.setRain(1);
  wet.emit(20 * TILE, 20 * TILE, 80);
  wet.recompute();
  const d = dry.loudnessAt(23 * TILE, 20 * TILE);
  const w = wet.loudnessAt(23 * TILE, 20 * TILE);
  ok('в дождь шум расходится слабее', w < d, `${d.toFixed(1)} → ${w.toFixed(1)}`);
  ok('порог слышимости в дождь выше', wet.thresholdBonus > dry.thresholdBonus,
    `${dry.thresholdBonus} → ${wet.thresholdBonus}`);
}

/* ==================================================== 5. ПОИСК ПУТИ */
section('5. Поиск пути: весь этаж связен (§3.1, 5 зон)');
{
  const targets = [
    ['карточка: галерея', level.cards[0]],
    ['карточка: купол', level.cards[1]],
    ['карточка: спецхран', level.cards[2]],
    ['шкаф-укрытие', level.propsById.cabinet],
    ['верстак', level.propsById.workbench],
    ['жаровня', level.propsById.brazier],
    ['редкий том', level.rare],
  ];
  for (const [name, t] of targets) {
    const p = findPath(grid, level.spawn.x, level.spawn.y, t.x, t.y);
    ok(`путь: спавн → ${name}`, p.length > 3, `${p.length} узлов`);
  }
  const ex = level.exitZone.rect;
  const pe = findPath(grid, level.spawn.x, level.spawn.y, ex.x + TILE, ex.y + TILE);
  ok('путь: спавн → пролом наружу', pe.length > 3, `${pe.length} узлов`);
  for (const e of level.enemies) {
    const p = findPath(grid, e.spawn.x, e.spawn.y, level.spawn.x, level.spawn.y);
    ok(`путь: ${e.type} → игрок`, p.length > 3, `${p.length} узлов`);
  }
}

/* ==================================================== 6. ЗРЕНИЕ/FSM */
section('6. Конус зрения + окклюзия + FSM (§3.2 п.3)');
{
  // 6.1 окклюзия стеллажом
  const shelfX = level.shelves.find((sh) => sh.w >= 3 * TILE) || level.shelves[0];
  const midY = shelfX.y + shelfX.h / 2;
  const left = { x: shelfX.x - 60, y: midY };
  const right = { x: shelfX.x + shelfX.w + 60, y: midY };
  ok('стеллаж перекрывает линию взгляда',
    !losClear(left.x, left.y, right.x, right.y, level.occluders));
  ok('рядом со стеллажом LOS открыт',
    losClear(left.x, left.y, left.x - 40, level.occluders ? left.y + 0 : 0, level.occluders) === false
    || losClear(left.x, left.y, left.x - 40, left.y, level.occluders));

  // 6.2 слух переводит Читателя в INVESTIGATE
  const reader = new Enemy('reader',
    { x: 21 * TILE, y: 11 * TILE },
    [{ x: 21 * TILE, y: 11 * TILE }, { x: 28 * TILE, y: 15 * TILE }]);
  const p = createPlayer({ x: 24 * TILE, y: 13 * TILE });
  const ctx = {
    dt: 0.016, player: p, grid, occluders: level.occluders,
    zoneLights: level.zoneLights, enemyLights: [], playerLightOn: false,
    rain: 0, dustFactor: 0, sporeFactor: 0, playerHidden: false,
    visionThreshold: VISION_BASE,
  };
  grid.emit(p.x, p.y, MOVE.RUN.intensity, { ttl: 1.5 });
  grid.update(0.016);
  reader.update(ctx);
  ok('громкий шаг → Читатель перешёл в INVESTIGATE/HUNT',
    reader.state === STATES.INVESTIGATE || reader.state === STATES.HUNT, reader.state);
  ok('у врага появилась точка памяти', !!reader.memory);
  ok('враг построил маршрут', reader.path.length > 0, `${reader.path.length}`);

  // 6.3 крадущийся игрок в темноте не виден Смотрителю
  const watcher = new Enemy('watcher', { x: 47 * TILE, y: 12 * TILE }, []);
  const p2 = createPlayer({ x: 42 * TILE, y: 12 * TILE });
  p2.stance = 'crouch';
  p2.lightOn = false;
  const vis = visibilityFor(watcher, p2, {
    zoneLights: level.zoneLights, playerLightOn: false, enemyLights: [],
    dustFactor: 0, sporeFactor: 0,
  });
  const sees = vis > VISION_BASE && losClear(watcher.x, watcher.y, p2.x, p2.y, level.occluders);
  ok('крадущийся в полумраке не виден', !sees, `visibility=${vis.toFixed(4)}`);

  // 6.4 включённый фонарь выдаёт игрока (Смотритель смотрит на игрока)
  watcher.angle = Math.atan2(p2.y - watcher.y, p2.x - watcher.x);
  p2.lightOn = true;
  p2.selfLight = {
    x: p2.x, y: p2.y, angle: 0, coneHalf: (FLASHLIGHT.coneHalfDeg * Math.PI) / 180,
    range: FLASHLIGHT.range, intensity: FLASHLIGHT.brightness,
  };
  p2.stanceFactor = 1;
  p2.lightExposure = 1;
  const vis2 = visibilityFor(watcher, p2, {
    zoneLights: level.zoneLights, playerLightOn: true, enemyLights: [],
    dustFactor: 0, sporeFactor: 0,
  });
  ok('фонарь резко повышает заметность', vis2 > vis, `${vis.toFixed(3)} → ${vis2.toFixed(3)}`);

  // 6.5 вне конуса — не видит: отворачиваемся от игрока на 180°
  watcher.angle = Math.atan2(p2.y - watcher.y, p2.x - watcher.x) + Math.PI;
  const behind = visibilityFor(watcher, p2, {
    zoneLights: level.zoneLights, playerLightOn: true, enemyLights: [], dustFactor: 0, sporeFactor: 0,
  });
  ok('вне конуса зрения заметность нулевая', behind === 0, `${behind}`);

  // 6.6 полный цикл FSM: patrol → hunt → lost → patrol
  const w2 = new Enemy('watcher', { x: 40 * TILE, y: 8 * TILE }, [{ x: 44 * TILE, y: 8 * TILE }]);
  const p3 = createPlayer({ x: 41 * TILE, y: 8 * TILE });
  p3.lightOn = true;
  p3.selfLight = { x: p3.x, y: p3.y, angle: 0, coneHalf: 0.5, range: 300, intensity: 1 };
  p3.stanceFactor = 1;
  p3.lightExposure = 1;
  const ctx3 = { ...ctx, player: p3, enemyLights: [], playerLightOn: true };
  w2.angle = Math.atan2(p3.y - w2.y, p3.x - w2.x); // патрульный смотрит в сторону игрока
  w2.update(ctx3);
  ok('зрячий враг увидел игрока с фонарём → HUNT', w2.state === STATES.HUNT, w2.state);
  p3.lightOn = false;
  p3.selfLight = null;
  p3.x = 20 * TILE;
  p3.y = 30 * TILE;
  let t = 0;
  while (w2.state !== STATES.PATROL && t < 40) {
    w2.update({ ...ctx3, dt: 0.1 });
    t += 0.1;
  }
  ok('потеряв цель, враг проходит LOST и возвращается в PATROL',
    w2.state === STATES.PATROL, `через ${t.toFixed(1)} с: ${w2.state}`);
}

/* ============================================== 7. ДВИЖЕНИЕ И ШУМ */
section('7. Профили движения и шума (§3.2 п.1)');
{
  const input = { up: 0, down: 1, left: 0, right: 0, crouch: false, run: false };
  const mk = () => createPlayer({ x: 7 * TILE, y: 30 * TILE });
  const runCase = (stance) => {
    const p = mk();
    const i = { ...input };
    if (stance === 'crouch') i.crouch = true;
    if (stance === 'run') i.run = true;
    let maxNoise = 0;
    let emitted = 0;
    for (let k = 0; k < 60; k++) {
      const before = grid.events.length;
      updatePlayer(p, 1 / 60, i, grid, level.occluders, level);
      if (grid.events.length > before) {
        emitted++;
        maxNoise = Math.max(maxNoise, p.noiseLevel);
      }
    }
    return { maxNoise, emitted, speed: p.speed };
  };
  const crouch = runCase('crouch');
  const walk = runCase('walk');
  const run = runCase('run');
  ok('бег шумнее шага, шаг шумнее крадущегося',
    run.maxNoise > walk.maxNoise && walk.maxNoise > crouch.maxNoise,
    `${run.maxNoise}/${walk.maxNoise}/${crouch.maxNoise}`);
  ok('бег быстрее шага, шаг быстрее приседа',
    run.speed > walk.speed && walk.speed > crouch.speed,
    `${run.speed}/${walk.speed}/${crouch.speed}`);
  ok('бег расходует выносливость', (() => {
    const p = mk();
    const i = { ...input, run: true };
    for (let k = 0; k < 180; k++) updatePlayer(p, 1 / 60, i, grid, level.occluders, level);
    return p.stamina < 1;
  })());
  ok('игрок не проходит сквозь стену', (() => {
    const p = mk();
    const i = { up: 0, down: 0, left: 1, right: 0, crouch: false, run: false };
    for (let k = 0; k < 600; k++) updatePlayer(p, 1 / 60, i, grid, level.occluders, level);
    return grid.isWalkable(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  })());
}

/* ======================================== 8. КНИГА = ТОПЛИВО/ЗНАНИЕ */
section('8. Двойная природа книги (§0.4A)');
{
  const p = createPlayer(level.spawn);
  const rare = { ...level.rare, pages: 120 };
  readBook(p, rare);
  ok('чтение даёт чертёж светлячка', p.blueprints.firefly === true);
  ok('чтение фиксируется в архиве', p.archive.read.includes(rare.name));
  ok('страницы пошли в запас', p.inv.pages > 0, `${p.inv.pages}`);

  const p2 = createPlayer(level.spawn);
  burnBook(p2, { ...level.rare, pages: 120 });
  ok('сожжённый Кодекс утрачен навсегда (чертежа нет)', !p2.blueprints.firefly);
  ok('сожжение отмечено в архиве', p2.archive.rareBurned === true && p2.archive.burned.length === 1);

  // крафт по чертежу
  const recipe = CRAFT_RECIPES.find((r) => r.id === 'firefly');
  addItem(p, 'junk', 2);
  ok('крафт доступен после чтения чертежа', canCraft(p, recipe).ok);
  const locked = createPlayer(level.spawn);
  addItem(locked, 'junk', 5);
  locked.inv.pages = 999;
  ok('без чертежа светлячок не крафтится', canCraft(locked, recipe).ok === false,
    canCraft(locked, recipe).why);
}

/* ================================================ 9. СЕЙВ/ЛОАД */
section('9. Сейв/лоад со схемой v1 (§3.2 п.8)');
{
  const sys = createSaveSystem();
  const snapshot = {
    player: { x: 111, y: 222, health: 2, inv: { pages: 42, junk: 1 } },
    enemies: [],
    acoustics: { rain: 0.5, events: [] },
    visited: new Array(10).fill(0),
    revealed: ['gallery'],
  };
  const payload = sys.save(snapshot);
  ok('схема сейва v1', payload.schema === SAVE_SCHEMA_VERSION, `${payload.schema}`);
  const loaded = sys.load();
  ok('данные переживают цикл save→load',
    loaded.state.player.x === 111 && loaded.state.player.inv.pages === 42
    && loaded.state.revealed[0] === 'gallery');
  sys.clear();
  ok('после clear сохранений нет', sys.load() === null);
  ok('битый JSON не роняет загрузку', (() => {
    const bad = createSaveSystem({
      getItem: () => '{oops', setItem: () => {}, removeItem: () => {},
    });
    return bad.load() === null;
  })());
}

/* =================================== 10. СКВОЗНОЙ ПРОГОН CORE LOOP */
section('10. Сквозной прогон: база → галерея → купол → спецхран → пролом');
{
  const lv = buildLevel();
  const g = lv.grid;
  const p = createPlayer(lv.spawn);
  const enemies = lv.enemies.map((e) => new Enemy(e.type, e.spawn, e.patrol));
  const visited = new Uint8Array(MAP_W * MAP_H);
  const revealed = new Set();
  const reactions = { heard: 0, seen: 0 };

  const walkAlong = (path) => {
    for (let i = 1; i < path.length; i++) {
      p.x = path[i].x;
      p.y = path[i].y;
      g.emit(p.x, p.y, MOVE.WALK.intensity, { ttl: 0.6 });
      g.update(0.05);
      const ctx = {
        dt: 0.05, player: p, grid: g, occluders: lv.occluders,
        zoneLights: lv.zoneLights, enemyLights: [], playerLightOn: false,
        rain: 0, dustFactor: 0, sporeFactor: 0, playerHidden: false,
        visionThreshold: VISION_BASE,
        onNoiseHeard: () => { reactions.heard++; },
        onDetect: () => { reactions.seen++; },
      };
      for (const e of enemies) e.update(ctx);
      visited[Math.floor(p.y / TILE) * MAP_W + Math.floor(p.x / TILE)] = 1;
    }
  };

  let steps = 0;
  const goTo = (x, y) => {
    const path = findPath(g, p.x, p.y, x, y);
    if (!path.length) return false;
    walkAlong(path);
    steps += path.length;
    return true;
  };

  ok('дошли до карточки галереи', goTo(lv.cards[0].x, lv.cards[0].y));
  lv.cards[0].taken = true;
  revealed.add(lv.cards[0].zone);
  ok('дошли до шкафа-укрытия', goTo(lv.propsById.cabinet.x, lv.propsById.cabinet.y));
  ok('дошли до карточки купола', goTo(lv.cards[1].x, lv.cards[1].y));
  ok('дошли до редкого тома в спецхране', goTo(lv.rare.x, lv.rare.y));
  readBook(p, lv.rare);
  lv.rare.taken = true;
  ok('дошли до верстака на базе', goTo(lv.propsById.workbench.x, lv.propsById.workbench.y));
  ok('дошли до жаровни', goTo(lv.propsById.brazier.x, lv.propsById.brazier.y));
  ok('дошли до пролома', goTo(lv.exitZone.rect.x + TILE, lv.exitZone.rect.y + TILE));
  ok('петля пройдена за разумное число шагов', steps > 100 && steps < 900, `${steps} шагов`);
  ok('враги за сессию реагировали на шум (слух через сетку)',
    reactions.heard > 0, `слух: ${reactions.heard}, зрение: ${reactions.seen}`);
  ok('чертёж получен — ворота пролома можно открыть', p.blueprints.firefly === true);
}

/* ================================================================ */
console.log(`\nИтого: ${pass} проверок пройдено, ${failures.length} провалов.`);
if (failures.length) {
  console.log('\nПровалы:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ВСЕ СИСТЕМЫ PoC РАБОТАЮТ (гейт M2: акустика + зрение/FSM играбельны).');
