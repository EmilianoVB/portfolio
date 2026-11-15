const slides = [{"title": "Tendon routing and actuator kinematics", "text": "Two tendons are anchored in the fingertip segment and routed past the distal and proximal revolute joints to external winding drums in the forearm. The slide relates tendon displacement and winding-drum angles to the two joint angles, then gives the special case of equal tendon moment arms."}, {"title": "Tendon Jacobian and joint torque", "text": "The same finger and tendon routing diagram accompanies the actuator-to-joint angle mapping. The slide shows a rank-one tendon Jacobian and expresses each joint torque as the sum of direct servo torque and the torque due to the difference in tendon tensions."}];
(() => {
  const viewer = document.querySelector('.slide-viewer');
  const image = document.getElementById('review-slide');
  const select = document.getElementById('slide-select');
  const previous = document.getElementById('slide-prev');
  const next = document.getElementById('slide-next');
  let index = 0;
  slides.forEach((slide, i) => select.add(new Option(`${i + 1} / ${slides.length} · ${slide.title}`, i)));
  function show(value) {
    index = Math.max(0, Math.min(slides.length - 1, value));
    image.src = `slides/slide-${String(index + 1).padStart(2, '0')}.webp`;
    image.alt = `Slide ${index + 1}: ${slides[index].title}`;
    select.value = index;
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    document.getElementById('slide-text').textContent = slides[index].text;
    document.getElementById('slide-status').textContent = `Slide ${index + 1} of ${slides.length}: ${slides[index].title}`;
    if (index + 1 < slides.length) {
      const preload = new Image();
      preload.src = `slides/slide-${String(index + 2).padStart(2, '0')}.webp`;
    }
  }
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  select.addEventListener('change', () => show(Number(select.value)));
  viewer.addEventListener('keydown', event => {
    if (event.target === select) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  show(0);
  document.querySelector('.slide-controls').hidden = false;
})();
