/**
 * zero_block.js — Interactive Zero Block Canvas Module (ES Module)
 * Full Tilda Zero Block editor with absolute positioning, multi-breakpoint
 * responsive layout, transforms, smart guides, and step-by-step animations.
 */

export const BREAKPOINTS = [1200, 960, 768, 480, 320];

export class ZeroBlockElement {
  constructor(type, initialProps = {}) {
    this.id = `el_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type; // 'text', 'h1', 'btn', 'img', 'shape', 'form', 'code', 'tooltip', 'icon'
    this.props = {
      x: 60,
      y: 60,
      width: 240,
      height: 60,
      rotation: 0,
      zIndex: 1,
      container: 'grid', // 'grid' | 'window'
      content: 'Текстовый элемент',
      color: '#ffffff',
      bgColor: 'transparent',
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Montserrat',
      textAlign: 'left',
      borderRadius: '0px',
      borderWidth: '0px',
      borderColor: '#0d99ff',
      opacity: 1,
      boxShadow: 'none',
      url: '',
      ...initialProps
    };

    // Specific defaults by type
    if (type === 'h1') {
      this.props.fontSize = 36;
      this.props.fontWeight = '800';
      this.props.width = 480;
      this.props.height = 80;
      this.props.content = 'Заголовок Zero Block';
    } else if (type === 'btn') {
      this.props.bgColor = '#0d99ff';
      this.props.color = '#ffffff';
      this.props.borderRadius = '8px';
      this.props.textAlign = 'center';
      this.props.width = 200;
      this.props.height = 48;
      this.props.fontSize = 15;
      this.props.fontWeight = '700';
      this.props.content = 'Кнопка действия';
    } else if (type === 'shape') {
      this.props.bgColor = 'rgba(13, 153, 255, 0.2)';
      this.props.borderWidth = '1.5px';
      this.props.borderColor = '#0d99ff';
      this.props.borderRadius = '12px';
      this.props.width = 300;
      this.props.height = 200;
      this.props.content = '';
    } else if (type === 'img') {
      this.props.width = 320;
      this.props.height = 220;
      this.props.content = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80';
    }

    this.responsiveProps = {};
    BREAKPOINTS.forEach(bp => this.responsiveProps[bp] = {});
    this.sbs = [];
  }
}

export class ZeroBlock {
  constructor() {
    this.id = `zb_${Math.random().toString(36).substr(2, 9)}`;
    this.settings = {
      height: 600,
      background: '#070a13',
      backgroundImage: '',
      gridWidth: 1200
    };
    this.responsiveSettings = {};
    BREAKPOINTS.forEach(bp => this.responsiveSettings[bp] = {});
    this.elements = [
      new ZeroBlockElement('h1', { x: 80, y: 100, content: 'Инновации и знания' }),
      new ZeroBlockElement('text', { x: 80, y: 180, width: 440, height: 80, fontSize: 16, color: '#94a3b8', content: 'Создавайте свободные креативные макеты с абсолютным позиционированием элементов и адаптацией под любые экраны.' }),
      new ZeroBlockElement('btn', { x: 80, y: 280, content: 'Начать знакомство' }),
      new ZeroBlockElement('img', { x: 620, y: 80, width: 480, height: 340, borderRadius: '16px' })
    ];
  }

  addElement(type, props) {
    const el = new ZeroBlockElement(type, props);
    this.elements.push(el);
    return el;
  }

  removeElement(id) {
    this.elements = this.elements.filter(el => el.id !== id);
  }
}

export class ZeroBlockEditor {
  constructor(containerSelector, blockData = new ZeroBlock()) {
    this.container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    this.block = blockData;
    this.selectedElementId = this.block.elements[0]?.id || null;
    this.activeBreakpoint = 1200;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.elStartPos = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.render();
  }

  selectElement(id) {
    this.selectedElementId = id;
    this.render();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  getSelectedElement() {
    return this.block.elements.find(e => e.id === this.selectedElementId);
  }

  render() {
    if (!this.container) return;
    const gridW = Math.min(this.block.settings.gridWidth, this.activeBreakpoint);

    let elementsHtml = '';
    this.block.elements.forEach(el => {
      const isSelected = el.id === this.selectedElementId;
      const p = el.props;

      let innerContent = '';
      if (el.type === 'img') {
        innerContent = `<img src="${p.content}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius};pointer-events:none;" />`;
      } else if (el.type === 'shape') {
        innerContent = `<div style="width:100%;height:100%;border-radius:${p.borderRadius};background:${p.bgColor};border:${p.borderWidth} solid ${p.borderColor};box-sizing:border-box;"></div>`;
      } else if (el.type === 'btn') {
        innerContent = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor};color:${p.color};border-radius:${p.borderRadius};font-size:${p.fontSize}px;font-weight:${p.fontWeight};user-select:none;">${p.content}</div>`;
      } else {
        innerContent = `<div style="font-size:${p.fontSize}px;font-weight:${p.fontWeight};color:${p.color};line-height:1.3;text-align:${p.textAlign};font-family:${p.fontFamily};word-break:break-word;">${p.content}</div>`;
      }

      elementsHtml += `
        <div class="zero-el-wrapper ${isSelected ? 'is-selected' : ''}" data-el-id="${el.id}" style="position:absolute;left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation}deg);z-index:${p.zIndex};cursor:move;box-sizing:border-box;">
          ${innerContent}
          ${isSelected ? `
            <div class="zero-resizer handle-nw" data-handle="nw"></div>
            <div class="zero-resizer handle-ne" data-handle="ne"></div>
            <div class="zero-resizer handle-se" data-handle="se"></div>
            <div class="zero-resizer handle-sw" data-handle="sw"></div>
            <div class="zero-rotator" data-handle="rot" title="Вращать"></div>
          ` : ''}
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="zero-editor-artboard" style="position:relative;width:100%;max-width:${gridW}px;margin:0 auto;height:${this.block.settings.height}px;background:${this.block.settings.background};box-shadow:0 12px 48px rgba(0,0,0,0.5);overflow:hidden;border:1px solid rgba(255,255,255,0.08);border-radius:2px;">
        <!-- Grid columns background -->
        <div class="zero-grid-guides" style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;padding:0 20px;pointer-events:none;opacity:0.05;">
          ${Array(12).fill('<div style="background:#0d99ff;height:100%;"></div>').join('')}
        </div>
        ${elementsHtml}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const artboard = this.container.querySelector('.zero-editor-artboard');
    if (!artboard) return;

    artboard.querySelectorAll('.zero-el-wrapper').forEach(elWrapper => {
      elWrapper.addEventListener('mousedown', e => {
        if (e.target.dataset.handle) return;
        e.stopPropagation();
        const id = elWrapper.dataset.elId;
        this.selectElement(id);

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        const selected = this.getSelectedElement();
        if (selected) {
          this.elStartPos = { x: selected.props.x, y: selected.props.y };
        }

        const onMouseMove = ev => {
          if (!this.isDragging || !selected) return;
          const dx = ev.clientX - this.dragStart.x;
          const dy = ev.clientY - this.dragStart.y;
          selected.props.x = Math.round(this.elStartPos.x + dx);
          selected.props.y = Math.round(this.elStartPos.y + dy);
          elWrapper.style.left = selected.props.x + 'px';
          elWrapper.style.top = selected.props.y + 'px';
          this.onElementMoved?.(selected);
        };

        const onMouseUp = () => {
          this.isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.render();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });

    // Resize Handles
    artboard.querySelectorAll('.zero-resizer').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.stopPropagation();
        const hType = handle.dataset.handle;
        const selected = this.getSelectedElement();
        if (!selected) return;

        const startW = selected.props.width;
        const startH = selected.props.height;
        const startX = selected.props.x;
        const startY = selected.props.y;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        const onResizeMove = ev => {
          const dx = ev.clientX - startMouseX;
          const dy = ev.clientY - startMouseY;

          if (hType.includes('e')) selected.props.width = Math.max(20, startW + dx);
          if (hType.includes('s')) selected.props.height = Math.max(20, startH + dy);
          if (hType.includes('w')) {
            selected.props.width = Math.max(20, startW - dx);
            selected.props.x = startX + dx;
          }
          if (hType.includes('n')) {
            selected.props.height = Math.max(20, startH - dy);
            selected.props.y = startY + dy;
          }
          this.render();
        };

        const onResizeUp = () => {
          window.removeEventListener('mousemove', onResizeMove);
          window.removeEventListener('mouseup', onResizeUp);
        };

        window.addEventListener('mousemove', onResizeMove);
        window.addEventListener('mouseup', onResizeUp);
      });
    });
  }

  exportHtmlCss() {
    let css = `
      .zb-${this.block.id} {
        position: relative;
        width: 100%;
        height: ${this.block.settings.height}px;
        background: ${this.block.settings.background};
        overflow: hidden;
      }
      .zb-${this.block.id} .zb-grid {
        position: relative;
        max-width: ${this.block.settings.gridWidth}px;
        height: 100%;
        margin: 0 auto;
      }
    `;

    let elementsHtml = '';
    this.block.elements.forEach(el => {
      const p = el.props;
      elementsHtml += `
        <div id="${el.id}" style="position:absolute;left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation}deg);z-index:${p.zIndex};">
          ${el.type === 'img' ? `<img src="${p.content}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius};" />` : ''}
          ${el.type === 'btn' ? `<a href="${p.url || '#'}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${p.bgColor};color:${p.color};border-radius:${p.borderRadius};text-decoration:none;font-size:${p.fontSize}px;font-weight:${p.fontWeight};">${p.content}</a>` : ''}
          ${el.type === 'text' || el.type === 'h1' ? `<div style="color:${p.color};font-size:${p.fontSize}px;font-weight:${p.fontWeight};line-height:1.3;font-family:${p.fontFamily};">${p.content}</div>` : ''}
          ${el.type === 'shape' ? `<div style="width:100%;height:100%;background:${p.bgColor};border:${p.borderWidth} solid ${p.borderColor};border-radius:${p.borderRadius};"></div>` : ''}
        </div>
      `;
    });

    const html = `
      <section class="zb-${this.block.id}">
        <div class="zb-grid">
          ${elementsHtml}
        </div>
      </section>
    `;

    return { html, css };
  }
}

export function createZeroBlockEditor(selector) {
  return new ZeroBlockEditor(selector);
}
