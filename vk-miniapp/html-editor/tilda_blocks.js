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
        if (el.type === 'img') {
          inner = `<img src="${p.content || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius || '0px'};pointer-events:none;" alt="" />`;
        } else if (el.type === 'shape') {
          inner = `<div style="width:100%;height:100%;border-radius:${p.borderRadius || '0px'};background:${p.bgColor || 'rgba(13,153,255,0.2)'};border:${p.borderWidth || '1px'} solid ${p.borderColor || '#0d99ff'};"></div>`;
        } else if (el.type === 'btn') {
          inner = `<div class="t-btn" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor || '#0d99ff'};color:${p.color || '#fff'};border-radius:${p.borderRadius || '8px'};font-size:${p.fontSize || 15}px;font-weight:${p.fontWeight || '700'};font-family:'${p.fontFamily || 'Montserrat'}',sans-serif;user-select:none;">${p.content || 'Кнопка'}</div>`;
        } else if (el.type === 'icon') {
          inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color || '#0d99ff'};font-size:${p.fontSize || 32}px;"><span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || 'star'}</span></div>`;
        } else {
          inner = `<div style="font-size:${p.fontSize || 16}px;font-weight:${p.fontWeight || '500'};color:${p.color || '#fff'};line-height:1.3;text-align:${p.textAlign || 'left'};font-family:'${p.fontFamily || 'Inter'}',sans-serif;word-break:break-word;">${p.content || ''}</div>`;
        }

        elsMarkup += `
          <div class="zero-canvas-element" data-zb-el-id="${el.id}" style="position:absolute;left:${p.x || 0}px;top:${p.y || 0}px;width:${p.width || 200}px;height:${p.height || 50}px;transform:rotate(${p.rotation || 0}deg);z-index:${p.zIndex || 1};box-sizing:border-box;cursor:move;">
            ${inner}
          </div>
        `;
      });

      return `
        <div class="t-block t-zero-block" style="position:relative;width:100%;min-height:${d.height || 560}px;height:${d.height || 560}px;background:${d.background || '#070a13'};overflow:hidden;">
          <div class="t-zero-container" style="position:relative;width:100%;max-width:1200px;height:100%;margin:0 auto;">
            ${elsMarkup}
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
      if (el.type === 'img') {
        inner = `<img src="${p.content || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius || '8px'};pointer-events:none;" alt="" />`;
      } else if (el.type === 'shape') {
        inner = `<div style="width:100%;height:100%;border-radius:${p.borderRadius || '8px'};background:${p.bgColor || 'rgba(13,153,255,0.2)'};border:${p.borderWidth || '1px'} solid ${p.borderColor || '#0d99ff'};"></div>`;
      } else if (el.type === 'btn') {
        inner = `<a href="${p.url || '#'}" class="t-btn" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor || '#0d99ff'};color:${p.color || '#fff'};border-radius:${p.borderRadius || '8px'};font-size:${p.fontSize || 15}px;font-weight:${p.fontWeight || '700'};font-family:'${p.fontFamily || 'Montserrat'}',sans-serif;text-decoration:none;user-select:none;">${p.content || 'Кнопка'}</a>`;
      } else if (el.type === 'icon') {
        inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color || '#0d99ff'};font-size:${p.fontSize || 32}px;"><span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || 'star'}</span></div>`;
      } else {
        inner = `<div style="font-size:${p.fontSize || 16}px;font-weight:${p.fontWeight || '500'};color:${p.color || '#fff'};line-height:1.4;text-align:${p.textAlign || 'left'};font-family:'${p.fontFamily || 'Inter'}',sans-serif;word-break:break-word;">${p.content || ''}</div>`;
      }

      extraElementsMarkup += `
        <div class="block-custom-element" data-custom-el-id="${el.id}" style="position:absolute;left:${p.x || 60}px;top:${p.y || 40}px;width:${p.width || 220}px;height:${p.height || 50}px;transform:rotate(${p.rotation || 0}deg);z-index:${p.zIndex || 10};box-sizing:border-box;cursor:move;">
          ${inner}
        </div>
      `;
    });

    const lastClosing = baseHtml.lastIndexOf('</div>');
    if (lastClosing !== -1) {
      baseHtml = baseHtml.substring(0, lastClosing) + `<div class="block-custom-elements-container" style="position:relative;width:100%;max-width:1200px;margin:0 auto;height:0;">${extraElementsMarkup}</div>` + baseHtml.substring(lastClosing);
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
