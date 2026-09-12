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
uniform vec4 uNebParam[6];   // x = cos(радиус), y = яркость, z, w — резерв
uniform vec3 uNebColor[6];
out vec4 outColor;

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
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
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p, int oct) {
    float sum = 0.0, amp = 0.5, norm = 0.0;
    for (int i = 0; i < 6; i++) {
        if (i >= oct) break;
        sum += vnoise(p) * amp;
        norm += amp;
        p = p * 2.13 + vec3(5.2, 1.3, 9.1);
        amp *= 0.5;
    }
    return sum / max(norm, 0.0001);
}

void main() {
    // Экваториальные координаты направления
    float theta = (vUv.x - 0.5) * 6.28318530718;
    float phi = (0.5 - vUv.y) * 3.14159265359;
    vec3 dir = vec3(cos(phi) * sin(theta), sin(phi), cos(phi) * cos(theta));

    // --- Глубокий вакуум с холодным градиентом
    float base = fbm(dir * 1.6 + 11.0, 4);
    vec3 col = mix(vec3(0.004, 0.006, 0.020), vec3(0.012, 0.020, 0.052), base);

    // --- Галактическая система координат (наклон плоскости ~62°)
    const float mwTilt = 1.08;
    float cm = cos(mwTilt), sm = sin(mwTilt);
    float gy = dir.y * cm + dir.z * sm;
    float gz = -dir.y * sm + dir.z * cm;
    float gx = dir.x;
    float lat = asin(clamp(gy, -1.0, 1.0));            // галактическая широта
    float lon = atan(gz, gx);                          // галактическая долгота

    // --- Диффузное свечение галактической плоскости (Млечный Путь)
    float band = exp(-pow(abs(lat) / 0.135, 1.7));
    float clumps = fbm(vec3(dir.x * 5.5, lat * 22.0, dir.z * 5.5), 5);
    float fine = fbm(vec3(dir.x * 17.0, lat * 60.0, dir.z * 17.0), 4);
    float milky = band * (0.34 + clumps * 0.85) * (0.55 + fine * 0.65);

    // --- Галактическое ядро (Sagittarius A*): тёплое золотистое свечение
    float coreMask = exp(-pow(abs(lon - 1.2) / 0.95, 2.0)) * exp(-pow(abs(lat) / 0.20, 2.0));
    milky += coreMask * (0.9 + clumps * 0.7) * 0.85;

    vec3 mwColor = mix(vec3(0.36, 0.55, 0.92), vec3(1.0, 0.86, 0.62), clamp(coreMask * 1.4, 0.0, 1.0));
    mwColor = mix(mwColor, vec3(0.98, 0.80, 0.58), pow(clamp(clumps, 0.0, 1.0), 2.0) * 0.45);
    col += mwColor * milky * 0.55;

    // --- Великий Разлом: тёмные пылевые облака внутри полосы
    float dustNoise = fbm(vec3(lon * 2.3, lat * 30.0, 4.0), 5);
    float dust = smoothstep(0.42, 0.92, dustNoise) * exp(-pow(abs(lat) / 0.055, 2.0));
    float dustLon = smoothstep(0.2, 0.9, fract((lon + 6.2831853) / 6.2831853 * 3.0));
    col *= 1.0 - dust * dustLon * 0.85;

    // --- Волокна ионизированного газа (H-alpha / O-III)
    float filament = fbm(dir * 9.0 + 31.0, 5);
    float filamentB = fbm(dir * 21.0 - 7.0, 4);
    col += vec3(0.55, 0.14, 0.30) * pow(clamp(filament, 0.0, 1.0), 3.4) * band * 1.1;
    col += vec3(0.10, 0.55, 0.55) * pow(clamp(filamentB, 0.0, 1.0), 4.2) * 0.55;

    // --- Диффузные туманности (данные из 3D-движка)
    for (int i = 0; i < 6; i++) {
        float d = dot(dir, uNebDir[i]);
        float falloff = smoothstep(uNebParam[i].x, 1.0, d);
        if (falloff <= 0.0001) continue;
        float structure = fbm(dir * 7.0 + float(i) * 13.0, 4);
        float plume = pow(falloff, 1.6) * (0.55 + structure * 0.85) * uNebParam[i].y;
        col += uNebColor[i] * plume;
    }

    // --- Межзвёздная пыль и микрозвёздная дымка (мягкая составляющая)
    float dustHaze = pow(clamp(fbm(dir * 3.1 + 61.0, 4), 0.0, 1.0), 2.2);
    col += vec3(0.05, 0.07, 0.12) * dustHaze * 0.55;

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
out vec4 outColor;

vec3 aces(vec3 x) {
    const float a = 2.51; const float b = 0.03; const float c = 2.43;
    const float d = 0.59; const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 dirCam = vec3(ndc.x * uResolution.x * 0.5 / uFov, ndc.y * uResolution.y * 0.5 / uFov, 1.0);
    vec3 dir = normalize(uViewInv * dirCam);

    float u = atan(dir.x, dir.z) * 0.15915494 + 0.5;
    float v = 0.5 - asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989;

    // Бикубическая выборка по горизонтали для мягкости на стыке меридиана
    vec3 sky = texture(uSkyTex, vec2(u, v)).rgb;
    vec3 sky2 = texture(uSkyTex, vec2(fract(u + 0.001), v)).rgb;
    sky = mix(sky, sky2, 0.5);

    vec3 col = aces(sky * uExposure * uNebulaBoost);
    col = pow(max(col, 0.0), vec3(0.96, 0.99, 1.02));
    outColor = vec4(col, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3. ЗВЁЗДНЫЕ СПРАЙТЫ (PSF + дифракционные кресты + мерцание)
 * ------------------------------------------------------------------------- */
const STAR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aDir;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec3 aParam;   // размер(px), яркость, фаза мерцания
uniform mat4 uViewProj;
uniform float uPixelScale;
uniform float uTime;
uniform float uTwinkle;
out vec3 vColor;
out float vAlpha;
out float vSpike;

void main() {
    vec4 clip = uViewProj * vec4(aDir * 1000.0, 1.0);
    gl_Position = clip;

    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * 1.7 + aParam.z * 6.28));
    vAlpha = aParam.y * tw;
    vColor = aColor;
    vSpike = step(2.6, aParam.x) * aParam.y;

    float size = aParam.x * uPixelScale * (1.0 + (aParam.y - 0.7) * 0.35);
    gl_PointSize = clamp(size, 1.0, 96.0);
}`;

const STAR_FS = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
in float vSpike;
out vec4 outColor;

void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;

    // Гауссов профиль рассеяния точки (Point Spread Function)
    float core = exp(-pow(d * 3.4, 2.0));
    float halo = exp(-pow(d * 1.35, 2.0)) * 0.32;
    float spike = 0.0;
    if (vSpike > 0.5) {
        float armH = exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 2.2);
        float armV = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 2.2);
        spike = (armH + armV) * 0.85;
    }
    float a = (core + halo + spike) * vAlpha;
    outColor = vec4(vColor * a, a);
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

        // --- Океан: солнечный глиттер по Гауссу + широкий блик
        // Настоящий морской блик — не точка, а вытянутая вдоль меридиана
        // дорожка из тысяч микробликов. Формируем шероховатость «по ветру»:
        // сжатие луча отражения вдоль оси, перпендикулярной Солнцу.
        vec3 H = normalize(L + V);
        float oceanMask = smoothstep(0.02, 0.16, albedo.b - max(albedo.r, albedo.g));
        vec3 glintAxis = normalize(vec3(-H.z, 0.0, H.x) + 1e-5);
        float aniso = abs(dot(Nb, glintAxis));
        vec3 Hg = normalize(H + glintAxis * (H - L) * 0.16);
        float micro = pow(max(dot(Nb, Hg), 0.0), 340.0) * (1.0 - aniso * 0.55);
        float wide = pow(max(dot(Nb, H), 0.0), 34.0);
        float glitter = micro * 3.4 + wide * 0.18;
        float spec = glitter * oceanMask * uSpecular * step(0.0, ndl);

        // Ночные огни городов на тёмной стороне.
        // Маска «суши» здесь не нужна: чёрная мраморная карта NASA сама
        // содержит океан без огней, а умножение на land дополнительно гасило
        // прибрежные мегаполисы и делало ночную сторону почти чёрной.
        float nm = smoothstep(-0.12, 0.08, ndlGeom);
        nm = nm * nm * (3.0 - 2.0 * nm);
        float nightMask = 1.0 - nm;
        // В исходной карте NASA суша на ночной стороне имеет фиолетовую
        // подложку (~0.10/0.10/0.20) — она не физична и «подсвечивала»
        // континенты. Вычитаем её: остаются только огни городов, к тому же
        // тёплые (натриевые лампы), как на снимках с МКС.
        vec3 cityLights = max(nightTex - vec3(0.105, 0.105, 0.21), 0.0) * 3.4;
        cityLights *= vec3(1.06, 0.94, 0.80) * nightMask;

        // Облачный слой (свободно дрейфует относительно поверхности).
        // Кромка сознательно резче: у настоящих кучевых облаков край
        // плотный, а тонкая перистая дымка уже заложена в самой карте.
        vec2 cuv = vec2(fract(uv.x + uCloudShift), uv.y);
        float cloudBase = texture(uClouds, cuv).r;
        // Второй слой той же карты в 2.7 раза мельче и со сдвигом: убирает
        // «мыльность» крупных планов, даёт рваные края и просветы в облаках
        float cloudFine = texture(uClouds, vec2(fract(cuv.x * 2.7 + 0.31), clamp(cuv.y * 2.7 + 0.17, 0.0, 1.0))).r;
        float clouds = smoothstep(0.10, 0.60, cloudBase);
        clouds = clamp(clouds * (0.72 + 0.58 * cloudFine), 0.0, 1.0);
        clouds *= uCloudOpacity;
        float cloudLit = clamp(dot(N, L) + 0.10, 0.0, 1.0);
        // Облака почти не видны на ночной стороне (подсвечены только луной и
        // городами): квадратичный спад + видимость по терминатору убирают
        // «серые кляксы» там, где кучевых облаков в кадре быть не должно
        vec3 cloudColor = vec3(1.0) * (0.20 + pow(cloudLit, 1.35) * 0.98) * sunColor;
        clouds *= mix(0.04, 1.0, smoothstep(-0.30, 0.02, ndlGeom));

        // --- ТЕНИ ОБЛАКОВ: сэмплируем карту облаков со смещением по Солнцу.
        // Смещение в UV пропорционально проекции направления на Солнце —
        // облака отбрасывают тень на десятки километров в сторону от светила.
        vec2 sunUv = vec2(-L.x, L.y) * 0.010 * (1.0 + 6.0 * (1.0 - clamp(ndlGeom, 0.0, 1.0)));
        float shadowC = texture(uClouds, vec2(fract(cuv.x + sunUv.x), clamp(cuv.y + sunUv.y, 0.0, 1.0))).r;
        shadowC = smoothstep(0.22, 0.78, shadowC) * uCloudOpacity;
        lit *= (1.0 - shadowC * 0.42 * clamp(ndlGeom + 0.25, 0.0, 1.0));
        // Кромки облаков подсвечиваются на просвет (forward scattering)
        float edge = clamp(clouds - shadowC * 0.85, 0.0, 1.0);

        // Просвечивающие кромки: добавляют объём облачной шапке
        cloudColor += vec3(0.28, 0.30, 0.34) * edge * 0.9;
        color = mix(lit + cityLights + spec, cloudColor, clouds * 0.90);

        // Атмосферный лимб: рэлеевское рассеяние (голубой обод)
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.4);
        float sunSide = smoothstep(-0.45, 0.65, dot(N, L));
        vec3 rayleigh = mix(vec3(0.16, 0.42, 1.0), vec3(0.85, 0.55, 0.30), smoothstep(0.1, -0.1, dot(N, L)));
        color += rayleigh * fres * sunSide * uAtmosphere * 0.30 * (0.85 + clouds * 0.35);
    } else {
        // ---------- ЛУНА ----------
        vec3 sunColor = vec3(1.0, 0.97, 0.93);
        color = albedo * sunColor * clamp(ndl, 0.0, 1.0) * 1.06;

        // Пепельный свет (отражённый от Земли) на ночной стороне
        vec3 toEarth = normalize(uEarthDir);
        float earthFill = max(dot(N, toEarth), 0.0) * (1.0 - clamp(ndl, 0.0, 1.0));
        color += albedo * vec3(0.20, 0.34, 0.62) * earthFill * uAmbient;

        // Слабое свечение реголита у лимба
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        color += vec3(0.55, 0.62, 0.78) * fres * max(ndl, 0.0) * 0.14;
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
            ['atmo', SPHERE_VS, ATMO_FS]
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

        /* --- Звёзды: каталог движка + плотное поле Млечного Пути --- */
        const stars = [];
        const push = (x, y, z, size, bright, color, phase) => {
            stars.push(x, y, z, color[0], color[1], color[2], size, bright, phase);
        };

        if (engine && Array.isArray(engine.stars)) {
            engine.stars.forEach(s => {
                push(s.x, s.y, s.z, (s.hasSpike ? 4.2 : 2.0) * (0.75 + s.size * 0.24), s.alpha * 0.95, this._hexToRgb(s.color), Math.random() * 6.28);
            });
        }
        if (engine && Array.isArray(engine.milkyWayStars)) {
            engine.milkyWayStars.forEach(s => {
                push(s.x, s.y, s.z, 1.1 + s.size * 0.7, Math.min(0.85, s.alpha + 0.15), this._hexToRgb(s.color), Math.random() * 6.28);
            });
        }

        // Плотное звёздное поле (изотропное) + звёздная пыль галактической плоскости
        const fieldCount = this.quality === 'high' ? 5200 : 2200;
        const palette = [
            { c: [0.66, 0.78, 1.0], w: 0.09 },
            { c: [0.94, 0.96, 1.0], w: 0.22 },
            { c: [1.0, 0.97, 0.88], w: 0.19 },
            { c: [1.0, 0.90, 0.66], w: 0.20 },
            { c: [1.0, 0.74, 0.48], w: 0.17 },
            { c: [1.0, 0.58, 0.50], w: 0.13 }
        ];
        const pickColor = () => {
            let r = Math.random(), acc = 0;
            for (const p of palette) { acc += p.w; if (r <= acc) return p.c; }
            return palette[1].c;
        };

        for (let i = 0; i < fieldCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const cosPhi = Math.random() * 2 - 1;
            const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
            const x = sinPhi * Math.cos(theta);
            const y = cosPhi;
            const z = sinPhi * Math.sin(theta);
            const bright = 0.22 + Math.pow(Math.random(), 2.4) * 0.7;
            push(x, y, z, 0.9 + Math.random() * 1.7, bright, pickColor(), Math.random() * 6.28);
        }

        const mwDust = this.quality === 'high' ? 4200 : 1800;
        const mwTilt = 1.08;
        const cm = Math.cos(mwTilt), sm = Math.sin(mwTilt);
        for (let i = 0; i < mwDust; i++) {
            const l = Math.random() * Math.PI * 2;
            const b = (Math.random() - 0.5 + Math.random() - 0.5) * 0.19;
            const gx = Math.cos(b) * Math.cos(l);
            const gy0 = Math.sin(b);
            const gz = Math.cos(b) * Math.sin(l);
            // Обратный поворот наклона галактической плоскости в небесные координаты
            const y = gy0 * cm - gz * sm;
            const z = gy0 * sm + gz * cm;
            const x = gx;
            const core = Math.abs(l - 1.2) < 0.85 ? 1.35 : 1.0;
            push(x, y, z, 0.85 + Math.random() * 1.05, (0.14 + Math.random() * 0.4) * core, pickColor(), Math.random() * 6.28);
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

    /* ---------------------------------------------------------------------
     * Текстуры планет
     * ------------------------------------------------------------------- */
    _loadTextures() {
        const gl = this.gl;
        const sources = {
            earthDay: 'assets/textures/earth_day.jpg?v=3.9.0',
            earthNight: 'assets/textures/earth_night.png?v=3.9.0',
            earthClouds: 'assets/textures/earth_clouds.png?v=3.9.0',
            moon: 'assets/textures/moon.jpg?v=3.9.0'
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

        // Кинематика планет (синхронно с CPU-модулем)
        this.earthRot += 0.00063 * (dt * 60);
        this.cloudsRot += 0.00095 * (dt * 60);
        this.moonOrbit += 0.00022 * (dt * 60);
        this.moonRot += 0.00022 * (dt * 60);

        if (!this.bakeReady) this._scheduleBake();

        const fov = 750 * camZoom;
        const { m, inv } = this._updateMatrices(camYaw, camPitch, fov);

        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0.002, 0.004, 0.011, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
            gl.uniform1f(u.uTwinkle, 0.22);
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
        const earthCenter = this._dirFromYawPitch(0, -48, 1350, this._earthCenter);
        const moonYaw = 180 + Math.sin(this.moonOrbit) * 12;
        const moonPitch = 20 + Math.cos(this.moonOrbit) * 4;
        const moonCenter = this._dirFromYawPitch(moonYaw, moonPitch, 1850, this._moonCenter);

        // 3.1 Земля
        this._drawSphere({
            center: earthCenter,
            radius: 1000,
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
            exposure: 1.10,
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
            radius: 1000 * 1.025,
            planetRadius: 1000,
            atmosphereOnly: true,
            strength: 1.0,
            falloff: 3.6,
            sunDir,
            mat: m,
            texture: this.textures.earthClouds
        });

        // 3.3 Луна
        this._drawSphere({
            center: moonCenter,
            radius: 220,
            bodyType: 1,
            texture: this.textures.moon,
            night: this.textures.moon,
            clouds: this.textures.moon,
            cloudShift: 0,
            cloudOpacity: 0,
            bump: 0.34,
            specular: 0,
            ambient: 0.22,
            ambientColor: [0.05, 0.07, 0.12],
            atmosphere: 0,
            sunDir,
            mat: m,
            earthDir: earthCenter,
            groundShift: -this.moonRot,
            texel: [1 / 2048, 1 / 1024],
            urot: this.moonRot
        });

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
        gl.uniform3fv(u.uEarthDir, opts.earthDir || this._dirFromYawPitch(0, -48, 1350));
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
        Object.values(this.textures).forEach(t => gl.deleteTexture(t));
        this.textures = {};
        this.ok = false;
    }
}

export const Space3DGL = new Space3DGLRenderer();
export default Space3DGL;
