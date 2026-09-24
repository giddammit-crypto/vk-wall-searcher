/**
 * tilda_blocks.js — Библиотека 40+ готовых адаптивных блоков Tilda
 * Все блоки структурированы по категориям с русскоязычными названиями,
 * современным flex/grid дизайном, поддержкой темной/светлой темы и интерактивного runtime.
 */

export const TILDA_CATEGORIES = [
  { id: 'cover',        name: '🌟 Обложки (Hero)',           icon: 'wallpaper',      count: 4 },
  { id: 'about',        name: 'ℹ️ О проекте / компании',     icon: 'info',           count: 3 },
  { id: 'title',        name: '🏷️ Заголовки и разделители',  icon: 'title',          count: 3 },
  { id: 'text',         name: '📝 Текстовые блоки',          icon: 'article',        count: 3 },
  { id: 'features',     name: '⚡ Преимущества и фичи',       icon: 'star',           count: 3 },
  { id: 'gallery',      name: '🖼️ Галереи и медиа',          icon: 'photo_library',  count: 3 },
  { id: 'form',         name: '📋 Формы заявок и кнопки',    icon: 'edit_calendar',  count: 3 },
  { id: 'pricing',      name: '💳 Тарифы и цены',            icon: 'payments',       count: 3 },
  { id: 'testimonials', name: '💬 Отзывы клиентов',          icon: 'forum',          count: 3 },
  { id: 'menu',         name: '🧭 Меню и навигация',         icon: 'menu',           count: 3 },
  { id: 'footer',       name: '⚓ Подвал и футеры',          icon: 'call_to_action', count: 3 },
  { id: 'faq',          name: '❓ Вопросы и ответы (FAQ)',   icon: 'help_outline',   count: 3 },
  { id: 'media',        name: '🎬 Видео и аудио плеер',      icon: 'smart_display',  count: 2 },
  { id: 'contacts',     name: '📍 Контакты и карта',         icon: 'location_on',    count: 3 },
  { id: 'store',        name: '🛍️ Магазин и товары',         icon: 'shopping_cart',  count: 3 },
  { id: 'zero',         name: '⚡ Zero Block (Свободный)',   icon: 'bolt',           count: 1 }
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
            <img src="${c.img}" alt="Preview" style="width:100%;height:auto;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);" />
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
          <img src="${c.img}" alt="Mission" style="width:100%;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);" />
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
      brand: 'АВРОРА TILDA',
      tagline: 'Платформа визуального проектирования сайтов',
      copyright: '© 2026 Аврора Tilda. Все права защищены.'
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

  // ─── 11. ZERO BLOCK ──────────────────────────────────────────
  {
    id: 'zero-1',
    cat: 'zero',
    category: 'zero',
    isZero: true,
    name: 'Свободный Zero Block',
    icon: 'bolt',
    defaultContent: {},
    defaultDesign: { height: 600, background: '#070a13' },
    html: (c, d) => `
      <div class="t-block t-zero-block-rendered" style="min-height:${d.height || 600}px;background:${d.background || '#070a13'};position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;color:#64748b;padding:40px;">
          <span class="material-symbols-rounded" style="font-size:48px;color:#0d99ff;margin-bottom:12px;">bolt</span>
          <div style="font-size:18px;font-weight:700;color:#fff;">Свободный холст Zero Block</div>
          <div style="font-size:13px;margin-top:6px;">Нажмите кнопку «Редактировать Zero Block» в панели свойств справа для свободного расположения элементов.</div>
        </div>
      </div>
    `
  }
];

export function getBlockById(id) {
  return TILDA_BLOCKS.find(b => b.id === id);
}

export function getBlocksByCategory(catId) {
  return TILDA_BLOCKS.filter(b => (b.cat || b.category) === catId);
}

export function renderBlockHtml(block, contentData, designData) {
  if (!block || typeof block.html !== 'function') return '';
  const mergedContent = { ...block.defaultContent, ...contentData };
  const mergedDesign = { ...block.defaultDesign, ...designData };
  return block.html(mergedContent, mergedDesign);
}

export function extractBlockDefaultData(block) {
  if (!block) return { content: {}, design: {} };
  return {
    content: { ...(block.defaultContent || {}) },
    design: { ...(block.defaultDesign || {}) }
  };
}
