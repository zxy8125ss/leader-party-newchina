import { useEffect, useMemo, useRef, useState } from 'react';
import outline from '../data/chinaOutline.json';
import { events, map, stages, stagesWithContent, locationById, sourceById, eventById } from '../lib/data.js';
import { getProgress } from '../lib/db.js';
import { useDb } from '../lib/hooks.js';
import { formatDate } from '../lib/format.js';
import { Link, LevelBadge } from '../components/common.jsx';

const { proj, width: W, height: H, path } = outline;
const X = (lng) => (lng - proj.lng0) * proj.kx;
const Y = (lat) => (proj.lat0 - lat) * proj.ky;
const inMap = (l) => l && l.lng > 72 && l.lng < 136 && l.lat > 17 && l.lat < 54.5;
const short = (n) => n.replace(/（.*）/, '');

// 地图页的用途：看每个阶段的事件发生在哪里、按时间顺序重心如何移动。
// 长征路线只在“土地革命战争”阶段作为可选图层出现。
export default function MapPage({ query }) {
  const progress = useDb(getProgress, ['readEvents']);
  const fromEvent = query.event && eventById[query.event];
  const initial = query.stage || fromEvent?.stageId || stagesWithContent[0]?.id;
  const [stage, setStage] = useState(initial);
  const [active, setActive] = useState(fromEvent ? fromEvent.id : null); // 选中的事件 ID
  const first = useRef(true);
  const [showRoute, setShowRoute] = useState(false);
  const [focus, setFocus] = useState(false); // 是否放大到选中地点
  const [step, setStep] = useState(-1);
  const timer = useRef();
  const route = map.routes[0];
  const routeStage = route && eventById['E1935-ZYHY']?.stageId; // 长征属于 S03

  // 没有指定阶段时，跟随上次阅读的阶段
  useEffect(() => {
    if (!query.stage && !query.event && progress?.lastReadStageId) setStage(progress.lastReadStageId);
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setActive(null); setShowRoute(false); setStep(-1); clearInterval(timer.current);
  }, [stage]);
  useEffect(() => () => clearInterval(timer.current), []);

  // 本阶段有地点的事件，按时间编号
  const list = useMemo(() => events
    .filter((e) => e.stageId === stage && e.locationId && locationById[e.locationId])
    .map((e, i) => ({ n: i + 1, e, loc: locationById[e.locationId] })), [stage]);
  const onMap = list.filter((x) => inMap(x.loc));
  const abroad = list.filter((x) => !inMap(x.loc));

  // 同一地点合并成一个标记
  const spots = useMemo(() => {
    const m = new Map();
    for (const x of onMap) {
      if (!m.has(x.loc.id)) m.set(x.loc.id, { loc: x.loc, items: [] });
      m.get(x.loc.id).items.push(x);
    }
    return [...m.values()];
  }, [onMap]);

  // 按时间顺序连接“毛泽东 / 中国共产党”两条线的事件地点，显示革命重心的移动（相邻重复地点去掉）
  const trail = [];
  for (const x of onMap) {
    if (!x.e.lanes.some((l) => l === 'mao' || l === 'party')) continue;
    if (trail[trail.length - 1]?.id !== x.loc.id) trail.push(x.loc);
  }
  const trailD = trail.map((l, i) => `${i ? 'L' : 'M'}${X(l.lng).toFixed(1)},${Y(l.lat).toFixed(1)}`).join('');
  const trailText = trail.map((l) => short(l.name)).join(' → ');

  // 长征图层
  const stops = route?.stops || [];
  const rpts = stops.map((s) => locationById[s.locationId]);
  const upto = step < 0 ? rpts.length - 1 : step;
  const routeD = rpts.slice(0, upto + 1).map((l, i) => `${i ? 'L' : 'M'}${X(l.lng).toFixed(1)},${Y(l.lat).toFixed(1)}`).join('');
  const play = () => {
    clearInterval(timer.current);
    let i = 0; setStep(0);
    timer.current = setInterval(() => {
      i += 1;
      if (i >= stops.length) { clearInterval(timer.current); setStep(-1); return; }
      setStep(i);
    }, 800);
  };

  // 视野自动缩放到本阶段地点（长征图层打开时包含路线）
  const activeLoc = list.find((x) => x.e.id === active)?.loc;
  const near = focus && activeLoc && inMap(activeLoc)
    ? onMap.map((x) => x.loc).filter((l) => Math.abs(l.lng - activeLoc.lng) < 4 && Math.abs(l.lat - activeLoc.lat) < 3)
    : null;
  const pts = near || [...onMap.map((x) => x.loc), ...(showRoute ? rpts : [])];
  let vb = [0, 0, W, H];
  if (pts.length) {
    const xs = pts.map((l) => X(l.lng)), ys = pts.map((l) => Y(l.lat));
    let x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 90, y0 = Math.min(...ys) - 45, y1 = Math.max(...ys) + 45;
    const minW = near ? 150 : 260;
    let w = Math.max(x1 - x0, minW), h = Math.max(y1 - y0, minW * H / W);
    if (w / h > W / H) h = w * H / W; else w = h * W / H;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    w = Math.min(w, W); h = Math.min(h, H);
    vb = [Math.max(0, Math.min(W - w, cx - w / 2)), Math.max(0, Math.min(H - h, cy - h / 2)), w, h];
  }
  const k = vb[2] / W; // 标记与文字按缩放比例保持屏幕上大小一致

  const st = stages.find((s) => s.id === stage);
  const activeItem = list.find((x) => x.e.id === active);
  const pick = (id) => {
    setActive(id); setFocus(true);
    document.getElementById('mi-' + id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="page map-page">
      <div className="page-head">
        <h2>地图</h2>
        <span className="muted small">看每个阶段的事件发生在哪里，以及重心如何转移</span>
      </div>

      <div className="stage-chips">
        {stages.map((s) => {
          const has = stagesWithContent.some((x) => x.id === s.id);
          return (
            <button key={s.id} className={`chip ${s.id === stage ? 'on' : ''}`} disabled={!has} onClick={() => setStage(s.id)}>
              {String(s.order).padStart(2, '0')} {s.title}
            </button>
          );
        })}
      </div>

      {st && (
        <div className="map-summary">
          <b>{st.title}</b><span className="muted">（{st.start.slice(0, 4)}—{st.end.slice(0, 4)}）</span>
          <span>本阶段 {list.length} 个事件有地点记录。</span>
          {trail.length > 1 && <><span>毛泽东与中共中央的主要活动地，按时间顺序：</span><span className="trail-text">{trailText}</span></>}
        </div>
      )}

      <div className="map-layout">
        <div className="map-wrap">
          {focus && activeLoc && <button className="btn map-reset" onClick={() => setFocus(false)}>返回本阶段全图</button>}
          <svg viewBox={vb.join(' ')} className="map-svg" role="img" aria-label={`${st?.title}事件地点示意图`}>
            <path d={path} className="map-land" style={{ strokeWidth: k }} />
            {trail.length > 1 && !showRoute && <path d={trailD} className="trail" style={{ strokeWidth: 1.8 * k, strokeDasharray: `${5 * k} ${4 * k}` }} />}
            {showRoute && (
              <>
                <path d={routeD} className="route-line" style={{ strokeWidth: 3 * k }} />
                {rpts.slice(0, upto + 1).map((l, i) => <circle key={'r' + i} cx={X(l.lng)} cy={Y(l.lat)} r={3 * k} className="route-dot" style={{ strokeWidth: 2 * k }} />)}
                {step >= 0 && (() => { const l = rpts[step]; return (
                  <g className="route-label" style={{ fontSize: 11 * k }}>
                    <rect x={X(l.lng) - 80 * k} y={Y(l.lat) - 34 * k} width={160 * k} height={22 * k} rx={4 * k} />
                    <text x={X(l.lng)} y={Y(l.lat) - 19 * k} textAnchor="middle">{stops[step].date.replace(/-/g, '.')} {short(l.name)} {stops[step].note.slice(0, 8)}</text>
                  </g>); })()}
              </>
            )}
            {spots.map(({ loc, items }) => {
              const on = items.some((x) => x.e.id === active);
              const nums = items.map((x) => x.n);
              const nationOnly = items.every((x) => !x.e.lanes.some((l) => l === 'mao' || l === 'party'));
              return (
                <g key={loc.id} className={`spot ${on ? 'on' : ''} ${nationOnly ? 'nation' : ''} ${showRoute ? 'faded' : ''}`} onClick={() => pick(items[0].e.id)}>
                  <circle cx={X(loc.lng)} cy={Y(loc.lat)} r={(on ? 11 : 9) * k} style={{ strokeWidth: 1.5 * k }} />
                  <text className="num" x={X(loc.lng)} y={Y(loc.lat) + 3.5 * k} textAnchor="middle" style={{ fontSize: 9 * k }}>{nums.length > 1 ? nums[0] + '+' : nums[0]}</text>
                  <text className="name" x={X(loc.lng) + 12 * k} y={Y(loc.lat) + 4 * k} style={{ fontSize: 11 * k, strokeWidth: 3 * k }}>{short(loc.name)}</text>
                  <title>{loc.name}：{items.map((x) => `${x.n}. ${x.e.title}`).join('；')}</title>
                </g>
              );
            })}
          </svg>
          <div className="map-legend small"><span><i className="lg red" />毛泽东 / 中共相关事件</span><span><i className="lg brown" />国家与时代事件</span><span><i className="lg dash" />活动地的先后顺序</span></div>
          <p className="muted small map-note">{outline.note}。地点坐标为近似值；虚线只表示先后，不表示行进路线。数字为本阶段事件序号，“+”表示同一地点有多个事件。</p>
        </div>

        <aside className="map-side">
          {activeItem && (
            <div className="map-focus">
              <div className="muted small">{activeItem.n}. {formatDate(activeItem.e)} · {activeItem.loc.name}</div>
              <b>{activeItem.e.title}</b>
              <p className="small">{activeItem.e.summary}</p>
              <div className="stage-actions" style={{ margin: 0 }}>
                <Link to={`/event/${activeItem.e.id}`} className="btn btn-primary">看详情</Link>
                {inMap(activeItem.loc) && <button className="btn" onClick={() => setFocus(!focus)}>{focus ? '返回全图' : '放大附近'}</button>}
              </div>
            </div>
          )}
          <ol className="map-list">
            {list.map((x) => (
              <li key={x.e.id} id={'mi-' + x.e.id} className={x.e.id === active ? 'on' : ''}>
                <button onClick={() => pick(x.e.id)}>
                  <span className="mnum">{x.n}</span>
                  <span className="mmain">
                    <span className="muted small">{formatDate(x.e)} · {short(x.loc.name)}{!inMap(x.loc) ? '（境外）' : ''}</span>
                    <span className="mtitle">{x.e.title} <LevelBadge level={x.e.level} /></span>
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="muted small">本阶段暂无地点记录。</li>}
          </ol>
          {abroad.length > 0 && <p className="muted small">境外地点不在地图上显示。</p>}
        </aside>
      </div>

      {route && stage === routeStage && (
        <section className="card">
          <div className="page-head">
            <h3>专题：{route.name}</h3>
            <div className="stage-actions" style={{ margin: 0 }}>
              <button className={`btn ${showRoute ? 'btn-on' : ''}`} onClick={() => { setShowRoute(!showRoute); setFocus(false); setStep(-1); clearInterval(timer.current); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{showRoute ? '隐藏路线' : '在地图上显示'}</button>
              {showRoute && <button className="btn btn-primary" onClick={play}>逐站播放</button>}
            </div>
          </div>
          <p className="muted small">{route.note}</p>
          {showRoute && (
            <ol className="route-list">{stops.map((s, i) => (
              <li key={i} className={step < 0 || i <= step ? 'done' : ''}><span className="muted">{s.date}</span> {short(locationById[s.locationId].name)}：{s.note}</li>
            ))}</ol>
          )}
          <p className="small muted">来源：{route.sourceIds.map((id) => sourceById[id]?.title).filter(Boolean).join('；')}</p>
        </section>
      )}
    </div>
  );
}
