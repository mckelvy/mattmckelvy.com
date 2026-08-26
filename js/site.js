/* mattmckelvy.com v5 — core.
   The MK kit (canvas instruments, springs, seeded rng) plus the light
   engine: one continuous background color travelling with scroll.
   No dependencies. */
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

  /* one voice for canvas type + color */
  MK.ui = {
    ink: "#1D1D1F", ink2: "#6E6E73", ink3: "#86868B",
    hair: "rgba(0,0,0,.08)", hair2: "rgba(0,0,0,.16)",
    blue: "#0066CC", blueDark: "#2997FF",
    amber: "#D9820B", amberDark: "#FFB340",
    light: "#F5F5F7", light2: "rgba(245,245,247,.55)", hairDark: "rgba(245,245,247,.14)"
  };
  MK.font = function (px, w) {
    return (w || 400) + " " + px + "px -apple-system, system-ui, 'Helvetica Neue', Helvetica, sans-serif";
  };

  /* An instrument: DPR-correct canvas whose rAF loop runs only while
     visible AND while draw() reports motion. draw -> true keeps running. */
  MK.instrument = function (host, draw, setup) {
    if (!host) return null;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    host.classList.add("live");
    host.appendChild(canvas);

    var inst = { host: host, canvas: canvas, ctx: ctx, w: 0, h: 0, visible: false, running: false, pointer: null };
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
    MK.on(c, "pointerleave", function () { inst.pointer = null; if (handlers.leave) handlers.leave(); inst.wake(); });
  };

  MK.ready = function (fn) {
    var did = false;
    function once() { if (!did) { did = true; fn(); } }
    function go() {
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(once); setTimeout(once, 1200); }
      else once();
    }
    if (document.readyState === "loading") MK.on(document, "DOMContentLoaded", go);
    else go();
  };

  /* ============ the light engine ============ */
  MK.ready(function () {
    var lightEl = document.getElementById("light");
    var nav = document.getElementById("nav");
    if (!lightEl) return;

    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var stops = [];

    function build() {
      var vh = innerHeight;
      function topOf(id) { var el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY : 0; }
      function bottomOf(id) { var el = document.getElementById(id); return el ? el.getBoundingClientRect().bottom + scrollY : 0; }
      var labTop = topOf("case-offer"), labBot = bottomOf("case-offer");
      /* the sticky architecture scene releases at runwayBottom - vh;
         daylight holds until the visitor has scrolled past it */
      var runB = bottomOf("archRunway");
      var raw = [
        [0, "#FFFFFF"],
        [topOf("work") - vh * 0.6, "#FBFAF9"],
        [topOf("case-drift") - vh * 0.4, "#F4F3F1"],
        [bottomOf("case-drift") - vh * 0.6, "#F4F3F1"],
        [topOf("case-architecture") - vh * 0.2, "#FAFAFA"],
        [runB - vh - 200, "#F4F4F5"],
        [runB - vh + 340, "#E8E8EB"],
        [labTop - vh * 0.72, "#98989E"],
        [labTop - vh * 0.42, "#3A3A3F"],
        [labTop - vh * 0.12, "#0C0C0D"],
        [labTop + vh * 0.4, "#060607"],
        [labBot - vh * 0.9, "#060607"],
        [labBot - vh * 0.25, "#3F3F44"],
        [topOf("case-mna") - vh * 0.35, "#D9D9DD"],
        [topOf("case-mna") + vh * 0.2, "#F2F2F4"],
        [topOf("experience") - vh * 0.4, "#FBFBFC"],
        [topOf("capabilities") - vh * 0.3, "#F6F6F7"],
        [topOf("about") - vh * 0.3, "#F3F3F5"],
        [topOf("contact") - vh * 0.4, "#FBFBFC"],
        [document.body.scrollHeight, "#FFFFFF"]
      ];
      raw.sort(function (a, b) { return a[0] - b[0]; });
      stops = raw.map(function (s) { return { y: s[0], c: hex(s[1]) }; });
    }

    var curL = 1, ticking = false;
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
      var L = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
      curL = L;
      /* the nav sits in the same light, so passing content never collides */
      if (nav) {
        nav.style.backgroundColor = "rgba(" + r + "," + g + "," + bl + ",.92)";
        nav.style.borderBottom = y > 40
          ? "1px solid " + (L < 0.45 ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.07)")
          : "1px solid transparent";
      }
      /* a soft halo of light, visible only as the page darkens */
      if (L < 0.72) {
        var alpha = (0.72 - L) * 0.09;
        var px = 34 + (y * 0.012) % 30;
        var py = 18 + Math.sin(y * 0.0006) * 14;
        lightEl.style.backgroundImage =
          "radial-gradient(120vw 90vh at " + px + "% " + py + "%, rgba(255,255,255," + alpha.toFixed(3) + "), rgba(255,255,255,0) 62%)";
      } else lightEl.style.backgroundImage = "none";
      if (nav) nav.classList.toggle("nav-dark", L < 0.45);
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }
    build(); paint();
    MK.on(window, "scroll", onScroll, { passive: true });
    MK.on(window, "resize", function () { build(); paint(); });
    setTimeout(function () { build(); paint(); }, 600);
    MK.lightLuma = function () { return curL; };
  });

  /* ============ page behaviors ============ */
  MK.ready(function () {

    /* legacy hashes from earlier versions */
    var legacy = { home: "top", exp: "experience", skills: "capabilities", story: "experience", problems: "work" };
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
      }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add("in"); });

    /* copy link */
    var copyBtn = document.getElementById("copyLink");
    if (copyBtn) MK.on(copyBtn, "click", function () {
      var t = copyBtn.textContent;
      function done(ok) {
        copyBtn.textContent = ok ? "Copied" : "mattmckelvy.com";
        setTimeout(function () { copyBtn.textContent = t; }, 1400);
      }
      if (navigator.clipboard) navigator.clipboard.writeText("https://mattmckelvy.com/").then(function () { done(true); }, function () { done(false); });
      else done(false);
    });

    /* ============ ⌘K palette (quiet power feature) ============ */
    var wrap = document.getElementById("palWrap"),
        input = document.getElementById("palInput"),
        list = document.getElementById("palList"),
        lastFocus = null, sel = 0, shown = [];
    if (!wrap) return;

    var ITEMS = [
      { t: "Top", k: "go", id: "#top", kw: "home hero start matthew mckelvy" },
      { t: "Work — four problems", k: "go", id: "#work", kw: "cases problems selected" },
      { t: "Benchmark drift", k: "go", id: "#case-drift", kw: "attrition apjc market benchmarking analysis 01" },
      { t: "Job architecture", k: "go", id: "#case-architecture", kw: "ai leveling families titles workday taxonomy 02" },
      { t: "Offer exceptions", k: "go", id: "#case-offer", kw: "modeling model lab offers simulator recruiting comp 03" },
      { t: "Acquisition", k: "go", id: "#case-mna", kw: "splunk m&a mapping integration merger translation 04" },
      { t: "Experience", k: "go", id: "#experience", kw: "cv resume roles cisco history gtm" },
      { t: "Capabilities", k: "go", id: "#capabilities", kw: "skills tools excel tableau workday adaptive" },
      { t: "About", k: "go", id: "#about", kw: "personal racquet pebble beach human off the clock" },
      { t: "Contact", k: "go", id: "#contact", kw: "email reach hire talk" },
      { t: "Download résumé", k: "pdf", act: "resume", kw: "cv download resume pdf" },
      { t: "Email", k: "act", act: "email", kw: "mail contact reach out" },
      { t: "LinkedIn", k: "act", act: "li", kw: "linkedin profile social" }
    ];
    function score(item, q) {
      if (!q) return 1;
      var hay = (item.t + " " + item.kw).toLowerCase();
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return 0;
      return 1;
    }
    function render(q) {
      shown = ITEMS.filter(function (it) { return score(it, q) > 0; });
      sel = 0;
      list.innerHTML = "";
      if (!shown.length) {
        var li = document.createElement("li");
        li.className = "pal-empty";
        li.textContent = "Nothing matches.";
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
        MK.on(li, "pointermove", function () { if (sel !== i) { sel = i; paintSel(); } });
        list.appendChild(li);
      });
    }
    function paintSel() {
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
    }
    function open() { lastFocus = document.activeElement; wrap.hidden = false; input.value = ""; render(""); input.focus(); }
    function close() { wrap.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    MK.on(input, "input", function () { render(input.value); });
    MK.on(window, "keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        wrap.hidden ? open() : close();
        return;
      }
      if (wrap.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); paintSel(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paintSel(); }
      else if (e.key === "Enter") { e.preventDefault(); go(); }
      else if (e.key === "Tab") { e.preventDefault(); input.focus(); }
    });
    MK.on(wrap, "click", function (e) { if (e.target === wrap) close(); });
  });
})();
