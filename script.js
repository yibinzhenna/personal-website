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
