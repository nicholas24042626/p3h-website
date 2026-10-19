document.querySelectorAll('.activity-slideshow').forEach(slideshow => {
  const slides = [...slideshow.querySelectorAll('.activity-slide')];
  const controls = slideshow.querySelector('.activity-controls');
  const counter = slideshow.querySelector('.activity-counter');
  let current = 0;
  const show = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const active = position === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    counter.textContent = `Photo ${current + 1} of ${slides.length}`;
  };
  if (slides.length < 2) return;
  show(0);
  slideshow.classList.add('is-ready');
  controls.hidden = false;
  controls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => show(current + Number(button.dataset.direction)));
  });
  slideshow.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
});
