(() => {
  const slot = document.querySelector('[data-visitor-widget]');
  if (!slot || slot.dataset.visitorStarted) return;
  slot.dataset.visitorStarted = 'true';
  const assetBase = new URL('.', document.currentScript.src);
  const status = slot.querySelector('.visitor-status');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const review = local && new URLSearchParams(location.search).get('visitor-review') === '1';
  function message(en, zh) {
    status.hidden = false;
    status.dataset.i18nEn = en;
    status.dataset.i18nZh = zh;
    status.textContent = document.documentElement.lang === 'zh-CN' ? zh : en;
  }
  if (!review && (location.hostname !== 'zuo-lihan.github.io' || location.pathname.startsWith('/preview/'))) {
    message('Visitor statistics are disabled in local and review previews.', '\u672c\u5730\u9884\u89c8\u9ed8\u8ba4\u4e0d\u8bb0\u5f55\u8bbf\u95ee\u6570\u636e\u3002');
    return;
  }

  // Isolate the provider's global styles and legacy lifecycle from the homepage.
  const frame = document.createElement('iframe');
  frame.className = 'visitor-widget-frame';
  frame.title = 'MapMyVisitors visitor geography';
  frame.loading = 'eager';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  const kind = 'map';
  let timer;
  function load() {
    slot.dataset.visitorWidget = kind;
    const url = new URL('visitor-widget.html', assetBase);
    url.searchParams.set('kind', kind);
    if (review) url.searchParams.set('review', '1');
    frame.src = url.href;
    clearTimeout(timer);
    timer = setTimeout(() => {
      message('Visitor data is unavailable. Please check your network or content blocker.', '\u8bbf\u5ba2\u6570\u636e\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u5185\u5bb9\u62e6\u622a\u8bbe\u7f6e\u3002');
    }, 20000);
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.kind !== kind) return;
    if (event.data.type === 'visitor-ready') {
      clearTimeout(timer);
      status.hidden = true;
      const href = new URL(event.data.href, 'https://mapmyvisitors.com/');
      if (href.protocol === 'https:' && href.hostname === 'mapmyvisitors.com' && href.pathname.startsWith('/web/')) {
        const link = document.querySelector('.visitor-stats-link');
        link.href = href.href;
        link.dataset.i18nEn = 'Visitor statistics \u2197';
        link.dataset.i18nZh = '\u67e5\u770b\u8bbf\u5ba2\u7edf\u8ba1 \u2197';
        link.textContent = document.documentElement.lang === 'zh-CN' ? link.dataset.i18nZh : link.dataset.i18nEn;
      }
    } else if (event.data.type === 'visitor-error') {
      clearTimeout(timer);
      message('Visitor data is unavailable. Please check your network or content blocker.', '\u8bbf\u5ba2\u6570\u636e\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\u3002');
    }
  });
  new ResizeObserver(entries => {
    slot.style.setProperty('--visitor-scale', Math.min(1, entries[0].contentRect.width / 400));
  }).observe(slot);
  slot.append(frame);
  load();
})();
