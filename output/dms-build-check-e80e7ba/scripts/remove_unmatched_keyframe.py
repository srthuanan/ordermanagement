import os
import base64
import re
from PIL import Image
import numpy as np

k1_path = r'C:\Users\USER\.gemini\antigravity-ide\brain\c22be014-8764-4351-bf25-c00437ac2bd7\dove_wings_up_1787308728574.jpg'
k2_path = r'C:\Users\USER\.gemini\antigravity-ide\brain\c22be014-8764-4351-bf25-c00437ac2bd7\peace_dove_chroma_1787308714474.jpg'
k3_path = r'C:\Users\USER\.gemini\antigravity-ide\brain\c22be014-8764-4351-bf25-c00437ac2bd7\white_peace_dove_flight_1787308628562.jpg'

def chroma_key(img_path):
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img, dtype=float)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    
    green_diff = g - np.maximum(r, b)
    alpha = np.clip(1.0 - (green_diff - 8) / 24.0, 0.0, 1.0)
    is_fringe = (green_diff > -8) & (alpha > 0)
    arr[is_fringe, 1] = np.minimum(arr[is_fringe, 1], np.maximum(arr[is_fringe, 0], arr[is_fringe, 2]) * 0.96 + 6)
    
    arr[:, :, 3] = alpha * 255.0
    res = Image.fromarray(arr.astype(np.uint8))
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
    return res

print('Processing pure side-profile keyframes (removing the front-facing keyframe)...')
f1 = chroma_key(k1_path)
f2 = chroma_key(k2_path)
f3 = chroma_key(k3_path)

target_h = 240
def scale_to_h(im, th):
    w = int(im.width * th / im.height)
    return im.resize((w, th), Image.Resampling.LANCZOS)

s1 = scale_to_h(f1, target_h)
s2 = scale_to_h(f2, target_h)
s3 = scale_to_h(f3, target_h)

max_w = max(s1.width, s2.width, s3.width) + 20
max_h = max(s1.height, s2.height, s3.height) + 20

def center_pad(im):
    c = Image.new('RGBA', (max_w, max_h), (0,0,0,0))
    x = (max_w - im.width) // 2
    y = (max_h - im.height) // 2
    c.paste(im, (x, y), im)
    return c

c1 = center_pad(s1)
c2 = center_pad(s2)
c3 = center_pad(s3)

# 8-frame smooth natural side-profile flap loop:
# c1: Wings High Up
# c2: Wings Mid-Up Glide
# c3: Wings Level Spread Forward Glide
sequence = [
    c1,                           # Wings High Up
    Image.blend(c1, c2, 0.5),     # Flap downstroke
    c2,                           # Wings Mid-Up
    Image.blend(c2, c3, 0.5),     # Flap downstroke
    c3,                           # Wings Level Spread Glide
    Image.blend(c3, c2, 0.5),     # Flap upstroke
    c2,                           # Wings Mid-Up
    Image.blend(c2, c1, 0.5),     # Flap upstroke to High Up
]

# Set 190ms per frame for a calm, serene flap (1.52s per full flap cycle)
slow_durations = [200, 180, 200, 180, 220, 180, 200, 180]

webp_path = r'C:\Users\USER\Documents\ordermanagement\public\assets\peace_dove_flying.webp'
sequence[0].save(
    webp_path,
    save_all=True,
    append_images=sequence[1:],
    duration=slow_durations,
    loop=0,
    quality=95,
    method=2
)

# Also save GIF
gif_frames = []
for f in sequence:
    alpha = f.split()[3]
    mask = Image.eval(alpha, lambda a: 255 if a <= 128 else 0)
    p_img = f.convert('RGB').quantize(colors=254, method=Image.Resampling.LANCZOS)
    p_img.paste(255, mask)
    p_img.info['transparency'] = 255
    gif_frames.append(p_img)

gif_path = r'C:\Users\USER\Documents\ordermanagement\public\assets\peace_dove_flying.gif'
gif_frames[0].save(
    gif_path,
    save_all=True,
    append_images=gif_frames[1:],
    duration=slow_durations,
    loop=0,
    disposal=2,
    transparency=255
)

# Convert to Base64 and update doveAsset.ts
with open(webp_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

dove_asset_file = r'C:\Users\USER\Documents\ordermanagement\components\ui\doveAsset.ts'
with open(dove_asset_file, 'r', encoding='utf-8') as df:
    code = df.read()

new_code = re.sub(
    r"export const PEACE_DOVE_GIF_BASE64 = '[^']+';",
    f"export const PEACE_DOVE_GIF_BASE64 = 'data:image/webp;base64,{b64}';",
    code
)

with open(dove_asset_file, 'w', encoding='utf-8') as df:
    df.write(new_code)

print('Successfully removed unmatched 3/4 front keyframe and built 100% consistent side-profile flight loop!')
