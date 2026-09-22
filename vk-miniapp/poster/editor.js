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
  story:  { w: 540,  h: 960,  name: 'Сторис 9:16' },
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
  { hex: '#070a1e', name: 'Космос Авроры' },
  { hex: '#0f172a', name: 'Ночной сланец' },
  { hex: '#121016', name: 'Тёмный бархат' },
  { hex: '#1e1145', name: 'Глубокий индиго' },
  { hex: '#0b1329', name: 'Сапфир' },
  { hex: '#064e3b', name: 'Изумрудный' },
  { hex: '#3b0764', name: 'Фиолетовый' },
  { hex: '#450a0a', name: 'Бордовый' },
  { hex: '#ffffff', name: 'Белый', light: true },
  { hex: '#f8fafc', name: 'Светло-серый', light: true },
  { hex: '#fffbeb', name: 'Кремовый крафт', light: true },
  { hex: '#f0fdf4', name: 'Мятный светлый', light: true },
];

const TEXT_COLORS = [
  '#ffffff','#0f172a','#38BDF8','#8A6CFF','#FBBF24','#F472B6','#10B981','#EF4444',
];
const SHAPE_COLORS = [
  'transparent','#ffffff','#0f172a','#38BDF8','#8A6CFF','#FBBF24','#F472B6','#10B981',
];

const GRADIENTS = {
  aurora:  { x1:0, y1:0, x2:0, stops:[['#06091a','#131726','#1a1c4e','#090b20']] },
  space:   { x1:0, y1:0, x2:1, stops:[['#050814','#0c122c','#1e1035','#070b1a']] },
  ocean:   { x1:0, y1:0, x2:0, stops:[['#0c4a6e','#0369a1','#0ea5e9']] },
  sunset:  { x1:0, y1:0, x2:1, stops:[['#7c3aed','#db2777','#f97316']] },
  neon:    { x1:0, y1:0, x2:1, stops:[['#180033','#2e0854','#06b6d4']] },
  forest:  { x1:0, y1:0, x2:0, stops:[['#064e3b','#047857','#10b981']] },
  gold:    { x1:0, y1:0, x2:1, stops:[['#1c160c','#2d2013','#451a03']] },
  vintage: { x1:0, y1:0, x2:0, stops:[['#fdfbf7','#f5eedc','#e6d5b8']] },
};

/* ── Библиотечные плашки и стикеры ──────────────────────────── */
const STICKERS = [
  { id: 'pushkin',      label: 'Пушкинская карта',   text: 'ПУШКИНСКАЯ КАРТА',     bg: '#e11d48', color: '#ffffff', font: 'Unbounded', size: 14, desc: 'Оплата Пушкинской картой' },
  { id: 'free_entry',   label: 'Вход свободный',     text: '★ ВХОД СВОБОДНЫЙ',      bg: '#10B981', color: '#070a1e', font: 'Unbounded', size: 15, desc: 'Свободный вход для всех желающих' },
  { id: 'free',         label: 'Бесплатно',          text: 'БЕСПЛАТНО',             bg: '#059669', color: '#ffffff', font: 'Unbounded', size: 16, desc: 'Мероприятие без оплаты' },
  { id: 'age_0',        label: '0+ (Для всех)',      text: '0+',                    bg: '#10B981', color: '#ffffff', font: 'Unbounded', size: 20, desc: 'Для любого возраста' },
  { id: 'age_6',        label: '6+ (Для детей)',     text: '6+',                    bg: '#0284c7', color: '#ffffff', font: 'Unbounded', size: 20, desc: 'Для детей старше 6 лет' },
  { id: 'age_12',       label: '12+ (Подростки)',    text: '12+',                   bg: '#0d9488', color: '#ffffff', font: 'Unbounded', size: 20, desc: 'Для подростков от 12 лет' },
  { id: 'age_16',       label: '16+ (Молодёжь)',     text: '16+',                   bg: '#d97706', color: '#ffffff', font: 'Unbounded', size: 20, desc: 'Для аудитории от 16 лет' },
  { id: 'age_18',       label: '18+ (Взрослые)',     text: '18+',                   bg: '#dc2626', color: '#ffffff', font: 'Unbounded', size: 20, desc: 'Только для совершеннолетних' },
  { id: 'live',         label: 'Прямая трансляция',  text: '🔴 ПРЯМАЯ ТРАНСЛЯЦИЯ',   bg: '#ef4444', color: '#ffffff', font: 'Unbounded', size: 14, desc: 'Эфир онлайн в соцсетях' },
  { id: 'masterclass',  label: 'Мастер-класс',       text: '🎨 МАСТЕР-КЛАСС',       bg: '#8A6CFF', color: '#ffffff', font: 'Unbounded', size: 15, desc: 'Творческое практическое занятие' },
  { id: 'book_club',    label: 'Книжный клуб',       text: '📖 КНИЖНЫЙ КЛУБ',       bg: '#4f46e5', color: '#ffffff', font: 'Unbounded', size: 15, desc: 'Встреча любителей чтения' },
  { id: 'lectory',      label: 'Лекторий',           text: '🎙️ ЛЕКТОРИЙ',           bg: '#0284c7', color: '#ffffff', font: 'Unbounded', size: 15, desc: 'Лекция и дискуссия с экспертом' },
  { id: 'premiere',     label: 'Премьера / Новинка', text: '✨ ПРЕМЬЕРА',           bg: '#f59e0b', color: '#090d16', font: 'Unbounded', size: 15, desc: 'Новинка или премьерный показ' },
  { id: 'registration', label: 'По регистрации',     text: 'ВХОД ПО РЕГИСТРАЦИИ',   bg: '#2563eb', color: '#ffffff', font: 'Unbounded', size: 13, desc: 'Требуется предварительная запись' },
];

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
  /* 1. БИБЛИОНОЧЬ / КОСМИЧЕСКИЙ КВЕСТ */
  {
    id: 'biblionight_neon',
    size: 'a4_v',
    category: 'events',
    name: 'Библионочь / Космо-квест',
    desc: 'Аврора Неон, эффектный футуристичный стиль',
    fmt: 'A4',
    bg: '#070a1e',
    previewBg: '#070a1e',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">✦ ВСЕРОССИЙСКАЯ АКЦИЯ ✦</div>
          <div class="mp-title mp-glow" style="color:#ffffff; text-shadow:0 0 10px rgba(56,189,248,0.9); font-size:12px;">БИБЛИОНОЧЬ<br><span style="color:#38BDF8;">2025</span></div>
          <div class="mp-pill" style="border:1px solid #38BDF8; color:#38BDF8; background:rgba(56,189,248,0.15);">КОСМИЧЕСКИЙ КВЕСТ</div>
        </div>
        <div class="mp-box" style="border:1px solid rgba(192,132,252,0.4); background:rgba(19,23,38,0.9);">
          <div style="font-size:6.5px; color:#c084fc; font-weight:700;">ТАЙНЫ ВСЕЛЕННОЙ</div>
          <div style="font-size:5.5px; color:#94a3b8; line-height:1.25; margin-top:2px;">Квесты · Научное шоу · VR · Призы</div>
        </div>
        <div>
          <div class="mp-date" style="background:rgba(251,191,36,0.18); color:#FBBF24; border:1px solid #FBBF24;">26 АПРЕЛЯ · 18:00</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#10B981; color:#070a1e;">СВОБОДНЫЙ</span>
            <span class="mp-badge" style="background:#e11d48; color:#ffffff;">ПУШКИНСКАЯ</span>
            <span class="mp-badge" style="background:#38BDF8; color:#070a1e;">12+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'✦ ВСЕРОССИЙСКАЯ АКЦИЯ В БИБЛИОТЕКЕ ✦', left:297, top:45, width:520, fontSize:12, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:120 },
      { type:'rect', left:297, top:75, width:515, height:2, fill:'#38BDF8', originX:'center', shadow:'rgba(56,189,248,0.8) 0px 0px 12px' },
      { type:'text', text:'БИБЛИОНОЧЬ\n2025', left:297, top:105, width:520, fontSize:54, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.05, shadow:'rgba(56,189,248,0.85) 0px 0px 24px' },
      { type:'rect', left:297, top:235, width:460, height:38, rx:19, ry:19, fill:'rgba(56,189,248,0.12)', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'КОСМИЧЕСКИЙ КВЕСТ: ТАЙНЫ ВСЕЛЕННОЙ', left:297, top:225, width:440, fontSize:15, fontFamily:'Unbounded', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:425, width:515, height:270, rx:16, ry:16, fill:'rgba(19,23,38,0.85)', stroke:'rgba(138,108,255,0.4)', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'В ПРОГРАММЕ БОЛЬШОГО КВЕСТА:', left:297, top:315, width:460, fontSize:16, fontFamily:'Unbounded', fontWeight:'700', fill:'#c084fc', textAlign:'center', originX:'center' },
      { type:'text', text:'✦ Интерактивный квест по книжным лабиринтам и фондам\n✦ Научно-популярное шоу «Физика космоса»\n✦ Встреча с астрофизиком и VR-погружение к звёздам\n✦ Космический квиз с розыгрышем подарков\n✦ Лаундж-зона, настольные игры и чайная церемония', left:75, top:355, width:445, fontSize:14, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'left', lineHeight:1.7 },
      { type:'rect', left:297, top:610, width:420, height:50, rx:25, ry:25, fill:'rgba(251,191,36,0.15)', stroke:'#FBBF24', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'26 АПРЕЛЯ 2025  ·  18:00 – 23:00', left:297, top:598, width:400, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:165, top:665, width:170, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:350, top:665, width:190, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'12+', left:480, top:665, width:55, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#38BDF8', padding:7, textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:730, width:515, height:1, fill:'rgba(255,255,255,0.15)', originX:'center' },
      { type:'text', text:'Центральная городская библиотека «АВРОРА»\nг. Владимир, ул. Б. Московская, 12  ·  тел. 8 (4922) 32-34-56  ·  biblioteka33.ru', left:297, top:750, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 2. ЛИТЕРАТУРНАЯ ГОСТИНАЯ / КНИЖНЫЙ КЛУБ */
  {
    id: 'lit_salon_classic',
    size: 'a4_v',
    category: 'books',
    name: 'Литературная гостиная',
    desc: 'Изысканная классика с золотой рамкой и цитатой',
    fmt: 'A4',
    bg: '#121016',
    previewBg: '#121016',
    previewAccent: '#FBBF24',
    previewHtml: `
      <div class="mp-wrap" style="border:1px solid #FBBF24; padding:5px; box-sizing:border-box;">
        <div>
          <div class="mp-ornament" style="color:#FBBF24;">✦ ✦ ✦</div>
          <div class="mp-tag" style="color:#d1d5db;">ГОСТИНАЯ · 2025</div>
          <div class="mp-title" style="color:#fef3c7; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:13px; margin:2px 0;">Серебряный век:<br>Тайны и судьбы</div>
        </div>
        <div class="mp-quote" style="border-left:1.5px solid #FBBF24; padding-left:3px; color:#cbd5e1; margin:2px auto; max-width:90%;">«И мы сохраним тебя, русская речь...»</div>
        <div>
          <div class="mp-date" style="border:1px solid #FBBF24; color:#FBBF24; background:rgba(251,191,36,0.12); font-size:6.5px;">14 ОКТЯБРЯ · 18:30</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#10B981; color:#070a1e;">ВХОД СВОБОДНЫЙ</span>
            <span class="mp-badge" style="background:#FBBF24; color:#070a1e;">16+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'rect', left:297, top:421, width:545, height:792, fill:'transparent', stroke:'#FBBF24', strokeWidth:2, originX:'center', originY:'center' },
      { type:'rect', left:297, top:421, width:529, height:776, fill:'transparent', stroke:'rgba(251,191,36,0.4)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'✦   ✦   ✦', left:297, top:55, width:300, fontSize:16, fontFamily:'Montserrat', fill:'#FBBF24', textAlign:'center', originX:'center', charSpacing:150 },
      { type:'text', text:'БИБЛИОТЕЧНАЯ ГОСТИНАЯ  ·  СЕЗОН 2025', left:297, top:80, width:480, fontSize:13, fontFamily:'Montserrat', fontWeight:'600', fill:'#d1d5db', textAlign:'center', originX:'center', charSpacing:100 },
      { type:'rect', left:297, top:110, width:240, height:1.5, fill:'#FBBF24', originX:'center' },
      { type:'text', text:'Серебряный век:\nТайны, поэзия и судьбы', left:297, top:135, width:480, fontSize:44, fontFamily:'Cormorant Garamond', fontStyle:'italic', fontWeight:'bold', fill:'#fef3c7', textAlign:'center', originX:'center', lineHeight:1.15 },
      { type:'text', text:'Творческий вечер, посвящённый поэтам Серебряного века', left:297, top:255, width:460, fontSize:18, fontFamily:'Playfair Display', fill:'#cbd5e1', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:380, width:450, height:130, rx:8, ry:8, fill:'rgba(255,255,255,0.03)', stroke:'rgba(251,191,36,0.3)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'«И мы сохраним тебя, русская речь,\nВеликое русское слово.\nСвободным и чистым тебя пронесём,\nИ внукам дадим, и от плена спасём...»', left:297, top:330, width:420, fontSize:19, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#f1f5f9', textAlign:'center', originX:'center', lineHeight:1.45 },
      { type:'text', text:'— Анна Ахматова', left:297, top:418, width:300, fontSize:14, fontFamily:'Montserrat', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'В программе вечера:\n• Чтение шедевров поэзии под живую музыку\n• Редкие архивные фотографии и письма поэтов\n• Обсуждение за чашкой ароматного кофе', left:297, top:470, width:430, fontSize:16, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.7 },
      { type:'rect', left:297, top:615, width:430, height:65, rx:6, ry:6, fill:'rgba(251,191,36,0.1)', stroke:'#FBBF24', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'14 ОКТЯБРЯ в 18:30', left:297, top:595, width:400, fontSize:24, fontFamily:'Unbounded', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'Каминный зал Центральной городской библиотеки', left:297, top:628, width:400, fontSize:13, fontFamily:'Montserrat', fill:'#fef3c7', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:210, top:685, width:180, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'16+', left:375, top:685, width:60, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#FBBF24', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Ведущий вечера: филолог М. В. Соколова  ·  Запись по тел.: 8 (4922) 32-21-45\nг. Владимир  ·  biblioteka33.ru', left:297, top:745, width:480, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 3. ДЕТСКИЙ ПРАЗДНИК С РОБОТОМ КОСМО */
  {
    id: 'kids_cosmo_party',
    size: 'square',
    category: 'kids',
    name: 'Детский праздник с Космо',
    desc: 'Яркая праздничная афиша для детей с маскотом',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '#1e1145',
    previewBg: '#1e1145',
    previewAccent: '#ec4899',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-pill" style="background:#facc15; color:#1e1145; font-size:6.5px;">🎉 ДЕТСКИЙ ПРАЗДНИК</div>
          <div class="mp-title" style="color:#ffffff; font-size:11px; text-shadow:0 2px 8px rgba(236,72,153,0.8); margin:2px 0;">В ГОСТЯХ У КОСМО!</div>
        </div>
        <div style="font-size:20px; line-height:1; margin:2px 0;">🤖✨</div>
        <div class="mp-box" style="background:rgba(255,255,255,0.08); border:1px solid rgba(244,114,182,0.6); padding:2px;">
          <div style="font-size:6px; color:#fde047; font-weight:700;">КВЕСТ · ИГРЫ · МАСТЕР-КЛАСС</div>
          <div style="font-size:5.5px; color:#ffffff;">Сладкие призы и фотосессия</div>
        </div>
        <div>
          <div class="mp-date" style="background:#06b6d4; color:#0f172a; font-size:6.5px;">ВС · 12:00 · ДЕТСКИЙ ЗАЛ</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#34d399; color:#064e3b;">БЕСПЛАТНО</span>
            <span class="mp-badge" style="background:#ec4899; color:#ffffff;">0+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'🎉 БОЛЬШОЙ ДЕТСКИЙ ПРАЗДНИК 🎉', left:350, top:35, width:420, fontSize:15, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#1e1145', backgroundColor:'#facc15', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'В ГОСТЯХ\nУ РОБОТА КОСМО!', left:350, top:80, width:640, fontSize:48, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.1, shadow:'rgba(244,114,182,0.6) 0px 4px 20px' },
      { type:'circle', left:350, top:280, radius:75, fill:'rgba(56,189,248,0.2)', stroke:'#38BDF8', strokeWidth:3, originX:'center', originY:'center' },
      { type:'text', text:'🤖\nКОСМО\nЖДЁТ ТЕБЯ!', left:350, top:245, width:130, fontSize:15, fontFamily:'Unbounded', fontWeight:'bold', fill:'#fde047', textAlign:'center', originX:'center', lineHeight:1.2 },
      { type:'rect', left:350, top:435, width:600, height:140, rx:18, ry:18, fill:'rgba(255,255,255,0.07)', stroke:'rgba(244,114,182,0.5)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'⭐ Космический интерактивный квест и загадки\n⭐ Весёлые викторины с роботом Космо\n⭐ Творческий мастер-класс: мастерим ракету\n⭐ Сладкие призы, воздушные шары и фотосессия!', left:350, top:380, width:560, fontSize:17, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#f8fafc', textAlign:'center', originX:'center', lineHeight:1.6 },
      { type:'rect', left:350, top:545, width:480, height:48, rx:24, ry:24, fill:'#06b6d4', originX:'center', originY:'center' },
      { type:'text', text:'ВОСКРЕСЕНЬЕ, 12:00  ·  ДЕТСКИЙ ЗАЛ', left:350, top:533, width:460, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0f172a', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД БЕСПЛАТНЫЙ!', left:240, top:600, width:220, fontSize:15, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'ДЛЯ ДЕТЕЙ 5-10 ЛЕТ  ·  0+', left:475, top:600, width:210, fontSize:14, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#ec4899', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Центральная детская библиотека «АВРОРА»  ·  ул. Мира, 4  ·  тел. 8 (4922) 53-12-34', left:350, top:655, width:640, fontSize:13, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'center', originX:'center' },
    ],
  },

  /* 4. КНИГА МЕСЯЦА / РЕКОМЕНДАЦИЯ БИБЛИОТЕКАРЯ */
  {
    id: 'book_of_the_month',
    size: 'a4_v',
    category: 'books',
    name: 'Книга месяца',
    desc: 'Стильная журнальная обложка с аннотацией и рецензией',
    fmt: 'A4',
    bg: '#0c1222',
    previewBg: '#0c1222',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8; border-bottom:1px solid #38BDF8; padding-bottom:1px;">ВЫБОР БИБЛИОТЕКИ · СЕНТЯБРЬ</div>
          <div class="mp-title" style="color:#ffffff; font-size:11px; margin:3px 0 2px;">КНИГА МЕСЯЦА</div>
        </div>
        <div class="mp-book-preview" style="background:#1e293b; border:1px solid #FBBF24;">
          <span style="font-size:4.5px; color:#FBBF24; font-weight:700;">БЕСТСЕЛЛЕР</span>
          <span style="font-size:5.5px; color:#ffffff; font-weight:700; margin:1px 0;">Тайна книги</span>
          <span style="font-size:4px; color:#94a3b8;">А. Иванов</span>
        </div>
        <div>
          <div style="font-size:5.5px; color:#cbd5e1; font-style:italic;">«Захватывающий интеллектуальный детектив...»</div>
          <div class="mp-badge" style="background:#34d399; color:#064e3b; font-size:5.5px; margin-top:3px;">✓ В НАЛИЧИИ В ЦГБ</div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'ВЫБОР БИБЛИОТЕКИ  ·  ВЫПУСК № 9  ·  СЕНТЯБРЬ', left:297, top:42, width:510, fontSize:12, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:140 },
      { type:'rect', left:297, top:68, width:515, height:2, fill:'#38BDF8', originX:'center' },
      { type:'text', text:'КНИГА МЕСЯЦА', left:297, top:85, width:515, fontSize:48, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:275, width:200, height:270, rx:8, ry:8, fill:'#1e293b', stroke:'#FBBF24', strokeWidth:2.5, originX:'center', originY:'center', shadow:'rgba(0,0,0,0.6) 0px 10px 25px' },
      { type:'rect', left:205, top:275, width:14, height:270, fill:'rgba(251,191,36,0.3)', originX:'center', originY:'center' },
      { type:'text', text:'БЕСТСЕЛЛЕР\n\n«ТАЙНА\nСТАРОГО\nПЕРЕПЛЁТА»\n\nА. ИВАНОВ', left:297, top:190, width:170, fontSize:15, fontFamily:'Playfair Display', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center', lineHeight:1.4 },
      { type:'text', text:'«Тайна старого переплёта»', left:297, top:435, width:510, fontSize:28, fontFamily:'Playfair Display', fontStyle:'italic', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'text', text:'Алексей Иванов', left:297, top:480, width:400, fontSize:18, fontFamily:'Montserrat', fontWeight:'600', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:585, width:515, height:120, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'rgba(56,189,248,0.3)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'«Захватывающий интеллектуальный детектив о редких манускриптах и тайнах старинных библиотек. Книга держит в напряжении с первой до последней страницы. Настоящий литературный триумф года!»\n— Отдел редкой книги ЦГБ', left:297, top:538, width:480, fontSize:14, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.45 },
      { type:'text', text:'✓ В НАЛИЧИИ НА АБОНЕМЕНТЕ (3 ЭКЗ.)', left:297, top:670, width:380, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Бронируйте книгу в каталоге OPAC: biblioteka33.ru/catalog\nЖдём вас в Центральной городской библиотеке «АВРОРА»', left:297, top:740, width:500, fontSize:14, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 5. ВСТРЕЧА С ПИСАТЕЛЕМ / ЛЕКЦИЯ */
  {
    id: 'writer_meeting',
    size: 'a4_v',
    category: 'events',
    name: 'Встреча с писателем',
    desc: 'Солидный плакат с датой, временем и портретной рамкой',
    fmt: 'A4',
    bg: '#0b1329',
    previewBg: '#0b1329',
    previewAccent: '#fcd34d',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#fcd34d;">КУЛЬТУРНЫЙ ЛЕКТОРИЙ</div>
          <div class="mp-title" style="color:#ffffff; font-size:10px; margin:2px 0;">ВСТРЕЧА С ПИСАТЕЛЕМ</div>
        </div>
        <div class="mp-photo-frame" style="border:1px solid #fcd34d; background:#1e293b;">
          <span style="font-size:15px;">👤</span>
        </div>
        <div style="font-size:7px; color:#fcd34d; font-family:'Playfair Display',serif; font-weight:700;">Павел Басинский</div>
        <div>
          <div class="mp-date" style="background:#fcd34d; color:#0b1329; font-size:6.5px;">19 НОЯБРЯ · 18:00</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#e11d48; color:#ffffff;">ПУШКИНСКАЯ</span>
            <span class="mp-badge" style="background:#10B981; color:#070a1e;">СВОБОДНЫЙ</span>
            <span class="mp-badge" style="background:#6366f1; color:#ffffff;">16+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'КУЛЬТУРНЫЙ ЛЕКТОРИЙ  ✦  АВТОРСКИЙ ВЕЧЕР', left:297, top:42, width:460, fontSize:13, fontFamily:'Montserrat', fontWeight:'bold', fill:'#fcd34d', textAlign:'center', originX:'center', charSpacing:120 },
      { type:'text', text:'ВСТРЕЧА\nС ПИСАТЕЛЕМ', left:297, top:75, width:515, fontSize:44, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.1 },
      { type:'rect', left:297, top:285, width:210, height:240, rx:12, ry:12, fill:'#1e293b', stroke:'#fcd34d', strokeWidth:2.5, originX:'center', originY:'center', shadow:'rgba(0,0,0,0.5) 0px 8px 24px' },
      { type:'text', text:'[ МЕСТО ДЛЯ ФОТО\nАВТОРА ]', left:297, top:270, width:180, fontSize:13, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center', lineHeight:1.4 },
      { type:'text', text:'ПАВЕЛ БАСИНСКИЙ', left:297, top:430, width:515, fontSize:32, fontFamily:'Playfair Display', fontWeight:'bold', fill:'#fcd34d', textAlign:'center', originX:'center' },
      { type:'text', text:'Писатель, литературовед, биограф Л. Н. Толстого\nЛауреат национальной литературной премии «Большая книга»', left:297, top:480, width:490, fontSize:15, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'center', originX:'center', lineHeight:1.45 },
      { type:'rect', left:297, top:580, width:515, height:95, rx:10, ry:10, fill:'rgba(252,211,77,0.08)', stroke:'rgba(252,211,77,0.35)', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'Тема лекции: «Подлинная история Анны Карениной»\nПрезентация новой книги  ·  Ответы на вопросы  ·  Автограф-сессия', left:297, top:550, width:490, fontSize:15, fontFamily:'Cormorant Garamond', fontStyle:'italic', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text', text:'19 НОЯБРЯ  ·  18:00  ·  КОНФЕРЕНЦ-ЗАЛ ЦГБ', left:297, top:645, width:460, fontSize:17, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0b1329', backgroundColor:'#fcd34d', padding:10, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:190, top:710, width:190, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:375, top:710, width:170, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'16+', left:475, top:710, width:50, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#6366f1', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'г. Владимир, ул. Б. Московская, 12  ·  Количество мест ограничено\nБесплатная регистрация: biblioteka33.ru/events', left:297, top:760, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 6. ИНТЕЛЛЕКТУАЛЬНЫЙ КВИЗ / ИГРОТЕКА */
  {
    id: 'quiz_night_retro',
    size: 'square',
    category: 'events',
    name: 'Библио-Квиз / Игротека',
    desc: 'Ретро-игровой стиль для молодежи (Press Start 2P)',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '#14092b',
    previewBg: '#14092b',
    previewAccent: '#f43f5e',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div style="font-family:'Press Start 2P',monospace; font-size:5px; color:#facc15;">▶ LEVEL 1: READY ◀</div>
          <div class="mp-title" style="color:#ffffff; font-size:12px; text-shadow:0 0 8px #f43f5e; margin:2px 0;">БИБЛИО-КВИЗ</div>
          <div style="font-size:6px; color:#22d3ee; font-weight:700;">ИГРЫ · КНИГИ · КИНО</div>
        </div>
        <div class="mp-box" style="border:1px solid #f43f5e; background:rgba(244,63,94,0.12); padding:3px;">
          <div style="font-size:11px;">🎮 🏆 🎁</div>
          <div style="font-size:5.5px; color:#ffffff; font-weight:600;">6 раундов · команды 2-6 чел.</div>
        </div>
        <div>
          <div class="mp-date" style="background:#facc15; color:#14092b; font-size:6.5px;">ЧЕТВЕРГ · 19:00</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#34d399; color:#064e3b;">БЕСПЛАТНО</span>
            <span class="mp-badge" style="background:#f43f5e; color:#ffffff;">14+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'▶ LEVEL 1: READY?  INSERT COIN TO PLAY ◀', left:350, top:40, width:560, fontSize:13, fontFamily:'Press Start 2P', fill:'#facc15', textAlign:'center', originX:'center' },
      { type:'text', text:'БИБЛИО-КВИЗ', left:350, top:80, width:640, fontSize:52, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', shadow:'rgba(244,63,94,0.8) 0px 0px 24px' },
      { type:'text', text:'БИТВА ИНТЕЛЛЕКТОВ: КНИГИ, КИНО & ИГРЫ', left:350, top:160, width:600, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#22d3ee', textAlign:'center', originX:'center' },
      { type:'rect', left:350, top:330, width:620, height:210, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'#f43f5e', strokeWidth:2.5, originX:'center', originY:'center' },
      { type:'text', text:'ПРАВИЛА И ФИШКИ ИГРЫ:', left:350, top:245, width:540, fontSize:18, fontFamily:'Press Start 2P', fill:'#facc15', textAlign:'center', originX:'center' },
      { type:'text', text:'👾 Команды от 2 до 6 человек (или найдём команду на месте!)\n🏆 6 раундов по 10 каверзных вопросов на логику и кругозор\n🎁 Книжные подарки, настолки и призы от партнёров\n☕ Чай, печенье и уютная атмосфера молодёжного лофта', left:350, top:300, width:560, fontSize:16, fontFamily:'Montserrat', fontWeight:'500', fill:'#f8fafc', textAlign:'left', originX:'center', lineHeight:1.7 },
      { type:'rect', left:350, top:485, width:520, height:52, rx:26, ry:26, fill:'#facc15', originX:'center', originY:'center' },
      { type:'text', text:'КАЖДЫЙ ЧЕТВЕРГ В 19:00', left:350, top:470, width:500, fontSize:22, fontFamily:'Unbounded', fontWeight:'800', fill:'#14092b', textAlign:'center', originX:'center' },
      { type:'text', text:'★ УЧАСТИЕ БЕСПЛАТНОЕ', left:230, top:545, width:240, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'14+', left:405, top:545, width:60, fontSize:15, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#f43f5e', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'МОЛОДЁЖЬ', left:495, top:545, width:110, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#6366f1', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Молодёжный лофт ЦГБ «АВРОРА»  ·  ул. Б. Московская, 12\nСобери команду и зарегистрируйся в ВК: vk.com/biblioteka33', left:350, top:635, width:640, fontSize:14, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 7. РЕЖИМ РАБОТЫ В ПРАЗДНИКИ */
  {
    id: 'holiday_schedule',
    size: 'a4_v',
    category: 'notices',
    name: 'Режим работы в праздники',
    desc: 'Чёткое стильное объявление для входных дверей',
    fmt: 'A4',
    bg: '#0f172a',
    previewBg: '#0f172a',
    previewAccent: '#10B981',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">ВНИМАНИЕ ЧИТАТЕЛЯМ</div>
          <div class="mp-title" style="color:#ffffff; font-size:9.5px; margin:2px 0 4px;">РЕЖИМ РАБОТЫ В ПРАЗДНИКИ</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:2.5px; text-align:left;">
          <div style="background:rgba(16,185,129,0.15); border-left:1.5px solid #10B981; padding:1.5px 3px; font-size:5.5px; color:#10B981;"><b>31 ДЕК:</b> 10:00 – 16:00</div>
          <div style="background:rgba(239,68,68,0.18); border-left:1.5px solid #EF4444; padding:1.5px 3px; font-size:5.5px; color:#EF4444;"><b>1-3, 7 ЯНВ:</b> ВЫХОДНОЙ</div>
          <div style="background:rgba(56,189,248,0.15); border-left:1.5px solid #38BDF8; padding:1.5px 3px; font-size:5.5px; color:#38BDF8;"><b>4-6, 8 ЯНВ:</b> 11:00 – 18:00</div>
          <div style="background:rgba(251,191,36,0.15); border-left:1.5px solid #FBBF24; padding:1.5px 3px; font-size:5.5px; color:#FBBF24;"><b>С 9 ЯНВ:</b> обычный режим</div>
        </div>
        <div style="font-size:5px; color:#94a3b8;">ЦГБ «АВРОРА» · biblioteka33.ru</div>
      </div>`,
    objects: [
      { type:'text', text:'УВАЖАЕМЫЕ ЧИТАТЕЛИ И ГОСТИ БИБЛИОТЕКИ!', left:297, top:50, width:520, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'РЕЖИМ РАБОТЫ\nВ ПРАЗДНИКИ', left:297, top:90, width:520, fontSize:38, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.15 },
      { type:'text', text:'График работы отделов в праздничные и выходные дни:', left:297, top:190, width:500, fontSize:16, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:280, width:515, height:75, rx:10, ry:10, fill:'rgba(16,185,129,0.12)', stroke:'#10B981', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'31 ДЕКАБРЯ (предпраздничный день):\nБиблиотека открыта с 10:00 до 16:00', left:297, top:260, width:480, fontSize:17, fontFamily:'Montserrat', fontWeight:'bold', fill:'#10B981', textAlign:'center', originX:'center', lineHeight:1.3 },
      { type:'rect', left:297, top:380, width:515, height:85, rx:10, ry:10, fill:'rgba(239,68,68,0.12)', stroke:'#EF4444', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'1, 2, 3 и 7 ЯНВАРЯ — ПРАЗДНИЧНЫЕ ДНИ\nБиблиотека ЗАКРЫТА для посещения', left:297, top:358, width:480, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#EF4444', textAlign:'center', originX:'center', lineHeight:1.35 },
      { type:'rect', left:297, top:485, width:515, height:75, rx:10, ry:10, fill:'rgba(56,189,248,0.12)', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'4, 5, 6 и 8 ЯНВАРЯ (каникулярный график):\nБиблиотека открыта с 11:00 до 18:00', left:297, top:465, width:480, fontSize:17, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', lineHeight:1.3 },
      { type:'rect', left:297, top:580, width:515, height:65, rx:10, ry:10, fill:'rgba(251,191,36,0.12)', stroke:'#FBBF24', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'С 9 ЯНВАРЯ — в обычном режиме с 10:00 до 20:00', left:297, top:568, width:480, fontSize:17, fontFamily:'Montserrat', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'🔔 Сдать прочитанные книги в праздничные дни можно круглосуточно\nчерез уличный электронный терминал возврата на фасаде здания', left:297, top:645, width:500, fontSize:14, fontFamily:'Montserrat', fontStyle:'italic', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text', text:'Электронные книги и продление онлайн: biblioteka33.ru\nСправки по телефону: 8 (4922) 32-34-56  ·  ЦГБ «АВРОРА»', left:297, top:740, width:515, fontSize:14, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 8. БАННЕР СООБЩЕСТВА ВК (16:9) */
  {
    id: 'vk_community_banner',
    size: 'banner',
    category: 'social',
    name: 'Баннер сообщества ВК',
    desc: 'Горизонтальная обложка 16:9 с контактами и QR-кодом',
    fmt: '16:9',
    isLandscape: true,
    bg: '#070a1a',
    previewBg: '#070a1a',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap" style="flex-direction:row; align-items:center; justify-content:space-between; padding:4px 8px;">
        <div style="text-align:left; max-width:65%;">
          <div class="mp-tag" style="color:#38BDF8; font-size:5px;">ЦГБ Г. ВЛАДИМИРА</div>
          <div class="mp-title" style="color:#ffffff; font-size:13px; margin:1px 0; text-shadow:0 0 8px rgba(56,189,248,0.8);">АВРОРА</div>
          <div style="font-size:5.5px; color:#cbd5e1;">Пространство чтения и творчества</div>
          <div style="font-size:5px; color:#FBBF24; margin-top:2px;">📚 150 000+ книг · 💻 Коворкинг · 🎭 Квизы</div>
        </div>
        <div style="width:40px; height:46px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); border-radius:3px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2px;">
          <div style="width:24px; height:24px; background:#ffffff; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:12px;">📱</div>
          <div style="font-size:4px; color:#38BDF8; margin-top:2px; font-weight:700;">ВСТУПАЙ В ВК</div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА', left:60, top:60, width:500, fontSize:14, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'left', charSpacing:120 },
      { type:'text', text:'АВРОРА', left:60, top:95, width:500, fontSize:58, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'left', shadow:'rgba(56,189,248,0.7) 0px 0px 20px' },
      { type:'text', text:'Твоё пространство для чтения, учёбы и вдохновения', left:60, top:180, width:520, fontSize:20, fontFamily:'Montserrat', fontWeight:'500', fill:'#cbd5e1', textAlign:'left' },
      { type:'text', text:'📚 150 000+ книг и новинок  ·  💻 Коворкинг и Wi-Fi  ·  🎭 Лекции и квизы', left:60, top:230, width:540, fontSize:15, fontFamily:'Montserrat', fontWeight:'600', fill:'#FBBF24', textAlign:'left' },
      { type:'text', text:'г. Владимир, ул. Б. Московская, 12\nПн-Сб: 10:00 – 20:00  ·  Вс: 10:00 – 18:00\nТелефон: 8 (4922) 32-34-56  ·  biblioteka33.ru', left:60, top:290, width:500, fontSize:16, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left', lineHeight:1.6 },
      { type:'rect', left:770, top:270, width:260, height:380, rx:16, ry:16, fill:'rgba(255,255,255,0.06)', stroke:'rgba(56,189,248,0.4)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'rect', left:770, top:215, width:170, height:170, rx:10, ry:10, fill:'#ffffff', originX:'center', originY:'center' },
      { type:'text', text:'QR-КОД\nСАЙТА ЦГБ', left:770, top:200, width:150, fontSize:16, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0f172a', textAlign:'center', originX:'center', lineHeight:1.3 },
      { type:'text', text:'Наведи камеру смартфона,\nчтобы записаться онлайн', left:770, top:330, width:230, fontSize:13, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center', lineHeight:1.4 },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:140, top:440, width:160, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:315, top:440, width:170, fontSize:11, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'0+', left:440, top:440, width:50, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#38BDF8', padding:7, textAlign:'center', originX:'center' },
    ],
  },

  /* 9. ОБЪЯВЛЕНИЕ ДЛЯ ЧИТАТЕЛЕЙ (A4) */
  {
    id: 'announce_a4',
    size: 'a4_v',
    category: 'notices',
    name: 'Объявление A4',
    desc: 'Классическое библиотечное объявление',
    fmt: 'A4',
    bg: '#0f172a',
    previewBg: '#0f172a',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">ИНФОРМАЦИЯ</div>
          <div class="mp-title" style="color:#ffffff; font-size:10px; margin:3px 0;">УВАЖАЕМЫЕ ЧИТАТЕЛИ!</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; margin:4px 0;">
          <div style="height:5px; background:rgba(255,255,255,0.2); border-radius:2px; width:90%; margin:0 auto;"></div>
          <div style="height:5px; background:rgba(255,255,255,0.2); border-radius:2px; width:80%; margin:0 auto;"></div>
          <div style="height:5px; background:rgba(255,255,255,0.2); border-radius:2px; width:70%; margin:0 auto;"></div>
        </div>
        <div style="font-size:6px; color:#38BDF8;">Библиотека «АВРОРА»</div>
      </div>`,
    objects: [
      { type:'rect',  left:297, top:70,  width:500, height:5, fill:'#38BDF8', originX:'center' },
      { type:'text',  text:'УВАЖАЕМЫЕ ЧИТАТЕЛИ!', left:297, top:120, fontSize:28, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text',  text:'Текст объявления.\nДата и время мероприятия.\nМесто проведения.', left:297, top:220, fontSize:18, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.7 },
      { type:'text',  text:'Библиотека «АВРОРА»  ·  biblioteka33.ru', left:297, top:740, fontSize:13, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:765, width:500, height:4, fill:'#38BDF8', originX:'center' },
    ],
  },

  /* 10. ВЫХОДНОЙ / САНДЕНЬ / ЗАКРЫТО */
  {
    id: 'closed_notice',
    size: 'a4_v',
    category: 'notices',
    name: 'Закрыто / Санитарный день',
    desc: 'Экстренное объявление на дверь',
    fmt: 'A4',
    bg: '#1a0808',
    previewBg: '#1a0808',
    previewAccent: '#EF4444',
    previewHtml: `
      <div class="mp-wrap">
        <div class="mp-tag" style="color:#EF4444;">ВНИМАНИЕ</div>
        <div>
          <div class="mp-title" style="color:#EF4444; font-size:12px; margin:2px 0;">НЕ РАБОТАЕМ</div>
          <div style="font-size:6px; color:#94a3b8;">Санитарный день</div>
        </div>
        <div class="mp-date" style="background:rgba(239,68,68,0.2); color:#EF4444; border:1px solid #EF4444; font-size:6px;">«___» _______ 2025</div>
        <div style="font-size:7px; color:#10B981; font-weight:700;">Ждём вас!</div>
      </div>`,
    objects: [
      { type:'rect',  left:297, top:55,  width:530, height:6, fill:'#EF4444', originX:'center' },
      { type:'text',  text:'НЕ РАБОТАЕМ', left:297, top:200, fontSize:48, fontFamily:'Unbounded', fill:'#EF4444', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text',  text:'Причина: Санитарный день', left:297, top:310, fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'text',  text:'Дата:', left:297, top:400, fontSize:18, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center' },
      { type:'text',  text:'«___» __________ 2025 г.', left:297, top:440, fontSize:24, fontFamily:'Montserrat', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'text',  text:'Ждём вас в следующий рабочий день!', left:297, top:540, fontSize:24, fontFamily:'Unbounded', fill:'#10B981', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:765, width:530, height:6, fill:'#EF4444', originX:'center' },
    ],
  },

  /* 11. ВЫВЕСКА БИБЛИОТЕКИ */
  {
    id: 'sign_banner',
    size: 'banner',
    category: 'social',
    name: 'Вывеска библиотеки',
    desc: 'Горизонтальный фасадный баннер',
    fmt: '16:9',
    isLandscape: true,
    bg: '#060918',
    previewBg: '#060918',
    previewAccent: '#10B981',
    previewHtml: `
      <div class="mp-wrap" style="justify-content:center; gap:6px;">
        <div class="mp-title" style="color:#ffffff; font-size:12px;">БИБЛИОТЕКА АВРОРЫ</div>
        <div style="height:2px; background:#38BDF8; width:70%; margin:0 auto;"></div>
        <div style="font-size:6px; color:#38BDF8;">biblioteka33.ru · г. Владимир</div>
        <div style="font-size:8px; color:#FBBF24; font-weight:700;">8 (4922) 32-XX-XX</div>
      </div>`,
    objects: [
      { type:'text', text:'БИБЛИОТЕКА АВРОРЫ', left:480, top:155, fontSize:52, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'rect', left:480, top:235, width:500, height:3, fill:'#38BDF8', originX:'center' },
      { type:'text', text:'biblioteka33.ru  ·  г. Владимир', left:480, top:262, fontSize:20, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'8 (4922) 32-XX-XX', left:480, top:330, fontSize:32, fontFamily:'Unbounded', fill:'#FBBF24', textAlign:'center', originX:'center' },
    ],
  },

  /* 12. ЧИСТЫЙ ЛИСТ A4 ВЕРТИКАЛЬ */
  {
    id: 'blank_a4_v',
    size: 'a4_v',
    category: 'blank',
    name: 'Чистый лист A4',
    desc: 'Вертикальный формат 595 × 842 pt',
    fmt: 'A4',
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">A4 вертикаль</span>
      </div>`,
    objects: [],
  },

  /* 13. ЧИСТЫЙ ЛИСТ A4 ГОРИЗОНТАЛЬ */
  {
    id: 'blank_a4_h',
    size: 'a4_h',
    category: 'blank',
    name: 'A4 горизонталь',
    desc: 'Альбомный формат 842 × 595 pt',
    fmt: 'A4 гориз.',
    isLandscape: true,
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">A4 альбом</span>
      </div>`,
    objects: [],
  },

  /* 14. ЧИСТЫЙ КВАДРАТ 1:1 (ВК) */
  {
    id: 'blank_square',
    size: 'square',
    category: 'blank',
    name: 'Квадрат 1:1 (ВК)',
    desc: 'Пост для соцсетей 700 × 700 pt',
    fmt: '1:1',
    isSquare: true,
    bg: '#131726',
    previewBg: '#131726',
    previewAccent: '#8A6CFF',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#8A6CFF; opacity:0.8;">crop_square</span>
        <span style="font-size:7.5px; font-weight:700; color:#8A6CFF; margin-top:3px;">ЧИСТЫЙ КВАДРАТ</span>
        <span style="font-size:6px; color:#94a3b8;">ВК 1:1</span>
      </div>`,
    objects: [],
  },

  /* 15. ЧИСТЫЙ БАННЕР 16:9 */
  {
    id: 'blank_banner',
    size: 'banner',
    category: 'blank',
    name: 'Баннер 16:9',
    desc: 'Широкий экран 960 × 540 pt',
    fmt: '16:9',
    isLandscape: true,
    bg: '#060918',
    previewBg: '#060918',
    previewAccent: '#10B981',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#10B981; opacity:0.8;">panorama</span>
        <span style="font-size:7.5px; font-weight:700; color:#10B981; margin-top:3px;">ЧИСТЫЙ БАННЕР</span>
        <span style="font-size:6px; color:#94a3b8;">16:9</span>
      </div>`,
    objects: [],
  },

  /* 16. ЧИСТЫЙ СТОРИС 9:16 */
  {
    id: 'blank_story',
    size: 'story',
    category: 'blank',
    name: 'Сторис 9:16',
    desc: 'Вертикальный экран 540 × 960 pt',
    fmt: '9:16',
    isStory: true,
    bg: '#090d1a',
    previewBg: '#090d1a',
    previewAccent: '#ec4899',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#ec4899; opacity:0.8;">smartphone</span>
        <span style="font-size:7.5px; font-weight:700; color:#ec4899; margin-top:3px;">ЧИСТЫЙ СТОРИС</span>
        <span style="font-size:6px; color:#94a3b8;">9:16</span>
      </div>`,
    objects: [],
  },
];

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
  { label:'Телефон',     text:'8 (4922) 32-34-56',  color:'#ffffff', font:'Montserrat', category:'Контакт' },
  { label:'Адрес',       text:'г. Владимир,\nул. Б. Московская, 12', color:'#94a3b8', font:'Montserrat', category:'Контакт' },
  // Библиотечные плашки и стикеры
  { label:'Пушкинская к.', text:'ПУШКИНСКАЯ КАРТА', color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#e11d48' },
  { label:'Вход своб.',    text:'★ ВХОД СВОБОДНЫЙ',  color:'#070a1e', font:'Unbounded', category:'Плашки', bg:'#10B981' },
  { label:'Бесплатно',     text:'БЕСПЛАТНО',         color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#059669' },
  { label:'0+',            text:'0+',                color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#10B981' },
  { label:'6+',            text:'6+',                color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#0284c7' },
  { label:'12+',           text:'12+',               color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#0d9488' },
  { label:'16+',           text:'16+',               color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#d97706' },
  { label:'18+',           text:'18+',               color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#dc2626' },
  { label:'Трансляция',    text:'🔴 ПРЯМАЯ ТРАНСЛЯЦИЯ', color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#ef4444' },
  { label:'Мастер-класс',  text:'🎨 МАСТЕР-КЛАСС',   color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#8A6CFF' },
  { label:'Книжный клуб',  text:'📖 КНИЖНЫЙ КЛУБ',   color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#4f46e5' },
  { label:'Лекторий',      text:'🎙️ ЛЕКТОРИЙ',       color:'#ffffff', font:'Unbounded', category:'Плашки', bg:'#0284c7' },
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
    <option value="${f.id}" style="font-family:'${f.id}',sans-serif;">
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
let currentTplCategory = 'all';
let tplSearchQuery = '';

function renderTemplatesGrid() {
  const grid = $('#tpl-grid');
  if (!grid) return;
  const filtered = TEMPLATES.filter(t => {
    const cat = t.category || (t.id.startsWith('blank') ? 'blank' : 'events');
    const matchCat = currentTplCategory === 'all' || cat === currentTplCategory;
    const q = tplSearchQuery.toLowerCase().trim();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="tpl-empty-search" style="grid-column: 1/-1; text-align: center; padding: 48px 20px; color: var(--text-3);">
      <span class="material-symbols-rounded" style="font-size: 48px; color: var(--text-3); margin-bottom: 8px;">search_off</span>
      <p style="font-size: 15px; font-weight: 700; color: var(--text-2);">Шаблоны не найдены</p>
      <p style="font-size: 12px; margin-top: 4px; color: var(--text-3);">Попробуйте изменить поисковый запрос или категорию</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(t => {
    const isSquare = t.isSquare ? 'is-square' : '';
    const isLandscape = t.isLandscape ? 'is-landscape' : '';
    return `
    <div class="tpl-card ${isSquare} ${isLandscape}" data-tpl="${t.id}" tabindex="0" role="button" aria-label="${t.name}">
      <div class="tpl-preview ${isSquare} ${isLandscape}" style="background:${t.previewBg || '#070a1e'}">
        ${t.previewHtml ? t.previewHtml : `
        <div class="tpl-preview-inner" style="background:${t.previewBg}; outline: 1.5px solid rgba(255,255,255,0.08);">
          <div class="tpl-preview-line is-accent" style="background:${t.previewAccent}"></div>
          <div class="tpl-preview-line is-title"></div>
          <div class="tpl-preview-line is-sub"></div>
          <div class="tpl-preview-line is-body"></div>
          <div class="tpl-preview-line is-body" style="width:45%"></div>
        </div>`}
        <div class="tpl-preview-badge">${t.fmt}</div>
      </div>
      <div class="tpl-card-footer">
        <div class="tpl-card-name">${t.name}</div>
        <div class="tpl-card-desc">${t.desc}</div>
        <span class="tpl-card-fmt">${t.fmt}</span>
      </div>
    </div>`;
  }).join('');
}

function buildTemplates() {
  renderTemplatesGrid();

  const grid = $('#tpl-grid');
  if (grid && !grid._hasEventListener) {
    grid._hasEventListener = true;
    grid.addEventListener('click', e => {
      const card = e.target.closest('.tpl-card');
      if (card) loadTemplate(TEMPLATES.find(t => t.id === card.dataset.tpl));
    });
    grid.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') e.target.closest('.tpl-card')?.click();
    });
  }

  // Фильтры категорий
  $$('.tpl-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.tpl-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      currentTplCategory = chip.dataset.cat;
      renderTemplatesGrid();
    });
  });

  // Поиск по шаблонам
  const search = $('#tpl-search');
  if (search) {
    search.addEventListener('input', e => {
      tplSearchQuery = e.target.value;
      renderTemplatesGrid();
    });
  }

  // Кнопки быстрого старта с чистого листа в Hero-секции
  $$('[data-blank]').forEach(btn => {
    btn.addEventListener('click', () => {
      const blankId = btn.dataset.blank;
      const t = TEMPLATES.find(x => x.id === blankId) || TEMPLATES.find(x => x.id === 'blank_a4_v');
      if (t) loadTemplate(t);
    });
  });
}

function buildBadgeGrid() {
  const grid = $('#badge-grid');
  if (!grid || typeof STICKERS === 'undefined') return;
  grid.innerHTML = STICKERS.map(st => `
    <div class="badge-card-item" data-sticker="${st.id}" tabindex="0" role="button" title="${st.desc}">
      <div class="badge-pill-preview" style="background:${st.bg}; color:${st.color}; font-family:'${st.font}',sans-serif;">
        ${st.text}
      </div>
      <div class="badge-card-label">${st.label}</div>
      <div class="badge-card-desc">${st.desc}</div>
    </div>
  `).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.badge-card-item');
    if (!card) return;
    const st = STICKERS.find(s => s.id === card.dataset.sticker);
    if (!st) return;
    closeBadgeModal();
    addStickerToCanvas(st);
  });
}

function openBadgeModal()  { $('#badge-modal-overlay')?.classList.remove('hidden'); }
function closeBadgeModal() { $('#badge-modal-overlay')?.classList.add('hidden'); }

function addStickerToCanvas(sticker) {
  if (!canvas) return;
  const cx = currentSize.w / 2;
  const cy = currentSize.h / 2;
  const textWidth = Math.min(Math.max(sticker.text.length * (sticker.size || 14) * 0.72 + 36, 140), currentSize.w * 0.85);
  const b = new fabric.Textbox(sticker.text, {
    left: cx - textWidth / 2, top: cy - 25, width: textWidth,
    fontSize: sticker.size || 15, fontFamily: sticker.font || 'Unbounded', fontWeight: 'bold',
    fill: sticker.color || '#ffffff', backgroundColor: sticker.bg || '#e11d48',
    textAlign: 'center', padding: 9, rx: 6, ry: 6,
    selectable: true, editable: true,
  });
  canvas.add(b);
  canvas.setActiveObject(b);
  canvas.renderAll();
  updateLayersList();
  saveHistory();
  toast(`Плашка «${sticker.label}» добавлена ✨`);
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

function applyGlow(obj, color, blur) {
  if (!obj) return;
  obj.set('shadow', new fabric.Shadow({
    color: color || '#38BDF8',
    blur: blur !== undefined ? blur : 15,
    offsetX: 0,
    offsetY: 0
  }));
}

function buildColorRows() {
  const mkSwatches = (containerId, colors, onPick) => {
    const el = $('#' + containerId);
    if (!el) return;
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

  const GLOW_COLORS = ['#38BDF8', '#8A6CFF', '#F43F5E', '#10B981', '#FBBF24', '#EC4899', '#06B6D4', '#ffffff'];

  mkSwatches('text-glow-color-row', GLOW_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) {
      const blur = +$('#text-glow-blur-slider')?.value || 15;
      applyGlow(obj, c, blur);
      canvas.renderAll();
      saveHistory();
    }
    const cp = $('#text-glow-color-picker');
    if (cp) cp.value = c;
  });

  mkSwatches('shape-glow-color-row', GLOW_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) {
      const blur = +$('#shape-glow-blur-slider')?.value || 20;
      applyGlow(obj, c, blur);
      canvas.renderAll();
      saveHistory();
    }
    const cp = $('#shape-glow-color-picker');
    if (cp) cp.value = c;
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
  updateFormatBadge();
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
  if (d.shadow) {
    if (typeof d.shadow === 'string') {
      d.shadow = new fabric.Shadow(d.shadow);
    } else if (typeof d.shadow === 'object' && !(d.shadow instanceof fabric.Shadow)) {
      d.shadow = new fabric.Shadow(d.shadow);
    }
  }
  switch(type) {
    case 'text': {
      const t = new fabric.Textbox(d.text || 'Текст', { ...d, editable: true });
      canvas.add(t); break;
    }
    case 'rect':   canvas.add(new fabric.Rect(d));   break;
    case 'circle': canvas.add(new fabric.Circle(d)); break;
    case 'line':   canvas.add(new fabric.Line(d.points || [0,0,100,0], d)); break;
    case 'path':   canvas.add(new fabric.Path(d.path, d)); break;
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


function updateFormatBadge() {
  const badge = $('#canvas-format-badge');
  if (!badge || !currentSize) return;
  const zPct = Math.round(zoom * 100);
  badge.textContent = `${currentSize.name} · ${currentSize.w} × ${currentSize.h} пт · ${zPct}%`;
}

function duplicateActiveObject() {
  const obj = canvas?.getActiveObject();
  if (!obj) return;
  obj.clone(cloned => {
    cloned.set({
      left: obj.left + 20,
      top: obj.top + 20,
      evented: true,
    });
    if (cloned.type === 'activeSelection') {
      cloned.canvas = canvas;
      cloned.forEachObject(o => canvas.add(o));
      cloned.setCoords();
    } else {
      canvas.add(cloned);
    }
    canvas.setActiveObject(cloned);
    canvas.renderAll();
    saveHistory();
    updateLayersList();
    toast('Объект продублирован 📋');
  });
}

function flipActiveObject(axis) {
  const obj = canvas?.getActiveObject();
  if (!obj) return;
  if (axis === 'x') obj.set('flipX', !obj.flipX);
  if (axis === 'y') obj.set('flipY', !obj.flipY);
  canvas.renderAll();
  saveHistory();
}

function alignActiveObject(alignment) {
  const obj = canvas?.getActiveObject();
  if (!obj) return;
  const w = currentSize.w;
  const h = currentSize.h;
  const ow = obj.getScaledWidth();
  const oh = obj.getScaledHeight();
  switch(alignment) {
    case 'center-h': obj.set('left', (w - ow) / 2); break;
    case 'center-v': obj.set('top', (h - oh) / 2); break;
    case 'left':     obj.set('left', 20); break;
    case 'right':    obj.set('left', w - ow - 20); break;
    case 'top':      obj.set('top', 20); break;
    case 'bottom':   obj.set('top', h - oh - 20); break;
  }
  obj.setCoords();
  canvas.renderAll();
  saveHistory();
}

function printPoster() {
  if (!canvas) return;
  const saved = zoom;
  applyZoom(1);
  canvas.discardActiveObject();
  canvas.renderAll();
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
  applyZoom(saved);

  const win = window.open('', '_blank');
  if (!win) {
    toast('Разрешите всплывающие окна для печати');
    return;
  }
  const isLandscape = currentSize.w > currentSize.h;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${$('#poster-title')?.value || 'Афиша'}</title><style>@page{size:${isLandscape ? 'landscape' : 'portrait'};margin:0;}body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;}img{width:100%;height:100%;object-fit:contain;}</style></head><body><img src="${dataUrl}" onload="setTimeout(()=>{window.print();window.close();},300)"></body></html>`);
  win.document.close();
}

/* ══════════════════════════════════════════════════════════════
   ПАНЕЛЬ СВОЙСТВ
   ══════════════════════════════════════════════════════════════ */
function clearProps() {
  $('#props-empty')?.classList.remove('hidden');
  $('#props-text')?.classList.add('hidden');
  $('#props-shape')?.classList.add('hidden');
  $('#props-common')?.classList.add('hidden');
  $('#text-glow-options')?.classList.add('hidden');
  $('#shape-glow-options')?.classList.add('hidden');
  $('#btn-text-glow')?.classList.remove('is-active');
  $('#btn-shape-glow')?.classList.remove('is-active');
  $('#btn-uppercase')?.classList.remove('is-active');
  updateLayersList();
}

function onSelection() {
  const obj = canvas?.getActiveObject();
  if (!obj) { clearProps(); return; }

  $('#props-empty')?.classList.add('hidden');
  $('#props-common')?.classList.remove('hidden');

  const isText  = ['textbox','text','i-text'].includes(obj.type);
  const isShape = ['rect','circle','ellipse','line','polyline','polygon','path'].includes(obj.type);

  $('#props-text')?.classList.toggle('hidden', !isText);
  $('#props-shape')?.classList.toggle('hidden', !isShape);

  if (isText) {
    const fs = Math.round(obj.fontSize || 36);
    const fsSlider = $('#font-size-slider');
    if (fsSlider) fsSlider.value = fs;
    const fsVal = $('#font-size-val');
    if (fsVal) fsVal.textContent = fs;

    if (obj.fontFamily && $('#font-family-select')) {
      $('#font-family-select').value = obj.fontFamily;
    }
    syncToggle('btn-bold',      obj.fontWeight === 'bold');
    syncToggle('btn-italic',    obj.fontStyle  === 'italic');
    syncToggle('btn-underline', !!obj.underline);
    syncToggle('btn-uppercase', !!obj.__isUppercase);
    ['left','center','right'].forEach(a => syncToggle('btn-align-'+a, obj.textAlign === a));

    // Межстрочный интервал (line-height)
    const lh = obj.lineHeight !== undefined ? obj.lineHeight : 1.2;
    const lhSlider = $('#line-height-slider');
    if (lhSlider) lhSlider.value = Math.round(lh * 10);
    const lhVal = $('#line-height-val');
    if (lhVal) lhVal.textContent = Number(lh).toFixed(1);

    // Межбуквенный интервал (char-spacing / tracking)
    const cs = obj.charSpacing !== undefined ? obj.charSpacing : 0;
    const csSlider = $('#char-spacing-slider');
    if (csSlider) csSlider.value = cs;
    const csVal = $('#char-spacing-val');
    if (csVal) csVal.textContent = cs;

    // Неоновое свечение текста (shadow)
    const hasGlow = !!obj.shadow;
    syncToggle('btn-text-glow', hasGlow);
    $('#text-glow-options')?.classList.toggle('hidden', !hasGlow);
    if (hasGlow) {
      const gBlur = obj.shadow.blur !== undefined ? obj.shadow.blur : 15;
      const gColor = obj.shadow.color || '#38BDF8';
      const tgBlurSlider = $('#text-glow-blur-slider');
      if (tgBlurSlider) tgBlurSlider.value = gBlur;
      const tgBlurVal = $('#text-glow-blur-val');
      if (tgBlurVal) tgBlurVal.textContent = gBlur;
      const tgCp = $('#text-glow-color-picker');
      if (tgCp && gColor.startsWith('#')) tgCp.value = gColor;
      syncSwatches('#text-glow-color-row', gColor);
    }

    syncSwatches('#text-color-row', obj.fill);
    if (obj.fill?.startsWith?.('#') && $('#text-color-picker')) $('#text-color-picker').value = obj.fill;
  }

  if (isShape) {
    const op = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100);
    const opSlider = $('#opacity-slider');
    if (opSlider) opSlider.value = op;
    const opVal = $('#opacity-val');
    if (opVal) opVal.textContent = op;

    const sw = obj.strokeWidth || 0;
    const swSlider = $('#stroke-width-slider');
    if (swSlider) swSlider.value = sw;
    const swVal = $('#stroke-width-val');
    if (swVal) swVal.textContent = sw;

    // Скругление углов для прямоугольников
    const isRect = obj.type === 'rect';
    $('#corner-radius-label')?.classList.toggle('hidden', !isRect);
    $('#corner-radius-slider')?.classList.toggle('hidden', !isRect);
    if (isRect) {
      const rx = obj.rx || 0;
      const crSlider = $('#corner-radius-slider');
      if (crSlider) crSlider.value = rx;
      const crVal = $('#corner-radius-val');
      if (crVal) crVal.textContent = rx;
    }

    // Свечение / тень фигуры
    const hasGlow = !!obj.shadow;
    syncToggle('btn-shape-glow', hasGlow);
    $('#shape-glow-options')?.classList.toggle('hidden', !hasGlow);
    if (hasGlow) {
      const gBlur = obj.shadow.blur !== undefined ? obj.shadow.blur : 20;
      const gColor = obj.shadow.color || '#38BDF8';
      const sgBlurSlider = $('#shape-glow-blur-slider');
      if (sgBlurSlider) sgBlurSlider.value = gBlur;
      const sgBlurVal = $('#shape-glow-blur-val');
      if (sgBlurVal) sgBlurVal.textContent = gBlur;
      const sgCp = $('#shape-glow-color-picker');
      if (sgCp && gColor.startsWith('#')) sgCp.value = gColor;
      syncSwatches('#shape-glow-color-row', gColor);
    }

    syncSwatches('#fill-color-row', obj.fill);
    syncSwatches('#stroke-color-row', obj.stroke || 'transparent');
    if (obj.fill?.startsWith?.('#') && $('#fill-color-picker')) $('#fill-color-picker').value = obj.fill;
    if (obj.stroke?.startsWith?.('#') && $('#stroke-color-picker')) $('#stroke-color-picker').value = obj.stroke;
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
  updateFormatBadge();
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
    if ((e.ctrlKey||e.metaKey) && (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      e.preventDefault();
      duplicateActiveObject();
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
      e.preventDefault();
      printPoster();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
      const el = document.activeElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;
      const obj = canvas.getActiveObject();
      if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); clearProps(); }
    }
  });

  /* Экспорт и печать */
  $('#btn-save').addEventListener('click', manualSave);
  $('#btn-export-png').addEventListener('click', exportPng);
  $('#btn-export-pdf').addEventListener('click', exportPdf);
  $('#btn-print')?.addEventListener('click', printPoster);
  $('#btn-header-duplicate')?.addEventListener('click', duplicateActiveObject);

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
  $('#tool-photo')   ?.addEventListener('click', () => $('#photo-input').click());
  $('#photo-input')  ?.addEventListener('change', e => { addPhoto(e.target.files?.[0]); e.target.value=''; });
  $('#tool-cosmo')   ?.addEventListener('click', openCosmoModal);
  $('#tool-logo')    ?.addEventListener('click', openLogoModal);
  $('#tool-stickers')?.addEventListener('click', openBadgeModal);
  $('#tool-qrcode')  ?.addEventListener('click', openQrModal);

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

  $('#btn-uppercase')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || !['textbox','text','i-text'].includes(obj.type)) return;
    if (!obj.__isUppercase) {
      obj.__origText = obj.text;
      obj.set('text', obj.text.toUpperCase());
      obj.__isUppercase = true;
    } else {
      obj.set('text', obj.__origText || obj.text);
      obj.__isUppercase = false;
    }
    syncToggle('btn-uppercase', obj.__isUppercase);
    canvas.renderAll();
    saveHistory();
  });

  ['left','center','right'].forEach(a => {
    $('#btn-align-'+a).addEventListener('click', () => {
      const obj = canvas?.getActiveObject(); if (!obj) return;
      obj.set('textAlign', a); canvas.renderAll(); saveHistory();
      ['left','center','right'].forEach(x => syncToggle('btn-align-'+x, x===a));
    });
  });

  $('#line-height-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value / 10;
    const valEl = $('#line-height-val');
    if (valEl) valEl.textContent = v.toFixed(1);
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('lineHeight', v);
      canvas.renderAll();
    }
  });
  $('#line-height-slider')?.addEventListener('change', () => saveHistory());

  $('#char-spacing-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#char-spacing-val');
    if (valEl) valEl.textContent = v;
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('charSpacing', v);
      canvas.renderAll();
    }
  });
  $('#char-spacing-slider')?.addEventListener('change', () => saveHistory());

  /* Неоновое свечение текста */
  $('#btn-text-glow')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || !['textbox','text','i-text'].includes(obj.type)) return;
    if (obj.shadow) {
      obj.set('shadow', null);
      syncToggle('btn-text-glow', false);
      $('#text-glow-options')?.classList.add('hidden');
    } else {
      const color = $('#text-glow-color-picker')?.value || '#38BDF8';
      const blur = +$('#text-glow-blur-slider')?.value || 15;
      applyGlow(obj, color, blur);
      syncToggle('btn-text-glow', true);
      $('#text-glow-options')?.classList.remove('hidden');
    }
    canvas.renderAll();
    saveHistory();
  });

  $('#text-glow-blur-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#text-glow-blur-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.shadow) {
      obj.shadow.blur = v;
      canvas.renderAll();
    }
  });
  $('#text-glow-blur-slider')?.addEventListener('change', () => saveHistory());

  $('#text-glow-color-picker')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (obj && obj.shadow) {
      obj.shadow.color = e.target.value;
      canvas.renderAll();
    }
  });
  $('#text-glow-color-picker')?.addEventListener('change', () => saveHistory());

  $('#text-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (obj) { obj.set('fill', e.target.value); canvas.renderAll(); }
  });
  $('#text-color-picker').addEventListener('change', () => saveHistory());

  /* ── Свойства фигур ── */
  $('#corner-radius-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#corner-radius-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.type === 'rect') {
      obj.set({ rx: v, ry: v });
      canvas.renderAll();
    }
  });
  $('#corner-radius-slider')?.addEventListener('change', () => saveHistory());

  /* Неоновое свечение фигуры */
  $('#btn-shape-glow')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    if (obj.shadow) {
      obj.set('shadow', null);
      syncToggle('btn-shape-glow', false);
      $('#shape-glow-options')?.classList.add('hidden');
    } else {
      const color = $('#shape-glow-color-picker')?.value || '#38BDF8';
      const blur = +$('#shape-glow-blur-slider')?.value || 20;
      applyGlow(obj, color, blur);
      syncToggle('btn-shape-glow', true);
      $('#shape-glow-options')?.classList.remove('hidden');
    }
    canvas.renderAll();
    saveHistory();
  });

  $('#shape-glow-blur-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#shape-glow-blur-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.shadow) {
      obj.shadow.blur = v;
      canvas.renderAll();
    }
  });
  $('#shape-glow-blur-slider')?.addEventListener('change', () => saveHistory());

  $('#shape-glow-color-picker')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (obj && obj.shadow) {
      obj.shadow.color = e.target.value;
      canvas.renderAll();
    }
  });
  $('#shape-glow-color-picker')?.addEventListener('change', () => saveHistory());

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
  $('#btn-align-left-canvas')  ?.addEventListener('click', () => alignActiveObject('left'));
  $('#btn-align-right-canvas') ?.addEventListener('click', () => alignActiveObject('right'));
  $('#btn-align-top-canvas')   ?.addEventListener('click', () => alignActiveObject('top'));
  $('#btn-align-bottom-canvas')?.addEventListener('click', () => alignActiveObject('bottom'));

  $('#btn-duplicate')?.addEventListener('click', duplicateActiveObject);
  $('#btn-flip-x')?.addEventListener('click', () => flipActiveObject('x'));
  $('#btn-flip-y')?.addEventListener('click', () => flipActiveObject('y'));

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

  /* Модалка плашек и стикеров */
  $('#badge-modal-close')?.addEventListener('click', closeBadgeModal);
  $('#badge-modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeBadgeModal(); });

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
  buildBadgeGrid();
  buildLogos();
  buildCosmoGrid();
  buildBgPalette();
  buildColorRows();
  bindEvents();

  if (!loadDraft()) {
    toast('Выберите шаблон для начала работы');
  }
});
