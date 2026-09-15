import os, sys, math, time, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
FPS = 30
TOTAL_DURATION = 25.8
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

print(f"Rendering video: {TOTAL_FRAMES} frames ({TOTAL_DURATION:.1f}s) at {FPS} FPS...")

# Preload backgrounds
bg_intro = Image.open("assets/video/bg/space_nebula_intro.png").convert("RGBA")
bg_system = Image.open("assets/video/bg/space_stars_system.png").convert("RGBA")
bg_cosmo = Image.open("assets/video/bg/space_energy_cosmo.png").convert("RGBA")
bg_warp = Image.open("assets/video/bg/space_warp_outro.png").convert("RGBA")

# Preload overlays
ov_1 = Image.open("assets/video/overlays/overlay_scene1.png").convert("RGBA")
ov_2 = Image.open("assets/video/overlays/overlay_scene2.png").convert("RGBA")
ov_3 = Image.open("assets/video/overlays/overlay_scene3.png").convert("RGBA")
ov_4 = Image.open("assets/video/overlays/overlay_scene4.png").convert("RGBA")

# Preload Cosmo sprites
cosmo_smile = Image.open("assets/images/mascot/robot_smile.png").convert("RGBA")
cosmo_thinking = Image.open("assets/images/mascot/robot_thinking.png").convert("RGBA")
cosmo_idle = Image.open("assets/images/mascot/robot_idle.png").convert("RGBA")

# Preload UI Screenshots
shot_dash = Image.open("assets/screenshots/01_dashboard_overview.jpg").convert("RGBA")
shot_scan = Image.open("assets/screenshots/03_batch_scanning_modal.jpg").convert("RGBA")
shot_rank = Image.open("assets/screenshots/06_analytics_er_ranking.jpg").convert("RGBA")
shot_modal = Image.open("assets/screenshots/09_post_quick_modal.jpg").convert("RGBA")

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
framed_rank = round_corners_and_border(shot_rank, 840, 480, border_color=(240, 147, 251, 240))
framed_modal = round_corners_and_border(shot_modal, 840, 480, border_color=(52, 211, 153, 240))

# Pre-render glowing aura for Cosmo with larger, adaptive sizing and rich expressions
def make_aura(sprite, color=(0, 242, 254, 160), radius=24):
    w, h = sprite.size
    pad = radius * 2
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    alpha = sprite.split()[3]
    solid = Image.new("RGBA", (w, h), color)
    canvas.paste(solid, (pad, pad), mask=alpha)
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=radius))
    canvas.paste(sprite, (pad, pad), mask=sprite)
    return canvas, pad

aura_smile_cyan, _ = make_aura(cosmo_smile.resize((440, 440), Image.Resampling.LANCZOS), (0, 242, 254, 190), 22)
aura_smile_pink, _ = make_aura(cosmo_smile.resize((410, 410), Image.Resampling.LANCZOS), (240, 147, 251, 190), 22)
aura_thinking_purple, _ = make_aura(cosmo_thinking.resize((410, 410), Image.Resampling.LANCZOS), (168, 85, 247, 190), 22)
aura_thinking_cyan, _ = make_aura(cosmo_thinking.resize((410, 410), Image.Resampling.LANCZOS), (0, 242, 254, 190), 22)
aura_idle_cyan, _ = make_aura(cosmo_idle.resize((410, 410), Image.Resampling.LANCZOS), (0, 242, 254, 180), 20)

EXPAND = 80
bg_intro_exp = bg_intro.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_system_exp = bg_system.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_cosmo_exp = bg_cosmo.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)
bg_warp_exp = bg_warp.resize((W + EXPAND * 2, H + EXPAND * 2), Image.Resampling.BILINEAR)

def get_parallax_bg(bg_exp, t, amp_x=34, amp_y=18, phase=0.0):
    ox = int(EXPAND + math.sin(t * 0.42 + phase) * amp_x)
    oy = int(EXPAND + math.cos(t * 0.32 + phase) * amp_y)
    return bg_exp.crop((ox, oy, ox + W, oy + H))

# 50 dynamic glowing space particles for cinematic depth
np.random.seed(1337)
particle_count = 50
particles = []
for _ in range(particle_count):
    particles.append({
        'x': float(np.random.uniform(0, W)),
        'y': float(np.random.uniform(0, H)),
        'vx': float(np.random.uniform(-14, 14)),
        'vy': float(np.random.uniform(-20, -6)),
        'radius': float(np.random.uniform(1.5, 3.2)),
        'color': (
            int(np.random.choice([0, 168, 240, 255])),
            int(np.random.choice([242, 85, 147, 255])),
            int(np.random.choice([254, 247, 251, 230]))
        ),
        'base_alpha': float(np.random.uniform(120, 220)),
        'phase': float(np.random.uniform(0, 6.28))
    })

def render_particles(frame, t):
    d = ImageDraw.Draw(frame)
    for p in particles:
        px = (p['x'] + p['vx'] * t) % W
        py = (p['y'] + p['vy'] * t) % H
        pulse = math.sin(t * 3.2 + p['phase']) * 0.4 + 0.6
        alpha = int(p['base_alpha'] * pulse)
        r = p['radius'] * (0.8 + 0.3 * pulse)
        col = (p['color'][0], p['color'][1], p['color'][2], alpha)
        d.ellipse([px - r, py - r, px + r, py + r], fill=col)

def paste_cosmo_animated(frame, sprite, target_cx, target_cy, t, amp_bob_y=14, amp_tilt=3.2):
    bob_y = math.sin(t * 3.4) * amp_bob_y
    bob_x = math.cos(t * 1.8) * 6
    tilt = math.sin(t * 2.2) * amp_tilt
    sprite_rot = sprite.rotate(-tilt, resample=Image.Resampling.BICUBIC, expand=True)
    sw, sh = sprite_rot.size
    px = int(target_cx + bob_x - sw // 2)
    py = int(target_cy + bob_y - sh // 2)
    frame.paste(sprite_rot, (px, py), sprite_rot)

def paste_ui_floating(frame, shot_img, base_x, base_y, t):
    ui_bob_y = int(math.sin(t * 2.2) * 7)
    ui_bob_x = int(math.cos(t * 1.6) * 4)
    frame.paste(shot_img, (base_x + ui_bob_x, base_y + ui_bob_y), shot_img)

# Start ffmpeg process for streaming raw RGBA frames
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{W}x{H}",
    "-pix_fmt", "rgba",
    "-r", str(FPS),
    "-i", "-", # stdin
    "-i", "assets/video/final_audio.aac",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "19",
    "-c:a", "copy",
    "-movflags", "+faststart",
    "assets/video/aurora_cosmo_guide.mp4"
]

proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

t_start = time.time()
print("Encoding frames with AAA motion & parallax...")

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    
    # -------------------------------------------------------------
    # Scene Selection based on voice timing
    # -------------------------------------------------------------
    if t < 5.6:
        # Scene 1: Intro (0.0s - 5.6s)
        frame = get_parallax_bg(bg_intro_exp, t, amp_x=32, amp_y=16)
        render_particles(frame, t)
        
        # Overlay with fade in
        if t < 0.6:
            alpha_ratio = t / 0.6
            ov_cur = ov_1.copy()
            ov_cur.putalpha(Image.eval(ov_cur.split()[3], lambda a: int(a * alpha_ratio)))
            frame.paste(ov_cur, (0, 0), ov_cur)
        else:
            frame.paste(ov_1, (0, 0), ov_1)
            
        # Cosmo in center: AAA levitation and cheerful tilt
        paste_cosmo_animated(frame, aura_smile_cyan, W // 2, 480, t, amp_bob_y=16, amp_tilt=3.5)
        
    elif t < 14.0:
        # Scene 2: Project Capabilities (5.6s - 14.0s)
        t_rel = t - 5.6
        frame = get_parallax_bg(bg_system_exp, t, amp_x=36, amp_y=18, phase=1.0)
        render_particles(frame, t)
        
        # Left overlay
        frame.paste(ov_2, (0, 0), ov_2)
        
        # Right Screenshot: floating UI window with slide transition
        sx, sy = 960, 160
        if t_rel < 4.2:
            paste_ui_floating(frame, framed_dash, sx, sy, t)
        else:
            paste_ui_floating(frame, framed_scan, sx, sy, t)
            
        # Cosmo on right: larger, prominent, emotional!
        # First 3.5s: analyzing data (thinking), then enthusiastic insight (smile)!
        if t_rel < 3.6:
            cur_sprite = aura_thinking_purple
        else:
            cur_sprite = aura_smile_cyan
        paste_cosmo_animated(frame, cur_sprite, 1620, 780, t, amp_bob_y=14, amp_tilt=4.0)
        
    elif t < 21.8:
        # Scene 3: Cosmo Powers (14.0s - 21.8s)
        t_rel = t - 14.0
        frame = get_parallax_bg(bg_cosmo_exp, t, amp_x=34, amp_y=18, phase=2.0)
        render_particles(frame, t)
        
        # Right overlay
        frame.paste(ov_3, (0, 0), ov_3)
        
        # Left Screenshot floating UI
        sx, sy = 120, 160
        if t_rel < 3.8:
            paste_ui_floating(frame, framed_rank, sx, sy, t)
        else:
            paste_ui_floating(frame, framed_modal, sx, sy, t)
            
        # Cosmo on left bottom: emotional transitions
        if t_rel < 4.0:
            cur_sprite = aura_smile_pink
        else:
            cur_sprite = aura_thinking_cyan
        paste_cosmo_animated(frame, cur_sprite, 350, 780, t, amp_bob_y=15, amp_tilt=3.8)
        
    else:
        # Scene 4: Outro & Call to Action (21.8s - 25.8s)
        t_rel = t - 21.8
        frame = get_parallax_bg(bg_warp_exp, t, amp_x=30, amp_y=14, phase=3.0)
        render_particles(frame, t)
        
        # Overlay
        frame.paste(ov_4, (0, 0), ov_4)
        
        # Cosmo floating in center with cosmic joy
        paste_cosmo_animated(frame, aura_smile_cyan, W // 2, 510, t, amp_bob_y=16, amp_tilt=3.5)
        
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
