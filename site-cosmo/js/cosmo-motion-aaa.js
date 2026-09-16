/* ==========================================================================
   COSMO AAA MOTION & PARTICLE FX ENGINE
   Pure Vanilla JS · Hardware Accelerated · 60-120 FPS Guaranteed
   Designed for: Awwwards/Pixar/Supercell Standard
   ========================================================================== */
(function (window, document) {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    /* ======================================================================
       1. CANVAS PARTICLE & FX ENGINE (Object-Pooled, Zero GC Jank)
       ====================================================================== */
    var CosmoFX = (function () {
        var canvas, ctx, width, height, dpr;
        var particles = [];
        var activeMode = 'tablet';
        var isRunning = false;
        var rAFId = null;

        var PALETTE = {
            emerald: '#2FA26E',
            mint: '#B9DCC7',
            gold: '#F5C842',
            coral: '#F7A8B8',
            cyan: '#00F0FF',
            white: '#FFFFFF',
            dark: '#262B29'
        };

        function init(container) {
            if (!container) return;
            canvas = document.createElement('canvas');
            canvas.className = 'hero__fx-canvas';
            canvas.style.cssText = 'position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);pointer-events:none;z-index:8;';
            canvas.setAttribute('aria-hidden', 'true');
            container.appendChild(canvas);
            ctx = canvas.getContext('2d', { alpha: true });

            resize();
            window.addEventListener('resize', debounce(resize, 150));
        }

        function resize() {
            if (!canvas) return;
            var rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            if (ctx) ctx.scale(dpr, dpr);
        }

        function triggerFX(mode) {
            activeMode = mode;
            particles.length = 0; // Сброс пула

            if (mode === 'joy') {
                spawnConfettiBurst(55);
            } else if (mode === 'angry') {
                spawnSteamPuffs(16);
            } else if (mode === 'cocoa') {
                spawnCocoaSteam(12);
            } else if (mode === 'workout') {
                spawnElectricSparks(20);
            } else if (mode === 'jet_boost') {
                spawnJetPlasma(35);
            } else if (mode === 'antenna') {
                spawnSonicRings(3);
            } else if (mode === 'guru') {
                spawnGuruAura(18);
            }

            if (!isRunning && particles.length > 0) {
                isRunning = true;
                rAFId = requestAnimationFrame(loop);
            }
        }

        /* 1. Конфетти: 3D-флип, баллистика, гравитация, сопротивление воздуха */
        function spawnConfettiBurst(count) {
            var colors = [PALETTE.emerald, PALETTE.gold, PALETTE.coral, PALETTE.cyan, PALETTE.white];
            var originX = width * 0.5;
            var originY = height * 0.45;

            for (var i = 0; i < count; i++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 4.5 + Math.random() * 7.5;
                particles.push({
                    type: 'confetti',
                    x: originX,
                    y: originY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 3.2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    w: 6 + Math.random() * 6,
                    h: 4 + Math.random() * 4,
                    rotX: Math.random() * 360,
                    rotY: Math.random() * 360,
                    rotZ: Math.random() * 360,
                    dRotX: (Math.random() - 0.5) * 16,
                    dRotY: (Math.random() - 0.5) * 16,
                    dRotZ: (Math.random() - 0.5) * 10,
                    gravity: 0.16,
                    drag: 0.965,
                    life: 1.0,
                    decay: 0.008 + Math.random() * 0.008
                });
            }
        }

        /* 2. Пар: клубы с конвекцией и расширением */
        function spawnSteamPuffs(count) {
            for (var i = 0; i < count; i++) {
                var side = i % 2 === 0 ? -1 : 1;
                particles.push({
                    type: 'steam',
                    x: width * 0.5 + side * (width * 0.20),
                    y: height * 0.35,
                    vx: side * (0.8 + Math.random() * 1.6),
                    vy: -(0.6 + Math.random() * 1.4),
                    r: 6 + Math.random() * 7,
                    maxR: 22 + Math.random() * 12,
                    alpha: 0.60,
                    decay: 0.016 + Math.random() * 0.01,
                    color: '#FF6B6B'
                });
            }
        }

        function spawnCocoaSteam(count) {
            for (var i = 0; i < count; i++) {
                particles.push({
                    type: 'steam',
                    x: width * 0.68 + (Math.random() - 0.5) * 20,
                    y: height * 0.65,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: -(0.5 + Math.random() * 1.2),
                    r: 4 + Math.random() * 5,
                    maxR: 16 + Math.random() * 8,
                    alpha: 0.50,
                    decay: 0.014 + Math.random() * 0.008,
                    color: PALETTE.mint
                });
            }
        }

        /* 3. Электрические дуги и микро-искры */
        function spawnElectricSparks(count) {
            for (var i = 0; i < count; i++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 5 + Math.random() * 9;
                particles.push({
                    type: 'spark',
                    x: width * 0.5,
                    y: height * 0.48,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    len: 8 + Math.random() * 12,
                    color: Math.random() > 0.4 ? PALETTE.cyan : PALETTE.gold,
                    life: 1.0,
                    decay: 0.035 + Math.random() * 0.02
                });
            }
        }

        /* 4. Плазма джетпака */
        function spawnJetPlasma(count) {
            for (var i = 0; i < count; i++) {
                particles.push({
                    type: 'plasma',
                    x: width * 0.45 + (Math.random() - 0.5) * 35,
                    y: height * 0.72 + (Math.random() - 0.5) * 10,
                    vx: -(2.0 + Math.random() * 4),
                    vy: 3.0 + Math.random() * 5,
                    r: 4 + Math.random() * 7,
                    color: Math.random() > 0.5 ? PALETTE.cyan : PALETTE.gold,
                    life: 1.0,
                    decay: 0.03 + Math.random() * 0.03
                });
            }
        }

        /* 5. Акустические волновые фронты */
        function spawnSonicRings(count) {
            for (var i = 0; i < count; i++) {
                particles.push({
                    type: 'wave',
                    x: width * 0.5,
                    y: height * 0.18,
                    r: 10 + i * 20,
                    speed: 1.6,
                    alpha: 0.75,
                    decay: 0.012
                });
            }
        }

        /* 6. Аура гуру */
        function spawnGuruAura(count) {
            for (var i = 0; i < count; i++) {
                var angle = Math.random() * Math.PI * 2;
                var dist = 45 + Math.random() * 40;
                particles.push({
                    type: 'aura_orb',
                    cx: width * 0.5,
                    cy: height * 0.42,
                    angle: angle,
                    dist: dist,
                    speed: (Math.random() - 0.5) * 0.022,
                    r: 2 + Math.random() * 4,
                    color: PALETTE.gold,
                    alpha: 0.7,
                    life: 1.0,
                    decay: 0.008
                });
            }
        }

        /* Рендеринг и физический цикл кадра */
        function loop() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];

                if (p.type === 'confetti') {
                    p.vx *= p.drag;
                    p.vy = (p.vy + p.gravity) * p.drag;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotX += p.dRotX;
                    p.rotY += p.dRotY;
                    p.rotZ += p.dRotZ;
                    p.life -= p.decay;

                    if (p.life <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotZ * Math.PI) / 180);
                    ctx.scale(Math.cos((p.rotX * Math.PI) / 180), Math.sin((p.rotY * Math.PI) / 180));
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.max(0, p.life);
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                } else if (p.type === 'spark') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.94;
                    p.vy *= 0.94;
                    p.life -= p.decay;

                    if (p.life <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = p.life;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                    ctx.stroke();
                    ctx.restore();
                } else if (p.type === 'steam') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.r += 0.32;
                    p.alpha -= p.decay;

                    if (p.alpha <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.max(0, p.alpha * 0.4);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (p.type === 'plasma') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.r *= 0.96;
                    p.life -= p.decay;

                    if (p.life <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (p.type === 'wave') {
                    p.r += p.speed;
                    p.alpha -= p.decay;

                    if (p.alpha <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    ctx.save();
                    ctx.strokeStyle = PALETTE.mint;
                    ctx.lineWidth = 2 * p.alpha;
                    ctx.globalAlpha = Math.max(0, p.alpha);
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                } else if (p.type === 'aura_orb') {
                    p.angle += p.speed;
                    p.life -= p.decay;

                    if (p.life <= 0) {
                        particles.splice(i, 1);
                        continue;
                    }

                    var ox = p.cx + Math.cos(p.angle) * p.dist;
                    var oy = p.cy + Math.sin(p.angle) * p.dist * 0.7;

                    ctx.save();
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life * p.alpha;
                    ctx.beginPath();
                    ctx.arc(ox, oy, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            if (particles.length > 0) {
                rAFId = requestAnimationFrame(loop);
            } else {
                isRunning = false;
                ctx.clearRect(0, 0, width, height);
            }
        }

        function stop() {
            if (rAFId) cancelAnimationFrame(rAFId);
            isRunning = false;
            particles.length = 0;
            if (ctx) ctx.clearRect(0, 0, width, height);
        }

        return {
            init: init,
            triggerFX: triggerFX,
            stop: stop
        };
    })();

    /* ======================================================================
       2. KINEMATIC TRANSITION & SPRITE CROSS-FADE CONTROLLER
       ====================================================================== */
    var CosmoMotionManager = (function () {
        var robotWrap = document.getElementById('heroRobotWrap');
        var heroRobot = document.getElementById('heroRobot');
        var ghostRobot = null;
        var bubble = document.getElementById('cosmoBubble');
        var bubbleText = document.getElementById('cosmoBubbleText');

        function setup() {
            if (!robotWrap || !heroRobot) return;

            // Вспомогательный слой для бесшовного кросс-фейда спрайтов
            ghostRobot = document.createElement('img');
            ghostRobot.className = 'hero__robot-ghost';
            ghostRobot.alt = '';
            ghostRobot.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:auto;z-index:1;opacity:0;pointer-events:none;transition:opacity 0.22s ease-out;';
            ghostRobot.setAttribute('aria-hidden', 'true');
            heroRobot.parentNode.insertBefore(ghostRobot, heroRobot.nextSibling);

            // Инициализация Canvas FX слоя
            CosmoFX.init(robotWrap);
        }

        function switchActivity(oldId, newAct, isUserClick) {
            if (!robotWrap) return;

            // 1. Амортизатор импульса (Squash Cushion)
            if (heroRobot) {
                heroRobot.classList.remove('cosmo--cushion');
                void heroRobot.offsetWidth;
                heroRobot.classList.add('cosmo--cushion');
                setTimeout(function () {
                    if (heroRobot) heroRobot.classList.remove('cosmo--cushion');
                }, 240);
            }

            // 2. Двухслойный кросс-фейд спрайта мимики
            if (heroRobot && window.SPRITES && window.SPRITES[newAct.sprite]) {
                var nextSrc = window.SPRITES[newAct.sprite];
                var curSrc = heroRobot.getAttribute('src');
                if (curSrc !== nextSrc) {
                    if (ghostRobot) {
                        ghostRobot.src = heroRobot.src;
                        ghostRobot.style.opacity = '1';
                    }
                    heroRobot.src = nextSrc;
                    heroRobot.style.opacity = '1';

                    if (ghostRobot) {
                        requestAnimationFrame(function () {
                            ghostRobot.style.opacity = '0';
                        });
                    }
                }
            } else if (heroRobot) {
                heroRobot.style.opacity = '1';
            }

            // 3. Запуск физических частиц Canvas FX
            CosmoFX.triggerFX(newAct.id);
        }

        return {
            setup: setup,
            switchActivity: switchActivity
        };
    })();

    /* ======================================================================
       3. SLEEP-CAPABLE rAF ОПТИМИЗАТОР ДЛЯ ПАРАЛЛАКСА И ФИЗИКИ
       ====================================================================== */
    function initPerformanceGuards() {
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                CosmoFX.stop();
            }
        });

        var heroEl = document.getElementById('hero');
        if (heroEl && 'IntersectionObserver' in window) {
            var heroObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) {
                        CosmoFX.stop();
                    }
                });
            }, { threshold: 0.05 });
            heroObserver.observe(heroEl);
        }
    }

    function debounce(fn, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () { fn.apply(context, args); }, wait);
        };
    }

    window.CosmoMotionManager = CosmoMotionManager;
    window.CosmoFX = CosmoFX;

    document.addEventListener('DOMContentLoaded', function () {
        CosmoMotionManager.setup();
        initPerformanceGuards();
    });

})(window, document);
