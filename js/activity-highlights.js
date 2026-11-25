/* Keep homepage photo highlights in step with staff edits to existing collections. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const cards = [...document.querySelectorAll('.home-activity')];
  if (!cards.length) return;
  let activities;
  function render() {
    if (!activities) return;
    for (const card of cards) {
      const hash = new URL(card.href).hash.slice(1);
      const activity = activities.find(item => item.id === `existing-${hash}`);
      card.hidden = !activity;
      if (!activity) continue;
      const zh = window.P3HI18n?.language === 'zh';
      const translate = value => window.P3HI18n ? window.P3HI18n.translate(value) : value;
      card.querySelector('h3').textContent = zh && activity.titleZh ? activity.titleZh : translate(activity.title);
      const photo = activity.photos[0];
      const image = card.querySelector('img');
      image.src = new URL(photo.url, root).href;
      image.alt = zh && photo.captionZh ? photo.captionZh : translate(photo.caption);
    }
  }
  fetch(new URL('api/activities', root), { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Activities unavailable');
    return response.json();
  }).then(data => { if (Array.isArray(data.activities)) { activities = data.activities; render(); } }).catch(() => { /* Static highlights remain available without the local API. */ });
  document.addEventListener('p3h:languagechange', render);
})();
