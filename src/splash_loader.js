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
        this.viewportEl = document.querySelector('.aurora-splash-robot-viewport');

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

        // AAA Animation: Walk cycle particles system (dust + energy sparks)
        this.particles = [];
        this.maxParticles = 60;

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

            // AAA Animation: Particle system for walk trail
            this.particleGeometry = new THREE.BufferGeometry();
            this.particleMaterial = new THREE.PointsMaterial({
                color: 0x38bdf8,
                size: 0.08,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
            this.scene.add(this.particleSystem);

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

        // ═══════════════════════════════════════════════════════════════════════════
        // AAA ANIMATION SYSTEM: Professional 12 Principles of Animation Implementation
        // ═══════════════════════════════════════════════════════════════════════════

        // -------------------------------------------------------------
        // 0. ANTICIPATION: Robot prepares to move (0.0s - 0.35s)
        // -------------------------------------------------------------
        if (this.robotGroup) {
            let anticipationX = 0;
            let anticipationRotZ = 0;
            
            if (clampedT < 0.35) {
                const tAntic = clampedT / 0.35;
                // Ease-out back: robot "crouches" and leans backward before launch
                const backEase = Math.sin(tAntic * Math.PI * 0.5);
                anticipationX = -0.15 * (1 - backEase) * Math.sin(Math.PI * tAntic);
                anticipationRotZ = 0.08 * (1 - backEase);
            }

            // -------------------------------------------------------------
            // 1. WALK CYCLE: Lateral movement with realistic locomotion (0.35s - 2.4s)
            // -------------------------------------------------------------
            const walkStart = 0.35;
            const walkEnd = 2.4;
            const walkDuration = walkEnd - walkStart;

            // Drive the CSS motion-blur hint only while actually locomoting
            if (this.viewportEl) {
                this.viewportEl.classList.toggle('walking', clampedT >= walkStart && clampedT < walkEnd);
            }
            
            if (clampedT >= walkStart && clampedT < walkEnd) {
                const tWalk = (clampedT - walkStart) / walkDuration;
                
                // Custom professional ease: starts slow, accelerates, maintains speed, gentle decel
                // Using compound bezier approximation: ease-in-out-cubic with velocity plateau
                let moveEase;
                if (tWalk < 0.25) {
                    // Ease-in (acceleration phase)
                    const t1 = tWalk / 0.25;
                    moveEase = 0.25 * (t1 * t1 * (3 - 2 * t1));
                } else if (tWalk < 0.8) {
                    // Constant velocity plateau
                    const t2 = (tWalk - 0.25) / 0.55;
                    moveEase = 0.25 + 0.55 * t2;
                } else {
                    // Ease-out (deceleration phase)
                    const t3 = (tWalk - 0.8) / 0.2;
                    const decel = t3 * t3 * (3 - 2 * t3);
                    moveEase = 0.8 + 0.2 * decel;
                }
                
                this.robotGroup.position.x = this.xStart + anticipationX + (this.xTarget - this.xStart) * moveEase;
                
                // WALK CYCLE MECHANICS:
                // - Vertical bounce (dip on each step)
                const stepFrequency = 3.5; // steps per second during walk
                const stepPhase = (clampedT - walkStart) * stepFrequency * Math.PI * 2;
                const verticalBounce = -0.035 * Math.abs(Math.sin(stepPhase)); // Dip down on steps
                
                // - Forward lean during acceleration
                const forwardLean = -0.14 * (1 - moveEase) * Math.sin(Math.PI * tWalk * 0.5);
                
                // - Shoulder sway (overlapping action - delayed rotation on Z axis)
                const shoulderSway = 0.04 * Math.sin(stepPhase * 0.5 + Math.PI * 0.25);
                
                this.robotGroup.position.y = verticalBounce;
                this.lastWalkBounce = verticalBounce;
                this.robotGroup.rotation.z = forwardLean + shoulderSway + anticipationRotZ;
                
                // PARTICLE EMISSION: Dust/energy particles under feet during walk
                if (Math.random() > 0.65) {
                    this.emitWalkParticle(this.robotGroup.position.x, verticalBounce);
                }
                
            } else if (clampedT < walkStart) {
                // Pre-walk: anticipation position
                this.robotGroup.position.x = this.xStart + anticipationX;
                this.robotGroup.rotation.z = anticipationRotZ;
            } else {
                // Post-walk: settled at center, blend the last step bounce out smoothly
                this.robotGroup.position.x = this.xTarget;
                if (clampedT < 2.8) {
                    const settle = 1 - this.smoothstep(walkEnd, 2.8, clampedT);
                    this.robotGroup.position.y = (this.lastWalkBounce || 0) * settle;
                }
            }

            // Update and render particle system
            this.updateParticles();

            // -------------------------------------------------------------
            // 2. TURN TO CAMERA: 90° rotation with natural weight shift (2.0s - 3.6s)
            // -------------------------------------------------------------
            const turnStart = 2.0;
            const turnEnd = 3.6;
            
            if (clampedT < turnStart) {
                this.robotGroup.rotation.y = Math.PI / 2; // Profile view (facing right)
            } else if (clampedT >= turnStart && clampedT < turnEnd) {
                const tTurn = (clampedT - turnStart) / (turnEnd - turnStart);
                
                // Advanced ease with overshoot and settle (damped spring response)
                // Simulates weight transfer and natural momentum
                const springK = 4.2;
                const dampingRatio = 0.88;
                const omega = springK * Math.sqrt(1 - dampingRatio * dampingRatio);
                const envelope = Math.exp(-dampingRatio * springK * tTurn);
                const oscillation = Math.cos(omega * tTurn) + (dampingRatio * springK / omega) * Math.sin(omega * tTurn);
                const dampedResponse = 1 - envelope * oscillation;
                
                this.robotGroup.rotation.y = (Math.PI / 2) * (1 - dampedResponse);
                
                // FOLLOW-THROUGH: Upper body lags behind lower body during turn
                // (Simulated via subtle Z-axis counter-rotation)
                const followThrough = 0.05 * Math.sin(tTurn * Math.PI) * envelope;
                this.robotGroup.rotation.z = followThrough;
                
            } else {
                this.robotGroup.rotation.y = 0; // Facing camera directly
            }

            // -------------------------------------------------------------
            // 3. ZERO-G HOVER: Lissajous floating physics (2.8s - 8.0s)
            // -------------------------------------------------------------
            if (clampedT >= 2.8) {
                const hoverStart = 2.8;
                const hoverWeight = this.smoothstep(hoverStart, hoverStart + 0.8, clampedT);
                
                // Multi-frequency Lissajous curves for organic floating
                const t1 = clampedT * 0.65;
                const t2 = clampedT * 1.30;
                const t3 = clampedT * 0.45;
                
                const bobY = 0.048 * Math.sin(2 * Math.PI * t1) + 0.014 * Math.sin(2 * Math.PI * t2);
                const bobRotX = 0.036 * Math.cos(2 * Math.PI * t1);
                const bobRotZ = 0.028 * Math.sin(2 * Math.PI * t3);
                
                // SQUASH & STRETCH: Celebratory jump with exaggerated deformation (5.2s - 6.6s)
                let jumpY = 0;
                let squashStretchScale = { x: 1.0, y: 1.0, z: 1.0 };
                
                if (clampedT >= 5.2 && clampedT < 6.6) {
                    const tJump = (clampedT - 5.2) / 1.4;
                    
                    // Jump arc with professional ease
                    const jumpArc = Math.sin(Math.PI * tJump);
                    jumpY = 0.32 * jumpArc;
                    
                    // SQUASH & STRETCH: Compress before jump, stretch at apex, squash on landing
                    if (tJump < 0.15) {
                        // Pre-jump squash (anticipation)
                        const tSquash = tJump / 0.15;
                        squashStretchScale.y = 1.0 - 0.12 * (1 - tSquash);
                        squashStretchScale.x = 1.0 + 0.06 * (1 - tSquash);
                        squashStretchScale.z = 1.0 + 0.06 * (1 - tSquash);
                    } else if (tJump < 0.5) {
                        // Rising stretch
                        const tStretch = (tJump - 0.15) / 0.35;
                        squashStretchScale.y = 1.0 + 0.14 * tStretch;
                        squashStretchScale.x = 1.0 - 0.05 * tStretch;
                        squashStretchScale.z = 1.0 - 0.05 * tStretch;
                    } else if (tJump < 0.85) {
                        // At apex - maximum stretch
                        squashStretchScale.y = 1.14;
                        squashStretchScale.x = 0.95;
                        squashStretchScale.z = 0.95;
                    } else {
                        // Landing squash
                        const tLand = (tJump - 0.85) / 0.15;
                        squashStretchScale.y = 1.14 - 0.24 * tLand;
                        squashStretchScale.x = 0.95 + 0.15 * tLand;
                        squashStretchScale.z = 0.95 + 0.15 * tLand;
                    }
                    
                    // Rotation during jump (adds dynamism)
                    this.robotGroup.rotation.y = 0.15 * Math.sin(Math.PI * tJump * 2);
                }
                
                // Apply all hover motions with weight blending (absolute position — never cumulative)
                this.robotGroup.position.y = (hoverWeight * bobY) + jumpY;
                
                this.robotGroup.rotation.x = hoverWeight * bobRotX;
                
                // Only apply subtle bob rotation when not jumping/turning
                if (clampedT >= 3.8 && (clampedT < 5.2 || clampedT >= 6.8)) {
                    this.robotGroup.rotation.z = hoverWeight * bobRotZ;
                }
                
                this.robotGroup.scale.set(squashStretchScale.x, squashStretchScale.y, squashStretchScale.z);
                
                // SECONDARY MOTION: Shadow and ion glow respond to robot movement
                if (this.shadowEl) {
                    const totalY = (hoverWeight * bobY) + jumpY;
                    const shadowScale = Math.max(0.55, Math.min(1.4, 1 - (totalY * 2.2)));
                    const shadowOpacity = Math.max(0.25, Math.min(0.95, 0.8 - (totalY * 2.8)));
                    this.shadowEl.style.transform = `translateX(-50%) scale(${shadowScale})`;
                    this.shadowEl.style.opacity = `${shadowOpacity}`;
                }
                
                if (this.ionGlowEl) {
                    const totalY = (hoverWeight * bobY) + jumpY;
                    const glowScale = Math.max(0.6, Math.min(1.6, 1 + totalY * 2.5));
                    const glowOpacity = Math.max(0.4, Math.min(1.0, 0.6 + totalY * 1.2));
                    this.ionGlowEl.style.transform = `translateX(-50%) scale(${glowScale})`;
                    this.ionGlowEl.style.opacity = `${glowOpacity}`;
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

    // ═══════════════════════════════════════════════════════════════════════════
    // AAA PARTICLE SYSTEM: Walk cycle dust/energy particles
    // ═══════════════════════════════════════════════════════════════════════════
    
    emitWalkParticle(x, y) {
        if (!window.THREE || !this.particleGeometry) return;
        
        // Dust particle with variable size and spread
        this.particles.push({
            x: x - 0.15 + Math.random() * 0.3,
            y: y - 0.15,
            z: -0.12 + Math.random() * 0.24,
            vx: (Math.random() - 0.5) * 0.035,
            vy: Math.random() * 0.025 + 0.008,
            vz: (Math.random() - 0.5) * 0.035,
            life: 1.0,
            decay: 0.012 + Math.random() * 0.015,
            type: 'dust'
        });
        
        // Energy spark (30% chance) — faster, hotter, shorter-lived
        if (Math.random() > 0.7) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 0.2,
                y: y - 0.1,
                z: (Math.random() - 0.5) * 0.15,
                vx: (Math.random() - 0.5) * 0.08,
                vy: Math.random() * 0.05 + 0.02,
                vz: (Math.random() - 0.5) * 0.08,
                life: 1.0,
                decay: 0.025 + Math.random() * 0.02,
                type: 'spark'
            });
        }
        
        if (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }
    
    updateParticles() {
        if (!window.THREE || !this.particleGeometry) return;

        // Когда весь след погас, обнуляем диапазон отрисовки — иначе последние
        // вершины останутся видимыми как застывшие точки под роботом.
        if (this.particles.length === 0) {
            this.particleGeometry.setDrawRange(0, 0);
            return;
        }
        
        const THREE = window.THREE;
        
        // Update particle physics
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
            
            // Gravity and drag
            p.vy -= 0.0008; // Slight downward pull
            p.vx *= 0.97; // Air resistance
            p.vz *= 0.97;
            
            // Decay life
            p.life -= p.decay;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update geometry with current particle positions
        const positions = new Float32Array(this.particles.length * 3);
        const colors = new Float32Array(this.particles.length * 3);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
            
            // Dust fades cyan → magenta; sparks stay hot white-pink
            const t = 1 - p.life;
            if (p.type === 'spark') {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.75 + 0.25 * p.life;
                colors[i * 3 + 2] = 0.85 + 0.15 * p.life;
            } else {
                const cyan = [0.22, 0.74, 0.97]; // #38bdf8
                const magenta = [0.93, 0.28, 0.60]; // #ec4899
                colors[i * 3] = cyan[0] * (1 - t) + magenta[0] * t;
                colors[i * 3 + 1] = cyan[1] * (1 - t) + magenta[1] * t;
                colors[i * 3 + 2] = cyan[2] * (1 - t) + magenta[2] * t;
            }
        }
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.setDrawRange(0, this.particles.length);
        
        // Update material to use vertex colors
        if (this.particleMaterial && !this.particleMaterial.vertexColors) {
            this.particleMaterial.vertexColors = true;
            this.particleMaterial.needsUpdate = true;
        }
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
            // Clean up particle system
            if (this.particleGeometry) {
                this.particleGeometry.dispose();
                this.particleGeometry = null;
            }
            if (this.particleMaterial) {
                this.particleMaterial.dispose();
                this.particleMaterial = null;
            }
            this.particles = [];
            
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
