# Zuo-Lihan.github.io CV / Personal Page 发布说明

这个仓库是 `Zuo-Lihan/zuo-lihan.github.io` 的 GitHub Pages 个人主页仓库。正式主页入口为根目录 `index.html`。文档的唯一线上内容源是 `docs/markdown/`；每次提交到 `master`，GitHub Actions 自动生成文档目录、正文数据和首页卡片，并部署 `_site/`，不需要后端。`preview/` 保留旧实验页和本地设计原型，不是线上文档的编辑位置。

## 当前状态

- 线上发布入口：`index.html`
- 正式发布构建：`node scripts/build-site.js` → `_site/`
- 部署流水线：`.github/workflows/pages.yml`
- 现代设计预览入口：`preview/editorial.html`；旧实验页：`preview/index.html`
- 分章节内容文件：
  - `preview/sections/hero.html`
  - `preview/sections/research.html`
  - `preview/sections/publications.html`
  - `preview/sections/projects.html`
  - `preview/sections/profile.html`
  - `preview/sections/docs.html`
  - `preview/sections/contact.html`
- 正式 Markdown 文档系统：
  - `docs/markdown/*.md`：新增和编辑正文
  - `docs/markdown/imgs/<文档文件名>.jpg`：同名背景图片
  - `docs/editorial-renderer.js`：正文与背景渲染
  - `docs/build-docs.js`：自动生成目录和首页卡片
  - `docs/docs-manifest.json`、`docs/docs-data.js`：生成结果，不手工维护
- 头像资源：`preview/assets/notion-profile.jpg`
- 开场芯片动效资源：优先加载 `preview/assets/agentic-ai-chip-template.webp`，不支持 WebP 时回退到 `preview/assets/agentic-ai-chip-template.png`
- 访客来源地图：线上 `index.html` 与现代预览 `preview/editorial.html` 页尾使用用户提供的 MapMyVisitors 地图组件，记录来自访问 IP 的地理来源；加载入口为 `visitor-counter.js`，独立嵌入页为 `visitor-widget.html`。
- 旧 Service Worker 清理脚本：`preview/sw.js`
- 日常编辑分支：`develop`
- 线上发布分支：`master`
- 本地预览地址：`http://127.0.0.1:4173/preview/index.html`
- 线上地址：`https://zuo-lihan.github.io/`

## 文件结构和编辑方式

页面已经按章节拆分，方便后续单独修改内容：

```text
preview/
├── build.js
├── dev-server.js
├── index.html
├── assets/
│   └── notion-profile.jpg
├── docs/
│   ├── build-docs.js
│   ├── docs.css
│   ├── docs-data.js
│   ├── docs-renderer.js
│   ├── docs-manifest.json
│   ├── view.html
│   └── markdown/
│       └── tmux-nscc.md
└── sections/
    ├── hero.html
    ├── research.html
    ├── publications.html
    ├── projects.html
    ├── profile.html
    ├── docs.html
    └── contact.html
```

编辑建议：

- 改首页简介、头像旁边的 Links：编辑 `preview/sections/hero.html`
- 当前海洋版的个人简介单独编辑 `preview/sections/biography.html`，保留其中的中英文段落和机构链接；同步到 `index.html` 与 `preview/editorial.html` 后本地审查。文字波动逻辑在 `editorial.js` 与 `preview/editorial.js`，支持减少动态效果设置，触屏默认关闭。
- 资料卡内的瓦力：组件源文件 `preview/sections/research-companion.html`，按需加载入口 `research-companion.js`，Three.js 模型和交互在 `walle-scene.js`。使用仓库已有的本地 Three.js，自建几何与纹理，不请求外部模型或 CDN。履带行驶、转向返回、鼠标注视、点击挥手，间歇阅读、电脑工作、游戏和休息；只在组件可见时以约 30 fps 渲染，像素比上限 1.5，减少动态效果时静止，WebGL 不可用时隐藏组件，不影响正文和链接。
- 改研究方向轮播：编辑 `preview/sections/research.html`
- 改论文列表：编辑 `preview/sections/publications.html`
- 改项目作品：编辑 `preview/sections/projects.html`
- 改 CV 时间线：编辑 `preview/sections/profile.html`
- 正式 Docs 卡片由 `docs/markdown/*.md` 自动生成，不要在首页手动添加卡片。
- 改联系方式：编辑 `preview/sections/contact.html`
- 改当前页面底部访客统计：文案源文件为 `preview/sections/visitors.html`，同步到 `index.html` 和 `preview/editorial.html`；样式在 `editorial.css` 与 `preview/editorial.css`，加载逻辑在 `visitor-counter.js`。旧实验版 `preview/index.html` 不用于当前线上统计。
- 改整体样式、背景、卡片 hover、轮播交互、弹窗逻辑：编辑 `preview/index.html`
- 改或新增正式 Docs 正文：编辑或新增 **`docs/markdown/*.md`**；背景放在 **`docs/markdown/imgs/`**。

注意：`preview/sections/*.html` 是方便编辑的章节源文件。通过本地开发服务器打开 `preview/index.html` 时，页面会自动读取这些章节文件；保存章节文件后，开发服务器会用 Server-Sent Events 通知浏览器刷新，平时不会反复轮询文件。

`preview/index.html` 里也保留了一份内联兜底内容，避免直接打开 HTML 或章节加载失败时页面空白。发布前建议运行一次：

```bash
node preview/build.js
```

这个命令会把 `preview/sections/*.html` 同步写入 `preview/index.html` 的兜底内容。

## Node 环境说明

README 里的 `node preview/*.js` 不是浏览器命令，而是用 Node.js 运行本仓库自带的维护脚本：

- `node preview/dev-server.js`：启动本地热更新预览服务器。
- `node preview/build.js`：把 `preview/sections/*.html` 和 `preview/docs/markdown/*.md` 同步进可直接发布的静态文件。

正式线上页面本身不需要你安装 Node；GitHub Pages 只会发布静态 HTML、CSS、JS 和图片。只有你在本地编辑章节、生成 Docs 或使用热更新预览时，才需要 Node。

如果你的终端提示 `node: command not found`，先安装 Node.js：

```bash
brew install node
node -v
```

如果没有 Homebrew，可以从 Node.js 官网下载安装 LTS 版本：

```text
https://nodejs.org/
```

安装完成后，重新打开终端，再运行：

```bash
node preview/build.js
HOST=127.0.0.1 PORT=4173 node preview/dev-server.js
```

如果只是临时查看已经生成好的静态页面，不需要热更新，可以不用 Node，直接用 Python 启一个静态服务器：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/index.html
```

## 在 GitHub 网页编辑 / 上传 Docs

完整模板与语法规范见 [Markdown 文档写作与发布规范](docs/markdown/markdown-guide.md)，也可通过[文档页](https://zuo-lihan.github.io/docs/editorial.html?doc=markdown-guide)访问。指南设置了 `listed: false`，保留在 Docs 中，但不显示在主页卡片列表。

直接编辑 **master 分支的 `docs/markdown/`**，不要改 `preview/docs/markdown/`、生成的 JSON/JS，或手动复制整个 `docs/` 文件夹覆盖线上内容。

1. 打开 [文档正文目录](https://github.com/Zuo-Lihan/zuo-lihan.github.io/tree/master/docs/markdown)。
2. 编辑已有文档：点击 `.md` 文件 → 铅笔图标 → Edit，使用 Preview 检查 Markdown。
3. 新增文档：Add file → Create new file，文件名如 `my-note.md`；或在该目录选择 Add file → Upload files 上传 Markdown。
4. 点击 Commit changes 提交到 `master`。如果选择新建分支，需要把 PR 合并到 `master` 后才会发布。
5. 在 [Actions](https://github.com/Zuo-Lihan/zuo-lihan.github.io/actions) 查看 **Build and deploy academic website**。必须等 `build` 和 `deploy` 都成功，才是新版本上线；编辑器里的 Preview 只是内容预览。
6. 访问 [首页 Docs](https://zuo-lihan.github.io/#docs)。例如 `test.md` 对应 `https://zuo-lihan.github.io/docs/editorial.html?doc=test`。

最简单的文件就可以是：

```markdown
# My Research Note

正文直接用 Markdown 写。

## Experiments

- First result
- Second result
```

不写 front matter 也会被收录：文件名作为链接标识，首个 `# 标题` 作为标题，没有标题就用文件名。建议文件名使用小写英文、数字和短横线；文件平放在 `docs/markdown/`，不再嵌套子目录。

需要标签或摘要时，可以加可选元信息：

```markdown
---
slug: my-note
title: My Research Note
eyebrow: Docs / LLM
summary: Notes on efficient inference.
tags: LLM, Inference
---

## Experiments

正文……
```

`slug` 不能与其他文档重复，已发布的 slug 尽量不要修改，避免原链接失效。代码块、表格、链接、图片、引用、列表和一级至六级标题均可渲染；原始 HTML 不会直接执行。

可在元信息中添加 `listed: false`，只隐藏这篇文档的首页卡片，保留文档页和原链接。省略此字段则正常展示；这不是隐私或权限设置。

### 文档背景图

图片放在 [`docs/markdown/imgs/`](https://github.com/Zuo-Lihan/zuo-lihan.github.io/tree/master/docs/markdown/imgs)，**图片文件名与 Markdown 文件名相同，仅扩展名不同**：

```text
docs/markdown/
├── test.md
├── tmux-nscc.md
└── imgs/
    ├── test.webp
    └── tmux-nscc.jpg
```

- `test.md` 自动使用 `imgs/test.webp` 为背景，不需要在 Markdown 里配置背景字段。
- 支持 AVIF、WebP、JPG、JPEG、PNG；若上传多种同名格式，按以上顺序选择一个。建议只保留一个。
- 同名指**文件名**，即使 front matter 中设置了不同的 `slug`，仍按照 Markdown 文件名匹配。
- 没有同名图片，或图片加载失败时，使用默认浅色背景板，不显示破损图片。
- 上传、替换、删除图片并提交后，也会自动重新构建和部署。TMUX 的背景已经迁移到此目录。
- 正文插图也可以放这里，用 `![Caption](imgs/figure.jpg)` 引用。插图文件名不需要与文档同名。
- 所有发布的文档和图片都是公开的，不要上传密码、Token、内部数据或敏感截图。

### 本地检查正式发布结果

```bash
node --test tests/docs-build.test.cjs
node scripts/build-site.js
python3 -m http.server 4186 --bind 127.0.0.1 --directory _site
```

打开 `http://127.0.0.1:4186/#docs`。修改文件后重新运行构建并刷新；停止服务器在终端按 Ctrl+C。这里 Node 只用于本地构建，网页编辑时由 GitHub Actions 运行，不要求你电脑安装 Node。

`_site/` 是独立生成的发布结果。自动构建不会把生成文件提交回仓库，也不会覆盖你的 Markdown 源文件；不要手动修改这个目录。

## 本地 / 全网热更新预览服务

`preview/dev-server.js` 是当前预览页的轻量热更新服务器。它会：

- 静态服务当前仓库文件。
- 打开 `preview/index.html`。
- 监听 `preview/` 下的 HTML、JS、CSS、图片、Markdown、JSON 文件变化。
- 在保存后通过 Server-Sent Events 通知浏览器自动刷新。
- 修改 `preview/docs/markdown/*.md` 时自动重新生成 `preview/docs/docs-manifest.json` 和 `preview/docs/docs-data.js`。

### 本机热更新预览

只允许本机访问：

```bash
HOST=127.0.0.1 PORT=4173 node preview/dev-server.js
```

打开：

```text
http://127.0.0.1:4173/preview/index.html
```

如果端口被占用：

```bash
HOST=127.0.0.1 PORT=4174 node preview/dev-server.js
```

### 局域网 / 公网热更新预览

允许其他机器通过服务器 IP 访问：

```bash
HOST=0.0.0.0 PORT=4173 node preview/dev-server.js
```

访问地址：

```text
http://<server-ip>:4173/preview/index.html
```

如果是在云服务器上跑，需要同时确认：

- 服务器系统防火墙允许 `4173` 端口。
- 云厂商安全组允许 `4173` 端口入站。
- 只用于预览审查时，建议临时开放；正式上线仍推荐 GitHub Pages 或 Nginx/HTTPS。

### 后台部署热更新服务

在服务器上后台启动：

```bash
mkdir -p .run logs
node preview/build.js
HOST=0.0.0.0 PORT=4173 nohup node preview/dev-server.js > logs/preview-server.log 2>&1 &
echo $! > .run/preview-server.pid
```

查看状态：

```bash
test -f .run/preview-server.pid && ps -p "$(cat .run/preview-server.pid)"
```

查看日志：

```bash
tail -f logs/preview-server.log
```

### 重启热更新服务

```bash
test -f .run/preview-server.pid && kill "$(cat .run/preview-server.pid)" 2>/dev/null || true
rm -f .run/preview-server.pid
node preview/build.js
HOST=0.0.0.0 PORT=4173 nohup node preview/dev-server.js > logs/preview-server.log 2>&1 &
echo $! > .run/preview-server.pid
```

### 停止热更新服务

```bash
test -f .run/preview-server.pid && kill "$(cat .run/preview-server.pid)" 2>/dev/null || true
rm -f .run/preview-server.pid
```

### 拉取最新 develop 并重新部署

服务器上已有仓库时：

```bash
git switch develop
git pull origin develop
node preview/build.js
test -f .run/preview-server.pid && kill "$(cat .run/preview-server.pid)" 2>/dev/null || true
rm -f .run/preview-server.pid
mkdir -p .run logs
HOST=0.0.0.0 PORT=4173 nohup node preview/dev-server.js > logs/preview-server.log 2>&1 &
echo $! > .run/preview-server.pid
```

第一次在服务器部署预览页时：

```bash
git clone git@github.com:Zuo-Lihan/zuo-lihan.github.io.git
cd zuo-lihan.github.io
git switch develop
node preview/build.js
mkdir -p .run logs
HOST=0.0.0.0 PORT=4173 nohup node preview/dev-server.js > logs/preview-server.log 2>&1 &
echo $! > .run/preview-server.pid
```

正式发布到 `https://zuo-lihan.github.io/` 不需要运行这个热更新服务器。正式发布走 GitHub Pages：把确认后的页面合并到 `master`，由 GitHub Pages 自动部署。

## 上线前必须确认

1. 在本地预览完整检查页面：

   启动本地开发服务器：

   ```bash
   HOST=127.0.0.1 PORT=4173 node preview/dev-server.js
   ```

   打开：

   ```text
   http://127.0.0.1:4173/preview/index.html
   ```

   之后直接修改 `preview/sections/*.html` 并保存，浏览器里的预览页会自动刷新。

   如果 `4173` 端口已被占用，可以换一个端口：

   ```bash
   HOST=127.0.0.1 PORT=4174 node preview/dev-server.js
   ```

2. 逐项确认以下内容：

   - 首页姓名、简介、研究方向无误。
   - 头像可以点击放大，且不是额外按钮样式。
   - `Links` 只保留 `GitHub`、`ORCID`、`CV`，并且可以跳转。
   - `Research` 卡片可以轮播、点击侧边卡片切换、点击当前卡片打开详情。
   - `Publications` 只包含论文，不混入项目、博客或代码记录。
   - `Projects` 卡片点击后先打开站内介绍弹层，弹层底部再提供项目地址。
   - `CV` 时间线内容完整，时间、单位、角色和项目描述无误。
   - `Docs` 卡片可以进入 Markdown 渲染的文档查看页。
   - 页面背景、卡片 hover、章节间距、移动端布局都已经确认。

3. 发布或提交前同步一次内联兜底内容：

   ```bash
   node preview/build.js
   ```

4. 确认没有敏感信息被发布。GitHub Pages 页面是公开网页，邮箱、照片、CV 链接、论文信息都会被互联网上的访问者看到。

## Visitor Map / 访客来源地图

页尾采用用户提供的 [MapMyVisitors](https://mapmyvisitors.com/) 平面地图组件，保留蓝调页面布局；不使用模拟地点、模拟数字或浏览器本地计数。

- 公开组件 ID：`URtgt4pcWftUoaWi4qeXOWetexS5a5I3xr09IjAhat8`，不是密码或密钥。后续重构保留此 ID，记录才能继续累计。
- 本站的[真实统计页面](https://mapmyvisitors.com/web/1c8r6)。组件请求已验证返回本站域名和 Pageviews 数据；测试访问也会被服务商记录，不是人工填入的数字。
- 同时提供的 Globe ID `72PbM9U9vRMk8BGTAXNhU7VBvxipgGoOXVM3Q17qwJw` 虽然能绘出地球，但其 `globe_call_home.js` 数据请求在验证浏览器中被 ORB 拦截。因此按备选要求只接入地图版，不同时加载两套组件。这两个 ID 对应的统计历史可能不同，不能假设互通。
- `visitor-counter.js` 在页面解析完成后立即加载独立 iframe，官方脚本在 `visitor-widget.js` 中加载。记录不依赖点击或滚到页尾；加载被网络或内容拦截器阻断时则无法记录。
- 嵌入页隔离第三方的全局 CSS、jQuery 与滚动监听，使用固定视口再按容器缩放，不因手机旋转而重新加载或重复请求统计。数据响应完成才取消加载提示；失败不补造数字。
- 正式域名 `zuo-lihan.github.io` 默认加载统计。本地、直接打开 HTML、其他域名和 `/preview/` 审查页默认不加载。更换域名时更新两个加载脚本的域名检查。
- 需要检视真实组件时，在本地页面地址加 `?visitor-review=1`，如 `http://127.0.0.1:4185/preview/editorial.html?visitor-review=1`。这是显式启用真实服务，不是 mock；该模式的测试访问可能进入统计。
- 服务商按 IP 地理数据库定位，VPN、代理与共享出口会影响结果。无法定位的来源可能显示 unknown，不能手工替它补国家。Pageviews 是浏览统计，不等于永久去重的独立 IP 数量，具体口径以服务商后台为准。
- 记录在第三方服务端，不依赖 localStorage 和 Git 文件；改布局不会清空同一 ID 的服务端记录。免费第三方服务不能保证永远存在；旧 LiveTrafficFeed、未上线的 Supercounters 数据不会自动迁入。
- 保留服务商署名及[隐私说明](https://mapmyvisitors.com/b/policy)。本页面不自行公开访客原始 IP。
- 页尾不加入导航或进度点。文案源文件为 `preview/sections/visitors.html`，构建器从它生成现代预览页面。

## 日常修改：先推送到 develop

确认预览版本可以进入远端审查后，先提交到 `develop`。`master` 只放已经确认要对外发布的根目录静态页面。

```bash
git switch develop
git status
git add README.md preview/build.js preview/dev-server.js preview/index.html preview/assets/notion-profile.jpg preview/sections preview/docs
git commit -m "Update academic CV homepage"
git push origin develop
```

推送后，在 GitHub 上打开 `develop` 分支检查文件是否完整：

- `preview/index.html`
- `preview/build.js`
- `preview/dev-server.js`
- `preview/assets/notion-profile.jpg`
- `preview/sections/*.html`
- `preview/docs/*`
- `README.md`

## 构建正式主页

当前主页是海洋编辑版。修改页面布局时，在 `develop` 审查后，再将实际需要的布局、样式和脚本变更合并到 `master`。**不要再执行把整个 `preview/index.html`、`preview/docs/` 覆盖到根目录的旧操作**，那会恢复旧版页面或丢失在 GitHub 网页新增的文档。

正式构建只需：

```bash
node scripts/build-site.js
```

构建会读取根目录 `index.html` 和 `docs/markdown/`，将需要公开的页面及资源复制到 `_site/`，再生成最新的 Docs 卡片、目录、正文数据和缓存版本号。不会发布本地 `output/`、测试文件、预览实验或仓库配置。

## 发布到 master

不要在没有审查 diff 的情况下直接覆盖 `master`。推荐使用 Pull Request：

1. 在 GitHub 打开仓库：`https://github.com/Zuo-Lihan/zuo-lihan.github.io`
2. 创建 Pull Request：`develop` -> `master`
3. 检查 PR diff，重点看：
   - 根目录 `index.html` 是否被新的 CV 页面替换。
   - `assets/notion-profile.jpg` 是否存在。
   - 根目录 `sections/*.html` 是否存在。
   - 根目录 `docs/` 是否存在，且 `docs/view.html?doc=tmux-nscc` 可以渲染 Markdown。
   - 旧页面相关文件没有被误删。
4. PR 检查无误后再 Merge 到 `master`。

也可以用命令合并，但建议只在确认 diff 后操作：

```bash
git switch master
git pull origin master
git merge --no-ff develop
git push origin master
```

## GitHub Pages 设置

在 GitHub 仓库页面进入：

```text
Settings -> Pages -> Build and deployment
```

推荐设置：

- Source: **GitHub Actions**
- 工作流：`.github/workflows/pages.yml`
- 触发：推送 `master`，或在 Actions 中手动 Run workflow
- 构建：运行测试，再执行 `node scripts/build-site.js`
- 发布内容：`_site/`，环境为 `github-pages`

不要选 `Deploy from a branch`：它只会原样发布文件，不运行文档生成步骤，新增 `.md` 就可能再次没有卡片。工作流仅具有读取源码与部署 Pages 所需权限，不需要个人 Token、OAuth App 或独立后端。

`Back to Docs` 返回 `index.html#docs`；旧的 `/editorial.html#docs` 地址会兼容跳转到首页。构建按内容更新脚本缓存版本，避免旧的 `docs-data.js` 隐藏新增文档。

参考文档：

- [GitHub Pages: About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [GitHub Pages: Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 发布后检查

合并到 `master` 后等待 Pages 部署完成，然后检查：

```text
https://zuo-lihan.github.io/
```

如果页面没有立即更新：

- 等待 1-5 分钟后刷新。
- 使用浏览器无痕模式打开。
- 强制刷新缓存。
- 在 GitHub 仓库的 `Actions` 或 `Settings -> Pages` 查看部署状态。
- 确认 Pages 发布源仍然是 `master / (root)`。

## 回滚方式

如果上线后发现问题，先不要继续手动改线上文件。推荐回滚到上一个正常提交：

```bash
git switch master
git pull origin master
git log --oneline
git revert <problem_commit_hash>
git push origin master
```

如果只是小问题，也可以在 `develop` 修复后再次通过 PR 合并到 `master`。

## 后续更新 CV 的流程

以后更新 CV 内容时，仍然使用同样流程：

1. 在 `develop` 修改对应的 `preview/sections/*.html`；如果是整体样式或交互，再修改 `preview/index.html`。
2. 本地 HTTP 预览会自动刷新，确认页面显示无误。
3. 发布或提交前运行 `node preview/build.js`，把章节源文件同步进 `preview/index.html` 的兜底内容。
4. 将审查过的页面变更同步到对应根目录文件；不要整目录覆盖 `docs/`。Docs 始终编辑根目录 `docs/markdown/`。
5. 推送 `develop`。
6. PR 合并到 `master`。
7. 等待 GitHub Pages 自动部署。

这样可以保持线上主页稳定，同时保留一个可审查、可回滚的发布流程。
