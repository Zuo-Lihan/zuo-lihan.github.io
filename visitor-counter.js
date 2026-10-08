(() => {
  const shell = document.querySelector('[data-visitor-id]');
  if (!shell || shell.dataset.visitorStarted) return;
  shell.dataset.visitorStarted = 'true';
  const status = shell.querySelector('.visitor-status');
  function message(en, zh) {
    status.dataset.i18nEn = en;
    status.dataset.i18nZh = zh;
    status.textContent = document.documentElement.lang === 'zh-CN' ? zh : en;
  }

  // A preview must never write test traffic into the production counter.
  if (location.hostname !== 'zuo-lihan.github.io' || location.pathname.startsWith('/preview/')) {
    message('Visitor statistics are disabled in local and review previews.', '\u672c\u5730\u53ca\u5ba1\u67e5\u9884\u89c8\u4e0d\u8bb0\u5f55\u8bbf\u95ee\u6570\u636e\u3002');
    return;
  }

  const failed = () => message('Statistics unavailable. Check the country statistics link or your content blocker.', '\u7edf\u8ba1\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\uff0c\u8bf7\u67e5\u770b\u56fd\u5bb6\u7edf\u8ba1\u94fe\u63a5\u6216\u68c0\u67e5\u5185\u5bb9\u62e6\u622a\u8bbe\u7f6e\u3002');
  const timeout = setTimeout(failed, 15000);
  const observer = new MutationObserver(() => {
    if (!shell.querySelector('[title="Flag Counter"]')) return;
    clearTimeout(timeout);
    status.hidden = true;
    observer.disconnect();
  });
  observer.observe(shell, {childList: true});

  // The official widget records immediately when loaded, without scroll or click.
  const script = document.createElement('script');
  script.src = 'https://widget.supercounters.com/ssl/flag.js';
  script.async = true;
  script.onerror = () => { clearTimeout(timeout); failed(); observer.disconnect(); };
  script.onload = () => {
    if (typeof window.sc_flag !== 'function') {
      clearTimeout(timeout);
      failed();
      observer.disconnect();
      return;
    }
    const columns = matchMedia('(min-width: 900px)').matches ? 3 : 2;
    window.sc_flag(Number(shell.dataset.visitorId), 'F7F9FC', '253F53', 'D9E3EB', columns, 100, 0, 0);
  };
  shell.append(script);
})();
