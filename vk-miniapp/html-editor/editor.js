// ============================================================
//  Aurora HTML Editor v2.0  —  editor.js
//  AAA-class code editor with animations, templates, console
// ============================================================
// Sections:
//   1. Imports (CodeMirror 6 via import map)
//   2. Constants & Config
//   3. Aurora Dark Theme
//   4. State Management
//   5. CodeMirror Setup
//   6. Preview Engine
//   7. Console System
//   8. Animation Timeline
//   9. Templates Gallery
//  10. Project Manager
//  11. Toolbar & UI Actions
//  12. Splitter (resize panels)
//  13. Keyboard Shortcuts
//  14. Toast Notifications
//  15. Init & Bootstrap
// ============================================================

// ─── 1. Imports ──────────────────────────────────────────────
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor
} from "@codemirror/view";
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
  undo, redo
} from "@codemirror/commands";
import {
  bracketMatching, foldGutter, foldKeymap,
  syntaxHighlighting, HighlightStyle, indentOnInput
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { html, htmlCompletionSource } from "@codemirror/lang-html";
import { css, cssCompletionSource } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { search, searchKeymap, openSearchPanel } from "@codemirror/search";
import {
  autocompletion, completionKeymap,
  closeBrackets, closeBracketsKeymap
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { VisualEditor } from "./visual.js";

// ─── 2. Constants & Config ────────────────────────────────────
const VERSION = "2.0.0";
const STORAGE_KEY = "aurora_html_editor";
const PROJECTS_KEY = "aurora_html_editor_projects";

const CONFIG = {
  debounceMs: 400,
  autoSaveMs: 30000,
  maxProjects: 20,
  defaultFontSize: 14,
  minFontSize: 10,
  maxFontSize: 24,
  responsiveSizes: {
    mobile: { w: "375px", label: "📱 375" },
    tablet: { w: "768px", label: "💻 768" },
    desktop: { w: "1280px", label: "🖥 1280" },
    auto: { w: "100%", label: "🔲 Авто" }
  }
};

// ─── 3. Aurora Dark Theme ─────────────────────────────────────
const auroraTheme = EditorView.theme({
  "&": {
    color: "#f8fafc",
    backgroundColor: "#080c14",
    height: "100%",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": { caretColor: "#22d3ee", padding: "8px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#22d3ee", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(34,211,238,0.18)"
  },
  ".cm-panels": { backgroundColor: "#0d1117", color: "#f8fafc" },
  ".cm-searchMatch": { backgroundColor: "#fbbf2440", outline: "1px solid #fbbf24" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#fbbf2470" },
  ".cm-activeLine": { backgroundColor: "rgba(34,211,238,0.05)" },
  ".cm-selectionMatch": { backgroundColor: "rgba(192,132,252,0.2)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "rgba(34,211,238,0.25)", color: "#22d3ee" },
  "&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "rgba(248,113,113,0.3)" },
  ".cm-gutters": {
    backgroundColor: "#0a0e18",
    color: "#475569",
    border: "none",
    borderRight: "1px solid rgba(34,211,238,0.1)"
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 4px", minWidth: "32px" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(34,211,238,0.07)", color: "#94a3b8" },
  ".cm-foldPlaceholder": {
    backgroundColor: "rgba(34,211,238,0.15)",
    border: "1px solid rgba(34,211,238,0.3)",
    color: "#22d3ee",
    borderRadius: "3px",
    padding: "0 4px"
  },
  ".cm-tooltip": {
    border: "1px solid rgba(34,211,238,0.2)",
    backgroundColor: "#111827",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    borderRadius: "6px"
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "rgba(34,211,238,0.15)",
    color: "#f8fafc"
  },
  ".cm-completionIcon": { color: "#c084fc" },
  ".cm-completionLabel": { color: "#f8fafc" },
  ".cm-completionDetail": { color: "#64748b", fontStyle: "italic" }
}, { dark: true });

const auroraHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#22d3ee", fontWeight: "600" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#93c5fd" },
  { tag: [t.function(t.variableName), t.labelName], color: "#c084fc" },
  { tag: [t.constant(t.name), t.standard(t.name)], color: "#22d3ee" },
  { tag: t.definition(t.name), color: "#f8fafc" },
  { tag: [t.typeName, t.className, t.namespace], color: "#fbbf24" },
  { tag: t.number, color: "#fb923c" },
  { tag: [t.operator, t.operatorKeyword], color: "#22d3ee" },
  { tag: [t.meta, t.comment], color: "#4ade80", fontStyle: "italic" },
  { tag: [t.string, t.inserted, t.processingInstruction], color: "#86efac" },
  { tag: [t.url, t.escape], color: "#6ee7b7" },
  { tag: t.regexp, color: "#fb923c" },
  { tag: t.self, color: "#c084fc" },
  { tag: t.bool, color: "#fb923c" },
  { tag: t.atom, color: "#22d3ee" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#64748b", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#22d3ee" },
  { tag: t.tagName, color: "#f87171" },
  { tag: t.attributeName, color: "#fbbf24" },
  { tag: t.attributeValue, color: "#86efac" },
  { tag: t.angleBracket, color: "#94a3b8" },
  { tag: t.invalid, color: "#f87171", textDecoration: "underline" }
]);

// ─── 4. State Management ──────────────────────────────────────
const wordWrapComp = new Compartment();
const fontSizeComp = new Compartment();

const appState = {
  html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мой проект</title>
</head>
<body>
  <div class="container">
    <h1 class="title">✨ Aurora Editor</h1>
    <p class="subtitle">Начни создавать прямо здесь!</p>
    <button class="btn" onclick="greet()">Нажми меня</button>
  </div>
</body>
</html>`,
  css: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #080c14 0%, #0d1117 50%, #0a0e18 100%);
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
  overflow: hidden;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(34,211,238,0.07) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(192,132,252,0.07) 0%, transparent 60%);
  pointer-events: none;
}

.container {
  text-align: center;
  padding: 48px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(34,211,238,0.15);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  animation: fadeInUp 0.8s ease both;
}

.title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #22d3ee, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 32px;
}

.btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #22d3ee, #c084fc);
  border: none;
  border-radius: 50px;
  color: #080c14;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 12px 40px rgba(34,211,238,0.4);
}

.btn:active { transform: scale(0.97); }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}`,
  js: `function greet() {
  const messages = [
    '🚀 Поехали!',
    '✨ Aurora — это магия!',
    '💻 Код — это искусство!',
    '🎨 Твори без ограничений!'
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  console.log(msg);
  
  // Анимация кнопки
  const btn = document.querySelector('.btn');
  btn.textContent = msg;
  btn.style.animation = 'none';
  btn.offsetHeight; // reflow
  btn.style.animation = 'pulse 0.5s ease';
  setTimeout(() => { btn.textContent = 'Нажми меня'; }, 1500);
}

console.log('🌌 Aurora Editor готов к работе!');`,
  activeTab: "html",
  layout: "horizontal",
  fontSize: CONFIG.defaultFontSize,
  wordWrap: false,
  projectName: "Новый проект",
  zenMode: false,
  consoleOpen: true,
  timelineOpen: false,
  editorMode: "code"
};

let visualEditor = null;
const editors = { html: null, css: null, js: null };

// ─── 5. CodeMirror Setup ──────────────────────────────────────
function getExtensions(lang, fontSize, wordWrap) {
  const langMap = { html: html({ autoCloseTags: true }), css: css(), js: javascript({ jsx: false }) };
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter({ openText: "▾", closedText: "▸" }),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ activateOnTyping: true }),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    history(),
    search({ top: true }),
    syntaxHighlighting(auroraHighlight, { fallback: true }),
    auroraTheme,
    langMap[lang] || langMap.html,
    wordWrapComp.of(wordWrap ? EditorView.lineWrapping : []),
    fontSizeComp.of(EditorView.theme({ ".cm-content": { fontSize: fontSize + "px" } })),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab
    ]),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        appState[lang] = update.state.doc.toString();
        schedulePreviewUpdate();
        updateStatusBar(lang, update.state);
      } else if (update.selectionSet) {
        updateStatusBar(lang, update.state);
      }
    })
  ];
}

function initEditors() {
  const mounts = {
    html: document.getElementById("cm-html"),
    css: document.getElementById("cm-css"),
    js: document.getElementById("cm-js")
  };
  ["html", "css", "js"].forEach(lang => {
    if (!mounts[lang]) return;
    editors[lang] = new EditorView({
      state: EditorState.create({
        doc: appState[lang],
        extensions: getExtensions(lang, appState.fontSize, appState.wordWrap)
      }),
      parent: mounts[lang]
    });
  });
}

function switchTab(tab) {
  appState.activeTab = tab;
  ["html", "css", "js"].forEach(t => {
    const pane = document.getElementById("cm-" + t);
    const btn = document.querySelector(`.editor-tab[data-tab="${t}"]`);
    if (pane) pane.style.display = t === tab ? "flex" : "none";
    if (btn) btn.classList.toggle("is-active", t === tab);
  });
  if (editors[tab]) editors[tab].focus();
  updateStatusBar(tab, editors[tab]?.state);
}

function updateStatusBar(lang, state) {
  const pos = state?.selection?.main;
  const doc = state?.doc;
  if (!pos || !doc) return;
  const line = doc.lineAt(pos.head);
  const col = pos.head - line.from + 1;
  const lines = doc.lines;
  const chars = doc.length;
  const elLine = document.getElementById("sb-line");
  const elChars = document.getElementById("sb-chars");
  const elLang = document.getElementById("sb-lang");
  if (elLine) elLine.textContent = `Стр ${line.number}:${col}`;
  if (elChars) elChars.textContent = `${lines} строк, ${chars} символов`;
  if (elLang) elLang.textContent = lang.toUpperCase();
}

// ─── 6. Preview Engine ────────────────────────────────────────
let previewTimer = null;

function schedulePreviewUpdate() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(runPreview, CONFIG.debounceMs);
}

function runPreview() {
  const iframe = document.getElementById("preview-frame");
  if (!iframe) return;

  const iframeConsoleScript = `
    <script>
      (function() {
        const _parent = window.parent;
        function relay(level, args) {
          try {
            _parent.postMessage({ type: 'console', level, args: args.map(a => {
              try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); } catch(e) { return String(a); }
            })}, '*');
          } catch(e) {}
        }
        ['log','warn','error','info'].forEach(m => {
          const orig = console[m];
          console[m] = (...a) => { relay(m, a); orig.apply(console, a); };
        });
        window.onerror = (msg, src, line, col) => relay('error', [\`\${msg} (строка \${line}:\${col})\`]);
        window.onunhandledrejection = e => relay('error', ['Необработанный промис:', String(e.reason)]);
      })();
    <\/script>`;

  const srcdoc = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${iframeConsoleScript}
<style>
  /* Aurora preview base */
  * { box-sizing: border-box; }
  body { margin: 0; }
</style>
<style id="_user_css">${appState.css}</style>
</head>
<body>
${appState.html.replace(/<\s*html[^>]*>[\s\S]*?<\s*body[^>]*>/i, '').replace(/<\s*\/\s*body\s*>[\s\S]*/i, '')}
<script>
${appState.js}
<\/script>
</body>
</html>`;

  iframe.srcdoc = srcdoc;

  const indicator = document.getElementById("preview-indicator");
  if (indicator) {
    indicator.classList.add("pulse");
    setTimeout(() => indicator.classList.remove("pulse"), 600);
  }
}

function setPreviewWidth(size) {
  const wrap = document.getElementById("preview-wrapper");
  if (!wrap) return;
  wrap.style.maxWidth = size;
  wrap.style.margin = size === "100%" ? "0" : "0 auto";
  document.querySelectorAll(".resp-btn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.size === size);
  });
}

// ─── 7. Console System ────────────────────────────────────────
let errorCount = 0;

function initConsole() {
  window.addEventListener("message", e => {
    if (e.data?.type === "console") {
      addConsoleLine(e.data.level, e.data.args);
    }
  });
}

function addConsoleLine(level, args) {
  const out = document.getElementById("console-output");
  if (!out) return;
  if (level === "error") { errorCount++; refreshErrorBadge(); }

  const row = document.createElement("div");
  row.className = `con-row con-${level}`;
  const icons = { log: "›", warn: "⚠", error: "✕", info: "ℹ" };
  const text = args.join(" ");
  row.innerHTML = `<span class="con-icon">${icons[level] || "›"}</span><pre class="con-text">${escHtml(text)}</pre>`;
  out.appendChild(row);
  out.scrollTop = out.scrollHeight;

  const badge = document.getElementById("console-badge");
  if (badge) {
    const total = out.childElementCount;
    badge.textContent = total;
    badge.style.display = "flex";
  }
}

function clearConsole() {
  const out = document.getElementById("console-output");
  if (out) out.innerHTML = "";
  errorCount = 0;
  refreshErrorBadge();
  const badge = document.getElementById("console-badge");
  if (badge) badge.style.display = "none";
}

function refreshErrorBadge() {
  const el = document.getElementById("error-count");
  if (el) el.textContent = errorCount > 0 ? `${errorCount} ошибок` : "";
}

function toggleConsole() {
  appState.consoleOpen = !appState.consoleOpen;
  const con = document.getElementById("editor-console");
  const btn = document.getElementById("btn-toggle-console");
  if (con) con.classList.toggle("is-collapsed", !appState.consoleOpen);
  if (btn) btn.classList.toggle("is-active", appState.consoleOpen);
}

// ─── 8. Animation Timeline ────────────────────────────────────
const ANIMATION_PRESETS = {
  fadeIn: {
    label: "Fade In", icon: "🌅",
    keyframes: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    usage: `.element { animation: fadeIn 0.8s ease both; }`
  },
  fadeOut: {
    label: "Fade Out", icon: "🌇",
    keyframes: `@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
    usage: `.element { animation: fadeOut 0.8s ease both; }`
  },
  slideInLeft: {
    label: "Slide Left", icon: "⬅️",
    keyframes: `@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
    usage: `.element { animation: slideInLeft 0.6s ease both; }`
  },
  slideInRight: {
    label: "Slide Right", icon: "➡️",
    keyframes: `@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
    usage: `.element { animation: slideInRight 0.6s ease both; }`
  },
  slideInUp: {
    label: "Slide Up", icon: "⬆️",
    keyframes: `@keyframes slideInUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
    usage: `.element { animation: slideInUp 0.6s ease both; }`
  },
  bounceIn: {
    label: "Bounce In", icon: "🏀",
    keyframes: `@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}`,
    usage: `.element { animation: bounceIn 0.8s cubic-bezier(.215,.61,.355,1) both; }`
  },
  zoomIn: {
    label: "Zoom In", icon: "🔍",
    keyframes: `@keyframes zoomIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
    usage: `.element { animation: zoomIn 0.5s ease both; }`
  },
  rotateIn: {
    label: "Rotate In", icon: "🔄",
    keyframes: `@keyframes rotateIn {
  from { transform: rotate(-180deg) scale(0.5); opacity: 0; }
  to { transform: rotate(0) scale(1); opacity: 1; }
}`,
    usage: `.element { animation: rotateIn 0.7s ease both; }`
  },
  pulse: {
    label: "Pulse", icon: "💓",
    keyframes: `@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}`,
    usage: `.element { animation: pulse 1.5s ease infinite; }`
  },
  shake: {
    label: "Shake", icon: "📳",
    keyframes: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}`,
    usage: `.element { animation: shake 0.6s ease both; }`
  },
  glowPulse: {
    label: "Glow Pulse", icon: "✨",
    keyframes: `@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(34,211,238,0.3); }
  50% { box-shadow: 0 0 30px rgba(34,211,238,0.8), 0 0 60px rgba(34,211,238,0.4); }
}`,
    usage: `.element { animation: glowPulse 2s ease infinite; }`
  },
  neonFlicker: {
    label: "Neon Flicker", icon: "⚡",
    keyframes: `@keyframes neonFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
  20%, 24%, 55% { opacity: 0.3; }
}`,
    usage: `.element { animation: neonFlicker 3s linear infinite; color: #22d3ee; text-shadow: 0 0 10px currentColor; }`
  },
  aurora: {
    label: "Aurora", icon: "🌌",
    keyframes: `@keyframes aurora {
  0% { background-position: 0% 50%; filter: hue-rotate(0deg); }
  50% { background-position: 100% 50%; filter: hue-rotate(180deg); }
  100% { background-position: 0% 50%; filter: hue-rotate(360deg); }
}`,
    usage: `.element {
  background: linear-gradient(135deg, #22d3ee, #c084fc, #fbbf24, #22d3ee);
  background-size: 300% 300%;
  animation: aurora 4s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`
  },
  typewriter: {
    label: "Typewriter", icon: "⌨️",
    keyframes: `@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}
@keyframes blink {
  0%, 50% { border-color: transparent; }
  51%, 100% { border-color: #22d3ee; }
}`,
    usage: `.element {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid #22d3ee;
  animation: typewriter 2s steps(20) both, blink 0.7s step-end infinite;
}`
  },
  float: {
    label: "Float", icon: "🎈",
    keyframes: `@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}`,
    usage: `.element { animation: float 3s ease-in-out infinite; }`
  }
};

function buildTimelinePanel() {
  const container = document.getElementById("timeline-presets");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(ANIMATION_PRESETS).forEach(([key, preset]) => {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.title = preset.label;
    btn.innerHTML = `<span class="preset-icon">${preset.icon}</span><span class="preset-name">${preset.label}</span>`;
    btn.addEventListener("click", () => insertAnimation(key));
    container.appendChild(btn);
  });
}

function insertAnimation(key) {
  const preset = ANIMATION_PRESETS[key];
  if (!preset || !editors.css) return;

  const insert = `\n\n/* === ${preset.label} Animation === */\n${preset.keyframes}\n\n/* Usage: */\n${preset.usage}\n`;
  const doc = editors.css.state.doc;
  editors.css.dispatch({
    changes: { from: doc.length, insert }
  });

  switchTab("css");
  showToast(`✨ Анимация «${preset.label}» вставлена в CSS!`, "success");
}

function toggleTimeline() {
  appState.timelineOpen = !appState.timelineOpen;
  const panel = document.getElementById("timeline-panel");
  const btn = document.getElementById("btn-timeline");
  if (panel) panel.classList.toggle("is-open", appState.timelineOpen);
  if (btn) btn.classList.toggle("is-active", appState.timelineOpen);
}

// ─── 9. Templates Gallery ─────────────────────────────────────
const TEMPLATES = {
  blank: {
    label: "Пустой проект", icon: "📄", color: "#475569",
    html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Проект</title>
</head>
<body>
  <h1>Привет, мир!</h1>
</body>
</html>`,
    css: `body { margin: 0; font-family: sans-serif; }`,
    js: ``
  },
  landing: {
    label: "Landing Page", icon: "🚀", color: "#22d3ee",
    html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Landing Page</title>
</head>
<body>
<nav class="nav">
  <div class="logo">BRAND</div>
  <div class="nav-links">
    <a href="#">О нас</a><a href="#">Услуги</a><a href="#">Контакты</a>
  </div>
</nav>
<section class="hero">
  <div class="hero-content">
    <h1 class="hero-title">Будущее<br>начинается<br><span>сегодня</span></h1>
    <p class="hero-sub">Инновационное решение для вашего бизнеса</p>
    <button class="cta-btn">Начать бесплатно →</button>
  </div>
  <div class="hero-visual">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
</section>
<section class="features">
  <div class="feat"><div class="feat-icon">⚡</div><h3>Быстро</h3><p>Молниеносная скорость работы</p></div>
  <div class="feat"><div class="feat-icon">🔒</div><h3>Безопасно</h3><p>Защита данных — наш приоритет</p></div>
  <div class="feat"><div class="feat-icon">🎯</div><h3>Точно</h3><p>Результат без лишних усилий</p></div>
</section>
</body>
</html>`,
    css: `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#080c14;color:#f8fafc;overflow-x:hidden}
.nav{display:flex;justify-content:space-between;align-items:center;padding:20px 48px;position:fixed;width:100%;z-index:100;backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.05)}
.logo{font-size:1.4rem;font-weight:800;background:linear-gradient(135deg,#22d3ee,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.nav-links a{color:#94a3b8;text-decoration:none;margin-left:24px;transition:color 0.2s}
.nav-links a:hover{color:#22d3ee}
.hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:0 48px;padding-top:80px;gap:48px;position:relative;overflow:hidden}
.hero-title{font-size:clamp(2.5rem,5vw,4.5rem);font-weight:900;line-height:1.1;margin-bottom:20px}
.hero-title span{background:linear-gradient(135deg,#22d3ee,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{color:#94a3b8;font-size:1.1rem;margin-bottom:36px;max-width:440px}
.cta-btn{padding:16px 36px;background:linear-gradient(135deg,#22d3ee,#c084fc);border:none;border-radius:50px;color:#080c14;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.3s}
.cta-btn:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(34,211,238,0.4)}
.hero-visual{position:relative;height:500px}
.orb{position:absolute;border-radius:50%;filter:blur(60px);animation:float 6s ease-in-out infinite}
.orb-1{width:300px;height:300px;background:rgba(34,211,238,0.3);top:50px;left:50px;animation-delay:0s}
.orb-2{width:200px;height:200px;background:rgba(192,132,252,0.3);top:150px;left:200px;animation-delay:2s}
.orb-3{width:150px;height:150px;background:rgba(251,191,36,0.2);top:280px;left:80px;animation-delay:4s}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:80px 48px;border-top:1px solid rgba(255,255,255,0.05)}
.feat{padding:32px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;transition:all 0.3s}
.feat:hover{border-color:rgba(34,211,238,0.3);transform:translateY(-4px)}
.feat-icon{font-size:2rem;margin-bottom:16px}
.feat h3{font-size:1.2rem;font-weight:700;margin-bottom:8px}
.feat p{color:#64748b;font-size:0.9rem}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-30px)}}`,
    js: `document.querySelector('.cta-btn').addEventListener('click', () => {
  console.log('🚀 Кнопка нажата!');
  alert('Добро пожаловать!');
});`
  },
  auroraCard: {
    label: "Aurora Card", icon: "💎", color: "#c084fc",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Aurora Card</title></head>
<body>
<div class="scene">
  <div class="card" id="card">
    <div class="card-glow"></div>
    <div class="card-inner">
      <div class="card-avatar">🌌</div>
      <div class="card-badge">PRO</div>
      <h2 class="card-name">Aurora Studio</h2>
      <p class="card-desc">Дизайн будущего</p>
      <div class="card-stats">
        <div class="stat"><div class="stat-val">128</div><div class="stat-key">Проектов</div></div>
        <div class="stat"><div class="stat-val">4.9★</div><div class="stat-key">Рейтинг</div></div>
        <div class="stat"><div class="stat-val">3K</div><div class="stat-key">Клиентов</div></div>
      </div>
      <button class="card-btn">Подробнее →</button>
    </div>
  </div>
</div>
</body>
</html>`,
    css: `*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#111827 0%,#080c14 100%);font-family:'Segoe UI',sans-serif}
.scene{perspective:1000px}
.card{width:320px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;position:relative;transform-style:preserve-3d;transition:transform 0.1s;cursor:pointer;animation:cardIn 0.8s ease both}
.card-glow{position:absolute;inset:-2px;background:linear-gradient(135deg,#22d3ee,#c084fc,#fbbf24);border-radius:26px;opacity:0;filter:blur(20px);transition:opacity 0.3s;z-index:-1}
.card:hover .card-glow{opacity:0.5}
.card-inner{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.card-avatar{font-size:4rem;margin-bottom:4px}
.card-badge{position:absolute;top:20px;right:20px;background:linear-gradient(135deg,#22d3ee,#c084fc);padding:4px 12px;border-radius:20px;font-size:0.7rem;font-weight:800;color:#080c14}
.card-name{font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#f8fafc,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.card-desc{color:#64748b;font-size:0.9rem}
.card-stats{display:flex;gap:16px;margin:12px 0;padding:16px;background:rgba(0,0,0,0.3);border-radius:12px;width:100%}
.stat{flex:1;text-align:center}
.stat-val{font-size:1.2rem;font-weight:800;color:#22d3ee}
.stat-key{font-size:0.7rem;color:#475569;margin-top:2px}
.card-btn{padding:12px 28px;background:linear-gradient(135deg,#22d3ee,#c084fc);border:none;border-radius:50px;color:#080c14;font-weight:700;cursor:pointer;transition:all 0.3s;width:100%;margin-top:8px}
.card-btn:hover{transform:scale(1.03);box-shadow:0 8px 30px rgba(34,211,238,0.4)}
@keyframes cardIn{from{opacity:0;transform:translateY(40px) rotateX(10deg)}to{opacity:1;transform:none}}`,
    js: `const card = document.getElementById('card');
card.addEventListener('mousemove', (e) => {
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  card.style.transform = \`rotateY(\${x * 20}deg) rotateX(\${-y * 20}deg)\`;
});
card.addEventListener('mouseleave', () => { card.style.transform = ''; });`
  },
  particles: {
    label: "Частицы", icon: "✨", color: "#fbbf24",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Particles</title></head>
<body>
<canvas id="c"></canvas>
<div class="overlay">
  <h1>Particles</h1>
  <p>Интерактивный фон</p>
</div>
</body>
</html>`,
    css: `*{margin:0;padding:0}body,html{width:100%;height:100%;overflow:hidden;background:#080c14}canvas{position:fixed;inset:0}.overlay{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;pointer-events:none}h1{font-size:4rem;font-weight:900;background:linear-gradient(135deg,#22d3ee,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:pulse 3s ease infinite}p{color:#475569;margin-top:8px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`,
    js: `const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth, H = canvas.height = innerHeight;
const particles = Array.from({length: 120}, () => ({
  x: Math.random()*W, y: Math.random()*H,
  vx: (Math.random()-0.5)*0.8, vy: (Math.random()-0.5)*0.8,
  r: Math.random()*3+1,
  hue: Math.random()*60+180
}));
let mx = W/2, my = H/2;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
window.addEventListener('resize', () => { W=canvas.width=innerWidth; H=canvas.height=innerHeight; });
(function loop() {
  ctx.fillStyle='rgba(8,12,20,0.15)';
  ctx.fillRect(0,0,W,H);
  particles.forEach(p => {
    const dx=mx-p.x, dy=my-p.y, d=Math.sqrt(dx*dx+dy*dy);
    if(d<150){p.vx+=dx/d*0.05;p.vy+=dy/d*0.05;}
    p.x+=p.vx; p.y+=p.vy;
    p.vx*=0.97; p.vy*=0.97;
    if(p.x<0||p.x>W)p.vx*=-1;
    if(p.y<0||p.y>H)p.vy*=-1;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=\`hsla(\${p.hue},80%,70%,0.8)\`;
    ctx.fill();
    particles.forEach(q => {
      const dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
        ctx.strokeStyle=\`hsla(\${(p.hue+q.hue)/2},80%,70%,\${(1-d/100)*0.3})\`;
        ctx.lineWidth=0.5;ctx.stroke();
      }
    });
  });
  requestAnimationFrame(loop);
})();`
  },
  neonClock: {
    label: "Neon Clock", icon: "🕐", color: "#4ade80",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Neon Clock</title></head>
<body>
<div class="clock-wrap">
  <svg class="clock" viewBox="0 0 220 220" id="clock-svg">
    <circle class="face" cx="110" cy="110" r="100"/>
    <circle class="face-inner" cx="110" cy="110" r="96"/>
    <line class="hand hour" id="h" x1="110" y1="110" x2="110" y2="50"/>
    <line class="hand min" id="m" x1="110" y1="110" x2="110" y2="30"/>
    <line class="hand sec" id="s" x1="110" y1="110" x2="110" y2="22"/>
    <circle class="center" cx="110" cy="110" r="5"/>
  </svg>
  <div class="digital" id="dig"></div>
  <div class="date" id="date-str"></div>
</div>
</body>
</html>`,
    css: `*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#080c14;font-family:'Segoe UI',sans-serif}.clock-wrap{display:flex;flex-direction:column;align-items:center;gap:20px}.clock{width:260px;height:260px;filter:drop-shadow(0 0 20px rgba(34,211,238,0.4))}.face{fill:rgba(34,211,238,0.03);stroke:rgba(34,211,238,0.3);stroke-width:2}.face-inner{fill:none;stroke:rgba(34,211,238,0.1);stroke-width:1}.hand{stroke-linecap:round;transition:transform 0.5s cubic-bezier(0.4,2.08,0.55,0.44)}.hour{stroke:#c084fc;stroke-width:5}.min{stroke:#22d3ee;stroke-width:3}.sec{stroke:#fbbf24;stroke-width:2}.center{fill:#22d3ee}.digital{font-size:2.5rem;font-weight:700;color:#22d3ee;text-shadow:0 0 20px rgba(34,211,238,0.6);letter-spacing:4px;font-family:'Courier New',monospace}.date{color:#475569;font-size:0.9rem;letter-spacing:2px}`,
    js: `function tick(){
  const n=new Date();
  const s=n.getSeconds()+n.getMilliseconds()/1000;
  const m=n.getMinutes()+s/60;
  const h=n.getHours()%12+m/60;
  function rot(id,deg){const el=document.getElementById(id);if(el)el.style.transform=\`rotate(\${deg}deg)\`;el?.setAttribute('transform',\`rotate(\${deg} 110 110)\`)}
  rot('s',s*6); rot('m',m*6); rot('h',h*30);
  const pad=x=>String(x).padStart(2,'0');
  const dig=document.getElementById('dig');
  if(dig)dig.textContent=\`\${pad(n.getHours())}:\${pad(n.getMinutes())}:\${pad(n.getSeconds())}\`;
  const ds=document.getElementById('date-str');
  if(ds)ds.textContent=n.toLocaleDateString('ru',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}
tick();setInterval(tick,1000);`
  },
  glassmorphism: {
    label: "Glassmorphism", icon: "🔮", color: "#94a3b8",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Glass UI</title></head>
<body>
<div class="bg">
  <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
</div>
<div class="ui">
  <div class="glass-card">
    <h2>Glassmorphism UI</h2>
    <p>Стекломорфизм — современный тренд дизайна. Прозрачность, размытие и тонкая граница создают эффект стекла.</p>
    <div class="glass-pills">
      <span>✨ Blur</span><span>🔮 Glass</span><span>💜 Neon</span>
    </div>
    <div class="glass-input-wrap">
      <input class="glass-input" placeholder="Введите текст..."/>
      <button class="glass-btn">→</button>
    </div>
  </div>
</div>
</body>
</html>`,
    css: `*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;font-family:'Segoe UI',sans-serif;overflow:hidden}.bg{position:fixed;inset:0;background:#0d1117}.blob{position:absolute;border-radius:50%;filter:blur(80px)}.b1{width:500px;height:500px;background:rgba(34,211,238,0.2);top:-100px;left:-100px;animation:move1 8s ease-in-out infinite}.b2{width:400px;height:400px;background:rgba(192,132,252,0.2);bottom:-50px;right:-50px;animation:move2 10s ease-in-out infinite}.b3{width:300px;height:300px;background:rgba(251,191,36,0.1);top:50%;left:50%;transform:translate(-50%,-50%);animation:move3 7s ease-in-out infinite}.ui{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center}.glass-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:400px;width:90%;color:#f8fafc;box-shadow:0 8px 32px rgba(0,0,0,0.4)}.glass-card h2{font-size:1.8rem;font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,#22d3ee,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.glass-card p{color:#94a3b8;line-height:1.7;margin-bottom:24px}.glass-pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}.glass-pills span{padding:6px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;font-size:0.85rem;cursor:pointer;transition:all 0.2s}.glass-pills span:hover{background:rgba(34,211,238,0.15);border-color:rgba(34,211,238,0.4)}.glass-input-wrap{display:flex;gap:8px}.glass-input{flex:1;padding:12px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#f8fafc;outline:none;font-size:0.95rem;transition:border-color 0.2s}.glass-input:focus{border-color:rgba(34,211,238,0.5)}.glass-btn{padding:12px 20px;background:linear-gradient(135deg,#22d3ee,#c084fc);border:none;border-radius:12px;color:#080c14;font-size:1.1rem;cursor:pointer;transition:all 0.3s}.glass-btn:hover{transform:scale(1.05);box-shadow:0 4px 20px rgba(34,211,238,0.4)}@keyframes move1{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,30px)}}@keyframes move2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,-20px)}}@keyframes move3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.3)}}`,
    js: `document.querySelector('.glass-btn').addEventListener('click',()=>{
  const v=document.querySelector('.glass-input').value.trim();
  if(v) {console.log('Введено:',v);document.querySelector('.glass-input').value='';}
});`
  },
  animDemo: {
    label: "Анимации Demo", icon: "🎬", color: "#f87171",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Animation Demo</title></head>
<body>
<h1 class="main-title">CSS Анимации</h1>
<div class="grid">
  <div class="box b-fade"><span>Fade In</span></div>
  <div class="box b-slide"><span>Slide Up</span></div>
  <div class="box b-bounce"><span>Bounce</span></div>
  <div class="box b-rotate"><span>Rotate</span></div>
  <div class="box b-pulse"><span>Pulse</span></div>
  <div class="box b-glow"><span>Glow</span></div>
  <div class="box b-shake" id="shaker"><span>Click me!</span></div>
  <div class="box b-aurora"><span>Aurora</span></div>
</div>
</body>
</html>`,
    css: `*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#080c14;font-family:'Segoe UI',sans-serif;padding:24px}.main-title{text-align:center;margin-bottom:32px;font-size:2.5rem;font-weight:900;background:linear-gradient(135deg,#22d3ee,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;max-width:900px;margin:0 auto}.box{height:120px;display:flex;align-items:center;justify-content:center;border-radius:16px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-size:0.9rem;font-weight:600;color:#f8fafc;transition:transform 0.2s}
.b-fade{background:rgba(34,211,238,0.1);animation:fadeIn 1s ease both}
.b-slide{background:rgba(192,132,252,0.1);animation:slideInUp 0.8s ease both 0.1s}
.b-bounce{background:rgba(251,191,36,0.1);animation:bounceIn 1s both 0.2s}
.b-rotate{background:rgba(74,222,128,0.1);animation:rotateIn 0.8s both 0.3s}
.b-pulse{background:rgba(248,113,113,0.1);animation:pulse 2s ease infinite}
.b-glow{background:rgba(34,211,238,0.05);animation:glowPulse 2s ease infinite;border-color:rgba(34,211,238,0.3)}
.b-shake{background:rgba(248,113,113,0.1)}
.b-aurora span{background:linear-gradient(135deg,#22d3ee,#c084fc,#fbbf24,#22d3ee);background-size:300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:aurora 3s linear infinite}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideInUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1);opacity:1}}
@keyframes rotateIn{from{transform:rotate(-180deg) scale(0.5);opacity:0}to{transform:none;opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 10px rgba(34,211,238,0.3)}50%{box-shadow:0 0 30px rgba(34,211,238,0.8),0 0 60px rgba(34,211,238,0.3)}}
@keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-8px)}20%,40%,60%,80%{transform:translateX(8px)}}
@keyframes aurora{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`,
    js: `document.getElementById('shaker').addEventListener('click',function(){
  this.style.animation='none';
  this.offsetHeight;
  this.style.animation='shake 0.6s ease both';
  console.log('🎸 Shake!');
});`
  }
};

function buildTemplatesModal() {
  const grid = document.getElementById("templates-grid");
  if (!grid) return;
  grid.innerHTML = "";
  Object.entries(TEMPLATES).forEach(([key, tpl]) => {
    const card = document.createElement("button");
    card.className = "template-card";
    card.innerHTML = `
      <div class="tpl-icon" style="color:${tpl.color}">${tpl.icon}</div>
      <div class="tpl-label">${tpl.label}</div>
    `;
    card.addEventListener("click", () => {
      loadTemplate(key);
      closeModal("templates-modal");
    });
    grid.appendChild(card);
  });
}

function loadTemplate(key) {
  const tpl = TEMPLATES[key];
  if (!tpl) return;
  setEditorContent("html", tpl.html);
  setEditorContent("css", tpl.css);
  setEditorContent("js", tpl.js);
  appState.projectName = tpl.label;
  updateProjectNameDisplay();
  runPreview();
  showToast(`📄 Шаблон «${tpl.label}» загружен`, "success");
}

// ─── 10. Project Manager ──────────────────────────────────────
function saveCurrentProject(silent = false) {
  const project = {
    name: appState.projectName,
    html: appState.html,
    css: appState.css,
    js: appState.js,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  if (!silent) showToast("💾 Проект сохранён", "success");
}

function loadLastProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    setEditorContent("html", data.html || "");
    setEditorContent("css", data.css || "");
    setEditorContent("js", data.js || "");
    appState.projectName = data.name || "Проект";
    updateProjectNameDisplay();
    return true;
  } catch { return false; }
}

function saveNamedProject() {
  const name = appState.projectName;
  const projects = getProjects();
  const project = {
    id: Date.now(),
    name,
    html: appState.html,
    css: appState.css,
    js: appState.js,
    savedAt: new Date().toISOString()
  };
  // Remove duplicate by name
  const filtered = projects.filter(p => p.name !== name);
  filtered.unshift(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered.slice(0, CONFIG.maxProjects)));
  showToast(`📁 «${name}» сохранён`, "success");
}

function getProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]"); } catch { return []; }
}

function buildProjectsModal() {
  const list = document.getElementById("projects-list");
  if (!list) return;
  const projects = getProjects();
  list.innerHTML = projects.length ? "" : `<div class="projects-empty">Нет сохранённых проектов</div>`;
  projects.forEach(p => {
    const row = document.createElement("div");
    row.className = "project-row";
    const d = new Date(p.savedAt);
    row.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escHtml(p.name)}</div>
        <div class="project-date">${d.toLocaleString("ru")}</div>
      </div>
      <div class="project-actions">
        <button class="proj-btn proj-open" data-id="${p.id}">Открыть</button>
        <button class="proj-btn proj-del" data-id="${p.id}">✕</button>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll(".proj-open").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = projects.find(x => x.id === Number(btn.dataset.id));
      if (p) {
        setEditorContent("html", p.html);
        setEditorContent("css", p.css);
        setEditorContent("js", p.js);
        appState.projectName = p.name;
        updateProjectNameDisplay();
        runPreview();
        closeModal("projects-modal");
        showToast(`📂 Открыт: ${p.name}`, "success");
      }
    });
  });
  list.querySelectorAll(".proj-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const ps = getProjects().filter(x => x.id !== Number(btn.dataset.id));
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(ps));
      buildProjectsModal();
    });
  });
}

function exportHTML() {
  const code = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(appState.projectName)}</title>
<style>
${appState.css}
</style>
</head>
<body>
${appState.html.includes("<body") ? appState.html.replace(/[\s\S]*?<body[^>]*>/i,"").replace(/<\/body>[\s\S]*/i,"").trim() : appState.html}
<script>
${appState.js}
<\/script>
</body>
</html>`;
  const blob = new Blob([code], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (appState.projectName || "project").replace(/\s+/g, "_") + ".html";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("📥 HTML-файл скачан!", "success");
}

function importHTML(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const src = e.target.result;
    if (typeof src !== "string") return;

    // 1. Title -> projectName
    const titleMatch = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1].trim()) {
      appState.projectName = titleMatch[1].trim();
      updateProjectNameDisplay();
    } else if (file.name) {
      appState.projectName = file.name.replace(/\.[^/.]+$/, "");
      updateProjectNameDisplay();
    }

    // 2. All <style> blocks
    const styles = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let sMatch;
    while ((sMatch = styleRegex.exec(src)) !== null) {
      if (sMatch[1].trim()) styles.push(sMatch[1].trim());
    }

    // 3. All <script> blocks (excluding external src scripts)
    const scripts = [];
    const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    let scMatch;
    while ((scMatch = scriptRegex.exec(src)) !== null) {
      if (scMatch[1].trim()) scripts.push(scMatch[1].trim());
    }

    // 4. Extract body content
    let bodyContent = "";
    const bodyMatch = src.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1]
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/gi, "")
        .trim();
    } else {
      bodyContent = src
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/gi, "")
        .trim();
    }

    setEditorContent("css", styles.join("\n\n"));
    setEditorContent("js", scripts.join("\n\n"));
    setEditorContent("html", bodyContent || src);

    // If visual editor is active or initialized, import into visual canvas as well
    if (visualEditor) {
      visualEditor.importFromHTML(bodyContent || src);
    }

    runPreview();
    showToast(`📤 Файл "${file.name}" загружен с диска!`, "success");
  };
  reader.readAsText(file);
}

// ─── 11. Toolbar & UI Actions ────────────────────────────────
function setEditorContent(lang, content) {
  const ed = editors[lang];
  if (!ed) return;
  ed.dispatch({ changes: { from: 0, to: ed.state.doc.length, insert: content || "" } });
  appState[lang] = content || "";
}

// Undo / Redo — делегируем в активный режим
function doUndo() {
  if (appState.editorMode === "visual" && visualEditor) {
    visualEditor.undo();
    return;
  }
  const ed = editors[appState.activeTab];
  if (ed) { undo(ed); ed.focus(); }
}
function doRedo() {
  if (appState.editorMode === "visual" && visualEditor) {
    visualEditor.redo();
    return;
  }
  const ed = editors[appState.activeTab];
  if (ed) { redo(ed); ed.focus(); }
}

// ─── Mode Switching (Code ↔ Visual) ──────────────────────────
function switchEditorMode(mode) {
  if (appState.editorMode === mode) return;
  appState.editorMode = mode;

  const mainPane = document.querySelector(".editor-main");
  const wysiwygPane = document.getElementById("wysiwyg-pane");
  const btnCode = document.getElementById("btn-mode-code");
  const btnVisual = document.getElementById("btn-mode-visual");

  if (mode === "visual") {
    if (mainPane) mainPane.style.display = "none";
    if (wysiwygPane) wysiwygPane.classList.remove("is-hidden");
    btnCode?.classList.remove("is-active");
    btnVisual?.classList.add("is-active");

    if (visualEditor) {
      visualEditor.importFromHTML(appState.html);
    }
    showToast("🎨 Визуальный редактор (WYSIWYG)", "info");
  } else {
    if (visualEditor) {
      const generatedHtml = visualEditor.exportToHTML();
      if (generatedHtml) {
        setEditorContent("html", generatedHtml);
        runPreview();
      }
    }
    if (wysiwygPane) wysiwygPane.classList.add("is-hidden");
    if (mainPane) mainPane.style.display = "";
    btnVisual?.classList.remove("is-active");
    btnCode?.classList.add("is-active");
    showToast("💻 Редактор кода", "info");
  }
}

function initVisualEditor() {
  const paletteEl = document.getElementById("ve-palette-list");
  const canvasEl  = document.getElementById("wysiwyg-canvas");
  const propsEl   = document.getElementById("wysiwyg-props");

  if (!paletteEl || !canvasEl || !propsEl) return;

  visualEditor = new VisualEditor({
    paletteEl,
    canvasEl,
    propsEl,
    onExport: (html) => {
      setEditorContent("html", html);
      runPreview();
      showToast("✅ Изменения применены в код!", "success");
      switchEditorMode("code");
    }
  });

  visualEditor.init();

  // Mode buttons
  document.getElementById("btn-mode-code")?.addEventListener("click", () => switchEditorMode("code"));
  document.getElementById("btn-mode-visual")?.addEventListener("click", () => switchEditorMode("visual"));

  // Canvas toolbar
  document.getElementById("ve-btn-undo")?.addEventListener("click", () => visualEditor.undo());
  document.getElementById("ve-btn-redo")?.addEventListener("click", () => visualEditor.redo());
  document.getElementById("ve-btn-clear")?.addEventListener("click", () => {
    if (confirm("Очистить все блоки с холста?")) {
      visualEditor.clearCanvas();
      showToast("Холст очищен", "info");
    }
  });
  document.getElementById("ve-btn-apply-code")?.addEventListener("click", () => {
    const html = visualEditor.exportToHTML();
    setEditorContent("html", html);
    runPreview();
    showToast("✅ Применено в HTML код!", "success");
  });

  // Responsive sizes on canvas
  ["desktop", "tablet", "mobile"].forEach(size => {
    document.getElementById(`ve-size-${size}`)?.addEventListener("click", e => {
      document.querySelectorAll("[data-vesize]").forEach(b => b.classList.remove("is-active"));
      e.currentTarget.classList.add("is-active");
      canvasEl.classList.remove("is-desktop", "is-tablet", "is-mobile");
      canvasEl.classList.add(`is-${size}`);
    });
  });
}

function setFontSize(size) {
  appState.fontSize = Math.max(CONFIG.minFontSize, Math.min(CONFIG.maxFontSize, size));
  const ext = fontSizeComp.reconfigure(
    EditorView.theme({ ".cm-content": { fontSize: appState.fontSize + "px" } })
  );
  Object.values(editors).forEach(ed => ed?.dispatch({ effects: [ext] }));
  const el = document.getElementById("sb-font");
  if (el) el.textContent = appState.fontSize + "px";
}

function toggleWordWrap() {
  appState.wordWrap = !appState.wordWrap;
  const ext = wordWrapComp.reconfigure(appState.wordWrap ? EditorView.lineWrapping : []);
  Object.values(editors).forEach(ed => ed?.dispatch({ effects: [ext] }));
  const btn = document.getElementById("btn-wrap");
  if (btn) btn.classList.toggle("is-active", appState.wordWrap);
  showToast(appState.wordWrap ? "Перенос строк включён" : "Перенос строк отключён");
}

function setLayout(mode) {
  appState.layout = mode;
  const main = document.querySelector(".editor-main");
  if (!main) return;
  main.dataset.layout = mode;
  document.querySelectorAll(".layout-btn").forEach(b => b.classList.toggle("is-active", b.dataset.layout === mode));
}

function toggleZen() {
  appState.zenMode = !appState.zenMode;
  document.body.classList.toggle("zen-mode", appState.zenMode);
  const btn = document.getElementById("btn-zen");
  if (btn) btn.classList.toggle("is-active", appState.zenMode);
}

function formatCode() {
  const tab = appState.activeTab;
  const ed = editors[tab];
  if (!ed) return;
  let code = ed.state.doc.toString();

  // Basic formatter (indent + newlines)
  try {
    if (tab === "css") {
      code = formatCSS(code);
    } else if (tab === "js") {
      code = formatJS(code);
    } else {
      code = formatHTMLCode(code);
    }
    setEditorContent(tab, code);
    showToast("✨ Код отформатирован", "success");
  } catch {
    showToast("Не удалось форматировать", "error");
  }
}

function formatCSS(css) {
  return css.replace(/\s*\{\s*/g," {\n  ").replace(/;\s*/g,";\n  ").replace(/\s*\}\s*/g,"\n}\n").replace(/\n\s*\n/g,"\n").trim();
}

function formatJS(js) {
  // Very basic: normalize spacing
  return js.replace(/\r\n/g,"\n").replace(/[\t ]+$/mg,"").trim();
}

function formatHTMLCode(html) {
  return html.replace(/\r\n/g,"\n").replace(/>\s*</g,">\n<").replace(/\n{3,}/g,"\n\n").trim();
}

function openSearch() {
  const ed = editors[appState.activeTab];
  if (ed) openSearchPanel(ed);
}

function updateProjectNameDisplay() {
  const el = document.getElementById("project-name");
  if (el) el.textContent = appState.projectName;
}

// ─── 12. Splitter ────────────────────────────────────────────
function initSplitter() {
  const handle = document.getElementById("split-handle");
  const main = document.querySelector(".editor-main");
  if (!handle || !main) return;

  let dragging = false, startX = 0, startY = 0, startLeft = 0;

  handle.addEventListener("mousedown", e => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const editorPane = document.getElementById("editor-pane");
    startLeft = editorPane ? editorPane.offsetWidth : main.offsetWidth * 0.5;
    document.body.style.cursor = appState.layout === "vertical" ? "ns-resize" : "ew-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    const editorPane = document.getElementById("editor-pane");
    if (!editorPane) return;
    if (appState.layout === "vertical") {
      const dy = e.clientY - startY;
      const newH = Math.max(150, Math.min(main.offsetHeight - 150, startLeft + dy));
      editorPane.style.height = newH + "px";
    } else {
      const dx = e.clientX - startX;
      const newW = Math.max(200, Math.min(main.offsetWidth - 200, startLeft + dx));
      editorPane.style.width = newW + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}

// ─── 13. Keyboard Shortcuts ───────────────────────────────────
const SHORTCUTS = [
  { key: "Ctrl+S", desc: "Сохранить проект" },
  { key: "Ctrl+Enter", desc: "Запустить preview" },
  { key: "Ctrl+Shift+F", desc: "Форматировать код" },
  { key: "Ctrl+F", desc: "Поиск в редакторе" },
  { key: "Ctrl+Z", desc: "Отменить" },
  { key: "Ctrl+Y", desc: "Повторить" },
  { key: "Ctrl++", desc: "Увеличить шрифт" },
  { key: "Ctrl+-", desc: "Уменьшить шрифт" },
  { key: "Tab", desc: "Отступ" },
  { key: "F11", desc: "Zen-режим" },
  { key: "Escape", desc: "Закрыть панель" }
];

function initKeyboard() {
  document.addEventListener("keydown", e => {
    const ctrl = e.ctrlKey || e.metaKey;
    // Undo / Redo
    if (ctrl && !e.shiftKey && (e.key === "z" || e.key === "я")) {
      if (appState.editorMode === "visual") {
        e.preventDefault();
        doUndo();
        return;
      }
      const ae = document.activeElement;
      const inCM = ae?.closest?.(".cm-editor");
      if (!inCM) { e.preventDefault(); doUndo(); }
      return;
    }
    if (ctrl && (e.key === "y" || e.key === "н" || (e.shiftKey && (e.key === "z" || e.key === "я")))) {
      if (appState.editorMode === "visual") {
        e.preventDefault();
        doRedo();
        return;
      }
      e.preventDefault(); doRedo(); return;
    }
    if (ctrl && e.key === "s") { e.preventDefault(); saveCurrentProject(); }
    if (ctrl && e.key === "Enter") { e.preventDefault(); runPreview(); showToast("▶ Обновлено", "success"); }
    if (ctrl && e.shiftKey && e.key === "F") { e.preventDefault(); formatCode(); }
    if (ctrl && e.key === "=") { e.preventDefault(); setFontSize(appState.fontSize + 1); }
    if (ctrl && e.key === "-") { e.preventDefault(); setFontSize(appState.fontSize - 1); }
    if (e.key === "F11") { e.preventDefault(); toggleZen(); }
    if (e.key === "Escape") {
      if (appState.zenMode) { toggleZen(); return; }
      if (appState.timelineOpen) { toggleTimeline(); return; }
      const openModal = document.querySelector(".modal-overlay.is-open");
      if (openModal) openModal.classList.remove("is-open");
    }
    if (e.altKey && e.key === "1") { e.preventDefault(); switchTab("html"); }
    if (e.altKey && e.key === "2") { e.preventDefault(); switchTab("css"); }
    if (e.altKey && e.key === "3") { e.preventDefault(); switchTab("js"); }
    if (e.altKey && (e.key === "v" || e.key === "м")) { e.preventDefault(); switchEditorMode("visual"); }
    if (e.altKey && (e.key === "c" || e.key === "с")) { e.preventDefault(); switchEditorMode("code"); }
  });
}

function buildShortcutsModal() {
  const list = document.getElementById("shortcuts-list");
  if (!list) return;
  list.innerHTML = SHORTCUTS.map(s =>
    `<div class="shortcut-row"><kbd>${s.key}</kbd><span>${s.desc}</span></div>`
  ).join("");
}

// ─── 14. Toast Notifications ──────────────────────────────────
const toastQueue = [];
let toastBusy = false;

function showToast(msg, type = "info", duration = 2500) {
  toastQueue.push({ msg, type, duration });
  if (!toastBusy) nextToast();
}

function nextToast() {
  if (!toastQueue.length) { toastBusy = false; return; }
  toastBusy = true;
  const { msg, type, duration } = toastQueue.shift();
  const container = document.getElementById("toast-container");
  if (!container) { toastBusy = false; return; }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      toast.remove();
      nextToast();
    }, 350);
  }, duration);
}

// ─── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("is-open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("is-open");
}

// ─── 15. Init & Bootstrap ────────────────────────────────────
function bindUI() {
  // Tab switching
  document.querySelectorAll(".editor-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Run button
  document.getElementById("btn-run")?.addEventListener("click", () => {
    runPreview();
    showToast("▶ Запущено", "success");
  });

  // Format
  document.getElementById("btn-format")?.addEventListener("click", formatCode);

  // Save
  document.getElementById("btn-save")?.addEventListener("click", () => saveCurrentProject());

  // Save named
  document.getElementById("btn-save-named")?.addEventListener("click", saveNamedProject);

  // Export
  document.getElementById("btn-export")?.addEventListener("click", exportHTML);

  // Import
  const importInput = document.getElementById("import-file");
  document.getElementById("btn-import")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (file) importHTML(file);
    e.target.value = "";
  });

  // Timeline toggle
  document.getElementById("btn-timeline")?.addEventListener("click", toggleTimeline);

  // Templates modal
  document.getElementById("btn-templates")?.addEventListener("click", () => {
    buildTemplatesModal();
    openModal("templates-modal");
  });
  document.getElementById("btn-close-templates")?.addEventListener("click", () => closeModal("templates-modal"));

  // Projects modal
  document.getElementById("btn-projects")?.addEventListener("click", () => {
    buildProjectsModal();
    openModal("projects-modal");
  });
  document.getElementById("btn-close-projects")?.addEventListener("click", () => closeModal("projects-modal"));

  // Shortcuts modal
  document.getElementById("btn-shortcuts")?.addEventListener("click", () => {
    buildShortcutsModal();
    openModal("shortcuts-modal");
  });
  document.getElementById("btn-close-shortcuts")?.addEventListener("click", () => closeModal("shortcuts-modal"));

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.classList.remove("is-open");
    });
  });

  // Word wrap
  document.getElementById("btn-wrap")?.addEventListener("click", toggleWordWrap);

  // Undo / Redo кнопки тулбара
  document.getElementById("btn-undo")?.addEventListener("click", doUndo);
  document.getElementById("btn-redo")?.addEventListener("click", doRedo);

  // Font size
  document.getElementById("btn-font-dec")?.addEventListener("click", () => setFontSize(appState.fontSize - 1));
  document.getElementById("btn-font-inc")?.addEventListener("click", () => setFontSize(appState.fontSize + 1));

  // Layout buttons
  document.querySelectorAll(".layout-btn").forEach(btn => {
    btn.addEventListener("click", () => setLayout(btn.dataset.layout));
  });

  // Zen mode
  document.getElementById("btn-zen")?.addEventListener("click", toggleZen);

  // Console toggle
  document.getElementById("btn-toggle-console")?.addEventListener("click", toggleConsole);
  document.getElementById("btn-clear-console")?.addEventListener("click", clearConsole);

  // Responsive preview
  document.querySelectorAll(".resp-btn").forEach(btn => {
    btn.addEventListener("click", () => setPreviewWidth(btn.dataset.size));
  });

  // Open in new tab
  document.getElementById("btn-open-tab")?.addEventListener("click", () => {
    const blob = new Blob([document.getElementById("preview-frame").srcdoc], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  });

  // Project name edit
  const nameEl = document.getElementById("project-name");
  nameEl?.addEventListener("click", () => {
    const n = prompt("Имя проекта:", appState.projectName);
    if (n?.trim()) { appState.projectName = n.trim(); updateProjectNameDisplay(); }
  });

  // Search
  document.getElementById("btn-search")?.addEventListener("click", openSearch);

  // Drag-and-drop HTML files from disk
  document.addEventListener("dragover", e => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
    }
  });
  document.addEventListener("drop", e => {
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.match(/\.(html|htm)$/i)) importHTML(file);
    }
  });
}

function setupAutoSave() {
  setInterval(() => saveCurrentProject(true), CONFIG.autoSaveMs);
}

export function init() {
  initEditors();
  initConsole();
  initSplitter();
  initKeyboard();
  bindUI();
  initVisualEditor();
  buildTimelinePanel();
  buildTemplatesModal();

  // Restore last session
  const restored = loadLastProject();

  // Initial preview
  runPreview();

  // Switch to HTML tab by default
  switchTab("html");

  // Set default font size display
  const el = document.getElementById("sb-font");
  if (el) el.textContent = CONFIG.defaultFontSize + "px";

  // Auto-save loop
  setupAutoSave();

  // Welcome message
  if (!restored) {
    showToast("🌌 Aurora HTML Editor v" + VERSION + " запущен!", "success", 3000);
  } else {
    showToast("📂 Последний проект восстановлен", "info");
  }

  console.log(`%c✨ Aurora HTML Editor v${VERSION}`, "color:#22d3ee;font-size:14px;font-weight:bold;");
}
