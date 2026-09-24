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
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerHeight = document.querySelector('.tilda-header')?.offsetHeight || 70;
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

  // 4. Lightbox Modal for Images
  function initLightbox() {
    let overlay = document.getElementById('tilda-lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tilda-lightbox-overlay';
      overlay.className = 'tilda-lightbox-overlay';
      overlay.innerHTML = `
        <div class="tilda-lightbox-container">
          <img class="tilda-lightbox-img" src="" alt="Zoomed view" />
          <button class="tilda-lightbox-close" aria-label="Закрыть">&times;</button>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', e => {
        if (e.target === overlay || e.target.classList.contains('tilda-lightbox-close')) {
          overlay.classList.remove('is-open');
        }
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
          overlay.classList.remove('is-open');
        }
      });
    }

    const imgEl = overlay.querySelector('.tilda-lightbox-img');

    document.querySelectorAll('[data-tilda-lightbox], .tilda-gallery img, .tilda-lightbox-trigger').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const fullSrc = img.dataset.srcFull || img.dataset.src || img.src;
        if (fullSrc && imgEl) {
          imgEl.src = fullSrc;
          overlay.classList.add('is-open');
        }
      });
    });
  }

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
          const price = parseFloat(btn.dataset.productPrice || card?.querySelector('[data-product-price]')?.textContent?.replace(/[^\d.]/g, '') || 0);
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

      let html = '';
      this.items.forEach((item, idx) => {
        html += `
          <div class="tilda-cart-row">
            ${item.img ? `<img src="${item.img}" class="tilda-cart-thumb" />` : ''}
            <div class="tilda-cart-info">
              <div class="tilda-cart-title">${item.name}</div>
              <div class="tilda-cart-price">${item.price} ₽</div>
            </div>
            <div class="tilda-cart-controls">
              <button class="tilda-qty-btn" onclick="window.TildaCart.updateQty(${idx}, -1)">−</button>
              <span>${item.qty || 1}</span>
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

  // 7. Scroll Animations (IntersectionObserver)
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-tilda-anim], .tilda-animate-on-scroll');
    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('tilda-animated-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animatedElements.forEach(el => observer.observe(el));
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
    initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.TildaRuntime = { init: initAll, Cart };
})();
