/**
 * zero_block.js — Сверхбыстрый интерактивный редактор Zero Block в стиле Figma & Tilda
 * Поддерживает свободное позиционирование (drag-to-move), 8-точечный ресайз,
 * вращение, умные направляющие (snapping), кастомные шрифты и плавный 60 FPS рендеринг без лагов.
 */

export const BREAKPOINTS = [1200, 960, 768, 480, 320];

export class ZeroBlockElement {
  constructor(type, initialProps = {}) {
    this.id = `el_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type; // 'text', 'h1', 'btn', 'img', 'shape', 'icon', 'code'
    this.props = {
      x: 80,
      y: 80,
      width: 260,
      height: 60,
      rotation: 0,
      zIndex: 1,
      container: 'grid', // 'grid' | 'window'
      content: 'Текстовый элемент',
      color: '#ffffff',
      bgColor: 'transparent',
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Inter',
      textAlign: 'left',
      borderRadius: '0px',
      borderWidth: '0px',
      borderColor: '#0d99ff',
      opacity: 1,
      boxShadow: 'none',
      url: '',
      icon: 'star',
      ...initialProps
    };

    if (type === 'h1') {
      this.props.fontSize = 38;
      this.props.fontWeight = '800';
      this.props.width = 540;
      this.props.height = 90;
      this.props.content = 'Заголовок Zero Block';
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
    } else if (type === 'shape') {
      this.props.bgColor = 'rgba(13, 153, 255, 0.15)';
      this.props.borderWidth = '1.5px';
      this.props.borderColor = '#0d99ff';
      this.props.borderRadius = '12px';
      this.props.width = 320;
      this.props.height = 200;
      this.props.content = '';
    } else if (type === 'img') {
      this.props.width = 380;
      this.props.height = 260;
      this.props.borderRadius = '12px';
      this.props.content = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80';
    } else if (type === 'icon') {
      this.props.width = 48;
      this.props.height = 48;
      this.props.fontSize = 32;
      this.props.color = '#0d99ff';
      this.props.icon = 'bolt';
      this.props.content = 'bolt';
    }

    this.responsiveProps = {};
    BREAKPOINTS.forEach(bp => this.responsiveProps[bp] = {});
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
      new ZeroBlockElement('h1', { x: 80, y: 100, content: 'Свободный креативный дизайн' }),
      new ZeroBlockElement('text', { x: 80, y: 200, width: 480, height: 80, fontSize: 16, color: '#94a3b8', content: 'Перетаскивайте любые элементы по свободным координатам холста, настраивайте 8-точечный ресайз, умные направляющие и адаптивность.' }),
      new ZeroBlockElement('btn', { x: 80, y: 300, content: 'Начать знакомство' }),
      new ZeroBlockElement('img', { x: 620, y: 90, width: 480, height: 340, borderRadius: '16px' })
    ];
  }

  addElement(type, props = {}) {
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
    this.isResizing = false;
    this.isRotating = false;
    this.dragStart = { x: 0, y: 0 };
    this.elStartPos = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    this._rafId = null;

    this.init();
  }

  init() {
    this.render();
    this.bindKeyboardShortcuts();
  }

  selectElement(id) {
    this.selectedElementId = id;
    this.updateSelectionClasses();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  getSelectedElement() {
    return this.block.elements.find(e => e.id === this.selectedElementId);
  }

  deleteSelectedElement() {
    if (!this.selectedElementId) return;
    this.block.removeElement(this.selectedElementId);
    this.selectedElementId = this.block.elements[0]?.id || null;
    this.render();
    this.onSelectionChange?.(this.getSelectedElement());
  }

  duplicateSelectedElement() {
    const selected = this.getSelectedElement();
    if (!selected) return;
    const clone = new ZeroBlockElement(selected.type, {
      ...selected.props,
      x: selected.props.x + 20,
      y: selected.props.y + 20
    });
    this.block.elements.push(clone);
    this.selectedElementId = clone.id;
    this.render();
    this.onSelectionChange?.(clone);
  }

  alignSelected(alignType) {
    const selected = this.getSelectedElement();
    if (!selected) return;
    const artboardW = Math.min(this.block.settings.gridWidth, this.activeBreakpoint);
    const artboardH = this.block.settings.height;

    switch (alignType) {
      case 'left': selected.props.x = 20; break;
      case 'center': selected.props.x = Math.round((artboardW - selected.props.width) / 2); break;
      case 'right': selected.props.x = artboardW - selected.props.width - 20; break;
      case 'top': selected.props.y = 20; break;
      case 'middle': selected.props.y = Math.round((artboardH - selected.props.height) / 2); break;
      case 'bottom': selected.props.y = artboardH - selected.props.height - 20; break;
    }
    this.render();
    this.onSelectionChange?.(selected);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      const ae = document.activeElement;
      if (ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable)) return;

      const selected = this.getSelectedElement();
      if (!selected) return;

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
    this.block.elements.forEach(el => {
      const isSelected = el.id === this.selectedElementId;
      const p = el.props;

      let innerContent = '';
      if (el.type === 'img') {
        innerContent = `<img src="${p.content}" style="width:100%;height:100%;object-fit:cover;border-radius:${p.borderRadius};pointer-events:none;" alt="" />`;
      } else if (el.type === 'shape') {
        innerContent = `<div style="width:100%;height:100%;border-radius:${p.borderRadius};background:${p.bgColor};border:${p.borderWidth} solid ${p.borderColor};box-sizing:border-box;"></div>`;
      } else if (el.type === 'btn') {
        innerContent = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor};color:${p.color};border-radius:${p.borderRadius};font-size:${p.fontSize}px;font-weight:${p.fontWeight};font-family:'${p.fontFamily}',sans-serif;user-select:none;box-sizing:border-box;border:${p.borderWidth} solid ${p.borderColor};">${p.content}</div>`;
      } else if (el.type === 'icon') {
        innerContent = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${p.color};font-size:${p.fontSize}px;"><span class="material-symbols-rounded" style="font-size:inherit;">${p.icon || 'star'}</span></div>`;
      } else {
        innerContent = `<div style="font-size:${p.fontSize}px;font-weight:${p.fontWeight};color:${p.color};line-height:1.3;text-align:${p.textAlign};font-family:'${p.fontFamily}',sans-serif;word-break:break-word;">${p.content}</div>`;
      }

      elementsHtml += `
        <div class="zero-el-wrapper ${isSelected ? 'is-selected' : ''}" data-el-id="${el.id}" style="position:absolute;left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation}deg);z-index:${p.zIndex};cursor:move;box-sizing:border-box;">
          ${innerContent}
          <div class="zero-handles-group" style="display:${isSelected ? 'block' : 'none'};">
            <!-- 8 Resizing Handles -->
            <div class="zero-resizer handle-nw" data-handle="nw"></div>
            <div class="zero-resizer handle-n" data-handle="n" style="top:-4px;left:50%;transform:translateX(-50%);cursor:n-resize;"></div>
            <div class="zero-resizer handle-ne" data-handle="ne"></div>
            <div class="zero-resizer handle-e" data-handle="e" style="top:50%;right:-4px;transform:translateY(-50%);cursor:e-resize;"></div>
            <div class="zero-resizer handle-se" data-handle="se"></div>
            <div class="zero-resizer handle-s" data-handle="s" style="bottom:-4px;left:50%;transform:translateX(-50%);cursor:s-resize;"></div>
            <div class="zero-resizer handle-sw" data-handle="sw"></div>
            <div class="zero-resizer handle-w" data-handle="w" style="top:50%;left:-4px;transform:translateY(-50%);cursor:w-resize;"></div>
            <!-- Rotation Handle -->
            <div class="zero-rotator" data-handle="rotate" title="Вращение"></div>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="zero-editor-artboard" style="position:relative;width:100%;max-width:${gridW}px;margin:0 auto;height:${this.block.settings.height}px;background:${this.block.settings.background};box-shadow:0 16px 56px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.1);border-radius:4px;">
        <!-- Сетка колонок Tilda 12 cols -->
        <div class="zero-grid-guides" style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;padding:0 20px;pointer-events:none;opacity:0.04;">
          ${Array(12).fill('<div style="background:#0d99ff;height:100%;"></div>').join('')}
        </div>
        <!-- Линии направляющих примагничивания -->
        <div class="zero-guide-line zero-guide-x" style="display:none;position:absolute;top:0;bottom:0;width:1px;background:#a855f7;z-index:9999;pointer-events:none;"></div>
        <div class="zero-guide-line zero-guide-y" style="display:none;position:absolute;left:0;right:0;height:1px;background:#a855f7;z-index:9999;pointer-events:none;"></div>
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

    // Drag-to-move 60 FPS
    artboard.querySelectorAll('.zero-el-wrapper').forEach(elWrapper => {
      elWrapper.addEventListener('mousedown', e => {
        if (e.target.dataset.handle) return;
        e.stopPropagation();
        const id = elWrapper.dataset.elId;
        this.selectElement(id);

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        const selected = this.getSelectedElement();
        if (!selected) return;

        this.elStartPos = { x: selected.props.x, y: selected.props.y };

        const onMouseMove = ev => {
          if (!this.isDragging) return;
          if (this._rafId) cancelAnimationFrame(this._rafId);

          this._rafId = requestAnimationFrame(() => {
            const dx = ev.clientX - this.dragStart.x;
            const dy = ev.clientY - this.dragStart.y;
            let nx = Math.round(this.elStartPos.x + dx);
            let ny = Math.round(this.elStartPos.y + dy);

            // Snapping to Artboard Center
            const artboardW = artboard.clientWidth;
            const elCenterX = nx + (selected.props.width / 2);
            if (Math.abs(elCenterX - artboardW / 2) < 8) {
              nx = Math.round(artboardW / 2 - selected.props.width / 2);
              if (guideX) { guideX.style.display = 'block'; guideX.style.left = (artboardW / 2) + 'px'; }
            } else {
              if (guideX) guideX.style.display = 'none';
            }

            selected.props.x = nx;
            selected.props.y = ny;
            elWrapper.style.left = nx + 'px';
            elWrapper.style.top = ny + 'px';
          });
        };

        const onMouseUp = () => {
          this.isDragging = false;
          if (guideX) guideX.style.display = 'none';
          if (guideY) guideY.style.display = 'none';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp, { once: true });
      });
    });

    // 8-point Resizing
    artboard.querySelectorAll('.zero-resizer').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.stopPropagation();
        const hType = handle.dataset.handle;
        const selected = this.getSelectedElement();
        if (!selected) return;

        const elWrapper = handle.closest('.zero-el-wrapper');
        const startW = selected.props.width;
        const startH = selected.props.height;
        const startX = selected.props.x;
        const startY = selected.props.y;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        const onResizeMove = ev => {
          if (this._rafId) cancelAnimationFrame(this._rafId);

          this._rafId = requestAnimationFrame(() => {
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;

            let nw = startW;
            let nh = startH;
            let nx = startX;
            let ny = startY;

            if (hType.includes('e')) nw = Math.max(20, startW + dx);
            if (hType.includes('s')) nh = Math.max(20, startH + dy);
            if (hType.includes('w')) {
              nw = Math.max(20, startW - dx);
              nx = startX + dx;
            }
            if (hType.includes('n')) {
              nh = Math.max(20, startH - dy);
              ny = startY + dy;
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
          });
        };

        const onResizeUp = () => {
          window.removeEventListener('mousemove', onResizeMove);
          window.removeEventListener('mouseup', onResizeUp);
          this.render();
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onResizeMove, { passive: true });
        window.addEventListener('mouseup', onResizeUp, { once: true });
      });
    });

    // Rotation
    artboard.querySelectorAll('.zero-rotator').forEach(rot => {
      rot.addEventListener('mousedown', e => {
        e.stopPropagation();
        const selected = this.getSelectedElement();
        if (!selected) return;

        const elWrapper = rot.closest('.zero-el-wrapper');
        const rect = elWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const onRotateMove = ev => {
          if (this._rafId) cancelAnimationFrame(this._rafId);
          this._rafId = requestAnimationFrame(() => {
            const rad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
            let deg = Math.round(rad * (180 / Math.PI) - 90);
            if (deg < 0) deg += 360;
            selected.props.rotation = deg;
            if (elWrapper) elWrapper.style.transform = `rotate(${deg}deg)`;
          });
        };

        const onRotateUp = () => {
          window.removeEventListener('mousemove', onRotateMove);
          window.removeEventListener('mouseup', onRotateUp);
          this.onSelectionChange?.(selected);
        };

        window.addEventListener('mousemove', onRotateMove, { passive: true });
        window.addEventListener('mouseup', onRotateUp, { once: true });
      });
    });
  }
}
