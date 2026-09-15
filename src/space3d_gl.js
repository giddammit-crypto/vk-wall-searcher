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

/* --- Процедурный шум: value noise 3D + FBM (для структуры Млечного Пути,
 *     пылевых разломов и волокон туманностей). Выполняется один раз при
 *     запекании, поэтому стоимость не важна — важна детализация. --- */
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
    return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
               mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p = p * 2.13 + vec3(7.1, 3.7, 11.9);
        a *= 0.5;
    }
    return s;
}

/* Галактическая система координат: полюс и ядро Млечного Пути.
 * Ориентирована так, чтобы полоса Галактики красиво пересекала весь кадр
 * под диагональю при старте сцены (yaw 0, pitch -44° на Землю). */
const vec3 GAL_POLE = vec3(0.3714, 0.7428, -0.5571);
const vec3 GAL_CORE = vec3(0.7428, 0.3090, 0.5916);
const vec3 GAL_EAST = vec3(0.5571, -0.5916, 0.5834);

void main() {
    // Направление взгляда в эквиректангулярных сферических координатах
    float theta = (vUv.x - 0.5) * 6.28318530718;
    float phi = (0.5 - vUv.y) * 3.14159265359;
    vec3 dir = vec3(cos(phi) * sin(theta), sin(phi), cos(phi) * cos(theta));

    // Глубокий бархатный космический вакуум (линейные значения: после
    // lin2srgb-кодирования в POST_FS дают дисплейные ~0.006)
    vec3 col = vec3(0.00002, 0.00004, 0.00016);

    /* === МЛЕЧНЫЙ ПУТЬ ===
     * Полоса Галактики: экспоненциальный спад от плоскости, широкая у ядра.
     * Структура: FBM-волокна звёздной плотности + Великий Разлом (тёмная
     * пылевая линия вдоль центра полосы) + золотистое балдж-ядро. */
    float b = dot(dir, GAL_POLE);                 // 0 в плоскости Галактики
    float c = dot(dir, GAL_CORE);                 // 1 в направлении ядра
    float e = dot(dir, GAL_EAST);

    float bandWidth = 0.16 + 0.10 * max(c, 0.0);  // расширяется к ядру
    float band = exp(-b * b / (bandWidth * bandWidth));

    // Волокна звёздной плотности вдоль полосы
    vec3 fq = dir * 5.2 + vec3(2.7, -1.3, 4.1);
    float filaments = fbm(fq);
    filaments = 0.35 + 1.30 * pow(max(filaments - 0.22, 0.0), 1.4);

    // Великий Разлом: тёмная пыль, извивающаяся по центру полосы
    float lanePhase = fbm(dir * 3.1 + 13.7) - 0.5;
    float laneDist = abs(b - lanePhase * 0.055);
    float rift = smoothstep(0.030, 0.001, laneDist) * smoothstep(0.55, 0.85, filaments);

    // Балдж (центральное утолщение) — тёплое золотистое свечение
    float bulge = pow(max(c, 0.0), 22.0) * exp(-abs(b) * 5.5);

    vec3 armCold = vec3(0.26, 0.40, 0.85);        // холодные звёздные рукава
    vec3 armWarm = vec3(0.98, 0.80, 0.55);        // тёплое ядро и старые звёзды
    float coreMix = smoothstep(0.15, 0.85, c);
    vec3 mwColor = mix(armCold, armWarm, coreMix * 0.85);

    // Рукава подняты ~1.6x + лёгкая сепарация: холодная голубая кайма вне ядра
    vec3 milkyWay = mwColor * band * filaments * (0.0036 + 0.0146 * coreMix);
    milkyWay += armCold * band * filaments * 0.0022 * (1.0 - coreMix);
    milkyWay *= 1.0 - 0.82 * rift;                // пыль гасит свет за собой
    milkyWay += vec3(1.0, 0.86, 0.62) * bulge * 0.032;
    col += milkyWay;

    // Межзвёздная пыль дальнего космоса — тончайшая изотропная дымка
    float s1 = sin(dir.x * 2.5 + dir.y * 1.8) * cos(dir.z * 2.5 + dir.x * 1.2);
    float s2 = cos(dir.y * 4.6 - dir.z * 2.2) * sin(dir.x * 3.8 + dir.z * 1.7);
    float dust = max(0.0, s1 * 0.5 + s2 * 0.35 + 0.15);
    col += vec3(0.00002, 0.00003, 0.00007) * (dust * dust);

    /* === ДИФФУЗНЫЕ ТУМАННОСТИ ===
     * До 6 точечных туманностей из каталога движка: угловое ядро + волокна
     * FBM + внешнее гало. HDR-яркость подобрана под bloom-каскад. */
    for (int i = 0; i < 6; i++) {
        float inten = uNebParam[i].y;
        if (inten <= 0.001) continue;
        float cosR = uNebParam[i].x;
        float ang = dot(dir, uNebDir[i]);
        float core = smoothstep(cosR, cosR + (1.0 - cosR) * 0.55, ang);
        float halo = pow(clamp((ang - cosR) / max(1.0 - cosR, 0.001), 0.0, 1.0), 2.6);
        float wisp = 0.45 + 1.15 * fbm(dir * 7.5 + float(i) * 17.31);
        vec3 neb = uNebColor[i] * (core * 0.85 + halo * 0.35) * wisp * inten * 0.07;
        // Внутри полосы Галактики туманность слегка подсвечивается
        neb *= 1.0 + band * 0.35;
        col += neb;
    }

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

    // «Дыхание» Галактики: очень слабая медленная модуляция яркости bake-ски
    // (±3%, период ~20 c). Взвешено по яркости — чёрный вакуум не «дышит».
    float skyLum = dot(sky, vec3(0.2126, 0.7152, 0.0722));
    sky *= 1.0 + 0.03 * sin(uTime * 0.31415926) * smoothstep(0.0005, 0.006, skyLum);

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
    // остаётся лишь микродрожание оптики прибора — очень субтильное и медленное.
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * 0.35 + aParam.z));
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

    // PSF прибора: ядро Эйри + узкий ореол. Ореол/дымка уменьшены ~35%
    // (звёзды остаются точечными), ядро острое, без изменений.
    float core = exp(-d * d * 5.4);
    float halo = 0.10 * pow(max(0.0, 1.0 - d), 2.8);
    float haze = 0.028 * pow(max(0.0, 1.0 - d), 1.35);

    float spike = 0.0;
    float heroGlow = 0.0;
    if (vSpike > 0.5) {
        // Шестилучевая диафрагма: горизонталь/вертикаль сильнее диагоналей
        vec2 q = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
        float armH = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 2.4);
        float armV = exp(-abs(p.x) * 34.0) * exp(-abs(p.y) * 2.4);
        float armD = (exp(-abs(q.y) * 44.0) * exp(-abs(q.x) * 3.0)) * 0.45;
        spike = (armH + armV * 0.7 + armD) * 0.75;
        // Мягкий широкомасштабный ореол «героических» звёзд (bloom его подхватывает)
        heroGlow = 0.16 * exp(-d * 2.6);
    }

    float prof = core + halo + haze + spike + heroGlow;
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
uniform float uTime;
out vec4 outColor;
void main() {
    float d = length(vQ);
    if (d > 1.0) discard;

    // Диск: потемнение к краю I(μ) = 1 − u(1 − μ), u = 0.62
    float t = min(1.0, d / max(uDisc, 0.0001));
    float mu = sqrt(max(0.0, 1.0 - t * t));
    float limb = 1.0 - 0.62 * (1.0 - mu);
    // Мягкая живая кромка: лёгкая грануляция лимба по времени
    limb *= 1.0 + 0.015 * sin(atan(vQ.y, vQ.x) * 9.0 + uTime * 0.6);
    float disc = smoothstep(uDisc * 1.03, uDisc * 0.955, d) * limb;

    // Хромосфера/корона: свечение порядка 1e-3 от диска, но широкое,
    // с медленной пульсацией (дыхание короны)
    float pulse = 1.0 + 0.10 * sin(uTime * 1.9) + 0.05 * sin(uTime * 4.3 + 1.7);
    float corona = pow(max(0.0, 1.0 - d), 3.4) * 0.020 * pulse;

    vec3 col = uTint * (disc + corona) * uRadiance;

    // Тонкий дифракционный крест (оптика телескопа), мягкий и короткий
    float dCross = (exp(-abs(vQ.y) * 60.0) * exp(-d * 2.6)
                 + exp(-abs(vQ.x) * 60.0) * exp(-d * 2.6)) * 0.012;
    col += uTint * dCross * uRadiance * 0.12;

    outColor = vec4(col, 1.0);
}`;

/* ---------------------------------------------------------------------------
 * 3b'. МЕТЕОРЫ: один аддитивный квад — голова движется по локальной оси X,
 *      хвост тянется позади с экспоненциальным затуханием. Дешевле не бывает:
 *      один draw call раз в 6-10 секунд, без новых FBO.
 * ------------------------------------------------------------------------- */
const METEOR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform vec2 uMeteorCenter;   // центр траектории в NDC
uniform vec2 uMeteorHalf;     // половина квада в NDC (квадратный — изотропный поворот)
out vec2 vQ;
void main() {
    vQ = aPos;
    gl_Position = vec4(uMeteorCenter + aPos * uMeteorHalf, 0.9999, 1.0);
}`;

const METEOR_FS = `#version 300 es
precision highp float;
in vec2 vQ;
uniform float uProgress;      // 0…1 жизненный цикл (clamp на CPU и здесь)
uniform float uSeed;
out vec4 outColor;

void main() {
    // Защита от NaN/Inf и выхода за жизненный цикл: сравнение с NaN всегда
    // false, поэтому «мусорный» прогресс гарантированно отбраковывается
    if (!(uProgress >= 0.0 && uProgress <= 1.0)) discard;

    // Мягкая огибающая: появление и растворение
    float fade = smoothstep(0.0, 0.14, uProgress) * (1.0 - smoothstep(0.72, 1.0, uProgress));
    if (fade <= 0.001) discard;

    // Голова ходит в диапазоне [-0.8, 0.8]: свечение головы (радиус ~0.15)
    // никогда не выходит за границу квада — нет жёсткой обрезки по краю
    float head = uProgress * 1.6 - 0.8;
    float d = head - vQ.x;                 // > 0 — позади головы (хвост)
    if (d < 0.0 || d > 2.0) discard;

    // Хвост: экспоненциальное затухание, толщина жёстко ограничена
    float streak = exp(-d * 5.0);
    float width = min(0.012 + d * 0.014, 0.038);
    float core = exp(-vQ.y * vQ.y / (width * width));
    float glow = 0.22 * exp(-vQ.y * vQ.y * 260.0);

    // Лёгкое мерцание абляции
    float flicker = 0.85 + 0.20 * sin(uSeed + uProgress * 46.0) * sin(uSeed * 1.7 + uProgress * 23.0);

    // Цвет: голубовато-белая голова → тёплый охристый хвост (натрий метеора)
    vec3 col = mix(vec3(0.72, 0.86, 1.0), vec3(1.0, 0.82, 0.55), clamp(d * 0.55, 0.0, 1.0));
    col *= (streak * (core + glow)) * fade * flicker * 2.6;

    // Компактное яркое ядро-голова (узкое: целиком внутри квада)
    col += vec3(1.0, 0.97, 0.90) * exp(-length(vQ - vec2(head, 0.0)) * 30.0) * fade * 1.5;

    // Предохранитель HDR: даже с bloom метеор не может раздуться в «пламя»
    col = min(col, vec3(3.0));

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

// Filmic-тонмаппинг «де-Люкс»: ACES + filmic lift экранных средних
// + мягкое сжатие верхних стопов (нет пережжённых белых на Земле/Солнце),
// яркое ядро у звёзд сохраняется (кривая выходит на 1.0 насыщенно).
vec3 filmicTonemap(vec3 x) {
    x = max(x, vec3(0.0));
    // Мягкий ролловф светов ДО кривой: самые яркие стопы прижимаются,
    // детали диска Солнца и облачностей остаются читаемыми
    x = x / (1.0 + x * 0.055);
    // Filmic lift: следовый (0.003) — только чтобы чёрный не был мёртвым
    x += vec3(0.003);
    vec3 y = aces(x);
    // Аккуратное пик-яркое ядро: значения у самой белой точки чуть
    // насыщаются к 1.0 (звёзды не «серят»), без клиппинга цвета
    float peak = max(max(y.r, y.g), y.b);
    y = mix(y, y / max(peak, 1e-4) * (0.85 + 0.15 * peak), smoothstep(0.75, 1.0, peak) * 0.35);
    return clamp(y, vec3(0.0), vec3(1.0));
}

// Линейное → sRGB (дисплейное) кодирование: замыкает color-managed
// пайплайн — альбедо-текстуры декодированы аппаратно (SRGB8_ALPHA8),
// освещение и bloom считаются в линейном HDR, сюда приходит линейный сигнал.
vec3 lin2srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
               step(vec3(0.0031308), c));
}

void main() {
    // Геометрически честная проекция: без рыбьего глаза (fisheye/barrel удалён
    // по запросу — при отдалении камеры он искажал пропорции Земли у краёв кадра).
    vec2 dv = vUv - 0.5;
    // Нормализованное радиальное расстояние от оптического центра
    vec2 pNorm = dv * 2.0;
    float r2 = dot(pNorm, pNorm);

    // UV без линзового искажения
    vec2 visorUv = vUv;
    vec2 sampleUv = clamp(visorUv, vec2(0.001), vec2(0.999));

    // Хроматическая дисперсия стекла шлема (усиливается к краям поля зрения)
    vec2 off = dv * (uChroma * (0.35 + r2 * 1.5));
    vec3 col;
    col.r = texture(uScene, clamp(visorUv + off, vec2(0.001), vec2(0.999))).r;
    col.g = texture(uScene, sampleUv).g;
    col.b = texture(uScene, clamp(visorUv - off, vec2(0.001), vec2(0.999))).b;

    vec3 bloomTex = texture(uBloom, sampleUv).rgb;
    col += bloomTex * uBloomStrength;
    // Halation: только вокруг реально ярких областей — яркостная маска
    // не даёт широкому bloom-размытию поднимать весь фон космоса
    float halLum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float halMask = smoothstep(0.6, 1.4, halLum);
    col += bloomTex * vec3(1.00, 0.34, 0.12) * (uBloomStrength * 0.04) * halMask;
    col *= uExposure;
    col = filmicTonemap(col);

    // Тонкая плёночная кривая: холодные тени, нейтральные света
    col = pow(col, vec3(0.985, 0.997, 1.012));

    // --- Split-toning 2.0: глубокий насыщенный teal в тенях (~#0e3a4a),
    // тёплый янтарный ролловф в светах; низкая полупрозрачность — элегантно
    float gradeLum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float shadowW = 1.0 - smoothstep(0.00, 0.38, gradeLum);
    float highW   = smoothstep(0.48, 0.95, gradeLum);
    // Тени: чисто сине-бирюзовый тинт, без жёлтой/красной примеси
    vec3 tealShadow = col * vec3(0.86, 1.04, 1.15) + vec3(0.001, 0.005, 0.008);
    col = mix(col, tealShadow, shadowW * 0.26);
    // Света: янтарный highlight-roll (тёплые 3/4-тона, белые остаются белыми)
    vec3 amberHigh = col * vec3(1.045, 1.000, 0.925);
    col = mix(col, amberHigh, highW * 0.18);

    // Орто-кривая контраста: toe + shoulder (S-кривая 22% — мягче прежнего)
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
    // Мягкое плечо против пересвета: ослаблено (0.12) — лимб и облака Земли
    // сохраняют контраст и насыщенность, не выцветают
    col = mix(col, col / (col + 0.12) * 1.098, smoothstep(0.72, 1.0, max(max(col.r, col.g), col.b)) * 0.25);

    // Lifted blacks: следовый холодный плинтус (~0.0025) — кос глубокий
    col = col * (1.0 - 0.0025) + vec3(0.0014, 0.0022, 0.0030);

    // Насыщенность +8% (после grade, относительно новой яркости)
    float satLum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(satLum), col, 1.08);

    // Золотистое антибликовое напыление визора скафандра (NASA EMU Gold Sun Visor)
    // Тонкий мягкий золотисто-янтарный отблеск по верхнему и боковому периметру стекла
    float rimGlint = smoothstep(0.35, 1.8, r2) * max(0.0, -dv.y * 0.7 + 0.3);
    vec3 goldSheen = vec3(0.96, 0.78, 0.38) * (rimGlint * 0.036);
    col += goldSheen;

    // Виньетка визора скафандра: эллиптическая, мягче по краям
    // (сжатие по вертикали — как у реального иллюминатора/визора)
    vec2 eNorm = pNorm * vec2(1.00, 0.88);
    float er2 = dot(eNorm, eNorm);
    float vig = 1.0 - uVignette * (er2 * 0.30 + er2 * er2 * 0.14);
    // Мягкий спад к уплотнителю визора на крайних углах
    float helmetSeal = 1.0 - smoothstep(1.4, 2.1, r2) * 0.22;
    col *= clamp(vig * helmetSeal, 0.0, 1.0);

    // Дисплейное кодирование (линейный HDR → sRGB), зерно — уже в кодированном
    // сигнале, как у реального сенсора
    col = lin2srgb(col);

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
    // Луна: усиленный контраст рельефа — кривая контраста на высотах +
    // увеличенная амплитуда бампа (кратеры читаются объёмом, а не пятном)
    float isMoon = step(0.5, uBodyType);
    float h0c = mix(h0, clamp((h0 - 0.45) * 1.85 + 0.45, 0.0, 1.0), isMoon);
    float hxc = mix(hx, clamp((hx - 0.45) * 1.85 + 0.45, 0.0, 1.0), isMoon);
    float hyc = mix(hy, clamp((hy - 0.45) * 1.85 + 0.45, 0.0, 1.0), isMoon);
    float bumpAmp = mix(26.0, 46.0, isMoon);
    // Амплитуда рельефа спадает к терминатору: иначе на скользящем свете
    // склоны «ловят» солнце и на лимбе возникает резкая яркая кайма.
    float graze = smoothstep(0.02, 0.38, dot(N, L));
    vec3 Nb = normalize(N + east * (h0c - hxc) * uBumpScale * bumpAmp * graze
                          + north * (h0c - hyc) * uBumpScale * bumpAmp * graze);

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
        // Узкий яркий glint: высокая экспонента + усиленный fresnel-подъём
        float micro = pow(max(dot(Nb, Hg), 0.0), 900.0) * (1.0 - aniso * 0.55);
        float wide = pow(max(dot(Nb, H), 0.0), 48.0);
        float glitter = (micro * 6.5 + wide * 0.18) * (1.0 + fresnelWater * 2.6);
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

        // --- ТЕНИ ОБЛАКОВ: сэмплируем карту облаков со смещением по Солнцу.
        //     Два масштаба и мягкий smoothstep — тень без жёстких границ.
        vec2 sunUv = vec2(-L.x, L.y) * 0.010 * (1.0 + 6.0 * (1.0 - clamp(ndlGeom, 0.0, 1.0)));
        float shadowA = texture(uClouds, vec2(fract(cuv.x + sunUv.x), clamp(cuv.y + sunUv.y, 0.0, 1.0))).r;
        float shadowB = texture(uClouds, vec2(fract(cuv.x * 1.9 + sunUv.x * 1.3 + 0.41), clamp(cuv.y * 1.9 + sunUv.y * 1.3 + 0.13, 0.0, 1.0))).r;
        float shadowC = mix(smoothstep(0.10, 0.90, shadowA), smoothstep(0.16, 0.84, shadowB), 0.45) * uCloudOpacity;
        lit *= (1.0 - shadowC * 0.30 * clamp(ndlGeom + 0.25, 0.0, 1.0));
        float edge = clamp(clouds - shadowC * 0.70, 0.0, 1.0);
        // Второй семпл мелкого масштаба — объём и лёгкая рябь на облаках
        float cloudVol = texture(uClouds, vec2(fract(cuv.x * 3.9 + 0.53), clamp(cuv.y * 3.9 + 0.29, 0.0, 1.0))).r;
        cloudColor *= mix(0.88, 1.07, cloudVol);
        cloudColor += vec3(0.28, 0.30, 0.34) * edge * 0.55;
        color = mix(lit + cityLights + spec, cloudColor, clouds * 0.90);

        // Огненный пояс заката / рассвета на терминаторе (twilight ember belt)
        // — тоньше и чище, без грязного оранжевого тумана у горизонта
        float twilightMask = exp(-pow(max(abs(ndlGeom - 0.035) / 0.070, 0.0), 2.0));
        vec3 twilightColor = vec3(1.0, 0.45, 0.14) * (twilightMask * 0.30 * (0.65 + clouds * 0.5));
        color += twilightColor;

        // Атмосферный лимб: чистый голубой рэлеевский обод с высотным
        // градиентом (fresnel) + тёплый оранжевый, насыщенный в полосе заката
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.4);
        float fresHi = pow(1.0 - max(dot(N, V), 0.0), 7.0);   // самый краешек — плотнее
        float sunSide = smoothstep(-0.45, 0.65, dot(N, L));
        float sunsetBand = exp(-pow(max(abs(dot(N, L) - 0.02) / 0.11, 0.0), 2.0));
        vec3 rayleigh = mix(vec3(0.16, 0.44, 1.05), vec3(1.05, 0.52, 0.26), sunsetBand * 0.72);
        color += rayleigh * fres * sunSide * uAtmosphere * 0.28 * (0.85 + clouds * 0.35);
        color += rayleigh * fresHi * sunSide * uAtmosphere * 0.30;
    } else {
        // ---------- ЛУНА ----------
        // Чуть более тёплый солнечный свет — уходим от плоско-серого
        vec3 sunColor = vec3(1.0, 0.945, 0.885);

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

        // Фоновый earthshine: очень слабый голубой пол (~0.03), чтобы ночная
        // сторона Луны никогда не была абсолютно мёртвой
        color += albedo * vec3(0.30, 0.46, 0.85) * 0.03 * (1.0 - smoothstep(-0.12, 0.16, ndlGeom));

        // Оппозиционный пик реголита у лимба
        float opp = pow(max(dot(-V, L), 0.0), 8.0) * 0.28;
        color += albedo * vec3(0.95, 0.96, 1.0) * opp * cosI;

        // Слабое свечение реголита у лимба
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        color += vec3(0.55, 0.62, 0.78) * fres * max(ndl, 0.0) * 0.12;

        // Холодный слабый fill с противоположной от Солнца стороны
        float oppFill = max(dot(N, -L), 0.0);
        color += albedo * vec3(0.30, 0.42, 0.62) * oppFill * 0.045;
    }

    // Общий ambient: теперь живёт на НОЧНОЙ стороне (earthshine),
    // холодный сине-голубой, с мягким переходом у терминатора
    float nightAmb = 1.0 - smoothstep(-0.14, 0.10, ndlGeom);
    color += albedo * uAmbientColor * uAmbient * nightAmb;

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
/** Направление на Солнце в мировых координатах (модульная константа —
 *  без аллокации массива в кадре; вызов sunDirection() удалён). */
const SUN_DIR = [0.72, 0.28, 0.63];

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
        this._srgbTextures = true;
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

        // Метеор: состояние (активен/нет, расписание — монотонные часы)
        this._meteor = null;
        this._meteorActive = false;
        this._meteorNextAt = undefined;

        // HDR-пайплайн сцены: буфер сцены + каскад bloom
        this.sceneFbo = null;
        this.sceneDepth = null;
        this.sceneSize = { w: 0, h: 0 };
        this.bloomLevels = [];
        this.bloomCount = 5;

        // Оптика «камеры»: экспозиция, блик, плёночные эффекты
        this.optics = {
            exposure: 1.18,        // глубокий чёрный: фон неба RGB ~8-16
            bloomStrength: 0.38,   // bloom аккуратный: звёзды точечные
            vignette: 0.28,        // мягкая эллиптическая виньетка, тёмные углы
            grain: 0.010,
            chroma: 0.0015,
            sunRadiance: 46.0,
            sunNdc: [0, 0],
            sunHalf: [0, 0],
            sunVisible: 0
        };

        this._mat = new Float32Array(16);
        this._mat3 = new Float32Array(9);
        // Переиспользуемая пара матриц (возврат из _updateMatrices БЕЗ аллокации
        // объекта в кадре — GC-паузы бьют по хичам кинематики)
        this._matPair = { m: this._mat, inv: this._mat3 };

        // Кинематографический «холд»: на время прилёта (фазы A/B/C) запрещены
        // _adaptiveResolution и bake-перестройки посреди кадра (источники хичей)
        this._cinematicHold = false;
        this._cinematicHoldUntil = 0;
        this._preWarmActive = false;
        this.bakeSlicesPerStep = 1;    // срезов bake за один idle-шаг

        // Кэш декодированных изображений планетарных текстур (URL → Promise<Image>):
        // 4K-декодирование выполняется РОВНО один раз за сессию — при первом
        // запросе (init или preloadTextures на старте варпа), не в кадрах сцены
        this._texImageCache = new Map();

        // Переиспользуемые uniform-данные (без аллокаций в горячем пути render)
        this._earthRefDir = new Float32Array(3);   // направление на Землю по умолчанию
        this._zero3 = new Float32Array(3);         // ambientColor по умолчанию
        this._texel4k = [1 / 4096, 1 / 2048];      // texel 4K-текстур (read-only)
        this._sphereOpts = {};                     // общие опции _drawSphere (1 объект на кадр)
        this._ambientEarth = [0.32, 0.52, 0.95];   // earthshine (read-only)
        this._ambientMoon = [0.14, 0.20, 0.34];    // холодный fill Луны (read-only)
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
        // Направление «по умолчанию» на Землю (uniform uEarthDir) — считается
        // один раз, в кадре только читается (без аллокации Float32Array)
        this._dirFromYawPitch(0, -44, 1470, this._earthRefDir);
        // Запекание неба стартует в idle СРАЗУ после инициализации (задолго до
        // первого open) — к кинематическому прилёту sky-текстура уже готова
        this._scheduleBake();
        window.Space3DGLDebug = this; // отладочный доступ к GPU-движку
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
            ['meteor', METEOR_VS, METEOR_FS],
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
        // Туманности могли не успеть заполниться (bake стартует сразу после
        // init) — рисуем без них, а не с невалидным uniform
        if (this._nebDirs) gl.uniform3fv(u.uNebDir, this._nebDirs);
        if (this._nebParams) gl.uniform4fv(u.uNebParam, this._nebParams);
        if (this._nebColors) gl.uniform3fv(u.uNebColor, this._nebColors);

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
            // Прогрев завершён — дотягиваем скрытый кадр со sky-программой
            // (до bake она не рисовалась, и первый настоящий кадр с ней стоил
            // бы компиляцию пайплайна посреди фазы A)
            if (this._preWarmActive) {
                this._preWarmActive = false;
                this.bakeSlicesPerStep = 1;
                this._warmRenderOnce();
            }
        }
    }

    _scheduleBake() {
        if (this.bakeReady || this._bakeScheduled) return;
        this._bakeScheduled = true;
        // preWarm ускоряет bake (2 среза за idle-шаг): во время варпа есть
        // запас GPU-времени, а bake обязан закончиться ДО прилёта
        const perStep = Math.max(1, this.bakeSlicesPerStep | 0);
        const step = () => {
            if (!this.ok) { this._bakeScheduled = false; return; }
            try {
                for (let i = 0; i < perStep && !this.bakeReady; i++) this._bakeSkyStep();
            } catch (e) { console.warn('[Space3D-GL] Запекание неба:', e); this.bakeReady = true; }
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

        /* 10-14 «героических» звёзд: самые яркие получают усиленный поток и
         * размер — в шейдере они получают крест дифракции (flux > 7) и мягкий
         * широкий ореол, который подхватывает bloom. */
        const nStars = stars.length / 9;
        if (nStars > 14) {
            const order = [];
            for (let i = 0; i < nStars; i++) order.push(i);
            order.sort((a, b) => stars[b * 9 + 6] - stars[a * 9 + 6]);
            const heroN = Math.min(12, nStars);
            for (let k = 0; k < heroN; k++) {
                const o = order[k] * 9;
                stars[o + 6] = Math.min(30, stars[o + 6] * 1.9);   // HDR-поток
                stars[o + 7] *= 1.55;                              // размер PSF
            }
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
        const count = this.quality === 'high' ? 6000 : 1800;
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const cosPhi = Math.random() * 2 - 1;
            const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
            // Степенной закон светимости: слабых звёзд на порядки больше
            const flux = 0.28 * Math.min(Math.pow(1 - Math.random(), -0.667), 26);
            let tint = tints[Math.floor(Math.random() * tints.length)];
            // Цветовой разброс: лёгкий дрейф оттенка между соседними классами
            const drift = (Math.random() - 0.5) * 0.5;
            const ti = Math.min(tints.length - 1, Math.max(0, Math.floor(Math.random() * tints.length + drift)));
            tint = [
                tint[0] * (1 - drift * 0.3) + tints[ti][0] * (drift * 0.3),
                tint[1] * (1 - drift * 0.2) + tints[ti][1] * (drift * 0.2),
                tint[2] * (1 - drift * 0.1) + tints[ti][2] * (drift * 0.1)
            ];
            const white = 0.10 + Math.random() * 0.18;   // подмес белого — разброс насыщенности
            tint = [tint[0] * (1 - white) + white, tint[1] * (1 - white) + white, tint[2] * (1 - white) + white];
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
    _textureSources() {
        return {
            earthDay: 'assets/textures/earth_day.jpg?v=4.18.5',
            earthNight: 'assets/textures/earth_night.png?v=4.18.5',
            earthClouds: 'assets/textures/earth_clouds.png?v=4.18.5',
            moon: 'assets/textures/moon.jpg?v=4.18.5'
        };
    }

    /**
     * Декодирование изображения с кэшем: 4K-текстура (4096×2048) декодируется
     * РОВНО один раз за сессию. Повторные вызовы (re-init, preloadTextures)
     * получают уже готовый Promise — повторного декодирования в кадре нет.
     */
    _getDecodedImage(url) {
        let p = this._texImageCache.get(url);
        if (!p) {
            p = new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.decoding = 'async';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(url));
                img.src = url;
                // Форсируем декодирование вне рендер-кадра (не ждём первого draw)
                if (img.decode) img.decode().catch(() => { /* resolve(img) достаточно */ });
            });
            this._texImageCache.set(url, p);
        }
        return p;
    }

    /**
     * Предзагрузка планетарных текстур на старте варпа: у прилёта есть 9-22с
     * запаса — все download+decode+upload успевают закончиться ДО фазы A,
     * а не посреди кинематики (texImage2D 4K + mipmap = 100-300мс стоп-кадр).
     */
    preloadTextures() {
        const sources = this._textureSources();
        Object.keys(sources).forEach(key => {
            this._getDecodedImage(sources[key]).catch(() => {
                console.warn(`[Space3D-GL] Предзагрузка текстуры не удалась: ${sources[key]}`);
            });
        });
    }

    _loadTextures() {
        const gl = this.gl;
        const sources = this._textureSources();

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

            // Загрузка через кэш декодирования: если preloadTextures() уже
            // скачал/декодировал картинку на старте варпа — Promise разрешён,
            // и загрузка в GL происходит немедленно (без сети и декодирования)
            this._getDecodedImage(sources[key]).then(img => {
                if (!this.ok) return;
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                // Корректный color management: sRGB-альбедо декодируется
                // аппаратно в линейное пространство, в котором живёт весь
                // HDR-пайплайн (освещение, bloom, ACES). Без этого линейная
                // математика смешивалась с гамма-кодированными данными.
                const srgb = this._srgbTextures !== false;
                gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                if (aniso && maxAniso) {
                    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
                }
            }).catch(() => console.warn(`[Space3D-GL] Не удалось загрузить текстуру ${sources[key]}`));
        });
    }

    /* ---------------------------------------------------------------------
     * Размеры
     * ------------------------------------------------------------------- */
    resize(cssW, cssH, dpr = window.devicePixelRatio || 1) {
        if (!this.ok) return;
        this._cssSize = { w: cssW, h: cssH, dpr };
        this.dpr = Math.min(dpr, this.quality === 'high' ? 1.75 : 1.35);
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
     * Адаптивное разрешение (dynamic resolution scaling):
     * держим кадр в бюджете ~16 мс — понижаем renderScale при нагрузке и
     * возвращаем резкость на мощных GPU. Пересборка таргетов — не чаще
     * раза в 2 секунды, чтобы не дёргать пайплайн.
     * ------------------------------------------------------------------- */
    _adaptiveResolution(dt) {
        // Кинематический прилёт: renderScale ЗАМОРОЖЕН. Первые кадры фазы A
        // всегда «тяжелее» (прогрев пайплайна, bake-хвост) — без холда DRS
        // успевал уронить scale и пересобрать ВСЕ HDR-таргеты посреди фазы A
        // (гарантированный хич + потеря резкости на всё прилёте).
        if (this._cinematicHold) return;
        const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
        if (this._cinematicHoldUntil && nowMs < this._cinematicHoldUntil) return;

        this._drsAcc = (this._drsAcc || 0) + 1;
        this._drsTime = (this._drsTime || 0) + dt;
        if (this._drsTime < 2.0) return;
        const avg = this._drsTime / this._drsAcc;      // средний кадр за окно
        this._drsAcc = 0;
        this._drsTime = 0;

        const minScale = 0.70, maxScale = this.quality === 'high' ? 1.0 : 0.85;
        let next = this.renderScale;
        if (avg > 0.021 && this.renderScale > minScale) next = Math.max(minScale, this.renderScale - 0.08);
        else if (avg < 0.013 && this.renderScale < maxScale) next = Math.min(maxScale, this.renderScale + 0.05);
        if (next !== this.renderScale && this._cssSize) {
            this.renderScale = next;
            this.resize(this._cssSize.w, this._cssSize.h, this._cssSize.dpr);
            this._ensureHdrTargets(this.width, this.height);
        }
    }

    /* ---------------------------------------------------------------------
     * Матрицы камеры (конвенция 2D-движка: y вверх, z вперёд)
     * ------------------------------------------------------------------- */
    _updateMatrices(yawDeg, pitchDeg, fov, rollDeg = 0) {
        const yaw = (yawDeg * Math.PI) / 180;
        const pitch = (pitchDeg * Math.PI) / 180;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cp = Math.cos(pitch), sp = Math.sin(pitch);

        // R = RotX(pitch) · RotY(yaw) — та же кинематика, что у 2D-проекции движка:
        //   x1 = x·cosY − z·sinY ; y2 = y·cosP − z1·sinP ; z2 = y·sinP + z1·cosP
        const r00 = cy, r01 = 0, r02 = -sy;
        const r10 = -sp * sy, r11 = cp, r12 = -sp * cy;
        const r20 = cp * sy, r21 = sp, r22 = cp * cy;

        // Кинематографический крен камеры (roll): синхронизация с stageEl
        let f00 = r00, f01 = r01, f02 = r02;
        let f10 = r10, f11 = r11, f12 = r12;
        let f20 = r20, f21 = r21, f22 = r22;
        if (Math.abs(rollDeg) > 0.001) {
            const roll = (rollDeg * Math.PI) / 180;
            const cr = Math.cos(roll), sr = Math.sin(roll);
            f00 = cr * r00 - sr * r10;
            f01 = cr * r01 - sr * r11;
            f02 = cr * r02 - sr * r12;
            f10 = sr * r00 + cr * r10;
            f11 = sr * r01 + cr * r11;
            f12 = sr * r02 + cr * r12;
        }

        const w = this.width, h = this.height;
        const m00 = fov / (w * 0.5);
        const m11 = fov / (h * 0.5);
        const near = 1.0, far = 40000;
        const m22 = (far + near) / (far - near);
        const m23 = (-2 * far * near) / (far - near);

        // ViewProj (column-major): клип = (m00·x_cam, m11·y_cam, m22·z_cam + m23, z_cam)
        const m = this._mat;
        m[0] = m00 * f00; m[1] = m11 * f10; m[2] = m22 * f20; m[3] = f20;
        m[4] = m00 * f01; m[5] = m11 * f11; m[6] = m22 * f21; m[7] = f21;
        m[8] = m00 * f02; m[9] = m11 * f12; m[10] = m22 * f22; m[11] = f22;
        m[12] = 0; m[13] = 0; m[14] = m23; m[15] = 0;

        // Инверсная матрица поворота (для скайдома): Rᵀ
        const inv = this._mat3;
        inv[0] = f00; inv[1] = f01; inv[2] = f02;
        inv[3] = f10; inv[4] = f11; inv[5] = f12;
        inv[6] = f20; inv[7] = f21; inv[8] = f22;

        // Возврат переиспользуемой пары { m, inv } — без аллокации объекта в кадре
        return this._matPair;
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

    /* ---------------------------------------------------------------------
     * Кинематический прилёт: холд тяжёлых перестроек + прогрев на варпе
     * ------------------------------------------------------------------- */
    /**
     * Фиксирует renderScale и запрещает DRS/bake-работу на время прилёта
     * (фазы A/B/C ~16.5с + запас). Вызывается из Space3D.open({fromWarp:true}).
     * Если bake не успел за варп — оставшиеся срезы дожимаются СИНХРОННО прямо
     * здесь: open() происходит под ещё непрозрачной шторкой варпа (fade ≈ 1.0
     * ещё ~0.6с после колбэка onArrival), поэтому burst невидим для зрителя.
     */
    beginCinematicHold(holdMs = 20000) {
        this._cinematicHold = true;
        this._cinematicHoldUntil =
            ((typeof performance !== 'undefined' && performance.now) ? performance.now() : 0) + holdMs;
        this._preWarmActive = false;
        if (!this.bakeReady && this.ok && this.gl) {
            this._bakeScheduled = true;
            let guard = 0;
            while (!this.bakeReady && guard++ < 32) {
                try { this._bakeSkyStep(); }
                catch (e) { console.warn('[Space3D-GL] Дожим bake перед прилётом:', e); this.bakeReady = true; }
            }
            this._bakeScheduled = false;
        }
    }

    /** Снятие холда (конец кинематики / close / повторный open без варпа). */
    endCinematicHold() {
        this._cinematicHold = false;
        this._cinematicHoldUntil = 0;
        // Сброс окна DRS: накопленное «плохое» среднее прилёта не должно
        // уронить scale в первом же пост-кинематическом кадре
        this._drsAcc = 0;
        this._drsTime = 0;
    }

    /**
     * Прогрев GPU-ядра на старте варпа (до прилёта 9-22с запаса):
     *   1) 4K-текстуры Земли/Луны — download+decode заранее (кэш Promise);
     *   2) resize под первый кадр open() → HDR-таргеты создаются СЕЙЧАС,
     *      а не в кадре №1 фазы A;
     *   3) bake скайдома — агрессивно срезами в idle (успевает за варп);
     *   4) один скрытый кадр полного пайплайна — прогрев всех программ,
     *      VAO, сэмплеров и uniform-буферов (первый кадр с «холодными»
     *      программами даёт компиляцию пайплайна на драйвере = хич).
     * Вызывается из Space3D.prepareForWarpArrival() по 'aurora:warp-started'.
     */
    preWarm(engine) {
        if (!this.isSupported()) return false;
        if (!this.ok && !this.init(engine)) return false;
        this._preWarmActive = true;
        try { this.preloadTextures(); } catch (e) { /* noop */ }

        // Размер первого кадра open(): вьюпорт скрыт (clientWidth = 0),
        // open() использует тот же fallback — таргеты совпадут 1:1
        try {
            const w = (typeof window !== 'undefined' && window.innerWidth) || 1280;
            const h = (typeof window !== 'undefined' && window.innerHeight) || 720;
            const dprCap = this.quality === 'high' ? 1.75 : 1.35;
            const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, dprCap);
            this.resize(w, h, dpr);
            this._ensureHdrTargets(this.width, this.height);
        } catch (e) { console.warn('[Space3D-GL] Прогрев resize:', e); }

        // Bake: по 2 среза за idle-шаг — весь скайдом за ~3 idle-колбэка
        this.bakeSlicesPerStep = 2;
        if (this.bakeReady) this._preWarmActive = false;
        else this._scheduleBake();

        // Один скрытый кадр: прогрев всех программ, кроме (возможно) sky —
        // он догреется в _bakeSkyStep по завершении bake
        this._warmRenderOnce();
        return true;
    }

    /** Один кадр рендера в скрытом состоянии (возврат suspend-флага). */
    _warmRenderOnce() {
        if (!this.ok || !this.gl) return;
        const wasSuspended = this.suspended;
        this.suspended = false;
        try {
            this.render(0, -30, 1.0, 0.016);
        } catch (e) {
            console.warn('[Space3D-GL] Прогрев рендера не удался:', e);
        }
        this.suspended = wasSuspended;
    }

    render(camYaw, camPitch, camZoom, dt, camRoll = 0) {
        if (!this.ok || !this.gl || this.suspended) return;
        const gl = this.gl;
        this.time += dt || 0.016;

        // Кинематика планет (скорость вращения уменьшена в 0.5 раза)
        // === Реалистичная кинематика Земля-Луна ===
        // Угловая скорость суточного вращения Земли в эмуляции:
        //   ω_Земли = 0.00023 рад/кадр(60fps) × 60 = 0.0138 рад/с → оборот за ~7.6 мин
        // Формула связи (как в реальности): сидерический месяц Луны равен
        //   27.321661 сидерических суток → ω_Луны = ω_Земли / 27.321661.
        // Приливный захват: Луна повёрнута к Земле всегда одной стороной,
        //   поэтому её собственное вращение = орбитальному (moonRot ≡ moonOrbit).
        const EARTH_OMEGA = 0.00023 * 60;              // рад/с (вращение Земли)
        const MOON_SIDEREAL_RATIO = 27.321661;         // сидерич. месяц / сидерич. сутки
        const moonOmega = EARTH_OMEGA / MOON_SIDEREAL_RATIO;
        this.earthRot += EARTH_OMEGA * dt;
        this.cloudsRot += 0.00031 * 60 * dt;           // атмосферный дрейф (не физический)
        this.moonOrbit += moonOmega * dt;              // орбита: оборот за 27.32 «суток» эмуляции (~3.45 ч)
        this.moonRot += moonOmega * dt;                // приливный захват

        // Bake НИКОГДА не начинается в кадрах кинематики: к прилёту скайдом уже
        // запечён (bake с init/preWarm), иначе beginCinematicHold дожал срезы
        if (!this.bakeReady && !this._cinematicHold) this._scheduleBake();
        this._adaptiveResolution(dt || 0.016);

        const fov = 750 * camZoom;
        const { m, inv } = this._updateMatrices(camYaw, camPitch, fov, camRoll);

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
            gl.uniform1f(u.uTwinkle, 0.02);    // субтильное медленное переливание
            gl.bindVertexArray(this.vaos.stars);
            gl.drawArrays(gl.POINTS, 0, this.starVertexCount);
            gl.bindVertexArray(null);
        }

        /* === 2b. МЕТЕОРЫ отключены (по запросу — «белый луч» отвлекал) === */

        /* === 3. ПЛАНЕТЫ === */
        const sunDir = this._sunDir();
        if (!this._earthCenter) {
            this._earthCenter = new Float32Array(3);
            this._moonCenter = new Float32Array(3);
        }
        // Земля отдалена на 0.5x (dist: 1470 px, pitch: -44°), радиус 700
        const earthCenter = this._dirFromYawPitch(0, -44, 1470, this._earthCenter);

        // Луна на настоящей орбите вокруг Земли: наклонение 16°, радиус 1500 px,
        // сидерический период синхронизирован с вращением (приливный захват).
        // Орбитальная фаза подобрана так, что на старте Луна в левом верхнем
        // секторе неба (yaw ≈ -28°, pitch ≈ +24° от камеры).
        const orbA = this.moonOrbit + 0.62;
        const orbR = 1500;
        const orbInc = 16 * Math.PI / 180;
        const orbZ = Math.sin(orbA) * orbR * Math.cos(orbInc);
        const orbX = Math.cos(orbA) * orbR * Math.cos(orbInc);
        const orbY = Math.sin(orbA) * orbR * Math.sin(orbInc) + 260;
        const moonCenter = this._moonCenter;
        moonCenter[0] = earthCenter[0] + orbX;
        moonCenter[1] = earthCenter[1] + orbY;
        moonCenter[2] = earthCenter[2] + orbZ;

        // Один переиспользуемый объект опций на все draw-вызовы кадра:
        // ноль object-literal аллокаций в горячем пути (GC = микро-хичи)
        const o = this._sphereOpts;
        o.sunDir = sunDir;
        o.mat = m;
        o.fov = fov;

        // 3.1 Земля (отдалена на 0.5x: dist 1470, радиус 700)
        o.center = earthCenter;
        o.radius = 700;
        o.bodyType = 0;
        o.texture = this.textures.earthDay;
        o.night = this.textures.earthNight;
        o.clouds = this.textures.earthClouds;
        o.cloudShift = -this.cloudsRot;
        o.groundShift = -this.earthRot;
        o.texel = this._texel4k;
        o.cloudOpacity = 0.90;
        o.bump = 0.55;
        o.specular = 1.5;
        o.ambient = 0.20;          // earthshine: холодная сине-голубая подсветка ночной стороны
        o.ambientColor = this._ambientEarth;
        o.exposure = 1.32;         // альбедо в линейном пространстве (sRGB-декод) —
                                   // экспозиция поднята для компенсации
        o.atmosphere = 0.85;
        o.earthDir = earthCenter;
        o.atmosphereOnly = false;
        o.urot = this.earthRot;
        this._drawSphere(o);

        // 3.2 Атмосферная оболочка Земли (аналитическое рассеяние, 14 шагов)
        o.center = earthCenter;
        o.radius = 700 * 1.025;
        o.planetRadius = 700;
        o.atmosphereOnly = true;
        o.strength = 1.05;         // линейный HDR-пайплайн (sRGB-декод альбедо ниже)
        o.falloff = 3.6;
        o.texture = this.textures.earthClouds;
        this._drawSphere(o);

        // 3.3 Луна (уменьшена в 2 раза: радиус 145 px, медленное реалистичное вращение)
        o.center = moonCenter;
        o.radius = 145;
        o.bodyType = 1;
        o.texture = this.textures.moon;
        o.night = this.textures.moon;
        o.clouds = this.textures.moon;
        o.cloudShift = 0;
        o.cloudOpacity = 0;
        o.bump = 0.52;
        o.specular = 0.05;
        o.ambient = 0.20;
        o.ambientColor = this._ambientMoon; // холодный земной fill ночной стороны
        o.atmosphere = 0;
        o.earthDir = earthCenter;
        o.groundShift = -this.moonRot;
        o.texel = this._texel4k;
        o.urot = this.moonRot;
        o.exposure = 1.15;
        o.atmosphereOnly = false;
        this._drawSphere(o);

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
        // Порядок обхода UV-сетки даёт фронт CCW при w = z_cam > 0 — включаем
        // отсечение задних полусфер: минус ~50% фрагментных вызовов на сферу.
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);

        gl.uniform3fv(u.uCenter, opts.center);
        gl.uniform1f(u.uRadius, opts.radius);
        gl.uniform3fv(u.uSunDir, opts.sunDir);
        // Фолбэк без аллокации в кадре: буфер заполнен один раз в init()
        gl.uniform3fv(u.uEarthDir, opts.earthDir || this._earthRefDir);
        gl.uniform1f(u.uBodyType, opts.bodyType || 0);
        gl.uniform2f(u.uTexel, opts.texel ? opts.texel[0] : 1 / 4096, opts.texel ? opts.texel[1] : 1 / 2048);
        if (u.uGroundShift) gl.uniform1f(u.uGroundShift, opts.groundShift || 0);
        gl.uniform1f(u.uCloudShift, opts.cloudShift || 0);
        gl.uniform1f(u.uCloudOpacity, opts.cloudOpacity || 0);
        gl.uniform1f(u.uBumpScale, opts.bump || 0);
        gl.uniform1f(u.uSpecular, opts.specular || 0);
        gl.uniform1f(u.uAmbient, opts.ambient || 0);
        gl.uniform1f(u.uAtmosphere, opts.atmosphere || 0);
        gl.uniform1f(u.uExposure, opts.exposure || 1.0);
        if (u.uAmbientColor) gl.uniform3fv(u.uAmbientColor, opts.ambientColor || this._zero3);

        // Привязка текстур без временных массивов (texUnits-литералы давали
        // 4 аллокации на КАЖДЫЙ draw-вызов — до 12 объектов за кадр)
        if (u.uDay) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, opts.texture || this.textures.earthDay);
            gl.uniform1i(u.uDay, 0);
        }
        if (u.uNight) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, opts.night || opts.texture);
            gl.uniform1i(u.uNight, 1);
        }
        if (u.uClouds) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, opts.clouds || opts.texture);
            gl.uniform1i(u.uClouds, 2);
        }
        gl.activeTexture(gl.TEXTURE0);

        gl.bindVertexArray(this.vaos.sphere);
        gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
    }

    /* ---------------------------------------------------------------------
     * МЕТЕОРЫ: состояние + один аддитивный квад
     * Тайминги — только от монотонных часов (performance.now): прогресс
     * вычисляется из времени старта, а НЕ накапливается через dt. Поэтому
     * dt=0, скачок dt после таб-сна и паузы rAF не могут «заморозить»
     * метеор или растянуть его — он гарантированно скрыт по таймеру.
     * ------------------------------------------------------------------- */
    _meteorNow() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
    }

    _updateMeteor() {
        const now = this._meteorNow();
        if (this._meteor) {
            const p = (now - this._meteor.start) / this._meteor.dur;
            // p >= 1 — жизненный цикл окончен; NaN/Inf/отрицательный p —
            // тоже немедленно снимаем с рендера (сброс active-флага)
            if (!(p >= 0) || p >= 1) {
                this._meteor = null;
                this._meteorActive = false;
                this._meteorNextAt = now + 6 + Math.random() * 4;   // раз в 6-10 с
            }
            return;
        }
        if (this._meteorNextAt === undefined || !(this._meteorNextAt >= 0)) {
            this._meteorNextAt = now + 3 + Math.random() * 3;       // первый — через 3-6 с
        }
        if (now >= this._meteorNextAt) {
            // Наклон преимущественно диагональный, падение вниз
            const ang = (0.25 + Math.random() * 0.70) * (Math.random() < 0.5 ? -1 : 1);
            const dir = [Math.cos(ang), Math.sin(ang)];
            dir[0] = (Math.random() < 0.5 ? -1 : 1) * Math.abs(dir[0]);
            dir[1] = -Math.abs(dir[1]);
            // Длина следа жёстко ограничена: ≤ ~40% высоты экрана в NDC
            const travel = 0.30 + Math.random() * 0.18;
            // Старт в верхней половине кадра, вся траектория в границах экрана
            const sx = Math.max(-0.72, Math.min(0.72, (Math.random() * 1.2 - 0.6) - dir[0] * travel));
            const sy = 0.15 + Math.random() * 0.50;
            this._meteor = {
                cx: Math.max(-0.9, Math.min(0.9, sx + dir[0] * travel * 0.5)),
                cy: Math.max(-0.9, Math.min(0.9, sy + dir[1] * travel * 0.5)),
                travel,
                dur: 0.7 + Math.random() * 0.7,
                start: now,
                seed: Math.random() * 100
            };
            this._meteorActive = true;
        }
    }

    _renderMeteor() {
        const mtr = this._meteor;
        if (!mtr || !this._meteorActive) return;    // active-флаг сброшен — не рисуем
        const gl = this.gl;
        const p = this.programs.meteor;
        if (!p) return;
        const u = p.uniforms;

        // Страховка перед отрисовкой: прогресс строго из монотонных часов;
        // вне [0,1) (включая NaN после любого сбою таймера) — скрыть и снять
        const now = this._meteorNow();
        const progress = (now - mtr.start) / mtr.dur;
        if (!(progress >= 0) || progress >= 1) {
            this._meteor = null;
            this._meteorActive = false;
            return;
        }

        // Clamp квада по экранным размерам + отсечение целиком вне экрана
        const half = Math.min(0.34, mtr.travel * 0.5 + 0.07);
        const cx = Math.max(-1.05, Math.min(1.05, mtr.cx));
        const cy = Math.max(-1.05, Math.min(1.05, mtr.cy));
        if (cx - half > 1.0 || cx + half < -1.0 || cy - half > 1.0 || cy + half < -1.0) return;

        gl.useProgram(p.prog);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        // Квадратный квад: локальные оси изотропны — поворот хвоста корректен
        gl.uniform2f(u.uMeteorCenter, cx, cy);
        gl.uniform2f(u.uMeteorHalf, half, half);
        gl.uniform1f(u.uProgress, progress);
        gl.uniform1f(u.uSeed, mtr.seed);

        gl.bindVertexArray(this.vaos.fullscreen);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    /* ---------------------------------------------------------------------
     * СОЛНЦЕ: экранный билборд с физическим угловым размером
     * ------------------------------------------------------------------- */
    /**
     * Экранные координаты Солнца: NDC-центр и половина размера квада в NDC.
     * Диск Солнца = 0.2665°; квад рисуется с запасом под корону.
     */
    _sunScreenNdc(m, fov) {
        const d = SUN_DIR;
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

        // Мутируем существующие массивы — без аллокаций в кадре
        this.optics.sunNdc[0] = ndcX;
        this.optics.sunNdc[1] = ndcY;
        this.optics.sunHalf[0] = halfX;
        this.optics.sunHalf[1] = half;
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
        if (u.uTime !== undefined) gl.uniform1f(u.uTime, this.time || 0);
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
            // Порог в HDR: 0.85 — bloom только от по-настоящему ярких
            // источников, звёзды не расплываются в пятна
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
