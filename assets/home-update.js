(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const collection = document.getElementById('project-collection');
  const windowEl = document.getElementById('collection-window');
  const additional = document.getElementById('additional-projects');
  const reveal = document.getElementById('collection-reveal');
  reveal.addEventListener('click', () => {
    windowEl.style.height = `${windowEl.offsetHeight}px`;
    collection.classList.add('expanded');
    additional.inert = false;
    reveal.setAttribute('aria-expanded', 'true');
    reveal.hidden = true;
    additional.querySelector('a').focus({ preventScroll: true });
    const finish = () => {
      windowEl.style.height = 'auto';
      window.dispatchEvent(new Event('resize'));
    };
    if (reducedMotion.matches) finish();
    else requestAnimationFrame(() => {
      windowEl.style.height = `${windowEl.scrollHeight}px`;
      windowEl.addEventListener('transitionend', finish, { once: true });
      // Finish even when the browser suppresses transitions (e.g. a hidden tab).
      setTimeout(finish, 750);
    });
  });

  const descriptions = {
    spheres: ['Spherical Robot Swarm @ CML', 'I’m designing and prototyping spherical robots at Creative Machines Lab, integrating motorized drivetrains, embedded control, and sensing. I’m also developing an Isaac Sim digital twin with compliant shell dynamics for reinforcement learning and coordinated swarm behavior.'],
    legged: ['Quadruped & Bipedal Robots', 'I’m working on quadruped and bipedal robots in collaboration with Rutgers and Caltech.'],
    humanoid: ['Compact Humanoid Animatronic', 'I’m working on a compact humanoid animatronic.'],
    friction: ['Motor Joint Friction in Microgravity', 'I’m measuring the CCSV model of motor joint friction dynamics in microgravity: Coulomb, Static, Stribeck, and Viscous friction.']
  };
  const dialog = document.getElementById('current-dialog');
  const track = document.getElementById('current-track');
  const region = document.getElementById('live');
  const pause = document.getElementById('current-pause');
  let trigger;
  let paused = reducedMotion.matches;
  let visible = false;
  const updatePause = () => {
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} current project carousel`);
  };
  updatePause();
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  reducedMotion.addEventListener('change', event => { paused = event.matches; updatePause(); });
  const move = direction => {
    const step = track.querySelector('.current-card').offsetWidth + 16;
    const max = track.scrollWidth - track.clientWidth;
    const target = direction > 0
      ? (track.scrollLeft >= max - 2 ? 0 : Math.min(max, track.scrollLeft + step))
      : (track.scrollLeft <= 2 ? max : Math.max(0, track.scrollLeft - step));
    track.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  document.getElementById('current-prev').addEventListener('click', () => move(-1));
  document.getElementById('current-next').addEventListener('click', () => move(1));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .2 }).observe(region);
  setInterval(() => {
    if (visible && !paused && !document.hidden && !dialog.open && !region.matches(':hover, :focus-within')) move(1);
  }, 4500);
  track.addEventListener('click', event => {
    const card = event.target.closest('[data-current]');
    if (!card) return;
    trigger = card;
    const [title, description] = descriptions[card.dataset.current];
    document.getElementById('current-dialog-title').textContent = title;
    document.getElementById('current-dialog-description').textContent = description;
    document.body.classList.add('project-dialog-open');
    dialog.showModal();
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('project-dialog-open');
    trigger?.focus({ preventScroll: true });
  });
})();
