/* Exhibit B — job architecture: disorder → families → lattice.
   417 title-nodes resolve into 12 families × 6 levels. Illustrative. */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("archCanvasHost");
    var scrub = document.getElementById("archScrub");
    if (!host || !scrub) return;

    var FAMS = ["SALES","SALES ENG","MARKETING","CUST SUCCESS","RENEWALS","PARTNERS",
                "SALES OPS","ENABLEMENT","DEAL DESK","ANALYTICS","PROGRAMS","COMMS"];
    var LVLS = ["IC1","IC2","IC3","IC4","M1","M2"];
    var LVL_W = [0.26,0.24,0.20,0.15,0.09,0.06];
    var COUNT = 417, DUPS = 46;

    var rnd = MK.rng(1207);
    var nodes = [];
    (function build() {
      /* real nodes */
      var per = [];
      for (var f = 0; f < 12; f++) {
        for (var l = 0; l < 6; l++) {
          var n = Math.max(1, Math.round((COUNT - DUPS) / 12 * LVL_W[l] + (rnd() - 0.5) * 2));
          per.push({ f: f, l: l, n: n });
        }
      }
      per.forEach(function (cell) {
        for (var i = 0; i < cell.n; i++) {
          nodes.push({ f: cell.f, l: cell.l, slot: i, dup: false });
        }
      });
      /* duplicate titles that merge into an existing slot */
      for (var d = 0; d < DUPS; d++) {
        var src = nodes[Math.floor(rnd() * nodes.length)];
        nodes.push({ f: src.f, l: src.l, slot: src.slot, dup: true });
      }
      nodes.forEach(function (nd) {
        nd.x = 0; nd.y = 0;
        nd.delay = rnd() * 0.14;
        nd.spd = 3 + rnd() * 3.4;
        nd.jx = rnd(); nd.jy = rnd(); nd.jr = rnd();
      });
    })();

    /* three keyframe layouts, recomputed on resize */
    var PAD = { l: 46, r: 16, t: 20, b: 44 };
    function layout(w, h) {
      var iw = w - PAD.l - PAD.r, ih = h - PAD.t - PAD.b;
      var r2 = MK.rng(88);
      /* cluster centers for the "families emerge" phase — 4 × 3 blobs */
      var cx = [], cy = [];
      for (var f = 0; f < 12; f++) {
        cx.push(PAD.l + ((f % 4) + 0.5) / 4 * iw + (r2() - 0.5) * 30);
        cy.push(PAD.t + (Math.floor(f / 4) + 0.5) / 3 * ih + (r2() - 0.5) * 20);
      }
      var colW = iw / 12, rowH = ih / 6;
      var slotCols = Math.max(2, Math.floor((colW - 8) / 7));
      nodes.forEach(function (nd) {
        /* K0 — disorder: clumpy scatter */
        var clump = Math.floor(nd.jr * 9);
        var ax = PAD.l + (0.08 + 0.84 * ((clump * 0.37) % 1)) * iw;
        var ay = PAD.t + (0.1 + 0.8 * ((clump * 0.61) % 1)) * ih;
        nd.k0x = ax + (nd.jx - 0.5) * iw * 0.34;
        nd.k0y = ay + (nd.jy - 0.5) * ih * 0.5;
        nd.k0x = MK.clamp(nd.k0x, PAD.l + 4, w - PAD.r - 4);
        nd.k0y = MK.clamp(nd.k0y, PAD.t + 4, h - PAD.b - 4);
        /* K1 — family blobs */
        var ang = nd.jx * Math.PI * 2, rad = Math.sqrt(nd.jy) * Math.min(colW * 1.7, 58);
        nd.k1x = cx[nd.f] + Math.cos(ang) * rad;
        nd.k1y = cy[nd.f] + Math.sin(ang) * rad * 0.72;
        /* K2 — the lattice */
        var sc = nd.slot % slotCols, sr = Math.floor(nd.slot / slotCols);
        nd.k2x = PAD.l + nd.f * colW + colW / 2 + (sc - (slotCols - 1) / 2) * 7;
        nd.k2y = PAD.t + nd.l * rowH + rowH / 2 + (sr - 1) * 7 - 2;
      });
    }

    /* scrub value springs; node positions spring to targets */
    var tRaw = 0, tS = 0, hoverFam = -1, played = false, userTouched = false, autoT = null;

    var phaseEl = document.getElementById("archPhase");
    var famEl = document.getElementById("archFams");
    var lvlEl = document.getElementById("archLevels");
    function syncCounters() {
      if (phaseEl) phaseEl.textContent = tS < 0.33 ? "Disorder" : tS < 0.72 ? "Families emerge" : "Architecture";
      if (famEl) famEl.textContent = tS > 0.4 ? "12" : "—";
      if (lvlEl) lvlEl.textContent = tS > 0.78 ? "6" : "—";
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      /* auto-play once on first view */
      if (autoT !== null && !userTouched) {
        autoT += dt / 5.2;
        tRaw = MK.ease(MK.clamp(autoT - 0.12, 0, 1));
        scrub.value = Math.round(tRaw * 1000);
        if (autoT >= 1.15) autoT = null; else busy = true;
      }
      tS += (tRaw - tS) * Math.min(1, dt * 5);
      if (Math.abs(tRaw - tS) > 0.002) busy = true; else tS = tRaw;
      if (MK.reduced) { tS = tRaw; }
      syncCounters();

      var tA = MK.ease(MK.clamp(tS / 0.52, 0, 1));
      var tB = MK.ease(MK.clamp((tS - 0.52) / 0.48, 0, 1));

      /* frame rails */
      ctx.strokeStyle = MK.lineSoft; ctx.lineWidth = 1;

      var iw = w - PAD.l - PAD.r, colW = iw / 12, rowH = (h - PAD.t - PAD.b) / 6;

      /* lattice grid fades in */
      if (tB > 0.15) {
        ctx.globalAlpha = MK.clamp((tB - 0.15) / 0.6, 0, 1);
        for (var l = 0; l <= 6; l++) {
          var gy = PAD.t + l * rowH;
          ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(w - PAD.r, gy); ctx.stroke();
        }
        ctx.font = MK.font.mono(9); ctx.fillStyle = MK.ink3; ctx.textAlign = "right";
        LVLS.forEach(function (lv, i) {
          ctx.fillText(lv, PAD.l - 8, PAD.t + i * rowH + rowH / 2 + 3);
        });
        ctx.globalAlpha = 1;
      }

      /* nodes */
      nodes.forEach(function (nd) {
        var dA = MK.clamp((tA * 1.16 - nd.delay) / 1, 0, 1);
        var dB = MK.clamp((tB * 1.16 - nd.delay) / 1, 0, 1);
        var txp = MK.lerp(MK.lerp(nd.k0x, nd.k1x, MK.ease(dA)), nd.k2x, MK.ease(dB));
        var typ = MK.lerp(MK.lerp(nd.k0y, nd.k1y, MK.ease(dA)), nd.k2y, MK.ease(dB));
        if (nd.x === 0 && nd.y === 0) { nd.x = txp; nd.y = typ; }
        nd.x += (txp - nd.x) * Math.min(1, dt * nd.spd);
        nd.y += (typ - nd.y) * Math.min(1, dt * nd.spd);
        if (Math.abs(txp - nd.x) + Math.abs(typ - nd.y) > 0.3) busy = true;
        if (MK.reduced) { nd.x = txp; nd.y = typ; }

        var isHover = hoverFam === nd.f && tS > 0.85;
        if (nd.dup) {
          /* duplicates run warm until they merge into their slot */
          var merged = tB > 0.9;
          ctx.fillStyle = merged ? "rgba(29,25,21,.55)" : "rgba(200,64,26," + (0.75 - tB * 0.4) + ")";
          if (merged) return; /* absorbed */
        } else {
          ctx.fillStyle = isHover ? MK.accent : "rgba(29,25,21," + (0.38 + tB * 0.25) + ")";
        }
        var s = isHover ? 4.6 : 3.6;
        ctx.fillRect(nd.x - s / 2, nd.y - s / 2, s, s);
      });

      /* disorder annotation */
      if (tS < 0.3) {
        ctx.globalAlpha = 1 - tS / 0.3;
        ctx.font = "italic 500 13px 'Fraunces', Georgia, serif";
        ctx.fillStyle = MK.ink2; ctx.textAlign = "left";
        ctx.fillText("the same job, four different titles", PAD.l + iw * 0.55, PAD.t + 16);
        ctx.globalAlpha = 1;
      }

      /* family names */
      if (tB > 0.5) {
        ctx.globalAlpha = MK.clamp((tB - 0.5) / 0.4, 0, 1);
        ctx.font = MK.font.mono(8.5); ctx.textAlign = "left";
        FAMS.forEach(function (fm, i) {
          var fx = PAD.l + i * colW + colW / 2;
          ctx.save();
          ctx.translate(fx + 3, h - PAD.b + 12);
          ctx.rotate(0.5);
          ctx.fillStyle = hoverFam === i ? MK.accent : MK.ink3;
          ctx.fillText(fm, 0, 0);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      }

      /* hover readout */
      if (hoverFam >= 0 && tS > 0.85) {
        var n = nodes.filter(function (nd) { return nd.f === hoverFam && !nd.dup; }).length;
        ctx.font = MK.font.mono(10, 700); ctx.fillStyle = MK.accent; ctx.textAlign = "right";
        ctx.fillText(FAMS[hoverFam] + " · " + n + " ROLES · 6 LEVELS", w - PAD.r, PAD.t - 6);
      }

      return busy;
    }, function (inst) {
      inst.onResize = function (w, h) { layout(w, h); };
    });
    if (!inst) return;
    layout(inst.w || host.clientWidth, inst.h || host.clientHeight);

    /* start auto-play when it first scrolls into view */
    if ("IntersectionObserver" in window && !MK.reduced) {
      var pio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !played) {
            played = true; autoT = 0; inst.wake();
            pio.disconnect();
          }
        });
      }, { threshold: 0.45 });
      pio.observe(host);
    } else {
      tRaw = 1; scrub.value = 1000;
    }

    MK.on(scrub, "input", function () {
      userTouched = true; autoT = null;
      tRaw = scrub.value / 1000;
      inst.wake();
    });
    MK.on(scrub, "pointerdown", function () { userTouched = true; autoT = null; });

    MK.on(inst.canvas, "pointermove", function (e) {
      var r = inst.canvas.getBoundingClientRect();
      var x = e.clientX - r.left;
      var iw = inst.w - PAD.l - PAD.r;
      var f = Math.floor((x - PAD.l) / (iw / 12));
      hoverFam = (f >= 0 && f < 12 && tS > 0.85) ? f : -1;
      inst.wake();
    }, { passive: true });
    MK.on(inst.canvas, "pointerleave", function () { hoverFam = -1; inst.wake(); });
  });
})();
