import { useMemo, useState } from 'react';
import { events, people, stages, intl, LANES, locationById, stagesWithContent } from '../lib/data.js';
import { go } from '../lib/hooks.js';
import { EventRow, Link } from '../components/common.jsx';

const norm = (s) => (s || '').toLowerCase();
const has = (q, ...fields) => fields.some((f) => norm(Array.isArray(f) ? f.join(' ') : f).includes(q));

export default function Search({ query }) {
  const [q, setQ] = useState(query.q || '');
  const [f, setF] = useState({ from: '', to: '', stage: '', lane: '', person: '', level: '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  const kw = norm(q.trim());

  const result = useMemo(() => {
    const ev = events.filter((e) => {
      const y = Number(e.date.slice(0, 4));
      if (f.from && y < Number(f.from)) return false;
      if (f.to && y > Number(f.to)) return false;
      if (f.stage && e.stageId !== f.stage) return false;
      if (f.lane && !e.lanes.includes(f.lane)) return false;
      if (f.person && !e.peopleIds.includes(f.person)) return false;
      if (f.level && e.level !== f.level) return false;
      if (!kw) return true;
      return has(kw, e.title, e.summary, e.detail, e.background, e.impact, e.keywords, locationById[e.locationId]?.name);
    });
    const filtered = Object.values(f).some(Boolean);
    if (!kw) return { ev: filtered ? ev : [], pe: [], st: [], it: [] };
    return {
      ev,
      pe: people.filter((p) => has(kw, p.name, p.roles.map((r) => r.title), p.relationToMao)),
      st: stages.filter((s) => has(kw, s.title, s.intro) || ev.some((e) => e.stageId === s.id && has(kw, e.title))),
      it: intl.filter((i) => has(kw, i.title, i.summary)),
    };
  }, [kw, f]);

  const total = result.ev.length + result.pe.length + result.st.length + result.it.length;
  const years = [...new Set(events.map((e) => e.date.slice(0, 4)))];

  return (
    <div className="page search">
      <form className="search-box" onSubmit={(ev) => { ev.preventDefault(); go('/search?q=' + encodeURIComponent(q)); }}>
        <input autoFocus type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="搜索事件、人物、地点、阶段，如：遵义" />
      </form>
      <details className="filters" open={Object.values(f).some(Boolean)}>
        <summary>筛选{Object.values(f).some(Boolean) ? '（已启用）' : ''}</summary>
        <div className="filter-grid">
          <label>起始年<select value={f.from} onChange={(e) => set('from', e.target.value)}><option value="">不限</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label>截止年<select value={f.to} onChange={(e) => set('to', e.target.value)}><option value="">不限</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label>阶段<select value={f.stage} onChange={(e) => set('stage', e.target.value)}><option value="">不限</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          <label>线<select value={f.lane} onChange={(e) => set('lane', e.target.value)}><option value="">不限</option>{LANES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label>人物<select value={f.person} onChange={(e) => set('person', e.target.value)}><option value="">不限</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>层级<select value={f.level} onChange={(e) => set('level', e.target.value)}><option value="">不限</option><option value="S">S 级</option><option value="A">A 级</option><option value="B">B 级</option></select></label>
        </div>
        {Object.values(f).some(Boolean) && <button className="btn-text" onClick={() => setF({ from: '', to: '', stage: '', lane: '', person: '', level: '' })}>清除筛选</button>}
      </details>

      {(kw || Object.values(f).some(Boolean)) && <p className="muted small">{kw && `搜索“${q.trim()}”：`}共 {total} 条结果</p>}

      {result.ev.length > 0 && <section><h3 className="sub">事件</h3><div className="event-list">{result.ev.map((e) => <EventRow key={e.id} event={e} />)}</div></section>}
      {result.pe.length > 0 && <section><h3 className="sub">人物</h3><div className="people-chips">{result.pe.map((p) => <Link key={p.id} to={`/person/${p.id}`} className="chip">{p.name}</Link>)}</div></section>}
      {result.st.length > 0 && <section><h3 className="sub">相关阶段</h3><ul>{result.st.map((s) => <li key={s.id}><Link to={`/stage/${s.id}`}>{s.title}</Link> <span className="muted small">{s.start.slice(0, 4)}—{s.end.slice(0, 4)}</span></li>)}</ul></section>}
      {result.it.length > 0 && <section><h3 className="sub">相关国际背景</h3><ul>{result.it.map((i) => <li key={i.id}><b>{i.title}</b>（{i.date.slice(0, 4)}）：<span className="small">{i.summary}</span> {i.relatedEventIds.map((x) => <Link key={x} to={`/event/${x}`} className="small">　→{events.find((e) => e.id === x)?.title}</Link>)}</li>)}</ul></section>}
      {kw && total === 0 && <p className="empty">没有找到相关内容。目前已开放：{stagesWithContent.map((s) => s.title).join('、')}。</p>}
    </div>
  );
}
