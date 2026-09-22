/* =============================================================
   АВРОРА — Редактор Афиш (editor.js v1.0.0)
   Fabric.js 5.x + jsPDF | Для библиотекарей 50+
   ============================================================= */
'use strict';

/* ── Константы ─────────────────────────────────────────────── */
const CANVAS_SIZES = {
  a4_v:     { w: 595, h: 842,  label: 'A4 вертикаль' },
  a4_h:     { w: 842, h: 595,  label: 'A4 горизонталь' },
  square:   { w: 700, h: 700,  label: 'Квадрат (ВК)' },
  banner:   { w: 960, h: 540,  label: 'Баннер 16:9' },
};

const GRADIENTS = {
  'dark-aurora': ['#060918', '#131726', '#1c1e4e', '#0c0e27'],
  'sunrise':     ['#f97316', '#ec4899', '#8b5cf6'],
  'ocean':       ['#0c4a6e', '#0369a1', '#38bdf8'],
  'forest':      ['#14532d', '#15803d', '#4ade80'],
};

/* ── Шаблоны ───────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'blank_a4',
    name: 'Чистый лист A4',
    desc: 'Начать с нуля',
    badge: 'A4',
    emoji: '📄',
    bg: '#ffffff',
    size: 'a4_v',
    objects: [],
    previewBg: 'linear-gradient(160deg,#1e293b,#0f172a)',
  },
  {
    id: 'blank_square',
    name: 'Квадрат (ВК)',
    desc: 'Пост для соцсети',
    badge: '1:1',
    emoji: '🟦',
    bg: '#131726',
    size: 'square',
    objects: [],
    previewBg: 'linear-gradient(160deg,#0c4a6e,#4a1942)',
  },
  {
    id: 'announce_a4',
    name: 'Объявление A4',
    desc: 'Распечатать на двери',
    badge: 'A4',
    emoji: '📢',
    bg: '#0f172a',
    size: 'a4_v',
    previewBg: 'linear-gradient(160deg,#1e3a5f,#0f172a)',
    objects: [
      { type: 'rect', left: 297, top: 80, width: 500, height: 6, fill: '#38BDF8', originX: 'center' },
      { type: 'text', text: 'УВАЖАЕМЫЕ ЧИТАТЕЛИ!', left: 297, top: 130, fontSize: 28, fontFamily: 'Unbounded', fill: '#ffffff', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Текст объявления.\nВпишите нужную информацию здесь.\n\nДата и время', left: 297, top: 220, fontSize: 20, fontFamily: 'Montserrat', fill: '#cbd5e1', textAlign: 'center', originX: 'center', lineHeight: 1.6 },
      { type: 'text', text: 'Библиотека АВРОРА', left: 297, top: 740, fontSize: 14, fontFamily: 'Montserrat', fill: '#38BDF8', textAlign: 'center', originX: 'center' },
      { type: 'rect', left: 297, top: 760, width: 500, height: 4, fill: '#38BDF8', originX: 'center' },
    ],
  },
  {
    id: 'event_square',
    name: 'Афиша мероприятия',
    desc: 'Событие / праздник',
    badge: 'ВК',
    emoji: '🎭',
    bg: '#0c0f1a',
    size: 'square',
    previewBg: 'linear-gradient(135deg,#4a1942,#1e3a5f)',
    objects: [
      { type: 'rect', left: 350, top: 0, width: 700, height: 700, fill: '#0c0f1a', originX: 'center' },
      { type: 'text', text: '★  ПРИГЛАШАЕМ  ★', left: 350, top: 80, fontSize: 18, fontFamily: 'Unbounded', fill: '#FBBF24', textAlign: 'center', originX: 'center', fontWeight: 'bold' },
      { type: 'text', text: 'НАЗВАНИЕ\nМЕРОПРИЯТИЯ', left: 350, top: 160, fontSize: 44, fontFamily: 'Unbounded', fill: '#ffffff', fontWeight: 'bold', textAlign: 'center', originX: 'center', lineHeight: 1.2 },
      { type: 'text', text: '📅  Дата и время\n📍  Место проведения', left: 350, top: 370, fontSize: 20, fontFamily: 'Montserrat', fill: '#38BDF8', textAlign: 'center', originX: 'center', lineHeight: 1.8 },
      { type: 'text', text: 'Вход свободный', left: 350, top: 530, fontSize: 18, fontFamily: 'Montserrat', fill: '#10B981', textAlign: 'center', originX: 'center', fontWeight: 'bold' },
      { type: 'text', text: 'ЦГБ г. Владимира • biblioteka33.ru', left: 350, top: 640, fontSize: 13, fontFamily: 'Montserrat', fill: '#64748b', textAlign: 'center', originX: 'center' },
    ],
  },
  {
    id: 'sign_banner',
    name: 'Баннер-вывеска',
    desc: 'Горизонтальный баннер',
    badge: '16:9',
    emoji: '🪧',
    bg: '#060918',
    size: 'banner',
    previewBg: 'linear-gradient(135deg,#14532d,#0c4a6e)',
    objects: [
      { type: 'rect', left: 480, top: 270, width: 900, height: 480, fill: '#060918', originX: 'center', originY: 'center' },
      { type: 'text', text: 'БИБЛИОТЕКА АВРОРЫ', left: 480, top: 160, fontSize: 52, fontFamily: 'Unbounded', fill: '#ffffff', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'biblioteka33.ru  •  Владимир', left: 480, top: 270, fontSize: 22, fontFamily: 'Montserrat', fill: '#38BDF8', textAlign: 'center', originX: 'center' },
      { type: 'rect', left: 480, top: 340, width: 600, height: 3, fill: '#8A6CFF', originX: 'center' },
      { type: 'text', text: '8 (4922) 32-XX-XX', left: 480, top: 390, fontSize: 28, fontFamily: 'Unbounded', fill: '#FBBF24', textAlign: 'center', originX: 'center' },
    ],
  },
  {
    id: 'closed_notice',
    name: 'Закрыто',
    desc: 'Выходной / санитарный день',
    badge: 'A4',
    emoji: '🔒',
    bg: '#1a0a0a',
    size: 'a4_v',
    previewBg: 'linear-gradient(160deg,#3a0a0a,#1a0808)',
    objects: [
      { type: 'rect', left: 297, top: 60, width: 530, height: 8, fill: '#F06060', originX: 'center' },
      { type: 'text', text: '🔒', left: 297, top: 120, fontSize: 80, textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'НЕ РАБОТАЕМ', left: 297, top: 240, fontSize: 40, fontFamily: 'Unbounded', fill: '#F06060', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Причина: ____________', left: 297, top: 340, fontSize: 22, fontFamily: 'Montserrat', fill: '#cbd5e1', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Дата закрытия:', left: 297, top: 420, fontSize: 18, fontFamily: 'Montserrat', fill: '#94a3b8', textAlign: 'center', originX: 'center' },
      { type: 'text', text: '«___» _________ 2025 г.', left: 297, top: 460, fontSize: 22, fontFamily: 'Montserrat', fill: '#ffffff', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Ждём вас!', left: 297, top: 560, fontSize: 28, fontFamily: 'Unbounded', fill: '#10B981', textAlign: 'center', originX: 'center' },
      { type: 'rect', left: 297, top: 760, width: 530, height: 8, fill: '#F06060', originX: 'center' },
    ],
  },
  {
    id: 'kids_event',
    name: 'Детское мероприятие',
    desc: 'Яркая детская афиша',
    badge: 'ВК',
    emoji: '🎈',
    bg: '#fef3c7',
    size: 'square',
    previewBg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    objects: [
      { type: 'rect', left: 350, top: 350, width: 700, height: 700, fill: '#fef3c7', originX: 'center', originY: 'center' },
      { type: 'text', text: '🎈🎠🌟', left: 350, top: 60, fontSize: 50, textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'ДЛЯ ДЕТЕЙ!', left: 350, top: 150, fontSize: 52, fontFamily: 'Unbounded', fill: '#ec4899', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'НАЗВАНИЕ СОБЫТИЯ', left: 350, top: 250, fontSize: 30, fontFamily: 'Unbounded', fill: '#0f172a', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Дата • Время • Место', left: 350, top: 370, fontSize: 20, fontFamily: 'Montserrat', fill: '#7c3aed', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Вход для детей бесплатный! 🎁', left: 350, top: 460, fontSize: 18, fontFamily: 'Montserrat', fill: '#16a34a', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Детская библиотека АВРОРА', left: 350, top: 620, fontSize: 14, fontFamily: 'Montserrat', fill: '#64748b', textAlign: 'center', originX: 'center' },
    ],
  },
  {
    id: 'book_display',
    name: 'Рекомендация книги',
    desc: 'Книжный стенд',
    badge: 'A4',
    emoji: '📚',
    bg: '#0f172a',
    size: 'a4_v',
    previewBg: 'linear-gradient(135deg,#1e3a5f,#4a1942)',
    objects: [
      { type: 'text', text: '📚  СОВЕТУЕТ БИБЛИОТЕКАРЬ', left: 297, top: 60, fontSize: 16, fontFamily: 'Unbounded', fill: '#38BDF8', textAlign: 'center', originX: 'center', fontWeight: 'bold' },
      { type: 'rect', left: 297, top: 100, width: 500, height: 3, fill: '#38BDF8', originX: 'center' },
      { type: 'rect', left: 297, top: 140, width: 200, height: 280, fill: '#1e2538', stroke: '#38BDF8', strokeWidth: 2, rx: 8, ry: 8, originX: 'center' },
      { type: 'text', text: 'Обложка\nкниги', left: 297, top: 210, fontSize: 16, fontFamily: 'Montserrat', fill: '#475569', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'НАЗВАНИЕ КНИГИ', left: 297, top: 460, fontSize: 24, fontFamily: 'Unbounded', fill: '#ffffff', fontWeight: 'bold', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'Автор Авторович', left: 297, top: 520, fontSize: 18, fontFamily: 'Montserrat', fill: '#38BDF8', textAlign: 'center', originX: 'center' },
      { type: 'text', text: 'О чём эта книга:\n(напишите здесь краткое описание)', left: 297, top: 580, fontSize: 15, fontFamily: 'Montserrat', fill: '#94a3b8', textAlign: 'center', originX: 'center', lineHeight: 1.6 },
      { type: 'rect', left: 297, top: 760, width: 500, height: 3, fill: '#8A6CFF', originX: 'center' },
      { type: 'text', text: 'Спросите у библиотекаря!', left: 297, top: 790, fontSize: 14, fontFamily: 'Montserrat', fill: '#8A6CFF', textAlign: 'center', originX: 'center' },
    ],
  },
];

/* ── Логотипы для вставки ───────────────────────────────────── */
const LOGOS = [
  { emoji: '⭐', label: 'АВРОРА', text: '★ АВРОРА ★', color: '#38BDF8', font: 'Unbounded' },
  { emoji: '🤖', label: 'Космо', text: '🤖 Космо', color: '#ffffff', font: 'Montserrat' },
  { emoji: '📚', label: 'ЦГБ', text: '📚 ЦГБ\nЦентральная\nгородская\nбиблиотека', color: '#38BDF8', font: 'Montserrat' },
  { emoji: '👶', label: 'ЦДБ', text: '👶 ЦДБ\nЦентральная\nдетская\nбиблиотека', color: '#F472B6', font: 'Montserrat' },
  { emoji: '🌿', label: 'Доброе', text: '🌿 Библиотека\n«Доброе»', color: '#10B981', font: 'Montserrat' },
  { emoji: '🏛', label: 'Ф-1', text: '🏛 Филиал № 1', color: '#FBBF24', font: 'Montserrat' },
  { emoji: '🔵', label: 'Ф-4', text: '🔵 Филиал № 4', color: '#8A6CFF', font: 'Montserrat' },
  { emoji: '🟢', label: 'Ф-10', text: '🟢 Филиал № 10', color: '#10B981', font: 'Montserrat' },
  { emoji: '🟡', label: 'Ф-13', text: '🟡 Филиал № 13', color: '#FBBF24', font: 'Montserrat' },
  { emoji: '🌐', label: 'Сайт', text: 'biblioteka33.ru', color: '#38BDF8', font: 'Montserrat' },
  { emoji: '📞', label: 'Телефон', text: '8 (4922) ___-__-__', color: '#ffffff', font: 'Montserrat' },
  { emoji: '📍', label: 'Адрес', text: '📍 г. Владимир,\nул. _____________', color: '#cbd5e1', font: 'Montserrat' },
];

/* ══════════════════════════════════════════════════════════════
   ГЛОБАЛЬНОЕ СОСТОЯНИЕ
   ══════════════════════════════════════════════════════════════ */
let canvas = null;
let currentSize = CANVAS_SIZES.a4_v;
let zoom = 1.0;
let history = [];
let historyIndex = -1;
let isSavingHistory = false;
let autosaveTimer = null;
const MAX_HISTORY = 40;

/* ── DOM-ссылки ─────────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const elScreenTpl    = $('#screen-templates');
const elScreenEditor = $('#screen-editor');
const elTplGrid      = $('#tpl-grid');
const elLogoGrid     = $('#logo-grid');
const elZoomLabel    = $('#zoom-label');
const elPropsEmpty   = $('#props-empty');
const elPropsText    = $('#props-text');
const elPropsShape   = $('#props-shape');
const elPropsCommon  = $('#props-common');

/* ══════════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ ШАБЛОНОВ
   ══════════════════════════════════════════════════════════════ */
function buildTemplateGrid() {
  elTplGrid.innerHTML = TEMPLATES.map(t => `
    <div class="tpl-card" data-tpl="${t.id}" tabindex="0" role="button" aria-label="${t.name}">
      <div class="tpl-preview" style="background:${t.previewBg || '#1e2538'}">
        <span style="font-size:52px">${t.emoji}</span>
        <span class="tpl-preview-label">${t.name}</span>
      </div>
      <div class="tpl-card-footer">
        <div class="tpl-card-name">${t.name}</div>
        <div class="tpl-card-desc">${t.desc}</div>
        <span class="tpl-card-badge">${t.badge}</span>
      </div>
    </div>
  `).join('');

  elTplGrid.addEventListener('click', e => {
    const card = e.target.closest('.tpl-card');
    if (!card) return;
    const tpl = TEMPLATES.find(t => t.id === card.dataset.tpl);
    if (tpl) loadTemplate(tpl);
  });
  elTplGrid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') e.target.closest('.tpl-card')?.click();
  });
}

function buildLogoGrid() {
  elLogoGrid.innerHTML = LOGOS.map((l, i) => `
    <div class="logo-item" data-logo="${i}" tabindex="0" role="button">
      <span class="logo-item-emoji">${l.emoji}</span>
      <span class="logo-item-label">${l.label}</span>
    </div>
  `).join('');

  elLogoGrid.addEventListener('click', e => {
    const item = e.target.closest('.logo-item');
    if (!item) return;
    const logo = LOGOS[+item.dataset.logo];
    if (!logo) return;
    closeLogoModal();
    addTextObject(logo.text, {
      fontSize: 22, fill: logo.color,
      fontFamily: logo.font, textAlign: 'center',
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   ЗАГРУЗКА ШАБЛОНА → ОТКРЫТИЕ РЕДАКТОРА
   ══════════════════════════════════════════════════════════════ */
function loadTemplate(tpl) {
  currentSize = CANVAS_SIZES[tpl.size] || CANVAS_SIZES.a4_v;
  elScreenTpl.classList.add('hidden');
  elScreenEditor.classList.remove('hidden');

  initCanvas(currentSize.w, currentSize.h);
  canvas.setBackgroundColor(tpl.bg || '#ffffff', canvas.renderAll.bind(canvas));

  // Добавляем объекты шаблона
  (tpl.objects || []).forEach(obj => addTemplateObject(obj));

  canvas.renderAll();
  fitZoom();
  saveHistory();
  startAutosave();
}

/* ══════════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ ХОЛСТА FABRIC.JS
   ══════════════════════════════════════════════════════════════ */
function initCanvas(w, h) {
  if (canvas) { canvas.dispose(); }

  canvas = new fabric.Canvas('poster-canvas', {
    width: w,
    height: h,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(56,189,248,0.15)',
    selectionBorderColor: '#38BDF8',
    selectionLineWidth: 1.5,
  });

  // Контролы выделения: цвет
  fabric.Object.prototype.set({
    borderColor: '#38BDF8',
    cornerColor: '#38BDF8',
    cornerSize: 10,
    transparentCorners: false,
    cornerStyle: 'circle',
  });

  canvas.on('selection:created',  updatePropsPanel);
  canvas.on('selection:updated',  updatePropsPanel);
  canvas.on('selection:cleared',  clearPropsPanel);
  canvas.on('object:modified',    () => saveHistory());
  canvas.on('object:added',       () => saveHistory());
  canvas.on('object:removed',     () => saveHistory());
}

/* ══════════════════════════════════════════════════════════════
   ДОБАВЛЕНИЕ ОБЪЕКТОВ ИЗ ШАБЛОНА
   ══════════════════════════════════════════════════════════════ */
function addTemplateObject(def) {
  const opts = { ...def };
  const type = opts.type;
  delete opts.type;

  // Общие параметры
  opts.selectable = true;
  opts.hasControls = true;

  switch (type) {
    case 'text': {
      const t = new fabric.Textbox(opts.text || 'Текст', {
        ...opts,
        editable: true,
        splitByGrapheme: false,
      });
      canvas.add(t);
      break;
    }
    case 'rect': {
      const r = new fabric.Rect(opts);
      canvas.add(r);
      break;
    }
    case 'circle': {
      const c = new fabric.Circle(opts);
      canvas.add(c);
      break;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   ИНСТРУМЕНТЫ — ДОБАВЛЕНИЕ ОБЪЕКТОВ
   ══════════════════════════════════════════════════════════════ */
function addTextObject(text, extraOpts = {}) {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const t = new fabric.Textbox(text, {
    left: cx - 200,
    top: cy - 30,
    width: 400,
    fontSize: 36,
    fontFamily: 'Unbounded',
    fill: '#ffffff',
    textAlign: 'center',
    editable: true,
    splitByGrapheme: false,
    selectable: true,
    ...extraOpts,
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
  t.enterEditing();
}

function addRect() {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const r = new fabric.Rect({
    left: cx - 100, top: cy - 60,
    width: 200, height: 120,
    fill: 'rgba(56,189,248,0.25)',
    stroke: '#38BDF8', strokeWidth: 2,
    rx: 10, ry: 10,
    selectable: true,
  });
  canvas.add(r);
  canvas.setActiveObject(r);
  canvas.renderAll();
}

function addCircle() {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const c = new fabric.Circle({
    left: cx - 70, top: cy - 70,
    radius: 70,
    fill: 'rgba(138,108,255,0.25)',
    stroke: '#8A6CFF', strokeWidth: 2,
    selectable: true,
  });
  canvas.add(c);
  canvas.setActiveObject(c);
  canvas.renderAll();
}

function addLine() {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const l = new fabric.Line([cx - 200, cy, cx + 200, cy], {
    stroke: '#38BDF8', strokeWidth: 4,
    selectable: true,
  });
  canvas.add(l);
  canvas.setActiveObject(l);
  canvas.renderAll();
}

function addPhotoFromFile(file) {
  if (!canvas || !file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    fabric.Image.fromURL(ev.target.result, img => {
      const maxW = currentSize.w * 0.7;
      const maxH = currentSize.h * 0.7;
      if (img.width > maxW) img.scaleToWidth(maxW);
      if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);
      img.set({
        left: (currentSize.w - img.getScaledWidth()) / 2,
        top: (currentSize.h - img.getScaledHeight()) / 2,
        selectable: true,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      toast('Фото добавлено! Перетащите его в нужное место 📷');
    });
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════════════
   ПАНЕЛЬ СВОЙСТВ
   ══════════════════════════════════════════════════════════════ */
function clearPropsPanel() {
  elPropsEmpty.classList.remove('hidden');
  elPropsText.classList.add('hidden');
  elPropsShape.classList.add('hidden');
  elPropsCommon.classList.add('hidden');
}

function updatePropsPanel(e) {
  const obj = canvas.getActiveObject();
  if (!obj) { clearPropsPanel(); return; }

  elPropsEmpty.classList.add('hidden');
  elPropsCommon.classList.remove('hidden');

  const isText = obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text';
  const isShape = obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse' || obj.type === 'line';

  elPropsText.classList.toggle('hidden', !isText);
  elPropsShape.classList.toggle('hidden', !isShape);

  if (isText) {
    const fs = Math.round(obj.fontSize || 36);
    $('#font-size-slider').value = fs;
    $('#font-size-val').textContent = fs;
    $('#font-family-select').value = obj.fontFamily || 'Unbounded';
    syncTextStyleButtons(obj);
    syncSwatches('#text-color-swatches', obj.fill);
    $('#text-color-picker').value = toHexSafe(obj.fill);
  }

  if (isShape) {
    const op = Math.round((obj.opacity || 1) * 100);
    $('#opacity-slider').value = op;
    $('#opacity-val').textContent = op;
    const sw = obj.strokeWidth || 0;
    $('#stroke-width-slider').value = sw;
    $('#stroke-width-val').textContent = sw;
    syncSwatches('#fill-color-swatches', obj.fill);
    $('#fill-color-picker').value = toHexSafe(obj.fill);
    syncSwatches('#stroke-color-swatches', obj.stroke);
    if (obj.stroke && obj.stroke !== 'transparent') {
      $('#stroke-color-picker').value = toHexSafe(obj.stroke);
    }
  }
}

function syncTextStyleButtons(obj) {
  $('#btn-bold').classList.toggle('is-active', obj.fontWeight === 'bold');
  $('#btn-italic').classList.toggle('is-active', obj.fontStyle === 'italic');
  $('#btn-underline').classList.toggle('is-active', obj.underline === true);
  $$('#ed-props .prop-btn[id^="btn-align-"]').forEach(b => b.classList.remove('is-active'));
  const alignMap = { left: 'btn-align-left', center: 'btn-align-center', right: 'btn-align-right' };
  const key = alignMap[obj.textAlign || 'left'];
  if (key) $(`#${key}`)?.classList.add('is-active');
}

function syncSwatches(containerSel, color) {
  $$(containerSel + ' .swatch').forEach(s => {
    s.classList.toggle('is-active', s.dataset.color === color);
  });
}

function toHexSafe(color) {
  if (!color || color === 'transparent') return '#000000';
  if (color.startsWith('#') && color.length <= 7) return color;
  return '#000000';
}

/* ══════════════════════════════════════════════════════════════
   ИСТОРИЯ ИЗМЕНЕНИЙ (UNDO / REDO)
   ══════════════════════════════════════════════════════════════ */
function saveHistory() {
  if (isSavingHistory || !canvas) return;
  isSavingHistory = true;

  // Обрезаем «вперёд» если делали undo
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }

  const json = canvas.toJSON(['selectable', 'hasControls', 'editable']);
  history.push(JSON.stringify(json));
  if (history.length > MAX_HISTORY) history.shift();
  historyIndex = history.length - 1;

  updateHistoryButtons();
  isSavingHistory = false;
}

function undo() {
  if (!canvas || historyIndex <= 0) return;
  historyIndex--;
  restoreHistory();
}

function redo() {
  if (!canvas || historyIndex >= history.length - 1) return;
  historyIndex++;
  restoreHistory();
}

function restoreHistory() {
  if (!history[historyIndex]) return;
  isSavingHistory = true;
  canvas.loadFromJSON(history[historyIndex], () => {
    canvas.renderAll();
    isSavingHistory = false;
    updateHistoryButtons();
    clearPropsPanel();
  });
}

function updateHistoryButtons() {
  $('#btn-undo').disabled = historyIndex <= 0;
  $('#btn-redo').disabled = historyIndex >= history.length - 1;
}

/* ══════════════════════════════════════════════════════════════
   МАСШТАБ
   ══════════════════════════════════════════════════════════════ */
function applyZoom(z) {
  if (!canvas) return;
  zoom = Math.min(Math.max(z, 0.1), 3.0);
  canvas.setZoom(zoom);
  canvas.setWidth(currentSize.w * zoom);
  canvas.setHeight(currentSize.h * zoom);
  elZoomLabel.textContent = Math.round(zoom * 100) + '%';
}

function fitZoom() {
  const wrap = $('#canvas-wrap');
  if (!wrap || !currentSize) return;
  const pw = wrap.clientWidth - 48;
  const ph = wrap.clientHeight - 48;
  const zw = pw / currentSize.w;
  const zh = ph / currentSize.h;
  applyZoom(Math.min(zw, zh, 1.0));
}

/* ══════════════════════════════════════════════════════════════
   ЭКСПОРТ
   ══════════════════════════════════════════════════════════════ */
function exportPng() {
  if (!canvas) return;
  const savedZoom = zoom;
  applyZoom(1.0);
  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = ($('#poster-title').value || 'Афиша') + '.png';
  a.click();

  applyZoom(savedZoom);
  toast('PNG сохранён! Файл в папке «Загрузки» 🖼');
}

function exportPdf() {
  if (!canvas || !window.jspdf) { toast('Загружаю PDF…'); return; }
  const { jsPDF } = window.jspdf;

  const savedZoom = zoom;
  applyZoom(1.0);
  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
  const isLandscape = currentSize.w > currentSize.h;
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [currentSize.w, currentSize.h],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, currentSize.w, currentSize.h);
  pdf.save(($('#poster-title').value || 'Афиша') + '.pdf');

  applyZoom(savedZoom);
  toast('PDF готов к печати! 📄');
}

/* ══════════════════════════════════════════════════════════════
   АВТОСОХРАНЕНИЕ В LOCALSTORAGE
   ══════════════════════════════════════════════════════════════ */
function startAutosave() {
  clearInterval(autosaveTimer);
  autosaveTimer = setInterval(autosave, 30000);
}

function autosave() {
  if (!canvas) return;
  try {
    const data = {
      canvas: canvas.toJSON(['selectable','hasControls','editable']),
      title: $('#poster-title').value,
      size: Object.entries(CANVAS_SIZES).find(([,v]) => v === currentSize)?.[0] || 'a4_v',
      savedAt: Date.now(),
    };
    localStorage.setItem('aurora_poster_draft', JSON.stringify(data));
  } catch(e) {}
}

function manualSave() {
  autosave();
  toast('Черновик сохранён в браузере 💾');
}

function loadDraft() {
  try {
    const raw = localStorage.getItem('aurora_poster_draft');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.canvas) return false;

    currentSize = CANVAS_SIZES[data.size] || CANVAS_SIZES.a4_v;
    elScreenTpl.classList.add('hidden');
    elScreenEditor.classList.remove('hidden');
    initCanvas(currentSize.w, currentSize.h);

    canvas.loadFromJSON(data.canvas, () => {
      canvas.renderAll();
      fitZoom();
      saveHistory();
    });

    if (data.title) $('#poster-title').value = data.title;
    startAutosave();
    return true;
  } catch(e) {
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════
   ФОН ХОЛСТА — ЦВЕТ И ГРАДИЕНТ
   ══════════════════════════════════════════════════════════════ */
function applyBgColor(color) {
  if (!canvas) return;
  canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));
  saveHistory();
}

function applyBgGradient(name) {
  if (!canvas) return;
  const colors = GRADIENTS[name];
  if (!colors) return;

  const grad = new fabric.Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: 0, y1: 0, x2: 0, y2: currentSize.h },
    colorStops: colors.map((c, i) => ({ offset: i / (colors.length - 1), color: c })),
  });

  canvas.setBackgroundColor(grad, canvas.renderAll.bind(canvas));
  saveHistory();
}

/* ══════════════════════════════════════════════════════════════
   ТОСТ
   ══════════════════════════════════════════════════════════════ */
function toast(text) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
}

/* ══════════════════════════════════════════════════════════════
   МОДАЛЬНОЕ ОКНО ЛОГОТИПОВ
   ══════════════════════════════════════════════════════════════ */
function openLogoModal() {
  $('#logo-modal-backdrop').classList.remove('hidden');
}
function closeLogoModal() {
  $('#logo-modal-backdrop').classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════════
   ПРИВЯЗКА ОБРАБОТЧИКОВ СОБЫТИЙ
   ══════════════════════════════════════════════════════════════ */
function bindEvents() {

  /* ── Навигация ── */
  $('#btn-back').addEventListener('click', () => {
    if (confirm('Вернуться к выбору шаблона? Несохранённые изменения будут потеряны.')) {
      elScreenEditor.classList.add('hidden');
      elScreenTpl.classList.remove('hidden');
      clearInterval(autosaveTimer);
    }
  });

  /* ── История ── */
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
      const obj = canvas.getActiveObject();
      if (obj && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    }
  });

  /* ── Сохранение и экспорт ── */
  $('#btn-save').addEventListener('click', manualSave);
  $('#btn-export-png').addEventListener('click', exportPng);
  $('#btn-export-pdf').addEventListener('click', exportPdf);

  /* ── Инструменты ── */
  $('#tool-heading').addEventListener('click',    () => addTextObject('Заголовок', { fontSize: 48, fontFamily: 'Unbounded', fontWeight: 'bold' }));
  $('#tool-subheading').addEventListener('click', () => addTextObject('Подзаголовок', { fontSize: 28, fontFamily: 'Montserrat', fontWeight: '600' }));
  $('#tool-text').addEventListener('click',       () => addTextObject('Основной текст', { fontSize: 20, fontFamily: 'Montserrat', fill: '#cbd5e1' }));
  $('#tool-rect').addEventListener('click',       addRect);
  $('#tool-circle').addEventListener('click',     addCircle);
  $('#tool-line').addEventListener('click',       addLine);
  $('#tool-logo').addEventListener('click',       openLogoModal);
  $('#tool-photo').addEventListener('click',      () => $('#photo-input').click());
  $('#photo-input').addEventListener('change',    e => { addPhotoFromFile(e.target.files?.[0]); e.target.value = ''; });

  /* ── Фон ── */
  $$('#bg-colors .bg-color-btn').forEach(btn => {
    btn.addEventListener('click', () => applyBgColor(btn.dataset.color));
  });
  $$('.bg-gradient-btn').forEach(btn => {
    btn.addEventListener('click', () => applyBgGradient(btn.dataset.gradient));
  });

  /* ── Масштаб ── */
  $('#btn-zoom-in').addEventListener('click',  () => applyZoom(zoom + 0.1));
  $('#btn-zoom-out').addEventListener('click', () => applyZoom(zoom - 0.1));
  $('#btn-zoom-fit').addEventListener('click', fitZoom);

  /* ── Свойства текста ── */
  $('#font-size-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    $('#font-size-val').textContent = v;
    if (obj && (obj.type === 'textbox' || obj.type === 'i-text')) {
      obj.set('fontSize', v);
      canvas.renderAll();
    }
  });
  $('#font-size-slider').addEventListener('change', () => saveHistory());

  $('#font-family-select').addEventListener('change', e => {
    const obj = canvas?.getActiveObject();
    if (obj) { obj.set('fontFamily', e.target.value); canvas.renderAll(); saveHistory(); }
  });

  $('#btn-bold').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
    canvas.renderAll(); saveHistory(); syncTextStyleButtons(obj);
  });
  $('#btn-italic').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
    canvas.renderAll(); saveHistory(); syncTextStyleButtons(obj);
  });
  $('#btn-underline').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('underline', !obj.underline);
    canvas.renderAll(); saveHistory(); syncTextStyleButtons(obj);
  });

  ['left', 'center', 'right'].forEach(a => {
    $(`#btn-align-${a}`).addEventListener('click', () => {
      const obj = canvas?.getActiveObject();
      if (!obj) return;
      obj.set('textAlign', a);
      canvas.renderAll(); saveHistory(); syncTextStyleButtons(obj);
    });
  });

  /* Цвет текста */
  $$('#text-color-swatches .swatch').forEach(s => {
    s.addEventListener('click', () => {
      const obj = canvas?.getActiveObject();
      if (!obj) return;
      obj.set('fill', s.dataset.color);
      canvas.renderAll(); saveHistory();
      syncSwatches('#text-color-swatches', s.dataset.color);
    });
  });
  $('#text-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fill', e.target.value);
    canvas.renderAll();
  });
  $('#text-color-picker').addEventListener('change', () => saveHistory());

  /* ── Свойства фигур ── */
  $('#opacity-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    $('#opacity-val').textContent = v;
    if (obj) { obj.set('opacity', v / 100); canvas.renderAll(); }
  });
  $('#opacity-slider').addEventListener('change', () => saveHistory());

  $('#stroke-width-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    $('#stroke-width-val').textContent = v;
    if (obj) { obj.set('strokeWidth', v); canvas.renderAll(); }
  });
  $('#stroke-width-slider').addEventListener('change', () => saveHistory());

  $$('#fill-color-swatches .swatch').forEach(s => {
    s.addEventListener('click', () => {
      const obj = canvas?.getActiveObject();
      if (!obj) return;
      obj.set('fill', s.dataset.color);
      canvas.renderAll(); saveHistory();
      syncSwatches('#fill-color-swatches', s.dataset.color);
    });
  });
  $('#fill-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fill', e.target.value);
    canvas.renderAll();
  });
  $('#fill-color-picker').addEventListener('change', () => saveHistory());

  $$('#stroke-color-swatches .swatch').forEach(s => {
    s.addEventListener('click', () => {
      const obj = canvas?.getActiveObject();
      if (!obj) return;
      obj.set('stroke', s.dataset.color);
      canvas.renderAll(); saveHistory();
    });
  });
  $('#stroke-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('stroke', e.target.value);
    canvas.renderAll();
  });
  $('#stroke-color-picker').addEventListener('change', () => saveHistory());

  /* ── Положение объектов ── */
  $('#btn-bring-front').addEventListener('click', () => {
    canvas?.getActiveObject()?.bringToFront();
    canvas.renderAll(); saveHistory();
  });
  $('#btn-send-back').addEventListener('click', () => {
    canvas?.getActiveObject()?.sendToBack();
    canvas.renderAll(); saveHistory();
  });
  $('#btn-center-h').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('left', (currentSize.w - obj.getScaledWidth()) / 2);
    obj.setCoords(); canvas.renderAll(); saveHistory();
  });
  $('#btn-center-v').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('top', (currentSize.h - obj.getScaledHeight()) / 2);
    obj.setCoords(); canvas.renderAll(); saveHistory();
  });
  $('#btn-delete-obj').addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    if (!confirm('Удалить этот объект?')) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    clearPropsPanel();
  });

  /* ── Логотипы ── */
  $('#logo-modal-close').addEventListener('click', closeLogoModal);
  $('#logo-modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLogoModal();
  });

  /* ── Resize ── */
  window.addEventListener('resize', fitZoom);
}

/* ══════════════════════════════════════════════════════════════
   СТАРТ
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildTemplateGrid();
  buildLogoGrid();
  bindEvents();

  // Предложить восстановить черновик, если есть
  const hasDraft = localStorage.getItem('aurora_poster_draft');
  if (hasDraft) {
    try {
      const draft = JSON.parse(hasDraft);
      const dt = new Date(draft.savedAt);
      const timeStr = dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      if (confirm(`Найден сохранённый черновик (${timeStr}).\nВосстановить его?`)) {
        loadDraft();
        return;
      }
    } catch(e) {}
  }

  toast('Выберите шаблон для начала работы 👆');
});
