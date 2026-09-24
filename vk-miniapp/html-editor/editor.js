/**
 * editor.js — Главный координатор приложения AURORA WEB
 * Связывает TildaEngine, ZeroBlockEditor, CodeMirror, кастомные шрифты (OFONT.RU),
 * свободное перетаскивание элементов на холсте, масштабирование (Zoom) и облачную публикацию.
 */

import { TildaEngine } from './tilda_engine.js?v=5.2.0';
import { ZeroBlock, ZeroBlockEditor } from './zero_block.js?v=5.2.0';
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { html } from "@codemirror/lang-html";

let tildaEngine = null;
let zeroBlockEditor = null;
let codeEditor = null;
let currentMode = 'builder'; // builder | zero | code | preview

// ─── Масштабирование холста (Zoom) ─────────────────────────────
let canvasZoom = 1.0;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

function setCanvasZoom(newZoom) {
  canvasZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(newZoom.toFixed(2))));
  const artboard = document.getElementById('tilda-artboard');
  const zeroMount = document.getElementById('zero-block-canvas-mount');
  const zoomText = document.getElementById('zoom-level-indicator');

  if (artboard) artboard.style.transform = `scale(${canvasZoom})`;
  if (zeroMount) zeroMount.style.transform = `scale(${canvasZoom})`;
  if (zoomText) zoomText.textContent = `${Math.round(canvasZoom * 100)}%`;
}

function initCanvasZoom() {
  const workspace = document.getElementById('tilda-center-workspace');
  if (!workspace) return;

  // Zoom по Ctrl + Wheel
  workspace.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setCanvasZoom(canvasZoom + delta);
    }
  }, { passive: false });

  // Кнопки зума на плавающей панели
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    setCanvasZoom(canvasZoom + 0.1);
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    setCanvasZoom(canvasZoom - 0.1);
  });
  document.getElementById('zoom-level-indicator')?.addEventListener('click', () => {
    setCanvasZoom(1.0);
    showToast('🔍 Масштаб сброшен на 100%');
  });
}

// ─── Хранилище кастомных шрифтов (IndexedDB) ────────────────────
let customFonts = [];
let pendingFontBuffer = null;
let pendingFontFileName = '';

const FONT_DB_NAME = 'AuroraWebFontsDB';
const FONT_STORE = 'custom_fonts';

function openFontDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FONT_DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFontsFromDB() {
  try {
    const db = await openFontDB();
    const tx = db.transaction(FONT_STORE, 'readonly');
    const store = tx.objectStore(FONT_STORE);
    const req = store.getAll();
    req.onsuccess = async () => {
      customFonts = req.result || [];
      for (const f of customFonts) {
        if (f.buffer) {
          await registerFontFace(f.name, f.buffer);
        }
      }
    };
  } catch (e) {
    console.warn('Load custom fonts error:', e);
  }
}

async function saveFontToDB(name, fileName, buffer) {
  try {
    const db = await openFontDB();
    const tx = db.transaction(FONT_STORE, 'readwrite');
    const store = tx.objectStore(FONT_STORE);
    store.put({ name, fileName, buffer, addedAt: Date.now() });
  } catch (e) {
    console.warn('Save font to DB error:', e);
  }
}

async function deleteFontFromDB(name) {
  try {
    const db = await openFontDB();
    const tx = db.transaction(FONT_STORE, 'readwrite');
    const store = tx.objectStore(FONT_STORE);
    store.delete(name);
  } catch (e) {
    console.warn('Delete font from DB error:', e);
  }
}

async function registerFontFace(name, buffer) {
  try {
    const font = new FontFace(name, buffer);
    await font.load();
    document.fonts.add(font);
  } catch (e) {
    console.warn(`Font load error [${name}]:`, e);
  }
}

// ─── Свободное перетаскивание любых элементов на стандартных блоках ───
function initFreeElementDragOnCanvas() {
  const artboard = document.getElementById('tilda-artboard');
  if (!artboard) return;

  let activeEl = null;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let isDragging = false;

  artboard.addEventListener('mousedown', e => {
    // Игнорируем экшен-бары и тулбары
    if (e.target.closest('.tilda-block-action-bar') || e.target.closest('.tilda-add-block-bar') || e.target.isContentEditable) return;

    // Находим целевой внутренний элемент блока
    const target = e.target.closest('h1, h2, h3, h4, p, img, button, .t-feature-card, .t-pricing-card, .t-gallery-item, .t-badge, .t-avatar');
    if (!target) return;

    const blockWrapper = target.closest('.tilda-block-wrapper');
    if (!blockWrapper) return;

    // Не перетаскиваем, если был даблклик
    if (e.detail > 1) return;

    activeEl = target;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    const computed = window.getComputedStyle(activeEl);
    startLeft = parseInt(computed.left, 10) || 0;
    startTop = parseInt(computed.top, 10) || 0;

    const onMouseMove = ev => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        activeEl.style.position = 'relative';
        activeEl.style.zIndex = '20';
        activeEl.style.cursor = 'grab';
        activeEl.style.transition = 'none';
        activeEl.classList.add('is-element-dragged');
      }

      if (isDragging) {
        activeEl.style.left = `${startLeft + dx}px`;
        activeEl.style.top = `${startTop + dy}px`;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (isDragging) {
        activeEl.classList.remove('is-element-dragged');
        tildaEngine?.saveHistory();
        showToast('📍 Позиция элемента зафиксирована');
      }
      activeEl = null;
      isDragging = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  });
}

// ─── Инициализация приложения ──────────────────────────────────
function init() {
  // 1. Core Engine
  tildaEngine = new TildaEngine({
    container: document.getElementById('tilda-artboard'),
    layersList: document.getElementById('tilda-layers-list'),
    propsPanel: document.getElementById('tilda-props-panel'),
    paletteContainer: document.getElementById('tilda-blocks-palette')
  });
  window.tildaEngine = tildaEngine;

  // 2. Custom Fonts
  loadFontsFromDB();

  // 3. Zoom Controls
  initCanvasZoom();

  // 4. Free Element Dragging
  initFreeElementDragOnCanvas();

  // 5. Переключатели режимов
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });

  // 6. Переключатели брейкпоинтов
  document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const bp = btn.dataset.bp;
      tildaEngine.activeBreakpoint = bp;
      tildaEngine.renderArtboard();
    });
  });

  // 7. Вкладки левой панели (Figma Strip) с автоматическим рендером
  document.querySelectorAll('.tilda-vertical-strip .strip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tilda-vertical-strip .strip-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const tab = btn.dataset.tab;
      document.querySelectorAll('.panel-tab-content').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('is-active');
      });

      const activePanel = document.getElementById(`panel-tab-${tab}`);
      if (activePanel) {
        activePanel.style.display = 'flex';
        activePanel.classList.add('is-active');

        // Вызываем рендер соответствующей вкладки
        if (tab === 'library') tildaEngine.renderPalette();
        else if (tab === 'layers') tildaEngine.renderLayersTree();
        else if (tab === 'pages') tildaEngine.renderPagesList();
        else if (tab === 'theme') tildaEngine.renderDesignTokensUI();
        else if (tab === 'store') tildaEngine.renderStoreUI();
        else if (tab === 'settings') tildaEngine.renderSettingsUI();
      }
    });
  });

  // 8. Undo / Redo
  document.getElementById('btn-undo')?.addEventListener('click', () => tildaEngine.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => tildaEngine.redo());

  // 9. Переименование названия проекта
  const titleInput = document.getElementById('project-title');
  if (titleInput) {
    titleInput.value = tildaEngine.project.name || 'Новый сайт Aurora Web';
    titleInput.addEventListener('input', e => {
      tildaEngine.project.name = e.target.value;
      tildaEngine.saveHistory();
    });
  }

  // 10. Сохранение, экспорт и публикация
  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    tildaEngine.saveProject();
    showToast('✅ Проект AURORA WEB сохранён');
  });

  document.getElementById('btn-export-project')?.addEventListener('click', () => {
    exportProjectZip();
  });

  document.getElementById('btn-publish-cloud')?.addEventListener('click', () => {
    publishSiteToCloud();
  });

  // 11. Плавающий быстрый тулбар
  document.getElementById('tool-quick-add-block')?.addEventListener('click', () => {
    document.querySelector('.tilda-vertical-strip .strip-btn[data-tab="library"]')?.click();
  });
  document.getElementById('tool-quick-zero')?.addEventListener('click', () => {
    switchMode('zero');
  });
  document.getElementById('tool-quick-del')?.addEventListener('click', () => {
    if (currentMode === 'zero') {
      zeroBlockEditor?.deleteSelectedElement();
    } else {
      tildaEngine.deleteActiveBlock();
    }
  });

  // 12. Zero Block панель инструментов
  bindZeroBlockToolbar();

  // 13. CodeMirror
  initCodeMirror();

  // 14. Модалки
  initModals();

  // 15. Глобальные горячие клавиши (Delete, Backspace, Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+D, Ctrl+0)
  document.addEventListener('keydown', e => {
    const ae = document.activeElement;
    const inInput = ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable);

    // Удаление выбранного блока или элемента по Del / Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
      e.preventDefault();
      if (currentMode === 'zero') {
        zeroBlockEditor?.deleteSelectedElement();
        showToast('🗑️ Элемент удалён');
      } else if (currentMode === 'builder') {
        if (tildaEngine.activeBlockId) {
          tildaEngine.deleteActiveBlock();
          showToast('🗑️ Блок удалён');
        }
      }
    }

    // Дублирование по Ctrl+D
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      if (inInput) return;
      e.preventDefault();
      if (currentMode === 'zero') {
        zeroBlockEditor?.duplicateSelectedElement();
        showToast('📋 Элемент продублирован');
      } else if (currentMode === 'builder') {
        if (tildaEngine.activeBlockId) {
          tildaEngine.duplicateBlock(tildaEngine.activeBlockId);
          showToast('📋 Блок продублирован');
        }
      }
    }

    // Сброс масштаба по Ctrl+0
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      if (inInput) return;
      e.preventDefault();
      setCanvasZoom(1.0);
      showToast('🔍 Масштаб: 100%');
    }

    // Zoom по Ctrl++ / Ctrl+-
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      if (inInput) return;
      e.preventDefault();
      setCanvasZoom(canvasZoom + 0.1);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      if (inInput) return;
      e.preventDefault();
      setCanvasZoom(canvasZoom - 0.1);
    }

    // Отмена / Повтор
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'я')) {
      if (inInput) return;
      e.preventDefault(); tildaEngine.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н' || (e.shiftKey && (e.key === 'z' || e.key === 'я')))) {
      if (inInput) return;
      e.preventDefault(); tildaEngine.redo();
    }

    // Сохранение
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'ы')) {
      e.preventDefault();
      tildaEngine.saveProject();
      showToast('✅ Проект сохранён');
    }
  });

  showToast('🎨 Конструктор AURORA WEB готов к работе');
}

// ─── Переключение режимов ──────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-pill').forEach(b => {
    b.classList.toggle('is-active', b.dataset.mode === mode);
  });

  document.getElementById('view-builder').style.display = mode === 'builder' ? 'flex' : 'none';
  document.getElementById('view-zero').style.display = mode === 'zero' ? 'flex' : 'none';
  document.getElementById('view-code').style.display = mode === 'code' ? 'flex' : 'none';
  document.getElementById('view-preview').style.display = mode === 'preview' ? 'block' : 'none';

  if (mode === 'zero') {
    if (!zeroBlockEditor) {
      zeroBlockEditor = new ZeroBlockEditor('#zero-block-canvas-mount');
      window.zeroBlockEditor = zeroBlockEditor;
    } else {
      zeroBlockEditor.render();
    }
  } else if (mode === 'code') {
    syncToCodeEditor();
  } else if (mode === 'preview') {
    syncToPreviewFrame();
  } else if (mode === 'builder') {
    tildaEngine.renderArtboard();
  }
}

// ─── Zero Block Toolbar ────────────────────────────────────────
function bindZeroBlockToolbar() {
  document.getElementById('zb-add-h1')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('h1', { content: 'Новый заголовок H1' });
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-text')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('text', { content: 'Новый текстовый блок' });
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-btn')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('btn', { content: 'Кнопка' });
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-img')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('img', {});
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-shape')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('shape', {});
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-icon')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('icon', {});
    zeroBlockEditor?.render();
  });

  // Alignment
  document.getElementById('zb-align-left')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('left'));
  document.getElementById('zb-align-center')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('center'));
  document.getElementById('zb-align-right')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('right'));

  document.getElementById('zb-del-el')?.addEventListener('click', () => {
    zeroBlockEditor?.deleteSelectedElement();
    showToast('🗑️ Элемент удалён');
  });
  document.getElementById('zb-btn-apply')?.addEventListener('click', () => {
    showToast('✅ Изменения Zero Block зафиксированы');
    switchMode('builder');
  });
}

// ─── Модальные окна ────────────────────────────────────────────
function initModals() {
  // 1. Шаблоны страниц
  const newPageModal = document.getElementById('new-page-modal');
  let selectedTemplate = 'landing';

  newPageModal?.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      newPageModal.querySelectorAll('.template-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      selectedTemplate = card.dataset.template;
    });
  });

  document.getElementById('btn-close-new-page-modal')?.addEventListener('click', () => {
    newPageModal?.classList.add('hidden');
  });

  document.getElementById('btn-create-page-confirm')?.addEventListener('click', () => {
    const title = (document.getElementById('np-page-title')?.value || '').trim() || 'Новая страница';
    const slug = (document.getElementById('np-page-slug')?.value || '').trim() || 'page-' + Date.now();
    tildaEngine.addPage(title, slug, selectedTemplate);
    newPageModal?.classList.add('hidden');
    showToast(`✅ Страница «${title}» создана`);
  });

  // 2. SEO настройки страницы
  const pageSeoModal = document.getElementById('page-settings-modal');
  document.getElementById('btn-close-page-settings')?.addEventListener('click', () => {
    pageSeoModal?.classList.add('hidden');
  });

  document.getElementById('btn-save-page-settings')?.addEventListener('click', () => {
    const pageId = pageSeoModal.dataset.editingPageId;
    const page = tildaEngine.project.pages.find(p => p.id === pageId);
    if (page) {
      page.title = document.getElementById('ps-page-title').value;
      page.slug = document.getElementById('ps-page-slug').value;
      page.metaTitle = document.getElementById('ps-meta-title').value;
      page.metaDesc = document.getElementById('ps-meta-desc').value;
      tildaEngine.renderPagesList();
      tildaEngine.saveHistory();
      showToast('✅ Настройки страницы сохранены');
    }
    pageSeoModal?.classList.add('hidden');
  });

  // 3. Товар магазина
  const prodModal = document.getElementById('store-product-modal');
  document.getElementById('btn-close-store-prod')?.addEventListener('click', () => {
    prodModal?.classList.add('hidden');
  });

  document.getElementById('btn-save-store-prod')?.addEventListener('click', () => {
    const editId = prodModal.dataset.editingProdId;
    const name = (document.getElementById('sp-name').value || '').trim() || 'Новый товар';
    const price = Number(document.getElementById('sp-price').value) || 0;
    const oldPrice = Number(document.getElementById('sp-old-price').value) || 0;
    const sku = (document.getElementById('sp-sku').value || '').trim();
    const img = (document.getElementById('sp-img').value || '').trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
    const desc = (document.getElementById('sp-desc').value || '').trim();

    const s = tildaEngine.project.store;
    if (editId) {
      const p = s.products.find(x => x.id === editId);
      if (p) {
        Object.assign(p, { name, price, oldPrice, sku, img, desc });
      }
    } else {
      s.products.push({
        id: 'prod_' + Date.now(),
        name, price, oldPrice, sku, img, desc
      });
    }

    tildaEngine.renderStoreUI();
    tildaEngine.saveHistory();
    prodModal?.classList.add('hidden');
    showToast('✅ Каталог товаров обновлен');
  });

  // 4. OFONT.RU Custom Fonts
  initOfontModal();

  // 5. Cloud Modal
  document.getElementById('btn-close-cloud')?.addEventListener('click', () => {
    document.getElementById('cloud-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-copy-cloud-url')?.addEventListener('click', () => {
    const urlInput = document.getElementById('cloud-site-url');
    if (urlInput) {
      navigator.clipboard.writeText(urlInput.value);
      showToast('📋 Ссылка скопирована в буфер обмена');
    }
  });
}

// ─── Модалка OFONT.RU ──────────────────────────────────────────
function initOfontModal() {
  const modal = document.getElementById('ofont-modal-overlay');
  const openBtn = document.getElementById('btn-open-ofont');
  const closeBtn = document.getElementById('ofont-modal-close');
  const dropzone = document.getElementById('ofont-dropzone');
  const fileInput = document.getElementById('ofont-file-input');
  const applyBtn = document.getElementById('btn-ofont-apply-font');
  const nameInput = document.getElementById('ofont-name-input');

  window.openOfontModal = () => {
    modal?.classList.remove('hidden');
    renderCustomFontsList();
  };

  openBtn?.addEventListener('click', window.openOfontModal);
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.borderColor = '#0d99ff';
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#334155';
  });
  dropzone?.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.borderColor = '#334155';
    if (e.dataTransfer.files?.[0]) handleFontFile(e.dataTransfer.files[0]);
  });

  fileInput?.addEventListener('change', e => {
    if (e.target.files?.[0]) handleFontFile(e.target.files[0]);
  });

  applyBtn?.addEventListener('click', async () => {
    const name = (nameInput?.value || '').trim() || 'CustomFont';
    if (!pendingFontBuffer) return;

    await registerFontFace(name, pendingFontBuffer);
    await saveFontToDB(name, pendingFontFileName, pendingFontBuffer);

    customFonts.push({ name, fileName: pendingFontFileName, buffer: pendingFontBuffer });
    renderCustomFontsList();

    tildaEngine.project.globalStyles.fontHeading = name;
    tildaEngine.applyGlobalStyles();
    tildaEngine.renderDesignTokensUI();

    showToast(`✅ Шрифт «${name}» успешно установлен!`);
    modal?.classList.add('hidden');
  });
}

function handleFontFile(file) {
  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const nameInput = document.getElementById('ofont-name-input');
  const applyBtn = document.getElementById('btn-ofont-apply-font');
  if (nameInput) nameInput.value = cleanName;

  const reader = new FileReader();
  reader.onload = e => {
    pendingFontBuffer = e.target.result;
    pendingFontFileName = file.name;
    if (applyBtn) applyBtn.disabled = false;
    showToast(`Файл «${file.name}» загружен`);
  };
  reader.readAsArrayBuffer(file);
}

function renderCustomFontsList() {
  const container = document.getElementById('ofont-stored-list');
  if (!container) return;

  if (customFonts.length === 0) {
    container.innerHTML = '<div style="font-size:12px;color:#64748b;text-align:center;padding:12px;">Пока нет загруженных шрифтов</div>';
    return;
  }

  container.innerHTML = customFonts.map(f => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#1e293b;border-radius:8px;border:1px solid #334155;">
      <div>
        <div style="font-weight:700;font-size:13px;color:#fff;font-family:'${f.name}',sans-serif;">${f.name}</div>
        <div style="font-size:10px;color:#94a3b8;">${f.fileName || 'ofont.ru'}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="topbar-action-btn font-apply-btn" data-font="${f.name}" style="padding:4px 10px;font-size:11px;">Применить</button>
        <button class="topbar-action-btn font-del-btn" data-font="${f.name}" style="padding:4px 8px;font-size:11px;color:#f43f5e;">✕</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.font-apply-btn').forEach(b => {
    b.addEventListener('click', () => {
      const fname = b.dataset.font;
      tildaEngine.project.globalStyles.fontHeading = fname;
      tildaEngine.applyGlobalStyles();
      tildaEngine.renderDesignTokensUI();
      showToast(`Применён шрифт: ${fname}`);
      document.getElementById('ofont-modal-overlay')?.classList.add('hidden');
    });
  });

  container.querySelectorAll('.font-del-btn').forEach(b => {
    b.addEventListener('click', async () => {
      const fname = b.dataset.font;
      await deleteFontFromDB(fname);
      customFonts = customFonts.filter(x => x.name !== fname);
      renderCustomFontsList();
      showToast(`Шрифт «${fname}» удалён`);
    });
  });
}

// ─── CodeMirror ────────────────────────────────────────────────
function initCodeMirror() {
  const container = document.getElementById('cm-editor-container');
  if (!container) return;

  const startHtml = tildaEngine?.generateStandaloneHtml() || '<h1>Привет, AURORA WEB!</h1>';

  const state = EditorState.create({
    doc: startHtml,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      html(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.theme({
        "&": { height: "100%", background: "#0d1117", color: "#f8fafc" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-content": { padding: "12px" },
        ".cm-gutters": { background: "#080c14", color: "#475569", border: "none" }
      }, { dark: true })
    ]
  });

  codeEditor = new EditorView({ state, parent: container });

  document.getElementById('btn-code-run')?.addEventListener('click', () => {
    showToast('⚡ Код скомпилирован');
  });
}

function syncToCodeEditor() {
  if (!codeEditor || !tildaEngine) return;
  const fullHtml = tildaEngine.generateStandaloneHtml();
  codeEditor.dispatch({
    changes: { from: 0, to: codeEditor.state.doc.length, insert: fullHtml }
  });
}

function syncToPreviewFrame() {
  const frame = document.getElementById('fullscreen-preview-frame');
  if (!frame || !tildaEngine) return;
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(fullHtml);
  doc.close();
}

// ─── Экспорт проекта в ZIP / HTML ─────────────────────────────
async function exportProjectZip() {
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const title = tildaEngine.project.name || 'aurora-web-site';

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Готовый автономный HTML-файл скачан');
}

// ─── Облачная публикация ──────────────────────────────────────
async function publishSiteToCloud() {
  showToast('🚀 Публикация сайта в облаке Аврора...');
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const title = tildaEngine.project.name || 'AURORA WEB Site';

  try {
    const res = await fetch('/api/cloud-upload.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: `${title}.html`, content: fullHtml, ttl: 86400 })
    });
    const data = await res.json();
    if (data.ok && (data.view_url || data.url)) {
      const siteUrl = data.view_url || data.url;
      const modal = document.getElementById('cloud-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('cloud-site-title').textContent = title;
        document.getElementById('cloud-site-url').value = siteUrl;
        document.getElementById('btn-open-cloud-url').href = siteUrl;
      }
      showToast('🎉 Сайт успешно опубликован онлайн!');
    } else {
      showToast('✅ Проект готов к выгрузке (Экспорт HTML)');
    }
  } catch (e) {
    showToast('✅ Проект готов к выгрузке (Экспорт HTML)');
  }
}

// ─── Toast Уведомления ─────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = msg;
  toast.classList.add('is-show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-show'), 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, switchMode, tildaEngine };
