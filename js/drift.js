/* Exhibit A — the benchmark-drift investigation, in five moves.
   One canvas, five states, everything morphs. Synthetic data. */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("driftCanvasHost");
    if (!host) return;

    /* ---------------- synthetic series (14 quarters) ---------------- */
    var N = 14;
    var Q = ["FY23Q1","FY23Q2","FY23Q3","FY23Q4","FY24Q1","FY24Q2","FY24Q3","FY24Q4",
             "FY25Q1","FY25Q2","FY25Q3","FY25Q4","FY26Q1","FY26Q2"];
    var AMER = [9.2,9.5,9.1,9.8,10.1,9.7,9.4,10.0,9.6,9.9,10.2,9.8,9.5,9.7];
    var EMEA = [10.1,9.8,10.4,10.0,10.6,10.2,10.8,10.4,10.9,10.5,11.0,10.6,10.3,10.7];
    var APJC = [10.4,10.2,10.8,11.3,12.1,12.8,13.9,14.8,15.9,16.8,17.9,18.6,19.2,19.6];
    var MID  = [100,100,100,102,102,102,102,104,104,104,104,106,106,106];
    var MKT  = [100,101,102,104,106,108,110,113,115,118,120,122,124,126];
    var RECAL_I = 10;                       /* where the fix lands */
    var APJC_FIX = [16.4,14.4,12.9];        /* projected decline after recal (i = 11,12,13) */
    var HYPO = {
      "MANAGER CHURN": [12,13,11,12,13,12,11,13,12,12,13,12,11,12],
      "MEDIAN TENURE": [4.1,4.2,4.1,4.0,4.2,4.1,4.2,4.1,4.0,4.1,4.2,4.1,4.1,4.2],
      "ENGAGEMENT":    [76,75,77,76,75,76,77,76,75,76,75,76,77,76]
    };

    /* ---------------- state ---------------- */
    var step = 0, TOTAL = 5;
    /* element presences */
    var P = { attr: 1, hypo: 0, mkt: 0, ovl: 0, recal: 0 };
    var T = { attr: 1, hypo: 0, mkt: 0, ovl: 0, recal: 0 };
    var drawT = { attr: 0, hypo: 0, mkt: 0, ovl: 0, recal: 0 };

    var READOUTS = [
      "APJC annualized attrition climbs from ~10% to ~20% over ten quarters while every other region holds.",
      "Manager churn, tenure mix, engagement — all flat. The org chart isn't the story.",
      "Range midpoints moved about +2% a year, on schedule. The APJC market moved nearly four times faster. The gap compounds quietly.",
      "Lay the attrition curve over the pay gap: same shape, same timing. Not culture — pricing.",
      "Ranges recalibrated to market at the arrow. The gap closes, and projected attrition bends back toward baseline."
    ];

    function setStep(s) {
      step = MK.clamp(s, 0, TOTAL - 1);
      T.attr  = step === 0 ? 1 : step === 1 ? 0.14 : 0;
      T.hypo  = step === 1 ? 1 : 0;
      T.mkt   = step >= 2 ? 1 : 0;
      T.ovl   = step === 3 ? 1 : step === 4 ? 0.35 : 0;
      T.recal = step === 4 ? 1 : 0;
      syncUI();
      if (inst) inst.wake();
    }

    /* ---------------- UI wiring ---------------- */
    var stepsEl = document.getElementById("driftSteps");
    var lis = stepsEl ? [].slice.call(stepsEl.children) : [];
    var prev = document.getElementById("driftPrev"), next = document.getElementById("driftNext");
    var count = document.getElementById("driftCount"), readout = document.getElementById("driftReadout");
    function syncUI() {
      lis.forEach(function (li, i) { li.classList.toggle("on", i === step); });
      if (count) count.textContent = (step + 1) + " / " + TOTAL;
      if (readout) readout.textContent = READOUTS[step];
      if (prev) prev.disabled = step === 0;
      if (next) next.textContent = step === TOTAL - 1 ? "Restart ↺" : "Next →";
    }
    lis.forEach(function (li, i) {
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      MK.on(li, "click", function () { setStep(i); });
      MK.on(li, "keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(i); } });
    });
    if (prev) MK.on(prev, "click", function () { setStep(step - 1); });
    if (next) MK.on(next, "click", function () { setStep(step === TOTAL - 1 ? 0 : step + 1); });

    /* ---------------- drawing ---------------- */
    var M = { l: 48, r: 92, t: 26, b: 30 };

    function xAt(i, w) { return M.l + (i / (N - 1)) * (w - M.l - M.r); }

    function drawLine(ctx, series, w, yFn, prog, opts) {
      opts = opts || {};
      var upTo = prog * (N - 1);
      ctx.strokeStyle = opts.color || MK.ink;
      ctx.lineWidth = opts.width || 1.8;
      ctx.setLineDash(opts.dash || []);
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
      ctx.beginPath();
      for (var i = 0; i <= Math.min(Math.ceil(upTo), N - 1); i++) {
        var xi = xAt(i, w), yi = yFn(series[i]);
        if (i > upTo) {  /* partial segment for smooth draw-in */
          var f = upTo - (i - 1);
          xi = MK.lerp(xAt(i - 1, w), xi, f);
          yi = MK.lerp(yFn(series[i - 1]), yi, f);
        }
        if (opts.stepped && i > 0) {
          ctx.lineTo(xi, yFn(series[i - 1] ));
        }
        i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }

    function label(ctx, txt, x, y, color, size, align, style) {
      ctx.font = style === "serif" ? "italic 500 " + (size || 12) + "px 'Fraunces', Georgia, serif" : MK.font.mono(size || 9.5, 500);
      ctx.fillStyle = color || MK.ink3;
      ctx.textAlign = align || "left";
      ctx.fillText(txt, x, y);
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      var speed = Math.min(1, dt * 4.2), dspeed = Math.min(1, dt * 1.4);
      for (var k in P) {
        P[k] += (T[k] - P[k]) * speed;
        if (Math.abs(T[k] - P[k]) > 0.004) busy = true; else P[k] = T[k];
        /* line draw-in progress follows presence */
        var dTarget = T[k] > 0.05 ? 1 : 0;
        if (dTarget === 0) drawT[k] = 0;
        else { drawT[k] += (1.001 - drawT[k]) * dspeed; if (drawT[k] > 0.996) drawT[k] = 1; else busy = true; }
      }
      if (MK.reduced) { for (var k2 in P) { P[k2] = T[k2]; drawT[k2] = T[k2] > 0 ? 1 : 0; } busy = false; }

      var plotH = h - M.t - M.b;

      /* ======== attrition chart ======== */
      if (P.attr > 0.01) {
        ctx.globalAlpha = P.attr;
        var yA = function (v) { return M.t + (1 - (v - 8) / (21 - 8)) * plotH; };
        /* grid + axis */
        ctx.strokeStyle = MK.lineSoft; ctx.lineWidth = 1;
        [8, 12, 16, 20].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yA(g)); ctx.lineTo(w - M.r, yA(g)); ctx.stroke();
          label(ctx, g + "%", M.l - 8, yA(g) + 3, MK.ink3, 9.5, "right");
        });
        label(ctx, "FY23", xAt(0, w), h - 10);
        label(ctx, "FY26", xAt(N - 1, w), h - 10, MK.ink3, 9.5, "right");
        label(ctx, "ANNUALIZED ATTRITION", M.l, M.t - 9, MK.ink3, 9.5);
        var dp = MK.easeOut(drawT.attr);
        drawLine(ctx, AMER, w, yA, dp, { color: "rgba(29,25,21,.30)", width: 1.5 });
        drawLine(ctx, EMEA, w, yA, dp, { color: "rgba(29,25,21,.45)", width: 1.5 });
        drawLine(ctx, APJC, w, yA, Math.min(dp * 1.05, 1), { color: MK.accent, width: 2.4 });
        if (dp > 0.96) {
          label(ctx, "AMER", w - M.r + 6, yA(AMER[N - 1]) + 3, "rgba(29,25,21,.38)");
          label(ctx, "EMEA", w - M.r + 6, yA(EMEA[N - 1]) + 3, "rgba(29,25,21,.5)");
          label(ctx, "APJC", w - M.r + 6, yA(APJC[N - 1]) + 3, MK.accent, 10, "left");
        }
        ctx.globalAlpha = 1;
      }

      /* ======== hypothesis panels ======== */
      if (P.hypo > 0.01) {
        ctx.globalAlpha = P.hypo;
        var names = Object.keys(HYPO);
        var gap = 18, pw = (w - M.l - 20 - gap * 2) / 3, ph = plotH * 0.52, py = M.t + plotH * 0.24;
        names.forEach(function (nm, pi) {
          var px = M.l + pi * (pw + gap);
          var series = HYPO[nm];
          var lo = Math.min.apply(0, series), hi = Math.max.apply(0, series), pad = (hi - lo) * 2 + 0.001;
          ctx.strokeStyle = MK.lineC; ctx.lineWidth = 1;
          ctx.strokeRect(px, py, pw, ph);
          label(ctx, nm, px + 10, py + 18, MK.ink2, 9.5);
          /* flat sparkline */
          ctx.strokeStyle = "rgba(29,25,21,.5)"; ctx.lineWidth = 1.5;
          ctx.beginPath();
          var reveal = MK.easeOut(drawT.hypo);
          for (var i = 0; i < N; i++) {
            var sx = px + 12 + (i / (N - 1)) * (pw - 24) * reveal;
            var sy = py + ph * 0.62 - ((series[i] - lo) / pad - 0.5) * ph * 0.4;
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          /* the stamp */
          if (drawT.hypo > 0.55 + pi * 0.12) {
            ctx.save();
            ctx.translate(px + pw / 2, py + ph - 16);
            ctx.rotate(-0.06);
            ctx.font = MK.font.mono(9, 700);
            ctx.fillStyle = MK.accent; ctx.textAlign = "center";
            var tw = ctx.measureText("FLAT — DOESN'T EXPLAIN IT").width;
            ctx.strokeStyle = MK.accent; ctx.lineWidth = 1.2; ctx.globalAlpha = P.hypo * 0.9;
            ctx.strokeRect(-tw / 2 - 8, -12, tw + 16, 20);
            ctx.fillText("FLAT — DOESN'T EXPLAIN IT", 0, 2);
            ctx.restore();
            ctx.globalAlpha = P.hypo;
          }
        });
        label(ctx, "the usual suspects", M.l, py + ph + 30, MK.ink2, 13, "left", "serif");
        ctx.globalAlpha = 1;
      }

      /* ======== market vs ranges ======== */
      if (P.mkt > 0.01) {
        ctx.globalAlpha = P.mkt;
        var yM = function (v) { return M.t + (1 - (v - 96) / (132 - 96)) * plotH; };
        var recalP = MK.ease(P.recal);
        var midNow = MID.map(function (v, i) { return i >= RECAL_I ? MK.lerp(v, 124, recalP) : v; });
        ctx.strokeStyle = MK.lineSoft;
        [100, 110, 120, 130].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yM(g)); ctx.lineTo(w - M.r, yM(g)); ctx.stroke();
          label(ctx, String(g), M.l - 8, yM(g) + 3, MK.ink3, 9.5, "right");
        });
        label(ctx, "PAY, INDEXED TO FY23", M.l, M.t - 9, MK.ink3, 9.5);
        label(ctx, "FY23", xAt(0, w), h - 10);
        label(ctx, "FY26", xAt(N - 1, w), h - 10, MK.ink3, 9.5, "right");

        var dm = MK.easeOut(drawT.mkt);
        /* the gap, shaded */
        var upTo = dm * (N - 1);
        ctx.beginPath();
        var started = false;
        for (var gi = 0; gi <= upTo; gi++) {
          var gx = xAt(gi, w);
          if (!started) { ctx.moveTo(gx, yM(MKT[gi])); started = true; }
          else ctx.lineTo(gx, yM(MKT[gi]));
        }
        for (var gj = Math.floor(upTo); gj >= 0; gj--) ctx.lineTo(xAt(gj, w), yM(midNow[gj]));
        ctx.closePath();
        ctx.fillStyle = "rgba(200,64,26," + (0.10 * (1 - recalP * 0.7)) + ")";
        ctx.fill();

        drawLine(ctx, midNow, w, yM, dm, { color: MK.ink, width: 2, stepped: true });
        drawLine(ctx, MKT, w, yM, dm, { color: MK.market, width: 2 });
        if (dm > 0.96) {
          label(ctx, "MARKET P50", w - M.r + 6, yM(MKT[N - 1]) + 3, MK.market, 10);
          label(ctx, "RANGE MID", w - M.r + 6, yM(midNow[N - 1]) + 3, MK.ink, 10);
          if (P.recal < 0.5 && P.ovl < 0.5) {
            var gapY = (yM(MKT[N - 1]) + yM(midNow[N - 1])) / 2;
            label(ctx, "the gap", xAt(N - 1, w) - 12, gapY + 4, MK.accent, 14, "right", "serif");
          }
        }

        /* attrition overlaid on the gap */
        if (P.ovl > 0.01) {
          ctx.globalAlpha = P.mkt * P.ovl * (step === 3 ? 1 : 0.9);
          /* scale APJC attrition (10..20) onto gap scale → index space */
          var yG = function (a) { return yM(96 + ((a - 9.5) / (20 - 9.5)) * 30 + 4); };
          /* once the recalibration lands, the observed series stops at the fix */
          var ovlCap = P.recal > 0.01 ? RECAL_I / (N - 1) : 1;
          drawLine(ctx, APJC, w, yG, Math.min(MK.easeOut(drawT.ovl), ovlCap), { color: MK.accent, width: 2, dash: [6, 5] });
          if (drawT.ovl > 0.9 && P.recal < 0.01) label(ctx, "ATTRITION (SCALED)", w - M.r + 6, yG(APJC[N - 1]) + 14, MK.accent, 8.5);
          ctx.globalAlpha = P.mkt;
        }

        /* recalibration event */
        if (P.recal > 0.01) {
          ctx.globalAlpha = P.mkt * P.recal;
          var rx = xAt(RECAL_I, w);
          ctx.strokeStyle = MK.good; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(rx, M.t + 4); ctx.lineTo(rx, h - M.b); ctx.stroke();
          ctx.setLineDash([]);
          label(ctx, "RANGES CORRECTED", rx + 7, M.t + 14, MK.good, 9.5);
          /* projected attrition decline */
          var yA2 = function (a) { return yM(96 + ((a - 9.5) / (20 - 9.5)) * 30 + 4); };
          ctx.strokeStyle = MK.good; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(xAt(RECAL_I, w), yA2(APJC[RECAL_I]));
          APJC_FIX.forEach(function (v, i) {
            var fp = MK.clamp(P.recal * 1.3 - i * 0.28, 0, 1);
            if (fp > 0) ctx.lineTo(MK.lerp(xAt(RECAL_I + i, w), xAt(RECAL_I + i + 1, w), fp),
                                   MK.lerp(yA2(i === 0 ? APJC[RECAL_I] : APJC_FIX[i - 1]), yA2(v), fp));
          });
          ctx.stroke(); ctx.setLineDash([]);
          if (P.recal > 0.85) label(ctx, "attrition, projected", xAt(N - 1, w) + 4, yA2(APJC_FIX[2]) - 8, MK.good, 12, "right", "serif");
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 1;
      }
      return busy;
    });

    syncUI();
  });
})();
