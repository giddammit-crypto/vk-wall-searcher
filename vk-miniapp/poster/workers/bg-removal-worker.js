/**
 * Aurora Design — Background Removal Web Worker
 * Uses Transformers.js (RMBG-1.4 by BRIA AI via ONNX Runtime Web / WebGPU / WASM)
 * with robust perceptual fallback and zero-copy transfer.
 */

// Model ID for RMBG in Transformers.js
const MODEL_ID = 'briaai/RMBG-1.4';
const MODEL_LOAD_TIMEOUT = 2800; // Strict timeout (2.8s) for HuggingFace model download

let transformers = null;
let model = null;
let processor = null;
let isModelLoading = false;
let modelLoadFailed = false;
let currentModelLoadPromise = null;

// Progress notification helper
function sendProgress(pct, msg) {
  self.postMessage({ type: 'progress', pct: Math.round(pct), msg: msg || '' });
}

function withTimeout(promise, ms, errorMsg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg || `Превышен лимит времени ожидания (${ms}мс)`));
    }, ms);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Dynamically import Transformers.js (supports ESM or CDN)
 */
async function getTransformers() {
  if (transformers) return transformers;
  
  // Try importing from CDN if in worker environment
  try {
    // Try latest Xenova / Hugging Face Transformers.js ESM bundle
    transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');
  } catch (err1) {
    try {
      transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    } catch (err2) {
      console.warn('[RMBG Worker] Failed to load Transformers.js from CDN:', err1, err2);
      throw new Error('Не удалось загрузить Transformers.js библиотеку');
    }
  }

  if (transformers && transformers.env) {
    transformers.env.allowLocalModels = false;
    transformers.env.useBrowserCache = true;
  }
  return transformers;
}

/**
 * Load the RMBG-1.4 model with a strict timeout
 */
async function loadModel(progressCb) {
  if (model && processor) return { model, processor };
  if (modelLoadFailed) {
    throw new Error('Модель RMBG-1.4 недоступна (таймаут или сбой загрузки)');
  }
  if (isModelLoading && currentModelLoadPromise) {
    return await currentModelLoadPromise;
  }

  isModelLoading = true;
  modelLoadFailed = false;

  const loadOperation = (async () => {
    progressCb(5, 'Подключение к AI библиотеке...');
    const tf = await getTransformers();
    const { AutoModel, AutoProcessor } = tf;

    progressCb(15, 'Загрузка процессора RMBG-1.4...');
    processor = await AutoProcessor.from_pretrained(MODEL_ID, {
      progress_callback: (info) => {
        if (info && info.status === 'progress' && info.total) {
          const pct = 15 + Math.round((info.loaded / info.total) * 25);
          progressCb(pct, `Загрузка процессора: ${Math.round((info.loaded || 0) / 1024 / 1024)}MB`);
        }
      }
    });

    progressCb(40, 'Загрузка нейросети RMBG-1.4 (WebGPU/WASM)...');
    
    // Attempt WebGPU first for 5-10x speed, fall back to WASM
    try {
      model = await AutoModel.from_pretrained(MODEL_ID, {
        device: 'webgpu',
        dtype: 'fp16',
        progress_callback: (info) => {
          if (info && info.status === 'progress' && info.total) {
            const pct = 40 + Math.round((info.loaded / info.total) * 55);
            progressCb(pct, `Загрузка весов модели: ${Math.round((info.loaded || 0) / 1024 / 1024)}MB`);
          }
        }
      });
      console.log('[RMBG Worker] Loaded model using WebGPU');
    } catch (gpuErr) {
      console.warn('[RMBG Worker] WebGPU unavailable, switching to WASM fallback:', gpuErr);
      progressCb(60, 'Инициализация WASM fallback...');
      model = await AutoModel.from_pretrained(MODEL_ID, {
        device: 'wasm',
        dtype: 'fp32',
        progress_callback: (info) => {
          if (info && info.status === 'progress' && info.total) {
            const pct = 60 + Math.round((info.loaded / info.total) * 35);
            progressCb(pct, `Загрузка модели (WASM): ${Math.round((info.loaded || 0) / 1024 / 1024)}MB`);
          }
        }
      });
      console.log('[RMBG Worker] Loaded model using WASM');
    }

    progressCb(100, 'Нейросеть готова');
    return { model, processor };
  })();

  currentModelLoadPromise = withTimeout(
    loadOperation,
    MODEL_LOAD_TIMEOUT,
    'Таймаут загрузки модели RMBG-1.4 (сеть HuggingFace недоступна или заблокирована)'
  );

  try {
    const res = await currentModelLoadPromise;
    isModelLoading = false;
    currentModelLoadPromise = null;
    return res;
  } catch (err) {
    isModelLoading = false;
    modelLoadFailed = true;
    currentModelLoadPromise = null;
    console.warn('[RMBG Worker] Model load error/timeout, using fallback:', err.message);
    throw err;
  }
}

/**
 * Algorithmic Smart Fallback: Perceptual Color Matting + Defringing + BFS
 * When model cannot be loaded (offline / CDN blocked / WebGPU unsupported)
 */
function algorithmicFallbackRemoveBg(imageDataArray, width, height, tolerance = 28, feather = 2) {
  const data = new Uint8ClampedArray(imageDataArray.buffer ? imageDataArray.buffer.slice(0) : imageDataArray.slice(0));
  
  // Helper for color distance
  function perceptualColorDist(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
    );
  }

  // Collect background color samples from corners and perimeter
  const samples = [];
  const stepX = Math.max(1, Math.floor(width / 30));
  const stepY = Math.max(1, Math.floor(height / 30));

  function addSample(x, y) {
    const idx = (y * width + x) * 4;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
  }

  for (let x = 0; x < width; x += stepX) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  const tolDist = (tolerance / 100) * 440 + 10;
  const softTol = tolDist + 24;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  function pushQueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  }

  // Seed boundary
  for (let x = 0; x < width; x++) { pushQueue(x, 0); pushQueue(x, height - 1); }
  for (let y = 0; y < height; y++) { pushQueue(0, y); pushQueue(width - 1, y); }

  while (head < tail) {
    const idx = queue[head++];
    const pi = idx * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];

    let minDist = Infinity;
    for (let s = 0; s < samples.length; s++) {
      const d = perceptualColorDist(r, g, b, samples[s].r, samples[s].g, samples[s].b);
      if (d < minDist) minDist = d;
      if (minDist <= tolDist) break;
    }

    if (minDist <= tolDist) {
      data[pi + 3] = 0;
      const x = idx % width;
      const y = Math.floor(idx / width);
      pushQueue(x + 1, y);
      pushQueue(x - 1, y);
      pushQueue(x, y + 1);
      pushQueue(x, y - 1);
    } else if (minDist <= softTol) {
      const alphaFactor = (minDist - tolDist) / (softTol - tolDist);
      data[pi + 3] = Math.round(data[pi + 3] * alphaFactor);
    }
  }

  // Defringe & feather
  if (feather > 0) {
    const origAlpha = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) origAlpha[i] = data[i * 4 + 3];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const curA = origAlpha[i];
        if (curA > 0 && curA < 255) {
          const avg = (
            origAlpha[i - 1] + origAlpha[i + 1] +
            origAlpha[i - width] + origAlpha[i + width]
          ) / 4;
          data[i * 4 + 3] = Math.round(curA * 0.5 + avg * 0.5);
        }
      }
    }
  }

  return data;
}

/**
 * Run RMBG Neural Inference
 */
async function removeBgML(imageDataArray, width, height, progressCb) {
  const tf = await getTransformers();
  const { RawImage } = tf;

  progressCb(20, 'Подготовка изображения...');
  const rawImage = new RawImage(
    new Uint8ClampedArray(imageDataArray.buffer || imageDataArray),
    width,
    height,
    4
  );

  progressCb(35, 'Подготовка нейросетевых тензоров...');
  const { pixel_values } = await processor(rawImage);

  progressCb(55, 'Нейросеть RMBG-1.4 сегментирует фон...');
  const output = await model({ input: pixel_values });

  progressCb(75, 'Постобработка альфа-маски...');
  
  // Extract output mask
  const outTensor = output.output || output[0];
  const dims = outTensor.dims;
  const outH = dims[dims.length - 2];
  const outW = dims[dims.length - 1];

  let maskRaw;
  if (outTensor.data) {
    maskRaw = new Uint8ClampedArray(outTensor.data.length);
    for (let i = 0; i < outTensor.data.length; i++) {
      maskRaw[i] = Math.round(Math.min(1, Math.max(0, outTensor.data[i])) * 255);
    }
  } else {
    const list = outTensor.squeeze().tolist();
    const flat = list.flat(2);
    maskRaw = new Uint8ClampedArray(flat.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255)));
  }

  const maskImage = new RawImage(maskRaw, outW, outH, 1);
  const resizedMask = await maskImage.resize(width, height);

  progressCb(90, 'Формирование финального изображения...');
  const resultData = new Uint8ClampedArray(width * height * 4);
  const maskData = resizedMask.data;

  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    resultData[pi]     = imageDataArray[pi];
    resultData[pi + 1] = imageDataArray[pi + 1];
    resultData[pi + 2] = imageDataArray[pi + 2];
    resultData[pi + 3] = maskData[i];
  }

  progressCb(100, 'Готово!');
  return resultData;
}

/**
 * Message handler
 */
self.onmessage = async (e) => {
  const { type, imageData, width, height, options } = e.data || {};

  if (type === 'init' || type === 'preload') {
    try {
      await loadModel(sendProgress);
      self.postMessage({ type: 'ready' });
    } catch (err) {
      console.warn('[RMBG Worker] Preload notice:', err.message);
      self.postMessage({ type: 'ready_fallback', error: err.message });
    }
    return;
  }

  if (type === 'remove-bg') {
    try {
      let finalData;
      let usedMethod = 'ml';

      try {
        await loadModel(sendProgress);
        finalData = await removeBgML(imageData, width, height, sendProgress);
      } catch (mlErr) {
        console.warn('[RMBG Worker] ML inference failed or timed out, using perceptual fallback:', mlErr.message || mlErr);
        sendProgress(50, 'Применение адаптивного AI-контура (fallback)...');
        finalData = algorithmicFallbackRemoveBg(imageData, width, height, options?.tolerance ?? 28, options?.feather ?? 2);
        usedMethod = 'fallback';
      }

      sendProgress(100, 'Завершено');
      self.postMessage(
        {
          type: 'result',
          data: finalData,
          width,
          height,
          method: usedMethod
        },
        [finalData.buffer] // zero-copy transfer
      );
    } catch (err) {
      console.error('[RMBG Worker] Removal error:', err);
      self.postMessage({ type: 'error', error: err.message || String(err) });
    }
  }
};
