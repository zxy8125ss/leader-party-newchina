import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base 用相对路径，部署到 GitHub Pages 的任意仓库子路径都能用；路由用 hash，不需要服务端配置
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*.png'],
      manifest: {
        name: '领袖·政党·新中国',
        short_name: '领袖·政党·新中国',
        description: '1893—1976 毛泽东、中国共产党、国家与时代三线历史时间轴（个人学习）',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F5EFE2',
        theme_color: '#9E2A22',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 全部资源预缓存：核心功能不依赖运行时网络
        globPatterns: ['**/*.{js,css,html,json,woff2,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
