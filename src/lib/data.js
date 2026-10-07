// 内容数据只从 JSON 读取，组件里不写死任何历史内容
import eventsRaw from '../../data/content/events.json';
import people from '../../data/content/people.json';
import stages from '../../data/content/stages.json';
import sources from '../../data/content/sources.json';
import quiz from '../../data/content/quiz.json';
import intl from '../../data/content/intl.json';
import map from '../../data/content/map.json';

export const CONTENT_VERSION = 1;

export const LANES = [
  { id: 'mao', name: '毛泽东', short: '毛' },
  { id: 'party', name: '中国共产党', short: '党' },
  { id: 'nation', name: '国家与时代', short: '国' },
];
export const LANE_INDEX = { mao: 0, party: 1, nation: 2 };
export const LEVEL_NAME = { S: 'S 级 · 核心节点', A: 'A 级 · 重要事件', B: 'B 级 · 背景事件' };
export const ABILITY_NAME = { fact: '事实理解', order: '时间顺序', cause: '因果关系', synthesis: '综合判断' };

const sortKey = (d) => (d + '-00-00').slice(0, 10);
const keyOf = (e) => sortKey(e.sortDate || e.date);
export const events = eventsRaw.filter((e) => !e.retired).sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
export const coreEvents = events.filter((e) => e.level !== 'B');

const index = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
export const eventById = index(eventsRaw);
export const personById = index(people);
export const stageById = index(stages);
export const sourceById = index(sources);
export const intlById = index(intl);
export const locationById = index(map.locations);
export const quizById = index(quiz);

export { people, stages, sources, quiz, intl, map };

export const stageOf = (e) => stageById[e.stageId];
export const yearOf = (e) => Number(e.date.slice(0, 4));
export const stagesWithContent = stages.filter((s) => events.some((e) => e.stageId === s.id));
export const quizOfStage = (stageId) => quiz.filter((q) => q.stageId === stageId);
