/* ============================================================
   The offer model — 03

   Three things a compensation partner never conflates, kept
   deliberately separate here:

     STRUCTURE   the company's range for the level and zone
                 (minimum, midpoint, maximum)
     MARKET      surveyed base salary for the job in that labor
                 market (P25 / P50 / P75) and the reference point
                 the philosophy targets
     INDIVIDUAL  this proposal's compa-ratio, range penetration
                 and position against internal peers

   There is no weighted score. A recommendation zone comes from the
   range segment appropriate to the assessment; everything else is a
   guardrail that either clears or requires a justification.

   Structure, survey data and peers are illustrative.
   ============================================================ */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("labCanvasHost");
    if (!host) return;

    var C = {
      ink: "#F5F5F7", dim: "rgba(245,245,247,.52)", faint: "rgba(245,245,247,.30)",
      hair: "rgba(245,245,247,.16)", band: "rgba(245,245,247,.06)",
      blue: "#2997FF", amber: "#FFB340", low: "#FF7A66", zone: "rgba(41,151,255,.14)"
    };

    /* ---------------- the world ----------------
       Midpoints progress ~15% between levels, within the 10–15%
       convention for professional/management structures.
       Ranges run a 50% spread (max = min × 1.5), the common default
       for professional roles: min = mid × 0.8, max = mid × 1.2. */
    var LEVELS = {
      L3: { name: "SE II",        mid: 152000 },
      L4: { name: "Senior SE",    mid: 175000 },
      L5: { name: "Principal SE", mid: 201000 }
    };
    /* Geographic pay zones. Illustrative differentials against Zone 2. */
    var ZONES = {
      z1: { name: "Zone 1", f: 1.12, note: "highest-cost markets" },
      z2: { name: "Zone 2", f: 1.00, note: "national reference" },
      z3: { name: "Zone 3", f: 0.90, note: "lower-cost markets" }
    };
    var MRP = {
      p50: { name: "P50", label: "median", stance: "match the market" },
      p60: { name: "P60", label: "60th percentile", stance: "lead slightly" },
      p75: { name: "P75", label: "75th percentile", stance: "lead the market" }
    };
    /* Range segments by assessment, expressed as compa-ratio bounds —
       how practitioners actually place a new hire in a range. */
    var SEGMENT = {
      dev:  { lo: 0.80, hi: 1.00, name: "developing in role" },
      prof: { lo: 0.95, hi: 1.10, name: "fully proficient" },
      exp:  { lo: 1.05, hi: 1.20, name: "deep expertise" }
    };
    var PAY_MIX = { base: 70, variable: 30 };   /* common for sales engineering */

    var S = { level: "L4", zone: "z2", mrp: "p50", prof: "prof", baseT: 0.5 };

    function model() {
      var z = ZONES[S.zone].f;
      var mid = Math.round(LEVELS[S.level].mid * z / 500) * 500;
      var min = Math.round(mid * 0.8 / 500) * 500;
      var max = Math.round(mid * 1.2 / 500) * 500;

      /* Surveyed base salary for this job and labor market. The structure
         is built around the median, so P50 sits at the midpoint here —
         that is this example's philosophy, not a law. */
      var p50 = mid;
      var p25 = Math.round(p50 * 0.88 / 500) * 500;
      var p75 = Math.round(p50 * 1.14 / 500) * 500;
      var mrpVal = S.mrp === "p50" ? p50
                 : S.mrp === "p75" ? p75
                 : p50 + (p75 - p50) * 0.4;          /* P60, interpolated */

      /* Internal peers: incumbents at this level in this zone. */
      var rng = MK.rng(S.level.charCodeAt(1) * 7919 + S.zone.charCodeAt(1) * 131);
      var peers = [];
      for (var i = 0; i < 14; i++) {
        var g = (rng() + rng() + rng() + rng() - 2) / 2;
        /* rounded like real salaries — synthetic data should not carry
           more precision than the thing it is standing in for */
        peers.push(Math.round(mid * 0.975 * (1 + g * 0.105) / 500) * 500);
      }
      peers.sort(function (a, b) { return a - b; });
      var pMed = (peers[6] + peers[7]) / 2;
      var p75peer = peers[10];

      var seg = SEGMENT[S.prof];
      var zoneLo = Math.max(min, mid * seg.lo);
      var zoneHi = Math.min(max, mid * seg.hi);

      var domLo = min * 0.86, domHi = max * 1.12;
      var base = domLo + (domHi - domLo) * S.baseT;
      base = Math.round(base / 500) * 500;

      return { mid: mid, min: min, max: max, p25: p25, p50: p50, p75: p75,
               mrpVal: mrpVal, peers: peers, pMed: pMed, p75peer: p75peer,
               zoneLo: zoneLo, zoneHi: zoneHi, seg: seg,
               domLo: domLo, domHi: domHi, base: base };
    }

    /* approximate survey percentile by interpolation between observations */
    function marketPosition(m, v) {
      if (v < m.p25) return { txt: "below the 25th percentile", pct: null };
      if (v > m.p75) return { txt: "above the 75th percentile", pct: null };
      var pct = v <= m.p50
        ? 25 + 25 * (v - m.p25) / (m.p50 - m.p25)
        : 50 + 25 * (v - m.p50) / (m.p75 - m.p50);
      return { txt: "≈ P" + Math.round(pct) + " of surveyed base salary", pct: pct };
    }

    function verdict(m) {
      var base = m.base;
      var peersBelow = 0;
      for (var i = 0; i < m.peers.length; i++) if (m.peers[i] < base) peersBelow++;
      var mp = marketPosition(m, base);
      var v = { peersBelow: peersBelow, mp: mp };

      if (base < m.min) {
        v.flag = "Below range minimum";
        v.tone = "low";
        v.text = "Below the minimum of the range for this level and zone. Raise to at least " +
                 MK.fmt$(m.min) + ", or the level itself is the wrong question to be asking.";
        return v;
      }
      if (base > m.max) {
        v.flag = "Exception required";
        v.tone = "exception";
        var marketSupports = m.mrpVal > m.max * 0.99;
        v.text = "Above the range maximum by " + MK.fmt$(base - m.max) + ", so this needs approval, not " +
          "a rationale after the fact. " +
          (marketSupports
            ? "The market reference for this job already sits at the top of the range, which is the " +
              "case worth making — and a signal the structure itself may be due for review."
            : "The market reference sits at " + MK.fmt$(m.mrpVal) + ", inside the range, so the market " +
              "data does not carry this on its own. Expect to justify it on scarcity or scope instead.");
        return v;
      }
      if (base > m.zoneHi) {
        v.flag = "Above guideline";
        v.tone = "watch";
        v.text = "Inside the range but above the " + m.seg.name + " segment. Defensible where the market " +
          "or the skill justifies it — worth checking against the " + m.peers.length + " incumbents at this " +
          "level first" + (base > m.p75peer ? ", since this would land above most of them and compression is the risk you inherit." : ".");
        return v;
      }
      if (base < m.zoneLo) {
        v.flag = "Below guideline";
        v.tone = "watch";
        v.text = "Inside the range but below where a " + m.seg.name + " hire would normally be placed. " +
          "It may be accepted; it tends to reappear as an off-cycle correction within the year.";
        return v;
      }
      v.flag = "Within guidelines";
      v.tone = "ok";
      v.text = "Sits in the part of the range this assessment supports, against a market reference of " +
        MK.fmt$(m.mrpVal) + " (" + MRP[S.mrp].name + "). Defensible on the structure, the market and the " +
        "internal comparison — which is what makes it repeatable for the next one.";
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
    var A = {
      lo: anim(m0.domLo, 3.4), hi: anim(m0.domHi, 3.4),
      min: anim(m0.min, 3.8), mid: anim(m0.mid, 3.8), max: anim(m0.max, 3.8),
      p25: anim(m0.p25, 4), p50: anim(m0.p50, 4), p75: anim(m0.p75, 4),
      mrp: anim(m0.mrpVal, 5), base: anim(m0.base, 6),
      zLo: anim(m0.zoneLo, 4.2), zHi: anim(m0.zoneHi, 4.2), pMed: anim(m0.pMed, 4)
    };
    var peersA = m0.peers.map(function (p) { return anim(p, 3.6); });
    var M = m0, V = verdict(m0);

    var el = {
      base: document.getElementById("lvBase"),
      flag: document.getElementById("lvFlag"),
      text: document.getElementById("lvText"),
      compa: document.getElementById("mCompa"),
      pen: document.getElementById("mPen"),
      mkt: document.getElementById("mMkt"),
      peer: document.getElementById("mPeer"),
      cash: document.getElementById("lvCash"),
      hint: document.getElementById("mrpHint"),
      verdict: document.getElementById("labVerdict")
    };

    var live = document.createElement("span");
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    host.appendChild(live);

    function apply(announce) {
      M = model();
      A.lo.t = M.domLo; A.hi.t = M.domHi;
      A.min.t = M.min; A.mid.t = M.mid; A.max.t = M.max;
      A.p25.t = M.p25; A.p50.t = M.p50; A.p75.t = M.p75;
      A.mrp.t = M.mrpVal; A.base.t = M.base;
      A.zLo.t = M.zoneLo; A.zHi.t = M.zoneHi; A.pMed.t = M.pMed;
      M.peers.forEach(function (p, i) { peersA[i].t = p; });
      V = verdict(M);

      if (el.flag) { el.flag.textContent = V.flag; }
      if (el.verdict) el.verdict.className = "lab-verdict is-" + V.tone;
      if (el.text) el.text.textContent = V.text;
      if (el.hint) el.hint.textContent = MRP[S.mrp].stance;

      var compa = M.base / M.mid;
      var pen = (M.base - M.min) / (M.max - M.min);
      if (el.compa) el.compa.textContent = compa.toFixed(2);
      if (el.pen) el.pen.textContent = Math.round(pen * 100) + "%";
      if (el.mkt) el.mkt.textContent = V.mp.txt;
      if (el.peer) el.peer.textContent = "above " + V.peersBelow + " of " + M.peers.length +
        " · peer median " + MK.fmt$(M.pMed);

      if (el.cash) {
        var ti = M.base * (PAY_MIX.variable / PAY_MIX.base);
        el.cash.innerHTML =
          "This role is incentive-eligible. At a " + PAY_MIX.base + "/" + PAY_MIX.variable +
          " pay mix, a base of <b>" + MK.fmt$(M.base) + "</b> carries a target incentive of <b>" +
          MK.fmt$(ti) + "</b>, for target total cash of <b>" + MK.fmt$(M.base + ti) +
          "</b>. The range above prices base salary only — target total cash is not measured against it.";
      }
      if (announce) live.textContent = V.flag + ". " + V.text;
      if (inst) inst.wake();
    }

    /* ---------------- drawing ---------------- */
    var pad = 52;
    function X(v, w) { return pad + (v - A.lo.v) / (A.hi.v - A.lo.v) * (w - pad * 2); }
    function VAL(px, w) { return A.lo.v + (px - pad) / (w - pad * 2) * (A.hi.v - A.lo.v); }

    var dragging = false, hover = false;

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      for (var k in A) if (tick(A[k], dt)) busy = true;
      peersA.forEach(function (p, i) { if (tick(p, dt * (1 - i * 0.02))) busy = true; });
      if (MK.reduced) { for (var k2 in A) A[k2].v = A[k2].t; peersA.forEach(function (p) { p.v = p.t; }); busy = false; }

      var lanM = h * 0.20;   /* market lane   */
      var lanR = h * 0.52;   /* range lane    */
      var lanP = h * 0.83;   /* peer lane     */
      var barH = Math.min(38, h * 0.17);

      ctx.font = MK.font(11.5);
      ctx.textAlign = "center";

      /* ---- lane 1: surveyed market ---- */
      var x25 = X(A.p25.v, w), x50 = X(A.p50.v, w), x75 = X(A.p75.v, w);
      ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x25, lanM); ctx.lineTo(x75, lanM); ctx.stroke();
      [[x25, "P25"], [x50, "P50"], [x75, "P75"]].forEach(function (t) {
        ctx.strokeStyle = C.faint;
        ctx.beginPath(); ctx.moveTo(t[0], lanM - 5); ctx.lineTo(t[0], lanM + 5); ctx.stroke();
        ctx.fillStyle = C.faint;
        ctx.fillText(t[1], t[0], lanM + 19);
      });
      /* on narrow canvases the lane title would collide with the market
         reference label; the ticks and the read-out carry it instead */
      if (w >= 620) {
        ctx.fillStyle = C.dim; ctx.textAlign = "left";
        ctx.fillText("Surveyed base salary", pad - 34, lanM - 18);
      }

      /* the market reference point this philosophy targets */
      var xm = X(A.mrp.v, w);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, lanM - 11); ctx.lineTo(xm, lanM + 11); ctx.stroke();
      ctx.fillStyle = C.blue; ctx.textAlign = "center"; ctx.font = MK.font(11.5, 600);
      ctx.fillText((w >= 620 ? "Market reference · " : "Market ref · ") + MRP[S.mrp].name, xm, lanM - 18);

      /* ---- lane 2: the company's range ---- */
      var bx0 = X(A.min.v, w), bx1 = X(A.max.v, w), bmid = X(A.mid.v, w);
      ctx.fillStyle = C.band;
      ctx.fillRect(bx0, lanR - barH / 2, bx1 - bx0, barH);
      /* the segment this assessment supports */
      var zx0 = X(A.zLo.v, w), zx1 = X(A.zHi.v, w);
      ctx.fillStyle = C.zone;
      ctx.fillRect(zx0, lanR - barH / 2, zx1 - zx0, barH);
      if (zx1 - zx0 > 84) {
        ctx.fillStyle = "rgba(41,151,255,.62)";
        ctx.font = MK.font(10.5, 600);
        ctx.textAlign = "center";
        ctx.fillText("GUIDELINE", (zx0 + zx1) / 2, lanR + barH / 2 - 6);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      [bx0, bx1].forEach(function (x) {
        ctx.beginPath(); ctx.moveTo(x, lanR - barH / 2 - 4); ctx.lineTo(x, lanR + barH / 2 + 4); ctx.stroke();
      });
      ctx.strokeStyle = C.hair;
      ctx.beginPath(); ctx.moveTo(bmid, lanR - barH / 2); ctx.lineTo(bmid, lanR + barH / 2); ctx.stroke();

      ctx.font = MK.font(11.5); ctx.fillStyle = C.dim; ctx.textAlign = "center";
      ctx.fillText("Min " + MK.fmtK(A.min.v), bx0, lanR - barH / 2 - 11);
      ctx.fillText("Mid " + MK.fmtK(A.mid.v), bmid, lanR - barH / 2 - 11);
      ctx.fillText("Max " + MK.fmtK(A.max.v), bx1, lanR - barH / 2 - 11);
      ctx.textAlign = "left"; ctx.fillStyle = C.dim;
      ctx.fillText(LEVELS[S.level].name + " range · " + ZONES[S.zone].name, pad - 34, lanR + barH / 2 + 22);

      /* ---- lane 3: internal peers ---- */
      ctx.fillStyle = "rgba(245,245,247,.34)";
      peersA.forEach(function (p, i) {
        ctx.beginPath();
        ctx.arc(X(p.v, w), lanP + (i % 2) * 7, 2.6, 0, 6.2832);
        ctx.fill();
      });
      if (w >= 620) {
        ctx.fillStyle = C.faint; ctx.textAlign = "left"; ctx.font = MK.font(11.5);
        ctx.fillText("Incumbents at this level", pad - 34, lanP + 28);
      }

      /* ---- the proposal ---- */
      var bx = X(A.base.v, w);
      var col = V.tone === "exception" ? C.amber : V.tone === "low" ? C.low : C.ink;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, lanM + 26); ctx.lineTo(bx, lanP + 14);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, lanR, hover || dragging ? 9.5 : 7.5, 0, 6.2832);
      ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, lanR, 2.4, 0, 6.2832);
      ctx.fillStyle = "#060607"; ctx.fill();

      if (el.base) el.base.textContent = MK.fmt$(A.base.v);
      return busy || dragging;
    });
    if (!inst) return;

    MK.trackPointer(inst, {
      down: function (p) {
        var bx = X(A.base.v, inst.w);
        if (Math.abs(p.x - bx) < 28) {
          dragging = true;
          inst.canvas.style.cursor = "grabbing";
          return true;
        }
        return false;
      },
      move: function (p) {
        if (dragging) {
          S.baseT = MK.clamp((p.x - pad) / (inst.w - pad * 2), 0, 1);
          var slider = document.getElementById("labBase");
          if (slider) slider.value = Math.round(S.baseT * 1000);
          A.base.v = VAL(p.x, inst.w);   /* follow the finger exactly */
          apply(false);
        } else {
          hover = Math.abs(p.x - X(A.base.v, inst.w)) < 28;
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

    inst.canvas.tabIndex = 0;
    inst.canvas.setAttribute("role", "img");
    inst.canvas.setAttribute("aria-label",
      "Pay range with market survey observations and internal peers. Use the proposed base slider below to move the proposal.");

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
          apply(true);
        });
      });
    }
    seg("labLevel", "level");
    seg("labGeo", "zone");
    seg("labMrp", "mrp");
    seg("labProf", "prof");

    var slider = document.getElementById("labBase");
    if (slider) MK.on(slider, "input", function () { S.baseT = slider.value / 1000; apply(false); });
    if (slider) MK.on(slider, "change", function () { apply(true); });

    var more = document.getElementById("lvMore"), detail = document.getElementById("lvDetail");
    if (more && detail) MK.on(more, "click", function () {
      var open = more.getAttribute("aria-expanded") === "true";
      more.setAttribute("aria-expanded", String(!open));
      detail.hidden = open;
      more.textContent = open ? "Show the underlying position" : "Hide the underlying position";
    });

    apply(false);
  });
})();
