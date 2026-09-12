"""
HD-подготовка архивных портретов «Герои Космоса» для 3D-карточек.

Исходники — 330 px по ширине (архивные сканы). Карточка в 3D-пространстве
занимает ~300 CSS px, на экранах с DPR 2 это 600 физических пикселей, поэтому
делаем апскейл ×2 и деликатную обработку:

  1. Медиана 3×3 — снимает JPEG-артефакты архивных сканов, не «съедая» зерно.
  2. Lanczos-апскейл до 660 px по ширине (сохранение пропорций).
  3. Unsharp mask умеренной амплитуды — возвращает резкость лица и формы.
  4. Мягкое снижение шума в тенях, чтобы после шарпа не «вылезли» блочные
     артефакты исходника.
  5. Унификация кадра: все портреты приводятся к соотношению 3:4 с аккуратной
     обрезкой по центру лица (верхняя треть), чтобы карточки выглядели ровно.
  6. Сохранение прогрессивным JPEG q88 без субдискретизации хромы.

Запуск: PYTHONPATH=/home/user/.devtools/pylibs python3 tools/enhance_cosmonaut_photos.py
"""
import os
import glob
import numpy as np
from PIL import Image, ImageFilter

SRC_DIR = 'assets/cosmonauts'
DST_DIR = 'assets/cosmonauts_hd'
TARGET_W = 660
RATIO = 3 / 4.0          # соотношение сторон карточки (ширина : высота)

os.makedirs(DST_DIR, exist_ok=True)
total = 0

for path in sorted(glob.glob(os.path.join(SRC_DIR, '*.jpg'))):
    name = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert('RGB')

    # --- 5. Кадрирование под 3:4 с приоритетом верхней части (лицо) ---
    w, h = img.size
    target_h = int(round(w / RATIO))
    if target_h <= h:
        # обрезаем по высоте, смещая окно вверх (там голова)
        top = int((h - target_h) * 0.22)
        img = img.crop((0, top, w, top + target_h))
    else:
        # исходник «узкий» — расширяем по бокам нейтральным фоном? Нет:
        # обрезаем по ширине, центрируя, чтобы сохранить лицо
        target_w = int(round(h * RATIO))
        left = max(0, (w - target_w) // 2)
        img = img.crop((left, 0, min(w, left + target_w), h))

    # --- 1. Медиана: снятие артефактов скана ---
    img = img.filter(ImageFilter.MedianFilter(3))

    # --- 2. Апскейл ---
    scale = TARGET_W / img.size[0]
    up = img.resize((TARGET_W, int(round(img.size[1] * scale))), Image.LANCZOS)

    # --- 3. Unsharp + 4. шумоподавление теней ---
    arr = np.asarray(up, dtype=np.float32) / 255.0
    blur = np.asarray(up.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255.0
    arr = np.clip(arr + (arr - blur) * 0.34, 0.0, 1.0)

    # мягкое шумоподавление только в тёмных областях (там артефакты заметны)
    smooth = np.asarray(up.filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32) / 255.0
    lum = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    shadow = np.clip((0.28 - lum) / 0.28, 0.0, 1.0)[..., None]
    arr = arr * (1.0 - shadow * 0.45) + smooth * (shadow * 0.45)

    out = Image.fromarray((np.clip(arr, 0, 1) * 255.0 + 0.5).astype(np.uint8), mode='RGB')
    dst = os.path.join(DST_DIR, f'{name}.jpg')
    out.save(dst, quality=88, subsampling=0, optimize=True, progressive=True)
    size = os.path.getsize(dst)
    total += size
    print(f'{name:12} {img.size[0]}x{img.size[1]} → {out.size[0]}x{out.size[1]}  {size/1024:5.0f} КБ')

print(f'\nГотово: {len(glob.glob(os.path.join(DST_DIR, "*.jpg")))} файлов, {total/1024/1024:.2f} МБ в {DST_DIR}/')
