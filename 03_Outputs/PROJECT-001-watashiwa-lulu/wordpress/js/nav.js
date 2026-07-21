(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.site-nav');
    var backdrop = document.querySelector('.nav-backdrop');
    if (!toggle || !nav) return;

    function closeNav() {
      nav.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }

    function openNav() {
      nav.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    }

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.contains('is-open');
      if (isOpen) { closeNav(); } else { openNav(); }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeNav);
    }

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  });
})();
