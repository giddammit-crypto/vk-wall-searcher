import os, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php"
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
VIDEO_DIR = os.path.join(ASSETS_DIR, "video")
MASCOT_DIR = os.path.join(ASSETS_DIR, "images", "mascot")
PIXAR_DIR = os.path.join(VIDEO_DIR, "pixar_assets")
os.makedirs(PIXAR_DIR, exist_ok=True)

FONT_ARIAL = os.path.join(ASSETS_DIR, "fonts", "arial.ttf")
FONT_SHOP = os.path.join(ASSETS_DIR, "fonts", "ShoptronicSP-Regular.ttf")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# -------------------------------------------------------------
# 1. GENERATE WARM CREAM PIXAR STUDIO BACKGROUNDS (WITH PARALLAX MARGINS)
# -------------------------------------------------------------
def generate_cream_background(w=2080, h=1240, scene_type="studio"):
    """
    Creates a warm, welcoming cream background with soft diffuse studio lighting,
    subtle floor bounce, and out-of-focus pastel books/elements for depth.
    """
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # Base vertical gradient: Ivory #FAF8F5 (top) to Warm Cream #F2EAE0 (bottom)
    top_col = np.array([252, 249, 244], dtype=np.float32)
    bot_col = np.array([241, 233, 222], dtype=np.float32)
    
    gradient = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        ratio = (y / (h - 1)) ** 1.15
        cur = (1.0 - ratio) * top_col + ratio * bot_col
        gradient[y, :] = cur.astype(np.uint8)
        
    img = Image.fromarray(gradient, "RGB").convert("RGBA")
    
    # Soft Radial Key Light from top-left (Simulating warm studio softbox at 4800K)
    light_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d_light = ImageDraw.Draw(light_layer)
    center_x, center_y = int(w * 0.35), int(h * 0.25)
    max_r = int(math.hypot(w, h) * 0.65)
    
    # Draw soft concentric rings for subtle glow
    for r in range(max_r, 0, -20):
        alpha = int(35 * (1.0 - r / max_r) ** 1.8)
        d_light.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=(255, 253, 248, alpha))
        
    light_layer = light_layer.filter(ImageFilter.GaussianBlur(radius=40))
    img = Image.alpha_composite(img, light_layer)
    
    # Draw subtle floating pastel shapes/books in distant background (DoF bokeh)
    dof_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d_dof = ImageDraw.Draw(dof_layer)
    
    np.random.seed(1337 if scene_type == "studio" else 4242)
    
    # Pastel palette: peach, mint, soft amber, lavender
    pastels = [
        (254, 215, 170, 75),  # Soft peach
        (167, 243, 208, 65),  # Soft mint
        (253, 230, 138, 70),  # Soft amber
        (233, 213, 255, 60),  # Soft lavender
        (186, 230, 253, 65)   # Soft sky
    ]
    
    for _ in range(12):
        bx = int(np.random.randint(60, w - 60))
        by = int(np.random.randint(60, h - 120))
        bw = int(np.random.randint(45, 90))
        bh = int(bw * 1.35)
        col = pastels[np.random.randint(0, len(pastels))]
        # Draw a floating rounded book shape
        d_dof.rounded_rectangle([bx, by, bx + bw, by + bh], radius=8, fill=col)
        # Spine accent
        d_dof.rectangle([bx, by, bx + 8, by + bh], fill=(col[0]-25, col[1]-25, col[2]-25, col[3]+20))
        # Bookmark ribbon sticking out
        d_dof.polygon([(bx + bw//2 - 4, by + bh), (bx + bw//2 + 4, by + bh), (bx + bw//2, by + bh + 14)], fill=(244, 63, 94, 90))

    # Apply heavy Depth of Field blur to background books
    dof_layer = dof_layer.filter(ImageFilter.GaussianBlur(radius=16))
    img = Image.alpha_composite(img, dof_layer)
    
    # Soft Studio Floor horizon shadow
    floor_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d_floor = ImageDraw.Draw(floor_layer)
    floor_y = int(h * 0.82)
    d_floor.ellipse([int(w * 0.1), floor_y, int(w * 0.9), h + 150], fill=(180, 165, 150, 45))
    floor_layer = floor_layer.filter(ImageFilter.GaussianBlur(radius=50))
    img = Image.alpha_composite(img, floor_layer)
    
    return img

# -------------------------------------------------------------
# 2. ENHANCE EXACT MASCOT SPRITES (COSMO) & GENERATE EMOTION VARIANTS
# -------------------------------------------------------------
def enhance_mascot_sprites():
    sprites = {}
    names = ["robot_idle", "robot_smile", "robot_thinking", "robot_sleep", "robot_angry", "robot_tired"]
    
    for name in names:
        p = os.path.join(MASCOT_DIR, f"{name}.png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            im_800 = im.resize((800, 800), Image.Resampling.LANCZOS)
            out_p = os.path.join(PIXAR_DIR, f"{name}_800.png")
            im_800.save(out_p)
            sprites[name] = im_800
            print(f"Generated enhanced mascot sprite: {name}_800.png")
            
    # Variant 1: Cosmo Dizzy (Gag 1: bumps into camera)
    if "robot_idle" in sprites:
        dizzy = sprites["robot_idle"].copy()
        d_dizzy = ImageDraw.Draw(dizzy)
        
        # Visor monitor coordinates in 800x800
        # Paint over existing eyes with visor dark slate
        d_dizzy.rounded_rectangle([290, 310, 510, 420], radius=16, fill=(38, 42, 48, 255))
        
        # Draw yellow glowing spiral eyes
        def draw_spiral(cx, cy, max_r=28):
            points = []
            for deg in range(0, 680, 15):
                rad = math.radians(deg)
                r = (deg / 680.0) * max_r
                x = cx + r * math.cos(rad)
                y = cy + r * math.sin(rad)
                points.append((x, y))
            d_dizzy.line(points, fill=(255, 210, 30, 255), width=5)
            
        draw_spiral(355, 360, max_r=26)
        draw_spiral(445, 360, max_r=26)
        
        # Add mouth open in funny wobble "o"
        d_dizzy.ellipse([392, 400, 412, 416], fill=(244, 63, 94, 255))
        
        # Save dizzy
        dizzy.save(os.path.join(PIXAR_DIR, "robot_dizzy_800.png"))
        sprites["robot_dizzy"] = dizzy
        print("Generated specialized robot_dizzy_800.png")

    # Variant 2: Cosmo with Professor Glasses (Gag 4: AI chat & presets)
    if "robot_thinking" in sprites:
        prof = sprites["robot_thinking"].copy()
        d_prof = ImageDraw.Draw(prof)
        
        gold = (251, 191, 36, 255)
        d_prof.ellipse([325, 325, 385, 385], outline=gold, width=5)
        d_prof.ellipse([415, 325, 475, 385], outline=gold, width=5)
        d_prof.line([(385, 352), (415, 352)], fill=gold, width=4)
        d_prof.line([(340, 340), (355, 330)], fill=(255, 255, 255, 200), width=3)
        d_prof.line([(430, 340), (445, 330)], fill=(255, 255, 255, 200), width=3)
        
        prof.save(os.path.join(PIXAR_DIR, "robot_glasses_800.png"))
        sprites["robot_glasses"] = prof
        print("Generated specialized robot_glasses_800.png")
        
    # Variant 3: Cosmo with Bookmark stuck to antenna (Gag 3: Promo QR)
    if "robot_idle" in sprites:
        bm = sprites["robot_idle"].copy()
        
        bm_strip = Image.new("RGBA", (70, 220), (0, 0, 0, 0))
        d_s = ImageDraw.Draw(bm_strip)
        d_s.rounded_rectangle([0, 0, 69, 219], radius=6, fill=(255, 255, 255, 255), outline=(16, 185, 129, 255), width=2)
        d_s.rectangle([12, 30, 58, 76], fill=(0, 0, 0, 255))
        d_s.rectangle([18, 36, 52, 70], fill=(255, 255, 255, 255))
        d_s.rectangle([24, 42, 46, 64], fill=(0, 0, 0, 255))
        
        f_b = get_font(FONT_ARIAL, 9)
        d_s.text((14, 90), "ЧИТАЙ", font=f_b, fill=(15, 23, 42, 255))
        d_s.text((14, 105), "ОНЛАЙН", font=f_b, fill=(16, 185, 129, 255))
        
        bm_rot = bm_strip.rotate(-28, resample=Image.Resampling.BICUBIC, expand=True)
        bm.paste(bm_rot, (200, 160), bm_rot)
        
        bm.save(os.path.join(PIXAR_DIR, "robot_bookmark_800.png"))
        sprites["robot_bookmark"] = bm
        print("Generated specialized robot_bookmark_800.png")

    return sprites

# -------------------------------------------------------------
# 3. GENERATE LIGHT-THEME FROSTED GLASS PROMO & CHAT MOCKUPS
# -------------------------------------------------------------
def generate_light_promo_mockup():
    W, H = 880, 520
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    
    # Outer Frosted Acrylic Frame
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=24, fill=(255, 255, 255, 230), outline=(226, 218, 205, 200), width=2)
    
    # Header bar
    d.rounded_rectangle([0, 0, W - 1, 52], radius=24, fill=(248, 246, 240, 245))
    d.rectangle([0, 26, W - 1, 52], fill=(248, 246, 240, 245))
    d.line([(0, 52), (W - 1, 52)], fill=(226, 218, 205, 160), width=1)
    
    # Window controls
    d.ellipse([20, 18, 34, 32], fill=(251, 113, 133, 255))
    d.ellipse([42, 18, 56, 32], fill=(251, 191, 36, 255))
    d.ellipse([64, 18, 78, 32], fill=(52, 211, 153, 255))
    
    f_bar = get_font(FONT_BOLD, 14)
    d.text((100, 16), "Генератор промо-материалов • Полиграфический экспорт ISO", font=f_bar, fill=(51, 65, 85, 255))
    
    # Left: A4 Poster Preview (275 x 410)
    ax, ay, aw, ah = 36, 76, 275, 410
    d.rounded_rectangle([ax + 6, ay + 6, ax + aw + 6, ay + ah + 6], radius=10, fill=(180, 165, 150, 60))
    d.rounded_rectangle([ax, ay, ax + aw, ay + ah], radius=10, fill=(255, 255, 255, 255), outline=(16, 185, 129, 220), width=2)
    
    d.rounded_rectangle([ax + 16, ay + 16, ax + 165, ay + 38], radius=6, fill=(236, 253, 245, 255), outline=(16, 185, 129, 180), width=1)
    d.text((ax + 24, ay + 20), "ПЛАКАТ А4 • 210 × 297 ММ", font=get_font(FONT_BOLD, 10), fill=(5, 150, 105, 255))
    
    d.text((ax + 16, ay + 48), "ЦЕНТРАЛЬНАЯ БИБЛИОТЕКА", font=get_font(FONT_BOLD, 14), fill=(15, 23, 42, 255))
    d.text((ax + 16, ay + 68), "Городская сеть библиотек Владимира", font=get_font(FONT_SANS, 11), fill=(100, 116, 139, 255))
    
    # QR Code on poster
    q_size = 140
    qx, qy = ax + (aw - q_size) // 2, ay + 96
    d.rounded_rectangle([qx - 8, qy - 8, qx + q_size + 8, qy + q_size + 8], radius=8, fill=(248, 250, 252, 255), outline=(203, 213, 225, 255), width=1)
    
    d.rectangle([qx, qy, qx + 40, qy + 40], fill=(15, 23, 42, 255))
    d.rectangle([qx + 8, qy + 8, qx + 32, qy + 32], fill=(255, 255, 255, 255))
    d.rectangle([qx + 14, qy + 14, qx + 26, qy + 26], fill=(16, 185, 129, 255))
    
    d.rectangle([qx + q_size - 40, qy, qx + q_size, qy + 40], fill=(15, 23, 42, 255))
    d.rectangle([qx + q_size - 32, qy + 8, qx + q_size - 8, qy + 32], fill=(255, 255, 255, 255))
    d.rectangle([qx + q_size - 26, qy + 14, qx + q_size - 14, qy + 26], fill=(16, 185, 129, 255))
    
    d.rectangle([qx, qy + q_size - 40, qx + 40, qy + q_size], fill=(15, 23, 42, 255))
    d.rectangle([qx + 8, qy + q_size - 32, qx + 32, qy + q_size - 8], fill=(255, 255, 255, 255))
    d.rectangle([qx + 14, qy + q_size - 26, qx + 26, qy + q_size - 14], fill=(16, 185, 129, 255))
    
    d.ellipse([qx + q_size//2 - 10, qy + q_size//2 - 10, qx + q_size//2 + 10, qy + q_size//2 + 10], fill=(16, 185, 129, 255))
    
    f_pbot = get_font(FONT_SANS, 11)
    d.text((ax + 20, ay + 260), "✓ Наведи камеру смартфона", font=f_pbot, fill=(30, 41, 59, 255))
    d.text((ax + 20, ay + 282), "✓ Читай книги и новинки онлайн", font=f_pbot, fill=(30, 41, 59, 255))
    d.text((ax + 20, ay + 304), "✓ Афиша бесплатных лекций", font=f_pbot, fill=(30, 41, 59, 255))
    
    d.rounded_rectangle([ax + 16, ay + 340, ax + aw - 16, ay + 386], radius=6, fill=(16, 185, 129, 20), outline=(16, 185, 129, 140), width=1)
    d.text((ax + 28, ay + 354), "biblioteka33.ru/stat", font=get_font(FONT_BOLD, 13), fill=(5, 150, 105, 255))
    
    # Middle: Table-tent preview
    tx, ty, tw, th = 335, 100, 250, 320
    d.rounded_rectangle([tx + 6, ty + 6, tx + tw + 6, ty + th + 6], radius=10, fill=(180, 165, 150, 60))
    d.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=10, fill=(255, 255, 255, 255), outline=(244, 63, 94, 180), width=2)
    d.line([(tx, ty + 46), (tx + tw, ty + 46)], fill=(244, 63, 94, 100), width=1)
    
    d.text((tx + 18, ty + 14), "ТЕЙБЛ-ТЕНТ А5 (ДОМИК)", font=get_font(FONT_BOLD, 13), fill=(225, 29, 72, 255))
    d.text((tx + 18, ty + 60), "Для кафедр и выставок", font=get_font(FONT_BOLD, 12), fill=(15, 23, 42, 255))
    d.text((tx + 18, ty + 80), "Двухсторонняя плотная печать", font=get_font(FONT_SANS, 11), fill=(100, 116, 139, 255))
    
    mq_size = 96
    mqx, mqy = tx + (tw - mq_size) // 2, ty + 115
    d.rounded_rectangle([mqx - 6, mqy - 6, mqx + mq_size + 6, mqy + mq_size + 6], radius=6, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=1)
    d.rectangle([mqx, mqy, mqx + 26, mqy + 26], fill=(225, 29, 72, 255))
    d.rectangle([mqx + mq_size - 26, mqy, mqx + mq_size, mqy + 26], fill=(225, 29, 72, 255))
    d.rectangle([mqx, mqy + mq_size - 26, mqx + 26, mqy + mq_size], fill=(225, 29, 72, 255))
    
    d.text((tx + 24, ty + 245), "Плотность бумаги: 280 г/м²", font=get_font(FONT_SANS, 11), fill=(71, 85, 105, 255))
    d.text((tx + 24, ty + 268), "Линия биговки по центру", font=get_font(FONT_BOLD, 11), fill=(225, 29, 72, 255))
    
    # Right: 2 Bookmarks
    bx1, by1 = 615, 80
    bx2, by2 = 745, 105
    for bx, by, color, title in [(bx1, by1, (139, 92, 246), "ЗАКЛАДКА 1"), (bx2, by2, (16, 185, 129), "ЗАКЛАДКА 2")]:
        d.rounded_rectangle([bx + 4, by + 4, bx + 105 + 4, by + 360 + 4], radius=8, fill=(180, 165, 150, 60))
        d.rounded_rectangle([bx, by, bx + 105, by + 360], radius=8, fill=(255, 255, 255, 255), outline=color, width=2)
        
        d.ellipse([bx + 44, by + 14, bx + 64, by + 34], fill=(241, 245, 249, 255), outline=color, width=2)
        d.text((bx + 14, by + 48), title, font=get_font(FONT_BOLD, 11), fill=color)
        d.text((bx + 10, by + 76), "«Книга — это", font=get_font(FONT_BOLD, 11), fill=(15, 23, 42, 255))
        d.text((bx + 10, by + 96), "компас в мире", font=get_font(FONT_BOLD, 11), fill=(15, 23, 42, 255))
        d.text((bx + 10, by + 116), "знаний»", font=get_font(FONT_BOLD, 11), fill=(15, 23, 42, 255))
        
        bq_s = 68
        bqx, bqy = bx + (105 - bq_s) // 2, by + 155
        d.rectangle([bqx, bqy, bqx + bq_s, bqy + bq_s], fill=(248, 250, 252, 255), outline=color, width=1)
        d.rectangle([bqx + 4, bqy + 4, bqx + 22, bqy + 22], fill=color)
        d.rectangle([bqx + bq_s - 22, bqy + 4, bqx + bq_s - 4, bqy + 22], fill=color)
        d.rectangle([bqx + 4, bqy + bq_s - 22, bqx + 22, bqy + bq_s - 4], fill=color)
        
        d.text((bx + 16, by + 265), "Владимир", font=get_font(FONT_SANS, 11), fill=(100, 116, 139, 255))
        d.text((bx + 28, by + 290), "2026", font=get_font(FONT_BOLD, 14), fill=color)
        
    out_p = os.path.join(PIXAR_DIR, "mockup_promo_light.png")
    canvas.save(out_p)
    print("Generated light promo mockup:", out_p)

def generate_light_chat_mockup():
    W, H = 880, 520
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=24, fill=(255, 255, 255, 230), outline=(226, 218, 205, 200), width=2)
    
    # Top Chat Bar
    d.rounded_rectangle([0, 0, W - 1, 60], radius=24, fill=(248, 246, 240, 245))
    d.rectangle([0, 30, W - 1, 60], fill=(248, 246, 240, 245))
    d.line([(0, 60), (W - 1, 60)], fill=(226, 218, 205, 160), width=1)
    
    d.ellipse([20, 12, 54, 46], fill=(16, 185, 129, 255))
    d.ellipse([46, 36, 56, 46], fill=(34, 197, 94, 255))
    
    d.text((70, 14), "Космо • Квантовый Библиотечный Ассистент", font=get_font(FONT_BOLD, 15), fill=(15, 23, 42, 255))
    d.text((70, 34), "Нейросеть AURORA AI • 10 Экспресс-сценариев", font=get_font(FONT_SANS, 12), fill=(16, 185, 129, 255))
    
    # Presets Bar
    px = 24
    presets = [
        ("ТОП-5 постов сети", (16, 185, 129)),
        ("Аудит вовлеченности", (139, 92, 246)),
        ("Сгенерировать пост VK", (244, 63, 94)),
        ("Контент-план недели", (245, 158, 11))
    ]
    py = 76
    for ptext, col in presets:
        pw = len(ptext) * 9 + 30
        d.rounded_rectangle([px, py, px + pw, py + 34], radius=17, fill=(241, 245, 249, 255), outline=col, width=1)
        d.text((px + 14, py + 8), ptext, font=get_font(FONT_BOLD, 12), fill=col)
        px += pw + 12
        if px > W - 100:
            break
            
    # User message
    um_w = 490
    um_h = 60
    um_x = W - um_w - 28
    um_y = 126
    d.rounded_rectangle([um_x, um_y, um_x + um_w, um_y + um_h], radius=16, fill=(37, 99, 235, 240))
    d.text((um_x + 20, um_y + 12), "Космо, сделай экспресс-аудит Центральной", font=get_font(FONT_BOLD, 13), fill=(255, 255, 255, 255))
    d.text((um_x + 20, um_y + 32), "библиотеки и предложи пост для VK с опросом!", font=get_font(FONT_BOLD, 13), fill=(255, 255, 255, 255))
    
    # Cosmo response
    cm_w = 700
    cm_h = 195
    cm_x = 28
    cm_y = 200
    d.rounded_rectangle([cm_x, cm_y, cm_x + cm_w, cm_y + cm_h], radius=18, fill=(248, 250, 252, 255), outline=(16, 185, 129, 160), width=1)
    
    d.text((cm_x + 22, cm_y + 16), "➔ Анализ готов: ERpost 5.2% (+18% к среднему показателю по 16 филиалам)", font=get_font(FONT_BOLD, 13), fill=(5, 150, 105, 255))
    d.text((cm_x + 22, cm_y + 40), "Проект публикации для сообщества ВКонтакте:", font=get_font(FONT_SANS, 12), fill=(100, 116, 139, 255))
    
    d.rounded_rectangle([cm_x + 20, cm_y + 66, cm_x + cm_w - 20, cm_y + 175], radius=12, fill=(255, 255, 255, 255), outline=(226, 232, 240, 255), width=1)
    d.text((cm_x + 36, cm_y + 78), "«Какая книга изменила ваше мировоззрение?»", font=get_font(FONT_BOLD, 13), fill=(217, 119, 6, 255))
    d.text((cm_x + 36, cm_y + 102), "Делимся любимыми цитатами в комментариях! Первые 3 участника", font=get_font(FONT_SANS, 12), fill=(30, 41, 59, 255))
    d.text((cm_x + 36, cm_y + 122), "получат эксклюзивную закладку с QR-гидом по книжным новинкам.", font=get_font(FONT_SANS, 12), fill=(30, 41, 59, 255))
    d.text((cm_x + 36, cm_y + 146), "#Библиотека33 #Владимир #Чтение #АврораАналитика", font=get_font(FONT_BOLD, 12), fill=(37, 99, 235, 255))
    
    # Input Area Bottom
    bx, by, bw, bh = 28, 415, W - 56, 60
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=30, fill=(241, 245, 249, 255), outline=(203, 213, 225, 255), width=1)
    d.text((bx + 26, by + 20), "Спросите Космо о показателях библиотек или выберите пресет...", font=get_font(FONT_SANS, 13), fill=(148, 163, 184, 255))
    
    d.ellipse([bx + bw - 52, by + 8, bx + bw - 8, by + 52], fill=(16, 185, 129, 255))
    d.polygon([(bx + bw - 35, by + 22), (bx + bw - 20, by + 30), (bx + bw - 35, by + 38)], fill=(255, 255, 255, 255))
    
    out_p = os.path.join(PIXAR_DIR, "mockup_chat_light.png")
    canvas.save(out_p)
    print("Generated light chat mockup:", out_p)

# -------------------------------------------------------------
# 4. FRAME SCREENSHOTS IN CRISP WHITE ACRYLIC BORDERS
# -------------------------------------------------------------
def frame_screenshot(in_path, out_path, target_w=880, target_h=500):
    im = Image.open(in_path).convert("RGBA")
    im_resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    mask = Image.new("L", (target_w, target_h), 0)
    d_m = ImageDraw.Draw(mask)
    d_m.rounded_rectangle([0, 0, target_w - 1, target_h - 1], radius=20, fill=255)
    
    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    out.paste(im_resized, (0, 0), mask=mask)
    
    d_out = ImageDraw.Draw(out)
    d_out.rounded_rectangle([1, 1, target_w - 2, target_h - 2], radius=20, outline=(255, 255, 255, 240), width=4)
    d_out.rounded_rectangle([3, 3, target_w - 4, target_h - 4], radius=18, outline=(16, 185, 129, 140), width=2)
    
    out.save(out_path)
    print("Framed screenshot saved:", out_path)

if __name__ == "__main__":
    print("Generating Pixar studio backgrounds...")
    bg_studio = generate_cream_background(2080, 1240, "studio")
    bg_studio.save(os.path.join(PIXAR_DIR, "bg_cream_studio.png"))
    
    print("Enhancing exact Cosmo mascot sprites...")
    enhance_mascot_sprites()
    
    print("Generating light-theme mockups...")
    generate_light_promo_mockup()
    generate_light_chat_mockup()
    
    print("Framing real UI screenshots...")
    frame_screenshot(
        os.path.join(ASSETS_DIR, "screenshots", "06_analytics_er_ranking.jpg"),
        os.path.join(PIXAR_DIR, "framed_analytics_er.png")
    )
    frame_screenshot(
        os.path.join(ASSETS_DIR, "screenshots", "01_dashboard_overview.jpg"),
        os.path.join(PIXAR_DIR, "framed_dashboard.png")
    )
    print("All Pixar assets generated successfully!")
