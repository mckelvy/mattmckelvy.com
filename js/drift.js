/* 01 · Benchmark drift — the investigation, five moves on one canvas.
   Gray carries the org, amber carries the signal, blue is the decision.
   Synthetic data. */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("driftCanvasHost");
    if (!host) return;

    var N = 14;
    var AMER = [9.2,9.5,9.1,9.8,10.1,9.7,9.4,10.0,9.6,9.9,10.2,9.8,9.5,9.7];
    var EMEA = [10.1,9.8,10.4,10.0,10.6,10.2,10.8,10.4,10.9,10.5,11.0,10.6,10.3,10.7];
    var APJC = [10.4,10.2,10.8,11.3,12.1,12.8,13.9,14.8,15.9,16.8,17.9,18.6,19.2,19.6];
    var MID  = [100,100,100,102,102,102,102,104,104,104,104,106,106,106];
    var MKT  = [100,101,102,104,106,108,110,113,115,118,120,122,124,126];
    var RECAL_I = 10;
    var APJC_FIX = [16.4,14.4,12.9];
    var HYPO = {
      "Manager churn": [12,13,11,12,13,12,11,13,12,12,13,12,11,12],
      "Median tenure": [4.1,4.2,4.1,4.0,4.2,4.1,4.2,4.1,4.0,4.1,4.2,4.1,4.1,4.2],
      "Engagement":    [76,75,77,76,75,76,77,76,75,76,75,76,77,76]
    };

    var step = 0, TOTAL = 5;
    var P = { attr: 1, hypo: 0, mkt: 0, ovl: 0, recal: 0 };
    var T = { attr: 1, hypo: 0, mkt: 0, ovl: 0, recal: 0 };
    var drawT = { attr: 0, hypo: 0, mkt: 0, ovl: 0, recal: 0 };

    var READOUTS = [
      "APJC annualized attrition climbs from about 10% to nearly 20% over ten quarters, while every other region holds.",
      "Manager churn, tenure mix, engagement — all flat. The org chart isn't the story.",
      "Range midpoints moved about +2% a year, on schedule. The APJC market moved nearly four times faster.",
      "Lay the attrition curve over the pay gap: same shape, same timing. Not culture — pricing.",
      "Ranges recalibrated to market. The gap closes, and projected attrition bends back toward baseline."
    ];

    function setStep(s) {
      step = MK.clamp(s, 0, TOTAL - 1);
      T.attr  = step === 0 ? 1 : step === 1 ? 0.12 : 0;
      T.hypo  = step === 1 ? 1 : 0;
      T.mkt   = step >= 2 ? 1 : 0;
      T.ovl   = step === 3 ? 1 : step === 4 ? 0.3 : 0;
      T.recal = step === 4 ? 1 : 0;
      syncUI();
      if (inst) inst.wake();
    }

    var stepsEl = document.getElementById("driftSteps");
    var lis = stepsEl ? [].slice.call(stepsEl.children) : [];
    var prev = document.getElementById("driftPrev"), next = document.getElementById("driftNext");
    var count = document.getElementById("driftCount"), readout = document.getElementById("driftReadout");
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

      /* ---- attrition ---- */
      if (P.attr > 0.01) {
        ctx.globalAlpha = P.attr;
        var yA = function (v) { return M.t + (1 - (v - 8) / (21 - 8)) * plotH; };
        ctx.strokeStyle = MK.ui.hair; ctx.lineWidth = 1;
        [8, 12, 16, 20].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yA(g)); ctx.lineTo(w - M.r, yA(g)); ctx.stroke();
          label(ctx, g + "%", M.l - 10, yA(g) + 4, MK.ui.ink3, 12, "right");
        });
        label(ctx, "Annualized attrition", M.l, M.t - 10, MK.ui.ink3, 12);
        label(ctx, "FY23", xAt(0, w), h - 8);
        label(ctx, "FY26", xAt(N - 1, w), h - 8, MK.ui.ink3, 12, "right");
        var dp = MK.easeOut(drawT.attr);
        drawLine(ctx, AMER, w, yA, dp, { color: "rgba(0,0,0,.20)", width: 1.5 });
        drawLine(ctx, EMEA, w, yA, dp, { color: "rgba(0,0,0,.32)", width: 1.5 });
        drawLine(ctx, APJC, w, yA, Math.min(dp * 1.05, 1), { color: MK.ui.amber, width: 2.5 });
        if (dp > 0.96) {
          label(ctx, "Americas", w - M.r + 10, yA(AMER[N - 1]) + 4, "rgba(0,0,0,.34)");
          label(ctx, "EMEA", w - M.r + 10, yA(EMEA[N - 1]) + 4, "rgba(0,0,0,.44)");
          label(ctx, "APJC", w - M.r + 10, yA(APJC[N - 1]) + 4, MK.ui.amber, 12, "left", 600);
        }
        ctx.globalAlpha = 1;
      }

      /* ---- suspects ---- */
      if (P.hypo > 0.01) {
        ctx.globalAlpha = P.hypo;
        var names = Object.keys(HYPO);
        var gap = 32, pw = (w - M.l - M.r + 60 - gap * 2) / 3, ph = plotH * 0.5, py = M.t + plotH * 0.2;
        names.forEach(function (nm, pi) {
          var px = M.l + pi * (pw + gap);
          var series = HYPO[nm];
          var lo = Math.min.apply(0, series), hi = Math.max.apply(0, series), pad = (hi - lo) * 2 + 0.001;
          label(ctx, nm, px, py - 12, MK.ui.ink2, 13, "left", 600);
          ctx.strokeStyle = MK.ui.hair;
          ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
          ctx.strokeStyle = "rgba(0,0,0,.38)"; ctx.lineWidth = 1.5;
          ctx.beginPath();
          var reveal = MK.easeOut(drawT.hypo);
          for (var i = 0; i < N; i++) {
            var sx = px + (i / (N - 1)) * pw * reveal;
            var sy = py + ph * 0.55 - ((series[i] - lo) / pad - 0.5) * ph * 0.55;
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          if (drawT.hypo > 0.5 + pi * 0.12) {
            label(ctx, "Flat. Doesn't explain it.", px, py + ph + 22, MK.ui.ink3, 12);
          }
        });
        ctx.globalAlpha = 1;
      }

      /* ---- market vs ranges ---- */
      if (P.mkt > 0.01) {
        ctx.globalAlpha = P.mkt;
        var yM = function (v) { return M.t + (1 - (v - 96) / (132 - 96)) * plotH; };
        var recalP = MK.ease(P.recal);
        var midNow = MID.map(function (v, i) { return i >= RECAL_I ? MK.lerp(v, 124, recalP) : v; });
        ctx.strokeStyle = MK.ui.hair; ctx.lineWidth = 1;
        [100, 110, 120, 130].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yM(g)); ctx.lineTo(w - M.r, yM(g)); ctx.stroke();
          label(ctx, String(g), M.l - 10, yM(g) + 4, MK.ui.ink3, 12, "right");
        });
        label(ctx, "Pay, indexed to FY23", M.l, M.t - 10, MK.ui.ink3, 12);
        label(ctx, "FY23", xAt(0, w), h - 8);
        label(ctx, "FY26", xAt(N - 1, w), h - 8, MK.ui.ink3, 12, "right");

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
        ctx.fillStyle = "rgba(217,130,11," + (0.07 * (1 - recalP * 0.75)).toFixed(3) + ")";
        ctx.fill();

        drawLine(ctx, midNow, w, yM, dm, { color: MK.ui.ink, width: 2, stepped: true });
        drawLine(ctx, MKT, w, yM, dm, { color: MK.ui.blue, width: 2 });
        if (dm > 0.96) {
          label(ctx, "Market P50", w - M.r + 10, yM(MKT[N - 1]) + 4, MK.ui.blue, 12, "left", 600);
          label(ctx, "Range mid", w - M.r + 10, yM(midNow[N - 1]) + 4, MK.ui.ink, 12, "left", 600);
          if (P.recal < 0.5 && P.ovl < 0.5) {
            var gapY = (yM(MKT[N - 1]) + yM(midNow[N - 1])) / 2;
            label(ctx, "The gap", xAt(N - 1, w) - 14, gapY + 4, MK.ui.amber, 13, "right", 600);
          }
        }

        if (P.ovl > 0.01) {
          ctx.globalAlpha = P.mkt * P.ovl;
          var yG = function (a) { return yM(96 + ((a - 9.5) / (20 - 9.5)) * 30 + 4); };
          var ovlCap = P.recal > 0.01 ? RECAL_I / (N - 1) : 1;
          drawLine(ctx, APJC, w, yG, Math.min(MK.easeOut(drawT.ovl), ovlCap), { color: MK.ui.amber, width: 2, dash: [1, 6] });
          if (drawT.ovl > 0.9 && P.recal < 0.01) label(ctx, "Attrition, scaled", w - M.r + 10, yG(APJC[N - 1]) + 18, MK.ui.amber, 12);
          ctx.globalAlpha = P.mkt;
        }

        if (P.recal > 0.01) {
          ctx.globalAlpha = P.mkt * P.recal;
          var rx = xAt(RECAL_I, w);
          ctx.strokeStyle = MK.ui.blue; ctx.lineWidth = 1.5; ctx.setLineDash([1, 6]); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(rx, M.t + 6); ctx.lineTo(rx, h - M.b); ctx.stroke();
          ctx.setLineDash([]); ctx.lineCap = "butt";
          label(ctx, "Ranges corrected", rx + 10, M.t + 16, MK.ui.blue, 12, "left", 600);
          var yA2 = function (a) { return yM(96 + ((a - 9.5) / (20 - 9.5)) * 30 + 4); };
          ctx.strokeStyle = MK.ui.blue; ctx.lineWidth = 2; ctx.setLineDash([1, 7]); ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(xAt(RECAL_I, w), yA2(APJC[RECAL_I]));
          APJC_FIX.forEach(function (v, i) {
            var fp = MK.clamp(P.recal * 1.3 - i * 0.28, 0, 1);
            if (fp > 0) ctx.lineTo(MK.lerp(xAt(RECAL_I + i, w), xAt(RECAL_I + i + 1, w), fp),
                                   MK.lerp(yA2(i === 0 ? APJC[RECAL_I] : APJC_FIX[i - 1]), yA2(v), fp));
          });
          ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
          if (P.recal > 0.85) label(ctx, "Attrition, projected", xAt(N - 1, w), yA2(APJC_FIX[2]) - 12, MK.ui.blue, 12, "right");
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 1;
      }
      return busy;
    });

    syncUI();
  });
})();
