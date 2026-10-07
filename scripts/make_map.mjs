// 生成示意地图轮廓：node scripts/make_map.mjs
// 数据来自 Natural Earth（公有领域）经 world-atlas 包提供；只作示意，不作为国界依据。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { merge } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-50m.json');
const geoms = topo.objects.countries.geometries.filter((g) => ['156', '158'].includes(String(g.id)));
const shape = merge(topo, geoms);

// 与 src/lib/geo.js 保持一致的投影（等距圆柱，纬度方向略拉伸）
export const PROJ = { lng0: 72, lat0: 54.5, kx: 10, ky: 12 };
const px = (lng) => +((lng - PROJ.lng0) * PROJ.kx).toFixed(1);
const py = (lat) => +((PROJ.lat0 - lat) * PROJ.ky).toFixed(1);

const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
let d = '';
for (const poly of shape.coordinates) {
  const outer = poly[0];
  if (ringArea(outer) < 0.25) continue; // 去掉很小的岛屿，保留台湾、海南等
  let last = null;
  const pts = [];
  for (const [lng, lat] of outer) {
    const p = [px(lng), py(lat)];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.2) continue; // 简化
    pts.push(p); last = p;
  }
  if (pts.length > 2) d += 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
}
const out = { note: '示意图，依据 Natural Earth 公有领域数据简化绘制，不作为国界依据', proj: PROJ, width: px(136), height: py(17), path: d };
const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/data/chinaOutline.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log('outline', (d.length / 1024).toFixed(1), 'KB', out.width, 'x', out.height);
