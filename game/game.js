/**
 * COSMO: LIBRARY RUNNER & CYBER FIXER — Main Game Engine
 * AAA Browser Platformer for Aurora Library Portal (biblioteka33.ru)
 */

(function() {
    'use strict';

    // --- GAME CONSTANTS & CONFIG ---
    const CONFIG = {
        GRAVITY: 1450,
        MOVE_SPEED: 380,
        BOOST_SPEED: 580,
        JUMP_FORCE: -620,
        DOUBLE_JUMP_FORCE: -540,
        FIX_TIME_REQUIRED: 1.6, // seconds of holding fix near PC
        INVULNERABLE_DURATION: 1.6,
        MAX_PARTICLES: 350
    };

    // Mascot images dictionary
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

    // Loaded image cache
    const loadedImages = {};
    let imagesReadyCount = 0;
    const totalImages = Object.keys(MASCOT_SPRITES).length;

    function preloadMascotImages() {
        for (const [key, src] of Object.entries(MASCOT_SPRITES)) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loadedImages[key] = img;
                imagesReadyCount++;
            };
            img.onerror = () => {
                // Fallback will handle missing images gracefully
                loadedImages[key] = null;
            };
        }
    }
    preloadMascotImages();

    // --- CANVAS & VIEWPORT SETUP ---
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

    // --- INPUT CONTROLLER ---
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

    // Touch controls binding
    function bindTouchButton(elementId, actionName) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const start = (e) => {
            e.preventDefault();
            el.classList.add('active');
            if (actionName === 'jump') {
                if (!input.jump) input.jumpPressed = true;
                input.jump = true;
                input.up = true;
            } else {
                input[actionName] = true;
            }
            if (window.navigator.vibrate) window.navigator.vibrate(12);
        };

        const end = (e) => {
            e.preventDefault();
            el.classList.remove('active');
            if (actionName === 'jump') {
                input.jump = false;
                input.up = false;
            } else {
                input[actionName] = false;
            }
        };

        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    }

    bindTouchButton('btn-left', 'left');
    bindTouchButton('btn-right', 'right');
    bindTouchButton('btn-jump', 'jump');
    bindTouchButton('btn-fix', 'fix');

    // --- PARTICLE SYSTEM ---
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
            this.shape = 'circle'; // circle, spark, star, square
            this.gravity = 0;
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
            this.alpha = 1;
        }

        update(dt) {
            if (!this.active) return;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vy += this.gravity * dt;
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
                ctx.font = `${Math.floor(this.size * 2)}px sans-serif`;
                ctx.fillText('★', drawX - this.size, drawY + this.size);
            } else if (this.shape === 'square') {
                ctx.fillRect(drawX - this.size / 2, drawY - this.size / 2, this.size, this.size);
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
                    2 + Math.random() * 3,
                    shape,
                    gravity
                );
                spawned++;
                if (spawned >= count) break;
            }
        }
    }

    // Floating text notifications (+150, SPEED UP, etc.)
    class FloatingText {
        constructor(x, y, text, color = '#FFB347', size = 18) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.size = size;
            this.life = 1.2;
            this.maxLife = 1.2;
        }
        update(dt) {
            this.y -= 45 * dt;
            this.life -= dt;
        }
        draw(ctx, camX, camY) {
            const alpha = Math.max(0, this.life / this.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `800 ${this.size}px 'Segoe UI', sans-serif`;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillText(this.text, this.x - camX, this.y - camY);
            ctx.restore();
        }
    }

    let floatingTexts = [];

    // --- GAME ENTITIES ---

    // Platform
    class Platform {
        constructor(x, y, w, h, type = 'shelf') {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.type = type; // 'floor', 'shelf', 'desk'
        }

        draw(ctx, camX, camY) {
            const dx = this.x - camX;
            const dy = this.y - camY;

            if (this.type === 'floor') {
                // Parquet floor with warm dark wood
                ctx.fillStyle = '#141E36';
                ctx.fillRect(dx, dy, this.w, this.h);

                // Floor neon strip
                ctx.fillStyle = '#00F0FF';
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 8;
                ctx.fillRect(dx, dy, this.w, 3);
                ctx.shadowBlur = 0;

                // Floor plank lines
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
                ctx.lineWidth = 1;
                for (let px = 0; px < this.w; px += 80) {
                    ctx.beginPath();
                    ctx.moveTo(dx + px, dy);
                    ctx.lineTo(dx + px, dy + this.h);
                    ctx.stroke();
                }
            } else if (this.type === 'desk') {
                // Polished library desk
                ctx.fillStyle = '#3D2817';
                ctx.fillRect(dx, dy, this.w, this.h);
                ctx.fillStyle = '#654321';
                ctx.fillRect(dx, dy, this.w, 5);

                // Desk legs
                ctx.fillStyle = '#22150C';
                ctx.fillRect(dx + 15, dy + this.h, 12, 120);
                ctx.fillRect(dx + this.w - 27, dy + this.h, 12, 120);

                // Small desk green lamp on edge
                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.arc(dx + 25, dy - 22, 12, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(dx + 23, dy - 10, 4, 10);
            } else {
                // Bookshelf platform
                ctx.fillStyle = '#4A2E18';
                ctx.fillRect(dx, dy, this.w, this.h);
                ctx.fillStyle = '#7A4B27';
                ctx.fillRect(dx, dy, this.w, 4);

                // Decorative books standing on top of platform
                const bookColors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];
                let curX = dx + 10;
                while (curX < dx + this.w - 20) {
                    const bWidth = 8 + (curX % 7);
                    const bHeight = 18 + (curX % 15);
                    const bColor = bookColors[Math.floor((curX * 3) % bookColors.length)];

                    ctx.fillStyle = bColor;
                    ctx.fillRect(curX, dy - bHeight, bWidth, bHeight);

                    // Book spine gold line
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                    ctx.fillRect(curX + 2, dy - bHeight + 4, bWidth - 4, 2);

                    curX += bWidth + 3;
                    if (curX % 85 === 0) curX += 20; // small gap for variety
                }
            }
        }
    }

    // Broken Computer / Interactive Terminal
    class ComputerTerminal {
        constructor(x, y) {
            this.x = x;
            this.y = y; // platform y
            this.w = 56;
            this.h = 48;
            this.fixed = false;
            this.fixProgress = 0; // 0 to 1
            this.glitchTimer = 0;
            this.sparkTimer = 0;
        }

        update(dt, player) {
            if (this.fixed) return;

            this.glitchTimer += dt * 8;
            this.sparkTimer -= dt;

            // Spontaneous sparks from broken computer
            if (this.sparkTimer <= 0) {
                emitParticles(this.x + 28, this.y - 25, 2, '#FF3B69', 80, 0.4, 'spark', 200);
                this.sparkTimer = 0.5 + Math.random() * 0.8;
            }

            // Check if player is near and holding FIX
            const pCenterX = player.x + player.w / 2;
            const cCenterX = this.x + this.w / 2;
            const distance = Math.abs(pCenterX - cCenterX);
            const verticalDist = Math.abs((player.y + player.h) - this.y);

            const isNear = distance < 75 && verticalDist < 35;

            if (isNear && input.fix) {
                player.isFixing = true;
                player.fixTargetX = cCenterX;

                this.fixProgress += dt / CONFIG.FIX_TIME_REQUIRED;

                // Sound & sparks
                if (Math.random() < 0.3) window.gameAudio.playSpark();
                if (Math.random() < 0.25) window.gameAudio.playRepairHum();

                emitParticles(this.x + 28, this.y - 25, 3, '#00F0FF', 120, 0.4, 'spark', 150);
                emitParticles(player.x + (player.facingRight ? 40 : 0), player.y + 25, 2, '#FFB347', 90, 0.3, 'circle', 100);

                if (this.fixProgress >= 1) {
                    this.completeFix(player);
                }
            } else if (!isNear && this.fixProgress > 0 && this.fixProgress < 1) {
                // Slowly decay progress if abandoned
                this.fixProgress = Math.max(0, this.fixProgress - dt * 0.4);
            }
        }

        completeFix(player) {
            this.fixed = true;
            this.fixProgress = 1;

            window.gameAudio.playFixComplete();

            // Burst of emerald and cyan particles
            emitParticles(this.x + 28, this.y - 25, 45, '#00FF9D', 220, 0.9, 'circle', 80);
            emitParticles(this.x + 28, this.y - 25, 30, '#00F0FF', 260, 1.1, 'star', 60);

            // Add score & bonus
            const bonus = 150 * gameState.level;
            gameState.score += bonus;
            gameState.gameTime = Math.min(120, gameState.gameTime + 12); // +12 seconds
            gameState.fixedCount++;

            floatingTexts.push(new FloatingText(this.x, this.y - 45, `+${bonus} PTS`, '#00FF9D', 22));
            floatingTexts.push(new FloatingText(this.x + 10, this.y - 70, `+12 SEC!`, '#FFB347', 16));

            checkLevelProgression();
        }

        draw(ctx, camX, camY) {
            const dx = this.x - camX;
            const dy = this.y - camY;

            // Monitor stand & base
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(dx + 23, dy - 12, 10, 12);
            ctx.fillRect(dx + 14, dy - 4, 28, 4);

            // Monitor bezel
            ctx.fillStyle = '#1A2536';
            ctx.beginPath();
            ctx.roundRect(dx, dy - 50, this.w, this.h - 10, 6);
            ctx.fill();
            ctx.strokeStyle = this.fixed ? '#00FF9D' : (Math.sin(this.glitchTimer) > 0 ? '#FF3B69' : '#881133');
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Screen content
            if (this.fixed) {
                // Clean cyan-green working screen
                ctx.fillStyle = '#06291C';
                ctx.fillRect(dx + 4, dy - 46, this.w - 8, this.h - 18);

                // Online Checkmark & Face
                ctx.fillStyle = '#00FF9D';
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText('ONLINE', dx + 8, dy - 32);
                ctx.font = 'bold 15px sans-serif';
                ctx.fillText('✔ BD33', dx + 8, dy - 18);
            } else {
                // Glitching red broken screen
                ctx.fillStyle = '#2A060E';
                ctx.fillRect(dx + 4, dy - 46, this.w - 8, this.h - 18);

                // Error text or matrix flicker
                ctx.fillStyle = '#FF3B69';
                ctx.font = '10px monospace';
                const glitchStr = (Math.floor(this.glitchTimer) % 2 === 0) ? '!ERR 404!' : '☠ CRASH ☠';
                ctx.fillText(glitchStr, dx + 6, dy - 28);

                // Small glitch static scanlines
                ctx.fillStyle = 'rgba(255, 59, 105, 0.4)';
                const scanY = (dy - 46) + (Math.floor(this.glitchTimer * 10) % 24);
                ctx.fillRect(dx + 4, scanY, this.w - 8, 2);

                // Progress Bar when repairing
                if (this.fixProgress > 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(dx - 5, dy - 64, this.w + 10, 8);

                    const progGrad = ctx.createLinearGradient(dx - 5, 0, dx + this.w + 5, 0);
                    progGrad.addColorStop(0, '#FFB347');
                    progGrad.addColorStop(1, '#00FF9D');

                    ctx.fillStyle = progGrad;
                    ctx.fillRect(dx - 4, dy - 63, (this.w + 8) * this.fixProgress, 6);

                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(dx - 5, dy - 64, this.w + 10, 8);
                } else {
                    // "FIX ME" prompt hovering above
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText('[HOLD SPACE]', dx - 6, dy - 56);
                }
            }
        }
    }

    // Hazard: Rolling Book Cart
    class CartHazard {
        constructor(x, y, speed, minX, maxX) {
            this.x = x;
            this.y = y;
            this.w = 54;
            this.h = 42;
            this.vx = speed;
            this.minX = minX;
            this.maxX = maxX;
            this.wheelAngle = 0;
        }

        update(dt, player) {
            this.x += this.vx * dt;
            this.wheelAngle += (this.vx * dt) * 0.15;

            // Bounce between limits
            if (this.x < this.minX) {
                this.x = this.minX;
                this.vx = Math.abs(this.vx);
            } else if (this.x + this.w > this.maxX) {
                this.x = this.maxX - this.w;
                this.vx = -Math.abs(this.vx);
            }

            // Player collision
            if (checkAABB(player, this)) {
                player.takeDamage();
            }
        }

        draw(ctx, camX, camY) {
            const dx = this.x - camX;
            const dy = this.y - camY;

            // Metal cart frame
            ctx.fillStyle = '#5A6B82';
            ctx.fillRect(dx + 4, dy + 6, this.w - 8, this.h - 18);
            ctx.strokeStyle = '#8FA3BF';
            ctx.lineWidth = 2;
            ctx.strokeRect(dx + 4, dy + 6, this.w - 8, this.h - 18);

            // Stack of books inside cart
            ctx.fillStyle = '#C0392B';
            ctx.fillRect(dx + 8, dy + 10, 18, 14);
            ctx.fillStyle = '#2980B9';
            ctx.fillRect(dx + 28, dy + 8, 16, 16);

            // Handlebars
            ctx.strokeStyle = '#BDC3C7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(dx + 4, dy + 10);
            ctx.lineTo(dx - 4, dy - 4);
            ctx.moveTo(dx + this.w - 4, dy + 10);
            ctx.lineTo(dx + this.w + 4, dy - 4);
            ctx.stroke();

            // Wheels
            const drawWheel = (wx, wy) => {
                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(this.wheelAngle);
                ctx.fillStyle = '#2C3E50';
                ctx.beginPath();
                ctx.arc(0, 0, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#E74C3C';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-6, 0);
                ctx.lineTo(6, 0);
                ctx.moveTo(0, -6);
                ctx.lineTo(0, 6);
                ctx.stroke();
                ctx.restore();
            };

            drawWheel(dx + 12, dy + this.h - 6);
            drawWheel(dx + this.w - 12, dy + this.h - 6);
        }
    }

    // Hazard: Flying Rogue Drone Book
    class FlyingBookHazard {
        constructor(x, y, speed, rangeY = 60) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.w = 36;
            this.h = 24;
            this.vx = speed;
            this.rangeY = rangeY;
            this.timer = Math.random() * 10;
        }

        update(dt, player) {
            this.timer += dt * 4;
            this.x += this.vx * dt;
            this.y = this.startY + Math.sin(this.timer) * this.rangeY;

            // Turn around when traveling too far
            if (this.x < 100) this.vx = Math.abs(this.vx);
            if (this.x > gameState.worldWidth - 100) this.vx = -Math.abs(this.vx);

            // Player collision
            if (checkAABB(player, this)) {
                player.takeDamage();
            }
        }

        draw(ctx, camX, camY) {
            const dx = this.x - camX;
            const dy = this.y - camY;

            ctx.save();
            ctx.translate(dx + this.w / 2, dy + this.h / 2);

            const wingFlap = Math.sin(this.timer * 3) * 0.35;
            ctx.rotate(wingFlap);

            // Book spine & cover
            ctx.fillStyle = '#8E44AD';
            ctx.fillRect(-16, -10, 32, 20);

            // Glowing magical pages
            ctx.fillStyle = '#F4D03F';
            ctx.shadowColor = '#F4D03F';
            ctx.shadowBlur = 8;
            ctx.fillRect(-13, -7, 26, 14);

            // Red rogue cyber eye on the book cover
            ctx.fillStyle = '#FF3B69';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Collectible Power-ups
    class PowerupItem {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.w = 32;
            this.h = 32;
            this.type = type; // 'coffee', 'flash', 'book', 'shield'
            this.startY = y;
            this.timer = Math.random() * 10;
            this.collected = false;
        }

        update(dt, player) {
            if (this.collected) return;

            this.timer += dt * 3.5;
            this.y = this.startY + Math.sin(this.timer) * 8;

            if (checkAABB(player, this)) {
                this.collect(player);
            }
        }

        collect(player) {
            this.collected = true;
            window.gameAudio.playPowerup(this.type);

            if (this.type === 'coffee') {
                player.speedBoostTimer = 7.0; // 7 seconds
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '☕ ТУРБО ЭСПРЕССО!', '#FFB347', 20));
                emitParticles(this.x, this.y, 25, '#FFB347', 180, 0.8, 'star', 50);
            } else if (this.type === 'flash') {
                // Auto fix nearest broken computer!
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
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, '💾 АВТО-ФИКС ПК!', '#00F0FF', 20));
                } else {
                    gameState.score += 300;
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, '+300 ОЧКОВ!', '#00F0FF', 20));
                }
                emitParticles(this.x, this.y, 30, '#00F0FF', 200, 0.8, 'spark', 40);
            } else if (this.type === 'book') {
                gameState.gameTime += 18;
                gameState.score += 200;
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '📚 +18 СЕКУНД!', '#00FF9D', 20));
                emitParticles(this.x, this.y, 25, '#00FF9D', 160, 0.8, 'circle', 60);
            } else if (this.type === 'shield') {
                player.hasShield = true;
                floatingTexts.push(new FloatingText(this.x, this.y - 20, '🛡️ НАНО-ЩИТ!', '#00F0FF', 20));
                emitParticles(this.x, this.y, 30, '#00F0FF', 180, 0.9, 'circle', 30);
            }
        }

        draw(ctx, camX, camY) {
            if (this.collected) return;

            const dx = this.x - camX;
            const dy = this.y - camY;

            ctx.save();
            ctx.translate(dx + 16, dy + 16);

            // Glowing ring aura
            ctx.beginPath();
            ctx.arc(0, 0, 20 + Math.sin(this.timer * 2) * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.fill();
            ctx.strokeStyle = this.type === 'coffee' ? '#FFB347' : '#00F0FF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Emoji / Icon
            ctx.font = '22px sans-serif';
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

    // --- PLAYER (COSMO) ---
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.w = 46;
            this.h = 58;

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

            this.runAnimTimer = 0;
            this.squashStretch = 1; // scale Y
        }

        takeDamage() {
            if (this.invulnerableTimer > 0) return;

            if (this.hasShield) {
                this.hasShield = false;
                this.invulnerableTimer = 1.0;
                window.gameAudio.playHit();
                floatingTexts.push(new FloatingText(this.x, this.y - 20, 'ЩИТ РАЗБИТ!', '#00F0FF', 18));
                emitParticles(this.x + 23, this.y + 29, 30, '#00F0FF', 220, 0.8, 'circle', 50);
                return;
            }

            this.lives--;
            this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
            this.vy = -380;
            this.vx = this.facingRight ? -240 : 240;

            window.gameAudio.playHit();
            triggerScreenShake(16);

            emitParticles(this.x + 23, this.y + 29, 35, '#FF3B69', 240, 0.9, 'spark', 180);
            updateHUDLives();

            if (this.lives <= 0) {
                triggerGameOver();
            }
        }

        update(dt) {
            // Invulnerability countdown
            if (this.invulnerableTimer > 0) {
                this.invulnerableTimer -= dt;
            }

            // Speed boost countdown
            let currentMoveSpeed = CONFIG.MOVE_SPEED;
            if (this.speedBoostTimer > 0) {
                this.speedBoostTimer -= dt;
                currentMoveSpeed = CONFIG.BOOST_SPEED;
                // Emit golden speed lines
                if (Math.random() < 0.4) {
                    emitParticles(this.x + (this.facingRight ? 0 : 46), this.y + 30 + Math.random() * 20, 2, '#FFB347', 60, 0.3, 'circle', 0);
                }
            }

            // Horizontal Input & Acceleration
            let moveDir = 0;
            if (input.left) moveDir -= 1;
            if (input.right) moveDir += 1;

            if (this.isFixing) {
                // If actively fixing, slow down / anchor player
                this.vx *= 0.7;
            } else {
                if (moveDir !== 0) {
                    this.vx = moveDir * currentMoveSpeed;
                    this.facingRight = moveDir > 0;
                    this.runAnimTimer += dt * (this.speedBoostTimer > 0 ? 18 : 12);
                } else {
                    this.vx *= 0.65; // friction
                    if (Math.abs(this.vx) < 5) this.vx = 0;
                    this.runAnimTimer = 0;
                }
            }

            // Gravity
            this.vy += CONFIG.GRAVITY * dt;

            // Jumping Logic
            if (input.jumpPressed) {
                input.jumpPressed = false;
                if (this.grounded) {
                    this.vy = CONFIG.JUMP_FORCE;
                    this.grounded = false;
                    this.canDoubleJump = true;
                    this.squashStretch = 1.3;
                    window.gameAudio.playJump();
                    emitParticles(this.x + 23, this.y + this.h, 10, 'rgba(255,255,255,0.7)', 90, 0.3, 'circle', 60);
                } else if (this.canDoubleJump) {
                    // Double Jump!
                    this.vy = CONFIG.DOUBLE_JUMP_FORCE;
                    this.canDoubleJump = false;
                    this.squashStretch = 1.25;
                    window.gameAudio.playDoubleJump();
                    emitParticles(this.x + 23, this.y + this.h, 15, '#00F0FF', 140, 0.4, 'spark', 100);
                }
            }

            // Variable Jump Height (releasing jump cuts upward velocity)
            if (!input.jump && this.vy < -150) {
                this.vy += 1200 * dt;
            }

            // Position Integration
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // World bounds clamp
            if (this.x < 0) {
                this.x = 0;
                this.vx = 0;
            } else if (this.x + this.w > gameState.worldWidth) {
                this.x = gameState.worldWidth - this.w;
                this.vx = 0;
            }

            // Platform Collision Detection
            const wasGrounded = this.grounded;
            this.grounded = false;

            for (let plat of gameState.platforms) {
                // One-way landing collision (falling downward onto platform top)
                if (
                    this.vy > 0 &&
                    this.y + this.h >= plat.y &&
                    this.y + this.h - this.vy * dt <= plat.y + 12 &&
                    this.x + this.w - 8 > plat.x &&
                    this.x + 8 < plat.x + plat.w
                ) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    this.canDoubleJump = true;

                    // Landing impact effect
                    if (!wasGrounded) {
                        this.squashStretch = 0.8; // Squash on impact
                        window.gameAudio.playLand();
                        emitParticles(this.x + 23, this.y + this.h, 6, 'rgba(255,255,255,0.5)', 70, 0.25, 'circle', 40);
                    }
                    break;
                }
            }

            // Floor Clamp (bottom of world)
            const floorY = vh - 55;
            if (this.y + this.h >= floorY) {
                this.y = floorY - this.h;
                this.vy = 0;
                this.grounded = true;
                this.canDoubleJump = true;
                if (!wasGrounded) {
                    this.squashStretch = 0.8;
                    window.gameAudio.playLand();
                }
            }

            // Smooth squash & stretch recovery back to 1.0
            this.squashStretch += (1.0 - this.squashStretch) * 12 * dt;

            // Reset fixing flag each frame (will be re-enabled if ComputerTerminal updates it)
            this.isFixing = false;
        }

        draw(ctx, camX, camY) {
            // Blinking when invulnerable
            if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
                return;
            }

            const drawX = this.x - camX;
            const drawY = this.y - camY;
            const cx = drawX + this.w / 2;
            const cy = drawY + this.h / 2;

            ctx.save();
            ctx.translate(cx, cy);

            // Facing direction flip
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }

            // Squash & stretch scale
            ctx.scale(1 / this.squashStretch, this.squashStretch);

            // Determine mascot sprite based on state
            let spriteKey = 'idle';
            if (this.isFixing) {
                spriteKey = 'thinking';
            } else if (this.speedBoostTimer > 0) {
                spriteKey = 'cool';
            } else if (!this.grounded) {
                spriteKey = 'idea';
            } else if (Math.abs(this.vx) > 30) {
                spriteKey = (Math.sin(this.runAnimTimer) > 0) ? 'smile' : 'idle';
            }

            const spriteImg = loadedImages[spriteKey];

            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                // High-resolution real mascot sprite
                const spriteW = 58;
                const spriteH = 68;

                // Subtle bobbing
                const bobY = this.grounded ? Math.sin(this.runAnimTimer) * 3 : -3;

                ctx.drawImage(spriteImg, -spriteW / 2, -spriteH / 2 + bobY - 4, spriteW, spriteH);
            } else {
                // Procedural Vector Robot Fallback
                this.drawProceduralCosmo(ctx);
            }

            // Energy Shield Forcefield
            if (this.hasShield) {
                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(0, 0, 36 + Math.sin(Date.now() / 150) * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            ctx.restore();

            // Draw electric repair arc beam from Cosmo to the computer when fixing
            if (this.isFixing) {
                ctx.save();
                ctx.strokeStyle = '#00F0FF';
                ctx.shadowColor = '#00F0FF';
                ctx.shadowBlur = 10;
                ctx.lineWidth = 2;

                const startX = cx + (this.facingRight ? 18 : -18);
                const startY = cy - 6;
                const targetX = this.fixTargetX - camX;
                const targetY = drawY + 12;

                ctx.beginPath();
                ctx.moveTo(startX, startY);

                // Jagged lightning path
                const steps = 6;
                for (let i = 1; i < steps; i++) {
                    const t = i / steps;
                    const lx = startX + (targetX - startX) * t + (Math.random() - 0.5) * 16;
                    const ly = startY + (targetY - startY) * t + (Math.random() - 0.5) * 14;
                    ctx.lineTo(lx, ly);
                }
                ctx.lineTo(targetX, targetY);
                ctx.stroke();
                ctx.restore();
            }
        }

        drawProceduralCosmo(ctx) {
            // White body with green accents
            const bounce = this.grounded ? Math.abs(Math.sin(this.runAnimTimer)) * 4 : 0;

            // Body
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, -6 + bounce, 22, 0, Math.PI * 2);
            ctx.fill();

            // Emerald chest & ears
            ctx.fillStyle = '#00FF9D';
            ctx.beginPath();
            ctx.arc(0, 6 + bounce, 16, 0, Math.PI);
            ctx.fill();

            // Black visor
            ctx.fillStyle = '#090E1A';
            ctx.beginPath();
            ctx.roundRect(-14, -16 + bounce, 28, 18, 5);
            ctx.fill();

            // Yellow glowing eyes
            ctx.fillStyle = '#FFD15C';
            ctx.shadowColor = '#FFD15C';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(-6, -8 + bounce, 4, 0, Math.PI * 2);
            ctx.arc(6, -8 + bounce, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Antenna
            ctx.strokeStyle = '#9BB0D4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -28 + bounce);
            ctx.lineTo(0, -38 + bounce);
            ctx.stroke();

            ctx.fillStyle = this.isFixing ? '#FF3B69' : '#00F0FF';
            ctx.beginPath();
            ctx.arc(0, -40 + bounce, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- GAME STATE & LEVEL MANAGER ---
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
        player: null,
        platforms: [],
        computers: [],
        hazards: [],
        powerups: []
    };

    function triggerScreenShake(magnitude = 12) {
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

    // Level Generation
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

        // Level Theme Metadata
        const levelNames = [
            'Уровень 1: Читальный зал ЦГБ',
            'Уровень 2: Хранилище «Добролит»',
            'Уровень 3: Серверный Бункер АВРОРЫ',
            `Сектор ${levelNum}: Кибер-Архивы`
        ];
        document.getElementById('ui-level-name').innerText = levelNames[Math.min(levelNum - 1, levelNames.length - 1)];

        // 1. Base Floor Platform
        gameState.platforms.push(new Platform(0, floorY, gameState.worldWidth, 60, 'floor'));

        // 2. Study Desks & Bookshelves Platforms
        const shelfHeights = [floorY - 140, floorY - 260, floorY - 380];

        let cursorX = 220;
        while (cursorX < gameState.worldWidth - 280) {
            const platWidth = 180 + Math.random() * 140;
            const hIndex = Math.floor(Math.random() * shelfHeights.length);
            const platY = shelfHeights[hIndex];
            const isDesk = (hIndex === 0 && Math.random() < 0.6);

            gameState.platforms.push(new Platform(cursorX, platY, platWidth, 20, isDesk ? 'desk' : 'shelf'));

            // Secondary higher shelf above it
            if (hIndex === 0 && Math.random() < 0.7) {
                gameState.platforms.push(new Platform(cursorX + 30, shelfHeights[1], platWidth - 60, 18, 'shelf'));
            }

            cursorX += platWidth + 90 + Math.random() * 80;
        }

        // 3. Place Target Computers on Desks / Platforms
        // Filter platforms that have enough space
        const validPlats = gameState.platforms.filter(p => p.type !== 'floor');
        const shuffledPlats = [...validPlats].sort(() => Math.random() - 0.5);

        for (let i = 0; i < gameState.targetComputers; i++) {
            const p = shuffledPlats[i % shuffledPlats.length];
            const compX = p.x + p.w / 2 - 28;
            gameState.computers.push(new ComputerTerminal(compX, p.y));
        }

        // 4. Spawn Hazards
        // Rolling Carts on the floor
        const numCarts = 1 + Math.floor(levelNum * 0.8);
        for (let i = 0; i < numCarts; i++) {
            const segW = gameState.worldWidth / numCarts;
            const minX = i * segW + 150;
            const maxX = (i + 1) * segW - 150;
            const speed = (130 + levelNum * 25) * (Math.random() < 0.5 ? 1 : -1);
            gameState.hazards.push(new CartHazard(minX + 50, floorY - 42, speed, minX, maxX));
        }

        // Flying Drone Books for Level 2+
        if (levelNum >= 2) {
            const numFlying = levelNum;
            for (let i = 0; i < numFlying; i++) {
                const fx = 400 + (i * 700) + Math.random() * 200;
                const fy = floorY - 220 - Math.random() * 120;
                gameState.hazards.push(new FlyingBookHazard(fx, fy, (140 + levelNum * 20) * (i % 2 === 0 ? 1 : -1)));
            }
        }

        // 5. Spawn Power-ups
        const powerupTypes = ['coffee', 'flash', 'book', 'shield'];
        for (let i = 0; i < 3 + levelNum; i++) {
            const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            const px = 300 + Math.random() * (gameState.worldWidth - 600);
            const py = floorY - 180 - Math.random() * 160;
            gameState.powerups.push(new PowerupItem(px, py, type));
        }

        updateHUDObjectives();
    }

    function checkLevelProgression() {
        updateHUDObjectives();

        if (gameState.fixedCount >= gameState.targetComputers) {
            // Level Completed!
            gameState.state = STATE_LEVEL_WIN;
            window.gameAudio.playLevelWin();

            // Confetti explosion
            for (let i = 0; i < 90; i++) {
                const colors = ['#00F0FF', '#FFB347', '#00FF9D', '#FF3B69', '#E056FD'];
                emitParticles(
                    gameState.player.x + 23,
                    gameState.player.y,
                    1,
                    colors[Math.floor(Math.random() * colors.length)],
                    280,
                    1.4,
                    'star',
                    120
                );
            }

            // Show level win modal
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

    // --- GAME FLOW (START, PAUSE, WIN, RESTART) ---

    function startGame() {
        window.gameAudio.init();
        window.gameAudio.resume();
        window.gameAudio.startMusic();

        gameState.level = 1;
        gameState.score = 0;
        gameState.state = STATE_PLAYING;

        gameState.player = new Player(120, vh - 200);
        buildLevel(gameState.level);
        updateHUDLives();

        document.getElementById('modal-start').classList.add('hidden');
        document.getElementById('modal-gameover').classList.add('hidden');
        document.getElementById('modal-win').classList.add('hidden');
        document.getElementById('modal-pause').classList.add('hidden');
    }

    function nextLevel() {
        gameState.level++;
        gameState.score += Math.floor(gameState.gameTime) * 10; // Time conversion to score
        gameState.state = STATE_PLAYING;

        document.getElementById('modal-win').classList.add('hidden');
        gameState.player.x = 120;
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

    // Modal button bindings
    document.getElementById('btn-play-start')?.addEventListener('click', startGame);
    document.getElementById('btn-next-level')?.addEventListener('click', nextLevel);
    document.getElementById('btn-restart')?.addEventListener('click', startGame);
    document.getElementById('btn-resume')?.addEventListener('click', togglePause);
    document.getElementById('btn-pause')?.addEventListener('click', togglePause);
    document.getElementById('btn-mute')?.addEventListener('click', toggleMuteUI);

    // --- MAIN RENDER & PARALLAX BACKGROUND ---

    function drawParallaxBackground(camX) {
        // Clear background
        ctx.fillStyle = '#060A17';
        ctx.fillRect(0, 0, vw, vh);

        // Layer 0: Cosmic Night Sky Through Giant Stained Glass Arch Windows (0.05x speed)
        const skyX = -(camX * 0.05) % 800;
        ctx.save();
        ctx.fillStyle = '#091026';
        for (let wx = skyX - 800; wx < vw + 800; wx += 420) {
            // Arched Gothic/Modern Library Window
            ctx.beginPath();
            ctx.arc(wx + 100, vh - 380, 80, Math.PI, 0);
            ctx.lineTo(wx + 180, vh - 100);
            ctx.lineTo(wx + 20, vh - 100);
            ctx.closePath();
            ctx.fillStyle = '#0D1738';
            ctx.fill();

            // Stars inside window
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(wx + 60, vh - 360, 2, 2);
            ctx.fillRect(wx + 120, vh - 390, 3, 3);
            ctx.fillRect(wx + 140, vh - 340, 2, 2);
        }
        ctx.restore();

        // Layer 1: Huge Distant Bookshelves (0.25x speed)
        const shelfX = -(camX * 0.25) % 600;
        ctx.fillStyle = '#101B36';
        for (let sx = shelfX - 600; sx < vw + 600; sx += 320) {
            ctx.fillRect(sx, vh - 480, 260, 430);

            // Subtle book silhouettes
            ctx.fillStyle = '#17274D';
            for (let row = 0; row < 5; row++) {
                ctx.fillRect(sx + 10, vh - 460 + row * 80, 240, 70);
            }
            ctx.fillStyle = '#101B36';
        }

        // Layer 2: Midground Library Neon Signs & Branch Banners (0.5x speed)
        const bannerX = -(camX * 0.5) % 1200;
        const bannerNames = ['ЦГБ ВЛАДИМИР', 'ФИЛИАЛ №9 ДОБРОЛИТ', 'ФИЛИАЛ №13 КНИГОЛЕНД', 'СИСТЕМА АВРОРА'];
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        for (let bx = bannerX - 1200; bx < vw + 1200; bx += 700) {
            const idx = Math.abs(Math.floor(bx / 700)) % bannerNames.length;
            ctx.fillText(`«${bannerNames[idx]}»`, bx + 120, vh - 330);
        }
    }

    // --- GAME LOOP ---
    let lastTimestamp = performance.now();

    function gameLoop(currentTimestamp) {
        const dt = Math.min((currentTimestamp - lastTimestamp) / 1000, 0.05); // cap delta
        lastTimestamp = currentTimestamp;

        // 1. UPDATE
        if (gameState.state === STATE_PLAYING) {
            gameState.gameTime -= dt;

            // Timer display update
            const timerEl = document.getElementById('ui-timer');
            if (timerEl) {
                const mins = Math.floor(Math.max(0, gameState.gameTime) / 60);
                const secs = Math.floor(Math.max(0, gameState.gameTime) % 60);
                timerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                if (gameState.gameTime <= 15) {
                    timerEl.classList.add('urgent');
                } else {
                    timerEl.classList.remove('urgent');
                }
            }

            if (gameState.gameTime <= 0) {
                triggerGameOver();
            }

            // Update Player
            gameState.player.update(dt);

            // Update Computers
            for (let comp of gameState.computers) {
                comp.update(dt, gameState.player);
            }

            // Update Hazards
            for (let hazard of gameState.hazards) {
                hazard.update(dt, gameState.player);
            }

            // Update Powerups
            for (let item of gameState.powerups) {
                item.update(dt, gameState.player);
            }

            // Update Particles
            for (let p of particlePool) {
                if (p.active) p.update(dt);
            }

            // Update Floating Texts
            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                floatingTexts[i].update(dt);
                if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
            }

            // Camera Tracking (Smooth Lerp)
            const targetCamX = gameState.player.x - vw * 0.35;
            gameState.cameraX += (targetCamX - gameState.cameraX) * 8 * dt;
            gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameState.worldWidth - vw));

            // Screen Shake Decay
            if (gameState.screenShake > 0) {
                gameState.screenShake = Math.max(0, gameState.screenShake - dt * 45);
            }
        }

        // 2. RENDER
        ctx.save();

        // Apply Screen Shake
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (gameState.screenShake > 0) {
            shakeOffsetX = (Math.random() - 0.5) * gameState.screenShake;
            shakeOffsetY = (Math.random() - 0.5) * gameState.screenShake;
            ctx.translate(shakeOffsetX, shakeOffsetY);
        }

        // Parallax Layers
        drawParallaxBackground(gameState.cameraX);

        if (gameState.state !== STATE_MENU) {
            // Draw Platforms
            for (let plat of gameState.platforms) {
                plat.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Computers
            for (let comp of gameState.computers) {
                comp.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Hazards
            for (let hazard of gameState.hazards) {
                hazard.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Powerups
            for (let item of gameState.powerups) {
                item.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Player
            if (gameState.player) {
                gameState.player.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Particles
            for (let p of particlePool) {
                if (p.active) p.draw(ctx, gameState.cameraX, gameState.cameraY);
            }

            // Draw Floating Texts
            for (let ft of floatingTexts) {
                ft.draw(ctx, gameState.cameraX, gameState.cameraY);
            }
        }

        ctx.restore();

        requestAnimationFrame(gameLoop);
    }

    // Launch Loop
    requestAnimationFrame(gameLoop);

    // Expose control to window for debug or integration
    window.CosmoGame = {
        start: startGame,
        pause: togglePause
    };

})();
