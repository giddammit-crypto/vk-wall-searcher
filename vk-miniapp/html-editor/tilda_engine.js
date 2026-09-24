/**
 * tilda_engine.js — Ядро визуального конструктора сайтов Tilda
 * Управляет страницами, структурой блоков, инспектором свойств,
 * синхронизацией слоев (Figma-style) и дизайн-токенами сайта.
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
      name: 'Новый сайт Tilda',
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
      settings: {
        metaTitle: 'Мой новый сайт на Tilda',
        metaDesc: 'Создано в визуальном редакторе Аврора Tilda',
        yandexMetrikaId: '',
        telegramToken: '',
        telegramChatId: ''
      },
      pages: [
        {
          id: 'page_home',
          title: 'Главная страница',
          slug: 'index',
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
      const raw = localStorage.getItem('aurora_tilda_current_project');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.pages && p.pages.length > 0) return p;
      }
    } catch (e) {
      console.warn('Load project error:', e);
    }
    return null;
  }

  saveProject() {
    try {
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

      this.bindInlineEditing(contentEl, blk);
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
      // Открываем панель библиотеки блоков и скроллим
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

  // ─── 3. Библиотека блоков (Палитра) ───────────────────────────
  renderPalette() {
    if (!this.paletteContainer) return;

    let html = `
      <div class="tilda-palette-search-wrap">
        <span class="material-symbols-rounded">search</span>
        <input type="text" id="tilda-palette-search" placeholder="Поиск блоков (обложка, тарифы, форма)..." />
      </div>

      <!-- Быстрый выбор категорий -->
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

    // Фильтрация по чипам категорий
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

    // Поиск по блокам
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

    // Добавление блока по клику
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

    let html = '<div class="tilda-layers-container">';
    page.blocks.forEach(blk => {
      const isSelected = blk.instanceId === this.activeBlockId;
      const def = getBlockById(blk.blockDefId);
      html += `
        <div class="tilda-layer-item ${isSelected ? 'is-selected' : ''}" data-id="${blk.instanceId}" draggable="true">
          <div class="layer-drag-handle">
            <span class="material-symbols-rounded">drag_indicator</span>
          </div>
          <div class="layer-icon">
            <span class="material-symbols-rounded">${def?.icon || 'view_agenda'}</span>
          </div>
          <div class="layer-title" title="${blk.name}">${blk.name}</div>
          <div class="layer-actions">
            <button class="layer-act-btn btn-vis ${blk.isHidden ? 'is-hidden-layer' : ''}" title="${blk.isHidden ? 'Показать' : 'Скрыть'}">
              <span class="material-symbols-rounded">${blk.isHidden ? 'visibility_off' : 'visibility'}</span>
            </button>
            <button class="layer-act-btn btn-del" title="Удалить блок" style="color:#f43f5e;">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.layersList.innerHTML = html;

    this.layersList.querySelectorAll('.tilda-layer-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.layer-act-btn')) return;
        this.selectBlock(item.dataset.id);
        const el = document.getElementById(item.dataset.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      item.querySelector('.btn-vis')?.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleBlockVisibility(item.dataset.id);
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
          <span>Свойства страницы</span>
        </div>
      </div>
      <div class="tilda-inspector-body">
        <div class="insp-section-title">Параметры страницы</div>
        <div class="insp-field">
          <label>Название страницы</label>
          <input type="text" id="page-title-input" value="${escapeHtml(page.title)}" />
        </div>
        <div class="insp-field">
          <label>URL адрес (slug)</label>
          <input type="text" id="page-slug-input" value="${escapeHtml(page.slug)}" />
        </div>
        <div class="insp-field">
          <label>Блоков на странице</label>
          <div style="font-size:13px;color:#94a3b8;font-weight:600;">${page.blocks.length} активных блоков</div>
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

  // ─── 6. Дизайн-система и Шрифты ───────────────────────────────
  renderDesignTokensUI() {
    const cont = document.getElementById('tilda-theme-panel');
    if (!cont) return;
    const g = this.project.globalStyles;

    cont.innerHTML = `
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
        </select>
      </div>

      <div class="insp-field">
        <label>Основной шрифт текста</label>
        <select id="theme-font-body">
          <option value="Inter" ${g.fontBody === 'Inter' ? 'selected' : ''}>Inter (Рекомендуется)</option>
          <option value="Roboto" ${g.fontBody === 'Roboto' ? 'selected' : ''}>Roboto</option>
          <option value="Open Sans" ${g.fontBody === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
          <option value="Montserrat" ${g.fontBody === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
        </select>
      </div>

      <!-- Кнопка загрузки кастомных шрифтов -->
      <button class="topbar-action-btn" id="btn-open-ofont-theme" style="width:100%;margin-top:8px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(13,153,255,0.12);border-color:#0d99ff;color:#0d99ff;">
        <span class="material-symbols-rounded">font_download</span>
        <span>+ Загрузить шрифт с ofont.ru (.ttf/.woff)</span>
      </button>

      <div class="insp-section-title" style="margin-top:24px;">Цвета бренда</div>
      <div class="insp-field">
        <label>Основной акцентный цвет</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" id="theme-accent-color" value="${g.colorAccent}" />
          <input type="text" id="theme-accent-color-txt" value="${g.colorAccent}" style="flex:1;" />
        </div>
      </div>
      <div class="insp-field">
        <label>Скругление кнопок</label>
        <select id="theme-btn-radius">
          <option value="0px" ${g.buttonRadius === '0px' ? 'selected' : ''}>Прямые углы (0px)</option>
          <option value="6px" ${g.buttonRadius === '6px' ? 'selected' : ''}>Легкое скругление (6px)</option>
          <option value="12px" ${g.buttonRadius === '12px' ? 'selected' : ''}>Скругленные (12px)</option>
          <option value="9999px" ${g.buttonRadius === '9999px' ? 'selected' : ''}>Овальные (Pill)</option>
        </select>
      </div>
    `;

    cont.querySelector('#theme-font-head')?.addEventListener('change', e => {
      g.fontHeading = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });
    cont.querySelector('#theme-font-body')?.addEventListener('change', e => {
      g.fontBody = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });
    cont.querySelector('#theme-accent-color')?.addEventListener('input', e => {
      g.colorAccent = e.target.value;
      g.buttonBg = e.target.value;
      cont.querySelector('#theme-accent-color-txt').value = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });
    cont.querySelector('#theme-btn-radius')?.addEventListener('change', e => {
      g.buttonRadius = e.target.value;
      this.applyGlobalStyles();
      this.saveHistory();
    });
    cont.querySelector('#btn-open-ofont-theme')?.addEventListener('click', () => {
      window.openOfontModal?.();
    });
  }

  applyGlobalStyles() {
    const g = this.project.globalStyles;
    document.documentElement.style.setProperty('--tilda-font-head', `'${g.fontHeading}', sans-serif`);
    document.documentElement.style.setProperty('--tilda-font-body', `'${g.fontBody}', sans-serif`);
    document.documentElement.style.setProperty('--tilda-accent', g.colorAccent);
    this.renderArtboard();
  }

  renderPagesList() {
    const listEl = document.getElementById('tilda-pages-list');
    if (!listEl) return;

    let html = '';
    this.project.pages.forEach(p => {
      const isActive = p.id === this.project.activePageId;
      html += `
        <div class="tilda-page-item ${isActive ? 'is-active' : ''}" data-page-id="${p.id}">
          <span class="material-symbols-rounded">article</span>
          <div class="page-item-info">
            <div class="page-item-title">${p.title}</div>
            <div class="page-item-slug">/${p.slug}</div>
          </div>
          ${this.project.pages.length > 1 ? `
            <button class="page-del-btn" title="Удалить страницу" data-del-page="${p.id}">
              <span class="material-symbols-rounded">close</span>
            </button>
          ` : ''}
        </div>
      `;
    });

    listEl.innerHTML = html;

    listEl.querySelectorAll('.tilda-page-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.page-del-btn')) return;
        this.switchPage(item.dataset.pageId);
      });
    });

    listEl.querySelectorAll('[data-del-page]').forEach(b => {
      b.addEventListener('click', () => {
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

  addPage(title = 'Новая страница', slug = '') {
    const newPage = {
      id: 'page_' + Date.now(),
      title,
      slug: slug || 'page-' + (this.project.pages.length + 1),
      blocks: [
        this.createBlockInstance('menu-1'),
        this.createBlockInstance('cover-1'),
        this.createBlockInstance('footer-1')
      ]
    };
    this.project.pages.push(newPage);
    this.switchPage(newPage.id);
    this.saveHistory();
  }

  deletePage(pageId) {
    if (this.project.pages.length <= 1) return;
    if (!confirm('Удалить страницу?')) return;
    this.project.pages = this.project.pages.filter(p => p.id !== pageId);
    if (this.project.activePageId === pageId) {
      this.project.activePageId = this.project.pages[0].id;
    }
    this.renderPagesList();
    this.renderArtboard();
    this.renderLayersTree();
    this.saveHistory();
  }

  // ─── 7. История (Undo/Redo) ───────────────────────────────────
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
      this.renderInspector();
    }
  }

  // ─── 8. Экспорт чистого автономного HTML ──────────────────────
  generateStandaloneHtml() {
    const page = this.getActivePage();
    const g = this.project.globalStyles;

    const blocksHtml = page.blocks.map(blk => {
      if (blk.isHidden) return '';
      const def = getBlockById(blk.blockDefId);
      if (!def) return '';
      return `<section id="${blk.instanceId}" class="tilda-block">\n${renderBlockHtml(def, blk.content, blk.design)}\n</section>`;
    }).filter(Boolean).join('\n\n');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(this.project.settings.metaTitle || page.title)}</title>
  <meta name="description" content="${escapeHtml(this.project.settings.metaDesc || '')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@400;600;700;800;900&family=Oswald:wght@500;700&family=Playfair+Display:wght@600;800&family=Roboto:wght@400;500;700&family=Unbounded:wght@600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
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
    .t-container { width: 100%; max-width: ${g.maxWidth}; margin: 0 auto; box-sizing: border-box; }
    @media (max-width: 768px) {
      .t-nav-links { display: none !important; }
    }
  </style>
</head>
<body>
${blocksHtml}
</body>
</html>`;
  }
}
