// A local review build reuses the site's section content and detail records.
const fs = require('fs');
const path = require('path');
const root = __dirname;
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const read = name => fs.readFileSync(path.join(root, 'sections', `${name}.html`), 'utf8');
const detailStart = source.indexOf('const projectData = {');
const detailEnd = source.indexOf('function currentLang()', detailStart);
if (detailStart < 0 || detailEnd < 0) throw new Error('Detail records not found');
let detailRecords = source.slice(detailStart, detailEnd);
detailRecords = detailRecords.replace(
  /          "medical-ai": \{[\s\S]*?\n          \},\n          llm:/,
  `          "llm-inference": {
            kicker: "Research / LLM Inference",
            title: "Efficient inference and deployment-oriented LLM systems",
            zhTitle: "高效推理与面向部署的大模型系统",
            body: [
              "This track focuses on the execution layer of large language model systems: inference efficiency, serving behavior, and deployment-oriented optimization.",
              "The goal is to make model inference faster, more observable, and more dependable under practical workload and resource constraints.",
              "Areas of interest include decoding efficiency, runtime profiling, throughput-latency tradeoffs, and production evaluation."
            ],
            zhBody: [
              "该方向聚焦大语言模型系统的执行层：推理效率、服务行为与面向部署的优化。",
              "目标是在实际负载与资源约束下，让模型推理更快、更可观测且更可靠。",
              "关注方向包括解码效率、运行时分析、吞吐与延迟权衡，以及生产环境评测。"
            ]
          },
          llm:`
);
fs.writeFileSync(path.join(root, 'editorial-data.js'), detailRecords);
const originalHero = read('hero');
let profile = originalHero.match(/<article class="profile-card"[\s\S]*?<\/article>/)[0];
let biography = originalHero.match(/<p class="lead hero-lead"[\s\S]*?<\/p>/)[0];
const profileReplacements = [
  ['AI researcher focused on medical multimodal systems.', 'AI researcher focused on LLM systems and efficient inference.'],
  ['关注医学多模态系统的 AI 研究者。', '聚焦大模型系统与高效推理的 AI 研究者。'],
  ['Published in Artificial Intelligence in Medicine, with research experience across A*STAR collaboration, SUTD, medical image analysis, and LLM systems.', 'Research and engineering experience across SUTD, A*STAR collaboration, LLM reliability, model inference, and deployment-oriented systems.'],
  ['已在 Artificial Intelligence in Medicine 发表论文，研究经历涵盖 A*STAR 合作、SUTD、医学影像分析与大语言模型系统。', '研究与工程经历涵盖 SUTD、A*STAR 合作、大模型可靠性、模型推理与面向部署的系统。'],
  ['Medical AI, multimodal learning, LLM reliability', 'Large language models, inference systems, model reliability'],
  ['医学 AI、多模态学习、大模型可靠性', '大语言模型、推理系统、模型可靠性']
];
for (const [from, to] of profileReplacements) profile = profile.split(from).join(to);
const biographyReplacements = [
  ['I earned my B.Eng. in Artificial Intelligence from Southwest Jiaotong University (SWJTU) in 2023, previously worked as a Visiting Researcher at ISTD, SUTD, and now work as an Algorithm Engineer at LexinFintech in Shenzhen.', 'I earned my B.Eng. in Artificial Intelligence from Southwest Jiaotong University (SWJTU) in 2023, conducted research as a Visiting Researcher at ISTD, SUTD, and worked as an Algorithm Engineer at LexinFintech in Shenzhen from June 2025 to August 2026.'],
  ['我于 2023 年获得西南交通大学(SWJTU)人工智能专业工学学士学位，曾在 SUTD ISTD 担任访问研究员，目前在深圳 LexinFintech 担任算法工程师。', '我于 2023 年获得西南交通大学（SWJTU）人工智能专业工学学士学位，曾在 SUTD ISTD 担任访问研究员，并于 2025 年 6 月至 2026 年 8 月在深圳 LexinFintech 担任算法工程师。']
];
for (const [from, to] of biographyReplacements) biography = biography.split(from).join(to);
const names = ['research', 'publications', 'projects', 'profile', 'docs', 'contact'];
const labels = ['Research', 'Publications', 'Projects', 'CV', 'Docs', 'Contact'];
let sections = names.map(read).join('\n');
const replacements = [
  ['Research systems as inspectable artifacts.', 'Selected projects.'],
  ['把研究系统做成可审查的作品。', '精选项目。'],
  ['Academic CV, stitched as a living timeline.', 'Experience & education.'],
  ['用时间线串起完整学术简历。', '经历与教育。'],
  ['Clear exits for collaborators and readers.', 'Let\u2019s stay in touch.'],
  ['为合作者和读者提供清晰入口。', '保持联系。'],
  ['2025.06 - Now', '2025.06 - 2026.08']
];
for (const [from, to] of replacements) sections = sections.split(from).join(to);
const researchReplacements = [
  ['Robust multimodal intelligence.', 'Reliable language intelligence.'],
  ['稳健多模态智能。', '面向可靠语言智能。'],
  ['Three research tracks: medical multimodal learning, reliable LLM workflows, and memory-aware language models.', 'Three research tracks: efficient LLM inference, reliable model workflows, and memory-aware language models.'],
  ['三个研究方向：医学多模态学习、可靠大模型工作流与具备记忆能力的语言模型。', '三个研究方向：高效大模型推理、可靠模型工作流与具备记忆能力的语言模型。'],
  ['data-research="medical-ai"', 'data-research="llm-inference"'],
  ['assets/research-medical-ai.svg', 'assets/ambient-llm-system.webp'],
  ['Multimodal medical AI fusion research visual', 'Large language model inference system visual'],
  ['01 / Medical AI', '01 / LLM Inference'],
  ['Adaptive multimodal fusion for skin lesion classification', 'Efficient inference and deployment-oriented LLM systems'],
  ['面向皮肤病灶分类的自适应多模态融合', '高效推理与面向部署的大模型系统'],
  ['Published work in Artificial Intelligence in Medicine on combining clinical images, dermoscopy images, and metadata for multi-label skin lesion classification.', 'Exploring inference efficiency, serving behavior, and deployment-aware optimization for practical large language model systems.'],
  ['已在 Artificial Intelligence in Medicine 发表相关工作，研究如何融合临床图像、皮肤镜图像与元数据用于多标签皮肤病灶分类。', '探索面向实际大模型系统的推理效率、服务行为与部署优化。'],
  ['<span class="tag cyan">AIIM 2025</span>', '<span class="tag cyan">Inference</span>'],
  ['<span class="tag">CosCatNet</span>', '<span class="tag">Serving</span>'],
  ['<span class="tag magenta">Medical Imaging</span>', '<span class="tag magenta">Efficiency</span>']
];
for (const [from, to] of researchReplacements) sections = sections.split(from).join(to);
sections = sections.replace('docs/view.html?doc=', 'docs/editorial.html?doc=');
sections = sections.replace('../img/AI 1.jpg', 'assets/research-medical-ai.svg');
const docHtml = fs.readFileSync(path.join(root, 'docs/view.html'), 'utf8')
  .replaceAll('../index.html?section=docs', '../editorial.html#docs')
  .replace('docs-renderer.js', 'editorial-renderer.js')
  .replace('</head>', '<link rel="stylesheet" href="../editorial-doc.css"></head>');
fs.writeFileSync(path.join(root, 'docs/editorial.html'), docHtml);
fs.writeFileSync(path.join(root, 'docs/editorial-renderer.js'), fs.readFileSync(path.join(root, 'docs/docs-renderer.js'), 'utf8').replaceAll('../index.html?section=docs', '../editorial.html#docs'));
const footer = read('visitors');
fs.writeFileSync(path.join(root, 'editorial.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow"><meta name="theme-color" content="#edf2f6">
<title>Lihan Zuo — Research & Practice</title>
<link rel="preload" as="image" href="assets/editorial-ocean.jpg">
<link rel="stylesheet" href="editorial.css">
<script src="editorial-data.js" defer></script><script src="editorial.js" defer></script><script src="../visitor-counter.js" defer></script></head>
<body data-lang="en">
<a class="skip-link" href="#research">Skip to research</a>
<header class="masthead"><a class="wordmark" href="#hero" aria-label="Lihan Zuo home">Lihan Zuo<span>Research & Practice</span></a>
<nav aria-label="Main navigation">${names.map((id, i) => `<a href="#${id}">${labels[i]}</a>`).join('')}</nav>
<button id="langToggle" type="button" aria-label="Switch language">中文</button>
<button id="menuToggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button></header>
<main>
<section id="hero" class="ocean-runway" aria-label="Introduction">
<div class="ocean-stage"><img class="ocean-image" src="assets/editorial-ocean.jpg" width="1536" height="1024" alt="Gentle blue ocean waves beneath a silver-blue horizon" fetchpriority="high">
<img class="underwater-image" src="assets/editorial-underwater.jpg" width="1536" height="1024" alt="" decoding="async">
<div class="ocean-shade"></div><div class="hero-copy">
<p class="eyebrow" data-i18n-en="LLM RESEARCH · INFERENCE SYSTEMS" data-i18n-zh="大模型研究 · 推理系统">LLM RESEARCH · INFERENCE SYSTEMS</p>
<h1 data-i18n-en="Lihan Zuo" data-i18n-zh="左力晗">Lihan Zuo</h1>
<p class="hero-statement" data-i18n-en="Building capable models.\nMaking inference dependable." data-i18n-zh="构建更强的模型，\n让推理更可靠。">Building capable models.<br>Making inference dependable.</p>
<a class="text-link" href="#research" data-i18n-en="Explore my research ↗" data-i18n-zh="探索我的研究 ↗">Explore my research ↗</a>
</div><div class="hero-foot"><span>LLM systems / Inference / Reliability</span><a href="#overview" data-i18n-en="A closer look ↓" data-i18n-zh="进一步了解 ↓">A closer look ↓</a></div>
</div></section>
<section class="overview section" id="overview"><div class="section-inner"><div class="overview-heading"><span class="eyebrow" data-i18n-en="A little about me" data-i18n-zh="关于我">A little about me</span>${biography}</div>${profile}</div></section>
${sections}
</main>
${footer}
<div class="closing"><span>© ${new Date().getFullYear()} Lihan Zuo</span><span>Research, with perspective.</span><a href="#hero">Back to top ↑</a></div>
<dialog id="detailDialog" aria-labelledby="detailTitle"><button class="dialog-close" aria-label="Close detail">×</button><p class="eyebrow" id="detailKicker"></p><h2 id="detailTitle"></h2><div id="detailBody"></div></dialog>
<span class="sr-only" id="status" role="status"></span>
</body></html>`);
console.log('Local review: /preview/editorial.html');
