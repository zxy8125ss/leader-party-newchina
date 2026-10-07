// 电脑端时间轴布局：时间顺序优先 + 密度自适应
// - 每个有事件的年份是一列，列宽 = 该年所需“槽位”数 × 卡片宽
// - 同一年内按日期贪心放置：每条泳道分上下两格，事件占所需的连续格子，找最早一个格子都空闲的槽位
// - 连续无事件的年份压缩成一个窄段
// 结果保证卡片互不遮挡，跨泳道事件统一定位
import { LANE_INDEX, yearOf } from './data.js';

export const CARD_W = 188;
export const GAP_W = 64;      // 压缩段宽度
export const YEAR_PAD = 16;   // 列内左右留白

export function laneSpan(e) {
  const idx = e.lanes.map((l) => LANE_INDEX[l]);
  return [Math.min(...idx), Math.max(...idx)];
}

export function buildLayout(evts, startYear, endYear) {
  const byYear = new Map();
  for (const e of evts) {
    const y = yearOf(e);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(e);
  }
  const columns = [];   // {type:'year'|'gap', from, to, x, width, items:[{event, slot, span}]}
  let x = 0;
  let gapFrom = null;
  const flushGap = (to) => {
    if (gapFrom == null) return;
    columns.push({ type: 'gap', from: gapFrom, to, x, width: GAP_W, items: [] });
    x += GAP_W;
    gapFrom = null;
  };
  for (let y = startYear; y <= endYear; y++) {
    const list = byYear.get(y);
    if (!list) { if (gapFrom == null) gapFrom = y; continue; }
    flushGap(y - 1);
    // 每条泳道分上下两个“单元格”。单线事件占所在泳道的一个单元格；
    // 跨线事件占从起始泳道下半格到结束泳道上半格的连续单元格，卡片正好压在泳道分界线上。
    const occupied = []; // occupied[slot] = Set(unit)
    const items = list.map((event) => {
      const span = laneSpan(event);
      const choices = span[0] === span[1]
        ? [[span[0] * 2, span[0] * 2], [span[0] * 2 + 1, span[0] * 2 + 1]]
        : [[span[0] * 2 + 1, span[1] * 2]];
      for (let slot = 0; ; slot++) {
        const occ = occupied[slot] || (occupied[slot] = new Set());
        for (const [u0, u1] of choices) {
          let free = true;
          for (let u = u0; u <= u1; u++) if (occ.has(u)) { free = false; break; }
          if (free) {
            for (let u = u0; u <= u1; u++) occ.add(u);
            return { event, slot, span, units: [u0, u1] };
          }
        }
      }
    });
    const slots = occupied.length;
    const width = slots * CARD_W + YEAR_PAD * 2;
    columns.push({ type: 'year', from: y, to: y, x, width, items });
    x += width;
  }
  flushGap(endYear);
  return { columns, width: x };
}

// 年份 → 横坐标（年份尺跳转用）
export function xOfYear(layout, year) {
  for (const c of layout.columns) if (year >= c.from && year <= c.to) return c.x;
  return 0;
}
