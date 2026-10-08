(() => {
  const params = new URLSearchParams(location.search);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (location.hostname !== 'zuo-lihan.github.io' && !(local && params.get('review') === '1')) return;
  if (window === parent) return;
  const kind = 'map';
  const config = {id: 'mapmyvisitors', src: 'https://mapmyvisitors.com/map.js?d=URtgt4pcWftUoaWi4qeXOWetexS5a5I3xr09IjAhat8&cl=ffffff&w=a'};
  const widget = document.getElementById('widget');
  let ready = false;
  function report(type, href) {
    parent.postMessage({type, kind, href}, location.origin);
  }
  const observer = new MutationObserver(() => {
    const link = widget.querySelector('#mapmyvisitors-widget');
    if (!ready && link && new URL(link.href).pathname.startsWith('/web/')) {
      ready = true;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      report('visitor-ready', link.href.replace(/^http:/, 'https:'));
      observer.disconnect();
    }
  });
  observer.observe(widget, {childList: true, subtree: true, attributes: true, attributeFilter: ['href']});
  const script = document.createElement('script');
  script.id = config.id;
  script.src = config.src;
  script.async = true;
  script.onerror = () => { observer.disconnect(); report('visitor-error'); };
  widget.append(script);
})();
