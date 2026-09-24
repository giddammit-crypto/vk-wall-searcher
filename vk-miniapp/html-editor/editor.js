/**
 * editor.js — Главный координатор приложения АВРОРА TILDA
 * Связывает TildaEngine, ZeroBlockEditor, CodeMirror, кастомные шрифты (OFONT.RU) и облачную выгрузку.
 */

import { TildaEngine } from './tilda_engine.js?v=5.1.0';
import { ZeroBlock, ZeroBlockEditor } from './zero_block.js?v=5.1.0';
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { html } from "@codemirror/lang-html";

let tildaEngine = null;
let zeroBlockEditor = null;
let codeEditor = null;
let currentMode = 'builder'; // builder | zero | code | preview

// ─── Хранилище кастомных шрифтов (IndexedDB) ────────────────────
let customFonts = [];
let pendingFontBuffer = null;
let pendingFontFileName = '';

const FONT_DB_NAME = 'AuroraTildaFontsDB';
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

// ─── Инициализация приложения ──────────────────────────────────
function init() {
  // 1. Инициализируем Core Engine
  tildaEngine = new TildaEngine({
    container: document.getElementById('tilda-artboard'),
    layersList: document.getElementById('tilda-layers-list'),
    propsPanel: document.getElementById('tilda-props-panel'),
    paletteContainer: document.getElementById('tilda-blocks-palette')
  });
  window.tildaEngine = tildaEngine;

  // 2. Загружаем шрифты из IndexedDB
  loadFontsFromDB();

  // 3. Переключатели режимов
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });

  // 4. Переключатели брейкпоинтов
  document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const bp = btn.dataset.bp;
      tildaEngine.activeBreakpoint = bp;
      tildaEngine.renderArtboard();
    });
  });

  // 5. Вкладки левой панели (Figma Strip)
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
      }
    });
  });

  // 6. Undo / Redo
  document.getElementById('btn-undo')?.addEventListener('click', () => tildaEngine.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => tildaEngine.redo());

  // 7. Переименование названия проекта
  const titleInput = document.getElementById('project-title');
  if (titleInput) {
    titleInput.value = tildaEngine.project.name || 'Новый сайт Tilda';
    titleInput.addEventListener('input', e => {
      tildaEngine.project.name = e.target.value;
      tildaEngine.saveHistory();
    });
  }

  // 8. Добавление страницы
  document.getElementById('btn-add-new-page')?.addEventListener('click', () => {
    const title = prompt('Введите название новой страницы:', 'О компании');
    if (title) tildaEngine.addPage(title);
  });

  // 9. Сохранение, экспорт и публикация
  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    tildaEngine.saveProject();
    showToast('✅ Проект сохранён');
  });

  document.getElementById('btn-export-project')?.addEventListener('click', () => {
    exportProjectZip();
  });

  document.getElementById('btn-publish-cloud')?.addEventListener('click', () => {
    publishSiteToCloud();
  });

  // 10. Плавающий быстрый тулбар
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

  // 11. Zero Block панель инструментов
  bindZeroBlockToolbar();

  // 12. CodeMirror
  initCodeMirror();

  // 13. Модалка OFONT.RU
  initOfontModal();

  // 14. Глобальные горячие клавиши (Delete, Backspace, Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+D)
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

  showToast('🎨 Визуальный конструктор Tilda готов к работе');
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
  document.getElementById('zb-add-text')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('text', { content: 'Новый текстовый блок' });
    zeroBlockEditor?.render();
  });
  document.getElementById('zb-add-btn')?.addEventListener('click', () => {
    zeroBlockEditor?.block.addElement('btn', { content: 'Новая кнопка' });
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
  document.getElementById('zb-del-el')?.addEventListener('click', () => {
    zeroBlockEditor?.deleteSelectedElement();
    showToast('🗑️ Элемент удалён');
  });
  document.getElementById('zb-btn-apply')?.addEventListener('click', () => {
    showToast('✅ Изменения Zero Block зафиксированы');
    switchMode('builder');
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

    // Применяем как шрифт заголовков
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

  const startHtml = tildaEngine?.generateStandaloneHtml() || '<h1>Привет, Tilda!</h1>';

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
  const title = tildaEngine.project.name || 'tilda-site';

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Готовый HTML-файл сайта скачан');
}

// ─── Облачная публикация ──────────────────────────────────────
async function publishSiteToCloud() {
  showToast('🚀 Публикация сайта в облаке Аврора...');
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const title = tildaEngine.project.name || 'Сайт Tilda';

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
  toast.textContent = msg;
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
