import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1920, 1080
img = Image.new("RGBA", (W, H), (6, 11, 28, 255))
draw = ImageDraw.Draw(img)

# Deep space gradient
for y in range(H):
    r = int(6 + 12 * (y / H))
    g = int(11 + 18 * (y / H))
    b = int(28 + 42 * (y / H))
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# Starfield
np.random.seed(424)
for _ in range(260):
    x = int(np.random.uniform(0, W))
    y = int(np.random.uniform(0, H))
    rad = float(np.random.uniform(0.6, 2.4))
    alpha = int(np.random.uniform(80, 240))
    col = (255, 255, 255, alpha) if np.random.rand() > 0.3 else (0, 240, 255, alpha)
    draw.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col)

# Ambient cosmic glows
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d_glow = ImageDraw.Draw(glow_layer)
d_glow.ellipse([W * 0.2 - 280, H * 0.4 - 280, W * 0.2 + 280, H * 0.4 + 280], fill=(0, 240, 255, 75))
d_glow.ellipse([W * 0.75 - 340, H * 0.6 - 340, W * 0.75 + 340, H * 0.6 + 340], fill=(236, 72, 153, 65))
d_glow.ellipse([W * 0.5 - 240, H * 0.2 - 240, W * 0.5 + 240, H * 0.2 + 240], fill=(168, 85, 247, 60))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(90))
img = Image.alpha_composite(img, glow_layer)

# 3D Orbital Rings & Matrix Grid
rings_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d_rings = ImageDraw.Draw(rings_layer)

cx, cy = int(W * 0.65), int(H * 0.52)
for rx, ry, color in [
    (540, 180, (0, 240, 255, 120)),
    (460, 150, (168, 85, 247, 90)),
    (380, 120, (251, 191, 36, 80)),
    (290, 95, (236, 72, 153, 90))
]:
    d_rings.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=color, width=2)

# Perspective Floor Grid
for i in range(-12, 13):
    start_x = cx + i * 110
    d_rings.line([(cx, cy + 80), (start_x, H)], fill=(0, 240, 255, 45), width=1)
for y_line in range(int(cy + 90), H, 35):
    d_rings.line([(0, y_line), (W, y_line)], fill=(0, 240, 255, 30), width=1)

img = Image.alpha_composite(img, rings_layer)
out_path = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/video/bg/space_rings_promo.png"
img.save(out_path, "PNG")
print(f"Generated {out_path} ({img.size})")
