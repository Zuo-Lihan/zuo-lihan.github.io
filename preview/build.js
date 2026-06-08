#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = __dirname;
const indexPath = path.join(root, "index.html");
const sectionNames = ["hero", "research", "publications", "projects", "profile", "contact"];

function indent(text, spaces) {
  const prefix = " ".repeat(spaces);
  return text
    .trim()
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}

const sections = sectionNames.map((name) => {
  const sectionPath = path.join(root, "sections", `${name}.html`);
  return indent(fs.readFileSync(sectionPath, "utf8"), 6);
});

let html = fs.readFileSync(indexPath, "utf8");
const main = [
  '    <main id="sectionMount">',
  "      <!-- Generated from preview/sections/*.html. Run `node preview/build.js` after editing section files. -->",
  sections.join("\n\n"),
  "    </main>"
].join("\n");

html = html.replace(/    <main id="sectionMount">[\s\S]*?^    <\/main>/m, main);
fs.writeFileSync(indexPath, html);
