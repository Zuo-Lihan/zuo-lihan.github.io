const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {buildDocs, collectDocs, parseFrontMatter, updateDocsList} = require('../docs/build-docs');
const {buildSite} = require('../scripts/build-site');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lihan-docs-'));
  fs.mkdirSync(path.join(root, 'markdown', 'imgs'), {recursive:true});
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return root;
}

test('plain uploaded Markdown needs no metadata or manual catalog entry', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'markdown', 'test.md'), '# Test document\n\nAn uploaded note.');
  const [doc] = buildDocs({docsRoot:root});
  assert.equal(doc.slug, 'test');assert.equal(doc.title, 'Test document');assert.equal(doc.background, '');
  assert.equal(doc.url, 'docs/editorial.html?doc=test');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'docs-manifest.json')))[0].slug, 'test');
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'docs-data.js'), 'utf8'), context);
  assert.equal(context.window.LIHAN_DOCS[0].content, doc.content);
});

test('same-file-name background is independent of metadata slug; removal restores default', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'markdown', 'paper.md'), '---\nslug: custom-slug\ntitle: A paper\n---\n\n## Content');
  fs.writeFileSync(path.join(root, 'markdown', 'imgs', 'paper.JPG'), 'fixture');
  const original = collectDocs(root)[0].background;
  assert.match(original, /^markdown\/imgs\/paper\.JPG\?v=[a-f0-9]{12}$/);
  fs.writeFileSync(path.join(root, 'markdown', 'imgs', 'paper.JPG'), 'replacement');
  assert.notEqual(collectDocs(root)[0].background, original, 'Replacing an image also changes its cache key');
  fs.writeFileSync(path.join(root, 'markdown', 'imgs', 'paper.webp'), 'fixture');
  assert.match(collectDocs(root)[0].background, /^markdown\/imgs\/paper\.webp\?v=[a-f0-9]{12}$/);
  fs.rmSync(path.join(root, 'markdown', 'imgs', 'paper.webp'));
  fs.rmSync(path.join(root, 'markdown', 'imgs', 'paper.JPG'));
  assert.equal(collectDocs(root)[0].background, '');
});

test('front matter accepts Windows line endings and keeps metadata', () => {
  const meta = parseFrontMatter('\uFEFF---\r\ntitle: Note\r\ntags: LLM, Inference\r\n---\r\n## Body');
  assert.equal(meta.title, 'Note');assert.deepEqual(meta.tags, ['LLM', 'Inference']);
});

test('duplicate slugs fail the build instead of silently opening another document', t => {
  const root = fixture(t);
  for (const file of ['a', 'b']) fs.writeFileSync(path.join(root, 'markdown', file+'.md'), '---\nslug: duplicate\n---\n## Body');
  assert.throws(()=>collectDocs(root), /Duplicate document slug/);
});

test('catalog replacement escapes metadata and preserves all other sections', () => {
  const input = '<main><p>Before</p><div class="docs-layout" data-docs-list><a><div>old<div>nested</div></div></a></div><p>After</p></main>';
  const result = updateDocsList(input, [{slug:'test',title:'A <script> & "note"',eyebrow:'Docs',tags:['<tag>']}]);
  assert.ok(result.startsWith('<main><p>Before</p>'));
  assert.ok(result.endsWith('<p>After</p></main>'));
  assert.ok(!result.includes('<script>'));assert.ok(result.includes('&lt;script&gt;'));
  assert.equal((result.match(/class="doc-card"/g)||[]).length, 1);
  assert.throws(()=>updateDocsList('<main></main>', []), /mount is missing/);
});

test('unlisted documents keep their content and URLs but have no homepage card', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'markdown', 'guide.md'), '---\nlisted: false\n---\n# Guide');
  fs.writeFileSync(path.join(root, 'markdown', 'note.md'), '# Research note');
  const docs = buildDocs({docsRoot: root});
  assert.equal(docs.length, 2);
  assert.equal(docs.find(doc => doc.slug === 'guide').listed, false);
  assert.equal(docs.find(doc => doc.slug === 'note').listed, true);
  const catalog = updateDocsList('<div class="docs-layout" data-docs-list></div>', docs);
  assert.equal((catalog.match(/class="doc-card"/g) || []).length, 1);
  assert.ok(!catalog.includes('?doc=guide'));
  assert.ok(catalog.includes('?doc=note'));
  assert.ok(catalog.includes('<span>01</span>'));
  const data = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'docs-data.js'), 'utf8'), data);
  assert.ok(data.window.LIHAN_DOCS.find(doc => doc.slug === 'guide').content.includes('# Guide'));
  assert.ok(JSON.parse(fs.readFileSync(path.join(root, 'docs-manifest.json'))).find(doc => doc.slug === 'guide'));
});

test('production build generates all root Docs, correct return paths, and versioned assets without touching source', t => {
  const temp = fixture(t), target = path.join(temp, '_site');
  const root = path.resolve(__dirname, '..');
  const before = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sourceData = fs.readFileSync(path.join(root, 'docs/docs-data.js'), 'utf8');
  const {docs} = buildSite(target);
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), before);
  assert.equal(fs.readFileSync(path.join(root, 'docs/docs-data.js'), 'utf8'), sourceData);
  const html = fs.readFileSync(path.join(target, 'index.html'), 'utf8');
  assert.equal((html.match(/class="doc-card"/g)||[]).length, docs.filter(doc => doc.listed !== false).length);
  for (const doc of docs) assert.equal(html.includes(`?doc=${encodeURIComponent(doc.slug)}`), doc.listed !== false);
  const guide = docs.find(doc => doc.slug === 'markdown-guide');
  assert.ok(guide && guide.listed === false, 'Writing guide stays published but unlisted');
  const view = fs.readFileSync(path.join(target, 'docs/editorial.html'), 'utf8');
  assert.ok(view.includes('href="../index.html#docs"'));
  assert.ok(!view.includes('href="../editorial.html#docs"'));
  assert.match(view, /docs-data\.js\?v=[a-f0-9]{12}/);
  for (const excluded of ['output', '.git', '.github', 'README.md', 'preview', 'tests', 'docs/build-docs.js']) {
    assert.equal(fs.existsSync(path.join(target, excluded)), false, excluded+' must not be published');
  }
  assert.throws(()=>buildSite(root), /separate _site/);
});
