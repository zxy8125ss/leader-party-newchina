import { events } from './data.js';

// 收藏或有笔记的事件，按日期排序
export function exportItems(notes, favorites) {
  const noteMap = Object.fromEntries(notes.map((n) => [n.eventId, n]));
  const favSet = new Set(favorites.map((f) => f.eventId));
  return events.filter((e) => noteMap[e.id] || favSet.has(e.id)).map((e) => ({ event: e, note: noteMap[e.id], favorite: favSet.has(e.id) }));
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
