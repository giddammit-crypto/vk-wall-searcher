#!/usr/bin/env python3
"""
Численное зеркало нового HDR-пайплайна космоса (tools/preview_flare.py).

Повторяет математику шейдеров SPHERE/ATMO/SUN/BRIGHT/BLOOM/POST и
процедурной оптики SunOptics, чтобы увидеть результат без браузера:

  1. тёмное небо + звёзды физического каталога (PSF, HDR-поток);
  2. диск Солнца 0.2665° с потемнением к краю;
  3. каскад bloom (bright-pass + 5 уровней box-down / tent-up);
  4. финальный проход: ACES, виньетка, зерно;
  5. линзовые артефакты 2D-оверлея: вуаль, лучи, анаморфная полоса,
     цепочка призраков — ровно те же формулы, что в src/sun_optics.js.

Запуск:
  PYTHONPATH=/home/user/.devtools/pylibs python3 tools/preview_flare.py
Результат: /tmp/flare_preview.png (плитки) + таблица чисел в stdout.
"""
import math
import numpy as np
from PIL import Image, ImageDraw

# ----------------------------------------------------------------- параметры
W, H = 1600, 900                 # логический кадр движка (dpr=1, renderScale=1)
FOV = 750.0                      # фокусное расстояние в пикселях (zoom = 1)
YAW, PITCH = 30.0, 8.0           # камера: Солнце в правой верхней части кадра
EXPOSURE = 1.28                  # автоэкспозиция при Солнце в кадре
BLOOM_STRENGTH = 0.62
VIGNETTE, GRAIN = 0.30, 0.010
THRESHOLD, KNEE = 0.85, 0.55
SUN_RADIANCE = 46.0
SUN_ANG_RADIUS = math.radians(0.2665)
SUN_DIR = np.array([0.72, 0.28, 0.63])
SUN_DIR = SUN_DIR / np.linalg.norm(SUN_DIR)
STAR_FLUX_GAIN = 0.26
STAR_COUNT = 5200

rng = np.random.default_rng(20260912)


# ------------------------------------------------------------------- камера
def camera_matrices(yaw_deg, pitch_deg):
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    cy, sy, cp, sp = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch)
    r = np.array([
        [cy, 0.0, -sy],
        [-sp * sy, cp, -sp * cy],
        [cp * sy, sp, cp * cy]
    ])
    return r


def project(dirs, r, fov=FOV, w=W, h=H):
    """Мировые направления → экранные пиксели и глубина z_cam."""
    cam = dirs @ r.T                       # камера = R · мир
    z = cam[:, 2]
    with np.errstate(divide='ignore', invalid='ignore'):
        px = w * 0.5 + (cam[:, 0] / np.where(np.abs(z) < 1e-6, 1e-6, z)) * fov
        py = h * 0.5 - (cam[:, 1] / np.where(np.abs(z) < 1e-6, 1e-6, z)) * fov
    return px, py, z


# ------------------------------------------------------- каталог звёзд (JS-модель)
def blackbody_linear(temp_k):
    t = min(40000, max(1000, temp_k)) / 100
    if t <= 66:
        r = 255.0
        g = 99.4708025861 * math.log(t) - 161.1195681661
        b = 0.0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307
    else:
        r = 329.698727446 * (t - 60) ** -0.1332047592
        g = 288.1221695283 * (t - 60) ** -0.0755148492
        b = 255.0
    cl = lambda v: min(255.0, max(0.0, v)) / 255
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    out = np.array([lin(cl(r)), lin(cl(g)), lin(cl(b))])
    return out / max(out.max(), 1e-6)


SPECTRAL = [(22000, 0.030, 1.8), (9500, 0.105, 1.35), (7000, 0.150, 1.10),
            (5800, 0.205, 1.00), (4600, 0.215, 0.90), (3300, 0.295, 0.62)]


def build_stars(n):
    dirs, flux, colors, sizes, spikes = [], [], [], [], []
    for _ in range(n):
        u = rng.random()
        flux_i = min(u ** -0.667, 24.0) * STAR_FLUX_GAIN
        pick = rng.random()
        acc = 0.0
        temp, boost = 5800, 1.0
        for t, share, b in SPECTRAL:
            acc += share
            if pick <= acc:
                temp, boost = t, b
                break
        flux_i *= boost
        theta, cosphi = rng.random() * 2 * math.pi, rng.random() * 2 - 1
        sinphi = math.sqrt(max(0.0, 1 - cosphi ** 2))
        dirs.append([sinphi * math.cos(theta), cosphi, sinphi * math.sin(theta)])
        flux.append(flux_i)
        colors.append(blackbody_linear(temp * (0.88 + rng.random() * 0.24)))
        sizes.append(0.95 + (min(flux_i, 60) / 60) ** 0.42 * 2.9)
        spikes.append(flux_i > 5.5 and temp > 8000)
    return (np.array(dirs), np.array(flux), np.array(colors), np.array(sizes), np.array(spikes))


# --------------------------------------------------------------- растеризация
def splat_sprite(buf, px, py, rgb, size_px, flux, spike=False):
    """Гауссово ядро PSF + ореол (+ лучи) в HDR-буфер."""
    rad = max(1, int(math.ceil(size_px * 1.6)))
    x0, y0 = int(round(px)), int(round(py))
    if x0 + rad < 0 or y0 + rad < 0 or x0 - rad >= W or y0 - rad >= H:
        return
    xs = np.arange(x0 - rad, x0 + rad + 1) - px
    ys = np.arange(y0 - rad, y0 + rad + 1) - py
    dx, dy = np.meshgrid(xs, ys)
    d = np.sqrt(dx * dx + dy * dy) / max(size_px, 0.5)
    prof = np.exp(-(d ** 2) * 5.4) + 0.16 * np.clip(1 - d, 0, 1) ** 2.2 + 0.045 * np.clip(1 - d, 0, 1) ** 1.05
    if spike:
        armh = np.exp(-np.abs(dy) * 34 / max(size_px, 1)) * np.exp(-np.abs(dx) * 2.4 / max(size_px, 1))
        armv = np.exp(-np.abs(dx) * 34 / max(size_px, 1)) * np.exp(-np.abs(dy) * 2.4 / max(size_px, 1))
        prof = prof + (armh + armv * 0.7) * 0.75
    val = prof * flux
    xs0, ys0 = max(0, x0 - rad), max(0, y0 - rad)
    xs1, ys1 = min(W, x0 + rad + 1), min(H, y0 + rad + 1)
    sy0, sx0 = ys0 - (y0 - rad), xs0 - (x0 - rad)
    sub = val[sy0:sy0 + (ys1 - ys0), sx0:sx0 + (xs1 - xs0)]
    for c in range(3):
        buf[ys0:ys1, xs0:xs1, c] += sub * rgb[c]


def draw_sun_disc(buf, cx, cy, fov=FOV):
    """SUN_FS: диск с потемнением к краю + корона радиансом uRadiance."""
    disc_r = fov * math.tan(SUN_ANG_RADIUS)
    quad_half = disc_r * 5.2
    r = int(math.ceil(quad_half)) + 1
    ys, xs = np.mgrid[-r:r + 1, -r:r + 1]
    qx, qy = xs / quad_half, ys / quad_half
    d = np.sqrt(qx ** 2 + qy ** 2)
    inside = d <= 1.0
    u_disc = disc_r / quad_half
    t = np.clip(d / u_disc, 0, 1)
    mu = np.sqrt(np.clip(1 - t ** 2, 0, 1))
    limb = 1 - 0.62 * (1 - mu)
    disc = np.clip((u_disc * 1.03 - d) / (u_disc * 1.03 - u_disc * 0.955), 0, 1) * limb
    corona = np.clip(1 - d, 0, 1) ** 3.4 * 0.020
    val = np.where(inside, (disc + corona) * SUN_RADIANCE, 0.0)
    tint = np.array([1.0, 0.975, 0.94])
    x0, y0 = int(round(cx)), int(round(cy))
    xs0, ys0 = max(0, x0 - r), max(0, y0 - r)
    xs1, ys1 = min(W, x0 + r + 1), min(H, y0 + r + 1)
    sub = val[ys0 - (y0 - r):ys0 - (y0 - r) + (ys1 - ys0), xs0 - (x0 - r):xs0 - (x0 - r) + (xs1 - xs0)]
    for c in range(3):
        buf[ys0:ys1, xs0:xs1, c] += sub * tint[c]
    return disc_r


# ------------------------------------------------------------------- bloom
def downsample_box(img):
    h, w, _ = img.shape
    h2, w2 = max(1, h // 2), max(1, w // 2)
    a = img[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).mean(axis=(1, 3))
    return a


def upsample_tent(img, target_h, target_w):
    # Ручная билинейная интерполяция (PIL не умеет float32 RGB)
    out = np.zeros((target_h, target_w, 3), dtype=np.float32)
    ys = (np.arange(target_h) + 0.5) * img.shape[0] / target_h - 0.5
    xs = (np.arange(target_w) + 0.5) * img.shape[1] / target_w - 0.5
    y0 = np.clip(np.floor(ys).astype(int), 0, img.shape[0] - 1)
    y1 = np.clip(y0 + 1, 0, img.shape[0] - 1)
    x0 = np.clip(np.floor(xs).astype(int), 0, img.shape[1] - 1)
    x1 = np.clip(x0 + 1, 0, img.shape[1] - 1)
    wy = np.clip(ys - y0, 0, 1)[:, None, None]
    wx = np.clip(xs - x0, 0, 1)[None, :, None]
    top = img[y0][:, x0] * (1 - wx) + img[y0][:, x1] * wx
    bot = img[y1][:, x0] * (1 - wx) + img[y1][:, x1] * wx
    out = top * (1 - wy) + bot * wy
    # шатёр 3×3 (веса 4/16, 2/16, 1/16) — как в BLOOM_FS
    k = np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], dtype=np.float32) / 16.0
    pad = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
    acc = np.zeros_like(out)
    for j in range(3):
        for i in range(3):
            acc += pad[j:j + target_h, i:i + target_w] * k[j, i]
    return acc


def bloom_cascade(hdr, levels=5):
    lum = hdr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    knee = KNEE
    soft = np.clip(lum - THRESHOLD + knee, 0, 2 * knee)
    soft = soft * soft / (4 * knee)
    contrib = np.maximum(soft, lum - THRESHOLD) / np.maximum(lum, 1e-4)
    bright = downsample_box(np.maximum(hdr * contrib[..., None], 0))
    chain = [bright]
    for _ in range(levels - 1):
        chain.append(downsample_box(chain[-1]))
    for i in range(len(chain) - 1, 0, -1):
        up = upsample_tent(chain[i], chain[i - 1].shape[0], chain[i - 1].shape[1])
        chain[i - 1] = chain[i - 1] + up * (0.85 if i == len(chain) - 1 else 0.72)
    full = upsample_tent(chain[0], H, W)
    return full


# ------------------------------------------------------------- финальный проход
def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


def post(hdr, bloom, exposure=EXPOSURE, strength=BLOOM_STRENGTH):
    col = hdr + bloom * strength
    col = col * exposure
    col = aces(np.maximum(col, 0))
    col = col ** np.array([0.985, 0.997, 1.012], dtype=np.float32)
    col = col * (1 - 0.16) + (col * np.array([0.93, 0.96, 1.05], dtype=np.float32)) * 0.16
    yy, xx = np.mgrid[0:H, 0:W]
    r2 = ((xx + 0.5) / W - 0.5) ** 2 + ((yy + 0.5) / H - 0.5) ** 2
    col = col * np.clip(1 - VIGNETTE * r2 * 1.55, 0, 1)[..., None]
    noise = (rng.random((H, W, 1)) - 0.5) * GRAIN
    return np.clip(col + noise, 0, 1)


# --------------------------------------------------- линзовые артефакты (2D-оверлей)
def glare_core(x):
    return np.minimum(0.34, 0.16 * np.maximum(x, 0.5) ** -2.2)


def glare_wide(x):
    return np.minimum(0.05, 0.022 * np.maximum(x, 1.0) ** -0.55)


def lens_layer(rgb, sun_xy, fov=FOV, mode='lens', intensity=1.0):
    """Аппроксимация SunOptics.render: вуаль, полоса, лучи, призраки (аддитивно)."""
    cx, cy = W * 0.5, H * 0.5
    sx, sy = sun_xy
    out = rgb.copy()
    scale = min(1.0, max(0.45, min(2.4, 0.85 + 0.3)))   # flareScale при zoom = 1
    amp = intensity
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    # 1. Вуаль рассеяния: два профиля, привязанных к радиусу диска Солнца
    disc_r0 = fov * math.tan(SUN_ANG_RADIUS) * max(0.75, scale)
    dist_px = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
    xr = dist_px / max(disc_r0, 1e-3)                     # расстояние в радиусах диска
    veil = glare_core(np.clip(xr, 0.5, 6.0)) + 0.01
    veil = np.where(xr <= 6.0, veil, 0.0)
    veil += glare_wide(np.clip(xr, 3.0, 400.0))
    veil = veil * amp
    out += veil[..., None] * np.array([1.0, 0.98, 0.94])

    # 2. Диск (только в режиме full)
    disc_r = fov * math.tan(SUN_ANG_RADIUS) * max(0.75, scale)
    if mode == 'full':
        r = disc_r
        dd = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
        inside = dd <= r
        mu = np.sqrt(np.clip(1 - (np.clip(dd / max(r, 1e-3), 0, 1)) ** 2, 0, 1))
        val = np.where(inside, (1 - 0.62 * (1 - mu)), 0.0)
        out += (val * min(1.0, amp * 1.15))[..., None] * np.array([1.0, 0.985, 0.955])

    # 3. Анаморфная полоса: 1.15·diag по X, тонкая нить (3.8% высоты)
    streak_w = max(W, math.hypot(W, H)) * 1.15
    streak_h = streak_w * 0.038
    tx = np.clip(((xx - sx) / (streak_w * 0.5) + 1) * 0.5, 0, 1)
    typ = np.clip(((yy - sy) / (streak_h * 0.5) + 1) * 0.5, 0, 1)
    prof_x = np.clip(1 - np.abs(tx - 0.5) * 2, 0, 1) ** 5.0 * 0.62
    prof_y = np.clip(1 - np.abs(typ - 0.5) * 2, 0, 1) ** 2.1
    blue = np.clip(np.abs(tx - 0.5) * 2, 0, 1) ** 1.7
    streak = prof_x * prof_y * min(1.0, amp * 0.46)
    out += streak[..., None] * np.stack([
        (1 - blue * 0.45), (1 - blue * 0.30), (0.92 + blue * 0.08)
    ], axis=-1)

    # 4. Лучи: 6 лепестков + длинная горизонталь
    spike_size = max(W, H) * (0.5 + min(0.45, amp * 0.5))
    dx = (xx - sx) / (spike_size * 0.5)
    dy = (yy - sy) / (spike_size * 0.5)
    ang = np.arctan2(dy, dx)
    dist = np.sqrt(dx ** 2 + dy ** 2)
    arms = 0.0
    for k in range(6):
        a = k * math.pi / 3
        diff = np.abs(np.arctan2(np.sin(ang - a), np.cos(ang - a)))
        length = 0.92 if k % 3 == 0 else 0.68
        arms += np.clip(1 - dist / length, 0, 1) ** 1.8 * np.exp(-(diff * 34) ** 2) * 0.76
    horiz = np.clip(1 - np.abs(dx) / 1.0, 0, 1) ** 3.6 * np.exp(-(dy * 60) ** 2)
    out += ((arms * 0.55 + horiz * 1.1) * min(1.0, amp * 0.34))[..., None] * np.array([1.0, 0.985, 0.94])

    # 5. Призраки вдоль оси «солнце → центр»
    axis = np.array([cx - sx, cy - sy])
    axis_dist = float(np.linalg.norm(axis))
    if axis_dist > 4:
        u = axis / axis_dist
        diag = math.hypot(W, H)
        path = [0.30, 0.62, 0.88, 1.16, 1.45, 1.74, 2.10]
        sizes = [0.045, 0.070, 0.028, 0.100, 0.058, 0.038, 0.135]
        tints = [[1.0, 0.84, 0.67], [0.67, 0.86, 1.0], [1.0, 0.92, 0.82],
                 [0.82, 0.92, 1.0], [0.75, 1.0, 0.92], [1.0, 0.75, 0.78], [0.94, 0.96, 1.0]]
        ghost_amp = min(1.0, amp * 0.15)
        for i, t in enumerate(path):
            gx = sx + u[0] * axis_dist * t
            gy = sy + u[1] * axis_dist * t
            if gx < -diag or gy < -diag or gx > W + diag or gy > H + diag:
                continue
            gs = sizes[i] * diag * (0.85 + 0.3 * scale)
            dd = np.sqrt((xx - gx) ** 2 + (yy - gy) ** 2) / max(gs * 0.5, 1)
            if i == 2:
                prof = np.exp(-((dd - 0.86) ** 2) / 0.004) * 0.42      # кольцо
            else:
                prof = (0.30 + np.clip(dd, 0, 1) ** 3.2 * 0.85) * np.clip(1 - dd ** 6, 0, 1) * 0.5
            falloff = max(0.0, 1 - min(1.0, (t - 0.2) / 2.0)) ** 0.6
            out += (prof * ghost_amp * falloff * (0.85 if i % 2 else 1.0))[..., None] * np.array(tints[i])
    return out, None


# ---------------------------------------------------------------------- main
def main():
    r = camera_matrices(YAW, PITCH)

    # --- звёзды → HDR-буфер
    dirs, flux, colors, sizes, spikes = build_stars(STAR_COUNT)
    px, py, z = project(dirs, r)
    vis = (z > 0.08) & (px > -8) & (px < W + 8) & (py > -8) & (py < H + 8)
    hdr = np.zeros((H, W, 3), dtype=np.float32)
    hdr[:, :, :] = np.array([0.0016, 0.0032, 0.0092], dtype=np.float32)   # чистый космос
    for i in np.where(vis)[0]:
        splat_sprite(hdr, px[i], py[i], colors[i], float(sizes[i]), float(flux[i]), bool(spikes[i]))

    # --- диск Солнца
    sx, sy, _ = project(SUN_DIR[None, :], r)
    sx, sy = float(sx[0]), float(sy[0])
    disc_r = draw_sun_disc(hdr, sx, sy)
    print(f'Солнце: экран ({sx:.0f}, {sy:.0f}), радиус диска {disc_r:.2f} px, '
          f'радианс в центре {SUN_RADIANCE:.0f} (HDR)')
    print(f'Видимых звёзд в кадре: {int(vis.sum())} из {STAR_COUNT}; '
          f'ярче 1.0 (пересвет): {int((flux[vis] > 1.0).sum())}')

    # --- bloom
    bloom = bloom_cascade(hdr)
    print(f'Bloom: пик {bloom.max():.3f}, средняя энергия {bloom.mean():.5f}')

    base = post(hdr, np.zeros_like(bloom))
    with_sun = post(hdr, bloom)

    # --- линзовый слой 2D-оверлея
    final, _ = lens_layer(np.clip(with_sun, 0, 1), (sx, sy), mode='lens', intensity=1.0)
    cpu_mode, _ = lens_layer(np.clip(base, 0, 1), (sx, sy), mode='full', intensity=1.0)
    final = np.clip(final, 0, 1)
    cpu_mode = np.clip(cpu_mode, 0, 1)

    # --- числовые проверки
    lum = final @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    print(f'Кадр после тона: пересвечено (L>0.95) {100.0 * (lum > 0.95).mean():.3f}% пикселей, '
          f'L>0.5 — {100.0 * (lum > 0.5).mean():.3f}%, медиана L {np.median(lum):.4f}')
    aces_v = lambda v: float(aces(np.array([v * EXPOSURE], dtype=np.float32))[0])
    print('ACES-контроль эталона: x=0.20 →', round(aces_v(0.20), 4),
          '| x=0.50 →', round(aces_v(0.50), 4),
          '| x=0.10 →', round(aces_v(0.10), 4), '(было бы без тонмаппинга: 0.20 / 0.50 / 0.10)')

    # --- плитки
    def crop(img, x, y, w, h, scale=2):
        x0 = int(max(0, min(W - w, x - w // 2)))
        y0 = int(max(0, min(H - h, y - h // 2)))
        c = Image.fromarray((np.clip(img[y0:y0 + h, x0:x0 + w], 0, 1) * 255).astype(np.uint8))
        return c.resize((w * scale, h * scale), Image.LANCZOS)

    tiles = [
        ('1. Сцена без Солнца (HDR → ACES)', Image.fromarray((base * 255).astype(np.uint8))),
        ('2. + диск Солнца и bloom (GPU)', Image.fromarray((with_sun * 255).astype(np.uint8))),
        ('3. + линзовые артефакты (оверлей)', Image.fromarray((final * 255).astype(np.uint8))),
        ('4. Блик крупно (×3)', crop(final, sx, sy, 320, 200, 3)),
        ('5. CPU-фолбэк (диск рисует 2D-оверлей)', Image.fromarray((cpu_mode * 255).astype(np.uint8))),
    ]
    pad = 14
    tw = W
    th = sum(t.height + 26 + pad for _, t in tiles) + pad
    sheet = Image.new('RGB', (tw, th), (8, 10, 16))
    d = ImageDraw.Draw(sheet)
    y = pad
    for label, tile in tiles:
        d.text((pad, y + 4), label, fill=(170, 200, 230))
        y += 24
        sheet.paste(tile, (0, y))
        y += tile.height + pad
    sheet.save('/tmp/flare_preview.png')
    print('Плитки: /tmp/flare_preview.png')


if __name__ == '__main__':
    main()
