(() => {
  const featured = document.getElementById('featured-projects');
  const additional = document.getElementById('additional-projects');
  const focus = document.querySelector('.project-focus');
  const cards = new Map(Array.from(document.querySelectorAll('[data-project]'), card => [card.dataset.project, card]));
  const order = ['vision-arm', 'rover-twin', 'teleop-arms', 'la-colonia', 'software', 'uav', 'lunabotics', 'spiderbot', 'machinedesign', 'holonomic', 'em', 'pablo'];
  const selections = {
    robotics: ['lunabotics', 'rover-twin', 'vision-arm', 'machinedesign'],
    mechanical: ['lunabotics', 'rover-twin', 'uav', 'machinedesign']
  };
  focus.hidden = false;
  focus.addEventListener('click', event => {
    const button = event.target.closest('button[data-focus]');
    if (!button) return;
    const selected = selections[button.dataset.focus];
    selected.forEach(key => featured.append(cards.get(key)));
    order.filter(key => !selected.includes(key)).forEach(key => additional.append(cards.get(key)));
    focus.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('project-announcement').textContent = `${button.textContent}: four featured projects; eight more in the collection.`;
    window.dispatchEvent(new Event('resize'));
  });
  // Expanding the collection changes the height of the existing dot-field canvas.
  document.getElementById('project-collection').addEventListener('toggle', () => window.dispatchEvent(new Event('resize')));
})();
