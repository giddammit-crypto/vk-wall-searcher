/**
 * editor.js — Главный координатор приложения AURORA WEB
 * Связывает TildaEngine, ZeroBlockEditor, Projects Dashboard (Главная страница проектов),
 * CodeMirror, кастомные шрифты (OFONT.RU), свободное перетаскивание элементов на холсте,
 * масштабирование (Zoom), интерактивные анимации и облачную публикацию.
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
let currentMode = 'builder'; // dashboard | builder | zero | code | preview
let activeFilter = 'all';
let searchFilterQuery = '';

// ─── Хранилище проектов (Projects Storage) ──────────────────────
const PROJECTS_INDEX_KEY = 'aurora_web_projects_index';
const CURRENT_PROJECT_ID_KEY = 'aurora_web_current_project_id';

function getProjectsList() {
  try {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.warn('Load projects index error:', e);
  }

  // Pre-populate 3 realistic, beautiful starter projects
  const starters = createDefaultStarterProjects();
  saveProjectsList(starters.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category || 'landing',
    pagesCount: p.pages?.length || 1,
    blocksCount: p.pages?.[0]?.blocks?.length || 6,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    theme: p.globalStyles || {},
    heroCover: p.pages?.[0]?.blocks?.[0]?.content?.bgImage || p.pages?.[0]?.blocks?.[1]?.content?.bgImage || ''
  })));

  starters.forEach(p => {
    localStorage.setItem(`aurora_web_proj_${p.id}`, JSON.stringify(p));
  });

  localStorage.setItem(CURRENT_PROJECT_ID_KEY, starters[0].id);
  localStorage.setItem('aurora_web_current_project', JSON.stringify(starters[0]));

  return JSON.parse(localStorage.getItem(PROJECTS_INDEX_KEY));
}

function saveProjectsList(list) {
  try {
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Save projects list error:', e);
  }
}

function loadProjectById(id) {
  try {
    const raw = localStorage.getItem(`aurora_web_proj_${id}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Load project by ID error:', e);
  }
  return null;
}

function saveFullProject(project) {
  if (!project || !project.id) return;
  try {
    localStorage.setItem(`aurora_web_proj_${project.id}`, JSON.stringify(project));
    localStorage.setItem('aurora_web_current_project', JSON.stringify(project));
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);

    // Update index item
    const list = getProjectsList();
    const idx = list.findIndex(p => p.id === project.id);
    const summary = {
      id: project.id,
      name: project.name || 'Сайт Aurora Web',
      category: project.category || 'landing',
      pagesCount: project.pages?.length || 1,
      blocksCount: project.pages?.[0]?.blocks?.length || 0,
      updatedAt: new Date().toISOString(),
      createdAt: (idx >= 0 && list[idx].createdAt) ? list[idx].createdAt : new Date().toISOString(),
      theme: project.globalStyles || {},
      heroCover: project.pages?.[0]?.blocks?.[0]?.content?.bgImage || project.pages?.[0]?.blocks?.[1]?.content?.bgImage || project.pages?.[0]?.blocks?.[1]?.content?.img || ''
    };

    if (idx >= 0) {
      list[idx] = summary;
    } else {
      list.unshift(summary);
    }
    saveProjectsList(list);
  } catch (e) {
    console.warn('Save full project error:', e);
  }
}
window.saveFullProject = saveFullProject;

function createDefaultStarterProjects() {
  const engine = new TildaEngine({ container: null });
  const p1 = engine.createDefaultProject();
  p1.id = 'proj_flagship_landing';
  p1.name = '🚀 Флагманский Лендинг Aurora Web';
  p1.category = 'landing';

  const p2 = engine.createDefaultProject();
  p2.id = 'proj_ecommerce_store';
  p2.name = '🛍️ Интернет-магазин Электроники & Гаджетов';
  p2.category = 'store';
  p2.globalStyles.colorAccent = '#10b981';
  p2.globalStyles.buttonBg = '#10b981';
  p2.pages = [
    {
      id: 'page_store',
      title: 'Главный магазин',
      slug: 'index',
      metaTitle: 'Каталог товаров | Aurora Shop',
      metaDesc: 'Купить гаджеты и аксессуары по выгодным ценам',
      blocks: engine.getTemplateBlocks ? engine.getTemplateBlocks('store') : [
        engine.createBlockInstance('menu-1'),
        engine.createBlockInstance('cover-2'),
        engine.createBlockInstance('store-1'),
        engine.createBlockInstance('store-single'),
        engine.createBlockInstance('store-cart'),
        engine.createBlockInstance('store-order'),
        engine.createBlockInstance('footer-1')
      ]
    }
  ];

  const p3 = engine.createDefaultProject();
  p3.id = 'proj_creative_portfolio';
  p3.name = '🎨 Digital Agency & Creative Studio';
  p3.category = 'portfolio';
  p3.globalStyles.colorAccent = '#8b5cf6';
  p3.globalStyles.buttonBg = '#8b5cf6';
  p3.globalStyles.fontHeading = 'Unbounded';
  p3.pages = [
    {
      id: 'page_agency',
      title: 'Портфолио',
      slug: 'index',
      metaTitle: 'Aurora Creative Agency',
      metaDesc: 'Дизайн студия веб-разработки и брендинга',
      blocks: engine.getTemplateBlocks ? engine.getTemplateBlocks('portfolio') : [
        engine.createBlockInstance('menu-1'),
        engine.createBlockInstance('cover-1'),
        engine.createBlockInstance('about-1'),
        engine.createBlockInstance('gallery-1'),
        engine.createBlockInstance('testimonials-1'),
        engine.createBlockInstance('contacts-1'),
        engine.createBlockInstance('footer-1')
      ]
    }
  ];

  return [p1, p2, p3];
}

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
window.getCanvasZoom = () => canvasZoom;

function initCanvasZoom() {
  const workspace = document.getElementById('tilda-center-workspace');
  if (!workspace) return;

  workspace.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setCanvasZoom(canvasZoom + delta);
    }
  }, { passive: false });

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

// ─── Свободное перетаскивание и ресайз элементов на холсте ───────
function initFreeElementDragOnCanvas() {
  const artboard = document.getElementById('tilda-artboard');
  if (!artboard) return;

  let activeEl = null;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let isDragging = false;
  let dragBadge = null;
  let centerGuideX = null;

  const resolveElKey = (el, blockWrapper) => {
    if (el.dataset.elKey) return el.dataset.elKey;
    const contentEl = blockWrapper.querySelector('.tilda-block-inner, .tilda-block-content') || blockWrapper;
    const all = Array.from(contentEl.querySelectorAll('h1, h2, h3, h4, p, a, img, button, .t-btn, .t-feature-card, .t-pricing-card, .t-badge, blockquote, li, span'));
    const idx = all.indexOf(el);
    const key = `${el.tagName.toLowerCase()}_${idx >= 0 ? idx : 0}`;
    el.dataset.elKey = key;
    return key;
  };

  artboard.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('.block-custom-element') || e.target.closest('.tilda-block-action-bar') || e.target.closest('.tilda-add-block-bar') || e.target.closest('.block-height-resizer') || e.target.isContentEditable) return;

    const target = e.target.closest('h1, h2, h3, h4, p, a, img, button, .t-btn, .t-feature-card, .t-pricing-card, .t-badge, blockquote, li, span');
    if (!target) return;

    const blockWrapper = target.closest('.tilda-block-wrapper');
    if (!blockWrapper) return;

    const page = tildaEngine?.getActivePage();
    const blk = page?.blocks.find(b => b.instanceId === (blockWrapper.dataset.blockId || blockWrapper.id) || b.anchor === blockWrapper.id);
    if (blk?.isLocked) return;

    const elKey = resolveElKey(target, blockWrapper);

    // Alt + Click: сброс смещения элемента
    if (e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      if (blk?.content?.elementOffsets && blk.content.elementOffsets[elKey]) {
        delete blk.content.elementOffsets[elKey];
      }
      target.style.left = '';
      target.style.top = '';
      target.style.position = '';
      target.style.zIndex = '';
      tildaEngine?.saveHistory();
      if (tildaEngine?.project) saveFullProject(tildaEngine.project);
      showToast('↺ Позиция элемента сброшена');
      return;
    }

    if (e.detail > 1) return;

    activeEl = target;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    const savedOffset = blk?.content?.elementOffsets?.[elKey];
    startLeft = savedOffset?.x !== undefined ? Number(savedOffset.x) : (parseInt(activeEl.style.left, 10) || 0);
    startTop = savedOffset?.y !== undefined ? Number(savedOffset.y) : (parseInt(activeEl.style.top, 10) || 0);

    let newX = startLeft;
    let newY = startTop;

    const onMouseMove = ev => {
      const zoom = canvasZoom || 1;
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;

      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        activeEl.style.position = 'relative';
        activeEl.style.zIndex = '30';
        activeEl.style.cursor = 'grabbing';
        activeEl.style.transition = 'none';
        activeEl.classList.add('is-element-dragged');

        dragBadge = document.createElement('div');
        dragBadge.className = 'free-drag-badge';
        dragBadge.style.cssText = 'position:fixed;z-index:99999;background:rgba(15,23,42,0.92);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);padding:3px 8px;border-radius:6px;font-size:11px;font-family:monospace;font-weight:700;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
        document.body.appendChild(dragBadge);

        centerGuideX = document.createElement('div');
        centerGuideX.className = 'smart-guide-line-x';
        centerGuideX.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:1px;background:#f43f5e;z-index:90;pointer-events:none;display:none;box-shadow:0 0 6px #f43f5e;';
        blockWrapper.appendChild(centerGuideX);
      }

      if (isDragging) {
        newX = Math.round(startLeft + dx);
        newY = Math.round(startTop + dy);

        if (ev.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) newY = startTop;
          else newX = startLeft;
        }

        if (tildaEngine?.isGridSnapping) {
          newX = Math.round(newX / 8) * 8;
          newY = Math.round(newY / 8) * 8;
        }

        // Примагничивание к центральной оси (newX === 0)
        if (Math.abs(newX) < 6) {
          newX = 0;
          if (centerGuideX) centerGuideX.style.display = 'block';
        } else {
          if (centerGuideX) centerGuideX.style.display = 'none';
        }

        activeEl.style.left = `${newX}px`;
        activeEl.style.top = `${newY}px`;

        if (dragBadge) {
          dragBadge.textContent = `X: ${newX}px, Y: ${newY}px (Alt+Клик — сброс)`;
          dragBadge.style.left = `${ev.clientX + 14}px`;
          dragBadge.style.top = `${ev.clientY + 14}px`;
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (dragBadge) {
        dragBadge.remove();
        dragBadge = null;
      }
      if (centerGuideX) {
        centerGuideX.remove();
        centerGuideX = null;
      }

      if (isDragging && activeEl) {
        activeEl.classList.remove('is-element-dragged');
        activeEl.style.cursor = '';
        const draggedRef = activeEl;
        draggedRef.dataset.justDragged = 'true';
        setTimeout(() => {
          delete draggedRef.dataset.justDragged;
        }, 120);

        if (blk) {
          blk.content = blk.content || {};
          blk.content.elementOffsets = blk.content.elementOffsets || {};
          blk.content.elementOffsets[elKey] = { x: newX, y: newY };
        }
        tildaEngine?.saveHistory();
        if (tildaEngine?.project) saveFullProject(tildaEngine.project);
        showToast('📍 Позиция элемента сохранена (Alt+Клик — сброс)');
      }
      activeEl = null;
      isDragging = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  });
}

// ─── Главная страница проектов (Dashboard) ─────────────────────
function initProjectsDashboard() {
  const grid = document.getElementById('dashboard-projects-grid');
  const searchInput = document.getElementById('dashboard-search-input');
  const filterChips = document.querySelectorAll('#dashboard-filter-chips .dash-chip');

  searchInput?.addEventListener('input', e => {
    searchFilterQuery = e.target.value.toLowerCase().trim();
    renderProjectsDashboard();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeFilter = chip.dataset.filter;
      renderProjectsDashboard();
    });
  });

  document.getElementById('btn-dash-new-project')?.addEventListener('click', () => {
    document.getElementById('create-project-modal')?.classList.remove('hidden');
  });

  document.getElementById('btn-dash-import')?.addEventListener('click', () => {
    document.getElementById('project-import-file-input')?.click();
  });

  renderProjectsDashboard();
}

function renderProjectsDashboard() {
  const grid = document.getElementById('dashboard-projects-grid');
  const countAll = document.getElementById('dash-count-all');
  if (!grid) return;

  const projects = getProjectsList();
  if (countAll) countAll.textContent = projects.length;

  const filtered = projects.filter(p => {
    const matchesCat = (activeFilter === 'all') || (p.category === activeFilter);
    const matchesSearch = !searchFilterQuery || (p.name && p.name.toLowerCase().includes(searchFilterQuery));
    return matchesCat && matchesSearch;
  });

  let html = `
    <!-- Card 1: + Новый проект -->
    <div class="new-project-dashed-card" id="card-action-create-new">
      <div class="new-proj-icon-circle">
        <span class="material-symbols-rounded">add</span>
      </div>
      <div class="new-proj-title">+ Создать новый проект</div>
      <div class="new-proj-desc">С чистого листа или из готового премиум-шаблона</div>
    </div>
  `;

  filtered.forEach(p => {
    const d = new Date(p.updatedAt || Date.now());
    const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const accent = p.theme?.colorAccent || '#0d99ff';
    const fontHead = p.theme?.fontHeading || 'Montserrat';
    const heroBg = p.heroCover ? `background-image:url('${p.heroCover}');` : 'background:linear-gradient(135deg,#0a0f1d,#161e31);';

    html += `
      <div class="project-card" data-proj-id="${p.id}">
        <!-- Visual Mockup Preview -->
        <div class="project-preview-mockup">
          <div class="proj-mini-browser-bar">
            <div class="proj-mini-dot"></div>
            <div class="proj-mini-dot"></div>
            <div class="proj-mini-dot"></div>
          </div>
          <div class="proj-mini-hero" style="${heroBg}">
            <div class="proj-mini-hero-overlay"></div>
            <div class="proj-mini-hero-content">
              <span class="proj-mini-badge" style="background:rgba(13,153,255,0.25);color:${accent};border:1px solid ${accent};">AURORA SITE</span>
              <div class="proj-mini-title" style="font-family:'${fontHead}',sans-serif;color:#fff;">${escapeHtml(p.name)}</div>
              <div class="proj-mini-sub" style="color:#94a3b8;">Профессиональный веб-сайт</div>
              <span class="proj-mini-btn" style="background:${accent};">Открыть &rarr;</span>
            </div>
          </div>
        </div>

        <!-- Card Body -->
        <div class="project-card-body">
          <div class="project-title-row">
            <div class="project-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <button class="page-act-btn btn-dash-rename" data-rename-id="${p.id}" title="Переименовать проект">
              <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
            </button>
          </div>

          <div class="project-card-stats">
            <span class="project-stat-pill">${p.pagesCount || 1} стр.</span>
            <span class="project-stat-pill">${p.blocksCount || 6} блоков</span>
            <span style="margin-left:auto;font-size:10px;">${dateStr}, ${timeStr}</span>
          </div>

          <div class="project-card-actions">
            <button class="topbar-action-btn btn-primary btn-dash-open" data-open-id="${p.id}" style="flex:1;justify-content:center;">
              <span class="material-symbols-rounded">launch</span>
              <span>Открыть</span>
            </button>
            <button class="topbar-action-btn btn-dash-dup" data-dup-id="${p.id}" title="Дублировать проект">
              <span class="material-symbols-rounded">content_copy</span>
            </button>
            <button class="topbar-action-btn btn-dash-zip" data-zip-id="${p.id}" title="Скачать ZIP">
              <span class="material-symbols-rounded">download</span>
            </button>
            <button class="topbar-action-btn btn-dash-del" data-del-id="${p.id}" title="Удалить проект" style="color:#f43f5e;">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;

  grid.querySelector('#card-action-create-new')?.addEventListener('click', () => {
    document.getElementById('create-project-modal')?.classList.remove('hidden');
  });

  grid.querySelectorAll('.btn-dash-open, .project-preview-mockup').forEach(btn => {
    btn.addEventListener('click', e => {
      const card = btn.closest('.project-card');
      const id = card?.dataset.projId;
      if (id) openProject(id);
    });
  });

  grid.querySelectorAll('.btn-dash-rename').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.renameId;
      openRenameModal(id);
    });
  });

  grid.querySelectorAll('.btn-dash-dup').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      duplicateProject(btn.dataset.dupId);
    });
  });

  grid.querySelectorAll('.btn-dash-zip').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openProject(btn.dataset.zipId);
      exportProjectZip();
    });
  });

  grid.querySelectorAll('.btn-dash-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteProject(btn.dataset.delId);
    });
  });
}

function openProject(id) {
  let proj = loadProjectById(id);
  if (!proj) {
    showToast('❌ Проект не найден');
    return;
  }
  tildaEngine.project = proj;
  tildaEngine.init();

  const titleInput = document.getElementById('project-title');
  if (titleInput) titleInput.value = proj.name || 'Сайт Aurora Web';

  localStorage.setItem(CURRENT_PROJECT_ID_KEY, id);
  localStorage.setItem('aurora_web_current_project', JSON.stringify(proj));

  switchMode('builder');
  showToast(`🎉 Проект «${proj.name}» открыт`);
}

function duplicateProject(id) {
  const original = loadProjectById(id);
  if (!original) return;

  const clone = JSON.parse(JSON.stringify(original));
  clone.id = 'proj_' + Date.now();
  clone.name = (original.name || 'Сайт') + ' (Копия)';

  saveFullProject(clone);
  renderProjectsDashboard();
  showToast(`📋 Проект продублирован`);
}

function deleteProject(id) {
  const list = getProjectsList();
  if (list.length <= 1) {
    alert('Нельзя удалить единственный проект!');
    return;
  }
  if (!confirm('Вы действительно хотите удалить этот проект?')) return;

  localStorage.removeItem(`aurora_web_proj_${id}`);
  const updated = list.filter(p => p.id !== id);
  saveProjectsList(updated);

  if (localStorage.getItem(CURRENT_PROJECT_ID_KEY) === id) {
    openProject(updated[0].id);
  }

  renderProjectsDashboard();
  showToast('🗑️ Проект удалён');
}

function openRenameModal(id) {
  const modal = document.getElementById('rename-project-modal');
  const proj = loadProjectById(id);
  if (!modal || !proj) return;

  const input = document.getElementById('rename-proj-input');
  if (input) input.value = proj.name || '';

  modal.dataset.editingProjId = id;
  modal.classList.remove('hidden');
  input?.focus();
}

// ─── Инициализация приложения ──────────────────────────────────
function init() {
  // 1. Load Projects List & Current Project
  getProjectsList();
  const currentId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
  let activeProj = currentId ? loadProjectById(currentId) : null;

  // 2. Core Engine
  tildaEngine = new TildaEngine({
    container: document.getElementById('tilda-artboard'),
    layersList: document.getElementById('tilda-layers-list'),
    propsPanel: document.getElementById('tilda-props-panel'),
    paletteContainer: document.getElementById('tilda-blocks-palette')
  });

  if (activeProj) {
    tildaEngine.project = activeProj;
    tildaEngine.init();
  }
  window.tildaEngine = tildaEngine;

  // 3. Custom Fonts
  loadFontsFromDB();

  // 4. Zoom Controls
  initCanvasZoom();

  // 5. Free Element Dragging
  initFreeElementDragOnCanvas();

  // 6. Projects Dashboard
  initProjectsDashboard();

  // 7. Navigation: Topbar Logo & Folder Icon switch to Dashboard
  document.getElementById('btn-nav-projects')?.addEventListener('click', () => {
    switchMode('dashboard');
  });
  document.getElementById('btn-brand-home')?.addEventListener('click', () => {
    switchMode('dashboard');
  });

  // 8. Mode Pills
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });

  // 9. Breakpoint Switcher
  document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tilda-bp-group .bp-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const bp = btn.dataset.bp;
      tildaEngine.activeBreakpoint = bp;
      tildaEngine.renderArtboard();
    });
  });

  // 10. Left Strip Tabs
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

        if (tab === 'library') tildaEngine.renderPalette();
        else if (tab === 'layers') tildaEngine.renderLayersTree();
        else if (tab === 'pages') tildaEngine.renderPagesList();
        else if (tab === 'theme') tildaEngine.renderDesignTokensUI();
        else if (tab === 'store') tildaEngine.renderStoreUI();
        else if (tab === 'settings') tildaEngine.renderSettingsUI();
      }
    });
  });

  // 11. Undo / Redo
  document.getElementById('btn-undo')?.addEventListener('click', () => tildaEngine.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => tildaEngine.redo());

  // 12. Grid Snapping Toggle
  document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
    const isAct = tildaEngine.toggleGridSnapping();
    showToast(isAct ? '🧲 Сетка и прилипание включены' : '📴 Сетка выключена');
  });

  // 13. Project Title Input (In Topbar)
  const titleInput = document.getElementById('project-title');
  if (titleInput) {
    titleInput.value = tildaEngine.project.name || 'Новый сайт Aurora Web';
    titleInput.addEventListener('input', e => {
      tildaEngine.project.name = e.target.value;
      saveFullProject(tildaEngine.project);
    });
  }

  // 14. Save, Import, Export, Cloud
  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    saveFullProject(tildaEngine.project);
    showToast('✅ Проект AURORA WEB сохранён');
  });

  const importInput = document.getElementById('project-import-file-input');
  document.getElementById('btn-import-project')?.addEventListener('click', () => {
    importInput?.click();
  });

  importInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json && json.pages && json.pages.length > 0) {
          json.id = 'proj_' + Date.now();
          saveFullProject(json);
          openProject(json.id);
          renderProjectsDashboard();
          showToast(`🎉 Проект «${json.name || 'Сайт'}» успешно импортирован!`);
        } else {
          showToast('❌ Неверный формат файла project.json');
        }
      } catch (err) {
        showToast('❌ Ошибка чтения файла проекта');
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });

  document.getElementById('btn-export-project')?.addEventListener('click', () => {
    exportProjectZip();
  });

  document.getElementById('btn-publish-cloud')?.addEventListener('click', () => {
    publishSiteToCloud();
  });

  // 15. Quick Floating Toolbar
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

  // 16. Zero Block Toolbar
  bindZeroBlockToolbar();

  // 17. CodeMirror
  initCodeMirror();

  // 18. Modals
  initModals();

  // 19. Global Hotkeys
  document.addEventListener('keydown', e => {
    const ae = document.activeElement;
    const inInput = ae && (['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) || ae.isContentEditable);

    // Shift + G: Grid Snapping Toggle
    if (e.shiftKey && (e.key === 'G' || e.key === 'g' || e.key === 'П' || e.key === 'п')) {
      if (inInput) return;
      e.preventDefault();
      const isAct = tildaEngine.toggleGridSnapping();
      showToast(isAct ? '🧲 Сетка включена' : '📴 Сетка выключена');
    }

    // Delete / Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
      e.preventDefault();
      if (currentMode === 'zero') {
        zeroBlockEditor?.deleteSelectedElement();
        showToast('🗑️ Элемент удалён');
      } else if (currentMode === 'builder') {
        if (tildaEngine.activeCustomElementId && tildaEngine.activeBlockId) {
          tildaEngine.removeCustomElementFromBlock(tildaEngine.activeBlockId, tildaEngine.activeCustomElementId);
          showToast('🗑️ Элемент удалён');
        } else if (tildaEngine.activeBlockId) {
          tildaEngine.deleteActiveBlock();
          showToast('🗑️ Блок удалён');
        }
      }
    }

    // Ctrl + D: Duplicate
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      if (inInput) return;
      e.preventDefault();
      if (currentMode === 'zero') {
        zeroBlockEditor?.duplicateSelectedElement();
        showToast('📋 Элемент продублирован');
      } else if (currentMode === 'builder') {
        if (tildaEngine.activeCustomElementId && tildaEngine.activeBlockId) {
          tildaEngine.duplicateCustomElement(tildaEngine.activeBlockId, tildaEngine.activeCustomElementId);
          showToast('📋 Элемент продублирован');
        } else if (tildaEngine.activeBlockId) {
          tildaEngine.duplicateBlock(tildaEngine.activeBlockId);
          showToast('📋 Блок продублирован');
        }
      }
    }

    // Escape: Deselect
    if (e.key === 'Escape') {
      if (tildaEngine?.activeCustomElementId) {
        tildaEngine.activeCustomElementId = null;
        tildaEngine.renderArtboard();
        tildaEngine.renderInspector();
      }
    }

    // Arrow keys: Move active custom element
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !inInput && currentMode === 'builder' && tildaEngine?.activeCustomElementId && tildaEngine?.activeBlockId) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const page = tildaEngine.getActivePage();
      const blk = page?.blocks.find(b => b.instanceId === tildaEngine.activeBlockId);
      const el = blk?.content?.customElements?.find(item => item.id === tildaEngine.activeCustomElementId);
      if (el && el.props) {
        if (e.key === 'ArrowLeft') el.props.x = (el.props.x || 0) - step;
        if (e.key === 'ArrowRight') el.props.x = (el.props.x || 0) + step;
        if (e.key === 'ArrowUp') el.props.y = (el.props.y || 0) - step;
        if (e.key === 'ArrowDown') el.props.y = (el.props.y || 0) + step;
        tildaEngine.updateBlockDOM(blk);
        tildaEngine.saveHistory();
        tildaEngine.saveProject();
      }
    }

    // Ctrl + 0: Reset Zoom
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      if (inInput) return;
      e.preventDefault();
      setCanvasZoom(1.0);
      showToast('🔍 Масштаб: 100%');
    }

    // Ctrl + + / Ctrl + -
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

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'я')) {
      if (inInput) return;
      e.preventDefault(); tildaEngine.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н' || (e.shiftKey && (e.key === 'z' || e.key === 'я')))) {
      if (inInput) return;
      e.preventDefault(); tildaEngine.redo();
    }

    // Save
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'ы')) {
      e.preventDefault();
      saveFullProject(tildaEngine.project);
      showToast('✅ Проект сохранён');
    }
  });

  showToast('🎨 AURORA WEB готов к работе');
}

// ─── Переключение режимов ──────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-pill').forEach(b => {
    b.classList.toggle('is-active', b.dataset.mode === mode);
  });

  const leftSidebar = document.querySelector('.tilda-left-wrap');
  const rightInspector = document.getElementById('tilda-props-panel');
  const bpGroup = document.getElementById('tilda-bp-group');
  const quickToolbar = document.getElementById('tilda-floating-toolbar');
  const zoomPanel = document.getElementById('tilda-zoom-panel');

  if (mode === 'dashboard') {
    if (leftSidebar) leftSidebar.style.display = 'none';
    if (rightInspector) rightInspector.style.display = 'none';
    if (bpGroup) bpGroup.style.display = 'none';
    if (quickToolbar) quickToolbar.style.display = 'none';
    if (zoomPanel) zoomPanel.style.display = 'none';

    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-builder').style.display = 'none';
    document.getElementById('view-zero').style.display = 'none';
    document.getElementById('view-code').style.display = 'none';
    document.getElementById('view-preview').style.display = 'none';

    renderProjectsDashboard();
    return;
  }

  // Restore editor panes
  if (leftSidebar) leftSidebar.style.display = 'flex';
  if (rightInspector) rightInspector.style.display = 'flex';
  if (bpGroup) bpGroup.style.display = 'flex';
  if (quickToolbar) quickToolbar.style.display = 'flex';
  if (zoomPanel) zoomPanel.style.display = 'flex';

  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-builder').style.display = mode === 'builder' ? 'flex' : 'none';
  document.getElementById('view-zero').style.display = mode === 'zero' ? 'flex' : 'none';
  document.getElementById('view-code').style.display = mode === 'code' ? 'flex' : 'none';
  document.getElementById('view-preview').style.display = mode === 'preview' ? 'flex' : 'none';

  if (mode === 'zero') {
    if (!zeroBlockEditor) {
      const page = tildaEngine?.getActivePage();
      const zbBlock = page?.blocks.find(b => b.instanceId === tildaEngine.activeBlockId && (b.isZero || b.blockDefId === 'zero-1'))
        || page?.blocks.find(b => b.isZero || b.blockDefId === 'zero-1');

      if (zbBlock) {
        window.openZeroEditorForBlock(zbBlock.instanceId);
        return;
      } else {
        zeroBlockEditor = new ZeroBlockEditor('#zero-block-canvas-mount');
        window.zeroBlockEditor = zeroBlockEditor;
      }
    }

    zeroBlockEditor.onSelectionChange = () => {
      const propsPanel = document.getElementById('tilda-props-panel');
      const anchors = tildaEngine ? tildaEngine.getPageAnchorsList() : [];
      zeroBlockEditor.renderInspector(propsPanel, anchors);
    };

    zeroBlockEditor.render();
    const propsPanel = document.getElementById('tilda-props-panel');
    const anchors = tildaEngine ? tildaEngine.getPageAnchorsList() : [];
    zeroBlockEditor.renderInspector(propsPanel, anchors);
  } else if (mode === 'code') {
    syncToCodeEditor();
  } else if (mode === 'preview') {
    syncToPreviewFrame();
  } else if (mode === 'builder') {
    tildaEngine.renderArtboard();
    tildaEngine.renderInspector();
  }
}

// ─── Zero Block Global Helper ──────────────────────────────────
window.openZeroEditorForBlock = function(instanceId) {
  if (!tildaEngine) return;
  const page = tildaEngine.getActivePage();
  const blk = page?.blocks.find(b => b.instanceId === instanceId);
  if (!blk) return;

  window.activeEditingZeroBlockId = instanceId;

  const zbData = {
    id: blk.instanceId,
    settings: {
      height: parseInt(blk.design?.height) || 600,
      background: blk.design?.background || blk.design?.bgColor || '#070a13',
      backgroundImage: blk.design?.bgImage || '',
      gridWidth: 1200
    },
    elements: blk.content?.elements || []
  };

  zeroBlockEditor = new ZeroBlockEditor('#zero-block-canvas-mount', zbData);
  window.zeroBlockEditor = zeroBlockEditor;

  zeroBlockEditor.onSelectionChange = () => {
    const propsPanel = document.getElementById('tilda-props-panel');
    const anchors = tildaEngine.getPageAnchorsList();
    zeroBlockEditor.renderInspector(propsPanel, anchors);
  };

  switchMode('zero');
};

// ─── Zero Block Toolbar ────────────────────────────────────────
function bindZeroBlockToolbar() {
  document.getElementById('zb-add-h1')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('h1', { content: 'Новый заголовок H1' });
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-h2')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('h2', { content: 'Новый заголовок H2' });
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-text')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('text', { content: 'Новый текстовый блок' });
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-btn')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('btn', { content: 'Кнопка действия' });
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-img')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('img', {});
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-shape')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('shape', {});
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-icon')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('icon', {});
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });
  document.getElementById('zb-add-form')?.addEventListener('click', () => {
    const el = zeroBlockEditor?.block.addElement('form', {});
    zeroBlockEditor?.saveHistory();
    zeroBlockEditor?.render();
    if (el) zeroBlockEditor?.selectElement(el.id);
  });

  // Undo / Redo
  document.getElementById('zb-undo')?.addEventListener('click', () => {
    zeroBlockEditor?.undo();
  });
  document.getElementById('zb-redo')?.addEventListener('click', () => {
    zeroBlockEditor?.redo();
  });

  // Breakpoints switcher
  document.querySelectorAll('.zb-bp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zb-bp-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const bp = parseInt(btn.dataset.bp) || 1200;
      zeroBlockEditor?.setBreakpoint(bp);
    });
  });

  // Alignment
  document.getElementById('zb-align-left')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('left'));
  document.getElementById('zb-align-center')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('center'));
  document.getElementById('zb-align-right')?.addEventListener('click', () => zeroBlockEditor?.alignSelected('right'));

  // Duplicate & Delete & Auto-Layout
  document.getElementById('zb-dup-el')?.addEventListener('click', () => {
    zeroBlockEditor?.duplicateSelectedElement();
    showToast('📋 Элемент продублирован');
  });
  document.getElementById('zb-del-el')?.addEventListener('click', () => {
    zeroBlockEditor?.deleteSelectedElement();
    showToast('🗑️ Элемент удалён');
  });
  document.getElementById('zb-auto-layout-mobile')?.addEventListener('click', () => {
    zeroBlockEditor?.autoLayoutMobile();
    showToast('✨ Элементы автоматически адаптированы под экран');
  });

  // Apply & Save back to Page Block
  document.getElementById('zb-btn-apply')?.addEventListener('click', () => {
    if (tildaEngine && zeroBlockEditor) {
      const page = tildaEngine.getActivePage();
      if (page) {
        let blk = window.activeEditingZeroBlockId
          ? page.blocks.find(b => b.instanceId === window.activeEditingZeroBlockId)
          : page.blocks.find(b => b.typeId === 'zero-1');
        if (!blk) {
          blk = tildaEngine.createBlockInstance('zero-1');
          if (blk) {
            page.blocks.push(blk);
            window.activeEditingZeroBlockId = blk.instanceId;
          }
        }
        if (blk) {
          blk.content = blk.content || {};
          blk.content.elements = zeroBlockEditor.block.elements.map(e => ({
            id: e.id,
            type: e.type,
            props: { ...e.props },
            responsiveProps: { ...e.responsiveProps }
          }));
          blk.design = blk.design || {};
          blk.design.height = parseInt(zeroBlockEditor.block.settings.height, 10) || 560;
          blk.design.background = zeroBlockEditor.block.settings.background;
          blk.design.bgColor = zeroBlockEditor.block.settings.background;

          tildaEngine.saveHistory();
          tildaEngine.renderArtboard();
          tildaEngine.renderLayersTree();
          tildaEngine.selectBlock(blk.instanceId);
          saveFullProject(tildaEngine.project);
        }
      }
    }
    showToast('✅ Изменения Zero Block зафиксированы и сохранены!');
    switchMode('builder');
  });
}

// ─── Модальные окна ────────────────────────────────────────────
function initModals() {
  // 1. Создание нового проекта
  const createProjModal = document.getElementById('create-project-modal');
  let selectedProjTemplate = 'landing';

  createProjModal?.querySelectorAll('.proj-template-card').forEach(card => {
    card.addEventListener('click', () => {
      createProjModal.querySelectorAll('.proj-template-card').forEach(c => {
        c.classList.remove('is-active');
        c.style.borderColor = '#1e293f';
      });
      card.classList.add('is-active');
      card.style.borderColor = '#0d99ff';
      selectedProjTemplate = card.dataset.projTemplate;
    });
  });

  document.getElementById('btn-close-create-proj-modal')?.addEventListener('click', () => {
    createProjModal?.classList.add('hidden');
  });

  document.getElementById('btn-confirm-create-proj')?.addEventListener('click', () => {
    const name = (document.getElementById('new-proj-name-input')?.value || '').trim() || 'Новый сайт Aurora Web';
    const newProj = tildaEngine.createDefaultProject();
    newProj.id = 'proj_' + Date.now();
    newProj.name = name;
    newProj.category = selectedProjTemplate;

    if (typeof tildaEngine.getTemplateBlocks === 'function') {
      newProj.pages[0].blocks = tildaEngine.getTemplateBlocks(selectedProjTemplate);
    }

    const templateMeta = {
      landing: { accent: '#0d99ff', font: 'Montserrat', title: name, subtitle: 'Запустите современный сайт с высокой конверсией за считанные минуты' },
      store: { accent: '#10b981', font: 'Montserrat', title: 'Магазин гаджетов и электроники', subtitle: 'Оригинальная продукция с быстрой доставкой и гарантией качества' },
      portfolio: { accent: '#8b5cf6', font: 'Unbounded', title: 'Креативная студия и портфолио', subtitle: 'Создаём запоминающиеся цифровые продукты, дизайн-системы и брендинг' },
      restaurant: { accent: '#f59e0b', font: 'Playfair Display', title: 'Авторский ресторан & Гастробар', subtitle: 'Изысканная кухня на открытом огне, уютная атмосфера и онлайн-бронирование столиков' },
      event: { accent: '#ec4899', font: 'Unbounded', title: 'Главный технологический саммит 2026', subtitle: 'Более 40 спикеров мирового уровня, нетворкинг и практические воркшопы' },
      education: { accent: '#3b82f6', font: 'Montserrat', title: 'Онлайн-академия современных профессий', subtitle: 'Практическое обучение с личным ментором, реальными проектами и трудоустройством' },
      medical: { accent: '#06b6d4', font: 'Inter', title: 'Центр современной медицины и здоровья', subtitle: 'Передовая диагностика, опытные врачи и бережный подход к каждому пациенту' },
      realestate: { accent: '#d97706', font: 'Playfair Display', title: 'Эксклюзивная недвижимость бизнес-класса', subtitle: 'Подбор апартаментов, пентхаусов и загородных резиденций с полным сопровождением' },
      blog: { accent: '#6366f1', font: 'Montserrat', title: 'Медиа-журнал о технологиях и дизайне', subtitle: 'Аналитика, свежие тренды индустрии, интервью с экспертами и обзоры' },
      saas: { accent: '#0ea5e9', font: 'Inter', title: 'Облачная AI-платформа для бизнеса', subtitle: 'Автоматизируйте рутинные процессы, анализируйте метрики и ускоряйте рост команды' },
      agency: { accent: '#a855f7', font: 'Unbounded', title: 'Digital-агентство полного цикла', subtitle: 'Комплексный маркетинг, разработка веб-сервисов и масштабирование брендов' },
      blank: { accent: '#0d99ff', font: 'Montserrat', title: name, subtitle: 'Начните создание уникального проекта с чистого листа' }
    };

    const meta = templateMeta[selectedProjTemplate] || templateMeta.landing;
    newProj.globalStyles.colorAccent = meta.accent;
    newProj.globalStyles.buttonBg = meta.accent;
    newProj.globalStyles.fontHeading = meta.font;

    const coverBlock = newProj.pages[0].blocks.find(b => b.blockDefId && b.blockDefId.startsWith('cover-'));
    if (coverBlock && coverBlock.content) {
      coverBlock.content.title = meta.title;
      coverBlock.content.subtitle = meta.subtitle;
    }

    saveFullProject(newProj);
    createProjModal?.classList.add('hidden');
    openProject(newProj.id);
  });

  // 2. Переименование проекта
  const renameModal = document.getElementById('rename-project-modal');
  document.getElementById('btn-close-rename-proj-modal')?.addEventListener('click', () => {
    renameModal?.classList.add('hidden');
  });

  document.getElementById('btn-confirm-rename-proj')?.addEventListener('click', () => {
    const id = renameModal.dataset.editingProjId;
    const newName = (document.getElementById('rename-proj-input')?.value || '').trim();
    if (id && newName) {
      const proj = loadProjectById(id);
      if (proj) {
        proj.name = newName;
        saveFullProject(proj);
        if (tildaEngine.project.id === id) {
          tildaEngine.project.name = newName;
          const titleInput = document.getElementById('project-title');
          if (titleInput) titleInput.value = newName;
        }
        renderProjectsDashboard();
        showToast('✅ Проект переименован');
      }
    }
    renameModal?.classList.add('hidden');
  });

  // 3. Шаблоны страниц
  const newPageModal = document.getElementById('new-page-modal');
  let selectedPageTemplate = 'landing';

  newPageModal?.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      newPageModal.querySelectorAll('.template-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      selectedPageTemplate = card.dataset.template;
    });
  });

  document.getElementById('btn-close-new-page-modal')?.addEventListener('click', () => {
    newPageModal?.classList.add('hidden');
  });

  document.getElementById('btn-create-page-confirm')?.addEventListener('click', () => {
    const title = (document.getElementById('np-page-title')?.value || '').trim() || 'Новая страница';
    const slug = (document.getElementById('np-page-slug')?.value || '').trim() || 'page-' + Date.now();
    tildaEngine.addPage(title, slug, selectedPageTemplate);
    newPageModal?.classList.add('hidden');
    showToast(`✅ Страница «${title}» создана`);
  });

  // 4. SEO настройки страницы
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
      saveFullProject(tildaEngine.project);
      showToast('✅ Настройки страницы сохранены');
    }
    pageSeoModal?.classList.add('hidden');
  });

  // 5. Товар магазина
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
    saveFullProject(tildaEngine.project);
    prodModal?.classList.add('hidden');
    showToast('✅ Каталог товаров обновлен');
  });

  // 6. Замена изображений (Живая замена фото)
  initImageReplaceModal();

  // 7. OFONT.RU Custom Fonts
  initOfontModal();

  // 8. Cloud Modal
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

// ─── Модалка замены изображений (Unsplash + File + URL) ──────────
function initImageReplaceModal() {
  const modal = document.getElementById('image-replace-modal');
  const closeBtn = document.getElementById('btn-close-img-modal');
  const tabs = modal?.querySelectorAll('.img-tab-btn');
  const dropzone = document.getElementById('img-dropzone');
  const fileInput = document.getElementById('img-file-input');
  const urlInput = document.getElementById('img-url-input');
  const applyUrlBtn = document.getElementById('btn-apply-img-url');
  const galleryGrid = document.getElementById('unsplash-gallery-grid');

  let onSelectCallback = null;

  window.openImageReplaceModal = (cb) => {
    onSelectCallback = cb;
    modal?.classList.remove('hidden');
    populateUnsplashGallery();
  };

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  tabs?.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => {
        b.classList.remove('is-active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-3)';
      });
      btn.classList.add('is-active');
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color = '#fff';

      const tab = btn.dataset.imgTab;
      document.querySelectorAll('.img-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`img-tab-${tab}`)?.classList.remove('hidden');
    });
  });

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onSelectCallback?.(ev.target.result);
      modal?.classList.add('hidden');
      showToast('🖼️ Изображение загружено с ПК');
    };
    reader.readAsDataURL(file);
  });

  applyUrlBtn?.addEventListener('click', () => {
    const val = (urlInput?.value || '').trim();
    if (val) {
      onSelectCallback?.(val);
      modal?.classList.add('hidden');
      showToast('🖼️ Ссылка на изображение применена');
    }
  });

  function populateUnsplashGallery() {
    if (!galleryGrid) return;
    const photos = [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'
    ];

    galleryGrid.innerHTML = photos.map(url => `
      <div class="gallery-photo-thumb" style="border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:16/10;background:#1e293b;border:1px solid #334155;transition:transform 0.15s,border-color 0.15s;">
        <img src="${url}" style="width:100%;height:100%;object-fit:cover;" alt="Unsplash" />
      </div>
    `).join('');

    galleryGrid.querySelectorAll('.gallery-photo-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const img = thumb.querySelector('img');
        if (img?.src) {
          onSelectCallback?.(img.src);
          modal?.classList.add('hidden');
          showToast('🖼️ Фото из Unsplash установлено');
        }
      });
    });
  }
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

    customFonts = customFonts.filter(x => x.name !== name);
    customFonts.push({ name, fileName: pendingFontFileName, buffer: pendingFontBuffer });
    renderCustomFontsList();

    if (tildaEngine?.project?.globalStyles) {
      tildaEngine.project.globalStyles.fontHeading = name;
      tildaEngine.applyGlobalStyles();
      tildaEngine.renderDesignTokensUI();
      saveFullProject(tildaEngine.project);
    }

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
        <div style="font-weight:700;font-size:13px;color:#fff;font-family:'${escapeHtml(f.name)}',sans-serif;">${escapeHtml(f.name)}</div>
        <div style="font-size:10px;color:#94a3b8;">${escapeHtml(f.fileName || 'ofont.ru')}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="topbar-action-btn font-apply-btn" data-font="${escapeHtml(f.name)}" style="padding:4px 10px;font-size:11px;">Применить</button>
        <button class="topbar-action-btn font-del-btn" data-font="${escapeHtml(f.name)}" style="padding:4px 8px;font-size:11px;color:#f43f5e;">✕</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.font-apply-btn').forEach(b => {
    b.addEventListener('click', () => {
      const fname = b.dataset.font;
      if (tildaEngine?.project?.globalStyles) {
        tildaEngine.project.globalStyles.fontHeading = fname;
        tildaEngine.applyGlobalStyles();
        tildaEngine.renderDesignTokensUI();
        saveFullProject(tildaEngine.project);
      }
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
    const frame = document.getElementById('fullscreen-preview-frame');
    const customHtml = codeEditor?.state?.doc?.toString();
    if (frame && customHtml) {
      document.querySelectorAll('.editor-mode-tab').forEach(t => {
        t.classList.toggle('is-active', t.dataset.mode === 'preview');
      });
      document.getElementById('view-dashboard')?.classList.add('hidden');
      document.getElementById('view-builder')?.classList.add('hidden');
      document.getElementById('view-zeroblock')?.classList.add('hidden');
      document.getElementById('view-code')?.classList.add('hidden');
      document.getElementById('view-preview')?.classList.remove('hidden');
      bindPreviewControlBar();
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(customHtml);
        doc.close();
      }
    }
    showToast('⚡ Код скомпилирован и запущен в превью');
  });
}

function syncToCodeEditor() {
  if (!codeEditor || !tildaEngine) return;
  const fullHtml = tildaEngine.generateStandaloneHtml();
  codeEditor.dispatch({
    changes: { from: 0, to: codeEditor.state.doc.length, insert: fullHtml }
  });
}

let previewControlsBound = false;

function bindPreviewControlBar() {
  if (previewControlsBound) return;
  const viewPreview = document.getElementById('view-preview');
  const frame = document.getElementById('fullscreen-preview-frame');
  if (!viewPreview || !frame) return;

  let bar = document.getElementById('preview-control-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'preview-control-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15);border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,0.45);';
    bar.innerHTML = `
      <button type="button" class="topbar-action-btn is-active" data-preview-vp="100%" title="Desktop (100%)" style="border-radius:999px;padding:6px 12px;font-size:12px;">🖥️ ПК</button>
      <button type="button" class="topbar-action-btn" data-preview-vp="768px" title="Tablet (768px)" style="border-radius:999px;padding:6px 12px;font-size:12px;">📱 Планшет</button>
      <button type="button" class="topbar-action-btn" data-preview-vp="375px" title="Mobile (375px)" style="border-radius:999px;padding:6px 12px;font-size:12px;">📲 Смартфон</button>
      <div style="width:1px;height:20px;background:rgba(255,255,255,0.15);margin:0 4px;"></div>
      <button type="button" id="btn-preview-replay-anim" class="topbar-action-btn" title="Перезапустить анимации" style="border-radius:999px;padding:6px 12px;font-size:12px;color:#38bdf8;">✨ Повторить анимации</button>
      <button type="button" id="btn-preview-back-builder" class="topbar-action-btn btn-primary" title="Вернуться в конструктор" style="border-radius:999px;padding:6px 14px;font-size:12px;">← В редактор</button>
    `;
    viewPreview.appendChild(bar);
  }

  bar.querySelectorAll('[data-preview-vp]').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('[data-preview-vp]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const vp = btn.dataset.previewVp || '100%';
      frame.style.width = vp;
      frame.style.margin = vp === '100%' ? '0' : '0 auto';
      frame.style.display = 'block';
      frame.style.transition = 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  });

  document.getElementById('btn-preview-replay-anim')?.addEventListener('click', () => {
    if (frame.contentWindow?.TildaRuntime?.replayAllAnimations) {
      frame.contentWindow.TildaRuntime.replayAllAnimations();
      showToast('✨ Анимации перезапущены');
      return;
    }
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;
    const animEls = doc.querySelectorAll('[data-tilda-anim]');
    animEls.forEach(el => {
      const aType = el.getAttribute('data-tilda-anim');
      el.classList.remove('tilda-animated-in', `anim-${aType}`);
      void el.offsetWidth;
    });
    setTimeout(() => {
      animEls.forEach((el, idx) => {
        const aType = el.getAttribute('data-tilda-anim');
        const delay = parseFloat(el.getAttribute('data-anim-delay') || '0') * 1000;
        const duration = parseFloat(el.getAttribute('data-anim-duration') || '0.7');
        el.style.transitionDuration = `${duration}s`;
        el.style.animationDuration = `${duration}s`;
        setTimeout(() => {
          if (aType && aType !== 'none') {
            el.classList.add('tilda-animated-in', `anim-${aType}`);
          }
        }, delay || idx * 90);
      });
      showToast('✨ Анимации перезапущены');
    }, 60);
  });

  document.getElementById('btn-preview-back-builder')?.addEventListener('click', () => {
    switchMode('builder');
  });

  previewControlsBound = true;
}

function syncToPreviewFrame() {
  const frame = document.getElementById('fullscreen-preview-frame');
  if (!frame || !tildaEngine) return;
  bindPreviewControlBar();

  const fullHtml = tildaEngine.generateStandaloneHtml();
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    try {
      frame.contentWindow?.TildaRuntime?.init?.();
      const innerDoc = frame.contentDocument || frame.contentWindow?.document;
      if (!innerDoc) return;
      const animEls = innerDoc.querySelectorAll('[data-tilda-anim]');
      if ('IntersectionObserver' in (frame.contentWindow || window)) {
        const IO = frame.contentWindow?.IntersectionObserver || IntersectionObserver;
        const obs = new IO((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target;
              const aType = el.getAttribute('data-tilda-anim');
              const delay = parseFloat(el.getAttribute('data-anim-delay') || '0') * 1000;
              const duration = parseFloat(el.getAttribute('data-anim-duration') || '0.7');
              el.style.transitionDuration = `${duration}s`;
              el.style.animationDuration = `${duration}s`;
              setTimeout(() => {
                if (aType && aType !== 'none') {
                  el.classList.add('tilda-animated-in', `anim-${aType}`);
                }
              }, delay);
              obs.unobserve(el);
            }
          });
        }, { threshold: 0.12 });
        animEls.forEach(el => obs.observe(el));
      } else {
        animEls.forEach(el => {
          const aType = el.getAttribute('data-tilda-anim');
          if (aType && aType !== 'none') {
            el.classList.add('tilda-animated-in', `anim-${aType}`);
          }
        });
      }
    } catch (err) {
      console.warn('Preview runtime init warning:', err);
    }
  }, 80);
}

// ─── Экспорт полноценного ZIP архива проекта ──────────────────
async function exportProjectZip() {
  showToast('📦 Сборка полноценного ZIP-архива сайта...');
  const title = tildaEngine.project.name || 'aurora-web-site';
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9а-яё_-]/gi, '_');

  if (typeof JSZip === 'undefined') {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (e) {
      console.warn('JSZip load error, falling back to standalone HTML:', e);
      const fullHtml = tildaEngine.generateStandaloneHtml();
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ Готовый HTML-файл сайта скачан');
      return;
    }
  }

  const zip = new JSZip();

  // 1. Папка fonts/ и добавление загруженных шрифтов
  const fontsFolder = zip.folder('fonts');
  if (customFonts && customFonts.length > 0) {
    for (const f of customFonts) {
      if (f.buffer) {
        fontsFolder.file(f.fileName, f.buffer);
      }
    }
  }

  // 2. Папка css/ и файл css/style.css со стилями и @font-face
  const cssFolder = zip.folder('css');
  const cssContent = tildaEngine.generateZipCss(customFonts);
  cssFolder.file('style.css', cssContent);

  // 3. Папка js/ и файл js/runtime.js
  const jsFolder = zip.folder('js');
  let runtimeCode = '';
  try {
    const res = await fetch('tilda_runtime.js');
    if (res.ok) runtimeCode = await res.text();
  } catch (e) {
    console.warn('Runtime fetch fallback:', e);
  }
  if (!runtimeCode) {
    runtimeCode = `/* AURORA WEB Interactive Runtime Engine */\nconsole.log('AURORA WEB Runtime Ready');`;
  }
  jsFolder.file('runtime.js', runtimeCode);

  // 4. Генерация страниц HTML (index.html и остальные страницы)
  tildaEngine.project.pages.forEach((page, idx) => {
    const isIndex = idx === 0 || page.slug === 'index';
    const filename = isIndex ? 'index.html' : `${page.slug}.html`;
    const pageHtml = tildaEngine.generatePageHtml(page, { isZip: true });
    zip.file(filename, pageHtml);
  });

  // 5. Файл проекта project.json (для повторного импорта и восстановления в AURORA WEB)
  zip.file('project.json', JSON.stringify(tildaEngine.project, null, 2));

  // 6. Генерация архива и скачивание
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanTitle}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`🎉 Проект «${title}» успешно экспортирован в ZIP со всеми HTML, CSS, JS, шрифтами и ресурсами!`);
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, switchMode, openProject, tildaEngine };
