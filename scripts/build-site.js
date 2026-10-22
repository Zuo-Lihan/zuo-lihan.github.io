#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {buildDocs, updateDocsList} = require('../docs/build-docs');

const root = path.resolve(__dirname, '..');
const publicFiles = [
  '.nojekyll', 'index.html', 'editorial.html', 'editorial.css', 'editorial.js',
  'editorial-data.js', 'editorial-doc.css', 'research-companion.js', 'walle-scene.js',
  'sw.js', 'visitor-counter.js', 'visitor-widget.html', 'visitor-widget.js'
];
const publicDirectories = ['assets', 'img', 'vendor', 'docs'];

function buildSite(outputRoot = path.join(root, '_site')) {
  outputRoot = path.resolve(outputRoot);
  if (outputRoot === root || !path.basename(outputRoot).startsWith('_site')) {
    throw new Error('The output must be a separate _site directory. Source files are never overwritten.');
  }
  fs.rmSync(outputRoot, {recursive: true, force: true});
  fs.mkdirSync(outputRoot, {recursive: true});
  for (const file of publicFiles) fs.copyFileSync(path.join(root, file), path.join(outputRoot, file));
  for (const directory of publicDirectories) {
    fs.cpSync(path.join(root, directory), path.join(outputRoot, directory), {
      recursive: true,
      filter: source => !fs.lstatSync(source).isSymbolicLink() && !['build-docs.js', '.DS_Store'].includes(path.basename(source))
    });
  }
  const docs = buildDocs({docsRoot: path.join(outputRoot, 'docs')});
  const indexPath = path.join(outputRoot, 'index.html');
  fs.writeFileSync(indexPath, updateDocsList(fs.readFileSync(indexPath, 'utf8'), docs));
  const pages = [indexPath, ...fs.readdirSync(path.join(outputRoot, 'docs')).filter(file => file.endsWith('.html')).map(file => path.join(outputRoot, 'docs', file))];
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8').replace(/\b(src|href)="([^"?:]+\.(?:js|css))(?:\?[^"\s]*)?"/g, (match, attribute, file) => {
      const asset = path.resolve(path.dirname(page), file);
      if (!asset.startsWith(outputRoot + path.sep) || !fs.existsSync(asset)) return match;
      const version = createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0, 12);
      return `${attribute}="${file}?v=${version}"`;
    });
    fs.writeFileSync(page, html);
  }
  console.log(`Built ${docs.length} documents into ${outputRoot}`);
  return {outputRoot, docs};
}

if (require.main === module) buildSite();
module.exports = {buildSite};
