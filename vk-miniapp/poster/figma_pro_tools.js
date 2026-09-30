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
     COMPONENTS & INSTANCES HELPER FUNCTIONS
     ──────────────────────────────────────────────────────────── */
  window._figmaComponents = window._figmaComponents || {};

  function getComponentPropsToSave() {
    const base = (Pro.hooks.CUSTOM_PROPS_TO_SAVE && Array.isArray(Pro.hooks.CUSTOM_PROPS_TO_SAVE))
      ? [...Pro.hooks.CUSTOM_PROPS_TO_SAVE]
      : [];
    const extras = [
      'isMasterComponent', 'isComponentInstance', 'componentId', 'masterComponentId',
      'componentName', 'componentOverrides', 'isAutoLayout', 'layoutDirection',
      'itemSpacing', 'paddingX', 'paddingY', 'alignContent', 'resizeW', 'resizeH',
      'colorTokenId', 'fontTokenId', 'colorTokenTarget', 'layerName', 'isAutoLayoutBg'
    ];
    return Array.from(new Set([...base, ...extras]));
  }

  function applyComponentInstanceProps(cloned, source) {
    if (!source || !cloned) return;
    const masterId = source.isMasterComponent ? source.componentId : (source.masterComponentId || source.componentId);
    cloned.set({
      isMasterComponent: false,
      isComponentInstance: true,
      masterComponentId: masterId,
      componentName: source.componentName || source.layerName || 'Component',
      componentOverrides: Object.assign({}, source.componentOverrides || {})
    });
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
      const props = getComponentPropsToSave();
      target.clone(cloned => {
        cloned.set({ left: target.left, top: target.top, evented: true });
        if (target.isMasterComponent || target.isComponentInstance) {
          applyComponentInstanceProps(cloned, target);
        }
        if (cloned.type === 'activeSelection') {
          cloned.canvas = c;
          cloned.forEachObject(o => c.add(o));
        } else {
          c.add(cloned);
        }
        _altClone = cloned;
        c.setActiveObject(cloned);
        c.requestRenderAll();
      }, props);
    });

    // После mouse:up фиксируем историю, если клон создан и сдвинут
    c.on('mouse:up', () => {
      if (_altClone) {
        const moved = _altSource && (_altClone.left !== _altSource.left || _altClone.top !== _altSource.top);
        const wasComponent = _altSource && (_altSource.isMasterComponent || _altSource.isComponentInstance);
        _altClone = null;
        _altSource = null;
        // Небольшая задержка: fabric завершает transform после mouse:up
        setTimeout(() => {
          saveHistory();
          updateLayersList();
          if (moved !== false) {
            toast(wasComponent ? 'Создан экземпляр компонента ◇ (Alt + перетаскивание)' : 'Объект продублирован (Alt + перетаскивание)');
          }
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

      // Ctrl+Shift+L — заблокировать/разблокировать (Figma)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L' || e.key === 'д' || e.key === 'Д')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        toggleLockSelection();
        return;
      }

      // Ctrl+Shift+H — скрыть/показать (Figma)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        toggleHideSelection();
        return;
      }

      // F2 или Ctrl+R — переименование слоя (Figma)
      if (e.key === 'F2' || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && canvas()?.getActiveObject())) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        triggerLayerRename();
        return;
      }

      // Shift+A — создание / переключение Auto-Layout фрейма (Figma)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        toggleAutoLayout();
        return;
      }

      // Ctrl+Alt+K — создать мастер-компонент ❖ (Figma)
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        createMasterComponent();
        return;
      }

      // Ctrl+Alt+B — отсоединить экземпляр компонента Detach ◇ (Figma)
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        detachComponentInstance();
        return;
      }

      // Shift+P — векторное перо (Pen Tool)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
        if (inInput) return;
        e.preventDefault(); e.stopPropagation();
        if (_isPenActive) deactivatePenTool();
        else activatePenTool();
        return;
      }

      // Горячие клавиши в режиме активного пера: Enter / Escape
      if (_isPenActive) {
        if (e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation();
          finishPenPath(false);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          deactivatePenTool();
          return;
        }
      }
    }, true); // capture: перехватываем ДО хендлера editor.js
  }

  function triggerLayerRename(targetObj) {
    const c = canvas();
    if (!c) return;
    const obj = targetObj || c.getActiveObject();
    if (!obj) return;
    const idx = c.getObjects().indexOf(obj);
    if (idx === -1) return;
    const row = document.querySelector(`.layer-row[data-idx="${idx}"]`);
    if (!row) return;
    const nameEl = row.querySelector('.layer-name');
    if (!nameEl) return;

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
        toast('Слой переименован ✏️');
      } else {
        updateLayersList();
      }
    };
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') { ev.stopPropagation(); updateLayersList(); }
      ev.stopPropagation();
    });
    input.addEventListener('blur', commit);
  }

  function toggleLockSelection() {
    const c = canvas();
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    const isLocked = !!active.lockMovementX;
    const nextLock = !isLocked;

    const setObjLock = o => {
      o.set({
        lockMovementX: nextLock, lockMovementY: nextLock,
        lockScalingX: nextLock, lockScalingY: nextLock,
        lockRotation: nextLock, hasControls: !nextLock
      });
    };

    if (active.type === 'activeSelection') {
      active.getObjects().forEach(setObjLock);
    } else {
      setObjLock(active);
    }
    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    if (typeof Pro.hooks.updateLockBtnUI === 'function') Pro.hooks.updateLockBtnUI(nextLock);
    toast(nextLock ? 'Объект заблокирован 🔒 (Ctrl+Shift+L)' : 'Объект разблокирован 🔓 (Ctrl+Shift+L)');
  }

  function toggleHideSelection() {
    const c = canvas();
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    const nextVis = (active.visible === false);

    if (active.type === 'activeSelection') {
      active.getObjects().forEach(o => o.set('visible', nextVis));
      if (!nextVis) c.discardActiveObject();
    } else {
      active.set('visible', nextVis);
      if (!nextVis) c.discardActiveObject();
    }
    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    toast(nextVis ? 'Слой показан 👁️ (Ctrl+Shift+H)' : 'Слой скрыт 🙈 (Ctrl+Shift+H)');
  }

  /* ────────────────────────────────────────────────────────────
     15. ЦИФРОВЫЕ КЛАВИШИ 0-9 ДЛЯ ПРОЗРАЧНОСТИ (Figma Opacity)
     ──────────────────────────────────────────────────────────── */
  let _opacityKeyBuffer = '';
  let _opacityKeyTimer = null;

  function installNumberOpacity() {
    window.addEventListener('keydown', e => {
      const ae = document.activeElement;
      const inInput = ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable);
      if (inInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const c = canvas();
      if (!c) return;
      const active = c.getActiveObject();
      if (!active || active.isEditing) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        _opacityKeyBuffer += e.key;
        clearTimeout(_opacityKeyTimer);

        if (_opacityKeyBuffer.length === 2) {
          const val = parseInt(_opacityKeyBuffer, 10);
          _opacityKeyBuffer = '';
          applyOpacityValue(val);
        } else {
          _opacityKeyTimer = setTimeout(() => {
            if (_opacityKeyBuffer.length === 1) {
              const val = _opacityKeyBuffer === '0' ? 100 : parseInt(_opacityKeyBuffer, 10) * 10;
              _opacityKeyBuffer = '';
              applyOpacityValue(val);
            }
          }, 350);
        }
      }
    });
  }

  function applyOpacityValue(percentVal) {
    const c = canvas();
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    const p = Math.max(0, Math.min(100, Math.round(percentVal)));
    const frac = p / 100;

    if (active.type === 'activeSelection') {
      active.getObjects().forEach(o => o.set('opacity', frac));
    } else {
      active.set('opacity', frac);
    }
    c.requestRenderAll();
    saveHistory();

    if (typeof Pro.hooks.syncOpacityUI === 'function') {
      Pro.hooks.syncOpacityUI(p);
    }
    toast(`Прозрачность: ${p}% (клавиша ${p === 100 ? '0' : (p % 10 === 0 ? p/10 : p)})`);
  }

  /* ────────────────────────────────────────────────────────────
     16. ЭКСПОРТ ВЫДЕЛЕННОГО ОБЪЕКТА (Figma Selection Export)
     ──────────────────────────────────────────────────────────── */
  function exportSelectedObject(fmt = 'png') {
    const c = canvas();
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) {
      toast('Выделите объект или группу для экспорта (Figma Selection)');
      return;
    }
    const prevVpt = c.viewportTransform;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);

    const dataUrl = active.toDataURL({
      format: fmt === 'jpg' ? 'jpeg' : 'png',
      multiplier: 2,
      enableRetinaScaling: true
    });
    c.setViewportTransform(prevVpt);
    c.requestRenderAll();

    const name = (active.layerName || 'aurora-selection').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
    const a = document.createElement('a');
    a.download = `${name}-2x.${fmt}`;
    a.href = dataUrl;
    a.click();
    toast(`Выделенный слой экспортирован (${fmt.toUpperCase()} 2x) 📥`);
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
     17. AUTO-LAYOUT СИСТЕМА (Figma Shift+A)
     ──────────────────────────────────────────────────────────── */
  function toggleAutoLayout(target) {
    const c = canvas();
    if (!c) return;
    const active = target || c.getActiveObject();
    if (!active || active.__isArtboardBg) {
      toast('Выберите объекты для создания Auto-Layout (Shift+A)');
      return;
    }

    if (active.isAutoLayout) {
      toast('Объект уже является Auto-Layout фреймом');
      syncAutoLayoutUI(active);
      return;
    }

    // Если выделено несколько объектов (activeSelection)
    if (active.type === 'activeSelection') {
      const items = active.getObjects();
      const left = active.left;
      const top = active.top;
      const w = active.getScaledWidth();
      const h = active.getScaledHeight();

      const bg = new fabric.Rect({
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        fill: 'rgba(255, 255, 255, 0.03)',
        stroke: 'rgba(255, 255, 255, 0.12)',
        strokeWidth: 1,
        rx: 8,
        ry: 8,
        selectable: false,
        evented: false,
        isAutoLayoutBg: true
      });

      const group = active.toGroup();
      group.insertAt(bg, 0, false);
      group.set({
        isAutoLayout: true,
        layoutDirection: 'row',
        itemSpacing: 12,
        paddingX: 16,
        paddingY: 12,
        alignContent: 'center',
        resizeW: 'hug',
        resizeH: 'hug',
        layerName: `Auto-Layout Frame`
      });

      reflowAutoLayout(group);
      c.setActiveObject(group);
      c.requestRenderAll();
      saveHistory();
      updateLayersList();
      syncAutoLayoutUI(group);
      toast('Создан Auto-Layout фрейм ⬚ (Shift+A)');
      return;
    }

    // Если выделена обычная группа
    if (active.type === 'group' && !active.isAutoLayout) {
      active.set({
        isAutoLayout: true,
        layoutDirection: 'row',
        itemSpacing: 12,
        paddingX: 16,
        paddingY: 12,
        alignContent: 'center',
        resizeW: 'hug',
        resizeH: 'hug',
        layerName: active.layerName || 'Auto-Layout Frame'
      });
      reflowAutoLayout(active);
      c.requestRenderAll();
      saveHistory();
      updateLayersList();
      syncAutoLayoutUI(active);
      toast('Группа преобразована в Auto-Layout ⬚ (Shift+A)');
      return;
    }

    // Одиночный объект: оборачиваем в Auto-Layout фрейм
    const ow = active.getScaledWidth();
    const oh = active.getScaledHeight();
    const padX = 16, padY = 12;
    const fw = ow + padX * 2, fh = oh + padY * 2;

    const bg = new fabric.Rect({
      left: -fw / 2,
      top: -fh / 2,
      width: fw,
      height: fh,
      fill: 'rgba(255, 255, 255, 0.03)',
      stroke: 'rgba(255, 255, 255, 0.12)',
      strokeWidth: 1,
      rx: 8,
      ry: 8,
      selectable: false,
      evented: false,
      isAutoLayoutBg: true
    });

    const activeLeft = active.left, activeTop = active.top;
    c.remove(active);

    const frameGroup = new fabric.Group([bg, active], {
      left: activeLeft - padX,
      top: activeTop - padY,
      isAutoLayout: true,
      layoutDirection: 'row',
      itemSpacing: 12,
      paddingX: padX,
      paddingY: padY,
      alignContent: 'center',
      resizeW: 'hug',
      resizeH: 'hug',
      layerName: `Auto-Layout Frame`
    });

    c.add(frameGroup);
    reflowAutoLayout(frameGroup);
    c.setActiveObject(frameGroup);
    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    syncAutoLayoutUI(frameGroup);
    toast('Создан Auto-Layout фрейм ⬚ (Shift+A)');
  }

  function reflowAutoLayout(frame) {
    if (!frame || !frame.isAutoLayout) return;
    const allObjs = frame.getObjects?.() || [];
    const bgObj = allObjs.find(o => o.isAutoLayoutBg || o.__isFrameBg);
    const childItems = allObjs.filter(o => o !== bgObj && o.visible !== false);

    if (!childItems.length) return;

    const dir = frame.layoutDirection || 'row';
    const gap = (typeof frame.itemSpacing === 'number') ? frame.itemSpacing : 12;
    const padX = (typeof frame.paddingX === 'number') ? frame.paddingX : 16;
    const padY = (typeof frame.paddingY === 'number') ? frame.paddingY : 12;
    const align = frame.alignContent || 'center';

    const totalItemsW = childItems.reduce((sum, it) => sum + (it.getScaledWidth?.() || it.width || 0), 0);
    const totalItemsH = childItems.reduce((sum, it) => sum + (it.getScaledHeight?.() || it.height || 0), 0);
    const maxItemW = Math.max(...childItems.map(it => it.getScaledWidth?.() || it.width || 0), 0);
    const maxItemH = Math.max(...childItems.map(it => it.getScaledHeight?.() || it.height || 0), 0);

    let contentW = 0;
    let contentH = 0;

    if (dir === 'row') {
      contentH = maxItemH;
      contentW = totalItemsW + gap * Math.max(0, childItems.length - 1);
    } else {
      contentW = maxItemW;
      contentH = totalItemsH + gap * Math.max(0, childItems.length - 1);
    }

    const newFrameW = Math.max(contentW + padX * 2, 20);
    const newFrameH = Math.max(contentH + padY * 2, 20);

    const currentTopLeft = frame.getPointByOrigin ? frame.getPointByOrigin('left', 'top') : { x: frame.left, y: frame.top };
    frame.set({ width: newFrameW, height: newFrameH, scaleX: 1, scaleY: 1 });
    if (frame.setPositionByOrigin) {
      frame.setPositionByOrigin(currentTopLeft, 'left', 'top');
    }

    const startX = -newFrameW / 2 + padX;
    const startY = -newFrameH / 2 + padY;

    if (dir === 'row') {
      let curX = startX;
      childItems.forEach(it => {
        const iw = it.getScaledWidth?.() || it.width || 0;
        const ih = it.getScaledHeight?.() || it.height || 0;
        let itY = startY;
        if (align === 'center' || align === 'space-between') {
          itY = startY + (contentH - ih) / 2;
        } else if (align === 'bottom' || align === 'end' || align === 'bottom-center' || align === 'bottom-left' || align === 'bottom-right') {
          itY = startY + (contentH - ih);
        }
        const offX = (it.originX === 'center') ? (iw / 2) : (it.originX === 'right' ? iw : 0);
        const offY = (it.originY === 'center') ? (ih / 2) : (it.originY === 'bottom' ? ih : 0);
        it.set({ left: curX + offX, top: itY + offY });
        it.setCoords?.();
        curX += iw + gap;
      });
    } else {
      let curY = startY;
      childItems.forEach(it => {
        const iw = it.getScaledWidth?.() || it.width || 0;
        const ih = it.getScaledHeight?.() || it.height || 0;
        let itX = startX;
        if (align === 'center' || align === 'space-between') {
          itX = startX + (contentW - iw) / 2;
        } else if (align === 'right' || align === 'end' || align === 'top-right' || align === 'bottom-right' || align === 'center-right') {
          itX = startX + (contentW - iw);
        }
        const offX = (it.originX === 'center') ? (iw / 2) : (it.originX === 'right' ? iw : 0);
        const offY = (it.originY === 'center') ? (ih / 2) : (it.originY === 'bottom' ? ih : 0);
        it.set({ left: itX + offX, top: curY + offY });
        it.setCoords?.();
        curY += ih + gap;
      });
    }

    if (bgObj) {
      bgObj.set({
        left: -newFrameW / 2,
        top: -newFrameH / 2,
        width: newFrameW,
        height: newFrameH,
        originX: 'left',
        originY: 'top'
      });
      bgObj.setCoords?.();
    }

    frame.setCoords();
    canvas()?.requestRenderAll();
  }

  function removeAutoLayout(frame) {
    const c = canvas();
    if (!c) return;
    const target = frame || c.getActiveObject();
    if (!target || !target.isAutoLayout) return;

    target.set('isAutoLayout', false);
    const bg = target.getObjects?.()?.find(o => o.isAutoLayoutBg);
    if (bg) target.remove(bg);

    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    syncAutoLayoutUI(target);
    toast('Auto-Layout отключен');
  }

  function syncAutoLayoutUI(target) {
    const c = canvas();
    const active = target || c?.getActiveObject();
    const section = document.getElementById('props-autolayout');
    if (!section) return;

    if (!active || !active.isAutoLayout || active.__isArtboardBg) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    const dir = active.layoutDirection || 'row';
    const isHoriz = (dir === 'row' || dir === 'horizontal');
    document.getElementById('btn-al-dir-horizontal')?.classList.toggle('is-active', isHoriz);
    document.getElementById('btn-al-dir-vertical')?.classList.toggle('is-active', !isHoriz);

    const gapInput = document.getElementById('al-gap-input');
    if (gapInput) gapInput.value = (active.itemSpacing !== undefined) ? active.itemSpacing : 12;

    const padUnified = document.getElementById('al-padding-unified');
    if (padUnified) padUnified.value = active.paddingX || 16;

    const padX = document.getElementById('al-padding-x');
    if (padX) padX.value = active.paddingX || 16;

    const padY = document.getElementById('al-padding-y');
    if (padY) padY.value = active.paddingY || 12;

    const resizeW = document.getElementById('al-resize-w');
    if (resizeW) resizeW.value = active.resizeW || 'hug';

    const resizeH = document.getElementById('al-resize-h');
    if (resizeH) resizeH.value = active.resizeH || 'hug';

    const align = active.alignContent || 'center';
    document.querySelectorAll('.figma-al-matrix-point').forEach(pt => {
      pt.classList.toggle('is-active', pt.dataset.align === align);
    });
  }

  function installAutoLayoutControls() {
    document.getElementById('btn-al-dir-horizontal')?.addEventListener('click', () => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      active.set('layoutDirection', 'row');
      reflowAutoLayout(active);
      saveHistory();
      syncAutoLayoutUI(active);
    });

    document.getElementById('btn-al-dir-vertical')?.addEventListener('click', () => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      active.set('layoutDirection', 'column');
      reflowAutoLayout(active);
      saveHistory();
      syncAutoLayoutUI(active);
    });

    document.getElementById('al-gap-input')?.addEventListener('input', e => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      active.set('itemSpacing', parseInt(e.target.value, 10) || 0);
      reflowAutoLayout(active);
      saveHistory();
    });

    document.getElementById('al-padding-unified')?.addEventListener('input', e => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      const v = parseInt(e.target.value, 10) || 0;
      active.set({ paddingX: v, paddingY: v });
      reflowAutoLayout(active);
      saveHistory();
    });

    document.getElementById('al-padding-x')?.addEventListener('input', e => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      active.set('paddingX', parseInt(e.target.value, 10) || 0);
      reflowAutoLayout(active);
      saveHistory();
    });

    document.getElementById('al-padding-y')?.addEventListener('input', e => {
      const active = canvas()?.getActiveObject();
      if (!active || !active.isAutoLayout) return;
      active.set('paddingY', parseInt(e.target.value, 10) || 0);
      reflowAutoLayout(active);
      saveHistory();
    });

    document.querySelectorAll('.figma-al-matrix-point').forEach(pt => {
      pt.addEventListener('click', () => {
        const active = canvas()?.getActiveObject();
        if (!active || !active.isAutoLayout) return;
        active.set('alignContent', pt.dataset.align);
        reflowAutoLayout(active);
        saveHistory();
        syncAutoLayoutUI(active);
      });
    });

    document.getElementById('btn-al-remove')?.addEventListener('click', () => removeAutoLayout());

    document.getElementById('btn-create-component')?.addEventListener('click', () => createMasterComponent());
    document.getElementById('btn-comp-detach')?.addEventListener('click', () => detachComponentInstance());
    document.getElementById('btn-comp-jump-main')?.addEventListener('click', () => jumpToMasterComponent());
    document.getElementById('btn-comp-reset-overrides')?.addEventListener('click', () => resetComponentOverrides());
    document.getElementById('master-comp-name')?.addEventListener('change', e => {
      const active = canvas()?.getActiveObject();
      if (active && active.isMasterComponent) {
        active.set({ componentName: e.target.value.trim(), layerName: e.target.value.trim() });
        saveHistory();
        updateLayersList();
      }
    });
  }

  /* ────────────────────────────────────────────────────────────
     18. КОМПОНЕНТЫ И ЭКЗЕМПЛЯРЫ (Figma Ctrl+Alt+K / Ctrl+Alt+B)
     ──────────────────────────────────────────────────────────── */
  function createMasterComponent(target) {
    const c = canvas();
    if (!c) return;
    const active = target || c.getActiveObject();
    if (!active || active.__isArtboardBg) {
      toast('Выберите объект или группу для создания компонента');
      return;
    }

    let masterObj = active;
    if (active.type === 'activeSelection') {
      masterObj = active.toGroup();
      c.setActiveObject(masterObj);
    }

    const compId = 'comp_' + Math.random().toString(36).substr(2, 9);
    const compName = masterObj.layerName || `Component ${Object.keys(window._figmaComponents).length + 1}`;

    masterObj.set({
      isMasterComponent: true,
      isComponentInstance: false,
      componentId: compId,
      componentName: compName,
      layerName: compName
    });

    window._figmaComponents[compId] = {
      name: compName,
      id: compId,
      created: Date.now()
    };

    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    syncComponentUI();
    toast(`Создан мастер-компонент ❖ ${compName} (Ctrl+Alt+K)`);
  }

  function createComponentInstance(target) {
    const c = canvas();
    if (!c) return;
    const source = target || c.getActiveObject();
    if (!source || (!source.isMasterComponent && !source.isComponentInstance)) {
      toast('Выберите мастер-компонент или экземпляр для создания инстанса');
      return;
    }

    const props = getComponentPropsToSave();
    source.clone(cloned => {
      cloned.set({
        left: (source.left || 0) + 24,
        top: (source.top || 0) + 24,
        evented: true,
        selectable: true
      });
      applyComponentInstanceProps(cloned, source);
      c.add(cloned);
      c.setActiveObject(cloned);
      c.requestRenderAll();
      saveHistory();
      updateLayersList();
      syncComponentUI();
      toast('Создан экземпляр компонента ◇ (Alt+Drag / Ctrl+D)');
    }, props);
  }

  function detachComponentInstance(target) {
    const c = canvas();
    if (!c) return;
    const obj = target || c.getActiveObject();
    if (!obj || !obj.isComponentInstance) {
      toast('Выделенный объект не является экземпляром компонента');
      return;
    }

    obj.set({
      isComponentInstance: false,
      isMasterComponent: false,
      masterComponentId: null,
      componentOverrides: null
    });

    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    syncComponentUI();
    toast('Экземпляр отсоединён от компонента ◇ (Ctrl+Alt+B)');
  }

  function syncComponentInstances(masterObj) {
    const c = canvas();
    if (!c || !masterObj || !masterObj.isMasterComponent || !masterObj.componentId) return;

    const instances = c.getObjects().filter(o => o.isComponentInstance && o.masterComponentId === masterObj.componentId);
    if (!instances.length) return;

    instances.forEach(inst => {
      if (inst.type === masterObj.type) {
        if (!inst.componentOverrides?.fill && masterObj.fill !== undefined) inst.set('fill', masterObj.fill);
        if (!inst.componentOverrides?.stroke && masterObj.stroke !== undefined) inst.set('stroke', masterObj.stroke);
        if (masterObj.strokeWidth !== undefined) inst.set('strokeWidth', masterObj.strokeWidth);
        if (masterObj.rx !== undefined) inst.set('rx', masterObj.rx);
        if (masterObj.ry !== undefined) inst.set('ry', masterObj.ry);
        if (masterObj.opacity !== undefined && !inst.componentOverrides?.opacity) inst.set('opacity', masterObj.opacity);
        inst.setCoords();
      }
    });

    c.requestRenderAll();
  }

  function jumpToMasterComponent(instanceObj) {
    const c = canvas();
    if (!c) return;
    const inst = instanceObj || c.getActiveObject();
    if (!inst || !inst.masterComponentId) return;

    const master = c.getObjects().find(o => o.isMasterComponent && o.componentId === inst.masterComponentId);
    if (master) {
      c.setActiveObject(master);
      c.requestRenderAll();
      onSelection();
      toast('Переход к мастер-компоненту ❖');
    } else {
      toast('Мастер-компонент не найден на текущем холсте');
    }
  }

  function resetComponentOverrides(instanceObj) {
    const c = canvas();
    if (!c) return;
    const inst = instanceObj || c.getActiveObject();
    if (!inst || !inst.isComponentInstance || !inst.masterComponentId) return;

    const master = c.getObjects().find(o => o.isMasterComponent && o.componentId === inst.masterComponentId);
    if (!master) {
      toast('Мастер-компонент не найден для сброса');
      return;
    }

    inst.componentOverrides = {};
    if (master.fill) inst.set('fill', master.fill);
    if (master.stroke) inst.set('stroke', master.stroke);
    if (master.text && inst.text) inst.set('text', master.text);
    c.requestRenderAll();
    saveHistory();
    toast('Оверрайды экземпляра сброшены к мастеру ❖');
  }

  function syncComponentUI() {
    const c = canvas();
    const active = c?.getActiveObject();
    const compSection = document.getElementById('props-component');
    const createState = document.getElementById('comp-create-state');
    const masterState = document.getElementById('comp-master-state');
    const instanceState = document.getElementById('comp-instance-state');

    if (!compSection) return;

    if (!active || active.__isArtboardBg) {
      compSection.classList.add('hidden');
      return;
    }

    compSection.classList.remove('hidden');

    if (active.isMasterComponent) {
      createState?.classList.add('hidden');
      instanceState?.classList.add('hidden');
      masterState?.classList.remove('hidden');
      const nameInput = document.getElementById('master-comp-name');
      if (nameInput) nameInput.value = active.componentName || active.layerName || 'Component';
    } else if (active.isComponentInstance) {
      createState?.classList.add('hidden');
      masterState?.classList.add('hidden');
      instanceState?.classList.remove('hidden');
      const instName = document.getElementById('instance-comp-name');
      if (instName) instName.textContent = active.componentName || active.layerName || 'Component';
    } else {
      masterState?.classList.add('hidden');
      instanceState?.classList.add('hidden');
      createState?.classList.remove('hidden');
    }
  }

  /* ────────────────────────────────────────────────────────────
     19. ДИЗАЙН-ТОКЕНЫ И ГЛОБАЛЬНЫЕ СТИЛИ (Figma Local Variables)
     ──────────────────────────────────────────────────────────── */
  const TOKENS_STORAGE_KEY = 'aurora_figma_design_tokens';

  const DEFAULT_DESIGN_TOKENS = {
    colors: [
      { id: 'token-primary', name: 'Brand / Primary Blue', value: '#0d99ff' },
      { id: 'token-purple', name: 'Accent / Electric Purple', value: '#9747ff' },
      { id: 'token-surface', name: 'Surface / Card Dark', value: '#2c2c2c' },
      { id: 'token-emerald', name: 'Status / Emerald Green', value: '#10b981' }
    ],
    textStyles: [
      {
        id: 'token-h1',
        name: 'Display / Big Title',
        value: { fontFamily: 'Unbounded', fontSize: 32, fontWeight: '700', lineHeight: 1.2 }
      },
      {
        id: 'token-subtitle',
        name: 'Subtitle / SemiBold',
        value: { fontFamily: 'Montserrat', fontSize: 20, fontWeight: '600', lineHeight: 1.3 }
      },
      {
        id: 'token-body',
        name: 'Body / Regular',
        value: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: '400', lineHeight: 1.5 }
      }
    ]
  };

  function initDesignTokens() {
    if (window._figmaDesignTokens && Array.isArray(window._figmaDesignTokens.colors) && Array.isArray(window._figmaDesignTokens.textStyles)) {
      return window._figmaDesignTokens;
    }
    try {
      const stored = localStorage.getItem(TOKENS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.colors) && Array.isArray(parsed.textStyles)) {
          window._figmaDesignTokens = parsed;
          return window._figmaDesignTokens;
        }
      }
    } catch (_) {}
    window._figmaDesignTokens = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS));
    return window._figmaDesignTokens;
  }

  function persistDesignTokens() {
    try {
      if (window._figmaDesignTokens) {
        localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(window._figmaDesignTokens));
      }
    } catch (_) {}
  }

  function getAllDesignTokens() {
    if (!window._figmaDesignTokens) initDesignTokens();
    return window._figmaDesignTokens;
  }

  function getDesignToken(tokenId) {
    if (!tokenId) return null;
    const tokens = getAllDesignTokens();
    const color = (tokens.colors || []).find(t => t.id === tokenId);
    if (color) return Object.assign({}, color, { type: 'colors' });
    const textStyle = (tokens.textStyles || []).find(t => t.id === tokenId);
    if (textStyle) return Object.assign({}, textStyle, { type: 'textStyles' });
    return null;
  }

  function addDesignToken(type, name, value) {
    const tokens = getAllDesignTokens();
    const isColor = (type === 'color' || type === 'colors' || (typeof value === 'string' && (/^#|rgb|hsl/i.test(value))));
    const normType = isColor ? 'colors' : 'textStyles';
    const prefix = isColor ? 'token-color-' : 'token-text-';
    const clean = String(name || '').toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || 'token';
    const id = `${prefix}${clean}-${Math.random().toString(36).substr(2, 4)}`;

    let token = null;
    if (normType === 'colors') {
      token = { id, name: (name || 'New Color').trim(), value: typeof value === 'string' ? value : '#0d99ff' };
      tokens.colors.push(token);
    } else {
      token = {
        id,
        name: (name || 'New Text Style').trim(),
        value: (typeof value === 'object' && value !== null) ? value : { fontFamily: 'Montserrat', fontSize: 16, fontWeight: '400', lineHeight: 1.4 }
      };
      tokens.textStyles.push(token);
    }

    persistDesignTokens();
    renderDesignTokensUI();
    toast(`Создан дизайн-токен: ${token.name}`);
    return token;
  }

  function updateDesignToken(tokenId, newValue, newName) {
    const tokens = getAllDesignTokens();
    let token = (tokens.colors || []).find(t => t.id === tokenId);
    if (token) {
      if (newValue !== undefined) token.value = String(newValue);
      if (newName) token.name = String(newName);
    } else {
      token = (tokens.textStyles || []).find(t => t.id === tokenId);
      if (token) {
        if (typeof newValue === 'object' && newValue !== null) {
          token.value = Object.assign({}, token.value, newValue);
        }
        if (newName) token.name = String(newName);
      }
    }
    if (!token) return false;
    persistDesignTokens();

    const c = canvas();
    if (c) {
      c.getObjects().forEach(obj => {
        if (obj.colorTokenId === tokenId) {
          const prop = obj.colorTokenTarget || (obj.type === 'line' ? 'stroke' : 'fill');
          obj.set(prop, token.value);
          obj.dirty = true;
        }
        if (obj.fontTokenId === tokenId && ['textbox', 'text', 'i-text'].includes(obj.type)) {
          const tVal = token.value || {};
          const patch = {};
          if (tVal.fontFamily) patch.fontFamily = tVal.fontFamily;
          if (tVal.fontSize) patch.fontSize = Number(tVal.fontSize);
          if (tVal.fontWeight) patch.fontWeight = tVal.fontWeight;
          if (tVal.lineHeight) patch.lineHeight = Number(tVal.lineHeight);
          obj.set(patch);
          obj.dirty = true;
        }
      });
      c.requestRenderAll();
      saveHistory();
    }

    renderDesignTokensUI();
    return true;
  }

  function applyDesignToken(targetObj, tokenId, targetProp = 'fill') {
    const c = canvas();
    const obj = targetObj || c?.getActiveObject();
    if (!obj) {
      toast('Выберите объект для применения токена стиля');
      return false;
    }
    const token = getDesignToken(tokenId);
    if (!token) return false;

    if (token.type === 'colors') {
      obj.set('colorTokenId', token.id);
      obj.set('colorTokenTarget', targetProp);
      obj.set(targetProp, token.value);
      obj.dirty = true;
      toast(`Применён токен цвета: ${token.name}`);
    } else if (token.type === 'textStyles') {
      if (!['textbox', 'text', 'i-text'].includes(obj.type)) return false;
      obj.set('fontTokenId', token.id);
      const tVal = token.value || {};
      const patch = {};
      if (tVal.fontFamily) patch.fontFamily = tVal.fontFamily;
      if (tVal.fontSize) patch.fontSize = Number(tVal.fontSize);
      if (tVal.fontWeight) patch.fontWeight = tVal.fontWeight;
      if (tVal.lineHeight) patch.lineHeight = Number(tVal.lineHeight);
      obj.set(patch);
      obj.dirty = true;
      toast(`Применён токен шрифта: ${token.name}`);
    }

    c?.requestRenderAll();
    saveHistory();
    return true;
  }

  function renderDesignTokensUI() {
    const colorList = document.getElementById('tokens-color-list');
    const textList = document.getElementById('tokens-text-list');
    if (!colorList && !textList) return;

    const tokens = getAllDesignTokens();

    if (colorList) {
      const colorCount = document.getElementById('color-tokens-count');
      if (colorCount) colorCount.textContent = tokens.colors.length;
      colorList.innerHTML = tokens.colors.map(col => `
        <div class="figma-token-item" data-token-id="${col.id}">
          <div class="figma-token-left">
            <div class="figma-token-color-swatch" style="background-color: ${col.value};"></div>
            <span class="figma-token-name" title="${col.name}">${col.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="figma-token-value">${col.value.toUpperCase()}</span>
            <div class="figma-token-actions">
              <button class="figma-icon-btn btn-token-edit" data-token-id="${col.id}" style="width: 18px; height: 18px;" title="Редактировать токен">
                <span class="material-symbols-rounded" style="font-size: 13px;">edit</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (textList) {
      const textCount = document.getElementById('text-tokens-count');
      if (textCount) textCount.textContent = tokens.textStyles.length;
      textList.innerHTML = tokens.textStyles.map(txt => `
        <div class="figma-token-item" data-token-id="${txt.id}">
          <div class="figma-token-left">
            <div class="figma-token-typo-badge">Ag</div>
            <span class="figma-token-name" title="${txt.name}">${txt.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="figma-token-value">${txt.value.fontFamily} · ${txt.value.fontSize}px</span>
            <div class="figma-token-actions">
              <button class="figma-icon-btn btn-token-edit" data-token-id="${txt.id}" style="width: 18px; height: 18px;" title="Редактировать токен">
                <span class="material-symbols-rounded" style="font-size: 13px;">edit</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    document.querySelectorAll('.figma-token-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.btn-token-edit')) {
          e.stopPropagation();
          const tokenId = item.dataset.tokenId;
          const token = getDesignToken(tokenId);
          if (!token) return;
          if (token.type === 'colors') {
            const nextVal = prompt(`Новое значение цвета для ${token.name} (HEX / rgb):`, token.value);
            if (nextVal) updateDesignToken(tokenId, nextVal);
          } else {
            const nextSize = prompt(`Размер шрифта для ${token.name} (px):`, token.value.fontSize);
            if (nextSize) updateDesignToken(tokenId, { fontSize: parseInt(nextSize, 10) || 16 });
          }
          return;
        }
        const tokenId = item.dataset.tokenId;
        applyDesignToken(null, tokenId);
      });
    });
  }

  function exportTokensToCSS() {
    const tokens = getAllDesignTokens();
    let css = ':root {\n';
    tokens.colors.forEach(c => {
      const varName = '--' + c.id.replace(/^token-/, '');
      css += `  ${varName}: ${c.value}; /* ${c.name} */\n`;
    });
    tokens.textStyles.forEach(t => {
      const varName = '--' + t.id.replace(/^token-/, '');
      css += `  ${varName}-font: ${t.value.fontWeight} ${t.value.fontSize}px/${t.value.lineHeight} "${t.value.fontFamily}"; /* ${t.name} */\n`;
    });
    css += '}\n';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(css);
      toast('CSS-переменные (:root) скопированы в буфер обмена 📋');
    } else {
      prompt('CSS-переменные дизайн-токенов:', css);
    }
  }

  function exportTokensToJSON() {
    const tokens = getAllDesignTokens();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tokens, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'aurora-design-tokens.json');
    a.click();
    toast('Дизайн-токены экспортированы в JSON 📥');
  }

  function installTokensControls() {
    document.getElementById('btn-add-global-token')?.addEventListener('click', () => {
      const name = prompt('Название нового токена цвета:');
      if (!name) return;
      const val = prompt('HEX-значение цвета (#RRGGBB):', '#0d99ff');
      if (!val) return;
      addDesignToken('color', name, val);
    });

    document.getElementById('btn-export-tokens-css')?.addEventListener('click', exportTokensToCSS);
    document.getElementById('btn-export-tokens-json')?.addEventListener('click', exportTokensToJSON);
  }

  /* ────────────────────────────────────────────────────────────
     20. ВЕКТОРНОЕ ПЕРО И КРИВЫЕ БЕЗЬЕ (Figma Shift+P / P)
     ──────────────────────────────────────────────────────────── */
  let _isPenActive = false;
  let _penPoints = [];
  let _penDragIndex = -1;
  let _isDraggingPenHandle = false;
  let _penCursorPos = null; // позиция курсора для ghost-линии предпросмотра

  function activatePenTool() {
    const c = canvas();
    if (!c) return;
    _isPenActive = true;
    _penPoints = [];
    _penDragIndex = -1;
    _isDraggingPenHandle = false;
    _penCursorPos = null;

    // Деактивируем карандаш (свободное рисование) если он был активен
    if (c.isDrawingMode) {
      c.isDrawingMode = false;
      document.getElementById('tool-pencil')?.classList.remove('is-active', 'active');
      document.getElementById('pencil-toolbar')?.classList.add('hidden');
    }

    c.defaultCursor = 'crosshair';
    c.hoverCursor = 'crosshair';
    c.selection = false;
    c.discardActiveObject();
    c.getObjects().forEach(o => { o.__selectableOrig = o.selectable; o.selectable = false; });

    const bar = document.getElementById('figma-vector-bar');
    if (bar) bar.classList.remove('hidden');

    // Снимаем активность со ВСЕХ инструментов и ставим перо активным
    document.querySelectorAll('.tool-btn, [id^="tool-"], [id^="mtool-"]').forEach(b => b.classList.remove('is-active', 'active'));
    document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => el.classList.remove('is-active', 'active'));
    document.getElementById('tool-pen')?.classList.add('is-active', 'active');

    c.requestRenderAll();
    toast('Векторное Перо активно ✒️ Клик — точка, драг — кривая Безье, Enter — завершить');
  }

  function deactivatePenTool() {
    const c = canvas();
    if (!c) return;
    _isPenActive = false;
    _penPoints = [];
    _penDragIndex = -1;
    _isDraggingPenHandle = false;
    _penCursorPos = null;

    c.defaultCursor = 'default';
    c.hoverCursor = 'move';
    c.selection = true;
    c.getObjects().forEach(o => {
      if (o.__selectableOrig !== undefined) {
        o.selectable = o.__selectableOrig;
        delete o.__selectableOrig;
      } else {
        o.selectable = true;
      }
    });

    const bar = document.getElementById('figma-vector-bar');
    if (bar) bar.classList.add('hidden');
    document.getElementById('tool-pen')?.classList.remove('is-active', 'active');

    // Восстанавливаем инструмент «Выделение» через хук editor.js
    activateSelectTool(false);

    c.requestRenderAll();
  }

  function finishPenPath(isClosed = false) {
    const c = canvas();
    if (!c || _penPoints.length < 2) {
      deactivatePenTool();
      return;
    }

    let pathStr = `M ${_penPoints[0].x.toFixed(2)} ${_penPoints[0].y.toFixed(2)}`;
    for (let i = 1; i < _penPoints.length; i++) {
      const prev = _penPoints[i - 1];
      const curr = _penPoints[i];
      if (prev.cpOut || curr.cpIn) {
        const cp1 = prev.cpOut || { x: prev.x, y: prev.y };
        const cp2 = curr.cpIn || { x: curr.x, y: curr.y };
        pathStr += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      } else {
        pathStr += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      }
    }

    if (isClosed) {
      const first = _penPoints[0];
      const last = _penPoints[_penPoints.length - 1];
      if (last.cpOut || first.cpIn) {
        const cp1 = last.cpOut || { x: last.x, y: last.y };
        const cp2 = first.cpIn || { x: first.x, y: first.y };
        pathStr += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${first.x.toFixed(2)} ${first.y.toFixed(2)} Z`;
      } else {
        pathStr += ' Z';
      }
    }

    const strokeCol = document.getElementById('vector-stroke-color')?.value || '#0d99ff';
    const strokeW = parseInt(document.getElementById('vector-stroke-w')?.value, 10) || 3;

    const pathObj = new fabric.Path(pathStr, {
      fill: isClosed ? 'rgba(13, 153, 255, 0.15)' : 'transparent',
      stroke: strokeCol,
      strokeWidth: strokeW,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: true,
      layerName: `Векторный контур ${c.getObjects().length + 1}`
    });

    deactivatePenTool();
    c.add(pathObj);
    c.setActiveObject(pathObj);
    c.requestRenderAll();
    saveHistory();
    updateLayersList();
    toast('Векторный контур успешно создан ✒️');
  }

  function installPenToolListeners() {
    const c = canvas();
    if (!c) return;

    c.on('mouse:down', opt => {
      if (!_isPenActive) return;
      const p = c.getPointer(opt.e);

      if (_penPoints.length >= 2) {
        const first = _penPoints[0];
        const dist = Math.hypot(p.x - first.x, p.y - first.y);
        if (dist < 14) {
          finishPenPath(true);
          return;
        }
      }

      const newPt = { x: p.x, y: p.y, cpIn: null, cpOut: null };
      _penPoints.push(newPt);
      _penDragIndex = _penPoints.length - 1;
      _isDraggingPenHandle = true;
      c.requestRenderAll();
    });

    c.on('mouse:move', opt => {
      if (!_isPenActive) return;
      const p = c.getPointer(opt.e);
      // Всегда обновляем позицию курсора для ghost-линии предпросмотра
      _penCursorPos = { x: p.x, y: p.y };
      // Если тянем ручку безье — обновляем контрольные точки
      if (_isDraggingPenHandle && _penDragIndex >= 0) {
        const anchor = _penPoints[_penDragIndex];
        if (anchor) {
          anchor.cpOut = { x: p.x, y: p.y };
          anchor.cpIn = {
            x: anchor.x - (p.x - anchor.x),
            y: anchor.y - (p.y - anchor.y)
          };
        }
      }
      c.requestRenderAll();
    });

    c.on('mouse:up', () => {
      if (!_isPenActive) return;
      _isDraggingPenHandle = false;
      c.requestRenderAll();
    });

    c.on('after:render', opt => {
      if (!_isPenActive || !_penPoints.length) return;
      const ctx = opt.ctx;
      if (!ctx) return;

      const pad = (typeof Pro.hooks.CANVAS_PADDING === 'number') ? Pro.hooks.CANVAS_PADDING : 40;
      const z = (typeof Pro.hooks.getZoom === 'function') ? Pro.hooks.getZoom() : (c.getZoom() || 1);
      const toScreenX = x => (pad + x) * z;
      const toScreenY = y => (pad + y) * z;

      ctx.save();

      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.moveTo(toScreenX(_penPoints[0].x), toScreenY(_penPoints[0].y));
      for (let i = 1; i < _penPoints.length; i++) {
        const prev = _penPoints[i - 1];
        const curr = _penPoints[i];
        if (prev.cpOut || curr.cpIn) {
          const cp1 = prev.cpOut || { x: prev.x, y: prev.y };
          const cp2 = curr.cpIn || { x: curr.x, y: curr.y };
          ctx.bezierCurveTo(
            toScreenX(cp1.x), toScreenY(cp1.y),
            toScreenX(cp2.x), toScreenY(cp2.y),
            toScreenX(curr.x), toScreenY(curr.y)
          );
        } else {
          ctx.lineTo(toScreenX(curr.x), toScreenY(curr.y));
        }
      }
      ctx.stroke();

      // Ghost-линия от последней точки до курсора (как в Figma)
      if (_penCursorPos && _penPoints.length > 0) {
        const last = _penPoints[_penPoints.length - 1];
        ctx.strokeStyle = 'rgba(13, 153, 255, 0.5)';
        ctx.lineWidth = 1.5 * z;
        ctx.setLineDash([4 * z, 4 * z]);
        ctx.beginPath();
        ctx.moveTo(toScreenX(last.x), toScreenY(last.y));
        ctx.lineTo(toScreenX(_penCursorPos.x), toScreenY(_penCursorPos.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      _penPoints.forEach(pt => {
        if (pt.cpOut) {
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(toScreenX(pt.x), toScreenY(pt.y));
          ctx.lineTo(toScreenX(pt.cpOut.x), toScreenY(pt.cpOut.y));
          ctx.stroke();

          ctx.fillStyle = '#0d99ff';
          ctx.beginPath();
          ctx.arc(toScreenX(pt.cpOut.x), toScreenY(pt.cpOut.y), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (pt.cpIn) {
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(toScreenX(pt.x), toScreenY(pt.y));
          ctx.lineTo(toScreenX(pt.cpIn.x), toScreenY(pt.cpIn.y));
          ctx.stroke();

          ctx.fillStyle = '#0d99ff';
          ctx.beginPath();
          ctx.arc(toScreenX(pt.cpIn.x), toScreenY(pt.cpIn.y), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 1.5;
        const sx = toScreenX(pt.x), sy = toScreenY(pt.y);
        ctx.fillRect(sx - 3.5, sy - 3.5, 7, 7);
        ctx.strokeRect(sx - 3.5, sy - 3.5, 7, 7);
      });

      ctx.restore();
    });

    document.getElementById('btn-vector-done')?.addEventListener('click', () => finishPenPath(false));
    document.getElementById('btn-vector-close-path')?.addEventListener('click', () => finishPenPath(true));
  }

  /* ────────────────────────────────────────────────────────────
     21. ХУКИ ИЗМЕНЕНИЯ ОБЪЕКТОВ И СИНХРОНИЗАЦИИ
     ──────────────────────────────────────────────────────────── */
  function installCanvasChangeListeners() {
    const c = canvas();
    if (!c) return;

    c.on('text:changed', opt => {
      const target = opt.target;
      if (!target) return;
      if (target.group && target.group.isAutoLayout) {
        reflowAutoLayout(target.group);
      }
      if (target.isMasterComponent || (target.group && target.group.isMasterComponent)) {
        syncComponentInstances(target.isMasterComponent ? target : target.group);
      }
    });

    c.on('object:modified', opt => {
      const target = opt.target;
      if (!target) return;
      if (target.isAutoLayout) {
        reflowAutoLayout(target);
      } else if (target.group && target.group.isAutoLayout) {
        reflowAutoLayout(target.group);
      }
      if (target.isMasterComponent) {
        syncComponentInstances(target);
      }
    });

    c.on('selection:created', () => {
      syncAutoLayoutUI();
      syncComponentUI();
    });
    c.on('selection:updated', () => {
      syncAutoLayoutUI();
      syncComponentUI();
    });
    c.on('selection:cleared', () => {
      syncAutoLayoutUI();
      syncComponentUI();
      renderDesignTokensUI();
    });
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
    // Сохраняем CANVAS_PADDING из ctx (в editor.js это 320, а не 40)
    if (typeof ctx.CANVAS_PADDING === 'number') {
      Pro.hooks.CANVAS_PADDING = ctx.CANVAS_PADDING;
    }

    installAltDragDuplicate();
    installLayerRename();
    installHotkeys();
    installAltMeasurement();
    installNumberOpacity();

    initDesignTokens();
    installAutoLayoutControls();
    installTokensControls();
    installPenToolListeners();
    installCanvasChangeListeners();

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
      triggerLayerRename, toggleLockSelection, toggleHideSelection,
      exportSelectedObject, applyOpacityValue,
      // Auto-Layout
      toggleAutoLayout, reflowAutoLayout, removeAutoLayout, syncAutoLayoutUI,
      // Components
      createMasterComponent, createComponentInstance, detachComponentInstance,
      syncComponentInstances, jumpToMasterComponent, resetComponentOverrides, syncComponentUI,
      // Design Tokens
      initDesignTokens, getAllDesignTokens, getDesignToken, addDesignToken,
      updateDesignToken, applyDesignToken, renderDesignTokensUI,
      exportTokensToCSS, exportTokensToJSON,
      // Pen Tool
      activatePenTool, deactivatePenTool, finishPenPath,
      setCurrentSize(s) { Pro.currentSize = s; },
      setCanvas(c2) { Pro.canvas = c2; }
    };
  }

  window.AuroraFigmaProInstall = install;
})();
