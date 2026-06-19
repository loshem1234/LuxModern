// ===========================================================
// Lux-Modern Renovations — shared site behavior
// Handles: active nav link highlighting based on current page
// ===========================================================

(function () {
  var currentPage = document.body.getAttribute('data-page') || 'home';
  var links = document.querySelectorAll('.nav-links a[data-page]');
  links.forEach(function (link) {
    if (link.getAttribute('data-page') === currentPage) {
      link.classList.add('active');
    }
  });
})();
