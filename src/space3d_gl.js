/**
 * src/space3d_gl.js — AURORA: GPU-ядро глубокого космоса (WebGL2)
 * ============================================================================
 * Роли команды:
 *   • Lead 3D Graphics Programmer — HDR-конвейер неба, ACES, PBR-освещение
 *   • 3D Environment Artist       — запечённый skydome (Млечный Путь, пыль,
 *                                   туманности) + 7 000 звёздных спрайтов
 *   • VFX Artist                  — планетарные шейдеры, атмосферное
 *                                   рассеяние, дифракционные лучи звёзд
 *
 * Что даёт модуль по сравнению с CPU-рендером:
 *   1. Фотореалистичная Земля: day/night/облака/спекуляр океана/ночные огни
 *      городов/нормал-маппинг рельефа/рэлеевская атмосфера/терминатор.
 *   2. Луна с бампом кратеров, пепельным светом и мягким терминатором.
 *   3. Полностью GPU-skydome: Млечный Путь с Великим Разломом, галактическое
 *      ядро, 6 диффузных туманностей и межзвёздная пыль — один quad в кадре.
 *   4. Кристально резкие звёзды (спрайты с PSF и 4-лучевыми дифракционными
 *      крестами), мерцание, спектральные классы O/B → M.
 *   5. Кинематографический тонмаппинг ACES и лёгкое Bloom-свечение неба.
 *
 * Производительность: 1 quad + ~7000 GL_POINTS + 2 сферы = 3 draw call'а.
 * Запекание неба выполняется фоновыми срезами (не блокирует интерфейс).
 * ============================================================================
 */

const FULLSCREEN_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 1. ЗАПЕКАНИЕ СКАЙДОМА (выполняется один раз срезами)
 * ------------------------------------------------------------------------- */
const BAKE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform vec3 uNebDir[6];
uniform vec4 uNebParam[6];
uniform vec3 uNebColor[6];
out vec4 outColor;

void main() {
    // Направление взгляда в экваториальных сферических координатах
    float theta = (vUv.x - 0.5) * 6.28318530718;
    float phi = (0.5 - vUv.y) * 3.14159265359;
    vec3 dir = vec3(cos(phi) * sin(theta), sin(phi), cos(phi) * cos(theta));

    // Глубокий бархатный космический вакуум
    vec3 col = vec3(0.0006, 0.0008, 0.0018);

    // Тончайшая изотропная космическая дымка дальнего космоса (без полос, без растяжений, 0 лагов)
    float s1 = sin(dir.x * 2.5 + dir.y * 1.8) * cos(dir.z * 2.5 + dir.x * 1.2);
    float s2 = cos(dir.y * 4.6 - dir.z * 2.2) * sin(dir.x * 3.8 + dir.z * 1.7);
    float dust = max(0.0, s1 * 0.5 + s2 * 0.35 + 0.15);
    col += vec3(0.0007, 0.0011, 0.0024) * (dust * dust);

    outColor = vec4(col, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 2. ВЫВОД СКАЙДОМА С КАМЕРОЙ (ACES-тонмаппинг)
 * ------------------------------------------------------------------------- */
const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSkyTex;
uniform mat3 uViewInv;     // камера → мир
uniform vec2 uResolution;
uniform float uFov;
uniform float uExposure;
uniform float uNebulaBoost;
uniform float uTime;
out vec4 outColor;

// Треугольный дизеринг — убирает ступеньки на тёмных градиентах (8 бит)
float tridither(vec2 fc) {
    float r1 = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
    float r2 = fract(sin(dot(fc, vec2(63.7264, 10.873))) * 24634.6345);
    return (r1 + r2 - 1.0) * (1.0 / 255.0);
}

void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 dirCam = vec3(ndc.x * uResolution.x * 0.5 / uFov, ndc.y * uResolution.y * 0.5 / uFov, 1.0);
    vec3 dir = normalize(uViewInv * dirCam);

    float u = atan(dir.x, dir.z) * 0.15915494 + 0.5;
    float v = 0.5 - asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989;

    // Прямая выборка без блюра — оригинальная резкость запечённого скайдома
    vec3 sky = texture(uSkyTex, vec2(u, v)).rgb;

    // ACES / HDR коэффициенты
    vec3 col = sky * uExposure * uNebulaBoost;

    // Треугольный дизеринг — устраняет полосы (banding) на тёмном вакууме
    col += tridither(gl_FragCoord.xy + vec2(uTime * 7.3, -uTime * 3.1));

    outColor = vec4(col, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3. ЗВЁЗДНЫЕ СПРАЙТЫ (PSF + дифракционные кресты + мерцание)
 * ------------------------------------------------------------------------- */
const STAR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aDir;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec3 aParam;   // x: поток (HDR), y: размер, z: фаза
uniform mat4 uViewProj;
uniform float uPixelScale;
uniform float uTime;
uniform float uTwinkle;
out vec3 vColor;
out float vFlux;
out float vSpike;

void main() {
    vec4 clip = uViewProj * vec4(aDir * 1000.0, 1.0);
    gl_Position = clip;

    // В вакууме звёзды не мерцают (сцинтилляция — эффект атмосферы):
    // остаётся лишь микродрожание оптики прибора.
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * 0.9 + aParam.z));
    vFlux = aParam.x * tw;
    vColor = aColor;
    // Лучи — только у самых ярких звёзд (дифракция на диафрагме)
    vSpike = aParam.x > 7.0 ? 1.0 : 0.0;

    float size = aParam.y * uPixelScale * (1.0 + 0.34 * log2(1.0 + aParam.x));
    gl_PointSize = clamp(size, 1.0, 64.0);
}`;

const STAR_FS = `#version 300 es
precision highp float;
in vec3 vColor;
in float vFlux;
in float vSpike;
out vec4 outColor;

void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;

    // PSF прибора: ядро Эйри + широкий ореол + слабая дымка каталога.
    // Все три компонента работают в HDR — ядро ярких звёзд уходит за 1.0 и
    // после ACES «выбивается в белый», а ореол даёт цветной ободок.
    float core = exp(-d * d * 5.4);
    float halo = 0.16 * pow(max(0.0, 1.0 - d), 2.2);
    float haze = 0.045 * pow(max(0.0, 1.0 - d), 1.05);

    float spike = 0.0;
    if (vSpike > 0.5) {
        // Шестилучевая диафрагма: горизонталь/вертикаль сильнее диагоналей
        vec2 q = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
        float armH = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 2.4);
        float armV = exp(-abs(p.x) * 34.0) * exp(-abs(p.y) * 2.4);
        float armD = (exp(-abs(q.y) * 44.0) * exp(-abs(q.x) * 3.0)) * 0.45;
        spike = (armH + armV * 0.7 + armD) * 0.75;
    }

    float prof = core + halo + haze + spike;
    vec3 radiance = vColor * prof * vFlux;
    outColor = vec4(radiance, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3b. СОЛНЦЕ: билборд с физическим диском и потемнением к краю
 *     Радиус диска = 0.2665° (угловой размер Солнца с Земли), радианс ~55 —
 *     это HDR-источник, который далее подхватывает bloom и ACES.
 * ------------------------------------------------------------------------- */
const SUN_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform vec2 uSunNdc;      // центр Солнца в NDC
uniform vec2 uSunHalf;     // половина размера квада в NDC
out vec2 vQ;
void main() {
    vQ = aPos;
    vec3 p = vec3(uSunNdc + aPos * uSunHalf, 0.999995);
    gl_Position = vec4(p, 1.0);
}`;

const SUN_FS = `#version 300 es
precision highp float;
in vec2 vQ;
uniform float uDisc;         // радиус диска в единицах квада (0…1)
uniform float uRadiance;     // HDR-яркость диска
uniform vec3 uTint;
out vec4 outColor;
void main() {
    float d = length(vQ);
    if (d > 1.0) discard;

    // Диск: потемнение к краю I(μ) = 1 − u(1 − μ), u = 0.62
    float t = min(1.0, d / max(uDisc, 0.0001));
    float mu = sqrt(max(0.0, 1.0 - t * t));
    float limb = 1.0 - 0.62 * (1.0 - mu);
    float disc = smoothstep(uDisc * 1.03, uDisc * 0.955, d) * limb;

    // Хромосфера/корона: свечение порядка 1e-3 от диска, но широкое
    float corona = pow(max(0.0, 1.0 - d), 3.4) * 0.020;

    vec3 col = uTint * (disc + corona) * uRadiance;
    outColor = vec4(col, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3c. BLOOM: bright-pass с «мягким коленом» + двухфильтровый (dual filter)
 *     каскад понижений/повышений разрешения — свет от Солнца и ярких звёзд
 *     «протекает» на соседние пиксели, как на реальной оптике.
 * ------------------------------------------------------------------------- */
const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
out vec4 outColor;

void main() {
    // Коробчатый 2×2-фильтр: четыре билинейные выборки = 16 текселей
    vec3 s = texture(uSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb
           + texture(uSrc, vUv + uTexel * vec2( 0.5, -0.5)).rgb
           + texture(uSrc, vUv + uTexel * vec2(-0.5,  0.5)).rgb
           + texture(uSrc, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
    s *= 0.25;

    float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));
    float knee = max(uKnee, 0.0001);
    float soft = clamp(lum - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee);
    float contrib = max(soft, lum - uThreshold) / max(lum, 0.0001);
    outColor = vec4(max(s * contrib, vec3(0.0)), 1.0);
}`;

const BLOOM_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uMode;    // 0 — down (box), 1 — up (tent, аддитивно)
uniform float uWeight;
out vec4 outColor;

void main() {
    vec3 c;
    if (uMode < 0.5) {
        c = texture(uSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb
          + texture(uSrc, vUv + uTexel * vec2( 0.5, -0.5)).rgb
          + texture(uSrc, vUv + uTexel * vec2(-0.5,  0.5)).rgb
          + texture(uSrc, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
        c *= 0.25;
    } else {
        // Шатёр 3×3: сумма весов = 1 (центр 4/16, ребра 2/16, углы 1/16)
        c  = texture(uSrc, vUv).rgb * 0.25;
        c += (texture(uSrc, vUv + vec2(uTexel.x, 0.0)).rgb
            + texture(uSrc, vUv - vec2(uTexel.x, 0.0)).rgb
            + texture(uSrc, vUv + vec2(0.0, uTexel.y)).rgb
            + texture(uSrc, vUv - vec2(0.0, uTexel.y)).rgb) * 0.125;
        c += (texture(uSrc, vUv + uTexel).rgb
            + texture(uSrc, vUv - uTexel).rgb
            + texture(uSrc, vUv + vec2(uTexel.x, -uTexel.y)).rgb
            + texture(uSrc, vUv + vec2(-uTexel.x, uTexel.y)).rgb) * 0.0625;
    }
    outColor = vec4(c * uWeight, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3d. ФИНАЛЬНЫЙ ПРОХОД: HDR + bloom → ACES → оптика объектива → сигнал
 *     Здесь же живёт «плёнка»: хроматическая аберрация, виньетка cos⁴,
 *     зерно сенсора и дизеринг (без него 8 бит дают ступеньки на градиентах).
 * ------------------------------------------------------------------------- */
const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uGrain;
uniform float uChroma;
uniform float uTime;
uniform vec2 uResolution;
out vec4 outColor;

vec3 aces(vec3 x) {
    const float a = 2.51; const float b = 0.03; const float c = 2.43;
    const float d = 0.59; const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    // --- Оптическая геометрия защитного стекла шлема скафандра (NASA EMU Visor + Fisheye <= 10%) ---
    vec2 dv = vUv - 0.5;
    // Нормализованное радиальное расстояние от оптического центра
    vec2 pNorm = dv * 2.0;
    float r2 = dot(pNorm, pNorm);

    // Линзовое бочкообразное искажение (Fish-Eye Lens) визора шлема
    // Откалибровано по запросу: уменьшено ровно на 3% (максимум в углах 5.8% вместо 8.8%)
    float k1 = 0.021;
    float k2 = 0.004;
    float barrel = 1.0 + k1 * r2 + k2 * (r2 * r2);
    vec2 visorUv = 0.5 + dv * barrel;

    // Мягкое удержание в границах кадра
    vec2 sampleUv = clamp(visorUv, vec2(0.001), vec2(0.999));

    // Хроматическая дисперсия стекла шлема (усиливается к краям поля зрения)
    vec2 off = dv * (uChroma * (0.35 + r2 * 1.5));
    vec3 col;
    col.r = texture(uScene, clamp(visorUv + off, vec2(0.001), vec2(0.999))).r;
    col.g = texture(uScene, sampleUv).g;
    col.b = texture(uScene, clamp(visorUv - off, vec2(0.001), vec2(0.999))).b;

    col += texture(uBloom, sampleUv).rgb * uBloomStrength;
    col *= uExposure;
    col = aces(max(col, vec3(0.0)));

    // Тонкая плёночная кривая: холодные тени, нейтральные света
    col = pow(col, vec3(0.985, 0.997, 1.012));
    col = mix(col, col * vec3(0.93, 0.96, 1.05), 0.16);

    // Золотистое антибликовое напыление визора скафандра (NASA EMU Gold Sun Visor)
    // Тонкий мягкий золотисто-янтарный отблеск по верхнему и боковому периметру стекла
    float rimGlint = smoothstep(0.35, 1.8, r2) * max(0.0, -dv.y * 0.7 + 0.3);
    vec3 goldSheen = vec3(0.96, 0.78, 0.38) * (rimGlint * 0.036);
    col += goldSheen;

    // Виньетка визора скафандра (естественное затемнение по контуру шлема)
    float vig = 1.0 - uVignette * r2 * 0.40;
    // Мягкий спад к уплотнителю визора на крайних углах
    float helmetSeal = 1.0 - smoothstep(1.4, 2.1, r2) * 0.25;
    col *= clamp(vig * helmetSeal, 0.0, 1.0);

    // Зерно сенсора + дизеринг
    vec2 fc = gl_FragCoord.xy + vec2(uTime * 37.0, -uTime * 21.0);
    float g = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
    float g2 = fract(sin(dot(fc, vec2(63.7264, 10.873))) * 24634.6345);
    col += ((g + g2) * 0.5 - 0.5) * uGrain;

    outColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 4. ПЛАНЕТЫ: PBR-сфера с нормал-маппингом, облаками, спекуляром океана,
 *    ночными огнями городов и атмосферным рассеянием
 * ------------------------------------------------------------------------- */
const SPHERE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform float uRadius;
out vec3 vNormal;
out vec2 vUv;
out vec3 vWorld;

void main() {
    vec3 world = uCenter + aPos * uRadius;
    vNormal = aNormal;
    vUv = aUv;
    vWorld = world;
    gl_Position = uViewProj * vec4(world, 1.0);
}`;

const SPHERE_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
in vec3 vWorld;
uniform vec3 uSunDir;
uniform vec3 uEarthDir;
uniform float uBodyType;      // 0 = Земля, 1 = Луна
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform vec2 uTexel;
uniform float uGroundShift;
uniform float uCloudShift;
uniform float uCloudOpacity;
uniform float uBumpScale;
uniform float uSpecular;
uniform float uAmbient;
uniform vec3 uAmbientColor;
uniform float uAtmosphere;
uniform float uExposure;
out vec4 outColor;

const float PI = 3.14159265359;

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vWorld);
    vec3 L = normalize(uSunDir);

    vec2 uv = vec2(fract(vUv.x + uGroundShift), vUv.y);

    // --- Планетарный бамп из яркости альбедо (кратеры, горы, хребты)
    float h0 = dot(texture(uDay, uv).rgb, vec3(0.299, 0.587, 0.114));
    float hx = dot(texture(uDay, uv + vec2(uTexel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float hy = dot(texture(uDay, uv - vec2(0.0, uTexel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));

    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 east = normalize(cross(up, N) + 1e-5);
    vec3 north = normalize(cross(N, east));
    // Амплитуда рельефа спадает к терминатору: иначе на скользящем свете
    // склоны «ловят» солнце и на лимбе возникает резкая яркая кайма.
    float graze = smoothstep(0.02, 0.38, dot(N, L));
    vec3 Nb = normalize(N + east * (h0 - hx) * uBumpScale * 26.0 * graze
                          + north * (h0 - hy) * uBumpScale * 26.0 * graze);

    float ndl = dot(Nb, L);
    float ndlGeom = dot(N, L);

    // --- Мягкий терминатор (полутень атмосферы)
    float dayMask = smoothstep(-0.10, 0.26, ndlGeom);

    vec3 albedo = texture(uDay, uv).rgb;
    vec3 color;

    if (uBodyType < 0.5) {
        // ---------- ЗЕМЛЯ ----------
        vec3 nightTex = texture(uNight, uv).rgb;
        float ocean = smoothstep(0.02, 0.16, albedo.b - max(albedo.r, albedo.g));
        float land = 1.0 - ocean;

        // Диффузное освещение суши/океана + подсветка лимбового рассеяния
        vec3 sunColor = vec3(1.0, 0.965, 0.92);
        // Диффуз + мягкий терминатор (полутень) по геометрической нормали
        vec3 lit = albedo * sunColor * clamp(ndl, 0.0, 1.0) * mix(0.16, 1.0, dayMask);

        // --- Океан: солнечный глиттер по Гауссу + широкий блик + френелевское отражение
        vec3 H = normalize(L + V);
        float oceanMask = smoothstep(0.02, 0.16, albedo.b - max(albedo.r, albedo.g));
        float fresnelWater = pow(1.0 - max(dot(Nb, V), 0.0), 4.5);
        vec3 glintAxis = normalize(vec3(-H.z, 0.0, H.x) + 1e-5);
        float aniso = abs(dot(Nb, glintAxis));
        vec3 Hg = normalize(H + glintAxis * (H - L) * 0.16);
        float micro = pow(max(dot(Nb, Hg), 0.0), 360.0) * (1.0 - aniso * 0.55);
        float wide = pow(max(dot(Nb, H), 0.0), 36.0);
        float glitter = (micro * 4.2 + wide * 0.24) * (1.0 + fresnelWater * 2.2);
        float spec = glitter * oceanMask * uSpecular * step(0.0, ndl);

        // Ночные огни городов на тёмной стороне (теплые натриевые лампы, микросвечение)
        float nm = smoothstep(-0.12, 0.08, ndlGeom);
        nm = nm * nm * (3.0 - 2.0 * nm);
        float nightMask = 1.0 - nm;
        vec3 cityLights = max(nightTex - vec3(0.09, 0.09, 0.18), 0.0) * 3.9;
        cityLights *= vec3(1.10, 0.93, 0.76) * nightMask;

        // Облачный слой (свободно дрейфует относительно поверхности).
        vec2 cuv = vec2(fract(uv.x + uCloudShift), uv.y);
        float cloudBase = texture(uClouds, cuv).r;
        float cloudFine = texture(uClouds, vec2(fract(cuv.x * 2.7 + 0.31), clamp(cuv.y * 2.7 + 0.17, 0.0, 1.0))).r;
        float clouds = smoothstep(0.10, 0.60, cloudBase);
        clouds = clamp(clouds * (0.72 + 0.58 * cloudFine), 0.0, 1.0);
        clouds *= uCloudOpacity;
        float cloudLit = clamp(dot(N, L) + 0.10, 0.0, 1.0);
        vec3 cloudColor = vec3(1.0) * (0.20 + pow(cloudLit, 1.35) * 0.98) * sunColor;
        clouds *= mix(0.04, 1.0, smoothstep(-0.30, 0.02, ndlGeom));

        // --- ТЕНИ ОБЛАКОВ: сэмплируем карту облаков со смещением по Солнцу
        vec2 sunUv = vec2(-L.x, L.y) * 0.010 * (1.0 + 6.0 * (1.0 - clamp(ndlGeom, 0.0, 1.0)));
        float shadowC = texture(uClouds, vec2(fract(cuv.x + sunUv.x), clamp(cuv.y + sunUv.y, 0.0, 1.0))).r;
        shadowC = smoothstep(0.22, 0.78, shadowC) * uCloudOpacity;
        lit *= (1.0 - shadowC * 0.42 * clamp(ndlGeom + 0.25, 0.0, 1.0));
        float edge = clamp(clouds - shadowC * 0.85, 0.0, 1.0);
        cloudColor += vec3(0.28, 0.30, 0.34) * edge * 0.9;
        color = mix(lit + cityLights + spec, cloudColor, clouds * 0.90);

        // Огненный пояс заката / рассвета на терминаторе (twilight ember belt)
        float twilightMask = exp(-pow((ndlGeom - 0.035) / 0.085, 2.0));
        vec3 twilightColor = vec3(1.0, 0.42, 0.12) * (twilightMask * 0.48 * (0.65 + clouds * 0.5));
        color += twilightColor;

        // Атмосферный лимб: рэлеевское рассеяние (голубой обод)
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.4);
        float sunSide = smoothstep(-0.45, 0.65, dot(N, L));
        vec3 rayleigh = mix(vec3(0.16, 0.42, 1.0), vec3(0.85, 0.55, 0.30), smoothstep(0.1, -0.1, dot(N, L)));
        color += rayleigh * fres * sunSide * uAtmosphere * 0.30 * (0.85 + clouds * 0.35);
    } else {
        // ---------- ЛУНА ----------
        vec3 sunColor = vec3(1.0, 0.97, 0.93);

        // Закон Ломмеля-Зеелигера для безатмосферного пористого реголита:
        // естественная глубина кратеров и микрорельеф
        float cosI = max(ndl, 0.0);
        float cosE = max(dot(Nb, V), 0.0);
        float lommel = cosI / max(cosI + cosE, 0.001);
        vec3 lunarLit = albedo * sunColor * mix(cosI, lommel * 1.85, 0.45);
        color = lunarLit * 1.10;

        // Пепельный свет Земли (Earthshine) на ночной стороне
        vec3 toEarth = normalize(uEarthDir);
        float earthFill = max(dot(Nb, toEarth), 0.0) * (1.0 - clamp(ndl, 0.0, 1.0));
        color += albedo * vec3(0.18, 0.32, 0.58) * earthFill * (uAmbient * 1.35);

        // Оппозиционный пик реголита у лимба
        float opp = pow(max(dot(-V, L), 0.0), 8.0) * 0.28;
        color += albedo * vec3(0.95, 0.96, 1.0) * opp * cosI;

        // Слабое свечение реголита у лимба
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        color += vec3(0.55, 0.62, 0.78) * fres * max(ndl, 0.0) * 0.12;
    }

    // Общий ambient и экспозиция
    color += albedo * uAmbientColor * uAmbient * dayMask;

    color *= uExposure;
    outColor = vec4(color, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 5. АТМОСФЕРНАЯ ОБОЛОЧКА ЗЕМЛИ (аддитивное рассеяние)
 * ------------------------------------------------------------------------- */
const ATMO_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
in vec3 vWorld;
uniform vec3 uSunDir;        // направление на Солнце, мировая система
uniform vec3 uCenter;        // центр планеты, мировая система
uniform float uRadius;       // радиус оболочки атмосферы
uniform float uPlanetRadius; // радиус твёрдой поверхности
uniform float uStrength;
uniform float uFalloff;
out vec4 outColor;

/* ===========================================================================
 * АНАЛИТИЧЕСКОЕ РАССЕЯНИЕ В АТМОСФЕРЕ (интеграл по лучу зрения)
 *
 * Модель: экспоненциальные профили плотности по высоте, рэлеевская и
 * ми-компоненты рассеяния, учёт оптической глубины к наблюдателю (extinction)
 * и тени планеты. Это тот же класс модели, что используют симуляторы
 * (Nishita / O'Neil), но с малым числом шагов и дизерингом:
 *   • голубой лимб, оранжевый горизонт со стороны Солнца;
 *   • затухание диска у терминатора;
 *   • «закатный» красный пояс там, где луч проходит низко над поверхностью.
 * =========================================================================== */

const float PI = 3.14159265359;

/* Единицы сцены: радиус Земли = 1000 единиц = 6371 км, значит 1 единица = 6.371 км.
   Коэффициенты рассеяния и шкалы высот приведены из километров в единицы сцены,
   поэтому интеграл сразу получается в физически осмысленных величинах
   (вертикальная оптическая толщина: синий ≈ 0.30, красный ≈ 0.05). */
const float KM_PER_UNIT      = 6.371;
const float RAYLEIGH_SCALE_H = 9000.0 / KM_PER_UNIT;     // 1412.6 единиц
const float MIE_SCALE_H      = 1400.0 / KM_PER_UNIT;     // 219.7 единиц
const vec3  BETA_RAYLEIGH    = vec3(5.5e-6, 13.0e-6, 33.1e-6) * KM_PER_UNIT;
const float BETA_MIE         = 21.0e-6 * KM_PER_UNIT;
const float MIE_G            = 0.758;
const int   STEPS            = 14;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

bool raySphere(vec3 o, vec3 d, vec3 c, float r, out float t0, out float t1) {
    vec3 oc = o - c;
    float b = dot(oc, d);
    float cc = dot(oc, oc) - r * r;
    float h = b * b - cc;
    if (h < 0.0) return false;
    h = sqrt(h);
    t0 = -b - h;
    t1 = -b + h;
    return t1 > 0.0;
}

/* Оптическая глубина от точки p до Солнца (для самозатенения атмосферы) */
float sunOpticalDepth(vec3 p, vec3 c, float pr, vec3 sd) {
    float tp0, tp1;
    if (!raySphere(p, sd, c, pr, tp0, tp1)) return 1.0;
    if (tp1 <= 0.0) return 1.0;
    float t = max(tp0, 0.0);
    float len = tp1 - t;
    float sum = 0.0;
    for (int i = 0; i < 4; i++) {
        float ts = t + len * (float(i) + 0.5) / 4.0;
        vec3 q = p + sd * ts;
        float h = max(length(q - c) - pr, 0.0);
        sum += exp(-h / RAYLEIGH_SCALE_H) * (len / 4.0);
    }
    // Возвращаем относительную непрозрачность: полная оптическая толщина
    // на горизонтальной трассе заметно больше вертикальной.
    return clamp(sum / (RAYLEIGH_SCALE_H * 12.0), 0.0, 1.0);
}

void main() {
    vec3 d = normalize(vWorld);              // камера находится в начале мировой системы
    vec3 o = vec3(0.0);
    vec3 sunDir = normalize(uSunDir);

    float t0, t1;
    if (!raySphere(o, d, uCenter, uRadius, t0, t1)) { outColor = vec4(0.0); return; }

    // Ограничиваем луч: до касания поверхности планеты
    float tp0, tp1;
    bool hitSurface = raySphere(o, d, uCenter, uPlanetRadius, tp0, tp1);
    float viewStart = max(t0, 0.0);
    float viewEnd = t1;
    if (hitSurface && tp0 > 0.0) viewEnd = min(viewEnd, tp0);
    if (viewEnd <= viewStart) { outColor = vec4(0.0); return; }

    float stepLen = (viewEnd - viewStart) / float(STEPS);
    float jitter = hash12(gl_FragCoord.xy) * stepLen;

    vec3 sumR = vec3(0.0);
    float sumM = 0.0;
    float odR = 0.0;      // оптическая глубина «к наблюдателю»
    float odM = 0.0;

    for (int i = 0; i < STEPS; i++) {
        vec3 p = o + d * (viewStart + jitter + stepLen * float(i));
        float height = max(length(p - uCenter) - uPlanetRadius, 0.0);
        float hr = exp(-height / RAYLEIGH_SCALE_H) * stepLen;
        float hm = exp(-height / MIE_SCALE_H) * stepLen;
        odR += hr;
        odM += hm;

        float shadow = sunOpticalDepth(p, uCenter, uPlanetRadius, sunDir);
        float sunVis = 1.0 - shadow;              // доля света, дошедшая до точки
        sunVis = sunVis * sunVis * (3.0 - 2.0 * sunVis);
        sumR += hr * sunVis;
        sumM += hm * sunVis;
    }

    // Рэлеевская и ми-фазы
    float mu = dot(d, sunDir);
    float phaseR = 0.0596831 * (1.0 + mu * mu);                       // 3/(16π)
    float g2 = MIE_G * MIE_G;
    float phaseM = 0.0795775 * ((1.0 - g2) * (1.0 + mu * mu)) /
                   ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * MIE_G * mu, 1e-4), 1.5));

    // Ослабление собственного рассеяния по пути к наблюдателю (extinction)
    vec3 tau = BETA_RAYLEIGH * odR + BETA_MIE * odM * 1.15;
    vec3 extinction = exp(-tau);

    vec3 col = (sumR * BETA_RAYLEIGH * phaseR + vec3(sumM * BETA_MIE * phaseM)) * extinction;

    // Модель даёт радиацию «единица = единица солнечной постоянной»; для
    // сцены нужна фотографическая экспозиция. Множитель подобран численно
    // в tools/preview_scene.py так, чтобы яркость лимба совпадала с
    // реальными снимками с МКС (~0.35…0.6 после тонмаппинга).
    col *= uStrength * 0.62;

    // Насыщение: у самой кромки рассеяние уходит в пересвет, как на фото
    col = col / (1.0 + col * 0.35);

    float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
    outColor = vec4(col, a);
}`;


/* ===========================================================================
 * Класс рендерера
 * ======================================================================== */
export class Space3DGLRenderer {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.ok = false;
        this.isReadyLogged = false;

        this.programs = {};
        this.vaos = {};
        this.textures = {};

        this.width = 1;
        this.height = 1;
        this.renderScale = 0.92;
        this.dpr = 1;
        this.quality = 'high';

        this.skyBakeSize = { w: 2048, h: 1024 };
        this.bakeReady = false;
        this.bakeSlices = 0;
        this.bakeDoneSlices = 0;

        this.starCount = 0;
        this.earthRot = 0.85;
        this.cloudsRot = 0.9;
        this.moonRot = 0.3;
        this.moonOrbit = 0;
        this.time = 0;

        this.skyFbo = null;
        this.hdrFormat = null;

        // HDR-пайплайн сцены: буфер сцены + каскад bloom
        this.sceneFbo = null;
        this.sceneDepth = null;
        this.sceneSize = { w: 0, h: 0 };
        this.bloomLevels = [];
        this.bloomCount = 5;

        // Оптика «камеры»: экспозиция, блик, плёночные эффекты
        this.optics = {
            exposure: 1.0,
            bloomStrength: 0.55,
            vignette: 0.30,
            grain: 0.010,
            chroma: 0.0015,
            sunRadiance: 46.0,
            sunNdc: [0, 0],
            sunHalf: [0, 0],
            sunVisible: 0
        };

        this._mat = new Float32Array(16);
        this._mat3 = new Float32Array(9);
    }

    static isSupported() {
        try {
            const c = document.createElement('canvas');
            return !!c.getContext('webgl2');
        } catch (e) {
            return false;
        }
    }

    /** Instance-обёртка (результат кэшируется — не пересоздаём контексты) */
    isSupported() {
        if (this._supported === undefined) {
            this._supported = Space3DGLRenderer.isSupported();
        }
        return this._supported;
    }

    /* ---------------------------------------------------------------------
     * Инициализация
     * ------------------------------------------------------------------- */
    init(engine) {
        if (this.ok) return true;
        this.engine = engine;

        // Слой GPU-космоса монтируется под 2D-канвой интерактивных эффектов
        let canvas = document.getElementById('space-3d-gl');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'space-3d-gl';
            canvas.className = 'space-3d-gl-canvas';
            const target = document.getElementById('space-3d-canvas');
            const parent = target ? target.parentNode : document.getElementById('space-3d-viewport');
            if (parent && target) parent.insertBefore(canvas, target);
            else if (parent) parent.appendChild(canvas);
            else return false;
        }
        this.canvas = canvas;

        const gl = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: true,
            stencil: false,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });
        if (!gl) {
            console.warn('[Space3D-GL] WebGL2 недоступен — космос рендерится на CPU.');
            return false;
        }
        this.gl = gl;

        const mobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') ||
            (('ontouchstart' in window) && Math.min(window.innerWidth, window.innerHeight) < 820);
        this.quality = mobile ? 'medium' : 'high';
        this.skyBakeSize = mobile ? { w: 1024, h: 512 } : { w: 2048, h: 1024 };

        if (!this._buildPrograms()) return false;
        this._buildSkyFramebuffer();
        this._buildGeometry();
        this._loadTextures();

        this.ok = true;
        console.log(`[Space3D-GL] GPU-ядро космоса активно (quality=${this.quality}, skydome=${this.skyBakeSize.w}×${this.skyBakeSize.h})`);
        return true;
    }

    _compile(type, src, label) {
        const gl = this.gl;
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.warn(`[Space3D-GL] Ошибка компиляции «${label}»: ${gl.getShaderInfoLog(sh)}`);
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }

    _program(vsSrc, fsSrc, label) {
        const gl = this.gl;
        const vs = this._compile(gl.VERTEX_SHADER, vsSrc, label + '.vert');
        const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc, label + '.frag');
        if (!vs || !fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn(`[Space3D-GL] Ошибка линковки «${label}»: ${gl.getProgramInfoLog(prog)}`);
            return null;
        }
        const uniforms = {};
        const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
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
            ['bake', FULLSCREEN_VS, BAKE_FS],
            ['sky', FULLSCREEN_VS, SKY_FS],
            ['star', STAR_VS, STAR_FS],
            ['sphere', SPHERE_VS, SPHERE_FS],
            ['atmo', SPHERE_VS, ATMO_FS],
            ['sun', SUN_VS, SUN_FS],
            ['bright', FULLSCREEN_VS, BRIGHT_FS],
            ['bloom', FULLSCREEN_VS, BLOOM_FS],
            ['post', FULLSCREEN_VS, POST_FS]
        ];
        for (const [name, vs, fs] of defs) {
            const p = this._program(vs, fs, name);
            if (!p) return false;
            this.programs[name] = p;
        }

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        this.vaos.fullscreen = vao;

        return true;
    }

    /* ---------------------------------------------------------------------
     * HDR-таргет для запекания скайдома
     * ------------------------------------------------------------------- */
    _buildSkyFramebuffer() {
        const gl = this.gl;
        this.skyBakeSize = this.skyBakeSize || { w: 2048, h: 1024 };

        const isFloat = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('OES_texture_float_linear'));
        this.hdrFormat = isFloat ? gl.RGBA16F : gl.RGBA8;

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D, 0,
            isFloat ? gl.RGBA16F : gl.RGBA8,
            this.skyBakeSize.w, this.skyBakeSize.h, 0,
            gl.RGBA,
            isFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
            null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (!complete && isFloat) {
            // Откат на LDR-запекание
            this.hdrFormat = gl.RGBA8;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.skyBakeSize.w, this.skyBakeSize.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.skyFbo = { fbo, tex };
        this.bakeSlices = 6;
        this.bakeDoneSlices = 0;
        this.bakeReady = false;
    }

    /* ---------------------------------------------------------------------
     * HDR-таргеты кадра: буфер сцены (rgba16f) + пирамида bloom
     * ------------------------------------------------------------------- */
    _makeTarget(w, h, withDepth) {
        const gl = this.gl;
        const isFloat = this.hdrFormat === gl.RGBA16F;
        const internal = isFloat ? gl.RGBA16F : gl.RGBA8;
        const type = isFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        let depth = null;
        if (withDepth) {
            depth = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            const fmt = this.quality === 'high' ? gl.DEPTH_COMPONENT24 : gl.DEPTH_COMPONENT16;
            gl.renderbufferStorage(gl.RENDERBUFFER, fmt, w, h);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex, texel: [1 / w, 1 / h], size: { w, h }, depth };
    }

    _releaseHdrTargets() {
        const gl = this.gl;
        if (!gl) return;
        const kill = (t) => {
            if (!t) return;
            if (t.tex) gl.deleteTexture(t.tex);
            if (t.fbo) gl.deleteFramebuffer(t.fbo);
            if (t.depth) gl.deleteRenderbuffer(t.depth);
        };
        kill(this.sceneFbo);
        this.bloomLevels.forEach(kill);
        this.sceneFbo = null;
        this.bloomLevels = [];
    }

    /** Построение (или пересборка при смене размера) HDR-таргетов кадра. */
    _ensureHdrTargets(w, h) {
        if (this.sceneFbo && this.sceneSize.w === w && this.sceneSize.h === h) return true;
        const gl = this.gl;
        this._releaseHdrTargets();
        if (!gl) return false;

        this.sceneSize = { w, h };
        this.sceneFbo = this._makeTarget(w, h, true);
        if (!this.sceneFbo) return false;

        // Пирамида bloom: базовый уровень — половина кадра, далее деление на 2.
        // Для мобильного профиля каскад короче (экономия fill-rate).
        const levels = this.quality === 'high' ? 5 : 4;
        this.bloomCount = levels;
        let bw = Math.max(8, Math.floor(w / 2));
        let bh = Math.max(8, Math.floor(h / 2));
        for (let i = 0; i < levels; i++) {
            this.bloomLevels.push(this._makeTarget(bw, bh, false));
            bw = Math.max(8, Math.floor(bw / 2));
            bh = Math.max(8, Math.floor(bh / 2));
        }
        return true;
    }

    /**
     * Запекание скайдома срезами (не блокирует главный поток)
     */
    _bakeSkyStep() {
        if (!this.gl || this.bakeReady) return;
        const gl = this.gl;
        const u = this.programs.bake.uniforms;

        const sliceH = Math.ceil(this.skyBakeSize.h / this.bakeSlices);
        const y0 = this.bakeDoneSlices * sliceH;
        const h = Math.min(sliceH, this.skyBakeSize.h - y0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.skyFbo.fbo);
        gl.viewport(0, y0, this.skyBakeSize.w, h);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this.programs.bake.prog);

        // Срез эквиректангулярной карты через масштаб/сдвиг полноэкранного квада
        gl.uniform1f(u.uTime, this.time);
        gl.uniform3fv(u.uNebDir, this._nebDirs);
        gl.uniform4fv(u.uNebParam, this._nebParams);
        gl.uniform3fv(u.uNebColor, this._nebColors);

        // Рисуем весь квад, но с обрезкой (scissor) под вертикальный срез
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, y0, this.skyBakeSize.w, h);
        gl.bindVertexArray(this.vaos.fullscreen);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
        gl.disable(gl.SCISSOR_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.bakeDoneSlices++;
        if (this.bakeDoneSlices >= this.bakeSlices) {
            this.bakeReady = true;
            // Mip-фильтр для мягкости на дальних участках неба
            gl.bindTexture(gl.TEXTURE_2D, this.skyFbo.tex);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.bindTexture(gl.TEXTURE_2D, null);
            console.log('[Space3D-GL] Скайдом запечён.');
        }
    }

    _scheduleBake() {
        if (this.bakeReady || this._bakeScheduled) return;
        this._bakeScheduled = true;
        const step = () => {
            if (!this.ok) return;
            try { this._bakeSkyStep(); } catch (e) { console.warn('[Space3D-GL] Запекание неба:', e); this.bakeReady = true; }
            if (!this.bakeReady) {
                if (typeof requestIdleCallback === 'function') requestIdleCallback(step, { timeout: 120 });
                else setTimeout(step, 16);
            } else {
                this._bakeScheduled = false;
            }
        };
        if (typeof requestIdleCallback === 'function') requestIdleCallback(step, { timeout: 400 });
        else setTimeout(step, 60);
    }

    /* ---------------------------------------------------------------------
     * Геометрия: спрайты звёзд + сфера планеты
     * ------------------------------------------------------------------- */
    _hexToRgb(hex) {
        const c = (hex || '#ffffff').replace('#', '');
        const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
        const n = parseInt(full, 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    _buildGeometry() {
        const gl = this.gl;
        const engine = this.engine;

        /* --- Звёзды: единый физический каталог движка (Starfield) ---
         * В атрибут потока (aParam.x) идёт HDR-радианс, поэтому яркие звёзды
         * реально пересвечиваются и «протекают» через bloom, как на настоящих
         * астрофотографиях, а не просто рисуются белыми точками. */
        const stars = [];
        const push = (x, y, z, flux, size, color, phase) => {
            stars.push(x, y, z, color[0], color[1], color[2], flux, size, phase);
        };
        const colorOf = (s) => (Array.isArray(s.colorLin) ? s.colorLin : this._hexToRgb(s.color || '#ffffff'));

        if (engine && Array.isArray(engine.stars)) {
            engine.stars.forEach(s => {
                const flux = s.flux !== undefined ? s.flux : (s.alpha || 0.5);
                const size = (s.hasSpike ? 3.6 : 1.9) * (0.72 + Math.min(2.4, s.size || 1) * 0.22);
                push(s.x, s.y, s.z, flux, size, colorOf(s), s.twinklePhase || Math.random() * 6.28);
            });
        }
        if (engine && Array.isArray(engine.milkyWayStars)) {
            engine.milkyWayStars.forEach(s => {
                const flux = s.flux !== undefined ? s.flux : (s.alpha || 0.2) * 0.35;
                push(s.x, s.y, s.z, flux, 0.95 + Math.min(1.6, s.size || 1) * 0.75, colorOf(s), s.twinklePhase || Math.random() * 6.28);
            });
        }

        if (!engine || !engine.stars || !engine.stars.length) {
            this._pushFallbackStarfield(push);
        }

        this.starVertexCount = stars.length / 9;
        const starData = new Float32Array(stars);

        const starVao = gl.createVertexArray();
        gl.bindVertexArray(starVao);
        const starBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);
        const stride = 9 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * 4);
        gl.bindVertexArray(null);
        this.vaos.stars = starVao;

        /* --- Сфера (UV-сетка) --- */
        const seg = this.quality === 'high' ? 120 : 72;
        const rings = this.quality === 'high' ? 60 : 36;
        const verts = [];
        const idx = [];
        for (let y = 0; y <= rings; y++) {
            const v = y / rings;
            const phi = v * Math.PI;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            for (let x = 0; x <= seg; x++) {
                const u = x / seg;
                const theta = u * Math.PI * 2;
                const nx = sinPhi * Math.sin(theta);
                const ny = cosPhi;
                const nz = sinPhi * Math.cos(theta);
                verts.push(nx, ny, nz, nx, ny, nz, u, v);
            }
        }
        for (let y = 0; y < rings; y++) {
            for (let x = 0; x < seg; x++) {
                const a = y * (seg + 1) + x;
                const b = a + 1;
                const c = a + (seg + 1);
                const d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
        }

        const sphereVao = gl.createVertexArray();
        gl.bindVertexArray(sphereVao);
        const vBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8 * 4, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        const iBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        this.vaos.sphere = sphereVao;
        this.sphereIndexCount = idx.length;
    }

    /** Резервный звёздный каталог (если движок не успел сгенерировать свой). */
    _pushFallbackStarfield(push) {
        const tints = [
            [0.62, 0.74, 1.0], [0.80, 0.88, 1.0], [0.94, 0.96, 1.0],
            [1.0, 0.96, 0.86], [1.0, 0.88, 0.66], [1.0, 0.72, 0.52], [1.0, 0.56, 0.46]
        ];
        const count = this.quality === 'high' ? 3400 : 1500;
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const cosPhi = Math.random() * 2 - 1;
            const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
            // Степенной закон светимости: слабых звёзд на порядки больше
            const flux = 0.28 * Math.min(Math.pow(1 - Math.random(), -0.667), 26);
            const tint = tints[Math.floor(Math.random() * tints.length)];
            push(
                sinPhi * Math.cos(theta), cosPhi, sinPhi * Math.sin(theta),
                flux,
                0.95 + Math.pow(Math.min(flux, 10) / 10, 0.4) * 2.2 * (0.7 + Math.random() * 0.6),
                tint,
                Math.random() * 6.28
            );
        }
    }

    /* ---------------------------------------------------------------------
     * Текстуры планет
     * ------------------------------------------------------------------- */
    _loadTextures() {
        const gl = this.gl;
        const sources = {
            earthDay: 'assets/textures/earth_day.jpg?v=4.0.0',
            earthNight: 'assets/textures/earth_night.png?v=4.0.0',
            earthClouds: 'assets/textures/earth_clouds.png?v=4.0.0',
            moon: 'assets/textures/moon.jpg?v=4.0.0'
        };

        const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
        const maxAniso = aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

        Object.keys(sources).forEach(key => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // 1×1 заглушка, пока грузится настоящая текстура
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 60, 110, 255]));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            this.textures[key] = tex;

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (!this.ok) return;
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                if (aniso && maxAniso) {
                    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
                }
            };
            img.onerror = () => console.warn(`[Space3D-GL] Не удалось загрузить текстуру ${sources[key]}`);
            img.src = sources[key];
        });
    }

    /* ---------------------------------------------------------------------
     * Размеры
     * ------------------------------------------------------------------- */
    resize(cssW, cssH, dpr = window.devicePixelRatio || 1) {
        if (!this.ok) return;
        this.dpr = Math.min(dpr, 1.35);
        const w = Math.max(320, Math.floor(cssW * this.dpr * this.renderScale));
        const h = Math.max(240, Math.floor(cssH * this.dpr * this.renderScale));
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this._releaseHdrTargets();   // размер кадра изменился — пересобрать HDR
        }
        this.width = w;
        this.height = h;
    }

    /* ---------------------------------------------------------------------
     * Матрицы камеры (конвенция 2D-движка: y вверх, z вперёд)
     * ------------------------------------------------------------------- */
    _updateMatrices(yawDeg, pitchDeg, fov) {
        const yaw = (yawDeg * Math.PI) / 180;
        const pitch = (pitchDeg * Math.PI) / 180;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cp = Math.cos(pitch), sp = Math.sin(pitch);

        // R = RotX(pitch) · RotY(yaw) — та же кинематика, что у 2D-проекции движка:
        //   x1 = x·cosY − z·sinY ; y2 = y·cosP − z1·sinP ; z2 = y·sinP + z1·cosP
        const r00 = cy, r01 = 0, r02 = -sy;
        const r10 = -sp * sy, r11 = cp, r12 = -sp * cy;
        const r20 = cp * sy, r21 = sp, r22 = cp * cy;

        const w = this.width, h = this.height;
        const m00 = fov / (w * 0.5);
        const m11 = fov / (h * 0.5);
        const near = 1.0, far = 40000;
        const m22 = (far + near) / (far - near);
        const m23 = (-2 * far * near) / (far - near);

        // ViewProj (column-major): клип = (m00·x_cam, m11·y_cam, m22·z_cam + m23, z_cam)
        const m = this._mat;
        m[0] = m00 * r00; m[1] = m11 * r10; m[2] = m22 * r20; m[3] = r20;
        m[4] = m00 * r01; m[5] = m11 * r11; m[6] = m22 * r21; m[7] = r21;
        m[8] = m00 * r02; m[9] = m11 * r12; m[10] = m22 * r22; m[11] = r22;
        m[12] = 0; m[13] = 0; m[14] = m23; m[15] = 0;

        // Инверсная матрица поворота (для скайдома): Rᵀ
        const inv = this._mat3;
        inv[0] = r00; inv[1] = r01; inv[2] = r02;
        inv[3] = r10; inv[4] = r11; inv[5] = r12;
        inv[6] = r20; inv[7] = r21; inv[8] = r22;

        return { m, inv };
    }

    /* ---------------------------------------------------------------------
     * Главный кадр
     * ------------------------------------------------------------------- */
    /**
     * Приостановка рендера без потери ресурсов — пока 3D-пространство скрыто.
     * Экономит GPU/батарею (AAA-практика: suspend вместо destroy при скрытии сцены).
     */
    suspend() {
        this.suspended = true;
    }

    resume() {
        this.suspended = false;
        this.time = this.time || 0;
    }

    render(camYaw, camPitch, camZoom, dt) {
        if (!this.ok || !this.gl || this.suspended) return;
        const gl = this.gl;
        this.time += dt || 0.016;

        // Кинематика планет (скорость вращения уменьшена в 0.5 раза)
        this.earthRot += 0.000252 * (dt * 60);
        this.cloudsRot += 0.00038 * (dt * 60);
        this.moonOrbit += 0.000035 * (dt * 60);
        this.moonRot += 0.000035 * (dt * 60);

        if (!this.bakeReady) this._scheduleBake();

        const fov = 750 * camZoom;
        const { m, inv } = this._updateMatrices(camYaw, camPitch, fov);

        // Сцена рисуется в линейный HDR-буфер: тонмаппинг и оптика — в конце
        if (!this._ensureHdrTargets(this.width, this.height)) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo.fbo);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0.0016, 0.0032, 0.0092, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._sunNdcNow = this._sunScreenNdc(m, fov);

        /* === 1. СКАЙДОМ === */
        if (this.bakeReady && this.skyFbo) {
            const u = this.programs.sky.uniforms;
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.useProgram(this.programs.sky.prog);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.skyFbo.tex);
            gl.uniform1i(u.uSkyTex, 0);
            gl.uniformMatrix3fv(u.uViewInv, false, inv);
            gl.uniform2f(u.uResolution, this.width, this.height);
            gl.uniform1f(u.uFov, fov);
            gl.uniform1f(u.uExposure, 1.0);
            gl.uniform1f(u.uNebulaBoost, 1.0);
            if (u.uTime !== undefined) gl.uniform1f(u.uTime, this.time || 0);
            gl.bindVertexArray(this.vaos.fullscreen);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindVertexArray(null);
        }

        /* === 2. ЗВЁЗДЫ === */
        {
            const u = this.programs.star.uniforms;
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.disable(gl.DEPTH_TEST);
            gl.useProgram(this.programs.star.prog);
            gl.uniformMatrix4fv(u.uViewProj, false, m);
            gl.uniform1f(u.uPixelScale, this.dpr * this.renderScale * Math.max(0.7, camZoom));
            gl.uniform1f(u.uTime, this.time);
            gl.uniform1f(u.uTwinkle, 0.035);   // в вакууме звёзды не мерцают
            gl.bindVertexArray(this.vaos.stars);
            gl.drawArrays(gl.POINTS, 0, this.starVertexCount);
            gl.bindVertexArray(null);
        }

        /* === 3. ПЛАНЕТЫ === */
        const sunDir = this._sunDir();
        if (!this._earthCenter) {
            this._earthCenter = new Float32Array(3);
            this._moonCenter = new Float32Array(3);
        }
        // Земля отдалена на 0.5x (dist: 1470 px, pitch: -44°), радиус 700
        const earthCenter = this._dirFromYawPitch(0, -44, 1470, this._earthCenter);
        // Луна расположена в левом верхнем секторе неба (yaw: -28°, pitch: +24°), dist: 1470 px
        const moonYaw = -28 + Math.sin(this.moonOrbit) * 1.5;
        const moonPitch = 24 + Math.cos(this.moonOrbit) * 1.0;
        const moonCenter = this._dirFromYawPitch(moonYaw, moonPitch, 1470, this._moonCenter);

        // 3.1 Земля (отдалена на 0.5x: dist 1470, радиус 700)
        this._drawSphere({
            center: earthCenter,
            radius: 700,
            bodyType: 0,
            texture: this.textures.earthDay,
            night: this.textures.earthNight,
            clouds: this.textures.earthClouds,
            cloudShift: -this.cloudsRot,
            groundShift: -this.earthRot,
            texel: [1 / 2048, 1 / 1024],
            cloudOpacity: 0.90,
            bump: 0.55,
            specular: 1.5,
            ambient: 0.06,
            exposure: 0.92,   // компенсация тональной кривой ACES (см. POST_FS)
            ambientColor: [0.05, 0.09, 0.16],
            atmosphere: 0.85,
            sunDir,
            mat: m,
            fov,
            urot: this.earthRot
        });

        // 3.2 Атмосферная оболочка Земли (аналитическое рассеяние, 14 шагов)
        this._drawSphere({
            center: earthCenter,
            radius: 700 * 1.025,
            planetRadius: 700,
            atmosphereOnly: true,
            strength: 0.88,   // компенсация тональной кривой ACES
            falloff: 3.6,
            sunDir,
            mat: m,
            texture: this.textures.earthClouds
        });

        // 3.3 Луна (уменьшена в 2 раза: радиус 145 px, медленное реалистичное вращение)
        this._drawSphere({
            center: moonCenter,
            radius: 145,
            bodyType: 1,
            texture: this.textures.moon,
            night: this.textures.moon,
            clouds: this.textures.moon,
            cloudShift: 0,
            cloudOpacity: 0,
            bump: 0.38,
            specular: 0.05,
            ambient: 0.16,
            ambientColor: [0.06, 0.09, 0.15], // мягкий земной свет (Earthshine)
            atmosphere: 0,
            sunDir,
            mat: m,
            earthDir: earthCenter,
            groundShift: -this.moonRot,
            texel: [1 / 2048, 1 / 1024],
            urot: this.moonRot
        });

        // 3.4 Солнце: физический диск + корона в HDR.
        //     Глубинный тест оставляет Земле право закрыть Солнце — это
        //     настоящая окклюзия, без ручных коэффициентов.
        this._renderSunDisc();

        // 3.5 Bloom: свет от Солнца и ярких звёзд «протекает» по кадру
        this._renderBloom();

        // 3.6 Финал: HDR + bloom → ACES → оптика объектива → сигнал
        this._renderPost();

        if (!this.isReadyLogged) {
            this.isReadyLogged = true;
        }
    }

    _sunDir() {
        if (!this._sun) {
            const v = [0.72, 0.28, 0.63];
            const len = Math.hypot(v[0], v[1], v[2]) || 1;
            this._sun = new Float32Array([v[0] / len, v[1] / len, v[2] / len]);
        }
        return this._sun;
    }

    _dirFromYawPitch(yawDeg, pitchDeg, dist, out) {
        const yaw = (yawDeg * Math.PI) / 180;
        const pitch = (pitchDeg * Math.PI) / 180;
        const v = out || new Float32Array(3);
        v[0] = dist * Math.cos(pitch) * Math.sin(yaw);
        v[1] = dist * Math.sin(pitch);
        v[2] = dist * Math.cos(pitch) * Math.cos(yaw);
        return v;
    }

    _drawSphere(opts) {
        const gl = this.gl;
        const prog = opts.atmosphereOnly ? this.programs.atmo : this.programs.sphere;
        const u = prog.uniforms;
        gl.useProgram(prog.prog);
        gl.uniformMatrix4fv(u.uViewProj, false, opts.mat);

        if (opts.atmosphereOnly) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.enable(gl.DEPTH_TEST);
            gl.depthMask(false);
            gl.uniform3fv(u.uCenter, opts.center);
            gl.uniform1f(u.uRadius, opts.radius);
            gl.uniform1f(u.uPlanetRadius, opts.planetRadius || opts.radius * 0.97);
            gl.uniform3fv(u.uSunDir, opts.sunDir);
            gl.uniform1f(u.uStrength, opts.strength);
            gl.uniform1f(u.uFalloff, opts.falloff);
            gl.bindVertexArray(this.vaos.sphere);
            gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_INT, 0);
            gl.bindVertexArray(null);
            gl.depthMask(true);
            return;
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        // Отсечение выключено: базис проекции левосторонний, порядок обхода
        // треугольников не гарантирован — глубинный тест решает всё корректно.
        gl.disable(gl.CULL_FACE);

        gl.uniform3fv(u.uCenter, opts.center);
        gl.uniform1f(u.uRadius, opts.radius);
        gl.uniform3fv(u.uSunDir, opts.sunDir);
        gl.uniform3fv(u.uEarthDir, opts.earthDir || this._dirFromYawPitch(0, -44, 1470));
        gl.uniform1f(u.uBodyType, opts.bodyType || 0);
        gl.uniform2f(u.uTexel, opts.texel ? opts.texel[0] : 1 / 2048, opts.texel ? opts.texel[1] : 1 / 1024);
        if (u.uGroundShift) gl.uniform1f(u.uGroundShift, opts.groundShift || 0);
        gl.uniform1f(u.uCloudShift, opts.cloudShift || 0);
        gl.uniform1f(u.uCloudOpacity, opts.cloudOpacity || 0);
        gl.uniform1f(u.uBumpScale, opts.bump || 0);
        gl.uniform1f(u.uSpecular, opts.specular || 0);
        gl.uniform1f(u.uAmbient, opts.ambient || 0);
        gl.uniform1f(u.uAtmosphere, opts.atmosphere || 0);
        gl.uniform1f(u.uExposure, opts.exposure || 1.0);
        if (u.uAmbientColor) gl.uniform3fv(u.uAmbientColor, opts.ambientColor || [0.0, 0.0, 0.0]);

        const texUnits = [
            ['uDay', opts.texture || this.textures.earthDay, 0],
            ['uNight', opts.night || opts.texture, 1],
            ['uClouds', opts.clouds || opts.texture, 2]
        ];
        texUnits.forEach(([name, tex, unit]) => {
            if (!u[name]) return;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(u[name], unit);
        });

        gl.bindVertexArray(this.vaos.sphere);
        gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
    }

    /* ---------------------------------------------------------------------
     * СОЛНЦЕ: экранный билборд с физическим угловым размером
     * ------------------------------------------------------------------- */
    /** Направление Солнца в мировых координатах (совпадает с 2D-движком). */
    sunDirection() {
        return [0.72, 0.28, 0.63];
    }

    /**
     * Экранные координаты Солнца: NDC-центр и половина размера квада в NDC.
     * Диск Солнца = 0.2665°; квад рисуется с запасом под корону.
     */
    _sunScreenNdc(m, fov) {
        const d = this.sunDirection();
        const len = Math.hypot(d[0], d[1], d[2]) || 1;
        const dx = d[0] / len, dy = d[1] / len, dz = d[2] / len;

        // Компоненты клип-пространства: w = z_cam (см. _updateMatrices)
        const xc = m[0] * dx + m[4] * dy + m[8] * dz;
        const yc = m[1] * dx + m[5] * dy + m[9] * dz;
        const zc = m[3] * dx + m[7] * dy + m[11] * dz;

        if (zc <= 0.06) {
            this.optics.sunVisible = 0;
            return this.optics;
        }
        const ndcX = xc / zc;
        const ndcY = yc / zc;

        // Угловой радиус → половина квада (корона ~5 радиусов диска)
        const half = Math.tan(0.2665 * Math.PI / 180) * (fov / (this.height * 0.5)) * 5.2;
        const halfX = half * (this.height / this.width);

        this.optics.sunNdc = [ndcX, ndcY];
        this.optics.sunHalf = [halfX, half];
        this.optics.sunVisible = (Math.abs(ndcX) < 1.6 && Math.abs(ndcY) < 1.6) ? 1 : 0;
        return this.optics;
    }

    _renderSunDisc() {
        const gl = this.gl;
        const opt = this.optics;
        if (!opt.sunVisible) return;

        const p = this.programs.sun;
        if (!p) return;
        const u = p.uniforms;

        gl.useProgram(p.prog);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);        // HDR-сумма: диск складывается со сценой
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(false);                 // диск не пишет глубину

        gl.uniform2f(u.uSunNdc, opt.sunNdc[0], opt.sunNdc[1]);
        gl.uniform2f(u.uSunHalf, opt.sunHalf[0], opt.sunHalf[1]);
        const halfRatio = Math.max(0.02, Math.tan(0.2665 * Math.PI / 180) / (Math.tan(0.2665 * Math.PI / 180) * 5.2));
        gl.uniform1f(u.uDisc, halfRatio);
        gl.uniform1f(u.uRadiance, opt.sunRadiance);
        gl.uniform3f(u.uTint, 1.0, 0.975, 0.94);

        gl.bindVertexArray(this.vaos.fullscreen);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    /* ---------------------------------------------------------------------
     * BLOOM: bright-pass + двухфильтровая пирамида (down/up)
     * ------------------------------------------------------------------- */
    _renderBloom() {
        const gl = this.gl;
        const levels = this.bloomLevels;
        if (!levels.length) return;

        const src = this.sceneFbo;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        /* 1. Bright-pass: ¼ разрешения кадра */
        {
            const dst = levels[0];
            const p = this.programs.bright;
            const u = p.uniforms;
            gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
            gl.viewport(0, 0, dst.size.w, dst.size.h);
            gl.useProgram(p.prog);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, src.tex);
            gl.uniform1i(u.uSrc, 0);
            gl.uniform2f(u.uTexel, src.texel[0], src.texel[1]);
            // Порог в HDR: 1.0 для float-буфера, мягче — для LDR-отката
            const isFloat = this.hdrFormat === gl.RGBA16F;
            gl.uniform1f(u.uThreshold, isFloat ? 0.85 : 0.60);
            gl.uniform1f(u.uKnee, 0.55);
            gl.bindVertexArray(this.vaos.fullscreen);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindVertexArray(null);
        }

        /* 2. Понижение разрешения (box 2×2) */
        const bloomP = this.programs.bloom;
        for (let i = 1; i < levels.length; i++) {
            const dst = levels[i];
            const up = levels[i - 1];
            gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
            gl.viewport(0, 0, dst.size.w, dst.size.h);
            gl.useProgram(bloomP.prog);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, up.tex);
            gl.uniform1i(bloomP.uniforms.uSrc, 0);
            gl.uniform2f(bloomP.uniforms.uTexel, up.texel[0], up.texel[1]);
            gl.uniform1f(bloomP.uniforms.uMode, 0);
            gl.uniform1f(bloomP.uniforms.uWeight, 1.0);
            gl.bindVertexArray(this.vaos.fullscreen);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindVertexArray(null);
        }

        /* 3. Повышение разрешения с шатром 3×3 (аддитивно) */
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (let i = levels.length - 1; i > 0; i--) {
            const srcL = levels[i];
            const dstL = levels[i - 1];
            gl.bindFramebuffer(gl.FRAMEBUFFER, dstL.fbo);
            gl.viewport(0, 0, dstL.size.w, dstL.size.h);
            gl.useProgram(bloomP.prog);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, srcL.tex);
            gl.uniform1i(bloomP.uniforms.uSrc, 0);
            gl.uniform2f(bloomP.uniforms.uTexel, srcL.texel[0], srcL.texel[1]);
            gl.uniform1f(bloomP.uniforms.uMode, 1);
            gl.uniform1f(bloomP.uniforms.uWeight, i === levels.length - 1 ? 0.85 : 0.72);
            gl.bindVertexArray(this.vaos.fullscreen);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindVertexArray(null);
        }
        gl.disable(gl.BLEND);
    }

    /* ---------------------------------------------------------------------
     * ФИНАЛЬНЫЙ ПРОХОД: HDR + bloom → ACES → плёночная оптика
     * ------------------------------------------------------------------- */
    _renderPost() {
        const gl = this.gl;
        const p = this.programs.post;
        if (!p) return;
        const u = p.uniforms;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(p.prog);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFbo.tex);
        gl.uniform1i(u.uScene, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomLevels.length ? this.bloomLevels[0].tex : this.sceneFbo.tex);
        gl.uniform1i(u.uBloom, 1);
        gl.activeTexture(gl.TEXTURE0);

        const isFloat = this.hdrFormat === gl.RGBA16F;
        gl.uniform1f(u.uExposure, this.optics.exposure);
        gl.uniform1f(u.uBloomStrength, this.optics.bloomStrength * (isFloat ? 1.0 : 0.55));
        gl.uniform1f(u.uVignette, this.optics.vignette);
        gl.uniform1f(u.uGrain, this.optics.grain);
        gl.uniform1f(u.uChroma, this.quality === 'high' ? this.optics.chroma : 0);
        gl.uniform1f(u.uTime, this.time);
        gl.uniform2f(u.uResolution, this.width, this.height);

        gl.bindVertexArray(this.vaos.fullscreen);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
    }

    /**
     * Управление оптикой кадра (автоэкспозиция «глаза», сила блика).
     * Вызывается движком, который знает, смотрит ли пользователь на Солнце.
     */
    setOptics(o) {
        if (!o) return;
        if (o.exposure !== undefined) this.optics.exposure = o.exposure;
        if (o.bloomStrength !== undefined) this.optics.bloomStrength = o.bloomStrength;
        if (o.sunRadiance !== undefined) this.optics.sunRadiance = o.sunRadiance;
        if (o.grain !== undefined) this.optics.grain = o.grain;
    }

    /* ---------------------------------------------------------------------
     * Данные туманностей для запекания (заполняются движком)
     * ------------------------------------------------------------------- */
    setNebulae(nebulae) {
        const dirs = new Float32Array(18);
        const params = new Float32Array(24);
        const colors = new Float32Array(18);

        for (let i = 0; i < 6; i++) {
            const n = nebulae[i];
            if (n) {
                const yaw = (n.yaw * Math.PI) / 180;
                const pitch = (n.pitch * Math.PI) / 180;
                const dx = Math.cos(pitch) * Math.sin(yaw);
                const dy = Math.sin(pitch);
                const dz = Math.cos(pitch) * Math.cos(yaw);
                dirs[i * 3] = dx; dirs[i * 3 + 1] = dy; dirs[i * 3 + 2] = dz;
                // Радиус в градусах → косинус угла
                const radiusDeg = n.radiusDeg || 34;
                params[i * 4] = Math.cos((radiusDeg * Math.PI) / 180);
                params[i * 4 + 1] = n.intensity || 0.22;
                const c = n.color || [0.35, 0.6, 1.0];
                colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
            } else {
                dirs[i * 3] = 0; dirs[i * 3 + 1] = 0; dirs[i * 3 + 2] = 1;
                params[i * 4] = 0.99; params[i * 4 + 1] = 0;
            }
        }

        this._nebDirs = dirs;
        this._nebParams = params;
        this._nebColors = colors;
    }

    dispose() {
        const gl = this.gl;
        if (!gl) return;
        this.suspended = true;
        Object.values(this.programs).forEach(p => gl.deleteProgram(p.prog));
        this.programs = {};
        if (this.skyFbo) {
            gl.deleteTexture(this.skyFbo.tex);
            gl.deleteFramebuffer(this.skyFbo.fbo);
            this.skyFbo = null;
        }
        this._releaseHdrTargets();
        Object.values(this.textures).forEach(t => gl.deleteTexture(t));
        this.textures = {};
        this.ok = false;
    }
}

export const Space3DGL = new Space3DGLRenderer();
export default Space3DGL;
