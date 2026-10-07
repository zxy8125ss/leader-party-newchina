import { useEffect, useRef, useState } from 'react';
import { eventById, events, intlById, personById, locationById, stageById, LEVEL_NAME } from '../lib/data.js';
import { formatDate } from '../lib/format.js';
import { markRead, getNote, saveNote, isFavorite, toggleFavorite, addReport } from '../lib/db.js';
import { LaneTags, LevelBadge, Link, SourceBlock, Empty } from '../components/common.jsx';

export default function EventDetail({ id, query }) {
  const e = eventById[id];
  const [open, setOpen] = useState(true);
  const [fav, setFav] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!e) return;
    window.scrollTo(0, 0);
    markRead(e, query.from || 'detail', events.indexOf(e));
    isFavorite(e.id).then(setFav);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!e) return <Empty>找不到这个事件（ID：{id}）。</Empty>;
  const stage = stageById[e.stageId];
  const loc = e.locationId && locationById[e.locationId];

  const relLink = (r) => {
    const t = eventById[r.id];
    return t ? (
      <li key={r.id}><Link to={`/event/${t.id}`}><span className="muted">{formatDate(t)}</span> {t.title}</Link>{r.note && <div className="rel-note">{r.note}</div>}</li>
    ) : null;
  };

  return (
    <article className="event-detail">
      <nav className="crumbs">
        <Link to={`/timeline?focus=${e.id}`}>时间轴</Link> / <Link to={`/stage/${e.stageId}`}>{stage?.title}</Link>
      </nav>
      <header className="ed-head">
        <div className="ed-meta">
          <span>{formatDate(e)}</span>{loc && <span>· {loc.name}</span>}
          <LevelBadge level={e.level} /><span className="muted small">{LEVEL_NAME[e.level]}</span>
        </div>
        <h1>{e.title}</h1>
        <LaneTags lanes={e.lanes} />
      </header>

      <div className="ed-actions">
        <button className={`btn ${fav ? 'btn-on' : ''}`} onClick={async () => setFav(await toggleFavorite(e.id))}>{fav ? '★ 已收藏' : '☆ 收藏'}</button>
        <button className="btn" onClick={() => { const el = document.getElementById('note'); el?.scrollIntoView({ behavior: 'smooth' }); el?.querySelector('textarea')?.focus({ preventScroll: true }); }}>写笔记</button>
        <button className="btn btn-ghost" onClick={() => setReporting(true)}>报错</button>
      </div>

      <section className="ed-summary"><p>{e.summary}</p></section>

      <section className="ed-section">
        <button className="ed-toggle" onClick={() => setOpen(!open)}>{open ? '收起详细内容 ▲' : '展开详细内容 ▼'}</button>
        {open && (
          <>
            {e.detail && <><h3>经过</h3><p>{e.detail}</p></>}
            {e.background && <><h3>背景</h3><p>{e.background}</p></>}
            {e.impact && <><h3>影响</h3><p>{e.impact}</p></>}
          </>
        )}
      </section>

      <section className="ed-section">
        <h2>历史脉络</h2>
        <div className="chain">
          <div className="chain-col"><h4>前置事件</h4>{e.relations.before.length ? <ul>{e.relations.before.map(relLink)}</ul> : <p className="muted small">无</p>}</div>
          <div className="chain-now"><span>本事件</span><b>{e.title}</b></div>
          <div className="chain-col"><h4>后续事件</h4>{e.relations.after.length ? <ul>{e.relations.after.map(relLink)}</ul> : <p className="muted small">无</p>}</div>
        </div>
        {e.relations.context.length > 0 && (
          <div className="context">
            <h4>同期背景</h4>
            <ul>{e.relations.context.map((c) => {
              if (eventById[c]) return <li key={c}><Link to={`/event/${c}`}>{eventById[c].title}</Link></li>;
              const i = intlById[c];
              return i ? <li key={c}><span className="tag-intl">国际</span> {i.title}：<span className="small">{i.summary}</span></li> : null;
            })}</ul>
          </div>
        )}
      </section>

      {e.peopleIds.length > 0 && (
        <section className="ed-section">
          <h2>相关人物</h2>
          <div className="people-chips">
            {e.peopleIds.map((p) => personById[p] && <Link key={p} to={`/person/${p}`} className="chip">{personById[p].name}</Link>)}
          </div>
        </section>
      )}

      {e.evaluation && (
        <section className="ed-section evaluation">
          <h2>历史评价</h2>
          {e.evaluation.official?.length > 0 && <div className="eval-block"><h4>① 官方历史评价</h4>{e.evaluation.official.map((o, i) => <p key={i}>{o.text}<span className="muted small">（{o.locator || ''}{o.year ? ' ' + o.year : ''}）</span></p>)}</div>}
          {e.evaluation.academic?.length > 0 && <div className="eval-block"><h4>② 学术研究观点</h4>{e.evaluation.academic.map((a, i) => <p key={i}>{a.view}<span className="muted small">——{a.author}《{a.work}》</span></p>)}</div>}
          {e.evaluation.sourceNote && <div className="eval-block"><h4>③ 史料说明</h4><p>{e.evaluation.sourceNote}</p></div>}
        </section>
      )}

      {e.uncertain?.length > 0 && (
        <section className="ed-section uncertain">
          <h4>待核实 / 说法不一</h4>
          <ul>{e.uncertain.map((u, i) => <li key={i}>{u.note}</li>)}</ul>
        </section>
      )}

      <section className="ed-section"><h2>来源</h2><SourceBlock sources={e.sources} quotes={e.quotes} /></section>

      <NoteBox eventId={e.id} />
      {reporting && <ReportDialog eventId={e.id} title={e.title} onClose={() => setReporting(false)} />}
    </article>
  );
}

function NoteBox({ eventId }) {
  const [text, setText] = useState('');
  const [state, setState] = useState('');
  const timer = useRef();
  const latest = useRef('');
  useEffect(() => {
    getNote(eventId).then((n) => { setText(n?.text || ''); latest.current = n?.text || ''; setState(n ? '已保存' : ''); });
    return () => { clearTimeout(timer.current); };
  }, [eventId]);
  const flush = (v) => saveNote(eventId, v).then(() => setState(v.trim() ? '已保存' : '已清空'));
  const onChange = (v) => {
    setText(v); latest.current = v; setState('正在保存…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(v), 500);
  };
  return (
    <section className="ed-section note-box" id="note">
      <h2>我的笔记 <span className="muted small">{state}</span></h2>
      <textarea value={text} onChange={(ev) => onChange(ev.target.value)} onBlur={() => { clearTimeout(timer.current); flush(latest.current); }}
        placeholder="写下你的理解、疑问或联想。自动保存在本机。" rows={6} />
    </section>
  );
}

const TYPES = ['错别字', '日期', '史实', '来源', '其他'];
function ReportDialog({ eventId, title, onClose }) {
  const [type, setType] = useState(TYPES[0]);
  const [desc, setDesc] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box" onClick={(ev) => ev.stopPropagation()}>
        <h3>报错：{title}</h3>
        {done ? <><p>已记录在本机。可在“设置 → 报错记录”中查看和导出。</p><button className="btn" onClick={onClose}>关闭</button></> : (
          <>
            <div className="type-row">{TYPES.map((t) => <button key={t} className={`chip ${t === type ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div>
            <textarea rows={4} value={desc} onChange={(ev) => setDesc(ev.target.value)} placeholder="哪里有问题？正确的说法是什么？" />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>取消</button>
              <button className="btn btn-primary" disabled={!desc.trim()} onClick={async () => { await addReport(eventId, type, desc.trim()); setDone(true); }}>提交</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
