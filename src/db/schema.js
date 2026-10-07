// 本机用户数据（IndexedDB）结构与迁移。M1 用 idb 库封装读写。
export const DB_NAME = 'leader-party-newchina';
export const DB_VERSION = 2;          // 结构变化时 +1，并在 MIGRATIONS 中追加一步
export const BACKUP_APP = 'leader-party-newchina';
export const BACKUP_VERSION = '1.1';  // 主版本不同 = 不兼容

export const STORES = {
  notes:           { keyPath: 'eventId' },     // { eventId, text, createdAt, updatedAt }
  favorites:       { keyPath: 'eventId' },     // { eventId, createdAt }
  wrongQuestions:  { keyPath: 'questionId' },  // { questionId, eventId, stageId, wrongCount, lastAnsweredAt }
  readEvents:      { keyPath: 'eventId' },     // { eventId, firstOpenedAt, lastOpenedAt }
  readingProgress: { keyPath: 'key' },         // { key:'last', lastReadEventId, lastReadStageId, lastReadPosition:{view,index}, lastReadTimestamp }
  errorReports:    { keyPath: 'id', autoIncrement: true }, // { id, eventId, type, description, createdAt, status:'open'|'fixed' }
  texts:           { keyPath: 'eventId' },     // { eventId, text, updatedAt }  用户自己录入的原文，只存本机
  meta:            { keyPath: 'key' },         // { key:'contentVersion', value }
};

// 每个版本一个迁移函数；只做增量，不删用户数据
const createMissing = (db) => {
  for (const [name, opts] of Object.entries(STORES)) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts);
  }
};
export const MIGRATIONS = { 1: createMissing, 2: createMissing }; // 2：新增 texts

export function upgrade(db, oldVersion, newVersion) {
  for (let v = oldVersion + 1; v <= newVersion; v++) MIGRATIONS[v]?.(db);
}

// 备份文件校验：返回 { ok, error, counts }
export function inspectBackup(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: '不是有效的 JSON 备份文件' };
  if (obj.app !== BACKUP_APP) return { ok: false, error: '这不是本 App 的备份文件' };
  if (typeof obj.version !== 'string' || obj.version.split('.')[0] !== BACKUP_VERSION.split('.')[0])
    return { ok: false, error: `备份版本 ${obj.version} 与当前 ${BACKUP_VERSION} 不兼容` };
  const counts = {
    notes: Object.keys(obj.notes || {}).length,
    texts: Object.keys(obj.texts || {}).length,
    favorites: (obj.favorites || []).length,
    wrongQuestions: (obj.wrongQuestions || []).length,
    readEvents: Object.keys(obj.readEvents || {}).length,
    errorReports: (obj.errorReports || []).length,
  };
  return { ok: true, counts };
}
