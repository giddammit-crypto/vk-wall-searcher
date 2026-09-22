/* =============================================================
   АВРОРА — Редактор Афиш  editor.js v2.1.0
   19 кириллических шрифтов | Слои | Космо | QR-код | Фигуры
   ============================================================= */
'use strict';

/* ── Форматы холста ─────────────────────────────────────────── */
const SIZES = {
  a4_v:   { w: 595,  h: 842,  name: 'A4 вертикаль' },
  a4_h:   { w: 842,  h: 595,  name: 'A4 горизонталь' },
  square: { w: 700,  h: 700,  name: 'Квадрат (ВК)' },
  banner: { w: 960,  h: 540,  name: 'Баннер 16:9' },
};

/* ── 19 кириллических шрифтов ──────────────────────────────── */
const FONTS = [
  { id: 'Unbounded',          name: 'Unbounded',          desc: 'Заголовочный, ультрасовременный' },
  { id: 'Montserrat',        name: 'Montserrat',        desc: 'Универсальный гротеск' },
  { id: 'Cormorant Garamond', name: 'Cormorant Garamond', desc: 'Литературный, благородная антиква' },
  { id: 'Playfair Display',   name: 'Playfair Display',   desc: 'Элегантный, парадный' },
  { id: 'Oswald',             name: 'Oswald',             desc: 'Узкий плакатный гротеск' },
  { id: 'Rubik',              name: 'Rubik',              desc: 'Мягкий современный' },
  { id: 'Comfortaa',          name: 'Comfortaa',          desc: 'Округлый, для детей и праздников' },
  { id: 'Ruslan Display',     name: 'Ruslan Display',     desc: 'Былинный, сказочный, исторический' },
  { id: 'Kelly Slab',         name: 'Kelly Slab',         desc: 'Брусковый плакатный' },
  { id: 'Marck Script',       name: 'Marck Script',       desc: 'Каллиграфический рукописный' },
  { id: 'Caveat',             name: 'Caveat',             desc: 'Живой рукописный маркер' },
  { id: 'Roboto Slab',        name: 'Roboto Slab',        desc: 'Книжно-газетный брусковый' },
  { id: 'Jura',               name: 'Jura',               desc: 'Космический, стиль Космо' },
  { id: 'Neucha',             name: 'Neucha',             desc: 'Крафтовый душевный почерк' },
  { id: 'Press Start 2P',     name: 'Press Start 2P',     desc: 'Ретро 8-bit, квизы и игры' },
  { id: 'Lobster',            name: 'Lobster',            desc: 'Яркий ретро-курсив' },
  { id: 'Podkova',            name: 'Podkova',            desc: 'Широкая выразительная подкова' },
  { id: 'Georgia',            name: 'Georgia',            desc: 'Классическая книга' },
  { id: 'Arial',              name: 'Arial',              desc: 'Стандартный чёткий гротеск' },
];

/* ── Цветовые палитры ───────────────────────────────────────── */
const PALETTE = [
  { hex: '#0f172a', name: 'Ночь' },
  { hex: '#1e293b', name: 'Тёмно-синий' },
  { hex: '#1e3a5f', name: 'Синий' },
  { hex: '#4a1942', name: 'Фиолетовый' },
  { hex: '#1a3a1a', name: 'Зелёный' },
  { hex: '#3a1212', name: 'Бордовый' },
  { hex: '#ffffff', name: 'Белый', light: true },
  { hex: '#f8fafc', name: 'Светло-серый', light: true },
  { hex: '#fffbeb', name: 'Кремовый', light: true },
  { hex: '#eff6ff', name: 'Голубоватый', light: true },
];

const TEXT_COLORS = [
  '#ffffff','#0f172a','#38BDF8','#8A6CFF','#FBBF24','#F472B6','#10B981','#EF4444',
];
const SHAPE_COLORS = [
  'transparent','#ffffff','#0f172a','#38BDF8','#8A6CFF','#FBBF24','#F472B6','#10B981',
];

const GRADIENTS = {
  aurora:  { x1:0, y1:0, x2:0, stops:[['#06091a','#131726','#1a1c4e','#090b20']] },
  ocean:   { x1:0, y1:0, x2:0, stops:[['#0c4a6e','#0369a1','#0ea5e9']] },
  forest:  { x1:0, y1:0, x2:0, stops:[['#14532d','#166534','#15803d']] },
  sunset:  { x1:0, y1:0, x2:1, stops:[['#7c3aed','#db2777','#f97316']] },
};

/* ── Маскоты Космо ──────────────────────────────────────────── */
const COSMO_ITEMS = [
  { file: 'robot_read.png',     label: 'Космо с книгой', desc: 'Читает книгу 📖' },
  { file: 'robot_waving.png',   label: 'Приветствие',    desc: 'Машет рукой 👋' },
  { file: 'robot_idea.png',     label: 'Есть идея!',     desc: 'С лампочкой 💡' },
  { file: 'robot_cool.png',     label: 'Крутой Космо',   desc: 'В стильных очках 😎' },
  { file: 'robot_party.png',    label: 'Праздник',       desc: 'С шариками 🎉' },
  { file: 'robot_smile.png',    label: 'Улыбка',         desc: 'Добрый робот ✨' },
  { file: 'robot_thinking.png', label: 'Размышление',    desc: 'Задумался 🤔' },
  { file: 'robot_love.png',     label: 'С любовью',      desc: 'Сердечко ❤️' },
];

/* ── Шаблоны ────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'blank_a4', size: 'a4_v',
    name: 'Чистый лист A4', desc: 'Начать с нуля', fmt: 'A4',
    bg: '#ffffff', previewBg: '#1e293b', previewAccent: '#38BDF8',
    objects: [],
  },
  {
    id: 'blank_square', size: 'square',
    name: 'Квадрат (ВК)', desc: 'Пост для соцсети', fmt: '1:1',
    bg: '#131726', previewBg: '#131726', previewAccent: '#8A6CFF', isSquare: true,
    objects: [],
  },
  {
    id: 'announce_a4', size: 'a4_v',
    name: 'Объявление A4', desc: 'Распечатать на двери', fmt: 'A4',
    bg: '#0f172a', previewBg: '#0f172a', previewAccent: '#38BDF8',
    objects: [
      { type:'rect',  left:297, top:70,  width:500, height:5, fill:'#38BDF8', originX:'center' },
      { type:'text',  text:'УВАЖАЕМЫЕ ЧИТАТЕЛИ!', left:297, top:120, fontSize:28, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text',  text:'Текст объявления.\nДата и время мероприятия.\nМесто проведения.', left:297, top:220, fontSize:18, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.7 },
      { type:'text',  text:'Библиотека «АВРОРА»  ·  biblioteka33.ru', left:297, top:740, fontSize:13, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:765, width:500, height:4, fill:'#38BDF8', originX:'center' },
    ],
  },
  {
    id: 'event_square', size: 'square',
    name: 'Афиша мероприятия', desc: 'Событие / праздник', fmt: 'ВК',
    bg: '#0c0f1a', previewBg: '#0c0f1a', previewAccent: '#FBBF24', isSquare: true,
    objects: [
      { type:'text', text:'ПРИГЛАШАЕМ', left:350, top:90, fontSize:20, fontFamily:'Unbounded', fill:'#FBBF24', textAlign:'center', originX:'center', fontWeight:'bold' },
      { type:'text', text:'НАЗВАНИЕ\nМЕРОПРИЯТИЯ', left:350, top:170, fontSize:44, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center', lineHeight:1.2 },
      { type:'rect', left:350, top:330, width:400, height:2, fill:'rgba(255,255,255,0.2)', originX:'center' },
      { type:'text', text:'Дата и время\nМесто проведения', left:350, top:360, fontSize:20, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center', lineHeight:1.8 },
      { type:'text', text:'Вход свободный', left:350, top:510, fontSize:18, fontFamily:'Montserrat', fill:'#10B981', textAlign:'center', originX:'center', fontWeight:'bold' },
      { type:'text', text:'ЦГБ г. Владимира  ·  biblioteka33.ru', left:350, top:640, fontSize:12, fontFamily:'Montserrat', fill:'#475569', textAlign:'center', originX:'center' },
    ],
  },
  {
    id: 'sign_banner', size: 'banner',
    name: 'Баннер-вывеска', desc: 'Горизонтальный баннер', fmt: '16:9',
    bg: '#060918', previewBg: '#060918', previewAccent: '#10B981', isLandscape: true,
    objects: [
      { type:'text', text:'БИБЛИОТЕКА АВРОРЫ', left:480, top:155, fontSize:52, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'rect', left:480, top:235, width:500, height:3, fill:'#38BDF8', originX:'center' },
      { type:'text', text:'biblioteka33.ru  ·  г. Владимир', left:480, top:262, fontSize:20, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'8 (4922) 32-XX-XX', left:480, top:330, fontSize:32, fontFamily:'Unbounded', fill:'#FBBF24', textAlign:'center', originX:'center' },
    ],
  },
  {
    id: 'closed_notice', size: 'a4_v',
    name: 'Закрыто', desc: 'Выходной / санитарный день', fmt: 'A4',
    bg: '#1a0808', previewBg: '#1a0808', previewAccent: '#EF4444',
    objects: [
      { type:'rect',  left:297, top:55,  width:530, height:6, fill:'#EF4444', originX:'center' },
      { type:'text',  text:'НЕ РАБОТАЕМ', left:297, top:200, fontSize:48, fontFamily:'Unbounded', fill:'#EF4444', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text',  text:'Причина: ____________________', left:297, top:310, fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'text',  text:'Дата:', left:297, top:400, fontSize:18, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center' },
      { type:'text',  text:'«___» __________ 2025 г.', left:297, top:440, fontSize:24, fontFamily:'Montserrat', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'text',  text:'Ждём вас!', left:297, top:540, fontSize:30, fontFamily:'Unbounded', fill:'#10B981', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:765, width:530, height:6, fill:'#EF4444', originX:'center' },
    ],
  },
  {
    id: 'kids_event', size: 'square',
    name: 'Детское мероприятие', desc: 'Яркая детская афиша', fmt: 'ВК',
    bg: '#fef3c7', previewBg: '#fef3c7', previewAccent: '#ec4899', isSquare: true,
    objects: [
      { type:'rect', left:350, top:350, width:700, height:700, fill:'#fef3c7', originX:'center', originY:'center' },
      { type:'text', text:'ДЛЯ ДЕТЕЙ!', left:350, top:120, fontSize:56, fontFamily:'Unbounded', fill:'#ec4899', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text', text:'НАЗВАНИЕ СОБЫТИЯ', left:350, top:240, fontSize:30, fontFamily:'Unbounded', fill:'#0f172a', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text', text:'Дата  ·  Время  ·  Место', left:350, top:360, fontSize:20, fontFamily:'Montserrat', fill:'#7c3aed', textAlign:'center', originX:'center' },
      { type:'text', text:'Вход для детей бесплатный!', left:350, top:450, fontSize:18, fontFamily:'Montserrat', fill:'#16a34a', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text', text:'Детская библиотека АВРОРА', left:350, top:615, fontSize:13, fontFamily:'Montserrat', fill:'#92400e', textAlign:'center', originX:'center' },
    ],
  },
  {
    id: 'book_display', size: 'a4_v',
    name: 'Рекомендация книги', desc: 'Книжный стенд', fmt: 'A4',
    bg: '#0f172a', previewBg: '#0f172a', previewAccent: '#8A6CFF',
    objects: [
      { type:'text', text:'СОВЕТУЕТ БИБЛИОТЕКАРЬ', left:297, top:55, fontSize:14, fontFamily:'Unbounded', fill:'#38BDF8', textAlign:'center', originX:'center', fontWeight:'bold' },
      { type:'rect', left:297, top:90,  width:500, height:2, fill:'#38BDF8', originX:'center' },
      { type:'rect', left:297, top:130, width:200, height:280, fill:'#1e2538', stroke:'#38BDF8', strokeWidth:2, rx:6, ry:6, originX:'center' },
      { type:'text', text:'Обложка\nкниги', left:297, top:210, fontSize:15, fontFamily:'Montserrat', fill:'#334155', textAlign:'center', originX:'center' },
      { type:'text', text:'НАЗВАНИЕ КНИГИ', left:297, top:450, fontSize:26, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text', text:'Автор', left:297, top:510, fontSize:18, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'Краткое описание книги.\nНапишите несколько предложений.', left:297, top:570, fontSize:15, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center', lineHeight:1.6 },
      { type:'rect', left:297, top:765, width:500, height:2, fill:'#8A6CFF', originX:'center' },
    ],
  },
];

/* ── Логотипы и контакты ────────────────────────────────────── */
const LOGOS = [
  { label:'АВРОРА',      text:'АВРОРА',            color:'#38BDF8', font:'Unbounded', category:'Бренд' },
  { label:'Космо',       text:'Космо',              color:'#ffffff', font:'Unbounded', category:'Бренд' },
  { label:'ЦГБ',         text:'ЦГБ\nЦентральная городская\nбиблиотека', color:'#38BDF8', font:'Montserrat', category:'Филиал' },
  { label:'ЦДБ',         text:'ЦДБ\nЦентральная детская\nбиблиотека',   color:'#F472B6', font:'Montserrat', category:'Филиал' },
  { label:'Доброе',      text:'Библиотека «Доброе»', color:'#10B981', font:'Montserrat', category:'Филиал' },
  { label:'Филиал № 1',  text:'Филиал № 1',         color:'#FBBF24', font:'Montserrat', category:'Филиал' },
  { label:'Филиал № 4',  text:'Филиал № 4',         color:'#8A6CFF', font:'Montserrat', category:'Филиал' },
  { label:'Филиал № 10', text:'Филиал № 10',         color:'#10B981', font:'Montserrat', category:'Филиал' },
  { label:'Сайт',        text:'biblioteka33.ru',     color:'#38BDF8', font:'Montserrat', category:'Контакт' },
  { label:'Телефон',     text:'8 (4922) ___-__-__',  color:'#ffffff', font:'Montserrat', category:'Контакт' },
  { label:'Адрес',       text:'г. Владимир,\nул. _______________', color:'#94a3b8', font:'Montserrat', category:'Контакт' },
  { label:'Вход своб.',  text:'Вход свободный',      color:'#10B981', font:'Unbounded', category:'Пометки' },
  { label:'16+',         text:'16+',                 color:'#FBBF24', font:'Unbounded', category:'Пометки' },
  { label:'0+',          text:'0+',                  color:'#10B981', font:'Unbounded', category:'Пометки' },
  { label:'Бесплатно',   text:'БЕСПЛАТНО',           color:'#10B981', font:'Unbounded', category:'Пометки' },
];

/* ══════════════════════════════════════════════════════════════
   СОСТОЯНИЕ
   ══════════════════════════════════════════════════════════════ */
let canvas = null;
let currentSize = SIZES.a4_v;
let zoom = 1.0;
let history = [];
let historyIdx = -1;
let savingHistory = false;
let qrCodeInstance = null;
const MAX_HISTORY = 50;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ══════════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ ШРИФТОВ
   ══════════════════════════════════════════════════════════════ */
function buildFontSelect() {
  const sel = $('#font-family-select');
  if (!sel) return;
  sel.innerHTML = FONTS.map(f => `
    <option value="${f.id}">
      ${f.name} — ${f.desc}
    </option>
  `).join('');
}

async function setFontFamily(fontFamily) {
  const obj = canvas?.getActiveObject();
  if (!obj) return;
  try {
    if (document.fonts) {
      await document.fonts.load(`32px "${fontFamily}"`);
    }
  } catch(e) {}
  obj.set('fontFamily', fontFamily);
  canvas.renderAll();
  saveHistory();
  updateLayersList();
}

/* ══════════════════════════════════════════════════════════════
   ЭКРАН ШАБЛОНОВ
   ══════════════════════════════════════════════════════════════ */
function buildTemplates() {
  const grid = $('#tpl-grid');
  grid.innerHTML = TEMPLATES.map(t => {
    const isSquare = t.isSquare ? 'is-square' : '';
    const isLandscape = t.isLandscape ? 'is-landscape' : '';
    return `
    <div class="tpl-card ${isSquare} ${isLandscape}" data-tpl="${t.id}" tabindex="0" role="button" aria-label="${t.name}">
      <div class="tpl-preview ${isSquare} ${isLandscape}" style="background:${t.previewBg}">
        <div class="tpl-preview-inner" style="background:${t.previewBg}; outline: 1.5px solid rgba(255,255,255,0.08);">
          <div class="tpl-preview-line is-accent" style="background:${t.previewAccent}"></div>
          <div class="tpl-preview-line is-title"></div>
          <div class="tpl-preview-line is-sub"></div>
          <div class="tpl-preview-line is-body"></div>
          <div class="tpl-preview-line is-body" style="width:45%"></div>
        </div>
        <div class="tpl-preview-badge">${t.fmt}</div>
      </div>
      <div class="tpl-card-footer">
        <div class="tpl-card-name">${t.name}</div>
        <div class="tpl-card-desc">${t.desc}</div>
        <span class="tpl-card-fmt">${t.fmt}</span>
      </div>
    </div>`;
  }).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.tpl-card');
    if (card) loadTemplate(TEMPLATES.find(t => t.id === card.dataset.tpl));
  });
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') e.target.closest('.tpl-card')?.click();
  });
}

function buildLogos() {
  const grid = $('#logo-grid');
  grid.innerHTML = LOGOS.map((l, i) => `
    <div class="logo-item" data-logo="${i}" tabindex="0" role="button">
      <div class="logo-item-type">${l.category}</div>
      <div class="logo-item-label" style="color:${l.color}">${l.label}</div>
      <div class="logo-item-preview">${l.text.split('\n')[0]}</div>
    </div>
  `).join('');

  grid.addEventListener('click', e => {
    const item = e.target.closest('.logo-item');
    if (!item) return;
    const logo = LOGOS[+item.dataset.logo];
    closeLogoModal();
    addText(logo.text, { fontSize: 22, fill: logo.color, fontFamily: logo.font, textAlign: 'center' });
  });
}

function buildCosmoGrid() {
  const grid = $('#cosmo-grid');
  if (!grid) return;
  grid.innerHTML = COSMO_ITEMS.map(item => `
    <div class="cosmo-card" data-file="${item.file}" tabindex="0" role="button">
      <img class="cosmo-thumb" src="../assets/images/mascot/${item.file}" onerror="this.onerror=null;this.src='assets/images/mascot/${item.file}'" alt="${item.label}">
      <div class="cosmo-name">${item.label}</div>
    </div>
  `).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.cosmo-card');
    if (!card) return;
    const file = card.dataset.file;
    closeCosmoModal();
    addCosmoMascot(file);
  });
}

function buildBgPalette() {
  const el = $('#bg-palette');
  el.innerHTML = PALETTE.map(p => `
    <button class="bg-swatch" data-color="${p.hex}" title="${p.name}"
      style="background:${p.hex}; ${p.light ? 'border-color:rgba(0,0,0,0.15);' : ''}">
    </button>
  `).join('');
  el.addEventListener('click', e => {
    const btn = e.target.closest('.bg-swatch');
    if (btn && canvas) {
      canvas.setBackgroundColor(btn.dataset.color, canvas.renderAll.bind(canvas));
      saveHistory();
    }
  });
}

function buildColorRows() {
  const mkSwatches = (containerId, colors, onPick) => {
    const el = $('#' + containerId);
    el.innerHTML = colors.map(c => {
      const style = c === 'transparent'
        ? 'background:conic-gradient(#ccc 90deg,#fff 90deg 180deg,#ccc 180deg 270deg,#fff 270deg);'
        : `background:${c};`;
      const border = c === '#ffffff' ? 'border-color:rgba(0,0,0,0.2);' : '';
      return `<button class="cswatch" data-color="${c}" style="${style}${border}" title="${c}"></button>`;
    }).join('');
    el.addEventListener('click', e => {
      const s = e.target.closest('.cswatch');
      if (s) {
        $$('#'+containerId+' .cswatch').forEach(x => x.classList.remove('is-active'));
        s.classList.add('is-active');
        onPick(s.dataset.color);
      }
    });
  };

  mkSwatches('text-color-row', TEXT_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) { obj.set('fill', c); canvas.renderAll(); saveHistory(); }
    if (c !== 'transparent') $('#text-color-picker').value = c;
  });

  mkSwatches('fill-color-row', SHAPE_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) { obj.set('fill', c); canvas.renderAll(); saveHistory(); }
    if (c !== 'transparent') $('#fill-color-picker').value = c;
  });

  mkSwatches('stroke-color-row', SHAPE_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) { obj.set('stroke', c === 'transparent' ? null : c); canvas.renderAll(); saveHistory(); }
    if (c !== 'transparent') $('#stroke-color-picker').value = c;
  });
}

/* ══════════════════════════════════════════════════════════════
   ЗАГРУЗКА ШАБЛОНА
   ══════════════════════════════════════════════════════════════ */
function loadTemplate(tpl) {
  if (!tpl) return;
  currentSize = SIZES[tpl.size] || SIZES.a4_v;
  $('#screen-templates').classList.add('hidden');
  $('#screen-editor').classList.remove('hidden');

  initCanvas(currentSize.w, currentSize.h);
  canvas.setBackgroundColor(tpl.bg || '#ffffff', () => {});
  (tpl.objects || []).forEach(addTemplateObj);
  canvas.renderAll();
  fitZoom();
  saveHistory();
  updateLayersList();
  startAutosave();
}

/* ══════════════════════════════════════════════════════════════
   CANVAS
   ══════════════════════════════════════════════════════════════ */
function initCanvas(w, h) {
  if (canvas) canvas.dispose();

  canvas = new fabric.Canvas('poster-canvas', {
    width: w, height: h,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(56,189,248,0.1)',
    selectionBorderColor: '#38BDF8',
    selectionLineWidth: 1,
  });

  fabric.Object.prototype.set({
    borderColor: '#38BDF8',
    cornerColor: '#38BDF8',
    cornerSize: 9,
    transparentCorners: false,
    cornerStyle: 'circle',
    padding: 2,
  });

  canvas.on('selection:created',  onSelection);
  canvas.on('selection:updated',  onSelection);
  canvas.on('selection:cleared',  clearProps);
  canvas.on('object:modified',    () => { saveHistory(); updateLayersList(); });
  canvas.on('object:added',       () => updateLayersList());
  canvas.on('object:removed',     () => { saveHistory(); updateLayersList(); });
}

function addTemplateObj(def) {
  const d = { ...def };
  const type = d.type; delete d.type;
  d.selectable = true; d.hasControls = true;
  switch(type) {
    case 'text': {
      const t = new fabric.Textbox(d.text || 'Текст', { ...d, editable: true });
      canvas.add(t); break;
    }
    case 'rect':   canvas.add(new fabric.Rect(d));   break;
    case 'circle': canvas.add(new fabric.Circle(d)); break;
    case 'line':   canvas.add(new fabric.Line(d.points || [0,0,100,0], d)); break;
  }
}

/* ══════════════════════════════════════════════════════════════
   ДОБАВЛЕНИЕ ОБЪЕКТОВ
   ══════════════════════════════════════════════════════════════ */
function addText(text, extra = {}) {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const t = new fabric.Textbox(text, {
    left: cx - 200, top: cy - 25, width: 400,
    fontSize: 36, fontFamily: 'Unbounded',
    fill: '#ffffff', textAlign: 'center',
    editable: true, selectable: true,
    ...extra,
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
  t.enterEditing();
  updateLayersList();
}

function addBadge() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const b = new fabric.Textbox('★  БЕСПЛАТНО', {
    left: cx - 120, top: cy - 25, width: 240,
    fontSize: 20, fontFamily: 'Unbounded', fontWeight: 'bold',
    fill: '#090d16', backgroundColor: '#10B981',
    textAlign: 'center', padding: 10,
    selectable: true, editable: true,
  });
  canvas.add(b);
  canvas.setActiveObject(b);
  canvas.renderAll();
  updateLayersList();
  toast('Плашка добавлена');
}

function addQuote() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const q = new fabric.Textbox('«Книга — это мечта, которую вы держите в руках.»\n\n— Нил Гейман', {
    left: cx - 210, top: cy - 50, width: 420,
    fontSize: 22, fontFamily: 'Cormorant Garamond', fontStyle: 'italic',
    fill: '#f1f5f9', textAlign: 'center', lineHeight: 1.5,
    selectable: true, editable: true,
  });
  canvas.add(q);
  canvas.setActiveObject(q);
  canvas.renderAll();
  updateLayersList();
  toast('Цитата добавлена');
}

function addDateBlock() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const d = new fabric.Textbox('25 СЕНТЯБРЯ\n15:00', {
    left: cx - 150, top: cy - 40, width: 300,
    fontSize: 26, fontFamily: 'Unbounded', fontWeight: 'bold',
    fill: '#FBBF24', textAlign: 'center', lineHeight: 1.3,
    selectable: true, editable: true,
  });
  canvas.add(d);
  canvas.setActiveObject(d);
  canvas.renderAll();
  updateLayersList();
  toast('Блок даты добавлен');
}

function addRect() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const r = new fabric.Rect({
    left: cx - 100, top: cy - 60, width: 200, height: 120,
    fill: 'rgba(56,189,248,0.2)', stroke: '#38BDF8', strokeWidth: 2,
    rx: 8, ry: 8, selectable: true,
  });
  canvas.add(r);
  canvas.setActiveObject(r);
  canvas.renderAll();
  updateLayersList();
}

function addCircle() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const c = new fabric.Circle({
    left: cx - 65, top: cy - 65, radius: 65,
    fill: 'rgba(138,108,255,0.2)', stroke: '#8A6CFF', strokeWidth: 2,
    selectable: true,
  });
  canvas.add(c);
  canvas.setActiveObject(c);
  canvas.renderAll();
  updateLayersList();
}

function addLine() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const l = new fabric.Line([cx - 180, cy, cx + 180, cy], {
    stroke: '#38BDF8', strokeWidth: 3, selectable: true,
  });
  canvas.add(l);
  canvas.setActiveObject(l);
  canvas.renderAll();
  updateLayersList();
}

function addDashedLine() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const l = new fabric.Line([cx - 180, cy, cx + 180, cy], {
    stroke: '#38BDF8', strokeWidth: 2, strokeDashArray: [8, 6], selectable: true,
  });
  canvas.add(l);
  canvas.setActiveObject(l);
  canvas.renderAll();
  updateLayersList();
}

function addArrow() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  // Чёткий векторный указатель стрелки
  const arrowPath = 'M 0 14 L 75 14 L 75 0 L 110 20 L 75 40 L 75 26 L 0 26 Z';
  const a = new fabric.Path(arrowPath, {
    left: cx - 55, top: cy - 20,
    fill: '#38BDF8', stroke: '#38BDF8', strokeWidth: 1,
    selectable: true,
  });
  canvas.add(a);
  canvas.setActiveObject(a);
  canvas.renderAll();
  updateLayersList();
  toast('Стрелка-указатель добавлена');
}

function addStar() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  // Пятиконечная звезда
  const starPath = 'M 50 0 L 63 35 L 100 35 L 70 57 L 82 91 L 50 70 L 18 91 L 30 57 L 0 35 L 37 35 Z';
  const s = new fabric.Path(starPath, {
    left: cx - 45, top: cy - 45, scaleX: 0.9, scaleY: 0.9,
    fill: '#FBBF24', stroke: '#FBBF24', strokeWidth: 1,
    selectable: true,
  });
  canvas.add(s);
  canvas.setActiveObject(s);
  canvas.renderAll();
  updateLayersList();
  toast('Звезда добавлена');
}

function addFrame() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const f = new fabric.Rect({
    left: cx - 210, top: cy - 140, width: 420, height: 280,
    fill: 'transparent', stroke: '#38BDF8', strokeWidth: 3,
    rx: 8, ry: 8, selectable: true,
  });
  canvas.add(f);
  canvas.setActiveObject(f);
  canvas.renderAll();
  updateLayersList();
  toast('Рамка добавлена');
}

function addPhoto(file) {
  if (!canvas || !file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    fabric.Image.fromURL(ev.target.result, img => {
      const maxW = currentSize.w * 0.7;
      const maxH = currentSize.h * 0.7;
      if (img.width > maxW)             img.scaleToWidth(maxW);
      if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);
      img.set({
        left: (currentSize.w - img.getScaledWidth()) / 2,
        top:  (currentSize.h - img.getScaledHeight()) / 2,
        selectable: true,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      updateLayersList();
      toast('Фото добавлено');
    });
  };
  reader.readAsDataURL(file);
}

function addCosmoMascot(filename) {
  if (!canvas || !filename) return;
  const path = `../assets/images/mascot/${filename}`;
  fabric.Image.fromURL(path, img => {
    const targetH = Math.min(currentSize.h * 0.35, 230);
    img.scaleToHeight(targetH);
    img.set({
      left: (currentSize.w - img.getScaledWidth()) / 2,
      top:  (currentSize.h - img.getScaledHeight()) / 2,
      selectable: true,
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    updateLayersList();
    toast('Космо добавлен на афишу! 🤖');
  }, {
    crossOrigin: 'anonymous'
  });
}

/* ── QR-код: нормализация ссылок и UTF-8 ──────────────────────── */
function normalizeQrText(str) {
  let val = (str || '').trim();
  if (!val) return 'https://biblioteka33.ru';
  // Если введен домен или vk.com без протокола — добавляем https://
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(val) || /^vk\.com\/.+/i.test(val)) {
    val = 'https://' + val;
  }
  return val;
}

function toUtf8(str) {
  try {
    return unescape(encodeURIComponent(str));
  } catch (e) {
    return str;
  }
}

function generateQrDataUrl(text, size = 320) {
  return new Promise((resolve, reject) => {
    if (typeof QRCode === 'undefined') {
      reject(new Error('Библиотека QRCode не загружена'));
      return;
    }

    const clean = normalizeQrText(text);
    const utf8Text = toUtf8(clean);

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.visibility = 'hidden';
    document.body.appendChild(tempDiv);

    try {
      const qrInnerSize = Math.max(size - 32, 120);
      new QRCode(tempDiv, {
        text: utf8Text,
        width: qrInnerSize,
        height: qrInnerSize,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });

      let attempts = 0;
      const pollTimer = setInterval(() => {
        attempts++;
        const rawCanvas = tempDiv.querySelector('canvas');
        const rawImg = tempDiv.querySelector('img');

        let source = null;
        if (rawCanvas && rawCanvas.width > 0) {
          source = rawCanvas;
        } else if (rawImg && rawImg.complete && rawImg.naturalWidth > 0) {
          source = rawImg;
        }

        if (source) {
          clearInterval(pollTimer);
          try {
            // Рисуем на холсте с обязательной белой рамкой (Quiet Zone 16px)
            // Это гарантирует считывание QR-кода камерой на любых фонах
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = size;
            finalCanvas.height = size;
            const ctx = finalCanvas.getContext('2d');

            // Белая подложка (тихая зона)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            const pad = 16;
            ctx.drawImage(source, pad, pad, size - pad * 2, size - pad * 2);

            const dataUrl = finalCanvas.toDataURL('image/png');
            tempDiv.remove();
            resolve(dataUrl);
          } catch (err) {
            tempDiv.remove();
            reject(err);
          }
          return;
        }

        if (attempts > 25) {
          clearInterval(pollTimer);
          tempDiv.remove();
          reject(new Error('Таймаут генерации QR-кода'));
        }
      }, 40);

    } catch (err) {
      tempDiv.remove();
      reject(err);
    }
  });
}

let qrDebounceTimer = null;
async function renderQrModalPreview(text) {
  const target = $('#qr-render-target');
  if (!target) return;
  try {
    const url = await generateQrDataUrl(text || 'https://biblioteka33.ru', 160);
    target.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '140px';
    img.style.height = '140px';
    img.style.display = 'block';
    img.style.borderRadius = '4px';
    target.appendChild(img);
  } catch (e) {
    target.innerHTML = '<span style="color:#EF4444;font-size:11px;padding:10px;text-align:center">Ошибка генерации QR</span>';
  }
}

async function addQrCodeToCanvas() {
  const input = $('#qr-input-text');
  const text = input ? input.value.trim() : 'https://biblioteka33.ru';
  closeQrModal();
  toast('Создаю QR-код…');
  try {
    const dataUrl = await generateQrDataUrl(text, 400);
    fabric.Image.fromURL(dataUrl, img => {
      const targetSize = Math.min(currentSize.w * 0.28, 160);
      img.scaleToWidth(targetSize);
      img.set({
        left: (currentSize.w - img.getScaledWidth()) / 2,
        top:  (currentSize.h - img.getScaledHeight()) / 2,
        selectable: true,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      updateLayersList();
      saveHistory();
      toast('QR-код добавлен на афишу 📱');
    });
  } catch (e) {
    toast('Ошибка создания QR-кода');
  }
}

/* ══════════════════════════════════════════════════════════════
   ПАНЕЛЬ СВОЙСТВ
   ══════════════════════════════════════════════════════════════ */
function clearProps() {
  $('#props-empty').classList.remove('hidden');
  $('#props-text').classList.add('hidden');
  $('#props-shape').classList.add('hidden');
  $('#props-common').classList.add('hidden');
  updateLayersList();
}

function onSelection() {
  const obj = canvas?.getActiveObject();
  if (!obj) { clearProps(); return; }

  $('#props-empty').classList.add('hidden');
  $('#props-common').classList.remove('hidden');

  const isText  = ['textbox','text','i-text'].includes(obj.type);
  const isShape = ['rect','circle','ellipse','line','polyline','polygon','path'].includes(obj.type);

  $('#props-text') .classList.toggle('hidden', !isText);
  $('#props-shape').classList.toggle('hidden', !isShape);

  if (isText) {
    $('#font-size-slider').value = Math.round(obj.fontSize || 36);
    $('#font-size-val').textContent = Math.round(obj.fontSize || 36);
    if (obj.fontFamily) {
      $('#font-family-select').value = obj.fontFamily;
    }
    syncToggle('btn-bold',      obj.fontWeight === 'bold');
    syncToggle('btn-italic',    obj.fontStyle  === 'italic');
    syncToggle('btn-underline', !!obj.underline);
    ['left','center','right'].forEach(a => syncToggle('btn-align-'+a, obj.textAlign === a));
    syncSwatches('#text-color-row', obj.fill);
    if (obj.fill?.startsWith?.('#')) $('#text-color-picker').value = obj.fill;
  }

  if (isShape) {
    const op = Math.round((obj.opacity || 1) * 100);
    $('#opacity-slider').value = op; $('#opacity-val').textContent = op;
    $('#stroke-width-slider').value = obj.strokeWidth || 0;
    $('#stroke-width-val').textContent = obj.strokeWidth || 0;
    syncSwatches('#fill-color-row', obj.fill);
    syncSwatches('#stroke-color-row', obj.stroke || 'transparent');
    if (obj.fill?.startsWith?.('#'))   $('#fill-color-picker').value   = obj.fill;
    if (obj.stroke?.startsWith?.('#')) $('#stroke-color-picker').value = obj.stroke;
  }

  updateLayersList();
}

function syncToggle(id, active) { $('#'+id)?.classList.toggle('is-active', !!active); }
function syncSwatches(sel, color) {
  $$(sel + ' .cswatch').forEach(s => s.classList.toggle('is-active', s.dataset.color === color));
}

/* ══════════════════════════════════════════════════════════════
   СЛОИ
   ══════════════════════════════════════════════════════════════ */
const LAYER_ICONS = {
  textbox: 'title', text: 'title', 'i-text': 'title',
  rect: 'rectangle', circle: 'circle', ellipse: 'circle',
  line: 'horizontal_rule', image: 'image',
  group: 'folder', polyline: 'polyline', path: 'gesture',
};

function getObjLabel(obj, idx) {
  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
    const txt = (obj.text || '').replace(/\n/g, ' ').trim();
    return txt.length > 24 ? txt.slice(0, 24) + '…' : txt || 'Текст';
  }
  if (obj.type === 'image') return 'Изображение / QR';
  const map = { rect:'Прямоугольник / Рамка', circle:'Круг', ellipse:'Эллипс', line:'Линия', group:'Группа', path:'Фигура / Звезда' };
  return map[obj.type] || obj.type;
}

function renderLayerThumb(obj) {
  if (obj.type === 'image') {
    const src = obj._element?.src || (typeof obj.getSrc === 'function' ? obj.getSrc() : null);
    if (src) {
      return `<div class="layer-thumb" title="Изображение">
        <img class="layer-thumb-img" src="${src}" alt="" loading="lazy">
      </div>`;
    }
    return `<div class="layer-thumb"><span class="material-symbols-rounded">image</span></div>`;
  }

  const icon = LAYER_ICONS[obj.type] || 'layers';
  let color = 'var(--text-3)';

  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
    color = (obj.fill && obj.fill !== 'transparent') ? obj.fill : 'var(--text-1)';
    return `<div class="layer-thumb" style="background:rgba(255,255,255,0.04)" title="Текст">
      <span class="material-symbols-rounded" style="color:${color}">title</span>
    </div>`;
  }

  if (obj.fill && obj.fill !== 'transparent') {
    color = obj.fill;
  } else if (obj.stroke && obj.stroke !== 'transparent') {
    color = obj.stroke;
  }
  return `<div class="layer-thumb" style="background:rgba(255,255,255,0.04)">
    <span class="material-symbols-rounded" style="color:${color}">${icon}</span>
  </div>`;
}

function updateLayersList() {
  const list = $('#layers-list');
  if (!list || !canvas) return;

  const objs = canvas.getObjects();
  if (!objs.length) {
    list.innerHTML = '<div class="layers-empty">Холст пуст.<br>Добавьте текст или фигуру.</div>';
    return;
  }

  const activeObj = canvas.getActiveObject();

  // Рисуем в порядке: верхний слой сверху
  list.innerHTML = [...objs].reverse().map((obj, revIdx) => {
    const realIdx = objs.length - 1 - revIdx;
    const isActive  = obj === activeObj;
    const isHidden  = obj.visible === false;
    const isLocked  = !obj.selectable;
    const label = getObjLabel(obj, realIdx);

    return `
    <div class="layer-row ${isActive?'is-active':''} ${isHidden?'is-hidden':''} ${isLocked?'is-locked':''}"
         data-idx="${realIdx}" draggable="true">
      <span class="material-symbols-rounded layer-drag-handle" title="Перетащите для изменения порядка слоя">drag_indicator</span>
      ${renderLayerThumb(obj)}
      <div class="layer-name" title="${label}">${label}</div>
      <div class="layer-order-btns">
        <button class="layer-order-btn" data-action="up" data-idx="${realIdx}" title="Поднять на уровень выше">
          <span class="material-symbols-rounded">keyboard_arrow_up</span>
        </button>
        <button class="layer-order-btn" data-action="down" data-idx="${realIdx}" title="Опустить на уровень ниже">
          <span class="material-symbols-rounded">keyboard_arrow_down</span>
        </button>
      </div>
      <div class="layer-actions">
        <button class="layer-action-btn ${isHidden?'is-off':''}" data-action="vis" data-idx="${realIdx}"
          title="${isHidden?'Показать слой':'Скрыть слой'}">
          <span class="material-symbols-rounded">${isHidden?'visibility_off':'visibility'}</span>
        </button>
        <button class="layer-action-btn ${isLocked?'is-off':''}" data-action="lock" data-idx="${realIdx}"
          title="${isLocked?'Разблокировать':'Заблокировать'}">
          <span class="material-symbols-rounded">${isLocked?'lock':'lock_open'}</span>
        </button>
        <button class="layer-action-btn" data-action="del" data-idx="${realIdx}" title="Удалить слой">
          <span class="material-symbols-rounded" style="color:#EF4444">delete</span>
        </button>
      </div>
    </div>`;
  }).join('');

  const rows = list.querySelectorAll('.layer-row');

  /* Клик для выделения */
  rows.forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const idx = +row.dataset.idx;
      const obj = canvas.getObjects()[idx];
      if (obj && obj.selectable) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        onSelection();
      }
    });
  });

  /* ── Drag and Drop перетаскивание слоёв ── */
  let draggedRowIdx = null;

  rows.forEach(row => {
    row.addEventListener('dragstart', e => {
      draggedRowIdx = +row.dataset.idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedRowIdx);
      row.classList.add('is-dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
      draggedRowIdx = null;
    });

    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      if (relY < rect.height / 2) {
        row.classList.add('drag-over-top');
        row.classList.remove('drag-over-bottom');
      } else {
        row.classList.add('drag-over-bottom');
        row.classList.remove('drag-over-top');
      }
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    row.addEventListener('drop', e => {
      e.preventDefault();
      const isTopHalf = row.classList.contains('drag-over-top');
      row.classList.remove('drag-over-top', 'drag-over-bottom');

      const targetIdx = +row.dataset.idx;
      if (draggedRowIdx === null || draggedRowIdx === targetIdx) return;

      const currentObjs = canvas.getObjects();
      const draggedObj = currentObjs[draggedRowIdx];
      const targetObj = currentObjs[targetIdx];
      if (!draggedObj || !targetObj) return;

      // Работаем с визуальным порядком (сверху вниз)
      const visualList = [...currentObjs].reverse();
      const fromPos = visualList.indexOf(draggedObj);
      if (fromPos === -1) return;

      visualList.splice(fromPos, 1);
      const toPos = visualList.indexOf(targetObj);
      const insertPos = isTopHalf ? toPos : toPos + 1;
      visualList.splice(insertPos, 0, draggedObj);

      // Применяем новый порядок z-индексов к canvas (снизу вверх)
      const newCanvasOrder = [...visualList].reverse();
      newCanvasOrder.forEach((item, zIdx) => {
        canvas.moveTo(item, zIdx);
      });

      canvas.renderAll();
      saveHistory();
      updateLayersList();
      toast('Слой перемещён');
    });
  });

  /* Кнопки быстрых действий со слоями */
  list.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      const obj = canvas.getObjects()[idx];
      if (!obj) return;

      switch(btn.dataset.action) {
        case 'vis':
          obj.set('visible', !obj.visible);
          canvas.renderAll(); updateLayersList(); break;

        case 'lock':
          obj.set({ selectable: !obj.selectable, evented: !obj.evented });
          if (!obj.selectable && canvas.getActiveObject() === obj) {
            canvas.discardActiveObject(); clearProps();
          }
          canvas.renderAll(); updateLayersList(); break;

        case 'del':
          if (confirm('Удалить этот слой?')) {
            canvas.remove(obj);
            canvas.discardActiveObject();
            canvas.renderAll();
            clearProps();
          }
          break;

        case 'up':
          if (idx < canvas.getObjects().length - 1) {
            obj.bringForward(); canvas.renderAll(); saveHistory(); updateLayersList();
          }
          break;

        case 'down':
          if (idx > 0) {
            obj.sendBackwards(); canvas.renderAll(); saveHistory(); updateLayersList();
          }
          break;
      }
    });
  });
}


/* ══════════════════════════════════════════════════════════════
   ИСТОРИЯ (UNDO/REDO)
   ══════════════════════════════════════════════════════════════ */
function saveHistory() {
  if (savingHistory || !canvas) return;
  savingHistory = true;
  if (historyIdx < history.length - 1) history = history.slice(0, historyIdx + 1);
  history.push(JSON.stringify(canvas.toJSON(['selectable','hasControls','editable','visible','evented'])));
  if (history.length > MAX_HISTORY) history.shift();
  historyIdx = history.length - 1;
  updateHistoryBtns();
  savingHistory = false;
}

function undo() { if (!canvas || historyIdx <= 0) return; historyIdx--; restoreHistory(); }
function redo() { if (!canvas || historyIdx >= history.length-1) return; historyIdx++; restoreHistory(); }

function restoreHistory() {
  if (!history[historyIdx]) return;
  savingHistory = true;
  canvas.loadFromJSON(history[historyIdx], () => {
    canvas.renderAll();
    savingHistory = false;
    updateHistoryBtns();
    clearProps();
    updateLayersList();
  });
}

function updateHistoryBtns() {
  $('#btn-undo').disabled = historyIdx <= 0;
  $('#btn-redo').disabled = historyIdx >= history.length - 1;
}

/* ══════════════════════════════════════════════════════════════
   МАСШТАБ
   ══════════════════════════════════════════════════════════════ */
function applyZoom(z) {
  if (!canvas) return;
  zoom = Math.min(Math.max(z, 0.08), 4.0);
  canvas.setZoom(zoom);
  canvas.setWidth(currentSize.w * zoom);
  canvas.setHeight(currentSize.h * zoom);
  $('#zoom-label').textContent = Math.round(zoom * 100) + '%';
}

function fitZoom() {
  const wrap = $('#canvas-area');
  if (!wrap || !currentSize) return;
  const pw = wrap.clientWidth - 56;
  const ph = wrap.clientHeight - 56;
  applyZoom(Math.min(pw / currentSize.w, ph / currentSize.h, 1.0));
}

/* ══════════════════════════════════════════════════════════════
   ЭКСПОРТ
   ══════════════════════════════════════════════════════════════ */
function exportPng() {
  if (!canvas) return;
  const saved = zoom;
  applyZoom(1); canvas.discardActiveObject(); canvas.renderAll();
  const url = canvas.toDataURL({ format:'png', quality:1, multiplier:2 });
  const a = document.createElement('a');
  a.href = url; a.download = ($('#poster-title').value || 'Афиша') + '.png'; a.click();
  applyZoom(saved);
  toast('PNG сохранён в папку «Загрузки»');
}

function exportPdf() {
  if (!canvas || !window.jspdf) { toast('PDF модуль загружается…'); return; }
  const { jsPDF } = window.jspdf;
  const saved = zoom;
  applyZoom(1); canvas.discardActiveObject(); canvas.renderAll();
  const url = canvas.toDataURL({ format:'png', quality:1 });
  const isH = currentSize.w > currentSize.h;
  const pdf = new jsPDF({ orientation: isH?'landscape':'portrait', unit:'pt', format:[currentSize.w, currentSize.h] });
  pdf.addImage(url, 'PNG', 0, 0, currentSize.w, currentSize.h);
  pdf.save(($('#poster-title').value || 'Афиша') + '.pdf');
  applyZoom(saved);
  toast('PDF готов к печати');
}

/* ══════════════════════════════════════════════════════════════
   АВТОСОХРАНЕНИЕ
   ══════════════════════════════════════════════════════════════ */
let autosaveT = null;
function startAutosave() {
  clearInterval(autosaveT);
  autosaveT = setInterval(() => {
    if (!canvas) return;
    try {
      localStorage.setItem('aurora_poster_v2', JSON.stringify({
        canvas: canvas.toJSON(['selectable','hasControls','editable','visible','evented']),
        title: $('#poster-title').value,
        size: Object.entries(SIZES).find(([,v])=>v===currentSize)?.[0] || 'a4_v',
        at: Date.now(),
      }));
    } catch(e) {}
  }, 30000);
}

function manualSave() {
  if (!canvas) return;
  try {
    localStorage.setItem('aurora_poster_v2', JSON.stringify({
      canvas: canvas.toJSON(['selectable','hasControls','editable','visible','evented']),
      title: $('#poster-title').value,
      size: Object.entries(SIZES).find(([,v])=>v===currentSize)?.[0] || 'a4_v',
      at: Date.now(),
    }));
    toast('Черновик сохранён');
  } catch(e) { toast('Ошибка сохранения'); }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem('aurora_poster_v2');
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d?.canvas) return false;
    const dt = new Date(d.at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    if (!confirm(`Найден черновик (${dt}). Восстановить?`)) return false;
    currentSize = SIZES[d.size] || SIZES.a4_v;
    $('#screen-templates').classList.add('hidden');
    $('#screen-editor').classList.remove('hidden');
    initCanvas(currentSize.w, currentSize.h);
    canvas.loadFromJSON(d.canvas, () => {
      canvas.renderAll(); fitZoom(); saveHistory(); updateLayersList();
    });
    if (d.title) $('#poster-title').value = d.title;
    startAutosave();
    return true;
  } catch(e) { return false; }
}

/* ══════════════════════════════════════════════════════════════
   ТОСТ
   ══════════════════════════════════════════════════════════════ */
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}

/* ══════════════════════════════════════════════════════════════
   МОДАЛКИ
   ══════════════════════════════════════════════════════════════ */
function openLogoModal()   { $('#logo-modal-overlay')?.classList.remove('hidden'); }
function closeLogoModal()  { $('#logo-modal-overlay')?.classList.add('hidden'); }

function openCosmoModal()  { $('#cosmo-modal-overlay')?.classList.remove('hidden'); }
function closeCosmoModal() { $('#cosmo-modal-overlay')?.classList.add('hidden'); }

function openQrModal() {
  $('#qrcode-modal-overlay')?.classList.remove('hidden');
  renderQrModalPreview($('#qr-input-text')?.value);
}
function closeQrModal() { $('#qrcode-modal-overlay')?.classList.add('hidden'); }

/* ══════════════════════════════════════════════════════════════
   ПРИВЯЗКА СОБЫТИЙ
   ══════════════════════════════════════════════════════════════ */
function bindEvents() {

  /* Навигация */
  $('#btn-back').addEventListener('click', () => {
    if (!confirm('Вернуться к шаблонам? Несохранённые изменения будут потеряны.')) return;
    $('#screen-editor').classList.add('hidden');
    $('#screen-templates').classList.remove('hidden');
    clearInterval(autosaveT);
    canvas?.dispose(); canvas = null;
    history = []; historyIdx = -1;
  });

  /* Мобильная панель */
  $('#btn-toggle-panel')?.addEventListener('click', () => {
    const panel = $('#ed-panel');
    if (panel) {
      panel.classList.toggle('is-mobile-open');
    }
  });

  /* История */
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
      const el = document.activeElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;
      const obj = canvas.getActiveObject();
      if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); clearProps(); }
    }
  });

  /* Экспорт */
  $('#btn-save').addEventListener('click', manualSave);
  $('#btn-export-png').addEventListener('click', exportPng);
  $('#btn-export-pdf').addEventListener('click', exportPdf);

  /* Инструменты текста */
  $('#tool-heading')   ?.addEventListener('click', () => addText('Заголовок', { fontSize:48, fontFamily:'Unbounded', fontWeight:'bold' }));
  $('#tool-subheading')?.addEventListener('click', () => addText('Подзаголовок', { fontSize:28, fontFamily:'Montserrat', fontWeight:'600' }));
  $('#tool-text')      ?.addEventListener('click', () => addText('Основной текст объявления или афиши', { fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8' }));
  $('#tool-badge')     ?.addEventListener('click', addBadge);
  $('#tool-date')      ?.addEventListener('click', addDateBlock);
  $('#tool-quote')     ?.addEventListener('click', addQuote);

  /* Инструменты фигур и разметки */
  $('#tool-rect')   ?.addEventListener('click', addRect);
  $('#tool-circle') ?.addEventListener('click', addCircle);
  $('#tool-line')   ?.addEventListener('click', addLine);
  $('#tool-dashed') ?.addEventListener('click', addDashedLine);
  $('#tool-arrow')  ?.addEventListener('click', addArrow);
  $('#tool-star')   ?.addEventListener('click', addStar);
  $('#tool-frame')  ?.addEventListener('click', addFrame);

  /* Графика и библиотека */
  $('#tool-photo') ?.addEventListener('click', () => $('#photo-input').click());
  $('#photo-input')?.addEventListener('change', e => { addPhoto(e.target.files?.[0]); e.target.value=''; });
  $('#tool-cosmo') ?.addEventListener('click', openCosmoModal);
  $('#tool-logo')  ?.addEventListener('click', openLogoModal);
  $('#tool-qrcode')?.addEventListener('click', openQrModal);

  /* Фоновые градиенты */
  $$('.bg-grad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!canvas) return;
      const g = GRADIENTS[btn.dataset.gradient];
      if (!g) return;
      const stops = g.stops[0].map((c, i, arr) => ({ offset: i / Math.max(arr.length-1, 1), color: c }));
      canvas.setBackgroundColor(new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1:0, y1:0, x2: g.x2 ? currentSize.w : 0, y2: currentSize.h },
        colorStops: stops,
      }), canvas.renderAll.bind(canvas));
      saveHistory();
    });
  });

  /* Масштаб */
  $('#btn-zoom-in') .addEventListener('click', () => applyZoom(zoom + 0.1));
  $('#btn-zoom-out').addEventListener('click', () => applyZoom(zoom - 0.1));
  $('#btn-zoom-fit').addEventListener('click', fitZoom);

  /* Панельные табы */
  $$('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.panel-tab').forEach(t => t.classList.remove('is-active'));
      $$('.tab-content').forEach(t => t.classList.add('hidden'));
      tab.classList.add('is-active');
      $('#tab-' + tab.dataset.tab).classList.remove('hidden');
      if (tab.dataset.tab === 'layers') updateLayersList();
    });
  });

  $('#btn-layers-refresh').addEventListener('click', updateLayersList);

  /* ── Свойства текста ── */
  $('#font-size-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); const v = +e.target.value;
    $('#font-size-val').textContent = v;
    if (obj) { obj.set('fontSize', v); canvas.renderAll(); }
  });
  $('#font-size-slider').addEventListener('change', () => saveHistory());

  $('#font-family-select').addEventListener('change', e => {
    setFontFamily(e.target.value);
  });

  ['bold','italic','underline'].forEach(style => {
    $('#btn-'+style).addEventListener('click', () => {
      const obj = canvas?.getActiveObject(); if (!obj) return;
      if (style === 'bold')      obj.set('fontWeight', obj.fontWeight==='bold' ? 'normal' : 'bold');
      if (style === 'italic')    obj.set('fontStyle',  obj.fontStyle==='italic' ? 'normal' : 'italic');
      if (style === 'underline') obj.set('underline', !obj.underline);
      canvas.renderAll(); saveHistory();
      syncToggle('btn-'+style, style==='bold'?obj.fontWeight==='bold':style==='italic'?obj.fontStyle==='italic':obj.underline);
    });
  });

  ['left','center','right'].forEach(a => {
    $('#btn-align-'+a).addEventListener('click', () => {
      const obj = canvas?.getActiveObject(); if (!obj) return;
      obj.set('textAlign', a); canvas.renderAll(); saveHistory();
      ['left','center','right'].forEach(x => syncToggle('btn-align-'+x, x===a));
    });
  });

  $('#text-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (obj) { obj.set('fill', e.target.value); canvas.renderAll(); }
  });
  $('#text-color-picker').addEventListener('change', () => saveHistory());

  /* ── Свойства фигур ── */
  $('#opacity-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); const v = +e.target.value;
    $('#opacity-val').textContent = v;
    if (obj) { obj.set('opacity', v/100); canvas.renderAll(); }
  });
  $('#opacity-slider').addEventListener('change', () => saveHistory());

  $('#stroke-width-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); const v = +e.target.value;
    $('#stroke-width-val').textContent = v;
    if (obj) { obj.set('strokeWidth', v); canvas.renderAll(); }
  });
  $('#stroke-width-slider').addEventListener('change', () => saveHistory());

  $('#fill-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (obj) { obj.set('fill', e.target.value); canvas.renderAll(); }
  });
  $('#fill-color-picker').addEventListener('change', () => saveHistory());

  $('#stroke-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (obj) { obj.set('stroke', e.target.value); canvas.renderAll(); }
  });
  $('#stroke-color-picker').addEventListener('change', () => saveHistory());

  /* ── Общие ── */
  $('#btn-center-h').addEventListener('click', () => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    obj.set('left', (currentSize.w - obj.getScaledWidth()) / 2);
    obj.setCoords(); canvas.renderAll(); saveHistory();
  });
  $('#btn-center-v').addEventListener('click', () => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    obj.set('top', (currentSize.h - obj.getScaledHeight()) / 2);
    obj.setCoords(); canvas.renderAll(); saveHistory();
  });
  $('#btn-bring-front').addEventListener('click', () => {
    canvas?.getActiveObject()?.bringToFront(); canvas.renderAll(); saveHistory(); updateLayersList();
  });
  $('#btn-send-back').addEventListener('click', () => {
    canvas?.getActiveObject()?.sendToBack(); canvas.renderAll(); saveHistory(); updateLayersList();
  });
  $('#btn-delete-obj').addEventListener('click', () => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    if (!confirm('Удалить этот объект?')) return;
    canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); clearProps();
  });

  /* Модалка логотипов */
  $('#logo-modal-close')?.addEventListener('click', closeLogoModal);
  $('#logo-modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeLogoModal(); });

  /* Модалка Космо */
  $('#cosmo-modal-close')?.addEventListener('click', closeCosmoModal);
  $('#cosmo-modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCosmoModal(); });

  /* Модалка QR-кода */
  $('#qrcode-modal-close')?.addEventListener('click', closeQrModal);
  $('#qrcode-modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeQrModal(); });
  $('#qr-input-text')?.addEventListener('input', e => {
    clearTimeout(qrDebounceTimer);
    qrDebounceTimer = setTimeout(() => {
      renderQrModalPreview(e.target.value);
    }, 150);
  });
  $$('.qr-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = $('#qr-input-text');
      if (input) {
        input.value = chip.dataset.qr;
        renderQrModalPreview(chip.dataset.qr);
      }
    });
  });
  $('#btn-add-qr-to-canvas')?.addEventListener('click', addQrCodeToCanvas);

  /* Resize */
  window.addEventListener('resize', fitZoom);
}

/* ══════════════════════════════════════════════════════════════
   СТАРТ
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildFontSelect();
  buildTemplates();
  buildLogos();
  buildCosmoGrid();
  buildBgPalette();
  buildColorRows();
  bindEvents();

  if (!loadDraft()) {
    toast('Выберите шаблон для начала работы');
  }
});
