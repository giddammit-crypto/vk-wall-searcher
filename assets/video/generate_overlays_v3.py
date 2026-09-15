import os, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080

FONT_SHOP = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/fonts/ShoptronicSP-Regular.ttf"
FONT_ARIAL = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/fonts/arial.ttf"

def get_font(font_path, size):
    return ImageFont.truetype(font_path, size)

def is_arial_token(t):
    # Digits, mathematical symbols, punctuation, Latin letters -> Arial
    return bool(re.search(r"[\d/•%+=#@№\-_.:\"'()\[\]/\\×*><~–—]|[a-zA-Z]", t))

def split_smart_tokens(text):
    # Split text keeping non-cyrillic / numbers / symbols together
    return [p for p in re.split(r"([a-zA-Z0-9/•%+=#@№\-_.:\"'()\[\]/\\×*><~–—]+)", text) if p]

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

    if h_align == "m":
        cur_x = x - total_w / 2
    elif h_align == "r":
        cur_x = x - total_w
        
    cur_y = y
    if v_align == "m":
        cur_y = y - max_h / 2
    elif v_align in ("b", "d"):
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

def draw_glow_rect(draw, box, fill_color, border_color, glow_color, radius=18, glow_width=8):
    x1, y1, x2, y2 = box
    for i in range(glow_width, 0, -2):
        alpha = int(glow_color[3] * (1.0 - i / glow_width) * 0.45)
        if alpha > 0:
            draw.rounded_rectangle(
                [x1 - i, y1 - i, x2 + i, y2 + i],
                radius=radius + i,
                outline=(glow_color[0], glow_color[1], glow_color[2], alpha),
                width=2
            )
    draw.rounded_rectangle(box, radius=radius, fill=fill_color, outline=border_color, width=2)

def draw_icon(draw, itype, cx, cy, size, color):
    s = size
    draw.ellipse([cx - s, cy - s, cx + s, cy + s], fill=(color[0], color[1], color[2], 50))
    draw.ellipse([cx - s, cy - s, cx + s, cy + s], outline=(color[0], color[1], color[2], 200), width=2)
    
    if itype == "robot":
        draw.rounded_rectangle([cx - s*0.5, cy - s*0.4, cx + s*0.5, cy + s*0.4], radius=4, outline=(255, 255, 255, 255), width=2)
        draw.ellipse([cx - s*0.3, cy - s*0.1, cx - s*0.1, cy + s*0.1], fill=(0, 240, 255, 255))
        draw.ellipse([cx + s*0.1, cy - s*0.1, cx + s*0.3, cy + s*0.1], fill=(0, 240, 255, 255))
        draw.line([(cx, cy - s*0.4), (cx, cy - s*0.7)], fill=(255, 255, 255, 255), width=2)
    elif itype == "lightning":
        draw.polygon([(cx - s*0.2, cy - s*0.6), (cx + s*0.4, cy - s*0.1), (cx, cy), (cx + s*0.3, cy + s*0.6), (cx - s*0.4, cy + s*0.1), (cx - s*0.05, cy)], fill=(255, 255, 255, 255))
    elif itype == "bars":
        draw.rectangle([cx - s*0.6, cy + s*0.1, cx - s*0.3, cy + s*0.6], fill=(255, 255, 255, 255))
        draw.rectangle([cx - s*0.15, cy - s*0.2, cx + s*0.15, cy + s*0.6], fill=(255, 255, 255, 255))
        draw.rectangle([cx + s*0.3, cy - s*0.5, cx + s*0.6, cy + s*0.6], fill=(255, 255, 255, 255))
    elif itype == "trophy":
        draw.rounded_rectangle([cx - s*0.4, cy - s*0.5, cx + s*0.4, cy + s*0.1], radius=3, outline=(255, 255, 255, 255), width=2)
        draw.line([(cx, cy + s*0.1), (cx, cy + s*0.4)], fill=(255, 255, 255, 255), width=2)
        draw.line([(cx - s*0.3, cy + s*0.4), (cx + s*0.3, cy + s*0.4)], fill=(255, 255, 255, 255), width=2)
    elif itype == "qr":
        draw.rectangle([cx - s*0.5, cy - s*0.5, cx + s*0.5, cy + s*0.5], outline=(255, 255, 255, 255), width=2)
        draw.rectangle([cx - s*0.3, cy - s*0.3, cx - s*0.1, cy - s*0.1], fill=(0, 240, 255, 255))
        draw.rectangle([cx + s*0.1, cy - s*0.3, cx + s*0.3, cy - s*0.1], fill=(0, 240, 255, 255))
        draw.rectangle([cx - s*0.3, cy + s*0.1, cx - s*0.1, cy + s*0.3], fill=(0, 240, 255, 255))
        draw.rectangle([cx + s*0.1, cy + s*0.1, cx + s*0.3, cy + s*0.3], fill=(255, 255, 255, 255))
    elif itype == "printer":
        draw.rounded_rectangle([cx - s*0.5, cy - s*0.2, cx + s*0.5, cy + s*0.4], radius=3, outline=(255, 255, 255, 255), width=2)
        draw.rectangle([cx - s*0.3, cy - s*0.5, cx + s*0.3, cy - s*0.2], outline=(255, 255, 255, 255), width=2)
        draw.line([(cx - s*0.3, cy + s*0.1), (cx + s*0.3, cy + s*0.1)], fill=(255, 255, 255, 255), width=2)
    elif itype == "bookmark":
        draw.polygon([(cx - s*0.3, cy - s*0.5), (cx + s*0.3, cy - s*0.5), (cx + s*0.3, cy + s*0.5), (cx, cy + s*0.2), (cx - s*0.3, cy + s*0.5)], fill=(255, 255, 255, 255))
    elif itype == "chat":
        draw.rounded_rectangle([cx - s*0.5, cy - s*0.4, cx + s*0.5, cy + s*0.3], radius=4, outline=(255, 255, 255, 255), width=2)
        draw.polygon([(cx - s*0.2, cy + s*0.3), (cx - s*0.4, cy + s*0.6), (cx, cy + s*0.3)], fill=(255, 255, 255, 255))
    elif itype == "pen":
        draw.line([(cx - s*0.4, cy + s*0.4), (cx + s*0.4, cy - s*0.4)], fill=(255, 255, 255, 255), width=3)
        draw.polygon([(cx - s*0.6, cy + s*0.3), (cx - s*0.4, cy + s*0.5), (cx - s*0.7, cy + s*0.7)], fill=color)
    elif itype == "pulse":
        draw.line([(cx - s*0.7, cy), (cx - s*0.3, cy), (cx - s*0.1, cy - s*0.6), (cx + s*0.15, cy + s*0.6), (cx + s*0.35, cy), (cx + s*0.7, cy)], fill=(255, 255, 255, 255), width=3)
    elif itype == "check":
        draw.line([(cx - s*0.5, cy), (cx - s*0.1, cy + s*0.4), (cx + s*0.6, cy - s*0.4)], fill=(255, 255, 255, 255), width=4)
    elif itype == "globe":
        draw.ellipse([cx - s*0.6, cy - s*0.6, cx + s*0.6, cy + s*0.6], outline=(255, 255, 255, 255), width=2)
        draw.line([(cx - s*0.6, cy), (cx + s*0.6, cy)], fill=(255, 255, 255, 255), width=2)
        draw.ellipse([cx - s*0.25, cy - s*0.6, cx + s*0.25, cy + s*0.6], outline=(255, 255, 255, 255), width=1)
    else:
        draw.ellipse([cx - s*0.3, cy - s*0.3, cx + s*0.3, cy + s*0.3], fill=(255, 255, 255, 255))

OUT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/video/overlays"
os.makedirs(OUT_DIR, exist_ok=True)

# -------------------------------------------------------------
# SCENE 1: Знакомство с Космо и платформой AURORA (0.0 - 6.5s)
# -------------------------------------------------------------
def build_scene1():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    f_badge_shop = get_font(FONT_SHOP, 20)
    f_badge_ar = get_font(FONT_ARIAL, 20)
    draw_glow_rect(d, [120, 80, 520, 126], (15, 23, 42, 220), (0, 240, 255, 200), (0, 240, 255, 120), radius=22)
    draw_dual_font_text(d, 320, 93, "КВАНТОВЫЙ ГИД // 2026", f_badge_shop, f_badge_ar, (0, 240, 255, 255), anchor="ma")

    f_title_shop = get_font(FONT_SHOP, 56)
    f_title_ar = get_font(FONT_ARIAL, 56)
    draw_dual_font_text(d, 120, 160, "СИСТЕМА АВРОРА", f_title_shop, f_title_ar, (255, 255, 255, 255), anchor="la")
    
    f_sub_shop = get_font(FONT_SHOP, 23)
    f_sub_ar = get_font(FONT_ARIAL, 22)
    draw_dual_font_text(d, 120, 245, "УМНЫЙ МОНИТОРИНГ И АНАЛИТИКА 16 БИБЛИОТЕК ВЛАДИМИРА", f_sub_shop, f_sub_ar, (56, 189, 248, 255), anchor="la")

    cards_data = [
        ("robot", "МАСКОТ КОСМО", "Интеллектуальный робот-помощник с синтезом речи ElevenLabs", (0, 240, 255)),
        ("lightning", "СКОРОСТЬ 1000 ПОСТОВ", "Мгновенный пакетный сбор публикаций через VK API без зависаний", (168, 85, 247)),
        ("globe", "16 ФИЛИАЛОВ СЕТИ", "Полная панорама городских библиотек в одном удобном дашборде", (236, 72, 153))
    ]
    
    y_start = 330
    card_h = 100
    card_w = 780
    gap = 22
    
    for i, (itype, title, desc, col) in enumerate(cards_data):
        y = y_start + i * (card_h + gap)
        draw_glow_rect(d, [120, y, 120 + card_w, y + card_h], (15, 23, 42, 215), (col[0], col[1], col[2], 180), (col[0], col[1], col[2], 100), radius=16)
        draw_icon(d, itype, 175, y + card_h // 2, 28, col)
        
        f_ctitle_shop = get_font(FONT_SHOP, 25)
        f_ctitle_ar = get_font(FONT_ARIAL, 25)
        draw_dual_font_text(d, 225, y + 16, title, f_ctitle_shop, f_ctitle_ar, (255, 255, 255, 255), anchor="la")
        
        f_cdesc_shop = get_font(FONT_SHOP, 18)
        f_cdesc_ar = get_font(FONT_ARIAL, 18)
        draw_wrapped_dual_text(d, 225, y + 54, desc, card_w - 120, 4, f_cdesc_shop, f_cdesc_ar, (148, 163, 184, 255), anchor="la")

    img.save(os.path.join(OUT_DIR, "overlay_scene1.png"))
    print("Overlay Scene 1 built cleanly!")

# -------------------------------------------------------------
# SCENE 2: Аналитика 16 библиотек, рейтинг ER и теплокарта (6.5 - 13.6s)
# -------------------------------------------------------------
def build_scene2():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    f_badge_shop = get_font(FONT_SHOP, 20)
    f_badge_ar = get_font(FONT_ARIAL, 20)
    draw_glow_rect(d, [120, 80, 520, 126], (15, 23, 42, 220), (168, 85, 247, 200), (168, 85, 247, 120), radius=22)
    draw_dual_font_text(d, 320, 93, "ЭКОСИСТЕМА ДАННЫХ // 24/7", f_badge_shop, f_badge_ar, (168, 85, 247, 255), anchor="ma")

    f_title_shop = get_font(FONT_SHOP, 50)
    f_title_ar = get_font(FONT_ARIAL, 50)
    draw_dual_font_text(d, 120, 160, "АНАЛИТИКА 16 БИБЛИОТЕК", f_title_shop, f_title_ar, (255, 255, 255, 255), anchor="la")
    
    f_sub_shop = get_font(FONT_SHOP, 22)
    f_sub_ar = get_font(FONT_ARIAL, 21)
    draw_dual_font_text(d, 120, 245, "ОБЪЕКТИВНЫЙ РАСЧЕТ ER, ДИНАМИКА И ТЕПЛОВАЯ КАРТА", f_sub_shop, f_sub_ar, (236, 72, 153, 255), anchor="la")

    cards_data = [
        ("bars", "ТЕПЛОВАЯ КАРТА 24/7", "Матрица активности публикаций по часам и дням недели для идеального постинга", (0, 240, 255)),
        ("trophy", "РЕЙТИНГ И ВОВЛЕЧЕННОСТЬ", "Автоматический расчёт коэффициента ERpost и выявление флагманов сети", (251, 191, 36)),
        ("pulse", "ОФИЦИАЛЬНЫЙ ОТЧЕТ", "Готовая аналитическая записка методиста и выгрузка в Word / Excel", (52, 211, 153))
    ]
    
    y_start = 330
    card_h = 100
    card_w = 780
    gap = 22
    
    for i, (itype, title, desc, col) in enumerate(cards_data):
        y = y_start + i * (card_h + gap)
        draw_glow_rect(d, [120, y, 120 + card_w, y + card_h], (15, 23, 42, 215), (col[0], col[1], col[2], 180), (col[0], col[1], col[2], 100), radius=16)
        draw_icon(d, itype, 175, y + card_h // 2, 28, col)
        
        f_ctitle_shop = get_font(FONT_SHOP, 25)
        f_ctitle_ar = get_font(FONT_ARIAL, 25)
        draw_dual_font_text(d, 225, y + 16, title, f_ctitle_shop, f_ctitle_ar, (255, 255, 255, 255), anchor="la")
        
        f_cdesc_shop = get_font(FONT_SHOP, 18)
        f_cdesc_ar = get_font(FONT_ARIAL, 18)
        draw_wrapped_dual_text(d, 225, y + 54, desc, card_w - 120, 4, f_cdesc_shop, f_cdesc_ar, (148, 163, 184, 255), anchor="la")

    img.save(os.path.join(OUT_DIR, "overlay_scene2.png"))
    print("Overlay Scene 2 built cleanly!")

# -------------------------------------------------------------
# SCENE 3: Генератор QR промо-материалов (13.6 - 20.8s)
# -------------------------------------------------------------
def build_scene3():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    f_badge_shop = get_font(FONT_SHOP, 20)
    f_badge_ar = get_font(FONT_ARIAL, 20)
    draw_glow_rect(d, [120, 80, 560, 126], (15, 23, 42, 220), (251, 191, 36, 200), (251, 191, 36, 120), radius=22)
    draw_dual_font_text(d, 340, 93, "ТИПОГРАФСКИЙ СТАНДАРТ // ISO", f_badge_shop, f_badge_ar, (251, 191, 36, 255), anchor="ma")

    f_title_shop = get_font(FONT_SHOP, 50)
    f_title_ar = get_font(FONT_ARIAL, 50)
    draw_dual_font_text(d, 120, 160, "ПРОМО-МАТЕРИАЛЫ С QR", f_title_shop, f_title_ar, (255, 255, 255, 255), anchor="la")
    
    f_sub_shop = get_font(FONT_SHOP, 22)
    f_sub_ar = get_font(FONT_ARIAL, 21)
    draw_dual_font_text(d, 120, 245, "ПЛАКАТЫ А4, ТЕЙБЛТЕНТЫ И ЗАКЛАДКИ ДЛЯ ПЕЧАТИ В 1 КЛИК", f_sub_shop, f_sub_ar, (56, 189, 248, 255), anchor="la")

    cards_data = [
        ("qr", "ПЛАКАТ А4 ДЛЯ СТЕНДА", "Эталонный формат 210 x 297 мм с векторным QR-кодом сообщества и ценностями", (0, 240, 255)),
        ("printer", "ТЕЙБЛ-ТЕНТЫ А5", "Настольные двухсторонние домики для кафедр обслуживания и книжных витрин", (244, 63, 94)),
        ("bookmark", "ЗАКЛАДКИ ДЛЯ КНИГ", "4 яркие книжные закладки на лист с цитатами, шрифтом и QR-ссылкой", (168, 85, 247))
    ]
    
    y_start = 330
    card_h = 100
    card_w = 780
    gap = 22
    
    for i, (itype, title, desc, col) in enumerate(cards_data):
        y = y_start + i * (card_h + gap)
        draw_glow_rect(d, [120, y, 120 + card_w, y + card_h], (15, 23, 42, 215), (col[0], col[1], col[2], 180), (col[0], col[1], col[2], 100), radius=16)
        draw_icon(d, itype, 175, y + card_h // 2, 28, col)
        
        f_ctitle_shop = get_font(FONT_SHOP, 25)
        f_ctitle_ar = get_font(FONT_ARIAL, 25)
        draw_dual_font_text(d, 225, y + 16, title, f_ctitle_shop, f_ctitle_ar, (255, 255, 255, 255), anchor="la")
        
        f_cdesc_shop = get_font(FONT_SHOP, 18)
        f_cdesc_ar = get_font(FONT_ARIAL, 18)
        draw_wrapped_dual_text(d, 225, y + 54, desc, card_w - 120, 4, f_cdesc_shop, f_cdesc_ar, (148, 163, 184, 255), anchor="la")

    img.save(os.path.join(OUT_DIR, "overlay_scene3.png"))
    print("Overlay Scene 3 built cleanly!")

# -------------------------------------------------------------
# SCENE 4: Интерактивный чат с Космо и 10 пресетов (20.8 - 28.0s)
# -------------------------------------------------------------
def build_scene4():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    f_badge_shop = get_font(FONT_SHOP, 20)
    f_badge_ar = get_font(FONT_ARIAL, 20)
    draw_glow_rect(d, [120, 80, 520, 126], (15, 23, 42, 220), (0, 240, 255, 200), (0, 240, 255, 120), radius=22)
    draw_dual_font_text(d, 320, 93, "НЕЙРО-АССИСТЕНТ // 256K", f_badge_shop, f_badge_ar, (0, 240, 255, 255), anchor="ma")

    f_title_shop = get_font(FONT_SHOP, 52)
    f_title_ar = get_font(FONT_ARIAL, 52)
    draw_dual_font_text(d, 120, 160, "ИНТЕРАКТИВНЫЙ ЧАТ", f_title_shop, f_title_ar, (255, 255, 255, 255), anchor="la")
    
    f_sub_shop = get_font(FONT_SHOP, 22)
    f_sub_ar = get_font(FONT_ARIAL, 21)
    draw_dual_font_text(d, 120, 245, "10 ПРЕСЕТОВ ЭКСПРЕСС-АНАЛИЗА И ГЕНЕРАЦИЯ ПОСТОВ VK", f_sub_shop, f_sub_ar, (168, 85, 247, 255), anchor="la")

    cards_data = [
        ("chat", "10 ГОТОВЫХ СЦЕНАРИЕВ", "Всплывающий Bottom Sheet с умным поиском по методикам аудита групп VK", (0, 240, 255)),
        ("pen", "ГЕНЕРАЦИЯ ПОСТОВ VK", "Составление вовлекающих публикаций, викторин, контент-планов и тегов", (236, 72, 153)),
        ("check", "ОДИНОЧНЫЙ ТАП ПО КОСМО", "Удобный полноэкранный чат на смартфонах и расширенное окно на ПК", (52, 211, 153))
    ]
    
    y_start = 330
    card_h = 100
    card_w = 780
    gap = 22
    
    for i, (itype, title, desc, col) in enumerate(cards_data):
        y = y_start + i * (card_h + gap)
        draw_glow_rect(d, [120, y, 120 + card_w, y + card_h], (15, 23, 42, 215), (col[0], col[1], col[2], 180), (col[0], col[1], col[2], 100), radius=16)
        draw_icon(d, itype, 175, y + card_h // 2, 28, col)
        
        f_ctitle_shop = get_font(FONT_SHOP, 25)
        f_ctitle_ar = get_font(FONT_ARIAL, 25)
        draw_dual_font_text(d, 225, y + 16, title, f_ctitle_shop, f_ctitle_ar, (255, 255, 255, 255), anchor="la")
        
        f_cdesc_shop = get_font(FONT_SHOP, 18)
        f_cdesc_ar = get_font(FONT_ARIAL, 18)
        draw_wrapped_dual_text(d, 225, y + 54, desc, card_w - 120, 4, f_cdesc_shop, f_cdesc_ar, (148, 163, 184, 255), anchor="la")

    img.save(os.path.join(OUT_DIR, "overlay_scene4.png"))
    print("Overlay Scene 4 built cleanly!")

# -------------------------------------------------------------
# SCENE 5: Финал и гиперпрыжок (28.0 - 35.0s)
# -------------------------------------------------------------
def build_scene5():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    f_badge_shop = get_font(FONT_SHOP, 22)
    f_badge_ar = get_font(FONT_ARIAL, 22)
    draw_glow_rect(d, [W//2 - 240, 110, W//2 + 240, 162], (15, 23, 42, 230), (0, 240, 255, 220), (0, 240, 255, 140), radius=24)
    draw_dual_font_text(d, W//2, 125, "ОТКРЫТАЯ ПЛАТФОРМА // 2026", f_badge_shop, f_badge_ar, (0, 240, 255, 255), anchor="ma")

    f_title_shop = get_font(FONT_SHOP, 66)
    f_title_ar = get_font(FONT_ARIAL, 66)
    draw_dual_font_text(d, W//2, 210, "ДОБРО ПОЖАЛОВАТЬ В АВРОРУ!", f_title_shop, f_title_ar, (255, 255, 255, 255), anchor="ma")
    
    f_sub_shop = get_font(FONT_SHOP, 26)
    f_sub_ar = get_font(FONT_ARIAL, 25)
    draw_dual_font_text(d, W//2, 310, "ИНТЕЛЛЕКТУАЛЬНЫЙ АНАЛИЗ И ПРОМО-МАТЕРИАЛЫ ДЛЯ БИБЛИОТЕК", f_sub_shop, f_sub_ar, (56, 189, 248, 255), anchor="ma")

    # Central Glassmorphism Call-To-Action Box
    box_w = 920
    box_h = 160
    bx = (W - box_w) // 2
    by = 500
    draw_glow_rect(d, [bx, by, bx + box_w, by + box_h], (15, 23, 42, 235), (0, 240, 255, 255), (0, 240, 255, 160), radius=24, glow_width=12)
    
    draw_icon(d, "globe", bx + 80, by + box_h // 2, 38, (0, 240, 255))
    
    f_url_shop = get_font(FONT_SHOP, 42)
    f_url_ar = get_font(FONT_ARIAL, 42)
    draw_dual_font_text(d, bx + 150, by + 34, "BIBLIOTEKA33.RU/STAT", f_url_shop, f_url_ar, (255, 255, 255, 255), anchor="la")
    
    f_cta_shop = get_font(FONT_SHOP, 21)
    f_cta_ar = get_font(FONT_ARIAL, 21)
    draw_dual_font_text(d, bx + 150, by + 95, "ОТКРЫВАЙТЕ ПРЯМО СЕЙЧАС И ИССЛЕДУЙТЕ ДАННЫЕ ВМЕСТЕ С КОСМО!", f_cta_shop, f_cta_ar, (56, 189, 248, 255), anchor="la")

    img.save(os.path.join(OUT_DIR, "overlay_scene5.png"))
    print("Overlay Scene 5 built cleanly!")

build_scene1()
build_scene2()
build_scene3()
build_scene4()
build_scene5()
print("All 5 overlays successfully built cleanly!")
