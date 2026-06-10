# Zuo-Lihan.github.io CV / Personal Page 发布说明

这个仓库是 `Zuo-Lihan/zuo-lihan.github.io` 的 GitHub Pages 个人主页仓库。新的学术 CV / 个人主页已经作为根目录静态页面发布；后续内容维护仍建议先在 `develop` 分支和 `preview/` 目录中修改、预览和审查，再同步到根目录并发布到 `master`。

## 当前状态

- 线上发布入口：`index.html`
- 维护预览入口：`preview/index.html`
- 分章节内容文件：
  - `preview/sections/hero.html`
  - `preview/sections/research.html`
  - `preview/sections/publications.html`
  - `preview/sections/projects.html`
  - `preview/sections/profile.html`
  - `preview/sections/docs.html`
  - `preview/sections/contact.html`
- Markdown 文档系统：
  - `preview/docs/markdown/*.md`
  - `preview/docs/docs-renderer.js`
  - `preview/docs/docs.css`
  - `preview/docs/build-docs.js`
  - `preview/docs/docs-manifest.json`
  - `preview/docs/docs-data.js`
- 头像资源：`preview/assets/notion-profile.jpg`
- 访客地球统计：位于 `index.html` 与 `preview/index.html` 底部 `visitor-footer`，使用 LiveTrafficFeed 3D visitor map 脚本按域名记录国家级访客来源。
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
- 改研究方向轮播：编辑 `preview/sections/research.html`
- 改论文列表：编辑 `preview/sections/publications.html`
- 改项目作品：编辑 `preview/sections/projects.html`
- 改 CV 时间线：编辑 `preview/sections/profile.html`
- 改 Docs 入口卡片兜底内容：编辑 `preview/sections/docs.html`
- 改联系方式：编辑 `preview/sections/contact.html`
- 改页面底部访客地球样式或统计脚本：编辑 `preview/index.html` 中的 `visitor-footer`
- 改整体样式、背景、卡片 hover、轮播交互、弹窗逻辑：编辑 `preview/index.html`
- 改或新增 Docs 正文：编辑或新增 `preview/docs/markdown/*.md`

注意：`preview/sections/*.html` 是方便编辑的章节源文件。通过本地开发服务器打开 `preview/index.html` 时，页面会自动读取这些章节文件；保存章节文件后，开发服务器会用 Server-Sent Events 通知浏览器刷新，平时不会反复轮询文件。

`preview/index.html` 里也保留了一份内联兜底内容，避免直接打开 HTML 或章节加载失败时页面空白。发布前建议运行一次：

```bash
node preview/build.js
```

这个命令会把 `preview/sections/*.html` 同步写入 `preview/index.html` 的兜底内容。

## Docs / Markdown 文档写法

Docs 已经拆成一个轻量的本地 Markdown 渲染系统。后续写文档时，正文主要写 Markdown，不需要为每篇文档重新写 HTML 页面。

新增一篇文档：

1. 在 `preview/docs/markdown/` 新建 Markdown 文件，例如：

   ```text
   preview/docs/markdown/my-note.md
   ```

2. 在文件顶部写 front matter：

   ```markdown
   ---
   slug: my-note
   title: My Research Note
   eyebrow: Docs / Research
   summary: One-sentence summary shown on the Docs card and document hero.
   image: img/post-TMUX_usages.jpg
   tags: Tag One, Tag Two, Tag Three
   sourceLabel: Optional source label
   sourceHref: _posts/source-file.md
   ---
   ```

3. 用普通 Markdown 写正文，支持标题、段落、列表、引用、表格、链接、行内代码和 fenced code block。

4. 运行：

   ```bash
   node preview/build.js
   ```

   这个命令会扫描 `preview/docs/markdown/*.md`，生成 `preview/docs/docs-manifest.json` 和 `preview/docs/docs-data.js`，并同步 `preview/index.html` 的兜底内容。`docs-data.js` 会内嵌 Markdown 内容，让直接从本地 `index.html` 打开时也能渲染文档页。

5. 预览单篇文档：

   ```text
   http://127.0.0.1:4173/preview/docs/view.html?doc=my-note
   ```

使用 `node preview/dev-server.js` 本地开发时，修改 `preview/docs/markdown/*.md` 后开发服务器会自动重新生成 manifest 并刷新浏览器。

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

## Visitor Globe / 访客来源地图

页面底部的访客地球使用 LiveTrafficFeed 的 3D visitor map widget：

```html
https://cdn.livetrafficfeed.com/static/3d-maps/live.v2.js?o=eaf9ff&l=7eddbd&b=0b6b87&c=2fe2ff&n=c451a6&root=1&s=310
```

说明：

- 这是静态 GitHub Pages 可用的第三方统计组件；访客来源记录保存在第三方服务端，不保存在本仓库里。
- `root=1` 表示按根域名记录，后续调整页面布局、移动章节位置或重构 CSS，不会重置该域名下的历史访问来源。
- 不要把 `visitor-footer` 加入顶部导航或右侧进度点；它只是页面最底部的独立统计区。
- 如果未来更换统计服务或更换 widget URL，服务端历史记录可能从新服务重新开始。

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

## 同步为正式主页

等你确认 `preview/` 中的页面就是最终版本后，再把预览页面同步到根目录首页。GitHub Pages 的个人主页默认从仓库发布源的根目录读取 `index.html`，所以正式发布需要让根目录的 `index.html`、`sections/`、`docs/` 和 `assets/` 与预览版本保持一致。

推荐在 `develop` 上完成这一步：

```bash
git switch develop
git pull origin develop
node preview/build.js
mkdir -p assets
rm -rf sections
cp preview/index.html index.html
cp preview/assets/notion-profile.jpg assets/notion-profile.jpg
cp -R preview/sections sections
rm -rf docs
cp -R preview/docs docs
git status
```

然后再次本地检查正式路径：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:4173/index.html
```

如果正式路径检查无误，再提交：

```bash
git add index.html assets/notion-profile.jpg sections docs README.md preview/build.js preview/dev-server.js preview/index.html preview/assets/notion-profile.jpg preview/sections preview/docs
git commit -m "Promote academic CV homepage"
git push origin develop
```

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

- Source: `Deploy from a branch`
- Branch: `master`
- Folder: `/(root)`

保存后，GitHub Pages 会在 `master` 的根目录发布页面。根据 GitHub 官方文档，GitHub Pages 可以配置为从指定分支和根目录或 `/docs` 目录发布；个人或组织主页仓库需要使用 `<owner>.github.io` 这种仓库名。

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
4. 把确认后的内容同步到根目录 `index.html`、`sections/`、`docs/` 和 `assets/`。
5. 推送 `develop`。
6. PR 合并到 `master`。
7. 等待 GitHub Pages 自动部署。

这样可以保持线上主页稳定，同时保留一个可审查、可回滚的发布流程。
