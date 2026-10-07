import { useState } from 'react';
import { useRoute, go } from './lib/hooks.js';
import Home from './pages/Home.jsx';
import Timeline from './pages/Timeline.jsx';
import EventDetail from './pages/EventDetail.jsx';
import { Stages, StageDetail } from './pages/Stages.jsx';
import { People, Person } from './pages/People.jsx';
import Search from './pages/Search.jsx';
import Quiz from './pages/Quiz.jsx';
import { Mine, Favorites, Notes, WrongBook } from './pages/Mine.jsx';
import { Settings, About } from './pages/Settings.jsx';
import MapPage from './pages/MapPage.jsx';
import PeopleGraph from './pages/PeopleGraph.jsx';
import { Empty } from './components/common.jsx';

function page({ parts, query }) {
  const [p, id] = parts;
  switch (p) {
    case undefined: return <Home />;
    case 'timeline': return <Timeline query={query} />;
    case 'event': return <EventDetail id={id} query={query} />;
    case 'stages': return <Stages />;
    case 'stage': return <StageDetail id={id} />;
    case 'people': return id === 'graph' ? <PeopleGraph /> : <People />;
    case 'map': return <MapPage query={query} />;
    case 'person': return <Person id={id} />;
    case 'search': return <Search query={query} />;
    case 'quiz': return <Quiz stageId={id} query={query} />;
    case 'mine': return <Mine />;
    case 'favorites': return <Favorites />;
    case 'notes': return <Notes />;
    case 'wrong': return <WrongBook />;
    case 'settings': return <Settings />;
    case 'about': return <About />;
    default: return <Empty>页面不存在。</Empty>;
  }
}

const NAV = [
  ['/', '首页', undefined], ['/timeline', '时间轴', 'timeline'], ['/stages', '阶段', 'stages'],
  ['/people', '人物', 'people'], ['/map', '地图', 'map'], ['/search', '搜索', 'search'], ['/mine', '我的', 'mine'],
];
const MINE = ['mine', 'favorites', 'notes', 'wrong', 'settings', 'about'];

export default function App() {
  const route = useRoute();
  const [q, setQ] = useState('');
  const cur = route.parts[0];
  const active = (key) => (key === 'mine' ? MINE.includes(cur) : key === 'stages' ? ['stages', 'stage', 'quiz'].includes(cur) : key === 'people' ? ['people', 'person'].includes(cur) : cur === key);
  const routeKey = window.location.hash;

  return (
    <div className={`app ${cur === 'timeline' || cur === 'map' ? 'wide' : ''}`}>
      <header className="topbar">
        <a href="#/" className="brand"><span className="seal">档</span>领袖·政党·新中国</a>
        <nav className="topnav">
          {NAV.slice(1).filter(([, , k]) => k !== 'search').map(([to, name, key]) => <a key={to} href={'#' + to} className={active(key) ? 'on' : ''}>{name}</a>)}
        </nav>
        <form className="top-search" onSubmit={(e) => { e.preventDefault(); go('/search?q=' + encodeURIComponent(q)); setQ(''); }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索" aria-label="搜索" />
        </form>
      </header>
      <main className="main" key={routeKey}>{page(route)}</main>
      <nav className="tabbar">
        {NAV.filter(([, , k]) => k !== 'people').map(([to, name, key]) => <a key={to} href={'#' + to} className={active(key) ? 'on' : ''}>{name}</a>)}
      </nav>
    </div>
  );
}
