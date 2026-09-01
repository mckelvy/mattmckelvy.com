/* 02 · Job architecture — disorder resolves into structure.
   Title-nodes settle into an illustrative lattice of job families and
   levels. Time-based: it plays once on open, and replays on request. */
(function () {
  "use strict";
  MK.register("arch", function (root) {
    var host = root.querySelector("#archCanvasHost");
    var caption = root.querySelector("#archCaption");
    var replay = root.querySelector("#archReplay");
    if (!host) return;

    var FAMS = ["Sales", "Sales eng", "Marketing", "Success", "Renewals", "Partners",
                "Ops", "Enablement", "Deal desk", "Analytics", "Programs", "Comms"];
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

    var PAD = { l: 54, r: 20, t: 16, b: 40 };
    function layout(w, h) {
      var iw = w - PAD.l - PAD.r, ih = h - PAD.t - PAD.b;
      var r2 = MK.rng(88);
      var cx = [], cy = [];
      for (var f = 0; f < 12; f++) {
        cx.push(PAD.l + ((f % 4) + 0.5) / 4 * iw + (r2() - 0.5) * 30);
        cy.push(PAD.t + (Math.floor(f / 4) + 0.5) / 3 * ih + (r2() - 0.5) * 20);
      }
      var colW = iw / 12, rowH = ih / 6;
      var slotCols = Math.max(2, Math.floor((colW - 8) / 7));
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
    var capState = -1;
    var CAPS = [
      "Titles as found: duplicated, inconsistently leveled.",
      "Related work gathers into job families.",
      "Twelve job families, six management levels. Duplicates absorbed into a single job profile."
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

    /* time-based: the resolve plays itself, once, and can be replayed */
    var playT = -0.15, playing = true;
    var DUR = 4.6;
    function restart() { playT = -0.1; playing = true; if (inst) inst.wake(); }

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

      /* lattice hairlines resolve in */
      if (tB > 0.15) {
        ctx.globalAlpha = MK.clamp((tB - 0.15) / 0.6, 0, 1);
        ctx.strokeStyle = MK.ui.hair; ctx.lineWidth = 1;
        for (var l = 0; l <= 6; l++) {
          var gy = PAD.t + l * rowH;
          ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(w - PAD.r, gy); ctx.stroke();
        }
        ctx.font = MK.font(12); ctx.fillStyle = MK.ui.ink3; ctx.textAlign = "right";
        LVLS.forEach(function (lv, i) {
          ctx.fillText(lv, PAD.l - 12, PAD.t + i * rowH + rowH / 2 + 4);
        });
        ctx.globalAlpha = 1;
      }

      var idle = 1 - tA; /* disorder breathes a little */
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
        if (idle > 0.02) busy = true;

        var isHover = hoverFam === nd.f && tS > 0.9;
        if (nd.dup) {
          if (tB > 0.9) return; /* absorbed into its slot */
          ctx.fillStyle = "rgba(217,130,11," + (0.65 - tB * 0.4).toFixed(3) + ")";
        } else {
          ctx.fillStyle = isHover ? MK.ui.blue : "rgba(29,29,31," + (0.30 + tB * 0.26).toFixed(3) + ")";
        }
        var s = isHover ? 4.4 : 3.4;
        ctx.fillRect(nd.x - s / 2, nd.y - s / 2, s, s);
      });

      /* duplicate annotation, early */
      if (tS < 0.24) {
        ctx.globalAlpha = 1 - tS / 0.24;
        ctx.font = MK.font(13);
        ctx.fillStyle = MK.ui.ink3; ctx.textAlign = "left";
        ctx.fillText("The same job, four different titles", PAD.l + iw * 0.56, PAD.t + 18);
        ctx.globalAlpha = 1;
      }

      /* family names */
      if (tB > 0.55) {
        ctx.globalAlpha = MK.clamp((tB - 0.55) / 0.4, 0, 1);
        ctx.font = MK.font(11.5);
        ctx.textAlign = "center";
        var every = colW < 62 ? 2 : 1;
        FAMS.forEach(function (fm, i) {
          if (i % every) return;
          ctx.fillStyle = hoverFam === i ? MK.ui.blue : MK.ui.ink3;
          ctx.fillText(fm, PAD.l + i * colW + colW / 2, h - PAD.b + 22);
        });
        ctx.globalAlpha = 1;
      }

      /* hover readout */
      if (hoverFam >= 0 && tS > 0.9) {
        var n = 0;
        for (var i2 = 0; i2 < nodes.length; i2++) if (nodes[i2].f === hoverFam && !nodes[i2].dup) n++;
        ctx.font = MK.font(12, 600); ctx.fillStyle = MK.ui.blue; ctx.textAlign = "right";
        ctx.fillText(FAMS[hoverFam] + " · " + n + " job profiles", w - PAD.r, PAD.t + 4);
      }
      return busy;
    }, function (inst) {
      inst.onResize = function (w, h) { layout(w, h); };
    });
    if (!inst) return;
    layout(inst.w || host.clientWidth, inst.h || host.clientHeight);

    if (replay) MK.on(replay, "click", restart);

    MK.on(inst.canvas, "pointermove", function (e) {
      var r = inst.canvas.getBoundingClientRect();
      var x = e.clientX - r.left;
      var iw = inst.w - PAD.l - PAD.r;
      var f = Math.floor((x - PAD.l) / (iw / 12));
      hoverFam = (f >= 0 && f < 12 && tS > 0.9) ? f : -1;
      inst.wake();
    }, { passive: true });
    MK.on(inst.canvas, "pointerleave", function () { hoverFam = -1; inst.wake(); });
  });
})();
