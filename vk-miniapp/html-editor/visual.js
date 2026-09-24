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

// ─── Visual Editor Class ──────────────────────────────────────
export class VisualEditor {
  constructor({ paletteEl, canvasEl, propsEl, onExport }) {
    this.paletteEl = paletteEl;
    this.canvasEl  = canvasEl;
    this.propsEl   = propsEl;
    this.onExport  = onExport || (() => {});

    this.selectedBlock = null;
    this.blocks = [];        // [{id, el, blockDef}]
    this.history = [];
    this.historyIdx = -1;
    this._dragSrc = null;    // block being dragged within canvas
    this._paletteId = null;  // block id being dragged from palette
    this.docTemplate = null; // preserves full html document structure (head, doctype, body attrs)
    this._currentUserCSS = '';

    this._buildPalette();
    this._bindCanvas();
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
    // Select on click
    wrapper.addEventListener('click', e => {
      if (e.target.closest('.ve-act-btn') || e.target.closest('.ve-resize-handle') || e.target.closest('.ve-w-btn')) return;
      e.stopPropagation();
      this._select(wrapper, def);
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
        if (this.selectedBlock === wrapper) this._deselect();
        const oldParent = wrapper.parentNode;
        wrapper.remove();
        if (oldParent && oldParent.classList && oldParent.classList.contains('ve-col')) {
          if (!oldParent.querySelector('.ve-block')) {
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
          newH = Math.round(moveEvent.clientY - startRect.top);
          const minH = 30;
          newH = Math.max(minH, newH);

          wrapper.style.minHeight = `${newH}px`;
          if (target) {
            target.style.minHeight = `${newH}px`;
          }

          const hInput = this.propsEl.querySelector('#ve-prop-minheight');
          if (hInput) hInput.value = newH;
        }

        const dispW = Math.round(wrapper.offsetWidth);
        const dispH = Math.round(wrapper.offsetHeight);
        badge.textContent = `${dispW} × ${dispH} px`;
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

  // ── SELECTION ─────────────────────────────────────────────
  _select(wrapper, def) {
    if (this.selectedBlock) this.selectedBlock.classList.remove('is-selected');
    this.selectedBlock = wrapper;
    wrapper.classList.add('is-selected');
    const d = BLOCK_PALETTE.find(b => b.id === wrapper.dataset.defId) || def;
    this._buildPropsPanel(wrapper, d);
  }

  _deselect() {
    if (this.selectedBlock) this.selectedBlock.classList.remove('is-selected');
    this.selectedBlock = null;
    this._showEmptyProps();
  }

  deselect() {
    this._deselect();
  }

  // ── PROPS PANEL ───────────────────────────────────────────
  _buildPropsPanel(wrapper, def) {
    const p = this.propsEl;
    const content = wrapper.querySelector('.ve-block-content');

    p.innerHTML = `
      <div class="ve-props-header">
        <span class="material-symbols-rounded">${def?.icon || 'widgets'}</span>
        <span>${def?.label || 'Блок'}</span>
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Внутренний HTML</div>
        <textarea class="ve-props-raw" id="ve-raw-html" rows="6">${content.innerHTML.trim()}</textarea>
        <button class="ve-props-apply-btn" id="ve-apply-raw">Применить HTML</button>
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Стили блока</div>
        ${this._buildStyleProps(wrapper)}
      </div>

      <div class="ve-props-section">
        <div class="ve-props-label">Типография</div>
        ${this._buildTypoProps(content)}
      </div>

      <div class="ve-props-section ve-props-actions">
        <button class="ve-props-export-btn" id="ve-export-code">
          <span class="material-symbols-rounded">code</span>
          Экспортировать в код
        </button>
      </div>`;

    this._bindPropsEvents(wrapper, content);
  }

  _buildStyleProps(wrapper) {
    const content = wrapper.querySelector('.ve-block-content');
    const target = content ? (content.firstElementChild || content) : null;
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

  _buildTypoProps(content) {
    const firstEl = content.querySelector('h1,h2,h3,h4,p,span,div,li,a') || content;
    return `
      <div class="ve-prop-row">
        <label>Размер шрифта</label>
        <input type="number" class="ve-num-input" data-styleprop="fontSize" data-unit="px" value="${parseInt(firstEl.style.fontSize) || ''}" min="8" max="200" placeholder="px">
      </div>
      <div class="ve-prop-row">
        <label>Выравнивание</label>
        <div class="ve-align-btns" data-styleprop="textAlign">
          <button data-val="left" title="Лево"><span class="material-symbols-rounded">format_align_left</span></button>
          <button data-val="center" title="Центр"><span class="material-symbols-rounded">format_align_center</span></button>
          <button data-val="right" title="Право"><span class="material-symbols-rounded">format_align_right</span></button>
        </div>
      </div>`;
  }

  _bindPropsEvents(wrapper, content) {
    const p = this.propsEl;
    const target = content.firstElementChild || content;

    // Apply raw HTML
    p.querySelector('#ve-apply-raw')?.addEventListener('click', () => {
      const newHtml = p.querySelector('#ve-raw-html').value;
      content.innerHTML = newHtml;
      this._saveHistory();
    });

    // Export to code
    p.querySelector('#ve-export-code')?.addEventListener('click', () => {
      this.onExport(this.exportToHTML());
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
    p.querySelectorAll('.ve-color-pick').forEach(input => {
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
        } else if (prop === 'minHeight') {
          wrapper.style.minHeight = val;
          if (target) target.style.minHeight = val;
        } else {
          if (target) target.style[prop] = val;
          content.style[prop] = val;
        }
      });
      input.addEventListener('change', () => this._saveHistory());
    });

    // Typography inputs — apply to first matching child element
    p.querySelectorAll('.ve-num-input[data-styleprop]').forEach(input => {
      input.addEventListener('input', () => {
        const unit = input.dataset.unit || '';
        const val = input.value ? input.value + unit : '';
        const typoTarget = content.querySelector('h1,h2,h3,h4,p,span,a') || content;
        typoTarget.style[input.dataset.styleprop] = val;
      });
      input.addEventListener('change', () => this._saveHistory());
    });

    // Text align buttons
    p.querySelectorAll('.ve-align-btns[data-styleprop="textAlign"] button').forEach(btn => {
      btn.addEventListener('click', () => {
        const typoTarget = content.querySelector('h1,h2,h3,h4,p,span,a,div') || content;
        typoTarget.style.textAlign = btn.dataset.val;
        p.querySelectorAll('.ve-align-btns[data-styleprop="textAlign"] button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._saveHistory();
      });
    });
  }

  _showEmptyProps() {
    this.propsEl.innerHTML = `
      <div class="ve-props-empty">
        <span class="material-symbols-rounded">touch_app</span>
        <p>Выберите блок на холсте для редактирования его свойств</p>
      </div>`;
  }

  // ── CANVAS DIMENSIONS TRACKING ────────────────────────────
  _updateCanvasDims(w, h) {
    const badge = document.getElementById('ve-canvas-dims');
    if (!badge || !this.canvasEl) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const width = w !== undefined ? w : Math.round(rect.width);
    const height = h !== undefined ? h : Math.round(this.canvasEl.scrollHeight || rect.height);
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
    tempContainer.querySelectorAll('.ve-block-toolbar, .ve-resize-handle, .ve-resize-badge, .ve-empty-state, .ve-col-placeholder').forEach(el => el.remove());

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
    tempContainer.querySelectorAll('.is-selected, .is-dragging, .ve-drop-before, .ve-drop-after, .ve-drop-top, .ve-drop-bottom, .ve-drop-left, .ve-drop-right, .ve-drop-inside').forEach(el => {
      el.classList.remove('is-selected', 'is-dragging', 've-drop-before', 've-drop-after', 've-drop-top', 've-drop-bottom', 've-drop-left', 've-drop-right', 've-drop-inside');
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
