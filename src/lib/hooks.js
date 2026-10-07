import { useEffect, useState, useCallback } from 'react';
import { onChange } from './db.js';

// hash 路由：#/event/E1935-ZYHY?from=timeline
export function parseHash() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export const go = (path) => { window.location.hash = path; };

export function useRoute() {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const f = () => { setR(parseHash()); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

// 读取 IndexedDB 数据，并在指定 store 变化时自动刷新
export function useDb(loader, stores, deps = []) {
  const [data, setData] = useState(null);
  const load = useCallback(() => { loader().then(setData); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    return onChange((s) => { if (!stores || stores.includes(s)) load(); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}

export function useIsMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return m;
}
