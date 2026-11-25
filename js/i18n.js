/* One site-wide switch; English source HTML is also the no-JavaScript fallback. */
(() => {
  const copy = window.P3HChinese || {};
  const normalise = value => value.replace(/\s+/g, ' ').trim();
  const storedLanguage = () => { try { return localStorage.getItem('p3h-language'); } catch { return null; } };
  let language = 'en';
  const translate = (source, selected = language) => {
    if (selected !== 'zh') return source;
    const key = normalise(source);
    if (Object.hasOwn(copy, key)) return copy[key];
    let match = key.match(/^Photo (\d+) of (\d+)$/);
    if (match) return `第${match[1]}张，共${match[2]}张`;
    match = key.match(/^(\d+) photos$/);
    if (match) return `${match[1]}张照片`;
    match = key.match(/^(.*?) — photo (\d+)$/);
    if (match) return `${translate(match[1], 'zh')}——第${match[2]}张照片`;
    match = key.match(/^(Previous|Next) photo of (.*)$/);
    if (match) return `${translate(match[2], 'zh')}：${match[1] === 'Previous' ? '上一张' : '下一张'}照片`;
    match = key.match(/^(.*?) photos$/);
    if (match) return `${translate(match[1], 'zh')}活动照片`;
    return source;
  };
  window.P3HI18n = { translate, get language() { return language; } };

  document.addEventListener('DOMContentLoaded', () => {
    const text = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!normalise(node.nodeValue) || node.parentElement.closest('script, style, noscript, [data-language], [data-language-button], [data-i18n-dynamic]')) continue;
      text.push([node, node.nodeValue]);
    }
    const attributes = [];
    for (const element of document.querySelectorAll('[alt], [aria-label], [aria-roledescription], [title], meta[name="description"]')) {
      if (element.closest('[data-language], [data-language-button]')) continue;
      for (const name of ['alt', 'aria-label', 'aria-roledescription', 'title', 'content']) {
        if (element.hasAttribute(name)) attributes.push([element, name, element.getAttribute(name)]);
      }
    }
    const englishTitle = document.title;
    const buttons = [...document.querySelectorAll('[data-language-button]')];
    const setLanguage = (selected, save = false) => {
      language = selected === 'zh' ? 'zh' : 'en';
      document.documentElement.lang = language === 'zh' ? 'zh-Hans-SG' : 'en-SG';
      document.documentElement.dataset.siteLanguage = language;
      for (const [node, original] of text) {
        const translated = translate(original);
        // Chinese punctuation and linked phrases do not need the English
        // source's boundary spaces. Restore the exact source on switching back.
        node.nodeValue = translated;
      }
      for (const [element, name, original] of attributes) element.setAttribute(name, translate(original));
      document.querySelectorAll('[data-language]').forEach(element => { element.hidden = element.dataset.language !== language; });
      document.title = language === 'zh' ? `${translate(englishTitle.split(' | ')[0])} | P3H` : englishTitle;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.languageButton === language)));
      document.querySelectorAll('[data-site-language-controls]').forEach(control => { control.hidden = false; });
      // Carry the language in internal links as well as storage, including new tabs
      // and browsers where localStorage is unavailable. Leave downloads untouched.
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href.startsWith('#')) return;
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
        url.searchParams.set('lang', language);
        link.setAttribute('href', url.pathname + url.search + url.hash);
      });
      if (save) {
        try { localStorage.setItem('p3h-language', language); } catch { /* URL still carries the selection. */ }
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(null, '', url);
      }
      document.dispatchEvent(new CustomEvent('p3h:languagechange', { detail: { language } }));
      // Changing language changes section heights. Resolve bookmarks immediately
      // so they also work in background tabs and embedded previews.
      if (location.hash) {
        let id;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
        document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    };
    const requested = new URLSearchParams(location.search).get('lang');
    setLanguage(['en', 'zh'].includes(requested) ? requested : storedLanguage());
    buttons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.languageButton, true)));
  });
})();
