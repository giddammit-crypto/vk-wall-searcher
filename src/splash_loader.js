/**
 * Aurora Splash Screen & Cartoon Cosmo Story Engine
 * 6-Act Cinematic Cartoon Intro:
 * 1. Sleeping Guard & Floating Books
 * 2. System Alert Impulse & Magenta Exclamation
 * 3. Morning Stretch & Sensor Calibration
 * 4. Joyful Jump & Neon Arc «КОСМО» Starburst
 * 5. Friendly Hand-Wave & Floating Levitation
 * 6. Photonic Warp Dissolve into Aurora Site
 */

export class AuroraSplashLoader {
    constructor(options = {}) {
        this.totalDuration = options.duration || 9.0; // 9 seconds rich story
        this.onComplete = options.onComplete || (() => {});

        this.container = document.getElementById('aurora-splash');
        this.stage = document.querySelector('.aurora-splash-stage');
        this.canvas = document.getElementById('aurora-splash-stars');
        this.arcContainer = document.getElementById('aurora-splash-arc-letters');
        this.progressFill = document.getElementById('aurora-splash-progress-fill');
        this.progressPercent = document.getElementById('aurora-splash-percent');
        this.progressStatus = document.getElementById('aurora-splash-status-text');
        this.skipBtn = document.getElementById('aurora-splash-skip');
        this.shadowEl = document.querySelector('.cosmo-hover-shadow');

        // Cartoon Actor Elements
        this.cosmoToon = document.getElementById('cosmo-toon');
        this.cosmoEyes = document.getElementById('cosmo-eyes');
        this.armRight = document.getElementById('cosmo-arm-wave');

        this.isRunning = false;
        this.isClosed = false;
        this.startTime = null;
        this.animFrameId = null;

        // Letters elements
        this.letterEls = [];

        // Canvas 2D Particle and Entity Store
        this.ctx = null;
        this.stars = [];
        this.books = [];
        this.zzzParticles = [];
        this.shockwaves = [];
        this.sparkles = [];
        this.burstTriggered = false;
        this.alertTriggered = false;

        this.init();
    }

    init() {
        if (!this.container) return;

        // Ensure cartoon DOM is properly present
        this.ensureCartoonDom();

        // Setup Controls (Skip button & Keyboard)
        this.setupControls();

        // Setup SVG Arc Typography
        this.setupCurvedLetters();

        // Initialize 2D Canvas Story Environment
        this.initCanvasFx();

        // Start Master Story Timeline
        this.start();
    }

    ensureCartoonDom() {
        const viewport = document.querySelector('.aurora-splash-robot-viewport');
        if (!viewport) return;

        // If WebGL canvas is present, replace or overlay with cartoon Cosmo
        const existingToon = document.getElementById('cosmo-toon');
        if (!existingToon) {
            viewport.innerHTML = `
                <div class="cosmo-toon act-sleeping" id="cosmo-toon">
                    <div class="cosmo-aura"></div>
                    <div class="cosmo-toon-body-group">
                        <div class="cosmo-toon-antenna">
                            <div class="antenna-orb">
                                <div class="antenna-pulse"></div>
                            </div>
                            <div class="antenna-rod"></div>
                        </div>
                        <div class="cosmo-toon-head">
                            <div class="cosmo-ear cosmo-ear-left"></div>
                            <div class="cosmo-ear cosmo-ear-right"></div>
                            <div class="cosmo-visor">
                                <div class="cosmo-visor-glare"></div>
                                <div class="cosmo-eyes eyes-sleeping" id="cosmo-eyes">
                                    <div class="cosmo-eye cosmo-eye-left"><span class="eye-symbol"></span></div>
                                    <div class="cosmo-eye cosmo-eye-right"><span class="eye-symbol"></span></div>
                                </div>
                                <div class="cosmo-blush cosmo-blush-left"></div>
                                <div class="cosmo-blush cosmo-blush-right"></div>
                            </div>
                        </div>
                        <div class="cosmo-toon-torso">
                            <div class="cosmo-arm cosmo-arm-left">
                                <div class="arm-segment"></div>
                                <div class="hand-segment"></div>
                            </div>
                            <div class="torso-core-badge">
                                <div class="core-pulsar"></div>
                            </div>
                            <div class="cosmo-arm cosmo-arm-right" id="cosmo-arm-wave">
                                <div class="arm-segment"></div>
                                <div class="hand-segment"></div>
                            </div>
                        </div>
                        <div class="cosmo-thruster-flame"></div>
                    </div>
                    <div class="cosmo-hover-shadow"></div>
                </div>
            `;
            this.cosmoToon = document.getElementById('cosmo-toon');
            this.cosmoEyes = document.getElementById('cosmo-eyes');
            this.armRight = document.getElementById('cosmo-arm-wave');
            this.shadowEl = document.querySelector('.cosmo-hover-shadow');
        }
    }

    setupControls() {
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => this.finish(true));
        }

        this.keydownHandler = (e) => {
            if (e.key === 'Escape' || e.code === 'Space') {
                this.finish(true);
            }
        };
        window.addEventListener('keydown', this.keydownHandler);
    }

    setupCurvedLetters() {
        if (!this.arcContainer) return;
        const letters = ['К', 'О', 'С', 'М', 'О'];
        this.arcContainer.innerHTML = '';
        this.letterEls = [];

        letters.forEach((char, index) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = char;
            tspan.setAttribute('class', 'aurora-splash-arc-letter');
            tspan.setAttribute('dx', index === 0 ? '0' : '16');
            tspan.style.opacity = '0';
            this.arcContainer.appendChild(tspan);
            this.letterEls.push(tspan);
        });
    }

    initCanvasFx() {
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;

        let w = this.canvas.width = window.innerWidth;
        let h = this.canvas.height = window.innerHeight;

        // 1. Static & Drifting Stars
        const starCount = Math.min(180, Math.floor((w * h) / 7500));
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                radius: Math.random() * 1.5 + 0.5,
                vy: -(Math.random() * 0.22 + 0.04),
                vx: (Math.random() - 0.5) * 0.08,
                opacity: Math.random() * 0.6 + 0.2,
                pulseAngle: Math.random() * Math.PI * 2,
                color: Math.random() > 0.35 ? '56, 189, 248' : (Math.random() > 0.5 ? '236, 72, 153' : '139, 92, 246')
            });
        }

        // 2. Zero-Gravity Floating Magical Books (Library Theme)
        const bookCount = 7;
        const bookPalettes = [
            { cover: '#38bdf8', pages: '#e0f2fe' },
            { cover: '#ec4899', pages: '#fce7f3' },
            { cover: '#8b5cf6', pages: '#ede9fe' },
            { cover: '#6366f1', pages: '#e0e7ff' }
        ];

        for (let b = 0; b < bookCount; b++) {
            const side = b % 2 === 0 ? -1 : 1;
            this.books.push({
                x: w * 0.5 + side * (120 + Math.random() * (w * 0.35)),
                y: h * 0.35 + (Math.random() - 0.5) * 200,
                width: 24 + Math.random() * 10,
                height: 32 + Math.random() * 10,
                angle: (Math.random() - 0.5) * 0.6,
                vAngle: (Math.random() - 0.5) * 0.008,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: 0.75,
                palette: bookPalettes[b % bookPalettes.length],
                openAngle: 0.25 + Math.random() * 0.4
            });
        }

        this.resizeHandler = () => {
            if (!this.canvas) return;
            w = this.canvas.width = window.innerWidth;
            h = this.canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    start() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.loop();
    }

    loop() {
        if (!this.isRunning || this.isClosed) return;

        const now = performance.now();
        const elapsed = (now - this.startTime) / 1000; // seconds

        // Update narrative state machine & timeline
        this.updateStory(elapsed);

        // Render Canvas 2D frame
        this.renderCanvas(elapsed);

        if (elapsed >= this.totalDuration) {
            this.finish(false);
            return;
        }

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    updateStory(t) {
        const clampedT = Math.min(this.totalDuration, Math.max(0, t));
        const normT = clampedT / this.totalDuration;

        // Progress Bar Calculation (Subtle cubic ease)
        const progressRaw = 100 * (0.68 * normT + 0.18 * Math.sin(Math.PI * normT) + 0.14 * Math.pow(normT, 3));
        const progress = Math.min(100, Math.max(0, progressRaw));

        if (this.progressFill) this.progressFill.style.width = `${progress.toFixed(1)}%`;
        if (this.progressPercent) this.progressPercent.textContent = `${Math.floor(progress)}%`;

        // =====================================================================
        // ACT 1: Sleeping Guard of Aurora (0.0s - 2.4s)
        // =====================================================================
        if (clampedT < 2.4) {
            if (this.cosmoToon && !this.cosmoToon.classList.contains('act-sleeping')) {
                this.resetActClasses();
                this.cosmoToon.classList.add('act-sleeping');
                if (this.cosmoEyes) {
                    this.cosmoEyes.className = 'cosmo-eyes eyes-sleeping';
                }
            }
            if (this.progressStatus) {
                this.progressStatus.textContent = 'КОСМО В РЕЖИМЕ ГЛУБОКОГО СНА...';
            }

            // Emit Zzz particles from Cosmo antenna
            if (Math.random() < 0.08) {
                this.spawnZzz();
            }
        }

        // =====================================================================
        // ACT 2: System Alert Impulse (2.4s - 3.4s)
        // =====================================================================
        else if (clampedT >= 2.4 && clampedT < 3.4) {
            if (!this.alertTriggered) {
                this.alertTriggered = true;
                if (this.stage) {
                    this.stage.classList.add('screen-shake');
                    setTimeout(() => this.stage && this.stage.classList.remove('screen-shake'), 450);
                }
                this.triggerAlertSonar();
            }

            if (this.cosmoToon && !this.cosmoToon.classList.contains('act-alert')) {
                this.resetActClasses();
                this.cosmoToon.classList.add('act-alert');
                if (this.cosmoEyes) {
                    this.cosmoEyes.className = 'cosmo-eyes eyes-alert';
                }
            }
            if (this.progressStatus) {
                this.progressStatus.textContent = '⚡ СИСТЕМНЫЙ СИГНАЛ! ЗАПРОС ЧИТАТЕЛЯ...';
            }
        }

        // =====================================================================
        // ACT 3: Morning Stretch & Sensor Calibration (3.4s - 5.0s)
        // =====================================================================
        else if (clampedT >= 3.4 && clampedT < 5.0) {
            if (this.cosmoToon && !this.cosmoToon.classList.contains('act-stretch')) {
                this.resetActClasses();
                this.cosmoToon.classList.add('act-stretch');
                if (this.cosmoEyes) {
                    this.cosmoEyes.className = 'cosmo-eyes eyes-scanning';
                    // After short calibration, blink into wide curious eyes
                    setTimeout(() => {
                        if (this.cosmoEyes && !this.isClosed) {
                            this.cosmoEyes.className = 'cosmo-eyes eyes-curious';
                        }
                    }, 700);
                }
            }
            if (this.progressStatus) {
                this.progressStatus.textContent = 'КАЛИБРОВКА СЕРВОПРИВОДОВ И БАЗ ДАННЫХ...';
            }
        }

        // =====================================================================
        // ACT 4: Joyful Heroic Jump & Neon Arc «КОСМО» (5.0s - 6.6s)
        // =====================================================================
        else if (clampedT >= 5.0 && clampedT < 6.6) {
            if (!this.burstTriggered) {
                this.burstTriggered = true;
                this.triggerStarburst();
            }

            if (this.cosmoToon && !this.cosmoToon.classList.contains('act-jump')) {
                this.resetActClasses();
                this.cosmoToon.classList.add('act-jump');
                if (this.cosmoEyes) {
                    this.cosmoEyes.className = 'cosmo-eyes eyes-happy';
                }
            }
            if (this.progressStatus) {
                this.progressStatus.textContent = 'СИНХРОНИЗАЦИЯ С 16 БИБЛИОТЕКАМИ ВЛАДИМИРА...';
            }
        }

        // =====================================================================
        // ACT 5: Friendly Hand-Wave & Floating Levitation (6.6s - 8.4s)
        // =====================================================================
        else if (clampedT >= 6.6 && clampedT < 8.4) {
            if (this.cosmoToon && !this.cosmoToon.classList.contains('act-wave')) {
                this.resetActClasses();
                this.cosmoToon.classList.add('act-wave', 'act-floating');
                if (this.cosmoEyes) {
                    this.cosmoEyes.className = 'cosmo-eyes eyes-wink';
                    setTimeout(() => {
                        if (this.cosmoEyes && !this.isClosed) {
                            this.cosmoEyes.className = 'cosmo-eyes eyes-happy';
                        }
                    }, 900);
                }
            }
            if (this.progressStatus) {
                this.progressStatus.textContent = 'КОСМО ПРИВЕТСТВУЕТ ВАС В АВРОРЕ!';
            }
        }

        // =====================================================================
        // ACT 6: Ready & Photonic Warp Transition (8.4s - end)
        // =====================================================================
        else {
            if (this.progressStatus) {
                this.progressStatus.textContent = 'СИСТЕМА ГОТОВА К РАБОТЕ!';
            }
        }

        // -------------------------------------------------------------
        // SVG Arc Typography «КОСМО» Staggered Reveal (5.2s - 7.0s)
        // -------------------------------------------------------------
        const arcStart = 5.1;
        const arcStagger = 0.12;
        this.letterEls.forEach((el, i) => {
            const letterT = arcStart + i * arcStagger;
            if (clampedT < letterT) {
                el.style.opacity = '0';
            } else {
                const u = Math.min(1, (clampedT - letterT) / 0.45);
                const opacity = this.smoothstep(0, 1, u);
                el.style.opacity = opacity.toFixed(3);
                if (u < 0.6) {
                    el.style.filter = 'drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 18px #38bdf8) drop-shadow(0 0 28px #ec4899)';
                } else {
                    el.style.filter = '';
                }
            }
        });
    }

    resetActClasses() {
        if (!this.cosmoToon) return;
        this.cosmoToon.classList.remove('act-sleeping', 'act-alert', 'act-stretch', 'act-jump', 'act-wave', 'act-floating');
    }

    spawnZzz() {
        const viewport = document.querySelector('.aurora-splash-robot-viewport');
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        this.zzzParticles.push({
            x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 12,
            y: rect.top + 35,
            size: 14 + Math.random() * 6,
            opacity: 0.9,
            vy: -(0.7 + Math.random() * 0.4),
            vx: 0.3 + (Math.random() - 0.5) * 0.2,
            life: 1.0,
            angle: (Math.random() - 0.5) * 0.3
        });
    }

    triggerAlertSonar() {
        const viewport = document.querySelector('.aurora-splash-robot-viewport');
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        this.shockwaves.push({ cx, cy, radius: 10, maxRadius: 160, opacity: 0.9, color: '236, 72, 153', lw: 3 });
        this.shockwaves.push({ cx, cy, radius: 5, maxRadius: 130, opacity: 0.8, color: '56, 189, 248', lw: 2 });
    }

    triggerStarburst() {
        const viewport = document.querySelector('.aurora-splash-robot-viewport');
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // 45 celebratory sparkles
        for (let i = 0; i < 48; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 5.5;
            this.sparkles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                radius: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#38bdf8' : (Math.random() > 0.5 ? '#ec4899' : '#ffffff'),
                life: 1.0,
                decay: 0.016 + Math.random() * 0.014
            });
        }
    }

    renderCanvas(t) {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Cosmic Stars Layer
        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            s.y += s.vy;
            s.x += s.vx;
            s.pulseAngle += 0.025;

            if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }
            if (s.x < -5) s.x = w + 5;
            if (s.x > w + 5) s.x = -5;

            const alpha = Math.max(0.12, Math.min(0.9, s.opacity + Math.sin(s.pulseAngle) * 0.28));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
            ctx.fill();
        }

        // 2. Floating Zero-G Magical Books
        for (let b = 0; b < this.books.length; b++) {
            const bk = this.books[b];
            bk.x += bk.vx;
            bk.y += bk.vy;
            bk.angle += bk.vAngle;

            // Gentle soft bounce on boundaries
            if (bk.x < 30 || bk.x > w - 30) bk.vx *= -1;
            if (bk.y < 50 || bk.y > h - 120) bk.vy *= -1;

            ctx.save();
            ctx.translate(bk.x, bk.y);
            ctx.rotate(bk.angle);
            ctx.globalAlpha = bk.opacity;

            // Glowing Book Spine & Cover
            ctx.shadowColor = bk.palette.cover;
            ctx.shadowBlur = 12;
            ctx.fillStyle = bk.palette.cover;
            ctx.beginPath();
            ctx.roundRect(-bk.width / 2, -bk.height / 2, bk.width, bk.height, 3);
            ctx.fill();

            // Glowing illuminated pages
            ctx.shadowBlur = 0;
            ctx.fillStyle = bk.palette.pages;
            ctx.fillRect(-bk.width / 2 + 3, -bk.height / 2 + 2, bk.width - 6, bk.height - 4);

            // Mini Bookmark ribbon
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(-1, bk.height / 2 - 3, 2, 7);

            ctx.restore();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // 3. Sleeping "Zzz" Particles
        for (let z = this.zzzParticles.length - 1; z >= 0; z--) {
            const zp = this.zzzParticles[z];
            zp.x += zp.vx + Math.sin(t * 3 + z) * 0.4;
            zp.y += zp.vy;
            zp.life -= 0.015;

            if (zp.life <= 0) {
                this.zzzParticles.splice(z, 1);
                continue;
            }

            ctx.save();
            ctx.font = `bold ${zp.size}px 'Unbounded', sans-serif`;
            ctx.fillStyle = `rgba(56, 189, 248, ${zp.life * 0.85})`;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.fillText('Z', zp.x, zp.y);
            ctx.restore();
        }

        // 4. Alert Sonar Shockwaves
        for (let sw = this.shockwaves.length - 1; sw >= 0; sw--) {
            const wave = this.shockwaves[sw];
            wave.radius += 5.5;
            wave.opacity = Math.max(0, 1 - (wave.radius / wave.maxRadius));

            if (wave.opacity <= 0 || wave.radius >= wave.maxRadius) {
                this.shockwaves.splice(sw, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(wave.cx, wave.cy, wave.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${wave.color}, ${wave.opacity})`;
            ctx.lineWidth = wave.lw;
            ctx.shadowColor = `rgb(${wave.color})`;
            ctx.shadowBlur = 14;
            ctx.stroke();
            ctx.restore();
        }

        // 5. Starburst Sparkles
        for (let sp = this.sparkles.length - 1; sp >= 0; sp--) {
            const p = this.sparkles[sp];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08; // gravity
            p.life -= p.decay;

            if (p.life <= 0) {
                this.sparkles.splice(sp, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.restore();
        }
    }

    smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    finish(isImmediate = false) {
        if (this.isClosed) return;
        this.isClosed = true;
        this.isRunning = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        // Fill progress to 100%
        if (this.progressFill) this.progressFill.style.width = '100%';
        if (this.progressPercent) this.progressPercent.textContent = '100%';
        if (this.progressStatus) this.progressStatus.textContent = 'СИСТЕМА ГОТОВА К РАБОТЕ!';

        const fadeDuration = isImmediate ? 200 : 650;

        if (this.container) {
            this.container.classList.add('aurora-splash-closing');
            setTimeout(() => {
                this.container.classList.add('aurora-splash-hidden');
                if (typeof this.onComplete === 'function') {
                    this.onComplete();
                }
            }, fadeDuration);
        } else {
            if (typeof this.onComplete === 'function') {
                this.onComplete();
            }
        }
    }
}
