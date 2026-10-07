import { useRef, useState } from 'react';
import { eventById, sources, CONTENT_VERSION } from '../lib/data.js';
import { exportBackup, importBackup, inspectBackup, getAllNotes, getAllFavorites, getAllReports, setReportStatus, deleteReport } from '../lib/db.js';
import { downloadBlob, exportItems } from '../lib/exportItems.js';
import { useDb } from '../lib/hooks.js';
import { formatTime } from '../lib/format.js';
import { Link } from '../components/common.jsx';

const stamp = () => new Date().toISOString().slice(0, 10);

export function Settings() {
  const notes = useDb(getAllNotes, ['notes']);
  const favs = useDb(getAllFavorites, ['favorites']);
  const reports = useDb(getAllReports, ['errorReports']);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(null); // { obj, counts }
  const fileRef = useRef();
  const count = notes && favs ? exportItems(notes, favs).length : 0;

  const exportWord = async () => {
    setMsg('正在生成 Word…');
    try {
      const { buildDocx } = await import('../lib/exportDocx.js');
      const blob = await buildDocx(await getAllNotes(), await getAllFavorites());
      downloadBlob(blob, `领袖政党新中国-学习笔记-${stamp()}.docx`);
      setMsg('Word 已生成并下载。');
    } catch (e) { setMsg('生成失败：' + e.message); }
  };
  const exportJson = async () => {
    const data = await exportBackup();
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `领袖政党新中国-备份-${stamp()}.json`);
    setMsg('备份文件已下载。');
  };
  const pickFile = async (file) => {
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const r = inspectBackup(obj);
      if (!r.ok) return setMsg('无法导入：' + r.error + '。现有数据未改动。');
      setPending({ obj, counts: r.counts });
    } catch { setMsg('无法导入：文件不是有效的 JSON。现有数据未改动。'); }
    fileRef.current.value = '';
  };
  const doImport = async (mode) => {
    try {
      await importBackup(pending.obj, mode);
      setMsg(mode === 'merge' ? '已合并导入。' : '已覆盖导入。');
    } catch (e) { setMsg('导入失败：' + e.message + '。现有数据未改动。'); }
    setPending(null);
  };
  const exportReports = () => {
    const data = { app: 'leader-party-newchina', type: 'error-reports', exportedAt: new Date().toISOString(), contentVersion: CONTENT_VERSION,
      reports: (reports || []).map((r) => ({ ...r, eventTitle: eventById[r.eventId]?.title })) };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `领袖政党新中国-报错-${stamp()}.json`);
  };

  return (
    <div className="page settings">
      <h2>设置与备份</h2>
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}

      <section className="card">
        <h3>导出学习笔记（Word）</h3>
        <p className="muted small">包含有笔记或已收藏的事件，按日期排序，含事件摘要和你的笔记。当前 {count} 个事件。</p>
        <button className="btn btn-primary" onClick={exportWord}>导出 .docx</button>
      </section>

      <section className="card">
        <h3>备份与恢复</h3>
        <p className="muted small">数据只存在这台设备的浏览器里。换设备或清理浏览器前，请先导出备份。</p>
        <div className="stage-actions">
          <button className="btn" onClick={exportJson}>导出备份（JSON）</button>
          <button className="btn" onClick={() => fileRef.current.click()}>导入备份…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pickFile(e.target.files[0])} />
        </div>
        {pending && (
          <div className="confirm">
            <p>备份文件包含：笔记 {pending.counts.notes} 条、收藏 {pending.counts.favorites} 个、错题 {pending.counts.wrongQuestions} 道、阅读记录 {pending.counts.readEvents} 条、报错 {pending.counts.errorReports} 条。</p>
            <p className="small">合并：保留现有数据，同一事件取较新的一份。覆盖：清空本机数据后导入。</p>
            <div className="stage-actions">
              <button className="btn btn-primary" onClick={() => doImport('merge')}>合并导入</button>
              <button className="btn btn-danger" onClick={() => doImport('overwrite')}>覆盖导入</button>
              <button className="btn-text" onClick={() => setPending(null)}>取消</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3>报错记录（{reports?.length || 0}）</h3>
        <p className="muted small">在事件详情页点“报错”记录问题。导出后交给 Claude，下一轮统一修订。</p>
        {reports?.length > 0 && (
          <>
            <ul className="report-list">{reports.map((r) => (
              <li key={r.id} className={r.status === 'fixed' ? 'fixed' : ''}>
                <div><b>{eventById[r.eventId]?.title || r.eventId}</b> · {r.type} · <span className="muted small">{formatTime(r.createdAt)}</span></div>
                <div>{r.description}</div>
                <div className="small">
                  <button className="btn-text" onClick={() => setReportStatus(r.id, r.status === 'fixed' ? 'open' : 'fixed')}>{r.status === 'fixed' ? '标为未处理' : '标为已修订'}</button>
                  <button className="btn-text" onClick={() => deleteReport(r.id)}>删除</button>
                </div>
              </li>
            ))}</ul>
            <button className="btn" onClick={exportReports}>导出报错记录（JSON）</button>
          </>
        )}
      </section>

      <p className="muted small">内容版本 v{CONTENT_VERSION} · <Link to="/about">关于本项目</Link></p>
    </div>
  );
}

export function About() {
  const books = sources.filter((s) => s.type === 'book');
  const web = sources.filter((s) => s.type !== 'book');
  return (
    <div className="page about">
      <h2>关于</h2>
      <p>本项目用于个人历史学习与资料整理，不构成任何政治宣传或学术研究结论。内容依据所列参考资料整理；对于存在不同史料记载或学术观点的问题，尽可能注明来源与分歧。</p>
      <p className="muted small">内容版本 v{CONTENT_VERSION}。事件详情中标注“待核实 / 说法不一”的内容，表示来源不足或记载有分歧，会在后续版本中逐条复核。地图为示意图，不作为国界依据。</p>
      <h3 className="sub">参考资料</h3>
      <ul className="small">{books.map((s) => <li key={s.id}>《{s.title}》，{s.author}，{s.publisher}{s.year && '，' + s.year}</li>)}</ul>
      <h3 className="sub">核对用网络资料</h3>
      <ul className="small">{web.map((s) => <li key={s.id}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}，{s.publisher}{s.year && '，' + s.year}</li>)}</ul>
    </div>
  );
}
