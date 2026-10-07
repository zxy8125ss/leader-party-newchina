import { people, personById, eventById, sourceById } from '../lib/data.js';
import { formatDate } from '../lib/format.js';
import { Link, Empty } from '../components/common.jsx';

const life = (p) => `${p.born.slice(0, 4)}—${p.died.slice(0, 4)}`;

export function People() {
  const core = people.filter((p) => p.tier === 'core');
  const ext = people.filter((p) => p.tier !== 'core');
  const card = (p) => (
    <Link key={p.id} to={`/person/${p.id}`} className="person-card">
      <b>{p.name}</b><span className="muted small">{life(p)}</span>
      <span className="small">{p.roles[0]?.title}</span>
      <span className="muted small">关联事件 {p.eventIds.length} 个</span>
    </Link>
  );
  return (
    <div className="page">
      <div className="page-head"><h2>人物</h2><Link to="/people/graph" className="btn">人物关系图</Link></div>
      <h3 className="sub">核心人物</h3>
      <div className="person-grid">{core.map(card)}</div>
      {ext.length > 0 && <><h3 className="sub">扩展人物</h3><div className="person-grid">{ext.map(card)}</div></>}
    </div>
  );
}

export function Person({ id }) {
  const p = personById[id];
  if (!p) return <Empty>找不到这个人物。</Empty>;
  return (
    <article className="page person">
      <nav className="crumbs"><Link to="/people">人物</Link></nav>
      <h1>{p.name}</h1>
      <div className="muted">{life(p)} · 主要活动时期 {p.activePeriod}</div>
      <section className="ed-section"><h3>与毛泽东的关系</h3><p>{p.relationToMao}</p></section>
      <section className="ed-section"><h3>身份变化</h3>
        <ul className="role-list">{p.roles.map((r, i) => <li key={i}><span className="muted">{r.period}</span>{r.title}</li>)}</ul>
      </section>
      {p.turningPoints?.length > 0 && <section className="ed-section"><h3>关键转折</h3>
        <ul>{p.turningPoints.map((t) => eventById[t.eventId] && <li key={t.eventId}><Link to={`/event/${t.eventId}`}>{eventById[t.eventId].title}</Link>：{t.note}</li>)}</ul>
      </section>}
      <section className="ed-section"><h3>关联事件</h3>
        <ul>{p.eventIds.map((x) => eventById[x]).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
          <li key={e.id}><Link to={`/event/${e.id}`}><span className="muted">{formatDate(e)}</span> {e.title}</Link></li>
        ))}</ul>
      </section>
      {p.relations?.length > 0 && <section className="ed-section"><h3>人物关系</h3>
        <div className="people-chips">{p.relations.map((r) => personById[r.personId] && (
          <Link key={r.personId} to={`/person/${r.personId}`} className="chip">{personById[r.personId].name} · {r.type}</Link>
        ))}</div>
      </section>}
      <section className="ed-section"><h3>来源</h3>
        <ul className="small">{p.sourceIds.map((s) => sourceById[s] && <li key={s}>{sourceById[s].url ? <a href={sourceById[s].url} target="_blank" rel="noreferrer">{sourceById[s].title}</a> : `《${sourceById[s].title}》`}</li>)}</ul>
        <p className="muted small">人物生卒年为通行说法，M2 前与权威资料统一复核。</p>
      </section>
    </article>
  );
}
