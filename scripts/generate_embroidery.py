from PIL import Image, ImageDraw, ImageFilter
import math
import random

W, H = 2048, 2048
img = Image.new("RGBA", (W, H), (195, 14, 20, 255))
draw = ImageDraw.Draw(img)

# 1. Subtle silk weave texture
random.seed(42)
for y in range(0, H, 3):
    shade = random.randint(-10, 10)
    draw.line([(0, y), (W, y)], fill=(195 + shade, 14 + shade//2, 20 + shade//2, 255), width=1)

# Function to draw a graceful plum blossom branch
def draw_curved_branch(points, width_start, width_end):
    for i in range(len(points) - 1):
        t = i / max(1, len(points) - 1)
        w = int(width_start * (1 - t) + width_end * t)
        p1 = points[i]
        p2 = points[i+1]
        # Golden outer edge
        draw.line([p1, p2], fill=(235, 190, 60, 255), width=w + 6)
        # Deep bark color
        draw.line([p1, p2], fill=(70, 30, 15, 255), width=w)

# Branches
branch_pts = [(150, 1600), (320, 1400), (520, 1200), (750, 1050), (1020, 950), (1300, 900), (1600, 800), (1850, 650)]
sub1 = [(750, 1050), (880, 1250), (1050, 1450), (1200, 1600)]
sub2 = [(1020, 950), (1150, 750), (1350, 600), (1500, 480)]
sub3 = [(1300, 900), (1450, 1050), (1650, 1180)]

for b in [branch_pts, sub1, sub2, sub3]:
    draw_curved_branch(b, 22, 9)

# Plum blossom (Hoa mai vàng kim)
def draw_plum_blossom(cx, cy, radius, angle_offset=0):
    for i in range(5):
        a = angle_offset + i * (2 * math.pi / 5)
        px = cx + radius * 0.65 * math.cos(a)
        py = cy + radius * 0.65 * math.sin(a)
        pr = radius * 0.55
        draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(225, 175, 35, 255), outline=(255, 235, 120, 255), width=4)
        draw.ellipse([px - pr*0.65, py - pr*0.65, px + pr*0.65, py + pr*0.65], fill=(255, 220, 55, 255))
    draw.ellipse([cx - radius*0.25, cy - radius*0.25, cx + radius*0.25, cy + radius*0.25], fill=(175, 20, 10, 255))
    for i in range(8):
        sa = i * (2 * math.pi / 8)
        sx = cx + radius * 0.42 * math.cos(sa)
        sy = cy + radius * 0.42 * math.sin(sa)
        draw.line([(cx, cy), (sx, sy)], fill=(255, 245, 140, 255), width=3)
        draw.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=(255, 255, 190, 255))

# Lotus blossom (Hoa sen hồng)
def draw_lotus(cx, cy, scale=1.0):
    outer_angles = [-0.65, -0.35, 0.0, 0.35, 0.65]
    for oa in outer_angles:
        pw, ph = int(60 * scale), int(145 * scale)
        petal_img = Image.new("RGBA", (pw*2, ph*2), (0,0,0,0))
        pdraw = ImageDraw.Draw(petal_img)
        pdraw.ellipse([0, 0, pw*2, ph*2], fill=(225, 60, 90, 255), outline=(255, 220, 85, 255), width=5)
        pdraw.ellipse([pw*0.25, ph*0.25, pw*1.75, ph*1.75], fill=(255, 140, 170, 255))
        pdraw.ellipse([pw*0.45, ph*0.45, pw*1.55, ph*1.55], fill=(255, 210, 225, 255))
        rotated = petal_img.rotate(-oa * 57.3, resample=Image.BICUBIC)
        img.paste(rotated, (int(cx - pw), int(cy - ph)), rotated)
    
    inner_angles = [-0.3, 0.0, 0.3]
    for ia in inner_angles:
        pw, ph = int(48 * scale), int(125 * scale)
        petal_img = Image.new("RGBA", (pw*2, ph*2), (0,0,0,0))
        pdraw = ImageDraw.Draw(petal_img)
        pdraw.ellipse([0, 0, pw*2, ph*2], fill=(255, 160, 190, 255), outline=(255, 235, 130, 255), width=4)
        pdraw.ellipse([pw*0.3, ph*0.3, pw*1.7, ph*1.7], fill=(255, 235, 245, 255))
        rotated = petal_img.rotate(-ia * 57.3, resample=Image.BICUBIC)
        img.paste(rotated, (int(cx - pw), int(cy - ph*0.88)), rotated)
        
    draw.ellipse([cx - 32*scale, cy - 18*scale, cx + 32*scale, cy + 32*scale], fill=(250, 200, 45, 255), outline=(255, 240, 130, 255), width=4)

# Blossoms
blossom_positions = [
    (320, 1400, 52), (520, 1200, 60), (880, 1250, 54), (1050, 1450, 48), (1200, 1600, 44),
    (1150, 750, 58), (1350, 600, 52), (1500, 480, 46), (1450, 1050, 54), (1650, 1180, 48),
    (1600, 800, 62), (1850, 650, 50)
]
for bx, by, br in blossom_positions:
    draw_plum_blossom(bx, by, br, random.random()*math.pi)

# 2 Lotuses
draw_lotus(720, 820, scale=1.5)
draw_lotus(1320, 1300, scale=1.3)

# Lotus bud
draw.ellipse([535, 675, 615, 805], fill=(235, 75, 110, 255), outline=(255, 220, 85, 255), width=4)
draw.ellipse([550, 705, 600, 775], fill=(255, 175, 200, 255))

output_path = r"C:\Users\USER\Documents\ordermanagement\lantern_embroidery.png"
img.save(output_path, "PNG")
print("Saved texture to:", output_path)
