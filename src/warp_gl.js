/**
 * src/warp_gl.js — AURORA «ГИПЕРДРАЙВ»: AAA WebGL2 Warp Jump Renderer
 * ============================================================================
 * Роли команды разработки:
 *   • Game Director / 3D Art Director — режиссура кадра, композиция, тайминги
 *   • Lead Graphics Programmer      — HDR-конвейер, тонмаппинг ACES, bloom
 *   • VFX Artist                    — звёздные штрихи, гипертоннель, плазма
 *   • Engine Programmer             — адаптивное качество, 0 аллокаций в кадре
 *
 * Конвейер кадра (все проходы — на GPU, без единой JS-аллокации):
 *   1. HDR-сцена        : гипертоннель (3 оболочки FBM) + газ + 32k звёздных
 *                         штрихов (instanced quads) + плазменные искры + ядро
 *   2. Bright Pass      : выделение сверхъярких участков (HDR threshold+knee)
 *   3. Bloom            : разделяемый гаусс 9-tap ×2 каскада (1/2 и 1/4)
 *   4. Anamorphic       : горизонтальный оптический штрих объектива (1/4)
 *   5. Composite        : радиальный motion-blur, хроматическая аберрация,
 *                         ACES filmic tonemap, цветокоррекция, виньетка,
 *                         зерно плёнки, dithering, кинематографические полосы
 *
 * Все параметры кадра приходят из контроллера (src/space_warp.js).
 * ============================================================================
 */

const SQ = [
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
];

/* ---------------------------------------------------------------------------
 * 1. БАЗОВЫЕ ШЕЙДЕРЫ ПОЛНОЭКРАННОГО ПРОХОДА
 * ------------------------------------------------------------------------- */
const FULLSCREEN_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 2. ГИПЕРТОННЕЛЬ — 3 концентрические оболочки с анизотропным FBM-шумом
 * ------------------------------------------------------------------------- */
const TUNNEL_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aGrid;   // x = угол (рад), y = осевая координата, z = попер. смещение
uniform mat4 uViewProj;
uniform float uTravel;
uniform float uScroll;
uniform float uLength;
uniform float uRadius;
uniform float uTime;
uniform float uWobble;
out vec2 vUv;
out vec3 vLocal;

void main() {
    float axial = mod(aGrid.y - uTravel * uScroll, uLength);
    float ang = aGrid.x;

    // Живое «дыхание» плазменной оболочки
    float wob = sin(uTime * 1.7 + ang * 3.0 + axial * 0.35) * 0.5 + cos(uTime * 2.3 - ang * 5.0) * 0.5;
    float radius = uRadius * (1.0 + wob * uWobble);

    vec3 p = vec3(cos(ang) * radius, sin(ang) * radius, axial);
    vUv = vec2(ang / 6.28318530718, axial / uLength);
    vLocal = vec3(wob, axial, radius);
    gl_Position = uViewProj * vec4(p, 1.0);
}`;

const TUNNEL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vLocal;
uniform float uTime;
uniform float uTravel;
uniform float uSpeedNorm;
uniform float uOpacity;
uniform float uOctaves;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uSeed;
out vec4 outColor;

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
        mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
        f.z
    );
}

/* Анизотропный FBM: сильное растяжение вдоль оси полёта -> эффект speed-lines */
float fbmStream(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 5; i++) {
        float w = step(float(i), uOctaves);
        sum += vnoise(p) * amp * w;
        norm += amp * w;
        p = p * vec3(1.92, 2.03, 1.55) + vec3(11.3, 5.7, 3.1);
        amp *= 0.52;
    }
    return sum / max(norm, 0.0001);
}

void main() {
    float ang = vUv.x * 6.28318530718;
    float axial = vUv.y;
    vec3 dir = vec3(cos(ang), sin(ang), 0.0);

    // Растянутая вдоль Z координата: чем длиннее кадр — тем сильнее «полосы скорости»
    float z = axial * 46.0 + uTravel * 0.42;
    vec3 np = vec3(dir.xy * 1.35, z * 0.22) + uSeed;

    float plasma = fbmStream(np);
    float filaments = fbmStream(np * vec3(1.0, 1.0, 0.28) + vec3(3.7, 1.9, 0.0));
    float veins = pow(clamp(filaments, 0.0, 1.0), 2.4);

    // Радиальная энергия горячего канала
    float hot = pow(clamp(plasma, 0.0, 1.0), 1.6);
    vec3 col = mix(uColorA, uColorB, hot);
    col = mix(col, uColorC, veins * 0.85);
    col += uColorC * pow(veins, 3.0) * 1.6;

    // Градиент глубины: у входа в тоннель ярче, вдали — растворяется в точке схода
    float depthFade = smoothstep(0.0, 0.22, axial) * (1.0 - smoothstep(0.55, 1.0, axial));
    float flicker = 0.82 + 0.18 * sin(uTime * 9.0 + uSeed * 12.0 + axial * 14.0);

    float energy = mix(0.55, 1.0, uSpeedNorm);
    float a = depthFade * flicker * energy * uOpacity * (0.30 + hot * 0.85 + veins * 0.7);
    outColor = vec4(col * a, a);
}`;

/* ---------------------------------------------------------------------------
 * 3. ЗВЁЗДНЫЕ ШТРИХИ — instanced quads, доплеровский сдвиг, хвосты
 * ------------------------------------------------------------------------- */
const STAR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;  // (-1..1, -1..1)
layout(location = 1) in vec3 aPos;     // x, y, z0
layout(location = 2) in vec3 aColor;   // спектральный класс (O/B..M)
layout(location = 3) in vec3 aParam;   // размер(px), яркость, фаза

uniform vec2 uResolution;
uniform float uFov;
uniform float uTravel;
uniform float uStretch;
uniform float uZNear;
uniform float uZFar;
uniform float uBrightness;
uniform float uTime;
uniform float uJitter;

out vec2 vUv;
out vec3 vColor;
out float vAlpha;
out float vDoppler;

void main() {
    float span = max(uZFar - uZNear, 0.001);
    float prog = mod(aPos.z + uTravel, span);
    float z = uZNear + (span - prog);

    float invZ = 1.0 / z;
    vec2 screen = aPos.xy * uFov * invZ;
    float r = length(screen);
    vec2 dir = r > 0.75 ? screen / r : normalize(screen + vec2(0.001, 0.001));
    vec2 perp = vec2(-dir.y, dir.x);

    // Длина штриха: строго ограничена, звёзды остаются точками/мягкими штрихами
    float rawLen = uStretch * length(aPos.xy) * uFov * invZ * invZ;
    float streak = clamp(rawLen, aParam.x * 0.8, uResolution.y * 0.04);
    float width = aParam.x * (0.85 + 0.9 * invZ);

    float t = aCorner.x * 0.5 + 0.5;     // 0 = хвост (к центру), 1 = голова
    vec2 px = screen + dir * (streak * (t - 1.0)) + perp * (width * aCorner.y * 0.5);

    // Лёгкое «дрожание» горячего воздуха на гиперскорости
    px += vec2(
        sin(uTime * 13.0 + aParam.z * 40.0),
        cos(uTime * 11.0 + aParam.z * 27.0)
    ) * uJitter * t;

    gl_Position = vec4(vec2(px.x / uResolution.x, -px.y / uResolution.y) * 2.0, 0.0, 1.0);
    vUv = vec2(t, aCorner.y);
    vColor = aColor;
    vAlpha = aParam.y * uBrightness;
    vDoppler = clamp(1.0 - r / (uResolution.y * 0.9), 0.0, 1.0);
}`;

const STAR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vColor;
in float vAlpha;
in float vDoppler;
uniform float uGlowFade;
out vec4 outColor;

void main() {
    float t = vUv.x;
    float s = vUv.y;

    float width = 1.0 - 0.55 * t;
    float across = exp(-(s * s) / max(width * width, 0.02) * 2.4);
    float body = smoothstep(0.0, 0.30, t) * (1.0 - smoothstep(0.72, 1.0, t));
    float head = exp(-pow(1.0 - t, 2.0) * 42.0);

    float a = (across * body * 0.62 + across * head * 1.15) * vAlpha;

    // Доплеровский сдвиг: ближние звёзды «синеют» на разгоне
    vec3 col = mix(vColor, vec3(0.62, 0.82, 1.0), vDoppler * 0.55);
    col += vec3(0.55, 0.8, 1.0) * head * vDoppler * 0.6;
    outColor = vec4(col * a, a * uGlowFade);
}`;

/* ---------------------------------------------------------------------------
 * 4. ПЛАЗМЕННЫЕ ИСКРЫ / ДЕБРИ, ЛЕТЯЩИЕ МИМО КОРАБЛЯ
 * ------------------------------------------------------------------------- */
const SPARK_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPos;
layout(location = 2) in vec2 aParam;  // размер, скорость
uniform vec2 uResolution;
uniform float uFov;
uniform float uTravel;
uniform float uTime;
out vec2 vUv;
out float vHeat;

void main() {
    float z = 130.0 - mod(aPos.z + uTravel * (0.82 + aParam.y), 129.0);
    float invZ = 1.0 / z;
    vec2 screen = aPos.xy * uFov * invZ;
    float r = length(screen);
    vec2 dir = r > 0.5 ? screen / r : vec2(0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);

    float len = clamp(aParam.y * 420.0 * invZ * invZ * 3.0, aParam.x, 420.0);
    float t = aCorner.x * 0.5 + 0.5;
    vec2 px = screen + dir * (len * (t - 1.0)) + perp * aCorner.y * aParam.x * 0.5;

    gl_Position = vec4(vec2(px.x / uResolution.x, -px.y / uResolution.y) * 2.0, 0.0, 1.0);
    vUv = vec2(t, aCorner.y);
    vHeat = clamp(1.0 - r / (uResolution.y * 0.8), 0.0, 1.0) * (0.4 + aParam.y);
}`;

const SPARK_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vHeat;
uniform float uIntensity;
out vec4 outColor;
void main() {
    float s = vUv.y;
    float t = vUv.x;
    float across = exp(-s * s * 3.4);
    float along = smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.6, 1.0, t));
    float head = exp(-pow(1.0 - t, 2.0) * 30.0);
    float a = (across * along * 0.45 + head * across * 0.9) * uIntensity * (0.35 + vHeat);
    vec3 col = mix(vec3(1.0, 0.72, 0.35), vec3(0.72, 0.92, 1.0), vHeat);
    outColor = vec4(col * a, a);
}`;

/* ---------------------------------------------------------------------------
 * 5. ГАЗОВЫЕ ВОЛОКНА (полноэкранный аддитивный слой параллакса)
 * ------------------------------------------------------------------------- */
const GAS_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uTravel;
uniform float uCover;
uniform float uSpeedNorm;
uniform float uOctaves;
uniform float uEnergy;
out vec4 outColor;

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
        mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
        f.z
    );
}
float fbm(vec3 p) {
    float sum = 0.0, amp = 0.5, norm = 0.0;
    for (int i = 0; i < 5; i++) {
        float w = step(float(i), uOctaves);
        sum += vnoise(p) * amp * w;
        norm += amp * w;
        p = p * 2.07 + vec3(7.1, 3.3, 5.9);
        amp *= 0.5;
    }
    return sum / max(norm, 0.0001);
}

void main() {
    vec2 uv = vUv;
    vec2 c = uv - 0.5;
    float r = length(c);
    vec2 dir = c / max(r, 0.0001);

    // Радиальная параллакс-протяжка: газ «улетает» из точки схода
    float flow = uTravel * 0.006;
    vec3 p = vec3(dir * (0.65 + r * 2.1), flow);
    float n = fbm(p * 2.6);
    float n2 = fbm(p * 5.3 + vec3(2.2, 0.0, 1.7));

    float veil = pow(clamp(n, 0.0, 1.0), 2.1) * (0.42 + 0.5 * n2);
    float edge = smoothstep(0.05, 0.62, r);
    float hot = exp(-r * 3.2) * 0.35;

    vec3 col = mix(vec3(0.18, 0.55, 1.0), vec3(0.55, 0.25, 0.95), clamp(n2, 0.0, 1.0));
    col = mix(col, vec3(0.35, 1.0, 0.92), pow(clamp(n, 0.0, 1.0), 3.0) * 0.6);
    col += vec3(1.0, 0.86, 0.62) * hot * uEnergy;

    float a = (veil * edge * 0.30 + hot * 0.4) * uCover * mix(0.35, 1.0, uSpeedNorm);
    outColor = vec4(col * a, a);
}`;

/* ---------------------------------------------------------------------------
 * 6. ЯДРО ПЕРЕХОДА / ОПТИЧЕСКИЙ ГОРИЗОНТ (точка схода + лучи + Эйнштейн-кольцо)
 * ------------------------------------------------------------------------- */
const CORE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uCharge;    // 0..1 зарядка (стягивание)
uniform float uWarp;      // 0..1 яркость гиперканала
uniform float uPulse;     // импульс (вспышка перехода)
uniform float uEnergy;    // аудио-энергия голоса Беллы
uniform vec2 uOffset;     // смещение точки схода (тряска камеры)
out vec4 outColor;

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x);
    float b = mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x);
    float c = mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x);
    float d = mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}

void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uResolution.x / max(uResolution.y, 1.0);
    uv -= uOffset;
    float r = length(uv);
    float ang = atan(uv.y, uv.x);

    // Ядро гиперканала
    float coreR = mix(0.16, 0.045, uCharge) * (1.0 + 0.25 * uPulse);
    float core = exp(-pow(r / max(coreR, 0.001), 1.6));
    float ring = exp(-pow(abs(r - coreR * 2.35) / (0.055 + 0.05 * uPulse), 2.0)) * 0.55;

    // Радиальные энергетические лучи
    float rays = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float n = vnoise(vec3(cos(ang + fi * 2.1) * 3.0, sin(ang + fi * 2.1) * 3.0, uTime * (0.25 + fi * 0.13)));
        rays += pow(clamp(n, 0.0, 1.0), 2.6);
    }
    rays /= 3.0;
    float rayMask = exp(-r * 3.4) * (0.35 + 0.65 * uCharge);

    float flick = 0.9 + 0.1 * sin(uTime * 21.0);
    float energy = mix(0.55, 1.25, uEnergy);

    vec3 hot = vec3(1.0, 0.98, 0.94);
    vec3 cyan = vec3(0.42, 0.92, 1.0);
    vec3 violet = vec3(0.62, 0.45, 1.0);

    vec3 col = hot * core * (1.35 + uPulse * 3.2) * energy;
    col += cyan * ring * (0.9 + uPulse * 2.0);
    col += mix(cyan, violet, 0.35 + 0.4 * sin(uTime * 0.7)) * rays * rayMask * (0.5 + uWarp * 1.4) * flick;

    float a = clamp(max(max(core, ring * 0.7), rays * rayMask * 0.55) * (0.5 + uWarp), 0.0, 1.6);
    outColor = vec4(col, a);
}`;

/* ---------------------------------------------------------------------------
 * 7. ПОСТ-ОБРАБОТКА: bright, blur, anamorphic, composite
 * ------------------------------------------------------------------------- */
const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform float uThreshold;
uniform float uKnee;
out vec4 outColor;
void main() {
    vec3 c = texture(uScene, vUv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float soft = clamp(lum - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 0.0001);
    float contrib = max(soft, lum - uThreshold) / max(lum, 0.0001);
    outColor = vec4(c * contrib, 1.0);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uDir;       // направление в UV (уже с учётом размера текселя)
out vec4 outColor;
void main() {
    // Разделяемый гаусс 9-tap с линейной оптимизацией (5 текстурных выборок)
    vec3 sum = texture(uSource, vUv).rgb * 0.2270270270;
    sum += texture(uSource, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture(uSource, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture(uSource, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    sum += texture(uSource, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    outColor = vec4(sum, 1.0);
}`;

const ANAMORPHIC_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uLength;
out vec4 outColor;
void main() {
    vec3 sum = vec3(0.0);
    float wsum = 0.0;
    for (int i = -12; i <= 12; i++) {
        float fi = float(i) / 12.0;
        float w = exp(-fi * fi * 3.2);
        sum += texture(uSource, vUv + vec2(fi * uLength * uTexel.x, 0.0)).rgb * w;
        wsum += w;
    }
    outColor = vec4(sum / max(wsum, 0.0001), 1.0);
}`;

const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;    // 1/2
uniform sampler2D uBloomWide; // 1/4
uniform sampler2D uAnam;      // анаморфный штрих
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uStreak;
uniform float uRadialBlur;    // 0..1 сила radial motion blur
uniform float uChroma;        // хроматическая аберрация
uniform float uVignette;
uniform float uGrain;
uniform float uFlash;         // белая вспышка перехода
uniform float uFade;          // альфа-растворение к 3D-пространству
uniform float uLetterbox;     // высота кинематографических полос (в UV)
uniform float uSpeedNorm;
uniform float uScanline;
uniform vec2 uShakeUv;        // тряска камеры (сдвиг кадра)
uniform float uZoomUv;        // компенсация масштаба при тряске/крене
uniform float uRoll;          // крен камеры (рад)
out vec4 outColor;

vec3 aces(vec3 x) {
    // Narkowicz 2015 ACES filmic approximation
    const float a = 2.51; const float b = 0.03; const float c = 2.43;
    const float d = 0.59; const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    // --- Камера: крен + тряска + микро-зум (компенсирует края кадра)
    vec2 base = vUv - 0.5;
    float cr = cos(uRoll);
    float sr = sin(uRoll);
    base = mat2(cr, -sr, sr, cr) * base;
    vec2 uv = base * uZoomUv + 0.5 - uShakeUv;
    vec2 c = uv - 0.5;
    float r = length(c);

    // --- Радиальный motion blur гиперпространства (8 выборок к точке схода)
    vec3 scene = vec3(0.0);
    if (uRadialBlur > 0.001) {
        float total = 0.0;
        for (int i = 0; i < 8; i++) {
            float t = float(i) / 7.0;
            float w = 1.0 - t * 0.55;
            float scale = 1.0 - t * uRadialBlur * 0.10;
            scene += texture(uScene, 0.5 + c * scale).rgb * w;
            total += w;
        }
        scene /= total;
    } else {
        scene = texture(uScene, uv).rgb;
    }

    // --- Хроматическая аберрация (усиливается к краям кадра)
    if (uChroma > 0.001) {
        vec2 off = normalize(c + 1e-5) * r * uChroma * 0.012;
        scene.r = texture(uScene, 0.5 + c * 1.0 + off).r;
        scene.b = texture(uScene, 0.5 + c * 1.0 - off).b;
    }

    // --- Сборка света: bloom двух каскадов + анаморфный штрих объектива
    vec3 bloom = texture(uBloom, uv).rgb * 0.55 + texture(uBloomWide, uv).rgb * 0.85;
    vec3 anam = texture(uAnam, uv).rgb;
    vec3 hdr = scene + bloom * uBloomStrength + anam * uStreak * vec3(0.55, 0.85, 1.35);

    // --- Вспышка перехода: короткий мощный импульс белого света
    hdr += vec3(0.85, 0.95, 1.0) * uFlash * 2.4;

    // --- Экспозиция и киношный тонмаппинг
    hdr *= uExposure;
    vec3 col = aces(hdr);

    // --- Цветокоррекция «deep space»: холодные тени, тёплые света, teal&orange
    col = pow(col, vec3(0.94, 0.98, 1.03));
    vec3 shadowTint = vec3(0.03, 0.05, 0.11);
    col = mix(shadowTint + col * 0.94, col, smoothstep(0.0, 0.42, dot(col, vec3(0.333))));
    float sat = 1.14;
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(lum), col, sat);
    col += vec3(0.02, 0.05, 0.08) * uSpeedNorm;
    col = pow(max(col, 0.0), vec3(0.95));

    // --- Виньетка объектива
    float vig = smoothstep(1.15, 0.28, r * (1.0 + uVignette * 0.55));
    col *= mix(1.0, vig, uVignette);

    // --- Зерно плёнки + дрожание (LPF-шум киносенсора)
    float g = hash12(uv * uResolution + vec2(uTime * 137.0, uTime * 71.0));
    col += (g - 0.5) * uGrain * 0.075;

    // --- Микро-стробоскопия гиперпространства (тонкая развёртка)
    if (uScanline > 0.001) {
        col *= 1.0 - uScanline * 0.06 * (0.5 + 0.5 * sin(uv.y * uResolution.y * 0.9 + uTime * 26.0));
    }

    // --- Кинематографические полосы (letterbox)
    float bar = smoothstep(uLetterbox, uLetterbox + 0.012, uv.y) *
                smoothstep(uLetterbox, uLetterbox + 0.012, 1.0 - uv.y);
    col *= bar;

    // --- Dithering против бандинга на градиентах
    col += (hash12(uv * 4317.13) - 0.5) / 255.0;

    outColor = vec4(max(col, 0.0), uFade);
}`;

/* ---------------------------------------------------------------------------
 * Класс рендерера
 * ------------------------------------------------------------------------- */
export class WarpGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.ok = false;
        this.width = 1;
        this.height = 1;

        this.programs = {};
        this.buffers = {};
        this.fbos = {};
        this.textures = {};

        this.hdrFormat = null;
        this.quality = 'high';
        this.octaves = 5;
        this.renderScale = 1;
        this.starCount = 32000;
        this.sparkCount = 420;

        this._vp = null;
        this._dpr = 1;
    }

    /* ---------------------------------------------------------------------
     * Компиляция шейдеров и инициализация ресурсов
     * ------------------------------------------------------------------- */
    static isSupported() {
        try {
            const c = document.createElement('canvas');
            return !!c.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
        } catch (e) {
            return false;
        }
    }

    init(opts = {}) {
        if (this.ok) return true;

        const gl = this.canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            desynchronized: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });

        if (!gl) {
            console.warn('[WarpGL] WebGL2 недоступен — используется 2D-фолбэк.');
            return false;
        }
        this.gl = gl;

        this.quality = opts.quality || (this._detectMobile() ? 'medium' : 'high');
        this.renderScale = opts.renderScale || (this.quality === 'high' ? 1 : 0.78);
        this.octaves = this.quality === 'high' ? 5 : (this.quality === 'medium' ? 4 : 3);
        this.starCount = this.quality === 'high' ? 34000 : (this.quality === 'medium' ? 16000 : 7000);
        this.sparkCount = this.quality === 'high' ? 420 : 180;

        // Расширение для рендера в HDR (RGBA16F)
        if (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')) {
            this.hdrFormat = gl.RGBA16F;
        } else {
            this.hdrFormat = gl.RGBA8;
            console.warn('[WarpGL] HDR framebuffer недоступен — используется LDR-конвейер.');
        }
        gl.getExtension('OES_texture_float_linear');

        const shaded = this._buildPrograms();
        if (!shaded) return false;

        this._buildGeometry();
        this._buildTargets();

        this.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            this.ok = false;
            console.warn('[WarpGL] Потеря WebGL-контекста.');
        }, false);

        this.ok = true;
        console.log(`[WarpGL] Гипердрайв инициализирован: quality=${this.quality}, stars=${this.starCount}, HDR=${this.hdrFormat === gl.RGBA16F}`);
        return true;
    }

    _detectMobile() {
        const ua = (navigator.userAgent || '').toLowerCase();
        const touch = ('ontouchstart' in window) && Math.min(window.innerWidth, window.innerHeight) < 820;
        return /android|iphone|ipad|ipod|mobile/.test(ua) || touch;
    }

    _compile(type, source, label) {
        const gl = this.gl;
        const sh = gl.createShader(type);
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.warn(`[WarpGL] Ошибка компиляции шейдера «${label}»:\n${gl.getShaderInfoLog(sh)}`);
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }

    _program(vsSource, fsSource, label) {
        const gl = this.gl;
        const vs = this._compile(gl.VERTEX_SHADER, vsSource, label + '.vert');
        const fs = this._compile(gl.FRAGMENT_SHADER, fsSource, label + '.frag');
        if (!vs || !fs) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn(`[WarpGL] Ошибка линковки программы «${label}»: ${gl.getProgramInfoLog(prog)}`);
            return null;
        }

        // Кэш uniform-локаций (без аллокаций в кадре)
        const uniforms = {};
        const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(prog, i);
            if (!info) continue;
            const name = info.name.replace(/\[0\]$/, '');
            uniforms[name] = gl.getUniformLocation(prog, info.name);
        }
        return { prog, uniforms };
    }

    _buildPrograms() {
        const gl = this.gl;
        const defs = [
            ['fullscreen', FULLSCREEN_VS, null],
            ['tunnel', TUNNEL_VS, TUNNEL_FS],
            ['star', STAR_VS, STAR_FS],
            ['spark', SPARK_VS, SPARK_FS],
            ['gas', FULLSCREEN_VS, GAS_FS],
            ['core', FULLSCREEN_VS, CORE_FS],
            ['bright', FULLSCREEN_VS, BRIGHT_FS],
            ['blur', FULLSCREEN_VS, BLUR_FS],
            ['anam', FULLSCREEN_VS, ANAMORPHIC_FS],
            ['composite', FULLSCREEN_VS, COMPOSITE_FS]
        ];

        for (const [name, vs, fs] of defs) {
            if (!fs) {
                const p = this._program(vs, `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
void main(){ outColor = vec4(0.0); }`, name);
                if (!p) return false;
                this.programs[name] = p;
                continue;
            }
            const p = this._program(vs, fs, name);
            if (!p) return false;
            this.programs[name] = p;
        }

        // Полноэкранный квад
        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(SQ), gl.STATIC_DRAW);
        this.buffers.quad = quad;

        // Пустой VAO для полноэкранных проходов (WebGL2 требует VAO для draw)
        this.vaoFullscreen = gl.createVertexArray();
        gl.bindVertexArray(this.vaoFullscreen);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        return true;
    }

    _buildGeometry() {
        const gl = this.gl;

        /* ---- Звёздные штрихи: instanced quads ---- */
        const n = this.starCount;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        const par = new Float32Array(n * 3);

        // Спектральные классы (O/B, A, F, G, K, M) с планковскими оттенками
        const spectra = [
            { c: [0.62, 0.76, 1.00], w: 0.09, s: [1.6, 3.0] },
            { c: [0.92, 0.95, 1.00], w: 0.21, s: [1.3, 2.6] },
            { c: [1.00, 0.97, 0.86], w: 0.18, s: [1.1, 2.2] },
            { c: [1.00, 0.90, 0.62], w: 0.20, s: [1.0, 2.0] },
            { c: [1.00, 0.72, 0.45], w: 0.17, s: [1.1, 2.4] },
            { c: [1.00, 0.55, 0.48], w: 0.15, s: [1.2, 2.8] }
        ];
        const cumulative = [];
        let acc = 0;
        for (const s of spectra) { acc += s.w; cumulative.push(acc); }

        for (let i = 0; i < n; i++) {
            // Распределение в трубке полёта: радиус с уплотнением к оси
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.03 + Math.pow(Math.random(), 0.72) * 1.55;
            pos[i * 3 + 0] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = Math.sin(angle) * radius;
            pos[i * 3 + 2] = Math.random() * 400;

            const roll = Math.random();
            let spec = spectra[0];
            for (let k = 0; k < cumulative.length; k++) {
                if (roll <= cumulative[k]) { spec = spectra[k]; break; }
            }
            const bright = Math.random() < 0.045 ? 1.0 : 0.45 + Math.random() * 0.5;
            col[i * 3 + 0] = spec.c[0];
            col[i * 3 + 1] = spec.c[1];
            col[i * 3 + 2] = spec.c[2];

            par[i * 3 + 0] = spec.s[0] + Math.random() * (spec.s[1] - spec.s[0]);
            par[i * 3 + 1] = bright;
            par[i * 3 + 2] = Math.random() * 100;
        }

        const starVao = gl.createVertexArray();
        gl.bindVertexArray(starVao);

        const cornerBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        const posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);

        const colBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(2, 1);

        const parBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, parBuf);
        gl.bufferData(gl.ARRAY_BUFFER, par, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(3, 1);

        gl.bindVertexArray(null);
        this.vaoStars = starVao;

        /* ---- Плазменные искры ---- */
        const sn = this.sparkCount;
        const sPos = new Float32Array(sn * 3);
        const sPar = new Float32Array(sn * 2);
        for (let i = 0; i < sn; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.06 + Math.pow(Math.random(), 0.85) * 1.25;
            sPos[i * 3 + 0] = Math.cos(angle) * radius;
            sPos[i * 3 + 1] = Math.sin(angle) * radius;
            sPos[i * 3 + 2] = Math.random() * 129;
            sPar[i * 2 + 0] = 1.4 + Math.random() * 3.4;
            sPar[i * 2 + 1] = Math.random();
        }

        const sparkVao = gl.createVertexArray();
        gl.bindVertexArray(sparkVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        const sPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, sPos, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);

        const sParBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sParBuf);
        gl.bufferData(gl.ARRAY_BUFFER, sPar, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(2, 1);

        gl.bindVertexArray(null);
        this.vaoSpark = sparkVao;

        /* ---- Гипертоннель: 3 оболочки (кольца × сегменты) ---- */
        this.tunnelShells = [
            { radius: 2.6, length: 120, scroll: 1.0, opacity: 0.55, seed: 0.0, colorA: [0.05, 0.16, 0.42], colorB: [0.12, 0.55, 0.95], colorC: [0.35, 1.0, 0.95], wobble: 0.03 },
            { radius: 6.4, length: 240, scroll: 0.62, opacity: 0.42, seed: 17.3, colorA: [0.10, 0.06, 0.32], colorB: [0.42, 0.22, 0.95], colorC: [0.85, 0.45, 1.0], wobble: 0.05 },
            { radius: 14.0, length: 420, scroll: 0.38, opacity: 0.30, seed: 41.7, colorA: [0.02, 0.05, 0.18], colorB: [0.15, 0.42, 0.85], colorC: [0.55, 0.75, 1.0], wobble: 0.07 }
        ];

        const SEG = 72;
        const RINGS = 26;
        const verts = [];
        const idx = [];
        for (let y = 0; y < RINGS; y++) {
            for (let x = 0; x < SEG; x++) {
                const ang = (x / SEG) * Math.PI * 2;
                const axial = (y / (RINGS - 1));
                verts.push(ang, axial, 0);
            }
        }
        for (let y = 0; y < RINGS - 1; y++) {
            for (let x = 0; x < SEG; x++) {
                const a = y * SEG + x;
                const b = y * SEG + ((x + 1) % SEG);
                const c = (y + 1) * SEG + x;
                const d = (y + 1) * SEG + ((x + 1) % SEG);
                idx.push(a, c, b, b, c, d);
            }
        }

        const tunnelVao = gl.createVertexArray();
        gl.bindVertexArray(tunnelVao);
        const tBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        const tIdx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        this.vaoTunnel = tunnelVao;
        this.tunnelIndexCount = idx.length;
    }

    /* ---------------------------------------------------------------------
     * Framebuffer-цепочка (HDR + bloom-каскады)
     * ------------------------------------------------------------------- */
    _makeTarget(w, h, useHdr) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const internal = useHdr && this.hdrFormat === gl.RGBA16F ? gl.RGBA16F : gl.RGBA8;
        gl.texImage2D(gl.TEXTURE_2D, 0, internal, Math.max(1, w | 0), Math.max(1, h | 0), 0,
            gl.RGBA, useHdr && this.hdrFormat === gl.RGBA16F ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            // Откат на надёжный LDR-формат
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.max(1, w | 0), Math.max(1, h | 0), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.hdrFormat = gl.RGBA8;
        }

        return { tex, fbo, w: Math.max(1, w | 0), h: Math.max(1, h | 0) };
    }

    _deleteTarget(t) {
        if (!t) return;
        const gl = this.gl;
        if (t.tex) gl.deleteTexture(t.tex);
        if (t.fbo) gl.deleteFramebuffer(t.fbo);
    }

    _buildTargets() {
        const gl = this.gl;
        const w = this._bufW;
        const h = this._bufH;

        Object.keys(this.fbos).forEach(k => this._deleteTarget(this.fbos[k]));
        this.fbos = {};

        this.fbos.scene = this._makeTarget(w, h, true);
        this.fbos.bright = this._makeTarget(w >> 1, h >> 1, true);
        this.fbos.blurA = this._makeTarget(w >> 1, h >> 1, true);
        this.fbos.blurB = this._makeTarget(w >> 1, h >> 1, true);
        this.fbos.small = this._makeTarget(w >> 2, h >> 2, true);
        this.fbos.smallA = this._makeTarget(w >> 2, h >> 2, true);
        this.fbos.smallB = this._makeTarget(w >> 2, h >> 2, true);
        this.fbos.anam = this._makeTarget(w >> 2, h >> 3, true);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---------------------------------------------------------------------
     * Изменение размера канвы
     * ------------------------------------------------------------------- */
    resize(cssW, cssH, dpr = window.devicePixelRatio || 1) {
        if (!this.gl) return;
        const clampedDpr = Math.min(dpr, this.quality === 'high' ? 1.5 : 1.25);
        this._dpr = clampedDpr;

        const w = Math.max(320, Math.floor(cssW * clampedDpr * this.renderScale));
        const h = Math.max(240, Math.floor(cssH * clampedDpr * this.renderScale));

        if (this.canvas.width !== w || this.canvas.height !== h || !this.fbos.scene) {
            this.canvas.width = w;
            this.canvas.height = h;
            this._bufW = w;
            this._bufH = h;
            this._buildTargets();
        }
        this.width = w;
        this.height = h;
    }

    setRenderScale(scale) {
        const s = Math.max(0.5, Math.min(1.5, scale));
        if (Math.abs(s - this.renderScale) < 0.02) return;
        this.renderScale = s;
        const cssW = this.canvas.clientWidth || window.innerWidth;
        const cssH = this.canvas.clientHeight || window.innerHeight;
        this.resize(cssW, cssH, this._dpr);
    }

    /* ---------------------------------------------------------------------
     * Вспомогательные привязки
     * ------------------------------------------------------------------- */
    _useProgram(name) {
        const p = this.programs[name];
        if (!p) return null;
        this.gl.useProgram(p.prog);
        return p.uniforms;
    }

    _bindTarget(target, clear = true) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
        const w = target ? target.w : this.width;
        const h = target ? target.h : this.height;
        gl.viewport(0, 0, w, h);
        if (clear) {
            gl.clearColor(0.008, 0.015, 0.035, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        return { w, h };
    }

    _drawFullscreen() {
        const gl = this.gl;
        gl.bindVertexArray(this.vaoFullscreen);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    _bindTex(unit, tex, loc) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (loc) gl.uniform1i(loc, unit);
    }

    /* ---------------------------------------------------------------------
     * Главный кадр
     * state = {
     *   time, dt, travel, speedNorm, stretch, tunnelCover, charge, warp,
     *   pulse, flash, energy, shake:{x,y}, roll, exposure, chroma, radialBlur,
     *   bloom, streak, grain, vignette, letterbox, fade, jitter, glowFade, scanline
     * }
     * ------------------------------------------------------------------- */
    render(state) {
        if (!this.ok || !this.gl) return;
        const gl = this.gl;
        const s = state;

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        /* === ПРОХОД 1: HDR-сцена ========================================= */
        this._bindTarget(this.fbos.scene, true);

        // 1.1 Гипертоннель: оболочки от дальней к ближней (аддитивно)
        if (s.tunnelCover > 0.002) {
            const u = this._useProgram('tunnel');
            if (u) {
                const vp = this._makeViewProj();
                gl.bindVertexArray(this.vaoTunnel);
                for (let i = this.tunnelShells.length - 1; i >= 0; i--) {
                    const shell = this.tunnelShells[i];
                    gl.uniformMatrix4fv(u.uViewProj, false, vp);
                    gl.uniform1f(u.uTravel, s.travel * shell.scroll);
                    gl.uniform1f(u.uScroll, shell.scroll);
                    gl.uniform1f(u.uLength, shell.length);
                    gl.uniform1f(u.uRadius, shell.radius * (1 + 0.12 * Math.sin(s.time * 0.7 + i)));
                    gl.uniform1f(u.uTime, s.time);
                    gl.uniform1f(u.uWobble, shell.wobble);
                    gl.uniform1f(u.uSpeedNorm, s.speedNorm);
                    gl.uniform1f(u.uOpacity, shell.opacity * s.tunnelCover);
                    gl.uniform1f(u.uOctaves, this.octaves);
                    gl.uniform1f(u.uSeed, shell.seed);
                    gl.uniform3fv(u.uColorA, shell.colorA);
                    gl.uniform3fv(u.uColorB, shell.colorB);
                    gl.uniform3fv(u.uColorC, shell.colorC);
                    gl.drawElements(gl.TRIANGLES, this.tunnelIndexCount, gl.UNSIGNED_SHORT, 0);
                }
                gl.bindVertexArray(null);
            }
        }

        // 1.2 Звёздные штрихи (instanced quads)
        {
            const u = this._useProgram('star');
            if (u) {
                gl.uniform2f(u.uResolution, this.width, this.height);
                gl.uniform1f(u.uFov, this._fov());
                gl.uniform1f(u.uTravel, s.travel);
                gl.uniform1f(u.uStretch, s.stretch);
                gl.uniform1f(u.uZNear, 0.35);
                gl.uniform1f(u.uZFar, 190.0);
                gl.uniform1f(u.uBrightness, s.starBrightness);
                gl.uniform1f(u.uTime, s.time);
                gl.uniform1f(u.uJitter, s.jitter);
                gl.uniform1f(u.uGlowFade, s.glowFade);
                gl.bindVertexArray(this.vaoStars);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.starCount);
                gl.bindVertexArray(null);
            }
        }

        // 1.3 Плазменные искры
        if (s.sparkIntensity > 0.01) {
            const u = this._useProgram('spark');
            if (u) {
                gl.uniform2f(u.uResolution, this.width, this.height);
                gl.uniform1f(u.uFov, this._fov());
                gl.uniform1f(u.uTravel, s.travel);
                gl.uniform1f(u.uTime, s.time);
                gl.uniform1f(u.uIntensity, s.sparkIntensity);
                gl.bindVertexArray(this.vaoSpark);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.sparkCount);
                gl.bindVertexArray(null);
            }
        }

        // 1.4 Газовые волокна (полноэкранный аддитивный слой)
        if (s.gasCover > 0.01) {
            const u = this._useProgram('gas');
            if (u) {
                gl.bindVertexArray(this.vaoFullscreen);
                gl.uniform2f(u.uResolution, this.width, this.height);
                gl.uniform1f(u.uTime, s.time);
                gl.uniform1f(u.uTravel, s.travel);
                gl.uniform1f(u.uCover, s.gasCover);
                gl.uniform1f(u.uSpeedNorm, s.speedNorm);
                gl.uniform1f(u.uOctaves, this.quality === 'low' ? 2 : 4);
                gl.uniform1f(u.uEnergy, s.energy);
                this._drawFullscreen();
                gl.bindVertexArray(null);
            }
        }

        // 1.5 Ядро перехода / оптический горизонт
        if (s.coreIntensity > 0.01) {
            const u = this._useProgram('core');
            if (u) {
                gl.bindVertexArray(this.vaoFullscreen);
                gl.uniform2f(u.uResolution, this.width, this.height);
                gl.uniform1f(u.uTime, s.time);
                gl.uniform1f(u.uCharge, s.charge);
                gl.uniform1f(u.uWarp, s.warpLevel);
                gl.uniform1f(u.uPulse, s.pulse);
                gl.uniform1f(u.uEnergy, s.energy);
                gl.uniform2f(u.uOffset, s.shakeX * 0.0016, -s.shakeY * 0.0016);
                // Масштаб вклада ядра задаётся через яркость сцены (аддитивно)
                this._drawFullscreen();
                gl.bindVertexArray(null);
            }
        }

        /* === ПРОХОД 2: Bright pass (1/2) ================================ */
        gl.disable(gl.BLEND);
        let u = this._useProgram('bright');
        if (u) {
            this._bindTarget(this.fbos.bright, false);
            this._bindTex(0, this.fbos.scene.tex, u.uScene);
            gl.uniform1f(u.uThreshold, s.bloomThreshold);
            gl.uniform1f(u.uKnee, 0.35);
            this._drawFullscreen();
        }

        /* === ПРОХОД 3: Bloom 1/2 (H + V) ================================ */
        u = this._useProgram('blur');
        if (u) {
            // H
            this._bindTarget(this.fbos.blurA, false);
            this._bindTex(0, this.fbos.bright.tex, u.uSource);
            gl.uniform2f(u.uDir, 1.0 / this.fbos.blurA.w, 0.0);
            this._drawFullscreen();
            // V
            this._bindTarget(this.fbos.blurB, false);
            this._bindTex(0, this.fbos.blurA.tex, u.uSource);
            gl.uniform2f(u.uDir, 0.0, 1.0 / this.fbos.blurB.h);
            this._drawFullscreen();
        }

        /* === ПРОХОД 4: Широкий bloom 1/4 ================================ */
        if (u) {
            // Downsample: blurB -> small (через билинейную фильтрацию blur-прохода)
            this._bindTarget(this.fbos.small, false);
            this._bindTex(0, this.fbos.blurB.tex, u.uSource);
            gl.uniform2f(u.uDir, 1.0 / this.fbos.small.w, 0.0);
            this._drawFullscreen();

            this._bindTarget(this.fbos.smallA, false);
            this._bindTex(0, this.fbos.small.tex, u.uSource);
            gl.uniform2f(u.uDir, 0.0, 1.0 / this.fbos.smallA.h);
            this._drawFullscreen();

            this._bindTarget(this.fbos.smallB, false);
            this._bindTex(0, this.fbos.smallA.tex, u.uSource);
            gl.uniform2f(u.uDir, 1.6 / this.fbos.smallB.w, 0.0);
            this._drawFullscreen();
        }

        /* === ПРОХОД 5: Анаморфный штрих объектива (1/4) ================= */
        u = this._useProgram('anam');
        if (u) {
            this._bindTarget(this.fbos.anam, false);
            this._bindTex(0, this.fbos.bright.tex, u.uSource);
            gl.uniform2f(u.uTexel, 1.0 / this.fbos.anam.w, 1.0 / this.fbos.anam.h);
            gl.uniform1f(u.uLength, s.streakLength);
            this._drawFullscreen();
        }

        /* === ПРОХОД 6: Композит на экран ================================ */
        u = this._useProgram('composite');
        if (u) {
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            this._bindTarget(null, true);
            this._bindTex(0, this.fbos.scene.tex, u.uScene);
            this._bindTex(1, this.fbos.blurB.tex, u.uBloom);
            this._bindTex(2, this.fbos.smallB.tex, u.uBloomWide);
            this._bindTex(3, this.fbos.anam.tex, u.uAnam);
            gl.uniform2f(u.uResolution, this.width, this.height);
            gl.uniform1f(u.uTime, s.time);
            gl.uniform1f(u.uExposure, s.exposure);
            gl.uniform1f(u.uBloomStrength, s.bloom);
            gl.uniform1f(u.uStreak, s.streak);
            gl.uniform1f(u.uRadialBlur, s.radialBlur);
            gl.uniform1f(u.uChroma, s.chroma);
            gl.uniform1f(u.uVignette, s.vignette);
            gl.uniform1f(u.uGrain, s.grain);
            gl.uniform1f(u.uFlash, s.flash);
            gl.uniform1f(u.uFade, s.fade);
            gl.uniform1f(u.uLetterbox, s.letterbox);
            gl.uniform1f(u.uSpeedNorm, s.speedNorm);
            gl.uniform1f(u.uScanline, s.scanline);
            gl.uniform2f(u.uShakeUv, s.shakeX * 0.0022, -s.shakeY * 0.0022);
            gl.uniform1f(u.uZoomUv, 1.03 + Math.abs(s.shakeX) * 0.0009 + Math.abs(s.shakeY) * 0.0009);
            gl.uniform1f(u.uRoll, (s.roll || 0) * 0.0175);
            this._drawFullscreen();
        }

        gl.bindVertexArray(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _fov() {
        return this._fovPx || 750;
    }

    /**
     * Проекция в конвенции 2D-движка AURORA:
     *   px = (x / z) * fov,  py = -(y / z) * fov  (z — «вперёд», положительный)
     */
    _makeViewProj() {
        const fov = this._fovPx || 750;
        const w = this.width;
        const h = this.height;
        const near = 0.35;
        const far = 600;

        const m00 = fov / (w * 0.5);
        const m11 = -fov / (h * 0.5);
        const m22 = (far + near) / (far - near);
        const m23 = (-2 * far * near) / (far - near);

        if (!this._vp) this._vp = new Float32Array(16);
        const m = this._vp;
        m[0] = m00; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = m11; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = m22; m[11] = m23;
        m[12] = 0; m[13] = 0; m[14] = 1; m[15] = 0;
        return m;
    }

    setFovPx(fov) {
        this._fovPx = fov;
    }

    dispose() {
        const gl = this.gl;
        if (!gl) return;
        Object.keys(this.fbos).forEach(k => this._deleteTarget(this.fbos[k]));
        this.fbos = {};
        Object.keys(this.programs).forEach(k => gl.deleteProgram(this.programs[k].prog));
        this.programs = {};
        this.ok = false;
    }
}

export default WarpGLRenderer;
