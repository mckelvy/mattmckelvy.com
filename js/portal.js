/* ============================================================
   The portal — mattmckelvy.com

   A harmonic figure drawn as a family of thin curves, blended
   additively so the overlaps build their own light. It breathes,
   precesses, drifts through its harmonics, leans toward the
   pointer, and pulses every few seconds — alive, not looping.

   Canvas 2D only. Fully isolated: delete this file,
   css/portal.css and the two includes in index.html and the
   site returns to exactly what it was.
   ============================================================ */
var PORTAL_CONFIG = { enabled: true };

(function () {
  "use strict";
  if (!PORTAL_CONFIG.enabled) return;

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var mobile = innerWidth < 700;

  /* show once per session; deep links and ?noportal go straight in */
  var eligible = true;
  try { eligible = !sessionStorage.getItem("mkEntered"); } catch (e) {}
  if (!eligible || location.hash || /noportal/.test(location.search)) return;

  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };

  /* ---------------- palette ----------------
     cyan → the site's own blue → violet. Low alpha; the additive
     overlaps do the work, so nothing has to shout. */
  var STOPS = [
    [ 96, 214, 255],
    [ 41, 151, 255],
    [140, 110, 250]
  ];
  function tone(u, alpha) {
    var x = clamp(u, 0, 1) * (STOPS.length - 1);
    var i = Math.min(Math.floor(x), STOPS.length - 2);
    var f = x - i, a = STOPS[i], b = STOPS[i + 1];
    return "rgba(" + Math.round(lerp(a[0], b[0], f)) + "," +
                     Math.round(lerp(a[1], b[1], f)) + "," +
                     Math.round(lerp(a[2], b[2], f)) + "," + alpha + ")";
  }

  /* ---------------- build ---------------- */
  var ov = document.createElement("div");
  ov.className = "portal";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-label", "Enter Matthew McKelvy’s site");

  var canvas = document.createElement("canvas");
  canvas.className = "portal-canvas";
  canvas.setAttribute("aria-hidden", "true");
  ov.appendChild(canvas);

  /* the figure carries a hit area of its own — the whole thing is a door.
     Pointer convenience only: the visible Enter button is the control a
     keyboard or screen reader gets, so the tab order stays honest. */
  var hit = document.createElement("button");
  hit.className = "portal-hit";
  hit.type = "button";
  hit.tabIndex = -1;
  hit.setAttribute("aria-hidden", "true");
  ov.appendChild(hit);

  var copy = document.createElement("div");
  copy.className = "portal-copy";
  copy.innerHTML =
    '<p class="portal-name">Matthew McKelvy</p>' +
    '<p class="portal-role">Compensation &amp; workforce strategy</p>' +
    '<button class="portal-enter" type="button">Enter' +
    '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
    '<path d="M2 6h8M6.6 2.6 10 6l-3.4 3.4" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  ov.appendChild(copy);

  var wash = document.createElement("div");
  wash.className = "portal-wash";
  ov.appendChild(wash);

  document.body.appendChild(ov);
  var prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  scrollTo(0, 0);

  /* the site behind is genuinely out of reach while the portal is up —
     otherwise Tab walks through a page nobody can see */
  var held = [];
  [].forEach.call(document.body.children, function (el) {
    if (el === ov || el.hasAttribute("inert")) return;
    el.setAttribute("inert", "");
    el.setAttribute("aria-hidden", "true");
    held.push(el);
  });
  function release() {
    held.forEach(function (el) {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
    });
    held = [];
  }

  var enterBtn = copy.querySelector(".portal-enter");

  /* ---------------- canvas ---------------- */
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(devicePixelRatio || 1, 2);
  var W = 0, H = 0, cx = 0, cy = 0, R = 0;

  var LINES = mobile ? 30 : 46;
  var SEGS = mobile ? 110 : 156;

  /* particles — slow, sparse, barely there */
  var DUST = [];
  (function seedDust() {
    var seed = 20260825;
    function rnd() {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    }
    var n = mobile ? 34 : 62;
    for (var i = 0; i < n; i++) {
      DUST.push({
        x: rnd(), y: rnd(),
        r: 0.6 + rnd() * 1.3,
        v: 0.004 + rnd() * 0.012,
        ph: rnd() * TAU,
        tw: 0.4 + rnd() * 1.4,
        u: rnd()
      });
    }
  })();

  function size() {
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H * (mobile ? 0.34 : 0.385);
    R = Math.min(W * 0.30, H * 0.215);
    /* the light blooms from wherever the figure actually is */
    ov.style.setProperty("--portal-cy", (cy / H * 100).toFixed(2) + "%");
    /* keep the figure's own hit area on top of it */
    var d = R * 2.15;
    hit.style.width = d + "px";
    hit.style.height = d + "px";
    hit.style.left = cx + "px";
    hit.style.top = cy + "px";
  }

  /* ---------------- state ----------------
     Everything that makes it feel alive is a slow, incommensurate
     oscillator — nothing here repeats on a visible cycle. */
  var T = 0;                       // seconds of life
  var px = 0, py = 0;              // pointer, normalized −1..1
  var leanX = 0, leanY = 0;        // sprung lean toward the pointer
  var attn = 0, attnT = 0;         // attention: brightens when addressed
  var pulse = 0, nextPulse = 3.4;  // periodic ripple
  var bloom = 0, blooming = false; // the entry
  var running = true, gone = false;

  function harmonics(u, th) {
    /* three drifting harmonics; u twists the ribbon so the family
       weaves through itself and builds the moiré */
    var p = u * (2.35 + 0.5 * Math.sin(T * 0.07));
    var a1 = 0.150 + 0.035 * Math.sin(T * 0.13) + attn * 0.030;
    var a2 = 0.086 + 0.026 * Math.sin(T * 0.19 + 1.7);
    var a3 = 0.052 + 0.020 * Math.sin(T * 0.11 + 4.1);
    var r = 1
      + a1 * Math.sin(3 * th + T * 0.22 + p * 1.65)
      + a2 * Math.sin(5 * th - T * 0.17 + p * 1.12)
      + a3 * Math.sin(2 * th + T * 0.10 + p * 2.30);
    if (pulse > 0.001) {
      /* a ring travelling outward through the family */
      r += pulse * 0.085 * Math.sin(th * 4 - T * 2.6 + u * 5.2);
    }
    return r;
  }

  function frame(dt) {
    T += dt;

    /* pointer lean, sprung */
    leanX += (px * (mobile ? 0 : 26) - leanX) * Math.min(1, dt * 2.4);
    leanY += (py * (mobile ? 0 : 16) - leanY) * Math.min(1, dt * 2.4);
    attn += (attnT - attn) * Math.min(1, dt * 3.2);

    /* the pulse: a slow heartbeat, never quite on the beat */
    nextPulse -= dt;
    if (nextPulse <= 0) { pulse = 1; nextPulse = 5.5 + Math.random() * 3.5; }
    if (pulse > 0) pulse = Math.max(0, pulse - dt * 0.62);

    if (blooming) bloom = Math.min(1, bloom + dt * 0.95);

    var b = easeOut(bloom);
    var breath = 1 + 0.026 * Math.sin(T * 0.42) + 0.014 * Math.sin(T * 0.71 + 2.1);
    var scale = breath * (1 + b * 2.4) * (1 + attn * 0.028);
    var rot = T * 0.055 + b * 0.55;
    var fade = 1 - b;
    var fx = cx + leanX, fy = cy + leanY;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";

    /* --- the deep field: slow horizontal ribbons, far behind --- */
    var bands = mobile ? 2 : 3, perBand = mobile ? 7 : 10;
    for (var bi = 0; bi < bands; bi++) {
      var by = H * (0.30 + bi * 0.22);
      var amp = H * (0.045 + bi * 0.012);
      var k = 0.0022 + bi * 0.0007;
      for (var li = 0; li < perBand; li++) {
        var lu = li / (perBand - 1);
        ctx.beginPath();
        for (var sx = 0; sx <= W; sx += 14) {
          var yy = by
            + Math.sin(sx * k + T * (0.14 + bi * 0.05) + lu * 1.5) * amp
            + Math.sin(sx * k * 2.3 - T * 0.09 + lu * 2.6) * amp * 0.36
            + lu * 16;
          sx === 0 ? ctx.moveTo(sx, yy) : ctx.lineTo(sx, yy);
        }
        ctx.strokeStyle = tone(0.25 + bi * 0.3, (0.028 + attn * 0.008) * fade);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    /* --- dust --- */
    for (var di = 0; di < DUST.length; di++) {
      var d = DUST[di];
      var dy = (d.y - T * d.v) % 1; if (dy < 0) dy += 1;
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(T * d.tw + d.ph));
      ctx.beginPath();
      ctx.arc(d.x * W, dy * H, d.r, 0, TAU);
      ctx.fillStyle = tone(d.u, 0.30 * tw * fade);
      ctx.fill();
    }

    /* --- the figure ---
       Colour sweeps across the figure in space, not per curve, so the
       light reads cyan on one shoulder and violet on the other. */
    var rr = R * scale;
    var sweep = T * 0.09;
    var gx = Math.cos(sweep) * rr * 1.25, gy = Math.sin(sweep) * rr * 1.25;
    var grad = ctx.createLinearGradient(fx - gx, fy - gy, fx + gx, fy + gy);
    grad.addColorStop(0.00, "rgb(104,222,255)");
    grad.addColorStop(0.42, "rgb(48,158,255)");
    grad.addColorStop(0.74, "rgb(112,124,252)");
    grad.addColorStop(1.00, "rgb(168,110,246)");
    ctx.strokeStyle = grad;

    for (var i = 0; i < LINES; i++) {
      var u = i / (LINES - 1);
      ctx.beginPath();
      for (var s = 0; s <= SEGS; s++) {
        var th = (s / SEGS) * TAU;
        var rad = rr * harmonics(u, th);
        var a = th + rot;
        var x = fx + Math.cos(a) * rad;
        var y = fy + Math.sin(a) * rad * 0.93;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      /* the family fades at both ends so it reads as a ribbon, not a stack */
      var edge = Math.sin(u * Math.PI);
      ctx.globalAlpha = (0.070 + 0.095 * edge) * (1 + attn * 0.55) * fade * (1 - b * 0.35);
      ctx.lineWidth = (0.85 + edge * 0.35) * (1 - b * 0.55);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------------- loop ---------------- */
  var last = performance.now();
  function loop(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frame(dt);
    requestAnimationFrame(loop);
  }

  size();
  addEventListener("resize", function () {
    mobile = innerWidth < 700;
    size();
    if (reduced) { T = 6.2; frame(0); }
  });

  if (reduced) {
    /* one composed frame, no loop */
    T = 6.2;
    frame(0);
  } else {
    requestAnimationFrame(loop);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; }
    else if (!reduced && !gone) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  });

  /* ---------------- interaction ---------------- */
  if (!mobile && !reduced) {
    addEventListener("pointermove", function (e) {
      px = (e.clientX / W) * 2 - 1;
      py = (e.clientY / H) * 2 - 1;
      /* it notices you when you come close */
      var dx = e.clientX - (cx + leanX), dy = e.clientY - (cy + leanY);
      var near = Math.sqrt(dx * dx + dy * dy) < R * 1.5;
      attnT = near ? 0.55 : 0;
    }, { passive: true });
  }
  function listen(on) { attnT = on ? 1 : 0; }
  enterBtn.addEventListener("pointerenter", function () { listen(true); });
  enterBtn.addEventListener("pointerleave", function () { listen(false); });
  enterBtn.addEventListener("focus", function () { listen(true); });
  enterBtn.addEventListener("blur", function () { listen(false); });
  hit.addEventListener("pointerenter", function () { listen(true); });
  hit.addEventListener("pointerleave", function () { listen(false); });

  /* ---------------- entry ---------------- */
  function enter() {
    if (gone) return;
    gone = true;
    try { sessionStorage.setItem("mkEntered", "1"); } catch (e) {}
    blooming = true;
    ov.classList.add("is-entering");
    hit.disabled = true; enterBtn.disabled = true;

    var delay = reduced ? 120 : 860;
    setTimeout(function () {
      ov.style.opacity = "0";
      setTimeout(function () {
        running = false;
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        document.body.style.overflow = prevOverflow;
        release();
        var main = document.getElementById("main");
        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
          main.removeAttribute("tabindex");
        }
      }, reduced ? 60 : 360);
    }, delay);
  }

  enterBtn.addEventListener("click", enter);
  hit.addEventListener("click", enter);
  addEventListener("keydown", function (e) {
    if (gone) return;
    /* Escape is the skip; Enter/Space work through the focused button */
    if (e.key === "Escape") { e.preventDefault(); enter(); }
  });
})();
