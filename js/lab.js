/* 03 · Offer exceptions — one number, one range, the evidence underneath.
   The recommendation is draggable; the model pulls it back. Synthetic. */
(function () {
  "use strict";
  MK.ready(function () {
    var host = document.getElementById("labCanvasHost");
    if (!host) return;

    var C = {
      ink: "#F5F5F7", dim: "rgba(245,245,247,.45)", dim2: "rgba(245,245,247,.28)",
      hair: "rgba(245,245,247,.14)", band: "rgba(245,245,247,.07)",
      blue: "#2997FF", amber: "#FFB340", low: "#FF7A66", plate: "#060607"
    };

    /* ------------- model (unchanged logic) ------------- */
    var MIDS = { L3: 150000, L4: 185000, L5: 224000 };
    var GEO = { bay: 1.18, atx: 1.0, rem: 0.94 };
    var GEO_NAME = { bay: "SF Bay", atx: "Austin", rem: "Remote US" };
    var SCARCE = { low: 0.985, med: 1.0, high: 1.045 };
    var SCARCE_WORD = { low: "common", med: "contested", high: "scarce" };

    var S = { level: "L4", geo: "atx", scarce: "med", pct: 55, askT: 430 / 1000 };

    function model() {
      var mid = MIDS[S.level] * GEO[S.geo];
      var min = mid * 0.8, max = mid * 1.2;
      var p50 = mid * 1.035 * SCARCE[S.scarce];
      var target = p50 * (1 + (S.pct - 50) * 0.008);
      var rng = MK.rng(S.level.charCodeAt(1) * 7919 + S.geo.charCodeAt(0) * 131);
      var peers = [];
      for (var i = 0; i < 14; i++) {
        var g = (rng() + rng() + rng() + rng() - 2) / 2;
        peers.push(mid * 0.985 * (1 + g * 0.11));
      }
      peers.sort(function (a, b) { return a - b; });
      var pMed = (peers[6] + peers[7]) / 2;
      var ask = MK.lerp(min * 0.85, max * 1.3, S.askT);
      var rec = 0.62 * target + 0.30 * pMed + 0.08 * ask;
      return { mid: mid, min: min, max: max, p50: p50, target: target,
               peers: peers, pMed: pMed, p90: peers[12], ask: ask, rec: rec };
    }

    function verdict(m) {
      var cls = "", text;
      if (m.rec > m.max) {
        cls = "is-exception";
        var marketCase = m.target > m.max * 0.99;
        var strong = marketCase && S.scarce === "high";
        text = "Exception territory — " + MK.fmt$(m.rec - m.max) + " above range max. Market P" + S.pct +
               " prices this at " + MK.fmt$(m.target) + (marketCase ? ", itself above the range" : ", inside the range") +
               "; the skill is " + SCARCE_WORD[S.scarce] + "; the ask is " + MK.fmt$(m.ask) + ". " +
               (strong ? "Defensible — take it to sign-off with the market case in hand."
                       : "Weak case — counter at " + MK.fmt$(m.max) + " and sell the range, not the exception.");
      } else if (m.rec < m.min) {
        cls = "is-low";
        text = "Below range minimum. Raise to at least " + MK.fmt$(m.min) +
               " — hiring under min creates equity debt you repay with interest at the first cycle.";
      } else if (m.rec > m.p90) {
        text = "Approvable, but it lands above roughly nine in ten current " + S.level + " peers in " +
               GEO_NAME[S.geo] + ". Expect compression questions — pair the cash with a scope story.";
      } else if (m.rec >= m.pMed) {
        text = "Recommend " + MK.fmt$(m.rec) + " — inside range, above peer median" +
               (S.scarce === "high" ? ", justified by scarcity." : ". Clean, defensible, repeatable.");
      } else {
        text = "Recommend " + MK.fmt$(m.rec) + " — inside range, below peer median. Room to move if they negotiate" +
               (m.ask > m.rec * 1.08 ? ", and they will: the ask is " + MK.fmt$(m.ask) + "." : ".");
      }
      return { cls: cls, text: text };
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
      target: anim(m0.target, 5), ask: anim(m0.ask, 6), pMed: anim(m0.pMed, 4)
    };
    var peersA = m0.peers.map(function (p) { return anim(p, 3.4); });
    var vd = verdict(m0);
    var M = m0;

    /* the recommendation is a physical object: draggable, spring-loaded */
    var disp = m0.rec, vel = 0, dragging = false, hover = false;

    var lvBase = document.getElementById("lvBase"),
        lvMeta = document.getElementById("lvMeta"),
        lvText = document.getElementById("lvText");

    var live = document.createElement("span");
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    host.appendChild(live);

    function apply(announce) {
      M = model();
      A.min.t = M.min; A.max.t = M.max; A.mid.t = M.mid;
      A.lo.t = M.min * 0.86; A.hi.t = M.max * 1.18;
      A.target.t = M.target; A.ask.t = M.ask; A.pMed.t = M.pMed;
      M.peers.forEach(function (p, i) { peersA[i].t = p; });
      vd = verdict(M);
      if (lvText) lvText.textContent = vd.text;
      if (lvBase) lvBase.parentElement.className = "lab-number " + vd.cls;
      var pctOut = document.getElementById("labPctOut");
      if (pctOut) pctOut.textContent = "P" + S.pct;
      var askOut = document.getElementById("labAskOut");
      if (askOut) askOut.textContent = MK.fmt$(M.ask);
      if (announce) live.textContent = "Recommendation " + MK.fmt$(M.rec) + ". " + vd.text;
      if (inst) inst.wake();
    }

    function metaFor(v) {
      var pen = (v - A.min.t) / (A.max.t - A.min.t);
      var compa = v / A.mid.t;
      var s = Math.round(pen * 100) + "% through range · compa " + compa.toFixed(2);
      if (dragging) {
        var d = v - M.rec;
        return "Your number · " + s + " · " + (d >= 0 ? "+" : "−") + MK.fmt$(Math.abs(d)).slice(1) + " vs the model";
      }
      if (v > A.max.t * 1.001) return "Recommended base · " + s + " · above range max";
      return "Recommended base · " + s + " · peer median " + MK.fmt$(A.pMed.t);
    }

    /* ------------- canvas ------------- */
    var pad = 46;
    function X(v, w) { return pad + (v - A.lo.v) / (A.hi.v - A.lo.v) * (w - pad * 2); }
    function VAL(px, w) { return A.lo.v + (px - pad) / (w - pad * 2) * (A.hi.v - A.lo.v); }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      for (var k in A) if (tick(A[k], dt)) busy = true;
      peersA.forEach(function (p, i) { if (tick(p, dt * (1 - i * 0.02))) busy = true; });

      /* spring the displayed number toward the model's recommendation */
      if (!dragging) {
        var acc = (M.rec - disp) * 90 - vel * 14;
        vel += acc * dt;
        disp += vel * dt;
        if (Math.abs(vel) > 40 || Math.abs(M.rec - disp) > 60) busy = true;
        else { disp = M.rec; vel = 0; }
      }
      if (MK.reduced) { for (var k2 in A) A[k2].v = A[k2].t; peersA.forEach(function (p) { p.v = p.t; }); if (!dragging) disp = M.rec; busy = false; }

      var axisY = h * 0.40, bandH = 44;

      /* axis */
      ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(14, axisY); ctx.lineTo(w - 14, axisY); ctx.stroke();

      /* $ ticks */
      ctx.font = MK.font(12); ctx.fillStyle = C.dim2; ctx.textAlign = "center";
      var t0 = Math.ceil(A.lo.v / 20000) * 20000;
      for (var gv = t0; gv < A.hi.v; gv += 20000) {
        var gx = X(gv, w);
        ctx.beginPath(); ctx.moveTo(gx, axisY - 3); ctx.lineTo(gx, axisY + 3); ctx.stroke();
        if (w > 560 || Math.round(gv / 20000) % 2 === 0) ctx.fillText(MK.fmtK(gv), gx, h - 10);
      }

      /* range band */
      var bx0 = X(A.min.v, w), bx1 = X(A.max.v, w), midX = X(A.mid.v, w);
      ctx.fillStyle = C.band;
      ctx.fillRect(bx0, axisY - bandH / 2, bx1 - bx0, bandH);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      [bx0, bx1].forEach(function (rx) {
        ctx.beginPath(); ctx.moveTo(rx, axisY - bandH / 2 - 4); ctx.lineTo(rx, axisY + bandH / 2 + 4); ctx.stroke();
      });
      ctx.strokeStyle = C.hair;
      ctx.beginPath(); ctx.moveTo(midX, axisY - bandH / 2); ctx.lineTo(midX, axisY + bandH / 2); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.font = MK.font(12);
      ctx.fillText("Min " + MK.fmtK(A.min.v), bx0, axisY - bandH / 2 - 14);
      ctx.fillText("Mid", midX, axisY - bandH / 2 - 14);
      ctx.fillText("Max " + MK.fmtK(A.max.v), bx1, axisY - bandH / 2 - 14);

      /* forces, revealed while holding the number */
      var mx = X(disp, w);
      if (dragging) {
        function force(fx, y, color, k) {
          var strength = MK.clamp(Math.abs(fx - mx) / (w * 0.3) * k, 0, 1);
          if (strength < 0.02) return;
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.25 + strength * 0.55;
          ctx.lineWidth = 1 + strength;
          ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(fx, y); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        force(X(A.target.v, w), axisY - 8, C.blue, 1.0);
        force(X(A.pMed.v, w), axisY + 8, "rgba(245,245,247,.7)", 1.0);
        force(X(A.ask.v, w), axisY + 16, C.amber, 0.6);
      }

      /* market target */
      var tx = X(A.target.v, w);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, axisY - bandH / 2 - 26); ctx.lineTo(tx, axisY + bandH / 2 + 2); ctx.stroke();
      ctx.fillStyle = C.blue; ctx.font = MK.font(12, 600);
      ctx.fillText("Market P" + S.pct, tx, axisY - bandH / 2 - 34);

      /* ask */
      var ax = X(A.ask.v, w);
      ctx.fillStyle = C.amber;
      ctx.beginPath(); ctx.moveTo(ax, axisY + bandH / 2 + 4); ctx.lineTo(ax - 4.5, axisY + bandH / 2 + 12); ctx.lineTo(ax + 4.5, axisY + bandH / 2 + 12); ctx.closePath(); ctx.fill();
      ctx.font = MK.font(12);
      ctx.fillText("Ask", ax, axisY + bandH / 2 + 26);

      /* peers (compressed on short canvases so labels never collide) */
      var ps = h < 215 ? 0.72 : 1;
      ctx.fillStyle = "rgba(245,245,247,.34)";
      peersA.forEach(function (p, i) {
        var px = X(p.v, w), py = axisY + bandH / 2 + (40 + (i % 3) * 9) * ps;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.2832); ctx.fill();
      });
      var pmx = X(A.pMed.v, w);
      ctx.strokeStyle = "rgba(245,245,247,.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pmx, axisY + bandH / 2 + 34 * ps); ctx.lineTo(pmx, axisY + bandH / 2 + 64 * ps); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.textAlign = "left"; ctx.font = MK.font(12);
      ctx.fillText("Peers — " + S.level + " · " + GEO_NAME[S.geo], Math.min(X(peersA[0].v, w), w - 170), axisY + bandH / 2 + 82 * ps);

      /* the recommendation */
      var over = disp > A.max.v * 1.001, under = disp < A.min.v * 0.999;
      var recCol = over ? C.amber : under ? C.low : C.ink;
      ctx.strokeStyle = recCol; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, axisY - bandH / 2 - 6); ctx.lineTo(mx, axisY + bandH / 2 + 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, axisY, hover || dragging ? 10 : 8, 0, 6.2832);
      ctx.fillStyle = recCol; ctx.fill();
      ctx.beginPath(); ctx.arc(mx, axisY, 2.6, 0, 6.2832);
      ctx.fillStyle = C.plate; ctx.fill();

      /* the number and its meta follow the physical object */
      if (lvBase) lvBase.textContent = MK.fmt$(disp);
      if (lvMeta) lvMeta.textContent = metaFor(disp);
      if (lvBase) {
        var numCls = "lab-number " + (over ? "is-exception" : under ? "is-low" : dragging ? "" : vd.cls);
        if (lvBase.parentElement.className !== numCls) lvBase.parentElement.className = numCls;
      }

      return busy || dragging;
    });
    if (!inst) return;

    MK.trackPointer(inst, {
      down: function (p) {
        var mx = X(disp, inst.w), axisY = inst.h * 0.40;
        if (Math.abs(p.x - mx) < 30 && Math.abs(p.y - axisY) < 50) {
          dragging = true; vel = 0;
          inst.canvas.style.cursor = "grabbing";
          return true;
        }
        return false;
      },
      move: function (p) {
        if (dragging) {
          disp = MK.clamp(VAL(p.x, inst.w), A.lo.v, A.hi.v);
        } else {
          var mx = X(disp, inst.w);
          hover = Math.abs(p.x - mx) < 30 && Math.abs(p.y - inst.h * 0.40) < 50;
          inst.canvas.style.cursor = hover ? "grab" : "default";
        }
      },
      up: function () {
        if (!dragging) return;
        dragging = false;
        inst.canvas.style.cursor = hover ? "grab" : "default";
        if (disp > M.max * 1.005) {
          host.dataset.exception = "1";
          live.textContent = "Released above range max — exception territory. The model pulls it back to " + MK.fmt$(M.rec) + ".";
        } else {
          delete host.dataset.exception;
          live.textContent = "Released. The evidence settles it at " + MK.fmt$(M.rec) + ".";
        }
      },
      leave: function () { hover = false; }
    });

    /* keyboard access on the canvas */
    inst.canvas.tabIndex = 0;
    inst.canvas.setAttribute("aria-label", "Draggable recommendation. Arrow keys nudge it; it springs back to the model.");
    MK.on(inst.canvas, "keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        disp += (e.key === "ArrowRight" ? 1 : -1) * (A.max.v - A.min.v) * 0.03;
        vel = 0;
        inst.wake();
      }
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
          apply(true);
        });
      });
    }
    seg("labLevel", "level");
    seg("labGeo", "geo");
    seg("labScarce", "scarce");
    var pct = document.getElementById("labPct");
    if (pct) MK.on(pct, "input", function () { S.pct = +pct.value; apply(false); });
    var ask = document.getElementById("labAsk");
    if (ask) MK.on(ask, "input", function () { S.askT = ask.value / 1000; apply(false); });

    apply(false);
  });
})();
