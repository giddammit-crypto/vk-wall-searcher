/**
 * ESLint-конфиг AURORA DESIGN (п. 4.1 плана аудита от 2026-10-02).
 *
 * Главная цель — правило no-undef: именно оно ловит класс дефектов P0-2
 * (`getActiveBrushKind is not defined`) и P0-3 (`currentExportFormat is not defined`),
 * из-за которых первое открытие шаблона давало пустой холст. Конфиг уже нашёл
 * два живых дефекта такого класса: вызовы несуществующей `syncUI()` в editor.js
 * и дубли ключа `getActiveBrushKind` в API-объектах figma_pro_tools.js.
 *
 * Скрипты редактора — классические браузерные скрипты, которые делят глобалы
 * между файлами (editor.js ↔ enhancer.js ↔ figma_pro_tools.js ↔ inline-скрипты
 * index.html). Кросс-файловые символы берутся из автосгенерированного
 * eslint.globals.mjs (node tools/gen-eslint-globals.mjs), поэтому no-undef
 * срабатывает только на именах, которых нет ни в одном файле проекта.
 */
import js from '@eslint/js';
import globals from 'globals';
import { PROJECT_GLOBALS } from './eslint.globals.mjs';

export default [
  {
    ignores: ['vendor/**', 'node_modules/**', 'qrcode.min.js', 'server/**', 'test-bg-removal.js'],
  },
  js.configs.recommended,
  // ── Браузерные скрипты редактора (классические, не модули) ──────────────
  {
    files: ['*.js', 'workers/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Web Worker (workers/bg-removal-worker.js) и воркеры трансформеров
        ...globals.worker,
        // Библиотеки из vendor/ и их CDN-фолбэки
        fabric: 'readonly',
        jspdf: 'readonly',
        JSZip: 'readonly',
        paper: 'readonly',
        QRCode: 'readonly',
        vkBridge: 'readonly',
        // UMD-обёртки в ai_elements.js / retouch_engine.js / mask-painter.js /
        // enhancer.js: `typeof define === 'function' && define.amd` — обращение
        // защищено коротким замыканием, но ESLint требует объявления.
        define: 'readonly',
        module: 'writable',
        // Кросс-файловые глобалы проекта
        ...PROJECT_GLOBALS,
      },
    },
    rules: {
      // ── Класс дефектов P0-2/P0-3: держим как ошибку ──
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-unreachable': 'error',
      // Повторное объявление в одной области видимости. builtinGlobals: false —
      // иначе легаси-объявления верхнего уровня (let canvas, let history) дают
      // сотни срабатываний на пересечении с браузерными глобалами.
      'no-redeclare': ['error', { builtinGlobals: false }],
      // Присваивание браузерным глобалам отключено осознанно: редактор объявляет
      // собственные let canvas / history / model верхнего уровня и пишет в них.
      'no-global-assign': 'off',
      // ── Косметика: предупреждения, не блокируют сборку ──
      'no-useless-escape': 'warn',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'warn',
      'no-fallthrough': 'warn',
      // В легаси на 12k строк эти правила дают тысячи срабатываний без пользы
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  // ── Сервисные ESM-файлы (конфиг, генератор, тесты) ─────────────────────
  // Блок объявлен ПОСЛЕ браузерного, чтобы sourceType: module перекрыл script.
  {
    files: ['eslint.config.js', 'tools/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unused-vars': 'off',
    },
  },
];
