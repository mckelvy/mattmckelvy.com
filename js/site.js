/* mattmckelvy.com v4 — core: shared instrument kit, nav, reveals, palette.
   No dependencies. The MK namespace is the whole toolbox. */
(function () {
  "use strict";

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (reduced) document.documentElement.classList.add("reduced");

  /* ============ MK: the shared kit ============ */
  var MK = window.MK = {
    reduced: reduced,
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    /* smooth ease for choreographed (non-physical) motion */
    ease: function (t) { t = MK.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    easeOut: function (t) { t = MK.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); },
    fmt$: function (v) { return "$" + Math.round(v).toLocaleString("en-US"); },
    fmtK: function (v) { return "$" + Math.round(v / 1000) + "k"; },
    /* deterministic rng so exhibits look identical on every visit */
    rng: function (seed) {
      var a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    /* one spring step; returns [pos, vel]. k = stiffness, d = damping */
    springStep: function (pos, vel, target, dt, k, d) {
      var f = (target - pos) * k - vel * d;
      vel += f * dt;
      pos += vel * dt;
      return [pos, vel];
    },
    on: function (el, ev, fn, opts) { el.addEventListener(ev, fn, opts || false); }
  };

  /* An instrument = a DPR-correct canvas in a host, with its own rAF loop
     that only runs while visible AND while its draw() says "still moving".
     draw(ctx, w, h, dt) -> return true to keep animating, false to sleep. */
  MK.instrument = function (host, draw, setup) {
    if (!host) return null;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    host.classList.add("live");
    host.appendChild(canvas);

    var inst = {
      host: host, canvas: canvas, ctx: ctx, w: 0, h: 0,
      visible: false, running: false, pointer: null
    };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var last = 0;

    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      inst.w = w; inst.h = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (inst.onResize) inst.onResize(w, h);
      frame(true);
    }

    function frame(force) {
      var now = performance.now();
      var dt = Math.min((now - last) / 1000, 0.05) || 0.016;
      last = now;
      ctx.clearRect(0, 0, inst.w, inst.h);
      var busy = draw(ctx, inst.w, inst.h, reduced ? 10 : dt, inst);
      if (busy && inst.visible && !reduced) {
        inst.running = true;
        requestAnimationFrame(function () { if (inst.running) frame(); });
      } else {
        inst.running = false;
      }
      return busy;
    }

    inst.wake = function () {
      if (inst.running) return;
      last = performance.now() - 16;
      inst.running = true;
      frame();
    };
    inst.redraw = function () { if (!inst.running) { last = performance.now() - 16; frame(); } };
    /* headless step — lets the sim run without rAF (testing, hidden panes) */
    inst.step = function (n, dtMs) {
      var dt = (dtMs || 16.7) / 1000;
      for (var i = 0; i < (n || 1); i++) {
        ctx.clearRect(0, 0, inst.w, inst.h);
        draw(ctx, inst.w, inst.h, dt, inst);
      }
      inst.running = false;
    };
    (MK.instruments = MK.instruments || []).push(inst);

    if ("ResizeObserver" in window) new ResizeObserver(size).observe(host);
    else MK.on(window, "resize", size);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          inst.visible = e.isIntersecting;
          if (inst.visible) inst.wake(); else inst.running = false;
        });
      }, { rootMargin: "60px" }).observe(host);
    } else { inst.visible = true; }

    if (setup) setup(inst);
    size();
    return inst;
  };

  /* pointer helper for canvas instruments (mouse + touch) */
  MK.trackPointer = function (inst, handlers) {
    var c = inst.canvas;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    MK.on(c, "pointerdown", function (e) {
      var p = pos(e);
      if (handlers.down && handlers.down(p, e)) {
        c.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
      inst.wake();
    });
    MK.on(c, "pointermove", function (e) {
      var p = pos(e);
      inst.pointer = p;
      if (handlers.move) handlers.move(p, e);
      inst.wake();
    }, { passive: true });
    MK.on(c, "pointerup", function (e) {
      if (handlers.up) handlers.up(pos(e), e);
      inst.wake();
    });
    MK.on(c, "pointerleave", function () {
      inst.pointer = null;
      if (handlers.leave) handlers.leave();
      inst.wake();
    });
  };

  /* shared typography for canvas drawing */
  MK.font = {
    mono: function (px, weight) { return (weight || 500) + " " + px + "px 'JetBrains Mono', monospace"; },
    sans: function (px, weight) { return (weight || 400) + " " + px + "px 'Inter', sans-serif"; },
    serif: function (px, weight) { return (weight || 560) + " " + px + "px 'Fraunces', Georgia, serif"; }
  };
  MK.ink = "#1D1915"; MK.ink2 = "#5C554A"; MK.ink3 = "#8B8274";
  MK.accent = "#C8401A"; MK.market = "#2B5BA8"; MK.good = "#2E7D5B";
  MK.lineC = "rgba(29,25,21,.16)"; MK.lineSoft = "rgba(29,25,21,.08)";

  /* run after DOM + fonts so canvas text measures correctly */
  MK.ready = function (fn) {
    var did = false;
    function once() { if (!did) { did = true; fn(); } }
    function go() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(once);
        setTimeout(once, 1800); /* don't wait forever if a font hangs */
      } else once();
    }
    if (document.readyState === "loading") MK.on(document, "DOMContentLoaded", go);
    else go();
  };

  /* ============ page behaviors ============ */
  MK.ready(function () {
    document.documentElement.classList.add("fonts-in");

    /* header shadow */
    var head = document.getElementById("siteHead");
    MK.on(window, "scroll", function () {
      head.classList.toggle("scrolled", scrollY > 8);
    }, { passive: true });

    /* legacy hash routes from v2/v3 */
    var legacy = { home: "top", exp: "experience", work: "problems", skills: "capabilities" };
    var h = location.hash.replace("#", "");
    if (legacy[h]) location.replace("#" + legacy[h]);

    /* reveals */
    var reveals = [].slice.call(document.querySelectorAll(".reveal"));
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      reveals.forEach(function (el, i) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }

    /* stat count-ups */
    var counters = [].slice.call(document.querySelectorAll("[data-count]"));
    function countUp(el) {
      var target = +el.dataset.count, approx = el.dataset.approx || "", suffix = el.dataset.suffix || "";
      if (reduced) { el.textContent = approx + target.toLocaleString("en-US") + suffix; return; }
      var t0 = performance.now(), dur = 1100;
      (function tick(now) {
        var t = MK.easeOut((now - t0) / dur);
        el.textContent = approx + Math.round(target * t).toLocaleString("en-US") + suffix;
        if (t < 1) requestAnimationFrame(tick);
      })(t0);
    }
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    } else counters.forEach(countUp);

    /* active nav section */
    var navLinks = [].slice.call(document.querySelectorAll(".site-nav a"));
    var secForLink = {};
    navLinks.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute("href"));
      if (sec) secForLink[a.getAttribute("href").slice(1)] = a;
    });
    if ("IntersectionObserver" in window) {
      var nio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
          var a = secForLink[e.target.id];
          if (a) a.setAttribute("aria-current", "true");
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      Object.keys(secForLink).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) nio.observe(el);
      });
    }

    /* copy link */
    var copyBtn = document.getElementById("copyLink");
    if (copyBtn) MK.on(copyBtn, "click", function () {
      var t = copyBtn.textContent;
      function done(ok) {
        copyBtn.textContent = ok ? "Copied ✓" : "mattmckelvy.com";
        setTimeout(function () { copyBtn.textContent = t; }, 1500);
      }
      if (navigator.clipboard) navigator.clipboard.writeText("https://mattmckelvy.com/").then(function () { done(true); }, function () { done(false); });
      else done(false);
    });

    /* ============ command palette ============ */
    var wrap = document.getElementById("palWrap"),
        input = document.getElementById("palInput"),
        list = document.getElementById("palList"),
        openBtn = document.getElementById("palOpen"),
        lastFocus = null, sel = 0, shown = [];

    var ITEMS = [
      { t: "Top — who is this?", k: "go", id: "#top", kw: "home hero start matt mckelvy" },
      { t: "The equilibrium exhibit", k: "go", id: "#top", kw: "physics offer drag instrument balance" },
      { t: "Story — one question since 2021", k: "go", id: "#story", kw: "career progression timeline throughline" },
      { t: "Case 01 · Benchmark drift & attrition", k: "go", id: "#case-drift", kw: "benchmarking market apjc attrition investigation analysis data" },
      { t: "Case 02 · Job architecture, with AI", k: "go", id: "#case-architecture", kw: "ai leveling families titles workday taxonomy" },
      { t: "Case 03 · The offer lab", k: "go", id: "#case-offer", kw: "modeling model exceptions recruiting comp offers simulator tool" },
      { t: "Case 04 · M&A translation", k: "go", id: "#case-mna", kw: "splunk acquisition mapping integration merger" },
      { t: "Experience — Cisco, 2021–2026", k: "go", id: "#experience", kw: "cv resume roles jobs gtm history chronology" },
      { t: "Capabilities", k: "go", id: "#capabilities", kw: "skills tools excel tableau workday adaptive" },
      { t: "About — off the clock", k: "go", id: "#about", kw: "personal racquet pebble beach human" },
      { t: "Contact", k: "go", id: "#contact", kw: "email reach hire talk" },
      { t: "Download the résumé (PDF)", k: "get", act: "resume", kw: "cv pdf download resume" },
      { t: "Email Matt", k: "act", act: "email", kw: "mail contact reach out" },
      { t: "Open LinkedIn", k: "act", act: "li", kw: "linkedin profile social" },
      { t: "Copy site link", k: "act", act: "copy", kw: "share url clipboard" }
    ];

    function score(item, q) {
      if (!q) return 1;
      var hay = (item.t + " " + item.kw).toLowerCase();
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      var s = 0;
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) === -1) return 0;
        s += 1;
      }
      return s;
    }
    function render(q) {
      shown = ITEMS.filter(function (it) { return score(it, q) > 0; });
      sel = 0;
      list.innerHTML = "";
      if (!shown.length) {
        var li = document.createElement("li");
        li.className = "pal-empty";
        li.textContent = "Nothing matches — try “offers”, “architecture”, “résumé”.";
        list.appendChild(li);
        return;
      }
      shown.forEach(function (it, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        li.innerHTML = "<span></span><span class='pal-k'></span>";
        li.firstChild.textContent = it.t;
        li.lastChild.textContent = it.k;
        if (i === sel) li.classList.add("sel");
        MK.on(li, "click", function () { sel = i; go(); });
        MK.on(li, "pointermove", function () {
          if (sel === i) return;
          sel = i; paint();
        });
        list.appendChild(li);
      });
    }
    function paint() {
      [].forEach.call(list.children, function (li, i) { li.classList.toggle("sel", i === sel); });
      var el = list.children[sel];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
    function go() {
      var it = shown[sel];
      if (!it) return;
      close();
      if (it.k === "go") {
        var target = document.querySelector(it.id);
        if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      } else if (it.act === "resume") {
        var a = document.createElement("a"); a.href = "Matthew-McKelvy-Resume.pdf"; a.download = ""; a.click();
      } else if (it.act === "email") location.href = "mailto:mckelvymatthew@gmail.com";
      else if (it.act === "li") window.open("https://www.linkedin.com/in/mattmckelvy/", "_blank", "noopener");
      else if (it.act === "copy" && navigator.clipboard) navigator.clipboard.writeText("https://mattmckelvy.com/");
    }
    function open() {
      lastFocus = document.activeElement;
      wrap.hidden = false;
      input.value = "";
      render("");
      input.focus();
    }
    function close() {
      wrap.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    if (openBtn) MK.on(openBtn, "click", open);
    MK.on(input, "input", function () { render(input.value); });
    MK.on(window, "keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        wrap.hidden ? open() : close();
        return;
      }
      if (wrap.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
      else if (e.key === "Enter") { e.preventDefault(); go(); }
      else if (e.key === "Tab") { e.preventDefault(); input.focus(); }
    });
    MK.on(wrap, "click", function (e) { if (e.target === wrap) close(); });
  });
})();
