// 日期显示：按精度输出，起止日期合并
const parts = (d) => d.split('-').map(Number);

function one(d, precision) {
  const [y, m, day] = parts(d);
  if (precision === 'approx') return `约${y}年${m ? m + '月' : ''}`;
  if (!m || precision === 'year') return `${y}年`;
  if (!day || precision === 'month') return `${y}年${m}月`;
  return `${y}年${m}月${day}日`;
}

export function formatDate(e) {
  const p = e.datePrecision;
  const start = one(e.date, p);
  if (!e.endDate) return start;
  const [y1, m1] = parts(e.date);
  const [y2, m2, d2] = parts(e.endDate);
  let end;
  if (y1 !== y2) end = one(e.endDate, p);
  else if (m1 !== m2 || !d2 || p === 'month') end = d2 && p === 'day' ? `${m2}月${d2}日` : `${m2}月`;
  else end = `${d2}日`;
  return `${start}—${end}`;
}

// 短格式（时间轴卡片）：1935.1.15
export function shortDate(e) {
  const [y, m, d] = parts(e.date);
  if (!m || e.datePrecision === 'year') return `${y}`;
  if (!d || e.datePrecision === 'month') return `${y}.${m}`;
  return `${y}.${m}.${d}`;
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function cnNumber(n) {
  if (n < 10) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  if (n < 100) return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  return String(n);
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
