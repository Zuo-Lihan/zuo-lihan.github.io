(() => {
  const header = document.querySelector('.masthead');
  const stage = document.querySelector('.ocean-runway');
  const sea = document.querySelector('.ocean-image');
  const copy = document.querySelector('.hero-copy');
  const underwater = document.querySelector('.underwater-image');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let stageHeight = stage.offsetHeight;
  function paintScroll() {
    frame = 0;
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 60);
    if (reduced.matches) {
      sea.style.transform = '';
      copy.style.transform = '';
      copy.style.opacity = '';
      underwater.style.opacity = '0';
      return;
    }
    const progress = Math.min(1, y / stageHeight);
    sea.style.transform = `translate3d(0,${-progress * 90}px,0) scale(${1 + progress * .065})`;
    copy.style.transform = `translate3d(0,${-progress * 85}px,0)`;
    copy.style.opacity = String(Math.max(0, 1 - progress * 1.65));
    underwater.style.opacity = String(Math.min(1, Math.max(0, (progress - .04) * 2.8)));
    underwater.style.transform = `translate3d(0,${-progress * 40}px,0)`;
  }
  function requestPaint() { if (!frame) frame = requestAnimationFrame(paintScroll); }
  window.addEventListener('scroll', requestPaint, {passive:true});
  window.addEventListener('resize', () => {stageHeight = stage.offsetHeight;requestPaint();});
  reduced.addEventListener('change', requestPaint);
  paintScroll();
  const links = [...document.querySelectorAll('.masthead nav a')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) links.forEach(link => {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      });
    });
  }, {rootMargin:'-15% 0px -55% 0px'});
  document.querySelectorAll('main section').forEach(section => observer.observe(section));
  const menu = document.getElementById('menuToggle');
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', header.classList.toggle('menu-open')));
  links.forEach(link => link.addEventListener('click', () => {header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');}));
  document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.target)?.scrollIntoView()));
  function initGlassCards() {
    const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
    const cards = document.querySelectorAll('.profile-card,.research-card,.paper-card,.project-card,.doc-card,.contact-card');
    cards.forEach(card => {
      card.classList.add('interactive-glass');
      const light = document.createElement('span');
      light.className = 'glass-light';
      light.setAttribute('aria-hidden','true');
      card.append(light);
      let glassFrame = 0;
      const reset = () => {
        cancelAnimationFrame(glassFrame);
        card.classList.remove('is-tracking');
        card.style.setProperty('--glass-rx','0deg');
        card.style.setProperty('--glass-ry','0deg');
        card.style.setProperty('--glass-light','0');
      };
      card.addEventListener('pointermove', event => {
        if (!finePointer.matches || reduced.matches) return;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
        const y = Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
        cancelAnimationFrame(glassFrame);
        glassFrame = requestAnimationFrame(() => {
          card.classList.add('is-tracking');
          card.style.setProperty('--glass-x',`${(x*100).toFixed(1)}%`);
          card.style.setProperty('--glass-y',`${(y*100).toFixed(1)}%`);
          card.style.setProperty('--glass-rx',`${((.5-y)*3.4).toFixed(2)}deg`);
          card.style.setProperty('--glass-ry',`${((x-.5)*4.2).toFixed(2)}deg`);
          card.style.setProperty('--glass-light','.82');
        });
      },{passive:true});
      card.addEventListener('pointerleave',reset,{passive:true});
      card.addEventListener('blur',reset,true);
    });
  }
  initGlassCards();
  const language = document.getElementById('langToggle');
  function linkInstitutions() {
    const lead = document.querySelector('.hero-lead');
    const text = lead.textContent;
    const destinations = {'Southwest Jiaotong University (SWJTU)':'https://en.swjtu.edu.cn/','西南交通大学(SWJTU)':'https://en.swjtu.edu.cn/',ISTD:'https://www.sutd.edu.sg/istd/',SUTD:'https://www.sutd.edu.sg/'};
    lead.replaceChildren();
    text.split(/(Southwest Jiaotong University \(SWJTU\)|西南交通大学\(SWJTU\)|ISTD|SUTD)/).forEach(part=>{
      if (!destinations[part]) {lead.append(document.createTextNode(part));return;}
      const a=document.createElement('a');a.textContent=part;a.href=destinations[part];a.target='_blank';a.rel='noreferrer';lead.append(a);
    });
  }
  linkInstitutions();
  language.addEventListener('click', () => {
    const zh = document.body.dataset.lang !== 'zh';
    document.body.dataset.lang = zh ? 'zh' : 'en';
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    language.textContent = zh ? 'EN' : '中文';
    document.querySelectorAll('[data-i18n-en]').forEach(node => {node.textContent = node.dataset[zh ? 'i18nZh' : 'i18nEn'] || node.dataset.i18nEn;});
    linkInstitutions();
  });
  const dialog = document.getElementById('detailDialog');
  const body = document.getElementById('detailBody');
  let opener;
  function openDetail(data, source) {
    opener = source;
    const zh = document.body.dataset.lang === 'zh';
    document.getElementById('detailTitle').textContent = zh ? data.zhTitle : data.title;
    document.getElementById('detailKicker').textContent = data.kicker;
    body.replaceChildren();
    (zh ? data.zhBody : data.body).forEach(text => {const p = document.createElement('p');p.textContent=text;body.append(p);});
    if (data.links) {
      const list = document.createElement('div');list.className='detail-links';
      data.links.forEach(item => {const a=document.createElement('a');a.href=item.href;a.target='_blank';a.rel='noreferrer';a.textContent=(zh?item.zhLabel:item.label)+' ↗';list.append(a);});body.append(list);
    }
    dialog.showModal();
  }
  document.querySelectorAll('[data-research],[data-project]').forEach(card => {
    const open = () => openDetail(card.dataset.research ? researchData[card.dataset.research] : projectData[card.dataset.project],card);
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
  document.getElementById('portraitButton').addEventListener('click', e => {
    openDetail({title:'Lihan Zuo',zhTitle:'左力晗',kicker:'Portrait',body:[],zhBody:[]},e.currentTarget);
    const image=new Image();image.src='assets/notion-profile.jpg';image.alt='Lihan Zuo';image.className='portrait-full';body.append(image);
  });
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>opener?.focus());
  document.querySelectorAll('.paper-toggle').forEach(button=>{
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',()=>button.setAttribute('aria-expanded',button.closest('.paper-card').classList.toggle('open')));
  });
  document.getElementById('copyEmail').addEventListener('click',async e=>{
    try {await navigator.clipboard.writeText('zuolihanstudy@gmail.com');e.target.textContent=document.body.dataset.lang==='zh'?'已复制':'Copied';}
    catch {location.href='mailto:zuolihanstudy@gmail.com';}
  });
})();
