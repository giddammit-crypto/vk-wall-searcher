#!/usr/bin/env python3
"""
Generate 10 new high-quality emotion stickers for robot Cosmo with Supersampling Anti-Aliasing.
Preserves exact mascot style, color palette, thick outlines, and RGBA transparency.
Outputs:
  1) assets/images/mascot/robot_{name}.png (400x400)
  2) assets/images/mascot_vk/robot_{name}.png (200x200)
"""

import os, math
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASCOT_DIR = os.path.join(BASE_DIR, "assets", "images", "mascot")
MASCOT_VK_DIR = os.path.join(BASE_DIR, "assets", "images", "mascot_vk")

os.makedirs(MASCOT_DIR, exist_ok=True)
os.makedirs(MASCOT_VK_DIR, exist_ok=True)

# Color constants
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

def get_base_clean_visor(base_name="robot_idle.png"):
    """
    Loads base mascot image at 800x800, cleans the inner visor surface smoothly,
    preserving the helmet, green bezel, and outer contour.
    """
    p = os.path.join(MASCOT_DIR, base_name)
    im = Image.open(p).convert("RGBA")
    # Upscale to 800x800 for high-precision vector drawing
    im_800 = im.resize((800, 800), Image.Resampling.LANCZOS)
    
    # In 800x800 coordinates:
    # Clear eyes/mouth with smooth curved polygon that fits well within the visor
    d = ImageDraw.Draw(im_800)
    if base_name == "robot_idle.png":
        # Symmetrical visor interior (roughly x: 270..530, y: 290..440)
        d.rounded_rectangle([268, 286, 532, 442], radius=32, fill=VISOR_COLOR)
    else: # robot_smile.png (tilted)
        # Visor interior tilted slightly right
        d.rounded_rectangle([285, 280, 555, 440], radius=32, fill=VISOR_COLOR)
    return im_800

def draw_heart(d, cx, cy, size=34, fill=HEART_RED):
    """Draws a smooth heart shape centered at (cx, cy) at 800x800."""
    s = size / 16.0
    pts = []
    for t in np.linspace(0, 2*math.pi, 80):
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        pts.append((cx + x * s, cy + y * s))
    d.polygon(pts, fill=fill)

def save_sticker(img_800, name):
    """Downscales from 800x800 to 400x400 and 200x200 with Lanczos SSAA."""
    img_400 = img_800.resize((400, 400), Image.Resampling.LANCZOS)
    p_400 = os.path.join(MASCOT_DIR, f"robot_{name}.png")
    img_400.save(p_400, "PNG")
    
    img_200 = img_800.resize((200, 200), Image.Resampling.LANCZOS)
    p_200 = os.path.join(MASCOT_VK_DIR, f"robot_{name}.png")
    img_200.save(p_200, "PNG")
    print(f"✓ Generated robot_{name}.png (400x400 & 200x200 SSAA)")

def generate_all():
    # -------------------------------------------------------------
    # 1. LOVE (Космо влюблён, рубиновые сердечки, нежный румянец)
    # -------------------------------------------------------------
    love = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(love)
    # Left and right glowing ruby heart eyes
    draw_heart(d, 338, 350, size=34, fill=(255, 60, 110, 255))
    draw_heart(d, 462, 350, size=34, fill=(255, 60, 110, 255))
    # Specular white dots on hearts
    d.ellipse([328, 334, 336, 342], fill=(255, 255, 255, 240))
    d.ellipse([452, 334, 460, 342], fill=(255, 255, 255, 240))
    # Sweet gentle smile
    d.arc([380, 384, 420, 412], start=0, end=180, fill=MOUTH_RED, width=6)
    # Rosy blush
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    save_sticker(love, "love")

    # -------------------------------------------------------------
    # 2. LAUGH (Заливистый хохот для команды !хохма)
    # -------------------------------------------------------------
    laugh = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(laugh)
    # Left eye: laughing arc ^
    d.line([(336, 356), (360, 336), (384, 356)], fill=GOLD_EYE, width=10)
    # Right eye: laughing arc ^
    d.line([(456, 344), (480, 324), (504, 344)], fill=GOLD_EYE, width=10)
    # Wide open laughing mouth
    d.pieslice([384, 370, 448, 424], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.pieslice([394, 392, 438, 424], start=0, end=180, fill=TONGUE_PINK)
    # Rosy laughing blush
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    save_sticker(laugh, "laugh")

    # -------------------------------------------------------------
    # 3. READ (Космо читает открытую книгу с закладкой)
    # -------------------------------------------------------------
    read = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(read)
    # Eyes looking downward at the book
    d.ellipse([320, 356, 356, 380], fill=GOLD_EYE)
    d.ellipse([444, 356, 480, 380], fill=GOLD_EYE)
    d.ellipse([330, 362, 338, 370], fill=(255, 255, 255, 240))
    d.ellipse([454, 362, 462, 370], fill=(255, 255, 255, 240))
    # Content smile
    d.arc([384, 390, 416, 410], start=0, end=180, fill=MOUTH_RED, width=6)
    d.ellipse([288, 370, 312, 386], fill=BLUSH_PINK)
    d.ellipse([488, 370, 512, 386], fill=BLUSH_PINK)
    
    # Large detailed open book in front of chest (800x800)
    bx, by = 240, 480
    bw, bh = 320, 160
    # Emerald book cover
    d.polygon([(bx-12, by+20), (bx+156, by+36), (bx+156, by+bh+24), (bx-12, by+bh)], fill=EMERALD_DARK, outline=OUTLINE_DARK, width=4)
    d.polygon([(bx+332, by+20), (bx+164, by+36), (bx+164, by+bh+24), (bx+332, by+bh)], fill=EMERALD_DARK, outline=OUTLINE_DARK, width=4)
    # Left page (creamy ivory)
    d.polygon([(bx, by+24), (bx+156, by+40), (bx+156, by+bh+12), (bx, by+bh-4)], fill=(255, 252, 242, 255), outline=OUTLINE_DARK, width=3)
    # Right page (creamy ivory)
    d.polygon([(bx+320, by+24), (bx+164, by+40), (bx+164, by+bh+12), (bx+320, by+bh-4)], fill=(255, 252, 242, 255), outline=OUTLINE_DARK, width=3)
    # Golden silk ribbon bookmark
    d.polygon([(bx+154, by+36), (bx+166, by+36), (bx+166, by+bh+52), (bx+160, by+bh+44), (bx+154, by+bh+52)], fill=GOLD_ACCENT, outline=OUTLINE_DARK, width=3)
    # Text lines on book
    for ly in [60, 80, 100, 120]:
        d.line([(bx+28, by+ly), (bx+132, by+ly+8)], fill=(160, 165, 175, 220), width=4)
        d.line([(bx+188, by+ly+8), (bx+292, by+ly)], fill=(160, 165, 175, 220), width=4)
    # Cute green mitten paws holding book edges
    d.ellipse([bx-8, by+84, bx+28, by+124], fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    d.ellipse([bx+292, by+84, bx+328, by+124], fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    save_sticker(read, "read")

    # -------------------------------------------------------------
    # 4. IDEA (Осенила идея! Яркая лампочка над антенной, лучики)
    # -------------------------------------------------------------
    idea = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(idea)
    # Wide inspired glowing eyes with star highlights
    d.ellipse([314, 326, 358, 374], fill=GOLD_EYE)
    d.ellipse([442, 326, 486, 374], fill=GOLD_EYE)
    d.ellipse([328, 336, 344, 352], fill=(255, 255, 255, 255))
    d.ellipse([456, 336, 472, 352], fill=(255, 255, 255, 255))
    # Joyful "D" smile
    d.pieslice([376, 382, 424, 422], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    
    # Glowing Lightbulb over head center
    lx, ly = 400, 104
    # Golden light rays
    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        r1, r2 = 60, 88
        d.line([(lx + r1 * math.cos(rad), ly + r1 * math.sin(rad)),
                (lx + r2 * math.cos(rad), ly + r2 * math.sin(rad))], fill=GOLD_ACCENT, width=6)
    # Bulb glass
    d.ellipse([lx-36, ly-44, lx+36, ly+28], fill=(254, 240, 138, 255), outline=OUTLINE_DARK, width=4)
    d.polygon([(lx-22, ly+12), (lx+22, ly+12), (lx+14, ly+36), (lx-14, ly+36)], fill=(254, 240, 138, 255), outline=OUTLINE_DARK, width=4)
    # Glowing filament
    d.arc([lx-16, ly-20, lx+16, ly+4], start=180, end=360, fill=(245, 158, 11, 255), width=4)
    # Metal base
    d.rectangle([lx-14, ly+36, lx+14, ly+48], fill=(156, 163, 175, 255), outline=OUTLINE_DARK, width=4)
    d.line([(lx-10, ly+42), (lx+10, ly+42)], fill=(107, 114, 128, 255), width=2)
    save_sticker(idea, "idea")

    # -------------------------------------------------------------
    # 5. SHOCK (Космо ошеломлён / удивлён: круглые глаза, рот "О")
    # -------------------------------------------------------------
    shock = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(shock)
    # Huge wide circular glowing eyes
    d.ellipse([312, 320, 364, 372], fill=GOLD_EYE, outline=OUTLINE_DARK, width=4)
    d.ellipse([436, 320, 488, 372], fill=GOLD_EYE, outline=OUTLINE_DARK, width=4)
    # Small dilated pupils
    d.ellipse([332, 340, 344, 352], fill=VISOR_COLOR)
    d.ellipse([456, 340, 468, 352], fill=VISOR_COLOR)
    # Shock mouth "O"
    d.ellipse([384, 384, 416, 424], fill=MOUTH_DARK, outline=OUTLINE_DARK, width=4)
    # Blue shock sweat lines on visor
    d.line([(288, 310), (288, 350)], fill=TEAR_BLUE, width=4)
    d.line([(298, 304), (298, 356)], fill=TEAR_BLUE, width=4)
    d.line([(502, 304), (502, 356)], fill=TEAR_BLUE, width=4)
    d.line([(512, 310), (512, 350)], fill=TEAR_BLUE, width=4)
    save_sticker(shock, "shock")

    # -------------------------------------------------------------
    # 6. COOL (Космо в крутых тёмных очках с золотой оправой)
    # -------------------------------------------------------------
    cool = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(cool)
    # Smug confident smirk
    d.arc([384, 390, 430, 416], start=340, end=170, fill=MOUTH_RED, width=6)
    d.ellipse([284, 376, 312, 392], fill=BLUSH_PINK)
    d.ellipse([488, 376, 516, 392], fill=BLUSH_PINK)
    
    # Stylish sunglasses with gold rim
    # Left lens
    d.polygon([(300, 320), (380, 320), (368, 372), (308, 372)], fill=(20, 24, 32, 255), outline=GOLD_ACCENT, width=6)
    # Right lens
    d.polygon([(420, 320), (500, 320), (492, 372), (432, 372)], fill=(20, 24, 32, 255), outline=GOLD_ACCENT, width=6)
    # Gold bridge
    d.line([(376, 326), (424, 326)], fill=GOLD_ACCENT, width=8)
    # Diagonal white gloss reflection
    d.line([(312, 360), (348, 328)], fill=(255, 255, 255, 220), width=6)
    d.line([(332, 364), (360, 340)], fill=(255, 255, 255, 150), width=4)
    d.line([(432, 360), (468, 328)], fill=(255, 255, 255, 220), width=6)
    d.line([(452, 364), (480, 340)], fill=(255, 255, 255, 150), width=4)
    save_sticker(cool, "cool")

    # -------------------------------------------------------------
    # 7. SAD (Грустный Космо, опущенные глазки, неоновая слезинка)
    # -------------------------------------------------------------
    sad = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(sad)
    # Sad droopy curved eyes
    d.arc([316, 344, 360, 380], start=180, end=360, fill=GOLD_EYE, width=8)
    d.arc([440, 344, 484, 380], start=180, end=360, fill=GOLD_EYE, width=8)
    # Sad downturned mouth
    d.arc([384, 396, 416, 416], start=180, end=360, fill=MOUTH_RED, width=6)
    # Glistening bright teardrop on right cheek
    tx, ty = 492, 384
    d.polygon([(tx, ty-12), (tx+10, ty+6), (tx, ty+14), (tx-10, ty+6)], fill=TEAR_BLUE)
    d.ellipse([tx-8, ty, tx+8, ty+14], fill=TEAR_BLUE)
    d.ellipse([tx-4, ty+2, tx, ty+6], fill=(255, 255, 255, 240))
    save_sticker(sad, "sad")

    # -------------------------------------------------------------
    # 8. WAVING (Приветствие читателей: поднятая лапка машет)
    # -------------------------------------------------------------
    # Based on robot_smile (which already has raised right arm)
    waving = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(waving)
    # Joyful sparkling open eyes
    d.ellipse([338, 332, 378, 372], fill=GOLD_EYE)
    d.ellipse([462, 320, 502, 360], fill=GOLD_EYE)
    d.ellipse([346, 340, 356, 350], fill=(255, 255, 255, 255))
    d.ellipse([470, 328, 480, 338], fill=(255, 255, 255, 255))
    # Cheerful wide open smile
    d.arc([396, 380, 444, 412], start=0, end=180, fill=MOUTH_RED, width=6)
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    
    # In robot_smile, the thumbs-up hand is at (580, 430).
    # Draw waving motion arcs around that hand
    hx, hy = 600, 430
    d.arc([hx-20, hy-60, hx+40, hy+20], start=280, end=80, fill=(75, 85, 99, 240), width=6)
    d.arc([hx, hy-80, hx+64, hy+40], start=280, end=80, fill=(75, 85, 99, 180), width=6)
    save_sticker(waving, "waving")

    # -------------------------------------------------------------
    # 9. PARTY (Праздничный колпак, салют и конфетти)
    # -------------------------------------------------------------
    party = get_base_clean_visor("robot_smile.png")
    d = ImageDraw.Draw(party)
    # Winking party expression
    d.ellipse([340, 332, 380, 372], fill=GOLD_EYE) # open left eye
    d.ellipse([348, 340, 358, 350], fill=(255, 255, 255, 255))
    d.line([(460, 340), (484, 320), (508, 340)], fill=GOLD_EYE, width=10) # wink right
    # Triumphant open smile
    d.pieslice([392, 372, 452, 424], start=0, end=180, fill=MOUTH_RED, outline=OUTLINE_DARK, width=4)
    d.pieslice([402, 394, 442, 424], start=0, end=180, fill=TONGUE_PINK)
    d.ellipse([300, 364, 336, 388], fill=BLUSH_PINK)
    d.ellipse([500, 356, 536, 380], fill=BLUSH_PINK)
    
    # Striped cone party hat on the left antenna
    hat_pts = [(330, 60), (280, 200), (390, 180)]
    d.polygon(hat_pts, fill=EMERALD_GREEN, outline=OUTLINE_DARK, width=4)
    # Hat stripes
    d.polygon([(310, 110), (300, 140), (370, 130), (360, 100)], fill=GOLD_ACCENT)
    d.polygon([(290, 164), (284, 196), (386, 180), (376, 152)], fill=HEART_RED)
    # Fluffy golden pom-pom
    d.ellipse([314, 40, 346, 72], fill=GOLD_ACCENT, outline=OUTLINE_DARK, width=4)
    
    # Multi-color confetti
    confetti_colors = [HEART_RED, GOLD_ACCENT, TEAR_BLUE, EMERALD_GREEN, (168, 85, 247, 255)]
    np.random.seed(2026)
    for _ in range(30):
        cx = int(np.random.randint(60, 740))
        cy = int(np.random.randint(60, 740))
        # Keep clear of face visor center
        if 260 < cx < 540 and 260 < cy < 460:
            continue
        col = confetti_colors[np.random.randint(0, len(confetti_colors))]
        cr = int(np.random.randint(6, 12))
        d.ellipse([cx-cr, cy-cr, cx+cr, cy+cr], fill=col)
    save_sticker(party, "party")

    # -------------------------------------------------------------
    # 10. WINK (Хитрое подмигивание с лукавой улыбкой)
    # -------------------------------------------------------------
    wink = get_base_clean_visor("robot_idle.png")
    d = ImageDraw.Draw(wink)
    # Left eye: wide open bright yellow
    d.ellipse([318, 332, 358, 372], fill=GOLD_EYE)
    d.ellipse([326, 340, 336, 350], fill=(255, 255, 255, 255))
    # Right eye: winking happy arch >
    d.line([(444, 352), (464, 336), (484, 352)], fill=GOLD_EYE, width=10)
    # Playful crooked smirk
    d.arc([380, 380, 428, 412], start=0, end=170, fill=MOUTH_RED, width=6)
    d.ellipse([284, 370, 316, 390], fill=BLUSH_PINK)
    d.ellipse([484, 370, 516, 390], fill=BLUSH_PINK)
    save_sticker(wink, "wink")

    print("\nAll 10 SSAA refined stickers successfully generated!")

if __name__ == "__main__":
    generate_all()
