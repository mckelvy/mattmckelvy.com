/* Exhibit C — the offer lab. A working (synthetic) recreation of the
   out-of-range offer model: level, geo, scarcity, market target, ask →
   a recommendation with a position, not just a number. */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("labCanvasHost");
    if (!host) return;

    /* ------------- palette (plate) ------------- */
    var C = {
      ink: "#F0E9DC", ink2: "#CFC6B5", faint: "#8D8474",
      line: "rgba(243,236,224,.16)", lineSoft: "rgba(243,236,224,.08)",
      market: "#7FA6E8", amber: "#E8A03C", low: "#D97862", good: "#77B598"
    };

    /* ------------- model ------------- */
    var MIDS = { L3: 150000, L4: 185000, L5: 224000 };
    var GEO = { bay: 1.18, atx: 1.0, rem: 0.94 };
    var GEO_NAME = { bay: "SF Bay", atx: "Austin", rem: "Remote US" };
    var SCARCE = { low: 0.985, med: 1.0, high: 1.045 };

    var S = { level: "L4", geo: "atx", scarce: "med", pct: 55, askT: 430 / 1000 };

    function model() {
      var mid = MIDS[S.level] * GEO[S.geo];
      var min = mid * 0.8, max = mid * 1.2;
      var p50 = mid * 1.035 * SCARCE[S.scarce];
      var target = p50 * (1 + (S.pct - 50) * 0.008);
      var rng = MK.rng(S.level.charCodeAt(1) * 7919 + S.geo.charCodeAt(0) * 131);
      var peers = [];
      for (var i = 0; i < 14; i++) {
        var g = (rng() + rng() + rng() + rng() - 2) / 2;   /* ~normal */
        peers.push(mid * 0.985 * (1 + g * 0.11));
      }
      peers.sort(function (a, b) { return a - b; });
      var pMed = (peers[6] + peers[7]) / 2;
      var askLo = min * 0.85, askHi = max * 1.3;
      var ask = MK.lerp(askLo, askHi, S.askT);
      var rec = 0.62 * target + 0.30 * pMed + 0.08 * ask;
      return { mid: mid, min: min, max: max, p50: p50, target: target,
               peers: peers, pMed: pMed, p90: peers[12], ask: ask, rec: rec };
    }

    function verdict(m) {
      var pen = (m.rec - m.min) / (m.max - m.min);
      var compa = m.rec / m.mid;
      var meta = Math.round(pen * 100) + "% through range · compa " + compa.toFixed(2) +
                 " · peer median " + MK.fmt$(m.pMed);
      var cls = "", text;
      if (m.rec > m.max) {
        cls = "is-exception";
        var over = m.rec - m.max;
        var marketCase = m.target > m.max * 0.99;
        var strong = marketCase && S.scarce === "high";
        text = "Exception territory — " + MK.fmt$(over) + " above range max. The evidence: market P" + S.pct +
               " prices this at " + MK.fmt$(m.target) + (marketCase ? ", itself above the range" : ", inside the range") +
               "; scarcity is " + S.scarce.toUpperCase() +
               (S.scarce === "high" ? ", which supports it" : ", which doesn't help") +
               "; the ask is " + MK.fmt$(m.ask) + ". " +
               (strong ? "Defensible — take it to sign-off with the market case in hand."
                       : "Weak case — counter at " + MK.fmt$(m.max) + " and sell the range, not the exception.");
      } else if (m.rec < m.min) {
        cls = "is-low";
        text = "Below range minimum. Raise to at least " + MK.fmt$(m.min) +
               " — hiring under min creates equity debt you'll repay with interest at the first cycle.";
      } else if (m.rec > m.p90) {
        text = "Approvable at " + MK.fmt$(m.rec) + ", but it lands above roughly nine in ten current " + S.level +
               " peers in " + GEO_NAME[S.geo] + ". Expect compression questions — pair the cash with a scope story.";
      } else if (m.rec >= m.pMed) {
        text = "Recommend " + MK.fmt$(m.rec) + " — inside range, above peer median" +
               (S.scarce === "high" ? ", justified by scarcity." : ". Clean, defensible, repeatable.");
      } else {
        text = "Recommend " + MK.fmt$(m.rec) + " — inside range, below peer median. Room to move if they negotiate" +
               (m.ask > m.rec * 1.08 ? ", and they will: the ask is " + MK.fmt$(m.ask) + "." : ".");
      }
      return { cls: cls, meta: meta, text: text, pen: pen };
    }

    /* ------------- animated scalars ------------- */
    function anim(v, speed) { return { v: v, t: v, speed: speed }; }
    function tick(a, dt) {
      var d = a.t - a.v;
      a.v += d * Math.min(1, dt * a.speed);
      if (Math.abs(d) < Math.abs(a.t) * 0.0004 + 0.01) a.v = a.t;
      return a.v !== a.t;
    }

    var m0 = model();
    var A = {
      lo: anim(m0.min * 0.86, 3.2), hi: anim(m0.max * 1.18, 3.2),
      min: anim(m0.min, 3.6), max: anim(m0.max, 3.6), mid: anim(m0.mid, 3.6),
      target: anim(m0.target, 5), ask: anim(m0.ask, 6), rec: anim(m0.rec, 4.2),
      pMed: anim(m0.pMed, 4)
    };
    var peersA = m0.peers.map(function (p) { return anim(p, 3.4); });
    var vd = verdict(m0);

    var lvBase = document.getElementById("lvBase"),
        lvMeta = document.getElementById("lvMeta"),
        lvText = document.getElementById("lvText"),
        lvBox = document.getElementById("labVerdict");

    function apply() {
      var m = model();
      A.min.t = m.min; A.max.t = m.max; A.mid.t = m.mid;
      A.lo.t = m.min * 0.86; A.hi.t = m.max * 1.18;
      A.target.t = m.target; A.ask.t = m.ask; A.rec.t = m.rec; A.pMed.t = m.pMed;
      m.peers.forEach(function (p, i) { peersA[i].t = p; });
      vd = verdict(m);
      if (lvMeta) lvMeta.textContent = vd.meta;
      if (lvText) lvText.textContent = vd.text;
      if (lvBox) { lvBox.className = "lab-verdict " + vd.cls; }
      var pctOut = document.getElementById("labPctOut");
      if (pctOut) pctOut.textContent = "P" + S.pct;
      var askOut = document.getElementById("labAskOut");
      if (askOut) askOut.textContent = MK.fmt$(m.ask);
      if (inst) inst.wake();
    }

    /* ------------- canvas ------------- */
    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      for (var k in A) if (tick(A[k], dt)) busy = true;
      peersA.forEach(function (p, i) { if (tick(p, dt * (1 - i * 0.02))) busy = true; });
      if (MK.reduced) { for (var k2 in A) A[k2].v = A[k2].t; peersA.forEach(function (p) { p.v = p.t; }); busy = false; }

      var pad = 44;
      function X(v) { return pad + (v - A.lo.v) / (A.hi.v - A.lo.v) * (w - pad * 2); }
      var axisY = h * 0.44, bandH = 40;

      /* axis */
      ctx.strokeStyle = C.lineSoft; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(16, axisY); ctx.lineTo(w - 16, axisY); ctx.stroke();

      /* $ gridline labels every 20k within domain */
      ctx.font = MK.font.mono(9); ctx.fillStyle = C.faint; ctx.textAlign = "center";
      var step = 20000;
      var t0 = Math.ceil(A.lo.v / step) * step;
      for (var gv = t0; gv < A.hi.v; gv += step) {
        var gx = X(gv);
        ctx.strokeStyle = C.lineSoft;
        ctx.beginPath(); ctx.moveTo(gx, axisY - 3); ctx.lineTo(gx, axisY + 3); ctx.stroke();
        if (w > 480 || Math.round(gv / step) % 2 === 0) ctx.fillText(MK.fmtK(gv), gx, h - 10);
      }

      /* range band */
      var bx0 = X(A.min.v), bx1 = X(A.max.v), midX = X(A.mid.v);
      ctx.fillStyle = "rgba(243,236,224,.06)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx0, axisY - bandH / 2, bx1 - bx0, bandH, 5);
      else ctx.rect(bx0, axisY - bandH / 2, bx1 - bx0, bandH);
      ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      [bx0, bx1].forEach(function (rx) {
        ctx.beginPath(); ctx.moveTo(rx, axisY - bandH / 2 - 5); ctx.lineTo(rx, axisY + bandH / 2 + 5); ctx.stroke();
      });
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.moveTo(midX, axisY - bandH / 2); ctx.lineTo(midX, axisY + bandH / 2); ctx.stroke();
      ctx.fillStyle = C.faint; ctx.font = MK.font.mono(9);
      ctx.fillText("MIN " + MK.fmtK(A.min.v), bx0, axisY - bandH / 2 - 11);
      ctx.fillText("MID", midX, axisY - bandH / 2 - 11);
      ctx.fillText("MAX " + MK.fmtK(A.max.v), bx1, axisY - bandH / 2 - 11);

      /* market target */
      var tx = X(A.target.v);
      ctx.strokeStyle = C.market; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, axisY - bandH / 2 - 24); ctx.lineTo(tx, axisY + bandH / 2 + 4); ctx.stroke();
      ctx.fillStyle = C.market; ctx.font = MK.font.mono(9.5, 700);
      ctx.fillText("MKT P" + S.pct, tx, axisY - bandH / 2 - 30);

      /* ask */
      var ax = X(A.ask.v);
      ctx.fillStyle = C.amber;
      ctx.beginPath(); ctx.moveTo(ax, axisY + bandH / 2 + 4); ctx.lineTo(ax - 5, axisY + bandH / 2 + 12); ctx.lineTo(ax + 5, axisY + bandH / 2 + 12); ctx.closePath(); ctx.fill();
      ctx.font = MK.font.mono(9);
      ctx.fillText("ASK", ax, axisY + bandH / 2 + 24);

      /* peers */
      ctx.fillStyle = "rgba(243,236,224,.42)";
      peersA.forEach(function (p, i) {
        var px = X(p.v), py = axisY + bandH / 2 + 34 + (i % 3) * 9;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      });
      var pmx = X(A.pMed.v);
      ctx.strokeStyle = "rgba(243,236,224,.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pmx, axisY + bandH / 2 + 28); ctx.lineTo(pmx, axisY + bandH / 2 + 58); ctx.stroke();
      ctx.fillStyle = C.faint; ctx.textAlign = "left";
      ctx.fillText("PEERS · " + S.level + " · " + GEO_NAME[S.geo].toUpperCase(), Math.min(X(peersA[0].v), w - 190), axisY + bandH / 2 + 74);

      /* recommendation marker */
      var rx = X(A.rec.v);
      var recCol = A.rec.v > A.max.v * 1.001 ? C.amber : A.rec.v < A.min.v ? C.low : C.ink;
      ctx.strokeStyle = recCol; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx, axisY - bandH / 2 - 8); ctx.lineTo(rx, axisY + bandH / 2 + 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, axisY, 9, 0, Math.PI * 2);
      ctx.fillStyle = recCol; ctx.fill();
      ctx.beginPath(); ctx.arc(rx, axisY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#1B1712"; ctx.fill();
      ctx.font = MK.font.mono(13, 700); ctx.fillStyle = recCol; ctx.textAlign = "center";
      ctx.fillText(MK.fmt$(A.rec.v), MK.clamp(rx, 64, w - 64), axisY - bandH / 2 - 44);

      /* live number in the verdict panel follows the spring */
      if (lvBase) lvBase.textContent = MK.fmt$(A.rec.v);

      return busy;
    });

    /* ------------- controls ------------- */
    function seg(id, key) {
      var el = document.getElementById(id);
      if (!el) return;
      var btns = [].slice.call(el.querySelectorAll("button"));
      btns.forEach(function (b) {
        MK.on(b, "click", function () {
          btns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          S[key] = b.dataset.v;
          apply();
        });
      });
    }
    seg("labLevel", "level");
    seg("labGeo", "geo");
    seg("labScarce", "scarce");
    var pct = document.getElementById("labPct");
    if (pct) MK.on(pct, "input", function () { S.pct = +pct.value; apply(); });
    var ask = document.getElementById("labAsk");
    if (ask) MK.on(ask, "input", function () { S.askT = ask.value / 1000; apply(); });

    apply();
  });
})();
