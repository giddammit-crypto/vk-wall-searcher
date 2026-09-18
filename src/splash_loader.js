/**
 * Aurora Splash Screen & 3D Cosmo Robot Engine
 * Uses the authentic 3D GLB model (assets/models/cute_robot.glb) and official mascot assets
 * with Three.js WebGL rendering, studio lighting, Lissajous hover physics,
 * curved typography «КОСМО», and HUD progress bar.
 */

export class AuroraSplashLoader {
    constructor(options = {}) {
        this.totalDuration = options.duration || 8.0; // 8 seconds
        this.onComplete = options.onComplete || (() => {});
        this.modelUrl = options.modelUrl || 'assets/models/cute_robot.glb';

        this.container = document.getElementById('aurora-splash');
        this.starsCanvas = document.getElementById('aurora-splash-stars');
        this.webglCanvas = document.getElementById('aurora-splash-webgl');
        this.mascotFallback = document.getElementById('aurora-splash-mascot-fallback');
        this.arcContainer = document.getElementById('aurora-splash-arc-letters');
        this.progressFill = document.getElementById('aurora-splash-progress-fill');
        this.progressPercent = document.getElementById('aurora-splash-percent');
        this.progressStatus = document.getElementById('aurora-splash-status-text');
        this.skipBtn = document.getElementById('aurora-splash-skip');
        this.shadowEl = document.querySelector('.aurora-splash-hover-shadow');
        this.ionGlowEl = document.querySelector('.aurora-splash-ion-glow');

        this.isRunning = false;
        this.isClosed = false;
        this.startTime = null;
        this.animFrameId = null;

        // Three.js instances
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.robotGroup = null;
        this.robotMesh = null;
        this.isModelLoaded = false;
        this.isThreeReady = false;

        // Entry trajectory coordinates
        this.xStart = -4.2;
        this.xTarget = 0.0;
        this.targetHeight = 1.42; // Strictly ~115-125px on 38deg FOV camera at z=3.4

        // SVG letters elements
        this.letterEls = [];

        this.init();
    }

    async init() {
        if (!this.container) return;

        // 1. Setup Controls (Skip button & Keyboard)
        this.setupControls();

        // 2. Background Starfield & Cosmic Dust Canvas
        this.initStarfield();

        // 3. Setup Curved Text Elements «КОСМО»
        this.setupCurvedLetters();

        // 4. Ensure Three.js and GLTFLoader are loaded
        await this.ensureThreeLibraries();

        // 5. Setup WebGL 3D Scene
        this.initWebGL();

        // 6. Load Authentic 3D GLB Model
        this.loadModel();

        // 7. Start Master Animation Timeline
        this.start();
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
            tspan.setAttribute('dx', index === 0 ? '0' : '15');
            tspan.style.opacity = '0';
            this.arcContainer.appendChild(tspan);
            this.letterEls.push(tspan);
        });
    }

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
                vy: -(Math.random() * 0.22 + 0.05),
                vx: (Math.random() - 0.5) * 0.08,
                opacity: Math.random() * 0.5 + 0.2,
                pulseAngle: Math.random() * Math.PI * 2,
                color: Math.random() > 0.4 ? '56, 189, 248' : '236, 72, 153'
            });
        }

        const resizeStars = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeStars);

        const drawStars = () => {
            if (this.isClosed) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.y += s.vy;
                s.x += s.vx;
                s.pulseAngle += 0.02;

                if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
                if (s.x < -5) s.x = width + 5;
                if (s.x > width + 5) s.x = -5;

                const alpha = Math.max(0.12, Math.min(0.85, s.opacity + Math.sin(s.pulseAngle) * 0.25));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
                ctx.fill();
            }

            if (this.isRunning && !this.isClosed) {
                requestAnimationFrame(drawStars);
            }
        };
        drawStars();
    }

    async ensureThreeLibraries() {
        if (window.THREE && window.THREE.GLTFLoader) {
            this.isThreeReady = true;
            return;
        }

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    if (existing.dataset.loaded === 'true' || window.THREE) {
                        return resolve();
                    }
                    existing.addEventListener('load', () => resolve());
                    existing.addEventListener('error', (e) => reject(e));
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => {
                    script.dataset.loaded = 'true';
                    resolve();
                };
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            });
        };

        try {
            if (!window.THREE) {
                await loadScript('assets/vendor/three/three.min.js');
            }
            if (window.THREE && !window.THREE.GLTFLoader) {
                await loadScript('assets/vendor/three/GLTFLoader.js');
            }
            this.isThreeReady = !!(window.THREE && window.THREE.GLTFLoader);
        } catch (err) {
            console.warn('[Splash] Error loading Three.js scripts, using official mascot asset fallback:', err);
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

            // Camera: tuned so model fits strictly within 128px height
            this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
            this.camera.position.set(0, 0, 3.4);
            this.camera.lookAt(0, 0, 0);

            // WebGL Renderer with ACES Tone Mapping
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
                this.renderer.toneMappingExposure = 1.05;
            }

            // --- Studio Lighting Rig (Balanced & Crisp) ---
            // 1. Soft Ambient (prevents deep blacks without blowing out)
            const ambient = new THREE.AmbientLight(0xffffff, 0.85);
            this.scene.add(ambient);

            // 2. Key Light (Top-Front-Right) for clean highlights
            const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
            keyLight.position.set(2.2, 2.8, 2.5);
            this.scene.add(keyLight);

            // 3. Cyan Fill Light (Aurora palette signature)
            const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
            fillLight.position.set(-3.0, 1.5, 1.8);
            this.scene.add(fillLight);

            // 4. Magenta Rim Backlight (Accentuates silhouette)
            const rimLight = new THREE.DirectionalLight(0xec4899, 1.8);
            rimLight.position.set(2.5, -1.0, -2.5);
            this.scene.add(rimLight);

            // 5. Under-Thruster Point Light (Simulates ion engine)
            const ionLight = new THREE.PointLight(0x38bdf8, 1.3, 3.5);
            ionLight.position.set(0, -0.85, 0.2);
            this.scene.add(ionLight);

            // Robot Root Group
            this.robotGroup = new THREE.Group();
            this.scene.add(this.robotGroup);

            // Start off-screen at left, facing forward in direction of motion (+X)
            this.robotGroup.position.set(this.xStart, 0, 0);
            this.robotGroup.rotation.set(0, Math.PI / 2, 0); // Profile view facing right

            // Resize handling
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
            console.warn('[Splash] WebGL initialization failed, switching to mascot asset fallback:', e);
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

                // Compute bounding box to normalize height precisely
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const scale = this.targetHeight / (size.y || 1);
                model.scale.set(scale, scale, scale);

                // Center model pivot at exact center of robot
                model.position.x = -center.x * scale;
                model.position.y = -center.y * scale;
                model.position.z = -center.z * scale;

                // Optimize PBR material properties
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.metalness = 0.08;
                            child.material.roughness = 0.38;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                this.robotMesh = model;
                this.robotGroup.add(model);
                this.isModelLoaded = true;
                console.log('[Splash] 3D Cosmo Robot loaded successfully!');
            },
            undefined,
            (error) => {
                console.warn('[Splash] Could not load 3D GLB model, using mascot asset fallback:', error);
                this.activateMascotFallback();
            }
        );
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

        // Update 3D Robot & Narrative Timeline
        this.updateTimeline(elapsed);

        // Render WebGL Scene if active
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        if (elapsed >= this.totalDuration) {
            this.finish(false);
            return;
        }

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    updateTimeline(t) {
        const clampedT = Math.min(this.totalDuration, Math.max(0, t));

        // -------------------------------------------------------------
        // 1. Robot Translation X & Forward Flight Lean (0.0s - 2.2s)
        // -------------------------------------------------------------
        if (this.robotGroup) {
            if (clampedT < 2.2) {
                const tau = clampedT / 2.2;
                // Quartic Ease-Out: 1 - (1 - tau)^4
                const u = 1 - Math.pow(1 - tau, 4);
                this.robotGroup.position.x = this.xStart + (this.xTarget - this.xStart) * u;
                // Forward drive inertial lean
                this.robotGroup.rotation.z = -0.12 * Math.pow(1 - tau, 3) * Math.sin(Math.PI * tau);
            } else {
                this.robotGroup.position.x = this.xTarget;
            }

            // -------------------------------------------------------------
            // 2. 90° Turn to Face User Frontal (1.8s - 3.2s)
            // -------------------------------------------------------------
            if (clampedT < 1.8) {
                this.robotGroup.rotation.y = Math.PI / 2; // Facing right in direction of movement
            } else if (clampedT >= 1.8 && clampedT < 3.2) {
                const tTurn = (clampedT - 1.8) / 1.4;
                // Damped harmonic spring: 1 - exp(-3.8 * t) * (cos(3.6 * t) + 0.25 * sin(3.6 * t))
                const dampedResponse = 1 - Math.exp(-3.8 * tTurn) * (Math.cos(3.6 * tTurn) + 0.25 * Math.sin(3.6 * tTurn));
                this.robotGroup.rotation.y = (Math.PI / 2) * (1 - dampedResponse);
            } else {
                this.robotGroup.rotation.y = 0; // Directly facing user front view!
            }

            // -------------------------------------------------------------
            // 3. Zero-G Hover & Bobbing Physics (2.0s - 8.0s)
            // -------------------------------------------------------------
            if (clampedT >= 2.0) {
                const bobWeight = this.smoothstep(2.0, 3.0, clampedT);
                // Lissajous superposition
                const bobY = 0.045 * Math.sin(2 * Math.PI * 0.65 * clampedT) + 0.012 * Math.sin(2 * Math.PI * 1.30 * clampedT);
                const bobRotX = 0.032 * Math.cos(2 * Math.PI * 0.65 * clampedT);
                const bobRotZ = 0.024 * Math.sin(2 * Math.PI * 0.45 * clampedT);

                // Celebratory Jump pulse between 5.0s and 6.2s
                let jumpY = 0;
                let jumpScale = 1.0;
                if (clampedT >= 5.0 && clampedT < 6.2) {
                    const tJump = (clampedT - 5.0) / 1.2;
                    jumpY = 0.24 * Math.sin(Math.PI * tJump);
                    jumpScale = 1.0 + 0.08 * Math.sin(Math.PI * tJump);
                }

                this.robotGroup.position.y = (bobWeight * bobY) + jumpY;
                this.robotGroup.rotation.x = bobWeight * bobRotX;
                if (clampedT >= 2.5) {
                    this.robotGroup.rotation.z = bobWeight * bobRotZ;
                }
                this.robotGroup.scale.set(jumpScale, jumpScale, jumpScale);

                // Synchronize floor shadow and ion glow with bobbing/jumping
                if (this.shadowEl) {
                    const shadowScale = Math.max(0.65, Math.min(1.3, 1 - ((bobWeight * bobY + jumpY) * 1.8)));
                    this.shadowEl.style.transform = `translateX(-50%) scale(${shadowScale})`;
                    this.shadowEl.style.opacity = `${Math.max(0.35, Math.min(0.9, 0.75 - (bobWeight * bobY + jumpY) * 2))}`;
                }
                if (this.ionGlowEl) {
                    const glowScale = Math.max(0.7, Math.min(1.4, 1 + jumpY * 2));
                    this.ionGlowEl.style.transform = `translateX(-50%) scale(${glowScale})`;
                }
            }
        }

        // -------------------------------------------------------------
        // 4. Curved Text «КОСМО» Staggered Reveal (5.0s - 6.6s)
        // -------------------------------------------------------------
        const textStartBase = 5.0;
        const staggerStep = 0.11;
        this.letterEls.forEach((el, i) => {
            const letterStart = textStartBase + i * staggerStep;
            if (clampedT < letterStart) {
                el.style.opacity = '0';
            } else {
                const tau = Math.min(1, (clampedT - letterStart) / 0.45);
                const opacity = this.smoothstep(0, 1, tau);
                el.style.opacity = opacity.toFixed(3);
                if (tau < 0.65) {
                    el.style.filter = 'drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 26px #ec4899)';
                } else {
                    el.style.filter = '';
                }
            }
        });

        // -------------------------------------------------------------
        // 5. HUD Progress Bar (0% -> 100% over 8.0s)
        // -------------------------------------------------------------
        const normT = clampedT / this.totalDuration;
        const progressRaw = 100 * (0.68 * normT + 0.18 * Math.sin(Math.PI * normT) + 0.14 * Math.pow(normT, 3));
        const progress = Math.min(100, Math.max(0, progressRaw));

        if (this.progressFill) this.progressFill.style.width = `${progress.toFixed(1)}%`;
        if (this.progressPercent) this.progressPercent.textContent = `${Math.floor(progress)}%`;

        // Dynamic status updates according to phase
        if (this.progressStatus) {
            if (clampedT < 1.8) {
                this.progressStatus.textContent = 'ИНИЦИАЛИЗАЦИЯ ЯДРА АВРОРЫ...';
            } else if (clampedT < 3.2) {
                this.progressStatus.textContent = 'КАЛИБРОВКА СЕРВОПРИВОДОВ КОСМО...';
            } else if (clampedT < 5.0) {
                this.progressStatus.textContent = 'СИНХРОНИЗАЦИЯ С 16 БИБЛИОТЕКАМИ...';
            } else if (clampedT < 7.0) {
                this.progressStatus.textContent = 'ПОДГОТОВКА СЛУЖЕБНОГО ДАШБОРДА...';
            } else {
                this.progressStatus.textContent = 'СИСТЕМА ГОТОВА К РАБОТЕ!';
            }
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
            if (this.renderer) {
                this.renderer.dispose();
                this.renderer.forceContextLoss();
                this.renderer = null;
            }
            this.scene = null;
            this.camera = null;
            this.robotGroup = null;
            this.robotMesh = null;
        } catch (e) {}
    }
}
