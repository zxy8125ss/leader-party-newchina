import { LANES, LEVEL_NAME, sourceById, stageById } from '../lib/data.js';
import { formatDate, shortDate } from '../lib/format.js';

export const Link = ({ to, children, className, onClick }) => (
  <a href={'#' + to} className={className} onClick={onClick}>{children}</a>
);

export function LaneTags({ lanes, compact }) {
  return (
    <span className="lane-tags">
      {LANES.filter((l) => lanes.includes(l.id)).map((l) => (
        <span key={l.id} className={`lane-tag lane-${l.id}`}>{compact ? l.short : l.name}</span>
      ))}
    </span>
  );
}

export function LevelBadge({ level }) {
  return <span className={`level level-${level}`} title={LEVEL_NAME[level]}>{level}</span>;
}

// 列表用事件条目（手机时间轴、阶段、搜索、收藏等）
export function EventRow({ event, extra, read, id }) {
  return (
    <Link to={`/event/${event.id}`} className={`event-row level-row-${event.level}`}>
      <span id={id} className="event-row-bars">
        {LANES.map((l) => <i key={l.id} className={event.lanes.includes(l.id) ? `bar lane-bg-${l.id}` : 'bar'} />)}
      </span>
      <span className="event-row-main">
        <span className="event-row-meta">
          <span className="date">{formatDate(event)}</span>
          <LevelBadge level={event.level} />
          {read && <span className="read-dot" title="已打开过">已读</span>}
        </span>
        <span className="event-row-title">{event.title}</span>
        {extra ?? <span className="event-row-sum">{event.summary}</span>}
      </span>
    </Link>
  );
}

export function SourceBlock({ sources, quotes }) {
  const line = (s) => {
    const src = sourceById[s.sourceId];
    if (!src) return s.sourceId;
    const name = src.type === 'book' ? `《${src.title}》` : src.title;
    return (
      <>
        {src.url ? <a href={src.url} target="_blank" rel="noreferrer">{name}</a> : name}
        {src.type !== 'book' && <span className="muted">（{src.publisher}{src.year ? '，' + src.year : ''}）</span>}
        {s.locator && <span className="muted">　{s.locator}</span>}
      </>
    );
  };
  return (
    <div className="sources">
      <div className="src-group"><b>【主要来源】</b>{sources.main.map((s, i) => <div key={i}>{line(s)}</div>)}</div>
      {sources.extra?.length > 0 && <div className="src-group"><b>【补充来源】</b>{sources.extra.map((s, i) => <div key={i}>{line(s)}</div>)}</div>}
      {false && quotes?.length > 0 && (
        <div className="src-group"><b>【引用原文】</b>
          {quotes.map((q, i) => <div key={i}>“{q.text}”——{q.author}，《{q.work}》，{q.year}</div>)}
        </div>
      )}
    </div>
  );
}

export const StageName = ({ id }) => <>{stageById[id]?.title}</>;
export { shortDate };

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// 读原文：App 不收录原文，给出外部阅读入口（直达页面 + 检索）
export function ReadText({ readText, compact }) {
  if (!readText) return null;
  const q = encodeURIComponent(`毛泽东 ${readText.title} 原文`);
  const links = [
    ...(readText.links || []),
    { label: '百度搜原文', url: `https://www.baidu.com/s?wd=${q}`, search: true },
    { label: '必应搜原文', url: `https://cn.bing.com/search?q=${q}`, search: true },
  ];
  if (compact) {
    const first = links[0];
    return <a className="read-btn sm" href={first.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>读原文 ↗</a>;
  }
  return (
    <section className="read-text">
      <h4>读原文：《{readText.title}》</h4>
      <div className="read-links">
        {links.map((l) => <a key={l.url} className={`read-btn ${l.search ? 'alt' : ''}`} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
      </div>
      <p className="muted small">在外部网页打开，需要联网。{readText.links?.some((l) => l.url.includes('marxists.org')) ? '马克思主义文库收录《毛泽东选集》全文，国内网络可能打不开，可改用搜索。' : ''}{readText.links?.some((l) => l.url.includes('baike.baidu.com')) ? '百度百科词条含全文，但可多人编辑，个别字以书为准。' : ''}搜索结果来自第三方网站，请以《毛泽东选集》《毛泽东诗词集》等正式出版物为准。</p>
    </section>
  );
}
