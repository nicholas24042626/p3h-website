document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.main-nav');
  const toggle = document.querySelector('.menu-toggle');
  const closeMenu = () => {
    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  const revealAnchor = () => {
    const id = location.hash.slice(1) || document.body.dataset.defaultTarget;
    const target = id && document.getElementById(decodeURIComponent(id));
    if (target?.matches('details')) target.open = true;
    for (let parent = target?.parentElement; parent; parent = parent.parentElement) {
      if (parent.matches('details')) parent.open = true;
    }
  };
  revealAnchor();
  window.addEventListener('hashchange', revealAnchor);
  if (!location.hash && document.body.dataset.defaultTarget) {
    requestAnimationFrame(() => document.getElementById(document.body.dataset.defaultTarget)?.scrollIntoView());
  }
  document.querySelectorAll('[data-page-link]').forEach(link => {
    if (link.dataset.pageLink === document.body.dataset.page) {
      link.setAttribute('aria-current', 'page');
      const group = link.closest('details');
      if (group && window.innerWidth < 1100) group.open = true;
    }
  });
  // Section links work as ordinary anchors without JavaScript. Enhance them into
  // an in-page workspace while keeping bookmarks and browser history useful.
  const workspace = document.querySelector('[data-workspace-nav]');
  if (workspace) {
    const links = [...workspace.querySelectorAll('a')];
    const panels = [...document.querySelectorAll('[data-workspace-panel]')];
    const selectSection = (moveFocus = false) => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(id);
      const section = panels.find(panel => panel.id === id || panel.contains(target))
        || panels.find(panel => panel.id === document.body.dataset.defaultSection)
        || panels[0];
      panels.forEach(panel => { panel.hidden = panel !== section; });
      links.forEach(link => {
        if (link.hash === `#${section.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const disclosure = target?.closest('details');
      if (disclosure) disclosure.open = true;
      if (moveFocus) {
        const heading = section.querySelector('h2');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        section.scrollIntoView({ block: 'start' });
      }
    };
    workspace.classList.add('is-enhanced');
    window.addEventListener('hashchange', () => selectSection(true));
    selectSection();
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menuWasOpen = nav?.classList.contains('is-open');
    const focusWasInDetails = document.activeElement?.closest('.main-nav details');
    document.querySelectorAll('.main-nav details').forEach(group => group.open = false);
    closeMenu();
    if (focusWasInDetails) focusWasInDetails.querySelector('summary')?.focus();
    else if (menuWasOpen) toggle?.focus();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) {
      document.querySelectorAll('.main-nav details').forEach(group => group.open = false);
      closeMenu();
    }
  });

  const schemeFilters = document.querySelectorAll('[data-scheme-filter]');
  const schemeCards = document.querySelectorAll('.scheme-card');
  if (schemeFilters.length && schemeCards.length) {
    schemeFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        const selectedType = filter.dataset.schemeFilter;
        schemeFilters.forEach(button => {
          const isSelected = button === filter;
          button.classList.toggle('is-active', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
        document.querySelectorAll('.grant-category').forEach(category => {
          const cards = category.querySelectorAll('.scheme-card');
          let visibleCards = 0;
          cards.forEach(card => {
            const matches = selectedType === 'all' || card.classList.contains(`scheme-${selectedType}`);
            card.hidden = !matches;
            if (matches) visibleCards += 1;
          });
          category.hidden = visibleCards === 0;
        });
      });
    });
  }

  const grantFilters = document.querySelectorAll('[data-grant-filter]');
  const grantCards = document.querySelectorAll('.grant-card');
  if (grantFilters.length && grantCards.length) {
    grantFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        const selectedType = filter.dataset.grantFilter;
        grantFilters.forEach(button => {
          const isSelected = button === filter;
          button.classList.toggle('is-active', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
        document.querySelectorAll('.financial-support .grant-category').forEach(category => {
          const cards = category.querySelectorAll('.grant-card');
          let visibleCards = 0;
          cards.forEach(card => {
            const matches = selectedType === 'all' || card.classList.contains(`grant-${selectedType}`);
            card.hidden = !matches;
            if (matches) visibleCards += 1;
          });
          category.hidden = visibleCards === 0;
        });
      });
    });
  }
});
