(function () {
  // Nav scrolled state — toggles when hero leaves viewport
  const nav  = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  if (nav && hero) {
    new IntersectionObserver(([e]) => {
      nav.classList.toggle('scrolled', !e.isIntersecting);
    }, { threshold: 0.05 }).observe(hero);
  }

  // Scroll reveal
  const targets = document.querySelectorAll('.reveal');
  if (targets.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 0.07 + 's';
      obs.observe(el);
    });
  }

  // Frame counter (if a HUD frame element exists)
  const fcEl = document.getElementById('frameCount');
  if (fcEl) {
    let fc = 0;
    setInterval(() => { fcEl.textContent = String(++fc).padStart(4, '0'); }, 33);
  }
})();
