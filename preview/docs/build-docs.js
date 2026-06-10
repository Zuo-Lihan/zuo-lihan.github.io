#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const docsRoot = __dirname;
const markdownRoot = path.join(docsRoot, "markdown");
const manifestPath = path.join(docsRoot, "docs-manifest.json");
const dataPath = path.join(docsRoot, "docs-data.js");

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) return {};
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return {};
  const meta = {};
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

function buildDocs() {
  const files = fs.readdirSync(markdownRoot)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  const docs = files.map((file) => {
    const markdown = fs.readFileSync(path.join(markdownRoot, file), "utf8");
    const meta = parseFrontMatter(markdown);
    const slug = meta.slug || path.basename(file, ".md");
    return {
      slug,
      title: meta.title || slug,
      eyebrow: meta.eyebrow || "Docs",
      summary: meta.summary || "",
      image: meta.image || "",
      tags: meta.tags || [],
      sourceLabel: meta.sourceLabel || "",
      sourceHref: meta.sourceHref || "",
      markdown: `markdown/${file}`,
      url: `docs/view.html?doc=${encodeURIComponent(slug)}`,
      content: markdown
    };
  });

  const manifest = docs.map(({ content, ...doc }) => doc);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    dataPath,
    `window.LIHAN_DOCS = ${JSON.stringify(docs, null, 2)};\n`
  );
  return docs;
}

if (require.main === module) {
  buildDocs();
}

module.exports = { buildDocs, parseFrontMatter };
