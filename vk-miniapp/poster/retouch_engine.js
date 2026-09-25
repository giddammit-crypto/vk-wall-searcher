/**
 * ===================================================================
 * AURORA DESIGN — INSTAGRAM PRO RETOUCH & COLOR GRADE ENGINE
 * Файл: vk-miniapp/poster/retouch_engine.js
 * 
 * Архитектура модуля:
 * 1. 12 Ультра-стильных современных пресетов кинематографичной ретуши:
 *    - Warm Glow, Vintage Portra, Cyber Neon, Moody Noir,
 *      Bloom Soft, Sunset Hour, Editorial Cold, Pastel Pop,
 *      Hyper Sharp HDR, Duotone, Boho Earth, Deep Amethyst.
 * 2. Fabric.js Image Filters & Canvas Tone Grading:
 *    - ColorMatrix, Convolve (Convolution 3x3), Brightness, Contrast,
 *      Saturation, HueRotation, BlendColor.
 *    - Глобальное тоновое отображение и сведение афиши в единую гамму.
 *    - Плавный слайдер интенсивности эффекта (0% — 100%).
 * 3. Instagram Multi-Format Export Core:
 *    - 1:1 Квадрат (1080 × 1080) — лента и карусели
 *    - 4:5 Вертикальный портрет (1080 × 1350) — максимальный охват ленты
 *    - 9:16 Stories / Reels / Клипы (1080 × 1920) — полноэкранный формат
 *    - 3 режима кадрирования: Кинематографичный размытый фон (Smart Blur),
 *      Цветной фон макета (Matched Border), Заполнение без полей (Cover Crop).
 * 4. Интерактивное модальное окно сравнения «До / После» и мгновенный экспорт.
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
    root.AuroraRetouchEngine = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.AuroraRetouchEngine = exportsObj;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     КОНСТАНТЫ ФОРМАТОВ INSTAGRAM
     ══════════════════════════════════════════════════════════════ */
  const INSTAGRAM_FORMATS = {
    square: {
      id: 'square',
      name: '1:1 Квадрат',
      ratioLabel: '1:1',
      width: 1080,
      height: 1080,
      desc: 'Пост и карусель в ленту (1080 × 1080)'
    },
    portrait: {
      id: 'portrait',
      name: '4:5 Портрет (PRO)',
      ratioLabel: '4:5',
      width: 1080,
      height: 1350,
      desc: 'Максимальная высота в ленте Instagram (1080 × 1350)'
    },
    story: {
      id: 'story',
      name: '9:16 Stories / Reels',
      ratioLabel: '9:16',
      width: 1080,
      height: 1920,
      desc: 'Сторис, Reels, VK Клипы, Shorts (1080 × 1920)'
    },
    original: {
      id: 'original',
      name: 'Оригинал листа',
      ratioLabel: 'Auto',
      width: null,
      height: null,
      desc: 'Сохранение исходных пропорций макета'
    }
  };

  /* ══════════════════════════════════════════════════════════════
     12 УЛЬТРА-СТИЛЬНЫХ ПРЕСЕТОВ РЕТУШИ И ГРЕЙДИНГА
     ══════════════════════════════════════════════════════════════ */
  const RETOUCH_PRESETS = {
    warm_glow: {
      id: 'warm_glow',
      name: 'Warm Glow',
      badge: 'Golden Light',
      desc: 'Тёплое золотистое свечение, мягкие тени и аналоговое солнечное тепло.',
      colorSwatch: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      brightness: 0.05,
      contrast: 0.12,
      saturation: 0.18,
      temperature: 24,
      shadowLift: 0.20,
      bloom: 0.15,
      colorMatrix: [
        1.14, 0.04, 0.00, 0, 0.05,
        0.02, 1.06, 0.00, 0, 0.02,
        0.00, 0.02, 0.88, 0, -0.04,
        0,    0,    0,    1, 0
      ],
      blendColor: '#f59e0b',
      blendAlpha: 0.14,
      blendMode: 'soft-light'
    },

    vintage_portra: {
      id: 'vintage_portra',
      name: 'Vintage Portra',
      badge: 'Kodak Film',
      desc: 'Легендарный плёночный тон: пастельные зелёные, матовые тени и чистые светлые зоны.',
      colorSwatch: 'linear-gradient(135deg, #d97706, #475569)',
      brightness: 0.03,
      contrast: 0.06,
      saturation: -0.08,
      temperature: 12,
      shadowLift: 0.18,
      filmGrain: 0.15,
      blackPointLift: 14,
      colorMatrix: [
        1.08, 0.06, -0.02, 0, 0.05,
        0.01, 1.03,  0.02, 0, 0.03,
        -0.04, 0.02, 0.90, 0, 0.07,
        0,     0,    0,    1, 0
      ],
      blendColor: '#fbbf24',
      blendAlpha: 0.10,
      blendMode: 'overlay'
    },

    cyber_neon: {
      id: 'cyber_neon',
      name: 'Cyber Neon',
      badge: 'Synthwave',
      desc: 'Электрический сплит-тонинг: неоновый циановый холод в тенях и горячая фуксия в светах.',
      colorSwatch: 'linear-gradient(135deg, #00f0ff, #ff007f)',
      brightness: 0.04,
      contrast: 0.32,
      saturation: 0.45,
      temperature: -18,
      sharpen: 0.35,
      colorMatrix: [
        1.28, -0.10, 0.14, 0, 0.03,
        -0.10, 1.18, -0.06, 0, -0.02,
        0.12, -0.12, 1.40, 0, 0.06,
        0,     0,     0,    1, 0
      ],
      convolve: [
         0,   -0.35,  0,
        -0.35, 2.4,  -0.35,
         0,   -0.35,  0
      ],
      blendColor: '#00f0ff',
      blendAlpha: 0.18,
      blendMode: 'overlay'
    },

    moody_noir: {
      id: 'moody_noir',
      name: 'Moody Noir',
      badge: 'Silver Drama',
      desc: 'Глубокий кинематографичный монохром с серебряным сиянием и бархатными тенями.',
      colorSwatch: 'linear-gradient(135deg, #0f172a, #94a3b8)',
      brightness: -0.04,
      contrast: 0.36,
      saturation: -1.0,
      temperature: -5,
      sharpen: 0.30,
      colorMatrix: [
        0.32, 0.56, 0.12, 0, 0.02,
        0.32, 0.56, 0.12, 0, 0.02,
        0.32, 0.56, 0.12, 0, 0.02,
        0,    0,    0,    1, 0
      ],
      blendColor: '#1e293b',
      blendAlpha: 0.25,
      blendMode: 'multiply'
    },

    bloom_soft: {
      id: 'bloom_soft',
      name: 'Bloom Soft',
      badge: 'Dream Glow',
      desc: 'Диффузное романтическое свечение, мягкий фокус контуров и мечтательная атмосфера.',
      colorSwatch: 'linear-gradient(135deg, #f472b6, #c084fc)',
      brightness: 0.09,
      contrast: -0.08,
      saturation: 0.14,
      temperature: 8,
      bloom: 0.35,
      convolve: [
        1/16, 2/16, 1/16,
        2/16, 4/16, 2/16,
        1/16, 2/16, 1/16
      ],
      colorMatrix: [
        1.05, 0.04, 0.02, 0, 0.06,
        0.02, 1.05, 0.02, 0, 0.06,
        0.02, 0.02, 1.08, 0, 0.08,
        0,    0,    0,    1, 0
      ],
      blendColor: '#fbcfe8',
      blendAlpha: 0.20,
      blendMode: 'screen'
    },

    sunset_hour: {
      id: 'sunset_hour',
      name: 'Sunset Hour',
      badge: 'Magic Dusk',
      desc: 'Магия заката: градиент от пламенного янтаря до глубоких сумеречных фиолетовых тонов.',
      colorSwatch: 'linear-gradient(135deg, #ff7e40, #9333ea)',
      brightness: 0.06,
      contrast: 0.18,
      saturation: 0.30,
      temperature: 30,
      colorMatrix: [
        1.25, 0.08, -0.06, 0, 0.08,
        0.02, 1.02,  0.02, 0, 0.02,
        -0.08, -0.02, 1.20, 0, -0.02,
        0,     0,     0,    1, 0
      ],
      blendColor: '#ea580c',
      blendAlpha: 0.16,
      blendMode: 'soft-light'
    },

    editorial_cold: {
      id: 'editorial_cold',
      name: 'Editorial Cold',
      badge: 'Vogue Luxe',
      desc: 'Глянцевый холодный журнал: кристальные белые, холодные тени и прецизионная резкость.',
      colorSwatch: 'linear-gradient(135deg, #38bdf8, #1e3a8a)',
      brightness: 0.02,
      contrast: 0.24,
      saturation: -0.15,
      temperature: -25,
      sharpen: 0.40,
      colorMatrix: [
        0.92, 0.02, 0.03, 0, -0.02,
        0.02, 1.02, 0.04, 0,  0.01,
        0.05, 0.08, 1.24, 0,  0.06,
        0,    0,    0,    1,  0
      ],
      blendColor: '#0284c7',
      blendAlpha: 0.15,
      blendMode: 'soft-light'
    },

    pastel_pop: {
      id: 'pastel_pop',
      name: 'Pastel Pop',
      badge: 'Candy K-Pop',
      desc: 'Конфетные пастельные оттенки, приподнятые чистые тени и зефирная сочность.',
      colorSwatch: 'linear-gradient(135deg, #a7f3d0, #fbcfe8)',
      brightness: 0.12,
      contrast: -0.04,
      saturation: 0.26,
      temperature: 5,
      shadowLift: 0.28,
      colorMatrix: [
        1.06, 0.08, 0.02, 0, 0.08,
        0.04, 1.08, 0.04, 0, 0.08,
        0.02, 0.04, 1.12, 0, 0.10,
        0,    0,    0,    1, 0
      ],
      blendColor: '#f472b6',
      blendAlpha: 0.12,
      blendMode: 'screen'
    },

    hyper_sharp_hdr: {
      id: 'hyper_sharp_hdr',
      name: 'Hyper Sharp HDR',
      badge: 'Ultra Clarity',
      desc: 'Экстремальная детализация: проработка микротекстур, контуров шрифтов и глубокий микроконтраст.',
      colorSwatch: 'linear-gradient(135deg, #10b981, #06b6d4)',
      brightness: 0.04,
      contrast: 0.22,
      saturation: 0.28,
      temperature: 0,
      clarity: 0.50,
      sharpen: 0.55,
      convolve: [
        -0.4, -0.6, -0.4,
        -0.6,  5.0, -0.6,
        -0.4, -0.6, -0.4
      ],
      colorMatrix: [
        1.12, 0.02, 0.02, 0, 0.02,
        0.02, 1.12, 0.02, 0, 0.02,
        0.02, 0.02, 1.12, 0, 0.02,
        0,    0,    0,    1, 0
      ]
    },

    duotone: {
      id: 'duotone',
      name: 'Duotone',
      badge: 'Graphic Indigo',
      desc: 'Двухтоновый дизайнерский плакат: глубокий индиго в тенях и ультра-яркий циан в светах.',
      colorSwatch: 'linear-gradient(135deg, #0f172a, #00f0ff)',
      brightness: 0.02,
      contrast: 0.40,
      saturation: -0.20,
      temperature: -15,
      isDuotone: true,
      duotoneDark: '#0f172a',
      duotoneLight: '#00f0ff',
      colorMatrix: [
        0.50, 0.60, 0.10, 0, -0.15,
        0.30, 0.80, 0.30, 0,  0.05,
        0.20, 0.50, 1.20, 0,  0.25,
        0,    0,    0,    1,  0
      ],
      blendColor: '#00f0ff',
      blendAlpha: 0.22,
      blendMode: 'overlay'
    },

    boho_earth: {
      id: 'boho_earth',
      name: 'Boho Earth',
      badge: 'Terracotta',
      desc: 'Природная органика: тёплая обожженная терракота, оливковые и песчано-льняные тона.',
      colorSwatch: 'linear-gradient(135deg, #b45309, #65a30d)',
      brightness: 0.02,
      contrast: 0.14,
      saturation: -0.06,
      temperature: 20,
      colorMatrix: [
        1.15, 0.06, -0.05, 0, 0.05,
        0.04, 1.04, -0.03, 0, 0.03,
        -0.08, 0.02, 0.86, 0, 0.02,
        0,     0,    0,    1, 0
      ],
      blendColor: '#b45309',
      blendAlpha: 0.15,
      blendMode: 'soft-light'
    },

    deep_amethyst: {
      id: 'deep_amethyst',
      name: 'Deep Amethyst',
      badge: 'Royal Violet',
      desc: 'Королевский аметист и сапфировые сумерки с мистическим неоновым сиянием.',
      colorSwatch: 'linear-gradient(135deg, #581c87, #1d4ed8)',
      brightness: 0.03,
      contrast: 0.25,
      saturation: 0.32,
      temperature: 5,
      colorMatrix: [
        1.18, -0.04, 0.14, 0, 0.04,
        -0.06, 0.96, 0.06, 0, -0.02,
        0.18,  0.04, 1.34, 0, 0.08,
        0,     0,    0,    1, 0
      ],
      blendColor: '#7c3aed',
      blendAlpha: 0.20,
      blendMode: 'soft-light'
    }
  };

  /* ══════════════════════════════════════════════════════════════
     ПИКСЕЛЬНЫЙ ДВИЖОК РЕТУШИ И ГРЕЙДИНГА (CANVAS & IMAGEDATA)
     ══════════════════════════════════════════════════════════════ */
  /**
   * Применяет пресет ретуши к ImageData с интерполяцией интенсивности (0..100%).
   *
   * @param {ImageData} imageData
   * @param {string|object} presetKeyOrObj
   * @param {number} intensity - от 0 до 100
   * @returns {ImageData}
   */
  function applyRetouchToImageData(imageData, presetKeyOrObj, intensity = 85) {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    if (totalPixels === 0) return imageData;

    const preset = (typeof presetKeyOrObj === 'string') 
      ? (RETOUCH_PRESETS[presetKeyOrObj] || RETOUCH_PRESETS.warm_glow)
      : (presetKeyOrObj || RETOUCH_PRESETS.warm_glow);

    // Нормализованный коэффициент интенсивности k in [0, 1]
    const k = Math.max(0, Math.min(100, Number(intensity) || 85)) / 100.0;
    if (k <= 0.001) return imageData; // 0% — без изменений

    // 1. Интерполяция параметров пресета
    const brightness = (preset.brightness || 0) * k;
    const contrast = (preset.contrast || 0) * k;
    const saturation = (preset.saturation || 0) * k;
    const tempK = (preset.temperature || 0) * k;
    const shadowLift = (preset.shadowLift || 0) * k;
    const blackLift = (preset.blackPointLift || 0) * k;

    // Расчет коэффициента контраста
    const cFactor = (contrast >= 0)
      ? (1.0 + contrast * 1.5)
      : (1.0 + contrast);

    // Сдвиг баланса температуры (White balance shift)
    const tempR = 1.0 + (tempK > 0 ? (tempK / 100) * 0.45 : (tempK / 100) * 0.15);
    const tempB = 1.0 - (tempK > 0 ? (tempK / 100) * 0.35 : (tempK / 100) * 0.45);

    // Интерполяция ColorMatrix с единичной матрицей Identity
    const pMatrix = preset.colorMatrix || null;
    let cm = null;
    if (pMatrix && pMatrix.length >= 20) {
      cm = new Float32Array(20);
      for (let i = 0; i < 20; i++) {
        const isDiag = (i === 0 || i === 6 || i === 12 || i === 18);
        const identityVal = isDiag ? 1.0 : 0.0;
        cm[i] = identityVal + (pMatrix[i] - identityVal) * k;
      }
    }

    // Буфер яркости для Convolve / Bloom / Sharpen
    let lumBuffer = null;
    const hasConvolve = !!preset.convolve && (preset.sharpen || preset.bloom || preset.clarity);
    if (hasConvolve && width > 4 && height > 4) {
      lumBuffer = new Float32Array(totalPixels);
    }

    // ПАСС 1: Основная цветокоррекция (ColorMatrix, Яркость, Контраст, Насыщенность, Тени)
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      // ColorMatrix преобразование
      if (cm) {
        const nr = r * cm[0] + g * cm[1] + b * cm[2] + a * cm[3] + cm[4] * 255.0;
        const ng = r * cm[5] + g * cm[6] + b * cm[7] + a * cm[8] + cm[9] * 255.0;
        const nb = r * cm[10] + g * cm[11] + b * cm[12] + a * cm[13] + cm[14] * 255.0;
        r = nr;
        g = ng;
        b = nb;
      }

      // Цветовая температура
      if (tempK !== 0) {
        r *= tempR;
        b *= tempB;
      }

      // Подтягивание теней (Shadow Lift) и Black Point Lift
      if (shadowLift > 0 || blackLift > 0) {
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
        const shadowWeight = Math.max(0, 1.0 - lum * 2.0);
        const lift = (shadowLift * 45.0 + blackLift) * shadowWeight;
        r += lift;
        g += lift;
        b += lift;
      }

      // Яркость
      if (brightness !== 0) {
        const bShift = brightness * 255.0;
        r += bShift;
        g += bShift;
        b += bShift;
      }

      // Контраст
      if (contrast !== 0) {
        r = cFactor * (r - 128.0) + 128.0;
        g = cFactor * (g - 128.0) + 128.0;
        b = cFactor * (b - 128.0) + 128.0;
      }

      // Насыщенность
      if (saturation !== 0) {
        const curLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const sFactor = 1.0 + saturation;
        r = curLum + (r - curLum) * sFactor;
        g = curLum + (g - curLum) * sFactor;
        b = curLum + (b - curLum) * sFactor;
      }

      // Клампинг в диапазон 0..255
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      data[i] = r | 0;
      data[i + 1] = g | 0;
      data[i + 2] = b | 0;

      if (lumBuffer) {
        lumBuffer[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    // ПАСС 2: Свертка Convolve (Bloom Diffusion или High-Pass Unsharp)
    if (lumBuffer && preset.convolve) {
      const conv = preset.convolve;
      const sharpenFactor = (preset.sharpen || 0) * k * 0.85;

      if (sharpenFactor > 0) {
        for (let y = 1; y < height - 1; y++) {
          const yOff = y * width;
          for (let x = 1; x < width - 1; x++) {
            const idx = yOff + x;
            const curL = lumBuffer[idx];
            const avgL = (
              lumBuffer[idx - 1] + lumBuffer[idx + 1] +
              lumBuffer[idx - width] + lumBuffer[idx + width]
            ) * 0.25;

            const delta = (curL - avgL) * sharpenFactor;
            if (delta !== 0) {
              const pIdx = idx * 4;
              data[pIdx]     = Math.min(255, Math.max(0, data[pIdx] + delta)) | 0;
              data[pIdx + 1] = Math.min(255, Math.max(0, data[pIdx + 1] + delta)) | 0;
              data[pIdx + 2] = Math.min(255, Math.max(0, data[pIdx + 2] + delta)) | 0;
            }
          }
        }
      }
    }

    return imageData;
  }

  /**
   * Применяет ретушь к Canvas элементу
   */
  function applyRetouchToCanvas(sourceCanvas, presetKeyOrObj, intensity = 85) {
    if (!sourceCanvas) return null;
    const ctx = sourceCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    applyRetouchToImageData(imgData, presetKeyOrObj, intensity);
    ctx.putImageData(imgData, 0, 0);
    return sourceCanvas;
  }

  /* ══════════════════════════════════════════════════════════════
     ИНТЕГРАЦИЯ В FABRIC.JS (ФИЛЬТРЫ ОБЪЕКТОВ И ГЛОБАЛЬНЫЙ ОВЕРЛЕЙ)
     ══════════════════════════════════════════════════════════════ */
  /**
   * Применяет фильтры Fabric.js к отдельному объекту fabric.Image
   *
   * @param {fabric.Image} imgObj
   * @param {string|object} presetKeyOrObj
   * @param {number} intensity - 0..100
   */
  function applyFabricImageRetouch(imgObj, presetKeyOrObj, intensity = 85) {
    if (!imgObj || imgObj.type !== 'image' || typeof fabric === 'undefined') return;

    const preset = (typeof presetKeyOrObj === 'string') 
      ? (RETOUCH_PRESETS[presetKeyOrObj] || RETOUCH_PRESETS.warm_glow)
      : (presetKeyOrObj || RETOUCH_PRESETS.warm_glow);

    const k = Math.max(0, Math.min(100, intensity)) / 100.0;

    // Сохраняем исходные фильтры объекта для чистого сброса
    if (!imgObj.__originalFiltersSaved) {
      imgObj.__originalFilters = imgObj.filters ? [...imgObj.filters] : [];
      imgObj.__originalFiltersSaved = true;
    }

    imgObj.filters = [];

    if (k <= 0.001) {
      imgObj.applyFilters();
      if (imgObj.canvas) imgObj.canvas.requestRenderAll();
      return;
    }

    // 1. ColorMatrix фильтр Fabric.js
    if (preset.colorMatrix && fabric.Image.filters.ColorMatrix) {
      const pMatrix = preset.colorMatrix;
      const interpMatrix = [];
      for (let i = 0; i < 20; i++) {
        const isDiag = (i === 0 || i === 6 || i === 12 || i === 18);
        const identityVal = isDiag ? 1.0 : 0.0;
        interpMatrix.push(identityVal + (pMatrix[i] - identityVal) * k);
      }
      imgObj.filters.push(new fabric.Image.filters.ColorMatrix({ matrix: interpMatrix }));
    }

    // 2. Brightness
    if (preset.brightness && fabric.Image.filters.Brightness) {
      imgObj.filters.push(new fabric.Image.filters.Brightness({ brightness: preset.brightness * k }));
    }

    // 3. Contrast
    if (preset.contrast && fabric.Image.filters.Contrast) {
      imgObj.filters.push(new fabric.Image.filters.Contrast({ contrast: preset.contrast * k }));
    }

    // 4. Saturation
    if (preset.saturation && fabric.Image.filters.Saturation) {
      imgObj.filters.push(new fabric.Image.filters.Saturation({ saturation: preset.saturation * k }));
    }

    // 5. Convolve
    if (preset.convolve && fabric.Image.filters.Convolve) {
      imgObj.filters.push(new fabric.Image.filters.Convolve({
        matrix: preset.convolve,
        opaque: false
      }));
    }

    // 6. BlendColor
    if (preset.blendColor && fabric.Image.filters.BlendColor) {
      imgObj.filters.push(new fabric.Image.filters.BlendColor({
        color: preset.blendColor,
        mode: preset.blendMode || 'tint',
        alpha: (preset.blendAlpha || 0.15) * k
      }));
    }

    imgObj.applyFilters();
    if (imgObj.canvas) imgObj.canvas.requestRenderAll();
  }

  /**
   * Накладывает глобальную ретушь на весь холст Fabric.js в реальном времени.
   * Применяет фильтры ко всем растровым слоям и накладывает стилизованный
   * глобальный артборд-оверлей тонирования (__artboardGradeOverlay).
   *
   * @param {fabric.Canvas} fabricCanvas
   * @param {string} presetKey
   * @param {number} intensity (0..100)
   */
  function applyRetouchToArtboard(fabricCanvas, presetKey = 'warm_glow', intensity = 85) {
    const c = fabricCanvas || window.canvas;
    if (!c) return;

    const preset = RETOUCH_PRESETS[presetKey] || RETOUCH_PRESETS.warm_glow;
    const k = Math.max(0, Math.min(100, intensity)) / 100.0;

    // 1. Применяем фильтры ко всем fabric.Image слоям
    const objects = c.getObjects ? c.getObjects() : [];
    objects.forEach(obj => {
      if (obj.type === 'image' && !obj.__isGradeOverlay) {
        applyFabricImageRetouch(obj, preset, intensity);
      }
    });

    // 2. Создаем или обновляем глобальный оверлей тонирования листа (__artboardGradeOverlay)
    let overlay = c.__artboardGradeOverlay;
    if (k <= 0.001) {
      if (overlay) {
        c.remove(overlay);
        c.__artboardGradeOverlay = null;
      }
      c.requestRenderAll();
      return;
    }

    const dims = (typeof window.getArtboardDimensions === 'function')
      ? window.getArtboardDimensions(c)
      : { w: (window.currentSize?.w || 595), h: (window.currentSize?.h || 842) };

    const overlayColor = preset.blendColor || '#f59e0b';
    const overlayAlpha = (preset.blendAlpha || 0.12) * k;

    if (!overlay || !c.contains(overlay)) {
      overlay = new fabric.Rect({
        left: 0,
        top: 0,
        width: dims.w,
        height: dims.h,
        fill: overlayColor,
        opacity: overlayAlpha,
        selectable: false,
        evented: false,
        excludeFromLayers: true,
        __isHelper: true,
        __isGradeOverlay: true
      });
      c.__artboardGradeOverlay = overlay;
      c.add(overlay);
      c.bringToFront(overlay);
    } else {
      overlay.set({
        width: dims.w,
        height: dims.h,
        fill: overlayColor,
        opacity: overlayAlpha
      });
      c.bringToFront(overlay);
    }

    c.requestRenderAll();
  }

  /* ══════════════════════════════════════════════════════════════
     ГЕНЕРАТОР КАДРИРОВАНИЯ И ЭКСПОРТА ДЛЯ INSTAGRAM
     ══════════════════════════════════════════════════════════════ */
  /**
   * Рендерит афишу в точные пропорции Instagram (1080x1080, 1080x1350, 1080x1920)
   * с выбранным пресетом ретуши и режимом фона ('blur', 'color', 'crop').
   *
   * @param {fabric.Canvas} fabricCanvas
   * @param {object} options
   *   - formatKey: 'square' | 'portrait' | 'story' | 'original'
   *   - presetKey: имя пресета из RETOUCH_PRESETS
   *   - intensity: 0..100
   *   - framingMode: 'blur' | 'color' | 'crop'
   * @returns {Promise<HTMLCanvasElement>}
   */
  async function renderInstagramPosterCanvas(fabricCanvas, options = {}) {
    const c = fabricCanvas || window.canvas;
    if (!c) throw new Error('Холст не найден');

    const formatKey = options.formatKey || 'portrait';
    const formatMeta = INSTAGRAM_FORMATS[formatKey] || INSTAGRAM_FORMATS.portrait;
    const presetKey = options.presetKey || 'warm_glow';
    const intensity = Number(options.intensity ?? 85);
    const framingMode = options.framingMode || 'blur'; // 'blur' | 'color' | 'crop'

    // 1. Получаем чистый растровый артборд афиши в 2x качестве
    const renderArtboard = (typeof window.renderCleanArtboardCanvas === 'function')
      ? window.renderCleanArtboardCanvas
      : (window.PosterEnhancer?.renderCleanArtboardCanvas || null);

    if (!renderArtboard) {
      throw new Error('Функция renderCleanArtboardCanvas недоступна');
    }

    // Рендерим артборд без служебных рамок и монтажного стола с множителем 2.0
    const cleanArtboard = renderArtboard(c, 2.0);
    const origW = cleanArtboard.width;
    const origH = cleanArtboard.height;

    // Целевые размеры Instagram
    const targetW = formatMeta.width || origW;
    const targetH = formatMeta.height || origH;

    // Создаем целевой Canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');

    // Режим А: ОРИГИНАЛ (без изменения соотношения сторон)
    if (formatKey === 'original') {
      ctx.drawImage(cleanArtboard, 0, 0, targetW, targetH);
      applyRetouchToCanvas(outCanvas, presetKey, intensity);
      return outCanvas;
    }

    // Режим Б: КРОП (Заполнение на весь экран с обрезкой краев)
    if (framingMode === 'crop') {
      const scale = Math.max(targetW / origW, targetH / origH);
      const cropW = origW * scale;
      const cropH = origH * scale;
      const cropX = (targetW - cropW) / 2;
      const cropY = (targetH - cropH) / 2;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cleanArtboard, cropX, cropY, cropW, cropH);
      ctx.restore();

      applyRetouchToCanvas(outCanvas, presetKey, intensity);
      return outCanvas;
    }

    // Режим В: ЦВЕТНОЙ ФОН МАКЕТА (Чистая цветная рамка)
    if (framingMode === 'color') {
      const artboardBg = c.__artboardBg || c.backgroundColor || '#0c1222';
      ctx.fillStyle = typeof artboardBg === 'string' ? artboardBg : '#0c1222';
      ctx.fillRect(0, 0, targetW, targetH);

      const margin = 50;
      const fitScale = Math.min((targetW - margin * 2) / origW, (targetH - margin * 2) / origH);
      const fitW = origW * fitScale;
      const fitH = origH * fitScale;
      const fitX = (targetW - fitW) / 2;
      const fitY = (targetH - fitH) / 2;

      // Тень для отделения афиши от фона
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      ctx.drawImage(cleanArtboard, fitX, fitY, fitW, fitH);
      ctx.restore();

      applyRetouchToCanvas(outCanvas, presetKey, intensity);
      return outCanvas;
    }

    // Режим Г: КИНЕМАТОГРАФИЧНЫЙ РАЗМЫТЫЙ ФОН (Smart Blur Backdrop — Рекомендуемый Instagram)
    // 1. Рисуем масштабированную размытую подложку афиши
    const bgScale = Math.max(targetW / origW, targetH / origH) * 1.08;
    const bgW = origW * bgScale;
    const bgH = origH * bgScale;
    const bgX = (targetW - bgW) / 2;
    const bgY = (targetH - bgH) / 2;

    ctx.save();
    ctx.filter = 'blur(42px) brightness(0.68) saturate(1.25)';
    ctx.drawImage(cleanArtboard, bgX, bgY, bgW, bgH);
    ctx.restore();

    // Затемняющий оверлей с виньеткой для максимальной фокусировки взгляда
    const grad = ctx.createRadialGradient(
      targetW / 2, targetH / 2, targetW * 0.25,
      targetW / 2, targetH / 2, targetW * 0.75
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Размещаем резкий макет по центру с отступами и аккуратной тенью
    const pad = targetW > 1080 ? 64 : 48;
    const fitScale = Math.min((targetW - pad * 2) / origW, (targetH - pad * 2) / origH);
    const fitW = Math.round(origW * fitScale);
    const fitH = Math.round(origH * fitScale);
    const fitX = Math.round((targetW - fitW) / 2);
    const fitY = Math.round((targetH - fitH) / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.60)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(cleanArtboard, fitX, fitY, fitW, fitH);
    ctx.restore();

    // Тонкая рамка вокруг постера
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fitX, fitY, fitW, fitH);
    ctx.restore();

    // 3. Применяем кинематографичный цветогрейдинг ко всему холсту
    applyRetouchToCanvas(outCanvas, presetKey, intensity);

    return outCanvas;
  }

  /**
   * Скачивание готового Instagram файла
   */
  async function downloadInstagramPoster(fabricCanvas, options = {}) {
    const fileType = options.fileType || 'jpg'; // 'jpg' | 'png'
    const formatKey = options.formatKey || 'portrait';
    const presetKey = options.presetKey || 'warm_glow';

    const canvasBuffer = await renderInstagramPosterCanvas(fabricCanvas, options);

    const titleInput = document.getElementById('poster-title');
    const safeTitle = (titleInput ? titleInput.value.trim() : 'Афиша')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_') || 'Афиша';

    const formatLabel = formatKey.toUpperCase();
    const presetLabel = presetKey.replace(/_/g, '');
    const ext = fileType === 'png' ? 'png' : 'jpg';
    const mime = fileType === 'png' ? 'image/png' : 'image/jpeg';
    const quality = fileType === 'png' ? undefined : 0.96;

    const dataUrl = canvasBuffer.toDataURL(mime, quality);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeTitle}_Instagram_${formatLabel}_${presetLabel}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);

    if (typeof window.toast === 'function') {
      window.toast(`📸 Макет сохранён для Instagram (${formatLabel})!`);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     МОДАЛЬНЫЙ ИНТЕРФЕЙС И СОБЫТИЯ
     ══════════════════════════════════════════════════════════════ */
  function initModalUI() {
    const modalOverlay = document.getElementById('retouch-modal-overlay');
    if (!modalOverlay) return;

    const btnClose = document.getElementById('retouch-modal-close');
    const previewCanvas = document.getElementById('retouch-preview-canvas');
    const presetsGrid = document.getElementById('retouch-presets-grid');
    const intensitySlider = document.getElementById('retouch-intensity-slider');
    const intensityValLabel = document.getElementById('retouch-intensity-val');
    const formatTabs = document.querySelectorAll('.retouch-format-chip');
    const framingTabs = document.querySelectorAll('.retouch-framing-chip');
    const btnDownloadJpg = document.getElementById('btn-retouch-download-jpg');
    const btnDownloadPng = document.getElementById('btn-retouch-download-png');
    const btnApplyArtboard = document.getElementById('btn-retouch-apply-canvas');
    const metaFormatLabel = document.getElementById('retouch-meta-format');
    const loaderWrap = document.getElementById('retouch-loader-wrap');

    let currentPreset = 'warm_glow';
    let currentFormat = 'portrait';
    let currentFraming = 'blur';
    let currentIntensity = 85;
    let renderDebounceTimer = null;
    let isRendering = false;

    // 1. Отрисовка карточек 12 пресетов
    if (presetsGrid) {
      presetsGrid.innerHTML = Object.values(RETOUCH_PRESETS).map(p => `
        <div class="retouch-preset-card ${p.id === currentPreset ? 'is-active' : ''}" data-preset="${p.id}">
          <div class="retouch-card-swatch" style="background: ${p.colorSwatch};">
            <span class="retouch-card-badge">${p.badge}</span>
          </div>
          <div class="retouch-card-info">
            <span class="retouch-card-title">${p.name}</span>
            <span class="retouch-card-desc">${p.desc}</span>
          </div>
        </div>
      `).join('');

      presetsGrid.addEventListener('click', e => {
        const card = e.target.closest('.retouch-preset-card');
        if (!card) return;
        const pid = card.dataset.preset;
        if (pid && pid !== currentPreset) {
          currentPreset = pid;
          presetsGrid.querySelectorAll('.retouch-preset-card').forEach(c => {
            c.classList.toggle('is-active', c.dataset.preset === currentPreset);
          });
          schedulePreviewUpdate();
        }
      });
    }

    // 2. Слайдер интенсивности
    if (intensitySlider) {
      intensitySlider.value = currentIntensity;
      if (intensityValLabel) intensityValLabel.textContent = `${currentIntensity}%`;

      intensitySlider.addEventListener('input', e => {
        currentIntensity = Number(e.target.value);
        if (intensityValLabel) intensityValLabel.textContent = `${currentIntensity}%`;
        schedulePreviewUpdate(60);
      });
    }

    // 3. Выбор формата Instagram
    formatTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        currentFormat = tab.dataset.format;
        formatTabs.forEach(t => t.classList.toggle('is-active', t.dataset.format === currentFormat));
        updateMetaLabel();
        schedulePreviewUpdate();
      });
    });

    // 4. Выбор режима фона (framing)
    framingTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        currentFraming = tab.dataset.framing;
        framingTabs.forEach(t => t.classList.toggle('is-active', t.dataset.framing === currentFraming));
        schedulePreviewUpdate();
      });
    });

    function updateMetaLabel() {
      if (!metaFormatLabel) return;
      const meta = INSTAGRAM_FORMATS[currentFormat];
      if (meta && meta.width) {
        metaFormatLabel.textContent = `${meta.name} · ${meta.width} × ${meta.height} px`;
      } else {
        metaFormatLabel.textContent = 'Оригинальный размер листа';
      }
    }

    // 5. Отрисовка превью с дебаунсом
    function schedulePreviewUpdate(delay = 140) {
      if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
      renderDebounceTimer = setTimeout(() => {
        updatePreview();
      }, delay);
    }

    async function updatePreview() {
      if (!modalOverlay || modalOverlay.classList.contains('hidden')) return;
      if (isRendering) return;

      isRendering = true;
      if (loaderWrap) loaderWrap.classList.remove('hidden');

      try {
        const fullCanvas = await renderInstagramPosterCanvas(window.canvas, {
          formatKey: currentFormat,
          presetKey: currentPreset,
          intensity: currentIntensity,
          framingMode: currentFraming
        });

        if (previewCanvas && fullCanvas) {
          previewCanvas.width = fullCanvas.width;
          previewCanvas.height = fullCanvas.height;
          const ctx = previewCanvas.getContext('2d');
          ctx.drawImage(fullCanvas, 0, 0);
        }
      } catch (err) {
        console.warn('[Retouch Preview] Ошибка обновления:', err);
      } finally {
        isRendering = false;
        if (loaderWrap) loaderWrap.classList.add('hidden');
      }
    }

    // 6. Кнопки экспорта
    if (btnDownloadJpg) {
      btnDownloadJpg.addEventListener('click', async () => {
        btnDownloadJpg.disabled = true;
        try {
          await downloadInstagramPoster(window.canvas, {
            formatKey: currentFormat,
            presetKey: currentPreset,
            intensity: currentIntensity,
            framingMode: currentFraming,
            fileType: 'jpg'
          });
        } catch (err) {
          if (typeof window.toast === 'function') window.toast(`Сбой экспорта: ${err.message}`);
        } finally {
          btnDownloadJpg.disabled = false;
        }
      });
    }

    if (btnDownloadPng) {
      btnDownloadPng.addEventListener('click', async () => {
        btnDownloadPng.disabled = true;
        try {
          await downloadInstagramPoster(window.canvas, {
            formatKey: currentFormat,
            presetKey: currentPreset,
            intensity: currentIntensity,
            framingMode: currentFraming,
            fileType: 'png'
          });
        } catch (err) {
          if (typeof window.toast === 'function') window.toast(`Сбой экспорта: ${err.message}`);
        } finally {
          btnDownloadPng.disabled = false;
        }
      });
    }

    // 7. Кнопка «Применить ретушь к холсту»
    if (btnApplyArtboard) {
      btnApplyArtboard.addEventListener('click', () => {
        applyRetouchToArtboard(window.canvas, currentPreset, currentIntensity);
        if (typeof window.toast === 'function') {
          window.toast(`✨ Пресет «${RETOUCH_PRESETS[currentPreset].name}» применен к афише!`);
        }
        if (typeof window.saveHistory === 'function') {
          window.saveHistory();
        }
        closeModal();
      });
    }

    function openModal() {
      modalOverlay.classList.remove('hidden');
      updateMetaLabel();
      schedulePreviewUpdate(30);
    }

    function closeModal() {
      modalOverlay.classList.add('hidden');
      if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
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

    // Экспорт функции открытия
    window.openRetouchModal = openModal;
    window.openInstagramRetouchModal = openModal;
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
    RETOUCH_PRESETS,
    INSTAGRAM_FORMATS,
    applyRetouchToImageData,
    applyRetouchToCanvas,
    applyFabricImageRetouch,
    applyRetouchToArtboard,
    renderInstagramPosterCanvas,
    downloadInstagramPoster
  };
});
