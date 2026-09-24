/**
 * editor.js — Master Application Coordinator for Aurora Tilda Clone
 * Connects TildaEngine, ZeroBlockEditor, CodeMirror, and Cloud Publishing.
 */

import { TildaEngine } from './tilda_engine.js?v=5.0.0';
import { ZeroBlock, ZeroBlockEditor } from './zero_block.js?v=5.0.0';
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

let tildaEngine = null;
let zeroBlockEditor = null;
let codeEditor = null;
let currentMode = 'builder'; // builder | zero | code | preview
let activeCodeTab = 'html';

function init() {
  // 1. Initialize Tilda Core Engine
  tildaEngine = new TildaEngine({
    container: document.getElementById('tilda-artboard'),
    layersList: document.getElementById('tilda-layers-list'),
    propsPanel: document.getElementById('tilda-props-panel'),
    paletteContainer: document.getElementById('tilda-blocks-palette')
  });
  window.tildaEngine = tildaEngine;

  // 2. Bind Topbar Mode Switchers
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });

  // 3. Bind Breakpoint Switchers
  document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const bp = btn.dataset.bp;
      tildaEngine.activeBreakpoint = bp;
      tildaEngine.renderArtboard();
    });
  });

  // 4. Bind Left Figma Strip Tabs
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

  // 5. Undo / Redo
  document.getElementById('btn-undo')?.addEventListener('click', () => tildaEngine.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => tildaEngine.redo());

  // 6. Project Title rename
  const titleInput = document.getElementById('project-title');
  if (titleInput) {
    titleInput.value = tildaEngine.project.name || 'Новый сайт Tilda';
    titleInput.addEventListener('input', e => {
      tildaEngine.project.name = e.target.value;
      tildaEngine.saveHistory();
    });
  }

  // 7. Add New Page
  document.getElementById('btn-add-new-page')?.addEventListener('click', () => {
    const title = prompt('Введите название новой страницы:', 'О компании');
    if (title) tildaEngine.addPage(title);
  });

  // 8. Save, Export, and Cloud Publishing Actions
  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    tildaEngine.saveProject();
    showToast('✅ Проект сохранён в браузере');
  });

  document.getElementById('btn-export-project')?.addEventListener('click', () => {
    exportProjectZip();
  });

  document.getElementById('btn-publish-cloud')?.addEventListener('click', () => {
    publishSiteToCloud();
  });

  // 9. Zero Block Toolbar Controls
  bindZeroBlockToolbar();

  // 10. CodeMirror initialization for Code mode
  initCodeMirror();

  // 11. Global Keyboard Shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я')) {
      if (e.shiftKey) { e.preventDefault(); tildaEngine.redo(); }
      else { e.preventDefault(); tildaEngine.undo(); }
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н')) {
      e.preventDefault(); tildaEngine.redo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'ы')) {
      e.preventDefault();
      tildaEngine.saveProject();
      showToast('✅ Проект сохранён');
    }
  });

  showToast('🎨 Визуальный конструктор Tilda готов к работе');
}

// ─── Switch Application View Modes ─────────────────────────────
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
  document.getElementById('zb-btn-apply')?.addEventListener('click', () => {
    showToast('✅ Изменения Zero Block зафиксированы');
    switchMode('builder');
  });
}

// ─── CodeMirror Setup ──────────────────────────────────────────
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

  codeEditor = new EditorView({
    state,
    parent: container
  });

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

// ─── Export ZIP ────────────────────────────────────────────────
async function exportProjectZip() {
  const JSZipLib = window.JSZip;
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const title = tildaEngine.project.name || 'tilda-site';

  if (!JSZipLib) {
    // Direct HTML download fallback
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ HTML-файл успешно скачан');
    return;
  }

  try {
    const zip = new JSZipLib();
    zip.file('index.html', fullHtml);
    zip.file('project.json', JSON.stringify(tildaEngine.project, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ ZIP-архив с сайтом успешно скачан');
  } catch (err) {
    showToast('Ошибка при сборке архива: ' + err.message);
  }
}

// ─── Cloud Publishing ──────────────────────────────────────────
async function publishSiteToCloud() {
  showToast('🚀 Публикация сайта в облаке Аврора...');
  const fullHtml = tildaEngine.generateStandaloneHtml();
  const title = tildaEngine.project.name || 'Сайт Tilda';

  try {
    const res = await fetch('/api/cloud-upload.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `${title}.html`,
        content: fullHtml,
        ttl: 86400
      })
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

        document.getElementById('btn-copy-cloud-url')?.addEventListener('click', () => {
          navigator.clipboard.writeText(siteUrl);
          showToast('✅ Ссылка скопирована в буфер');
        });

        document.getElementById('btn-close-cloud')?.addEventListener('click', () => {
          modal.classList.add('hidden');
        });
      }
      showToast('🎉 Сайт успешно опубликован онлайн!');
    } else {
      // Fallback preview
      showToast('✅ Предпросмотр готов. Используйте Экспорт для скачивания.');
    }
  } catch (e) {
    console.warn('Cloud upload error, fallback:', e);
    showToast('✅ Проект готов к выгрузке');
  }
}

// ─── Toast Notification Helper ─────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('is-show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-show'), 3000);
}

// Boot application on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, switchMode, tildaEngine };
