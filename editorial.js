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
  function initTextWaves() {
    const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
    const controllers = [...document.querySelectorAll('[data-wave-text]')].map(root => {
      let units = [];
      let animation = 0;
      let previousTime = 0;
      let inside = false;
      let dirty = true;
      let pointerX = 0;
      let pointerY = 0;
      let amplitude = 4;
      const enabled = () => finePointer.matches && !reduced.matches;
      function stop() {
        if (!inside && !animation) return;
        inside = false;
        cancelAnimationFrame(animation);
        animation = 0;
        previousTime = 0;
        units.forEach(unit => {
          unit.y = unit.rotation = unit.light = 0;
          unit.node.removeAttribute('style');
        });
      }
      function refresh() {
        stop();
        root.querySelectorAll('.wave-word,.wave-unit').forEach(node => node.replaceWith(...node.childNodes));
        root.normalize();
        units = [];
        dirty = true;
        if (!enabled()) return;
        const source = root.querySelector('[data-bio-lang]:not([hidden])') || root;
        const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
        }
        const letters = root.dataset.waveText === 'letters';
        const locale = source.lang || document.documentElement.lang;
        const segmenter = typeof Intl.Segmenter === 'function'
          ? new Intl.Segmenter(locale, {granularity: letters ? 'grapheme' : 'word'})
          : null;
        function unit(text) {
          const node = document.createElement('span');
          node.className = 'wave-unit';
          node.textContent = text;
          units.push({node, x: 0, top: 0, y: 0, rotation: 0, light: 0});
          return node;
        }
        textNodes.forEach(textNode => {
          const fragment = document.createDocumentFragment();
          const tokens = locale.startsWith('zh') && !letters && segmenter
            ? [...segmenter.segment(textNode.textContent)].map(part => part.segment)
            : textNode.textContent.match(/\s+|[^\s]+/gu);
          tokens.forEach(token => {
            if (!token.trim()) {fragment.append(document.createTextNode(token));return;}
            if (!letters) {fragment.append(unit(token));return;}
            const word = document.createElement('span');
            word.className = 'wave-word';
            const characters = segmenter ? [...segmenter.segment(token)].map(part => part.segment) : Array.from(token);
            characters.forEach(character => word.append(unit(character)));
            fragment.append(word);
          });
          textNode.replaceWith(fragment);
        });
        amplitude = Math.min(7, Math.max(3.5, parseFloat(getComputedStyle(root).fontSize) * .065));
      }
      function requestFrame() {
        if (!animation) animation = requestAnimationFrame(paint);
      }
      function paint(time) {
        animation = 0;
        const amount = 1 - Math.exp(-Math.min(32, previousTime ? time - previousTime : 16) / 65);
        previousTime = time;
        const rect = root.getBoundingClientRect();
        if (dirty) {
          // Cache word centers once; pointer frames only change paint transforms.
          units.forEach(unit => {
            const bounds = unit.node.getBoundingClientRect();
            unit.x = bounds.left - rect.left + bounds.width / 2;
            unit.top = bounds.top - rect.top + bounds.height / 2;
          });
          dirty = false;
        }
        const x = pointerX - rect.left;
        const y = pointerY - rect.top;
        let settling = false;
        units.forEach(unit => {
          const dx = unit.x - x;
          const dy = unit.top - y;
          const distance = (dx / 150) ** 2 + (dy / 58) ** 2;
          const influence = inside && distance < 4 ? Math.exp(-distance * 1.8) : 0;
          const phase = dx / 32 + dy / 85;
          const targetY = Math.sin(phase) * amplitude * influence;
          const targetRotation = Math.cos(phase) * .6 * influence;
          const targetLight = influence * .65;
          const before = unit.y || unit.rotation || unit.light;
          unit.y += (targetY - unit.y) * amount;
          unit.rotation += (targetRotation - unit.rotation) * amount;
          unit.light += (targetLight - unit.light) * amount;
          if (Math.abs(targetY - unit.y) < .015) unit.y = targetY;else settling = true;
          if (Math.abs(targetRotation - unit.rotation) < .015) unit.rotation = targetRotation;else settling = true;
          if (Math.abs(targetLight - unit.light) < .003) unit.light = targetLight;else settling = true;
          if (!before && !unit.y && !unit.rotation && !unit.light) return;
          if (!unit.y && !unit.rotation && !unit.light) {unit.node.removeAttribute('style');return;}
          unit.node.style.transform = `translateY(${unit.y.toFixed(2)}px) rotate(${unit.rotation.toFixed(2)}deg)`;
          unit.node.style.color = `rgb(${Math.round(25 + unit.light * 27)},${Math.round(46 + unit.light * 44)},${Math.round(66 + unit.light * 57)})`;
        });
        if (settling) requestFrame();else previousTime = 0;
      }
      root.addEventListener('pointerenter', () => {dirty = true;}, {passive: true});
      root.addEventListener('pointermove', event => {
        if (!enabled() || event.pointerType !== 'mouse' || event.buttons || window.getSelection()?.isCollapsed === false) {stop();return;}
        inside = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        requestFrame();
      }, {passive: true});
      root.addEventListener('pointerleave', () => {if (inside) {inside = false;requestFrame();}}, {passive: true});
      root.addEventListener('pointerdown', stop, {passive: true});
      new ResizeObserver(() => {stop();dirty = true;}).observe(root);
      new IntersectionObserver(entries => {if (!entries[0].isIntersecting) stop();}).observe(root);
      window.addEventListener('scroll', stop, {passive: true});
      document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
      refresh();
      return {refresh};
    });
    const refresh = () => controllers.forEach(controller => controller.refresh());
    finePointer.addEventListener('change', refresh);
    reduced.addEventListener('change', refresh);
    return {refresh};
  }
  function setBiographyLanguage() {
    const current = document.body.dataset.lang || 'en';
    document.querySelectorAll('[data-bio-lang]').forEach(node => {node.hidden = node.dataset.bioLang !== current;});
  }
  setBiographyLanguage();
  const textWaves = initTextWaves();
  language.addEventListener('click', () => {
    const zh = document.body.dataset.lang !== 'zh';
    document.body.dataset.lang = zh ? 'zh' : 'en';
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    language.textContent = zh ? 'EN' : '中文';
    document.querySelectorAll('[data-i18n-en]').forEach(node => {node.textContent = node.dataset[zh ? 'i18nZh' : 'i18nEn'] || node.dataset.i18nEn;});
    setBiographyLanguage();
    textWaves.refresh();
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
