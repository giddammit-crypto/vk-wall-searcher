/**
 * ===================================================================
 * AURORA DESIGN — AI ELEMENT & PHOTO GENERATOR CORE
 * Файл: vk-miniapp/poster/ai_elements.js
 * 
 * Архитектура модуля:
 * 1. Два режима генерации:
 *    - «Фотография (Растр 8K)» (mode: 'raster'):
 *      * Промпт-инжиниринг через xKiro LLM (Minimax M3 / Qwen)
 *      * Превращение пользовательского запроса в мастер-промпт студийной фотографии:
 *        Hasselblad H6D-100c 100MP, 85mm f/1.4, cinematic rim lighting, 8k uhd,
 *        isolated on pure solid white studio backdrop.
 *      * Рендеринг ультра-детализированного растрового фото через FLUX фото-движок (1024x1024).
 *      * Smart Auto Cutout: Multi-seed Chroma + BFS Flood-Fill + Defringing + Alpha Feathering
 *        для получения 100% прозрачного фона в браузере!
 *      * Добавление на холст как fabric.Image с именем [AI Photo] ...
 *    - «Вектор (SVG)» (mode: 'vector'):
 *      * Strict SVG с удалением фоновых подложек и добавлением в виде fabric.Group.
 * 2. Учет токенов (Token Quota Tracker):
 *    - Лимит: 1 000 000 токенов в сутки
 *    - Персистентность в localStorage ('aurora_ai_token_tracker_v1')
 *    - 24-часовой скользящий таймер обратного отсчета
 * 3. Анимация крутящегося кружка Авроры (Aurora Loader):
 *    - Запуск при генерации
 *    - Плавное исчезновение ровно в момент попадания фото/вектора на холст
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
    DEFAULT_SIZE: 260
  };

  /* ══════════════════════════════════════════════════════════════
     АНИМАЦИЯ АВРОРА: ВРАЩАЮЩИЙСЯ КРУЖОК ГЕНЕРАЦИИ (AURORA LOADER)
     ══════════════════════════════════════════════════════════════ */
  let activeAuroraLoaderEl = null;

  function showAuroraLoader(title = 'Генерация AI-элемента...', sub = 'Создание векторных слоёв на прозрачном фоне') {
    hideAuroraLoader();

    // 1. Отображение поверх холста в рабочей зоне
    const viewport = document.getElementById('canvas-viewport') || document.getElementById('canvas-stage') || document.getElementById('canvas-area') || document.body;
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
          <div class="aurora-loader-title">${escapeHtml(title)}</div>
          <div class="aurora-loader-sub">${escapeHtml(sub)}</div>
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ══════════════════════════════════════════════════════════════
     КЛАСС УЧЕТА ТОКЕНОВ (TOKEN QUOTA TRACKER)
     Лимит: 1 000 000 токенов в сутки с таймером сброса
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
        // ignore
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
     ПРЕСЕТЫ И СТИЛИ СТУДИЙНОЙ ФОТОГРАФИИ (РАСТР 8K)
     ══════════════════════════════════════════════════════════════ */
  const PHOTO_PRESETS = {
    studio: {
      name: 'Студийный свет',
      desc: 'Софтбокс 3 точки, rim-light, мягкие тени',
      pill: 'Pro Light',
      prompt: 'Shot on Hasselblad H6D-100c medium format camera, 100 megapixels, 85mm f/1.4 lens, ISO 64. Professional 3-point softbox studio lighting, cinematic rim lighting highlighting contours, pure solid seamless white studio backdrop, photorealistic commercial product photography, 8k uhd, exquisite micro-textures, crisp sharp separation edges.'
    },
    macro: {
      name: 'Макро 8K',
      desc: 'Сверхдетализация текстур, поры, волокна',
      pill: '8K UHD',
      prompt: 'Shot on Hasselblad H6D-100c with 100mm f/2.8 Macro lens, extreme depth of detail, microscopic tactile textures, glistening water droplets, hyper-focused subject, pure seamless solid white studio backdrop, sharp distinct silhouette, commercial macro photography masterpiece, 8k.'
    },
    vogue: {
      name: 'Глянец / Vogue',
      desc: 'Модный глянец, вспышка, сочные цвета',
      pill: 'Fashion',
      prompt: 'Vogue editorial commercial lighting, beauty dish and silver umbrella diffusion, high-fashion specular reflections, vibrant rich colors, pure solid seamless white studio backdrop, crisp clean silhouette boundary, 8k hyper-realistic commercial shot.'
    },
    bokeh: {
      name: 'Боке f/1.4',
      desc: 'Оптическое размытие фона, мягкие диски',
      pill: 'f/1.4 Lens',
      prompt: 'Shot with 85mm f/1.4 prime lens at wide open aperture, ultra-shallow depth of field, razor-sharp focus on subject center with smooth creamy falloff, isolated on pure solid white seamless backdrop, commercial hero photography, 8k.'
    },
    cinema: {
      name: 'Кинокадр',
      desc: '35mm Anamorphic, Teal & Orange киногамма',
      pill: 'Cinema',
      prompt: 'Cinematic dramatic lighting, 35mm anamorphic prime lens, subtle cyan and amber rim highlights, sculptural shadow contrast, pure solid seamless clean white studio backdrop, cinematic commercial still, sharp crisp contour, 8k resolution.'
    },
    isolated3d: {
      name: '3D Изоляция',
      desc: 'Octane 3D, идеальные тени, левитация',
      pill: 'Octane 3D',
      prompt: 'Octane 3D photorealistic studio render, subsurface scattering, physically based rendering materials, floating isolated hero element, soft ambient occlusion, pure white infinity studio background, raytraced reflections, 8k.'
    }
  };

  const PHOTO_PROMPT_PRESETS = [
    { label: '🍎 Рубиновое яблоко с росой', prompt: 'Crisp fresh ruby red apple with delicate morning dew droplets on skin', preset: 'macro' },
    { label: '☕ Чашка капучино с латте-артом', prompt: 'Artisan porcelain cup of cappuccino with intricate heart latte art and subtle steam', preset: 'studio' },
    { label: '📖 Старинная книга в коже', prompt: 'Antique leather-bound tome book with embossed golden leaf ornaments and aged parchment pages', preset: 'vogue' },
    { label: '🎧 Премиум наушники', prompt: 'High-end sleek wireless audiophile headphones with brushed aluminum and leather earcups', preset: 'studio' },
    { label: '🌿 Тропический лист монстеры', prompt: 'Vibrant glossy emerald green monstera deliciosa leaf with translucent veins and water drops', preset: 'macro' },
    { label: '🍔 Сочный гурме-бургер', prompt: 'Gourmet artisan burger with melted aged cheddar, crisp lettuce, brioche bun and sesame seeds', preset: 'vogue' },
    { label: '🏆 Золотой кубок победителя', prompt: 'Gleaming polished 24k gold champion trophy cup with filigree handles and brilliant reflections', preset: 'studio' },
    { label: '🚀 Ретро-футуристичная ракета', prompt: 'Vintage aerodynamic space rocket model with polished chrome fuselage and red wing fins', preset: 'isolated3d' },
    { label: '🌸 Ветка сакуры в цвету', prompt: 'Delicate blooming Japanese cherry blossom sakura branch with soft pink petals', preset: 'macro' },
    { label: '🎸 Электрогитара Sunburst', prompt: 'Classic vintage 1959 electric guitar with glossy tobacco sunburst lacquer and chrome hardware', preset: 'vogue' },
    { label: '🕯️ Античный бронзовый подсвечник', prompt: 'Ornate antique baroque bronze candlestick with burning wax candle and glowing flame', preset: 'cinema' },
    { label: '💎 Бриллиант круглой огранки', prompt: 'Flawless 5-carat round brilliant cut diamond with kaleidoscopic rainbow light dispersion prism facets', preset: 'macro' }
  ];

  /* ══════════════════════════════════════════════════════════════
     СТИЛИ И ШАБЛОНЫ ВЕКТОРНЫХ СТИКЕРОВ (SVG)
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
     АЛГОРИТМЫ SMART AUTO CUTOUT (100% ПРОЗРАЧНЫЙ ФОН)
     Multi-seed Chroma + BFS Flood-Fill + Defringing + Feathering
     ══════════════════════════════════════════════════════════════ */
  function _perceptualColorDist(r1, g1, b1, r2, g2, b2) {
    const rMean = (r1 + r2) * 0.5;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
  }

  /* ── 1. Устранение водяного знака pollinations.ai (35-42px в правом нижнем углу) ── */
  function _cleanPollinationsWatermark(ctx, iw, ih) {
    const wmWidth = Math.min(180, Math.floor(iw * 0.22));
    const wmHeight = Math.min(42, Math.floor(ih * 0.055));
    const startX = iw - wmWidth;
    const startY = ih - wmHeight;
    try {
      const patchY = Math.max(0, startY - wmHeight - 4);
      const patchData = ctx.getImageData(startX, patchY, wmWidth, wmHeight);
      ctx.putImageData(patchData, startX, startY);
    } catch (e) {
      // ignore
    }
  }

  /* ── 2. Сэмплирование фона ИСКЛЮЧИТЕЛЬНО из гарантированных зон (верхние углы и верхняя кромка) ── */
  function _analyzeStudioBackground(data, iw, ih) {
    const samples = [];
    const rVals = [];
    const gVals = [];
    const bVals = [];

    function addSample(x, y) {
      if (x < 0 || x >= iw || y < 0 || y >= ih) return;
      const idx = (y * iw + x) * 4;
      if (data[idx + 3] > 20) {
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        samples.push({ r, g, b });
        rVals.push(r);
        gVals.push(g);
        bVals.push(b);
      }
    }

    // 1. Верхний левый угол (32x32 блок)
    const cornerSize = Math.min(32, Math.floor(Math.min(iw, ih) / 10));
    for (let dy = 0; dy < cornerSize; dy += 2) {
      for (let dx = 0; dx < cornerSize; dx += 2) {
        addSample(dx, dy);
      }
    }

    // 2. Верхний правый угол (32x32 блок)
    for (let dy = 0; dy < cornerSize; dy += 2) {
      for (let dx = 0; dx < cornerSize; dx += 2) {
        addSample(iw - 1 - dx, dy);
      }
    }

    // 3. Верхняя кромка (y = 0..10) с адаптивным шагом
    const stepX = Math.max(4, Math.floor(iw / 60));
    for (let x = cornerSize; x < iw - cornerSize; x += stepX) {
      for (let y = 0; y < 8; y += 2) {
        addSample(x, y);
      }
    }

    // 4. Верхняя четверть боковых кромок (y = 0 .. ih * 0.25, СТРОГО не ниже!)
    // НИ В КОЕМ СЛУЧАЕ не сэмплировать из нижней границы (ih - 1), где находятся плечи и тело!
    const maxSideY = Math.floor(ih * 0.25);
    const stepY = Math.max(4, Math.floor(ih / 60));
    for (let y = cornerSize; y < maxSideY; y += stepY) {
      for (let dx = 0; dx < 6; dx += 2) {
        addSample(dx, y);
        addSample(iw - 1 - dx, y);
      }
    }

    if (!samples.length) {
      return {
        samples: [{ r: 255, g: 255, b: 255 }],
        median: { r: 255, g: 255, b: 255 },
        stdDev: 2
      };
    }

    // Медиана каналов
    rVals.sort((a, b) => a - b);
    gVals.sort((a, b) => a - b);
    bVals.sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    const medR = rVals[mid];
    const medG = gVals[mid];
    const medB = bVals[mid];

    // Стандартное отклонение (дисперсия)
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) {
      const dr = samples[i].r - medR;
      const dg = samples[i].g - medG;
      const db = samples[i].b - medB;
      sumSq += (dr * dr + dg * dg + db * db) / 3;
    }
    const stdDev = Math.sqrt(sumSq / samples.length);

    // Кластеризация уникальных образцов фона для быстрого BFS
    const unique = [{ r: medR, g: medG, b: medB }];
    for (let i = 0; i < samples.length; i += 4) {
      const s = samples[i];
      let hasNear = false;
      for (let j = 0; j < unique.length; j++) {
        const u = unique[j];
        if (Math.abs(s.r - u.r) < 6 && Math.abs(s.g - u.g) < 6 && Math.abs(s.b - u.b) < 6) {
          hasNear = true;
          break;
        }
      }
      if (!hasNear && unique.length < 32) {
        unique.push(s);
      }
    }

    return {
      samples: unique,
      median: { r: medR, g: medG, b: medB },
      stdDev: Math.min(25, stdDev)
    };
  }

  function _minDistToBgSamples(r, g, b, samples) {
    let minD = 999999;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d = _perceptualColorDist(r, g, b, s.r, s.g, s.b);
      if (d < minD) {
        minD = d;
        if (minD < 4) break;
      }
    }
    return minD;
  }

  /* ── 3. Детекция градиента контура (Sobel Edge Barrier) ── */
  function _computeEdgeMap(data, iw, ih) {
    const lum = new Uint8Array(iw * ih);
    const edges = new Uint8Array(iw * ih);

    for (let i = 0, p = 0; i < iw * ih * 4; i += 4, p++) {
      lum[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    }

    for (let y = 1; y < ih - 1; y++) {
      const rowPrev = (y - 1) * iw;
      const rowCur  = y * iw;
      const rowNext = (y + 1) * iw;
      for (let x = 1; x < iw - 1; x++) {
        const gx = 
          -lum[rowPrev + x - 1] + lum[rowPrev + x + 1]
          -2 * lum[rowCur + x - 1] + 2 * lum[rowCur + x + 1]
          -lum[rowNext + x - 1] + lum[rowNext + x + 1];

        const gy = 
          -lum[rowPrev + x - 1] - 2 * lum[rowPrev + x] - lum[rowPrev + x + 1]
          +lum[rowNext + x - 1] + 2 * lum[rowNext + x] + lum[rowNext + x + 1];

        edges[rowCur + x] = Math.min(255, (Math.abs(gx) + Math.abs(gy)) >> 3);
      }
    }

    return edges;
  }

  function _defringeAndFeatherAlpha(data, iw, ih, featherRadius = 2) {
    const fth = Math.max(1, Math.min(6, featherRadius || 2));
    const totalPixels = iw * ih;
    const newAlpha = new Uint8ClampedArray(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      newAlpha[i] = data[i * 4 + 3];
    }

    // 1. Defringing
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const idx = (y * iw + x) * 4;
        const a = data[idx + 3];
        if (a > 0 && a < 240) {
          let solidR = 0, solidG = 0, solidB = 0, solidCount = 0;
          for (let dy = -2; dy <= 2; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= ih) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= iw) continue;
              const nIdx = (ny * iw + nx) * 4;
              if (data[nIdx + 3] >= 240) {
                solidR += data[nIdx];
                solidG += data[nIdx + 1];
                solidB += data[nIdx + 2];
                solidCount++;
              }
            }
          }
          if (solidCount > 0) {
            data[idx]     = Math.round(solidR / solidCount);
            data[idx + 1] = Math.round(solidG / solidCount);
            data[idx + 2] = Math.round(solidB / solidCount);
          }
        }
      }
    }

    // 2. Alpha Feathering
    if (fth > 0) {
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          const pIdx = y * iw + x;
          const curA = data[pIdx * 4 + 3];
          let hasZero = false;
          let hasSolid = false;
          let sumA = 0;
          let count = 0;

          for (let dy = -fth; dy <= fth; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= ih) continue;
            for (let dx = -fth; dx <= fth; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= iw) continue;
              const val = data[(ny * iw + nx) * 4 + 3];
              if (val === 0) hasZero = true;
              if (val >= 250) hasSolid = true;
              sumA += val;
              count++;
            }
          }

          if (hasZero && hasSolid) {
            newAlpha[pIdx] = Math.round(sumA / count);
          } else if (hasZero && curA < 180) {
            newAlpha[pIdx] = Math.max(0, Math.round(curA * 0.35));
          } else {
            newAlpha[pIdx] = curA;
          }
        }
      }

      for (let i = 0; i < totalPixels; i++) {
        data[i * 4 + 3] = newAlpha[i];
      }
    }
  }

  function smartAutoCutout(img, options = {}) {
    const userTolerance = options.tolerance !== undefined ? options.tolerance : 30;
    const feather = options.feather || 2;
    const iw = img.naturalWidth || img.width || 1024;
    const ih = img.naturalHeight || img.height || 1024;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = iw;
    tmpCanvas.height = ih;
    const ctx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, iw, ih);

    // 0% tolerance = 100% исходное нетронутое фото
    if (userTolerance <= 0) {
      return tmpCanvas.toDataURL('image/png');
    }

    // 1. Устранение плашки водяного знака pollinations.ai (35px в правом нижнем углу)
    _cleanPollinationsWatermark(ctx, iw, ih);

    const imgData = ctx.getImageData(0, 0, iw, ih);
    const data = imgData.data;

    // 2. Анализ фона из гарантированных зон (верхние углы [0,0], [iw-1,0] и верхняя кромка)
    const bgInfo = _analyzeStudioBackground(data, iw, ih);

    // 3. Адаптивный порог толерантности (шкала 0..100 мапится в перцептивные 12..72 ед.)
    // По умолчанию 30% дает ~30.0 ед. (не задевает кожу ~109 и волосы ~240)
    const baseTol = (userTolerance / 100) * 60 + 12;
    const tolDist = baseTol + Math.min(10, bgInfo.stdDev * 1.2);
    const softTol = tolDist + 14;

    // 4. Детекция градиента контура (Sobel Edge Barrier)
    const edges = _computeEdgeMap(data, iw, ih);

    const visited = new Uint8Array(iw * ih);
    const queue = new Int32Array(iw * ih);
    let head = 0;
    let tail = 0;

    function pushQueue(x, y) {
      if (x < 0 || y < 0 || x >= iw || y >= ih) return;
      const idx = y * iw + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      queue[tail++] = idx;
    }

    // 5. Посев BFS: ТОЛЬКО верхняя кромка и верхняя четверть боковых сторон!
    // КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО сеять с нижней границы y=ih-1, где стоит человек!
    for (let x = 0; x < iw; x++) {
      const p0 = x * 4;
      const d0 = _minDistToBgSamples(data[p0], data[p0 + 1], data[p0 + 2], bgInfo.samples);
      if (d0 <= tolDist + 10) {
        pushQueue(x, 0);
      }
    }
    const maxSeedSideY = Math.floor(ih * 0.25);
    for (let y = 1; y < maxSeedSideY; y++) {
      const pLeft = (y * iw) * 4;
      const pRight = (y * iw + (iw - 1)) * 4;
      if (_minDistToBgSamples(data[pLeft], data[pLeft + 1], data[pLeft + 2], bgInfo.samples) <= tolDist + 10) {
        pushQueue(0, y);
      }
      if (_minDistToBgSamples(data[pRight], data[pRight + 1], data[pRight + 2], bgInfo.samples) <= tolDist + 10) {
        pushQueue(iw - 1, y);
      }
    }

    // 6. BFS Flood-Fill с защитой центрального ядра и контурным барьером Собеля
    while (head < tail) {
      const idx = queue[head++];
      const pi = idx * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];
      const dist = _minDistToBgSamples(r, g, b, bgInfo.samples);
      const edgeVal = edges[idx];

      const x = idx % iw;
      const y = Math.floor(idx / iw);

      // Защита центральной зоны (Center Core Protection: лицо, шея, плечи)
      const isCenterCore = (x > iw * 0.20 && x < iw * 0.80 && y > ih * 0.18);
      const effectiveTol = isCenterCore ? (tolDist * 0.72) : tolDist;
      const effectiveSoft = isCenterCore ? (softTol * 0.72) : softTol;

      // Контурный барьер Собеля: останавливает заливку на границах силуэта
      const isEdgeBarrier = (edgeVal > (isCenterCore ? 16 : 26)) && (dist > effectiveTol * 0.45);
      if (isEdgeBarrier) {
        continue;
      }

      if (dist <= effectiveTol) {
        data[pi + 3] = 0;
        pushQueue(x + 1, y);
        pushQueue(x - 1, y);
        pushQueue(x, y + 1);
        pushQueue(x, y - 1);
      } else if (dist <= effectiveSoft) {
        const alphaFactor = (dist - effectiveTol) / (effectiveSoft - effectiveTol);
        data[pi + 3] = Math.round(data[pi + 3] * alphaFactor);
      }
    }

    // 7. Сглаживание краев и дефринжинг
    _defringeAndFeatherAlpha(data, iw, ih, feather);

    ctx.putImageData(imgData, 0, 0);
    return tmpCanvas.toDataURL('image/png');
  }

  /* ══════════════════════════════════════════════════════════════
     ОЧИСТКА И ОБЕСПЕЧЕНИЕ 100% ПРОЗРАЧНОГО ФОНА SVG
     ══════════════════════════════════════════════════════════════ */
  function sanitizeAndExtractSvg(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Пустой ответ от нейросети');
    }

    let text = rawText.trim();
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
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
    if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Удаление фоновых прямоугольников
    svg = svg.replace(/<rect[^>]*width=["'](?:100%|100vw|100|200|300|400|500|800|1024)["'][^>]*height=["'](?:100%|100vh|100|200|300|400|500|800|1024)["'][^>]*fill=["'](?:#(?:[0-9a-fA-F]{3,8})|black|white|rgb\([^)]+\)|rgba\([^)]+\))["'][^>]*\/?>/gi, '');
    svg = svg.replace(/<rect[^>]*fill=["'](?:#(?:[0-9a-fA-F]{3,8})|black|white|rgb\([^)]+\))["'][^>]*width=["'](?:100%|100vw|100|200|300|400|500|800|1024)["'][^>]*height=["'](?:100%|100vh|100|200|300|400|500|800|1024)["'][^>]*\/?>/gi, '');
    svg = svg.replace(/(<svg[^>]*)\sstyle=["'][^"']*background[^"']*["']/gi, '$1');

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
     КЛИЕНТ xKiro LLM С КАСКАДНЫМ FALLBACK И УЧЕТОМ ТОКЕНОВ
     ══════════════════════════════════════════════════════════════ */
  async function callLlmCascade(systemPrompt, userPrompt, options = {}) {
    if (!tracker.canGenerate(CONFIG.MAX_TOKENS)) {
      const cd = tracker.getCountdown();
      throw new Error(`Превышен суточный лимит 1 000 000 токенов. Сброс лимита через ${cd.human}.`);
    }

    const onStatusUpdate = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    const abortSignal = options.signal || null;
    const errors = [];

    for (let i = 0; i < CONFIG.MODELS.length; i++) {
      const modelMeta = CONFIG.MODELS[i];
      const isFallback = (i > 0);

      onStatusUpdate({
        status: isFallback ? 'fallback' : 'requesting',
        model: modelMeta.id,
        modelName: modelMeta.name,
        attempt: i + 1,
        total: CONFIG.MODELS.length,
        message: isFallback 
          ? `Переключение на резервную модель ${modelMeta.name}...` 
          : `Запрос через ${modelMeta.name}...`
      });

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          timeoutController.abort(new Error(`Превышено время ожидания ответа (${CONFIG.REQUEST_TIMEOUT_MS / 1000}с)`));
        }, CONFIG.REQUEST_TIMEOUT_MS);

        const combinedSignal = abortSignal 
          ? (abortSignal.aborted ? abortSignal : timeoutController.signal) 
          : timeoutController.signal;

        if (abortSignal) {
          abortSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
        }

        let data = null;
        let lastErrText = '';

        // Попытка 1: через ai_proxy.php
        try {
          const proxyResp = await fetch(CONFIG.API_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelMeta.id,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: CONFIG.MAX_TOKENS,
              temperature: 0.4
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

        // Попытка 2: прямой запрос с ротацией 3 ключей
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
                    { role: 'user', content: userPrompt }
                  ],
                  max_tokens: CONFIG.MAX_TOKENS,
                  temperature: 0.4
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
          throw new Error('Пустой ответ от модели');
        }

        const usage = data.usage || {
          prompt_tokens: Math.round(userPrompt.length / 4) + 140,
          completion_tokens: Math.round(rawContent.length / 4),
          total_tokens: Math.round((userPrompt.length + rawContent.length) / 4) + 140
        };
        const totalTokens = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens);
        tracker.recordUsage(totalTokens, modelMeta.id, userPrompt);

        return {
          text: rawContent,
          model: modelMeta.id,
          modelName: modelMeta.name,
          usage: usage,
          totalTokens: totalTokens
        };

      } catch (err) {
        console.warn(`[Aurora AI Elements] Ошибка на модели ${modelMeta.id}:`, err);
        errors.push({ model: modelMeta.id, error: err.message || String(err) });

        if (abortSignal && abortSignal.aborted) {
          throw new Error('Генерация отменена пользователем');
        }

        if (i === CONFIG.MODELS.length - 1) {
          const detail = errors.map(e => `• ${e.model}: ${e.error}`).join('\n');
          throw new Error(`Все AI модели вернули сбой:\n${detail}`);
        }
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ПРОМПТ-ИНЖИНИРИНГ И РЕНДЕРИНГ ФОТО (FLUX + CUTOUT)
     ══════════════════════════════════════════════════════════════ */
  async function engineerPhotographicMasterPrompt(userPrompt, presetKey = 'studio', options = {}) {
    const preset = PHOTO_PRESETS[presetKey] || PHOTO_PRESETS.studio;

    const systemPrompt =
      "You are an elite photographic prompt engineer and director of photography.\n" +
      "Task: Transform the user's element request into a world-class, ultra-detailed English prompt for the FLUX.1 photorealistic image engine.\n" +
      "CRITICAL MANDATORY SPECIFICATIONS:\n" +
      "1. Pure isolated studio photography: The subject MUST be placed isolated on a pure seamless solid white studio background (pure #ffffff solid studio backdrop), perfectly lit with clean separation edges for background removal.\n" +
      "2. Camera & Optics: Shot on Hasselblad H6D-100c medium format camera, 100 megapixels, 85mm f/1.4 lens, ISO 64, 1/250s shutter.\n" +
      "3. Lighting: Professional 3-point studio lighting setup with soft key light, gentle fill, and crisp rim/edge lighting highlighting subject contours.\n" +
      "4. Render Quality: 8k UHD resolution, extreme photorealism, tactile surface textures, micro-details, sharp crisp borders, commercial product photography masterpiece.\n" +
      "5. NO distractions: NO background scenery, NO gradients, NO shadows touching the frame edges, NO floor texture, NO text, NO watermarks, NO cropped parts.\n" +
      "Output ONLY the raw English prompt string, without quotation marks, markdown backticks, or conversational text.";

    const promptText = `Create studio photo prompt for: "${userPrompt.trim()}". Style specifications: ${preset.prompt}. Output English prompt only.`;

    const res = await callLlmCascade(systemPrompt, promptText, options);
    let cleaned = res.text.replace(/^["'`]+|["'`]+$/g, '').trim();
    cleaned = cleaned.replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1').trim();

    return {
      masterPrompt: cleaned,
      model: res.model,
      modelName: res.modelName,
      usage: res.usage,
      totalTokens: res.totalTokens
    };
  }

  function renderFluxImage(masterPrompt) {
    return new Promise((resolve, reject) => {
      const seed = Math.floor(Math.random() * 10000000);
      const encoded = encodeURIComponent(masterPrompt);
      const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        img.src = '';
        reject(new Error('Превышено время ожидания FLUX фото-движка (45с)'));
      }, 45000);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        const proxyUrl = `ai_proxy.php?action=image_proxy&url=${encodeURIComponent(fluxUrl)}`;
        const pImg = new Image();
        pImg.crossOrigin = 'anonymous';
        pImg.onload = () => resolve(pImg);
        pImg.onerror = () => reject(new Error('Не удалось загрузить сгенерированное фото от FLUX фото-движка'));
        pImg.src = proxyUrl;
      };

      img.src = fluxUrl;
    });
  }

  async function generateAiPhoto(userPrompt, presetKey = 'studio', options = {}) {
    const onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};

    // 1. Промпт-инжиниринг через xKiro LLM
    onStatus({
      status: 'prompt_engineering',
      message: 'Промпт-инжиниринг xKiro LLM (Hasselblad 100MP, 85mm f/1.4, студийный свет)...'
    });

    const llmResult = await engineerPhotographicMasterPrompt(userPrompt, presetKey, options);

    // 2. Рендеринг через FLUX
    onStatus({
      status: 'flux_rendering',
      message: 'Рендеринг фото в FLUX 8K движке (1024x1024 photorealistic)...'
    });

    const rawImg = await renderFluxImage(llmResult.masterPrompt);

    // Сохранение исходного фото 8K (с интеллектуальным устранением водяного знака)
    let rawDataUrl = '';
    try {
      const c = document.createElement('canvas');
      const cw = rawImg.naturalWidth || rawImg.width || 1024;
      const ch = rawImg.naturalHeight || rawImg.height || 1024;
      c.width = cw;
      c.height = ch;
      const cctx = c.getContext('2d');
      cctx.drawImage(rawImg, 0, 0);
      _cleanPollinationsWatermark(cctx, cw, ch);
      rawDataUrl = c.toDataURL('image/jpeg', 0.95);
    } catch (e) {
      rawDataUrl = rawImg.src;
    }

    // 3. Smart Auto Cutout 2.0 на 100% прозрачный фон
    onStatus({
      status: 'smart_cutout',
      message: 'Smart Auto Cutout 2.0: Sobel Barrier + Core Protection + Alpha Feathering...'
    });

    const userTol = (typeof options.tolerance === 'number') ? options.tolerance : 30;
    const transparentPngUrl = smartAutoCutout(rawImg, { tolerance: userTol, feather: 2 });

    // Сохранение в историю сессии
    saveToRecentHistory({
      type: 'raster',
      dataUrl: transparentPngUrl,
      cutoutDataUrl: transparentPngUrl,
      rawDataUrl: rawDataUrl,
      prompt: userPrompt,
      presetKey,
      modelName: llmResult.modelName
    });

    onStatus({
      status: 'success',
      message: `Фотография 8K успешно создана! (Токены: ${llmResult.totalTokens})`
    });

    return {
      type: 'raster',
      dataUrl: transparentPngUrl,
      cutoutDataUrl: transparentPngUrl,
      rawDataUrl: rawDataUrl,
      rawImg: rawImg,
      tolerance: 30,
      prompt: userPrompt,
      masterPrompt: llmResult.masterPrompt,
      model: llmResult.model,
      modelName: llmResult.modelName,
      usage: llmResult.usage,
      totalTokens: llmResult.totalTokens
    };
  }

  /* ══════════════════════════════════════════════════════════════
     ГЕНЕРАЦИЯ ВЕКТОРНОГО SVG
     ══════════════════════════════════════════════════════════════ */
  async function generateAiVectorElement(userPrompt, styleKey = 'neon', options = {}) {
    const onStatusUpdate = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    const style = STYLE_MODIFIERS[styleKey] || STYLE_MODIFIERS.neon;

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

    const res = await callLlmCascade(systemPrompt, promptText, options);

    onStatusUpdate({
      status: 'processing',
      model: res.model,
      modelName: res.modelName,
      message: 'Проверка прозрачности и сборка векторных слоёв...'
    });

    const cleanSvg = sanitizeAndExtractSvg(res.text);

    saveToRecentHistory({
      type: 'vector',
      svg: cleanSvg,
      prompt: userPrompt,
      styleKey,
      modelName: res.modelName
    });

    onStatusUpdate({
      status: 'success',
      model: res.model,
      modelName: res.modelName,
      usage: res.usage,
      message: `Векторный элемент создан (${res.totalTokens} токенов)!`
    });

    return {
      type: 'vector',
      svg: cleanSvg,
      prompt: userPrompt,
      model: res.model,
      modelName: res.modelName,
      usage: res.usage,
      totalTokens: res.totalTokens
    };
  }

  // Общая точка входа: SVG или Растр
  async function generateAiElement(userPrompt, styleOrPreset = 'studio', options = {}) {
    if (options.mode === 'raster') {
      return generateAiPhoto(userPrompt, styleOrPreset, options);
    }
    return generateAiVectorElement(userPrompt, styleOrPreset, options);
  }

  /* ══════════════════════════════════════════════════════════════
     ИНТЕГРАЦИЯ В ХОЛСТ FABRIC.JS (СЛОИ И ЦЕНТРИРОВАНИЕ)
     ══════════════════════════════════════════════════════════════ */
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
        const ptX = (screenCenterX - vpt[4]) / (vpt[0] || 1);
        const ptY = (screenCenterY - vpt[5]) / (vpt[3] || 1);

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

          const group = fabric.util.groupSVGElements(objects, opts);
          if (!group) {
            return reject(new Error('Сбой группировки элементов SVG'));
          }

          const dims = (typeof window.getArtboardDimensions === 'function')
            ? window.getArtboardDimensions(canvasInst)
            : { w: (window.currentSize?.w || 595), h: (window.currentSize?.h || 842) };

          const origW = group.width || 200;
          const origH = group.height || 200;
          const maxDim = Math.max(origW, origH, 1);
          const targetSize = Math.min(Math.min(dims.w, dims.h) * 0.34, CONFIG.DEFAULT_SIZE);
          const scale = targetSize / maxDim;

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

          group.__isAiElement = true;
          group.__aiPrompt = options.prompt || 'AI Sticker';
          group.__aiSvg = svgText;
          group.name = options.prompt ? `AI: ${options.prompt.slice(0, 20)}` : 'AI Стикер';

          canvasInst.add(group);
          canvasInst.setActiveObject(group);
          canvasInst.requestRenderAll ? canvasInst.requestRenderAll() : canvasInst.renderAll();

          // ── Анимация исчезает ровно в момент попадания на холст ──
          hideAuroraLoader();

          if (typeof window.saveHistory === 'function') window.saveHistory();
          if (typeof window.updateLayersList === 'function') window.updateLayersList();
          if (typeof window.toast === 'function') window.toast('✨ AI вектор добавлен на холст!');

          resolve(group);
        } catch (err) {
          hideAuroraLoader();
          reject(err);
        }
      });
    });
  }

  function addPhotoImageElementToCanvas(transparentDataUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const canvasInst = options.canvas || window.canvas;
      if (!canvasInst) {
        return reject(new Error('Холст афиши не инициализирован. Выберите шаблон.'));
      }

      if (typeof fabric === 'undefined' || !fabric.Image) {
        return reject(new Error('Библиотека Fabric.js не найдена на странице'));
      }

      fabric.Image.fromURL(transparentDataUrl, fabricImg => {
        try {
          if (!fabricImg || !fabricImg.width) {
            return reject(new Error('Не удалось создать fabric.Image из вырезанной фотографии'));
          }

          const dims = (typeof window.getArtboardDimensions === 'function')
            ? window.getArtboardDimensions(canvasInst)
            : { w: (window.currentSize?.w || 595), h: (window.currentSize?.h || 842) };

          const origW = fabricImg.width || 1024;
          const origH = fabricImg.height || 1024;
          const maxDim = Math.max(origW, origH, 1);

          // Целевой размер фото на холсте (~38% от меньшей стороны листа, max 340px)
          const targetSize = Math.min(Math.min(dims.w, dims.h) * 0.38, 340);
          const scale = targetSize / maxDim;

          const center = getVisibleViewportCenter(canvasInst);
          const promptText = options.prompt || 'Студийное фото';
          const layerTitle = `[AI Photo] ${promptText.slice(0, 24)}`;

          fabricImg.set({
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

          fabricImg.isAiElement = true;
          fabricImg.__isAiElement = true;
          fabricImg.isAiPhoto = true;
          fabricImg.__isAiPhoto = true;
          fabricImg.aiType = 'photo';
          fabricImg.aiPrompt = promptText;
          fabricImg.__aiPrompt = promptText;
          fabricImg.name = layerTitle;
          fabricImg.layerName = layerTitle;

          // Поддержка скругления углов (options.cornerRadius или options.radius)
          const cornerRad = options.cornerRadius !== undefined ? options.cornerRadius : options.radius;
          if (typeof cornerRad === 'number' && cornerRad > 0 && typeof window.setImageCornerRadius === 'function') {
            window.setImageCornerRadius(fabricImg, cornerRad, true);
          }

          canvasInst.add(fabricImg);
          canvasInst.setActiveObject(fabricImg);
          canvasInst.requestRenderAll ? canvasInst.requestRenderAll() : canvasInst.renderAll();

          // ── Плавное исчезновение кружка Авроры ровно в момент попадания фото на холст ──
          hideAuroraLoader();

          if (typeof window.saveHistory === 'function') window.saveHistory();
          if (typeof window.updateLayersList === 'function') window.updateLayersList();
          if (typeof window.toast === 'function') window.toast(`📸 ${layerTitle} добавлено на холст!`);

          resolve(fabricImg);
        } catch (err) {
          hideAuroraLoader();
          reject(err);
        }
      }, { crossOrigin: 'anonymous' });
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

  function saveToRecentHistory(item) {
    try {
      const history = getRecentHistory();
      history.unshift({
        id: 'ai_' + Date.now(),
        timestamp: Date.now(),
        ...item
      });
      safeSetItem(CONFIG.HISTORY_KEY, JSON.stringify(history.slice(0, 16)));
    } catch (e) {
      // ignore
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
    const btnGenerateLabel = document.getElementById('btn-ai-generate-label');
    const btnInsert = document.getElementById('btn-ai-insert-canvas');
    const btnInsertLabel = document.getElementById('btn-ai-insert-label');
    const btnCancel = document.getElementById('btn-ai-cancel');
    const previewContainer = document.getElementById('ai-svg-preview-box');
    const statusText = document.getElementById('ai-status-text');
    const statusPill = document.getElementById('ai-status-pill');
    const tokenBadge = document.getElementById('ai-tokens-badge');
    const tokenProgress = document.getElementById('ai-token-bar-fill');
    const tokenCountdown = document.getElementById('ai-token-countdown');
    const chipsContainer = document.getElementById('ai-prompt-chips');
    const historyStrip = document.getElementById('ai-recent-strip');
    const tabRaster = document.getElementById('tab-ai-mode-raster');
    const tabVector = document.getElementById('tab-ai-mode-vector');
    const groupPhotoPresets = document.getElementById('group-photo-presets');
    const groupVectorStyles = document.getElementById('group-vector-styles');
    const promptLabelText = document.getElementById('ai-prompt-label-text');
    const photoPresetCards = document.querySelectorAll('.ai-preset-card');
    const styleChips = document.querySelectorAll('.ai-style-chip');

    // Контролы режимов фона и слайдера чувствительности
    const btnBgCutout = document.getElementById('btn-bg-mode-cutout');
    const btnBgOriginal = document.getElementById('btn-bg-mode-original');
    const previewCardWrap = document.getElementById('ai-preview-card-wrap');
    const transpBadge = document.getElementById('ai-transp-badge');
    const transpBadgeTitle = document.getElementById('ai-transp-badge-title');
    const transpBadgeSub = document.getElementById('ai-transp-badge-sub');
    const transpBadgeIcon = document.getElementById('ai-transp-badge-icon');
    const cutoutPanel = document.getElementById('ai-cutout-controls-panel');
    const cutoutSlider = document.getElementById('ai-cutout-tolerance-slider');
    const cutoutValBadge = document.getElementById('ai-cutout-val-badge');
    const btnCutoutReset = document.getElementById('btn-ai-cutout-reset');
    const bgModeSwitcher = document.getElementById('ai-bg-mode-switcher');

    let currentMode = 'raster'; // 'raster' | 'vector'
    let currentPhotoPreset = 'studio';
    let currentVectorStyle = 'neon';
    let currentBgMode = 'cutout'; // 'cutout' | 'original'
    let currentCutoutTolerance = 30; // 0..100%
    let currentResult = null; // { type: 'raster'|'vector', dataUrl?: string, cutoutDataUrl?: string, rawDataUrl?: string, rawImg?: any, svg?: string, prompt: string }

    // 0. Функция переключения фона: Прозрачный фон (Cutout) vs Исходное фото (8K)
    function updateBgModeUI(mode) {
      currentBgMode = mode;
      const isCutout = (mode === 'cutout');

      if (btnBgCutout) {
        btnBgCutout.classList.toggle('is-active', isCutout);
        btnBgCutout.setAttribute('aria-checked', isCutout);
      }
      if (btnBgOriginal) {
        btnBgOriginal.classList.toggle('is-active', !isCutout);
        btnBgOriginal.setAttribute('aria-checked', !isCutout);
      }

      if (previewCardWrap) {
        previewCardWrap.classList.toggle('mode-original', !isCutout);
      }

      if (transpBadge) {
        transpBadge.classList.toggle('is-cutout', isCutout);
        transpBadge.classList.toggle('is-original', !isCutout);
      }
      if (transpBadgeTitle) {
        transpBadgeTitle.textContent = isCutout ? '100% Alpha Cutout' : 'Full 8K Photo';
      }
      if (transpBadgeSub) {
        transpBadgeSub.textContent = isCutout ? 'Чистый Alpha-канал без артефактов' : 'Исходный студийный кадр без вырезания';
      }
      if (transpBadgeIcon) {
        transpBadgeIcon.textContent = isCutout ? '✓' : '🖼️';
      }

      if (cutoutPanel) {
        cutoutPanel.classList.toggle('is-hidden', !isCutout);
      }

      if (btnInsertLabel) {
        btnInsertLabel.textContent = isCutout
          ? 'Вставить вырезанный объект на холст'
          : 'Вставить исходное фото 8K на холст';
      }

      // Если в памяти есть сгенерированный результат — мгновенно перерисовываем превью
      if (currentResult && currentResult.type === 'raster') {
        const targetUrl = isCutout
          ? (currentResult.cutoutDataUrl || currentResult.dataUrl)
          : (currentResult.rawDataUrl || currentResult.dataUrl);
        currentResult.dataUrl = targetUrl;
        setPreviewRaster(targetUrl);
      }
    }

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
    function renderPromptChips() {
      if (!chipsContainer) return;
      const presets = currentMode === 'raster' ? PHOTO_PROMPT_PRESETS : PROMPT_PRESETS;
      chipsContainer.innerHTML = presets.map(p => `
        <button type="button" class="ai-chip-btn" data-prompt="${encodeURIComponent(p.prompt)}" data-preset="${p.preset || p.style || ''}">
          ${p.label}
        </button>
      `).join('');
    }

    if (chipsContainer) {
      chipsContainer.addEventListener('click', e => {
        const btn = e.target.closest('.ai-chip-btn');
        if (!btn) return;
        const p = decodeURIComponent(btn.dataset.prompt);
        const preset = btn.dataset.preset;
        if (promptInput) promptInput.value = p;

        if (currentMode === 'raster' && preset) {
          selectPhotoPreset(preset);
        } else if (currentMode === 'vector' && preset) {
          selectVectorStyle(preset);
        }

        if (promptInput) promptInput.focus();
      });
    }

    // 3. Переключение режимов Фото (Растр 8K) vs Вектор (SVG)
    function setMode(mode) {
      currentMode = mode;
      if (tabRaster) {
        tabRaster.classList.toggle('is-active', mode === 'raster');
        tabRaster.setAttribute('aria-selected', mode === 'raster');
      }
      if (tabVector) {
        tabVector.classList.toggle('is-active', mode === 'vector');
        tabVector.setAttribute('aria-selected', mode === 'vector');
      }

      if (mode === 'raster') {
        groupPhotoPresets?.classList.remove('hidden');
        groupVectorStyles?.classList.add('hidden');
        bgModeSwitcher?.classList.remove('hidden');
        updateBgModeUI(currentBgMode);
        if (btnGenerateLabel) btnGenerateLabel.textContent = 'Сгенерировать Студийное Фото 8K';
        if (promptLabelText) promptLabelText.textContent = 'Описание объекта для студийной съемки (Растр 8K)';
        if (promptInput && (!promptInput.value || promptInput.value.includes('стрелка') || promptInput.value.includes('штамп'))) {
          promptInput.placeholder = 'Например: Сочное рубиновое яблоко с капельками росы или античный бронзовый подсвечник...';
        }
      } else {
        groupPhotoPresets?.classList.add('hidden');
        groupVectorStyles?.classList.remove('hidden');
        bgModeSwitcher?.classList.add('hidden');
        cutoutPanel?.classList.add('is-hidden');
        if (previewCardWrap) previewCardWrap.classList.remove('mode-original');
        if (transpBadge) {
          transpBadge.classList.add('is-cutout');
          transpBadge.classList.remove('is-original');
        }
        if (transpBadgeTitle) transpBadgeTitle.textContent = '100% Vector SVG';
        if (transpBadgeSub) transpBadgeSub.textContent = 'Векторные кривые без растровых артефактов';
        if (transpBadgeIcon) transpBadgeIcon.textContent = '✓';
        if (btnInsertLabel) btnInsertLabel.textContent = 'Вставить векторный элемент на холст';
        if (btnGenerateLabel) btnGenerateLabel.textContent = 'Сгенерировать Векторный SVG';
        if (promptLabelText) promptLabelText.textContent = 'Описание векторного элемента / стикера';
        if (promptInput && (!promptInput.value || promptInput.value.includes('яблоко') || promptInput.value.includes('наушники'))) {
          promptInput.placeholder = 'Например: Неоновая золотая стрелка с кибер-градиентом или библиотечный винтажный штамп...';
        }
      }

      renderPromptChips();
    }

    tabRaster?.addEventListener('click', () => setMode('raster'));
    tabVector?.addEventListener('click', () => setMode('vector'));

    // Привязка кнопок тумблера режимов фона
    btnBgCutout?.addEventListener('click', () => updateBgModeUI('cutout'));
    btnBgOriginal?.addEventListener('click', () => updateBgModeUI('original'));

    // Привязка слайдера чувствительности вырезания (мгновенный live-recalculate с дебаунсом)
    let cutoutRecalcTimer = null;
    if (cutoutSlider) {
      cutoutSlider.addEventListener('input', () => {
        const val = parseInt(cutoutSlider.value, 10);
        currentCutoutTolerance = val;
        if (cutoutValBadge) cutoutValBadge.textContent = `${val}%`;

        if (currentResult && currentResult.type === 'raster') {
          const sourceImg = currentResult.rawImg;
          if (sourceImg) {
            clearTimeout(cutoutRecalcTimer);
            cutoutRecalcTimer = setTimeout(() => {
              try {
                const newCutout = smartAutoCutout(sourceImg, { tolerance: val, feather: 2 });
                currentResult.cutoutDataUrl = newCutout;
                if (currentBgMode === 'cutout') {
                  currentResult.dataUrl = newCutout;
                  setPreviewRaster(newCutout);
                }
                if (statusText) statusText.textContent = `Порог вырезания: ${val}% (пересчитан на лету)`;
              } catch (err) {
                console.warn('Live cutout recalculation error:', err);
              }
            }, 35);
          }
        }
      });
    }

    // Привязка кнопки сброса на исходное фото
    if (btnCutoutReset) {
      btnCutoutReset.addEventListener('click', () => {
        updateBgModeUI('original');
        if (typeof window.toast === 'function') {
          window.toast('Переключено на исходное 8K фото без вырезания');
        }
      });
    }

    // 4. Выбор фото-пресетов
    function selectPhotoPreset(key) {
      currentPhotoPreset = key;
      photoPresetCards.forEach(c => {
        c.classList.toggle('is-active', c.dataset.preset === key);
      });
    }

    photoPresetCards.forEach(card => {
      card.addEventListener('click', () => {
        selectPhotoPreset(card.dataset.preset);
      });
    });

    // 5. Выбор векторного стиля
    function selectVectorStyle(key) {
      currentVectorStyle = key;
      styleChips.forEach(c => {
        c.classList.toggle('is-active', c.dataset.style === key);
      });
    }

    styleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        selectVectorStyle(chip.dataset.style);
      });
    });

    // 6. Отрисовка недавних генераций
    function renderHistory() {
      if (!historyStrip) return;
      const list = getRecentHistory();
      if (!list.length) {
        historyStrip.innerHTML = '<span class="ai-history-empty">История пуста. Сгенерируйте первое изображение!</span>';
        return;
      }
      historyStrip.innerHTML = list.map(item => `
        <div class="ai-history-thumb" data-id="${item.id}" title="${escapeHtml(item.prompt)}">
          <div class="ai-thumb-inner">
            ${item.type === 'raster' 
              ? `<img src="${item.dataUrl}" style="width:100%;height:100%;object-fit:contain;" alt="Photo">` 
              : (item.svg || '<span class="material-symbols-rounded">category</span>')}
          </div>
          <span class="ai-thumb-label">${escapeHtml((item.prompt || '').slice(0, 16))}...</span>
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
          currentResult = item;
          if (item.type === 'raster') {
            setMode('raster');
            const activeUrl = (currentBgMode === 'cutout') ? (item.cutoutDataUrl || item.dataUrl) : (item.rawDataUrl || item.dataUrl);
            currentResult.dataUrl = activeUrl;
            setPreviewRaster(activeUrl);
            updateBgModeUI(currentBgMode);
          } else {
            setMode('vector');
            setPreviewSvg(item.svg);
          }
          if (btnInsert) btnInsert.disabled = false;
          if (statusText) statusText.textContent = `Загружен из истории: "${item.prompt}"`;
        }
      });
    }

    // 7. Управление превью
    function setPreviewSvg(svgStr) {
      if (!previewContainer) return;
      if (!svgStr) {
        previewContainer.innerHTML = `
          <div class="ai-preview-placeholder">
            <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.35;">draw</span>
            <p>Здесь появится векторный элемент на 100% прозрачном фоне</p>
          </div>
        `;
        if (btnInsert) btnInsert.disabled = true;
        return;
      }
      previewContainer.innerHTML = svgStr;
      if (btnInsert) btnInsert.disabled = false;
    }

    function setPreviewRaster(imgDataUrl) {
      if (!previewContainer) return;
      if (!imgDataUrl) {
        previewContainer.innerHTML = `
          <div class="ai-preview-placeholder">
            <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.35;">photo_camera</span>
            <p>Здесь появится студийная фотография 8K</p>
          </div>
        `;
        if (btnInsert) btnInsert.disabled = true;
        return;
      }
      const isCutout = (currentBgMode === 'cutout');
      const shadowClass = isCutout ? 'is-cutout-shadow' : '';
      previewContainer.innerHTML = `
        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:12px;">
          <img src="${imgDataUrl}" class="ai-raster-preview-img ${shadowClass}" alt="8K Photo Preview">
        </div>
      `;
      if (btnInsert) btnInsert.disabled = false;
    }

    // 8. Запуск генерации
    async function doGenerate() {
      const val = promptInput ? promptInput.value.trim() : '';
      if (!val) {
        if (typeof window.toast === 'function') window.toast('Введите описание элемента для генерации');
        if (promptInput) promptInput.focus();
        return;
      }

      if (btnGenerate) btnGenerate.disabled = true;
      if (btnCancel) btnCancel.classList.remove('hidden');
      if (statusPill) statusPill.className = 'ai-status-pill is-loading';
      if (statusText) statusText.textContent = 'Инициализация AI генерации...';

      const isRaster = (currentMode === 'raster');
      const loaderTitle = isRaster
        ? 'Нейросеть создаёт студийное фото 8K...'
        : 'Нейросеть генерирует векторный SVG...';
      const loaderSub = isRaster
        ? 'Hasselblad 100MP · FLUX Рендеринг · 100% Transparent Cutout'
        : 'Создание векторных слоёв на 100% прозрачном фоне';

      showAuroraLoader(loaderTitle, loaderSub);
      activeAbortController = new AbortController();

      try {
        let res = null;

        if (isRaster) {
          res = await generateAiPhoto(val, currentPhotoPreset, {
            tolerance: currentCutoutTolerance,
            signal: activeAbortController.signal,
            onStatus: info => {
              if (statusText) statusText.textContent = info.message;
            }
          });
          currentResult = res;
          const activeUrl = (currentBgMode === 'cutout') ? (res.cutoutDataUrl || res.dataUrl) : (res.rawDataUrl || res.dataUrl);
          res.dataUrl = activeUrl;
          setPreviewRaster(activeUrl);
          updateBgModeUI(currentBgMode);
        } else {
          res = await generateAiVectorElement(val, currentVectorStyle, {
            signal: activeAbortController.signal,
            onStatus: info => {
              if (statusText) statusText.textContent = info.message;
            }
          });
          currentResult = res;
          setPreviewSvg(res.svg);
        }

        renderHistory();

        if (statusPill) statusPill.className = 'ai-status-pill is-success';
        if (statusText) {
          statusText.textContent = `Готово! Модель: ${res.modelName} · Токены: ${res.totalTokens}`;
        }

        // Автоматическая подстановка на холст при чекбоксе авто-вставки
        const chkAuto = document.getElementById('ai-chk-auto-insert');
        if (chkAuto && chkAuto.checked) {
          if (res.type === 'raster') {
            const isCutout = (currentBgMode === 'cutout');
            await addPhotoImageElementToCanvas(res.dataUrl, { 
              prompt: val,
              isCutout: isCutout,
              cornerRadius: isCutout ? 0 : 16
            });
          } else {
            await addSvgElementToCanvas(res.svg, { prompt: val });
          }
          closeModal();
        }

      } catch (err) {
        hideAuroraLoader();
        if (statusPill) statusPill.className = 'ai-status-pill is-error';
        if (statusText) statusText.textContent = `Ошибка: ${err.message}`;
        if (typeof window.toast === 'function') window.toast(`Сбой: ${err.message}`);
      } finally {
        if (btnGenerate) btnGenerate.disabled = false;
        if (btnCancel) btnCancel.classList.add('hidden');
        activeAbortController = null;
        const chkAuto = document.getElementById('ai-chk-auto-insert');
        if (!chkAuto || !chkAuto.checked || !currentResult) {
          hideAuroraLoader();
        }
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
          if (statusText) statusText.textContent = 'Генерация отменена пользователем';
        }
        hideAuroraLoader();
      });
    }

    // 9. Ручная вставка на холст
    if (btnInsert) {
      btnInsert.addEventListener('click', async () => {
        if (!currentResult) return;
        try {
          const val = promptInput ? promptInput.value.trim() : currentResult.prompt;
          if (currentResult.type === 'raster') {
            const isCutout = (currentBgMode === 'cutout');
            await addPhotoImageElementToCanvas(currentResult.dataUrl, { 
              prompt: val,
              isCutout: isCutout,
              cornerRadius: isCutout ? 0 : 16
            });
          } else {
            await addSvgElementToCanvas(currentResult.svg, { prompt: val });
          }
          hideAuroraLoader();
          closeModal();
        } catch (err) {
          hideAuroraLoader();
          if (typeof window.toast === 'function') window.toast(err.message);
        }
      });
    }

    function openModal() {
      modalOverlay.classList.remove('hidden');
      renderHistory();
      renderPromptChips();
      if (promptInput) promptInput.focus();
    }

    function closeModal() {
      modalOverlay.classList.add('hidden');
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      hideAuroraLoader();
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

    window.openAiGeneratorModal = openModal;
    window.openAiElementModal = openModal;

    // Первичная инициализация чипсов
    renderPromptChips();
  }

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
  if (typeof window !== 'undefined') {
    window.addPhotoImageElementToCanvas = addPhotoImageElementToCanvas;
    window.addPhotoElementToCanvas = addPhotoImageElementToCanvas;
  }

  return {
    generateAiElement,
    generateAiPhoto,
    generateAiVectorElement,
    engineerPhotographicMasterPrompt,
    smartAutoCutout,
    addPhotoImageElementToCanvas,
    addPhotoElementToCanvas: addPhotoImageElementToCanvas,
    addSvgElementToCanvas,
    sanitizeAndExtractSvg,
    getVisibleViewportCenter,
    showAuroraLoader,
    hideAuroraLoader,
    openAiGeneratorModal: () => {
      if (typeof window.openAiGeneratorModal === 'function') window.openAiGeneratorModal();
    },
    tracker,
    CONFIG,
    PHOTO_PRESETS,
    PHOTO_PROMPT_PRESETS,
    STYLE_MODIFIERS,
    PROMPT_PRESETS,
    getRecentHistory
  };
});
