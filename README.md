# 领袖·政党·新中国（M1 测试版）

1893—1976 年毛泽东、中国共产党、国家与时代三线历史时间轴，个人学习用 PWA。纯静态站点，无后端，数据存本机。

## 目录
- `data/content/` 内容数据（7 个 JSON）：stages、events、people、sources、quiz、intl、map。改内容只改这里。
- `schema/content.schema.json` 内容结构定义；`scripts/validate.mjs` 构建前校验（ID、引用、来源、错字黑名单）。
- `data/confusables.json` 错字黑名单，发现新错字就加一条。
- `src/` 前端代码（React + Vite + vite-plugin-pwa），`src/db/schema.js` 本机数据库结构与迁移。
- `public/fonts/` 按实际用字裁剪的 Noto 字体（`npm run fonts`，需源字体放在 `.fonts-src/`）。

## 常用命令
```
npm install
npm run validate   # 只跑内容校验
npm run dev        # 本地预览
npm run build      # 校验 + 构建到 dist/
```

## 发布
推送到 GitHub 的 main 分支后，`.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages
（仓库 Settings → Pages → Source 选 “GitHub Actions”）。
