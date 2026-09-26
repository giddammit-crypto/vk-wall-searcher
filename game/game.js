/**
 * COSMO: LIBRARY RUNNER & CYBER FIXER — AAA Engine v2.1.0
 * Architecture: Multi-Agent AAA Visual Upgrade
 * - Game Designer: Hit-stop, Hazard Telegraphing, Juicy Feedback
 * - Motion Designer: Squash & Stretch, 360° Flip, Lightning Arcs, Ghost Trails
 * - Artists: Gothic Cathedral Windows, Banker's Lamps with Volumetric Light Cones, Rich Bookshelves
 * - Web Designer: Cyber-Glassmorphism, Micro-telemetry & Vignette
 */

(function() {
    'use strict';

    // --- CONFIGURATION & GAME CONSTANTS ---
    const CONFIG = {
        GRAVITY: 1750,
        MOVE_SPEED: 420,
        BOOST_SPEED: 640,
        JUMP_FORCE: -880,
        DOUBLE_JUMP_FORCE: -760,
        FIX_TIME_REQUIRED: 1.6,
        INVULNERABLE_DURATION: 1.6,
        MAX_PARTICLES: 450,
        HIT_STOP_DURATION: 0.05 // 50ms freeze frame for impactful juice
    };        // Preloaded Photorealistic Game Textures

    const GAME_TEXTURE_URLS = {
        bg: 'assets/bg_library.jpg',
        shelf: 'assets/shelf_photoreal.jpg',
        terminal_broken: 'assets/terminal_broken.jpg',
        terminal_repaired: 'assets/terminal_repaired.jpg',
        floor: 'assets/floor_parquet.jpg'
    };

    const gameTextures = {};
    for (const [key, src] of Object.entries(GAME_TEXTURE_URLS)) {
        const img = new Image();
        img.src = src;
        img.onload = () => { gameTextures[key] = img; };
        img.onerror = () => { gameTextures[key] = null; };
    }

    // Load the supplied mascot art from the shared site assets. Trim transparent
    // padding once so the little robot stays crisp and clearly visible in-game.
    const MASCOT_SPRITES = {
        idle: '../assets/images/mascot_vk/robot_idle.png',
        smile: '../assets/images/mascot_vk/robot_smile.png',
        shock: '../assets/images/mascot_vk/robot_shock.png',
        party: '../assets/images/mascot_vk/robot_party.png',
        cool: '../assets/images/mascot_vk/robot_cool.png',
        idea: '../assets/images/mascot_vk/robot_idea.png',
        read: '../assets/images/mascot_vk/robot_read.png',
        wink: '../assets/images/mascot_vk/robot_wink.png',
        thinking: '../assets/images/mascot_vk/robot_idea.png',
        sad: '../assets/images/mascot_vk/robot_sad.png'
    };
    const MODAL_SPRITES = {
        smile: '../assets/images/mascot_vk/robot_smile.png',
        party: '../assets/images/mascot_vk/robot_party.png',
        shock: '../assets/images/mascot_vk/robot_shock.png',
        read: '../assets/images/mascot_vk/robot_read.png'
    };
    const loadedImages = {};
    const spriteBounds = {};

    const input = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        jumpPressed: false,
        fix: false
    };

    function findMascotBounds(img) {
        const scratch = document.createElement('canvas');
        scratch.width = img.naturalWidth;
        scratch.height = img.naturalHeight;
        const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
        scratchCtx.drawImage(img, 0, 0);

        let pixels;
        try {
            pixels = scratchCtx.getImageData(0, 0, scratch.width, scratch.height).data;
        } catch (_) {
            return { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
        }

        let left = scratch.width;
        let top = scratch.height;
        let right = -1;
        let bottom = -1;
        for (let y = 0; y < scratch.height; y++) {
            for (let x = 0; x < scratch.width; x++) {
                if (pixels[(y * scratch.width + x) * 4 + 3] > 12) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
        }

        if (right < left || bottom < top) {
            return { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
        }

        const padX = Math.ceil((right - left + 1) * 0.045);
        const padY = Math.ceil((bottom - top + 1) * 0.035);
        left = Math.max(0, left - padX);
        top = Math.max(0, top - padY);
        right = Math.min(scratch.width - 1, right + padX);
        bottom = Math.min(scratch.height - 1, bottom + padY);
        return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
    }

    function drawMascotSprite(context, img, x, y, width, height) {
        if (!img || !img.complete || !img.naturalWidth) return false;
        const bounds = spriteBounds[img.src] || { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
        const scale = Math.min(width / bounds.width, height / bounds.height);
        const drawWidth = bounds.width * scale;
        const drawHeight = bounds.height * scale;
        context.drawImage(
            img,
            bounds.x, bounds.y, bounds.width, bounds.height,
            x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight
        );
        return true;
    }

    for (const [key, src] of Object.entries(MASCOT_SPRITES)) {
        const img = new Image();
        img.onload = () => {
            loadedImages[key] = img;
            if (!spriteBounds[img.src]) {
                spriteBounds[img.src] = findMascotBounds(img);
                const bounds = spriteBounds[img.src];
                const crop = document.createElement('canvas');
                crop.width = bounds.width;
                crop.height = bounds.height;
                crop.getContext('2d').drawImage(
                    img,
                    bounds.x, bounds.y, bounds.width, bounds.height,
                    0, 0, bounds.width, bounds.height
                );
                const croppedSprite = crop.toDataURL('image/png');
                if (MODAL_SPRITES[key]) {
                    document.querySelectorAll('.modal-mascot-img[data-mascot="' + key + '"]').forEach((modalImg) => {
                        modalImg.src = croppedSprite;
                    });
                }
            }
        };
        img.onerror = () => { loadedImages[key] = null; };
        img.src = src;
    }

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let pixelRatio = 1;
    let gameState;
    let resizeNeedsHUDRefresh = false;

    function releaseAllInputs() {
        input.left = false;
        input.right = false;
        input.up = false;
        input.down = false;
        input.jump = false;
        input.jumpPressed = false;
        input.fix = false;
        document.querySelectorAll('.touch-btn.active').forEach((button) => button.classList.remove('active'));
    }

    window.addEventListener('blur', releaseAllInputs);
    window.addEventListener('resize', () => {
        updateCanvasResolution();
        if (gameState && gameState.player && gameState.platforms.length > 0) {
            resizeNeedsHUDRefresh = true;
            const floor = gameState.platforms[0];
            floor.y = vh - 55;
            if (gameState.player.grounded) gameState.player.y = floor.y - gameState.player.h;
            for (const platform of gameState.platforms) {
                if (platform.type === 'desk') platform.y = floor.y - 260;
                else if (platform.type === 'shelf') platform.y = floor.y - 500;
            }
            for (const computer of gameState.computers) {
                const platform = gameState.platforms.find((item) => Math.abs(item.x + item.w / 2 - (computer.x + computer.w / 2)) < 1);
                if (platform) computer.y = platform.y;
            }
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            releaseAllInputs();
            if (gameState && gameState.state === STATE_PLAYING) togglePause();
        }
    });

    function updateCanvasResolution() {
        vw = window.innerWidth;
        vh = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(vw * pixelRatio);
        canvas.height = Math.round(vh * pixelRatio);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    updateCanvasResolution();

    function drawMascotSpriteCentered(context, img, centerX, centerY, width, height) {
        return drawMascotSprite(context, img, centerX, centerY, width, height);
    }

    // A held key should not repeat menu actions or repeatedly toggle pause.
    window.addEventListener('keydown', (e) => {
        if (e.repeat && ['KeyP', 'Escape', 'KeyM'].includes(e.code)) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            if (!input.jump) input.jumpPressed = true;
            input.jump = true;
            input.up = true;
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
        if (e.code === 'Space' || e.code === 'KeyE') input.fix = true;
        if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
        if (e.code === 'KeyM') toggleMuteUI();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            input.jump = false;
            input.up = false;
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
        if (e.code === 'Space' || e.code === 'KeyE') input.fix = false;
    });

    // Bind accessible buttons with pointer events, so holding a repair button
    // works reliably on touchscreens, pens, and mouse without synthetic clicks.
    function bindTouch(id, action) {
        const el = document.getElementById(id);
        if (!el) return;

        const start = (e) => {
            e.preventDefault();
            if (e.button !== undefined && e.button !== 0) return;
            el.classList.add('active');
            if (action === 'jump') {
                if (!input.jump) input.jumpPressed = true;
                input.jump = true;
                input.up = true;
            } else {
                input[action] = true;
            }
            if (window.navigator.vibrate) window.navigator.vibrate(12);
            if (el.setPointerCapture && e.pointerId !== undefined) {
                el.setPointerCapture(e.pointerId);
            }
        };

        const end = (e) => {
            if (e) e.preventDefault();
            el.classList.remove('active');
            if (action === 'jump') {
                input.jump = false;
                input.up = false;
            } else {
                input[action] = false;
            }
        };

        el.addEventListener('pointerdown', start);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('lostpointercapture', end);
    }

    bindTouch('btn-left', 'left');
    bindTouch('btn-right', 'right');
    bindTouch('btn-jump', 'jump');
    bindTouch('btn-fix', 'fix');

    // --- PARTICLE ENGINE ---
    class Particle {
        constructor() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.size = 3;
            this.color = '#00F0FF';
            this.alpha = 1;
            this.life = 1;
            this.maxLife = 1;
            this.shape = 'circle';
            this.gravity = 0;
            this.rot = 0;
            this.vRot = 0;
        }

        spawn(x, y, vx, vy, color, life, size = 3, shape = 'circle', gravity = 0) {
            this.active = true;
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.life = life;
            this.maxLife = life;
            this.size = size;
            this.shape = shape;
            this.gravity = gravity;
            this.rot = Math.random() * Math.PI * 2;
            this.vRot = (Math.random() - 0.5) * 8;
            this.alpha = 1;
        }

        update(dt) {
            if (!this.active) return;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vy += this.gravity * dt;
            this.rot += this.vRot * dt;
            this.life -= dt;
            this.alpha = Math.max(0, this.life / this.maxLife);
            if (this.life <= 0) this.active = false;
        }

        draw(ctx, camX, camY) {
            if (!this.active) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.strokeStyle = this.color;

            const drawX = this.x - camX;
            const drawY = this.y - camY;

            if (this.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.shape === 'spark') {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(drawX - this.vx * 0.04, drawY - this.vy * 0.04);
                ctx.lineTo(drawX, drawY);
                ctx.stroke();
            } else if (this.shape === 'star') {
                ctx.translate(drawX, drawY);
                ctx.rotate(this.rot);
                ctx.font = `${Math.floor(this.size * 2)}px sans-serif`;
                ctx.fillText('★', -this.size / 2, this.size / 2);
            } else if (this.shape === 'smoke') {
                ctx.beginPath();
                ctx.arc(drawX, drawY, this.size * (1 + (1 - this.alpha) * 2), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    const particlePool = [];
    for (let i = 0; i < CONFIG.MAX_PARTICLES; i++) {
        particlePool.push(new Particle());
    }

    function emitParticles(x, y, count, color, speed, life, shape = 'circle', gravity = 150) {
        let spawned = 0;
        for (let p of particlePool) {
            if (!p.active) {
                const angle = Math.random() * Math.PI * 2;
                const spd = speed * (0.3 + Math.random() * 0.7);
                p.spawn(
                    x, y,
                    Math.cos(angle) * spd,
                    Math.sin(angle) * spd,
                    color,
                    life * (0.6 + Math.random() * 0.8),
                    2 + Math.random() * 4,
                    shape,
                    gravity
                );
                spawned++;
                if (spawned >= count) break;
            }
        }
    }

    // Atmospheric Floating Dust Motes in Light Beams
    const dustMotes = [];
    for (let i = 0; i < 40; i++) {
        dustMotes.push({
            x: Math.random() * 3000,
            y: Math.random() * 800,
            vx: (Math.random() - 0.5) * 20,
            vy: -10 - Math.random() * 15,
            size: 1 + Math.random() * 2,
            alpha: 0.2 + Math.random() * 0.4
        });
    }

    function updateAndDrawDustMotes(ctx, camX, camY) {
        ctx.save();
        ctx.fillStyle = '#FFEAA7';
        for (let mote of dustMotes) {
            mote.x += mote.vx * 0.016;
            mote.y += mote.vy * 0.016;
            if (mote.y < 50) mote.y = vh - 60;
            if (mote.x < 0) mote.x = gameState.worldWidth;
            if (mote.x > gameState.worldWidth) mote.x = 0;

            const dx = mote.x - camX;
            const dy = mote.y - camY;
            if (dx >= -20 && dx <= vw + 20) {
                ctx.globalAlpha = mote.alpha * (0.6 + Math.sin(Date.now() / 600 + mote.x) * 0.4);
                ctx.beginPath();
                ctx.arc(dx, dy, mote.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    const SCENE_DEPTH = {
        horizonY: 0.18,
        floorFar: 0.5,
        floorNear: 1
    };

    function getDepthPerspective(worldY) {
        const groundY = vh - 55;
        const roomDepth = Math.max(240, Math.min(580, vh * 0.68));
        const ratio = Math.max(0, Math.min(1, (worldY - (groundY - roomDepth)) / roomDepth));
        return SCENE_DEPTH.floorFar + (SCENE_DEPTH.floorNear - SCENE_DEPTH.floorFar) * ratio;
    }

    function drawPerspectiveFloor(ctx, cameraX, groundY) {
        const screenOffsetX = 0;
        const horizonY = vh * SCENE_DEPTH.horizonY;
        const screenW = vw;
        const floorGradient = ctx.createLinearGradient(0, horizonY, 0, groundY + 90);
        floorGradient.addColorStop(0, '#17233a');
        floorGradient.addColorStop(0.48, '#503323');
        floorGradient.addColorStop(1, '#150f12');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(screenOffsetX, horizonY, screenW, groundY + 90 - horizonY);

        ctx.save();
        ctx.beginPath();
        ctx.rect(screenOffsetX, horizonY, screenW, groundY + 90 - horizonY);
        ctx.clip();

        const vanishX = screenOffsetX + screenW * 0.5;
        const offset = ((cameraX * 0.58) % 220 + 220) % 220;
        ctx.lineWidth = 1;
        for (let line = -9; line <= 9; line++) {

            const distantX = vanishX + line * 14;
            const nearbyX = vanishX + line * (screenW / 8) - offset * (line / 9);
            ctx.strokeStyle = line % 3 === 0 ? 'rgba(238, 185, 119, 0.19)' : 'rgba(182, 142, 102, 0.11)';
            ctx.beginPath();
            ctx.moveTo(distantX, horizonY);
            ctx.lineTo(nearbyX, groundY + 100);

            ctx.stroke();
        }

        for (let row = 0; row < 10; row++) {
            const fraction = (row + 1) / 10;
            const y = horizonY + (groundY + 80 - horizonY) * fraction * fraction + ((offset * fraction) % 24);
            ctx.strokeStyle = `rgba(222, 165, 109, ${0.06 + fraction * 0.1})`;
            ctx.beginPath();
            ctx.moveTo(screenOffsetX, y);
            ctx.lineTo(screenOffsetX + screenW, y);
            ctx.stroke();
        }

        const reflectedLight = ctx.createLinearGradient(0, horizonY, 0, groundY);
        reflectedLight.addColorStop(0, 'rgba(43, 131, 157, 0.13)');
        reflectedLight.addColorStop(0.62, 'rgba(219, 154, 86, 0.07)');
        reflectedLight.addColorStop(1, 'rgba(4, 8, 19, 0.22)');
        ctx.fillStyle = reflectedLight;
        ctx.fillRect(screenOffsetX, horizonY, screenW, groundY - horizonY);
        ctx.restore();
    }

    function drawLibraryDepth(ctx, cameraX) {
        const horizonY = vh * SCENE_DEPTH.horizonY;
        const centerX = vw * 0.5;

        const drift = ((cameraX * 0.08) % 560 + 560) % 560;
        const zPlanes = 8;
        const panelColors = ['#4b192b', '#17394c', '#23533d', '#67451d', '#46305d', '#802f32'];

        ctx.save();
        ctx.globalAlpha = 0.86;
        for (let i = 0; i < zPlanes; i++) {
            const t = (i + 1) / zPlanes;
            const y = horizonY + (vh * 0.67 - horizonY) * t * t;
            const halfWidth = vw * (0.13 + 0.37 * t);
            const shelfHeight = Math.max(5, (vh * 0.095) * t);
            const bookScale = 0.32 + t * 0.68;
            const scroll = drift * t;

            for (const side of [-1, 1]) {
                const x = centerX + side * (vw * 0.52 - halfWidth);
                const panelWidth = halfWidth * 0.66;
                const panelGradient = ctx.createLinearGradient(x, y - shelfHeight, x + panelWidth, y);
                panelGradient.addColorStop(0, side < 0 ? '#160f22' : '#201023');
                panelGradient.addColorStop(0.45, side < 0 ? '#594026' : '#473322');
                panelGradient.addColorStop(1, '#100d18');
                ctx.fillStyle = panelGradient;
                ctx.fillRect(x, y - shelfHeight, panelWidth, shelfHeight);

                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y - shelfHeight, panelWidth, shelfHeight);
                ctx.clip();
                const bookW = Math.max(1.5, (4 + t * 10) * bookScale);
                const gap = Math.max(1.5, 2 * bookScale);
                const columns = Math.ceil(panelWidth / (bookW + gap)) + 2;
                for (let book = 0; book < columns; book++) {
                    const bookX = x + book * (bookW + gap) - (scroll % (bookW + gap));
                    const hash = (book * 13 + i * 17 + (side + 1) * 5) % panelColors.length;
                    const color = panelColors[hash];
                    const bookH = shelfHeight * (0.48 + ((book * 19 + i * 7) % 37) / 100);
                    ctx.fillStyle = color;
                    ctx.fillRect(bookX, y - bookH - 2 * bookScale, bookW, bookH);
                    if (t > 0.4 && bookW > 5) {
                        ctx.fillStyle = 'rgba(248,211,133,0.72)';
                        ctx.fillRect(bookX + bookW * 0.18, y - bookH + 5 * bookScale, bookW * 0.64, Math.max(1, bookScale));
                        ctx.fillRect(bookX + bookW * 0.18, y - 4 * bookScale, bookW * 0.64, Math.max(1, bookScale));
                    }
                }
                const shelfEdge = ctx.createLinearGradient(0, y - 2, 0, y + 7 * t);
                shelfEdge.addColorStop(0, '#D1A362');
                shelfEdge.addColorStop(0.24, '#50331f');
                shelfEdge.addColorStop(1, '#120d14');
                ctx.fillStyle = shelfEdge;
                ctx.fillRect(x, y - 3 * t, panelWidth, Math.max(3, 7 * t));
                ctx.restore();
            }
        }

        const overhead = ctx.createLinearGradient(0, 0, 0, horizonY + 90);
        overhead.addColorStop(0, 'rgba(3,6,18,0.98)');
        overhead.addColorStop(0.76, 'rgba(15,20,37,0.77)');
        overhead.addColorStop(1, 'rgba(15,20,37,0)');
        ctx.fillStyle = overhead;
        ctx.fillRect(0, 0, vw, horizonY + 90);
        for (const side of [-1, 1]) {
            const topX = centerX + side * vw * 0.1;
            const bottomX = centerX + side * vw * 0.64;
            const beamGradient = ctx.createLinearGradient(topX, 0, bottomX, vh * 0.77);
            beamGradient.addColorStop(0, 'rgba(209,172,117,0)');
            beamGradient.addColorStop(0.42, 'rgba(119,196,208,0.16)');
            beamGradient.addColorStop(1, 'rgba(209,172,117,0)');
            ctx.fillStyle = beamGradient;
            ctx.beginPath();
            ctx.moveTo(topX - 8, horizonY * 0.2);
            ctx.lineTo(topX + 8, horizonY * 0.2);
            ctx.lineTo(bottomX + vw * 0.08, vh * 0.76);
            ctx.lineTo(bottomX - vw * 0.08, vh * 0.76);
            ctx.closePath();
            ctx.fill();
        }
        const distantGlow = ctx.createRadialGradient(centerX, horizonY, 5, centerX, horizonY, vw * 0.4);
        distantGlow.addColorStop(0, 'rgba(74,190,217,0.24)');
        distantGlow.addColorStop(0.42, 'rgba(74,190,217,0.06)');
        distantGlow.addColorStop(1, 'rgba(74,190,217,0)');
        ctx.fillStyle = distantGlow;
        ctx.fillRect(centerX - vw * 0.42, 0, vw * 0.84, horizonY * 2.1);
        ctx.restore();
    }

    function drawContactShadow(ctx, x, groundY, width, height, alpha = 0.38, tint = '4, 6, 13') {
        const lift = Math.max(0, Math.min(1, height / 280));
        const radius = Math.max(8, width * (0.64 - lift * 0.28));
        const shadowGradient = ctx.createRadialGradient(x, groundY, 1, x, groundY, radius);
        shadowGradient.addColorStop(0, `rgba(${tint}, ${alpha * (1 - lift * 0.55)})`);
        shadowGradient.addColorStop(0.58, `rgba(${tint}, ${alpha * 0.56 * (1 - lift * 0.45)})`);
        shadowGradient.addColorStop(1, `rgba(${tint}, 0)`);
        ctx.save();
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.ellipse(x, groundY, radius, Math.max(4, radius * 0.22), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Floating Text with Spring Easing
    class FloatingText {
        constructor(x, y, text, color = '#FFB347', size = 20) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.size = size;
            this.life = 1.3;
            this.maxLife = 1.3;
            this.scale = 0.5;
        }
        update(dt) {
            this.y -= 50 * dt;
            this.life -= dt;
            // Spring scale up
            if (this.scale < 1.0) {
                this.scale += (1.1 - this.scale) * 16 * dt;
            }
        }
        draw(ctx, camX, camY) {
            const alpha = Math.max(0, this.life / this.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(this.x - camX, this.y - camY);
            ctx.scale(this.scale, this.scale);
            ctx.font = `900 ${this.size}px 'Segoe UI', sans-serif`;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fillText(this.text, 0, 0);
            ctx.restore();
        }
    }
    let floatingTexts = [];

    // --- GAME ENTITIES ---

    // Platform (Desk, Bookshelf, Floor)
    class Platform {
        constructor(x, y, w, h, type = 'shelf') {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.type = type; // 'floor', 'shelf', 'desk'
            this.hasLamp = (type === 'desk');
        }

        draw(ctx, camX, camY) {
            const perspective = this.type === 'floor' ? 1 : getDepthPerspective(this.y);
            const dx = this.x - camX;
            const dy = this.y - camY;
            const depthW = this.w * perspective;
            const depthH = this.h * perspective;
            const depthX = dx + (this.w - depthW) / 2;

            if (this.type === 'floor') {
                const groundY = dy;
                const worldOffset = Math.max(0, Math.floor(camX / 90) - 2);
                drawPerspectiveFloor(ctx, camX, groundY);

                const tex = gameTextures.floor;
                if (tex && tex.complete && tex.naturalWidth > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.24;
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.drawImage(tex, 0, groundY, vw, this.h + 55);
                    ctx.restore();
                }

                ctx.save();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.10)';
                ctx.lineWidth = 1;
                for (let plank = worldOffset; plank * 90 < camX + vw + 180; plank++) {
                    const worldX = plank * 90;
                    const screenX = worldX - camX;
                    ctx.beginPath();
                    ctx.moveTo(vw * 0.5 + (screenX - vw * 0.5) * 0.12, vh * SCENE_DEPTH.horizonY);
                    ctx.lineTo(screenX, groundY + 85);
                    ctx.stroke();
                }
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, groundY);
                ctx.lineTo(vw, groundY);
                ctx.stroke();
                ctx.restore();
            } else if (this.type === 'desk') {
                const slabDepth = Math.max(8, 22 * perspective);
                drawContactShadow(ctx, dx + this.w * 0.5, dy + this.h + slabDepth, this.w * 0.62, 8, 0.3);
                const top = dy - slabDepth;
                const scaledW = depthW;
                const bevel = Math.max(5, 15 * perspective);
                const front = ctx.createLinearGradient(depthX, top, depthX, dy + depthH);
                front.addColorStop(0, '#986438');
                front.addColorStop(0.24, '#51321f');
                front.addColorStop(1, '#211511');
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.55)';
                ctx.shadowBlur = 18 * perspective;
                ctx.fillStyle = front;
                ctx.fillRect(depthX, top, scaledW, depthH + slabDepth);
                ctx.restore();

                // Layered bevels give the desktop a thick, polished cut edge.
                ctx.fillStyle = '#C0894B';
                ctx.beginPath();
                ctx.moveTo(depthX - bevel, top);
                ctx.lineTo(depthX, top - slabDepth);
                ctx.lineTo(depthX + scaledW, top - slabDepth);
                ctx.lineTo(depthX + scaledW + bevel, top);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#81502C';
                ctx.beginPath();
                ctx.moveTo(depthX + scaledW, top - slabDepth);
                ctx.lineTo(depthX + scaledW + bevel, top);
                ctx.lineTo(depthX + scaledW + bevel, top + depthH);
                ctx.lineTo(depthX + scaledW, top + depthH + slabDepth);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#D0A163';
                ctx.fillRect(depthX - bevel, top - 2, scaledW + bevel * 2, 3 * perspective);
                ctx.fillStyle = 'rgba(255,224,172,0.48)';
                ctx.fillRect(depthX + 5, top - slabDepth + 3, Math.max(8, scaledW * 0.44), Math.max(1, perspective * 2));
                const brass = ctx.createLinearGradient(depthX, top, depthX + scaledW, top);
                brass.addColorStop(0, '#785228');
                brass.addColorStop(0.24, '#F3D68B');
                brass.addColorStop(0.5, '#AD792F');
                brass.addColorStop(0.76, '#FFE9AB');
                brass.addColorStop(1, '#79562E');
                ctx.fillStyle = brass;
                ctx.fillRect(depthX - bevel, top - slabDepth + 1, scaledW + bevel * 2, Math.max(1, perspective * 1.3));

                if (perspective > 0.32) {
                    ctx.fillStyle = 'rgba(8, 8, 14, 0.7)';
                    ctx.fillRect(depthX + 16, top + depthH, 10 * perspective, Math.max(0, Math.min(245, vh - 55 - top - depthH)));
                    ctx.fillRect(depthX + scaledW - 24, top + depthH, 10 * perspective, Math.max(0, Math.min(245, vh - 55 - top - depthH)));
                }
                if (this.hasLamp && perspective > 0.35) this.drawBankersLamp(ctx, depthX + 36 * perspective, top - slabDepth);
            } else {
                const ledgeDepth = Math.max(8, 20 * perspective);
                drawContactShadow(ctx, dx + this.w * 0.5, dy + this.h + ledgeDepth, this.w * 0.65, 8, 0.35);
                const top = dy - ledgeDepth;
                const frontGradient = ctx.createLinearGradient(depthX, top, depthX, dy + depthH + ledgeDepth);
                frontGradient.addColorStop(0, '#624029');
                frontGradient.addColorStop(0.35, '#30251f');
                frontGradient.addColorStop(1, '#141525');
                ctx.fillStyle = frontGradient;
                ctx.fillRect(depthX, top, depthW, depthH + ledgeDepth);
                ctx.fillStyle = '#79512e';
                ctx.beginPath();
                ctx.moveTo(depthX, top);
                ctx.lineTo(depthX + 9 * perspective, top - ledgeDepth);
                ctx.lineTo(depthX + depthW + 8 * perspective, top - ledgeDepth);
                ctx.lineTo(depthX + depthW, top);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#40281c';
                ctx.beginPath();
                ctx.moveTo(depthX + depthW, top);
                ctx.lineTo(depthX + depthW + 8 * perspective, top - ledgeDepth);
                ctx.lineTo(depthX + depthW + 8 * perspective, dy + depthH - ledgeDepth);
                ctx.lineTo(depthX + depthW, dy + depthH);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#C59B5A';
                ctx.fillRect(depthX, top - 1, depthW, Math.max(1, perspective * 3));
                if (perspective > 0.28) this.drawShelfBooks(ctx, depthX, top);
            }
        }

        drawBankersLamp(ctx, dx, dy) {
            const lampX = dx + 36;
            const lampY = dy - 32;

            // Brass stand
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(lampX, dy);
            ctx.lineTo(lampX, lampY + 8);
            ctx.arc(lampX + 8, lampY + 8, 8, Math.PI, Math.PI * 1.5);
            ctx.stroke();

            // Green glass shade
            ctx.fillStyle = '#1B7A43';
            ctx.shadowColor = '#2ECC71';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(lampX + 16, lampY, 18, Math.PI * 0.9, Math.PI * 2.1);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Volumetric Warm Light Cone onto Desk (Screen blend mode)
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const coneGrad = ctx.createRadialGradient(lampX + 16, lampY + 8, 3, lampX + 16, lampY + 60, 95);
            coneGrad.addColorStop(0, 'rgba(255, 230, 150, 0.5)');
            coneGrad.addColorStop(0.6, 'rgba(46, 204, 113, 0.25)');
            coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.moveTo(lampX + 8, lampY + 5);
            ctx.lineTo(lampX - 55, dy + 12);
            ctx.lineTo(lampX + 90, dy + 12);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        drawShelfBooks(ctx, dx, dy) {
            const bookPalette = [
                { spine: '#962D3E', foil: '#F4D03F' }, // Crimson + Gold
                { spine: '#2471A3', foil: '#EBF5FB' }, // Royal Blue + Silver
                { spine: '#196F3D', foil: '#F1C40F' }, // Emerald + Gold
                { spine: '#B7950B', foil: '#7D6608' }, // Amber Leather
                { spine: '#6C3483', foil: '#F5EEF8' }, // Purple Velvet
                { spine: '#D35400', foil: '#EDBB99' }  // Terracotta
            ];

            let cx = dx + 12;
            while (cx < dx + this.w - 24) {
                const bW = 10 + ((cx * 5) % 11);
                const bH = 26 + ((cx * 7) % 22);
                const bData = bookPalette[Math.abs(Math.floor(cx * 0.1)) % bookPalette.length];

                const isLeaning = (cx % 90 < 15);
                ctx.save();
                if (isLeaning) {
                    ctx.translate(cx, dy);
                    ctx.rotate(0.12);
                    ctx.translate(-cx, -dy);
                }

                // Spine
                ctx.fillStyle = bData.spine;
                ctx.fillRect(cx, dy - bH, bW, bH);

                // Gold leaf embossing lines
                ctx.fillStyle = bData.foil;
                ctx.fillRect(cx + 2, dy - bH + 5, bW - 4, 2);
                ctx.fillRect(cx + 2, dy - bH + 11, bW - 4, 1.5);
                ctx.fillRect(cx + 2, dy - 6, bW - 4, 1.5);

                ctx.restore();

                cx += bW + 4;
                if (cx % 140 === 0) cx += 22; // gap for bookend
            }
        }
    }

    // Computer Terminal (Photorealistic Monoblock, Holographic States)
    class ComputerTerminal {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.w = 160;
            this.h = 140;
            this.fixed = false;
            this.fixProgress = 0;
            this.glitchTimer = 0;
            this.smokeTimer = 0;
            this.sparkTimer = 0;
            this.playerNearby = false;
        }

        update(dt, player) {
            if (this.fixed) return;

            this.glitchTimer += dt * 9;
            this.smokeTimer -= dt;
            this.sparkTimer -= dt;

            // Smoking vents on broken computer
            if (this.smokeTimer <= 0) {
                emitParticles(this.x + this.w / 2, this.y - this.h * 0.75, 1, 'rgba(180, 190, 210, 0.45)', 30, 0.9, 'smoke', -25);
                this.smokeTimer = 0.35 + Math.random() * 0.35;
            }

            // Dynamic sparks on broken computer
            if (this.sparkTimer <= 0) {
                emitParticles(
                    this.x + this.w * 0.3 + Math.random() * this.w * 0.4,
                    this.y - this.h * 0.6 + Math.random() * 20,
                    2 + Math.floor(Math.random() * 3),
                    '#FF3366',
                    130,
                    0.4,
                    'spark',
                    150
                );
                this.sparkTimer = 0.5 + Math.random() * 0.7;
            }

            // Check repair interaction
            const pCenterX = player.x + player.w / 2;
            const cCenterX = this.x + this.w / 2;
            const distX = Math.abs(pCenterX - cCenterX);
            const distY = Math.abs((player.y + player.h) - this.y);
            const distCenterY = Math.abs((player.y + player.h / 2) - (this.y - this.h / 2));

            const isNear = distX < 190 && (distY < 130 || distCenterY < 130);
            this.playerNearby = isNear;
            this.depthScale = getDepthPerspective(this.y);

            if (isNear && input.fix) {
                player.isFixing = true;
                player.fixTargetX = cCenterX;
                player.fixTargetY = this.y - this.h / 2 * this.depthScale;
                player.facingRight = cCenterX >= pCenterX;

                this.fixProgress += dt / CONFIG.FIX_TIME_REQUIRED;

                if (Math.random() < 0.35) window.gameAudio.playSpark();
                if (Math.random() < 0.25) window.gameAudio.playRepairHum();

                // Rich repair spark fountain at monitor center
                emitParticles(cCenterX, player.fixTargetY, 4, '#00F0FF', 160, 0.5, 'spark', 180);
                emitParticles(cCenterX, player.fixTargetY, 2, '#FFB347', 120, 0.4, 'circle', 130);

                if (this.fixProgress >= 1) {
                    this.completeFix(player);
                }
            } else if (!isNear && this.fixProgress > 0 && this.fixProgress < 1) {
                this.fixProgress = Math.max(0, this.fixProgress - dt * 0.45);
            }
        }

        completeFix(player) {
            if (this.fixed) return;
            this.fixed = true;
            this.fixProgress = 1;
            const perspective = getDepthPerspective(this.y);

            window.gameAudio.playFixComplete();

            // Hit-stop freeze frame for juice!
            gameState.hitStopTimer = CONFIG.HIT_STOP_DURATION;
            triggerScreenShake(12);

            const cCenterX = this.x + this.w / 2;
            const cCenterY = this.y - this.h / 2 * perspective;

            // Celebration sparks & confetti
            emitParticles(cCenterX, cCenterY, 60, '#00FF9D', 260, 1.2, 'circle', 80);
            emitParticles(cCenterX, cCenterY, 40, '#00F0FF', 300, 1.4, 'star', 60);

            const bonus = 150 * gameState.level;
            gameState.score += bonus;
            gameState.gameTime = Math.min(120, gameState.gameTime + 14);
            gameState.fixedCount++;
            player.emotion = 'party';
            player.emotionTimer = 1.1;

            floatingTexts.push(new FloatingText(this.x + 20, this.y - this.h * perspective - 30 * perspective, `+${bonus} ОЧКОВ!`, '#00FF9D', 26 * perspective));
            floatingTexts.push(new FloatingText(this.x + 35, this.y - this.h * perspective - 60 * perspective, `+14 СЕК`, '#FFB347', 18 * perspective));

            checkLevelProgression();
        }

        draw(ctx, camX, camY) {
            const depth = this.depthScale || getDepthPerspective(this.y);
            const dx = this.x - camX + (this.w - this.w * depth) * 0.5;
            const dy = this.y - camY;
            const spriteW = this.w * depth;
            const spriteH = this.h * depth;
            const topY = dy - spriteH;

            drawContactShadow(ctx, dx + spriteW * 0.5, dy + 4, spriteW * 0.85, 15 * depth, 0.42);
            ctx.save();
            const rim = ctx.createLinearGradient(dx, topY, dx + spriteW, topY);
            rim.addColorStop(0, 'rgba(255,213,148,0.35)');
            rim.addColorStop(0.32, 'rgba(255,255,255,0)');
            rim.addColorStop(0.78, 'rgba(80,241,255,0.23)');
            rim.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = rim;
            ctx.shadowColor = this.fixed ? 'rgba(0,255,157,0.52)' : 'rgba(255,51,102,0.42)';
            ctx.shadowBlur = (this.fixed ? 20 : 11) * depth;
            ctx.beginPath();
            ctx.ellipse(dx + spriteW / 2, topY + spriteH * 0.46, spriteW * 0.72, spriteH * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Desk contact soft shadow
            ctx.save();
            ctx.fillStyle = 'rgba(5, 8, 20, 0.55)';
            ctx.beginPath();
            ctx.ellipse(dx + this.w / 2, dy, this.w * 0.42, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const tex = this.fixed ? gameTextures.terminal_repaired : gameTextures.terminal_broken;
            const hasTexture = tex && tex.complete && tex.naturalWidth > 0;

            if (hasTexture) {
                // Draw photo-realistic terminal monoblock (w: 160, h: 140)
                ctx.save();
                if (!this.fixed && Math.sin(this.glitchTimer * 2) > 0.85) {
                    ctx.translate((Math.random() - 0.5) * 3 * depth, 0);
                }
                ctx.drawImage(tex, dx, dy - spriteH, spriteW, spriteH);

                // Broken state: dynamic screen glitch overlay
                if (!this.fixed) {
                    if (Math.sin(this.glitchTimer * 4) > 0.6) {
                        ctx.fillStyle = 'rgba(255, 51, 102, 0.18)';
                        ctx.fillRect(dx + 16 * depth, dy - spriteH + 14 * depth, spriteW - 32 * depth, spriteH - 48 * depth);
                    }
                    const scanY = dy - spriteH + 14 * depth + (Math.floor(this.glitchTimer * 24) % (this.h - 52)) * depth;
                    ctx.fillStyle = 'rgba(255, 51, 102, 0.45)';
                    ctx.fillRect(dx + 16 * depth, scanY, spriteW - 32 * depth, Math.max(1, 2.5 * depth));
                } else {
                    // Repaired state: subtle ambient cyber-glow on screen
                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    const glowGrad = ctx.createRadialGradient(
                        dx + spriteW / 2, dy - spriteH / 2, 10 * depth,
                        dx + spriteW / 2, dy - spriteH / 2, 70 * depth
                    );
                    glowGrad.addColorStop(0, 'rgba(0, 255, 157, 0.22)');
                    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = glowGrad;
                    ctx.fillRect(dx + 10 * depth, dy - spriteH, spriteW - 20 * depth, spriteH - 20 * depth);
                    ctx.restore();
                }
                ctx.restore();
            } else {
                // Keep the hand-drawn emergency fallback aligned with the depth-scaled terminal.
                ctx.save();
                ctx.translate(dx + spriteW / 2, dy - spriteH / 2);
                ctx.scale(depth, depth);
                this.drawProceduralTerminal(ctx, -this.w / 2, this.h / 2);
                ctx.restore();
            }

            // Holographic Progress Bar or Repair Prompt
            if (!this.fixed) {
                if (this.fixProgress > 0) {
                    // Holographic Cyber Progress Bar
                    ctx.save();
                    const barW = (this.w + 20) * depth;
                    const barH = Math.max(5, 12 * depth);
                    const barX = dx - 10 * depth;
                    const barY = dy - spriteH - 28 * depth;

                    // Glowing container
                    ctx.fillStyle = 'rgba(6, 12, 28, 0.88)';
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barW, barH, 4);
                    ctx.fill();

                    // Holographic Gradient fill
                    const progGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
                    progGrad.addColorStop(0, '#FFB347');
                    progGrad.addColorStop(0.5, '#00F0FF');
                    progGrad.addColorStop(1, '#00FF9D');
                    ctx.fillStyle = progGrad;
                    ctx.shadowColor = '#00FF9D';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.roundRect(barX + 2 * depth, barY + 2 * depth, Math.max(1, (barW - 4 * depth) * this.fixProgress), Math.max(1, barH - 4 * depth), Math.max(1, 3 * depth));
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Cyber Frame
                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barW, barH, 4);
                    ctx.stroke();

                    // Percentage text
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`РЕМОНТ: ${Math.floor(this.fixProgress * 100)}%`, barX + barW / 2, barY - 4);
                    ctx.restore();
                } else if (this.playerNearby) {
                    // Only show the repair prompt when the player is in range.
                    ctx.save();
                    const calloutY = dy - spriteH - 16 * depth + Math.sin(Date.now() / 250) * 4 * depth;
                    const isTouch = window.matchMedia('(pointer: coarse)').matches;
                    const prompt = isTouch ? '⚡ КОСМО: ЧИНИТЬ' : '[ ПРОБЕЛ / E ]';
                    const calloutW = Math.max(58, (isTouch ? 138 : 112) * depth);
                    ctx.fillStyle = 'rgba(5, 10, 25, 0.94)';
                    ctx.beginPath();
                    ctx.roundRect(dx + spriteW / 2 - calloutW / 2, calloutY - 17 * depth, calloutW, 25 * depth, 8 * depth);
                    ctx.fill();
                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = '#00F0FF';
                    ctx.shadowBlur = 12;
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    ctx.fillStyle = '#8CFBFF';
                    ctx.font = `bold ${Math.max(7, 11 * depth)}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(prompt, dx + spriteW / 2, calloutY);
                    ctx.restore();
                }
            } else {
                // Repaired floating online badge
                ctx.save();
                ctx.fillStyle = 'rgba(0, 255, 157, 0.85)';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#00FF9D';
                ctx.shadowBlur = 10;
                ctx.fillText('✔ СИСТЕМА АВРОРА ОК', dx + spriteW / 2, dy - spriteH - 12 * depth);
                ctx.restore();
            }
        }

        drawProceduralTerminal(ctx, dx, dy) {
            // Stand
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(dx + this.w / 2 - 14, dy - 28, 28, 28);
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.roundRect(dx + this.w / 2 - 50, dy - 8, 100, 8, 4);
            ctx.fill();

            // Monoblock body
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.roundRect(dx, dy - this.h, this.w, this.h - 24, 10);
            ctx.fill();

            // Screen Bezel Border
            ctx.strokeStyle = this.fixed ? '#00FF9D' : (Math.sin(this.glitchTimer) > 0 ? '#FF3366' : '#991B1B');
            ctx.lineWidth = 2;
            ctx.stroke();

            // Screen
            const scrX = dx + 12;
            const scrY = dy - this.h + 12;
            const scrW = this.w - 24;
            const scrH = this.h - 48;

            if (this.fixed) {
                ctx.fillStyle = '#062817';
                ctx.fillRect(scrX, scrY, scrW, scrH);
                ctx.fillStyle = '#00FF9D';
                ctx.font = 'bold 16px monospace';
                ctx.fillText('ONLINE', scrX + 16, scrY + 30);
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText('✔ АВРОРА БД', scrX + 16, scrY + 54);
            } else {
                ctx.fillStyle = '#26040B';
                ctx.fillRect(scrX, scrY, scrW, scrH);
                ctx.fillStyle = '#FF3366';
                ctx.font = 'bold 15px monospace';
                const glitchStr = (Math.floor(this.glitchTimer) % 2 === 0) ? 'ERR_404' : 'SYSTEM!';
                ctx.fillText(glitchStr, scrX + 16, scrY + 32);
                ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
                const scanlineY = scrY + (Math.floor(this.glitchTimer * 16) % scrH);
                ctx.fillRect(scrX, scanlineY, scrW, 3);
            }
        }
    }

    // Hazard: Book Cart (Self-propelled with steam pipes & spinning wheels)
    class CartHazard {
        constructor(x, y, speed, minX, maxX) {
            this.x = x;
            this.y = y;
            this.w = 58;
            this.h = 44;
            this.vx = speed;
            this.minX = minX;
            this.maxX = maxX;
            this.wheelRot = 0;
        }

        update(dt, player) {
            this.x += this.vx * dt;
            this.wheelRot += (this.vx * dt) * 0.16;

            if (this.x < this.minX) {
                this.x = this.minX;
                this.vx = Math.abs(this.vx);
            } else if (this.x + this.w > this.maxX) {
                this.x = this.maxX - this.w;
                this.vx = -Math.abs(this.vx);
            }

            if (checkAABB(player, this)) {
                player.takeDamage();
            }
        }

        draw(ctx, camX, camY) {
            const depth = getDepthPerspective(this.y + this.h);
            const w = this.w * depth;
            const h = this.h * depth;
            const dx = this.x - camX + (this.w - w) * 0.5;
            const dy = this.y - camY;
            drawContactShadow(ctx, dx + w * 0.5, dy + h - 3, w * 1.3, 14 * depth, 0.44);
            ctx.save();
            ctx.translate(dx + w * 0.5, dy + h * 0.5);
            ctx.scale(depth, depth);
            const cartX = -this.w * 0.5;
            const cartY = -this.h * 0.5;

            // Vintage Metal Cart with Brass Detailing
            ctx.fillStyle = '#475569';
            ctx.fillRect(cartX + 5, cartY + 6, this.w - 10, this.h - 18);
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.strokeRect(cartX + 5, cartY + 6, this.w - 10, this.h - 18);

            // Stacks of Encyclopedias Inside Cart (Wobbling with speed)
            const wobble = Math.sin(Date.now() / 80) * 2;
            ctx.fillStyle = '#B91C1C';
            ctx.fillRect(cartX + 10, cartY + 10 + wobble, 18, 14);
            ctx.fillStyle = '#1D4ED8';
            ctx.fillRect(cartX + 30, cartY + 8 - wobble, 18, 16);

            // Handlebars
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cartX + 5, cartY + 12);
            ctx.lineTo(cartX - 5, cartY - 5);
            ctx.moveTo(cartX + this.w - 5, cartY + 12);
            ctx.lineTo(cartX + this.w + 5, cartY - 5);
            ctx.stroke();

            // Wheels with Brass Spokes
            const drawCartWheel = (wx, wy) => {
                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(this.wheelRot);
                ctx.fillStyle = '#1E293B';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
                ctx.moveTo(0, -7); ctx.lineTo(0, 7);
                ctx.stroke();
                ctx.restore();
            };

            drawCartWheel(cartX + 14, cartY + this.h - 6);
            drawCartWheel(cartX + this.w - 14, cartY + this.h - 6);
            ctx.restore();
        }
    }

    // Hazard: Flying Rogue Drone Book
    class FlyingBookHazard {
        constructor(x, y, speed, rangeY = 65) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;        this.w = 40;
        this.h = 26;
        this.vx = speed;

            this.rangeY = rangeY;
            this.timer = Math.random() * 10;
        }

        update(dt, player) {
            this.timer += dt * 4.5;
            this.x += this.vx * dt;
            this.y = this.startY + Math.sin(this.timer) * this.rangeY;

            if (this.x < 120) this.vx = Math.abs(this.vx);
            if (this.x > gameState.worldWidth - 120) this.vx = -Math.abs(this.vx);

            if (checkAABB(player, this)) {
                player.takeDamage();
            }
        }

        draw(ctx, camX, camY) {
            const depth = getDepthPerspective(this.y + this.h);
            const w = this.w * depth;
            const h = this.h * depth;
            const dx = this.x - camX + (this.w - w) * 0.5;
            const dy = this.y - camY;
            drawContactShadow(ctx, dx + w * 0.5, dy + h, w * 1.5, 12 * depth, 0.34, '27, 17, 42');

            ctx.save();
            ctx.translate(dx + w / 2, dy + h / 2);
            ctx.scale(depth, depth);

            const wingFlap = Math.sin(this.timer * 4) * 0.45;
            ctx.rotate(wingFlap);

            // Ancient Leather Book Cover
            ctx.fillStyle = '#581C87';
            ctx.fillRect(-18, -12, 36, 24);

            // Glowing Parchment Wings
            ctx.fillStyle = '#FEF08A';
            ctx.shadowColor = '#FDE047';
            ctx.shadowBlur = 10;
            ctx.fillRect(-15, -9, 30, 18);
            ctx.shadowBlur = 0;

            // Red Cyber Eye
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Collectible Power-ups
    class PowerupItem {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.w = 34;
            this.h = 34;
            this.type = type; // 'coffee', 'flash', 'book', 'shield'
            this.startY = y;
            this.timer = Math.random() * 10;
            this.collected = false;
        }

        update(dt, player) {
            if (this.collected) return;
            this.timer += dt * 3.8;
            this.y = this.startY + Math.sin(this.timer) * 9;

            if (checkAABB(player, this)) {
                this.collect(player);
            }
        }

        collect(player) {
            this.collected = true;
            window.gameAudio.playPowerup(this.type);

            if (this.type === 'coffee') {
                player.speedBoostTimer = 7.5;
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '☕ ТУРБО ЭСПРЕССО!', '#FFB347', 22));
                emitParticles(this.x, this.y, 30, '#FFB347', 200, 0.8, 'star', 40);
            } else if (this.type === 'flash') {
                let nearest = null;
                let minDist = Infinity;
                for (let comp of gameState.computers) {
                    if (!comp.fixed) {
                        const dist = Math.hypot(comp.x - player.x, comp.y - player.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = comp;
                        }
                    }
                }
                if (nearest) {
                    nearest.completeFix(player);
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, '💾 АВТО-ФИКС ПК!', '#00F0FF', 22));
                } else {
                    gameState.score += 350;
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, '+350 ОЧКОВ!', '#00F0FF', 22));
                }
                emitParticles(this.x, this.y, 35, '#00F0FF', 220, 0.9, 'spark', 40);
            } else if (this.type === 'book') {
                gameState.gameTime += 20;
                gameState.score += 250;
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '📚 +20 СЕКУНД!', '#00FF9D', 22));
                emitParticles(this.x, this.y, 30, '#00FF9D', 180, 0.8, 'circle', 50);
            } else if (this.type === 'shield') {
                player.hasShield = true;
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '🛡️ НАНО-ЩИТ!', '#00F0FF', 22));
                emitParticles(this.x, this.y, 35, '#00F0FF', 200, 0.9, 'circle', 30);
            }
        }

        draw(ctx, camX, camY) {
            if (this.collected) return;
            const depth = getDepthPerspective(this.y + this.h);
            const w = this.w * depth;
            const h = this.h * depth;
            const dx = this.x - camX + (this.w - w) * 0.5;
            const dy = this.y - camY;
            drawContactShadow(ctx, dx + w * 0.5, dy + h, w * 1.4, 10 * depth, 0.3, '8, 35, 49');

            ctx.save();
            ctx.translate(dx + w / 2, dy + h / 2);
            ctx.scale(depth, depth);

            // Pulsing Holographic Ring
            ctx.beginPath();
            ctx.arc(0, 0, 22 + Math.sin(this.timer * 2.5) * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = (this.type === 'coffee') ? '#FFB347' : '#00F0FF';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let icon = '☕';
            if (this.type === 'flash') icon = '💾';
            if (this.type === 'book') icon = '📚';
            if (this.type === 'shield') icon = '🛡️';

            ctx.fillText(icon, 0, 2);
            ctx.restore();
        }
    }

    // --- PLAYER (COSMO) WITH SQUASH & STRETCH, FLIP & GHOST TRAILS ---
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.w = 192;
            this.h = 240;

            this.vx = 0;
            this.vy = 0;
            this.grounded = false;
            this.canDoubleJump = true;
            this.facingRight = true;

            this.lives = 3;
            this.invulnerableTimer = 0;
            this.speedBoostTimer = 0;
            this.hasShield = false;

            this.isFixing = false;
            this.fixTargetX = 0;
            this.fixTargetY = 0;

            this.runAnimTimer = 0;
            this.emotion = '';
            this.emotionTimer = 0;
            this.squashStretch = 1.0;
            this.flipRotation = 0; // for double jump 360° flip
            this.ghostTrails = []; // speed trail silhouettes
        }

        takeDamage() {
            if (this.invulnerableTimer > 0) return;

            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;

            if (this.hasShield) {
                this.hasShield = false;
                this.invulnerableTimer = 1.0;
                window.gameAudio.playHit();
                floatingTexts.push(new FloatingText(cx - 60, this.y - 20, 'ЩИТ РАЗБИТ!', '#00F0FF', 24));
                this.emotion = 'shock';
                this.emotionTimer = 0.7;
                emitParticles(cx, cy, 35, '#00F0FF', 240, 0.9, 'circle', 60);
                return;
            }

            this.lives--;
            this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
            this.emotion = 'sad';
            this.emotionTimer = 0.9;
            this.vy = -520;
            this.vx = this.facingRight ? -340 : 340;

            window.gameAudio.playHit();
            triggerScreenShake(18);
            gameState.hitStopTimer = CONFIG.HIT_STOP_DURATION;

            emitParticles(cx, cy, 45, '#FF3366', 280, 1.0, 'spark', 180);
            updateHUDLives();

            if (this.lives <= 0) {
                triggerGameOver();
            }
        }

        update(dt) {
            if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
            if (this.emotionTimer > 0) this.emotionTimer -= dt;
            else this.emotion = '';

            // Speed Boost Handling & Ghost Trail Emitter
            let currentSpeed = CONFIG.MOVE_SPEED;
            if (this.speedBoostTimer > 0) {
                this.speedBoostTimer -= dt;
                currentSpeed = CONFIG.BOOST_SPEED;

                // Record Ghost Trail
                if (Math.abs(this.vx) > 50) {
                    this.ghostTrails.push({
                        x: this.x,
                        y: this.y,
                        alpha: 0.5,
                        facingRight: this.facingRight
                    });
                }
            }

            // Update Ghost Trails
            for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
                this.ghostTrails[i].alpha -= dt * 3.5;
                if (this.ghostTrails[i].alpha <= 0) this.ghostTrails.splice(i, 1);
            }

            // Double Jump 360° Flip Animation
            if (this.flipRotation !== 0) {
                this.flipRotation += (this.facingRight ? 1 : -1) * 14 * dt;
                if (Math.abs(this.flipRotation) >= Math.PI * 2) {
                    this.flipRotation = 0;
                }
            }

            // Movement Input
            let moveDir = 0;
            if (input.left) moveDir -= 1;
            if (input.right) moveDir += 1;

            if (this.isFixing) {
                this.vx *= 0.65;
            } else {
                if (moveDir !== 0) {
                    this.vx = moveDir * currentSpeed;
                    this.facingRight = moveDir > 0;
                    this.runAnimTimer += dt * (this.speedBoostTimer > 0 ? 19 : 13);
                } else {
                    this.vx *= 0.65;
                    if (Math.abs(this.vx) < 5) this.vx = 0;
                    this.runAnimTimer = 0;
                }
            }

            // Gravity
            this.vy += CONFIG.GRAVITY * dt;

            // Jumping with Squash & Stretch
            const cx = this.x + this.w / 2;
            const feetY = this.y + this.h;

            if (input.jumpPressed) {
                input.jumpPressed = false;
                if (this.grounded) {
                    this.vy = CONFIG.JUMP_FORCE;
                    this.grounded = false;
                    this.canDoubleJump = true;
                    this.squashStretch = 1.35; // Stretch up
                    window.gameAudio.playJump();
                    emitParticles(cx, feetY, 16, 'rgba(255,255,255,0.75)', 140, 0.4, 'circle', 80);
                } else if (this.canDoubleJump) {
                    this.vy = CONFIG.DOUBLE_JUMP_FORCE;
                    this.canDoubleJump = false;
                    this.flipRotation = 0.1; // trigger 360° flip
                    this.squashStretch = 1.25;
                    window.gameAudio.playDoubleJump();
                    emitParticles(cx, feetY, 24, '#00F0FF', 220, 0.5, 'spark', 140);
                }
            }

            // Variable jump height
            if (!input.jump && this.vy < -200) {
                this.vy += 1600 * dt;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Bounds
            if (this.x < 0) { this.x = 0; this.vx = 0; }
            else if (this.x + this.w > gameState.worldWidth) { this.x = gameState.worldWidth - this.w; this.vx = 0; }

            // Platform Collisions
            const wasGrounded = this.grounded;
            this.grounded = false;

            for (let plat of gameState.platforms) {
                if (
                    this.vy > 0 &&
                    this.y + this.h >= plat.y &&
                    this.y + this.h - this.vy * dt <= plat.y + 24 &&
                    this.x + this.w - 20 > plat.x &&
                    this.x + 20 < plat.x + plat.w
                ) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    this.canDoubleJump = true;
                    this.flipRotation = 0;

                    if (!wasGrounded) {
                        this.squashStretch = 0.75; // Squash on impact
                        window.gameAudio.playLand();
                        emitParticles(cx, this.y + this.h, 14, 'rgba(255,255,255,0.6)', 120, 0.35, 'circle', 50);
                    }
                    break;
                }
            }

            // Floor Clamp
            const floorY = vh - 55;
            if (this.y + this.h >= floorY) {
                this.y = floorY - this.h;
                this.vy = 0;
                this.grounded = true;
                this.canDoubleJump = true;
                this.flipRotation = 0;
                if (!wasGrounded) {
                    this.squashStretch = 0.75;
                    window.gameAudio.playLand();
                    emitParticles(cx, this.y + this.h, 14, 'rgba(255,255,255,0.6)', 120, 0.35, 'circle', 50);
                }
            }

            // Spring recovery of squash & stretch
            this.squashStretch += (1.0 - this.squashStretch) * 14 * dt;
            this.isFixing = false;
        }

        draw(ctx, camX, camY) {
            if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

            const depth = getDepthPerspective(this.y + this.h);
            const drawX = this.x - camX;
            const drawY = this.y - camY;
            const cx = drawX + this.w / 2;
            const cy = drawY + this.h / 2;

            // 1. Draw Soft Dynamic Platform Shadow (80x20)
            const shadowY = drawY + this.h - 2;
            const shadowScale = Math.max(0.4, 1.0 - Math.abs(this.vy) * 0.0008);
            drawContactShadow(ctx, cx, shadowY, 110 * shadowScale * depth, 18 * shadowScale, 0.48);

            // 2. Draw Ghost Trails (Speed Boost) scaled to 240x280
            for (let trail of this.ghostTrails) {
                ctx.save();
                ctx.globalAlpha = trail.alpha * 0.45;
                const tx = trail.x - camX + this.w / 2;
                const ty = trail.y - camY + this.h / 2 + this.h * (1 - depth) * 0.5;
                ctx.translate(tx, ty);
                if (!trail.facingRight) ctx.scale(-1, 1);
                const spr = loadedImages['cool'] || loadedImages['idle'];
                drawMascotSprite(ctx, spr, -120 * depth, -140 * depth, 240 * depth, 280 * depth);
                ctx.restore();
            }

            // 3. Draw Player Body with Kinematics (240x280)
            ctx.save();
            ctx.translate(cx, cy + this.h * (1 - depth) * 0.5);
            ctx.scale(depth, depth);

            if (!this.facingRight) ctx.scale(-1, 1);
            if (this.flipRotation !== 0) ctx.rotate(this.flipRotation);
            ctx.scale(1 / this.squashStretch, this.squashStretch);

            let spriteKey = 'idle';
            if (this.emotionTimer > 0 && loadedImages[this.emotion]) spriteKey = this.emotion;
            else if (this.isFixing) spriteKey = 'thinking';
            else if (this.speedBoostTimer > 0) spriteKey = 'cool';
            else if (!this.grounded) spriteKey = 'idea';
            else if (Math.abs(this.vx) > 30) spriteKey = (Math.sin(this.runAnimTimer) > 0) ? 'smile' : 'idle';

            const spriteImg = loadedImages[spriteKey];
            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                const spriteW = 240;
                const spriteH = 280;
                const bobY = this.grounded ? Math.sin(this.runAnimTimer) * 8 : -4;
                drawMascotSpriteCentered(ctx, spriteImg, 0, bobY - 6, spriteW, spriteH);
            } else {
                this.drawProceduralCosmo(ctx);
            }

            // Nano Shield Forcefield (radius 140px)
            if (this.hasShield) {
                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(0, 0, (140 + Math.sin(Date.now() / 140) * 5) * depth, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(0, 255, 157, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, (130 + Math.cos(Date.now() / 180) * 4) * depth, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.restore();

            // 4. Procedural Multi-Branched Lightning Repair Arc from Cosmo's Hand to Monitor Center
            if (this.isFixing) {
                const handX = cx + (this.facingRight ? 75 : -75);
                const handY = cy + 20;
                const targetX = this.fixTargetX - camX;
                const targetY = this.fixTargetY - camY;
                this.drawProceduralLightningArc(ctx, handX, handY, targetX, targetY);
            }
        }

        drawProceduralLightningArc(ctx, x1, y1, x2, y2) {
            ctx.save();

            // Glowing Hand Plasma Spark
            ctx.fillStyle = '#00F0FF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(x1, y1, 7 + Math.random() * 4, 0, Math.PI * 2);
            ctx.fill();

            // Outer Cyan Glow Arc
            ctx.strokeStyle = '#00F0FF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 4.5;

            const drawBolt = (sx, sy, ex, ey, jitter, branches = false) => {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                const segs = 8;
                for (let i = 1; i < segs; i++) {
                    const t = i / segs;
                    const lx = sx + (ex - sx) * t + (Math.random() - 0.5) * jitter;
                    const ly = sy + (ey - sy) * t + (Math.random() - 0.5) * jitter;
                    ctx.lineTo(lx, ly);

                    if (branches && i === Math.floor(segs / 2) && Math.random() < 0.6) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(lx, ly);
                        const bx = lx + (Math.random() - 0.5) * 40;
                        const by = ly + (Math.random() - 0.5) * 40;
                        ctx.lineTo(bx, by);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(lx, ly);
                    }
                }
                ctx.lineTo(ex, ey);
                ctx.stroke();
            };

            drawBolt(x1, y1, x2, y2, 22, true);

            // White-hot inner core
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowBlur = 6;
            ctx.lineWidth = 2;
            drawBolt(x1, y1, x2, y2, 10, false);

            // Target impact glow at monitor center
            ctx.fillStyle = '#00FF9D';
            ctx.shadowColor = '#00FF9D';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(x2, y2, 6 + Math.random() * 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        drawProceduralCosmo(ctx) {
            ctx.save();
            ctx.scale(4, 4);
            const bounce = this.grounded ? Math.abs(Math.sin(this.runAnimTimer)) * 2 : 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(0, -6 + bounce, 22, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#00FF9D';
            ctx.beginPath(); ctx.arc(0, 6 + bounce, 16, 0, Math.PI); ctx.fill();

            ctx.fillStyle = '#090E1A';
            ctx.beginPath(); ctx.roundRect(-14, -16 + bounce, 28, 18, 5); ctx.fill();

            ctx.fillStyle = '#FFD15C';
            ctx.shadowColor = '#FFD15C';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(-6, -8 + bounce, 4, 0, Math.PI * 2); ctx.arc(6, -8 + bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#9BB0D4'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(0, -28 + bounce); ctx.lineTo(0, -38 + bounce); ctx.stroke();
            ctx.fillStyle = this.isFixing ? '#FF3366' : '#00F0FF';
            ctx.beginPath(); ctx.arc(0, -40 + bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // --- GAME STATE MANAGER ---
    const STATE_MENU = 0;
    const STATE_PLAYING = 1;
    const STATE_PAUSED = 2;
    const STATE_LEVEL_WIN = 3;
    const STATE_GAMEOVER = 4;

    function readHighScore() {
        try {
            const stored = Number.parseInt(localStorage.getItem('cosmo_runner_highscore') || '0', 10);
            return Number.isFinite(stored) && stored > 0 ? stored : 0;
        } catch (_) {
            return 0;
        }
    }

    gameState = {
        state: STATE_MENU,
        level: 1,
        score: 0,
        highScore: readHighScore(),
        gameTime: 90,
        fixedCount: 0,
        targetComputers: 3,
        worldWidth: 3200,
        cameraX: 0,
        cameraY: 0,
        screenShake: 0,
        hitStopTimer: 0,
        player: null,
        platforms: [],
        computers: [],
        hazards: [],
        powerups: []
    };

    function triggerScreenShake(magnitude = 14) {
        gameState.screenShake = magnitude;
    }

    function checkAABB(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    function buildLevel(levelNum) {
        gameState.platforms = [];
        gameState.computers = [];
        gameState.hazards = [];
        gameState.powerups = [];
        gameState.fixedCount = 0;

        gameState.worldWidth = 2600 + levelNum * 600;
        gameState.targetComputers = 2 + levelNum;
        gameState.gameTime = 75 + levelNum * 10;

        const floorY = vh - 55;

        const levelNames = [
            'Уровень 1: Читальный зал ЦГБ',
            'Уровень 2: Хранилище «Добролит»',
            'Уровень 3: Серверный Бункер АВРОРЫ',
            `Сектор ${levelNum}: Кибер-Архивы`
        ];
        document.getElementById('ui-level-name').innerText = levelNames[Math.min(levelNum - 1, levelNames.length - 1)];

        // Base Floor
        gameState.platforms.push(new Platform(0, floorY, gameState.worldWidth, 60, 'floor'));

        const deskY = floorY - 260;
        const shelfY = floorY - 500;

        // Desks (Lower Tier) & Shelves (Upper Tier)
        let cx = 180;
        while (cx < gameState.worldWidth - 360) {
            const pw = 360 + Math.random() * 200; // 360-560px wide

            // Lower tier desk
            gameState.platforms.push(new Platform(cx, deskY, pw, 28, 'desk'));

            // Upper tier shelf (high frequency for multi-tier platforming)
            if (Math.random() < 0.85) {
                const shelfW = 360 + Math.random() * 200; // 360-560px wide
                const shelfX = cx + (Math.random() - 0.5) * 100;
                gameState.platforms.push(new Platform(Math.max(60, shelfX), shelfY, shelfW, 26, 'shelf'));
            }

            cx += pw + 120 + Math.random() * 100;
        }

        // Computers (w: 160, h: 140) centered on desks
        const deskPlats = gameState.platforms.filter(p => p.type === 'desk');
        const candidatePlats = deskPlats.length >= gameState.targetComputers ? deskPlats : gameState.platforms.filter(p => p.type !== 'floor');
        const shuffled = [...candidatePlats].sort(() => Math.random() - 0.5);
        for (let i = 0; i < gameState.targetComputers; i++) {
            const p = shuffled[i % shuffled.length];
            gameState.computers.push(new ComputerTerminal(p.x + p.w / 2 - 80, p.y));
        }

        // Hazards
        const numCarts = 1 + Math.floor(levelNum * 0.8);
        for (let i = 0; i < numCarts; i++) {
            const segW = gameState.worldWidth / numCarts;
            const minX = i * segW + 150;
            const maxX = (i + 1) * segW - 150;
            const spd = (130 + levelNum * 25) * (Math.random() < 0.5 ? 1 : -1);
            gameState.hazards.push(new CartHazard(minX + 50, floorY - 44, spd, minX, maxX));
        }

        if (levelNum >= 2) {
            for (let i = 0; i < levelNum; i++) {
                const fx = 420 + (i * 700) + Math.random() * 200;
                const fy = floorY - 370 - Math.random() * 90;
                gameState.hazards.push(new FlyingBookHazard(fx, fy, (140 + levelNum * 22) * (i % 2 === 0 ? 1 : -1)));
            }
        }

        // Powerups
        const types = ['coffee', 'flash', 'book', 'shield'];
        for (let i = 0; i < 3 + levelNum; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            const px = 300 + Math.random() * (gameState.worldWidth - 600);
            const py = Math.random() < 0.5 ? deskY - 90 : shelfY - 90;
            gameState.powerups.push(new PowerupItem(px, py, t));
        }

        updateHUDObjectives();
    }

    function checkLevelProgression() {
        updateHUDObjectives();

        if (gameState.fixedCount >= gameState.targetComputers) {
            gameState.state = STATE_LEVEL_WIN;
            window.gameAudio.playLevelWin();

            for (let i = 0; i < 110; i++) {
                const colors = ['#00F0FF', '#FFB347', '#00FF9D', '#FF3366', '#E056FD'];
                emitParticles(
                    gameState.player.x + gameState.player.w / 2,
                    gameState.player.y + gameState.player.h / 2,
                    1,
                    colors[Math.floor(Math.random() * colors.length)],
                    300,
                    1.5,
                    'star',
                    110
                );
            }

            document.getElementById('win-level-title').innerText = `СЕКТОР ${gameState.level} ЗАЩИЩЁН!`;
            document.getElementById('win-score').innerText = gameState.score;
            document.getElementById('win-time-bonus').innerText = `+${Math.floor(gameState.gameTime)} СЕК`;
            document.getElementById('modal-win').classList.remove('hidden');
        }
    }

    function updateHUDObjectives() {
        const dotContainer = document.getElementById('ui-pc-dots');
        dotContainer.innerHTML = '';
        for (let i = 0; i < gameState.targetComputers; i++) {
            const dot = document.createElement('div');
            dot.className = 'pc-dot' + (i < gameState.fixedCount ? ' fixed' : '');
            dotContainer.appendChild(dot);
        }
        document.getElementById('ui-score').innerText = gameState.score;
    }

    function updateHUDLives() {
        const heartsEl = document.getElementById('ui-lives');
        heartsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const h = document.createElement('span');
            h.className = 'heart-icon' + (i >= gameState.player.lives ? ' lost' : '');
            heartsEl.appendChild(h);
        }
    }

    // Hazard Telegraphing Warnings on Screen Edges
    function updateHazardWarnings(camX) {
        const container = document.getElementById('hazard-warnings');
        if (!container) return;
        container.innerHTML = '';

        for (let h of gameState.hazards) {
            const screenX = h.x - camX;
            // Approaching from left off-screen
            if (screenX < -20 && screenX > -400 && h.vx > 0) {
                const arrow = document.createElement('div');
                arrow.className = 'hazard-arrow';
                arrow.style.left = '16px';
                arrow.style.top = Math.max(80, Math.min(vh - 100, h.y)) + 'px';
                arrow.innerText = '►';
                container.appendChild(arrow);
            }
            // Approaching from right off-screen
            else if (screenX > vw + 20 && screenX < vw + 400 && h.vx < 0) {
                const arrow = document.createElement('div');
                arrow.className = 'hazard-arrow';
                arrow.style.right = '16px';
                arrow.style.top = Math.max(80, Math.min(vh - 100, h.y)) + 'px';
                arrow.innerText = '◄';
                container.appendChild(arrow);
            }
        }
    }

    function startGame() {
        window.gameAudio.init();
        window.gameAudio.resume();
        window.gameAudio.startMusic();

        gameState.level = 1;
        gameState.score = 0;
        gameState.cameraX = 0;
        gameState.cameraY = 0;
        gameState.screenShake = 0;
        gameState.hitStopTimer = 0;
        gameState.state = STATE_PLAYING;
        releaseAllInputs();

        const floorY = vh - 55;
        gameState.player = new Player(140, floorY - 240);
        buildLevel(gameState.level);
        updateHUDLives();

        document.getElementById('modal-start').classList.add('hidden');
        document.getElementById('modal-gameover').classList.add('hidden');
        document.getElementById('modal-win').classList.add('hidden');
        document.getElementById('modal-pause').classList.add('hidden');
    }

    function nextLevel() {
        gameState.level++;
        gameState.score += Math.floor(gameState.gameTime) * 10;
        gameState.state = STATE_PLAYING;

        document.getElementById('modal-win').classList.add('hidden');
        const floorY = vh - 55;
        gameState.player.x = 140;
        gameState.player.y = floorY - 240;
        gameState.player.vx = 0;
        gameState.player.vy = 0;

        buildLevel(gameState.level);
    }

    function triggerGameOver() {
        gameState.state = STATE_GAMEOVER;
        window.gameAudio.playGameOver();

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            try {
                localStorage.setItem('cosmo_runner_highscore', String(gameState.highScore));
            } catch (_) {
                // Saving records is optional when browser storage is disabled.
            }
        }

        document.getElementById('go-final-score').innerText = gameState.score;
        document.getElementById('go-highscore').innerText = gameState.highScore;
        document.getElementById('modal-gameover').classList.remove('hidden');
    }

    function togglePause() {
        if (gameState.state === STATE_PLAYING) {
            releaseAllInputs();
            gameState.state = STATE_PAUSED;
            document.getElementById('modal-pause').classList.remove('hidden');
        } else if (gameState.state === STATE_PAUSED) {
            gameState.state = STATE_PLAYING;
            document.getElementById('modal-pause').classList.add('hidden');
        }
    }

    function toggleMuteUI() {
        const isMuted = window.gameAudio.toggleMute();
        const icon = document.getElementById('mute-icon');
        if (icon) icon.innerText = isMuted ? 'volume_off' : 'volume_up';
    }

    // Modal Listeners
    document.getElementById('btn-play-start')?.addEventListener('click', startGame);
    document.getElementById('btn-next-level')?.addEventListener('click', nextLevel);
    document.getElementById('btn-restart')?.addEventListener('click', startGame);
    document.getElementById('btn-resume')?.addEventListener('click', togglePause);
    document.getElementById('btn-pause')?.addEventListener('click', togglePause);
    document.getElementById('btn-mute')?.addEventListener('click', toggleMuteUI);

    // --- PARALLAX BACKGROUND ART (PHOTOREALISTIC LIBRARY & GOTHIC FALLBACK) ---
    function drawParallaxBackground(camX) {
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, vw, vh);

        const bgImg = gameTextures.bg;
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            // Soft smooth parallax scrolling with photo-realistic library background
            const bgRatio = vh / bgImg.naturalHeight;
            const bgW = bgImg.naturalWidth * bgRatio;
            const bgH = vh;
            const parallaxX = -(camX * 0.16) % bgW;

            ctx.save();
            for (let x = parallaxX - bgW; x < vw + bgW; x += bgW) {
                ctx.drawImage(bgImg, x, 0, bgW, bgH);
            }

            // Atmospheric cyber-library vignette overlay
            const atmoGrad = ctx.createLinearGradient(0, 0, 0, vh);
            atmoGrad.addColorStop(0, 'rgba(4, 7, 18, 0.45)');
            atmoGrad.addColorStop(0.5, 'rgba(4, 7, 18, 0.15)');
            atmoGrad.addColorStop(1, 'rgba(4, 7, 18, 0.65)');
            ctx.fillStyle = atmoGrad;
            ctx.fillRect(0, 0, vw, vh);
            ctx.restore();

            // Midground Library Neon Emblems (0.35x speed)
            const bannerX = -(camX * 0.35) % 1500;
            const bannerNames = [
                'ЦГБ ВЛАДИМИР // СИСТЕМА АВРОРА',
                'ФИЛИАЛ №9 «ДОБРОЛИТ»',
                'ФИЛИАЛ №13 «КНИГОЛЕНД»',
                'ЦЕНТРАЛЬНЫЙ СЕРВЕРНЫЙ ЗАЛ'
            ];
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(0, 240, 255, 0.32)';
            for (let bx = bannerX - 1500; bx < vw + 1500; bx += 850) {
                const idx = Math.abs(Math.floor(bx / 850)) % bannerNames.length;
                ctx.fillText(`⯈ ${bannerNames[idx]} ⯈`, bx + 160, vh - 380);
            }
        } else {
            // Fallback: Cathedral Gothic Windows & Celestial Starry Aurora Sky (0.05x speed)
            const skyX = -(camX * 0.05) % 900;
            ctx.save();
            for (let wx = skyX - 900; wx < vw + 900; wx += 480) {
                // Gothic Window Frame
                ctx.beginPath();
                ctx.arc(wx + 120, vh - 420, 95, Math.PI, 0);
                ctx.lineTo(wx + 215, vh - 90);
                ctx.lineTo(wx + 25, vh - 90);
                ctx.closePath();
                ctx.fillStyle = '#0A122E';
                ctx.fill();

                // Aurora Borealis Green/Cyan Glow inside window
                const auroraGrad = ctx.createLinearGradient(wx + 25, vh - 400, wx + 215, vh - 300);
                auroraGrad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
                auroraGrad.addColorStop(0.5, 'rgba(0, 255, 157, 0.12)');
                auroraGrad.addColorStop(1, 'rgba(157, 78, 221, 0.1)');
                ctx.fillStyle = auroraGrad;
                ctx.fill();

                // Window Tracery & Mullions
                ctx.strokeStyle = '#050814';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(wx + 120, vh - 515); ctx.lineTo(wx + 120, vh - 90);
                ctx.moveTo(wx + 72, vh - 400); ctx.lineTo(wx + 72, vh - 90);
                ctx.moveTo(wx + 168, vh - 400); ctx.lineTo(wx + 168, vh - 90);
                ctx.stroke();

                // Stars
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(wx + 75, vh - 420, 2, 2);
                ctx.fillRect(wx + 155, vh - 440, 2.5, 2.5);
                ctx.fillRect(wx + 105, vh - 360, 2, 2);
            }
            ctx.restore();

            // Layer 1: Huge Carved Oak Bookshelves & Pillars (0.22x speed)
            const shelfX = -(camX * 0.22) % 650;
            ctx.fillStyle = '#0E1733';
            for (let sx = shelfX - 650; sx < vw + 650; sx += 340) {
                ctx.fillRect(sx, vh - 500, 280, 445);
                // Bookshelf rows
                ctx.fillStyle = '#142247';
                for (let r = 0; r < 5; r++) {
                    ctx.fillRect(sx + 10, vh - 480 + r * 85, 260, 72);
                }
                ctx.fillStyle = '#0E1733';
            }

            // Layer 2: Midground Library Neon Emblems (0.45x speed)
            const bannerX = -(camX * 0.45) % 1400;
            const bannerNames = ['ЦГБ ВЛАДИМИР // АВРОРА', 'ФИЛИАЛ №9 «ДОБРОЛИТ»', 'ФИЛИАЛ №13 «КНИГОЛЕНД»', 'ЦЕНТРАЛЬНЫЙ ОПАК-СЕРВЕР'];
            ctx.font = 'bold 15px "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';
            for (let bx = bannerX - 1400; bx < vw + 1400; bx += 800) {
                const idx = Math.abs(Math.floor(bx / 800)) % bannerNames.length;
                ctx.fillText(`⯈ ${bannerNames[idx]} ⯈`, bx + 140, vh - 340);
            }
        }
    }

    // --- MAIN GAME LOOP WITH HIT-STOP JUICE ---
    let lastTimestamp = performance.now();

    function gameLoop(currentTimestamp) {
        const dt = Math.min((currentTimestamp - lastTimestamp) / 1000, 0.05);
        lastTimestamp = currentTimestamp;

        // Hit-Stop Freeze Frame (Game Feel Juice)
        if (gameState.hitStopTimer > 0) {
            gameState.hitStopTimer -= dt;
            requestAnimationFrame(gameLoop);
            return;
        }

        // 1. UPDATE
        if (resizeNeedsHUDRefresh && gameState.state === STATE_PLAYING) {
            resizeNeedsHUDRefresh = false;
            updateHUDLives();
            for (const terminal of gameState.computers) terminal.playerNearby = false;
        }

        if (gameState.state === STATE_PLAYING) {
            gameState.gameTime -= dt;

            // Timer & Urgent Screen Vignette
            const timerEl = document.getElementById('ui-timer');
            const vignetteEl = document.getElementById('screen-vignette');

            if (timerEl) {
                const mins = Math.floor(Math.max(0, gameState.gameTime) / 60);
                const secs = Math.floor(Math.max(0, gameState.gameTime) % 60);
                timerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                if (gameState.gameTime <= 15) {
                    timerEl.classList.add('urgent');
                    if (vignetteEl) vignetteEl.classList.add('urgent');
                } else {
                    timerEl.classList.remove('urgent');
                    if (vignetteEl) vignetteEl.classList.remove('urgent');
                }
            }

            if (gameState.gameTime <= 0) triggerGameOver();

            gameState.player.update(dt);

            for (let comp of gameState.computers) comp.update(dt, gameState.player);
            for (let hazard of gameState.hazards) hazard.update(dt, gameState.player);
            for (let item of gameState.powerups) item.update(dt, gameState.player);

            for (let p of particlePool) {
                if (p.active) p.update(dt);
            }

            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                floatingTexts[i].update(dt);
                if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
            }

            // Camera Spring Tracking with Velocity Lead
            const leadX = gameState.player.vx * 0.22;
            const targetCamX = gameState.player.x - vw * 0.35 + leadX;
            gameState.cameraX += (targetCamX - gameState.cameraX) * 9 * dt;
            gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameState.worldWidth - vw));

            if (gameState.screenShake > 0) {
                gameState.screenShake = Math.max(0, gameState.screenShake - dt * 45);
            }

            // Update Off-Screen Hazard Warning Arrows
            updateHazardWarnings(gameState.cameraX);
        }

        // 2. RENDER
        ctx.save();

        if (gameState.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * gameState.screenShake;
            const shakeY = (Math.random() - 0.5) * gameState.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // Parallax Architecture & Celestial Windows
        drawParallaxBackground(gameState.cameraX);
        drawLibraryDepth(ctx, gameState.cameraX);
        const worldFloorY = vh - 55 - gameState.cameraY;
        const foregroundDepthShift = 38;
        drawPerspectiveFloor(ctx, gameState.cameraX, worldFloorY);

        if (gameState.state !== STATE_MENU) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, vh * SCENE_DEPTH.horizonY, vw, vh - vh * SCENE_DEPTH.horizonY);
            ctx.clip();
            ctx.save();
            ctx.translate(0, foregroundDepthShift);
            ctx.globalAlpha = 0.64;
            drawPerspectiveFloor(ctx, gameState.cameraX, worldFloorY);
            ctx.restore();

            const groundShadowX = gameState.player.x + gameState.player.w / 2 - gameState.cameraX;
            const jumpHeight = Math.max(0, worldFloorY - gameState.player.y - gameState.player.h);
            drawContactShadow(ctx, groundShadowX, worldFloorY + 2, 220, 28 + jumpHeight * 0.14, 0.55);

            // Rear desks and bookshelves recede toward the vanishing point.
            const depthPlatforms = gameState.platforms
                .filter((platform) => platform.type !== 'floor')
                .sort((a, b) => a.y - b.y);
            for (const platform of depthPlatforms) {
                if (platform.y <= worldFloorY - 270) platform.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Sort moving actors against the library shelves to create clear occlusion.
            const depthActors = [
                ...gameState.computers.map((item) => ({ item, y: item.y, draw: () => item.draw(ctx, gameState.cameraX, gameState.cameraY) })),
                ...gameState.hazards.map((item) => ({ item, y: item.y, draw: () => item.draw(ctx, gameState.cameraX, gameState.cameraY) })),
                ...gameState.powerups.filter((item) => !item.collected).map((item) => ({ item, y: item.y + item.h, draw: () => item.draw(ctx, gameState.cameraX, gameState.cameraY) }))
            ].sort((a, b) => a.y - b.y);
            // Depth-sort the player alongside terminals, items and hazards.
            depthActors.push({ y: gameState.player.y + gameState.player.h, draw: () => gameState.player.draw(ctx, gameState.cameraX, gameState.cameraY) });
            depthActors.sort((a, b) => a.y - b.y);
            const foregroundDepth = worldFloorY - 270;
            for (const actor of depthActors) {
                if (actor.y <= foregroundDepth) actor.draw();
            }

            // Foreground desk slabs occlude only actors that are farther away.
            for (const platform of depthPlatforms) {
                if (platform.y <= foregroundDepth) continue;
                platform.draw(ctx, gameState.cameraX, gameState.cameraY);
            }
            for (const actor of depthActors) {
                if (actor.y > foregroundDepth) actor.draw();
            }

            // Close foreground characters and their stage lip anchor the scene.
            const foregroundRail = ctx.createLinearGradient(0, worldFloorY - 10, 0, worldFloorY + 36);
            foregroundRail.addColorStop(0, 'rgba(229,177,110,0.12)');
            foregroundRail.addColorStop(0.42, 'rgba(25,26,41,0.76)');
            foregroundRail.addColorStop(1, 'rgba(6,9,21,0.97)');
            ctx.fillStyle = foregroundRail;
            ctx.fillRect(0, worldFloorY - 8, vw, 44);
            ctx.fillStyle = 'rgba(89, 223, 255, 0.68)';
            ctx.shadowColor = '#00DDF6';
            ctx.shadowBlur = 14;
            ctx.fillRect(0, worldFloorY - 8, vw, 2);
            ctx.shadowBlur = 0;
            ctx.restore();

            // Particles
            for (let p of particlePool) {
                if (p.active) p.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Floating Dust Motes in Lighting Cones
            updateAndDrawDustMotes(ctx, gameState.cameraX, gameState.cameraY);

            // Floating Score & Badge Texts
            for (let ft of floatingTexts) ft.draw(ctx, gameState.cameraX, gameState.cameraY);
        }

        ctx.restore();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);

    window.CosmoGame = {
        start: startGame,
        pause: togglePause
    };

})();
