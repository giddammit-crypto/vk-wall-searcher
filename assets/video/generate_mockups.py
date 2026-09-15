import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 840, 480
OUT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/video"
FONT_ARIAL = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/fonts/arial.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# -------------------------------------------------------------
# 1. SCENE 3 MOCKUP: Promo Materials (A4 Poster + Table-tent + Bookmarks)
# -------------------------------------------------------------
def generate_promo_mockup():
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    
    # Outer glassmorphic frame
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=20, fill=(15, 23, 42, 230), outline=(251, 191, 36, 220), width=3)
    
    # Header bar
    d.rounded_rectangle([0, 0, W - 1, 48], radius=20, fill=(30, 41, 59, 240))
    d.rectangle([0, 24, W - 1, 48], fill=(30, 41, 59, 240))
    d.line([(0, 48), (W - 1, 48)], fill=(251, 191, 36, 120), width=1)
    
    # Window controls
    d.ellipse([16, 17, 30, 31], fill=(239, 68, 68, 240))
    d.ellipse([38, 17, 52, 31], fill=(245, 158, 11, 240))
    d.ellipse([60, 17, 74, 31], fill=(16, 185, 129, 240))
    
    f_bar = get_font(FONT_ARIAL, 15)
    d.text((90, 15), "Генератор промо-материалов • Полиграфический экспорт ISO", font=f_bar, fill=(203, 213, 225, 240))
    
    # Left: A4 Poster Preview (260 x 368)
    ax, ay, aw, ah = 36, 76, 260, 374
    # Poster shadow
    d.rounded_rectangle([ax + 6, ay + 6, ax + aw + 6, ay + ah + 6], radius=8, fill=(0, 0, 0, 120))
    # Poster sheet
    d.rounded_rectangle([ax, ay, ax + aw, ay + ah], radius=8, fill=(10, 25, 47, 255), outline=(0, 240, 255, 220), width=2)
    
    # Poster content
    f_pbadge = get_font(FONT_ARIAL, 11)
    d.rounded_rectangle([ax + 16, ay + 16, ax + 148, ay + 36], radius=4, fill=(0, 240, 255, 40), outline=(0, 240, 255, 180), width=1)
    d.text((ax + 24, ay + 20), "ПЛАКАТ А4 • 210 x 297", font=f_pbadge, fill=(0, 240, 255, 255))
    
    f_ptitle = get_font(FONT_ARIAL, 15)
    d.text((ax + 16, ay + 48), "ЦЕНТРАЛЬНАЯ БИБЛИОТЕКА", font=f_ptitle, fill=(255, 255, 255, 255))
    f_psub = get_font(FONT_ARIAL, 11)
    d.text((ax + 16, ay + 68), "Книжный фонд И Новинки", font=f_psub, fill=(56, 189, 248, 255))
    
    # QR Code placeholder on poster
    q_size = 130
    qx, qy = ax + (aw - q_size) // 2, ay + 96
    d.rounded_rectangle([qx - 8, qy - 8, qx + q_size + 8, qy + q_size + 8], radius=8, fill=(255, 255, 255, 255))
    # Draw stylized QR pattern
    d.rectangle([qx, qy, qx + 36, qy + 36], fill=(0, 0, 0, 255))
    d.rectangle([qx + 8, qy + 8, qx + 28, qy + 28], fill=(255, 255, 255, 255))
    d.rectangle([qx + 12, qy + 12, qx + 24, qy + 24], fill=(0, 0, 0, 255))
    
    d.rectangle([qx + q_size - 36, qy, qx + q_size, qy + 36], fill=(0, 0, 0, 255))
    d.rectangle([qx + q_size - 28, qy + 8, qx + q_size - 8, qy + 28], fill=(255, 255, 255, 255))
    d.rectangle([qx + q_size - 24, qy + 12, qx + q_size - 12, qy + 24], fill=(0, 0, 0, 255))
    
    d.rectangle([qx, qy + q_size - 36, qx + 36, qy + q_size], fill=(0, 0, 0, 255))
    d.rectangle([qx + 8, qy + q_size - 28, qx + 28, qy + q_size - 8], fill=(255, 255, 255, 255))
    d.rectangle([qx + 12, qy + q_size - 24, qx + 24, qy + q_size - 12], fill=(0, 0, 0, 255))
    
    # Random dots in QR
    for row in range(5):
        for col in range(5):
            if (row + col) % 2 == 0:
                d.rectangle([qx + 42 + col * 9, qy + 42 + row * 9, qx + 48 + col * 9, qy + 48 + row * 9], fill=(0, 0, 0, 255))
    
    f_pbot = get_font(FONT_ARIAL, 11)
    d.text((ax + 20, ay + 250), "• Сканируй и читай онлайн", font=f_pbot, fill=(226, 232, 240, 255))
    d.text((ax + 20, ay + 270), "• Анонсы событий И афиша", font=f_pbot, fill=(226, 232, 240, 255))
    d.text((ax + 20, ay + 290), "• Бесплатный Wi-Fi И коворкинг", font=f_pbot, fill=(226, 232, 240, 255))
    
    # Middle: Table-tent preview (230 x 280)
    tx, ty, tw, th = 320, 110, 235, 290
    d.rounded_rectangle([tx + 6, ty + 6, tx + tw + 6, ty + th + 6], radius=8, fill=(0, 0, 0, 120))
    d.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=8, fill=(24, 24, 38, 255), outline=(244, 63, 94, 220), width=2)
    d.line([(tx, ty + 40), (tx + tw, ty + 40)], fill=(244, 63, 94, 140), width=1)
    
    d.text((tx + 16, ty + 12), "ТЕЙБЛ-ТЕНТ А5 (ДОМИК)", font=get_font(FONT_ARIAL, 13), fill=(244, 63, 94, 255))
    d.text((tx + 16, ty + 56), "Двухсторонняя печать", font=get_font(FONT_ARIAL, 12), fill=(255, 255, 255, 240))
    d.text((tx + 16, ty + 76), "Для кафедр и выставок", font=get_font(FONT_ARIAL, 11), fill=(148, 163, 184, 240))
    
    # Mini QR
    mq_size = 90
    mqx, mqy = tx + (tw - mq_size) // 2, ty + 110
    d.rounded_rectangle([mqx - 6, mqy - 6, mqx + mq_size + 6, mqy + mq_size + 6], radius=6, fill=(255, 255, 255, 255))
    d.rectangle([mqx, mqy, mqx + 24, mqy + 24], fill=(0, 0, 0, 255))
    d.rectangle([mqx + mq_size - 24, mqy, mqx + mq_size, mqy + 24], fill=(0, 0, 0, 255))
    d.rectangle([mqx, mqy + mq_size - 24, mqx + 24, mqy + mq_size], fill=(0, 0, 0, 255))
    
    d.text((tx + 24, ty + 230), "Линия сгиба: 148 мм", font=get_font(FONT_ARIAL, 12), fill=(244, 63, 94, 255))
    d.text((tx + 24, ty + 252), "Плотность бумаги: 250 г/м²", font=get_font(FONT_ARIAL, 11), fill=(148, 163, 184, 240))
    
    # Right: 2 Bookmarks (95 x 330 each)
    bx1, by1 = 585, 90
    bx2, by2 = 705, 115
    for bx, by, color, title in [(bx1, by1, (168, 85, 247), "ЗАКЛАДКА 1"), (bx2, by2, (52, 211, 153), "ЗАКЛАДКА 2")]:
        d.rounded_rectangle([bx + 4, by + 4, bx + 95 + 4, by + 325 + 4], radius=6, fill=(0, 0, 0, 120))
        d.rounded_rectangle([bx, by, bx + 95, by + 325], radius=6, fill=(17, 24, 39, 255), outline=(color[0], color[1], color[2], 220), width=2)
        
        # Ribbon hole
        d.ellipse([bx + 38, by + 12, bx + 56, by + 30], fill=(15, 23, 42, 255), outline=color, width=2)
        
        d.text((bx + 12, by + 42), title, font=get_font(FONT_ARIAL, 11), fill=color)
        d.text((bx + 8, by + 68), "«Книга — это", font=get_font(FONT_ARIAL, 10), fill=(255, 255, 255, 240))
        d.text((bx + 8, by + 86), "компас в мире", font=get_font(FONT_ARIAL, 10), fill=(255, 255, 255, 240))
        d.text((bx + 8, by + 104), "знаний»", font=get_font(FONT_ARIAL, 10), fill=(255, 255, 255, 240))
        
        # Mini QR on bookmark
        bq_s = 60
        bqx, bqy = bx + (95 - bq_s) // 2, by + 140
        d.rectangle([bqx - 3, bqy - 3, bqx + bq_s + 3, bqy + bq_s + 3], fill=(255, 255, 255, 255))
        d.rectangle([bqx, bqy, bqx + 16, bqy + 16], fill=(0, 0, 0, 255))
        d.rectangle([bqx + bq_s - 16, bqy, bqx + bq_s, bqy + 16], fill=(0, 0, 0, 255))
        d.rectangle([bqx, bqy + bq_s - 16, bqx + 16, bqy + bq_s], fill=(0, 0, 0, 255))
        
        d.text((bx + 14, by + 235), "Владимир", font=get_font(FONT_ARIAL, 10), fill=(148, 163, 184, 240))
        d.text((bx + 26, by + 258), "2026", font=get_font(FONT_ARIAL, 12), fill=color)
    
    canvas.save(os.path.join(OUT_DIR, "mockup_promo.png"))
    print("Promo Mockup generated cleanly!")

# -------------------------------------------------------------
# 2. SCENE 4 MOCKUP: Cosmo Chat & 10 Presets (Clean typography without emojis)
# -------------------------------------------------------------
def generate_chat_mockup():
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=20, fill=(15, 23, 42, 235), outline=(0, 240, 255, 220), width=3)
    
    # Top Chat Bar
    d.rounded_rectangle([0, 0, W - 1, 56], radius=20, fill=(30, 41, 59, 240))
    d.rectangle([0, 28, W - 1, 56], fill=(30, 41, 59, 240))
    d.line([(0, 56), (W - 1, 56)], fill=(0, 240, 255, 120), width=1)
    
    # Avatar badge
    d.ellipse([20, 12, 52, 44], fill=(0, 240, 255, 200))
    d.ellipse([46, 36, 54, 44], fill=(52, 211, 153, 255)) # online dot
    
    d.text((66, 12), "Космо • Квантовый Ассистент", font=get_font(FONT_ARIAL, 16), fill=(255, 255, 255, 255))
    d.text((66, 32), "Нейросеть AURORA AI • 10 Экспресс-сценариев", font=get_font(FONT_ARIAL, 12), fill=(56, 189, 248, 255))
    
    # Presets Bar / Clean text pills (No emoji missing glyphs)
    px = 24
    presets = [
        ("ТОП-5 постов сети", (0, 240, 255)),
        ("Аудит вовлеченности", (168, 85, 247)),
        ("Сгенерировать пост VK", (236, 72, 153)),
        ("Контент-план на неделю", (52, 211, 153))
    ]
    py = 70
    for ptext, col in presets:
        pw = len(ptext) * 8 + 28
        d.rounded_rectangle([px, py, px + pw, py + 32], radius=16, fill=(30, 41, 59, 220), outline=(col[0], col[1], col[2], 180), width=1)
        d.text((px + 14, py + 7), ptext, font=get_font(FONT_ARIAL, 12), fill=(255, 255, 255, 255))
        px += pw + 12
        if px > W - 80:
            break
            
    # Chat Messages Area
    # User message (right)
    um_w = 480
    um_h = 56
    um_x = W - um_w - 28
    um_y = 118
    d.rounded_rectangle([um_x, um_y, um_x + um_w, um_y + um_h], radius=14, fill=(37, 99, 235, 230))
    d.text((um_x + 18, um_y + 10), "Космо, сделай экспресс-аудит Центральной", font=get_font(FONT_ARIAL, 14), fill=(255, 255, 255, 255))
    d.text((um_x + 18, um_y + 30), "библиотеки и предложи пост для VK с опросом!", font=get_font(FONT_ARIAL, 14), fill=(255, 255, 255, 255))
    
    # Cosmo response (left)
    cm_w = 660
    cm_h = 184
    cm_x = 28
    cm_y = 188
    d.rounded_rectangle([cm_x, cm_y, cm_x + cm_w, cm_y + cm_h], radius=16, fill=(30, 41, 59, 240), outline=(0, 240, 255, 140), width=1)
    
    d.text((cm_x + 20, cm_y + 14), ">> Анализ завершен: ERpost 5.2% (выше среднего по сети на 18%)", font=get_font(FONT_ARIAL, 13), fill=(0, 240, 255, 255))
    d.text((cm_x + 20, cm_y + 38), "Готовый проект публикации для группы VK:", font=get_font(FONT_ARIAL, 13), fill=(255, 255, 255, 255))
    
    # Post preview inner card
    d.rounded_rectangle([cm_x + 16, cm_y + 64, cm_x + cm_w - 16, cm_y + 166], radius=10, fill=(15, 23, 42, 220), outline=(168, 85, 247, 180), width=1)
    d.text((cm_x + 30, cm_y + 74), "«Какая книга изменила ваше мировоззрение?»", font=get_font(FONT_ARIAL, 13), fill=(251, 191, 36, 255))
    d.text((cm_x + 30, cm_y + 98), "Делимся любимыми цитатами в комментариях! Первые 3 участника", font=get_font(FONT_ARIAL, 12), fill=(226, 232, 240, 255))
    d.text((cm_x + 30, cm_y + 118), "получат эксклюзивную закладку с QR-гидом по новинкам месяца.", font=get_font(FONT_ARIAL, 12), fill=(226, 232, 240, 255))
    d.text((cm_x + 30, cm_y + 140), "#Библиотека33 #Владимир #Чтение #КнижныйКлуб", font=get_font(FONT_ARIAL, 12), fill=(56, 189, 248, 255))
    
    # Input Area Bottom
    bx, by, bw, bh = 28, 400, W - 56, 56
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=28, fill=(15, 23, 42, 240), outline=(0, 240, 255, 140), width=1)
    d.text((bx + 26, by + 18), "Спросите Космо о показателях библиотек или нажмите на пресет...", font=get_font(FONT_ARIAL, 13), fill=(148, 163, 184, 255))
    
    # Send button
    sb_w = 42
    d.ellipse([bx + bw - 48, by + 7, bx + bw - 6, by + 49], fill=(0, 240, 255, 240))
    d.polygon([(bx + bw - 32, by + 20), (bx + bw - 20, by + 28), (bx + bw - 32, by + 36)], fill=(15, 23, 42, 255))
    
    canvas.save(os.path.join(OUT_DIR, "mockup_chat.png"))
    print("Chat Mockup generated cleanly!")

if __name__ == "__main__":
    generate_promo_mockup()
    generate_chat_mockup()
