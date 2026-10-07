import { useMemo, useState } from 'react';
import { events, stages, personById } from '../lib/data.js';
import { formatDate, ageText, KIND_NAME, kindOf } from '../lib/format.js';
import { getAllRead } from '../lib/db.js';
import { useDb } from '../lib/hooks.js';
import { Link, LevelBadge } from '../components/common.jsx';

const KINDS = ['all', 'life', 'event', 'work', 'poem'];
const maoItems = events.filter((e) => e.lanes.includes('mao'));
const ageOfYear = (y) => Number(y.slice(0, 4)) - 1893;

// 以毛泽东为主轴：按人生阶段排列他的经历、遇到的大事、著作与诗词，以及每件事背后他的思考
export default function MaoPage({ query }) {
  const [kind, setKind] = useState(query.kind || 'all');
  const read = useDb(getAllRead, ['readEvents']);
  const readSet = new Set((read || []).map((r) => r.eventId));
  const mao = personById['P-MAO'];
  const list = useMemo(() => maoItems.filter((e) => kind === 'all' || kindOf(e) === kind), [kind]);
  const count = (k) => (k === 'all' ? maoItems.length : maoItems.filter((e) => kindOf(e) === k).length);

  return (
    <div className="page mao-page">
      <header className="mao-head">
        <div className="home-no">主线 · 1893.12.26—1976.9.9</div>
        <h1>毛泽东</h1>
        <p className="muted">按人生阶段梳理他的经历、亲历和主导的大事、著作与诗词，以及每一步背后他的思考。点任意一条看详情、写笔记。</p>
        <div className="mao-roles">{mao.roles.slice(-4).map((r, i) => <span key={i} className="chip">{r.period} {r.title}</span>)}</div>
      </header>

      <div className="kind-chips">
        {KINDS.map((k) => (
          <button key={k} className={`chip kind-${k} ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {k === 'all' ? '全部' : KIND_NAME[k]} {count(k)}
          </button>
        ))}
      </div>

      <nav className="life-nav">
        {stages.map((s) => list.some((e) => e.stageId === s.id) && (
          <a key={s.id} href={`#/mao?kind=${kind}`} onClick={(ev) => { ev.preventDefault(); document.getElementById('ms-' + s.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
            {s.title}<span>{Math.max(0, ageOfYear(s.start))}—{ageOfYear(s.end)}岁</span>
          </a>
        ))}
      </nav>

      {stages.map((s) => {
        const items = list.filter((e) => e.stageId === s.id);
        if (!items.length) return null;
        return (
          <section key={s.id} id={'ms-' + s.id} className="life-stage">
            <h2><span className="stage-no">{String(s.order).padStart(2, '0')}</span>{s.title}
              <small>{s.start.slice(0, 4)}—{s.end.slice(0, 4)} · {Math.max(0, ageOfYear(s.start))}—{ageOfYear(s.end)}岁</small></h2>
            <ol className="life-list">
              {items.map((e) => {
                const k = kindOf(e);
                return (
                  <li key={e.id} className={`life-item kind-${k}`}>
                    <div className="life-when"><b>{formatDate(e).replace(/年.*/, '')}</b><span>{ageText(e)}</span></div>
                    <Link to={`/event/${e.id}?from=mao`} className="life-card">
                      <span className="life-meta"><span className={`kind-tag kind-${k}`}>{KIND_NAME[k]}</span><span className="muted small">{formatDate(e)}</span>{e.level !== 'B' && <LevelBadge level={e.level} />}{readSet.has(e.id) && <span className="read-dot">已读</span>}</span>
                      <span className="life-title">{e.title}</span>
                      <span className="life-sum">{e.summary}</span>
                      {e.insight && <span className="life-insight"><em>{k === 'poem' ? '诗中心境' : k === 'work' ? '核心观点' : '他的思考'}</em>{e.insight}</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="muted small">诗词与著作只转述内容和背景，不收录原文；“核心观点”“诗中心境”是对原作的概括，读原作请查《毛泽东选集》《毛泽东诗词集》。</p>
    </div>
  );
}
