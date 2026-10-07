import { useMemo, useState } from 'react';
import { people, personById, stages } from '../lib/data.js';
import { go } from '../lib/hooks.js';
import { Link } from '../components/common.jsx';

// 人物关系图：毛泽东居中，其余人物按首次出现的阶段排成一圈；边来自 people.json 的 relations
const W = 720, H = 560, CX = W / 2, CY = H / 2, R = 220;

export default function PeopleGraph() {
  const [stage, setStage] = useState('');
  const [hover, setHover] = useState(null);

  const { nodes, edges } = useMemo(() => {
    const rel = [];
    for (const p of people) for (const r of p.relations || []) {
      if (!personById[r.personId]) continue;
      if (stage && !r.stageIds.includes(stage)) continue;
      rel.push({ a: p.id, b: r.personId, type: r.type });
    }
    const ids = new Set(rel.flatMap((r) => [r.a, r.b]));
    if (!stage) people.forEach((p) => ids.add(p.id));
    const firstStage = (p) => Math.min(...(p.relations || []).flatMap((r) => r.stageIds.map((s) => Number(s.slice(1)))), 9);
    const ring = [...ids].filter((id) => id !== 'P-MAO').map((id) => personById[id])
      .sort((x, y) => firstStage(x) - firstStage(y) || x.born.localeCompare(y.born));
    const pos = { 'P-MAO': { x: CX, y: CY } };
    ring.forEach((p, i) => {
      const t = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      pos[p.id] = { x: CX + R * Math.cos(t), y: CY + R * 0.92 * Math.sin(t) };
    });
    const nodes = [...ids].map((id) => ({ ...personById[id], ...pos[id] })).filter((n) => n.x != null);
    return { nodes, edges: rel.filter((r) => pos[r.a] && pos[r.b]).map((r) => ({ ...r, A: pos[r.a], B: pos[r.b] })) };
  }, [stage]);

  return (
    <div className="page graph-page">
      <nav className="crumbs"><Link to="/people">人物</Link></nav>
      <div className="page-head"><h2>人物关系图</h2>
        <label className="map-filter">阶段
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">全部</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <div className="graph-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg" role="img" aria-label="人物关系图">
          {edges.map((e, i) => {
            const on = hover && (hover === e.a || hover === e.b);
            const mx = (e.A.x + e.B.x) / 2, my = (e.A.y + e.B.y) / 2;
            return (
              <g key={i} className={`edge ${on ? 'on' : ''} ${hover && !on ? 'dim' : ''}`}>
                <line x1={e.A.x} y1={e.A.y} x2={e.B.x} y2={e.B.y} />
                {(on || edges.length < 14) && <text x={mx} y={my - 3} textAnchor="middle">{e.type}</text>}
              </g>
            );
          })}
          {nodes.map((n) => (
            <g key={n.id} className={`node ${n.id === 'P-MAO' ? 'center' : ''} ${n.tier}`} transform={`translate(${n.x},${n.y})`}
               onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => go(`/person/${n.id}`)}>
              <circle r={n.id === 'P-MAO' ? 34 : 24} />
              <text textAnchor="middle" y={4}>{n.name.replace(/（.*）/, '')}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="muted small">线上的文字是关系类型。按阶段筛选时，只显示该阶段有关系记录的人物。点人物看人物卡。</p>
    </div>
  );
}
