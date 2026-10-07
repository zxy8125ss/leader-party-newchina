"""按实际用到的字符裁剪 Noto 字体，输出到 public/fonts/*.woff2。

用法：python3 scripts/subset_fonts.py [源字体目录]
源字体（不入库）：NotoSansSC-Regular.otf、NotoSerifSC-Bold.otf，来自 github.com/notofonts/noto-cjk。
内容或界面文字变化后重新运行一次，再提交生成的 woff2。
未包含的字（例如笔记里新打的字）会自动回退到系统字体。
"""
import pathlib, sys
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
src_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.fonts-src'
out = root / 'public' / 'fonts'
out.mkdir(parents=True, exist_ok=True)

chars = set()
for p in list((root / 'data' / 'content').glob('*.json')) + list((root / 'src').rglob('*.js*')) + [root / 'index.html']:
    chars.update(p.read_text(encoding='utf-8'))
chars.update(chr(c) for c in range(0x20, 0x7F))           # ASCII
chars.update('，。、；：？！“”‘’（）《》〈〉【】—…·「」『』〔〕％＋－×÷＝０１２３４５６７８９')
text = ''.join(sorted(c for c in chars if c.isprintable()))

for name, outname in [('NotoSansSC-Regular.otf', 'sans-400.woff2'), ('NotoSerifSC-Bold.otf', 'serif-700.woff2')]:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    f = subset.load_font(str(src_dir / name), opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    subset.save_font(f, str(out / outname), opts)
    print(outname, (out / outname).stat().st_size // 1024, 'KB', len(text), 'chars')
