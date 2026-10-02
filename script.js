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

  // With a mouse, the figure follows the cursor while it is over the
  // trigger. pointerType filters out the synthetic mouse events a tap
  // fires, so touch keeps the click toggle above instead.
  const GAP = 18;
  const EDGE = 12;

  const place = (x, y) => {
    const w = shot.offsetWidth;
    const h = shot.offsetHeight;
    // Flip to the other side of the cursor rather than hang off the edge.
    let left = x + GAP + w > innerWidth - EDGE ? x - GAP - w : x + GAP;
    let top = y + GAP + h > innerHeight - EDGE ? y - GAP - h : y + GAP;
    shot.style.left = Math.max(EDGE, left) + 'px';
    shot.style.top = Math.max(EDGE, top) + 'px';
  };

  btn.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse') return;
    shot.classList.add('follow');
    place(e.clientX, e.clientY);   // after .follow, so it has a size
  });

  btn.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && shot.classList.contains('follow')) {
      place(e.clientX, e.clientY);
    }
  });

  const unfollow = () => {
    shot.classList.remove('follow');
    shot.style.left = shot.style.top = '';
  };

  btn.addEventListener('pointerleave', unfollow);
  // A scroll moves the trigger out from under a cursor that never left it.
  window.addEventListener('scroll', unfollow, { passive: true });

  // Tapping anywhere else, or Escape, puts it away again.
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !shot.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
});

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
