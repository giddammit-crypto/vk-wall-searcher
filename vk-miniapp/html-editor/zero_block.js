/**
 * zero_block.js — Сверхбыстрый интерактивный редактор Zero Block в стиле Figma & Tilda
 * Поддерживает свободное позиционирование (drag-to-move), 8-точечный ресайз,
 * вращение, умные направляющие (snapping), инлайн-редактирование текста,
 * кастомные шрифты, адаптивность (5 брейкпоинтов) и плавный 60 FPS рендеринг без лагов.
 */

export const BREAKPOINTS = [1200, 960, 768, 480, 320];

export const POPULAR_ICONS = [
  'star', 'bolt', 'favorite', 'check_circle', 'shopping_cart', 'mail', 'call',
  'lock', 'rocket_launch', 'shield', 'verified', 'thumb_up', 'lightbulb',
  'visibility', 'location_on', 'schedule', 'settings', 'person', 'chat',
  'cloud_download', 'play_circle', 'help', 'search', 'home', 'share'
];

export const POPULAR_FONTS = [
  'Inter', 'Montserrat', 'Roboto', 'Playfair Display', 'Oswald',
  'JetBrains Mono', 'Fira Sans', 'Rubik', 'Open Sans', 'PT Sans'
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class ZeroBlockElement {
  constructor(type = 'text', initialProps = {}) {
    this.id = `zb_el_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.type = type; // 'text', 'h1', 'h2', 'h3', 'btn', 'img', 'shape', 'icon', 'form', 'code', 'tooltip'
    this.props = {
      x: 80,
      y: 80,
      width: 280,
      height: 60,
      rotation: 0,
      zIndex: 1,
      opacity: 1,
      container: 'grid', // 'grid' (1200px max) | 'window' (100% full width)
      content: 'Текстовый элемент',
      color: '#ffffff',
      bgColor: 'transparent',
      bgGradient: '',
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Inter',
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 0,
      borderRadius: '0px',
      borderWidth: '0px',
      borderStyle: 'solid',
      borderColor: '#0d99ff',
      boxShadow: 'none',
      url: '',
      targetBlank: false,
      lightbox: false,
      icon: 'star',
      animation: {
        type: 'none', // 'none' | 'fade-in' | 'slide-up' | 'zoom-in' | 'rotate' | 'bounce'
        duration: 0.6,
        delay: 0,
        trigger: 'scroll' // 'scroll' | 'hover' | 'load'
      },
      ...initialProps
    };

    if (type === 'h1') {
      this.props.fontSize = 38;
      this.props.fontWeight = '800';
      this.props.width = 560;
      this.props.height = 90;
      this.props.content = 'Заголовок Zero Block';
      this.props.fontFamily = 'Montserrat';
      this.props.lineHeight = 1.15;
    } else if (type === 'h2') {
      this.props.fontSize = 28;
      this.props.fontWeight = '700';
      this.props.width = 480;
      this.props.height = 70;
      this.props.content = 'Подзаголовок секции';
      this.props.fontFamily = 'Montserrat';
    } else if (type === 'h3') {
      this.props.fontSize = 22;
      this.props.fontWeight = '600';
      this.props.width = 400;
      this.props.height = 50;
      this.props.content = 'Заголовок блока H3';
      this.props.fontFamily = 'Montserrat';
    } else if (type === 'btn') {
      this.props.bgColor = '#0d99ff';
      this.props.color = '#ffffff';
      this.props.borderRadius = '8px';
      this.props.textAlign = 'center';
      this.props.width = 200;
      this.props.height = 48;
      this.props.fontSize = 15;
      this.props.fontWeight = '700';
      this.props.fontFamily = 'Montserrat';
      this.props.content = 'Кнопка действия';
      this.props.url = '#order';
      this.props.boxShadow = '0 6px 20px rgba(13, 153, 255, 0.35)';
    } else if (type === 'shape') {
      this.props.bgColor = 'rgba(13, 153, 255, 0.15)';
      this.props.borderWidth = '1.5px';
      this.props.borderStyle = 'solid';
      this.props.borderColor = '#0d99ff';
      this.props.borderRadius = '16px';
      this.props.width = 320;
      this.props.height = 200;
      this.props.content = '';
    } else if (type === 'img') {
      this.props.width = 460;
      this.props.height = 320;
      this.props.borderRadius = '16px';
      this.props.content = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80';
      this.props.lightbox = true;
      this.props.boxShadow = '0 16px 48px rgba(0,0,0,0.5)';
    } else if (type === 'icon') {
      this.props.width = 52;
      this.props.height = 52;
      this.props.fontSize = 36;
      this.props.color = '#0d99ff';
      this.props.icon = 'bolt';
      this.props.content = 'bolt';
      this.props.bgColor = 'rgba(13, 153, 255, 0.12)';
      this.props.borderRadius = '12px';
      this.props.borderWidth = '1px';
      this.props.borderColor = 'rgba(13, 153, 255, 0.3)';
    } else if (type === 'form') {
      this.props.width = 360;
      this.props.height = 240;
      this.props.bgColor = '#1e293b';
      this.props.borderRadius = '14px';
      this.props.borderWidth = '1px';
      this.props.borderColor = 'rgba(255, 255, 255, 0.1)';
      this.props.content = 'Оставить заявку';
    } else if (type === 'code') {
      this.props.width = 400;
      this.props.height = 220;
      this.props.content = '<div style="padding:20px;background:#1e293b;border-radius:12px;color:#38bdf8;text-align:center;">✨ Кастомный HTML код / Виджет</div>';
    }

    this.responsiveProps = {};
    BREAKPOINTS.forEach(bp => this.responsiveProps[bp] = {});
  }
}

export class ZeroBlock {
  constructor(data = {}) {
    this.id = data.id || `zb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.settings = {
      height: 600,
      background: '#070a13',
      backgroundImage: '',
      gridWidth: 1200,
      isOverflowHidden: true,
      ...(data.settings || {})
    };
    this.responsiveSettings = data.responsiveSettings || {};
    BREAKPOINTS.forEach(bp => {
      if (!this.responsiveSettings[bp]) this.responsiveSettings[bp] = {};
    });

    if (data.elements && Array.isArray(data.elements)) {
      this.elements = data.elements.map(e => {
        const el = new ZeroBlockElement(e.type, e.props);
        el.id = e.id || el.id;
        if (e.responsiveProps) el.responsiveProps = e.responsiveProps;
        return el;
      });
    } else {
      this.elements = [
        new ZeroBlockElement('h1', { x: 80, y: 100, content: 'Свободный креативный дизайн' }),
        new ZeroBlockElement('text', { x: 80, y: 205, width: 480, height: 80, fontSize: 16, color: '#94a3b8', content: 'Перетаскивайте любые элементы по свободным координатам холста, настраивайте 8-точечный ресайз, умные направляющие и адаптивность.' }),
        new ZeroBlockElement('btn', { x: 80, y: 305, content: 'Начать знакомство' }),
        new ZeroBlockElement('img', { x: 620, y: 90, width: 480, height: 340, borderRadius: '16px' })
      ];
    }
  }

  addElement(type, props = {}) {
    const el = new ZeroBlockElement(type, props);
    // Auto-calculate max z-index
    const maxZ = this.elements.reduce((max, e) => Math.max(max, e.props.zIndex || 1), 1);
    el.props.zIndex = maxZ + 1;
    this.elements.push(el);
    return el;
  }

  removeElement(id) {
    this.elements = this.elements.filter(el => el.id !== id);
  }

  cloneElement(id) {
    const orig = this.elements.find(e => e.id === id);
    if (!orig) return null;
    const clone = new ZeroBlockElement(orig.type, {
      ...orig.props,
      x: orig.props.x + 24,
      y: orig.props.y + 24,
      zIndex: (orig.props.zIndex || 1) + 1
    });
    this.elements.push(clone);
    return clone;
  }

  bringToFront(id) {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    const maxZ = this.elements.reduce((max, e) => Math.max(max, e.props.zIndex || 1), 1);
    el.props.zIndex = maxZ + 1;
  }

  sendToBack(id) {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    const minZ = this.elements.reduce((min, e) => Math.min(min, e.props.zIndex || 1), 1);
    el.props.zIndex = Math.max(1, minZ - 1);
  }

  moveUp(id) {
    const el = this.elements.find(e => e.id === id);
    if (el) el.props.zIndex = (el.props.zIndex || 1) + 1;
  }

  moveDown(id) {
    const el = this.elements.find(e => e.id === id);
    if (el) el.props.zIndex = Math.max(1, (el.props.zIndex || 1) - 1);
  }

  toJSON() {
    return {
      id: this.id,
      settings: { ...this.settings },
      responsiveSettings: { ...this.responsiveSettings },
      elements: this.elements.map(e => ({
        id: e.id,
        type: e.type,
        props: { ...e.props },
        responsiveProps: { ...e.responsiveProps }
      }))
    };
  }
}

export class ZeroBlockEditor {
  constructor(containerSelector, blockData = null) {
    this.container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    this.block = blockData instanceof ZeroBlock ? blockData : new ZeroBlock(blockData || {});
    this.selectedElementId = this.block.elements[0]?.id || null;
    this.activeBreakpoint = 1200;
    this.showGridGuides = true;
    this.isGridSnapping = true;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.dragStart = { x: 0, y: 0 };
    this.elStartPos = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    this._rafId = null;

    this.history = [];
    this.historyIdx = -1;

    this.init();
  }

  init() {
    this.render();
    this.bindKeyboardShortcuts();
    this.saveHistory();
  }

  saveHistory() {
    const state = JSON.stringify(this.block.toJSON());
    if (this.history[this.historyIdx] === state) return;
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(state);
    if (this.history.length > 30) this.history.shift();
    this.historyIdx = this.history.length - 1;
  }

  undo() {
    if (this.historyIdx > 0) {
      this.historyIdx--;
      const data = JSON.parse(this.history[this.historyIdx]);
      this.block = new ZeroBlock(data);
      this.render();
      this.onSelectionChange?.(this.getSelectedElement());
    }
  }

  redo() {
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      const data = JSON.parse(this.history[this.historyIdx]);
      this.block = new ZeroBlock(data);
      this.render();
      this.onSelectionChange?.(this.getSelectedElement());
    }
  }

  setBreakpoint(bp) {
    if (BREAKPOINTS.includes(bp)) {
      this.activeBreakpoint = bp;
      this.render();
      this.onSelectionChange?.(this.getSelectedElement());
    }
  }

  selectElement(id) {
    this.selectedElementId = id;
    this.updateSelectionClasses();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  getSelectedElement() {
    return this.block.elements.find(e => e.id === this.selectedElementId) || null;
  }

  deleteSelectedElement() {
    if (!this.selectedElementId) return;
    this.block.removeElement(this.selectedElementId);
    this.selectedElementId = this.block.elements[0]?.id || null;
    this.saveHistory();
    this.render();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  duplicateSelectedElement() {
    const selected = this.getSelectedElement();
    if (!selected) return;
    const clone = this.block.cloneElement(selected.id);
    if (clone) {
      this.selectedElementId = clone.id;
      this.saveHistory();
      this.render();
      this.onSelectionChange?.(clone);
    }
  }

  alignSelected(alignType) {
    const selected = this.getSelectedElement();
    if (!selected) return;
    const artboardW = Math.min(this.block.settings.gridWidth, this.activeBreakpoint);
    const artboardH = this.block.settings.height;

    switch (alignType) {
      case 'left': selected.props.x = 24; break;
      case 'center': selected.props.x = Math.max(0, Math.round((artboardW - selected.props.width) / 2)); break;
      case 'right': selected.props.x = Math.max(0, artboardW - selected.props.width - 24); break;
      case 'top': selected.props.y = 24; break;
      case 'middle': selected.props.y = Math.max(0, Math.round((artboardH - selected.props.height) / 2)); break;
      case 'bottom': selected.props.y = Math.max(0, artboardH - selected.props.height - 24); break;
    }
    this.saveHistory();
    this.render();
    this.onSelectionChange?.(selected);
  }

  autoLayoutMobile(targetBp = null) {
    const bp = targetBp || (this.activeBreakpoint < 1200 ? this.activeBreakpoint : 480);
    const contentWidth = Math.max(280, bp - 36);
    let currentY = 32;

    const sorted = [...this.block.elements].sort((a, b) => (a.props.y || 0) - (b.props.y || 0));

    sorted.forEach(el => {
      const p = el.props;
      if (['h1', 'h2', 'h3', 'text'].includes(el.type)) {
        if (el.type === 'h1') {
          p.fontSize = bp <= 320 ? 24 : (bp <= 480 ? 28 : 34);
        } else if (el.type === 'h2') {
          p.fontSize = bp <= 320 ? 20 : 22;
        } else if (el.type === 'text') {
          p.fontSize = Math.min(p.fontSize || 16, 15);
        }
        const elW = Math.min(p.width || contentWidth, contentWidth);
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        p.width = elW;
        currentY += (p.height || 50) + 18;
      } else if (el.type === 'btn') {
        const elW = Math.min(p.width || 240, contentWidth);
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        p.width = elW;
        currentY += (p.height || 48) + 22;
      } else if (el.type === 'img' || el.type === 'shape') {
        const elW = Math.min(p.width || contentWidth, contentWidth);
        const ratio = (p.height && p.width) ? (p.height / p.width) : 0.65;
        const elH = Math.round(elW * Math.min(1.2, Math.max(0.4, ratio)));
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        p.width = elW;
        p.height = Math.max(120, elH);
        currentY += p.height + 22;
      } else if (el.type === 'form' || el.type === 'code') {
        const elW = Math.min(p.width || contentWidth, contentWidth);
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        p.width = elW;
        currentY += (p.height || 220) + 24;
      } else if (el.type === 'icon') {
        const elW = p.width || 48;
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        currentY += (p.height || 48) + 16;
      } else {
        const elW = Math.min(p.width || contentWidth, contentWidth);
        const elX = Math.max(16, Math.round((bp - elW) / 2));
        p.x = elX;
        p.y = currentY;
        p.width = elW;
        currentY += (p.height || 40) + 18;
      }
    });

    this.block.settings.height = Math.max(currentY + 40, 460);
    this.activeBreakpoint = bp;
    this.saveHistory();
    this.render();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      const ae = document.activeElement;
      if (ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable)) return;

      const selected = this.getSelectedElement();
      if (!selected) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        this.duplicateSelectedElement();
        return;
      }

      if (cmdOrCtrl && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }

      if (cmdOrCtrl && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelectedElement();
        return;
      }

      if (e.key === 'Escape') {
        this.selectedElementId = null;
        this.updateSelectionClasses();
        this.onSelectionChange?.(null);
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      let handled = false;

      if (e.key === 'ArrowLeft') { selected.props.x -= step; handled = true; }
      else if (e.key === 'ArrowRight') { selected.props.x += step; handled = true; }
      else if (e.key === 'ArrowUp') { selected.props.y -= step; handled = true; }
      else if (e.key === 'ArrowDown') { selected.props.y += step; handled = true; }

      if (handled) {
        e.preventDefault();
        const elDom = this.container?.querySelector(`[data-el-id="${selected.id}"]`);
        if (elDom) {
          elDom.style.left = selected.props.x + 'px';
          elDom.style.top = selected.props.y + 'px';
        }
        this.onSelectionChange?.(selected);
      }
    });
  }

  updateSelectionClasses() {
    if (!this.container) return;
    this.container.querySelectorAll('.zero-el-wrapper').forEach(w => {
      const isSelected = w.dataset.elId === this.selectedElementId;
      w.classList.toggle('is-selected', isSelected);
      const handles = w.querySelector('.zero-handles-group');
      if (handles) handles.style.display = isSelected ? 'block' : 'none';
    });
  }

  render() {
    if (!this.container) return;
    const gridW = Math.min(this.block.settings.gridWidth, this.activeBreakpoint);

    let elementsHtml = '';
    // Sort elements by zIndex for correct rendering stack
    const sortedElements = [...this.block.elements].sort((a, b) => (a.props.zIndex || 1) - (b.props.zIndex || 1));

    sortedElements.forEach(el => {
      const isSelected = el.id === this.selectedElementId;
      const p = el.props;

      let innerContent = '';
      if (el.type === 'img') {
        innerContent = `
          <img src="${p.content}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius};box-shadow:${p.boxShadow || 'none'};pointer-events:none;border:${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor};" alt="" />
        `;
      } else if (el.type === 'shape') {
        innerContent = `
          <div style="width:100%;height:100%;border-radius:${p.borderRadius};background:${p.bgColor};border:${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor};box-shadow:${p.boxShadow || 'none'};box-sizing:border-box;"></div>
        `;
      } else if (el.type === 'btn') {
        innerContent = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor};color:${p.color};border-radius:${p.borderRadius};font-size:${p.fontSize}px;font-weight:${p.fontWeight};font-family:'${p.fontFamily}',sans-serif;user-select:none;box-sizing:border-box;border:${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor};box-shadow:${p.boxShadow || 'none'};letter-spacing:${p.letterSpacing || 0}px;cursor:pointer;">
            ${escapeHtml(p.content)}
          </div>
        `;
      } else if (el.type === 'icon') {
        innerContent = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color};font-size:${p.fontSize}px;background:${p.bgColor};border-radius:${p.borderRadius};border:${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor};box-shadow:${p.boxShadow || 'none'};">
            <span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || 'star'}</span>
          </div>
        `;
      } else if (el.type === 'form') {
        innerContent = `
          <div style="width:100%;height:100%;padding:16px;background:${p.bgColor};border-radius:${p.borderRadius};border:${p.borderWidth} ${p.borderStyle || 'solid'} ${p.borderColor};box-shadow:${p.boxShadow || 'none'};display:flex;flex-direction:column;gap:8px;box-sizing:border-box;pointer-events:none;">
            <div style="font-size:14px;font-weight:700;color:${p.color};">${escapeHtml(p.content || 'Оставить заявку')}</div>
            <input type="text" placeholder="Ваше имя" style="padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
            <input type="tel" placeholder="+7 (999) 000-00-00" style="padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;" />
            <button type="button" style="padding:8px 16px;background:#0d99ff;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:12px;">Отправить</button>
          </div>
        `;
      } else if (el.type === 'code') {
        innerContent = `
          <div style="width:100%;height:100%;overflow:hidden;box-sizing:border-box;">${p.content || ''}</div>
        `;
      } else {
        // Headings (h1, h2, h3) & Text
        innerContent = `
          <div class="zero-inline-text-box" style="width:100%;height:100%;font-size:${p.fontSize}px;font-weight:${p.fontWeight};color:${p.color};line-height:${p.lineHeight || 1.3};text-align:${p.textAlign};font-family:'${p.fontFamily}',sans-serif;letter-spacing:${p.letterSpacing || 0}px;word-break:break-word;outline:none;">
            ${p.content}
          </div>
        `;
      }

      const animType = p.animation?.type || 'none';
      const animAttr = animType !== 'none'
        ? `data-tilda-anim="${animType}" data-anim-delay="${p.animation?.delay || 0}" data-anim-duration="${p.animation?.duration || 0.6}"`
        : '';

      elementsHtml += `
        <div class="zero-el-wrapper ${isSelected ? 'is-selected' : ''}" data-el-id="${el.id}" ${animAttr} style="position:absolute;left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation}deg);opacity:${p.opacity !== undefined ? p.opacity : 1};z-index:${p.zIndex || 1};cursor:move;box-sizing:border-box;">
          ${innerContent}
          <div class="zero-handles-group" style="display:${isSelected ? 'block' : 'none'};">
            <!-- Floating Quick Actions Bar -->
            <div class="zero-floating-bar" style="position:absolute;top:-52px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px;background:rgba(15,23,42,0.95);border:1px solid rgba(13,153,255,0.45);border-radius:8px;padding:3px 6px;box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:10001;white-space:nowrap;">
              <span class="zero-float-drag" title="Перетащить элемент" style="cursor:grab;padding:2px 5px;color:#38bdf8;font-size:13px;font-weight:700;user-select:none;">⠿</span>
              <button type="button" class="zero-float-btn" data-zb-action="duplicate" title="Дублировать (Ctrl+D)" style="background:transparent;border:none;color:#e2e8f0;cursor:pointer;padding:2px 5px;border-radius:4px;font-size:12px;">📋</button>
              <button type="button" class="zero-float-btn" data-zb-action="front" title="На передний план" style="background:transparent;border:none;color:#e2e8f0;cursor:pointer;padding:2px 5px;border-radius:4px;font-size:12px;">⬆️</button>
              <button type="button" class="zero-float-btn" data-zb-action="delete" title="Удалить (Delete)" style="background:transparent;border:none;color:#f43f5e;cursor:pointer;padding:2px 5px;border-radius:4px;font-size:12px;">🗑️</button>
            </div>
            <!-- 8 Resizing Handles -->
            <div class="zero-resizer handle-nw" data-handle="nw"></div>
            <div class="zero-resizer handle-n" data-handle="n"></div>
            <div class="zero-resizer handle-ne" data-handle="ne"></div>
            <div class="zero-resizer handle-e" data-handle="e"></div>
            <div class="zero-resizer handle-se" data-handle="se"></div>
            <div class="zero-resizer handle-s" data-handle="s"></div>
            <div class="zero-resizer handle-sw" data-handle="sw"></div>
            <div class="zero-resizer handle-w" data-handle="w"></div>
            <!-- Rotation Handle -->
            <div class="zero-rotator" data-handle="rotate" title="Вращение (зажмите и тяните)"></div>
            <!-- Dimension & Angle floating badge -->
            <div class="zero-dim-badge" style="display:none;">${p.width} × ${p.height}</div>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="zero-editor-artboard" style="position:relative;width:100%;max-width:${gridW}px;margin:0 auto;height:${this.block.settings.height}px;background:${this.block.settings.background};box-shadow:0 24px 64px rgba(0,0,0,0.7);overflow:${this.block.settings.isOverflowHidden ? 'hidden' : 'visible'};border:1px solid rgba(255,255,255,0.12);border-radius:8px;transition:max-width 0.25s ease;">
        <!-- Сетка колонок Tilda 12 cols -->
        <div class="zero-grid-guides" style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;padding:0 20px;pointer-events:none;opacity:${this.showGridGuides ? '0.05' : '0'};transition:opacity 0.2s;">
          ${Array(12).fill('<div style="background:#0d99ff;height:100%;"></div>').join('')}
        </div>
        <!-- Линии направляющих примагничивания -->
        <div class="zero-guide-line zero-guide-x" style="display:none;position:absolute;top:0;bottom:0;width:1px;background:#a855f7;box-shadow:0 0 8px #a855f7;z-index:9999;pointer-events:none;"></div>
        <div class="zero-guide-line zero-guide-y" style="display:none;position:absolute;left:0;right:0;height:1px;background:#a855f7;box-shadow:0 0 8px #a855f7;z-index:9999;pointer-events:none;"></div>
        ${elementsHtml}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const artboard = this.container.querySelector('.zero-editor-artboard');
    if (!artboard) return;

    const guideX = artboard.querySelector('.zero-guide-x');
    const guideY = artboard.querySelector('.zero-guide-y');

    artboard.addEventListener('mousedown', e => {
      if (e.target === artboard || e.target.classList.contains('zero-grid-guides')) {
        this.selectedElementId = null;
        this.updateSelectionClasses();
        this.onSelectionChange?.(null);
      }
    });

    // Floating quick action buttons
    artboard.querySelectorAll('.zero-float-btn[data-zb-action]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.stopPropagation());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.zbAction;
        const wrapper = btn.closest('.zero-el-wrapper');
        const id = wrapper?.dataset.elId;
        if (!id) return;
        this.selectElement(id);
        if (action === 'duplicate') {
          this.duplicateSelectedElement();
        } else if (action === 'front') {
          this.block.bringToFront(id);
          this.saveHistory();
          this.render();
          this.onSelectionChange?.(this.getSelectedElement());
        } else if (action === 'delete') {
          this.deleteSelectedElement();
        }
      });
    });

    // Inline direct editing on double click
    artboard.querySelectorAll('.zero-el-wrapper').forEach(elWrapper => {
      const elId = elWrapper.dataset.elId;
      const el = this.block.elements.find(e => e.id === elId);

      elWrapper.addEventListener('dblclick', e => {
        if (!el || !['text', 'h1', 'h2', 'h3', 'btn'].includes(el.type)) return;
        e.stopPropagation();

        const textBox = elWrapper.querySelector('.zero-inline-text-box') || elWrapper.querySelector('div');
        if (!textBox) return;

        textBox.contentEditable = 'true';
        textBox.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textBox);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        const onBlur = () => {
          textBox.contentEditable = 'false';
          el.props.content = textBox.innerText.trim();
          this.saveHistory();
          this.onSelectionChange?.(el);
          textBox.removeEventListener('blur', onBlur);
        };

        textBox.addEventListener('blur', onBlur);
      });
    });

    // Drag-to-move 60 FPS with Smart Snapping
    artboard.querySelectorAll('.zero-el-wrapper').forEach(elWrapper => {
      elWrapper.addEventListener('mousedown', e => {
        if (e.target.dataset.handle || e.target.isContentEditable || e.target.closest('.zero-float-btn')) return;
        e.stopPropagation();
        const id = elWrapper.dataset.elId;
        this.selectElement(id);

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        const selected = this.getSelectedElement();
        if (!selected) return;

        const dimBadge = elWrapper.querySelector('.zero-dim-badge');
        this.elStartPos = { x: selected.props.x, y: selected.props.y };

        const onMouseMove = ev => {
          if (!this.isDragging) return;
          if (this._rafId) cancelAnimationFrame(this._rafId);

          this._rafId = requestAnimationFrame(() => {
            const zoom = (typeof window.getCanvasZoom === 'function') ? window.getCanvasZoom() : 1;
            let dx = (ev.clientX - this.dragStart.x) / zoom;
            let dy = (ev.clientY - this.dragStart.y) / zoom;

            // Shift key locks movement to dominant axis
            if (ev.shiftKey) {
              if (Math.abs(dx) > Math.abs(dy)) dy = 0;
              else dx = 0;
            }

            let nx = Math.round(this.elStartPos.x + dx);
            let ny = Math.round(this.elStartPos.y + dy);

            // Magnetic snapping to Artboard Center & Neighboring Elements
            const artboardW = artboard.clientWidth;
            const artboardH = artboard.clientHeight;
            const w = selected.props.width;
            const h = selected.props.height;

            let snappedX = false;
            let snappedY = false;
            let guideXPos = null;
            let guideYPos = null;

            // 1. Artboard Center X & Y
            if (Math.abs((nx + w / 2) - artboardW / 2) < 8) {
              nx = Math.round(artboardW / 2 - w / 2);
              snappedX = true;
              guideXPos = Math.round(artboardW / 2);
            }
            if (Math.abs((ny + h / 2) - artboardH / 2) < 8) {
              ny = Math.round(artboardH / 2 - h / 2);
              snappedY = true;
              guideYPos = Math.round(artboardH / 2);
            }

            // 2. Neighboring Elements Snapping (< 6px)
            for (const other of this.block.elements) {
              if (other.id === selected.id) continue;
              const ox = other.props.x;
              const oy = other.props.y;
              const ow = other.props.width;
              const oh = other.props.height;
              const oRight = ox + ow;
              const oBottom = oy + oh;
              const oCenterX = ox + ow / 2;
              const oCenterY = oy + oh / 2;

              if (!snappedX) {
                if (Math.abs(nx - ox) < 6) {
                  nx = ox; snappedX = true; guideXPos = ox;
                } else if (Math.abs(nx - oRight) < 6) {
                  nx = oRight; snappedX = true; guideXPos = oRight;
                } else if (Math.abs((nx + w) - ox) < 6) {
                  nx = ox - w; snappedX = true; guideXPos = ox;
                } else if (Math.abs((nx + w) - oRight) < 6) {
                  nx = oRight - w; snappedX = true; guideXPos = oRight;
                } else if (Math.abs((nx + w / 2) - oCenterX) < 6) {
                  nx = Math.round(oCenterX - w / 2); snappedX = true; guideXPos = Math.round(oCenterX);
                }
              }

              if (!snappedY) {
                if (Math.abs(ny - oy) < 6) {
                  ny = oy; snappedY = true; guideYPos = oy;
                } else if (Math.abs(ny - oBottom) < 6) {
                  ny = oBottom; snappedY = true; guideYPos = oBottom;
                } else if (Math.abs((ny + h) - oy) < 6) {
                  ny = oy - h; snappedY = true; guideYPos = oy;
                } else if (Math.abs((ny + h) - oBottom) < 6) {
                  ny = oBottom - h; snappedY = true; guideYPos = oBottom;
                } else if (Math.abs((ny + h / 2) - oCenterY) < 6) {
                  ny = Math.round(oCenterY - h / 2); snappedY = true; guideYPos = Math.round(oCenterY);
                }
              }
            }

            // 3. Grid Snapping (4px step, or 1px when Alt is pressed)
            if (this.isGridSnapping) {
              const step = ev.altKey ? 1 : 4;
              if (!snappedX) nx = Math.round(nx / step) * step;
              if (!snappedY) ny = Math.round(ny / step) * step;
            }

            if (guideX) {
              if (snappedX && guideXPos !== null) {
                guideX.style.display = 'block';
                guideX.style.left = guideXPos + 'px';
              } else {
                guideX.style.display = 'none';
              }
            }

            if (guideY) {
              if (snappedY && guideYPos !== null) {
                guideY.style.display = 'block';
                guideY.style.top = guideYPos + 'px';
              } else {
                guideY.style.display = 'none';
              }
            }

            selected.props.x = nx;
            selected.props.y = ny;
            elWrapper.style.left = nx + 'px';
            elWrapper.style.top = ny + 'px';

            if (dimBadge) {
              dimBadge.style.display = 'block';
              dimBadge.textContent = `X: ${nx}, Y: ${ny}`;
            }

            const inpX = document.getElementById('zb-el-x');
            const inpY = document.getElementById('zb-el-y');
            if (inpX) inpX.value = nx;
            if (inpY) inpY.value = ny;
          });
        };

        const onMouseUp = () => {
          this.isDragging = false;
          if (guideX) guideX.style.display = 'none';
          if (guideY) guideY.style.display = 'none';
          if (dimBadge) dimBadge.style.display = 'none';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.saveHistory();
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp, { once: true });
      });
    });

    // 8-point Resizing with Live Measurement Badge
    artboard.querySelectorAll('.zero-resizer').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.stopPropagation();
        const hType = handle.dataset.handle;
        const selected = this.getSelectedElement();
        if (!selected) return;

        const elWrapper = handle.closest('.zero-el-wrapper');
        const dimBadge = elWrapper?.querySelector('.zero-dim-badge');
        const startW = selected.props.width;
        const startH = selected.props.height;
        const startX = selected.props.x;
        const startY = selected.props.y;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        if (dimBadge) dimBadge.style.display = 'block';

        const onResizeMove = ev => {
          if (this._rafId) cancelAnimationFrame(this._rafId);

          this._rafId = requestAnimationFrame(() => {
            const zoom = (typeof window.getCanvasZoom === 'function') ? window.getCanvasZoom() : 1;
            const dx = (ev.clientX - startMouseX) / zoom;
            const dy = (ev.clientY - startMouseY) / zoom;

            let nw = startW;
            let nh = startH;
            let nx = startX;
            let ny = startY;

            if (hType.includes('e')) nw = Math.max(20, Math.round(startW + dx));
            if (hType.includes('s')) nh = Math.max(20, Math.round(startH + dy));
            if (hType.includes('w')) {
              const potentialW = Math.max(20, Math.round(startW - dx));
              nx = Math.round(startX + (startW - potentialW));
              nw = potentialW;
            }
            if (hType.includes('n')) {
              const potentialH = Math.max(20, Math.round(startH - dy));
              ny = Math.round(startY + (startH - potentialH));
              nh = potentialH;
            }

            selected.props.width = nw;
            selected.props.height = nh;
            selected.props.x = nx;
            selected.props.y = ny;

            if (elWrapper) {
              elWrapper.style.width = nw + 'px';
              elWrapper.style.height = nh + 'px';
              elWrapper.style.left = nx + 'px';
              elWrapper.style.top = ny + 'px';
            }
            if (dimBadge) dimBadge.textContent = `${nw} × ${nh}`;
          });
        };

        const onResizeUp = () => {
          if (dimBadge) dimBadge.style.display = 'none';
          window.removeEventListener('mousemove', onResizeMove);
          window.removeEventListener('mouseup', onResizeUp);
          this.saveHistory();
          this.render();
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onResizeMove, { passive: true });
        window.addEventListener('mouseup', onResizeUp, { once: true });
      });
    });

    // Rotation Handle
    artboard.querySelectorAll('.zero-rotator').forEach(rot => {
      rot.addEventListener('mousedown', e => {
        e.stopPropagation();
        const selected = this.getSelectedElement();
        if (!selected) return;

        const elWrapper = rot.closest('.zero-el-wrapper');
        const dimBadge = elWrapper?.querySelector('.zero-dim-badge');
        const rect = elWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (dimBadge) dimBadge.style.display = 'block';

        const onRotateMove = ev => {
          if (this._rafId) cancelAnimationFrame(this._rafId);
          this._rafId = requestAnimationFrame(() => {
            const rad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
            let deg = Math.round(rad * (180 / Math.PI) - 90);
            if (deg < 0) deg += 360;
            if (ev.shiftKey) deg = Math.round(deg / 15) * 15; // 15-deg step with Shift
            selected.props.rotation = deg;
            if (elWrapper) elWrapper.style.transform = `rotate(${deg}deg)`;
            if (dimBadge) dimBadge.textContent = `${deg}°`;
          });
        };

        const onRotateUp = () => {
          if (dimBadge) dimBadge.style.display = 'none';
          window.removeEventListener('mousemove', onRotateMove);
          window.removeEventListener('mouseup', onRotateUp);
          this.saveHistory();
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onRotateMove, { passive: true });
        window.addEventListener('mouseup', onRotateUp, { once: true });
      });
    });
  }

  // ─── Zero Block Inspector Renderer ───────────────────────────
  renderInspector(panelEl, pageAnchorsList = []) {
    if (!panelEl) return;
    const selected = this.getSelectedElement();

    if (!selected) {
      // Artboard Settings
      panelEl.innerHTML = `
        <div class="tilda-inspector-header">
          <div class="insp-title">
            <span class="material-symbols-rounded" style="color:#0d99ff;">tune</span>
            <span>Параметры Zero Block</span>
          </div>
        </div>
        <div class="tilda-inspector-body">
          <div class="insp-section-title">Размер и фон холста</div>
          <div class="insp-field">
            <label>Высота холста (px)</label>
            <input type="number" id="zb-artboard-height" min="200" max="2400" step="20" value="${this.block.settings.height}" />
          </div>
          <div class="insp-field">
            <label>Цвет фона</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="zb-bg-color-picker" value="${this.block.settings.background || '#070a13'}" />
              <input type="text" id="zb-bg-color-text" value="${this.block.settings.background || '#070a13'}" style="flex:1;" />
            </div>
            <div class="color-presets-row">
              <span class="color-swatch-chip" style="background:#070a13;" data-color="#070a13" title="#070a13"></span>
              <span class="color-swatch-chip" style="background:#0f172a;" data-color="#0f172a" title="#0f172a"></span>
              <span class="color-swatch-chip" style="background:#000000;" data-color="#000000" title="#000000"></span>
              <span class="color-swatch-chip" style="background:#ffffff;" data-color="#ffffff" title="#ffffff"></span>
              <span class="color-swatch-chip" style="background:#0d99ff;" data-color="#0d99ff" title="#0d99ff"></span>
            </div>
          </div>
          <div class="insp-field">
            <label>Фоновое изображение (URL)</label>
            <input type="text" id="zb-bg-img-input" value="${escapeHtml(this.block.settings.backgroundImage || '')}" placeholder="https://..." />
          </div>
          <div class="insp-field" style="margin-top:16px;">
            <label class="insp-checkbox">
              <input type="checkbox" id="zb-chk-grid-guides" ${this.showGridGuides ? 'checked' : ''} /> Показывать 12-колоночную сетку
            </label>
          </div>
          <div style="margin-top:24px;padding:16px;background:rgba(13,153,255,0.08);border:1px solid rgba(13,153,255,0.25);border-radius:8px;font-size:12px;line-height:1.5;color:#94a3b8;">
            💡 <b>Совет</b>: Кликните по любому элементу на холсте, чтобы настроить его координаты, типографику, ссылки, цвета и слои.
          </div>
        </div>
      `;

      panelEl.querySelector('#zb-artboard-height')?.addEventListener('input', e => {
        this.block.settings.height = parseInt(e.target.value) || 600;
        this.render();
      });
      panelEl.querySelector('#zb-bg-color-picker')?.addEventListener('input', e => {
        this.block.settings.background = e.target.value;
        const txt = panelEl.querySelector('#zb-bg-color-text');
        if (txt) txt.value = e.target.value;
        this.render();
      });
      panelEl.querySelector('#zb-bg-color-text')?.addEventListener('input', e => {
        this.block.settings.background = e.target.value;
        this.render();
      });
      panelEl.querySelectorAll('.color-swatch-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          this.block.settings.background = chip.dataset.color;
          this.render();
          this.renderInspector(panelEl, pageAnchorsList);
        });
      });
      panelEl.querySelector('#zb-bg-img-input')?.addEventListener('input', e => {
        this.block.settings.backgroundImage = e.target.value;
        this.render();
      });
      panelEl.querySelector('#zb-chk-grid-guides')?.addEventListener('change', e => {
        this.showGridGuides = e.target.checked;
        this.render();
      });
      return;
    }

    // Element Inspector
    if (!selected.props.animation) {
      selected.props.animation = { type: 'none', duration: 0.6, delay: 0, trigger: 'scroll' };
    }
    const p = selected.props;
    const anim = p.animation;
    const typeLabel = {
      h1: '🏷️ Заголовок H1',
      h2: '🏷️ Заголовок H2',
      h3: '🏷️ Заголовок H3',
      text: '📝 Текст',
      btn: '🔘 Кнопка',
      img: '🖼️ Изображение',
      shape: '⬜ Фигура',
      icon: '⭐ Иконка',
      form: '📋 Форма заявки',
      code: '💻 HTML код'
    }[selected.type] || selected.type.toUpperCase();

    let html = `
      <div class="tilda-inspector-header">
        <div class="insp-title">
          <span style="font-size:14px;font-weight:700;color:#0d99ff;">${typeLabel}</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;">ID: ${selected.id.substr(0, 10)}</div>
      </div>

      <div class="tilda-inspector-body">
        <!-- 1. Position & Size -->
        <div class="insp-section-title">Координаты и размер</div>
        <div class="insp-row-2">
          <div class="insp-field"><label>X (px)</label><input type="number" id="zb-el-x" value="${p.x}" /></div>
          <div class="insp-field"><label>Y (px)</label><input type="number" id="zb-el-y" value="${p.y}" /></div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field"><label>W (Ширина px)</label><input type="number" id="zb-el-w" value="${p.width}" min="10" /></div>
          <div class="insp-field"><label>H (Высота px)</label><input type="number" id="zb-el-h" value="${p.height}" min="10" /></div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field"><label>Поворот (°)</label><input type="number" id="zb-el-rot" value="${p.rotation || 0}" min="0" max="360" /></div>
          <div class="insp-field"><label>Слой (Z-Index)</label><input type="number" id="zb-el-z" value="${p.zIndex || 1}" min="1" /></div>
        </div>

        <!-- Alignment Tools -->
        <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:4px;margin:12px 0 16px;">
          <button class="topbar-action-btn zb-align-btn" data-align="left" title="Влево" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_horizontal_left</span></button>
          <button class="topbar-action-btn zb-align-btn" data-align="center" title="По центру" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_horizontal_center</span></button>
          <button class="topbar-action-btn zb-align-btn" data-align="right" title="Вправо" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_horizontal_right</span></button>
          <button class="topbar-action-btn zb-align-btn" data-align="top" title="Вверх" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_vertical_top</span></button>
          <button class="topbar-action-btn zb-align-btn" data-align="middle" title="По середине" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_vertical_center</span></button>
          <button class="topbar-action-btn zb-align-btn" data-align="bottom" title="Вниз" style="justify-content:center;padding:6px;"><span class="material-symbols-rounded" style="font-size:16px;">align_vertical_bottom</span></button>
        </div>

        <!-- 2. Typography for Text, Headings, Button -->
        ${['text', 'h1', 'h2', 'h3', 'btn'].includes(selected.type) ? `
          <div class="insp-section-title">Типографика & Текст</div>
          <div class="insp-field">
            <label>Текст элемента</label>
            <textarea id="zb-el-content" rows="3">${escapeHtml(p.content || '')}</textarea>
          </div>
          <div class="insp-row-2">
            <div class="insp-field">
              <label>Шрифт</label>
              <select id="zb-el-font-family">
                ${POPULAR_FONTS.map(f => `<option value="${f}" ${p.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select>
            </div>
            <div class="insp-field">
              <label>Размер (px)</label>
              <input type="number" id="zb-el-font-size" value="${p.fontSize || 16}" min="10" max="140" />
            </div>
          </div>
          <div class="insp-row-2">
            <div class="insp-field">
              <label>Насыщенность</label>
              <select id="zb-el-font-weight">
                <option value="400" ${p.fontWeight === '400' ? 'selected' : ''}>400 Обычный</option>
                <option value="500" ${p.fontWeight === '500' ? 'selected' : ''}>500 Средний</option>
                <option value="600" ${p.fontWeight === '600' ? 'selected' : ''}>600 Полужирный</option>
                <option value="700" ${p.fontWeight === '700' ? 'selected' : ''}>700 Жирный</option>
                <option value="800" ${p.fontWeight === '800' ? 'selected' : ''}>800 Экстра-жирный</option>
                <option value="900" ${p.fontWeight === '900' ? 'selected' : ''}>900 Black</option>
              </select>
            </div>
            <div class="insp-field">
              <label>Выравнивание</label>
              <select id="zb-el-text-align">
                <option value="left" ${p.textAlign === 'left' ? 'selected' : ''}>Слева</option>
                <option value="center" ${p.textAlign === 'center' ? 'selected' : ''}>По центру</option>
                <option value="right" ${p.textAlign === 'right' ? 'selected' : ''}>Справа</option>
              </select>
            </div>
          </div>
          <div class="insp-field">
            <label>Цвет текста</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="zb-el-color-picker" value="${p.color || '#ffffff'}" />
              <input type="text" id="zb-el-color-text" value="${p.color || '#ffffff'}" style="flex:1;" />
            </div>
          </div>
        ` : ''}

        <!-- 3. Image URL & Lightbox -->
        ${selected.type === 'img' ? `
          <div class="insp-section-title">Изображение</div>
          <div class="insp-field">
            <label>URL изображения</label>
            <input type="text" id="zb-el-img-url" value="${escapeHtml(p.content || '')}" placeholder="https://..." />
          </div>
          <div class="insp-field">
            <label class="insp-checkbox">
              <input type="checkbox" id="zb-el-lightbox" ${p.lightbox ? 'checked' : ''} /> Открывать в стильном Lightbox при клике
            </label>
          </div>
        ` : ''}

        <!-- 4. Icon Picker -->
        ${selected.type === 'icon' ? `
          <div class="insp-section-title">Выбор иконки</div>
          <div class="insp-field">
            <label>Название иконки (Material Symbols)</label>
            <input type="text" id="zb-el-icon-name" value="${escapeHtml(p.icon || 'star')}" />
          </div>
          <div class="anchor-presets-chips" style="margin-bottom:12px;">
            ${POPULAR_ICONS.slice(0, 12).map(ic => `<span class="anchor-preset-chip zb-icon-chip" data-icon="${ic}">${ic}</span>`).join('')}
          </div>
        ` : ''}

        <!-- 5. Appearance (Background, Borders, Shadows) -->
        <div class="insp-section-title">Внешний вид (Фон & Рамка)</div>
        <div class="insp-field">
          <label>Цвет фона</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="zb-el-bg-color" value="${p.bgColor && p.bgColor !== 'transparent' ? p.bgColor : '#0d99ff'}" />
            <input type="text" id="zb-el-bg-text" value="${p.bgColor || 'transparent'}" style="flex:1;" />
          </div>
        </div>
        <div class="insp-row-2">
          <div class="insp-field">
            <label>Скругление (px)</label>
            <input type="text" id="zb-el-radius" value="${p.borderRadius || '0px'}" />
          </div>
          <div class="insp-field">
            <label>Толщина рамки</label>
            <input type="text" id="zb-el-border-w" value="${p.borderWidth || '0px'}" />
          </div>
        </div>
        <div class="insp-field">
          <label>Цвет рамки</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="zb-el-border-color" value="${p.borderColor || '#0d99ff'}" />
            <input type="text" id="zb-el-border-text" value="${p.borderColor || '#0d99ff'}" style="flex:1;" />
          </div>
        </div>

        <!-- 6. Link & Anchors -->
        <div class="insp-section-title">🔗 Ссылка и действия</div>
        <div class="insp-field">
          <label>URL / Якорь</label>
          <input type="text" id="zb-el-url" value="${escapeHtml(p.url || '')}" placeholder="https://... или #якорь" />
        </div>
        <div class="insp-field">
          <label style="font-size:11px;color:#94a3b8;">🎯 Выбрать якорь страницы:</label>
          <select id="zb-el-anchor-select" class="floating-anchor-dropdown">
            <option value="">-- Выбрать якорь страницы --</option>
            ${pageAnchorsList.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
          </select>
        </div>
        <div class="insp-field">
          <label class="insp-checkbox">
            <input type="checkbox" id="zb-el-target-blank" ${p.targetBlank ? 'checked' : ''} /> Открывать в новой вкладке (target="_blank")
          </label>
        </div>

        <!-- 7. Element Animation -->
        <div class="insp-section-title">🎬 Анимация элемента</div>
        <div class="insp-field">
          <label>Эффект анимации</label>
          <select id="zb-el-anim-type">
            <option value="none" ${(anim.type || 'none') === 'none' ? 'selected' : ''}>Без анимации</option>
            <option value="fade-in" ${anim.type === 'fade-in' ? 'selected' : ''}>✨ Плавное появление (Fade In)</option>
            <option value="slide-up" ${anim.type === 'slide-up' ? 'selected' : ''}>⬆ Всплытие снизу (Slide Up)</option>
            <option value="slide-down" ${anim.type === 'slide-down' ? 'selected' : ''}>⬇ Появление сверху (Slide Down)</option>
            <option value="slide-left" ${anim.type === 'slide-left' ? 'selected' : ''}>⬅ Сдвиг справа налево (Slide Left)</option>
            <option value="slide-right" ${anim.type === 'slide-right' ? 'selected' : ''}>➡ Сдвиг слева направо (Slide Right)</option>
            <option value="zoom-in" ${anim.type === 'zoom-in' ? 'selected' : ''}>🔍 Увеличение (Zoom In)</option>
            <option value="zoom-out" ${anim.type === 'zoom-out' ? 'selected' : ''}>🔎 Уменьшение (Zoom Out)</option>
            <option value="flip-up" ${anim.type === 'flip-up' ? 'selected' : ''}>🔄 3D Поворот вверх (Flip Up)</option>
            <option value="flip-x" ${anim.type === 'flip-x' ? 'selected' : ''}>🔃 3D Разворот по оси X (Flip X)</option>
            <option value="rotate-in" ${anim.type === 'rotate-in' ? 'selected' : ''}>🌀 Вихревой поворот (Rotate In)</option>
            <option value="blur-in" ${anim.type === 'blur-in' ? 'selected' : ''}>🌫️ Выход из размытия (Blur In)</option>
            <option value="bounce" ${anim.type === 'bounce' ? 'selected' : ''}>🏀 Пружинистый отскок (Bounce)</option>
            <option value="elastic-up" ${anim.type === 'elastic-up' ? 'selected' : ''}>🎯 Эластичный импульс (Elastic Up)</option>
            <option value="swing-in" ${anim.type === 'swing-in' ? 'selected' : ''}>🎪 Маятниковое открытие (Swing In)</option>
            <option value="glitch" ${anim.type === 'glitch' ? 'selected' : ''}>⚡ Кибер-глитч (Glitch)</option>
            <option value="typewriter" ${anim.type === 'typewriter' ? 'selected' : ''}>⌨️ Печатная машинка (Typewriter)</option>
            <option value="pulse-glow" ${anim.type === 'pulse-glow' ? 'selected' : ''}>💫 Неоновый импульс (Pulse Glow)</option>
            <option value="stagger" ${anim.type === 'stagger' ? 'selected' : ''}>🌊 Каскадное появление (Stagger)</option>
          </select>
        </div>
        <div class="insp-row-2">
          <div class="insp-field">
            <label>Длительность (с)</label>
            <input type="number" id="zb-el-anim-duration" min="0.1" max="5" step="0.1" value="${anim.duration ?? 0.6}" />
          </div>
          <div class="insp-field">
            <label>Задержка (с)</label>
            <input type="number" id="zb-el-anim-delay" min="0" max="5" step="0.1" value="${anim.delay ?? 0}" />
          </div>
        </div>
        <div class="insp-field" style="margin-top:8px;">
          <button type="button" class="topbar-action-btn" id="zb-btn-test-anim" style="width:100%;justify-content:center;background:rgba(13,153,255,0.14);border-color:rgba(13,153,255,0.35);color:#38bdf8;">
            ▶ Проверить анимацию элемента
          </button>
        </div>

        <!-- Actions -->
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;">
          <button class="topbar-action-btn" id="zb-btn-dup-selected" style="flex:1;"><span class="material-symbols-rounded">content_copy</span> Копия</button>
          <button class="topbar-action-btn" id="zb-btn-del-selected" style="flex:1;background:rgba(244,63,94,0.15);color:#f43f5e;border-color:rgba(244,63,94,0.3);"><span class="material-symbols-rounded">delete</span> Удалить</button>
        </div>
      </div>
    `;

    panelEl.innerHTML = html;

    // Bind inputs
    const syncProp = (key, val) => {
      selected.props[key] = val;
      const elDom = this.container?.querySelector(`[data-el-id="${selected.id}"]`);
      if (key === 'x' && elDom) elDom.style.left = val + 'px';
      if (key === 'y' && elDom) elDom.style.top = val + 'px';
      if (key === 'width' && elDom) elDom.style.width = val + 'px';
      if (key === 'height' && elDom) elDom.style.height = val + 'px';
      if (key === 'rotation' && elDom) elDom.style.transform = `rotate(${val}deg)`;
      this.saveHistory();
    };

    panelEl.querySelector('#zb-el-x')?.addEventListener('input', e => syncProp('x', parseInt(e.target.value) || 0));
    panelEl.querySelector('#zb-el-y')?.addEventListener('input', e => syncProp('y', parseInt(e.target.value) || 0));
    panelEl.querySelector('#zb-el-w')?.addEventListener('input', e => { syncProp('width', parseInt(e.target.value) || 20); this.render(); });
    panelEl.querySelector('#zb-el-h')?.addEventListener('input', e => { syncProp('height', parseInt(e.target.value) || 20); this.render(); });
    panelEl.querySelector('#zb-el-rot')?.addEventListener('input', e => syncProp('rotation', parseInt(e.target.value) || 0));
    panelEl.querySelector('#zb-el-z')?.addEventListener('input', e => syncProp('zIndex', parseInt(e.target.value) || 1));

    panelEl.querySelectorAll('.zb-align-btn').forEach(b => {
      b.addEventListener('click', () => this.alignSelected(b.dataset.align));
    });

    panelEl.querySelector('#zb-el-content')?.addEventListener('input', e => {
      selected.props.content = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-font-family')?.addEventListener('change', e => {
      selected.props.fontFamily = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-font-size')?.addEventListener('input', e => {
      selected.props.fontSize = parseInt(e.target.value) || 16;
      this.render();
    });
    panelEl.querySelector('#zb-el-font-weight')?.addEventListener('change', e => {
      selected.props.fontWeight = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-text-align')?.addEventListener('change', e => {
      selected.props.textAlign = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-color-picker')?.addEventListener('input', e => {
      selected.props.color = e.target.value;
      const txt = panelEl.querySelector('#zb-el-color-text');
      if (txt) txt.value = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-color-text')?.addEventListener('input', e => {
      selected.props.color = e.target.value;
      this.render();
    });

    panelEl.querySelector('#zb-el-img-url')?.addEventListener('input', e => {
      selected.props.content = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-lightbox')?.addEventListener('change', e => {
      selected.props.lightbox = e.target.checked;
    });

    panelEl.querySelector('#zb-el-icon-name')?.addEventListener('input', e => {
      selected.props.icon = e.target.value;
      selected.props.content = e.target.value;
      this.render();
    });
    panelEl.querySelectorAll('.zb-icon-chip').forEach(c => {
      c.addEventListener('click', () => {
        selected.props.icon = c.dataset.icon;
        selected.props.content = c.dataset.icon;
        this.render();
        this.renderInspector(panelEl, pageAnchorsList);
      });
    });

    panelEl.querySelector('#zb-el-bg-color')?.addEventListener('input', e => {
      selected.props.bgColor = e.target.value;
      const txt = panelEl.querySelector('#zb-el-bg-text');
      if (txt) txt.value = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-bg-text')?.addEventListener('input', e => {
      selected.props.bgColor = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-radius')?.addEventListener('input', e => {
      selected.props.borderRadius = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-border-w')?.addEventListener('input', e => {
      selected.props.borderWidth = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-border-color')?.addEventListener('input', e => {
      selected.props.borderColor = e.target.value;
      const txt = panelEl.querySelector('#zb-el-border-text');
      if (txt) txt.value = e.target.value;
      this.render();
    });
    panelEl.querySelector('#zb-el-border-text')?.addEventListener('input', e => {
      selected.props.borderColor = e.target.value;
      this.render();
    });

    panelEl.querySelector('#zb-el-url')?.addEventListener('input', e => {
      selected.props.url = e.target.value;
    });
    panelEl.querySelector('#zb-el-anchor-select')?.addEventListener('change', e => {
      if (e.target.value) {
        selected.props.url = e.target.value;
        const inp = panelEl.querySelector('#zb-el-url');
        if (inp) inp.value = e.target.value;
      }
    });
    panelEl.querySelector('#zb-el-target-blank')?.addEventListener('change', e => {
      selected.props.targetBlank = e.target.checked;
    });

    const playZeroElAnim = () => {
      const elDom = this.container?.querySelector(`[data-el-id="${selected.id}"]`);
      if (!elDom) return;
      const aType = selected.props.animation?.type || 'none';
      const aDur = parseFloat(selected.props.animation?.duration) || 0.6;
      const aDelay = parseFloat(selected.props.animation?.delay) || 0;
      if (aType === 'none') {
        elDom.removeAttribute('data-tilda-anim');
        elDom.removeAttribute('data-anim-duration');
        elDom.removeAttribute('data-anim-delay');
        return;
      }
      elDom.setAttribute('data-tilda-anim', aType);
      elDom.setAttribute('data-anim-duration', String(aDur));
      elDom.setAttribute('data-anim-delay', String(aDelay));
      elDom.style.animationDuration = `${aDur}s`;
      elDom.style.transitionDuration = `${aDur}s`;
      elDom.style.animationDelay = `${aDelay}s`;
      elDom.style.transitionDelay = `${aDelay}s`;
      if (window.TildaRuntime?.triggerAnimation) {
        window.TildaRuntime.triggerAnimation(elDom);
      } else {
        const allClasses = [
          'tilda-animated-in', 'anim-fade-in', 'anim-slide-up', 'anim-slide-down',
          'anim-slide-left', 'anim-slide-right', 'anim-zoom-in', 'anim-zoom-out',
          'anim-flip-up', 'anim-flip-x', 'anim-rotate-in', 'anim-blur-in',
          'anim-bounce', 'anim-elastic-up', 'anim-swing-in', 'anim-glitch',
          'anim-typewriter', 'anim-pulse-glow', 'anim-stagger'
        ];
        elDom.classList.remove(...allClasses);
        void elDom.offsetWidth;
        elDom.classList.add('tilda-animated-in', `anim-${aType}`);
      }
    };

    panelEl.querySelector('#zb-el-anim-type')?.addEventListener('change', e => {
      selected.props.animation.type = e.target.value;
      this.saveHistory();
      playZeroElAnim();
    });
    panelEl.querySelector('#zb-el-anim-duration')?.addEventListener('input', e => {
      selected.props.animation.duration = parseFloat(e.target.value) || 0.6;
      this.saveHistory();
    });
    panelEl.querySelector('#zb-el-anim-delay')?.addEventListener('input', e => {
      selected.props.animation.delay = parseFloat(e.target.value) || 0;
      this.saveHistory();
    });
    panelEl.querySelector('#zb-btn-test-anim')?.addEventListener('click', () => {
      playZeroElAnim();
    });

    panelEl.querySelector('#zb-btn-dup-selected')?.addEventListener('click', () => {
      this.duplicateSelectedElement();
    });
    panelEl.querySelector('#zb-btn-del-selected')?.addEventListener('click', () => {
      this.deleteSelectedElement();
    });
  }
}
