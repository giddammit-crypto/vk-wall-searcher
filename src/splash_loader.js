/**
 * Aurora Splash Screen & 3D Cosmo Preloader Engine
 * 8-second cinematic 3D intro with Three.js cute robot, curved typography, and HUD progress bar
 */

export class AuroraSplashLoader {
    constructor(options = {}) {
        this.totalDuration = options.duration || 8.0; // 8 seconds
        this.onComplete = options.onComplete || (() => {});
        this.modelUrl = options.modelUrl || 'assets/models/cute_robot.glb';

        this.container = document.getElementById('aurora-splash');
        this.starsCanvas = document.getElementById('aurora-splash-stars');
        this.webglCanvas = document.getElementById('aurora-splash-webgl');
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

        // Coordinates & Animation Config
        this.xStart = -4.5;
        this.xTarget = 0.0;
        this.baseScale = 1.0;

        // Letters elements
        this.letterEls = [];

        this.init();
    }

    async init() {
        if (!this.container) return;

        // Keyboard & Skip Button
        this.setupControls();

        // Background Star Dust Canvas
        this.initStarfield();

        // Setup Curved Text Elements
        this.setupCurvedLetters();

        // Load Three.js and GLTFLoader
        await this.ensureThreeLibraries();

        // Setup Three.js WebGL Scene
        this.initWebGL();

        // Load 3D GLB Model
        this.loadModel();

        // Start Master Timeline
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
        // Text «КОСМО» (5 letters)
        const letters = ['К', 'О', 'С', 'М', 'О'];
        this.arcContainer.innerHTML = '';

        letters.forEach((char, index) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = char;
            tspan.setAttribute('class', 'aurora-splash-arc-letter');
            tspan.setAttribute('dx', index === 0 ? '0' : '14');
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
        const count = Math.min(160, Math.floor((width * height) / 8000));

        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.4 + 0.6,
                vy: -(Math.random() * 0.25 + 0.05),
                vx: (Math.random() - 0.5) * 0.1,
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

                const alpha = Math.max(0.1, Math.min(0.85, s.opacity + Math.sin(s.pulseAngle) * 0.25));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
                ctx.shadowBlur = s.radius > 1.2 ? 6 : 0;
                ctx.shadowColor = `rgba(${s.color}, 0.6)`;
                ctx.fill();
            }

            if (!this.isClosed) {
                requestAnimationFrame(drawStars);
            }
        };

        requestAnimationFrame(drawStars);
    }

    async ensureThreeLibraries() {
        if (window.THREE && window.THREE.GLTFLoader) {
            return;
        }

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.async = false;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(s);
            });
        };

        try {
            if (!window.THREE) {
                try {
                    await loadScript('assets/vendor/three/three.min.js');
                } catch (e) {
                    console.warn('[Splash] Fallback to CDN Three.js', e);
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
                }
            }
            if (!window.THREE.GLTFLoader) {
                try {
                    await loadScript('assets/vendor/three/GLTFLoader.js');
                } catch (e) {
                    console.warn('[Splash] Fallback to CDN GLTFLoader', e);
                    await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
                }
            }
        } catch (err) {
            console.error('[Splash] Error loading Three.js libraries:', err);
        }
    }

    initWebGL() {
        if (!window.THREE || !this.webglCanvas) return;

        const THREE = window.THREE;
        const rect = this.webglCanvas.parentElement.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 170;

        this.scene = new THREE.Scene();

        // Camera: Perspective camera tuned so robot height fits ~118-124px
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(0, 0.45, 3.8);

        // WebGL Renderer
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
            this.renderer.toneMappingExposure = 1.15;
        }

        // --- Three-point Lighting Rig + Dual Rim Lights (Artist Specification) ---
        // 1. Key Light (White/Ice specular)
        const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
        keyLight.position.set(2.5, 4.0, 3.5);
        this.scene.add(keyLight);

        // 2. Dual Rim Lights: Left Cyan + Right Magenta (Guaranteeing 128px contrast)
        const rimLeft = new THREE.DirectionalLight(0x38bdf8, 4.0);
        rimLeft.position.set(-4.0, 1.6, -2.8);
        this.scene.add(rimLeft);

        const rimRight = new THREE.DirectionalLight(0xec4899, 4.2);
        rimRight.position.set(4.0, 1.2, -2.5);
        this.scene.add(rimRight);

        // 3. Ambient / Hemisphere Fill
        const hemiLight = new THREE.HemisphereLight(0x8b5cf6, 0x070913, 0.85);
        this.scene.add(hemiLight);

        // Root group for robot
        this.robotGroup = new THREE.Group();
        this.scene.add(this.robotGroup);

        // Start off-screen at left
        this.robotGroup.position.set(this.xStart, 0, 0);
        this.robotGroup.rotation.set(0, -Math.PI / 2, 0); // Profile view facing right

        // Add sleek stylized fallback mesh while GLB loads
        this.createFallbackMesh();

        // Handle window resize
        this.resizeHandler = () => {
            if (!this.renderer || !this.camera || !this.webglCanvas) return;
            const r = this.webglCanvas.parentElement.getBoundingClientRect();
            const w = r.width || 600;
            const h = r.height || 170;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h, false);
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    createFallbackMesh() {
        const THREE = window.THREE;
        if (!THREE || !this.robotGroup) return;

        this.fallbackGroup = new THREE.Group();

        // Stylized sphere head with cyan visor
        const headGeo = new THREE.SphereGeometry(0.38, 24, 24);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.25,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 0.55;

        // Visor
        const visorGeo = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x0a192f,
            emissive: 0x38bdf8,
            emissiveIntensity: 1.5,
            roughness: 0.1
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.rotation.x = Math.PI / 2;
        visor.position.set(0, 0.55, 0.26);

        // Torso
        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.45, 24);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.18;

        this.fallbackGroup.add(head);
        this.fallbackGroup.add(visor);
        this.fallbackGroup.add(body);
        this.robotGroup.add(this.fallbackGroup);
    }

    loadModel() {
        if (!window.THREE || !window.THREE.GLTFLoader) return;

        const loader = new window.THREE.GLTFLoader();
        loader.load(
            this.modelUrl,
            (gltf) => {
                if (this.isClosed) return;
                const THREE = window.THREE;
                const model = gltf.scene;

                // Compute bounding box to strictly fit ~128px height
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                // Desired height in Three.js units (~1.0 unit = ~118px on 40 FOV camera at z=3.8)
                const targetHeight = 1.05;
                const scale = targetHeight / (size.y || 1);
                model.scale.set(scale, scale, scale);

                // Offset model so pivot is at base
                model.position.x = -center.x * scale;
                model.position.y = -box.min.y * scale - 0.45; // Centered vertically in viewport
                model.position.z = -center.z * scale;

                // Materials enhancement
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.envMapIntensity = 1.2;
                            // Ensure normal & roughness are prominent
                            if (child.material.roughness !== undefined) {
                                child.material.roughness = Math.max(0.18, child.material.roughness);
                            }
                        }
                    }
                });

                // Remove fallback placeholder and attach true model
                if (this.fallbackGroup) {
                    this.robotGroup.remove(this.fallbackGroup);
                    this.fallbackGroup = null;
                }

                this.robotMesh = model;
                this.robotGroup.add(model);
                this.isModelLoaded = true;
                console.log('[Splash] 3D Cosmo Robot loaded successfully');
            },
            undefined,
            (error) => {
                console.warn('[Splash] Could not load GLB model, keeping stylized fallback:', error);
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

        this.updateTimeline(elapsed);

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
        // 1. Robot Translation X & Inertial Tilt (0.0s - 2.2s)
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
            // 2. 90° Turn to Face User (1.8s - 3.0s)
            // -------------------------------------------------------------
            if (clampedT < 1.8) {
                this.robotGroup.rotation.y = -Math.PI / 2; // Facing right (profile)
            } else if (clampedT >= 1.8 && clampedT < 3.0) {
                const tTurn = (clampedT - 1.8) / 1.2;
                // Damped harmonic spring: 1 - exp(-3.74 * t) * (cos(3.6 * t) + 0.25 * sin(3.6 * t))
                const dampedResponse = 1 - Math.exp(-3.74 * tTurn) * (Math.cos(3.6 * tTurn) + 0.25 * Math.sin(3.6 * tTurn));
                this.robotGroup.rotation.y = (-Math.PI / 2) * (1 - dampedResponse);
            } else {
                this.robotGroup.rotation.y = 0; // Front face
            }

            // -------------------------------------------------------------
            // 3. Idle Levitation & Bobbing (2.0s - 8.0s)
            // -------------------------------------------------------------
            if (clampedT >= 1.8) {
                const bobWeight = this.smoothstep(1.8, 2.8, clampedT);
                // Lissajous superposition
                const bobY = 0.045 * Math.sin(2 * Math.PI * 0.65 * clampedT) + 0.012 * Math.sin(2 * Math.PI * 1.30 * clampedT);
                const bobRotX = 0.035 * Math.cos(2 * Math.PI * 0.65 * clampedT);
                const bobRotZ = 0.025 * Math.sin(2 * Math.PI * 0.45 * clampedT);

                this.robotGroup.position.y = bobWeight * bobY;
                this.robotGroup.rotation.x = bobWeight * bobRotX;
                if (clampedT >= 2.2) {
                    this.robotGroup.rotation.z = bobWeight * bobRotZ;
                }

                // Sync floor shadow and ion glow with bobbing
                if (this.shadowEl) {
                    const shadowScale = 1 - (bobWeight * bobY * 1.5);
                    this.shadowEl.style.transform = `translateX(-50%) scale(${Math.max(0.75, Math.min(1.25, shadowScale))})`;
                    this.shadowEl.style.opacity = `${Math.max(0.4, Math.min(0.9, 0.75 - bobWeight * bobY * 2))}`;
                }
            }
        }

        // -------------------------------------------------------------
        // 4. Curved Text «КОСМО» Staggered Reveal (2.8s - 4.4s)
        // -------------------------------------------------------------
        const textStartBase = 2.8;
        const staggerStep = 0.09;
        this.letterEls.forEach((el, i) => {
            const letterStart = textStartBase + i * staggerStep;
            if (clampedT < letterStart) {
                el.style.opacity = '0';
            } else {
                const tau = Math.min(1, (clampedT - letterStart) / 0.5);
                const opacity = this.smoothstep(0, 0.4, tau);
                el.style.opacity = opacity.toFixed(3);
                if (tau < 0.6) {
                    // Micro glow flash during appearance
                    el.style.filter = 'drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 24px #ec4899)';
                } else {
                    el.style.filter = '';
                }
            }
        });

        // -------------------------------------------------------------
        // 5. HUD Progress Bar (0% -> 100% over 8.0s)
        // -------------------------------------------------------------
        const normT = clampedT / this.totalDuration;
        // Non-linear psychological curve:
        const progressRaw = 100 * (0.65 * normT + 0.20 * Math.sin(Math.PI * normT) + 0.15 * Math.pow(normT, 3));
        const progress = Math.min(100, Math.max(0, progressRaw));

        if (this.progressFill) {
            this.progressFill.style.width = `${progress.toFixed(1)}%`;
        }
        if (this.progressPercent) {
            this.progressPercent.textContent = `${Math.floor(progress)}%`;
        }

        // Dynamic status updates according to phase
        if (this.progressStatus) {
            if (clampedT < 1.8) {
                this.progressStatus.textContent = 'ИНИЦИАЛИЗАЦИЯ ЯДРА АВРОРЫ...';
            } else if (clampedT < 3.2) {
                this.progressStatus.textContent = 'КАЛИБРОВКА СЕРВОПРИВОДОВ КОСМО...';
            } else if (clampedT < 5.0) {
                this.progressStatus.textContent = 'СИНХРОНИЗАЦИЯ БИБЛИОТЕЧНОЙ СЕТИ...';
            } else if (clampedT < 7.2) {
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

        const fadeDuration = isImmediate ? 250 : 650;

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
