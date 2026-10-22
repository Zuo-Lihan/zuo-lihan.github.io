---
slug: markdown-guide
title: Markdown 文档写作与发布规范
eyebrow: Docs / Authoring
summary: 文档目录、可复制的 Markdown 模板、同名背景图规则，以及通过 GitHub 网页编辑和发布的完整流程。
tags: Markdown, Writing, Publishing
---

## 文件放在哪里

正式网站的文档正文统一放在仓库根目录下的 `docs/markdown/`，每篇文档对应一个 `.md` 文件。不要把正式文档上传到 `preview/docs/markdown/`，那是实验预览目录。

```text
docs/
  markdown/
    markdown-guide.md
    my-note.md
    test.md
    imgs/
      my-note.webp
      experiment-result.png
```

建议文件名只使用小写英文字母、数字和短横线，例如 `llm-inference-notes.md`。文档文件平放在 `docs/markdown/`，不要继续嵌套正文子目录。

## 最简模板

没有元信息也可以发布。系统会从第一个一级标题提取文档名称，没有一级标题时使用文件名。文件名默认也是这篇文档的链接标识。

```markdown
# My Research Note

简要说明本文研究的问题。

## Background

背景与动机。

## Method

方法说明。

## Results

实验结果。

## References

- [参考资料](https://example.com/)
```

例如 `my-note.md` 的访问地址是 `https://zuo-lihan.github.io/docs/editorial.html?doc=my-note`。

## 推荐模板

如果需要摘要、分类或标签，使用下面的模板。开头和结尾的 `---` 必须各自独占一行，元信息必须位于文件最前面。

```markdown
---
slug: my-note
title: My Research Note
eyebrow: Docs / LLM
summary: A concise description of the problem, method, and main result.
tags: LLM, Inference, Experiments
---

## Overview

本文的研究问题与适用范围。

## Environment

- Software version
- Hardware configuration
- Dataset or benchmark

## Method

关键步骤与实现细节。

## Results

结果、指标、误差或限制。

## References

- [原始论文或官方文档](https://example.com/)
```

### 元信息要求

| 字段 | 是否必填 | 用途与格式 |
| --- | --- | --- |
| slug | 否 | 链接中的文档标识；默认使用文件名，必须唯一，不能包含空格或斜线 |
| title | 否 | Docs 卡片和文档页标题；默认取第一个一级标题，再回退到文件名 |
| eyebrow | 否 | 分类说明，例如 Docs / LLM |
| summary | 否 | 文档标题下的简短摘要；保持单行 |
| tags | 否 | 英文逗号分隔，例如 LLM, Inference；首页最多展示前三个 |

当前元信息使用简单的单行 `key: value` 格式。不要添加 YAML 数组、嵌套对象、多行字符串或包裹整行值的引号。标签请写成 `tags: LLM, Inference`，不要写成 `tags: [LLM, Inference]`。

已有文档的 `slug` 尽量保持不变，否则原先分享出去的链接会失效。同一个 `slug` 出现在两篇文档中时，构建会报错，避免误打开另一篇文档。

设置了 `title` 后，正文可直接从二级标题 `## Overview` 开始，避免在页面上重复显示同一个大标题。

## 正文语法

### 标题与段落

支持一级至六级标题，即 `#` 到 `######`。`#` 后面要有空格。通常用 `##` 划分章节，用 `###` 划分小节。

段落之间留一个空行。普通的单次换行会合并到同一段落中。

```markdown
## Method

第一段内容。

第二段内容，支持 **加粗**、*斜体* 和 `inline code`。
```

### 列表与引用

列表建议只用一级，避免依赖当前渲染器没有实现的多级缩进。引用的每一行都使用 `> ` 开头。

```markdown
- 第一项
- 第二项

1. 第一步
2. 第二步

> 需要特别注意的实验假设或限制。
```

### 代码块

使用三个反引号开始和结束代码块，分别独占一行。开始处可以紧接语言名称，如 `python`、`bash`、`json` 或 `text`。页面会保留缩进并展示语言标签。

```python
def inference(model, inputs):
    return model.generate(**inputs)
```

不要在同一个代码块中再嵌套三个反引号，也不要依赖额外的语法高亮插件。

### 表格

表头后需要一行由短横线组成的分隔行。各行以竖线分隔单元格。

```markdown
| Method | Latency | Accuracy |
| --- | --- | --- |
| Baseline | 120 ms | 85% |
| Proposed | 90 ms | 87% |
```

### 链接与正文图片

外部资料使用完整的 `https://` 地址。引用本站另一篇文档时，也建议使用完整的文档访问地址。

```markdown
[GitHub Docs](https://docs.github.com/)

[本站的测试文档](https://zuo-lihan.github.io/docs/editorial.html?doc=test)

![实验结果示意](imgs/experiment-result.png)
```

正文图片也放在 `docs/markdown/imgs/`。图片语法中的路径相对 Markdown 文件，因此写 `imgs/experiment-result.png`，不要写本机绝对路径。正文插图的文件名不需要与 Markdown 同名。

目前支持标题、段落、加粗、斜体、行内代码、代码块、一级列表、引用、表格、链接和图片。数学公式、Mermaid、脚注和任务清单不在当前支持范围内；原始 HTML 会作为文字显示，不会执行。

## 自动背景图

背景图片放在 `docs/markdown/imgs/`，文件名与 Markdown 文件名相同，仅扩展名不同，不需要额外填写背景字段。

```text
docs/markdown/my-note.md
docs/markdown/imgs/my-note.webp
```

支持 AVIF、WebP、JPG、JPEG、PNG。建议一篇文档只保留一张同名背景图；如果存在多种格式，按 AVIF、WebP、JPG、JPEG、PNG 的顺序选择。

背景是按 Markdown 的文件名匹配，不是按 `slug` 匹配。例如 `my-note.md` 即使设置了 `slug: inference`，背景仍然命名为 `my-note.webp`。

没有同名图片，或图片无法加载时，显示默认浅色背景板。替换或删除背景图后提交，也会触发自动部署。

建议背景图避免密集文字，保持主体清楚，并在上传前适当压缩。背景只作视觉衬托，重要图表应放在正文中展示。

## 在 GitHub 网页编辑与发布

1. 打开仓库的 `master` 分支，进入 `docs/markdown/`。
2. 编辑已有文档时，打开对应 `.md` 文件，点击铅笔图标，在 Edit 中写作、Preview 中检查内容。
3. 新建时选择 Add file → Create new file；已有本地文件时选择 Add file → Upload files。
4. 背景图或正文图片进入 `docs/markdown/imgs/` 上传，注意文件名大小写。
5. 点击 Commit changes。直接提交到 `master` 会发布；如果新建了分支，需要先合并到 `master`。
6. 进入仓库 Actions，等待 Build and deploy academic website 的 build、deploy 都成功。
7. 打开首页 Docs 和对应文档，核对标题、正文、背景，以及 Back to Docs 是否正确返回。

GitHub 网页中的 Preview 只预览 Markdown 本身，不显示本站专用布局或自动背景。自动构建完成后，个人主页才会展示新版本。

## 发布前检查

- 正文在根目录的 `docs/markdown/`，不是实验用的 `preview/`。
- 文件以 `.md` 结尾，标题和链接标识正确。
- `slug` 没有重复，旧文档没有无意修改链接标识。
- 图片已经上传，引用路径与文件名一致。
- 元信息是单行格式，正文代码块已闭合。
- 不手动维护 docs-manifest.json、docs-data.js 或首页 Docs 卡片。
- 不上传密码、访问 Token、内部数据或包含敏感信息的截图。
- Actions 的 build 和 deploy 均成功后，再确认页面已经更新。
