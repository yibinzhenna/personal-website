// Shared by the main page and the chess page. Everything below checks that
// its elements exist, so pages only get the parts they actually have.

const pages = document.querySelectorAll('.page');

function showPage(target) {
  // Only nav links carry the active marker, not the name or inline links.
  document.querySelectorAll('nav a[data-page]').forEach(l =>
    l.classList.toggle('active', l.dataset.page === target));

  pages.forEach(p => p.classList.toggle('active', p.id === target));
}

document.querySelectorAll('a[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.page;
    showPage(target);

    // Keep the URL shareable and let other pages link straight to a section.
    // pushState rather than replaceState, so back steps between sections
    // instead of leaving the site; assigning location.hash would scroll.
    // Re-clicking the current section would only stack duplicate entries.
    if ((location.hash.slice(1) || 'home') !== target) {
      history.pushState(null, '', target === 'home' ? location.pathname : '#' + target);
    }
  });
});

// Honour a hash on arrival, so links like /#projects (used by the chess page's
// nav) open the right section instead of always landing on home.
const initial = location.hash.slice(1);
if (initial && document.getElementById(initial) && pages.length) showPage(initial);

// Back and forward then move between sections rather than off the site.
window.addEventListener('popstate', () => {
  const id = location.hash.slice(1) || 'home';
  if (pages.length && document.getElementById(id)) showPage(id);
});

// A "ui" button reveals a screenshot. Hover covers this on a mouse (CSS),
// but a tap has no hover state and the keyboard needs a real control, so
// both get an explicit toggle.
document.querySelectorAll('.peek-toggle').forEach(btn => {
  const shot = document.getElementById(btn.getAttribute('aria-controls'));
  if (!shot) return;

  const setOpen = open => {
    shot.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', () => setOpen(!shot.classList.contains('open')));

  // Tapping anywhere else, or Escape, puts it away again.
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !shot.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
});

// The mouse version of the peek is a cursor layer: one fixed element on
// <body>, moved with a transform. Tracking is a single listener on the
// window that hit-tests with closest(), rather than pointerenter on each
// trigger -- the triggers are ~30x17px, and enter/leave on a target that
// small drops the pointer easily.
if (document.querySelector('.peek-toggle')) {
  const layer = document.createElement('div');
  layer.className = 'peek-layer';
  layer.setAttribute('aria-hidden', 'true');   // the in-flow figure is the real one
  document.body.appendChild(layer);

  const GAP = 18;
  const EDGE = 12;
  let shown = null;

  const hide = () => {
    layer.classList.remove('on');
    shown = null;
  };

  // Both pointermove and mousemove feed this, so the preview does not
  // depend on one event type behaving as expected in a given browser.
  // touchPointer suppresses the mousemove a tap synthesises afterwards.
  let touchPointer = false;

  const track = (clientX, clientY, target) => {
    const trigger = target && target.closest && target.closest('.peek-toggle');
    const shot = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
    const img = shot && shot.querySelector('img');
    if (!img) return hide();

    if (shown !== img) {
      const copy = img.cloneNode();
      copy.removeAttribute('loading');   // it is needed this instant
      layer.replaceChildren(copy);
      shown = img;
    }
    layer.classList.add('on');

    // Flip to the other side of the cursor rather than hang off an edge.
    const w = layer.offsetWidth;
    const h = layer.offsetHeight;
    let x = clientX + GAP + w > innerWidth - EDGE ? clientX - GAP - w : clientX + GAP;
    let y = clientY + GAP + h > innerHeight - EDGE ? clientY - GAP - h : clientY + GAP;
    layer.style.transform =
      'translate3d(' + Math.max(EDGE, x) + 'px, ' + Math.max(EDGE, y) + 'px, 0)';
  };

  window.addEventListener('pointermove', e => {
    touchPointer = e.pointerType !== 'mouse';
    if (touchPointer) return hide();
    track(e.clientX, e.clientY, e.target);
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    if (!touchPointer) track(e.clientX, e.clientY, e.target);
  }, { passive: true });

  // The trigger can move out from under a cursor that never moved.
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('blur', hide);
  document.addEventListener('pointerleave', hide);
}

// Local time in LA, lowercase to match everything else.
const clock = document.getElementById('clock');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
  });
  const tick = () => { clock.textContent = fmt.format(new Date()).toLowerCase() + ' in los angeles'; };
  tick();
  setInterval(tick, 15000);
}

// Light / dark switch. With nothing saved, the system setting decides.
const toggle = document.getElementById('theme-toggle');
if (toggle) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme || (systemDark.matches ? 'dark' : 'light')) === 'dark';
  const label = () => { toggle.textContent = isDark() ? 'light' : 'dark'; };

  toggle.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    label();
  });

  systemDark.addEventListener('change', label);
  label();
}
