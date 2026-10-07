import { coreEvents, eventById, stagesWithContent } from '../lib/data.js';
import { getProgress, getAllRead } from '../lib/db.js';
import { useDb } from '../lib/hooks.js';
import { Link } from '../components/common.jsx';

export default function Home() {
  const progress = useDb(getProgress, ['readEvents']);
  const read = useDb(getAllRead, ['readEvents']);
  const last = progress?.lastReadEventId && eventById[progress.lastReadEventId];
  const coreIds = new Set(coreEvents.map((e) => e.id));
  const readCore = (read || []).filter((r) => coreIds.has(r.eventId)).length;

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-no">个人学习档案 · 1893—1976</div>
        <h1>领袖·政党·新中国</h1>
        <p className="home-intro">
          沿着毛泽东、中国共产党、国家与时代三条线，按时间顺序梳理事件之间的前因后果。
          看时间轴，点开事件，读背景、看人物、顺着前后事件往下走，每个阶段做五道题，写下自己的笔记。
        </p>
      </header>

      <section className="home-continue">
        {last ? (
          <Link to={`/event/${last.id}`} className="continue-card">
            <span className="muted">继续学习</span>
            <strong>{last.date.slice(0, 4)} 年 {last.title}</strong>
            <span className="arrow">→</span>
          </Link>
        ) : (
          <Link to="/timeline" className="continue-card">
            <span className="muted">开始学习</span>
            <strong>从时间轴开始</strong>
            <span className="arrow">→</span>
          </Link>
        )}
        <div className="progress">
          <div className="progress-text">已学习 <b>{readCore}</b> / {coreEvents.length} 个核心事件</div>
          <div className="progress-bar"><i style={{ width: `${coreEvents.length ? (readCore / coreEvents.length) * 100 : 0}%` }} /></div>
          <div className="muted small">只统计打开过的 S、A 级事件，不代表掌握程度。</div>
        </div>
      </section>

      <nav className="home-grid">
        <Link to="/timeline" className="home-tile"><b>进入时间轴</b><span>三条线并排看同一时期</span></Link>
        <Link to="/stages" className="home-tile"><b>按阶段学习</b><span>已开放 {stagesWithContent.length} / 8 个阶段</span></Link>
        <Link to="/people" className="home-tile"><b>人物</b><span>关键人物与关系图</span></Link>
        <Link to="/map" className="home-tile"><b>地图</b><span>事件地点与长征路线</span></Link>
        <Link to="/favorites" className="home-tile"><b>我的收藏</b><span>标记过的事件</span></Link>
        <Link to="/notes" className="home-tile"><b>我的笔记</b><span>可导出为 Word</span></Link>
        <Link to="/wrong" className="home-tile"><b>错题本</b><span>做错的测验题</span></Link>
      </nav>
      <div className="home-foot"><Link to="/settings">设置与备份</Link> · <Link to="/about">关于</Link></div>
    </div>
  );
}
