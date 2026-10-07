import { useMemo, useRef, useState } from 'react';
import outline from '../data/chinaOutline.json';
import { events, map, stages, locationById, sourceById } from '../lib/data.js';
import { formatDate } from '../lib/format.js';
import { EventRow, Link } from '../components/common.jsx';

const { proj, width: W, height: H, path } = outline;
const X = (lng) => (lng - proj.lng0) * proj.kx;
const Y = (lat) => (proj.lat0 - lat) * proj.ky;
const inMap = (l) => l.lng > 72 && l.lng < 136 && l.lat > 17 && l.lat < 54.5;

export default function MapPage({ query }) {
  const [stage, setStage] = useState(query.stage || '');
  const [sel, setSel] = useState(query.loc || null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const timer = useRef();
  const route = map.routes[0];

  // 每个地点关联的事件（按阶段筛选）
  const byLoc = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      if (!e.locationId || (stage && e.stageId !== stage)) continue;
      if (!m.has(e.locationId)) m.set(e.locationId, []);
      m.get(e.locationId).push(e);
    }
    return m;
  }, [stage]);
  const spots = [...byLoc.keys()].map((id) => locationById[id]).filter((l) => l && inMap(l));
  const outside = [...byLoc.keys()].map((id) => locationById[id]).filter((l) => l && !inMap(l));

  const stops = route?.stops || [];
  const pts = stops.map((s) => locationById[s.locationId]);
  const routeD = pts.map((l, i) => `${i ? 'L' : 'M'}${X(l.lng).toFixed(1)},${Y(l.lat).toFixed(1)}`).join('');

  const play = () => {
    clearInterval(timer.current);
    setPlaying(true); setStep(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (i >= stops.length) { clearInterval(timer.current); setPlaying(false); setStep(stops.length - 1); return; }
      setStep(i);
    }, 900);
  };
  const shownD = step < 0 ? '' : pts.slice(0, step + 1).map((l, i) => `${i ? 'L' : 'M'}${X(l.lng).toFixed(1)},${Y(l.lat).toFixed(1)}`).join('');
  const selList = sel ? byLoc.get(sel) || [] : [];

  return (
    <div className="page map-page">
      <div className="page-head"><h2>地图</h2>
        <label className="map-filter">阶段
          <select value={stage} onChange={(e) => { setStage(e.target.value); setSel(null); }}>
            <option value="">全部</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <div className="map-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img" aria-label="事件地点示意图">
          <path d={path} className="map-land" />
          {route && <path d={routeD} className="route-ghost" />}
          {shownD && <path d={shownD} className="route-line" />}
          {step >= 0 && pts.slice(0, step + 1).map((l, i) => (
            <circle key={'r' + i} cx={X(l.lng)} cy={Y(l.lat)} r={3} className="route-dot" />
          ))}
          {spots.map((l) => {
            const n = byLoc.get(l.id).length;
            return (
              <g key={l.id} className={`spot ${sel === l.id ? 'on' : ''}`} onClick={() => setSel(l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(l.id)}>
                <circle cx={X(l.lng)} cy={Y(l.lat)} r={4 + Math.min(n, 6) * 1.2} />
                <title>{l.name}：{n} 个事件</title>
                {(n >= 2 || sel === l.id || stage) && <text x={X(l.lng) + 7} y={Y(l.lat) + 4}>{l.name.replace(/（.*）/, '')}</text>}
              </g>
            );
          })}
          {step >= 0 && stops[step] && (() => { const l = pts[step]; return (
            <g className="route-label"><rect x={X(l.lng) - 70} y={Y(l.lat) - 36} width={140} height={24} rx={4} />
              <text x={X(l.lng)} y={Y(l.lat) - 19} textAnchor="middle">{stops[step].date.replace('-', '.')} {stops[step].note.slice(0, 10)}</text></g>
          ); })()}
        </svg>
        <p className="muted small map-note">{outline.note}。地点坐标为近似值。</p>
      </div>

      {route && (
        <section className="card">
          <div className="page-head"><h3>{route.name}</h3>
            <button className="btn btn-primary" onClick={play} disabled={playing}>{playing ? '播放中…' : step >= 0 ? '重新播放' : '播放长征路线'}</button>
          </div>
          <p className="muted small">{route.note}</p>
          <ol className="route-list">{stops.map((s, i) => (
            <li key={i} className={i <= step ? 'done' : ''}><span className="muted">{s.date}</span> {locationById[s.locationId].name}：{s.note}</li>
          ))}</ol>
          <p className="small muted">来源：{route.sourceIds.map((id) => sourceById[id]?.title).filter(Boolean).join('；')}</p>
        </section>
      )}

      {sel && (
        <section className="card">
          <div className="page-head"><h3>{locationById[sel]?.name}</h3><button className="btn-text" onClick={() => setSel(null)}>关闭</button></div>
          <div className="event-list">{selList.map((e) => <EventRow key={e.id} event={e} extra={<span className="muted small">{formatDate(e)}</span>} />)}</div>
        </section>
      )}
      {outside.length > 0 && (
        <p className="small muted">境外地点：{outside.map((l) => <span key={l.id}>{l.name}（{byLoc.get(l.id).map((e) => <Link key={e.id} to={`/event/${e.id}`}>{e.title}</Link>)}）</span>)}</p>
      )}
    </div>
  );
}
