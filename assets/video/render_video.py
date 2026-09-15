import os, sys, math, time, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
FPS = 30
TOTAL_DURATION = 35.0
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

print(f"Rendering Pixar-Style Video: {TOTAL_FRAMES} frames ({TOTAL_DURATION:.1f}s) at {FPS} FPS...")

# -------------------------------------------------------------
# 1. Preload Backgrounds
# -------------------------------------------------------------
bg_intro = Image.open("assets/video/bg/space_nebula_intro.png").convert("RGBA")
bg_system = Image.open("assets/video/bg/space_stars_system.png").convert("RGBA")
bg_rings = Image.open("assets/video/bg/space_rings_promo.png").convert("RGBA")
bg_cosmo = Image.open("assets/video/bg/space_energy_cosmo.png").convert("RGBA")
bg_warp = Image.open("assets/video/bg/space_warp_outro.png").convert("RGBA")

# -------------------------------------------------------------
# 2. Preload Overlays (Dual-font: Shoptronic SP + Arial)
# -------------------------------------------------------------
ov_1 = Image.open("assets/video/overlays/overlay_scene1.png").convert("RGBA")
ov_2 = Image.open("assets/video/overlays/overlay_scene2.png").convert("RGBA")
ov_3 = Image.open("assets/video/overlays/overlay_scene3.png").convert("RGBA")
ov_4 = Image.open("assets/video/overlays/overlay_scene4.png").convert("RGBA")
ov_5 = Image.open("assets/video/overlays/overlay_scene5.png").convert("RGBA")

# -------------------------------------------------------------
# 3. Preload Cosmo Sprites
# -------------------------------------------------------------
cosmo_smile = Image.open("assets/images/mascot/robot_smile.png").convert("RGBA")
cosmo_thinking = Image.open("assets/images/mascot/robot_thinking.png").convert("RGBA")
cosmo_idle = Image.open("assets/images/mascot/robot_idle.png").convert("RGBA")

# -------------------------------------------------------------
# 4. Preload UI Screenshots & Mockups
# -------------------------------------------------------------
shot_dash = Image.open("assets/screenshots/01_dashboard_overview.jpg").convert("RGBA")
shot_scan = Image.open("assets/screenshots/03_batch_scanning_modal.jpg").convert("RGBA")
mockup_promo = Image.open("assets/video/mockup_promo.png").convert("RGBA")
mockup_chat = Image.open("assets/video/mockup_chat.png").convert("RGBA")

def round_corners_and_border(im, target_w, target_h, radius=16, border_color=(0, 242, 254, 255), border_width=3):
    im_resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    mask = Image.new("L", (target_w, target_h), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.rounded_rectangle([0, 0, target_w - 1, target_h - 1], radius=radius, fill=255)
    
    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    out.paste(im_resized, (0, 0), mask=mask)
    
    d_out = ImageDraw.Draw(out)
    d_out.rounded_rectangle([1, 1, target_w - 2, target_h - 2], radius=radius, outline=border_color, width=border_width)
    return out

framed_dash = round_corners_and_border(shot_dash, 840, 480, border_color=(0, 242, 254, 240))
framed_scan = round_corners_and_border(shot_scan, 840, 480, border_color=(168, 85, 247, 240))
framed_promo = round_corners_and_border(mockup_promo, 840, 480, border_color=(251, 191, 36, 240))
framed_chat = round_corners_and_border(mockup_chat, 840, 480, border_color=(0, 242, 254, 240))

# -------------------------------------------------------------
# 5. Glowing Auras for Pixar-Style Cosmo
# -------------------------------------------------------------
def make_aura(sprite, color=(0, 242, 254, 160), radius=26):
    w, h = sprite.size
    pad = radius * 2
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    alpha = sprite.split()[3]
    solid = Image.new("RGBA", (w, h), color)
    canvas.paste(solid, (pad, pad), mask=alpha)
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=radius))
    canvas.paste(sprite, (pad, pad), mask=sprite)
    return canvas, pad

aura_smile_large, _ = make_aura(cosmo_smile.resize((460, 460), Image.Resampling.LANCZOS), (0, 242, 254, 200), 26)
aura_smile_gold, _ = make_aura(cosmo_smile.resize((420, 420), Image.Resampling.LANCZOS), (251, 191, 36, 200), 24)
aura_smile_cyan, _ = make_aura(cosmo_smile.resize((410, 410), Image.Resampling.LANCZOS), (0, 242, 254, 190), 22)
aura_thinking_purple, _ = make_aura(cosmo_thinking.resize((410, 410), Image.Resampling.LANCZOS), (168, 85, 247, 190), 22)
aura_thinking_cyan, _ = make_aura(cosmo_thinking.resize((410, 410), Image.Resampling.LANCZOS), (0, 242, 254, 190), 22)
aura_idle_cyan, _ = make_aura(cosmo_idle.resize((410, 410), Image.Resampling.LANCZOS), (0, 242, 254, 180), 20)

EXPAND = 80
bg_intro_exp = bg_intro.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_system_exp = bg_system.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_rings_exp = bg_rings.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_cosmo_exp = bg_cosmo.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_warp_exp = bg_warp.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)

def get_parallax_bg(bg_exp, t, amp_x=34, amp_y=18, phase=0.0):
    ox = int(EXPAND + math.sin(t * 0.42 + phase) * amp_x)
    oy = int(EXPAND + math.cos(t * 0.32 + phase) * amp_y)
    return bg_exp.crop((ox, oy, ox + W, oy + H))

# -------------------------------------------------------------
# 6. Dynamic Glowing Space Particles for Depth
# -------------------------------------------------------------
np.random.seed(4240)
particle_count = 60
particles = []
for _ in range(particle_count):
    particles.append({
        'x': float(np.random.uniform(0, W)),
        'y': float(np.random.uniform(0, H)),
        'vx': float(np.random.uniform(-16, 16)),
        'vy': float(np.random.uniform(-22, -8)),
        'radius': float(np.random.uniform(1.8, 3.8)),
        'color': (
            int(np.random.choice([0, 168, 240, 251, 255])),
            int(np.random.choice([242, 85, 147, 191, 255])),
            int(np.random.choice([254, 247, 251, 36, 230]))
        ),
        'base_alpha': float(np.random.uniform(120, 230)),
        'phase': float(np.random.uniform(0, 6.28))
    })

def render_particles(frame, t, warp_speed=1.0):
    d = ImageDraw.Draw(frame)
    for p in particles:
        px = (p['x'] + p['vx'] * t * warp_speed) % W
        py = (p['y'] + p['vy'] * t * warp_speed) % H
        pulse = math.sin(t * 3.4 + p['phase']) * 0.4 + 0.6
        alpha = int(min(255, p['base_alpha'] * pulse))
        r = p['radius'] * (0.8 + 0.3 * pulse) * (1.3 if warp_speed > 1.5 else 1.0)
        col = (p['color'][0], p['color'][1], p['color'][2], alpha)
        if warp_speed > 1.5:
            # Streak in warp mode
            d.line([(px, py), (px - p['vx']*1.8, py - p['vy']*2.2)], fill=col, width=int(r))
        else:
            d.ellipse([px - r, py - r, px + r, py + r], fill=col)

def paste_cosmo_animated(frame, sprite, target_cx, target_cy, t, amp_bob_y=14, amp_tilt=3.4):
    bob_y = math.sin(t * 3.4) * amp_bob_y
    bob_x = math.cos(t * 1.8) * 6
    tilt = math.sin(t * 2.2) * amp_tilt
    sprite_rot = sprite.rotate(-tilt, resample=Image.Resampling.BICUBIC, expand=True)
    sw, sh = sprite_rot.size
    px = int(target_cx + bob_x - sw // 2)
    py = int(target_cy + bob_y - sh // 2)
    frame.paste(sprite_rot, (px, py), sprite_rot)

def paste_ui_floating(frame, shot_img, base_x, base_y, t, fade_in=1.0):
    ui_bob_y = int(math.sin(t * 2.2) * 7)
    ui_bob_x = int(math.cos(t * 1.6) * 4)
    if fade_in < 0.99:
        img_faded = shot_img.copy()
        img_faded.putalpha(Image.eval(img_faded.split()[3], lambda a: int(a * fade_in)))
        frame.paste(img_faded, (base_x + ui_bob_x, base_y + ui_bob_y), img_faded)
    else:
        frame.paste(shot_img, (base_x + ui_bob_x, base_y + ui_bob_y), shot_img)

# -------------------------------------------------------------
# 7. Start FFmpeg Streaming Process
# -------------------------------------------------------------
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{W}x{H}",
    "-pix_fmt", "rgba",
    "-r", str(FPS),
    "-i", "-", # stdin
    "-i", "assets/video/final_audio_35s.aac",
    "-t", "35.0", # Exactly 35.0 seconds
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "assets/video/aurora_cosmo_guide.mp4"
]

proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

t_start = time.time()
print("Encoding 1050 frames with Pixar-style animation...")

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    
    # -------------------------------------------------------------
    # Scene 1: Знакомство с Космо и Авророй (0.0s - 6.5s)
    # -------------------------------------------------------------
    if t < 6.5:
        frame = get_parallax_bg(bg_intro_exp, t, amp_x=30, amp_y=16)
        render_particles(frame, t)
        
        # Overlay with smooth fade in
        if t < 0.6:
            alpha_ratio = t / 0.6
            ov_cur = ov_1.copy()
            ov_cur.putalpha(Image.eval(ov_cur.split()[3], lambda a: int(a * alpha_ratio)))
            frame.paste(ov_cur, (0, 0), ov_cur)
        else:
            frame.paste(ov_1, (0, 0), ov_1)
            
        # Cosmo on right with welcoming Pixar levitation & tilt
        paste_cosmo_animated(frame, aura_smile_large, 1480, 540, t, amp_bob_y=18, amp_tilt=4.0)
        
    # -------------------------------------------------------------
    # Scene 2: Аналитика 16 библиотек, рейтинг ER и теплокарта (6.5s - 13.6s)
    # -------------------------------------------------------------
    elif t < 13.6:
        t_rel = t - 6.5
        frame = get_parallax_bg(bg_system_exp, t, amp_x=34, amp_y=18, phase=1.0)
        render_particles(frame, t)
        
        # Left overlay
        frame.paste(ov_2, (0, 0), ov_2)
        
        # Right Screenshot: floating UI window
        sx, sy = 960, 160
        if t_rel < 3.6:
            paste_ui_floating(frame, framed_dash, sx, sy, t)
        else:
            paste_ui_floating(frame, framed_scan, sx, sy, t)
            
        # Cosmo on right bottom: emotional transition (thinking -> enthusiastic smile)
        if t_rel < 3.8:
            cur_sprite = aura_thinking_purple
        else:
            cur_sprite = aura_smile_cyan
        paste_cosmo_animated(frame, cur_sprite, 1620, 780, t, amp_bob_y=14, amp_tilt=3.8)
        
    # -------------------------------------------------------------
    # Scene 3: Генератор промо-материалов QR: А4, Тейблтенты, Закладки (13.6s - 20.8s)
    # -------------------------------------------------------------
    elif t < 20.8:
        t_rel = t - 13.6
        frame = get_parallax_bg(bg_rings_exp, t, amp_x=34, amp_y=18, phase=2.0)
        render_particles(frame, t)
        
        # Left overlay
        frame.paste(ov_3, (0, 0), ov_3)
        
        # Right Floating Mockup: High-res QR Promo Materials Card
        sx, sy = 960, 160
        paste_ui_floating(frame, framed_promo, sx, sy, t)
        
        # Cosmo on right bottom: proud & energetic presentation
        if t_rel < 3.6:
            cur_sprite = aura_smile_gold
        else:
            cur_sprite = aura_smile_cyan
        paste_cosmo_animated(frame, cur_sprite, 1620, 780, t, amp_bob_y=16, amp_tilt=4.2)
        
    # -------------------------------------------------------------
    # Scene 4: Чат с Космо и 10 Экспресс-Пресетов (20.8s - 28.0s)
    # -------------------------------------------------------------
    elif t < 28.0:
        t_rel = t - 20.8
        frame = get_parallax_bg(bg_cosmo_exp, t, amp_x=32, amp_y=18, phase=3.0)
        render_particles(frame, t)
        
        # Left overlay
        frame.paste(ov_4, (0, 0), ov_4)
        
        # Right Floating Mockup: Cosmo Chat with Presets & Live Prompt
        sx, sy = 960, 160
        paste_ui_floating(frame, framed_chat, sx, sy, t)
        
        # Cosmo on right bottom: thinking & problem-solving
        if t_rel < 3.6:
            cur_sprite = aura_thinking_cyan
        else:
            cur_sprite = aura_smile_cyan
        paste_cosmo_animated(frame, cur_sprite, 1620, 780, t, amp_bob_y=15, amp_tilt=4.0)
        
    # -------------------------------------------------------------
    # Scene 5: Финал и гиперпрыжок biblioteka33.ru/stat (28.0s - 35.0s)
    # -------------------------------------------------------------
    else:
        t_rel = t - 28.0
        frame = get_parallax_bg(bg_warp_exp, t, amp_x=40, amp_y=20, phase=4.0)
        render_particles(frame, t, warp_speed=2.2)
        
        # Overlay with central CTA
        frame.paste(ov_5, (0, 0), ov_5)
        
        # Cosmo in bottom center with joyous cosmic celebration
        paste_cosmo_animated(frame, aura_smile_large, W // 2, 830, t, amp_bob_y=16, amp_tilt=3.6)
        
    # Write frame bytes to ffmpeg stdin
    raw_data = frame.tobytes()
    proc.stdin.write(raw_data)
    
    if (frame_idx + 1) % 150 == 0:
        elapsed = time.time() - t_start
        fps_cur = (frame_idx + 1) / elapsed
        print(f"Processed {frame_idx + 1}/{TOTAL_FRAMES} frames ({fps_cur:.1f} fps)")

proc.stdin.close()
proc.wait()

elapsed_total = time.time() - t_start
print(f"Rendering complete in {elapsed_total:.1f}s! Result code: {proc.returncode}")
