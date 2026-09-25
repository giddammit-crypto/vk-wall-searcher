/**
 * tilda_runtime.js — Tilda Interactive Client-Side Runtime Engine
 * Powers responsive navigation, sliders, lightboxes, accordion FAQ,
 * form validations & submissions, e-commerce cart, and scroll animations.
 */
(function() {
  'use strict';

  // 1. Mobile Navigation & Sticky Header
  function initNavigation() {
    document.querySelectorAll('[data-tilda-burger]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const header = btn.closest('.tilda-header, [data-tilda-header]') || document.querySelector('.tilda-header');
        if (!header) return;
        const nav = header.querySelector('.tilda-nav-menu, [data-tilda-menu]');
        if (nav) {
          nav.classList.toggle('is-open');
          btn.classList.toggle('is-active');
        }
      });
    });

    // Smooth scroll for anchor links with offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;

        if (href === '#cart') {
          e.preventDefault();
          window.TildaRuntime?.openCartModal?.();
          return;
        }

        const cleanId = href.replace(/^#/, '');
        let target = document.getElementById(cleanId) || document.querySelector(`[data-anchor="${cleanId}"]`);
        if (!target) {
          try {
            target = document.querySelector(href);
          } catch(err) {}
        }

        if (target) {
          e.preventDefault();
          const headerHeight = document.querySelector('.tilda-header, header')?.offsetHeight || 70;
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({ top, behavior: 'smooth' });

          // Close mobile menu if open
          document.querySelectorAll('.tilda-nav-menu.is-open').forEach(m => m.classList.remove('is-open'));
          document.querySelectorAll('[data-tilda-burger].is-active').forEach(b => b.classList.remove('is-active'));
        }
      });
    });
  }

  // 2. Accordions / FAQ
  function initAccordions() {
    document.querySelectorAll('[data-tilda-accordion]').forEach(acc => {
      const items = acc.querySelectorAll('.tilda-acc-item, [data-acc-item]');
      items.forEach(item => {
        const head = item.querySelector('.tilda-acc-head, [data-acc-head]');
        const body = item.querySelector('.tilda-acc-body, [data-acc-body]');
        if (!head || !body) return;

        head.addEventListener('click', () => {
          const isOpen = item.classList.contains('is-active');
          // If single expand mode
          if (acc.hasAttribute('data-acc-single')) {
            items.forEach(other => {
              if (other !== item) {
                other.classList.remove('is-active');
                const b = other.querySelector('.tilda-acc-body, [data-acc-body]');
                if (b) b.style.maxHeight = null;
              }
            });
          }

          if (isOpen) {
            item.classList.remove('is-active');
            body.style.maxHeight = null;
          } else {
            item.classList.add('is-active');
            body.style.maxHeight = body.scrollHeight + 'px';
          }
        });
      });
    });
  }

  // 3. Sliders & Carousels
  function initSliders() {
    document.querySelectorAll('[data-tilda-slider]').forEach(slider => {
      const track = slider.querySelector('.tilda-slider-track, [data-slider-track]');
      const slides = slider.querySelectorAll('.tilda-slide, [data-slide]');
      const btnPrev = slider.querySelector('[data-slider-prev]');
      const btnNext = slider.querySelector('[data-slider-next]');
      const dotsWrap = slider.querySelector('[data-slider-dots]');
      if (!track || slides.length === 0) return;

      let currentIndex = 0;
      const total = slides.length;

      // Build dots if container exists
      if (dotsWrap && dotsWrap.children.length === 0) {
        for (let i = 0; i < total; i++) {
          const dot = document.createElement('button');
          dot.className = 'tilda-slider-dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('aria-label', `Слайд ${i + 1}`);
          dot.addEventListener('click', () => goToSlide(i));
          dotsWrap.appendChild(dot);
        }
      }

      function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        if (dotsWrap) {
          Array.from(dotsWrap.children).forEach((d, i) => {
            d.classList.toggle('is-active', i === currentIndex);
          });
        }
      }

      function goToSlide(idx) {
        currentIndex = (idx + total) % total;
        updateSlider();
      }

      btnPrev?.addEventListener('click', () => goToSlide(currentIndex - 1));
      btnNext?.addEventListener('click', () => goToSlide(currentIndex + 1));

      // Touch swipe support
      let startX = 0;
      let dist = 0;
      slider.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        dist = 0;
      }, { passive: true });

      slider.addEventListener('touchmove', e => {
        dist = e.touches[0].clientX - startX;
      }, { passive: true });

      slider.addEventListener('touchend', () => {
        if (Math.abs(dist) > 40) {
          if (dist < 0) goToSlide(currentIndex + 1);
          else goToSlide(currentIndex - 1);
        }
      });
    });
  }

  class AuroraLightbox {
    constructor() {
      this.overlay = null;
      this.imgEl = null;
      this.captionEl = null;
      this.thumbsWrap = null;
      this.toolbar = null;
      this.gallerySet = [];
      this.activeIndex = 0;
      this.zoomLevel = 1.0;
      this.panX = 0;
      this.panY = 0;
      
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.lastPanX = 0;
      this.lastPanY = 0;
      
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.initialPinchDist = 0;
      
      this.zoomLevels = [1.0, 1.5, 2.0, 3.0];
      
      this.initDOM();
      this.bindEvents();
    }

    initDOM() {
      if (document.getElementById('aurora-lightbox-overlay')) return;

      this.overlay = document.createElement('div');
      this.overlay.id = 'aurora-lightbox-overlay';
      this.overlay.className = 'aurora-lightbox-overlay';
      
      this.overlay.innerHTML = `
        <div class="aurora-lightbox-toolbar">
          <span class="aurora-lightbox-counter"></span>
          <button class="aurora-lightbox-btn" data-action="zoom-out" aria-label="Zoom Out">−</button>
          <button class="aurora-lightbox-btn" data-action="zoom-in" aria-label="Zoom In">+</button>
          <button class="aurora-lightbox-btn" data-action="fullscreen" aria-label="Fullscreen">⛶</button>
          <button class="aurora-lightbox-btn" data-action="download" aria-label="Download">⤓</button>
          <button class="aurora-lightbox-btn aurora-lightbox-close" data-action="close" aria-label="Close">✕</button>
        </div>
        <div class="aurora-lightbox-container">
          <img class="aurora-lightbox-img" src="" alt="Zoomed view" draggable="false" />
          <button class="aurora-lightbox-nav aurora-lightbox-prev" data-action="prev">‹</button>
          <button class="aurora-lightbox-nav aurora-lightbox-next" data-action="next">›</button>
        </div>
        <div class="aurora-lightbox-footer">
          <div class="aurora-lightbox-caption"></div>
          <div class="aurora-lightbox-thumbs"></div>
        </div>
      `;
      
      document.body.appendChild(this.overlay);
      
      this.imgEl = this.overlay.querySelector('.aurora-lightbox-img');
      this.captionEl = this.overlay.querySelector('.aurora-lightbox-caption');
      this.thumbsWrap = this.overlay.querySelector('.aurora-lightbox-thumbs');
      this.counterEl = this.overlay.querySelector('.aurora-lightbox-counter');
      this.containerEl = this.overlay.querySelector('.aurora-lightbox-container');
    }

    bindEvents() {
      // Toolbar and Nav
      this.overlay.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'close') this.close();
        else if (action === 'prev') this.prev();
        else if (action === 'next') this.next();
        else if (action === 'zoom-in') this.setZoom(this.getNextZoomLevel(1));
        else if (action === 'zoom-out') this.setZoom(this.getNextZoomLevel(-1));
        else if (action === 'fullscreen') this.toggleFullscreen();
        else if (action === 'download') this.downloadImage(this.imgEl.src, 'image.jpg');
        else if (e.target === this.containerEl || e.target === this.overlay) this.close();
      });

      // Keyboard
      document.addEventListener('keydown', e => {
        if (!this.overlay.classList.contains('is-open')) return;
        if (e.key === 'Escape') this.close();
        else if (e.key === 'ArrowLeft') this.prev();
        else if (e.key === 'ArrowRight') this.next();
        else if (e.key === '+' || e.key === '=') this.setZoom(this.getNextZoomLevel(1));
        else if (e.key === '-') this.setZoom(this.getNextZoomLevel(-1));
        else if (e.key.toLowerCase() === 'f') this.toggleFullscreen();
        else if (e.key.toLowerCase() === 'd') this.downloadImage(this.imgEl.src, 'image.jpg');
      });

      // Mouse Wheel Zoom
      this.containerEl.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        this.setZoom(this.getNextZoomLevel(delta));
      }, { passive: false });

      // Double Click
      this.imgEl.addEventListener('dblclick', () => {
        this.setZoom(this.zoomLevel > 1.0 ? 1.0 : 2.0);
      });

      // Drag to Pan
      this.imgEl.addEventListener('mousedown', e => {
        if (this.zoomLevel <= 1.0) return;
        e.preventDefault();
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.imgEl.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', e => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.panX = this.lastPanX + dx;
        this.panY = this.lastPanY + dy;
        this.updateTransform();
      });

      window.addEventListener('mouseup', () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.lastPanX = this.panX;
        this.lastPanY = this.panY;
        this.imgEl.style.cursor = 'grab';
      });

      // Mobile Touch Gestures
      this.containerEl.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
          if (this.zoomLevel > 1.0) {
            this.isDragging = true;
            this.dragStartX = this.touchStartX;
            this.dragStartY = this.touchStartY;
          }
        } else if (e.touches.length === 2) {
          this.initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      }, { passive: true });

      this.containerEl.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && this.zoomLevel > 1.0 && this.isDragging) {
          const dx = e.touches[0].clientX - this.dragStartX;
          const dy = e.touches[0].clientY - this.dragStartY;
          this.panX = this.lastPanX + dx;
          this.panY = this.lastPanY + dy;
          this.updateTransform();
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (this.initialPinchDist > 0) {
            const scaleChange = dist / this.initialPinchDist;
            let targetZoom = this.zoomLevel * scaleChange;
            targetZoom = Math.max(1.0, Math.min(targetZoom, 3.0));
            this.setZoom(targetZoom, false);
            this.initialPinchDist = dist; // reset to continuous pinch
          }
        }
      }, { passive: true });

      this.containerEl.addEventListener('touchend', e => {
        if (e.touches.length === 0) {
          if (this.isDragging) {
            this.isDragging = false;
            this.lastPanX = this.panX;
            this.lastPanY = this.panY;
          }
          if (this.zoomLevel === 1.0 && e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX;
            const dx = touchEndX - this.touchStartX;
            if (Math.abs(dx) > 50) {
              if (dx < 0) this.next();
              else this.prev();
            }
          }
          this.initialPinchDist = 0;
        }
      });
    }

    init() {
      // Find all images matching criteria
      const selectors = '.t-gallery img, [data-lightbox], .t-store-card img, .t-card img, .t-block img:not(.no-lightbox)';
      const images = document.querySelectorAll(selectors);
      
      const galleries = {};

      images.forEach(img => {
        img.style.cursor = 'zoom-in';
        
        // Find parent block to group
        const block = img.closest('[data-gallery-id], [id^="block-"], .t-block') || document.body;
        const groupId = block.getAttribute('data-gallery-id') || block.id || 'global';
        
        if (!galleries[groupId]) galleries[groupId] = [];
        
        const src = img.dataset.srcFull || img.dataset.src || img.src;
        const caption = img.alt || img.title || '';
        
        const item = { src, caption, imgEl: img };
        galleries[groupId].push(item);
        
        img.addEventListener('click', e => {
          e.preventDefault();
          const activeIdx = galleries[groupId].indexOf(item);
          this.open(src, caption, galleries[groupId], activeIdx);
        });
      });
    }

    open(src, caption, gallerySet, activeIndex = 0) {
      this.gallerySet = gallerySet;
      this.activeIndex = activeIndex;
      this.overlay.classList.add('is-open');
      this.overlay.style.opacity = '0';
      this.overlay.style.display = 'flex';
      
      // smooth opening transition
      requestAnimationFrame(() => {
        this.overlay.style.transition = 'opacity 0.3s ease';
        this.overlay.style.opacity = '1';
      });
      
      this.renderCurrent();
      this.renderThumbs();
    }

    close() {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.classList.remove('is-open');
        this.overlay.style.display = 'none';
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(()=>{});
        }
      }, 300);
    }

    renderCurrent() {
      const item = this.gallerySet[this.activeIndex];
      if (!item) return;

      this.imgEl.style.opacity = '0';
      this.imgEl.src = item.src;
      this.captionEl.textContent = item.caption;
      this.counterEl.textContent = `${this.activeIndex + 1} / ${this.gallerySet.length}`;
      
      this.imgEl.onload = () => {
        this.imgEl.style.transition = 'opacity 0.3s ease';
        this.imgEl.style.opacity = '1';
      };

      this.setZoom(1.0);
      this.updateThumbsActive();
      this.preloadAdjacent();
    }

    preloadAdjacent() {
      const total = this.gallerySet.length;
      if (total <= 1) return;
      const nextIdx = (this.activeIndex + 1) % total;
      const prevIdx = (this.activeIndex - 1 + total) % total;
      
      [nextIdx, prevIdx].forEach(idx => {
        const img = new Image();
        img.src = this.gallerySet[idx].src;
      });
    }

    next() {
      if (this.gallerySet.length <= 1) return;
      this.activeIndex = (this.activeIndex + 1) % this.gallerySet.length;
      this.renderCurrent();
    }

    prev() {
      if (this.gallerySet.length <= 1) return;
      this.activeIndex = (this.activeIndex - 1 + this.gallerySet.length) % this.gallerySet.length;
      this.renderCurrent();
    }

    getNextZoomLevel(direction) {
      let idx = this.zoomLevels.indexOf(this.zoomLevel);
      if (idx === -1) {
        // Find closest
        idx = this.zoomLevels.reduce((best, val, i) => Math.abs(val - this.zoomLevel) < Math.abs(this.zoomLevels[best] - this.zoomLevel) ? i : best, 0);
      }
      idx += direction;
      idx = Math.max(0, Math.min(idx, this.zoomLevels.length - 1));
      return this.zoomLevels[idx];
    }

    setZoom(level, transition = true) {
      this.zoomLevel = level;
      if (this.zoomLevel <= 1.0) {
        this.zoomLevel = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.imgEl.style.cursor = 'zoom-in';
      } else {
        this.imgEl.style.cursor = 'grab';
      }
      
      if (transition) {
        this.imgEl.style.transition = 'transform 0.2s ease, opacity 0.3s ease';
      } else {
        this.imgEl.style.transition = 'opacity 0.3s ease';
      }
      this.updateTransform();
    }

    updateTransform() {
      this.imgEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }

    toggleFullscreen() {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
      if (!isFs) {
        if (this.overlay.requestFullscreen) {
          this.overlay.requestFullscreen().catch(()=>{});
        } else if (this.overlay.webkitRequestFullscreen) {
          this.overlay.webkitRequestFullscreen();
        } else if (this.overlay.mozRequestFullScreen) {
          this.overlay.mozRequestFullScreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(()=>{});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        }
      }
    }

    downloadImage(src, filename) {
      const a = document.createElement('a');
      a.href = src;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    renderThumbs() {
      this.thumbsWrap.innerHTML = '';
      if (this.gallerySet.length <= 1) return;
      
      this.gallerySet.forEach((item, idx) => {
        const thumb = document.createElement('img');
        thumb.src = item.src;
        thumb.className = 'aurora-lightbox-thumb';
        if (idx === this.activeIndex) thumb.classList.add('is-active');
        
        thumb.addEventListener('click', () => {
          this.activeIndex = idx;
          this.renderCurrent();
        });
        
        this.thumbsWrap.appendChild(thumb);
      });
    }

    updateThumbsActive() {
      const thumbs = this.thumbsWrap.querySelectorAll('.aurora-lightbox-thumb');
      thumbs.forEach((t, i) => t.classList.toggle('is-active', i === this.activeIndex));
    }
  }

  window.AuroraLightbox = new AuroraLightbox();
  const initLightbox = () => window.AuroraLightbox.init();

  // 5. Interactive Forms & Lead Submissions
  function initForms() {
    document.querySelectorAll('[data-tilda-form], form.tilda-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const origBtnText = submitBtn ? submitBtn.innerHTML : '';

        // Validation
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        inputs.forEach(inp => {
          if (!inp.value.trim()) {
            inp.classList.add('is-invalid');
            isValid = false;
          } else {
            inp.classList.remove('is-invalid');
          }
        });

        if (!isValid) {
          showToast('Пожалуйста, заполните обязательные поля');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Отправка...</span>';
        }

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload._submittedAt = new Date().toISOString();
        payload._pageTitle = document.title;

        try {
          // Save locally
          const leadsKey = 'aurora_tilda_leads';
          const prev = JSON.parse(localStorage.getItem(leadsKey) || '[]');
          prev.unshift(payload);
          localStorage.setItem(leadsKey, JSON.stringify(prev.slice(0, 50)));

          // Show success message
          const successEl = form.querySelector('.tilda-form-success') || createSuccessMsg(form);
          form.style.display = 'none';
          successEl.style.display = 'block';
          showToast('✅ Спасибо! Ваша заявка успешно отправлена.');
        } catch (err) {
          showToast('Ошибка при отправке. Попробуйте позже.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnText;
          }
        }
      });
    });

    function createSuccessMsg(form) {
      const msg = document.createElement('div');
      msg.className = 'tilda-form-success';
      msg.innerHTML = `
        <div style="text-align:center;padding:24px 16px;background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:12px;color:#10b981;">
          <h3 style="font-size:20px;font-weight:700;margin:0 0 8px;">Спасибо за заявку!</h3>
          <p style="margin:0;font-size:14px;color:#cbd5e1;">Мы свяжемся с вами в ближайшее время.</p>
        </div>
      `;
      form.parentNode.insertBefore(msg, form);
      return msg;
    }
  }

  // 6. E-Commerce Cart System
  const Cart = {
    items: [],
    init() {
      this.load();
      this.bindButtons();
      this.createCartModal();
      this.updateBadges();
    },
    load() {
      try {
        this.items = JSON.parse(localStorage.getItem('aurora_tilda_cart') || '[]');
      } catch (e) { this.items = []; }
    },
    save() {
      localStorage.setItem('aurora_tilda_cart', JSON.stringify(this.items));
      this.updateBadges();
      this.renderCart();
    },
    add(item) {
      const existing = this.items.find(i => i.id === item.id || i.name === item.name);
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        this.items.push({ ...item, qty: 1 });
      }
      this.save();
      showToast(`🛒 «${item.name}» добавлен в корзину`);
      this.openModal();
    },
    remove(idx) {
      this.items.splice(idx, 1);
      this.save();
    },
    updateQty(idx, delta) {
      if (this.items[idx]) {
        this.items[idx].qty += delta;
        if (this.items[idx].qty <= 0) this.items.splice(idx, 1);
        this.save();
      }
    },
    getTotal() {
      return this.items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.qty || 1), 0);
    },
    bindButtons() {
      document.querySelectorAll('[data-tilda-cart-add]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const card = btn.closest('[data-product-card]') || btn.closest('.tilda-product-card');
          const id = btn.dataset.productId || Math.random().toString(36).substr(2, 6);
          const name = btn.dataset.productName || card?.querySelector('[data-product-name]')?.textContent?.trim() || 'Товар';
          const priceRaw = btn.dataset.productPrice || card?.querySelector('[data-product-price]')?.textContent || '0';
          const price = parseFloat(String(priceRaw).replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0);
          const img = btn.dataset.productImg || card?.querySelector('img')?.src || '';
          this.add({ id, name, price, img });
        });
      });

      document.querySelectorAll('[data-tilda-cart-trigger], .tilda-cart-badge').forEach(b => {
        b.addEventListener('click', () => this.openModal());
      });
    },
    updateBadges() {
      const count = this.items.reduce((sum, i) => sum + (i.qty || 1), 0);
      document.querySelectorAll('[data-tilda-cart-count], .tilda-cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    },
    createCartModal() {
      if (document.getElementById('tilda-cart-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'tilda-cart-modal';
      modal.className = 'tilda-cart-modal-overlay';
      modal.innerHTML = `
        <div class="tilda-cart-dialog">
          <div class="tilda-cart-header">
            <h3>🛒 Ваша корзина</h3>
            <button class="tilda-cart-close" id="tilda-cart-close-btn">&times;</button>
          </div>
          <div class="tilda-cart-body" id="tilda-cart-items-list"></div>
          <div class="tilda-cart-footer">
            <div class="tilda-cart-total">
              <span>Итого:</span>
              <strong id="tilda-cart-total-sum">0 ₽</strong>
            </div>
            <button class="tilda-cart-checkout-btn" id="tilda-cart-checkout-btn">Оформить заказ</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#tilda-cart-close-btn')?.addEventListener('click', () => this.closeModal());
      modal.addEventListener('click', e => {
        if (e.target === modal) this.closeModal();
      });

      modal.querySelector('#tilda-cart-checkout-btn')?.addEventListener('click', () => {
        if (this.items.length === 0) {
          showToast('Корзина пуста');
          return;
        }
        showToast('✅ Заказ успешно сформирован!');
        this.items = [];
        this.save();
        this.closeModal();
      });
    },
    openModal() {
      this.renderCart();
      document.getElementById('tilda-cart-modal')?.classList.add('is-open');
    },
    closeModal() {
      document.getElementById('tilda-cart-modal')?.classList.remove('is-open');
    },
    renderCart() {
      const list = document.getElementById('tilda-cart-items-list');
      const totalSum = document.getElementById('tilda-cart-total-sum');
      if (!list) return;

      if (this.items.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px 16px;color:#94a3b8;">Ваша корзина пуста</div>`;
        if (totalSum) totalSum.textContent = '0 ₽';
        return;
      }

      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let html = '';
      this.items.forEach((item, idx) => {
        html += `
          <div class="tilda-cart-row">
            ${item.img ? `<img src="${esc(item.img)}" class="tilda-cart-thumb" alt="${esc(item.name)}" />` : ''}
            <div class="tilda-cart-info">
              <div class="tilda-cart-title">${esc(item.name)}</div>
              <div class="tilda-cart-price">${Number(item.price) || 0} ₽</div>
            </div>
            <div class="tilda-cart-controls">
              <button class="tilda-qty-btn" onclick="window.TildaCart.updateQty(${idx}, -1)">−</button>
              <span>${Number(item.qty) || 1}</span>
              <button class="tilda-qty-btn" onclick="window.TildaCart.updateQty(${idx}, 1)">+</button>
              <button class="tilda-remove-btn" onclick="window.TildaCart.remove(${idx})">&times;</button>
            </div>
          </div>
        `;
      });
      list.innerHTML = html;
      if (totalSum) totalSum.textContent = this.getTotal().toLocaleString('ru-RU') + ' ₽';
    }
  };
  window.TildaCart = Cart;

  // 7. Scroll Animations (IntersectionObserver & Live Preview — 18 Effects)
  const ALL_ANIM_CLASSES = [
    'tilda-animated-in',
    'anim-fade-in',
    'anim-slide-up',
    'anim-slide-down',
    'anim-slide-left',
    'anim-slide-right',
    'anim-zoom-in',
    'anim-zoom-out',
    'anim-flip-up',
    'anim-flip-x',
    'anim-rotate-in',
    'anim-blur-in',
    'anim-bounce',
    'anim-elastic-up',
    'anim-swing-in',
    'anim-glitch',
    'anim-typewriter',
    'anim-pulse-glow',
    'anim-stagger'
  ];

  function applyStaggerDelays(el) {
    const cards = el.querySelectorAll('.t-feature-card, .t-pricing-card, .t-card, .tilda-product-card, [data-filter-item], .t-container > div > div');
    cards.forEach((card, i) => {
      const staggerDelay = `${(i * 0.12).toFixed(2)}s`;
      card.style.transitionDelay = staggerDelay;
      card.style.animationDelay = staggerDelay;
    });
  }

  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
      '.tilda-block[data-tilda-anim], .block-custom-element[data-tilda-anim], .zero-canvas-element[data-tilda-anim], [data-tilda-anim], .tilda-animate-on-scroll'
    );
    if (animatedElements.length === 0) return;

    animatedElements.forEach(el => {
      const animType = el.getAttribute('data-tilda-anim');
      if (!animType || animType === 'none') return;

      const delay = el.getAttribute('data-anim-delay');
      const duration = el.getAttribute('data-anim-duration');
      if (delay !== null && delay !== '') {
        el.style.transitionDelay = `${delay}s`;
        el.style.animationDelay = `${delay}s`;
      }
      if (duration !== null && duration !== '') {
        el.style.transitionDuration = `${duration}s`;
        el.style.animationDuration = `${duration}s`;
      }
      if (animType === 'stagger') {
        applyStaggerDelays(el);
      }
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const animType = el.getAttribute('data-tilda-anim');
          if (animType && animType !== 'none') {
            if (animType === 'stagger') {
              applyStaggerDelays(el);
            }
            el.classList.add('tilda-animated-in', `anim-${animType}`);
          }
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    animatedElements.forEach(el => {
      const animType = el.getAttribute('data-tilda-anim');
      if (animType && animType !== 'none') {
        observer.observe(el);
      }
    });
  }

  function triggerAnimation(el) {
    if (!el) return;
    const animType = el.getAttribute('data-tilda-anim') || 'fade-in';
    if (animType === 'none') {
      el.classList.remove(...ALL_ANIM_CLASSES);
      return;
    }

    const delay = el.getAttribute('data-anim-delay');
    const duration = el.getAttribute('data-anim-duration');
    if (delay !== null && delay !== '') {
      el.style.transitionDelay = `${delay}s`;
      el.style.animationDelay = `${delay}s`;
    }
    if (duration !== null && duration !== '') {
      el.style.transitionDuration = `${duration}s`;
      el.style.animationDuration = `${duration}s`;
    }
    if (animType === 'stagger') {
      applyStaggerDelays(el);
    }

    el.classList.remove(...ALL_ANIM_CLASSES);
    void el.offsetWidth; // Trigger reflow
    el.classList.add(`anim-${animType}`);
    setTimeout(() => {
      el.classList.add('tilda-animated-in');
    }, 20);
  }

  function replayAllAnimations() {
    const els = document.querySelectorAll('[data-tilda-anim]');
    els.forEach(el => {
      const animType = el.getAttribute('data-tilda-anim');
      if (animType && animType !== 'none') {
        triggerAnimation(el);
      }
    });
  }

  // 8. Interactive Tabs ([data-tilda-tabs])
  function initTabs() {
    document.querySelectorAll('[data-tilda-tabs]').forEach(tabsRoot => {
      if (tabsRoot._tabsBound) return;
      tabsRoot._tabsBound = true;

      const btns = Array.from(tabsRoot.querySelectorAll('[data-tab-btn]'));
      const panes = Array.from(tabsRoot.querySelectorAll('[data-tab-pane]'));
      if (btns.length === 0 || panes.length === 0) return;

      btns.forEach((btn, idx) => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const targetKey = btn.getAttribute('data-tab-btn') || btn.dataset.tab || String(idx);

          btns.forEach(b => {
            const active = b === btn;
            b.classList.toggle('is-active', active);
            if (active) {
              b.style.background = b.dataset.activeBg || '#0d99ff';
              b.style.color = '#ffffff';
              b.style.borderColor = '#0d99ff';
            } else {
              b.style.background = b.dataset.inactiveBg || 'rgba(30, 41, 59, 0.7)';
              b.style.color = '#94a3b8';
              b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
          });

          panes.forEach((pane, pIdx) => {
            const paneKey = pane.getAttribute('data-tab-pane') || pane.dataset.tab || String(pIdx);
            const isMatch = paneKey === targetKey || (!btn.getAttribute('data-tab-btn') && pIdx === idx);
            if (isMatch) {
              pane.classList.add('is-active');
              pane.style.display = pane.dataset.display || 'block';
              pane.style.opacity = '0';
              requestAnimationFrame(() => {
                pane.style.transition = 'opacity 0.25s ease';
                pane.style.opacity = '1';
              });
            } else {
              pane.classList.remove('is-active');
              pane.style.display = 'none';
            }
          });
        });
      });
    });
  }

  // 9. Interactive Category Filters ([data-tilda-filter])
  function initFilters() {
    document.querySelectorAll('[data-tilda-filter]').forEach(filterRoot => {
      if (filterRoot._filterBound) return;
      filterRoot._filterBound = true;

      const scope = filterRoot.closest('.tilda-block, section, [data-block-id]') || filterRoot;
      const btns = Array.from(filterRoot.querySelectorAll('[data-filter-btn]'));
      const items = Array.from(scope.querySelectorAll('[data-filter-item]'));
      if (btns.length === 0) return;

      btns.forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const filterVal = (btn.getAttribute('data-filter-btn') || btn.dataset.filter || 'all').trim().toLowerCase();

          btns.forEach(b => {
            const active = b === btn;
            b.classList.toggle('is-active', active);
            b.style.background = active ? '#0d99ff' : 'rgba(30, 41, 59, 0.7)';
            b.style.color = active ? '#ffffff' : '#94a3b8';
            b.style.borderColor = active ? '#0d99ff' : 'rgba(255, 255, 255, 0.1)';
          });

          items.forEach(item => {
            const catRaw = (item.getAttribute('data-filter-item') || item.dataset.category || '').trim().toLowerCase();
            const categories = catRaw.split(',').map(s => s.trim());
            const isMatch = filterVal === 'all' || filterVal === '*' || filterVal === 'все' || catRaw === filterVal || categories.includes(filterVal);

            if (isMatch) {
              item.style.display = '';
              item.style.opacity = '0';
              item.style.transform = 'scale(0.96) translateY(8px)';
              requestAnimationFrame(() => {
                item.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
                item.style.opacity = '1';
                item.style.transform = 'scale(1) translateY(0)';
              });
            } else {
              item.style.display = 'none';
            }
          });
        });
      });
    });
  }

  // 10. Animated Number Counters ([data-tilda-counter], [data-count-to])
  function initCounters() {
    const counters = document.querySelectorAll('[data-tilda-counter], [data-count-to]');
    if (counters.length === 0) return;

    const animateCounter = el => {
      if (el._counterAnimated) return;
      el._counterAnimated = true;

      const rawTarget = el.getAttribute('data-count-to') || el.getAttribute('data-tilda-counter') || el.textContent || '0';
      const prefix = el.getAttribute('data-count-prefix') || '';
      const suffix = el.getAttribute('data-count-suffix') || (rawTarget.match(/[^\d.,\s]+$/)?.[0] || '');
      const cleanNum = parseFloat(String(rawTarget).replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
      const isFloat = String(cleanNum).includes('.');
      const decimals = isFloat ? (String(cleanNum).split('.')[1]?.length || 1) : 0;
      const duration = 1200;
      const startTime = performance.now();

      const step = now => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = cleanNum * eased;
        const formatted = isFloat
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString('ru-RU');
        el.textContent = `${prefix}${formatted}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    counters.forEach(c => observer.observe(c));
  }

  // 11. Interactive Multi-Step Quizzes ([data-tilda-quiz])
  function initQuizzes() {
    document.querySelectorAll('[data-tilda-quiz]').forEach(quiz => {
      if (quiz._quizBound) return;
      quiz._quizBound = true;

      const steps = Array.from(quiz.querySelectorAll('[data-quiz-step]'));
      const progressBar = quiz.querySelector('[data-quiz-progress]');
      const stepLabel = quiz.querySelector('[data-quiz-step-label]');
      const resultPane = quiz.querySelector('[data-quiz-result]');
      let currentStep = 0;

      const updateQuizView = () => {
        const total = steps.length || 1;
        steps.forEach((s, idx) => {
          s.style.display = idx === currentStep ? 'block' : 'none';
          s.classList.toggle('is-active', idx === currentStep);
        });
        if (resultPane) {
          resultPane.style.display = currentStep >= steps.length ? 'block' : 'none';
        }
        if (progressBar) {
          const pct = Math.min(100, Math.round(((currentStep + 1) / total) * 100));
          progressBar.style.width = `${pct}%`;
        }
        if (stepLabel && currentStep < steps.length) {
          stepLabel.textContent = `Шаг ${currentStep + 1} из ${total}`;
        }
      };

      quiz.querySelectorAll('[data-quiz-option]').forEach(opt => {
        opt.addEventListener('click', () => {
          const stepEl = opt.closest('[data-quiz-step]') || quiz;
          stepEl.querySelectorAll('[data-quiz-option]').forEach(o => {
            const active = o === opt;
            o.classList.toggle('is-selected', active);
            o.style.borderColor = active ? '#0d99ff' : 'rgba(255,255,255,0.12)';
            o.style.background = active ? 'rgba(13,153,255,0.15)' : 'rgba(15,23,42,0.6)';
          });
          if (quiz.hasAttribute('data-quiz-auto-next') && steps.length > 0) {
            setTimeout(() => {
              if (currentStep < steps.length - 1 || resultPane) {
                currentStep++;
                updateQuizView();
              }
            }, 220);
          }
        });
      });

      quiz.querySelectorAll('[data-quiz-next]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          if (currentStep < steps.length - 1) {
            currentStep++;
            updateQuizView();
          } else if (resultPane) {
            currentStep = steps.length;
            updateQuizView();
          } else {
            showToast('✅ Ответы квиза сохранены!');
          }
        });
      });

      quiz.querySelectorAll('[data-quiz-prev]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          if (currentStep > 0) {
            currentStep--;
            updateQuizView();
          }
        });
      });

      if (steps.length > 0) {
        updateQuizView();
      }
    });
  }

  // Toast Helper
  function showToast(msg) {
    let t = document.getElementById('tilda-runtime-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tilda-runtime-toast';
      t.className = 'tilda-runtime-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-show'), 3000);
  }

  // 12. Tilda Popups (#popup:...)
  function initPopups() {
    // Trigger clicks on <a href="#popup:my-popup"> or [data-tilda-popup-trigger="my-popup"]
    document.addEventListener('click', e => {
      const trigger = e.target.closest('a[href^="#popup:"], [data-tilda-popup-trigger]');
      if (!trigger) return;
      e.preventDefault();
      const popupId = trigger.dataset.tildaPopupTrigger || trigger.getAttribute('href').replace(/^#popup:/, '');
      const popupEl = document.getElementById(`popup-${popupId}`) || document.querySelector(`[data-tilda-popup="${popupId}"]`) || document.getElementById(popupId);
      if (popupEl) {
        popupEl.classList.add('is-open');
        popupEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    });

    // Close on backdrop or [data-tilda-popup-close]
    document.addEventListener('click', e => {
      if (e.target.matches('.tilda-popup-overlay, [data-tilda-popup-close], [data-tilda-popup-close] *')) {
        const popup = e.target.closest('.tilda-popup-overlay, [data-tilda-popup]');
        if (popup) {
          popup.classList.remove('is-open');
          popup.style.display = 'none';
          document.body.style.overflow = '';
        }
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.tilda-popup-overlay.is-open, [data-tilda-popup].is-open').forEach(p => {
          p.classList.remove('is-open');
          p.style.display = 'none';
        });
        document.body.style.overflow = '';
      }
    });
  }

  // 13. Interactive Cost Calculators ([data-tilda-calc])
  function initCalculators() {
    document.querySelectorAll('[data-tilda-calc]').forEach(calc => {
      const totalEl = calc.querySelector('[data-calc-total]');
      const baseCost = parseFloat(calc.dataset.calcBase || 0);

      const recalculate = () => {
        let sum = baseCost;
        calc.querySelectorAll('input[type="range"][data-calc-price], input[type="number"][data-calc-price]').forEach(inp => {
          const val = parseFloat(inp.value) || 0;
          const price = parseFloat(inp.dataset.calcPrice) || 0;
          sum += val * price;
          const displayEl = calc.querySelector(`[data-calc-val-for="${inp.id || inp.name}"]`);
          if (displayEl) displayEl.textContent = val;
        });

        calc.querySelectorAll('input[type="checkbox"][data-calc-price]:checked, input[type="radio"][data-calc-price]:checked').forEach(inp => {
          sum += parseFloat(inp.dataset.calcPrice) || 0;
        });

        calc.querySelectorAll('select[data-calc-select]').forEach(sel => {
          const opt = sel.options[sel.selectedIndex];
          if (opt && opt.dataset.calcPrice) {
            sum += parseFloat(opt.dataset.calcPrice) || 0;
          }
        });

        if (totalEl) {
          totalEl.textContent = new Intl.NumberFormat('ru-RU').format(Math.round(sum)) + ' ₽';
        }
      };

      calc.addEventListener('input', recalculate);
      calc.addEventListener('change', recalculate);
      recalculate();
    });
  }

  // 14. Before / After Image Comparison Slider ([data-tilda-before-after])
  function initBeforeAfter() {
    document.querySelectorAll('[data-tilda-before-after]').forEach(wrapper => {
      const afterImg = wrapper.querySelector('.tilda-ba-after, [data-ba-after]');
      const handle = wrapper.querySelector('.tilda-ba-handle, [data-ba-handle]');
      if (!afterImg || !handle) return;

      let isDragging = false;
      const setPosition = (clientX) => {
        const rect = wrapper.getBoundingClientRect();
        let posX = clientX - rect.left;
        posX = Math.max(0, Math.min(rect.width, posX));
        const percent = (posX / rect.width) * 100;
        afterImg.style.width = `${percent}%`;
        handle.style.left = `${percent}%`;
      };

      handle.addEventListener('mousedown', () => isDragging = true);
      handle.addEventListener('touchstart', () => isDragging = true, { passive: true });

      window.addEventListener('mousemove', e => {
        if (isDragging) setPosition(e.clientX);
      });
      window.addEventListener('touchmove', e => {
        if (isDragging && e.touches[0]) setPosition(e.touches[0].clientX);
      }, { passive: true });

      window.addEventListener('mouseup', () => isDragging = false);
      window.addEventListener('touchend', () => isDragging = false);
    });
  }

  // 15. Countdown Timers ([data-tilda-timer])
  function initTimers() {
    document.querySelectorAll('[data-tilda-timer]').forEach(timerEl => {
      const targetDateStr = timerEl.dataset.timerDate || timerEl.dataset.tildaTimer;
      let targetTime;
      if (targetDateStr && !isNaN(Date.parse(targetDateStr))) {
        targetTime = new Date(targetDateStr).getTime();
      } else {
        targetTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
      }

      const daysEl = timerEl.querySelector('[data-timer-days]');
      const hoursEl = timerEl.querySelector('[data-timer-hours]');
      const minsEl = timerEl.querySelector('[data-timer-mins]');
      const secsEl = timerEl.querySelector('[data-timer-secs]');

      const update = () => {
        const now = Date.now();
        const diff = Math.max(0, targetTime - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
        if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
      };

      update();
      setInterval(update, 1000);
    });
  }

  // 16. Floating Messenger FAB Widget ([data-tilda-fab])
  function initFabWidgets() {
    document.querySelectorAll('[data-tilda-fab]').forEach(fab => {
      const mainBtn = fab.querySelector('.tilda-fab-btn, [data-fab-toggle]');
      const menu = fab.querySelector('.tilda-fab-menu, [data-fab-menu]');
      if (!mainBtn || !menu) return;

      mainBtn.addEventListener('click', e => {
        e.preventDefault();
        const isOpen = menu.classList.toggle('is-open');
        mainBtn.classList.toggle('is-active', isOpen);
      });
    });
  }

  // 17. Cookie / GDPR Banner ([data-tilda-cookie])
  function initCookieBanners() {
    const banners = document.querySelectorAll('[data-tilda-cookie]');
    if (!banners.length) return;
    try {
      if (localStorage.getItem('aurora_cookie_accepted') === '1') {
        banners.forEach(b => b.style.display = 'none');
        return;
      }
    } catch(e) {}

    banners.forEach(banner => {
      banner.style.display = 'flex';
      banner.querySelector('[data-cookie-accept]')?.addEventListener('click', e => {
        e.preventDefault();
        banner.style.display = 'none';
        try { localStorage.setItem('aurora_cookie_accepted', '1'); } catch(e) {}
      });
    });
  }

  // 18. Pricing Table Monthly / Yearly Toggle ([data-pricing-toggle])
  function initPricingToggles() {
    document.querySelectorAll('[data-pricing-toggle]').forEach(toggle => {
      const targetBlock = toggle.closest('.tilda-block') || document;
      const chk = toggle.querySelector('input[type="checkbox"]');
      const updatePrices = (isYearly) => {
        targetBlock.querySelectorAll('[data-price-monthly]').forEach(el => {
          el.textContent = isYearly ? (el.dataset.priceYearly || el.textContent) : el.dataset.priceMonthly;
        });
        targetBlock.querySelectorAll('[data-period-label]').forEach(el => {
          el.textContent = isYearly ? '/ год' : '/ месяц';
        });
      };

      if (chk) {
        chk.addEventListener('change', () => updatePrices(chk.checked));
      }
      toggle.querySelectorAll('[data-billing-period]').forEach(btn => {
        btn.addEventListener('click', () => {
          toggle.querySelectorAll('[data-billing-period]').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          updatePrices(btn.dataset.billingPeriod === 'yearly');
        });
      });
    });
  }

  // Toast Helper
  function showToast(msg) {
    let t = document.getElementById('tilda-runtime-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tilda-runtime-toast';
      t.className = 'tilda-runtime-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-show'), 3000);
  }

  // Bootstrap
  function initAll() {
    initNavigation();
    initAccordions();
    initSliders();
    initLightbox();
    initForms();
    Cart.init();
    initTabs();
    initFilters();
    initCounters();
    initQuizzes();
    initPopups();
    initCalculators();
    initBeforeAfter();
    initTimers();
    initFabWidgets();
    initCookieBanners();
    initPricingToggles();
    initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.TildaRuntime = {
    init: initAll,
    Cart,
    triggerAnimation,
    replayAllAnimations,
    initTabs,
    initFilters,
    initCounters,
    initQuizzes,
    initPopups,
    initCalculators,
    initBeforeAfter,
    initTimers,
    initFabWidgets,
    initCookieBanners,
    initPricingToggles,
    lightbox: window.AuroraLightbox
  };
})();
