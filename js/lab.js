/* ============================================================
   The offer model — section [ 03 / 04 ].

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
   no employer's pay data, nothing from Cisco.
   ============================================================ */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("labCanvasHost");
    var D = window.OFFER_DATA;
    if (!host || !D) return;

    var C = {
      ink: "#F5F5F7", dim: "rgba(245,245,247,.52)", faint: "rgba(245,245,247,.30)",
      hair: "rgba(245,245,247,.16)", band: "rgba(245,245,247,.06)",
      blue: "#8FA3FF", amber: "#FFB340", low: "#FF7A66", zone: "rgba(143,163,255,.15)"
    };

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

    /* market position: log-linear interpolation across P25/P50/P75/P90 */
    function marketPosition(m, v) {
      var p = m.pct;
      if (v < p.p25) return "below P25";
      if (v > p.p90) return "above P90";
      var pts = [[25, p.p25], [50, p.p50], [75, p.p75], [90, p.p90]];
      for (var i = 0; i < 3; i++) {
        if (v <= pts[i + 1][1]) {
          var f = (ln(v) - ln(pts[i][1])) / (ln(pts[i + 1][1]) - ln(pts[i][1]));
          return "≈ P" + Math.round(MK.lerp(pts[i][0], pts[i + 1][0], f));
        }
      }
      return "≈ P90";
    }

    function verdict(m) {
      var v = { peersBelow: 0 };
      m.peers.forEach(function (p) { if (p < S.ote) v.peersBelow++; });
      v.mp = marketPosition(m, S.ote);
      if (S.ote < m.min) {
        v.flag = "Below range minimum"; v.tone = "low";
        v.text = "Below the minimum of the range for this role and zone. Raise to at least " +
          MK.fmt$(m.min) + ", or the role and zone are the wrong frame for this candidate.";
      } else if (S.ote > m.max) {
        v.flag = "Above range maximum (exception, requires approval)"; v.tone = "exception";
        var mktHigh = m.pct.p75 > m.max;
        v.text = "Above the range maximum by " + MK.fmt$(S.ote - m.max) + ", so this needs approval, not a rationale after the fact. " +
          (mktHigh
            ? "Market P75 for this role already clears the range maximum, which is the case worth making (and a signal the market target may be set too low for this role)."
            : "The market composite does not carry this on its own. Expect to justify it on scarcity or scope instead.");
      } else if (S.ote > m.zoneHi) {
        v.flag = "Above guideline (exception)"; v.tone = "watch";
        v.text = "Inside the range but above the " + m.seg.name + " third. Defensible where the market or a scarce skill justifies it. Check the " +
          m.peers.length + " incumbents first" + (v.peersBelow >= 6 ? "; this would land above most of them, and compression is the risk you inherit." : ".");
      } else if (S.ote < m.zoneLo) {
        v.flag = "Below guideline"; v.tone = "watch";
        v.text = "Inside the range but below where a " + m.seg.name + " hire would normally be placed. It may be accepted; it tends to reappear as an off-cycle correction within the year.";
      } else {
        v.flag = "Within guidelines"; v.tone = "ok";
        v.text = "Sits in the " + m.seg.name + " third of the range, against a market target of " +
          D.targets[S.tgt].name + ". Defensible on the structure, the market, and the internal comparison, which is what makes it repeatable for the next one.";
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
    S.ote = m0.mid;
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
      quota: document.getElementById("lvQuota"),
      flag: document.getElementById("lvFlag"),
      text: document.getElementById("lvText"),
      compa: document.getElementById("mCompa"),
      pen: document.getElementById("mPen"),
      mkt: document.getElementById("mMkt"),
      peer: document.getElementById("mPeer"),
      hint: document.getElementById("mrpHint"),
      verdict: document.getElementById("labVerdict"),
      panel: document.getElementById("mpBody")
    };

    var live = document.createElement("span");
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    host.appendChild(live);

    var slider = document.getElementById("labBase");
    function syncSlider(snap) {
      if (!slider) return;
      slider.min = M.loB; slider.max = M.hiB; slider.step = 1000;
      if (snap) slider.value = S.ote;
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
        h += "<p class='mp-delta'>Versus " + sib.short + " at P50: +" + MK.fmtK(d50 * zm) + " OTE (+" +
          Math.round(d50 / sib.pct.p50 * 100) + "%)" +
          (S.role === "r3" ? ", +" + MK.fmtK(b50 * zm) + " base (+" + Math.round(b50 / (sib.pct.p50 * sib.mix.base) * 100) + "%)" : "") +
          ". At P90: +" + MK.fmtK(d90 * zm) + " (+" + Math.round(d90 / sib.pct.p90 * 100) + "%).</p>";
      }
      h += "<h5>Priced into the range</h5>" + list(P.priced);
      h += "<h5>Premium drivers</h5>" + list(P.drivers);
      h += "<h5>Why it is paid here</h5><p>" + P.why + "</p>";
      h += "<h5>Demand signal</h5><p>" + P.demand + "</p>";
      h += "<h5>Why this is a real role</h5><p>" + P.real + "</p>";
      if (R.sibling) h += "<p class='mp-foot'>" + D.panel.aiFooter + "</p>";
      return h;
    }

    function apply(announce, snap) {
      M = model();
      S.ote = MK.clamp(Math.round(S.ote / 1000) * 1000, M.loB, M.hiB);
      if (snap) S.ote = M.mid;
      syncSlider(true);
      A.lo.t = M.domLo; A.hi.t = M.domHi;
      A.min.t = M.min; A.mid.t = M.mid; A.max.t = M.max;
      A.p25.t = M.pct.p25; A.p50.t = M.pct.p50; A.p75.t = M.pct.p75; A.p90.t = M.pct.p90;
      A.tgt.t = M.mid; A.ote.t = S.ote;
      A.zLo.t = M.zoneLo; A.zHi.t = M.zoneHi;
      M.peers.forEach(function (p, i) { peersA[i].t = p; });
      V = verdict(M);

      var R = M.R;
      if (el.roleCap) el.roleCap.textContent = "Proposed OTE, " + R.short;
      if (el.derived) el.derived.textContent = "Base " + MK.fmt$(S.ote * R.mix.base) +
        " + " + R.varWord + " " + MK.fmt$(S.ote * R.mix.variable) +
        " (" + fmtPct(R.mix.base) + "/" + fmtPct(R.mix.variable) + ")";
      if (el.quota) {
        if (R.quotaAtP50Z1) {
          el.quota.hidden = false;
          el.quota.textContent = "Illustrative quota ≈ 5x OTE (about " +
            "$" + (Math.round(R.quotaAtP50Z1 * M.zm / 50000) * 50000 / 1000000).toFixed(2).replace(/0$/, "") + "M at market)";
        } else el.quota.hidden = true;
      }
      if (el.flag) el.flag.textContent = V.flag;
      if (el.verdict) el.verdict.className = "lab-verdict is-" + V.tone;
      if (el.text) el.text.textContent = V.text;
      if (el.hint) el.hint.textContent = D.targets[S.tgt].stance;

      if (el.compa) el.compa.textContent = (S.ote / M.mid).toFixed(2);
      if (el.pen) el.pen.textContent = Math.round((S.ote - M.min) / (M.max - M.min) * 100) + "%";
      if (el.mkt) el.mkt.textContent = V.mp;
      if (el.peer) el.peer.textContent = "above " + V.peersBelow + " of " + M.peers.length;
      if (el.panel) el.panel.innerHTML = panelHTML();

      if (announce) live.textContent = V.flag + ". " + V.text;
      if (inst && !inst.visible) {   /* off-screen: no spring, land instantly */
        for (var k in A) A[k].v = A[k].t;
        peersA.forEach(function (p) { p.v = p.t; });
      }
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

      /* ---- lane 1: market OTE composite ---- */
      var x25 = X(A.p25.v, w), x50 = X(A.p50.v, w), x75 = X(A.p75.v, w), x90 = X(A.p90.v, w);
      ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x25, lanM); ctx.lineTo(x90, lanM); ctx.stroke();
      [[x25, "P25"], [x50, "P50"], [x75, "P75"], [x90, "P90"]].forEach(function (t) {
        ctx.strokeStyle = C.faint;
        ctx.beginPath(); ctx.moveTo(t[0], lanM - 5); ctx.lineTo(t[0], lanM + 5); ctx.stroke();
        ctx.fillStyle = C.faint;
        ctx.fillText(t[1], t[0], lanM + 19);
      });
      if (w >= 620) {
        ctx.fillStyle = C.dim; ctx.textAlign = "left";
        ctx.fillText("Market OTE, composite", pad - 34, lanM - 18);
      }

      /* the market target percentile the philosophy sets */
      var xm = X(A.tgt.v, w);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, lanM - 11); ctx.lineTo(xm, lanM + 11); ctx.stroke();
      ctx.fillStyle = C.blue; ctx.textAlign = "center"; ctx.font = MK.font(11.5, 600);
      ctx.fillText((w >= 620 ? "Market target · " : "Target · ") + D.targets[S.tgt].name, xm, lanM - 18);

      /* ---- lane 2: the range ---- */
      var bx0 = X(A.min.v, w), bx1 = X(A.max.v, w), bmid = X(A.mid.v, w);
      ctx.fillStyle = C.band;
      ctx.fillRect(bx0, lanR - barH / 2, bx1 - bx0, barH);
      var zx0 = X(A.zLo.v, w), zx1 = X(A.zHi.v, w);
      ctx.fillStyle = C.zone;
      ctx.fillRect(zx0, lanR - barH / 2, zx1 - zx0, barH);
      if (zx1 - zx0 > 84) {
        ctx.fillStyle = "rgba(143,163,255,.72)";
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
      ctx.fillText(M.R.short + " · " + D.zones[S.zone].name, pad - 34, lanR + barH / 2 + 22);

      /* ---- lane 3: internal peers (illustrative) ---- */
      ctx.fillStyle = "rgba(245,245,247,.34)";
      peersA.forEach(function (p, i) {
        ctx.beginPath();
        ctx.arc(X(p.v, w), lanP + (i % 2) * 7, 2.6, 0, 6.2832);
        ctx.fill();
      });
      if (w >= 620) {
        ctx.fillStyle = C.faint; ctx.textAlign = "left"; ctx.font = MK.font(11.5);
        ctx.fillText("Internal peers, illustrative", pad - 34, lanP + 28);
      }

      /* ---- the proposal ---- */
      var bx = X(A.ote.v, w);
      var col = V.tone === "exception" ? C.amber : V.tone === "low" ? C.low : C.ink;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, lanM + 26); ctx.lineTo(bx, lanP + 14);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, lanR, hover || dragging ? 9.5 : 7.5, 0, 6.2832);
      ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, lanR, 2.4, 0, 6.2832);
      ctx.fillStyle = "#060607"; ctx.fill();

      if (el.base) el.base.textContent = MK.fmt$(A.ote.v);
      return busy || dragging;
    });
    if (!inst) return;

    MK.trackPointer(inst, {
      down: function (p) {
        var bx = X(A.ote.v, inst.w);
        if (Math.abs(p.x - bx) < 28) {
          dragging = true;
          inst.canvas.style.cursor = "grabbing";
          return true;
        }
        return false;
      },
      move: function (p) {
        if (dragging) {
          S.ote = MK.clamp(Math.round(VAL(p.x, inst.w) / 1000) * 1000, M.loB, M.hiB);
          A.ote.v = MK.clamp(VAL(p.x, inst.w), M.loB, M.hiB);  /* follow the finger */
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

    inst.canvas.tabIndex = 0;
    inst.canvas.setAttribute("role", "img");
    inst.canvas.setAttribute("aria-label",
      "OTE range with a market composite at the 25th, 50th, 75th, and 90th percentiles, and internal peers. Use the proposed OTE slider below to move the proposal.");

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
        btn.setAttribute("aria-expanded", String(!open));
        box.hidden = open;
        btn.textContent = open ? showTxt : hideTxt;
      });
    }
    disclosure("lvMore", "lvDetail", "Show the underlying position", "Hide the underlying position");
    disclosure("mpMore", "mpDetail", "What the market is pricing", "Hide what the market is pricing");
    disclosure("daMore", "daDetail", "Data and assumptions", "Hide data and assumptions");

    var daBody = document.getElementById("daBody");
    if (daBody) {
      daBody.innerHTML = "<h5>Sources (checked " + D.checked + ")</h5><ul>" +
        D.sources.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        "</ul><p>" + D.assumptions + "</p>";
    }

    apply(false, true);
  });
})();
