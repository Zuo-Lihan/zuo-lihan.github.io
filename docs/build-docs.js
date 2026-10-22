#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {createHash} = require("node:crypto");

const imageExtensions = [".avif", ".webp", ".jpg", ".jpeg", ".png"];

function parseFrontMatter(markdown) {
  markdown = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!markdown.startsWith("---\n")) return {};
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return {};
  const meta = Object.create(null);
  markdown.slice(4, end).trim().split(/\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) return;
    const [, key, value] = match;
    if (key === "tags") {
      meta[key] = value.split(",").map((tag) => tag.trim()).filter(Boolean);
    } else {
      meta[key] = value.trim();
    }
  });
  return meta;
}

function collectDocs(docsRoot = __dirname) {
  const markdownRoot = path.join(docsRoot, "markdown");
  const imagesRoot = path.join(markdownRoot, "imgs");
  const images = fs.existsSync(imagesRoot)
    ? fs.readdirSync(imagesRoot, { withFileTypes: true }).filter((file) => file.isFile()).map((file) => file.name).sort()
    : [];
  const slugs = new Set();
  const files = fs.readdirSync(markdownRoot)
    .filter((file) => /\.md$/i.test(file) && fs.statSync(path.join(markdownRoot, file)).isFile())
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const markdown = fs.readFileSync(path.join(markdownRoot, file), "utf8");
    const meta = parseFrontMatter(markdown);
    const basename = file.replace(/\.md$/i, "");
    const slug = meta.slug || basename;
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(slug)) throw new Error(`Invalid document slug in ${file}: ${slug}`);
    if (slugs.has(slug)) throw new Error(`Duplicate document slug: ${slug}`);
    slugs.add(slug);
    const heading = markdown.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1];
    const backgroundFile = imageExtensions.flatMap((extension) => images.filter((image) => image.toLowerCase() === (basename + extension).toLowerCase()))[0];
    const backgroundVersion = backgroundFile ? createHash('sha256').update(fs.readFileSync(path.join(imagesRoot, backgroundFile))).digest('hex').slice(0, 12) : '';
    return {
      slug,
      title: meta.title || heading || basename,
      eyebrow: meta.eyebrow || "Docs",
      summary: meta.summary || "",
      image: backgroundFile ? `docs/markdown/imgs/${backgroundFile}` : meta.image || "",
      background: backgroundFile ? `markdown/imgs/${encodeURIComponent(backgroundFile)}?v=${backgroundVersion}` : "",
      tags: meta.tags || [],
      listed: meta.listed?.toLowerCase() !== "false",
      sourceLabel: meta.sourceLabel || "",
      sourceHref: meta.sourceHref || "",
      markdown: `markdown/${file}`,
      url: `docs/editorial.html?doc=${encodeURIComponent(slug)}`,
      content: markdown
    };
  });
}

function buildDocs({ docsRoot = __dirname } = {}) {
  const docs = collectDocs(docsRoot);
  const manifest = docs.map(({ content, ...doc }) => doc);
  fs.writeFileSync(path.join(docsRoot, "docs-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    path.join(docsRoot, "docs-data.js"),
    `window.LIHAN_DOCS = ${JSON.stringify(docs, null, 2)};\n`
  );
  return docs;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderDocsList(docs) {
  return docs.filter((doc) => doc.listed !== false).map((doc, index) => `
      <a class="doc-card" href="docs/editorial.html?doc=${encodeURIComponent(doc.slug)}" aria-label="Open ${escapeHtml(doc.title)}">
        <div>
          <div class="doc-index"><span>${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(doc.eyebrow)}</span></div>
          <h3>${escapeHtml(doc.title)}</h3>
        </div>
        <div class="card-footer">${doc.tags.slice(0, 3).map((tag, i) => `<span class="tag${i === 0 ? " gold" : i === 2 ? " cyan" : ""}">${escapeHtml(tag)}</span>`).join("")}</div>
      </a>`).join("\n");
}

function updateDocsList(html, docs) {
  const startPattern = /<div class="docs-layout" data-docs-list>/g;
  const start = startPattern.exec(html);
  if (!start) throw new Error("Homepage Docs list mount is missing.");
  // Count nested divs to replace only this list, preserving the surrounding page.
  const tags = /<div\b[^>]*>|<\/div\s*>/g;
  tags.lastIndex = startPattern.lastIndex;
  let depth = 1, tag;
  while ((tag = tags.exec(html))) {
    depth += /^<\/div/i.test(tag[0]) ? -1 : 1;
    if (depth === 0) {
      return html.slice(0, startPattern.lastIndex) + renderDocsList(docs) + "\n    " + html.slice(tag.index);
    }
  }
  throw new Error("Homepage Docs list has an unclosed div.");
}

if (require.main === module) {
  buildDocs();
}

module.exports = { buildDocs, collectDocs, parseFrontMatter, renderDocsList, updateDocsList };
