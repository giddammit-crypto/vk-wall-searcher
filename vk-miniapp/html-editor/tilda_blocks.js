/**
 * tilda_blocks.js — Библиотека 40+ готовых адаптивных блоков Tilda
 * Все блоки структурированы по категориям с русскоязычными названиями,
 * современным flex/grid дизайном, поддержкой темной/светлой темы и интерактивного runtime.
 */

export const TILDA_CATEGORIES = [
  { id: 'cover',        name: '🌟 Обложки (Hero)',           icon: 'wallpaper',      count: 5 },
  { id: 'about',        name: 'ℹ️ О проекте / компании',     icon: 'info',           count: 3 },
  { id: 'title',        name: '🏷️ Заголовки и разделители',  icon: 'title',          count: 3 },
  { id: 'text',         name: '📝 Текстовые блоки',          icon: 'article',        count: 3 },
  { id: 'features',     name: '⚡ Преимущества и фичи',       icon: 'star',           count: 5 },
  { id: 'gallery',      name: '🖼️ Галереи и медиа',          icon: 'photo_library',  count: 5 },
  { id: 'form',         name: '📋 Формы заявок и кнопки',    icon: 'edit_calendar',  count: 5 },
  { id: 'pricing',      name: '💳 Тарифы и цены',            icon: 'payments',       count: 3 },
  { id: 'testimonials', name: '💬 Отзывы клиентов',          icon: 'forum',          count: 4 },
  { id: 'menu',         name: '🧭 Меню и навигация',         icon: 'menu',           count: 3 },
  { id: 'footer',       name: '⚓ Подвал и футеры',          icon: 'call_to_action', count: 4 },
  { id: 'faq',          name: '❓ Вопросы и ответы (FAQ)',   icon: 'help_outline',   count: 3 },
  { id: 'media',        name: '🎬 Видео и аудио плеер',      icon: 'smart_display',  count: 2 },
  { id: 'contacts',     name: '📍 Контакты и карта',         icon: 'location_on',    count: 3 },
  { id: 'store',        name: '🛍️ Магазин и товары',         icon: 'shopping_cart',  count: 5 },
  { id: 'zero',         name: '⚡ Zero Block (Свободный)',   icon: 'bolt',           count: 1 },
  { id: 'portfolio',    name: '🎨 Портфолио и работы',       icon: 'photo_album',    count: 3 },
  { id: 'blog',         name: '📰 Блог и новости',           icon: 'article',        count: 3 },
  { id: 'team',         name: '👥 Команда',                  icon: 'group',          count: 3 },
  { id: 'timeline',     name: '📅 Таймлайн и этапы',         icon: 'timeline',       count: 2 },
  { id: 'counters',     name: '🔢 Счётчики и статистика',    icon: 'bar_chart',      count: 2 },
  { id: 'partners',     name: '🤝 Партнёры и клиенты',       icon: 'handshake',      count: 3 },
  { id: 'widgets',      name: '🔮 Виджеты и интерактивы',    icon: 'auto_awesome',   count: 8 }
];

export const TILDA_BLOCKS = [
  // ─── 1. ОБЛОЖКИ (COVER) ───────────────────────────────────────
  {
    id: 'cover-1',
    cat: 'cover',
    category: 'cover',
    name: 'Главный экран с фоновым фото',
    icon: 'wallpaper',
    defaultContent: {
      title: 'Создавайте сайты будущего с Аврора Tilda',
      subtitle: 'Профессиональный визуальный конструктор сайтов и лендингов с поддержкой Zero Block, интерактивных форм и адаптива.',
      btnText: 'Начать бесплатно',
      btnUrl: '#order',
      bgImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1920&q=80'
    },
    defaultDesign: {
      height: '90vh',
      overlayColor: 'rgba(7, 10, 19, 0.75)',
      titleSize: '3.6rem',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      btnBg: '#0d99ff',
      btnColor: '#ffffff',
      btnRadius: '8px'
    },
    html: (c, d) => `
      <div class="t-block t-cover" style="position:relative;min-height:${d.height};background-image:url('${c.bgImage}');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <div class="t-overlay" style="position:absolute;inset:0;background:${d.overlayColor};backdrop-filter:blur(2px);"></div>
        <div class="t-container" style="position:relative;z-index:2;width:100%;max-width:1100px;padding:60px 24px;text-align:center;color:${d.textColor};">
          <div style="display:inline-block;padding:6px 16px;background:rgba(13,153,255,0.15);border:1px solid rgba(13,153,255,0.4);border-radius:20px;font-size:13px;font-weight:600;color:${d.accentColor};margin-bottom:20px;letter-spacing:0.5px;">✨ ПЛАТФОРМА НОВОГО ПОКОЛЕНИЯ</div>
          <h1 style="font-size:clamp(2.2rem, 5vw, ${d.titleSize});font-weight:800;line-height:1.15;margin-bottom:24px;letter-spacing:-0.5px;">${c.title}</h1>
          <p style="font-size:clamp(1.1rem, 2vw, 1.3rem);line-height:1.6;max-width:760px;margin:0 auto 36px;color:rgba(255,255,255,0.85);">${c.subtitle}</p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
            <a href="${c.btnUrl}" class="t-btn" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 36px;background:${d.btnBg};color:${d.btnColor};border-radius:${d.btnRadius};font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 10px 30px rgba(13,153,255,0.4);transition:transform 0.2s,box-shadow 0.2s;">${c.btnText}</a>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'cover-2',
    cat: 'cover',
    category: 'cover',
    name: 'Сплит-обложка: Текст + Фото справа',
    icon: 'view_column',
    defaultContent: {
      badge: 'ИННОВАЦИИ В ДИЗАЙНЕ',
      title: 'Быстрый запуск любого веб-проекта',
      text: 'Собирайте профессиональные сайты из 40+ готовых блоков или верстайте свободный дизайн в Zero Block с адаптацией под смартфоны и планшеты.',
      btnText: 'Узнать больше',
      btnUrl: '#about',
      img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1000&q=80'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:50px;align-items:center;">
          <div>
            <div style="font-size:12px;font-weight:700;color:${d.accentColor};letter-spacing:1px;margin-bottom:14px;">${c.badge}</div>
            <h1 style="font-size:clamp(2rem, 4vw, 3.2rem);font-weight:800;line-height:1.2;margin-bottom:20px;">${c.title}</h1>
            <p style="font-size:16px;line-height:1.7;color:#94a3b8;margin-bottom:30px;">${c.text}</p>
            <a href="${c.btnUrl}" style="display:inline-flex;padding:14px 28px;background:${d.accentColor};color:#fff;font-weight:700;border-radius:8px;text-decoration:none;">${c.btnText}</a>
          </div>
          <div style="position:relative;">
            <img src="${c.img}" alt="${c.title || 'Cover'}" data-lightbox="true" data-caption="${c.title || ''}" style="width:100%;height:auto;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);cursor:zoom-in;" />
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'cover-3',
    cat: 'cover',
    category: 'cover',
    name: 'Минималистичная обложка с градиентом',
    icon: 'gradient',
    defaultContent: {
      title: 'Дизайн без ограничений',
      subtitle: 'Лаконичная типографика, премиальная верстка и мгновенная публикация.'
    },
    defaultDesign: {
      bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
      textColor: '#ffffff'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgGradient};color:${d.textColor};padding:120px 24px;text-align:center;">
        <div class="t-container" style="max-width:860px;margin:0 auto;">
          <h1 style="font-size:clamp(2.5rem, 6vw, 4rem);font-weight:900;letter-spacing:-1px;margin-bottom:18px;">${c.title}</h1>
          <p style="font-size:1.3rem;color:#94a3b8;line-height:1.6;">${c.subtitle}</p>
        </div>
      </div>
    `
  },
  {
    id: 'cover-4',
    cat: 'cover',
    category: 'cover',
    name: 'Обложка с формой захвата лидов',
    icon: 'contact_mail',
    defaultContent: {
      title: 'Получите персональный расчет проекта',
      subtitle: 'Оставьте контакты и наш специалист свяжется с вами в течение 15 минут.',
      btnText: 'Отправить заявку'
    },
    defaultDesign: {
      bgColor: '#111827',
      textColor: '#ffffff',
      accentColor: '#0d99ff'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:90px 20px;">
        <div class="t-container" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:40px;align-items:center;">
          <div>
            <h2 style="font-size:2.8rem;font-weight:800;line-height:1.2;margin-bottom:16px;">${c.title}</h2>
            <p style="font-size:1.1rem;color:#9ca3af;line-height:1.6;">${c.subtitle}</p>
          </div>
          <div style="background:#1f2937;padding:32px;border-radius:16px;border:1px solid #374151;">
            <form style="display:flex;flex-direction:column;gap:14px;" onsubmit="event.preventDefault();alert('Заявка отправлена!');">
              <input type="text" placeholder="Ваше имя" required style="padding:14px;background:#111827;border:1px solid #4b5563;border-radius:8px;color:#fff;outline:none;" />
              <input type="tel" placeholder="+7 (999) 000-00-00" required style="padding:14px;background:#111827;border:1px solid #4b5563;border-radius:8px;color:#fff;outline:none;" />
              <button type="submit" style="padding:14px;background:${d.accentColor};color:#fff;font-weight:700;border:none;border-radius:8px;cursor:pointer;">${c.btnText}</button>
            </form>
          </div>
        </div>
      </div>
    `
  },

  // ─── 2. О ПРОЕКТЕ / О НАС (ABOUT) ─────────────────────────────
  {
    id: 'about-1',
    cat: 'about',
    category: 'about',
    name: 'О компании с ключевыми цифрами',
    icon: 'analytics',
    defaultContent: {
      title: 'Мы создаем продукты, которые меняют индустрию',
      text: 'Более 8 лет опыта в разработке высоконагруженных веб-сервисов, корпоративных порталов и интерактивных интерфейсов.',
      stats: [
        { num: '8+', label: 'Лет на рынке' },
        { num: '250+', label: 'Успешных проектов' },
        { num: '99.9%', label: 'Довольных клиентов' }
      ]
    },
    defaultDesign: {
      bgColor: '#ffffff',
      textColor: '#0f172a',
      accentColor: '#0d99ff'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:90px 24px;">
        <div class="t-container" style="max-width:1100px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.5rem;font-weight:800;margin-bottom:20px;letter-spacing:-0.5px;">${c.title}</h2>
          <p style="font-size:1.15rem;color:#64748b;line-height:1.7;max-width:760px;margin:0 auto 60px;">${c.text}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:30px;">
            ${(c.stats || []).map(s => `
              <div style="padding:30px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <div style="font-size:3rem;font-weight:900;color:${d.accentColor};margin-bottom:8px;">${s.num}</div>
                <div style="font-size:14px;font-weight:600;color:#64748b;">${s.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'about-2',
    cat: 'about',
    category: 'about',
    name: 'Наша история и миссия',
    icon: 'flag',
    defaultContent: {
      title: 'Наша миссия и принципы',
      text: 'Мы верим, что веб-технологии должны быть доступны каждому. Наша цель — дать дизайнерам и предпринимателям инструменты для создания безупречных сайтов за считанные минуты.',
      img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:90px 24px;">
        <div class="t-container" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:50px;align-items:center;">
          <img src="${c.img}" alt="${c.title || 'Mission'}" data-lightbox="true" data-caption="${c.title || ''}" style="width:100%;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);cursor:zoom-in;" />
          <div>
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:20px;">${c.title}</h2>
            <p style="font-size:16px;line-height:1.8;color:#94a3b8;">${c.text}</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'about-3',
    cat: 'about',
    category: 'about',
    name: 'Карточки ценностей компании',
    icon: 'diamond',
    defaultContent: {
      title: 'Ценности, которыми мы руководствуемся',
      items: [
        { title: 'Качество без компромиссов', desc: 'Каждый пиксель и строка кода выверены до мелочей.' },
        { title: 'Скорость и легкость', desc: 'Мгновенный отклик интерфейса и быстрая загрузка страниц.' },
        { title: 'Забота о пользователе', desc: 'Удобство и интуитивность на каждом шаге взаимодействия.' }
      ]
    },
    defaultDesign: {
      bgColor: '#131927',
      textColor: '#ffffff'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:80px 24px;">
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <h2 style="font-size:2.4rem;font-weight:800;text-align:center;margin-bottom:50px;">${c.title}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:24px;">
            ${(c.items || []).map(item => `
              <div style="background:#1e293b;padding:32px 24px;border-radius:12px;border:1px solid #334155;">
                <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:12px;color:#38bdf8;">${item.title}</h3>
                <p style="font-size:14px;color:#94a3b8;line-height:1.6;">${item.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 3. ЗАГОЛОВКИ И РАЗДЕЛИТЕЛИ (TITLE) ────────────────────────
  {
    id: 'title-1',
    cat: 'title',
    category: 'title',
    name: 'Заголовок секции по центру',
    icon: 'format_align_center',
    defaultContent: {
      badge: 'ОБЗОР ВОЗМОЖНОСТЕЙ',
      title: 'Все необходимое для вашего бизнеса',
      subtitle: 'Комплексный набор инструментов для презентации услуг и приема платежей.'
    },
    defaultDesign: {
      bgColor: 'transparent',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '60px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};text-align:center;">
        <div class="t-container" style="max-width:800px;margin:0 auto;">
          <div style="font-size:12px;font-weight:700;color:${d.accentColor};letter-spacing:1.5px;margin-bottom:10px;">${c.badge}</div>
          <h2 style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:800;margin-bottom:14px;letter-spacing:-0.5px;">${c.title}</h2>
          <p style="font-size:1.1rem;color:#94a3b8;line-height:1.6;">${c.subtitle}</p>
        </div>
      </div>
    `
  },
  {
    id: 'title-2',
    cat: 'title',
    category: 'title',
    name: 'Заголовок слева с акцентной линией',
    icon: 'format_align_left',
    defaultContent: {
      title: 'Наши ключевые направления',
      subtitle: 'Проекты, которыми мы гордимся'
    },
    defaultDesign: {
      bgColor: 'transparent',
      textColor: '#ffffff',
      lineColor: '#0d99ff',
      padding: '50px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <div style="width:40px;height:4px;background:${d.lineColor};border-radius:2px;margin-bottom:16px;"></div>
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
          <p style="font-size:1.1rem;color:#94a3b8;">${c.subtitle}</p>
        </div>
      </div>
    `
  },
  {
    id: 'title-3',
    cat: 'title',
    category: 'title',
    name: 'Цитата / Большой акцентный текст',
    icon: 'format_quote',
    defaultContent: {
      quote: '«Простота — это высшая ступень утонченности и совершенства.»',
      author: 'Леонардо да Винчи'
    },
    defaultDesign: {
      bgColor: '#1e293b',
      textColor: '#ffffff',
      padding: '70px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};text-align:center;">
        <div class="t-container" style="max-width:860px;margin:0 auto;">
          <p style="font-size:1.8rem;font-weight:600;font-style:italic;line-height:1.5;margin-bottom:20px;color:#e2e8f0;">${c.quote}</p>
          <div style="font-size:14px;font-weight:700;color:#0d99ff;letter-spacing:1px;">— ${c.author}</div>
        </div>
      </div>
    `
  },

  // ─── 4. ТЕКСТОВЫЕ БЛОКИ (TEXT) ────────────────────────────────
  {
    id: 'text-1',
    cat: 'text',
    category: 'text',
    name: 'Стандартный текстовый блок для статьи',
    icon: 'notes',
    defaultContent: {
      text: 'Современный визуальный конструктор позволяет концентрироваться на содержании и бизнес-целях. Забудьте о сложностях верстки и ручной настройке адаптива — все блоки автоматически оптимизированы для корректного отображения на экранах любых размеров.'
    },
    defaultDesign: {
      bgColor: 'transparent',
      textColor: '#cbd5e1',
      fontSize: '17px',
      padding: '40px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};padding:${d.padding};">
        <div class="t-container" style="max-width:800px;margin:0 auto;font-size:${d.fontSize};color:${d.textColor};line-height:1.8;">
          <p>${c.text}</p>
        </div>
      </div>
    `
  },
  {
    id: 'text-2',
    cat: 'text',
    category: 'text',
    name: 'Две колонки текста',
    icon: 'view_agenda',
    defaultContent: {
      col1Title: 'Быстрый старт',
      col1Text: 'Выберите готовый шаблон или добавьте нужные блоки из обширной библиотеки. Редактируйте текст и изображения в 1 клик.',
      col2Title: 'Гибкая кастомизация',
      col2Text: 'Настраивайте шрифты, цвета, отступы, тени и анимации появления. Подключайте собственные скрипты и стили.'
    },
    defaultDesign: {
      bgColor: 'transparent',
      textColor: '#ffffff',
      padding: '60px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:40px;">
          <div>
            <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:12px;color:#0d99ff;">${c.col1Title}</h3>
            <p style="font-size:15px;color:#94a3b8;line-height:1.7;">${c.col1Text}</p>
          </div>
          <div>
            <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:12px;color:#0d99ff;">${c.col2Title}</h3>
            <p style="font-size:15px;color:#94a3b8;line-height:1.7;">${c.col2Text}</p>
          </div>
        </div>
      </div>
    `
  },

  // ─── 5. ПРЕИМУЩЕСТВА (FEATURES) ──────────────────────────────
  {
    id: 'features-1',
    cat: 'features',
    category: 'features',
    name: 'Сетка 3-х карточек преимуществ с иконками',
    icon: 'grid_view',
    defaultContent: {
      cards: [
        { icon: 'speed', title: 'Мгновенная скорость', desc: 'Оптимизированный легковесный код и быстрая загрузка страниц.' },
        { icon: 'devices', title: '100% Адаптивность', desc: 'Автоматическая подстройка под мобильные устройства и планшеты.' },
        { icon: 'security', title: 'Безопасность данных', desc: 'Надежная защита форм и интеграция с Telegram-уведомлениями.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:24px;">
            ${(c.cards || []).map(card => `
              <div style="background:#1e293b;padding:36px 28px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);transition:transform 0.2s;">
                <div style="width:52px;height:52px;background:rgba(13,153,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;color:${d.accentColor};margin-bottom:20px;">
                  <span class="material-symbols-rounded" style="font-size:28px;">${card.icon}</span>
                </div>
                <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:10px;">${card.title}</h3>
                <p style="font-size:14px;color:#94a3b8;line-height:1.6;">${card.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'features-2',
    cat: 'features',
    category: 'features',
    name: '4 колонки преимуществ с цифрами',
    icon: 'format_list_numbered',
    defaultContent: {
      steps: [
        { num: '01', title: 'Выбор шаблона', desc: 'Подберите подходящую структуру сайта.' },
        { num: '02', title: 'Наполнение', desc: 'Замените тексты и добавьте свои фото.' },
        { num: '03', title: 'Настройка дизайна', desc: 'Скорректируйте цвета и шрифты.' },
        { num: '04', title: 'Публикация', desc: 'Запустите сайт онлайн в 1 клик.' }
      ]
    },
    defaultDesign: {
      bgColor: '#111827',
      textColor: '#ffffff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:24px;">
            ${(c.steps || []).map(s => `
              <div style="padding:24px;border-left:2px solid #0d99ff;background:rgba(255,255,255,0.02);">
                <div style="font-size:2rem;font-weight:900;color:#0d99ff;margin-bottom:8px;">${s.num}</div>
                <h4 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">${s.title}</h4>
                <p style="font-size:13px;color:#9ca3af;line-height:1.5;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 6. ТАРИФЫ И ЦЕНЫ (PRICING) ───────────────────────────────
  {
    id: 'pricing-1',
    cat: 'pricing',
    category: 'pricing',
    name: '3 карточки тарифов с выделенным планом',
    icon: 'payments',
    defaultContent: {
      title: 'Прозрачные тарифные планы',
      subtitle: 'Выберите оптимальный вариант для ваших задач',
      plans: [
        { name: 'Базовый', price: '990 ₽', period: '/ мес', desc: 'Для небольших сайтов и портфолио', features: ['До 3 страниц', 'Стандартные блоки', 'SSL-сертификат'], isFeatured: false },
        { name: 'Профессиональный', price: '2 490 ₽', period: '/ мес', desc: 'Идеально для бизнеса и интернет-магазинов', features: ['Безлимит страниц', 'Zero Block редактор', 'Прием онлайн-оплаты', 'Telegram-интеграция'], isFeatured: true },
        { name: 'Корпоративный', price: '4 990 ₽', period: '/ мес', desc: 'Для крупных проектов и команд', features: ['Все функции PRO', 'Приоритетная поддержка 24/7', 'Выделенный сервер'], isFeatured: false }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '90px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.6rem;font-weight:800;margin-bottom:12px;">${c.title}</h2>
          <p style="font-size:1.1rem;color:#94a3b8;margin-bottom:60px;">${c.subtitle}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:24px;align-items:stretch;">
            ${(c.plans || []).map(p => `
              <div style="background:${p.isFeatured ? '#1e293b' : '#131c2e'};border:${p.isFeatured ? '2px solid #0d99ff' : '1px solid #283548'};border-radius:16px;padding:40px 28px;text-align:left;display:flex;flex-direction:column;position:relative;box-shadow:${p.isFeatured ? '0 20px 40px rgba(13,153,255,0.2)' : 'none'};">
                ${p.isFeatured ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#0d99ff;color:#fff;padding:4px 14px;border-radius:12px;font-size:11px;font-weight:700;">ХИТ ПРОДАЖ</div>' : ''}
                <div style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">${p.name}</div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:24px;">${p.desc}</div>
                <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:28px;">
                  <span style="font-size:2.8rem;font-weight:900;color:#fff;">${p.price}</span>
                  <span style="font-size:14px;color:#64748b;">${p.period}</span>
                </div>
                <ul style="list-style:none;padding:0;margin:0 0 36px 0;display:flex;flex-direction:column;gap:12px;flex:1;">
                  ${(p.features || []).map(f => `<li style="font-size:14px;color:#cbd5e1;display:flex;align-items:center;gap:8px;"><span class="material-symbols-rounded" style="color:#10b981;font-size:18px;">check_circle</span>${f}</li>`).join('')}
                </ul>
                <button style="width:100%;padding:14px;background:${p.isFeatured ? '#0d99ff' : 'transparent'};border:1px solid #0d99ff;color:#fff;border-radius:8px;font-weight:700;cursor:pointer;">Выбрать тариф</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 7. МЕНЮ И НАВИГАЦИЯ (MENU) ──────────────────────────────
  {
    id: 'menu-1',
    cat: 'menu',
    category: 'menu',
    name: 'Шапка с логотипом, ссылками и кнопкой',
    icon: 'web',
    defaultContent: {
      brand: 'АВРОРА TILDA',
      links: [
        { text: 'Главная', url: '#home' },
        { text: 'Преимущества', url: '#features' },
        { text: 'Тарифы', url: '#pricing' },
        { text: 'Контакты', url: '#contacts' }
      ],
      btnText: 'Связаться'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff'
    },
    html: (c, d) => `
      <header class="t-block" style="background:${d.bgColor};color:${d.textColor};border-bottom:1px solid rgba(255,255,255,0.08);padding:16px 24px;">
        <div class="t-container" style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;">
          <div style="font-weight:800;font-size:18px;display:flex;align-items:center;gap:8px;">
            <span class="material-symbols-rounded" style="color:${d.accentColor};">view_quilt</span>
            <span>${c.brand}</span>
          </div>
          <nav style="display:flex;gap:24px;align-items:center;" class="t-nav-links">
            ${(c.links || []).map(l => `<a href="${l.url}" style="color:#94a3b8;text-decoration:none;font-size:14px;font-weight:500;transition:color 0.2s;">${l.text}</a>`).join('')}
          </nav>
          <a href="#order" style="padding:8px 20px;background:${d.accentColor};color:#fff;border-radius:6px;font-weight:600;font-size:13px;text-decoration:none;">${c.btnText}</a>
        </div>
      </header>
    `
  },

  // ─── 8. ВОПРОСЫ И ОТВЕТЫ (FAQ) ───────────────────────────────
  {
    id: 'faq-1',
    cat: 'faq',
    category: 'faq',
    name: 'Интерактивный аккордеон вопросов и ответов',
    icon: 'help_outline',
    defaultContent: {
      title: 'Часто задаваемые вопросы',
      items: [
        { q: 'Нужно ли уметь программировать для создания сайта?', a: 'Нет, конструктор работает полностью визуально в режиме No-Code. Вы просто собираете блоки и настраиваете их параметры.' },
        { q: 'Как опубликовать готовый сайт?', a: 'Нажмите кнопку «Опубликовать» в верхней панели — сайт будет мгновенно выгружен в облако с получением публичной ссылки.' },
        { q: 'Поддерживается ли экспорт исходного кода?', a: 'Да, вы можете в любой момент скачать готовый ZIP-архив с чистым HTML, CSS и JS для размещения на собственном хостинге.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:800px;margin:0 auto;">
          <h2 style="font-size:2.4rem;font-weight:800;text-align:center;margin-bottom:40px;">${c.title}</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${(c.items || []).map(item => `
              <details style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px 20px;cursor:pointer;">
                <summary style="font-weight:700;font-size:16px;color:#f8fafc;outline:none;">${item.q}</summary>
                <div style="margin-top:12px;font-size:14px;color:#94a3b8;line-height:1.7;">${item.a}</div>
              </details>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 9. ФОРМЫ (FORM) ──────────────────────────────────────────
  {
    id: 'form-1',
    cat: 'form',
    category: 'form',
    name: 'Форма обратной связи по центру',
    icon: 'mail',
    defaultContent: {
      title: 'Остались вопросы? Напишите нам',
      subtitle: 'Мы ответим на все интересующие вопросы и поможем с выбором решения.',
      btnText: 'Отправить сообщение'
    },
    defaultDesign: {
      bgColor: '#111827',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="order">
        <div class="t-container" style="max-width:600px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.2rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
          <p style="font-size:15px;color:#9ca3af;margin-bottom:32px;">${c.subtitle}</p>
          <form style="display:flex;flex-direction:column;gap:14px;text-align:left;" onsubmit="event.preventDefault();alert('Спасибо! Мы свяжемся с вами.');">
            <input type="text" placeholder="Ваше имя" required style="padding:14px 16px;background:#1f2937;border:1px solid #374151;border-radius:8px;color:#fff;outline:none;" />
            <input type="email" placeholder="Email для ответа" required style="padding:14px 16px;background:#1f2937;border:1px solid #374151;border-radius:8px;color:#fff;outline:none;" />
            <textarea placeholder="Ваше сообщение..." rows="4" style="padding:14px 16px;background:#1f2937;border:1px solid #374151;border-radius:8px;color:#fff;outline:none;resize:vertical;"></textarea>
            <button type="submit" style="padding:16px;background:${d.accentColor};color:#fff;font-weight:700;font-size:15px;border:none;border-radius:8px;cursor:pointer;margin-top:8px;">${c.btnText}</button>
          </form>
        </div>
      </div>
    `
  },

  // ─── 10. ПОДВАЛ (FOOTER) ──────────────────────────────────────
  {
    id: 'footer-1',
    cat: 'footer',
    category: 'footer',
    name: 'Колончатый футер с ссылками и копирайтом',
    icon: 'call_to_action',
    defaultContent: {
      brand: 'АВРОРА WEB',
      tagline: 'Платформа визуального проектирования сайтов',
      copyright: '© 2026 Aurora Web. Все права защищены.'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#94a3b8',
      padding: '60px 24px 30px'
    },
    html: (c, d) => `
      <footer class="t-block" style="background:${d.bgColor};color:${d.textColor};border-top:1px solid rgba(255,255,255,0.08);padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;padding-bottom:30px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div>
              <div style="font-weight:800;font-size:18px;color:#fff;margin-bottom:6px;">${c.brand}</div>
              <div style="font-size:13px;color:#64748b;">${c.tagline}</div>
            </div>
            <div style="display:flex;gap:20px;font-size:13px;">
              <a href="#about" style="color:#94a3b8;text-decoration:none;">О нас</a>
              <a href="#pricing" style="color:#94a3b8;text-decoration:none;">Тарифы</a>
              <a href="#privacy" style="color:#94a3b8;text-decoration:none;">Политика конфиденциальности</a>
            </div>
          </div>
          <div style="text-align:center;font-size:12px;color:#475569;margin-top:24px;">${c.copyright}</div>
        </div>
      </footer>
    `
  },
  {
    id: 'footer-2',
    cat: 'footer',
    category: 'footer',
    name: 'Минималистичный темный футер с соцсетями',
    icon: 'horizontal_rule',
    defaultContent: {
      copyright: '© 2026 Aurora Web Inc. Сделано с любовью.',
      socials: [
        { name: 'VK', url: '#' },
        { name: 'Telegram', url: '#' },
        { name: 'GitHub', url: '#' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#64748b',
      padding: '36px 24px'
    },
    html: (c, d) => `
      <footer class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};border-top:1px solid #1e293b;">
        <div class="t-container" style="max-width:1150px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div style="font-size:13px;">${c.copyright}</div>
          <div style="display:flex;gap:16px;">
            ${(c.socials || []).map(s => `<a href="${s.url}" style="color:#94a3b8;text-decoration:none;font-size:13px;font-weight:600;">${s.name}</a>`).join('')}
          </div>
        </div>
      </footer>
    `
  },

  // ─── 11. ГАЛЕРЕИ И МЕДИА (GALLERY) ────────────────────────────
  {
    id: 'gallery-1',
    cat: 'gallery',
    category: 'gallery',
    name: 'Сетка фотографий 3x2 с зумом (Лайтбокс)',
    icon: 'grid_view',
    defaultContent: {
      title: 'Галерея наших проектов',
      subtitle: 'Нажмите на любое фото для просмотра в высоком разрешении',
      images: [
        { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', caption: 'IT Проект 1' },
        { src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', caption: 'Команда 2' },
        { src: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80', caption: 'Дизайн 3' },
        { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80', caption: 'Офис 4' },
        { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', caption: 'Аналитика 5' },
        { src: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80', caption: 'Библиотека 6' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-gallery" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1200px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
          <p style="font-size:15px;color:#94a3b8;margin-bottom:40px;">${c.subtitle}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
            ${(c.images || []).map(img => `
              <div style="height:240px;border-radius:12px;overflow:hidden;position:relative;cursor:zoom-in;border:1px solid rgba(255,255,255,0.1);">
                <img src="${img.src}" data-lightbox="true" data-gallery-id="gallery-1" data-caption="${img.caption || ''}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" alt="${img.caption || ''}" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 12. ОТЗЫВЫ (TESTIMONIALS) ────────────────────────────────
  {
    id: 'testimonials-1',
    cat: 'testimonials',
    category: 'testimonials',
    name: '3 карточки отзывов клиентов с фото и рейтингом',
    icon: 'forum',
    defaultContent: {
      title: 'Что говорят наши клиенты',
      subtitle: 'Реальные истории успеха и отзывы о сотрудничестве с нами',
      items: [
        {
          name: 'Алексей Смирнов',
          role: 'CEO ТехноПром',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
          text: 'Благодаря конструктору мы запустили новый лендинг всего за 2 дня и увеличили конверсию заявок на 45%!',
          rating: 5
        },
        {
          name: 'Елена Кузнецова',
          role: 'Маркетолог Студии',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
          text: 'Zero Block дает потрясающую свободу кастомизации. Интерфейс быстрый, удобный и невероятно продуманный.',
          rating: 5
        },
        {
          name: 'Дмитрий Волков',
          role: 'Основатель EdTech',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
          text: 'Интеграция с Telegram и корзиной товаров закрывает 100% потребностей нашего интернет-магазина.',
          rating: 5
        }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:50px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:24px;">
            ${(c.items || []).map(item => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:16px;padding:32px 24px;display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="color:#f59e0b;font-size:18px;margin-bottom:14px;letter-spacing:2px;">★★★★★</div>
                  <p style="font-size:15px;line-height:1.7;color:#cbd5e1;font-style:italic;margin-bottom:24px;">«${item.text}»</p>
                </div>
                <div style="display:flex;align-items:center;gap:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
                  <img src="${item.avatar}" alt="${item.name}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;" />
                  <div>
                    <div style="font-weight:700;font-size:15px;color:#fff;">${item.name}</div>
                    <div style="font-size:12px;color:#64748b;">${item.role}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 13. КОНТАКТЫ (CONTACTS) ──────────────────────────────────
  {
    id: 'contacts-1',
    cat: 'contacts',
    category: 'contacts',
    name: 'Контакты: Адрес, телефон, email и режим работы',
    icon: 'location_on',
    defaultContent: {
      title: 'Свяжитесь с нами',
      subtitle: 'Мы всегда рады новым проектам и сотрудничеству',
      phone: '+7 (495) 123-45-67',
      email: 'hello@auroraweb.ru',
      address: 'Москва, Пресненская наб., д. 12, Башня Федерация',
      hours: 'Пн-Пт: 09:00 - 20:00, Сб-Вс: 10:00 - 18:00'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="contacts">
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:50px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:20px;">
            <div style="background:#1e293b;padding:28px;border-radius:14px;border:1px solid #334155;text-align:center;">
              <span class="material-symbols-rounded" style="font-size:36px;color:${d.accentColor};margin-bottom:12px;">call</span>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Телефон</div>
              <a href="tel:${c.phone}" style="font-weight:700;font-size:16px;color:#fff;text-decoration:none;">${c.phone}</a>
            </div>
            <div style="background:#1e293b;padding:28px;border-radius:14px;border:1px solid #334155;text-align:center;">
              <span class="material-symbols-rounded" style="font-size:36px;color:#10b981;margin-bottom:12px;">mail</span>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Электронная почта</div>
              <a href="mailto:${c.email}" style="font-weight:700;font-size:16px;color:#fff;text-decoration:none;">${c.email}</a>
            </div>
            <div style="background:#1e293b;padding:28px;border-radius:14px;border:1px solid #334155;text-align:center;">
              <span class="material-symbols-rounded" style="font-size:36px;color:#f59e0b;margin-bottom:12px;">location_on</span>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Адрес офиса</div>
              <div style="font-weight:700;font-size:14px;color:#fff;line-height:1.4;">${c.address}</div>
            </div>
            <div style="background:#1e293b;padding:28px;border-radius:14px;border:1px solid #334155;text-align:center;">
              <span class="material-symbols-rounded" style="font-size:36px;color:#8b5cf6;margin-bottom:12px;">schedule</span>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Режим работы</div>
              <div style="font-weight:700;font-size:14px;color:#fff;line-height:1.4;">${c.hours}</div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // ─── 14. МАГАЗИН И ТОВАРЫ (STORE & CART) ──────────────────────
  {
    id: 'store-1',
    cat: 'store',
    category: 'store',
    name: 'Витрина каталога товаров (ST300)',
    icon: 'storefront',
    defaultContent: {
      title: 'Популярные товары и услуги',
      subtitle: 'Выбирайте лучшие решения и оформляйте заказ онлайн в 1 клик',
      products: [
        {
          id: 'prod_101',
          name: 'Флагманский курс Aurora Web Pro',
          price: 14990,
          oldPrice: 19990,
          badge: 'ХИТ',
          img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
          desc: 'Полный практический курс по созданию современных адаптивных сайтов.'
        },
        {
          id: 'prod_102',
          name: 'Дизайн-система & UI Kit 2026',
          price: 4990,
          oldPrice: 7990,
          badge: 'NEW',
          img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&q=80',
          desc: 'Готовый набор компонентов Figma и Aurora Web для быстрого старта.'
        },
        {
          id: 'prod_103',
          name: 'Премиум подписка Cloud 1 Год',
          price: 9900,
          oldPrice: 12000,
          badge: '-25%',
          img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
          desc: 'Неограниченный хостинг, кастомные домены и мгновенная публикация.'
        }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-store-catalog" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="catalog">
        <div class="t-container" style="max-width:1200px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px;margin-bottom:40px;">
            <div>
              <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
              <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
            </div>
            <!-- Cart floating badge trigger -->
            <button class="t-btn" data-tilda-cart-trigger style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#182234;border:1px solid #283548;color:#fff;border-radius:10px;font-weight:700;cursor:pointer;">
              <span class="material-symbols-rounded" style="color:#0d99ff;">shopping_cart</span>
              <span>Корзина</span>
              <span class="tilda-cart-badge-count" data-tilda-cart-count style="display:none;">0</span>
            </button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:24px;">
            ${(c.products || []).map(p => `
              <div class="tilda-product-card" data-product-card style="background:#121826;border:1px solid #233047;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                ${p.badge ? `<div style="position:absolute;top:14px;left:14px;background:#0d99ff;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;z-index:10;">${p.badge}</div>` : ''}
                <div style="height:210px;overflow:hidden;position:relative;background:#090d16;">
                  <img src="${p.img}" alt="${p.name}" data-lightbox="true" data-caption="${p.name} - ${p.price || ''}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;cursor:zoom-in;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
                </div>
                <div style="padding:24px;display:flex;flex-direction:column;flex:1;justify-content:space-between;">
                  <div>
                    <h3 data-product-name style="font-size:1.15rem;font-weight:700;margin-bottom:8px;line-height:1.4;color:#fff;">${p.name}</h3>
                    <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:20px;">${p.desc}</p>
                  </div>
                  <div>
                    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px;">
                      <span data-product-price style="font-size:1.6rem;font-weight:900;color:#10b981;">${p.price} ₽</span>
                      ${p.oldPrice ? `<span style="font-size:14px;color:#64748b;text-decoration:line-through;">${p.oldPrice} ₽</span>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;">
                      <button data-tilda-cart-add data-product-id="${p.id}" data-product-name="${p.name}" data-product-price="${p.price}" data-product-img="${p.img}" style="flex:1;padding:12px;background:#0d99ff;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                        <span class="material-symbols-rounded" style="font-size:18px;">shopping_cart</span>
                        <span>В корзину</span>
                      </button>
                      <button data-tilda-cart-trigger style="padding:12px 14px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;" title="Открыть корзину">
                        <span class="material-symbols-rounded" style="font-size:18px;">visibility</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'store-cart',
    cat: 'store',
    category: 'store',
    name: 'Виджет корзины покупателя (ST100)',
    icon: 'shopping_bag',
    defaultContent: {
      title: 'Корзина покупателя',
      btnText: 'Оформить заказ',
      emptyText: 'Ваша корзина пуста'
    },
    defaultDesign: {
      bgColor: '#121826',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '40px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-cart-block-widget" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};border:1px dashed #233047;border-radius:16px;margin:20px auto;max-width:1100px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:48px;height:48px;background:rgba(13,153,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;color:${d.accentColor};">
              <span class="material-symbols-rounded" style="font-size:26px;">shopping_cart</span>
            </div>
            <div>
              <div style="font-weight:800;font-size:16px;color:#fff;">${c.title}</div>
              <div style="font-size:13px;color:#94a3b8;">В корзине: <b data-tilda-cart-count style="color:#0d99ff;">0</b> товаров</div>
            </div>
          </div>
          <button data-tilda-cart-trigger style="padding:12px 28px;background:${d.accentColor};color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 8px 20px rgba(13,153,255,0.35);">
            <span class="material-symbols-rounded">shopping_bag</span>
            <span>${c.btnText}</span>
          </button>
        </div>
      </div>
    `
  },
  {
    id: 'store-single',
    cat: 'store',
    category: 'store',
    name: 'Флагманский товар с опциями (ST200)',
    icon: 'local_offer',
    defaultContent: {
      badge: 'ТОП ПРОДАЖ',
      title: 'Профессиональный монитор Aurora Vision 4K',
      sku: 'AV-4K-2026',
      price: 49990,
      oldPrice: 59990,
      desc: 'Премиальный IPS-дисплей 32 дюйма с цветопередачей 99% DCI-P3, частотой 144 Гц и разъемом Thunderbolt 4 для дизайнеров и профессионалов.',
      img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
      specs: [
        { label: 'Диагональ', val: '32 дюйма 4K UHD' },
        { label: 'Матрица', val: 'IPS Nano Color' },
        { label: 'Частота', val: '144 Hz FreeSync' },
        { label: 'Гарантия', val: '24 месяца' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:50px;align-items:center;">
          <div style="border-radius:20px;overflow:hidden;border:1px solid #233047;background:#121826;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
            <img src="${c.img}" alt="${c.title}" data-lightbox="true" data-caption="${c.title}" style="width:100%;height:auto;display:block;cursor:zoom-in;" />
          </div>
          <div>
            <div style="display:inline-block;padding:4px 12px;background:rgba(13,153,255,0.15);border:1px solid rgba(13,153,255,0.3);border-radius:6px;font-size:11px;font-weight:700;color:${d.accentColor};margin-bottom:12px;">${c.badge}</div>
            <h1 style="font-size:2.2rem;font-weight:800;margin-bottom:8px;line-height:1.2;">${c.title}</h1>
            <div style="font-size:12px;color:#64748b;margin-bottom:16px;">Артикул: ${c.sku}</div>
            <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin-bottom:24px;">${c.desc}</p>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;background:#121826;padding:16px;border-radius:12px;border:1px solid #1e293b;">
              ${(c.specs || []).map(s => `
                <div>
                  <div style="font-size:11px;color:#64748b;">${s.label}</div>
                  <div style="font-weight:700;font-size:13px;color:#fff;">${s.val}</div>
                </div>
              `).join('')}
            </div>

            <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px;">
              <span style="font-size:2.6rem;font-weight:900;color:#10b981;">${c.price} ₽</span>
              ${c.oldPrice ? `<span style="font-size:18px;color:#64748b;text-decoration:line-through;">${c.oldPrice} ₽</span>` : ''}
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <button data-tilda-cart-add data-product-id="${c.sku || 'AV-4K'}" data-product-name="${c.title}" data-product-price="${c.price}" data-product-img="${c.img}" style="flex:1;min-width:200px;padding:16px 28px;background:${d.accentColor};color:#fff;border:none;border-radius:10px;font-weight:800;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 25px rgba(13,153,255,0.4);">
                <span class="material-symbols-rounded">shopping_cart</span>
                <span>Добавить в корзину</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // ─── 15. МЕДИА И ВИДЕО (MEDIA) ──────────────────────────────
  {
    id: 'media-1',
    cat: 'media',
    category: 'media',
    name: 'Видео-презентация с постером и кнопкой Play',
    icon: 'smart_display',
    defaultContent: {
      title: 'Посмотрите как работает Aurora Web',
      subtitle: 'Короткий 2-минутный обзор ключевых возможностей платформы',
      poster: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1000px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
          <p style="font-size:15px;color:#94a3b8;margin-bottom:36px;">${c.subtitle}</p>
          <div style="position:relative;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);box-shadow:0 25px 50px rgba(0,0,0,0.6);aspect-ratio:16/9;background-image:url('${c.poster}');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
            <a href="${c.videoUrl}" target="_blank" style="position:relative;z-index:2;width:72px;height:72px;border-radius:50%;background:#0d99ff;color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 0 40px rgba(13,153,255,0.8);transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <span class="material-symbols-rounded" style="font-size:36px;margin-left:4px;">play_arrow</span>
            </a>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'store-order',
    cat: 'store',
    category: 'store',
    name: 'Форма заказа и доставки товаров (ST400)',
    icon: 'local_shipping',
    defaultContent: {
      title: 'Оформление заказа',
      subtitle: 'Заполните данные для доставки и выберите удобный способ оплаты',
      btnText: 'Подтвердить и оплатить'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="order-checkout">
        <div class="t-container" style="max-width:800px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:36px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <form class="tilda-form" data-tilda-form style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:36px 32px;display:flex;flex-direction:column;gap:16px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:6px;">Имя получателя *</label>
                <input type="text" name="name" required placeholder="Иван Иванов" style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:6px;">Телефон *</label>
                <input type="tel" name="phone" required placeholder="+7 (999) 000-00-00" style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
              </div>
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:6px;">Адрес доставки</label>
              <input type="text" name="address" placeholder="г. Москва, ул. Ленина, д. 10, кв. 25" style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:6px;">Способ доставки</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;">
                <label style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="radio" name="delivery" value="courier" checked />
                  <span style="font-size:13px;font-weight:600;">Курьер (350 ₽)</span>
                </label>
                <label style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="radio" name="delivery" value="sdek" />
                  <span style="font-size:13px;font-weight:600;">СДЭК (250 ₽)</span>
                </label>
                <label style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="radio" name="delivery" value="pickup" />
                  <span style="font-size:13px;font-weight:600;">Самовывоз (0 ₽)</span>
                </label>
              </div>
            </div>
            <button type="submit" style="width:100%;padding:16px;background:${d.accentColor};color:#fff;font-weight:800;font-size:16px;border:none;border-radius:10px;cursor:pointer;margin-top:10px;box-shadow:0 10px 25px rgba(13,153,255,0.4);">${c.btnText}</button>
          </form>
        </div>
      </div>
    `
  },

  // ─── 16. ДОПОЛНИТЕЛЬНЫЕ МОДУЛИ ─────────────────────────────
  {
    id: 'menu-2',
    cat: 'menu',
    category: 'menu',
    name: 'Плавающая шапка с корзиной и поиском',
    icon: 'tab',
    defaultContent: {
      brand: 'AURORA SHOP',
      phone: '+7 (800) 555-35-35',
      btnText: 'Личный кабинет'
    },
    defaultDesign: {
      bgColor: 'rgba(15, 23, 42, 0.9)',
      textColor: '#ffffff',
      accentColor: '#0d99ff'
    },
    html: (c, d) => `
      <header class="t-block" style="background:${d.bgColor};backdrop-filter:blur(10px);color:${d.textColor};border-bottom:1px solid rgba(255,255,255,0.1);padding:14px 24px;position:sticky;top:0;z-index:900;">
        <div class="t-container" style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div style="font-weight:900;font-size:18px;display:flex;align-items:center;gap:8px;">
            <span class="material-symbols-rounded" style="color:${d.accentColor};">store</span>
            <span>${c.brand}</span>
          </div>
          <div style="display:flex;align-items:center;gap:20px;">
            <a href="tel:${c.phone}" style="color:#cbd5e1;font-weight:600;font-size:13px;text-decoration:none;display:flex;align-items:center;gap:6px;">
              <span class="material-symbols-rounded" style="font-size:18px;color:${d.accentColor};">phone</span>
              <span>${c.phone}</span>
            </a>
            <button data-tilda-cart-trigger style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;">
              <span class="material-symbols-rounded" style="font-size:18px;color:${d.accentColor};">shopping_cart</span>
              <span data-tilda-cart-count class="tilda-cart-badge-count" style="display:none;">0</span>
            </button>
          </div>
        </div>
      </header>
    `
  },
  {
    id: 'gallery-2',
    cat: 'gallery',
    category: 'gallery',
    name: 'Слайдер изображений с точками навигации',
    icon: 'view_carousel',
    defaultContent: {
      slides: [
        { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80', title: 'Современный цифровой офис' },
        { src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80', title: 'Творческая команда разработчиков' },
        { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80', title: 'Аналитика и планирование' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      padding: '70px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;position:relative;" data-tilda-slider>
          <div style="overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,0.1);position:relative;height:440px;">
            <div class="tilda-slider-track" style="display:flex;height:100%;transition:transform 0.4s ease;">
              ${(c.slides || []).map(s => `
                <div class="tilda-slide" style="flex:0 0 100%;height:100%;position:relative;background-image:url('${s.src}');background-size:cover;background-position:center;">
                  <div style="position:absolute;bottom:0;inset-inline:0;padding:30px;background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);color:#fff;font-weight:700;font-size:18px;">${s.title}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;" data-slider-dots></div>
        </div>
      </div>
    `
  },
  {
    id: 'pricing-2',
    cat: 'pricing',
    category: 'pricing',
    name: 'Таблица сравнения функций тарифов',
    icon: 'table_chart',
    defaultContent: {
      title: 'Сравнение возможностей тарифов',
      features: [
        { name: 'Количество страниц', basic: 'До 3', pro: 'Безлимит', corp: 'Безлимит' },
        { name: 'Zero Block редактор', basic: '—', pro: '✓', corp: '✓' },
        { name: 'Корзина и оплата заказов', basic: '—', pro: '✓', corp: '✓' },
        { name: 'Экспорт исходного кода ZIP', basic: '—', pro: '✓', corp: '✓' },
        { name: 'Приоритетная поддержка', basic: 'Email', pro: 'Telegram', corp: '24/7 Выделенный менеджер' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1000px;margin:0 auto;">
          <h2 style="font-size:2.2rem;font-weight:800;text-align:center;margin-bottom:40px;">${c.title}</h2>
          <div style="background:#131c2e;border:1px solid #233047;border-radius:16px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;text-align:left;font-size:14px;">
              <thead>
                <tr style="background:#1e293b;border-bottom:1px solid #334155;">
                  <th style="padding:16px 20px;color:#94a3b8;font-weight:700;">Функция</th>
                  <th style="padding:16px 20px;font-weight:700;color:#fff;">Базовый</th>
                  <th style="padding:16px 20px;font-weight:700;color:#0d99ff;">PRO</th>
                  <th style="padding:16px 20px;font-weight:700;color:#10b981;">Корпоративный</th>
                </tr>
              </thead>
              <tbody>
                ${(c.features || []).map((f, i) => `
                  <tr style="border-bottom:1px solid #1f293d;background:${i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'};">
                    <td style="padding:14px 20px;font-weight:600;color:#cbd5e1;">${f.name}</td>
                    <td style="padding:14px 20px;color:#94a3b8;">${f.basic}</td>
                    <td style="padding:14px 20px;color:#fff;font-weight:700;">${f.pro}</td>
                    <td style="padding:14px 20px;color:#fff;font-weight:700;">${f.corp}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'contacts-2',
    cat: 'contacts',
    category: 'contacts',
    name: 'Карта офиса с плавающим окном контактов',
    icon: 'map',
    defaultContent: {
      address: 'г. Москва, Пресненская наб., 12',
      phone: '+7 (495) 123-45-67',
      email: 'info@auroraweb.ru'
    },
    defaultDesign: {
      height: '420px'
    },
    html: (c, d) => `
      <div class="t-block" style="position:relative;height:${d.height};background:#070a13;overflow:hidden;">
        <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Asample&amp;source=constructor" width="100%" height="100%" frameborder="0" style="filter:invert(90%) hue-rotate(180deg);opacity:0.85;"></iframe>
        <div style="position:absolute;top:30px;left:30px;background:rgba(18,24,38,0.92);backdrop-filter:blur(8px);border:1px solid #233047;border-radius:14px;padding:24px;max-width:320px;color:#fff;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <div style="font-weight:800;font-size:16px;margin-bottom:10px;">Главный офис</div>
          <div style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:12px;">📍 ${c.address}</div>
          <div style="font-size:13px;color:#94a3b8;margin-bottom:6px;">📞 <a href="tel:${c.phone}" style="color:#0d99ff;text-decoration:none;font-weight:600;">${c.phone}</a></div>
          <div style="font-size:13px;color:#94a3b8;">✉️ <a href="mailto:${c.email}" style="color:#0d99ff;text-decoration:none;font-weight:600;">${c.email}</a></div>
        </div>
      </div>
    `
  },

  // ─── РАСШИРЕННЫЕ БЛОКИ ПО КАТЕГОРИЯМ ─────────────────────────
  {
    id: 'cover-5',
    cat: 'cover',
    category: 'cover',
    name: 'Киберпанк Hero с анимированным градиентом и статистикой',
    icon: 'auto_awesome',
    defaultContent: {
      badge: '⚡ AURORA ENGINE 3.0',
      title: 'Создавайте цифровые вселенные без единой строчки кода',
      subtitle: 'Интерактивный визуальный движок нового поколения: мгновенный рендеринг, Zero Block с анимациями, встроенный e-commerce и умные квизы.',
      btnPrimary: 'Запустить конструктор',
      btnSecondary: 'Смотреть шоурил',
      stats: [
        { val: '120K+', label: 'Активных сайтов' },
        { val: '0.2s', label: 'Скорость отклика' },
        { val: '99.98%', label: 'Uptime облака' }
      ]
    },
    defaultDesign: {
      bgColor: '#050811',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '110px 24px 90px'
    },
    html: (c, d) => `
      <div class="t-block t-cover" style="position:relative;background:${d.bgColor};color:${d.textColor};padding:${d.padding};overflow:hidden;">
        <div style="position:absolute;top:-20%;left:-10%;width:520px;height:520px;background:radial-gradient(circle, rgba(13,153,255,0.28) 0%, transparent 70%);filter:blur(60px);pointer-events:none;"></div>
        <div style="position:absolute;bottom:-20%;right:-10%;width:560px;height:560px;background:radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%);filter:blur(70px);pointer-events:none;"></div>
        <div class="t-container" style="position:relative;z-index:2;max-width:1120px;margin:0 auto;text-align:center;">
          <div class="t-badge" style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;background:rgba(13,153,255,0.12);border:1px solid rgba(13,153,255,0.35);border-radius:999px;font-size:12px;font-weight:800;color:${d.accentColor};letter-spacing:1px;margin-bottom:24px;">${c.badge}</div>
          <h1 style="font-size:clamp(2.4rem, 5.5vw, 4.2rem);font-weight:900;line-height:1.1;letter-spacing:-1px;margin-bottom:24px;background:linear-gradient(135deg,#ffffff 0%,#93c5fd 55%,#c4b5fd 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${c.title}</h1>
          <p style="font-size:clamp(1.05rem, 2vw, 1.25rem);color:#94a3b8;max-width:780px;margin:0 auto 38px;line-height:1.7;">${c.subtitle}</p>
          <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:64px;">
            <a href="#order" class="t-btn" style="padding:16px 36px;background:linear-gradient(135deg, ${d.accentColor}, #6366f1);color:#fff;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;box-shadow:0 12px 35px rgba(13,153,255,0.4);">${c.btnPrimary}</a>
            <a href="#media" class="t-btn" style="padding:16px 32px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:12px;font-weight:700;font-size:16px;text-decoration:none;backdrop-filter:blur(8px);">${c.btnSecondary}</a>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:20px;max-width:860px;margin:0 auto;padding:24px;background:rgba(15,23,42,0.75);border:1px solid rgba(255,255,255,0.08);border-radius:18px;backdrop-filter:blur(12px);">
            ${(c.stats || []).map(s => `
              <div>
                <div style="font-size:2.2rem;font-weight:900;color:#fff;margin-bottom:4px;">${s.val}</div>
                <div style="font-size:13px;color:#94a3b8;font-weight:600;">${s.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'text-3',
    cat: 'text',
    category: 'text',
    name: 'Текстовый блок с акцентной врезкой и списком',
    icon: 'article',
    defaultContent: {
      title: 'Архитектура современного визуального веба',
      lead: 'Переход на компонентный подход позволяет командам запускать маркетинговые кампании в 5 раз быстрее без потери качества верстки.',
      callout: '💡 Ключевой инсайт: 78% пользователей оценивают надежность компании по качеству мобильной версии сайта в первые 3 секунды.',
      bullets: [
        'Семантическая HTML5-разметка и мгновенная индексация поисковыми системами',
        'Адаптивная сетка CSS Grid и Flexbox без жестких привязок к ширине экрана',
        'Поддержка темной и светлой палитры на уровне системных дизайн-токенов'
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#e2e8f0',
      accentColor: '#0d99ff',
      padding: '70px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:820px;margin:0 auto;">
          <h2 style="font-size:2.1rem;font-weight:800;color:#fff;margin-bottom:16px;">${c.title}</h2>
          <p style="font-size:1.1rem;line-height:1.8;color:#94a3b8;margin-bottom:24px;">${c.lead}</p>
          <blockquote style="margin:0 0 28px 0;padding:20px 24px;background:rgba(13,153,255,0.1);border-left:4px solid ${d.accentColor};border-radius:0 12px 12px 0;font-weight:600;color:#f8fafc;line-height:1.6;">${c.callout}</blockquote>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
            ${(c.bullets || []).map(b => `
              <li style="display:flex;align-items:flex-start;gap:10px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                <span class="material-symbols-rounded" style="color:${d.accentColor};font-size:20px;margin-top:2px;">check_circle</span>
                <span>${b}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'features-3',
    cat: 'features',
    category: 'features',
    name: 'Сетка фич в стиле Bento Grid (4 карточки)',
    icon: 'dashboard',
    defaultContent: {
      title: 'Экосистема инструментов в стиле Bento',
      subtitle: 'Все модули связаны в единое пространство для быстрой разработки и аналитики',
      items: [
        { span: '2', icon: 'bolt', badge: 'CORE ENGINE', title: 'Сверхбыстрый рендеринг блоков на лету', desc: 'Редактируйте контент прямо на холсте, двигайте элементы мышкой и мгновенно проверяйте результат на всех разрешениях экрана.' },
        { span: '1', icon: 'palette', badge: 'UI KIT', title: 'Умные темы оформления', desc: 'Глобальное переключение цветовых схем и шрифтовых пар в 1 клик.' },
        { span: '1', icon: 'shopping_bag', badge: 'E-COMMERCE', title: 'Встроенная корзина и каталог', desc: 'Принимайте заказы с фильтрацией товаров и подсчетом суммы.' },
        { span: '2', icon: 'monitoring', badge: 'ANALYTICS & CRM', title: 'Интеграция форм, квизов и сбора заявок', desc: 'Все отправленные лиды автоматически сохраняются и готовы к выгрузке или отправке в Telegram.' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '90px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:50px;">
            <h2 style="font-size:2.5rem;font-weight:800;margin-bottom:12px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:20px;">
            ${(c.items || []).map(item => `
              <div class="t-feature-card" style="grid-column:span ${item.span === '2' ? '2' : '1'};background:linear-gradient(145deg, #131c2e 0%, #0f172a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                    <span style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1px;padding:4px 10px;background:rgba(13,153,255,0.12);border-radius:6px;">${item.badge}</span>
                    <span class="material-symbols-rounded" style="font-size:28px;color:${d.accentColor};">${item.icon}</span>
                  </div>
                  <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:12px;color:#fff;">${item.title}</h3>
                  <p style="font-size:14px;color:#94a3b8;line-height:1.65;">${item.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'features-4',
    cat: 'features',
    category: 'features',
    name: 'Горизонтальные карточки преимуществ с номерами (01–04)',
    icon: 'view_stream',
    defaultContent: {
      title: 'Почему лидеры рынка выбирают нас',
      items: [
        { num: '01', title: 'Чистый код без лишних библиотек', desc: 'Сгенерированные страницы весят менее 50 КБ и набирают 98–100 баллов в Google PageSpeed Insights.' },
        { num: '02', title: 'Полная свобода позиционирования', desc: 'Комбинируйте готовые адаптивные секции со свободным холстом Zero Block и послойной анимацией.' },
        { num: '03', title: 'Мгновенный экспорт в самодостаточный HTML', desc: 'Скачивайте готовый проект одним файлом или архивом и размещайте на любом сервере без привязки к платформе.' },
        { num: '04', title: 'Готовые интерактивные механики', desc: 'Встроенные модальные окна, лайтбоксы с зумом, табы, квизы, фильтры каталога и корзина заказов.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1050px;margin:0 auto;">
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:40px;text-align:center;">${c.title}</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${(c.items || []).map(item => `
              <div class="t-feature-card" style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 32px;display:flex;align-items:center;gap:28px;flex-wrap:wrap;">
                <div style="font-size:2.8rem;font-weight:900;color:${d.accentColor};line-height:1;min-width:64px;">${item.num}</div>
                <div style="flex:1;min-width:240px;">
                  <h3 style="font-size:1.25rem;font-weight:800;margin-bottom:6px;color:#fff;">${item.title}</h3>
                  <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0;">${item.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'features-5',
    cat: 'features',
    category: 'features',
    name: 'Интерактивные вкладки (Табы) возможностей',
    icon: 'tab',
    defaultContent: {
      title: 'Изучите возможности платформы по направлениям',
      subtitle: 'Переключайте вкладки, чтобы увидеть инструменты для каждой роли',
      tabs: [
        {
          id: 'tab1',
          label: '🎨 Веб-дизайн',
          heading: 'Визуальный редактор уровня Figma + Zero Block',
          desc: 'Настраивайте сетку, типографику, градиенты и кастомные анимации при скролле. Перетаскивайте любые элементы прямо на холсте.',
          img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
          bullet1: '8-точечный ресайз и вращение слоев',
          bullet2: 'Готовые цветовые палитры и Google Fonts'
        },
        {
          id: 'tab2',
          label: '🛒 Электронная коммерция',
          heading: 'Полноценный интернет-магазин за 15 минут',
          desc: 'Витрины с фильтрацией по категориям, карточки товаров с галереей, плавающий виджет корзины и форма быстрого заказа.',
          img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
          bullet1: 'Автоматический пересчет суммы в корзине',
          bullet2: 'Фильтры по тегам и категориям без перезагрузки'
        },
        {
          id: 'tab3',
          label: '📈 Маркетинг и лиды',
          heading: 'Пошаговые квизы, формы захвата и аналитика',
          desc: 'Повышайте конверсию лендинга в 2.5 раза с помощью интерактивных квизов, таймеров обратного отсчета и лид-магнитов.',
          img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
          bullet1: 'Сохранение заявок в памяти и уведомления',
          bullet2: 'Валидация полей и кастомные экраны успеха'
        }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" data-tilda-tabs>
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:36px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:32px;">
            ${(c.tabs || []).map((t, i) => `
              <button type="button" data-tab-btn="${t.id}" class="${i === 0 ? 'is-active' : ''}" onclick="const root=this.closest('[data-tilda-tabs]');root.querySelectorAll('[data-tab-btn]').forEach(b=>{b.classList.remove('is-active');b.style.background='#1e293b';});this.classList.add('is-active');this.style.background='${d.accentColor}';root.querySelectorAll('[data-tab-pane]').forEach(p=>{p.style.display=p.getAttribute('data-tab-pane')==='${t.id}'?'grid':'none';});" style="padding:12px 24px;border-radius:10px;border:1px solid #334155;background:${i === 0 ? d.accentColor : '#1e293b'};color:#fff;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;">${t.label}</button>
            `).join('')}
          </div>
          ${(c.tabs || []).map((t, i) => `
            <div data-tab-pane="${t.id}" style="display:${i === 0 ? 'grid' : 'none'};grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:40px;align-items:center;background:#131c2e;border:1px solid #233047;border-radius:20px;padding:36px;">
              <div>
                <h3 style="font-size:1.75rem;font-weight:800;margin-bottom:14px;color:#fff;">${t.heading}</h3>
                <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin-bottom:24px;">${t.desc}</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#cbd5e1;"><span class="material-symbols-rounded" style="color:#10b981;">check_circle</span><span>${t.bullet1}</span></div>
                  <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#cbd5e1;"><span class="material-symbols-rounded" style="color:#10b981;">check_circle</span><span>${t.bullet2}</span></div>
                </div>
              </div>
              <div>
                <img src="${t.img}" alt="${t.heading}" data-lightbox="true" data-caption="${t.heading}" style="width:100%;border-radius:14px;border:1px solid rgba(255,255,255,0.1);cursor:zoom-in;" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  },
  {
    id: 'gallery-3',
    cat: 'gallery',
    category: 'gallery',
    name: 'Сетка До / После и 3 карточки с подписями и зумом',
    icon: 'compare',
    defaultContent: {
      title: 'Трансформация визуального стиля',
      subtitle: 'Нажмите на карточку для детального просмотра в лайтбоксе',
      cards: [
        { tag: 'ДО РЕДИЗАЙНА', title: 'Устаревший корпоративный портал', desc: 'Сложная навигация и отсутствие мобильной адаптации.', img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80' },
        { tag: 'ПОСЛЕ РЕДИЗАЙНА', title: 'Современная дизайн-система Aurora', desc: 'Рост конверсии на 64% и время загрузки 0.4 сек.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80' },
        { tag: 'МОБИЛЬНАЯ ВЕРСИЯ', title: 'Адаптивный интерфейс приложения', desc: 'Безупречный UX на смартфонах и планшетах.', img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-gallery" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(310px, 1fr));gap:24px;">
            ${(c.cards || []).map(card => `
              <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
                <div style="height:220px;position:relative;overflow:hidden;">
                  <span style="position:absolute;top:12px;left:12px;z-index:2;background:rgba(7,10,19,0.85);color:${d.accentColor};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;">${card.tag}</span>
                  <img src="${card.img}" alt="${card.title}" data-lightbox="true" data-caption="${card.title} — ${card.desc}" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
                </div>
                <div style="padding:20px 24px;">
                  <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:6px;color:#fff;">${card.title}</h3>
                  <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin:0;">${card.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'gallery-4',
    cat: 'gallery',
    category: 'gallery',
    name: 'Masonry-галерея из 6 фото разной высоты',
    icon: 'auto_awesome_mosaic',
    defaultContent: {
      title: 'Атмосфера и кадры из жизни студии',
      subtitle: 'Мозаичная сетка фотографий с поддержкой полноэкранного просмотра',
      photos: [
        { src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', h: '320px', caption: 'Опенспейс и переговорная' },
        { src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', h: '220px', caption: 'Брейншторм продуктовой команды' },
        { src: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80', h: '280px', caption: 'Проектирование дизайн-системы' },
        { src: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&q=80', h: '220px', caption: 'Разработка фронтенд-ядра' },
        { src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80', h: '320px', caption: 'Презентация стратегии клиенту' },
        { src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80', h: '260px', caption: 'Командный хакатон' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-gallery" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="columns:3 300px;column-gap:20px;">
            ${(c.photos || []).map(p => `
              <div style="break-inside:avoid;margin-bottom:20px;border-radius:14px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,0.1);height:${p.h || '260px'};">
                <img src="${p.src}" alt="${p.caption}" data-lightbox="true" data-caption="${p.caption}" style="width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" />
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'gallery-5',
    cat: 'gallery',
    category: 'gallery',
    name: 'Широкоформатный шоурил с горизонтальными карточками',
    icon: 'Burst_mode',
    defaultContent: {
      title: 'Визуальный шоурил лучших релизов 2026',
      subtitle: 'Панорамная витрина избранных концептов и промо-страниц',
      items: [
        { title: 'CyberBank Neo App', tag: 'FINTECH UI/UX', img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=900&q=80' },
        { title: 'NeuroCloud AI Platform', tag: 'SAAS WEB DESIGN', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80' },
        { title: 'Spatial Vision OS Store', tag: '3D E-COMMERCE', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block t-gallery" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1200px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
            <div>
              <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:6px;">${c.title}</h2>
              <p style="font-size:15px;color:#94a3b8;margin:0;">${c.subtitle}</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:24px;">
            ${(c.items || []).map(it => `
              <div style="position:relative;height:290px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);">
                <img src="${it.img}" alt="${it.title}" data-lightbox="true" data-caption="${it.title}" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform 0.35s;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'" />
                <div style="position:absolute;inset:auto 0 0 0;padding:24px;background:linear-gradient(to top, rgba(7,10,19,0.92), transparent);pointer-events:none;">
                  <div style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1px;margin-bottom:4px;">${it.tag}</div>
                  <div style="font-size:1.3rem;font-weight:800;color:#fff;">${it.title}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'form-2',
    cat: 'form',
    category: 'form',
    name: 'Горизонтальная форма подписки / лид-магнит с подарком',
    icon: 'card_giftcard',
    defaultContent: {
      badge: '🎁 ПОДАРОК ЗА ПОДПИСКУ',
      title: 'Скачайте PDF-гайд «50 приемов высокой конверсии лендингов»',
      subtitle: 'Оставьте ваш Email — мы мгновенно пришлем ссылку на закрытый чек-лист и шаблоны блоков.',
      btnText: 'Получить гайд бесплатно'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '70px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1050px;margin:0 auto;background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);border:1px solid #334155;border-radius:22px;padding:44px 36px;display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:32px;align-items:center;">
          <div>
            <div style="display:inline-block;padding:5px 12px;background:rgba(16,185,129,0.15);color:#10b981;border-radius:8px;font-size:11px;font-weight:800;margin-bottom:12px;">${c.badge}</div>
            <h2 style="font-size:1.85rem;font-weight:800;margin-bottom:10px;line-height:1.25;">${c.title}</h2>
            <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0;">${c.subtitle}</p>
          </div>
          <form class="tilda-form" data-tilda-form style="display:flex;flex-direction:column;gap:12px;">
            <input type="email" name="email" required placeholder="Ваш рабочий Email *" style="padding:15px 18px;background:#0b0f19;border:1px solid #334155;border-radius:10px;color:#fff;font-size:14px;outline:none;" />
            <button type="submit" style="padding:15px 24px;background:${d.accentColor};color:#fff;border:none;border-radius:10px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 8px 24px rgba(13,153,255,0.35);">${c.btnText}</button>
          </form>
        </div>
      </div>
    `
  },
  {
    id: 'form-3',
    cat: 'form',
    category: 'form',
    name: 'Двухколоночная форма записи на консультацию с выбором услуги',
    icon: 'event_available',
    defaultContent: {
      title: 'Запишитесь на стратегическую сессию с экспертом',
      subtitle: 'Разберем вашу задачу, покажем релевантные кейсы и составим дорожную карту запуска проекта.',
      phone: '+7 (495) 900-88-77',
      email: 'consult@auroraweb.ru',
      btnText: 'Забронировать консультацию'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:48px;align-items:center;">
          <div>
            <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:14px;line-height:1.2;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin-bottom:28px;">${c.subtitle}</p>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14px;color:#cbd5e1;">
              <div>📞 Прямая линия: <strong style="color:#fff;">${c.phone}</strong></div>
              <div>✉️ Почта отдела заботы: <strong style="color:${d.accentColor};">${c.email}</strong></div>
            </div>
          </div>
          <form class="tilda-form" data-tilda-form style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:32px;display:flex;flex-direction:column;gap:14px;">
            <input type="text" name="name" required placeholder="Ваше имя *" style="padding:13px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
            <input type="tel" name="phone" required placeholder="Телефон / Telegram *" style="padding:13px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
            <select name="service" required style="padding:13px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;">
              <option value="landing">Разработка продающего лендинга</option>
              <option value="ecommerce">Запуск интернет-магазина</option>
              <option value="design">Дизайн-система и брендинг</option>
              <option value="audit">UX/UI аудит текущего сайта</option>
            </select>
            <button type="submit" style="padding:15px;background:${d.accentColor};color:#fff;border:none;border-radius:10px;font-weight:800;font-size:15px;cursor:pointer;margin-top:6px;">${c.btnText}</button>
          </form>
        </div>
      </div>
    `
  },
  {
    id: 'form-4',
    cat: 'form',
    category: 'form',
    name: 'Интерактивный пошаговый Квиз расчета стоимости',
    icon: 'quiz',
    defaultContent: {
      title: 'Рассчитайте стоимость вашего проекта за 3 шага',
      subtitle: 'Ответьте на короткие вопросы и получите смету + бонусную скидку 15%',
      btnText: 'Получить расчет стоимости'
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" data-tilda-quiz>
        <div class="t-container" style="max-width:820px;margin:0 auto;background:#131c2e;border:1px solid #233047;border-radius:20px;padding:40px 32px;">
          <div style="text-align:center;margin-bottom:28px;">
            <h2 style="font-size:2rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:14px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <form class="tilda-form" data-tilda-form style="display:flex;flex-direction:column;gap:20px;">
            <div data-quiz-step="1" style="background:#1e293b;padding:20px;border-radius:12px;border:1px solid #334155;">
              <div style="font-size:12px;font-weight:800;color:${d.accentColor};margin-bottom:8px;">ШАГ 1 ИЗ 3</div>
              <div style="font-weight:700;font-size:16px;margin-bottom:12px;">1. Какой тип проекта вам необходим?</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_type" value="Лендинг" checked /> Продающий лендинг</label>
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_type" value="Магазин" /> Интернет-магазин</label>
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_type" value="Корпоративный" /> Корпоративный портал</label>
              </div>
            </div>
            <div data-quiz-step="2" style="background:#1e293b;padding:20px;border-radius:12px;border:1px solid #334155;">
              <div style="font-size:12px;font-weight:800;color:${d.accentColor};margin-bottom:8px;">ШАГ 2 ИЗ 3</div>
              <div style="font-weight:700;font-size:16px;margin-bottom:12px;">2. Когда планируете запуск проекта?</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_deadline" value="Срочно (3-5 дней)" checked /> Срочно (3–5 дней)</label>
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_deadline" value="В течение месяца" /> В течение месяца</label>
                <label style="padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;"><input type="radio" name="quiz_deadline" value="Пока прицениваюсь" /> Пока прицениваюсь</label>
              </div>
            </div>
            <div data-quiz-step="3" style="background:#1e293b;padding:20px;border-radius:12px;border:1px solid #334155;">
              <div style="font-size:12px;font-weight:800;color:#10b981;margin-bottom:8px;">ФИНАЛЬНЫЙ ШАГ — КУДА ОТПРАВИТЬ РАСЧЕТ?</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;">
                <input type="text" name="name" required placeholder="Ваше имя *" style="padding:12px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
                <input type="tel" name="phone" required placeholder="+7 (999) 000-00-00 *" style="padding:12px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;outline:none;" />
              </div>
            </div>
            <button type="submit" style="padding:16px;background:${d.accentColor};color:#fff;font-weight:800;font-size:16px;border:none;border-radius:10px;cursor:pointer;box-shadow:0 10px 25px rgba(13,153,255,0.35);">${c.btnText}</button>
          </form>
        </div>
      </div>
    `
  },
  {
    id: 'form-5',
    cat: 'form',
    category: 'form',
    name: 'Акцентный CTA-блок с таймером акции и кнопкой заказа',
    icon: 'timer',
    defaultContent: {
      badge: '🔥 СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ',
      title: 'Скидка 40% на годовой доступ к платформе Aurora Pro',
      subtitle: 'Успейте активировать премиум-тариф со всеми блоками, интернет-магазином и экспортом кода.',
      btnText: 'Забрать скидку 40%'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1050px;margin:0 auto;background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #0c4a6e 100%);border:1px solid rgba(13,153,255,0.35);border-radius:24px;padding:52px 32px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5);">
          <div class="t-badge" style="display:inline-block;padding:6px 16px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.5);color:#fbbf24;border-radius:99px;font-size:12px;font-weight:800;margin-bottom:18px;">${c.badge}</div>
          <h2 style="font-size:clamp(1.8rem, 4vw, 2.7rem);font-weight:900;margin-bottom:12px;">${c.title}</h2>
          <p style="font-size:16px;color:#cbd5e1;max-width:680px;margin:0 auto 30px;line-height:1.6;">${c.subtitle}</p>
          <div style="display:flex;justify-content:center;gap:14px;margin-bottom:34px;flex-wrap:wrap;" data-tilda-timer>
            ${[{ v: '02', l: 'Дня' }, { v: '14', l: 'Часов' }, { v: '38', l: 'Минут' }, { v: '45', l: 'Секунд' }].map(t => `
              <div style="min-width:82px;padding:14px 12px;background:rgba(7,10,19,0.65);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
                <div style="font-size:1.9rem;font-weight:900;color:#fff;line-height:1;">${t.v}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;font-weight:600;">${t.l}</div>
              </div>
            `).join('')}
          </div>
          <a href="#order" class="t-btn" style="display:inline-flex;padding:16px 40px;background:${d.accentColor};color:#fff;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;box-shadow:0 12px 30px rgba(13,153,255,0.45);">${c.btnText}</a>
        </div>
      </div>
    `
  },
  {
    id: 'pricing-3',
    cat: 'pricing',
    category: 'pricing',
    name: 'Двухколоночный тариф: Подписка vs Вечная лицензия',
    icon: 'workspace_premium',
    defaultContent: {
      title: 'Инвестируйте в развитие своего продукта',
      subtitle: 'Выберите гибкую помесячную оплату или единоразовый выкуп вечной лицензии',
      plan1Name: 'Облачная подписка PRO',
      plan1Price: '1 990 ₽ / мес',
      plan1Desc: 'Оптимально для быстрого запуска и тестирования ниши',
      plan2Name: 'Вечная лицензия Lifetime',
      plan2Price: '19 900 ₽ навсегда',
      plan2Desc: 'Единоразовый платеж без абонентской платы + исходный код'
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:980px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:28px;">
            <div class="t-pricing-card" style="background:#131c2e;border:1px solid #283548;border-radius:20px;padding:36px;">
              <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:8px;">${c.plan1Name}</h3>
              <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;">${c.plan1Desc}</p>
              <div style="font-size:2.4rem;font-weight:900;color:#fff;margin-bottom:24px;">${c.plan1Price}</div>
              <a href="#order" class="t-btn" style="display:block;text-align:center;padding:14px;border:1px solid ${d.accentColor};color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Начать подписку</a>
            </div>
            <div class="t-pricing-card" style="background:linear-gradient(145deg,#1e293b,#0f172a);border:2px solid ${d.accentColor};border-radius:20px;padding:36px;position:relative;box-shadow:0 20px 45px rgba(13,153,255,0.2);">
              <span style="position:absolute;top:16px;right:16px;background:#10b981;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;">ВЫГОДА 65%</span>
              <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:8px;">${c.plan2Name}</h3>
              <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;">${c.plan2Desc}</p>
              <div style="font-size:2.4rem;font-weight:900;color:#10b981;margin-bottom:24px;">${c.plan2Price}</div>
              <a href="#order" class="t-btn" style="display:block;text-align:center;padding:14px;background:${d.accentColor};color:#fff;border-radius:10px;font-weight:800;text-decoration:none;">Купить лицензию навсегда</a>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'testimonials-2',
    cat: 'testimonials',
    category: 'testimonials',
    name: 'Отзывы с видео-превью и рейтингом 5 звезд',
    icon: 'video_camera_front',
    defaultContent: {
      title: 'Видео-отзывы владельцев бизнеса',
      subtitle: 'Посмотрите живые впечатления клиентов от работы на нашей платформе',
      reviews: [
        { name: 'Максим Лазарев', role: 'Основатель сети кофеен', quote: 'Запустили сайт доставки за один вечер. Заказы падают прямо в Telegram!', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80' },
        { name: 'Анна Романова', role: 'Арт-директор Digital-агентства', quote: 'Перевели всю студию на Aurora Tilda — скорость верстки выросла втрое.', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80' },
        { name: 'Игорь Демидов', role: 'Продюсер онлайн-школы', quote: 'Квизы и формы окупают подписку с первого же дня рекламного трафика.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:48px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:10px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(310px, 1fr));gap:24px;">
            ${(c.reviews || []).map(r => `
              <div style="background:#1e293b;border:1px solid #334155;border-radius:18px;overflow:hidden;">
                <div style="height:200px;position:relative;overflow:hidden;">
                  <img src="${r.img}" alt="${r.name}" data-lightbox="true" data-caption="${r.name} — ${r.role}" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;" />
                  <div style="position:absolute;bottom:12px;right:12px;width:42px;height:42px;border-radius:50%;background:${d.accentColor};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.4);pointer-events:none;"><span class="material-symbols-rounded">play_arrow</span></div>
                </div>
                <div style="padding:22px;">
                  <div style="color:#fbbf24;font-size:15px;margin-bottom:8px;">★★★★★</div>
                  <p style="font-size:14px;color:#e2e8f0;line-height:1.6;margin-bottom:14px;">«${r.quote}»</p>
                  <div style="font-weight:700;font-size:14px;color:#fff;">${r.name}</div>
                  <div style="font-size:12px;color:#94a3b8;">${r.role}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'testimonials-3',
    cat: 'testimonials',
    category: 'testimonials',
    name: 'Крупный кейс-отзыв клиента с цитатой и метриками роста',
    icon: 'format_quote',
    defaultContent: {
      badge: 'ИСТОРИЯ УСПЕХА КЛИЕНТА',
      quote: '«После перехода на новый модульный лендинг и внедрения квиз-калькулятора стоимость привлечения клиента снизилась в 2.4 раза, а выручка с онлайн-заявок выросла на 180% за первый квартал.»',
      author: 'Виктор Соколов',
      role: 'Управляющий партнер группы компаний «СтройИнвест»',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80',
      metric1Val: '+180%',
      metric1Label: 'Рост онлайн-выручки',
      metric2Val: '×2.4',
      metric2Label: 'Снижение стоимости лида'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;background:#131c2e;border:1px solid #233047;border-radius:24px;padding:44px;display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:40px;align-items:center;">
          <div>
            <div style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1.2px;margin-bottom:14px;">${c.badge}</div>
            <blockquote style="font-size:1.35rem;font-weight:700;line-height:1.55;color:#f8fafc;margin:0 0 24px 0;">${c.quote}</blockquote>
            <div style="margin-bottom:28px;">
              <div style="font-weight:800;font-size:16px;color:#fff;">${c.author}</div>
              <div style="font-size:13px;color:#94a3b8;">${c.role}</div>
            </div>
            <div style="display:flex;gap:28px;flex-wrap:wrap;">
              <div>
                <div style="font-size:2rem;font-weight:900;color:#10b981;">${c.metric1Val}</div>
                <div style="font-size:12px;color:#94a3b8;">${c.metric1Label}</div>
              </div>
              <div>
                <div style="font-size:2rem;font-weight:900;color:${d.accentColor};">${c.metric2Val}</div>
                <div style="font-size:12px;color:#94a3b8;">${c.metric2Label}</div>
              </div>
            </div>
          </div>
          <div>
            <img src="${c.avatar}" alt="${c.author}" data-lightbox="true" data-caption="${c.author}" style="width:100%;max-height:380px;object-fit:cover;border-radius:18px;cursor:zoom-in;" />
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'testimonials-4',
    cat: 'testimonials',
    category: 'testimonials',
    name: 'Сетка из 4 карточек отзывов из соцсетей и Telegram',
    icon: 'chat',
    defaultContent: {
      title: 'Упоминания в соцсетях и Telegram-каналах',
      posts: [
        { handle: '@design_digest', platform: 'Telegram', text: 'Протестировали новый визуальный редактор Aurora — перетаскивание элементов прямо поверх готовых блоков работает просто волшебно 🔥' },
        { handle: '@alex_dev_ru', platform: 'VK Сообщество', text: 'Чистый экспортируемый HTML без мусора! Заказчик получил готовый лендинг за 3 часа, все анимации летают.' },
        { handle: '@kate_marketing', platform: 'Telegram', text: 'Встроенная корзина и фильтрация товаров по категориям сэкономили нам минимум две недели разработки.' },
        { handle: '@startup_hub', platform: 'VC / Блог', text: 'Лучшее решение для быстрого запуска MVP и проверки продуктовых гипотез в 2026 году.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <h2 style="font-size:2.3rem;font-weight:800;text-align:center;margin-bottom:44px;">${c.title}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;">
            ${(c.posts || []).map(p => `
              <div style="background:#161f33;border:1px solid #263554;border-radius:16px;padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <span style="font-weight:800;font-size:14px;color:${d.accentColor};">${p.handle}</span>
                  <span style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.06);border-radius:6px;color:#94a3b8;">${p.platform}</span>
                </div>
                <p style="font-size:14px;color:#cbd5e1;line-height:1.6;margin:0;">${p.text}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'menu-3',
    cat: 'menu',
    category: 'menu',
    name: 'Двухуровневая корпоративная шапка с топ-баром контактов',
    icon: 'menu_open',
    defaultContent: {
      city: 'Москва и вся РФ',
      workHours: 'Ежедневно 09:00 – 21:00',
      phone: '+7 (495) 777-88-99',
      brand: 'AURORA ENTERPRISE',
      btnText: 'Заказать звонок'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff'
    },
    html: (c, d) => `
      <header class="t-block" style="background:${d.bgColor};color:${d.textColor};border-bottom:1px solid #1e293b;">
        <div style="background:#0b1120;border-bottom:1px solid rgba(255,255,255,0.06);padding:8px 24px;font-size:12px;color:#94a3b8;">
          <div class="t-container" style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>📍 ${c.city} &nbsp;|&nbsp; 🕒 ${c.workHours}</div>
            <div style="font-weight:700;color:#fff;">📞 ${c.phone}</div>
          </div>
        </div>
        <div class="t-container" style="max-width:1200px;margin:0 auto;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div style="font-weight:900;font-size:19px;letter-spacing:0.5px;">${c.brand}</div>
          <nav style="display:flex;gap:22px;flex-wrap:wrap;font-size:14px;">
            <a href="#about" style="color:#cbd5e1;text-decoration:none;">О компании</a>
            <a href="#portfolio" style="color:#cbd5e1;text-decoration:none;">Кейсы</a>
            <a href="#pricing" style="color:#cbd5e1;text-decoration:none;">Цены</a>
            <a href="#contacts" style="color:#cbd5e1;text-decoration:none;">Контакты</a>
          </nav>
          <a href="#order" class="t-btn" style="padding:10px 22px;background:${d.accentColor};color:#fff;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">${c.btnText}</a>
        </div>
      </header>
    `
  },
  {
    id: 'footer-3',
    cat: 'footer',
    category: 'footer',
    name: 'Минималистичный футер с крупным логотипом и ссылками',
    icon: 'Horizontal_split',
    defaultContent: {
      bigBrand: 'AURORA.STUDIO',
      subtitle: 'Создаем эстетичные цифровые продукты с высокой конверсией',
      email: 'hello@aurora.studio',
      copyright: '© 2026 Aurora Studio. Все права защищены.'
    },
    defaultDesign: {
      bgColor: '#050811',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px 40px'
    },
    html: (c, d) => `
      <footer class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};border-top:1px solid #1e293b;">
        <div class="t-container" style="max-width:1150px;margin:0 auto;text-align:center;">
          <div style="font-size:clamp(2.4rem, 7vw, 5.2rem);font-weight:900;letter-spacing:-2px;line-height:1;margin-bottom:16px;background:linear-gradient(135deg,#fff,#64748b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${c.bigBrand}</div>
          <p style="font-size:15px;color:#94a3b8;margin-bottom:24px;">${c.subtitle}</p>
          <a href="mailto:${c.email}" style="display:inline-block;font-size:1.3rem;font-weight:800;color:${d.accentColor};text-decoration:none;margin-bottom:40px;">${c.email}</a>
          <div style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#64748b;">${c.copyright}</div>
        </div>
      </footer>
    `
  },
  {
    id: 'footer-4',
    cat: 'footer',
    category: 'footer',
    name: 'Многоколоночный корпоративный футер с подпиской',
    icon: 'view_column',
    defaultContent: {
      brand: 'AURORA CLOUD',
      desc: 'Профессиональная платформа для разработки лендингов, портфолио и интернет-магазинов.',
      copyright: '© 2026 Aurora Cloud Platform. ИНН 7700000000.'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#94a3b8',
      accentColor: '#0d99ff',
      padding: '70px 24px 30px'
    },
    html: (c, d) => `
      <footer class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};border-top:1px solid #1e293b;">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:36px;padding-bottom:44px;border-bottom:1px solid #1e293b;">
            <div>
              <div style="font-weight:900;font-size:18px;color:#fff;margin-bottom:12px;">${c.brand}</div>
              <p style="font-size:13px;line-height:1.6;color:#64748b;">${c.desc}</p>
            </div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:14px;margin-bottom:12px;">Продукт</div>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
                <a href="#features" style="color:#94a3b8;text-decoration:none;">Библиотека блоков</a>
                <a href="#zero" style="color:#94a3b8;text-decoration:none;">Zero Block редактор</a>
                <a href="#catalog" style="color:#94a3b8;text-decoration:none;">Интернет-магазин</a>
              </div>
            </div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:14px;margin-bottom:12px;">Компания</div>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
                <a href="#about" style="color:#94a3b8;text-decoration:none;">О команде</a>
                <a href="#blog" style="color:#94a3b8;text-decoration:none;">Блог и новости</a>
                <a href="#contacts" style="color:#94a3b8;text-decoration:none;">Контакты</a>
              </div>
            </div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:14px;margin-bottom:12px;">Дайджест обновлений</div>
              <form class="tilda-form" data-tilda-form style="display:flex;gap:8px;">
                <input type="email" name="email" required placeholder="Ваш Email" style="flex:1;min-width:0;padding:10px 12px;background:#131c2e;border:1px solid #283548;border-radius:8px;color:#fff;font-size:12px;" />
                <button type="submit" style="padding:10px 14px;background:${d.accentColor};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">→</button>
              </form>
            </div>
          </div>
          <div style="padding-top:24px;font-size:12px;color:#475569;text-align:center;">${c.copyright}</div>
        </div>
      </footer>
    `
  },
  {
    id: 'faq-2',
    cat: 'faq',
    category: 'faq',
    name: 'Двухколоночная сетка карточек вопросов и ответов',
    icon: 'quiz',
    defaultContent: {
      title: 'Ответы на популярные вопросы',
      subtitle: 'Все, что нужно знать перед стартом работы',
      items: [
        { q: 'Можно ли подключить свой собственный домен?', a: 'Да, вы можете привязать любой домен в настройках проекта или экспортировать чистый HTML на свой хостинг.' },
        { q: 'Работают ли формы и корзина после экспорта?', a: 'Да, встроенный клиентский рантайм полностью сохраняет интерактивность форм, лайтбокса, табов и корзины.' },
        { q: 'Адаптированы ли блоки под смартфоны?', a: 'Каждый блок построен на современной адаптивной сетке и автоматически перестраивается под мобильный экран.' },
        { q: 'Есть ли ограничения по количеству блоков?', a: 'Никаких ограничений: комбинируйте десятки секций и добавляйте кастомные элементы поверх любого блока.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:20px;">
            ${(c.items || []).map(it => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:16px;padding:26px;">
                <h3 style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span style="color:${d.accentColor};">❓</span> ${it.q}</h3>
                <p style="font-size:14px;color:#94a3b8;line-height:1.65;margin:0;">${it.a}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'faq-3',
    cat: 'faq',
    category: 'faq',
    name: 'Аккордеон FAQ + карточка прямой связи со специалистом',
    icon: 'support_agent',
    defaultContent: {
      title: 'Частые вопросы и база знаний',
      ctaTitle: 'Не нашли нужный ответ?',
      ctaDesc: 'Напишите нашему инженеру поддержки в Telegram — среднее время ответа составляет 3 минуты.',
      ctaBtn: 'Написать в поддержку',
      items: [
        { q: 'Как перенести существующий сайт на платформу?', a: 'Используйте функцию импорта или соберите аналогичную структуру из готовых модулей за 15 минут.' },
        { q: 'Как работает сохранение версий проекта?', a: 'Каждое изменение автоматически фиксируется в истории версий — вы можете откатиться к любому снимку в 1 клик.' },
        { q: 'Предоставляете ли вы закрывающие документы для юрлиц?', a: 'Да, мы работаем по ЭДО и выставляем счета для ООО и ИП без НДС.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:36px;align-items:start;">
          <div>
            <h2 style="font-size:2.2rem;font-weight:800;margin-bottom:24px;">${c.title}</h2>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${(c.items || []).map(item => `
                <details style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 20px;cursor:pointer;">
                  <summary style="font-weight:700;font-size:15px;color:#fff;">${item.q}</summary>
                  <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">${item.a}</p>
                </details>
              `).join('')}
            </div>
          </div>
          <div style="background:linear-gradient(145deg,#1e293b,#131c2e);border:1px solid #334155;border-radius:20px;padding:32px;text-align:center;">
            <span class="material-symbols-rounded" style="font-size:48px;color:${d.accentColor};margin-bottom:12px;">support_agent</span>
            <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:10px;">${c.ctaTitle}</h3>
            <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px;">${c.ctaDesc}</p>
            <a href="#order" class="t-btn" style="display:inline-block;padding:14px 28px;background:${d.accentColor};color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">${c.ctaBtn}</a>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'media-2',
    cat: 'media',
    category: 'media',
    name: 'Аудио / Видео плейлист с таймкодами эпизодов',
    icon: 'podcasts',
    defaultContent: {
      title: 'Подкаст и видео-уроки по веб-дизайну',
      subtitle: 'Слушайте и смотрите практические разборы прямо на странице',
      episodes: [
        { num: 'Эпизод 01', title: 'Как проектировать первый экран с конверсией 18%+', duration: '14:20' },
        { num: 'Эпизод 02', title: 'Психология цвета и темной темы в современных SaaS', duration: '21:05' },
        { num: 'Эпизод 03', title: 'Анимации в Zero Block: баланс эстетики и скорости', duration: '18:45' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="media">
        <div class="t-container" style="max-width:950px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:40px;">
            <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${(c.episodes || []).map(ep => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:14px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:16px;">
                  <button type="button" onclick="alert('Воспроизведение: ${ep.title}')" style="width:46px;height:46px;border-radius:50%;background:${d.accentColor};color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;"><span class="material-symbols-rounded">play_arrow</span></button>
                  <div>
                    <div style="font-size:11px;font-weight:800;color:${d.accentColor};">${ep.num}</div>
                    <div style="font-size:16px;font-weight:700;color:#fff;">${ep.title}</div>
                  </div>
                </div>
                <span style="font-size:13px;font-weight:700;color:#94a3b8;padding:6px 12px;background:#1e293b;border-radius:8px;">⏱ ${ep.duration}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'contacts-3',
    cat: 'contacts',
    category: 'contacts',
    name: 'Контакты с карточками мессенджеров (Telegram, WhatsApp, VK)',
    icon: 'send',
    defaultContent: {
      title: 'Выберите удобный мессенджер для связи',
      subtitle: 'Отвечаем в чатах за 2 минуты без ожидания на линии',
      channels: [
        { name: 'Telegram-бот и чат', handle: '@aurora_support', desc: 'Быстрые консультации и техподдержка 24/7', color: '#0ea5e9' },
        { name: 'WhatsApp Business', handle: '+7 (999) 123-45-67', desc: 'Расчет сметы и согласование договора', color: '#10b981' },
        { name: 'Сообщество ВКонтакте', handle: 'vk.com/aurora_web', desc: 'Кейсы, обновления и прямые эфиры', color: '#3b82f6' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
          <p style="font-size:15px;color:#94a3b8;margin-bottom:44px;">${c.subtitle}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(290px, 1fr));gap:22px;">
            ${(c.channels || []).map(ch => `
              <a href="#order" style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:30px 24px;text-decoration:none;color:#fff;display:block;transition:transform 0.2s;">
                <div style="font-size:1.2rem;font-weight:800;margin-bottom:6px;color:${ch.color};">${ch.name}</div>
                <div style="font-size:16px;font-weight:700;margin-bottom:10px;color:#fff;">${ch.handle}</div>
                <p style="font-size:13px;color:#94a3b8;margin:0;line-height:1.5;">${ch.desc}</p>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'store-4',
    cat: 'store',
    category: 'store',
    name: 'Витрина товаров с фильтрами по категориям (ST350)',
    icon: 'filter_alt',
    defaultContent: {
      title: 'Каталог цифровых товаров и оборудования',
      subtitle: 'Фильтруйте позиции по категориям и добавляйте в корзину',
      products: [
        { id: 'st4_1', cat: 'tech', name: 'Графический планшет Aurora Pen Pro', price: 24990, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80' },
        { id: 'st4_2', cat: 'design', name: 'Полный пакет шаблонов Zero Block (100+)', price: 5900, img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&q=80' },
        { id: 'st4_3', cat: 'acc', name: 'Механическая клавиатура Creator Key', price: 11900, img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80' },
        { id: 'st4_4', cat: 'tech', name: 'Студийный микрофон Podcast Ultra', price: 15400, img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" data-tilda-filter>
        <div class="t-container" style="max-width:1200px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:32px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:36px;">
            ${[
              { k: 'all', l: 'Все товары' },
              { k: 'tech', l: 'Техника' },
              { k: 'design', l: 'Дизайн-паки' },
              { k: 'acc', l: 'Аксессуары' }
            ].map((f, i) => `
              <button type="button" data-filter-btn="${f.k}" class="${i === 0 ? 'is-active' : ''}" onclick="const root=this.closest('[data-tilda-filter]');root.querySelectorAll('[data-filter-btn]').forEach(b=>b.style.background='#1e293b');this.style.background='${d.accentColor}';root.querySelectorAll('[data-filter-item]').forEach(el=>{el.style.display=('${f.k}'==='all'||el.getAttribute('data-filter-item')==='${f.k}')?'flex':'none';});" style="padding:10px 20px;border-radius:99px;border:1px solid #334155;background:${i === 0 ? d.accentColor : '#1e293b'};color:#fff;font-weight:700;font-size:13px;cursor:pointer;">${f.l}</button>
            `).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:22px;">
            ${(c.products || []).map(p => `
              <div class="tilda-product-card" data-product-card data-filter-item="${p.cat}" style="background:#131c2e;border:1px solid #233047;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <img src="${p.img}" alt="${p.name}" data-lightbox="true" data-caption="${p.name}" style="width:100%;height:190px;object-fit:cover;cursor:zoom-in;" />
                  <div style="padding:18px 18px 0;">
                    <h3 data-product-name style="font-size:1.05rem;font-weight:700;color:#fff;margin-bottom:8px;">${p.name}</h3>
                  </div>
                </div>
                <div style="padding:0 18px 18px;">
                  <div data-product-price style="font-size:1.4rem;font-weight:900;color:#10b981;margin-bottom:12px;">${p.price} ₽</div>
                  <button type="button" data-tilda-cart-add data-product-id="${p.id}" data-product-name="${p.name}" data-product-price="${p.price}" data-product-img="${p.img}" style="width:100%;padding:11px;background:${d.accentColor};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">В корзину</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 18. ПОРТФОЛИО И РАБОТЫ (PORTFOLIO) ──────────────────────
  {
    id: 'portfolio-1',
    cat: 'portfolio',
    category: 'portfolio',
    name: 'Сетка кейсов 3×2 с тегами и превью (Лайтбокс)',
    icon: 'photo_album',
    defaultContent: {
      title: 'Избранные проекты и кейсы',
      subtitle: 'Цифровые продукты, которые приносят измеримую прибыль нашим клиентам',
      cases: [
        { tag: 'FINTECH', title: 'Необанк NovaPay', metric: '+140% регистраций', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80' },
        { tag: 'E-COMMERCE', title: 'Маркетплейс электроники Volt', metric: 'Конверсия 6.8%', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80' },
        { tag: 'EDTECH', title: 'Академия ИИ-профессий Future', metric: '18 000 студентов', img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80' },
        { tag: 'REAL ESTATE', title: 'Клубный дом премиум-класса', metric: 'Продажи на 2.4 млрд ₽', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80' },
        { tag: 'SAAS', title: 'CRM-платформа для логистики', metric: '−40% издержек', img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80' },
        { tag: 'MEDTECH', title: 'Сервис телемедицины DocOnline', metric: 'Рейтинг 4.9 ★', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="portfolio">
        <div class="t-container" style="max-width:1200px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:48px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:24px;">
            ${(c.cases || []).map(item => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;">
                <div style="height:220px;overflow:hidden;position:relative;">
                  <span style="position:absolute;top:12px;left:12px;z-index:2;background:rgba(7,10,19,0.85);color:${d.accentColor};font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px;">${item.tag}</span>
                  <img src="${item.img}" alt="${item.title}" data-lightbox="true" data-caption="${item.title} (${item.metric})" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
                </div>
                <div style="padding:22px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div>
                    <h3 style="font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:4px;">${item.title}</h3>
                    <div style="font-size:13px;font-weight:700;color:#10b981;">${item.metric}</div>
                  </div>
                  <a href="#order" class="t-btn" style="padding:8px 16px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">Кейс →</a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'portfolio-2',
    cat: 'portfolio',
    category: 'portfolio',
    name: 'Крупные горизонтальные кейсы: Задача → Решение → Результат',
    icon: 'view_agenda',
    defaultContent: {
      title: 'Детальный разбор проектов',
      items: [
        {
          client: 'AERO LOGISTICS',
          title: 'Автоматизация клиентского портала международных перевозок',
          task: 'Сократить время расчета таможенных и логистических тарифов для B2B-клиентов.',
          solution: 'Спроектировали интерактивный калькулятор доставки и личный кабинет отслеживания грузов.',
          result: 'Рост онлайн-заявок на 215% и экономия 40 часов работы менеджеров еженедельно.',
          img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80'
        },
        {
          client: 'URBAN FITNESS CLUB',
          title: 'Перезапуск веб-платформы сети премиальных фитнес-клубов',
          task: 'Увеличить продажи годовых клубных карт со смартфонов без участия колл-центра.',
          solution: 'Создали 3D-тур по залам, расписание тренеров и покупку абонементов в 2 клика.',
          result: 'Конверсия мобильного трафика выросла с 1.2% до 4.9% за первый месяц.',
          img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
        }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:44px;text-align:center;">${c.title}</h2>
          <div style="display:flex;flex-direction:column;gap:32px;">
            ${(c.items || []).map(it => `
              <div style="background:#1e293b;border:1px solid #334155;border-radius:22px;padding:36px;display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:36px;align-items:center;">
                <div>
                  <div style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1.2px;margin-bottom:8px;">${it.client}</div>
                  <h3 style="font-size:1.6rem;font-weight:800;margin-bottom:18px;line-height:1.3;">${it.title}</h3>
                  <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;color:#cbd5e1;">
                    <div><strong style="color:#fff;">🎯 Задача:</strong> ${it.task}</div>
                    <div><strong style="color:#fff;">⚡ Решение:</strong> ${it.solution}</div>
                    <div style="padding:12px 14px;background:rgba(16,185,129,0.12);border-left:3px solid #10b981;border-radius:6px;color:#10b981;font-weight:700;">📈 Результат: ${it.result}</div>
                  </div>
                </div>
                <div>
                  <img src="${it.img}" alt="${it.title}" data-lightbox="true" data-caption="${it.title}" style="width:100%;height:290px;object-fit:cover;border-radius:16px;cursor:zoom-in;" />
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'portfolio-3',
    cat: 'portfolio',
    category: 'portfolio',
    name: 'Фильтруемое портфолио работ по категориям',
    icon: 'Burst_mode',
    defaultContent: {
      title: 'Портфолио студии по направлениям',
      subtitle: 'Выберите интересующую категорию, чтобы отфильтровать работы',
      works: [
        { cat: 'web', title: 'Корпоративный портал AI Lab', tag: 'Веб-дизайн', img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=700&q=80' },
        { cat: 'dev', title: 'Высоконагруженный сервис аналитики', tag: 'Разработка', img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=700&q=80' },
        { cat: 'brand', title: 'Айдентика и гайдбук бренда Kinetica', tag: 'Брендинг', img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=700&q=80' },
        { cat: 'web', title: 'Промо-лендинг конференции FutureTech', tag: 'Веб-дизайн', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" data-tilda-filter>
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:32px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:36px;">
            ${[
              { k: 'all', l: 'Все' },
              { k: 'web', l: 'Веб-дизайн' },
              { k: 'dev', l: 'Разработка' },
              { k: 'brand', l: 'Брендинг' }
            ].map((f, i) => `
              <button type="button" data-filter-btn="${f.k}" class="${i === 0 ? 'is-active' : ''}" onclick="const root=this.closest('[data-tilda-filter]');root.querySelectorAll('[data-filter-btn]').forEach(b=>b.style.background='#1e293b');this.style.background='${d.accentColor}';root.querySelectorAll('[data-filter-item]').forEach(el=>{el.style.display=('${f.k}'==='all'||el.getAttribute('data-filter-item')==='${f.k}')?'block':'none';});" style="padding:10px 22px;border-radius:99px;border:1px solid #334155;background:${i === 0 ? d.accentColor : '#1e293b'};color:#fff;font-weight:700;font-size:13px;cursor:pointer;">${f.l}</button>
            `).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:22px;">
            ${(c.works || []).map(w => `
              <div data-filter-item="${w.cat}" style="background:#131c2e;border:1px solid #233047;border-radius:16px;overflow:hidden;">
                <img src="${w.img}" alt="${w.title}" data-lightbox="true" data-caption="${w.title}" style="width:100%;height:200px;object-fit:cover;cursor:zoom-in;" />
                <div style="padding:18px;">
                  <div style="font-size:11px;font-weight:800;color:${d.accentColor};margin-bottom:4px;">${w.tag}</div>
                  <h3 style="font-size:1.05rem;font-weight:700;color:#fff;margin:0;">${w.title}</h3>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 19. БЛОГ И НОВОСТИ (BLOG) ───────────────────────────────
  {
    id: 'blog-1',
    cat: 'blog',
    category: 'blog',
    name: 'Сетка из 3 карточек статей с датой и временем чтения',
    icon: 'newspaper',
    defaultContent: {
      title: 'Блог и экспертные материалы',
      subtitle: 'Делимся опытом в дизайне, разработке и интернет-маркетинге',
      posts: [
        { cat: 'ДИЗАЙН', date: '18 Сентября 2026', read: '5 мин', title: 'Тренды веб-интерфейсов 2026: Bento-сетки и микро-анимации', img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=700&q=80' },
        { cat: 'МАРКЕТИНГ', date: '14 Сентября 2026', read: '7 мин', title: 'Как увеличить конверсию лендинга с помощью интерактивного квиза', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=80' },
        { cat: 'ТЕХНОЛОГИИ', date: '09 Сентября 2026', read: '6 мин', title: 'Оптимизация скорости загрузки: как набрать 100 баллов в Lighthouse', img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=700&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};" id="blog">
        <div class="t-container" style="max-width:1180px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:48px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:24px;">
            ${(c.posts || []).map(p => `
              <article style="background:#131c2e;border:1px solid #233047;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;">
                <img src="${p.img}" alt="${p.title}" data-lightbox="true" data-caption="${p.title}" style="width:100%;height:200px;object-fit:cover;cursor:zoom-in;" />
                <div style="padding:24px;display:flex;flex-direction:column;flex:1;justify-content:space-between;">
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:10px;">
                      <span style="font-weight:800;color:${d.accentColor};">${p.cat}</span>
                      <span>${p.date} • ⏱ ${p.read}</span>
                    </div>
                    <h3 style="font-size:1.15rem;font-weight:800;line-height:1.4;color:#fff;margin-bottom:16px;">${p.title}</h3>
                  </div>
                  <a href="#blog" style="color:${d.accentColor};font-weight:700;font-size:13px;text-decoration:none;">Читать статью →</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'blog-2',
    cat: 'blog',
    category: 'blog',
    name: 'Главная статья (Featured) слева + 3 новости справа',
    icon: 'vertical_split',
    defaultContent: {
      title: 'Главное в редакции',
      featuredTitle: 'Большой релиз Aurora Tilda 3.0: свободное перетаскивание, фильтры и новые коллекции блоков',
      featuredDesc: 'Разбираем ключевые нововведения платформы, которые позволяют собирать сложные адаптивные интерфейсы в два раза быстрее.',
      featuredImg: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80',
      sideNews: [
        { date: 'Сегодня', title: 'Поддержка кастомных анимаций для каждого элемента в Zero Block' },
        { date: 'Вчера', title: 'Интеграция умной корзины и фильтрации каталога товаров без перезагрузки' },
        { date: '12 Сентября', title: 'Как экспортировать проект в автономный HTML-архив для любого хостинга' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:36px;">${c.title}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:32px;align-items:stretch;">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;overflow:hidden;">
              <img src="${c.featuredImg}" alt="${c.featuredTitle}" data-lightbox="true" style="width:100%;height:250px;object-fit:cover;cursor:zoom-in;" />
              <div style="padding:28px;">
                <span style="font-size:11px;font-weight:800;color:${d.accentColor};">ГЛАВНАЯ ТЕМА</span>
                <h3 style="font-size:1.45rem;font-weight:800;margin:8px 0 12px;line-height:1.35;">${c.featuredTitle}</h3>
                <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0;">${c.featuredDesc}</p>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px;justify-content:space-between;">
              ${(c.sideNews || []).map(n => `
                <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:22px;">
                  <div style="font-size:12px;font-weight:700;color:${d.accentColor};margin-bottom:6px;">${n.date}</div>
                  <h4 style="font-size:1.05rem;font-weight:700;color:#fff;line-height:1.45;margin:0;">${n.title}</h4>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'blog-3',
    cat: 'blog',
    category: 'blog',
    name: 'Компактная лента новостей и пресс-релизов с тегами',
    icon: 'feed',
    defaultContent: {
      title: 'Лента обновлений и пресс-релизов',
      items: [
        { date: '25.09.2026', tag: 'РЕЛИЗ', title: 'Добавлено 25+ новых адаптивных блоков в библиотеку конструктора' },
        { date: '18.09.2026', tag: 'ВЕБИНАР', title: 'Мастер-класс по созданию продающих квизов и лендингов' },
        { date: '10.09.2026', tag: 'ОБНОВЛЕНИЕ', title: 'Улучшен режим предпросмотра на мобильных устройствах и планшетах' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '75px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:960px;margin:0 auto;">
          <h2 style="font-size:2.2rem;font-weight:800;margin-bottom:32px;">${c.title}</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${(c.items || []).map(it => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:14px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                  <span style="font-size:12px;color:#64748b;font-weight:700;">${it.date}</span>
                  <span style="padding:3px 10px;background:rgba(13,153,255,0.14);color:${d.accentColor};border-radius:6px;font-size:11px;font-weight:800;">${it.tag}</span>
                  <span style="font-size:15px;font-weight:700;color:#fff;">${it.title}</span>
                </div>
                <span style="color:${d.accentColor};font-weight:800;">→</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 20. КОМАНДА (TEAM) ──────────────────────────────────────
  {
    id: 'team-1',
    cat: 'team',
    category: 'team',
    name: 'Сетка команды из 4 карточек с фото и ролями',
    icon: 'group',
    defaultContent: {
      title: 'Команда создателей проекта',
      subtitle: 'Инженеры, дизайнеры и стратеги с опытом работы в ведущих IT-компаниях',
      members: [
        { name: 'Артем Белов', role: 'CEO & Product Architect', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80' },
        { name: 'София Лебедева', role: 'Head of Design Systems', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80' },
        { name: 'Кирилл Морозов', role: 'Lead Frontend Engineer', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80' },
        { name: 'Дарья Новикова', role: 'Customer Success Lead', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
          <p style="font-size:15px;color:#94a3b8;margin-bottom:48px;">${c.subtitle}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:24px;">
            ${(c.members || []).map(m => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:24px;text-align:center;">
                <img src="${m.img}" alt="${m.name}" data-lightbox="true" data-caption="${m.name} — ${m.role}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 16px;border:3px solid ${d.accentColor};cursor:zoom-in;" />
                <h3 style="font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:4px;">${m.name}</h3>
                <div style="font-size:13px;color:${d.accentColor};font-weight:600;">${m.role}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'team-2',
    cat: 'team',
    category: 'team',
    name: 'Карточка основателя / спикера с биографией и регалиями',
    icon: 'person',
    defaultContent: {
      badge: 'ОСНОВАТЕЛЬ И ИДЕОЛОГ',
      name: 'Александр Вершинин',
      role: 'Более 12 лет в создании цифровых продуктов и UX-архитектуре',
      bio: 'Руководил разработкой дизайн-систем для крупнейших финтех-экосистем. Автор образовательных программ по визуальному программированию и спикер профильных конференций.',
      img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=700&q=80'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1050px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:44px;align-items:center;">
          <img src="${c.img}" alt="${c.name}" data-lightbox="true" data-caption="${c.name}" style="width:100%;max-height:420px;object-fit:cover;border-radius:20px;cursor:zoom-in;" />
          <div>
            <div style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1.2px;margin-bottom:10px;">${c.badge}</div>
            <h2 style="font-size:2.3rem;font-weight:900;margin-bottom:8px;">${c.name}</h2>
            <div style="font-size:15px;font-weight:700;color:#cbd5e1;margin-bottom:18px;">${c.role}</div>
            <p style="font-size:15px;color:#94a3b8;line-height:1.75;margin:0;">${c.bio}</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'team-3',
    cat: 'team',
    category: 'team',
    name: 'Блок экспертов и преподавателей курса с опытом',
    icon: 'school',
    defaultContent: {
      title: 'Ваши наставники и эксперты',
      subtitle: 'Практикующие специалисты, которые сопровождают ваш проект на каждом этапе',
      experts: [
        { name: 'Мария Громова', exp: '9 лет в UI/UX', spec: 'Арт-дирекшн, типографика и дизайн-системы', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80' },
        { name: 'Павел Орлов', exp: '11 лет во Frontend', spec: 'Веб-анимации, производительность и архитектура', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80' },
        { name: 'Ольга Троицкая', exp: '8 лет в Growth', spec: 'Перформанс-маркетинг, квизы и воронки продаж', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:24px;">
            ${(c.experts || []).map(ex => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:28px;display:flex;align-items:center;gap:18px;">
                <img src="${ex.img}" alt="${ex.name}" data-lightbox="true" style="width:76px;height:76px;border-radius:16px;object-fit:cover;cursor:zoom-in;" />
                <div>
                  <span style="font-size:11px;font-weight:800;color:#10b981;">${ex.exp}</span>
                  <h3 style="font-size:1.15rem;font-weight:800;color:#fff;margin:2px 0 6px;">${ex.name}</h3>
                  <p style="font-size:13px;color:#94a3b8;margin:0;line-height:1.45;">${ex.spec}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 21. ТАЙМЛАЙН И ЭТАПЫ (TIMELINE) ─────────────────────────
  {
    id: 'timeline-1',
    cat: 'timeline',
    category: 'timeline',
    name: 'Вертикальный таймлайн истории / программы мероприятия',
    icon: 'timeline',
    defaultContent: {
      title: 'Дорожная карта и программа развития',
      subtitle: 'Последовательные этапы реализации вашего проекта',
      events: [
        { time: 'Этап 1 • День 1–2', title: 'Брифинг, анализ конкурентов и прототипирование', desc: 'Формируем структуру блоков, пишем продающие офферы и согласуем концепцию.' },
        { time: 'Этап 2 • День 3–5', title: 'Дизайн-упаковка и верстка в Aurora Tilda', desc: 'Собираем адаптивные секции, настраиваем Zero Block и анимации при скролле.' },
        { time: 'Этап 3 • День 6–7', title: 'Подключение форм, квизов и корзины', desc: 'Интегрируем прием заявок, каталог товаров и тестируем на мобильных устройствах.' },
        { time: 'Этап 4 • День 8', title: 'Финальный запуск и передача проекта', desc: 'Публикуем сайт на домене или выгружаем готовый архив исходного кода.' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '85px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:860px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:48px;">
            <h2 style="font-size:2.4rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:20px;border-left:2px solid ${d.accentColor};padding-left:28px;margin-left:12px;">
            ${(c.events || []).map(ev => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:16px;padding:24px;position:relative;">
                <div style="position:absolute;left:-37px;top:28px;width:14px;height:14px;border-radius:50%;background:${d.accentColor};box-shadow:0 0 12px ${d.accentColor};"></div>
                <div style="font-size:12px;font-weight:800;color:${d.accentColor};margin-bottom:6px;">${ev.time}</div>
                <h3 style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:8px;">${ev.title}</h3>
                <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0;">${ev.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'timeline-2',
    cat: 'timeline',
    category: 'timeline',
    name: 'Горизонтальные шаги работы (Шаг 1 → Шаг 2 → Шаг 3 → Шаг 4)',
    icon: 'linear_scale',
    defaultContent: {
      title: 'Как мы работаем: 4 прозрачных шага',
      steps: [
        { step: 'ШАГ 1', title: 'Заявка на сайте', desc: 'Оставьте контакты в форме или пройдите короткий квиз.' },
        { step: 'ШАГ 2', title: 'Созвон и смета', desc: 'Фиксируем точную стоимость и сроки в договоре.' },
        { step: 'ШАГ 3', title: 'Дизайн и сборка', desc: 'Показываем промежуточный результат уже через 48 часов.' },
        { step: 'ШАГ 4', title: 'Старт продаж', desc: 'Запускаем проект и передаем все доступы.' }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;">
          <h2 style="font-size:2.3rem;font-weight:800;text-align:center;margin-bottom:44px;">${c.title}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:20px;">
            ${(c.steps || []).map(s => `
              <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;">
                <span style="display:inline-block;padding:4px 10px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:6px;font-size:11px;font-weight:800;margin-bottom:14px;">${s.step}</span>
                <h3 style="font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:8px;">${s.title}</h3>
                <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 22. СЧЁТЧИКИ И СТАТИСТИКА (COUNTERS) ────────────────────
  {
    id: 'counters-1',
    cat: 'counters',
    category: 'counters',
    name: 'Анимированные числовые счетчики с иконками',
    icon: 'bar_chart',
    defaultContent: {
      title: 'Цифры, которые говорят сами за себя',
      items: [
        { count: '250', suffix: '+', label: 'Запущенных проектов', icon: 'rocket_launch' },
        { count: '98', suffix: '%', label: 'Клиентов рекомендуют нас', icon: 'thumb_up' },
        { count: '14', suffix: ' млн', label: 'Прибыли принесли сайты', icon: 'Query_stats' },
        { count: '24', suffix: '/7', label: 'Мониторинг и поддержка', icon: 'verified_user' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:44px;">${c.title}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));gap:22px;">
            ${(c.items || []).map(it => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:18px;padding:32px 20px;">
                <span class="material-symbols-rounded" style="font-size:34px;color:${d.accentColor};margin-bottom:10px;">${it.icon}</span>
                <div style="font-size:2.8rem;font-weight:900;color:#fff;margin-bottom:6px;">
                  <span data-tilda-counter data-count-to="${it.count}">${it.count}</span><span>${it.suffix || ''}</span>
                </div>
                <div style="font-size:13px;color:#94a3b8;font-weight:600;">${it.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'counters-2',
    cat: 'counters',
    category: 'counters',
    name: 'Блок прогресс-баров компетенций и метрик эффективности',
    icon: 'equalizer',
    defaultContent: {
      title: 'Показатели качества и экспертизы',
      subtitle: 'Независимая оценка наших решений по ключевым метрикам',
      bars: [
        { label: 'Скорость загрузки и оптимизация (PageSpeed)', pct: '99%' },
        { label: 'Удовлетворенность UX/UI дизайном', pct: '95%' },
        { label: 'Адаптивность под мобильные устройства', pct: '92%' },
        { label: 'Рост конверсии после редизайна', pct: '88%' }
      ]
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:880px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:40px;">
            <h2 style="font-size:2.3rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
            <p style="font-size:15px;color:#94a3b8;">${c.subtitle}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:20px;">
            ${(c.bars || []).map(b => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:8px;">
                  <span>${b.label}</span>
                  <span style="color:${d.accentColor};">${b.pct}</span>
                </div>
                <div style="height:10px;background:#1e293b;border-radius:99px;overflow:hidden;">
                  <div style="width:${b.pct};height:100%;background:linear-gradient(90deg, ${d.accentColor}, #10b981);border-radius:99px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 23. ПАРТНЁРЫ И КЛИЕНТЫ (PARTNERS) ───────────────────────
  {
    id: 'partners-1',
    cat: 'partners',
    category: 'partners',
    name: 'Сетка логотипов партнеров и клиентов (6 брендов)',
    icon: 'handshake',
    defaultContent: {
      title: 'Нам доверяют технологические лидеры',
      subtitle: 'Более 150 компаний используют решения Aurora Web для развития бизнеса',
      brands: [
        { name: 'QUANTUM AI', icon: 'memory' },
        { name: 'NOVABANK', icon: 'account_balance' },
        { name: 'SKYCLOUD', icon: 'cloud_done' },
        { name: 'VEGA MOTORS', icon: 'electric_car' },
        { name: 'PULSAR MEDIA', icon: 'podcasts' },
        { name: 'HYPERION LABS', icon: 'science' }
      ]
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '75px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1150px;margin:0 auto;text-align:center;">
          <h2 style="font-size:2.2rem;font-weight:800;margin-bottom:8px;">${c.title}</h2>
          <p style="font-size:14px;color:#94a3b8;margin-bottom:40px;">${c.subtitle}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:16px;">
            ${(c.brands || []).map(b => `
              <div style="background:#131c2e;border:1px solid #233047;border-radius:14px;padding:24px 16px;display:flex;align-items:center;justify-content:center;gap:10px;color:#cbd5e1;font-weight:800;font-size:14px;letter-spacing:0.5px;">
                <span class="material-symbols-rounded" style="color:${d.accentColor};">${b.icon}</span>
                <span>${b.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'partners-2',
    cat: 'partners',
    category: 'partners',
    name: 'Полоса технологий и интеграций + плашка доверия',
    icon: 'hub',
    defaultContent: {
      badge: '⚡ ОФИЦИАЛЬНЫЕ ИНТЕГРАЦИИ И СЕРТИФИКАЦИЯ',
      title: 'Бесшовная работа с любимыми сервисами аналитики, оплаты и CRM',
      tags: ['Telegram Bot API', 'VK Mini Apps', 'ЮKassa & СБП', 'Яндекс Метрика', 'amoCRM & Bitrix24', 'Google Fonts', 'Webhook JSON', 'Cloudflare CDN']
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '65px 24px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1100px;margin:0 auto;text-align:center;">
          <div style="font-size:11px;font-weight:800;color:${d.accentColor};letter-spacing:1.2px;margin-bottom:10px;">${c.badge}</div>
          <h3 style="font-size:1.6rem;font-weight:800;margin-bottom:28px;">${c.title}</h3>
          <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:12px;">
            ${(c.tags || []).map(t => `
              <span style="padding:10px 18px;background:#1e293b;border:1px solid #334155;border-radius:99px;font-size:13px;font-weight:700;color:#e2e8f0;">${t}</span>
            `).join('')}
          </div>
        </div>
      </div>
    `
  },

  // ─── 17. ZERO BLOCK ──────────────────────────────────────────
  {
    id: 'zero-1',
    cat: 'zero',
    category: 'zero',
    isZero: true,
    name: 'Свободный Zero Block',
    icon: 'bolt',
    defaultContent: {
      elements: [
        { id: 'zb_el_1', type: 'h1', props: { x: 80, y: 80, width: 560, height: 90, content: 'Свободный креативный Zero Block', fontSize: 36, fontWeight: '800', color: '#ffffff', fontFamily: 'Montserrat' } },
        { id: 'zb_el_2', type: 'text', props: { x: 80, y: 190, width: 480, height: 80, content: 'Размещайте любые элементы в произвольных точках холста, изменяйте размер 8-точечным ресайзом и вращайте на 360°.', fontSize: 16, color: '#94a3b8', fontFamily: 'Inter' } },
        { id: 'zb_el_3', type: 'btn', props: { x: 80, y: 290, width: 200, height: 48, content: 'Кнопка действия', bgColor: '#0d99ff', color: '#ffffff', borderRadius: '8px', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' } },
        { id: 'zb_el_4', type: 'img', props: { x: 620, y: 80, width: 460, height: 320, borderRadius: '16px', content: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80' } }
      ]
    },
    defaultDesign: { height: 560, background: '#070a13' },
    html: (c, d) => {
      const els = c.elements || [];
      let elsMarkup = '';
      els.forEach(el => {
        const p = el.props || {};
        let inner = '';
        const borderStyle = `${p.borderWidth || '0px'} ${p.borderStyle || 'solid'} ${p.borderColor || 'transparent'}`;
        const shadowStyle = p.boxShadow && p.boxShadow !== 'none' ? `box-shadow:${p.boxShadow};` : '';

        if (el.type === 'img') {
          const lbAttr = p.lightbox ? 'data-lightbox="true" data-caption="Zero Block Photo" style="cursor:zoom-in;' : 'style="';
          inner = `<img src="${p.content || ''}" alt="" ${lbAttr}width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius || '0px'};${shadowStyle}border:${borderStyle};" />`;
        } else if (el.type === 'shape') {
          inner = `<div style="width:100%;height:100%;border-radius:${p.borderRadius || '0px'};background:${p.bgColor || 'rgba(13,153,255,0.15)'};border:${borderStyle};${shadowStyle}box-sizing:border-box;"></div>`;
        } else if (el.type === 'btn') {
          const targetAttr = p.targetBlank ? 'target="_blank" rel="noopener noreferrer"' : '';
          inner = `<a href="${p.url || '#'}" ${targetAttr} class="t-btn" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor || '#0d99ff'};color:${p.color || '#fff'};border-radius:${p.borderRadius || '8px'};font-size:${p.fontSize || 15}px;font-weight:${p.fontWeight || '700'};font-family:'${p.fontFamily || 'Montserrat'}',sans-serif;text-decoration:none;user-select:none;border:${borderStyle};${shadowStyle}letter-spacing:${p.letterSpacing || 0}px;">${p.content || 'Кнопка'}</a>`;
        } else if (el.type === 'icon') {
          inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color || '#0d99ff'};font-size:${p.fontSize || 32}px;background:${p.bgColor || 'transparent'};border-radius:${p.borderRadius || '0px'};border:${borderStyle};${shadowStyle}"><span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || p.content || 'star'}</span></div>`;
        } else if (el.type === 'form') {
          inner = `
            <div style="width:100%;height:100%;padding:16px;background:${p.bgColor || '#1e293b'};border-radius:${p.borderRadius || '12px'};border:${borderStyle};${shadowStyle}display:flex;flex-direction:column;gap:8px;box-sizing:border-box;">
              <div style="font-size:14px;font-weight:700;color:${p.color || '#fff'};">${p.content || 'Оставить заявку'}</div>
              <input type="text" placeholder="Ваше имя" style="padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
              <input type="tel" placeholder="+7 (999) 000-00-00" style="padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
              <button type="button" style="padding:8px 16px;background:#0d99ff;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">Отправить</button>
            </div>
          `;
        } else if (el.type === 'code') {
          inner = `<div style="width:100%;height:100%;overflow:hidden;">${p.content || ''}</div>`;
        } else {
          // Headings and Texts
          const targetAttr = p.url ? (p.targetBlank ? 'target="_blank" rel="noopener noreferrer"' : '') : '';
          const tagOpen = p.url ? `<a href="${p.url}" ${targetAttr} style="text-decoration:none;color:inherit;display:block;width:100%;height:100%;">` : '';
          const tagClose = p.url ? `</a>` : '';
          inner = `${tagOpen}<div style="font-size:${p.fontSize || 16}px;font-weight:${p.fontWeight || '500'};color:${p.color || '#fff'};line-height:${p.lineHeight || 1.3};text-align:${p.textAlign || 'left'};font-family:'${p.fontFamily || 'Inter'}',sans-serif;letter-spacing:${p.letterSpacing || 0}px;word-break:break-word;">${p.content || ''}</div>${tagClose}`;
        }

        const animAttr = (p.animation && p.animation.type && p.animation.type !== 'none')
          ? ` data-tilda-anim="${p.animation.type}" data-anim-delay="${p.animation.delay || 0}" data-anim-duration="${p.animation.duration || 0.7}"`
          : '';

        elsMarkup += `
          <div class="zero-canvas-element" data-zb-el-id="${el.id}"${animAttr} style="position:absolute;left:${p.x || 0}px;top:${p.y || 0}px;width:${p.width || 200}px;height:${p.height || 50}px;transform:rotate(${p.rotation || 0}deg);z-index:${p.zIndex || 1};opacity:${p.opacity !== undefined ? p.opacity : 1};box-sizing:border-box;">
            ${inner}
          </div>
        `;
      });

      const hPx = parseInt(d.height, 10) || 560;
      return `
        <div class="t-block t-zero-block" style="position:relative;width:100%;min-height:${hPx}px;height:${hPx}px;background:${d.background || '#070a13'};overflow:hidden;">
          <div class="t-zero-container" style="position:relative;width:100%;max-width:1200px;height:100%;margin:0 auto;">
            ${elsMarkup}
          </div>
        </div>
      `;
    }
  },

  // ─── 23. ИНТЕРАКТИВНЫЕ ВИДЖЕТЫ И ПОПАПЫ (WIDGETS) ─────────────
  {
    id: 'popup-1',
    cat: 'widgets',
    category: 'widgets',
    name: 'Всплывающее окно (Popup Modal) с формой',
    icon: 'open_in_new',
    defaultContent: {
      popupId: 'contact',
      badge: '✨ БЕСПЛАТНАЯ КОНСУЛЬТАЦИЯ',
      title: 'Оставьте заявку на персональный расчет',
      subtitle: 'Наш ведущий специалист свяжется с вами в течение 10 минут и ответит на все вопросы.',
      btnText: 'Отправить заявку',
      triggerTitle: 'Интерактивное всплывающее окно (Popup)',
      triggerDesc: 'Этот блок регистрирует всплывающее модальное окно. Любая кнопка или ссылка на сайте с адресом #popup:contact откроет это окно.',
      triggerBtnText: 'Проверить всплывающее окно (#popup:contact)'
    },
    defaultDesign: {
      bgColor: '#111827',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '40px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:960px;margin:0 auto;text-align:center;">
          <div style="background:rgba(13,153,255,0.08);border:1px dashed rgba(13,153,255,0.4);border-radius:16px;padding:32px 24px;">
            <div style="display:inline-block;padding:4px 14px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;">МОДУЛЬ POPUP МОДАЛКИ</div>
            <h3 style="font-size:22px;font-weight:800;margin-bottom:10px;">${c.triggerTitle}</h3>
            <p style="color:#94a3b8;font-size:14px;max-width:640px;margin:0 auto 20px;line-height:1.6;">${c.triggerDesc}</p>
            <a href="#popup:${c.popupId || 'contact'}" class="t-btn" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:${d.accentColor};color:#fff;font-weight:700;border-radius:8px;text-decoration:none;box-shadow:0 6px 20px rgba(13,153,255,0.35);">
              <span class="material-symbols-rounded" style="font-size:18px;">open_in_new</span>
              ${c.triggerBtnText}
            </a>
          </div>
        </div>

        <div class="tilda-popup-overlay" data-tilda-popup="${c.popupId || 'contact'}" id="popup-${c.popupId || 'contact'}">
          <div class="tilda-popup-box">
            <button type="button" class="tilda-popup-close-btn" data-tilda-popup-close title="Закрыть (Esc)">✕</button>
            <div style="display:inline-block;padding:4px 12px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:11px;font-weight:700;margin-bottom:12px;letter-spacing:0.5px;">${c.badge}</div>
            <h2 style="font-size:24px;font-weight:800;line-height:1.25;margin-bottom:10px;color:#fff;">${c.title}</h2>
            <p style="font-size:14px;color:#94a3b8;line-height:1.5;margin-bottom:24px;">${c.subtitle}</p>
            <form style="display:flex;flex-direction:column;gap:12px;" data-tilda-form="popup-${c.popupId || 'contact'}">
              <input type="text" name="name" placeholder="Ваше имя" required style="padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;font-size:14px;outline:none;" />
              <input type="tel" name="phone" placeholder="+7 (999) 000-00-00" required style="padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;font-size:14px;outline:none;" />
              <input type="email" name="email" placeholder="Email (необязательно)" style="padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;font-size:14px;outline:none;" />
              <button type="submit" style="padding:14px;background:${d.accentColor};color:#fff;font-weight:700;border:none;border-radius:8px;font-size:15px;cursor:pointer;box-shadow:0 8px 20px rgba(13,153,255,0.4);transition:transform 0.2s;">${c.btnText}</button>
            </form>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'calc-1',
    cat: 'widgets',
    category: 'widgets',
    name: 'Интерактивный калькулятор стоимости',
    icon: 'calculate',
    defaultContent: {
      badge: 'ОНЛАЙН КАЛЬКУЛЯТОР',
      title: 'Рассчитайте стоимость вашего проекта',
      subtitle: 'Выберите необходимые параметры и узнайте примерную стоимость в реальном времени.',
      basePrice: 20000,
      pagePrice: 3500,
      btnText: 'Заказать проект по расчету',
      btnUrl: '#order'
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:960px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:44px;">
            <div style="display:inline-block;padding:4px 14px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;letter-spacing:1px;">${c.badge}</div>
            <h2 style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:800;margin-bottom:14px;">${c.title}</h2>
            <p style="color:#94a3b8;font-size:16px;max-width:620px;margin:0 auto;">${c.subtitle}</p>
          </div>

          <div data-tilda-calc data-calc-base="${c.basePrice || 20000}" style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:36px 30px;box-shadow:0 20px 50px rgba(0,0,0,0.4);display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:36px;align-items:center;">
            <div style="display:flex;flex-direction:column;gap:24px;">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <label for="calc-pages-slider" style="font-size:15px;font-weight:600;color:#e2e8f0;">Количество страниц / экранов:</label>
                  <span style="font-size:16px;font-weight:800;color:${d.accentColor};"><span data-calc-val-for="calc-pages-slider">5</span> стр.</span>
                </div>
                <input type="range" id="calc-pages-slider" name="calc-pages-slider" min="1" max="20" value="5" data-calc-price="${c.pagePrice || 3500}" class="tilda-calc-range" />
              </div>

              <div style="display:flex;flex-direction:column;gap:12px;">
                <label style="font-size:14px;font-weight:600;color:#94a3b8;margin-bottom:4px;">Дополнительные опции:</label>
                <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:#e2e8f0;cursor:pointer;">
                  <input type="checkbox" data-calc-price="15000" checked style="width:18px;height:18px;accent-color:${d.accentColor};cursor:pointer;" />
                  <span>Индивидуальный дизайн в Zero Block (+15 000 ₽)</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:#e2e8f0;cursor:pointer;">
                  <input type="checkbox" data-calc-price="10000" checked style="width:18px;height:18px;accent-color:${d.accentColor};cursor:pointer;" />
                  <span>Базовая SEO-оптимизация и скорость (+10 000 ₽)</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:#e2e8f0;cursor:pointer;">
                  <input type="checkbox" data-calc-price="8000" style="width:18px;height:18px;accent-color:${d.accentColor};cursor:pointer;" />
                  <span>Подключение CRM и платежной системы (+8 000 ₽)</span>
                </label>
              </div>
            </div>

            <div style="background:#0f172a;border:1px solid rgba(13,153,255,0.3);border-radius:16px;padding:30px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:8px;">ИТОГОВЫЙ РАСЧЕТ</div>
              <div data-calc-total style="font-size:clamp(2.2rem, 4vw, 3rem);font-weight:900;color:#38bdf8;margin-bottom:20px;letter-spacing:-0.5px;">62 500 ₽</div>
              <a href="${c.btnUrl || '#order'}" class="t-btn" style="width:100%;padding:14px;background:${d.accentColor};color:#fff;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 8px 24px rgba(13,153,255,0.4);display:inline-block;box-sizing:border-box;">${c.btnText}</a>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'before-after-1',
    cat: 'gallery',
    category: 'gallery',
    name: 'Слайдер сравнения До / После',
    icon: 'compare',
    defaultContent: {
      badge: 'РЕЗУЛЬТАТЫ РАБОТЫ',
      title: 'Сравнение До и После редизайна',
      subtitle: 'Потяните интерактивный ползунок в центре влево или вправо, чтобы оценить разницу.',
      beforeImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80',
      afterImg: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
      beforeLabel: 'БЫЛО (Старый сайт)',
      afterLabel: 'СТАЛО (Aurora Web)'
    },
    defaultDesign: {
      bgColor: '#070a13',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '80px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:1000px;margin:0 auto;text-align:center;">
          <div style="display:inline-block;padding:4px 14px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;letter-spacing:1px;">${c.badge}</div>
          <h2 style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:800;margin-bottom:14px;">${c.title}</h2>
          <p style="color:#94a3b8;font-size:16px;max-width:640px;margin:0 auto 40px;">${c.subtitle}</p>

          <div class="tilda-ba-wrapper" data-tilda-before-after>
            <span class="tilda-ba-badge tilda-ba-badge-before">${c.beforeLabel}</span>
            <span class="tilda-ba-badge tilda-ba-badge-after">${c.afterLabel}</span>
            <img src="${c.beforeImg}" alt="Before" class="tilda-ba-img-before" />
            <div class="tilda-ba-after-wrap" data-ba-after>
              <img src="${c.afterImg}" alt="After" class="tilda-ba-img-after" />
            </div>
            <div class="tilda-ba-handle-line" data-ba-handle>
              <div class="tilda-ba-handle-btn">⇄</div>
            </div>
            <input type="range" min="0" max="100" value="50" class="tilda-ba-range-input" />
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'timer-1',
    cat: 'cover',
    category: 'cover',
    name: 'Таймер обратного отсчета акции',
    icon: 'timer',
    defaultContent: {
      badge: '🔥 ОГРАНИЧЕННОЕ ПРЕДЛОЖЕНИЕ',
      title: 'Скидка 40% на создание сайта до конца месяца',
      subtitle: 'Забронируйте разработку проекта по специальной промо-цене прямо сейчас.',
      endDate: '2026-12-31T23:59:59',
      btnText: 'Зафиксировать скидку',
      btnUrl: '#order'
    },
    defaultDesign: {
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '90px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:860px;margin:0 auto;text-align:center;">
          <div style="display:inline-block;padding:6px 18px;background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.35);border-radius:20px;font-size:12px;font-weight:700;margin-bottom:20px;letter-spacing:1px;">${c.badge}</div>
          <h2 style="font-size:clamp(2.2rem, 5vw, 3.4rem);font-weight:900;line-height:1.2;margin-bottom:18px;letter-spacing:-0.5px;">${c.title}</h2>
          <p style="font-size:1.15rem;color:#94a3b8;max-width:680px;margin:0 auto 44px;line-height:1.6;">${c.subtitle}</p>

          <div data-tilda-timer data-timer-end="${c.endDate || '2026-12-31T23:59:59'}" style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:44px;">
            <div style="min-width:90px;padding:18px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
              <div data-timer-days style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:900;color:${d.accentColor};font-family:monospace;line-height:1;">00</div>
              <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:6px;">Дней</div>
            </div>
            <div style="min-width:90px;padding:18px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
              <div data-timer-hours style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:900;color:${d.accentColor};font-family:monospace;line-height:1;">00</div>
              <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:6px;">Часов</div>
            </div>
            <div style="min-width:90px;padding:18px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
              <div data-timer-mins style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:900;color:${d.accentColor};font-family:monospace;line-height:1;">00</div>
              <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:6px;">Минут</div>
            </div>
            <div style="min-width:90px;padding:18px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
              <div data-timer-secs style="font-size:clamp(2rem, 4vw, 2.8rem);font-weight:900;color:#38bdf8;font-family:monospace;line-height:1;">00</div>
              <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:6px;">Секунд</div>
            </div>
          </div>

          <a href="${c.btnUrl || '#order'}" class="t-btn" style="display:inline-flex;align-items:center;padding:16px 36px;background:${d.accentColor};color:#fff;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 10px 30px rgba(13,153,255,0.4);transition:transform 0.2s;">${c.btnText}</a>
        </div>
      </div>
    `
  },
  {
    id: 'marquee-1',
    cat: 'partners',
    category: 'partners',
    name: 'Бегущая строка партнеров и брендов',
    icon: 'view_carousel',
    defaultContent: {
      title: 'Нам доверяют лидеры цифрового рынка',
      items: [
        'AURORA DESIGN', 'VK MINI APPS', 'ЯНДЕКС.ДЗЕН', 'TILDA PUBLISHING',
        'GOOGLE CLOUD', 'FIGMA PRO', 'TELEGRAM API', 'GITHUB ENTERPRISE'
      ]
    },
    defaultDesign: {
      bgColor: '#090d16',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '40px 0'
    },
    html: (c, d) => {
      const itemsList = c.items || ['AURORA DESIGN', 'VK MINI APPS', 'ЯНДЕКС.ДЗЕН', 'TILDA PUBLISHING'];
      const doubled = [...itemsList, ...itemsList];
      return `
        <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">${c.title}</div>
          </div>
          <div class="tilda-marquee">
            <div class="tilda-marquee-track">
              ${doubled.map(item => `
                <div style="display:inline-flex;align-items:center;gap:10px;padding:12px 28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:50px;font-size:15px;font-weight:800;color:#e2e8f0;letter-spacing:0.5px;white-space:nowrap;">
                  <span style="color:${d.accentColor};font-size:18px;">✦</span>
                  ${item}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  },
  {
    id: 'widget-fab-1',
    cat: 'contacts',
    category: 'contacts',
    name: 'Плавающий виджет связи (FAB) в мессенджерах',
    icon: 'chat_bubble',
    defaultContent: {
      badge: 'ВИДЖЕТ СВЯЗИ',
      title: 'Быстрая связь в мессенджерах (FAB кнопка)',
      desc: 'В правом нижнем углу сайта отобразится плавающая кнопка для мгновенной связи через Telegram, WhatsApp, Телефон и ВКонтакте.',
      telegramUrl: 'https://t.me/aurora_support',
      whatsappUrl: 'https://wa.me/79990000000',
      phoneUrl: 'tel:+79990000000',
      vkUrl: 'https://vk.com'
    },
    defaultDesign: {
      bgColor: '#111827',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '40px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:860px;margin:0 auto;text-align:center;">
          <div style="background:rgba(13,153,255,0.08);border:1px dashed rgba(13,153,255,0.4);border-radius:16px;padding:28px 20px;">
            <div style="display:inline-block;padding:4px 12px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;">${c.badge}</div>
            <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">${c.title}</h3>
            <p style="color:#94a3b8;font-size:14px;max-width:580px;margin:0 auto;">${c.desc}</p>
          </div>
        </div>

        <div class="tilda-fab-container" data-tilda-fab>
          <div class="tilda-fab-menu" data-fab-menu>
            <a href="${c.telegramUrl || 'https://t.me'}" target="_blank" rel="noopener noreferrer" class="tilda-fab-item">
              <span style="color:#38bdf8;font-size:18px;">✈️</span>
              <span>Telegram</span>
            </a>
            <a href="${c.whatsappUrl || 'https://whatsapp.com'}" target="_blank" rel="noopener noreferrer" class="tilda-fab-item">
              <span style="color:#22c55e;font-size:18px;">💬</span>
              <span>WhatsApp</span>
            </a>
            <a href="${c.phoneUrl || 'tel:+79990000000'}" class="tilda-fab-item">
              <span style="color:#eab308;font-size:18px;">📞</span>
              <span>Позвонить нам</span>
            </a>
            <a href="${c.vkUrl || 'https://vk.com'}" target="_blank" rel="noopener noreferrer" class="tilda-fab-item">
              <span style="color:#0d99ff;font-size:18px;">🌐</span>
              <span>ВКонтакте</span>
            </a>
          </div>
          <button type="button" class="tilda-fab-main-btn" data-fab-toggle title="Написать нам в мессенджере">💬</button>
        </div>
      </div>
    `
  },
  {
    id: 'widget-cookie-1',
    cat: 'footer',
    category: 'footer',
    name: 'Баннер согласия на Cookie / GDPR',
    icon: 'cookie',
    defaultContent: {
      title: 'Уведомление об использовании Cookie файлов',
      text: 'Мы используем cookie для обеспечения лучшего пользовательского опыта и аналитики. Оставаясь на сайте, вы подтверждаете согласие с Политикой конфиденциальности.',
      btnText: 'Принять все',
      policyUrl: '#privacy',
      policyText: 'Подробнее'
    },
    defaultDesign: {
      bgColor: '#090d16',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '30px 20px'
    },
    html: (c, d) => `
      <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
        <div class="t-container" style="max-width:860px;margin:0 auto;text-align:center;">
          <div style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;padding:20px;">
            <span style="font-size:13px;color:#94a3b8;">🍪 Баннер согласия на Cookie появится внизу экрана при первом посещении сайта пользователем.</span>
          </div>
        </div>

        <div class="tilda-cookie-banner" data-tilda-cookie>
          <div style="display:flex;align-items:center;gap:14px;">
            <span style="font-size:26px;">🍪</span>
            <div style="font-size:13px;line-height:1.5;color:#cbd5e1;">
              ${c.text}
              ${c.policyUrl ? `<a href="${c.policyUrl}" style="color:${d.accentColor};text-decoration:underline;margin-left:6px;">${c.policyText || 'Подробнее'}</a>` : ''}
            </div>
          </div>
          <button type="button" class="tilda-cookie-btn" data-cookie-accept>${c.btnText}</button>
        </div>
      </div>
    `
  },
  {
    id: 'pricing-toggle-1',
    cat: 'pricing',
    category: 'pricing',
    name: 'Тарифная сетка с переключателем Месяц / Год (-20%)',
    icon: 'toggle_on',
    defaultContent: {
      badge: 'ПРОЗРАЧНЫЕ ЦЕНЫ',
      title: 'Тарифы для проектов любого масштаба',
      subtitle: 'При оплате за год вы экономите 20% от ежемесячной стоимости.',
      plans: [
        {
          name: 'Старт',
          desc: 'Для персональных сайтов и лендингов',
          priceMonthly: '990 ₽',
          priceYearly: '790 ₽',
          features: ['До 3 страниц', 'Готовые блоки Tilda', 'SSL сертификат', 'Поддержка 24/7'],
          btnText: 'Выбрать тариф',
          btnUrl: '#order',
          popular: false
        },
        {
          name: 'Бизнес',
          desc: 'Для растущих проектов и магазинов',
          priceMonthly: '2 490 ₽',
          priceYearly: '1 990 ₽',
          features: ['Неограниченно страниц', 'Zero Block редактор', 'Корзина и оплата', 'CRM интеграция', 'Приоритетная поддержка'],
          btnText: 'Попробовать бесплатно',
          btnUrl: '#order',
          popular: true
        },
        {
          name: 'Enterprise',
          desc: 'Для корпораций и масштабных сервисов',
          priceMonthly: '6 990 ₽',
          priceYearly: '5 590 ₽',
          features: ['Все возможности Бизнес', 'Выделенный сервер', 'Персональный менеджер', 'SLA 99.99%', 'Индивидуальные модули'],
          btnText: 'Связаться с нами',
          btnUrl: '#contact',
          popular: false
        }
      ]
    },
    defaultDesign: {
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#0d99ff',
      padding: '90px 20px'
    },
    html: (c, d) => {
      const plans = c.plans || [];
      return `
        <div class="t-block" style="background:${d.bgColor};color:${d.textColor};padding:${d.padding};">
          <div class="t-container" style="max-width:1200px;margin:0 auto;text-align:center;">
            <div style="display:inline-block;padding:4px 14px;background:rgba(13,153,255,0.15);color:${d.accentColor};border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;letter-spacing:1px;">${c.badge}</div>
            <h2 style="font-size:clamp(2rem, 4vw, 3rem);font-weight:800;margin-bottom:14px;">${c.title}</h2>
            <p style="color:#94a3b8;font-size:16px;max-width:640px;margin:0 auto 30px;">${c.subtitle}</p>

            <div class="tilda-pricing-toggle-wrap" data-pricing-toggle>
              <button type="button" class="tilda-pricing-pill-btn is-active" data-billing-period="monthly">Ежемесячно</button>
              <button type="button" class="tilda-pricing-pill-btn" data-billing-period="yearly">На 1 год (-20% скидка)</button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:30px;align-items:stretch;text-align:left;">
              ${plans.map(p => `
                <div class="t-pricing-card" style="background:${p.popular ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' : '#1e293b'};border:${p.popular ? '2px solid #0d99ff' : '1px solid rgba(255,255,255,0.1)'};border-radius:20px;padding:36px 28px;display:flex;flex-direction:column;position:relative;box-shadow:${p.popular ? '0 20px 50px rgba(13,153,255,0.25)' : '0 10px 30px rgba(0,0,0,0.3)'};">
                  ${p.popular ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#0d99ff;color:#fff;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;">🔥 ХИТ ПРОДАЖ</div>` : ''}
                  <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:6px;">${p.name}</div>
                  <div style="font-size:13px;color:#94a3b8;margin-bottom:24px;min-height:36px;">${p.desc}</div>
                  <div style="margin-bottom:28px;">
                    <span data-price-monthly="${p.priceMonthly}" data-price-yearly="${p.priceYearly}" style="font-size:36px;font-weight:900;color:#fff;letter-spacing:-0.5px;">${p.priceMonthly}</span>
                    <span data-period-label style="font-size:14px;color:#94a3b8;font-weight:600;">/ месяц</span>
                  </div>
                  <ul style="list-style:none;padding:0;margin:0 0 32px;display:flex;flex-direction:column;gap:12px;flex:1;">
                    ${(p.features || []).map(f => `
                      <li style="display:flex;align-items:center;gap:10px;font-size:14px;color:#e2e8f0;">
                        <span style="color:${d.accentColor};font-weight:800;">✓</span>
                        <span>${f}</span>
                      </li>
                    `).join('')}
                  </ul>
                  <a href="${p.btnUrl || '#order'}" class="t-btn" style="display:flex;align-items:center;justify-content:center;padding:14px;background:${p.popular ? d.accentColor : 'rgba(255,255,255,0.1)'};color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;transition:all 0.2s;text-align:center;">${p.btnText}</a>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }
];

export function getBlockById(id) {
  return TILDA_BLOCKS.find(b => b.id === id);
}

export function getBlocksByCategory(catId) {
  return TILDA_BLOCKS.filter(b => (b.cat || b.category) === catId);
}

function escapeBlockHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderBlockHtml(block, contentData, designData) {
  if (!block || typeof block.html !== 'function') return '';
  const mergedContent = { ...block.defaultContent, ...contentData };
  const mergedDesign = { ...block.defaultDesign, ...designData };
  
  if (mergedDesign.bgColor && !mergedDesign.background) mergedDesign.background = mergedDesign.bgColor;
  if (mergedDesign.background && !mergedDesign.bgColor) mergedDesign.bgColor = mergedDesign.background;

  let baseHtml = block.html(mergedContent, mergedDesign);

  // If standard block has custom appended elements (from detailed element editing)
  if (!block.isZero && mergedContent.customElements && mergedContent.customElements.length > 0) {
    let extraElementsMarkup = '';
    mergedContent.customElements.forEach(el => {
      const p = el.props || {};
      let inner = '';
      const borderStyle = (p.borderWidth && p.borderWidth !== '0px') 
        ? `${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor || '#0d99ff'}` 
        : (p.borderColor && p.borderWidth ? `${p.borderWidth} solid ${p.borderColor}` : 'none');
      const shadowStyle = p.boxShadow && p.boxShadow !== 'none' ? `box-shadow:${p.boxShadow};` : '';
      const targetAttr = p.targetBlank ? 'target="_blank" rel="noopener noreferrer"' : '';

      if (el.type === 'img') {
        const lbAttr = p.lightbox ? `data-lightbox="true" data-caption="${escapeBlockHtml(p.caption || p.content || '')}" style="cursor:zoom-in;` : 'style="';
        const imgTag = `<img src="${p.content || ''}" alt="${escapeBlockHtml(p.caption || '')}" ${lbAttr}width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius || '0px'};${shadowStyle}border:${borderStyle};display:block;pointer-events:none;" />`;
        if (p.url && !p.lightbox) {
          inner = `<a href="${p.url}" ${targetAttr} style="display:block;width:100%;height:100%;text-decoration:none;">${imgTag}</a>`;
        } else {
          inner = imgTag;
        }
      } else if (el.type === 'shape') {
        inner = `<div style="width:100%;height:100%;border-radius:${p.borderRadius || '0px'};background:${p.bgColor || 'rgba(13,153,255,0.2)'};border:${borderStyle};${shadowStyle}box-sizing:border-box;"></div>`;
      } else if (el.type === 'btn') {
        inner = `<a href="${p.url || '#'}" ${targetAttr} class="t-btn" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor || '#0d99ff'};color:${p.color || '#fff'};border-radius:${p.borderRadius || '8px'};font-size:${p.fontSize || 15}px;font-weight:${p.fontWeight || '700'};font-family:'${p.fontFamily || 'Montserrat'}',sans-serif;text-decoration:none;user-select:none;border:${borderStyle};${shadowStyle}letter-spacing:${p.letterSpacing || 0}px;box-sizing:border-box;">${escapeBlockHtml(p.content || 'Кнопка')}</a>`;
      } else if (el.type === 'icon') {
        const iconInner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color || '#0d99ff'};font-size:${p.fontSize || 32}px;background:${p.bgColor || 'transparent'};border-radius:${p.borderRadius || '0px'};border:${borderStyle};${shadowStyle}box-sizing:border-box;"><span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || p.content || 'star'}</span></div>`;
        if (p.url) {
          inner = `<a href="${p.url}" ${targetAttr} style="display:block;width:100%;height:100%;text-decoration:none;">${iconInner}</a>`;
        } else {
          inner = iconInner;
        }
      } else if (el.type === 'form') {
        inner = `
          <div style="width:100%;height:100%;padding:14px;background:${p.bgColor || '#1e293b'};border-radius:${p.borderRadius || '12px'};border:${borderStyle};${shadowStyle}display:flex;flex-direction:column;gap:8px;box-sizing:border-box;">
            <div style="font-size:13px;font-weight:700;color:${p.color || '#fff'};">${escapeBlockHtml(p.content || 'Оставить заявку')}</div>
            <input type="text" placeholder="Ваше имя" style="padding:6px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
            <input type="tel" placeholder="+7 (999) 000-00-00" style="padding:6px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
            <button type="button" style="padding:6px 12px;background:#0d99ff;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">Отправить</button>
          </div>
        `;
      } else if (el.type === 'code') {
        inner = `<div style="width:100%;height:100%;overflow:hidden;">${p.content || ''}</div>`;
      } else {
        const tagOpen = p.url ? `<a href="${p.url}" ${targetAttr} style="text-decoration:none;color:inherit;display:block;width:100%;height:100%;">` : '';
        const tagClose = p.url ? `</a>` : '';
        inner = `${tagOpen}<div style="width:100%;height:100%;font-size:${p.fontSize || 16}px;font-weight:${p.fontWeight || '500'};color:${p.color || '#fff'};line-height:${p.lineHeight || 1.3};text-align:${p.textAlign || 'left'};font-family:'${p.fontFamily || 'Inter'}',sans-serif;letter-spacing:${p.letterSpacing || 0}px;word-break:break-word;box-sizing:border-box;">${escapeBlockHtml(p.content || '')}</div>${tagClose}`;
      }

      const animAttr = (p.animation && p.animation.type && p.animation.type !== 'none')
        ? ` data-tilda-anim="${p.animation.type}" data-anim-delay="${p.animation.delay || 0}" data-anim-duration="${p.animation.duration || 0.7}"`
        : '';

      extraElementsMarkup += `
        <div class="block-custom-element" data-custom-el-id="${el.id}" data-custom-el-type="${el.type}"${animAttr} style="position:absolute;left:${p.x || 60}px;top:${p.y || 40}px;width:${p.width || 220}px;height:${p.height || 50}px;transform:rotate(${p.rotation || 0}deg);z-index:${p.zIndex || 10};opacity:${p.opacity !== undefined ? p.opacity : 1};box-sizing:border-box;cursor:move;pointer-events:auto;">
          ${inner}
        </div>
      `;
    });

    const lastClosing = baseHtml.lastIndexOf('</');
    if (lastClosing !== -1) {
      baseHtml = baseHtml.substring(0, lastClosing) + `<div class="block-custom-elements-container">${extraElementsMarkup}</div>` + baseHtml.substring(lastClosing);
    }
  }

  // Apply saved inline text edits and free element drag offsets if present (and mark data-el-key)
  if (!block.isZero && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(baseHtml, 'text/html');
      const root = doc.body.firstElementChild;
      if (root) {
        const targets = root.querySelectorAll('h1, h2, h3, h4, p, a, img, button, .t-btn, .t-feature-card, .t-pricing-card, .t-badge, blockquote, li, span');
        targets.forEach((node, idx) => {
          if (node.closest('.block-custom-element')) return;
          const key = `${node.tagName.toLowerCase()}_${idx}`;
          node.setAttribute('data-el-key', key);
          if (mergedContent.inlineEdits && mergedContent.inlineEdits[key] !== undefined && node.tagName !== 'IMG') {
            node.innerHTML = mergedContent.inlineEdits[key];
          }
          if (mergedContent.elementOffsets && mergedContent.elementOffsets[key]) {
            const off = mergedContent.elementOffsets[key];
            if (off.x || off.y) {
              node.style.position = 'relative';
              node.style.left = `${off.x || 0}px`;
              node.style.top = `${off.y || 0}px`;
              node.style.zIndex = '25';
            }
          }
        });
        baseHtml = doc.body.innerHTML;
      }
    } catch (err) {
      console.warn('Apply offsets error:', err);
    }
  }

  return baseHtml;
}

export function extractBlockDefaultData(block) {
  if (!block) return { content: {}, design: {} };
  return {
    content: { ...(block.defaultContent || {}) },
    design: { ...(block.defaultDesign || {}) }
  };
}
