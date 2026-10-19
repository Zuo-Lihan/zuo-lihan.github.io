(() => {
  const slot = document.querySelector('.profile-companion');
  if (!slot) return;
  const source = new URL('./walle-scene.js?v=20261020', document.currentScript.src);
  let started = false;
  const observer = new IntersectionObserver(async entries => {
    if (started || !entries[0].isIntersecting) return;
    started = true;
    observer.disconnect();
    try {
      const {mountWalle} = await import(source.href);
      mountWalle(slot);
    } catch (error) {
      // A failed GPU must not affect the profile or its links.
      slot.hidden = true;
      console.warn('WALL-E companion unavailable:', error.message);
    }
  }, {rootMargin: '120px'});
  observer.observe(slot);
})();
