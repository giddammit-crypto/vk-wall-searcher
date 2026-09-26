/* =============================================================
   АВРОРА — Редактор Афиш  editor.js v2.1.0
   19 кириллических шрифтов | Слои | Космо | QR-код | Фигуры
   ============================================================= */
'use strict';

/* ── Форматы холста ─────────────────────────────────────────── */
const SIZES = {
  a4_v:        { w: 595,  h: 842,  name: 'A4 вертикаль' },
  a4_h:        { w: 842,  h: 595,  name: 'A4 горизонталь' },
  square:      { w: 700,  h: 700,  name: 'Квадрат (ВК)' },
  banner:      { w: 960,  h: 540,  name: 'Баннер 16:9' },
  story:       { w: 540,  h: 960,  name: 'Сторис 9:16' },
  tilda_cover:   { w: 1280, h: 720,  name: 'Tilda Cover 16:9' },
  tilda_hero:    { w: 1280, h: 600,  name: 'Tilda Hero-секция' },
  tilda_card:    { w: 600,  h: 800,  name: 'Tilda Карточка' },
  tilda_landing: { w: 1200, h: 2400, name: 'Tilda Лендинг (6 блоков)' },
};

/* ── 21+ кириллический шрифт + ofont.ru ────────────────────── */
const FONTS = [
  { id: 'Shoptronic SP',      name: 'Shoptronic SP',      desc: 'Космический акцидентный [ofont.ru]' },
  { id: 'Dela Gothic One',    name: 'Dela Gothic One',    desc: 'Мощный плакатный гротеск [ofont.ru]' },
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
  { id: 'Jura',               name: 'Jura',               desc: 'Футуристичный гротеск' },
  { id: 'Neucha',             name: 'Neucha',             desc: 'Крафтовый душевный почерк' },
  { id: 'Press Start 2P',     name: 'Press Start 2P',     desc: 'Ретро 8-bit, квизы и игры' },
  { id: 'Lobster',            name: 'Lobster',            desc: 'Яркий ретро-курсив' },
  { id: 'Podkova',            name: 'Podkova',            desc: 'Широкая выразительная подкова' },
  { id: 'Georgia',            name: 'Georgia',            desc: 'Классическая книга' },
  { id: 'Arial',              name: 'Arial',              desc: 'Стандартный чёткий гротеск' },
];

const figmaLoadedFonts = new Set(FONTS.map(f => f.id));

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
  { id: 'stamp_new',     label: 'Новинка фонда',      text: '★ НОВИНКА ФОНДА ★',    bg: '#d97706', color: '#ffffff', font: 'Unbounded', size: 14, desc: 'Новое поступление в библиотеку' },
  { id: 'stamp_choice',  label: 'Выбор библиотекаря', text: '✦ ВЫБОР БИБЛИОТЕКАРЯ ✦', bg: '#059669', color: '#ffffff', font: 'Unbounded', size: 13, desc: 'Знак особого качества' },
  { id: 'stamp_hit',     label: 'Хит чтения',         text: '🔥 ХИТ ЧТЕНИЯ',         bg: '#e11d48', color: '#ffffff', font: 'Unbounded', size: 15, desc: 'Самая читаемая книга месяца' },
  { id: 'stamp_rare',    label: 'Редкий фонд',        text: '🏛️ РЕДКИЙ ФОНД',        bg: '#4c1d95', color: '#ffffff', font: 'Unbounded', size: 14, desc: 'Уникальные раритетные издания' },
  { id: 'stamp_bestsell',label: 'Бестселлер',         text: '👑 БЕСТСЕЛЛЕР',         bg: '#2563eb', color: '#ffffff', font: 'Unbounded', size: 15, desc: 'Лидер читательских симпатий' },
  { id: 'stamp_approved',label: 'Одобрено ЦГБ',       text: '✓ ОДОБРЕНО ЦГБ',       bg: '#047857', color: '#ffffff', font: 'Unbounded', size: 14, desc: 'Рекомендовано методическим советом' },
];

/* ── Маскоты Космо ──────────────────────────────────────────── */
const COSMO_ITEMS = [
  { file: 'robot_read.png',     label: 'Космо с книгой', desc: 'Читает книгу 📖' },
  { file: 'robot_waving.png',   label: 'Приветствие',    desc: 'Машет рукой 👋' },
  { file: 'robot_idea.png',     label: 'Есть идея!',     desc: 'С лампочкой 💡' },
  { file: 'robot_cool.png',     label: 'Крутой Космо',   desc: 'В стильных очках 😎' },
  { file: 'robot_party.png',    label: 'Праздник',       desc: 'С шариками 🎉' },
  { file: 'robot_smile.png',    label: 'Улыбка',         desc: 'Дружелюбный Космо ✨' },
  { file: 'robot_thinking.png', label: 'Размышление',    desc: 'Задумался 🤔' },
  { file: 'robot_love.png',     label: 'С любовью',      desc: 'Сердечко ❤️' },
];

/* ── Шаблоны (Культурный библиотечный дизайн без нейрослопа) ── */
const TEMPLATES = [
  /* 1. БИБЛИОНОЧЬ / МАГИЯ КНИГИ */
  {
    id: 'biblionight_classic',
    size: 'a4_v',
    category: 'events',
    name: 'Библионочь: Магия книги',
    desc: 'Всероссийская культурная акция, глубокий космический стиль',
    fmt: 'A4',
    bg: '#070a1e',
    previewBg: '#070a1e',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">✦ ВСЕРОССИЙСКАЯ АКЦИЯ ✦</div>
          <div class="mp-title mp-glow" style="color:#ffffff; text-shadow:0 0 10px rgba(56,189,248,0.9); font-size:12px;">БИБЛИОНОЧЬ<br><span style="color:#38BDF8;">2025</span></div>
          <div class="mp-pill" style="border:1px solid #38BDF8; color:#38BDF8; background:rgba(56,189,248,0.15);">МАГИЯ КНИГИ</div>
        </div>
        <div class="mp-box" style="border:1px solid rgba(192,132,252,0.4); background:rgba(19,23,38,0.9);">
          <div style="font-size:6.5px; color:#c084fc; font-weight:700;">ПРОГРАММА ВЕЧЕРА</div>
          <div style="font-size:5.5px; color:#94a3b8; line-height:1.25; margin-top:2px;">Квесты · Встречи с авторами · Музыка · Чайная</div>
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
      { type:'text', text:'✦ ВСЕРОССИЙСКАЯ АКЦИЯ В БИБЛИОТЕКЕ ✦', left:297, top:45, width:520, fontSize:12, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:140 },
      { type:'rect', left:297, top:75, width:515, height:2, fill:'#38BDF8', originX:'center', shadow:'rgba(56,189,248,0.8) 0px 0px 12px' },
      { type:'text', text:'БИБЛИОНОЧЬ\n2025', left:297, top:105, width:520, fontSize:54, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.05, shadow:'rgba(56,189,248,0.85) 0px 0px 24px' },
      { type:'rect', left:297, top:235, width:460, height:38, rx:19, ry:19, fill:'rgba(56,189,248,0.12)', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'МАГИЯ КНИГИ: ТАЙНЫ И ОТКРЫТИЯ', left:297, top:225, width:440, fontSize:15, fontFamily:'Unbounded', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:425, width:515, height:270, rx:16, ry:16, fill:'rgba(19,23,38,0.85)', stroke:'rgba(138,108,255,0.4)', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'В ПРОГРАММЕ БОЛЬШОГО ВЕЧЕРА:', left:297, top:315, width:460, fontSize:16, fontFamily:'Unbounded', fontWeight:'700', fill:'#c084fc', textAlign:'center', originX:'center' },
      { type:'text', text:'✦ Литературный квест по закрытым фондам книгохранилища\n✦ Музыкально-поэтический перформанс при свечах\n✦ Экскурсия в реставрационную лабораторию редких книг\n✦ Творческая встреча с писателями и автограф-сессия\n✦ Литературная чайная, книжная ярмарка и розыгрыш призов', left:75, top:355, width:445, fontSize:14, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'left', lineHeight:1.7 },
      { type:'rect', left:297, top:610, width:420, height:50, rx:25, ry:25, fill:'rgba(251,191,36,0.15)', stroke:'#FBBF24', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'26 АПРЕЛЯ 2025  ·  18:00 – 23:00', left:297, top:598, width:400, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:165, top:665, width:170, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:350, top:665, width:190, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'12+', left:480, top:665, width:55, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#38BDF8', padding:7, textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:730, width:515, height:1, fill:'rgba(255,255,255,0.15)', originX:'center' },
      { type:'text', text:'Центральная городская библиотека «АВРОРА»\nг. Владимир, ул. Б. Московская, 12  ·  тел. 8 (4922) 32-34-56  ·  biblioteka33.ru', left:297, top:750, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 2. ЛИТЕРАТУРНАЯ ГОСТИНАЯ / СЕРЕБРЯНЫЙ ВЕК */
  {
    id: 'lit_salon_classic',
    size: 'a4_v',
    category: 'books',
    name: 'Литературная гостиная',
    desc: 'Изысканная классика с золотой рамкой и поэтической цитатой',
    fmt: 'A4',
    bg: '#121016',
    previewBg: '#121016',
    previewAccent: '#FBBF24',
    previewHtml: `
      <div class="mp-wrap" style="border:1px solid #FBBF24; padding:5px; box-sizing:border-box;">
        <div>
          <div class="mp-ornament" style="color:#FBBF24;">✦ ✦ ✦</div>
          <div class="mp-tag" style="color:#d1d5db;">ГОСТИНАЯ · 2025</div>
          <div class="mp-title" style="color:#fef3c7; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:13px; margin:2px 0;">Серебряный век:<br>Поэзия и судьбы</div>
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
      { type:'text', text:'Серебряный век:\nПоэзия, судьбы и музыка', left:297, top:135, width:480, fontSize:44, fontFamily:'Cormorant Garamond', fontStyle:'italic', fontWeight:'bold', fill:'#fef3c7', textAlign:'center', originX:'center', lineHeight:1.15 },
      { type:'text', text:'Творческий вечер, посвящённый поэтам Серебряного века', left:297, top:255, width:460, fontSize:18, fontFamily:'Playfair Display', fill:'#cbd5e1', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:380, width:450, height:130, rx:8, ry:8, fill:'rgba(255,255,255,0.03)', stroke:'rgba(251,191,36,0.3)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'«И мы сохраним тебя, русская речь,\nВеликое русское слово.\nСвободным и чистым тебя пронесём,\nИ внукам дадим, и от плена спасём навеки!»', left:297, top:330, width:420, fontSize:19, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#f1f5f9', textAlign:'center', originX:'center', lineHeight:1.45 },
      { type:'text', text:'— Анна Ахматова', left:297, top:418, width:300, fontSize:14, fontFamily:'Montserrat', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'В программе вечера:\n• Чтение шедевров поэзии под живую музыку (скрипка)\n• Редкие архивные издания, автографы и письма\n• Обсуждение произведений за чашкой ароматного кофе', left:297, top:470, width:430, fontSize:16, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.7 },
      { type:'rect', left:297, top:615, width:430, height:65, rx:6, ry:6, fill:'rgba(251,191,36,0.1)', stroke:'#FBBF24', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'14 ОКТЯБРЯ в 18:30', left:297, top:595, width:400, fontSize:24, fontFamily:'Unbounded', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'Каминный зал Центральной городской библиотеки', left:297, top:628, width:400, fontSize:13, fontFamily:'Montserrat', fill:'#fef3c7', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:210, top:685, width:180, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'16+', left:375, top:685, width:60, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#FBBF24', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Ведущий вечера: филолог М. В. Соколова  ·  Запись по тел.: 8 (4922) 32-21-45\nг. Владимир  ·  biblioteka33.ru', left:297, top:745, width:480, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 3. ДЕТСКИЙ КЛУБ ЧТЕНИЯ: СКАЗКИ НА ПОДУШКАХ */
  {
    id: 'kids_reading_club',
    size: 'square',
    category: 'kids',
    name: 'Детский клуб: Сказки на подушках',
    desc: 'Уютные семейные чтения и мастерская сказок в детском зале',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '#1a1636',
    previewBg: '#1a1636',
    previewAccent: '#f472b6',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-pill" style="background:#fde047; color:#1e1145; font-size:6px; font-weight:700;">📚 ДЕТСКИЙ КЛУБ ЧТЕНИЯ</div>
          <div class="mp-title" style="color:#ffffff; font-size:11px; text-shadow:0 2px 8px rgba(244,114,182,0.8); margin:3px 0;">СКАЗКИ НА ПОДУШКАХ</div>
          <div style="font-size:6px; color:#f472b6; font-weight:600;">Уютные семейные чтения</div>
        </div>
        <div class="mp-box" style="background:rgba(255,255,255,0.08); border:1px solid rgba(244,114,182,0.5); padding:3px;">
          <div style="font-size:6px; color:#fde047; font-weight:700;">ЧТЕНИЯ · ИГРЫ · ТВОРЧЕСТВО</div>
          <div style="font-size:5.5px; color:#ffffff; margin-top:1px;">Мастерим сказочных героев из фетра</div>
        </div>
        <div>
          <div class="mp-date" style="background:#38BDF8; color:#0f172a; font-size:6.5px; font-weight:700;">ВС · 11:30 · ДЕТСКИЙ ЗАЛ</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#34d399; color:#064e3b;">БЕСПЛАТНО</span>
            <span class="mp-badge" style="background:#ec4899; color:#ffffff;">0+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'📚 ДЕТСКИЙ КЛУБ СЕМЕЙНОГО ЧТЕНИЯ', left:350, top:35, width:440, fontSize:15, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#1e1145', backgroundColor:'#fde047', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'СКАЗКИ НА ПОДУШКАХ', left:350, top:80, width:640, fontSize:44, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center', shadow:'rgba(244,114,182,0.6) 0px 4px 20px' },
      { type:'text', text:'Уютные воскресные чтения для малышей и родителей', left:350, top:145, width:580, fontSize:18, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#f472b6', textAlign:'center', originX:'center' },
      { type:'rect', left:350, top:330, width:620, height:230, rx:18, ry:18, fill:'rgba(255,255,255,0.06)', stroke:'rgba(244,114,182,0.4)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'В ПРОГРАММЕ ВСТРЕЧИ:', left:350, top:235, width:500, fontSize:18, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#fde047', textAlign:'center', originX:'center' },
      { type:'text', text:'⭐ Читаем вслух добрые сказки писателей со всего мира\n⭐ Обсуждаем героев, фантазируем и сочиняем продолжение\n⭐ Творческая мастерская: мастерим персонажей сказок своими руками\n⭐ Тёплый травяной чай, мягкие пледы и домашнее печенье', left:350, top:280, width:570, fontSize:16, fontFamily:'Comfortaa', fill:'#f8fafc', textAlign:'left', originX:'center', lineHeight:1.7 },
      { type:'rect', left:350, top:485, width:500, height:50, rx:25, ry:25, fill:'#38BDF8', originX:'center', originY:'center' },
      { type:'text', text:'КАЖДОЕ ВОСКРЕСЕНЬЕ В 11:30', left:350, top:470, width:480, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0f172a', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:220, top:545, width:220, fontSize:14, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'ДЛЯ ДЕТЕЙ 4-9 ЛЕТ', left:435, top:545, width:190, fontSize:13, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#ec4899', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'0+', left:570, top:545, width:60, fontSize:14, fontFamily:'Comfortaa', fontWeight:'bold', fill:'#1e1145', backgroundColor:'#fde047', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Центральная детская библиотека  ·  ул. Мира, 4  ·  тел. 8 (4922) 53-12-34', left:350, top:640, width:640, fontSize:14, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'center', originX:'center' },
    ],
  },

  /* 4. КНИЖНАЯ ВЫСТАВКА / НОВЫЕ ПОСТУПЛЕНИЯ */
  {
    id: 'book_exhibition',
    size: 'a4_v',
    category: 'books',
    name: 'Книжная выставка / Новинки',
    desc: 'Журнальная верстка с обзором новинок, фондами и OPAC',
    fmt: 'A4',
    bg: '#0c1222',
    previewBg: '#0c1222',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8; border-bottom:1px solid #38BDF8; padding-bottom:1px;">ВЫСТАВКА ФОНДОВ · 2025</div>
          <div class="mp-title" style="color:#ffffff; font-size:11px; margin:3px 0 2px;">ШЕДЕВРЫ И НОВИНКИ</div>
        </div>
        <div class="mp-book-preview" style="background:#1e293b; border:1px solid #FBBF24;">
          <span style="font-size:4.5px; color:#FBBF24; font-weight:700;">РЕДКИЙ ФОНД</span>
          <span style="font-size:5.5px; color:#ffffff; font-weight:700; margin:1px 0;">Золотая полка</span>
          <span style="font-size:4px; color:#94a3b8;">Обзор куратора</span>
        </div>
        <div>
          <div style="font-size:5.5px; color:#cbd5e1; font-style:italic;">«Масштабная экспозиция книжных поступлений...»</div>
          <div class="mp-badge" style="background:#34d399; color:#064e3b; font-size:5.5px; margin-top:3px;">✓ НА АБОНЕМЕНТЕ</div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'ВЫСТАВКА НОВЫХ ПОСТУПЛЕНИЙ  ·  ЧИТАЛЬНЫЙ ЗАЛ', left:297, top:42, width:510, fontSize:12, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:140 },
      { type:'rect', left:297, top:68, width:515, height:2, fill:'#38BDF8', originX:'center' },
      { type:'text', text:'ШЕДЕВРЫ И НОВИНКИ', left:297, top:85, width:515, fontSize:44, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:270, width:210, height:260, rx:8, ry:8, fill:'#1e293b', stroke:'#FBBF24', strokeWidth:2.5, originX:'center', originY:'center', shadow:'rgba(0,0,0,0.6) 0px 10px 25px' },
      { type:'rect', left:200, top:270, width:16, height:260, fill:'rgba(251,191,36,0.3)', originX:'center', originY:'center' },
      { type:'text', text:'ЗОЛОТАЯ ПОЛКА\n\nСОКРОВИЩА\nОТЕЧЕСТВЕННОЙ\nИ МИРОВОЙ\nЛИТЕРАТУРЫ', left:297, top:185, width:170, fontSize:14, fontFamily:'Playfair Display', fontWeight:'bold', fill:'#FBBF24', textAlign:'center', originX:'center', lineHeight:1.4 },
      { type:'text', text:'«Книги, изменившие мир: от классики до современности»', left:297, top:425, width:510, fontSize:22, fontFamily:'Playfair Display', fontStyle:'italic', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:565, width:515, height:135, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'rgba(56,189,248,0.3)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'«Экспозиция объединяет лучшие литературные новинки года, лауреатов главных книжных премий, редкие подарочные фолианты и иллюстрированные альбомы по искусству. Все издания доступны читателям для работы в зале и на дом.»\n— Научный куратор выставки', left:297, top:515, width:480, fontSize:14, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text', text:'✓ ДОСТУПНО НА АБОНЕМЕНТЕ И В ЧИТАЛЬНОМ ЗАЛЕ', left:297, top:665, width:420, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Бронирование книг в каталоге: e-cat.biblioteka33.ru\nЦентральная городская библиотека «АВРОРА»  ·  ул. Б. Московская, 12', left:297, top:745, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 5. ВСТРЕЧА С ПИСАТЕЛЕМ / ЛЕКЦИЯ */
  {
    id: 'writer_meeting',
    size: 'a4_v',
    category: 'events',
    name: 'Встреча с писателем',
    desc: 'Солидный плакат с портретной рамкой, био и автограф-сессией',
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
      { type:'text', text:'Писатель, литературовед, исследователь русской классики\nЛауреат национальной литературной премии «Большая книга»', left:297, top:480, width:490, fontSize:15, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'center', originX:'center', lineHeight:1.45 },
      { type:'rect', left:297, top:580, width:515, height:95, rx:10, ry:10, fill:'rgba(252,211,77,0.08)', stroke:'rgba(252,211,77,0.35)', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'Тема лекции: «Подлинная история Анны Карениной»\nПрезентация новой книги  ·  Ответы на вопросы  ·  Автограф-сессия', left:297, top:550, width:490, fontSize:15, fontFamily:'Cormorant Garamond', fontStyle:'italic', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text', text:'19 НОЯБРЯ  ·  18:00  ·  КОНФЕРЕНЦ-ЗАЛ ЦГБ', left:297, top:645, width:460, fontSize:17, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0b1329', backgroundColor:'#fcd34d', padding:10, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:190, top:710, width:190, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:375, top:710, width:170, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'16+', left:475, top:710, width:50, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#6366f1', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'г. Владимир, ул. Б. Московская, 12  ·  Количество мест ограничено\nБесплатная регистрация: biblioteka33.ru/events', left:297, top:760, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 6. ТВОРЧЕСКИЙ МАСТЕР-КЛАСС / КАЛЛИГРАФИЯ */
  {
    id: 'craft_workshop',
    size: 'a4_v',
    category: 'events',
    name: 'Мастер-класс: Каллиграфия',
    desc: 'Практикум по рукописному письму и книжному переплету',
    fmt: 'A4',
    bg: '#131b2e',
    previewBg: '#131b2e',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">АРТ-МАСТЕРСКАЯ</div>
          <div class="mp-title" style="color:#ffffff; font-size:11px; margin:2px 0;">ИСКУССТВО<br>КАЛЛИГРАФИИ</div>
        </div>
        <div class="mp-box" style="border:1px solid rgba(56,189,248,0.4); background:rgba(255,255,255,0.05); padding:3px;">
          <div style="font-size:6px; color:#fde047; font-weight:700;">ПРАКТИКУМ ДЛЯ ВСЕХ</div>
          <div style="font-size:5.5px; color:#cbd5e1; margin-top:2px;">Широкое перо · Тушь · Создание закладки</div>
        </div>
        <div>
          <div class="mp-date" style="background:#38BDF8; color:#0b1329; font-size:6.5px; font-weight:700;">СБ · 15:00 · АРТ-ЗОНА</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#10B981; color:#070a1e;">МАТЕРИАЛЫ ВКЛЮЧЕНЫ</span>
            <span class="mp-badge" style="background:#8A6CFF; color:#ffffff;">12+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'АРТ-ПРОСТРАНСТВО БИБЛИОТЕКИ  ·  ТВОРЧЕСКИЙ ПРАКТИКУМ', left:297, top:42, width:520, fontSize:12, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:120 },
      { type:'rect', left:297, top:68, width:515, height:2, fill:'#38BDF8', originX:'center' },
      { type:'text', text:'ИСКУССТВО\nКАЛЛИГРАФИИ', left:297, top:95, width:515, fontSize:46, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.08 },
      { type:'text', text:'Древнерусская вязь и основы рукописной книги', left:297, top:215, width:490, fontSize:18, fontFamily:'Playfair Display', fontStyle:'italic', fontWeight:'bold', fill:'#fcd34d', textAlign:'center', originX:'center' },
      { type:'rect', left:297, top:380, width:515, height:220, rx:14, ry:14, fill:'rgba(255,255,255,0.05)', stroke:'rgba(56,189,248,0.3)', strokeWidth:1.5, originX:'center', originY:'center' },
      { type:'text', text:'ЧТО ВАС ЖДЁТ НА МАСТЕР-КЛАССЕ:', left:297, top:290, width:470, fontSize:16, fontFamily:'Unbounded', fontWeight:'700', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'✒️ Постановка руки и базовые штрихи ширококонечным пером\n📜 Изучение аутентичных старинных буквиц и заставок\n🎨 Работа с натуральной ореховой тушью и бумагой верже\n📖 Создание собственной каллиграфической закладки для книги', left:297, top:335, width:470, fontSize:15, fontFamily:'Montserrat', fill:'#f8fafc', textAlign:'left', originX:'center', lineHeight:1.7 },
      { type:'rect', left:297, top:550, width:460, height:50, rx:25, ry:25, fill:'#38BDF8', originX:'center', originY:'center' },
      { type:'text', text:'СУББОТА, 25 ОКТЯБРЯ В 15:00', left:297, top:538, width:440, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', textAlign:'center', originX:'center' },
      { type:'text', text:'★ МАТЕРИАЛЫ ВКЛЮЧЕНЫ', left:200, top:620, width:220, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:375, top:620, width:180, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#e11d48', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'12+', left:475, top:620, width:50, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#8A6CFF', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Мастерская ЦГБ «АВРОРА»  ·  ул. Б. Московская, 12\nПредварительная запись обязательна: biblioteka33.ru/masterclass', left:297, top:725, width:500, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 7. ИНТЕЛЛЕКТУАЛЬНЫЙ КВИЗ / ИГРОТЕКА */
  {
    id: 'biblio_quiz',
    size: 'square',
    category: 'events',
    name: 'Библио-Квиз / Турнир',
    desc: 'Стильный командный турнир эрудитов для молодежи',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '#160d2b',
    previewBg: '#160d2b',
    previewAccent: '#8A6CFF',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div style="font-size:6px; color:#facc15; font-weight:700;">▶ ТУРНИР ЗНАТОКОВ ◀</div>
          <div class="mp-title" style="color:#ffffff; font-size:12px; text-shadow:0 0 8px #8A6CFF; margin:2px 0;">БИБЛИО-КВИЗ</div>
          <div style="font-size:6px; color:#38BDF8; font-weight:700;">КНИГИ · КИНО · ЛОГИКА</div>
        </div>
        <div class="mp-box" style="border:1px solid #8A6CFF; background:rgba(138,108,255,0.12); padding:3px;">
          <div style="font-size:6px; color:#facc15; font-weight:700;">6 РАУНДОВ · ПРИЗЫ</div>
          <div style="font-size:5.5px; color:#ffffff; font-weight:600;">Команды от 2 до 6 человек</div>
        </div>
        <div>
          <div class="mp-date" style="background:#facc15; color:#14092b; font-size:6.5px; font-weight:700;">ЧЕТВЕРГ · 19:00</div>
          <div class="mp-badge-row">
            <span class="mp-badge" style="background:#34d399; color:#064e3b;">БЕСПЛАТНО</span>
            <span class="mp-badge" style="background:#8A6CFF; color:#ffffff;">14+</span>
          </div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'▶ ИНТЕЛЛЕКТУАЛЬНЫЙ ТУРНИР В БИБЛИОТЕКЕ ◀', left:350, top:40, width:560, fontSize:13, fontFamily:'Montserrat', fontWeight:'bold', fill:'#facc15', textAlign:'center', originX:'center' },
      { type:'text', text:'БИБЛИО-КВИЗ', left:350, top:80, width:640, fontSize:52, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', shadow:'rgba(138,108,255,0.8) 0px 0px 24px' },
      { type:'text', text:'БИТВА ЭРУДИТОВ: ЛИТЕРАТУРА, КИНО, НАУКА И МУЗЫКА', left:350, top:160, width:600, fontSize:17, fontFamily:'Unbounded', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect', left:350, top:330, width:620, height:210, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'#8A6CFF', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'ПРАВИЛА И ФИШКИ ИГРЫ:', left:350, top:245, width:540, fontSize:17, fontFamily:'Unbounded', fontWeight:'bold', fill:'#facc15', textAlign:'center', originX:'center' },
      { type:'text', text:'🏆 6 динамичных раундов на эрудицию, логику и скорость\n👥 Команды от 2 до 6 участников (или найдём команду на месте!)\n🎁 Книжные подарки, настольные игры и призы от партнёров\n☕ Чай, печенье и уютная атмосфера молодёжного лофта', left:350, top:295, width:560, fontSize:16, fontFamily:'Montserrat', fontWeight:'500', fill:'#f8fafc', textAlign:'left', originX:'center', lineHeight:1.7 },
      { type:'rect', left:350, top:485, width:520, height:52, rx:26, ry:26, fill:'#facc15', originX:'center', originY:'center' },
      { type:'text', text:'КАЖДЫЙ ЧЕТВЕРГ В 19:00', left:350, top:470, width:500, fontSize:22, fontFamily:'Unbounded', fontWeight:'800', fill:'#14092b', textAlign:'center', originX:'center' },
      { type:'text', text:'★ УЧАСТИЕ БЕСПЛАТНОЕ', left:230, top:545, width:240, fontSize:14, fontFamily:'Unbounded', fontWeight:'bold', fill:'#064e3b', backgroundColor:'#34d399', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'14+', left:405, top:545, width:60, fontSize:15, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#8A6CFF', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'МОЛОДЁЖЬ', left:495, top:545, width:110, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#38BDF8', padding:8, textAlign:'center', originX:'center' },
      { type:'text', text:'Молодёжный лофт ЦГБ «АВРОРА»  ·  ул. Б. Московская, 12\nРегистрация команд в группе ВК: vk.com/biblioteka33', left:350, top:635, width:640, fontSize:14, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.5 },
    ],
  },

  /* 8. КИНОЛЕКТОРИЙ В БИБЛИОТЕКЕ (16:9) */
  {
    id: 'cinema_club',
    size: 'banner',
    category: 'events',
    name: 'Кинолекторий: Кино & Книга',
    desc: 'Шедевры литературы на большом экране с обсуждением',
    fmt: '16:9',
    isLandscape: true,
    bg: '#090d18',
    previewBg: '#090d18',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap" style="flex-direction:row; align-items:center; justify-content:space-between; padding:6px 12px;">
        <div style="text-align:left; max-width:65%;">
          <div class="mp-tag" style="color:#38BDF8; font-size:5.5px;">🎬 КИНОЛЕКТОРИЙ В БИБЛИОТЕКЕ</div>
          <div class="mp-title" style="color:#ffffff; font-size:12px; margin:2px 0;">ШЕДЕВРЫ НА ЭКРАНЕ</div>
          <div style="font-size:6px; color:#fcd34d; font-style:italic;">«Мастер и Маргарита» · Разбор с киноведом</div>
        </div>
        <div style="border:1px solid #38BDF8; border-radius:6px; padding:4px 8px; text-align:center;">
          <div style="font-size:7px; color:#38BDF8; font-weight:700;">ПТ · 18:30</div>
          <div class="mp-badge" style="background:#10B981; color:#070a1e; font-size:5px; margin-top:2px;">СВОБОДНЫЙ</div>
        </div>
      </div>`,
    objects: [
      { type:'text', text:'🎬 КИНОЛЕКТОРИЙ ЦГБ «АВРОРА»  ·  СЕЗОН ЭКРАНИЗАЦИЙ', left:60, top:55, width:600, fontSize:13, fontFamily:'Montserrat', fontWeight:'bold', fill:'#38BDF8', textAlign:'left', charSpacing:120 },
      { type:'text', text:'ШЕДЕВРЫ ЛИТЕРАТУРЫ НА ЭКРАНЕ', left:60, top:90, width:650, fontSize:42, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'left', shadow:'rgba(56,189,248,0.7) 0px 0px 20px' },
      { type:'text', text:'Показ и экспертный разбор культовых киноверсий классики', left:60, top:165, width:600, fontSize:18, fontFamily:'Playfair Display', fontStyle:'italic', fill:'#fcd34d', textAlign:'left' },
      { type:'text', text:'• Вступительное слово и исторический контекст от кинокритика\n• Просмотр фильма на большом экране в высоком разрешении\n• Сравнение книги и экранизации, открытый микрофон и дискуссия', left:60, top:215, width:560, fontSize:15, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'left', lineHeight:1.7 },
      { type:'rect', left:210, top:360, width:300, height:48, rx:24, ry:24, fill:'#38BDF8', originX:'center', originY:'center' },
      { type:'text', text:'КАЖДУЮ ПЯТНИЦУ В 18:30', left:210, top:348, width:280, fontSize:16, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', textAlign:'center', originX:'center' },
      { type:'text', text:'★ ВХОД СВОБОДНЫЙ', left:410, top:360, width:170, fontSize:12, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', backgroundColor:'#10B981', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'12+', left:530, top:360, width:50, fontSize:13, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#8A6CFF', padding:7, textAlign:'center', originX:'center' },
      { type:'text', text:'Медиатека ЦГБ «АВРОРА»  ·  ул. Б. Московская, 12  ·  тел. 8 (4922) 32-34-56  ·  biblioteka33.ru', left:60, top:450, width:700, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left' },
    ],
  },

  /* 9. РЕЖИМ РАБОТЫ В ПРАЗДНИКИ */
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

  /* 10. ОФИЦИАЛЬНОЕ ОБЪЯВЛЕНИЕ / САНДЕНЬ */
  {
    id: 'library_notice',
    size: 'a4_v',
    category: 'notices',
    name: 'Официальное объявление',
    desc: 'Строгое объявление дирекции о сандне или переучёте',
    fmt: 'A4',
    bg: '#0f172a',
    previewBg: '#0f172a',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap">
        <div>
          <div class="mp-tag" style="color:#38BDF8;">ДИРЕКЦИЯ ЦГБ</div>
          <div class="mp-title" style="color:#ffffff; font-size:10px; margin:3px 0;">ОФИЦИАЛЬНОЕ ОБЪЯВЛЕНИЕ</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(56,189,248,0.3); border-radius:4px; padding:3px; margin:3px 0;">
          <div style="font-size:6.5px; color:#EF4444; font-weight:700;">САНИТАРНЫЙ ДЕНЬ</div>
          <div style="font-size:5.5px; color:#94a3b8;">Последняя пятница месяца</div>
        </div>
        <div style="font-size:6px; color:#38BDF8;">Библиотека «АВРОРА»</div>
      </div>`,
    objects: [
      { type:'rect',  left:297, top:60, width:515, height:5, fill:'#38BDF8', originX:'center' },
      { type:'text',  text:'ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА «АВРОРА»', left:297, top:85, fontSize:14, fontFamily:'Montserrat', fill:'#38BDF8', fontWeight:'bold', textAlign:'center', originX:'center', charSpacing:120 },
      { type:'text',  text:'ОФИЦИАЛЬНОЕ ОБЪЯВЛЕНИЕ', left:297, top:130, fontSize:32, fontFamily:'Unbounded', fill:'#ffffff', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:340, width:515, height:240, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'rgba(239,68,68,0.5)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text',  text:'УВАЖАЕМЫЕ ЧИТАТЕЛИ!\n\nПОСЛЕДНЯЯ ПЯТНИЦА МЕЖУЦА —\nСАНИТАРНЫЙ ДЕНЬ\n\nОбслуживание читателей в отделах не производится.\nПриносим извинения за временные неудобства!', left:297, top:250, fontSize:18, fontFamily:'Montserrat', fontWeight:'600', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.7 },
      { type:'text',  text:'Дата санитарного дня:', left:297, top:490, fontSize:15, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'text',  text:'«___» ____________ 2025 г.', left:297, top:520, fontSize:22, fontFamily:'Unbounded', fill:'#fcd34d', fontWeight:'bold', textAlign:'center', originX:'center' },
      { type:'text',  text:'🔔 Сдать книги можно круглосуточно через уличный терминал возврата.\nЖдём вас в следующий рабочий день с 10:00!', left:297, top:610, fontSize:15, fontFamily:'Montserrat', fontStyle:'italic', fill:'#10B981', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text',  text:'Дирекция ЦГБ  ·  Справки: 8 (4922) 32-34-56  ·  biblioteka33.ru', left:297, top:740, fontSize:13, fontFamily:'Montserrat', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'rect',  left:297, top:770, width:515, height:5, fill:'#38BDF8', originX:'center' },
    ],
  },

  /* 11. БАННЕР СООБЩЕСТВА ВК (16:9) */
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

  /* 12. ВЫВЕСКА БИБЛИОТЕКИ */
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

  /* 13. ЧИСТЫЙ ЛИСТ A4 ВЕРТИКАЛЬ */
  {
    id: 'blank_a4_v',
    size: 'a4_v',
    category: 'blank',
    name: 'Чистый лист A4 (Прозрачный)',
    desc: 'Вертикальный формат 595 × 842 pt · Прозрачный холст',
    fmt: 'A4',
    bg: '',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">texture</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">A4 вертикаль · Прозрачный</span>
      </div>`,
    objects: [],
  },

  /* 14. ЧИСТЫЙ ЛИСТ A4 ГОРИЗОНТАЛЬ */
  {
    id: 'blank_a4_h',
    size: 'a4_h',
    category: 'blank',
    name: 'Чистый лист A4 горизонт (Прозрачный)',
    desc: 'Горизонтальный формат 842 × 595 pt · Прозрачный холст',
    fmt: 'A4',
    isLandscape: true,
    bg: '',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">texture</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">A4 горизонт · Прозрачный</span>
      </div>`,
    objects: [],
  },

  /* 15. ЧИСТЫЙ ЛИСТ КВАДРАТ (ВК) */
  {
    id: 'blank_square',
    size: 'square',
    category: 'blank',
    name: 'Чистый лист Квадрат (ВК)',
    desc: 'Формат 1:1 для постов ВКонтакте 700 × 700 pt · Прозрачный холст',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">texture</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">1:1 (ВК) · Прозрачный</span>
      </div>`,
    objects: [],
  },

  /* 16. ЧИСТЫЙ ЛИСТ БАННЕР 16:9 */
  {
    id: 'blank_banner',
    size: 'banner',
    category: 'blank',
    name: 'Чистый лист Баннер 16:9',
    desc: 'Горизонтальный экранный баннер 960 × 540 pt · Прозрачный холст',
    fmt: '16:9',
    isLandscape: true,
    bg: '',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">texture</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">16:9 · Прозрачный</span>
      </div>`,
    objects: [],
  },

  /* 17. ЧИСТЫЙ ЛИСТ СТОРИС 9:16 */
  {
    id: 'blank_story',
    size: 'story',
    category: 'blank',
    name: 'Чистый лист Сторис 9:16',
    desc: 'Вертикальный формат для сторис ВК 540 × 960 pt · Прозрачный холст',
    fmt: '9:16',
    bg: '',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">texture</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">9:16 · Прозрачный</span>
      </div>`,
    objects: [],
  },

  /* 18. ЧИСТЫЙ ЛИСТ TILDA ЛЕНДИНГ 1200×2400 */
  {
    id: 'blank_tilda_landing',
    size: 'tilda_landing',
    category: 'blank',
    name: 'Чистый Tilda Лендинг',
    desc: 'Формат веб-страницы 1200 × 2400 px для Zero Blocks',
    fmt: 'Tilda 1200px',
    bg: '#070a1e',
    previewBg: '#070a1e',
    previewAccent: '#818cf8',
    previewHtml: `
      <div class="mp-blank" style="background:#070a1e;">
        <span class="material-symbols-rounded" style="font-size:22px; color:#818cf8; opacity:0.8;">web</span>
        <span style="font-size:7.5px; font-weight:700; color:#818cf8; margin-top:3px;">TILDA ЛЕНДИНГ</span>
        <span style="font-size:6px; color:#94a3b8;">1200 × 2400 px</span>
      </div>`,
    objects: [],
  },
];

/* ──────────────────────── TILDA ШАБЛОНЫ ───────────────────────── */
/* Отдельный массив, смержированный с TEMPLATES при инициализации    */
const TILDA_TEMPLATES = [
  /* T0. ПОЛНОЦЕННЫЙ ЛЕНДИНГ ИЗ 6 БЛОКОВ (FIGMA & TILDA READY) */
  {
    id: 'tilda_landing_full',
    size: 'tilda_landing',
    category: 'tilda',
    name: 'Tilda: Полный лендинг (6 блоков)',
    desc: 'Комплексный веб-сайт из 6 визуально разделенных блоков для Tilda и Figma: Шапка, Hero, 3 карточки услуг, Афиша, Форма записи, Подвал',
    fmt: 'Tilda Landing',
    isTilda: true,
    bg: '#070a1e',
    previewBg: '#070a1e',
    previewAccent: '#818cf8',
    previewHtml: `
      <div class="mp-wrap" style="background:#070a1e; padding:3px; gap:2px; height:100%; justify-content:space-between; box-sizing:border-box;">
        <!-- Блок 1: Меню -->
        <div style="background:#0b1120; border:1px solid rgba(56,189,248,0.4); border-radius:2px; padding:1px 3px;">
          <div style="font-size:3.5px; color:#38BDF8; font-weight:800; display:flex; justify-content:space-between;">
            <span>[1] ШАПКА / МЕНЮ</span>
            <span>✦ АВРОРА</span>
          </div>
        </div>
        <!-- Разделитель 1-2 -->
        <div style="border-top:1px dashed #38BDF8; margin:0 2px;"></div>
        <!-- Блок 2: Hero -->
        <div style="background:linear-gradient(135deg,#0d163a,#070a1e); border:1px solid rgba(56,189,248,0.3); border-radius:3px; padding:2px; text-align:center;">
          <div style="font-size:3.5px; color:#38BDF8; font-weight:700;">[2] COVER / HERO · ГЛАВНЫЙ ЭКРАН</div>
          <div style="font-size:6.5px; font-weight:800; color:#fff; margin:1px 0; line-height:1.1;">СОВРЕМЕННАЯ БИБЛИОТЕКА</div>
          <div style="font-size:3.5px; color:#94a3b8;">120 000+ книг · Коворкинг · События</div>
        </div>
        <!-- Разделитель 2-3 -->
        <div style="border-top:1px dashed #FBBF24; margin:0 2px;"></div>
        <!-- Блок 3: 3 карточки -->
        <div style="background:#0c122c; border:1px solid rgba(251,191,36,0.3); border-radius:2px; padding:2px;">
          <div style="font-size:3.5px; color:#FBBF24; font-weight:700; text-align:center;">[3] ПРЕИМУЩЕСТВА (3 КОЛОНКИ)</div>
          <div style="display:flex; gap:2px; margin-top:1px;">
            <div style="flex:1; background:#111832; border-radius:1px; padding:1px; text-align:center; font-size:3px; color:#fff;">📚 Фонд</div>
            <div style="flex:1; background:#111832; border-radius:1px; padding:1px; text-align:center; font-size:3px; color:#fff;">💻 Коворкинг</div>
            <div style="flex:1; background:#111832; border-radius:1px; padding:1px; text-align:center; font-size:3px; color:#fff;">🎭 Лекторий</div>
          </div>
        </div>
        <!-- Разделитель 3-4 -->
        <div style="border-top:1px dashed #F472B6; margin:0 2px;"></div>
        <!-- Блок 4: Афиша -->
        <div style="background:#0f172a; border:1px solid rgba(244,114,182,0.3); border-radius:2px; padding:2px;">
          <div style="font-size:3.5px; font-weight:700; color:#F472B6;">[4] АФИША МЕРОПРИЯТИЙ</div>
          <div style="font-size:3px; color:#cbd5e1; margin-top:1px;">26 АПР · Библионочь 2025 | 14 МАЯ · Литературная гостиная</div>
        </div>
        <!-- Разделитель 4-5 -->
        <div style="border-top:1px dashed #38BDF8; margin:0 2px;"></div>
        <!-- Блок 5: Лид-форма -->
        <div style="background:#0e1436; border:1px solid rgba(56,189,248,0.4); border-radius:2px; padding:2px 3px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:3.5px; font-weight:700; color:#38BDF8;">[5] ОНЛАЙН-РЕГИСТРАЦИЯ (CTA)</div>
            <div style="font-size:3px; color:#fff;">Читательский билет за 1 минуту</div>
          </div>
          <span style="background:#38BDF8; color:#070a1e; font-size:3px; font-weight:700; padding:1px 2px; border-radius:1px;">Получить ➔</span>
        </div>
        <!-- Разделитель 5-6 -->
        <div style="border-top:1px dashed #818cf8; margin:0 2px;"></div>
        <!-- Блок 6: Подвал -->
        <div style="background:#04060e; border:1px solid rgba(129,140,248,0.3); border-radius:2px; padding:1px 3px; display:flex; justify-content:space-between; font-size:3px; color:#64748b;">
          <span style="color:#818cf8; font-weight:700;">[6] ПОДВАЛ И КОНТАКТЫ</span>
          <span>г. Владимир, Б. Московская, 12</span>
        </div>
      </div>`,
    objects: [
      /* ══════════════════════════════════════════════════════════
         [БЛОК 1: Header] Навигация и меню (y: 0 ... 70 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:35, width:1200, height:70, fill:'#090e1f', originX:'center', originY:'center', blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Фон меню' },
      { type:'text', text:'✦ АВРОРА', left:80, top:22, fontSize:22, fontFamily:'Unbounded', fontWeight:'800', fill:'#38BDF8', textAlign:'left', blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Логотип АВРОРА' },
      { type:'text', text:'БИБЛИОТЕКА №33', left:235, top:28, fontSize:11, fontFamily:'Montserrat', fontWeight:'600', fill:'#64748b', textAlign:'left', charSpacing:100, blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Подпись логотипа' },
      { type:'text', text:'О библиотеке       Мероприятия       Книжный фонд       Коворкинг       Контакты', left:630, top:27, width:600, fontSize:13, fontFamily:'Montserrat', fontWeight:'500', fill:'#cbd5e1', textAlign:'center', originX:'center', blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Пункты меню' },
      { type:'rect', left:1070, top:35, width:180, height:40, rx:20, ry:20, fill:'#38BDF8', originX:'center', originY:'center', blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Фон кнопки билета' },
      { type:'text', text:'Читательский билет', left:1070, top:26, width:170, fontSize:12, fontFamily:'Unbounded', fontWeight:'700', fill:'#070a1e', textAlign:'center', originX:'center', blockId:'block_header', blockTitle:'[Блок 1: Header] Навигация и меню', layerName:'[Шапка] Текст кнопки билета' },

      /* ── Разделитель Блока 1 и Блока 2 ── */
      { type:'rect', left:600, top:70, width:1200, height:2, fill:'rgba(56,189,248,0.5)', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Линия границы 1-2' },
      { type:'rect', left:600, top:70, width:260, height:20, rx:10, ry:10, fill:'#070a1e', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Бейдж границы 2' },
      { type:'text', text:'▼ БЛОК 02 · COVER / HERO ▼', left:600, top:64, width:250, fontSize:9, fontFamily:'Unbounded', fontWeight:'700', fill:'#38BDF8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Метка блока 2' },

      /* ══════════════════════════════════════════════════════════
         [БЛОК 2: Hero] Главная обложка (y: 70 ... 650 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:360, width:1200, height:580, fill:'#070a1e', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Фон секции' },
      { type:'circle', left:600, top:320, radius:260, fill:'rgba(56,189,248,0.05)', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Неоновое свечение' },
      { type:'rect', left:600, top:125, width:440, height:32, rx:16, ry:16, fill:'rgba(56,189,248,0.12)', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Рамка тега' },
      { type:'text', text:'✦ ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА ✦', left:600, top:116, width:420, fontSize:12, fontFamily:'Montserrat', fontWeight:'700', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:160, blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Текст тега' },
      { type:'text', text:'Пространство знаний,\nвдохновения и живого общения', left:600, top:175, width:1040, fontSize:52, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.12, shadow:'rgba(56,189,248,0.4) 0px 4px 28px', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Главный заголовок' },
      { type:'text', text:'Более 120 000 книг, современный коворкинг с Wi-Fi, лекторий, редкий фонд и более 400 культурных событий в год для читателей всех возрастов в самом сердце города.', left:600, top:320, width:880, fontSize:17, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.6, blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Описание' },
      { type:'rect', left:470, top:415, width:250, height:56, rx:28, ry:28, fill:'#38BDF8', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Кнопка 1 фон' },
      { type:'text', text:'Записаться в библиотеку →', left:470, top:403, width:240, fontSize:14, fontFamily:'Unbounded', fontWeight:'700', fill:'#070a1e', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Кнопка 1 текст' },
      { type:'rect', left:740, top:415, width:250, height:56, rx:28, ry:28, fill:'transparent', stroke:'#FBBF24', strokeWidth:2, originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Кнопка 2 фон' },
      { type:'text', text:'Каталог книг онлайн 📖', left:740, top:403, width:240, fontSize:14, fontFamily:'Unbounded', fontWeight:'700', fill:'#FBBF24', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Кнопка 2 текст' },
      { type:'rect', left:600, top:540, width:1040, height:90, rx:18, ry:18, fill:'rgba(15,23,42,0.85)', stroke:'rgba(56,189,248,0.25)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Подложка статистики' },
      { type:'text', text:'120 000+', left:240, top:512, width:200, fontSize:26, fontFamily:'Unbounded', fontWeight:'800', fill:'#38BDF8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 1 цифра' },
      { type:'text', text:'книг в фонде', left:240, top:548, width:200, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 1 текст' },
      { type:'rect', left:360, top:540, width:1, height:50, fill:'rgba(255,255,255,0.1)', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Разделитель стат 1' },
      { type:'text', text:'450+', left:480, top:512, width:200, fontSize:26, fontFamily:'Unbounded', fontWeight:'800', fill:'#FBBF24', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 2 цифра' },
      { type:'text', text:'событий в год', left:480, top:548, width:200, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 2 текст' },
      { type:'rect', left:600, top:540, width:1, height:50, fill:'rgba(255,255,255,0.1)', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Разделитель стат 2' },
      { type:'text', text:'100% БЕСПЛАТНО', left:720, top:515, width:200, fontSize:18, fontFamily:'Unbounded', fontWeight:'800', fill:'#10B981', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 3 цифра' },
      { type:'text', text:'по читательскому билету', left:720, top:548, width:220, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 3 текст' },
      { type:'rect', left:840, top:540, width:1, height:50, fill:'rgba(255,255,255,0.1)', originX:'center', originY:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Разделитель стат 3' },
      { type:'text', text:'10:00 – 21:00', left:960, top:512, width:200, fontSize:22, fontFamily:'Unbounded', fontWeight:'800', fill:'#c084fc', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 4 цифра' },
      { type:'text', text:'без перерыва (Вт–Вс)', left:960, top:548, width:200, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', blockId:'block_hero', blockTitle:'[Блок 2: Hero] Главная обложка', layerName:'[Hero] Стат 4 текст' },

      /* ── Разделитель Блока 2 и Блока 3 ── */
      { type:'rect', left:600, top:650, width:1200, height:2, fill:'rgba(251,191,36,0.5)', originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Линия границы 2-3' },
      { type:'rect', left:600, top:650, width:330, height:22, rx:11, ry:11, fill:'#0c122c', stroke:'#FBBF24', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Бейдж границы 3' },
      { type:'text', text:'▼ БЛОК 03 · ПРЕИМУЩЕСТВА (3 КОЛОНКИ) ▼', left:600, top:644, width:320, fontSize:8.5, fontFamily:'Unbounded', fontWeight:'700', fill:'#FBBF24', textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Метка блока 3' },

      /* ══════════════════════════════════════════════════════════
         [БЛОК 3: Features] 3 карточки услуг (y: 650 ... 1120 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:885, width:1200, height:470, fill:'#0c122c', originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Фон секции' },
      { type:'text', text:'✦ ВОЗМОЖНОСТИ БИБЛИОТЕКИ ✦', left:600, top:685, width:600, fontSize:12, fontFamily:'Montserrat', fontWeight:'700', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:140, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Надзаголовок' },
      { type:'text', text:'Всё для чтения, саморазвития и проектов', left:600, top:710, width:800, fontSize:32, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Заголовок' },
      // Карточка 1 (Фонд)
      { type:'rect', left:260, top:920, width:320, height:310, rx:16, ry:16, fill:'#111832', stroke:'rgba(56,189,248,0.25)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 1 фон' },
      { type:'text', text:'📚', left:260, top:795, fontSize:44, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 1 иконка' },
      { type:'text', text:'Книжный фонд\nи электронный OPAC', left:260, top:855, width:280, fontSize:18, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.25, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 1 заголовок' },
      { type:'text', text:'Классика, новинки бестселлеров, научная литература, редкие фолианты и полнотекстовый электронный каталог с поиском онлайн.', left:260, top:920, width:270, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.6, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 1 текст' },
      { type:'text', text:'120 000+ ЭКЗЕМПЛЯРОВ', left:260, top:1025, width:240, fontSize:10, fontFamily:'Unbounded', fontWeight:'700', fill:'#38BDF8', backgroundColor:'rgba(56,189,248,0.12)', padding:6, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 1 бейдж' },
      // Карточка 2 (Коворкинг)
      { type:'rect', left:600, top:920, width:320, height:310, rx:16, ry:16, fill:'#111832', stroke:'rgba(251,191,36,0.35)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 2 фон' },
      { type:'text', text:'💻', left:600, top:795, fontSize:44, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 2 иконка' },
      { type:'text', text:'Коворкинг\nи цифровая зона', left:600, top:855, width:280, fontSize:18, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.25, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 2 заголовок' },
      { type:'text', text:'Бесплатный скоростной Wi-Fi, розетки у каждого места, тихие залы для учёбы и работы, ПК с доступом к базам НЭБ и Президентской библиотеке.', left:600, top:920, width:270, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.6, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 2 текст' },
      { type:'text', text:'ТИХАЯ ЗОНА С РОЗЕТКАМИ', left:600, top:1025, width:240, fontSize:10, fontFamily:'Unbounded', fontWeight:'700', fill:'#FBBF24', backgroundColor:'rgba(251,191,36,0.12)', padding:6, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 2 бейдж' },
      // Карточка 3 (Лекторий)
      { type:'rect', left:940, top:920, width:320, height:310, rx:16, ry:16, fill:'#111832', stroke:'rgba(192,132,252,0.3)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 3 фон' },
      { type:'text', text:'🎭', left:940, top:795, fontSize:44, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 3 иконка' },
      { type:'text', text:'Лекторий, клубы\nи мастер-классы', left:940, top:855, width:280, fontSize:18, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.25, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 3 заголовок' },
      { type:'text', text:'Книжный клуб по четвергам, языковые разговорные встречи, кинопоказы с обсуждением, выставки художников и лекции ученых.', left:940, top:920, width:270, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.6, blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 3 текст' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА 14+', left:940, top:1025, width:240, fontSize:10, fontFamily:'Unbounded', fontWeight:'700', fill:'#c084fc', backgroundColor:'rgba(192,132,252,0.12)', padding:6, textAlign:'center', originX:'center', blockId:'block_features', blockTitle:'[Блок 3: Features] 3 карточки услуг', layerName:'[Features] Карточка 3 бейдж' },

      /* ── Разделитель Блока 3 и Блока 4 ── */
      { type:'rect', left:600, top:1120, width:1200, height:2, fill:'rgba(244,114,182,0.5)', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Линия границы 3-4' },
      { type:'rect', left:600, top:1120, width:280, height:22, rx:11, ry:11, fill:'#070a1e', stroke:'#F472B6', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Бейдж границы 4' },
      { type:'text', text:'▼ БЛОК 04 · АФИША И СОБЫТИЯ ▼', left:600, top:1114, width:270, fontSize:8.5, fontFamily:'Unbounded', fontWeight:'700', fill:'#F472B6', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Метка блока 4' },

      /* ══════════════════════════════════════════════════════════
         [БЛОК 4: Events] Афиша мероприятий (y: 1120 ... 1620 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:1370, width:1200, height:500, fill:'#070a1e', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Фон секции' },
      { type:'text', text:'✦ КУЛЬТУРНАЯ ПРОГРАММА ✦', left:600, top:1150, width:600, fontSize:12, fontFamily:'Montserrat', fontWeight:'700', fill:'#F472B6', textAlign:'center', originX:'center', charSpacing:140, blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Надзаголовок' },
      { type:'text', text:'Ближайшие события месяца', left:600, top:1175, width:800, fontSize:32, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Заголовок' },
      // Событие 1
      { type:'rect', left:600, top:1295, width:1040, height:110, rx:16, ry:16, fill:'rgba(15,23,42,0.9)', stroke:'rgba(56,189,248,0.3)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Карточка 1 фон' },
      { type:'rect', left:175, top:1295, width:140, height:80, rx:12, ry:12, fill:'rgba(56,189,248,0.15)', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Дата 1 подложка' },
      { type:'text', text:'26 АПРЕЛЯ\n18:00', left:175, top:1275, width:130, fontSize:16, fontFamily:'Unbounded', fontWeight:'800', fill:'#38BDF8', textAlign:'center', originX:'center', lineHeight:1.15, blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Дата 1 текст' },
      { type:'text', text:'Библионочь 2025: «Магия книги и космос науки»', left:265, top:1262, width:560, fontSize:20, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'left', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Заголовок 1' },
      { type:'text', text:'Квесты по закрытым фондам, поэтический перформанс, реставрация редких книг, чайная', left:265, top:1300, width:560, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Описание 1' },
      { type:'text', text:'ВХОД СВОБОДНЫЙ', left:955, top:1265, width:150, fontSize:11, fontFamily:'Unbounded', fontWeight:'700', fill:'#10B981', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Бейдж 1' },
      { type:'rect', left:955, top:1315, width:150, height:42, rx:21, ry:21, fill:'#38BDF8', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Кнопка 1 фон' },
      { type:'text', text:'Записаться →', left:955, top:1306, width:140, fontSize:12, fontFamily:'Unbounded', fontWeight:'700', fill:'#070a1e', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Кнопка 1 текст' },
      // Событие 2
      { type:'rect', left:600, top:1435, width:1040, height:110, rx:16, ry:16, fill:'rgba(15,23,42,0.9)', stroke:'rgba(244,114,182,0.3)', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Карточка 2 фон' },
      { type:'rect', left:175, top:1435, width:140, height:80, rx:12, ry:12, fill:'rgba(244,114,182,0.15)', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Дата 2 подложка' },
      { type:'text', text:'14 МАЯ\n19:00', left:175, top:1415, width:130, fontSize:16, fontFamily:'Unbounded', fontWeight:'800', fill:'#F472B6', textAlign:'center', originX:'center', lineHeight:1.15, blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Дата 2 текст' },
      { type:'text', text:'Литературная гостиная: «Серебряный век: поэзия и судьбы»', left:265, top:1402, width:560, fontSize:20, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'left', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Заголовок 2' },
      { type:'text', text:'Чтение стихов Ахматовой и Гумилева под скрипку, редкие автографы, обсуждение за кофе', left:265, top:1440, width:560, fontSize:13, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Описание 2' },
      { type:'text', text:'ПУШКИНСКАЯ КАРТА', left:955, top:1405, width:160, fontSize:11, fontFamily:'Unbounded', fontWeight:'700', fill:'#F472B6', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Бейдж 2' },
      { type:'rect', left:955, top:1455, width:150, height:42, rx:21, ry:21, fill:'#F472B6', originX:'center', originY:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Кнопка 2 фон' },
      { type:'text', text:'Записаться →', left:955, top:1446, width:140, fontSize:12, fontFamily:'Unbounded', fontWeight:'700', fill:'#ffffff', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Кнопка 2 текст' },
      { type:'text', text:'Смотреть все 18 событий месяца в календаре →', left:600, top:1545, width:500, fontSize:14, fontFamily:'Montserrat', fontWeight:'600', fill:'#38BDF8', textAlign:'center', originX:'center', blockId:'block_events', blockTitle:'[Блок 4: Events] Афиша мероприятий', layerName:'[Events] Ссылка на все события' },

      /* ── Разделитель Блока 4 и Блока 5 ── */
      { type:'rect', left:600, top:1620, width:1200, height:2, fill:'rgba(56,189,248,0.5)', originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Линия границы 4-5' },
      { type:'rect', left:600, top:1620, width:340, height:22, rx:11, ry:11, fill:'#0d1433', stroke:'#38BDF8', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Бейдж границы 5' },
      { type:'text', text:'▼ БЛОК 05 · ОНЛАЙН-ЗАПИСЬ (ЛИД-ФОРМА) ▼', left:600, top:1614, width:330, fontSize:8.5, fontFamily:'Unbounded', fontWeight:'700', fill:'#38BDF8', textAlign:'center', originX:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Метка блока 5' },

      /* ══════════════════════════════════════════════════════════
         [БЛОК 5: CTA] Оформление билета онлайн (y: 1620 ... 2050 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:1835, width:1200, height:430, fill:'#0d1433', originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Фон секции' },
      { type:'rect', left:600, top:1835, width:1040, height:350, rx:24, ry:24, fill:'#131b34', stroke:'rgba(56,189,248,0.4)', strokeWidth:2, originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Рамка формы' },
      { type:'text', text:'✦ ОНЛАЙН-РЕГИСТРАЦИЯ ЧИТАТЕЛЯ ✦', left:600, top:1700, width:500, fontSize:12, fontFamily:'Montserrat', fontWeight:'700', fill:'#FBBF24', textAlign:'center', originX:'center', charSpacing:140, blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Тег' },
      { type:'text', text:'Оформите читательский билет онлайн за 1 минуту', left:600, top:1730, width:880, fontSize:32, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Заголовок' },
      { type:'text', text:'Электронный билет даёт доступ ко всем залам библиотеки, бронированию книг через сайт,\nбесплатной подписке ЛитРес Библиотека и участию во всех закрытых мероприятиях.', left:600, top:1785, width:840, fontSize:14, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center', lineHeight:1.6, blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Описание' },
      { type:'rect', left:360, top:1880, width:300, height:54, rx:12, ry:12, fill:'#1e293b', stroke:'rgba(255,255,255,0.15)', strokeWidth:1, originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Поле Имя' },
      { type:'text', text:'Иван Иванов', left:235, top:1870, width:260, fontSize:14, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'left', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Текст инпута 1' },
      { type:'rect', left:680, top:1880, width:300, height:54, rx:12, ry:12, fill:'#1e293b', stroke:'rgba(255,255,255,0.15)', strokeWidth:1, originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Поле Телефон' },
      { type:'text', text:'+7 (999) 000-00-00', left:555, top:1870, width:260, fontSize:14, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'left', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Текст инпута 2' },
      { type:'rect', left:920, top:1880, width:140, height:54, rx:12, ry:12, fill:'#38BDF8', originX:'center', originY:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Кнопка отправить' },
      { type:'text', text:'Получить ➔', left:920, top:1870, width:130, fontSize:14, fontFamily:'Unbounded', fontWeight:'700', fill:'#070a1e', textAlign:'center', originX:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Текст кнопки отправить' },
      { type:'text', text:'Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Билет оформляется бесплатно.', left:600, top:1940, width:700, fontSize:11, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center', blockId:'block_cta', blockTitle:'[Блок 5: CTA] Оформление билета онлайн', layerName:'[CTA] Сноска' },

      /* ── Разделитель Блока 5 и Блока 6 ── */
      { type:'rect', left:600, top:2050, width:1200, height:2, fill:'rgba(129,140,248,0.5)', originX:'center', originY:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Линия границы 5-6' },
      { type:'rect', left:600, top:2050, width:280, height:22, rx:11, ry:11, fill:'#04060f', stroke:'#818cf8', strokeWidth:1.5, originX:'center', originY:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Бейдж границы 6' },
      { type:'text', text:'▼ БЛОК 06 · ПОДВАЛ И КОНТАКТЫ ▼', left:600, top:2044, width:270, fontSize:8.5, fontFamily:'Unbounded', fontWeight:'700', fill:'#818cf8', textAlign:'center', originX:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Метка блока 6' },

      /* ══════════════════════════════════════════════════════════
         [БЛОК 6: Footer] Контакты и подвал (y: 2050 ... 2400 px)
         ══════════════════════════════════════════════════════════ */
      { type:'rect', left:600, top:2225, width:1200, height:350, fill:'#04060e', originX:'center', originY:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Фон подвала' },
      { type:'text', text:'✦ АВРОРА', left:220, top:2090, width:280, fontSize:24, fontFamily:'Unbounded', fontWeight:'800', fill:'#38BDF8', textAlign:'left', originX:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Логотип' },
      { type:'text', text:'Центральная городская библиотека г. Владимира.\nСовременный культурно-образовательный центр.', left:220, top:2130, width:280, fontSize:12, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left', originX:'center', lineHeight:1.6, blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Описание' },
      { type:'text', text:'АДРЕС И РЕЖИМ', left:530, top:2090, width:260, fontSize:13, fontFamily:'Unbounded', fontWeight:'700', fill:'#FBBF24', textAlign:'left', originX:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Заголовок 2' },
      { type:'text', text:'г. Владимир, ул. Б. Московская, 12\n\nВт–Вс: 10:00 – 21:00\nПонедельник — выходной', left:530, top:2125, width:260, fontSize:12, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'left', originX:'center', lineHeight:1.6, blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Текст 2' },
      { type:'text', text:'СВЯЗЬ И СОЦСЕТИ', left:810, top:2090, width:240, fontSize:13, fontFamily:'Unbounded', fontWeight:'700', fill:'#38BDF8', textAlign:'left', originX:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Заголовок 3' },
      { type:'text', text:'тел. 8 (4922) 32-34-56\nemail: info@biblioteka33.ru\nсайт: biblioteka33.ru\nВКонтакте: vk.com/biblioteka33', left:810, top:2125, width:240, fontSize:12, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'left', originX:'center', lineHeight:1.6, blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Текст 3' },
      { type:'rect', left:1040, top:2150, width:180, height:80, rx:12, ry:12, fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.1)', strokeWidth:1, originX:'center', originY:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Бейдж фон' },
      { type:'text', text:'🔷 TILDA READY\n❖ FIGMA READY', left:1040, top:2130, width:170, fontSize:12, fontFamily:'Unbounded', fontWeight:'700', fill:'#818cf8', textAlign:'center', originX:'center', lineHeight:1.4, blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Бейдж текст' },
      { type:'rect', left:600, top:2310, width:1040, height:1, fill:'rgba(255,255,255,0.06)', originX:'center', originY:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Линия копирайта' },
      { type:'text', text:'© 2025 МБУК «Центральная городская библиотека». Все права защищены. Экспортируемо в Figma и Tilda Zero Block.', left:600, top:2335, width:900, fontSize:11, fontFamily:'Montserrat', fill:'#475569', textAlign:'center', originX:'center', blockId:'block_footer', blockTitle:'[Блок 6: Footer] Контакты и подвал', layerName:'[Footer] Копирайт' },
    ],
  },


  /* T1. COVER-СЕКЦИЯ САЙТА БИБЛИОТЕКИ АВРОРА */
  {
    id: 'tilda_cover_aurora',
    size: 'tilda_cover',
    category: 'tilda',
    name: 'Tilda: Обложка сайта Аврора',
    desc: 'Hero Cover для главной страницы сайта библиотеки, Full HD 16:9',
    fmt: 'Tilda Cover',
    isLandscape: true,
    isTilda: true,
    bg: '#070a1e',
    previewBg: '#070a1e',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-wrap" style="background:linear-gradient(135deg,#070a1e,#131c3d); padding:4px;">
        <div>
          <div class="mp-tag" style="color:#38BDF8; font-size:5.5px; letter-spacing:0.08em;">📖 ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА</div>
          <div class="mp-title mp-glow" style="color:#fff; font-size:14px; line-height:1.1; margin:2px 0; text-shadow:0 0 12px rgba(56,189,248,0.7);">АВРОРА</div>
          <div style="font-size:6.5px; color:#94a3b8; margin-bottom:2px;">г. Владимир · biblioteka33.ru</div>
          <div style="display:flex; gap:3px; justify-content:center;">
            <span class="mp-badge" style="background:#38BDF8; color:#070a1e; font-size:5px;">КНИГИ</span>
            <span class="mp-badge" style="background:#8A6CFF; color:#fff; font-size:5px;">СОБЫТИЯ</span>
            <span class="mp-badge" style="background:#FBBF24; color:#070a1e; font-size:5px;">ОНЛАЙН</span>
          </div>
        </div>
      </div>`,

    objects: [
      { type:'rect', left:640, top:360, width:1280, height:720, fill:'#070a1e', originX:'center', originY:'center' },
      { type:'rect', left:640, top:360, width:1280, height:720, fill:'rgba(0,0,0,0)', originX:'center', originY:'center',
        gradient:{ type:'linear', coords:{x1:0,y1:0,x2:0,y2:1}, colorStops:[{offset:0,color:'rgba(13,22,57,0.9)'},{offset:1,color:'rgba(7,10,30,0.95)'}] } },
      { type:'text', text:'📖  ЦЕНТРАЛЬНАЯ ГОРОДСКАЯ БИБЛИОТЕКА', left:640, top:155, width:1160, fontSize:20, fontFamily:'Montserrat', fontWeight:'600', fill:'#38BDF8', textAlign:'center', originX:'center', charSpacing:220 },
      { type:'rect', left:640, top:195, width:800, height:2, fill:'#38BDF8', originX:'center', shadow:'rgba(56,189,248,0.8) 0px 0px 20px' },
      { type:'text', text:'АВРОРА', left:640, top:240, width:1200, fontSize:148, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'center', originX:'center', letterSpacing:30, shadow:'rgba(56,189,248,0.6) 0px 0px 48px' },
      { type:'text', text:'Место, где знания встречаются с вдохновением', left:640, top:430, width:950, fontSize:32, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#cbd5e1', textAlign:'center', originX:'center' },
      { type:'rect', left:640, top:525, width:950, height:1.5, fill:'rgba(56,189,248,0.3)', originX:'center' },
      { type:'text', text:'г. Владимир · ул. Б. Московская, 12', left:640, top:550, width:700, fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'rect', left:415, top:635, width:240, height:56, rx:28, ry:28, fill:'#38BDF8', originX:'center', originY:'center' },
      { type:'text', text:'Узнать больше →', left:415, top:623, width:220, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#070a1e', textAlign:'center', originX:'center' },
      { type:'rect', left:700, top:635, width:260, height:56, rx:28, ry:28, fill:'transparent', stroke:'#38BDF8', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'Каталог онлайн', left:700, top:623, width:240, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center' },
      { type:'text', text:'biblioteka33.ru', left:940, top:635, width:220, fontSize:18, fontFamily:'Montserrat', fill:'#64748b', textAlign:'center', originX:'center' },
    ],
  },

  /* T2. HERO-СЕКЦИЯ АНОНСА СОБЫТИЯ */
  {
    id: 'tilda_event_hero',
    size: 'tilda_hero',
    category: 'tilda',
    name: 'Tilda: Анонс события (Hero)',
    desc: 'Горизонтальная Hero-секция с анонсом мероприятия для Tilda-сайта',
    fmt: 'Tilda Hero',
    isLandscape: true,
    isTilda: true,
    bg: '#0c1222',
    previewBg: '#0c1222',
    previewAccent: '#F472B6',
    previewHtml: `
      <div class="mp-wrap" style="background:#0c1222; flex-direction:row; gap:4px; padding:4px; align-items:center;">
        <div style="flex:1.3; text-align:left; padding:2px;">
          <div style="font-size:5px; color:#F472B6; font-weight:700; letter-spacing:0.1em; margin-bottom:1px;">✦ СОБЫТИЕ БИБЛИОТЕКИ</div>
          <div style="font-size:12px; font-weight:900; color:#fff; line-height:1.1; margin:1px 0;">ЛИТЕРАТУРНАЯ<br>ГОСТИНАЯ</div>
          <div style="font-size:5.5px; color:#94a3b8; margin-top:1px;">Вечер поэзии Серебряного века</div>
        </div>
        <div style="flex:1; background:rgba(244,114,182,0.1); border:1px solid rgba(244,114,182,0.3); border-radius:4px; padding:3px;">
          <div style="font-size:7px; color:#FBBF24; font-weight:700; text-align:center;">14 ОКТЯБРЯ · 18:30</div>
          <div style="font-size:5px; color:#cbd5e1; text-align:center; margin-top:1px;">Каминный зал ЦГБ</div>
          <div style="background:#F472B6; border-radius:3px; padding:2px 4px; margin-top:2px; text-align:center; font-size:5px; font-weight:700; color:#fff;">РЕГИСТРАЦИЯ →</div>
        </div>
      </div>`,
    objects: [
      { type:'rect', left:640, top:300, width:1280, height:600, fill:'#0c1222', originX:'center', originY:'center' },
      { type:'rect', left:18, top:300, width:3, height:420, fill:'#F472B6', originX:'left', originY:'center', shadow:'rgba(244,114,182,0.7) 0px 0px 16px' },
      { type:'text', text:'✦ СОБЫТИЕ БИБЛИОТЕКИ АВРОРА ✦', left:90, top:80, width:680, fontSize:16, fontFamily:'Montserrat', fontWeight:'600', fill:'#F472B6', textAlign:'left', charSpacing:160 },
      { type:'text', text:'Литературная\nГостиная', left:90, top:125, width:720, fontSize:96, fontFamily:'Unbounded', fontWeight:'800', fill:'#ffffff', textAlign:'left', lineHeight:1.0, shadow:'rgba(244,114,182,0.5) 0px 0px 32px' },
      { type:'text', text:'Творческий вечер поэзии Серебряного века', left:90, top:345, width:680, fontSize:26, fontFamily:'Cormorant Garamond', fontStyle:'italic', fill:'#cbd5e1', textAlign:'left' },
      { type:'text', text:'✦ Чтение стихов Блока, Ахматовой, Цветаевой\n✦ Живая музыка (скрипка, рояль)\n✦ Редкие архивные издания и рукописи\n✦ Поэтический конкурс с призами', left:90, top:400, width:640, fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'left', lineHeight:1.7 },
      { type:'rect', left:950, top:300, width:360, height:560, rx:20, ry:20, fill:'rgba(244,114,182,0.08)', stroke:'rgba(244,114,182,0.3)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'14 ОКТЯБРЯ', left:950, top:90, width:320, fontSize:44, fontFamily:'Unbounded', fontWeight:'800', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'text', text:'в 18:30', left:950, top:148, width:320, fontSize:30, fontFamily:'Unbounded', fontWeight:'400', fill:'#FBBF24', textAlign:'center', originX:'center' },
      { type:'rect', left:950, top:205, width:280, height:1, fill:'rgba(244,114,182,0.4)', originX:'center' },
      { type:'text', text:'📍 Каминный зал ЦГБ «Аврора»', left:950, top:225, width:300, fontSize:18, fontFamily:'Montserrat', fill:'#e2e8f0', textAlign:'center', originX:'center', lineHeight:1.5 },
      { type:'text', text:'г. Владимир, ул. Б. Московская, 12', left:950, top:258, width:310, fontSize:16, fontFamily:'Montserrat', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'rect', left:950, top:355, width:300, height:64, rx:32, ry:32, fill:'#F472B6', originX:'center', originY:'center' },
      { type:'text', text:'Записаться →', left:950, top:337, width:280, fontSize:22, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center' },
      { type:'rect', left:950, top:450, width:300, height:60, rx:30, ry:30, fill:'transparent', stroke:'rgba(244,114,182,0.5)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'★ Вход свободный', left:950, top:431, width:280, fontSize:20, fontFamily:'Unbounded', fontWeight:'bold', fill:'#F472B6', textAlign:'center', originX:'center' },
      { type:'text', text:'16+', left:950, top:510, width:80, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#ffffff', backgroundColor:'#7c3aed', padding:8, textAlign:'center', originX:'center' },
    ],
  },

  /* T3. КАРТОЧКА КНИГИ / РЕКОМЕНДАЦИЯ */
  {
    id: 'tilda_book_card',
    size: 'tilda_card',
    category: 'tilda',
    name: 'Tilda: Карточка книги',
    desc: 'Вертикальная карточка-рекомендация книги для блога или каталога сайта',
    fmt: 'Tilda Карточка',
    isTilda: true,
    bg: '#0f172a',
    previewBg: '#0f172a',
    previewAccent: '#FBBF24',
    previewHtml: `
      <div class="mp-wrap" style="background:#0f172a; padding:4px;">
        <div style="width:100%; height:36%; background:linear-gradient(160deg,#1e293b,#2d1b69); border-radius:4px; margin-bottom:3px; display:flex; align-items:center; justify-content:center;">
          <span style="font-size:20px;">📕</span>
        </div>
        <div style="font-size:5px; color:#FBBF24; font-weight:700; letter-spacing:0.1em; margin-bottom:1px;">✦ ВЫБОР БИБЛИОТЕКАРЯ</div>
        <div style="font-size:10px; font-weight:800; color:#fff; margin-bottom:1px; line-height:1.1;">Мастер и Маргарита</div>
        <div style="font-size:5.5px; color:#94a3b8; margin-bottom:2px;">Михаил Булгаков · 1966</div>
        <div style="font-size:5px; color:#cbd5e1; line-height:1.3;">Один из главных романов русской литературы XX века...</div>
        <div style="margin-top:3px; background:#FBBF24; border-radius:3px; padding:2px 5px; text-align:center; font-size:5px; font-weight:700; color:#0f172a;">Найти в каталоге</div>
      </div>`,
    objects: [
      { type:'rect', left:300, top:200, width:540, height:350, rx:16, ry:16, fill:'rgba(30,41,59,0.8)', stroke:'rgba(251,191,36,0.3)', strokeWidth:2, originX:'center', originY:'center' },
      { type:'text', text:'📕', left:300, top:200, width:150, fontSize:90, textAlign:'center', originX:'center', originY:'center' },
      { type:'text', text:'✦ ВЫБОР БИБЛИОТЕКАРЯ ✦', left:300, top:385, width:500, fontSize:14, fontFamily:'Montserrat', fontWeight:'700', fill:'#FBBF24', textAlign:'center', originX:'center', charSpacing:130 },
      { type:'rect', left:300, top:412, width:380, height:1.5, fill:'rgba(251,191,36,0.4)', originX:'center' },
      { type:'text', text:'Мастер\nи Маргарита', left:300, top:435, width:520, fontSize:64, fontFamily:'Cormorant Garamond', fontStyle:'italic', fontWeight:'bold', fill:'#ffffff', textAlign:'center', originX:'center', lineHeight:1.1 },
      { type:'text', text:'Михаил Булгаков · 1966', left:300, top:570, width:440, fontSize:20, fontFamily:'Montserrat', fontWeight:'600', fill:'#94a3b8', textAlign:'center', originX:'center' },
      { type:'rect', left:300, top:610, width:440, height:80, rx:10, ry:10, fill:'rgba(251,191,36,0.06)', stroke:'rgba(251,191,36,0.2)', strokeWidth:1, originX:'center', originY:'center' },
      { type:'text', text:'Один из главных романов русской литературы XX века. Философский роман о добре и зле, свете и тьме, любви и предательстве.', left:300, top:588, width:400, fontSize:16, fontFamily:'Montserrat', fill:'#cbd5e1', textAlign:'center', originX:'center', lineHeight:1.65 },
      { type:'rect', left:300, top:700, width:340, height:56, rx:28, ry:28, fill:'#FBBF24', originX:'center', originY:'center' },
      { type:'text', text:'Найти в каталоге →', left:300, top:683, width:320, fontSize:18, fontFamily:'Unbounded', fontWeight:'bold', fill:'#0f172a', textAlign:'center', originX:'center' },
      { type:'text', text:'biblioteka33.ru/opac', left:300, top:770, width:440, fontSize:15, fontFamily:'Montserrat', fill:'#475569', textAlign:'center', originX:'center' },
    ],
  },
];

/* Объединяем Tilda-шаблоны с основным массивом */
TEMPLATES.push(...TILDA_TEMPLATES);



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
if (typeof window !== 'undefined') window.currentSize = currentSize;
let zoom = 1.0;
let isGridVisible = false;
let isSnappingEnabled = true;
let smartGuides = { x: null, y: null };
let history = [];
let historyIdx = -1;
let savingHistory = false;
let qrCodeInstance = null;
const MAX_HISTORY = 50;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ══════════════════════════════════════════════════════════════
   ШРИФТЫ OFONT.RU И ХРАНИЛИЩЕ INDEXEDDB
   ══════════════════════════════════════════════════════════════ */
let customFonts = [];
let pendingFontBuffer = null;
let pendingFontFileName = '';

const DB_NAME = 'AuroraPosterFontsDB';
const DB_STORE = 'fonts';

function openFontsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFontToDB(name, fileName, buffer) {
  try {
    const db = await openFontsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put({ name, fileName, buffer, addedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IDB save error:', e);
  }
}

async function getAllFontsFromDB() {
  try {
    const db = await openFontsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB get error:', e);
    return [];
  }
}

async function deleteFontFromDB(name) {
  try {
    const db = await openFontsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.delete(name);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IDB delete error:', e);
  }
}

async function registerFontFace(name, buffer) {
  try {
    const fontFace = new FontFace(name, buffer);
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
    return true;
  } catch (err) {
    console.error('Ошибка регистрации шрифта:', err);
    throw err;
  }
}

async function loadSavedFonts() {
  try {
    const saved = await getAllFontsFromDB();
    customFonts = [];
    await Promise.allSettled((saved || []).map(async item => {
      try {
        await registerFontFace(item.name, item.buffer);
        customFonts.push(item);
      } catch (e) {
        console.warn('Не удалось загрузить шрифт:', item.name, e);
      }
    }));
    buildFontSelect();
    renderCustomFontsList();
  } catch (e) {
    console.warn('Ошибка загрузки шрифтов из DB:', e);
  }
}

function buildFontSelect() {
  const sel = $('#font-family-select');
  if (!sel) return;

  let html = `<optgroup label="⭐ Кириллические шрифты (встроены)">`;
  html += FONTS.map(f => `
    <option value="${f.id}" style="font-family:'${f.id}',sans-serif;">
      ${f.name} — ${f.desc}
    </option>
  `).join('');
  html += `</optgroup>`;

  if (customFonts && customFonts.length > 0) {
    html += `<optgroup label="✨ Загруженные шрифты с ofont.ru">`;
    html += customFonts.map(f => `
      <option value="${f.name}" style="font-family:'${f.name}',sans-serif;">
        ${f.name} [ofont.ru]
      </option>
    `).join('');
    html += `</optgroup>`;
  }

  sel.innerHTML = html;
}

async function setFontFamily(fontFamily) {
  const obj = canvas?.getActiveObject();
  if (!obj || !fontFamily) return;

  // 1. Предзагружаем/регистрируем шрифт в фоне без блокировки
  ensureFontAvailable(fontFamily);

  // 2. МГНОВЕННО (0 мс) применяем шрифт к объекту и запрашиваем рендер
  obj.set('fontFamily', fontFamily);
  try { fabric.util?.clearFabricFontCache?.(fontFamily); } catch(e) {}
  obj.initDimensions?.();
  obj.setCoords?.();
  obj.dirty = true;
  canvas.requestRenderAll();
  saveHistory();
  updateLayersList();

  // 3. Если глифы ещё не подгружены браузером, догружаем в фоне и обновляем метрики
  if (document.fonts && !document.fonts.check(`16px "${fontFamily}"`)) {
    Promise.allSettled([
      document.fonts.load(`400 32px "${fontFamily}"`),
      document.fonts.load(`700 32px "${fontFamily}"`)
    ]).then(() => {
      try { fabric.util?.clearFabricFontCache?.(fontFamily); } catch(e) {}
      if (canvas?.getActiveObject() === obj) {
        obj.initDimensions?.();
        obj.setCoords?.();
        obj.dirty = true;
        canvas.requestRenderAll();
      }
    });
  }

  // Фикс: сбрасываем inline font-family у самого <select>
  const sel = $('#font-family-select');
  if (sel) sel.style.fontFamily = "'Montserrat', system-ui, sans-serif";
}

/* ══════════════════════════════════════════════════════════════
   МОДАЛКА И ОБРАБОТКА ШРИФТОВ OFONT.RU
   ══════════════════════════════════════════════════════════════ */
function openOfontModal() {
  $('#ofont-modal-overlay')?.classList.remove('hidden');
  renderCustomFontsList();
}

function closeOfontModal() {
  $('#ofont-modal-overlay')?.classList.add('hidden');
  pendingFontBuffer = null;
  pendingFontFileName = '';
  const nameInput = $('#ofont-name-input');
  if (nameInput) nameInput.value = '';
  const btn = $('#btn-ofont-apply-font');
  if (btn) btn.disabled = true;
}

function renderCustomFontsList() {
  const container = $('#ofont-stored-list');
  if (!container) return;
  if (!customFonts || customFonts.length === 0) {
    container.innerHTML = `<div class="ofont-empty-hint">Пока нет загруженных шрифтов. Скачайте файл на ofont.ru и перетащите в область выше.</div>`;
    return;
  }
  container.innerHTML = customFonts.map(f => `
    <div class="ofont-stored-item">
      <div class="ofont-item-info">
        <div class="ofont-item-name" style="font-family:'${escapeHtml(f.name)}',sans-serif;">${escapeHtml(f.name)}</div>
        <div class="ofont-item-meta">${escapeHtml(f.fileName || 'шрифт ofont.ru')} · Пример: Библиотека Аврора 2025</div>
      </div>
      <div class="ofont-item-actions">
        <button class="pbtn pbtn-sm pbtn-primary ofont-apply-btn" data-font="${escapeHtml(f.name)}">Применить</button>
        <button class="pbtn pbtn-sm pbtn-danger ofont-del-btn" data-font="${escapeHtml(f.name)}" title="Удалить шрифт">✕</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.ofont-apply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fname = btn.dataset.font;
      const sel = $('#font-family-select');
      if (sel) sel.value = fname;
      setFontFamily(fname);
      closeOfontModal();
      toast(`Применён шрифт: ${fname}`);
    });
  });

  container.querySelectorAll('.ofont-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fname = btn.dataset.font;
      if (!confirm(`Удалить шрифт «${fname}» из памяти браузера?`)) return;
      await deleteFontFromDB(fname);
      customFonts = customFonts.filter(x => x.name !== fname);
      buildFontSelect();
      renderCustomFontsList();
      toast(`Шрифт «${fname}» удалён`);
    });
  });
}

function handleFontFileSelect(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['ttf','otf','woff','woff2'].includes(ext)) {
    alert('Поддерживаются только форматы шрифтов: .ttf, .otf, .woff, .woff2');
    return;
  }
  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const nameInput = $('#ofont-name-input');
  if (nameInput) nameInput.value = cleanName;

  const reader = new FileReader();
  reader.onload = e => {
    pendingFontBuffer = e.target.result;
    pendingFontFileName = file.name;
    const btn = $('#btn-ofont-apply-font');
    if (btn) btn.disabled = false;
    toast(`Файл «${file.name}» прочитан. Нажмите «Применить и сохранить»`);
  };
  reader.readAsArrayBuffer(file);
}

async function applyPendingFont() {
  const nameInput = $('#ofont-name-input');
  const name = (nameInput?.value || '').trim() || 'CustomFont';
  if (!pendingFontBuffer) {
    toast('Сначала выберите файл шрифта');
    return;
  }
  try {
    await registerFontFace(name, pendingFontBuffer);
    await saveFontToDB(name, pendingFontFileName, pendingFontBuffer);

    const existing = customFonts.findIndex(x => x.name === name);
    const item = { name, fileName: pendingFontFileName, buffer: pendingFontBuffer, addedAt: Date.now() };
    if (existing >= 0) customFonts[existing] = item;
    else customFonts.push(item);

    buildFontSelect();
    renderCustomFontsList();

    const sel = $('#font-family-select');
    if (sel) sel.value = name;
    setFontFamily(name);

    pendingFontBuffer = null;
    pendingFontFileName = '';
    if (nameInput) nameInput.value = '';
    const applyBtn = $('#btn-ofont-apply-font');
    if (applyBtn) applyBtn.disabled = true;

    toast(`Шрифт «${name}» успешно подключен и сохранён!`);
  } catch (err) {
    alert('Не удалось зарегистрировать шрифт. Проверьте валидность файла.');
  }
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
    const isTall = t.size === 'tilda_landing' ? 'is-tall' : '';
    return `
    <div class="tpl-card ${isSquare} ${isLandscape} ${isTall}" data-tpl="${t.id}" tabindex="0" role="button" aria-label="${t.name}">
      <div class="tpl-preview ${isSquare} ${isLandscape} ${isTall}" style="background:${t.previewBg || '#070a1e'}">
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
  if (typeof window.getAllChronographPosterTemplates === 'function') {
    try {
      const chronoTpls = window.getAllChronographPosterTemplates();
      chronoTpls.forEach(ct => {
        if (!TEMPLATES.some(t => t.id === ct.id)) {
          TEMPLATES.push(ct);
        }
      });
    } catch (err) {
      console.error('Error registering chronograph templates:', err);
    }
  }

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
  const mEl = $('#mobile-bg-palette');
  const transparentSwatch = `<button class="bg-swatch bg-swatch-transparent" data-color="" title="Прозрачный фон (Alpha Transparent)"></button>`;
  const swatchesHtml = transparentSwatch + PALETTE.map(p => `
    <button class="bg-swatch" data-color="${p.hex}" title="${p.name}"
      style="background:${p.hex}; ${p.light ? 'border-color:rgba(0,0,0,0.15);' : ''}">
    </button>
  `).join('');

  const onSwatchClick = e => {
    const btn = e.target.closest('.bg-swatch');
    if (btn && canvas) {
      const col = btn.dataset.color || '';
      canvas.setBackgroundColor(col, canvas.renderAll.bind(canvas));
      saveHistory();
      toast(col ? 'Фон холста обновлён' : 'Фон холста теперь прозрачный');
    }
  };

  if (el) {
    el.innerHTML = swatchesHtml;
    el.addEventListener('click', onSwatchClick);
  }

  if (mEl) {
    mEl.innerHTML = swatchesHtml;
    mEl.addEventListener('click', onSwatchClick);
  }

  // Свотчи фона в инспекторе Figma (Design и Settings)
  ['#bg-palette-quick', '#bg-palette-settings'].forEach(sel => {
    const target = $(sel);
    if (target) {
      target.innerHTML = swatchesHtml;
      target.addEventListener('click', onSwatchClick);
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

  const STROKE_COLORS = ['#000000', '#ffffff', '#38BDF8', '#8A6CFF', '#F43F5E', '#10B981', '#FBBF24', '#070a1e'];
  mkSwatches('text-stroke-color-row', STROKE_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj) {
      obj.set('stroke', c);
      canvas.renderAll();
      saveHistory();
    }
    const cp = $('#text-stroke-color-picker');
    if (cp) cp.value = c;
  });

  const BG_PILL_COLORS = ['transparent', '#e11d48', '#10B981', '#0284c7', '#8A6CFF', '#FBBF24', '#070a1e', '#ffffff', '#4f46e5'];
  mkSwatches('text-bg-color-row', BG_PILL_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('backgroundColor', c === 'transparent' ? '' : c);
      canvas.renderAll();
      saveHistory();
    }
    const cp = $('#text-bg-color-picker');
    if (cp && c !== 'transparent') cp.value = c;
  });
}

/* ══════════════════════════════════════════════════════════════
   ЗАГРУЗКА ШАБЛОНА
   ══════════════════════════════════════════════════════════════ */
function loadTemplate(tpl) {
  if (!tpl) return;
  currentSize = SIZES[tpl.size] || SIZES.a4_v;
  if (typeof window !== 'undefined') window.currentSize = currentSize;
  if (canvas) {
    canvas.__artboardWidth = currentSize.w;
    canvas.__artboardHeight = currentSize.h;
  }
  $('#screen-templates').classList.add('hidden');
  $('#screen-editor').classList.remove('hidden');

  _currentDraftId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  if ($('#poster-title')) {
    $('#poster-title').value = tpl.name || 'Новая афиша';
  }

  initCanvas(currentSize.w, currentSize.h);
  canvas.setBackgroundColor(tpl.bg !== undefined ? tpl.bg : '', () => {});
  (tpl.objects || []).forEach(addTemplateObj);
  canvas.renderAll();
  fitZoom();
  updateFormatBadge();
  saveHistory();
  updateLayersList();
  startAutosave();

  // Сохраняем исходное состояние в локальные черновики
  setTimeout(() => {
    saveCurrentDraft(false);
  }, 350);
}

const CUSTOM_PROPS_TO_SAVE = [
  'selectable', 'hasControls', 'editable', 'visible', 'evented',
  'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation',
  '__filterValues', '__isUppercase', '__origText', '__isHdrEnhanced', '__currentHdrPreset',
  'layerName', '__originalSrc', '__bgRemoved', '__cornerRadius', 'clipPath',
  'isAiElement', '__isAiElement', 'isAiPhoto', '__isAiPhoto', 'aiPrompt', '__aiPrompt', 'aiType', '__aiSvg', 'rx', 'ry'
];

/**
 * Устанавливает или обновляет скругление углов для fabric.Image (через clipPath)
 * @param {fabric.Image} img - Объект изображения
 * @param {number} radiusPx - Радиус скругления в пикселях холста (или 9999 для идеального круга)
 * @param {boolean} skipRender - Пропустить вызов renderAll (для пакетных обновлений)
 */
function setImageCornerRadius(img, radiusPx, skipRender = false) {
  if (!img || img.type !== 'image') return;
  const r = Math.max(0, parseFloat(radiusPx) || 0);
  img.__cornerRadius = r;

  if (r <= 0) {
    img.clipPath = null;
    img.dirty = true;
  } else {
    const sx = Math.abs(img.scaleX || 1);
    const sy = Math.abs(img.scaleY || 1);
    const maxRx = (img.width || 100) / 2;
    const maxRy = (img.height || 100) / 2;
    const actualRadius = r >= 9999 ? Math.min(maxRx, maxRy) : Math.min(r, Math.min(maxRx, maxRy) * Math.min(sx, sy));
    const rx = Math.min(actualRadius / sx, maxRx);
    const ry = Math.min(actualRadius / sy, maxRy);

    img.clipPath = new fabric.Rect({
      left: 0,
      top: 0,
      width: img.width,
      height: img.height,
      rx: rx,
      ry: ry,
      originX: 'center',
      originY: 'center',
      absolutePositioned: false
    });
    img.dirty = true;
  }

  if (!skipRender && canvas) {
    canvas.requestRenderAll();
  }
}

/* ══════════════════════════════════════════════════════════════
   CANVAS
   ══════════════════════════════════════════════════════════════ */
/* ── Монтажный стол (Pasteboard Workspace с поддержкой вылетов за края холста) ── */
const CANVAS_PADDING = 320; // Безопасное поле (px) вокруг листа для свободного перемещения и масштабирования

function initCanvas(w, h) {
  if (canvas) canvas.dispose();

  const totalW = (w + CANVAS_PADDING * 2) * zoom;
  const totalH = (h + CANVAS_PADDING * 2) * zoom;

  canvas = new fabric.Canvas('poster-canvas', {
    width: totalW,
    height: totalH,
    backgroundColor: '',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(13, 153, 255, 0.15)',
    selectionBorderColor: '#0d99ff',
    selectionLineWidth: 1.5,
  });
  window.canvas = canvas;
  canvas.__artboardWidth = w;
  canvas.__artboardHeight = h;
  if (!currentSize) {
    currentSize = { w, h, name: 'Холст' };
  } else {
    currentSize.w = w;
    currentSize.h = h;
  }
  if (typeof window !== 'undefined') {
    window.currentSize = currentSize;
  }

  // Устанавливаем матрицу отображения: лист центрирован внутри padding
  canvas.setViewportTransform([zoom, 0, 0, zoom, CANVAS_PADDING * zoom, CANVAS_PADDING * zoom]);

  // Разделяем фон листа афиши и монтажного стола
  canvas.setBackgroundColor = function(col, callback) {
    canvas.__artboardBg = col;
    canvas.backgroundColor = '';
    if (typeof callback === 'function') callback();
    canvas.requestRenderAll();
  };

  fabric.Object.prototype.set({
    borderColor: '#0d99ff',
    borderScaleFactor: 2,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#0d99ff',
    cornerSize: 10,
    touchCornerSize: 26,
    transparentCorners: false,
    cornerStyle: 'rect',
    padding: 6,
    hasRotatingPoint: true,
    rotatingPointOffset: 24,
    controlsAboveOverlay: true,
  });

  // Вращение мышкой за углы слоя (360° rotation handles)
  if (fabric && fabric.controlsUtils) {
    const rotRenderer = function(ctx, left, top) {
      ctx.save();
      ctx.translate(left, top);
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2, false);
      ctx.fillStyle = '#0d99ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    fabric.Object.prototype.controls.rot_tl = new fabric.Control({
      x: -0.5, y: -0.5, offsetY: -16, offsetX: -16,
      cursorStyle: 'grab',
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: rotRenderer
    });
    fabric.Object.prototype.controls.rot_tr = new fabric.Control({
      x: 0.5, y: -0.5, offsetY: -16, offsetX: 16,
      cursorStyle: 'grab',
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: rotRenderer
    });
    fabric.Object.prototype.controls.rot_bl = new fabric.Control({
      x: -0.5, y: 0.5, offsetY: 16, offsetX: -16,
      cursorStyle: 'grab',
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: rotRenderer
    });
    fabric.Object.prototype.controls.rot_br = new fabric.Control({
      x: 0.5, y: 0.5, offsetY: 16, offsetX: 16,
      cursorStyle: 'grab',
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: rotRenderer
    });
  }

  // ── Отрисовка бумажного листа афиши (Figma Artboard Sheet) ──
  canvas.on('before:render', opt => {
    const ctx = opt.ctx;
    if (!ctx || !currentSize) return;

    // Защита чистоты экспорта
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const isExporting = canvas._isExporting || (vpt[4] === 0 && vpt[5] === 0 && vpt[0] === 1);
    if (isExporting) return;

    const cw = currentSize.w;
    const ch = currentSize.h;
    const z = zoom;
    const pad = CANVAS_PADDING;

    ctx.save();
    // 1. Тень бумажного листа афиши на монтажном столе
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 32 * z;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12 * z;

    // 2. Фоновая заливка листа
    const bg = canvas.__artboardBg || canvas.backgroundColor || '#ffffff';
    if (bg && bg !== 'transparent' && bg !== '') {
      if (typeof bg === 'string') {
        ctx.fillStyle = bg;
        ctx.fillRect(pad * z, pad * z, cw * z, ch * z);
      } else if (bg && typeof bg.toLive === 'function') {
        try {
          ctx.fillStyle = bg.toLive(ctx);
          ctx.fillRect(pad * z, pad * z, cw * z, ch * z);
        } catch (e) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pad * z, pad * z, cw * z, ch * z);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pad * z, pad * z, cw * z, ch * z);
      }
    } else {
      // Шахматка для прозрачного холста
      ctx.fillStyle = '#222222';
      ctx.fillRect(pad * z, pad * z, cw * z, ch * z);
      const sq = 12 * z;
      ctx.fillStyle = '#181818';
      for (let px = 0; px < cw * z; px += sq * 2) {
        for (let py = 0; py < ch * z; py += sq * 2) {
          ctx.fillRect((pad * z) + px, (pad * z) + py, Math.min(sq, cw * z - px), Math.min(sq, ch * z - py));
          ctx.fillRect((pad * z) + px + sq, (pad * z) + py + sq, Math.min(sq, cw * z - (px + sq)), Math.min(sq, ch * z - (py + sq)));
        }
      }
    }
    ctx.restore();
  });

  canvas.on('selection:created',  onSelection);
  canvas.on('selection:updated',  onSelection);
  canvas.on('selection:cleared',  clearProps);
  canvas.on('object:moving',      () => updateFigmaDimensionsUI(canvas?.getActiveObject()));
  canvas.on('object:scaling',     e => {
    const obj = e.target || canvas?.getActiveObject();
    if (obj && obj.type === 'image' && typeof obj.__cornerRadius === 'number' && obj.__cornerRadius > 0) {
      setImageCornerRadius(obj, obj.__cornerRadius, true);
    }
    updateFigmaDimensionsUI(obj);
  });
  canvas.on('object:modified',    e => {
    const obj = e.target || canvas?.getActiveObject();
    if (obj && obj.type === 'image' && typeof obj.__cornerRadius === 'number' && obj.__cornerRadius > 0) {
      setImageCornerRadius(obj, obj.__cornerRadius, true);
    }
    updateFigmaDimensionsUI(obj);
    saveHistory();
  });
  canvas.on('object:rotating',    () => updateFigmaDimensionsUI(canvas?.getActiveObject()));
  
  // Обработчики мыши: Панорамирование (Hand tool / Space drag / колесо мыши), Волшебная палочка и Ластик
  canvas.on('mouse:down', opt => {
    if (isSpacePressed || isPanningMode || (opt.e && opt.e.button === 1)) {
      isCanvasDragging = true;
      canvas.selection = false;
      canvas._currentTransform = null;
      lastPanPosX = opt.e.clientX;
      lastPanPosY = opt.e.clientY;
      canvas.defaultCursor = 'grabbing';
      return;
    }
    if (typeof _eraserMode !== 'undefined' && _eraserMode) {
      _eraserMouseDownHandler(opt);
    } else {
      _magicWandHandler(opt);
    }
  });
  canvas.on('mouse:move', opt => {
    if (isCanvasDragging && canvas) {
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += (opt.e.clientX - lastPanPosX);
        vpt[5] += (opt.e.clientY - lastPanPosY);
        canvas.requestRenderAll();
      }
      lastPanPosX = opt.e.clientX;
      lastPanPosY = opt.e.clientY;
      return;
    }
    if (typeof _eraserMode !== 'undefined' && _eraserMode) {
      _eraserMouseMoveHandler(opt);
    }
  });
  canvas.on('mouse:up', opt => {
    if (isCanvasDragging && canvas) {
      isCanvasDragging = false;
      canvas.setViewportTransform(canvas.viewportTransform);
      if (isSpacePressed || isPanningMode) {
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      } else {
        canvas.defaultCursor = 'default';
        if (currentTool === 'select') canvas.selection = true;
      }
      return;
    }
    if (typeof _eraserMode !== 'undefined' && _eraserMode) {
      _eraserMouseUpHandler(opt);
    }
  });
  canvas.on('object:modified', e => {
    // Нормализуем scale текстового объекта: превращаем scaleY→fontSize
    const obj = e.target;
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      const sx = obj.scaleX || 1;
      const sy = obj.scaleY || 1;
      if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) {
        const newFs = Math.round((obj.fontSize || 36) * sy);
        obj.set({ fontSize: Math.max(6, newFs), scaleX: 1, scaleY: 1 });
        obj.initDimensions?.();
        obj.dirty = true;
        const fsSlider = $('#font-size-slider');
        const fsVal    = $('#font-size-val');
        if (fsSlider) fsSlider.value = Math.max(6, newFs);
        if (fsVal)    fsVal.textContent = Math.max(6, newFs);
        canvas.requestRenderAll();
      }
    }
    saveHistory();
    updateLayersList();
  });
  canvas.on('object:added',       () => updateLayersList());
  canvas.on('object:removed',     () => { saveHistory(); updateLayersList(); });
  canvas.on('path:created', e => {
    if (e.path) {
      e.path.set({
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      });
      saveHistory();
      updateLayersList();
    }
  });

  // Магнитные направляющие и примагничивание к сетке
  canvas.on('object:moving', e => {
    const obj = e.target;
    if (!obj) return;
    const cw = currentSize.w;
    const ch = currentSize.h;
    const ow = obj.getScaledWidth();
    const oh = obj.getScaledHeight();

    // Сетка верстки: мягкое примагничивание к шагу 10px при активной сетке (Alt отключает)
    if (isGridVisible && !e.e?.altKey) {
      const gStep = 10;
      const snapX = Math.round(obj.left / gStep) * gStep;
      const snapY = Math.round(obj.top  / gStep) * gStep;
      if (Math.abs(obj.left - snapX) < 5) obj.set({ left: snapX });
      if (Math.abs(obj.top  - snapY) < 5) obj.set({ top: snapY });
    }

    if (!isSnappingEnabled) return;
    const snapThreshold = 10;
    const cx = cw / 2;
    const cy = ch / 2;

    smartGuides.x = null;
    smartGuides.y = null;

    // Центр по горизонтали
    const objCx = obj.left + (ow / 2);
    if (Math.abs(objCx - cx) < snapThreshold) {
      obj.set({ left: cx - (ow / 2) });
      smartGuides.x = cx;
    }

    // Центр по вертикали
    const objCy = obj.top + (oh / 2);
    if (Math.abs(objCy - cy) < snapThreshold) {
      obj.set({ top: cy - (oh / 2) });
      smartGuides.y = cy;
    }

    // Левое и правое поле (24px)
    const margin = 24;
    if (Math.abs(obj.left - margin) < snapThreshold) {
      obj.set({ left: margin });
      smartGuides.x = margin;
    } else if (Math.abs((obj.left + ow) - (cw - margin)) < snapThreshold) {
      obj.set({ left: cw - margin - ow });
      smartGuides.x = cw - margin;
    }

    // Верхнее и нижнее поле (24px)
    if (Math.abs(obj.top - margin) < snapThreshold) {
      obj.set({ top: margin });
      smartGuides.y = margin;
    } else if (Math.abs((obj.top + oh) - (ch - margin)) < snapThreshold) {
      obj.set({ top: ch - margin - oh });
      smartGuides.y = ch - margin;
    }
  });

  canvas.on('after:render', opt => {
    const ctx = opt.ctx;
    if (!ctx || !currentSize) return;

    // Защита чистоты экспорта: не рисовать служебные маски и сетки в буфер экспорта
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const isExporting = canvas._isExporting || (vpt[4] === 0 && vpt[5] === 0 && vpt[0] === 1);
    if (isExporting) return;

    const cw = currentSize.w;
    const ch = currentSize.h;
    const z = zoom;
    const pad = CANVAS_PADDING;
    const totalW = canvas.getWidth();
    const totalH = canvas.getHeight();

    // ── 1. 100% НЕПРОЗРАЧНАЯ МАСКА МОНТАЖНОГО СТОЛА (#141824) ──
    // Полностью скрывает любые части объектов, выходящие за пределы листа афиши.
    // Так как маска рисуется на lowerCanvasEl, рамка выделения и ручки трансформации (на upperCanvasEl) остаются на 100% видны и интерактивны!
    ctx.save();
    ctx.beginPath();
    // Внешний контур (весь видимый Canvas с отступами монтажного стола)
    ctx.rect(0, 0, totalW, totalH);
    // Внутренний контур (окно выреза строго по границам листа афиши)
    ctx.rect(pad * z, pad * z, cw * z, ch * z);
    // 100% непрозрачная заливка точным цветом фона монтажного стола (#141824)
    ctx.fillStyle = '#141824';
    ctx.fill('evenodd');

    // Тонкая неоновая граница листа афиши поверх маски
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.65)';
    ctx.lineWidth = Math.max(1, 1.5 * z);
    ctx.strokeRect(pad * z, pad * z, cw * z, ch * z);
    ctx.restore();

    // ── 2. ОТРИСОВКА СЕТКИ ВЕРСТКИ (GRID OVERLAY) ──
    if (isGridVisible) {
      ctx.save();

      const isTildaFormat = (currentSize.name || '').toLowerCase().includes('tilda') || cw >= 1200;
      const step = (cw >= 1000 || ch >= 1000) ? 40 : 20;
      const majorStep = step * 5; // 100px или 200px

      // 1.1 Тонкие модульные линии
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      for (let x = step; x < cw; x += step) {
        if (x % majorStep === 0) continue;
        const px = Math.round((pad + x) * z) + 0.5;
        ctx.moveTo(px, pad * z);
        ctx.lineTo(px, (pad + ch) * z);
      }
      for (let y = step; y < ch; y += step) {
        if (y % majorStep === 0) continue;
        const py = Math.round((pad + y) * z) + 0.5;
        ctx.moveTo(pad * z, py);
        ctx.lineTo((pad + cw) * z, py);
      }
      ctx.stroke();

      // 1.2 Основные линии сетки (каждые 100/200px)
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      for (let x = majorStep; x < cw; x += majorStep) {
        const px = Math.round((pad + x) * z) + 0.5;
        ctx.moveTo(px, pad * z);
        ctx.lineTo(px, (pad + ch) * z);
      }
      for (let y = majorStep; y < ch; y += majorStep) {
        const py = Math.round((pad + y) * z) + 0.5;
        ctx.moveTo(pad * z, py);
        ctx.lineTo((pad + cw) * z, py);
      }
      ctx.stroke();

      // 1.3 Центральные оси холста
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.setLineDash([4, 4]);
      const cx = Math.round((pad + cw / 2) * z) + 0.5;
      ctx.moveTo(cx, pad * z);
      ctx.lineTo(cx, (pad + ch) * z);
      const cy = Math.round((pad + ch / 2) * z) + 0.5;
      ctx.moveTo(pad * z, cy);
      ctx.lineTo((pad + cw) * z, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 1.4 12-колоночная сетка для Tilda (12-column layout grid)
      if (isTildaFormat && cw >= 960) {
        const totalColumns = 12;
        const margin = cw >= 1280 ? Math.round((cw - 1200) / 2) + 20 : 20;
        const usableWidth = cw - 2 * margin;
        const gutter = 20;
        const colWidth = (usableWidth - (totalColumns - 1) * gutter) / totalColumns;

        for (let c = 0; c < totalColumns; c++) {
          const colX = margin + c * (colWidth + gutter);
          const rx = (pad + colX) * z;
          const rw = colWidth * z;
          const rh = ch * z;

          // Полупрозрачная заливка колонки
          ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
          ctx.fillRect(rx, pad * z, rw, rh);

          // Границы колонки
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
          ctx.lineWidth = 0.75;
          ctx.strokeRect(rx, pad * z, rw, rh);

          // Номер колонки
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.font = `bold ${Math.max(8, Math.round(9 * z))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(String(c + 1), rx + rw / 2, (pad + 14) * z);
        }

        // Подпись 12 колонок
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.textAlign = 'left';
        ctx.font = `bold ${Math.max(9, Math.round(11 * z))}px sans-serif`;
        ctx.fillText('СЕТКА TILDA: 12 КОЛОНОК', (pad + margin + 6) * z, (pad + 30) * z);
      }

      // 1.5 Направляющие границ блоков для 6-блочного лендинга (1200×2400)
      if (cw === 1200 && ch === 2400) {
        const blockSplits = [
          { y: 70,   label: 'БЛОК 1/2: ШАПКА / HERO' },
          { y: 650,  label: 'БЛОК 2/3: HERO / УСЛУГИ' },
          { y: 1120, label: 'БЛОК 3/4: УСЛУГИ / АФИША' },
          { y: 1620, label: 'БЛОК 4/5: АФИША / CTA' },
          { y: 2050, label: 'БЛОК 5/6: CTA / ПОДВАЛ' }
        ];

        blockSplits.forEach(bs => {
          const sy = Math.round((pad + bs.y) * z) + 0.5;
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(pad * z, sy);
          ctx.lineTo((pad + cw) * z, sy);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
          ctx.font = `bold ${Math.max(8, Math.round(10 * z))}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(`⮜ ${bs.label} ⮞`, (pad + cw - 24) * z, sy - 4);
        });
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    // ── 2. МАГНИТНЫЕ НАПРАВЛЯЮЩИЕ (SMART GUIDES) ──
    if (smartGuides.x !== null) {
      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const gx = (pad + smartGuides.x) * z;
      ctx.moveTo(gx, pad * z);
      ctx.lineTo(gx, (pad + currentSize.h) * z);
      ctx.stroke();
      ctx.restore();
    }
    if (smartGuides.y !== null) {
      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const gy = (pad + smartGuides.y) * z;
      ctx.moveTo(pad * z, gy);
      ctx.lineTo((pad + currentSize.w) * z, gy);
      ctx.stroke();
      ctx.restore();
    }
  });


  canvas.on('mouse:up', () => {
    if (smartGuides.x !== null || smartGuides.y !== null) {
      smartGuides.x = null;
      smartGuides.y = null;
      canvas.requestRenderAll();
    }
  });

  // Сенсорные жесты: Pinch-to-zoom на смартфонах и планшетах
  const canvasArea = $('#canvas-area');
  if (canvasArea && !canvasArea._touchZoomBound) {
    canvasArea._touchZoomBound = true;
    let startDist = 0;
    let startZoom = 1.0;

    canvasArea.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        startDist = Math.hypot(dx, dy);
        startZoom = zoom;
      }
    }, { passive: false });

    canvasArea.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / startDist;
        applyZoom(startZoom * factor);
      }
    }, { passive: false });

    canvasArea.addEventListener('touchend', e => {
      if (e.touches.length < 2) {
        startDist = 0;
      }
    });
  }

  // По умолчанию активируем инструмент «Стрелка выделения (V)»
  activateSelectTool(false);
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
  let obj = null;
  switch(type) {
    case 'text': {
      if (d.fontFamily) ensureFontAvailable(d.fontFamily);
      obj = new fabric.Textbox(d.text || 'Текст', { ...d, editable: true });
      break;
    }
    case 'rect':   obj = new fabric.Rect(d);   break;
    case 'circle': obj = new fabric.Circle(d); break;
    case 'line':   obj = new fabric.Line(d.points || [0,0,100,0], d); break;
    case 'path':   obj = new fabric.Path(d.path, d); break;
  }
  if (obj) {
    if (def.layerName) obj.layerName = def.layerName;
    if (def.blockTitle) obj.blockTitle = def.blockTitle;
    if (def.blockId) obj.blockId = def.blockId;
    canvas.add(obj);
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

function addRibbon() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const ribbonPath = 'M 0 0 L 70 0 L 70 110 L 35 85 L 0 110 Z';
  const r = new fabric.Path(ribbonPath, {
    left: cx - 35, top: cy - 55, scaleX: 1, scaleY: 1,
    fill: '#e11d48', stroke: '#be123c', strokeWidth: 1,
    selectable: true,
  });
  canvas.add(r);
  canvas.setActiveObject(r);
  canvas.renderAll();
  updateLayersList();
  toast('Лента-закладка добавлена');
}

function addSpeechBubble() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const bubblePath = 'M 20 0 L 140 0 C 150 0, 160 10, 160 20 L 160 80 C 160 90, 150 100, 140 100 L 45 100 L 20 125 L 25 100 L 20 100 C 10 100, 0 90, 0 80 L 0 20 C 0 10, 10 0, 20 0 Z';
  const b = new fabric.Path(bubblePath, {
    left: cx - 80, top: cy - 60, scaleX: 1, scaleY: 1,
    fill: '#8a6cff', stroke: '#7048e8', strokeWidth: 1,
    selectable: true,
  });
  canvas.add(b);
  canvas.setActiveObject(b);
  canvas.renderAll();
  updateLayersList();
  toast('Облачко добавлено');
}

function addHexagon() {
  if (!canvas) return;
  const cx = currentSize.w / 2, cy = currentSize.h / 2;
  const hexPath = 'M 50 0 L 93 25 L 93 75 L 50 100 L 7 75 L 7 25 Z';
  const h = new fabric.Path(hexPath, {
    left: cx - 50, top: cy - 50, scaleX: 1.2, scaleY: 1.2,
    fill: '#10b981', stroke: '#059669', strokeWidth: 1,
    selectable: true,
  });
  canvas.add(h);
  canvas.setActiveObject(h);
  canvas.renderAll();
  updateLayersList();
  toast('Шестиугольник добавлен');
}

function toggleGrid() {
  isGridVisible = !isGridVisible;
  const frame = $('#canvas-frame');
  const btn = $('#btn-toggle-grid');
  if (frame) frame.classList.toggle('has-grid', isGridVisible);
  if (btn) {
    btn.classList.toggle('is-active', isGridVisible);
    btn.title = isGridVisible ? 'Выключить сетку верстки' : 'Включить сетку верстки';
  }
  if (canvas) canvas.requestRenderAll();
  toast(isGridVisible ? 'Сетка верстки включена' : 'Сетка верстки выключена');
}


function toggleSnapping() {
  isSnappingEnabled = !isSnappingEnabled;
  const btn = $('#btn-toggle-snap');
  if (btn) btn.classList.toggle('is-active', isSnappingEnabled);
  toast(isSnappingEnabled ? 'Магнитные направляющие включены' : 'Направляющие выключены');
}

async function pickColorWithEyeDropper(targetProp) {
  if (!window.EyeDropper) {
    toast('Инструмент пипетки поддерживается в Chrome/Edge');
    return;
  }
  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    if (!result || !result.sRGBHex) return;
    const color = result.sRGBHex;
    const obj = canvas?.getActiveObject();
    if (!obj) {
      toast(`Выбран цвет: ${color}`);
      return;
    }

    if (targetProp === 'text-fill') {
      obj.set('fill', color);
      const cp = $('#text-color-picker');
      if (cp) cp.value = color;
      syncSwatches('#text-color-row', color);
    } else if (targetProp === 'text-bg') {
      obj.set('backgroundColor', color);
      const cp = $('#text-bg-color-picker');
      if (cp) cp.value = color;
      syncSwatches('#text-bg-color-row', color);
    } else if (targetProp === 'shape-fill') {
      obj.set('fill', color);
      const cp = $('#fill-color-picker');
      if (cp) cp.value = color;
      syncSwatches('#fill-color-row', color);
    }
    canvas.renderAll();
    saveHistory();
    toast(`Цвет ${color} применён!`);
  } catch (err) {
    // User cancelled eye dropper
  }
}

function openMobileDrawer(category) {
  const drawer = $('#mobile-drawer');
  const backdrop = $('#mobile-drawer-backdrop');
  if (!drawer || !backdrop) return;

  $('#ed-panel')?.classList.remove('is-mobile-open');

  const titles = {
    bg: 'Фон холста',
    text: 'Добавление текста',
    shapes: 'Фигуры и графика',
    media: 'Медиа и библиотека',
  };

  const titleEl = $('#mobile-drawer-title');
  if (titleEl) titleEl.textContent = titles[category] || 'Инструменты';

  ['bg', 'text', 'shapes', 'media'].forEach(cat => {
    const sec = $(`#drawer-sec-${cat}`);
    if (sec) sec.classList.toggle('hidden', cat !== category);
  });

  $$('.dock-tab').forEach(tab => {
    tab.classList.toggle('is-active', tab.dataset.drawer === category);
  });

  backdrop.classList.remove('hidden');
  drawer.classList.remove('hidden');
}

function closeMobileDrawer() {
  const drawer = $('#mobile-drawer');
  const backdrop = $('#mobile-drawer-backdrop');
  if (drawer) drawer.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
  $$('.dock-tab').forEach(tab => tab.classList.remove('is-active'));
}

/* ══════════════════════════════════════════════════════════════
   ПРОДВИНУТЫЕ АЛГОРИТМЫ УДАЛЕНИЯ ФОНА (PERCEPTUAL COLOR MATTING)
   ══════════════════════════════════════════════════════════════ */

/**
 * Расчёт перцептивного цветового расстояния с учётом спектральной чувствительности глаза (Redmean Euclidean Distance).
 * @param {number} r1 
 * @param {number} g1 
 * @param {number} b1 
 * @param {number} r2 
 * @param {number} g2 
 * @param {number} b2 
 * @returns {number} расстояние (0 .. ~765)
 */
function _perceptualColorDist(r1, g1, b1, r2, g2, b2) {
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

/**
 * Сбор репрезентативных фоновых образцов по периметру и углам изображения.
 * Позволяет точно определять градиентные и неоднородные фоны студийных снимков.
 */
function _sampleBackgroundColors(data, iw, ih) {
  const samples = [];
  const step = Math.max(4, Math.floor(Math.min(iw, ih) / 40));

  // 1. Угловые блоки (5x5)
  const cornerCoords = [
    [0, 0], [iw - 1, 0], [0, ih - 1], [iw - 1, ih - 1]
  ];
  for (const [cx, cy] of cornerCoords) {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        const x = Math.min(Math.max(0, cx + (cx === 0 ? dx : -dx)), iw - 1);
        const y = Math.min(Math.max(0, cy + (cy === 0 ? dy : -dy)), ih - 1);
        const idx = (y * iw + x) * 4;
        if (data[idx + 3] > 10) {
          rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2]; count++;
        }
      }
    }
    if (count > 0) {
      samples.push({ r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) });
    }
  }

  // 2. Верхняя и нижняя кромки
  for (let x = 0; x < iw; x += step) {
    const idxTop = x * 4;
    const idxBot = ((ih - 1) * iw + x) * 4;
    if (data[idxTop + 3] > 10) samples.push({ r: data[idxTop], g: data[idxTop + 1], b: data[idxTop + 2] });
    if (data[idxBot + 3] > 10) samples.push({ r: data[idxBot], g: data[idxBot + 1], b: data[idxBot + 2] });
  }

  // 3. Левая и правая кромки
  for (let y = 0; y < ih; y += step) {
    const idxLeft = (y * iw) * 4;
    const idxRight = (y * iw + (iw - 1)) * 4;
    if (data[idxLeft + 3] > 10) samples.push({ r: data[idxLeft], g: data[idxLeft + 1], b: data[idxLeft + 2] });
    if (data[idxRight + 3] > 10) samples.push({ r: data[idxRight], g: data[idxRight + 1], b: data[idxRight + 2] });
  }

  return samples;
}

/**
 * Проверка минимального расстояния цвета пикселя до фоновой палитры.
 */
function _minDistToBgSamples(r, g, b, samples) {
  let minD = 999999;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const d = _perceptualColorDist(r, g, b, s.r, s.g, s.b);
    if (d < minD) {
      minD = d;
      if (minD < 5) break;
    }
  }
  return minD;
}

/**
 * Очистка каймы (Defringing) и мягкое сглаживание краёв (Alpha Matting & Feathering).
 * Устраняет цветной ореол исходного фона и ступенчатость по контуру вырезанного объекта.
 */
function _defringeAndFeatherAlpha(data, iw, ih, featherRadius = 2) {
  const fth = Math.max(1, Math.min(10, featherRadius || 2));
  const totalPixels = iw * ih;
  const newAlpha = new Uint8ClampedArray(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    newAlpha[i] = data[i * 4 + 3];
  }

  // 1. Defringing: заменяем цвет краевых полупрозрачных пикселей средним цветом объекта
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const idx = (y * iw + x) * 4;
      const a = data[idx + 3];
      if (a > 0 && a < 240) {
        let solidR = 0, solidG = 0, solidB = 0, solidCount = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= ih) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= iw) continue;
            const nIdx = (ny * iw + nx) * 4;
            if (data[nIdx + 3] >= 240) {
              solidR += data[nIdx];
              solidG += data[nIdx + 1];
              solidB += data[nIdx + 2];
              solidCount++;
            }
          }
        }
        if (solidCount > 0) {
          data[idx]     = Math.round(solidR / solidCount);
          data[idx + 1] = Math.round(solidG / solidCount);
          data[idx + 2] = Math.round(solidB / solidCount);
        }
      }
    }
  }

  // 2. Мягкое субпиксельное сглаживание альфа-канала (Feathering)
  if (fth > 0) {
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const pIdx = y * iw + x;
        const curA = data[pIdx * 4 + 3];
        let hasZero = false;
        let hasSolid = false;
        let sumA = 0;
        let count = 0;

        for (let dy = -fth; dy <= fth; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= ih) continue;
          for (let dx = -fth; dx <= fth; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= iw) continue;
            const val = data[(ny * iw + nx) * 4 + 3];
            if (val === 0) hasZero = true;
            if (val >= 250) hasSolid = true;
            sumA += val;
            count++;
          }
        }

        if (hasZero && hasSolid) {
          newAlpha[pIdx] = Math.round(sumA / count);
        } else if (hasZero && curA < 180) {
          newAlpha[pIdx] = Math.max(0, Math.round(curA * 0.4));
        } else {
          newAlpha[pIdx] = curA;
        }
      }
    }

    for (let i = 0; i < totalPixels; i++) {
      data[i * 4 + 3] = newAlpha[i];
    }
  }
}

/**
 * Автоматическое удаление фона активного слоя-изображения.
 * Алгоритм: Multi-seed сбор фона + BFS flood-fill + Perceptual Color Matting + Defringing.
 * @param {number} tolerance - допуск цвета (5-80%)
 * @param {number} feather   - радиус сглаживания краёв (0-10px)
 */
function removeImageBackground(tolerance = 28, feather = 2) {
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image') {
    toast('Выберите слой с изображением'); return;
  }

  // Сохраняем оригинал для возможности отмены
  if (!obj.__originalSrc) {
    obj.__originalSrc = obj.toDataURL ? obj.toDataURL() : (obj.getSrc?.() || obj.getElement()?.src || '');
  }

  toast('⏳ Анализ и вырезание фона...');

  const el = obj.getElement();
  const iw = el.naturalWidth  || el.width;
  const ih = el.naturalHeight || el.height;

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = iw;
  tmpCanvas.height = ih;
  const ctx = tmpCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(el, 0, 0);

  const imgData = ctx.getImageData(0, 0, iw, ih);
  const data = imgData.data;

  // 1. Сбор образцов цвета фона со всех 4 углов и периметра
  const bgSamples = _sampleBackgroundColors(data, iw, ih);
  if (!bgSamples.length) {
    bgSamples.push({ r: data[0], g: data[1], b: data[2] });
  }

  // Порог допуска в перцептивной метрике
  const tolDist = (tolerance / 100) * 440 + 10;
  const softTol = tolDist + 22;

  // 2. Высокопроизводительный BFS flood-fill от всех 4 краёв
  const visited = new Uint8Array(iw * ih);
  const queue = new Int32Array(iw * ih);
  let head = 0;
  let tail = 0;

  function pushQueue(x, y) {
    if (x < 0 || y < 0 || x >= iw || y >= ih) return;
    const idx = y * iw + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  }

  // Стартовые точки — весь внешний периметр
  for (let x = 0; x < iw; x++) { pushQueue(x, 0); pushQueue(x, ih - 1); }
  for (let y = 0; y < ih; y++) { pushQueue(0, y); pushQueue(iw - 1, y); }

  while (head < tail) {
    const idx = queue[head++];
    const pi = idx * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];

    const dist = _minDistToBgSamples(r, g, b, bgSamples);
    if (dist <= tolDist) {
      data[pi + 3] = 0; // Полностью прозрачный
      const x = idx % iw;
      const y = Math.floor(idx / iw);
      pushQueue(x + 1, y);
      pushQueue(x - 1, y);
      pushQueue(x, y + 1);
      pushQueue(x, y - 1);
    } else if (dist <= softTol) {
      const alphaFactor = (dist - tolDist) / (softTol - tolDist);
      data[pi + 3] = Math.round(data[pi + 3] * alphaFactor);
    }
  }

  // 3. Устранение цветного ореола (Defringing) и сглаживание краёв
  _defringeAndFeatherAlpha(data, iw, ih, feather);

  ctx.putImageData(imgData, 0, 0);

  fabric.Image.fromURL(tmpCanvas.toDataURL('image/png'), newImg => {
    newImg.set({
      left:       obj.left,
      top:        obj.top,
      scaleX:     obj.scaleX,
      scaleY:     obj.scaleY,
      angle:      obj.angle,
      originX:    obj.originX || 'left',
      originY:    obj.originY || 'top',
      selectable: true,
      layerName:  (obj.layerName || 'Фото') + ' (без фона)',
      __originalSrc: obj.__originalSrc,
      __bgRemoved: true,
    });
    const idx = canvas.getObjects().indexOf(obj);
    canvas.remove(obj);
    canvas.add(newImg);
    canvas.moveTo(newImg, idx);
    canvas.setActiveObject(newImg);
    canvas.renderAll();
    updateLayersList();
    saveHistory();
    toast('✅ Фон успешно удалён');
    $('#btn-bg-revert')?.classList.remove('hidden');
  });
}

/**
 * Удаление фона с помощью «волшебной палочки» — клик по точке на изображении.
 */
let _magicWandMode = false;
function toggleMagicWandMode() {
  _magicWandMode = !_magicWandMode;
  const btn = $('#btn-bg-magic-wand');
  if (btn) btn.classList.toggle('is-active', _magicWandMode);
  if (canvas) canvas.defaultCursor = _magicWandMode ? 'crosshair' : 'default';
  toast(_magicWandMode ? '🎯 Кликните по фону на изображении' : 'Режим палочки отключён');
}

/**
 * Внутренняя функция: применяет flood-fill + feather к ctx и вставляет результат на canvas.
 */
function _magicWandProcess(ctx, obj, iw, ih, tmpCanvas, px, py, tolerancePercent, feather) {
  const imgData = ctx.getImageData(0, 0, iw, ih);
  const data    = imgData.data;
  const visited = new Uint8Array(iw * ih);

  const startIdx = (py * iw + px) * 4;
  const targetR = data[startIdx], targetG = data[startIdx + 1], targetB = data[startIdx + 2];

  const tolDist = (tolerancePercent / 100) * 440 + 10;
  const softTol = tolDist + 22;

  const queue = new Int32Array(iw * ih);
  let head = 0;
  let tail = 0;

  const startPt = py * iw + px;
  visited[startPt] = 1;
  queue[tail++] = startPt;

  while (head < tail) {
    const idx = queue[head++];
    const pi = idx * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];

    const dist = _perceptualColorDist(r, g, b, targetR, targetG, targetB);
    if (dist <= tolDist) {
      data[pi + 3] = 0;
      const x = idx % iw;
      const y = Math.floor(idx / iw);
      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && ny >= 0 && nx < iw && ny < ih) {
          const nIdx = ny * iw + nx;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }
    } else if (dist <= softTol) {
      const alphaFactor = (dist - tolDist) / (softTol - tolDist);
      data[pi + 3] = Math.round(data[pi + 3] * alphaFactor);
    }
  }

  // Очистка ореола и сглаживание
  _defringeAndFeatherAlpha(data, iw, ih, feather);

  ctx.putImageData(imgData, 0, 0);

  if (!obj.__originalSrc) obj.__originalSrc = obj.toDataURL ? obj.toDataURL() : (obj.getSrc?.() || '');

  fabric.Image.fromURL(tmpCanvas.toDataURL('image/png'), newImg => {
    newImg.set({
      left:       obj.left,
      top:        obj.top,
      scaleX:     obj.scaleX,
      scaleY:     obj.scaleY,
      angle:      obj.angle,
      originX:    obj.originX || 'left',
      originY:    obj.originY || 'top',
      selectable: true,
      layerName:  (obj.layerName || 'Фото') + ' (без фона)',
      __originalSrc: obj.__originalSrc,
      __bgRemoved: true
    });
    const idx = canvas.getObjects().indexOf(obj);
    canvas.remove(obj);
    canvas.add(newImg);
    canvas.moveTo(newImg, idx);
    canvas.setActiveObject(newImg);
    canvas.renderAll();
    updateLayersList();
    saveHistory();
    toast('✅ Цвет удалён');
    $('#btn-bg-revert')?.classList.remove('hidden');
  });

  toggleMagicWandMode();
}

function _magicWandHandler(opt) {
  if (!_magicWandMode) return;
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image') {
    toggleMagicWandMode(); return;
  }
  const ptr = canvas.getPointer(opt.e);
  const coords = _getLocalImageCoords(obj, ptr);
  if (!coords) return;

  const el = obj.getElement();
  const iw = el.naturalWidth  || el.width;
  const ih = el.naturalHeight || el.height;
  const px = Math.round(coords.x), py = Math.round(coords.y);
  if (px < 0 || py < 0 || px >= iw || py >= ih) return;

  const tolerance = parseInt($('#bg-tolerance-slider')?.value || 28);
  const feather   = parseInt($('#bg-feather-slider')?.value   || 2);

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = iw; tmpCanvas.height = ih;
  const ctx = tmpCanvas.getContext('2d', { willReadFrequently: true });

  try {
    ctx.drawImage(el, 0, 0);
  } catch(corsErr) {
    const img2 = new Image();
    img2.crossOrigin = 'anonymous';
    img2.onload = () => {
      ctx.drawImage(img2, 0, 0);
      _magicWandProcess(ctx, obj, iw, ih, tmpCanvas, px, py, tolerance, feather);
    };
    img2.src = (obj.getSrc?.() || el.src) + '?t=' + Date.now();
    return;
  }

  _magicWandProcess(ctx, obj, iw, ih, tmpCanvas, px, py, tolerance, feather);
}

/**
 * Восстановить оригинальное изображение (отменить удаление фона).
 */
function revertBackground() {
  const obj = canvas?.getActiveObject();
  if (!obj || !obj.__originalSrc) { toast('Нет оригинала для восстановления'); return; }

  fabric.Image.fromURL(obj.__originalSrc, origImg => {
    origImg.set({
      left:       obj.left,
      top:        obj.top,
      scaleX:     obj.scaleX,
      scaleY:     obj.scaleY,
      angle:      obj.angle,
      originX:    obj.originX || 'left',
      originY:    obj.originY || 'top',
      selectable: true,
      layerName:  (obj.layerName || 'Фото').replace(' (без фона)', '')
    });
    const idx = canvas.getObjects().indexOf(obj);
    canvas.remove(obj);
    canvas.add(origImg);
    canvas.moveTo(origImg, idx);
    canvas.setActiveObject(origImg);
    canvas.renderAll();
    updateLayersList();
    saveHistory();
    toast('↺ Оригинальный фон восстановлен');
    $('#btn-bg-revert')?.classList.add('hidden');
  });
}

/**
 * Разделить изображение на 2 слоя: передний план (объект) и фон.
 */
function separateImageIntoLayers() {
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image') { toast('Выберите слой с изображением'); return; }

  const tolerance = parseInt($('#bg-tolerance-slider')?.value || 28);
  const feather   = parseInt($('#bg-feather-slider')?.value   || 2);
  const el = obj.getElement();
  const iw = el.naturalWidth  || el.width;
  const ih = el.naturalHeight || el.height;

  const tmpC = document.createElement('canvas');
  tmpC.width = iw; tmpC.height = ih;
  const ctx = tmpC.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(el, 0, 0);
  const imgData = ctx.getImageData(0, 0, iw, ih);
  const data    = imgData.data;

  const bgSamples = _sampleBackgroundColors(data, iw, ih);
  if (!bgSamples.length) bgSamples.push({ r: data[0], g: data[1], b: data[2] });
  const tolDist = (tolerance / 100) * 440 + 10;

  const bgMask  = new Uint8Array(iw * ih);
  const visited = new Uint8Array(iw * ih);
  const queue   = new Int32Array(iw * ih);
  let head = 0, tail = 0;

  function pushQueue(x, y) {
    if (x < 0 || y < 0 || x >= iw || y >= ih) return;
    const idx = y * iw + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  }

  for (let x = 0; x < iw; x++) { pushQueue(x, 0); pushQueue(x, ih - 1); }
  for (let y = 0; y < ih; y++) { pushQueue(0, y); pushQueue(iw - 1, y); }

  while (head < tail) {
    const idx = queue[head++];
    const pi = idx * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];
    const dist = _minDistToBgSamples(r, g, b, bgSamples);
    if (dist <= tolDist) {
      bgMask[idx] = 1;
      const x = idx % iw, y = Math.floor(idx / iw);
      pushQueue(x + 1, y); pushQueue(x - 1, y); pushQueue(x, y + 1); pushQueue(x, y - 1);
    }
  }

  // --- Слой «объект» (передний план): фон → прозрачный + Defringing
  const fgData = new ImageData(new Uint8ClampedArray(data), iw, ih);
  for (let i = 0; i < iw * ih; i++) {
    if (bgMask[i]) fgData.data[i * 4 + 3] = 0;
  }
  _defringeAndFeatherAlpha(fgData.data, iw, ih, feather);

  const fgC = document.createElement('canvas'); fgC.width = iw; fgC.height = ih;
  fgC.getContext('2d').putImageData(fgData, 0, 0);

  // --- Слой «фон»: объект → полупрозрачный, фон сохранён
  const bgC = document.createElement('canvas'); bgC.width = iw; bgC.height = ih;
  const bgCtx = bgC.getContext('2d');
  bgCtx.drawImage(el, 0, 0);
  const bgData2 = bgCtx.getImageData(0, 0, iw, ih);
  for (let i = 0; i < iw * ih; i++) {
    if (!bgMask[i]) bgData2.data[i * 4 + 3] = Math.round(bgData2.data[i * 4 + 3] * 0.4);
  }
  bgCtx.putImageData(bgData2, 0, 0);

  const posL  = obj.left, posT = obj.top;
  const origIdx = canvas.getObjects().indexOf(obj);

  fabric.Image.fromURL(bgC.toDataURL('image/png'), bgImg => {
    bgImg.set({
      left: posL, top: posT, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle,
      originX: obj.originX || 'left', originY: obj.originY || 'top',
      selectable: true, layerName: '[Фон] ' + (obj.layerName || 'Фото'), opacity: 0.7
    });
    canvas.remove(obj);
    canvas.add(bgImg);
    canvas.moveTo(bgImg, origIdx);

    fabric.Image.fromURL(fgC.toDataURL('image/png'), fgImg => {
      fgImg.set({
        left: posL, top: posT, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle,
        originX: obj.originX || 'left', originY: obj.originY || 'top',
        selectable: true, layerName: '[Объект] ' + (obj.layerName || 'Фото')
      });
      canvas.add(fgImg);
      canvas.bringToFront(fgImg);
      canvas.setActiveObject(fgImg);
      canvas.renderAll();
      updateLayersList();
      saveHistory();
      toast('🔮 Разделено на 2 слоя: Объект + Фон');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   ИНСТРУМЕНТ «ЛАСТИК» (ИНТЕРАКТИВНОЕ СТИРАНИЕ / ВОССТАНОВЛЕНИЕ)
   ══════════════════════════════════════════════════════════════ */
let _eraserMode = false;
let _eraserSubMode = 'erase'; // 'erase' | 'restore'
let _eraserSize = 35;
let _eraserHardness = 70;
let _isErasing = false;
let _lastErasePos = null;
let _eraserOffCanvas = null;
let _eraserOrigCanvas = null;

function setEraserSubMode(subMode) {
  _eraserSubMode = subMode === 'restore' ? 'restore' : 'erase';
  $('#btn-eraser-mode-erase')?.classList.toggle('is-active', _eraserSubMode === 'erase');
  $('#btn-eraser-mode-restore')?.classList.toggle('is-active', _eraserSubMode === 'restore');
  toast(_eraserSubMode === 'erase' ? '🧹 Режим: Стирание пикселей' : '🖌️ Режим: Восстановление оригинала');
}

function setEraserSize(sz) {
  _eraserSize = Math.max(5, Math.min(150, parseInt(sz, 10) || 35));
  const slider = $('#eraser-size-slider');
  const valEl  = $('#eraser-size-val');
  if (slider) slider.value = _eraserSize;
  if (valEl)  valEl.textContent = _eraserSize;
  $$('.eraser-size-chip').forEach(chip => {
    chip.classList.toggle('is-active', parseInt(chip.dataset.size, 10) === _eraserSize);
  });
}

function setEraserHardness(hd) {
  _eraserHardness = Math.max(0, Math.min(100, parseInt(hd, 10) || 70));
  const slider = $('#eraser-hardness-slider');
  const valEl  = $('#eraser-hardness-val');
  if (slider) slider.value = _eraserHardness;
  if (valEl)  valEl.textContent = _eraserHardness;
}

function toggleEraserMode() {
  const obj = canvas?.getActiveObject();
  if (!_eraserMode && (!obj || obj.type !== 'image')) {
    toast('Выберите слой с изображением для ластика');
    return;
  }

  _eraserMode = !_eraserMode;
  const btn = $('#btn-bg-eraser');
  const panel = $('#bg-eraser-panel');
  let ring = $('#eraser-cursor-ring');
  if (!ring) {
    ring = document.createElement('div');
    ring.id = 'eraser-cursor-ring';
    ring.className = 'eraser-cursor-ring';
    document.body.appendChild(ring);
  }

  if (btn) btn.classList.toggle('is-active', _eraserMode);
  if (panel) panel.classList.toggle('hidden', !_eraserMode);

  if (_eraserMode) {
    if (!obj.__originalSrc) {
      obj.__originalSrc = obj.toDataURL ? obj.toDataURL() : (obj.getSrc?.() || obj.getElement()?.src || '');
    }

    const el = obj.getElement();
    const iw = el.naturalWidth  || el.width;
    const ih = el.naturalHeight || el.height;

    // 1. Рабочий холст ластика
    _eraserOffCanvas = document.createElement('canvas');
    _eraserOffCanvas.width = iw;
    _eraserOffCanvas.height = ih;
    const ctx = _eraserOffCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(el, 0, 0);

    // 2. Эталонный холст оригинала для мгновенного восстановления
    _eraserOrigCanvas = document.createElement('canvas');
    _eraserOrigCanvas.width = iw;
    _eraserOrigCanvas.height = ih;
    const origCtx = _eraserOrigCanvas.getContext('2d');
    origCtx.drawImage(el, 0, 0, iw, ih);

    // Подгружаем оригинальный src если он отличался
    if (obj.__originalSrc) {
      const tempOrigImg = new Image();
      tempOrigImg.crossOrigin = 'anonymous';
      tempOrigImg.onload = () => {
        origCtx.clearRect(0, 0, iw, ih);
        origCtx.drawImage(tempOrigImg, 0, 0, iw, ih);
      };
      tempOrigImg.src = obj.__originalSrc;
    }

    // Блокируем перемещение объекта во время рисования ластиком
    obj.selectable = false;
    obj.evented = false;
    if (canvas) {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
    }
    ring.classList.add('is-visible');

    toast('🧹 Ластик: проводите по фото для стирания / восстановления');
  } else {
    // Фиксируем результат
    if (_eraserOffCanvas && obj) {
      const dataUrl = _eraserOffCanvas.toDataURL('image/png');
      obj.setSrc(dataUrl, () => {
        obj.selectable = true;
        obj.evented = true;
        if (canvas) {
          canvas.selection = true;
          canvas.defaultCursor = 'default';
          canvas.setActiveObject(obj);
          canvas.renderAll();
        }
        updateLayersList();
        saveHistory();
      });
    } else if (obj) {
      obj.selectable = true;
      obj.evented = true;
      if (canvas) {
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.setActiveObject(obj);
      }
    }

    _eraserOffCanvas = null;
    _eraserOrigCanvas = null;
    _isErasing = false;
    _lastErasePos = null;
    ring.classList.remove('is-visible');
    toast('Режим ластика завершён');
  }
}

/**
 * Точный перевод координат курсора мыши в систему координат пикселей растрового изображения.
 */
function _getLocalImageCoords(obj, canvasPtr) {
  if (!obj) return null;
  const el = obj.getElement();
  const iw = el?.naturalWidth  || el?.width  || obj.width  || 1;
  const ih = el?.naturalHeight || el?.height || obj.height || 1;

  const invMat = fabric.util.invertTransform(obj.calcTransformMatrix());
  const localPt = fabric.util.transformPoint(new fabric.Point(canvasPtr.x, canvasPtr.y), invMat);

  const objW = obj.width  || iw;
  const objH = obj.height || ih;

  const lx = (localPt.x + objW * 0.5) * (iw / objW);
  const ly = (localPt.y + objH * 0.5) * (ih / objH);

  return { x: lx, y: ly, iw, ih };
}

/**
 * Применение отпечатка ластика (стирание / восстановление) со сглаженным радиальным градиентом.
 */
function _applyEraserStamp(lx, ly, obj) {
  if (!_eraserOffCanvas) return;
  const ctx = _eraserOffCanvas.getContext('2d');
  const scale = (obj.scaleX || 1);
  const r = Math.max(2, (_eraserSize / scale) * 0.5);
  const hardness = Math.min(0.99, Math.max(0.01, _eraserHardness / 100));

  if (_eraserSubMode === 'erase') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(lx, ly, r * hardness, lx, ly, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (_eraserSubMode === 'restore') {
    if (_eraserOrigCanvas) {
      const bw = Math.ceil(r * 2);
      const bCanvas = document.createElement('canvas');
      bCanvas.width = bw;
      bCanvas.height = bw;
      const bCtx = bCanvas.getContext('2d');
      bCtx.drawImage(_eraserOrigCanvas, lx - r, ly - r, bw, bw, 0, 0, bw, bw);

      const grad = bCtx.createRadialGradient(r, r, r * hardness, r, r, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(r, r, r, 0, Math.PI * 2);
      bCtx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(bCanvas, lx - r, ly - r);
      ctx.restore();
    }
  }
}

function _eraserMouseDownHandler(opt) {
  if (!_eraserMode) return;
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image') return;
  const ptr = canvas.getPointer(opt.e);
  const coords = _getLocalImageCoords(obj, ptr);
  if (!coords) return;

  _isErasing = true;
  _applyEraserStamp(coords.x, coords.y, obj);
  _lastErasePos = { x: coords.x, y: coords.y };

  obj.setElement(_eraserOffCanvas);
  obj.dirty = true;
  canvas.requestRenderAll();
}

function _eraserMouseMoveHandler(opt) {
  if (!_eraserMode) return;
  const ring = $('#eraser-cursor-ring');
  if (ring && opt.e) {
    ring.style.left = (opt.e.clientX) + 'px';
    ring.style.top  = (opt.e.clientY) + 'px';
    const obj = canvas?.getActiveObject();
    const displayDiam = Math.max(10, _eraserSize * (obj?.scaleX || 1) * (zoom || 1));
    ring.style.width  = displayDiam + 'px';
    ring.style.height = displayDiam + 'px';
    ring.classList.add('is-visible');
  }

  if (!_isErasing) return;
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image' || !_lastErasePos) return;

  const ptr = canvas.getPointer(opt.e);
  const coords = _getLocalImageCoords(obj, ptr);
  if (!coords) return;

  const dx = coords.x - _lastErasePos.x;
  const dy = coords.y - _lastErasePos.y;
  const dist = Math.hypot(dx, dy);
  const scale = (obj.scaleX || 1);
  const r = Math.max(2, (_eraserSize / scale) * 0.5);
  const step = Math.max(1, r * 0.15); // ультра-плавная интерполяция
  const steps = Math.ceil(dist / step);

  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const px = _lastErasePos.x + dx * t;
    const py = _lastErasePos.y + dy * t;
    _applyEraserStamp(px, py, obj);
  }

  _lastErasePos = { x: coords.x, y: coords.y };
  obj.setElement(_eraserOffCanvas);
  obj.dirty = true;
  canvas.requestRenderAll();
}

function _eraserMouseUpHandler(opt) {
  if (!_eraserMode || !_isErasing) return;
  _isErasing = false;
  _lastErasePos = null;
  const obj = canvas?.getActiveObject();
  if (obj && _eraserOffCanvas) {
    obj.setElement(_eraserOffCanvas);
    obj.dirty = true;
    canvas.requestRenderAll();
    saveHistory(); // Сохраняем завершённый штрих в историю
  }
}

/* ══════════════════════════════════════════════════════════════
   ДИАЛОГ ИМПОРТА ФОТО — показывает модалку выбора режима
   ══════════════════════════════════════════════════════════════ */
let _pendingPhotoFile = null;

function openPhotoImportModal(file) {
  _pendingPhotoFile = file;
  const modal = $('#photo-import-modal-overlay') || $('#import-layer-dialog');
  modal?.classList.remove('hidden');
}

function closePhotoImportModal() {
  const modal = $('#photo-import-modal-overlay') || $('#import-layer-dialog');
  modal?.classList.add('hidden');
  _pendingPhotoFile = null;
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
      saveHistory();
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
    saveHistory();
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
  if (!currentSize) return;
  const zPct = Math.round(zoom * 100);
  const text = `${currentSize.name} · ${currentSize.w} × ${currentSize.h} пт · ${zPct}%`;
  $$('#canvas-format-badge, .canvas-format-badge').forEach(badge => {
    badge.textContent = text;
  });
}

let _clipboard = null;

function copyActiveObject() {
  if (!canvas) return;
  const activeObj = canvas.getActiveObject();
  if (!activeObj) return;

  // Если курсор внутри редактируемого текста, работает нативное выделение и копирование строки
  if (activeObj.isEditing) return;

  activeObj.clone(cloned => {
    _clipboard = cloned;
    toast('Объект скопирован в буфер (Ctrl+C) 📋');
  }, CUSTOM_PROPS_TO_SAVE);
}

function pasteCopiedObject() {
  if (!canvas || !_clipboard) {
    toast('Буфер обмена пуст. Сначала скопируйте объект (Ctrl+C)');
    return;
  }

  _clipboard.clone(clonedObj => {
    canvas.discardActiveObject();
    clonedObj.set({
      left: clonedObj.left + 24,
      top: clonedObj.top + 24,
      evented: true,
    });

    if (clonedObj.type === 'activeSelection') {
      clonedObj.canvas = canvas;
      clonedObj.forEachObject(obj => {
        canvas.add(obj);
      });
      clonedObj.setCoords();
    } else {
      canvas.add(clonedObj);
    }

    _clipboard.top += 24;
    _clipboard.left += 24;
    canvas.setActiveObject(clonedObj);
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    toast('Объект вставлен на холст (Ctrl+V) ✨');
  }, CUSTOM_PROPS_TO_SAVE);
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
  }, CUSTOM_PROPS_TO_SAVE);
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
  const ox = obj.originX || 'left';
  const oy = obj.originY || 'top';

  const setLeft = l => obj.set('left', ox === 'center' ? l + ow / 2 : l);
  const setTop  = t => obj.set('top',  oy === 'center' ? t + oh / 2 : t);

  switch(alignment) {
    case 'center-h': setLeft((w - ow) / 2); break;
    case 'center-v': setTop((h - oh) / 2); break;
    case 'left':     setLeft(24); break;
    case 'right':    setLeft(w - ow - 24); break;
    case 'top':      setTop(24); break;
    case 'bottom':   setTop(h - oh - 24); break;
  }
  obj.setCoords();
  canvas.requestRenderAll();
  updateFigmaDimensionsUI(obj);
  saveHistory();
}

function fitActiveObjectToCanvas() {
  const obj = canvas?.getActiveObject();
  if (!obj || !canvas) return;
  const maxW = currentSize.w * 0.85;
  const maxH = currentSize.h * 0.85;
  const curW = obj.getScaledWidth() || obj.width || 100;
  const curH = obj.getScaledHeight() || obj.height || 100;
  if (curW > maxW || curH > maxH) {
    const scaleFactor = Math.min(maxW / curW, maxH / curH);
    obj.set({
      scaleX: (obj.scaleX || 1) * scaleFactor,
      scaleY: (obj.scaleY || 1) * scaleFactor
    });
  }
  const ow = obj.getScaledWidth();
  const oh = obj.getScaledHeight();
  const ox = obj.originX || 'left';
  const oy = obj.originY || 'top';
  obj.set({
    left: ox === 'center' ? Math.round(currentSize.w / 2) : Math.round((currentSize.w - ow) / 2),
    top:  oy === 'center' ? Math.round(currentSize.h / 2) : Math.round((currentSize.h - oh) / 2)
  });
  obj.setCoords();
  canvas.requestRenderAll();
  saveHistory();
  onSelection();
  toast('Объект отцентрирован и вписан в холст ✨');
}

/* ══════════════════════════════════════════════════════════════
   FIGMA TOOLS: EYEDROPPER, PENCIL, SHADOW, BLEND MODES
   ══════════════════════════════════════════════════════════════ */

// 1. ПИПЕТКА (Eyedropper - Горячая клавиша I)
async function activateEyedropper() {
  const btn = $('#tool-eyedropper');
  btn?.classList.add('is-active');

  if (window.EyeDropper) {
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        applyPickedColor(result.sRGBHex);
      }
    } catch (e) {
      console.log('[Eyedropper] Canceled or error:', e);
    } finally {
      btn?.classList.remove('is-active');
    }
  } else {
    startCanvasEyedropperFallback();
  }
}

let _activeEyedropperCleanup = null;

function cancelCanvasEyedropper() {
  if (typeof _activeEyedropperCleanup === 'function') {
    _activeEyedropperCleanup();
    _activeEyedropperCleanup = null;
  }
  $('#tool-eyedropper')?.classList.remove('is-active', 'active');
}

function startCanvasEyedropperFallback() {
  if (!canvas) return;
  const btn = $('#tool-eyedropper');
  btn?.classList.add('is-active');
  document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => {
    el.classList.remove('is-active', 'active');
  });
  toast('Кликните на холст, чтобы взять цвет (Esc — отмена)');
  const origCursor = canvas.defaultCursor;
  canvas.defaultCursor = 'crosshair';

  const onMouseDown = function(opt) {
    cleanup();
    const ptr = canvas.getPointer(opt.e);
    const ctx = canvas.getContext();
    const px = ctx.getImageData(Math.round(ptr.x), Math.round(ptr.y), 1, 1).data;
    const hex = '#' + [px[0], px[1], px[2]].map(x => x.toString(16).padStart(2, '0')).join('');
    applyPickedColor(hex);
    setActiveTool('select', false);
  };

  const onKey = function(e) {
    if (e.key === 'Escape') {
      cleanup();
      setActiveTool('select', false);
      toast('Пипетка отменена');
    }
  };

  function cleanup() {
    canvas.off('mouse:down', onMouseDown);
    window.removeEventListener('keydown', onKey);
    canvas.defaultCursor = origCursor;
    btn?.classList.remove('is-active', 'active');
    _activeEyedropperCleanup = null;
  }

  _activeEyedropperCleanup = cleanup;
  canvas.on('mouse:down', onMouseDown);
  window.addEventListener('keydown', onKey);
}

function applyPickedColor(hex) {
  if (!hex) return;
  hex = hex.toLowerCase();

  // Копируем цвет в буфер обмена
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(hex).catch(() => {});
    }
  } catch (err) {}

  const obj = canvas?.getActiveObject();
  if (obj) {
    const isText = ['textbox','text','i-text'].includes(obj.type);
    if (isText) {
      obj.set({ fill: hex });
      if ($('#text-color-picker')) $('#text-color-picker').value = hex;
      syncSwatches('#text-color-row', hex);
    } else {
      obj.set({ fill: hex });
      if ($('#fill-color-picker')) $('#fill-color-picker').value = hex;
      syncSwatches('#fill-color-row', hex);
    }
    const fillHex = $('#fill-hex-input');
    if (fillHex) fillHex.value = hex.toUpperCase();
    const fillChip = $('#fill-color-chip-preview');
    if (fillChip) fillChip.style.backgroundColor = hex;
    canvas.requestRenderAll();
    saveHistory();
    toast(`Пипетка: цвет ${hex.toUpperCase()} применён к объекту`);
  } else {
    if ($('#fill-color-picker')) $('#fill-color-picker').value = hex;
    if ($('#text-color-picker')) $('#text-color-picker').value = hex;
    toast(`Пипетка: скопирован цвет ${hex.toUpperCase()}`);
  }
}

// 2. КАРАНДАШ / СВОБОДНОЕ РИСОВАНИЕ (Pencil - Горячая клавиша P)
let _pencilColor = '#0d99ff';
let _pencilWidth = 4;

let currentTool = 'select';
let isPanningMode = false;
let isSpacePressed = false;
let isCanvasDragging = false;
let lastPanPosX = 0;
let lastPanPosY = 0;

/**
 * Активация и управление активным инструментом редактора (Select / Pencil / Eyedropper / Pan).
 * Гарантирует сброс конфликтующих режимов и корректное включение рамки выделения (box select).
 * @param {'select'|'pencil'|'eyedropper'|'pan'} [toolName='select']
 * @param {boolean} [showToast=false]
 */
function setActiveTool(toolName = 'select', showToast = false) {
  if (!canvas) return;
  const targetTool = toolName || 'select';

  // 1. Сброс режима свободного рисования (карандаш)
  if (targetTool !== 'pencil' && canvas.isDrawingMode) {
    canvas.isDrawingMode = false;
    $('#tool-pencil')?.classList.remove('is-active', 'active');
    $('#pencil-toolbar')?.classList.add('hidden');
  }

  // 2. Сброс режима пипетки (eyedropper)
  if (targetTool !== 'eyedropper') {
    cancelCanvasEyedropper();
  }

  // 3. Сброс панорамирования (pan / hand)
  isPanningMode = (targetTool === 'pan');
  isCanvasDragging = false;
  if (targetTool !== 'pan') {
    isSpacePressed = false;
  }

  // 4. Сброс специальных режимов (волшебная палочка, ластик)
  if (targetTool === 'select') {
    if (typeof _magicWandMode !== 'undefined' && _magicWandMode) {
      _magicWandMode = false;
      $('#btn-bg-magic-wand')?.classList.remove('is-active', 'active');
    }
    if (typeof _eraserMode !== 'undefined' && _eraserMode) {
      _eraserMode = false;
      $('#eraser-toolbar')?.classList.add('hidden');
      $('#btn-bg-manual-eraser')?.classList.remove('is-active', 'active');
    }
  }

  // 5. Конфигурация Fabric.js для выбранного инструмента
  if (targetTool === 'select') {
    canvas.selection = true; // Fabric.js рамка выделения (marquee / box select)
    canvas.skipTargetFind = false;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';

    // Гарантируем, что незаблокированные объекты доступны для кликов и рамки
    canvas.forEachObject(obj => {
      if (obj && !obj.__isArtboardBg && !obj.__locked && !obj.isLocked) {
        obj.selectable = true;
        obj.evented = true;
      }
    });
    canvas.requestRenderAll();

    // Визуальное состояние кнопок стрелочки (десктоп тулбар, мобильный тулбар)
    document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => {
      el.classList.add('is-active', 'active');
    });
    document.querySelectorAll('#tool-pencil, #tool-eyedropper, #btn-bg-eraser').forEach(el => {
      el.classList.remove('is-active', 'active');
    });

    if (showToast && typeof window.toast === 'function') {
      window.toast('Курсор: Стрелка / Выбор (V)');
    }
  } else if (targetTool === 'pan') {
    canvas.selection = false;
    canvas.defaultCursor = 'grab';
    canvas.hoverCursor = 'grab';
    document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => {
      el.classList.remove('is-active', 'active');
    });
    if (showToast && typeof window.toast === 'function') {
      window.toast('Панорамирование (пробел + перетаскивание)');
    }
  } else {
    document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => {
      el.classList.remove('is-active', 'active');
    });
  }

  window.currentTool = targetTool;
}

// Алиас для обратной совместимости
function activateSelectTool(showToast = false) {
  return setActiveTool('select', showToast);
}

window.setActiveTool = setActiveTool;
window.activateSelectTool = activateSelectTool;

function toggleDrawingMode(forcedState) {
  if (!canvas) return;
  const newState = typeof forcedState === 'boolean' ? forcedState : !canvas.isDrawingMode;
  canvas.isDrawingMode = newState;

  const toolBtn = $('#tool-pencil');
  const toolbar = $('#pencil-toolbar');

  if (newState) {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    clearProps();

    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
    canvas.freeDrawingBrush.color = _pencilColor;
    canvas.freeDrawingBrush.width = _pencilWidth;

    toolBtn?.classList.add('is-active');
    toolbar?.classList.remove('hidden');

    // Деактивируем стрелку
    document.querySelectorAll('#tool-select, #btn-header-select, #mtool-select, #dock-btn-select').forEach(el => {
      el.classList.remove('is-active', 'active');
    });

    toast('Карандаш включен (Рисуйте на холсте, Esc — выход)');
  } else {
    toolBtn?.classList.remove('is-active');
    toolbar?.classList.add('hidden');
    activateSelectTool(false);
    toast('Режим рисования завершён');
  }
}

// 3. ЭФФЕКТЫ: ТЕНЬ (Drop Shadow)
function updateActiveObjectShadow() {
  const obj = canvas?.getActiveObject();
  if (!obj) return;

  const hex = $('#shadow-color-picker')?.value || '#000000';
  const op = (parseInt($('#shadow-opacity-slider')?.value, 10) || 50) / 100;
  const blur = parseInt($('#shadow-blur-slider')?.value, 10) || 15;
  const offX = parseInt($('#shadow-offset-x')?.value, 10) || 0;
  const offY = parseInt($('#shadow-offset-y')?.value, 10) || 8;

  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  const rgba = `rgba(${r},${g},${b},${op})`;

  obj.set('shadow', new fabric.Shadow({
    color: rgba,
    blur: blur,
    offsetX: offX,
    offsetY: offY
  }));

  canvas.requestRenderAll();
}

function toggleLayerShadow() {
  const obj = canvas?.getActiveObject();
  if (!obj) {
    toast('Выберите объект для настройки тени');
    return;
  }
  const hasShadow = !!obj.shadow;
  const shadowWrap = $('#shadow-controls-wrap');
  const shadowBtnLabel = $('#shadow-toggle-label');
  const shadowBtn = $('#btn-toggle-shadow');

  if (hasShadow) {
    obj.set('shadow', null);
    if (shadowWrap) shadowWrap.style.display = 'none';
    if (shadowBtnLabel) shadowBtnLabel.textContent = 'Вкл';
    shadowBtn?.classList.remove('is-active');
    toast('Тень слоя выключена');
  } else {
    if (shadowWrap) shadowWrap.style.display = 'flex';
    if (shadowBtnLabel) shadowBtnLabel.textContent = 'Выкл';
    shadowBtn?.classList.add('is-active');
    updateActiveObjectShadow();
    toast('Тень слоя включена');
  }
  canvas.requestRenderAll();
  saveHistory();
}

// 4. ПРОЗРАЧНОСТЬ ХОЛСТА (Toggle Canvas Transparency)
function toggleCanvasTransparency() {
  if (!canvas) return;
  const currentBg = canvas.backgroundColor;
  const isTransparent = !currentBg || currentBg === 'transparent' || currentBg === '';

  if (isTransparent) {
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    saveHistory();
    toast('Установлен белый фон холста (#ffffff)');
  } else {
    canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));
    saveHistory();
    toast('Фон холста теперь прозрачный');
  }
}

async function printPoster() {
  if (!canvas) return;
  let dataUrl;

  try {
    const buffer = renderCleanArtboardCanvas(canvas, 2.0);
    dataUrl = buffer.toDataURL('image/png');
  } catch (err) {
    console.error('Print poster render error:', err);
    toast('Ошибка подготовки к печати');
    return;
  }

  if (!dataUrl) return;

  const win = window.open('', '_blank');
  if (!win) {
    toast('Разрешите всплывающие окна для печати');
    return;
  }
  const isLandscape = currentSize.w > currentSize.h;
  const safeTitle = escapeHtml($('#poster-title')?.value || 'Афиша');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>@page{size:${isLandscape ? 'landscape' : 'portrait'};margin:0;}body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;}img{width:100%;height:100%;object-fit:contain;}</style></head><body><img src="${dataUrl}" onload="setTimeout(()=>{window.print();window.close();},300)"></body></html>`);
  win.document.close();
}

/* ══════════════════════════════════════════════════════════════
   ГРУППИРОВКА И РАЗГРУППИРОВКА
   ══════════════════════════════════════════════════════════════ */
function groupSelected() {
  const activeObj = canvas?.getActiveObject();
  if (!activeObj) return;
  if (activeObj.type === 'activeSelection') {
    activeObj.toGroup();
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    onSelection();
    toast('Объекты сгруппированы 📁');
  }
}

function ungroupSelected() {
  const activeObj = canvas?.getActiveObject();
  if (!activeObj) return;
  if (activeObj.type === 'group') {
    activeObj.toActiveSelection();
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    onSelection();
    toast('Группа разделена ✂️');
  }
}

/* ══════════════════════════════════════════════════════════════
   БЛОКИРОВКА ОБЪЕКТА
   ══════════════════════════════════════════════════════════════ */
function toggleLockObject() {
  const obj = canvas?.getActiveObject();
  if (!obj) return;
  const isLocked = !!obj.lockMovementX;
  const nextLock = !isLocked;

  obj.set({
    lockMovementX: nextLock,
    lockMovementY: nextLock,
    lockScalingX: nextLock,
    lockScalingY: nextLock,
    lockRotation: nextLock,
    hasControls: !nextLock,
  });

  updateLockBtnUI(nextLock);
  canvas.renderAll();
  saveHistory();
  updateLayersList();
  toast(nextLock ? 'Объект заблокирован 🔒' : 'Объект разблокирован 🔓');
}

function updateLockBtnUI(isLocked) {
  const btn = $('#btn-lock-obj');
  const icon = $('#lock-icon');
  const label = $('#lock-label');
  if (btn) btn.classList.toggle('is-locked', !!isLocked);
  if (icon) icon.textContent = isLocked ? 'lock' : 'lock_open';
  if (label) label.textContent = isLocked ? 'Разблок' : 'Блок';
}

/* ══════════════════════════════════════════════════════════════
   ФИЛЬТРЫ ИЗОБРАЖЕНИЙ
   ══════════════════════════════════════════════════════════════ */
function applyImageFilter(obj, filterType, options = {}) {
  if (!obj || obj.type !== 'image') return;
  if (!obj.filters) obj.filters = [];
  obj.__filterValues = obj.__filterValues || { brightness: 0, contrast: 0, blur: 0, grayscale: false, sepia: false };

  obj.filters = obj.filters.filter(f => {
    if (filterType === 'Brightness' && fabric.Image?.filters?.Brightness) return !(f instanceof fabric.Image.filters.Brightness);
    if (filterType === 'Contrast'   && fabric.Image?.filters?.Contrast)   return !(f instanceof fabric.Image.filters.Contrast);
    if (filterType === 'Blur'       && fabric.Image?.filters?.Blur)       return !(f instanceof fabric.Image.filters.Blur);
    if (filterType === 'Grayscale'  && fabric.Image?.filters?.Grayscale)  return !(f instanceof fabric.Image.filters.Grayscale);
    if (filterType === 'Sepia'      && fabric.Image?.filters?.Sepia)      return !(f instanceof fabric.Image.filters.Sepia);
    return true;
  });

  if (filterType === 'Brightness') {
    obj.__filterValues.brightness = options.brightness;
    if (options.brightness !== 0 && fabric.Image?.filters?.Brightness) {
      obj.filters.push(new fabric.Image.filters.Brightness({ brightness: options.brightness / 100 }));
    }
  } else if (filterType === 'Contrast') {
    obj.__filterValues.contrast = options.contrast;
    if (options.contrast !== 0 && fabric.Image?.filters?.Contrast) {
      obj.filters.push(new fabric.Image.filters.Contrast({ contrast: options.contrast / 100 }));
    }
  } else if (filterType === 'Blur') {
    obj.__filterValues.blur = options.blur;
    if (options.blur > 0 && fabric.Image?.filters?.Blur) {
      obj.filters.push(new fabric.Image.filters.Blur({ blur: options.blur / 25 }));
    }
  } else if (filterType === 'Grayscale') {
    obj.__filterValues.grayscale = !!options.enabled;
    if (options.enabled && fabric.Image?.filters?.Grayscale) {
      obj.filters.push(new fabric.Image.filters.Grayscale());
    }
  } else if (filterType === 'Sepia') {
    obj.__filterValues.sepia = !!options.enabled;
    if (options.enabled && fabric.Image?.filters?.Sepia) {
      obj.filters.push(new fabric.Image.filters.Sepia());
    }
  }

  obj.applyFilters();
  canvas.renderAll();
}

function resetImageFilters() {
  const obj = canvas?.getActiveObject();
  if (!obj || obj.type !== 'image') return;
  obj.__filterValues = { brightness: 0, contrast: 0, blur: 0, grayscale: false, sepia: false };
  obj.filters = [];
  if (obj.__isHdrEnhanced && window.PosterEnhancer?.restoreOriginalFabricImage) {
    window.PosterEnhancer.restoreOriginalFabricImage(obj);
  }
  obj.applyFilters();
  canvas.renderAll();
  saveHistory();
  onSelection();
  toast('Фильтры изображения сброшены');
}

/* ══════════════════════════════════════════════════════════════
   ЭКСПОРТ И ИМПОРТ ПРОЕКТА (.AURORA.JSON)
   ══════════════════════════════════════════════════════════════ */
function exportProjectJSON(targetDraft = null) {
  if (!targetDraft && !canvas) {
    toast('Холст не инициализирован для экспорта проекта');
    return;
  }
  let data;
  if (targetDraft) {
    data = {
      auroraVersion: '4.90.0',
      app: 'Aurora Poster Editor',
      exportedAt: new Date().toISOString(),
      id: targetDraft.id,
      title: targetDraft.title || 'Афиша',
      sizeKey: targetDraft.sizeKey || 'a4_v',
      size: SIZES[targetDraft.sizeKey] || SIZES.a4_v,
      canvas: targetDraft.canvasData
    };
  } else {
    const sizeKey = Object.entries(SIZES).find(([,v]) => v === currentSize)?.[0] || 'a4_v';
    const canvasData = canvas.toJSON(CUSTOM_PROPS_TO_SAVE);
    data = {
      auroraVersion: '4.93.0',
      app: 'Aurora Poster Editor',
      exportedAt: new Date().toISOString(),
      id: _currentDraftId || ('draft_' + Date.now()),
      title: $('#poster-title')?.value || 'Афиша',
      sizeKey: sizeKey,
      size: currentSize,
      canvas: canvasData
    };
    // Также синхронизируем в локальные черновики
    saveCurrentDraft(false);
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (data.title || 'afisha').replace(/[\/\\?%*:|"<>]/g, '_');
  a.download = `${safeTitle}.aurora.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Проект афиши сохранён в файл (.aurora.json) 💾');
}

function importProjectJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const proj = JSON.parse(e.target.result);
        if (!proj) {
          toast('⚠️ Не удалось разобрать JSON файл проекта');
          return resolve(null);
        }
        // Поддерживаем как формат Aurora { canvas: ... }, так и прямой экспорт Fabric { objects: [...] }
        const canvasPayload = proj.canvas ? proj.canvas : (proj.objects ? proj : null);
        if (!canvasPayload) {
          toast('⚠️ Неверный формат файла проекта Aurora (.json)');
          return resolve(null);
        }

        // Определяем формат/размер
        let sizeKey = proj.sizeKey;
        if (!sizeKey && proj.size) {
          sizeKey = Object.entries(SIZES).find(([,v]) => v.w === proj.size.w && v.h === proj.size.h)?.[0];
        }
        if (!sizeKey) sizeKey = 'a4_v';
        currentSize = SIZES[sizeKey] || SIZES.a4_v;
        if (typeof window !== 'undefined') window.currentSize = currentSize;
        if (canvas) {
          canvas.__artboardWidth = currentSize.w;
          canvas.__artboardHeight = currentSize.h;
        }

        $('#screen-templates')?.classList.add('hidden');
        $('#screen-editor')?.classList.remove('hidden');

        initCanvas(currentSize.w, currentSize.h);

        const title = proj.title || file.name.replace(/\.(aurora\.)?json$/i, '') || 'Импортированный проект';
        if ($('#poster-title')) {
          $('#poster-title').value = title;
        }
        _currentDraftId = proj.id || ('draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

        let resolved = false;
        const finish = (val) => {
          if (!resolved) { resolved = true; resolve(val); }
        };

        try {
          const jsonToLoad = typeof canvasPayload === 'string' ? canvasPayload : JSON.stringify(canvasPayload);
          canvas.loadFromJSON(jsonToLoad, async () => {
            try {
              canvas.getObjects().forEach(o => {
                if (o.type === 'image' && o.__cornerRadius > 0 && !o.clipPath) {
                  setImageCornerRadius(o, o.__cornerRadius, true);
                }
              });
              canvas.renderAll();
              fitZoom();
              saveHistory();
              updateLayersList();
              clearProps();
              updateFormatBadge();
              startAutosave();

              await saveCurrentDraft(false);
              closeDraftsModal();
              toast(`📂 Проект «${title}» успешно загружен!`);
            } catch (cbErr) {
              console.warn('loadFromJSON callback err:', cbErr);
            }
            finish(true);
          });
          // Защитный таймаут на случай задержки загрузки внешних ресурсов
          setTimeout(() => finish(true), 3000);
        } catch (loadErr) {
          console.error('loadFromJSON error:', loadErr);
          finish(null);
        }
      } catch (err) {
        console.error('Import project error:', err);
        toast('Ошибка при чтении файла проекта: ' + err.message);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

/* ══════════════════════════════════════════════════════════════
   ПАНЕЛЬ СВОЙСТВ
   ══════════════════════════════════════════════════════════════ */
function clearProps() {
  $('#props-empty')?.classList.remove('hidden');
  $('#props-text')?.classList.add('hidden');
  $('#props-shape')?.classList.add('hidden');
  $('#props-image')?.classList.add('hidden');
  $('#props-common')?.classList.add('hidden');
  $('#text-glow-options')?.classList.add('hidden');
  $('#shape-glow-options')?.classList.add('hidden');
  $('#text-stroke-color-wrap')?.classList.add('hidden');
  $('#text-bg-options')?.classList.add('hidden');
  $('#btn-text-glow')?.classList.remove('is-active');
  $('#btn-shape-glow')?.classList.remove('is-active');
  $('#btn-uppercase')?.classList.remove('is-active');
  $('#btn-text-bg-toggle')?.classList.remove('is-active');
  if ($('#btn-group')) $('#btn-group').disabled = true;
  if ($('#btn-header-group')) $('#btn-header-group').disabled = true;
  if ($('#btn-ungroup')) $('#btn-ungroup').disabled = true;
  if ($('#btn-header-ungroup')) $('#btn-header-ungroup').disabled = true;
  // ── FIX: сброс universal opacity slider при снятии выделения ──
  const opCommonSlider = $('#opacity-slider-common');
  if (opCommonSlider) opCommonSlider.value = 100;
  const opCommonVal = $('#opacity-val-common');
  if (opCommonVal) opCommonVal.textContent = '100';
  const opSlider = $('#opacity-slider');
  if (opSlider) opSlider.value = 100;
  const opVal = $('#opacity-val');
  if (opVal) opVal.textContent = '100';

  // ── FIX: сброс shadow & blend mode при снятии выделения ──
  const shadowWrap = $('#shadow-controls-wrap');
  if (shadowWrap) shadowWrap.style.display = 'none';
  $('#btn-toggle-shadow')?.classList.remove('is-active');
  if ($('#shadow-toggle-label')) $('#shadow-toggle-label').textContent = 'Вкл';
  if ($('#blend-mode-select')) $('#blend-mode-select').value = 'source-over';

  // Сброс контролов скругления углов изображения
  const imgRadSlider = $('#img-corner-radius-slider');
  const imgRadVal    = $('#img-corner-radius-val');
  if (imgRadSlider) imgRadSlider.value = 0;
  if (imgRadVal)    imgRadVal.textContent = '0';
  $$('#img-corner-radius-section .corner-chip').forEach(b => b.classList.toggle('is-active', b.dataset.radius === '0'));

  updateLockBtnUI(false);
  updateLayersList();
}

function onSelection() {
  const obj = canvas?.getActiveObject();
  if (!obj) { clearProps(); return; }

  $('#props-empty')?.classList.add('hidden');
  $('#props-common')?.classList.remove('hidden');

  // ── Универсальный ползунок прозрачности (для ВСЕХ типов объектов) ──
  const opCommon = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100);
  const opCommonSlider = $('#opacity-slider-common');
  const opCommonVal    = $('#opacity-val-common');
  if (opCommonSlider) opCommonSlider.value = opCommon;
  if (opCommonVal)    opCommonVal.textContent = opCommon;

  // ── Режим наложения (Blend mode) ──
  const blendSelect = $('#blend-mode-select');
  if (blendSelect) {
    blendSelect.value = obj.globalCompositeOperation || 'source-over';
  }

  // ── Тень слоя (Drop Shadow) ──
  const hasShadow = !!obj.shadow;
  const shadowWrapEl = $('#shadow-controls-wrap');
  const shadowBtnLabel = $('#shadow-toggle-label');
  const shadowBtn = $('#btn-toggle-shadow');
  if (shadowWrapEl) shadowWrapEl.style.display = hasShadow ? 'flex' : 'none';
  if (shadowBtnLabel) shadowBtnLabel.textContent = hasShadow ? 'Выкл' : 'Вкл';
  if (shadowBtn) shadowBtn.classList.toggle('is-active', hasShadow);

  if (hasShadow && typeof obj.shadow === 'object') {
    const s = obj.shadow;
    const blur = s.blur !== undefined ? s.blur : 15;
    const offX = s.offsetX !== undefined ? s.offsetX : 0;
    const offY = s.offsetY !== undefined ? s.offsetY : 8;
    const col = s.color || 'rgba(0,0,0,0.5)';

    let hex = '#000000';
    let op = 50;
    if (typeof col === 'string') {
      if (col.startsWith('#')) {
        hex = col.slice(0, 7);
        op = 100;
      } else if (col.startsWith('rgba') || col.startsWith('rgb')) {
        const match = col.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          hex = `#${r}${g}${b}`;
          op = match[4] !== undefined ? Math.round(parseFloat(match[4]) * 100) : 100;
        }
      }
    }
    if ($('#shadow-color-picker')) $('#shadow-color-picker').value = hex;
    if ($('#shadow-opacity-slider')) $('#shadow-opacity-slider').value = op;
    if ($('#shadow-opacity-val')) $('#shadow-opacity-val').textContent = op;
    if ($('#shadow-blur-slider')) $('#shadow-blur-slider').value = blur;
    if ($('#shadow-blur-val')) $('#shadow-blur-val').textContent = blur;
    if ($('#shadow-offset-x')) $('#shadow-offset-x').value = offX;
    if ($('#shadow-offset-y')) $('#shadow-offset-y').value = offY;
  }

  const isText      = ['textbox','text','i-text'].includes(obj.type);
  const isShape     = ['rect','circle','ellipse','line','polyline','polygon','path'].includes(obj.type);
  const isImage     = obj.type === 'image';
  const isSelection = obj.type === 'activeSelection';
  const isGroup     = obj.type === 'group';

  $('#props-text')?.classList.toggle('hidden', !isText);
  $('#props-shape')?.classList.toggle('hidden', !isShape);
  $('#props-image')?.classList.toggle('hidden', !isImage);

  // Кнопки группировки и разгруппировки
  if ($('#btn-group')) $('#btn-group').disabled = !isSelection;
  if ($('#btn-header-group')) $('#btn-header-group').disabled = !isSelection;
  if ($('#btn-ungroup')) $('#btn-ungroup').disabled = !isGroup;
  if ($('#btn-header-ungroup')) $('#btn-header-ungroup').disabled = !isGroup;

  // Состояние блокировки
  updateLockBtnUI(!!obj.lockMovementX);

  if (isText) {
    // Реальный визуальный размер = fontSize * scaleY (если текст был растянут за маркер)
    const fs = Math.round((obj.fontSize || 36) * (obj.scaleY || 1));
    const fsSlider = $('#font-size-slider');
    if (fsSlider) fsSlider.value = fs;
    const fsVal = $('#font-size-val');
    if (fsVal) fsVal.textContent = fs;

    if (obj.fontFamily && $('#font-family-select')) {
      // Очищаем кавычки: obj.fontFamily может быть "'Montserrat'" из некоторых шаблонов
      const cleanFont = obj.fontFamily.replace(/['"]/g, '').trim();
      $('#font-family-select').value = cleanFont;
    }
    // Нормализуем: fontWeight может быть 700, '700', 'bold', '800' и т.д.
    const fw = obj.fontWeight;
    const isBold = fw === 'bold' || fw === 'Bold' || +fw >= 600;
    syncToggle('btn-bold',      isBold);
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

    // Обводка / контур текста
    const sw = obj.strokeWidth || 0;
    const swSlider = $('#text-stroke-width-slider');
    if (swSlider) swSlider.value = sw;
    const swVal = $('#text-stroke-width-val');
    if (swVal) swVal.textContent = sw;

    const strokeColor = obj.stroke || '#000000';
    const scp = $('#text-stroke-color-picker');
    if (scp && strokeColor.startsWith?.('#')) scp.value = strokeColor;
    syncSwatches('#text-stroke-color-row', strokeColor);
    $('#text-stroke-color-wrap')?.classList.toggle('hidden', sw <= 0);

    syncSwatches('#text-color-row', obj.fill);
    if (obj.fill?.startsWith?.('#') && $('#text-color-picker')) $('#text-color-picker').value = obj.fill;

    // Цветная подложка / плашка текста
    const hasBg = !!obj.backgroundColor && obj.backgroundColor !== 'transparent';
    syncToggle('btn-text-bg-toggle', hasBg);
    $('#text-bg-options')?.classList.toggle('hidden', !hasBg);
    if (hasBg) {
      const pad = obj.padding !== undefined ? obj.padding : 8;
      const padSlider = $('#text-bg-padding-slider');
      if (padSlider) padSlider.value = pad;
      const padVal = $('#text-bg-padding-val');
      if (padVal) padVal.textContent = pad;
      const bgCol = obj.backgroundColor || '#e11d48';
      const bgCp = $('#text-bg-color-picker');
      if (bgCp && bgCol.startsWith?.('#')) bgCp.value = bgCol;
      syncSwatches('#text-bg-color-row', bgCol);
    }
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

  if (isImage) {
    const fv = obj.__filterValues || { brightness: 0, contrast: 0, blur: 0, grayscale: false, sepia: false };
    const bSlider = $('#img-brightness-slider');
    if (bSlider) bSlider.value = fv.brightness;
    const bVal = $('#img-brightness-val');
    if (bVal) bVal.textContent = fv.brightness;

    const cSlider = $('#img-contrast-slider');
    if (cSlider) cSlider.value = fv.contrast;
    const cVal = $('#img-contrast-val');
    if (cVal) cVal.textContent = fv.contrast;

    const blSlider = $('#img-blur-slider');
    if (blSlider) blSlider.value = fv.blur;
    const blVal = $('#img-blur-val');
    if (blVal) blVal.textContent = fv.blur;

    syncToggle('btn-filter-grayscale', !!fv.grayscale);
    syncToggle('btn-filter-sepia', !!fv.sepia);

    // Статус HDR улучшения изображения
    const isEnhanced = !!obj.__isHdrEnhanced;
    $('#btn-hdr-revert')?.classList.toggle('hidden', !isEnhanced);
    if ($('#btn-hdr-revert')) $('#btn-hdr-revert').style.display = isEnhanced ? 'flex' : 'none';

    // Активный пресет HDR для фото
    const activePhotoPreset = obj.__currentHdrPreset || 'cinematic';
    $$('.enhancer-img-presets-grid .enhancer-img-preset-chip').forEach(chip => {
      chip.classList.toggle('is-active', chip.dataset.preset === activePhotoPreset);
    });
  }

  updateFigmaDimensionsUI(obj);
  updateLayersList();
}

function updateFigmaDimensionsUI(obj) {
  if (!obj) return;
  const dx = $('#dim-x');
  const dy = $('#dim-y');
  const dw = $('#dim-w');
  const dh = $('#dim-h');
  const dr = $('#dim-r');
  const drad = $('#dim-radius');
  const dRadWrap = $('#dim-radius-wrap');

  if (dx) dx.value = Math.round(obj.left || 0);
  if (dy) dy.value = Math.round(obj.top || 0);
  if (dw) dw.value = Math.round(obj.getScaledWidth() || 0);
  if (dh) dh.value = Math.round(obj.getScaledHeight() || 0);
  const angle = Math.round(((obj.angle || 0) % 360 + 360) % 360);
  if (dr) dr.value = angle;

  // Синхронизировать ползунок и label поворота
  const drSlider = $('#dim-r-slider');
  const drVal    = $('#dim-r-val');
  if (drSlider) drSlider.value = angle;
  if (drVal)    drVal.textContent = angle;

  // Подсветить активный rot-chip
  $$('.rot-chip').forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.angle && +chip.dataset.angle === angle);
  });

  const isRect = obj.type === 'rect';
  const isImg  = obj.type === 'image';
  if (dRadWrap) dRadWrap.classList.toggle('hidden', !(isRect || isImg));
  if (drad) {
    if (isRect) drad.value = Math.round(obj.rx || 0);
    else if (isImg) drad.value = Math.round(obj.__cornerRadius || 0);
  }

  if (isImg) {
    const rad = obj.__cornerRadius || (obj.clipPath ? (obj.clipPath.rx || 0) : 0);
    const imgRadSlider = $('#img-corner-radius-slider');
    const imgRadVal    = $('#img-corner-radius-val');
    if (imgRadSlider) imgRadSlider.value = rad >= 9999 ? 200 : Math.min(rad, 200);
    if (imgRadVal)    imgRadVal.textContent = rad >= 9999 ? 'Круг' : Math.round(rad);

    $$('#img-corner-radius-section .corner-chip').forEach(btn => {
      const chipRad = parseInt(btn.dataset.radius, 10);
      const isActive = (rad >= 9999 && chipRad === 9999) || (Math.round(rad) === chipRad);
      btn.classList.toggle('is-active', isActive);
    });
  }

  // Sync Fill hex & preview
  const fillHex = $('#fill-hex-input');
  if (fillHex && obj.fill && typeof obj.fill === 'string') {
    fillHex.value = obj.fill.startsWith('#') ? obj.fill.toUpperCase() : obj.fill;
  }
  const fillChip = $('#fill-color-chip-preview');
  if (fillChip && obj.fill) {
    fillChip.style.backgroundColor = obj.fill;
  }

  // Sync Stroke hex & preview
  const strokeHex = $('#stroke-hex-input');
  if (strokeHex && obj.stroke && typeof obj.stroke === 'string') {
    strokeHex.value = obj.stroke.startsWith('#') ? obj.stroke.toUpperCase() : obj.stroke;
  }
  const strokeChip = $('#stroke-color-chip-preview');
  if (strokeChip && obj.stroke) {
    strokeChip.style.backgroundColor = obj.stroke;
  }
  const strokeW = $('#dim-stroke-w');
  if (strokeW) strokeW.value = obj.strokeWidth || 0;

  // Text hex
  const textHex = $('#text-hex-val');
  if (textHex && obj.fill && typeof obj.fill === 'string') {
    textHex.value = obj.fill.startsWith('#') ? obj.fill.toUpperCase() : obj.fill;
  }
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
  const isPhoto = !!(obj.isAiPhoto || obj.__isAiPhoto || obj.aiType === 'photo');
  const isAi = !!(obj.isAiElement || obj.__isAiElement || isPhoto);

  if (obj.layerName) {
    if (isPhoto) {
      if (!obj.layerName.startsWith('[AI Photo]')) {
        const clean = obj.layerName.replace(/^\[AI(?:\s+Photo)?\]\s*/i, '');
        return `[AI Photo] ${clean}`;
      }
      return obj.layerName;
    }
    if (isAi && !obj.layerName.startsWith('[AI]')) {
      return `[AI] ${obj.layerName}`;
    }
    return obj.layerName;
  }
  if (isPhoto) {
    return `[AI Photo] ${obj.aiPrompt || obj.__aiPrompt || 'Фото'}`;
  }
  if (isAi) {
    return `[AI] ${obj.aiPrompt || obj.__aiPrompt || 'Элемент'}`;
  }
  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
    const txt = (obj.text || '').replace(/\n/g, ' ').trim();
    return txt.length > 24 ? txt.slice(0, 24) + '…' : txt || 'Текст';
  }
  if (obj.type === 'image') return 'Изображение / QR';
  const map = { rect:'Прямоугольник / Рамка', circle:'Круг', ellipse:'Эллипс', line:'Линия', group:'Группа', path:'Фигура / Звезда' };
  return map[obj.type] || obj.type;
}


function renderLayerThumb(obj) {
  const isAiPhoto = !!(obj.isAiPhoto || obj.__isAiPhoto || obj.aiType === 'photo');
  const isAi = !!(obj.isAiElement || obj.__isAiElement || isAiPhoto);

  if (obj.type === 'image') {
    const src = obj._element?.src || (typeof obj.getSrc === 'function' ? obj.getSrc() : null);
    const thumbClass = isAiPhoto ? 'is-ai is-ai-photo' : (isAi ? 'is-ai' : '');
    const badgeText = isAiPhoto ? 'AI 📷' : 'AI';
    const thumbTitle = isAiPhoto ? 'AI Фотография' : (isAi ? 'AI Элемент' : 'Изображение');

    if (src) {
      return `<div class="layer-thumb ${thumbClass}" title="${thumbTitle}">
        <img class="layer-thumb-img" src="${src}" alt="" loading="lazy">
        ${isAi ? `<span class="layer-ai-badge">${badgeText}</span>` : ''}
      </div>`;
    }
    return `<div class="layer-thumb ${thumbClass}" title="${thumbTitle}"><span class="material-symbols-rounded">${isAiPhoto ? 'photo_camera' : (isAi ? 'auto_awesome' : 'image')}</span>${isAi ? `<span class="layer-ai-badge">${badgeText}</span>` : ''}</div>`;
  }

  if (obj.type === 'group' && isAi) {
    return `<div class="layer-thumb is-ai" title="AI Векторная графика">
      <span class="material-symbols-rounded" style="color:var(--text-1)">auto_awesome</span>
      <span class="layer-ai-badge">AI</span>
    </div>`;
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

/* ── Вспомогательные функции управления слоями (с поддержкой ActiveSelection) ── */
let isLayerDragging = false;

function layerBringForward(obj) {
  if (!obj || !canvas) return;
  if (obj.type === 'activeSelection') {
    const list = [...obj.getObjects()];
    list.reverse().forEach(o => o.bringForward());
  } else {
    obj.bringForward();
  }
  canvas.requestRenderAll();
  saveHistory();
  updateLayersList();
}

function layerSendBackwards(obj) {
  if (!obj || !canvas) return;
  if (obj.type === 'activeSelection') {
    const list = [...obj.getObjects()];
    list.forEach(o => o.sendBackwards());
  } else {
    obj.sendBackwards();
  }
  canvas.requestRenderAll();
  saveHistory();
  updateLayersList();
}

function layerBringToFront(obj) {
  if (!obj || !canvas) return;
  if (obj.type === 'activeSelection') {
    const list = [...obj.getObjects()];
    list.forEach(o => o.bringToFront());
  } else {
    obj.bringToFront();
  }
  canvas.requestRenderAll();
  saveHistory();
  updateLayersList();
}

function layerSendToBack(obj) {
  if (!obj || !canvas) return;
  if (obj.type === 'activeSelection') {
    const list = [...obj.getObjects()];
    list.reverse().forEach(o => o.sendToBack());
  } else {
    obj.sendToBack();
  }
  canvas.requestRenderAll();
  saveHistory();
  updateLayersList();
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
  const activeObjects = activeObj ? (activeObj.type === 'activeSelection' ? activeObj.getObjects() : [activeObj]) : [];

  // Рисуем в порядке: верхний слой сверху (обратный от z-индекса в canvas)
  list.innerHTML = [...objs].reverse().map((obj, revIdx) => {
    const realIdx = objs.length - 1 - revIdx;
    const isActive  = activeObjects.includes(obj);
    const isHidden  = obj.visible === false;
    const isLocked  = !obj.selectable;
    const label = escapeHtml(getObjLabel(obj, realIdx));
    const isTop = realIdx === objs.length - 1;
    const isBottom = realIdx === 0;

    return `
    <div class="layer-row ${isActive?'is-active':''} ${isHidden?'is-hidden':''} ${isLocked?'is-locked':''}"
         data-idx="${realIdx}" draggable="true">
      <span class="material-symbols-rounded layer-drag-handle" title="Перетащите для изменения порядка слоя">drag_indicator</span>
      ${renderLayerThumb(obj)}
      <div class="layer-name" title="${label}">${label}</div>
      <div class="layer-order-btns">
        <button class="layer-order-btn" data-action="up" data-idx="${realIdx}" title="Поднять на уровень выше" ${isTop ? 'disabled' : ''}>
          <span class="material-symbols-rounded">keyboard_arrow_up</span>
        </button>
        <button class="layer-order-btn" data-action="down" data-idx="${realIdx}" title="Опустить на уровень ниже" ${isBottom ? 'disabled' : ''}>
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
      if (isLayerDragging) return;
      if (e.target.closest('button')) return;
      const idx = +row.dataset.idx;
      const obj = canvas.getObjects()[idx];
      if (obj && obj.selectable) {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        onSelection();
        activateSelectTool(false);
      }
    });
  });

  /* ── Drag and Drop перетаскивание слоёв ── */
  let draggedRowIdx = null;

  rows.forEach(row => {
    row.addEventListener('dragstart', e => {
      isLayerDragging = true;
      list.classList.add('is-sorting');
      draggedRowIdx = +row.dataset.idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedRowIdx));
      row.classList.add('is-dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      list.classList.remove('is-sorting');
      rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
      draggedRowIdx = null;
      setTimeout(() => {
        isLayerDragging = false;
      }, 80);
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

      // Запоминаем текущий активный объект перед перестановкой слоёв
      const activeObjBefore = canvas.getActiveObject();

      // Работаем с визуальным порядком (сверху вниз)
      const visualList = [...currentObjs].reverse();
      const fromPos = visualList.indexOf(draggedObj);
      if (fromPos === -1) return;

      visualList.splice(fromPos, 1);
      const toPos = visualList.indexOf(targetObj);
      if (toPos === -1) return;
      const insertPos = isTopHalf ? toPos : toPos + 1;
      visualList.splice(insertPos, 0, draggedObj);

      // Применяем новый порядок z-индексов к canvas (снизу вверх) атомарно
      const newCanvasOrder = [...visualList].reverse();
      canvas._objects = newCanvasOrder;

      // Восстанавливаем активный объект (гарантируем сохранение активности перетаскиваемого объекта)
      if (activeObjBefore) {
        try {
          canvas.setActiveObject(activeObjBefore);
        } catch (_) {
          canvas.setActiveObject(draggedObj);
        }
      } else {
        canvas.setActiveObject(draggedObj);
      }

      canvas.requestRenderAll();
      saveHistory();
      updateLayersList();
      onSelection();
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
          canvas.requestRenderAll(); saveHistory(); updateLayersList(); break;

        case 'lock':
          obj.set({ selectable: !obj.selectable, evented: !obj.evented });
          if (!obj.selectable && canvas.getActiveObject() === obj) {
            canvas.discardActiveObject(); clearProps();
          }
          canvas.requestRenderAll(); saveHistory(); updateLayersList(); break;

        case 'del':
          if (confirm('Удалить этот слой?')) {
            canvas.remove(obj);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            clearProps();
            saveHistory();
            updateLayersList();
          }
          break;

        case 'up':
          if (idx < canvas.getObjects().length - 1) {
            obj.bringForward();
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            saveHistory();
            updateLayersList();
            onSelection();
          }
          break;

        case 'down':
          if (idx > 0) {
            obj.sendBackwards();
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            saveHistory();
            updateLayersList();
            onSelection();
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
  const prevBg = canvas.backgroundColor;
  if (canvas.__artboardBg) canvas.backgroundColor = canvas.__artboardBg;
  history.push(JSON.stringify(canvas.toJSON(CUSTOM_PROPS_TO_SAVE)));
  canvas.backgroundColor = prevBg;
  if (history.length > MAX_HISTORY) history.shift();
  historyIdx = history.length - 1;
  updateHistoryBtns();
  savingHistory = false;
  scheduleAutosave();
}

function undo() { if (!canvas || historyIdx <= 0) return; historyIdx--; restoreHistory(); }
function redo() { if (!canvas || historyIdx >= history.length-1) return; historyIdx++; restoreHistory(); }

function restoreHistory() {
  if (!history[historyIdx]) return;
  savingHistory = true;
  canvas.loadFromJSON(history[historyIdx], () => {
    if (canvas.backgroundColor) {
      canvas.__artboardBg = canvas.backgroundColor;
      canvas.backgroundColor = '';
    }
    canvas.setViewportTransform([zoom, 0, 0, zoom, CANVAS_PADDING * zoom, CANVAS_PADDING * zoom]);
    if (currentSize) {
      canvas.__artboardWidth = currentSize.w;
      canvas.__artboardHeight = currentSize.h;
      if (typeof window !== 'undefined') window.currentSize = currentSize;
    }
    // Восстанавливаем скругление углов для изображений и AI-элементов
    canvas.getObjects().forEach(o => {
      if (o.type === 'image' && o.__cornerRadius > 0 && !o.clipPath) {
        setImageCornerRadius(o, o.__cornerRadius, true);
      }
    });
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
  if (!canvas || !currentSize) return;
  zoom = Math.min(Math.max(z, 0.08), 4.0);
  canvas.__artboardWidth = currentSize.w;
  canvas.__artboardHeight = currentSize.h;
  if (typeof window !== 'undefined') window.currentSize = currentSize;
  const totalW = (currentSize.w + CANVAS_PADDING * 2) * zoom;
  const totalH = (currentSize.h + CANVAS_PADDING * 2) * zoom;
  canvas.setWidth(totalW);
  canvas.setHeight(totalH);
  canvas.setViewportTransform([zoom, 0, 0, zoom, CANVAS_PADDING * zoom, CANVAS_PADDING * zoom]);
  $$('#zoom-label, .zoom-val').forEach(el => el.textContent = Math.round(zoom * 100) + '%');
  updateFormatBadge();
  canvas.requestRenderAll();
}

function fitZoom() {
  const wrap = $('#canvas-area');
  if (!wrap || !currentSize) return;
  const pw = wrap.clientWidth - 80;
  const ph = wrap.clientHeight - 80;
  applyZoom(Math.min(pw / currentSize.w, ph / currentSize.h, 1.0));
}

/* ══════════════════════════════════════════════════════════════
   ЭКСПОРТ И СУПЕРСЭМПЛИНГ (1K, 2K, 4K, 8K + HDR)
   ══════════════════════════════════════════════════════════════ */
let currentExportResolution = '2k';
let isExportHdrEnabled = true;
let currentHdrPreset = 'cinematic';
let isExportRunning = false;

/**
 * Получает точные геометрические размеры листа афиши (Artboard), исключая
 * CANVAS_PADDING монтажного стола и экранный zoom.
 *
 * @param {fabric.Canvas} canvasInst
 * @returns {{ w: number, h: number }}
 */
function getArtboardDimensions(canvasInst) {
  if (canvasInst) {
    if (typeof canvasInst.__artboardWidth === 'number' && canvasInst.__artboardWidth > 0 &&
        typeof canvasInst.__artboardHeight === 'number' && canvasInst.__artboardHeight > 0) {
      return { w: canvasInst.__artboardWidth, h: canvasInst.__artboardHeight };
    }
  }
  if (typeof window !== 'undefined' && window.currentSize && window.currentSize.w > 0 && window.currentSize.h > 0) {
    return { w: window.currentSize.w, h: window.currentSize.h };
  }
  if (typeof currentSize !== 'undefined' && currentSize && currentSize.w > 0 && currentSize.h > 0) {
    return { w: currentSize.w, h: currentSize.h };
  }
  // Защита от захвата CANVAS_PADDING (320px) при аварийном fallback
  if (canvasInst && typeof canvasInst.getWidth === 'function' && canvasInst.getWidth() > 0) {
    const pad = (typeof CANVAS_PADDING !== 'undefined') ? CANVAS_PADDING : 320;
    const vpt = canvasInst.viewportTransform || [1, 0, 0, 1, 0, 0];
    const z = (canvasInst.getZoom && canvasInst.getZoom() > 0) ? canvasInst.getZoom() : (vpt[0] || 1);
    const unscaledW = Math.round(canvasInst.getWidth() / z);
    const unscaledH = Math.round(canvasInst.getHeight() / z);
    const calcW = unscaledW - pad * 2;
    const calcH = unscaledH - pad * 2;
    if (calcW > 50 && calcH > 50) {
      return { w: calcW, h: calcH };
    }
  }
  return { w: 794, h: 1123 };
}

/**
 * Создает чистый растровый холст афиши (Artboard), аппаратно обрезанный
 * строго по границам [0, 0, currentSize.w, currentSize.h] без монтажного стола,
 * без выступающих за края частей и без служебных маркеров выделения.
 *
 * @param {fabric.Canvas} fabricCanvas
 * @param {number} multiplier
 * @returns {HTMLCanvasElement}
 */
function renderCleanArtboardCanvas(fabricCanvas, multiplier = 1.0) {
  if (window.PosterEnhancer && typeof window.PosterEnhancer.renderCleanArtboardCanvas === 'function') {
    return window.PosterEnhancer.renderCleanArtboardCanvas(fabricCanvas, multiplier);
  }
  const dims = getArtboardDimensions(fabricCanvas);
  const origW = dims.w;
  const origH = dims.h;
  const mult = Math.max(0.01, multiplier || 1.0);
  const targetW = Math.max(1, Math.round(origW * mult));
  const targetH = Math.max(1, Math.round(origH * mult));

  const activeObj = fabricCanvas.getActiveObject ? fabricCanvas.getActiveObject() : null;
  let selectedObjects = null;
  if (activeObj && activeObj.type === 'activeSelection') {
    selectedObjects = activeObj.getObjects();
  }

  try {
    fabricCanvas._isExporting = true;
    if (activeObj && fabricCanvas.discardActiveObject) {
      fabricCanvas.discardActiveObject();
    }

    const buffer = document.createElement('canvas');
    buffer.width = targetW;
    buffer.height = targetH;
    const ctx = buffer.getContext('2d');

    const artboardBg = fabricCanvas.__artboardBg || fabricCanvas.backgroundColor || '#ffffff';
    if (artboardBg && artboardBg !== 'transparent' && artboardBg !== '') {
      if (typeof artboardBg === 'string') {
        ctx.fillStyle = artboardBg;
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (typeof artboardBg.toLive === 'function') {
        try {
          ctx.fillStyle = artboardBg.toLive(ctx);
          ctx.fillRect(0, 0, targetW, targetH);
        } catch (e) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    // 2. АППАРАТНОЕ КАДРИРОВАНИЕ СТРОГО ПО ГРАНИЦАМ ЛИСТА [0, 0, origW, origH]
    // Любые части объектов за пределами листа отсекаются аппаратно (ctx.clip)
    ctx.save();
    ctx.scale(mult, mult);
    ctx.beginPath();
    ctx.rect(0, 0, origW, origH);
    ctx.clip();

    // 2.1 Отрисовка фонового изображения (backgroundImage), если задано
    const bgImg = fabricCanvas.backgroundImage;
    if (bgImg) {
      if (typeof bgImg.render === 'function') {
        bgImg.render(ctx);
      } else if (bgImg instanceof HTMLImageElement || bgImg instanceof HTMLCanvasElement) {
        ctx.drawImage(bgImg, 0, 0, origW, origH);
      }
    }

    // 3. Отрисовка всех объектов афиши в порядке слоёв
    const objects = fabricCanvas.getObjects ? fabricCanvas.getObjects() : [];
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj && obj.visible !== false && !obj.__isHelper && !obj.excludeFromExport) {
        obj.render(ctx);
      }
    }

    // 4. Отрисовка overlayImage, если задан
    const ovImg = fabricCanvas.overlayImage;
    if (ovImg) {
      if (typeof ovImg.render === 'function') {
        ovImg.render(ctx);
      } else if (ovImg instanceof HTMLImageElement || ovImg instanceof HTMLCanvasElement) {
        ctx.drawImage(ovImg, 0, 0, origW, origH);
      }
    }

    ctx.restore();

    return buffer;
  } finally {
    fabricCanvas._isExporting = false;
    if (activeObj) {
      if (selectedObjects && selectedObjects.length > 0 && typeof fabric !== 'undefined' && fabric.ActiveSelection) {
        const sel = new fabric.ActiveSelection(selectedObjects, { canvas: fabricCanvas });
        if (fabricCanvas.setActiveObject) fabricCanvas.setActiveObject(sel);
      } else if (!selectedObjects && fabricCanvas.contains && fabricCanvas.contains(activeObj)) {
        if (fabricCanvas.setActiveObject) fabricCanvas.setActiveObject(activeObj);
      }
    }
    if (fabricCanvas.requestRenderAll) {
      fabricCanvas.requestRenderAll();
    }
  }
}

/**
 * Безопасный запуск операций захвата/экспорта холста Fabric.js:
 * 1. Сохраняет и временно снимает выделение (включая группы ActiveSelection),
 *    чтобы рамки, ручки трансформации и маркеры не попадали в рендер.
 * 2. Устанавливает флаг canvas._isExporting = true, подавляя служебные маски,
 *    границы монтажного стола и сетку в хуках before:render / after:render.
 * 3. Временно активирует цвет фона афиши (__artboardBg), чтобы прозрачные зоны
 *    не чернели при экспорте в JPG/PDF.
 * 4. Гарантированно восстанавливает исходное состояние в finally-блоке.
 *
 * @param {Function} callback - (canvas) => Promise<any> | any
 * @returns {Promise<any>}
 */
async function withExportCanvasState(callback) {
  if (!canvas) return null;
  const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
  let selectedObjects = null;
  if (activeObj && activeObj.type === 'activeSelection') {
    selectedObjects = activeObj.getObjects();
  }

  const prevBg = canvas.backgroundColor;
  const artboardBg = canvas.__artboardBg || prevBg || '#ffffff';

  try {
    canvas._isExporting = true;
    if (activeObj && canvas.discardActiveObject) {
      canvas.discardActiveObject();
    }
    canvas.backgroundColor = artboardBg;
    if (canvas.renderAll) {
      canvas.renderAll();
    }

    return await callback(canvas);
  } finally {
    canvas._isExporting = false;
    canvas.backgroundColor = prevBg;

    if (activeObj) {
      if (selectedObjects && selectedObjects.length > 0 && typeof fabric !== 'undefined' && fabric.ActiveSelection) {
        const sel = new fabric.ActiveSelection(selectedObjects, { canvas });
        if (canvas.setActiveObject) canvas.setActiveObject(sel);
      } else if (!selectedObjects && canvas.contains && canvas.contains(activeObj)) {
        if (canvas.setActiveObject) canvas.setActiveObject(activeObj);
      }
    }
    if (canvas.renderAll) {
      canvas.renderAll();
    }
  }
}

function setExportResolution(res, notify = false) {
  currentExportResolution = (res || '2k').toLowerCase();

  // Синхронизация кнопок в инспекторе
  $$('#export-res-group .figma-preset-btn').forEach(b => {
    b.classList.toggle('is-active', (b.dataset.res || '').toLowerCase() === currentExportResolution);
  });

  // Синхронизация чипов в модальном окне
  $$('#enhancer-res-selector .enhancer-res-chip').forEach(c => {
    c.classList.toggle('is-active', (c.dataset.res || '').toLowerCase() === currentExportResolution);
  });

  updateEnhancerMetaResolution();

  if (notify && canvas && window.PosterEnhancer) {
    const dims = getArtboardDimensions(canvas);
    const scaleInfo = window.PosterEnhancer.calculateExportScale(dims.w, dims.h, currentExportResolution);
    if (scaleInfo) {
      toast(`Разрешение экспорта: ${scaleInfo.targetWidth} × ${scaleInfo.targetHeight} px (${scaleInfo.targetName})`);
    }
  }
}

function setExportHdr(enabled, notify = false) {
  isExportHdrEnabled = !!enabled;

  const chk = $('#chk-export-hdr');
  if (chk) chk.checked = isExportHdrEnabled;

  const tgl = $('#enh-toggle-hdr');
  if (tgl) tgl.checked = isExportHdrEnabled;

  const slidersList = $('#enhancer-sliders-list');
  const presetsWrap = $('.enhancer-presets-wrap');
  if (slidersList) {
    slidersList.style.opacity = isExportHdrEnabled ? '1' : '0.4';
    slidersList.style.pointerEvents = isExportHdrEnabled ? 'auto' : 'none';
  }
  if (presetsWrap) {
    presetsWrap.style.opacity = isExportHdrEnabled ? '1' : '0.4';
    presetsWrap.style.pointerEvents = isExportHdrEnabled ? 'auto' : 'none';
  }

  updateEnhancerMetaResolution();

  if (notify) {
    toast(`HDR режим: ${isExportHdrEnabled ? 'ВКЛ' : 'ВЫКЛ'}`);
  }
}

function showExportLoader(title, initialStatus = 'Подготовка холста...', initialPercent = 10) {
  // 1. В модальном окне Enhancer
  const modalLoader = $('#enhancer-loader-wrap');
  const modalStatus = $('#enhancer-loader-status');
  const modalBar = $('#enhancer-progress-bar-fill');
  if (modalLoader) {
    modalLoader.classList.remove('hidden');
    if (modalStatus) modalStatus.textContent = `${initialStatus} (${initialPercent}%)`;
    if (modalBar) modalBar.style.width = `${initialPercent}%`;
  }

  // 2. В глобальном плавающем лоадере (если модалка закрыта)
  const isModalOpen = !$('#enhancer-modal-overlay')?.classList.contains('hidden');
  const globalLoader = $('#global-export-loader');
  const globalTitle = $('#global-loader-title');
  const globalBadge = $('#global-loader-badge');
  const globalStatus = $('#global-loader-status');
  const globalBar = $('#global-loader-progress-bar');

  if (globalLoader && !isModalOpen) {
    globalLoader.classList.remove('hidden');
    if (globalTitle) globalTitle.textContent = title;
    if (globalBadge) {
      const resLabel = currentExportResolution.toUpperCase();
      globalBadge.textContent = isExportHdrEnabled ? `${resLabel} HDR` : resLabel;
    }
    if (globalStatus) globalStatus.textContent = `${initialStatus} (${initialPercent}%)`;
    if (globalBar) globalBar.style.width = `${initialPercent}%`;
  }
}

function updateExportProgress(percent, status) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const modalStatus = $('#enhancer-loader-status');
  const modalBar = $('#enhancer-progress-bar-fill');
  if (modalStatus) modalStatus.textContent = `${status} (${p}%)`;
  if (modalBar) modalBar.style.width = `${p}%`;

  const globalStatus = $('#global-loader-status');
  const globalBar = $('#global-loader-progress-bar');
  if (globalStatus) globalStatus.textContent = `${status} (${p}%)`;
  if (globalBar) globalBar.style.width = `${p}%`;
}

function hideExportLoader(successMsg) {
  const modalLoader = $('#enhancer-loader-wrap');
  const modalStatus = $('#enhancer-loader-status');
  const modalBar = $('#enhancer-progress-bar-fill');
  const globalLoader = $('#global-export-loader');
  const globalStatus = $('#global-loader-status');
  const globalBar = $('#global-loader-progress-bar');

  if (modalBar) modalBar.style.width = '100%';
  if (modalStatus) modalStatus.textContent = successMsg ? `${successMsg} (100%)` : 'Готово (100%)!';
  if (globalBar) globalBar.style.width = '100%';
  if (globalStatus) globalStatus.textContent = successMsg ? `${successMsg} (100%)` : 'Готово (100%)!';

  setTimeout(() => {
    modalLoader?.classList.add('hidden');
    if (modalBar) modalBar.style.width = '0%';
    globalLoader?.classList.add('hidden');
    if (globalBar) globalBar.style.width = '0%';
  }, 1200);
}

async function exportPng() {
  if (!canvas) { toast('Холст не готов'); return; }
  if (isExportRunning) {
    // Принудительный сброс зависшего флага через 500ms
    toast('Экспорт уже запущен, сбрасываю...');
    isExportRunning = false;
    await new Promise(r => setTimeout(r, 500));
  }
  isExportRunning = true;
  const enhancer = window.PosterEnhancer;
  const rawTitle = $('#poster-title')?.value?.trim() || 'Афиша';
  const filename = rawTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Афиша';
  const resName = currentExportResolution.toUpperCase();
  const formatTitle = `Ultra-PNG (${resName}${isExportHdrEnabled ? ' + HDR' : ''})`;

  console.log('[AURORA Export] Starting PNG export:', { resolution: currentExportResolution, hdr: isExportHdrEnabled, enhancerReady: !!enhancer });
  showExportLoader(`Экспорт ${formatTitle}`, 'Подготовка холста...', 10);

  try {
    if (enhancer && typeof enhancer.exportPoster === 'function') {
      console.log('[AURORA Export] Using PosterEnhancer.exportPoster...');
      const result = await enhancer.exportPoster(canvas, {
        resolution: currentExportResolution,
        format: 'png',
        hdr: getEnhancerHdrConfig(),
        filename: filename,
        onProgress: (p, msg) => { console.log(`[AURORA Export] ${p}% ${msg}`); updateExportProgress(p, msg); }
      });
      console.log('[AURORA Export] Done:', result?.width, 'x', result?.height);
      hideExportLoader(`Ultra-PNG (${resName}) успешно сохранён`);
      toast(`✅ Ultra-PNG (${resName}) сохранён в «Загрузки»`);
      return;
    }

    // Fallback: без enhancer
    console.warn('[AURORA Export] PosterEnhancer not available, using fallback renderCleanArtboardCanvas');
    updateExportProgress(60, 'Рендеринг холста...');
    await new Promise(r => setTimeout(r, 30));

    const mult = currentExportResolution === '8k' ? 8 : currentExportResolution === '4k' ? 4 : currentExportResolution === '2k' ? 2 : currentExportResolution === '1k' ? 1.5 : 1;
    const buffer = renderCleanArtboardCanvas(canvas, mult);
    const url = buffer.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    hideExportLoader('PNG сохранён');
    toast('PNG сохранён в папку «Загрузки»');
  } catch (err) {
    console.error('[AURORA Export] PNG error:', err);
    hideExportLoader();
    toast(`❌ Ошибка экспорта: ${err.message || err}`);
  } finally {
    isExportRunning = false;
  }
}

async function exportJpg() {
  if (!canvas) { toast('Холст не готов'); return; }
  if (isExportRunning) { isExportRunning = false; await new Promise(r => setTimeout(r, 500)); }
  isExportRunning = true;
  const enhancer = window.PosterEnhancer;
  const rawTitle = $('#poster-title')?.value?.trim() || 'Афиша';
  const filename = rawTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Афиша';
  const resName = currentExportResolution.toUpperCase();
  const formatTitle = `HDR-JPG (${resName}${isExportHdrEnabled ? ' + HDR' : ''})`;

  console.log('[AURORA Export] Starting JPG export:', { resolution: currentExportResolution, hdr: isExportHdrEnabled });
  showExportLoader(`Экспорт ${formatTitle}`, 'Подготовка холста...', 10);

  try {
    if (enhancer && typeof enhancer.exportPoster === 'function') {
      const result = await enhancer.exportPoster(canvas, {
        resolution: currentExportResolution,
        format: 'jpg',
        quality: 0.98,
        hdr: getEnhancerHdrConfig(),
        filename: filename,
        onProgress: (p, msg) => { console.log(`[AURORA Export JPG] ${p}% ${msg}`); updateExportProgress(p, msg); }
      });
      hideExportLoader(`HDR-JPG (${resName}) успешно сохранён`);
      toast(`✅ HDR-JPG (${resName}) сохранён в «Загрузки»`);
      return;
    }

    // Fallback
    console.warn('[AURORA Export] PosterEnhancer not available, using fallback');
    updateExportProgress(60, 'Рендеринг холста...');
    await new Promise(r => setTimeout(r, 30));

    const mult = currentExportResolution === '8k' ? 8 : currentExportResolution === '4k' ? 4 : currentExportResolution === '2k' ? 2 : currentExportResolution === '1k' ? 1.5 : 1;
    const buffer = renderCleanArtboardCanvas(canvas, mult);
    const url = buffer.toDataURL('image/jpeg', 0.96);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    hideExportLoader('JPG сохранён');
    toast('JPG (высокое качество) сохранён в «Загрузки»');
  } catch (err) {
    console.error('[AURORA Export] JPG error:', err);
    hideExportLoader();
    toast(`❌ Ошибка экспорта: ${err.message || err}`);
  } finally {
    isExportRunning = false;
  }
}

async function exportPdf() {
  if (!canvas || isExportRunning) return;
  isExportRunning = true;
  const enhancer = window.PosterEnhancer;
  const rawTitle = $('#poster-title')?.value?.trim() || 'Афиша';
  const filename = rawTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Афиша';
  const resName = currentExportResolution.toUpperCase();
  const formatTitle = `Print-PDF (${resName}${isExportHdrEnabled ? ' + HDR' : ''})`;

  showExportLoader(`Экспорт ${formatTitle}`, 'Подготовка холста...', 10);

  try {
    if (enhancer && typeof enhancer.exportPoster === 'function') {
      await enhancer.exportPoster(canvas, {
        resolution: currentExportResolution,
        format: 'pdf',
        hdr: getEnhancerHdrConfig(),
        filename: filename,
        onProgress: (p, msg) => updateExportProgress(p, msg)
      });
      hideExportLoader(`Print-PDF (${resName}) готов к печати`);
      toast(`Print-PDF (${resName}) готов к печати 300 DPI`);
      return;
    }

    // Fallback
    const jsPdfLib = (typeof window !== 'undefined' ? (window.jspdf?.jsPDF || window.jsPDF) : null);
    if (!jsPdfLib) {
      hideExportLoader();
      toast('PDF модуль загружается…');
      return;
    }

    updateExportProgress(60, 'Рендеринг PDF страниц...');
    await new Promise(r => setTimeout(r, 20));

    const mult = currentExportResolution === '8k' ? 4 : currentExportResolution === '4k' ? 3 : 2;
    const buffer = renderCleanArtboardCanvas(canvas, mult);
    const pdfDataUrl = buffer.toDataURL('image/jpeg', 0.96);

    const dims = getArtboardDimensions(canvas);
    const isH = dims.w > dims.h;
    const pdf = new jsPdfLib({ orientation: isH ? 'landscape' : 'portrait', unit: 'pt', format: [dims.w, dims.h] });
    pdf.addImage(pdfDataUrl, 'JPEG', 0, 0, dims.w, dims.h, undefined, 'FAST');
    pdf.save(filename + '.pdf');
    hideExportLoader('PDF готов');
    toast('PDF готов к печати');
  } catch (err) {
    console.error('Export PDF error:', err);
    hideExportLoader();
    toast(`Ошибка экспорта: ${err.message || err}`);
  } finally {
    isExportRunning = false;
  }
}

async function exportWebp() {
  if (!canvas) { toast('Холст не готов'); return; }
  if (isExportRunning) {
    toast('Экспорт уже запущен, сбрасываю...');
    isExportRunning = false;
    await new Promise(r => setTimeout(r, 500));
  }
  isExportRunning = true;
  const enhancer = window.PosterEnhancer;
  const rawTitle = $('#poster-title')?.value?.trim() || 'Афиша';
  const filename = rawTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Афиша';
  const resName = currentExportResolution.toUpperCase();
  const formatTitle = `Ultra-WebP (${resName}${isExportHdrEnabled ? ' + HDR' : ''})`;

  showExportLoader(`Экспорт ${formatTitle}`, 'Подготовка холста...', 10);

  try {
    if (enhancer && typeof enhancer.exportPoster === 'function') {
      await enhancer.exportPoster(canvas, {
        resolution: currentExportResolution,
        format: 'webp',
        hdr: getEnhancerHdrConfig(),
        filename: filename,
        onProgress: (p, msg) => updateExportProgress(p, msg)
      });
      hideExportLoader(`Ultra-WebP (${resName}) успешно сохранён`);
      toast(`✅ Ultra-WebP (${resName}) сохранён в «Загрузки»`);
      return;
    }

    updateExportProgress(60, 'Рендеринг холста...');
    await new Promise(r => setTimeout(r, 30));

    const mult = currentExportResolution === '8k' ? 8 : currentExportResolution === '4k' ? 4 : currentExportResolution === '2k' ? 2 : currentExportResolution === '1k' ? 1.5 : 1;
    const buffer = renderCleanArtboardCanvas(canvas, mult);

    updateExportProgress(85, 'Кодирование WebP...');
    const url = buffer.toDataURL('image/webp', 0.94);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.webp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    hideExportLoader(`Ultra-WebP (${resName}) успешно сохранён`);
    toast(`✅ Ultra-WebP (${resName}) сохранён в «Загрузки»`);
  } catch (err) {
    console.error('Export WebP error:', err);
    hideExportLoader();
    toast(`Ошибка экспорта WebP: ${err.message || err}`);
  } finally {
    isExportRunning = false;
  }
}

async function copyCanvasImageToClipboard() {
  if (!canvas) {
    toast('Холст не инициализирован');
    return;
  }
  toast('📋 Подготовка изображения для буфера обмена...');
  try {
    const buffer = renderCleanArtboardCanvas(canvas, 1.5);
    buffer.toBlob(async blob => {
      if (!blob) {
        toast('Ошибка создания растрового изображения');
        return;
      }
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast('✅ Афиша скопирована в буфер обмена как PNG!');
        } catch (clipErr) {
          console.warn('Clipboard write error:', clipErr);
          toast('Не удалось записать в буфер: ' + clipErr.message);
        }
      } else {
        toast('Буфер обмена не поддерживается вашим браузером');
      }
    }, 'image/png');
  } catch (err) {
    toast('Ошибка копирования в буфер: ' + err.message);
  }
}

function openHdrCompareModal() {
  if (!canvas || !window.PosterEnhancer) return;
  const overlay = $('#hdr-compare-modal-overlay');
  const container = $('#hdr-compare-canvas-container');
  if (!overlay || !container) return;

  overlay.classList.remove('hidden');

  // Синхронизация активного пресета
  $$('#hdr-compare-modal-overlay [data-hdr-preset]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.hdrPreset === currentHdrPreset);
  });

  const preview = window.PosterEnhancer.generateBeforeAfterPreview(canvas, {
    maxWidth: 960,
    preset: currentHdrPreset,
    splitRatio: 0.5
  });

  if (preview && typeof preview.mountInteractiveSlider === 'function') {
    preview.mountInteractiveSlider(container);
  }

  // Обработчики пресетов в модалке (вешаем единожды)
  if (!overlay.__hdrBound) {
    overlay.__hdrBound = true;
    $$('#hdr-compare-modal-overlay [data-hdr-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#hdr-compare-modal-overlay [data-hdr-preset]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentHdrPreset = btn.dataset.hdrPreset;
        const newPrev = window.PosterEnhancer.generateBeforeAfterPreview(canvas, {
          maxWidth: 960,
          preset: currentHdrPreset,
          splitRatio: 0.5
        });
        if (newPrev && typeof newPrev.mountInteractiveSlider === 'function') {
          newPrev.mountInteractiveSlider(container);
        }
      });
    });
  }
}

function closeHdrCompareModal() {
  $('#hdr-compare-modal-overlay')?.classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════════
   МОДАЛЬНОЕ ОКНО ULTRA-HD & HDR ENHANCER (АВРОРА)
   ══════════════════════════════════════════════════════════════ */
let enhancerPreviewObj = null;
let enhancerDebounceTimer = null;
let isEnhancerControlsInit = false;
let isEnhancerSplitDragging = false;

function getEnhancerHdrConfig() {
  if (!isExportHdrEnabled) return false;
  const clarity = (parseInt($('#enh-slider-clarity')?.value || '35', 10)) / 100;
  const shadows = (parseInt($('#enh-slider-shadows')?.value || '25', 10)) / 100;
  const vibrance = (parseInt($('#enh-slider-vibrance')?.value || '30', 10)) / 100;
  const sharpen = (parseInt($('#enh-slider-sharpen')?.value || '40', 10)) / 100;
  const basePreset = (window.PosterEnhancer?.HDR_PRESETS?.[currentHdrPreset]) || {};
  return {
    ...basePreset,
    id: currentHdrPreset,
    clarity,
    shadows,
    shadowLift: shadows,
    vibrance,
    sharpness: sharpen,
    sharpenAmount: sharpen
  };
}

function openEnhancerModal() {
  if (!canvas) return;
  const overlay = $('#enhancer-modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  initEnhancerControls();

  // Синхронизация текущего состояния редактора в модалку
  setExportResolution(currentExportResolution);
  setExportHdr(isExportHdrEnabled);

  // Синхронизация активного пресета
  $$('.enhancer-presets-row .enhancer-preset-btn').forEach(b => {
    b.classList.toggle('is-active', b.dataset.preset === currentHdrPreset);
  });

  updateEnhancerMetaResolution();
  renderEnhancerSplitPreview();
}

function closeEnhancerModal() {
  $('#enhancer-modal-overlay')?.classList.add('hidden');
}

function updateEnhancerMetaResolution() {
  if (!canvas) return;
  const metaEl = $('#enh-meta-resolution');
  const dims = getArtboardDimensions(canvas);
  const w = dims.w;
  const h = dims.h;
  let targetW = w;
  let targetH = h;
  let resLabel = currentExportResolution.toUpperCase();

  if (window.PosterEnhancer && typeof window.PosterEnhancer.calculateExportScale === 'function') {
    const scaleInfo = window.PosterEnhancer.calculateExportScale(w, h, currentExportResolution);
    targetW = scaleInfo.targetWidth;
    targetH = scaleInfo.targetHeight;
    resLabel = scaleInfo.targetName;
  } else {
    const mult = currentExportResolution === '8k' ? 8 : currentExportResolution === '4k' ? 4 : currentExportResolution === '2k' ? 2 : currentExportResolution === '1k' ? 1.5 : 1;
    targetW = Math.round(w * mult);
    targetH = Math.round(h * mult);
  }

  if (metaEl) {
    metaEl.textContent = `${targetW} × ${targetH} px (${resLabel})`;
  }

  // Обновляем плавающий бейдж над превью
  const badgeEnhanced = $('.enhancer-badge-enhanced');
  if (badgeEnhanced) {
    const badgeText = currentExportResolution.toUpperCase();
    badgeEnhanced.innerHTML = `<span class="enh-badge-star">★</span> ${badgeText}${isExportHdrEnabled ? ' HDR' : ''}`;
  }
}

function setEnhancerSplitRatio(ratio) {
  const r = Math.max(0.01, Math.min(0.99, ratio));
  const viewport = $('#enhancer-split-viewport');
  if (viewport) {
    viewport.style.setProperty('--split-pos', `${(r * 100).toFixed(2)}%`);
  }
}

function initEnhancerSplitSlider() {
  const viewport = $('#enhancer-split-viewport');
  if (!viewport || viewport.__splitBound) return;
  viewport.__splitBound = true;

  const updateFromPointer = (e) => {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width) return;
    const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    const ratio = (clientX - rect.left) / rect.width;
    setEnhancerSplitRatio(ratio);
  };

  viewport.addEventListener('mousedown', (e) => {
    isEnhancerSplitDragging = true;
    updateFromPointer(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isEnhancerSplitDragging) return;
    updateFromPointer(e);
  });

  window.addEventListener('mouseup', () => {
    isEnhancerSplitDragging = false;
  });

  viewport.addEventListener('touchstart', (e) => {
    isEnhancerSplitDragging = true;
    updateFromPointer(e);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isEnhancerSplitDragging) return;
    updateFromPointer(e);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isEnhancerSplitDragging = false;
  });
}

function renderEnhancerSplitPreview() {
  if (!canvas || !window.PosterEnhancer) return;
  const viewport = $('#enhancer-split-viewport');
  const canvasBefore = $('#enhancer-canvas-before');
  const canvasAfter = $('#enhancer-canvas-after');
  if (!viewport || !canvasBefore || !canvasAfter) return;

  const dims = getArtboardDimensions(canvas);
  const w = dims.w;
  const h = dims.h;
  const aspect = w / h;

  // Рассчитываем точные физические размеры окна сравнения под формат листа
  const previewCard = viewport.closest('.enhancer-preview-card') || viewport.parentElement;
  const cardW = previewCard ? previewCard.clientWidth : 500;
  const maxW = Math.max(260, (cardW ? cardW - 32 : 460));
  const maxH = Math.max(280, Math.min(window.innerHeight * 0.52, 520));

  let viewW, viewH;
  if (maxW / maxH > aspect) {
    viewH = Math.round(maxH);
    viewW = Math.round(maxH * aspect);
  } else {
    viewW = Math.round(maxW);
    viewH = Math.round(maxW / aspect);
  }

  viewport.style.width = `${viewW}px`;
  viewport.style.height = `${viewH}px`;
  viewport.style.aspectRatio = `${w} / ${h}`;
  viewport.style.margin = '0 auto 16px auto';

  initEnhancerSplitSlider();

  const hdrConfig = getEnhancerHdrConfig();

  try {
    enhancerPreviewObj = window.PosterEnhancer.generateBeforeAfterPreview(canvas, {
      maxWidth: 1200,
      preset: currentHdrPreset,
      hdr: hdrConfig
    });

    if (enhancerPreviewObj) {
      if (enhancerPreviewObj.beforeCanvas) {
        canvasBefore.width = enhancerPreviewObj.beforeCanvas.width;
        canvasBefore.height = enhancerPreviewObj.beforeCanvas.height;
        const bCtx = canvasBefore.getContext('2d');
        bCtx.clearRect(0, 0, canvasBefore.width, canvasBefore.height);
        bCtx.drawImage(enhancerPreviewObj.beforeCanvas, 0, 0);
      }
      if (enhancerPreviewObj.afterCanvas) {
        canvasAfter.width = enhancerPreviewObj.afterCanvas.width;
        canvasAfter.height = enhancerPreviewObj.afterCanvas.height;
        const aCtx = canvasAfter.getContext('2d');
        aCtx.clearRect(0, 0, canvasAfter.width, canvasAfter.height);
        aCtx.drawImage(enhancerPreviewObj.afterCanvas, 0, 0);
      }
    }
  } catch (err) {
    console.warn('Enhancer preview render error:', err);
  }
}

function debounceEnhancerPreview() {
  clearTimeout(enhancerDebounceTimer);
  enhancerDebounceTimer = setTimeout(() => {
    renderEnhancerSplitPreview();
  }, 100);
}

function initEnhancerControls() {
  if (isEnhancerControlsInit) return;
  isEnhancerControlsInit = true;

  initEnhancerSplitSlider();

  // Закрытие модального окна по крестику и клику на оверлей
  $('#enhancer-modal-close')?.addEventListener('click', closeEnhancerModal);
  $('#enhancer-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEnhancerModal();
  });

  // Закрытие по Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#enhancer-modal-overlay')?.classList.contains('hidden')) {
        closeEnhancerModal();
      }
      if (!$('#hdr-compare-modal-overlay')?.classList.contains('hidden')) {
        closeHdrCompareModal();
      }
    }
  });

  // Выбор целевого разрешения (чипы 1K, 2K, 4K, 8K, Оригинал)
  $$('#enhancer-res-selector .enhancer-res-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      setExportResolution(chip.dataset.res || '4k', true);
      debounceEnhancerPreview();
    });
  });

  // Тумблер HDR
  $('#enh-toggle-hdr')?.addEventListener('change', (e) => {
    setExportHdr(e.target.checked, true);
    debounceEnhancerPreview();
  });

  // Слайдеры тонкой настройки
  const bindSlider = (id, valId) => {
    const slider = $(`#${id}`);
    const valEl = $(`#${valId}`);
    if (!slider || !valEl) return;
    slider.addEventListener('input', () => {
      const v = slider.value;
      valEl.textContent = `${v > 0 ? '+' : ''}${v}%`;
      $$('.enhancer-presets-row .enhancer-preset-btn').forEach(b => b.classList.remove('is-active'));
      debounceEnhancerPreview();
    });
  };

  bindSlider('enh-slider-clarity', 'enh-val-clarity');
  bindSlider('enh-slider-shadows', 'enh-val-shadows');
  bindSlider('enh-slider-vibrance', 'enh-val-vibrance');
  bindSlider('enh-slider-sharpen', 'enh-val-sharpen');

  // Быстрые пресеты
  const presetMap = {
    print:     { clarity: 45, shadows: 30, vibrance: 20, sharpen: 50 },
    vivid:     { clarity: 35, shadows: 25, vibrance: 45, sharpen: 40 },
    light:     { clarity: 15, shadows: 15, vibrance: 15, sharpen: 20 },
    cinematic: { clarity: 40, shadows: 35, vibrance: 30, sharpen: 35 }
  };

  $$('.enhancer-presets-row .enhancer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.enhancer-presets-row .enhancer-preset-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const pKey = btn.dataset.preset;
      currentHdrPreset = pKey;
      const cfg = presetMap[pKey];
      if (cfg) {
        const setVal = (id, valId, num) => {
          const s = $(`#${id}`);
          const v = $(`#${valId}`);
          if (s) s.value = num;
          if (v) v.textContent = `${num > 0 ? '+' : ''}${num}%`;
        };
        setVal('enh-slider-clarity', 'enh-val-clarity', cfg.clarity);
        setVal('enh-slider-shadows', 'enh-val-shadows', cfg.shadows);
        setVal('enh-slider-vibrance', 'enh-val-vibrance', cfg.vibrance);
        setVal('enh-slider-sharpen', 'enh-val-sharpen', cfg.sharpen);
      }
      debounceEnhancerPreview();
    });
  });

  // Экспортные кнопки внутри модального окна
  $('#btn-enh-export-png')?.addEventListener('click', () => exportPng());
  $('#btn-enh-export-jpg')?.addEventListener('click', () => exportJpg());
  $('#btn-enh-export-pdf')?.addEventListener('click', () => exportPdf());

  // Кнопка полноэкранного просмотра превью
  $('#btn-enh-fullscreen')?.addEventListener('click', () => {
    const vp = $('#enhancer-split-viewport');
    if (!vp) return;
    if (!document.fullscreenElement) {
      vp.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  // Кнопки зума превью (синхронно для обоих слоев)
  $('#btn-enh-zoom-100')?.addEventListener('click', () => {
    const canvases = $$('#enhancer-split-viewport canvas');
    const isZoomed = canvases[0]?.style.transform === 'scale(1.4)';
    canvases.forEach(c => c.style.transform = isZoomed ? 'scale(1)' : 'scale(1.4)');
    $('#btn-enh-zoom-100')?.classList.toggle('is-active', !isZoomed);
    $('#btn-enh-zoom-fit')?.classList.toggle('is-active', isZoomed);
  });
  $('#btn-enh-zoom-fit')?.addEventListener('click', () => {
    $$('#enhancer-split-viewport canvas').forEach(c => c.style.transform = 'scale(1)');
    $('#btn-enh-zoom-fit')?.classList.add('is-active');
    $('#btn-enh-zoom-100')?.classList.remove('is-active');
  });
}


/* ══════════════════════════════════════════════════════════════
   ✦ AI ЭЛЕМЕНТ (МОДАЛЬНОЕ ОКНО, БИБЛИОТЕКА И ГЕНЕРАТОР)
   ══════════════════════════════════════════════════════════════ */
const AI_ELEMENTS_LIBRARY = [{"id": "book-portal", "cat": "books", "title": "Книга-портал", "prompt": "Магическая книга-портал со звездным сиянием", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJicF9nMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzM4YmRmOCIgc3RvcC1vcGFjaXR5PSIwLjkiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI2MCUiIHN0b3AtY29sb3I9IiM4MThjZjgiIHN0b3Atb3BhY2l0eT0iMC40Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIgc3RvcC1vcGFjaXR5PSIwIi8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJicF9wZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjZjFmNWY5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2NiZDVlMSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYnBfY3YiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzYzNjZmMSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0MzM4Y2EiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI0MCIgcj0iMTkwIiBmaWxsPSJ1cmwoI2JwX2cxKSIvPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIyNDAiIHJ4PSIxNTAiIHJ5PSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1kYXNoYXJyYXk9IjEyIDgiIG9wYWNpdHk9IjAuOCIvPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIyNDAiIHJ4PSIxMzAiIHJ5PSI3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzA4NGZjIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1kYXNoYXJyYXk9IjggNiIgb3BhY2l0eT0iMC42IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjUgMjU2IDI0MCkiLz4KICA8IS0tIEJvb2sgY292ZXIgLS0+CiAgPHBhdGggZD0iTSAxMjAgMzMwIFEgMjU2IDM2MCAzOTIgMzMwIEwgNDAwIDM0NSBRIDI1NiAzODAgMTEyIDM0NSBaIiBmaWxsPSJ1cmwoI2JwX2N2KSIvPgogIDwhLS0gQm9vayBwYWdlcyAtLT4KICA8cGF0aCBkPSJNIDEyNCAzMjAgUSAyNTYgMzUwIDI1NiAyMjAgUSAyNTYgMzUwIDM4OCAzMjAgTCAzODggMjMwIFEgMjU2IDI2MCAyNTYgMTQwIFEgMjU2IDI2MCAxMjQgMjMwIFoiIGZpbGw9InVybCgjYnBfcGcpIi8+CiAgPHBhdGggZD0iTSAyNTYgMTQwIEwgMjU2IDM0NSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8IS0tIEdvbGRlbiByYXlzIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDEyMCAyNjIsMTQ1IDI4NSwxNDAgMjY2LDE1NSAyNzUsMTgwIDI1NiwxNjIgMjM3LDE4MCAyNDYsMTU1IDIyNywxNDAgMjUwLDE0NSIgZmlsbD0iI2ZhY2MxNSIvPgogIDxjaXJjbGUgY3g9IjE4MCIgY3k9IjE4MCIgcj0iNCIgZmlsbD0iI2ZlZjA4YSIvPgogIDxjaXJjbGUgY3g9IjMzMCIgY3k9IjE3MCIgcj0iNSIgZmlsbD0iI2ZlZjA4YSIvPgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjEzMCIgcj0iMyIgZmlsbD0iIzM4YmRmOCIvPgogIDxjaXJjbGUgY3g9IjMxMCIgY3k9IjEyMCIgcj0iNCIgZmlsbD0iI2MwODRmYyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDcwIDI2MCw4MiAyNzIsODYgMjYwLDkwIDI1NiwxMDIgMjUyLDkwIDI0MCw4NiAyNTIsODIiIGZpbGw9IiMzOGJkZjgiLz4KPC9zdmc+"}, {"id": "ancient-tome", "cat": "books", "title": "Золотой фолиант", "prompt": "Старинный фолиант в кожаном переплете с золотым замком", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJhdF9iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYjQ1MzA5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjNzgzNTBmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzQ1MWEwMyIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYXRfZ29sZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmVmMDhhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjZWFiMzA4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2NhOGEwNCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3QgeD0iMTMwIiB5PSI4MCIgd2lkdGg9IjI1MCIgaGVpZ2h0PSIzNTAiIHJ4PSIyMCIgZmlsbD0idXJsKCNhdF9iZykiIHN0cm9rZT0iI2NhOGEwNCIgc3Ryb2tlLXdpZHRoPSI4Ii8+CiAgPHBhdGggZD0iTSAxNzAgODAgTCAxNzAgNDMwIiBzdHJva2U9IiM3ODM1MGYiIHN0cm9rZS13aWR0aD0iMTIiLz4KICA8cGF0aCBkPSJNIDE3MCA4MCBMIDE3MCA0MzAiIHN0cm9rZT0iI2ZhY2MxNSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI4IDEyIi8+CiAgPCEtLSBDb3JuZXIgb3JuYW1lbnRzIC0tPgogIDxwYXRoIGQ9Ik0gMTQwIDEwMCBMIDE4MCAxMDAgTCAxODAgMTIwIEwgMTYwIDEyMCBMIDE2MCAxNDAgTCAxNDAgMTQwIFoiIGZpbGw9InVybCgjYXRfZ29sZCkiLz4KICA8cGF0aCBkPSJNIDM3MCAxMDAgTCAzMzAgMTAwIEwgMzMwIDEyMCBMIDM1MCAxMjAgTCAzNTAgMTQwIEwgMzcwIDE0MCBaIiBmaWxsPSJ1cmwoI2F0X2dvbGQpIi8+CiAgPHBhdGggZD0iTSAxNDAgNDEwIEwgMTgwIDQxMCBMIDE4MCAzOTAgTCAxNjAgMzkwIEwgMTYwIDM3MCBMIDE0MCAzNzAgWiIgZmlsbD0idXJsKCNhdF9nb2xkKSIvPgogIDxwYXRoIGQ9Ik0gMzcwIDQxMCBMIDMzMCA0MTAgTCAzMzAgMzkwIEwgMzUwIDM5MCBMIDM1MCAzNzAgTCAzNzAgMzcwIFoiIGZpbGw9InVybCgjYXRfZ29sZCkiLz4KICA8IS0tIENlbnRyYWwgRW1ibGVtIC0tPgogIDxjaXJjbGUgY3g9IjI3MCIgY3k9IjI1NSIgcj0iNTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNhdF9nb2xkKSIgc3Ryb2tlLXdpZHRoPSI2Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNzAsMjE1IDI4MiwyNDMgMzEwLDI1NSAyODIsMjY3IDI3MCwyOTUgMjU4LDI2NyAyMzAsMjU1IDI1OCwyNDMiIGZpbGw9InVybCgjYXRfZ29sZCkiLz4KICA8Y2lyY2xlIGN4PSIyNzAiIGN5PSIyNTUiIHI9IjEwIiBmaWxsPSIjZGMyNjI2Ii8+CiAgPCEtLSBDbGFzcCAtLT4KICA8cmVjdCB4PSIzNjUiIHk9IjIzNSIgd2lkdGg9IjM1IiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0idXJsKCNhdF9nb2xkKSIgc3Ryb2tlPSIjNzgzNTBmIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIzODAiIGN5PSIyNTUiIHI9IjYiIGZpbGw9IiM3ODM1MGYiLz4KPC9zdmc+"}, {"id": "magic-quill", "cat": "books", "title": "Перо вдохновения", "prompt": "Светящееся волшебное перо с чернильницей и искрами", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJtcV9xIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMzOGJkZjgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNhODU1ZjciLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZWM0ODk5Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJtcV9pbmsiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzFlMWI0YiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwZjE3MmEiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gRmVhdGhlciAtLT4KICA8cGF0aCBkPSJNIDM3MCA3MCBDIDI2MCA5MCAxOTAgMTgwIDE4MCAzMjAgQyAyMDUgMjcwIDI1MCAyNDAgMzEwIDIyMCBDIDI3MCAyMjUgMjQwIDIwMCAyMzAgMTgwIEMgMjgwIDE2MCAzNDAgMTQwIDM3MCA3MCBaIiBmaWxsPSJ1cmwoI21xX3EpIi8+CiAgPCEtLSBGZWF0aGVyIHN0ZW0gLS0+CiAgPHBhdGggZD0iTSAzNzAgNzAgUSAyMzAgMjIwIDE2MCAzNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZhY2MxNSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIEluayBib3R0bGUgLS0+CiAgPHJlY3QgeD0iMTEwIiB5PSIzNjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iOTAiIHJ4PSIxNiIgZmlsbD0idXJsKCNtcV9pbmspIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iNCIvPgogIDxyZWN0IHg9IjEzNSIgeT0iMzQwIiB3aWR0aD0iNTAiIGhlaWdodD0iMjUiIHJ4PSI2IiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxlbGxpcHNlIGN4PSIxNjAiIGN5PSIzODAiIHJ4PSIzNSIgcnk9IjEwIiBmaWxsPSIjMzhiZGY4IiBvcGFjaXR5PSIwLjYiLz4KICA8IS0tIEluayBkcm9wIC0tPgogIDxjaXJjbGUgY3g9IjE2MCIgY3k9IjM1MCIgcj0iNiIgZmlsbD0iIzM4YmRmOCIvPgogIDxjaXJjbGUgY3g9IjE2MCIgY3k9IjMzMCIgcj0iNCIgZmlsbD0iI2E4NTVmNyIvPgogIDwhLS0gTWFnaWMgc3BhcmtsZXMgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIzMjAsMTEwIDMyNCwxMjIgMzM2LDEyNiAzMjQsMTMwIDMyMCwxNDIgMzE2LDEzMCAzMDQsMTI2IDMxNiwxMjIiIGZpbGw9IiNmYWNjMTUiLz4KICA8cG9seWdvbiBwb2ludHM9IjIxMCwyMTAgMjEzLDIyMCAyMjMsMjIzIDIxMywyMjYgMjEwLDIzNiAyMDcsMjI2IDE5NywyMjMgMjA3LDIyMCIgZmlsbD0iIzM4YmRmOCIvPgogIDxjaXJjbGUgY3g9IjI4MCIgY3k9IjE4MCIgcj0iNCIgZmlsbD0iI2Y0NzJiNiIvPgogIDxjaXJjbGUgY3g9IjM0MCIgY3k9IjE3MCIgcj0iMyIgZmlsbD0iI2ZhY2MxNSIvPgo8L3N2Zz4="}, {"id": "smart-owl", "cat": "books", "title": "Мудрая сова", "prompt": "Стилизованная 3D сова в золотых очках на книгах", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJzb19ib2R5IiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0NzU1NjkiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJzb19jaGVzdCIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjhmYWZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2NiZDVlMSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPCEtLSBCb29rcyBhdCBib3R0b20gLS0+CiAgPHJlY3QgeD0iMTEwIiB5PSIzODAiIHdpZHRoPSIyOTIiIGhlaWdodD0iNDAiIHJ4PSI4IiBmaWxsPSIjYjkxYzFjIiBzdHJva2U9IiNmODcxNzEiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxyZWN0IHg9IjEzMCIgeT0iMzQ1IiB3aWR0aD0iMjUyIiBoZWlnaHQ9IjM4IiByeD0iOCIgZmlsbD0iIzAzNjlhMSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjMiLz4KICA8IS0tIE93bCBib2R5IC0tPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIyNDAiIHJ4PSIxMDAiIHJ5PSIxMTUiIGZpbGw9InVybCgjc29fYm9keSkiLz4KICA8IS0tIENoZXN0IC0tPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIyNjUiIHJ4PSI1NSIgcnk9IjcwIiBmaWxsPSJ1cmwoI3NvX2NoZXN0KSIvPgogIDwhLS0gRWFycyAvIEhvcm5zIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMTc1LDE1MCAxOTUsMTkwIDE1NSwxODUiIGZpbGw9IiMzMzQxNTUiLz4KICA8cG9seWdvbiBwb2ludHM9IjMzNywxNTAgMzE3LDE5MCAzNTcsMTg1IiBmaWxsPSIjMzM0MTU1Ii8+CiAgPCEtLSBFeWVzIC0tPgogIDxjaXJjbGUgY3g9IjIxMCIgY3k9IjIxNSIgcj0iMzYiIGZpbGw9IiNmYWNjMTUiLz4KICA8Y2lyY2xlIGN4PSIzMDIiIGN5PSIyMTUiIHI9IjM2IiBmaWxsPSIjZmFjYzE1Ii8+CiAgPGNpcmNsZSBjeD0iMjEwIiBjeT0iMjE1IiByPSIxOCIgZmlsbD0iIzBmMTcyYSIvPgogIDxjaXJjbGUgY3g9IjMwMiIgY3k9IjIxNSIgcj0iMTgiIGZpbGw9IiMwZjE3MmEiLz4KICA8Y2lyY2xlIGN4PSIyMTYiIGN5PSIyMDkiIHI9IjYiIGZpbGw9IiNmZmZmZmYiLz4KICA8Y2lyY2xlIGN4PSIzMDgiIGN5PSIyMDkiIHI9IjYiIGZpbGw9IiNmZmZmZmYiLz4KICA8IS0tIEV5ZWdsYXNzZXMgLS0+CiAgPGNpcmNsZSBjeD0iMjEwIiBjeT0iMjE1IiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjUiLz4KICA8Y2lyY2xlIGN4PSIzMDIiIGN5PSIyMTUiIHI9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxwYXRoIGQ9Ik0gMjUwIDIxNSBMIDI2MiAyMTUiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSI1Ii8+CiAgPCEtLSBCZWFrIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDIzOCAyNjYsMjYwIDI0NiwyNjAiIGZpbGw9IiNmOTczMTYiLz4KICA8IS0tIEdyYWQgY2FwIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDEwMCAzNDAsMTI1IDI1NiwxNTAgMTcyLDEyNSIgZmlsbD0iIzBmMTcyYSIgc3Ryb2tlPSIjZmFjYzE1IiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIxMjUiIHI9IjUiIGZpbGw9IiNmYWNjMTUiLz4KICA8cGF0aCBkPSJNIDI1NiAxMjUgTCAzMjUgMTU1IEwgMzI1IDE3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmFjYzE1IiBzdHJva2Utd2lkdGg9IjMiLz4KPC9zdmc+"}, {"id": "scroll-chronicle", "cat": "books", "title": "Свиток знаний", "prompt": "Древний свиток с лентой и рубиновой сургучной печатью", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJzY19iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmVmM2M3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Q5NzcwNiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPCEtLSBTY3JvbGwgcm9sbCB0b3AgLS0+CiAgPGVsbGlwc2UgY3g9IjI1NiIgY3k9IjEyMCIgcng9IjE0MCIgcnk9IjI0IiBmaWxsPSIjY2E4YTA0Ii8+CiAgPGVsbGlwc2UgY3g9IjI1NiIgY3k9IjExNSIgcng9IjEzNiIgcnk9IjIwIiBmaWxsPSIjZmVmM2M3Ii8+CiAgPCEtLSBTY3JvbGwgYm9keSAtLT4KICA8cGF0aCBkPSJNIDEyMCAxMjAgTCAxMjAgMzcwIFEgMjU2IDQwMCAzOTIgMzcwIEwgMzkyIDEyMCBaIiBmaWxsPSJ1cmwoI3NjX2JnKSIvPgogIDwhLS0gU2Nyb2xsIHJvbGwgYm90dG9tIC0tPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIzNzUiIHJ4PSIxNDAiIHJ5PSIyNCIgZmlsbD0iI2NhOGEwNCIvPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIzODAiIHJ4PSIxMzYiIHJ5PSIyMCIgZmlsbD0iI2ZkZTY4YSIvPgogIDwhLS0gU2NyaXB0IGxpbmVzIC0tPgogIDxsaW5lIHgxPSIxNjAiIHkxPSIxODAiIHgyPSIzNTIiIHkyPSIxODAiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIxNjAiIHkxPSIyMTAiIHgyPSIzNTIiIHkyPSIyMTAiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIxNjAiIHkxPSIyNDAiIHgyPSIzMTAiIHkyPSIyNDAiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIxNjAiIHkxPSIyNzAiIHgyPSIzNTIiIHkyPSIyNzAiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIxNjAiIHkxPSIzMDAiIHgyPSIyODAiIHkyPSIzMDAiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNyIvPgogIDwhLS0gV2F4IFNlYWwgLS0+CiAgPGNpcmNsZSBjeD0iMzQwIiBjeT0iMzQwIiByPSIzMiIgZmlsbD0iI2I5MWMxYyIgc3Ryb2tlPSIjOTkxYjFiIiBzdHJva2Utd2lkdGg9IjQiLz4KICA8cG9seWdvbiBwb2ludHM9IjM0MCwzMjAgMzQ2LDMzNCAzNjAsMzM2IDM1MCwzNDYgMzUzLDM2MCAzNDAsMzUyIDMyNywzNjAgMzMwLDM0NiAzMjAsMzM2IDMzNCwzMzQiIGZpbGw9IiNmYWNjMTUiLz4KICA8cGF0aCBkPSJNIDMzMCAzNzAgTCAzMjAgNDIwIEwgMzQwIDQwNSBMIDM2MCA0MjAgTCAzNTAgMzcwIFoiIGZpbGw9IiM5OTFiMWIiLz4KPC9zdmc+"}, {"id": "book-stack-3d", "cat": "books", "title": "Стопка книг 3D", "prompt": "Изометрическая яркая стопка книг с закладками", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjwhLS0gQm9vayAxIChCb3R0b20sIEVtZXJhbGQpIC0tPgogIDxwYXRoIGQ9Ik0gMTAwIDM1MCBMIDM2MCAzNTAgTCA0MTAgMzIwIEwgMTUwIDMyMCBaIiBmaWxsPSIjMTBiOTgxIi8+CiAgPHJlY3QgeD0iMTAwIiB5PSIzNTAiIHdpZHRoPSIyNjAiIGhlaWdodD0iNDAiIHJ4PSI0IiBmaWxsPSIjMDQ3ODU3Ii8+CiAgPHBhdGggZD0iTSAzNjAgMzUwIEwgNDEwIDMyMCBMIDQxMCAzNjAgTCAzNjAgMzkwIFoiIGZpbGw9IiMwNjVmNDYiLz4KICA8IS0tIEJvb2sgMiAoTWlkZGxlLCBSdWJ5KSAtLT4KICA8cGF0aCBkPSJNIDEyMCAyOTAgTCAzODAgMjkwIEwgNDMwIDI2MCBMIDE3MCAyNjAgWiIgZmlsbD0iI2Y0M2Y1ZSIvPgogIDxyZWN0IHg9IjEyMCIgeT0iMjkwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iI2JlMTIzYyIvPgogIDxwYXRoIGQ9Ik0gMzgwIDI5MCBMIDQzMCAyNjAgTCA0MzAgMzAwIEwgMzgwIDMzMCBaIiBmaWxsPSIjOWYxMjM5Ii8+CiAgPCEtLSBCb29rIDMgKFRvcCwgU2FwcGhpcmUpIC0tPgogIDxwYXRoIGQ9Ik0gMTQwIDIzMCBMIDQwMCAyMzAgTCA0NTAgMjAwIEwgMTkwIDIwMCBaIiBmaWxsPSIjMzhiZGY4Ii8+CiAgPHJlY3QgeD0iMTQwIiB5PSIyMzAiIHdpZHRoPSIyNjAiIGhlaWdodD0iNDAiIHJ4PSI0IiBmaWxsPSIjMDI4NGM3Ii8+CiAgPHBhdGggZD0iTSA0MDAgMjMwIEwgNDUwIDIwMCBMIDQ1MCAyNDAgTCA0MDAgMjcwIFoiIGZpbGw9IiMwMzY5YTEiLz4KICA8IS0tIEJvb2ttYXJrIHJpYmJvbiAtLT4KICA8cGF0aCBkPSJNIDI4MCAyMzAgTCAyODAgMjgwIEwgMjkwIDI3MCBMIDMwMCAyODAgTCAzMDAgMjMwIFoiIGZpbGw9IiNmYWNjMTUiLz4KICA8IS0tIFBhZ2VzIGVkZ2UgLS0+CiAgPHJlY3QgeD0iMTQ1IiB5PSIyMzgiIHdpZHRoPSIyNTAiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjZjhmYWZjIi8+CiAgPHJlY3QgeD0iMTI1IiB5PSIyOTgiIHdpZHRoPSIyNTAiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjZjhmYWZjIi8+CiAgPHJlY3QgeD0iMTA1IiB5PSIzNTgiIHdpZHRoPSIyNTAiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjZjhmYWZjIi8+CiAgPCEtLSBHbG93aW5nIHN0YXIgb24gdG9wIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMzIwLDE0MCAzMjYsMTU2IDM0MiwxNjAgMzMwLDE3MiAzMzMsMTg4IDMyMCwxODAgMzA3LDE4OCAzMTAsMTcyIDI5OCwxNjAgMzE0LDE1NiIgZmlsbD0iI2ZiYmYyNCIvPgo8L3N2Zz4="}, {"id": "cosmo-reader", "cat": "space", "title": "Космонавт-читатель", "prompt": "Маскот космонавт с книгой в невесомости", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJjcl92IiBjeD0iMzAlIiBjeT0iMzAlIiByPSI3MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmVmMDhhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDAlIiBzdG9wLWNvbG9yPSIjZjU5ZTBiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2I0NTMwOSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY3Jfc3UiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM5NGEzYjgiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gSGVsbWV0IC0tPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjE4MCIgcj0iMTAwIiBmaWxsPSJ1cmwoI2NyX3N1KSIgc3Ryb2tlPSIjMGVhNWU5IiBzdHJva2Utd2lkdGg9IjYiLz4KICA8IS0tIFZpc29yIC0tPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIxODUiIHJ4PSI3NSIgcnk9IjU1IiBmaWxsPSJ1cmwoI2NyX3YpIi8+CiAgPGVsbGlwc2UgY3g9IjIzMCIgY3k9IjE2NSIgcng9IjIwIiByeT0iMTAiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuNiIvPgogIDwhLS0gQmFja3BhY2sgLS0+CiAgPHJlY3QgeD0iMTMwIiB5PSIyNDAiIHdpZHRoPSIyNTIiIGhlaWdodD0iMTUwIiByeD0iMzAiIGZpbGw9IiM2NDc0OGIiLz4KICA8IS0tIFN1aXQgYm9keSAtLT4KICA8cGF0aCBkPSJNIDE2MCAyNzAgUSAyNTYgMjUwIDM1MiAyNzAgTCAzNzAgNDIwIFEgMjU2IDQ0MCAxNDIgNDIwIFoiIGZpbGw9InVybCgjY3Jfc3UpIi8+CiAgPCEtLSBDaGVzdCBwYW5lbCAtLT4KICA8cmVjdCB4PSIyMTYiIHk9IjI5NSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjUwIiByeD0iOCIgZmlsbD0iIzFlMjkzYiIvPgogIDxjaXJjbGUgY3g9IjIzNiIgY3k9IjMyMCIgcj0iOCIgZmlsbD0iI2VmNDQ0NCIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjMyMCIgcj0iOCIgZmlsbD0iIzIyYzU1ZSIvPgogIDxjaXJjbGUgY3g9IjI3NiIgY3k9IjMyMCIgcj0iOCIgZmlsbD0iIzNiODJmNiIvPgogIDwhLS0gRmxvYXRpbmcgQm9vayAtLT4KICA8cGF0aCBkPSJNIDE5MCAzOTAgUSAyNTYgNDEwIDMyMiAzOTAgTCAzMzAgNDM1IFEgMjU2IDQ1NSAxODIgNDM1IFoiIGZpbGw9IiMwMjg0YzciLz4KICA8cGF0aCBkPSJNIDE5NCAzODUgUSAyNTYgNDA1IDI1NiAzNDAgUSAyNTYgNDA1IDMxOCAzODUgTCAzMTggMzUwIFEgMjU2IDM3MCAyNTYgMzEwIFEgMjU2IDM3MCAxOTQgMzUwIFoiIGZpbGw9IiNmZmZmZmYiLz4KICA8IS0tIFN0YXJzIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMTIwLDEyMCAxMjQsMTMyIDEzNiwxMzYgMTI0LDE0MCAxMjAsMTUyIDExNiwxNDAgMTA0LDEzNiAxMTYsMTMyIiBmaWxsPSIjMzhiZGY4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIzODAsMTAwIDM4MywxMTAgMzkzLDExMyAzODMsMTE2IDM4MCwxMjYgMzc3LDExNiAzNjcsMTEzIDM3NywxMTAiIGZpbGw9IiNmYWNjMTUiLz4KPC9zdmc+"}, {"id": "crystal-galaxy", "cat": "space", "title": "Кристалл знаний", "prompt": "Неоновый граненый кристалл с галактикой внутри", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJjZ19mMSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzYzNjZmMSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY2dfZjIiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlYzQ4OTkiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImNnX2YzIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiIHN0b3Atb3BhY2l0eT0iMC44Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2E4NTVmNyIgc3RvcC1vcGFjaXR5PSIwLjIiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gQW1iaWVudCBnbG93IC0tPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTgwIiBmaWxsPSIjYTg1NWY3IiBvcGFjaXR5PSIwLjE1Ii8+CiAgPCEtLSBDcnlzdGFsIGZhY2V0cyAtLT4KICA8IS0tIFRvcCBhcGV4IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDYwIDE3MCwxOTAgMjU2LDE3MCIgZmlsbD0idXJsKCNjZ19mMSkiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDYwIDI1NiwxNzAgMzQyLDE5MCIgZmlsbD0idXJsKCNjZ19mMikiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDYwIDE0MCwyMTAgMTcwLDE5MCIgZmlsbD0iIzAyODRjNyIgb3BhY2l0eT0iMC44Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNjAgMzQyLDE5MCAzNzIsMjEwIiBmaWxsPSIjZGIyNzc3IiBvcGFjaXR5PSIwLjgiLz4KICA8IS0tIENlbnRlciBnaXJkbGUgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxNzAsMTkwIDI1NiwxNzAgMzQyLDE5MCAyNTYsMzEwIiBmaWxsPSJ1cmwoI2NnX2YzKSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIxMCAxNzAsMTkwIDI1NiwzMTAgMTgwLDMzMCIgZmlsbD0idXJsKCNjZ19mMSkiIG9wYWNpdHk9IjAuODUiLz4KICA8cG9seWdvbiBwb2ludHM9IjM3MiwyMTAgMzQyLDE5MCAyNTYsMzEwIDMzMiwzMzAiIGZpbGw9InVybCgjY2dfZjIpIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPCEtLSBCb3R0b20gYXBleCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjI1Niw0NTAgMTgwLDMzMCAyNTYsMzEwIiBmaWxsPSIjNDMzOGNhIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNDUwIDI1NiwzMTAgMzMyLDMzMCIgZmlsbD0iIzkzMzNlYSIvPgogIDwhLS0gSW5uZXIgU3RhcnMgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjQwIiByPSIxNCIgZmlsbD0iI2ZmZmZmZiIgZmlsdGVyPSJkcm9wLXNoYWRvdygwIDAgOHB4ICNmZmYpIi8+CiAgPGNpcmNsZSBjeD0iMjMwIiBjeT0iMjIwIiByPSI0IiBmaWxsPSIjZmVmMDhhIi8+CiAgPGNpcmNsZSBjeD0iMjgwIiBjeT0iMjYwIiByPSI1IiBmaWxsPSIjMzhiZGY4Ii8+Cjwvc3ZnPg=="}, {"id": "cyber-planet", "cat": "space", "title": "Неоновая планета", "prompt": "Космическая планета с голографическими кольцами", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJjcF9wIiBjeD0iMzUlIiBjeT0iMzUlIiByPSI2NSUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDUlIiBzdG9wLWNvbG9yPSIjNjM2NmYxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iODUlIiBzdG9wLWNvbG9yPSIjMWUxYjRiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBmMTcyYSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY3BfciIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjAiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZWM0ODk5IiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIyNSUiIHN0b3AtY29sb3I9IiNlYzQ4OTkiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNmYWNjMTUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI3NSUiIHN0b3AtY29sb3I9IiMzOGJkZjgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4IiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gQmFjayByaW5nIC0tPgogIDxlbGxpcHNlIGN4PSIyNTYiIGN5PSIyNTYiIHJ4PSIyMjAiIHJ5PSI1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI2NwX3IpIiBzdHJva2Utd2lkdGg9IjE4IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjIgMjU2IDI1NikiIHN0cm9rZS1kYXNoYXJyYXk9IjM4MCA0MDAiIHN0cm9rZS1kYXNob2Zmc2V0PSIxODAiLz4KICA8IS0tIFBsYW5ldCBzcGhlcmUgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIxMjUiIGZpbGw9InVybCgjY3BfcCkiLz4KICA8IS0tIEF0bW9zcGhlcmljIGJhbmRzIC0tPgogIDxwYXRoIGQ9Ik0gMTQ1IDIyMCBRIDI1NiAyNjAgMzY3IDIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODE4Y2Y4IiBzdHJva2Utd2lkdGg9IjYiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik0gMTM1IDI2MCBRIDI1NiAzMDAgMzc3IDI2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjgiIG9wYWNpdHk9IjAuNSIvPgogIDxwYXRoIGQ9Ik0gMTQ4IDI5NSBRIDI1NiAzMzUgMzY0IDI5NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzA4NGZjIiBzdHJva2Utd2lkdGg9IjUiIG9wYWNpdHk9IjAuNCIvPgogIDwhLS0gRnJvbnQgcmluZyAtLT4KICA8ZWxsaXBzZSBjeD0iMjU2IiBjeT0iMjU2IiByeD0iMjIwIiByeT0iNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNjcF9yKSIgc3Ryb2tlLXdpZHRoPSIxOCIgdHJhbnNmb3JtPSJyb3RhdGUoLTIyIDI1NiAyNTYpIiBzdHJva2UtZGFzaGFycmF5PSIzODAgNDAwIi8+CiAgPCEtLSBTcGFya2xlcyAtLT4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMjAiIHI9IjQiIGZpbGw9IiMzOGJkZjgiLz4KICA8Y2lyY2xlIGN4PSI0MTAiIGN5PSIzODAiIHI9IjUiIGZpbGw9IiNmNDcyYjYiLz4KICA8cG9seWdvbiBwb2ludHM9IjM4MCwxNDAgMzgzLDE0OCAzOTEsMTUxIDM4MywxNTQgMzgwLDE2MiAzNzcsMTU0IDM2OSwxNTEgMzc3LDE0OCIgZmlsbD0iI2ZhY2MxNSIvPgo8L3N2Zz4="}, {"id": "cosmo-rocket", "cat": "space", "title": "Ракета открытий", "prompt": "3D космическая ракета с огненным шлейфом", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJjcmtfYiIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjZTJlOGYwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY3JrX2ZsIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZWYwOGEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0MCUiIHN0b3AtY29sb3I9IiNmOTczMTYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZGMyNjI2IiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gRmxhbWUgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNDgwIDIxNiwzNjAgMjk2LDM2MCIgZmlsbD0idXJsKCNjcmtfZmwpIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNDMwIDIzNiwzNjAgMjc2LDM2MCIgZmlsbD0iI2ZlZjA4YSIvPgogIDwhLS0gRmlucyAtLT4KICA8cGF0aCBkPSJNIDE5MCAzNTAgTCAxNDAgMzkwIEwgMTcwIDMwMCBaIiBmaWxsPSIjZWY0NDQ0Ii8+CiAgPHBhdGggZD0iTSAzMjIgMzUwIEwgMzcyIDM5MCBMIDM0MiAzMDAgWiIgZmlsbD0iI2VmNDQ0NCIvPgogIDwhLS0gQm9keSAtLT4KICA8cGF0aCBkPSJNIDI1NiA2MCBRIDMyMCAxODAgMzIwIDM2MCBMIDE5MiAzNjAgUSAxOTIgMTgwIDI1NiA2MCBaIiBmaWxsPSJ1cmwoI2Nya19iKSIvPgogIDwhLS0gTm9zZWNvbmUgLS0+CiAgPHBhdGggZD0iTSAyNTYgNjAgUSAyOTUgMTMwIDMwNSAxNzAgTCAyMDcgMTcwIFEgMjE3IDEzMCAyNTYgNjAgWiIgZmlsbD0iI2VmNDQ0NCIvPgogIDwhLS0gUG9ydGhvbGUgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjI1IiByPSIzMiIgZmlsbD0iIzAyODRjNyIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjYiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyMjUiIHI9IjI0IiBmaWxsPSIjMzhiZGY4Ii8+CiAgPGNpcmNsZSBjeD0iMjY0IiBjeT0iMjE3IiByPSI3IiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjgiLz4KICA8IS0tIFNtb2tlIGNsb3VkcyAtLT4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSI0MjAiIHI9IjIyIiBmaWxsPSIjY2JkNWUxIiBvcGFjaXR5PSIwLjYiLz4KICA8Y2lyY2xlIGN4PSIzMTIiIGN5PSI0MjAiIHI9IjIyIiBmaWxsPSIjY2JkNWUxIiBvcGFjaXR5PSIwLjYiLz4KPC9zdmc+"}, {"id": "ai-robot-bot", "cat": "space", "title": "Робот-архивариус", "prompt": "Милый круглый кибер-робот библиотекарь с антенной", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJyYl9oZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjhmYWZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPCEtLSBBbnRlbm5hIC0tPgogIDxsaW5lIHgxPSIyNTYiIHkxPSIxMjAiIHgyPSIyNTYiIHkyPSI3MCIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjYwIiByPSIxNiIgZmlsbD0iIzM4YmRmOCIgZmlsdGVyPSJkcm9wLXNoYWRvdygwIDAgOHB4ICMzOGJkZjgpIi8+CiAgPCEtLSBIZWFkIE9yYiAtLT4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNDAiIHI9IjEzMCIgZmlsbD0idXJsKCNyYl9oZCkiIHN0cm9rZT0iIzAyODRjNyIgc3Ryb2tlLXdpZHRoPSI2Ii8+CiAgPCEtLSBTY3JlZW4gZmFjZSAtLT4KICA8cmVjdCB4PSIxNzYiIHk9IjE4MCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI5MCIgcng9IjMwIiBmaWxsPSIjMGYxNzJhIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iNCIvPgogIDwhLS0gQ3lhbiBMRUQgRXllcyAtLT4KICA8ZWxsaXBzZSBjeD0iMjE2IiBjeT0iMjI1IiByeD0iMTYiIHJ5PSIxOCIgZmlsbD0iIzM4YmRmOCIvPgogIDxlbGxpcHNlIGN4PSIyOTYiIGN5PSIyMjUiIHJ4PSIxNiIgcnk9IjE4IiBmaWxsPSIjMzhiZGY4Ii8+CiAgPGNpcmNsZSBjeD0iMjIyIiBjeT0iMjE5IiByPSI1IiBmaWxsPSIjZmZmZmZmIi8+CiAgPGNpcmNsZSBjeD0iMzAyIiBjeT0iMjE5IiByPSI1IiBmaWxsPSIjZmZmZmZmIi8+CiAgPCEtLSBTbWlsZSAtLT4KICA8cGF0aCBkPSJNIDI0MCAyNDUgUSAyNTYgMjU4IDI3MiAyNDUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIEVhcnMgLyBIZWFkcGhvbmVzIC0tPgogIDxyZWN0IHg9IjExMCIgeT0iMjEwIiB3aWR0aD0iMjIiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSIjMDI4NGM3Ii8+CiAgPHJlY3QgeD0iMzgwIiB5PSIyMTAiIHdpZHRoPSIyMiIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9IiMwMjg0YzciLz4KICA8IS0tIEhvdmVyIGdsb3cgYmFzZSAtLT4KICA8ZWxsaXBzZSBjeD0iMjU2IiBjeT0iMzkwIiByeD0iOTAiIHJ5PSIyNCIgZmlsbD0iIzM4YmRmOCIgb3BhY2l0eT0iMC40Ii8+CiAgPGVsbGlwc2UgY3g9IjI1NiIgY3k9IjM4NSIgcng9IjYwIiByeT0iMTQiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuNyIvPgo8L3N2Zz4="}, {"id": "hologram-cube", "cat": "space", "title": "Куб данных", "prompt": "Светящийся изометрический голографический куб знаний", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjwhLS0gSXNvbWV0cmljIEN1YmUgLS0+CiAgPCEtLSBUb3AgRmFjZSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjI1Niw5MCAzOTAsMTY1IDI1NiwyNDAgMTIyLDE2NSIgZmlsbD0iIzAyODRjNyIgb3BhY2l0eT0iMC44NSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8IS0tIExlZnQgRmFjZSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjEyMiwxNjUgMjU2LDI0MCAyNTYsMzk1IDEyMiwzMjAiIGZpbGw9IiMwZjE3MmEiIG9wYWNpdHk9IjAuOSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8IS0tIFJpZ2h0IEZhY2UgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsMjQwIDM5MCwxNjUgMzkwLDMyMCAyNTYsMzk1IiBmaWxsPSIjMWUxYjRiIiBvcGFjaXR5PSIwLjkiIHN0cm9rZT0iIzgxOGNmOCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPCEtLSBHbG93aW5nIERhdGEgU3ltYm9scyAtLT4KICA8dGV4dCB4PSIyNTYiIHk9IjE4MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNmYWNjMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCQ0JLQoNCe0KDQkDwvdGV4dD4KICA8dGV4dCB4PSIxODAiIHk9IjI5NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzOGJkZjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPiZsdDtBSS8mZ3Q7PC90ZXh0PgogIDx0ZXh0IHg9IjMzMCIgeT0iMjk1IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjMwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2MwODRmYyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+MjAyNjwvdGV4dD4KICA8IS0tIFdpcmVmcmFtZSBsaW5lcyAtLT4KICA8bGluZSB4MT0iMjU2IiB5MT0iOTAiIHgyPSIyNTYiIHkyPSIzOTUiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI2IDYiLz4KPC9zdmc+"}, {"id": "pushkin-badge", "cat": "badges", "title": "Пушкинская карта AI", "prompt": "Голографический неоновый стикер Пушкинская карта", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYl9iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUxYjRiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjNGMxZDk1Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzgzMTg0MyIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3QgeD0iNjAiIHk9IjEwMCIgd2lkdGg9IjM5MiIgaGVpZ2h0PSIzMTIiIHJ4PSIzNiIgZmlsbD0idXJsKCNwYl9iZykiIHN0cm9rZT0iI2VjNDg5OSIgc3Ryb2tlLXdpZHRoPSI4Ii8+CiAgPHJlY3QgeD0iNzQiIHk9IjExNCIgd2lkdGg9IjM2NCIgaGVpZ2h0PSIyODQiIHJ4PSIyNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1kYXNoYXJyYXk9IjEwIDgiLz4KICA8IS0tIFB1c2hraW4gc2lsaG91ZXR0ZSBwcm9maWxlIC0tPgogIDxwYXRoIGQ9Ik0gMTkwIDI3MCBDIDE4MCAyNTAgMTcwIDIzMCAxODAgMjAwIEMgMTkwIDE3MCAyMjAgMTYwIDI0MCAxNzAgQyAyNTUgMTYwIDI3MCAxNjUgMjc1IDE4MCBDIDI5MCAxODAgMjk1IDE5NSAyODUgMjEwIEMgMzAwIDIyNSAyODAgMjQ1IDI4NSAyNTUgQyAyOTAgMjY1IDI3NSAyODAgMjY1IDI4NSBDIDI1MCAyOTAgMjM1IDMwMCAyMjAgMzAwIFoiIGZpbGw9IiNmYWNjMTUiLz4KICA8dGV4dCB4PSIyNTYiIHk9IjM0NSIgZm9udC1mYW1pbHk9IidNb250c2VycmF0Jywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjEiPtCf0KPQqNCa0JjQndCh0JrQkNCvPC90ZXh0PgogIDx0ZXh0IHg9IjI1NiIgeT0iMzc1IiBmb250LWZhbWlseT0iJ01vbnRzZXJyYXQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjMzhiZGY4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+0JrQkNCg0KLQkDwvdGV4dD4KICA8IS0tIFNwYXJrbGVzIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMTEwLDE1MCAxMTQsMTYwIDEyNCwxNjMgMTE0LDE2NiAxMTAsMTc2IDEwNiwxNjYgOTYsMTYzIDEwNiwxNjAiIGZpbGw9IiNmYWNjMTUiLz4KICA8cG9seWdvbiBwb2ludHM9IjM5MCwxNjAgMzkzLDE2OCA0MDEsMTcxIDM5MywxNzQgMzkwLDE4MiAzODcsMTc0IDM3OSwxNzEgMzg3LDE2OCIgZmlsbD0iIzM4YmRmOCIvPgo8L3N2Zz4="}, {"id": "free-entry-3d", "cat": "badges", "title": "Вход свободный 3D", "prompt": "Изометрический 3D бейдж Вход свободный", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJmZV9iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMTBiOTgxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzA0Nzg1NyIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPCEtLSBFeHRydWRlZCBTaGFkb3cgLS0+CiAgPHJlY3QgeD0iNzAiIHk9IjE4MCIgd2lkdGg9IjM3MiIgaGVpZ2h0PSIxNjAiIHJ4PSIzMCIgZmlsbD0iIzA2NGUzYiIvPgogIDwhLS0gRnJvbnQgUGxhdGUgLS0+CiAgPHJlY3QgeD0iNjAiIHk9IjE2MCIgd2lkdGg9IjM3MiIgaGVpZ2h0PSIxNjAiIHJ4PSIzMCIgZmlsbD0idXJsKCNmZV9iZykiIHN0cm9rZT0iIzZlZTdiNyIgc3Ryb2tlLXdpZHRoPSI2Ii8+CiAgPCEtLSBJbm5lciBkYXNoZWQgYm9yZGVyIC0tPgogIDxyZWN0IHg9Ijc1IiB5PSIxNzUiIHdpZHRoPSIzNDIiIGhlaWdodD0iMTMwIiByeD0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2E3ZjNkMCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI4IDYiLz4KICA8IS0tIFN0YXJzIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMTIwLDI0MCAxMjYsMjUyIDE0MCwyNTQgMTMwLDI2NCAxMzIsMjc4IDEyMCwyNzAgMTA4LDI3OCAxMTAsMjY0IDEwMCwyNTQgMTE0LDI1MiIgZmlsbD0iI2ZhY2MxNSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMzcyLDI0MCAzNzgsMjUyIDM5MiwyNTQgMzgyLDI2NCAzODQsMjc4IDM3MiwyNzAgMzYwLDI3OCAzNjIsMjY0IDM1MiwyNTQgMzY2LDI1MiIgZmlsbD0iI2ZhY2MxNSIvPgogIDwhLS0gVHlwb2dyYXBoeSAtLT4KICA8dGV4dCB4PSIyNDYiIHk9IjIyNSIgZm9udC1mYW1pbHk9IidVbmJvdW5kZWQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI4IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7QktCl0J7QlDwvdGV4dD4KICA8dGV4dCB4PSIyNDYiIHk9IjI3MCIgZm9udC1mYW1pbHk9IidVbmJvdW5kZWQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjM0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmVmMDhhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7QodCS0J7QkdCe0JTQndCr0Jk8L3RleHQ+Cjwvc3ZnPg=="}, {"id": "quality-seal", "cat": "badges", "title": "Знак качества АВРОРА", "prompt": "Золотая гербовая медаль с лавровым венком", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJxc19nIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZWYwOGEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNlYWIzMDgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYjQ1MzA5Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIE91dGVyIHNlcnJhdGVkIHNlYWwgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIxODAiIGZpbGw9InVybCgjcXNfZykiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjE1MCIgZmlsbD0iIzc4MzUwZiIgc3Ryb2tlPSIjZmVmMDhhIiBzdHJva2Utd2lkdGg9IjUiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjEzNSIgZmlsbD0idXJsKCNxc19nKSIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTA1IiBmaWxsPSIjNDUxYTAzIi8+CiAgPCEtLSBMYXVyZWwgd3JlYXRoIGFyY3MgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSI4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmFjYzE1IiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1kYXNoYXJyYXk9IjE0IDEwIi8+CiAgPCEtLSBDZW50ZXIgNS1wb2ludCBTdGFyIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDE5MCAyNzQsMjM1IDMyMiwyMzggMjg1LDI3MCAyOTYsMzE4IDI1NiwyOTAgMjE2LDMxOCAyMjcsMjcwIDE5MCwyMzggMjM4LDIzNSIgZmlsbD0iI2ZhY2MxNSIvPgogIDx0ZXh0IHg9IjI1NiIgeT0iMTY1IiBmb250LWZhbWlseT0iJ01vbnRzZXJyYXQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iODAwIiBmaWxsPSIjZmVmMDhhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMyI+0JDQktCg0J7QoNCQINCU0JjQl9CQ0JnQnTwvdGV4dD4KICA8dGV4dCB4PSIyNTYiIHk9IjM2MCIgZm9udC1mYW1pbHk9IidNb250c2VycmF0Jywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZlZjA4YSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjIiPtCX0J3QkNCaINCa0JDQp9CV0KHQotCS0JA8L3RleHQ+Cjwvc3ZnPg=="}, {"id": "new-badge", "cat": "badges", "title": "Новинка месяца", "prompt": "Стикер-вспышка Новинка месяца", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJuYl9nIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZjAwN2EiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNzkyOGNhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIFN0YXJidXJzdCBleHBsb3Npb24gLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNzAgMjk1LDEyNSAzNjUsMTAwIDM3MCwxNzAgNDQwLDE4NSA0MTAsMjUwIDQ1MCwzMTAgMzkwLDM0MCAzOTUsNDEwIDMyNSw0MDUgMjg1LDQ2MCAyNDAsNDE1IDE3MCw0NDAgMTYwLDM3MCA5NSwzNTAgMTIwLDI4NSA3NSwyMzAgMTM1LDE5NSAxMjUsMTI1IDE5NSwxMzUiIGZpbGw9InVybCgjbmJfZykiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+CiAgPCEtLSBUZXh0IC0tPgogIDx0ZXh0IHg9IjI1NiIgeT0iMjYwIiBmb250LWZhbWlseT0iJ1VuYm91bmRlZCcsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDQiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0icm90YXRlKC02IDI1NiAyNjApIj7QndCe0JLQmNCd0JrQkCE8L3RleHQ+CiAgPHRleHQgeD0iMjU2IiB5PSIzMDAiIGZvbnQtZmFtaWx5PSInTW9udHNlcnJhdCcsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiNmZWYwOGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIyIiB0cmFuc2Zvcm09InJvdGF0ZSgtNiAyNTYgMjYwKSI+0JzQldCh0K/QptCQPC90ZXh0Pgo8L3N2Zz4="}, {"id": "library-pass", "cat": "badges", "title": "Читательский билет", "prompt": "Смарт-карта читателя с микрочипом и голограммой", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJscF9iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzMzNDE1NSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3QgeD0iNjAiIHk9IjEyMCIgd2lkdGg9IjM5MiIgaGVpZ2h0PSIyNzIiIHJ4PSIyNCIgZmlsbD0idXJsKCNscF9iZykiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPCEtLSBHb2xkIEVNViBDaGlwIC0tPgogIDxyZWN0IHg9IjExMCIgeT0iMTgwIiB3aWR0aD0iNjUiIGhlaWdodD0iNTAiIHJ4PSI4IiBmaWxsPSIjZmFjYzE1IiBzdHJva2U9IiNjYThhMDQiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxsaW5lIHgxPSIxMTAiIHkxPSIyMDUiIHgyPSIxNzUiIHkyPSIyMDUiIHN0cm9rZT0iI2NhOGEwNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGxpbmUgeDE9IjE0MiIgeTE9IjE4MCIgeDI9IjE0MiIgeTI9IjIzMCIgc3Ryb2tlPSIjY2E4YTA0IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8IS0tIENvbnRhY3RsZXNzIHdhdmVzIC0tPgogIDxwYXRoIGQ9Ik0gMjAwIDE4NSBRIDIxMCAyMDUgMjAwIDIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0gMjE1IDE3NSBRIDIzMCAyMDUgMjE1IDIzNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwhLS0gVGl0bGUgJiBCYXJjb2RlIC0tPgogIDx0ZXh0IHg9IjM2MCIgeT0iMTcwIiBmb250LWZhbWlseT0iJ01vbnRzZXJyYXQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iODAwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0iZW5kIj7Qp9CY0KLQkNCi0JXQm9Cs0KHQmtCY0Jkg0JHQmNCb0JXQojwvdGV4dD4KICA8dGV4dCB4PSIxMTAiIHk9IjI5NSIgZm9udC1mYW1pbHk9IidNb250c2VycmF0Jywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2YxZjVmOSIgbGV0dGVyLXNwYWNpbmc9IjQiPjQ4MTIg4oCi4oCi4oCi4oCiIOKAouKAouKAouKAoiAyMDI2PC90ZXh0PgogIDx0ZXh0IHg9IjExMCIgeT0iMzQwIiBmb250LWZhbWlseT0iJ01vbnRzZXJyYXQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEzIiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjOTRhM2I4Ij7QkdCY0JHQm9CY0J7QotCV0JrQkCDQkNCS0KDQntCg0JA8L3RleHQ+CiAgPCEtLSBIb2xvZ3JhbSBjaXJjbGUgLS0+CiAgPGNpcmNsZSBjeD0iMzgwIiBjeT0iMzMwIiByPSIzMCIgZmlsbD0iI2MwODRmYyIgb3BhY2l0eT0iMC42Ii8+CiAgPGNpcmNsZSBjeD0iMzk1IiBjeT0iMzMwIiByPSIzMCIgZmlsbD0iIzM4YmRmOCIgb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg=="}, {"id": "bestseller-ribbon", "cat": "badges", "title": "Лента бестселлера", "prompt": "Премиальная лента Выбор читателей", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJicl9nIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0YzFkOTUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiM3YzNhZWQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNGMxZDk1Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIFRhaWxzIC0tPgogIDxwYXRoIGQ9Ik0gMTkwIDI4MCBMIDE2MCA0NDAgTCAyMTAgNDAwIEwgMjUwIDQ0MCBMIDIzMCAyODAgWiIgZmlsbD0iIzViMjFiNiIvPgogIDxwYXRoIGQ9Ik0gMzIyIDI4MCBMIDM1MiA0NDAgTCAzMDIgNDAwIEwgMjYyIDQ0MCBMIDI4MiAyODAgWiIgZmlsbD0iIzViMjFiNiIvPgogIDwhLS0gUm9zZXR0ZSB3aGVlbCAtLT4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyMjAiIHI9IjEyMCIgZmlsbD0idXJsKCNicl9nKSIgc3Ryb2tlPSIjZmFjYzE1IiBzdHJva2Utd2lkdGg9IjgiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyMjAiIHI9Ijk1IiBmaWxsPSIjMmUxMDY1IiBzdHJva2U9IiNmYWNjMTUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWRhc2hhcnJheT0iOCA2Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsMTQwIDI2NiwxNjggMjk2LDE3MCAyNzIsMTkwIDI4MCwyMjAgMjU2LDIwMiAyMzIsMjIwIDI0MCwxOTAgMjE2LDE3MCAyNDYsMTY4IiBmaWxsPSIjZmFjYzE1Ii8+CiAgPHRleHQgeD0iMjU2IiB5PSIyNTAiIGZvbnQtZmFtaWx5PSInTW9udHNlcnJhdCcsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxIj7QktCr0JHQntCgPC90ZXh0PgogIDx0ZXh0IHg9IjI1NiIgeT0iMjc1IiBmb250LWZhbWlseT0iJ01vbnRzZXJyYXQnLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmFjYzE1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMSI+0KfQmNCi0JDQotCV0JvQldCZPC90ZXh0Pgo8L3N2Zz4="}, {"id": "golden-star-3d", "cat": "icons3d", "title": "Золотая 3D звезда", "prompt": "Объемная 3D золотая пятиконечная звезда со световыми гранями", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjwhLS0gM0QgQ2hhbWZlcmVkIFN0YXIgLS0+CiAgPCEtLSBGYWNldCBUb3AgTGlnaHQgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNzAgMjU2LDI1NiAzMTIsMjE2IiBmaWxsPSIjZmVmMDhhIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNTYsNzAgMjU2LDI1NiAyMDAsMjE2IiBmaWxsPSIjZmRlMDQ3Ii8+CiAgPCEtLSBGYWNldCBSaWdodCBMaWdodCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQ0MCwyMDAgMjU2LDI1NiAzMTIsMjE2IiBmaWxsPSIjZWFiMzA4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSI0NDAsMjAwIDI1NiwyNTYgMzQ1LDMwNSIgZmlsbD0iI2NhOGEwNCIvPgogIDwhLS0gRmFjZXQgQm90dG9tIFJpZ2h0IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMzcwLDQyMCAyNTYsMjU2IDM0NSwzMDUiIGZpbGw9IiNhMTYyMDciLz4KICA8cG9seWdvbiBwb2ludHM9IjM3MCw0MjAgMjU2LDI1NiAyNTYsMzYwIiBmaWxsPSIjODU0ZDBlIi8+CiAgPCEtLSBGYWNldCBCb3R0b20gTGVmdCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjE0Miw0MjAgMjU2LDI1NiAyNTYsMzYwIiBmaWxsPSIjYTE2MjA3Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNDIsNDIwIDI1NiwyNTYgMTY3LDMwNSIgZmlsbD0iI2NhOGEwNCIvPgogIDwhLS0gRmFjZXQgTGVmdCBMaWdodCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjcyLDIwMCAyNTYsMjU2IDE2NywzMDUiIGZpbGw9IiNlYWIzMDgiLz4KICA8cG9seWdvbiBwb2ludHM9IjcyLDIwMCAyNTYsMjU2IDIwMCwyMTYiIGZpbGw9IiNmYWNjMTUiLz4KICA8IS0tIFNwZWN1bGFyIGZsYXJlIC0tPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTQiIGZpbGw9IiNmZmZmZmYiIGZpbHRlcj0iZHJvcC1zaGFkb3coMCAwIDZweCAjZmZmKSIvPgo8L3N2Zz4="}, {"id": "trophy-cup", "cat": "icons3d", "title": "Кубок лидера", "prompt": "Золотой 3D кубок чемпиона книжного марафона", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ0Y19nIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZWYwOGEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0MCUiIHN0b3AtY29sb3I9IiNlYWIzMDgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjY2E4YTA0Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEhhbmRsZXMgLS0+CiAgPHBhdGggZD0iTSAxNTAgMTQwIEMgOTAgMTQwIDkwIDIzMCAxNTAgMjUwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjdGNfZykiIHN0cm9rZS13aWR0aD0iMTgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0gMzYyIDE0MCBDIDQyMiAxNDAgNDIyIDIzMCAzNjIgMjUwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjdGNfZykiIHN0cm9rZS13aWR0aD0iMTgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwhLS0gQ3VwIEJvZHkgLS0+CiAgPHBhdGggZD0iTSAxNDAgMTAwIEwgMzcyIDEwMCBMIDM0MiAyNDAgUSAyNTYgMzEwIDE3MCAyNDAgWiIgZmlsbD0idXJsKCN0Y19nKSIvPgogIDwhLS0gUGVkZXN0YWwgc3RlbSAtLT4KICA8cmVjdCB4PSIyMzYiIHk9IjI4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjcwIiBmaWxsPSJ1cmwoI3RjX2cpIi8+CiAgPCEtLSBCYXNlIC0tPgogIDxyZWN0IHg9IjE3NiIgeT0iMzUwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzc4MzUwZiIgc3Ryb2tlPSIjY2E4YTA0IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8cmVjdCB4PSIxOTYiIHk9IjM5MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIzMCIgcng9IjYiIGZpbGw9IiM0NTFhMDMiLz4KICA8IS0tIFN0YXIgb24gQ3VwIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjU2LDE1MCAyNjIsMTY4IDI4MCwxNzAgMjY2LDE4MiAyNzAsMjAwIDI1NiwxOTAgMjQyLDIwMCAyNDYsMTgyIDIzMiwxNzAgMjUwLDE2OCIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4="}, {"id": "glowing-heart", "cat": "icons3d", "title": "Сердце вдохновения", "prompt": "Градиентное объемное светящееся 3D сердце", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJnaF9nIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlYzQ4OTkiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNmNDNmNWUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZTExZDQ4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEdsb3cgaGFsbyAtLT4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNDAiIHI9IjE2MCIgZmlsbD0iI2Y0M2Y1ZSIgb3BhY2l0eT0iMC4yIi8+CiAgPCEtLSBIZWFydCBzaGFwZSAtLT4KICA8cGF0aCBkPSJNIDI1NiAzOTAgQyAxMjAgMjgwIDkwIDE5MCAxNDAgMTMwIEMgMTgwIDgwIDIzMCAxMTAgMjU2IDE1MCBDIDI4MiAxMTAgMzMyIDgwIDM3MiAxMzAgQyA0MjIgMTkwIDM5MiAyODAgMjU2IDM5MCBaIiBmaWxsPSJ1cmwoI2doX2cpIiBmaWx0ZXI9ImRyb3Atc2hhZG93KDAgMTJweCAyOHB4IHJnYmEoMjI1LDI5LDcyLDAuNSkpIi8+CiAgPCEtLSBHbG9zcyBoaWdobGlnaHQgLS0+CiAgPHBhdGggZD0iTSAxNjAgMTQ1IEMgMTQ1IDE4MCAxNTAgMjE1IDE3MCAyMzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjYiLz4KICA8IS0tIFNwYXJrbGVzIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMzYwLDExMCAzNjMsMTE4IDM3MSwxMjEgMzYzLDEyNCAzNjAsMTMyIDM1NywxMjQgMzQ5LDEyMSAzNTcsMTE4IiBmaWxsPSIjZmZmZmZmIi8+CiAgPGNpcmNsZSBjeD0iMzkwIiBjeT0iMTUwIiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPg=="}, {"id": "ai-spark", "cat": "icons3d", "title": "Искра интеллекта", "prompt": "Четырехконечная звезда-искра AI со световым ореолом", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJhc19nIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMjUlIiBzdG9wLWNvbG9yPSIjMzhiZGY4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjYTg1NWY3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2E4NTVmNyIgc3RvcC1vcGFjaXR5PSIwIi8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogIDwvZGVmcz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjIxMCIgZmlsbD0idXJsKCNhc19nKSIvPgogIDwhLS0gQ2VudHJhbCBTcGFyayAtLT4KICA8cGF0aCBkPSJNIDI1NiA0MCBRIDI1NiAyNTYgNDcyIDI1NiBRIDI1NiAyNTYgMjU2IDQ3MiBRIDI1NiAyNTYgNDAgMjU2IFEgMjU2IDI1NiAyNTYgNDAgWiIgZmlsbD0iI2ZmZmZmZiIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMzAiIGZpbGw9IiNmYWNjMTUiLz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjE0IiBmaWxsPSIjZmZmZmZmIi8+CiAgPCEtLSBNaWNybyBzcGFya3MgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxNTAsMTUwIDE1MywxNjAgMTYzLDE2MyAxNTMsMTY2IDE1MCwxNzYgMTQ3LDE2NiAxMzcsMTYzIDE0NywxNjAiIGZpbGw9IiMzOGJkZjgiLz4KICA8cG9seWdvbiBwb2ludHM9IjM2MiwxNTAgMzY1LDE2MCAzNzUsMTYzIDM2NSwxNjYgMzYyLDE3NiAzNTksMTY2IDM0OSwxNjMgMzU5LDE2MCIgZmlsbD0iI2MwODRmYyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTUwLDM2MiAxNTMsMzcyIDE2MywzNzUgMTUzLDM3OCAxNTAsMzg4IDE0NywzNzggMTM3LDM3NSAxNDcsMzcyIiBmaWxsPSIjYzA4NGZjIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIzNjIsMzYyIDM2NSwzNzIgMzc1LDM3NSAzNjUsMzc4IDM2MiwzODggMzU5LDM3OCAzNDksMzc1IDM1OSwzNzIiIGZpbGw9IiMzOGJkZjgiLz4KPC9zdmc+"}, {"id": "knowledge-tree", "cat": "nature", "title": "Дерево мудрости", "prompt": "Волшебное дерево с кроной из книг и светящимися листьями", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJrdF9jciIgY3g9IjUwJSIgY3k9IjQwJSIgcj0iNTAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzM0ZDM5OSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjcwJSIgc3RvcC1jb2xvcj0iIzA1OTY2OSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwNjRlM2IiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDwhLS0gVHJ1bmsgLS0+CiAgPHBhdGggZD0iTSAyMzAgNDQwIFEgMjU2IDM0MCAyMzYgMjYwIFEgMjU2IDMwMCAyNzYgMjYwIFEgMjU2IDM0MCAyODIgNDQwIFoiIGZpbGw9IiM3ODM1MGYiLz4KICA8IS0tIENhbm9weSBjbG91ZHMgLS0+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMTgwIiByPSIxMDAiIGZpbGw9InVybCgja3RfY3IpIi8+CiAgPGNpcmNsZSBjeD0iMTgwIiBjeT0iMjEwIiByPSI3MCIgZmlsbD0idXJsKCNrdF9jcikiLz4KICA8Y2lyY2xlIGN4PSIzMzIiIGN5PSIyMTAiIHI9IjcwIiBmaWxsPSJ1cmwoI2t0X2NyKSIvPgogIDxjaXJjbGUgY3g9IjIxMCIgY3k9IjE0MCIgcj0iNjAiIGZpbGw9IiMxMGI5ODEiLz4KICA8Y2lyY2xlIGN4PSIzMDIiIGN5PSIxNDAiIHI9IjYwIiBmaWxsPSIjMTBiOTgxIi8+CiAgPCEtLSBCb29rIGxlYXZlcyBvbiB0cmVlIC0tPgogIDxyZWN0IHg9IjI0MCIgeT0iMTUwIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjZmZmZmZmIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTUgMjU2IDE2MikiLz4KICA8cmVjdCB4PSIxODAiIHk9IjE4MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjIyIiByeD0iNCIgZmlsbD0iI2ZlZjA4YSIgdHJhbnNmb3JtPSJyb3RhdGUoMjAgMTk1IDE5MSkiLz4KICA8cmVjdCB4PSIzMDAiIHk9IjE4MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjIyIiByeD0iNCIgZmlsbD0iIzM4YmRmOCIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDMxNSAxOTEpIi8+CiAgPCEtLSBTcGFya3MgLS0+CiAgPGNpcmNsZSBjeD0iMTYwIiBjeT0iMTMwIiByPSI1IiBmaWxsPSIjZmRlMDQ3Ii8+CiAgPGNpcmNsZSBjeD0iMzUwIiBjeT0iMTQwIiByPSI2IiBmaWxsPSIjZmRlMDQ3Ii8+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iOTAiIHI9IjYiIGZpbGw9IiMzOGJkZjgiLz4KPC9zdmc+"}, {"id": "eco-sprout", "cat": "nature", "title": "Росток открытий", "prompt": "Неоновый росток знания в кристальном горшке", "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CjxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJlc19sIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4NmVmYWMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMTZhMzRhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIENyeXN0YWwgUG90IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMTgwLDMxMCAzMzIsMzEwIDMwMCw0MjAgMjEyLDQyMCIgZmlsbD0iIzAyODRjNyIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8cG9seWdvbiBwb2ludHM9IjE4MCwzMTAgMjEyLDQyMCAyNTYsNDMwIDI1NiwzMTAiIGZpbGw9IiMwMzY5YTEiIG9wYWNpdHk9IjAuNiIvPgogIDwhLS0gU3RlbSAtLT4KICA8cGF0aCBkPSJNIDI1NiAzMTAgUSAyNTYgMjIwIDI1MCAxNzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPCEtLSBMZWZ0IExlYWYgLS0+CiAgPHBhdGggZD0iTSAyNTAgMjIwIEMgMTgwIDIwMCAxNjAgMTQwIDIxMCAxMzAgQyAyNDAgMTQwIDI1MCAxODAgMjUwIDIyMCBaIiBmaWxsPSJ1cmwoI2VzX2wpIi8+CiAgPCEtLSBSaWdodCBMZWFmIC0tPgogIDxwYXRoIGQ9Ik0gMjUwIDE4MCBDIDMyMCAxNjAgMzQwIDEwMCAyOTAgOTAgQyAyNjAgMTAwIDI1MCAxNDAgMjUwIDE4MCBaIiBmaWxsPSJ1cmwoI2VzX2wpIi8+CiAgPCEtLSBHbG93aW5nIERld2Ryb3BzIC0tPgogIDxjaXJjbGUgY3g9IjIxMCIgY3k9IjEzMCIgcj0iOCIgZmlsbD0iIzM4YmRmOCIgZmlsdGVyPSJkcm9wLXNoYWRvdygwIDAgNnB4ICMzOGJkZjgpIi8+CiAgPGNpcmNsZSBjeD0iMjkwIiBjeT0iOTAiIHI9IjYiIGZpbGw9IiNmYWNjMTUiIGZpbHRlcj0iZHJvcC1zaGFkb3coMCAwIDZweCAjZmFjYzE1KSIvPgo8L3N2Zz4="}];

let isAiModalInit = false;
let currentAiCategory = 'all';

function openAiElementModal() {
  if (typeof window.openAiGeneratorModal === 'function') {
    window.openAiGeneratorModal();
    return;
  }
  if (typeof window.AuroraAiElements?.openAiGeneratorModal === 'function') {
    window.AuroraAiElements.openAiGeneratorModal();
    return;
  }
  initAiElementModal();
  renderAiElementsGrid(currentAiCategory);
  $('#ai-element-modal-overlay')?.classList.remove('hidden');
}

function closeAiElementModal() {
  $('#ai-element-modal-overlay')?.classList.add('hidden');
}

function renderAiElementsGrid(category = 'all') {
  currentAiCategory = category;
  const grid = $('#ai-elements-grid');
  if (!grid) return;

  const filtered = category === 'all' 
    ? AI_ELEMENTS_LIBRARY 
    : AI_ELEMENTS_LIBRARY.filter(it => it.cat === category);

  grid.innerHTML = filtered.map(item => `
    <div class="ai-element-card" data-id="${item.id}" tabindex="0" role="button" title="Добавить «${escapeHtml(item.title)}» на холст">
      <div class="ai-card-thumb-wrap">
        <img class="ai-card-thumb" src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="ai-card-title">${escapeHtml(item.title)}</div>
      <div class="ai-card-badge">${item.cat === 'books' ? 'Книги' : item.cat === 'space' ? 'Космос' : item.cat === 'badges' ? 'Плашки' : item.cat === 'icons3d' ? '3D' : 'Природа'}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.ai-element-card').forEach(card => {
    card.addEventListener('click', () => {
      const it = AI_ELEMENTS_LIBRARY.find(x => x.id === card.dataset.id);
      if (it) {
        addAiElement(it.src, it.title, it.prompt);
      }
    });
  });
}

function addAiPhotoElement(src, title, promptText = '', options = {}) {
  if (!canvas || !src) return;
  fabric.Image.fromURL(src, img => {
    if (!img) return;
    const targetDim = Math.min(currentSize.w * 0.45, currentSize.h * 0.45, 340);
    if (img.width > targetDim || img.height > targetDim) {
      if (img.width >= img.height) {
        img.scaleToWidth(targetDim);
      } else {
        img.scaleToHeight(targetDim);
      }
    }
    let cleanTitle = (title || promptText || 'Студийное фото').trim();
    cleanTitle = cleanTitle.replace(/^\[AI(?:\s+Photo)?\]\s*/i, '');
    const finalLayerName = `[AI Photo] ${cleanTitle}`;

    img.set({
      left: (currentSize.w - img.getScaledWidth()) / 2,
      top:  (currentSize.h - img.getScaledHeight()) / 2,
      selectable: true,
      layerName: finalLayerName,
      name: finalLayerName,
      isAiElement: true,
      __isAiElement: true,
      isAiPhoto: true,
      __isAiPhoto: true,
      aiType: 'photo',
      aiPrompt: promptText || cleanTitle || 'AI Photo',
      __aiPrompt: promptText || cleanTitle || 'AI Photo'
    });

    if (options.cornerRadius && typeof setImageCornerRadius === 'function') {
      setImageCornerRadius(img, options.cornerRadius, true);
    }

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    onSelection();
    closeAiElementModal();
    toast(`📸 Фотография «${finalLayerName}» добавлена на холст!`);
  }, { crossOrigin: 'anonymous' });
}

function addAiElement(src, title, promptText = '', aiType = 'vector-svg', options = {}) {
  if (!canvas || !src) return;
  if (aiType === 'photo' || (title && (title.includes('[AI Photo]') || title.toLowerCase().includes('фото')))) {
    return addAiPhotoElement(src, title, promptText, options);
  }
  fabric.Image.fromURL(src, img => {
    if (!img) return;
    const targetDim = Math.min(currentSize.w * 0.45, currentSize.h * 0.45, 340);
    if (img.width > targetDim || img.height > targetDim) {
      if (img.width >= img.height) {
        img.scaleToWidth(targetDim);
      } else {
        img.scaleToHeight(targetDim);
      }
    }
    const cleanTitle = (title || promptText || 'Элемент').trim();
    const finalLayerName = cleanTitle.startsWith('[AI]') ? cleanTitle : `[AI] ${cleanTitle}`;

    img.set({
      left: (currentSize.w - img.getScaledWidth()) / 2,
      top:  (currentSize.h - img.getScaledHeight()) / 2,
      selectable: true,
      layerName: finalLayerName,
      name: finalLayerName,
      isAiElement: true,
      __isAiElement: true,
      aiPrompt: promptText || title || 'AI Элемент',
      __aiPrompt: promptText || title || 'AI Элемент',
      aiType: aiType || 'vector-svg'
    });

    if (options.cornerRadius && typeof setImageCornerRadius === 'function') {
      setImageCornerRadius(img, options.cornerRadius, true);
    }

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    onSelection();
    closeAiElementModal();
    toast(`✦ Элемент «${finalLayerName}» добавлен на холст!`);
  }, { crossOrigin: 'anonymous' });
}

window.addAiPhotoElement = addAiPhotoElement;

async function generateAiElement() {
  const promptInput = $('#ai-prompt-input');
  const rawPrompt = promptInput?.value.trim();
  if (!rawPrompt) {
    toast('Введите текстовое описание элемента');
    promptInput?.focus();
    return;
  }

  const style = $('#ai-style-select')?.value || '3d-render';
  const isTransparent = $('#ai-transparent-bg')?.checked ?? true;

  const stylePromptMap = {
    '3d-render': '3D isometric clay render, octane render, smooth volumetric lighting, vibrant, isolated sticker',
    'flat-vector': 'clean modern flat vector illustration, bold clean outlines, minimalist graphic, isolated sticker',
    'cyberpunk': 'cyberpunk holographic neon art, glowing dark glass, laser lines, isolated dark sticker',
    'glassmorphism': 'translucent frosted glassmorphism, glossy reflections, vibrant pastel gradient, isolated sticker',
    'vintage-art': 'detailed vintage line art engraving, academic library sketch, classic etching style',
    'watercolor': 'artistic watercolor splash painting, vibrant colors, gentle edges, isolated illustration'
  };

  const styleText = stylePromptMap[style] || '3D isometric render, isolated sticker';
  const fullPrompt = `${rawPrompt}, ${styleText}, ${isTransparent ? 'isolated on transparent background, sticker style, no background' : 'clean background'}`;

  const container = $('#ai-gen-result-container');
  const loader = $('#ai-gen-loading');
  const previewBox = $('#ai-gen-preview-box');
  const previewImg = $('#ai-gen-preview-img');
  const previewTitle = $('#ai-gen-preview-title');

  container?.classList.remove('hidden');
  loader?.classList.remove('hidden');
  previewBox?.classList.add('hidden');

  let resultDataUrl = null;

  try {
    // 1. Попытка онлайн-генерации через Pollinations Image AI с таймаутом 10с
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=512&height=512&nologo=true`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const blob = await resp.blob();
      resultDataUrl = await new Promise(r => {
        const rd = new FileReader();
        rd.onload = () => r(rd.result);
        rd.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Pollinations online generation fallback:', err);
  }

  // 2. Если сеть недоступна — качественный процедурный генератор AI-стикера
  if (!resultDataUrl) {
    resultDataUrl = createProceduralAiElement(rawPrompt, style);
  }

  loader?.classList.add('hidden');
  if (resultDataUrl && previewImg) {
    previewImg.src = resultDataUrl;
    if (previewTitle) previewTitle.textContent = `[AI] ${rawPrompt}`;
    previewBox?.classList.remove('hidden');

    const addBtn = $('#btn-ai-add-generated');
    if (addBtn) {
      addBtn.onclick = () => {
        addAiElement(resultDataUrl, rawPrompt, rawPrompt);
      };
    }
    toast('✦ AI-элемент сгенерирован!');
  }
}

function createProceduralAiElement(promptText, style) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Background glow
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
  grad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
  grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Hexagon/Rounded plate
  ctx.save();
  ctx.translate(256, 256);
  ctx.beginPath();
  const r = 160;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(-150, -150, 150, 150);
  fillGrad.addColorStop(0, '#1e1b4b');
  fillGrad.addColorStop(0.5, '#4c1d95');
  fillGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#c084fc';
  ctx.stroke();

  // Glowing symbol
  ctx.font = '900 64px "Unbounded", sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ AI ✦', 0, -30);

  // Subtitle from prompt
  ctx.font = '700 20px "Montserrat", sans-serif';
  ctx.fillStyle = '#ffffff';
  const cleanP = promptText.length > 22 ? promptText.slice(0, 20) + '…' : promptText;
  ctx.fillText(cleanP, 0, 40);

  ctx.font = '600 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('АВРОРА НЕЙРО-АРТ', 0, 75);

  ctx.restore();
  return c.toDataURL('image/png');
}

function initAiElementModal() {
  if (isAiModalInit) return;
  isAiModalInit = true;

  // Tabs
  $('#tab-btn-ai-library')?.addEventListener('click', () => {
    $('#tab-btn-ai-library')?.classList.add('is-active');
    $('#tab-btn-ai-generate')?.classList.remove('is-active');
    $('#ai-view-library')?.classList.remove('hidden');
    $('#ai-view-generate')?.classList.add('hidden');
  });

  $('#tab-btn-ai-generate')?.addEventListener('click', () => {
    $('#tab-btn-ai-generate')?.classList.add('is-active');
    $('#tab-btn-ai-library')?.classList.remove('is-active');
    $('#ai-view-generate')?.classList.remove('hidden');
    $('#ai-view-library')?.classList.add('hidden');
  });

  // Categories
  $$('#ai-cat-chips .figma-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#ai-cat-chips .figma-preset-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderAiElementsGrid(btn.dataset.cat || 'all');
    });
  });

  // Prompt chips
  $$('.ai-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = $('#ai-prompt-input');
      if (input) {
        input.value = chip.dataset.prompt || '';
        input.focus();
      }
    });
  });

  $('#btn-ai-generate-submit')?.addEventListener('click', generateAiElement);
  $('#ai-element-modal-close')?.addEventListener('click', closeAiElementModal);
  $('#ai-element-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAiElementModal();
  });
}

/* ══════════════════════════════════════════════════════════════
   ✨ РЕТУШЬ INSTAGRAM (МОДАЛЬНОЕ ОКНО И ФИЛЬТРЫ)
   ══════════════════════════════════════════════════════════════ */
const INSTAGRAM_FILTERS = [
  { id: 'normal',   name: 'Normal',    desc: 'Оригинал',           gradient: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  { id: 'clarendon',name: 'Clarendon', desc: 'Контраст & Тени',     gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  { id: 'juno',     name: 'Juno',      desc: 'Теплые лица & Сочность', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { id: 'ludwig',   name: 'Ludwig',    desc: 'Чистый музейный свет', gradient: 'linear-gradient(135deg, #f97316, #fbbf24)' },
  { id: 'lark',     name: 'Lark',      desc: 'Свежий изумруд & Циан', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { id: 'valencia', name: 'Valencia',  desc: 'Винтаж 70-х',         gradient: 'linear-gradient(135deg, #d97706, #fde047)' },
  { id: 'moon',     name: 'Moon',      desc: 'Контрастный ч/б нуар', gradient: 'linear-gradient(135deg, #1e293b, #f1f5f9)' },
  { id: 'crema',    name: 'Crema',     desc: 'Кремовый матовый тон', gradient: 'linear-gradient(135deg, #a16207, #fef08a)' },
  { id: 'reyes',    name: 'Reyes',     desc: 'Пыльный солнечный тон', gradient: 'linear-gradient(135deg, #ca8a04, #e2e8f0)' },
  { id: 'slumber',  name: 'Slumber',   desc: 'Вечерняя дымка',       gradient: 'linear-gradient(135deg, #7c3aed, #f472b6)' },
  { id: 'lofi',     name: 'Lo-Fi',     desc: 'Насыщенный ретро 2010', gradient: 'linear-gradient(135deg, #e11d48, #fbbf24)' },
  { id: 'xpro2',    name: 'X-Pro II',  desc: 'Кросс-процессинг & Виньетка', gradient: 'linear-gradient(135deg, #059669, #eab308)' },
  { id: 'gingham',  name: 'Gingham',   desc: 'Хипстерский фотофильтр', gradient: 'linear-gradient(135deg, #475569, #cbd5e1)' },
  { id: 'aden',     name: 'Aden',      desc: 'Пастельный бьюти-тон', gradient: 'linear-gradient(135deg, #ec4899, #fbcfe8)' }
];

let isInstaModalInit = false;
let currentInstaFilter = 'clarendon';
let isInstaSplitDragging = false;
let instaSrcCanvas = null;

function openInstagramRetouchModal() {
  if (typeof window.openRetouchModal === 'function') {
    window.openRetouchModal();
    return;
  }
  if (typeof window.AuroraRetouchEngine?.openRetouchModal === 'function') {
    window.AuroraRetouchEngine.openRetouchModal();
    return;
  }
  initInstagramRetouchModal();
  prepareInstaSourceCanvas();
  renderInstaSplitPreview();
  $('#instagram-retouch-modal-overlay')?.classList.remove('hidden');
}

function closeInstagramRetouchModal() {
  $('#instagram-retouch-modal-overlay')?.classList.add('hidden');
}

function prepareInstaSourceCanvas() {
  const targetMode = $('#insta-target-selected')?.classList.contains('is-active') ? 'selected' : 'canvas';
  const activeObj = canvas?.getActiveObject();

  instaSrcCanvas = document.createElement('canvas');
  const maxPrevDim = 600;

  if (targetMode === 'selected' && activeObj && activeObj.type === 'image') {
    const el = activeObj.__originalElement || activeObj.getElement();
    const nw = el.naturalWidth || el.width || 800;
    const nh = el.naturalHeight || el.height || 600;
    const scale = Math.min(1.0, maxPrevDim / Math.max(nw, nh));
    instaSrcCanvas.width = Math.round(nw * scale);
    instaSrcCanvas.height = Math.round(nh * scale);
    const ctx = instaSrcCanvas.getContext('2d');
    ctx.drawImage(el, 0, 0, instaSrcCanvas.width, instaSrcCanvas.height);
  } else {
    const cleanArtboard = window.renderCleanArtboardCanvas 
      ? window.renderCleanArtboardCanvas(canvas)
      : null;
    if (cleanArtboard) {
      const scale = Math.min(1.0, maxPrevDim / Math.max(cleanArtboard.width, cleanArtboard.height));
      instaSrcCanvas.width = Math.round(cleanArtboard.width * scale);
      instaSrcCanvas.height = Math.round(cleanArtboard.height * scale);
      const ctx = instaSrcCanvas.getContext('2d');
      ctx.drawImage(cleanArtboard, 0, 0, instaSrcCanvas.width, instaSrcCanvas.height);
    } else {
      instaSrcCanvas.width = 400;
      instaSrcCanvas.height = 560;
      const ctx = instaSrcCanvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 400, 560);
    }
  }
}

function renderInstaSplitPreview() {
  if (!instaSrcCanvas) prepareInstaSourceCanvas();
  const w = instaSrcCanvas.width;
  const h = instaSrcCanvas.height;

  const canvasBefore = $('#insta-canvas-before');
  const canvasAfter = $('#insta-canvas-after');
  if (!canvasBefore || !canvasAfter) return;

  canvasBefore.width = w;
  canvasBefore.height = h;
  canvasAfter.width = w;
  canvasAfter.height = h;

  const bCtx = canvasBefore.getContext('2d');
  bCtx.drawImage(instaSrcCanvas, 0, 0);

  const aCtx = canvasAfter.getContext('2d');
  aCtx.drawImage(instaSrcCanvas, 0, 0);

  const imgData = aCtx.getImageData(0, 0, w, h);
  const opts = {
    filterKey: currentInstaFilter,
    intensity: parseInt($('#insta-slider-intensity')?.value || '100', 10) / 100,
    warmth: parseInt($('#insta-slider-warmth')?.value || '0', 10),
    vibrance: parseInt($('#insta-slider-vibrance')?.value || '0', 10),
    contrast: parseInt($('#insta-slider-contrast')?.value || '0', 10),
    vignette: parseInt($('#insta-slider-vignette')?.value || '0', 10),
    grain: parseInt($('#insta-slider-grain')?.value || '0', 10)
  };

  applyInstagramEngineToImageData(imgData, opts);
  aCtx.putImageData(imgData, 0, 0);

  const activeFilter = INSTAGRAM_FILTERS.find(x => x.id === currentInstaFilter);
  if ($('#insta-active-filter-name') && activeFilter) {
    $('#insta-active-filter-name').textContent = activeFilter.name;
  }
}

function applyInstagramEngineToImageData(imageData, opts) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (!totalPixels) return;

  const filter = opts.filterKey || 'normal';
  const intensity = opts.intensity !== undefined ? opts.intensity : 1.0;
  const warmth = opts.warmth || 0;
  const vibrance = opts.vibrance || 0;
  const contrast = opts.contrast || 0;
  const vignette = opts.vignette || 0;
  const grain = opts.grain || 0;

  const cFactor = contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
  const cx = width / 2;
  const cy = height / 2;
  const maxDistSq = (cx * cx + cy * cy) || 1;

  for (let i = 0; i < data.length; i += 4) {
    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];

    let r = origR;
    let g = origG;
    let b = origB;

    switch (filter) {
      case 'clarendon': {
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r + (r - 128) * 0.22;
        g = g + (g - 128) * 0.22;
        b = b + (b - 128) * 0.22;
        if (luma < 128) {
          b += 14 * (1 - luma / 128);
          g += 4 * (1 - luma / 128);
        } else {
          r += 12 * ((luma - 128) / 128);
          g += 8 * ((luma - 128) / 128);
        }
        break;
      }
      case 'juno': {
        r = r * 1.08 + 12;
        g = g * 1.04 + 6;
        b = b * 0.94;
        break;
      }
      case 'ludwig': {
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r + (r - 128) * 0.14;
        g = g + (g - 128) * 0.14;
        b = b + (b - 128) * 0.14;
        if (luma < 100) { r += 8; g += 8; b += 8; }
        break;
      }
      case 'lark': {
        r = r * 0.92;
        g = g * 1.10 + 6;
        b = b * 1.12 + 10;
        break;
      }
      case 'valencia': {
        r = r * 1.08 + 18;
        g = g * 1.04 + 12;
        b = b * 0.88 + 8;
        if (r < 30) r = 30;
        if (g < 25) g = 25;
        if (b < 20) b = 20;
        break;
      }
      case 'moon': {
        let l = 0.299 * r + 0.587 * g + 0.114 * b;
        l = ((l / 255 - 0.5) * 1.3 + 0.5) * 255;
        r = l; g = l; b = l + 4;
        break;
      }
      case 'crema': {
        r = r * 1.04 + 16;
        g = g * 1.02 + 10;
        b = b * 0.92 + 14;
        if (r < 28) r = 28;
        if (g < 28) g = 28;
        if (b < 28) b = 28;
        break;
      }
      case 'reyes': {
        r = (r - 128) * 0.88 + 128 + 18;
        g = (g - 128) * 0.88 + 128 + 12;
        b = (b - 128) * 0.88 + 128 + 4;
        break;
      }
      case 'slumber': {
        r = r * 0.96 + 14;
        g = g * 0.92;
        b = b * 1.06 + 18;
        if (r < 24) r = 24;
        if (g < 24) g = 24;
        if (b < 24) b = 24;
        break;
      }
      case 'lofi': {
        r = ((r - 128) * 1.28 + 128) * 1.15;
        g = ((g - 128) * 1.28 + 128) * 1.15;
        b = ((b - 128) * 1.28 + 128) * 1.10;
        break;
      }
      case 'xpro2': {
        r = (r - 128) * 1.22 + 128 + 14;
        g = (g - 128) * 1.22 + 128 + 16;
        b = (b - 128) * 1.22 + 128 - 10;
        break;
      }
      case 'gingham': {
        r = (r - 128) * 0.9 + 128 + 12;
        g = (g - 128) * 0.9 + 128 + 10;
        b = (b - 128) * 0.9 + 128 + 6;
        if (r < 22) r = 22;
        if (g < 22) g = 22;
        break;
      }
      case 'aden': {
        r = r * 1.06 + 14;
        g = g * 1.02 + 8;
        b = b * 0.98 + 12;
        break;
      }
    }

    if (intensity < 1.0) {
      r = origR + (r - origR) * intensity;
      g = origG + (g - origG) * intensity;
      b = origB + (b - origB) * intensity;
    }

    if (warmth !== 0) {
      r += warmth * 0.5;
      b -= warmth * 0.5;
    }

    if (vibrance !== 0) {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = (maxC - minC) / (maxC || 1);
      const vMult = (1 - sat) * (vibrance / 100);
      r += (r - maxC) * vMult * 0.8;
      g += (g - maxC) * vMult * 0.8;
      b += (b - maxC) * vMult * 0.8;
    }

    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      b = cFactor * (b - 128) + 128;
    }

    if (vignette > 0) {
      const px = (i / 4) % width;
      const py = Math.floor((i / 4) / width);
      const dx = px - cx;
      const dy = py - cy;
      const dSq = dx * dx + dy * dy;
      const vRatio = Math.min(1.0, dSq / maxDistSq);
      const vDim = 1.0 - (vignette / 100) * 0.75 * vRatio;
      r *= vDim;
      g *= vDim;
      b *= vDim;
    }

    if (grain > 0) {
      const noise = (Math.random() - 0.5) * (grain * 0.7);
      r += noise;
      g += noise;
      b += noise;
    }

    data[i]     = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

function initInstagramRetouchModal() {
  if (isInstaModalInit) return;
  isInstaModalInit = true;

  const grid = $('#insta-filters-grid');
  if (grid) {
    grid.innerHTML = INSTAGRAM_FILTERS.map(f => `
      <div class="insta-filter-chip ${f.id === currentInstaFilter ? 'is-active' : ''}" data-filter="${f.id}" title="${f.desc}">
        <div class="insta-filter-swatch" style="background: ${f.gradient};"></div>
        <div class="insta-filter-name">${f.name}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.insta-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.insta-filter-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        currentInstaFilter = chip.dataset.filter || 'normal';
        renderInstaSplitPreview();
      });
    });
  }

  const vp = $('#insta-split-viewport');
  if (vp) {
    const setRatio = (ratio) => {
      const pct = Math.max(0, Math.min(100, ratio * 100));
      vp.style.setProperty('--split-pos', pct + '%');
    };

    vp.addEventListener('mousedown', e => {
      isInstaSplitDragging = true;
      const rect = vp.getBoundingClientRect();
      setRatio((e.clientX - rect.left) / rect.width);
    });

    window.addEventListener('mousemove', e => {
      if (!isInstaSplitDragging) return;
      const rect = vp.getBoundingClientRect();
      setRatio((e.clientX - rect.left) / rect.width);
    });

    window.addEventListener('mouseup', () => {
      isInstaSplitDragging = false;
    });

    vp.addEventListener('touchstart', e => {
      isInstaSplitDragging = true;
      const rect = vp.getBoundingClientRect();
      const t = e.touches[0];
      if (t) setRatio((t.clientX - rect.left) / rect.width);
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (!isInstaSplitDragging) return;
      const rect = vp.getBoundingClientRect();
      const t = e.touches[0];
      if (t) setRatio((t.clientX - rect.left) / rect.width);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isInstaSplitDragging = false;
    });
  }

  const bindInstaSlider = (sliderId, valId, suffix = '%') => {
    const s = $(`#${sliderId}`);
    const v = $(`#${valId}`);
    if (!s) return;
    s.addEventListener('input', () => {
      if (v) v.textContent = s.value + suffix;
      renderInstaSplitPreview();
    });
  };

  bindInstaSlider('insta-slider-intensity', 'insta-val-intensity');
  bindInstaSlider('insta-slider-warmth', 'insta-val-warmth');
  bindInstaSlider('insta-slider-vibrance', 'insta-val-vibrance');
  bindInstaSlider('insta-slider-contrast', 'insta-val-contrast');
  bindInstaSlider('insta-slider-vignette', 'insta-val-vignette');
  bindInstaSlider('insta-slider-grain', 'insta-val-grain');

  $('#insta-target-selected')?.addEventListener('click', () => {
    $('#insta-target-selected')?.classList.add('is-active');
    $('#insta-target-canvas')?.classList.remove('is-active');
    prepareInstaSourceCanvas();
    renderInstaSplitPreview();
  });

  $('#insta-target-canvas')?.addEventListener('click', () => {
    $('#insta-target-canvas')?.classList.add('is-active');
    $('#insta-target-selected')?.classList.remove('is-active');
    prepareInstaSourceCanvas();
    renderInstaSplitPreview();
  });

  $('#btn-insta-apply')?.addEventListener('click', applyInstagramRetouch);
  $('#btn-insta-revert')?.addEventListener('click', revertInstagramRetouch);
  $('#instagram-retouch-modal-close')?.addEventListener('click', closeInstagramRetouchModal);
  $('#instagram-retouch-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeInstagramRetouchModal();
  });
}

async function applyInstagramRetouch() {
  const isSelected = $('#insta-target-selected')?.classList.contains('is-active');
  const opts = {
    filterKey: currentInstaFilter,
    intensity: parseInt($('#insta-slider-intensity')?.value || '100', 10) / 100,
    warmth: parseInt($('#insta-slider-warmth')?.value || '0', 10),
    vibrance: parseInt($('#insta-slider-vibrance')?.value || '0', 10),
    contrast: parseInt($('#insta-slider-contrast')?.value || '0', 10),
    vignette: parseInt($('#insta-slider-vignette')?.value || '0', 10),
    grain: parseInt($('#insta-slider-grain')?.value || '0', 10)
  };

  if (isSelected) {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image') {
      toast('Сначала выделите изображение на холсте или выберите «Весь холст»');
      return;
    }
    applyInstagramToFabricImage(obj, opts);
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    onSelection();
    closeInstagramRetouchModal();
    toast(`✨ Ретушь Instagram (${currentInstaFilter}) применена к фото!`);
  } else {
    const images = canvas.getObjects().filter(o => o.type === 'image');
    if (!images.length) {
      toast('На холсте нет изображений для ретуши');
      return;
    }
    images.forEach(img => applyInstagramToFabricImage(img, opts));
    canvas.requestRenderAll();
    saveHistory();
    updateLayersList();
    closeInstagramRetouchModal();
    toast(`✨ Ретушь Instagram (${currentInstaFilter}) применена к макету!`);
  }
}

function applyInstagramToFabricImage(fabricImage, opts) {
  if (!fabricImage || fabricImage.type !== 'image') return;
  const el = fabricImage.getElement();
  if (!el) return;

  if (!fabricImage.__originalElement) {
    fabricImage.__originalElement = el;
    fabricImage.__originalSrc = el.src || '';
  }

  const baseEl = fabricImage.__originalElement || el;
  const w = baseEl.naturalWidth || baseEl.width || 800;
  const h = baseEl.naturalHeight || baseEl.height || 600;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const ctx = offCanvas.getContext('2d');
  ctx.drawImage(baseEl, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  applyInstagramEngineToImageData(imgData, opts);
  ctx.putImageData(imgData, 0, 0);

  fabricImage.setElement(offCanvas);
  fabricImage.__isInstaFiltered = true;
  fabricImage.__currentInstaFilter = opts.filterKey;
  fabricImage.dirty = true;
  if (typeof fabricImage.applyFilters === 'function') {
    fabricImage.applyFilters();
  }
}

function revertInstagramRetouch() {
  const obj = canvas?.getActiveObject();
  if (obj && obj.type === 'image' && obj.__originalElement) {
    obj.setElement(obj.__originalElement);
    obj.__isInstaFiltered = false;
    obj.dirty = true;
    canvas.requestRenderAll();
    saveHistory();
    onSelection();
    toast('Исходное фото восстановлено ↺');
  } else {
    currentInstaFilter = 'normal';
    $$('#insta-filters-grid .insta-filter-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.filter === 'normal');
    });
    const sInt = $('#insta-slider-intensity');
    const vInt = $('#insta-val-intensity');
    if (sInt) sInt.value = 100;
    if (vInt) vInt.textContent = '100%';

    const sW = $('#insta-slider-warmth');
    const vW = $('#insta-val-warmth');
    if (sW) sW.value = 0;
    if (vW) vW.textContent = '0%';

    const sV = $('#insta-slider-vibrance');
    const vV = $('#insta-val-vibrance');
    if (sV) sV.value = 0;
    if (vV) vV.textContent = '0%';

    const sC = $('#insta-slider-contrast');
    const vC = $('#insta-val-contrast');
    if (sC) sC.value = 0;
    if (vC) vC.textContent = '0%';

    const sVg = $('#insta-slider-vignette');
    const vVg = $('#insta-val-vignette');
    if (sVg) sVg.value = 0;
    if (vVg) vVg.textContent = '0%';

    const sGr = $('#insta-slider-grain');
    const vGr = $('#insta-val-grain');
    if (sGr) sGr.value = 0;
    if (vGr) vGr.textContent = '0%';

    renderInstaSplitPreview();
    toast('Фильтры ретуши сброшены');
  }
}


/* ══════════════════════════════════════════════════════════════
   МЕНЕДЖЕР ЧЕРНОВИКОВ И АВТОСОХРАНЕНИЕ (MULTI-DRAFTS SYSTEM)
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   МЕНЕДЖЕР ЧЕРНОВИКОВ И ПРОЕКТОВ (INDEXEDDB + HYBRID STORAGE)
   ══════════════════════════════════════════════════════════════ */
const POSTER_DB_NAME = 'AuroraPosterDataDB';
const POSTER_DB_VER  = 1;
const DRAFTS_KEY     = 'aurora_poster_drafts_v3';

let _cachedDrafts = [];
let _currentDraftId = null;
let _autosaveTimer = null;
let _debounceSaveTimer = null;

/** Открытие IndexedDB для неограниченного хранения черновиков и проектов */
function openPosterDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB недоступен в этом браузере'));
    }
    const req = indexedDB.open(POSTER_DB_NAME, POSTER_DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('drafts')) {
        const store = db.createObjectStore('drafts', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Сохранение в IndexedDB */
async function idbSaveDraft(draft) {
  try {
    const db = await openPosterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      store.put(draft);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB save draft failed:', err);
    return false;
  }
}

/** Получение всех черновиков из IndexedDB */
async function idbGetAllDrafts() {
  try {
    const db = await openPosterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IDB get all drafts failed:', err);
    return [];
  }
}

/** Удаление черновика из IndexedDB */
async function idbDeleteDraft(id) {
  try {
    const db = await openPosterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB delete draft failed:', err);
    return false;
  }
}

/** Синхронизация с localStorage с защитой от QuotaExceededError */
function trySyncToLocalStorage(drafts) {
  try {
    const trimmed = drafts.slice(0, 20);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
  } catch (quotaErr) {
    console.warn('LocalStorage quota exceeded, storing compact index with IndexedDB backing...');
    try {
      // Сохраняем компактный индекс (без тяжелых base64 превью у старых черновиков)
      const compact = drafts.slice(0, 12).map((d, i) => {
        if (i === 0) return d;
        return {
          id: d.id,
          title: d.title,
          sizeKey: d.sizeKey,
          sizeLabel: d.sizeLabel,
          objectsCount: d.objectsCount,
          updatedAt: d.updatedAt,
          preview: '',
          canvasData: d.canvasData
        };
      });
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(compact));
    } catch (e2) {
      try {
        const minimal = drafts.slice(0, 5).map(d => ({
          id: d.id,
          title: d.title,
          sizeKey: d.sizeKey,
          sizeLabel: d.sizeLabel,
          objectsCount: d.objectsCount,
          updatedAt: d.updatedAt,
          preview: '',
          canvasData: d.canvasData
        }));
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(minimal));
      } catch (e3) {
        console.warn('LocalStorage full, relying 100% on IndexedDB');
      }
    }
  }
}

/** Синхронное получение списка черновиков из памяти/кэша */
function getSavedDrafts() {
  if (_cachedDrafts && _cachedDrafts.length > 0) {
    return _cachedDrafts;
  }
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Миграция со старой версии aurora_poster_v2 при первом запуске
    const legacy = localStorage.getItem('aurora_poster_v2');
    if (legacy && list.length === 0) {
      try {
        const d = JSON.parse(legacy);
        if (d?.canvas) {
          list.push({
            id: 'legacy_' + (d.at || Date.now()),
            title: d.title || 'Черновик (Автосохранённый)',
            sizeKey: d.size || 'a4_v',
            sizeLabel: SIZES[d.size]?.name || 'A4 Вертикальный',
            objectsCount: d.canvas.objects?.length || 0,
            updatedAt: d.at || Date.now(),
            preview: '',
            canvasData: d.canvas
          });
          localStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
        }
      } catch (e) {}
    }

    _cachedDrafts = list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return _cachedDrafts;
  } catch (e) {
    return [];
  }
}

/** Инициализация хранилища черновиков: чтение из IndexedDB + миграция */
async function initDraftsStorage() {
  getSavedDrafts();
  updateDraftsBadgeCount();

  try {
    const idbList = await idbGetAllDrafts();
    if (idbList && idbList.length > 0) {
      const map = new Map();
      _cachedDrafts.forEach(d => map.set(d.id, d));
      idbList.forEach(d => {
        const existing = map.get(d.id);
        if (!existing || (d.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(d.id, d);
        }
      });
      _cachedDrafts = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } else if (_cachedDrafts.length > 0) {
      for (const d of _cachedDrafts) {
        await idbSaveDraft(d);
      }
    }
  } catch (e) {
    console.warn('Drafts sync warning:', e);
  }

  updateDraftsBadgeCount();
}

/** Обновление бейджей количества черновиков */
function updateDraftsBadgeCount() {
  const drafts = getSavedDrafts();
  const count = drafts.length;
  $$('.draft-count-badge, #drafts-count-header, #drafts-count-tpl, #drafts-count-badge').forEach(el => {
    el.textContent = count > 0 ? count : '0';
    el.classList.toggle('hidden', count === 0);
  });
}

/** Сохранение текущего макета в черновики (с поддержкой IndexedDB и localStorage) */
async function saveCurrentDraft(isManual = false) {
  if (!canvas) {
    if (isManual) toast('Холст не инициализирован');
    return null;
  }
  try {
    const title = $('#poster-title')?.value?.trim() || 'Афиша без названия';
    const sizeKey = Object.entries(SIZES).find(([, v]) => v === currentSize)?.[0] || 'a4_v';
    const sizeName = SIZES[sizeKey]?.name || 'A4 Вертикальный';

    // Безопасная сериализация холста
    let canvasJson;
    try {
      canvasJson = canvas.toJSON(CUSTOM_PROPS_TO_SAVE);
    } catch (serr) {
      console.error('Canvas serialization error:', serr);
      if (isManual) toast('Ошибка сериализации холста');
      return null;
    }

    const objectsCount = canvas.getObjects().length;

    // Генерируем компактное превью (180px) строго по границам листа без маркеров выделения
    let previewDataUrl = '';
    try {
      const artW = currentSize?.w || 800;
      const prevScale = Math.min(180 / artW, 0.25);
      const buffer = renderCleanArtboardCanvas(canvas, prevScale);
      previewDataUrl = buffer.toDataURL('image/jpeg', 0.70);
    } catch (e) {
      console.warn('Draft preview generation error:', e);
    }

    const now = Date.now();
    if (!_currentDraftId) {
      const existing = _cachedDrafts.find(d => d.title === title && (now - (d.updatedAt || 0) < 3600000));
      _currentDraftId = existing ? existing.id : 'draft_' + now + '_' + Math.random().toString(36).substr(2, 5);
    }

    const draftItem = {
      id: _currentDraftId,
      title: title,
      sizeKey: sizeKey,
      sizeLabel: `${sizeName} (${currentSize.w}×${currentSize.h})`,
      objectsCount: objectsCount,
      updatedAt: now,
      preview: previewDataUrl || (_cachedDrafts.find(d => d.id === _currentDraftId)?.preview || ''),
      canvasData: canvasJson
    };

    // Обновляем кэш в памяти
    const existingIdx = _cachedDrafts.findIndex(d => d.id === _currentDraftId);
    if (existingIdx >= 0) {
      _cachedDrafts[existingIdx] = draftItem;
    } else {
      _cachedDrafts.unshift(draftItem);
    }
    _cachedDrafts = _cachedDrafts.slice(0, 50).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // 1. Сохраняем в IndexedDB (без лимитов размера)
    await idbSaveDraft(draftItem);

    // 2. Синхронизируем с localStorage
    trySyncToLocalStorage(_cachedDrafts);

    updateDraftsBadgeCount();

    if (isManual) {
      toast(`✅ Черновик «${title}» сохранён`);
      if (!$('#drafts-modal-overlay')?.classList.contains('hidden')) {
        renderDraftsList();
      }
    }
    return draftItem;
  } catch (err) {
    console.error('Save draft error:', err);
    if (isManual) toast('Ошибка сохранения: ' + (err.message || 'сбой хранилища'));
    return null;
  }
}

/** Запуск периодического и отложенного автосохранения */
function scheduleAutosave() {
  if (!canvas) return;
  clearTimeout(_debounceSaveTimer);
  _debounceSaveTimer = setTimeout(() => {
    saveCurrentDraft(false);
  }, 1500);
}

function startAutosave() {
  clearInterval(_autosaveTimer);
  _autosaveTimer = setInterval(() => {
    if (!canvas) return;
    saveCurrentDraft(false);
  }, 30000);
}

/** Рендер списка сохранённых черновиков в модальном окне */
function renderDraftsList() {
  const container = $('#drafts-grid') || $('#drafts-list-container');
  const emptyEl = $('#drafts-empty');
  const storageInfo = $('#drafts-storage-status') || $('#drafts-storage-info');
  if (!container) return;

  const drafts = getSavedDrafts();
  if (storageInfo) {
    storageInfo.textContent = `Сохранено черновиков: ${drafts.length} · IndexedDB активна`;
  }

  if (drafts.length === 0) {
    container.innerHTML = '';
    if (emptyEl) {
      emptyEl.classList.remove('hidden');
    } else {
      container.innerHTML = `
        <div class="drafts-empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">У вас пока нет сохранённых черновиков</div>
          <div class="empty-desc">Сохраняйте свои работы, чтобы быстро возвращаться к редактированию в любой момент.</div>
        </div>
      `;
    }
    return;
  }

  emptyEl?.classList.add('hidden');

  let html = '';
  drafts.forEach(d => {
    const dt = new Date(d.updatedAt || Date.now()).toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    const previewImg = d.preview
      ? `<img src="${d.preview}" alt="${escapeHtml(d.title)}" />`
      : `<div class="draft-card-placeholder">🖼️</div>`;

    html += `
      <div class="draft-card" data-id="${escapeHtml(d.id)}" style="cursor: pointer;" title="Кликните, чтобы открыть черновик">
        <div class="draft-card-preview">
          ${previewImg}
        </div>
        <div class="draft-card-info">
          <div class="draft-card-title" title="${escapeHtml(d.title)}">${escapeHtml(d.title)}</div>
          <div class="draft-card-meta">
            <span>📅 ${dt}</span>
            <span>📐 ${escapeHtml(d.sizeLabel || 'A4')}</span>
            <span>📑 Слоёв: ${d.objectsCount || 0}</span>
          </div>
          <div class="draft-card-actions">
            <button class="btn-load-draft pbtn pbtn-sm" data-draft-id="${escapeHtml(d.id)}" title="Открыть этот черновик">
              <span class="material-symbols-rounded" style="font-size:14px;">folder_open</span> Открыть
            </button>
            <button class="btn-export-draft pbtn pbtn-sm" data-draft-id="${escapeHtml(d.id)}" title="Скачать как файл проекта (.aurora.json)">
              <span class="material-symbols-rounded" style="font-size:14px;">download</span> Экспорт
            </button>
            <button class="btn-delete-draft pbtn pbtn-sm pbtn-danger-icon" data-draft-id="${escapeHtml(d.id)}" title="Удалить черновик">
              <span class="material-symbols-rounded" style="font-size:14px; color:#ef4444;">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Клик по всей карточке для загрузки
  container.querySelectorAll('.draft-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      loadDraftById(card.dataset.id);
    });
  });

  // Кнопки загрузки, экспорта и удаления
  container.querySelectorAll('.btn-load-draft').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      loadDraftById(b.dataset.draftId);
    });
  });

  container.querySelectorAll('.btn-export-draft').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const d = getSavedDrafts().find(item => item.id === b.dataset.draftId);
      if (d) exportProjectJSON(d);
    });
  });

  container.querySelectorAll('.btn-delete-draft').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      deleteDraftById(b.dataset.draftId);
    });
  });
}

function openDraftsModal() {
  if (canvas && canvas.getObjects().length > 0) {
    saveCurrentDraft(false);
  }
  renderDraftsList();
  $('#drafts-modal-overlay')?.classList.remove('hidden');
}

function closeDraftsModal() {
  $('#drafts-modal-overlay')?.classList.add('hidden');
}

async function loadDraftById(id) {
  let draft = _cachedDrafts.find(d => d.id === id);
  if (!draft || !draft.canvasData) {
    try {
      const all = await idbGetAllDrafts();
      draft = all.find(d => d.id === id);
    } catch (e) {}
  }

  if (!draft || !draft.canvasData) {
    toast('Черновик не найден или повреждён');
    return;
  }

  _currentDraftId = draft.id;
  currentSize = SIZES[draft.sizeKey] || SIZES.a4_v;
  if (typeof window !== 'undefined') window.currentSize = currentSize;
  if (canvas) {
    canvas.__artboardWidth = currentSize.w;
    canvas.__artboardHeight = currentSize.h;
  }

  $('#screen-templates')?.classList.add('hidden');
  $('#screen-editor')?.classList.remove('hidden');

  initCanvas(currentSize.w, currentSize.h);

  canvas.loadFromJSON(draft.canvasData, () => {
    canvas.getObjects().forEach(o => {
      if (o.type === 'image' && o.__cornerRadius > 0 && !o.clipPath) {
        setImageCornerRadius(o, o.__cornerRadius, true);
      }
    });
    canvas.renderAll();
    fitZoom();
    saveHistory();
    updateLayersList();
    clearProps();
  });

  if (draft.title && $('#poster-title')) {
    $('#poster-title').value = draft.title;
  }

  updateFormatBadge();
  startAutosave();
  closeDraftsModal();
  toast(`✅ Черновик «${draft.title}» загружен`);
}

async function deleteDraftById(id) {
  if (!confirm('Удалить этот черновик без возможности восстановления?')) return;
  try {
    _cachedDrafts = _cachedDrafts.filter(d => d.id !== id);
    await idbDeleteDraft(id);
    trySyncToLocalStorage(_cachedDrafts);
    updateDraftsBadgeCount();
    renderDraftsList();
    toast('🗑️ Черновик удалён');
  } catch (e) {
    toast('Ошибка удаления черновика');
  }
}

function loadDraft() {
  updateDraftsBadgeCount();
  const drafts = getSavedDrafts();
  return drafts.length > 0;
}

function manualSave() {
  saveCurrentDraft(true);
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
   ИНТЕГРАЦИЯ С FIGMA REST API (ИМПОРТ И ЭКСПОРТ)
   ══════════════════════════════════════════════════════════════ */
const FIGMA_STORAGE_KEY = 'aurora_figma_token';
const FIGMA_DEFAULT_TOKEN = '';
let figmaCurrentFileKey = null;
let figmaCurrentDoc = null;
let figmaSelectedFrameId = null;
let figmaFramesList = [];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStoredFigmaToken() {
  try {
    return localStorage.getItem(FIGMA_STORAGE_KEY) || FIGMA_DEFAULT_TOKEN;
  } catch (e) {
    return FIGMA_DEFAULT_TOKEN;
  }
}

function setStoredFigmaToken(token, remember) {
  try {
    if (remember && token) {
      localStorage.setItem(FIGMA_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(FIGMA_STORAGE_KEY);
    }
  } catch (e) {}
}

function parseFigmaUrl(urlOrKey) {
  if (!urlOrKey) return null;
  const str = urlOrKey.trim();

  // 1. Проверяем URL вида:
  // https://www.figma.com/design/AbCdEf12345/Title?node-id=1:2
  // https://www.figma.com/file/AbCdEf12345/Title?node-id=1-2
  const urlMatch = str.match(/figma\.com\/(?:design|file|proto)\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch) {
    const fileKey = urlMatch[1];
    let nodeId = null;
    const nodeMatch = str.match(/[?&]node-id=([^&#]+)/i);
    if (nodeMatch) {
      nodeId = decodeURIComponent(nodeMatch[1]).replace(/-/g, ':');
    }
    return { fileKey, nodeId };
  }

  // 2. Если передан прямой ключ файла (alphanumeric, мин. 10 знаков)
  if (/^[a-zA-Z0-9_-]{10,50}$/.test(str)) {
    return { fileKey: str, nodeId: null };
  }

  return null;
}

async function callFigmaProxy(action, params = {}, method = 'GET', body = null) {
  const proxyUrl = new URL('../../api/figma-proxy.php', window.location.href);
  proxyUrl.searchParams.set('action', action);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      proxyUrl.searchParams.set(k, String(v));
    }
  }

  const tokenInput = $('#figma-token-input');
  const token = (tokenInput?.value || '').trim() || getStoredFigmaToken();
  if (token) {
    proxyUrl.searchParams.set('token', token);
  }

  const headers = {};
  if (token) headers['X-Figma-Token'] = token;

  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(proxyUrl.toString(), opts);
  } catch (netErr) {
    throw new Error('Ошибка сети при обращении к серверному шлюзу Figma: ' + netErr.message);
  }

  let data;
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error(`Некорректный ответ сервера Figma (HTTP ${res.status})`);
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Ошибка Figma API (HTTP ${res.status})`);
  }

  return data;
}

async function verifyFigmaTokenQuiet(token) {
  const statusEl = $('#figma-token-status');
  if (!statusEl) return;
  if (!token) {
    statusEl.innerHTML = '<span class="figma-status-warn">Токен не введён</span>';
    return;
  }
  try {
    statusEl.innerHTML = '<span class="figma-status-loading">Проверка токена…</span>';
    const res = await callFigmaProxy('me', { token });
    if (res.user) {
      const u = res.user;
      statusEl.innerHTML = `<span class="figma-status-ok" title="${escapeHtml(u.email || '')}">✓ ${escapeHtml(u.handle || 'Пользователь')}${u.email ? ' (' + escapeHtml(u.email) + ')' : ''}</span>`;
    }
  } catch (e) {
    statusEl.innerHTML = `<span class="figma-status-err">✗ Ошибка: ${escapeHtml(e.message)}</span>`;
  }
}

function showFigmaLoader(text = 'Соединение с Figma API...') {
  const loader = $('#figma-loader');
  const textEl = $('#figma-loader-text');
  if (textEl) textEl.textContent = text;
  loader?.classList.remove('hidden');
}

function hideFigmaLoader() {
  $('#figma-loader')?.classList.add('hidden');
}

function figmaColorToRgba(fill) {
  if (!fill || fill.visible === false) return null;
  if (fill.type !== 'SOLID' || !fill.color) return null;
  const r = Math.min(255, Math.max(0, Math.round((fill.color.r ?? 0) * 255)));
  const g = Math.min(255, Math.max(0, Math.round((fill.color.g ?? 0) * 255)));
  const b = Math.min(255, Math.max(0, Math.round((fill.color.b ?? 0) * 255)));
  const a = fill.opacity !== undefined ? fill.opacity : (fill.color.a ?? 1);
  if (a < 0.999) {
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
  }
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function ensureFontAvailable(fontFamily) {
  if (!fontFamily) return;
  const fam = fontFamily.trim();
  if (!fam || figmaLoadedFonts.has(fam)) return;
  figmaLoadedFonts.add(fam);

  const localFonts = ['Shoptronic SP', 'Dela Gothic One', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'];
  if (localFonts.includes(fam)) return;

  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
    document.head.appendChild(link);
  } catch (e) {}
}

function extractFigmaFrames(docNode) {
  const frames = [];
  if (!docNode) return frames;

  function traverse(node, pageName) {
    if (!node || node.visible === false) return;
    const isFrameLike = ['FRAME', 'COMPONENT', 'SECTION', 'GROUP', 'COMPONENT_SET'].includes(node.type);
    const box = node.absoluteBoundingBox;

    if (isFrameLike && box && box.width >= 40 && box.height >= 40) {
      frames.push({
        id: node.id,
        name: node.name || 'Frame ' + node.id,
        type: node.type,
        pageName: pageName || 'Макет',
        width: Math.round(box.width),
        height: Math.round(box.height),
        childrenCount: Array.isArray(node.children) ? node.children.length : 0,
        rawNode: node
      });
      if (node.type !== 'SECTION' && node.type !== 'CANVAS') {
        return;
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child, node.type === 'CANVAS' ? node.name : pageName);
      }
    }
  }

  traverse(docNode, '');
  return frames;
}

function renderFigmaFramesGrid(frames, preselectId = null) {
  const grid = $('#figma-frames-grid');
  if (!grid) return;
  grid.innerHTML = '';
  figmaSelectedFrameId = null;
  const doImportBtn = $('#btn-figma-do-import');
  if (doImportBtn) doImportBtn.disabled = true;

  frames.forEach((frame, idx) => {
    const card = document.createElement('div');
    card.className = 'figma-frame-card';
    card.dataset.frameId = frame.id;
    card.innerHTML = `
      <div class="figma-frame-thumb-wrap" id="figma-thumb-${frame.id.replace(/[:]/g, '-')}">
        <div class="figma-frame-thumb-empty">
          <span class="material-symbols-rounded">crop_portrait</span>
        </div>
      </div>
      <div class="figma-frame-card-body">
        <div class="figma-frame-card-title" title="${escapeHtml(frame.name)}">${escapeHtml(frame.name)}</div>
        <div class="figma-frame-card-meta">
          <span>${frame.width} × ${frame.height}</span>
          <span>${frame.childrenCount} сл.</span>
        </div>
        <div class="figma-frame-page-tag">${escapeHtml(frame.pageName)}</div>
      </div>
    `;

    card.addEventListener('click', () => selectFigmaFrame(frame.id));
    grid.appendChild(card);

    if (preselectId && (frame.id === preselectId || frame.id === preselectId.replace('-', ':'))) {
      selectFigmaFrame(frame.id);
    } else if (!preselectId && idx === 0) {
      selectFigmaFrame(frame.id);
    }
  });
}

function selectFigmaFrame(frameId) {
  figmaSelectedFrameId = frameId;
  $$('.figma-frame-card').forEach(c => {
    c.classList.toggle('is-selected', c.dataset.frameId === frameId);
  });
  const frame = figmaFramesList.find(f => f.id === frameId);
  if (frame) {
    const infoEl = $('#figma-selected-info');
    if (infoEl) {
      infoEl.innerHTML = `Выбран макет: <strong>${escapeHtml(frame.name)}</strong> (${frame.width} × ${frame.height} px, ${frame.childrenCount} элементов)`;
    }
    const btn = $('#btn-figma-do-import');
    if (btn) btn.disabled = false;
  }
}

async function loadFigmaFramePreviews(fileKey, frames) {
  if (!frames.length) return;
  const slice = frames.slice(0, 16);
  const ids = slice.map(f => f.id).join(',');
  try {
    const res = await callFigmaProxy('images', {
      file_key: fileKey,
      ids: ids,
      format: 'png',
      scale: 0.4
    });
    if (res.images) {
      for (const [id, imgUrl] of Object.entries(res.images)) {
        if (!imgUrl) continue;
        const thumbWrap = $(`#figma-thumb-${id.replace(/[:]/g, '-')}`);
        if (thumbWrap) {
          const proxied = `../../api/figma-proxy.php?action=image_proxy&url=${encodeURIComponent(imgUrl)}`;
          thumbWrap.innerHTML = `<img src="${proxied}" class="figma-frame-thumb-img" alt="Превью фрейма" loading="lazy">`;
        }
      }
    }
  } catch (err) {
    console.warn('Не удалось фоном подгрузить миниатюры фреймов:', err);
  }
}

async function fetchFigmaDocument() {
  const urlInput = $('#figma-file-url');
  const tokenInput = $('#figma-token-input');
  const saveCheck = $('#figma-save-token');
  const rawUrl = urlInput?.value.trim();
  const token = tokenInput?.value.trim() || getStoredFigmaToken();

  if (!rawUrl) {
    toast('Введите ссылку на макет или ключ файла Figma');
    urlInput?.focus();
    return;
  }
  if (!token) {
    toast('Введите Personal Access Token Figma');
    tokenInput?.focus();
    return;
  }

  if (saveCheck && saveCheck.checked) {
    setStoredFigmaToken(token, true);
  }

  const parsed = parseFigmaUrl(rawUrl);
  if (!parsed || !parsed.fileKey) {
    toast('Не удалось извлечь ключ файла из ссылки Figma. Проверьте формат ссылки.');
    return;
  }

  figmaCurrentFileKey = parsed.fileKey;

  showFigmaLoader('Загрузка структуры файла из Figma API...');
  $('#figma-result-area')?.classList.add('hidden');
  const fetchBtn = $('#btn-figma-fetch');
  if (fetchBtn) fetchBtn.disabled = true;

  try {
    const data = await callFigmaProxy('file', { file_key: figmaCurrentFileKey, depth: 2 });
    figmaCurrentDoc = data;

    const docName = data.name || 'Документ Figma';
    const lastModified = data.lastModified ? new Date(data.lastModified).toLocaleDateString('ru-RU') : '';
    const nameEl = $('#figma-doc-name');
    if (nameEl) nameEl.textContent = docName;
    const metaEl = $('#figma-doc-meta');
    if (metaEl) metaEl.textContent = `${lastModified ? 'Изм: ' + lastModified + ' · ' : ''}Версия ${data.version || 'v1'}`;

    figmaFramesList = extractFigmaFrames(data.document);
    if (!figmaFramesList.length) {
      throw new Error('В документе не найдено подходящих фреймов или артбордов. Создайте хотя бы один фрейм в Figma.');
    }

    renderFigmaFramesGrid(figmaFramesList, parsed.nodeId);
    $('#figma-result-area')?.classList.remove('hidden');

    loadFigmaFramePreviews(figmaCurrentFileKey, figmaFramesList);
    toast(`Загружено ${figmaFramesList.length} фреймов из Figma ❖`);
  } catch (err) {
    console.error('Figma fetch error:', err);
    toast('Ошибка Figma: ' + (err.message || 'Не удалось загрузить структуру файла'));
  } finally {
    hideFigmaLoader();
    if (fetchBtn) fetchBtn.disabled = false;
  }
}

async function doImportFigmaFrame() {
  if (!figmaSelectedFrameId || !figmaCurrentFileKey) {
    toast('Выберите фрейм для импорта');
    return;
  }
  const frameMeta = figmaFramesList.find(f => f.id === figmaSelectedFrameId);
  if (!frameMeta) {
    toast('Выбранный фрейм не найден');
    return;
  }

  const mode = document.querySelector('input[name="figma-import-mode"]:checked')?.value || 'layers';
  const importBtn = $('#btn-figma-do-import');
  if (importBtn) importBtn.disabled = true;

  showFigmaLoader(mode === 'vector' ? 'Рендеринг векторного артборда через Figma API...' : 'Извлечение слоёв и типографики из Figma...');

  try {
    if (mode === 'vector') {
      // Режим 1: Высокоточный вектор / Арт (рендеринг в 2x PNG через images API)
      const res = await callFigmaProxy('images', {
        file_key: figmaCurrentFileKey,
        ids: frameMeta.id,
        scale: 2,
        format: 'png'
      });
      const imgUrl = res.images?.[frameMeta.id];
      if (!imgUrl) throw new Error('Figma API не вернул изображение для этого фрейма');

      const proxiedUrl = `../../api/figma-proxy.php?action=image_proxy&url=${encodeURIComponent(imgUrl)}`;

      // Переключаемся на редактор
      $('#screen-templates')?.classList.add('hidden');
      $('#screen-editor')?.classList.remove('hidden');

      currentSize = {
        name: frameMeta.name || 'Figma Frame',
        w: frameMeta.width,
        h: frameMeta.height
      };
      if (typeof window !== 'undefined') window.currentSize = currentSize;
      if (canvas) {
        canvas.__artboardWidth = currentSize.w;
        canvas.__artboardHeight = currentSize.h;
      }
      initCanvas(currentSize.w, currentSize.h);

      if ($('#poster-title')) $('#poster-title').value = frameMeta.name;

      await new Promise((resolve, reject) => {
        fabric.Image.fromURL(proxiedUrl, img => {
          if (!img) return reject(new Error('Не удалось загрузить изображение фрейма'));
          img.set({
            left: 0,
            top: 0,
            scaleX: currentSize.w / (img.width || currentSize.w),
            scaleY: currentSize.h / (img.height || currentSize.h),
            selectable: true,
            hasControls: true
          });
          canvas.add(img);
          resolve();
        }, { crossOrigin: 'anonymous' });
      });

      canvas.renderAll();
      fitZoom();
      saveHistory();
      updateLayersList();
      clearProps();
      startAutosave();
      closeFigmaImportModal();
      toast('Артборд Figma успешно импортирован на холст! ❖');

    } else {
      // Режим 2: Послойный импорт (дерево нод, текст, геометрия)
      const detail = await callFigmaProxy('nodes', {
        file_key: figmaCurrentFileKey,
        ids: frameMeta.id,
        geometry: 'paths'
      });

      const frameNode = detail.nodes?.[frameMeta.id]?.document || frameMeta.rawNode;
      if (!frameNode) throw new Error('Не удалось получить структуру слоёв фрейма');

      const frameBox = frameNode.absoluteBoundingBox || { x: 0, y: 0, width: frameMeta.width, height: frameMeta.height };
      const fw = Math.round(frameBox.width || frameMeta.width);
      const fh = Math.round(frameBox.height || frameMeta.height);

      $('#screen-templates')?.classList.add('hidden');
      $('#screen-editor')?.classList.remove('hidden');

      currentSize = {
        name: frameNode.name || frameMeta.name || 'Figma Frame',
        w: fw,
        h: fh
      };
      if (typeof window !== 'undefined') window.currentSize = currentSize;
      if (canvas) {
        canvas.__artboardWidth = currentSize.w;
        canvas.__artboardHeight = currentSize.h;
      }
      initCanvas(currentSize.w, currentSize.h);

      // Фоновый цвет фрейма
      let bgColor = '#ffffff';
      if (frameNode.backgroundColor) {
        bgColor = figmaColorToRgba({ type: 'SOLID', color: frameNode.backgroundColor }) || '#ffffff';
      } else if (Array.isArray(frameNode.fills) && frameNode.fills.length) {
        bgColor = figmaColorToRgba(frameNode.fills[0]) || '#ffffff';
      }
      canvas.setBackgroundColor(bgColor, () => canvas.renderAll());

      if ($('#poster-title')) $('#poster-title').value = frameNode.name || frameMeta.name;

      // Сбор и парсинг дочерних слоёв
      const fabricObjects = [];
      const imageNodeIds = [];

      function collectNodes(parent) {
        if (!parent || !Array.isArray(parent.children)) return;
        for (const node of parent.children) {
          if (node.visible === false) continue;

          // Проверяем, есть ли у ноды fill типа IMAGE
          const hasImageFill = Array.isArray(node.fills) && node.fills.some(f => f.type === 'IMAGE' && f.visible !== false);
          if (hasImageFill || (node.type === 'VECTOR' && node.absoluteBoundingBox && node.absoluteBoundingBox.width > 60)) {
            imageNodeIds.push(node.id);
          }

          if (node.type === 'GROUP' || (node.type === 'FRAME' && (!node.fills || !node.fills.length))) {
            collectNodes(node);
          } else {
            fabricObjects.push(node);
          }
        }
      }

      collectNodes(frameNode);

      // Если есть изображения/векторы — подгружаем их рендеры пачкой
      let renderedImagesMap = {};
      if (imageNodeIds.length > 0) {
        showFigmaLoader(`Отрисовка изображений и графики (${imageNodeIds.length} шт.)...`);
        try {
          const imgRes = await callFigmaProxy('images', {
            file_key: figmaCurrentFileKey,
            ids: imageNodeIds.slice(0, 30).join(','),
            format: 'png',
            scale: 2
          });
          if (imgRes.images) renderedImagesMap = imgRes.images;
        } catch (e) {
          console.warn('Часть картинок не удалось отрисовать через images API:', e);
        }
      }

      let importedCount = 0;

      for (const node of fabricObjects) {
        const box = node.absoluteBoundingBox;
        if (!box) continue;

        const left = Math.round(box.x - frameBox.x);
        const top = Math.round(box.y - frameBox.y);
        const width = Math.round(box.width);
        const height = Math.round(box.height);

        // 1. Изображение из рендера
        if (renderedImagesMap[node.id]) {
          const pUrl = `../../api/figma-proxy.php?action=image_proxy&url=${encodeURIComponent(renderedImagesMap[node.id])}`;
          await new Promise(res => {
            fabric.Image.fromURL(pUrl, img => {
              if (img) {
                img.set({
                  left, top,
                  scaleX: width / (img.width || width),
                  scaleY: height / (img.height || height),
                  opacity: node.opacity !== undefined ? node.opacity : 1
                });
                canvas.add(img);
                importedCount++;
              }
              res();
            }, { crossOrigin: 'anonymous' });
          });
          continue;
        }

        // 2. Текстовый слой
        if (node.type === 'TEXT') {
          const textFill = (node.fills && node.fills.find(f => f.type === 'SOLID' && f.visible !== false)) || { color: { r: 0, g: 0, b: 0 } };
          const color = figmaColorToRgba(textFill) || '#0f172a';
          const fontSize = Math.round(node.style?.fontSize || 24);
          const fontFamily = node.style?.fontFamily || 'Montserrat';
          ensureFontAvailable(fontFamily);

          const alignRaw = (node.style?.textAlignHorizontal || 'LEFT').toLowerCase();
          const align = alignRaw === 'right' ? 'right' : (alignRaw === 'center' ? 'center' : 'left');

          const tObj = new fabric.Textbox(node.characters || 'Текст', {
            left, top,
            width: Math.max(width, 40),
            fontSize,
            fontFamily,
            fontWeight: node.style?.fontWeight ? String(node.style.fontWeight) : 'normal',
            fontStyle: node.style?.italic ? 'italic' : 'normal',
            textAlign: align,
            fill: color,
            lineHeight: (node.style?.lineHeightPx && fontSize) ? (node.style.lineHeightPx / fontSize) : 1.25,
            splitByGrapheme: false
          });
          canvas.add(tObj);
          importedCount++;
          continue;
        }

        // 3. Прямоугольники и плашки
        if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT') {
          const fill = (node.fills && node.fills.find(f => f.type === 'SOLID' && f.visible !== false));
          const stroke = (node.strokes && node.strokes.find(f => f.type === 'SOLID' && f.visible !== false));
          const rect = new fabric.Rect({
            left, top,
            width: Math.max(width, 4),
            height: Math.max(height, 4),
            fill: figmaColorToRgba(fill) || 'transparent',
            stroke: figmaColorToRgba(stroke) || null,
            strokeWidth: node.strokeWeight || 0,
            rx: node.cornerRadius || 0,
            ry: node.cornerRadius || 0,
            opacity: node.opacity !== undefined ? node.opacity : 1
          });
          canvas.add(rect);
          importedCount++;
          continue;
        }

        // 4. Эллипсы и круги
        if (node.type === 'ELLIPSE') {
          const fill = (node.fills && node.fills.find(f => f.type === 'SOLID' && f.visible !== false));
          const stroke = (node.strokes && node.strokes.find(f => f.type === 'SOLID' && f.visible !== false));
          const circle = new fabric.Circle({
            left, top,
            radius: Math.min(width, height) / 2,
            fill: figmaColorToRgba(fill) || '#38bdf8',
            stroke: figmaColorToRgba(stroke) || null,
            strokeWidth: node.strokeWeight || 0,
            opacity: node.opacity !== undefined ? node.opacity : 1
          });
          canvas.add(circle);
          importedCount++;
          continue;
        }

        // 5. Линии
        if (node.type === 'LINE') {
          const stroke = (node.strokes && node.strokes.find(f => f.type === 'SOLID' && f.visible !== false));
          const line = new fabric.Line([left, top, left + width, top + height], {
            stroke: figmaColorToRgba(stroke) || '#94a3b8',
            strokeWidth: Math.max(node.strokeWeight || 2, 1),
            opacity: node.opacity !== undefined ? node.opacity : 1
          });
          canvas.add(line);
          importedCount++;
          continue;
        }
      }

      canvas.renderAll();
      fitZoom();
      saveHistory();
      updateLayersList();
      clearProps();
      startAutosave();
      closeFigmaImportModal();
      toast(`Импортировано слоёв: ${importedCount} из Figma! 🚀`);
    }
  } catch (err) {
    console.error('Figma import execution error:', err);
    toast('Ошибка импорта: ' + (err.message || 'Не удалось собрать слои'));
  } finally {
    hideFigmaLoader();
    if (importBtn) importBtn.disabled = false;
  }
}

/* ── Экспорт в Figma (Буфер, SVG, API) ── */
async function exportFigmaClipboard() {
  if (!canvas) {
    toast('Холст не инициализирован');
    return;
  }

  const btn = $('#btn-figma-copy-clipboard');
  if (btn) btn.disabled = true;
  toast('Подготовка изображений для Figma…');

  const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
  let selectedObjects = null;
  if (activeObj && activeObj.type === 'activeSelection') {
    selectedObjects = activeObj.getObjects();
  }

  try {
    canvas._isExporting = true;
    await embedAllImagesToBase64(canvas);

    const savedZoom = zoom;
    applyZoom(1);
    if (activeObj) canvas.discardActiveObject();
    canvas.renderAll();

    const svgStr = buildFigmaSVG();

    applyZoom(savedZoom);

    const htmlPayload = `<!--StartFragment-->${svgStr}<!--EndFragment-->`;
    let copied = false;

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const item = new ClipboardItem({
          'text/html': new Blob([htmlPayload], { type: 'text/html' }),
          'text/plain': new Blob([svgStr], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        copied = true;
      } catch (clipErr) {
        console.warn('ClipboardItem error, fallback to writeText:', clipErr);
      }
    }

    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(svgStr);
        copied = true;
      } catch (e) {}
    }

    if (copied) {
      const successEl = $('#figma-copy-success');
      if (successEl) {
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 5000);
      }
      toast('Векторный макет скопирован — все картинки встроены! Ctrl+V в Figma ✦');
    } else {
      toast('Не удалось скопировать в буфер. Используйте «Скачать Figma SVG».');
    }
  } catch (err) {
    console.error('Figma clipboard error:', err);
    toast('Ошибка экспорта: ' + err.message);
  } finally {
    canvas._isExporting = false;
    if (activeObj) {
      if (selectedObjects && selectedObjects.length > 0 && typeof fabric !== 'undefined' && fabric.ActiveSelection) {
        const sel = new fabric.ActiveSelection(selectedObjects, { canvas });
        if (canvas.setActiveObject) canvas.setActiveObject(sel);
      } else if (!selectedObjects && canvas.contains && canvas.contains(activeObj)) {
        if (canvas.setActiveObject) canvas.setActiveObject(activeObj);
      }
      canvas.renderAll();
    }
    if (btn) btn.disabled = false;
  }
}

async function exportFigmaSvg() {
  if (!canvas) {
    toast('Холст не инициализирован');
    return;
  }

  const btn = $('#btn-figma-download-svg');
  if (btn) btn.disabled = true;
  toast('Встраивание изображений в SVG…');

  const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
  let selectedObjects = null;
  if (activeObj && activeObj.type === 'activeSelection') {
    selectedObjects = activeObj.getObjects();
  }

  try {
    canvas._isExporting = true;
    await embedAllImagesToBase64(canvas);

    const savedZoom = zoom;
    applyZoom(1);
    if (activeObj) canvas.discardActiveObject();
    canvas.renderAll();

    const svgStr = buildFigmaSVG();

    applyZoom(savedZoom);

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = ($('#poster-title')?.value || 'Афиша').replace(/[\/\\?%*:|"<>]/g, '_');
    a.download = `${safeTitle}.figma.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Файл .figma.svg скачан — картинки встроены как base64! Перетащите в Figma 🎨');
  } catch (err) {
    console.error('Figma SVG export error:', err);
    toast('Ошибка экспорта: ' + err.message);
  } finally {
    canvas._isExporting = false;
    if (activeObj) {
      if (selectedObjects && selectedObjects.length > 0 && typeof fabric !== 'undefined' && fabric.ActiveSelection) {
        const sel = new fabric.ActiveSelection(selectedObjects, { canvas });
        if (canvas.setActiveObject) canvas.setActiveObject(sel);
      } else if (!selectedObjects && canvas.contains && canvas.contains(activeObj)) {
        if (canvas.setActiveObject) canvas.setActiveObject(activeObj);
      }
      canvas.renderAll();
    }
    if (btn) btn.disabled = false;
  }
}

/**
 * Конвертирует все fabric.Image на холсте у которых src — внешний URL
 * в base64 data URI через offscreen canvas.
 * Это гарантирует, что SVG-экспорт Fabric.js встроит изображения как data URI,
 * а не как внешние ссылки (которые Figma не может загрузить).
 */
async function embedAllImagesToBase64(canvasInst) {
  const objects = canvasInst.getObjects();
  const imageObjects = objects.filter(o => o.type === 'image' && o._element);

  await Promise.allSettled(imageObjects.map(img => new Promise(resolve => {
    const el = img._element;
    if (!el) return resolve();

    // Если это уже data URL — всё ок, ничего не делаем
    const currentSrc = el.src || '';
    if (currentSrc.startsWith('data:')) return resolve();

    // Попытка нарисовать в offscreen canvas и вытащить dataURL
    try {
      const oc = document.createElement('canvas');
      oc.width = el.naturalWidth || el.width || 1;
      oc.height = el.naturalHeight || el.height || 1;
      const ctx = oc.getContext('2d');
      ctx.drawImage(el, 0, 0);
      const dataUrl = oc.toDataURL('image/png');

      // Загружаем по data URL, чтобы Fabric обновил внутренний _element
      const newImg = new Image();
      newImg.onload = () => {
        img._element = newImg;
        img._originalElement = newImg;
        resolve();
      };
      newImg.onerror = () => resolve(); // при ошибке — пропускаем
      newImg.src = dataUrl;
    } catch (err) {
      // Canvas tainted — пробуем через proxy-fetch
      const proxySrc = currentSrc.includes('figma-proxy')
        ? currentSrc
        : `../../api/figma-proxy.php?action=image_proxy&url=${encodeURIComponent(currentSrc)}`;

      fetch(proxySrc)
        .then(r => r.blob())
        .then(blob => new Promise((res2, rej2) => {
          const fr = new FileReader();
          fr.onload = e => res2(e.target.result);
          fr.onerror = rej2;
          fr.readAsDataURL(blob);
        }))
        .then(dataUrl => {
          const newImg = new Image();
          newImg.onload = () => {
            img._element = newImg;
            img._originalElement = newImg;
            resolve();
          };
          newImg.onerror = () => resolve();
          newImg.src = dataUrl;
        })
        .catch(() => resolve());
    }
  })));

  canvasInst.renderAll();
}

/**
 * Строит финальный SVG через Fabric toSVG, после того как все изображения
 * уже встроены как base64.
 * Дополнительно группирует объекты по блокам (blockTitle) в <g id="..."> группы,
 * чтобы в Figma макет открывался с идеальной структурой слоёв по блокам!
 */
function buildFigmaSVG() {
  const dims = getArtboardDimensions(canvas);
  const w = dims.w;
  const h = dims.h;
  const bg = canvas.__artboardBg || canvas.backgroundColor || '#ffffff';

  let svgStr = canvas.toSVG({
    suppressPreamble: false,
    width: w + 'px',
    height: h + 'px',
    viewBox: { x: 0, y: 0, width: w, height: h }
  }, function(markup, obj) {
    if (!obj || obj.__isHelper || obj.excludeFromExport) return '';
    const layerName = obj.layerName || '';
    const blockTitle = obj.blockTitle || '';
    if (layerName) {
      const safeName = escapeHtml(layerName).replace(/["'<>&]/g, '_');
      markup = markup.replace(/<([a-zA-Z0-9]+)([^>]*)>/, `<$1 id="${safeName}" data-name="${safeName}"$2>`);
    }
    if (blockTitle) {
      const safeBlock = escapeHtml(blockTitle).replace(/["'<>&]/g, '_');
      markup = `<!--BLOCK_START:${safeBlock}-->${markup}<!--BLOCK_END:${safeBlock}-->`;
    }
    return markup;
  });

  // Группируем последовательные элементы одного блока в <g id="[Блок ...]">
  svgStr = groupSvgBlocks(svgStr);

  // Вставляем определение clipPath для аппаратного отсечения вылетов в Figma
  const clipDef = `<clipPath id="figma-artboard-bounds-clip"><rect x="0" y="0" width="${w}" height="${h}" /></clipPath>`;
  if (svgStr.includes('<defs>')) {
    svgStr = svgStr.replace('<defs>', `<defs>\n\t${clipDef}`);
  } else if (svgStr.includes('</svg>')) {
    svgStr = svgStr.replace(/(<svg[^>]*>)/, `$1\n<defs>\n\t${clipDef}\n</defs>`);
  }

  // Fabric.js иногда пишет background через CSS, а не через <rect>.
  // Вставляем явный фоновый прямоугольник сразу после открывающего <svg>-тега
  // чтобы Figma видел его как отдельный слой фона.
  let bgFill = bg;
  if (typeof bgFill === 'object' && bgFill && bgFill.toLive) {
    bgFill = '#ffffff';
  }
  if (bgFill && bgFill !== 'rgba(0,0,0,0)' && bgFill !== 'transparent') {
    svgStr = svgStr.replace(
      /(<svg[^>]*>)/,
      `$1<rect id="Фон макета" x="0" y="0" width="${w}" height="${h}" fill="${escapeHtml(String(bgFill))}" />`
    );
  }

  // Оборачиваем слои в группу с clip-path, гарантируя что ни один выступающий объект не выйдет за рамку
  const wrapRegex = /(<\/defs>[\s\S]*?(?:<rect id="Фон макета"[^>]*\/>)?)([\s\S]*?)(<\/svg>)/;
  if (wrapRegex.test(svgStr)) {
    svgStr = svgStr.replace(wrapRegex, (match, p1, p2, p3) => {
      return `${p1}\n<g id="Artboard-Layers" clip-path="url(#figma-artboard-bounds-clip)">\n${p2}\n</g>\n${p3}`;
    });
  }

  return svgStr;
}

/**
 * Объединяет элементы с маркерами <!--BLOCK_START:...--> в логические SVG-группы <g id="...">
 * для безупречной структуры слоёв и папок в Figma.
 */
function groupSvgBlocks(svgStr) {
  const regex = /<!--BLOCK_START:([^\n>]+)-->([\s\S]*?)<!--BLOCK_END:\1-->/g;
  let currentBlock = null;
  let currentElements = [];
  let result = '';

  const flushBlock = () => {
    if (currentBlock && currentElements.length) {
      result += `<g id="${currentBlock}" data-name="${currentBlock}">\n  ${currentElements.join('\n  ')}\n</g>\n`;
      currentBlock = null;
      currentElements = [];
    }
  };

  const blockMatches = [];
  let m;
  while ((m = regex.exec(svgStr)) !== null) {
    blockMatches.push({ start: m.index, end: regex.lastIndex, block: m[1], content: m[2] });
  }

  if (!blockMatches.length) return svgStr;

  let cursor = 0;
  for (let i = 0; i < blockMatches.length; i++) {
    const bm = blockMatches[i];
    const gap = svgStr.slice(cursor, bm.start);
    if (gap.trim().length > 0) {
      flushBlock();
      result += gap;
    }
    if (currentBlock && currentBlock !== bm.block) {
      flushBlock();
    }
    currentBlock = bm.block;
    currentElements.push(bm.content.trim());
    cursor = bm.end;
  }
  flushBlock();
  if (cursor < svgStr.length) {
    result += svgStr.slice(cursor);
  }
  return result;
}



async function exportFigmaApiSend() {
  if (!canvas) {
    toast('Холст не инициализирован');
    return;
  }

  const input = $('#figma-export-file-url');
  const rawUrl = input?.value.trim() || figmaCurrentFileKey;

  if (!rawUrl) {
    toast('Укажите ссылку на файл Figma или File Key для публикации');
    input?.focus();
    return;
  }

  const parsed = parseFigmaUrl(rawUrl);
  if (!parsed || !parsed.fileKey) {
    toast('Некорректная ссылка на файл Figma');
    return;
  }

  const statusEl = $('#figma-api-send-status');
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<span class="figma-status-loading">Публикация в Figma API...</span>';
  }

  const sendBtn = $('#btn-figma-api-send');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const title = $('#poster-title')?.value || 'Афиша библиотеки';
    const objCount = canvas.getObjects().length;
    const msg = `✦ Макет Афиши из Aurora Poster Editor ✦\nНазвание: ${title}\nРазмер холста: ${currentSize.w} × ${currentSize.h} pt\nКоличество слоёв: ${objCount}\nДата экспорта: ${new Date().toLocaleString('ru-RU')}`;

    await callFigmaProxy('post_comment', {
      file_key: parsed.fileKey
    }, 'POST', {
      message: msg
    });

    if (statusEl) {
      statusEl.innerHTML = '<span class="figma-status-ok">✓ Комментарий со спецификацией афиши успешно опубликован в файле Figma!</span>';
    }
    toast('Успешно опубликовано в проект Figma по API! 🚀');
  } catch (err) {
    console.error('Figma API export error:', err);
    if (statusEl) {
      statusEl.innerHTML = `<span class="figma-status-err">✗ Ошибка публикации: ${escapeHtml(err.message)}</span>`;
    }
    toast('Ошибка публикации: ' + err.message);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function openFigmaImportModal() {
  const overlay = $('#figma-import-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  const tokenInput = $('#figma-token-input');
  if (tokenInput && !tokenInput.value) {
    tokenInput.value = getStoredFigmaToken();
  }
  if (tokenInput?.value) {
    verifyFigmaTokenQuiet(tokenInput.value);
  }
}

function closeFigmaImportModal() {
  $('#figma-import-modal-overlay')?.classList.add('hidden');
}

function openFigmaExportModal() {
  const overlay = $('#figma-export-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  $('#figma-copy-success')?.classList.add('hidden');
  const exportUrl = $('#figma-export-file-url');
  if (exportUrl && figmaCurrentFileKey && !exportUrl.value) {
    exportUrl.value = figmaCurrentFileKey;
  }
}

function closeFigmaExportModal() {
  $('#figma-export-modal-overlay')?.classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════════
   TILDA EXPORT MODULE — Экспорт для сайта Тильда
   ══════════════════════════════════════════════════════════════ */

function openTildaExportModal() {
  const overlay = $('#tilda-export-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  // Обновляем размер PNG при открытии
  updateTildaPngSizeLabel();
}

function closeTildaExportModal() {
  $('#tilda-export-modal-overlay')?.classList.add('hidden');
}

function switchTildaTab(tabName) {
  $$('.tilda-tab').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.tab === tabName);
  });
  $$('.tilda-tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  $(`#tilda-panel-${tabName}`)?.classList.remove('hidden');
}

function updateTildaPngSizeLabel() {
  if (!canvas) return;
  const scaleInput = document.querySelector('input[name="tilda-png-scale"]:checked');
  const scale = parseFloat(scaleInput?.value || '1');
  const dims = getArtboardDimensions(canvas);
  const w = Math.round(dims.w * scale);
  const h = Math.round(dims.h * scale);
  const label = $('#tilda-png-size-label');
  if (label) label.textContent = `Размер изображения: ${w} × ${h} px`;
}

/**
 * Генерирует HTML-код из холста Fabric.js для Tilda Zero Block.
 * Каждый объект конвертируется в абсолютно позиционированный div.
 */
async function buildTildaHTML() {
  if (!canvas) return '';

  // Сначала встраиваем все изображения как base64
  await embedAllImagesToBase64(canvas);

  const dims = getArtboardDimensions(canvas);
  const w = dims.w;
  const h = dims.h;
  const bg = canvas.__artboardBg || canvas.backgroundColor || '#0f172a';
  const objects = canvas.getObjects();

  // Генерируем HTML для каждого объекта
  const objectsHtml = objects.map(obj => {
    const left  = (obj.left  || 0) - (obj.width  || 0) * ((obj.scaleX || 1)) * (obj.originX === 'center' ? 0.5 : 0);
    const top   = (obj.top   || 0) - (obj.height || 0) * ((obj.scaleY || 1)) * (obj.originY === 'center' ? 0.5 : 0);
    const ow    = (obj.width  || 0) * (obj.scaleX || 1);
    const oh    = (obj.height || 0) * (obj.scaleY || 1);
    const angle = obj.angle || 0;
    const opacity = obj.opacity !== undefined ? obj.opacity : 1;
    const baseStyle = `position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${ow.toFixed(1)}px;height:${oh.toFixed(1)}px;opacity:${opacity};${angle ? `transform:rotate(${angle}deg);transform-origin:center;` : ''}box-sizing:border-box;`;

    if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
      const fs     = (obj.fontSize || 16) * (obj.scaleX || 1);
      const ff     = obj.fontFamily || 'inherit';
      const fw     = obj.fontWeight || 'normal';
      const fi     = obj.fontStyle  || 'normal';
      const fill   = obj.fill || '#ffffff';
      const align  = obj.textAlign || 'left';
      const lh     = (obj.lineHeight || 1.2);
      const cs     = obj.charSpacing ? `letter-spacing:${(obj.charSpacing / 1000).toFixed(3)}em;` : '';
      const bgc    = obj.backgroundColor ? `background-color:${obj.backgroundColor};` : '';
      const padding = obj.padding ? `padding:${obj.padding}px;` : '';
      const shadow = obj.shadow ? (() => {
        const s = obj.shadow;
        return `text-shadow:${s.offsetX||0}px ${s.offsetY||0}px ${s.blur||0}px ${s.color||'transparent'};`;
      })() : '';
      const textHtml = escapeHtml(obj.text || '').replace(/\n/g, '<br>');
      const style = `${baseStyle}font-size:${fs.toFixed(1)}px;font-family:'${ff}',sans-serif;font-weight:${fw};font-style:${fi};color:${fill};text-align:${align};line-height:${lh};${cs}${bgc}${padding}${shadow}overflow:visible;white-space:pre-wrap;word-break:break-word;`;
      return `  <div style="${style}">${textHtml}</div>`;
    }

    if (obj.type === 'rect') {
      const fill   = (!obj.fill || obj.fill === 'transparent' || obj.fill === 'rgba(0,0,0,0)') ? 'transparent' : obj.fill;
      const stroke = obj.stroke ? `border:${obj.strokeWidth||1}px solid ${obj.stroke};` : '';
      const rx     = obj.rx ? `border-radius:${Math.min(obj.rx, ow/2).toFixed(1)}px;` : '';
      const shadow = obj.shadow ? (() => {
        const s = obj.shadow;
        return `box-shadow:${s.offsetX||0}px ${s.offsetY||0}px ${s.blur||0}px ${s.color||'transparent'};`;
      })() : '';
      const style = `${baseStyle}background-color:${fill};${stroke}${rx}${shadow}`;
      return `  <div style="${style}"></div>`;
    }

    if (obj.type === 'circle') {
      const fill   = (!obj.fill || obj.fill === 'transparent') ? 'transparent' : obj.fill;
      const stroke = obj.stroke ? `border:${obj.strokeWidth||1}px solid ${obj.stroke};` : '';
      const shadow = obj.shadow ? (() => {
        const s = obj.shadow;
        return `box-shadow:${s.offsetX||0}px ${s.offsetY||0}px ${s.blur||0}px ${s.color||'transparent'};`;
      })() : '';
      const style = `${baseStyle}background-color:${fill};border-radius:50%;${stroke}${shadow}`;
      return `  <div style="${style}"></div>`;
    }

    if (obj.type === 'image') {
      const el = obj._element;
      const src = el?.src || '';
      if (!src) return '';
      const style = `${baseStyle}object-fit:contain;`;
      return `  <img src="${src}" style="${style}" alt="" loading="lazy">`;
    }

    if (obj.type === 'triangle') {
      const fill = obj.fill || '#ffffff';
      const style = `${baseStyle}width:0;height:0;border-left:${(ow/2).toFixed(1)}px solid transparent;border-right:${(ow/2).toFixed(1)}px solid transparent;border-bottom:${oh.toFixed(1)}px solid ${fill};background:none;`;
      return `  <div style="${style}"></div>`;
    }

    return ''; // Остальные типы пропускаем
  }).filter(Boolean).join('\n');

  // Сборка итогового HTML в формате Tilda Zero Block
  const html = `<!-- Tilda Zero Block — Аврора Редактор Афиш v2.4.0 -->
<!-- Вставьте этот код в Zero Block (T123) на странице Тильды -->
<div class="t-container" style="position:relative;width:100%;max-width:${w}px;height:${h}px;margin:0 auto;background-color:${bg};overflow:hidden;box-sizing:border-box;">
${objectsHtml}
</div>`;

  return html;
}

async function exportTildaGenHtml() {
  const btn = $('#btn-tilda-gen-html');
  if (btn) btn.disabled = true;
  toast('Генерация HTML-кода для Tilda...');
  try {
    const html = await buildTildaHTML();
    const ta = $('#tilda-html-output');
    if (ta) {
      ta.value = html;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
    }
    toast('HTML-код сгенерирован! Нажмите «Копировать» 🔷');
  } catch(err) {
    console.error('Tilda HTML gen error:', err);
    toast('Ошибка генерации: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function exportTildaCopyHtml() {
  const ta = $('#tilda-html-output');
  let html = ta?.value?.trim();
  if (!html) {
    // Генерируем автоматически если поле пустое
    html = await buildTildaHTML();
    if (ta) ta.value = html;
  }
  if (!html) { toast('Сначала нажмите «Сгенерировать»'); return; }

  try {
    await navigator.clipboard.writeText(html);
    const successEl = $('#tilda-copy-success');
    if (successEl) {
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 5000);
    }
    toast('HTML-код скопирован! Вставьте в Zero Block Тильды 🔷');
  } catch(e) {
    toast('Не удалось скопировать автоматически. Выделите код и нажмите Ctrl+C.');
    ta?.select();
  }
}

async function exportTildaDownloadPng() {
  if (!canvas) { toast('Холст не инициализирован'); return; }

  const btn = $('#btn-tilda-download-png');
  if (btn) btn.disabled = true;

  try {
    await embedAllImagesToBase64(canvas);

    const scaleInput = document.querySelector('input[name="tilda-png-scale"]:checked');
    const scale = parseFloat(scaleInput?.value || '1');

    const buffer = renderCleanArtboardCanvas(canvas, scale);
    const dataUrl = buffer.toDataURL('image/png');

    const a = document.createElement('a');
    const safeTitle = ($('#poster-title')?.value || 'Афиша').replace(/[\/\\?%*:|"<>]/g, '_');
    a.download = `${safeTitle}.tilda.png`;
    a.href = dataUrl;
    a.click();

    const dims = getArtboardDimensions(canvas);
    const w = Math.round(dims.w * scale);
    const h = Math.round(dims.h * scale);
    toast(`PNG скачан: ${w}×${h} px — идеально для Tilda 🔷`);
  } catch(err) {
    console.error('Tilda PNG error:', err);
    toast('Ошибка экспорта PNG: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function exportTildaDownloadZip() {
  if (!canvas) { toast('Холст не инициализирован'); return; }

  const btn = $('#btn-tilda-download-zip');
  const statusEl = $('#tilda-zip-status');

  if (!window.JSZip) {
    toast('Библиотека JSZip не загружена. Проверьте подключение к интернету.');
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) { statusEl.textContent = '⏳ Подготовка архива...'; statusEl.classList.remove('hidden', 'is-error'); }

  try {
    await embedAllImagesToBase64(canvas);

    // 1. Генерируем HTML
    const htmlContent = await buildTildaHTML();

    // 2. Генерируем PNG × 2
    const buffer = renderCleanArtboardCanvas(canvas, 2.0);
    const pngDataUrl = buffer.toDataURL('image/png');
    const pngBase64 = pngDataUrl.split(',')[1];

    // 3. CSS для блока
    const dims = getArtboardDimensions(canvas);
    const w = dims.w;
    const h = dims.h;
    const cssContent = `/* Tilda Block — Аврора Редактор Афиш */
.t-container {
  position: relative;
  width: 100%;
  max-width: ${w}px;
  height: ${h}px;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
}
@media (max-width: ${w}px) {
  .t-container {
    height: calc(100vw * ${h} / ${w});
  }
  .t-container > * {
    transform-origin: top left;
    transform: scale(calc(100vw / ${w}));
  }
}`;

    // 4. Полная standalone HTML-страница
    const standalonePage = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Афиша — biblioteka33.ru</title>
<link rel="stylesheet" href="poster.css">
</head>
<body style="margin:0;padding:0;background:#070a1e;display:flex;align-items:center;justify-content:center;min-height:100vh;">
${htmlContent}
</body>
</html>`;

    // 5. Собираем ZIP
    const zip = new JSZip();
    zip.file('index.html', standalonePage);
    zip.file('poster.css',  cssContent);
    zip.file('poster.png',  pngBase64, { base64: true });

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = ($('#poster-title')?.value || 'Афиша').replace(/[\/\\?%*:|"<>]/g, '_');
    a.download = `${safeTitle}.tilda.zip`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);

    if (statusEl) { statusEl.textContent = '✓ ZIP скачан! Разместите файлы и вставьте ссылку в Тильду'; }
    toast('ZIP-архив скачан! 📦 Внутри: index.html + poster.css + poster.png');
  } catch(err) {
    console.error('Tilda ZIP error:', err);
    if (statusEl) { statusEl.textContent = '✗ Ошибка: ' + err.message; statusEl.classList.add('is-error'); }
    toast('Ошибка создания ZIP: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
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
    clearInterval(_autosaveTimer);
    clearTimeout(_debounceSaveTimer);
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

  $('#btn-close-mobile-panel')?.addEventListener('click', () => {
    $('#ed-panel')?.classList.remove('is-mobile-open');
  });

  /* История */
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);

  let _nudgeHistoryTimer = null;

  document.addEventListener('keydown', e => {
    // Не перехватываем Ctrl+Z/Y когда фокус в текстовом поле — там работает нативный undo
    const ae = document.activeElement;
    const inInput = ae && (['INPUT','TEXTAREA','SELECT'].includes(ae.tagName) || ae.isContentEditable);
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'я')) {
      if (inInput) return;
      e.preventDefault(); undo();
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === 'y' || e.key === 'н' || (e.shiftKey && (e.key === 'z' || e.key === 'я')))) {
      if (inInput) return;
      e.preventDefault(); redo();
    }
    // Копирование объекта по Ctrl+C / Cmd+C (английская и русская раскладки)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С')) {
      if (inInput) return;
      const activeObj = canvas?.getActiveObject();
      if (activeObj && !activeObj.isEditing) {
        e.preventDefault();
        copyActiveObject();
      }
    }
    // Вставка объекта по Ctrl+V / Cmd+V (английская и русская раскладки)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М')) {
      if (inInput) return;
      if (_clipboard) {
        e.preventDefault();
        pasteCopiedObject();
      }
    }
    // Пробел для временного панорамирования (Figma-like Pan Mode)
    if ((e.code === 'Space' || e.key === ' ') && !inInput) {
      const activeObj = canvas?.getActiveObject();
      if (!activeObj || !activeObj.isEditing) {
        e.preventDefault();
        if (!isSpacePressed) {
          isSpacePressed = true;
          if (canvas) {
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
            canvas.selection = false;
          }
        }
      }
    }

    if ((e.ctrlKey||e.metaKey) && (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      e.preventDefault();
      duplicateActiveObject();
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
      e.preventDefault();
      printPoster();
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы')) {
      e.preventDefault();
      manualSave();
    }
    if ((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П')) {
      e.preventDefault();
      ungroupSelected();
    } else if ((e.ctrlKey||e.metaKey) && !e.shiftKey && (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П')) {
      e.preventDefault();
      groupSelected();
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === '=' || e.key === '+' || e.key === 'Add')) {
      if (inInput) return;
      e.preventDefault(); applyZoom(zoom + 0.1);
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === '-' || e.key === 'Subtract')) {
      if (inInput) return;
      e.preventDefault(); applyZoom(zoom - 0.1);
    }
    if ((e.ctrlKey||e.metaKey) && (e.key === '0')) {
      if (inInput) return;
      e.preventDefault(); fitZoom();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
      const el = document.activeElement;
      if (el && (['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.isContentEditable)) return;
      const obj = canvas.getActiveObject();
      if (!obj || obj.isEditing) return;
      e.preventDefault();
      if (obj.type === 'activeSelection') {
        obj.getObjects().forEach(o => canvas.remove(o));
        canvas.discardActiveObject();
      } else {
        canvas.remove(obj);
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      clearProps();
      saveHistory();
      updateLayersList();
      scheduleAutosave();
    }

    // ── Горячие клавиши Figma ──
    if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // I / ш -> Пипетка
      if (e.key === 'i' || e.key === 'I' || e.key === 'ш' || e.key === 'Ш') {
        e.preventDefault();
        activateEyedropper();
        return;
      }
      // P / з -> Карандаш
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        e.preventDefault();
        toggleDrawingMode();
        return;
      }
      // V / м -> Выбор (стрелка выделения и перемещения объектов, как в Photoshop/Figma)
      if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
        e.preventDefault();
        activateSelectTool(true);
        return;
      }
      // [ / х -> Слой назад (Send Backwards)
      if (e.key === '[' || e.key === 'х' || e.key === 'Х') {
        const obj = canvas?.getActiveObject();
        if (obj) {
          e.preventDefault();
          layerSendBackwards(obj);
          return;
        }
      }
      // ] / ъ -> Слой вперед (Bring Forward)
      if (e.key === ']' || e.key === 'ъ' || e.key === 'Ъ') {
        const obj = canvas?.getActiveObject();
        if (obj) {
          e.preventDefault();
          layerBringForward(obj);
          return;
        }
      }
    }
    // Shift + H -> Отразить по горизонтали (Flip Horizontal)
    if (!inInput && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'H' || e.key === 'h' || e.key === 'р' || e.key === 'Р')) {
      e.preventDefault();
      flipActiveObject('x');
      return;
    }
    // Shift + V -> Отразить по вертикали (Flip Vertical)
    if (!inInput && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'V' || e.key === 'v' || e.key === 'м' || e.key === 'М')) {
      e.preventDefault();
      flipActiveObject('y');
      return;
    }
    // Ctrl + [ -> На самый задний план
    if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === 'х' || e.key === 'Х')) {
      const obj = canvas?.getActiveObject();
      if (obj) {
        e.preventDefault();
        layerSendToBack(obj);
        return;
      }
    }
    // Ctrl + ] -> На самый передний план
    if ((e.ctrlKey || e.metaKey) && (e.key === ']' || e.key === 'ъ' || e.key === 'Ъ')) {
      const obj = canvas?.getActiveObject();
      if (obj) {
        e.preventDefault();
        layerBringToFront(obj);
        return;
      }
    }
    // ── Клавиатурный Nudge (стрелки: 1px, Shift + стрелки: 10px) как в Figma ──
    if (!inInput && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const activeObj = canvas?.getActiveObject();
      if (activeObj && !activeObj.isEditing) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;

        activeObj.set({
          left: (activeObj.left || 0) + dx,
          top: (activeObj.top || 0) + dy
        });
        activeObj.setCoords();
        canvas.requestRenderAll();
        clearTimeout(_nudgeHistoryTimer);
        _nudgeHistoryTimer = setTimeout(() => {
          saveHistory();
          scheduleAutosave();
        }, 300);
        syncUI();
        return;
      }
    }

    // Escape -> закрытие активных модалок, либо сброс выделения и возврат к стрелке выбора
    if (e.key === 'Escape') {
      if (inInput) return;
      e.preventDefault();

      // 1. Проверяем открытые модальные окна и закрываем верхнее
      const openModals = [
        { id: '#drafts-modal-overlay', close: closeDraftsModal },
        { id: '#ofont-modal-overlay', close: closeOfontModal },
        { id: '#retouch-modal-overlay', close: closeInstagramRetouchModal },
        { id: '#ai-generator-modal-overlay', close: () => { if (typeof window.AuroraAiElements?.closeModal === 'function') window.AuroraAiElements.closeModal(); else $('#ai-generator-modal-overlay')?.classList.add('hidden'); } },
        { id: '#ai-element-modal-overlay', close: closeAiElementModal },
        { id: '#badge-modal-overlay', close: closeBadgeModal },
        { id: '#cosmo-modal-overlay', close: closeCosmoModal },
        { id: '#logo-modal-overlay', close: closeLogoModal },
        { id: '#qrcode-modal-overlay', close: closeQrModal },
        { id: '#hdr-compare-modal-overlay', close: closeHdrCompareModal }
      ];
      for (const m of openModals) {
        const modalEl = $(m.id);
        if (modalEl && !modalEl.classList.contains('hidden')) {
          if (typeof m.close === 'function') m.close();
          return;
        }
      }

      // 2. Сброс выделения на холсте и возврат к инструменту стрелки
      if (canvas?.getActiveObject()) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        clearProps();
      }
      setActiveTool('select', false);
      return;
    }
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ') {
      if (isSpacePressed) {
        isSpacePressed = false;
        if (canvas && !isPanningMode) {
          canvas.defaultCursor = (window.currentTool === 'select') ? 'default' : canvas.defaultCursor;
          canvas.hoverCursor = (window.currentTool === 'select') ? 'move' : canvas.hoverCursor;
          if (window.currentTool === 'select') {
            canvas.selection = true;
          }
        }
      }
    }
  });

  /* Экспорт, проект, черновики и печать */
  $('#btn-save')?.addEventListener('click', manualSave);
  $('#btn-open-drafts')?.addEventListener('click', openDraftsModal);
  $('#btn-tpl-open-drafts')?.addEventListener('click', openDraftsModal);
  $('#btn-tpl-import-project')?.addEventListener('click', () => $('#project-file-input')?.click());
  $('#btn-settings-save-draft')?.addEventListener('click', manualSave);
  $('#btn-settings-open-drafts')?.addEventListener('click', openDraftsModal);
  $('#btn-draft-save-current')?.addEventListener('click', manualSave);
  $('#btn-modal-import-project')?.addEventListener('click', () => $('#project-file-input')?.click());
  $('#btn-modal-export-project')?.addEventListener('click', () => exportProjectJSON());
  $('#drafts-modal-close')?.addEventListener('click', closeDraftsModal);
  $('#btn-drafts-modal-done')?.addEventListener('click', closeDraftsModal);
  $('#drafts-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDraftsModal();
  });

  /* Заголовок афиши: автосохранение при вводе названия */
  $('#poster-title')?.addEventListener('input', () => {
    scheduleAutosave();
  });

  $('#btn-export-png')?.addEventListener('click', exportPng);
  $('#btn-export-jpg')?.addEventListener('click', exportJpg);
  $('#btn-export-pdf')?.addEventListener('click', exportPdf);
  $('#btn-print')?.addEventListener('click', printPoster);
  $('#btn-header-duplicate')?.addEventListener('click', duplicateActiveObject);
  $('#btn-toggle-grid')?.addEventListener('click', toggleGrid);
  $('#btn-toggle-snap')?.addEventListener('click', toggleSnapping);

  /* Экспорт и импорт проекта (.aurora.json) */
  $('#btn-save-project-json')?.addEventListener('click', () => exportProjectJSON());
  $('#btn-load-project-json')?.addEventListener('click', () => $('#project-file-input')?.click());
  $('#btn-settings-save-json')?.addEventListener('click', () => exportProjectJSON());
  $('#btn-settings-load-json')?.addEventListener('click', () => $('#project-file-input')?.click());

  $('#project-file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importProjectJSON(file);
    e.target.value = '';
  });

  /* Жизненный цикл вкладки: сохранение при уходе */
  window.addEventListener('beforeunload', () => {
    if (canvas && canvas.getObjects().length > 0) {
      saveCurrentDraft(false);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && canvas && canvas.getObjects().length > 0) {
      saveCurrentDraft(false);
    }
  });

  /* Группировка и блокировка */
  $('#btn-group')       ?.addEventListener('click', groupSelected);
  $('#btn-header-group')?.addEventListener('click', groupSelected);
  $('#btn-ungroup')       ?.addEventListener('click', ungroupSelected);
  $('#btn-header-ungroup')?.addEventListener('click', ungroupSelected);
  $('#btn-lock-obj')      ?.addEventListener('click', toggleLockObject);

  /* Главный инструмент: Стрелка выделения и перемещения (V, Esc, как в Photoshop/Figma) */
  $('#tool-select')?.addEventListener('click', () => activateSelectTool(true));
  $('#btn-header-select')?.addEventListener('click', () => activateSelectTool(true));
  $('#mtool-select')?.addEventListener('click', () => {
    activateSelectTool(true);
    closeMobileDrawer();
  });
  $('#dock-btn-select')?.addEventListener('click', () => {
    activateSelectTool(true);
    closeMobileDrawer();
  });

  /* Инструменты текста */
  $('#tool-heading')   ?.addEventListener('click', () => addText('Заголовок', { fontSize:48, fontFamily:'Unbounded', fontWeight:'bold' }));
  $('#tool-subheading')?.addEventListener('click', () => addText('Подзаголовок', { fontSize:28, fontFamily:'Montserrat', fontWeight:'600' }));
  $('#tool-text')      ?.addEventListener('click', () => addText('Основной текст объявления или афиши', { fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8' }));
  $('#tool-badge')     ?.addEventListener('click', addBadge);
  $('#tool-date')      ?.addEventListener('click', addDateBlock);
  $('#tool-quote')     ?.addEventListener('click', addQuote);
  /* Figma инструменты */
  $('#tool-pencil')?.addEventListener('click', () => toggleDrawingMode());
  $('#tool-eyedropper')?.addEventListener('click', activateEyedropper);
  $('#tool-transparent-canvas')?.addEventListener('click', toggleCanvasTransparency);
  $('#btn-toggle-canvas-transparency')?.addEventListener('click', toggleCanvasTransparency);

  /* Плавающая панель карандаша */
  $('#pencil-color-picker')?.addEventListener('input', e => {
    _pencilColor = e.target.value;
    if (canvas?.freeDrawingBrush) canvas.freeDrawingBrush.color = _pencilColor;
  });
  $('#pencil-width-slider')?.addEventListener('input', e => {
    _pencilWidth = parseInt(e.target.value, 10) || 4;
    if ($('#pencil-width-val')) $('#pencil-width-val').textContent = _pencilWidth + 'px';
    if (canvas?.freeDrawingBrush) canvas.freeDrawingBrush.width = _pencilWidth;
  });
  $('#btn-pencil-done')?.addEventListener('click', () => toggleDrawingMode(false));

  /* Figma: Режим наложения (Blend mode) */
  $('#blend-mode-select')?.addEventListener('change', e => {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('globalCompositeOperation', e.target.value);
    canvas.requestRenderAll();
    saveHistory();
  });

  /* Figma: Эффекты: Тень (Drop Shadow) */
  $('#btn-toggle-shadow')?.addEventListener('click', toggleLayerShadow);
  $('#shadow-color-picker')?.addEventListener('input', updateActiveObjectShadow);
  $('#shadow-color-picker')?.addEventListener('change', () => saveHistory());
  $('#shadow-opacity-slider')?.addEventListener('input', e => {
    if ($('#shadow-opacity-val')) $('#shadow-opacity-val').textContent = e.target.value;
    updateActiveObjectShadow();
  });
  $('#shadow-opacity-slider')?.addEventListener('change', () => saveHistory());
  $('#shadow-blur-slider')?.addEventListener('input', e => {
    if ($('#shadow-blur-val')) $('#shadow-blur-val').textContent = e.target.value;
    updateActiveObjectShadow();
  });
  $('#shadow-blur-slider')?.addEventListener('change', () => saveHistory());
  $('#shadow-offset-x')?.addEventListener('input', updateActiveObjectShadow);
  $('#shadow-offset-x')?.addEventListener('change', () => saveHistory());
  $('#shadow-offset-y')?.addEventListener('input', updateActiveObjectShadow);
  $('#shadow-offset-y')?.addEventListener('change', () => saveHistory());

  /* Инструменты фигур и разметки */
  $('#tool-rect')   ?.addEventListener('click', addRect);
  $('#tool-circle') ?.addEventListener('click', addCircle);
  $('#tool-line')   ?.addEventListener('click', addLine);
  $('#tool-dashed') ?.addEventListener('click', addDashedLine);
  $('#tool-arrow')  ?.addEventListener('click', addArrow);
  $('#tool-star')   ?.addEventListener('click', addStar);
  $('#tool-frame')  ?.addEventListener('click', addFrame);
  $('#tool-ribbon') ?.addEventListener('click', addRibbon);
  $('#tool-bubble') ?.addEventListener('click', addSpeechBubble);
  $('#tool-hexagon')?.addEventListener('click', addHexagon);

  /* Графика и библиотека */
  $('#tool-ai-element')       ?.addEventListener('click', openAiElementModal);
  $('#btn-open-ai-element')   ?.addEventListener('click', openAiElementModal);
  $('#tool-instagram-retouch')?.addEventListener('click', openInstagramRetouchModal);
  $('#btn-open-instagram-retouch')?.addEventListener('click', openInstagramRetouchModal);
  $('#tool-photo')   ?.addEventListener('click', () => $('#photo-input').click());
  $('#photo-input')  ?.addEventListener('change', e => { const f=e.target.files?.[0]; if(f) addPhoto(f); e.target.value=''; });
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

  /* Масштаб (основной хедер) */
  $('#btn-zoom-in') ?.addEventListener('click', () => applyZoom(zoom + 0.1));
  $('#btn-zoom-out')?.addEventListener('click', () => applyZoom(zoom - 0.1));
  $('#btn-zoom-fit')?.addEventListener('click', fitZoom);
  /* Масштаб (боковая панель — sidebar) */
  $('#btn-zoom-in-sb') ?.addEventListener('click', () => applyZoom(zoom + 0.1));
  $('#btn-zoom-out-sb')?.addEventListener('click', () => applyZoom(zoom - 0.1));
  $('#btn-zoom-fit-sb')?.addEventListener('click', fitZoom);
  /* Flip в секции ротации (rot-chip) */
  $('#btn-flip-x-rot')?.addEventListener('click', () => flipActiveObject('x'));
  $('#btn-flip-y-rot')?.addEventListener('click', () => flipActiveObject('y'));

  /* Панельные табы */
  $$('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.panel-tab').forEach(t => t.classList.remove('is-active'));
      $$('.tab-content').forEach(t => t.classList.add('hidden'));
      tab.classList.add('is-active');
      const targetId = tab.dataset.tab === 'props' ? 'tab-design' : ('tab-' + tab.dataset.tab);
      const targetEl = $('#' + targetId) || $('#tab-' + tab.dataset.tab);
      targetEl?.classList.remove('hidden');
      if (tab.dataset.tab === 'layers') updateLayersList();
    });
  });

  $('#btn-layers-refresh').addEventListener('click', updateLayersList);

  /* ── Figma Inspector: Dimensions (X, Y, W, H, ∠, ⌜) ── */
  $('#dim-x')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    obj.set({ left: parseFloat(e.target.value) || 0 });
    obj.setCoords(); canvas.requestRenderAll();
  });
  $('#dim-x')?.addEventListener('change', () => saveHistory());

  $('#dim-y')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    obj.set({ top: parseFloat(e.target.value) || 0 });
    obj.setCoords(); canvas.requestRenderAll();
  });
  $('#dim-y')?.addEventListener('change', () => saveHistory());

  $('#dim-w')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const val = Math.max(1, parseFloat(e.target.value) || 1);
    obj.scaleToWidth(val);
    obj.setCoords(); canvas.requestRenderAll();
  });
  $('#dim-w')?.addEventListener('change', () => saveHistory());

  $('#dim-h')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const val = Math.max(1, parseFloat(e.target.value) || 1);
    obj.scaleToHeight(val);
    obj.setCoords(); canvas.requestRenderAll();
  });
  $('#dim-h')?.addEventListener('change', () => saveHistory());

  $('#dim-r')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    obj.set({ angle: parseFloat(e.target.value) || 0 });
    obj.setCoords(); canvas.requestRenderAll();
  });
  $('#dim-r')?.addEventListener('change', () => saveHistory());

  $('#dim-radius')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    if (obj.type === 'rect') {
      obj.set({ rx: val, ry: val });
      canvas.requestRenderAll();
    } else if (obj.type === 'image') {
      setImageCornerRadius(obj, val, false);
      const imgSlider = $('#img-corner-radius-slider');
      const imgVal    = $('#img-corner-radius-val');
      if (imgSlider) imgSlider.value = val >= 9999 ? 200 : Math.min(val, 200);
      if (imgVal)    imgVal.textContent = val >= 9999 ? 'Круг' : Math.round(val);
      $$('#img-corner-radius-section .corner-chip').forEach(btn => {
        const chipRad = parseInt(btn.dataset.radius, 10);
        btn.classList.toggle('is-active', (val >= 9999 && chipRad === 9999) || Math.round(val) === chipRad);
      });
    }
  });
  $('#dim-radius')?.addEventListener('change', () => saveHistory());

  $('#fill-hex-input')?.addEventListener('change', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{3,8}$/.test(val)) {
      obj.set({ fill: val });
      if ($('#fill-color-picker')) $('#fill-color-picker').value = val.slice(0, 7);
      if ($('#text-color-picker')) $('#text-color-picker').value = val.slice(0, 7);
      const fillChip = $('#fill-color-chip-preview');
      if (fillChip) fillChip.style.backgroundColor = val;
      canvas.requestRenderAll();
      saveHistory();
    }
  });

  $('#stroke-hex-input')?.addEventListener('change', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{3,8}$/.test(val)) {
      obj.set({ stroke: val });
      if ($('#stroke-color-picker')) $('#stroke-color-picker').value = val.slice(0, 7);
      const strokeChip = $('#stroke-color-chip-preview');
      if (strokeChip) strokeChip.style.backgroundColor = val;
      canvas.requestRenderAll();
      saveHistory();
    }
  });

  $('#dim-stroke-w')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    obj.set({ strokeWidth: val });
    if ($('#stroke-width-slider')) $('#stroke-width-slider').value = val;
    if ($('#stroke-width-val')) $('#stroke-width-val').textContent = val;
    canvas.requestRenderAll();
  });
  $('#dim-stroke-w')?.addEventListener('change', () => saveHistory());

  /* Экспорт: выбор формата и скачивание по кнопке */
  let currentExportFormat = 'png';
  const setExportFormat = (fmt, notify = false) => {
    currentExportFormat = (fmt || 'png').toLowerCase();
    const formatButtons = {
      'png': '#btn-inspector-png',
      'jpg': '#btn-inspector-jpg',
      'webp': '#btn-inspector-webp',
      'pdf': '#btn-inspector-pdf',
      'svg': '#btn-inspector-svg'
    };
    Object.entries(formatButtons).forEach(([key, sel]) => {
      $(sel)?.classList.toggle('is-active', key === currentExportFormat);
    });
    const btnExport = $('#btn-inspector-export-png');
    if (btnExport) {
      const formatLabels = { png: 'PNG', jpg: 'JPG', webp: 'WebP', pdf: 'PDF (Печать)', svg: 'SVG (Вектор)' };
      const lbl = formatLabels[currentExportFormat] || currentExportFormat.toUpperCase();
      const labelEl = $('#inspector-export-label');
      if (labelEl) {
        labelEl.textContent = `Экспорт афиши (${lbl})`;
      } else {
        btnExport.innerHTML = `<span class="material-symbols-rounded">download</span><span id="inspector-export-label">Экспорт афиши (${lbl})</span>`;
      }
    }
    if (notify) {
      toast(`Выбран формат: ${currentExportFormat.toUpperCase()}`);
    }
  };

  const exportBySelectedFormat = async () => {
    switch (currentExportFormat) {
      case 'jpg':
      case 'jpeg':
        await exportJpg();
        break;
      case 'webp':
        await exportWebp();
        break;
      case 'pdf':
        await exportPdf();
        break;
      case 'svg': {
        try {
          await embedAllImagesToBase64(canvas);
          const svgStr = buildFigmaSVG();
          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = ($('#poster-title')?.value || 'poster') + '.svg';
          a.click();
          URL.revokeObjectURL(url);
          toast('✅ Векторный SVG скачан');
        } catch (err) {
          console.error('SVG export error:', err);
          toast('Ошибка экспорта SVG: ' + err.message);
        }
        break;
      }
      case 'png':
      default:
        await exportPng();
        break;
    }
  };

  $('#btn-inspector-export-png')?.addEventListener('click', exportBySelectedFormat);
  $('#btn-inspector-copy-clipboard')?.addEventListener('click', copyCanvasImageToClipboard);
  $('#btn-inspector-png')?.addEventListener('click', () => setExportFormat('png', true));
  $('#btn-inspector-jpg')?.addEventListener('click', () => setExportFormat('jpg', true));
  $('#btn-inspector-webp')?.addEventListener('click', () => setExportFormat('webp', true));
  $('#btn-inspector-pdf')?.addEventListener('click', () => setExportFormat('pdf', true));
  $('#btn-inspector-svg')?.addEventListener('click', () => setExportFormat('svg', true));

  /* Выбор целевого разрешения экспорта (1K, 2K, 4K, 8K) */
  $$('#export-res-group .figma-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setExportResolution(btn.dataset.res || '2k', true);
    });
  });

  $('#chk-export-hdr')?.addEventListener('change', e => {
    setExportHdr(e.target.checked, true);
  });

  /* Вызов модального окна Ultra-HD & HDR Enhancer */
  $('#btn-open-enhancer')?.addEventListener('click', openEnhancerModal);
  $('#btn-image-hdr-enhance')?.addEventListener('click', async () => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image' || !window.PosterEnhancer) {
      toast('Сначала выделите изображение на холсте для HDR улучшения');
      return;
    }
    toast('Применение HDR улучшения к фото…');
    const sharpenOn = $('#img-smart-sharpen')?.checked ?? true;
    await window.PosterEnhancer.enhanceFabricImage(obj, {
      preset: currentHdrPreset || 'cinematic',
      autoBalance: true,
      hdr: { sharpness: sharpenOn ? 0.35 : 0 }
    });
    saveHistory();
    onSelection();
    toast('Фото улучшено в HDR качестве ✨');
  });

  $('#btn-export-compare')?.addEventListener('click', openHdrCompareModal);
  $('#hdr-compare-modal-close')?.addEventListener('click', closeHdrCompareModal);
  $('#hdr-compare-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeHdrCompareModal();
  });
  $('#btn-hdr-modal-export')?.addEventListener('click', async () => {
    closeHdrCompareModal();
    setExportResolution('4k', true);
    await exportPng();
  });

  /* HDR улучшение выделенного изображения */
  const applyPhotoPreset = async (presetKey, title) => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image' || !window.PosterEnhancer) return;
    toast(`Применение: ${title}…`);
    currentHdrPreset = presetKey;
    const sharpenOn = $('#img-smart-sharpen')?.checked ?? true;
    await window.PosterEnhancer.enhanceFabricImage(obj, {
      preset: presetKey,
      autoBalance: true,
      hdr: { sharpness: sharpenOn ? 0.35 : 0 }
    });
    saveHistory();
    onSelection();
    toast(`${title} применён ✨`);
  };

  $('#btn-hdr-cinematic')?.addEventListener('click', () => applyPhotoPreset('cinematic', 'Кинематографичный HDR (ACES)'));
  $('#btn-hdr-vivid')?.addEventListener('click', () => applyPhotoPreset('vivid', 'Максимальный Vivid HDR'));
  $('#btn-hdr-light')?.addEventListener('click', () => applyPhotoPreset('light', 'Легкий HDR'));
  $('#btn-hdr-print')?.addEventListener('click', () => applyPhotoPreset('print', 'Полиграфия 4K'));

  $('#btn-hdr-revert')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image' || !window.PosterEnhancer) return;
    window.PosterEnhancer.restoreOriginalFabricImage(obj);
    saveHistory();
    onSelection();
    toast('Исходное фото восстановлено ↺');
  });

  /* Кнопка «F» в шапке */
  $('#btn-figma-menu')?.addEventListener('click', () => $('#btn-back')?.click());

  /* Вкладка Settings: форматы макета и экспорт JSON */
  function loadBlank(blankKey) {
    if (!blankKey) return;
    const targetId = blankKey.startsWith('blank_') ? blankKey : `blank_${blankKey}`;
    const t = TEMPLATES.find(x => x.id === targetId || x.id === blankKey) || TEMPLATES.find(x => x.id === 'blank_a4_v');
    if (t) loadTemplate(t);
  }

  $$('.figma-settings-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const blankKey = btn.dataset.blank;
      if (blankKey) loadBlank(blankKey);
    });
  });
  $('#btn-settings-save-json')?.addEventListener('click', exportProjectJSON);
  $('#btn-settings-load-json')?.addEventListener('click', () => $('#project-file-input')?.click());

  /* ── Свойства текста ── */
  $('#font-size-slider').addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    $('#font-size-val').textContent = v;
    if (obj) {
      // Сбрасываем scale чтобы fontSize работал предсказуемо
      obj.set({ fontSize: v, scaleX: 1, scaleY: 1 });
      obj.initDimensions?.();
      obj.dirty = true;
      canvas.requestRenderAll();
    }
  });
  $('#font-size-slider').addEventListener('change', () => saveHistory());

  $('#font-family-select').addEventListener('change', e => {
    setFontFamily(e.target.value);
  });

  ['bold','italic','underline'].forEach(style => {
    $('#btn-'+style).addEventListener('click', () => {
      const obj = canvas?.getActiveObject(); if (!obj) return;
      if (style === 'bold') {
        // Нормализуем: fontWeight может быть числом 700/800 или строкой '700'/'bold'
        const w = obj.fontWeight;
        const isBold = w === 'bold' || w === 'Bold' || +w >= 600;
        obj.set('fontWeight', isBold ? 'normal' : 'bold');
        obj.initDimensions?.();
        obj.dirty = true;
        canvas.requestRenderAll();
        syncToggle('btn-bold', !isBold);
      } else if (style === 'italic') {
        obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
        obj.initDimensions?.();
        obj.dirty = true;
        canvas.requestRenderAll();
        syncToggle('btn-italic', obj.fontStyle === 'italic');
      } else if (style === 'underline') {
        obj.set('underline', !obj.underline);
        obj.dirty = true;
        canvas.requestRenderAll();
        syncToggle('btn-underline', obj.underline);
      }
      saveHistory();
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

  /* Обводка / контур текста */
  $('#text-stroke-width-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#text-stroke-width-val');
    if (valEl) valEl.textContent = v;
    $('#text-stroke-color-wrap')?.classList.toggle('hidden', v <= 0);
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set({ strokeWidth: v, stroke: obj.stroke || '#000000' });
      canvas.renderAll();
    }
  });
  $('#text-stroke-width-slider')?.addEventListener('change', () => saveHistory());

  $('#text-stroke-color-picker')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('stroke', e.target.value);
      canvas.renderAll();
    }
  });
  $('#text-stroke-color-picker')?.addEventListener('change', () => saveHistory());

  $('#text-color-picker').addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (obj) { obj.set('fill', e.target.value); canvas.renderAll(); }
  });
  $('#text-color-picker').addEventListener('change', () => saveHistory());

  /* Цветная подложка / плашка текста */
  $('#btn-text-bg-toggle')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || !['textbox','text','i-text'].includes(obj.type)) return;
    const isActive = $('#btn-text-bg-toggle').classList.contains('is-active');
    if (isActive) {
      obj.set('backgroundColor', null);
      $('#btn-text-bg-toggle').classList.remove('is-active');
      $('#text-bg-options')?.classList.add('hidden');
    } else {
      const col = $('#text-bg-color-picker')?.value || '#e11d48';
      const pad = +($('#text-bg-padding-slider')?.value || 8);
      obj.set({ backgroundColor: col, padding: pad });
      $('#btn-text-bg-toggle').classList.add('is-active');
      $('#text-bg-options')?.classList.remove('hidden');
      syncSwatches('#text-bg-color-row', col);
    }
    canvas.renderAll();
    saveHistory();
  });

  $('#text-bg-padding-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const val = +e.target.value;
    const valEl = $('#text-bg-padding-val');
    if (valEl) valEl.textContent = val;
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('padding', val);
      canvas.renderAll();
    }
  });
  $('#text-bg-padding-slider')?.addEventListener('change', () => saveHistory());

  $('#text-bg-color-picker')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const val = e.target.value;
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('backgroundColor', val);
      canvas.renderAll();
      syncSwatches('#text-bg-color-row', val);
    }
  });
  $('#text-bg-color-picker')?.addEventListener('change', () => saveHistory());

  /* Пипетки цвета (EyeDropper) */
  $('#btn-eyedropper-text')?.addEventListener('click', () => pickColorWithEyeDropper('text-fill'));
  $('#btn-eyedropper-text-bg')?.addEventListener('click', () => pickColorWithEyeDropper('text-bg'));
  $('#btn-eyedropper-shape')?.addEventListener('click', () => pickColorWithEyeDropper('shape-fill'));

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

  // ── Универсальный ползунок прозрачности (общая панель, для ВСЕХ объектов) ──
  $('#opacity-slider-common')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); const v = +e.target.value;
    const opCommonVal = $('#opacity-val-common');
    if (opCommonVal) opCommonVal.textContent = v;
    // Синхронизируем и старый слайдер в #props-shape, если он виден
    const opSlider = $('#opacity-slider');
    const opVal    = $('#opacity-val');
    if (opSlider) opSlider.value = v;
    if (opVal)    opVal.textContent = v;
    if (obj) { obj.set('opacity', v / 100); canvas.renderAll(); }
  });
  $('#opacity-slider-common')?.addEventListener('change', () => saveHistory());

  /* ══════════════════════════════════════════════════════
     DRAG-AND-DROP изображений на холст
     Поддержка: файловый менеджер, браузер (drag URL), буфер
     ══════════════════════════════════════════════════════ */
  (function initCanvasDragDrop() {
    const canvasArea = $('#canvas-area');
    const dropOverlay = $('#canvas-drop-overlay');
    if (!canvasArea) return;

    let _dragCounter = 0; // счётчик для вложенных dragenter/dragleave

    /** Проверяем что среди перетаскиваемых данных есть изображение */
    function hasImageData(dt) {
      if (!dt) return false;
      // Из файлового менеджера — files
      if (dt.types && dt.types.includes('Files')) return true;
      // Из браузера — URL или text/html с <img>
      if (dt.types && (dt.types.includes('text/uri-list') || dt.types.includes('text/html'))) return true;
      return false;
    }

    canvasArea.addEventListener('dragenter', e => {
      if (!hasImageData(e.dataTransfer)) return;
      e.preventDefault();
      _dragCounter++;
      canvasArea.classList.add('drag-active');
      dropOverlay?.classList.remove('hidden');
    }, false);

    canvasArea.addEventListener('dragleave', e => {
      _dragCounter--;
      if (_dragCounter <= 0) {
        _dragCounter = 0;
        canvasArea.classList.remove('drag-active');
        dropOverlay?.classList.add('hidden');
      }
    }, false);

    canvasArea.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, false);

    canvasArea.addEventListener('drop', e => {
      e.preventDefault();
      _dragCounter = 0;
      canvasArea.classList.remove('drag-active');
      dropOverlay?.classList.add('hidden');

      const dt = e.dataTransfer;
      if (!dt) return;

      // 1) Файлы из файлового менеджера / браузера (HTML download bar, drag from Desktop)
      if (dt.files && dt.files.length > 0) {
        // Проверяем: перетащен ли файл проекта Aurora (.aurora.json, .json, .aurora)
        const projFile = Array.from(dt.files).find(f => 
          f.name.endsWith('.aurora.json') || f.name.endsWith('.json') || f.name.endsWith('.aurora')
        );
        if (projFile) {
          importProjectJSON(projFile);
          return;
        }

        const imgFiles = Array.from(dt.files).filter(f => f.type.startsWith('image/'));
        if (imgFiles.length > 0) {
          imgFiles.forEach(f => addPhotoAtDropPoint(f, e));
          return;
        }
      }

      // 2) URL-адрес изображения (drag ссылки или img из браузера)
      const uriList = dt.getData('text/uri-list');
      if (uriList) {
        const urls = uriList.split('\n').map(u => u.trim()).filter(u => u && !u.startsWith('#'));
        urls.forEach(url => loadImageFromUrl(url, e));
        return;
      }

      // 3) HTML с тегом <img src="..."> (drag картинки из Google, Wikipedia, etc.)
      const html = dt.getData('text/html');
      if (html) {
        const m = html.match(/src=["']([^"']+)["']/i);
        if (m && m[1]) {
          loadImageFromUrl(m[1], e);
          return;
        }
      }

      toast('Перетащите изображение (PNG, JPG, SVG, WebP)');
    }, false);

    /** Добавить фото с учётом координат точки дропа */
    function addPhotoAtDropPoint(file, dropEvent) {
      if (!canvas) return;
      const reader = new FileReader();
      reader.onload = ev => {
        fabric.Image.fromURL(ev.target.result, img => {
          placeDroppedImage(img, dropEvent);
        });
      };
      reader.readAsDataURL(file);
    }

    /** Загрузить изображение по URL (через proxy если нужно) */
    function loadImageFromUrl(url, dropEvent) {
      if (!canvas || !url) return;

      // data: URL — загружаем напрямую
      if (url.startsWith('data:')) {
        fabric.Image.fromURL(url, img => {
          placeDroppedImage(img, dropEvent);
        });
        return;
      }

      // Внешний URL — пробуем с crossOrigin anonymous, при ошибке — через allorigins proxy
      fabric.Image.fromURL(url, img => {
        if (img && img.width) {
          placeDroppedImage(img, dropEvent);
        } else {
          // Primary fallback: ai_proxy.php, secondary: allorigins proxy
          const proxyUrl = 'ai_proxy.php?action=image_proxy&url=' + encodeURIComponent(url);
          fabric.Image.fromURL(proxyUrl, imgProxy => {
            if (imgProxy && imgProxy.width) {
              placeDroppedImage(imgProxy, dropEvent);
            } else {
              const extProxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
              fabric.Image.fromURL(extProxy, imgExt => {
                if (imgExt && imgExt.width) {
                  placeDroppedImage(imgExt, dropEvent);
                } else {
                  toast('⚠️ Не удалось загрузить изображение по URL (CORS ограничение)');
                }
              }, { crossOrigin: 'anonymous' });
            }
          }, { crossOrigin: 'anonymous' });
        }
      }, { crossOrigin: 'anonymous' });
    }

    /** Разместить изображение на холсте в точке дропа */
    function placeDroppedImage(img, dropEvent) {
      if (!img || !canvas) return;

      // Масштабируем если изображение слишком большое
      const maxW = currentSize.w * 0.7;
      const maxH = currentSize.h * 0.7;
      if (img.width > maxW)             img.scaleToWidth(maxW);
      if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);

      // Вычисляем позицию в системе координат холста относительно точки дропа
      let left = (currentSize.w - img.getScaledWidth()) / 2;
      let top  = (currentSize.h - img.getScaledHeight()) / 2;

      if (dropEvent) {
        try {
          const canvasEl = canvas.getElement();
          const rect = canvasEl.getBoundingClientRect();
          const zoom = canvas.getZoom() || 1;
          const vpt = canvas.viewportTransform || [1,0,0,1,0,0];
          const rawX = (dropEvent.clientX - rect.left - vpt[4]) / zoom;
          const rawY = (dropEvent.clientY - rect.top  - vpt[5]) / zoom;
          left = Math.max(0, rawX - img.getScaledWidth()  / 2);
          top  = Math.max(0, rawY - img.getScaledHeight() / 2);
        } catch(_) { /* fallback to center */ }
      }

      img.set({
        left,
        top,
        selectable: true,
        layerName: 'Фото (drag&drop)',
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveHistory();
      updateLayersList();
      toast('🖼️ Изображение добавлено на холст');
    }
  })();

  /* ══════════════════════════════════════════════════════
     PASTE изображений и скриншотов из буфера обмена (Ctrl+V)
     ══════════════════════════════════════════════════════ */
  document.addEventListener('paste', e => {
    // Пропускаем, если фокус внутри текстового поля (нативная вставка текста) и в буфере нет файлов
    const tgt = document.activeElement;
    const isTextInput = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
    const hasFiles = e.clipboardData?.files?.length > 0;
    if (isTextInput && !hasFiles) return;
    if (canvas && canvas.isEditing && !hasFiles) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let foundImage = false;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        foundImage = true;
        const file = item.getAsFile();
        if (!file) continue;

        e.preventDefault();

        // Если экран шаблонов активен или холст ещё не готов — открываем чистый лист
        const screenTpl = $('#screen-templates');
        if ((screenTpl && !screenTpl.classList.contains('hidden')) || !canvas) {
          const defaultTpl = TEMPLATES.find(x => x.id === 'blank_a4_v') || { id: 'blank_a4_v', name: 'Новая афиша (скриншот)', size: 'a4_v', bg: '#ffffff', objects: [] };
          loadTemplate(defaultTpl);
        }

        const reader = new FileReader();
        reader.onload = ev => {
          fabric.Image.fromURL(ev.target.result, img => {
            if (!canvas) return;
            const maxW = (currentSize?.w || 595) * 0.85;
            const maxH = (currentSize?.h || 842) * 0.85;
            if (img.width > maxW)             img.scaleToWidth(maxW);
            if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);
            img.set({
              left: ((currentSize?.w || 595) - img.getScaledWidth())  / 2,
              top:  ((currentSize?.h || 842) - img.getScaledHeight()) / 2,
              selectable: true,
              layerName: 'Скриншот / Фото (Ctrl+V)',
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            saveHistory();
            updateLayersList();
            toast('📋 Скриншот успешно вставлен на холст (Ctrl+V)! 🚀');
          }, { crossOrigin: 'anonymous' });
        };
        reader.readAsDataURL(file);
        break; // берём первое изображение
      }
    }
  });

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

  /* ── Скругление углов изображения (Corner Radius) ── */
  $('#img-corner-radius-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image') return;
    const v = parseInt(e.target.value, 10) || 0;
    const valEl = $('#img-corner-radius-val');
    if (valEl) valEl.textContent = v;
    setImageCornerRadius(obj, v, false);
    // Синхронизировать инпут #dim-radius
    const drad = $('#dim-radius');
    if (drad) drad.value = v;
    $$('#img-corner-radius-section .corner-chip').forEach(btn => {
      const chipRad = parseInt(btn.dataset.radius, 10);
      btn.classList.toggle('is-active', chipRad === v);
    });
  });
  $('#img-corner-radius-slider')?.addEventListener('change', () => saveHistory());

  $$('#img-corner-radius-section .corner-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const obj = canvas?.getActiveObject();
      if (!obj || obj.type !== 'image') return;
      const rad = parseInt(btn.dataset.radius, 10) || 0;
      const slider = $('#img-corner-radius-slider');
      const valEl  = $('#img-corner-radius-val');
      if (slider) slider.value = rad >= 9999 ? 200 : rad;
      if (valEl)  valEl.textContent = rad >= 9999 ? 'Круг' : rad;
      const drad = $('#dim-radius');
      if (drad) drad.value = rad;
      setImageCornerRadius(obj, rad, false);
      saveHistory();
      $$('#img-corner-radius-section .corner-chip').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  /* ── Центрирование и вписывание объекта в холст ── */
  $('#btn-fit-canvas-bounds')?.addEventListener('click', fitActiveObjectToCanvas);

  /* ── Фильтры изображения ── */
  $('#img-brightness-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#img-brightness-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.type === 'image') {
      applyImageFilter(obj, 'Brightness', { brightness: v });
    }
  });
  $('#img-brightness-slider')?.addEventListener('change', () => saveHistory());

  $('#img-contrast-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#img-contrast-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.type === 'image') {
      applyImageFilter(obj, 'Contrast', { contrast: v });
    }
  });
  $('#img-contrast-slider')?.addEventListener('change', () => saveHistory());

  $('#img-blur-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject();
    const v = +e.target.value;
    const valEl = $('#img-blur-val');
    if (valEl) valEl.textContent = v;
    if (obj && obj.type === 'image') {
      applyImageFilter(obj, 'Blur', { blur: v });
    }
  });
  $('#img-blur-slider')?.addEventListener('change', () => saveHistory());

  $('#btn-filter-grayscale')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image') return;
    const cur = !obj.__filterValues?.grayscale;
    applyImageFilter(obj, 'Grayscale', { enabled: cur });
    syncToggle('btn-filter-grayscale', cur);
    saveHistory();
  });

  $('#btn-filter-sepia')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image') return;
    const cur = !obj.__filterValues?.sepia;
    applyImageFilter(obj, 'Sepia', { enabled: cur });
    syncToggle('btn-filter-sepia', cur);
    saveHistory();
  });

  $('#btn-reset-filters')?.addEventListener('click', resetImageFilters);

  /* ── Удаление фона, волшебная палочка и ластик ── */
  $('#btn-bg-remove-auto')?.addEventListener('click', () => {
    const tol = parseInt($('#bg-tolerance-slider')?.value || 28);
    const fth = parseInt($('#bg-feather-slider')?.value   || 2);
    removeImageBackground(tol, fth);
  });
  $('#btn-bg-magic-wand')?.addEventListener('click', toggleMagicWandMode);
  $('#btn-bg-eraser')    ?.addEventListener('click', toggleEraserMode);
  $('#btn-split-layers') ?.addEventListener('click', separateImageIntoLayers);
  $('#btn-bg-revert')    ?.addEventListener('click', revertBackground);

  // Режимы и ползунки ластика
  $('#btn-eraser-mode-erase')?.addEventListener('click', () => setEraserSubMode('erase'));
  $('#btn-eraser-mode-restore')?.addEventListener('click', () => setEraserSubMode('restore'));
  $('#eraser-size-slider')?.addEventListener('input', e => setEraserSize(e.target.value));
  $('#eraser-hardness-slider')?.addEventListener('input', e => setEraserHardness(e.target.value));
  $$('.eraser-size-chip').forEach(chip => {
    chip.addEventListener('click', () => setEraserSize(chip.dataset.size));
  });

  // Зум холста по Ctrl + колесо мыши и отслеживание курсора ластика
  const canvasArea = $('#canvas-area');
  if (canvasArea) {
    canvasArea.addEventListener('wheel', e => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = canvasArea.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        const mouseX = clientX - rect.left + canvasArea.scrollLeft;
        const mouseY = clientY - rect.top  + canvasArea.scrollTop;

        const prevZoom = (typeof zoom !== 'undefined' ? zoom : 1);
        const zoomFactor = e.deltaY < 0 ? 1.08 : (1 / 1.08);
        const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.08), 5.0);

        if (Math.abs(newZoom - prevZoom) < 0.0005) return;

        applyZoom(newZoom);

        const ratio = newZoom / prevZoom;
        canvasArea.scrollLeft = (mouseX * ratio) - (clientX - rect.left);
        canvasArea.scrollTop  = (mouseY * ratio) - (clientY - rect.top);
      }
    }, { passive: false });

    canvasArea.addEventListener('mousemove', e => {
      const ring = $('#eraser-cursor-ring');
      if (ring && typeof _eraserMode !== 'undefined' && _eraserMode) {
        ring.style.left = e.clientX + 'px';
        ring.style.top  = e.clientY + 'px';
        const obj = canvas?.getActiveObject();
        const scale = obj ? (obj.scaleX || 1) : 1;
        const curZoom = (typeof zoom !== 'undefined' ? zoom : 1);
        const displayDiam = Math.max(10, _eraserSize * scale * curZoom);
        ring.style.width  = displayDiam + 'px';
        ring.style.height = displayDiam + 'px';
        ring.classList.add('is-visible');
      }
    });

    canvasArea.addEventListener('mouseleave', () => {
      const ring = $('#eraser-cursor-ring');
      if (ring) ring.classList.remove('is-visible');
    });

    canvasArea.addEventListener('mouseenter', () => {
      const ring = $('#eraser-cursor-ring');
      if (ring && typeof _eraserMode !== 'undefined' && _eraserMode) {
        ring.classList.add('is-visible');
      }
    });
  }

  // Синхронизация слайдеров bg-remove
  $('#bg-tolerance-slider')?.addEventListener('input', e => {
    const v = $('#bg-tolerance-val'); if (v) v.textContent = e.target.value;
  });
  $('#bg-feather-slider')?.addEventListener('input', e => {
    const v = $('#bg-feather-val'); if (v) v.textContent = e.target.value;
  });

  /* ── Ползунок поворота и быстрые углы ── */
  $('#dim-r-slider')?.addEventListener('input', e => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const angle = +e.target.value;
    obj.set('angle', angle);
    obj.setCoords();
    canvas.renderAll();
    const dr = $('#dim-r'); if (dr) dr.value = angle;
    const dv = $('#dim-r-val'); if (dv) dv.textContent = angle;
    $$('.rot-chip').forEach(chip =>
      chip.classList.toggle('is-active', chip.dataset.angle && +chip.dataset.angle === angle)
    );
  });
  $('#dim-r-slider')?.addEventListener('change', () => saveHistory());

  $$('.rot-chip').forEach(chip => {
    if (!chip.dataset.angle) return;
    chip.addEventListener('click', () => {
      const obj = canvas?.getActiveObject(); if (!obj) return;
      const angle = +chip.dataset.angle;
      obj.set('angle', angle);
      obj.setCoords();
      canvas.renderAll();
      updateFigmaDimensionsUI(obj);
      saveHistory();
    });
  });

  $('#btn-rot-plus-90')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    const angle = ((Math.round(obj.angle || 0) + 90) % 360 + 360) % 360;
    obj.set('angle', angle);
    obj.setCoords();
    canvas.renderAll();
    updateFigmaDimensionsUI(obj);
    saveHistory();
  });

  /* ── Диалог импорта фото ── */
  const handleImportSingle = () => {
    const f = _pendingPhotoFile;
    closePhotoImportModal();
    if (f) addPhoto(f);
  };
  const handleImportSplit = () => {
    const f = _pendingPhotoFile;
    closePhotoImportModal();
    if (!f) return;
    // Сначала добавляем фото, затем разделяем
    const reader = new FileReader();
    reader.onload = ev => {
      fabric.Image.fromURL(ev.target.result, img => {
        const maxW = currentSize.w * 0.7, maxH = currentSize.h * 0.7;
        if (img.width > maxW) img.scaleToWidth(maxW);
        if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);
        img.set({ left:(currentSize.w-img.getScaledWidth())/2, top:(currentSize.h-img.getScaledHeight())/2,
          selectable:true, layerName:'Фото' });
        canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
        saveHistory();
        updateLayersList();
        toast('Фото добавлено, разделяем на слои…');
        setTimeout(() => separateImageIntoLayers(), 300);
      });
    };
    reader.readAsDataURL(f);
  };
  $('#photo-import-modal-close')?.addEventListener('click', closePhotoImportModal);
  $('#import-dialog-close')?.addEventListener('click', closePhotoImportModal);
  $('#photo-import-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closePhotoImportModal();
  });
  $('#import-layer-dialog')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closePhotoImportModal();
  });
  $('#btn-import-single')?.addEventListener('click', handleImportSingle);
  $('#btn-import-single-layer')?.addEventListener('click', handleImportSingle);
  $('#btn-import-split')?.addEventListener('click', handleImportSplit);
  $('#btn-import-split-layers')?.addEventListener('click', handleImportSplit);

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

  $('#btn-copy')?.addEventListener('click', copyActiveObject);
  $('#btn-paste')?.addEventListener('click', pasteCopiedObject);
  $('#btn-header-copy')?.addEventListener('click', copyActiveObject);
  $('#btn-header-paste')?.addEventListener('click', pasteCopiedObject);
  $('#btn-duplicate')?.addEventListener('click', duplicateActiveObject);
  $$('#btn-flip-x').forEach(el => el.addEventListener('click', () => flipActiveObject('x')));
  $$('#btn-flip-y').forEach(el => el.addEventListener('click', () => flipActiveObject('y')));

  $('#btn-bring-front')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (obj) layerBringToFront(obj);
  });
  $('#btn-send-back')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject();
    if (obj) layerSendToBack(obj);
  });
  $('#btn-delete-obj')?.addEventListener('click', () => {
    const obj = canvas?.getActiveObject(); if (!obj) return;
    if (!confirm('Удалить этот объект?')) return;
    if (obj.type === 'activeSelection') {
      obj.getObjects().forEach(o => canvas.remove(o));
      canvas.discardActiveObject();
    } else {
      canvas.remove(obj);
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    clearProps();
    saveHistory();
    updateLayersList();
  });

  /* Модалка шрифтов ofont.ru */
  $('#btn-open-ofont-modal')?.addEventListener('click', openOfontModal);
  $('#btn-ofont-shortcut')  ?.addEventListener('click', openOfontModal);
  $('#ofont-modal-close')   ?.addEventListener('click', closeOfontModal);
  $('#ofont-modal-overlay') ?.addEventListener('click', e => { if (e.target === e.currentTarget) closeOfontModal(); });

  const ofontDrop = $('#ofont-dropzone');
  if (ofontDrop) {
    ofontDrop.addEventListener('click', () => $('#ofont-file-input')?.click());
    ofontDrop.addEventListener('dragover', e => {
      e.preventDefault();
      ofontDrop.classList.add('drag-over');
    });
    ofontDrop.addEventListener('dragleave', () => ofontDrop.classList.remove('drag-over'));
    ofontDrop.addEventListener('drop', e => {
      e.preventDefault();
      ofontDrop.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFontFileSelect(file);
    });
  }

  $('#ofont-file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) handleFontFileSelect(file);
    e.target.value = '';
  });

  $('#btn-ofont-apply-font')?.addEventListener('click', applyPendingFont);

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

  /* ── Figma API Интеграция (Импорт и Экспорт) ── */
  $('#btn-tpl-figma-import')    ?.addEventListener('click', openFigmaImportModal);
  $('#btn-figma-import')        ?.addEventListener('click', openFigmaImportModal);
  $('#tool-figma-import')       ?.addEventListener('click', openFigmaImportModal);
  $('#figma-import-modal-close')?.addEventListener('click', closeFigmaImportModal);
  $('#figma-import-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeFigmaImportModal();
  });

  $('#btn-figma-paste-url')?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const input = $('#figma-file-url');
        if (input && text) {
          input.value = text.trim();
          toast('Ссылка вставлена из буфера');
        }
      }
    } catch (e) {
      toast('Нажмите Ctrl+V в поле ввода');
    }
  });

  $('#btn-figma-token-toggle')?.addEventListener('click', () => {
    const inp = $('#figma-token-input');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  $('#btn-figma-token-help')?.addEventListener('click', () => {
    $('#figma-token-guide')?.classList.toggle('hidden');
  });

  $('#figma-token-input')?.addEventListener('change', e => {
    const t = e.target.value.trim();
    if ($('#figma-save-token')?.checked) {
      setStoredFigmaToken(t, true);
    }
    verifyFigmaTokenQuiet(t);
  });

  $('#btn-figma-fetch')?.addEventListener('click', fetchFigmaDocument);
  $('#btn-figma-do-import')?.addEventListener('click', doImportFigmaFrame);

  $('#btn-figma-export')        ?.addEventListener('click', openFigmaExportModal);
  $('#tool-figma-export')       ?.addEventListener('click', openFigmaExportModal);
  $('#figma-export-modal-close')?.addEventListener('click', closeFigmaExportModal);
  $('#figma-export-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeFigmaExportModal();
  });

  $('#btn-figma-copy-clipboard')?.addEventListener('click', exportFigmaClipboard);
  $('#btn-figma-download-svg')  ?.addEventListener('click', exportFigmaSvg);
  $('#btn-figma-api-send')      ?.addEventListener('click', exportFigmaApiSend);
  $('#btn-figma-download-json')  ?.addEventListener('click', exportProjectJSON);

  /* ── Tilda Экспорт ── */
  $('#btn-tilda-export')           ?.addEventListener('click', openTildaExportModal);
  $('#tool-tilda-export')          ?.addEventListener('click', openTildaExportModal);
  $('#tilda-export-modal-close')   ?.addEventListener('click', closeTildaExportModal);
  $('#tilda-export-modal-overlay') ?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTildaExportModal();
  });
  // Вкладки
  $$('.tilda-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTildaTab(btn.dataset.tab));
  });
  // HTML-вкладка
  $('#btn-tilda-gen-html')  ?.addEventListener('click', exportTildaGenHtml);
  $('#btn-tilda-copy-html') ?.addEventListener('click', exportTildaCopyHtml);
  // PNG-вкладка
  $('#btn-tilda-download-png')?.addEventListener('click', exportTildaDownloadPng);
  $$('input[name="tilda-png-scale"]').forEach(r => r.addEventListener('change', updateTildaPngSizeLabel));
  // ZIP-вкладка
  $('#btn-tilda-download-zip')?.addEventListener('click', exportTildaDownloadZip);

  /* ── Мобильный навигационный док и шторка (Drawer) ── */
  $('#dock-btn-bg')    ?.addEventListener('click', () => openMobileDrawer('bg'));
  $('#dock-btn-text')  ?.addEventListener('click', () => openMobileDrawer('text'));
  $('#dock-btn-shapes')?.addEventListener('click', () => openMobileDrawer('shapes'));
  $('#dock-btn-media') ?.addEventListener('click', () => openMobileDrawer('media'));
  $('#dock-btn-props') ?.addEventListener('click', () => {
    closeMobileDrawer();
    $('#ed-panel')?.classList.toggle('is-mobile-open');
  });

  $('#btn-close-mobile-drawer')?.addEventListener('click', closeMobileDrawer);
  $('#mobile-drawer-backdrop') ?.addEventListener('click', closeMobileDrawer);

  /* Мобильные карточки текста */
  $('#mtool-heading')   ?.addEventListener('click', () => { addText('Заголовок', { fontSize:48, fontFamily:'Unbounded', fontWeight:'bold' }); closeMobileDrawer(); });
  $('#mtool-subheading')?.addEventListener('click', () => { addText('Подзаголовок', { fontSize:28, fontFamily:'Montserrat', fontWeight:'600' }); closeMobileDrawer(); });
  $('#mtool-text')      ?.addEventListener('click', () => { addText('Основной текст объявления или афиши', { fontSize:20, fontFamily:'Montserrat', fill:'#94a3b8' }); closeMobileDrawer(); });
  $('#mtool-badge')     ?.addEventListener('click', () => { addBadge(); closeMobileDrawer(); });
  $('#mtool-date')      ?.addEventListener('click', () => { addDateBlock(); closeMobileDrawer(); });
  $('#mtool-quote')     ?.addEventListener('click', () => { addQuote(); closeMobileDrawer(); });
  $('#mtool-ofont')     ?.addEventListener('click', () => { closeMobileDrawer(); openOfontModal(); });

  /* Мобильные карточки фигур */
  $('#mtool-rect')   ?.addEventListener('click', () => { addRect(); closeMobileDrawer(); });
  $('#mtool-circle') ?.addEventListener('click', () => { addCircle(); closeMobileDrawer(); });
  $('#mtool-line')   ?.addEventListener('click', () => { addLine(); closeMobileDrawer(); });
  $('#mtool-dashed') ?.addEventListener('click', () => { addDashedLine(); closeMobileDrawer(); });
  $('#mtool-arrow')  ?.addEventListener('click', () => { addArrow(); closeMobileDrawer(); });
  $('#mtool-star')   ?.addEventListener('click', () => { addStar(); closeMobileDrawer(); });
  $('#mtool-frame')  ?.addEventListener('click', () => { addFrame(); closeMobileDrawer(); });
  $('#mtool-ribbon') ?.addEventListener('click', () => { addRibbon(); closeMobileDrawer(); });
  $('#mtool-bubble') ?.addEventListener('click', () => { addSpeechBubble(); closeMobileDrawer(); });
  $('#mtool-hexagon')?.addEventListener('click', () => { addHexagon(); closeMobileDrawer(); });

  /* Мобильные карточки медиа */
  $('#mtool-ai-element')       ?.addEventListener('click', () => { closeMobileDrawer(); openAiElementModal(); });
  $('#mtool-instagram-retouch')?.addEventListener('click', () => { closeMobileDrawer(); openInstagramRetouchModal(); });
  $('#mtool-photo')   ?.addEventListener('click', () => { closeMobileDrawer(); $('#photo-input')?.click(); });
  $('#mtool-cosmo')   ?.addEventListener('click', () => { closeMobileDrawer(); openCosmoModal(); });
  $('#mtool-logo')    ?.addEventListener('click', () => { closeMobileDrawer(); openLogoModal(); });
  $('#mtool-stickers')?.addEventListener('click', () => { closeMobileDrawer(); openBadgeModal(); });
  $('#mtool-qrcode')  ?.addEventListener('click', () => { closeMobileDrawer(); openQrModal(); });
  $('#mtool-figma-import')?.addEventListener('click', () => { closeMobileDrawer(); openFigmaImportModal(); });
  $('#mtool-figma-export')?.addEventListener('click', () => { closeMobileDrawer(); openFigmaExportModal(); });
  $('#mtool-tilda-export')?.addEventListener('click', () => { closeMobileDrawer(); openTildaExportModal(); });

  /* Resize */
  window.addEventListener('resize', () => {
    fitZoom();
    if (!$('#enhancer-modal-overlay')?.classList.contains('hidden')) {
      debounceEnhancerPreview();
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   ПРОВЕРКА ИМПОРТА АФИШИ ИЗ ЛИТЕРАТУРНОГО ХРОНОГРАФА
   ══════════════════════════════════════════════════════════════ */
function checkChronographPosterImport() {
  let importedTpl = null;

  // 1. Проверяем локальное хранилище aurora_chrono_poster_import
  try {
    const raw = localStorage.getItem('aurora_chrono_poster_import');
    if (raw) {
      importedTpl = JSON.parse(raw);
      localStorage.removeItem('aurora_chrono_poster_import');
    }
  } catch (err) {
    console.error('Ошибка разбора aurora_chrono_poster_import:', err);
  }

  // 2. Если в localStorage нет, проверяем параметры адресной строки ?from=chronograph&id=...
  if (!importedTpl) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('from') === 'chronograph' || urlParams.get('chrono_id') || urlParams.get('id')) {
        const targetId = urlParams.get('id') || urlParams.get('chrono_id');
        const sizeKey = urlParams.get('size') || 'a4_v';
        const ideaIdx = Number(urlParams.get('idea') || 0);

        const allDates = window.CHRONOGRAPH_DATES || window.CHRONOGRAPH_DATA || [];
        const list = Array.isArray(allDates) ? allDates : (allDates.items || []);
        const item = list.find(d => 
          String(d.id) === String(targetId) ||
          String(d.id).includes(String(targetId)) ||
          (d.title && d.title.toLowerCase().includes(String(targetId).toLowerCase())) ||
          (d.name && d.name.toLowerCase().includes(String(targetId).toLowerCase()))
        );

        if (item && typeof window.buildChronographPosterTemplate === 'function') {
          importedTpl = window.buildChronographPosterTemplate(item, 2026, sizeKey, ideaIdx);
        }
      }
    } catch (err) {
      console.error('Ошибка разбора параметров URL хронографа:', err);
    }
  }

  // 3. Если макет получен — открываем холст и сохраняем черновик
  if (importedTpl && importedTpl.objects) {
    setTimeout(() => {
      loadTemplate(importedTpl);
      if ($('#poster-title')) {
        $('#poster-title').value = importedTpl.name || 'Афиша Литературного хронографа';
      }
      setTimeout(() => {
        saveCurrentDraft(false);
      }, 300);
      toast('🎨 Афиша «' + (importedTpl.name || 'выставки') + '» загружена из Хронографа!');
    }, 120);
    return true;
  }

  return false;
}

/* ══════════════════════════════════════════════════════════════
   СТАРТ
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  buildFontSelect();
  buildTemplates();
  buildBadgeGrid();
  buildLogos();
  buildCosmoGrid();
  buildBgPalette();
  buildColorRows();
  bindEvents();
  initAiElementModal();
  initInstagramRetouchModal();

  // Глобальные экспорты для внешних скриптов и тулбаров
  window.TEMPLATES = TEMPLATES;
  window.loadTemplate = loadTemplate;
  window.openAiElementModal = openAiElementModal;
  if (!window.openAiGeneratorModal) {
    window.openAiGeneratorModal = openAiElementModal;
  }
  window.openInstagramRetouchModal = openInstagramRetouchModal;
  if (!window.openRetouchModal) {
    window.openRetouchModal = openInstagramRetouchModal;
  }
  window.addAiElement = addAiElement;
  window.addAiPhotoElement = addAiPhotoElement;
  window.setImageCornerRadius = setImageCornerRadius;
  window.setActiveTool = setActiveTool;
  window.activateSelectTool = activateSelectTool;
  window.getArtboardDimensions = getArtboardDimensions;
  window.exportWebp = exportWebp;
  window.copyCanvasImageToClipboard = copyCanvasImageToClipboard;

  // Инициализация хранилища черновиков и проектов (IndexedDB + кэш)
  await initDraftsStorage();

  // Подключение сохранённых шрифтов ofont.ru из IndexedDB
  await loadSavedFonts();

  // Автоматическая загрузка макета, если переход выполнен из Хронографа
  const importedFromChronograph = checkChronographPosterImport();

  if (!importedFromChronograph && !loadDraft()) {
    toast('Выберите шаблон для начала работы');
  }
});
