/**
 * visual.js — WYSIWYG Visual Editor for Aurora HTML Editor
 * Drag-and-drop block builder with bidirectional code sync
 */

// ─── Block Palette ────────────────────────────────────────────
export const BLOCK_PALETTE = [
  // Layout
  { cat: 'layout', id: 'container', icon: 'crop_free', label: 'Контейнер',
    html: `<div class="ve-container" style="max-width:1100px;width:100%;margin:0 auto;padding:24px 16px;box-sizing:border-box;">
  <!-- Ваш контент -->
</div>` },
  { cat: 'layout', id: 'section', icon: 'view_agenda', label: 'Секция',
    html: `<section class="ve-section" style="padding:clamp(32px, 6vw, 60px) 16px;background:#f8f9fa;width:100%;box-sizing:border-box;">
  <div style="max-width:1100px;width:100%;margin:0 auto;box-sizing:border-box;"><!-- Секция --></div>
</section>` },
  { cat: 'layout', id: 'row2', icon: 'view_column', label: '2 колонки',
    html: `<div class="ve-row" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;padding:16px;width:100%;box-sizing:border-box;">
  <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">Колонка 1</div>
  <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">Колонка 2</div>
</div>` },
  { cat: 'layout', id: 'row3', icon: 'grid_on', label: '3 колонки',
    html: `<div class="ve-row" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;padding:16px;width:100%;box-sizing:border-box;">
  <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">Колонка 1</div>
  <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">Колонка 2</div>
  <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">Колонка 3</div>
</div>` },
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

    canvas.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = this._paletteId ? 'copy' : 'move';
      const target = this._getDropTarget(e.target);
      this._clearDropHighlight();
      if (target && target !== canvas) target.classList.add('ve-drop-before');
    });

    canvas.addEventListener('dragleave', e => {
      if (!canvas.contains(e.relatedTarget)) this._clearDropHighlight();
    });

    canvas.addEventListener('drop', e => {
      e.preventDefault();
      this._clearDropHighlight();
      const dropTarget = this._getDropTarget(e.target);

      if (this._paletteId) {
        // From palette
        const def = BLOCK_PALETTE.find(b => b.id === this._paletteId);
        if (def) this._insertBlock(def, dropTarget);
        this._paletteId = null;
      } else if (this._dragSrc) {
        // Reorder within canvas
        const el = this._dragSrc;
        if (dropTarget && dropTarget !== el) {
          canvas.insertBefore(el, dropTarget);
        } else if (!dropTarget) {
          canvas.appendChild(el);
        }
        this._saveHistory();
        this._dragSrc = null;
      }
    });

    // Click outside → deselect
    canvas.addEventListener('click', e => {
      if (e.target === canvas) this._deselect();
    });
  }

  _getDropTarget(el) {
    // Walk up to find a direct child of canvas
    while (el && el.parentElement !== this.canvasEl) el = el.parentElement;
    return el;
  }

  _clearDropHighlight() {
    this.canvasEl.querySelectorAll('.ve-drop-before').forEach(el => el.classList.remove('ve-drop-before'));
  }

  // ── INSERT BLOCK ───────────────────────────────────────────
  _insertBlock(def, beforeEl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 've-block';
    wrapper.dataset.defId = def.id;
    wrapper.setAttribute('draggable', 'true');
    wrapper.innerHTML = `
      <div class="ve-block-toolbar">
        <span class="material-symbols-rounded ve-drag-handle" title="Перетащить">drag_indicator</span>
        <span class="ve-block-label">${def.label}</span>
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

    if (beforeEl) {
      this.canvasEl.insertBefore(wrapper, beforeEl);
    } else {
      // Find the empty state placeholder and insert before it or append
      const empty = this.canvasEl.querySelector('.ve-empty-state');
      if (empty) {
        this.canvasEl.insertBefore(wrapper, empty);
      } else {
        this.canvasEl.appendChild(wrapper);
      }
    }

    this._updateEmptyState();
    this._select(wrapper, def);
    this._saveHistory();
  }

  _bindBlockEvents(wrapper, def) {
    // Select on click
    wrapper.addEventListener('click', e => {
      if (e.target.closest('.ve-act-btn') || e.target.closest('.ve-resize-handle')) return;
      e.stopPropagation();
      this._select(wrapper, def);
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
      const canvas = this.canvasEl;

      if (action === 'delete') {
        if (this.selectedBlock === wrapper) this._deselect();
        wrapper.remove();
        this._updateEmptyState();
        this._saveHistory();
      } else if (action === 'up') {
        const prev = wrapper.previousElementSibling;
        if (prev && !prev.classList.contains('ve-empty-state')) {
          canvas.insertBefore(wrapper, prev);
          this._saveHistory();
        }
      } else if (action === 'down') {
        const next = wrapper.nextElementSibling;
        if (next && !next.classList.contains('ve-empty-state')) {
          canvas.insertBefore(next, wrapper);
          this._saveHistory();
        }
      } else if (action === 'clone') {
        const cloneDef = BLOCK_PALETTE.find(b => b.id === wrapper.dataset.defId) || def;
        const afterEl = wrapper.nextElementSibling;
        this._insertBlock(cloneDef, afterEl);
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

    const isLeft = wrapper.style.marginLeft === '0px' || (!wrapper.style.marginLeft && wrapper.style.marginRight === 'auto');
    const isCenter = (wrapper.style.marginLeft === 'auto' && wrapper.style.marginRight === 'auto') ||
                     (target?.style?.marginLeft === 'auto' && target?.style?.marginRight === 'auto');
    const isRight = wrapper.style.marginLeft === 'auto' && wrapper.style.marginRight === '0px';

    return `
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
    });
  }

  // ── EXPORT / IMPORT ────────────────────────────────────────
  exportToHTML() {
    const parts = [];
    this.canvasEl.querySelectorAll('.ve-block').forEach(wrapper => {
      const content = wrapper.querySelector('.ve-block-content');
      if (content) parts.push(content.innerHTML.trim());
    });
    return parts.join('\n\n');
  }

  importFromHTML(htmlStr) {
    this.clearCanvas();
    if (!htmlStr || !htmlStr.trim()) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');
      const children = Array.from(doc.body.children);
      if (children.length > 0) {
        children.forEach(child => {
          const tag = child.tagName.toLowerCase();
          let def = BLOCK_PALETTE.find(b => {
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
          });

          if (!def) {
            def = {
              id: 'custom-' + tag,
              icon: 'code',
              label: tag.toUpperCase() + ' блок',
              html: child.outerHTML
            };
          } else {
            def = {
              ...def,
              html: child.outerHTML
            };
          }
          this._insertBlock(def);
        });
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
    this._saveHistory();
  }

  clearCanvas() {
    this.canvasEl.innerHTML = '';
    this._deselect();
    this._updateEmptyState();
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
  }
}
