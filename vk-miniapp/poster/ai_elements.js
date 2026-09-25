/**
 * ===================================================================
 * AURORA DESIGN — AI ELEMENT & STICKER GENERATOR CORE
 * Файл: vk-miniapp/poster/ai_elements.js
 * 
 * Архитектура модуля:
 * 1. AI API Клиент с каскадным Fallback:
 *    - Эндпоинт: https://api.xkiro.com/v1/chat/completions
 *    - Основная модель: minimax/minimax-m3:free
 *    - Резервная модель 1: qwen/qwen3.6-35b-a3b:free
 *    - Резервная модель 2: qwen/qwen3.5-397b-a17b:free
 * 2. Учет токенов (Token Quota Tracker):
 *    - Лимит: 1 000 000 токенов в сутки
 *    - Персистентность в localStorage ('aurora_ai_token_tracker_v1')
 *    - Таймер обратного отсчета до сброса (24-часовой скользящий интервал)
 * 3. Token-Economy Prompt Engine:
 *    - Компактный системный промпт, max_tokens: 1200
 *    - Strict SVG Output без лишних оберток и пояснений
 *    - 100% прозрачный фон (гарантированное удаление подложек)
 * 4. Fabric.js Интеграция:
 *    - Добавление векторного элемента (fabric.Group / fabric.Path)
 *    - Автоматическое центрирование в видимой области viewport
 *    - Регистрация в истории отмены (undo/redo) и списке слоев
 * ===================================================================
 */

(function (root, factory) {
  const exportsObj = factory();
  if (typeof define === 'function' && define.amd) {
    define([], () => exportsObj);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = exportsObj;
  }
  if (root) {
    root.AuroraAiElements = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.AuroraAiElements = exportsObj;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     КОНФИГУРАЦИЯ И КОНСТАНТЫ
     ══════════════════════════════════════════════════════════════ */
  const CONFIG = {
    API_PROXY_URL: 'ai_proxy.php',
    API_DIRECT_URL: 'https://api.xkiro.com/v1/chat/completions',
    API_KEYS: [
      'sk-xt-17b6c5800266d39cf7a21e9371895f5dafd3dc75db4fa502', // Основной ключ
      'sk-xt-5ab3a53f5cc033e073a36cbcf5ecc5c43130ea1dfce7ddbf', // Резервный ключ 1
      'sk-xt-aac34b4f7773baf2d8fee9d07f8d6050a17c404cda157a89'  // Резервный ключ 2
    ],
    MODELS: [
      { id: 'minimax/minimax-m3:free', name: 'Minimax M3 (Основная)' },
      { id: 'qwen/qwen3.6-35b-a3b:free', name: 'Qwen 3.6 35B (Fallback 1)' },
      { id: 'qwen/qwen3.5-397b-a17b:free', name: 'Qwen 3.5 397B (Fallback 2)' }
    ],
    MAX_TOKENS: 1200,
    REQUEST_TIMEOUT_MS: 35000,
    STORAGE_KEY: 'aurora_ai_token_tracker_v1',
    HISTORY_KEY: 'aurora_ai_recent_stickers_v1',
    DAILY_TOKEN_LIMIT: 1000000,
    DEFAULT_SIZE: 220
  };

  /* ══════════════════════════════════════════════════════════════
     АНИМАЦИЯ АВРОРА: ВРАЩАЮЩИЙСЯ КРУЖОК ГЕНЕРАЦИИ (AURORA LOADER)
     ══════════════════════════════════════════════════════════════ */
  let activeAuroraLoaderEl = null;

  function showAuroraLoader(title = 'Генерация AI-элемента...', sub = 'Создание векторных слоёв на прозрачном фоне') {
    hideAuroraLoader();

    // 1. Отображение поверх холста в рабочей зоне
    const viewport = document.getElementById('canvas-viewport') || document.getElementById('canvas-stage') || document.body;
    if (viewport) {
      const loader = document.createElement('div');
      loader.className = 'aurora-canvas-loader';
      loader.id = 'aurora-canvas-loader';
      loader.innerHTML = `
        <div class="aurora-spinner-orbit">
          <div class="aurora-spinner-ring"></div>
          <div class="aurora-spinner-core"></div>
        </div>
        <div class="aurora-loader-text-wrap">
          <div class="aurora-loader-title">${title}</div>
          <div class="aurora-loader-sub">${sub}</div>
        </div>
      `;
      viewport.appendChild(loader);
      activeAuroraLoaderEl = loader;
    }

    // 2. Отображение внутри превью модального окна
    const previewBox = document.getElementById('ai-svg-preview-box');
    if (previewBox) {
      previewBox.innerHTML = `
        <div class="aurora-spinner-orbit" style="transform: scale(1.15);">
          <div class="aurora-spinner-ring"></div>
          <div class="aurora-spinner-core"></div>
        </div>
      `;
    }
  }

  function hideAuroraLoader() {
    if (activeAuroraLoaderEl) {
      const el = activeAuroraLoaderEl;
      activeAuroraLoaderEl = null;
      el.classList.add('is-hiding');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }
    const existing = document.getElementById('aurora-canvas-loader');
    if (existing && existing !== activeAuroraLoaderEl) {
      existing.classList.add('is-hiding');
      setTimeout(() => {
        if (existing.parentNode) existing.parentNode.removeChild(existing);
      }, 350);
    }
  }

  function safeGetItem(key) {
    try {
      return (typeof localStorage !== 'undefined' && localStorage) ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeSetItem(key, val) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) localStorage.setItem(key, val);
    } catch (e) {
      // ignore
    }
  }

  /* ══════════════════════════════════════════════════════════════
     КЛАСС УЧЕТА ТОКЕНОВ (TOKEN QUOTA TRACKER)
     ══════════════════════════════════════════════════════════════ */
  class TokenTracker {
    constructor() {
      this.limit = CONFIG.DAILY_TOKEN_LIMIT;
      this.used = 0;
      this.resetAt = Date.now() + 24 * 60 * 60 * 1000;
      this.listeners = new Set();
      this.timerId = null;
      this._load();
      this._startTicker();
    }

    _load() {
      try {
        const raw = safeGetItem(CONFIG.STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && typeof data.resetAt === 'number') {
            if (Date.now() >= data.resetAt) {
              // Истек 24-часовой период: автоматический сброс
              this.used = 0;
              this.resetAt = Date.now() + 24 * 60 * 60 * 1000;
              this._save();
            } else {
              this.used = Number(data.used) || 0;
              this.resetAt = data.resetAt;
              this.limit = Number(data.limit) || CONFIG.DAILY_TOKEN_LIMIT;
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[AI TokenTracker] Ошибка загрузки состояния из localStorage:', err);
      }
      // Инициализация по умолчанию
      this.used = 0;
      this.resetAt = Date.now() + 24 * 60 * 60 * 1000;
      this._save();
    }

    _save() {
      try {
        const payload = {
          limit: this.limit,
          used: this.used,
          resetAt: this.resetAt,
          updatedAt: Date.now()
        };
        safeSetItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn('[AI TokenTracker] Ошибка сохранения в localStorage:', err);
      }
    }

    _startTicker() {
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        if (Date.now() >= this.resetAt) {
          this.used = 0;
          this.resetAt = Date.now() + 24 * 60 * 60 * 1000;
          this._save();
          this._notify();
        } else {
          this._notifyCountdownOnly();
        }
      }, 1000);
      if (this.timerId && typeof this.timerId.unref === 'function') {
        this.timerId.unref();
      }
    }

    recordUsage(tokens, modelName = '', prompt = '') {
      const delta = Math.max(0, Math.round(Number(tokens) || 0));
      this.used += delta;
      this._save();
      this._notify();

      // Сохраняем краткую историю использования
      try {
        const logKey = 'aurora_ai_token_log_v1';
        const rawLogs = safeGetItem(logKey);
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          timestamp: Date.now(),
          tokens: delta,
          totalUsed: this.used,
          model: modelName,
          prompt: (prompt || '').slice(0, 100)
        });
        safeSetItem(logKey, JSON.stringify(logs.slice(0, 50)));
      } catch (e) {
        // игнорируем
      }
    }

    getRemaining() {
      return Math.max(0, this.limit - this.used);
    }

    getPercentUsed() {
      return Math.min(100, (this.used / this.limit) * 100);
    }

    getCountdown() {
      const diff = Math.max(0, this.resetAt - Date.now());
      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = n => String(n).padStart(2, '0');
      return {
        hours,
        minutes,
        seconds,
        formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        human: `${hours} ч ${minutes} мин ${seconds} с`
      };
    }

    canGenerate(estimate = 1200) {
      return (this.used + estimate) <= this.limit;
    }

    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.getState());
      return () => this.listeners.delete(listener);
    }

    _notify() {
      const state = this.getState();
      this.listeners.forEach(fn => {
        try { fn(state); } catch (e) { console.error(e); }
      });
    }

    _notifyCountdownOnly() {
      const state = this.getState();
      this.listeners.forEach(fn => {
        try { if (fn.onTick) fn.onTick(state); } catch (e) { console.error(e); }
      });
    }

    getState() {
      return {
        limit: this.limit,
        used: this.used,
        remaining: this.getRemaining(),
        percentUsed: this.getPercentUsed(),
        countdown: this.getCountdown(),
        resetAt: this.resetAt
      };
    }
  }

  const tracker = new TokenTracker();

  /* ══════════════════════════════════════════════════════════════
     СТИЛИ И ШАБЛОНЫ ЭЛЕМЕНТОВ
     ══════════════════════════════════════════════════════════════ */
  const STYLE_MODIFIERS = {
    neon: {
      name: 'Неоновое свечение (Cyber Neon)',
      prompt: 'Style: Cyberpunk glowing neon sticker. Intense vibrant neon outlines (#00f0ff, #ff007f, #a855f7), rich linearGradients, SVG glow filter feGaussianBlur, dark transparent negative space. Standalone sticker icon with bold silhouette.'
    },
    flat: {
      name: 'Современный плоский вектор (Modern Flat)',
      prompt: 'Style: Modern crisp flat vector sticker. High contrast solid geometric fills, smooth clean curves, energetic accents, rounded corners, clean transparent background. Figma/Dribbble style vector art.'
    },
    hologram: {
      name: 'Голографический градиент (Holographic)',
      prompt: 'Style: Holographic iridescent sticker. Shimmering pearl and foil gradient fills (turquoise, lilac, magenta, soft gold), subtle metallic gleam, glossy highlights, 100% transparent backdrop.'
    },
    stamp: {
      name: 'Библиотечный штамп / Винтаж (Vintage Stamp)',
      prompt: 'Style: Vintage library rubber stamp or retro postal badge. Elegant circular/shield border, star ornaments, classic typography framing, distressed retro ink effect, 100% transparent background.'
    },
    glossy3d: {
      name: 'Глянцевый 3D стикер (Glossy 3D)',
      prompt: 'Style: Modern 3D glossy isometric sticker. Rich volume gradients, specular highlights, soft drop ambient depth, rounded pillowy contours, clean transparent background.'
    }
  };

  const PROMPT_PRESETS = [
    { label: '⚡ Неоновая стрелка', prompt: 'Dynamic futuristic neon glowing pointer arrow with cyber gradient', style: 'neon' },
    { label: '🌟 Золотая звезда', prompt: 'Five-pointed glowing star badge with royal golden gradient and sparkle flare', style: 'neon' },
    { label: '📚 Книжная закладка', prompt: 'Modern decorative ribbon bookmark with star icon and sleek geometric pattern', style: 'flat' },
    { label: '🏷️ Стикер «ТОП СОБЫТИЕ»', prompt: 'Trendy badge sticker with bold text "ТОП", glowing ring and lightning bolts', style: 'neon' },
    { label: '🔮 Кибер-сфера', prompt: 'Abstract glowing holographic cyber sphere with tech orbit rings', style: 'hologram' },
    { label: '🔥 Неоновый огонь', prompt: 'Stylized hot flame fire icon with neon orange and magenta gradient glow', style: 'neon' },
    { label: '💡 Лампочка идей', prompt: 'Glowing lightbulb sticker with electric spark inside and inspiration rays', style: 'neon' },
    { label: '🎟️ Золотой билет', prompt: 'Admit One vintage library event VIP ticket badge with perforated edges', style: 'stamp' },
    { label: '☕ Чашка кофе', prompt: 'Cozy steam coffee cup sticker with warm glowing vapor', style: 'flat' },
    { label: '🌿 Изумрудная лавровая ветвь', prompt: 'Botanical laurel branch wreath sticker with glowing emerald leaves', style: 'hologram' },
    { label: '🎭 Театральные маски', prompt: 'Comedy and drama theatre masks glowing art sticker for cultural festival', style: 'neon' },
    { label: '🚀 Ракета в космос', prompt: 'Cute retro cosmic rocket booster blastoff with smoke trails and sparks', style: 'glossy3d' }
  ];

  /* ══════════════════════════════════════════════════════════════
     ОЧИСТКА И ОБЕСПЕЧЕНИЕ 100% ПРОЗРАЧНОГО ФОНА SVG
     ══════════════════════════════════════════════════════════════ */
  /**
   * Извлекает чистый SVG из любого ответа нейросети,
   * удаляет случайные фоновые прямоугольники и нормализует viewBox.
   *
   * @param {string} rawText
   * @returns {string}
   */
  function sanitizeAndExtractSvg(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Пустой ответ от нейросети');
    }

    let text = rawText.trim();

    // 1. Извлечение содержимого между <svg ...> и </svg>
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      // Попробуем распаковать JSON, если модель завернула результат в JSON
      try {
        const parsed = JSON.parse(text);
        if (parsed.svg) return sanitizeAndExtractSvg(parsed.svg);
        if (parsed.content) return sanitizeAndExtractSvg(parsed.content);
        if (parsed.code) return sanitizeAndExtractSvg(parsed.code);
      } catch (e) {
        // не JSON
      }
      throw new Error('Нейросеть не вернула валидный векторный SVG тег.');
    }

    let svg = svgMatch[0];

    // 2. Гарантируем корректный заголовок с namespace
    if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // 3. УДАЛЕНИЕ ФОНОВЫХ ПОДЛОЖЕК (100% ПРОЗРАЧНЫЙ ФОН):
    // Модели иногда вставляют <rect width="100%" height="100%" fill="#..."/>
    // Удаляем любые начальные rect, которые пытаются закрасить фон холста:
    svg = svg.replace(/<rect[^>]*width=["'](?:100%|100vw|100|200|300|400|500|800|1024)["'][^>]*height=["'](?:100%|100vh|100|200|300|400|500|800|1024)["'][^>]*fill=["'](?:#(?:[0-9a-fA-F]{3,8})|black|white|rgb\([^)]+\)|rgba\([^)]+\))["'][^>]*\/?>/gi, '');
    svg = svg.replace(/<rect[^>]*fill=["'](?:#(?:[0-9a-fA-F]{3,8})|black|white|rgb\([^)]+\))["'][^>]*width=["'](?:100%|100vw|100|200|300|400|500|800|1024)["'][^>]*height=["'](?:100%|100vh|100|200|300|400|500|800|1024)["'][^>]*\/?>/gi, '');

    // Удаляем inline стиль background у самого тега <svg>
    svg = svg.replace(/(<svg[^>]*)\sstyle=["'][^"']*background[^"']*["']/gi, '$1');

    // Гарантируем наличие viewBox
    if (!svg.includes('viewBox=')) {
      const wMatch = svg.match(/width=["'](\d+)["']/i);
      const hMatch = svg.match(/height=["'](\d+)["']/i);
      const w = wMatch ? wMatch[1] : '300';
      const h = hMatch ? hMatch[1] : '300';
      svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
    }

    return svg;
  }

  /* ══════════════════════════════════════════════════════════════
     КЛИЕНТ API С КАСКАДНЫМ FALLBACK
     ══════════════════════════════════════════════════════════════ */
  /**
   * Выполняет генерацию элемента через каскад моделей:
   * Minimax M3 -> Qwen 3.6 35B -> Qwen 3.5 397B
   *
   * @param {string} userPrompt - Текстовое описание стикера/элемента
   * @param {string} styleKey - Ключ стиля ('neon', 'flat', 'hologram', 'stamp', 'glossy3d')
   * @param {object} [options] - Колбэки прогресса и отмены
   * @returns {Promise<{ svg: string, model: string, usage: object }>}
   */
  async function generateAiElement(userPrompt, styleKey = 'neon', options = {}) {
    if (!userPrompt || !userPrompt.trim()) {
      throw new Error('Пожалуйста, введите описание элемента для генерации');
    }

    // Проверка суточного лимита токенов
    if (!tracker.canGenerate(CONFIG.MAX_TOKENS)) {
      const cd = tracker.getCountdown();
      throw new Error(`Превышен суточный лимит 1 000 000 токенов. Сброс лимита через ${cd.human}.`);
    }

    const onStatusUpdate = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    const abortSignal = options.signal || null;

    const style = STYLE_MODIFIERS[styleKey] || STYLE_MODIFIERS.neon;

    // Компактный системный промпт (строгая экономия токенов, strict SVG, 100% прозрачный фон)
    const systemPrompt = 
      "You are an expert SVG graphic designer for modern poster stickers and badges.\n" +
      "Task: Generate ONLY standalone, valid vector SVG code for the requested icon/sticker element.\n" +
      "STRICT RULES:\n" +
      "1. Output ONLY raw <svg>...</svg> XML. NO Markdown backticks, NO explanations, NO HTML tags.\n" +
      "2. 100% TRANSPARENT BACKGROUND: Never include any backdrop <rect> or full-bleed background shape.\n" +
      "3. Use viewBox='0 0 300 300' and preserveAspectRatio='xMidYMid meet'.\n" +
      "4. Include rich visuals: <defs>, <linearGradient>, <radialGradient>, glowing neon filters (<feGaussianBlur>).\n" +
      "5. Use high-contrast vivid colors (#00f0ff, #ff007f, #a855f7, #ffd700, #10b981) suitable for dark and light posters.\n" +
      "6. All text tags inside must have font-family='sans-serif' and font-weight='bold'.";

    const promptText = `Generate SVG sticker: "${userPrompt.trim()}". ${style.prompt}. Keep SVG compact, sharp and beautiful. Output raw <svg> only.`;

    const errors = [];

    // Каскадный перебор моделей (Waterfall Fallback)
    for (let i = 0; i < CONFIG.MODELS.length; i++) {
      const modelMeta = CONFIG.MODELS[i];
      const isPrimary = (i === 0);
      const isFallback = (i > 0);

      if (isFallback) {
        onStatusUpdate({
          status: 'fallback',
          model: modelMeta.id,
          modelName: modelMeta.name,
          attempt: i + 1,
          total: CONFIG.MODELS.length,
          message: `Переключение на резервную модель ${modelMeta.name}...`
        });
      } else {
        onStatusUpdate({
          status: 'requesting',
          model: modelMeta.id,
          modelName: modelMeta.name,
          attempt: 1,
          total: CONFIG.MODELS.length,
          message: `Генерация через ${modelMeta.name}...`
        });
      }

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          timeoutController.abort(new Error(`Превышено время ожидания ответа (${CONFIG.REQUEST_TIMEOUT_MS / 1000}с)`));
        }, CONFIG.REQUEST_TIMEOUT_MS);

        // Объединение сигналов отмены
        const combinedSignal = abortSignal 
          ? (abortSignal.aborted ? abortSignal : timeoutController.signal) 
          : timeoutController.signal;

        if (abortSignal) {
          abortSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
        }

        let data = null;
        let lastErrText = '';

        // Попытка 1: через локальный серверный прокси (полный обход CORS и серверная ротация 3 ключей)
        try {
          const proxyResp = await fetch(CONFIG.API_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelMeta.id,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptText }
              ],
              max_tokens: CONFIG.MAX_TOKENS,
              temperature: 0.35
            }),
            signal: combinedSignal
          });

          if (proxyResp.ok) {
            const pData = await proxyResp.json();
            if (pData && !pData.error && pData.choices?.[0]?.message?.content) {
              data = pData;
            } else if (pData?.error) {
              lastErrText = typeof pData.error === 'object' ? (pData.error.message || JSON.stringify(pData.error)) : String(pData.error);
            }
          } else {
            lastErrText = `Proxy HTTP ${proxyResp.status}`;
          }
        } catch (proxyErr) {
          lastErrText = proxyErr.message || String(proxyErr);
        }

        // Попытка 2: прямой запрос к xkiro с перебором всех 3 ключей
        if (!data) {
          for (let k = 0; k < CONFIG.API_KEYS.length; k++) {
            const currentKey = CONFIG.API_KEYS[k];
            try {
              const directResp = await fetch(CONFIG.API_DIRECT_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${currentKey}`
                },
                body: JSON.stringify({
                  model: modelMeta.id,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: promptText }
                  ],
                  max_tokens: CONFIG.MAX_TOKENS,
                  temperature: 0.35
                }),
                signal: combinedSignal
              });

              if (directResp.ok) {
                const dData = await directResp.json();
                if (dData && !dData.error && dData.choices?.[0]?.message?.content) {
                  data = dData;
                  break;
                }
              }
            } catch (dErr) {
              lastErrText = dErr.message || String(dErr);
            }
          }
        }

        clearTimeout(timeoutId);

        if (!data) {
          throw new Error(lastErrText || `Модель ${modelMeta.name} не вернула валидного ответа.`);
        }

        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent || !rawContent.trim()) {
          throw new Error('Пустой ответ содержимого от модели');
        }

        // Извлечение и валидация SVG
        onStatusUpdate({
          status: 'processing',
          model: modelMeta.id,
          modelName: modelMeta.name,
          message: 'Проверка прозрачности и сборка векторных слоёв...'
        });

        const cleanSvg = sanitizeAndExtractSvg(rawContent);

        // Учет токенов
        const usage = data.usage || {
          prompt_tokens: Math.round(promptText.length / 4) + 120,
          completion_tokens: Math.round(cleanSvg.length / 4),
          total_tokens: Math.round((promptText.length + cleanSvg.length) / 4) + 120
        };

        const totalTokens = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens);
        tracker.recordUsage(totalTokens, modelMeta.id, userPrompt);

        // Сохраняем в недавнюю историю
        saveToRecentHistory(cleanSvg, userPrompt, styleKey, modelMeta.name);

        onStatusUpdate({
          status: 'success',
          model: modelMeta.id,
          modelName: modelMeta.name,
          usage: usage,
          message: `Элемент успешно сгенерирован (${totalTokens} токенов)!`
        });

        return {
          svg: cleanSvg,
          model: modelMeta.id,
          modelName: modelMeta.name,
          usage: usage,
          totalTokens: totalTokens
        };

      } catch (err) {
        console.warn(`[Aurora AI Elements] Ошибка на модели ${modelMeta.id}:`, err);
        errors.push({ model: modelMeta.id, error: err.message || String(err) });

        // Если отменено пользователем вручную, не пробуем дальше
        if (abortSignal && abortSignal.aborted) {
          throw new Error('Генерация отменена пользователем');
        }

        // Если это была последняя модель в списке, выбрасываем сводную ошибку
        if (i === CONFIG.MODELS.length - 1) {
          const detail = errors.map(e => `• ${e.model}: ${e.error}`).join('\n');
          throw new Error(`Все AI модели вернули сбой:\n${detail}`);
        }
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ИНТЕГРАЦИЯ В ХОЛСТ FABRIC.JS (СЛОИ И ЦЕНТРИРОВАНИЕ)
     ══════════════════════════════════════════════════════════════ */
  /**
   * Вычисляет центр текущей видимой области (viewport) холста
   * с учетом экранного зума и CANVAS_PADDING.
   *
   * @param {fabric.Canvas} [c]
   * @returns {{ x: number, y: number }}
   */
  function getVisibleViewportCenter(c) {
    const canvasInst = c || window.canvas;
    if (!canvasInst) return { x: 300, y: 400 };

    const dims = (typeof window.getArtboardDimensions === 'function')
      ? window.getArtboardDimensions(canvasInst)
      : { w: (window.currentSize?.w || 595), h: (window.currentSize?.h || 842) };

    try {
      const vpt = canvasInst.viewportTransform;
      if (vpt && canvasInst.getWidth && canvasInst.getHeight) {
        const screenCenterX = canvasInst.getWidth() / 2;
        const screenCenterY = canvasInst.getHeight() / 2;

        // Обратное преобразование экранных координат в координаты артборда:
        // screenX = ptX * vpt[0] + vpt[4]  ==>  ptX = (screenX - vpt[4]) / vpt[0]
        const ptX = (screenCenterX - vpt[4]) / (vpt[0] || 1);
        const ptY = (screenCenterY - vpt[5]) / (vpt[3] || 1);

        // Если полученная точка находится в разумных пределах листа
        if (ptX >= -80 && ptX <= dims.w + 80 && ptY >= -80 && ptY <= dims.h + 80) {
          return {
            x: Math.max(30, Math.min(dims.w - 30, Math.round(ptX))),
            y: Math.max(30, Math.min(dims.h - 30, Math.round(ptY)))
          };
        }
      }
    } catch (e) {
      // fallback
    }

    return { x: Math.round(dims.w / 2), y: Math.round(dims.h / 2) };
  }

  /**
   * Загружает SVG строку и СРАЗУ добавляет ее новым слоем (fabric.Group)
   * в центр видимой области холста.
   *
   * @param {string} svgText - Валидный SVG код
   * @param {object} [options] - Дополнительные параметры размещения
   * @returns {Promise<fabric.Group|fabric.Object>}
   */
  function addSvgElementToCanvas(svgText, options = {}) {
    return new Promise((resolve, reject) => {
      const canvasInst = options.canvas || window.canvas;
      if (!canvasInst) {
        return reject(new Error('Холст афиши не инициализирован. Выберите шаблон.'));
      }

      if (typeof fabric === 'undefined' || !fabric.loadSVGFromString) {
        return reject(new Error('Библиотека Fabric.js не загружена на странице'));
      }

      fabric.loadSVGFromString(svgText, (objects, opts) => {
        try {
          if (!objects || objects.length === 0) {
            return reject(new Error('Не удалось преобразовать SVG в векторные объекты Fabric.js'));
          }

          // Группировка всех элементов SVG в единый составной объект
          const group = fabric.util.groupSVGElements(objects, opts);
          if (!group) {
            return reject(new Error('Сбой группировки элементов SVG'));
          }

          // Вычисление подходящего масштаба под размеры текущего листа
          const dims = (typeof window.getArtboardDimensions === 'function')
            ? window.getArtboardDimensions(canvasInst)
            : { w: (window.currentSize?.w || 595), h: (window.currentSize?.h || 842) };

          const origW = group.width || 200;
          const origH = group.height || 200;
          const maxDim = Math.max(origW, origH, 1);

          // Целевой размер стикера на холсте (~28-36% от меньшей стороны листа, max 260px)
          const targetSize = Math.min(Math.min(dims.w, dims.h) * 0.34, CONFIG.DEFAULT_SIZE);
          const scale = targetSize / maxDim;

          // Определение центра видимой области
          const center = getVisibleViewportCenter(canvasInst);

          group.set({
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            transparentCorners: false,
            cornerColor: '#00f0ff',
            cornerStrokeColor: '#ffffff',
            borderColor: '#00f0ff',
            cornerSize: 10,
            padding: 6
          });

          // Пользовательские метаданные слоя
          group.__isAiElement = true;
          group.__aiPrompt = options.prompt || 'AI Sticker';
          group.__aiSvg = svgText;
          group.name = options.prompt ? `AI: ${options.prompt.slice(0, 20)}` : 'AI Стикер';

          // Добавление на холст
          canvasInst.add(group);
          canvasInst.setActiveObject(group);
          canvasInst.requestRenderAll ? canvasInst.requestRenderAll() : canvasInst.renderAll();

          // Регистрация в истории Undo и обновление панели слоев
          if (typeof window.saveHistory === 'function') {
            window.saveHistory();
          }
          if (typeof window.updateLayersList === 'function') {
            window.updateLayersList();
          }
          if (typeof window.toast === 'function') {
            window.toast('✨ AI элемент добавлен на холст!');
          }

          resolve(group);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ХРАНЕНИЕ НЕДАВНИХ ГЕНЕРАЦИЙ (RECENT GENERATIONS)
     ══════════════════════════════════════════════════════════════ */
  function getRecentHistory() {
    try {
      const raw = safeGetItem(CONFIG.HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToRecentHistory(svg, prompt, styleKey, modelName) {
    try {
      const history = getRecentHistory();
      history.unshift({
        id: 'ai_' + Date.now(),
        timestamp: Date.now(),
        svg,
        prompt,
        styleKey,
        modelName
      });
      safeSetItem(CONFIG.HISTORY_KEY, JSON.stringify(history.slice(0, 16)));
    } catch (e) {
      // игнорируем квоты localStorage
    }
  }

  /* ══════════════════════════════════════════════════════════════
     МОДАЛЬНЫЙ ИНТЕРФЕЙС И СОБЫТИЯ
     ══════════════════════════════════════════════════════════════ */
  let activeAbortController = null;

  function initModalUI() {
    const modalOverlay = document.getElementById('ai-generator-modal-overlay');
    if (!modalOverlay) return;

    const btnClose = document.getElementById('ai-modal-close');
    const promptInput = document.getElementById('ai-prompt-input');
    const btnGenerate = document.getElementById('btn-ai-generate');
    const btnInsert = document.getElementById('btn-ai-insert-canvas');
    const btnCancel = document.getElementById('btn-ai-cancel');
    const previewContainer = document.getElementById('ai-svg-preview-box');
    const statusText = document.getElementById('ai-status-text');
    const statusPill = document.getElementById('ai-status-pill');
    const tokenBadge = document.getElementById('ai-tokens-badge');
    const tokenProgress = document.getElementById('ai-token-bar-fill');
    const tokenCountdown = document.getElementById('ai-token-countdown');
    const chipsContainer = document.getElementById('ai-prompt-chips');
    const styleChips = document.querySelectorAll('.ai-style-chip');
    const historyStrip = document.getElementById('ai-recent-strip');

    let currentSvg = '';
    let currentStyle = 'neon';

    // 1. Привязка трекера токенов к UI
    function updateTokenUI(state) {
      if (tokenBadge) {
        const usedFmt = state.used.toLocaleString('ru-RU');
        const limitFmt = state.limit.toLocaleString('ru-RU');
        tokenBadge.textContent = `${usedFmt} / ${limitFmt} токенов`;
      }
      if (tokenProgress) {
        tokenProgress.style.width = `${state.percentUsed.toFixed(1)}%`;
        if (state.percentUsed > 90) {
          tokenProgress.style.background = '#ef4444';
        } else if (state.percentUsed > 75) {
          tokenProgress.style.background = '#f59e0b';
        } else {
          tokenProgress.style.background = 'linear-gradient(90deg, #00f0ff, #a855f7)';
        }
      }
      if (tokenCountdown) {
        tokenCountdown.textContent = `Сброс через: ${state.countdown.formatted}`;
      }
    }

    const tokenListener = state => updateTokenUI(state);
    tokenListener.onTick = state => {
      if (tokenCountdown) tokenCountdown.textContent = `Сброс через: ${state.countdown.formatted}`;
    };
    tracker.subscribe(tokenListener);

    // 2. Отрисовка быстрых подсказок-промптов
    if (chipsContainer) {
      chipsContainer.innerHTML = PROMPT_PRESETS.map(p => `
        <button type="button" class="ai-chip-btn" data-prompt="${encodeURIComponent(p.prompt)}" data-style="${p.style}">
          ${p.label}
        </button>
      `).join('');

      chipsContainer.addEventListener('click', e => {
        const btn = e.target.closest('.ai-chip-btn');
        if (!btn) return;
        const p = decodeURIComponent(btn.dataset.prompt);
        const st = btn.dataset.style;
        if (promptInput) promptInput.value = p;
        if (st) selectStyle(st);
        if (promptInput) promptInput.focus();
      });
    }

    // 3. Выбор стиля
    function selectStyle(key) {
      currentStyle = key;
      styleChips.forEach(c => {
        c.classList.toggle('is-active', c.dataset.style === key);
      });
    }

    styleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        selectStyle(chip.dataset.style);
      });
    });

    // 4. Отрисовка недавних генераций
    function renderHistory() {
      if (!historyStrip) return;
      const list = getRecentHistory();
      if (!list.length) {
        historyStrip.innerHTML = '<span class="ai-history-empty">История пуста. Сгенерируйте первый стикер!</span>';
        return;
      }
      historyStrip.innerHTML = list.map(item => `
        <div class="ai-history-thumb" data-id="${item.id}" title="${item.prompt}">
          <div class="ai-thumb-inner">${item.svg}</div>
          <span class="ai-thumb-label">${item.prompt.slice(0, 16)}...</span>
        </div>
      `).join('');
    }

    if (historyStrip) {
      historyStrip.addEventListener('click', e => {
        const thumb = e.target.closest('.ai-history-thumb');
        if (!thumb) return;
        const id = thumb.dataset.id;
        const item = getRecentHistory().find(x => x.id === id);
        if (item) {
          currentSvg = item.svg;
          setPreviewSvg(item.svg);
          if (btnInsert) btnInsert.disabled = false;
          if (statusText) statusText.textContent = `Загружен из истории: "${item.prompt}"`;
        }
      });
    }

    // 5. Превью SVG
    function setPreviewSvg(svgStr) {
      if (!previewContainer) return;
      if (!svgStr) {
        previewContainer.innerHTML = `
          <div class="ai-preview-placeholder">
            <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.35;">auto_awesome</span>
            <p>Здесь появится сгенерированный векторный элемент на 100% прозрачном фоне</p>
          </div>
        `;
        if (btnInsert) btnInsert.disabled = true;
        return;
      }
      previewContainer.innerHTML = svgStr;
      if (btnInsert) btnInsert.disabled = false;
    }

    // 6. Запуск генерации
    async function doGenerate() {
      const val = promptInput ? promptInput.value.trim() : '';
      if (!val) {
        if (typeof window.toast === 'function') window.toast('Введите описание элемента');
        if (promptInput) promptInput.focus();
        return;
      }

      if (btnGenerate) btnGenerate.disabled = true;
      if (btnCancel) btnCancel.classList.remove('hidden');
      if (statusPill) statusPill.className = 'ai-status-pill is-loading';
      if (statusText) statusText.textContent = 'Подключение к AI эндпоинту...';

      activeAbortController = new AbortController();

      try {
        const res = await generateAiElement(val, currentStyle, {
          signal: activeAbortController.signal,
          onStatus: info => {
            if (statusText) statusText.textContent = info.message;
            if (info.status === 'fallback') {
              if (statusPill) statusPill.className = 'ai-status-pill is-warning';
            }
          }
        });

        currentSvg = res.svg;
        setPreviewSvg(res.svg);
        renderHistory();

        if (statusPill) statusPill.className = 'ai-status-pill is-success';
        if (statusText) {
          statusText.textContent = `Готово! Модель: ${res.modelName} · Токены: ${res.totalTokens}`;
        }

        // Автоматическая подстановка на холст при чекбоксе авто-вставки
        const chkAuto = document.getElementById('ai-chk-auto-insert');
        if (chkAuto && chkAuto.checked) {
          await addSvgElementToCanvas(res.svg, { prompt: val });
          closeModal();
        }

      } catch (err) {
        if (statusPill) statusPill.className = 'ai-status-pill is-error';
        if (statusText) statusText.textContent = `Ошибка: ${err.message}`;
        if (typeof window.toast === 'function') window.toast(`Сбой: ${err.message}`);
      } finally {
        if (btnGenerate) btnGenerate.disabled = false;
        if (btnCancel) btnCancel.classList.add('hidden');
        activeAbortController = null;
      }
    }

    if (btnGenerate) btnGenerate.addEventListener('click', doGenerate);
    if (promptInput) {
      promptInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          doGenerate();
        }
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (activeAbortController) {
          activeAbortController.abort();
          if (statusText) statusText.textContent = 'Генерация отменена';
        }
      });
    }

    // 7. Вставка на холст
    if (btnInsert) {
      btnInsert.addEventListener('click', async () => {
        if (!currentSvg) return;
        try {
          const val = promptInput ? promptInput.value.trim() : 'AI Sticker';
          await addSvgElementToCanvas(currentSvg, { prompt: val });
          closeModal();
        } catch (err) {
          if (typeof window.toast === 'function') window.toast(err.message);
        }
      });
    }

    function openModal() {
      modalOverlay.classList.remove('hidden');
      renderHistory();
      if (promptInput) promptInput.focus();
    }

    function closeModal() {
      modalOverlay.classList.add('hidden');
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Экспорт функции открытия модалки
    window.openAiGeneratorModal = openModal;
  }

  // Автоинициализация при загрузке DOM
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initModalUI);
    } else {
      initModalUI();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ПУБЛИЧНЫЙ API МОДУЛЯ
     ══════════════════════════════════════════════════════════════ */
  return {
    generateAiElement,
    addSvgElementToCanvas,
    sanitizeAndExtractSvg,
    getVisibleViewportCenter,
    tracker,
    CONFIG,
    STYLE_MODIFIERS,
    PROMPT_PRESETS,
    getRecentHistory
  };
});
