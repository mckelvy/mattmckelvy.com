/* mattmckelvy.com — behavior layer. Small on purpose. */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* scroll progress hairline */
  var bar = document.getElementById("progressBar");
  var ticking = false;
  function paint() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, scrollY / max) : 0;
    if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
  }
  addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();

  /* reveals */
  var revealEls = [].slice.call(document.querySelectorAll(".reveal"));
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* through-line accent lines, staggered when the list enters */
  var tl = document.querySelector(".throughline");
  if (tl) {
    var lis = [].slice.call(tl.children);
    var lightUp = function () {
      lis.forEach(function (li, i) {
        setTimeout(function () { li.classList.add("lit"); }, reduced ? 0 : 140 * i);
      });
    };
    if (reduced || !("IntersectionObserver" in window)) lightUp();
    else {
      var io2 = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { lightUp(); io2.disconnect(); }
      }, { threshold: 0.3 });
      io2.observe(tl);
    }
  }

  /* active nav state */
  var navLinks = [].slice.call(document.querySelectorAll(".topnav a"));
  var sections = navLinks.map(function (a) {
    return document.querySelector(a.getAttribute("href"));
  });
  if ("IntersectionObserver" in window) {
    var io3 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { if (s) io3.observe(s); });
  }

  /* first case study open by default — invite the pattern */
  var firstCase = document.querySelector(".case");
  if (firstCase) firstCase.open = true;

  /* copy link */
  var copyBtn = document.getElementById("copyLink");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var url = "https://mattmckelvy.com/";
      function done(ok) {
        var t = copyBtn.textContent;
        copyBtn.textContent = ok ? "Link copied" : url;
        setTimeout(function () { copyBtn.textContent = t; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      } else done(false);
    });
  }
})();
