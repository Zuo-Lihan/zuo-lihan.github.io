(function () {
  const root = document.getElementById("docRoot");
  const defaultSlug = document.body.dataset.docSlug || "tmux-nscc";
  const requestedSlug = new URLSearchParams(window.location.search).get("doc") || defaultSlug;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeHref(value) {
    const href = String(value || "").trim();
    if (/^(https?:|mailto:|#|\.{0,2}\/)/i.test(href)) return href;
    return "#";
  }

  function inlineMarkdown(text) {
    const linkTokens = [];
    let working = String(text).replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label, href) => {
      const token = `@@LINK_${linkTokens.length}@@`;
      linkTokens.push({
        label: escapeHtml(label),
        href: safeHref(href)
      });
      return token;
    });

    working = escapeHtml(working)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

    linkTokens.forEach((link, index) => {
      const external = /^https?:/i.test(link.href);
      const target = external ? ' target="_blank" rel="noreferrer"' : "";
      working = working.replaceAll(
        `@@LINK_${index}@@`,
        `<a href="${escapeHtml(link.href)}"${target}>${link.label}</a>`
      );
    });

    return working;
  }

  function parseFrontMatter(markdown) {
    if (!markdown.startsWith("---\n")) {
      return { meta: {}, body: markdown };
    }
    const end = markdown.indexOf("\n---", 4);
    if (end === -1) {
      return { meta: {}, body: markdown };
    }
    const meta = {};
    const rawMeta = markdown.slice(4, end).trim();
    rawMeta.split(/\n/).forEach((line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) return;
      const [, key, value] = match;
      if (key === "tags") {
        meta[key] = value.split(",").map((tag) => tag.trim()).filter(Boolean);
      } else {
        meta[key] = value.trim();
      }
    });
    return { meta, body: markdown.slice(end + 4).trim() };
  }

  function parseTable(lines, startIndex) {
    if (startIndex + 1 >= lines.length) return null;
    const head = lines[startIndex];
    const divider = lines[startIndex + 1];
    if (!/^\s*\|/.test(head) || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider)) {
      return null;
    }

    const rows = [];
    let index = startIndex + 2;
    while (index < lines.length && /^\s*\|/.test(lines[index])) {
      rows.push(lines[index]);
      index += 1;
    }

    function cells(line) {
      return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    }

    const headers = cells(head);
    const bodyRows = rows.map(cells);
    const html = [
      "<table>",
      "<thead><tr>",
      headers.map((header) => `<th>${inlineMarkdown(header)}</th>`).join(""),
      "</tr></thead>",
      "<tbody>",
      bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join(""),
      "</tbody>",
      "</table>"
    ].join("");
    return { html, nextIndex: index };
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let index = 0;
    let paragraph = [];
    let listType = null;
    let listItems = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listType) return;
      html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
      listType = null;
      listItems = [];
    }

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        index += 1;
        continue;
      }

      if (trimmed.startsWith("```")) {
        flushParagraph();
        flushList();
        const language = trimmed.slice(3).trim() || "text";
        const code = [];
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          code.push(lines[index]);
          index += 1;
        }
        html.push([
          '<div class="code-wrap">',
          `<div class="code-label"><span>${escapeHtml(language)}</span></div>`,
          `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`,
          "</div>"
        ].join(""));
        index += 1;
        continue;
      }

      const table = parseTable(lines, index);
      if (table) {
        flushParagraph();
        flushList();
        html.push(table.html);
        index = table.nextIndex;
        continue;
      }

      const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length;
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (trimmed.startsWith("> ")) {
        flushParagraph();
        flushList();
        const quote = [];
        while (index < lines.length && lines[index].trim().startsWith("> ")) {
          quote.push(lines[index].trim().slice(2));
          index += 1;
        }
        html.push(`<blockquote>${inlineMarkdown(quote.join(" "))}</blockquote>`);
        continue;
      }

      const unordered = trimmed.match(/^[-*]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        listItems.push((unordered || ordered)[1]);
        index += 1;
        continue;
      }

      flushList();
      paragraph.push(trimmed);
      index += 1;
    }

    flushParagraph();
    flushList();
    return html.join("\n");
  }

  function resolveRepoPath(pathname) {
    if (!pathname) return "";
    if (/^https?:/i.test(pathname)) return pathname;
    const prefix = location.pathname.includes("/preview/docs/") ? "../../" : "../";
    return `${prefix}${pathname.split("/").map(encodeURIComponent).join("/")}`;
  }

  function renderDoc(doc, markdown) {
    const { meta, body } = parseFrontMatter(markdown);
    const merged = { ...doc, ...meta };
    const tags = Array.isArray(merged.tags) ? merged.tags : [];
    const tagItems = tags.map((tag, index) => `<span class="tag ${index === 0 ? "cyan" : index === tags.length - 1 ? "gold" : ""}">${escapeHtml(tag)}</span>`).join("");
    document.title = `${merged.title || "Docs"} | Lihan Zuo Docs`;

    root.innerHTML = `
      <section class="doc-hero">
        <div>
          <div class="eyebrow">${escapeHtml(merged.eyebrow || "Docs")}</div>
          <h1>${escapeHtml(merged.title || "Untitled Document")}</h1>
          <p class="lead">${escapeHtml(merged.summary || "")}</p>
          ${tagItems ? `<div class="tag-panel"><span class="tag-label">Tag</span><div class="meta-row">${tagItems}</div></div>` : ""}
        </div>

        <aside class="hero-card">
          <img src="${escapeHtml(resolveRepoPath(merged.image))}" alt="${escapeHtml(merged.title || "Document image")}">
          <div class="mini">
            <h3>Markdown-rendered note</h3>
            <p>This document is loaded from a Markdown source file and rendered through the local docs package.</p>
          </div>
        </aside>
      </section>

      <section class="content-grid single-column">
        <article class="doc-content">${renderMarkdown(body)}</article>
      </section>
    `;
  }

  function renderError(error) {
    root.innerHTML = `
      <section class="doc-error">
        <div class="eyebrow">Docs</div>
        <h1>Document unavailable</h1>
        <p class="lead">${escapeHtml(error.message || "The requested document could not be loaded.")}</p>
        <a class="ghost-button" href="../index.html?section=docs">Back to Docs</a>
      </section>
    `;
  }

  async function boot() {
    try {
      let docs = Array.isArray(window.LIHAN_DOCS) ? window.LIHAN_DOCS : null;
      if (!docs) {
        const manifestResponse = await fetch("docs-manifest.json", { cache: "no-store" });
        if (!manifestResponse.ok) throw new Error("Could not load docs manifest.");
        docs = await manifestResponse.json();
      }
      const doc = docs.find((item) => item.slug === requestedSlug);
      if (!doc) throw new Error(`No document registered for "${requestedSlug}".`);
      if (doc.content) {
        renderDoc(doc, doc.content);
        return;
      }
      const markdownResponse = await fetch(doc.markdown, { cache: "no-store" });
      if (!markdownResponse.ok) throw new Error(`Could not load Markdown source for "${requestedSlug}".`);
      renderDoc(doc, await markdownResponse.text());
    } catch (error) {
      renderError(error);
    }
  }

  boot();
}());
