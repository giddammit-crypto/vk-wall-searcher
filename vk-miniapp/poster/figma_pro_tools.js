/**
 * AURORA DESIGN — Figma Pro Tools
 * ============================================================
 * Недостающие инструменты редактора (как в Figma):
 *   1.  Ctrl/Cmd + A        — Выделить все объекты
 *   2.  Tab / Shift+Tab     — Цикл по слоям (вперёд/назад)
 *   3.  Shift+2 / Shift+1   — Zoom to selection / Zoom 100%
 *   4.  Выравнивание нескольких объектов относительно друг друга
 *   5.  Распределение объектов (по горизонтали / вертикали)
 *   6.  Copy/Paint Style (Ctrl+Alt+C / Ctrl+Alt+V) + Alt+клик пипеткой стиля
 *   7.  Вставка на место (Ctrl+Shift+V) — без сдвига +24
 *   8.  Alt+перетаскивание  — быстрое дублирование объекта
 *   9.  Новые фигуры: треугольник, эллипс, полукруг, пентагон, ромб
 *   10. Переименование слоя двойным кликом (dblclick в панели слоёв)
 *   11. Тип обводки: сплошная / пунктир / точки для выделенного объекта
 *   12. Snap к краям и центрам ДРУГИХ объектов (peer snapping)
 *   13. Карандаш: 3 кисти (карандаш / маркер / распылитель)
 *
 * Подключается после fabric.js и до editor.js. Функции привязываются
 * к editor.js через хук window.AuroraFigmaPro.install(ctx) — вызывается
 * из editor.js после инициализации холста.
 * Разработка: Аврора (2026)
 */
(function () {
  'use strict';

  const Pro = {
    canvas: null,
    currentSize: { w: 595, h: 842 },
    // Доступ к внутренним функциям editor.js (передаются при install)
    hooks: {},
    _clipboardStyle: null,
    _installed: false
  };

  /* ────────────────────────────────────────────────────────────
     УТИЛИТЫ
     ──────────────────────────────────────────────────────────── */
  function canvas() { return Pro.canvas; }
  function toast(text) { if (typeof Pro.hooks.toast === 'function') Pro.hooks.toast(text); }
  function saveHistory() { if (typeof Pro.hooks.saveHistory === 'function') Pro.hooks.saveHistory(); }
  function updateLayersList() { if (typeof Pro.hooks.updateLayersList === 'function') Pro.hooks.updateLayersList(); }
  function onSelection() { if (typeof Pro.hooks.onSelection === 'function') Pro.hooks.onSelection(); }
  function applyZoom(z) { if (typeof Pro.hooks.applyZoom === 'function') return Pro.hooks.applyZoom(z); }
  function activateSelectTool(t) { if (typeof Pro.hooks.activateSelectTool === 'function') Pro.hooks.activateSelectTool(t); }
  function getZoom() { return (typeof Pro.hooks.getZoom === 'function') ? Pro.hooks.getZoom() : 1; }
  function updateFigmaDimensionsUI(obj) { if (typeof Pro.hooks.updateFigmaDimensionsUI === 'function') Pro.hooks.updateFigmaDimensionsUI(obj); }

  /* ────────────────────────────────────────────────────────────
     1. ВЫДЕЛИТЬ ВСЁ (Ctrl+A)
     ──────────────────────────────────────────────────────────── */
  function selectAllObjects() {
    const c = canvas();
    if (!c) return;
    const objs = c.getObjects().filter(o => o.selectable && o.visible !== false && !o.__isArtboardBg);
    if (!objs.length) { toast('На холсте нет объектов для выделения'); return; }
    if (objs.length === 1) {
      c.setActiveObject(objs[0]);
    } else {
      const sel = new fabric.ActiveSelection(objs, { canvas: c });
      c.setActiveObject(sel);
    }
    c.requestRenderAll();
    onSelection();
    toast(`Выделено объектов: ${objs.length} (Ctrl+A)`);
  }

  /* ────────────────────────────────────────────────────────────
     2. ЦИКЛ ПО СЛОЯМ (Tab / Shift+Tab)
     ──────────────────────────────────────────────────────────── */
  function cycleLayerSelection(backwards) {
    const c = canvas();
    if (!c) return;
    const objs = c.getObjects().filter(o => o.selectable && o.visible !== false && !o.__isArtboardBg);
    if (!objs.length) return;
    const active = c.getActiveObject();
    // Для мультиселекта выходим из него и берём последний объект выделения
    let idx = -1;
    if (active && active.type === 'activeSelection') {
      const list = active.getObjects();
      const last = list[list.length - 1];
      idx = objs.indexOf(last);
    } else if (active) {
      idx = objs.indexOf(active);
    }
    let next;
    if (backwards) {
      next = objs[(idx - 1 + objs.length) % objs.length];
    } else {
      next = objs[(idx + 1) % objs.length];
    }
    c.setActiveObject(next);
    c.requestRenderAll();
    onSelection();
    // Прокручиваем панель слоёв к активному слою
    const row = document.querySelector(`.layer-row[data-idx="${c.getObjects().indexOf(next)}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ────────────────────────────────────────────────────────────
     3. ZOOM TO SELECTION (Shift+2) / ZOOM 100% (Shift+1)
     ──────────────────────────────────────────────────────────── */
  function zoomToSelection() {
    const c = canvas();
    const area = document.getElementById('canvas-area');
    if (!c || !area) return;
    const obj = c.getActiveObject();
    if (!obj) { toast('Выделите объект для зума (Shift+2)'); return; }

    const pad = (typeof Pro.hooks.CANVAS_PADDING === 'number') ? Pro.hooks.CANVAS_PADDING : 40;
    const ow = obj.getScaledWidth();
    const oh = obj.getScaledHeight();
    const cx = (obj.left || 0) + ow / 2;   // в координатах артборда
    const cy = (obj.top || 0) + oh / 2;

    const areaW = area.clientWidth - 80;
    const areaH = area.clientHeight - 80;
    // Зум так, чтобы объект занял ~60% меньшей стороны
    const z = Math.min(Math.max(Math.min(areaW / (ow * 1.6), areaH / (oh * 1.6)), 0.08), 4.0);

    applyZoom(z);

    // Центрируем прокрутку на объекте
    requestAnimationFrame(() => {
      const vp = c.viewportTransform || [z, 0, 0, z, pad * z, pad * z];
      const targetX = (pad + cx) * z - area.clientWidth / 2;
      const targetY = (pad + cy) * z - area.clientHeight / 2;
      area.scrollLeft = Math.max(0, targetX);
      area.scrollTop  = Math.max(0, targetY);
    });
    toast('Zoom к выделенному объекту (Shift+2)');
  }

  function zoomTo100() {
    applyZoom(1);
    const c = canvas();
    const obj = c && c.getActiveObject();
    if (obj) {
      const area = document.getElementById('canvas-area');
      const pad = (typeof Pro.hooks.CANVAS_PADDING === 'number') ? Pro.hooks.CANVAS_PADDING : 40;
      if (area) {
        requestAnimationFrame(() => {
          const cx = (obj.left || 0) + obj.getScaledWidth() / 2;
          const cy = (obj.top || 0) + obj.getScaledHeight() / 2;
          area.scrollLeft = Math.max(0, (pad + cx) - area.clientWidth / 2);
          area.scrollTop  = Math.max(0, (pad + cy) - area.clientHeight / 2);
        });
      }
    }
    toast('Масштаб 100% (Shift+1)');
  }

  /* ────────────────────────────────────────────────────────────
     4. ВЫРАВНИВАНИЕ НЕСКОЛЬКИХ ОБЪЕКТОВ ДРУГ ОТНОСИТЕЛЬНО ДРУГА
     (когда выделено 2+, выравниваем внутри общей границы выделения;
      иначе — относительно холста через хук editor.js)
     ──────────────────────────────────────────────────────────── */
  function alignSelection(mode) {
    const c = canvas();
    if (!c) return false;
    const obj = c.getActiveObject();
    if (!obj || obj.type !== 'activeSelection') return false; // fallback на editor.js

    const items = obj.getObjects();
    if (items.length < 2) return false;

    // Общая граница выделения
    let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    items.forEach(o => {
      const l = o.left || 0, t = o.top || 0;
      const w = o.getScaledWidth(), h = o.getScaledHeight();
      minL = Math.min(minL, l); minT = Math.min(minT, t);
      maxR = Math.max(maxR, l + w); maxB = Math.max(maxB, t + h);
    });
    const boundsW = maxR - minL, boundsH = maxB - minT;

    items.forEach(o => {
      const w = o.getScaledWidth(), h = o.getScaledHeight();
      const ox = o.originX || 'left', oy = o.originY || 'top';
      switch (mode) {
        case 'left':   o.set('left', ox === 'center' ? minL + w / 2 : minL); break;
        case 'right':  o.set('left', ox === 'center' ? maxR - w / 2 : maxR - w); break;
        case 'center-h': o.set('left', ox === 'center' ? minL + boundsW / 2 : minL + (boundsW - w) / 2); break;
        case 'top':    o.set('top', oy === 'center' ? minT + h / 2 : minT); break;
        case 'bottom': o.set('top', oy === 'center' ? maxB - h / 2 : maxB - h); break;
        case 'center-v': o.set('top', oy === 'center' ? minT + boundsH / 2 : minT + (boundsH - h) / 2); break;
      }
      o.setCoords();
    });

    // Пересчёт границы activeSelection
    obj.setCoords();
    c.requestRenderAll();
    saveHistory();
    toast('Выравнивание внутри выделения (Figma)');
    return true;
  }

  /* ────────────────────────────────────────────────────────────
     5. РАСПРЕДЕЛЕНИЕ (Distribute H/V) — равные промежутки
     ──────────────────────────────────────────────────────────── */
  function distributeSelection(axis) {
    const c = canvas();
    if (!c) return;
    const obj = c.getActiveObject();
    let items;
    let selection = null;
    if (obj && obj.type === 'activeSelection') {
      items = obj.getObjects().slice();
      selection = obj;
    } else {
      // Распределяем все объекты холста, если выделен один
      items = c.getObjects().filter(o => o.selectable && o.visible !== false && !o.__isArtboardBg);
    }
    if (!items || items.length < 3) { toast('Для распределения нужно 3+ объекта'); return; }

    const key = axis === 'h' ? 'left' : 'top';
    const size = axis === 'h' ? o => o.getScaledWidth() : o => o.getScaledHeight();

    items.sort((a, b) => (a[key] || 0) - (b[key] || 0));
    const first = items[0], last = items[items.length - 1];
    const spanStart = first[key];
    const spanEnd = last[key] + size(last);
    const totalSizes = items.slice(1, -1).reduce((s, o) => s + size(o), 0);
    const gap = (spanEnd - spanStart - totalSizes) / (items.length - 1);

    let cursor = spanStart;
    items.forEach(o => {
      const ox = o.originX || 'left';
      const oy = o.originY || 'top';
      if (axis === 'h') {
        o.set('left', ox === 'center' ? cursor + o.getScaledWidth() / 2 : cursor);
      } else {
        o.set('top', oy === 'center' ? cursor + o.getScaledHeight() / 2 : cursor);
      }
      o.setCoords();
      cursor += size(o) + gap;
    });

    if (selection) selection.setCoords();
    c.requestRenderAll();
    saveHistory();
    toast(`Распределение по ${axis === 'h' ? 'горизонтали' : 'вертикали'} выполнено`);
  }

  /* ────────────────────────────────────────────────────────────
     6. COPY / PAINT STYLE
     ──────────────────────────────────────────────────────────── */
  const STYLE_PROPS = ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'strokeLineCap', 'strokeLineJoin',
    'opacity', 'shadow', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'underline', 'linethrough', 'overline', 'textAlign', 'charSpacing', 'lineHeight', 'globalCompositeOperation', 'rx', 'ry'];

  function copyObjectStyle() {
    const obj = canvas()?.getActiveObject();
    if (!obj) { toast('Выделите объект-источник стиля'); return; }
    Pro._clipboardStyle = {};
    STYLE_PROPS.forEach(p => {
      if (obj[p] !== undefined) {
        try {
          Pro._clipboardStyle[p] = (p === 'shadow' && obj.shadow) ? obj.shadow.clone() : obj[p];
        } catch (e) { Pro._clipboardStyle[p] = obj[p]; }
      }
    });
    toast('Стиль скопирован (Ctrl+Alt+C) — примените на другом объекте');
  }

  function applyObjectStyle() {
    const obj = canvas()?.getActiveObject();
    if (!obj || !Pro._clipboardStyle) { toast('Нет скопированного стиля (Ctrl+Alt+C)'); return; }
    const patch = {};
    Object.entries(Pro._clipboardStyle).forEach(([p, v]) => {
      // Размер шрифта переносим 1:1 только между текстовыми
      if (p === 'fontSize' && !['textbox', 'text', 'i-text'].includes(obj.type)) return;
      if (['fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'charSpacing', 'lineHeight', 'underline', 'linethrough', 'overline'].includes(p)
          && !['textbox', 'text', 'i-text'].includes(obj.type)) return;
      patch[p] = v;
    });
    obj.set(patch);
    if (obj.type === 'textbox' || obj.type === 'i-text') obj.initDimensions?.();
    obj.setCoords();
    canvas().requestRenderAll();
    saveHistory();
    onSelection();
    toast('Стиль применён (Ctrl+Alt+V) 🎨');
  }

  /* ────────────────────────────────────────────────────────────
     7. ВСТАВИТЬ НА МЕСТО (Ctrl+Shift+V) — клон без сдвига
     ──────────────────────────────────────────────────────────── */
  function pasteInPlace() {
    const c = canvas();
    if (!c || !Pro.hooks.getClipboard || !Pro.hooks.getClipboard()) {
      // fallback: сообщим через editor.js
      if (Pro.hooks.pasteCopiedObject) { Pro.hooks.pasteCopiedObject(); return; }
      return;
    }
    const src = Pro.hooks.getClipboard();
    src.clone(cloned => {
      c.discardActiveObject();
      cloned.set({ evented: true }); // тот же left/top — вставка «на место»
      if (cloned.type === 'activeSelection') {
        cloned.canvas = c;
        cloned.forEachObject(o => c.add(o));
        cloned.setCoords();
      } else {
        c.add(cloned);
      }
      c.setActiveObject(cloned);
      c.requestRenderAll();
      saveHistory();
      updateLayersList();
      toast('Вставлено на место (Ctrl+Shift+V)');
    }, Pro.hooks.CUSTOM_PROPS_TO_SAVE);
  }

  /* ────────────────────────────────────────────────────────────
     8. ALT + ПЕРЕТАСКИВАНИЕ = ДУБЛИРОВАНИЕ (Figma/Photoshop)
     ──────────────────────────────────────────────────────────── */
  function installAltDragDuplicate() {
    const c = canvas();
    if (!c) return;
    let _altClone = null;
    let _altSource = null;

    c.on('mouse:down', opt => {
      if (!opt.e.altKey || c.isDrawingMode) return;
      const target = opt.target;
      if (!target || !target.selectable || target.__isArtboardBg) return;
      // Прерываем стандартный drag и начинаем перенос клона
      _altSource = target;
      target.clone(cloned => {
        cloned.set({ left: target.left, top: target.top, evented: true });
        if (cloned.type === 'activeSelection') {
          cloned.canvas = c;
          cloned.forEachObject(o => c.add(o));
        } else {
          c.add(cloned);
        }
        _altClone = cloned;
        c.setActiveObject(cloned);
        c.requestRenderAll();
      }, Pro.hooks.CUSTOM_PROPS_TO_SAVE);
    });

    // После mouse:up фиксируем историю, если клон создан и сдвинут
    c.on('mouse:up', () => {
      if (_altClone) {
        const moved = _altSource && (_altClone.left !== _altSource.left || _altClone.top !== _altSource.top);
        _altClone = null;
        _altSource = null;
        // Небольшая задержка: fabric завершает transform после mouse:up
        setTimeout(() => {
          saveHistory();
          updateLayersList();
          if (moved !== false) toast('Объект продублирован (Alt + перетаскивание)');
        }, 50);
      }
    });
  }

  /* ────────────────────────────────────────────────────────────
     9. НОВЫЕ ФИГУРЫ
     ──────────────────────────────────────────────────────────── */
  function _centerShape() {
    const size = Pro.currentSize || Pro.hooks.getCurrentSize?.() || { w: 595, h: 842 };
    return { cx: size.w / 2, cy: size.h / 2 };
  }
  function _addAndSelect(o, label) {
    const c = canvas();
    if (!c) return;
    c.add(o);
    c.setActiveObject(o);
    c.renderAll();
    updateLayersList();
    if (label) toast(label);
  }

  function addTriangle() {
    if (!canvas()) return;
    const { cx, cy } = _centerShape();
    const t = new fabric.Triangle({
      left: cx - 70, top: cy - 65, width: 140, height: 130,
      fill: 'rgba(251,191,36,0.2)', stroke: '#FBBF24', strokeWidth: 2,
      selectable: true,
    });
    _addAndSelect(t, 'Треугольник добавлен');
  }

  function addEllipse() {
    if (!canvas()) return;
    const { cx, cy } = _centerShape();
    const e = new fabric.Ellipse({
      left: cx - 90, top: cy - 55, rx: 90, ry: 55,
      fill: 'rgba(236,72,153,0.18)', stroke: '#EC4899', strokeWidth: 2,
      selectable: true,
    });
    _addAndSelect(e, 'Эллипс добавлен');
  }

  function addSemiCircle() {
    if (!canvas()) return;
    const { cx, cy } = _centerShape();
    const s = new fabric.Circle({
      left: cx - 65, top: cy - 65, radius: 65,
      fill: 'rgba(16,185,129,0.18)', stroke: '#10B981', strokeWidth: 2,
      selectable: true,
    });
    // Полукруг через clipPath верхней половины
    s.clipPath = new fabric.Rect({
      left: -65, top: 0, width: 130, height: 65,
      originX: 'center', originY: 'top', absolutePositioned: false,
    });
    _addAndSelect(s, 'Полукруг добавлен');
  }

  function addPentagon() {
    if (!canvas()) return;
    const { cx, cy } = _centerShape();
    // Правильный пятиугольник радиуса 70
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      pts.push({ x: 70 * Math.cos(a), y: 70 * Math.sin(a) });
    }
    const p = new fabric.Polygon(pts, {
      left: cx - 70, top: cy - 70,
      fill: 'rgba(139,108,255,0.2)', stroke: '#8A6CFF', strokeWidth: 2,
      selectable: true,
    });
    _addAndSelect(p, 'Пятиугольник добавлен');
  }

  function addDiamond() {
    if (!canvas()) return;
    const { cx, cy } = _centerShape();
    const d = new fabric.Polygon(
      [{ x: 0, y: -80 }, { x: 55, y: 0 }, { x: 0, y: 80 }, { x: -55, y: 0 }],
      {
        left: cx, top: cy, originX: 'center', originY: 'center',
        fill: 'rgba(56,189,248,0.18)', stroke: '#38BDF8', strokeWidth: 2,
        selectable: true,
      }
    );
    _addAndSelect(d, 'Ромб добавлен');
  }

  /* ────────────────────────────────────────────────────────────
     10. ПЕРЕИМЕНОВАНИЕ СЛОЯ (dblclick в панели слоёв)
     ──────────────────────────────────────────────────────────── */
  function installLayerRename() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.addEventListener('dblclick', e => {
      const nameEl = e.target.closest('.layer-name');
      if (!nameEl) return;
      const row = nameEl.closest('.layer-row');
      if (!row) return;
      const idx = +row.dataset.idx;
      const c = canvas();
      const obj = c && c.getObjects()[idx];
      if (!obj) return;

      const current = obj.layerName || nameEl.textContent || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current;
      input.className = 'layer-name-input';
      input.style.cssText = 'flex:1;min-width:0;background:#0d1526;border:1px solid #0d99ff;border-radius:6px;color:#fff;font-size:12px;padding:2px 6px;outline:none;';
      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const commit = () => {
        const val = input.value.trim();
        if (val && val !== current) {
          obj.set('layerName', val);
          saveHistory();
          updateLayersList();
          toast('Слой переименован');
        } else {
          updateLayersList();
        }
      };
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        if (ev.key === 'Escape') { ev.stopPropagation(); updateLayersList(); }
        ev.stopPropagation(); // не даём глобальным хоткеям срабатывать при вводе
      });
      input.addEventListener('blur', commit);
    });
  }

  /* ────────────────────────────────────────────────────────────
     11. ТИП ОБВОДКИ ВЫДЕЛЕННОГО ОБЪЕКТА (сплошная/пунктир/точки)
     ──────────────────────────────────────────────────────────── */
  const DASH_PRESETS = {
    solid: null,           // сплошная
    dashed: [10, 7],       // пунктир
    dotted: [2, 6],        // точки
    dashdot: [12, 6, 2, 6] // штрих-пунктир
  };

  function setStrokeStyle(kind) {
    const obj = canvas()?.getActiveObject();
    if (!obj || obj.type === 'activeSelection') return;
    obj.set('strokeDashArray', DASH_PRESETS[kind] || null);
    canvas().requestRenderAll();
    saveHistory();
    syncStrokeStyleUI(kind);
    toast('Тип обводки: ' + ({ solid: 'сплошная', dashed: 'пунктир', dotted: 'точки', dashdot: 'штрих-пунктир' }[kind] || kind));
  }

  function syncStrokeStyleUI(kind) {
    document.querySelectorAll('.stroke-style-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.strokeStyle === kind);
    });
  }

  function getStrokeKind(obj) {
    const d = obj && obj.strokeDashArray;
    if (!d || !d.length) return 'solid';
    if (d.length === 2 && d[0] >= 8) return 'dashed';
    if (d.length === 2 && d[0] <= 3) return 'dotted';
    return 'dashdot';
  }

  /* ────────────────────────────────────────────────────────────
     12. SNAP К ДРУГИМ ОБЪЕКТАМ (края и центры соседей)
     Подключается как ПРЕ-хук поверх существующего object:moving
     из editor.js: editor вызывает Pro.hooks.peerSnap(obj, e).
     ──────────────────────────────────────────────────────────── */
  function peerSnap(obj, e) {
    const c = canvas();
    if (!c || !obj) return;
    if (typeof Pro.hooks.isSnappingEnabled === 'function' && !Pro.hooks.isSnappingEnabled()) return;
    if (e && e.e && e.e.altKey) return; // Alt отключает привязку

    const TH = 8;
    const peers = c.getObjects().filter(o => o !== obj && o.visible !== false && !o.__isArtboardBg && !o.__isGuideLine);
    if (!peers.length) return;

    const ow = obj.getScaledWidth(), oh = obj.getScaledHeight();
    const my = {
      left: obj.left, right: obj.left + ow, cx: obj.left + ow / 2,
      top: obj.top, bottom: obj.top + oh, cy: obj.top + oh / 2
    };
    // Если объект внутри activeSelection — пропускаем соседей из той же группы
    const active = c.getActiveObject();
    const groupMates = (active && active.type === 'activeSelection') ? active.getObjects().filter(o => o !== obj) : [];

    const applySnapX = (target, guideX) => {
      obj.set('left', target); obj.setCoords();
      Pro.hooks.setSmartGuideX?.(guideX);
    };
    const applySnapY = (target, guideY) => {
      obj.set('top', target); obj.setCoords();
      Pro.hooks.setSmartGuideY?.(guideY);
    };

    for (const p of peers) {
      if (groupMates.includes(p)) continue;
      const pw = p.getScaledWidth(), ph = p.getScaledHeight();
      const pEdges = {
        left: p.left, right: p.left + pw, cx: p.left + pw / 2,
        top: p.top, bottom: p.top + ph, cy: p.top + ph / 2
      };
      // X-привязки: мой левый/правый/центр к его левому/правому/центру
      const xChecks = [
        [my.left - pEdges.left, pEdges.left, pEdges.left],
        [my.left - pEdges.right, pEdges.right, pEdges.right],
        [my.left - pEdges.cx, pEdges.cx, pEdges.cx],
        [my.right - pEdges.left, pEdges.left - ow, pEdges.left],
        [my.right - pEdges.right, pEdges.right - ow, pEdges.right],
        [my.right - pEdges.cx, pEdges.cx - ow / 2, pEdges.cx],
        [my.cx - pEdges.left, pEdges.left - ow / 2, pEdges.left],
        [my.cx - pEdges.right, pEdges.right - ow / 2, pEdges.right],
        [my.cx - pEdges.cx, pEdges.cx - ow / 2, pEdges.cx],
      ];
      for (const [diff, target, guide] of xChecks) {
        if (Math.abs(diff) < TH) { applySnapX(target, guide); break; }
      }
      // Y-привязки
      const yChecks = [
        [my.top - pEdges.top, pEdges.top, pEdges.top],
        [my.top - pEdges.bottom, pEdges.bottom, pEdges.bottom],
        [my.top - pEdges.cy, pEdges.cy, pEdges.cy],
        [my.bottom - pEdges.top, pEdges.top - oh, pEdges.top],
        [my.bottom - pEdges.bottom, pEdges.bottom - oh, pEdges.bottom],
        [my.bottom - pEdges.cy, pEdges.cy - oh / 2, pEdges.cy],
        [my.cy - pEdges.top, pEdges.top - oh / 2, pEdges.top],
        [my.cy - pEdges.bottom, pEdges.bottom - oh / 2, pEdges.bottom],
        [my.cy - pEdges.cy, pEdges.cy - oh / 2, pEdges.cy],
      ];
      for (const [diff, target, guide] of yChecks) {
        if (Math.abs(diff) < TH) { applySnapY(target, guide); break; }
      }
    }
  }

  /* ────────────────────────────────────────────────────────────
     13. КИСТИ КАРАНДАША: карандаш / маркер / распылитель
     ──────────────────────────────────────────────────────────── */
  function applyBrushKind(kind) {
    const c = canvas();
    if (!c) return;
    if (!c.freeDrawingBrush || c.freeDrawingBrush.__kind !== kind) {
      const color = (Pro.hooks.getPencilColor && Pro.hooks.getPencilColor()) || '#0d99ff';
      const width = (Pro.hooks.getPencilWidth && Pro.hooks.getPencilWidth()) || 4;
      switch (kind) {
        case 'marker':
          c.freeDrawingBrush = new fabric.PencilBrush(c);
          c.freeDrawingBrush.strokeLineCap = 'square';
          c.freeDrawingBrush.strokeLineJoin = 'miter';
          c.freeDrawingBrush.decimate = 1.5;
          c.freeDrawingBrush.width = Math.max(width * 4, 18); // широкий полупрозрачный
          if (c.freeDrawingBrush.setOpacity) {
            // PencilBrush не имеет opacity: применяем через цвет rgba в path:created
          }
          break;
        case 'spray':
          c.freeDrawingBrush = new fabric.SprayBrush(c);
          c.freeDrawingBrush.density = 12;
          c.freeDrawingBrush.dotWidth = 2;
          c.freeDrawingBrush.dotWidthVariance = 4;
          c.freeDrawingBrush.randomOpacity = true;
          break;
        case 'pencil':
        default:
          c.freeDrawingBrush = new fabric.PencilBrush(c);
          c.freeDrawingBrush.strokeLineCap = 'round';
          c.freeDrawingBrush.strokeLineJoin = 'round';
          break;
      }
      c.freeDrawingBrush.__kind = kind;
    }
    if (c.freeDrawingBrush.color !== undefined) {
      c.freeDrawingBrush.color = (Pro.hooks.getPencilColor && Pro.hooks.getPencilColor()) || '#0d99ff';
    }
    if (kind === 'pencil') {
      c.freeDrawingBrush.width = (Pro.hooks.getPencilWidth && Pro.hooks.getPencilWidth()) || 4;
    }
  }

  /* ────────────────────────────────────────────────────────────
     КЛАВИАТУРА
     ──────────────────────────────────────────────────────────── */
  function installHotkeys() {
    document.addEventListener('keydown', e => {
      const ae = document.activeElement;
      const inInput = ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable);

      // Ctrl+A — выделить всё (вне текстовых полей)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        selectAllObjects();
        return;
      }
      // Tab / Shift+Tab — цикл слоёв
      if (e.key === 'Tab' && !inInput) {
        e.preventDefault();
        cycleLayerSelection(e.shiftKey);
        return;
      }
      // Shift+2 — zoom to selection; Shift+1 — 100%
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === '2') {
        if (inInput) return;
        e.preventDefault(); zoomToSelection(); return;
      }
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === '1' || e.key === '!')) {
        if (inInput) return;
        e.preventDefault(); zoomTo100(); return;
      }
      // Ctrl+Alt+C / Ctrl+Alt+V — копировать/применить стиль
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation(); copyObjectStyle(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation(); applyObjectStyle(); return;
      }
      // Ctrl+Shift+V — вставить на место
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation(); pasteInPlace(); return;
      }
      // Alt+H / Alt+V — распределение выделения
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р')) {
        if (inInput) return;
        e.preventDefault(); distributeSelection('h'); return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П')) {
        if (inInput) return;
        e.preventDefault(); distributeSelection('v'); return;
      }

      // Alt+A / Alt+D / Alt+W / Alt+S — выравнивание (Figma)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = (e.key || '').toLowerCase();
        let alignMode = null;
        if (k === 'a' || k === 'ф') alignMode = 'left';
        else if (k === 'd' || k === 'в') alignMode = 'right';
        else if (k === 'w' || k === 'ц') alignMode = 'top';
        else if (k === 's' || k === 'ы') alignMode = 'bottom';

        if (alignMode) {
          if (inInput) return;
          e.preventDefault();
          if (!alignSelection(alignMode) && typeof Pro.hooks.alignActiveObject === 'function') {
            Pro.hooks.alignActiveObject(alignMode);
          }
          return;
        }
      }
    }, true); // capture: перехватываем ДО хендлера editor.js
  }

  /* ────────────────────────────────────────────────────────────
     14. ALT + НАВЕДЕНИЕ = ИЗМЕРЕНИЕ РАССТОЯНИЙ (Smart Distance / Measurement)
     Как в Figma: при выделенном объекте зажимаем Alt — показываются
     расстояния до границ артборда или до объекта под курсором
     ──────────────────────────────────────────────────────────── */
  let _isAltDown = false;
  let _hoveredPeer = null;

  function installAltMeasurement() {
    const c = canvas();
    if (!c) return;

    window.addEventListener('keydown', e => {
      if (e.key === 'Alt') {
        const ae = document.activeElement;
        const inInput = ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable);
        if (inInput) return;
        if (!_isAltDown) {
          _isAltDown = true;
          if (c.getActiveObject()) c.requestRenderAll();
        }
      }
    });

    window.addEventListener('keyup', e => {
      if (e.key === 'Alt') {
        if (_isAltDown) {
          _isAltDown = false;
          _hoveredPeer = null;
          c.requestRenderAll();
        }
      }
    });

    c.on('mouse:move', opt => {
      if (!_isAltDown) return;
      const active = c.getActiveObject();
      if (!active) return;

      const p = c.getPointer(opt.e);
      const objs = c.getObjects();
      let found = null;
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        if (o === active || !o.visible || o.__isArtboardBg || o.__isGuideLine) continue;
        if (active.type === 'activeSelection' && active.getObjects().includes(o)) continue;
        if (o.containsPoint(p)) {
          found = o;
          break;
        }
      }
      if (_hoveredPeer !== found) {
        _hoveredPeer = found;
        c.requestRenderAll();
      }
    });

    c.on('mouse:out', () => {
      if (_hoveredPeer) {
        _hoveredPeer = null;
        c.requestRenderAll();
      }
    });

    c.on('selection:cleared', () => {
      _hoveredPeer = null;
    });

    c.on('after:render', opt => {
      if (!_isAltDown) return;
      const active = c.getActiveObject();
      if (!active) return;
      const ctx = opt.ctx;
      if (!ctx) return;

      const vpt = c.viewportTransform || [1, 0, 0, 1, 0, 0];
      const isExporting = c._isExporting || (vpt[4] === 0 && vpt[5] === 0 && vpt[0] === 1);
      if (isExporting) return;

      const pad = (typeof Pro.hooks.CANVAS_PADDING === 'number') ? Pro.hooks.CANVAS_PADDING : 40;
      const z = (typeof Pro.hooks.getZoom === 'function') ? Pro.hooks.getZoom() : (c.getZoom() || 1);
      const size = Pro.currentSize || Pro.hooks.getCurrentSize?.() || { w: 595, h: 842 };

      drawFigmaMeasurement(ctx, active, _hoveredPeer, size, z, pad);
    });
  }

  function drawFigmaMeasurement(ctx, active, target, size, z, pad) {
    const toScreenX = x => (pad + x) * z;
    const toScreenY = y => (pad + y) * z;

    const aL = active.left, aT = active.top;
    const aW = active.getScaledWidth(), aH = active.getScaledHeight();
    const aR = aL + aW, aB = aT + aH;
    const aCX = aL + aW / 2, aCY = aT + aH / 2;

    const pink = '#f43f5e';

    ctx.save();

    const drawBadge = (txt, sx, sy) => {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      const textWidth = ctx.measureText(txt).width;
      const bw = textWidth + 8;
      const bh = 18;
      ctx.fillStyle = pink;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(sx - bw / 2, sy - bh / 2, bw, bh, 4);
      } else {
        ctx.rect(sx - bw / 2, sy - bh / 2, bw, bh);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, sx, sy);
      ctx.restore();
    };

    const drawLineWithBadge = (x1, y1, x2, y2, val) => {
      if (val <= 0) return;
      const sx1 = toScreenX(x1), sy1 = toScreenY(y1);
      const sx2 = toScreenX(x2), sy2 = toScreenY(y2);

      ctx.strokeStyle = pink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      if (Math.abs(sx1 - sx2) < 2) {
        ctx.moveTo(sx1 - 4, sy1); ctx.lineTo(sx1 + 4, sy1);
        ctx.moveTo(sx2 - 4, sy2); ctx.lineTo(sx2 + 4, sy2);
      } else {
        ctx.moveTo(sx1, sy1 - 4); ctx.lineTo(sx1, sy1 + 4);
        ctx.moveTo(sx2, sy2 - 4); ctx.lineTo(sx2, sy2 + 4);
      }
      ctx.stroke();

      drawBadge(String(Math.round(val)), (sx1 + sx2) / 2, (sy1 + sy2) / 2);
    };

    if (target) {
      const tL = target.left, tT = target.top;
      const tW = target.getScaledWidth(), tH = target.getScaledHeight();
      const tR = tL + tW, tB = tT + tH;
      const tCX = tL + tW / 2, tCY = tT + tH / 2;

      ctx.strokeStyle = pink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(toScreenX(tL), toScreenY(tT), tW * z, tH * z);

      if (aR < tL) {
        drawLineWithBadge(aR, (aCY + tCY) / 2, tL, (aCY + tCY) / 2, tL - aR);
      } else if (aL > tR) {
        drawLineWithBadge(tR, (aCY + tCY) / 2, aL, (aCY + tCY) / 2, aL - tR);
      }

      if (aB < tT) {
        drawLineWithBadge((aCX + tCX) / 2, aB, (aCX + tCX) / 2, tT, tT - aB);
      } else if (aT > tB) {
        drawLineWithBadge((aCX + tCX) / 2, tB, (aCX + tCX) / 2, aT, aT - tB);
      }
    } else {
      drawLineWithBadge(aCX, aT, aCX, 0, aT);
      drawLineWithBadge(aCX, aB, aCX, size.h, size.h - aB);
      drawLineWithBadge(aL, aCY, 0, aCY, aL);
      drawLineWithBadge(aR, aCY, size.w, aCY, size.w - aR);
    }

    ctx.restore();
  }

  /* ────────────────────────────────────────────────────────────
     УСТАНОВКА
     ──────────────────────────────────────────────────────────── */
  function install(ctx) {
    if (Pro._installed) return;
    Pro._installed = true;
    Pro.canvas = ctx.canvas;
    Pro.currentSize = ctx.currentSize || Pro.currentSize;
    Pro.hooks = ctx.hooks || {};

    installAltDragDuplicate();
    installLayerRename();
    installHotkeys();
    installAltMeasurement();

    // Встраиваем peer-snap в object:moving (после родного хендлера editor.js)
    const c = ctx.canvas;
    c.on('object:moving', e => peerSnap(e.target, e));

    // Экспорт API
    window.AuroraFigmaPro = {
      selectAllObjects, cycleLayerSelection, zoomToSelection, zoomTo100,
      alignSelection, distributeSelection,
      copyObjectStyle, applyObjectStyle, pasteInPlace,
      addTriangle, addEllipse, addSemiCircle, addPentagon, addDiamond,
      setStrokeStyle, getStrokeKind, syncStrokeStyleUI, DASH_PRESETS,
      applyBrushKind, peerSnap,
      setCurrentSize(s) { Pro.currentSize = s; },
      setCanvas(c2) { Pro.canvas = c2; }
    };
  }

  window.AuroraFigmaProInstall = install;
})();
