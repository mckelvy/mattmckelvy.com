/* ============================================================
   The entry screen, mattmckelvy.com.

   The markup lives at the top of index.html and an inline script
   there decides, during parsing, whether this session should see
   it (so the name is on screen at first paint, with no flash of
   the homepage). This file runs the typing and the way in.

   Screen readers get the two sentences whole from a visually
   hidden copy; the typed characters are aria-hidden, and the
   untyped remainder holds its place invisibly, so nothing in the
   layout moves while it types.
   ============================================================ */
(function () {
  "use strict";
  var intro = document.getElementById("intro");
  if (!intro || intro.hidden) return;

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var root = document.documentElement;
  var lines = [].slice.call(intro.querySelectorAll(".intro-line"));
  var enterBtn = document.getElementById("introEnter");
  var timers = [], typing = true, ready = false, gone = false;

  /* the homepage behind is out of reach until we go in */
  var held = [];
  [].forEach.call(document.body.children, function (el) {
    if (el === intro || el.tagName === "SCRIPT" || el.hasAttribute("inert")) return;
    el.setAttribute("inert", "");
    el.setAttribute("aria-hidden", "true");
    held.push(el);
  });
  function release() {
    held.forEach(function (el) { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); });
    held = [];
  }
  scrollTo(0, 0);
  intro.focus({ preventScroll: true });

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function setLine(line, n) {
    var t = line.getAttribute("data-text");
    line.querySelector(".it-typed").textContent = t.slice(0, n);
    line.querySelector(".it-rest").textContent = t.slice(n);
  }
  function caret(line, on) { line.querySelector(".it-caret").classList.toggle("on", on); }
  function showAll() {
    lines.forEach(function (l) { setLine(l, l.getAttribute("data-text").length); caret(l, false); });
  }
  function reveal() {
    if (ready) return;
    ready = true;
    typing = false;
    intro.classList.remove("is-paused");
    intro.classList.add("is-ready");
  }
  /* any early interaction finishes the sentences at once */
  function finish() {
    if (!typing) return;
    timers.forEach(clearTimeout); timers = [];
    showAll();
    reveal();
  }

  /* characters appear one at a time, at a hand-set pace with a little give */
  function type(line, min, max, done) {
    var t = line.getAttribute("data-text"), n = 0;
    caret(line, true);
    (function tick() {
      n++;
      setLine(line, n);
      if (n >= t.length) { done(); return; }
      var d = min + Math.random() * (max - min);
      if (t.charAt(n - 1) === " ") d += Math.random() * 18;
      later(tick, d);
    })();
  }
  function run() {
    type(lines[0], 35, 50, function () {
      intro.classList.add("is-paused");
      later(function () {
        intro.classList.remove("is-paused");
        caret(lines[0], false);
        type(lines[1], 40, 55, function () {
          intro.classList.add("is-paused");
          later(function () {
            caret(lines[1], false);
            reveal();
          }, 700);
        });
      }, 600);
    });
  }

  if (reduced) {
    showAll();
    reveal();
  } else {
    /* the identity is already up; start once the serif has loaded, so lines never re-wrap mid-sentence */
    var started = false;
    var go = function () {
      if (started || !typing) return;
      started = true;
      later(run, Math.max(0, 350 - performance.now()));
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 1200);
    if (!document.fonts) go();
  }

  /* ---------------- the way in ---------------- */
  function enter() {
    if (gone) return;
    gone = true;
    try { sessionStorage.setItem("mkEntered", "1"); } catch (e) {}
    timers.forEach(clearTimeout); timers = [];
    intro.classList.add("is-leaving");
    root.classList.remove("intro-open");
    release();
    var main = document.getElementById("main");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      main.removeAttribute("tabindex");
    }
    removeEventListener("keydown", onKey, true);
    setTimeout(function () {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, reduced ? 80 : 640);
  }

  function onKey(e) {
    if (gone) return;
    /* the command palette lives behind the intro; keep it closed until we are in */
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (e.key === "Escape") { e.preventDefault(); enter(); return; }
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (typing) finish(); else enter();
    }
  }
  addEventListener("keydown", onKey, true);
  enterBtn.addEventListener("click", function () { if (ready) enter(); });
  enterBtn.addEventListener("focus", finish);
  intro.addEventListener("pointerdown", function (e) {
    if (typing && e.target !== enterBtn) finish();
  });
  intro.addEventListener("wheel", finish, { passive: true });
  intro.addEventListener("touchmove", finish, { passive: true });
})();
