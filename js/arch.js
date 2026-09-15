/* 2 · Job architecture: disorder resolves into structure.
   Title-nodes settle into an illustrative lattice of job families and
   levels. Plays once when it is properly in view, and again on request.
   Resting on a column uncovers the duplicate titles it absorbed. */
(function () {
  "use strict";
  MK.register("arch", function (root) {
    var host = root.querySelector("#archCanvasHost");
    var caption = root.querySelector("#archCaption");
    var hoverOut = root.querySelector("#archHover");
    var replay = root.querySelector("#archReplay");
    if (!host) return;
    var T = MK.theme;

    var FAMS = ["Sales", "Sales eng", "Marketing", "Success", "Renewals", "Partners",
                "Ops", "Enablement", "Deal desk", "Analytics", "Programs", "Comms"];
    var SHORT = ["Sales", "Sales eng", "Mktg", "Success", "Renewals", "Partners",
                 "Ops", "Enable", "Deals", "Analytics", "Programs", "Comms"];
    var LVLS = ["IC1", "IC2", "IC3", "IC4", "M1", "M2"];
    var LVL_W = [0.26, 0.24, 0.20, 0.15, 0.09, 0.06];
    var COUNT = 417, DUPS = 46;

    var rnd = MK.rng(1207);
    var nodes = [];
    (function build() {
      var per = [];
      for (var f = 0; f < 12; f++)
        for (var l = 0; l < 6; l++)
          per.push({ f: f, l: l, n: Math.max(1, Math.round((COUNT - DUPS) / 12 * LVL_W[l] + (rnd() - 0.5) * 2)) });
      per.forEach(function (cell) {
        for (var i = 0; i < cell.n; i++) nodes.push({ f: cell.f, l: cell.l, slot: i, dup: false });
      });
      for (var d = 0; d < DUPS; d++) {
        var src = nodes[Math.floor(rnd() * nodes.length)];
        nodes.push({ f: src.f, l: src.l, slot: src.slot, dup: true });
      }
      nodes.forEach(function (nd) {
        nd.x = 0; nd.y = 0;
        nd.delay = rnd() * 0.14;
        nd.spd = 3 + rnd() * 3.4;
        nd.jx = rnd(); nd.jy = rnd(); nd.jr = rnd();
        nd.ph = rnd() * Math.PI * 2;
      });
    })();

    var PAD = { l: 54, r: 20, t: 18, b: 44 };
    var slotCols = 5;
    function layout(w, h) {
      var iw = w - PAD.l - PAD.r, ih = h - PAD.t - PAD.b;
      var r2 = MK.rng(88);
      var cx = [], cy = [];
      for (var f = 0; f < 12; f++) {
        cx.push(PAD.l + ((f % 4) + 0.5) / 4 * iw + (r2() - 0.5) * 30);
        cy.push(PAD.t + (Math.floor(f / 4) + 0.5) / 3 * ih + (r2() - 0.5) * 20);
      }
      var colW = iw / 12, rowH = ih / 6;
      slotCols = MK.clamp(Math.floor((colW - 8) / 7), 2, 5);
      nodes.forEach(function (nd) {
        var clump = Math.floor(nd.jr * 9);
        var ax = PAD.l + (0.08 + 0.84 * ((clump * 0.37) % 1)) * iw;
        var ay = PAD.t + (0.1 + 0.8 * ((clump * 0.61) % 1)) * ih;
        nd.k0x = MK.clamp(ax + (nd.jx - 0.5) * iw * 0.34, PAD.l + 4, w - PAD.r - 4);
        nd.k0y = MK.clamp(ay + (nd.jy - 0.5) * ih * 0.5, PAD.t + 4, h - PAD.b - 4);
        var ang = nd.jx * Math.PI * 2, rad = Math.sqrt(nd.jy) * Math.min(colW * 1.7, 58);
        nd.k1x = cx[nd.f] + Math.cos(ang) * rad;
        nd.k1y = cy[nd.f] + Math.sin(ang) * rad * 0.72;
        var sc = nd.slot % slotCols, sr = Math.floor(nd.slot / slotCols);
        nd.k2x = PAD.l + nd.f * colW + colW / 2 + (sc - (slotCols - 1) / 2) * 7;
        nd.k2y = PAD.t + nd.l * rowH + rowH / 2 + (sr - 1) * 7 - 2;
      });
    }

    var tRaw = 0, tS = 0, hoverFam = -1, time = 0;
    var capState = 0;   /* the markup already carries the first caption */
    var CAPS = [
      "Titles as found: duplicated, inconsistently leveled.",
      "Related work gathers into job families.",
      "Twelve job families, six levels. Duplicates absorbed into a single job profile."
    ];
    function syncCaption() {
      var s = tS < 0.32 ? 0 : tS < 0.93 ? 1 : 2;
      if (s === capState || !caption) return;
      capState = s;
      caption.classList.add("fade");
      setTimeout(function () {
        caption.textContent = CAPS[s];
        caption.classList.remove("fade");
      }, MK.reduced ? 0 : 220);
    }

    /* time-based: the resolve plays itself once it is properly in view, and can be replayed */
    var playT = -0.15, playing = false, played = false;
    var DUR = 4.6;
    function restart() { playT = -0.1; playing = true; played = true; if (inst) inst.wake(); }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      time += dt;
      if (playing) {
        playT += dt;
        tRaw = MK.clamp(playT / DUR, 0, 1);
        if (playT >= DUR) playing = false; else busy = true;
      }
      tS += (tRaw - tS) * Math.min(1, dt * 6);
      if (Math.abs(tRaw - tS) > 0.0015) busy = true; else tS = tRaw;
      if (MK.reduced) { tS = 1; tRaw = 1; playing = false; }
      syncCaption();

      var tA = MK.ease(MK.clamp(tS / 0.52, 0, 1));
      var tB = MK.ease(MK.clamp((tS - 0.52) / 0.44, 0, 1));

      var iw = w - PAD.l - PAD.r, colW = iw / 12, rowH = (h - PAD.t - PAD.b) / 6;
      var lit = hoverFam >= 0 && tS > 0.9;

      /* lattice hairlines resolve in */
      if (tB > 0.15) {
        ctx.globalAlpha = MK.clamp((tB - 0.15) / 0.6, 0, 1);
        ctx.strokeStyle = T.ruleSoft; ctx.lineWidth = 1;
        for (var l = 0; l <= 6; l++) {
          var gy = PAD.t + l * rowH;
          ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(w - PAD.r, gy); ctx.stroke();
        }
        ctx.font = MK.font(12.5); ctx.fillStyle = T.ink2; ctx.textAlign = "right";
        LVLS.forEach(function (lv, i) {
          ctx.fillText(lv, PAD.l - 12, PAD.t + i * rowH + rowH / 2 + 4);
        });
        if (lit) {
          ctx.fillStyle = MK.alpha(T.green, 0.08);
          ctx.fillRect(PAD.l + hoverFam * colW, PAD.t, colW, h - PAD.t - PAD.b);
        }
        ctx.globalAlpha = 1;
      }

      var idle = 1 - tA; /* disorder breathes a little */
      var inkFill = MK.alpha(T.ink, 0.30 + tB * 0.28);
      var dupAlpha = 0.72 * Math.max(0, 1 - tB);   /* duplicates fade out as they are absorbed, gone at the end */
      nodes.forEach(function (nd) {
        var dA = MK.clamp((tA * 1.16 - nd.delay), 0, 1);
        var dB = MK.clamp((tB * 1.16 - nd.delay), 0, 1);
        var bx = nd.k0x + Math.sin(time * 0.4 + nd.ph) * 3 * idle;
        var by = nd.k0y + Math.cos(time * 0.33 + nd.ph) * 2.4 * idle;
        var txp = MK.lerp(MK.lerp(bx, nd.k1x, MK.ease(dA)), nd.k2x, MK.ease(dB));
        var typ = MK.lerp(MK.lerp(by, nd.k1y, MK.ease(dA)), nd.k2y, MK.ease(dB));
        if (nd.x === 0 && nd.y === 0) { nd.x = txp; nd.y = typ; }
        nd.x += (txp - nd.x) * Math.min(1, dt * nd.spd);
        nd.y += (typ - nd.y) * Math.min(1, dt * nd.spd);
        if (Math.abs(txp - nd.x) + Math.abs(typ - nd.y) > 0.35) busy = true;
        if (MK.reduced) { nd.x = txp; nd.y = typ; }
        if (idle > 0.02 && playing) busy = true;

        var isHover = lit && hoverFam === nd.f;
        if (nd.dup) {
          if (isHover && tB > 0.9) {
            /* uncovered: the absorbed duplicate, ghosted beside its profile */
            ctx.fillStyle = MK.alpha(T.ochre, 0.85);
            ctx.beginPath(); ctx.arc(nd.k2x + 5, nd.k2y - 5, 2.1, 0, 6.2832); ctx.fill();
            return;
          }
          if (dupAlpha < 0.01) return;
          ctx.fillStyle = MK.alpha(T.ochre, dupAlpha);
        } else {
          ctx.fillStyle = isHover ? T.green : inkFill;
        }
        var r = isHover ? 2.6 : 2.1;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, r, 0, 6.2832); ctx.fill();
      });

      /* duplicate annotation, early */
      if (tS < 0.24) {
        ctx.globalAlpha = 1 - tS / 0.24;
        ctx.font = MK.font(13, 500);
        ctx.fillStyle = T.ochreText; ctx.textAlign = "left";
        ctx.fillText("The same job, several titles", PAD.l + iw * 0.56, PAD.t + 18);
        ctx.globalAlpha = 1;
      }

      /* family names: one row when they fit, two staggered rows when they do not */
      if (tB > 0.55) {
        ctx.globalAlpha = MK.clamp((tB - 0.55) / 0.4, 0, 1);
        ctx.textAlign = "center";
        var narrow = colW < 62;
        var names = narrow ? SHORT : FAMS;
        names.forEach(function (fm, i) {
          var on = hoverFam === i && lit;
          ctx.font = MK.font(narrow ? 11.5 : 12.5, on ? 500 : 400);
          ctx.fillStyle = on ? T.greenText : T.ink2;
          var y = h - PAD.b + 20 + (narrow && i % 2 ? 14 : 0);
          ctx.fillText(fm, PAD.l + i * colW + colW / 2, y);
        });
        ctx.globalAlpha = 1;
      }
      return busy;
    }, function (inst) {
      inst.onResize = function (w, h) { layout(w, h); };
    });
    if (!inst) return;
    layout(inst.w || host.clientWidth, inst.h || host.clientHeight);

    if (replay) MK.on(replay, "click", restart);

    var dupCount = [];
    for (var f0 = 0; f0 < 12; f0++) dupCount.push(nodes.filter(function (n) { return n.dup && n.f === f0; }).length);
    function setHover(f) {
      hoverFam = f;
      if (hoverOut) hoverOut.textContent = f >= 0 ? (FAMS[f] + ": " + (dupCount[f] === 1 ? "one duplicate title absorbed" : dupCount[f] + " duplicate titles absorbed")) : "";
      inst.canvas.style.cursor = f >= 0 ? "crosshair" : "default";
      inst.wake();
    }
    function famAt(clientX) {
      var r = inst.canvas.getBoundingClientRect();
      var x = clientX - r.left;
      var iw = inst.w - PAD.l - PAD.r;
      var f = Math.floor((x - PAD.l) / (iw / 12));
      return (f >= 0 && f < 12 && tS > 0.9) ? f : -1;
    }
    MK.on(inst.canvas, "pointermove", function (e) {
      if (e.pointerType === "touch") return;
      setHover(famAt(e.clientX));
    }, { passive: true });
    MK.on(inst.canvas, "pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      var f = famAt(e.clientX);
      setHover(f === hoverFam ? -1 : f);   /* a tap lights a column, a second tap clears it */
    }, { passive: true });
    MK.on(inst.canvas, "pointerleave", function (e) { if (e.pointerType !== "touch") setHover(-1); });

    /* play once it is properly in view */
    if (MK.reduced) { tS = 1; tRaw = 1; }
    else if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !played) restart(); });
      }, { threshold: 0.55 }).observe(host);
    } else restart();
  });
})();
