// ===========================================================
// Lux-Modern Renovations — shared site behavior
// Handles: active nav link highlighting + mobile menu toggle
// ===========================================================

(function () {
  var currentPage = document.body.getAttribute('data-page') || 'home';
  var links = document.querySelectorAll('a[data-page]');
  links.forEach(function (link) {
    if (link.getAttribute('data-page') === currentPage) {
      link.classList.add('active');
    }
  });

  var toggle = document.getElementById('nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      mobileMenu.classList.toggle('open');
    });
    // Close menu after tapping a link
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
      });
    });
  }

  // Scroll-reveal: fade/slide up sections and staggered grid children
  // as they enter the viewport.
  if ('IntersectionObserver' in window) {
    var revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: just show everything if IntersectionObserver isn't supported
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
      el.classList.add('in-view');
    });
  }
})();
