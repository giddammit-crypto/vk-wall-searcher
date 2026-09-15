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

# Pre-render glowing aura for Cosmo
def make_aura(sprite, color=(0, 242, 254, 160), radius=22):
    w, h = sprite.size
    pad = radius * 2
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    # Extract alpha mask
    alpha = sprite.split()[3]
    solid = Image.new("RGBA", (w, h), color)
    canvas.paste(solid, (pad, pad), mask=alpha)
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=radius))
    canvas.paste(sprite, (pad, pad), mask=sprite)
    return canvas, pad

aura_smile_cyan, pad_smile = make_aura(cosmo_smile.resize((360, 360), Image.Resampling.LANCZOS), (0, 242, 254, 180), 20)
aura_smile_pink, _ = make_aura(cosmo_smile.resize((360, 360), Image.Resampling.LANCZOS), (240, 147, 251, 180), 20)
aura_thinking, pad_think = make_aura(cosmo_thinking.resize((320, 320), Image.Resampling.LANCZOS), (168, 85, 247, 180), 18)

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
print("Encoding frames...")

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    
    # -------------------------------------------------------------
    # Scene Selection based on voice timing
    # -------------------------------------------------------------
    if t < 5.6:
        # Scene 1: Intro (0.0s - 5.6s)
        # Background with gentle zoom
        zoom = 1.0 + (t / 5.6) * 0.05
        frame = bg_intro.copy()
        
        # Overlay with fade in
        if t < 0.6:
            alpha_ratio = t / 0.6
            ov_cur = ov_1.copy()
            ov_cur.putalpha(Image.eval(ov_cur.split()[3], lambda a: int(a * alpha_ratio)))
            frame.paste(ov_cur, (0, 0), ov_cur)
        else:
            frame.paste(ov_1, (0, 0), ov_1)
            
        # Cosmo in center, floating smoothly
        bob = math.sin(t * 3.5) * 14
        cw, ch = aura_smile_cyan.size
        cx = W // 2 - cw // 2
        cy = int(490 - ch // 2 + bob)
        frame.paste(aura_smile_cyan, (cx, cy), aura_smile_cyan)
        
    elif t < 14.0:
        # Scene 2: Project Capabilities (5.6s - 14.0s)
        t_rel = t - 5.6
        frame = bg_system.copy()
        
        # Left overlay
        frame.paste(ov_2, (0, 0), ov_2)
        
        # Right Screenshot: slide from dash to scan at t_rel = 4.2s (t = 9.8s)
        sx, sy = 960, 160
        if t_rel < 4.2:
            frame.paste(framed_dash, (sx, sy), framed_dash)
        else:
            # Transition
            frame.paste(framed_scan, (sx, sy), framed_scan)
            
        # Cosmo on right bottom with thinking / analytical pose
        bob = math.sin(t * 3.0) * 10
        cw, ch = aura_thinking.size
        cx = 1520
        cy = int(660 + bob)
        frame.paste(aura_thinking, (cx, cy), aura_thinking)
        
    elif t < 21.8:
        # Scene 3: Cosmo Powers (14.0s - 21.8s)
        t_rel = t - 14.0
        frame = bg_cosmo.copy()
        
        # Right overlay
        frame.paste(ov_3, (0, 0), ov_3)
        
        # Left Screenshot
        sx, sy = 120, 160
        if t_rel < 3.8:
            frame.paste(framed_rank, (sx, sy), framed_rank)
        else:
            frame.paste(framed_modal, (sx, sy), framed_modal)
            
        # Cosmo on left bottom cheering
        bob = math.sin(t * 3.8) * 12
        cw, ch = aura_smile_pink.size
        cx = 120
        cy = int(660 + bob)
        frame.paste(aura_smile_pink, (cx, cy), aura_smile_pink)
        
    else:
        # Scene 4: Outro & Call to Action (21.8s - 25.8s)
        t_rel = t - 21.8
        frame = bg_warp.copy()
        
        # Overlay
        frame.paste(ov_4, (0, 0), ov_4)
        
        # Cosmo floating in center with cosmic joy
        bob = math.sin(t * 4.0) * 14
        cw, ch = aura_smile_cyan.size
        cx = W // 2 - cw // 2
        cy = int(520 - ch // 2 + bob)
        frame.paste(aura_smile_cyan, (cx, cy), aura_smile_cyan)
        
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
