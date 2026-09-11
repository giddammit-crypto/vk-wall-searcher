/**
 * ============================================================================
 * src/cosmic.js — Cosmic Universe Background Engine (AURORA Design System)
 * High-performance 60 FPS 3D Starfield & Procedural Volumetric Nebulae
 * 
 * Developed for VK Wall Searcher
 * Author: Cosmic Universe Visual Designer (AURORA Design System)
 * ============================================================================
 */

'use strict';

/**
 * Exact Color Palette Specification (AURORA Design System)
 */
export const COSMIC_PALETTE = {
    void: '#050714',                      // Ultra-deep cosmic void base
    voidRgb: [5, 7, 20],
    nebulaCyan: 'rgba(62, 230, 196, ',    // Signature Aurora Cyan (#3EE6C4)
    nebulaPurple: 'rgba(138, 108, 255, ', // Galactic Violet (#8A6CFF)
    nebulaPink: 'rgba(244, 114, 182, ',   // Electric Magenta (#F472B6)
    nebulaBlue: 'rgba(56, 189, 248, ',    // Deep Galactic Blue (#38BDF8)
    starWhite: '#FFFFFF',
    starIcyBlue: '#E0F2FE',
    starLavender: '#C4B5FD',
    starGold: '#FBBF24',
    starCyan: '#3EE6C4'
};

/**
 * Device Configuration Presets & Particle Budgets
 */
export const CONFIG = {
    desktop: {
        starsLayer1: 130,   // Distant micro-stars (subtle twinkle stardust)
        starsLayer2: 180,   // Medium floating stars with soft corona
        starsLayer3: 130,   // Fast foreground streak stars
        nebulaResolution: 1.0,
        maxStreakLength: 200,
        streakMultiplier: 3.4
    },
    tablet: {
        starsLayer1: 80,
        starsLayer2: 110,
        starsLayer3: 70,
        nebulaResolution: 0.85,
        maxStreakLength: 140,
        streakMultiplier: 2.8
    },
    mobile: {
        starsLayer1: 50,
        starsLayer2: 65,
        starsLayer3: 45,
        nebulaResolution: 0.7,
        maxStreakLength: 90,
        streakMultiplier: 2.2
    },
    physics: {
        cruiseSpeed: 1.4,
        warpSpeed: 19.0,
        maxWarpSpeed: 25.0,
        pulseBoost: 6.5,
        accelLerp: 0.045,
        decelLerp: 0.065,
        focalLengthFactor: 0.65,
        maxZ: 1400,
        minZ: 1.0
    }
};

export class CosmicUniverseEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.animId = null;
        this.isActive = false;
        this.isWarping = false;
        this.reducedMotion = false;

        // Dimensions & Perspective
        this.width = 0;
        this.height = 0;
        this.cx = 0;
        this.cy = 0;
        this.dpr = 1;
        this.focalLength = 600;

        // Kinematics & Timing
        this.currentSpeed = CONFIG.physics.cruiseSpeed;
        this.targetSpeed = CONFIG.physics.cruiseSpeed;
        this.pulseSpeed = 0;
        this.time = 0;
        this.lastTime = 0;

        // Starfield Layers
        this.starsL1 = [];
        this.starsL2 = [];
        this.starsL3 = [];

        // Volumetric Nebulae
        this.nebulae = [];

        // Bound Handlers
        this._handleResize = this._handleResize.bind(this);
        this._loop = this._loop.bind(this);
    }

    /**
     * Initialize the engine with DOM elements
     * @param {Object} options
     * @param {string} [options.canvasId='cosmic-universe-canvas']
     * @param {string} [options.containerId='cosmic-search-backdrop']
     * @returns {boolean} Success
     */
    init(options = {}) {
        const canvasId = options.canvasId || 'cosmic-universe-canvas';
        const containerId = options.containerId || 'cosmic-search-backdrop';

        this.canvas = document.getElementById(canvasId);
        this.container = document.getElementById(containerId);

        if (!this.canvas) {
            if (this.container) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = canvasId;
                this.container.appendChild(this.canvas);
            } else {
                return false;
            }
        }

        if (!this.container && this.canvas.parentElement) {
            this.container = this.canvas.parentElement;
        }

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        if (!this.ctx) return false;

        // Accessibility: prefers-reduced-motion check
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.reducedMotion = mq.matches;
            mq.addEventListener('change', (e) => {
                this.reducedMotion = e.matches;
            });
        }

        window.addEventListener('resize', this._handleResize, { passive: true });
        this._handleResize();
        this._initNebulae();
        this._initStarfield();

        return true;
    }

    /**
     * Determine device classification based on viewport width
     */
    _getDeviceProfile() {
        const w = window.innerWidth;
        if (w < 768) return CONFIG.mobile;
        if (w <= 1024) return CONFIG.tablet;
        return CONFIG.desktop;
    }

    /**
     * Handle window resize with Retina display support
     */
    _handleResize() {
        if (!this.canvas) return;

        const rect = this.container ? this.container.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
        this.width = Math.max(rect.width || window.innerWidth, 320);
        this.height = Math.max(rect.height || window.innerHeight, 320);
        this.cx = this.width / 2;
        this.cy = this.height / 2;

        this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for optimal fill-rate
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        if (this.ctx) {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        this.focalLength = Math.max(this.width, this.height) * CONFIG.physics.focalLengthFactor;

        // Rebalance particle population
        if (this.starsL1.length > 0) {
            this._initStarfield();
        }
    }

    /**
     * Initialize 4 Volumetric Procedural Galactic Nebulae
     */
    _initNebulae() {
        this.nebulae = [
            {
                // Nebula 1: The Aurora Teal Lagoon
                baseX: -0.28,
                baseY: -0.16,
                radiusRatio: 0.52,
                orbitRadius: 42,
                orbitSpeed: 0.00045,
                pulseSpeed: 0.00075,
                colorInner: 'rgba(62, 230, 196, 0.15)',
                colorMid: 'rgba(32, 188, 160, 0.07)',
                colorOuter: 'rgba(5, 7, 20, 0)'
            },
            {
                // Nebula 2: The Orion Deep Violet Core
                baseX: 0.32,
                baseY: 0.20,
                radiusRatio: 0.58,
                orbitRadius: 50,
                orbitSpeed: -0.00038,
                pulseSpeed: 0.00062,
                colorInner: 'rgba(138, 108, 255, 0.17)',
                colorMid: 'rgba(99, 102, 241, 0.08)',
                colorOuter: 'rgba(5, 7, 20, 0)'
            },
            {
                // Nebula 3: The Cygnus Electric Magenta Veil
                baseX: 0.14,
                baseY: -0.28,
                radiusRatio: 0.42,
                orbitRadius: 36,
                orbitSpeed: 0.00052,
                pulseSpeed: 0.00091,
                colorInner: 'rgba(244, 114, 182, 0.11)',
                colorMid: 'rgba(217, 70, 239, 0.05)',
                colorOuter: 'rgba(5, 7, 20, 0)'
            },
            {
                // Nebula 4: The Abyssal Azure Galactic Drift
                baseX: -0.16,
                baseY: 0.26,
                radiusRatio: 0.62,
                orbitRadius: 48,
                orbitSpeed: -0.00032,
                pulseSpeed: 0.00055,
                colorInner: 'rgba(56, 189, 248, 0.12)',
                colorMid: 'rgba(14, 165, 233, 0.05)',
                colorOuter: 'rgba(5, 7, 20, 0)'
            }
        ];
    }

    /**
     * Initialize Multi-tier 3D Starfield
     */
    _initStarfield() {
        const profile = this._getDeviceProfile();
        const { maxZ, minZ } = CONFIG.physics;
        const spreadX = this.width * 1.3;
        const spreadY = this.height * 1.3;

        // Layer 1: Distant Twinkling Micro-stars (Stardust)
        this.starsL1 = [];
        for (let i = 0; i < profile.starsLayer1; i++) {
            this.starsL1.push({
                x: (Math.random() - 0.5) * spreadX,
                y: (Math.random() - 0.5) * spreadY,
                z: Math.random() * (maxZ - 700) + 700,
                size: Math.random() * 0.7 + 0.5,
                color: Math.random() > 0.18 ? COSMIC_PALETTE.starIcyBlue : COSMIC_PALETTE.starLavender,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                baseAlpha: Math.random() * 0.4 + 0.35
            });
        }

        // Layer 2: Medium Floating Stars with Corona Halo
        this.starsL2 = [];
        const l2Colors = [
            COSMIC_PALETTE.starCyan,
            COSMIC_PALETTE.starWhite,
            COSMIC_PALETTE.starLavender,
            COSMIC_PALETTE.starGold
        ];
        for (let i = 0; i < profile.starsLayer2; i++) {
            this.starsL2.push({
                x: (Math.random() - 0.5) * spreadX,
                y: (Math.random() - 0.5) * spreadY,
                z: Math.random() * (maxZ - 250) + 250,
                size: Math.random() * 1.2 + 1.2,
                color: l2Colors[Math.floor(Math.random() * l2Colors.length)],
                speedMultiplier: Math.random() * 0.25 + 0.65,
                corona: Math.random() > 0.4
            });
        }

        // Layer 3: Fast Foreground Kinetic Stars (Hyperdrive Streakers)
        this.starsL3 = [];
        for (let i = 0; i < profile.starsLayer3; i++) {
            this.starsL3.push({
                x: (Math.random() - 0.5) * spreadX,
                y: (Math.random() - 0.5) * spreadY,
                z: Math.random() * (maxZ - 100) + 100,
                size: Math.random() * 1.6 + 2.0,
                speedMultiplier: Math.random() * 0.4 + 1.1,
                streakHue: Math.random() > 0.5 ? 'cyan' : 'purple'
            });
        }
    }

    /**
     * Start the Cosmic Universe Animation (Called when search begins)
     */
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentSpeed = CONFIG.physics.cruiseSpeed;
        this.targetSpeed = CONFIG.physics.cruiseSpeed;
        this.pulseSpeed = 0;
        this.lastTime = performance.now();

        if (this.container) {
            this.container.classList.add('active');
            this.container.style.opacity = '1';
            this.container.style.visibility = 'visible';
        }

        this._handleResize();
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = requestAnimationFrame(this._loop);
    }

    /**
     * Accelerate into Warp / Hyperspace Speed or Return to Cruise
     * @param {boolean} isWarping 
     * @param {number} [customSpeed] Optional custom target speed
     */
    setWarp(isWarping = true, customSpeed = null) {
        this.isWarping = !!isWarping;
        if (this.reducedMotion) {
            this.targetSpeed = 0.8;
            return;
        }

        if (this.isWarping) {
            this.targetSpeed = customSpeed || CONFIG.physics.warpSpeed;
        } else {
            this.targetSpeed = CONFIG.physics.cruiseSpeed;
        }
    }

    /**
     * Trigger a Temporary Warp Pulse (e.g. When a batch of 1,000 posts is fetched)
     * @param {number} [intensity=6.5] 
     */
    pulse(intensity = CONFIG.physics.pulseBoost) {
        if (this.reducedMotion) return;
        this.pulseSpeed = Math.min(this.pulseSpeed + intensity, 12);
    }

    /**
     * Decelerate smoothly and fade out canvas (Called when search ends/stops)
     */
    stop() {
        if (!this.isActive) return;
        this.isWarping = false;
        this.targetSpeed = 0;

        if (this.container) {
            this.container.classList.remove('active');
            this.container.style.opacity = '0';
        }

        // Allow smooth deceleration before stopping frame loop
        setTimeout(() => {
            if (!this.container || !this.container.classList.contains('active')) {
                this.isActive = false;
                if (this.animId) {
                    cancelAnimationFrame(this.animId);
                    this.animId = null;
                }
                if (this.container) {
                    this.container.style.visibility = 'hidden';
                }
            }
        }, 650);
    }

    /**
     * Clean up resources and remove listeners
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this._handleResize);
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    /**
     * Main 60 FPS Animation Render Loop
     */
    _loop(now) {
        if (!this.isActive) return;

        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        // Speed physics with smooth exponential damping (lerp)
        const lerpRate = this.targetSpeed > this.currentSpeed 
            ? CONFIG.physics.accelLerp 
            : CONFIG.physics.decelLerp;
        
        // Apply transient pulse decay
        if (this.pulseSpeed > 0.05) {
            this.pulseSpeed *= 0.92;
        } else {
            this.pulseSpeed = 0;
        }

        const effectiveTarget = this.targetSpeed + this.pulseSpeed;
        this.currentSpeed += (effectiveTarget - this.currentSpeed) * lerpRate;

        // Render Cosmic Universe Frame
        this._render(dt);

        this.animId = requestAnimationFrame(this._loop);
    }

    /**
     * Render Pipeline
     */
    _render(dt) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        if (!ctx || w === 0 || h === 0) return;

        // Step 1: Deep Space Void Base
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = COSMIC_PALETTE.void;
        ctx.fillRect(0, 0, w, h);

        // Step 2: Render Volumetric Glowing Nebulae
        this._renderNebulae(ctx, w, h);

        // Step 3: Render 3D Starfield Layers with Warp Streaks
        ctx.globalCompositeOperation = 'screen';
        this._renderLayer1(ctx, dt);
        this._renderLayer2(ctx, dt);
        this._renderLayer3(ctx, dt);

        // Step 4: Cinematic Subtle Center Vignette (Ensures search text crispness)
        this._renderCenterVignette(ctx, w, h);
    }

    /**
     * Render Procedural Galactic Nebulae Clouds
     */
    _renderNebulae(ctx, w, h) {
        ctx.globalCompositeOperation = 'screen';
        const profile = this._getDeviceProfile();
        const minDim = Math.min(w, h);

        for (let i = 0; i < this.nebulae.length; i++) {
            const neb = this.nebulae[i];
            
            // Orbit kinematics
            const orbitAngle = this.time * neb.orbitSpeed * 1000;
            const ox = Math.cos(orbitAngle) * neb.orbitRadius;
            const oy = Math.sin(orbitAngle) * neb.orbitRadius;

            // Center position
            const cx = this.cx + neb.baseX * w + ox;
            const cy = this.cy + neb.baseY * h + oy;

            // Breathing pulsation
            const pulse = Math.sin(this.time * neb.pulseSpeed * 1000) * 0.09;
            const radius = minDim * neb.radiusRatio * (1 + pulse) * profile.nebulaResolution;

            // Radial gradient nebula cloud
            const grad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
            grad.addColorStop(0.0, neb.colorInner);
            grad.addColorStop(0.45, neb.colorMid);
            grad.addColorStop(1.0, neb.colorOuter);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Layer 1: Distant Micro-Stars (Twinkling Stardust)
     */
    _renderLayer1(ctx, dt) {
        const { maxZ, minZ } = CONFIG.physics;
        const f = this.focalLength;
        const speedStep = this.currentSpeed * 0.28 * 60 * dt;
        const spreadX = this.width * 1.3;
        const spreadY = this.height * 1.3;

        for (let i = 0; i < this.starsL1.length; i++) {
            const s = this.starsL1[i];

            s.z -= speedStep;
            if (s.z <= minZ) {
                s.z = maxZ;
                s.x = (Math.random() - 0.5) * spreadX;
                s.y = (Math.random() - 0.5) * spreadY;
            }

            const px = this.cx + (s.x * f) / s.z;
            const py = this.cy + (s.y * f) / s.z;

            if (px < -10 || px > this.width + 10 || py < -10 || py > this.height + 10) {
                continue;
            }

            // Twinkle oscillation
            s.twinklePhase += s.twinkleSpeed;
            const twinkle = Math.sin(s.twinklePhase) * 0.3;
            const alpha = Math.max(0.1, Math.min(1.0, s.baseAlpha + twinkle));

            ctx.fillStyle = s.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(px, py, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    /**
     * Layer 2: Medium Floating Stars with Soft Corona Halos
     */
    _renderLayer2(ctx, dt) {
        const { maxZ, minZ } = CONFIG.physics;
        const f = this.focalLength;
        const speed = this.currentSpeed;
        const spreadX = this.width * 1.3;
        const spreadY = this.height * 1.3;

        for (let i = 0; i < this.starsL2.length; i++) {
            const s = this.starsL2[i];

            s.z -= speed * s.speedMultiplier * 60 * dt;
            if (s.z <= minZ) {
                s.z = maxZ;
                s.x = (Math.random() - 0.5) * spreadX;
                s.y = (Math.random() - 0.5) * spreadY;
            }

            const px = this.cx + (s.x * f) / s.z;
            const py = this.cy + (s.y * f) / s.z;

            if (px < -20 || px > this.width + 20 || py < -20 || py > this.height + 20) {
                continue;
            }

            const depthRatio = 1 - (s.z / maxZ);
            const r = s.size * (0.6 + depthRatio * 0.9);

            // Corona glow
            if (s.corona && depthRatio > 0.35) {
                const glowRadius = r * 3.6;
                const glowGrad = ctx.createRadialGradient(px, py, r * 0.5, px, py, glowRadius);
                glowGrad.addColorStop(0, s.color);
                glowGrad.addColorStop(0.5, 'rgba(62, 230, 196, 0.25)');
                glowGrad.addColorStop(1, 'rgba(62, 230, 196, 0)');

                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core star
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Layer 3: Fast Kinetic Foreground Stars with Hyperspace Streaks
     */
    _renderLayer3(ctx, dt) {
        const { maxZ, minZ } = CONFIG.physics;
        const f = this.focalLength;
        const speed = this.currentSpeed;
        const profile = this._getDeviceProfile();
        const spreadX = this.width * 1.4;
        const spreadY = this.height * 1.4;

        // Tail delta based on warp velocity
        const isStreaking = speed > 3.0 && !this.reducedMotion;
        const tailMultiplier = profile.streakMultiplier * (speed / 7.0);

        for (let i = 0; i < this.starsL3.length; i++) {
            const s = this.starsL3[i];

            s.z -= speed * s.speedMultiplier * 60 * dt;
            if (s.z <= minZ) {
                s.z = maxZ;
                s.x = (Math.random() - 0.5) * spreadX;
                s.y = (Math.random() - 0.5) * spreadY;
            }

            const px = this.cx + (s.x * f) / s.z;
            const py = this.cy + (s.y * f) / s.z;

            if (px < -60 || px > this.width + 60 || py < -60 || py > this.height + 60) {
                continue;
            }

            const depthRatio = 1 - (s.z / maxZ);
            const r = s.size * (0.8 + depthRatio * 1.2);

            if (isStreaking) {
                // Calculate projected streak tail
                const zTail = s.z + (speed * tailMultiplier * s.speedMultiplier);
                const tx = this.cx + (s.x * f) / zTail;
                const ty = this.cy + (s.y * f) / zTail;

                const dx = px - tx;
                const dy = py - ty;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len > 3.0) {
                    const clampedLen = Math.min(len, profile.maxStreakLength);
                    const normFactor = clampedLen / len;
                    const tailEndX = px - dx * normFactor;
                    const tailEndY = py - dy * normFactor;

                    // Linear gradient streak from tail to head
                    const streakGrad = ctx.createLinearGradient(tailEndX, tailEndY, px, py);
                    if (s.streakHue === 'cyan') {
                        streakGrad.addColorStop(0.0, 'rgba(62, 230, 196, 0.0)');
                        streakGrad.addColorStop(0.4, 'rgba(62, 230, 196, 0.35)');
                        streakGrad.addColorStop(0.8, 'rgba(224, 242, 254, 0.75)');
                        streakGrad.addColorStop(1.0, '#FFFFFF');
                    } else {
                        streakGrad.addColorStop(0.0, 'rgba(244, 114, 182, 0.0)');
                        streakGrad.addColorStop(0.4, 'rgba(138, 108, 255, 0.45)');
                        streakGrad.addColorStop(0.8, 'rgba(244, 114, 182, 0.80)');
                        streakGrad.addColorStop(1.0, '#FFFFFF');
                    }

                    ctx.strokeStyle = streakGrad;
                    ctx.lineWidth = Math.min(r * 0.9, 4.0);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(tailEndX, tailEndY);
                    ctx.lineTo(px, py);
                    ctx.stroke();

                    // Brilliant star head
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(px, py, r * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    continue;
                }
            }

            // Normal cruising dot with soft glow halo
            ctx.fillStyle = s.streakHue === 'cyan' ? COSMIC_PALETTE.starCyan : COSMIC_PALETTE.starLavender;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Step 4: Cinematic Radial Vignette
     * Dims edges and brightens galactic depth behind modal
     */
    _renderCenterVignette(ctx, w, h) {
        ctx.globalCompositeOperation = 'multiply';
        const radius = Math.max(w, h) * 0.75;
        const vig = ctx.createRadialGradient(this.cx, this.cy, radius * 0.2, this.cx, this.cy, radius);
        vig.addColorStop(0.0, 'rgba(5, 7, 20, 0.0)');
        vig.addColorStop(0.65, 'rgba(5, 7, 20, 0.3)');
        vig.addColorStop(1.0, 'rgba(3, 5, 15, 0.85)');

        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Singleton instance
export const CosmicUniverse = new CosmicUniverseEngine();

// Window global fallback
if (typeof window !== 'undefined') {
    window.CosmicUniverse = CosmicUniverse;
}

export default CosmicUniverse;
