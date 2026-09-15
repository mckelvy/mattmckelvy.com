/* ============================================================
   The offer model: section 3.

   Reprices OTE (on-target earnings) for four GTM roles at a
   fixed level (Senior IC, Radford P4-equivalent). Three things
   a compensation partner never conflates, kept separate here:

     STRUCTURE   the range for the role and zone
                 (minimum, midpoint, maximum, on OTE)
     MARKET      the OTE composite for the role in that market
                 (P25 / P50 / P75 / P90) and the target
                 percentile the philosophy sets
     INDIVIDUAL  this proposal's compa-ratio, range penetration
                 and position against internal peers

   Every number resolves to js/offer-data.js. No survey data,
   no employer's pay data, nothing from Cisco. The math in
   model(), p60() and marketPosition() is the model; the words
   around it are the only thing that changes.
   ============================================================ */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("labCanvasHost");
    var D = window.OFFER_DATA;
    if (!host || !D) return;
    var T = MK.theme;

    var C = {
      ink: T.ink, dim: T.ink2, faint: MK.alpha(T.ink, 0.5),
      hair: T.rule, band: MK.alpha(T.ink, 0.05),
      cobalt: T.cobalt, ochre: T.ochre, green: T.green, coral: T.coral,
      zone: MK.alpha(T.green, 0.13), sheet: T.sheet
    };
    var TONE = { ok: C.ink, watch: C.ochre, exception: C.coral, low: C.coral };
    var TONE_SOFT = { ok: MK.alpha(T.ink, 0.35), watch: MK.alpha(T.ochre, 0.5), exception: MK.alpha(T.coral, 0.5), low: MK.alpha(T.coral, 0.5) };

    var S = { role: "r2", zone: "z1", tgt: "p50", prof: "prof", ote: 250000 };

    function ln(v) { return Math.log(v); }
    function p60(pct) { return Math.exp(MK.lerp(ln(pct.p50), ln(pct.p75), 0.4)); }

    function model() {
      var R = D.roles[S.role], zm = D.zones[S.zone].mult;
      var pct = {
        p25: R.pct.p25 * zm, p50: R.pct.p50 * zm,
        p75: R.pct.p75 * zm, p90: R.pct.p90 * zm
      };
      var mid = S.tgt === "p50" ? pct.p50 : S.tgt === "p75" ? pct.p75 : p60(pct);
      mid = Math.round(mid / 100) * 100;
      var min = Math.round(mid * D.rangeSpread.minF / 100) * 100;
      var max = Math.round(mid * D.rangeSpread.maxF / 100) * 100;

      var seg = D.assess[S.prof];
      var zoneLo = min + (max - min) * seg.lo;
      var zoneHi = min + (max - min) * seg.hi;

      var peers = D.peerRatios.map(function (r) { return Math.round(mid * r / 500) * 500; });
      var loB = Math.round(mid * 0.6 / 1000) * 1000;
      var hiB = Math.round(mid * 1.5 / 1000) * 1000;

      return { R: R, zm: zm, pct: pct, mid: mid, min: min, max: max,
               seg: seg, zoneLo: zoneLo, zoneHi: zoneHi, peers: peers,
               loB: loB, hiB: hiB, domLo: loB - (hiB - loB) * 0.02, domHi: hiB + (hiB - loB) * 0.02 };
    }

    /* market position: log-linear interpolation across P25/P50/P75/P90, reported to the nearest 5 */
    function marketPosition(m, v) {
      var p = m.pct;
      if (v < p.p25) return "below P25";
      if (v > p.p90) return "above P90";
      var pts = [[25, p.p25], [50, p.p50], [75, p.p75], [90, p.p90]];
      for (var i = 0; i < 3; i++) {
        if (v <= pts[i + 1][1]) {
          var f = (ln(v) - ln(pts[i][1])) / (ln(pts[i + 1][1]) - ln(pts[i][1]));
          return "≈ P" + Math.round(MK.lerp(pts[i][0], pts[i + 1][0], f) / 5) * 5;
        }
      }
      return "≈ P90";
    }

    /* the verdict: same thresholds as the review, said the way the visitor discovered it */
    function verdict(m) {
      var v = { peersBelow: 0 };
      m.peers.forEach(function (p) { if (p < S.ote) v.peersBelow++; });
      v.mp = marketPosition(m, S.ote);
      if (S.ote < m.min) {
        v.flag = "Below the minimum"; v.tone = "low";
        v.text = "That lands below the minimum for this role and zone, so the range is the first question. Either the number comes up to at least " +
          MK.fmt$(m.min) + ", or this is a different role or zone than the one we priced.";
      } else if (S.ote > m.max) {
        v.flag = "Above the maximum, an exception"; v.tone = "exception";
        v.text = "That clears the top of the range by " + MK.fmt$(S.ote - m.max) + " and sits " + v.mp + " on the market composite. From here it is an exception: it needs approval before it goes out. The usual reasons are market, scarcity, or scope. Whichever it is, write it down, so the next one can be compared to this one.";
      } else if (S.ote > m.zoneHi) {
        v.flag = "Above the guideline, worth a look"; v.tone = "watch";
        v.text = "Still inside the range, but above the " + m.seg.third + " third, where " + m.seg.who + " usually lands. The market or a scarce skill can carry that. Before it goes further, look at the " +
          m.peers.length + " illustrative peers already in the role" + (v.peersBelow >= 6 ? ": this would land above most of them, and compression is what you would be taking on." : ".");
      } else if (S.ote < m.zoneLo) {
        v.flag = "Below the guideline, worth a look"; v.tone = "watch";
        v.text = "Inside the range, but under the " + m.seg.third + " third, where " + m.seg.who + " usually lands. A candidate may accept it. In practice this is the offer that comes back within the year as an off-cycle correction.";
      } else {
        v.flag = "Within guidelines"; v.tone = "ok";
        v.text = "That puts us in the " + m.seg.third + " third, where " + m.seg.who + " usually lands, with the midpoint set to " +
          D.targets[S.tgt].name + ". Structure, market, and internal peers all line up, which makes this one easy to explain and the next one easy to compare.";
      }
      return v;
    }

    /* ---------------- animated scalars ---------------- */
    function anim(v, sp) { return { v: v, t: v, sp: sp }; }
    function tick(a, dt) {
      var d = a.t - a.v;
      a.v += d * Math.min(1, dt * a.sp);
      if (Math.abs(d) < Math.abs(a.t) * 0.0004 + 0.01) a.v = a.t;
      return a.v !== a.t;
    }
    var m0 = model();
    S.ote = Math.round(m0.mid / 1000) * 1000;
    var A = {
      lo: anim(m0.domLo, 3.4), hi: anim(m0.domHi, 3.4),
      min: anim(m0.min, 3.8), mid: anim(m0.mid, 3.8), max: anim(m0.max, 3.8),
      p25: anim(m0.pct.p25, 4), p50: anim(m0.pct.p50, 4), p75: anim(m0.pct.p75, 4), p90: anim(m0.pct.p90, 4),
      tgt: anim(m0.mid, 5), ote: anim(S.ote, 6),
      zLo: anim(m0.zoneLo, 4.2), zHi: anim(m0.zoneHi, 4.2)
    };
    var peersA = m0.peers.map(function (p) { return anim(p, 3.6); });
    var M = m0, V = verdict(m0);

    var el = {
      base: document.getElementById("lvBase"),
      roleCap: document.getElementById("lvRoleCap"),
      derived: document.getElementById("lvDerived"),
      flag: document.getElementById("lvFlag"),
      text: document.getElementById("lvText"),
      compa: document.getElementById("mCompa"),
      pen: document.getElementById("mPen"),
      mkt: document.getElementById("mMkt"),
      peer: document.getElementById("mPeer"),
      hint: document.getElementById("mrpHint"),
      verdict: document.getElementById("labVerdict"),
      lab: document.getElementById("lab"),
      head: document.querySelector("#lab .lab-head"),
      panel: document.getElementById("mpBody")
    };

    var live = document.createElement("span");
    live.setAttribute("aria-live", "polite");
    live.className = "sr";
    host.appendChild(live);
    var liveTimer = null, lastFlag = "";
    function announce() {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        live.textContent = V.flag + ". " + V.text;
      }, 700);
    }

    /* the sticky readout's height feeds the chart's own sticky offset */
    if (el.head && el.lab && "ResizeObserver" in window) {
      new ResizeObserver(function () {
        el.lab.style.setProperty("--lab-head-h", el.head.offsetHeight + "px");
      }).observe(el.head);
    }

    var slider = document.getElementById("labBase");
    function syncSlider(snap) {
      if (!slider) return;
      slider.min = M.loB; slider.max = M.hiB; slider.step = 1000;
      if (snap) slider.value = S.ote;
      slider.setAttribute("aria-valuetext", MK.fmt$(S.ote) + ", " + V.flag.toLowerCase());
    }
    /* the slider shares the chart's x-scale, so the thumb sits under the handle */
    var pad = 52;
    function XS(v, w) { return pad + (v - M.domLo) / (M.domHi - M.domLo) * (w - pad * 2); }
    function placeSlider() {
      if (!slider || !inst || !inst.w) return;
      var x0 = XS(M.loB, inst.w), x1 = XS(M.hiB, inst.w);
      slider.style.marginLeft = (x0 - 9) + "px";
      slider.style.width = (x1 - x0 + 18) + "px";
    }

    function fmtPct(x) { return Math.round(x * 100); }
    function panelHTML() {
      var P = D.panel[S.role], R = M.R;
      function list(items) { return "<ul>" + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>"; }
      var h = "";
      if (R.sibling) {
        var sib = D.roles[R.sibling], zm = M.zm;
        var d50 = R.pct.p50 - sib.pct.p50, d90 = R.pct.p90 - sib.pct.p90;
        var b50 = R.pct.p50 * R.mix.base - sib.pct.p50 * sib.mix.base;
        h += "<p class='mp-delta'>In this composite, versus " + sib.short + " at P50: +" + MK.fmtK(d50 * zm) + " OTE (+" +
          Math.round(d50 / sib.pct.p50 * 100) + "%)" +
          (S.role === "r3" ? ", +" + MK.fmtK(b50 * zm) + " base (+" + Math.round(b50 / (sib.pct.p50 * sib.mix.base) * 100) + "%)" : "") +
          ". At P90: +" + MK.fmtK(d90 * zm) + " (+" + Math.round(d90 / sib.pct.p90 * 100) + "%).</p>";
      }
      h += "<h3>Priced into the range</h3>" + list(P.priced);
      h += "<h3>Premium drivers</h3>" + list(P.drivers);
      h += "<h3>Why the pay mix looks like this</h3><p>" + P.why + "</p>";
      h += "<h3>Where this job shows up</h3><p>" + P.real + "</p>";
      if (R.sibling) h += "<p class='mp-foot'>" + D.panel.aiFooter + "</p>";
      return h;
    }
    var panelKey = "";

    function apply(announceNow, snap) {
      M = model();
      S.ote = MK.clamp(Math.round(S.ote / 1000) * 1000, M.loB, M.hiB);
      if (snap) S.ote = MK.clamp(Math.round(M.mid / 1000) * 1000, M.loB, M.hiB);
      A.lo.t = M.domLo; A.hi.t = M.domHi;
      A.min.t = M.min; A.mid.t = M.mid; A.max.t = M.max;
      A.p25.t = M.pct.p25; A.p50.t = M.pct.p50; A.p75.t = M.pct.p75; A.p90.t = M.pct.p90;
      A.tgt.t = M.mid; A.ote.t = S.ote;
      A.zLo.t = M.zoneLo; A.zHi.t = M.zoneHi;
      M.peers.forEach(function (p, i) { peersA[i].t = p; });
      V = verdict(M);
      syncSlider(true);
      placeSlider();

      var R = M.R;
      if (el.roleCap) el.roleCap.textContent = R.short;
      if (el.derived) el.derived.textContent = "Base " + MK.fmt$(S.ote * R.mix.base) +
        " + " + R.varWord + " " + MK.fmt$(S.ote * R.mix.variable) +
        " (" + fmtPct(R.mix.base) + "/" + fmtPct(R.mix.variable) + ")";
      if (el.flag) el.flag.textContent = V.flag;
      if (el.verdict) el.verdict.className = "lab-verdict is-" + V.tone;
      if (el.lab) el.lab.className = "lab is-" + V.tone;
      if (el.text) el.text.textContent = V.text;
      if (el.hint) el.hint.textContent = D.targets[S.tgt].stance;

      if (el.compa) el.compa.textContent = (S.ote / M.mid).toFixed(2);
      if (el.pen) el.pen.textContent = Math.round((S.ote - M.min) / (M.max - M.min) * 100) + "%";
      if (el.mkt) el.mkt.textContent = V.mp;
      if (el.peer) el.peer.textContent = "above " + V.peersBelow + " of " + M.peers.length;
      var key = S.role + S.zone;
      if (el.panel && key !== panelKey) { panelKey = key; el.panel.innerHTML = panelHTML(); }

      if (announceNow || V.flag !== lastFlag) { lastFlag = V.flag; announce(); }
      if (inst && !inst.visible) {   /* off-screen: no spring, land instantly */
        for (var k in A) A[k].v = A[k].t;
        peersA.forEach(function (p) { p.v = p.t; });
      }
      if (inst) inst.wake();
    }

    /* ---------------- drawing ---------------- */
    function X(v, w) { return pad + (v - A.lo.v) / (A.hi.v - A.lo.v) * (w - pad * 2); }
    function VAL(px, w) { return A.lo.v + (px - pad) / (w - pad * 2) * (A.hi.v - A.lo.v); }

    var dragging = false, hover = false, grabOff = 0;

    /* the proposal's vertical hairline steps around any label it would strike through */
    function vline(ctx, x, y0, y1, avoid) {
      var cuts = avoid.filter(function (a) { return x > a.x0 && x < a.x1; })
        .sort(function (a, b) { return a.y0 - b.y0; });
      var y = y0;
      ctx.beginPath();
      cuts.forEach(function (c) {
        if (c.y0 > y) { ctx.moveTo(x, y); ctx.lineTo(x, Math.max(y, c.y0)); }
        y = Math.max(y, c.y1);
      });
      if (y < y1) { ctx.moveTo(x, y); ctx.lineTo(x, y1); }
      ctx.stroke();
    }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      for (var k in A) if (tick(A[k], dt)) busy = true;
      peersA.forEach(function (p, i) { if (tick(p, dt * (1 - i * 0.02))) busy = true; });
      if (MK.reduced) { for (var k2 in A) A[k2].v = A[k2].t; peersA.forEach(function (p) { p.v = p.t; }); busy = false; }

      var lanM = h * 0.24;   /* market lane   */
      var lanR = h * 0.57;   /* range lane    */
      var lanP = h * 0.87;   /* peer lane     */
      var barH = Math.min(34, h * 0.16);
      var narrow = w < 480;
      var avoid = [];
      var tw = function (txt) { return ctx.measureText(txt).width; };
      var lx = pad - 34;     /* every lane title starts here, above its lane */

      ctx.font = MK.font(12.5);
      ctx.textAlign = "center";

      /* ---- lane 1: market OTE composite ---- */
      var x25 = X(A.p25.v, w), x50 = X(A.p50.v, w), x75 = X(A.p75.v, w), x90 = X(A.p90.v, w);
      ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x25, lanM); ctx.lineTo(x90, lanM); ctx.stroke();
      [[x25, "P25"], [x50, "P50"], [x75, "P75"], [x90, "P90"]].forEach(function (t) {
        ctx.strokeStyle = C.faint;
        ctx.beginPath(); ctx.moveTo(t[0], lanM - 5); ctx.lineTo(t[0], lanM + 5); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.font = MK.font(12.5);
        ctx.fillText(t[1], t[0], lanM + 20);
        avoid.push({ x0: t[0] - 14, x1: t[0] + 14, y0: lanM + 9, y1: lanM + 23 });
      });
      ctx.fillStyle = C.dim; ctx.textAlign = "left"; ctx.font = MK.font(12.5, 500);
      var t1 = narrow ? "The market" : "The market, an OTE composite";
      ctx.fillText(t1, lx, lanM - 30);
      avoid.push({ x0: lx - 4, x1: lx + tw(t1) + 4, y0: lanM - 42, y1: lanM - 26 });

      /* the market target percentile the philosophy sets */
      var xm = X(A.tgt.v, w);
      ctx.strokeStyle = C.cobalt; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, lanM - 11); ctx.lineTo(xm, lanM + 11); ctx.stroke();
      ctx.fillStyle = T.cobaltText; ctx.textAlign = "center"; ctx.font = MK.font(12.5, 500);
      var tgtTxt = (narrow ? "Target " : "Market target ") + D.targets[S.tgt].name;
      ctx.fillText(tgtTxt, xm, lanM - 16);
      avoid.push({ x0: xm - tw(tgtTxt) / 2 - 4, x1: xm + tw(tgtTxt) / 2 + 4, y0: lanM - 28, y1: lanM - 12 });

      /* ---- lane 2: the range ---- */
      var bx0 = X(A.min.v, w), bx1 = X(A.max.v, w), bmid = X(A.mid.v, w);
      ctx.fillStyle = C.band;
      ctx.fillRect(bx0, lanR - barH / 2, bx1 - bx0, barH);
      var zx0 = X(A.zLo.v, w), zx1 = X(A.zHi.v, w);
      ctx.fillStyle = C.zone;
      ctx.fillRect(zx0, lanR - barH / 2, zx1 - zx0, barH);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
      ctx.strokeRect(bx0 + 0.5, lanR - barH / 2 + 0.5, bx1 - bx0 - 1, barH - 1);
      if (zx1 - zx0 > 84) {
        ctx.fillStyle = T.greenText; ctx.font = MK.font(11.5, 500); ctx.textAlign = "center";
        ctx.fillText("guideline", (zx0 + zx1) / 2, lanR + barH / 2 - 7);
        avoid.push({ x0: (zx0 + zx1) / 2 - 30, x1: (zx0 + zx1) / 2 + 30, y0: lanR + barH / 2 - 18, y1: lanR + barH / 2 - 3 });
      }
      ctx.strokeStyle = C.hair;
      ctx.beginPath(); ctx.moveTo(bmid, lanR - barH / 2); ctx.lineTo(bmid, lanR + barH / 2); ctx.stroke();

      ctx.font = MK.font(12.5); ctx.fillStyle = C.dim;
      var top = lanR - barH / 2 - 11, bot = lanR + barH / 2;
      var tMin = "Min " + MK.fmtK(A.min.v), tMid = "Mid " + MK.fmtK(A.mid.v), tMax = "Max " + MK.fmtK(A.max.v);
      if (!narrow) {
        ctx.textAlign = "center";
        ctx.fillText(tMin, bx0, top); ctx.fillText(tMid, bmid, top); ctx.fillText(tMax, bx1, top);
        [[bx0, tMin], [bmid, tMid], [bx1, tMax]].forEach(function (l) {
          avoid.push({ x0: l[0] - tw(l[1]) / 2 - 4, x1: l[0] + tw(l[1]) / 2 + 4, y0: top - 12, y1: top + 4 });
        });
      } else {
        /* narrow canvases: three labels take three rows, min below-left, max above-right, mid below-center */
        ctx.textAlign = "left";   ctx.fillText(tMin, bx0, top);
        avoid.push({ x0: bx0 - 4, x1: bx0 + tw(tMin) + 4, y0: top - 12, y1: top + 4 });
        ctx.textAlign = "right";  ctx.fillText(tMax, bx1, top - 15);
        avoid.push({ x0: bx1 - tw(tMax) - 4, x1: bx1 + 4, y0: top - 27, y1: top - 11 });
        ctx.textAlign = "center"; ctx.fillText(tMid, bmid, bot + 17);
        avoid.push({ x0: bmid - tw(tMid) / 2 - 4, x1: bmid + tw(tMid) / 2 + 4, y0: bot + 5, y1: bot + 21 });
      }
      ctx.textAlign = "left"; ctx.fillStyle = C.dim; ctx.font = MK.font(12.5, 500);
      var t2 = narrow ? "The range" : "The range, " + M.R.short + ", " + D.zones[S.zone].short;
      var t2y = narrow ? top - 34 : top - 18;
      ctx.fillText(t2, lx, t2y);
      avoid.push({ x0: lx - 4, x1: lx + tw(t2) + 4, y0: t2y - 12, y1: t2y + 4 });

      /* ---- lane 3: internal peers (illustrative), open circles that fill as the proposal passes them ---- */
      ctx.font = MK.font(12.5, 500); ctx.fillStyle = C.dim; ctx.textAlign = "left";
      var t3 = narrow ? "The peers" : "The peers, illustrative";
      var t3y = lanP - 20;
      ctx.fillText(t3, lx, t3y);
      avoid.push({ x0: lx - 4, x1: lx + tw(t3) + 4, y0: t3y - 12, y1: t3y + 4 });
      ctx.lineWidth = 1.2;
      peersA.forEach(function (p, i) {
        var passed = p.v < A.ote.v;
        ctx.beginPath();
        ctx.arc(X(p.v, w), lanP + (i % 2) * 7, 3.2, 0, 6.2832);
        ctx.fillStyle = passed ? (TONE_SOFT[V.tone] || C.faint) : C.sheet;
        ctx.strokeStyle = MK.alpha(T.ink, 0.55);
        ctx.fill(); ctx.stroke();
      });

      /* ---- the proposal ---- */
      var bx = X(A.ote.v, w);
      var col = TONE[V.tone] || C.ink;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
      vline(ctx, bx, lanM + 26, lanP + 14, avoid);
      ctx.beginPath(); ctx.arc(bx, lanR, hover || dragging ? 10 : 8, 0, 6.2832);
      ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, lanR, 2.6, 0, 6.2832);
      ctx.fillStyle = C.sheet; ctx.fill();

      /* the readout ticks in thousands, like a meter, never in odd dollars */
      if (el.base) el.base.textContent = MK.fmt$(Math.round(A.ote.v / 1000) * 1000);
      return busy || dragging;
    }, function (inst) {
      inst.onResize = function () { placeSlider(); };
    });
    if (!inst) return;

    /* detents: the handle catches softly at the range's landmarks, wider under a finger */
    function detent(v) {
      var marks = [M.min, M.zoneLo, M.mid, M.zoneHi, M.max];
      var pull = (M.hiB - M.loB) * (MK.coarse ? 0.03 : 0.012);
      for (var i = 0; i < marks.length; i++) if (Math.abs(v - marks[i]) < pull) return marks[i];
      return v;
    }

    MK.trackPointer(inst, {
      down: function (p) {
        var bx = X(A.ote.v, inst.w);
        if (Math.abs(p.x - bx) < 28) {
          dragging = true; grabOff = p.x - bx;
          inst.canvas.style.cursor = "grabbing";
          return true;
        }
        return false;
      },
      move: function (p) {
        if (dragging) {
          var raw = MK.clamp(VAL(p.x - grabOff, inst.w), M.loB, M.hiB);
          var caught = detent(raw);
          S.ote = MK.clamp(Math.round(caught / 1000) * 1000, M.loB, M.hiB);
          A.ote.v = caught;  /* follow the finger, catch on the landmarks */
          apply(false);
        } else {
          hover = Math.abs(p.x - X(A.ote.v, inst.w)) < 28;
          inst.canvas.style.cursor = hover ? "grab" : "default";
        }
      },
      up: function () {
        if (!dragging) return;
        dragging = false;
        inst.canvas.style.cursor = hover ? "grab" : "default";
        apply(true);
      },
      leave: function () { hover = false; }
    });

    inst.canvas.setAttribute("aria-label",
      "OTE range with a market composite at the 25th, 50th, 75th, and 90th percentiles, and internal peers. Use the proposed OTE slider to move the proposal.");

    /* ---------------- controls ---------------- */
    function seg(id, key) {
      var g = document.getElementById(id);
      if (!g) return;
      var btns = [].slice.call(g.querySelectorAll("button"));
      btns.forEach(function (b) {
        MK.on(b, "click", function () {
          btns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          S[key] = b.dataset.v;
          apply(true, key === "role" || key === "zone");   /* snap OTE to the new midpoint */
        });
      });
    }
    seg("labRole", "role");
    seg("labGeo", "zone");
    seg("labMrp", "tgt");
    seg("labProf", "prof");

    if (slider) MK.on(slider, "input", function () { S.ote = +slider.value; apply(false); });
    if (slider) MK.on(slider, "change", function () { apply(true); });

    function disclosure(btnId, boxId, showTxt, hideTxt) {
      var btn = document.getElementById(btnId), box = document.getElementById(boxId);
      if (!btn || !box) return;
      MK.on(btn, "click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        MK.disclose(btn, box, !open);
        btn.textContent = open ? showTxt : hideTxt;
      });
    }
    disclosure("lvMore", "lvDetail", "The numbers behind it", "Hide the numbers");
    disclosure("mpMore", "mpDetail", "What the market is pricing", "Hide what the market is pricing");
    disclosure("daMore", "daDetail", "Data and assumptions", "Hide data and assumptions");

    var daBody = document.getElementById("daBody");
    if (daBody) {
      daBody.innerHTML = "<h3>Sources (checked " + D.checked + ")</h3><ul>" +
        D.sources.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        "</ul><p>" + D.assumptions + "</p>";
    }

    apply(false, true);
    placeSlider();
  });
})();
