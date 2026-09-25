# Blue Archive AI Code 网站

面向蔚蓝档案玩家的 AI 工具站，纯静态、无框架、开箱即用。

## 页面结构

全站采用**单页滚动叙事**：520vh 滚动容器 + sticky 100vh 视口，从「一切奇迹的始发点」一路下潜到基沃托斯的模型档案。旧版独立的 `tools.html` / `affection.html` / `interaction.html` 三页已删除，内容全部并入首页 Scene 2。

| 文件 | 作用 |
| --- | --- |
| `index.html` | 唯一页面 —— 滚动叙事舞台（导航、主视觉、四大模块、联系表单、页脚） |
| `home-scene.css` | 叙事专属样式（壁纸层、弧形卡、液态玻璃、音乐开关、底噪提示） |
| `home-scene.js` | 叙事逻辑（滚动进度驱动、场景联动、弧形卡、详情弹层、背景音乐） |
| `home-data.js` | 四大模块的内容数据（自动生成，请勿手改） |
| `assets/home/` | 场景图与背景音乐 `bgm.mp3` |
| `styles.css` | 站点基础样式与配色（导航、页脚、按钮、表单） |
| `script.js` | 基础交互（密码门、菜单、滚动动画、表单提交） |
| `wallpaper/` | Spine 4.2 WebGL 动画壁纸 |

> `index.local.html` 是本地验证副本（已 `.gitignore`，不会入库），内容与 `index.html` 一致，只是去掉了密码门。

## 首页场景分区

导航栏与页脚的链接通过 `data-goto`（滚动进度 0–1）跳到对应位置：

| 位置 | `data-goto` | 内容 |
| --- | --- | --- |
| Scene 1 | `0` | 主视觉 + Spine 壁纸（可摸头/捏脸交互） |
| Scene 2 · 设定集 | `0.70` | 角色设定、美术资料与世界观档案 |
| Scene 2 · 好感度模型 | `0.79` | 随对话好感度逐步演变的模型 |
| Scene 2 · 交互模型 | `0.88` | 自由对话与多轮即时互动 |
| Scene 2 · 联系 | `0.97` | 邮件表单（FormSubmit） |

### 404 兜底页

仓库根目录的 `404.html` 会在 GitHub Pages 找不到页面时自动返回。它会**识别旧链接并把访客送到首页对应模块**（靠 `?goto=` 参数，值同上表），4 秒后自动跳转，期间任何点击都会中止自动跳转。

| 旧链接 | 去向 |
| --- | --- |
| `tools.html` | 首页 · 设定集（`?goto=0.70`） |
| `affection.html` | 首页 · 好感度模型（`?goto=0.79`） |
| `interaction.html` | 首页 · 交互模型（`?goto=0.88`） |
| 其他 | 首页顶部 |

> 映射关系写在 `404.html` 的 `MAP` 里。跳转会**等待密码门解锁后**才滚动（见 `home-scene.js` 的 `waitUnlocked`）。
> 本地调试可直接访问 `404.html?from=tools.html` 模拟。

## 如何修改

- **改模块内容** → 编辑 `home-data.js` 的 `window.BA_MODULES`（`entries` 为条目，`form: true` 表示该卡是表单）
- **改页面文案/结构** → `index.html`
- **改叙事视觉（卡片、壁纸层、动画）** → `home-scene.css`
- **改基础配色与导航/页脚样式** → `styles.css` 顶部 `:root`
- **改背景音乐** → 替换 `assets/home/bgm.mp3`（保持同名）

## 本地预览 ⚠️

**不要直接双击 `index.html`。** `file://` 协议下浏览器会拦截 `fetch`，Spine 壁纸与场景资源加载失败，会退化成深蓝渐变兜底背景（页头会显示提示条）。

请用本地 HTTP 服务预览：

```bash
python -m http.server 8000
# 然后访问 http://127.0.0.1:8000/index.html
```

## 部署

推送到 GitHub Pages 即可生效（约 1–2 分钟）。

⚠️ 改动 `home-scene.css` / `home-scene.js` / `home-data.js` 后，**必须同步升级 `index.html` 里的 `?v=` 版本号**，否则用户端会命中 CDN 缓存看到旧版。三个 `?v=` 要一起改。

改动上线后若本地看着没变，用 `Ctrl + Shift + R` 硬刷新。
