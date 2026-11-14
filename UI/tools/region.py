# Pixel-mismatch % inside a region: python3 -I region.py <slug> x0 y0 x1 y1  (uses tmp/<slug>.png from check.mjs)
import sys
from PIL import Image, ImageChops
slug, *box = sys.argv[1:]; box = tuple(map(int, " ".join(box).split()))
r = Image.open(f"../reference/{slug}.png").convert("RGB").crop(box)
b = Image.open(f"tmp/{slug}.png").convert("RGB").crop(box)
d = ImageChops.difference(r, b).convert("L").point(lambda v: 255 if v > 40 else 0)
print(f"{slug} region {box}: {100 * sum(1 for p in d.get_flattened_data() if p) / (d.width * d.height):.2f}% px differ")
