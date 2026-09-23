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

  /* 14. ЧИСТЫЙ ЛИСТ A4 ГОРИЗОНТАЛЬ */
  {
    id: 'blank_a4_h',
    size: 'a4_h',
    category: 'blank',
    name: 'Чистый лист A4 горизонт',
    desc: 'Горизонтальный формат 842 × 595 pt',
    fmt: 'A4',
    isLandscape: true,
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">A4 горизонт</span>
      </div>`,
    objects: [],
  },

  /* 15. ЧИСТЫЙ ЛИСТ КВАДРАТ (ВК) */
  {
    id: 'blank_square',
    size: 'square',
    category: 'blank',
    name: 'Чистый лист Квадрат (ВК)',
    desc: 'Формат 1:1 для постов ВКонтакте 700 × 700 pt',
    fmt: 'ВК 1:1',
    isSquare: true,
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">1:1 (ВК)</span>
      </div>`,
    objects: [],
  },

  /* 16. ЧИСТЫЙ ЛИСТ БАННЕР 16:9 */
  {
    id: 'blank_banner',
    size: 'banner',
    category: 'blank',
    name: 'Чистый лист Баннер 16:9',
    desc: 'Горизонтальный экранный баннер 960 × 540 pt',
    fmt: '16:9',
    isLandscape: true,
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
        <span style="font-size:6px; color:#94a3b8;">16:9</span>
      </div>`,
    objects: [],
  },

  /* 17. ЧИСТЫЙ ЛИСТ СТОРИС 9:16 */
  {
    id: 'blank_story',
    size: 'story',
    category: 'blank',
    name: 'Чистый лист Сторис 9:16',
    desc: 'Вертикальный формат для сторис ВК 540 × 960 pt',
    fmt: '9:16',
    bg: '#ffffff',
    previewBg: '#1e293b',
    previewAccent: '#38BDF8',
    previewHtml: `
      <div class="mp-blank">
        <span class="material-symbols-rounded" style="font-size:22px; color:#38BDF8; opacity:0.8;">add_circle_outline</span>
        <span style="font-size:7.5px; font-weight:700; color:#38BDF8; margin-top:3px;">ЧИСТЫЙ ЛИСТ</span>
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
    for (const item of saved) {
      try {
        await registerFontFace(item.name, item.buffer);
        customFonts.push(item);
      } catch (e) {
        console.warn('Не удалось загрузить шрифт:', item.name, e);
      }
    }
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
        <div class="ofont-item-name" style="font-family:'${f.name}',sans-serif;">${f.name}</div>
        <div class="ofont-item-meta">${f.fileName || 'шрифт ofont.ru'} · Пример: Библиотека Аврора 2025</div>
      </div>
      <div class="ofont-item-actions">
        <button class="pbtn pbtn-sm pbtn-primary ofont-apply-btn" data-font="${f.name}">Применить</button>
        <button class="pbtn pbtn-sm pbtn-danger ofont-del-btn" data-font="${f.name}" title="Удалить шрифт">✕</button>
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
  const mEl = $('#mobile-bg-palette');
  const swatchesHtml = PALETTE.map(p => `
    <button class="bg-swatch" data-color="${p.hex}" title="${p.name}"
      style="background:${p.hex}; ${p.light ? 'border-color:rgba(0,0,0,0.15);' : ''}">
    </button>
  `).join('');

  if (el) {
    el.innerHTML = swatchesHtml;
    el.addEventListener('click', e => {
      const btn = e.target.closest('.bg-swatch');
      if (btn && canvas) {
        canvas.setBackgroundColor(btn.dataset.color, canvas.renderAll.bind(canvas));
        saveHistory();
      }
    });
  }

  if (mEl) {
    mEl.innerHTML = swatchesHtml;
    mEl.addEventListener('click', e => {
      const btn = e.target.closest('.bg-swatch');
      if (btn && canvas) {
        canvas.setBackgroundColor(btn.dataset.color, canvas.renderAll.bind(canvas));
        saveHistory();
        toast('Фон холста обновлён');
      }
    });
  }
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

  const BG_PILL_COLORS = ['#e11d48', '#10B981', '#0284c7', '#8A6CFF', '#FBBF24', '#070a1e', '#ffffff', '#4f46e5'];
  mkSwatches('text-bg-color-row', BG_PILL_COLORS, c => {
    const obj = canvas?.getActiveObject();
    if (obj && ['textbox','text','i-text'].includes(obj.type)) {
      obj.set('backgroundColor', c);
      canvas.renderAll();
      saveHistory();
    }
    const cp = $('#text-bg-color-picker');
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

  // Магнитные направляющие (Smart Snapping)
  canvas.on('object:moving', e => {
    if (!isSnappingEnabled) return;
    const obj = e.target;
    if (!obj) return;
    const snapThreshold = 10;
    const cw = currentSize.w;
    const ch = currentSize.h;
    const cx = cw / 2;
    const cy = ch / 2;
    const ow = obj.getScaledWidth();
    const oh = obj.getScaledHeight();

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
    if (!ctx) return;
    if (smartGuides.x !== null) {
      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(smartGuides.x * zoom, 0);
      ctx.lineTo(smartGuides.x * zoom, currentSize.h * zoom);
      ctx.stroke();
      ctx.restore();
    }
    if (smartGuides.y !== null) {
      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, smartGuides.y * zoom);
      ctx.lineTo(currentSize.w * zoom, smartGuides.y * zoom);
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
  if (btn) btn.classList.toggle('is-active', isGridVisible);
  toast(isGridVisible ? 'Сетка включена' : 'Сетка выключена');
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
  obj.applyFilters();
  canvas.renderAll();
  saveHistory();
  onSelection();
  toast('Фильтры изображения сброшены');
}

/* ══════════════════════════════════════════════════════════════
   ЭКСПОРТ И ИМПОРТ ПРОЕКТА (.AURORA.JSON)
   ══════════════════════════════════════════════════════════════ */
function exportProjectJSON() {
  if (!canvas) return;
  const sizeKey = Object.entries(SIZES).find(([,v]) => v === currentSize)?.[0] || 'a4_v';
  const data = {
    auroraVersion: '2.2.0',
    app: 'Aurora Poster Editor',
    exportedAt: new Date().toISOString(),
    title: $('#poster-title')?.value || 'Афиша',
    sizeKey: sizeKey,
    size: currentSize,
    canvas: canvas.toJSON([
      'selectable','hasControls','editable','visible','evented',
      'lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation',
      '__filterValues','__isUppercase','__origText'
    ])
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (data.title || 'afisha').replace(/[\/\\?%*:|"<>]/g, '_');
  a.download = `${safeTitle}.aurora.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Проект афиши сохранён (.aurora.json) 💾');
}

function importProjectJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const proj = JSON.parse(e.target.result);
      if (!proj || !proj.canvas) {
        alert('Неверный формат файла проекта Aurora');
        return;
      }
      const sizeKey = proj.sizeKey || 'a4_v';
      currentSize = SIZES[sizeKey] || SIZES.a4_v;

      $('#screen-templates')?.classList.add('hidden');
      $('#screen-editor')?.classList.remove('hidden');

      initCanvas(currentSize.w, currentSize.h);
      canvas.loadFromJSON(proj.canvas, () => {
        canvas.renderAll();
        fitZoom();
        saveHistory();
        updateLayersList();
        clearProps();
      });

      if (proj.title && $('#poster-title')) {
        $('#poster-title').value = proj.title;
      }
      startAutosave();
      toast('Проект успешно загружен! 📂');
    } catch (err) {
      alert('Ошибка при чтении файла проекта: ' + err.message);
    }
  };
  reader.readAsText(file);
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
  updateLockBtnUI(false);
  updateLayersList();
}

function onSelection() {
  const obj = canvas?.getActiveObject();
  if (!obj) { clearProps(); return; }

  $('#props-empty')?.classList.add('hidden');
  $('#props-common')?.classList.remove('hidden');

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
  history.push(JSON.stringify(canvas.toJSON(['selectable','hasControls','editable','visible','evented','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','__filterValues','__isUppercase','__origText'])));
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

function exportJpg() {
  if (!canvas) return;
  const saved = zoom;
  applyZoom(1); canvas.discardActiveObject(); canvas.renderAll();
  const url = canvas.toDataURL({ format:'jpeg', quality:0.92, multiplier:2 });
  const a = document.createElement('a');
  a.href = url; a.download = ($('#poster-title').value || 'Афиша') + '.jpg'; a.click();
  applyZoom(saved);
  toast('JPG (высокое качество) сохранён в папку «Загрузки»');
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
        canvas: canvas.toJSON(['selectable','hasControls','editable','visible','evented','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','__filterValues','__isUppercase','__origText']),
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
      canvas: canvas.toJSON(['selectable','hasControls','editable','visible','evented','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','__filterValues','__isUppercase','__origText']),
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
   ИНТЕГРАЦИЯ С FIGMA REST API (ИМПОРТ И ЭКСПОРТ)
   ══════════════════════════════════════════════════════════════ */
const FIGMA_STORAGE_KEY = 'aurora_figma_token';
const FIGMA_DEFAULT_TOKEN = '';
let figmaCurrentFileKey = null;
let figmaCurrentDoc = null;
let figmaSelectedFrameId = null;
let figmaFramesList = [];
const figmaLoadedFonts = new Set();

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

  try {
    await embedAllImagesToBase64(canvas);

    const savedZoom = zoom;
    applyZoom(1);
    canvas.discardActiveObject();
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

  try {
    await embedAllImagesToBase64(canvas);

    const savedZoom = zoom;
    applyZoom(1);
    canvas.discardActiveObject();
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
 * Дополнительно вставляет фон холста явным <rect> с правильным цветом.
 */
function buildFigmaSVG() {
  const w = currentSize.w;
  const h = currentSize.h;

  // Получаем фоновый цвет
  const bg = canvas.backgroundColor || '#ffffff';

  let svgStr = canvas.toSVG({
    suppressPreamble: false,
    width: w + 'px',
    height: h + 'px',
    viewBox: { x: 0, y: 0, width: w, height: h }
  });

  // Fabric.js иногда пишет background через CSS, а не через <rect>.
  // Вставляем явный фоновый прямоугольник сразу после открывающего <svg>-тега
  // чтобы Figma видел его как отдельный слой фона.
  if (bg && bg !== 'rgba(0,0,0,0)' && bg !== 'transparent') {
    svgStr = svgStr.replace(
      /(<svg[^>]*>)/,
      `$1<rect x="0" y="0" width="${w}" height="${h}" fill="${escapeHtml(bg)}" />`
    );
  }

  return svgStr;
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

  $('#btn-close-mobile-panel')?.addEventListener('click', () => {
    $('#ed-panel')?.classList.remove('is-mobile-open');
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
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
      const el = document.activeElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;
      const obj = canvas.getActiveObject();
      if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); clearProps(); }
    }
  });

  /* Экспорт, проект и печать */
  $('#btn-save').addEventListener('click', manualSave);
  $('#btn-export-png').addEventListener('click', exportPng);
  $('#btn-export-jpg')?.addEventListener('click', exportJpg);
  $('#btn-export-pdf').addEventListener('click', exportPdf);
  $('#btn-print')?.addEventListener('click', printPoster);
  $('#btn-header-duplicate')?.addEventListener('click', duplicateActiveObject);
  $('#btn-toggle-grid')?.addEventListener('click', toggleGrid);
  $('#btn-toggle-snap')?.addEventListener('click', toggleSnapping);

  /* Экспорт и импорт проекта (.aurora.json) */
  $('#btn-save-project-json')?.addEventListener('click', exportProjectJSON);
  $('#btn-load-project-json')?.addEventListener('click', () => {
    $('#project-file-input')?.click();
  });
  $('#project-file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importProjectJSON(file);
    e.target.value = '';
  });

  /* Группировка и блокировка */
  $('#btn-group')       ?.addEventListener('click', groupSelected);
  $('#btn-header-group')?.addEventListener('click', groupSelected);
  $('#btn-ungroup')       ?.addEventListener('click', ungroupSelected);
  $('#btn-header-ungroup')?.addEventListener('click', ungroupSelected);
  $('#btn-lock-obj')      ?.addEventListener('click', toggleLockObject);

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
  $('#tool-ribbon') ?.addEventListener('click', addRibbon);
  $('#tool-bubble') ?.addEventListener('click', addSpeechBubble);
  $('#tool-hexagon')?.addEventListener('click', addHexagon);

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
  $('#mtool-photo')   ?.addEventListener('click', () => { closeMobileDrawer(); $('#photo-input')?.click(); });
  $('#mtool-cosmo')   ?.addEventListener('click', () => { closeMobileDrawer(); openCosmoModal(); });
  $('#mtool-logo')    ?.addEventListener('click', () => { closeMobileDrawer(); openLogoModal(); });
  $('#mtool-stickers')?.addEventListener('click', () => { closeMobileDrawer(); openBadgeModal(); });
  $('#mtool-qrcode')  ?.addEventListener('click', () => { closeMobileDrawer(); openQrModal(); });
  $('#mtool-figma-import')?.addEventListener('click', () => { closeMobileDrawer(); openFigmaImportModal(); });
  $('#mtool-figma-export')?.addEventListener('click', () => { closeMobileDrawer(); openFigmaExportModal(); });

  /* Resize */
  window.addEventListener('resize', fitZoom);
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

  // Подключение сохранённых шрифтов ofont.ru из IndexedDB
  await loadSavedFonts();

  if (!loadDraft()) {
    toast('Выберите шаблон для начала работы');
  }
});
