"""生成 PWA 图标（米黄底、中国红圆章、白色年份线）。python3 scripts/make_icons.py"""
import pathlib
from PIL import Image, ImageDraw

out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
RED, PAPER, INK = (158, 42, 34), (245, 239, 226), (60, 38, 30)

def icon(size, maskable=False):
    im = Image.new('RGB', (size, size), RED if maskable else PAPER)
    d = ImageDraw.Draw(im)
    pad = int(size * (0.18 if maskable else 0.08))
    if not maskable:
        d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=size // 6, fill=RED)
    # 三条泳道线 + 时间节点
    left, right = int(size * 0.27), int(size * 0.73)
    for i, y in enumerate([0.38, 0.5, 0.62]):
        yy = int(size * y)
        d.line([left, yy, right, yy], fill=PAPER, width=max(2, size // 48))
    for x, y in [(0.36, 0.38), (0.55, 0.5), (0.64, 0.62), (0.45, 0.5)]:
        r = size // 22
        cx, cy = int(size * x), int(size * y)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PAPER)
    return im

icon(192).save(out / 'icon-192.png')
icon(512).save(out / 'icon-512.png')
icon(512, maskable=True).save(out / 'icon-512-maskable.png')
print('icons ok')
