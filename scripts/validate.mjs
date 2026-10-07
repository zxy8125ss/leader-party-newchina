// 内容校验脚本：node scripts/validate.mjs <数据目录> [--draft]
// 检查：Schema、ID 唯一、引用存在、S/A 级 criteria ≥2、每事件有主要来源、错字黑名单。
// --draft：指向尚未写入的事件的关系引用只报警告（样例/分阶段撰写时使用）。
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const dir = process.argv[2] || 'data/content';
const draft = process.argv.includes('--draft');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'schema/content.schema.json'), 'utf8'));
const confusables = JSON.parse(fs.readFileSync(path.join(root, 'data/confusables.json'), 'utf8'));

const read = (f) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
const others = read('others.json') || {};
const data = {
  stages: read('stages.json') || others.stages || [],
  events: read('events.json') || [],
  people: read('people.json') || others.people || [],
  sources: read('sources.json') || [],
  quiz: read('quiz.json') || others.quiz || [],
  intl: read('intl.json') || others.intl || [],
  map: read('map.json') || others.map || { locations: [], routes: [], images: [] },
};

const errors = [], warnings = [];
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(schema);
const check = (def, item, label) => {
  const v = ajv.getSchema(`${schema.$id}#/$defs/${def}`);
  if (!v(item)) v.errors.forEach((e) => errors.push(`${label}: ${e.instancePath || '(根)'} ${e.message}`));
};

data.stages.forEach((x) => check('stage', x, x.id));
data.events.forEach((x) => check('event', x, x.id));
data.people.forEach((x) => check('person', x, x.id));
data.sources.forEach((x) => check('source', x, x.id));
data.quiz.forEach((x) => check('quiz', x, x.id));
data.intl.forEach((x) => check('intl', x, x.id));
check('map', data.map, 'map');

// ID 唯一
const all = [...data.stages, ...data.events, ...data.people, ...data.sources, ...data.quiz, ...data.intl, ...data.map.locations, ...data.map.images];
const seen = new Set();
all.forEach((x) => { if (seen.has(x.id)) errors.push(`重复 ID：${x.id}`); seen.add(x.id); });

const ids = (arr) => new Set(arr.map((x) => x.id));
const E = ids(data.events), P = ids(data.people), SRC = ids(data.sources), ST = ids(data.stages), I = ids(data.intl), L = ids(data.map.locations), IMG = ids(data.map.images);
const ref = (ok, msg, soft = false) => { if (!ok) (soft && draft ? warnings : errors).push(msg); };

for (const e of data.events) {
  ref(ST.has(e.stageId), `${e.id}: 阶段 ${e.stageId} 不存在`, true);
  if (e.locationId) ref(L.has(e.locationId), `${e.id}: 地点 ${e.locationId} 不存在`, true);
  if (e.imageId) ref(IMG.has(e.imageId), `${e.id}: 图片 ${e.imageId} 不存在`);
  e.peopleIds.forEach((p) => ref(P.has(p), `${e.id}: 人物 ${p} 不存在`, true));
  [...e.relations.before, ...e.relations.after].forEach((r) => ref(E.has(r.id), `${e.id}: 关系事件 ${r.id} 不存在`, true));
  e.relations.context.forEach((c) => ref(E.has(c) || I.has(c), `${e.id}: 同期背景 ${c} 不存在`, true));
  [...e.sources.main, ...(e.sources.extra || [])].forEach((s) => ref(SRC.has(s.sourceId), `${e.id}: 来源 ${s.sourceId} 未登记`));
  (e.quotes || []).forEach((q) => ref(SRC.has(q.sourceId), `${e.id}: 引文来源 ${q.sourceId} 未登记`));
  if (e.level !== 'B' && e.criteria.length < 2) errors.push(`${e.id}: ${e.level} 级事件 criteria 少于 2 项`);
  if (e.endDate && e.endDate < e.date) errors.push(`${e.id}: 结束日期早于开始日期`);
  const st = data.stages.find((s) => s.id === e.stageId);
  if (st && (e.date.slice(0, 7) < st.start.slice(0, 7) || e.date.slice(0, 7) > st.end.slice(0, 7))) warnings.push(`${e.id}: 日期 ${e.date} 不在阶段 ${st.id} 范围内`);
}
for (const p of data.people) {
  p.eventIds.forEach((x) => ref(E.has(x), `${p.id}: 关联事件 ${x} 不存在`, true));
  (p.relations || []).forEach((r) => ref(P.has(r.personId), `${p.id}: 关系人物 ${r.personId} 不存在`, true));
  p.sourceIds.forEach((s) => ref(SRC.has(s), `${p.id}: 来源 ${s} 未登记`));
}
for (const q of data.quiz) {
  ref(ST.has(q.stageId), `${q.id}: 阶段不存在`);
  q.eventIds.forEach((x) => ref(E.has(x), `${q.id}: 依据事件 ${x} 不存在`));
  if (q.answer >= q.options.length) errors.push(`${q.id}: 答案序号超出选项`);
}
// 每阶段测验题结构：2 fact、1 order、1 cause、1 synthesis（阶段题满 5 道时检查）
for (const st of data.stages) {
  const qs = data.quiz.filter((q) => q.stageId === st.id);
  if (qs.length === 5) {
    const c = (a) => qs.filter((q) => q.ability === a).length;
    if (c('fact') !== 2 || c('order') !== 1 || c('cause') !== 1 || c('synthesis') !== 1) errors.push(`${st.id}: 测验题能力结构应为 2/1/1/1`);
  } else if (qs.length) warnings.push(`${st.id}: 测验题 ${qs.length} 道（应为 5 道）`);
}

// 错字黑名单：扫描所有字符串
const bad = Object.entries(confusables).filter(([k, v]) => !k.startsWith('_') && v);
const walk = (v, where) => {
  if (typeof v === 'string') bad.forEach(([w, r]) => { if (v.includes(w)) errors.push(`${where}: 错字“${w}”，应为“${r}”`); });
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, `${where}.${k}`));
};
walk(data, dir);

warnings.forEach((w) => console.log('⚠ ' + w));
errors.forEach((e) => console.log('✗ ' + e));
console.log(`\n事件 ${data.events.length}｜人物 ${data.people.length}｜来源 ${data.sources.length}｜测验 ${data.quiz.length}｜错误 ${errors.length}｜警告 ${warnings.length}`);
process.exit(errors.length ? 1 : 0);
