import { useEffect, useMemo, useRef, useState } from 'react';
import { events, intl, stages, LANES, eventById } from '../lib/data.js';
import { buildLayout, xOfYear, CARD_W, YEAR_PAD } from '../lib/layout.js';
import { getProgress, getAllRead } from '../lib/db.js';
import { useDb, useIsMobile, go } from '../lib/hooks.js';
import { shortDate } from '../lib/format.js';
import { EventRow, Link, LevelBadge } from '../components/common.jsx';

const START = 1893, END = 1976;
const LANE_H = 128, UNIT_H = LANE_H / 2, HEAD_H = 64, LABEL_W = 56;

// 本机偏好（显示 B 级 / 国际背景 / 手机端线筛选），读写失败时用默认值
const pref = {
  get(k, d) { try { const v = localStorage.getItem('lp.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lp.' + k, JSON.stringify(v)); } catch { /* 忽略 */ } },
};
function usePref(k, d) {
  const [v, setV] = useState(() => pref.get(k, d));
  return [v, (x) => { setV(x); pref.set(k, x); }];
}

// 国际背景条目转成可布局的条目（放在“国家与时代”线，灰色）
const intlItems = intl.map((i) => ({ ...i, lanes: ['nation'], level: 'I', isIntl: true }));

export default function Timeline({ query }) {
  const mobile = useIsMobile();
  const [showB, setShowB] = usePref('showB', false);
  const [showIntl, setShowIntl] = usePref('showIntl', true);
  const [showMao, setShowMao] = usePref('showMao', true);
  const progress = useDb(getProgress, ['readEvents']);
  const read = useDb(getAllRead, ['readEvents']);
  const readSet = useMemo(() => new Set((read || []).map((r) => r.eventId)), [read]);
  const focusId = query.focus || progress?.lastReadEventId;

  const items = useMemo(() => {
    const list = events.filter((e) => showB || e.level !== 'B' || (showMao && e.lanes.includes('mao') && e.kind && e.kind !== 'event'));
    return showIntl ? [...list, ...intlItems].sort((a, b) => (a.sortDate || a.date).localeCompare(b.sortDate || b.date)) : list;
  }, [showB, showIntl, showMao]);

  const toolbar = (
    <div className="tl-toolbar">
      <div className="tl-title"><h2>时间轴</h2><span className="muted small">1893—1976 · 无事件年份已压缩</span></div>
      <label className="chk"><input type="checkbox" checked={showMao} onChange={(e) => setShowMao(e.target.checked)} />显示毛泽东的经历、著作与诗词</label>
      <label className="chk"><input type="checkbox" checked={showB} onChange={(e) => setShowB(e.target.checked)} />显示 B 级背景事件</label>
      <label className="chk"><input type="checkbox" checked={showIntl} onChange={(e) => setShowIntl(e.target.checked)} />显示国际背景</label>
      <Link to="/stages" className="btn-text">切换到阶段视图</Link>
    </div>
  );

  return (
    <div className="timeline-page">
      {toolbar}
      {mobile
        ? <MobileTimeline items={items} focusId={progress === null ? null : focusId} readSet={readSet} />
        : <DesktopTimeline items={items} focusId={progress === null ? null : focusId} readSet={readSet} year={query.year} />}
    </div>
  );
}

function DesktopTimeline({ items, focusId, readSet, year }) {
  const scroller = useRef(null);
  const layout = useMemo(() => buildLayout(items, START, END), [items]);
  const [curYear, setCurYear] = useState(START);
  const [flash, setFlash] = useState(null);
  const height = HEAD_H + LANE_H * 3 + 12;

  const scrollToX = (x, smooth = true) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, x - 120), behavior: smooth ? 'smooth' : 'auto' });
  };

  // 定位：URL 指定年份 > 指定/上次阅读的事件 > 第一个有内容的年份
  const positioned = useRef(false);
  useEffect(() => {
    if (positioned.current || focusId === null) return;
    positioned.current = true;
    if (year) return scrollToX(xOfYear(layout, Number(year)), false);
    for (const c of layout.columns) for (const it of c.items) if (it.event.id === focusId) {
      setFlash(focusId);
      setTimeout(() => setFlash(null), 2400);
      return scrollToX(c.x + YEAR_PAD + it.slot * CARD_W - 200, false);
    }
    const first = layout.columns.find((c) => c.type === 'year');
    if (first) scrollToX(first.x, false);
  }, [focusId, layout, year]);

  const onScroll = () => {
    const x = scroller.current.scrollLeft + 140;
    const c = layout.columns.find((c) => x >= c.x && x < c.x + c.width) || layout.columns[layout.columns.length - 1];
    if (c) setCurYear(c.type === 'gap' ? c.from : c.from);
  };

  // 阶段色带：根据列位置计算每个阶段的横向范围
  const stageBands = stages.map((s) => {
    const from = Number(s.start.slice(0, 4)), to = Number(s.end.slice(0, 4));
    const cols = layout.columns.filter((c) => c.to >= from && c.from <= to);
    if (!cols.some((c) => c.type === 'year')) return null; // 没有内容的阶段不画色带
    const x0 = cols[0].x, x1 = cols[cols.length - 1].x + cols[cols.length - 1].width;
    return { s, x0, x1 };
  }).filter(Boolean);

  return (
    <>
      <div className="ruler">
        <span className="ruler-year">{curYear}</span>
        <input type="range" min={START} max={END} value={curYear}
          onChange={(e) => { const y = Number(e.target.value); setCurYear(y); scrollToX(xOfYear(layout, y), false); }} />
        <span className="muted small">拖动年份尺跳转</span>
      </div>
      <div className="tl-wrap" style={{ height }}>
        <div className="tl-labels" style={{ width: LABEL_W }}>
          <div style={{ height: HEAD_H }} />
          {LANES.map((l) => <div key={l.id} className={`tl-label lane-${l.id}`} style={{ height: LANE_H }}>{l.name}</div>)}
        </div>
        <div className="tl-scroll" ref={scroller} onScroll={onScroll}>
          <div className="tl-canvas" style={{ width: layout.width + 160, height }}>
            {stageBands.map(({ s, x0, x1 }) => (
              <div key={s.id} className="stage-band" style={{ left: x0, width: x1 - x0 }} title={s.title}>
                <span>{s.title}</span>
              </div>
            ))}
            {[0, 1, 2].map((i) => <div key={i} className={`lane-bg lane-bg-row-${i}`} style={{ top: HEAD_H + i * LANE_H, height: LANE_H, width: layout.width + 160 }} />)}
            {layout.columns.map((c) => c.type === 'gap' ? (
              <div key={'g' + c.from} className="tl-gap" style={{ left: c.x, width: c.width, top: 22, height: height - 22 }}>
                <span>{c.from === c.to ? c.from : `${c.from}—${c.to}`}</span>
              </div>
            ) : (
              <div key={'y' + c.from}>
                <button className="tl-year" style={{ left: c.x, width: c.width }} onClick={() => scrollToX(c.x)}>{c.from}</button>
                <div className="tl-yearline" style={{ left: c.x, top: 22, height: height - 22 }} />
                {c.items.map(({ event, slot, span, units }) => {
                  const top = HEAD_H + units[0] * UNIT_H + 4;
                  const h = (units[1] - units[0] + 1) * UNIT_H - 8;
                  const left = c.x + YEAR_PAD + slot * CARD_W + 4;
                  const cls = ['tl-card', `lvl-${event.level}`, span[1] > span[0] ? 'cross' : '', flash === event.id ? 'flash' : '', readSet.has(event.id) ? 'is-read' : ''].join(' ');
                  return event.isIntl ? (
                    <div key={event.id} className={cls} style={{ left, top, width: CARD_W - 8, height: h }} title={event.summary}>
                      <span className="tl-date">{shortDate(event)} · 国际背景</span>
                      <span className="tl-name">{event.title}</span>
                    </div>
                  ) : (
                    <a key={event.id} href={`#/event/${event.id}?from=timeline`} className={cls} style={{ left, top, width: CARD_W - 8, height: h }}>
                      <span className="tl-date">{shortDate(event)} <LevelBadge level={event.level} /></span>
                      <span className="tl-name">{event.title}</span>
                      {span[1] > span[0] && <span className="tl-cross-note">{event.lanes.map((l) => LANES.find((x) => x.id === l).name).join(' · ')}</span>}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="muted small tl-hint">红色标题为 S 级核心节点；压在泳道分界线上的卡片同时属于多条线。点卡片看详情。</p>
    </>
  );
}

function MobileTimeline({ items, focusId, readSet }) {
  const [laneOn, setLaneOn] = usePref('mLanes', ['mao', 'party', 'nation']);
  const list = items.filter((e) => e.lanes.some((l) => laneOn.includes(l)));
  const done = useRef(false);
  useEffect(() => {
    if (done.current || focusId === null) return;
    done.current = true;
    const el = focusId && document.getElementById('m-' + focusId);
    if (el) el.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const toggle = (id) => setLaneOn(laneOn.includes(id) ? laneOn.filter((x) => x !== id) : [...laneOn, id]);
  const rows = [];
  let lastStage = null, lastYear = null;
  for (const e of list) {
    const y = e.date.slice(0, 4);
    const sid = e.stageId;
    if (sid && sid !== lastStage) { rows.push(<h3 key={'s' + sid + y} className="m-stage">{stages.find((s) => s.id === sid)?.title}</h3>); lastStage = sid; }
    if (y !== lastYear) { rows.push(<div key={'y' + y} className="m-year">{y}</div>); lastYear = y; }
    rows.push(e.isIntl
      ? <div key={e.id} className="m-intl"><span className="muted small">国际背景 · {shortDate(e)}</span><b>{e.title}</b><span className="small">{e.summary}</span></div>
      : <EventRow key={e.id} id={'m-' + e.id} event={e} read={readSet.has(e.id)} extra={<span className="event-row-sum">{e.summary}</span>} />);
  }
  return (
    <>
      <div className="lane-filter">
        {LANES.map((l) => (
          <button key={l.id} className={`chip lane-chip-${l.id} ${laneOn.includes(l.id) ? 'on' : ''}`} onClick={() => toggle(l.id)}>{l.name}</button>
        ))}
      </div>
      <div className="m-timeline">{rows.length ? rows : <p className="empty">请至少选择一条线。</p>}</div>
      {focusId && eventById[focusId] && <button className="fab" onClick={() => go(`/event/${focusId}`)}>继续：{eventById[focusId].title}</button>}
    </>
  );
}
