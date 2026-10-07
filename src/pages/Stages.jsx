import { useEffect, useMemo } from 'react';
import { stages, events, stageById, quizOfStage } from '../lib/data.js';
import { getAllRead, getProgress } from '../lib/db.js';
import { useDb } from '../lib/hooks.js';
import { EventRow, Link, Empty } from '../components/common.jsx';

export function Stages() {
  const read = useDb(getAllRead, ['readEvents']);
  const readSet = new Set((read || []).map((r) => r.eventId));
  return (
    <div className="page">
      <div className="page-head"><h2>按阶段学习</h2><Link to="/timeline" className="btn-text">切换到连续时间轴</Link></div>
      <ol className="stage-list">
        {stages.map((s) => {
          const list = events.filter((e) => e.stageId === s.id && e.level !== 'B');
          const done = list.filter((e) => readSet.has(e.id)).length;
          const ready = list.length > 0;
          return (
            <li key={s.id} className={ready ? 'stage-item' : 'stage-item disabled'}>
              {ready ? <Link to={`/stage/${s.id}`} className="stage-link">
                <span className="stage-no">{String(s.order).padStart(2, '0')}</span>
                <span className="stage-main"><b>{s.title}</b><span className="muted small">{s.start.slice(0, 4)}—{s.end.slice(0, 4)} · 核心事件 {list.length} 个 · 已读 {done}</span></span>
                <span className="arrow">→</span>
              </Link> : (
                <div className="stage-link"><span className="stage-no">{String(s.order).padStart(2, '0')}</span>
                  <span className="stage-main"><b>{s.title}</b><span className="muted small">{s.start.slice(0, 4)}—{s.end.slice(0, 4)} · 内容待补充</span></span></div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StageDetail({ id }) {
  const s = stageById[id];
  const read = useDb(getAllRead, ['readEvents']);
  const progress = useDb(getProgress, ['readEvents']);
  const readSet = new Set((read || []).map((r) => r.eventId));
  const list = useMemo(() => events.filter((e) => e.stageId === id), [id]);
  const qs = quizOfStage(id);
  useEffect(() => {
    if (progress?.lastReadStageId === id) document.getElementById('st-' + progress.lastReadEventId)?.scrollIntoView({ block: 'center' });
  }, [progress, id]);
  if (!s) return <Empty>阶段不存在。</Empty>;
  return (
    <div className="page">
      <nav className="crumbs"><Link to="/stages">按阶段学习</Link></nav>
      <div className="stage-head">
        <span className="stage-no big">{String(s.order).padStart(2, '0')}</span>
        <div><h2>{s.title}</h2><div className="muted">{s.start.replace('-', '.')} — {s.end.replace('-', '.')}</div></div>
      </div>
      {s.intro && <p className="stage-intro">{s.intro}</p>}
      <div className="stage-actions">
        <Link to={`/timeline?year=${s.start.slice(0, 4)}`} className="btn">在时间轴中查看</Link>
        {qs.length > 0 && <Link to={`/quiz/${id}`} className="btn btn-primary">阶段测验（{qs.length} 题）</Link>}
      </div>
      {list.length === 0 ? <Empty>本阶段内容待补充。</Empty> : (
        <div className="event-list">
          {list.map((e) => <EventRow key={e.id} id={'st-' + e.id} event={e} read={readSet.has(e.id)} />)}
        </div>
      )}
    </div>
  );
}
