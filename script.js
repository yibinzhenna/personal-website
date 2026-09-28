const navLinks = document.querySelectorAll('nav a[data-page], header a[data-page]');
const pages = document.querySelectorAll('.page');

function showPage(target) {
  // Update active nav link (only nav links, not the name)
  document.querySelectorAll('nav a[data-page]').forEach(l => l.classList.remove('active'));
  const matchingNav = document.querySelector(`nav a[data-page="${target}"]`);
  if (matchingNav) matchingNav.classList.add('active');

  // Show target page
  pages.forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(target);
  if (targetPage) targetPage.classList.add('active');
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.page;
    showPage(target);

    // Keep the URL shareable and let other pages link straight to a section.
    // replaceState rather than assigning location.hash, which would scroll.
    history.replaceState(null, '', target === 'home' ? location.pathname : '#' + target);
  });
});

// Honour a hash on arrival, so links like /#projects (used by the chess page's
// nav) open the right section instead of always landing on home.
const initial = location.hash.slice(1);
if (initial && document.getElementById(initial)) showPage(initial);
