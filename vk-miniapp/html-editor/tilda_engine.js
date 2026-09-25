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
    this.activeCustomElementId = null;
    this.activeCategory = 'all';
    this.activeInspectorTab = 'content'; // content | design | anim | resp
    this.isGridSnapping = localStorage.getItem('aurora_grid_snapping') !== 'false';

    this.project = this.loadProject() || this.createDefaultProject();
    this.history = [];
    this.historyIdx = -1;

    this.init();
  }

  toggleGridSnapping() {
    this.isGridSnapping = !this.isGridSnapping;
    localStorage.setItem('aurora_grid_snapping', this.isGridSnapping ? 'true' : 'false');
    this.updateGridSnappingUI();
    this.renderArtboard();
    return this.isGridSnapping;
  }

  updateGridSnappingUI() {
    const isAct = this.isGridSnapping;
    document.querySelectorAll('#btn-toggle-grid, #tool-toggle-grid, #btn-zoom-grid').forEach(btn => {
      btn.classList.toggle('is-active', isAct);
    });
    const artboard = document.getElementById('tilda-artboard');
    if (artboard) artboard.classList.toggle('has-grid-overlay', isAct);
  }

  snapCoord(val, step = 8) {
    if (!this.isGridSnapping) return Math.round(val);
    return Math.round(val / step) * step;
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

  getPageAnchorsList() {
    const page = this.getActivePage();
    if (!page) return [];
    const list = [];
    page.blocks.forEach((b, i) => {
      const anchor = b.anchor || b.instanceId;
      const def = getBlockById(b.blockDefId);
      list.push({
        value: '#' + anchor,
        label: `${i + 1}. [${def?.name || b.name}] #${anchor}`
      });
    });
    return list;
  }

  createBlockInstance(blockDefId) {
    const def = getBlockById(blockDefId) || TILDA_BLOCKS[0];
    const defaultData = extractBlockDefaultData(def);
    return {
      instanceId: 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      anchor: '',
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
    this.initFloatingTextToolbar();
    this.saveHistory();
  }

  // ─── 1. Отрисовка холста (Artboard) ───────────────────────────
  renderArtboard() {
    if (!this.container) return;
    const page = this.getActivePage();
    if (!page) return;

    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = `tilda-page-canvas is-${this.activeBreakpoint} ${this.isGridSnapping ? 'has-grid-overlay' : ''}`;
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = this.getBreakpointWidth();
    wrapper.style.position = 'relative';

    // 12-Column Grid Lines Overlay if snapping is enabled
    if (this.isGridSnapping) {
      const gridOverlay = document.createElement('div');
      gridOverlay.className = 'tilda-canvas-grid-overlay';
      gridOverlay.style.cssText = 'position:absolute;inset:0;display:grid;grid-template-columns:repeat(12, 1fr);gap:20px;padding:0 24px;pointer-events:none;z-index:90;opacity:0.04;';
      for (let i = 0; i < 12; i++) {
        const col = document.createElement('div');
        col.style.cssText = 'background:#0d99ff;height:100%;';
        gridOverlay.appendChild(col);
      }
      wrapper.appendChild(gridOverlay);
    }

    page.blocks.forEach((blk, idx) => {
      if (blk.isHidden) return;

      // Кнопка вставки блока перед текущим
      wrapper.appendChild(this.createAddBlockBar(idx));

      // Контейнер блока
      const blkEl = document.createElement('section');
      blkEl.className = `tilda-block-wrapper ${blk.instanceId === this.activeBlockId ? 'is-selected' : ''}`;
      blkEl.id = blk.anchor || blk.instanceId;
      blkEl.dataset.blockId = blk.instanceId;
      if (blk.anchor) blkEl.dataset.anchor = blk.anchor;

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

      // Resizer высоты блока снизу
      const heightResizer = document.createElement('div');
      heightResizer.className = 'block-height-resizer';
      heightResizer.title = 'Потяните для изменения высоты блока';
      this.bindBlockHeightResize(heightResizer, blk, blkEl);
      blkEl.appendChild(heightResizer);

      // Клик для выбора блока
      blkEl.addEventListener('click', e => {
        if (e.target.closest('.tilda-block-action-bar') || e.target.closest('.tilda-add-block-bar') || e.target.closest('.block-height-resizer')) return;
        this.selectBlock(blk.instanceId);
      });

      if (!blk.isLocked) {
        this.bindInlineEditing(contentEl, blk);
        this.bindBlockCustomElements(blkEl, blk);
      }
      wrapper.appendChild(blkEl);
    });

    // Финальная кнопка добавления внизу страницы
    wrapper.appendChild(this.createAddBlockBar(page.blocks.length, true));

    this.container.appendChild(wrapper);

    // Re-initialize lightbox for live preview
    if (window.AuroraLightbox) {
      setTimeout(() => window.AuroraLightbox.init(), 100);
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
    const bg = d.bgColor || d.background || '';
    if (bg) {
      el.style.backgroundColor = bg;
      const innerBlock = el.querySelector('.t-block') || el.querySelector('.tilda-block-inner');
      if (innerBlock) {
        innerBlock.style.backgroundColor = bg;
        innerBlock.style.background = bg;
      }
    }
    if (d.bgImage) {
      el.style.backgroundImage = `url(${d.bgImage})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      const innerBlock = el.querySelector('.t-block');
      if (innerBlock) {
        innerBlock.style.backgroundImage = `url(${d.bgImage})`;
        innerBlock.style.backgroundSize = 'cover';
        innerBlock.style.backgroundPosition = 'center';
      }
    }
    if (d.paddingTop) {
      el.style.paddingTop = d.paddingTop;
      const innerBlock = el.querySelector('.t-block');
      if (innerBlock) innerBlock.style.paddingTop = d.paddingTop;
    }
    if (d.paddingBottom) {
      el.style.paddingBottom = d.paddingBottom;
      const innerBlock = el.querySelector('.t-block');
      if (innerBlock) innerBlock.style.paddingBottom = d.paddingBottom;
    }
    if (d.textColor) {
      el.style.color = d.textColor;
      const innerBlock = el.querySelector('.t-block') || el.querySelector('.tilda-block-inner');
      if (innerBlock) {
        innerBlock.style.color = d.textColor;
        innerBlock.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, .t-feature-title, .t-card-name, .t-feature-desc').forEach(textEl => {
          textEl.style.color = d.textColor;
        });
      }
    }
    if (d.accentColor) {
      const innerBlock = el.querySelector('.t-block') || el.querySelector('.tilda-block-inner');
      if (innerBlock) {
        innerBlock.querySelectorAll('.t-btn, button[type="submit"], .t-card-btn').forEach(btn => {
          btn.style.backgroundColor = d.accentColor;
        });
      }
    }

    // Scroll Animation Configuration
    if (blk.animation && blk.animation.type && blk.animation.type !== 'none') {
      el.dataset.tildaAnim = blk.animation.type;
      el.dataset.animDelay = blk.animation.delay || 0;
      el.dataset.animDuration = blk.animation.duration || 0.7;
      el.style.transitionDelay = `${blk.animation.delay || 0}s`;
      el.style.transitionDuration = `${blk.animation.duration || 0.7}s`;
      el.classList.add('tilda-animated-in');
    } else {
      delete el.dataset.tildaAnim;
      el.classList.remove('tilda-animated-in', 'anim-fade-in', 'anim-slide-up', 'anim-slide-down', 'anim-slide-left', 'anim-slide-right', 'anim-zoom-in', 'anim-flip-up', 'anim-bounce');
    }
  }

  bindBlockHeightResize(handle, blk, blkEl) {
    handle.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      const startH = blkEl.offsetHeight;

      const onMouseMove = ev => {
        const dy = ev.clientY - startY;
        let newH = startH + dy;
        if (this.isGridSnapping) newH = this.snapCoord(newH, 10);
        newH = Math.max(120, newH);

        blk.design.height = `${newH}px`;
        blk.design.paddingBottom = `${Math.max(20, Math.round(newH / 6))}px`;
        blkEl.style.minHeight = `${newH}px`;
        const innerBlock = blkEl.querySelector('.t-block');
        if (innerBlock) innerBlock.style.minHeight = `${newH}px`;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        this.saveHistory();
        this.renderInspector();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp, { once: true });
    });
  }

  createBlockActionBar(blk, idx) {
    const bar = document.createElement('div');
    bar.className = 'tilda-block-action-bar';
    bar.innerHTML = `
      <div class="blk-action-title">
        <span>${escapeHtml(blk.name)}</span>
        ${blk.anchor ? `<span class="blk-anchor-badge" title="Якорная ссылка на блок">#${escapeHtml(blk.anchor)}</span>` : ''}
      </div>
      <div class="blk-action-btns">
        <button class="blk-btn btn-content" title="Редактировать контент и ссылки">
          <span class="material-symbols-rounded">edit_note</span>
          <span>Контент</span>
        </button>
        <button class="blk-btn btn-settings" title="Настройки дизайна">
          <span class="material-symbols-rounded">tune</span>
          <span>Настройки</span>
        </button>
        <button class="blk-btn btn-zero" title="${blk.isZero || blk.blockDefId === 'zero-1' ? 'Редактировать Zero Block' : 'Конвертировать в Zero Block'}" style="color:#0d99ff;font-weight:${blk.isZero || blk.blockDefId === 'zero-1' ? '700' : 'normal'};">
          <span class="material-symbols-rounded">bolt</span>
          <span>${blk.isZero || blk.blockDefId === 'zero-1' ? 'Zero Редактор' : 'В Zero'}</span>
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
    bar.querySelector('.btn-zero')?.addEventListener('click', e => {
      e.stopPropagation();
      if (blk.isZero || blk.blockDefId === 'zero-1') {
        if (window.openZeroEditorForBlock) {
          window.openZeroEditorForBlock(blk.instanceId);
        }
      } else {
        this.convertToZeroBlock(blk.instanceId);
      }
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

  convertToZeroBlock(instanceId) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === instanceId);
    if (!blk) return;

    const elements = [];
    let curY = 60;

    if (blk.content.title) {
      elements.push({
        id: 'zb_el_' + Math.random().toString(36).substr(2, 6),
        type: 'h1',
        props: { x: 60, y: curY, width: 560, height: 80, content: blk.content.title, fontSize: 36, fontWeight: '800', color: blk.design.textColor || '#ffffff', fontFamily: 'Montserrat' }
      });
      curY += 90;
    }
    if (blk.content.subtitle || blk.content.text) {
      elements.push({
        id: 'zb_el_' + Math.random().toString(36).substr(2, 6),
        type: 'text',
        props: { x: 60, y: curY, width: 520, height: 70, content: blk.content.subtitle || blk.content.text, fontSize: 16, color: '#94a3b8', fontFamily: 'Inter' }
      });
      curY += 80;
    }
    if (blk.content.btnText) {
      elements.push({
        id: 'zb_el_' + Math.random().toString(36).substr(2, 6),
        type: 'btn',
        props: { x: 60, y: curY, width: 220, height: 48, content: blk.content.btnText, bgColor: blk.design.accentColor || '#0d99ff', color: '#ffffff', borderRadius: '8px', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }
      });
    }
    if (blk.content.img || blk.content.bgImage) {
      elements.push({
        id: 'zb_el_' + Math.random().toString(36).substr(2, 6),
        type: 'img',
        props: { x: 620, y: 60, width: 480, height: 320, borderRadius: '16px', content: blk.content.img || blk.content.bgImage }
      });
    }

    if (elements.length === 0) {
      elements.push({
        id: 'zb_el_' + Math.random().toString(36).substr(2, 6),
        type: 'h1',
        props: { x: 80, y: 80, width: 500, height: 60, content: blk.name, fontSize: 32, fontWeight: '800', color: '#ffffff', fontFamily: 'Montserrat' }
      });
    }

    blk.isZero = true;
    blk.blockDefId = 'zero-1';
    blk.name = 'Zero: ' + blk.name;
    blk.content = { elements };
    blk.design = { height: Math.max(540, curY + 120), background: blk.design.bgColor || '#070a13' };

    this.saveHistory();
    this.renderArtboard();
    this.renderLayersTree();
    this.selectBlock(blk.instanceId);
    if (window.openZeroEditorForBlock) {
      window.openZeroEditorForBlock(blk.instanceId);
    }
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
    const editables = contentEl.querySelectorAll('h1, h2, h3, h4, p, a, button, span, blockquote, li');
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

      if (el.tagName === 'A') {
        el.addEventListener('click', e => {
          e.preventDefault();
          this.showLinkEditorForElement(el);
        });
      }
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
    this.activeCustomElementId = null;
    if (preferredTab) this.activeInspectorTab = preferredTab;

    document.querySelectorAll('.tilda-block-wrapper').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.blockId === instanceId);
    });

    document.querySelectorAll('.block-custom-element').forEach(el => {
      el.classList.remove('is-selected-element', 'is-selected');
      el.querySelectorAll('.custom-el-action-bar, .custom-el-resizer, .custom-el-dim-badge').forEach(n => n.remove());
    });

    this.layersList?.querySelectorAll('.tilda-layer-item').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.id === instanceId);
    });

    this.renderInspector();
  }

  selectCustomElement(blockId, customElId) {
    this.activeBlockId = blockId;
    this.activeCustomElementId = customElId;

    document.querySelectorAll('.tilda-block-wrapper').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.blockId === blockId);
    });

    const page = this.getActivePage();
    const blk = page?.blocks.find(b => b.instanceId === blockId);
    if (blk) {
      const blkEl = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
      if (blkEl) this.bindBlockCustomElements(blkEl, blk);
    }

    this.renderInspector();
  }

  bindBlockCustomElements(blkEl, blk) {
    const customElements = blkEl.querySelectorAll('.block-custom-element');
    if (!customElements.length) return;

    customElements.forEach(custEl => {
      const elId = custEl.dataset.customElId;
      if (!elId) return;

      const isSelected = (this.activeCustomElementId === elId && this.activeBlockId === blk.instanceId);
      if (isSelected) {
        custEl.classList.add('is-selected-element', 'is-selected');
        this.attachCustomElementControls(custEl, blk, elId);
      } else {
        custEl.classList.remove('is-selected-element', 'is-selected');
        custEl.querySelectorAll('.custom-el-action-bar, .custom-el-resizer, .custom-el-dim-badge').forEach(n => n.remove());
      }

      custEl.onmousedown = (e) => {
        if (e.target.closest('.custom-el-action-bar') || e.target.closest('.custom-el-resizer') || custEl.isContentEditable) return;
        e.stopPropagation();
        this.selectCustomElement(blk.instanceId, elId);
        this.initCustomElementDrag(custEl, blk, elId, e);
      };

      custEl.ondblclick = (e) => {
        e.stopPropagation();
        this.enableCustomElementInlineEditing(custEl, blk, elId);
      };
    });
  }

  attachCustomElementControls(custEl, blk, elId) {
    custEl.querySelectorAll('.custom-el-action-bar, .custom-el-resizer, .custom-el-dim-badge').forEach(n => n.remove());

    const actionBar = document.createElement('div');
    actionBar.className = 'custom-el-action-bar';
    actionBar.innerHTML = `
      <div class="custom-el-drag-handle" title="Перетащить элемент">⠿</div>
      <button class="custom-el-action-btn btn-edit-text" type="button" title="Редактировать текст">✏️</button>
      <button class="custom-el-action-btn btn-link" type="button" title="Настроить ссылку">🔗</button>
      <button class="custom-el-action-btn btn-duplicate" type="button" title="Дублировать (Ctrl+D)">📋</button>
      <button class="custom-el-action-btn btn-delete" type="button" title="Удалить элемент (Del)">🗑️</button>
    `;

    const rect = custEl.getBoundingClientRect();
    const parentRect = custEl.parentElement.getBoundingClientRect();
    if (rect.top - parentRect.top < 45) {
      actionBar.classList.add('is-flipped-bottom');
    }

    actionBar.querySelector('.custom-el-drag-handle')?.addEventListener('mousedown', e => {
      e.stopPropagation();
      this.initCustomElementDrag(custEl, blk, elId, e);
    });

    actionBar.querySelector('.btn-edit-text')?.addEventListener('click', e => {
      e.stopPropagation();
      this.enableCustomElementInlineEditing(custEl, blk, elId);
    });

    actionBar.querySelector('.btn-link')?.addEventListener('click', e => {
      e.stopPropagation();
      this.showLinkEditorForElement(custEl);
    });

    actionBar.querySelector('.btn-duplicate')?.addEventListener('click', e => {
      e.stopPropagation();
      this.duplicateCustomElement(blk.instanceId, elId);
    });

    actionBar.querySelector('.btn-delete')?.addEventListener('click', e => {
      e.stopPropagation();
      this.removeCustomElementFromBlock(blk.instanceId, elId);
    });

    custEl.appendChild(actionBar);

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(dir => {
      const resizer = document.createElement('div');
      resizer.className = `custom-el-resizer resizer-${dir}`;
      resizer.dataset.dir = dir;
      resizer.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        this.initCustomElementResize(custEl, blk, elId, dir, e);
      });
      custEl.appendChild(resizer);
    });
  }

  initCustomElementDrag(custEl, blk, elId, startEvt) {
    const elData = blk.content?.customElements?.find(e => e.id === elId);
    if (!elData) return;
    if (!elData.props) elData.props = {};

    const startMouseX = startEvt.clientX;
    const startMouseY = startEvt.clientY;
    const startX = elData.props.x || parseInt(custEl.style.left, 10) || 0;
    const startY = elData.props.y || parseInt(custEl.style.top, 10) || 0;

    let isMoved = false;

    let badge = custEl.querySelector('.custom-el-dim-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'custom-el-dim-badge';
      custEl.appendChild(badge);
    }
    badge.textContent = `X: ${startX} Y: ${startY}`;
    badge.style.display = 'block';

    custEl.classList.add('is-element-dragged');

    const onMouseMove = ev => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;

      if (!isMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        isMoved = true;
      }

      let newX = startX + dx;
      let newY = startY + dy;

      if (this.isGridSnapping) {
        newX = this.snapCoord(newX, 8);
        newY = this.snapCoord(newY, 8);
      }

      custEl.style.left = `${newX}px`;
      custEl.style.top = `${newY}px`;
      badge.textContent = `X: ${newX} Y: ${newY}`;

      const inpX = document.getElementById('cust-el-x');
      const inpY = document.getElementById('cust-el-y');
      if (inpX) inpX.value = newX;
      if (inpY) inpY.value = newY;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      custEl.classList.remove('is-element-dragged');
      badge.remove();

      if (isMoved) {
        elData.props.x = parseInt(custEl.style.left, 10) || 0;
        elData.props.y = parseInt(custEl.style.top, 10) || 0;
        this.saveHistory();
        this.saveProject();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }

  initCustomElementResize(custEl, blk, elId, dir, startEvt) {
    const elData = blk.content?.customElements?.find(e => e.id === elId);
    if (!elData) return;
    if (!elData.props) elData.props = {};

    const startMouseX = startEvt.clientX;
    const startMouseY = startEvt.clientY;
    const startX = elData.props.x || parseInt(custEl.style.left, 10) || 0;
    const startY = elData.props.y || parseInt(custEl.style.top, 10) || 0;
    const startW = elData.props.width || custEl.offsetWidth || 100;
    const startH = elData.props.height || custEl.offsetHeight || 40;

    let badge = custEl.querySelector('.custom-el-dim-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'custom-el-dim-badge';
      custEl.appendChild(badge);
    }
    badge.textContent = `${startW} × ${startH} px`;
    badge.style.display = 'block';

    const onMouseMove = ev => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;

      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      if (dir.includes('e')) newW = Math.max(20, startW + dx);
      if (dir.includes('s')) newH = Math.max(16, startH + dy);
      if (dir.includes('w')) {
        const potentialW = Math.max(20, startW - dx);
        newX = startX + (startW - potentialW);
        newW = potentialW;
      }
      if (dir.includes('n')) {
        const potentialH = Math.max(16, startH - dy);
        newY = startY + (startH - potentialH);
        newH = potentialH;
      }

      if (this.isGridSnapping) {
        newW = this.snapCoord(newW, 8);
        newH = this.snapCoord(newH, 8);
        newX = this.snapCoord(newX, 8);
        newY = this.snapCoord(newY, 8);
      }

      custEl.style.width = `${newW}px`;
      custEl.style.height = `${newH}px`;
      custEl.style.left = `${newX}px`;
      custEl.style.top = `${newY}px`;
      badge.textContent = `${newW} × ${newH} px`;

      const inpW = document.getElementById('cust-el-w');
      const inpH = document.getElementById('cust-el-h');
      const inpX = document.getElementById('cust-el-x');
      const inpY = document.getElementById('cust-el-y');
      if (inpW) inpW.value = newW;
      if (inpH) inpH.value = newH;
      if (inpX) inpX.value = newX;
      if (inpY) inpY.value = newY;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      badge.remove();

      elData.props.width = parseInt(custEl.style.width, 10) || startW;
      elData.props.height = parseInt(custEl.style.height, 10) || startH;
      elData.props.x = parseInt(custEl.style.left, 10) || startX;
      elData.props.y = parseInt(custEl.style.top, 10) || startY;

      this.saveHistory();
      this.saveProject();
      this.renderInspector();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }

  enableCustomElementInlineEditing(custEl, blk, elId) {
    const elData = blk.content?.customElements?.find(e => e.id === elId);
    if (!elData) return;

    let textContainer = custEl.querySelector('.t-btn, div, span, h1, h2, h3, p');
    if (!textContainer) textContainer = custEl;

    textContainer.contentEditable = 'true';
    textContainer.focus();
    textContainer.classList.add('is-editing-inline');

    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(textContainer);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const onBlur = () => {
      textContainer.contentEditable = 'false';
      textContainer.classList.remove('is-editing-inline');
      textContainer.removeEventListener('blur', onBlur);

      elData.props.content = textContainer.textContent || textContainer.innerText || '';
      this.saveHistory();
      this.saveProject();
      this.renderInspector();
    };

    textContainer.addEventListener('blur', onBlur);
  }

  duplicateCustomElement(blockId, customElId) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === blockId);
    if (!blk || !blk.content?.customElements) return;

    const elIdx = blk.content.customElements.findIndex(e => e.id === customElId);
    if (elIdx < 0) return;

    const original = blk.content.customElements[elIdx];
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = 'cust_el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    if (clone.props) {
      clone.props.x = (clone.props.x || 0) + 20;
      clone.props.y = (clone.props.y || 0) + 20;
    }

    blk.content.customElements.splice(elIdx + 1, 0, clone);
    this.updateBlockDOM(blk);
    this.saveHistory();
    this.saveProject();
    this.selectCustomElement(blockId, clone.id);
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

    // Check if custom element is selected inside this block
    if (this.activeCustomElementId) {
      const customEl = blk.content?.customElements?.find(e => e.id === this.activeCustomElementId);
      if (customEl) {
        this.renderCustomElementInspector(blk, customEl);
        return;
      } else {
        this.activeCustomElementId = null;
      }
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

  renderCustomElementInspector(blk, customEl) {
    const p = customEl.props || {};
    const typeLabels = {
      h1: '🏷️ Заголовок H1',
      h2: '🏷️ Заголовок H2',
      h3: '🏷️ Заголовок H3',
      text: '📝 Текст',
      btn: '🔘 Кнопка действия',
      img: '🖼️ Изображение',
      shape: '⬜ Фигура',
      icon: '⭐ Иконка',
      form: '📋 Форма заявки',
      code: '💻 HTML код'
    };
    const typeTitle = typeLabels[customEl.type] || customEl.type.toUpperCase();

    let html = `
      <div class="tilda-inspector-header">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <button class="topbar-action-btn" id="btn-back-to-block" style="padding:4px 8px;font-size:11px;">
            <span class="material-symbols-rounded" style="font-size:14px;">arrow_back</span>
            <span>К блоку</span>
          </button>
          <span style="font-size:11px;color:#94a3b8;">${customEl.id.substr(0, 12)}</span>
        </div>
        <div class="insp-title" style="margin-top:6px;">
          <span style="font-size:13px;font-weight:700;color:#0d99ff;">${typeTitle}</span>
        </div>
      </div>
      <div class="tilda-inspector-body">
        <!-- 1. Координаты и размеры -->
        <div class="insp-section-title">Координаты и размер (px)</div>
        <div class="insp-row-2">
          <div class="insp-field"><label>X (слева px)</label><input type="number" id="cust-el-x" value="${p.x || 0}" /></div>
          <div class="insp-field"><label>Y (сверху px)</label><input type="number" id="cust-el-y" value="${p.y || 0}" /></div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field"><label>W (Ширина px)</label><input type="number" id="cust-el-w" value="${p.width || 200}" min="10" /></div>
          <div class="insp-field"><label>H (Высота px)</label><input type="number" id="cust-el-h" value="${p.height || 50}" min="10" /></div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field"><label>Поворот (°)</label><input type="number" id="cust-el-rot" value="${p.rotation || 0}" min="0" max="360" /></div>
          <div class="insp-field"><label>Слой (Z-Index)</label><input type="number" id="cust-el-z" value="${p.zIndex || 10}" min="1" /></div>
        </div>

        <!-- Кнопки выравнивания -->
        <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:4px;margin:10px 0 14px;">
          <button class="topbar-action-btn cust-align-btn" data-align="left" title="Влево" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_horizontal_left</span></button>
          <button class="topbar-action-btn cust-align-btn" data-align="center" title="По центру" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_horizontal_center</span></button>
          <button class="topbar-action-btn cust-align-btn" data-align="right" title="Вправо" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_horizontal_right</span></button>
          <button class="topbar-action-btn cust-align-btn" data-align="top" title="Вверх" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_vertical_top</span></button>
          <button class="topbar-action-btn cust-align-btn" data-align="middle" title="По вертикали" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_vertical_center</span></button>
          <button class="topbar-action-btn cust-align-btn" data-align="bottom" title="Вниз" style="justify-content:center;padding:5px;"><span class="material-symbols-rounded" style="font-size:15px;">align_vertical_bottom</span></button>
        </div>

        <!-- 2. Типографика и текст -->
        ${['text', 'h1', 'h2', 'h3', 'btn'].includes(customEl.type) ? `
          <div class="insp-section-title">Типографика & Текст</div>
          <div class="insp-field">
            <label>Текст элемента</label>
            <textarea id="cust-el-content" rows="3">${escapeHtml(p.content || '')}</textarea>
          </div>
          <div class="insp-row-2">
            <div class="insp-field">
              <label>Шрифт</label>
              <select id="cust-el-font-family">
                <option value="Montserrat" ${p.fontFamily === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                <option value="Inter" ${p.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                <option value="Unbounded" ${p.fontFamily === 'Unbounded' ? 'selected' : ''}>Unbounded</option>
                <option value="Playfair Display" ${p.fontFamily === 'Playfair Display' ? 'selected' : ''}>Playfair Display</option>
                <option value="Oswald" ${p.fontFamily === 'Oswald' ? 'selected' : ''}>Oswald</option>
                <option value="Caveat" ${p.fontFamily === 'Caveat' ? 'selected' : ''}>Caveat</option>
                <option value="Roboto" ${p.fontFamily === 'Roboto' ? 'selected' : ''}>Roboto</option>
                <option value="Open Sans" ${p.fontFamily === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
              </select>
            </div>
            <div class="insp-field">
              <label>Размер (px)</label>
              <input type="number" id="cust-el-font-size" value="${p.fontSize || 16}" min="10" max="140" />
            </div>
          </div>
          <div class="insp-row-2">
            <div class="insp-field">
              <label>Насыщенность</label>
              <select id="cust-el-font-weight">
                <option value="400" ${p.fontWeight === '400' ? 'selected' : ''}>400 Regular</option>
                <option value="500" ${p.fontWeight === '500' ? 'selected' : ''}>500 Medium</option>
                <option value="600" ${p.fontWeight === '600' ? 'selected' : ''}>600 SemiBold</option>
                <option value="700" ${p.fontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                <option value="800" ${p.fontWeight === '800' ? 'selected' : ''}>800 ExtraBold</option>
                <option value="900" ${p.fontWeight === '900' ? 'selected' : ''}>900 Black</option>
              </select>
            </div>
            <div class="insp-field">
              <label>Выравнивание</label>
              <select id="cust-el-text-align">
                <option value="left" ${p.textAlign === 'left' ? 'selected' : ''}>Слева</option>
                <option value="center" ${p.textAlign === 'center' ? 'selected' : ''}>По центру</option>
                <option value="right" ${p.textAlign === 'right' ? 'selected' : ''}>Справа</option>
              </select>
            </div>
          </div>
          <div class="insp-field">
            <label>Цвет текста</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="cust-el-color-picker" value="${p.color && p.color.startsWith('#') ? p.color : '#ffffff'}" />
              <input type="text" id="cust-el-color-text" value="${p.color || '#ffffff'}" style="flex:1;" />
            </div>
          </div>
        ` : ''}

        <!-- 3. Изображение и Lightbox -->
        ${customEl.type === 'img' ? `
          <div class="insp-section-title">Параметры изображения</div>
          <div class="insp-field">
            <label>URL изображения</label>
            <div style="display:flex;gap:6px;">
              <input type="text" id="cust-el-img-url" value="${escapeHtml(p.content || '')}" placeholder="https://..." style="flex:1;" />
              <button class="topbar-action-btn" id="btn-replace-cust-img" title="Заменить фото"><span class="material-symbols-rounded">image</span></button>
            </div>
          </div>
          <div class="insp-field">
            <label class="insp-checkbox">
              <input type="checkbox" id="cust-el-lightbox" ${p.lightbox ? 'checked' : ''} /> Открывать в Lightbox при клике
            </label>
          </div>
        ` : ''}

        <!-- 4. Иконка -->
        ${customEl.type === 'icon' ? `
          <div class="insp-section-title">Выбор иконки</div>
          <div class="insp-field">
            <label>Имя иконки (Material Symbols)</label>
            <input type="text" id="cust-el-icon-name" value="${escapeHtml(p.icon || p.content || 'star')}" />
          </div>
          <div class="anchor-presets-chips" style="margin-bottom:12px;">
            ${['star', 'bolt', 'favorite', 'check_circle', 'shopping_cart', 'mail', 'call', 'lock', 'rocket_launch', 'shield', 'verified', 'thumb_up'].map(ic => `<span class="anchor-preset-chip cust-icon-chip" data-icon="${ic}">${ic}</span>`).join('')}
          </div>
        ` : ''}

        <!-- 5. Внешний вид (Фон, Рамка, Скругление) -->
        <div class="insp-section-title">Внешний вид & Оформление</div>
        <div class="insp-field">
          <label>Цвет фона</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="cust-el-bg-color" value="${p.bgColor && p.bgColor.startsWith('#') ? p.bgColor : '#0d99ff'}" />
            <input type="text" id="cust-el-bg-text" value="${p.bgColor || 'transparent'}" style="flex:1;" />
          </div>
          <div class="color-presets-row">
            <span class="color-swatch-chip" style="background:#0d99ff;" data-target="bg" data-color="#0d99ff"></span>
            <span class="color-swatch-chip" style="background:#8b5cf6;" data-target="bg" data-color="#8b5cf6"></span>
            <span class="color-swatch-chip" style="background:#10b981;" data-target="bg" data-color="#10b981"></span>
            <span class="color-swatch-chip" style="background:#1e293b;" data-target="bg" data-color="#1e293b"></span>
            <span class="color-swatch-chip" style="background:transparent;border:1px dashed #64748b;" data-target="bg" data-color="transparent" title="Прозрачный"></span>
          </div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field">
            <label>Скругление (px)</label>
            <input type="text" id="cust-el-radius" value="${p.borderRadius || '0px'}" />
          </div>
          <div class="insp-field">
            <label>Толщина рамки</label>
            <input type="text" id="cust-el-border-w" value="${p.borderWidth || '0px'}" />
          </div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field">
            <label>Стиль рамки</label>
            <select id="cust-el-border-style">
              <option value="solid" ${p.borderStyle === 'solid' ? 'selected' : ''}>Solid (Сплошная)</option>
              <option value="dashed" ${p.borderStyle === 'dashed' ? 'selected' : ''}>Dashed (Пунктир)</option>
              <option value="dotted" ${p.borderStyle === 'dotted' ? 'selected' : ''}>Dotted (Точки)</option>
            </select>
          </div>
          <div class="insp-field">
            <label>Цвет рамки</label>
            <div style="display:flex;gap:4px;align-items:center;">
              <input type="color" id="cust-el-border-color" value="${p.borderColor && p.borderColor.startsWith('#') ? p.borderColor : '#0d99ff'}" />
              <input type="text" id="cust-el-border-text" value="${p.borderColor || '#0d99ff'}" style="flex:1;" />
            </div>
          </div>
        </div>
        <div class="insp-field">
          <label>Прозрачность (0.0 — 1.0)</label>
          <input type="number" step="0.1" min="0" max="1" id="cust-el-opacity" value="${p.opacity !== undefined ? p.opacity : 1}" />
        </div>

        <!-- 6. Ссылка и Якоря -->
        <div class="insp-section-title">🔗 Ссылка & Действие</div>
        <div class="insp-field">
          <label>URL или #якорь</label>
          <input type="text" id="cust-el-url" value="${escapeHtml(p.url || '')}" placeholder="https://... или #about" />
        </div>
        <div class="insp-field">
          <label style="font-size:11px;color:#94a3b8;">🎯 Выбрать якорь страницы:</label>
          <select id="cust-el-anchor-select" class="floating-anchor-dropdown">
            <option value="">-- Выбрать якорь --</option>
            ${this.getPageAnchorsList().map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
          </select>
        </div>
        <div class="link-quick-types-row">
          <button type="button" class="link-quick-chip cust-link-chip" data-url="https://t.me/">💬 TG</button>
          <button type="button" class="link-quick-chip cust-link-chip" data-url="tel:+79990000000">📞 Телефон</button>
          <button type="button" class="link-quick-chip cust-link-chip" data-url="mailto:info@site.ru">✉️ Email</button>
          <button type="button" class="link-quick-chip cust-link-chip" data-url="#order">📝 Заказ</button>
          <button type="button" class="link-quick-chip cust-link-chip" data-url="#cart">🛍️ Корзина</button>
        </div>
        <div class="insp-field" style="margin-top:8px;">
          <label class="insp-checkbox">
            <input type="checkbox" id="cust-el-target-blank" ${p.targetBlank ? 'checked' : ''} /> Открывать в новой вкладке (target="_blank")
          </label>
        </div>

        <!-- 7. Действия -->
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;">
          <button class="topbar-action-btn" id="btn-dup-cust-el" style="flex:1;"><span class="material-symbols-rounded">content_copy</span> Копия</button>
          <button class="topbar-action-btn" id="btn-del-cust-el" style="flex:1;background:rgba(244,63,94,0.15);color:#f43f5e;border-color:rgba(244,63,94,0.3);"><span class="material-symbols-rounded">delete</span> Удалить</button>
        </div>
      </div>
    `;

    this.propsPanel.innerHTML = html;
    this.bindCustomElementInspectorInputs(blk, customEl);
  }

  bindCustomElementInspectorInputs(blk, customEl) {
    const p = customEl.props || {};

    const syncEl = () => {
      this.updateBlockDOM(blk);
      this.saveHistory();
      this.saveProject();
    };

    this.propsPanel.querySelector('#btn-back-to-block')?.addEventListener('click', () => {
      this.activeCustomElementId = null;
      this.renderInspector();
    });

    const bindNum = (id, propKey) => {
      const inp = this.propsPanel.querySelector(id);
      inp?.addEventListener('input', () => {
        p[propKey] = parseFloat(inp.value) || 0;
        syncEl();
      });
    };
    bindNum('#cust-el-x', 'x');
    bindNum('#cust-el-y', 'y');
    bindNum('#cust-el-w', 'width');
    bindNum('#cust-el-h', 'height');
    bindNum('#cust-el-rot', 'rotation');
    bindNum('#cust-el-z', 'zIndex');
    bindNum('#cust-el-font-size', 'fontSize');
    bindNum('#cust-el-opacity', 'opacity');

    this.propsPanel.querySelectorAll('.cust-align-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align;
        const containerW = 1200;
        const blockEl = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
        const containerH = blockEl ? blockEl.offsetHeight : 500;
        const elW = p.width || 200;
        const elH = p.height || 50;

        if (align === 'left') p.x = 20;
        if (align === 'center') p.x = Math.round((containerW - elW) / 2);
        if (align === 'right') p.x = containerW - elW - 20;
        if (align === 'top') p.y = 20;
        if (align === 'middle') p.y = Math.max(20, Math.round((containerH - elH) / 2));
        if (align === 'bottom') p.y = Math.max(20, containerH - elH - 20);

        const inpX = this.propsPanel.querySelector('#cust-el-x');
        const inpY = this.propsPanel.querySelector('#cust-el-y');
        if (inpX) inpX.value = p.x;
        if (inpY) inpY.value = p.y;
        syncEl();
      });
    });

    const contentText = this.propsPanel.querySelector('#cust-el-content');
    contentText?.addEventListener('input', () => {
      p.content = contentText.value;
      syncEl();
    });

    const fontFam = this.propsPanel.querySelector('#cust-el-font-family');
    fontFam?.addEventListener('change', () => {
      p.fontFamily = fontFam.value;
      syncEl();
    });

    const fontWt = this.propsPanel.querySelector('#cust-el-font-weight');
    fontWt?.addEventListener('change', () => {
      p.fontWeight = fontWt.value;
      syncEl();
    });

    const txtAlign = this.propsPanel.querySelector('#cust-el-text-align');
    txtAlign?.addEventListener('change', () => {
      p.textAlign = txtAlign.value;
      syncEl();
    });

    const colorPicker = this.propsPanel.querySelector('#cust-el-color-picker');
    const colorText = this.propsPanel.querySelector('#cust-el-color-text');
    colorPicker?.addEventListener('input', () => {
      p.color = colorPicker.value;
      if (colorText) colorText.value = colorPicker.value;
      syncEl();
    });
    colorText?.addEventListener('input', () => {
      p.color = colorText.value;
      if (colorPicker && colorText.value.startsWith('#')) colorPicker.value = colorText.value;
      syncEl();
    });

    const bgPicker = this.propsPanel.querySelector('#cust-el-bg-color');
    const bgText = this.propsPanel.querySelector('#cust-el-bg-text');
    bgPicker?.addEventListener('input', () => {
      p.bgColor = bgPicker.value;
      if (bgText) bgText.value = bgPicker.value;
      syncEl();
    });
    bgText?.addEventListener('input', () => {
      p.bgColor = bgText.value;
      if (bgPicker && bgText.value.startsWith('#')) bgPicker.value = bgText.value;
      syncEl();
    });

    this.propsPanel.querySelectorAll('.color-swatch-chip').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const col = swatch.dataset.color;
        p.bgColor = col;
        if (bgText) bgText.value = col;
        if (bgPicker && col.startsWith('#')) bgPicker.value = col;
        syncEl();
      });
    });

    const radInp = this.propsPanel.querySelector('#cust-el-radius');
    radInp?.addEventListener('input', () => {
      p.borderRadius = radInp.value;
      syncEl();
    });

    const borderWInp = this.propsPanel.querySelector('#cust-el-border-w');
    borderWInp?.addEventListener('input', () => {
      p.borderWidth = borderWInp.value;
      syncEl();
    });

    const borderSt = this.propsPanel.querySelector('#cust-el-border-style');
    borderSt?.addEventListener('change', () => {
      p.borderStyle = borderSt.value;
      syncEl();
    });

    const borderColPicker = this.propsPanel.querySelector('#cust-el-border-color');
    const borderColText = this.propsPanel.querySelector('#cust-el-border-text');
    borderColPicker?.addEventListener('input', () => {
      p.borderColor = borderColPicker.value;
      if (borderColText) borderColText.value = borderColPicker.value;
      syncEl();
    });
    borderColText?.addEventListener('input', () => {
      p.borderColor = borderColText.value;
      if (borderColPicker && borderColText.value.startsWith('#')) borderColPicker.value = borderColText.value;
      syncEl();
    });

    const imgUrlInp = this.propsPanel.querySelector('#cust-el-img-url');
    imgUrlInp?.addEventListener('input', () => {
      p.content = imgUrlInp.value;
      syncEl();
    });

    this.propsPanel.querySelector('#btn-replace-cust-img')?.addEventListener('click', () => {
      window.openImageReplaceModal?.((newUrl) => {
        p.content = newUrl;
        if (imgUrlInp) imgUrlInp.value = newUrl;
        syncEl();
      });
    });

    const lbChk = this.propsPanel.querySelector('#cust-el-lightbox');
    lbChk?.addEventListener('change', () => {
      p.lightbox = lbChk.checked;
      syncEl();
    });

    const iconNameInp = this.propsPanel.querySelector('#cust-el-icon-name');
    iconNameInp?.addEventListener('input', () => {
      p.icon = iconNameInp.value;
      p.content = iconNameInp.value;
      syncEl();
    });

    this.propsPanel.querySelectorAll('.cust-icon-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const ic = chip.dataset.icon;
        p.icon = ic;
        p.content = ic;
        if (iconNameInp) iconNameInp.value = ic;
        syncEl();
      });
    });

    const urlInp = this.propsPanel.querySelector('#cust-el-url');
    urlInp?.addEventListener('input', () => {
      p.url = urlInp.value;
      syncEl();
    });

    const anchorSelect = this.propsPanel.querySelector('#cust-el-anchor-select');
    anchorSelect?.addEventListener('change', () => {
      if (anchorSelect.value) {
        p.url = anchorSelect.value;
        if (urlInp) urlInp.value = anchorSelect.value;
        syncEl();
      }
    });

    this.propsPanel.querySelectorAll('.cust-link-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qUrl = chip.dataset.url;
        p.url = qUrl;
        if (urlInp) urlInp.value = qUrl;
        syncEl();
      });
    });

    const targetBlankChk = this.propsPanel.querySelector('#cust-el-target-blank');
    targetBlankChk?.addEventListener('change', () => {
      p.targetBlank = targetBlankChk.checked;
      syncEl();
    });

    this.propsPanel.querySelector('#btn-dup-cust-el')?.addEventListener('click', () => {
      this.duplicateCustomElement(blk.instanceId, customEl.id);
    });

    this.propsPanel.querySelector('#btn-del-cust-el')?.addEventListener('click', () => {
      this.removeCustomElementFromBlock(blk.instanceId, customEl.id);
    });
  }

  addCustomElementToBlock(blockId, type) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === blockId);
    if (!blk) return;

    if (!blk.content) blk.content = {};
    if (!blk.content.customElements) blk.content.customElements = [];

    const newEl = {
      id: 'cust_el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      props: {
        x: 60,
        y: 40 + blk.content.customElements.length * 50,
        width: type === 'h1' ? 400 : (type === 'btn' ? 200 : (type === 'img' ? 300 : 260)),
        height: type === 'btn' ? 48 : (type === 'img' ? 200 : (type === 'h1' ? 60 : 44)),
        content: type === 'h1' ? 'Новый заголовок' : (type === 'btn' ? 'Кнопка действия' : (type === 'img' ? 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80' : (type === 'shape' ? '' : 'Новый текстовый блок'))),
        color: '#ffffff',
        bgColor: type === 'btn' ? '#0d99ff' : (type === 'shape' ? 'rgba(13,153,255,0.2)' : 'transparent'),
        fontSize: type === 'h1' ? 28 : (type === 'btn' ? 15 : 16),
        fontWeight: type === 'h1' ? '800' : (type === 'btn' ? '700' : '400'),
        borderRadius: type === 'btn' ? '8px' : (type === 'img' ? '12px' : '6px'),
        borderColor: '#0d99ff',
        borderWidth: type === 'shape' ? '1.5px' : '0px',
        url: '#',
        icon: 'star'
      }
    };

    blk.content.customElements.push(newEl);
    this.updateBlockDOM(blk);
    this.saveHistory();
    this.saveProject();
    this.selectCustomElement(blockId, newEl.id);
  }

  removeCustomElementFromBlock(blockId, elementId) {
    const page = this.getActivePage();
    const blk = page.blocks.find(b => b.instanceId === blockId);
    if (!blk || !blk.content?.customElements) return;

    blk.content.customElements = blk.content.customElements.filter(e => e.id !== elementId);
    if (this.activeCustomElementId === elementId) {
      this.activeCustomElementId = null;
    }
    this.updateBlockDOM(blk);
    this.saveHistory();
    this.saveProject();
    this.renderInspector();
  }

  renderContentFields(blk, def) {
    const c = blk.content || {};
    let html = '';

    if (blk.isZero || blk.blockDefId === 'zero-1') {
      html += `
        <div style="margin-bottom:16px;">
          <button class="topbar-action-btn btn-primary" id="btn-open-zero-modal" style="width:100%;padding:14px;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 4px 20px rgba(13,153,255,0.4);">
            <span class="material-symbols-rounded">bolt</span>
            <span>⚡ Открыть редактор Zero Block</span>
          </button>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;line-height:1.5;">
          Элементов в блоке: <b style="color:#0d99ff;">${c.elements?.length || 0}</b>. Вы можете свободно перемещать, вращать, масштабировать и редактировать текст прямо на холсте.
        </div>
      `;
    }

    html += `
      <div class="insp-section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>+ Добавить элемент в блок</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;margin-bottom:18px;">
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="h1" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить заголовок">+ Заголовок</button>
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="text" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить текст">+ Текст</button>
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="btn" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить кнопку">+ Кнопка</button>
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="img" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить фото">+ Фото</button>
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="shape" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить фигуру">+ Фигура</button>
        <button class="topbar-action-btn btn-add-cust-el" data-add-type="icon" style="justify-content:center;padding:6px;font-size:11px;" title="Добавить иконку">+ Иконка</button>
      </div>

      <!-- Блочный якорь (Anchor ID) -->
      <div class="insp-section-title">🔗 Якорь блока (#id для меню и кнопок)</div>
      <div class="insp-field">
        <label>ID якоря (например: about, features, pricing, contacts)</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <div class="anchor-prefix-box">#</div>
          <input type="text" id="insp-block-anchor-input" value="${escapeHtml(blk.anchor || '')}" placeholder="about, order, store..." style="flex:1;" />
          <button class="topbar-action-btn" id="btn-copy-block-anchor" title="Скопировать якорную ссылку"><span class="material-symbols-rounded">content_copy</span></button>
        </div>
        <div class="anchor-presets-chips">
          <span class="anchor-preset-chip" data-anchor-val="hero">#hero</span>
          <span class="anchor-preset-chip" data-anchor-val="about">#about</span>
          <span class="anchor-preset-chip" data-anchor-val="features">#features</span>
          <span class="anchor-preset-chip" data-anchor-val="services">#services</span>
          <span class="anchor-preset-chip" data-anchor-val="pricing">#pricing</span>
          <span class="anchor-preset-chip" data-anchor-val="reviews">#reviews</span>
          <span class="anchor-preset-chip" data-anchor-val="faq">#faq</span>
          <span class="anchor-preset-chip" data-anchor-val="contacts">#contacts</span>
          <span class="anchor-preset-chip" data-anchor-val="order">#order</span>
          <span class="anchor-preset-chip" data-anchor-val="catalog">#catalog</span>
        </div>
      </div>

      <div class="insp-section-title" style="margin-top:16px;">Содержимое блока</div>
    `;

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
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="text" data-content-key="btnUrl" id="insp-btn-url-input" value="${escapeHtml(c.btnUrl || '#')}" placeholder="#about или https://..." style="flex:1;" />
            <button class="topbar-action-btn" id="btn-clear-btn-url" title="Очистить / удалить ссылку"><span class="material-symbols-rounded" style="color:#f43f5e;">link_off</span></button>
          </div>
          <div style="margin-top:6px;">
            <label style="font-size:11px;color:var(--text-3);margin-bottom:3px;display:block;">🎯 Выбрать якорь на странице:</label>
            <select id="insp-anchor-selector" class="anchor-selector-dropdown">
              <option value="">-- Выберите якорь страницы --</option>
              ${this.getPageAnchorsList().map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
            </select>
          </div>
          <div class="link-quick-types-row">
            <button type="button" class="link-quick-chip" data-quick-url="https://t.me/">💬 TG</button>
            <button type="button" class="link-quick-chip" data-quick-url="tel:+79990000000">📞 Телефон</button>
            <button type="button" class="link-quick-chip" data-quick-url="mailto:info@site.ru">✉️ Email</button>
            <button type="button" class="link-quick-chip" data-quick-url="#order">📝 Заказ</button>
            <button type="button" class="link-quick-chip" data-quick-url="#cart">🛍️ Корзина</button>
          </div>
          <label class="insp-checkbox" style="margin-top:8px;">
            <input type="checkbox" data-content-key="btnTargetBlank" ${c.btnTargetBlank ? 'checked' : ''} /> Открывать в новой вкладке (target="_blank")
          </label>
        </div>
      `;
    }
    if (c.bgImage !== undefined || c.img !== undefined) {
      const imgVal = c.bgImage || c.img || '';
      const key = c.bgImage !== undefined ? 'bgImage' : 'img';
      html += `
        <div class="insp-field">
          <label>Изображение (URL)</label>
          <div style="display:flex;gap:6px;">
            <input type="text" data-content-key="${key}" value="${escapeHtml(imgVal)}" placeholder="https://..." style="flex:1;" />
            <button class="topbar-action-btn btn-replace-photo-trigger" data-target-key="${key}" title="Заменить фото"><span class="material-symbols-rounded">image</span></button>
          </div>
        </div>
      `;
    }

    if (c.customElements && c.customElements.length > 0) {
      html += `
        <div class="insp-section-title" style="margin-top:16px;">Добавленные элементы (${c.customElements.length})</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
      `;
      c.customElements.forEach((el, idx) => {
        html += `
          <div class="insp-cust-el-card" data-el-id="${el.id}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-dark-0);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:border-color 0.15s ease;">
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:#0d99ff;font-size:11px;font-weight:700;">${el.type.toUpperCase()}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(el.props?.content || 'Элемент ' + (idx + 1))}</span>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="page-act-btn btn-edit-cust-el" data-el-id="${el.id}" style="color:#0d99ff;" title="Настроить элемент"><span class="material-symbols-rounded" style="font-size:14px;">tune</span></button>
              <button class="page-act-btn btn-del-cust-el" data-el-id="${el.id}" style="color:#f43f5e;" title="Удалить элемент"><span class="material-symbols-rounded" style="font-size:14px;">delete</span></button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    return html;
  }

  renderDesignFields(blk, def) {
    const d = blk.design || {};
    return `
      <div class="insp-section-title">Цвет фона блока</div>
      <div class="insp-field">
        <label>Цвет фона</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="bgColor" id="insp-bg-color-picker" value="${d.bgColor || d.background || '#0f172a'}" />
          <input type="text" data-design-key="bgColor" id="insp-bg-color-text" value="${d.bgColor || d.background || '#0f172a'}" style="flex:1;" />
        </div>
        <div class="color-presets-row">
          <span class="color-swatch-chip" style="background:#070a13;" data-palette-target="bgColor" data-color="#070a13" title="Ночной #070a13"></span>
          <span class="color-swatch-chip" style="background:#0f172a;" data-palette-target="bgColor" data-color="#0f172a" title="Сланец #0f172a"></span>
          <span class="color-swatch-chip" style="background:#000000;" data-palette-target="bgColor" data-color="#000000" title="Черный #000000"></span>
          <span class="color-swatch-chip" style="background:#ffffff;" data-palette-target="bgColor" data-color="#ffffff" title="Белый #ffffff"></span>
          <span class="color-swatch-chip" style="background:#0d99ff;" data-palette-target="bgColor" data-color="#0d99ff" title="Неон синий #0d99ff"></span>
          <span class="color-swatch-chip" style="background:#8b5cf6;" data-palette-target="bgColor" data-color="#8b5cf6" title="Фиолетовый #8b5cf6"></span>
          <span class="color-swatch-chip" style="background:#10b981;" data-palette-target="bgColor" data-color="#10b981" title="Изумруд #10b981"></span>
          <span class="color-swatch-chip" style="background:#f43f5e;" data-palette-target="bgColor" data-color="#f43f5e" title="Роза #f43f5e"></span>
        </div>
      </div>

      <div class="insp-section-title">Цвет текста блока</div>
      <div class="insp-field">
        <label>Цвет текста</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="color" data-design-key="textColor" id="insp-text-color-picker" value="${d.textColor || '#ffffff'}" />
          <input type="text" data-design-key="textColor" id="insp-text-color-text" value="${d.textColor || '#ffffff'}" style="flex:1;" />
        </div>
        <div class="color-presets-row">
          <span class="color-swatch-chip" style="background:#ffffff;" data-palette-target="textColor" data-color="#ffffff" title="Белый #ffffff"></span>
          <span class="color-swatch-chip" style="background:#cbd5e1;" data-palette-target="textColor" data-color="#cbd5e1" title="Светло-серый #cbd5e1"></span>
          <span class="color-swatch-chip" style="background:#94a3b8;" data-palette-target="textColor" data-color="#94a3b8" title="Серый #94a3b8"></span>
          <span class="color-swatch-chip" style="background:#000000;" data-palette-target="textColor" data-color="#000000" title="Черный #000000"></span>
          <span class="color-swatch-chip" style="background:#0d99ff;" data-palette-target="textColor" data-color="#0d99ff" title="Синий #0d99ff"></span>
          <span class="color-swatch-chip" style="background:#f59e0b;" data-palette-target="textColor" data-color="#f59e0b" title="Золотой #f59e0b"></span>
        </div>
      </div>

      <div class="insp-section-title">Отступы блока</div>
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
    const a = blk.animation || { type: 'none', delay: 0, duration: 0.7 };
    return `
      <div class="insp-section-title">Анимация появления при скролле</div>
      <div class="insp-field">
        <label>Эффект появления</label>
        <select data-anim-key="type" id="insp-anim-type-select">
          <option value="none" ${a.type === 'none' ? 'selected' : ''}>Без анимации</option>
          <option value="fade-in" ${a.type === 'fade-in' ? 'selected' : ''}>✨ Плавное появление (Fade In)</option>
          <option value="slide-up" ${a.type === 'slide-up' ? 'selected' : ''}>⬆ Всплытие снизу (Slide Up)</option>
          <option value="slide-down" ${a.type === 'slide-down' ? 'selected' : ''}>⬇ Появление сверху (Slide Down)</option>
          <option value="slide-left" ${a.type === 'slide-left' ? 'selected' : ''}>⬅ Сдвиг справа налево (Slide Left)</option>
          <option value="slide-right" ${a.type === 'slide-right' ? 'selected' : ''}>➡ Сдвиг слева направо (Slide Right)</option>
          <option value="zoom-in" ${a.type === 'zoom-in' ? 'selected' : ''}>🔍 Увеличение (Zoom In)</option>
          <option value="flip-up" ${a.type === 'flip-up' ? 'selected' : ''}>🔄 3D Поворот (Flip Up)</option>
          <option value="bounce" ${a.type === 'bounce' ? 'selected' : ''}>🏀 Пружинистое появление (Bounce)</option>
        </select>
      </div>
      <div class="insp-row-2">
        <div class="insp-field">
          <label>Задержка (сек)</label>
          <input type="number" step="0.1" min="0" max="3" data-anim-key="delay" value="${a.delay || 0}" />
        </div>
        <div class="insp-field">
          <label>Длительность (сек)</label>
          <input type="number" step="0.1" min="0.2" max="3" data-anim-key="duration" value="${a.duration || 0.7}" />
        </div>
      </div>
      <button class="topbar-action-btn btn-primary" id="btn-test-block-anim" style="width:100%;margin-top:12px;padding:12px;justify-content:center;">
        <span class="material-symbols-rounded">play_arrow</span>
        <span>▶ Проверить анимацию на холсте</span>
      </button>
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
    // 0. Zero block editor button
    this.propsPanel.querySelector('#btn-open-zero-modal')?.addEventListener('click', () => {
      if (window.openZeroEditorForBlock) {
        window.openZeroEditorForBlock(blk.instanceId);
      }
    });

    // 1. Content Inputs
    this.propsPanel.querySelectorAll('[data-content-key]').forEach(input => {
      const eventName = (input.type === 'checkbox') ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        const key = input.dataset.contentKey;
        blk.content[key] = (input.type === 'checkbox') ? input.checked : input.value;
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    // 1.1 Anchor ID Input & Presets
    const anchorInput = this.propsPanel.querySelector('#insp-block-anchor-input');
    anchorInput?.addEventListener('input', e => {
      blk.anchor = e.target.value.trim().replace(/^#+/, '');
      const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
      if (el) {
        el.id = blk.anchor || blk.instanceId;
        el.dataset.anchor = blk.anchor || '';
        const badge = el.querySelector('.blk-anchor-badge');
        if (badge) {
          badge.textContent = blk.anchor ? `#${blk.anchor}` : '';
          badge.style.display = blk.anchor ? 'inline-flex' : 'none';
        }
      }
      this.renderLayersTree();
      this.saveHistory();
    });

    this.propsPanel.querySelectorAll('.anchor-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.anchorVal;
        blk.anchor = val;
        if (anchorInput) anchorInput.value = val;
        const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
        if (el) {
          el.id = blk.anchor || blk.instanceId;
          el.dataset.anchor = blk.anchor || '';
        }
        this.saveHistory();
        this.renderArtboard();
        this.renderLayersTree();
      });
    });

    this.propsPanel.querySelector('#btn-copy-block-anchor')?.addEventListener('click', () => {
      const anchorVal = blk.anchor ? `#${blk.anchor}` : `#${blk.instanceId}`;
      navigator.clipboard?.writeText(anchorVal);
      alert(`Якорная ссылка скопирована в буфер обмена: ${anchorVal}`);
    });

    // 1.2 Anchor Selector for Button Link
    const anchorSelector = this.propsPanel.querySelector('#insp-anchor-selector');
    const btnUrlInput = this.propsPanel.querySelector('#insp-btn-url-input');
    anchorSelector?.addEventListener('change', () => {
      if (anchorSelector.value) {
        blk.content.btnUrl = anchorSelector.value;
        if (btnUrlInput) btnUrlInput.value = anchorSelector.value;
        this.updateBlockDOM(blk);
        this.saveHistory();
      }
    });

    // 1.3 Quick Link Chips
    this.propsPanel.querySelectorAll('.link-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qUrl = chip.dataset.quickUrl;
        blk.content.btnUrl = qUrl;
        if (btnUrlInput) btnUrlInput.value = qUrl;
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    // 1.4 Clear Link Button
    this.propsPanel.querySelector('#btn-clear-btn-url')?.addEventListener('click', () => {
      blk.content.btnUrl = '#';
      if (btnUrlInput) btnUrlInput.value = '#';
      this.updateBlockDOM(blk);
      this.saveHistory();
    });

    // 2. Add Custom Element to Block
    this.propsPanel.querySelectorAll('.btn-add-cust-el').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.addType;
        this.addCustomElementToBlock(blk.instanceId, type);
      });
    });

    // 3. Select / Edit / Delete Custom Element
    this.propsPanel.querySelectorAll('.insp-cust-el-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-del-cust-el')) return;
        const elId = card.dataset.elId;
        this.selectCustomElement(blk.instanceId, elId);
      });
    });

    this.propsPanel.querySelectorAll('.btn-edit-cust-el').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const elId = btn.dataset.elId;
        this.selectCustomElement(blk.instanceId, elId);
      });
    });

    this.propsPanel.querySelectorAll('.btn-del-cust-el').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const elId = btn.dataset.elId;
        this.removeCustomElementFromBlock(blk.instanceId, elId);
      });
    });

    // 4. Design Inputs (Colors & Paddings)
    this.propsPanel.querySelectorAll('[data-design-key]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.designKey;
        blk.design[key] = input.value;

        // Keep color picker and text input in sync
        this.propsPanel.querySelectorAll(`[data-design-key="${key}"]`).forEach(other => {
          if (other !== input) other.value = input.value;
        });

        const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
        if (el) this.applyBlockStyles(el, blk);
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    // 5. Palette Preset Swatches
    this.propsPanel.querySelectorAll('[data-palette-target]').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const targetKey = swatch.dataset.paletteTarget;
        const color = swatch.dataset.color;
        blk.design[targetKey] = color;

        this.propsPanel.querySelectorAll(`[data-design-key="${targetKey}"]`).forEach(inp => {
          inp.value = color;
        });

        const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
        if (el) this.applyBlockStyles(el, blk);
        this.updateBlockDOM(blk);
        this.saveHistory();
      });
    });

    // 6. Animation Inputs
    this.propsPanel.querySelectorAll('[data-anim-key]').forEach(input => {
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        const key = input.dataset.animKey;
        if (!blk.animation) blk.animation = { type: 'none', delay: 0, duration: 0.7 };
        blk.animation[key] = input.value;

        const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
        if (el) this.applyBlockStyles(el, blk);
        this.saveHistory();
      });
    });

    // 7. Live Animation Test Button
    this.propsPanel.querySelector('#btn-test-block-anim')?.addEventListener('click', () => {
      const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
      if (el) {
        const animType = blk.animation?.type || 'fade-in';
        if (animType === 'none') {
          alert('Выберите тип анимации из выпадающего списка выше!');
          return;
        }
        el.classList.remove('tilda-animated-in', 'anim-fade-in', 'anim-slide-up', 'anim-slide-down', 'anim-slide-left', 'anim-slide-right', 'anim-zoom-in', 'anim-flip-up', 'anim-bounce');
        void el.offsetWidth; // force DOM reflow
        el.classList.add(`anim-${animType}`);
        setTimeout(() => {
          el.classList.add('tilda-animated-in');
        }, 50);
      }
    });

    // 8. Replace Image Modal Trigger
    this.propsPanel.querySelectorAll('.btn-replace-photo-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.targetKey;
        window.openImageReplaceModal?.((newUrl) => {
          blk.content[key] = newUrl;
          this.updateBlockDOM(blk);
          this.saveHistory();
          this.renderInspector();
        });
      });
    });
  }

  updateBlockDOM(blk) {
    const el = document.getElementById(blk.instanceId) || document.getElementById(blk.anchor);
    if (!el) return;
    const def = getBlockById(blk.blockDefId);
    const inner = el.querySelector('.tilda-block-inner');
    if (inner && def) {
      inner.innerHTML = renderBlockHtml(def, blk.content, blk.design);
      this.bindInlineEditing(inner, blk);
      this.bindBlockCustomElements(el, blk);
      this.applyBlockStyles(el, blk);
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

    if (Array.isArray(clone.blocks)) {
      clone.blocks.forEach(b => {
        b.instanceId = 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      });
    }

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
      const animAttr = (blk.animation && blk.animation.type && blk.animation.type !== 'none')
        ? ` data-tilda-anim="${blk.animation.type}" data-anim-delay="${blk.animation.delay || 0}" data-anim-duration="${blk.animation.duration || 0.7}"`
        : '';
      const anchorAttr = blk.anchor ? ` data-anchor="${escapeHtml(blk.anchor)}"` : '';
      const blockId = blk.anchor || blk.instanceId;
      return `<section id="${blockId}" class="tilda-block"${anchorAttr}${animAttr}>\n${renderBlockHtml(def, blk.content, blk.design)}\n</section>`;
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
  
  ${isZip ? '<link rel="stylesheet" href="css/style.css">' : '<link rel="stylesheet" href="style.css">'}
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
    .tilda-block { width: 100%; position: relative; overflow: hidden; }

    /* Animations Engine */
    @keyframes auroraFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes auroraSlideUp { from { opacity: 0; transform: translateY(45px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes auroraSlideDown { from { opacity: 0; transform: translateY(-45px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes auroraSlideLeft { from { opacity: 0; transform: translateX(55px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes auroraSlideRight { from { opacity: 0; transform: translateX(-55px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes auroraZoomIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
    @keyframes auroraFlipUp { from { opacity: 0; transform: perspective(800px) rotateX(25deg) translateY(30px); } to { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); } }
    @keyframes auroraBounce { 0% { opacity: 0; transform: scale(0.6) translateY(40px); } 60% { opacity: 1; transform: scale(1.05) translateY(-8px); } 80% { transform: scale(0.98) translateY(4px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

    .anim-fade-in { animation: auroraFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-slide-up { animation: auroraSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-slide-down { animation: auroraSlideDown 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-slide-left { animation: auroraSlideLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-slide-right { animation: auroraSlideRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-zoom-in { animation: auroraZoomIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-flip-up { animation: auroraFlipUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-bounce { animation: auroraBounce 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    [data-tilda-anim] {
      transition-property: opacity, transform;
      transition-duration: 0.7s;
      transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
      will-change: opacity, transform;
    }
    [data-tilda-anim="fade-in"] { opacity: 0; }
    [data-tilda-anim="fade-in"].tilda-animated-in { opacity: 1; }
    [data-tilda-anim="slide-up"] { opacity: 0; transform: translateY(45px); }
    [data-tilda-anim="slide-up"].tilda-animated-in { opacity: 1; transform: translateY(0); }
    [data-tilda-anim="slide-down"] { opacity: 0; transform: translateY(-45px); }
    [data-tilda-anim="slide-down"].tilda-animated-in { opacity: 1; transform: translateY(0); }
    [data-tilda-anim="slide-left"] { opacity: 0; transform: translateX(60px); }
    [data-tilda-anim="slide-left"].tilda-animated-in { opacity: 1; transform: translateX(0); }
    [data-tilda-anim="slide-right"] { opacity: 0; transform: translateX(-60px); }
    [data-tilda-anim="slide-right"].tilda-animated-in { opacity: 1; transform: translateX(0); }
    [data-tilda-anim="zoom-in"] { opacity: 0; transform: scale(0.88); }
    [data-tilda-anim="zoom-in"].tilda-animated-in { opacity: 1; transform: scale(1); }
    [data-tilda-anim="flip-up"] { opacity: 0; transform: perspective(800px) rotateX(25deg) translateY(30px); }
    [data-tilda-anim="flip-up"].tilda-animated-in { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); }
    [data-tilda-anim="bounce"] { opacity: 0; transform: scale(0.7); }
    [data-tilda-anim="bounce"].tilda-animated-in { animation: auroraBounce 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    @media (max-width: 768px) {
      .t-container { padding: 0 16px; }
      .t-nav-links { display: none !important; }
    }
  </style>
</head>
<body>
${blocksHtml}
${isZip ? '<script src="js/runtime.js"></script>' : '<script src="tilda_runtime.js"></script>'}


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

/* Animations Engine */
@keyframes auroraFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes auroraSlideUp { from { opacity: 0; transform: translateY(45px); } to { opacity: 1; transform: translateY(0); } }
@keyframes auroraSlideDown { from { opacity: 0; transform: translateY(-45px); } to { opacity: 1; transform: translateY(0); } }
@keyframes auroraSlideLeft { from { opacity: 0; transform: translateX(55px); } to { opacity: 1; transform: translateX(0); } }
@keyframes auroraSlideRight { from { opacity: 0; transform: translateX(-55px); } to { opacity: 1; transform: translateX(0); } }
@keyframes auroraZoomIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
@keyframes auroraFlipUp { from { opacity: 0; transform: perspective(800px) rotateX(25deg) translateY(30px); } to { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); } }
@keyframes auroraBounce { 0% { opacity: 0; transform: scale(0.6) translateY(40px); } 60% { opacity: 1; transform: scale(1.05) translateY(-8px); } 80% { transform: scale(0.98) translateY(4px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

.anim-fade-in { animation: auroraFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-slide-up { animation: auroraSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-slide-down { animation: auroraSlideDown 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-slide-left { animation: auroraSlideLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-slide-right { animation: auroraSlideRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-zoom-in { animation: auroraZoomIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-flip-up { animation: auroraFlipUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.anim-bounce { animation: auroraBounce 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

[data-tilda-anim] {
  transition-property: opacity, transform;
  transition-duration: 0.7s;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
[data-tilda-anim="fade-in"] { opacity: 0; }
[data-tilda-anim="fade-in"].tilda-animated-in { opacity: 1; }
[data-tilda-anim="slide-up"] { opacity: 0; transform: translateY(45px); }
[data-tilda-anim="slide-up"].tilda-animated-in { opacity: 1; transform: translateY(0); }
[data-tilda-anim="slide-down"] { opacity: 0; transform: translateY(-45px); }
[data-tilda-anim="slide-down"].tilda-animated-in { opacity: 1; transform: translateY(0); }
[data-tilda-anim="slide-left"] { opacity: 0; transform: translateX(60px); }
[data-tilda-anim="slide-left"].tilda-animated-in { opacity: 1; transform: translateX(0); }
[data-tilda-anim="slide-right"] { opacity: 0; transform: translateX(-60px); }
[data-tilda-anim="slide-right"].tilda-animated-in { opacity: 1; transform: translateX(0); }
[data-tilda-anim="zoom-in"] { opacity: 0; transform: scale(0.88); }
[data-tilda-anim="zoom-in"].tilda-animated-in { opacity: 1; transform: scale(1); }
[data-tilda-anim="flip-up"] { opacity: 0; transform: perspective(800px) rotateX(25deg) translateY(30px); }
[data-tilda-anim="flip-up"].tilda-animated-in { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); }
[data-tilda-anim="bounce"] { opacity: 0; transform: scale(0.7); }
[data-tilda-anim="bounce"].tilda-animated-in { animation: auroraBounce 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@media (max-width: 768px) {
  .t-container { padding: 0 16px; }
  .t-nav-links { display: none !important; }
}
`;
  }

  showLinkEditorForElement(linkEl) {
    this.initFloatingTextToolbar();
    const toolbar = document.getElementById('aurora-text-link-toolbar');
    const popover = toolbar?.querySelector('#floating-link-popover');
    const urlInput = toolbar?.querySelector('#floating-link-url-input');
    const anchorSelect = toolbar?.querySelector('#floating-link-anchor-select');
    const blankChk = toolbar?.querySelector('#chk-floating-link-blank');
    if (!toolbar || !popover) return;

    if (anchorSelect) {
      anchorSelect.innerHTML = '<option value="">-- Выбрать якорь страницы --</option>' +
        this.getPageAnchorsList().map(a => `<option value="${a.value}">${a.label}</option>`).join('');
    }

    if (urlInput) urlInput.value = linkEl.getAttribute('href') || '';
    if (blankChk) blankChk.checked = linkEl.getAttribute('target') === '_blank';

    const rect = linkEl.getBoundingClientRect();
    toolbar.style.display = 'flex';
    popover.style.display = 'flex';
    const tbW = 320;
    const left = Math.max(10, Math.min(window.innerWidth - tbW - 20, rect.left + rect.width / 2 - tbW / 2));
    const top = Math.max(10, rect.top - 70);
    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
    urlInput?.focus();
  }

  initFloatingTextToolbar() {
    if (document.getElementById('aurora-text-link-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'aurora-text-link-toolbar';
    toolbar.className = 'aurora-floating-text-toolbar';
    toolbar.style.display = 'none';

    toolbar.innerHTML = `
      <div class="text-format-group">
        <div class="floating-toolbar-drag-handle" id="drag-handle-floating-toolbar" title="Потяните для перемещения окна">⠿</div>
        <button class="text-tool-btn" id="btn-text-bold" type="button" title="Жирный (Ctrl+B)"><b>B</b></button>
        <button class="text-tool-btn" id="btn-text-italic" type="button" title="Курсив (Ctrl+I)"><i>I</i></button>
        <button class="text-tool-btn" id="btn-text-underline" type="button" title="Подчеркнутый (Ctrl+U)"><u>U</u></button>
        <button class="text-tool-btn" id="btn-text-strike" type="button" title="Зачеркнутый"><s>S</s></button>
        <div class="text-tool-divider"></div>
        <button class="text-tool-btn" id="btn-text-link" type="button" title="Добавить / изменить ссылку (🔗)">
          <span class="material-symbols-rounded" style="font-size:16px;">link</span>
        </button>
        <button class="text-tool-btn" id="btn-text-unlink" type="button" title="Удалить ссылку">
          <span class="material-symbols-rounded" style="font-size:16px;color:#f43f5e;">link_off</span>
        </button>
        <div class="text-tool-divider"></div>
        <div class="text-tool-color-wrap" title="Цвет текста">
          <input type="color" id="input-text-color-picker" value="#0d99ff" />
          <span class="material-symbols-rounded" style="font-size:16px;">format_color_text</span>
        </div>
        <button class="text-tool-btn" id="btn-text-clean" type="button" title="Очистить форматирование">
          <span class="material-symbols-rounded" style="font-size:16px;">format_clear</span>
        </button>
        <div class="text-tool-divider"></div>
        <button class="text-tool-btn text-tool-close-btn" id="btn-text-toolbar-close" type="button" title="Закрыть панель (Esc)">
          <span class="material-symbols-rounded" style="font-size:16px;">close</span>
        </button>
      </div>

      <div class="floating-link-popover" id="floating-link-popover" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:2px;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;">🔗 Настройка ссылки</span>
          <button type="button" id="btn-close-link-popover" class="text-tool-btn" style="width:20px;height:20px;font-size:13px;color:#94a3b8;" title="Закрыть (Esc)">✕</button>
        </div>
        <div class="link-popover-row">
          <span class="material-symbols-rounded" style="font-size:16px;color:#0d99ff;">link</span>
          <input type="text" id="floating-link-url-input" placeholder="https://... или #якорь" />
          <button class="link-popover-btn btn-primary" id="btn-apply-floating-link" type="button">Применить</button>
          <button class="link-popover-btn btn-danger" id="btn-delete-floating-link" type="button" title="Удалить ссылку">✕</button>
        </div>
        <div class="link-popover-anchors-row">
          <label>Якорь:</label>
          <select id="floating-link-anchor-select" class="floating-anchor-dropdown">
            <option value="">-- Выбрать якорь страницы --</option>
          </select>
        </div>
        <div class="link-popover-options">
          <label class="insp-checkbox">
            <input type="checkbox" id="chk-floating-link-blank" /> Открывать в новой вкладке (target="_blank")
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(toolbar);

    let savedRange = null;

    const updateSavedRange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    };

    const restoreSavedRange = () => {
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    };

    const hideToolbar = () => {
      toolbar.style.display = 'none';
      const p = toolbar.querySelector('#floating-link-popover');
      if (p) p.style.display = 'none';
    };

    // Draggable toolbar logic
    const dragHandle = toolbar.querySelector('#drag-handle-floating-toolbar');
    let isToolbarDragging = false;
    let tbStartX = 0, tbStartY = 0;
    let tbStartLeft = 0, tbStartTop = 0;

    dragHandle?.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      isToolbarDragging = true;
      tbStartX = e.clientX;
      tbStartY = e.clientY;
      const rect = toolbar.getBoundingClientRect();
      tbStartLeft = rect.left;
      tbStartTop = rect.top;

      const onMouseMove = ev => {
        if (!isToolbarDragging) return;
        const dx = ev.clientX - tbStartX;
        const dy = ev.clientY - tbStartY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - toolbar.offsetWidth - 10, tbStartLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - toolbar.offsetHeight - 10, tbStartTop + dy));
        toolbar.style.left = `${newLeft}px`;
        toolbar.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isToolbarDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp, { once: true });
    });

    // Close buttons & Escape key
    toolbar.querySelector('#btn-text-toolbar-close')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      hideToolbar();
    });

    toolbar.querySelector('#btn-close-link-popover')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const p = toolbar.querySelector('#floating-link-popover');
      if (p) p.style.display = 'none';
      if (!window.getSelection() || window.getSelection().isCollapsed) {
        toolbar.style.display = 'none';
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && toolbar.style.display !== 'none') {
        hideToolbar();
      }
    });

    // Format buttons
    toolbar.querySelector('#btn-text-bold')?.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('bold', false, null);
      this.saveHistory();
    });
    toolbar.querySelector('#btn-text-italic')?.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('italic', false, null);
      this.saveHistory();
    });
    toolbar.querySelector('#btn-text-underline')?.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('underline', false, null);
      this.saveHistory();
    });
    toolbar.querySelector('#btn-text-strike')?.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('strikeThrough', false, null);
      this.saveHistory();
    });
    toolbar.querySelector('#btn-text-clean')?.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('removeFormat', false, null);
      this.saveHistory();
    });

    toolbar.querySelector('#input-text-color-picker')?.addEventListener('input', e => {
      restoreSavedRange();
      document.execCommand('foreColor', false, e.target.value);
      this.saveHistory();
    });

    // Link popover toggling
    const linkBtn = toolbar.querySelector('#btn-text-link');
    const popover = toolbar.querySelector('#floating-link-popover');
    const urlInput = toolbar.querySelector('#floating-link-url-input');
    const anchorSelect = toolbar.querySelector('#floating-link-anchor-select');
    const blankChk = toolbar.querySelector('#chk-floating-link-blank');

    linkBtn?.addEventListener('mousedown', e => {
      e.preventDefault();
      updateSavedRange();
      const isVisible = popover.style.display !== 'none';
      if (isVisible) {
        popover.style.display = 'none';
      } else {
        popover.style.display = 'flex';
        if (anchorSelect) {
          anchorSelect.innerHTML = '<option value="">-- Выбрать якорь страницы --</option>' +
            this.getPageAnchorsList().map(a => `<option value="${a.value}">${a.label}</option>`).join('');
        }

        let existingLink = null;
        if (savedRange) {
          const parentA = savedRange.commonAncestorContainer?.parentElement?.closest('a') || (savedRange.startContainer?.closest ? savedRange.startContainer.closest('a') : null);
          if (parentA) existingLink = parentA;
        }
        if (existingLink) {
          urlInput.value = existingLink.getAttribute('href') || '';
          blankChk.checked = existingLink.getAttribute('target') === '_blank';
        } else {
          urlInput.value = '';
          blankChk.checked = false;
        }
        urlInput.focus();
      }
    });

    anchorSelect?.addEventListener('change', () => {
      if (anchorSelect.value) {
        urlInput.value = anchorSelect.value;
      }
    });

    // Apply link
    toolbar.querySelector('#btn-apply-floating-link')?.addEventListener('click', e => {
      e.preventDefault();
      const url = urlInput.value.trim();
      if (!url) return;
      restoreSavedRange();

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let existingA = range.commonAncestorContainer?.parentElement?.closest('a');

        if (existingA) {
          existingA.setAttribute('href', url);
          if (blankChk.checked) {
            existingA.setAttribute('target', '_blank');
            existingA.setAttribute('rel', 'noopener noreferrer');
          } else {
            existingA.removeAttribute('target');
            existingA.removeAttribute('rel');
          }
        } else {
          document.execCommand('createLink', false, url);
          if (blankChk.checked && range.commonAncestorContainer) {
            const parent = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
            const newLinks = parent?.querySelectorAll(`a[href="${url}"]`);
            newLinks?.forEach(a => {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
              a.classList.add('t-inline-link');
            });
          }
        }
        this.saveHistory();
      }
      popover.style.display = 'none';
      toolbar.style.display = 'none';
    });

    // Delete link
    const unlinkAction = () => {
      restoreSavedRange();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const parentA = range.commonAncestorContainer?.parentElement?.closest('a') || (range.startContainer?.parentElement?.closest('a'));
        if (parentA) {
          const parent = parentA.parentNode;
          while (parentA.firstChild) parent.insertBefore(parentA.firstChild, parentA);
          parent.removeChild(parentA);
        } else {
          document.execCommand('unlink', false, null);
        }
        this.saveHistory();
      }
      popover.style.display = 'none';
      toolbar.style.display = 'none';
    };

    toolbar.querySelector('#btn-text-unlink')?.addEventListener('mousedown', e => {
      e.preventDefault();
      unlinkAction();
    });
    toolbar.querySelector('#btn-delete-floating-link')?.addEventListener('click', e => {
      e.preventDefault();
      unlinkAction();
    });

    // Handle selection on document
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        if (popover.style.display === 'none') {
          toolbar.style.display = 'none';
        }
        return;
      }

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 1 ? container : container.parentElement;

      const artboard = document.getElementById('tilda-artboard');
      if (!artboard || !artboard.contains(el)) {
        toolbar.style.display = 'none';
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        toolbar.style.display = 'none';
        return;
      }

      updateSavedRange();
      toolbar.style.display = 'flex';
      const tbW = toolbar.offsetWidth || 260;
      const left = Math.max(10, Math.min(window.innerWidth - tbW - 20, rect.left + rect.width / 2 - tbW / 2));
      const top = Math.max(10, rect.top - 46);
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${top}px`;
    });
  }
}
