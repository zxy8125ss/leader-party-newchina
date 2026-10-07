import { eventById, events, quizById, stageById } from '../lib/data.js';
import { getAllFavorites, getAllNotes, getAllWrong, removeWrong, toggleFavorite } from '../lib/db.js';
import { useDb } from '../lib/hooks.js';
import { formatTime } from '../lib/format.js';
import { EventRow, Link, Empty } from '../components/common.jsx';

export function Mine() {
  return (
    <div className="page">
      <h2>我的</h2>
      <nav className="home-grid">
        <Link to="/search" className="home-tile"><b>搜索</b></Link>
        <Link to="/favorites" className="home-tile"><b>我的收藏</b></Link>
        <Link to="/notes" className="home-tile"><b>我的笔记</b></Link>
        <Link to="/wrong" className="home-tile"><b>错题本</b></Link>
        <Link to="/people" className="home-tile"><b>人物</b></Link>
        <Link to="/people/graph" className="home-tile"><b>人物关系图</b></Link>
        <Link to="/settings" className="home-tile"><b>设置与备份</b></Link>
        <Link to="/about" className="home-tile"><b>关于</b></Link>
      </nav>
    </div>
  );
}

const byDate = (ids) => events.filter((e) => ids.has(e.id));

export function Favorites() {
  const favs = useDb(getAllFavorites, ['favorites']);
  if (!favs) return null;
  const list = byDate(new Set(favs.map((f) => f.eventId)));
  return (
    <div className="page">
      <div className="page-head"><h2>我的收藏</h2><span className="muted small">{list.length} 个事件</span></div>
      {list.length === 0 ? <Empty>还没有收藏。在事件详情页点“收藏”即可。</Empty> : (
        <div className="event-list">{list.map((e) => (
          <div key={e.id} className="row-with-action">
            <EventRow event={e} />
            <button className="btn-text" onClick={() => toggleFavorite(e.id)}>取消收藏</button>
          </div>
        ))}</div>
      )}
    </div>
  );
}

export function Notes() {
  const notes = useDb(getAllNotes, ['notes']);
  if (!notes) return null;
  const map = Object.fromEntries(notes.map((n) => [n.eventId, n]));
  const list = byDate(new Set(Object.keys(map)));
  return (
    <div className="page">
      <div className="page-head"><h2>我的笔记</h2><Link to="/settings" className="btn-text">导出为 Word</Link></div>
      {list.length === 0 ? <Empty>还没有笔记。在事件详情页底部可以写笔记。</Empty> : (
        <div className="event-list">{list.map((e) => (
          <EventRow key={e.id} event={e} extra={<span className="note-preview">{map[e.id].text}<span className="muted small"> · {formatTime(map[e.id].updatedAt)}</span></span>} />
        ))}</div>
      )}
    </div>
  );
}

export function WrongBook() {
  const wrong = useDb(getAllWrong, ['wrongQuestions']);
  if (!wrong) return null;
  const list = wrong.filter((w) => quizById[w.questionId]).sort((a, b) => b.lastAnsweredAt - a.lastAnsweredAt);
  return (
    <div className="page">
      <div className="page-head"><h2>错题本</h2><span className="muted small">{list.length} 道</span></div>
      {list.length === 0 ? <Empty>没有错题。</Empty> : (
        <ul className="wrong-list">{list.map((w) => {
          const q = quizById[w.questionId];
          const e = eventById[w.eventId];
          return (
            <li key={w.questionId} className="wrong-item">
              <div className="muted small">{stageById[q.stageId]?.title} · 错 {w.wrongCount} 次 · 最后答题 {formatTime(w.lastAnsweredAt)}{w.lastCorrect ? ' · 最近一次已答对' : ''}</div>
              <b>{q.question}</b>
              <div className="wrong-actions">
                <Link to={`/quiz/${q.stageId}?q=${q.id}`} className="btn btn-primary">再做一次</Link>
                {e && <Link to={`/event/${e.id}`} className="btn">看事件：{e.title}</Link>}
                <button className="btn-text" onClick={() => removeWrong(q.id)}>移出错题本</button>
              </div>
            </li>
          );
        })}</ul>
      )}
    </div>
  );
}
