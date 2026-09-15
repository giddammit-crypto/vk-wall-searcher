import os, sys, math, time, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php"
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
VIDEO_DIR = os.path.join(ASSETS_DIR, "video")
PIXAR_DIR = os.path.join(VIDEO_DIR, "pixar_assets")

W, H = 1920, 1080
FPS = 30
TOTAL_DURATION = 35.0
TOTAL_FRAMES = int(TOTAL_DURATION * FPS) # 1050 frames

FONT_SHOP = os.path.join(ASSETS_DIR, "fonts", "ShoptronicSP-Regular.ttf")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

print("Preloading verified real assets (zero AI slop)...")
bg_studio = Image.open(os.path.join(PIXAR_DIR, "bg_cream_studio.png")).convert("RGBA")
BG_W, BG_H = bg_studio.size

# Exact Mascot Sprites (800x800)
cosmo_idle = Image.open(os.path.join(PIXAR_DIR, "robot_idle_800.png")).convert("RGBA")
cosmo_smile = Image.open(os.path.join(PIXAR_DIR, "robot_smile_800.png")).convert("RGBA")
cosmo_thinking = Image.open(os.path.join(PIXAR_DIR, "robot_thinking_800.png")).convert("RGBA")
cosmo_dizzy = Image.open(os.path.join(PIXAR_DIR, "robot_dizzy_800.png")).convert("RGBA")
cosmo_glasses = Image.open(os.path.join(PIXAR_DIR, "robot_glasses_800.png")).convert("RGBA")
cosmo_bookmark = Image.open(os.path.join(PIXAR_DIR, "robot_bookmark_800.png")).convert("RGBA")

# Real Product UI Windows (Provided by user)
window_search = Image.open(os.path.join(PIXAR_DIR, "window_search_real.png")).convert("RGBA")
window_bookmarks = Image.open(os.path.join(PIXAR_DIR, "window_bookmarks_real.png")).convert("RGBA")
window_chat = Image.open(os.path.join(PIXAR_DIR, "window_chat_real.png")).convert("RGBA")
framed_analytics = Image.open(os.path.join(PIXAR_DIR, "framed_analytics_er.png")).convert("RGBA")

# -------------------------------------------------------------
# 1. KINETIC TYPOGRAPHY & FROSTED GLASS CARD ENGINE
# -------------------------------------------------------------
def spring_ease(t_elapsed, duration=0.42):
    if t_elapsed < 0:
        return 0.0, 0.0, 35.0
    p = min(1.0, t_elapsed / duration)
    if p >= 1.0:
        return 1.0, 1.0, 0.0
    scale = 1.0 + 0.15 * math.sin(p * math.pi) * math.exp(-p * 3.5)
    alpha = min(1.0, p / 0.28)
    y_offset = (1.0 - p) * 30.0
    return scale, alpha, y_offset

def draw_pill_badge(d, cx, cy, text, bg_col, text_col, border_col):
    f_badge = get_font(FONT_BOLD, 14)
    bbox = d.textbbox((0, 0), text, font=f_badge)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 16, 7
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    x1, y1 = cx - bw // 2, cy - bh // 2
    x2, y2 = x1 + bw, y1 + bh
    
    d.rounded_rectangle([x1 + 2, y1 + 3, x2 + 2, y2 + 3], radius=bh//2, fill=(180, 165, 150, 40))
    d.rounded_rectangle([x1, y1, x2, y2], radius=bh//2, fill=bg_col, outline=border_col, width=1)
    d.text((x1 + pad_x, y1 + pad_y - 1), text, font=f_badge, fill=text_col)

def draw_frosted_card(canvas, x, y, w, h, icon_type, title, desc, accent_col, t_elapsed):
    scale, alpha, y_off = spring_ease(t_elapsed, duration=0.40)
    if alpha <= 0.01:
        return
        
    cur_y = int(y + y_off)
    card_buf = Image.new("RGBA", (w + 24, h + 24), (0, 0, 0, 0))
    d_c = ImageDraw.Draw(card_buf)
    bx1, by1 = 12, 10
    bx2, by2 = bx1 + w, by1 + h
    
    # Shadow
    d_c.rounded_rectangle([bx1 + 4, by1 + 6, bx2 + 4, by2 + 6], radius=16, fill=(160, 145, 130, 40))
    # Body
    d_c.rounded_rectangle([bx1, by1, bx2, by2], radius=16, fill=(255, 255, 255, 240), outline=(226, 218, 205, 220), width=1)
    # Accent indicator bar
    d_c.rounded_rectangle([bx1 + 3, by1 + 12, bx1 + 7, by2 - 12], radius=2, fill=accent_col)
    
    # Icon circle
    ic_cx, ic_cy, ic_r = bx1 + 44, by1 + h // 2, 20
    d_c.ellipse([ic_cx - ic_r, ic_cy - ic_r, ic_cx + ic_r, ic_cy + ic_r], fill=(accent_col[0], accent_col[1], accent_col[2], 25), outline=accent_col, width=1)
    
    if icon_type == "robot":
        d_c.rounded_rectangle([ic_cx - 9, ic_cy - 7, ic_cx + 9, ic_cy + 7], radius=3, fill=accent_col)
        d_c.line([(ic_cx, ic_cy - 7), (ic_cx, ic_cy - 11)], fill=accent_col, width=2)
        d_c.ellipse([ic_cx - 5, ic_cy - 2, ic_cx - 1, ic_cy + 2], fill=(255, 255, 255, 255))
        d_c.ellipse([ic_cx + 1, ic_cy - 2, ic_cx + 5, ic_cy + 2], fill=(255, 255, 255, 255))
    elif icon_type == "lightning":
        d_c.polygon([(ic_cx - 2, ic_cy - 10), (ic_cx + 6, ic_cy - 2), (ic_cx + 1, ic_cy - 1), (ic_cx + 3, ic_cy + 10), (ic_cx - 5, ic_cy + 2), (ic_cx - 1, ic_cy + 1)], fill=accent_col)
    elif icon_type == "bars":
        d_c.rectangle([ic_cx - 8, ic_cy + 2, ic_cx - 3, ic_cy + 9], fill=accent_col)
        d_c.rectangle([ic_cx - 2, ic_cy - 4, ic_cx + 3, ic_cy + 9], fill=accent_col)
        d_c.rectangle([ic_cx + 4, ic_cy - 9, ic_cx + 9, ic_cy + 9], fill=accent_col)
    elif icon_type == "star":
        d_c.polygon([(ic_cx, ic_cy - 10), (ic_cx + 3, ic_cy - 3), (ic_cx + 10, ic_cy - 3), (ic_cx + 4, ic_cy + 2), (ic_cx + 6, ic_cy + 9), (ic_cx, ic_cy + 5), (ic_cx - 6, ic_cy + 9), (ic_cx - 4, ic_cy + 2), (ic_cx - 10, ic_cy - 3), (ic_cx - 3, ic_cy - 3)], fill=accent_col)
    elif icon_type == "qr":
        d_c.rectangle([ic_cx - 8, ic_cy - 8, ic_cx + 8, ic_cy + 8], outline=accent_col, width=2)
        d_c.rectangle([ic_cx - 4, ic_cy - 4, ic_cx - 1, ic_cy - 1], fill=accent_col)
        d_c.rectangle([ic_cx + 1, ic_cy - 4, ic_cx + 4, ic_cy - 1], fill=accent_col)
        d_c.rectangle([ic_cx - 4, ic_cy + 1, ic_cx - 1, ic_cy + 4], fill=accent_col)
    elif icon_type == "chat":
        d_c.rounded_rectangle([ic_cx - 9, ic_cy - 7, ic_cx + 9, ic_cy + 5], radius=3, fill=accent_col)
        d_c.polygon([(ic_cx - 5, ic_cy + 5), (ic_cx - 9, ic_cy + 10), (ic_cx - 2, ic_cy + 5)], fill=accent_col)
    else:
        d_c.line([(ic_cx - 6, ic_cy), (ic_cx - 2, ic_cy + 5), (ic_cx + 7, ic_cy - 5)], fill=accent_col, width=3)

    f_t = get_font(FONT_BOLD, 17)
    f_d = get_font(FONT_SANS, 13)
    d_c.text((bx1 + 78, by1 + 15), title, font=f_t, fill=(15, 23, 42, 255))
    d_c.text((bx1 + 78, by1 + 42), desc, font=f_d, fill=(71, 85, 105, 255))
    
    if scale != 1.0:
        new_w = int(card_buf.width * scale)
        new_h = int(card_buf.height * scale)
        card_scaled = card_buf.resize((new_w, new_h), Image.Resampling.BILINEAR)
        diff_x = (new_w - card_buf.width) // 2
        diff_y = (new_h - card_buf.height) // 2
        px = x - diff_x
        py = cur_y - diff_y
        card_draw = card_scaled
    else:
        px = x
        py = cur_y
        card_draw = card_buf
        
    if alpha < 0.99:
        card_draw.putalpha(Image.eval(card_draw.split()[3], lambda a: int(a * alpha)))
        
    canvas.paste(card_draw, (px - 12, py - 10), card_draw)

# -------------------------------------------------------------
# 2. PARTICLES & CINEMATIC DUST
# -------------------------------------------------------------
np.random.seed(2026)
particles = []
for _ in range(40):
    particles.append({
        'x': float(np.random.uniform(0, W)),
        'y': float(np.random.uniform(0, H)),
        'vx': float(np.random.uniform(-6, 6)),
        'vy': float(np.random.uniform(-12, -3)),
        'radius': float(np.random.uniform(2.0, 4.0)),
        'base_alpha': float(np.random.uniform(70, 140)),
        'color': (
            int(np.random.choice([245, 16, 217, 52])),
            int(np.random.choice([158, 185, 119, 211])),
            int(np.random.choice([11, 129, 6, 153]))
        ),
        'phase': float(np.random.uniform(0, 6.28))
    })

def render_dust_particles(canvas, t, burst_confetti=False):
    d = ImageDraw.Draw(canvas)
    for p in particles:
        speed = 3.5 if burst_confetti else 1.0
        px = (p['x'] + p['vx'] * t * speed) % W
        py = (p['y'] + p['vy'] * t * speed) % H
        pulse = math.sin(t * 3.0 + p['phase']) * 0.4 + 0.6
        alpha = int(min(255, p['base_alpha'] * pulse * (1.8 if burst_confetti else 1.0)))
        r = p['radius'] * (1.3 if burst_confetti else 1.0)
        col = (p['color'][0], p['color'][1], p['color'][2], alpha)
        d.ellipse([px - r, py - r, px + r, py + r], fill=col)

# -------------------------------------------------------------
# 3. DYNAMIC CONTACT SHADOW FOR ROBOT
# -------------------------------------------------------------
def render_robot_shadow(canvas, cx, floor_y, cur_y, target_size):
    dist_to_floor = max(10, floor_y - cur_y)
    norm = min(1.0, dist_to_floor / 350.0)
    sw = int(target_size * (0.85 + 0.35 * norm))
    sh = int(target_size * (0.22 + 0.12 * norm))
    alpha = int(90 * (1.0 - norm * 0.55))
    
    shadow_img = Image.new("RGBA", (sw + 40, sh + 40), (0, 0, 0, 0))
    d_s = ImageDraw.Draw(shadow_img)
    d_s.ellipse([20, 20, sw + 20, sh + 20], fill=(150, 135, 120, alpha))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=int(12 + norm * 14)))
    canvas.paste(shadow_img, (cx - shadow_img.width // 2, floor_y - shadow_img.height // 2), shadow_img)

# -------------------------------------------------------------
# 4. POST-PROCESSING VIGNETTE
# -------------------------------------------------------------
vignette_mask = np.zeros((H, W), dtype=np.float32)
cy, cx = H / 2.0, W / 2.0
max_d = math.hypot(cx, cy)
for y in range(H):
    for x in range(W):
        d = math.hypot(x - cx, y - cy) / max_d
        vignette_mask[y, x] = max(0.0, (d - 0.58) / 0.42) ** 1.6

vignette_overlay = np.zeros((H, W, 4), dtype=np.uint8)
vignette_overlay[:, :, 0] = 160
vignette_overlay[:, :, 1] = 145
vignette_overlay[:, :, 2] = 130
vignette_overlay[:, :, 3] = (vignette_mask * 42).astype(np.uint8)
vignette_img = Image.fromarray(vignette_overlay, "RGBA")

# -------------------------------------------------------------
# 5. FFmpeg PIPELINE
# -------------------------------------------------------------
out_video = os.path.join(VIDEO_DIR, "aurora_cosmo_guide.mp4")
audio_path = os.path.join(VIDEO_DIR, "final_audio_35s.aac")

ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{W}x{H}",
    "-pix_fmt", "rgba",
    "-r", str(FPS),
    "-i", "-",
    "-i", audio_path,
    "-t", "35.0",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "faster",
    "-crf", "17",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    out_video
]

print("Launching FFmpeg process for 1050 frames encoding...")
proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

t_start = time.time()

# -------------------------------------------------------------
# 6. FRAME-BY-FRAME RENDERING LOOP (35s @ 30 FPS)
# -------------------------------------------------------------
for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    
    # Subtle virtual camera drift
    cam_x = int(math.sin(t * 0.35) * 32.0)
    cam_y = int(math.cos(t * 0.28) * 14.0)
    crop_x = (BG_W - W) // 2 + cam_x
    crop_y = (BG_H - H) // 2 + cam_y
    frame = bg_studio.crop((crop_x, crop_y, crop_x + W, crop_y + H))
    
    d = ImageDraw.Draw(frame)
    
    # -------------------------------------------------------------
    # SCENE 1: Знакомство с Космо и Авророй (0.0s - 6.5s)
    # -------------------------------------------------------------
    if t < 6.5:
        shake_x, shake_y = 0, 0
        if 0.45 <= t < 0.85:
            decay = math.exp(-(t - 0.45) * 10.0)
            shake_x = int(math.sin((t - 0.45) * 45.0) * 14.0 * decay)
            shake_y = int(math.cos((t - 0.45) * 55.0) * 10.0 * decay)
            
        render_dust_particles(frame, t)
        
        # Pill badge
        if t >= 0.25:
            draw_pill_badge(d, 310, 110, "КВАНТОВЫЙ ГИД // 2026", (236, 253, 245, 255), (5, 150, 105, 255), (16, 185, 129, 200))
            
        # Hero Title
        if t >= 0.7:
            s, a, y_off = spring_ease(t - 0.7, 0.4)
            f_title = get_font(FONT_BOLD, int(48 * s))
            d.text((120, 145 + int(y_off)), "СИСТЕМА АВРОРА", font=f_title, fill=(15, 23, 42, int(255 * a)))
            
        # Subtitle
        if t >= 1.4:
            s, a, y_off = spring_ease(t - 1.4, 0.4)
            f_sub = get_font(FONT_BOLD, 19)
            d.text((120, 222 + int(y_off)), "УМНЫЙ МОНИТОРИНГ И АНАЛИТИКА 16 БИБЛИОТЕК ВЛАДИМИРА", font=f_sub, fill=(16, 185, 129, int(255 * a)))
            
        # 3 Kinetic Cards (compact width 700 to guarantee clean space)
        cw, ch = 700, 92
        draw_frosted_card(frame, 120, 280, cw, ch, "robot", "МАСКОТ КОСМО", "Интеллектуальный робот-помощник с синтезом речи ElevenLabs", (16, 185, 129), t - 2.2)
        draw_frosted_card(frame, 120, 395, cw, ch, "lightning", "СКОРОСТЬ 1000 ПОСТОВ", "Мгновенный пакетный сбор публикаций через VK API без зависаний", (139, 92, 246), t - 3.4)
        draw_frosted_card(frame, 120, 510, cw, ch, "bars", "16 ФИЛИАЛОВ СЕТИ", "Полная панорама городских библиотек в одном удобном дашборде", (244, 63, 94), t - 4.6)
        
        # Cosmo Mascot GAG #1: Fall, screen bump, dizzy eyes, spring back!
        if t < 0.45:
            progress = t / 0.45
            cur_y = int(-300 + (progress ** 2) * 840)
            cur_x = 1480
            cur_sprite = cosmo_idle
            cur_scale_x, cur_scale_y = 0.9, 1.15
            cur_tilt = -10.0 * (1.0 - progress)
        elif t < 0.85:
            cur_x = 1480 + shake_x
            cur_y = 540 + shake_y
            cur_sprite = cosmo_dizzy
            cur_scale_x, cur_scale_y = 1.32, 0.76
            cur_tilt = math.sin((t - 0.45) * 25.0) * 8.0
        elif t < 1.3:
            dt = t - 0.85
            cur_x = 1480
            cur_y = 540
            cur_sprite = cosmo_idle
            cur_scale_x = 1.0 + 0.15 * math.sin(dt * 15.0)
            cur_scale_y = 1.0 - 0.15 * math.sin(dt * 15.0)
            cur_tilt = math.sin(dt * 18.0) * 10.0
        else:
            cur_x = 1480 + int(math.cos(t * 1.8) * 6.0)
            cur_y = 540 + int(math.sin(t * 3.2) * 14.0)
            cur_sprite = cosmo_smile
            cur_scale_x, cur_scale_y = 1.0, 1.0
            cur_tilt = math.sin(t * 2.2) * 4.0
            
        render_robot_shadow(frame, cur_x, 920, cur_y, 420)
        target_w = int(480 * cur_scale_x)
        target_h = int(480 * cur_scale_y)
        c_res = cur_sprite.resize((target_w, target_h), Image.Resampling.LANCZOS)
        c_rot = c_res.rotate(-cur_tilt, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(c_rot, (cur_x - c_rot.width // 2, cur_y - c_rot.height // 2), c_rot)

    # -------------------------------------------------------------
    # SCENE 2: Поиск и Аналитика 16 библиотек (6.5s - 13.6s)
    # -------------------------------------------------------------
    elif t < 13.6:
        t_rel = t - 6.5
        render_dust_particles(frame, t)
        
        draw_pill_badge(d, 310, 100, "ЭКОСИСТЕМА ДАННЫХ // 24/7", (243, 232, 255, 255), (126, 34, 206, 255), (168, 85, 247, 200))
        
        f_title = get_font(FONT_BOLD, 40)
        d.text((120, 130), "АНАЛИТИКА 16 БИБЛИОТЕК", font=f_title, fill=(15, 23, 42, 255))
        f_sub = get_font(FONT_BOLD, 18)
        d.text((120, 195), "ОБЪЕКТИВНЫЙ РАСЧЕТ ER, ДИНАМИКА И ТЕПЛОВАЯ КАРТА", font=f_sub, fill=(168, 85, 247, 255))
        
        cw, ch = 680, 92
        draw_frosted_card(frame, 120, 255, cw, ch, "bars", "ТЕПЛОВАЯ КАРТА 24/7", "Матрица активности публикаций по часам и дням недели", (16, 185, 129), t_rel - 0.4)
        draw_frosted_card(frame, 120, 370, cw, ch, "star", "РЕЙТИНГ И ВОВЛЕЧЕННОСТЬ", "Автоматический расчет коэффициента ERpost и выявление лидеров", (245, 158, 11), t_rel - 1.8)
        draw_frosted_card(frame, 120, 485, cw, ch, "check", "ОФИЦИАЛЬНЫЙ ОТЧЕТ", "Готовая аналитическая записка методиста и выгрузка Word / Excel", (139, 92, 246), t_rel - 3.2)
        
        # Real User UI Screenshot: Window Search & Filters
        ui_bob_y = int(math.sin(t * 2.2) * 8.0)
        ui_bob_x = int(math.cos(t * 1.5) * 5.0)
        sx, sy = 880 + ui_bob_x, 130 + ui_bob_y
        
        # Switch smoothly between search UI and ER ranking UI
        cur_ui = window_search if t_rel < 3.8 else framed_analytics
        frame.paste(cur_ui, (sx, sy), cur_ui)
            
        # Cosmo on right bottom with GAG #2: Balancing star
        cx = 1620 + int(math.cos(t * 1.6) * 5.0)
        cy = 780 + int(math.sin(t * 3.0) * 12.0)
        
        star_active = (t_rel >= 1.8)
        star_wobble = math.sin((t_rel - 1.8) * 8.0) * 8.0 if star_active else 0
        is_flipping = (4.4 <= t_rel < 5.2)
        
        if is_flipping:
            flip_p = (t_rel - 4.4) / 0.8
            cur_tilt = flip_p * 360.0
            cur_sprite = cosmo_smile
        else:
            cur_tilt = math.sin(t * 2.2) * 4.0 + star_wobble
            cur_sprite = cosmo_thinking if t_rel < 3.2 else cosmo_smile
            
        render_robot_shadow(frame, cx, 1020, cy, 380)
        c_res = cur_sprite.resize((410, 410), Image.Resampling.LANCZOS)
        c_rot = c_res.rotate(-cur_tilt, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(c_rot, (cx - c_rot.width // 2, cy - c_rot.height // 2), c_rot)
        
        if star_active and not is_flipping:
            star_x = cx - 140
            star_y = cy - 110 + int(math.sin(t * 4.0) * 8.0)
            d.polygon([(star_x, star_y - 20), (star_x + 6, star_y - 6), (star_x + 20, star_y - 6), (star_x + 10, star_y + 4), (star_x + 14, star_y + 18), (star_x, star_y + 10), (star_x - 14, star_y + 18), (star_x - 10, star_y + 4), (star_x - 20, star_y - 6), (star_x - 6, star_y - 6)], fill=(245, 158, 11, 255), outline=(255, 255, 255, 255))

    # -------------------------------------------------------------
    # SCENE 3: Генератор промо-материалов QR (13.6s - 20.8s)
    # -------------------------------------------------------------
    elif t < 20.8:
        t_rel = t - 13.6
        render_dust_particles(frame, t)
        
        draw_pill_badge(d, 320, 100, "ТИПОГРАФСКИЙ СТАНДАРТ // ISO", (254, 243, 199, 255), (180, 83, 9, 255), (245, 158, 11, 200))
        
        f_title = get_font(FONT_BOLD, 38)
        d.text((120, 130), "ПЕЧАТЬ ПОЛИГРАФИИ В 1 КЛИК", font=f_title, fill=(15, 23, 42, 255))
        f_sub = get_font(FONT_BOLD, 18)
        d.text((120, 195), "ПЛАКАТЫ, ТЕЙБЛТЕНТЫ И ЗАКЛАДКИ С ВЕКТОРНЫМ QR", font=f_sub, fill=(16, 185, 129, 255))
        
        cw, ch = 680, 92
        draw_frosted_card(frame, 120, 255, cw, ch, "qr", "ПЛАКАТЫ А4 И А3", "Готовые плакаты для кафедр и стендов с векторным QR", (16, 185, 129), t_rel - 0.4)
        draw_frosted_card(frame, 120, 370, cw, ch, "check", "ТЕЙБЛ-ТЕНТЫ А5", "Двухсторонние устойчивые домики на столы обслуживания", (244, 63, 94), t_rel - 1.8)
        draw_frosted_card(frame, 120, 485, cw, ch, "star", "ЗАКЛАДКИ ДЛЯ КНИГ", "Стильные закладки с QR-гидом по новинкам месяца", (139, 92, 246), t_rel - 3.2)
        
        # Real User UI: Bookmarks Print Sheet Window
        ui_bob_y = int(math.sin(t * 2.1) * 7.0)
        ui_bob_x = int(math.cos(t * 1.7) * 5.0)
        sx, sy = 880 + ui_bob_x, 130 + ui_bob_y
        frame.paste(window_bookmarks, (sx, sy), window_bookmarks)
        
        # Cosmo on right bottom with GAG #3: Sticky bookmark
        cx = 1620 + int(math.cos(t * 1.6) * 5.0)
        cy = 780 + int(math.sin(t * 3.0) * 12.0)
        
        if 0.8 <= t_rel < 3.6:
            cur_sprite = cosmo_bookmark
            cur_tilt = math.sin((t_rel - 0.8) * 14.0) * 6.0
        else:
            cur_sprite = cosmo_smile
            cur_tilt = math.sin(t * 2.2) * 4.0
            
        render_robot_shadow(frame, cx, 1020, cy, 380)
        c_res = cur_sprite.resize((410, 410), Image.Resampling.LANCZOS)
        c_rot = c_res.rotate(-cur_tilt, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(c_rot, (cx - c_rot.width // 2, cy - c_rot.height // 2), c_rot)

    # -------------------------------------------------------------
    # SCENE 4: Чат с Космо и 10 Экспресс-Пресетов (20.8s - 28.0s)
    # -------------------------------------------------------------
    elif t < 28.0:
        t_rel = t - 20.8
        render_dust_particles(frame, t)
        
        draw_pill_badge(d, 310, 100, "НЕЙРОСЕТЬ AURORA AI // 24/7", (236, 253, 245, 255), (5, 150, 105, 255), (16, 185, 129, 200))
        
        f_title = get_font(FONT_BOLD, 40)
        d.text((120, 130), "УМНЫЙ ЧАТ С КОСМО", font=f_title, fill=(15, 23, 42, 255))
        f_sub = get_font(FONT_BOLD, 18)
        d.text((120, 195), "10 ПРЕСЕТОВ ЭКСПРЕСС-АНАЛИЗА И ГЕНЕРАЦИЯ ПОСТОВ VK", font=f_sub, fill=(37, 99, 235, 255))
        
        cw, ch = 680, 92
        draw_frosted_card(frame, 120, 255, cw, ch, "chat", "10 ЭКСПРЕСС-ПРЕСЕТОВ", "Готовые сценарии в один клик: аудит филиала, ТОП постов сети", (16, 185, 129), t_rel - 0.4)
        draw_frosted_card(frame, 120, 370, cw, ch, "lightning", "ГЕНЕРАТОР ПОСТОВ VK", "Умный копирайтинг публикаций с опросами, цитатами и хэштегами", (244, 63, 94), t_rel - 1.8)
        draw_frosted_card(frame, 120, 485, cw, ch, "bars", "МЕТОДИЧЕСКИЙ АУДИТ", "Глубокая сверка показателей и практические советы методисту", (139, 92, 246), t_rel - 3.2)
        
        # Real User UI: Chat Modal Window
        ui_bob_y = int(math.sin(t * 2.1) * 7.0)
        ui_bob_x = int(math.cos(t * 1.7) * 5.0)
        sx, sy = 880 + ui_bob_x, 130 + ui_bob_y
        frame.paste(window_chat, (sx, sy), window_chat)
        
        # Cosmo on right bottom with GAG #4: Professor Glasses & Super-speed typing
        cx = 1620 + int(math.cos(t * 1.6) * 5.0)
        cy = 780 + int(math.sin(t * 3.0) * 12.0)
        
        type_vibe = int(math.sin(t * 35.0) * 4.0)
        cur_sprite = cosmo_glasses
        cur_tilt = math.sin(t * 2.0) * 3.5
        
        render_robot_shadow(frame, cx, 1020, cy, 380)
        c_res = cur_sprite.resize((410, 410), Image.Resampling.LANCZOS)
        c_rot = c_res.rotate(-cur_tilt, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(c_rot, (cx - c_rot.width // 2 + type_vibe, cy - c_rot.height // 2), c_rot)
        
        for spk_i in range(3):
            spk_rad = (t * 12.0 + spk_i * 2.1) % 6.28
            spk_x = cx - 110 + int(math.cos(spk_rad) * 28.0)
            spk_y = cy - 20 + int(math.sin(spk_rad) * 18.0)
            d.ellipse([spk_x - 3, spk_y - 3, spk_x + 3, spk_y + 3], fill=(251, 191, 36, 220))

    # -------------------------------------------------------------
    # SCENE 5: Финал и гиперпрыжок biblioteka33.ru/stat (28.0s - 35.0s)
    # -------------------------------------------------------------
    else:
        t_rel = t - 28.0
        burst_confetti = (t_rel >= 3.8)
        render_dust_particles(frame, t, burst_confetti=burst_confetti)
        
        # Center Badge
        draw_pill_badge(d, W // 2, 130, "ГОРОДСКАЯ БИБЛИОТЕЧНАЯ СЕТЬ // ВЛАДИМИР", (236, 253, 245, 255), (5, 150, 105, 255), (16, 185, 129, 200))
        
        # Central Premium Glass Card (biblioteka33.ru/stat)
        cw, ch = 960, 400
        cx, cy = (W - cw) // 2, 150
        
        d.rounded_rectangle([cx + 6, cy + 10, cx + cw + 6, cy + ch + 10], radius=24, fill=(160, 145, 130, 40))
        d.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=24, fill=(255, 255, 255, 240), outline=(226, 218, 205, 220), width=2)
        
        d.text((cx + 60, cy + 36), "АВРОРА • КВАНТОВЫЙ ГИД", font=get_font(FONT_BOLD, 16), fill=(16, 185, 129, 255))
        d.text((cx + 60, cy + 74), "ИССЛЕДУЙТЕ КОСМОС ДАННЫХ", font=get_font(FONT_BOLD, 36), fill=(15, 23, 42, 255))
        d.text((cx + 60, cy + 128), "16 библиотек Владимира • Рейтинги • ER • Полиграфия • Чат", font=get_font(FONT_SANS, 16), fill=(71, 85, 105, 255))
        
        # Domain URL Box
        url_w, url_h = cw - 120, 80
        ux, uy = cx + 60, cy + 175
        d.rounded_rectangle([ux, uy, ux + url_w, uy + url_h], radius=16, fill=(236, 253, 245, 255), outline=(16, 185, 129, 220), width=2)
        
        f_url = get_font(FONT_BOLD, 32)
        d.text((ux + 32, uy + 22), "biblioteka33.ru/stat", font=f_url, fill=(5, 150, 105, 255))
        
        # Enter CTA Button
        btn_w, btn_h = 240, 50
        bx, by = ux + url_w - btn_w - 16, uy + (url_h - btn_h) // 2
        d.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=14, fill=(16, 185, 129, 255))
        d.text((bx + 26, by + 16), "ВОЙТИ В СИСТЕМУ ➔", font=get_font(FONT_BOLD, 13), fill=(255, 255, 255, 255))
        
        shimmer_pos = (t * 300) % (btn_w + 80) - 40
        if 0 < shimmer_pos < btn_w:
            d.line([(bx + shimmer_pos, by + 4), (bx + shimmer_pos + 20, by + btn_h - 4)], fill=(255, 255, 255, 140), width=3)
            
        d.text((cx + 60, cy + 310), "Свободный доступ для всех сотрудников и методистов • 2026", font=get_font(FONT_SANS, 13), fill=(148, 163, 184, 255))
        
        # Cosmo Mascot with GAG #5: Liftoff!
        if t_rel < 3.8:
            rx = W // 2 + int(math.cos(t * 1.5) * 6.0)
            ry = 815 + int(math.sin(t * 3.2) * 12.0)
            cur_scale_x, cur_scale_y = 1.0, 1.0
            cur_tilt = math.sin(t * 2.2) * 4.0
            cur_sprite = cosmo_smile
            
            thr_alpha = int(120 + math.sin(t * 20.0) * 60)
            d.ellipse([rx - 25, ry + 120, rx + 25, ry + 160], fill=(16, 185, 129, thr_alpha))
            d.ellipse([rx - 12, ry + 125, rx + 12, ry + 150], fill=(255, 255, 255, thr_alpha))
            
            render_robot_shadow(frame, rx, 1030, ry, 390)
            c_res = cur_sprite.resize((410, 410), Image.Resampling.LANCZOS)
            c_rot = c_res.rotate(-cur_tilt, resample=Image.Resampling.BICUBIC, expand=True)
            frame.paste(c_rot, (rx - c_rot.width // 2, ry - c_rot.height // 2), c_rot)
        else:
            t_launch = t_rel - 3.8
            rocket_y = 815 - int((t_launch ** 2.2) * 1600.0)
            rx = W // 2
            
            if rocket_y > -450:
                cur_scale_x, cur_scale_y = 0.85, 1.25
                cur_sprite = cosmo_smile
                
                flame_h = int(60 + t_launch * 120)
                d.polygon([(rx - 20, rocket_y + 120), (rx + 20, rocket_y + 120), (rx, rocket_y + 120 + flame_h)], fill=(16, 185, 129, 230))
                d.polygon([(rx - 10, rocket_y + 120), (rx + 10, rocket_y + 120), (rx, rocket_y + 120 + flame_h // 2)], fill=(255, 255, 255, 255))
                
                target_w = int(410 * cur_scale_x)
                target_h = int(410 * cur_scale_y)
                c_res = cur_sprite.resize((target_w, target_h), Image.Resampling.LANCZOS)
                frame.paste(c_res, (rx - c_res.width // 2, rocket_y - c_res.height // 2), c_res)

    # Post-processing pass
    frame = Image.alpha_composite(frame, vignette_img)
    
    # Send frame bytes directly to FFmpeg stdin
    raw_data = frame.tobytes()
    proc.stdin.write(raw_data)
    
    if (frame_idx + 1) % 150 == 0:
        elapsed = time.time() - t_start
        fps_cur = (frame_idx + 1) / elapsed
        print(f"Rendered {frame_idx + 1}/{TOTAL_FRAMES} frames ({fps_cur:.1f} fps) - {t:.1f}s / {TOTAL_DURATION}s")

proc.stdin.close()
proc.wait()

elapsed_total = time.time() - t_start
print(f"\nReal-UI Pixar Video Rendered in {elapsed_total:.1f}s! Result Code: {proc.returncode}")
