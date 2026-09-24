/**
 * Aurora Splash Screen & 3D Cosmo Robot Engine — «PIXAR EDITION»
 * Комедийная хореография по режиссёрскому бит-листу (13 битов, 8 секунд):
 * влёт-прошивка → торможение с «Ой!» → геройская поза → пинок по зависшему
 * прогрессбару → кувырок → пого на ионной тяге → конфетти-пушка → «Поехали!».
 *
 * Модель без рига — всё тело анимируется трансформациями группы.
 * Реакции-эмоции: PNG-стикеры + комикс-облачка. FX: 2D-оверлей (конфетти,
 * speed lines, ударные волны, сердечки) + 3D-частицы (реактивный след, пыль).
 */

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;

/* Палитра конфетти/искр (Pixar-candy) */
const FX_COLORS = ['#38bdf8', '#7dd3fc', '#a78bfa', '#f472b6', '#fbbf24', '#fde68a', '#ffffff'];

/* Расписание реакций Космо: стикер-эмоция + реплика (side — сторона стикера) */
const REACTIONS = [
    { t0: 0.85, t1: 1.35, img: 'robot_shock',    text: 'Ой!',       side: 'left'  },
    { t0: 1.75, t1: 2.20, img: 'robot_cool',     text: 'Это план!', side: 'right' },
    { t0: 2.20, t1: 2.55, img: 'robot_yawn',     text: 'Скучно...', side: 'left'  },
    { t0: 2.75, t1: 2.95, img: 'robot_thinking', text: 'Хм?',       side: 'right' },
    { t0: 3.30, t1: 3.80, img: 'robot_idea',     text: 'Есть!',     side: 'left'  },
    { t0: 4.00, t1: 4.35, img: 'robot_laugh',    text: 'Ха!',       side: 'right' },
    { t0: 4.65, t1: 5.10, img: 'robot_party',    text: 'Ух!',       side: 'left'  },
    { t0: 5.55, t1: 5.95, img: 'robot_love',     text: 'Красота!',  side: 'right' },
    { t0: 6.00, t1: 6.30, img: 'robot_wink',     text: 'Готов?',    side: 'left'  },
    { t0: 6.90, t1: 7.20, img: 'robot_cool',     text: 'Йо-хо!',    side: 'right' },
    { t0: 7.55, t1: 7.95, img: 'robot_waving',   text: 'Поехали!',  side: 'left'  },
];

/* Русские статусы — «закадровый рассказчик» */
const STATUSES = [
    { until: 1.5,  text: 'РАЗОГРЕВ ИОНОВЫХ ТУРБИН...' },
    { until: 2.9,  text: 'ПРИЧАЛИЛ. ПОЧТИ ЭЛЕГАНТНО...' },
    { until: 3.6,  text: 'БАР ЗАВИС. У КОСМО ЕСТЬ ИДЕЯ...' },
    { until: 4.6,  text: 'КУВЫРОК ПАРИТЕТА ВЫПОЛНЕН!' },
    { until: 5.6,  text: 'ПРЫГ-СКОК НА ИОННОЙ ТЯГЕ...' },
    { until: 6.3,  text: 'НА 75% ВСЕГДА ТОРМОЗИМ. КЛАССИКА!' },
    { until: 7.25, text: 'СИНХРОНИЗАЦИЯ С 16 БИБЛИОТЕКАМИ...' },
    { until: 99,   text: 'СИСТЕМА ГОТОВА К РАБОТЕ!' },
];

export class AuroraSplashLoader {
    constructor(options = {}) {
        this.totalDuration = options.duration || 8.0;
        this.onComplete = options.onComplete || (() => {});
        this.modelUrl = options.modelUrl || 'assets/models/cute_robot.glb';

        this.container = document.getElementById('aurora-splash');
        this.stageEl = document.getElementById('aurora-splash-stage');
        this.starsCanvas = document.getElementById('aurora-splash-stars');
        this.fxCanvas = document.getElementById('aurora-splash-fx');
        this.webglCanvas = document.getElementById('aurora-splash-webgl');
        this.mascotFallback = document.getElementById('aurora-splash-mascot-fallback');
        this.arcLettersGroup = document.getElementById('aurora-splash-arc-letters');
        this.stickerEl = document.getElementById('aurora-splash-sticker');
        this.bubbleEl = document.getElementById('aurora-splash-bubble');
        this.bubbleTextEl = document.getElementById('aurora-splash-bubble-text');
        this.ufoEl = document.getElementById('aurora-splash-ufo');
        this.progressFill = document.getElementById('aurora-splash-progress-fill');
        this.progressTrack = this.progressFill ? this.progressFill.parentElement : null;
        this.progressTip = document.getElementById('aurora-splash-progress-tip');
        this.progressPercent = document.getElementById('aurora-splash-percent');
        this.progressStatus = document.getElementById('aurora-splash-status-text');
        this.skipBtn = document.getElementById('aurora-splash-skip');
        this.shadowEl = document.querySelector('.aurora-splash-hover-shadow');
        this.ionGlowEl = document.querySelector('.aurora-splash-ion-glow');
        this.viewportEl = document.querySelector('.aurora-splash-robot-viewport');
        this.hudStars = this.progressTrack
            ? Array.from(this.progressTrack.querySelectorAll('.hud-star'))
            : [];

        this.isRunning = false;
        this.isClosed = false;
        this.startTime = null;
        this.lastNow = null;
        this.animFrameId = null;

        this.reducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Debug-параметры: ?splash_t=3.2 (заморозить кадр), ?splash_speed=0.3 (slow-mo)
        try {
            const q = new URLSearchParams(window.location.search);
            this.freezeT = q.get('splash_t') !== null ? parseFloat(q.get('splash_t')) : null;
            this.speed = q.get('splash_speed') !== null ? Math.max(0.05, parseFloat(q.get('splash_speed'))) : 1;
        } catch (e) {
            this.freezeT = null;
            this.speed = 1;
        }

        // Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.robotGroup = null;
        this.robotMesh = null;
        this.isModelLoaded = false;

        this.xStart = -4.2;

        // 3D-частицы (реактивный след, пыль, искры)
        this.particles3d = [];
        this.maxParticles3d = 240;
        this.jetAccumulator = 0;

        // 2D FX (конфетти, кольца, speed lines, сердечки, вспышки)
        this.confetti = [];
        this.rings = [];
        this.streaks = [];
        this.hearts = [];
        this.flashAlpha = 0;
        this.fired = new Set();

        // Звёздное поле: метеоры + варп-режим финала
        this.meteors = [];
        this.nextMeteorAt = 1.2;
        this.warp = 0;

        // HUD state
        this.hitMilestones = new Set();
        this.lastDecade = -1;
        this.wasStalled = false;
        this.currentStatusIdx = -1;

        // Стикеры/облачка
        this.activeReaction = null;
        this.stickerPreloaded = new Set();

        // Буквы «КОСМО»
        this.letterEls = this.arcLettersGroup
            ? Array.from(this.arcLettersGroup.querySelectorAll('.cosmo-letter'))
            : [];

        // Safety Watchdog: unconditionally finishes splash after totalDuration + 1.2s
        this.safetyTimer = setTimeout(() => {
            console.warn('[Splash] Safety watchdog fired: forcing splash finish');
            this.finish(true);
        }, Math.max(3000, (this.totalDuration + 1.2) * 1000));

        this.init();
    }

    async init() {
        if (!this.container) return;

        try {
            this.setupControls();
            this.preloadStickers();
            this.initStarfield();
            this.initFxCanvas();

            await this.ensureThreeLibraries();
            this.initWebGL();
            this.loadModel();
            this.start();
        } catch (err) {
            console.error('[Splash] Fatal error in init(), dismissing splash immediately:', err);
            this.finish(true);
        }
    }

    /* ═══════════════════════════════════════════════════════════
       БАЗОВАЯ ИНФРАСТРУКТУРА
       ═══════════════════════════════════════════════════════════ */

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

    preloadStickers() {
        REACTIONS.forEach((r) => {
            if (this.stickerPreloaded.has(r.img)) return;
            const img = new Image();
            img.src = `assets/images/mascot/${r.img}.png`;
            this.stickerPreloaded.add(r.img);
        });
    }

    async ensureThreeLibraries() {
        if (window.THREE && window.THREE.GLTFLoader) return;

        const loadScript = (src, checkGlobal) => {
            return new Promise((resolve) => {
                if (checkGlobal && checkGlobal()) {
                    return resolve(true);
                }

                // Safety timeout per script: 2000ms max so it never hangs
                const timer = setTimeout(() => {
                    console.warn(`[Splash] Script ${src} timed out (2s), proceeding with fallback.`);
                    resolve(false);
                }, 2000);

                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    if (existing.dataset.loaded === 'true' || (checkGlobal && checkGlobal())) {
                        clearTimeout(timer);
                        return resolve(true);
                    }
                    if (document.readyState === 'interactive' || document.readyState === 'complete') {
                        // Defer script already executed in DOM. Check if global exists.
                        clearTimeout(timer);
                        return resolve(Boolean(checkGlobal && checkGlobal()));
                    }
                    existing.addEventListener('load', () => {
                        clearTimeout(timer);
                        resolve(true);
                    }, { once: true });
                    existing.addEventListener('error', () => {
                        clearTimeout(timer);
                        resolve(false);
                    }, { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => {
                    clearTimeout(timer);
                    script.dataset.loaded = 'true';
                    resolve(true);
                };
                script.onerror = () => {
                    clearTimeout(timer);
                    resolve(false);
                };
                document.head.appendChild(script);
            });
        };

        try {
            if (!window.THREE) {
                await loadScript('assets/vendor/three/three.min.js', () => window.THREE);
            }
            if (window.THREE && !window.THREE.GLTFLoader) {
                await loadScript('assets/vendor/three/GLTFLoader.js', () => window.THREE?.GLTFLoader);
            }
        } catch (err) {
            console.warn('[Splash] Three.js loading error:', err);
        }

        if (!window.THREE || !window.THREE.GLTFLoader) {
            console.warn('[Splash] Three.js / GLTFLoader unavailable, using PNG mascot fallback');
            this.activateMascotFallback();
        }
    }

    activateMascotFallback() {
        if (this.webglCanvas) this.webglCanvas.style.display = 'none';
        if (this.mascotFallback) {
            this.mascotFallback.style.display = 'block';
        }
    }

    initWebGL() {
        if (!window.THREE || !this.webglCanvas) {
            this.activateMascotFallback();
            return;
        }

        const THREE = window.THREE;
        const rect = this.webglCanvas.parentElement.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 175;

        try {
            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
            this.camera.position.set(0, 0, 3.4);
            this.camera.lookAt(0, 0, 0);
            this.baseCamZ = 3.4;

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.webglCanvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height, false);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            if (THREE.ACESFilmicToneMapping) {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.12;
            }

            // --- Pixar-свет: тёплый key, мягкий fill, цветной rim, золотой bounce ---
            const ambient = new THREE.AmbientLight(0xfff4e0, 0.6);
            this.scene.add(ambient);

            const keyLight = new THREE.DirectionalLight(0xfff1dd, 1.7);
            keyLight.position.set(2.2, 2.8, 2.5);
            this.scene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.15);
            fillLight.position.set(-3.0, 1.5, 1.8);
            this.scene.add(fillLight);

            const rimLight = new THREE.DirectionalLight(0xf9a8d4, 1.5);
            rimLight.position.set(2.5, -1.0, -2.5);
            this.scene.add(rimLight);

            // Мягкий фронтальный свет — читаемость силуэта в профиль и на оборотах
            const frontLight = new THREE.DirectionalLight(0xfdf6ec, 0.55);
            frontLight.position.set(0.4, 0.4, 3.2);
            this.scene.add(frontLight);

            // Золотой подсвет снизу — «тёплый пол» студии
            const bounceLight = new THREE.PointLight(0xfbbf24, 0.85, 3.5);
            bounceLight.position.set(0, -0.9, 0.4);
            this.scene.add(bounceLight);

            // Ионная тяга
            this.ionLight = new THREE.PointLight(0x38bdf8, 1.3, 3.5);
            this.ionLight.position.set(0, -0.85, 0.2);
            this.scene.add(this.ionLight);

            this.robotGroup = new THREE.Group();
            this.scene.add(this.robotGroup);

            // Частицы: один Points на всё (след, пыль, искры)
            this.particleGeometry = new THREE.BufferGeometry();
            this.particleMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.075,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true,
                depthWrite: false
            });
            this.particleMaterial.vertexColors = true;
            this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
            this.particleSystem.frustumCulled = false;
            this.scene.add(this.particleSystem);

            this.robotGroup.position.set(this.xStart, 0, 0);
            this.robotGroup.rotation.set(0, HALF_PI, 0);

            this.resizeHandler = () => {
                if (!this.renderer || !this.camera || !this.webglCanvas) return;
                const r = this.webglCanvas.parentElement.getBoundingClientRect();
                const w = r.width || 600;
                const h = r.height || 175;
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h, false);
            };
            window.addEventListener('resize', this.resizeHandler);

        } catch (e) {
            console.warn('[Splash] WebGL init failed, PNG-fallback:', e);
            this.activateMascotFallback();
        }
    }

    loadModel() {
        if (!window.THREE || !window.THREE.GLTFLoader || !this.scene) {
            this.activateMascotFallback();
            return;
        }

        const THREE = window.THREE;
        const loader = new THREE.GLTFLoader();

        loader.load(
            this.modelUrl,
            (gltf) => {
                if (this.isClosed) return;
                const model = gltf.scene;

                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const targetHeight = 1.42;
                const scale = targetHeight / (size.y || 1);
                model.scale.set(scale, scale, scale);
                model.position.x = -center.x * scale;
                model.position.y = -center.y * scale;
                model.position.z = -center.z * scale;

                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.metalness = 0.08;
                        child.material.roughness = 0.42;
                        child.material.needsUpdate = true;
                    }
                });

                this.robotMesh = model;
                this.robotGroup.add(model);
                this.isModelLoaded = true;
            },
            undefined,
            (error) => {
                console.warn('[Splash] GLB model load failed, PNG-fallback:', error);
                this.activateMascotFallback();
            }
        );
    }

    initFxCanvas() {
        if (!this.fxCanvas) return;
        this.fxResizeHandler = () => this.sizeFxCanvas();
        window.addEventListener('resize', this.fxResizeHandler);
        this.sizeFxCanvas();
    }

    sizeFxCanvas() {
        if (!this.fxCanvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.fxCanvas.width = Math.floor(window.innerWidth * dpr);
        this.fxCanvas.height = Math.floor(window.innerHeight * dpr);
        this.fxCtx = this.fxCanvas.getContext('2d');
        if (this.fxCtx) this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    start() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.lastNow = this.startTime;
        this.loop();
    }

    loop() {
        if (!this.isRunning || this.isClosed) return;

        const now = performance.now();
        const realDt = Math.min(0.05, (now - this.lastNow) / 1000);
        this.lastNow = now;
        this.lastFrameDt = realDt;

        let t;
        if (this.freezeT !== null && !isNaN(this.freezeT)) {
            t = this.freezeT;
        } else {
            t = ((now - this.startTime) / 1000) * this.speed;
        }
        this.t = t;

        this.updateRobotPose(t);
        this.updateFxTriggers(t);
        this.updateReactions(t);
        this.updateLetters(t);
        this.updateHud(t);

        this.updateParticles3d(realDt);
        this.updateOverlayFx(realDt);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        if (this.freezeT === null && t >= this.totalDuration) {
            this.finish(false);
            return;
        }

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    /* ═══════════════════════════════════════════════════════════
       ХОРЕОГРАФИЯ КОСМО — 13 битов, абсолютные значения
       ═══════════════════════════════════════════════════════════ */

    updateRobotPose(t) {
        if (!this.robotGroup) return;

        const P = this.computePose(t);
        const g = this.robotGroup;
        g.position.x = P.x;
        g.position.y = P.y;
        g.rotation.x = P.rx;
        g.rotation.y = P.ry;
        g.rotation.z = P.rz;
        g.scale.set(P.sx, P.sy, P.sz);

        // Вторичная анимация: тень и ионная тяга реагируют на высоту
        const totalY = P.y;
        if (this.shadowEl) {
            const offscreen = P.x < -3.9 || P.x > 3.9;
            const shadowScale = offscreen ? 0.4 : Math.max(0.5, Math.min(1.4, 1 - totalY * 1.6));
            const shadowOpacity = offscreen ? 0 : Math.max(0.15, Math.min(0.95, 0.8 - totalY * 1.1));
            this.shadowEl.style.transform = `translateX(-50%) scale(${shadowScale.toFixed(3)})`;
            this.shadowEl.style.opacity = `${shadowOpacity.toFixed(3)}`;
        }
        if (this.ionGlowEl) {
            const offscreen = P.x < -3.9 || P.x > 3.9;
            const glowScale = offscreen ? 0.4 : Math.max(0.5, Math.min(2.2, (1 + Math.max(0, -totalY) * 1.6) * P.ion));
            const glowOpacity = offscreen ? 0 : Math.max(0.35, Math.min(1.0, 0.7 * P.ion));
            this.ionGlowEl.style.transform = `translateX(-50%) scale(${glowScale.toFixed(3)})`;
            this.ionGlowEl.style.opacity = `${glowOpacity.toFixed(3)}`;
        }
        if (this.ionLight) {
            this.ionLight.intensity = 1.0 + 0.9 * Math.max(0, P.ion - 1);
        }

        // Реактивный след во время полётов
        if (P.jet > 0 && !this.reducedMotion) {
            this.jetAccumulator += P.jet * 190 * this.lastFrameDt;
            while (this.jetAccumulator >= 1) {
                this.jetAccumulator -= 1;
                this.emitJetParticle(P.x, P.y, P.jet);
            }
        }

        // Камера: пуш-ин на «зарядке» + shake на ударах
        if (this.camera) {
            const push = 0.12 * this.bell(t, 6.75, 0.38);
            const shake = 0.045 * this.bell(t, 3.2, 0.07) + 0.065 * this.bell(t, 7.25, 0.09);
            this.camera.position.z = this.baseCamZ - push;
            this.camera.position.x = shake * Math.sin(t * 119);
            this.camera.position.y = shake * Math.cos(t * 93);
        }
    }

    computePose(t) {
        const P = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, jet: 0, ion: 1 };

        if (this.reducedMotion) {
            // Спокойный вариант: мягкое парение по Лиссажу
            P.y = 0.05 * Math.sin(TAU * 0.5 * t);
            P.rx = 0.02 * Math.cos(TAU * 0.5 * t);
            P.rz = 0.015 * Math.sin(TAU * 0.33 * t);
            return P;
        }

        // Базовый hover (вес включается после приземления)
        const bobY = 0.045 * Math.sin(TAU * 0.65 * t) + 0.014 * Math.sin(TAU * 1.3 * t);
        const bobRZ = 0.02 * Math.sin(TAU * 0.45 * t);
        const bobRX = 0.018 * Math.cos(TAU * 0.65 * t);
        const hw = this.smoothstep(1.15, 1.9, t);

        /* Б1. Влёт-прошивка слева направо (0–0.35) */
        if (t < 0.35) {
            const k = t / 0.35;
            P.x = -4.2 + 8.4 * k * k;
            P.ry = HALF_PI;
            P.rz = -0.05;
            P.sx = 1.18; P.sy = 0.88; P.sz = 0.95;
            P.jet = 1.0;
            P.ion = 2.0;
            return P;
        }

        /* Б2. Пустой кадр — Космо улетел за экран (0.35–0.55) */
        if (t < 0.55) {
            P.x = 4.6;
            P.ry = HALF_PI;
            return P;
        }

        /* Б3. Возврат справа + торможение + посадочный squash (0.55–1.35) */
        if (t < 1.35) {
            P.ry = HALF_PI;
            if (t < 0.75) {
                const k = (t - 0.55) / 0.2;
                P.x = 4.6 - 3.4 * this.easeOutCubic(k);
                P.y = 0.05 * k;
                P.rz = 0.28;
                P.sx = 1.12; P.sy = 0.92;
                P.jet = 0.7;
                P.ion = 1.5;
            } else if (t < 1.05) {
                const k = (t - 0.75) / 0.3;
                P.x = 1.2 * (1 - this.easeOutCubic(k));
                P.y = -0.05 * Math.abs(Math.sin(TAU * k));
                P.rz = 0.28 * Math.exp(-2.2 * k) * Math.cos(TAU * 1.2 * k);
            } else {
                const k = (t - 1.05) / 0.3;
                P.x = 0;
                const s = Math.sin(Math.PI * Math.min(1, k * 1.4));
                P.sy = 1 - 0.10 * s;
                P.sx = 1 + 0.06 * s;
                P.sz = 1 + 0.04 * s;
                P.rz = 0.10 * Math.exp(-3.5 * k) * Math.cos(9 * k);
            }
            return P;
        }

        /* Б4. Пружинный разворот к камере + геройская поза (1.35–2.2) */
        if (t < 2.2) {
            const k = Math.min(1, (t - 1.35) / 0.4);
            const s = this.dampedResponse(k, 26, 0.7);
            P.ry = HALF_PI * (1 - s);
            const hx = this.smoothstep(0.5, 1, k);
            P.rx = -0.08 * hx + bobRX * hw;
            P.y = bobY * hw + 0.05 * hx;
            P.rz = bobRZ * hw + 0.03 * Math.sin(t * 2.1) * hx;
            return P;
        }

        /* Б5. Скука + наклон к зависшему бару (2.2–2.95) */
        if (t < 2.95) {
            P.y = bobY * hw - 0.03 + 0.04 * this.bell(t, 2.62, 0.09);
            P.rz = 0.05 * Math.sin(t * 1.4) + bobRZ * hw * 0.5;
            P.rx = 0.12 * this.smoothstep(2.6, 2.85, t) + bobRX * hw * 0.5;
            return P;
        }

        /* Б6. Пинок по бару: замах → удар → отскок (2.95–3.5) */
        if (t < 3.5) {
            if (t < 3.1) {
                const k = (t - 2.95) / 0.15;
                P.y = bobY * 0.5 - 0.12 * k;
                P.sy = 1 - 0.08 * k;
                P.sx = 1 + 0.05 * k;
                P.sz = 1 + 0.05 * k;
                P.rz = -0.18 * k;
                P.rx = 0.06;
            } else if (t < 3.25) {
                const k = (t - 3.1) / 0.15;
                P.y = bobY * 0.5 - 0.12 - 0.10 * Math.sin(Math.PI * k);
                P.x = 0.15 * Math.sin(Math.PI * k);
                P.rz = -0.18 + 0.30 * k;
                P.sy = 0.92 + 0.14 * k;
                P.sx = 1.05 - 0.09 * k;
                P.rx = 0.06;
            } else {
                const k = (t - 3.25) / 0.25;
                P.y = bobY * 0.5 + 0.10 * Math.sin(Math.PI * Math.min(1, k * 1.3)) * (1 - k);
                P.x = 0.15 * (1 - this.easeOutCubic(k));
                P.rz = 0.12 * Math.exp(-3 * k) * Math.sin(TAU * 1.1 * k);
                const wob = Math.exp(-4 * k) * Math.cos(10 * k);
                P.sy = 1 + 0.06 * wob;
                P.sx = 1 - 0.04 * wob;
            }
            return P;
        }

        /* Б7. Кувырок через голову (3.5–4.35) */
        if (t < 4.35) {
            if (t < 3.65) {
                const k = (t - 3.5) / 0.15;
                P.y = bobY * 0.4 - 0.06 * k;
                const s = 1 - 0.04 * k;
                P.sx = s; P.sy = s; P.sz = s;
            } else if (t < 4.05) {
                const k = (t - 3.65) / 0.4;
                const sk = k * k * (3 - 2 * k);
                P.rx = -TAU * sk;
                P.y = bobY * 0.3 - 0.05 + 0.38 * Math.sin(Math.PI * k);
                P.x = 0.18 * Math.sin(Math.PI * k);
                const tuck = Math.sin(Math.PI * k);
                const su = 1 - 0.08 * tuck;
                P.sx = su;
                P.sy = su * (1 + 0.05 * (1 - k));
                P.sz = su;
            } else {
                const k = (t - 4.05) / 0.3;
                P.y = bobY * 0.4 - 0.02;
                const s2 = Math.sin(Math.PI * Math.min(1, k * 1.5));
                P.sy = 1 - 0.12 * s2;
                P.sx = 1 + 0.06 * s2;
                P.sz = 1 + 0.04 * s2;
            }
            return P;
        }

        /* Б8. Пого на ионной тяге: прыжок с оборотом + затухающие отскоки (4.35–5.2) */
        if (t < 5.2) {
            P.ion = 1.6;
            if (t < 4.55) {
                const k = (t - 4.35) / 0.2;
                P.y = bobY * 0.4 - 0.14 * k;
                P.sy = 1 - 0.10 * k;
                P.sx = 1 + 0.06 * k;
                P.ion = 1 + k;
            } else if (t < 4.85) {
                const k = (t - 4.55) / 0.3;
                P.y = -0.14 + 0.64 * Math.sin(Math.PI * k);
                P.ry = TAU * k;
                const st = Math.sin(Math.PI * k);
                P.sy = 1 + 0.14 * st;
                P.sx = 1 - 0.06 * st;
                P.sz = 1 - 0.06 * st;
                P.jet = 0.5 * (1 - k * 0.5);
            } else if (t < 5.03) {
                const k = (t - 4.85) / 0.18;
                P.y = 0.30 * Math.sin(Math.PI * k) - 0.02;
                const contact = Math.max(0, 1 - Math.abs(2 * k - 1) * 2);
                P.sy = 1 - 0.08 * contact;
                P.sx = 1 + 0.04 * contact;
            } else {
                const k = (t - 5.03) / 0.17;
                P.y = 0.12 * Math.sin(Math.PI * k) - 0.02;
                const contact = Math.max(0, 1 - Math.abs(2 * k - 1) * 2);
                P.sy = 1 - 0.05 * contact;
                P.sx = 1 + 0.03 * contact;
            }
            return P;
        }

        /* Б9. Подача заголовка + космотр на бар + шимми (5.2–6.3) */
        if (t < 6.3) {
            P.y = bobY * hw;
            P.rx = bobRX * hw;
            P.rz = bobRZ * hw;
            if (t >= 5.2 && t < 5.5) {
                P.rz += 0.10 * Math.sin(Math.PI * (t - 5.2) / 0.3);
                P.y += 0.04 * Math.sin(Math.PI * (t - 5.2) / 0.3);
            }
            if (t >= 5.5 && t < 6.0) {
                P.rx += -0.10 * this.smoothstep(5.5, 5.7, t);
            }
            if (t >= 5.75 && t < 5.95) {
                P.ry = -0.30 * Math.sin(Math.PI * (t - 5.75) / 0.2);
            }
            if (t >= 5.95) {
                const gate = this.smoothstep(5.95, 6.08, t) * (1 - this.smoothstep(6.18, 6.3, t));
                P.rz += 0.08 * Math.sin((t - 5.95) * 19) * gate;
            }
            return P;
        }

        /* Б10. Зарядка: присед, вибрация, ионы на максимум (6.3–6.6) */
        if (t < 6.6) {
            const k = (t - 6.3) / 0.3;
            P.y = bobY * 0.3 - 0.10 * k;
            P.sy = 1 - 0.12 * k;
            P.sx = 1 + 0.07 * k;
            P.sz = 1 + 0.07 * k;
            P.rz = 0.02 * Math.sin(t * 75);
            P.ion = 1 + 0.9 * k;
            return P;
        }

        /* Б11. Конфетти-пушка: взлёт с оборотом → падение стрелой (6.6–7.25) */
        if (t < 7.25) {
            P.ion = 1.9;
            if (t < 6.9) {
                const k = (t - 6.6) / 0.3;
                P.y = -0.10 + 0.70 * Math.sin(HALF_PI * k);
                P.ry = TAU * k;
                P.sy = 0.88 + 0.30 * Math.sin(HALF_PI * k);
                P.sx = 1.07 - 0.17 * Math.sin(HALF_PI * k);
                P.jet = 0.8;
            } else {
                const k = (t - 6.9) / 0.35;
                P.y = 0.60 * (1 - k * k);
                P.ry = TAU;
                P.sy = 1.18 * (1 - k) + 1.0 * k;
                P.sx = 0.90 + 0.10 * k;
            }
            return P;
        }

        /* Б12. Ударная посадка на 100% (7.25–7.5) */
        if (t < 7.5) {
            const k = (t - 7.25) / 0.25;
            const squash = Math.sin(Math.PI * Math.min(1, k * 1.6));
            P.sy = 1 - 0.20 * squash;
            P.sx = 1 + 0.12 * squash;
            P.sz = 1 + 0.12 * squash;
            P.y = -0.02 + 0.04 * Math.sin(Math.PI * k);
            return P;
        }

        /* Б13. Финальный позинг: наклон к зрителю, два кивка, стоп (7.5–8.0) */
        {
            const k = Math.min(1, (t - 7.5) / 0.5);
            const settle = 1 - 0.6 * k;
            P.y = bobY * 0.5 * settle;
            P.rx = 0.06 * (1 - k * 0.3)
                - 0.05 * this.bell(t, 7.54, 0.05)
                - 0.05 * this.bell(t, 7.66, 0.05);
            P.rz = bobRZ * 0.3 * settle;
            return P;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       ТРИГГЕРЫ FX ПО БИТАМ
       ═══════════════════════════════════════════════════════════ */

    fire(key, cond) {
        if (this.fired.has(key)) return false;
        if (!cond) return false;
        this.fired.add(key);
        return true;
    }

    robotScreenPos() {
        if (!this.viewportEl) {
            return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        }
        const r = this.viewportEl.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    barPos(frac) {
        if (!this.progressTrack) {
            return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
        }
        const r = this.progressTrack.getBoundingClientRect();
        return { x: r.left + r.width * frac, y: r.top + r.height / 2 };
    }

    updateFxTriggers(t) {
        if (this.reducedMotion) return;

        // Пыльные кольца при посадках/ударах
        if (this.fire('dust-land', t >= 1.10 && t < 1.2)) {
            const p = this.robotScreenPos();
            this.spawnDustRing3d(0, -0.15, 22);
            this.spawnRing(p.x, p.y + 55, 60, 'rgba(125,211,252,0.5)');
        }
        if (this.fire('dust-kick', t >= 3.2 && t < 3.3)) {
            this.spawnDustRing3d(0.15, -0.2, 16);
        }
        if (this.fire('dust-flip', t >= 4.07 && t < 4.17)) {
            this.spawnDustRing3d(0.18, -0.15, 20);
        }
        if (this.fire('dust-final', t >= 7.25 && t < 7.35)) {
            this.spawnDustRing3d(0, -0.2, 30);
        }

        // Пинок по бару: вспышка + искры на кончике бара в 25%
        if (this.fire('kick-fx', t >= 3.2 && t < 3.3)) {
            const b = this.barPos(0.25);
            this.spawnConfetti(b.x, b.y, 16, 320, -HALF_PI, 1.2, ['star', 'circle']);
            this.spawnRing(b.x, b.y, 46, 'rgba(253,230,138,0.7)');
            this.flash(0.10);
        }

        // Мини-салют на апексе пого
        if (this.fire('confetti-mini', t >= 4.70 && t < 4.8)) {
            const p = this.robotScreenPos();
            this.spawnConfetti(p.x, p.y - 30, 26, 420, -HALF_PI, 1.5);
            this.spawnRing(p.x, p.y - 30, 52, 'rgba(244,114,182,0.6)');
        }

        // Сердечки над головой
        if (this.fire('heart-1', t >= 5.60)) { const p = this.robotScreenPos(); this.spawnHeart(p.x - 26, p.y - 60); }
        if (this.fire('heart-2', t >= 5.72)) { const p = this.robotScreenPos(); this.spawnHeart(p.x + 4, p.y - 72); }
        if (this.fire('heart-3', t >= 5.84)) { const p = this.robotScreenPos(); this.spawnHeart(p.x + 30, p.y - 58); }

        // Варп звёзд на зарядке и разгоне
        if (t >= 6.3 && t < 7.25) {
            this.warp = this.smoothstep(6.3, 6.9, t);
        } else if (t >= 7.25) {
            this.warp = Math.max(0, 1 - (t - 7.25) / 0.5);
        } else {
            this.warp = 0;
        }

        // ФИНАЛ: конфетти-пушка
        if (this.fire('confetti-main', t >= 6.90)) {
            const p = this.robotScreenPos();
            this.spawnConfetti(p.x, p.y - 40, 150, 760, -HALF_PI, 2.4);
            this.spawnRing(p.x, p.y - 40, 130, 'rgba(253,230,138,0.8)');
            this.spawnRing(p.x, p.y - 40, 90, 'rgba(125,211,252,0.7)');
            this.flash(0.32);
            this.launchBalloons();
        }

        // Speed lines: влёт и возврат
        if ((t >= 0.08 && t < 0.35) || (t >= 0.55 && t < 0.95)) {
            const dir = t < 0.45 ? 1 : -1;
            this.spawnSpeedLines(dir);
        }
        // Сходящиеся speed lines перед конфетти-пушкой
        if (t >= 6.55 && t < 6.9) {
            this.spawnConvergeLines();
        }

        // НЛО-подглядывальщик (2.2–2.7)
        if (this.ufoEl) {
            const peek = t >= 2.2 && t < 2.7;
            this.ufoEl.classList.toggle('is-peeking', peek);
        }
    }

    launchBalloons() {
        document.querySelectorAll('.cosmo-prop.balloon').forEach((b) => {
            b.classList.remove('is-launched');
            void b.offsetWidth;
            b.classList.add('is-launched');
        });
    }

    /* ═══════════════════════════════════════════════════════════
       РЕАКЦИИ: СТИКЕРЫ-ЭМОЦИИ + КОМИКС-ОБЛАЧКА
       ═══════════════════════════════════════════════════════════ */

    updateReactions(t) {
        if (!this.stickerEl || !this.bubbleEl) return;

        if (this.reducedMotion) {
            this.hideReaction(true);
            return;
        }

        const active = REACTIONS.find((r) => t >= r.t0 && t < r.t1) || null;

        if (active === this.activeReaction) return;
        this.activeReaction = active;

        if (!active) {
            this.hideReaction(false);
            return;
        }

        const src = `assets/images/mascot/${active.img}.png`;
        if (!this.stickerEl.src.endsWith(src)) {
            this.stickerEl.src = src;
        }
        this.stickerEl.className = `aurora-splash-sticker sticker-${active.side}`;
        void this.stickerEl.offsetWidth;
        this.stickerEl.classList.add('is-visible');

        const bubbleSide = active.side === 'left' ? 'right' : 'left';
        this.bubbleTextEl.textContent = active.text;
        this.bubbleEl.className = `aurora-splash-bubble bubble-from-${bubbleSide}`;
        void this.bubbleEl.offsetWidth;
        this.bubbleEl.classList.add('is-visible', 'is-bobbing');
    }

    hideReaction(instant) {
        if (!this.stickerEl || !this.bubbleEl) return;
        if (instant) {
            this.stickerEl.className = 'aurora-splash-sticker';
            this.bubbleEl.className = 'aurora-splash-bubble';
            return;
        }
        if (this.stickerEl.classList.contains('is-visible')) {
            this.stickerEl.classList.remove('is-visible');
            this.stickerEl.classList.add('is-hiding');
        }
        if (this.bubbleEl.classList.contains('is-visible')) {
            this.bubbleEl.classList.remove('is-visible', 'is-bobbing');
            this.bubbleEl.classList.add('is-hiding');
        }
    }

    /* ═══════════════════════════════════════════════════════════
       БУКВЫ «КОСМО» — pop по расписанию
       ═══════════════════════════════════════════════════════════ */

    updateLetters(t) {
        this.letterEls.forEach((el, i) => {
            if (!el.classList.contains('is-on') && t >= 1.40 + i * 0.09) {
                el.classList.add('is-on');
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════
       HUD: кусочной прогресс с гэгами-затыками
       ═══════════════════════════════════════════════════════════ */

    progressAt(t) {
        const lerp = (a, b, k) => a + (b - a) * k;
        if (t < 2.5) return lerp(0, 25, this.easeInOutCubic(Math.max(0, t) / 2.5));
        if (t < 3.2) return 25 + Math.sin(t * 30) * 0.35;               // затык №1 + дрожь
        if (t < 3.25) return lerp(25, 37, (t - 3.2) / 0.05);            // пинок! скачок
        if (t < 4.3) return lerp(37, 50, this.easeInOutCubic((t - 3.25) / 1.05));
        if (t < 5.7) return lerp(50, 75, (t - 4.3) / 1.4);
        if (t < 6.05) return 75;                                        // затык №2
        if (t < 7.25) return lerp(75, 92, (t - 6.05) / 1.2 * (t - 6.05) / 1.2);
        return lerp(92, 100, Math.min(1, (t - 7.25) / 0.06));           // вбито посадкой
    }

    updateHud(t) {
        const p = this.reducedMotion
            ? Math.min(100, (t / this.totalDuration) * 100)
            : Math.min(100, Math.max(0, this.progressAt(t)));

        if (this.progressFill) {
            this.progressFill.style.width = `${p.toFixed(1)}%`;
        }
        if (this.progressTip) {
            this.progressTip.style.left = `${p.toFixed(1)}%`;
        }
        if (this.progressPercent) {
            this.progressPercent.textContent = `${Math.floor(p)}%`;
        }

        if (!this.reducedMotion) {
            // Майлстоуны: звёзды + желейный wobble
            [25, 50, 75, 100].forEach((m, i) => {
                if (p >= m && !this.hitMilestones.has(m)) {
                    this.hitMilestones.add(m);
                    const star = this.hudStars[i];
                    if (star) {
                        star.classList.remove('is-pop');
                        void star.offsetWidth;
                        star.classList.add('is-pop', 'is-twinkling');
                    }
                    if (this.progressFill && m < 100) {
                        this.progressFill.classList.remove('is-wobbling');
                        void this.progressFill.offsetWidth;
                        this.progressFill.classList.add('is-wobbling');
                    }
                }
            });

            // Bounce процентов на смене десятка
            const decade = Math.floor(p / 10);
            if (decade !== this.lastDecade) {
                if (this.lastDecade >= 0 && this.progressPercent) {
                    if (p >= 100) {
                        this.progressPercent.classList.remove('is-final-pop');
                        void this.progressPercent.offsetWidth;
                        this.progressPercent.classList.add('is-final-pop');
                    } else {
                        this.progressPercent.classList.remove('is-bouncing');
                        void this.progressPercent.offsetWidth;
                        this.progressPercent.classList.add('is-bouncing');
                    }
                }
                this.lastDecade = decade;
            }

            // Затык №2: бар «стесняется», пока Космо не взглянул (5.7–6.05)
            const stalled = t >= 5.7 && t < 6.05;
            if (stalled !== this.wasStalled && this.progressTrack) {
                this.progressTrack.classList.toggle('is-stalled', stalled);
                this.wasStalled = stalled;
            }
        }

        // Статусы
        if (this.progressStatus) {
            const idx = STATUSES.findIndex((s) => t < s.until);
            if (idx !== this.currentStatusIdx && idx >= 0) {
                this.currentStatusIdx = idx;
                this.progressStatus.textContent = STATUSES[idx].text;
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════
       3D-ЧАСТИЦЫ: реактивный след, пыль, искры
       ═══════════════════════════════════════════════════════════ */

    emitJetParticle(x, y, power) {
        const dir = x < 0 ? 1 : -1; // летит вправо — след назад влево
        this.particles3d.push({
            x: x - dir * 0.25 + (Math.random() - 0.5) * 0.15,
            y: y - 0.08 + (Math.random() - 0.5) * 0.18,
            z: (Math.random() - 0.5) * 0.3,
            vx: -dir * (0.06 + Math.random() * 0.12) * power,
            vy: (Math.random() - 0.4) * 0.03,
            vz: (Math.random() - 0.5) * 0.05,
            life: 1.0,
            decay: 0.030 + Math.random() * 0.025,
            hue: Math.random(),
            size: 0.7 + Math.random() * 0.5,
        });
        if (this.particles3d.length > this.maxParticles3d) this.particles3d.shift();
    }

    spawnDustRing3d(x, y, count) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + Math.random() * 0.3;
            const sp = 0.045 + Math.random() * 0.07;
            this.particles3d.push({
                x: x + Math.cos(a) * 0.1,
                y: y + Math.sin(a) * 0.05,
                z: (Math.random() - 0.5) * 0.2,
                vx: Math.cos(a) * sp,
                vy: Math.abs(Math.sin(a)) * sp * 0.5 + 0.01,
                vz: (Math.random() - 0.5) * 0.04,
                life: 1.0,
                decay: 0.020 + Math.random() * 0.018,
                hue: Math.random(),
                size: 0.6 + Math.random() * 0.6,
            });
        }
        if (this.particles3d.length > this.maxParticles3d) {
            this.particles3d.splice(0, this.particles3d.length - this.maxParticles3d);
        }
    }

    updateParticles3d(dt) {
        if (!window.THREE || !this.particleGeometry) return;

        if (this.particles3d.length === 0) {
            this.particleGeometry.setDrawRange(0, 0);
            return;
        }

        const step = dt * 60; // нормируем под «кадровую» физику
        for (let i = this.particles3d.length - 1; i >= 0; i--) {
            const p = this.particles3d[i];
            p.x += p.vx * step;
            p.y += p.vy * step;
            p.z += p.vz * step;
            p.vy -= 0.0012 * step;
            p.vx *= Math.pow(0.975, step);
            p.vy *= Math.pow(0.99, step);
            p.life -= p.decay * step;
            if (p.life <= 0) this.particles3d.splice(i, 1);
        }

        const n = this.particles3d.length;
        const positions = new Float32Array(n * 3);
        const colors = new Float32Array(n * 3);
        const cyan = [0.30, 0.83, 0.98];
        const magenta = [0.96, 0.45, 0.72];
        const gold = [1.0, 0.87, 0.55];

        for (let i = 0; i < n; i++) {
            const p = this.particles3d[i];
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
            const fade = Math.max(0, p.life);
            const c = p.hue > 0.72 ? gold : (p.hue > 0.4 ? magenta : cyan);
            colors[i * 3] = c[0] * fade;
            colors[i * 3 + 1] = c[1] * fade;
            colors[i * 3 + 2] = c[2] * fade;
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.setDrawRange(0, n);
    }

    /* ═══════════════════════════════════════════════════════════
       2D-OVERLAY: конфетти, кольца, speed lines, сердечки, вспышки
       ═══════════════════════════════════════════════════════════ */

    spawnConfetti(x, y, count, power, angleCenter, angleSpread, shapes = ['rect', 'rect', 'rect', 'star', 'circle']) {
        for (let i = 0; i < count; i++) {
            const a = angleCenter + (Math.random() - 0.5) * Math.PI * angleSpread;
            const sp = power * (0.35 + Math.random() * 0.75);
            this.confetti.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                rot: Math.random() * TAU,
                vr: (Math.random() - 0.5) * 14,
                life: 1.0,
                decay: 0.35 + Math.random() * 0.45,
                color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                size: 5 + Math.random() * 7,
                sway: Math.random() * TAU,
            });
        }
    }

    spawnRing(x, y, maxR, color) {
        this.rings.push({ x, y, r: 6, maxR, color, life: 1.0 });
    }

    spawnHeart(x, y) {
        this.hearts.push({
            x, y,
            vy: -(60 + Math.random() * 40),
            life: 1.0,
            size: 10 + Math.random() * 8,
            sway: Math.random() * TAU,
            color: Math.random() > 0.4 ? '#fb7185' : '#f472b6',
        });
    }

    spawnSpeedLines(dir) {
        const p = this.robotScreenPos();
        for (let i = 0; i < 3; i++) {
            this.streaks.push({
                x: dir > 0 ? Math.random() * window.innerWidth * 0.5 : window.innerWidth * (0.5 + Math.random() * 0.5),
                y: p.y + (Math.random() - 0.5) * 180,
                len: 70 + Math.random() * 130,
                vx: dir * (900 + Math.random() * 500),
                life: 1.0,
                decay: 3.5,
            });
        }
    }

    spawnConvergeLines() {
        const p = this.robotScreenPos();
        for (let i = 0; i < 2; i++) {
            const fromLeft = Math.random() > 0.5;
            this.streaks.push({
                x: fromLeft ? -60 : window.innerWidth + 60,
                y: p.y + (Math.random() - 0.5) * 220,
                len: 90 + Math.random() * 110,
                vx: (fromLeft ? 1 : -1) * (1100 + Math.random() * 400),
                life: 1.0,
                decay: 4.0,
            });
        }
    }

    flash(alpha) {
        this.flashAlpha = Math.max(this.flashAlpha, alpha);
    }

    updateOverlayFx(dt) {
        const ctx = this.fxCtx;
        if (!ctx) return;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const step = dt * 60;

        ctx.clearRect(0, 0, W, H);

        // Конфетти
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.vy += 950 * dt;
            c.vx *= Math.pow(0.988, step);
            c.vy *= Math.pow(0.995, step);
            c.x += c.vx * dt + Math.sin(c.sway += dt * 6) * 0.6;
            c.y += c.vy * dt;
            c.rot += c.vr * dt;
            c.life -= c.decay * dt;
            if (c.life <= 0 || c.y > H + 40) {
                this.confetti.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.globalAlpha = Math.min(1, c.life * 1.4);
            ctx.fillStyle = c.color;
            const s = c.size;
            if (c.shape === 'rect') {
                ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
            } else if (c.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.4, 0, TAU);
                ctx.fill();
            } else {
                this.drawStar(ctx, 0, 0, s * 0.55, s * 0.24, 5);
                ctx.fill();
            }
            ctx.restore();
        }

        // Ударные волны
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.r += (r.maxR - r.r) * Math.min(1, dt * 7);
            r.life -= dt * 1.8;
            if (r.life <= 0) {
                this.rings.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = Math.max(0, r.life) * 0.8;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 2.5 * r.life + 0.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }

        // Speed lines
        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const s = this.streaks[i];
            s.x += s.vx * dt;
            s.life -= s.decay * dt;
            if (s.life <= 0 || s.x < -300 || s.x > W + 300) {
                this.streaks.splice(i, 1);
                continue;
            }
            const tail = s.vx > 0 ? s.x - s.len : s.x + s.len;
            const grad = ctx.createLinearGradient(tail, s.y, s.x, s.y);
            grad.addColorStop(0, 'rgba(125,211,252,0)');
            grad.addColorStop(1, `rgba(165,243,252,${(0.55 * Math.min(1, s.life)).toFixed(3)})`);
            ctx.save();
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tail, s.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            ctx.restore();
        }

        // Сердечки
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            h.y += h.vy * dt;
            h.x += Math.sin(h.sway += dt * 4) * 0.7;
            h.vy *= Math.pow(0.99, step);
            h.life -= dt * 0.9;
            if (h.life <= 0) {
                this.hearts.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.scale(h.size / 16, h.size / 16);
            ctx.globalAlpha = Math.max(0, Math.min(1, h.life * 1.2));
            ctx.fillStyle = h.color;
            ctx.beginPath();
            ctx.moveTo(0, 5);
            ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5);
            ctx.bezierCurveTo(5, -10, 9, -3, 0, 5);
            ctx.fill();
            ctx.restore();
        }

        // Вспышка
        if (this.flashAlpha > 0.005) {
            ctx.save();
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = '#fff7e0';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
            this.flashAlpha *= Math.pow(0.02, dt);
        }
    }

    drawStar(ctx, cx, cy, outerR, innerR, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const a = (i * Math.PI) / points - Math.PI / 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    /* ═══════════════════════════════════════════════════════════
       ЗВЁЗДНОЕ ПОЛЕ: метеоры + варп-режим
       ═══════════════════════════════════════════════════════════ */

    initStarfield() {
        if (!this.starsCanvas) return;
        const canvas = this.starsCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const stars = [];
        const count = Math.min(160, Math.floor((width * height) / 7500));

        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5 + 0.5,
                baseVy: -(Math.random() * 0.22 + 0.05),
                baseVx: (Math.random() - 0.5) * 0.08,
                opacity: Math.random() * 0.5 + 0.2,
                pulseAngle: Math.random() * Math.PI * 2,
                color: Math.random() > 0.4 ? '125, 211, 252' : '249, 168, 212',
            });
        }

        const resizeStars = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeStars);
        this.starfieldResizeHandler = resizeStars;

        const drawStars = () => {
            if (this.isClosed) return;
            ctx.clearRect(0, 0, width, height);
            const cx = width / 2;
            const cy = height / 2;
            const warp = this.reducedMotion ? 0 : this.warp;

            // Метеоры
            if (!this.reducedMotion && this.t !== undefined && this.t > this.nextMeteorAt && warp < 0.2) {
                this.nextMeteorAt = this.t + 1.4 + Math.random() * 2.2;
                const fromLeft = Math.random() > 0.5;
                this.meteors.push({
                    x: fromLeft ? -40 : width + 40,
                    y: Math.random() * height * 0.4,
                    vx: (fromLeft ? 1 : -1) * (420 + Math.random() * 260),
                    vy: 160 + Math.random() * 140,
                    life: 1.0,
                });
            }
            for (let i = this.meteors.length - 1; i >= 0; i--) {
                const m = this.meteors[i];
                m.x += m.vx * 0.016;
                m.y += m.vy * 0.016;
                m.life -= 0.016 * 0.9;
                if (m.life <= 0 || m.x < -120 || m.x > width + 120 || m.y > height + 60) {
                    this.meteors.splice(i, 1);
                    continue;
                }
                const tailX = m.x - m.vx * 0.09;
                const tailY = m.y - m.vy * 0.09;
                const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
                grad.addColorStop(0, 'rgba(253,230,138,0)');
                grad.addColorStop(1, `rgba(253,230,138,${(0.85 * m.life).toFixed(3)})`);
                ctx.save();
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(m.x, m.y);
                ctx.stroke();
                ctx.restore();
            }

            // Звёзды
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.pulseAngle += 0.02;

                if (warp > 0.01) {
                    // Варп: звёзды разлетаются от центра линиями
                    const dx = s.x - cx;
                    const dy = s.y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const speed = warp * (0.5 + 240 / (dist + 60));
                    s.x += (dx / dist) * speed;
                    s.y += (dy / dist) * speed;
                    const lineLen = warp * (2 + dist * 0.10);
                    const alpha = Math.min(0.9, s.opacity + warp * 0.3);
                    ctx.save();
                    ctx.strokeStyle = `rgba(${s.color}, ${alpha.toFixed(3)})`;
                    ctx.lineWidth = s.radius * (0.8 + warp * 0.7);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(s.x - (dx / dist) * lineLen, s.y - (dy / dist) * lineLen);
                    ctx.lineTo(s.x, s.y);
                    ctx.stroke();
                    ctx.restore();
                    if (s.x < -30 || s.x > width + 30 || s.y < -30 || s.y > height + 30) {
                        const a = Math.random() * TAU;
                        const rr = Math.random() * Math.min(width, height) * 0.16;
                        s.x = cx + Math.cos(a) * rr;
                        s.y = cy + Math.sin(a) * rr;
                    }
                } else {
                    s.y += s.baseVy;
                    s.x += s.baseVx;
                    if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
                    if (s.x < -5) s.x = width + 5;
                    if (s.x > width + 5) s.x = -5;
                    const alpha = Math.max(0.12, Math.min(0.85, s.opacity + Math.sin(s.pulseAngle) * 0.25));
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius, 0, TAU);
                    ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
                    ctx.fill();
                }
            }

            if (this.isRunning && !this.isClosed) {
                requestAnimationFrame(drawStars);
            }
        };
        drawStars();
    }

    /* ═══════════════════════════════════════════════════════════
       ЗАВЕРШЕНИЕ И УТИЛИТЫ
       ═══════════════════════════════════════════════════════════ */

    finish(isImmediate = false) {
        if (this.isClosed) return;
        this.isClosed = true;
        this.isRunning = false;

        if (this.safetyTimer) {
            clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
        }

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
        if (this.fxResizeHandler) {
            window.removeEventListener('resize', this.fxResizeHandler);
        }
        if (this.starfieldResizeHandler) {
            window.removeEventListener('resize', this.starfieldResizeHandler);
        }

        if (this.progressFill) this.progressFill.style.width = '100%';
        if (this.progressTip) this.progressTip.style.left = '100%';
        if (this.progressPercent) this.progressPercent.textContent = '100%';
        if (this.progressStatus) this.progressStatus.textContent = 'СИСТЕМА ГОТОВА К РАБОТЕ!';

        try {
            sessionStorage.setItem('aurora_splash_seen', 'true');
        } catch (e) {}

        const fadeDuration = isImmediate ? 150 : 500;

        if (this.container) {
            this.container.classList.add('aurora-splash-closing');
            setTimeout(() => {
                this.container.classList.add('aurora-splash-hidden');
                this.container.style.display = 'none';
                this.destroyThree();
                if (typeof this.onComplete === 'function') {
                    this.onComplete();
                }
            }, fadeDuration);
        } else {
            this.destroyThree();
            if (typeof this.onComplete === 'function') {
                this.onComplete();
            }
        }
    }

    destroyThree() {
        try {
            if (this.particleGeometry) {
                this.particleGeometry.dispose();
                this.particleGeometry = null;
            }
            if (this.particleMaterial) {
                this.particleMaterial.dispose();
                this.particleMaterial = null;
            }
            this.particles3d = [];
            this.confetti = [];
            this.rings = [];
            this.streaks = [];
            this.hearts = [];

            if (this.fxCtx) {
                this.fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            }

            if (this.renderer) {
                this.renderer.dispose();
                this.renderer.forceContextLoss();
                this.renderer = null;
            }
            this.scene = null;
            this.camera = null;
            this.robotGroup = null;
            this.robotMesh = null;
        } catch (e) { /* noop */ }
    }

    /* --- Математика --- */

    smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    bell(t, center, width) {
        const d = (t - center) / width;
        return Math.exp(-d * d);
    }

    easeOutCubic(k) {
        return 1 - Math.pow(1 - k, 3);
    }

    easeInOutCubic(k) {
        return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    }

    // Отклик пружины с перелётом: 0 → >1 → 1
    dampedResponse(k, springK, zeta) {
        const omega = springK * Math.sqrt(1 - zeta * zeta);
        const envelope = Math.exp(-zeta * springK * k);
        return 1 - envelope * (Math.cos(omega * k) + (zeta * springK / omega) * Math.sin(omega * k));
    }
}
