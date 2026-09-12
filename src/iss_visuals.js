/**
 * src/iss_visuals.js — Photorealistic International Space Station (МКС / ISS) Visual Engine
 * =========================================================================================
 * Role: Lead 3D & Aerospace Visual Designer for AURORA AAA Space Experience
 *
 * Core Capabilities:
 * - High-fidelity 3D/Canvas procedural rendering of the International Space Station
 * - Physical solar array wings (SAW) with silicon-blue cells, bronze/gold traces & specular glints
 * - Integrated Truss Structure (ITS) with aerospace aluminum lattice & titanium nodes
 * - Clean high-albedo white radiators with accordion pleat shadowing
 * - Pressurized modules with multi-layer insulation (MLI) blankets (aluminized mylar, gold kapton)
 * - Cupola nadir dome with Earth atmospheric blue limb reflection
 * - Docked spacecraft: SpaceX Crew Dragon (matte white + black trunk) and Soyuz MS (tri-module)
 * - Aerospace navigation strobes: Port red (#ef4444), Starboard green (#22c55e), Dual-pulse white beacons (#ffffff)
 * - Cybernetic holographic HUD telemetry reticle, tracking, and Expedition 71 telemetry card
 * =========================================================================================
 */
import { SpaceAudio } from './space_audio.js?v=3.9.7';

export class ISSVisualEngine {
    constructor() {
        this.isInitialized = false;
        this.tick = 0;
        this.lastTime = performance.now();

        // Real Orbital Telemetry Data (Expedition 71)
        this.telemetry = {
            designation: 'ISS (ZARYA)',
            noradId: 25544,
            intlDes: '1998-067A',
            expedition: 'Expedition 71',
            commander: 'Oleg Kononenko (ROS) / Sunita Williams (NASA)',
            crewCount: 7,
            altitudeKm: 418.2,
            apogeeKm: 423.8,
            perigeeKm: 412.5,
            velocityKms: 7.66,
            velocityKmh: 27576,
            orbitalPeriodMin: 92.9,
            inclinationDeg: 51.64,
            betaAngleDeg: 28.4,
            solarGenerationKw: 120.4,
            cabinPressureKpa: 101.3,
            o2Percentage: 21.0,
            co2Mmhg: 2.8,
            massKg: 450000,
            wingspanMeters: 108.5,
            lengthMeters: 72.8,
            dockedCrafts: [
                { name: 'Crew Dragon Freedom (Crew-8/9)', port: 'Harmony IDA-2 (Forward)', status: 'BERTHED_SECURE' },
                { name: 'Soyuz MS-25', port: 'Prichal Nadir Dock', status: 'BERTHED_SECURE' },
                { name: 'Progress MS-27', port: 'Zvezda Aft Dock', status: 'BERTHED_SECURE' }
            ],
            commLink: 'TDRS-12 KU-BAND LOCKED (300 Mbps)',
            daylightPhase: 'DAYLIGHT (+68% Solar Flux)'
        };

        // Celestial / Spatial Coordinates relative to observer in Space3D
        // Orbiting around Earth in the cosmic skybox
        this.orbitalParams = {
            baseYaw: 22.0,      // Position in azimuth (degrees)
            basePitch: -32.0,   // Situated above the Earth horizon (pitch)
            orbitSpeed: 0.00045,// Orbital angular drift speed
            orbitAngle: 0.42,   // Current phase in orbit
            distance: 980,      // Spatial distance in engine units
            scale: 1.45,        // Rendering scale multiplier
            rotationY: 0.35,    // ISS yaw rotation
            rotationP: 0.15,    // ISS pitch
            rotationR: -0.22    // ISS roll
        };

        // SARJ (Solar Alpha Rotary Joint) and BAPTA (Beta Gimbal) tracking
        this.solarJointAngles = {
            sarjPort: 0,
            sarjStarboard: 0,
            radiatorAngle: 0
        };

        // Screen-space projected bounding box & reticle interaction state
        this.screenProjection = {
            x: 0,
            y: 0,
            radius: 40,
            visible: false,
            depth: 1000
        };

        // Interaction State
        this.isHovered = false;
        this.isTargetLocked = false;
        this.hudCardElement = null;
        this.reticleElement = null;

        // Texture Cache Canvases
        this.textures = {
            sawPort: null,
            sawStarboard: null,
            trussSegment: null,
            radiatorPanel: null,
            mliDestiny: null,
            mliZvezda: null,
            mliGoldKapton: null,
            cupolaDome: null,
            crewDragon: null,
            soyuzMs: null
        };

        // Strobe Timing State
        this.strobeCycle = 0; // 0 to 1200 ms cycle
    }

    /**
     * Initializes procedural textures and HUD overlays
     */
    init(spaceEngine = null) {
        if (this.isInitialized) return;
        this.spaceEngine = spaceEngine;

        this.generateProceduralTextures();
        this.mountHudElements();
        this.setupInteractionListeners();

        this.isInitialized = true;
        console.log('[ISSVisuals] Lead 3D Designer: ISS Visual Engine & Cybernetic HUD Initialized.');
    }

    /**
     * Pre-generates high-resolution procedural textures using dedicated 2D canvases
     */
    generateProceduralTextures() {
        this.textures.sawPort = this.createSawTexture(false);
        this.textures.sawStarboard = this.createSawTexture(true);
        this.textures.trussSegment = this.createTrussTexture();
        this.textures.radiatorPanel = this.createRadiatorTexture();
        this.textures.mliDestiny = this.createMliTexture('mylar');
        this.textures.mliZvezda = this.createMliTexture('russian');
        this.textures.mliGoldKapton = this.createMliTexture('gold');
        this.textures.cupolaDome = this.createCupolaTexture();
        this.textures.crewDragon = this.createCrewDragonTexture();
        this.textures.soyuzMs = this.createSoyuzTexture();
    }

    /**
     * 1. Procedural Texture: Solar Array Wings (SAW)
     * Deep silicon-blue cells (#0a2540 / #103b68) with bronze/gold (#d97706 / #b45309) grid traces
     */
    createSawTexture(isStarboard = false) {
        const w = 256;
        const h = 512;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        // Silicon wafer base substrate
        const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
        bgGrad.addColorStop(0, '#041324');
        bgGrad.addColorStop(0.15, '#0a2540');
        bgGrad.addColorStop(0.5, '#103b68');
        bgGrad.addColorStop(0.85, '#0a2540');
        bgGrad.addColorStop(1, '#041324');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Individual Photovoltaic Wafer Cells (8 columns x 32 rows)
        const cols = 8;
        const rows = 32;
        const cellW = (w - 32) / cols;
        const cellH = (h - 24) / rows;
        const offsetX = 16;
        const offsetY = 12;

        for (let r = 0; r < rows; r++) {
            for (let col = 0; col < cols; col++) {
                const cx = offsetX + col * cellW;
                const cy = offsetY + r * cellH;

                // Subtle wafer antireflective micro-tint variation
                const tint = (Math.sin(r * 3.7 + col * 5.1) * 0.5 + 0.5);
                const blueVal = Math.floor(65 + tint * 35);
                const darkVal = Math.floor(18 + tint * 18);
                ctx.fillStyle = `rgb(${darkVal}, ${darkVal + 18}, ${blueVal})`;
                ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);

                // Wafer border (micro gap between cells)
                ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);

                // Microscopic silver/copper collector fingers
                ctx.strokeStyle = 'rgba(203, 213, 225, 0.12)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(cx + 2, cy + cellH * 0.33);
                ctx.lineTo(cx + cellW - 2, cy + cellH * 0.33);
                ctx.moveTo(cx + 2, cy + cellH * 0.66);
                ctx.lineTo(cx + cellW - 2, cy + cellH * 0.66);
                ctx.stroke();
            }
        }

        // Heavy Bronze/Gold Electrical Busbars & Power Traces (#d97706 / #b45309)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
        ctx.shadowBlur = 3;

        // Vertical main copper bus conductors
        for (let i = 1; i < cols; i += 2) {
            const bx = offsetX + i * cellW;
            ctx.beginPath();
            ctx.moveTo(bx, offsetY);
            ctx.lineTo(bx, h - offsetY);
            ctx.stroke();

            // Solder pads and diode junctions
            for (let r = 0; r < rows; r += 4) {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(bx - 2, offsetY + r * cellH + cellH * 0.5 - 2, 4, 4);
            }
        }
        ctx.shadowBlur = 0;

        // Outer Structural Blanket Edge Rails (Polyimide Kapton amber borders)
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, 10, h);
        ctx.fillRect(w - 10, 0, 10, h);
        ctx.fillRect(0, 0, w, 8);
        ctx.fillRect(0, h - 8, w, 8);

        // Central Deployment Mast Shadow & Structural Lattice
        const mastX = w / 2;
        const mastW = 16;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(mastX - mastW / 2, 0, mastW, h);

        // Mast triangular cross-bracing
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let y = 0; y < h; y += 24) {
            ctx.moveTo(mastX - mastW / 2, y);
            ctx.lineTo(mastX + mastW / 2, y + 24);
            ctx.moveTo(mastX + mastW / 2, y);
            ctx.lineTo(mastX - mastW / 2, y + 24);
        }
        ctx.stroke();

        // Tension Cables (High strength gold/stainless steel wires)
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(mastX - 4, 0);
        ctx.lineTo(mastX - 4, h);
        ctx.moveTo(mastX + 4, 0);
        ctx.lineTo(mastX + 4, h);
        ctx.stroke();

        // iROSA (Roll-Out Solar Array) modernization overlay (central high-efficiency strip)
        const iRosaGrad = ctx.createLinearGradient(0, 0, w, 0);
        iRosaGrad.addColorStop(0, 'rgba(30, 64, 175, 0.25)');
        iRosaGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
        iRosaGrad.addColorStop(1, 'rgba(30, 64, 175, 0.25)');
        ctx.fillStyle = iRosaGrad;
        ctx.fillRect(mastX - 36, h * 0.2, 72, h * 0.6);

        return c;
    }

    /**
     * 2. Procedural Texture: Integrated Truss Structure (ITS)
     * Metallic aerospace aluminum (#64748b / #94a3b8) with triangulated cross-struts
     */
    createTrussTexture() {
        const w = 512;
        const h = 128;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        // Dark internal mechanical bay & utility lines
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Internal ammonia cooling lines & electrical cable harness
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.4);
        ctx.lineTo(w, h * 0.4);
        ctx.moveTo(0, h * 0.6);
        ctx.lineTo(w, h * 0.6);
        ctx.stroke();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w, h * 0.5);
        ctx.stroke();

        // Aerospace Aluminum Longeron Rails (top & bottom structural box beams)
        const longeronGrad = ctx.createLinearGradient(0, 0, 0, 16);
        longeronGrad.addColorStop(0, '#94a3b8');
        longeronGrad.addColorStop(0.5, '#64748b');
        longeronGrad.addColorStop(1, '#475569');

        ctx.fillStyle = longeronGrad;
        ctx.fillRect(0, 0, w, 14);
        ctx.fillRect(0, h - 14, w, 14);

        // Specular edge highlights on aluminum beams
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(w, 1);
        ctx.moveTo(0, h - 13);
        ctx.lineTo(w, h - 13);
        ctx.stroke();

        // Triangulated Lattice Struts (K-truss / Warren truss)
        const segmentW = 48;
        const count = Math.ceil(w / segmentW);

        for (let i = 0; i < count; i++) {
            const x1 = i * segmentW;
            const x2 = x1 + segmentW;

            // Titanium nodes at intersections
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(x1, 14, 5, 0, Math.PI * 2);
            ctx.arc(x1, h - 14, 5, 0, Math.PI * 2);
            ctx.fill();

            // Diagonal aluminum struts
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(x1, 14);
            ctx.lineTo(x2, h - 14);
            ctx.moveTo(x2, 14);
            ctx.lineTo(x1, h - 14);
            ctx.stroke();

            // Diagonal strut metallic core highlight
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x1 + 1, 14);
            ctx.lineTo(x2 - 1, h - 14);
            ctx.stroke();

            // Vertical reinforcement bulkhead
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, 12);
            ctx.lineTo(x1, h - 12);
            ctx.stroke();

            // Yellow EVA Handrails for spacewalking astronauts (#eab308)
            ctx.fillStyle = '#eab308';
            ctx.fillRect(x1 + 8, 4, 18, 3);
            ctx.fillRect(x1 + 8, h - 7, 18, 3);
        }

        return c;
    }

    /**
     * 3. Procedural Texture: Thermal Radiator Panels
     * High-albedo white (#f8fafc / #e2e8f0) with accordion pleat shadows
     */
    createRadiatorTexture() {
        const w = 256;
        const h = 384;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        // High-albedo thermal white coating base
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);

        // Accordion Pleat Panels (Deployable zigzag folding thermal radiators)
        const pleatCount = 24;
        const pleatH = h / pleatCount;

        for (let i = 0; i < pleatCount; i++) {
            const y = i * pleatH;

            // Alternating shadow and light facets of the pleats
            const isFoldForward = i % 2 === 0;
            const pleatGrad = ctx.createLinearGradient(0, y, 0, y + pleatH);

            if (isFoldForward) {
                pleatGrad.addColorStop(0, '#ffffff');
                pleatGrad.addColorStop(0.8, '#f1f5f9');
                pleatGrad.addColorStop(1, '#e2e8f0');
            } else {
                pleatGrad.addColorStop(0, '#cbd5e1');
                pleatGrad.addColorStop(0.4, '#94a3b8');
                pleatGrad.addColorStop(1, '#64748b');
            }

            ctx.fillStyle = pleatGrad;
            ctx.fillRect(6, y, w - 12, pleatH);

            // Crease shadow line
            ctx.strokeStyle = isFoldForward ? 'rgba(255,255,255,0.9)' : 'rgba(30, 41, 59, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(6, y);
            ctx.lineTo(w - 6, y);
            ctx.stroke();
        }

        // Central Ammonia Fluid Manifold Loop Pipes
        const midX = w / 2;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(midX - 4, 0, 8, h);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(midX - 2, 0);
        ctx.lineTo(midX - 2, h);
        ctx.stroke();

        // Edge Structural Framing & Hinge Points
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 0, 8, h);
        ctx.fillRect(w - 8, 0, 8, h);
        ctx.fillRect(0, 0, w, 6);
        ctx.fillRect(0, h - 6, w, 6);

        return c;
    }

    /**
     * 4. Procedural Texture: Pressurized Modules with Multi-Layer Insulation (MLI)
     * Aluminized Mylar, Beta cloth, and Gold Kapton foil blankets
     */
    createMliTexture(type = 'mylar') {
        const w = 256;
        const h = 256;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        if (type === 'gold') {
            // Gold Kapton foil blanket (Columbus, Kibo, Airlock thermal protection)
            const kGrad = ctx.createLinearGradient(0, 0, w, h);
            kGrad.addColorStop(0, '#b45309');
            kGrad.addColorStop(0.25, '#d97706');
            kGrad.addColorStop(0.5, '#f59e0b');
            kGrad.addColorStop(0.75, '#fbbf24');
            kGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = kGrad;
            ctx.fillRect(0, 0, w, h);

            // Kapton crinkle pattern (crinkled metallized polyimide sheets)
            for (let i = 0; i < 350; i++) {
                const rx = Math.random() * w;
                const ry = Math.random() * h;
                const rw = Math.random() * 26 + 6;
                const rh = Math.random() * 12 + 3;
                const angle = (Math.random() - 0.5) * 0.8;

                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(angle);
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 240, 138, 0.35)' : 'rgba(120, 53, 15, 0.4)';
                ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
                ctx.restore();
            }

            // Blanket stitching seams & snap buttons
            const seamStep = 32;
            ctx.strokeStyle = 'rgba(120, 53, 15, 0.7)';
            ctx.lineWidth = 1;
            for (let y = 0; y < h; y += seamStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
                for (let x = 0; x < w; x += 16) {
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
        } else if (type === 'russian') {
            // Russian Segment (Zvezda / Zarya) MLI: Dark olive-grey beta cloth
            const rGrad = ctx.createLinearGradient(0, 0, w, 0);
            rGrad.addColorStop(0, '#334155');
            rGrad.addColorStop(0.5, '#475569');
            rGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = rGrad;
            ctx.fillRect(0, 0, w, h);

            // Thermal blanket quilting grids
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = 1;
            const sz = 24;
            for (let x = 0; x < w; x += sz) {
                for (let y = 0; y < h; y += sz) {
                    ctx.strokeRect(x, y, sz, sz);
                    // Central button indentation
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
                    ctx.fillRect(x + sz / 2 - 1, y + sz / 2 - 1, 2, 2);
                }
            }
        } else {
            // US Orbital Segment (Destiny, Unity, Harmony): Silvery Aluminized Mylar / Beta Cloth
            const mGrad = ctx.createLinearGradient(0, 0, w, 0);
            mGrad.addColorStop(0, '#cbd5e1');
            mGrad.addColorStop(0.3, '#f1f5f9');
            mGrad.addColorStop(0.7, '#e2e8f0');
            mGrad.addColorStop(1, '#94a3b8');
            ctx.fillStyle = mGrad;
            ctx.fillRect(0, 0, w, h);

            // Cylindrical ring segment ribs
            const ringCount = 8;
            const ringW = w / ringCount;
            for (let i = 0; i < ringCount; i++) {
                const rx = i * ringW;
                ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.1)';
                ctx.fillRect(rx, 0, ringW, h);

                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, h);
                ctx.stroke();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(rx + 1, 0);
                ctx.lineTo(rx + 1, h);
                ctx.stroke();
            }

            // High-visibility yellow astronaut EVA handrails (#eab308)
            for (let y = 30; y < h; y += 60) {
                ctx.fillStyle = '#eab308';
                ctx.fillRect(w * 0.35, y, 32, 4);
                ctx.fillRect(w * 0.65, y, 32, 4);
            }
        }

        return c;
    }

    /**
     * 5. Procedural Texture: Cupola Observation Module
     * 7-window observation dome reflecting Earth's blue light
     */
    createCupolaTexture() {
        const size = 128;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        // Outer circular structure
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 4;

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 6 trapezoidal perimeter windows + 1 central circular circular viewport
        // Windows reflect Earth's deep sapphire & cyan atmosphere (#0284c7 / #38bdf8)
        const windowGrad = ctx.createRadialGradient(cx, cy - 10, 4, cx, cy, r * 0.85);
        windowGrad.addColorStop(0, '#38bdf8');
        windowGrad.addColorStop(0.4, '#0284c7');
        windowGrad.addColorStop(0.8, '#0369a1');
        windowGrad.addColorStop(1, '#0c4a6e');

        // Central circular window (80 cm diameter in real life)
        ctx.fillStyle = windowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Earth limb curved specular glare across glass
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.32, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();

        // 6 surrounding radial windows
        for (let i = 0; i < 6; i++) {
            const a1 = (i * Math.PI) / 3 + 0.12;
            const a2 = ((i + 1) * Math.PI) / 3 - 0.12;
            ctx.fillStyle = windowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.85, a1, a2);
            ctx.arc(cx, cy, r * 0.46, a2, a1, true);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        return c;
    }

    /**
     * 6. Procedural Texture: Crew Dragon Spacecraft (SpaceX)
     * Matte white capsule with black aerodynamic trunk & solar cells
     */
    createCrewDragonTexture() {
        const w = 160;
        const h = 240;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        // Capsule nose & cabin (Matte white aerodynamic cone)
        const capGrad = ctx.createLinearGradient(0, 0, w, 0);
        capGrad.addColorStop(0, '#cbd5e1');
        capGrad.addColorStop(0.4, '#f8fafc');
        capGrad.addColorStop(0.7, '#f1f5f9');
        capGrad.addColorStop(1, '#94a3b8');

        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.moveTo(w / 2, 8);
        ctx.bezierCurveTo(w * 0.85, 45, w * 0.95, 100, w * 0.92, 120);
        ctx.lineTo(w * 0.08, 120);
        ctx.bezierCurveTo(w * 0.05, 100, w * 0.15, 45, w / 2, 8);
        ctx.fill();

        // SuperDraco thruster pods (4 sets of dual thrusters)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w * 0.14, 85, 12, 16);
        ctx.fillRect(w * 0.86 - 12, 85, 12, 16);

        // Trunk (Cylindrical unpressurized cargo bay with half-wrap solar cells)
        const trunkGrad = ctx.createLinearGradient(0, 120, w, 120);
        trunkGrad.addColorStop(0, '#020617');
        trunkGrad.addColorStop(0.5, '#0f172a');
        trunkGrad.addColorStop(1, '#020617');
        ctx.fillStyle = trunkGrad;
        ctx.fillRect(w * 0.1, 120, w * 0.8, 100);

        // Trunk integrated solar array cells (deep navy blue with cell grids)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(w * 0.22, 128, w * 0.56, 84);

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 0.8;
        for (let y = 136; y < 210; y += 12) {
            ctx.beginPath();
            ctx.moveTo(w * 0.22, y);
            ctx.lineTo(w * 0.78, y);
            ctx.stroke();
        }

        // Aerodynamic Trunk Fins
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.moveTo(w * 0.1, 140);
        ctx.lineTo(2, 220);
        ctx.lineTo(w * 0.1, 220);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w * 0.9, 140);
        ctx.lineTo(w - 2, 220);
        ctx.lineTo(w * 0.9, 220);
        ctx.fill();

        return c;
    }

    /**
     * 7. Procedural Texture: Soyuz MS Spacecraft (Roscosmos)
     * Orbital sphere (BO), Descent module (SA), Instrument cylinder (PAO) & twin solar wings
     */
    createSoyuzTexture() {
        const w = 220;
        const h = 220;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        const cx = w / 2;
        const cy = h / 2;

        // Solar Array Wings (Twin wings extending left and right)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(10, cy - 14, 60, 28);
        ctx.fillRect(w - 70, cy - 14, 60, 28);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, cy - 14, 60, 28);
        ctx.strokeRect(w - 70, cy - 14, 60, 28);

        // Solar cells grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 0.6;
        for (let x = 22; x < 70; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, cy - 14);
            ctx.lineTo(x, cy + 14);
            ctx.stroke();
        }
        for (let x = w - 58; x < w - 10; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, cy - 14);
            ctx.lineTo(x, cy + 14);
            ctx.stroke();
        }

        // Instrument-Propulsion Module (PAO - Cylinder)
        const paoGrad = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0);
        paoGrad.addColorStop(0, '#334155');
        paoGrad.addColorStop(0.5, '#64748b');
        paoGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = paoGrad;
        ctx.fillRect(cx - 24, cy - 10, 48, 55);

        // Descent Module (SA - Headlight / conical reentry capsule)
        const saGrad = ctx.createRadialGradient(cx, cy - 25, 2, cx, cy - 25, 20);
        saGrad.addColorStop(0, '#475569');
        saGrad.addColorStop(0.7, '#334155');
        saGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = saGrad;
        ctx.beginPath();
        ctx.arc(cx, cy - 22, 18, 0, Math.PI * 2);
        ctx.fill();

        // Orbital Module (BO - Spherical habitation/docking module)
        const boGrad = ctx.createRadialGradient(cx - 4, cy - 50, 4, cx, cy - 50, 16);
        boGrad.addColorStop(0, '#15803d'); // Olive thermal blanket
        boGrad.addColorStop(0.6, '#166534');
        boGrad.addColorStop(1, '#14532d');
        ctx.fillStyle = boGrad;
        ctx.beginPath();
        ctx.arc(cx, cy - 52, 15, 0, Math.PI * 2);
        ctx.fill();

        // SSVP Docking Probe at forward tip
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 67);
        ctx.lineTo(cx, cy - 78);
        ctx.stroke();

        return c;
    }

    /**
     * Mounts cybernetic HUD elements in DOM
     */
    mountHudElements() {
        const viewport = document.getElementById('space-3d-viewport') || document.body;

        // 1. Holographic Target Reticle Container
        let reticle = document.getElementById('iss-hud-reticle');
        if (!reticle) {
            reticle = document.createElement('div');
            reticle.id = 'iss-hud-reticle';
            reticle.className = 'iss-hud-reticle hidden';
            reticle.innerHTML = `
                <div class="reticle-bracket bracket-tl"></div>
                <div class="reticle-bracket bracket-tr"></div>
                <div class="reticle-bracket bracket-bl"></div>
                <div class="reticle-bracket bracket-br"></div>
                <div class="reticle-compass-ring"></div>
                <div class="reticle-laser-scan"></div>
                <div class="reticle-crosshair"></div>
                <div class="reticle-lead-vector">
                    <span class="vector-arrow">▲</span>
                    <span class="vector-label">V_ORB 7.66 KM/S</span>
                </div>
                <div class="reticle-tag">
                    <span class="tag-pulse"></span>
                    <span class="tag-title">ISS // EXP-71</span>
                    <span class="tag-range">418.2 KM</span>
                </div>
            `;
            viewport.appendChild(reticle);
        }
        this.reticleElement = reticle;

        // 2. Holographic Cybernetic Telemetry Card
        let card = document.getElementById('iss-telemetry-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'iss-telemetry-card';
            card.className = 'iss-telemetry-card hidden';
            card.innerHTML = `
                <div class="iss-card-header">
                    <div class="iss-card-badge">
                        <span class="material-symbols-outlined iss-badge-icon">satellite_alt</span>
                        <div class="iss-badge-meta">
                            <span class="iss-badge-title">МКС / ISS ORBITAL HUD</span>
                            <span class="iss-badge-sub">EXPEDITION 71 • NORAD #25544 • FLIGHT DAY 9390</span>
                        </div>
                    </div>
                    <button type="button" class="iss-card-close-btn" id="iss-card-close-btn" aria-label="Закрыть">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div class="iss-card-live-bar">
                    <div class="live-indicator"><span class="live-dot"></span> LIVE TELEMETRY STREAM</div>
                    <div class="live-lock">COMM: TDRS-12 KU-BAND • 300 Mbps</div>
                </div>

                <div class="iss-card-grid">
                    <div class="iss-tele-metric">
                        <div class="metric-label">ВЫСОТА ОРБИТЫ (ALT)</div>
                        <div class="metric-value">418.2 <span class="metric-unit">км</span></div>
                        <div class="metric-sub">Апогей: 423.8 км • Перигей: 412.5 км</div>
                    </div>

                    <div class="iss-tele-metric">
                        <div class="metric-label">ОРБИТАЛЬНАЯ СКОРОСТЬ</div>
                        <div class="metric-value">7.66 <span class="metric-unit">км/с</span></div>
                        <div class="metric-sub">27,576 км/ч • Мах 22.3</div>
                    </div>

                    <div class="iss-tele-metric">
                        <div class="metric-label">ПЕРИОД ОБРАЩЕНИЯ</div>
                        <div class="metric-value">92.9 <span class="metric-unit">мин</span></div>
                        <div class="metric-sub">15.5 витков в сутки вокруг Земли</div>
                    </div>

                    <div class="iss-tele-metric">
                        <div class="metric-label">НАКЛОНЕНИЕ ОРБИТЫ</div>
                        <div class="metric-value">51.64<span class="metric-unit">°</span></div>
                        <div class="metric-sub">Угол β: +28.4° (Оптимальный поток)</div>
                    </div>
                </div>

                <div class="iss-card-systems">
                    <div class="sys-item">
                        <div class="sys-hdr">
                            <span>ГЕНЕРАЦИЯ СОЛНЕЧНЫХ БАТАРЕЙ (SAW + iROSA)</span>
                            <span class="sys-val">120.4 кВт</span>
                        </div>
                        <div class="sys-progress"><div class="sys-bar" style="width: 88%"></div></div>
                    </div>

                    <div class="sys-item">
                        <div class="sys-hdr">
                            <span>АТМОСФЕРА МОДУЛЕЙ (USOS & РОС)</span>
                            <span class="sys-val">101.3 кПа • 21% O₂</span>
                        </div>
                        <div class="sys-progress"><div class="sys-bar bar-green" style="width: 99%"></div></div>
                    </div>
                </div>

                <div class="iss-card-docked">
                    <div class="docked-title">ПРИСТЫКОВАННЫЕ КОРАБЛИ (CREW & CARGO):</div>
                    <div class="docked-list">
                        <div class="docked-chip chip-spacex">
                            <span class="chip-dot"></span>
                            <span class="chip-name">Crew Dragon Freedom</span>
                            <span class="chip-port">Гармония IDA-2</span>
                        </div>
                        <div class="docked-chip chip-soyuz">
                            <span class="chip-dot"></span>
                            <span class="chip-name">Союз МС-25</span>
                            <span class="chip-port">Причал (РОС)</span>
                        </div>
                        <div class="docked-chip chip-cargo">
                            <span class="chip-dot"></span>
                            <span class="chip-name">Прогресс МС-27</span>
                            <span class="chip-port">Звезда (Корма)</span>
                        </div>
                    </div>
                </div>

                <div class="iss-card-footer">
                    <button type="button" class="iss-action-btn btn-lock" id="iss-btn-track-toggle">
                        <span class="material-symbols-outlined">track_changes</span>
                        <span id="iss-btn-track-label">ЗАХВАТ ЦЕЛИ</span>
                    </button>
                    <button type="button" class="iss-action-btn btn-view" id="iss-btn-reset-cam">
                        <span class="material-symbols-outlined">visibility</span>
                        <span>НАВЕСТИ КАМЕРУ</span>
                    </button>
                </div>
            `;
            viewport.appendChild(card);
        }
        this.hudCardElement = card;
    }

    /**
     * Interactivity: Mouse hovering, clicking, tracking lock
     */
    setupInteractionListeners() {
        const viewport = document.getElementById('space-3d-viewport') || window;

        viewport.addEventListener('pointermove', (e) => {
            if (!this.screenProjection.visible) {
                if (this.isHovered) {
                    this.isHovered = false;
                    this.updateReticleVisual();
                }
                return;
            }

            const dx = e.clientX - this.screenProjection.x;
            const dy = e.clientY - this.screenProjection.y;
            const dist = Math.hypot(dx, dy);

            const hoverThreshold = Math.max(35, this.screenProjection.radius * 1.3);
            const wasHovered = this.isHovered;
            this.isHovered = dist <= hoverThreshold;

            if (wasHovered !== this.isHovered) {
                if (this.isHovered) SpaceAudio.playIssTelemetrySound();
                this.updateReticleVisual();
            }
        });

        viewport.addEventListener('click', (e) => {
            // Check if user clicked on ISS reticle
            if (this.isHovered && this.screenProjection.visible) {
                SpaceAudio.playIssTelemetrySound();
                this.toggleTargetLock();
            }
        });

        // Close card button
        const closeBtn = document.getElementById('iss-card-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isTargetLocked = false;
                this.updateReticleVisual();
            });
        }

        // Track toggle button inside card
        const trackBtn = document.getElementById('iss-btn-track-toggle');
        if (trackBtn) {
            trackBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTargetLock();
            });
        }

        // Focus camera on ISS button
        const camBtn = document.getElementById('iss-btn-reset-cam');
        if (camBtn) {
            camBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.spaceEngine) {
                    this.spaceEngine.targetYaw = this.orbitalParams.baseYaw;
                    this.spaceEngine.targetPitch = this.orbitalParams.basePitch;
                }
            });
        }
    }

    toggleTargetLock() {
        this.isTargetLocked = !this.isTargetLocked;
        this.updateReticleVisual();
    }

    updateReticleVisual() {
        if (!this.reticleElement || !this.hudCardElement) return;

        const isVisible = this.screenProjection.visible && (this.isHovered || this.isTargetLocked);

        if (isVisible) {
            this.reticleElement.classList.remove('hidden');
            this.reticleElement.style.left = `${this.screenProjection.x}px`;
            this.reticleElement.style.top = `${this.screenProjection.y}px`;

            if (this.isTargetLocked) {
                this.reticleElement.classList.add('locked');
                this.hudCardElement.classList.remove('hidden');

                // Position card adjacent to reticle
                const cardW = 380;
                let cardX = this.screenProjection.x + 80;
                let cardY = this.screenProjection.y - 120;

                // Clamp within viewport
                if (cardX + cardW > window.innerWidth - 20) {
                    cardX = this.screenProjection.x - cardW - 80;
                }
                if (cardY < 60) cardY = 60;
                if (cardY + 450 > window.innerHeight) cardY = window.innerHeight - 470;

                this.hudCardElement.style.left = `${Math.max(16, cardX)}px`;
                this.hudCardElement.style.top = `${Math.max(16, cardY)}px`;

                const label = document.getElementById('iss-btn-track-label');
                if (label) label.textContent = 'СБРОСИТЬ ЗАХВАТ';
            } else {
                this.reticleElement.classList.remove('locked');
                this.hudCardElement.classList.add('hidden');
                const label = document.getElementById('iss-btn-track-label');
                if (label) label.textContent = 'ЗАХВАТ ЦЕЛИ';
            }
        } else {
            this.reticleElement.classList.add('hidden');
            if (!this.isTargetLocked) {
                this.hudCardElement.classList.add('hidden');
            }
        }
    }

    hideOverlays() {
        if (this.reticleElement) this.reticleElement.classList.add('hidden');
        if (this.hudCardElement) this.hudCardElement.classList.add('hidden');
        this.isHovered = false;
        this.isTargetLocked = false;
    }

    /**
     * Updates kinematics & joints
     */
    update(dt = 16.6) {
        this.tick++;
        this.strobeCycle = (this.strobeCycle + dt) % 1200; // 1.2s strobe timing cycle

        // Orbital angular drift around Earth - continuous 360° horizontal orbit around the user
        this.orbitalParams.orbitAngle += this.orbitalParams.orbitSpeed;
        this.orbitalParams.baseYaw = (this.orbitalParams.baseYaw + 0.038) % 360;
        this.orbitalParams.basePitch = -24.0 + Math.sin((this.orbitalParams.baseYaw * Math.PI) / 180 * 2) * 5.2;

        // SARJ rotates to keep panels normal to sun light
        this.solarJointAngles.sarjPort += 0.0012;
        this.solarJointAngles.sarjStarboard += 0.0012;
    }

    /**
     * Main Render Pipeline for Space3D Engine
     * Projects and renders the photorealistic ISS into the cosmic view
     */
    render(ctx, w, h, camYaw, camPitch, zoom) {
        if (!this.isInitialized) this.init();

        this.update(16.6);

        const cx = w / 2;
        const cy = h / 2;
        const fov = 750 * zoom;

        const radCamYaw = (camYaw * Math.PI) / 180;
        const radCamPitch = (camPitch * Math.PI) / 180;

        const cosYaw = Math.cos(radCamYaw);
        const sinYaw = Math.sin(radCamYaw);
        const cosPitch = Math.cos(radCamPitch);
        const sinPitch = Math.sin(radCamPitch);

        // Calculate Station World Position
        const radYaw = (this.orbitalParams.baseYaw * Math.PI) / 180;
        const radPitch = (this.orbitalParams.basePitch * Math.PI) / 180;

        const worldX = Math.cos(radPitch) * Math.sin(radYaw);
        const worldY = Math.sin(radPitch);
        const worldZ = Math.cos(radPitch) * Math.cos(radYaw);

        // Rotate into Camera Space
        const x1 = worldX * cosYaw - worldZ * sinYaw;
        const z1 = worldX * sinYaw + worldZ * cosYaw;
        const y2 = worldY * cosPitch - z1 * sinPitch;
        const z2 = worldY * sinPitch + z1 * cosPitch;

        // Clip if behind camera
        if (z2 <= 0.04) {
            this.screenProjection.visible = false;
            this.updateReticleVisual();
            return;
        }

        const px = cx + (x1 / z2) * fov;
        const py = cy - (y2 / z2) * fov;

        // Station scale based on distance and camera zoom
        const baseSize = 135 * zoom * this.orbitalParams.scale;
        const stationW = baseSize * 1.6;
        const stationH = baseSize * 1.0;

        this.screenProjection.x = px;
        this.screenProjection.y = py;
        this.screenProjection.radius = Math.max(28, baseSize * 0.7);
        this.screenProjection.visible = (px > -stationW && px < w + stationW && py > -stationH && py < h + stationH);
        this.screenProjection.depth = z2;

        if (!this.screenProjection.visible) {
            this.updateReticleVisual();
            return;
        }

        // Render Photorealistic Station Assembly
        ctx.save();
        ctx.translate(px, py);

        // Apply Station Attitude (Yaw / Pitch / Roll)
        const stationRot = Math.sin(this.orbitalParams.orbitAngle * 0.8) * 0.15 - 0.1;
        ctx.rotate(stationRot);

        // 1. Draw Earthshine / Atmospheric Blue Ambient Glow
        const earthGlow = ctx.createRadialGradient(0, 10, baseSize * 0.2, 0, 10, baseSize * 1.2);
        earthGlow.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        earthGlow.addColorStop(0.5, 'rgba(14, 165, 233, 0.04)');
        earthGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = earthGlow;
        ctx.beginPath();
        ctx.arc(0, 10, baseSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Render Integrated Truss Structure (ITS Backbone: S6 -> S0 -> P6)
        this.renderTrussStructure(ctx, baseSize);

        // 3. Render Thermal Radiators (HRS)
        this.renderRadiators(ctx, baseSize);

        // 4. Render Solar Array Wings (SAW - 8 giant wings + iROSA)
        this.renderSolarArrays(ctx, baseSize);

        // 5. Render Pressurized Modules (Destiny, Harmony, Columbus, Kibo, Zvezda, Zarya)
        this.renderPressurizedModules(ctx, baseSize);

        // 6. Render Docked Spacecraft (Crew Dragon & Soyuz MS)
        this.renderDockedSpacecraft(ctx, baseSize);

        // 7. Render Navigation Lighting & Anti-Collision Strobes
        this.renderNavigationStrobes(ctx, baseSize);

        // 8. Solar Specular Glint Flare (when facing Sun)
        this.renderSolarSpecularGlint(ctx, baseSize);

        ctx.restore();

        // Update HUD Reticle tracking position in DOM
        this.updateReticleVisual();
    }

    /**
     * Renders Integrated Truss Structure (ITS)
     */
    renderTrussStructure(ctx, sz) {
        const trussLen = sz * 2.2;
        const trussThick = sz * 0.09;

        // Aluminum backbone shadow
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-trussLen / 2, -trussThick / 2, trussLen, trussThick);

        if (this.textures.trussSegment) {
            // Draw textured truss repeating horizontally
            ctx.drawImage(this.textures.trussSegment, -trussLen / 2, -trussThick / 2, trussLen, trussThick);
        }

        // Central S0 / Z1 truss junction node
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-sz * 0.15, -sz * 0.12, sz * 0.3, sz * 0.24);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(-sz * 0.15, -sz * 0.12, sz * 0.3, sz * 0.24);

        // Canadarm2 (Robotic Arm on Mobile Base)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-sz * 0.05, -sz * 0.12);
        ctx.lineTo(-sz * 0.08, -sz * 0.26);
        ctx.lineTo(-sz * 0.02, -sz * 0.38);
        ctx.stroke();

        // Canadarm LEE (Latching End Effector)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-sz * 0.03, -sz * 0.40, 4, 4);
    }

    /**
     * Renders Heat Rejection Subsystem (HRS) Radiators
     */
    renderRadiators(ctx, sz) {
        if (!this.textures.radiatorPanel) return;

        const radW = sz * 0.28;
        const radH = sz * 0.55;

        // Port Radiator Beam
        ctx.save();
        ctx.translate(-sz * 0.35, -radH * 0.6);
        ctx.rotate(-0.08);
        ctx.drawImage(this.textures.radiatorPanel, 0, 0, radW, radH);
        ctx.restore();

        // Starboard Radiator Beam
        ctx.save();
        ctx.translate(sz * 0.15, -radH * 0.6);
        ctx.rotate(0.08);
        ctx.drawImage(this.textures.radiatorPanel, 0, 0, radW, radH);
        ctx.restore();
    }

    /**
     * Renders 8 Solar Array Wings (SAW) + Modern iROSA
     */
    renderSolarArrays(ctx, sz) {
        const wingW = sz * 0.32;
        const wingH = sz * 0.95;

        // Port Outer Solar Wings (P6 & P4)
        const p6X = -sz * 0.95;
        const p4X = -sz * 0.62;

        this.drawSingleSolarArray(ctx, p6X, -wingH - sz * 0.04, wingW, wingH, false);
        this.drawSingleSolarArray(ctx, p6X, sz * 0.04, wingW, wingH, false);

        this.drawSingleSolarArray(ctx, p4X, -wingH - sz * 0.04, wingW, wingH, false);
        this.drawSingleSolarArray(ctx, p4X, sz * 0.04, wingW, wingH, false);

        // Starboard Outer Solar Wings (S6 & S4)
        const s4X = sz * 0.34;
        const s6X = sz * 0.67;

        this.drawSingleSolarArray(ctx, s4X, -wingH - sz * 0.04, wingW, wingH, true);
        this.drawSingleSolarArray(ctx, s4X, sz * 0.04, wingW, wingH, true);

        this.drawSingleSolarArray(ctx, s6X, -wingH - sz * 0.04, wingW, wingH, true);
        this.drawSingleSolarArray(ctx, s6X, sz * 0.04, wingW, wingH, true);
    }

    drawSingleSolarArray(ctx, x, y, w, h, isStarboard) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);

        // SARJ dynamic tracking tilt
        const tilt = Math.sin(this.solarJointAngles.sarjPort) * 0.12;
        ctx.transform(1, tilt * 0.5, 0, 1, 0, 0);

        const tex = isStarboard ? this.textures.sawStarboard : this.textures.sawPort;
        if (tex) {
            ctx.drawImage(tex, -w / 2, -h / 2, w, h);
        }

        ctx.restore();
    }

    /**
     * Renders Pressurized Modules (Destiny Lab, Harmony, Kibo, Columbus, Cupola, Zvezda, Zarya)
     */
    renderPressurizedModules(ctx, sz) {
        const modH = sz * 0.16;

        ctx.save();
        // US Orbital Segment extends forward (Nadir / Zenith)
        ctx.translate(0, sz * 0.05);

        // 1. Unity Node 1 & Destiny Laboratory (Center)
        if (this.textures.mliDestiny) {
            ctx.drawImage(this.textures.mliDestiny, -sz * 0.12, -modH / 2, sz * 0.28, modH);
        }

        // 2. Harmony Node 2 (Forward Port)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(sz * 0.16, -modH * 0.45, sz * 0.14, modH * 0.9);

        // 3. European Columbus Laboratory (Starboard side of Harmony)
        if (this.textures.mliGoldKapton) {
            ctx.drawImage(this.textures.mliGoldKapton, sz * 0.14, -modH * 1.3, sz * 0.16, modH * 0.85);
        }

        // 4. Japanese Kibo Module (JEM) & Exposed Facility Porch (Port side)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(sz * 0.14, modH * 0.5, sz * 0.22, modH * 0.9);
        // Kibo Exposed Facility Porch
        ctx.fillStyle = '#64748b';
        ctx.fillRect(sz * 0.36, modH * 0.6, sz * 0.12, modH * 0.7);

        // 5. Cupola Observation Dome (Facing Nadir towards Earth)
        if (this.textures.cupolaDome) {
            ctx.drawImage(this.textures.cupolaDome, -sz * 0.02, modH * 0.65, sz * 0.15, sz * 0.15);
        }

        // 6. Russian Orbital Segment (Aft: Zarya FGB & Zvezda Service Module)
        if (this.textures.mliZvezda) {
            ctx.drawImage(this.textures.mliZvezda, -sz * 0.42, -modH * 0.4, sz * 0.30, modH * 0.8);
        }

        // Russian segment small deployable solar wings
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-sz * 0.38, -modH * 1.2, sz * 0.14, modH * 0.75);
        ctx.fillRect(-sz * 0.38, modH * 0.45, sz * 0.14, modH * 0.75);

        ctx.restore();
    }

    /**
     * Renders Docked Spacecraft (Crew Dragon & Soyuz MS)
     */
    renderDockedSpacecraft(ctx, sz) {
        // 1. Crew Dragon Freedom berthed at Harmony Forward IDA-2 Dock
        if (this.textures.crewDragon) {
            ctx.save();
            ctx.translate(sz * 0.32, -sz * 0.02);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(this.textures.crewDragon, -sz * 0.08, -sz * 0.12, sz * 0.16, sz * 0.24);
            ctx.restore();
        }

        // 2. Soyuz MS-25 berthed at Prichal / Rassvet Nadir Dock
        if (this.textures.soyuzMs) {
            ctx.save();
            ctx.translate(-sz * 0.22, sz * 0.14);
            ctx.drawImage(this.textures.soyuzMs, -sz * 0.11, -sz * 0.11, sz * 0.22, sz * 0.22);
            ctx.restore();
        }
    }

    /**
     * Renders Aviation Navigation Lighting & Dual-Pulse Anti-Collision Beacons
     * Port Red (#ef4444), Starboard Green (#22c55e), Anti-collision White (#ffffff)
     */
    renderNavigationStrobes(ctx, sz) {
        const time = this.strobeCycle;

        // Dual-Pulse White Anti-Collision Strobe Timing
        // Pulse 1: 0-60ms | Gap: 60-140ms | Pulse 2: 140-200ms | Rest: 200-1200ms
        const isWhiteFlash = (time >= 0 && time <= 60) || (time >= 140 && time <= 200);

        // 1.0 Hz Nav Strobe (Port Red & Starboard Green)
        // Flash: 0-120ms ON, remainder OFF
        const isNavFlash = (time >= 0 && time <= 120);

        // Port Tip Red Strobe (#ef4444 at P6 truss tip)
        const p6X = -sz * 1.08;
        this.drawStrobeBeacon(ctx, p6X, 0, '#ef4444', 'rgba(239, 68, 68, 0.95)', isNavFlash, 5.0);

        // Starboard Tip Green Strobe (#22c55e at S6 truss tip)
        const s6X = sz * 1.08;
        this.drawStrobeBeacon(ctx, s6X, 0, '#22c55e', 'rgba(34, 197, 94, 0.95)', isNavFlash, 5.0);

        // Central Truss White Anti-Collision Beacon (#ffffff at Z1 truss peak)
        this.drawStrobeBeacon(ctx, 0, -sz * 0.16, '#ffffff', 'rgba(255, 255, 255, 1.0)', isWhiteFlash, 7.5);

        // Russian Segment Zenith White Beacon (#ffffff at Zvezda peak)
        this.drawStrobeBeacon(ctx, -sz * 0.35, -sz * 0.12, '#ffffff', 'rgba(255, 255, 255, 1.0)', isWhiteFlash, 6.0);
    }

    drawStrobeBeacon(ctx, x, y, coreColor, glowColor, isFiring, radius) {
        if (!isFiring) {
            // Passive unlit beacon dome
            ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Intense glowing flash
        const flare = ctx.createRadialGradient(x, y, 1, x, y, radius * 3.5);
        flare.addColorStop(0, '#ffffff');
        flare.addColorStop(0.25, coreColor);
        flare.addColorStop(0.65, glowColor);
        flare.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = flare;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Core hotspot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renders Solar Specular Glint & Optical Lens Flare
     * Triggered by Blinn-Phong alignment with Sun direction
     */
    renderSolarSpecularGlint(ctx, sz) {
        // Specular phase simulation (glints brightly twice per orbit revolution)
        const glintPhase = Math.sin(this.orbitalParams.orbitAngle * 2.0);

        if (glintPhase > 0.85) {
            const intensity = (glintPhase - 0.85) / 0.15; // 0.0 to 1.0
            const glintX = sz * 0.45;
            const glintY = -sz * 0.35;

            ctx.save();
            ctx.translate(glintX, glintY);

            // Anamorphic horizontal lens streak
            const streakGrad = ctx.createLinearGradient(-sz * 0.8 * intensity, 0, sz * 0.8 * intensity, 0);
            streakGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
            streakGrad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.95})`);
            streakGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

            ctx.fillStyle = streakGrad;
            ctx.fillRect(-sz * 0.8 * intensity, -2, sz * 1.6 * intensity, 4);

            // Diamond 4-point solar flare spike
            ctx.strokeStyle = `rgba(254, 240, 138, ${intensity * 0.85})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.4 * intensity, 0);
            ctx.lineTo(sz * 0.4 * intensity, 0);
            ctx.moveTo(0, -sz * 0.4 * intensity);
            ctx.lineTo(0, sz * 0.4 * intensity);
            ctx.stroke();

            // Solar Glint Center Core
            const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 0.25 * intensity);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.9)');
            coreGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
            coreGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, sz * 0.25 * intensity, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}

export const ISSVisuals = new ISSVisualEngine();
export default ISSVisuals;
