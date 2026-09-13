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

        // Earth is situated in lower part of screen (pitch: -44°, dist: 1470, radius: 700)
        this.earthCoords = { yaw: 0, pitch: -44, dist: 1470 };
        // Moon is situated in the upper-left quadrant (baseYaw: -28°, basePitch: 24°, dist: 1470, radius: 145)
        this.moonCoords = { baseYaw: -28, basePitch: 24, dist: 1470, radius: 145 };

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
            loadImgBuffer('assets/textures/earth_day.jpg?v=4.6.0'),
            loadImgBuffer('assets/textures/earth_night.png?v=4.6.0'),
            loadImgBuffer('assets/textures/earth_clouds.png?v=4.6.0'),
            loadImgBuffer('assets/textures/moon.jpg?v=4.6.0')
        ]).then(([day, night, clouds, moon]) => {
            this.dayBuffer = day;
            this.nightBuffer = night;
            this.cloudsBuffer = this.blurCloudsBuffer(clouds, this.texW, this.texH, 3);
            this.moonBuffer = moon;
            this.isLoaded = true;
            this.isLoading = false;
            console.log('[CelestialPlanets] Real NASA Earth & Moon textures loaded with soft clouds.');
        }).catch(err => {
            console.warn('[CelestialPlanets] Error loading textures:', err);
            this.isLoading = false;
        });
    }

    /**
     * Быстрый сепарабельный box-blur для текстуры облаков (сглаживание краев без ступенек)
     */
    blurCloudsBuffer(srcBuf, w, h, radius = 3) {
        if (!srcBuf || radius <= 0) return srcBuf;

        const total = w * h;
        const inVals = new Uint8Array(total);
        for (let i = 0; i < total; i++) {
            inVals[i] = srcBuf[i] & 0xff;
        }

        const temp = new Float32Array(total);
        const outVals = new Uint8Array(total);

        const diameter = radius * 2 + 1;
        const invDiam = 1.0 / diameter;

        // Горизонтальный проход (с зацикливанием по долготе)
        for (let y = 0; y < h; y++) {
            const rowOffset = y * w;
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const xWrapped = (k + w) % w;
                sum += inVals[rowOffset + xWrapped];
            }
            temp[rowOffset] = sum * invDiam;

            for (let x = 1; x < w; x++) {
                const addX = (x + radius) % w;
                const subX = (x - radius - 1 + w) % w;
                sum += inVals[rowOffset + addX] - inVals[rowOffset + subX];
                temp[rowOffset + x] = sum * invDiam;
            }
        }

        // Вертикальный проход (с фиксацией на полюсах)
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const yClamped = Math.max(0, Math.min(h - 1, k));
                sum += temp[yClamped * w + x];
            }
            outVals[x] = Math.min(255, Math.round(sum * invDiam));

            for (let y = 1; y < h; y++) {
                const addY = Math.min(h - 1, y + radius);
                const subY = Math.max(0, y - radius - 1);
                sum += temp[addY * w + x] - temp[subY * w + x];
                outVals[y * w + x] = Math.min(255, Math.round(sum * invDiam));
            }
        }

        const result = new Uint32Array(total);
        for (let i = 0; i < total; i++) {
            const c = outVals[i];
            result[i] = 0xff000000 | (c << 16) | (c << 8) | c;
        }
        return result;
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
     * Отрисовка Земли в оффскрин-буфер с реалистичным освещением (0 аллокаций в секунду)
     */
    updateEarthBuffer() {
        if (!this.earthCtx || !this.dayBuffer) return;

        const d = this.earthRadius * 2;
        if (!this.cachedEarthImageData) {
            this.cachedEarthImageData = this.earthCtx.createImageData(d, d);
            this.cachedEarthBuf = new Uint32Array(this.cachedEarthImageData.data.buffer);
        }
        const outBuf = this.cachedEarthBuf;

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

            // Видимость облаков ровно до 10% для кристальной четкости материков и океанов
            const cloudAlpha = ((cloudsPixel & 0xff) / 255.0) * 0.10;

            // Направленная мягкая тень от облаков (не более 7%)
            let shadowAlpha = 0;
            if (this.cloudsBuffer) {
                const sOffsetU = -lx * 0.012;
                const sOffsetV = -ly * 0.012;
                let uSh = (uC + sOffsetU) % 1.0;
                if (uSh < 0) uSh += 1.0;
                const vSh = Math.max(0.0, Math.min(1.0, vE + sOffsetV));
                const shIdx = ((vSh * hMask) | 0) * tw + ((uSh * wMask) | 0);
                const shPix = this.cloudsBuffer[shIdx];
                shadowAlpha = ((shPix & 0xff) / 255.0) * 0.07;
            }

            // Ровно 50% день и 50% ночь с узким кинематографичным терминатором
            const dayFactor = Math.max(0.0, Math.min(1.0, (dotL + 0.04) / 0.09));
            let diffuse = Math.max(0.0, dotL);

            if (shadowAlpha > 0.01) {
                diffuse *= (1.0 - shadowAlpha);
            }

            let r = dR * diffuse * dayFactor + nR * (1.0 - dayFactor) * 0.95;
            let g = dG * diffuse * dayFactor + nG * (1.0 - dayFactor) * 0.95;
            let b = dB * diffuse * dayFactor + nB * (1.0 - dayFactor) * 0.95;

            // Золотисто-янтарный терминатор Рэлея на границе дня и ночи
            const terminatorDist = Math.abs(dotL);
            if (terminatorDist < 0.12 && dotL > -0.07) {
                const twilight = Math.pow(1.0 - (terminatorDist / 0.12), 2.0);
                r = Math.min(255, r + 245 * twilight * 0.92);
                g = Math.min(255, g + 130 * twilight * 0.65);
                b = Math.min(255, b + 40 * twilight * 0.30);
            }

            // Мягкие, деликатные полупрозрачные облака (10% видимости)
            if (cloudAlpha > 0.005) {
                let cR = 255, cG = 255, cB = 255;
                if (terminatorDist < 0.12 && dotL > -0.05) {
                    const cTwilight = Math.pow(1.0 - (terminatorDist / 0.12), 1.8);
                    cR = 255;
                    cG = Math.floor(255 - 60 * cTwilight);
                    cB = Math.floor(255 - 130 * cTwilight);
                }
                const cloudLit = (diffuse * 0.88 + 0.12) * dayFactor;
                r = r * (1.0 - cloudAlpha) + cR * cloudLit * cloudAlpha;
                g = g * (1.0 - cloudAlpha) + cG * cloudLit * cloudAlpha;
                b = b * (1.0 - cloudAlpha) + cB * cloudLit * cloudAlpha;
            }

            const rim = Math.pow(1.0 - nz, 2.8) * 0.80 * (dayFactor * 0.8 + 0.2);
            r = Math.min(255, r + 62 * rim);
            g = Math.min(255, g + 215 * rim);
            b = Math.min(255, b + 255 * rim);

            outBuf[i] = 0xff000000 | (((b | 0) & 0xff) << 16) | (((g | 0) & 0xff) << 8) | ((r | 0) & 0xff);
        }

        this.earthCtx.putImageData(this.cachedEarthImageData, 0, 0);
    }

    /**
     * Отрисовка Луны в оффскрин-буфер с лунными морями и кратерами (0 аллокаций в секунду)
     */
    updateMoonBuffer() {
        if (!this.moonCtx || !this.moonBuffer) return;

        const d = this.moonRadius * 2;
        if (!this.cachedMoonImageData) {
            this.cachedMoonImageData = this.moonCtx.createImageData(d, d);
            this.cachedMoonBuf = new Uint32Array(this.cachedMoonImageData.data.buffer);
        }
        const outBuf = this.cachedMoonBuf;

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

        this.moonCtx.putImageData(this.cachedMoonImageData, 0, 0);
    }

    /**
     * Обновление кинематики планет (60 FPS)
     */
    /**
     * Перевод в GPU-режим: тяжёлый CPU-рейкастинг отключается, планеты
     * рисуются шейдерами WebGL2 (src/space3d_gl.js). CPU остаётся как фолбэк.
     */
    setGpuMode(enabled) {
        this.gpuMode = !!enabled;
    }

    update() {
        if (!this.isLoaded || this.gpuMode) return;

        this.tick = (this.tick || 0) + 1;

        // Постоянное плавное вращение Земли (уменьшено в 0.5 раза)
        // Реалистичное соотношение Земля-Луна: ω_Луны = ω_Земли / 27.321661
        // (сидерический месяц = 27.321661 сидерических суток), приливный захват.
        const EARTH_OMEGA = 0.000252;            // рад/кадр(60fps) — вращение Земли
        const MOON_SIDEREAL_RATIO = 27.321661;
        const moonOmega = EARTH_OMEGA / MOON_SIDEREAL_RATIO;
        this.earthRot += EARTH_OMEGA;
        this.cloudsRot += 0.00038;

        // Орбитальное движение Луны и синхронное вращение
        this.moonOrbit += moonOmega;
        this.moonRot += moonOmega;

        // Оффскрин-буфер перерисовываем раз в 4 кадра для максимального FPS
        if (this.tick % 4 === 0) {
            this.updateEarthBuffer();
            this.updateMoonBuffer();
        }
    }

    /**
     * Отрисовка Земли и Луны на главном звездном холсте 360°
     */
    render(ctx, w, h, camYaw, camPitch, zoom) {
        if (!this.isLoaded || this.gpuMode) return;

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

            // Земля — занимает ~80% нижней части экрана (радиус 700px, диаметр 1400-1530px)
            const drawRadius = 700 * zoom;
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

        // 2. Отрисовка Луны (В левом верхнем секторе неба, ровно в 2 раза меньше Земли)
        const mCurrentYaw = this.moonCoords.baseYaw + Math.sin(this.moonOrbit) * 1.5;
        const mCurrentPitch = this.moonCoords.basePitch + Math.cos(this.moonOrbit) * 1.0;

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

            // Луна (уменьшена в 2 раза: радиус 145px)
            const drawRadius = 145 * zoom;
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
            radius: 700,   // синхронизировано с GL-сферой (space3d_gl.js) и EARTH_CONFIG
            atmoRadius: 700 * 1.025,
            dist: eDist,
            coords: { ...this.earthCoords }
        };
    }
}

export const CelestialPlanets = new CelestialPlanetsEngine();
export default CelestialPlanets;
