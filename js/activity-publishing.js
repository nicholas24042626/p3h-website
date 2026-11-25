/* Public activities come from the server; only a verified staff session can publish. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const panel = document.querySelector('#staff-panel');
  if (!panel) return;
  const access = document.querySelector('#staff-access');
  const login = document.querySelector('#staff-login');
  const workspace = document.querySelector('#staff-workspace');
  const form = document.querySelector('#activity-publish');
  const status = document.querySelector('#staff-status');
  const publicStatus = document.querySelector('#published-status');
  const previews = document.querySelector('#photo-previews');
  const fileInput = document.querySelector('#activity-photos');
  const grid = document.querySelector('.activity-grid');
  let selected = [], published = [], previewVersion = 0, busy = false, signedIn = false, editing = null;
  let sessionTimer;
  let statusSource = '';
  const t = text => window.P3HI18n ? window.P3HI18n.translate(text) : text;
  const chinese = () => window.P3HI18n?.language === 'zh';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const message = text => { statusSource = text; status.textContent = t(text); };
  const setSession = signedIn => {
    updateStaffAccess(signedIn);
    login.hidden = signedIn;
    workspace.hidden = !signedIn;
    clearTimeout(sessionTimer);
    if (signedIn) sessionTimer = setTimeout(() => {
      setSession(false);
      message('Your session has expired. Sign in again to publish your photos.');
    }, 30 * 60 * 1000);
  };
  function updateStaffAccess(value) { signedIn = value; renderManager(); }
  async function request(path, payload) {
    const response = await fetch(new URL(path, root), {
      method: payload === undefined ? 'GET' : 'POST',
      credentials: 'same-origin', cache: 'no-store',
      headers: payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-P3H-Request': 'staff' },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error('Staff publishing is unavailable. Please use the website server and try again.'); }
    if (!response.ok) {
      if (response.status === 401 && path !== 'api/staff/login') setSession(false);
      throw new Error(data.error || 'The request could not be completed. Please try again.');
    }
    return data;
  }
  function renderPublished() {
    const positions = new Map([...grid.querySelectorAll('[data-published-activity]')].map(card => [card.dataset.publishedActivity, Number(card.querySelector('.activity-counter')?.dataset.current || 1) - 1]));
    grid.querySelectorAll('[data-published-activity]').forEach(node => node.remove());
    const fragment = document.createDocumentFragment();
    for (const activity of published) {
      const title = activityTitle(activity);
      const description = chinese() && activity.descriptionZh ? activity.descriptionZh : activity.description;
      const card = element('article', 'activity-card');
      card.dataset.publishedActivity = activity.id;
      card.dataset.i18nDynamic = '';
      const slideshow = element('div', 'activity-slideshow');
      slideshow.setAttribute('role', 'region');
      slideshow.setAttribute('aria-roledescription', t('carousel'));
      slideshow.setAttribute('aria-label', t(`${title} photos`));
      slideshow.tabIndex = 0;
      const photos = element('div', 'activity-photos');
      for (const photo of activity.photos) {
        // Only render the fixed media endpoint, even if stored data is damaged.
        if (!safePhotoURL(photo.url)) continue;
        const image = element('img', 'activity-slide');
        image.src = new URL(photo.url, root).href;
        image.alt = chinese() && photo.captionZh ? photo.captionZh : t(photo.caption);
        image.loading = 'lazy'; image.decoding = 'async';
        photos.append(image);
      }
      if (!photos.children.length) continue;
      slideshow.append(photos);
      const controls = element('div', 'activity-controls');
      controls.hidden = true;
      for (const direction of [-1, 1]) {
        if (direction === 1) {
          const counter = element('p', 'activity-counter');
          counter.setAttribute('aria-live', 'polite');
          controls.append(counter);
        }
        const button = element('button', '', direction === -1 ? '←' : '→');
        button.type = 'button'; button.dataset.direction = direction;
        button.setAttribute('aria-label', t(`${direction === -1 ? 'Previous' : 'Next'} photo of ${title}`));
        controls.append(button);
      }
      slideshow.append(controls);
      const photoCaption = element('p', 'activity-photo-caption', photos.firstElementChild.alt);
      slideshow.addEventListener('p3h:slidechange', event => { photoCaption.textContent = event.detail.caption; });
      card.append(slideshow, photoCaption);
      const caption = element('div', 'activity-caption');
      const heading = element('h2', '', title);
      heading.id = activity.id.startsWith('existing-event-') ? activity.id.slice('existing-'.length) : `published-${activity.id}`;
      card.setAttribute('aria-labelledby', heading.id);
      caption.append(heading);
      const date = element('time', 'activity-date');
      date.dateTime = activity.date;
      if (activity.date) {
        date.textContent = new Date(`${activity.date}T12:00:00`).toLocaleDateString(chinese() ? 'zh-SG' : 'en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
        caption.append(date);
      }
      if (description) caption.append(element('p', 'activity-description', description));
      card.append(caption);
      fragment.append(card);
    }
    grid.prepend(fragment);
    window.P3HActivities?.initialise(grid);
    grid.querySelectorAll('[data-published-activity]').forEach(card => {
      const index = positions.get(card.dataset.publishedActivity);
      if (index) card.querySelector('.activity-slideshow').dispatchEvent(new CustomEvent('p3h:selectphoto', { detail: { index } }));
    });
  }
  async function loadPublished() {
    try {
      const data = await request('api/activities');
      published = Array.isArray(data.activities) ? data.activities : [];
      grid.querySelectorAll('.activity-card:not([data-published-activity])').forEach(card => card.remove());
      renderPublished();
      renderManager();
      publicStatus.textContent = '';
    } catch {
      publicStatus.textContent = t('New activity photos could not be loaded. Please refresh to try again.');
    }
  }
  function safePhotoURL(url) {
    if (typeof url !== 'string') return false;
    if (/^\/media\/activities\/[a-f0-9]{32}\.jpg$/.test(url)) return true;
    try {
      const path = decodeURIComponent(url);
      return /^\/assets\/images\/activities media\/[^/\\]+\.(?:jpg|jpeg|png)$/i.test(path) && !path.includes('..');
    } catch { return false; }
  }
  function activityTitle(activity) { return chinese() && activity.titleZh ? activity.titleZh : t(activity.title); }
  function updateEditorLabels() {
    document.querySelector('#activity-editor-heading').textContent = editing ? `${t('Editing activity')}: ${activityTitle(editing)}` : t('Add a new activity');
    document.querySelector('#publish-activity').textContent = t(editing ? 'Save changes' : 'Publish photos');
    document.querySelector('#cancel-activity-edit').hidden = !editing;
  }
  function resetEditor() {
    previewVersion++; clearPreviews(); form.reset(); editing = null;
    form.elements.date.required = true; setDate(); updateEditorLabels();
  }
  function renderManager() {
    const list = document.querySelector('#managed-activities');
    list.replaceChildren();
    if (!signedIn) return;
    for (const activity of published) {
      const item = element('div', 'managed-activity'); item.dataset.manageId = activity.id;
      item.append(element('h4', '', activityTitle(activity)));
      const buttons = element('div', 'button-row');
      const edit = element('button', 'button button-secondary', t('Edit photos'));
      edit.type = 'button'; edit.addEventListener('click', () => beginEdit(activity));
      const remove = element('button', 'button button-secondary button-danger', t('Remove activity'));
      remove.type = 'button'; remove.addEventListener('click', () => removeActivity(activity));
      buttons.append(edit, remove); item.append(buttons); list.append(item);
    }
    if (!published.length) list.append(element('p', '', t('No activities have been published yet.')));
  }
  function beginEdit(activity) {
    if (busy) return;
    if ((editing || selected.length) && !window.confirm(t('Discard unsaved changes and edit this activity?'))) return;
    clearPreviews(); previewVersion++; form.reset(); editing = activity;
    for (const field of ['title', 'titleZh', 'date', 'description', 'descriptionZh']) form.elements[field].value = activity[field] || '';
    form.elements.date.required = !activity.id.startsWith('existing-event-');
    selected = activity.photos.map(photo => ({ url: new URL(photo.url, root).href, retainedURL: photo.url, captionValue: photo.caption, captionZhValue: photo.captionZh || '' }));
    drawPreviews(); updateEditorLabels(); message('Edit captions, replace or remove photos, then save your changes.');
    document.querySelector('#activity-editor-heading').scrollIntoView({ block: 'start', behavior: 'instant' });
    form.elements.title.focus({ preventScroll: true });
  }
  async function removeActivity(activity) {
    if (busy || !window.confirm(t('Remove this activity and all its photos from the website?'))) return;
    busy = true; workspace.inert = true;
    try {
      await request(`api/activities/${activity.id}/delete`, { revision: activity.revision });
      published = published.filter(item => item.id !== activity.id);
      if (editing?.id === activity.id) resetEditor();
      renderPublished(); renderManager(); message('The activity and its photos have been removed from the website.');
    } catch (error) { message(error.message); }
    finally { busy = false; workspace.inert = false; }
  }
  document.querySelector('#cancel-activity-edit').addEventListener('click', () => { resetEditor(); message('Editing cancelled. Your published photos have not changed.'); });
  document.querySelector('#reload-activities').addEventListener('click', async () => {
    if (busy) return;
    if ((editing || selected.length) && !window.confirm(t('Discard unsaved changes and reload activities?'))) return;
    resetEditor(); await loadPublished(); message('');
  });
  access.addEventListener('click', async () => {
    panel.hidden = false; access.setAttribute('aria-expanded', 'true');
    message('Checking staff access…');
    try {
      const session = await request('api/staff/session');
      if (!session.configured) {
        login.hidden = true; workspace.hidden = true;
        message('Staff publishing has not been set up on this server.');
      } else {
        setSession(session.authenticated); message('');
        (session.authenticated ? document.querySelector('#reload-activities') : login.elements.code).focus();
      }
    } catch (error) { login.hidden = true; workspace.hidden = true; message(error.message); }
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  document.querySelector('#staff-close').addEventListener('click', () => {
    panel.hidden = true; access.setAttribute('aria-expanded', 'false'); access.focus();
  });
  login.addEventListener('submit', async event => {
    event.preventDefault();
    const button = login.querySelector('button');
    button.disabled = true;
    try {
      await request('api/staff/login', { code: login.elements.code.value });
      setSession(true); message('You are signed in. Edit an existing activity or add new photos below.');
      document.querySelector('#reload-activities').focus();
    } catch (error) { message(error.message); }
    finally { login.elements.code.value = ''; button.disabled = false; }
  });
  document.querySelector('#staff-logout').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await request('api/staff/logout', {}); setSession(false); message('You are signed out.'); login.elements.code.focus(); }
    catch (error) { message(error.message); }
    finally { document.querySelector('#staff-logout').disabled = false; }
  });
  function clearPreviews() {
    selected.filter(photo => photo.file).forEach(photo => URL.revokeObjectURL(photo.url));
    selected = []; previews.replaceChildren();
  }
  function drawPreviews() {
    previews.replaceChildren();
    for (const [index, photo] of selected.entries()) {
      const box = element('div', 'photo-preview');
      const img = element('img'); img.src = photo.url; img.alt = '';
      const label = element('label', '', `${t('Photo caption')} ${index + 1}`);
      label.htmlFor = `photo-caption-${index}`;
      photo.caption = element('input'); photo.caption.id = label.htmlFor; photo.caption.maxLength = 240; photo.caption.required = true;
      photo.caption.value = photo.captionValue || '';
      const labelZh = element('label', '', t('Chinese caption (optional)'));
      labelZh.htmlFor = `photo-caption-zh-${index}`;
      photo.captionZh = element('input'); photo.captionZh.id = labelZh.htmlFor; photo.captionZh.maxLength = 240; photo.captionZh.lang = 'zh-Hans-SG';
      photo.captionZh.value = photo.captionZhValue || '';
      const replaceLabel = element('label', 'photo-replace', t('Replace photo'));
      const replace = element('input'); replace.type = 'file'; replace.accept = 'image/jpeg,image/png';
      replace.addEventListener('change', () => {
        const file = replace.files[0]; if (!file || busy) return;
        if (!validFiles([file])) { replace.value = ''; message('Choose up to six JPEG or PNG photos, each 3 MB or less.'); return; }
        snapshotCaptions(); if (photo.file) URL.revokeObjectURL(photo.url);
        photo.file = file; photo.url = URL.createObjectURL(file); previewVersion++;
        drawPreviews(); message('');
      });
      replaceLabel.append(replace);
      const remove = element('button', 'button button-secondary button-danger', t('Remove photo')); remove.type = 'button';
      remove.addEventListener('click', () => {
        if (busy) return;
        snapshotCaptions(); if (photo.file) URL.revokeObjectURL(photo.url);
        selected.splice(index, 1); previewVersion++; drawPreviews();
        message(selected.length ? '' : 'Keep at least one photo, or use Remove activity to remove the whole collection.');
      });
      box.append(img, label, photo.caption, labelZh, photo.captionZh, replaceLabel, remove); previews.append(box);
    }
  }
  function snapshotCaptions() {
    selected.forEach(photo => { photo.captionValue = photo.caption?.value || ''; photo.captionZhValue = photo.captionZh?.value || ''; });
  }
  const validFiles = files => files.every(file => ['image/jpeg', 'image/png'].includes(file.type) && file.size <= 3145728);
  fileInput.addEventListener('change', () => {
    if (busy) return;
    const files = [...fileInput.files];
    if (selected.length + files.length > 6 || !validFiles(files)) {
      fileInput.value = ''; message('Choose up to six JPEG or PNG photos, each 3 MB or less.'); return;
    }
    snapshotCaptions(); previewVersion++;
    selected.push(...files.map(file => ({ file, url: URL.createObjectURL(file) })));
    fileInput.value = '';
    drawPreviews(); message('');
  });
  const readPhoto = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('A photo could not be read. Choose a JPEG or PNG.'));
    reader.readAsDataURL(file);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (!selected.length) { message('Choose between one and six photos.'); return; }
    busy = true;
    workspace.inert = true;
    const version = previewVersion;
    const button = document.querySelector('#publish-activity');
    button.disabled = true; form.setAttribute('aria-busy', 'true');
    message(editing ? 'Saving changes…' : 'Publishing photos…');
    try {
      const payload = Object.fromEntries(['title', 'titleZh', 'date', 'description', 'descriptionZh'].map(name => [name, form.elements[name].value]));
      const photos = selected.map(photo => ({ file: photo.file, url: photo.retainedURL, caption: photo.caption.value, captionZh: photo.captionZh.value }));
      payload.photos = await Promise.all(photos.map(async photo => ({ ...(photo.file ? { data: await readPhoto(photo.file) } : { url: photo.url }), caption: photo.caption, captionZh: photo.captionZh })));
      if (editing) payload.revision = editing.revision;
      const wasEditing = Boolean(editing);
      const result = await request(editing ? `api/activities/${editing.id}` : 'api/activities', payload);
      const position = published.findIndex(activity => activity.id === result.activity.id);
      if (position === -1) published.unshift(result.activity); else published[position] = result.activity;
      renderPublished(); renderManager();
      // Keep any new selection made while the previous photos were uploading.
      if (version === previewVersion) resetEditor();
      message(wasEditing ? 'Your changes are saved and visible to everyone.' : 'Your activity photos are published and visible to everyone.');
    } catch (error) { message(error.message); }
    finally { busy = false; workspace.inert = false; button.disabled = false; form.removeAttribute('aria-busy'); }
  });
  function setDate() {
    const now = new Date();
    form.elements.date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  document.addEventListener('p3h:languagechange', () => {
    renderPublished(); renderManager(); updateEditorLabels(); status.textContent = t(statusSource);
    snapshotCaptions(); drawPreviews();
    if (publicStatus.textContent) publicStatus.textContent = t('New activity photos could not be loaded. Please refresh to try again.');
  });
  window.addEventListener('beforeunload', () => selected.filter(photo => photo.file).forEach(photo => URL.revokeObjectURL(photo.url)));
  setDate(); updateEditorLabels(); loadPublished();
})();
