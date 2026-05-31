const navLinks = document.querySelectorAll('nav a[data-page], header a[data-page]');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.page;

    // Update active nav link (only nav links, not the name)
    document.querySelectorAll('nav a[data-page]').forEach(l => l.classList.remove('active'));
    const matchingNav = document.querySelector(`nav a[data-page="${target}"]`);
    if (matchingNav) matchingNav.classList.add('active');

    // Show target page
    pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(target);
    if (targetPage) targetPage.classList.add('active');
  });
});