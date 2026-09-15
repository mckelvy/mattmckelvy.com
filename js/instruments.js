/* The hero field: a market of faint points that reveals its structure
   under your attention. It breathes for a moment on arrival, sweeps
   once so a visitor sees it is alive, keeps a faint median contour as
   its idea at rest, then sleeps until touched. */
(function () {
  "use strict";

  MK.ready(function () {
    var host = document.getElementById("heroField");
    if (!host) return;
    var copy = document.querySelector(".hero-copy");

    var fine = MK.fine && !MK.coarse;
    var dots = [], W = 0, H = 0, born = performance.now();
    var passDone = false;
    var faded = false;
    var amp = 1;                 /* breathing amplitude, eased in and out */
    var lastMove = 0;
    var apex = { x: 0, y: 0 };
    var inkRGB = [28, 27, 24];
    var hueRGB = [43, 73, 188];
    var SWEEP_AT = 0.8, SWEEP_LEN = 3.4, PERIOD = 18;
    var wakeTimer = null;

    function build(w, h) {
      W = w; H = h;
      var rnd = MK.rng(4021);
      var wide = w > 900;
      /* the field stays clear of the copy: right of the measure on wide
         screens, below the last line on narrow ones */
      var copyBottom = 0, copyRight = 0;
      if (copy) {
        var cr = copy.getBoundingClientRect(), hr = host.getBoundingClientRect();
        copyBottom = cr.bottom - hr.top;
        copyRight = cr.right - hr.left;
      }
      var baseline = h - 26;
      var cx, sig, hill, x0;
      if (wide) {
        x0 = Math.max(w * 0.52, Math.min(w * 0.6, copyRight * 0.62 + 40));
        cx = x0 + (w - x0) * 0.56; sig = (w - x0) * 0.36; hill = h * 0.66;
      } else {
        x0 = 0;
        cx = w * 0.64; sig = w * 0.26;
        hill = Math.max(70, baseline - (copyBottom + 28));
      }
      var n = Math.min(1400, Math.round(((w - x0) * h) / (wide ? 780 : 1150)));
      dots = [];
      function bell(x) { var z = (x - cx) / sig; return Math.exp(-z * z); }
      for (var i = 0; i < n; i++) {
        var x = x0 + rnd() * (w - x0);
        var u = Math.pow(rnd(), 1.55);
        var env = bell(x) * hill + 4;
        var y = baseline - u * env;
        if (!wide && y < copyBottom + 18) continue;
        var band = Math.min(4, Math.floor(u * 5));
        var contourY = baseline - ((band + 0.5) / 5) * env;
        dots.push({
          x: x, hy: y, cy: contourY, y: y,
          band: band,
          a: 0.15 + rnd() * 0.12,
          ph: rnd() * Math.PI * 2,
          sp: 0.25 + rnd() * 0.5,
          k: 0
        });
      }
      apex.x = cx; apex.y = baseline - (2.5 / 5) * (hill + 4);
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt, self) {
      var now = performance.now();
      var age = (now - born) / 1000;
      var p = self.pointer;
      if (p && now - lastMove > 1200) p = null;          /* a resting pointer is not attention */
      var vx = null, vk = 1, sweeping = false;
      if (fine && p) vx = p;

      /* the autonomous sweep: once on arrival for everyone, again every
         18 s on touch devices, where there is no pointer to notice */
      var sweepAge = -1;
      if (age >= SWEEP_AT && age < SWEEP_AT + SWEEP_LEN) sweepAge = age - SWEEP_AT;
      else if (!fine) { var ph = (age - SWEEP_AT) % PERIOD; if (age > SWEEP_AT + SWEEP_LEN && ph < SWEEP_LEN) sweepAge = ph; }
      if (age >= SWEEP_AT + SWEEP_LEN) passDone = true;
      if (!vx && sweepAge >= 0) {
        vx = { x: MK.easeOut(sweepAge / SWEEP_LEN) * (w * 1.2) - w * 0.1, y: h * 0.72 };
        vk = 0.6; sweeping = true;
      }

      /* breathing eases in on arrival, eases out after, returns with attention */
      var ampT = (age < 6 || vx) ? 1 : 0;
      amp += (ampT - amp) * Math.min(1, dt * (ampT > amp ? 3 : 1.6));
      if (amp < 0.01) amp = 0;

      var R = Math.max(140, w * 0.12);
      var anyK = false;
      var rest = passDone ? 0.3 : 0;   /* the median contour stays, faintly, as the idea at rest */

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var drift = amp ? Math.sin(age * d.sp + d.ph) * 2.2 * amp : 0;
        var target = d.band === 2 ? rest : 0;
        if (vx) {
          var dx = d.x - vx.x, dy = (d.hy - vx.y) * 0.55;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R) target = Math.max(target, MK.ease(1 - dist / R) * vk);
        }
        var dk = (target - d.k) * Math.min(1, dt * (target > d.k ? 6 : 2.2));
        d.k += dk;
        if (Math.abs(dk) > 0.0008) anyK = true;
        else d.k = target;
        var y = MK.lerp(d.hy + drift, d.cy, MK.ease(d.k));
        d.y = y;
        var alpha = d.a + d.k * 0.34;
        if (d.band === 2 && d.k > 0.2) {
          ctx.fillStyle = "rgba(" + hueRGB.join(",") + "," + (0.18 + d.k * 0.5).toFixed(3) + ")";
        } else {
          ctx.fillStyle = "rgba(" + inkRGB.join(",") + "," + alpha.toFixed(3) + ")";
        }
        var r = 1.35 + d.k * 0.8;
        ctx.beginPath();
        ctx.arc(d.x, y, r, 0, 6.2832);
        ctx.fill();
      }
      /* the contour's name, once it has settled */
      if (passDone && !vx) {
        ctx.globalAlpha = MK.clamp((age - SWEEP_AT - SWEEP_LEN) / 1.2, 0, 1) * 0.9;
        ctx.font = MK.font(12.5, 500); ctx.fillStyle = MK.theme.cobaltText; ctx.textAlign = "left";
        ctx.fillText("P50", apex.x + 10, apex.y - 4);
        ctx.globalAlpha = 1;
      }
      if (MK.reduced || faded) return false;
      var busy = !!vx || sweeping || anyK || amp > 0 || age < SWEEP_AT + SWEEP_LEN + 1.4;
      if (!busy && !fine) {
        /* touch: sleep until the next sweep instead of counting down on the clock */
        var untilNext = PERIOD - ((age - SWEEP_AT) % PERIOD);
        clearTimeout(wakeTimer);
        wakeTimer = setTimeout(function () { if (!faded) inst.wake(); }, Math.max(200, untilNext * 1000));
      }
      return busy;
    }, function (inst) {
      inst.onResize = function (w, h) { build(w, h); };
    });
    if (!inst) return;
    build(inst.w || host.clientWidth, inst.h || host.clientHeight);

    /* the field belongs to the hero: soft parallax + fade on scroll, and it sleeps once faded */
    var canvas = inst.canvas;
    var fading = false;
    function onScroll() {
      if (fading) return;
      fading = true;
      requestAnimationFrame(function () {
        fading = false;
        var y = scrollY;
        var op = MK.clamp(1 - y / (innerHeight * 0.9), 0, 1);
        canvas.style.transform = "translateY(" + (y * 0.22).toFixed(1) + "px)";
        canvas.style.opacity = String(op);
        var nowFaded = op < 0.02;
        if (nowFaded !== faded) { faded = nowFaded; if (!faded) inst.wake(); }
      });
    }
    MK.on(window, "scroll", onScroll, { passive: true });

    /* the hero canvas ignores clicks, so text stays selectable above it;
       pointer positions come from the window instead */
    host.style.pointerEvents = "none";
    function clearPointer() { inst.pointer = null; inst.wake(); }
    MK.on(window, "pointermove", function (e) {
      if (!fine) return;
      var r = canvas.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) { inst.pointer = null; return; }
      inst.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      lastMove = performance.now();
      inst.wake();
    }, { passive: true });
    MK.on(document.documentElement, "mouseleave", clearPointer);
    MK.on(window, "blur", clearPointer);
    MK.on(document, "visibilitychange", function () { if (document.hidden) inst.pointer = null; else inst.wake(); });
  });
})();
