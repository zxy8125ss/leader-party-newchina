# 领袖·政党·新中国

1893—1976 年毛泽东、中国共产党、国家与时代三线历史时间轴，个人学习用 PWA。纯静态站点，无后端，数据存本机。

## 目录
- `data/content/` 内容数据（7 个 JSON）：stages、events、people、sources、quiz、intl、map。改内容只改这里。
- `schema/content.schema.json` 内容结构定义；`scripts/validate.mjs` 构建前校验（ID、引用、来源、错字黑名单）。
- `data/confusables.json` 错字黑名单，发现新错字就加一条。
- `src/` 前端代码（React + Vite + vite-plugin-pwa），`src/db/schema.js` 本机数据库结构与迁移。
- `public/fonts/` 按实际用字裁剪的 Noto 字体（`npm run fonts`，需源字体放在 `.fonts-src/`）。内容新增文字后需重新裁剪。
- `src/data/chinaOutline.json` 示意地图轮廓（`node scripts/make_map.mjs` 生成，Natural Earth 公有领域数据，不作为国界依据）。

## 内容现状
- 8 个阶段、94 个事件（核心 S/A 级 77 个）、21 位人物、5 条国际背景、40 道测验、46 条来源。
- 事件详情中“待核实 / 说法不一”列出了来源不足或有分歧之处，后续逐条复核。
- 历史照片：未找到可逐一确认授权的公有领域图片，按“宁缺毋滥”原则暂不收录。

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
