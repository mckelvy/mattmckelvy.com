/* 01 · Range drift — the investigation, five moves on one canvas.
   Gray carries the org, amber carries the signal, blue is the decision.
   Illustrative data: relative shapes only. No rates, no projected results. */
(function () {
  "use strict";
  MK.register("drift", function (root) {
    var host = root.querySelector("#driftCanvasHost");
    if (!host) return;
    var $ = function (id) { return root.querySelector("#" + id); };

    var N = 14;
    /* attrition by region on a relative scale: unitless, never labeled with a rate */
    var AMER = [9.2,9.5,9.1,9.8,10.1,9.7,9.4,10.0,9.6,9.9,10.2,9.8,9.5,9.7];
    var EMEA = [10.1,9.8,10.4,10.0,10.6,10.2,10.8,10.4,10.9,10.5,11.0,10.6,10.3,10.7];
    var APJC = [10.4,10.2,10.8,11.2,11.9,12.4,13.1,13.8,14.6,15.2,15.9,16.4,16.8,17.0];
    /* pay, indexed: midpoints step on the annual structure cycle, the market moves continuously */
    var MID  = [100,100,100,102,102,102,102,104,104,104,104,106,106,106];
    var MKT  = [100,101,102,103,104,106,107,108,110,111,112,113,114,115];
    var RECAL_I = 10;

    var step = 0, TOTAL = 5;
    var P = { attr: 1, pat: 0, mkt: 0, gap: 0, recal: 0 };
    var T = { attr: 1, pat: 0, mkt: 0, gap: 0, recal: 0 };
    var drawT = { attr: 0, pat: 0, mkt: 0, gap: 0, recal: 0 };

    var READOUTS = [
      "Attrition in one region climbed while the others held. That was the signal, not yet the finding.",
      "The exits cut across go-to-market, operations, and engineering inside one geography, which pointed toward a market explanation rather than a team-level one.",
      "Range midpoints for that market, re-plotted against surveyed market movement. Midpoints had moved on the annual structure adjustment. The market had moved faster, and the gap compounded.",
      "The market reference ranges for those roles had drifted below peer benchmarks, and the attrition traced to that gap. An association read with judgment, not a proof of cause.",
      "Recommendation: recalibrate the ranges to current peer benchmarks, starting with the roles furthest from market, so leadership could see where compensation review was most warranted."
    ];

    function setStep(s) {
      step = MK.clamp(s, 0, TOTAL - 1);
      T.attr  = step <= 1 ? 1 : 0;
      T.pat   = step === 1 ? 1 : 0;
      T.mkt   = step >= 2 ? 1 : 0;
      T.gap   = step === 2 ? 0.45 : step === 3 ? 1 : step === 4 ? 0.25 : 0;
      T.recal = step === 4 ? 1 : 0;
      syncUI();
      if (inst) inst.wake();
    }

    var stepsEl = $("driftSteps");
    var lis = stepsEl ? [].slice.call(stepsEl.children) : [];
    var prev = $("driftPrev"), next = $("driftNext");
    var count = $("driftCount"), readout = $("driftReadout");
    function syncUI() {
      lis.forEach(function (li, i) { li.classList.toggle("on", i === step); });
      if (count) count.textContent = (step + 1) + " of " + TOTAL;
      if (readout) readout.textContent = READOUTS[step];
      if (prev) prev.disabled = step === 0;
      if (next) next.textContent = step === TOTAL - 1 ? "Start over" : "Continue";
    }
    lis.forEach(function (li, i) {
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      MK.on(li, "click", function () { setStep(i); });
      MK.on(li, "keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(i); } });
    });
    if (prev) MK.on(prev, "click", function () { setStep(step - 1); });
    if (next) MK.on(next, "click", function () { setStep(step === TOTAL - 1 ? 0 : step + 1); });

    var M = { l: 44, r: 104, t: 26, b: 30 };
    function xAt(i, w) { return M.l + (i / (N - 1)) * (w - M.l - M.r); }

    function drawLine(ctx, series, w, yFn, prog, opts) {
      opts = opts || {};
      var upTo = prog * (N - 1);
      ctx.strokeStyle = opts.color || MK.ui.ink;
      ctx.lineWidth = opts.width || 1.5;
      ctx.setLineDash(opts.dash || []);
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (var i = 0; i <= Math.min(Math.ceil(upTo), N - 1); i++) {
        var xi = xAt(i, w), yi = yFn(series[i]);
        if (i > upTo) {
          var f = upTo - (i - 1);
          xi = MK.lerp(xAt(i - 1, w), xi, f);
          yi = MK.lerp(yFn(series[i - 1]), yi, f);
        }
        if (opts.stepped && i > 0) ctx.lineTo(xi, yFn(series[i - 1]));
        i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    function label(ctx, txt, x, y, color, size, align, weight) {
      ctx.font = MK.font(size || 12, weight || 400);
      ctx.fillStyle = color || MK.ui.ink3;
      ctx.textAlign = align || "left";
      ctx.fillText(txt, x, y);
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      var speed = Math.min(1, dt * 4.2), dspeed = Math.min(1, dt * 1.4);
      for (var k in P) {
        P[k] += (T[k] - P[k]) * speed;
        if (Math.abs(T[k] - P[k]) > 0.004) busy = true; else P[k] = T[k];
        var dTarget = T[k] > 0.05 ? 1 : 0;
        if (dTarget === 0) drawT[k] = 0;
        else { drawT[k] += (1.001 - drawT[k]) * dspeed; if (drawT[k] > 0.996) drawT[k] = 1; else busy = true; }
      }
      if (MK.reduced) { for (var k2 in P) { P[k2] = T[k2]; drawT[k2] = T[k2] > 0 ? 1 : 0; } busy = false; }

      var plotH = h - M.t - M.b;

      /* ---- attrition by region, relative ---- */
      if (P.attr > 0.01) {
        var lo = 8.5, hi = 18.5;
        var yA = function (v) { return M.t + (1 - (v - lo) / (hi - lo)) * plotH; };
        ctx.globalAlpha = P.attr;
        ctx.strokeStyle = MK.ui.hair; ctx.lineWidth = 1;
        for (var g = 0; g < 4; g++) {
          var gy = M.t + (g / 3) * plotH;
          ctx.beginPath(); ctx.moveTo(M.l, gy); ctx.lineTo(w - M.r, gy); ctx.stroke();
        }
        label(ctx, "Attrition by region, relative", M.l, M.t - 10, MK.ui.ink3, 12);
        label(ctx, "Year 1", xAt(0, w), h - 8);
        label(ctx, "Year 3", xAt(N - 1, w), h - 8, MK.ui.ink3, 12, "right");
        var dp = MK.easeOut(drawT.attr);
        var dim = 1 - P.pat * 0.6;   /* the other regions recede while the pattern is read */
        drawLine(ctx, AMER, w, yA, dp, { color: "rgba(0,0,0,1)", width: 1.5, alpha: 0.20 * dim * P.attr });
        drawLine(ctx, EMEA, w, yA, dp, { color: "rgba(0,0,0,1)", width: 1.5, alpha: 0.32 * dim * P.attr });
        drawLine(ctx, APJC, w, yA, Math.min(dp * 1.05, 1), { color: MK.ui.amber, width: 2.5, alpha: P.attr });
        ctx.globalAlpha = P.attr;
        if (dp > 0.96) {
          label(ctx, "Americas", w - M.r + 10, yA(AMER[N - 1]) + 4, "rgba(0,0,0," + (0.34 * dim).toFixed(2) + ")");
          label(ctx, "EMEA", w - M.r + 10, yA(EMEA[N - 1]) + 4, "rgba(0,0,0," + (0.44 * dim).toFixed(2) + ")");
          label(ctx, "APJC", w - M.r + 10, yA(APJC[N - 1]) + 4, MK.ui.amber, 12, "left", 600);
        }
        /* the pattern: one geography, several functions (the upper left is empty) */
        if (P.pat > 0.01) {
          ctx.globalAlpha = P.attr * MK.ease(P.pat);
          label(ctx, "Exits across go-to-market,", M.l + 4, M.t + 24, MK.ui.amber, 12.5, "left", 600);
          label(ctx, "operations, and engineering", M.l + 4, M.t + 41, MK.ui.amber, 12.5, "left", 600);
          label(ctx, "in one geography", M.l + 4, M.t + 58, MK.ui.amber, 12.5, "left", 600);
        }
        ctx.globalAlpha = 1;
      }

      /* ---- structure vs market, indexed ---- */
      if (P.mkt > 0.01) {
        ctx.globalAlpha = P.mkt;
        var yM = function (v) { return M.t + (1 - (v - 96) / (126 - 96)) * plotH; };
        var recalP = MK.ease(P.recal);
        var midNow = MID.map(function (v, i) { return i >= RECAL_I ? MK.lerp(v, MKT[RECAL_I], recalP) : v; });
        ctx.strokeStyle = MK.ui.hair; ctx.lineWidth = 1;
        [100, 110, 120].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yM(g)); ctx.lineTo(w - M.r, yM(g)); ctx.stroke();
          label(ctx, String(g), M.l - 10, yM(g) + 4, MK.ui.ink3, 12, "right");
        });
        label(ctx, "Pay, indexed to year 1", M.l, M.t - 10, MK.ui.ink3, 12);
        label(ctx, "Year 1", xAt(0, w), h - 8);
        label(ctx, "Year 3", xAt(N - 1, w), h - 8, MK.ui.ink3, 12, "right");

        var dm = MK.easeOut(drawT.mkt);
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
        var fillA = (0.05 + 0.10 * P.gap) * (1 - recalP * 0.7);
        ctx.fillStyle = "rgba(217,130,11," + fillA.toFixed(3) + ")";
        ctx.fill();

        drawLine(ctx, midNow, w, yM, dm, { color: MK.ui.ink, width: 2, stepped: true, alpha: P.mkt });
        drawLine(ctx, MKT, w, yM, dm, { color: MK.ui.blue, width: 2, alpha: P.mkt });
        ctx.globalAlpha = P.mkt;
        if (dm > 0.96) {
          label(ctx, "Market P50", w - M.r + 10, yM(MKT[N - 1]) + 4, MK.ui.blue, 12, "left", 600);
          label(ctx, "Range midpoint", w - M.r + 10, yM(midNow[N - 1]) + 4, MK.ui.ink, 12, "left", 600);
          if (P.recal < 0.5) {
            var gapY = (yM(MKT[N - 1]) + yM(midNow[N - 1])) / 2;
            ctx.globalAlpha = P.mkt * (1 - recalP * 2);
            label(ctx, P.gap > 0.7 ? "Below peer benchmarks" : "The gap", xAt(N - 1, w) - 14, gapY + 4, MK.ui.amber, 13, "right", 600);
            ctx.globalAlpha = P.mkt;
          }
        }

        /* the recommendation: recalibrate at the review point */
        if (P.recal > 0.01) {
          ctx.globalAlpha = P.mkt * P.recal;
          var rx = xAt(RECAL_I, w);
          ctx.strokeStyle = MK.ui.blue; ctx.lineWidth = 1.5; ctx.setLineDash([1, 6]); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(rx, M.t + 6); ctx.lineTo(rx, h - M.b); ctx.stroke();
          ctx.setLineDash([]); ctx.lineCap = "butt";
          label(ctx, "Recalibrate (recommended)", rx - 10, M.t + 16, MK.ui.blue, 12, "right", 600);
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 1;
      }
      return busy;
    });

    syncUI();
  });
})();
