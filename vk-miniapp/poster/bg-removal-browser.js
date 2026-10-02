/**
 * Aurora Design — In-Browser Background Removal Client
 * Coordinates the Web Worker running RMBG-1.4 / Perceptual Fallback.
 */

(function (window) {
  'use strict';

  let bgWorker = null;
  let isWorkerReady = false;
  let pendingTasks = [];
  let currentTask = null;

  /**
   * Initialize the ML Web Worker
   */
  function initBgRemovalWorker() {
    if (bgWorker) return bgWorker;

    try {
      // Determine worker path relative to current page
      const workerUrl = new URL('workers/bg-removal-worker.js', window.location.href).href;
      bgWorker = new Worker(workerUrl, { type: 'module' });

      bgWorker.onmessage = function (e) {
        const data = e.data || {};
        const { type } = data;

        if (type === 'ready' || type === 'ready_fallback') {
          isWorkerReady = true;
          console.log('[BgRemovalBrowser] Worker ready (mode: ' + type + ')');
        } else if (type === 'progress') {
          if (currentTask && typeof currentTask.onProgress === 'function') {
            currentTask.onProgress(data.pct || 0, data.msg || '');
          }
        } else if (type === 'result') {
          if (currentTask) {
            const { resolve } = currentTask;
            const imgData = new ImageData(
              new Uint8ClampedArray(data.data),
              data.width,
              data.height
            );
            currentTask = null;
            resolve({
              imageData: imgData,
              method: data.method || 'browser-ml',
              width: data.width,
              height: data.height
            });
            _processNextTask();
          }
        } else if (type === 'error') {
          if (currentTask) {
            const { reject } = currentTask;
            const err = new Error(data.error || 'Ошибка вырезания фона в worker');
            currentTask = null;
            reject(err);
            _processNextTask();
          }
        }
      };

      bgWorker.onerror = function (err) {
        console.error('[BgRemovalBrowser] Worker onerror:', err);
        if (currentTask) {
          currentTask.reject(new Error('Сбой веб-воркера: ' + (err.message || 'unknown error')));
          currentTask = null;
          _processNextTask();
        }
      };

      // Preload model in background
      bgWorker.postMessage({ type: 'preload' });
    } catch (err) {
      console.warn('[BgRemovalBrowser] Failed to create module worker:', err);
    }

    return bgWorker;
  }

  function _processNextTask() {
    if (currentTask || pendingTasks.length === 0) return;
    currentTask = pendingTasks.shift();
    if (!bgWorker) initBgRemovalWorker();

    if (!bgWorker) {
      currentTask.reject(new Error('Веб-воркер недоступен в этом браузере'));
      currentTask = null;
      return;
    }

    const { imageData, width, height, options } = currentTask;
    // Transfer buffer for zero-copy
    const buffer = imageData.data.buffer;
    bgWorker.postMessage(
      {
        type: 'remove-bg',
        imageData: imageData.data,
        width,
        height,
        options
      },
      [buffer]
    );
  }

  /**
   * Preload ML model
   */
  function preloadBgRemovalModel() {
    initBgRemovalWorker();
  }

  /**
   * Remove background from an HTMLCanvasElement or ImageData
   * @param {HTMLCanvasElement|ImageData} source 
   * @param {Object} options 
   * @returns {Promise<{ imageData: ImageData, method: string, width: number, height: number }>}
   */
  function removeBackgroundBrowser(source, options = {}) {
    return new Promise((resolve, reject) => {
      let width, height, imageData;

      if (source instanceof HTMLCanvasElement) {
        width = source.width;
        height = source.height;
        const ctx = source.getContext('2d', { willReadFrequently: true });
        imageData = ctx.getImageData(0, 0, width, height);
      } else if (source && source.data && source.width && source.height) {
        width = source.width;
        height = source.height;
        imageData = source;
      } else {
        return reject(new Error('Недопустимый источник изображения (требуется Canvas или ImageData)'));
      }

      let timeoutId = null;
      const safeResolve = (res) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(res);
      };
      const safeReject = (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(err);
      };

      // 8 second safety watchdog
      timeoutId = setTimeout(() => {
        safeReject(new Error('Таймаут выполнения в Web Worker'));
      }, 8000);

      pendingTasks.push({
        imageData,
        width,
        height,
        options,
        onProgress: options.onProgress || (() => {}),
        resolve: safeResolve,
        reject: safeReject
      });

      _processNextTask();
    });
  }

  // Export to global scope
  window.AuroraBgRemovalBrowser = {
    initBgRemovalWorker,
    preloadBgRemovalModel,
    removeBackgroundBrowser,
    isReady: () => isWorkerReady
  };

})(window);
