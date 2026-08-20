from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'app/src/main/res/drawable-nodpi/ic_launcher_art.png'
OUT = ROOT / 'web/assets'

base = Image.open(SRC).convert('RGBA').resize((1024, 1024), Image.Resampling.LANCZOS)

# Composite the web badge at high resolution so every exported PNG is self-contained.
shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
cx, cy, r = 792, 232, 150
sd.ellipse((cx-r+8, cy-r+12, cx+r+8, cy+r+12), fill=(0, 0, 0, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
composite = Image.alpha_composite(base, shadow)
d = ImageDraw.Draw(composite)

d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(17, 19, 26, 255), outline=(244, 244, 245, 255), width=18)
gr = 96
d.ellipse((cx-gr, cy-gr, cx+gr, cy+gr), outline=(244, 244, 245, 255), width=16)
white = (244, 244, 245, 255)
w = 14
# Equator and latitude lines.
d.line((cx-gr, cy, cx+gr, cy), fill=white, width=w)
d.line((cx-81, cy-51, cx+81, cy-51), fill=white, width=w)
d.line((cx-81, cy+51, cx+81, cy+51), fill=white, width=w)
# Longitude curves.
for side in (-1, 1):
    pts = []
    for yy in range(-96, 97, 4):
        t = yy / 96
        x = side * 50 * (1 - t*t)
        pts.append((cx + x, cy + yy))
    d.line(pts, fill=white, width=w, joint='curve')

OUT.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    img = composite.resize((size, size), Image.Resampling.LANCZOS)
    img.save(OUT / f'icon-webapp-{size}.png', optimize=True)

# Safe-zone variant for launchers that prefer maskable icons.
maskable = Image.new('RGBA', (1024, 1024), (17, 19, 26, 255))
inner = composite.resize((820, 820), Image.Resampling.LANCZOS)
maskable.alpha_composite(inner, ((1024-820)//2, (1024-820)//2))
maskable.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / 'icon-webapp-maskable-512.png', optimize=True)
