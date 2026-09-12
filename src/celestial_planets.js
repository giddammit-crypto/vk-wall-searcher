/**
 * src/celestial_planets.js — Photorealistic 3D Earth & Moon Celestial Engine
 * ============================================================================
 * Разработка: 3D Разработчик игр, Ведущий 3D Дизайнер, Инженер 3D игр
 *
 * Особенности:
 * - Реальные текстуры NASA (Blue Marble Day, City Night Lights, Atmospheric Clouds, Lunar Surface)
 * - 3D сферический рейкастинг с нормалями и углами освещения
 * - Плавное непрерывное аксиальное вращение Земли и Луны
 * - Независимый дрейф облачного слоя атмосферы Земли
 * - Ночная сторона с мягким свечением огней ночных городов
 * - Рэлеевское рассеяние атмосферы (голубой светящийся лимб / ореол)
 * - Полная синхронизация со сферической 360° камерой космоса (Yaw, Pitch, Zoom)
 * ============================================================================
 */

export class CelestialPlanetsEngine {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;

        // Rotation & orbit states
        this.earthRot = 0.85;
        this.cloudsRot = 0.90;
        this.moonRot = 0.30;
        this.moonOrbit = 0;

        // Planet radii (pixels in offscreen buffer)
        this.earthRadius = 480;
        this.moonRadius = 75;

        // Offscreen render canvases
        this.earthCanvas = null;
        this.earthCtx = null;
        this.moonCanvas = null;
        this.moonCtx = null;

        // Texture data buffers (Uint32Array for high-speed direct memory sampling)
        this.dayBuffer = null;
        this.nightBuffer = null;
        this.cloudsBuffer = null;
        this.moonBuffer = null;
        this.texW = 512;
        this.texH = 256;

        // Precomputed Look-Up Tables (LUT)
        this.earthLut = null;
        this.earthNormals = null;
        this.moonLut = null;
        this.moonNormals = null;

        // Celestial coordinates in space (degrees & distance)
        // Earth is large and situated UNDER the user (yaw: 0°, pitch: -48°)
        this.earthCoords = { yaw: 0, pitch: -48, dist: 1350 };
        // Moon is much smaller and situated BEHIND the user (baseYaw: 180°, basePitch: 20°)
        this.moonCoords = { baseYaw: 180, basePitch: 20, dist: 1850 };

        // Sun light direction in celestial space (normalized vector)
        this.sunDir = { x: 0.72, y: 0.28, z: 0.63 };
        const sLen = Math.hypot(this.sunDir.x, this.sunDir.y, this.sunDir.z) || 1;
        this.sunDir.x /= sLen;
        this.sunDir.y /= sLen;
        this.sunDir.z /= sLen;

        // Frame throttle to maintain solid 60 FPS
        this.tick = 0;
        this.lastRenderTime = 0;
    }

    /**
     * Инициализация и загрузка реальных текстур NASA
     */
    init() {
        if (this.isLoaded || this.isLoading) return;
        this.isLoading = true;

        this.initOffscreenCanvases();
        this.buildLookUpTables();
        this.loadTextures();
    }

    initOffscreenCanvases() {
        // Earth canvas
        const eD = this.earthRadius * 2;
        this.earthCanvas = document.createElement('canvas');
        this.earthCanvas.width = eD;
        this.earthCanvas.height = eD;
        this.earthCtx = this.earthCanvas.getContext('2d', { willReadFrequently: true });

        // Moon canvas
        const mD = this.moonRadius * 2;
        this.moonCanvas = document.createElement('canvas');
        this.moonCanvas.width = mD;
        this.moonCanvas.height = mD;
        this.moonCtx = this.moonCanvas.getContext('2d', { willReadFrequently: true });
    }

    buildLookUpTables() {
        // 1. Earth LUT & Normals
        const eD = this.earthRadius * 2;
        const eTotal = eD * eD;
        this.earthLut = new Float32Array(eTotal * 2); // [lon, lat]
        this.earthNormals = new Float32Array(eTotal * 3); // [nx, ny, nz]

        const tilt = 0.41; // 23.5° axial tilt
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);

        for (let y = 0; y < eD; y++) {
            const ny = (y - this.earthRadius) / this.earthRadius;
            const ny2 = ny * ny;
            for (let x = 0; x < eD; x++) {
                const nx = (x - this.earthRadius) / this.earthRadius;
                const r2 = nx * nx + ny2;
                const idx = y * eD + x;
                const lutIdx = idx * 2;
                const normIdx = idx * 3;

                if (r2 <= 1.0) {
                    const nz = Math.sqrt(1.0 - r2);
                    // Tilted polar coordinate frame
                    const rx = nx;
                    const ry = ny * cosT - nz * sinT;
                    const rz = ny * sinT + nz * cosT;

                    this.earthLut[lutIdx] = Math.atan2(rx, rz);
                    this.earthLut[lutIdx + 1] = Math.asin(Math.max(-1.0, Math.min(1.0, ry)));

                    this.earthNormals[normIdx] = nx;
                    this.earthNormals[normIdx + 1] = ny;
                    this.earthNormals[normIdx + 2] = nz;
                } else {
                    this.earthLut[lutIdx] = -999;
                }
            }
        }

        // 2. Moon LUT & Normals
        const mD = this.moonRadius * 2;
        const mTotal = mD * mD;
        this.moonLut = new Float32Array(mTotal * 2);
        this.moonNormals = new Float32Array(mTotal * 3);

        for (let y = 0; y < mD; y++) {
            const ny = (y - this.moonRadius) / this.moonRadius;
            const ny2 = ny * ny;
            for (let x = 0; x < mD; x++) {
                const nx = (x - this.moonRadius) / this.moonRadius;
                const r2 = nx * nx + ny2;
                const idx = y * mD + x;
                const lutIdx = idx * 2;
                const normIdx = idx * 3;

                if (r2 <= 1.0) {
                    const nz = Math.sqrt(1.0 - r2);
                    this.moonLut[lutIdx] = Math.atan2(nx, nz);
                    this.moonLut[lutIdx + 1] = Math.asin(Math.max(-1.0, Math.min(1.0, ny)));

                    this.moonNormals[normIdx] = nx;
                    this.moonNormals[normIdx + 1] = ny;
                    this.moonNormals[normIdx + 2] = nz;
                } else {
                    this.moonLut[lutIdx] = -999;
                }
            }
        }
    }

    loadTextures() {
        const loadImgBuffer = (src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = this.texW;
                    c.height = this.texH;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, this.texW, this.texH);
                    const imgData = ctx.getImageData(0, 0, this.texW, this.texH);
                    resolve(new Uint32Array(imgData.data.buffer));
                };
                img.onerror = () => {
                    console.warn('[CelestialPlanets] Fallback for texture:', src);
                    resolve(this.createFallbackTexture(src));
                };
                img.src = src;
            });
        };

        Promise.all([
            loadImgBuffer('assets/textures/earth_day.jpg'),
            loadImgBuffer('assets/textures/earth_night.png'),
            loadImgBuffer('assets/textures/earth_clouds.png'),
            loadImgBuffer('assets/textures/moon.jpg')
        ]).then(([day, night, clouds, moon]) => {
            this.dayBuffer = day;
            this.nightBuffer = night;
            this.cloudsBuffer = clouds;
            this.moonBuffer = moon;
            this.isLoaded = true;
            this.isLoading = false;
            console.log('[CelestialPlanets] Real NASA Earth & Moon textures loaded.');
        }).catch(err => {
            console.warn('[CelestialPlanets] Error loading textures:', err);
            this.isLoading = false;
        });
    }

    /**
     * Генерация процедурной текстуры в случае сбоя сети
     */
    createFallbackTexture(type) {
        const total = this.texW * this.texH;
        const buf = new Uint32Array(total);
        const isMoon = type.includes('moon');
        const isNight = type.includes('night');
        const isClouds = type.includes('clouds');

        for (let y = 0; y < this.texH; y++) {
            const v = y / this.texH;
            for (let x = 0; x < this.texW; x++) {
                const u = x / this.texW;
                let r = 0, g = 0, b = 0;

                if (isMoon) {
                    const n = Math.sin(u * 28) * Math.cos(v * 18) * 25 + 140;
                    r = g = b = Math.max(0, Math.min(255, n));
                } else if (isNight) {
                    const n = Math.sin(u * 32) * Math.sin(v * 20);
                    if (n > 0.6) { r = 255; g = 200; b = 100; }
                } else if (isClouds) {
                    const n = Math.sin(u * 14 + Math.sin(v * 8)) * Math.cos(v * 12);
                    const c = n > 0.2 ? Math.floor(n * 220) : 0;
                    r = g = b = c;
                } else {
                    // Earth Day
                    const n = Math.sin(u * 10) * Math.cos(v * 8) + Math.sin(u * 20) * 0.3;
                    if (n > 0.1) { r = 34; g = 139; b = 34; }
                    else { r = 15; g = 50; b = 140; }
                }

                buf[y * this.texW + x] = 0xff000000 | (b << 16) | (g << 8) | r;
            }
        }
        return buf;
    }

    /**
     * Отрисовка Земли в оффскрин-буфер с реалистичным освещением
     */
    updateEarthBuffer() {
        if (!this.earthCtx || !this.dayBuffer) return;

        const d = this.earthRadius * 2;
        const imgData = this.earthCtx.createImageData(d, d);
        const outBuf = new Uint32Array(imgData.data.buffer);

        const lx = this.sunDir.x;
        const ly = this.sunDir.y;
        const lz = this.sunDir.z;

        const wMask = this.texW - 1;
        const hMask = this.texH - 1;
        const tw = this.texW;

        const twoPi = Math.PI * 2;
        const invPi = 1.0 / Math.PI;

        const rotE = this.earthRot;
        const rotC = this.cloudsRot;

        for (let i = 0; i < d * d; i++) {
            const lutIdx = i * 2;
            const lon = this.earthLut[lutIdx];
            if (lon === -999) {
                outBuf[i] = 0;
                continue;
            }

            const lat = this.earthLut[lutIdx + 1];
            const normIdx = i * 3;
            const nx = this.earthNormals[normIdx];
            const ny = this.earthNormals[normIdx + 1];
            const nz = this.earthNormals[normIdx + 2];

            const dotL = nx * lx + ny * ly + nz * lz;

            let uE = ((lon + rotE) / twoPi) % 1.0;
            if (uE < 0) uE += 1.0;
            const vE = lat * invPi + 0.5;

            const pxX = (uE * wMask) | 0;
            const pxY = (vE * hMask) | 0;
            const texIdx = pxY * tw + pxX;

            let uC = ((lon + rotC) / twoPi) % 1.0;
            if (uC < 0) uC += 1.0;
            const pxCX = (uC * wMask) | 0;
            const cTexIdx = pxY * tw + pxCX;

            const dayPixel = this.dayBuffer[texIdx];
            const nightPixel = this.nightBuffer ? this.nightBuffer[texIdx] : 0;
            const cloudsPixel = this.cloudsBuffer ? this.cloudsBuffer[cTexIdx] : 0;

            const dR = dayPixel & 0xff;
            const dG = (dayPixel >> 8) & 0xff;
            const dB = (dayPixel >> 16) & 0xff;

            const nR = nightPixel & 0xff;
            const nG = (nightPixel >> 8) & 0xff;
            const nB = (nightPixel >> 16) & 0xff;

            const cloudAlpha = (cloudsPixel & 0xff) / 255.0;

            // Directional cloud shadow casting in anti-sun direction
            let shadowAlpha = 0;
            if (this.cloudsBuffer) {
                const sOffsetU = -lx * 0.014;
                const sOffsetV = -ly * 0.014;
                let uSh = (uC + sOffsetU) % 1.0;
                if (uSh < 0) uSh += 1.0;
                const vSh = Math.max(0.0, Math.min(1.0, vE + sOffsetV));
                const shIdx = ((vSh * hMask) | 0) * tw + ((uSh * wMask) | 0);
                const shPix = this.cloudsBuffer[shIdx];
                shadowAlpha = ((shPix & 0xff) / 255.0) * 0.70;
            }

            const dayFactor = Math.max(0.0, Math.min(1.0, (dotL + 0.12) / 0.28));
            let diffuse = Math.max(0.0, dotL);

            // Attenuate ground diffuse under cloud shadow
            if (shadowAlpha > 0.08) {
                diffuse *= (1.0 - shadowAlpha);
            }

            let r = dR * diffuse * dayFactor + nR * (1.0 - dayFactor) * 0.95;
            let g = dG * diffuse * dayFactor + nG * (1.0 - dayFactor) * 0.95;
            let b = dB * diffuse * dayFactor + nB * (1.0 - dayFactor) * 0.95;

            // Sunset / Sunrise Twilight Terminator: Intense golden-crimson Rayleigh scattering
            const terminatorDist = Math.abs(dotL);
            if (terminatorDist < 0.22 && dotL > -0.15) {
                const twilight = Math.pow(1.0 - (terminatorDist / 0.22), 2.2);
                r = Math.min(255, r + 245 * twilight * 0.95);
                g = Math.min(255, g + 130 * twilight * 0.70);
                b = Math.min(255, b + 42 * twilight * 0.35);
            }

            // Multi-layered Clouds with realistic atmospheric scattering
            if (cloudAlpha > 0.05) {
                // Cloud illuminated tops with subtle sunset rim tinting
                let cR = 255, cG = 255, cB = 255;
                if (terminatorDist < 0.20 && dotL > -0.10) {
                    const cTwilight = Math.pow(1.0 - (terminatorDist / 0.20), 1.8);
                    cR = 255;
                    cG = Math.floor(255 - 60 * cTwilight);
                    cB = Math.floor(255 - 130 * cTwilight);
                }
                const cloudLit = (diffuse * 0.88 + 0.12) * dayFactor;
                r = r * (1.0 - cloudAlpha * 0.88) + cR * cloudLit * cloudAlpha * 0.88;
                g = g * (1.0 - cloudAlpha * 0.88) + cG * cloudLit * cloudAlpha * 0.88;
                b = b * (1.0 - cloudAlpha * 0.88) + cB * cloudLit * cloudAlpha * 0.88;
            }

            const rim = Math.pow(1.0 - nz, 2.8) * 0.85 * (dayFactor * 0.8 + 0.2);
            r = Math.min(255, r + 62 * rim);
            g = Math.min(255, g + 215 * rim);
            b = Math.min(255, b + 255 * rim);

            outBuf[i] = 0xff000000 | (((b | 0) & 0xff) << 16) | (((g | 0) & 0xff) << 8) | ((r | 0) & 0xff);
        }

        this.earthCtx.putImageData(imgData, 0, 0);
    }

    /**
     * Отрисовка Луны в оффскрин-буфер с лунными морями и кратерами
     */
    updateMoonBuffer() {
        if (!this.moonCtx || !this.moonBuffer) return;

        const d = this.moonRadius * 2;
        const imgData = this.moonCtx.createImageData(d, d);
        const outBuf = new Uint32Array(imgData.data.buffer);

        const lx = this.sunDir.x;
        const ly = this.sunDir.y;
        const lz = this.sunDir.z;

        const wMask = this.texW - 1;
        const hMask = this.texH - 1;
        const tw = this.texW;

        const twoPi = Math.PI * 2;
        const invPi = 1.0 / Math.PI;

        const rotM = this.moonRot;

        for (let i = 0; i < d * d; i++) {
            const lutIdx = i * 2;
            const lon = this.moonLut[lutIdx];
            if (lon === -999) {
                outBuf[i] = 0;
                continue;
            }

            const lat = this.moonLut[lutIdx + 1];
            const normIdx = i * 3;
            const nx = this.moonNormals[normIdx];
            const ny = this.moonNormals[normIdx + 1];
            const nz = this.moonNormals[normIdx + 2];

            const dotL = nx * lx + ny * ly + nz * lz;
            const diffuse = Math.max(0.03, dotL);

            let uM = ((lon + rotM) / twoPi) % 1.0;
            if (uM < 0) uM += 1.0;
            const vM = lat * invPi + 0.5;

            const pxX = (uM * wMask) | 0;
            const pxY = (vM * hMask) | 0;
            const texIdx = pxY * tw + pxX;

            const moonPixel = this.moonBuffer[texIdx];
            const mR = moonPixel & 0xff;
            const mG = (moonPixel >> 8) & 0xff;
            const mB = (moonPixel >> 16) & 0xff;

            const r = Math.min(255, mR * diffuse * 1.12);
            const g = Math.min(255, mG * diffuse * 1.12);
            const b = Math.min(255, mB * diffuse * 1.12);

            outBuf[i] = 0xff000000 | (((b | 0) & 0xff) << 16) | (((g | 0) & 0xff) << 8) | ((r | 0) & 0xff);
        }

        this.moonCtx.putImageData(imgData, 0, 0);
    }

    /**
     * Обновление кинематики планет (60 FPS)
     */
    update() {
        if (!this.isLoaded) return;

        this.tick = (this.tick || 0) + 1;

        // Постоянное плавное вращение Земли и дрейф облаков
        this.earthRot += 0.00035;
        this.cloudsRot += 0.00065;

        // Орбитальное движение Луны и синхронное вращение
        this.moonOrbit += 0.00022;
        this.moonRot += 0.00022;

        // Оффскрин-буфер перерисовываем раз в 3 кадра для экономии CPU (стабильные 60 FPS)
        if (this.tick % 3 === 0) {
            this.updateEarthBuffer();
            this.updateMoonBuffer();
        }
    }

    /**
     * Отрисовка Земли и Луны на главном звездном холсте 360°
     */
    render(ctx, w, h, camYaw, camPitch, zoom) {
        if (!this.isLoaded) return;

        const cx = w / 2;
        const cy = h / 2;
        const fov = 750 * zoom;

        const radCamYaw = (camYaw * Math.PI) / 180;
        const radCamPitch = (camPitch * Math.PI) / 180;

        const cosYaw = Math.cos(radCamYaw);
        const sinYaw = Math.sin(radCamYaw);
        const cosPitch = Math.cos(radCamPitch);
        const sinPitch = Math.sin(radCamPitch);

        // 1. Отрисовка Земли (Крупная и под пользователем)
        const eYaw = (this.earthCoords.yaw * Math.PI) / 180;
        const ePitch = (this.earthCoords.pitch * Math.PI) / 180;

        const eWorldX = Math.cos(ePitch) * Math.sin(eYaw);
        const eWorldY = Math.sin(ePitch);
        const eWorldZ = Math.cos(ePitch) * Math.cos(eYaw);

        const ex1 = eWorldX * cosYaw - eWorldZ * sinYaw;
        const ez1 = eWorldX * sinYaw + eWorldZ * cosYaw;
        const ey2 = eWorldY * cosPitch - ez1 * sinPitch;
        const ez2 = eWorldY * sinPitch + ez1 * cosPitch;

        if (ez2 > 0.04 && this.earthCanvas) {
            const px = cx + (ex1 / ez2) * fov;
            const py = cy - (ey2 / ez2) * fov;

            // Увеличенная в 2 раза Земля (радиус 840px, диаметр 1680px)
            const drawRadius = 840 * zoom;
            const drawSize = drawRadius * 2;

            if (px > -drawSize && px < w + drawSize && py > -drawSize && py < h + drawSize) {
                // 1. Внешнее глубокое индиго-свечение стратосферы (Outer Stratosphere Halo)
                const outerHalo = ctx.createRadialGradient(px, py, drawRadius * 0.92, px, py, drawRadius * 1.42);
                outerHalo.addColorStop(0, 'rgba(99, 102, 241, 0.42)');
                outerHalo.addColorStop(0.35, 'rgba(67, 56, 202, 0.22)');
                outerHalo.addColorStop(0.70, 'rgba(30, 27, 75, 0.08)');
                outerHalo.addColorStop(1, 'rgba(3, 7, 18, 0)');

                ctx.fillStyle = outerHalo;
                ctx.beginPath();
                ctx.arc(px, py, drawRadius * 1.42, 0, Math.PI * 2);
                ctx.fill();

                // 2. Внутренний яркий циан-ореол тропосферы (Рэлеевское рассеяние)
                const innerGlow = ctx.createRadialGradient(px, py, drawRadius * 0.86, px, py, drawRadius * 1.18);
                innerGlow.addColorStop(0, 'rgba(62, 230, 255, 0.65)');
                innerGlow.addColorStop(0.40, 'rgba(56, 189, 248, 0.35)');
                innerGlow.addColorStop(0.80, 'rgba(14, 165, 233, 0.10)');
                innerGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');

                ctx.fillStyle = innerGlow;
                ctx.beginPath();
                ctx.arc(px, py, drawRadius * 1.18, 0, Math.PI * 2);
                ctx.fill();

                // Отрисовка самой планеты Земля высокого разрешения
                ctx.drawImage(this.earthCanvas, px - drawRadius, py - drawRadius, drawSize, drawSize);
            }
        }

        // 2. Отрисовка Луны (Меньше Земли, но четкая, за спиной пользователя)
        const mCurrentYaw = this.moonCoords.baseYaw + Math.sin(this.moonOrbit) * 12;
        const mCurrentPitch = this.moonCoords.basePitch + Math.cos(this.moonOrbit) * 4;

        const mYaw = (mCurrentYaw * Math.PI) / 180;
        const mPitch = (mCurrentPitch * Math.PI) / 180;

        const mWorldX = Math.cos(mPitch) * Math.sin(mYaw);
        const mWorldY = Math.sin(mPitch);
        const mWorldZ = Math.cos(mPitch) * Math.cos(mYaw);

        const mx1 = mWorldX * cosYaw - mWorldZ * sinYaw;
        const mz1 = mWorldX * sinYaw + mWorldZ * cosYaw;
        const my2 = mWorldY * cosPitch - mz1 * sinPitch;
        const mz2 = mWorldY * sinPitch + mz1 * cosPitch;

        if (mz2 > 0.04 && this.moonCanvas) {
            const px = cx + (mx1 / mz2) * fov;
            const py = cy - (my2 / mz2) * fov;

            // Луна (радиус 90px, диаметр 180px)
            const drawRadius = 90 * zoom;
            const drawSize = drawRadius * 2;

            if (px > -drawSize && px < w + drawSize && py > -drawSize && py < h + drawSize) {
                // Мягкое лунное серебристое свечение
                const moonGlow = ctx.createRadialGradient(px, py, drawRadius * 0.85, px, py, drawRadius * 1.45);
                moonGlow.addColorStop(0, 'rgba(241, 245, 249, 0.28)');
                moonGlow.addColorStop(0.5, 'rgba(203, 213, 225, 0.10)');
                moonGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');

                ctx.fillStyle = moonGlow;
                ctx.beginPath();
                ctx.arc(px, py, drawRadius * 1.45, 0, Math.PI * 2);
                ctx.fill();

                // Отрисовка Луны
                ctx.drawImage(this.moonCanvas, px - drawRadius, py - drawRadius, drawSize, drawSize);
            }
        }
    }

    /**
     * Получить мировые координаты и геометрические параметры Земли
     * для синхронизации орбиты станции МКС и проверки окклюзии
     */
    getEarthWorldMetrics() {
        const eYaw = (this.earthCoords.yaw * Math.PI) / 180;
        const ePitch = (this.earthCoords.pitch * Math.PI) / 180;
        const eDist = this.earthCoords.dist;
        return {
            center: {
                x: eDist * Math.cos(ePitch) * Math.sin(eYaw),
                y: eDist * Math.sin(ePitch),
                z: eDist * Math.cos(ePitch) * Math.cos(eYaw)
            },
            radius: 840,
            dist: eDist,
            coords: { ...this.earthCoords }
        };
    }
}

export const CelestialPlanets = new CelestialPlanetsEngine();
export default CelestialPlanets;
