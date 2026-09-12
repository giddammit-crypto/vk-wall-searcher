"""
Численное превью шейдера SPHERE_FS (земля) — QA-инструмент без WebGL.
Мирроринг: SPHERE_FS в src/space3d_gl.js. Позволяет проверить текстуры,
ночные огни, терминатор и облачный слой до запуска в браузере.
"""
import numpy as np
from PIL import Image

ROOT = 'assets/textures/'
day = np.asarray(Image.open(ROOT + 'earth_day.jpg').convert('RGB'), dtype=np.float32) / 255.0
night = np.asarray(Image.open(ROOT + 'earth_night.png').convert('RGB'), dtype=np.float32) / 255.0
clud = np.asarray(Image.open(ROOT + 'earth_clouds.png').convert('L'), dtype=np.float32) / 255.0

SUN = np.array([0.72, 0.28, 0.63], dtype=np.float32); SUN /= np.linalg.norm(SUN)
SUN_COLOR = np.array([1.0, 0.965, 0.92], dtype=np.float32)
S = 520


def sample(tex, u, v):
    h, w = tex.shape[:2]
    fx = (u % 1.0) * (w - 1)
    fy = np.clip(v, 0, 1) * (h - 1)
    x0 = np.floor(fx).astype(np.int32); y0 = np.floor(fy).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1);     y1 = np.minimum(y0 + 1, h - 1)
    tx = (fx - x0); ty = (fy - y0)
    a = tex[y0, x0]; b = tex[y0, x1]; c = tex[y1, x0]; d = tex[y1, x1]
    if tex.ndim == 2:
        return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
    tx = tx[..., None]; ty = ty[..., None]
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty


def render(spin_deg, cam_tilt_deg=18.0):
    """spin_deg — поворот планеты вокруг оси; cam_tilt — наклон камеры."""
    spin = np.radians(spin_deg); tilt = np.radians(cam_tilt_deg)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    px = (xx + 0.5) / S * 2 - 1
    py = 1 - (yy + 0.5) / S * 2
    r2 = px * px + py * py
    inside = r2 <= 1.0
    pz = np.sqrt(np.clip(1 - r2, 0, 1))
    N = np.stack([px, py, pz], axis=-1)
    N = N / (np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9)
    # Наклон камеры по широте
    ct, st = np.cos(tilt), np.sin(tilt)
    Ny = N[..., 1] * ct - N[..., 2] * st
    Nz = N[..., 1] * st + N[..., 2] * ct
    N = np.stack([N[..., 0], Ny, Nz], axis=-1)
    # Вращение планеты вокруг вертикальной оси
    cs, ss = np.cos(spin), np.sin(spin)
    Nx = N[..., 0] * cs + N[..., 2] * ss
    Nz = -N[..., 0] * ss + N[..., 2] * cs
    N = np.stack([Nx, N[..., 1], Nz], axis=-1)

    u = 0.5 + np.arctan2(N[..., 0], N[..., 2]) / (2 * np.pi)
    v = 0.5 - np.arcsin(np.clip(N[..., 1], -1, 1)) / np.pi
    U = u.astype(np.float32); V = v.astype(np.float32)

    alb = sample(day, U, V)
    nt = sample(night, U, V)
    cl = sample(clud, U, V)

    ndl_geom = np.clip(N @ SUN, -1, 1)
    ndl = ndl_geom
    # Бамп из яркости альбедо (как в шейдере)
    lum = alb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    H0 = np.stack([lum] * 3, -1)
    east = np.cross(np.array([0, 1, 0], dtype=np.float32), N)
    east /= (np.linalg.norm(east, axis=-1, keepdims=True) + 1e-5)
    north = np.cross(N, east)
    graze = np.clip((np.clip(ndl_geom, -1, 1) - 0.02) / 0.36, 0, 1)
    graze = graze * graze * (3 - 2 * graze)
    Nb = N + (east * 0.008 + north * 0.008) * graze[..., None]
    Nb /= np.linalg.norm(Nb, axis=-1, keepdims=True)
    ndlb = np.clip(Nb @ SUN, 0, 1)

    ocean = np.clip((alb[..., 2] - np.maximum(alb[..., 0], alb[..., 1]) - 0.02) / 0.14, 0, 1)

    view = np.array([0, 0, 1], dtype=np.float32)
    Hv = SUN + view; Hv /= np.linalg.norm(Hv)
    spec = (np.clip(Nb @ Hv, 0, 1) ** 190) * ocean * 1.5
    spec += (np.clip(Nb @ Hv, 0, 1) ** 24) * ocean * 1.5 * 0.12

    nightMask = np.clip((np.clip(ndl_geom, -1, 1) + 0.04) / (0.18 + 0.04), 0, 1)   # smoothstep(0.18,-0.04)
    nightMask = 1.0 - nightMask
    cityLights = np.maximum(nt - np.array([0.10, 0.10, 0.20], dtype=np.float32), 0) * 3.1
    cityLights = cityLights * np.array([1.06, 0.94, 0.80], dtype=np.float32) * nightMask[..., None]

    dayMask0 = np.clip((np.clip(ndl_geom, -1, 1) + 0.10) / 0.36, 0, 1)
    dayMask0 = dayMask0 * dayMask0 * (3 - 2 * dayMask0)
    lit = alb * SUN_COLOR * ndlb[..., None] * (0.16 + 0.84 * dayMask0)[..., None]

    clouds = np.clip((cl - 0.10) / 0.50, 0, 1)          # smoothstep(0.10, 0.60)
    clouds = clouds * clouds * (3 - 2 * clouds) * 0.90
    cloudLit = np.clip((N @ SUN) + 0.12, 0, 1)
    cloudColor = (0.06 + cloudLit * cloudLit * 1.02)[..., None] * SUN_COLOR
    cl_vis = np.clip((np.clip(ndl_geom, -1, 1) + 0.30) / 0.32, 0, 1)
    cl_vis = cl_vis * cl_vis * (3 - 2 * cl_vis)
    clouds = clouds * (0.04 + 0.96 * cl_vis)
    lit = lit * (1 - (clouds * 0.24 * cloudLit)[..., None])

    color = lit + cityLights + spec[..., None]
    color = color * (1 - (clouds * 0.90)[..., None]) + cloudColor * (clouds * 0.90)[..., None]

    fres = (1.0 - np.clip(N @ view, 0, 1)) ** 3.4
    sunSide = np.clip((np.clip(ndl, -1, 1) + 0.45) / 1.10, 0, 1)
    ray = np.where((ndl > 0)[..., None], np.array([0.16, 0.42, 1.0]), np.array([0.85, 0.55, 0.30]))
    color += ray * (fres * sunSide * 0.85 * (0.85 + clouds * 0.35))[..., None]

    dayMask = dayMask0
    color += alb * np.array([0.05, 0.09, 0.16], dtype=np.float32) * 0.06 * dayMask[..., None]
    color *= 1.10

    out = np.zeros((S, S, 3), dtype=np.float32) + np.array([0.004, 0.006, 0.014], dtype=np.float32)
    out[inside] = np.clip(color, 0, 1)[inside] ** (1 / 2.2)
    return out


tiles = [render(spin, tilt) for spin, tilt in ((0, 18), (120, 18), (240, 18), (60, -32))]
strip = np.concatenate(tiles, axis=1)
Image.fromarray((np.clip(strip, 0, 1) * 255).astype(np.uint8)).save('/tmp/earth_views.png')
print('превью 4 ракурсов: /tmp/earth_views.png')
