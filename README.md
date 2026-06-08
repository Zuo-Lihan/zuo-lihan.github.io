# Zuo-Lihan.github.io CV / Personal Page 发布说明

这个仓库是 `Zuo-Lihan/zuo-lihan.github.io` 的 GitHub Pages 个人主页仓库。当前新的学术 CV / 个人主页还在 `preview/` 目录中做交互预览，目的是先不破坏线上已有主页，等确认后再合并到 `master` 并发布到互联网。

## 当前状态

- 新页面预览文件：`preview/index.html`
- 分章节内容文件：
  - `preview/sections/hero.html`
  - `preview/sections/research.html`
  - `preview/sections/publications.html`
  - `preview/sections/projects.html`
  - `preview/sections/profile.html`
  - `preview/sections/contact.html`
- 头像资源：`preview/assets/notion-profile.jpg`
- 当前工作分支：`develop`
- 当前线上主页分支应保持为：`master`
- 本地预览地址：`http://127.0.0.1:4173/preview/index.html`
- 目标线上地址：`https://zuo-lihan.github.io/`

## 文件结构和编辑方式

新的预览页已经按章节拆分，方便后续单独修改内容：

```text
preview/
├── build.js
├── dev-server.js
├── index.html
├── assets/
│   └── notion-profile.jpg
└── sections/
    ├── hero.html
    ├── research.html
    ├── publications.html
    ├── projects.html
    ├── profile.html
    └── contact.html
```

编辑建议：

- 改首页简介、头像旁边的 Links：编辑 `preview/sections/hero.html`
- 改研究方向轮播：编辑 `preview/sections/research.html`
- 改论文列表：编辑 `preview/sections/publications.html`
- 改项目作品：编辑 `preview/sections/projects.html`
- 改 CV 时间线：编辑 `preview/sections/profile.html`
- 改联系方式：编辑 `preview/sections/contact.html`
- 改整体样式、背景、卡片 hover、轮播交互、弹窗逻辑：编辑 `preview/index.html`

注意：`preview/sections/*.html` 是方便编辑的章节源文件。通过本地开发服务器打开 `preview/index.html` 时，页面会自动读取这些章节文件；保存章节文件后，开发服务器会用 Server-Sent Events 通知浏览器刷新，平时不会反复轮询文件。

`preview/index.html` 里也保留了一份内联兜底内容，避免直接打开 HTML 或章节加载失败时页面空白。发布前建议运行一次：

```bash
node preview/build.js
```

这个命令会把 `preview/sections/*.html` 同步写入 `preview/index.html` 的兜底内容。

## 上线前必须确认

1. 在本地预览完整检查页面：

   启动本地开发服务器：

   ```bash
   node preview/dev-server.js
   ```

   打开：

   ```text
   http://127.0.0.1:4173/preview/index.html
   ```

   之后直接修改 `preview/sections/*.html` 并保存，浏览器里的预览页会自动刷新。

   如果 `4173` 端口已被占用，可以换一个端口：

   ```bash
   PORT=4174 node preview/dev-server.js
   ```

2. 逐项确认以下内容：

   - 首页姓名、简介、研究方向无误。
   - 头像可以点击放大，且不是额外按钮样式。
   - `Links` 只保留 `GitHub`、`ORCID`、`CV`，并且可以跳转。
   - `Research` 卡片可以轮播、点击侧边卡片切换、点击当前卡片打开详情。
   - `Publications` 只包含论文，不混入项目、博客或代码记录。
   - `CV` 时间线内容完整，时间、单位、角色和项目描述无误。
   - 页面背景、卡片 hover、章节间距、移动端布局都已经确认。

3. 发布或提交前同步一次内联兜底内容：

   ```bash
   node preview/build.js
   ```

4. 确认没有敏感信息被发布。GitHub Pages 页面是公开网页，邮箱、照片、CV 链接、论文信息都会被互联网上的访问者看到。

## 先推送到 develop

确认预览版本可以进入远端审查后，先提交到 `develop`，不要直接推 `master`。

```bash
git switch develop
git status
git add README.md preview/build.js preview/dev-server.js preview/index.html preview/assets/notion-profile.jpg preview/sections
git commit -m "Add academic CV homepage preview"
git push -u origin develop
```

推送后，在 GitHub 上打开 `develop` 分支检查文件是否完整：

- `preview/index.html`
- `preview/build.js`
- `preview/dev-server.js`
- `preview/assets/notion-profile.jpg`
- `preview/sections/*.html`
- `README.md`

## 从预览变成正式主页

等你确认 `preview/` 中的页面就是最终版本后，再把预览页面提升为根目录首页。GitHub Pages 的个人主页默认从仓库发布源的根目录读取 `index.html`，所以最终需要让新的 CV 页面成为根目录的 `index.html`，同时把分章节文件复制到根目录的 `sections/`。

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
git add index.html assets/notion-profile.jpg sections README.md preview/build.js preview/dev-server.js preview/index.html preview/assets/notion-profile.jpg preview/sections
git commit -m "Promote academic CV homepage"
git push origin develop
```

## 合并到 master 并发布

不要在没有审查 diff 的情况下直接覆盖 `master`。推荐使用 Pull Request：

1. 在 GitHub 打开仓库：`https://github.com/Zuo-Lihan/zuo-lihan.github.io`
2. 创建 Pull Request：`develop` -> `master`
3. 检查 PR diff，重点看：
   - 根目录 `index.html` 是否被新的 CV 页面替换。
   - `assets/notion-profile.jpg` 是否存在。
   - 根目录 `sections/*.html` 是否存在。
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
4. 把确认后的内容同步到根目录 `index.html` 和 `sections/`。
5. 推送 `develop`。
6. PR 合并到 `master`。
7. 等待 GitHub Pages 自动部署。

这样可以保持线上主页稳定，同时保留一个可审查、可回滚的发布流程。
