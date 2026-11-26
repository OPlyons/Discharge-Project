(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const all = (selector, host = document) => Array.from(host.querySelectorAll(selector));
  const data = JSON.parse(byId('project-data').textContent);
  const crisis = JSON.parse(byId('crisis-pathway-data').textContent);
  const pages = new Map(all('[data-page]').map((page) => [page.id, page]));
  const topicPages = new Map(
    all('[data-topic]').map((article) => [article.dataset.topic, article.closest('[data-page]')]),
  );
  const navigatorOrigin = 'https://navigator.lxportal.space/';
  const staffArea = byId('staff-area');
  const staffTeam = byId('staff-team');
  const download = byId('download-main');
  const status = byId('pack-status');
  const urgentArea = byId('urgent-area');
  const readingToggle = byId('reading-toggle');
  const menuToggle = byId('menu-toggle');
  const menus = [
    [readingToggle, byId('reading-menu')],
    [menuToggle, byId('mobile-menu')],
  ];
  let currentKey = '';
  let currentPage;
  let generation = 0;
  let busy = false;
  let objectUrl;
  let lastStaffRoute;
  let readingReturn;
  let printStates = [];

  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function closeMenus(returnFocus = false) {
    for (const [toggle, menu] of menus) {
      if (!menu.hidden) {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        if (returnFocus) {
          const candidate = toggle === readingToggle ? readingReturn || toggle : toggle;
          (candidate.getClientRects().length ? candidate : menuToggle).focus();
        }
      }
    }
  }

  function toggleMenu(toggle, menu, opener = toggle) {
    const show = menu.hidden;
    closeMenus();
    if (show) {
      if (toggle === readingToggle) readingReturn = opener;
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      const firstControl = menu.querySelector('button, a');
      firstControl?.focus({ preventScroll: true });
    }
  }
  for (const [toggle, menu] of menus) toggle.addEventListener('click', () => toggleMenu(toggle, menu));
  for (const button of all('[data-open-reading]')) {
    button.addEventListener('click', () => toggleMenu(readingToggle, byId('reading-menu'), button));
  }
  document.addEventListener('pointerdown', (event) => {
    if (!menus.some(([toggle, menu]) => toggle.contains(event.target) || menu.contains(event.target)))
      closeMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus(true);
  });
  document.addEventListener('focusin', (event) => {
    if (!menus.some(([toggle, menu]) => toggle.contains(event.target) || menu.contains(event.target)))
      closeMenus();
  });
  byId('reading-menu')
    .querySelector('[data-close]')
    .addEventListener('click', () => closeMenus(true));
  for (const [id, cl] of [
    ['larger-text', 'large'],
    ['hide-pictures', 'no-pictures'],
    ['reduce-colours', 'reduced'],
  ]) {
    byId(id).addEventListener('click', (event) => {
      const on = document.documentElement.classList.toggle(cl);
      event.currentTarget.setAttribute('aria-pressed', String(on));
    });
  }
  byId('print-page').addEventListener('click', () => {
    closeMenus(true);
    window.print();
  });
  window.addEventListener('beforeprint', () => {
    if (printStates.length || !currentPage) return;
    printStates = all('details', currentPage).map((d) => [d, d.open]);
    for (const [d] of printStates) d.open = true;
  });
  window.addEventListener('afterprint', () => {
    for (const [d, open] of printStates) d.open = open;
    printStates = [];
  });

  function selectBorough() {
    for (const panel of all('[data-borough]')) panel.hidden = panel.dataset.borough !== urgentArea.value;
  }
  urgentArea.addEventListener('change', selectBorough);
  const directorySelect = byId('directory-area');
  function updateDirectory() {
    const listing = data.directories[directorySelect.value];
    const button = byId('directory-download');
    if (listing) {
      button.href = listing.url;
      button.removeAttribute('aria-disabled');
      button.querySelector('span').textContent = 'Open ' + listing.name + ' PDF';
    } else {
      button.removeAttribute('href');
      button.setAttribute('aria-disabled', 'true');
      button.querySelector('span').textContent = 'Open area PDF';
    }
  }
  directorySelect.addEventListener('change', updateDirectory);
  updateDirectory();

  function makeDisclosure(label, text, url) {
    const detail = node('details', undefined, 'disclosure');
    const body = node('div');
    body.append(node('p', text));
    if (url) {
      const a = node('a', 'Check service access details', 'textlink');
      a.href = url;
      body.append(a);
    }
    detail.append(node('summary', label), body);
    return detail;
  }
  function renderLocalRoutes() {
    window.DTPCrisis.render(byId('staff-crisis-routes'), staffArea.value);
    byId('local-support-link').href =
      navigatorOrigin + (data.directories[staffArea.value] ? '#area-' + staffArea.value : '');
  }

  function clearDownload() {
    generation++;
    busy = false;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = undefined;
    }
    status.replaceChildren();
  }
  function chooseStage(name) {
    document.querySelector('.workspace').dataset.stageActive = name;
    for (const button of all('[data-stage]'))
      button.setAttribute('aria-pressed', String(button.dataset.stage === name));
  }
  for (const button of all('[data-stage]'))
    button.addEventListener('click', () => chooseStage(button.dataset.stage));
  byId('choose-form-area').addEventListener('click', () => {
    chooseStage('form');
    staffArea.focus();
  });
  function changeGuide(name) {
    for (const el of all('[data-guide]')) el.setAttribute('aria-pressed', String(el.dataset.guide === name));
    for (const section of all('[data-guide-panel]')) section.hidden = section.dataset.guidePanel !== name;
  }
  for (const button of all('[data-guide]'))
    button.addEventListener('click', () => changeGuide(button.dataset.guide));
  for (const event of ['input', 'change'])
    staffArea.addEventListener(event, () => {
      clearDownload();
      renderLocalRoutes();
    });
  staffTeam.addEventListener('input', clearDownload);
  byId('clear-pack').addEventListener('click', () => {
    staffArea.value = '';
    staffTeam.value = '';
    clearDownload();
    renderLocalRoutes();
    staffArea.focus();
  });

  function renderStaff(route) {
    currentKey = data.staffRoutes[route];
    lastStaffRoute = route;
    clearDownload();
    const p = data.packs[currentKey];
    const isCall = currentKey.startsWith('call_');
    byId('staff-task-title').textContent = p.title;
    byId('staff-role').textContent = p.role;
    byId('pack-destination').textContent = p.destination;
    byId('staff-done').textContent = p.done;
    download.href = 'assets/' + data.download.name + '.docx';
    download.download = data.download.name + '.docx';
    const switchLink = byId('call-switch');
    switchLink.hidden = !isCall;
    switchLink.href = currentKey === 'call_carer' ? '#staff-call' : '#staff-carer';
    switchLink.textContent = currentKey === 'call_carer' ? 'Person call guidance' : 'Carer call guidance';
    const guide = p.guide.map(([title, description]) => {
      const li = node('li');
      li.append(node('h3', title), node('p', description));
      return li;
    });
    byId('staff-guide').replaceChildren(...guide);
    const outcomeHost = byId('outcome-guidance');
    outcomeHost.replaceChildren();
    const groups = isCall
      ? [
          ['Call outcomes', 'call'],
          ['Clinical or safeguarding handover', 'clinical_handover'],
        ]
      : [[currentKey === 'offer' ? 'Offer decisions' : 'Handover outcomes', currentKey]];
    for (const [title, group] of groups) {
      outcomeHost.append(node('h3', title));
      for (const item of data.outcomes[group]) outcomeHost.append(makeDisclosure(item.label, item.action));
    }
    if (isCall) {
      const safety = node(
        'p',
        'If you have an urgent concern, use the agreed clinical or safeguarding route now. If no one accepts the handover, use the backup contact.',
      );
      outcomeHost.append(safety);
    }
    renderLocalRoutes();
    chooseStage('form');
    changeGuide('guide');
    byId('pack-customisation').open = false;
  }
  download.addEventListener('click', async (event) => {
    const info = data.packs[currentKey];
    if (!info) return;
    if (!staffArea.value && !staffTeam.value.trim()) {
      status.textContent = 'Your blank Word form is downloading.';
      return;
    }
    event.preventDefault();
    if (busy) return;
    const ticket = ++generation;
    busy = true;
    status.textContent = 'Preparing your Word form…';
    const values = {
      AREA_ID: staffArea.value,
      ROLE: info.role,
      AREA: staffArea.value ? staffArea.selectedOptions[0].text : '[Complete in Word]',
      TEAM: staffTeam.value.trim() || '[Complete in Word]',
      MONTH: '[Complete in Word]',
    };
    try {
      const blob = await window.DischargeForms.prepare(data.download.key, values);
      if (ticket !== generation) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      const a = node('a', 'Save Word form');
      a.href = objectUrl;
      a.download = data.download.name + '.docx';
      status.replaceChildren(document.createTextNode('Your form is ready. '), a);
      a.click();
    } catch {
      if (ticket !== generation) return;
      const a = node('a', 'Download the blank form');
      a.href = 'assets/' + data.download.name + '.docx';
      a.download = data.download.name + '.docx';
      status.replaceChildren(
        document.createTextNode('We couldn’t prepare the customised form. Try again or use the blank copy. '),
        a,
      );
    } finally {
      if (ticket === generation) busy = false;
    }
  });

  function renderTopic(page, key) {
    let heading;
    for (const article of all('[data-topic]', page)) {
      article.hidden = article.dataset.topic !== key;
      if (!article.hidden) heading = article.querySelector('h2');
    }
    for (const link of all('[data-topic-link]', page)) {
      if (link.dataset.topicLink === key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const select = page.querySelector('[data-topic-select]');
    if (select) select.value = key;
    return heading;
  }
  for (const select of all('[data-topic-select]'))
    select.addEventListener('change', () => {
      location.hash = select.value;
    });
  // Native fragment targets provide direct access to blank forms when JavaScript is off.
  // The router handles those same fragments once the workspace is available.
  for (const form of all('#blank-task-downloads [id]')) form.removeAttribute('id');
  const aliases = {
    'staff-run': 'downloads',
    'staff-monthly': 'downloads',
    workforce: 'downloads',
    'blank-task-downloads': 'downloads',
    'borough-crisis-guide': 'urgent',
    noticeboard: 'learning',
    'noticeboard-title': 'learning',
    'process-title': 'process',
    'home-leaflet-heading': 'resources',
    'call-questions-heading': 'call-questions',
    'public-area-links': 'resources',
    'public-leaflet-links': 'resources',
  };
  function route(focus = true) {
    let key;
    try {
      key = decodeURIComponent(location.hash.slice(1)) || 'home';
    } catch {
      key = 'home';
    }
    if (key === 'main') {
      byId('main').focus();
      return;
    }
    if (key === 'support' || key === 'navigator-privacy') {
      location.replace(navigatorOrigin + (key === 'navigator-privacy' ? '#navigator-privacy' : ''));
      return;
    }
    key = aliases[key] || key;
    if (key === 'staff-results' || key === 'staff-workspace') key = lastStaffRoute || 'downloads';
    if (key.startsWith('crisis-') && Object.hasOwn(crisis.areas, key.slice(7))) {
      urgentArea.value = key.slice(7);
      selectBorough();
      key = 'urgent';
    }
    let page;
    if (Object.hasOwn(data.staffRoutes, key)) {
      renderStaff(key);
      page = pages.get('staff-workspace');
    } else {
      if (currentPage?.id === 'staff-workspace') clearDownload();
      page = topicPages.get(key) || pages.get(key);
      if (!page) {
        key = 'home';
        page = pages.get('home');
      }
    }
    const wasPage = currentPage;
    closeMenus();
    for (const other of pages.values()) {
      other.hidden = other !== page;
      other.classList.toggle('active', other === page);
    }
    let heading = page.querySelector('h1');
    if (topicPages.has(key)) {
      const topicHeading = renderTopic(page, key);
      if (wasPage === page && key !== page.id) heading = topicHeading;
    }
    const navKey = page.id === 'staff-workspace' ? 'downloads' : page.id === 'process' ? 'about' : page.id;
    for (const a of all('[data-nav]')) {
      if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    document.title =
      (page.id === 'staff-workspace' ? byId('staff-task-title').textContent : page.dataset.title) +
      ' | Discharge & Transition Project';
    currentPage = page;
    if (focus) {
      window.scrollTo(0, 0);
      heading?.focus({ preventScroll: true });
    }
  }
  window.addEventListener('hashchange', () => route());
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (anchor.hash === '#main') {
      e.preventDefault();
      byId('main').focus();
      return;
    }
    if (anchor.hash === location.hash || (anchor.hash === '#home' && !location.hash)) {
      e.preventDefault();
      route();
    }
  });
  route(false);
  if (location.hash && location.hash !== '#main') {
    window.addEventListener('load', () => requestAnimationFrame(() => window.scrollTo(0, 0)), { once: true });
  }
})();
