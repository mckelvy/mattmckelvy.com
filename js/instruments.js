/* The hero field: a market of faint points that reveals its structure
   under your attention. */
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
          ctx.fillStyle = "rgba(32,54,232," + (d.k * 0.5).toFixed(3) + ")";
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

    /* the hero canvas ignores clicks, so text stays selectable above it */
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
})();
