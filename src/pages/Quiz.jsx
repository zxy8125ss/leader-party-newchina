import { useState } from 'react';
import { quizOfStage, quizById, stageById, eventById, ABILITY_NAME } from '../lib/data.js';
import { recordAnswer } from '../lib/db.js';
import { Link, Empty } from '../components/common.jsx';

// 阶段测验：/quiz/S03；单题重做：/quiz/S03?q=Q-S03-002
export default function Quiz({ stageId, query }) {
  const stage = stageById[stageId];
  const list = query.q ? [quizById[query.q]].filter(Boolean) : quizOfStage(stageId);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  if (!stage || !list.length) return <Empty>该阶段暂无测验题。</Empty>;
  const done = i >= list.length;

  if (done) return (
    <div className="page quiz">
      <h2>{stage.title} · 测验完成</h2>
      <p className="quiz-score">答对 <b>{score}</b> / {list.length}</p>
      <p className="muted">答错的题已记入错题本。</p>
      <div className="stage-actions">
        <button className="btn" onClick={() => { setI(0); setPicked(null); setScore(0); }}>再做一遍</button>
        <Link to="/wrong" className="btn">查看错题本</Link>
        <Link to={`/stage/${stageId}`} className="btn btn-primary">回到阶段</Link>
      </div>
    </div>
  );

  const q = list[i];
  const answered = picked != null;
  const pick = async (k) => {
    if (answered) return;
    setPicked(k);
    const ok = k === q.answer;
    if (ok) setScore(score + 1);
    await recordAnswer(q, ok);
  };

  return (
    <div className="page quiz">
      <nav className="crumbs"><Link to={`/stage/${stageId}`}>{stage.title}</Link> / 测验</nav>
      <div className="quiz-top"><span>第 {i + 1} / {list.length} 题</span><span className="tag">{ABILITY_NAME[q.ability]}</span></div>
      <h2 className="quiz-q">{q.question}</h2>
      <ol className="quiz-options">
        {q.options.map((o, k) => {
          const cls = !answered ? '' : k === q.answer ? 'right' : k === picked ? 'wrong' : 'dim';
          return <li key={k}><button className={`opt ${cls}`} onClick={() => pick(k)} disabled={answered}><span className="opt-k">{'ABCD'[k]}</span>{o}</button></li>;
        })}
      </ol>
      {answered && (
        <div className={`quiz-explain ${picked === q.answer ? 'ok' : 'no'}`}>
          <b>{picked === q.answer ? '回答正确。' : `回答错误，正确答案是 ${'ABCD'[q.answer]}。`}</b>
          <p>{q.explanation}</p>
          <p className="small">依据：{q.eventIds.map((x) => eventById[x] && <Link key={x} to={`/event/${x}`} className="chip">{eventById[x].title}</Link>)}</p>
          <button className="btn btn-primary" onClick={() => { setI(i + 1); setPicked(null); }}>{i + 1 < list.length ? '下一题' : '查看结果'}</button>
        </div>
      )}
    </div>
  );
}
