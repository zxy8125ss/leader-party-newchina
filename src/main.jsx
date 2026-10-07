import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);

// 请求持久化存储，降低浏览器清理本机数据的概率
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
