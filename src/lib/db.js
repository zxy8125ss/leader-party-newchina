import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, upgrade, BACKUP_APP, BACKUP_VERSION, inspectBackup } from '../db/schema.js';
import { CONTENT_VERSION } from './data.js';

let dbp;
const db = () => (dbp ||= openDB(DB_NAME, DB_VERSION, { upgrade: (d, oldV, newV) => upgrade(d, oldV, newV) }));

// 简单的变更通知，页面据此刷新
const listeners = new Set();
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (store) => listeners.forEach((fn) => fn(store));

const now = () => Date.now();

// 笔记
export const getNote = async (eventId) => (await db()).get('notes', eventId);
export const getAllNotes = async () => (await db()).getAll('notes');
export async function saveNote(eventId, text) {
  const d = await db();
  const old = await d.get('notes', eventId);
  if (!text.trim()) {
    if (old) await d.delete('notes', eventId);
  } else {
    await d.put('notes', { eventId, text, createdAt: old?.createdAt || now(), updatedAt: now() });
  }
  emit('notes');
}

// 收藏
export const isFavorite = async (eventId) => !!(await (await db()).get('favorites', eventId));
export const getAllFavorites = async () => (await db()).getAll('favorites');
export async function toggleFavorite(eventId) {
  const d = await db();
  const fav = await d.get('favorites', eventId);
  if (fav) await d.delete('favorites', eventId);
  else await d.put('favorites', { eventId, createdAt: now() });
  emit('favorites');
  return !fav;
}

// 阅读记录与继续阅读
export async function markRead(event, view = 'detail', index = 0) {
  const d = await db();
  const old = await d.get('readEvents', event.id);
  await d.put('readEvents', { eventId: event.id, firstOpenedAt: old?.firstOpenedAt || now(), lastOpenedAt: now() });
  await d.put('readingProgress', {
    key: 'last', lastReadEventId: event.id, lastReadStageId: event.stageId,
    lastReadPosition: { view, index }, lastReadTimestamp: now(),
  });
  emit('readEvents');
}
export const getAllRead = async () => (await db()).getAll('readEvents');
export const getProgress = async () => (await db()).get('readingProgress', 'last');

// 错题
export const getAllWrong = async () => (await db()).getAll('wrongQuestions');
export async function recordAnswer(q, correct) {
  const d = await db();
  const old = await d.get('wrongQuestions', q.id);
  if (!correct) {
    await d.put('wrongQuestions', {
      questionId: q.id, eventId: q.eventIds[0], stageId: q.stageId,
      wrongCount: (old?.wrongCount || 0) + 1, lastAnsweredAt: now(), lastCorrect: false,
    });
  } else if (old) {
    await d.put('wrongQuestions', { ...old, lastAnsweredAt: now(), lastCorrect: true });
  }
  emit('wrongQuestions');
}
export async function removeWrong(questionId) {
  await (await db()).delete('wrongQuestions', questionId);
  emit('wrongQuestions');
}

// 报错记录
export const getAllReports = async () => (await db()).getAll('errorReports');
export async function addReport(eventId, type, description) {
  await (await db()).add('errorReports', { eventId, type, description, createdAt: now(), status: 'open' });
  emit('errorReports');
}
export async function setReportStatus(id, status) {
  const d = await db();
  const r = await d.get('errorReports', id);
  if (r) await d.put('errorReports', { ...r, status });
  emit('errorReports');
}
export async function deleteReport(id) {
  await (await db()).delete('errorReports', id);
  emit('errorReports');
}

// 备份
export async function exportBackup() {
  const d = await db();
  const [notes, favorites, wrong, read, progress, reports] = await Promise.all([
    d.getAll('notes'), d.getAll('favorites'), d.getAll('wrongQuestions'), d.getAll('readEvents'),
    d.get('readingProgress', 'last'), d.getAll('errorReports'),
  ]);
  return {
    app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), contentVersion: CONTENT_VERSION,
    notes: Object.fromEntries(notes.map((n) => [n.eventId, n])),
    favorites, wrongQuestions: wrong,
    readEvents: Object.fromEntries(read.map((r) => [r.eventId, r])),
    readingProgress: progress || {},
    errorReports: reports,
  };
}

export { inspectBackup };

// mode: 'merge'（同一事件取更新时间较新的）| 'overwrite'（先清空再导入）
export async function importBackup(obj, mode) {
  const check = inspectBackup(obj);
  if (!check.ok) throw new Error(check.error);
  const d = await db();
  const stores = ['notes', 'favorites', 'wrongQuestions', 'readEvents', 'readingProgress', 'errorReports'];
  const tx = d.transaction(stores, 'readwrite');
  if (mode === 'overwrite') for (const s of stores) await tx.objectStore(s).clear();
  const putNewer = async (store, item, key, timeField) => {
    const old = mode === 'merge' ? await tx.objectStore(store).get(item[key]) : null;
    if (!old || (item[timeField] || 0) >= (old[timeField] || 0)) await tx.objectStore(store).put(item);
  };
  for (const n of Object.values(obj.notes || {})) await putNewer('notes', n, 'eventId', 'updatedAt');
  for (const f of obj.favorites || []) await putNewer('favorites', f, 'eventId', 'createdAt');
  for (const w of obj.wrongQuestions || []) await putNewer('wrongQuestions', w, 'questionId', 'lastAnsweredAt');
  for (const r of Object.values(obj.readEvents || {})) await putNewer('readEvents', r, 'eventId', 'lastOpenedAt');
  if (obj.readingProgress?.lastReadEventId) await putNewer('readingProgress', { ...obj.readingProgress, key: 'last' }, 'key', 'lastReadTimestamp');
  const existing = mode === 'merge' ? await tx.objectStore('errorReports').getAll() : [];
  const seen = new Set(existing.map((r) => `${r.eventId}|${r.createdAt}`));
  for (const r of obj.errorReports || []) {
    const { id, ...rest } = r;
    if (mode === 'overwrite' && id != null) await tx.objectStore('errorReports').put(r);
    else if (!seen.has(`${r.eventId}|${r.createdAt}`)) await tx.objectStore('errorReports').add(rest);
  }
  await tx.done;
  stores.forEach(emit);
  return check.counts;
}
