/**
 * visual.js — WYSIWYG Visual Editor for Aurora HTML Editor
 * Drag-and-drop block builder with bidirectional code sync
 */

// ─── Block Palette ────────────────────────────────────────────
export const BLOCK_PALETTE = [
  // Layout
  { cat: 'layout', id: 'row-container', icon: 'splitscreen', label: 'Строка (2 слота)',
    html: `<div class="ve-row-container">
  <div class="ve-col-slot" data-ve-slot="true" style="flex:1 1 calc(50% - 8px);"></div>
  <div class="ve-col-slot" data-ve-slot="true" style="flex:1 1 calc(50% - 8px);"></div>
</div>` },
  { cat: 'layout', id: 'row-container-3', icon: 'view_week', label: 'Строка (3 слота)',
    html: `<div class="ve-row-container">
  <div class="ve-col-slot" data-ve-slot="true" style="flex:1 1 calc(33.333% - 11px);"></div>
  <div class="ve-col-slot" data-ve-slot="true" style="flex:1 1 calc(33.333% - 11px);"></div>
  <div class="ve-col-slot" data-ve-slot="true" style="flex:1 1 calc(33.333% - 11px);"></div>
</div>` },
  { cat: 'layout', id: 'row-flex', icon: 'view_agenda', label: 'Flex-ряд (адаптивный)',
    html: `<div class="ve-row-flex" style="display:flex;gap:16px;flex-wrap:wrap;width:100%;box-sizing:border-box;align-items:stretch;justify-content:flex-start;">
  <div class="ve-col" data-ve-slot="true" style="flex:1 1 calc(50% - 8px);min-width:240px;padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;">
    <p class="ve-col-placeholder">Колонка 1 (50%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="flex:1 1 calc(50% - 8px);min-width:240px;padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;">
    <p class="ve-col-placeholder">Колонка 2 (50%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'row-2col', icon: 'view_column', label: '2 колонки (50/50)',
    html: `<div class="ve-row-2col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 1 (50%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 2 (50%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'row-3col', icon: 'grid_on', label: '3 колонки (33%)',
    html: `<div class="ve-row-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 1 (33%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 2 (33%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 3 (33%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'row-asym-left', icon: 'vertical_split', label: 'Контент + Сайдбар (70/30)',
    html: `<div class="ve-row-asym-left" style="display:grid;grid-template-columns:7fr 3fr;gap:20px;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:100px;">
    <p class="ve-col-placeholder">Основной контент (70%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:100px;">
    <p class="ve-col-placeholder">Сайдбар (30%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'row-asym-right', icon: 'vertical_split', label: 'Сайдбар + Контент (30/70)',
    html: `<div class="ve-row-asym-right" style="display:grid;grid-template-columns:3fr 7fr;gap:20px;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:100px;">
    <p class="ve-col-placeholder">Сайдбар (30%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:100px;">
    <p class="ve-col-placeholder">Основной контент (70%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'row-4col', icon: 'grid_view', label: '4 колонки (25%)',
    html: `<div class="ve-row-4col" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 1 (25%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 2 (25%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 3 (25%)</p>
  </div>
  <div class="ve-col" data-ve-slot="true" style="padding:16px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;box-sizing:border-box;min-height:80px;">
    <p class="ve-col-placeholder">Колонка 4 (25%)</p>
  </div>
</div>` },
  { cat: 'layout', id: 'container', icon: 'crop_free', label: 'Контейнер',
    html: `<div class="ve-container" style="max-width:1100px;width:100%;margin:0 auto;padding:24px 16px;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="min-height:80px;border:1.5px dashed #cbd5e1;border-radius:8px;padding:16px;box-sizing:border-box;">
    <p class="ve-col-placeholder">Контейнер — перетащите сюда блоки</p>
  </div>
</div>` },
  { cat: 'layout', id: 'section', icon: 'view_agenda', label: 'Секция',
    html: `<section class="ve-section" style="padding:clamp(32px, 6vw, 60px) 16px;background:#f8f9fa;width:100%;box-sizing:border-box;">
  <div class="ve-col" data-ve-slot="true" style="max-width:1100px;width:100%;margin:0 auto;min-height:80px;border:1.5px dashed #cbd5e1;border-radius:8px;padding:16px;box-sizing:border-box;">
    <p class="ve-col-placeholder">Секция — перетащите сюда блоки</p>
  </div>
</section>` },
  { cat: 'layout', id: 'spacer', icon: 'height', label: 'Отступ',
    html: `<div class="ve-spacer" style="height:48px;width:100%;"></div>` },
  { cat: 'layout', id: 'divider', icon: 'horizontal_rule', label: 'Разделитель',
    html: `<hr class="ve-divider" style="border:none;border-top:2px solid #e2e8f0;margin:24px 0;width:100%;">` },

  // Typography
  { cat: 'text', id: 'h1', icon: 'format_h1', label: 'Заголовок H1',
    html: `<h1 style="font-size:clamp(28px, 5vw, 48px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.2;word-break:break-word;">Заголовок первого уровня</h1>` },
  { cat: 'text', id: 'h2', icon: 'format_h2', label: 'Заголовок H2',
    html: `<h2 style="font-size:clamp(22px, 4vw, 36px);font-weight:700;color:#2d3748;margin:0 0 14px;line-height:1.3;word-break:break-word;">Заголовок второго уровня</h2>` },
  { cat: 'text', id: 'h3', icon: 'format_h3', label: 'Заголовок H3',
    html: `<h3 style="font-size:clamp(18px, 3vw, 26px);font-weight:600;color:#4a5568;margin:0 0 12px;word-break:break-word;">Заголовок третьего уровня</h3>` },
  { cat: 'text', id: 'paragraph', icon: 'notes', label: 'Параграф',
    html: `<p style="font-size:16px;line-height:1.7;color:#4a5568;margin:0 0 16px;word-break:break-word;">Введите текст параграфа. Здесь может быть любое описание, информационный блок или контентный текст вашей страницы.</p>` },
  { cat: 'text', id: 'lead', icon: 'format_size', label: 'Lead-текст',
    html: `<p style="font-size:clamp(17px, 2.5vw, 20px);line-height:1.6;color:#718096;margin:0 0 24px;font-weight:400;word-break:break-word;">Крупный вступительный текст, который привлекает внимание.</p>` },
  { cat: 'text', id: 'quote', icon: 'format_quote', label: 'Цитата',
    html: `<blockquote style="border-left:4px solid #6366f1;padding:16px 20px;margin:20px 0;background:#f5f3ff;border-radius:0 8px 8px 0;font-style:italic;color:#4c1d95;box-sizing:border-box;">
  «Вдохновляющая цитата или важная мысль»
  <footer style="margin-top:8px;font-style:normal;font-size:14px;color:#7c3aed;">— Автор</footer>
</blockquote>` },
  { cat: 'text', id: 'code', icon: 'code', label: 'Блок кода',
    html: `<pre style="background:#1e293b;color:#e2e8f0;padding:16px 20px;border-radius:10px;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:13px;margin:16px 0;box-sizing:border-box;"><code>// Ваш код здесь
console.log("Hello, World!");</code></pre>` },
  { cat: 'text', id: 'list', icon: 'format_list_bulleted', label: 'Список',
    html: `<ul style="padding-left:24px;margin:16px 0;color:#4a5568;line-height:1.8;box-sizing:border-box;">
  <li>Пункт списка первый</li>
  <li>Пункт списка второй</li>
  <li>Пункт списка третий</li>
</ul>` },

  // Media
  { cat: 'media', id: 'image', icon: 'image', label: 'Картинка',
    html: `<figure style="margin:16px 0;text-align:center;box-sizing:border-box;">
  <img src="https://placehold.co/800x400/6366f1/fff?text=Изображение" alt="Описание" style="width:100%;max-width:800px;border-radius:12px;display:block;margin:0 auto;height:auto;">
  <figcaption style="margin-top:8px;font-size:14px;color:#718096;">Подпись к изображению</figcaption>
</figure>` },
  { cat: 'media', id: 'avatar', icon: 'account_circle', label: 'Аватар + имя',
    html: `<div style="display:flex;align-items:center;gap:14px;padding:12px;box-sizing:border-box;">
  <img src="https://placehold.co/56x56/6366f1/fff?text=АВ" alt="Аватар" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">
  <div>
    <div style="font-weight:600;color:#1a202c;">Имя Фамилия</div>
    <div style="font-size:14px;color:#718096;">Должность / Роль</div>
  </div>
</div>` },
  { cat: 'media', id: 'youtube', icon: 'smart_display', label: 'YouTube',
    html: `<div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;margin:16px 0;width:100%;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
</div>` },

  // Components
  { cat: 'components', id: 'hero', icon: 'view_carousel', label: 'Hero секция',
    html: `<section style="padding:clamp(40px, 8vw, 80px) 16px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border-radius:12px;box-sizing:border-box;">
  <h1 style="font-size:clamp(28px, 6vw, 52px);font-weight:800;margin:0 0 16px;line-height:1.15;word-break:break-word;">Ваш главный заголовок</h1>
  <p style="font-size:clamp(16px, 3vw, 20px);opacity:.85;margin:0 0 32px;max-width:600px;margin-left:auto;margin-right:auto;">Краткое и ёмкое описание вашего продукта или услуги</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <a href="#" style="background:#fff;color:#667eea;padding:12px 28px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px;display:inline-block;">Начать →</a>
    <a href="#" style="border:2px solid rgba(255,255,255,.7);color:#fff;padding:12px 28px;border-radius:50px;font-weight:600;text-decoration:none;font-size:15px;display:inline-block;">Узнать больше</a>
  </div>
</section>` },
  { cat: 'components', id: 'button', icon: 'smart_button', label: 'Кнопка',
    html: `<div style="padding:8px 0;display:inline-block;">
  <a href="#" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;text-align:center;">Нажмите меня</a>
</div>` },
  { cat: 'components', id: 'button-outline', icon: 'radio_button_unchecked', label: 'Кнопка (контур)',
    html: `<div style="padding:8px 0;display:inline-block;">
  <a href="#" style="display:inline-block;border:2px solid #6366f1;color:#6366f1;padding:10px 26px;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;text-align:center;">Контурная кнопка</a>
</div>` },
  { cat: 'components', id: 'card', icon: 'credit_card', label: 'Карточка',
    html: `<div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;max-width:360px;width:100%;box-sizing:border-box;">
  <img src="https://placehold.co/360x200/6366f1/fff?text=Карточка" style="width:100%;height:auto;display:block;">
  <div style="padding:20px;">
    <h3 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a202c;">Название карточки</h3>
    <p style="margin:0 0 20px;color:#718096;line-height:1.6;font-size:14px;">Краткое описание контента карточки. Может быть несколько строк.</p>
    <a href="#" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 22px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Подробнее</a>
  </div>
</div>` },
  { cat: 'components', id: 'badge', icon: 'sell', label: 'Бейдж / Тег',
    html: `<span style="display:inline-block;background:#e0e7ff;color:#4338ca;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">🏷️ Тег / Категория</span>` },
  { cat: 'components', id: 'alert', icon: 'info', label: 'Уведомление',
    html: `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;display:flex;gap:12px;align-items:flex-start;margin:12px 0;width:100%;box-sizing:border-box;">
  <span style="font-size:20px;flex-shrink:0;">ℹ️</span>
  <div>
    <strong style="color:#1e40af;display:block;margin-bottom:4px;font-size:15px;">Заголовок уведомления</strong>
    <span style="color:#3b82f6;font-size:14px;">Текст информационного сообщения для пользователя.</span>
  </div>
</div>` },
  { cat: 'components', id: 'navbar', icon: 'menu', label: 'Навбар',
    html: `<nav style="background:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;min-height:60px;box-shadow:0 1px 3px rgba(0,0,0,.1);width:100%;box-sizing:border-box;flex-wrap:wrap;gap:12px;border-radius:8px;">
  <a href="#" style="font-weight:800;font-size:19px;color:#6366f1;text-decoration:none;">🅰 Логотип</a>
  <div style="display:flex;gap:18px;flex-wrap:wrap;">
    <a href="#" style="color:#4a5568;text-decoration:none;font-weight:500;font-size:14px;">Главная</a>
    <a href="#" style="color:#4a5568;text-decoration:none;font-weight:500;font-size:14px;">О нас</a>
    <a href="#" style="color:#4a5568;text-decoration:none;font-weight:500;font-size:14px;">Контакты</a>
  </div>
  <a href="#" style="background:#6366f1;color:#fff;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Войти</a>
</nav>` },
  { cat: 'components', id: 'pricing', icon: 'payments', label: 'Pricing Card',
    html: `<div style="background:#fff;border-radius:20px;border:2px solid #6366f1;padding:32px 24px;max-width:320px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(99,102,241,.15);box-sizing:border-box;">
  <div style="background:#ede9fe;color:#7c3aed;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;display:inline-block;margin-bottom:14px;">⭐ Популярный</div>
  <h3 style="font-size:22px;font-weight:700;color:#1a202c;margin:0 0 8px;">Pro план</h3>
  <div style="font-size:42px;font-weight:800;color:#6366f1;margin:14px 0;"><sup style="font-size:22px;">₽</sup>990<sub style="font-size:15px;color:#718096;">/мес</sub></div>
  <ul style="list-style:none;padding:0;margin:0 0 24px;color:#4a5568;text-align:left;line-height:2;font-size:14px;">
    <li>✅ Функция первая</li>
    <li>✅ Функция вторая</li>
    <li>✅ Функция третья</li>
    <li>✅ Приоритетная поддержка</li>
  </ul>
  <a href="#" style="display:block;background:#6366f1;color:#fff;padding:12px;border-radius:10px;font-weight:700;text-decoration:none;">Выбрать план</a>
</div>` },
  { cat: 'components', id: 'footer', icon: 'web_asset', label: 'Footer',
    html: `<footer style="background:#1e293b;color:#94a3b8;padding:36px 20px;text-align:center;width:100%;box-sizing:border-box;border-radius:8px;">
  <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:12px;">🅰 Ваш бренд</div>
  <div style="display:flex;gap:20px;justify-content:center;margin-bottom:18px;flex-wrap:wrap;font-size:14px;">
    <a href="#" style="color:#94a3b8;text-decoration:none;">Главная</a>
    <a href="#" style="color:#94a3b8;text-decoration:none;">О нас</a>
    <a href="#" style="color:#94a3b8;text-decoration:none;">Политика</a>
    <a href="#" style="color:#94a3b8;text-decoration:none;">Контакты</a>
  </div>
  <div style="font-size:13px;border-top:1px solid #334155;padding-top:14px;">© 2024 Все права защищены</div>
</footer>` },

  // Forms
  { cat: 'forms', id: 'form-contact', icon: 'contact_mail', label: 'Форма обратной связи',
    html: `<form style="background:#fff;padding:clamp(20px, 4vw, 32px);border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:100%;box-sizing:border-box;" onsubmit="return false">
  <h3 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a202c;">Напишите нам</h3>
  <div style="margin-bottom:14px;">
    <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Имя</label>
    <input type="text" placeholder="Ваше имя" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;outline:none;">
  </div>
  <div style="margin-bottom:14px;">
    <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Email</label>
    <input type="email" placeholder="email@example.com" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;outline:none;">
  </div>
  <div style="margin-bottom:18px;">
    <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Сообщение</label>
    <textarea rows="4" placeholder="Ваше сообщение..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;resize:vertical;outline:none;"></textarea>
  </div>
  <button type="submit" style="width:100%;background:#6366f1;color:#fff;padding:12px;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">Отправить →</button>
</form>` },
  { cat: 'forms', id: 'input', icon: 'text_fields', label: 'Поле ввода',
    html: `<div style="margin:8px 0;width:100%;box-sizing:border-box;">
  <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Поле ввода</label>
  <input type="text" placeholder="Введите значение..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;background:#fff;">
</div>` },
  { cat: 'forms', id: 'textarea', icon: 'subject', label: 'Многострочный ввод',
    html: `<div style="margin:8px 0;width:100%;box-sizing:border-box;">
  <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Текстовая область</label>
  <textarea rows="4" placeholder="Введите текст..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;resize:vertical;background:#fff;"></textarea>
</div>` },
  { cat: 'forms', id: 'checkbox', icon: 'check_box', label: 'Чекбокс',
    html: `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#374151;font-size:14px;margin:8px 0;">
  <input type="checkbox" style="width:18px;height:18px;cursor:pointer;accent-color:#6366f1;">
  <span>Я согласен с условиями использования</span>
</label>` },
  { cat: 'forms', id: 'select', icon: 'arrow_drop_down_circle', label: 'Выпадающий список',
    html: `<div style="margin:8px 0;width:100%;box-sizing:border-box;">
  <label style="display:block;margin-bottom:6px;font-size:14px;font-weight:600;color:#374151;">Выберите опцию</label>
  <select style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:15px;background:#fff;cursor:pointer;box-sizing:border-box;">
    <option>Опция 1</option>
    <option>Опция 2</option>
    <option>Опция 3</option>
  </select>
</div>` },

  // Animations
  { cat: 'anim', id: 'anim-fadein', icon: 'animation', label: 'Fade In',
    html: `<div style="animation:fadeIn 1s ease-in-out;padding:20px;background:#f0fdf4;border-radius:12px;text-align:center;border:2px dashed #86efac;width:100%;box-sizing:border-box;">
  <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
  ✨ Этот блок появляется плавно (Fade In)
</div>` },
  { cat: 'anim', id: 'anim-slideup', icon: 'arrow_upward', label: 'Slide Up',
    html: `<div style="animation:slideUp .7s cubic-bezier(.22,.61,.36,1);padding:20px;background:#fefce8;border-radius:12px;text-align:center;border:2px dashed #fde047;width:100%;box-sizing:border-box;">
  <style>@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}</style>
  🚀 Этот блок всплывает снизу (Slide Up)
</div>` },
  { cat: 'anim', id: 'anim-pulse', icon: 'favorite', label: 'Pulse',
    html: `<div style="animation:pulse 1.5s ease-in-out infinite;display:inline-block;padding:14px 28px;background:#fce7f3;border-radius:50px;color:#db2777;font-weight:700;border:2px solid #f9a8d4;box-sizing:border-box;">
  <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}</style>
  💓 Pulsing блок
</div>` },
  { cat: 'anim', id: 'anim-neon', icon: 'bolt', label: 'Neon Glow',
    html: `<div style="padding:20px;text-align:center;background:#0f172a;border-radius:12px;width:100%;box-sizing:border-box;">
  <style>@keyframes neonPulse{0%,100%{text-shadow:0 0 10px #a78bfa,0 0 20px #a78bfa,0 0 40px #7c3aed}50%{text-shadow:0 0 20px #c4b5fd,0 0 40px #a78bfa,0 0 80px #6d28d9}}</style>
  <span style="font-size:clamp(22px, 5vw, 32px);font-weight:800;color:#a78bfa;animation:neonPulse 2s ease-in-out infinite;">⚡ NEON GLOW</span>
</div>` },
];

// ─── Category config ──────────────────────────────────────────
export const CATEGORIES = [
  { id: 'layout',     label: 'Макет',      icon: 'dashboard' },
  { id: 'text',       label: 'Текст',      icon: 'format_size' },
  { id: 'media',      label: 'Медиа',      icon: 'perm_media' },
  { id: 'components', label: 'Компоненты', icon: 'widgets' },
  { id: 'forms',      label: 'Формы',      icon: 'assignment' },
  { id: 'anim',       label: 'Анимации',   icon: 'animation' },
];

// ─── 16 Шрифтов с поддержкой Google Fonts ──────────────────────
export const TYPO_FONTS = [
  { name: 'Inter', category: 'Google Sans', google: 'Inter:wght@300;400;500;600;700;800;900' },
  { name: 'Roboto', category: 'Google Sans', google: 'Roboto:wght@300;400;500;700;900' },
  { name: 'Montserrat', category: 'Google Sans', google: 'Montserrat:wght@300;400;500;600;700;800;900' },
  { name: 'Open Sans', category: 'Google Sans', google: 'Open+Sans:wght@300;400;600;700;800' },
  { name: 'Playfair Display', category: 'Google Serif', google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700' },
  { name: 'Oswald', category: 'Google Display', google: 'Oswald:wght@300;400;500;600;700' },
  { name: 'Merriweather', category: 'Google Serif', google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400' },
  { name: 'JetBrains Mono', category: 'Google Mono', google: 'JetBrains+Mono:wght@300;400;500;700' },
  { name: 'Caveat', category: 'Google Cursive', google: 'Caveat:wght@400;600;700' },
  { name: 'Fira Code', category: 'Google Mono', google: 'Fira+Code:wght@300;400;500;600;700' },
  { name: 'Georgia', category: 'System Serif' },
  { name: 'Arial', category: 'System Sans' },
  { name: 'Times New Roman', category: 'System Serif' },
  { name: 'Courier New', category: 'System Mono' },
  { name: 'Impact', category: 'System Display' },
  { name: 'Comic Sans MS', category: 'System Cursive' }
];

// ─── Visual Editor Class ──────────────────────────────────────
export class VisualEditor {
  constructor({ paletteEl, canvasEl, propsEl, onExport }) {
    this.paletteEl = paletteEl;
    this.canvasEl  = canvasEl;
    this.propsEl   = propsEl;
    this.onExport  = onExport || (() => {});

    this.selectedBlock = null;
    this.selectedElement = null; // Deep target selection (вложенный элемент)
    this.blocks = [];        // [{id, el, blockDef}]
    this.history = [];
    this.historyIdx = -1;
    this._dragSrc = null;    // block being dragged within canvas
    this._paletteId = null;  // block id being dragged from palette
    this.docTemplate = null; // preserves full html document structure (head, doctype, body attrs)
    this._currentUserCSS = '';
    this._floatingToolbar = null;
    this._contextMenu = null;

    this._buildPalette();
    this._bindCanvas();
    this._initFloatingToolbar();
    this._initContextMenu();
    this._bindKeyboardShortcuts();
  }

  // ── PALETTE ───────────────────────────────────────────────
  _buildPalette() {
    const p = this.paletteEl;
    p.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const catBlocks = BLOCK_PALETTE.filter(b => b.cat === cat.id);
      if (!catBlocks.length) return;

      const section = document.createElement('div');
      section.className = 've-cat-section';
      section.innerHTML = `
        <div class="ve-cat-header" data-cat="${cat.id}">
          <span class="material-symbols-rounded">${cat.icon}</span>
          <span>${cat.label}</span>
          <span class="material-symbols-rounded ve-cat-arrow">expand_more</span>
        </div>
        <div class="ve-cat-blocks" id="ve-cat-${cat.id}">
          ${catBlocks.map(b => `
            <div class="ve-palette-block" draggable="true" data-block-id="${b.id}" title="${b.label}">
              <span class="material-symbols-rounded">${b.icon}</span>
              <span>${b.label}</span>
            </div>
          `).join('')}
        </div>`;
      p.appendChild(section);
    });

    // Toggle categories
    p.querySelectorAll('.ve-cat-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const catId = hdr.dataset.cat;
        const blocksEl = document.getElementById('ve-cat-' + catId);
        const arrow = hdr.querySelector('.ve-cat-arrow');
        blocksEl.classList.toggle('is-collapsed');
        arrow.textContent = blocksEl.classList.contains('is-collapsed') ? 'chevron_right' : 'expand_more';
      });
    });

    // Palette block drag start + click to insert (mobile/touch friendly)
    p.querySelectorAll('.ve-palette-block').forEach(el => {
      el.addEventListener('dragstart', e => {
        this._paletteId = el.dataset.blockId;
        this._dragSrc = null;
        e.dataTransfer.effectAllowed = 'copy';
        el.classList.add('is-dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('is-dragging');
        this._paletteId = null;
      });
      // Click to insert
      el.addEventListener('click', () => {
        const blockId = el.dataset.blockId;
        const def = BLOCK_PALETTE.find(b => b.id === blockId);
        if (def) {
          this._insertBlock(def);
          if (window.innerWidth <= 880) {
            document.getElementById('wysiwyg-palette')?.classList.remove('is-open');
            document.getElementById('wysiwyg-backdrop')?.classList.remove('is-open');
          }
        }
      });
    });
  }

  // ── CANVAS BINDING ─────────────────────────────────────────
  _bindCanvas() {
    const canvas = this.canvasEl;

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          this._updateCanvasDims(Math.round(cr.width), Math.round(canvas.scrollHeight || cr.height));
        }
      });
      ro.observe(canvas);
      this._canvasResizeObserver = ro;
    }

    canvas.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = this._paletteId ? 'copy' : 'move';
      const dropInfo = this._calculateDropTargetAndZone(e);
      this._clearDropHighlight();
      if (dropInfo && dropInfo.target && dropInfo.target !== canvas) {
        if (dropInfo.zone === 'left') dropInfo.target.classList.add('ve-drop-left');
        else if (dropInfo.zone === 'right') dropInfo.target.classList.add('ve-drop-right');
        else if (dropInfo.zone === 'inside') dropInfo.target.classList.add('ve-drop-inside');
        else if (dropInfo.zone === 'before') {
          dropInfo.target.classList.add('ve-drop-before');
          dropInfo.target.classList.add('ve-drop-top');
        } else if (dropInfo.zone === 'after') {
          dropInfo.target.classList.add('ve-drop-after');
          dropInfo.target.classList.add('ve-drop-bottom');
        }
      }
    });

    canvas.addEventListener('dragleave', e => {
      if (!canvas.contains(e.relatedTarget)) this._clearDropHighlight();
    });

    canvas.addEventListener('drop', e => {
      e.preventDefault();
      const dropInfo = this._calculateDropTargetAndZone(e);
      this._clearDropHighlight();

      let blockToInsert = null;
      if (this._paletteId) {
        const def = BLOCK_PALETTE.find(b => b.id === this._paletteId);
        if (def) {
          blockToInsert = this._createBlockElement(def);
        }
        this._paletteId = null;
      } else if (this._dragSrc) {
        blockToInsert = this._dragSrc;
        this._dragSrc = null;
      }

      if (!blockToInsert) return;

      if (!dropInfo || dropInfo.zone === 'canvas') {
        const empty = canvas.querySelector('.ve-empty-state');
        if (empty) canvas.insertBefore(blockToInsert, empty);
        else canvas.appendChild(blockToInsert);
      } else if (dropInfo.zone === 'inside') {
        const col = dropInfo.target;
        col.querySelectorAll('.ve-col-placeholder').forEach(p => p.remove());
        col.appendChild(blockToInsert);
      } else if (dropInfo.zone === 'before') {
        dropInfo.target.parentNode.insertBefore(blockToInsert, dropInfo.target);
      } else if (dropInfo.zone === 'after') {
        dropInfo.target.parentNode.insertBefore(blockToInsert, dropInfo.target.nextSibling);
      } else if (dropInfo.zone === 'left' || dropInfo.zone === 'right') {
        this._handleSideDrop(blockToInsert, dropInfo.target, dropInfo.zone);
      }

      this._updateEmptyState();
      this._select(blockToInsert);
      this._saveHistory();
    });

    // Click outside → deselect
    canvas.addEventListener('click', e => {
      if (e.target === canvas) this._deselect();
    });

    // Hover highlighting on inner elements
    canvas.addEventListener('mouseover', e => {
      const block = e.target.closest('.ve-block');
      if (!block) return;
      const content = block.querySelector('.ve-block-content');
      if (content && content.contains(e.target) && e.target !== content && !e.target.classList.contains('ve-element-badge') && !e.target.closest('.ve-element-badge')) {
        canvas.querySelectorAll('.ve-hovered-element').forEach(el => {
          if (el !== e.target) el.classList.remove('ve-hovered-element');
        });
        e.target.classList.add('ve-hovered-element');
      }
    });

    canvas.addEventListener('mouseout', e => {
      if (e.target.classList.contains('ve-hovered-element')) {
        e.target.classList.remove('ve-hovered-element');
      }
    });

    // Right-click Context Menu
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      const block = e.target.closest('.ve-block');
      if (!block) {
        this._hideContextMenu();
        return;
      }
      const content = block.querySelector('.ve-block-content');
      let targetEl = e.target;
      if (targetEl.closest('.ve-block-toolbar') || targetEl.closest('.ve-resize-handle') || targetEl.closest('.ve-w-btn')) {
        this._select(block);
      } else if (content && content.contains(targetEl) && targetEl !== content && !targetEl.classList.contains('ve-element-badge') && !targetEl.closest('.ve-element-badge')) {
        this.selectElement(targetEl, block);
      } else {
        this._select(block);
      }
      this._showContextMenu(e.clientX, e.clientY);
    });
  }

  _calculateDropTargetAndZone(e) {
    const canvas = this.canvasEl;
    if (e.target.closest('.ve-resize-handle') || e.target.closest('.ve-resize-badge') || e.target.closest('.ve-block-toolbar')) {
      return null;
    }

    const colSlot = e.target.closest('.ve-col, .ve-col-slot, [data-ve-slot="true"]');
    const block = e.target.closest('.ve-block');

    if (this._dragSrc) {
      if (block === this._dragSrc) return null;
      if (block && this._dragSrc.contains(block)) return null;
      if (colSlot && this._dragSrc.contains(colSlot)) return null;
    }

    if (block && canvas.contains(block)) {
      if (colSlot && block.contains(colSlot) && !colSlot.contains(block)) {
        const childBlock = e.target.closest('.ve-block');
        if (childBlock && childBlock !== block && colSlot.contains(childBlock)) {
          return this._calcBlockZone(childBlock, e);
        }
        return { target: colSlot, zone: 'inside', block: null, colSlot };
      }

      if (colSlot && !colSlot.querySelector('.ve-block')) {
        return { target: colSlot, zone: 'inside', block: null, colSlot };
      }

      return this._calcBlockZone(block, e);
    }

    if (colSlot && canvas.contains(colSlot)) {
      return { target: colSlot, zone: 'inside', block: null, colSlot };
    }

    return { target: canvas, zone: 'canvas', block: null, colSlot: null };
  }

  _calcBlockZone(block, e) {
    const rect = block.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

    const isContainer = block.querySelector('.ve-col, .ve-col-slot, .ve-row-container, .ve-row-flex, .ve-row-2col, .ve-row-3col, .ve-row-4col, .ve-container, .ve-section');
    if (isContainer && relX >= 0.25 && relX <= 0.75 && relY >= 0.25 && relY <= 0.75) {
      const col = block.querySelector('.ve-col, .ve-col-slot') || block;
      return { target: col, zone: 'inside', block, colSlot: col };
    }

    if (relX < 0.25) {
      return { target: block, zone: 'left', block, colSlot: null };
    }
    if (relX > 0.75) {
      return { target: block, zone: 'right', block, colSlot: null };
    }
    if (relY < 0.5) {
      return { target: block, zone: 'before', block, colSlot: null };
    }
    return { target: block, zone: 'after', block, colSlot: null };
  }

  _handleSideDrop(newBlock, targetBlock, side) {
    const parent = targetBlock.parentNode;
    const isParentFlex = parent && parent !== this.canvasEl && (
      parent.classList.contains('ve-row-container') ||
      parent.classList.contains('ve-row-flex') ||
      parent.classList.contains('ve-col') ||
      parent.classList.contains('ve-col-slot') ||
      (parent.style && parent.style.display === 'flex')
    );

    if (isParentFlex || parent === this.canvasEl) {
      if (side === 'left') {
        parent.insertBefore(newBlock, targetBlock);
      } else {
        parent.insertBefore(newBlock, targetBlock.nextSibling);
      }

      const siblingBlocks = Array.from(parent.children).filter(c => c.classList && c.classList.contains('ve-block'));
      if (siblingBlocks.length === 2) {
        this.setBlockWidth(siblingBlocks[0], '50');
        this.setBlockWidth(siblingBlocks[1], '50');
      } else if (siblingBlocks.length === 3) {
        siblingBlocks.forEach(b => this.setBlockWidth(b, '33'));
      } else if (siblingBlocks.length >= 4) {
        siblingBlocks.forEach(b => this.setBlockWidth(b, '25'));
      } else {
        this.setBlockWidth(targetBlock, '50');
        this.setBlockWidth(newBlock, '50');
      }
    } else {
      const rowDef = BLOCK_PALETTE.find(b => b.id === 'row-container') || BLOCK_PALETTE.find(b => b.id === 'row-flex') || {
        id: 'row-container',
        label: 'Контейнер строк',
        icon: 'splitscreen'
      };

      const rowBlock = this._createBlockElement(rowDef);
      const rowFlex = rowBlock.querySelector('.ve-row-container') || rowBlock.querySelector('.ve-row-flex') || rowBlock.querySelector('.ve-block-content');
      rowFlex.innerHTML = '';

      this.setBlockWidth(targetBlock, '50');
      this.setBlockWidth(newBlock, '50');

      parent.insertBefore(rowBlock, targetBlock);

      if (side === 'left') {
        rowFlex.appendChild(newBlock);
        rowFlex.appendChild(targetBlock);
      } else {
        rowFlex.appendChild(targetBlock);
        rowFlex.appendChild(newBlock);
      }
    }
  }

  _getDropTarget(el) {
    while (el && el.parentElement !== this.canvasEl) el = el.parentElement;
    return el;
  }

  _clearDropHighlight() {
    this.canvasEl.querySelectorAll('.ve-drop-before, .ve-drop-after, .ve-drop-top, .ve-drop-bottom, .ve-drop-left, .ve-drop-right, .ve-drop-inside').forEach(el => {
      el.classList.remove('ve-drop-before', 've-drop-after', 've-drop-top', 've-drop-bottom', 've-drop-left', 've-drop-right', 've-drop-inside');
    });
  }

  // ── BLOCK CREATION & WIDTH ────────────────────────────────
  setBlockWidth(wrapper, width) {
    if (!wrapper) return;
    let normWidth = '100';
    if (width === '50%' || width === '50') normWidth = '50';
    else if (width === '33.33%' || width === '33%' || width === '33') normWidth = '33';
    else if (width === '25%' || width === '25') normWidth = '25';
    else if (width === 'auto') normWidth = 'auto';

    wrapper.dataset.width = normWidth;
    wrapper.dataset.blockWidth = width;

    // Reset inline overrides so CSS rules (.ve-block[data-width="..."]) control width
    wrapper.style.width = '';
    wrapper.style.maxWidth = '';
    wrapper.style.flex = '';

    const content = wrapper.querySelector('.ve-block-content');
    const target = content ? (content.firstElementChild || content) : null;
    if (target && target !== content) {
      target.style.width = '';
      target.style.maxWidth = '';
    }

    wrapper.querySelectorAll('.ve-w-btn').forEach(b => {
      const bW = b.dataset.w || b.dataset.widthVal;
      b.classList.toggle('is-active', bW === normWidth || bW === width);
    });

    if (this.selectedBlock === wrapper) {
      this.propsEl.querySelectorAll('#ve-block-width button').forEach(b => {
        const bW = b.dataset.w || b.dataset.widthVal;
        b.classList.toggle('is-active', bW === normWidth || bW === width);
      });
    }

    this._saveHistory();
  }

  _findRowContainer(wrapper) {
    if (!wrapper) return null;
    const content = wrapper.querySelector('.ve-block-content');
    if (content) {
      const innerRow = content.querySelector('.ve-row-flex, .ve-row-2col, .ve-row-3col, .ve-row-4col, .ve-row-asym-left, .ve-row-asym-right, .ve-row, [style*="display: flex"], [style*="display:flex"], [style*="display: grid"], [style*="display:grid"]');
      if (innerRow) return innerRow;
      if (content.firstElementChild && (content.firstElementChild.style.display === 'flex' || content.firstElementChild.style.display === 'grid')) {
        return content.firstElementChild;
      }
    }
    const parentRow = wrapper.closest('.ve-row-flex, .ve-row-2col, .ve-row-3col, .ve-row-4col, .ve-row-asym-left, .ve-row-asym-right, .ve-row');
    if (parentRow) return parentRow;
    if (wrapper.parentElement && (wrapper.parentElement.style.display === 'flex' || wrapper.parentElement.style.display === 'grid')) {
      return wrapper.parentElement;
    }
    return null;
  }

  _createBlockElement(def) {
    const wrapper = document.createElement('div');
    wrapper.className = 've-block';
    wrapper.dataset.defId = def.id;
    wrapper.dataset.width = '100';
    wrapper.dataset.blockWidth = '100%';
    wrapper.setAttribute('draggable', 'true');
    wrapper.innerHTML = `
      <div class="ve-block-toolbar">
        <span class="material-symbols-rounded ve-drag-handle" title="Перетащить">drag_indicator</span>
        <span class="ve-block-label">${def.label || 'Блок'}</span>
        <div class="ve-width-group" title="Ширина блока">
          <button type="button" class="ve-w-btn is-active" data-w="100" data-width-val="100" title="100% (Вся строка)">100%</button>
          <button type="button" class="ve-w-btn" data-w="50" data-width-val="50" title="50% (1/2 строки)">50%</button>
          <button type="button" class="ve-w-btn" data-w="33" data-width-val="33" title="33% (1/3 строки)">33%</button>
          <button type="button" class="ve-w-btn" data-w="auto" data-width-val="auto" title="Auto (По контенту)">Auto</button>
        </div>
        <div class="ve-block-actions">
          <button class="ve-act-btn" data-action="up" title="Вверх"><span class="material-symbols-rounded">keyboard_arrow_up</span></button>
          <button class="ve-act-btn" data-action="down" title="Вниз"><span class="material-symbols-rounded">keyboard_arrow_down</span></button>
          <button class="ve-act-btn" data-action="clone" title="Дублировать"><span class="material-symbols-rounded">content_copy</span></button>
          <button class="ve-act-btn ve-act-del" data-action="delete" title="Удалить"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </div>
      <div class="ve-block-content">${def.html}</div>
      <div class="ve-resize-handle ve-rh-right" title="Потяните для изменения ширины"></div>
      <div class="ve-resize-handle ve-rh-bottom" title="Потяните для изменения высоты"></div>
      <div class="ve-resize-handle ve-rh-corner" title="Потяните для изменения ширины и высоты"></div>
      <div class="ve-resize-badge"></div>`;

    this._bindBlockEvents(wrapper, def);
    return wrapper;
  }

  // ── INSERT BLOCK ───────────────────────────────────────────
  _insertBlock(def, beforeEl = null, targetParent = null) {
    const wrapper = this._createBlockElement(def);
    const container = targetParent || this.canvasEl;

    if (beforeEl && beforeEl.parentNode === container) {
      container.insertBefore(wrapper, beforeEl);
    } else {
      const empty = container.querySelector('.ve-empty-state');
      if (empty) {
        container.insertBefore(wrapper, empty);
      } else {
        container.appendChild(wrapper);
      }
    }

    if (container.classList && container.classList.contains('ve-col')) {
      container.querySelectorAll('.ve-col-placeholder').forEach(p => p.remove());
    }

    this._updateEmptyState();
    this._select(wrapper, def);
    this._saveHistory();
    return wrapper;
  }

  _bindBlockEvents(wrapper, def) {
    // Select on click (deep target selection)
    wrapper.addEventListener('click', e => {
      if (e.target.closest('.ve-act-btn') || e.target.closest('.ve-resize-handle') || e.target.closest('.ve-w-btn') || e.target.closest('.ve-element-badge')) return;
      e.stopPropagation();
      const content = wrapper.querySelector('.ve-block-content');
      if (content && content.contains(e.target) && e.target !== content) {
        this.selectElement(e.target, wrapper);
      } else {
        this._select(wrapper, def);
      }
    });

    // Toolbar width buttons
    wrapper.querySelectorAll('.ve-w-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.setBlockWidth(wrapper, btn.dataset.w || btn.dataset.widthVal);
      });
    });

    // Drag from canvas (reorder)
    wrapper.addEventListener('dragstart', e => {
      if (!e.target.closest('.ve-drag-handle') && !e.target.classList.contains('ve-block')) {
        e.stopPropagation();
        return;
      }
      this._dragSrc = wrapper;
      this._paletteId = null;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => wrapper.classList.add('is-dragging'), 0);
    });
    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('is-dragging');
      this._dragSrc = null;
    });

    // Toolbar actions
    wrapper.querySelector('.ve-block-toolbar').addEventListener('click', e => {
      e.stopPropagation();
      const btn = e.target.closest('.ve-act-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      const parent = wrapper.parentNode;

      if (action === 'delete') {
        this.deleteBlock(wrapper);
      } else if (action === 'up') {
        const prev = wrapper.previousElementSibling;
        if (prev && !prev.classList.contains('ve-empty-state')) {
          parent.insertBefore(wrapper, prev);
          this._saveHistory();
        }
      } else if (action === 'down') {
        const next = wrapper.nextElementSibling;
        if (next && !next.classList.contains('ve-empty-state')) {
          parent.insertBefore(next, wrapper);
          this._saveHistory();
        }
      } else if (action === 'clone') {
        const cloneDef = BLOCK_PALETTE.find(b => b.id === wrapper.dataset.defId) || {
          id: wrapper.dataset.defId || 'custom',
          label: wrapper.querySelector('.ve-block-label')?.textContent || 'Копия',
          html: wrapper.querySelector('.ve-block-content')?.innerHTML || ''
        };
        const cloned = this._createBlockElement(cloneDef);
        if (wrapper.dataset.blockWidth) {
          this.setBlockWidth(cloned, wrapper.dataset.blockWidth);
        }
        parent.insertBefore(cloned, wrapper.nextSibling);
        this._select(cloned, cloneDef);
        this._saveHistory();
      }
    });

    // Make content editable on dblclick
    const content = wrapper.querySelector('.ve-block-content');
    content.addEventListener('dblclick', e => {
      e.stopPropagation();
      const editable = e.target.closest('[contenteditable]') || e.target;
      if (editable && editable !== content) {
        editable.contentEditable = 'true';
        editable.focus();
      } else {
        // Make entire content editable
        content.contentEditable = 'true';
        content.focus();
      }
    });
    content.addEventListener('blur', () => {
      content.contentEditable = 'false';
      this._saveHistory();
    });

    // Interactive resize handles
    this._bindResizeHandles(wrapper);
  }

  // ── RESIZE HANDLES ─────────────────────────────────────────
  _bindResizeHandles(wrapper) {
    let rhRight = wrapper.querySelector('.ve-rh-right');
    let rhBottom = wrapper.querySelector('.ve-rh-bottom');
    let rhCorner = wrapper.querySelector('.ve-rh-corner');
    let badge = wrapper.querySelector('.ve-resize-badge');

    if (!rhRight) {
      rhRight = document.createElement('div');
      rhRight.className = 've-resize-handle ve-rh-right';
      rhRight.title = 'Потяните для изменения ширины';
      wrapper.appendChild(rhRight);
    }
    if (!rhBottom) {
      rhBottom = document.createElement('div');
      rhBottom.className = 've-resize-handle ve-rh-bottom';
      rhBottom.title = 'Потяните для изменения высоты';
      wrapper.appendChild(rhBottom);
    }
    if (!rhCorner) {
      rhCorner = document.createElement('div');
      rhCorner.className = 've-resize-handle ve-rh-corner';
      rhCorner.title = 'Потяните для изменения ширины и высоты';
      wrapper.appendChild(rhCorner);
    }
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 've-resize-badge';
      wrapper.appendChild(badge);
    }

    const content = wrapper.querySelector('.ve-block-content');
    const target = content ? (content.firstElementChild || content) : null;
    if (target) {
      if (target.style.maxWidth && !wrapper.style.maxWidth) {
        wrapper.style.maxWidth = target.style.maxWidth;
        wrapper.style.width = '100%';
      }
      if (target.style.minHeight && !wrapper.style.minHeight) {
        wrapper.style.minHeight = target.style.minHeight;
      }
      if (target.style.marginLeft === 'auto' && target.style.marginRight === 'auto' && !wrapper.style.marginLeft) {
        wrapper.style.marginLeft = 'auto';
        wrapper.style.marginRight = 'auto';
      }
    }

    const startResize = (e, type) => {
      e.preventDefault();
      e.stopPropagation();

      const defId = wrapper.dataset.defId;
      const def = BLOCK_PALETTE.find(b => b.id === defId) || { id: defId, label: defId };
      this._select(wrapper, def);

      wrapper.dataset.blockWidth = 'manual';
      wrapper.querySelectorAll('.ve-w-btn').forEach(b => b.classList.remove('is-active'));
      if (this.selectedBlock === wrapper) {
        this.propsEl.querySelectorAll('#ve-block-width button').forEach(b => b.classList.remove('is-active'));
      }

      // Disable HTML5 drag on block while resizing
      wrapper.setAttribute('draggable', 'false');

      const startRect = wrapper.getBoundingClientRect();
      const canvasRect = this.canvasEl.getBoundingClientRect();
      const startWidth = startRect.width;
      const startHeight = startRect.height;
      const startPointerX = e.clientX;
      const startPointerY = e.clientY;
      const scrollWrapper = document.getElementById('wysiwyg-canvas-wrapper');
      const startScrollTop = scrollWrapper ? scrollWrapper.scrollTop : 0;

      const isCentered = (wrapper.style.marginLeft === 'auto' && wrapper.style.marginRight === 'auto') ||
                         (target && (target.style.marginLeft === 'auto' || (target.style.margin && target.style.margin.includes('auto'))));
      const center = startRect.left + startWidth / 2;

      badge.style.display = 'block';
      badge.textContent = `${Math.round(startWidth)} × ${Math.round(startHeight)} px`;

      document.body.style.userSelect = 'none';
      if (type === 'right') document.body.style.cursor = 'ew-resize';
      else if (type === 'bottom') document.body.style.cursor = 'ns-resize';
      else document.body.style.cursor = 'nwse-resize';

      const onPointerMove = (moveEvent) => {
        let newW = startWidth;
        let newH = startHeight;

        if (type === 'right' || type === 'corner') {
          if (isCentered) {
            newW = Math.round(Math.abs(moveEvent.clientX - center) * 2);
          } else {
            newW = Math.round(moveEvent.clientX - startRect.left);
          }
          const minW = 100;
          const maxW = Math.max(minW, Math.round(canvasRect.width - 32));
          newW = Math.max(minW, Math.min(newW, maxW));

          wrapper.style.maxWidth = `${newW}px`;
          wrapper.style.width = '100%';
          if (isCentered) {
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = 'auto';
          }
          if (target) {
            target.style.maxWidth = `${newW}px`;
            target.style.width = '100%';
            target.style.boxSizing = 'border-box';
          }

          const wInput = this.propsEl.querySelector('#ve-prop-maxwidth');
          if (wInput) wInput.value = newW;
        }

        if (type === 'bottom' || type === 'corner') {
          const curScroll = scrollWrapper ? scrollWrapper.scrollTop : 0;
          const deltaScroll = curScroll - startScrollTop;
          const deltaY = (moveEvent.clientY - startPointerY) + deltaScroll;
          newH = Math.max(30, Math.round(startHeight + deltaY));

          wrapper.style.minHeight = `${newH}px`;
          if (target) {
            target.style.minHeight = `${newH}px`;
          }

          const hInput = this.propsEl.querySelector('#ve-prop-minheight');
          if (hInput) hInput.value = newH;

          // Auto-scroll when dragging near viewport bottom
          if (scrollWrapper && moveEvent.clientY > window.innerHeight - 50) {
            scrollWrapper.scrollTop += 12;
          }
        }

        const dispW = Math.round(wrapper.offsetWidth);
        const dispH = Math.round(wrapper.offsetHeight);
        badge.textContent = `${dispW} × ${dispH} px`;
        this._updateCanvasDims();
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        wrapper.setAttribute('draggable', 'true');
        badge.style.display = 'none';

        const rawText = this.propsEl.querySelector('#ve-raw-html');
        if (rawText && content) rawText.value = content.innerHTML.trim();

        this._updateCanvasDims();
        this._saveHistory();
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    rhRight.onpointerdown = e => startResize(e, 'right');
    rhBottom.onpointerdown = e => startResize(e, 'bottom');
    rhCorner.onpointerdown = e => startResize(e, 'corner');
  }

  // ── DYNAMIC GOOGLE FONT LOADER ───────────────────────────
  loadGoogleFont(fontName) {
    if (!fontName) return;
    const clean = fontName.replace(/['"]/g, '').trim();
    const fDef = TYPO_FONTS.find(f => f.name.toLowerCase() === clean.toLowerCase());
    if (!fDef || !fDef.google) return;

    const id = 've-font-' + clean.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (document.getElementById(id)) return;

    if (!document.getElementById('ve-gf-pre-1')) {
      const p1 = document.createElement('link');
      p1.id = 've-gf-pre-1';
      p1.rel = 'preconnect';
      p1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(p1);
    }
    if (!document.getElementById('ve-gf-pre-2')) {
      const p2 = document.createElement('link');
      p2.id = 've-gf-pre-2';
      p2.rel = 'preconnect';
      p2.href = 'https://fonts.gstatic.com';
      p2.crossOrigin = 'anonymous';
      document.head.appendChild(p2);
    }

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fDef.google}&display=swap`;
    document.head.appendChild(link);
  }

  // ── SELECTION & DOM HIERARCHY ─────────────────────────────
  selectElement(el, blockWrapper) {
    if (!el) {
      this._deselect();
      return;
    }

    if (el.classList && el.classList.contains('ve-block')) {
      const def = BLOCK_PALETTE.find(b => b.id === el.dataset.defId);
      this._select(el, def);
      return;
    }

    blockWrapper = blockWrapper || el.closest('.ve-block');
    if (!blockWrapper) return;

    // Clear previous element selections
    this.canvasEl.querySelectorAll('.ve-selected-element').forEach(item => {
      item.classList.remove('ve-selected-element');
    });
    this.canvasEl.querySelectorAll('.ve-element-badge').forEach(b => b.remove());

    if (this.selectedBlock && this.selectedBlock !== blockWrapper) {
      this.selectedBlock.classList.remove('is-selected');
    }
    this.selectedBlock = blockWrapper;
    blockWrapper.classList.add('is-selected');

    this.selectedElement = el;
    el.classList.add('ve-selected-element');

    // Create element badge
    const badge = document.createElement('div');
    badge.className = 've-element-badge';
    badge.contentEditable = 'false';
    const tagName = el.tagName.toLowerCase();

    const rect = el.getBoundingClientRect();
    const canvasRect = this.canvasEl.getBoundingClientRect();
    if (rect.top - canvasRect.top < 32) {
      badge.classList.add('ve-badge-bottom');
    }

    badge.innerHTML = `
      <span class="ve-elem-tag"><span class="material-symbols-rounded">code</span>${tagName}</span>
      <button class="ve-elem-parent-btn" type="button" title="Выбрать родительский элемент (Esc)"><span class="material-symbols-rounded">arrow_upward</span></button>
      <button class="ve-elem-del-btn" type="button" title="Удалить элемент (Del)"><span class="material-symbols-rounded">close</span></button>
    `;

    badge.querySelector('.ve-elem-parent-btn').addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this.selectParent();
    });

    badge.querySelector('.ve-elem-del-btn').addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this.deleteSelected();
    });

    const isVoid = ['img', 'input', 'hr', 'br', 'textarea', 'select'].includes(tagName);
    if (!isVoid) {
      if (window.getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.appendChild(badge);
    } else if (el.parentElement) {
      if (window.getComputedStyle(el.parentElement).position === 'static') {
        el.parentElement.style.position = 'relative';
      }
      el.parentElement.appendChild(badge);
      badge.style.position = 'absolute';
      badge.style.top = `${el.offsetTop - 27}px`;
      badge.style.left = `${el.offsetLeft}px`;
    }

    // Preload font if Google font detected
    const compStyle = window.getComputedStyle(el);
    if (compStyle.fontFamily) {
      const firstFont = compStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      this.loadGoogleFont(firstFont);
    }

    const def = BLOCK_PALETTE.find(b => b.id === blockWrapper.dataset.defId) || { id: blockWrapper.dataset.defId, label: 'Блок' };
    this._buildPropsPanel(blockWrapper, def, el);
    this._showFloatingToolbar(el);
  }

  _select(wrapper, def) {
    if (!wrapper) return;
    this.canvasEl.querySelectorAll('.ve-selected-element').forEach(el => el.classList.remove('ve-selected-element'));
    this.canvasEl.querySelectorAll('.ve-element-badge').forEach(b => b.remove());

    if (this.selectedBlock && this.selectedBlock !== wrapper) {
      this.selectedBlock.classList.remove('is-selected');
    }
    this.selectedBlock = wrapper;
    this.selectedElement = wrapper;
    wrapper.classList.add('is-selected');

    const d = BLOCK_PALETTE.find(b => b.id === wrapper.dataset.defId) || def || { id: wrapper.dataset.defId, label: 'Блок' };
    const content = wrapper.querySelector('.ve-block-content');
    const targetEl = content ? (content.firstElementChild || content) : wrapper;
    this._buildPropsPanel(wrapper, d, targetEl);
    this._hideFloatingToolbar();
  }

  _deselect() {
    if (this.selectedBlock) this.selectedBlock.classList.remove('is-selected');
    this.selectedBlock = null;
    this.selectedElement = null;
    this.canvasEl.querySelectorAll('.ve-selected-element').forEach(el => el.classList.remove('ve-selected-element'));
    this.canvasEl.querySelectorAll('.ve-element-badge').forEach(b => b.remove());
    this._hideFloatingToolbar();
    this._hideContextMenu();
    this._showEmptyProps();
  }

  deselect() {
    this._deselect();
  }

  selectParent() {
    if (!this.selectedElement || !this.selectedBlock) return;
    if (this.selectedElement === this.selectedBlock) return;

    const content = this.selectedBlock.querySelector('.ve-block-content');
    if (!content || this.selectedElement === content) {
      this._select(this.selectedBlock);
      return;
    }

    const parent = this.selectedElement.parentElement;
    if (parent && parent !== content && content.contains(parent)) {
      this.selectElement(parent, this.selectedBlock);
    } else {
      this._select(this.selectedBlock);
    }
  }

  deleteSelected() {
    if (this.selectedElement && this.selectedBlock && this.selectedElement !== this.selectedBlock) {
      const content = this.selectedBlock.querySelector('.ve-block-content');
      if (content && content.contains(this.selectedElement) && this.selectedElement !== content) {
        const elToDelete = this.selectedElement;
        const parent = elToDelete.parentElement;

        elToDelete.querySelectorAll('.ve-element-badge').forEach(b => b.remove());
        const badge = parent?.querySelector(':scope > .ve-element-badge');
        if (badge) badge.remove();

        elToDelete.remove();

        if (parent && (parent.classList.contains('ve-col') || parent.classList.contains('ve-col-slot') || parent.dataset.veSlot === 'true')) {
          if (!parent.querySelector('.ve-block') && !parent.firstElementChild && !parent.textContent.trim()) {
            const ph = document.createElement('p');
            ph.className = 've-col-placeholder';
            ph.textContent = 'Колонка (пусто)';
            parent.appendChild(ph);
          }
        }

        if (content && !content.firstElementChild && !content.textContent.trim()) {
          this.deleteBlock(this.selectedBlock);
          return;
        }

        if (parent && parent !== content && content.contains(parent)) {
          this.selectElement(parent, this.selectedBlock);
        } else {
          this._select(this.selectedBlock);
        }

        this._saveHistory();
        this._updateCanvasDims();
        return;
      }
    }

    if (this.selectedBlock) {
      this.deleteBlock(this.selectedBlock);
    }
  }

  deleteBlock(wrapper) {
    if (!wrapper) return;
    if (this.selectedBlock === wrapper) this._deselect();
    const oldParent = wrapper.parentNode;
    wrapper.remove();

    if (oldParent && oldParent.classList && oldParent.classList.contains('ve-col')) {
      if (!oldParent.querySelector('.ve-block') && !oldParent.firstElementChild) {
        const ph = document.createElement('p');
        ph.className = 've-col-placeholder';
        ph.textContent = 'Колонка (пусто)';
        oldParent.appendChild(ph);
      }
    } else if (oldParent && oldParent.classList && oldParent.classList.contains('ve-row-flex')) {
      const remaining = oldParent.querySelectorAll('.ve-block');
      if (remaining.length === 0) {
        const rowWrapper = oldParent.closest('.ve-block');
        if (rowWrapper) rowWrapper.remove();
      } else if (remaining.length === 1) {
        this.setBlockWidth(remaining[0], '100%');
      }
    }

    this._updateEmptyState();
    this._saveHistory();
    this._updateCanvasDims();
  }

  duplicateSelected() {
    if (this.selectedElement && this.selectedBlock && this.selectedElement !== this.selectedBlock) {
      const content = this.selectedBlock.querySelector('.ve-block-content');
      if (content && content.contains(this.selectedElement) && this.selectedElement !== content) {
        const clone = this.selectedElement.cloneNode(true);
        clone.querySelectorAll('.ve-selected-element, .ve-hovered-element, .ve-element-badge').forEach(b => b.remove());
        clone.classList.remove('ve-selected-element', 've-hovered-element');
        this.selectedElement.parentNode.insertBefore(clone, this.selectedElement.nextSibling);
        this.selectElement(clone, this.selectedBlock);
        this._saveHistory();
        this._updateCanvasDims();
        return;
      }
    }

    if (this.selectedBlock) {
      const parent = this.selectedBlock.parentNode;
      const cloneDef = BLOCK_PALETTE.find(b => b.id === this.selectedBlock.dataset.defId) || {
        id: this.selectedBlock.dataset.defId || 'custom',
        label: this.selectedBlock.querySelector('.ve-block-label')?.textContent || 'Копия',
        html: this.selectedBlock.querySelector('.ve-block-content')?.innerHTML || ''
      };
      const cloned = this._createBlockElement(cloneDef);
      if (this.selectedBlock.dataset.blockWidth) {
        this.setBlockWidth(cloned, this.selectedBlock.dataset.blockWidth);
      }
      parent.insertBefore(cloned, this.selectedBlock.nextSibling);
      this._select(cloned, cloneDef);
      this._saveHistory();
      this._updateCanvasDims();
    }
  }

  // ── BREADCRUMBS ───────────────────────────────────────────
  _buildBreadcrumbsHTML(targetEl, blockWrapper, def, chain) {
    if (!blockWrapper) return '';
    const content = blockWrapper.querySelector('.ve-block-content');
    const blockLabel = def?.label || blockWrapper.querySelector('.ve-block-label')?.textContent || 'Блок';
    const blockIcon = def?.icon || 'widgets';

    let html = `
      <div class="ve-breadcrumbs">
        <div class="ve-breadcrumbs-head">
          <span class="ve-breadcrumbs-title">
            <span class="material-symbols-rounded">account_tree</span>
            Иерархия DOM
          </span>
          <button class="ve-elem-parent-btn" id="ve-crumb-select-parent" type="button" title="Выбрать родительский элемент (Esc)">
            <span class="material-symbols-rounded">arrow_upward</span>
          </button>
        </div>
        <div class="ve-breadcrumbs-list">
          <div class="ve-crumb ${(!targetEl || targetEl === blockWrapper || targetEl === content) ? 'is-active' : ''}" data-crumb-type="block" title="Выбрать блок">
            <span class="material-symbols-rounded">${blockIcon}</span>
            <span>${blockLabel}</span>
          </div>`;

    chain.forEach((node, idx) => {
      const isLast = idx === chain.length - 1;
      const tag = node.tagName.toLowerCase();
      let extra = '';
      if (node.id) extra = '#' + node.id;
      else if (node.className && typeof node.className === 'string') {
        const cls = node.className.replace(/ve-selected-element|ve-hovered-element/g, '').trim().split(/\s+/)[0];
        if (cls) extra = '.' + cls;
      }
      const label = `${tag}${extra ? ` ${extra}` : ''}`;

      html += `
        <span class="ve-crumb-sep"><span class="material-symbols-rounded">chevron_right</span></span>
        <div class="ve-crumb ${isLast ? 'is-active' : ''}" data-crumb-idx="${idx}" title="Выбрать &lt;${tag}&gt;">
          <span class="material-symbols-rounded">code</span>
          <span>${label}</span>
          <span class="ve-crumb-del" data-crumb-del-idx="${idx}" title="Удалить &lt;${tag}&gt;">
            <span class="material-symbols-rounded">close</span>
          </span>
        </div>`;
    });

    html += `
        </div>
      </div>`;
    return html;
  }

  // ── PROPS PANEL ───────────────────────────────────────────
  _buildPropsPanel(wrapper, def, targetEl = null) {
    const p = this.propsEl;
    const content = wrapper.querySelector('.ve-block-content');
    const elemToInspect = targetEl || (content ? (content.firstElementChild || content) : wrapper);

    const chain = [];
    let cur = elemToInspect;
    while (cur && cur !== wrapper && cur !== this.canvasEl) {
      if (cur !== content) {
        chain.unshift(cur);
      }
      cur = cur.parentElement;
    }
    this._currentCrumbChain = chain;

    p.innerHTML = `
      <div class="ve-props-header">
        <span class="material-symbols-rounded">${def?.icon || 'widgets'}</span>
        <span>${def?.label || 'Блок'}</span>
        <button class="icon-btn-sm ve-props-close-btn" id="ve-close-props" type="button" title="Скрыть панель свойств" style="margin-left:auto;background:transparent;border:none;color:#94a3b8;cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:4px;">
          <span class="material-symbols-rounded" style="font-size:18px;">close</span>
        </button>
      </div>

      ${this._buildBreadcrumbsHTML(elemToInspect, wrapper, def, chain)}

      <div class="ve-props-section" style="padding-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <button type="button" class="ve-crumb" id="ve-quick-parent" title="Выбрать родительский элемент (Esc)">
          <span class="material-symbols-rounded">arrow_upward</span>
          <span>Родитель</span>
        </button>
        <button type="button" class="ve-crumb" id="ve-quick-clone" title="Дублировать (Ctrl+D)">
          <span class="material-symbols-rounded">content_copy</span>
          <span>Копия</span>
        </button>
        <button type="button" class="ve-crumb ve-crumb-del" id="ve-quick-delete" title="Удалить элемент (Del)" style="margin-left:auto;color:#f87171;">
          <span class="material-symbols-rounded">delete</span>
          <span>Удалить</span>
        </button>
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Внутренний HTML</div>
        <textarea class="ve-props-raw" id="ve-raw-html" rows="5">${(elemToInspect !== wrapper && elemToInspect !== content) ? elemToInspect.outerHTML.trim() : content.innerHTML.trim()}</textarea>
        <button class="ve-props-apply-btn" id="ve-apply-raw">Применить HTML</button>
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Типография & Текст</div>
        ${this._buildTypoProps(elemToInspect)}
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Стили и геометрия блока</div>
        ${this._buildStyleProps(wrapper, elemToInspect)}
      </div>

      <div class="ve-props-section ve-props-actions">
        <button class="ve-props-export-btn" id="ve-export-code">
          <span class="material-symbols-rounded">code</span>
          Экспортировать в код
        </button>
      </div>`;

    this._bindPropsEvents(wrapper, content, elemToInspect);
  }

  _buildStyleProps(wrapper, elemToInspect = null) {
    const content = wrapper.querySelector('.ve-block-content');
    const target = elemToInspect || (content ? (content.firstElementChild || content) : null);
    const curW = parseInt(target?.style?.maxWidth || wrapper.style.maxWidth) || '';
    const curH = parseInt(target?.style?.minHeight || wrapper.style.minHeight) || '';
    const curBlockW = wrapper.dataset.blockWidth || '100%';

    const rowEl = this._findRowContainer(wrapper);
    const curJustify = rowEl ? (rowEl.style.justifyContent || 'flex-start') : 'flex-start';
    const curGap = rowEl ? (rowEl.style.gap || '16px') : '16px';

    const isLeft = wrapper.style.marginLeft === '0px' || (!wrapper.style.marginLeft && wrapper.style.marginRight === 'auto');
    const isCenter = (wrapper.style.marginLeft === 'auto' && wrapper.style.marginRight === 'auto') ||
                     (target?.style?.marginLeft === 'auto' && target?.style?.marginRight === 'auto');
    const isRight = wrapper.style.marginLeft === 'auto' && wrapper.style.marginRight === '0px';

    return `
      <div class="ve-prop-row">
        <label>Ширина блока</label>
        <div class="ve-width-btns" id="ve-block-width">
          <button data-w="100%" class="${curBlockW === '100%' || !curBlockW ? 'is-active' : ''}">100%</button>
          <button data-w="50%" class="${curBlockW === '50%' ? 'is-active' : ''}">50%</button>
          <button data-w="33.33%" class="${curBlockW === '33.33%' ? 'is-active' : ''}">33%</button>
          <button data-w="25%" class="${curBlockW === '25%' ? 'is-active' : ''}">25%</button>
          <button data-w="auto" class="${curBlockW === 'auto' ? 'is-active' : ''}">Auto</button>
        </div>
      </div>
      <div class="ve-prop-row">
        <label>Макс. ширина (px)</label>
        <input type="number" class="ve-num-input" id="ve-prop-maxwidth" data-prop="maxWidth" value="${curW}" min="60" max="2400" placeholder="100% (auto)">
      </div>
      <div class="ve-prop-row">
        <label>Мин. высота (px)</label>
        <input type="number" class="ve-num-input" id="ve-prop-minheight" data-prop="minHeight" value="${curH}" min="0" max="2400" placeholder="auto">
      </div>
      <div class="ve-prop-row">
        <label>Выравнивание блока</label>
        <div class="ve-align-btns" id="ve-block-align">
          <button data-align="left" title="Слева" class="${isLeft && !isCenter ? 'is-active' : ''}"><span class="material-symbols-rounded">align_horizontal_left</span></button>
          <button data-align="center" title="По центру" class="${isCenter ? 'is-active' : ''}"><span class="material-symbols-rounded">align_horizontal_center</span></button>
          <button data-align="right" title="Справа" class="${isRight ? 'is-active' : ''}"><span class="material-symbols-rounded">align_horizontal_right</span></button>
        </div>
      </div>
      <div class="ve-prop-row" style="margin-top:10px;">
        <label>Строка: выравнивание</label>
        <div class="ve-align-btns" id="ve-row-justify">
          <button data-justify="flex-start" title="Start" class="${curJustify === 'flex-start' ? 'is-active' : ''}"><span class="material-symbols-rounded">format_align_left</span></button>
          <button data-justify="center" title="Center" class="${curJustify === 'center' ? 'is-active' : ''}"><span class="material-symbols-rounded">format_align_center</span></button>
          <button data-justify="flex-end" title="End" class="${curJustify === 'flex-end' ? 'is-active' : ''}"><span class="material-symbols-rounded">format_align_right</span></button>
          <button data-justify="space-between" title="Space-Between" class="${curJustify === 'space-between' ? 'is-active' : ''}"><span class="material-symbols-rounded">space_bar</span></button>
        </div>
      </div>
      <div class="ve-prop-row">
        <label>Строка: отступ (Gap)</label>
        <div class="ve-width-btns" id="ve-row-gap">
          <button data-gap="8px" class="${curGap === '8px' ? 'is-active' : ''}">8px</button>
          <button data-gap="16px" class="${curGap === '16px' || !curGap ? 'is-active' : ''}">16px</button>
          <button data-gap="24px" class="${curGap === '24px' ? 'is-active' : ''}">24px</button>
          <button data-gap="32px" class="${curGap === '32px' ? 'is-active' : ''}">32px</button>
        </div>
      </div>
      <div class="ve-prop-row">
        <label>Фон</label>
        <input type="color" class="ve-color-pick" data-prop="background" value="${this._colorToHex(target?.style?.background || content.style.background) || '#ffffff'}">
      </div>
      <div class="ve-prop-row">
        <label>Цвет текста</label>
        <input type="color" class="ve-color-pick" data-prop="color" value="${this._colorToHex(target?.style?.color || content.style.color) || '#000000'}">
      </div>
      <div class="ve-prop-row">
        <label>Padding (px)</label>
        <input type="number" class="ve-num-input" data-prop="padding" value="${parseInt(target?.style?.padding || content.style.padding) || 0}" min="0" max="200">
      </div>
      <div class="ve-prop-row">
        <label>Border radius</label>
        <input type="number" class="ve-num-input" data-prop="borderRadius" value="${parseInt(target?.style?.borderRadius || content.style.borderRadius) || 0}" min="0" max="100">
      </div>
      <div class="ve-prop-row">
        <label>Отступ сверху</label>
        <input type="number" class="ve-num-input" data-prop="marginTop" value="${parseInt(target?.style?.marginTop || content.style.marginTop) || 0}" min="0" max="200">
      </div>
      <div class="ve-prop-row">
        <label>Отступ снизу</label>
        <input type="number" class="ve-num-input" data-prop="marginBottom" value="${parseInt(target?.style?.marginBottom || content.style.marginBottom) || 0}" min="0" max="200">
      </div>`;
  }

  _buildTypoProps(targetEl) {
    if (!targetEl) return '';
    const comp = window.getComputedStyle(targetEl);
    const curFontFamily = (targetEl.style.fontFamily || comp.fontFamily || 'Inter').replace(/['"]/g, '').split(',')[0].trim();
    const curWeight = targetEl.style.fontWeight || comp.fontWeight || '400';
    const curSize = parseInt(targetEl.style.fontSize || comp.fontSize) || 16;
    const curLineHeight = targetEl.style.lineHeight || comp.lineHeight || '';
    const curLetterSpacing = targetEl.style.letterSpacing || comp.letterSpacing || '';
    const curAlign = targetEl.style.textAlign || comp.textAlign || 'left';
    const curTransform = targetEl.style.textTransform || comp.textTransform || 'none';
    const curColor = this._colorToHex(targetEl.style.color || comp.color) || '#000000';
    const curBg = this._colorToHex(targetEl.style.backgroundColor || comp.backgroundColor) || '';
    const curShadow = targetEl.style.textShadow || comp.textShadow || 'none';
    const isBold = parseInt(curWeight) >= 600 || curWeight === 'bold';
    const isItalic = (targetEl.style.fontStyle || comp.fontStyle) === 'italic';
    const textDecor = targetEl.style.textDecoration || comp.textDecoration || '';
    const isUnderline = textDecor.includes('underline');
    const isStrike = textDecor.includes('line-through');

    return `
      <div class="ve-props-typography">
        <div class="ve-prop-row">
          <label>Шрифт (${TYPO_FONTS.length})</label>
          <div class="ve-font-dropdown" id="ve-typo-font-dd">
            <button type="button" class="ve-font-dropdown-toggle" id="ve-typo-font-toggle">
              <span id="ve-typo-cur-font" style="font-family:'${curFontFamily}',sans-serif;">${curFontFamily}</span>
              <span class="material-symbols-rounded">expand_more</span>
            </button>
            <div class="ve-font-menu is-hidden" id="ve-typo-font-menu">
              ${TYPO_FONTS.map(f => `
                <div class="ve-font-option ${f.name.toLowerCase() === curFontFamily.toLowerCase() ? 'is-active' : ''}" data-font="${f.name}">
                  <span class="ve-font-preview" style="font-family:'${f.name}',sans-serif;">${f.name}</span>
                  <span class="ve-font-tag">${f.category}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Начертание (Weight)</label>
          <div class="ve-weight-chips" id="ve-typo-weights">
            ${[
              { w: '300', label: '300' },
              { w: '400', label: '400' },
              { w: '500', label: '500' },
              { w: '600', label: '600' },
              { w: '700', label: '700' },
              { w: '800', label: '800' },
              { w: '900', label: '900' }
            ].map(item => `
              <button type="button" class="ve-weight-chip ${String(curWeight) === item.w ? 'is-active' : ''}" data-weight="${item.w}">${item.label}</button>
            `).join('')}
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Форматирование</label>
          <div class="ve-format-segmented" id="ve-typo-format">
            <button type="button" class="ve-format-seg-btn ${isBold ? 'is-active' : ''}" data-fmt="bold" title="Жирный (Bold)">
              <strong>B</strong>
            </button>
            <button type="button" class="ve-format-seg-btn ${isItalic ? 'is-active' : ''}" data-fmt="italic" title="Курсив (Italic)">
              <em>I</em>
            </button>
            <button type="button" class="ve-format-seg-btn ${isUnderline ? 'is-active' : ''}" data-fmt="underline" title="Подчёркнутый (Underline)">
              <u>U</u>
            </button>
            <button type="button" class="ve-format-seg-btn ${isStrike ? 'is-active' : ''}" data-fmt="strike" title="Зачёркнутый (Strikethrough)">
              <s>S</s>
            </button>
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Размер текста</label>
          <div class="ve-font-size-row">
            <input type="number" class="ve-num-input" id="ve-typo-size-input" value="${curSize}" min="8" max="200" placeholder="16">
            <div class="ve-align-btns">
              <button type="button" id="ve-typo-size-dec" title="-1px"><span class="material-symbols-rounded">remove</span></button>
              <button type="button" id="ve-typo-size-inc" title="+1px"><span class="material-symbols-rounded">add</span></button>
            </div>
          </div>
          <div class="ve-size-presets" id="ve-typo-size-presets">
            ${[12, 14, 16, 18, 20, 24, 32, 48, 64].map(s => `
              <button type="button" class="ve-size-chip ${curSize === s ? 'is-active' : ''}" data-size="${s}">${s}</button>
            `).join('')}
          </div>
        </div>

        <div class="ve-spacing-group">
          <div class="ve-spacing-item">
            <span class="ve-spacing-label">
              <span class="material-symbols-rounded">format_line_spacing</span>
              Высота строки
            </span>
            <input type="text" class="ve-num-input" id="ve-typo-lh" value="${targetEl.style.lineHeight || ''}" placeholder="1.4 (или 24px)">
          </div>
          <div class="ve-spacing-item">
            <span class="ve-spacing-label">
              <span class="material-symbols-rounded">space_bar</span>
              Интервал букв
            </span>
            <input type="text" class="ve-num-input" id="ve-typo-ls" value="${targetEl.style.letterSpacing || ''}" placeholder="0px (или 1px)">
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Выравнивание текста</label>
          <div class="ve-align-btns" id="ve-typo-align">
            <button type="button" data-align="left" class="${curAlign === 'left' ? 'is-active' : ''}" title="Слева"><span class="material-symbols-rounded">format_align_left</span></button>
            <button type="button" data-align="center" class="${curAlign === 'center' ? 'is-active' : ''}" title="По центру"><span class="material-symbols-rounded">format_align_center</span></button>
            <button type="button" data-align="right" class="${curAlign === 'right' ? 'is-active' : ''}" title="Справа"><span class="material-symbols-rounded">format_align_right</span></button>
            <button type="button" data-align="justify" class="${curAlign === 'justify' ? 'is-active' : ''}" title="По ширине"><span class="material-symbols-rounded">format_align_justify</span></button>
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Регистр символов</label>
          <div class="ve-transform-group" id="ve-typo-transform">
            <button type="button" class="ve-transform-btn ${curTransform === 'none' ? 'is-active' : ''}" data-transform="none">Aa</button>
            <button type="button" class="ve-transform-btn ${curTransform === 'uppercase' ? 'is-active' : ''}" data-transform="uppercase">AA</button>
            <button type="button" class="ve-transform-btn ${curTransform === 'lowercase' ? 'is-active' : ''}" data-transform="lowercase">aa</button>
            <button type="button" class="ve-transform-btn ${curTransform === 'capitalize' ? 'is-active' : ''}" data-transform="capitalize">aB</button>
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Цвет текста</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="color" class="ve-color-pick" id="ve-typo-color" value="${curColor}">
            <span style="font-size:12px;font-family:monospace;color:#94a3b8;" id="ve-typo-color-hex">${curColor}</span>
          </div>
          <div class="ve-color-swatches" id="ve-typo-color-swatches">
            ${['#ffffff', '#000000', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'].map(c => `
              <div class="ve-swatch ${curColor.toLowerCase() === c.toLowerCase() ? 'is-active' : ''}" data-color="${c}" style="background:${c};" title="${c}"></div>
            `).join('')}
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Маркер / Цвет фона текста</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="color" class="ve-color-pick" id="ve-typo-bg" value="${curBg || '#fef08a'}">
            <button type="button" class="ve-act-btn" id="ve-typo-bg-clear" title="Сбросить фон" style="margin-left:auto;font-size:11px;padding:3px 8px;height:auto;border-radius:4px;">Сброс</button>
          </div>
          <div class="ve-color-swatches" id="ve-typo-bg-swatches">
            ${['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe'].map(c => `
              <div class="ve-swatch ${c === 'transparent' ? 'is-transparent' : ''}" data-bgcolor="${c}" style="background:${c === 'transparent' ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 8px 8px' : c};" title="${c}"></div>
            `).join('')}
          </div>
        </div>

        <div class="ve-prop-row">
          <label>Тень текста</label>
          <div class="ve-shadow-presets" id="ve-typo-shadows">
            <button type="button" class="ve-shadow-btn ${curShadow === 'none' ? 'is-active' : ''}" data-shadow="none">Нет</button>
            <button type="button" class="ve-shadow-btn" data-shadow="0 2px 4px rgba(0,0,0,0.4)">Мягкая</button>
            <button type="button" class="ve-shadow-btn" data-shadow="2px 2px 0px rgba(0,0,0,0.8)">Резкая</button>
            <button type="button" class="ve-shadow-btn" data-shadow="0 0 12px rgba(99,102,241,0.8)">Свечение</button>
            <button type="button" class="ve-shadow-btn" data-shadow="1px 1px 0 #334155, 2px 2px 0 #1e293b, 3px 3px 0 #0f172a">3D</button>
            <button type="button" class="ve-shadow-btn" data-shadow="-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000">Контур</button>
          </div>
        </div>
      </div>`;
  }

  _bindPropsEvents(wrapper, content, elemToInspect) {
    const p = this.propsEl;
    const target = elemToInspect || (content ? (content.firstElementChild || content) : wrapper);

    // Close / Collapse props panel
    p.querySelector('#ve-close-props')?.addEventListener('click', () => {
      const propsContainer = document.getElementById('wysiwyg-props');
      const backdropEl = document.getElementById('wysiwyg-backdrop');
      if (window.innerWidth <= 880) {
        propsContainer?.classList.remove('is-open');
        backdropEl?.classList.remove('is-open');
      } else {
        propsContainer?.classList.add('is-collapsed');
        document.getElementById('ve-toggle-props')?.classList.remove('is-active');
      }
    });

    // Breadcrumb clicks
    p.querySelectorAll('.ve-crumb[data-crumb-type="block"]').forEach(crumb => {
      crumb.addEventListener('click', () => {
        this._select(wrapper);
      });
    });

    p.querySelectorAll('.ve-crumb[data-crumb-idx]').forEach(crumb => {
      crumb.addEventListener('click', (e) => {
        if (e.target.closest('.ve-crumb-del')) return;
        const idx = parseInt(crumb.dataset.crumbIdx, 10);
        if (!isNaN(idx) && this._currentCrumbChain && this._currentCrumbChain[idx]) {
          this.selectElement(this._currentCrumbChain[idx], wrapper);
        }
      });
    });

    p.querySelectorAll('.ve-crumb-del[data-crumb-del-idx]').forEach(delBtn => {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(delBtn.dataset.crumbDelIdx, 10);
        if (!isNaN(idx) && this._currentCrumbChain && this._currentCrumbChain[idx]) {
          this.selectedElement = this._currentCrumbChain[idx];
          this.deleteSelected();
        }
      });
    });

    p.querySelector('#ve-crumb-select-parent')?.addEventListener('click', () => {
      this.selectParent();
    });

    // Quick Action buttons
    p.querySelector('#ve-quick-parent')?.addEventListener('click', () => {
      this.selectParent();
    });
    p.querySelector('#ve-quick-clone')?.addEventListener('click', () => {
      this.duplicateSelected();
    });
    p.querySelector('#ve-quick-delete')?.addEventListener('click', () => {
      this.deleteSelected();
    });

    // Apply raw HTML
    p.querySelector('#ve-apply-raw')?.addEventListener('click', () => {
      const newHtml = p.querySelector('#ve-raw-html').value;
      if (target && target !== wrapper && target !== content) {
        target.outerHTML = newHtml;
      } else {
        content.innerHTML = newHtml;
      }
      this._saveHistory();
    });

    // Export to code
    p.querySelector('#ve-export-code')?.addEventListener('click', () => {
      this.onExport(this.exportToHTML());
    });

    // Typography: Font dropdown toggle & select
    const typoFontToggle = p.querySelector('#ve-typo-font-toggle');
    const typoFontMenu = p.querySelector('#ve-typo-font-menu');
    typoFontToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      typoFontMenu?.classList.toggle('is-hidden');
    });

    typoFontMenu?.querySelectorAll('.ve-font-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const fontName = opt.dataset.font;
        typoFontMenu.classList.add('is-hidden');
        if (target && fontName) {
          this.loadGoogleFont(fontName);
          target.style.fontFamily = `'${fontName}', sans-serif`;
          const curFontSpan = p.querySelector('#ve-typo-cur-font');
          if (curFontSpan) {
            curFontSpan.textContent = fontName;
            curFontSpan.style.fontFamily = `'${fontName}', sans-serif`;
          }
          if (this._floatingToolbar) {
            const ftFont = this._floatingToolbar.querySelector('.ve-ft-font-name');
            if (ftFont) ftFont.textContent = fontName;
          }
          this._saveHistory();
        }
      });
    });

    // Typography: Weight chips
    p.querySelectorAll('#ve-typo-weights .ve-weight-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const w = chip.dataset.weight;
        p.querySelectorAll('#ve-typo-weights .ve-weight-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        if (target) {
          target.style.fontWeight = w;
          this._saveHistory();
        }
      });
    });

    // Typography: B / I / U / S Segmented buttons
    p.querySelectorAll('#ve-typo-format .ve-format-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!target) return;
        const fmt = btn.dataset.fmt;
        const isActive = btn.classList.contains('is-active');

        if (fmt === 'bold') {
          target.style.fontWeight = isActive ? '400' : '700';
          btn.classList.toggle('is-active', !isActive);
          p.querySelectorAll('#ve-typo-weights .ve-weight-chip').forEach(c => {
            c.classList.toggle('is-active', c.dataset.weight === (isActive ? '400' : '700'));
          });
          this._floatingToolbar?.querySelector('#ve-ft-bold')?.classList.toggle('is-active', !isActive);
        } else if (fmt === 'italic') {
          target.style.fontStyle = isActive ? 'normal' : 'italic';
          btn.classList.toggle('is-active', !isActive);
          this._floatingToolbar?.querySelector('#ve-ft-italic')?.classList.toggle('is-active', !isActive);
        } else if (fmt === 'underline') {
          const cur = target.style.textDecoration || '';
          target.style.textDecoration = isActive ? cur.replace(/underline/g, '').trim() || 'none' : `${cur} underline`.trim();
          btn.classList.toggle('is-active', !isActive);
          this._floatingToolbar?.querySelector('#ve-ft-underline')?.classList.toggle('is-active', !isActive);
        } else if (fmt === 'strike') {
          const cur = target.style.textDecoration || '';
          target.style.textDecoration = isActive ? cur.replace(/line-through/g, '').trim() || 'none' : `${cur} line-through`.trim();
          btn.classList.toggle('is-active', !isActive);
          this._floatingToolbar?.querySelector('#ve-ft-strike')?.classList.toggle('is-active', !isActive);
        }
        this._saveHistory();
      });
    });

    // Typography: Font Size input, -/+, presets
    const sizeInput = p.querySelector('#ve-typo-size-input');
    const updateSize = (sz) => {
      if (!target) return;
      sz = Math.max(8, Math.min(200, sz));
      if (sizeInput) sizeInput.value = sz;
      target.style.fontSize = `${sz}px`;
      p.querySelectorAll('#ve-typo-size-presets .ve-size-chip').forEach(c => {
        c.classList.toggle('is-active', parseInt(c.dataset.size) === sz);
      });
      if (this._floatingToolbar) {
        const ftSize = this._floatingToolbar.querySelector('#ve-ft-size-val');
        if (ftSize) ftSize.value = sz;
      }
      this._saveHistory();
    };

    sizeInput?.addEventListener('input', () => updateSize(parseInt(sizeInput.value) || 16));
    p.querySelector('#ve-typo-size-dec')?.addEventListener('click', () => updateSize((parseInt(sizeInput?.value) || 16) - 1));
    p.querySelector('#ve-typo-size-inc')?.addEventListener('click', () => updateSize((parseInt(sizeInput?.value) || 16) + 1));
    p.querySelectorAll('#ve-typo-size-presets .ve-size-chip').forEach(chip => {
      chip.addEventListener('click', () => updateSize(parseInt(chip.dataset.size) || 16));
    });

    // Typography: Line height & Letter spacing
    p.querySelector('#ve-typo-lh')?.addEventListener('input', (e) => {
      if (!target) return;
      target.style.lineHeight = e.target.value;
    });
    p.querySelector('#ve-typo-lh')?.addEventListener('change', () => this._saveHistory());

    p.querySelector('#ve-typo-ls')?.addEventListener('input', (e) => {
      if (!target) return;
      target.style.letterSpacing = e.target.value;
    });
    p.querySelector('#ve-typo-ls')?.addEventListener('change', () => this._saveHistory());

    // Typography: Text Align
    p.querySelectorAll('#ve-typo-align button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!target) return;
        target.style.textAlign = btn.dataset.align;
        p.querySelectorAll('#ve-typo-align button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._saveHistory();
      });
    });

    // Typography: Text Transform
    p.querySelectorAll('#ve-typo-transform button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!target) return;
        target.style.textTransform = btn.dataset.transform;
        p.querySelectorAll('#ve-typo-transform button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._saveHistory();
      });
    });

    // Typography: Color picker & swatches
    const typoCol = p.querySelector('#ve-typo-color');
    const typoColHex = p.querySelector('#ve-typo-color-hex');
    const updateTextColor = (col) => {
      if (!target) return;
      target.style.color = col;
      if (typoCol) typoCol.value = col;
      if (typoColHex) typoColHex.textContent = col;
      p.querySelectorAll('#ve-typo-color-swatches .ve-swatch').forEach(s => {
        s.classList.toggle('is-active', s.dataset.color.toLowerCase() === col.toLowerCase());
      });
      if (this._floatingToolbar) {
        const dot = this._floatingToolbar.querySelector('#ve-ft-color-dot');
        if (dot) {
          dot.style.background = col;
          dot.style.boxShadow = `0 0 6px ${col}`;
        }
      }
      this._saveHistory();
    };
    typoCol?.addEventListener('input', () => updateTextColor(typoCol.value));
    p.querySelectorAll('#ve-typo-color-swatches .ve-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => updateTextColor(swatch.dataset.color));
    });

    // Typography: Highlight (background) & swatches
    const typoBg = p.querySelector('#ve-typo-bg');
    const updateBgColor = (col) => {
      if (!target) return;
      if (col === 'transparent') {
        target.style.backgroundColor = '';
      } else {
        target.style.backgroundColor = col;
        if (typoBg) typoBg.value = col;
      }
      p.querySelectorAll('#ve-typo-bg-swatches .ve-swatch').forEach(s => {
        s.classList.toggle('is-active', s.dataset.bgcolor.toLowerCase() === col.toLowerCase());
      });
      if (this._floatingToolbar) {
        const line = this._floatingToolbar.querySelector('#ve-ft-highlight-line');
        if (line) line.style.background = col === 'transparent' ? 'transparent' : col;
      }
      this._saveHistory();
    };
    typoBg?.addEventListener('input', () => updateBgColor(typoBg.value));
    p.querySelector('#ve-typo-bg-clear')?.addEventListener('click', () => updateBgColor('transparent'));
    p.querySelectorAll('#ve-typo-bg-swatches .ve-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => updateBgColor(swatch.dataset.bgcolor));
    });

    // Typography: Text Shadow presets
    p.querySelectorAll('#ve-typo-shadows .ve-shadow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!target) return;
        target.style.textShadow = btn.dataset.shadow;
        p.querySelectorAll('#ve-typo-shadows .ve-shadow-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._saveHistory();
      });
    });

    // Block width buttons
    p.querySelectorAll('#ve-block-width button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setBlockWidth(wrapper, btn.dataset.w);
      });
    });

    // Row justify buttons
    p.querySelectorAll('#ve-row-justify button').forEach(btn => {
      btn.addEventListener('click', () => {
        const justify = btn.dataset.justify;
        p.querySelectorAll('#ve-row-justify button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const row = this._findRowContainer(wrapper);
        if (row) {
          row.style.justifyContent = justify;
          this._saveHistory();
        }
      });
    });

    // Row gap buttons
    p.querySelectorAll('#ve-row-gap button').forEach(btn => {
      btn.addEventListener('click', () => {
        const gap = btn.dataset.gap;
        p.querySelectorAll('#ve-row-gap button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const row = this._findRowContainer(wrapper);
        if (row) {
          row.style.gap = gap;
          this._saveHistory();
        }
      });
    });

    // Block alignment buttons
    p.querySelectorAll('#ve-block-align button').forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align;
        p.querySelectorAll('#ve-block-align button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        if (align === 'center') {
          wrapper.style.marginLeft = 'auto';
          wrapper.style.marginRight = 'auto';
          if (target) { target.style.marginLeft = 'auto'; target.style.marginRight = 'auto'; }
        } else if (align === 'right') {
          wrapper.style.marginLeft = 'auto';
          wrapper.style.marginRight = '0';
          if (target) { target.style.marginLeft = 'auto'; target.style.marginRight = '0'; }
        } else {
          wrapper.style.marginLeft = '0';
          wrapper.style.marginRight = 'auto';
          if (target) { target.style.marginLeft = '0'; target.style.marginRight = 'auto'; }
        }
        this._saveHistory();
      });
    });

    // Color pickers — apply to target and content
    p.querySelectorAll('.ve-color-pick[data-prop]').forEach(input => {
      input.addEventListener('input', () => {
        const prop = input.dataset.prop;
        if (target) target.style[prop] = input.value;
        content.style[prop] = input.value;
      });
      input.addEventListener('change', () => this._saveHistory());
    });

    // Numeric style inputs — apply to target and content
    p.querySelectorAll('.ve-num-input[data-prop]').forEach(input => {
      input.addEventListener('input', () => {
        const prop = input.dataset.prop;
        const val = input.value ? input.value + 'px' : '';
        if (prop === 'maxWidth') {
          wrapper.style.maxWidth = val;
          wrapper.style.width = val ? '100%' : '';
          if (target) {
            target.style.maxWidth = val;
            target.style.width = val ? '100%' : '';
            target.style.boxSizing = 'border-box';
          }
          this._updateCanvasDims();
        } else if (prop === 'minHeight') {
          wrapper.style.minHeight = val;
          if (target) target.style.minHeight = val;
          this._updateCanvasDims();
        } else {
          if (target) target.style[prop] = val;
          content.style[prop] = val;
        }
      });
      input.addEventListener('change', () => {
        this._updateCanvasDims();
        this._saveHistory();
      });
    });
  }

  _showEmptyProps() {
    this.propsEl.innerHTML = `
      <div class="ve-props-empty">
        <span class="material-symbols-rounded">touch_app</span>
        <p>Выберите блок или элемент на холсте для редактирования свойств</p>
      </div>`;
  }

  // ── FLOATING INLINE TOOLBAR ───────────────────────────────
  _initFloatingToolbar() {
    if (this._floatingToolbar) return;
    let ft = document.getElementById('ve-floating-toolbar');
    if (!ft) {
      ft = document.createElement('div');
      ft.id = 've-floating-toolbar';
      document.body.appendChild(ft);
    }
    ft.className = 've-floating-toolbar is-hidden';
    ft.innerHTML = `
      <button type="button" class="ve-ft-btn ve-ft-font-btn" id="ve-ft-font-toggle" title="Шрифт">
        <span class="material-symbols-rounded">text_format</span>
        <span class="ve-ft-font-name">Inter</span>
        <span class="material-symbols-rounded" style="font-size:12px;">expand_more</span>
      </button>
      <div class="ve-font-menu is-hidden" id="ve-ft-font-menu">
        ${TYPO_FONTS.map(f => `
          <div class="ve-font-option" data-font="${f.name}">
            <span class="ve-font-preview" style="font-family:'${f.name}',sans-serif;">${f.name}</span>
            <span class="ve-font-tag">${f.category}</span>
          </div>
        `).join('')}
      </div>
      <div class="ve-ft-divider"></div>
      <div class="ve-ft-size-group">
        <button type="button" class="ve-ft-size-step" id="ve-ft-size-minus" title="Уменьшить шрифт"><span class="material-symbols-rounded">remove</span></button>
        <input type="text" class="ve-ft-size-val" id="ve-ft-size-val" value="16" title="Размер (px)">
        <button type="button" class="ve-ft-size-step" id="ve-ft-size-plus" title="Увеличить шрифт"><span class="material-symbols-rounded">add</span></button>
      </div>
      <div class="ve-ft-divider"></div>
      <button type="button" class="ve-ft-btn" id="ve-ft-bold" title="Жирный (Bold)"><strong>B</strong></button>
      <button type="button" class="ve-ft-btn" id="ve-ft-italic" title="Курсив (Italic)"><em>I</em></button>
      <button type="button" class="ve-ft-btn" id="ve-ft-underline" title="Подчёркнутый (Underline)"><u>U</u></button>
      <button type="button" class="ve-ft-btn" id="ve-ft-strike" title="Зачёркнутый (Strikethrough)"><s>S</s></button>
      <div class="ve-ft-divider"></div>
      <button type="button" class="ve-ft-btn ve-ft-color-btn" id="ve-ft-color-btn" title="Цвет текста">
        <span class="material-symbols-rounded">format_color_text</span>
        <span class="ve-ft-color-dot" id="ve-ft-color-dot"></span>
        <input type="color" id="ve-ft-color-input" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">
      </button>
      <button type="button" class="ve-ft-btn ve-ft-highlight-btn" id="ve-ft-highlight-btn" title="Цвет выделения / фон">
        <span class="material-symbols-rounded">ink_highlighter</span>
        <span class="ve-ft-highlight-line" id="ve-ft-highlight-line"></span>
        <input type="color" id="ve-ft-highlight-input" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">
      </button>
      <div class="ve-ft-divider"></div>
      <button type="button" class="ve-ft-btn ve-ft-parent-btn" id="ve-ft-parent" title="Выбрать родительский элемент (Esc)">
        <span class="material-symbols-rounded">arrow_upward</span>
      </button>
      <button type="button" class="ve-ft-btn ve-ft-del-btn" id="ve-ft-delete" title="Удалить элемент (Del)">
        <span class="material-symbols-rounded">delete</span>
      </button>
    `;
    document.body.appendChild(ft);
    this._floatingToolbar = ft;
    this._bindFloatingToolbarEvents();
  }

  _bindFloatingToolbarEvents() {
    const ft = this._floatingToolbar;
    if (!ft) return;

    // Font Toggle & Menu
    const fontToggle = ft.querySelector('#ve-ft-font-toggle');
    const fontMenu = ft.querySelector('#ve-ft-font-menu');
    fontToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      fontMenu?.classList.toggle('is-hidden');
    });

    fontMenu?.querySelectorAll('.ve-font-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const fontName = opt.dataset.font;
        fontMenu.classList.add('is-hidden');
        if (this.selectedElement && fontName) {
          this.loadGoogleFont(fontName);
          this.selectedElement.style.fontFamily = `'${fontName}', sans-serif`;
          const fontNameEl = ft.querySelector('.ve-ft-font-name');
          if (fontNameEl) fontNameEl.textContent = fontName;

          const typoCurFont = this.propsEl.querySelector('#ve-typo-cur-font');
          if (typoCurFont) {
            typoCurFont.textContent = fontName;
            typoCurFont.style.fontFamily = `'${fontName}', sans-serif`;
          }
          this._saveHistory();
        }
      });
    });

    window.addEventListener('click', (e) => {
      if (!e.target.closest('#ve-ft-font-toggle') && !e.target.closest('#ve-ft-font-menu')) {
        fontMenu?.classList.add('is-hidden');
      }
    });

    // Font size - / + / input
    const sizeVal = ft.querySelector('#ve-ft-size-val');
    ft.querySelector('#ve-ft-size-minus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      let sz = parseInt(sizeVal.value) || 16;
      sz = Math.max(8, sz - 1);
      sizeVal.value = sz;
      this.selectedElement.style.fontSize = `${sz}px`;
      const pSize = this.propsEl.querySelector('#ve-typo-size-input');
      if (pSize) pSize.value = sz;
      this._saveHistory();
    });

    ft.querySelector('#ve-ft-size-plus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      let sz = parseInt(sizeVal.value) || 16;
      sz = Math.min(200, sz + 1);
      sizeVal.value = sz;
      this.selectedElement.style.fontSize = `${sz}px`;
      const pSize = this.propsEl.querySelector('#ve-typo-size-input');
      if (pSize) pSize.value = sz;
      this._saveHistory();
    });

    sizeVal?.addEventListener('change', () => {
      if (!this.selectedElement) return;
      const sz = Math.max(8, Math.min(200, parseInt(sizeVal.value) || 16));
      sizeVal.value = sz;
      this.selectedElement.style.fontSize = `${sz}px`;
      const pSize = this.propsEl.querySelector('#ve-typo-size-input');
      if (pSize) pSize.value = sz;
      this._saveHistory();
    });

    // B / I / U / S
    ft.querySelector('#ve-ft-bold')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      const cur = window.getComputedStyle(this.selectedElement).fontWeight;
      const isBold = parseInt(cur) >= 600 || cur === 'bold';
      this.selectedElement.style.fontWeight = isBold ? '400' : '700';
      ft.querySelector('#ve-ft-bold').classList.toggle('is-active', !isBold);
      const segBtn = this.propsEl.querySelector('.ve-format-seg-btn[data-fmt="bold"]');
      if (segBtn) segBtn.classList.toggle('is-active', !isBold);
      this._saveHistory();
    });

    ft.querySelector('#ve-ft-italic')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      const cur = window.getComputedStyle(this.selectedElement).fontStyle;
      const isItalic = cur === 'italic';
      this.selectedElement.style.fontStyle = isItalic ? 'normal' : 'italic';
      ft.querySelector('#ve-ft-italic').classList.toggle('is-active', !isItalic);
      const segBtn = this.propsEl.querySelector('.ve-format-seg-btn[data-fmt="italic"]');
      if (segBtn) segBtn.classList.toggle('is-active', !isItalic);
      this._saveHistory();
    });

    ft.querySelector('#ve-ft-underline')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      const cur = window.getComputedStyle(this.selectedElement).textDecoration;
      const isU = cur.includes('underline');
      this.selectedElement.style.textDecoration = isU ? 'none' : 'underline';
      ft.querySelector('#ve-ft-underline').classList.toggle('is-active', !isU);
      const segBtn = this.propsEl.querySelector('.ve-format-seg-btn[data-fmt="underline"]');
      if (segBtn) segBtn.classList.toggle('is-active', !isU);
      this._saveHistory();
    });

    ft.querySelector('#ve-ft-strike')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.selectedElement) return;
      const cur = window.getComputedStyle(this.selectedElement).textDecoration;
      const isS = cur.includes('line-through');
      this.selectedElement.style.textDecoration = isS ? 'none' : 'line-through';
      ft.querySelector('#ve-ft-strike').classList.toggle('is-active', !isS);
      const segBtn = this.propsEl.querySelector('.ve-format-seg-btn[data-fmt="strike"]');
      if (segBtn) segBtn.classList.toggle('is-active', !isS);
      this._saveHistory();
    });

    // Text color
    const colorBtn = ft.querySelector('#ve-ft-color-btn');
    const colorInput = ft.querySelector('#ve-ft-color-input');
    const colorDot = ft.querySelector('#ve-ft-color-dot');
    colorBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      colorInput?.click();
    });
    colorInput?.addEventListener('input', () => {
      if (!this.selectedElement) return;
      const col = colorInput.value;
      this.selectedElement.style.color = col;
      if (colorDot) {
        colorDot.style.background = col;
        colorDot.style.boxShadow = `0 0 6px ${col}`;
      }
      const pCol = this.propsEl.querySelector('#ve-typo-color');
      if (pCol) pCol.value = col;
      const pColHex = this.propsEl.querySelector('#ve-typo-color-hex');
      if (pColHex) pColHex.textContent = col;
    });
    colorInput?.addEventListener('change', () => this._saveHistory());

    // Highlight color
    const hlBtn = ft.querySelector('#ve-ft-highlight-btn');
    const hlInput = ft.querySelector('#ve-ft-highlight-input');
    const hlLine = ft.querySelector('#ve-ft-highlight-line');
    hlBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      hlInput?.click();
    });
    hlInput?.addEventListener('input', () => {
      if (!this.selectedElement) return;
      const col = hlInput.value;
      this.selectedElement.style.backgroundColor = col;
      if (hlLine) hlLine.style.background = col;
      const pBg = this.propsEl.querySelector('#ve-typo-bg');
      if (pBg) pBg.value = col;
    });
    hlInput?.addEventListener('change', () => this._saveHistory());

    // Parent & Del
    ft.querySelector('#ve-ft-parent')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectParent();
    });
    ft.querySelector('#ve-ft-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteSelected();
    });

    window.addEventListener('scroll', () => this._updateFloatingToolbarPosition(), true);
    window.addEventListener('resize', () => this._updateFloatingToolbarPosition());
  }

  _showFloatingToolbar(el) {
    if (!this._floatingToolbar || !el) return;
    const ft = this._floatingToolbar;

    if (el.classList && el.classList.contains('ve-block')) {
      ft.classList.add('is-hidden');
      return;
    }

    const comp = window.getComputedStyle(el);
    const curFont = (el.style.fontFamily || comp.fontFamily || 'Inter').replace(/['"]/g, '').split(',')[0].trim();
    const curWeight = el.style.fontWeight || comp.fontWeight || '400';
    const isBold = parseInt(curWeight) >= 600 || curWeight === 'bold';
    const isItalic = (el.style.fontStyle || comp.fontStyle) === 'italic';
    const textDecor = el.style.textDecoration || comp.textDecoration || '';
    const isUnderline = textDecor.includes('underline');
    const isStrike = textDecor.includes('line-through');
    const curSize = parseInt(el.style.fontSize || comp.fontSize) || 16;
    const curColor = this._colorToHex(el.style.color || comp.color) || '#ffffff';
    const curBg = this._colorToHex(el.style.backgroundColor || comp.backgroundColor) || '#facc15';

    const fontNameEl = ft.querySelector('.ve-ft-font-name');
    if (fontNameEl) fontNameEl.textContent = curFont;

    const sizeVal = ft.querySelector('#ve-ft-size-val');
    if (sizeVal) sizeVal.value = curSize;

    ft.querySelector('#ve-ft-bold')?.classList.toggle('is-active', isBold);
    ft.querySelector('#ve-ft-italic')?.classList.toggle('is-active', isItalic);
    ft.querySelector('#ve-ft-underline')?.classList.toggle('is-active', isUnderline);
    ft.querySelector('#ve-ft-strike')?.classList.toggle('is-active', isStrike);

    const colorDot = ft.querySelector('#ve-ft-color-dot');
    if (colorDot) {
      colorDot.style.background = curColor;
      colorDot.style.boxShadow = `0 0 6px ${curColor}`;
    }
    const colorInput = ft.querySelector('#ve-ft-color-input');
    if (colorInput) colorInput.value = curColor;

    const highlightLine = ft.querySelector('#ve-ft-highlight-line');
    if (highlightLine) highlightLine.style.background = curBg;
    const highlightInput = ft.querySelector('#ve-ft-highlight-input');
    if (highlightInput) highlightInput.value = curBg;

    this._updateFloatingToolbarPosition();
    ft.classList.remove('is-hidden');
  }

  _hideFloatingToolbar() {
    this._floatingToolbar?.classList.add('is-hidden');
    this._floatingToolbar?.querySelector('#ve-ft-font-menu')?.classList.add('is-hidden');
  }

  _updateFloatingToolbarPosition() {
    if (!this._floatingToolbar || !this.selectedElement || this._floatingToolbar.classList.contains('is-hidden')) return;
    const el = this.selectedElement;
    if (el.classList && el.classList.contains('ve-block')) {
      this._floatingToolbar.classList.add('is-hidden');
      return;
    }

    const ft = this._floatingToolbar;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const ftWidth = ft.offsetWidth || 340;
    const ftHeight = ft.offsetHeight || 38;

    let top = rect.top - ftHeight - 10;
    if (top < 10) {
      top = rect.bottom + 10;
    }

    let left = rect.left + (rect.width / 2) - (ftWidth / 2);
    left = Math.max(10, Math.min(window.innerWidth - ftWidth - 10, left));

    ft.style.position = 'fixed';
    ft.style.top = `${Math.round(top)}px`;
    ft.style.left = `${Math.round(left)}px`;
  }

  // ── CONTEXT MENU ──────────────────────────────────────────
  _initContextMenu() {
    if (this._contextMenu) return;
    let cm = document.getElementById('ve-context-menu');
    if (!cm) {
      cm = document.createElement('div');
      cm.id = 've-context-menu';
      document.body.appendChild(cm);
    }
    cm.className = 've-context-menu is-hidden';
    cm.innerHTML = `
      <button type="button" class="ve-ctx-item" data-action="parent">
        <span class="material-symbols-rounded">arrow_upward</span>
        <span class="ve-ctx-label">Выбрать родителя</span>
        <span class="ve-ctx-kbd">Esc</span>
      </button>
      <button type="button" class="ve-ctx-item" data-action="duplicate">
        <span class="material-symbols-rounded">content_copy</span>
        <span class="ve-ctx-label">Дублировать</span>
        <span class="ve-ctx-kbd">Ctrl+D</span>
      </button>
      <button type="button" class="ve-ctx-item" data-action="edit-text">
        <span class="material-symbols-rounded">edit</span>
        <span class="ve-ctx-label">Редактировать текст</span>
        <span class="ve-ctx-kbd">2x Click</span>
      </button>
      <div class="ve-ctx-divider"></div>
      <button type="button" class="ve-ctx-item" data-action="inspect">
        <span class="material-symbols-rounded">tune</span>
        <span class="ve-ctx-label">Типография и свойства</span>
      </button>
      <div class="ve-ctx-divider"></div>
      <button type="button" class="ve-ctx-item ve-ctx-danger" data-action="delete">
        <span class="material-symbols-rounded">delete</span>
        <span class="ve-ctx-label">Удалить элемент / блок</span>
        <span class="ve-ctx-kbd">Del</span>
      </button>
    `;
    document.body.appendChild(cm);
    this._contextMenu = cm;
    this._bindContextMenuEvents();
  }

  _bindContextMenuEvents() {
    const cm = this._contextMenu;
    if (!cm) return;

    cm.addEventListener('click', (e) => {
      const item = e.target.closest('.ve-ctx-item');
      if (!item) return;
      e.stopPropagation();
      const action = item.dataset.action;

      if (action === 'parent') {
        this.selectParent();
      } else if (action === 'duplicate') {
        this.duplicateSelected();
      } else if (action === 'edit-text') {
        const target = this.selectedElement || this.selectedBlock?.querySelector('.ve-block-content');
        if (target) {
          target.contentEditable = 'true';
          target.focus();
        }
      } else if (action === 'inspect') {
        const propsContainer = document.getElementById('wysiwyg-props');
        propsContainer?.classList.remove('is-collapsed');
        propsContainer?.classList.add('is-open');
        document.getElementById('ve-toggle-props')?.classList.add('is-active');
      } else if (action === 'delete') {
        this.deleteSelected();
      }
      this._hideContextMenu();
    });

    window.addEventListener('click', (e) => {
      if (!e.target.closest('#ve-context-menu')) {
        this._hideContextMenu();
      }
    });

    window.addEventListener('scroll', () => this._hideContextMenu(), true);
  }

  _showContextMenu(x, y) {
    if (!this._contextMenu) return;
    const cm = this._contextMenu;
    cm.classList.remove('is-hidden');

    const cmW = cm.offsetWidth || 220;
    const cmH = cm.offsetHeight || 190;

    let posX = x;
    let posY = y;

    if (posX + cmW > window.innerWidth - 10) {
      posX = window.innerWidth - cmW - 10;
    }
    if (posY + cmH > window.innerHeight - 10) {
      posY = window.innerHeight - cmH - 10;
    }

    cm.style.left = `${Math.max(10, posX)}px`;
    cm.style.top = `${Math.max(10, posY)}px`;
  }

  _hideContextMenu() {
    this._contextMenu?.classList.add('is-hidden');
  }

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────
  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // Escape key
      if (e.key === 'Escape') {
        if (isTyping) {
          activeEl.blur();
          return;
        }
        if (this._contextMenu && !this._contextMenu.classList.contains('is-hidden')) {
          this._hideContextMenu();
          return;
        }
        if (this.selectedElement && this.selectedElement !== this.selectedBlock) {
          this.selectParent();
        } else if (this.selectedBlock) {
          this._deselect();
        }
        return;
      }

      if (isTyping) return;

      // Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedElement || this.selectedBlock) {
          e.preventDefault();
          this.deleteSelected();
        }
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (this.selectedElement || this.selectedBlock) {
          e.preventDefault();
          this.duplicateSelected();
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z (without shift)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
        e.preventDefault();
        this.redo();
        return;
      }
    });
  }

  // ── CANVAS DIMENSIONS TRACKING ────────────────────────────
  _updateCanvasDims(w, h) {
    const badge = document.getElementById('ve-canvas-dims');
    if (!badge || !this.canvasEl) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const width = w !== undefined ? w : Math.round(rect.width);
    const height = h !== undefined ? h : Math.round(Math.max(this.canvasEl.offsetHeight, this.canvasEl.scrollHeight, rect.height));
    badge.textContent = `${width} × ${height}px`;
  }

  // ── EMPTY STATE ───────────────────────────────────────────
  _updateEmptyState() {
    const canvas = this.canvasEl;
    let empty = canvas.querySelector('.ve-empty-state');
    const hasBlocks = canvas.querySelectorAll('.ve-block').length > 0;
    if (hasBlocks && empty) {
      empty.remove();
    } else if (!hasBlocks && !empty) {
      empty = document.createElement('div');
      empty.className = 've-empty-state';
      empty.innerHTML = `
        <span class="material-symbols-rounded">drag_indicator</span>
        <p>Перетащите блоки из палитры слева на холст</p>
        <p class="ve-empty-sub">Двойной клик — редактировать текст</p>`;
      canvas.appendChild(empty);
    }
    this._updateCanvasDims();
  }

  // ── HISTORY ───────────────────────────────────────────────
  _saveHistory() {
    const snapshot = this.canvasEl.innerHTML;
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(snapshot);
    if (this.history.length > 60) this.history.shift();
    this.historyIdx = this.history.length - 1;
  }

  undo() {
    if (this.historyIdx <= 0) return;
    this.historyIdx--;
    this._restoreHistory();
  }

  redo() {
    if (this.historyIdx >= this.history.length - 1) return;
    this.historyIdx++;
    this._restoreHistory();
  }

  _restoreHistory() {
    this.canvasEl.innerHTML = this.history[this.historyIdx];
    this._deselect();
    this._rebindAllBlocks();
    this._updateEmptyState();
  }

  _rebindAllBlocks() {
    this.canvasEl.querySelectorAll('.ve-block').forEach(wrapper => {
      const defId = wrapper.dataset.defId;
      const def = BLOCK_PALETTE.find(b => b.id === defId) || { id: defId, icon: 'widgets', label: defId };
      this._bindBlockEvents(wrapper, def);
      const w = wrapper.dataset.blockWidth || '100%';
      wrapper.querySelectorAll('.ve-w-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.w === w);
      });
    });
  }

  // ── EXPORT / IMPORT ────────────────────────────────────────
  exportToHTML() {
    const tempContainer = document.createElement('div');
    Array.from(this.canvasEl.children).forEach(child => {
      if (!child.classList.contains('ve-empty-state')) {
        tempContainer.appendChild(child.cloneNode(true));
      }
    });

    // Strip editor UI elements
    tempContainer.querySelectorAll('.ve-block-toolbar, .ve-resize-handle, .ve-resize-badge, .ve-empty-state, .ve-col-placeholder, .ve-element-badge, .ve-breadcrumbs, .ve-floating-toolbar, .ve-context-menu').forEach(el => el.remove());

    // Recursively unwrap all .ve-block from deepest to root
    const blocks = Array.from(tempContainer.querySelectorAll('.ve-block')).reverse();
    blocks.forEach(block => {
      const content = block.querySelector('.ve-block-content');
      if (!content) {
        block.remove();
        return;
      }

      const blockWidth = block.dataset.width || block.dataset.blockWidth;
      const target = content.firstElementChild;

      if (target && content.children.length === 1 && !target.classList.contains('ve-col') && !target.classList.contains('ve-col-slot')) {
        if (blockWidth && blockWidth !== '100%' && blockWidth !== '100') {
          if (blockWidth === '50%' || blockWidth === '50') {
            target.style.width = 'calc(50% - 8px)';
            target.style.display = 'inline-block';
            target.style.verticalAlign = 'top';
            target.style.flex = '1 1 calc(50% - 8px)';
          } else if (blockWidth === '33.33%' || blockWidth === '33%' || blockWidth === '33') {
            target.style.width = 'calc(33.333% - 11px)';
            target.style.display = 'inline-block';
            target.style.verticalAlign = 'top';
            target.style.flex = '1 1 calc(33.333% - 11px)';
          } else if (blockWidth === '25%' || blockWidth === '25') {
            target.style.width = 'calc(25% - 12px)';
            target.style.display = 'inline-block';
            target.style.verticalAlign = 'top';
            target.style.flex = '1 1 calc(25% - 12px)';
          } else if (blockWidth === 'auto') {
            target.style.width = 'auto';
            target.style.maxWidth = '100%';
            target.style.display = 'inline-block';
            target.style.verticalAlign = 'top';
            target.style.flex = '0 1 auto';
          }
          target.style.boxSizing = 'border-box';
        }
        if (block.style.maxWidth) target.style.maxWidth = block.style.maxWidth;
        if (block.style.minHeight) target.style.minHeight = block.style.minHeight;
        if (block.style.marginLeft) target.style.marginLeft = block.style.marginLeft;
        if (block.style.marginRight) target.style.marginRight = block.style.marginRight;

        block.replaceWith(target);
      } else {
        const wrapperDiv = document.createElement('div');
        if (blockWidth && blockWidth !== '100%' && blockWidth !== '100') {
          if (blockWidth === '50%' || blockWidth === '50') wrapperDiv.style.cssText = 'width:calc(50% - 8px);display:inline-block;vertical-align:top;flex:1 1 calc(50% - 8px);box-sizing:border-box;';
          else if (blockWidth === '33.33%' || blockWidth === '33%' || blockWidth === '33') wrapperDiv.style.cssText = 'width:calc(33.333% - 11px);display:inline-block;vertical-align:top;flex:1 1 calc(33.333% - 11px);box-sizing:border-box;';
          else if (blockWidth === '25%' || blockWidth === '25') wrapperDiv.style.cssText = 'width:calc(25% - 12px);display:inline-block;vertical-align:top;flex:1 1 calc(25% - 12px);box-sizing:border-box;';
          else if (blockWidth === 'auto') wrapperDiv.style.cssText = 'width:auto;max-width:100%;display:inline-block;vertical-align:top;flex:0 1 auto;box-sizing:border-box;';
        }
        while (content.firstChild) {
          wrapperDiv.appendChild(content.firstChild);
        }
        block.replaceWith(wrapperDiv);
      }
    });

    // Remove editor-specific attributes and classes
    tempContainer.querySelectorAll('[data-ve-slot]').forEach(el => el.removeAttribute('data-ve-slot'));
    tempContainer.querySelectorAll('[data-def-id]').forEach(el => el.removeAttribute('data-def-id'));
    tempContainer.querySelectorAll('[data-block-width]').forEach(el => el.removeAttribute('data-block-width'));
    tempContainer.querySelectorAll('[data-width]').forEach(el => el.removeAttribute('data-width'));
    tempContainer.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    tempContainer.querySelectorAll('[data-ve-ignore]').forEach(el => el.removeAttribute('data-ve-ignore'));
    tempContainer.querySelectorAll('.is-selected, .is-dragging, .ve-drop-before, .ve-drop-after, .ve-drop-top, .ve-drop-bottom, .ve-drop-left, .ve-drop-right, .ve-drop-inside, .ve-selected-element, .ve-hovered-element').forEach(el => {
      el.classList.remove('is-selected', 'is-dragging', 've-drop-before', 've-drop-after', 've-drop-top', 've-drop-bottom', 've-drop-left', 've-drop-right', 've-drop-inside', 've-selected-element', 've-hovered-element');
      if (el.getAttribute('class') === '') el.removeAttribute('class');
    });

    // Group consecutive top-level partial-width items into a flex row
    const children = Array.from(tempContainer.children);
    let i = 0;
    while (i < children.length) {
      const child = children[i];
      const isPartial = child.style && child.style.width && child.style.width.includes('calc(');
      if (isPartial && !child.classList.contains('ve-row-flex') && !child.classList.contains('ve-row-container') && !child.classList.contains('ve-row-2col')) {
        const group = [child];
        let j = i + 1;
        while (j < children.length) {
          const next = children[j];
          if (next.style && next.style.width && next.style.width.includes('calc(')) {
            group.push(next);
            j++;
          } else {
            break;
          }
        }
        if (group.length > 1) {
          const rowWrap = document.createElement('div');
          rowWrap.className = 've-row-flex';
          rowWrap.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;width:100%;box-sizing:border-box;align-items:stretch;margin:16px 0;';
          tempContainer.insertBefore(rowWrap, group[0]);
          group.forEach(item => rowWrap.appendChild(item));
          i = j;
          continue;
        }
      }
      i++;
    }

    const bodyContent = tempContainer.innerHTML.trim();

    if (this.docTemplate && this.docTemplate.isFullDoc) {
      const dt = this.docTemplate.hasDocType ? '<!DOCTYPE html>\n' : '';
      const htmlOpen = `<html${this.docTemplate.htmlAttrs ? ' ' + this.docTemplate.htmlAttrs : ''}>`;
      const head = this.docTemplate.headContent ? `\n<head>\n  ${this.docTemplate.headContent.trim()}\n</head>` : '';
      const bodyOpen = `<body${this.docTemplate.bodyAttrs ? ' ' + this.docTemplate.bodyAttrs : ''}>`;
      return `${dt}${htmlOpen}${head}\n${bodyOpen}\n${bodyContent}\n</body>\n</html>`;
    }

    return bodyContent;
  }

  updateUserStyles(cssText) {
    this._currentUserCSS = cssText || '';
    let styleEl = document.getElementById('ve-user-scoped-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 've-user-scoped-css';
      document.head.appendChild(styleEl);
    }

    if (!cssText || !cssText.trim()) {
      styleEl.textContent = '';
      return;
    }

    const scopedCSS = this._scopeCSS(cssText);
    styleEl.textContent = scopedCSS;
  }

  _scopeCSS(cssText) {
    if (!cssText || !cssText.trim()) return '';

    let sheet;
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
    } catch (e) {
      const temp = document.createElement('style');
      temp.textContent = cssText;
      document.head.appendChild(temp);
      try {
        sheet = temp.sheet;
      } finally {
        temp.remove();
      }
    }

    if (!sheet) return '';

    const processRules = (rules) => {
      let out = '';
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          const rawSelectors = rule.selectorText.split(',');
          const isDirectCanvasRule = rawSelectors.some(sel => {
            const s = sel.trim();
            return s === 'body' || s === 'html' || s === ':root' || s === '#wysiwyg-canvas';
          });

          const scopedSelectors = rawSelectors.map(sel => {
            const s = sel.trim();
            if (s === 'body' || s === 'html' || s === ':root') {
              return '#wysiwyg-canvas';
            }
            if (s.startsWith('body ') || s.startsWith('html ') || s.startsWith(':root ')) {
              return s.replace(/^(body|html|:root)\s+/, '#wysiwyg-canvas ');
            }
            if (s === '*') {
              return '#wysiwyg-canvas, #wysiwyg-canvas .ve-block-content *';
            }
            if (s.startsWith('#wysiwyg-canvas')) {
              return s;
            }
            return `#wysiwyg-canvas .ve-block-content ${s}, #wysiwyg-canvas ${s}:not(.wysiwyg-canvas-toolbar, .wysiwyg-canvas-toolbar *, .ve-block-toolbar, .ve-block-toolbar *, .ve-resize-handle, .ve-resize-badge)`;
          }).join(', ');

          let styleCss = rule.style.cssText;
          if (isDirectCanvasRule) {
            // Strip out properties that would constrain canvas height, disable scrolling, or break block flow
            styleCss = styleCss
              .replace(/(?:^|;)\s*(overflow|overflow-x|overflow-y)\s*:[^;]+/gi, '')
              .replace(/(?:^|;)\s*(max-height|height)\s*:[^;]+/gi, '')
              .replace(/(?:^|;)\s*(min-height)\s*:[^;]+/gi, '')
              .replace(/(?:^|;)\s*(display|flex-direction|align-items|justify-content|align-content)\s*:[^;]+/gi, '')
              .replace(/(?:^|;)\s*(position|top|left|right|bottom)\s*:[^;]+/gi, '')
              .replace(/(?:^|;)\s*(width|max-width)\s*:[^;]+/gi, '')
              .replace(/^;+|;+$/g, '')
              .trim();
          }

          out += `${scopedSelectors} {\n  ${styleCss}\n}\n`;
        } else if (rule instanceof CSSMediaRule) {
          out += `@media ${rule.conditionText} {\n${processRules(rule.cssRules)}}\n`;
        } else if (rule instanceof CSSKeyframesRule) {
          out += `${rule.cssText}\n`;
        } else if (rule instanceof CSSFontFaceRule) {
          out += `${rule.cssText}\n`;
        } else if (rule instanceof CSSImportRule) {
          out += `${rule.cssText}\n`;
        } else if (rule instanceof CSSSupportsRule) {
          out += `@supports ${rule.conditionText} {\n${processRules(rule.cssRules)}}\n`;
        } else {
          out += `${rule.cssText}\n`;
        }
      }
      return out;
    };

    try {
      return processRules(sheet.cssRules);
    } catch (err) {
      console.warn('Error scoping CSS for visual editor:', err);
      return cssText;
    }
  }

  _syncHeadAssets(doc) {
    let container = document.getElementById('ve-head-assets');
    if (!container) {
      container = document.createElement('div');
      container.id = 've-head-assets';
      document.head.appendChild(container);
    }
    container.innerHTML = '';

    if (doc.head) {
      const links = doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], link[rel="dns-prefetch"]');
      links.forEach(l => {
        const clone = document.createElement('link');
        for (const attr of l.attributes) {
          clone.setAttribute(attr.name, attr.value);
        }
        container.appendChild(clone);
      });
    }
  }

  _getAttrsString(htmlStr, tag) {
    const regex = new RegExp(`<${tag}\\s+([^>]+)>`, 'i');
    const match = htmlStr.match(regex);
    return match ? match[1].trim() : '';
  }

  _detectBlockDef(el) {
    const tag = el.tagName.toLowerCase();
    const style = (el.getAttribute('style') || '').toLowerCase();
    const cls = el.className || '';

    // Check for flex row
    if (cls.includes('ve-row-flex') || ((style.includes('display: flex') || style.includes('display:flex')) && (style.includes('wrap') || style.includes('row')))) {
      return { id: 'row-flex', icon: 'view_week', label: 'Flex-ряд (адаптивный)' };
    }

    // Check for grid rows
    if (cls.includes('ve-row-2col') || ((style.includes('display: grid') || style.includes('display:grid')) && (style.includes('1fr 1fr') || style.includes('50% 50%')))) {
      return { id: 'row-2col', icon: 'view_column', label: '2 колонки (50/50)' };
    }
    if (cls.includes('ve-row-3col') || ((style.includes('display: grid') || style.includes('display:grid')) && (style.includes('1fr 1fr 1fr') || style.includes('repeat(3')))) {
      return { id: 'row-3col', icon: 'grid_on', label: '3 колонки (33%)' };
    }
    if (cls.includes('ve-row-asym-left') || style.includes('7fr 3fr') || (style.includes('70%') && style.includes('30%'))) {
      return { id: 'row-asym-left', icon: 'vertical_split', label: 'Контент + Сайдбар (70/30)' };
    }
    if (cls.includes('ve-row-asym-right') || style.includes('3fr 7fr') || (style.includes('30%') && style.includes('70%'))) {
      return { id: 'row-asym-right', icon: 'vertical_split', label: 'Сайдбар + Контент (30/70)' };
    }
    if (cls.includes('ve-row-4col') || ((style.includes('display: grid') || style.includes('display:grid')) && (style.includes('repeat(4') || style.includes('1fr 1fr 1fr 1fr')))) {
      return { id: 'row-4col', icon: 'grid_view', label: '4 колонки (25%)' };
    }
    if (cls.includes('ve-container')) {
      return { id: 'container', icon: 'crop_free', label: 'Контейнер' };
    }
    if (tag === 'section' || cls.includes('ve-section')) {
      return { id: 'section', icon: 'view_agenda', label: 'Секция' };
    }

    return BLOCK_PALETTE.find(b => {
      if (tag === 'h1' && b.id === 'h1') return true;
      if (tag === 'h2' && b.id === 'h2') return true;
      if (tag === 'h3' && b.id === 'h3') return true;
      if (tag === 'p' && b.id === 'paragraph') return true;
      if (tag === 'button' && b.id === 'button') return true;
      if (tag === 'blockquote' && b.id === 'quote') return true;
      if (tag === 'ul' && b.id === 'list') return true;
      if (tag === 'figure' && b.id === 'image') return true;
      if (tag === 'hr' && b.id === 'divider') return true;
      if (tag === 'nav' && b.id === 'navbar') return true;
      if (tag === 'footer' && b.id === 'footer') return true;
      if (tag === 'form' && b.id === 'form-contact') return true;
      return false;
    }) || {
      id: 'custom-' + tag,
      icon: tag === 'div' ? 'view_agenda' : 'code',
      label: tag.toUpperCase() + ' блок'
    };
  }

  _detectWidth(el) {
    const style = (el.getAttribute('style') || '').toLowerCase();
    if (style.includes('50%')) return '50%';
    if (style.includes('33%') || style.includes('33.33%')) return '33.33%';
    if (style.includes('25%')) return '25%';
    if (style.includes('width: auto') || style.includes('width:auto') || style.includes('display: inline-block') || style.includes('display:inline-block')) return 'auto';
    return '100%';
  }

  importFromHTML(htmlStr, cssStr = '') {
    this.clearCanvas();
    if (cssStr) {
      this.updateUserStyles(cssStr);
    }
    if (!htmlStr || !htmlStr.trim()) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');

      const hasDocType = /<!DOCTYPE\s+html/i.test(htmlStr);
      const hasHtmlTag = /<html[^>]*>/i.test(htmlStr);
      const hasHeadTag = /<head[^>]*>/i.test(htmlStr);
      const hasBodyTag = /<body[^>]*>/i.test(htmlStr);

      this.docTemplate = {
        isFullDoc: hasDocType || hasHtmlTag || hasBodyTag,
        hasDocType,
        htmlAttrs: this._getAttrsString(htmlStr, 'html'),
        headContent: doc.head ? doc.head.innerHTML : '',
        bodyAttrs: this._getAttrsString(htmlStr, 'body'),
      };

      this._syncHeadAssets(doc);

      if (doc.head) {
        const headStyles = Array.from(doc.head.querySelectorAll('style')).map(s => s.textContent).join('\n');
        if (headStyles) {
          this.updateUserStyles((this._currentUserCSS || '') + '\n' + headStyles);
        }
      }

      if (doc.body) {
        if (doc.body.style.cssText) {
          const safeBodyStyle = doc.body.style.cssText
            .replace(/(?:^|;)\s*(overflow|overflow-x|overflow-y)\s*:[^;]+/gi, '')
            .replace(/(?:^|;)\s*(max-height|height|min-height)\s*:[^;]+/gi, '')
            .replace(/(?:^|;)\s*(display|flex-direction|align-items|justify-content|align-content)\s*:[^;]+/gi, '')
            .replace(/(?:^|;)\s*(position|top|left|right|bottom|width|max-width)\s*:[^;]+/gi, '')
            .replace(/^;+|;+$/g, '')
            .trim();
          if (safeBodyStyle) {
            this.canvasEl.style.cssText += ';' + safeBodyStyle;
          }
        }
        if (doc.body.className) {
          doc.body.classList.forEach(cls => this.canvasEl.classList.add(cls));
        }
      }

      const children = Array.from(doc.body.children).filter(child => {
        return child.tagName.toLowerCase() !== 'style';
      });

      if (children.length > 0) {
        children.forEach(child => {
          const def = this._detectBlockDef(child);
          const detectedW = this._detectWidth(child);

          const isRow = def.id.startsWith('row-') || child.classList.contains('ve-row-flex') || child.classList.contains('ve-row-2col') || child.classList.contains('ve-row-3col') || child.classList.contains('ve-row-4col') || child.classList.contains('ve-row-asym-left') || child.classList.contains('ve-row-asym-right');

          if (isRow) {
            Array.from(child.children).forEach(col => {
              col.classList.add('ve-col');
              col.setAttribute('data-ve-slot', 'true');
              if (!col.children.length && !col.textContent.trim()) {
                const ph = document.createElement('p');
                ph.className = 've-col-placeholder';
                ph.textContent = 'Колонка (пусто)';
                col.appendChild(ph);
              }
            });
          }

          const blockDef = {
            ...def,
            html: child.outerHTML
          };

          const block = this._insertBlock(blockDef);
          if (detectedW && detectedW !== '100%') {
            this.setBlockWidth(block, detectedW);
          }
        });
        this._updateCanvasDims();
        this._saveHistory();
        return;
      }
    } catch (e) {
      console.warn('DOMParser failed in importFromHTML', e);
    }

    const def = {
      id: 'imported',
      icon: 'upload_file',
      label: 'Импортированный код',
      html: htmlStr
    };
    this._insertBlock(def);
    this._updateCanvasDims();
    this._saveHistory();
  }

  clearCanvas() {
    this.canvasEl.innerHTML = '';
    this.canvasEl.style.cssText = '';
    this._deselect();
    this._updateEmptyState();
    this.docTemplate = null;
    this._updateCanvasDims();
    this._saveHistory();
  }

  // ── HELPERS ───────────────────────────────────────────────
  _colorToHex(color) {
    if (!color) return '';
    if (color.startsWith('#')) return color;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // ── INIT ──────────────────────────────────────────────────
  init() {
    this._updateEmptyState();
    this._saveHistory(); // initial empty state
    this._showEmptyProps();
    this._updateCanvasDims();
  }
}
