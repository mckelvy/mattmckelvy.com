/* mattmckelvy.com v7 — core.
   The MK kit (canvas instruments, seeded rng) plus the scene engine:
   one continuous background temperature, masked type reveals,
   scroll-linked bands, scatter→structure choreography.
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

  /* one voice for canvas type + color — v7 palette */
  MK.ui = {
    ink: "#111114", ink2: "#5F5F66", ink3: "#8A8A92",
    hair: "rgba(17,17,20,.08)", hair2: "rgba(17,17,20,.16)",
    blue: "#2036E8", blueDark: "#8FA3FF",
    amber: "#D9820B", amberDark: "#FFB340",
    light: "#F5F5F7", light2: "rgba(245,245,247,.55)", hairDark: "rgba(245,245,247,.14)"
  };
  MK.font = function (px, w) {
    return (w || 400) + " " + px + "px -apple-system, system-ui, 'Helvetica Neue', Helvetica, sans-serif";
  };

  /* An instrument: DPR-correct canvas whose rAF loop runs only while
     visible AND while draw() reports motion. */
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

  /* instruments register mount functions; v7 mounts them on the page */
  MK.cases = {};
  MK.register = function (name, mount) { MK.cases[name] = mount; };

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

  /* ============ the light engine — scene temperature ============ */
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
      var dTop = topOf("decisions"), dBot = bottomOf("decisions");
      var aTop = topOf("about"), aBot = bottomOf("about");
      var raw = [
        [0, "#F6F3EC"],
        [topOf("work") - vh * 0.55, "#FDFCFA"],
        [topOf("work") + vh * 0.2, "#FFFFFF"],
        [topOf("structure") - vh * 0.25, "#F6F3EC"],
        [dTop - vh * 0.75, "#A9A9B0"],
        [dTop - vh * 0.4, "#3C3C42"],
        [dTop - vh * 0.1, "#0B0B0D"],
        [dBot - vh * 0.9, "#0B0B0D"],
        [dBot - vh * 0.25, "#4A4A51"],
        [topOf("organizations") + vh * 0.1, "#FFFFFF"],
        [topOf("evolution") - vh * 0.2, "#F6F3EC"],
        [topOf("experience") - vh * 0.25, "#FFFFFF"],
        [aTop - vh * 0.6, "#93A2F2"],
        [aTop - vh * 0.1, "#2036E8"],
        [aBot - vh * 0.8, "#2036E8"],
        [aBot - vh * 0.5, "#8B99EE"],
        [aBot - vh * 0.15, "#F6F3EC"],
        [document.body.scrollHeight, "#F6F3EC"]
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
      if (nav) {
        nav.style.backgroundColor = "rgba(" + r + "," + g + "," + bl + ",.9)";
        nav.style.borderBottom = y > 40
          ? "1px solid " + (L < 0.5 ? "rgba(255,255,255,.12)" : "rgba(17,17,20,.08)")
          : "1px solid transparent";
        nav.classList.toggle("nav-dark", L < 0.5);
      }
      if (L < 0.6) {
        var alpha = (0.6 - L) * 0.07;
        lightEl.style.backgroundImage =
          "radial-gradient(120vw 90vh at 30% 12%, rgba(255,255,255," + alpha.toFixed(3) + "), rgba(255,255,255,0) 62%)";
      } else lightEl.style.backgroundImage = "none";
      bandsPaint();
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }

    /* scroll-linked capability bands */
    var bandEls = [].slice.call(document.querySelectorAll(".band"));
    var bandSec = document.getElementById("range");
    function bandsPaint() {
      if (reduced || !bandSec || !bandEls.length) return;
      var r = bandSec.getBoundingClientRect();
      var prog = (innerHeight - r.top);           /* px the section has travelled into view */
      bandEls.forEach(function (b) {
        var sp = parseFloat(b.dataset.speed || "0.1");
        b.style.transform = "translateX(" + (prog * sp - (sp < 0 ? -60 : 60)) + "px)";
      });
    }

    build(); paint();
    MK.on(window, "scroll", onScroll, { passive: true });
    MK.on(window, "resize", function () { build(); paint(); });
    setTimeout(function () { build(); paint(); }, 700);
    MK.lightLuma = function () { return curL; };
  });

  /* ============ page behaviors ============ */
  MK.ready(function () {

    /* legacy hashes */
    var legacy = {
      home: "top", pov: "work", approach: "work", example: "structure",
      model: "decisions", drift: "work", arch: "structure", mna: "experience",
      exp: "experience", skills: "experience", story: "experience",
      problems: "work", capabilities: "range", "case-offer": "decisions"
    };
    var h = location.hash.replace("#", "");
    if (legacy[h]) location.replace("#" + legacy[h]);

    /* reveals: soft elements + masked-line groups */
    var reveals = [].slice.call(document.querySelectorAll(".reveal, .reveal-group"));
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      reveals.forEach(function (el) { io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add("in"); });

    /* mount the working instruments */
    if (MK.cases.drift) { try { MK.cases.drift(document); } catch (e) {} }
    if (MK.cases.arch) { try { MK.cases.arch(document); } catch (e) {} }

    /* architecture stage strip — lights with the canvas timeline */
    var archStages = [].slice.call(document.querySelectorAll("#archStages .st"));
    var archHost = document.getElementById("archCanvasHost");
    var archTimers = [];
    function archLight() {
      archTimers.forEach(clearTimeout); archTimers = [];
      archStages.forEach(function (s) { s.classList.remove("on"); });
      [80, 1300, 2800, 4200].forEach(function (t, i) {
        archTimers.push(setTimeout(function () {
          if (archStages[i]) archStages[i].classList.add("on");
        }, reduced ? 0 : t));
      });
    }
    if (archHost && archStages.length) {
      if ("IntersectionObserver" in window && !reduced) {
        var seen = false;
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !seen) { seen = true; archLight(); }
          });
        }, { threshold: 0.35 }).observe(archHost);
      } else archStages.forEach(function (s) { s.classList.add("on"); });
      var replay = document.getElementById("archReplay");
      if (replay) MK.on(replay, "click", archLight);
    }

    /* organizations: scatter → column */
    var org = document.getElementById("org"), stage = document.getElementById("orgStage");
    if (org && stage) {
      var words = [].slice.call(stage.querySelectorAll(".org-word"));
      var scatter = [
        [0.04, 0.06, -7], [0.52, 0.02, 5], [0.66, 0.34, -4],
        [0.10, 0.44, 6], [0.42, 0.62, -6], [0.68, 0.78, 4], [0.16, 0.86, -3]
      ];
      function place(final) {
        var W = stage.clientWidth, H = stage.clientHeight;
        var rowH = Math.min(58, (H - 46) / words.length);
        var colTop = (H - rowH * words.length - 14) / 2;
        words.forEach(function (w, i) {
          if (!final) {
            var s = scatter[i] || [0.3, 0.3, 0];
            w.style.transform = "translate(" + Math.round(s[0] * (W - w.offsetWidth)) + "px," +
              Math.round(s[1] * (H - 46)) + "px) rotate(" + s[2] + "deg)";
          } else {
            var y = colTop + i * rowH + (i === words.length - 1 ? 14 : 0);
            w.style.transitionDelay = (i * 90) + "ms";
            w.style.transform = "translate(0px," + Math.round(y) + "px) rotate(0deg)";
          }
        });
      }
      var resolved = false;
      place(reduced);
      if (reduced) org.classList.add("resolved");
      else if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !resolved) {
              resolved = true;
              org.classList.add("resolved");
              place(true);
            }
          });
        }, { threshold: 0.35 }).observe(stage);
      }
      MK.on(window, "resize", function () { place(resolved || reduced); });
    }

    /* evolution steps — light in sequence when seen */
    var evo = document.getElementById("evoSteps");
    if (evo) {
      var ws = [].slice.call(evo.querySelectorAll(".w"));
      function lightEvo() {
        ws.forEach(function (w, i) {
          setTimeout(function () {
            w.classList.add("lit");
            if (i === ws.length - 1) w.classList.add("now");
          }, reduced ? 0 : 260 * i);
        });
      }
      if ("IntersectionObserver" in window && !reduced) {
        var evoSeen = false;
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting && !evoSeen) { evoSeen = true; lightEvo(); } });
        }, { threshold: 0.5 }).observe(evo);
      } else lightEvo();
    }

    /* the one meaningful counter */
    var big = document.getElementById("bigCount");
    if (big) {
      var target = parseInt(big.dataset.n, 10) || 25000;
      function runCount() {
        if (reduced) { big.textContent = target.toLocaleString("en-US"); return; }
        var t0 = performance.now(), dur = 1300;
        (function tick(now) {
          var t = MK.clamp((now - t0) / dur, 0, 1);
          big.textContent = Math.round(target * MK.easeOut(t)).toLocaleString("en-US");
          if (t < 1) requestAnimationFrame(tick);
        })(t0);
      }
      if ("IntersectionObserver" in window && !reduced) {
        var cSeen = false;
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting && !cSeen) { cSeen = true; runCount(); } });
        }, { threshold: 0.6 }).observe(big);
      } else big.textContent = target.toLocaleString("en-US");
    }

    /* mobile menu */
    var menu = document.getElementById("menu"),
        menuBtn = document.getElementById("menuBtn"),
        menuClose = document.getElementById("menuClose");
    function openMenu() {
      if (!menu) return;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("open"); });
      document.body.classList.add("menu-open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
      if (menuClose) menuClose.focus({ preventScroll: true });
    }
    function closeMenu() {
      if (!menu || menu.hidden) return;
      menu.classList.remove("open");
      document.body.classList.remove("menu-open");
      if (menuBtn) { menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus({ preventScroll: true }); }
      setTimeout(function () { menu.hidden = true; }, reduced ? 0 : 340);
    }
    if (menuBtn) MK.on(menuBtn, "click", openMenu);
    if (menuClose) MK.on(menuClose, "click", closeMenu);
    if (menu) {
      [].forEach.call(menu.querySelectorAll("[data-menu]"), function (a) {
        MK.on(a, "click", function () { closeMenu(); });
      });
      MK.on(window, "keydown", function (e) {
        if (e.key === "Escape" && !menu.hidden) { e.preventDefault(); closeMenu(); }
      });
    }

    /* local time, Pacific */
    var pt = document.getElementById("ptTime");
    if (pt) {
      var fmt;
      try {
        fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
      } catch (e) { fmt = null; }
      function tickTime() { if (fmt) pt.textContent = "Local " + fmt.format(new Date()) + " PT"; }
      tickTime();
      setInterval(tickTime, 30000);
    }

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

    /* ============ ⌘K palette ============ */
    var wrap = document.getElementById("palWrap"),
        input = document.getElementById("palInput"),
        list = document.getElementById("palList"),
        lastFocus = null, sel = 0, shown = [];
    if (!wrap) return;

    var ITEMS = [
      { t: "Top", k: "go", id: "#top", kw: "home hero identity what work is worth" },
      { t: "The range", k: "go", id: "#range", kw: "capabilities bands compensation analytics systems" },
      { t: "01 · Signal · the range drift", k: "go", id: "#work", kw: "attrition market pricing apjc benchmark drift" },
      { t: "02 · Structure · job architecture", k: "go", id: "#structure", kw: "titles families levels architecture ai workday" },
      { t: "03 · Decisions · the offer system", k: "go", id: "#decisions", kw: "offer model exceptions compa penetration lab dark" },
      { t: "04 · Organizations · workforce strategy", k: "go", id: "#organizations", kw: "signals headcount tenure org design playbook" },
      { t: "The operating system", k: "go", id: "#evolution", kw: "tools spreadsheet ai evolution" },
      { t: "Experience", k: "go", id: "#experience", kw: "cisco five years cv resume history" },
      { t: "Off the clock", k: "go", id: "#about", kw: "about personal squash tennis pebble beach competing" },
      { t: "Contact", k: "go", id: "#contact", kw: "email talk reach" },
      { t: "Download résumé", k: "pdf", act: "resume", kw: "cv download resume pdf" },
      { t: "Contact info", k: "act", act: "email", kw: "mail email contact reach out" },
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
      } else if (it.act === "email") window.open("contact.html", "_blank", "noopener");
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
