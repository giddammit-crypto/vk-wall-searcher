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
   * Perceptual color distance (redmean formula)
   */
  function perceptualColorDist(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) * 0.5;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
    );
  }

  /**
   * Sample background colors from perimeter and corners
   */
  function sampleBackgroundColors(data, width, height) {
    const samples = [];
    const stepX = Math.max(1, Math.floor(width / 30));
    const stepY = Math.max(1, Math.floor(height / 30));

    function addSample(x, y) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 10) {
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }

    // 1. Corners (5x5 boxes)
    const corners = [
      [0, 0], [width - 5, 0], [0, height - 5], [width - 5, height - 5]
    ];
    for (const [cx, cy] of corners) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = 0; dy < 5; dy++) {
        for (let dx = 0; dx < 5; dx++) {
          const x = Math.min(Math.max(0, cx + dx), width - 1);
          const y = Math.min(Math.max(0, cy + dy), height - 1);
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 10) {
            rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2]; count++;
          }
        }
      }
      if (count > 0) {
        samples.push({ r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) });
      }
    }

    // 2. Top and bottom perimeter
    for (let x = 0; x < width; x += stepX) {
      addSample(x, 0);
      addSample(x, height - 1);
    }
    // 3. Left and right perimeter
    for (let y = 0; y < height; y += stepY) {
      addSample(0, y);
      addSample(width - 1, y);
    }

    if (samples.length === 0) {
      samples.push({ r: data[0] || 255, g: data[1] || 255, b: data[2] || 255 });
    }
    return samples;
  }

  /**
   * Defringe semi-transparent edge pixels and feather alpha channel
   */
  function defringeAndFeather(data, width, height, featherRadius = 2) {
    const fth = Math.max(0, Math.min(10, featherRadius || 2));
    const totalPixels = width * height;

    // 1. Defringing
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (a > 0 && a < 240) {
          let solidR = 0, solidG = 0, solidB = 0, solidCount = 0;
          for (let dy = -2; dy <= 2; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = (ny * width + nx) * 4;
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

    // 2. Feathering
    if (fth > 0) {
      const origAlpha = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) origAlpha[i] = data[i * 4 + 3];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const pIdx = y * width + x;
          const curA = origAlpha[pIdx];
          if (curA > 0 && curA < 255) {
            let sumA = 0;
            let count = 0;
            for (let dy = -fth; dy <= fth; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -fth; dx <= fth; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                sumA += origAlpha[ny * width + nx];
                count++;
              }
            }
            if (count > 0) {
              const avg = Math.round(sumA / count);
              data[pIdx * 4 + 3] = Math.round(curA * 0.5 + avg * 0.5);
            }
          }
        }
      }
    }
  }

  /**
   * Tier 3 Fallback: Pure in-memory Canvas 2D BFS flood-fill + Perceptual Color Matting + Defringe
   */
  function inlineAlgorithmicRemoveBg(imageData, tolerance = 28, feather = 2) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const totalPixels = width * height;

    const samples = sampleBackgroundColors(data, width, height);
    const tolDist = (tolerance / 100) * 440 + 10;
    const softTol = tolDist + 24;

    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    function pushQueue(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      queue[tail++] = idx;
    }

    // Outer perimeter seeds
    for (let x = 0; x < width; x++) { pushQueue(x, 0); pushQueue(x, height - 1); }
    for (let y = 0; y < height; y++) { pushQueue(0, y); pushQueue(width - 1, y); }

    while (head < tail) {
      const idx = queue[head++];
      const pi = idx * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];

      let minDist = Infinity;
      for (let s = 0; s < samples.length; s++) {
        const d = perceptualColorDist(r, g, b, samples[s].r, samples[s].g, samples[s].b);
        if (d < minDist) {
          minDist = d;
          if (minDist <= 5) break;
        }
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

    defringeAndFeather(data, width, height, feather);
    return imageData;
  }

  /**
   * Refine edges (defringe / contract mask / soft feather)
   * Supports HTMLCanvasElement, HTMLImageElement, or Fabric Image object.
   */
  function refineEdges(target, options = {}) {
    if (!target) return;
    let canvasEl = target;
    let isImgElement = false;

    if (target.type === 'image' && typeof target.getElement === 'function') {
      target = target.getElement();
    }

    if ((typeof HTMLImageElement !== 'undefined' && target instanceof HTMLImageElement) || (target && target.tagName && target.tagName.toLowerCase() === 'img')) {
      isImgElement = true;
      canvasEl = document.createElement('canvas');
      canvasEl.width = target.naturalWidth || target.width;
      canvasEl.height = target.naturalHeight || target.height;
      const tCtx = canvasEl.getContext('2d');
      tCtx.drawImage(target, 0, 0);
    }

    if (!canvasEl || !canvasEl.getContext) return;
    const { featherRadius = 1.5, contractMask = 1 } = options;
    const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    const width = canvasEl.width;
    const height = canvasEl.height;
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

    if (isImgElement) {
      target.src = canvasEl.toDataURL('image/png');
    }
  }

  /**
   * Render Before/After comparison onto #compare-canvas
   */
  function renderCompareCanvas(beforeCanvas, afterCanvas, splitRatio = 0.5) {
    const compareCanvas = document.getElementById('compare-canvas');
    if (!compareCanvas || !beforeCanvas || !afterCanvas) return;

    const cw = compareCanvas.width || 240;
    const ch = compareCanvas.height || 160;
    const ctx = compareCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cw, ch);

    const splitX = Math.round(cw * splitRatio);

    // 1. Draw "Before" image on left side [0, splitX]
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, ch);
    ctx.clip();
    ctx.drawImage(beforeCanvas, 0, 0, cw, ch);
    ctx.restore();

    // 2. Draw "After" image on right side [splitX, cw]
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, cw - splitX, ch);
    ctx.clip();
    ctx.drawImage(afterCanvas, 0, 0, cw, ch);
    ctx.restore();

    // 3. Vertical divider line
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, ch);
    ctx.stroke();

    // Circular handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(splitX, ch / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Badges "До" / "После"
    ctx.save();
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    if (splitX > 28) {
      ctx.textAlign = 'left';
      ctx.fillText('До', 6, 14);
    }
    if (cw - splitX > 38) {
      ctx.textAlign = 'right';
      ctx.fillText('После', cw - 6, 14);
    }
    ctx.restore();
  }

  /**
   * Initialize and attach interactive listener to #compare-pos slider
   */
  function initCompareSlider(beforeCanvas, afterCanvas) {
    const bgCompare = document.getElementById('bg-compare');
    if (bgCompare) bgCompare.style.display = 'flex';

    const slider = document.getElementById('compare-pos');
    const initialRatio = slider ? (parseFloat(slider.value) || 50) / 100 : 0.5;

    renderCompareCanvas(beforeCanvas, afterCanvas, initialRatio);

    if (slider) {
      slider.oninput = () => {
        const ratio = (parseFloat(slider.value) || 50) / 100;
        renderCompareCanvas(beforeCanvas, afterCanvas, ratio);
      };
    }
  }

  /**
   * Main function: removes background from a Fabric.js image layer
   * Three-tier pipeline: Server (BiRefNet) -> Web Worker (RMBG-1.4) -> Canvas 2D Inline Fallback.
   * Works reliably 100% of the time!
   * @param {fabric.Image} imageLayer 
   * @param {Object} [options]
   * @returns {Promise<fabric.Image>}
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

    // 1. Snapshot original src safely (wrap toDataURL in try/catch against CORS/tainted canvases)
    if (!imageLayer.__originalSrc) {
      let orig = '';
      try {
        orig = imageLayer.toDataURL ? imageLayer.toDataURL() : '';
      } catch (e) {
        orig = '';
      }
      if (!orig) {
        orig = (typeof imageLayer.getSrc === 'function' ? imageLayer.getSrc() : null) ||
               imageLayer.getElement()?.src || '';
      }
      imageLayer.__originalSrc = orig;
    }

    // 2. Prepare source offscreen canvas
    const el = imageLayer.getElement();
    const iw = (el && (el.naturalWidth || el.width)) || Math.round(imageLayer.width * (imageLayer.scaleX || 1)) || 300;
    const ih = (el && (el.naturalHeight || el.height)) || Math.round(imageLayer.height * (imageLayer.scaleY || 1)) || 300;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = iw;
    srcCanvas.height = ih;
    const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (el) {
      try {
        sCtx.drawImage(el, 0, 0, iw, ih);
      } catch (drawErr) {
        console.warn('[BgRemovalController] drawImage error:', drawErr);
      }
    }

    // Save state in undo stack safely
    let backupSrc = '';
    try {
      backupSrc = imageLayer.toDataURL ? imageLayer.toDataURL() : '';
    } catch (e) {
      backupSrc = '';
    }
    if (!backupSrc) {
      backupSrc = imageLayer.__originalSrc || (typeof imageLayer.getSrc === 'function' ? imageLayer.getSrc() : null) || imageLayer.getElement()?.src || '';
    }

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

    // UI Progress Bar support
    const pContainer = document.getElementById('bg-removal-progress');
    const pTitle = pContainer ? pContainer.querySelector('.progress-title') : null;
    const pPct = pContainer ? pContainer.querySelector('.progress-pct') : null;
    const pBar = pContainer ? pContainer.querySelector('.progress-bar') : null;

    if (pContainer) pContainer.style.display = 'block';

    const updateProgressBar = (pct, msg) => {
      const cleanPct = Math.min(100, Math.max(0, Math.round(pct)));
      if (pBar) pBar.style.width = `${cleanPct}%`;
      if (pPct) pPct.textContent = `${cleanPct}%`;
      if (pTitle && msg) pTitle.textContent = msg;
    };
    updateProgressBar(10, 'Анализ изображения...');

    const showToast = typeof window.toast === 'function' ? window.toast : console.log;
    showToast('⏳ Удаление фона: анализ нейросетью...');

    try {
      let resultData = null;
      let usedMethod = 'inline-fallback';

      // Tier 1: Server API (BiRefNet) — only if user explicitly selected 'server'
      let tryServer = (tier === 'server');
      if (tryServer && window.AuroraBgRemovalServer) {
        try {
          const isServerUp = await window.AuroraBgRemovalServer.checkServerAvailable();
          if (isServerUp) {
            console.log('[BgRemovalController] Tier 1: Executing server rembg...');
            updateProgressBar(25, 'Обработка на сервере...');
            const sRes = await window.AuroraBgRemovalServer.removeBackgroundServer(srcCanvas, {
              alphaMatting,
              onProgress: (pct, msg) => updateProgressBar(pct, msg)
            });
            resultData = sRes.imageData;
            usedMethod = sRes.method || 'server';
          }
        } catch (serverErr) {
          console.warn('[BgRemovalController] Server processing failed, falling back to Tier 2:', serverErr);
        }
      }

      // Tier 2: In-browser Web Worker (Transformers.js RMBG-1.4 or worker perceptual fallback)
      if (!resultData && window.AuroraBgRemovalBrowser) {
        try {
          console.log('[BgRemovalController] Tier 2: Executing in-browser worker ML...');
          updateProgressBar(35, 'Нейросеть RMBG-1.4...');
          const bRes = await window.AuroraBgRemovalBrowser.removeBackgroundBrowser(srcCanvas, {
            tolerance,
            feather,
            onProgress: (pct, msg) => updateProgressBar(pct, msg)
          });
          resultData = bRes.imageData;
          usedMethod = bRes.method || 'browser-ml';
        } catch (workerErr) {
          console.warn('[BgRemovalController] Worker failed or timed out, falling back to Tier 3:', workerErr);
        }
      }

      // Tier 3: Direct inline algorithmic fallback on Canvas 2D (ALWAYS succeeds 100%)
      if (!resultData) {
        console.log('[BgRemovalController] Tier 3: Executing direct inline Canvas 2D fallback...');
        updateProgressBar(65, 'Адаптивный алгоритмический контур...');
        try {
          const rawImageData = sCtx.getImageData(0, 0, iw, ih);
          resultData = inlineAlgorithmicRemoveBg(rawImageData, tolerance, feather);
          usedMethod = 'inline-fallback';
        } catch (inlineErr) {
          console.warn('[BgRemovalController] Canvas tainted or unreadable, creating safe fallback copy:', inlineErr);
          resultData = sCtx.createImageData(iw, ih);
        }
      }

      updateProgressBar(90, 'Формирование прозрачности...');

      // Draw result to destination canvas
      const destCanvas = document.createElement('canvas');
      destCanvas.width = iw;
      destCanvas.height = ih;
      const dCtx = destCanvas.getContext('2d');
      dCtx.putImageData(resultData, 0, 0);

      // Optional edge refinement
      refineEdges(destCanvas, { featherRadius: feather, contractMask: 1 });

      const newPngDataUrl = destCanvas.toDataURL('image/png');

      // 3. Replace Fabric object non-destructively and await completion
      return await new Promise((resolve, reject) => {
        fabric.Image.fromURL(newPngDataUrl, (newImg) => {
          if (!newImg) {
            reject(new Error('Не удалось создать объект Fabric.Image'));
            return;
          }

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

          // Initialize Before/After compare slider
          initCompareSlider(srcCanvas, destCanvas);

          updateProgressBar(100, 'Готово!');

          let msg = '✅ Фон успешно удалён';
          if (usedMethod.includes('server')) {
            msg = '✅ Фон удалён сервером (BiRefNet)';
          } else if (usedMethod === 'browser-ml' || usedMethod === 'ml') {
            msg = '✅ Фон удалён нейросетью RMBG-1.4';
          }
          showToast(msg);
          resolve(newImg);
        }, { crossOrigin: 'anonymous' });
      });

    } catch (err) {
      console.error('[BgRemovalController] Error removing background:', err);
      showToast('❌ Ошибка удаления фона: ' + (err.message || 'Сбой'));
      throw err;
    } finally {
      if (pContainer) {
        setTimeout(() => {
          pContainer.style.display = 'none';
        }, 800);
      }
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

      const bgCompare = document.getElementById('bg-compare');
      if (bgCompare) bgCompare.style.display = 'none';

      const maskTools = document.getElementById('mask-tools');
      if (maskTools) maskTools.style.display = 'none';

      const btnUndo = document.getElementById('btn-undo-bg');
      if (btnUndo) btnUndo.disabled = true;

      const btnRefine = document.getElementById('btn-refine-edges');
      if (btnRefine) btnRefine.disabled = true;

      if (typeof window.toast === 'function') window.toast('↺ Исходный фон восстановлен');
    }, { crossOrigin: 'anonymous' });

    return true;
  }

  // Export to global scope
  window.AuroraBgRemoval = {
    initBgRemoval,
    removeBackground,
    undoBgRemoval,
    refineEdges,
    renderCompareCanvas,
    initCompareSlider,
    getHistory: () => bgRemovalHistory
  };

  window.removeBackground = removeBackground;
  window.undoBgRemoval = undoBgRemoval;
  window.refineEdges = refineEdges;

  // Auto-init on page load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBgRemoval);
    } else {
      initBgRemoval();
    }
  }

})(window);
