/**
 * tilda_engine.js — Ядро визуального конструктора сайтов AURORA WEB
 * Управляет страницами, структурой блоков, инспектором свойств,
 * синхронизацией слоев (Figma-style), магазином товаров и дизайн-токенами сайта.
 */

import { TILDA_CATEGORIES, TILDA_BLOCKS, getBlockById, renderBlockHtml, extractBlockDefaultData } from './tilda_blocks.js';
import { ZeroBlock, ZeroBlockEditor } from './zero_block.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class TildaEngine {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('tilda-artboard');
    this.layersList = options.layersList || document.getElementById('tilda-layers-list');
    this.propsPanel = options.propsPanel || document.getElementById('tilda-props-panel');
    this.paletteContainer = options.paletteContainer || document.getElementById('tilda-blocks-palette');

    this.activeBreakpoint = 'desktop';
    this.activeBlockId = null;
    this.activeCategory = 'all';
    this.activeInspectorTab = 'content'; // content | design | anim | resp

    this.project = this.loadProject() || this.createDefaultProject();
    this.history = [];
    this.historyIdx = -1;

    this.init();
  }

  createDefaultProject() {
    return {
      id: 'proj_' + Date.now(),
      name: 'Новый сайт Aurora Web',
      activePageId: 'page_home',
      globalStyles: {
        fontHeading: 'Montserrat',
        fontBody: 'Inter',
        colorAccent: '#0d99ff',
        colorBg: '#070a13',
        colorText: '#ffffff',
        buttonBg: '#0d99ff',
        buttonText: '#ffffff',
        buttonRadius: '8px',
        maxWidth: '1200px'
      },
      store: {
        currency: '₽',
        minOrderSum: 0,
        fields: {
          name: true,
          phone: true,
          email: true,
          address: false,
          comment: true
        },
        products: [
          {
            id: 'prod_1',
            name: 'Флагманский курс Aurora Web Pro',
            price: 14990,
            oldPrice: 19990,
            sku: 'AUR-001',
            img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
            desc: 'Полный практический курс по разработке сайтов и веб-приложений нового поколения.'
          },
          {
            id: 'prod_2',
            name: 'Дизайн-система & UI Kit 2026',
            price: 4990,
            oldPrice: 7990,
            sku: 'UI-2026',
            img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
            desc: 'Готовый набор из 200+ компонентов Figma и Tilda для быстрого запуска проектов.'
          },
          {
            id: 'prod_3',
            name: 'Премиум подписка Cloud 1 Год',
            price: 9900,
            oldPrice: 12000,
            sku: 'CLOUD-1Y',
            img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
            desc: 'Неограниченный хостинг, кастомные домены и Telegram-уведомления.'
          }
        ]
      },
      settings: {
        metaTitle: 'Мой новый сайт | AURORA WEB',
        metaDesc: 'Создано в профессиональном визуальном конструкторе сайтов AURORA WEB',
        faviconUrl: '',
        ogImageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
        yandexMetrikaId: '',
        googleAnalyticsId: '',
        telegramToken: '',
        telegramChatId: '',
        headCode: '',
        bodyCode: ''
      },
      pages: [
        {
          id: 'page_home',
          title: 'Главная страница',
          slug: 'index',
          metaTitle: 'Главная | AURORA WEB',
          metaDesc: 'Добро пожаловать на наш сайт',
          blocks: [
            this.createBlockInstance('menu-1'),
            this.createBlockInstance('cover-1'),
            this.createBlockInstance('about-1'),
            this.createBlockInstance('features-1'),
            this.createBlockInstance('pricing-1'),
            this.createBlockInstance('faq-1'),
            this.createBlockInstance('form-1'),
            this.createBlockInstance('footer-1')
          ]
        }
      ]
    };
  }

  loadProject() {
    try {
      const raw = localStorage.getItem('aurora_web_current_project') || localStorage.getItem('aurora_tilda_current_project');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.pages && p.pages.length > 0) {
          if (!p.store) {
            p.store = {
              currency: '₽',
              minOrderSum: 0,
              fields: { name: true, phone: true, email: true, address: false, comment: true },
              products: []
            };
          }
          if (!p.settings) p.settings = {};
          if (!p.globalStyles) p.globalStyles = {};
          return p;
        }
      }
    } catch (e) {
      console.warn('Load project error:', e);
    }
    return null;
  }

  saveProject() {
    try {
      localStorage.setItem('aurora_web_current_project', JSON.stringify(this.project));
      localStorage.setItem('aurora_tilda_current_project', JSON.stringify(this.project));
    } catch (e) {
      console.warn('Save project error:', e);
    }
  }

  createBlockInstance(blockDefId) {
    const def = getBlockById(blockDefId) || TILDA_BLOCKS[0];
    const defaultData = extractBlockDefaultData(def);
    return {
      instanceId: 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      blockDefId: def.id,
      name: def.name,
      cat: def.cat || def.category || 'cover',
      isZero: !!def.isZero,
      zeroData: def.isZero ? new ZeroBlock() : null,
      isHidden: false,
      isLocked: false,
      content: { ...defaultData.content },
      design: { ...defaultData.design },
      animation: {
        type: 'none',
        delay: 0,
        duration: 0.6
      },
      responsive: {
        hideOnDesktop: false,
        hideOnTablet: false,
        hideOnMobile: false
      }
    };
  }

  getActivePage() {
    return this.project.pages.find(p => p.id === this.project.activePageId) || this.project.pages[0];
  }

  init() {
    this.renderPalette();
    this.renderArtboard();
    this.renderLayersTree();
    this.renderPagesList();
    this.renderDesignTokensUI();
    this.renderStoreUI();
    this.renderSettingsUI();
    this.saveHistory();
  }

  // ─── 1. Отрисовка холста (Artboard) ───────────────────────────
  renderArtboard() {
    if (!this.container) return;
    const page = this.getActivePage();
    if (!page) return;

    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = `tilda-page-canvas is-${this.activeBreakpoint}`;
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = this.getBreakpointWidth();

    page.blocks.forEach((blk, idx) => {
      if (blk.isHidden) return;

      // Кнопка вставки блока перед текущим
      wrapper.appendChild(this.createAddBlockBar(idx));

      // Контейнер блока
      const blkEl = document.createElement('section');
      blkEl.className = `tilda-block-wrapper ${blk.instanceId === this.activeBlockId ? 'is-selected' : ''}`;
      blkEl.id = blk.instanceId;
      blkEl.dataset.blockId = blk.instanceId;

      this.applyBlockStyles(blkEl, blk);
      blkEl.appendChild(this.createBlockActionBar(blk, idx));

      // Тело блока
      const contentEl = document.createElement('div');
      contentEl.className = 'tilda-block-inner';
      const def = getBlockById(blk.blockDefId);
      if (def) {
        contentEl.innerHTML = renderBlockHtml(def, blk.content, blk.design);
      } else {
        contentEl.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Блок ${blk.name}</div>`;
      }
      blkEl.appendChild(contentEl);

      // Клик для выбора блока
      blkEl.addEventListener('click', e => {
        if (e.target.closest('.tilda-block-action-bar') || e.target.closest('.tilda-add-block-bar')) return;
        this.selectBlock(blk.instanceId);
      });

      if (!blk.isLocked) {
        this.bindInlineEditing(contentEl, blk);
      }
      wrapper.appendChild(blkEl);
    });

    // Финальная кнопка добавления внизу страницы
    wrapper.appendChild(this.createAddBlockBar(page.blocks.length, true));

    this.container.appendChild(wrapper);
  }

  getBreakpointWidth() {
    switch (this.activeBreakpoint) {
      case 'laptop': return '960px';
      case 'tablet': return '768px';
      case 'mobile_land': return '480px';
      case 'mobile_port': return '360px';
      case 'desktop':
      default: return '100%';
    }
  }

  applyBlockStyles(el, blk) {
    const d = blk.design || {};
    if (d.bgColor) el.style.backgroundColor = d.bgColor;
    if (d.bgImage) {
      el.style.backgroundImage = `url(${d.bgImage})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    }
    if (d.paddingTop) el.style.paddingTop = d.paddingTop;
    if (d.paddingBottom) el.style.paddingBottom = d.paddingBottom;
    if (d.textColor) el.style.color = d.textColor;
  }

  createBlockActionBar(blk, idx) {
    const bar = document.createElement('div');
    bar.className = 'tilda-block-action-bar';
    bar.innerHTML = `
      <div class="blk-action-title">${blk.name}</div>
      <div class="blk-action-btns">
        <button class="blk-btn btn-content" title="Редактировать контент">
          <span class="material-symbols-rounded">edit_note</span>
          <span>Контент</span>
        </button>
        <button class="blk-btn btn-settings" title="Настройки дизайна">
          <span class="material-symbols-rounded">tune</span>
          <span>Настройки</span>
        </button>
        <button class="blk-btn btn-up" title="Переместить выше" ${idx === 0 ? 'disabled' : ''}>
          <span class="material-symbols-rounded">arrow_upward</span>
        </button>
        <button class="blk-btn btn-down" title="Переместить ниже" ${idx === this.getActivePage().blocks.length - 1 ? 'disabled' : ''}>
          <span class="material-symbols-rounded">arrow_downward</span>
        </button>
        <button class="blk-btn btn-duplicate" title="Дублировать (Ctrl+D)">
          <span class="material-symbols-rounded">content_copy</span>
        </button>
        <button class="blk-btn btn-delete" title="Удалить блок (Del)" style="color:#f43f5e;">
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
    `;

    bar.querySelector('.btn-content')?.addEventListener('click', e => {
      e.stopPropagation();
      this.selectBlock(blk.instanceId, 'content');
    });
    bar.querySelector('.btn-settings')?.addEventListener('click', e => {
      e.stopPropagation();
      this.selectBlock(blk.instanceId, 'design');
    });
    bar.querySelector('.btn-up')?.addEventListener('click', e => {
      e.stopPropagation();
      this.moveBlock(blk.instanceId, -1);
    });
    bar.querySelector('.btn-down')?.addEventListener('click', e => {
      e.stopPropagation();
      this.moveBlock(blk.instanceId, 1);
    });
    bar.querySelector('.btn-duplicate')?.addEventListener('click', e => {
      e.stopPropagation();
      this.duplicateBlock(blk.instanceId);
    });
    bar.querySelector('.btn-delete')?.addEventListener('click', e => {
      e.stopPropagation();
      this.deleteBlock(blk.instanceId);
    });

    return bar;
  }

  createAddBlockBar(insertIdx, isBottom = false) {
    const bar = document.createElement('div');
    bar.className = 'tilda-add-block-bar' + (isBottom ? ' is-bottom' : '');
    bar.innerHTML = `
      <button class="tilda-add-block-btn" type="button" title="Добавить блок сюда">
        <span class="material-symbols-rounded">add</span>
        <span>${isBottom ? 'Добавить блок' : ''}</span>
      </button>
    `;
    bar.querySelector('button')?.addEventListener('click', () => {
      const libBtn = document.querySelector('.tilda-vertical-strip .strip-btn[data-tab="library"]');
      libBtn?.click();
      this._insertIndex = insertIdx;
    });
    return bar;
  }

  bindInlineEditing(contentEl, blk) {
    const editables = contentEl.querySelectorAll('h1, h2, h3, h4, p, a, button, span, blockquote');
    editables.forEach(el => {
      el.addEventListener('dblclick', e => {
        e.stopPropagation();
        el.contentEditable = 'true';
        el.focus();
        el.classList.add('is-editing-inline');

        const onBlur = () => {
          el.contentEditable = 'false';
          el.classList.remove('is-editing-inline');
          el.removeEventListener('blur', onBlur);
          this.saveHistory();
        };
        el.addEventListener('blur', onBlur);
      });
    });
  }

  // ─── 2. Операции с блоками ────────────────────────────────────
  addBlock(blockDefId, insertIndex = -1) {
    const page = this.getActivePage();
    const instance = this.createBlockInstance(blockDefId);
    const targetIdx = (insertIndex >= 0) ? insertIndex : (this._insertIndex !== undefined ? this._insertIndex : page.blocks.length);

    page.blocks.splice(targetIdx, 0, instance);
    this._insertIndex = undefined;

    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
    this.selectBlock(instance.instanceId);

    setTimeout(() => {
      const el = document.getElementById(instance.instanceId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  deleteBlock(instanceId) {
    const page = this.getActivePage();
    page.blocks = page.blocks.filter(b => b.instanceId !== instanceId);
    if (this.activeBlockId === instanceId) {
      this.activeBlockId = page.blocks[0]?.instanceId || null;
    }
    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
    this.renderInspector();
  }

  deleteActiveBlock() {
    if (this.activeBlockId) {
      this.deleteBlock(this.activeBlockId);
    }
  }

  duplicateBlock(instanceId) {
    const page = this.getActivePage();
    const idx = page.blocks.findIndex(b => b.instanceId === instanceId);
    if (idx < 0) return;

    const original = page.blocks[idx];
    const clone = JSON.parse(JSON.stringify(original));
    clone.instanceId = 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    clone.name = original.name + ' (Копия)';

    page.blocks.splice(idx + 1, 0, clone);
    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
    this.selectBlock(clone.instanceId);
  }

  moveBlock(instanceId, direction) {
    const page = this.getActivePage();
    const idx = page.blocks.findIndex(b => b.instanceId === instanceId);
    if (idx < 0) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= page.blocks.length) return;

    const item = page.blocks.splice(idx, 1)[0];
    page.blocks.splice(targetIdx, 0, item);

    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();

    const el = document.getElementById(instanceId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  toggleBlockVisibility(instanceId) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === instanceId);
    if (blk) {
      blk.isHidden = !blk.isHidden;
      this.renderArtboard();
      this.renderLayersTree();
      this.saveHistory();
    }
  }

  toggleBlockLock(instanceId) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === instanceId);
    if (blk) {
      blk.isLocked = !blk.isLocked;
      this.renderArtboard();
      this.renderLayersTree();
      this.saveHistory();
    }
  }

  // ─── 3. Библиотека блоков (Палитра) ───────────────────────────
  renderPalette() {
    if (!this.paletteContainer) return;

    let html = `
      <div class="tilda-palette-search-wrap">
        <span class="material-symbols-rounded">search</span>
        <input type="text" id="tilda-palette-search" placeholder="Поиск блоков (обложка, магазин, тарифы)..." />
      </div>

      <div class="tilda-category-chips-wrap">
        <button class="tilda-cat-chip ${this.activeCategory === 'all' ? 'is-active' : ''}" data-cat="all">Все (40+)</button>
        ${TILDA_CATEGORIES.map(c => `
          <button class="tilda-cat-chip ${this.activeCategory === c.id ? 'is-active' : ''}" data-cat="${c.id}">${c.name}</button>
        `).join('')}
      </div>

      <div class="tilda-palette-cats">
    `;

    TILDA_CATEGORIES.forEach(cat => {
      const blocks = TILDA_BLOCKS.filter(b => (b.cat || b.category) === cat.id);
      if (blocks.length === 0) return;

      const isHiddenCat = this.activeCategory !== 'all' && this.activeCategory !== cat.id;

      html += `
        <div class="tilda-cat-group" data-cat="${cat.id}" style="${isHiddenCat ? 'display:none;' : ''}">
          <div class="tilda-cat-header">
            <span class="material-symbols-rounded">${cat.icon || 'widgets'}</span>
            <span class="tilda-cat-name">${cat.name}</span>
            <span class="tilda-cat-count">${blocks.length}</span>
          </div>
          <div class="tilda-cat-blocks-grid">
      `;

      blocks.forEach(blk => {
        html += `
          <div class="tilda-palette-card" data-block-def="${blk.id}" title="${blk.name}">
            <div class="tilda-card-icon">
              <span class="material-symbols-rounded">${blk.icon || 'view_agenda'}</span>
            </div>
            <div class="tilda-card-info">
              <div class="tilda-card-name">${blk.name}</div>
              <div class="tilda-card-cat">${cat.name}</div>
            </div>
            <button class="tilda-card-add-btn" type="button" title="Добавить на страницу">
              <span class="material-symbols-rounded">add</span>
            </button>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += `</div>`;
    this.paletteContainer.innerHTML = html;

    this.paletteContainer.querySelectorAll('.tilda-cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.paletteContainer.querySelectorAll('.tilda-cat-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        this.activeCategory = chip.dataset.cat;
        this.paletteContainer.querySelectorAll('.tilda-cat-group').forEach(grp => {
          if (this.activeCategory === 'all' || grp.dataset.cat === this.activeCategory) {
            grp.style.display = 'block';
          } else {
            grp.style.display = 'none';
          }
        });
      });
    });

    const searchInput = this.paletteContainer.querySelector('#tilda-palette-search');
    searchInput?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      this.paletteContainer.querySelectorAll('.tilda-palette-card').forEach(c => {
        const text = c.textContent.toLowerCase();
        c.style.display = text.includes(q) ? 'flex' : 'none';
      });
      this.paletteContainer.querySelectorAll('.tilda-cat-group').forEach(grp => {
        const visibleCards = Array.from(grp.querySelectorAll('.tilda-palette-card')).filter(c => c.style.display !== 'none');
        grp.style.display = visibleCards.length > 0 ? 'block' : 'none';
      });
    });

    this.paletteContainer.querySelectorAll('.tilda-palette-card').forEach(card => {
      card.addEventListener('click', () => {
        const defId = card.dataset.blockDef;
        this.addBlock(defId);
      });
    });
  }

  // ─── 4. Дерево слоев (Figma-Style Layers) ──────────────────────
  renderLayersTree() {
    if (!this.layersList) return;
    const page = this.getActivePage();
    if (!page) return;

    if (page.blocks.length === 0) {
      this.layersList.innerHTML = `<div style="padding:24px;text-align:center;color:#64748b;font-size:12px;">Слоев пока нет. Выберите блок из библиотеки слева.</div>`;
      return;
    }

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px;">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;">Всего блоков: ${page.blocks.length}</span>
        <button class="topbar-action-btn" id="btn-quick-add-layer" style="padding:2px 8px;font-size:11px;">+ Блок</button>
      </div>
      <div class="tilda-layers-container">
    `;

    page.blocks.forEach((blk, idx) => {
      const isSelected = blk.instanceId === this.activeBlockId;
      const def = getBlockById(blk.blockDefId);
      html += `
        <div class="tilda-layer-item ${isSelected ? 'is-selected' : ''} ${blk.isLocked ? 'is-locked' : ''}" data-id="${blk.instanceId}" draggable="true">
          <div class="layer-drag-handle" title="Перетащить">
            <span class="material-symbols-rounded">drag_indicator</span>
          </div>
          <div class="layer-icon-box">
            <span class="material-symbols-rounded">${def?.icon || 'view_agenda'}</span>
          </div>
          <div class="layer-title" title="${blk.name}">${blk.name}</div>
          <div class="layer-actions">
            <button class="layer-act-btn btn-up" title="Выше" ${idx === 0 ? 'disabled' : ''}>
              <span class="material-symbols-rounded" style="font-size:14px;">expand_less</span>
            </button>
            <button class="layer-act-btn btn-down" title="Ниже" ${idx === page.blocks.length - 1 ? 'disabled' : ''}>
              <span class="material-symbols-rounded" style="font-size:14px;">expand_more</span>
            </button>
            <button class="layer-act-btn btn-vis ${blk.isHidden ? 'is-hidden-layer' : ''}" title="${blk.isHidden ? 'Показать' : 'Скрыть'}">
              <span class="material-symbols-rounded" style="font-size:15px;">${blk.isHidden ? 'visibility_off' : 'visibility'}</span>
            </button>
            <button class="layer-act-btn btn-lock ${blk.isLocked ? 'is-locked-btn' : ''}" title="${blk.isLocked ? 'Разблокировать' : 'Заблокировать'}">
              <span class="material-symbols-rounded" style="font-size:14px;">${blk.isLocked ? 'lock' : 'lock_open'}</span>
            </button>
            <button class="layer-act-btn btn-dup" title="Дублировать (Ctrl+D)">
              <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
            </button>
            <button class="layer-act-btn btn-del" title="Удалить блок" style="color:#f43f5e;">
              <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.layersList.innerHTML = html;

    this.layersList.querySelector('#btn-quick-add-layer')?.addEventListener('click', () => {
      document.querySelector('.tilda-vertical-strip .strip-btn[data-tab="library"]')?.click();
    });

    this.layersList.querySelectorAll('.tilda-layer-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.layer-act-btn') || e.target.closest('.layer-drag-handle')) return;
        this.selectBlock(item.dataset.id);
        const el = document.getElementById(item.dataset.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      item.querySelector('.btn-up')?.addEventListener('click', e => {
        e.stopPropagation();
        this.moveBlock(item.dataset.id, -1);
      });
      item.querySelector('.btn-down')?.addEventListener('click', e => {
        e.stopPropagation();
        this.moveBlock(item.dataset.id, 1);
      });
      item.querySelector('.btn-vis')?.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleBlockVisibility(item.dataset.id);
      });
      item.querySelector('.btn-lock')?.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleBlockLock(item.dataset.id);
      });
      item.querySelector('.btn-dup')?.addEventListener('click', e => {
        e.stopPropagation();
        this.duplicateBlock(item.dataset.id);
      });
      item.querySelector('.btn-del')?.addEventListener('click', e => {
        e.stopPropagation();
        this.deleteBlock(item.dataset.id);
      });
    });

    this.bindLayersDragAndDrop();
  }

  bindLayersDragAndDrop() {
    let draggedId = null;
    const items = this.layersList.querySelectorAll('.tilda-layer-item');

    items.forEach(item => {
      item.addEventListener('dragstart', () => {
        draggedId = item.dataset.id;
        item.classList.add('is-dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        draggedId = null;
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const targetId = item.dataset.id;
        if (!draggedId || draggedId === targetId) return;

        const page = this.getActivePage();
        const fromIdx = page.blocks.findIndex(b => b.instanceId === draggedId);
        const toIdx = page.blocks.findIndex(b => b.instanceId === targetId);

        if (fromIdx >= 0 && toIdx >= 0) {
          const moved = page.blocks.splice(fromIdx, 1)[0];
          page.blocks.splice(toIdx, 0, moved);
          this.saveHistory();
          this.renderArtboard();
          this.renderLayersTree();
        }
      });
    });
  }

  // ─── 5. Инспектор свойств (Figma Inspector) ───────────────────
  selectBlock(instanceId, preferredTab = null) {
    this.activeBlockId = instanceId;
    if (preferredTab) this.activeInspectorTab = preferredTab;

    document.querySelectorAll('.tilda-block-wrapper').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.blockId === instanceId);
    });

    this.layersList?.querySelectorAll('.tilda-layer-item').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.id === instanceId);
    });

    this.renderInspector();
  }

  renderInspector() {
    if (!this.propsPanel) return;

    if (!this.activeBlockId) {
      this.renderPageInspector();
      return;
    }

    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === this.activeBlockId);
    if (!blk) {
      this.renderPageInspector();
      return;
    }

    const def = getBlockById(blk.blockDefId);

    let html = `
      <div class="tilda-inspector-header">
        <div class="insp-title">
          <span class="material-symbols-rounded">${def?.icon || 'tune'}</span>
          <span>${blk.name}</span>
        </div>
        <div class="insp-tabs">
          <button class="insp-tab ${this.activeInspectorTab === 'content' ? 'is-active' : ''}" data-tab="content">Контент</button>
          <button class="insp-tab ${this.activeInspectorTab === 'design' ? 'is-active' : ''}" data-tab="design">Дизайн</button>
          <button class="insp-tab ${this.activeInspectorTab === 'anim' ? 'is-active' : ''}" data-tab="anim">Анимация</button>
        </div>
      </div>
      <div class="tilda-inspector-body">
    `;

    if (this.activeInspectorTab === 'content') {
      html += this.renderContentFields(blk, def);
    } else if (this.activeInspectorTab === 'design') {
      html += this.renderDesignFields(blk, def);
    } else if (this.activeInspectorTab === 'anim') {
      html += this.renderAnimationFields(blk);
    }

    html += `
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;">
          <button class="topbar-action-btn" id="btn-insp-duplicate" style="flex:1;"><span class="material-symbols-rounded">content_copy</span> Копия</button>
          <button class="topbar-action-btn" id="btn-insp-delete" style="flex:1;background:rgba(244,63,94,0.15);color:#f43f5e;border-color:rgba(244,63,94,0.3);"><span class="material-symbols-rounded">delete</span> Удалить</button>
        </div>
      </div>
    `;

    this.propsPanel.innerHTML = html;

    this.propsPanel.querySelectorAll('.insp-tab').forEach(t => {
      t.addEventListener('click', () => {
        this.activeInspectorTab = t.dataset.tab;
        this.renderInspector();
      });
    });

    this.propsPanel.querySelector('#btn-insp-duplicate')?.addEventListener('click', () => {
      this.duplicateBlock(blk.instanceId);
    });
    this.propsPanel.querySelector('#btn-insp-delete')?.addEventListener('click', () => {
      this.deleteBlock(blk.instanceId);
    });

    this.bindInspectorInputs(blk);
  }

  renderContentFields(blk, def) {
    const c = blk.content || {};
    let html = '<div class="insp-section-title">Тексты и элементы</div>';

    if (c.title !== undefined) {
      html += `
        <div class="insp-field">
          <label>Заголовок блока</label>
          <input type="text" data-content-key="title" value="${escapeHtml(c.title || '')}" />
        </div>
      `;
    }
    if (c.subtitle !== undefined) {
      html += `
        <div class="insp-field">
          <label>Подзаголовок / Описание</label>
          <textarea rows="3" data-content-key="subtitle">${escapeHtml(c.subtitle || '')}</textarea>
        </div>
      `;
    }
    if (c.text !== undefined) {
      html += `
        <div class="insp-field">
          <label>Основной текст</label>
          <textarea rows="4" data-content-key="text">${escapeHtml(c.text || '')}</textarea>
        </div>
      `;
    }
    if (c.btnText !== undefined) {
      html += `
        <div class="insp-field">
          <label>Текст кнопки</label>
          <input type="text" data-content-key="btnText" value="${escapeHtml(c.btnText || '')}" />
        </div>
        <div class="insp-field">
          <label>Ссылка кнопки (URL или #якорь)</label>
          <input type="text" data-content-key="btnUrl" value="${escapeHtml(c.btnUrl || '#')}" />
        </div>
      `;
    }
    if (c.bgImage !== undefined || c.img !== undefined) {
      const imgVal = c.bgImage || c.img || '';
      const key = c.bgImage !== undefined ? 'bgImage' : 'img';
      html += `
        <div class="insp-field">
          <label>Изображение (URL)</label>
          <input type="text" data-content-key="${key}" value="${escapeHtml(imgVal)}" placeholder="https://..." />
        </div>
      `;
    }

    return html;
  }

  renderDesignFields(blk, def) {
    const d = blk.design || {};
    return `
      <div class="insp-section-title">Фон и оформление</div>
      <div class="insp-field">
        <label>Цвет фона</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="bgColor" value="${d.bgColor || '#0f172a'}" />
          <input type="text" data-design-key="bgColor" value="${d.bgColor || '#0f172a'}" style="flex:1;" />
        </div>
      </div>
      <div class="insp-field">
        <label>Цвет текста</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="textColor" value="${d.textColor || '#ffffff'}" />
          <input type="text" data-design-key="textColor" value="${d.textColor || '#ffffff'}" style="flex:1;" />
        </div>
      </div>
      <div class="insp-row-2">
        <div class="insp-field">
          <label>Отступ сверху</label>
          <input type="text" data-design-key="paddingTop" value="${d.paddingTop || '80px'}" />
        </div>
        <div class="insp-field">
          <label>Отступ снизу</label>
          <input type="text" data-design-key="paddingBottom" value="${d.paddingBottom || '80px'}" />
        </div>
      </div>
    `;
  }

  renderAnimationFields(blk) {
    const a = blk.animation || {};
    return `
      <div class="insp-section-title">Анимация при скролле</div>
      <div class="insp-field">
        <label>Тип появления</label>
        <select data-anim-key="type">
          <option value="none" ${a.type === 'none' ? 'selected' : ''}>Без анимации</option>
          <option value="fade-in" ${a.type === 'fade-in' ? 'selected' : ''}>Плавное появление (Fade In)</option>
          <option value="slide-up" ${a.type === 'slide-up' ? 'selected' : ''}>Всплытие снизу (Slide Up)</option>
          <option value="zoom-in" ${a.type === 'zoom-in' ? 'selected' : ''}>Увеличение (Zoom In)</option>
        </select>
      </div>
    `;
  }

  renderPageInspector() {
    const page = this.getActivePage();
    this.propsPanel.innerHTML = `
      <div class="tilda-inspector-header">
        <div class="insp-title">
          <span class="material-symbols-rounded">settings</span>
          <span>Параметры страницы</span>
        </div>
      </div>
      <div class="tilda-inspector-body">
        <div class="insp-section-title">Свойства страницы</div>
        <div class="insp-field">
          <label>Название страницы</label>
          <input type="text" id="page-title-input" value="${escapeHtml(page.title)}" />
        </div>
        <div class="insp-field">
          <label>URL адрес (slug)</label>
          <input type="text" id="page-slug-input" value="${escapeHtml(page.slug)}" />
        </div>
        <div class="insp-field">
          <label>Заголовок вкладки (Meta Title)</label>
          <input type="text" id="page-metatitle-input" value="${escapeHtml(page.metaTitle || '')}" placeholder="Заголовок в браузере" />
        </div>
        <div class="insp-field">
          <label>Описание (Meta Description)</label>
          <textarea rows="3" id="page-metadesc-input" placeholder="Краткое описание для поисковиков">${escapeHtml(page.metaDesc || '')}</textarea>
        </div>
        <div class="insp-field">
          <label>Блоков на странице</label>
          <div style="font-size:13px;color:var(--accent);font-weight:700;">${page.blocks.length} активных блоков</div>
        </div>
      </div>
    `;

    this.propsPanel.querySelector('#page-title-input')?.addEventListener('input', e => {
      page.title = e.target.value;
      this.renderPagesList();
      this.saveHistory();
    });
    this.propsPanel.querySelector('#page-slug-input')?.addEventListener('input', e => {
      page.slug = e.target.value;
      this.renderPagesList();
      this.saveHistory();
    });
    this.propsPanel.querySelector('#page-metatitle-input')?.addEventListener('input', e => {
      page.metaTitle = e.target.value;
      this.saveHistory();
    });
    this.propsPanel.querySelector('#page-metadesc-input')?.addEventListener('input', e => {
      page.metaDesc = e.target.value;
      this.saveHistory();
    });
  }

  bindInspectorInputs(blk) {
    this.propsPanel.querySelectorAll('[data-content-key]').forEach(input => {
      input.addEventListener('input', e => {
        const key = input.dataset.contentKey;
        blk.content[key] = input.value;
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    this.propsPanel.querySelectorAll('[data-design-key]').forEach(input => {
      input.addEventListener('input', e => {
        const key = input.dataset.designKey;
        blk.design[key] = input.value;
        const el = document.getElementById(blk.instanceId);
        if (el) this.applyBlockStyles(el, blk);
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    this.propsPanel.querySelectorAll('[data-anim-key]').forEach(select => {
      select.addEventListener('change', e => {
        const key = select.dataset.animKey;
        blk.animation[key] = select.value;
        this.saveHistory();
      });
    });
  }

  updateBlockDOM(blk) {
    const el = document.getElementById(blk.instanceId);
    if (!el) return;
    const def = getBlockById(blk.blockDefId);
    const inner = el.querySelector('.tilda-block-inner');
    if (inner && def) {
      inner.innerHTML = renderBlockHtml(def, blk.content, blk.design);
      this.bindInlineEditing(inner, blk);
    }
  }

  // ─── 6. Дизайн-система и Шрифты (Live Preview) ────────────────
  renderDesignTokensUI() {
    const cont = document.getElementById('tilda-theme-panel');
    if (!cont) return;
    const g = this.project.globalStyles;

    cont.innerHTML = `
      <!-- Живое интерактивное превью темы -->
      <div class="live-theme-preview-card" id="theme-live-preview-box">
        <div class="live-theme-badge" style="background:rgba(13,153,255,0.15);color:${g.colorAccent};border:1px solid ${g.colorAccent};">
          Образец стиля
        </div>
        <div class="live-theme-heading" style="font-family:'${g.fontHeading}',sans-serif;">
          Заголовок в ${g.fontHeading}
        </div>
        <div class="live-theme-text" style="font-family:'${g.fontBody}',sans-serif;">
          Основной текст сайта отображается гарнитурой ${g.fontBody}. Стиль адаптируется под любые экраны.
        </div>
        <button class="live-theme-btn" style="background:${g.colorAccent};color:#fff;border-radius:${g.buttonRadius};">
          Главная кнопка
        </button>
      </div>

      <div class="insp-section-title">Типографика сайта</div>
      <div class="insp-field">
        <label>Шрифт заголовков (H1–H3)</label>
        <select id="theme-font-head">
          <option value="Montserrat" ${g.fontHeading === 'Montserrat' ? 'selected' : ''}>Montserrat (Современный Sans)</option>
          <option value="Unbounded" ${g.fontHeading === 'Unbounded' ? 'selected' : ''}>Unbounded (Футуристичный)</option>
          <option value="Playfair Display" ${g.fontHeading === 'Playfair Display' ? 'selected' : ''}>Playfair Display (Премиум с засечками)</option>
          <option value="Caveat" ${g.fontHeading === 'Caveat' ? 'selected' : ''}>Caveat (Рукописный)</option>
          <option value="Oswald" ${g.fontHeading === 'Oswald' ? 'selected' : ''}>Oswald (Плотный заголовочный)</option>
          <option value="Inter" ${g.fontHeading === 'Inter' ? 'selected' : ''}>Inter (Нейтральный)</option>
          <option value="Roboto" ${g.fontHeading === 'Roboto' ? 'selected' : ''}>Roboto</option>
          <option value="Open Sans" ${g.fontHeading === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
        </select>
      </div>

      <div class="insp-field">
        <label>Основной шрифт текста (Body)</label>
        <select id="theme-font-body">
          <option value="Inter" ${g.fontBody === 'Inter' ? 'selected' : ''}>Inter (Рекомендуется)</option>
          <option value="Roboto" ${g.fontBody === 'Roboto' ? 'selected' : ''}>Roboto</option>
          <option value="Open Sans" ${g.fontBody === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
          <option value="Montserrat" ${g.fontBody === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
        </select>
      </div>

      <button class="topbar-action-btn" id="btn-open-ofont-theme" style="width:100%;padding:8px 12px;justify-content:center;background:rgba(13,153,255,0.12);border-color:#0d99ff;color:#0d99ff;margin-bottom:14px;">
        <span class="material-symbols-rounded">font_download</span>
        <span>+ Загрузить шрифт ofont.ru (.ttf/.woff)</span>
      </button>

      <div class="insp-section-title">Цвета бренда & Кнопки</div>
      <div class="insp-field">
        <label>Основной акцентный цвет</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" id="theme-accent-color" value="${g.colorAccent}" />
          <input type="text" id="theme-accent-color-txt" value="${g.colorAccent}" style="flex:1;" />
        </div>
      </div>

      <div class="insp-field">
        <label>Скругление кнопок</label>
        <div class="radius-picker-wrap">
          <button class="radius-pill-btn ${g.buttonRadius === '0px' ? 'is-active' : ''}" data-radius="0px">0px</button>
          <button class="radius-pill-btn ${g.buttonRadius === '6px' ? 'is-active' : ''}" data-radius="6px">6px</button>
          <button class="radius-pill-btn ${g.buttonRadius === '12px' ? 'is-active' : ''}" data-radius="12px">12px</button>
          <button class="radius-pill-btn ${g.buttonRadius === '9999px' ? 'is-active' : ''}" data-radius="9999px">Pill</button>
        </div>
      </div>

      <button class="topbar-action-btn btn-primary" id="btn-apply-theme-all" style="width:100%;margin-top:14px;padding:10px;justify-content:center;">
        <span class="material-symbols-rounded">auto_fix_high</span>
        <span>Применить стиль ко всем блокам</span>
      </button>
    `;

    cont.querySelector('#theme-font-head')?.addEventListener('change', e => {
      g.fontHeading = e.target.value;
      this.applyGlobalStyles();
      this.renderDesignTokensUI();
      this.saveHistory();
    });
    cont.querySelector('#theme-font-body')?.addEventListener('change', e => {
      g.fontBody = e.target.value;
      this.applyGlobalStyles();
      this.renderDesignTokensUI();
      this.saveHistory();
    });
    cont.querySelector('#theme-accent-color')?.addEventListener('input', e => {
      g.colorAccent = e.target.value;
      g.buttonBg = e.target.value;
      cont.querySelector('#theme-accent-color-txt').value = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });
    cont.querySelector('#theme-accent-color-txt')?.addEventListener('input', e => {
      g.colorAccent = e.target.value;
      g.buttonBg = e.target.value;
      cont.querySelector('#theme-accent-color').value = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });

    cont.querySelectorAll('.radius-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cont.querySelectorAll('.radius-pill-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        g.buttonRadius = btn.dataset.radius;
        this.applyGlobalStyles();
        this.renderDesignTokensUI();
        this.saveHistory();
      });
    });

    cont.querySelector('#btn-open-ofont-theme')?.addEventListener('click', () => {
      window.openOfontModal?.();
    });

    cont.querySelector('#btn-apply-theme-all')?.addEventListener('click', () => {
      this.applyGlobalStylesToBlocks();
      this.renderArtboard();
      this.saveHistory();
      alert('✨ Стили применены ко всем блокам проекта!');
    });
  }

  applyGlobalStyles() {
    const g = this.project.globalStyles;
    document.documentElement.style.setProperty('--tilda-font-head', `'${g.fontHeading}', sans-serif`);
    document.documentElement.style.setProperty('--tilda-font-body', `'${g.fontBody}', sans-serif`);
    document.documentElement.style.setProperty('--tilda-accent', g.colorAccent);
    this.renderArtboard();
  }

  applyGlobalStylesToBlocks() {
    const g = this.project.globalStyles;
    this.project.pages.forEach(page => {
      page.blocks.forEach(blk => {
        if (!blk.design) blk.design = {};
        blk.design.btnBg = g.buttonBg;
        blk.design.btnRadius = g.buttonRadius;
      });
    });
  }

  // ─── 7. Страницы сайта (Pages Manager) ────────────────────────
  renderPagesList() {
    const listEl = document.getElementById('tilda-pages-list');
    if (!listEl) return;

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;">Страниц: ${this.project.pages.length}</span>
        <button class="topbar-action-btn" id="btn-open-templates-modal" style="padding:4px 8px;font-size:11px;">
          <span class="material-symbols-rounded" style="font-size:14px;">add</span>
          <span>+ Шаблоны</span>
        </button>
      </div>
      <div class="tilda-pages-container">
    `;

    this.project.pages.forEach(p => {
      const isActive = p.id === this.project.activePageId;
      html += `
        <div class="tilda-page-item ${isActive ? 'is-active' : ''}" data-page-id="${p.id}">
          <span class="material-symbols-rounded" style="color:${isActive ? 'var(--accent)' : 'var(--text-3)'};">article</span>
          <div class="page-item-info">
            <div class="page-item-title-row">
              <span class="page-item-title">${escapeHtml(p.title)}</span>
              <span class="page-badge-pill">${p.blocks?.length || 0} бл.</span>
            </div>
            <div class="page-item-slug">/${p.slug}</div>
          </div>
          <div class="page-actions-group">
            <button class="page-act-btn btn-page-seo" data-page-seo="${p.id}" title="SEO и настройки страницы">
              <span class="material-symbols-rounded" style="font-size:15px;">settings</span>
            </button>
            <button class="page-act-btn btn-page-dup" data-page-dup="${p.id}" title="Дублировать страницу">
              <span class="material-symbols-rounded" style="font-size:15px;">content_copy</span>
            </button>
            ${this.project.pages.length > 1 ? `
              <button class="page-act-btn btn-del" data-del-page="${p.id}" title="Удалить страницу">
                <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';

    listEl.innerHTML = html;

    listEl.querySelector('#btn-open-templates-modal')?.addEventListener('click', () => {
      document.getElementById('new-page-modal')?.classList.remove('hidden');
    });

    listEl.querySelectorAll('.tilda-page-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.page-actions-group')) return;
        this.switchPage(item.dataset.pageId);
      });
    });

    listEl.querySelectorAll('[data-page-seo]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        this.openPageSettingsModal(b.dataset.pageSeo);
      });
    });

    listEl.querySelectorAll('[data-page-dup]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        this.duplicatePage(b.dataset.pageDup);
      });
    });

    listEl.querySelectorAll('[data-del-page]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        this.deletePage(b.dataset.delPage);
      });
    });
  }

  switchPage(pageId) {
    this.project.activePageId = pageId;
    this.activeBlockId = null;
    this.renderPagesList();
    this.renderArtboard();
    this.renderLayersTree();
    this.renderInspector();
  }

  addPage(title = 'Новая страница', slug = '', templateType = 'blank') {
    let blocks = [];
    if (templateType === 'landing') {
      blocks = [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('cover-1'),
        this.createBlockInstance('features-1'),
        this.createBlockInstance('pricing-1'),
        this.createBlockInstance('faq-1'),
        this.createBlockInstance('form-1'),
        this.createBlockInstance('footer-1')
      ];
    } else if (templateType === 'store') {
      blocks = [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('store-1'),
        this.createBlockInstance('features-1'),
        this.createBlockInstance('form-1'),
        this.createBlockInstance('footer-1')
      ];
    } else if (templateType === 'about') {
      blocks = [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('cover-1'),
        this.createBlockInstance('about-1'),
        this.createBlockInstance('testimonials-1'),
        this.createBlockInstance('footer-1')
      ];
    } else if (templateType === 'contacts') {
      blocks = [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('contacts-1'),
        this.createBlockInstance('form-1'),
        this.createBlockInstance('footer-1')
      ];
    } else {
      blocks = [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('cover-1'),
        this.createBlockInstance('footer-1')
      ];
    }

    const newPage = {
      id: 'page_' + Date.now(),
      title,
      slug: slug || 'page-' + (this.project.pages.length + 1),
      metaTitle: `${title} | ${this.project.name}`,
      metaDesc: '',
      blocks
    };

    this.project.pages.push(newPage);
    this.switchPage(newPage.id);
    this.saveHistory();
  }

  duplicatePage(pageId) {
    const original = this.project.pages.find(p => p.id === pageId);
    if (!original) return;

    const clone = JSON.parse(JSON.stringify(original));
    clone.id = 'page_' + Date.now();
    clone.title = original.title + ' (Копия)';
    clone.slug = original.slug + '-copy';

    this.project.pages.push(clone);
    this.switchPage(clone.id);
    this.saveHistory();
  }

  deletePage(pageId) {
    if (this.project.pages.length <= 1) {
      alert('Нельзя удалить единственную страницу проекта!');
      return;
    }
    if (!confirm('Удалить страницу и все её блоки?')) return;
    this.project.pages = this.project.pages.filter(p => p.id !== pageId);
    if (this.project.activePageId === pageId) {
      this.project.activePageId = this.project.pages[0].id;
    }
    this.switchPage(this.project.activePageId);
    this.saveHistory();
  }

  openPageSettingsModal(pageId) {
    const p = this.project.pages.find(x => x.id === pageId);
    if (!p) return;

    const modal = document.getElementById('page-settings-modal');
    if (!modal) return;

    document.getElementById('ps-page-title').value = p.title || '';
    document.getElementById('ps-page-slug').value = p.slug || '';
    document.getElementById('ps-meta-title').value = p.metaTitle || '';
    document.getElementById('ps-meta-desc').value = p.metaDesc || '';

    modal.dataset.editingPageId = pageId;
    modal.classList.remove('hidden');
  }

  // ─── 8. Магазин и товары (Store & Cart Manager) ────────────────
  renderStoreUI() {
    const cont = document.getElementById('tilda-store-panel');
    if (!cont) return;
    const s = this.project.store;

    let html = `
      <div class="store-stats-card">
        <div>
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;font-weight:700;">Каталог</div>
          <div style="font-size:16px;font-weight:800;color:#fff;">${s.products.length} товаров</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;font-weight:700;">Валюта</div>
          <div style="font-size:16px;font-weight:800;color:#10b981;">${s.currency}</div>
        </div>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <button class="topbar-action-btn btn-primary" id="btn-add-store-product" style="flex:1;justify-content:center;padding:8px;">
          <span class="material-symbols-rounded">add</span>
          <span>+ Добавить товар</span>
        </button>
        <button class="topbar-action-btn" id="btn-insert-store-block" style="padding:8px;" title="Вставить блок каталога на страницу">
          <span class="material-symbols-rounded">storefront</span>
        </button>
      </div>

      <div class="insp-section-title">Список товаров (${s.products.length})</div>
      <div class="store-products-list" id="store-products-container">
    `;

    if (s.products.length === 0) {
      html += `<div style="text-align:center;padding:20px;color:var(--text-4);font-size:12px;">В каталоге пока нет товаров. Нажмите «+ Добавить товар».</div>`;
    } else {
      s.products.forEach(prod => {
        html += `
          <div class="store-product-card" data-prod-id="${prod.id}">
            <img src="${prod.img || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'}" class="store-product-thumb" alt="${escapeHtml(prod.name)}" />
            <div class="store-product-info">
              <div class="store-product-name">${escapeHtml(prod.name)}</div>
              <div class="store-product-prices">
                <span class="store-product-price">${Number(prod.price).toLocaleString()} ${s.currency}</span>
                ${prod.oldPrice ? `<span class="store-product-old-price">${Number(prod.oldPrice).toLocaleString()} ${s.currency}</span>` : ''}
              </div>
              <div class="store-product-sku">SKU: ${prod.sku || 'N/A'}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <button class="page-act-btn btn-edit-prod" data-edit-prod="${prod.id}" title="Редактировать">
                <span class="material-symbols-rounded" style="font-size:14px;">edit</span>
              </button>
              <button class="page-act-btn btn-del-prod" data-del-prod="${prod.id}" title="Удалить" style="color:#f43f5e;">
                <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
              </button>
            </div>
          </div>
        `;
      });
    }

    html += `
      </div>

      <div class="insp-section-title" style="margin-top:18px;">Настройки корзины & Заказа</div>
      <div class="insp-field">
        <label>Валюта цен</label>
        <select id="store-currency-select">
          <option value="₽" ${s.currency === '₽' ? 'selected' : ''}>₽ — Российский рубль</option>
          <option value="$" ${s.currency === '$' ? 'selected' : ''}>$ — Доллар США</option>
          <option value="€" ${s.currency === '€' ? 'selected' : ''}>€ — Евро</option>
          <option value="₸" ${s.currency === '₸' ? 'selected' : ''}>₸ — Казахстанский тенге</option>
          <option value="₴" ${s.currency === '₴' ? 'selected' : ''}>₴ — Украинская гривна</option>
          <option value="Br" ${s.currency === 'Br' ? 'selected' : ''}>Br — Белорусский рубль</option>
        </select>
      </div>

      <div class="insp-field">
        <label>Минимальная сумма заказа</label>
        <input type="number" id="store-min-order" value="${s.minOrderSum || 0}" placeholder="0" />
      </div>

      <div class="insp-section-title">Поля в форме оформления</div>
      <label class="insp-checkbox"><input type="checkbox" id="chk-field-name" ${s.fields.name ? 'checked' : ''} /> Имя покупателя</label>
      <label class="insp-checkbox"><input type="checkbox" id="chk-field-phone" ${s.fields.phone ? 'checked' : ''} /> Номер телефона</label>
      <label class="insp-checkbox"><input type="checkbox" id="chk-field-email" ${s.fields.email ? 'checked' : ''} /> Email</label>
      <label class="insp-checkbox"><input type="checkbox" id="chk-field-address" ${s.fields.address ? 'checked' : ''} /> Адрес доставки</label>
      <label class="insp-checkbox"><input type="checkbox" id="chk-field-comment" ${s.fields.comment ? 'checked' : ''} /> Комментарий к заказу</label>
    `;

    cont.innerHTML = html;

    cont.querySelector('#btn-add-store-product')?.addEventListener('click', () => {
      this.openProductModal();
    });

    cont.querySelector('#btn-insert-store-block')?.addEventListener('click', () => {
      this.addBlock('store-1');
    });

    cont.querySelectorAll('[data-edit-prod]').forEach(b => {
      b.addEventListener('click', () => {
        this.openProductModal(b.dataset.editProd);
      });
    });

    cont.querySelectorAll('[data-del-prod]').forEach(b => {
      b.addEventListener('click', () => {
        const pid = b.dataset.delProd;
        s.products = s.products.filter(x => x.id !== pid);
        this.renderStoreUI();
        this.saveHistory();
      });
    });

    cont.querySelector('#store-currency-select')?.addEventListener('change', e => {
      s.currency = e.target.value;
      this.renderStoreUI();
      this.renderArtboard();
      this.saveHistory();
    });

    cont.querySelector('#store-min-order')?.addEventListener('input', e => {
      s.minOrderSum = Number(e.target.value) || 0;
      this.saveHistory();
    });

    ['name', 'phone', 'email', 'address', 'comment'].forEach(key => {
      cont.querySelector(`#chk-field-${key}`)?.addEventListener('change', e => {
        s.fields[key] = e.target.checked;
        this.saveHistory();
      });
    });
  }

  openProductModal(prodId = null) {
    const modal = document.getElementById('store-product-modal');
    if (!modal) return;

    const s = this.project.store;
    let prod = prodId ? s.products.find(x => x.id === prodId) : null;

    document.getElementById('sp-modal-title').textContent = prod ? 'Редактировать товар' : 'Добавить новый товар';
    document.getElementById('sp-name').value = prod ? prod.name : '';
    document.getElementById('sp-price').value = prod ? prod.price : '';
    document.getElementById('sp-old-price').value = prod ? (prod.oldPrice || '') : '';
    document.getElementById('sp-sku').value = prod ? (prod.sku || '') : '';
    document.getElementById('sp-img').value = prod ? (prod.img || '') : '';
    document.getElementById('sp-desc').value = prod ? (prod.desc || '') : '';

    modal.dataset.editingProdId = prodId || '';
    modal.classList.remove('hidden');
  }

  // ─── 9. Настройки сайта & Webhook (Settings UI) ────────────────
  renderSettingsUI() {
    const cont = document.getElementById('tilda-settings-panel');
    if (!cont) return;
    const cfg = this.project.settings;

    cont.innerHTML = `
      <div class="insp-section-title">Главные параметры сайта</div>
      <div class="insp-field">
        <label>Название проекта</label>
        <input type="text" id="cfg-proj-name" value="${escapeHtml(this.project.name || '')}" />
      </div>
      <div class="insp-field">
        <label>Favicon (URL иконки сайта)</label>
        <input type="text" id="cfg-favicon" value="${escapeHtml(cfg.faviconUrl || '')}" placeholder="https://..." />
      </div>
      <div class="insp-field">
        <label>Meta Title по умолчанию</label>
        <input type="text" id="cfg-meta-title" value="${escapeHtml(cfg.metaTitle || '')}" />
      </div>
      <div class="insp-field">
        <label>Meta Description</label>
        <textarea rows="2" id="cfg-meta-desc">${escapeHtml(cfg.metaDesc || '')}</textarea>
      </div>

      <div class="insp-section-title">Превью в соцсетях (OpenGraph)</div>
      <div class="insp-field">
        <label>Изображение для соцсетей (OG Image URL)</label>
        <input type="text" id="cfg-og-img" value="${escapeHtml(cfg.ogImageUrl || '')}" placeholder="https://..." />
      </div>

      <div class="social-share-preview-card" id="social-share-preview">
        <img src="${cfg.ogImageUrl || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80'}" class="social-share-img" id="og-preview-img" alt="OG Image" />
        <div class="social-share-body">
          <div class="social-share-domain">AURORA-WEB.PRO</div>
          <div class="social-share-title" id="og-preview-title">${escapeHtml(cfg.metaTitle || 'AURORA WEB Site')}</div>
          <div class="social-share-desc" id="og-preview-desc">${escapeHtml(cfg.metaDesc || 'Создано в визуальном конструкторе сайтов AURORA WEB')}</div>
        </div>
      </div>

      <div class="insp-section-title">Аналитика</div>
      <div class="insp-field">
        <label>Номер счетчика Яндекс.Метрики</label>
        <input type="text" id="cfg-metrika" value="${escapeHtml(cfg.yandexMetrikaId || '')}" placeholder="98765432" />
      </div>
      <div class="insp-field">
        <label>Google Analytics 4 ID</label>
        <input type="text" id="cfg-ga" value="${escapeHtml(cfg.googleAnalyticsId || '')}" placeholder="G-XXXXXXXXXX" />
      </div>

      <div class="insp-section-title">Прием заявок (Telegram Bot)</div>
      <div class="insp-field">
        <label>Telegram Bot Token</label>
        <input type="text" id="cfg-tg-token" value="${escapeHtml(cfg.telegramToken || '')}" placeholder="123456:ABC-DEF..." />
      </div>
      <div class="insp-field">
        <label>Telegram Chat ID</label>
        <input type="text" id="cfg-tg-chat" value="${escapeHtml(cfg.telegramChatId || '')}" placeholder="-10012345678" />
      </div>

      <button class="topbar-action-btn" id="btn-test-tg-lead" style="width:100%;padding:10px;justify-content:center;background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.4);color:#10b981;margin-bottom:14px;">
        <span class="material-symbols-rounded">send</span>
        <span>⚡ Проверить отправку лида в Telegram</span>
      </button>

      <div class="insp-section-title">Вставка своего кода</div>
      <div class="insp-field">
        <label>HTML/JS код внутри &lt;head&gt;</label>
        <textarea rows="3" id="cfg-head-code" placeholder="&lt;script&gt;...&lt;/script&gt;">${escapeHtml(cfg.headCode || '')}</textarea>
      </div>
      <div class="insp-field">
        <label>HTML/JS код перед закрывающим &lt;/body&gt;</label>
        <textarea rows="3" id="cfg-body-code" placeholder="&lt;script&gt;...&lt;/script&gt;">${escapeHtml(cfg.bodyCode || '')}</textarea>
      </div>
    `;

    cont.querySelector('#cfg-proj-name')?.addEventListener('input', e => {
      this.project.name = e.target.value;
      const tInput = document.getElementById('project-title');
      if (tInput) tInput.value = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-favicon')?.addEventListener('input', e => {
      cfg.faviconUrl = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-meta-title')?.addEventListener('input', e => {
      cfg.metaTitle = e.target.value;
      const preview = cont.querySelector('#og-preview-title');
      if (preview) preview.textContent = e.target.value || 'AURORA WEB Site';
      this.saveHistory();
    });

    cont.querySelector('#cfg-meta-desc')?.addEventListener('input', e => {
      cfg.metaDesc = e.target.value;
      const preview = cont.querySelector('#og-preview-desc');
      if (preview) preview.textContent = e.target.value || 'Создано в визуальном конструкторе сайтов AURORA WEB';
      this.saveHistory();
    });

    cont.querySelector('#cfg-og-img')?.addEventListener('input', e => {
      cfg.ogImageUrl = e.target.value;
      const img = cont.querySelector('#og-preview-img');
      if (img) img.src = e.target.value || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80';
      this.saveHistory();
    });

    cont.querySelector('#cfg-metrika')?.addEventListener('input', e => {
      cfg.yandexMetrikaId = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-ga')?.addEventListener('input', e => {
      cfg.googleAnalyticsId = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-tg-token')?.addEventListener('input', e => {
      cfg.telegramToken = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-tg-chat')?.addEventListener('input', e => {
      cfg.telegramChatId = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-head-code')?.addEventListener('input', e => {
      cfg.headCode = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#cfg-body-code')?.addEventListener('input', e => {
      cfg.bodyCode = e.target.value;
      this.saveHistory();
    });

    cont.querySelector('#btn-test-tg-lead')?.addEventListener('click', async () => {
      const token = (cfg.telegramToken || '').trim();
      const chatId = (cfg.telegramChatId || '').trim();
      if (!token || !chatId) {
        alert('Пожалуйста, заполните Telegram Bot Token и Chat ID перед отправкой!');
        return;
      }
      try {
        const text = `🚀 Тестовая заявка от AURORA WEB!\nСайт: ${this.project.name}\nВремя: ${new Date().toLocaleString()}`;
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
        const data = await res.json();
        if (data.ok) {
          alert('✅ Успешно! Тестовое сообщение доставлено в Telegram.');
        } else {
          alert(`❌ Ошибка Telegram: ${data.description || 'Проверьте токен и ID'}`);
        }
      } catch (err) {
        alert(`❌ Ошибка сети: ${err.message}`);
      }
    });
  }

  // ─── 10. История (Undo/Redo) ──────────────────────────────────
  saveHistory() {
    if (this.historyIdx < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIdx + 1);
    }
    this.history.push(JSON.stringify(this.project));
    if (this.history.length > 50) this.history.shift();
    this.historyIdx = this.history.length - 1;
    this.saveProject();
  }

  undo() {
    if (this.historyIdx > 0) {
      this.historyIdx--;
      this.project = JSON.parse(this.history[this.historyIdx]);
      this.renderArtboard();
      this.renderLayersTree();
      this.renderPagesList();
      this.renderDesignTokensUI();
      this.renderStoreUI();
      this.renderSettingsUI();
      this.renderInspector();
    }
  }

  redo() {
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      this.project = JSON.parse(this.history[this.historyIdx]);
      this.renderArtboard();
      this.renderLayersTree();
      this.renderPagesList();
      this.renderDesignTokensUI();
      this.renderStoreUI();
      this.renderSettingsUI();
      this.renderInspector();
    }
  }

  // ─── 11. Экспорт автономного HTML & ZIP ─────────────────────
  generatePageHtml(page = null, options = {}) {
    const p = page || this.getActivePage();
    const g = this.project.globalStyles;
    const s = this.project.settings;
    const isZip = !!options.isZip;

    const blocksHtml = p.blocks.map(blk => {
      if (blk.isHidden) return '';
      const def = getBlockById(blk.blockDefId);
      if (!def) return '';
      return `<section id="${blk.instanceId}" class="tilda-block">\n${renderBlockHtml(def, blk.content, blk.design)}\n</section>`;
    }).filter(Boolean).join('\n\n');

    const metrikaScript = s.yandexMetrikaId ? `
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript" >
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${s.yandexMetrikaId}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/${s.yandexMetrikaId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    ` : '';

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.metaTitle || s.metaTitle || p.title)}</title>
  <meta name="description" content="${escapeHtml(p.metaDesc || s.metaDesc || '')}">
  ${s.faviconUrl ? `<link rel="icon" href="${escapeHtml(s.faviconUrl)}">` : ''}
  
  <!-- OpenGraph -->
  <meta property="og:title" content="${escapeHtml(p.metaTitle || s.metaTitle || p.title)}">
  <meta property="og:description" content="${escapeHtml(p.metaDesc || s.metaDesc || '')}">
  <meta property="og:image" content="${escapeHtml(s.ogImageUrl || '')}">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@400;600;700;800;900&family=Oswald:wght@500;700&family=Playfair+Display:wght@600;800&family=Roboto:wght@400;500;700&family=Unbounded:wght@600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
  
  ${isZip ? '<link rel="stylesheet" href="css/style.css">' : ''}
  ${s.headCode || ''}
  ${metrikaScript}

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${g.fontBody}', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${g.colorBg};
      color: ${g.colorText};
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${g.fontHeading}', sans-serif;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }
    .t-container { width: 100%; max-width: ${g.maxWidth}; margin: 0 auto; box-sizing: border-box; padding: 0 20px; }
    @media (max-width: 768px) {
      .t-nav-links { display: none !important; }
    }
  </style>
</head>
<body>
${blocksHtml}
${isZip ? '<script src="js/runtime.js"></script>' : ''}
${s.bodyCode || ''}
</body>
</html>`;
  }

  generateStandaloneHtml() {
    return this.generatePageHtml(this.getActivePage(), { isZip: false });
  }

  generateZipCss(customFonts = []) {
    const g = this.project.globalStyles;

    let fontFaceCss = '';
    customFonts.forEach(f => {
      let format = 'truetype';
      const ext = (f.fileName || '').split('.').pop().toLowerCase();
      if (ext === 'woff2') format = 'woff2';
      else if (ext === 'woff') format = 'woff';
      else if (ext === 'otf') format = 'opentype';

      fontFaceCss += `
@font-face {
  font-family: '${f.name}';
  src: url('../fonts/${f.fileName}') format('${format}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;
    });

    return `/* ============================================================
   AURORA WEB — Production Stylesheet
   ============================================================ */

${fontFaceCss}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --aurora-font-head: '${g.fontHeading}', sans-serif;
  --aurora-font-body: '${g.fontBody}', -apple-system, BlinkMacSystemFont, sans-serif;
  --aurora-accent: ${g.colorAccent};
  --aurora-bg: ${g.colorBg};
  --aurora-text: ${g.colorText};
  --aurora-btn-bg: ${g.buttonBg};
  --aurora-btn-radius: ${g.buttonRadius};
  --aurora-max-width: ${g.maxWidth};
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--aurora-font-body);
  background: var(--aurora-bg);
  color: var(--aurora-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--aurora-font-head);
  letter-spacing: -0.02em;
}

img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; }

.t-container {
  width: 100%;
  max-width: var(--aurora-max-width);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0 20px;
}

/* Base Block Components */
.tilda-block {
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.anim-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@media (max-width: 768px) {
  .t-container { padding: 0 16px; }
  .t-nav-links { display: none !important; }
}
`;
  }
}
