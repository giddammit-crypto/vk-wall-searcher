#!/usr/bin/env python3
"""
AURORA Cosmo Mascot Sticker Generator (Standard 512x512 RGBA for VK & Messengers)
Generates and refines all 17 emotional stickers of robot Cosmo:
  1. robot_smile     (улыбка, класс)
  2. robot_wink      (подмигивание)
  3. robot_idea      (эврика, лампочка)
  4. robot_read      (читает книгу)
  5. robot_laugh     (заливистый смех)
  6. robot_love      (сердечко, любовь)
  7. robot_cool      (в очках, стиль)
  8. robot_party     (праздник, конфетти)
  9. robot_waving    (машет лапкой, привет)
  10. robot_thinking (задумался, детектив)
  11. robot_shock    (шок, удивление)
  12. robot_sad      (грусть, слезинка)
  13. robot_tired    (устал)
  14. robot_yawn     (зевает)
  15. robot_sleep    (спит, zzz)
  16. robot_angry    (строгий, стоп)
  17. robot_idle     (спокойный, готов к работе)

Outputs:
  - assets/images/mascot/*.png    (512x512 RGBA, pure alpha, 28px padding)
  - assets/images/mascot_vk/*.png (512x512 RGBA, pure alpha, 28px padding)
  - assets/cosmo_stickers_512.zip (Full collection for VK Community / Telegram)
"""

import os, math, zipfile
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "cache", "mascot_backup_400")
MASCOT_DIR = os.path.join(BASE_DIR, "assets", "images", "mascot")
MASCOT_VK_DIR = os.path.join(BASE_DIR, "assets", "images", "mascot_vk")
ZIP_PATH = os.path.join(BASE_DIR, "assets", "cosmo_stickers_512.zip")

os.makedirs(MASCOT_DIR, exist_ok=True)
os.makedirs(MASCOT_VK_DIR, exist_ok=True)

# Color Palette
VISOR_COLOR = (54, 54, 54, 255)
GOLD_EYE = (255, 204, 0, 255)
GOLD_EYE_LIGHT = (255, 225, 70, 255)
BLUSH_PINK = (255, 140, 160, 240)
MOUTH_RED = (250, 93, 89, 255)
MOUTH_DARK = (140, 30, 35, 255)
TONGUE_PINK = (255, 175, 185, 255)
OUTLINE_DARK = (45, 48, 52, 255)
EMERALD_GREEN = (0, 178, 128, 255)
EMERALD_DARK = (0, 130, 95, 255)
EMERALD_LIGHT = (52, 211, 153, 255)
WHITE_HELMET = (255, 252, 247, 255)
TEAR_BLUE = (56, 189, 248, 255)
HEART_RED = (244, 63, 94, 255)
GOLD_ACCENT = (251, 191, 36, 255)

TARGET_SIZE = 512
PADDING = 28
CONTENT_MAX = TARGET_SIZE - 2 * PADDING  # 456 px

def get_backup_img(name):
    p = os.path.join(BACKUP_DIR, name)
    if not os.path.exists(p):
        p = os.path.join(MASCOT_DIR, name)
    return Image.open(p).convert("RGBA")

def get_base_clean_visor(base_name="robot_idle.png", scale_size=(800, 800)):
    """Loads base image at 800x800 and cleans visor interior smoothly."""
    im = get_backup_img(base_name)
    im_800 = im.resize(scale_size, Image.Resampling.LANCZOS)
    d = ImageDraw.Draw(im_800)
    if base_name == "robot_idle.png":
        d.rounded_rectangle([268, 286, 532, 442], radius=32, fill=VISOR_COLOR)
    else:  # robot_smile.png
        d.rounded_rectangle([285, 280, 555, 440], radius=32, fill=VISOR_COLOR)
    return im_800

def draw_heart(d, cx, cy, size=34, fill=HEART_RED):
    """Draws a smooth mathematical heart centered at (cx, cy)."""
    s = size / 16.0
    pts = []
    for t in np.linspace(0, 2 * math.pi, 80):
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * s, cy + y * s))
    d.polygon(pts, fill=fill)

def draw_stylized_z(d, cx, cy, size, col=TEAR_BLUE):
    """Draws a thick stylized 'Z' letter with outline."""
    s = size / 20.0
    pts = [
        (cx - 10 * s, cy - 12 * s),
        (cx + 10 * s, cy - 12 * s),
        (cx - 6 * s, cy + 8 * s),
        (cx + 10 * s, cy + 8 * s),
        (cx + 10 * s, cy + 12 * s),
        (cx - 10 * s, cy + 12 * s),
        (cx + 6 * s, cy - 8 * s),
        (cx - 10 * s, cy - 8 * s)
    ]
    d.polygon(pts, fill=col, outline=OUTLINE_DARK, width=max(2, int(3 * s)))

def finalize_sticker(raw_img, sharpen=True):
    """
    Crops content to exact alpha bounding box, scales proportionally
    so maximum dimension is CONTENT_MAX (456px), and places centered
    onto a pristine transparent 512x512 RGBA canvas.
    Ensures padding is >= 24px and <= 32px (exact 28px on primary axis).
    """
    bbox = raw_img.getbbox()
    if not bbox:
        raise ValueError("Empty image passed to finalize_sticker!")
    cropped = raw_img.crop(bbox)
    
    # Calculate proportional scale
    cw, ch = cropped.size
    scale = CONTENT_MAX / max(cw, ch)
    nw = int(round(cw * scale))
    nh = int(round(ch * scale))
    
    scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    
    if sharpen:
        r, g, b, a = scaled.split()
        rgb = Image.merge("RGB", (r, g, b))
        sharp_rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=1))
        scaled = Image.merge("RGBA", (*sharp_rgb.split(), a))
    
    # Create pure 512x512 RGBA transparent canvas
    canvas = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    pos_x = (TARGET_SIZE - nw) // 2
    pos_y = (TARGET_SIZE - nh) // 2
    canvas.paste(scaled, (pos_x, pos_y), scaled)
    
    # Ensure all outer margin pixels are 100% transparent (alpha=0)
    # Check borders
    arr = np.array(canvas)
    # Zero out any subpixel leakage outside the content bounding box
    cb = canvas.getbbox()
    mask = np.zeros((TARGET_SIZE, TARGET_SIZE), dtype=bool)
    mask[cb[1]:cb[3], cb[0]:cb[2]] = True
    arr[~mask] = [0, 0, 0, 0]
    
    clean_canvas = Image.fromarray(arr, "RGBA")
    return clean_canvas

def save_and_store(name, img_512):
    p_mascot = os.path.join(MASCOT_DIR, f"{name}.png")
    p_mascot_vk = os.path.join(MASCOT_VK_DIR, f"{name}.png")
    
    img_512.save(p_mascot, "PNG", optimize=True)
    img_512.save(p_mascot_vk, "PNG", optimize=True)
    
    # Validate
    cb = img_512.getbbox()
    pads = (cb[0], cb[1], TARGET_SIZE - cb[2], TARGET_SIZE - cb[3])
    min_pad = min(pads)
    print(f"✓ {name:18}: 512x512 RGBA | bbox={cb} | pads=(L{pads[0]}, T{pads[1]}, R{pads[2]}, B{pads[3]}) | min_pad={min_pad}px")

def generate_stickers():
    print("=== Generating All 17 Cosmo Mascot Stickers (512x512 Standard) ===\n")
    
    # -------------------------------------------------------------
    # 1. SMILE (Улыбка, класс, палец вверх)
    # -------------------------------------------------------------
    base_smile = get_backup_img("robot_smile.png")
    st_smile = finalize_sticker(base_smile, sharpen=True)
    save_and_store("robot_smile", st_smile)

    # -------------------------------------------------------------
    # 2. WINK (Хитрое подмигивание с лукавой улыбкой)
    # -------------------------------------------------------------
    wink = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(wink)
    d.ellipse([318, 332, 358, 372], fill=GOLD_EYE)
    d.ellipse([326, 340, 336, 350], fill=(255, 255, 255, 255))
    d.line([(444, 352), (464, 336), (484, 352)], fill=GOLD_EYE, width=10)
    d.arc([380, 380, 428, 412], start=0, end=170, fill=MOUTH_RED, width=6)
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    st_wink = finalize_sticker(wink, sharpen=True)
    save_and_store("robot_wink", st_wink)

    # -------------------------------------------------------------
    # 3. IDEA (Осенила идея! Яркая светящаяся лампочка, лучи)
    # -------------------------------------------------------------
    idea = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(idea)
    d.ellipse([314, 326, 358, 374], fill=GOLD_EYE)
    d.ellipse([442, 326, 486, 374], fill=GOLD_EYE)
    d.ellipse([328, 336, 344, 352], fill=(255, 255, 255, 255))
    d.ellipse([456, 336, 472, 352], fill=(255, 255, 255, 255))
    d.pieslice([376, 382, 424, 422], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    
    # Glowing Lightbulb directly above antenna
    lx, ly = 400, 104
    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        r1, r2 = 60, 88
        d.line([(lx + r1 * math.cos(rad), ly + r1 * math.sin(rad)),
                (lx + r2 * math.cos(rad), ly + r2 * math.sin(rad))], fill=GOLD_ACCENT, width=6)
    d.ellipse([lx - 36, ly - 44, lx + 36, ly + 28], fill=(254, 240, 138, 255), outline=OUTLINE_DARK, width=4)
    d.polygon([(lx - 22, ly + 12), (lx + 22, ly + 12), (lx + 14, ly + 36), (lx - 14, ly + 36)], fill=(254, 240, 138, 255), outline=OUTLINE_DARK, width=4)
    d.arc([lx - 16, ly - 20, lx + 16, ly + 4], start=180, end=360, fill=(245, 158, 11, 255), width=4)
    d.rectangle([lx - 14, ly + 36, lx + 14, ly + 48], fill=(156, 163, 175, 255), outline=OUTLINE_DARK, width=4)
    d.line([(lx - 10, ly + 42), (lx + 10, ly + 42)], fill=(107, 114, 128, 255), width=2)
    st_idea = finalize_sticker(idea, sharpen=True)
    save_and_store("robot_idea", st_idea)

    # -------------------------------------------------------------
    # 4. READ (Читает раскрытую книгу с шелковой закладкой)
    # -------------------------------------------------------------
    read = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(read)
    d.ellipse([320, 356, 356, 380], fill=GOLD_EYE)
    d.ellipse([444, 356, 480, 380], fill=GOLD_EYE)
    d.ellipse([330, 362, 338, 370], fill=(255, 255, 255, 240))
    d.ellipse([454, 362, 462, 370], fill=(255, 255, 255, 240))
    d.arc([384, 390, 416, 410], start=0, end=180, fill=MOUTH_RED, width=6)
    d.ellipse([288, 370, 312, 386], fill=BLUSH_PINK)
    d.ellipse([488, 370, 512, 386], fill=BLUSH_PINK)
    
    bx, by = 240, 480
    bw, bh = 320, 160
    d.polygon([(bx - 12, by + 20), (bx + 156, by + 36), (bx + 156, by + bh + 24), (bx - 12, by + bh)], fill=EMERALD_DARK, outline=OUTLINE_DARK, width=4)
    d.polygon([(bx + 332, by + 20), (bx + 164, by + 36), (bx + 164, by + bh + 24), (bx + 332, by + bh)], fill=EMERALD_DARK, outline=OUTLINE_DARK, width=4)
    d.polygon([(bx, by + 24), (bx + 156, by + 40), (bx + 156, by + bh + 12), (bx, by + bh - 4)], fill=(255, 252, 242, 255), outline=OUTLINE_DARK, width=3)
    d.polygon([(bx + 320, by + 24), (bx + 164, by + 40), (bx + 164, by + bh + 12), (bx + 320, by + bh - 4)], fill=(255, 252, 242, 255), outline=OUTLINE_DARK, width=3)
    d.polygon([(bx + 154, by + 36), (bx + 166, by + 36), (bx + 166, by + bh + 52), (bx + 160, by + bh + 44), (bx + 154, by + bh + 52)], fill=GOLD_ACCENT, outline=OUTLINE_DARK, width=3)
    for ly_line in [60, 80, 100, 120]:
        d.line([(bx + 28, by + ly_line), (bx + 132, by + ly_line + 8)], fill=(160, 165, 175, 220), width=4)
        d.line([(bx + 188, by + ly_line + 8), (bx + 292, by + ly_line)], fill=(160, 165, 175, 220), width=4)
    d.ellipse([bx - 8, by + 84, bx + 28, by + 124], fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    d.ellipse([bx + 292, by + 84, bx + 328, by + 124], fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    st_read = finalize_sticker(read, sharpen=True)
    save_and_store("robot_read", st_read)

    # -------------------------------------------------------------
    # 5. LAUGH (Заливистый смех, хохот)
    # -------------------------------------------------------------
    laugh = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(laugh)
    d.line([(336, 356), (360, 336), (384, 356)], fill=GOLD_EYE, width=10)
    d.line([(456, 344), (480, 324), (504, 344)], fill=GOLD_EYE, width=10)
    d.pieslice([384, 370, 448, 424], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.pieslice([394, 392, 438, 424], start=0, end=180, fill=TONGUE_PINK)
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    st_laugh = finalize_sticker(laugh, sharpen=True)
    save_and_store("robot_laugh", st_laugh)

    # -------------------------------------------------------------
    # 6. LOVE (Рубиновые сердечки, нежность, румянец)
    # -------------------------------------------------------------
    love = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(love)
    draw_heart(d, 338, 350, size=34, fill=(255, 60, 110, 255))
    draw_heart(d, 462, 350, size=34, fill=(255, 60, 110, 255))
    d.ellipse([328, 334, 336, 342], fill=(255, 255, 255, 240))
    d.ellipse([452, 334, 460, 342], fill=(255, 255, 255, 240))
    d.arc([380, 384, 420, 412], start=0, end=180, fill=MOUTH_RED, width=6)
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    st_love = finalize_sticker(love, sharpen=True)
    save_and_store("robot_love", st_love)

    # -------------------------------------------------------------
    # 7. COOL (Стильные очки с золотой оправой и бликами)
    # -------------------------------------------------------------
    cool = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(cool)
    d.arc([384, 390, 430, 416], start=340, end=170, fill=MOUTH_RED, width=6)
    d.ellipse([284, 376, 312, 392], fill=BLUSH_PINK)
    d.ellipse([488, 376, 516, 392], fill=BLUSH_PINK)
    d.polygon([(300, 320), (380, 320), (368, 372), (308, 372)], fill=(20, 24, 32, 255), outline=GOLD_ACCENT, width=6)
    d.polygon([(420, 320), (500, 320), (492, 372), (432, 372)], fill=(20, 24, 32, 255), outline=GOLD_ACCENT, width=6)
    d.line([(376, 326), (424, 326)], fill=GOLD_ACCENT, width=8)
    d.line([(312, 360), (348, 328)], fill=(255, 255, 255, 220), width=6)
    d.line([(332, 364), (360, 340)], fill=(255, 255, 255, 150), width=4)
    d.line([(432, 360), (468, 328)], fill=(255, 255, 255, 220), width=6)
    d.line([(452, 364), (480, 340)], fill=(255, 255, 255, 150), width=4)
    st_cool = finalize_sticker(cool, sharpen=True)
    save_and_store("robot_cool", st_cool)

    # -------------------------------------------------------------
    # 8. PARTY (Праздничный колпак, разноцветное конфетти)
    # -------------------------------------------------------------
    party = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(party)
    d.ellipse([340, 332, 380, 372], fill=GOLD_EYE)
    d.ellipse([348, 340, 358, 350], fill=(255, 255, 255, 255))
    d.line([(460, 340), (484, 320), (508, 340)], fill=GOLD_EYE, width=10)
    d.pieslice([392, 372, 452, 424], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.pieslice([402, 394, 442, 424], start=0, end=180, fill=TONGUE_PINK)
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    
    # Striped Cone Hat on antenna
    hat_pts = [(330, 60), (280, 200), (390, 180)]
    d.polygon(hat_pts, fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    d.polygon([(310, 110), (300, 140), (370, 130), (360, 100)], fill=GOLD_ACCENT)
    d.polygon([(290, 164), (284, 196), (386, 180), (376, 152)], fill=HEART_RED)
    d.ellipse([314, 40, 346, 72], fill=GOLD_ACCENT, outline=OUTLINE_DARK, width=4)
    
    # Confetti positioned within safe halo
    confetti_colors = [HEART_RED, GOLD_ACCENT, TEAR_BLUE, EMERALD_GREEN, (168, 85, 247, 255)]
    np.random.seed(2026)
    confetti_coords = [
        (160, 180), (220, 120), (200, 240), (140, 320), (180, 420), (160, 520),
        (580, 160), (620, 240), (660, 320), (640, 420), (600, 520),
        (240, 640), (340, 660), (460, 660), (560, 640),
        (480, 120), (540, 100), (280, 80), (440, 80)
    ]
    for idx, (cx, cy) in enumerate(confetti_coords):
        col = confetti_colors[idx % len(confetti_colors)]
        cr = 8 if idx % 2 == 0 else 11
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=col)
    st_party = finalize_sticker(party, sharpen=True)
    save_and_store("robot_party", st_party)

    # -------------------------------------------------------------
    # 9. WAVING (Приветствие читателей: поднятая лапка машет)
    # -------------------------------------------------------------
    waving = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(waving)
    d.ellipse([338, 332, 378, 372], fill=GOLD_EYE)
    d.ellipse([462, 320, 502, 360], fill=GOLD_EYE)
    d.ellipse([346, 340, 356, 350], fill=(255, 255, 255, 255))
    d.ellipse([470, 328, 480, 338], fill=(255, 255, 255, 255))
    d.arc([396, 380, 444, 412], start=0, end=180, fill=MOUTH_RED, width=6)
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    
    hx, hy = 600, 430
    d.arc([hx - 20, hy - 60, hx + 40, hy + 20], start=280, end=80, fill=(75, 85, 99, 240), width=6)
    d.arc([hx, hy - 80, hx + 64, hy + 40], start=280, end=80, fill=(75, 85, 99, 180), width=6)
    st_waving = finalize_sticker(waving, sharpen=True)
    save_and_store("robot_waving", st_waving)

    # -------------------------------------------------------------
    # 10. THINKING (Задумался, детектив, рука у подбородка)
    # -------------------------------------------------------------
    base_thinking = get_backup_img("robot_thinking.png")
    st_thinking = finalize_sticker(base_thinking, sharpen=True)
    save_and_store("robot_thinking", st_thinking)

    # -------------------------------------------------------------
    # 11. SHOCK (Шок, удивление, расширенные глаза, рот "О")
    # -------------------------------------------------------------
    shock = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(shock)
    d.ellipse([312, 320, 364, 372], fill=GOLD_EYE, outline=OUTLINE_DARK, width=4)
    d.ellipse([436, 320, 488, 372], fill=GOLD_EYE, outline=OUTLINE_DARK, width=4)
    d.ellipse([332, 340, 344, 352], fill=VISOR_COLOR)
    d.ellipse([456, 340, 468, 352], fill=VISOR_COLOR)
    d.ellipse([384, 384, 416, 424], fill=MOUTH_DARK, outline=OUTLINE_DARK, width=4)
    d.line([(288, 310), (288, 350)], fill=TEAR_BLUE, width=4)
    d.line([(298, 304), (298, 356)], fill=TEAR_BLUE, width=4)
    d.line([(502, 304), (502, 356)], fill=TEAR_BLUE, width=4)
    d.line([(512, 310), (512, 350)], fill=TEAR_BLUE, width=4)
    st_shock = finalize_sticker(shock, sharpen=True)
    save_and_store("robot_shock", st_shock)

    # -------------------------------------------------------------
    # 12. SAD (Грусть, слезинка, опущенные глазки)
    # -------------------------------------------------------------
    sad = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(sad)
    d.arc([316, 344, 360, 380], start=180, end=360, fill=GOLD_EYE, width=8)
    d.arc([440, 344, 484, 380], start=180, end=360, fill=GOLD_EYE, width=8)
    d.arc([384, 396, 416, 416], start=180, end=360, fill=MOUTH_RED, width=6)
    tx, ty = 492, 384
    d.polygon([(tx, ty - 12), (tx + 10, ty + 6), (tx, ty + 14), (tx - 10, ty + 6)], fill=TEAR_BLUE)
    d.ellipse([tx - 8, ty, tx + 8, ty + 14], fill=TEAR_BLUE)
    d.ellipse([tx - 4, ty + 2, tx, ty + 6], fill=(255, 255, 255, 240))
    st_sad = finalize_sticker(sad, sharpen=True)
    save_and_store("robot_sad", st_sad)

    # -------------------------------------------------------------
    # 13. TIRED (Устал, сонные полуприкрытые веки)
    # -------------------------------------------------------------
    base_tired = get_backup_img("robot_tired.png")
    st_tired = finalize_sticker(base_tired, sharpen=True)
    save_and_store("robot_tired", st_tired)

    # -------------------------------------------------------------
    # 14. YAWN (Зевает, открытый зевающий рот)
    # -------------------------------------------------------------
    base_yawn = get_backup_img("robot_yawn.png")
    st_yawn = finalize_sticker(base_yawn, sharpen=True)
    save_and_store("robot_yawn", st_yawn)

    # -------------------------------------------------------------
    # 15. SLEEP (Спит, zzz, наклоненная голова, парящие Zzz)
    # -------------------------------------------------------------
    base_sleep = get_backup_img("robot_sleep.png")
    # Upscale sleep base to 800x800 for pristine vector Zzz addition
    sleep_800 = base_sleep.resize((800, 800), Image.Resampling.LANCZOS)
    d_sleep = ImageDraw.Draw(sleep_800)
    # Draw floating Zzz above head to the right
    draw_stylized_z(d_sleep, 560, 210, size=24, col=TEAR_BLUE)
    draw_stylized_z(d_sleep, 610, 150, size=32, col=TEAR_BLUE)
    draw_stylized_z(d_sleep, 670, 80, size=44, col=GOLD_ACCENT)
    st_sleep = finalize_sticker(sleep_800, sharpen=True)
    save_and_store("robot_sleep", st_sleep)

    # -------------------------------------------------------------
    # 16. ANGRY (Строгий, стоп, сердитый нахмуренный взгляд)
    # -------------------------------------------------------------
    base_angry = get_backup_img("robot_angry.png")
    st_angry = finalize_sticker(base_angry, sharpen=True)
    save_and_store("robot_angry", st_angry)

    # -------------------------------------------------------------
    # 17. IDLE (Спокойный, готов к работе, эталонный маскот)
    # -------------------------------------------------------------
    base_idle = get_backup_img("robot_idle.png")
    st_idle = finalize_sticker(base_idle, sharpen=True)
    save_and_store("robot_idle", st_idle)

    # -------------------------------------------------------------
    # Pack into ZIP archive assets/cosmo_stickers_512.zip
    # -------------------------------------------------------------
    print("\n=== Packaging All 17 Stickers into ZIP ===")
    emotions_order = [
        ("01_smile", "robot_smile.png"),
        ("02_wink", "robot_wink.png"),
        ("03_idea", "robot_idea.png"),
        ("04_read", "robot_read.png"),
        ("05_laugh", "robot_laugh.png"),
        ("06_love", "robot_love.png"),
        ("07_cool", "robot_cool.png"),
        ("08_party", "robot_party.png"),
        ("09_waving", "robot_waving.png"),
        ("10_thinking", "robot_thinking.png"),
        ("11_shock", "robot_shock.png"),
        ("12_sad", "robot_sad.png"),
        ("13_tired", "robot_tired.png"),
        ("14_yawn", "robot_yawn.png"),
        ("15_sleep", "robot_sleep.png"),
        ("16_angry", "robot_angry.png"),
        ("17_idle", "robot_idle.png")
    ]
    
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for num_name, orig_filename in emotions_order:
            src = os.path.join(MASCOT_DIR, orig_filename)
            # Store with both friendly numbered name and system name inside zip
            zipf.write(src, arcname=f"{num_name}.png")
            zipf.write(src, arcname=f"stickers_512/{orig_filename}")
    
    zip_size = os.path.getsize(ZIP_PATH)
    print(f"✓ ZIP Archive created: {ZIP_PATH} ({zip_size / 1024:.1f} KB, 17 stickers included)")

if __name__ == "__main__":
    generate_stickers()
