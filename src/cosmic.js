/**
 * ============================================================================
 * src/cosmic.js — Cosmic Universe Background Engine (AURORA Design System)
 * High-performance 60 FPS 3D Starfield & Procedural Milky Way Galaxy Simulation
 * 
 * Developed for VK Wall Searcher
 * Author: Lead Cosmic Motion Designer (AURORA Design System)
 * ============================================================================
 */

'use strict';

/**
 * Exact Color Palette Specification (AURORA Design System)
 */
export const COSMIC_PALETTE = {
    void: '#050714',                      // Ultra-deep cosmic void base
    voidRgb: [5, 7, 20],
    nebulaCyan: 'rgba(236, 72, 153, ',    // Signature Aurora Cyan (#ec4899)
    nebulaPurple: 'rgba(138, 108, 255, ', // Galactic Violet (#8A6CFF)
    nebulaPink: 'rgba(244, 114, 182, ',   // Electric Magenta (#F472B6)
    nebulaBlue: 'rgba(56, 189, 248, ',    // Deep Galactic Blue (#38BDF8)
    starWhite: '#FFFFFF',
    starIcyBlue: '#E0F2FE',
    starLavender: '#C4B5FD',
    starGold: '#FBBF24',
    starCyan: '#ec4899'
};

/**
 * Device Configuration Presets & Particle Budgets
 */
export const CONFIG = {
    desktop: {
        starsLayer1: 130,      // Distant micro-stars (subtle twinkle stardust)
        starsLayer2: 180,      // Medium floating stars with soft corona
        starsLayer3: 130,      // Fast foreground streak stars
        galaxyDustNodes: 130,  // Milky Way spiral dust clumps & HII star clusters
        maxMeteors: 3,         // Max concurrent shooting stars
        maxSparks: 24,         // Max bolide ionization sparks
        maxStreakLength: 200,
        streakMultiplier: 3.4,
        maxParallaxX: 38,      // Pointer micro-parallax horizontal travel (px)
        maxParallaxY: 24       // Pointer micro-parallax vertical travel (px)
    },
    tablet: {
        starsLayer1: 80,
        starsLayer2: 110,
        starsLayer3: 70,
        galaxyDustNodes: 80,
        maxMeteors: 2,
        maxSparks: 14,
        maxStreakLength: 140,
        streakMultiplier: 2.8,
        maxParallaxX: 22,
        maxParallaxY: 14
    },
    mobile: {
        starsLayer1: 50,
        starsLayer2: 65,
        starsLayer3: 45,
        galaxyDustNodes: 45,
        maxMeteors: 1,
        maxSparks: 8,
        maxStreakLength: 90,
        streakMultiplier: 2.2,
        maxParallaxX: 12,
        maxParallaxY: 8
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
        minZ: 1.0,
        galaxyRotationSpeed: 0.00018,
        galaxyTiltAngle: -0.48, // ~ -27.5 deg diagonal galactic sweep
        galaxySquash: 0.44      // 3D inclination foreshortening (cos of 64 deg)
    }
};

/**
 * Offscreen Canvas Sprite Generator for Zero-Allocation 60 FPS Glow Blitting
 */
function createGlowSprite(colorStops, size = 96) {
    if (typeof document === 'undefined' || !document.createElement) {
        return null;
    }
    try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const half = size / 2;
        const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        for (let i = 0; i < colorStops.length; i++) {
            grad.addColorStop(colorStops[i][0], colorStops[i][1]);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return canvas;
    } catch {
        return null;
    }
}

export class CosmicUniverseEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.animId = null;
        this.isActive = false;
        this.isWarping = false;
        this.reducedMotion = false;

        // Dimensions & Vantage Perspective
        this.width = 0;
        this.height = 0;
        this.cx = 0;
        this.cy = 0;
        this.dpr = 1;
        this.focalLength = 600;

        // Interactive Micro-Parallax
        this.targetParallaxX = 0;
        this.targetParallaxY = 0;
        this.currentParallaxX = 0;
        this.currentParallaxY = 0;

        // Kinematics & Timing
        this.currentSpeed = CONFIG.physics.cruiseSpeed;
        this.targetSpeed = CONFIG.physics.cruiseSpeed;
        this.pulseSpeed = 0;
        this.time = 0;
        this.lastTime = 0;

        // Procedural Milky Way Spiral Galaxy
        this.galaxyAngle = 0;
        this.galaxyDustNodes = [];

        // Volumetric Background Nebulae
        this.nebulae = [];

        // Multi-tier 3D Starfield Layers
        this.starsL1 = [];
        this.starsL2 = [];
        this.starsL3 = [];

        // Shooting Stars & Incandescent Bolides
        this.meteors = [];
        this.sparks = [];
        this.nextMeteorTime = 2.5;

        // Pre-rendered Glow Sprites (GPU Hardware-Blit Cache)
        this.sprites = {
            cyan: null,
            violet: null,
            magenta: null,
            blue: null,
            gold: null,
            white: null
        };

        // Bound Handlers for Clean Memory Management
        this._handleResize = this._handleResize.bind(this);
        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handlePointerLeave = this._handlePointerLeave.bind(this);
        this._loop = this._loop.bind(this);
    }

    /**
     * Initialize the engine with DOM elements and setup lifecycle listeners
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
                if (this.reducedMotion) {
                    this.meteors = [];
                    this.sparks = [];
                    this.targetParallaxX = 0;
                    this.targetParallaxY = 0;
                }
            });
        }

        // Initialize Glow Sprites
        this._initSprites();

        // Register Global Event Listeners
        window.addEventListener('resize', this._handleResize, { passive: true });
        window.addEventListener('mousemove', this._handlePointerMove, { passive: true });
        window.addEventListener('touchmove', this._handlePointerMove, { passive: true });
        window.addEventListener('mouseleave', this._handlePointerLeave, { passive: true });
        window.addEventListener('touchend', this._handlePointerLeave, { passive: true });

        // Resize and build procedural celestial structures
        this._handleResize();
        this._initNebulae();
        this._initSpiralGalaxy();
        this._initStarfield();

        return true;
    }

    /**
     * Build Pre-rendered Radial Glow Sprites for High-Speed GPU Blits
     */
    _initSprites() {
        this.sprites.cyan = createGlowSprite([
            [0.0, 'rgba(236, 72, 153, 0.65)'],
            [0.35, 'rgba(236, 72, 153, 0.28)'],
            [0.70, 'rgba(236, 72, 153, 0.08)'],
            [1.0, 'rgba(236, 72, 153, 0.0)']
        ]);

        this.sprites.violet = createGlowSprite([
            [0.0, 'rgba(138, 108, 255, 0.65)'],
            [0.35, 'rgba(138, 108, 255, 0.28)'],
            [0.70, 'rgba(138, 108, 255, 0.08)'],
            [1.0, 'rgba(138, 108, 255, 0.0)']
        ]);

        this.sprites.magenta = createGlowSprite([
            [0.0, 'rgba(244, 114, 182, 0.60)'],
            [0.35, 'rgba(244, 114, 182, 0.24)'],
            [0.70, 'rgba(244, 114, 182, 0.07)'],
            [1.0, 'rgba(244, 114, 182, 0.0)']
        ]);

        this.sprites.blue = createGlowSprite([
            [0.0, 'rgba(56, 189, 248, 0.60)'],
            [0.35, 'rgba(56, 189, 248, 0.24)'],
            [0.70, 'rgba(56, 189, 248, 0.07)'],
            [1.0, 'rgba(56, 189, 248, 0.0)']
        ]);

        this.sprites.gold = createGlowSprite([
            [0.0, 'rgba(251, 191, 36, 0.75)'],
            [0.30, 'rgba(251, 191, 36, 0.32)'],
            [0.65, 'rgba(251, 191, 36, 0.09)'],
            [1.0, 'rgba(251, 191, 36, 0.0)']
        ]);

        this.sprites.white = createGlowSprite([
            [0.0, 'rgba(255, 255, 255, 0.95)'],
            [0.25, 'rgba(224, 242, 254, 0.65)'],
            [0.60, 'rgba(224, 242, 254, 0.18)'],
            [1.0, 'rgba(224, 242, 254, 0.0)']
        ]);
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
     * Handle pointer interaction for smooth micro-parallax vantage shift
     */
    _handlePointerMove(e) {
        if (this.reducedMotion || !this.isActive) return;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

        const profile = this._getDeviceProfile();
        const halfW = (this.width || window.innerWidth) / 2;
        const halfH = (this.height || window.innerHeight) / 2;

        const nx = Math.max(-1, Math.min(1, (clientX - halfW) / halfW));
        const ny = Math.max(-1, Math.min(1, (clientY - halfH) / halfH));

        this.targetParallaxX = nx * (profile.maxParallaxX || 38);
        this.targetParallaxY = ny * (profile.maxParallaxY || 24);
    }

    /**
     * Handle pointer leaving screen — glides camera vantage back to center
     */
    _handlePointerLeave() {
        this.targetParallaxX = 0;
        this.targetParallaxY = 0;
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
        if (this.galaxyDustNodes.length > 0) {
            this._initSpiralGalaxy();
        }
    }

    /**
     * Initialize 4 Volumetric Procedural Galactic Background Nebulae
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
                colorInner: 'rgba(236, 72, 153, 0.15)',
                colorMid: 'rgba(219, 39, 119, 0.07)',
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
     * Procedurally generate Milky Way Spiral Arms and Galactic Core
     * Uses logarithmic spiral geometry with natural Gaussian dispersion
     */
    _initSpiralGalaxy() {
        const profile = this._getDeviceProfile();
        const count = profile.galaxyDustNodes || 130;
        this.galaxyDustNodes = [];

        // 1. Central Core Bulge Nodes (Sagittarius A* starlight concentration)
        const coreCount = Math.floor(count * 0.22);
        for (let i = 0; i < coreCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const rNorm = Math.pow(Math.random(), 1.6) * 0.20 + 0.015;
            const u = Math.cos(angle) * rNorm;
            const v = Math.sin(angle) * rNorm;
            const isCluster = Math.random() < 0.35;
            const spriteType = Math.random() < 0.45 ? 'gold' : (Math.random() < 0.75 ? 'white' : 'cyan');

            this.galaxyDustNodes.push({
                u,
                v,
                radiusRatio: Math.random() * 0.045 + 0.035,
                spriteType,
                alpha: Math.random() * 0.35 + 0.35,
                pulseSpeed: Math.random() * 0.0012 + 0.0006,
                pulsePhase: Math.random() * Math.PI * 2,
                isStarCluster: isCluster
            });
        }

        // 2. Two Primary Symmetrical Spiral Arms (Perseus & Scutum-Centaurus)
        const armCount = 2;
        const armNodes = Math.floor((count - coreCount) * 0.72 / armCount);
        for (let arm = 0; arm < armCount; arm++) {
            const baseAngle = arm * Math.PI; // 180 degrees symmetrical separation
            for (let i = 0; i < armNodes; i++) {
                const t = (i + 1) / armNodes;
                const rNorm = 0.14 + 0.86 * Math.pow(t, 0.82);
                const theta = baseAngle + 3.10 * Math.pow(t, 0.76);

                // Natural flaring Gaussian dispersion along outer spiral reach
                const radialScatter = (Math.random() - 0.5) * 0.16 * (0.25 + 0.75 * t);
                const angularScatter = (Math.random() - 0.5) * 0.32 * (0.25 + 0.75 * t);

                const rFinal = Math.max(0.06, rNorm + radialScatter);
                const thFinal = theta + angularScatter;

                const u = rFinal * Math.cos(thFinal);
                const v = rFinal * Math.sin(thFinal);

                // Chromatic stellar evolution across radial arm zones
                let spriteType;
                if (t < 0.28) {
                    spriteType = Math.random() < 0.60 ? 'cyan' : 'gold';
                } else if (t < 0.68) {
                    spriteType = Math.random() < 0.55 ? 'cyan' : 'blue';
                } else {
                    spriteType = Math.random() < 0.52 ? 'violet' : 'magenta';
                }

                const isCluster = Math.random() < 0.24;
                this.galaxyDustNodes.push({
                    u,
                    v,
                    radiusRatio: Math.random() * 0.05 + 0.035 + (0.03 * t),
                    spriteType,
                    alpha: Math.random() * 0.28 + 0.22,
                    pulseSpeed: Math.random() * 0.0015 + 0.0007,
                    pulsePhase: Math.random() * Math.PI * 2,
                    isStarCluster: isCluster
                });
            }
        }

        // 3. Secondary Minor Spur Lanes (Orion-Cygnus spur bridge aesthetic)
        const spurNodes = count - this.galaxyDustNodes.length;
        for (let i = 0; i < spurNodes; i++) {
            const spurArm = i % 2;
            const baseAngle = (spurArm * Math.PI) + (Math.PI * 0.5); // 90 deg offset
            const t = Math.random() * 0.5 + 0.25;
            const rNorm = 0.22 + 0.58 * t;
            const theta = baseAngle + 2.2 * Math.pow(t, 0.85) + (Math.random() - 0.5) * 0.35;
            const u = rNorm * Math.cos(theta);
            const v = rNorm * Math.sin(theta);
            const spriteType = Math.random() < 0.4 ? 'blue' : (Math.random() < 0.7 ? 'violet' : 'cyan');

            this.galaxyDustNodes.push({
                u,
                v,
                radiusRatio: Math.random() * 0.04 + 0.03,
                spriteType,
                alpha: Math.random() * 0.20 + 0.12,
                pulseSpeed: Math.random() * 0.001 + 0.0005,
                pulsePhase: Math.random() * Math.PI * 2,
                isStarCluster: Math.random() < 0.15
            });
        }
    }

    /**
     * Initialize Multi-tier 3D Starfield
     */
    _initStarfield() {
        const profile = this._getDeviceProfile();
        const { maxZ } = CONFIG.physics;
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

        // Layer 3: Fast Foreground Kinetic Stars (Hyperdrive Streakers & DoF Particles)
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
        this.targetParallaxX = 0;
        this.targetParallaxY = 0;
        this.currentParallaxX = 0;
        this.currentParallaxY = 0;
        this.lastTime = performance.now();
        this.nextMeteorTime = this.time + 1.8 + Math.random() * 2.0;

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
     * Also spawns an incandescent bolide crossing the screen as visual feedback
     * @param {number} [intensity=6.5] 
     */
    pulse(intensity = CONFIG.physics.pulseBoost) {
        if (this.reducedMotion) return;
        this.pulseSpeed = Math.min(this.pulseSpeed + intensity, 12);
        // Spawn an incandescent shooting star (bolide) crossing the sky
        this._spawnMeteor(true);
    }

    /**
     * Decelerate smoothly and fade out canvas (Called when search ends/stops)
     */
    stop() {
        if (!this.isActive) return;
        this.isWarping = false;
        this.targetSpeed = 0;
        this.targetParallaxX = 0;
        this.targetParallaxY = 0;

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
                this.meteors = [];
                this.sparks = [];
            }
        }, 650);
    }

    /**
     * Clean up resources, cancel loop, and remove listeners
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this._handleResize);
        window.removeEventListener('mousemove', this._handlePointerMove);
        window.removeEventListener('touchmove', this._handlePointerMove);
        window.removeEventListener('mouseleave', this._handlePointerLeave);
        window.removeEventListener('touchend', this._handlePointerLeave);

        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
        this.meteors = [];
        this.sparks = [];
        this.galaxyDustNodes = [];
    }

    /**
     * Spawn an Incandescent Shooting Star / Meteor / Bolide
     * @param {boolean} [forceBolide=false]
     */
    _spawnMeteor(forceBolide = false) {
        if (this.reducedMotion) return;
        const profile = this._getDeviceProfile();
        const limit = (profile.maxMeteors || 3) + (forceBolide ? 1 : 0);
        if (this.meteors.length >= limit) return;

        const w = this.width;
        const h = this.height;
        if (w <= 0 || h <= 0) return;

        const isBolide = forceBolide || (Math.random() < 0.28);
        const fromLeft = Math.random() > 0.45;

        // Start position near screen edge
        let startX, startY;
        if (fromLeft) {
            startX = Math.random() * (w * 0.55) - 40;
            startY = -30 - Math.random() * 60;
        } else {
            startX = w * 0.45 + Math.random() * (w * 0.6) + 20;
            startY = -30 - Math.random() * 60;
        }

        // Angle: 28 to 52 deg down-right, or 128 to 152 deg down-left
        const angleDeg = fromLeft 
            ? (28 + Math.random() * 24) 
            : (128 + Math.random() * 24);
        const angleRad = angleDeg * (Math.PI / 180);

        const speed = isBolide 
            ? (1200 + Math.random() * 500) 
            : (1600 + Math.random() * 700);

        const duration = isBolide 
            ? (0.85 + Math.random() * 0.35) 
            : (0.55 + Math.random() * 0.30);

        const trailLength = isBolide 
            ? (240 + Math.random() * 80) 
            : (150 + Math.random() * 60);

        const headRadius = isBolide 
            ? (3.8 + Math.random() * 1.4) 
            : (2.0 + Math.random() * 0.8);

        this.meteors.push({
            x: startX,
            y: startY,
            startX,
            startY,
            vx: Math.cos(angleRad) * speed,
            vy: Math.sin(angleRad) * speed,
            angleRad,
            speed,
            duration,
            age: 0,
            trailLength,
            headRadius,
            isBolide,
            flarePeak: 0.45 + Math.random() * 0.15
        });
    }

    /**
     * Update active shooting stars and residual ionization sparks
     */
    _updateMeteors(dt) {
        if (this.reducedMotion) {
            this.meteors = [];
            this.sparks = [];
            return;
        }

        const profile = this._getDeviceProfile();

        // Check timer for automatic spawning
        if (this.time >= this.nextMeteorTime && this.meteors.length < (profile.maxMeteors || 3)) {
            this._spawnMeteor(false);
            this.nextMeteorTime = this.time + (Math.random() * 2.8 + 2.2);
        }

        // Update active meteors
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.age += dt;

            if (m.age >= m.duration) {
                this.meteors.splice(i, 1);
                continue;
            }

            m.x += m.vx * dt;
            m.y += m.vy * dt;

            // Bolide mid-flight flare and spark emission
            if (m.isBolide) {
                const progress = m.age / m.duration;
                const distToPeak = Math.abs(progress - m.flarePeak);
                if (distToPeak < 0.18 && Math.random() < 0.45 && this.sparks.length < (profile.maxSparks || 24)) {
                    // Emit residual ionization sparks
                    const spreadAngle = m.angleRad + Math.PI + (Math.random() - 0.5) * 0.8;
                    const sparkSpeed = Math.random() * 120 + 30;
                    this.sparks.push({
                        x: m.x + (Math.random() - 0.5) * 6,
                        y: m.y + (Math.random() - 0.5) * 6,
                        vx: Math.cos(spreadAngle) * sparkSpeed + m.vx * 0.08,
                        vy: Math.sin(spreadAngle) * sparkSpeed + m.vy * 0.08,
                        alpha: 0.95,
                        decayRate: Math.random() * 1.6 + 1.2,
                        size: Math.random() * 1.5 + 1.0,
                        color: Math.random() < 0.65 ? COSMIC_PALETTE.starCyan : COSMIC_PALETTE.starGold
                    });
                }
            }
        }

        // Update residual sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const sp = this.sparks[i];
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.alpha -= sp.decayRate * dt;

            if (sp.alpha <= 0.02) {
                this.sparks.splice(i, 1);
            }
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

        // Interactive micro-parallax lerping
        this.currentParallaxX += (this.targetParallaxX - this.currentParallaxX) * 0.055;
        this.currentParallaxY += (this.targetParallaxY - this.currentParallaxY) * 0.055;
        this.cx = (this.width / 2) + this.currentParallaxX;
        this.cy = (this.height / 2) + this.currentParallaxY;

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

        // Procedural Milky Way galactic revolution
        const rotSpeed = CONFIG.physics.galaxyRotationSpeed + (this.currentSpeed / 20) * 0.0003;
        this.galaxyAngle += rotSpeed * 60 * dt;

        // Update shooting stars & ionization sparks
        this._updateMeteors(dt);

        // Render Cosmic Universe Frame
        this._render(dt);

        this.animId = requestAnimationFrame(this._loop);
    }

    /**
     * Multi-stage Render Pipeline
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

        // Step 2: Render Volumetric Background Nebulae
        this._renderNebulae(ctx, w, h);

        // Step 3: Render Procedural Milky Way Galactic Spiral Dust Arms & Core
        this._renderSpiralGalaxy(ctx, w, h);

        // Step 4: Render 3D Starfield Layers with Warp Streaks & Optical Depth-of-Field
        ctx.globalCompositeOperation = 'screen';
        this._renderLayer1(ctx, dt);
        this._renderLayer2(ctx, dt);
        this._renderLayer3(ctx, dt);

        // Step 5: Render Incandescent Shooting Stars & Bolide Ionization Sparks
        this._renderMeteors(ctx);

        // Step 6: Cinematic Center Vignette (Ensures search text crispness and contrast)
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

            // Center position with subtle parallax offset
            const cx = (w / 2) + neb.baseX * w + ox + this.currentParallaxX * 0.25;
            const cy = (h / 2) + neb.baseY * h + oy + this.currentParallaxY * 0.25;

            // Breathing pulsation
            const pulse = Math.sin(this.time * neb.pulseSpeed * 1000) * 0.09;
            const radius = minDim * neb.radiusRatio * (1 + pulse) * (profile.nebulaResolution || 1.0);

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
     * Render Procedural Milky Way Spiral Dust Arms and Supermassive Core
     * Additive blit using pre-rendered glow sprites for 60 FPS performance
     */
    _renderSpiralGalaxy(ctx, w, h) {
        if (!ctx || this.galaxyDustNodes.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Vanishing center with subtle micro-parallax shift
        const gx = (w / 2) + this.currentParallaxX * 0.38;
        const gy = (h / 2) + this.currentParallaxY * 0.38;
        const galaxyRadius = Math.min(w, h) * 0.65;

        ctx.translate(gx, gy);
        ctx.rotate(CONFIG.physics.galaxyTiltAngle); // Majestic diagonal tilt (~ -27.5 deg)
        ctx.scale(1.0, CONFIG.physics.galaxySquash); // 3D oblique inclination foreshortening
        ctx.rotate(this.galaxyAngle); // Slow galactic revolution

        // 1. Render all spiral arm dust nodes
        const nodeCount = this.galaxyDustNodes.length;
        for (let i = 0; i < nodeCount; i++) {
            const node = this.galaxyDustNodes[i];
            const px = node.u * galaxyRadius;
            const py = node.v * galaxyRadius;

            // Dynamic breathing pulsation
            const pulse = 1 + Math.sin(this.time * node.pulseSpeed * 1000 + node.pulsePhase) * 0.14;
            const size = node.radiusRatio * galaxyRadius * pulse;

            const sprite = this.sprites[node.spriteType] || this.sprites.cyan;
            if (sprite) {
                ctx.globalAlpha = node.alpha;
                ctx.drawImage(sprite, px - size, py - size, size * 2, size * 2);
            }

            // Incandescent stellar cluster node
            if (node.isStarCluster) {
                ctx.globalAlpha = Math.min(1.0, node.alpha * 1.8);
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(px, py, Math.max(0.8, size * 0.08), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 2. Render Supermassive Galactic Core (Sagittarius A* starlight)
        const corePulse = 1 + Math.sin(this.time * 2.2) * 0.07 + (this.pulseSpeed / 12) * 0.30;
        
        // Outer galactic core corona (Deep Blue / Violet)
        const rCorona = galaxyRadius * 0.32 * corePulse;
        if (this.sprites.blue) {
            ctx.globalAlpha = 0.45;
            ctx.drawImage(this.sprites.blue, -rCorona, -rCorona, rCorona * 2, rCorona * 2);
        }
        if (this.sprites.violet) {
            ctx.globalAlpha = 0.40;
            ctx.drawImage(this.sprites.violet, -rCorona * 0.85, -rCorona * 0.85, rCorona * 1.7, rCorona * 1.7);
        }

        // Mid galactic bulge (Aurora Cyan)
        const rMid = galaxyRadius * 0.18 * corePulse;
        if (this.sprites.cyan) {
            ctx.globalAlpha = 0.60;
            ctx.drawImage(this.sprites.cyan, -rMid, -rMid, rMid * 2, rMid * 2);
        }

        // Inner incandescent starlight core (Amber Gold & White starlight)
        const rInner = galaxyRadius * 0.09 * corePulse;
        if (this.sprites.gold) {
            ctx.globalAlpha = 0.80;
            ctx.drawImage(this.sprites.gold, -rInner, -rInner, rInner * 2, rInner * 2);
        }
        if (this.sprites.white) {
            ctx.globalAlpha = 0.95;
            const rWhite = rInner * 0.55;
            ctx.drawImage(this.sprites.white, -rWhite, -rWhite, rWhite * 2, rWhite * 2);
        }

        ctx.restore();
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
                glowGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
                glowGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

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
     * Layer 3: Fast Foreground Kinetic Stars with Hyperspace Streaks & Optical Depth-of-Field
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

            // Realistic Optical Depth-of-Field Defocusing for near particles (z < 260)
            const isNearDoF = s.z < 260;
            if (isNearDoF && !isStreaking) {
                const dofFactor = (260 - s.z) / 260;
                const bokehRadius = r * (1.0 + dofFactor * 2.8);
                const bokehAlpha = Math.max(0.08, (1.0 - dofFactor * 0.60) * 0.75);

                const sprite = s.streakHue === 'cyan' ? this.sprites.cyan : this.sprites.magenta;
                if (sprite) {
                    ctx.globalAlpha = bokehAlpha;
                    ctx.drawImage(sprite, px - bokehRadius, py - bokehRadius, bokehRadius * 2, bokehRadius * 2);
                    ctx.globalAlpha = 1.0;
                }
                continue;
            }

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
                        streakGrad.addColorStop(0.0, 'rgba(236, 72, 153, 0.0)');
                        streakGrad.addColorStop(0.4, 'rgba(236, 72, 153, 0.35)');
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
     * Render Incandescent Shooting Stars / Meteors & Ionization Sparks
     */
    _renderMeteors(ctx) {
        if (this.meteors.length === 0 && this.sparks.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 1. Render Residual Ionization Sparks
        for (let i = 0; i < this.sparks.length; i++) {
            const sp = this.sparks[i];
            ctx.globalAlpha = Math.max(0, Math.min(1, sp.alpha));
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Render Active Meteors & Bolides
        for (let i = 0; i < this.meteors.length; i++) {
            const m = this.meteors[i];
            const progress = m.age / m.duration;

            // Tail length grows upon entry and shrinks at tail-end
            const entryFactor = Math.min(1.0, m.age / 0.12);
            const exitFactor = Math.min(1.0, (m.duration - m.age) / 0.15);
            const effTailLen = m.trailLength * entryFactor * exitFactor;

            // Tail coordinates
            const dirX = Math.cos(m.angleRad);
            const dirY = Math.sin(m.angleRad);
            const tailX = m.x - dirX * effTailLen;
            const tailY = m.y - dirY * effTailLen;

            // Bolide flare intensity multiplier
            let flareAlpha = 1.0;
            let flareRadius = m.headRadius;
            if (m.isBolide) {
                const flareCurve = Math.sin(progress * Math.PI);
                flareAlpha = 0.8 + flareCurve * 0.4;
                flareRadius = m.headRadius * (1 + flareCurve * 0.7);
            }

            // Tapered radiant linear gradient trail
            const trailGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
            if (m.isBolide) {
                trailGrad.addColorStop(0.0, 'rgba(236, 72, 153, 0.0)');
                trailGrad.addColorStop(0.35, `rgba(56, 189, 248, ${0.45 * flareAlpha})`);
                trailGrad.addColorStop(0.70, `rgba(138, 108, 255, ${0.75 * flareAlpha})`);
                trailGrad.addColorStop(0.90, `rgba(236, 72, 153, ${0.95 * flareAlpha})`);
                trailGrad.addColorStop(1.0, '#FFFFFF');
            } else {
                trailGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0.0)');
                trailGrad.addColorStop(0.40, 'rgba(56, 189, 248, 0.40)');
                trailGrad.addColorStop(0.80, 'rgba(236, 72, 153, 0.85)');
                trailGrad.addColorStop(1.0, '#FFFFFF');
            }

            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = Math.min(flareRadius * 1.3, 5.5);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();

            // Incandescent Starlight Bloom Halo around Head
            const haloRadius = flareRadius * 3.8;
            const haloSprite = m.isBolide ? this.sprites.gold : this.sprites.cyan;
            if (haloSprite) {
                ctx.globalAlpha = 0.75 * flareAlpha;
                ctx.drawImage(haloSprite, m.x - haloRadius, m.y - haloRadius, haloRadius * 2, haloRadius * 2);
            }

            // Ultra-brilliant White Core Head
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(m.x, m.y, flareRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Cinematic Center Radial Vignette
     * Dims edges and brightens galactic depth behind modal
     */
    _renderCenterVignette(ctx, w, h) {
        ctx.globalCompositeOperation = 'multiply';
        const radius = Math.max(w, h) * 0.78;
        const vig = ctx.createRadialGradient(this.cx, this.cy, radius * 0.18, this.cx, this.cy, radius);
        vig.addColorStop(0.0, 'rgba(5, 7, 20, 0.0)');
        vig.addColorStop(0.62, 'rgba(5, 7, 20, 0.28)');
        vig.addColorStop(1.0, 'rgba(3, 5, 15, 0.88)');

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
