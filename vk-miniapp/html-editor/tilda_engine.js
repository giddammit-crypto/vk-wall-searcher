/**
 * tilda_engine.js — Core Tilda Page Builder & Inspector Engine
 * Powers multi-page site management, Tilda block instances,
 * Figma-style 3-pane layout, layer tree sync, and inspector controls.
 */

import { TILDA_CATEGORIES, TILDA_BLOCKS, getBlockById, renderBlockHtml, extractBlockDefaultData } from './tilda_blocks.js';
import { ZeroBlockEditor, ZeroBlock } from './zero_block.js';

export class TildaEngine {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('tilda-artboard');
    this.layersList = options.layersList || document.getElementById('tilda-layers-list');
    this.propsPanel = options.propsPanel || document.getElementById('tilda-props-panel');
    this.paletteContainer = options.paletteContainer || document.getElementById('tilda-blocks-palette');
    
    this.activeBreakpoint = 'desktop'; // desktop (1200), laptop (960), tablet (768), mobile_land (480), mobile_port (320)
    this.activeBlockId = null;
    this.activeTab = 'library'; // library, layers, pages, theme, store, settings
    this.activeInspectorTab = 'content'; // content, design, anim, resp

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
        colorBg: '#ffffff',
        colorText: '#1e293b',
        buttonBg: '#0d99ff',
        buttonText: '#ffffff',
        buttonRadius: '8px',
        maxWidth: '1200px'
      },
      settings: {
        metaTitle: 'Мой новый сайт на Tilda',
        metaDesc: 'Создано в визуальном редакторе Аврора Tilda',
        favicon: '',
        ogImage: '',
        yandexMetrikaId: '',
        googleAnalyticsId: '',
        telegramToken: '',
        telegramChatId: '',
        webhookUrl: ''
      },
      pages: [
        {
          id: 'page_home',
          title: 'Главная страница',
          slug: 'index',
          blocks: [
            this.createBlockInstance('me01-nav'),
            this.createBlockInstance('cr01-hero'),
            this.createBlockInstance('ab02-values'),
            this.createBlockInstance('fe01-cards'),
            this.createBlockInstance('pr01-cards'),
            this.createBlockInstance('fq01-accordion'),
            this.createBlockInstance('bf02-form'),
            this.createBlockInstance('ft01-cols')
          ]
        }
      ]
    };
  }

  loadProject() {
    try {
      const raw = localStorage.getItem('aurora_tilda_current_project');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveProject() {
    try {
      localStorage.setItem('aurora_tilda_current_project', JSON.stringify(this.project));
      this.updateSaveIndicator();
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
      cat: def.cat,
      isZero: !!def.isZero,
      zeroData: def.isZero ? new ZeroBlock() : null,
      isHidden: false,
      isLocked: false,
      content: defaultData.content,
      design: defaultData.design,
      animation: {
        type: 'none', // fade-in, slide-up, zoom-in, parallax
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

  // ─── 1. Artboard & Canvas Rendering ───────────────────────────
  renderArtboard() {
    if (!this.container) return;
    const page = this.getActivePage();
    if (!page) return;

    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = `tilda-page-canvas is-${this.activeBreakpoint}`;
    wrapper.style.maxWidth = this.getBreakpointWidth();

    page.blocks.forEach((blk, idx) => {
      if (blk.isHidden) return;

      // Add Plus Button before block
      wrapper.appendChild(this.createAddBlockBar(idx));

      // Block Container
      const blkEl = document.createElement('section');
      blkEl.className = `tilda-block-wrapper ${blk.instanceId === this.activeBlockId ? 'is-selected' : ''}`;
      blkEl.id = blk.instanceId;
      blkEl.dataset.blockId = blk.instanceId;

      // Apply Design Styles
      this.applyBlockStyles(blkEl, blk);

      // Block Action Toolbar on Hover
      blkEl.appendChild(this.createBlockActionBar(blk, idx));

      // Block HTML Content
      const contentEl = document.createElement('div');
      contentEl.className = 'tilda-block-inner';
      const def = getBlockById(blk.blockDefId);
      if (def) {
        contentEl.innerHTML = renderBlockHtml(def, blk.content, blk.design);
      } else {
        contentEl.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Блок ${blk.name}</div>`;
      }
      blkEl.appendChild(contentEl);

      // Block Selection click
      blkEl.addEventListener('click', e => {
        // Don't intercept clicks on buttons or links inside block when selecting
        if (e.target.closest('.tilda-block-action-bar') || e.target.closest('.tilda-add-block-bar')) return;
        this.selectBlock(blk.instanceId);
      });

      // Enable inline text editing on double click
      this.bindInlineEditing(contentEl, blk);

      wrapper.appendChild(blkEl);
    });

    // Add Final Plus Button at page bottom
    wrapper.appendChild(this.createAddBlockBar(page.blocks.length, true));

    this.container.appendChild(wrapper);

    // Initialize interactive runtime on canvas
    if (window.TildaRuntime?.init) {
      window.TildaRuntime.init();
    }
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
        <button class="blk-btn btn-up" title="Переместить вверх" ${idx === 0 ? 'disabled' : ''}>
          <span class="material-symbols-rounded">arrow_upward</span>
        </button>
        <button class="blk-btn btn-down" title="Переместить вниз" ${idx === this.getActivePage().blocks.length - 1 ? 'disabled' : ''}>
          <span class="material-symbols-rounded">arrow_downward</span>
        </button>
        <button class="blk-btn btn-duplicate" title="Дублировать блок">
          <span class="material-symbols-rounded">content_copy</span>
        </button>
        <button class="blk-btn btn-delete" title="Удалить блок">
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
      <button class="tilda-add-block-btn" type="button" title="Вставить блок сюда">
        <span class="material-symbols-rounded">add</span>
        <span>${isBottom ? 'Добавить блок' : ''}</span>
      </button>
    `;
    bar.querySelector('button')?.addEventListener('click', () => {
      this.openInsertBlockModal(insertIdx);
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

  // ─── 2. Block Operations ──────────────────────────────────────
  addBlock(blockDefId, insertIndex = -1) {
    const page = this.getActivePage();
    const instance = this.createBlockInstance(blockDefId);

    if (insertIndex >= 0 && insertIndex <= page.blocks.length) {
      page.blocks.splice(insertIndex, 0, instance);
    } else {
      page.blocks.push(instance);
    }

    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
    this.selectBlock(instance.instanceId);

    // Scroll to new block
    setTimeout(() => {
      const el = document.getElementById(instance.instanceId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  deleteBlock(instanceId) {
    const page = this.getActivePage();
    page.blocks = page.blocks.filter(b => b.instanceId !== instanceId);
    if (this.activeBlockId === instanceId) {
      this.activeBlockId = null;
      this.renderInspector();
    }
    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
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
      this.renderLayersTree();
      this.saveHistory();
    }
  }

  // ─── 3. Palette & Block Library ───────────────────────────────
  renderPalette() {
    if (!this.paletteContainer) return;
    let html = `
      <div class="tilda-palette-search-wrap">
        <span class="material-symbols-rounded">search</span>
        <input type="text" id="tilda-palette-search" placeholder="Поиск блоков (обложка, форма, тарифы)..." />
      </div>
      <div class="tilda-palette-cats">
    `;

    TILDA_CATEGORIES.forEach(cat => {
      const blocks = TILDA_BLOCKS.filter(b => b.cat === cat.id);
      if (blocks.length === 0) return;

      html += `
        <div class="tilda-cat-group" data-cat="${cat.id}">
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
            <button class="tilda-card-add-btn" type="button" title="Добавить блок">
              <span class="material-symbols-rounded">add</span>
            </button>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += `</div>`;
    this.paletteContainer.innerHTML = html;

    // Palette Search Filter
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

    // Add Block Click
    this.paletteContainer.querySelectorAll('.tilda-palette-card').forEach(card => {
      card.addEventListener('click', () => {
        const defId = card.dataset.blockDef;
        this.addBlock(defId);
      });
    });
  }

  openInsertBlockModal(insertIdx) {
    const modal = document.getElementById('tilda-insert-modal');
    if (!modal) {
      this.addBlock(TILDA_BLOCKS[0].id, insertIdx);
      return;
    }
    modal.dataset.insertIdx = insertIdx;
    modal.classList.remove('hidden');
  }

  // ─── 4. Layers Tree (Figma Layers) ────────────────────────────
  renderLayersTree() {
    if (!this.layersList) return;
    const page = this.getActivePage();
    if (!page) return;

    if (page.blocks.length === 0) {
      this.layersList.innerHTML = `<div style="padding:24px;text-align:center;color:#64748b;font-size:12px;">Блоков пока нет. Выберите блок из библиотеки слева.</div>`;
      return;
    }

    let html = '<div class="tilda-layers-container">';
    page.blocks.forEach((blk, idx) => {
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
            <button class="layer-act-btn btn-del" title="Удалить">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.layersList.innerHTML = html;

    // Layer Click Select
    this.layersList.querySelectorAll('.tilda-layer-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.layer-act-btn')) return;
        this.selectBlock(item.dataset.id);
        const el = document.getElementById(item.dataset.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      item.querySelector('.btn-vis')?.addEventListener('click', () => {
        this.toggleBlockVisibility(item.dataset.id);
      });

      item.querySelector('.btn-del')?.addEventListener('click', () => {
        this.deleteBlock(item.dataset.id);
      });
    });

    // Drag & Drop reordering in layers
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

  // ─── 5. Inspector (Content, Design, Animation, Responsive) ────
  selectBlock(instanceId, preferredTab = null) {
    this.activeBlockId = instanceId;
    if (preferredTab) this.activeInspectorTab = preferredTab;

    // Highlight on canvas
    document.querySelectorAll('.tilda-block-wrapper').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.blockId === instanceId);
    });

    // Highlight in layers
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
          <button class="insp-tab ${this.activeInspectorTab === 'resp' ? 'is-active' : ''}" data-tab="resp">Адаптив</button>
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
    } else if (this.activeInspectorTab === 'resp') {
      html += this.renderResponsiveFields(blk);
    }

    html += `</div>`;
    this.propsPanel.innerHTML = html;

    // Bind tab switching
    this.propsPanel.querySelectorAll('.insp-tab').forEach(t => {
      t.addEventListener('click', () => {
        this.activeInspectorTab = t.dataset.tab;
        this.renderInspector();
      });
    });

    // Bind inputs to block data
    this.bindInspectorInputs(blk);
  }

  renderContentFields(blk, def) {
    const c = blk.content || {};
    let html = '<div class="insp-section-title">Тексты и элементы</div>';

    // Standard fields based on content keys
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
    if (c.badge !== undefined) {
      html += `
        <div class="insp-field">
          <label>Бейдж / Надзаголовок</label>
          <input type="text" data-content-key="badge" value="${escapeHtml(c.badge || '')}" />
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
    if (c.imageUrl !== undefined) {
      html += `
        <div class="insp-field">
          <label>Изображение (URL)</label>
          <input type="text" data-content-key="imageUrl" value="${escapeHtml(c.imageUrl || '')}" />
        </div>
      `;
    }

    return html;
  }

  renderDesignFields(blk, def) {
    const d = blk.design || {};
    return `
      <div class="insp-section-title">Фон и отступы</div>
      <div class="insp-field">
        <label>Цвет фона</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="bgColor" value="${d.bgColor || '#ffffff'}" />
          <input type="text" data-design-key="bgColor" value="${d.bgColor || '#ffffff'}" style="flex:1;" />
        </div>
      </div>
      <div class="insp-field">
        <label>Фоновое изображение (URL)</label>
        <input type="text" data-design-key="bgImage" value="${d.bgImage || ''}" placeholder="https://..." />
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
      <div class="insp-field">
        <label>Цвет текста</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="textColor" value="${d.textColor || '#1e293b'}" />
          <input type="text" data-design-key="textColor" value="${d.textColor || '#1e293b'}" style="flex:1;" />
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
          <option value="parallax" ${a.type === 'parallax' ? 'selected' : ''}>Параллакс фона</option>
        </select>
      </div>
    `;
  }

  renderResponsiveFields(blk) {
    const r = blk.responsive || {};
    return `
      <div class="insp-section-title">Отображение на устройствах</div>
      <div class="insp-checkbox">
        <input type="checkbox" id="hide-desktop" data-resp-key="hideOnDesktop" ${r.hideOnDesktop ? 'checked' : ''} />
        <label for="hide-desktop">Скрыть на ПК (> 960px)</label>
      </div>
      <div class="insp-checkbox">
        <input type="checkbox" id="hide-tablet" data-resp-key="hideOnTablet" ${r.hideOnTablet ? 'checked' : ''} />
        <label for="hide-tablet">Скрыть на планшетах (768px - 960px)</label>
      </div>
      <div class="insp-checkbox">
        <input type="checkbox" id="hide-mobile" data-resp-key="hideOnMobile" ${r.hideOnMobile ? 'checked' : ''} />
        <label for="hide-mobile">Скрыть на телефонах (< 768px)</label>
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
        <div class="insp-section-title">Настройки страницы</div>
        <div class="insp-field">
          <label>Название страницы</label>
          <input type="text" id="page-title-input" value="${escapeHtml(page.title)}" />
        </div>
        <div class="insp-field">
          <label>URL страницы (slug)</label>
          <input type="text" id="page-slug-input" value="${escapeHtml(page.slug)}" />
        </div>
        <div class="insp-field">
          <label>Количество блоков</label>
          <div style="font-size:13px;color:#94a3b8;">${page.blocks.length} активных блоков</div>
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

  // ─── 6. Multi-page & Design Tokens ────────────────────────────
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
        this.createBlockInstance('me01-nav'),
        this.createBlockInstance('cr01-hero'),
        this.createBlockInstance('ft01-cols')
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

  renderDesignTokensUI() {
    const cont = document.getElementById('tilda-theme-panel');
    if (!cont) return;
    const g = this.project.globalStyles;

    cont.innerHTML = `
      <div class="insp-section-title">Типографика сайта</div>
      <div class="insp-field">
        <label>Шрифт заголовков</label>
        <select id="theme-font-head">
          <option value="Montserrat" ${g.fontHeading === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
          <option value="Unbounded" ${g.fontHeading === 'Unbounded' ? 'selected' : ''}>Unbounded (Modern)</option>
          <option value="Playfair Display" ${g.fontHeading === 'Playfair Display' ? 'selected' : ''}>Playfair Display (Serif)</option>
          <option value="Caveat" ${g.fontHeading === 'Caveat' ? 'selected' : ''}>Caveat (Handwritten)</option>
          <option value="Oswald" ${g.fontHeading === 'Oswald' ? 'selected' : ''}>Oswald (Bold Condensed)</option>
        </select>
      </div>
      <div class="insp-field">
        <label>Основной шрифт текста</label>
        <select id="theme-font-body">
          <option value="Inter" ${g.fontBody === 'Inter' ? 'selected' : ''}>Inter</option>
          <option value="Roboto" ${g.fontBody === 'Roboto' ? 'selected' : ''}>Roboto</option>
          <option value="Open Sans" ${g.fontBody === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
        </select>
      </div>

      <div class="insp-section-title">Цвета бренда</div>
      <div class="insp-field">
        <label>Основной цвет кнопок и акцентов</label>
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

    cont.querySelector('#theme-accent-color')?.addEventListener('input', e => {
      g.colorAccent = e.target.value;
      g.buttonBg = e.target.value;
      this.saveHistory();
    });
    cont.querySelector('#theme-btn-radius')?.addEventListener('change', e => {
      g.buttonRadius = e.target.value;
      this.saveHistory();
    });
  }

  // ─── 7. History & Undo/Redo ───────────────────────────────────
  saveHistory() {
    if (this.historyIdx < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIdx + 1);
    }
    this.history.push(JSON.stringify(this.project));
    if (this.history.length > 30) this.history.shift();
    this.historyIdx = this.history.length - 1;

    this.saveProject();
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIdx > 0) {
      this.historyIdx--;
      this.project = JSON.parse(this.history[this.historyIdx]);
      this.renderArtboard();
      this.renderLayersTree();
      this.renderInspector();
      this.updateUndoRedoButtons();
    }
  }

  redo() {
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      this.project = JSON.parse(this.history[this.historyIdx]);
      this.renderArtboard();
      this.renderLayersTree();
      this.renderInspector();
      this.updateUndoRedoButtons();
    }
  }

  updateUndoRedoButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = this.historyIdx <= 0;
    if (btnRedo) btnRedo.disabled = this.historyIdx >= this.history.length - 1;
  }

  updateSaveIndicator() {
    const el = document.getElementById('tilda-save-indicator');
    if (el) {
      el.textContent = 'Сохранено';
      el.classList.add('is-saved');
      setTimeout(() => el.classList.remove('is-saved'), 2000);
    }
  }

  // ─── 8. Export Full HTML Standalone ───────────────────────────
  generateStandaloneHtml(pageId = null) {
    const page = pageId ? this.project.pages.find(p => p.id === pageId) : this.getActivePage();
    const g = this.project.globalStyles;

    let blocksHtml = '';
    page.blocks.forEach(blk => {
      if (blk.isHidden) return;
      const def = getBlockById(blk.blockDefId);
      if (!def) return;
      const innerHtml = renderBlockHtml(def, blk.content, blk.design);
      blocksHtml += `\n<!-- BLOCK: ${blk.name} -->\n<section id="${blk.instanceId}" class="tilda-block" style="${this.getBlockStyleString(blk)}">\n${innerHtml}\n</section>\n`;
    });

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(this.project.settings.metaDesc)}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(g.fontHeading)}:wght@600;700;800&family=${encodeURIComponent(g.fontBody)}:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">

  <style>
    :root {
      --tilda-font-head: '${g.fontHeading}', sans-serif;
      --tilda-font-body: '${g.fontBody}', sans-serif;
      --tilda-accent: ${g.colorAccent};
      --tilda-btn-radius: ${g.buttonRadius};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--tilda-font-body);
      color: ${g.colorText};
      background: ${g.colorBg};
      line-height: 1.6;
      overflow-x: hidden;
    }
    h1, h2, h3, h4 { font-family: var(--tilda-font-head); }
    img { max-width: 100%; height: auto; display: block; }
    a { text-decoration: none; color: inherit; }
    .tilda-block { width: 100%; position: relative; }

    /* Lightbox & Runtime styles */
    .tilda-lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: none; align-items: center; justify-content: center; }
    .tilda-lightbox-overlay.is-open { display: flex; }
    .tilda-lightbox-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
    .tilda-lightbox-close { position: absolute; top: 20px; right: 24px; color: #fff; font-size: 32px; background: none; border: none; cursor: pointer; }
    
    /* Cart Drawer Modal */
    .tilda-cart-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: none; justify-content: flex-end; }
    .tilda-cart-modal-overlay.is-open { display: flex; }
    .tilda-cart-dialog { width: 100%; max-width: 420px; height: 100%; background: #0f172a; color: #fff; padding: 24px; display: flex; flex-direction: column; }
    .tilda-cart-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; }
    .tilda-cart-body { flex: 1; overflow-y: auto; padding: 16px 0; }
    .tilda-cart-row { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .tilda-cart-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
    .tilda-cart-info { flex: 1; }
    .tilda-cart-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
    .tilda-cart-checkout-btn { width: 100%; padding: 14px; background: var(--tilda-accent); color: #fff; border: none; border-radius: var(--tilda-btn-radius); font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>

${blocksHtml}

<!-- Tilda Runtime Scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
${this.getRuntimeScriptCode()}
</script>
</body>
</html>`;
  }

  getBlockStyleString(blk) {
    const d = blk.design || {};
    let s = '';
    if (d.bgColor) s += `background-color:${d.bgColor};`;
    if (d.bgImage) s += `background-image:url(${d.bgImage});background-size:cover;background-position:center;`;
    if (d.paddingTop) s += `padding-top:${d.paddingTop};`;
    if (d.paddingBottom) s += `padding-bottom:${d.paddingBottom};`;
    if (d.textColor) s += `color:${d.textColor};`;
    return s;
  }

  getRuntimeScriptCode() {
    return `
      // Embedded Tilda Runtime
      document.querySelectorAll('[data-tilda-accordion] .tilda-acc-head').forEach(h => {
        h.addEventListener('click', () => {
          const item = h.closest('.tilda-acc-item');
          const body = item.querySelector('.tilda-acc-body');
          if (item.classList.contains('is-active')) {
            item.classList.remove('is-active');
            body.style.maxHeight = null;
          } else {
            item.classList.add('is-active');
            body.style.maxHeight = body.scrollHeight + 'px';
          }
        });
      });
      document.querySelectorAll('[data-tilda-burger]').forEach(b => {
        b.addEventListener('click', () => {
          document.querySelector('.tilda-nav-menu')?.classList.toggle('is-open');
        });
      });
    `;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
