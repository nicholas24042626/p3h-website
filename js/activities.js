function initialiseActivitySlideshows(scope = document) {
scope.querySelectorAll('.activity-slideshow:not([data-initialised])').forEach(slideshow => {
  slideshow.dataset.initialised = 'true';
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
    const label = `Photo ${current + 1} of ${slides.length}`;
    counter.textContent = window.P3HI18n ? window.P3HI18n.translate(label) : label;
    counter.dataset.current = current + 1;
    counter.dataset.total = slides.length;
    slideshow.dispatchEvent(new CustomEvent('p3h:slidechange', { detail: { caption: slides[current].alt } }));
  };
  if (slides.length < 2) return;
  slideshow.addEventListener('p3h:selectphoto', event => show(Math.max(0, Math.min(slides.length - 1, event.detail.index))));
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
}
window.P3HActivities = { initialise: initialiseActivitySlideshows };
initialiseActivitySlideshows();
document.addEventListener('p3h:languagechange', () => {
  document.querySelectorAll('.activity-counter[data-current]').forEach(counter => {
    const label = `Photo ${counter.dataset.current} of ${counter.dataset.total}`;
    counter.textContent = window.P3HI18n ? window.P3HI18n.translate(label) : label;
  });
});
