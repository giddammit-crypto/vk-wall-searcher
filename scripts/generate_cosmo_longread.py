#!/usr/bin/env python3
"""
AURORA Cosmo Longread Infographic Generator (AAA Polish)
Creates a high-resolution, pixel-perfect vertical infographic (1200x3700)
presenting Cosmo's complete dual capability:
1. Aurora Web Platform (SMM Analytics, Post Search, AI Content Analyst, Interactive Stage)
2. VK Chat Bot (@cosmobibliobot, Voice STT, Book Recommendations, Moderation, Quiz, News)
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASCOT_DIR = os.path.join(BASE_DIR, "assets", "images", "mascot")
OUTPUT_PATH = os.path.join(BASE_DIR, "assets", "images", "cosmo_longread_infographic.png")
OUTPUT_SITE_PATH = os.path.join(BASE_DIR, "site-cosmo", "assets", "images", "cosmo_longread_infographic.png")

# Dimensions
WIDTH = 1200
HEIGHT = 3700

# Fonts
FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def get_font(size, bold=False):
    path = FONT_BOLD_PATH if bold else FONT_REG_PATH
    return ImageFont.truetype(path, size)

# Color Palette (Aurora AAA Emerald & Space)
BG_TOP = (11, 23, 18)
BG_MID1 = (14, 32, 25)
BG_MID2 = (16, 40, 31)
BG_BOT = (9, 18, 15)

TEXT_CREAM = (252, 248, 240)
TEXT_MUTED = (195, 225, 210)
TEXT_DIM = (135, 170, 150)

ACCENT_EMERALD = (47, 162, 110)
ACCENT_MINT = (82, 215, 154)
ACCENT_CYAN = (0, 225, 255)
ACCENT_GOLD = (245, 200, 66)
ACCENT_CORAL = (250, 93, 89)

CARD_BG = (22, 45, 36, 230)
CARD_BORDER = (47, 162, 110, 110)
CARD_BORDER_CYAN = (0, 225, 255, 110)

def create_gradient_canvas():
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BG_TOP)
    draw = ImageDraw.Draw(canvas)
    
    # Smooth vertical multi-stop gradient
    for y in range(HEIGHT):
        ratio = y / float(HEIGHT)
        if ratio < 0.35:
            r1 = ratio / 0.35
            r = int(BG_TOP[0] + (BG_MID1[0] - BG_TOP[0]) * r1)
            g = int(BG_TOP[1] + (BG_MID1[1] - BG_TOP[1]) * r1)
            b = int(BG_TOP[2] + (BG_MID1[2] - BG_TOP[2]) * r1)
        elif ratio < 0.70:
            r1 = (ratio - 0.35) / 0.35
            r = int(BG_MID1[0] + (BG_MID2[0] - BG_MID1[0]) * r1)
            g = int(BG_MID1[1] + (BG_MID2[1] - BG_MID1[1]) * r1)
            b = int(BG_MID1[2] + (BG_MID2[2] - BG_MID1[2]) * r1)
        else:
            r1 = (ratio - 0.70) / 0.30
            r = int(BG_MID2[0] + (BG_BOT[0] - BG_MID2[0]) * r1)
            g = int(BG_MID2[1] + (BG_BOT[1] - BG_MID2[1]) * r1)
            b = int(BG_MID2[2] + (BG_BOT[2] - BG_MID2[2]) * r1)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))
        
    # Glow orbs in background
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    
    gdraw.ellipse([WIDTH//2 - 450, -180, WIDTH//2 + 450, 480], fill=(47, 162, 110, 45))
    gdraw.ellipse([-220, 1150, 420, 1850], fill=(82, 215, 154, 30))
    gdraw.ellipse([WIDTH - 380, 1950, WIDTH + 280, 2600], fill=(0, 225, 255, 30))
    gdraw.ellipse([WIDTH//2 - 480, HEIGHT - 700, WIDTH//2 + 480, HEIGHT + 200], fill=(47, 162, 110, 35))
    
    glow = glow.filter(ImageFilter.GaussianBlur(130))
    canvas = Image.alpha_composite(canvas, glow)
    
    # Decorative subtle cyber grid
    grid = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grdraw = ImageDraw.Draw(grid)
    for x in range(0, WIDTH, 80):
        grdraw.line([(x, 0), (x, HEIGHT)], fill=(82, 215, 154, 8), width=1)
    for y in range(0, HEIGHT, 80):
        grdraw.line([(0, y), (WIDTH, y)], fill=(82, 215, 154, 8), width=1)
    
    canvas = Image.alpha_composite(canvas, grid)
    return canvas

def draw_pill(draw, box, fill, outline=None, width=1, radius=16):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_card(draw, x, y, w, h, icon_sym, title, text, badge="", badge_col=ACCENT_MINT, border_col=CARD_BORDER):
    # Card Background
    draw.rounded_rectangle([x, y, x + w, y + h], radius=20, fill=CARD_BG, outline=border_col, width=2)
    
    # Glow accent indicator
    draw.rounded_rectangle([x, y + 16, x + 6, y + h - 16], radius=3, fill=badge_col)
    
    curr_y = y + 18
    if badge:
        f_b = get_font(12, bold=True)
        bw = f_b.getlength(badge) + 20
        draw.rounded_rectangle([x + 24, curr_y, x + 24 + bw, curr_y + 24], radius=8, fill=(35, 75, 58, 240), outline=badge_col, width=1)
        draw.text((x + 34, curr_y + 4), badge, font=f_b, fill=badge_col)
        curr_y += 34
    
    # Title with bullet prefix
    f_t = get_font(19, bold=True)
    full_title = f"{icon_sym}  {title}" if icon_sym else title
    draw.text((x + 24, curr_y), full_title, font=f_t, fill=TEXT_CREAM)
    curr_y += 30
    
    # Body text with word wrap
    f_tx = get_font(14, bold=False)
    words = text.split(" ")
    line = ""
    for word in words:
        test_line = line + (" " if line else "") + word
        if f_tx.getlength(test_line) > (w - 48):
            draw.text((x + 24, curr_y), line, font=f_tx, fill=TEXT_MUTED)
            curr_y += 20
            line = word
        else:
            line = test_line
    if line:
        draw.text((x + 24, curr_y), line, font=f_tx, fill=TEXT_MUTED)

def main():
    print("🎨 Generating Cosmo Longread Infographic (1200x3700)...")
    im = create_gradient_canvas()
    d = ImageDraw.Draw(im)
    
    # -------------------------------------------------------------------------
    # 1. TOP HEADER SECTION
    # -------------------------------------------------------------------------
    top_badge = "AURORA × ЦБС Г. ВЛАДИМИРА · ВЕРСИЯ 4.38.0"
    fb = get_font(14, bold=True)
    tbw = fb.getlength(top_badge) + 32
    draw_pill(d, [(WIDTH - tbw)//2, 55, (WIDTH + tbw)//2, 89], fill=(30, 65, 50, 240), outline=ACCENT_MINT, radius=12)
    d.text(((WIDTH - tbw)//2 + 16, 63), top_badge, font=fb, fill=ACCENT_MINT)
    
    f_main = get_font(56, bold=True)
    t_main = "РОБОТ КОСМО"
    mw = f_main.getlength(t_main)
    d.text(((WIDTH - mw)//2, 110), t_main, font=f_main, fill=TEXT_CREAM)
    
    f_sub = get_font(23, bold=True)
    t_sub = "Единый цифровой интеллект библиотечной сети г. Владимира"
    sw = f_sub.getlength(t_sub)
    d.text(((WIDTH - sw)//2, 180), t_sub, font=f_sub, fill=ACCENT_MINT)
    
    f_desc = get_font(16, bold=False)
    t_desc = "Автономный SMM-аналитик платформы AURORA  +  Умный чат-бот ВКонтакте @cosmobibliobot"
    dw = f_desc.getlength(t_desc)
    d.text(((WIDTH - dw)//2, 218), t_desc, font=f_desc, fill=TEXT_DIM)
    
    # -------------------------------------------------------------------------
    # 2. HERO MASCOT & SPEECH BUBBLE
    # -------------------------------------------------------------------------
    robot_file = os.path.join(MASCOT_DIR, "robot_smile.png")
    if os.path.exists(robot_file):
        r_im = Image.open(robot_file).convert("RGBA")
        r_im = r_im.resize((340, 340), Image.Resampling.LANCZOS)
        
        # Soft shadow under mascot
        shadow = Image.new("RGBA", (340, 60), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow)
        sdraw.ellipse([30, 10, 310, 50], fill=(0, 0, 0, 190))
        shadow = shadow.filter(ImageFilter.GaussianBlur(14))
        im.paste(shadow, ((WIDTH - 340)//2, 595), shadow)
        
        # Paste robot
        im.paste(r_im, ((WIDTH - 340)//2, 275), r_im)
    
    # Speech bubble next to robot
    bx1, by1, bx2, by2 = 120, 635, WIDTH - 120, 755
    d.rounded_rectangle([bx1, by1, bx2, by2], radius=24, fill=(24, 52, 42, 240), outline=ACCENT_MINT, width=2)
    
    # Pointer triangle on bubble top
    d.polygon([(WIDTH//2 - 15, by1), (WIDTH//2 + 15, by1), (WIDTH//2, by1 - 16)], fill=(24, 52, 42, 240))
    d.line([(WIDTH//2 - 15, by1), (WIDTH//2, by1 - 16)], fill=ACCENT_MINT, width=2)
    d.line([(WIDTH//2 + 15, by1), (WIDTH//2, by1 - 16)], fill=ACCENT_MINT, width=2)
    
    f_quote = get_font(18, bold=True)
    f_quote_t = get_font(16, bold=False)
    d.text((bx1 + 32, by1 + 18), "«Привет, Владимир! Я робот Космо —", font=f_quote, fill=ACCENT_GOLD)
    quote_text = "Я помогаю читателям ориентироваться в фондах 16 библиотек, нахожу книги под настроение, расшифровываю голосовые, защищаю беседы от мата и веду аналитику всех пабликов ЦБС!»"
    
    words = quote_text.split(" ")
    line = ""
    qy = by1 + 48
    for w in words:
        tl = line + (" " if line else "") + w
        if f_quote_t.getlength(tl) > (bx2 - bx1 - 64):
            d.text((bx1 + 32, qy), line, font=f_quote_t, fill=TEXT_CREAM)
            qy += 24
            line = w
        else:
            line = tl
    if line:
        d.text((bx1 + 32, qy), line, font=f_quote_t, fill=TEXT_CREAM)

    # -------------------------------------------------------------------------
    # 3. QUICK STATS STRIP (4 KPI Badges)
    # -------------------------------------------------------------------------
    stats = [
        ("16", "Филиалов ЦБС", "полный мониторинг"),
        ("3 МЛН", "Токенов в сутки", "4 ключа xkiro"),
        ("17", "Эмоций и поз", "стикерпак 512px"),
        ("24/7", "Voice ASR", "распознавание речи")
    ]
    sw_card = (WIDTH - 120 - 3 * 20) // 4
    for idx, (num, lbl1, lbl2) in enumerate(stats):
        sx = 60 + idx * (sw_card + 20)
        sy = 780
        sh = 95
        d.rounded_rectangle([sx, sy, sx + sw_card, sy + sh], radius=16, fill=(28, 58, 47, 210), outline=CARD_BORDER, width=1)
        f_num = get_font(26, bold=True)
        d.text((sx + 20, sy + 14), num, font=f_num, fill=ACCENT_GOLD if idx==1 else (ACCENT_CYAN if idx==3 else ACCENT_MINT))
        f_l1 = get_font(14, bold=True)
        f_l2 = get_font(12, bold=False)
        d.text((sx + 20, sy + 48), lbl1, font=f_l1, fill=TEXT_CREAM)
        d.text((sx + 20, sy + 68), lbl2, font=f_l2, fill=TEXT_DIM)

    # -------------------------------------------------------------------------
    # 4. SECTION 1: АВРОРА (SMM-аналитика и веб-платформа)
    # -------------------------------------------------------------------------
    sec1_y = 920
    
    d.line([(60, sec1_y), (WIDTH - 60, sec1_y)], fill=(47, 162, 110, 80), width=1)
    f_sh = get_font(14, bold=True)
    sec_pill = "МОДУЛЬ 1 · ВЕБ-ПЛАТФОРМА AURORA (SMM-ХАБ)"
    spw = f_sh.getlength(sec_pill) + 32
    d.rounded_rectangle([60, sec1_y - 16, 60 + spw, sec1_y + 16], radius=10, fill=(35, 75, 58), outline=ACCENT_MINT, width=1)
    d.text((76, sec1_y - 8), sec_pill, font=f_sh, fill=TEXT_CREAM)
    
    f_st = get_font(32, bold=True)
    d.text((60, sec1_y + 30), "Аналитика и поиск по 16 филиалам", font=f_st, fill=TEXT_CREAM)
    f_st_sub = get_font(16, bold=False)
    d.text((60, sec1_y + 72), "Веб-приложение для сотрудников и читателей: мониторинг пабликов, охваты, тренды и интерактив.", font=f_st_sub, fill=TEXT_MUTED)

    cards_a = [
        {
            "icon": "[ ER ]",
            "title": "Сквозная SMM-аналитика",
            "badge": "МЕТРИКИ & ОХВАТЫ",
            "badge_col": ACCENT_MINT,
            "text": "Автоматический сбор статистики по всем 16 пабликам ЦБС Владимира. Расчёт Engagement Rate (ER, ER View), анализ динамики лайков, репостов, комментариев и виральности публикаций."
        },
        {
            "icon": "[ FIND ]",
            "title": "Молниеносный поиск по стене",
            "badge": "АРХИВ ПУБЛИКАЦИЙ",
            "badge_col": ACCENT_CYAN,
            "text": "Полнотекстовый поиск по тысячам постов из стен ВКонтакте. Мгновенные фильтры по филиалам, датам, авторам, ключевым словам и хэштегам библиотечных мероприятий."
        },
        {
            "icon": "[ AI ]",
            "title": "ИИ-аналитик контента (Mistral)",
            "badge": "НЕЙРОСЕТЬ",
            "badge_col": ACCENT_GOLD,
            "text": "Глубокий контент-анализ на базе модели Mistral Large. Генерация свежих идей для вирусных публикаций, адаптация инфоповодов и подсказки по повышению вовлечённости читателей."
        },
        {
            "icon": "[ STAGE ]",
            "title": "Интерактивная сцена Космо",
            "badge": "AAA MOTION & ЗВУК",
            "badge_col": ACCENT_MINT,
            "text": "17 живых режимов персонажа: пульт управления настроением, реакция на клики, физика перетаскивания, аудио-реплики и автономный цикл жизни маскота."
        }
    ]

    card_w = (WIDTH - 120 - 24) // 2
    card_h = 165
    start_y = sec1_y + 115

    for i, c in enumerate(cards_a):
        cx = 60 + (i % 2) * (card_w + 24)
        cy = start_y + (i // 2) * (card_h + 20)
        draw_card(d, cx, cy, card_w, card_h, c["icon"], c["title"], c["text"], c["badge"], c["badge_col"], CARD_BORDER)

    # -------------------------------------------------------------------------
    # 5. SECTION 2: ЧАТ-БОТ ВКОНТАКТЕ (@cosmobibliobot)
    # -------------------------------------------------------------------------
    sec2_y = 1520
    
    d.line([(60, sec2_y), (WIDTH - 60, sec2_y)], fill=(0, 225, 255, 80), width=1)
    sec_pill2 = "МОДУЛЬ 2 · УМНЫЙ ЧАТ-БОТ ВКОНТАКТЕ (@cosmobibliobot)"
    spw2 = f_sh.getlength(sec_pill2) + 32
    d.rounded_rectangle([60, sec2_y - 16, 60 + spw2, sec2_y + 16], radius=10, fill=(20, 65, 75), outline=ACCENT_CYAN, width=1)
    d.text((76, sec2_y - 8), sec_pill2, font=f_sh, fill=TEXT_CREAM)

    d.text((60, sec2_y + 30), "Интеллектуальный помощник читателя 24/7", font=f_st, fill=TEXT_CREAM)
    d.text((60, sec2_y + 72), "Персональные книжные советы, распознавание голоса, литературные квизы и авто-модерация чатов.", font=f_st_sub, fill=TEXT_MUTED)

    cards_b = [
        {
            "icon": "[ BOOK ]",
            "title": "Книги по 6 настроениям",
            "badge": "РЕКОМЕНДАЦИИ",
            "badge_col": ACCENT_CYAN,
            "text": "Персональный подбор книг под запрос (драйв, уют, детектив, классика, sci-fi, вдохновение) с точной адресацией по районам Владимира (Доброе, Центр, Юго-Запад)."
        },
        {
            "icon": "[ VOICE ]",
            "title": "Голосовое управление (Voice ASR)",
            "badge": "БЕЗ РУК",
            "badge_col": ACCENT_MINT,
            "text": "Мгновенная расшифровка аудиосообщений: нативное нейрораспознавание VK Neural ASR + Google Speech API v2 (FLAC 16kHz). Понимает читателя с полуслова."
        },
        {
            "icon": "[ GUARD ]",
            "title": "Модерация мата и вульгарных картинок",
            "badge": "VISION AI МОДЕРАТОР",
            "badge_col": ACCENT_CORAL,
            "text": "Распознавание нецензурной лексики и непристойных картинок/мемов через Vision AI. Лестница: 3 предупреждения → 15 минут мут → 1 час мут → исключение из беседы."
        },
        {
            "icon": "[ QUIZ ]",
            "title": "Интерактивный Клуб & Квизы",
            "badge": "ГЕЙМИФИКАЦИЯ",
            "badge_col": ACCENT_GOLD,
            "text": "Еженедельные голосования за книгу недели, литературные викторины, опросы и турнирная таблица читателей. Начисление баллов за правильные ответы!"
        },
        {
            "icon": "[ NEWS ]",
            "title": "Свежий дайджест 16 филиалов",
            "badge": "НОВОСТИ В 1 КЛИК",
            "badge_col": ACCENT_MINT,
            "text": "Сводка последних публикаций и анонсов всех филиалов ЦБС. Читатели всегда в курсе мастер-классов, лекций, выставок и встреч в библиотеках города."
        },
        {
            "icon": "[ USER ]",
            "title": "Персонализация читателей",
            "badge": "VK PROFILE API",
            "badge_col": ACCENT_CYAN,
            "text": "Обращение к читателям по реальным именам из профилей ВКонтакте (users.get), уважительный тон, отсутствие канцелярита и тёплый юмор Космо."
        }
    ]

    start_y2 = sec2_y + 115
    for i, c in enumerate(cards_b):
        cx = 60 + (i % 2) * (card_w + 24)
        cy = start_y2 + (i // 2) * (card_h + 20)
        draw_card(d, cx, cy, card_w, card_h, c["icon"], c["title"], c["text"], c["badge"], c["badge_col"], CARD_BORDER_CYAN if "CYAN" in str(c["badge_col"]) else CARD_BORDER)

    # -------------------------------------------------------------------------
    # 6. SECTION 3: ТЕХНОЛОГИЧЕСКИЙ СТЕК & НАДЁЖНОСТЬ
    # -------------------------------------------------------------------------
    sec3_y = 2200
    d.line([(60, sec3_y), (WIDTH - 60, sec3_y)], fill=(245, 200, 66, 80), width=1)
    sec_pill3 = "ТЕХНИЧЕСКИЕ ИННОВАЦИИ & ОТКАЗОУСТОЙЧИВОСТЬ"
    spw3 = f_sh.getlength(sec_pill3) + 32
    d.rounded_rectangle([60, sec3_y - 16, 60 + spw3, sec3_y + 16], radius=10, fill=(75, 60, 20), outline=ACCENT_GOLD, width=1)
    d.text((76, sec3_y - 8), sec_pill3, font=f_sh, fill=TEXT_CREAM)

    d.text((60, sec3_y + 30), "Архитектура Zero Downtime", font=f_st, fill=TEXT_CREAM)
    d.text((60, sec3_y + 72), "Безотказная работа в режиме пиковых нагрузок и безопасность читателей.", font=f_st_sub, fill=TEXT_MUTED)

    tech_cards = [
        ("[ POOL ] Пул из 4 ключей ИИ (3 000 000 токенов/24ч)", "Автоматическая циклическая ротация при лимитах или сетевых задержках. 2 ключа по 1 млн токенов + 2 ключа по 500 тыс токенов обеспечивают полную бесперебойность."),
        ("[ STICKERS ] Стикерпак из 17 фирменных эмоций", "Собственная библиотека 512×512 PNG с прозрачным фоном, загруженная напрямую на серверы ВКонтакте для мгновенной отправки в чаты."),
        ("[ PRIVACY ] Безопасность и соблюдение 152-ФЗ", "Все серверные ключи изолированы в непубличной директории, данные пользователей не сохраняются на сторонних ресурсах, строгая защита личной переписки.")
    ]

    tech_w = WIDTH - 120
    tech_h = 100
    ty = sec3_y + 115
    f_tt = get_font(18, bold=True)
    f_td = get_font(14, bold=False)

    for t_title, t_desc in tech_cards:
        d.rounded_rectangle([60, ty, 60 + tech_w, ty + tech_h], radius=16, fill=(24, 48, 38, 230), outline=(245, 200, 66, 100), width=1)
        d.rounded_rectangle([60, ty + 12, 66, ty + tech_h - 12], radius=3, fill=ACCENT_GOLD)
        d.text((82, ty + 16), t_title, font=f_tt, fill=TEXT_CREAM)
        
        # Wrap description text
        words = t_desc.split(" ")
        w_line = ""
        wy = ty + 46
        for w in words:
            test_line = w_line + (" " if w_line else "") + w
            if f_td.getlength(test_line) > (tech_w - 48):
                d.text((82, wy), w_line, font=f_td, fill=TEXT_MUTED)
                wy += 20
                w_line = w
            else:
                w_line = test_line
        if w_line:
            d.text((82, wy), w_line, font=f_td, fill=TEXT_MUTED)
            
        ty += tech_h + 16

    # -------------------------------------------------------------------------
    # 7. SECTION 4: ГАЛЕРЕЯ ЭМОЦИЙ КОСМО (17 стикеров)
    # -------------------------------------------------------------------------
    sec4_y = 2690
    d.line([(60, sec4_y), (WIDTH - 60, sec4_y)], fill=(47, 162, 110, 80), width=1)
    d.text((60, sec4_y + 25), "17 официальных эмоций робота Космо", font=get_font(26, bold=True), fill=TEXT_CREAM)
    d.text((60, sec4_y + 62), "Аутентичный маскот владимирских библиотек, созданный специально для читателей и сотрудников.", font=get_font(15, bold=False), fill=TEXT_DIM)

    emotions = [
        ("robot_smile.png", "Улыбка"), ("robot_wink.png", "Подмигивание"), ("robot_idea.png", "Эврика!"),
        ("robot_read.png", "Чтение"), ("robot_laugh.png", "Смех"), ("robot_love.png", "Любовь"),
        ("robot_cool.png", "Стиль"), ("robot_party.png", "Праздник"), ("robot_waving.png", "Привет!"),
        ("robot_thinking.png", "Задумался"), ("robot_shock.png", "Удивление"), ("robot_sad.png", "Грусть"),
        ("robot_tired.png", "Устал"), ("robot_yawn.png", "Зевота"), ("robot_sleep.png", "Сон"),
        ("robot_angry.png", "Стоп-мат!"), ("robot_idle.png", "В строю")
    ]

    stk_y1 = sec4_y + 100
    stk_y2 = stk_y1 + 130
    stk_box_w = (WIDTH - 120 - 8 * 12) // 9  # 9 in row 1, 8 in row 2

    for idx, (efile, elabel) in enumerate(emotions):
        is_row2 = (idx >= 9)
        col = (idx - 9) if is_row2 else idx
        row_y = stk_y2 if is_row2 else stk_y1
        
        offset_x = 60 + (stk_box_w // 2 if is_row2 else 0)
        bx = offset_x + col * (stk_box_w + 12)
        
        d.rounded_rectangle([bx, row_y, bx + stk_box_w, row_y + 115], radius=12, fill=(20, 42, 34, 200), outline=(47, 162, 110, 90), width=1)
        
        epath = os.path.join(MASCOT_DIR, efile)
        if os.path.exists(epath):
            eim = Image.open(epath).convert("RGBA")
            eim = eim.resize((66, 66), Image.Resampling.LANCZOS)
            im.paste(eim, (bx + (stk_box_w - 66)//2, row_y + 10), eim)
            
        f_el = get_font(11, bold=True)
        elw = f_el.getlength(elabel)
        d.text((bx + (stk_box_w - elw)//2, row_y + 86), elabel, font=f_el, fill=TEXT_MUTED)

    # -------------------------------------------------------------------------
    # 8. FOOTER CALL-TO-ACTION (CTA)
    # -------------------------------------------------------------------------
    cta_y = 3080
    d.rounded_rectangle([60, cta_y, WIDTH - 60, cta_y + 240], radius=28, fill=(20, 46, 36, 240), outline=ACCENT_MINT, width=2)
    
    f_cta_b = get_font(15, bold=True)
    d.rounded_rectangle([90, cta_y + 30, 90 + 260, cta_y + 62], radius=10, fill=(35, 80, 60), outline=ACCENT_MINT, width=1)
    d.text((106, cta_y + 38), "ПРИСОЕДИНЯЙТЕСЬ К НАМ", font=f_cta_b, fill=TEXT_CREAM)
    
    f_cta_h = get_font(34, bold=True)
    d.text((90, cta_y + 78), "Попробуйте Космо в действии прямо сейчас!", font=f_cta_h, fill=TEXT_CREAM)
    
    f_cta_sub = get_font(17, bold=False)
    d.text((90, cta_y + 128), "Напишите в сообщения сообщества vk.com/cosmobibliobot или откройте веб-систему AURORA.", font=f_cta_sub, fill=TEXT_MUTED)

    btn1_w = 340
    d.rounded_rectangle([90, cta_y + 165, 90 + btn1_w, cta_y + 215], radius=14, fill=ACCENT_EMERALD)
    f_btn = get_font(16, bold=True)
    d.text((115, cta_y + 180), " Написать Космо ВКонтакте", font=f_btn, fill=TEXT_CREAM)

    d.rounded_rectangle([90 + btn1_w + 20, cta_y + 165, 90 + btn1_w + 20 + 360, cta_y + 215], radius=14, fill=(32, 68, 54), outline=ACCENT_MINT, width=1)
    d.text((90 + btn1_w + 45, cta_y + 180), " Открыть веб-систему AURORA", font=f_btn, fill=ACCENT_MINT)

    # -------------------------------------------------------------------------
    # 9. BOTTOM BRANDING
    # -------------------------------------------------------------------------
    f_foot = get_font(14, bold=False)
    foot_text = "МБУК «Центральная городская библиотека» г. Владимира · Проект AURORA 2026"
    fw = f_foot.getlength(foot_text)
    d.text(((WIDTH - fw)//2, HEIGHT - 180), foot_text, font=f_foot, fill=TEXT_DIM)
    
    f_hash = get_font(13, bold=False)
    hash_text = "vk.com/cosmobibliobot · #библиотекивладимира #роботкосмо #аврора"
    hw = f_hash.getlength(hash_text)
    d.text(((WIDTH - hw)//2, HEIGHT - 150), hash_text, font=f_hash, fill=(82, 140, 110))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_SITE_PATH), exist_ok=True)
    
    rgb_im = im.convert("RGB")
    rgb_im.save(OUTPUT_PATH, "PNG", quality=95, optimize=True)
    rgb_im.save(OUTPUT_SITE_PATH, "PNG", quality=95, optimize=True)
    
    print(f"✓ Saved polished longread infographic to: {OUTPUT_PATH}")
    print(f"✓ Dimensions: {im.size[0]}x{im.size[1]} px | File size: {os.path.getsize(OUTPUT_PATH) // 1024} KB")

if __name__ == "__main__":
    main()
