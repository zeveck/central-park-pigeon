"""Derive the cloud band's alpha from sky-clouds.jpg: the painted sky gradient
is removed (per-row median colour), so the clouds can sit over the code sky
gradient of any phase. Writes game/assets/bg/sky-clouds-band.png (RGBA, 2048 wide).
Run: python3 game/tools/make-cloud-band.py  (from the project root)"""
from PIL import Image, ImageFilter
import numpy as np
import sys, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(root, 'assets/bg/sky-clouds.jpg')).convert('RGB')
src = src.resize((2048, round(2048 * src.height / src.width)), Image.LANCZOS)
a = np.asarray(src).astype(np.float32) / 255.0
# per-row sky colour: the bluest 30% of each row (clouds are warmer), then a
# smooth polynomial down the rows so cloud-heavy rows don't leave stripes
br = a[..., 2] - a[..., 0]
thr = np.percentile(br, 70, axis=1, keepdims=True)
m = (br >= thr)[..., None]
rows = (a * m).sum(axis=1) / np.maximum(m.sum(axis=1), 1)
t = np.linspace(-1, 1, rows.shape[0])
sky = np.stack([np.polyval(np.polyfit(t, rows[:, c], 5), t) for c in range(3)], axis=1)[:, None, :]
d = np.sqrt(((a - sky) ** 2).sum(axis=2))
lum = a.mean(axis=2) - sky.mean(axis=2)
alpha = np.clip((d - 0.035) / 0.10, 0, 1)
alpha = np.maximum(alpha, np.clip(lum * 6, 0, 1))
al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
alpha = np.asarray(al).astype(np.float32) / 255.0
# fade the very top and bottom rows
h = alpha.shape[0]
ramp = np.clip(np.minimum(np.arange(h) / (h * 0.06), (h - 1 - np.arange(h)) / (h * 0.10)), 0, 1)[:, None]
alpha *= ramp
# un-premultiply the sky out of soft edges: colour = sky + (pixel - sky) / alpha (clamped)
col = np.where(alpha[..., None] > 0.05, sky + (a - sky) / np.maximum(alpha[..., None], 0.35), a)
col = np.clip(col, 0, 1)
out = np.dstack([col, alpha]) * 255
Image.fromarray(out.astype(np.uint8), 'RGBA').save(os.path.join(root, 'assets/bg/sky-clouds-band.png'), optimize=True)
print('ok', out.shape)
