"""
Процедурная карта облачности Земли (equirectangular 2048x1024, бесшовная по X).

Техника (как в продакшене для планетарных шейдеров):
  1. 3D value-noise на направлениях единичной сферы → бесшовность и отсутствие
     полярных искажений.
  2. Domain warp: направление поворачивается вокруг оси циклона (формула
     Родрига) на угол, спадающий гауссово от центра — так возникают настоящие
     спиральные облачные вихри, а не «блины».
  3. Зональная анизотропия: частота шума по вертикали выше, чем по горизонтали,
     поэтому облачные полосы вытянуты вдоль параллелей (облачные улицы).
  4. Широтные пояса покрытия: ITCZ, сухие субтропики, штормовые пояса,
     полярные шапки.
"""
import numpy as np
from PIL import Image

W, H = 2048, 1024
rng = np.random.default_rng(20260912)

PERM = rng.permutation(256).astype(np.int32)
def _fade(t): return t * t * (3.0 - 2.0 * t)

def value_noise(px, py, pz):
    xi = np.floor(px).astype(np.int32); yi = np.floor(py).astype(np.int32); zi = np.floor(pz).astype(np.int32)
    xf = px - xi; yf = py - yi; zf = pz - zi
    u, v, w = _fade(xf), _fade(yf), _fade(zf)
    def h(a, b, c):
        idx = (PERM[(a & 255)] + (b & 255)) & 255
        return PERM[(PERM[idx] + (c & 255)) & 255] / 255.0
    n000 = h(xi, yi, zi);         n100 = h(xi + 1, yi, zi)
    n010 = h(xi, yi + 1, zi);     n110 = h(xi + 1, yi + 1, zi)
    n001 = h(xi, yi, zi + 1);     n101 = h(xi + 1, yi, zi + 1)
    n011 = h(xi, yi + 1, zi + 1); n111 = h(xi + 1, yi + 1, zi + 1)
    return (n000 * (1 - u) + n100 * u) * (1 - v) * (1 - w) + \
           (n010 * (1 - u) + n110 * u) * v * (1 - w) + \
           (n001 * (1 - u) + n101 * u) * (1 - v) * w + \
           (n011 * (1 - u) + n111 * u) * v * w

lon = (np.arange(W) + 0.5) / W * 2 * np.pi
lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
LON, LAT = np.meshgrid(lon, lat)
DX = (np.cos(LAT) * np.sin(LON)).astype(np.float32)
DY = (np.sin(LAT)).astype(np.float32)
DZ = (np.cos(LAT) * np.cos(LON)).astype(np.float32)
lat_deg = LAT * 180 / np.pi
abs_lat = np.abs(lat_deg)

# ------------------------------------------------ 1. Domain warp (циклоны) --
def dir_at(clat, clon):
    la, lo = np.radians(clat), np.radians(clon)
    return np.array([np.cos(la) * np.sin(lo), np.sin(la), np.cos(la) * np.cos(lo)], dtype=np.float32)

def rotate_about(vx, vy, vz, kx, ky, kz, ang):
    """v' = v cosθ + (k×v) sinθ + k (k·v)(1-cosθ)"""
    c, s = np.cos(ang), np.sin(ang)
    cx = ky * vz - kz * vy
    cy = kz * vx - kx * vz
    cz = kx * vy - ky * vx
    kd = kx * vx + ky * vy + kz * vz
    nx = vx * c + cx * s + kx * kd * (1 - c)
    ny = vy * c + cy * s + ky * kd * (1 - c)
    nz = vz * c + cz * s + kz * kd * (1 - c)
    n = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    return (nx / n).astype(np.float32), (ny / n).astype(np.float32), (nz / n).astype(np.float32)

WX, WY, WZ = DX.copy(), DY.copy(), DZ.copy()
cyclones = []
for band, count, spread in ((47.0, 6, 12.0), (-53.0, 7, 13.0), (16.0, 3, 9.0), (-19.0, 3, 9.0), (66.0, 3, 10.0)):
    for _ in range(count):
        cyclones.append((band + rng.uniform(*(-spread, spread)), rng.uniform(0, 360),
                         rng.uniform(20.0, 36.0),                        # радиус, °
                         rng.uniform(0.5, 1.05) * (1 if band > 0 else -1)))  # витков (знак = полушарие)

for clat, clon, rad, turns in cyclones:
    kx, ky, kz = dir_at(clat, clon)
    dl = np.abs(((LON * 180 / np.pi - clon + 540) % 360) - 180) * np.cos(np.radians(clat))
    dl2 = lat_deg - clat
    r = np.sqrt(dl * dl + dl2 * dl2)
    theta = np.exp(-(r / rad) ** 2) * turns * 0.42
    WX, WY, WZ = rotate_about(WX, WY, WZ, kx, ky, kz, theta)

# ------------------------------------------------------------ 2. fBm слой ---
def fbm_from(vx, vy, vz, fx, fy, fz, octaves, gain=0.5, lac=2.03, seed=0.0):
    total = np.zeros((H, W), dtype=np.float32); amp = 1.0; norm = 0.0
    for o in range(octaves):
        total += value_noise(vx * fx + seed, vy * fy - seed * 0.5, vz * fz + seed * 1.7) * amp
        norm += amp; amp *= gain; fx *= lac; fy *= lac; fz *= lac
    return total / norm

# Зональная анизотропия: по вертикали (широте) частоты выше → вытянутые полосы
base  = fbm_from(WX, WY, WZ, 2.7, 6.8, 2.7, 6, gain=0.52, seed=0.0)
meso  = fbm_from(WX, WY, WZ, 7.2, 15.0, 7.2, 5, gain=0.5, seed=23.0)
cirrus= fbm_from(WX, WY, WZ, 15.0, 30.0, 15.0, 4, gain=0.55, seed=71.0)

# ---------------------------------------------------------- 3. Пояса --------
itcz   = np.exp(-((abs_lat / 8.0) ** 2))                       # экваториальная зона
subtrop= np.exp(-(((abs_lat - 28.0) / 12.0) ** 2))             # сухие субтропики
storm  = np.exp(-(((abs_lat - 57.0) / 16.0) ** 2))             # штормовые пояса
polar  = np.exp(-(((abs_lat - 84.0) / 14.0) ** 2)) * 0.45
belt = 0.50 + 0.55 * itcz + 0.72 * storm - 0.30 * subtrop + polar
belt = np.clip(belt, 0.18, 1.6)
belt_n = (belt - 0.18) / 1.42

# Целевое покрытие по широтам (реальная облачность Земли: ~0.67 в ITCZ,
# ~0.25 в субтропиках, ~0.65 в штормовых поясах)
cov_target = 0.40 + 0.30 * itcz + 0.26 * storm - 0.18 * subtrop + 0.10 * polar
cov_target = np.clip(cov_target * 1.18, 0.16, 0.82)

# ------------------------------------------------------------ 4. Сборка ----
score = base * 0.98 + meso * 0.46
score = score * (0.55 + 0.80 * belt_n)

# Ранговый порог по широтным полосам: гарантирует целевое покрытие и
# естественную неоднородность (перцентиль вместо жёсткого отсечения).
th = np.zeros_like(score)
band_h = 16
for y0 in range(0, H, band_h):
    y1 = min(H, y0 + band_h)
    block = score[y0:y1].reshape(-1)
    tgt = float(cov_target[y0:y1].mean())
    th[y0:y1] = np.quantile(block, 1.0 - tgt)

# Плавное сглаживание порога по широте (без ступенек между полосами)
k = np.ones(41, dtype=np.float32) / 41.0
th_col = th[:, :1]
pad = np.pad(th_col, ((20, 20), (0, 0)), mode='edge')
th_smooth = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, pad)[:, :1]
th = np.repeat(th_smooth, W, axis=1)

width = 0.165
clouds = np.clip((score - th) / width, 0.0, 1.0)
clouds = clouds * clouds * (3.0 - 2.0 * clouds)          # smoothstep-края
# Перистые волокна сверху — только по уже существующим облакам
clouds = np.clip(clouds + (cirrus - 0.48) * 0.34 * (clouds > 0.04), 0.0, 1.0)
# Мелкая рваная структура краёв
clouds = np.clip(clouds * (0.90 + meso * 0.16), 0.0, 1.0)

# Мягкие «ватные» кромки: смешиваем с размытой копией (box blur через
# интегральное изображение), чтобы маска не выглядела бинарной.
def box_blur(a, r):
    pad = np.pad(a, ((r, r), (r, r)), mode='reflect')
    ii = pad.cumsum(0).cumsum(1)
    ii = np.pad(ii, ((1, 0), (1, 0)))
    k = 2 * r + 1
    return (ii[k:, k:] - ii[:-k, k:] - ii[k:, :-k] + ii[:-k, :-k]) / (k * k)

soft = box_blur(box_blur(clouds, 3), 9)
clouds = np.clip(clouds * 0.62 + soft * 0.55, 0.0, 1.0)
# Полюса не должны «иглить» при сжатии текстуры
polar_fade = np.clip(1.0 - (abs_lat - 88.5) / 6.0, 0.55, 1.0)
clouds *= polar_fade

img = (clouds * 255.0 + 0.5).astype(np.uint8)
Image.fromarray(img, mode='L').save('textures/earth_clouds.png', optimize=True)
print('earth_clouds.png:', img.shape, '| покрытие(>40):', f'{(img > 40).mean() * 100:.1f}%',
      '| среднее:', f'{img.mean():.1f}', '| циклонов:', len(cyclones))
for la in (0, 20, 35, 50, 65, 80):
    rows = np.abs(lat_deg[:, 0] - la) < 2.0
    if rows.any(): print(f'   ±{la:2d}°: {(img[rows] > 40).mean() * 100:5.1f}%')
