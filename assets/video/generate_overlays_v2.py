import os, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080

FONT_SHOP = "assets/fonts/ShoptronicSP-Regular.ttf"
FONT_ARIAL = "assets/fonts/arial.ttf"

def get_font(font_path, size):
    return ImageFont.truetype(font_path, size)

def is_arial_token(t):
    # Любые цифры, слеши '/', точки, буллеты, знаки препинания, английские слова и URL используют Arial!
    return bool(re.search(r"[\d/•%+=#@№\-_.:\"'()\[\]/\\]|[a-zA-Z]", t))

def split_smart_tokens(text):
    return [p for p in re.split(r"([a-zA-Z0-9/•%+=#@№\-_.:\"'()\[\]/\\]+)", text) if p]

def measure_dual_width(draw, text, f_text, f_digits):
    tokens = split_smart_tokens(text)
    total_w = 0
    for token in tokens:
        if not token: continue
        f = f_digits if is_arial_token(token) else f_text
        bbox = draw.textbbox((0, 0), token, font=f)
        total_w += (bbox[2] - bbox[0])
    return total_w

def draw_dual_font_text(draw, x, y, text, f_text, f_digits, fill, anchor="la"):
    tokens = split_smart_tokens(text)
    token_sizes = []
    total_w = 0
    max_h = 0
    for token in tokens:
        if not token: continue
        f = f_digits if is_arial_token(token) else f_text
        bbox = draw.textbbox((0, 0), token, font=f)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        token_sizes.append((token, f, w, h, bbox))
        total_w += w
        if h > max_h: max_h = h
        
    cur_x = x
    h_align = anchor[0] if len(anchor) >= 1 else "l"
    v_align = anchor[1] if len(anchor) >= 2 else "a"

    if h_align == "m": # horizontal middle
        cur_x = x - total_w / 2
    elif h_align == "r": # right
        cur_x = x - total_w
        
    cur_y = y
    if v_align == "m": # vertical middle
        cur_y = y - max_h / 2
    elif v_align in ("b", "d"): # bottom / baseline
        cur_y = y - max_h
        
    for token, f, w, h, bbox in token_sizes:
        draw.text((cur_x, cur_y), token, fill=fill, font=f)
        cur_x += w
    return total_w, max_h

def wrap_dual_text(draw, text, max_width, f_text, f_digits):
    words = text.split(" ")
    lines = []
    cur_line = []
    for word in words:
        test_line = " ".join(cur_line + [word])
        w = measure_dual_width(draw, test_line, f_text, f_digits)
        if w <= max_width or not cur_line:
            cur_line.append(word)
        else:
            lines.append(" ".join(cur_line))
            cur_line = [word]
    if cur_line:
        lines.append(" ".join(cur_line))
    return lines

def draw_wrapped_dual_text(draw, x, y, text, max_width, line_gap, f_text, f_digits, fill, anchor="la"):
    lines = wrap_dual_text(draw, text, max_width, f_text, f_digits)
    cur_y = y
    for line in lines:
        w, h = draw_dual_font_text(draw, x, cur_y, line, f_text, f_digits, fill, anchor=anchor)
        cur_y += h + line_gap
    return len(lines) * line_gap

def draw_glow_rect(draw, bbox, fill, outline, glow_color, radius=18, glow_width=8):
    x0, y0, x1, y1 = bbox
    for i in range(glow_width, 0, -2):
        alpha = int(glow_color[3] * (1.0 - i / glow_width) * 0.45)
        g_col = (glow_color[0], glow_color[1], glow_color[2], alpha)
        draw.rounded_rectangle([x0 - i, y0 - i, x1 + i, y1 + i], radius=radius + i, outline=g_col, width=2)
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=2)

def draw_icon(draw, itype, cx, cy, r, color):
    # Circle badge background
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(color[0], color[1], color[2], 50), outline=(color[0], color[1], color[2], 230), width=2)
    s = r * 0.85
    if itype == "lightning":
        pts = [(cx + s*0.1, cy - s*0.75), (cx - s*0.55, cy + s*0.1), (cx, cy + s*0.1), (cx - s*0.2, cy + s*0.75), (cx + s*0.65, cy - s*0.1), (cx + s*0.1, cy - s*0.1)]
        draw.polygon(pts, fill=color)
    elif itype == "robot":
        draw.rounded_rectangle([cx - s*0.55, cy - s*0.35, cx + s*0.55, cy + s*0.45], radius=int(s*0.2), fill=color)
        draw.ellipse([cx - s*0.35, cy - s*0.12, cx - s*0.12, cy + s*0.12], fill=(10, 15, 30, 255))
        draw.ellipse([cx + s*0.12, cy - s*0.12, cx + s*0.35, cy + s*0.12], fill=(10, 15, 30, 255))
        draw.line([cx, cy - s*0.35, cx, cy - s*0.65], fill=color, width=2)
        draw.ellipse([cx - s*0.12, cy - s*0.8, cx + s*0.12, cy - s*0.55], fill=color)
    elif itype == "bars":
        draw.rounded_rectangle([cx - s*0.55, cy + s*0.1, cx - s*0.25, cy + s*0.55], radius=2, fill=color)
        draw.rounded_rectangle([cx - s*0.15, cy - s*0.25, cx + s*0.15, cy + s*0.55], radius=2, fill=color)
        draw.rounded_rectangle([cx + s*0.25, cy - s*0.6, cx + s*0.55, cy + s*0.55], radius=2, fill=color)
    elif itype == "trophy":
        draw.polygon([(cx - s*0.45, cy - s*0.45), (cx + s*0.45, cy - s*0.45), (cx + s*0.3, cy + s*0.1), (cx - s*0.3, cy + s*0.1)], fill=color)
        draw.rectangle([cx - s*0.1, cy + s*0.1, cx + s*0.1, cy + s*0.4], fill=color)
        draw.rectangle([cx - s*0.35, cy + s*0.4, cx + s*0.35, cy + s*0.55], fill=color)
    elif itype == "pen":
        draw.polygon([(cx + s*0.35, cy - s*0.55), (cx + s*0.55, cy - s*0.35), (cx - s*0.2, cy + s*0.45), (cx - s*0.45, cy + s*0.55), (cx - s*0.35, cy + s*0.3)], fill=color)
    elif itype == "calendar":
        draw.rounded_rectangle([cx - s*0.5, cy - s*0.4, cx + s*0.5, cy + s*0.5], radius=3, outline=color, width=2)
        draw.line([cx - s*0.5, cy - s*0.1, cx + s*0.5, cy - s*0.1], fill=color, width=2)
        draw.ellipse([cx - s*0.3, cy - s*0.6, cx - s*0.15, cy - s*0.35], fill=color)
        draw.ellipse([cx + s*0.15, cy - s*0.6, cx + s*0.3, cy - s*0.35], fill=color)
    elif itype == "pulse":
        draw.line([(cx - s*0.55, cy), (cx - s*0.25, cy), (cx - s*0.1, cy - s*0.45), (cx + s*0.1, cy + s*0.45), (cx + s*0.25, cy), (cx + s*0.55, cy)], fill=color, width=3)
    elif itype == "globe":
        draw.ellipse([cx - s*0.4, cy - s*0.4, cx + s*0.4, cy + s*0.4], outline=color, width=2)
        draw.ellipse([cx - s*0.7, cy - s*0.2, cx + s*0.7, cy + s*0.2], outline=color, width=2)
    elif itype == "rocket":
        draw.polygon([(cx, cy - s*0.7), (cx + s*0.4, cy + s*0.4), (cx + s*0.2, cy + s*0.3), (cx - s*0.2, cy + s*0.3), (cx - s*0.4, cy + s*0.4)], fill=color)
        draw.polygon([(cx - s*0.15, cy + s*0.35), (cx, cy + s*0.75), (cx + s*0.15, cy + s*0.35)], fill=(255, 200, 50, 255))

# Fonts definition
f_logo_shop = get_font(FONT_SHOP, 96)
f_logo_arial = get_font(FONT_ARIAL, 96)

f_h1_shop = get_font(FONT_SHOP, 42)
f_h1_arial = get_font(FONT_ARIAL, 42)

f_h2_shop = get_font(FONT_SHOP, 26)
f_h2_arial = get_font(FONT_ARIAL, 26)

f_body_shop = get_font(FONT_SHOP, 19)
f_body_arial = get_font(FONT_ARIAL, 19)

f_tag_shop = get_font(FONT_SHOP, 18)
f_tag_arial = get_font(FONT_ARIAL, 18)

# -------------------------------------------------------------
# Overlay 1: Intro
# -------------------------------------------------------------
ov1 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d1 = ImageDraw.Draw(ov1)

# Top badge with lightning icon
draw_glow_rect(d1, [W//2 - 270, 95, W//2 + 270, 155], fill=(12, 18, 36, 230), outline=(0, 242, 254, 255), glow_color=(0, 242, 254, 180), radius=28)
draw_icon(d1, "lightning", W//2 - 225, 125, 18, (0, 242, 254))
draw_dual_font_text(d1, W//2 + 10, 125, "СИСТЕМА КОСМИЧЕСКОЙ АНАЛИТИКИ", f_tag_shop, f_tag_arial, (0, 242, 254, 255), anchor="mm")

# Glowing AURORA title
title = "AURORA"
for offset in range(14, 0, -2):
    alpha = int(75 * (1 - offset / 14))
    draw_dual_font_text(d1, W//2, 250, title, f_logo_shop, f_logo_arial, (168, 85, 247, alpha), anchor="mm")
draw_dual_font_text(d1, W//2, 250, title, f_logo_shop, f_logo_arial, (255, 255, 255, 255), anchor="mm")

# Subtitle
draw_dual_font_text(d1, W//2, 330, "МОНИТОРИНГ И SMM-АНАЛИЗ ВКОНТАКТЕ", f_h2_shop, f_h2_arial, (203, 213, 225, 255), anchor="mm")
d1.line([W//2 - 320, 370, W//2 + 320, 370], fill=(0, 242, 254, 220), width=3)

# Bot introduction card at bottom
draw_glow_rect(d1, [W//2 - 420, H - 240, W//2 + 420, H - 110], fill=(11, 16, 32, 240), outline=(240, 147, 251, 255), glow_color=(240, 147, 251, 180), radius=22)
draw_icon(d1, "robot", W//2 - 350, H - 175, 26, (240, 147, 251))
draw_dual_font_text(d1, W//2 + 20, H - 192, "БОРТОВОЙ ИИ КОСМО НА СВЯЗИ!", f_h2_shop, f_h2_arial, (240, 147, 251, 255), anchor="mm")
draw_dual_font_text(d1, W//2 + 20, H - 150, "Ваш персональный SMM-навигатор по 16 библиотекам города Владимира", f_body_shop, f_body_arial, (226, 232, 240, 240), anchor="mm")

ov1.save("assets/video/overlays/overlay_scene1.png")
print("Overlay 1 generated!")

# -------------------------------------------------------------
# Overlay 2: Project Capabilities
# -------------------------------------------------------------
ov2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d2 = ImageDraw.Draw(ov2)

# Top Header
draw_glow_rect(d2, [100, 45, W - 100, 125], fill=(10, 15, 30, 235), outline=(0, 242, 254, 240), glow_color=(0, 242, 254, 160), radius=16)
draw_icon(d2, "rocket", 150, 85, 24, (0, 242, 254))
draw_dual_font_text(d2, W//2, 85, "ЧТО УМЕЕТ АНАЛИТИЧЕСКАЯ СИСТЕМА AURORA?", f_h1_shop, f_h1_arial, (255, 255, 255, 255), anchor="mm")

# Left Column: 3 Cards for Project
cards_data_2 = [
    ("lightning", "16 БИБЛИОТЕК В 1 КЛИК", "Мгновенный сбор постов за любой период через execute-пакеты без зависаний", "ПАКЕТНЫЙ СКАН", (0, 242, 254)),
    ("bars", "МОНИТОРИНГ ОХВАТОВ И РЕАКЦИЙ", "Детальный учёт просмотров, лайков, репостов и комментариев с графиками", "АНАЛИТИКА", (168, 85, 247)),
    ("trophy", "ЧЕСТНЫЙ РЕЙТИНГ ER", "Расчёт вовлечённости на подписчика и пост, поиск лидеров и точек роста", "РЕЙТИНГ СЕТИ", (240, 147, 251))
]

for (icon, title, desc, tag, color), cy in zip(cards_data_2, [160, 420, 680]):
    draw_glow_rect(d2, [90, cy, 915, cy + 225], fill=(12, 17, 34, 230), outline=(color[0], color[1], color[2], 240), glow_color=(color[0], color[1], color[2], 140), radius=18)
    # Icon
    draw_icon(d2, icon, 145, cy + 44, 22, color)
    # Title
    draw_dual_font_text(d2, 185, cy + 44, title, f_h2_shop, f_h2_arial, color, anchor="lm")
    # Description wrapped
    draw_wrapped_dual_text(d2, 125, cy + 86, desc, 740, 6, f_body_shop, f_body_arial, (226, 232, 240, 235))
    # Tag chip
    draw_glow_rect(d2, [125, cy + 168, 350, cy + 205], fill=(color[0], color[1], color[2], 45), outline=(color[0], color[1], color[2], 200), glow_color=(0,0,0,0), radius=10)
    draw_dual_font_text(d2, 237, cy + 186, tag, f_tag_shop, f_tag_arial, (255, 255, 255, 240), anchor="mm")

ov2.save("assets/video/overlays/overlay_scene2.png")
print("Overlay 2 generated!")

# -------------------------------------------------------------
# Overlay 3: Cosmo Superpowers
# -------------------------------------------------------------
ov3 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d3 = ImageDraw.Draw(ov3)

draw_glow_rect(d3, [100, 45, W - 100, 125], fill=(10, 15, 30, 235), outline=(240, 147, 251, 240), glow_color=(240, 147, 251, 160), radius=16)
draw_icon(d3, "robot", 150, 85, 24, (240, 147, 251))
draw_dual_font_text(d3, W//2, 85, "СУПЕРСПОСОБНОСТИ РОБОТА КОСМО", f_h1_shop, f_h1_arial, (255, 255, 255, 255), anchor="mm")

cards_data_3 = [
    ("pen", "ГЕНЕРАЦИЯ ПОСТОВ И СТАТЕЙ", "Пишет вирусные тексты, лонгриды и анонсы мероприятий с хэштегами", "ИИ-КОПИРАЙТИНГ", (0, 242, 254)),
    ("calendar", "КОНТЕНТ-ПЛАН НА 7 ДНЕЙ", "Создаёт рубрики, тайминги и цели публикаций на всю неделю вперёд", "СТРАТЕГИЯ НА НЕДЕЛЮ", (240, 147, 251)),
    ("pulse", "ДИАГНОЗ И АУДИТ СООБЩЕСТВ", "Анализ спада охватов, сравнение с лидерами и рецепт роста аудитории", "ТОЧКИ РОСТА", (52, 211, 153))
]

for (icon, title, desc, tag, color), cy in zip(cards_data_3, [160, 420, 680]):
    draw_glow_rect(d3, [1005, cy, 1830, cy + 225], fill=(12, 17, 34, 230), outline=(color[0], color[1], color[2], 240), glow_color=(color[0], color[1], color[2], 140), radius=18)
    draw_icon(d3, icon, 1060, cy + 44, 22, color)
    draw_dual_font_text(d3, 1100, cy + 44, title, f_h2_shop, f_h2_arial, color, anchor="lm")
    draw_wrapped_dual_text(d3, 1040, cy + 86, desc, 740, 6, f_body_shop, f_body_arial, (226, 232, 240, 235))
    draw_glow_rect(d3, [1040, cy + 168, 1300, cy + 205], fill=(color[0], color[1], color[2], 45), outline=(color[0], color[1], color[2], 200), glow_color=(0,0,0,0), radius=10)
    draw_dual_font_text(d3, 1170, cy + 186, tag, f_tag_shop, f_tag_arial, (255, 255, 255, 240), anchor="mm")

ov3.save("assets/video/overlays/overlay_scene3.png")
print("Overlay 3 generated!")

# -------------------------------------------------------------
# Overlay 4: Outro & Call to Action
# -------------------------------------------------------------
ov4 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d4 = ImageDraw.Draw(ov4)

draw_glow_rect(d4, [W//2 - 470, 130, W//2 + 470, 390], fill=(10, 15, 30, 240), outline=(0, 242, 254, 255), glow_color=(0, 242, 254, 190), radius=26)
draw_icon(d4, "rocket", W//2 - 390, 190, 24, (0, 242, 254))
draw_dual_font_text(d4, W//2 + 20, 190, "ПОКОРЯЙТЕ ГАЛАКТИКУ ВКОНТАКТЕ!", f_h1_shop, f_h1_arial, (255, 255, 255, 255), anchor="mm")
draw_dual_font_text(d4, W//2, 255, "Точные цифры, умный поиск и лучший ИИ-ассистент", f_h2_shop, f_h2_arial, (203, 213, 225, 240), anchor="mm")
draw_dual_font_text(d4, W//2, 330, "ЗАПУСКАЙТЕ ПОИСК ПРЯМО СЕЙЧАС", f_h2_shop, f_h2_arial, (0, 242, 254, 255), anchor="mm")

draw_glow_rect(d4, [W//2 - 400, H - 240, W//2 + 400, H - 110], fill=(12, 17, 34, 245), outline=(240, 147, 251, 255), glow_color=(240, 147, 251, 190), radius=22)
draw_icon(d4, "globe", W//2 - 320, H - 175, 26, (240, 147, 251))
draw_dual_font_text(d4, W//2 + 20, H - 195, "biblioteka33.ru/stat", f_h1_shop, f_h1_arial, (255, 255, 255, 255), anchor="mm")
draw_dual_font_text(d4, W//2 + 20, H - 145, "AURORA v4.18.6 • Разработка: Амброзиев О.А.", f_body_shop, f_body_arial, (148, 163, 184, 255), anchor="mm")

ov4.save("assets/video/overlays/overlay_scene4.png")
print("Overlay 4 generated!")
