"""
Улучшение текстуры Луны: 1024x512 → 2048x1024 для GPU-сферы.

Пайплайн (мягкий, без «выжженного» вида):
  1. Медианный фильтр 3×3 — убирает JPEG-артефакты 8×8 в исходной мозаике
     (они особенно заметны на крупном плане кратеров).
  2. Lanczos-апскейл ×2: резкие кратерные валы без «мыла».
  3. Unsharp mask умеренной амплитуды (σ≈1.1, вклад 0.28) — подчёркивает
     мелкие детали кратеров, не создавая гало.
  4. Тонирование по альбедо: базальтовые моря холоднее, реголит материков
     теплее; в глубоких тенях — холодная примесь отражённого света Земли.
  5. Полярное затухание против «игл» эквиректангулярного сжатия.
"""
import numpy as np
from PIL import Image, ImageFilter

SRC = DST = 'assets/textures/moon.jpg'
W, H = 2048, 1024

src = Image.open(SRC).convert('L')
den = src.filter(ImageFilter.MedianFilter(3))
up = den.resize((W, H), Image.LANCZOS)
a = np.asarray(up, dtype=np.float32) / 255.0

blur = np.asarray(up.filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255.0
a = np.clip(a + (a - blur) * 0.28, 0.0, 1.0)

mare = np.clip(1.0 - (a - 0.16) / 0.22, 0.0, 1.0)
warm = np.array([1.022, 1.004, 0.980], dtype=np.float32)
cool = np.array([0.955, 0.980, 1.040], dtype=np.float32)
tint = warm[None, None, :] * (1.0 - mare[..., None]) + cool[None, None, :] * mare[..., None]
rgb = a[..., None] * tint
rgb += (1.0 - a)[..., None] * np.array([0.010, 0.014, 0.024], dtype=np.float32)

lat = (0.5 - (np.arange(H) + 0.5) / H) * 180.0
fade = np.clip(1.0 - (np.abs(lat) - 86.0) / 12.0, 0.66, 1.0)[:, None]
rgb *= fade[..., None]

Image.fromarray((np.clip(rgb, 0, 1) * 255.0 + 0.5).astype(np.uint8), mode='RGB').save(
    DST, quality=84, subsampling=1, optimize=True, progressive=True)
import os
print(f'{DST}: {W}x{H}, {os.path.getsize(DST) / 1024:.0f} КБ (было {os.path.getsize(SRC) / 1024:.0f} КБ — источник 1024x512)')
