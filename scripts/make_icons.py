"""生成 PWA 图标：红底，三条线（毛泽东 / 中共 / 国家与时代）汇向一颗金星。python3 scripts/make_icons.py"""
import math, pathlib
from PIL import Image, ImageDraw

out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
RED, PAPER, GOLD = (158, 42, 34), (245, 239, 226), (226, 182, 92)
SS = 4  # 先放大 4 倍画，再缩小，边缘平滑


def star(d, cx, cy, R, fill):
    pts = []
    for i in range(10):
        r = R if i % 2 == 0 else R * 0.382
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=fill)


def icon(size, maskable=False):
    n = size * SS
    im = Image.new('RGB', (n, n), RED)
    d = ImageDraw.Draw(im)
    k = 0.72 if maskable else 1  # maskable 留出安全区
    c = lambda v: n / 2 + (v - 0.5) * n * k
    sx, sy = c(0.70), c(0.34)
    w = int(n * 0.034 * k)
    for y0 in (0.42, 0.58, 0.74):
        r = w / 2
        for i in range(1601):  # 用密集圆点描线，避免折线接缝
            t = i / 1600
            x, y = c(0.16) + (sx - c(0.16)) * t, c(y0) + (sy - c(y0)) * t ** 2.2
            d.ellipse([x - r, y - r, x + r, y + r], fill=PAPER)
    star(d, sx, sy, n * 0.15 * k, GOLD)
    return im.resize((size, size), Image.LANCZOS)


icon(192).save(out / 'icon-192.png')
icon(512).save(out / 'icon-512.png')
icon(512, maskable=True).save(out / 'icon-512-maskable.png')
print('icons ok')
