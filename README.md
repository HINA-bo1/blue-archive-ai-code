
/* ============ 设定集单卡（工具页） ============ */
.tool-single {
  max-width: 560px;
  margin: 0 auto;
  padding: 44px 36px;
}
'
Add-Content -Path "outputs/website/styles.css" -Value $add -Encoding UTF8

@'
# Blue Archive AI Code 网站

面向蔚蓝档案玩家的 AI 工具站，纯静态、无框架、开箱即用。

## 页面结构

- `index.html` — 首页（导航、主视觉、关于、功能、数据、联系表单）
- `tools.html` — 设定集页面（当前展示"设定集"单入口）
- `styles.css` — 全部样式与配色
- `script.js` — 交互逻辑（菜单、滚动动画、数字动画、表单演示）

## 区块说明（可自由替换内容）

首页 `index.html`：

| 区块 | 位置 | 可放置内容 |
| --- | --- | --- |
| 1 导航栏 | `index.html` 顶部 `<header>` | 品牌名、菜单项文字与链接 |
| 2 主视觉 Hero | `#home` 区块 | 大标题、简介文字、按钮文字与跳转地址 |
| 3 关于 | `#about` 区块 | 卡片标题、描述文字（可换成图片） |
| 4 功能预览 | `#features` 区块 | 卡片增删、图标、标题、描述 |
| 5 数据统计 | `#stats` 区块 | 数字（`data-target`）、说明文字 |
| 6 联系表单 | `#contact` 区块 | 表单文案；接入后端时改 `script.js` |
| 7 页脚 | 底部 `<footer>` | 版权信息、底部链接 |

设定集页 `tools.html`：

| 区块 | 位置 | 可放置内容 |
| --- | --- | --- |
| 1 导航栏 | 顶部 `<header>` | 与首页一致，当前页高亮 |
| 2 页面头部 | `.page-hero` | 标题与副标题文字 |
| 3 设定集条目 | `collection-list` 内的 `collection-entry`（当前含 `key`） | 每条目一个 `article`，可放文字、图片、链接；复制模板即可新增 |
| 4 底部引导 | `.section-alt` | 文案与按钮 |
| 5 页脚 | 底部 `<footer>` | 版权信息、底部链接 |

## 如何修改

- 每个区块前后都有 `<!-- ============ 区块 N：名称 ============ -->` 注释，找到对应区块直接改文字、图片或链接即可。
- 配色修改 `styles.css` 顶部 `:root` 中的 `--primary` / `--accent` 等变量。
- 新增区块：复制一个现成 `<section>`，改内容后粘贴到对应位置即可。

## 本地预览

直接双击 `index.html` 即可在浏览器中打开。

## 部署

静态页面可免费部署到 GitHub Pages、Vercel、Netlify 等平台，将本目录直接上传即可。
