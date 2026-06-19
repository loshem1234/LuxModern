// ===========================================================
// Lux-Modern Renovations — Blog admin placeholder
//
// This button is a stand-in for your future automated SEO
// publishing pipeline. Wire it to a scheduled job (e.g. a daily
// cron task on Railway) that drafts a new local-SEO article and
// adds it to this page's article list.
// ===========================================================

(function () {
  var btn = document.getElementById("generate-article-btn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Drafting…";
    setTimeout(function () {
      btn.textContent = "+ Generate today's article";
      btn.disabled = false;
    }, 1600);
  });
})();
