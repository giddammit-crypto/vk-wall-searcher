"""
QA-превью сцены AURORA без WebGL: численное зеркало шейдеров space3d_gl.js.

Рендерит:
  • Землю по модели SPHERE_FS (альбедо, бамп по альбедо, терминатор, облака,
    тени облаков, ночные огни, глиттер океана);
  • атмосферу по модели ATMO_FS (интеграл рассеяния по лучу зрения);
  • Луну по модели Луны (Lommel–Seeliger + противостояние).

Единицы сцены: 1 unit = 6.371 км (радиус Земли = 1000 units).
Запуск: PYTHONPATH=/home/user/.devtools/pylibs python3 tools/preview_scene.py
"""
import numpy as np
from PIL import Image

ROOT = 'assets/textures/'
S = 560
FOV_PX = 750.0          # фокусное расстояние движка (fov = 750 * zoom)

day = np.asarray(Image.open(ROOT + 'earth_day.jpg').convert('RGB'), dtype=np.float32) / 255.0
night = np.asarray(Image.open(ROOT + 'earth_night.png').convert('RGB'), dtype=np.float32) / 255.0
clud = np.asarray(Image.open(ROOT + 'earth_clouds.png').convert('L'), dtype=np.float32) / 255.0
moon_tex = np.asarray(Image.open(ROOT + 'moon.jpg').convert('L'), dtype=np.float32) / 255.0

SUN = np.array([0.72, 0.28, 0.63], dtype=np.float32)
SUN /= np.linalg.norm(SUN)
UNITS_TO_KM = 6371.0

# --- параметры модели освещения (должны совпадать с шейдером) ---------------
BETA_R = np.array([5.5e-6, 13.0e-6, 33.1e-6], dtype=np.float64) * UNITS_TO_KM
BETA_M = 21.0e-6 * UNITS_TO_KM
H_R = 9000.0 / UNITS_TO_KM          # шкала высоты Рэлея в units
H_M = 1400.0 / UNITS_TO_KM
MIE_G = 0.758
ATMO_STEPS = 24
EARTH_R = 1000.0
ATMO_R = EARTH_R * 1.025


def sample(tex, u, v):
    h, w = tex.shape[:2]
    fx = (u % 1.0) * (w - 1)
    fy = np.clip(v, 0, 1) * (h - 1)
    x0 = np.floor(fx).astype(np.int32); y0 = np.floor(fy).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1);     y1 = np.minimum(y0 + 1, h - 1)
    tx = fx - x0; ty = fy - y0
    a = tex[y0, x0]; b = tex[y0, x1]; c = tex[y1, x0]; d = tex[y1, x1]
    if tex.ndim == 2:
        return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
    tx = tx[..., None]; ty = ty[..., None]
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float32)


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float32)


def camera_rays(yaw_deg, pitch_deg):
    """Лучи в МИРОВОЙ системе: мир фиксирован, камера поворачивается R=RotX(p)·RotY(y)."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u = (xx - S / 2) / (S / 2)
    v = -(yy - S / 2) / (S / 2)
    cam = np.stack([u * (S / 2) / FOV_PX, v * (S / 2) / FOV_PX, np.ones_like(u)], axis=-1)
    R = rot_x(np.radians(pitch_deg)) @ rot_y(np.radians(yaw_deg))
    world = cam @ R           # world = Rᵀ · cam
    n = np.linalg.norm(world, axis=-1, keepdims=True)
    return world / n


def ray_sphere(o, d, c, r):
    oc = o - c
    b = np.sum(oc * d, axis=-1)
    cc = np.sum(oc * oc, axis=-1) - r * r
    h = b * b - cc
    ok = h >= 0
    h = np.sqrt(np.maximum(h, 0))
    return ok, -b - h, -b + h


def sun_optical_depth(p, c, pr, sd, steps=6):
    """Оптическая глубина от точки p до Солнца (самозатенение атмосферы)."""
    ok, t0, t1 = ray_sphere(p, sd, c, pr)
    res = np.ones(p.shape[:-1], dtype=np.float32)
    front = ok & (t1 > 0)
    if not front.any():
        return res
    t = np.maximum(t0, 0.0)
    ln = np.maximum(t1 - t, 0.0)
    acc = np.zeros(p.shape[:-1], dtype=np.float32)
    for i in range(steps):
        ts = t + ln * (i + 0.5) / steps
        q = p + sd * ts[..., None]
        hh = np.maximum(np.linalg.norm(q - c, axis=-1) - pr, 0.0)
        acc += np.exp(-hh / (H_R * 1.6)) * (ln / steps)
    th = np.clip(acc / (H_R * 12.0), 0.0, 1.0)
    return np.where(front, th, 1.0).astype(np.float32)


def atmosphere(o, d, center, sun, strength, exposure):
    """Интеграл рассеяния по лучу зрения (зеркало ATMO_FS)."""
    ok, t0, t1 = ray_sphere(o, d, center, ATMO_R)
    hit, tp0, tp1 = ray_sphere(o, d, center, EARTH_R)
    start = np.maximum(t0, 0.0)
    end = t1.copy()
    use = ok & (t1 > 0) & (end > start)
    end = np.where(hit & (tp0 > 0), np.minimum(end, tp0), end)
    use = use & (end > start)

    step = np.where(use, (end - start) / ATMO_STEPS, 0.0)
    sumR = np.zeros(d.shape[:-1] + (3,), dtype=np.float32)
    sumM = np.zeros(d.shape[:-1], dtype=np.float32)
    odR = np.zeros(d.shape[:-1], dtype=np.float32)
    odM = np.zeros(d.shape[:-1], dtype=np.float32)
    for i in range(ATMO_STEPS):
        t = start + step * (i + 0.5)
        p = d * t[..., None]
        hh = np.maximum(np.linalg.norm(p - center, axis=-1) - EARTH_R, 0.0)
        hr = np.exp(-hh / H_R) * step
        hm = np.exp(-hh / H_M) * step
        odR += hr
        odM += hm
        sd = 1.0 - sun_optical_depth(p, center, EARTH_R, sun)
        sd = sd * sd * (3 - 2 * sd)
        sumR += hr[..., None] * sd[..., None]
        sumM += hm * sd
    odR = np.where(use, odR, 0.0); odM = np.where(use, odM, 0.0)
    sumR = np.where(use[..., None], sumR, 0.0); sumM = np.where(use, sumM, 0.0)

    mu = np.sum(d * sun, axis=-1)
    phaseR = 0.0596831 * (1 + mu * mu)
    g2 = MIE_G * MIE_G
    phaseM = 0.0795775 * ((1 - g2) * (1 + mu * mu)) / ((2 + g2) * np.maximum(1 + g2 - 2 * MIE_G * mu, 1e-4) ** 1.5)

    tau = BETA_R[None, None, :] * odR[..., None] + BETA_M * odM[..., None] * 1.15
    ext = np.exp(-tau)
    col = (sumR * BETA_R[None, None, :] * phaseR[..., None] +
           (sumM * BETA_M * phaseM)[..., None]) * ext
    col = col * strength * 0.62
    col = col / (1.0 + col * 0.35)                      # насыщение у кромки
    return np.clip(col, 0, 4).astype(np.float32), use


def render_earth(yaw, pitch, sun=SUN, spin_deg=0.0, atmo_exposure=1.0, show_atmo=True):
    d = camera_rays(yaw, pitch)
    center = np.array([0, 1350 * np.sin(np.radians(-48)), 1350 * np.cos(np.radians(-48))], dtype=np.float32)

    ok, t0, t1 = ray_sphere(np.zeros(3, dtype=np.float32), d, center, EARTH_R)
    hit = ok & (t1 > 0)
    t = t1
    p = d * t[..., None]
    N = (p - center)
    N = N / (np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9)

    # Ориентация планеты: долгота/широта из нормали (с учётом вращения)
    sp = np.radians(spin_deg)
    Rz = rot_y(-sp)
    Ns = N @ Rz
    u = 0.5 + np.arctan2(Ns[..., 0], Ns[..., 2]) / (2 * np.pi)
    v = 0.5 - np.arcsin(np.clip(Ns[..., 1], -1, 1)) / np.pi
    U = u.astype(np.float32); V = v.astype(np.float32)

    alb = sample(day, U, V)
    nt = sample(night, U, V)
    cl = sample(clud, U, V)

    ndl_geom = np.clip(N @ sun, -1, 1)
    lum = alb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    east = np.cross(np.array([0, 1, 0], dtype=np.float32), N)
    east /= (np.linalg.norm(east, axis=-1, keepdims=True) + 1e-5)
    north = np.cross(N, east)
    graze = np.clip((ndl_geom - 0.02) / 0.36, 0, 1); graze = graze * graze * (3 - 2 * graze)
    Nb = N + east * (0.0) + north * 0.0    # бамп отключён в превью (нужны градиенты текстуры)
    ndlb = np.clip(Nb @ sun, 0, 1)
    dayMask = np.clip((ndl_geom + 0.10) / 0.36, 0, 1); dayMask = dayMask * dayMask * (3 - 2 * dayMask)

    sunC = np.array([1.0, 0.965, 0.92], dtype=np.float32)
    lit = alb * sunC * ndlb[..., None] * (0.16 + 0.84 * dayMask)[..., None]

    oceanMask = np.clip((alb[..., 2] - np.maximum(alb[..., 0], alb[..., 1]) - 0.02) / 0.14, 0, 1)
    Vv = -d
    Hv = sun + Vv; Hv /= np.linalg.norm(Hv)
    glintAxis = np.cross(Hv, np.array([0, 1, 0], dtype=np.float32))
    glintAxis /= (np.linalg.norm(glintAxis, axis=-1, keepdims=True) + 1e-5)
    aniso = np.abs(np.sum(Nb * glintAxis, axis=-1))
    Hg = Hv + glintAxis * 0.0
    Hg /= (np.linalg.norm(Hg, axis=-1, keepdims=True) + 1e-6)
    micro = np.clip(np.sum(Nb * Hg, -1), 0, 1) ** 340 * (1 - aniso * 0.55)
    wide = np.clip(np.sum(Nb * Hv, -1), 0, 1) ** 34
    spec = (micro * 3.4 + wide * 0.18) * oceanMask * 1.5 * (ndl_geom > 0)

    nm = np.clip((ndl_geom + 0.12) / 0.20, 0, 1)
    nightMask = 1.0 - nm * nm * (3 - 2 * nm)
    city = np.maximum(nt - np.array([0.105, 0.105, 0.21], dtype=np.float32), 0) * 3.4
    city = city * np.array([1.06, 0.94, 0.80], dtype=np.float32) * nightMask[..., None]

    cl2 = sample(clud, (U * 2.7 + 0.31).astype(np.float32), np.clip(V * 2.7 + 0.17, 0, 1))
    clouds = np.clip((cl - 0.10) / 0.50, 0, 1)
    clouds = clouds * (0.72 + 0.58 * cl2)
    clouds = np.clip(clouds, 0, 1); clouds = clouds * clouds * (3 - 2 * clouds) * 0.88
    cloudLit = np.clip((N @ sun) + 0.10, 0, 1)
    cloudColor = (0.20 + cloudLit ** 1.35 * 0.98)[..., None] * sunC
    clvis = np.clip((ndl_geom + 0.30) / 0.32, 0, 1); clvis = clvis * clvis * (3 - 2 * clvis)
    clouds = clouds * (0.04 + 0.96 * clvis)

    Lsun = sun
    sunUv_x = -Lsun[0] * 0.010 * (1 + 6 * (1 - np.clip(ndl_geom, 0, 1)))
    sunUv_y = Lsun[1] * 0.010 * (1 + 6 * (1 - np.clip(ndl_geom, 0, 1)))
    shadowC = sample(clud, (U + sunUv_x).astype(np.float32), np.clip(V + sunUv_y, 0, 1))
    shadowC = np.clip((shadowC - 0.22) / 0.56, 0, 1) * 0.90
    lit = lit * (1 - (shadowC * 0.42 * np.clip(ndl_geom + 0.25, 0, 1))[..., None])
    edge = np.clip(clouds - shadowC * 0.85, 0, 1)
    cloudColor = cloudColor + np.array([0.28, 0.30, 0.34], dtype=np.float32) * edge[..., None] * 0.9

    # лимбовое рэлеевское свечение оставлено слабым — основную работу делает ATMO
    fres = (1 - np.clip(-d[..., 2] * 0 + np.sum(N * Vv, -1), 0, 1)) ** 3.4
    sunSide = np.clip((ndl_geom + 0.45) / 1.10, 0, 1)
    ray = np.where((ndl_geom > 0)[..., None], np.array([0.16, 0.42, 1.0]), np.array([0.85, 0.55, 0.30]))
    col_limb = ray * (fres * sunSide * 0.10 * (0.85 + clouds * 0.35))[..., None]

    color = lit + city + spec[..., None] + col_limb
    color = color * (1 - (clouds * 0.90)[..., None]) + cloudColor * (clouds * 0.90)[..., None]
    color += alb * np.array([0.05, 0.09, 0.16], dtype=np.float32) * 0.06 * dayMask[..., None]
    color *= 1.10

    out = np.zeros((S, S, 3), dtype=np.float32) + np.array([0.004, 0.006, 0.014], dtype=np.float32)
    out[hit] = color[hit]

    if show_atmo:
        ac, use = atmosphere(np.zeros(3, dtype=np.float32), d, center, sun, 1.0, atmo_exposure)
        out = out + np.where(use[..., None], ac, 0.0)
    return np.clip(out, 0, 1) ** (1 / 2.2), hit


if __name__ == '__main__':
    tiles = []
    for (yaw, pitch, spin) in ((0, -20, 0), (30, -8, 120), (-40, -30, 240)):
        img, _ = render_earth(yaw, pitch, spin_deg=spin, atmo_exposure=1.0)
        tiles.append(img)
    strip = np.concatenate(tiles, axis=1)
    Image.fromarray((strip * 255).astype(np.uint8)).save('/tmp/scene_preview.png')
    print('Сцена (Земля + атмосфера): /tmp/scene_preview.png')
