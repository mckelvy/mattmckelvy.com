/* 1 · Range drift: the investigation, five moves on one canvas.
   Ink carries the organization, ochre carries the signal, cobalt marks
   the recommendation. Illustrative data: relative shapes only. No
   rates, no projected results. Tells its story once when the whole
   instrument is in view; any touch hands control back to the visitor,
   and at the last step the review line can be dragged earlier. */
(function () {
  "use strict";
  MK.register("drift", function (root) {
    var host = root.querySelector("#driftCanvasHost");
    if (!host) return;
    var $ = function (id) { return root.querySelector("#" + id); };
    var T = MK.theme;

    var N = 14;
    /* attrition by region on a relative scale: unitless, never labeled with a rate */
    var AMER = [9.2,9.5,9.1,9.8,10.1,9.7,9.4,10.0,9.6,9.9,10.2,9.8,9.5,9.7];
    var EMEA = [10.1,9.8,10.4,10.0,10.6,10.2,10.8,10.4,10.9,10.5,11.0,10.6,10.3,10.7];
    var APJC = [10.4,10.2,10.8,11.2,11.9,12.4,13.1,13.8,14.6,15.2,15.9,16.4,16.8,17.0];
    /* pay, indexed: midpoints step on the annual structure cycle, the market moves continuously */
    var MID  = [100,100,100,102,102,102,102,104,104,104,104,106,106,106];
    var MKT  = [100,101,102,103,104,106,107,108,110,111,112,113,114,115];
    var recalI = 10;             /* where the review lands; draggable at the last step */

    var step = 0, TOTAL = 5;
    var P = { attr: 1, pat: 0, mkt: 0, gap: 0, recal: 0 };
    var Tt = { attr: 1, pat: 0, mkt: 0, gap: 0, recal: 0 };
    var drawT = { attr: 0, pat: 0, mkt: 0, gap: 0, recal: 0 };
    var recalX = recalI;         /* eased position of the review line */

    var READOUTS = [
      "Attrition in one region climbed while the others held, and the open roles there were not filling. That was the signal. It was not yet an explanation.",
      "The exits cut across go-to-market, operations, and engineering, all in one geography. Three functions with the same problem usually share a market, not a manager.",
      "Range midpoints for that market, re-plotted against the peer median. Midpoints had moved on the annual structure adjustment. The market had moved faster, and the gap compounded.",
      "The market reference ranges for those roles had drifted below the peer median, and the attrition traced to that gap. Association, not proof, but the strongest explanation on the table.",
      "Recommendation: recalibrate the ranges to the current peer median, then review the incumbents against the new midpoints, starting where the gap was widest. Offers fix themselves once the range moves. The people already inside it do not. And the market keeps moving, so the review goes on the calendar."
    ];

    var auto = null, touched = false;
    function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
    function setStep(s, byUser) {
      if (byUser) { touched = true; stopAuto(); }
      step = MK.clamp(s, 0, TOTAL - 1);
      Tt.attr  = step <= 1 ? 1 : 0;
      Tt.pat   = step === 1 ? 1 : 0;
      Tt.mkt   = step >= 2 ? 1 : 0;
      Tt.gap   = step === 2 ? 0.45 : step === 3 ? 1 : step === 4 ? 0.25 : 0;
      Tt.recal = step === 4 ? 1 : 0;
      syncUI(byUser);
      if (inst) inst.wake();
    }
    function play() {
      stopAuto();
      auto = setInterval(function () {
        if (step >= TOTAL - 1) { stopAuto(); return; }
        setStep(step + 1, false);
      }, 5500);
    }

    var stepsEl = $("driftSteps");
    var lis = stepsEl ? [].slice.call(stepsEl.children) : [];
    var btns = lis.map(function (li) { return li.querySelector("button"); });
    var prev = $("driftPrev"), next = $("driftNext");
    var count = $("driftCount"), readout = $("driftReadout");
    function syncUI(byUser) {
      btns.forEach(function (b, i) {
        if (!b) return;
        if (i === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (count) {
        var nm = btns[step] ? btns[step].firstChild.textContent : "";
        count.textContent = "";
        count.appendChild(document.createTextNode((step + 1) + " of " + TOTAL));
        var sn = document.createElement("span"); sn.className = "step-name"; sn.textContent = nm;
        count.appendChild(sn);
      }
      if (readout) {
        /* the readout announces only the steps the visitor takes */
        if (byUser && !readout.hasAttribute("aria-live")) readout.setAttribute("aria-live", "polite");
        readout.textContent = READOUTS[step];
      }
      if (prev) prev.disabled = step === 0;
      if (next) next.textContent = step === TOTAL - 1 ? "Start over" : "Continue";
    }
    btns.forEach(function (b, i) { if (b) MK.on(b, "click", function () { setStep(i, true); }); });
    if (prev) MK.on(prev, "click", function () { setStep(step - 1, true); });
    if (next) MK.on(next, "click", function () {
      if (step === TOTAL - 1) { setStep(0, true); play(); }   /* start over replays the story */
      else setStep(step + 1, true);
    });

    /* the readout never moves the page: reserve the tallest one, measured on a clone */
    if (readout) {
      var probe = readout.cloneNode(false);
      probe.removeAttribute("id"); probe.removeAttribute("aria-live");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:" + readout.clientWidth + "px";
      readout.parentNode.appendChild(probe);
      var tallest = 0;
      READOUTS.forEach(function (r) { probe.textContent = r; tallest = Math.max(tallest, probe.offsetHeight); });
      probe.parentNode.removeChild(probe);
      if (tallest) readout.style.minHeight = tallest + "px";
    }

    var M = { l: 44, r: 112, t: 30, b: 30 };
    function xAt(i, w) { return M.l + (i / (N - 1)) * (w - M.l - M.r); }
    function iAt(x, w) { return MK.clamp(Math.round((x - M.l) / (w - M.l - M.r) * (N - 1)), 0, N - 1); }

    function drawLine(ctx, series, w, yFn, prog, opts) {
      opts = opts || {};
      var upTo = prog * (N - 1);
      ctx.strokeStyle = opts.color || T.ink;
      ctx.lineWidth = opts.width || 1.5;
      ctx.setLineDash(opts.dash || []);
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
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
      ctx.font = MK.font(size || 12.5, weight || 400);
      ctx.fillStyle = color || T.ink2;
      ctx.textAlign = align || "left";
      ctx.fillText(txt, x, y);
    }
    /* draftsman's hatching, built once as a tile and used as a fill */
    var hatchPattern = null;
    function hatch(ctx) {
      if (!hatchPattern) {
        var tile = document.createElement("canvas");
        var dpr = Math.min(devicePixelRatio || 1, 2);
        tile.width = 6 * dpr; tile.height = 6 * dpr;
        var tc = tile.getContext("2d");
        tc.scale(dpr, dpr);
        tc.strokeStyle = T.ochre; tc.lineWidth = 1;
        tc.beginPath(); tc.moveTo(-1, 7); tc.lineTo(7, -1); tc.moveTo(-1, 1); tc.lineTo(1, -1); tc.moveTo(5, 7); tc.lineTo(7, 5); tc.stroke();
        hatchPattern = ctx.createPattern(tile, "repeat");
        if (hatchPattern && hatchPattern.setTransform && "DOMMatrix" in window) hatchPattern.setTransform(new DOMMatrix().scale(1 / dpr));
      }
      return hatchPattern;
    }

    var hoverI = -1, dragging = false, nearLine = false;
    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      var speed = Math.min(1, dt * 4.2), dspeed = Math.min(1, dt * 1.4);
      for (var k in P) {
        P[k] += (Tt[k] - P[k]) * speed;
        if (Math.abs(Tt[k] - P[k]) > 0.004) busy = true; else P[k] = Tt[k];
        var dTarget = Tt[k] > 0.05 ? 1 : 0;
        if (dTarget === 0) drawT[k] = 0;
        else { drawT[k] += (1.001 - drawT[k]) * dspeed; if (drawT[k] > 0.996) drawT[k] = 1; else busy = true; }
      }
      recalX += (recalI - recalX) * Math.min(1, dt * 9);
      if (Math.abs(recalI - recalX) > 0.002) busy = true; else recalX = recalI;
      if (MK.reduced) { for (var k2 in P) { P[k2] = Tt[k2]; drawT[k2] = Tt[k2] > 0 ? 1 : 0; } recalX = recalI; busy = false; }

      var plotH = h - M.t - M.b;

      /* ---- attrition by region, relative ---- */
      if (P.attr > 0.01) {
        var lo = 8.5, hi = 18.5;
        var yA = function (v) { return M.t + (1 - (v - lo) / (hi - lo)) * plotH; };
        ctx.globalAlpha = P.attr;
        ctx.strokeStyle = T.ruleSoft; ctx.lineWidth = 1;
        for (var g = 0; g < 4; g++) {
          var gy = M.t + (g / 3) * plotH;
          ctx.beginPath(); ctx.moveTo(M.l, gy); ctx.lineTo(w - M.r, gy); ctx.stroke();
        }
        label(ctx, "Attrition by region, relative", M.l, M.t - 12, T.ink2, 12.5, "left", 500);
        label(ctx, "Year 1", xAt(0, w), h - 8);
        label(ctx, "Year 3", xAt(N - 1, w), h - 8, T.ink2, 12.5, "right");
        var dp = MK.easeOut(drawT.attr);
        var dim = 1 - P.pat * 0.6;   /* the other regions' lines recede while the pattern is read; their names do not */
        drawLine(ctx, AMER, w, yA, dp, { color: T.ink, width: 1.5, alpha: 0.22 * dim * P.attr });
        drawLine(ctx, EMEA, w, yA, dp, { color: T.ink, width: 1.5, alpha: 0.36 * dim * P.attr });
        drawLine(ctx, APJC, w, yA, Math.min(dp * 1.05, 1), { color: T.ochre, width: 2.4, alpha: P.attr });
        ctx.globalAlpha = P.attr;
        if (dp > 0.96) {
          label(ctx, "Americas", w - M.r + 10, yA(AMER[N - 1]) + 4, T.ink2);
          label(ctx, "EMEA", w - M.r + 10, yA(EMEA[N - 1]) + 4, T.ink2);
          label(ctx, "APJC", w - M.r + 10, yA(APJC[N - 1]) + 4, T.ochreText, 12.5, "left", 500);
        }
        if (P.pat > 0.01) {
          ctx.globalAlpha = P.attr * MK.ease(P.pat);
          label(ctx, "Exits across go-to-market,", M.l + 4, M.t + 22, T.ochreText, 13, "left", 500);
          label(ctx, "operations, and engineering", M.l + 4, M.t + 40, T.ochreText, 13, "left", 500);
          label(ctx, "in one geography", M.l + 4, M.t + 58, T.ochreText, 13, "left", 500);
        }
        ctx.globalAlpha = 1;
      }

      /* ---- structure vs market, indexed ---- */
      if (P.mkt > 0.01) {
        ctx.globalAlpha = P.mkt;
        var yM = function (v) { return M.t + (1 - (v - 96) / (126 - 96)) * plotH; };
        var recalP = MK.ease(P.recal);
        var ri = Math.round(recalX);
        var midNow = MID.map(function (v, i) { return i >= ri ? MK.lerp(v, MKT[ri], recalP) : v; });
        ctx.strokeStyle = T.ruleSoft; ctx.lineWidth = 1;
        [100, 110, 120].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(M.l, yM(g)); ctx.lineTo(w - M.r, yM(g)); ctx.stroke();
          label(ctx, String(g), M.l - 10, yM(g) + 4, T.ink2, 12.5, "right");
        });
        label(ctx, "Midpoint vs peer median, indexed", M.l, M.t - 12, T.ink2, 12.5, "left", 500);
        label(ctx, "Year 1", xAt(0, w), h - 8);
        label(ctx, "Year 3", xAt(N - 1, w), h - 8, T.ink2, 12.5, "right");

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
        var pat = hatch(ctx);
        ctx.globalAlpha = (0.22 + 0.5 * P.gap) * (1 - recalP * 0.55) * P.mkt;
        ctx.fillStyle = pat || MK.alpha(T.ochre, 0.2);
        ctx.fill();
        ctx.globalAlpha = P.mkt;

        drawLine(ctx, midNow, w, yM, dm, { color: T.ink, width: 2, stepped: true, alpha: P.mkt });
        drawLine(ctx, MKT, w, yM, dm, { color: T.cobalt, width: 2, alpha: P.mkt });
        ctx.globalAlpha = P.mkt;
        if (dm > 0.96) {
          label(ctx, "Peer median", w - M.r + 10, yM(MKT[N - 1]) + 4, T.cobaltText, 12.5, "left", 500);
          label(ctx, "Range midpoint", w - M.r + 10, yM(midNow[N - 1]) + 4, T.ink, 12.5, "left", 500);
          if (P.recal < 0.5) {
            var gapY = (yM(MKT[N - 1]) + yM(midNow[N - 1])) / 2;
            ctx.globalAlpha = P.mkt * (1 - recalP * 2);
            label(ctx, P.gap > 0.7 ? "Below the peer median" : "The gap", xAt(N - 1, w) - 14, gapY + 4, T.ochreText, 13, "right", 500);
            ctx.globalAlpha = P.mkt;
          }
        }

        /* the recommendation: recalibrate at the review point (drag it earlier at the last step) */
        if (P.recal > 0.01) {
          ctx.globalAlpha = P.mkt * P.recal;
          var rx = xAt(recalX, w);
          ctx.strokeStyle = T.cobalt; ctx.lineWidth = dragging || nearLine ? 2.2 : 1.5; ctx.setLineDash([1, 6]); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(rx, M.t + 6); ctx.lineTo(rx, h - M.b); ctx.stroke();
          ctx.setLineDash([]); ctx.lineCap = "butt";
          /* a small handle at the top, so the line reads as something you can move */
          ctx.fillStyle = T.sheet; ctx.beginPath(); ctx.arc(rx, M.t + 6, 5.5, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = T.cobalt; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(rx, M.t + 6, 5.5, 0, 6.2832); ctx.stroke();
          var early = ri < 10;
          label(ctx, early ? "Reviewed earlier" : "Recalibrate (recommended)", rx - 12, M.t + 16, T.cobaltText, 12.5, "right", 500);
          ctx.globalAlpha = 1;
        }

        /* a time cursor: rests on Year 3, follows the pointer */
        var ci = hoverI >= 0 ? hoverI : (dm > 0.96 ? N - 1 : -1);
        if (ci >= 0 && !dragging && P.mkt > 0.9) {
          var hx = xAt(ci, w);
          if (hoverI >= 0) { ctx.strokeStyle = T.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, M.t + 2); ctx.lineTo(hx, h - M.b); ctx.stroke(); }
          [[MKT[ci], T.cobalt], [midNow[ci], T.ink]].forEach(function (pt) {
            ctx.fillStyle = T.sheet; ctx.beginPath(); ctx.arc(hx, yM(pt[0]), 4.5, 0, 6.2832); ctx.fill();
            ctx.strokeStyle = pt[1]; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx, yM(pt[0]), 4.5, 0, 6.2832); ctx.stroke();
          });
          if (hoverI >= 0) {
            var align = hx > w * 0.6 ? "right" : "left", ox = hx > w * 0.6 ? -10 : 10;
            var ty = Math.max(Math.min(yM(MKT[ci]), yM(midNow[ci])) - 14, M.t + 30);
            label(ctx, "Peer median " + Math.round(MKT[ci]), hx + ox, ty, T.cobaltText, 12.5, align, 500);
            label(ctx, "Midpoint " + Math.round(midNow[ci]), hx + ox, ty + 16, T.ink, 12.5, align, 500);
          }
        }
        ctx.globalAlpha = 1;
      }
      return busy || dragging;
    });
    if (!inst) return;

    function nearReview(p) {
      return step === 4 && P.recal > 0.5 && Math.abs(p.x - xAt(recalX, inst.w)) < 16;
    }
    MK.trackPointer(inst, {
      down: function (p) {
        if (nearReview(p)) { dragging = true; touched = true; stopAuto(); inst.canvas.style.cursor = "grabbing"; return true; }
        return false;
      },
      move: function (p) {
        if (dragging) { recalI = MK.clamp(iAt(p.x, inst.w), 3, N - 2); return; }
        nearLine = nearReview(p);
        hoverI = (step >= 2 && MK.fine && p.x >= M.l - 8 && p.x <= inst.w - M.r + 8) ? iAt(p.x, inst.w) : -1;
        inst.canvas.style.cursor = nearLine ? "grab" : hoverI >= 0 ? "crosshair" : "default";
      },
      up: function () { if (dragging) { dragging = false; inst.canvas.style.cursor = nearLine ? "grab" : "default"; } },
      leave: function () { hoverI = -1; nearLine = false; }
    });

    /* it tells its story once, when the whole instrument is in view, unless the visitor is already driving */
    syncUI(false);
    if (MK.reduced) setStep(TOTAL - 1, false);
    else if ("IntersectionObserver" in window) {
      var seen = false;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting || seen || touched) return;
          seen = true;
          play();
        });
      }, { threshold: 0.98 }).observe(readout || host);
    }
  });
})();
