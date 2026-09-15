/* mattmckelvy.com v8, core.
   The MK kit (canvas instruments, seeded rng, theme bridge) plus the
   page engine: one continuous paper temperature, masked type reveals,
   the mobile menu, section-aware nav. No dependencies. */
(function () {
  "use strict";

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (reduced) document.documentElement.classList.add("reduced");

  /* ============ MK: shared kit ============ */
  var MK = window.MK = {
    reduced: reduced,
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    ease: function (t) { t = MK.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    easeOut: function (t) { t = MK.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); },
    fmt$: function (v) { return "$" + Math.round(v).toLocaleString("en-US"); },
    fmtK: function (v) { return "$" + Math.round(v / 1000) + "k"; },
    rng: function (seed) {
      var a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    on: function (el, ev, fn, opts) { el.addEventListener(ev, fn, opts || false); }
  };
  try { MK.coarse = matchMedia("(pointer:coarse)").matches; } catch (e) { MK.coarse = false; }
  try { MK.fine = matchMedia("(pointer:fine)").matches; } catch (e) { MK.fine = true; }

  /* one voice for canvas type and color: the stylesheet's tokens, read once */
  (function theme() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fallback) { var x = cs.getPropertyValue(name).trim(); return x || fallback; }
    MK.theme = {
      ink: v("--ink", "#1C1B18"), ink1: v("--ink-1", "#2B2926"), ink2: v("--ink-2", "#5A564F"), ink3: v("--ink-3", "#8A847A"),
      rule: v("--rule", "rgba(28,27,24,.15)"), ruleSoft: v("--rule-soft", "rgba(28,27,24,.08)"),
      paper: v("--paper", "#F6F2EA"), paper2: v("--paper-2", "#EEE8DC"), sheet: v("--sheet", "#FCFAF6"),
      cobalt: v("--cobalt", "#2B49BC"), ochre: v("--ochre", "#B4761B"),
      green: v("--green", "#3C7A57"), coral: v("--coral", "#C4503E"),
      cobaltText: v("--cobalt-text", "#2540A6"), ochreText: v("--ochre-text", "#8A5A10"),
      greenText: v("--green-text", "#2E6446"), coralText: v("--coral-text", "#A3402F")
    };
    MK.alpha = function (hex, a) {
      var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    };
  })();
  MK.font = function (px, w) {
    return (w || 400) + " " + px + "px 'Hanken Grotesk', -apple-system, system-ui, 'Helvetica Neue', Helvetica, sans-serif";
  };

  /* An instrument: DPR-correct canvas whose rAF loop runs only while
     visible AND while draw() reports motion. wake() is the only scheduler. */
  MK.instrument = function (host, draw, setup) {
    if (!host) return null;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    host.classList.add("live");
    canvas.setAttribute("role", "img");
    if (host.dataset.fallback) canvas.setAttribute("aria-label", host.dataset.fallback);
    host.appendChild(canvas);

    var inst = { host: host, canvas: canvas, ctx: ctx, w: 0, h: 0, visible: false, running: false, pointer: null };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var last = 0;

    function frame() {
      var now = performance.now();
      var dt = Math.min((now - last) / 1000, 0.05) || 0.016;
      last = now;
      ctx.clearRect(0, 0, inst.w, inst.h);
      var busy = draw(ctx, inst.w, inst.h, reduced ? 10 : dt, inst);
      if (busy && inst.visible && !reduced) {
        inst.running = true;
        requestAnimationFrame(function () { if (inst.running) frame(); });
      } else inst.running = false;
      return busy;
    }
    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      inst.w = w; inst.h = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (inst.onResize) inst.onResize(w, h);
      if (inst.running) return;   /* the running loop repaints on its own */
      inst.wake();
    }
    inst.wake = function () {
      if (inst.running) return;
      last = performance.now() - 16;
      inst.running = true;
      frame();
    };
    inst.step = function (n, dtMs) {   /* headless QA hook */
      var dt = (dtMs || 16.7) / 1000;
      for (var i = 0; i < (n || 1); i++) { ctx.clearRect(0, 0, inst.w, inst.h); draw(ctx, inst.w, inst.h, dt, inst); }
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
      }, { rootMargin: "80px" }).observe(host);
    } else inst.visible = true;

    if (setup) setup(inst);
    size();
    return inst;
  };

  MK.trackPointer = function (inst, handlers) {
    var c = inst.canvas;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    MK.on(c, "pointerdown", function (e) {
      var p = pos(e);
      if (handlers.down && handlers.down(p, e)) { c.setPointerCapture(e.pointerId); e.preventDefault(); }
      inst.wake();
    });
    MK.on(c, "pointermove", function (e) {
      var p = pos(e);
      inst.pointer = p;
      if (handlers.move) handlers.move(p, e);
      inst.wake();
    }, { passive: true });
    MK.on(c, "pointerup", function (e) { if (handlers.up) handlers.up(pos(e), e); inst.wake(); });
    MK.on(c, "pointercancel", function (e) { if (handlers.up) handlers.up(pos(e), e); inst.wake(); });
    MK.on(c, "pointerleave", function () { inst.pointer = null; if (handlers.leave) handlers.leave(); inst.wake(); });
  };

  /* animated disclosure: the panel grows into place. One listener per box,
     keyed on the height transition, and the end state follows the intent. */
  MK.disclose = function (btn, box, open) {
    if (!btn || !box) return;
    btn.setAttribute("aria-expanded", String(open));
    if (box._discEnd) { box.removeEventListener("transitionend", box._discEnd); box._discEnd = null; }
    if (reduced) { box.hidden = !open; box.style.height = ""; box.style.opacity = ""; box.style.transition = ""; return; }
    var from = box.hidden ? 0 : box.getBoundingClientRect().height;
    box.hidden = false;
    box.style.transition = "none";
    box.style.height = from + "px";
    box.style.opacity = open ? (from ? "1" : "0") : "1";
    void box.offsetHeight;
    var to = open ? box.scrollHeight : 0;
    box.style.transition = "height .28s cubic-bezier(.22,.08,.18,1), opacity .22s";
    box.style.height = to + "px";
    box.style.opacity = open ? "1" : "0";
    var done = function (e) {
      if (e && e.propertyName !== "height") return;
      box.removeEventListener("transitionend", done); box._discEnd = null;
      box.style.transition = ""; box.style.height = ""; box.style.opacity = "";
      box.hidden = !open;
    };
    box._discEnd = done;
    box.addEventListener("transitionend", done);
    setTimeout(function () { if (box._discEnd === done) done(); }, 400);
  };

  /* instruments register mount functions; the page mounts them */
  MK.cases = {};
  MK.register = function (name, mount) { MK.cases[name] = mount; };

  /* DOM ready, and fonts ready (the canvases wait for the fonts; the page does not) */
  MK.dom = function (fn) {
    if (document.readyState === "loading") MK.on(document, "DOMContentLoaded", fn);
    else fn();
  };
  MK.ready = function (fn) {
    var did = false;
    function once() { if (!did) { did = true; fn(); } }
    MK.dom(function () {
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(once); setTimeout(once, 1200); }
      else once();
    });
  };

  /* ============ the light engine: paper temperature ============ */
  MK.dom(function () {
    var lightEl = document.getElementById("light");
    var nav = document.getElementById("nav");
    if (!lightEl) return;

    var COLORS = { paper: MK.theme.paper, white: MK.theme.sheet, "paper-2": MK.theme.paper2 };
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var stops = [];
    var sections = [].slice.call(document.querySelectorAll("[data-light]"));

    function build() {
      var vh = innerHeight;
      var raw = [];
      sections.forEach(function (s) {
        var c = COLORS[s.dataset.light] || MK.theme.paper;
        var r = s.getBoundingClientRect();
        var top = r.top + scrollY, bot = r.bottom + scrollY;
        raw.push([top + vh * 0.28, c], [Math.max(top + vh * 0.3, bot - vh * 0.34), c]);
      });
      if (!raw.length) raw.push([0, MK.theme.paper]);
      raw.sort(function (a, b) { return a[0] - b[0]; });
      raw.unshift([0, raw[0][1]]);
      raw.push([document.body.scrollHeight, raw[raw.length - 1][1]]);
      stops = raw.map(function (s) { return { y: s[0], c: hex(s[1]) }; });
    }

    var ticking = false, scrolled = false;
    function paint() {
      ticking = false;
      if (!stops.length) return;
      var y = scrollY;
      var i = 0;
      while (i < stops.length - 1 && stops[i + 1].y < y) i++;
      var a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
      var t = b.y > a.y ? MK.clamp((y - a.y) / (b.y - a.y), 0, 1) : 0;
      t = MK.ease(t);
      var r = Math.round(MK.lerp(a.c[0], b.c[0], t)),
          g = Math.round(MK.lerp(a.c[1], b.c[1], t)),
          bl = Math.round(MK.lerp(a.c[2], b.c[2], t));
      lightEl.style.backgroundColor = "rgb(" + r + "," + g + "," + bl + ")";
      if (nav) {
        var s = y > 40;
        nav.style.backgroundColor = s ? "rgb(" + r + "," + g + "," + bl + ")" : "transparent";
        if (s !== scrolled) { scrolled = s; nav.classList.toggle("scrolled", s); }
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }

    build(); paint();
    MK.on(window, "scroll", onScroll, { passive: true });
    MK.on(window, "resize", function () { build(); paint(); });
    /* the page changes height when panels open or fonts arrive: rebuild the stops */
    if ("ResizeObserver" in window) new ResizeObserver(function () { build(); paint(); }).observe(document.body);
    setTimeout(function () { build(); paint(); }, 700);
  });

  /* ============ page behaviors ============ */
  MK.dom(function () {

    /* legacy hashes */
    var legacy = {
      home: "top", pov: "work", approach: "work", example: "structure",
      model: "decisions", drift: "work", arch: "structure", mna: "experience",
      exp: "experience", skills: "experience", story: "experience",
      problems: "work", capabilities: "index", range: "index", evolution: "experience",
      tools: "experience", about: "contact", "case-offer": "decisions"
    };
    var h = location.hash.replace("#", "");
    if (legacy[h]) location.replace("#" + legacy[h]);

    /* reveals: masked headline groups and instrument blocks */
    var reveals = [].slice.call(document.querySelectorAll(".reveal, .reveal-group"));
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add("in"); });

    /* the nav knows where you are */
    var navLinks = [].slice.call(document.querySelectorAll(".nav-links a[data-nav]"));
    if (navLinks.length && "IntersectionObserver" in window) {
      var owner = {}, visible = {}, current = null;
      navLinks.forEach(function (a) { a.dataset.nav.split(" ").forEach(function (id) { owner[id] = a; }); });
      var secs = Object.keys(owner).map(function (id) { return document.getElementById(id); }).filter(Boolean);
      var navIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        var best = null, bestR = 0.12;
        secs.forEach(function (s) { if ((visible[s.id] || 0) > bestR) { bestR = visible[s.id]; best = s.id; } });
        var link = best ? owner[best] : null;
        if (link === current) return;
        navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        if (link) link.setAttribute("aria-current", "true");
        current = link;
      }, { threshold: [0, 0.12, 0.3, 0.5, 0.7, 1] });
      secs.forEach(function (s) { navIO.observe(s); });
    }

    /* mobile menu */
    var menu = document.getElementById("menu"),
        menuBtn = document.getElementById("menuBtn"),
        menuClose = document.getElementById("menuClose"),
        main = document.getElementById("main"),
        header = document.getElementById("nav");
    function openMenu() {
      if (!menu) return;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("open"); });
      document.body.style.overflow = "hidden";
      if (main) main.setAttribute("inert", "");
      if (header) header.setAttribute("inert", "");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
      if (menuClose) menuClose.focus({ preventScroll: true });
    }
    function closeMenu(focusTarget) {
      if (!menu || menu.hidden) return;
      menu.classList.remove("open");
      document.body.style.overflow = "";
      if (main) main.removeAttribute("inert");
      if (header) header.removeAttribute("inert");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      else if (menuBtn) menuBtn.focus({ preventScroll: true });
      setTimeout(function () { menu.hidden = true; }, reduced ? 0 : 300);
    }
    if (menuBtn) MK.on(menuBtn, "click", openMenu);
    if (menuClose) MK.on(menuClose, "click", function () { closeMenu(); });
    if (menu) {
      [].forEach.call(menu.querySelectorAll("[data-menu]"), function (a) {
        MK.on(a, "click", function () {
          var target = a.hash ? document.querySelector(a.hash) : null;
          closeMenu(target);
        });
      });
      MK.on(window, "keydown", function (e) {
        if (e.key === "Escape" && !menu.hidden) { e.preventDefault(); closeMenu(); }
      });
    }
  });

  /* ============ instruments: mounted once the fonts are in ============ */
  MK.ready(function () {
    ["drift", "arch"].forEach(function (name) {
      if (!MK.cases[name]) return;
      try { MK.cases[name](document); }
      catch (e) { console.error("instrument " + name + " failed to mount", e); }
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { (MK.instruments || []).forEach(function (i) { i.wake(); }); });
    }
  });
})();
