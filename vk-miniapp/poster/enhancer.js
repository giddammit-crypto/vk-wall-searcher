/**
 * ===================================================================
 * АВРОРА — МОДУЛЬ УЛУЧШЕНИЯ КАЧЕСТВА ИЗОБРАЖЕНИЙ И СУПЕРСЭМПЛИНГА
 * enhancer.js
 *
 * Ядро графической обработки и экспорта в разрешениях 1K, 2K, 4K, 8K и HDR:
 * 1. Суперсэмплинг холста (Super-Resolution Canvas Export):
 *    - Расчёт масштаба (multiplier) для целевых разрешений:
 *      '1k' (~1920px), '2k' (~2560px), '4k' (~3840px), '8k' (~7680px), 'original' (1x)
 *    - Защита от переполнения памяти браузера (Canvas Max Memory management)
 * 2. Адаптивное HDR тональное отображение (Tone Mapping & Local Contrast):
 *    - Подтягивание глубоких теней (Shadow recovery с сохранением глубины чёрного)
 *    - Сжатие пересветов (Highlight compression: ACES Filmic, Reinhard, Filmic S-curve)
 *    - Умная сочность (Smart Vibrance с защитой натуральных оттенков кожи)
 *    - Локальный микроконтраст (Clarity convolution с soft-knee насыщением без ореолов)
 *    - Адаптивная резкость (Unsharp Mask 3x3 с пороговым подавлением шума)
 * 3. Пресеты качества:
 *    - "Легкий HDR", "Кинематографичный", "Максимальный Vivid", "Полиграфия"
 * 4. Экспорт холста: PNG (lossless), JPG (95%), PDF (через jsPDF)
 * 5. Интерактивное превью «До / После» (Before / After Comparison)
 * 6. Улучшение отдельного изображения на холсте (fabric.Image)
 * ===================================================================
 */

/**
 * Стандарты целевых разрешений экспорта
 */
const RESOLUTION_TARGETS = {
  original: {
    id: 'original',
    name: 'Оригинал (1x)',
    targetLong: null,
    fallbackScale: 1.0,
    description: '100% исходный размер холста'
  },
  '1k': {
    id: '1k',
    name: '1K Full HD',
    targetLong: 1920,
    fallbackScale: 1.5,
    description: '~1920px по длинной стороне (веб, мессенджеры, соцсети)'
  },
  '2k': {
    id: '2k',
    name: '2K Quad HD',
    targetLong: 2560,
    fallbackScale: 2.0,
    description: '~2560px по длинной стороне (четкие Retina-экраны, стандарт)'
  },
  '4k': {
    id: '4k',
    name: '4K Ultra HD',
    targetLong: 3840,
    fallbackScale: 4.0,
    description: '~3840-4096px (Ultra-HD презентации, ТВ, качественная полиграфия)'
  },
  '8k': {
    id: '8k',
    name: '8K Ultra Master',
    targetLong: 7680,
    fallbackScale: 8.0,
    description: '~7680px (сверхкрупная интерьерная и наружная печать)'
  }
};

/**
 * Безопасные лимиты памяти HTML5 Canvas в современных веб-браузерах
 */
const CANVAS_LIMITS = {
  MAX_DIMENSION: 8192,           // Максимальная безопасная длина любой стороны в пикселях
  MAX_PIXELS: 33554432,          // 33.55 Мегапикселей (~5792x5792) — гарантированный лимит VRAM
  ABSOLUTE_MAX_DIMENSION: 16384  // Аппаратный предел WebGL/Canvas на настольных ПК
};

/**
 * 1. РАСЧЁТ МАСШТАБА (MULTIPLIER) ДЛЯ ЦЕЛЕВЫХ РАЗРЕШЕНИЙ
 *
 * @param {number} width - Исходная ширина холста (в px или pt)
 * @param {number} height - Исходная высота холста (в px или pt)
 * @param {string|number} targetResolution - 'original' | '1k' | '2k' | '4k' | '8k' или произвольное число
 * @param {object} [options] - Дополнительные параметры лимитов памяти
 * @returns {object} Метаданные масштабирования и безопасности памяти
 */
function calculateExportScale(width, height, targetResolution = '2k', options = {}) {
  const w = Math.max(1, Math.round(Number(width) || 1000));
  const h = Math.max(1, Math.round(Number(height) || 1000));
  const longSide = Math.max(w, h);

  const maxDim = options.maxDimension || CANVAS_LIMITS.MAX_DIMENSION;
  const maxPix = options.maxPixels || CANVAS_LIMITS.MAX_PIXELS;

  let multiplier = 1.0;
  let targetMeta = null;

  if (typeof targetResolution === 'number' && targetResolution > 0) {
    multiplier = targetResolution;
  } else {
    const key = String(targetResolution).toLowerCase();
    targetMeta = RESOLUTION_TARGETS[key] || RESOLUTION_TARGETS['2k'];

    if (targetMeta.targetLong) {
      // Масштабируем так, чтобы длинная сторона достигла targetLong
      multiplier = targetMeta.targetLong / longSide;
      // Если исходный холст уже равен или превышает целевое разрешение
      if (multiplier < 1.0 && key !== 'original') {
        multiplier = Math.max(1.0, targetMeta.fallbackScale || 1.0);
      }
    } else {
      multiplier = targetMeta.fallbackScale || 1.0;
    }
  }

  // Округляем до 3 знаков после запятой для точного рендеринга
  multiplier = Math.round(multiplier * 1000) / 1000;
  const requestedMultiplier = multiplier;

  // Защита памяти Canvas Max Memory: проверка ограничений браузера
  let targetW = Math.round(w * multiplier);
  let targetH = Math.round(h * multiplier);
  let isClamped = false;
  let clampReason = null;

  // Ограничение по максимальной стороне
  if (targetW > maxDim || targetH > maxDim) {
    const scaleCap = maxDim / Math.max(targetW, targetH);
    multiplier *= scaleCap;
    isClamped = true;
    clampReason = `Ограничение по максимальной стороне (${maxDim}px)`;
  }

  // Ограничение по суммарной площади пикселей
  if ((w * multiplier) * (h * multiplier) > maxPix) {
    const scaleCap = Math.sqrt(maxPix / ((w * multiplier) * (h * multiplier)));
    multiplier *= scaleCap;
    isClamped = true;
    clampReason = `Ограничение по объёму памяти Canvas (${Math.round(maxPix / 1e6)} Мп)`;
  }

  multiplier = Math.max(0.1, Math.round(multiplier * 1000) / 1000);
  targetW = Math.round(w * multiplier);
  targetH = Math.round(h * multiplier);

  const totalPixels = targetW * targetH;
  const estimatedMemoryMb = Math.round((totalPixels * 4) / (1024 * 1024) * 10) / 10;

  return {
    targetResolution: targetMeta ? targetMeta.id : 'custom',
    targetName: targetMeta ? targetMeta.name : `${multiplier}x Custom`,
    multiplier,
    requestedMultiplier,
    isClamped,
    clampReason,
    targetWidth: targetW,
    targetHeight: targetH,
    originalWidth: w,
    originalHeight: h,
    totalPixels,
    estimatedMemoryMb
  };
}

/**
 * 2. ПРЕСЕТЫ ИНТЕНСИВНОСТИ HDR
 */
const HDR_PRESETS = {
  light: {
    id: 'light',
    name: 'Легкий HDR',
    description: 'Естественное подтягивание теней, деликатная сочность и мягкий микроконтраст',
    shadows: 0.25,        // +25% подтягивание глубоких теней
    highlights: 0.22,     // +22% компрессия пересветов
    vibrance: 0.20,       // +20% избирательная сочность
    clarity: 0.22,        // +22% локальный микроконтраст
    sharpness: 0.16,      // +16% контурная резкость деталей
    contrast: 0.05,       // +5% общий контраст
    toneMapping: 'reinhard',
    protectSkin: true
  },
  cinematic: {
    id: 'cinematic',
    name: 'Кинематографичный',
    description: 'Богатый динамический диапазон ACES, благородная глубина теней и кинематографичный контраст',
    shadows: 0.38,        // +38% подтягивание теней
    highlights: 0.45,     // +45% кинематографическое сжатие ярких зон
    vibrance: 0.30,       // +30% сочность
    clarity: 0.36,        // +36% микроконтраст
    sharpness: 0.26,      // +26% резкость
    contrast: 0.12,       // +12% контраст
    toneMapping: 'aces',  // ACES Filmic Tone Mapping
    protectSkin: true
  },
  vivid: {
    id: 'vivid',
    name: 'Максимальный Vivid',
    description: 'Взрывные сочные цвета, глубокие тени и высокая резкость для рекламных баннеров и афиш',
    shadows: 0.48,        // +48% максимальный подъем деталей в тенях
    highlights: 0.35,     // +35% контроль пересветов
    vibrance: 0.60,       // +60% мощная сочность
    clarity: 0.48,        // +48% выразительный микроконтраст
    sharpness: 0.38,      // +38% кристальная резкость
    contrast: 0.18,       // +18% повышенный контраст
    toneMapping: 'aces',
    protectSkin: false    // Максимальная сочность без ограничений
  },
  print: {
    id: 'print',
    name: 'Полиграфия',
    description: 'Оптимизирован для офсетной печати: чёткие контуры букв, микроконтраст и защита теней от слипания',
    shadows: 0.32,        // +32% подъем теней
    highlights: 0.52,     // +52% компрессия белых зон под белизну бумаги
    vibrance: 0.24,       // +24% сочность
    clarity: 0.60,        // +60% усиленный микроконтраст для печати
    sharpness: 0.46,      // +46% высокая контурная резкость шрифтов и деталей
    contrast: 0.15,       // +15% контраст
    toneMapping: 'filmic',// Filmic Tone Mapping
    protectSkin: true,
    blackPointProtect: true // Защита точки черного для предотвращения грязи в офсете
  }
};

/**
 * АВТО-БАЛАНС: Растяжение динамического диапазона и Gray World авто-баланс белого
 *
 * @param {ImageData} imageData
 * @param {object} [options]
 * @returns {ImageData}
 */
function applyAutoBalanceToImageData(imageData, options = {}) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) return imageData;

  // 1. Построение гистограммы яркости
  const hist = new Uint32Array(256);
  let sumR = 0, sumG = 0, sumB = 0, validCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = (54 * r + 183 * g + 19 * b) >> 8;
    hist[y]++;
    sumR += r;
    sumG += g;
    sumB += b;
    validCount++;
  }

  if (validCount === 0) return imageData;

  // 0.5% отсечка для точки чёрного и белого
  const clipLow = validCount * 0.005;
  const clipHigh = validCount * 0.995;

  let count = 0;
  let blackPoint = 0;
  let whitePoint = 255;

  for (let i = 0; i < 256; i++) {
    count += hist[i];
    if (count >= clipLow && blackPoint === 0) {
      blackPoint = i;
    }
    if (count >= clipHigh) {
      whitePoint = i;
      break;
    }
  }

  if (whitePoint <= blackPoint) {
    blackPoint = 0;
    whitePoint = 255;
  }

  const range = whitePoint - blackPoint;
  const stretchLut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const val = ((i - blackPoint) / range) * 255.0;
    stretchLut[i] = Math.min(255, Math.max(0, val));
  }

  // 2. Деликатный Gray World авто-баланс белого (с ограничением ±12%)
  const avgR = sumR / validCount;
  const avgG = sumG / validCount;
  const avgB = sumB / validCount;
  const avgGray = (avgR + avgG + avgB) / 3.0;

  const scaleR = 1.0 + Math.max(-0.12, Math.min(0.12, (avgGray / (avgR + 0.1)) - 1.0));
  const scaleG = 1.0 + Math.max(-0.12, Math.min(0.12, (avgGray / (avgG + 0.1)) - 1.0));
  const scaleB = 1.0 + Math.max(-0.12, Math.min(0.12, (avgGray / (avgB + 0.1)) - 1.0));

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = stretchLut[data[i]] * scaleR;
    const g = stretchLut[data[i + 1]] * scaleG;
    const b = stretchLut[data[i + 2]] * scaleB;

    data[i]     = Math.min(255, Math.max(0, r)) | 0;
    data[i + 1] = Math.min(255, Math.max(0, g)) | 0;
    data[i + 2] = Math.min(255, Math.max(0, b)) | 0;
  }

  return imageData;
}

/**
 * 2. АЛГОРИТМ HDR-ОБРАБОТКИ (Tone Mapping, Shadow Recovery, Highlight Compression,
 *    Smart Vibrance, Clarity & Unsharp Mask)
 *
 * @param {ImageData} imageData
 * @param {object} [config] - Параметры или пресет HDR
 * @returns {ImageData}
 */
function applyHdrToImageData(imageData, config = {}) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) return imageData;

  // Разрешаем передавать как имя пресета, так и объект настроек
  let cfg = config;
  if (typeof config === 'string' && HDR_PRESETS[config]) {
    cfg = HDR_PRESETS[config];
  }

  const shadows = Number(cfg.shadows ?? cfg.shadowLift ?? 0.35);          // 0..1 (подтягивание глубоких теней)
  const highlights = Number(cfg.highlights ?? 0.40);    // 0..1 (сжатие пересветов)
  const vibrance = Number(cfg.vibrance ?? 0.25);        // 0..1 (умная сочность)
  const clarity = Number(cfg.clarity ?? 0.32);          // 0..1 (локальный микроконтраст)
  const sharpness = Number(cfg.sharpness ?? cfg.sharpenAmount ?? 0.22);      // 0..1 (резкость деталей)
  const contrast = Number(cfg.contrast ?? 0.10);        // -1..1 (контраст)
  const toneMapping = cfg.toneMapping || 'aces';        // 'aces' | 'reinhard' | 'filmic'
  const protectSkin = cfg.protectSkin !== false;
  const blackPointProtect = !!cfg.blackPointProtect;

  // 1. Быстрый Look-Up Table (LUT) для тонового отображения яркости 0..255
  // Вход: y in [0, 1]. Выход: коэффициент усиления gain = y_final / max(y, 1e-4)
  const gainLut = new Float32Array(256);

  for (let i = 0; i < 256; i++) {
    const y = i / 255.0;
    if (y <= 0.0001) {
      gainLut[i] = 1.0;
      continue;
    }

    // A. Подтягивание глубоких теней (Shadow Recovery):
    // w_s максимален в глубоких тенях и плавно спадает к светлым тонам.
    // Умножение на Math.sqrt(y) гарантирует, что чистый черный (0) не превращается в мутную серость!
    const w_s = Math.max(0, 1.0 - y);
    const shadowBoost = shadows * 1.65 * Math.sqrt(y) * (w_s * w_s);
    let y_shadow = y + shadowBoost;

    // Защита глубокого чёрного для типографской печати (black point protection)
    if (blackPointProtect && y < 0.08) {
      y_shadow = y * (1.0 - (0.08 - y) / 0.08 * 0.35);
    }

    // B. Сжатие пересветов (Highlight Compression):
    let y_curve = y;
    if (toneMapping === 'aces') {
      // ACES Tone Mapping (Narkowicz fit, нормализованный)
      const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      y_curve = (y * (a * y + b)) / (y * (c * y + d) + e);
      y_curve = Math.min(1.0, Math.max(0.0, y_curve / 0.8037));
    } else if (toneMapping === 'filmic') {
      // Filmic S-curve с мягким плечом
      const x = Math.max(0, y - 0.004);
      y_curve = (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
    } else {
      // Reinhard Extended
      y_curve = (y * (1.0 + y / 4.0)) / (1.0 + y);
    }

    // Плавный переход для компрессии верхнего диапазона яркости
    const t_h = Math.max(0, Math.min(1, (y - 0.35) / 0.65));
    const w_h = t_h * t_h * (3.0 - 2.0 * t_h); // smoothstep
    const y_highlight = y + (y_curve - y) * (highlights * 0.88);

    // Объединяем подъем теней и компрессию ярких зон
    let y_mapped = y_shadow + (y_highlight - y) * w_h;
    y_mapped = Math.min(1.0, Math.max(0.0, y_mapped));

    gainLut[i] = y_mapped / y;
  }

  // Коэффициент общего контраста
  const contrastFactor = (259.0 * (contrast * 255.0 + 255.0)) / (255.0 * (259.0 - contrast * 255.0));

  // Буфер яркости для высокоскоростного локального микроконтраста (Clarity) и резкости
  const luminanceBuffer = (clarity > 0 || sharpness > 0) ? new Float32Array(totalPixels) : null;

  // ПАСС 1: Тональное отображение (Tone Mapping), Умная сочность (Smart Vibrance), Контраст
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3];
    if (a === 0) continue; // Прозрачный пиксель

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Вычисляем яркость по Rec.709
    const lumInt = Math.min(255, (54 * r + 183 * g + 19 * b) >> 8);
    const gain = gainLut[lumInt];

    // Применяем tone mapping gain
    r = Math.min(255, Math.max(0, r * gain));
    g = Math.min(255, Math.max(0, g * gain));
    b = Math.min(255, Math.max(0, b * gain));

    // Smart Vibrance: избирательное усиление ненасыщенных оттенков
    if (vibrance > 0) {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

      // Чем менее насыщен пиксель, тем сильнее буст
      let vBoost = vibrance * (1.0 - sat) * 1.6;

      // Защита оттенков кожи (теплые тона: R > G > B, умеренный saturation)
      if (protectSkin && r > g && g > b && (r - g) >= 12 && (g - b) >= 6 && r > 60) {
        vBoost *= 0.35; // Снижаем сочность на лицах, избегая эффекта пережарки
      }

      const curLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = Math.min(255, Math.max(0, curLum + (r - curLum) * (1.0 + vBoost)));
      g = Math.min(255, Math.max(0, curLum + (g - curLum) * (1.0 + vBoost)));
      b = Math.min(255, Math.max(0, curLum + (b - curLum) * (1.0 + vBoost)));
    }

    // Общий контраст
    if (contrast !== 0) {
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
    }

    data[i]     = r | 0;
    data[i + 1] = g | 0;
    data[i + 2] = b | 0;

    if (luminanceBuffer) {
      luminanceBuffer[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  // ПАСС 2: Локальный микроконтраст (Clarity) и фильтр резкости (Unsharp Mask 3x3)
  if (luminanceBuffer && (clarity > 0 || sharpness > 0)) {
    const kClarity = clarity * 1.75;
    const kSharp = sharpness * 1.45;

    // Внутренняя свертка по буферу яркости
    for (let y = 1; y < height - 1; y++) {
      const yOffset = y * width;
      const yPrev = (y - 1) * width;
      const yNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = yOffset + x;
        const curLum = luminanceBuffer[idx];

        // 4 ортогональных соседа
        const lumUp    = luminanceBuffer[yPrev + x];
        const lumDown  = luminanceBuffer[yNext + x];
        const lumLeft  = luminanceBuffer[yOffset + x - 1];
        const lumRight = luminanceBuffer[yOffset + x + 1];

        // 4 диагональных соседа
        const lumUL = luminanceBuffer[yPrev + x - 1];
        const lumUR = luminanceBuffer[yPrev + x + 1];
        const lumDL = luminanceBuffer[yNext + x - 1];
        const lumDR = luminanceBuffer[yNext + x + 1];

        // Локальное среднее для Clarity (окно 3x3)
        const localMean = (lumUp + lumDown + lumLeft + lumRight + lumUL + lumUR + lumDL + lumDR + curLum) * 0.111111;
        const deltaClarity = curLum - localMean;

        // Мягкое насыщение микроконтраста (soft-knee кривая f(d) = d / (1 + |d| / 28) без гало-ореолов)
        const absD = Math.abs(deltaClarity);
        const clarityDelta = kClarity * (deltaClarity / (1.0 + absD * 0.035));

        // Лапласиан резкости контуров (Unsharp Mask 3x3)
        const laplacian = (curLum * 4.0) - (lumUp + lumDown + lumLeft + lumRight);

        // Пороговая фильтрация шума (threshold): слабый шум не разгоняем
        let sharpDelta = 0;
        if (Math.abs(laplacian) > 2.0) {
          sharpDelta = kSharp * Math.min(26.0, Math.max(-26.0, laplacian * 0.42));
        }

        const totalBoost = clarityDelta + sharpDelta;
        if (totalBoost !== 0) {
          const pixelOffset = idx * 4;
          if (data[pixelOffset + 3] === 0) continue; // Сохраняем прозрачные пиксели
          data[pixelOffset]     = Math.min(255, Math.max(0, data[pixelOffset]     + totalBoost));
          data[pixelOffset + 1] = Math.min(255, Math.max(0, data[pixelOffset + 1] + totalBoost));
          data[pixelOffset + 2] = Math.min(255, Math.max(0, data[pixelOffset + 2] + totalBoost));
        }
      }
    }
  }

  return imageData;
}

/**
 * Применяет HDR-обработку напрямую к HTMLCanvasElement
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object|string} [config]
 * @returns {HTMLCanvasElement}
 */
function applyHdrToCanvas(canvas, config = {}) {
  if (!canvas || !canvas.getContext) {
    throw new Error('Некорректный элемент canvas');
  }
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyHdrToImageData(imgData, config);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
/**
 * Создает чистый растровый холст афиши (Artboard), аппаратно обрезанный
 * строго по границам [0, 0, currentSize.w, currentSize.h] без монтажного стола,
 * без выступающих за края частей и без служебных маркеров выделения.
 *
 * @param {fabric.Canvas} fabricCanvas
 * @param {number} multiplier
 * @returns {HTMLCanvasElement}
 */
function renderCleanArtboardCanvas(fabricCanvas, multiplier = 1.0) {
  if (!fabricCanvas) {
    throw new Error('Fabric.js Canvas не инициализирован');
  }

  const origW = (typeof currentSize !== 'undefined' && currentSize?.w) ? currentSize.w : (fabricCanvas.getWidth ? fabricCanvas.getWidth() : (fabricCanvas.width || 800));
  const origH = (typeof currentSize !== 'undefined' && currentSize?.h) ? currentSize.h : (fabricCanvas.getHeight ? fabricCanvas.getHeight() : (fabricCanvas.height || 600));
  const mult = Math.max(0.01, multiplier || 1.0);
  const targetW = Math.max(1, Math.round(origW * mult));
  const targetH = Math.max(1, Math.round(origH * mult));

  const activeObj = fabricCanvas.getActiveObject ? fabricCanvas.getActiveObject() : null;
  let selectedObjects = null;
  if (activeObj && activeObj.type === 'activeSelection') {
    selectedObjects = activeObj.getObjects();
  }

  try {
    fabricCanvas._isExporting = true;
    if (activeObj && fabricCanvas.discardActiveObject) {
      fabricCanvas.discardActiveObject();
    }

    const buffer = document.createElement('canvas');
    buffer.width = targetW;
    buffer.height = targetH;
    const ctx = buffer.getContext('2d');

    // 1. Отрисовка цвета фона листа (Paper Background)
    const artboardBg = fabricCanvas.__artboardBg || fabricCanvas.backgroundColor || '#ffffff';
    if (artboardBg && artboardBg !== 'transparent' && artboardBg !== '') {
      if (typeof artboardBg === 'string') {
        ctx.fillStyle = artboardBg;
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (typeof artboardBg.toLive === 'function') {
        try {
          ctx.fillStyle = artboardBg.toLive(ctx);
          ctx.fillRect(0, 0, targetW, targetH);
        } catch (e) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // 2. АППАРАТНОЕ КАДРИРОВАНИЕ СТРОГО ПО ГРАНИЦАМ ЛИСТА [0, 0, targetW, targetH]
    // Любые части объектов за пределами листа отсекаются аппаратно (ctx.clip)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, targetW, targetH);
    ctx.clip();

    // 3. Масштабирование системы координат в целевое разрешение
    ctx.scale(mult, mult);

    // 4. Отрисовка всех объектов афиши в порядке слоёв
    const objects = fabricCanvas.getObjects ? fabricCanvas.getObjects() : [];
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj && obj.visible !== false && !obj.__isHelper) {
        obj.render(ctx);
      }
    }
    ctx.restore();

    return buffer;
  } finally {
    fabricCanvas._isExporting = false;
    if (activeObj) {
      if (selectedObjects && selectedObjects.length > 0 && typeof fabric !== 'undefined' && fabric.ActiveSelection) {
        const sel = new fabric.ActiveSelection(selectedObjects, { canvas: fabricCanvas });
        if (fabricCanvas.setActiveObject) fabricCanvas.setActiveObject(sel);
      } else if (!selectedObjects && fabricCanvas.contains && fabricCanvas.contains(activeObj)) {
        if (fabricCanvas.setActiveObject) fabricCanvas.setActiveObject(activeObj);
      }
    }
    if (fabricCanvas.requestRenderAll) {
      fabricCanvas.requestRenderAll();
    }
  }
}

/**
 * Рендерит холст Fabric.js с заданным коэффициентом масштабирования (multiplier)
 * на скрытый буферный Canvas без искажения текущего вида в редакторе
 *
 * @param {fabric.Canvas} fabricCanvas
 * @param {number} multiplier
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderFabricToBuffer(fabricCanvas, multiplier = 1.0) {
  if (!fabricCanvas) {
    throw new Error('Fabric.js Canvas не инициализирован');
  }
  return renderCleanArtboardCanvas(fabricCanvas, multiplier);
}

/**
 * 3. ФУНКЦИЯ ЭКСПОРТА ВСЕЙ АФИШИ (1K, 2K, 4K, 8K, HDR, PNG/JPG/PDF)
 *
 * @param {fabric.Canvas} fabricCanvas - Экземпляр холста Fabric.js
 * @param {object} [options] - Параметры экспорта:
 *   - resolution: '1k' | '2k' | '4k' | '8k' | 'original' (по умолчанию '2k')
 *   - format: 'png' | 'jpg' | 'jpeg' | 'pdf' (по умолчанию 'png')
 *   - hdr: true | false | string presetName | object config (по умолчанию true)
 *   - hdrPreset: 'cinematic' | 'light' | 'vivid' | 'print'
 *   - quality: качество JPG (по умолчанию 0.95)
 *   - filename: имя сохраняемого файла без расширения
 *   - download: авто-скачивание файла (по умолчанию true)
 * @returns {Promise<object>} Результат экспорта с метаданными и ссылками
 */
async function exportPoster(fabricCanvas, options = {}) {
  const canvasInst = fabricCanvas || (typeof window !== 'undefined' ? window.canvas : null);
  if (!canvasInst) {
    throw new Error('Холст не найден');
  }

  const resolution = options.resolution || options.targetResolution || '2k';
  const format = String(options.format || 'png').toLowerCase();
  const quality = options.quality ?? 0.95;
  const isHdr = options.hdr !== false;
  const presetKey = options.hdrPreset || (typeof options.hdr === 'string' ? options.hdr : 'cinematic');
  const rawFilename = options.filename || 'Афиша';
  const filename = String(rawFilename).replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Афиша';
  const shouldDownload = options.download !== false;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  // 1. Расчёт целевого масштаба и проверка лимитов памяти Canvas
  if (onProgress) onProgress(15, `Подготовка холста (${resolution.toUpperCase()})...`);
  await new Promise(r => setTimeout(r, 25));

  const origW = (typeof currentSize !== 'undefined' && currentSize?.w) ? currentSize.w : (canvasInst.getWidth ? canvasInst.getWidth() : (canvasInst.width || 800));
  const origH = (typeof currentSize !== 'undefined' && currentSize?.h) ? currentSize.h : (canvasInst.getHeight ? canvasInst.getHeight() : (canvasInst.height || 600));
  const scaleInfo = calculateExportScale(origW, origH, resolution, options);

  if (onProgress) onProgress(35, `Суперсэмплинг холста (${scaleInfo.targetWidth} × ${scaleInfo.targetHeight} px)...`);
  await new Promise(r => setTimeout(r, 25));

  // 2. Рендеринг на скрытый буферный Canvas в сверхвысоком разрешении
  const bufferCanvas = await renderFabricToBuffer(canvasInst, scaleInfo.multiplier);

  // 3. Применение HDR и фильтра резкости к буферному холсту
  if (isHdr) {
    if (onProgress) onProgress(65, 'Применение HDR тоноотображения и микроконтраста...');
    await new Promise(r => setTimeout(r, 25));
    const hdrConfig = typeof options.hdr === 'object'
      ? options.hdr
      : (HDR_PRESETS[presetKey] || HDR_PRESETS.cinematic);
    applyHdrToCanvas(bufferCanvas, hdrConfig);
  }

  // 4. Формирование целевого формата
  if (onProgress) onProgress(85, `Кодирование файла ${format.toUpperCase()}...`);
  await new Promise(r => setTimeout(r, 25));

  let dataUrl = null;
  let fileExt = 'png';
  const canvasBg = (typeof canvasInst.backgroundColor === 'string' && canvasInst.backgroundColor) ? canvasInst.backgroundColor : '#ffffff';

  if (format === 'jpg' || format === 'jpeg') {
    fileExt = 'jpg';
    // Для JPG создаём непрозрачную подложку (белую или цвет холста)
    const jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = bufferCanvas.width;
    jpgCanvas.height = bufferCanvas.height;
    const jCtx = jpgCanvas.getContext('2d');
    jCtx.fillStyle = options.backgroundColor || canvasBg;
    jCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
    jCtx.drawImage(bufferCanvas, 0, 0);

    dataUrl = jpgCanvas.toDataURL('image/jpeg', quality);
    if (shouldDownload) {
      triggerDownload(dataUrl, `${filename}.${fileExt}`);
    }
  } else if (format === 'pdf') {
    fileExt = 'pdf';
    const jsPdfLib = (typeof window !== 'undefined' ? (window.jspdf?.jsPDF || window.jsPDF) : null);
    if (!jsPdfLib) {
      throw new Error('Библиотека jsPDF не подключена в window.jspdf');
    }

    const isLandscape = origW > origH;
    const pdf = new jsPdfLib({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [origW, origH]
    });

    // Для оптимального веса PDF при сохранении кристальной чёткости используем JPEG 96%
    const jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = bufferCanvas.width;
    jpgCanvas.height = bufferCanvas.height;
    const jCtx = jpgCanvas.getContext('2d');
    jCtx.fillStyle = options.backgroundColor || canvasBg;
    jCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
    jCtx.drawImage(bufferCanvas, 0, 0);

    const pdfImgData = jpgCanvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(pdfImgData, 'JPEG', 0, 0, origW, origH, undefined, 'FAST');

    if (shouldDownload) {
      pdf.save(`${filename}.pdf`);
    }

    if (onProgress) onProgress(100, `Print-PDF (${scaleInfo.targetName}) готов!`);

    return {
      success: true,
      format: 'pdf',
      resolution: scaleInfo.targetResolution,
      scaleInfo,
      width: bufferCanvas.width,
      height: bufferCanvas.height,
      canvas: bufferCanvas,
      pdf
    };
  } else {
    // PNG без потерь (по умолчанию)
    fileExt = 'png';
    dataUrl = bufferCanvas.toDataURL('image/png');
    if (shouldDownload) {
      triggerDownload(dataUrl, `${filename}.${fileExt}`);
    }
  }

  if (onProgress) onProgress(100, `${fileExt.toUpperCase()} (${scaleInfo.targetName}) готов!`);

  return {
    success: true,
    format: fileExt,
    resolution: scaleInfo.targetResolution,
    scaleInfo,
    dataUrl,
    width: bufferCanvas.width,
    height: bufferCanvas.height,
    canvas: bufferCanvas
  };
}

/**
 * Инициатор скачивания файла в браузере
 */
function triggerDownload(url, filename) {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 4. ГЕНЕРАЦИЯ ПРЕВЬЮ «ДО / ПОСЛЕ» (BEFORE / AFTER)
 *
 * @param {fabric.Canvas|fabric.Image|HTMLCanvasElement|HTMLImageElement} source
 * @param {object} [options]
 * @returns {object} Превью холсты и функция отрисовки сплиттера
 */
function generateBeforeAfterPreview(source, options = {}) {
  let srcCanvas;

  if (source && typeof source.getElement === 'function') {
    // fabric.Image
    const el = source.__originalElement || source.getElement();
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = el.naturalWidth || el.width || 800;
    srcCanvas.height = el.naturalHeight || el.height || 600;
    srcCanvas.getContext('2d').drawImage(el, 0, 0, srcCanvas.width, srcCanvas.height);
  } else if (source && (typeof source.getObjects === 'function' || source.lowerCanvasEl || typeof source.toDataURL === 'function')) {
    // fabric.Canvas: точный, мгновенный и чистый рендеринг листа афиши
    const origW = (typeof currentSize !== 'undefined' && currentSize?.w) ? currentSize.w : (source.getWidth ? source.getWidth() : (source.width || 800));
    const origH = (typeof currentSize !== 'undefined' && currentSize?.h) ? currentSize.h : (source.getHeight ? source.getHeight() : (source.height || 600));
    const maxPrevDim = options.maxWidth || 1200;
    const longSide = Math.max(origW, origH);
    const previewMultiplier = Math.min(1.0, maxPrevDim / Math.max(1, longSide));

    srcCanvas = renderCleanArtboardCanvas(source, previewMultiplier);
  } else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
    srcCanvas = source;
  } else if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = source.naturalWidth || source.width;
    srcCanvas.height = source.naturalHeight || source.height;
    srcCanvas.getContext('2d').drawImage(source, 0, 0);
  } else {
    throw new Error('Неподдерживаемый тип источника для генерации превью');
  }

  // Ограничиваем размер превью для мгновенного отклика (макс 1200px)
  const maxPrevDim = options.maxWidth || 1200;
  let prevW = srcCanvas.width;
  let prevH = srcCanvas.height;
  if (prevW > maxPrevDim || prevH > maxPrevDim) {
    const scale = maxPrevDim / Math.max(prevW, prevH);
    prevW = Math.round(prevW * scale);
    prevH = Math.round(prevH * scale);
  }

  // Холст "ДО" (Оригинал)
  const beforeCanvas = document.createElement('canvas');
  beforeCanvas.width = prevW;
  beforeCanvas.height = prevH;
  beforeCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, prevW, prevH);

  // Холст "ПОСЛЕ" (HDR)
  const afterCanvas = document.createElement('canvas');
  afterCanvas.width = prevW;
  afterCanvas.height = prevH;
  const afterCtx = afterCanvas.getContext('2d');
  afterCtx.drawImage(srcCanvas, 0, 0, prevW, prevH);

  const presetKey = options.preset || 'cinematic';
  const presetConfig = { ...(HDR_PRESETS[presetKey] || HDR_PRESETS.cinematic), ...(options.hdr || {}) };
  applyHdrToCanvas(afterCanvas, presetConfig);

  // Сводный холст с интерактивной линией сравнения
  const compCanvas = document.createElement('canvas');
  compCanvas.width = prevW;
  compCanvas.height = prevH;
  const compCtx = compCanvas.getContext('2d');

  function renderSplit(splitRatio = 0.5) {
    splitRatio = Math.max(0.0, Math.min(1.0, splitRatio));
    const splitX = Math.round(prevW * splitRatio);

    compCtx.clearRect(0, 0, prevW, prevH);

    // Левая половина: ДО (Оригинал)
    compCtx.save();
    compCtx.beginPath();
    compCtx.rect(0, 0, splitX, prevH);
    compCtx.clip();
    compCtx.drawImage(beforeCanvas, 0, 0);
    compCtx.restore();

    // Правая половина: ПОСЛЕ (HDR)
    compCtx.save();
    compCtx.beginPath();
    compCtx.rect(splitX, 0, prevW - splitX, prevH);
    compCtx.clip();
    compCtx.drawImage(afterCanvas, 0, 0);
    compCtx.restore();

    // Разделительная линия
    compCtx.save();
    compCtx.strokeStyle = '#ffffff';
    compCtx.lineWidth = 2.5;
    compCtx.shadowColor = 'rgba(0,0,0,0.55)';
    compCtx.shadowBlur = 6;
    compCtx.beginPath();
    compCtx.moveTo(splitX, 0);
    compCtx.lineTo(splitX, prevH);
    compCtx.stroke();

    // Центральная круглая ручка
    const centerY = prevH / 2;
    compCtx.fillStyle = '#ffffff';
    compCtx.beginPath();
    compCtx.arc(splitX, centerY, 16, 0, Math.PI * 2);
    compCtx.fill();

    compCtx.fillStyle = '#0f172a';
    compCtx.font = 'bold 11px sans-serif';
    compCtx.textAlign = 'center';
    compCtx.textBaseline = 'middle';
    compCtx.fillText('◀ ▶', splitX, centerY);

    // Бейджи "ДО" и "ПОСЛЕ"
    drawComparisonBadge(compCtx, options.labelBefore || 'ДО', 16, 20, '#64748b');
    drawComparisonBadge(compCtx, options.labelAfter || 'ПОСЛЕ (HDR)', prevW - 16, 20, '#0d99ff', true);

    compCtx.restore();
    return compCanvas;
  }

  function drawComparisonBadge(ctx, text, x, y, accentColor, alignRight = false) {
    ctx.font = 'bold 11px sans-serif';
    const textW = ctx.measureText(text).width;
    const badgeW = textW + 18;
    const badgeH = 24;
    const drawX = alignRight ? x - badgeW : x;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(drawX + r, y);
    ctx.lineTo(drawX + badgeW - r, y);
    ctx.quadraticCurveTo(drawX + badgeW, y, drawX + badgeW, y + r);
    ctx.lineTo(drawX + badgeW, y + badgeH - r);
    ctx.quadraticCurveTo(drawX + badgeW, y + badgeH, drawX + badgeW - r, y + badgeH);
    ctx.lineTo(drawX + r, y + badgeH);
    ctx.quadraticCurveTo(drawX, y + badgeH, drawX, y + badgeH - r);
    ctx.lineTo(drawX, y + r);
    ctx.quadraticCurveTo(drawX, y, drawX + r, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, drawX + 9, y + badgeH / 2);
  }

  renderSplit(options.splitRatio ?? 0.5);

  return {
    beforeCanvas,
    afterCanvas,
    comparisonCanvas: compCanvas,
    renderSplit,
    beforeDataUrl: beforeCanvas.toDataURL('image/jpeg', 0.92),
    afterDataUrl: afterCanvas.toDataURL('image/jpeg', 0.92),
    comparisonDataUrl: compCanvas.toDataURL('image/jpeg', 0.92),
    /**
     * Создаёт интерактивный слайдер в DOM контейнере
     */
    mountInteractiveSlider(container) {
      if (!container) return;
      container.innerHTML = '';
      container.style.position = 'relative';
      container.style.userSelect = 'none';
      container.style.cursor = 'ew-resize';

      compCanvas.style.maxWidth = '100%';
      compCanvas.style.height = 'auto';
      compCanvas.style.display = 'block';
      container.appendChild(compCanvas);

      let isDragging = false;
      const updateRatioFromEvent = (e) => {
        const rect = compCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const ratio = (clientX - rect.left) / rect.width;
        renderSplit(ratio);
      };

      compCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateRatioFromEvent(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (isDragging) updateRatioFromEvent(e);
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      compCanvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        updateRatioFromEvent(e);
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (isDragging) updateRatioFromEvent(e);
      }, { passive: true });
      window.addEventListener('touchend', () => {
        isDragging = false;
      });
    }
  };
}

/**
 * 5. УЛУЧШЕНИЕ КОНКРЕТНОГО ИЗОБРАЖЕНИЯ НА ХОЛСТЕ (fabric.Image)
 *
 * @param {fabric.Image} fabricImage - Выделенное изображение на холсте
 * @param {object} [options] - Настройки (preset, autoBalance, hdr)
 * @returns {Promise<object>}
 */
async function enhanceFabricImage(fabricImage, options = {}) {
  if (!fabricImage || fabricImage.type !== 'image') {
    throw new Error('Объект не является изображением fabric.Image');
  }

  const el = fabricImage.getElement();
  if (!el) {
    throw new Error('Элемент изображения не найден');
  }

  // Кэшируем исходный элемент для возможности отката
  if (!fabricImage.__originalElement) {
    fabricImage.__originalElement = el;
    fabricImage.__originalSrc = el.src || '';
  }

  const baseEl = fabricImage.__originalElement || el;
  const w = baseEl.naturalWidth || baseEl.width || 800;
  const h = baseEl.naturalHeight || baseEl.height || 600;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const ctx = offCanvas.getContext('2d');
  ctx.drawImage(baseEl, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);

  // 1. Авто-баланс белого и уровней
  if (options.autoBalance !== false) {
    applyAutoBalanceToImageData(imgData, options);
  }

  // 2. HDR-обработка
  const presetKey = options.preset || 'cinematic';
  const preset = HDR_PRESETS[presetKey] || HDR_PRESETS.cinematic;
  const hdrConfig = { ...preset, ...(options.hdr || {}) };
  applyHdrToImageData(imgData, hdrConfig);

  ctx.putImageData(imgData, 0, 0);

  // Обновляем fabricImage новым улучшенным холстом
  fabricImage.setElement(offCanvas);
  fabricImage.__isHdrEnhanced = true;
  fabricImage.__currentHdrPreset = presetKey;
  fabricImage.dirty = true;

  if (typeof fabricImage.applyFilters === 'function') {
    fabricImage.applyFilters();
  }
  if (fabricImage.canvas && typeof fabricImage.canvas.renderAll === 'function') {
    fabricImage.canvas.renderAll();
  }

  return {
    success: true,
    preset: presetKey,
    canvas: offCanvas,
    dataUrl: offCanvas.toDataURL('image/png')
  };
}

/**
 * Откат изображения к оригинальному состоянию
 *
 * @param {fabric.Image} fabricImage
 * @returns {boolean}
 */
function restoreOriginalFabricImage(fabricImage) {
  if (!fabricImage || !fabricImage.__originalElement) return false;

  fabricImage.setElement(fabricImage.__originalElement);
  fabricImage.__isHdrEnhanced = false;
  fabricImage.__currentHdrPreset = null;
  fabricImage.dirty = true;

  if (typeof fabricImage.applyFilters === 'function') {
    fabricImage.applyFilters();
  }
  if (fabricImage.canvas && typeof fabricImage.canvas.renderAll === 'function') {
    fabricImage.canvas.renderAll();
  }
  return true;
}

/**
 * Единый объект модуля PosterEnhancer
 */
const PosterEnhancer = {
  renderCleanArtboardCanvas,
  calculateExportScale,
  applyHdrToImageData,
  applyHdrToCanvas,
  applyAutoBalanceToImageData,
  exportPoster,
  generateBeforeAfterPreview,
  enhanceFabricImage,
  restoreOriginalFabricImage,
  HDR_PRESETS,
  RESOLUTION_TARGETS,
  CANVAS_LIMITS
};

// Экспорт в глобальный объект window для классических скриптов браузера и Fabric.js UI
if (typeof window !== 'undefined') {
  window.PosterEnhancer = PosterEnhancer;
  window.renderCleanArtboardCanvas = renderCleanArtboardCanvas;
  window.calculateExportScale = calculateExportScale;
  window.applyHdrToCanvas = applyHdrToCanvas;
  window.applyHdrToImageData = applyHdrToImageData;
  window.exportPoster = exportPoster;
  window.generateBeforeAfterPreview = generateBeforeAfterPreview;
  window.enhanceFabricImage = enhanceFabricImage;
  window.restoreOriginalFabricImage = restoreOriginalFabricImage;
  window.HDR_PRESETS = HDR_PRESETS;
  window.RESOLUTION_TARGETS = RESOLUTION_TARGETS;
} else if (typeof globalThis !== 'undefined') {
  globalThis.PosterEnhancer = PosterEnhancer;
}

// Экспорт для Node.js CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PosterEnhancer;
}

