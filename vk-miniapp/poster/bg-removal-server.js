/**
 * Aurora Design — Background Removal Server Client
 * Communicates with the rembg Python FastAPI service (Tier 1: BiRefNet / RMBG-2.0).
 */

(function (window) {
  'use strict';

  // Configurable server endpoint
  const DEFAULT_BG_API_URL = window.BG_API_URL || 'http://localhost:8000';

  /**
   * Check if server API is healthy and reachable
   * @param {string} [baseUrl]
   * @param {number} [timeoutMs]
   * @returns {Promise<boolean>}
   */
  async function checkServerAvailable(baseUrl = DEFAULT_BG_API_URL, timeoutMs = 2500) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return data && data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Remove background using rembg Python FastAPI
   * @param {HTMLCanvasElement|Blob} source 
   * @param {Object} [options]
   * @returns {Promise<{ imageData: ImageData, method: string, width: number, height: number }>}
   */
  async function removeBackgroundServer(source, options = {}) {
    const {
      baseUrl = DEFAULT_BG_API_URL,
      alphaMatting = true,
      fgThreshold = 240,
      bgThreshold = 10,
      erodeSize = 10,
      onProgress = () => {}
    } = options;

    onProgress(10, 'Подготовка изображения для сервера...');

    let blob;
    let width = 0;
    let height = 0;

    if (source instanceof HTMLCanvasElement) {
      width = source.width;
      height = source.height;
      blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
    } else if (source instanceof Blob) {
      blob = source;
    } else {
      throw new Error('Некорректный источник для серверного вырезания');
    }

    const formData = new FormData();
    formData.append('file', blob, 'image.png');
    formData.append('alpha_matting', String(!!alphaMatting));
    formData.append('foreground_threshold', String(fgThreshold));
    formData.append('background_threshold', String(bgThreshold));
    formData.append('erode_size', String(erodeSize));

    onProgress(30, 'Отправка на AI-сервер...');

    const res = await fetch(`${baseUrl}/remove-bg`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка сервера ${res.status}`);
    }

    onProgress(70, 'Серверная нейросеть BiRefNet обработала кадр...');

    const resBlob = await res.blob();
    const bitmap = await createImageBitmap(resBlob);
    const finalW = width || bitmap.width;
    const finalH = height || bitmap.height;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = finalW;
    tmpCanvas.height = finalH;
    const ctx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, finalW, finalH);

    onProgress(100, 'Готово!');

    return {
      imageData: ctx.getImageData(0, 0, finalW, finalH),
      canvas: tmpCanvas,
      method: 'server-birefnet',
      width: finalW,
      height: finalH
    };
  }

  window.AuroraBgRemovalServer = {
    checkServerAvailable,
    removeBackgroundServer
  };

})(window);
