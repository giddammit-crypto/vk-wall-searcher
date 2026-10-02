/**
 * Aurora Design — Background Removal Orchestrator & Controller
 * Three-tier pipeline: Server API (BiRefNet) -> In-Browser ML (RMBG-1.4) -> Smart Edge-aware fallback.
 * Non-destructive Fabric.js image replacement with undo stack and edge refining.
 */

(function (window) {
  'use strict';

  // History stack for Undo support (up to 20 steps)
  const bgRemovalHistory = [];
  const MAX_HISTORY = 20;

  /**
   * Initialize pipeline & preload ML worker
   */
  function initBgRemoval() {
    if (window.AuroraBgRemovalBrowser && typeof window.AuroraBgRemovalBrowser.initBgRemovalWorker === 'function') {
      window.AuroraBgRemovalBrowser.initBgRemovalWorker();
    }
  }

  /**
   * Refine edges (defringe / contract mask / soft feather)
   */
  function refineEdges(canvas, options = {}) {
    if (!canvas) return;
    const { featherRadius = 1.5, contractMask = 1 } = options;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Contract mask slightly to remove color halos
    if (contractMask > 0) {
      const origAlpha = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) origAlpha[i] = data[i * 4 + 3];

      for (let y = contractMask; y < height - contractMask; y++) {
        for (let x = contractMask; x < width - contractMask; x++) {
          const i = y * width + x;
          if (origAlpha[i] > 0) {
            const minNeighbor = Math.min(
              origAlpha[i - 1],
              origAlpha[i + 1],
              origAlpha[i - width],
              origAlpha[i + width]
            );
            if (minNeighbor < 128) {
              data[i * 4 + 3] = Math.min(data[i * 4 + 3], minNeighbor);
            }
          }
        }
      }
    }

    // Soft feathering
    if (featherRadius > 0) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4;
          const a = data[i + 3];
          if (a > 0 && a < 255) {
            const avg = (
              data[((y - 1) * width + x) * 4 + 3] +
              data[((y + 1) * width + x) * 4 + 3] +
              data[(y * width + x - 1) * 4 + 3] +
              data[(y * width + x + 1) * 4 + 3]
            ) / 4;
            data[i + 3] = Math.round(a * 0.6 + avg * 0.4);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Main function: removes background from a Fabric.js image layer
   * @param {fabric.Image} imageLayer 
   * @param {Object} [options]
   */
  async function removeBackground(imageLayer, options = {}) {
    const fCanvas = window.canvas; // Global Fabric canvas in editor
    if (!imageLayer || imageLayer.type !== 'image') {
      if (typeof window.toast === 'function') window.toast('Выберите слой с изображением');
      return;
    }

    const {
      tier = 'auto', // 'auto' | 'server' | 'browser'
      alphaMatting = true,
      tolerance = 28,
      feather = 2
    } = options;

    // 1. Snapshot original src for non-destructive restore
    if (!imageLayer.__originalSrc) {
      imageLayer.__originalSrc = imageLayer.toDataURL ? imageLayer.toDataURL() : (imageLayer.getSrc?.() || imageLayer.getElement()?.src || '');
    }

    // 2. Prepare source offscreen canvas
    const el = imageLayer.getElement();
    const iw = el.naturalWidth  || el.width;
    const ih = el.naturalHeight || el.height;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = iw;
    srcCanvas.height = ih;
    const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(el, 0, 0);

    // Save state in our undo stack
    const backupSrc = imageLayer.toDataURL ? imageLayer.toDataURL() : imageLayer.__originalSrc;
    bgRemovalHistory.push({
      target: imageLayer,
      originalSrc: imageLayer.__originalSrc,
      prevSrc: backupSrc,
      timestamp: Date.now()
    });
    if (bgRemovalHistory.length > MAX_HISTORY) bgRemovalHistory.shift();

    // Fabric save history point before destructive action
    if (typeof window.saveHistory === 'function') {
      window.saveHistory();
    }

    // Progress updates
    const showToast = typeof window.toast === 'function' ? window.toast : console.log;
    showToast('⏳ Удаление фона: анализ нейросетью...');

    const onProgress = (pct, msg) => {
      if (pct % 20 === 0 || pct === 100) {
        showToast(`AI (${pct}%): ${msg || 'обработка...'}`);
      }
    };

    try {
      let resultData = null;
      let usedMethod = 'browser-ml';

      // Tier resolution:
      // На стандартном shared-хостинге (без Python и Node.js) рабочий режим — 100% клиентский In-Browser ML.
      // Режимы 'auto' и 'browser' работают напрямую в браузере клиента через WebGPU/WASM (RMBG-1.4 Web Worker)
      // без задержек на опрос недоступного сервера.
      // Внешний сервер опрашивается ТОЛЬКО если пользователь явно переключил селектор в 'server'.
      let tryServer = (tier === 'server');
      if (tryServer && window.AuroraBgRemovalServer) {
        const isServerUp = await window.AuroraBgRemovalServer.checkServerAvailable();
        if (isServerUp) {
          try {
            console.log('[BgRemovalController] Tier 1: Executing server rembg...');
            const sRes = await window.AuroraBgRemovalServer.removeBackgroundServer(srcCanvas, {
              alphaMatting,
              onProgress
            });
            resultData = sRes.imageData;
            usedMethod = sRes.method;
          } catch (serverErr) {
            console.warn('[BgRemovalController] Server processing failed, falling back to Tier 2:', serverErr);
          }
        }
      }

      // Tier 2: In-browser ML (or fallback worker)
      if (!resultData && window.AuroraBgRemovalBrowser) {
        console.log('[BgRemovalController] Tier 2: Executing in-browser worker ML...');
        const bRes = await window.AuroraBgRemovalBrowser.removeBackgroundBrowser(srcCanvas, {
          tolerance,
          feather,
          onProgress
        });
        resultData = bRes.imageData;
        usedMethod = bRes.method;
      }

      // If both ML options produced no result, create error
      if (!resultData) {
        throw new Error('Не удалось обработать изображение ни одним из методов');
      }

      // Draw result to canvas
      const destCanvas = document.createElement('canvas');
      destCanvas.width = iw;
      destCanvas.height = ih;
      const dCtx = destCanvas.getContext('2d');
      dCtx.putImageData(resultData, 0, 0);

      // Optional edge refinement
      refineEdges(destCanvas, { featherRadius: feather, contractMask: 1 });

      const newPngDataUrl = destCanvas.toDataURL('image/png');

      // 3. Replace Fabric object non-destructively
      fabric.Image.fromURL(newPngDataUrl, (newImg) => {
        newImg.set({
          left:          imageLayer.left,
          top:           imageLayer.top,
          scaleX:        imageLayer.scaleX,
          scaleY:        imageLayer.scaleY,
          angle:         imageLayer.angle,
          originX:       imageLayer.originX || 'left',
          originY:       imageLayer.originY || 'top',
          skewX:         imageLayer.skewX || 0,
          skewY:         imageLayer.skewY || 0,
          selectable:    true,
          evented:       true,
          layerName:     (imageLayer.layerName || 'Фото') + ' (без фона)',
          __originalSrc: imageLayer.__originalSrc,
          __bgRemoved:   true
        });

        if (fCanvas) {
          const idx = fCanvas.getObjects().indexOf(imageLayer);
          fCanvas.remove(imageLayer);
          fCanvas.add(newImg);
          if (idx !== -1) fCanvas.moveTo(newImg, idx);
          fCanvas.setActiveObject(newImg);
          fCanvas.renderAll();
        }

        if (typeof window.updateLayersList === 'function') window.updateLayersList();
        if (typeof window.saveHistory === 'function') window.saveHistory();

        const revertBtn = document.getElementById('btn-bg-revert');
        if (revertBtn) revertBtn.classList.remove('hidden');

        showToast(
          usedMethod.includes('server') 
            ? '✅ Фон удалён сервером (BiRefNet)' 
            : '✅ Фон удалён нейросетью RMBG-1.4'
        );
      });

    } catch (err) {
      console.error('[BgRemovalController] Error removing background:', err);
      showToast('❌ Ошибка удаления фона: ' + (err.message || 'Сбой'));
    }
  }

  /**
   * Undo background removal
   */
  function undoBgRemoval(imageLayer) {
    const fCanvas = window.canvas;
    const targetObj = imageLayer || (fCanvas ? fCanvas.getActiveObject() : null);
    if (!targetObj || !targetObj.__originalSrc) {
      if (typeof window.toast === 'function') window.toast('Нет оригинала для восстановления');
      return false;
    }

    if (typeof window.saveHistory === 'function') window.saveHistory();

    fabric.Image.fromURL(targetObj.__originalSrc, (origImg) => {
      origImg.set({
        left:          targetObj.left,
        top:           targetObj.top,
        scaleX:        targetObj.scaleX,
        scaleY:        targetObj.scaleY,
        angle:         targetObj.angle,
        originX:       targetObj.originX || 'left',
        originY:       targetObj.originY || 'top',
        skewX:         targetObj.skewX || 0,
        skewY:         targetObj.skewY || 0,
        selectable:    true,
        evented:       true,
        layerName:     (targetObj.layerName || 'Фото').replace(' (без фона)', ''),
        __originalSrc: targetObj.__originalSrc
      });

      if (fCanvas) {
        const idx = fCanvas.getObjects().indexOf(targetObj);
        fCanvas.remove(targetObj);
        fCanvas.add(origImg);
        if (idx !== -1) fCanvas.moveTo(origImg, idx);
        fCanvas.setActiveObject(origImg);
        fCanvas.renderAll();
      }

      if (typeof window.updateLayersList === 'function') window.updateLayersList();
      if (typeof window.saveHistory === 'function') window.saveHistory();

      const revertBtn = document.getElementById('btn-bg-revert');
      if (revertBtn) revertBtn.classList.add('hidden');

      if (typeof window.toast === 'function') window.toast('↺ Исходный фон восстановлен');
    });

    return true;
  }

  // Export
  window.AuroraBgRemoval = {
    initBgRemoval,
    removeBackground,
    undoBgRemoval,
    refineEdges,
    getHistory: () => bgRemovalHistory
  };

  // Auto-init on page load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBgRemoval);
    } else {
      initBgRemoval();
    }
  }

})(window);
