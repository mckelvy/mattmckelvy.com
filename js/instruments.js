/* The hero field — a market of faint points that reveals its structure
   under your attention. Plus the acquisition ladder. */
(function () {
  "use strict";

  /* ================= HERO FIELD ================= */
  MK.ready(function () {
    var host = document.getElementById("heroField");
    if (!host) return;

    var fine = false;
    try { fine = matchMedia("(pointer:fine)").matches; } catch (e) {}

    var dots = [], W = 0, H = 0, t0 = 0;
    var sweepT = -4; /* autonomous sweep for touch devices */

    function build(w, h) {
      W = w; H = h;
      var rnd = MK.rng(4021);
      var n = Math.min(1100, Math.round((w * h) / 1600));
      dots = [];
      var baseline = h * 0.86;
      var cx = w * 0.58, sig = w * 0.30, hill = h * 0.52;
      function bell(x) { var z = (x - cx) / sig; return Math.exp(-z * z); }
      for (var i = 0; i < n; i++) {
        var x = rnd() * w;
        var u = Math.pow(rnd(), 1.6);              /* dense near baseline */
        var env = bell(x) * hill + 14;
        var y = baseline - u * env;
        /* percentile contour this dot belongs to (5 bands) */
        var band = Math.min(4, Math.floor(u * 5));
        var contourY = baseline - ((band + 0.5) / 5) * env;
        dots.push({
          x: x, hy: y, cy: contourY, y: y,
          band: band,
          a: 0.04 + rnd() * 0.05,
          ph: rnd() * Math.PI * 2,
          sp: 0.25 + rnd() * 0.5,
          k: 0
        });
      }
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt, self) {
      t0 += dt;
      var p = self.pointer;
      /* autonomous sweep on touch: a slow pass of attention every ~16s */
      var vx = null, vk = 1;
      if (fine && p) { vx = p; }
      else if (!fine) {
        sweepT += dt;
        var period = 16;
        var ph = (sweepT % period) / period;
        if (ph > 0 && ph < 0.38) {
          var sx = MK.easeOut(ph / 0.38) * (w * 1.2) - w * 0.1;
          vx = { x: sx, y: h * 0.72 };
          vk = 0.55;
        }
      }
      var R = Math.max(130, w * 0.11);
      var dark = MK.lightLuma ? MK.lightLuma() < 0.5 : false;

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var drift = Math.sin(t0 * d.sp + d.ph) * 2.2;
        var target = 0;
        if (vx) {
          var dx = d.x - vx.x, dy = (d.hy - vx.y) * 0.55;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R) target = MK.ease(1 - dist / R) * vk;
        }
        d.k += (target - d.k) * Math.min(1, dt * (target > d.k ? 6 : 2.2));
        var y = MK.lerp(d.hy + drift, d.cy, MK.ease(d.k));
        d.y = y;
        var alpha = d.a + d.k * 0.26;
        if (d.band === 2 && d.k > 0.35) {
          ctx.fillStyle = "rgba(0,102,204," + (d.k * 0.5).toFixed(3) + ")";
        } else {
          ctx.fillStyle = "rgba(29,29,31," + alpha.toFixed(3) + ")";
        }
        var r = 1.1 + d.k * 0.7;
        ctx.beginPath();
        ctx.arc(d.x, y, r, 0, 6.2832);
        ctx.fill();
      }
      if (MK.reduced) return false;
      return true; /* the field breathes while visible */
    }, function (inst) {
      inst.onResize = function (w, h) { build(w, h); };
    });
    if (!inst) return;
    build(inst.w || host.clientWidth, inst.h || host.clientHeight);

    /* the field belongs to the hero: soft parallax + fade on scroll */
    var canvas = inst.canvas;
    var fading = false;
    function onScroll() {
      if (fading) return;
      fading = true;
      requestAnimationFrame(function () {
        fading = false;
        var y = scrollY;
        canvas.style.transform = "translateY(" + (y * 0.22).toFixed(1) + "px)";
        canvas.style.opacity = String(MK.clamp(1 - y / (innerHeight * 0.9), 0, 1));
      });
    }
    MK.on(window, "scroll", onScroll, { passive: true });

    /* the hero canvas ignores clicks — let text be selectable above it */
    host.style.pointerEvents = "none";
    /* but we still need pointer positions: read from window */
    MK.on(window, "pointermove", function (e) {
      if (!fine) return;
      var r = canvas.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) { inst.pointer = null; return; }
      inst.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      inst.wake();
    }, { passive: true });
  });

  /* ================= THE TRANSLATION LADDER ================= */
  MK.register("mna", function (root) {
    var host = root.querySelector("#mnaHost");
    if (!host) return;
    host.classList.add("live");
    host.style.position = "relative";

    var LEFT = [
      { id: "A1", name: "Associate" },
      { id: "A2", name: "Mid-level" },
      { id: "A3", name: "Senior" },
      { id: "A4", name: "Staff" },
      { id: "A5", name: "Principal" },
      { id: "M1", name: "Manager" }
    ];
    var RIGHT = ["Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
    var MAPS = [
      { from: 0, to: [0], note: "Associate → Grade 5. Clean. Most of the organization maps like this." },
      { from: 1, to: [1], note: "Mid-level → Grade 6. Clean, though the title changes — translation includes vocabulary." },
      { from: 2, to: [2], note: "Senior → Grade 7. “Senior” means something different in each company. Same work, new label." },
      { from: 3, to: [3, 4], note: "Staff → Grade 8 or 9. It splits on scope, not tenure. This is where the judgment lives." },
      { from: 4, to: [5], note: "Principal → Grade 10. Maps high — level them down and you build a retention problem on day one." },
      { from: 5, to: [3, 4], note: "Manager → Grade 8 or 9. People-manager scope isn’t a grade. Calibrate to span and business size." }
    ];

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 960 340");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.cssText = "width:100%;height:calc(100% - 58px);display:block";
    host.appendChild(svg);

    var note = document.createElement("p");
    note.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:48px;margin:0;font-size:17px;line-height:1.4;letter-spacing:-.019em;color:#6E6E73;text-align:center;transition:opacity .3s";
    note.setAttribute("aria-live", "polite");
    host.appendChild(note);

    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }

    var LX = 232, RX = 728, TOP = 44, ROW = 50;
    function rowY(i) { return TOP + i * ROW; }

    var head = "font:600 13px -apple-system,system-ui,'Helvetica Neue',sans-serif;letter-spacing:-.01px";
    el("text", { x: LX, y: 14, "text-anchor": "end", fill: "#86868B", style: head }).textContent = "Acquired company";
    el("text", { x: RX, y: 14, "text-anchor": "start", fill: "#86868B", style: head }).textContent = "Host architecture";

    var pathEls = [], leftEls = [], rightEls = [];
    MAPS.forEach(function (m, mi) {
      m.to.forEach(function (ti) {
        var y1 = rowY(m.from), y2 = rowY(ti);
        var p = el("path", {
          d: "M " + (LX + 24) + " " + y1 + " C " + (LX + 180) + " " + y1 + ", " + (RX - 180) + " " + y2 + ", " + (RX - 24) + " " + y2,
          fill: "none", stroke: "rgba(0,0,0,.14)", "stroke-width": 1.5,
          "stroke-dasharray": m.to.length > 1 ? "0.1 8" : "none",
          "stroke-linecap": "round"
        });
        p.dataset.map = mi;
        pathEls.push(p);
      });
    });
    LEFT.forEach(function (l, i) {
      var g = el("g", { style: "cursor:pointer", tabindex: "0", role: "button" });
      g.setAttribute("aria-label", l.name + " — show mapping");
      g.dataset.map = i;
      var y = rowY(i);
      el("rect", { x: 0, y: y - 20, width: LX + 40, height: 40, fill: "transparent" }, g);
      var t = el("text", { x: LX, y: y + 6, "text-anchor": "end", fill: "#1D1D1F",
        style: "font:400 19px -apple-system,system-ui,'Helvetica Neue',sans-serif;letter-spacing:-.02px" }, g);
      t.textContent = l.name;
      g._label = t;
      leftEls.push(g);
    });
    RIGHT.forEach(function (r, i) {
      var y = rowY(i);
      var t = el("text", { x: RX, y: y + 6, "text-anchor": "start", fill: "#6E6E73",
        style: "font:400 19px -apple-system,system-ui,'Helvetica Neue',sans-serif;letter-spacing:-.02px" });
      t.textContent = r;
      rightEls.push(t);
    });

    var active = -1;
    function setActive(mi) {
      active = mi;
      pathEls.forEach(function (p) {
        var on = +p.dataset.map === mi;
        p.setAttribute("stroke", on ? "#0066CC" : mi === -1 ? "rgba(0,0,0,.14)" : "rgba(0,0,0,.06)");
        p.setAttribute("stroke-width", on ? 2 : 1.5);
      });
      leftEls.forEach(function (g, i) {
        g._label.setAttribute("fill", i === mi ? "#0066CC" : mi === -1 ? "#1D1D1F" : "#86868B");
      });
      rightEls.forEach(function (t, i) {
        var hot = mi >= 0 && MAPS[mi].to.indexOf(i) !== -1;
        t.setAttribute("fill", hot ? "#0066CC" : "#6E6E73");
      });
      note.textContent = mi >= 0 ? MAPS[mi].note : "Hover a level. Some map cleanly — the interesting ones don’t.";
    }
    leftEls.forEach(function (g, i) {
      MK.on(g, "pointerenter", function () { setActive(i); });
      MK.on(g, "focus", function () { setActive(i); });
      MK.on(g, "click", function () { setActive(active === i ? -1 : i); });
      MK.on(g, "keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(active === i ? -1 : i); } });
    });
    MK.on(svg, "pointerleave", function () { setActive(-1); });
    setActive(-1);
  });
})();
