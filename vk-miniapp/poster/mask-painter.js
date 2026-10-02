/**
 * AURORA DESIGN — Interactive Mask Painting Tool
 * Section 7: Mask editing tool after AI background cutout.
 * Supports 'restore' (unmask/restore opacity) and 'erase' (mask/make transparent)
 * Soft brush with cosine falloff, configurable brushSize, pointer & touch events.
 */

(function (global) {
  let maskMode = null; // 'restore' | 'erase' | null
  let brushSize = 30;
  let isPainting = false;
  let activeCanvas = null;

  /**
   * Calculate soft brush strength with cosine falloff (1 at center, 0 at edge).
   * @param {number} dist - Distance from brush center
   * @param {number} radius - Brush radius
   * @returns {number} Factor between 0 and 1
   */
  function cosineFalloff(dist, radius) {
    if (dist >= radius) return 0;
    return Math.cos((dist / radius) * (Math.PI / 2));
  }

  /**
   * Apply brush stroke onto canvas context around pointer location.
   * @param {PointerEvent} e
   */
  function applyBrush(e) {
    const cvs = activeCanvas || e.currentTarget || e.target;
    if (!cvs || !cvs.getContext) return;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const rect = cvs.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const r = Math.max(1, brushSize / 2);

    // Bounding box clamped to canvas boundaries
    const startX = Math.max(0, Math.floor(x - r));
    const startY = Math.max(0, Math.floor(y - r));
    const endX = Math.min(cvs.width, Math.ceil(x + r));
    const endY = Math.min(cvs.height, Math.ceil(y + r));
    const w = endX - startX;
    const h = endY - startY;

    if (w <= 0 || h <= 0) return;

    try {
      const imageData = ctx.getImageData(startX, startY, w, h);
      const data = imageData.data;

      for (let py = 0; py < h; py++) {
        const curY = startY + py;
        for (let px = 0; px < w; px++) {
          const curX = startX + px;
          const dist = Math.hypot(curX - x, curY - y);
          if (dist > r) continue;

          const strength = cosineFalloff(dist, r);
          const i = (py * w + px) * 4;
          const currentAlpha = data[i + 3];

          if (maskMode === 'restore') {
            // Restore opacity: increase alpha towards 255
            const delta = Math.round(strength * 255);
            data[i + 3] = Math.min(255, currentAlpha + delta);
          } else if (maskMode === 'erase') {
            // Erase: decrease alpha towards 0 (transparent)
            const delta = Math.round(strength * 255);
            data[i + 3] = Math.max(0, currentAlpha - delta);
          }
        }
      }

      ctx.putImageData(imageData, startX, startY);

      // Trigger redraws across Fabric.js / Aurora editor if available
      if (typeof global.redrawCanvas === 'function') {
        global.redrawCanvas();
      } else if (global.canvas && typeof global.canvas.requestRenderAll === 'function') {
        global.canvas.requestRenderAll();
      }
    } catch (err) {
      console.warn('[MaskPainter] applyBrush warning:', err);
    }
  }

  function handlePointerDown(e) {
    if (!maskMode) return;
    isPainting = true;
    try {
      if (e.target && typeof e.target.setPointerCapture === 'function') {
        e.target.setPointerCapture(e.pointerId);
      }
    } catch (_) {}
    applyBrush(e);
  }

  function handlePointerMove(e) {
    if (!isPainting || !maskMode) return;
    applyBrush(e);
  }

  function handlePointerUp(e) {
    isPainting = false;
    try {
      if (e.target && typeof e.target.releasePointerCapture === 'function') {
        e.target.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
  }

  function handlePointerCancel() {
    isPainting = false;
  }

  /**
   * Activate interactive mask painting tool on a canvas.
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {'restore'|'erase'} mode - 'restore' returns opacity, 'erase' makes transparent
   * @param {number} [size] - Brush radius/size in px (default: 30)
   */
  function activateMaskPainter(canvas, mode, size) {
    if (!canvas) {
      console.warn('[MaskPainter] activateMaskPainter: canvas is null or undefined');
      return;
    }

    // If another canvas was active, detach listeners from it first
    if (activeCanvas && activeCanvas !== canvas) {
      deactivateMaskPainter(activeCanvas);
    }

    activeCanvas = canvas;
    maskMode = mode === 'erase' ? 'erase' : 'restore';
    if (typeof size === 'number' && size > 0) {
      brushSize = size;
    }

    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none'; // Prevent browser gestures on touch devices

    // Remove old listeners to avoid duplicates
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerCancel);

    // Attach pointer events (mouse + touch + stylus)
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
  }

  /**
   * Deactivate mask painter and restore default cursor.
   * @param {HTMLCanvasElement} [canvas] - Target canvas element
   */
  function deactivateMaskPainter(canvas) {
    const target = canvas || activeCanvas;
    if (target) {
      target.style.cursor = 'default';
      target.style.touchAction = '';
      target.removeEventListener('pointerdown', handlePointerDown);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      target.removeEventListener('pointercancel', handlePointerCancel);
    }
    maskMode = null;
    isPainting = false;
    activeCanvas = null;
  }

  /**
   * Update brush size (diameter in px).
   * @param {number} size
   */
  function setMaskBrushSize(size) {
    if (typeof size === 'number' && size > 0) {
      brushSize = Math.max(2, Math.min(300, size));
    }
  }

  /**
   * Get current mask painter state.
   * @returns {{ active: boolean, mode: string|null, brushSize: number }}
   */
  function getMaskPainterState() {
    return {
      active: maskMode !== null,
      mode: maskMode,
      brushSize: brushSize,
      isPainting: isPainting
    };
  }

  // Exports for browser globals and modules
  const api = {
    activateMaskPainter,
    deactivateMaskPainter,
    setMaskBrushSize,
    getMaskPainterState
  };

  global.activateMaskPainter = activateMaskPainter;
  global.deactivateMaskPainter = deactivateMaskPainter;
  global.setMaskBrushSize = setMaskBrushSize;
  global.getMaskPainterState = getMaskPainterState;
  global.AuroraMaskPainter = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
