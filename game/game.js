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
        GRAVITY: 1450,
        MOVE_SPEED: 380,
        BOOST_SPEED: 580,
        JUMP_FORCE: -620,
        DOUBLE_JUMP_FORCE: -540,
        FIX_TIME_REQUIRED: 1.6,
        INVULNERABLE_DURATION: 1.6,
        MAX_PARTICLES: 450,
        HIT_STOP_DURATION: 0.05 // 50ms freeze frame for impactful juice
    };

    // Preloaded Mascot Sprites
    const MASCOT_SPRITES = {
        idle: '../assets/images/mascot/robot_idle.png',
        smile: '../assets/images/mascot/robot_smile.png',
        shock: '../assets/images/mascot/robot_shock.png',
        party: '../assets/images/mascot/robot_party.png',
        cool: '../assets/images/mascot/robot_cool.png',
        idea: '../assets/images/mascot/robot_idea.png',
        read: '../assets/images/mascot/robot_read.png',
        wink: '../assets/images/mascot/robot_wink.png',
        thinking: '../assets/images/mascot/robot_thinking.png',
        sad: '../assets/images/mascot/robot_sad.png'
    };

    const loadedImages = {};
    for (const [key, src] of Object.entries(MASCOT_SPRITES)) {
        const img = new Image();
        img.src = src;
        img.onload = () => { loadedImages[key] = img; };
        img.onerror = () => { loadedImages[key] = null; };
    }

    // Canvas & Viewport Setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let vw = window.innerWidth;
    let vh = window.innerHeight;

    function resizeCanvas() {
        vw = window.innerWidth;
        vh = window.innerHeight;
        canvas.width = vw;
        canvas.height = vh;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Input Controller
    const input = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        jumpPressed: false,
        fix: false
    };

    window.addEventListener('keydown', (e) => {
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

    // Touch Controls Binding
    function bindTouch(id, action) {
        const el = document.getElementById(id);
        if (!el) return;

        const start = (e) => {
            e.preventDefault();
            el.classList.add('active');
            if (action === 'jump') {
                if (!input.jump) input.jumpPressed = true;
                input.jump = true;
                input.up = true;
            } else {
                input[action] = true;
            }
            if (window.navigator.vibrate) window.navigator.vibrate(12);
        };

        const end = (e) => {
            e.preventDefault();
            el.classList.remove('active');
            if (action === 'jump') {
                input.jump = false;
                input.up = false;
            } else {
                input[action] = false;
            }
        };

        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
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
            const dx = this.x - camX;
            const dy = this.y - camY;

            if (this.type === 'floor') {
                // Polished Dark Parquet Floor
                ctx.fillStyle = '#10172B';
                ctx.fillRect(dx, dy, this.w, this.h);

                // Floor glow line
                const floorGrad = ctx.createLinearGradient(dx, dy, dx + this.w, dy);
                floorGrad.addColorStop(0, '#00F0FF');
                floorGrad.addColorStop(0.5, '#00FF9D');
                floorGrad.addColorStop(1, '#00F0FF');
                ctx.fillStyle = floorGrad;
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 10;
                ctx.fillRect(dx, dy, this.w, 3);
                ctx.shadowBlur = 0;

                // Parquet plank dividers
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
                ctx.lineWidth = 1.5;
                for (let px = 0; px < this.w; px += 90) {
                    ctx.beginPath();
                    ctx.moveTo(dx + px, dy + 3);
                    ctx.lineTo(dx + px, dy + this.h);
                    ctx.stroke();
                }
            } else if (this.type === 'desk') {
                // Polished Mahogany Library Desk
                ctx.fillStyle = '#2A180E';
                ctx.fillRect(dx, dy, this.w, this.h);
                ctx.fillStyle = '#4E2C17';
                ctx.fillRect(dx, dy, this.w, 5);

                // Brass Corner Brackets & Rivets
                ctx.fillStyle = '#D4AF37';
                ctx.fillRect(dx + 4, dy + 2, 8, 4);
                ctx.fillRect(dx + this.w - 12, dy + 2, 8, 4);

                // Desk Carved Legs
                ctx.fillStyle = '#1A0F09';
                ctx.fillRect(dx + 16, dy + this.h, 14, 130);
                ctx.fillRect(dx + this.w - 30, dy + this.h, 14, 130);

                // Classic Emerald Banker's Lamp
                if (this.hasLamp) {
                    const lampX = dx + 26;
                    const lampY = dy - 24;

                    // Brass stand
                    ctx.strokeStyle = '#D4AF37';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(lampX, dy);
                    ctx.lineTo(lampX, lampY + 6);
                    ctx.arc(lampX + 6, lampY + 6, 6, Math.PI, Math.PI * 1.5);
                    ctx.stroke();

                    // Green glass shade
                    ctx.fillStyle = '#1B7A43';
                    ctx.shadowColor = '#2ECC71';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(lampX + 12, lampY, 14, Math.PI * 0.9, Math.PI * 2.1);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Volumetric Warm Light Cone onto Desk (Screen blend mode)
                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    const coneGrad = ctx.createRadialGradient(lampX + 12, lampY + 6, 2, lampX + 12, lampY + 45, 65);
                    coneGrad.addColorStop(0, 'rgba(255, 230, 150, 0.45)');
                    coneGrad.addColorStop(0.6, 'rgba(46, 204, 113, 0.22)');
                    coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = coneGrad;
                    ctx.beginPath();
                    ctx.moveTo(lampX + 6, lampY + 4);
                    ctx.lineTo(lampX - 35, dy + 8);
                    ctx.lineTo(lampX + 65, dy + 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            } else {
                // Grand Wooden Bookshelf Platform
                ctx.fillStyle = '#362113';
                ctx.fillRect(dx, dy, this.w, this.h);
                ctx.fillStyle = '#5A371F';
                ctx.fillRect(dx, dy, this.w, 4);

                // Richly Detailed Books Standing on Shelf
                const bookPalette = [
                    { spine: '#962D3E', foil: '#F4D03F' }, // Crimson + Gold
                    { spine: '#2471A3', foil: '#EBF5FB' }, // Royal Blue + Silver
                    { spine: '#196F3D', foil: '#F1C40F' }, // Emerald + Gold
                    { spine: '#B7950B', foil: '#7D6608' }, // Amber Leather
                    { spine: '#6C3483', foil: '#F5EEF8' }, // Purple Velvet
                    { spine: '#D35400', foil: '#EDBB99' }  // Terracotta
                ];

                let cx = dx + 10;
                while (cx < dx + this.w - 18) {
                    const bW = 8 + ((cx * 5) % 9);
                    const bH = 22 + ((cx * 7) % 18);
                    const bData = bookPalette[Math.abs(Math.floor(cx * 0.1)) % bookPalette.length];

                    // Leaning book effect
                    const isLeaning = (cx % 75 < 12);
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
                    ctx.fillRect(cx + 2, dy - bH + 4, bW - 4, 2);
                    ctx.fillRect(cx + 2, dy - bH + 9, bW - 4, 1.5);
                    ctx.fillRect(cx + 2, dy - 5, bW - 4, 1.5);

                    ctx.restore();

                    cx += bW + 3;
                    if (cx % 110 === 0) cx += 18; // gap for bookend
                }
            }
        }
    }

    // Computer Terminal (3D CRT Monitor, Holographic States)
    class ComputerTerminal {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.w = 58;
            this.h = 52;
            this.fixed = false;
            this.fixProgress = 0;
            this.glitchTimer = 0;
            this.smokeTimer = 0;
        }

        update(dt, player) {
            if (this.fixed) return;

            this.glitchTimer += dt * 9;
            this.smokeTimer -= dt;

            // Smoking vents on broken computer
            if (this.smokeTimer <= 0) {
                emitParticles(this.x + 29, this.y - 48, 1, 'rgba(180, 190, 210, 0.4)', 25, 0.8, 'smoke', -20);
                this.smokeTimer = 0.4 + Math.random() * 0.4;
            }

            // Check repair interaction
            const pCenterX = player.x + player.w / 2;
            const cCenterX = this.x + this.w / 2;
            const distance = Math.abs(pCenterX - cCenterX);
            const verticalDist = Math.abs((player.y + player.h) - this.y);

            const isNear = distance < 80 && verticalDist < 35;

            if (isNear && input.fix) {
                player.isFixing = true;
                player.fixTargetX = cCenterX;
                player.fixTargetY = this.y - 25;

                this.fixProgress += dt / CONFIG.FIX_TIME_REQUIRED;

                if (Math.random() < 0.35) window.gameAudio.playSpark();
                if (Math.random() < 0.25) window.gameAudio.playRepairHum();

                // Rich repair spark fountain
                emitParticles(this.x + 29, this.y - 26, 3, '#00F0FF', 140, 0.45, 'spark', 180);
                emitParticles(this.x + 29, this.y - 26, 2, '#FFB347', 100, 0.35, 'circle', 120);

                if (this.fixProgress >= 1) {
                    this.completeFix(player);
                }
            } else if (!isNear && this.fixProgress > 0 && this.fixProgress < 1) {
                this.fixProgress = Math.max(0, this.fixProgress - dt * 0.45);
            }
        }

        completeFix(player) {
            this.fixed = true;
            this.fixProgress = 1;

            window.gameAudio.playFixComplete();

            // Hit-stop freeze frame for juice!
            gameState.hitStopTimer = CONFIG.HIT_STOP_DURATION;
            triggerScreenShake(10);

            // Celebration sparks & confetti
            emitParticles(this.x + 29, this.y - 26, 50, '#00FF9D', 240, 1.0, 'circle', 70);
            emitParticles(this.x + 29, this.y - 26, 35, '#00F0FF', 280, 1.2, 'star', 50);

            const bonus = 150 * gameState.level;
            gameState.score += bonus;
            gameState.gameTime = Math.min(120, gameState.gameTime + 14);
            gameState.fixedCount++;

            floatingTexts.push(new FloatingText(this.x - 10, this.y - 50, `+${bonus} ОЧКОВ!`, '#00FF9D', 24));
            floatingTexts.push(new FloatingText(this.x + 5, this.y - 75, `+14 СЕК`, '#FFB347', 17));

            checkLevelProgression();
        }

        draw(ctx, camX, camY) {
            const dx = this.x - camX;
            const dy = this.y - camY;

            // Monitor Stand with Swivel Joint
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(dx + 24, dy - 14, 10, 14);
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.roundRect(dx + 14, dy - 4, 30, 4, 2);
            ctx.fill();

            // CRT Curved Bezel
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.roundRect(dx, dy - 52, this.w, this.h - 10, 8);
            ctx.fill();

            // Bezel Glow Border
            ctx.strokeStyle = this.fixed ? '#00FF9D' : (Math.sin(this.glitchTimer) > 0 ? '#FF3366' : '#991B1B');
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Cathode Curved Screen Interior
            const scrX = dx + 5;
            const scrY = dy - 48;
            const scrW = this.w - 10;
            const scrH = this.h - 18;

            if (this.fixed) {
                // Online Emerald Matrix Screen
                ctx.fillStyle = '#062817';
                ctx.fillRect(scrX, scrY, scrW, scrH);

                // Holographic Screen Glow
                ctx.fillStyle = '#00FF9D';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('ONLINE', scrX + 5, scrY + 14);
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText('✔ BD33', scrX + 5, scrY + 28);

                // Power LED Green
                ctx.fillStyle = '#00FF9D';
                ctx.beginPath();
                ctx.arc(dx + this.w - 8, dy - 8, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Glitching Broken CRT Screen
                ctx.fillStyle = '#26040B';
                ctx.fillRect(scrX, scrY, scrW, scrH);

                // Matrix Glitch Text
                ctx.fillStyle = '#FF3366';
                ctx.font = '10px monospace';
                const glitchStr = (Math.floor(this.glitchTimer) % 2 === 0) ? 'ERR_404' : 'SYSTEM!';
                ctx.fillText(glitchStr, scrX + 4, scrY + 16);

                // Cathode Scanline
                ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
                const scanlineY = scrY + (Math.floor(this.glitchTimer * 12) % scrH);
                ctx.fillRect(scrX, scanlineY, scrW, 2);

                // Power LED Red Flashing
                ctx.fillStyle = (Math.sin(this.glitchTimer * 2) > 0) ? '#FF3366' : '#550011';
                ctx.beginPath();
                ctx.arc(dx + this.w - 8, dy - 8, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Repair Progress Ring / Bar
                if (this.fixProgress > 0) {
                    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
                    ctx.fillRect(dx - 8, dy - 68, this.w + 16, 9);

                    const progGrad = ctx.createLinearGradient(dx - 8, 0, dx + this.w + 8, 0);
                    progGrad.addColorStop(0, '#FFB347');
                    progGrad.addColorStop(1, '#00FF9D');
                    ctx.fillStyle = progGrad;
                    ctx.fillRect(dx - 7, dy - 67, (this.w + 14) * this.fixProgress, 7);

                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(dx - 8, dy - 68, this.w + 16, 9);
                } else {
                    // Floating repair callout
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillText('[SPACE]', dx + 7, dy - 58);
                }
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
            const dx = this.x - camX;
            const dy = this.y - camY;

            // Vintage Metal Cart with Brass Detailing
            ctx.fillStyle = '#475569';
            ctx.fillRect(dx + 5, dy + 6, this.w - 10, this.h - 18);
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.strokeRect(dx + 5, dy + 6, this.w - 10, this.h - 18);

            // Stacks of Encyclopedias Inside Cart (Wobbling with speed)
            const wobble = Math.sin(Date.now() / 80) * 2;
            ctx.fillStyle = '#B91C1C';
            ctx.fillRect(dx + 10, dy + 10 + wobble, 18, 14);
            ctx.fillStyle = '#1D4ED8';
            ctx.fillRect(dx + 30, dy + 8 - wobble, 18, 16);

            // Handlebars
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(dx + 5, dy + 12);
            ctx.lineTo(dx - 5, dy - 5);
            ctx.moveTo(dx + this.w - 5, dy + 12);
            ctx.lineTo(dx + this.w + 5, dy - 5);
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

            drawCartWheel(dx + 14, dy + this.h - 6);
            drawCartWheel(dx + this.w - 14, dy + this.h - 6);
        }
    }

    // Hazard: Flying Rogue Drone Book
    class FlyingBookHazard {
        constructor(x, y, speed, rangeY = 65) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.w = 40;
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
            const dx = this.x - camX;
            const dy = this.y - camY;

            ctx.save();
            ctx.translate(dx + this.w / 2, dy + this.h / 2);

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
            const dx = this.x - camX;
            const dy = this.y - camY;

            ctx.save();
            ctx.translate(dx + 17, dy + 17);

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
            this.w = 48;
            this.h = 60;

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
            this.squashStretch = 1.0;
            this.flipRotation = 0; // for double jump 360° flip
            this.ghostTrails = []; // speed trail silhouettes
        }

        takeDamage() {
            if (this.invulnerableTimer > 0) return;

            if (this.hasShield) {
                this.hasShield = false;
                this.invulnerableTimer = 1.0;
                window.gameAudio.playHit();
                floatingTexts.push(new FloatingText(this.x, this.y - 20, 'ЩИТ РАЗБИТ!', '#00F0FF', 20));
                emitParticles(this.x + 24, this.y + 30, 30, '#00F0FF', 220, 0.8, 'circle', 50);
                return;
            }

            this.lives--;
            this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
            this.vy = -390;
            this.vx = this.facingRight ? -250 : 250;

            window.gameAudio.playHit();
            triggerScreenShake(18);
            gameState.hitStopTimer = CONFIG.HIT_STOP_DURATION;

            emitParticles(this.x + 24, this.y + 30, 40, '#FF3366', 250, 0.9, 'spark', 180);
            updateHUDLives();

            if (this.lives <= 0) {
                triggerGameOver();
            }
        }

        update(dt) {
            if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

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
            if (input.jumpPressed) {
                input.jumpPressed = false;
                if (this.grounded) {
                    this.vy = CONFIG.JUMP_FORCE;
                    this.grounded = false;
                    this.canDoubleJump = true;
                    this.squashStretch = 1.35; // Stretch up
                    window.gameAudio.playJump();
                    emitParticles(this.x + 24, this.y + this.h, 12, 'rgba(255,255,255,0.75)', 100, 0.35, 'circle', 60);
                } else if (this.canDoubleJump) {
                    this.vy = CONFIG.DOUBLE_JUMP_FORCE;
                    this.canDoubleJump = false;
                    this.flipRotation = 0.1; // trigger 360° flip
                    this.squashStretch = 1.25;
                    window.gameAudio.playDoubleJump();
                    emitParticles(this.x + 24, this.y + this.h, 18, '#00F0FF', 160, 0.45, 'spark', 100);
                }
            }

            // Variable jump height
            if (!input.jump && this.vy < -150) {
                this.vy += 1200 * dt;
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
                    this.y + this.h - this.vy * dt <= plat.y + 14 &&
                    this.x + this.w - 10 > plat.x &&
                    this.x + 10 < plat.x + plat.w
                ) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    this.canDoubleJump = true;
                    this.flipRotation = 0;

                    if (!wasGrounded) {
                        this.squashStretch = 0.75; // Squash on impact
                        window.gameAudio.playLand();
                        emitParticles(this.x + 24, this.y + this.h, 8, 'rgba(255,255,255,0.5)', 80, 0.25, 'circle', 40);
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
                }
            }

            // Spring recovery of squash & stretch
            this.squashStretch += (1.0 - this.squashStretch) * 14 * dt;
            this.isFixing = false;
        }

        draw(ctx, camX, camY) {
            if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

            const drawX = this.x - camX;
            const drawY = this.y - camY;
            const cx = drawX + this.w / 2;
            const cy = drawY + this.h / 2;

            // 1. Draw Soft Dynamic Platform Shadow
            ctx.save();
            ctx.fillStyle = 'rgba(5, 8, 20, 0.55)';
            const shadowY = drawY + this.h - 2;
            const shadowScale = Math.max(0.4, 1.0 - Math.abs(this.vy) * 0.001);
            ctx.beginPath();
            ctx.ellipse(cx, shadowY, 20 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. Draw Ghost Trails (Speed Boost)
            for (let trail of this.ghostTrails) {
                ctx.save();
                ctx.globalAlpha = trail.alpha * 0.4;
                const tx = trail.x - camX + this.w / 2;
                const ty = trail.y - camY + this.h / 2;
                ctx.translate(tx, ty);
                if (!trail.facingRight) ctx.scale(-1, 1);
                const spr = loadedImages['cool'] || loadedImages['idle'];
                if (spr && spr.complete) {
                    ctx.drawImage(spr, -30, -35, 60, 70);
                }
                ctx.restore();
            }

            // 3. Draw Player Body with Kinematics
            ctx.save();
            ctx.translate(cx, cy);

            if (!this.facingRight) ctx.scale(-1, 1);
            if (this.flipRotation !== 0) ctx.rotate(this.flipRotation);
            ctx.scale(1 / this.squashStretch, this.squashStretch);

            let spriteKey = 'idle';
            if (this.isFixing) spriteKey = 'thinking';
            else if (this.speedBoostTimer > 0) spriteKey = 'cool';
            else if (!this.grounded) spriteKey = 'idea';
            else if (Math.abs(this.vx) > 30) spriteKey = (Math.sin(this.runAnimTimer) > 0) ? 'smile' : 'idle';

            const spriteImg = loadedImages[spriteKey];
            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                const spriteW = 60;
                const spriteH = 70;
                const bobY = this.grounded ? Math.sin(this.runAnimTimer) * 3 : -3;
                ctx.drawImage(spriteImg, -spriteW / 2, -spriteH / 2 + bobY - 4, spriteW, spriteH);
            } else {
                this.drawProceduralCosmo(ctx);
            }

            // Nano Shield Forcefield
            if (this.hasShield) {
                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, 38 + Math.sin(Date.now() / 140) * 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.restore();

            // 4. Procedural Multi-Branched Lightning Repair Arc
            if (this.isFixing) {
                this.drawProceduralLightningArc(ctx, cx + (this.facingRight ? 20 : -20), cy - 6, this.fixTargetX - camX, this.fixTargetY - camY);
            }
        }

        drawProceduralLightningArc(ctx, x1, y1, x2, y2) {
            ctx.save();
            // Outer Glow Arc
            ctx.strokeStyle = '#00F0FF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 3;

            const drawBolt = (sx, sy, ex, ey, jitter) => {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                const segs = 7;
                for (let i = 1; i < segs; i++) {
                    const t = i / segs;
                    const lx = sx + (ex - sx) * t + (Math.random() - 0.5) * jitter;
                    const ly = sy + (ey - sy) * t + (Math.random() - 0.5) * jitter;
                    ctx.lineTo(lx, ly);
                }
                ctx.lineTo(ex, ey);
                ctx.stroke();
            };

            drawBolt(x1, y1, x2, y2, 18);

            // White-hot inner core
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowBlur = 4;
            ctx.lineWidth = 1.5;
            drawBolt(x1, y1, x2, y2, 8);

            ctx.restore();
        }

        drawProceduralCosmo(ctx) {
            const bounce = this.grounded ? Math.abs(Math.sin(this.runAnimTimer)) * 4 : 0;
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
        }
    }

    // --- GAME STATE MANAGER ---
    const STATE_MENU = 0;
    const STATE_PLAYING = 1;
    const STATE_PAUSED = 2;
    const STATE_LEVEL_WIN = 3;
    const STATE_GAMEOVER = 4;

    const gameState = {
        state: STATE_MENU,
        level: 1,
        score: 0,
        highScore: parseInt(localStorage.getItem('cosmo_runner_highscore') || '0', 10),
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

        // Desks & Shelves
        const shelfHeights = [floorY - 145, floorY - 275, floorY - 395];
        let cx = 240;
        while (cx < gameState.worldWidth - 280) {
            const pw = 190 + Math.random() * 140;
            const hIdx = Math.floor(Math.random() * shelfHeights.length);
            const py = shelfHeights[hIdx];
            const isDesk = (hIdx === 0 && Math.random() < 0.65);

            gameState.platforms.push(new Platform(cx, py, pw, 22, isDesk ? 'desk' : 'shelf'));

            if (hIdx === 0 && Math.random() < 0.75) {
                gameState.platforms.push(new Platform(cx + 30, shelfHeights[1], pw - 60, 20, 'shelf'));
            }

            cx += pw + 90 + Math.random() * 90;
        }

        // Computers
        const validPlats = gameState.platforms.filter(p => p.type !== 'floor');
        const shuffled = [...validPlats].sort(() => Math.random() - 0.5);
        for (let i = 0; i < gameState.targetComputers; i++) {
            const p = shuffled[i % shuffled.length];
            gameState.computers.push(new ComputerTerminal(p.x + p.w / 2 - 29, p.y));
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
                const fy = floorY - 230 - Math.random() * 120;
                gameState.hazards.push(new FlyingBookHazard(fx, fy, (140 + levelNum * 22) * (i % 2 === 0 ? 1 : -1)));
            }
        }

        // Powerups
        const types = ['coffee', 'flash', 'book', 'shield'];
        for (let i = 0; i < 3 + levelNum; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            const px = 300 + Math.random() * (gameState.worldWidth - 600);
            const py = floorY - 180 - Math.random() * 160;
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
                    gameState.player.x + 24,
                    gameState.player.y,
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
        gameState.state = STATE_PLAYING;

        gameState.player = new Player(140, vh - 200);
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
        gameState.player.x = 140;
        gameState.player.y = vh - 200;
        gameState.player.vx = 0;
        gameState.player.vy = 0;

        buildLevel(gameState.level);
    }

    function triggerGameOver() {
        gameState.state = STATE_GAMEOVER;
        window.gameAudio.playGameOver();

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('cosmo_runner_highscore', gameState.highScore);
        }

        document.getElementById('go-final-score').innerText = gameState.score;
        document.getElementById('go-highscore').innerText = gameState.highScore;
        document.getElementById('modal-gameover').classList.remove('hidden');
    }

    function togglePause() {
        if (gameState.state === STATE_PLAYING) {
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

    // --- PARALLAX BACKGROUND ART (GOTHIC WINDOWS & ARCHITECTURE) ---
    function drawParallaxBackground(camX) {
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, vw, vh);

        // Layer 0: Cathedral Gothic Windows & Celestial Starry Aurora Sky (0.05x speed)
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

        if (gameState.state !== STATE_MENU) {
            // Platforms & Bankers Lamps
            for (let plat of gameState.platforms) plat.draw(ctx, gameState.cameraX, gameState.cameraY);

            // Computers
            for (let comp of gameState.computers) comp.draw(ctx, gameState.cameraX, gameState.cameraY);

            // Hazards
            for (let hazard of gameState.hazards) hazard.draw(ctx, gameState.cameraX, gameState.cameraY);

            // Powerups
            for (let item of gameState.powerups) item.draw(ctx, gameState.cameraX, gameState.cameraY);

            // Player (Cosmo)
            if (gameState.player) gameState.player.draw(ctx, gameState.cameraX, gameState.cameraY);

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
