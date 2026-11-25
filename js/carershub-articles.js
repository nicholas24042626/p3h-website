/* Show only dated links from Carers Hub; publisher HTML is never inserted. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const cards = document.querySelector('#latest-article-cards');
  const status = document.querySelector('#article-status');
  if (!cards || !status) return;
  const t = value => window.P3HI18n ? window.P3HI18n.translate(value) : value;
  const language = () => window.P3HI18n?.language === 'zh' ? 'zh-SG' : 'en-SG';
  function safeImage(source) {
    try { return typeof source === 'string' && /^https:\/\/www\.carershub\.sg\/frontend\/web\/(?:cache|upload)\/[A-Za-z0-9/_().%~-]+\.(?:png|jpe?g|webp)$/i.test(source) && !decodeURIComponent(source).includes('..'); }
    catch { return false; }
  }
  let data = null, busy = false, lastAttempt = 0;
  let renderedKey = '';
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function validate(feed) {
    if (!feed || !Array.isArray(feed.articles) || feed.articles.length !== 3 || !Number.isFinite(Date.parse(feed.checkedAt)) || Date.parse(feed.checkedAt) > Date.now() + 5 * 60 * 1000) throw new Error('Invalid article feed');
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const seen = new Set();
    for (const article of feed.articles) {
      if (typeof article.title !== 'string' || !article.title.trim() || article.title.length > 240 || typeof article.author !== 'string' || article.author.length > 200 || !/^https:\/\/www\.carershub\.sg\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.url) || seen.has(article.url) || !/^\d{4}-\d{2}-\d{2}$/.test(article.date)) throw new Error('Invalid article');
      const date = new Date(`${article.date}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== article.date || article.date > today) throw new Error('Invalid article date');
      seen.add(article.url);
    }
    return { ...feed, articles: feed.articles.map(article => ({ ...article, image: safeImage(article.image) ? article.image : null })).sort((a, b) => b.date.localeCompare(a.date)) };
  }
  function render() {
    if (!data) { status.textContent = t('Articles are temporarily unavailable. You can still browse Carers Hub directly.'); return; }
    const key = JSON.stringify(data.articles) + language();
    const focusedURL = cards.contains(document.activeElement) ? document.activeElement.closest('a')?.href : null;
    if (key !== renderedKey) {
    cards.replaceChildren();
    for (const article of data.articles) {
      const card = node('article', undefined, 'card article-card');
      const media = node('div', undefined, 'article-media');
      const placeholder = node('span', 'Carers Hub', 'article-image-fallback'); placeholder.setAttribute('aria-hidden', 'true'); media.append(placeholder);
      if (article.image) {
        const image = document.createElement('img'); image.className = 'article-thumbnail'; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.width = 800; image.height = 450; image.referrerPolicy = 'no-referrer';
        image.addEventListener('load', () => { if (image.isConnected) placeholder.hidden = true; });
        image.addEventListener('error', () => { image.remove(); placeholder.hidden = false; });
        image.src = article.image; media.append(image);
      }
      card.append(media);
      card.append(node('p', t('Carers Hub · Singapore'), 'eyebrow'));
      const title = node('h3', article.title); title.lang = 'en'; title.id = `carershub-${new URL(article.url).pathname.split('/').pop()}`;
      card.setAttribute('aria-labelledby', title.id); card.append(title);
      const dateLine = node('p', undefined, 'article-date');
      const date = node('time', new Intl.DateTimeFormat(language(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(`${article.date}T12:00:00+08:00`)));
      date.dateTime = article.date; dateLine.append(node('span', `${t('Published')}: `), date); card.append(dateLine);
      if (article.author) {
        const byline = node('p', undefined, 'article-author'), author = node('span', article.author); author.lang = 'en';
        byline.append(node('span', `${t('By')}: `), author); card.append(byline);
      }
      const link = node('a', t('Read on Carers Hub')); link.href = article.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${t('Read on Carers Hub')}: ${article.title}`); card.append(link);
      cards.append(card);
    }
    renderedKey = key;
    if (focusedURL) [...cards.querySelectorAll('a')].find(link => link.href === focusedURL)?.focus({ preventScroll: true });
    }
    const checked = new Intl.DateTimeFormat(language(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }).format(new Date(data.checkedAt));
    status.textContent = `${t('Last checked')}: ${checked} (${t('Singapore time')}). ${t(data.status === 'fresh' ? 'New articles are checked up to once an hour.' : 'Showing saved articles. Visit Carers Hub to check for newer updates.')}`;
  }
  async function fetchJSON(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(new URL(path, root), { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error('Article feed unavailable');
      return validate(await response.json());
    } finally { clearTimeout(timeout); }
  }
  async function refresh() {
    if (busy) return;
    busy = true; lastAttempt = Date.now();
    if (!data) status.textContent = t('Loading the latest article links…');
    try { data = await fetchJSON('api/articles'); }
    catch {
      if (data) data = { ...data, status: 'cached' };
      else {
        try { data = { ...await fetchJSON('assets/data/carershub-articles.json'), status: 'cached' }; }
        catch { data = null; }
      }
    }
    render(); busy = false;
  }
  document.addEventListener('p3h:languagechange', () => { if (data) render(); else status.textContent = t(busy ? 'Loading the latest article links…' : 'Articles are temporarily unavailable. You can still browse Carers Hub directly.'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastAttempt >= 15 * 60 * 1000) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 15 * 60 * 1000);
  refresh();
})();
