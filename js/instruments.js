/* №0 — An offer, at equilibrium.
   A draggable offer marker pulled by real forces: market, peers, budget, ask.
   Plus Exhibit D — the M&A translation ladder. */
(function () {
  "use strict";

  /* ================= THE EQUILIBRIUM ================= */
  MK.ready(function () {
    var host = document.getElementById("heroCanvasHost");
    if (!host) return;

    /* the world, in dollars (thousands) */
    var DOM = { lo: 150, hi: 230 };
    var RANGE = { min: 162, mid: 186, max: 210 };
    var MARKET = 193, BUDGET = 197, ASK = 206;
    var PEERS = [171, 173.5, 175, 176.5, 178, 179.5, 181, 182.5, 184, 186.5, 189, 191.5];
    var PEER_MED = 180.5;

    /* forces: [target, stiffness, oneSidedAbove] */
    function forces(x) {
      var f = [];
      f.push({ n: "market", t: MARKET, k: 1.0, on: true });
      f.push({ n: "peers", t: PEER_MED, k: 1.1, on: true });
      f.push({ n: "ask", t: ASK, k: 0.45, on: true });
      f.push({ n: "budget", t: BUDGET, k: 2.2, on: x > BUDGET });
      f.push({ n: "rmax", t: RANGE.max, k: 8, on: x > RANGE.max });
      f.push({ n: "rmin", t: RANGE.min, k: 8, on: x < RANGE.min });
      return f;
    }
    function equilibrium() {
      /* fixed-point solve, good enough for four springs */
      var x = RANGE.mid;
      for (var i = 0; i < 60; i++) {
        var num = 0, den = 0;
        forces(x).forEach(function (f) { if (f.on) { num += f.t * f.k; den += f.k; } });
        x = num / den;
      }
      return x;
    }
    var EQ = equilibrium();

    var x = RANGE.mid, v = 0, dragging = false, hover = false;
    var settled = false, excTimer = 0, dragVel = 0, lastDragX = 0;

    /* polite screen-reader narration of what the physics is doing */
    var live = document.createElement("span");
    live.className = "sr-live";
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    host.appendChild(live);

    function X(val, w) { var pad = 40; return pad + (val - DOM.lo) / (DOM.hi - DOM.lo) * (w - pad * 2); }
    function VAL(px, w) { var pad = 40; return DOM.lo + (px - pad) / (w - pad * 2) * (DOM.hi - DOM.lo); }

    var inst = MK.instrument(host, function (ctx, w, h, dt) {
      var busy = false;
      if (!dragging && !MK.reduced) {
        var acc = 0;
        forces(x).forEach(function (f) { if (f.on) acc += (f.t - x) * f.k; });
        acc *= 3.2;               /* stiffness scale for feel */
        v += acc * dt;
        v *= Math.pow(0.06, dt);  /* damping */
        x += v * dt;
        if (Math.abs(v) > 0.02 || Math.abs(acc) > 0.05) busy = true;
        else if (!settled) { settled = true; }
      }
      if (MK.reduced && !dragging) x = EQ;
      if (excTimer > 0) {
        excTimer -= dt; busy = true;
        if (excTimer <= 0) delete host.dataset.exception;
      }

      var axisY = h * 0.52;
      var bandH = 36;
      var mx = X(x, w);

      /* ---- axis + ticks ---- */
      ctx.strokeStyle = MK.lineC; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(18, axisY); ctx.lineTo(w - 18, axisY); ctx.stroke();
      ctx.font = MK.font.mono(10); ctx.fillStyle = MK.ink3; ctx.textAlign = "center";
      var step = w < 560 ? 40 : 20;
      for (var t = DOM.lo; t <= DOM.hi; t += 10) {
        var tx = X(t, w);
        ctx.strokeStyle = MK.lineSoft;
        ctx.beginPath(); ctx.moveTo(tx, axisY - 4); ctx.lineTo(tx, axisY + 4); ctx.stroke();
        if (t % step === 0) ctx.fillText("$" + t + "k", tx, h - 8);
      }

      /* ---- the range band ---- */
      var bx0 = X(RANGE.min, w), bx1 = X(RANGE.max, w);
      ctx.fillStyle = "rgba(29,25,21,.055)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx0, axisY - bandH / 2, bx1 - bx0, bandH, 5);
      else ctx.rect(bx0, axisY - bandH / 2, bx1 - bx0, bandH);
      ctx.fill();
      ctx.strokeStyle = MK.ink; ctx.lineWidth = 1.5;
      [RANGE.min, RANGE.max].forEach(function (rv) {
        var rx = X(rv, w);
        ctx.beginPath(); ctx.moveTo(rx, axisY - bandH / 2 - 5); ctx.lineTo(rx, axisY + bandH / 2 + 5); ctx.stroke();
      });
      var midX = X(RANGE.mid, w);
      ctx.strokeStyle = MK.lineC;
      ctx.beginPath(); ctx.moveTo(midX, axisY - bandH / 2); ctx.lineTo(midX, axisY + bandH / 2); ctx.stroke();
      ctx.font = MK.font.mono(9.5); ctx.fillStyle = MK.ink3;
      ctx.fillText("RANGE MIN", bx0, axisY - bandH / 2 - 12);
      ctx.fillText("MID", midX, axisY - bandH / 2 - 12);
      ctx.fillText("MAX", bx1, axisY - bandH / 2 - 12);

      /* ---- force lines (tension made visible) ---- */
      function forceLine(fx, y, color, k, dashed) {
        var strength = Math.min(Math.abs(fx - mx) / 220 * k, 1);
        if (strength < 0.01) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.25 + strength * 0.65;
        ctx.lineWidth = 1 + strength * 1.6;
        ctx.setLineDash(dashed ? [4, 4] : []);
        ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(fx, y); ctx.stroke();
        /* arrowhead toward the pull */
        var dir = fx > mx ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(fx, y); ctx.lineTo(fx - dir * 5, y - 3); ctx.moveTo(fx, y); ctx.lineTo(fx - dir * 5, y + 3);
        ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      var mktX = X(MARKET, w), peerX = X(PEER_MED, w), budX = X(BUDGET, w), askX = X(ASK, w);
      forceLine(mktX, axisY - 7, MK.market, 1.0);
      forceLine(peerX, axisY + 7, MK.ink2, 1.1);
      forceLine(askX, axisY + 14, MK.ink3, 0.45);
      if (x > BUDGET) forceLine(budX, axisY - 14, MK.accent, 2.2, true);

      /* ---- anchors ---- */
      /* market */
      ctx.strokeStyle = MK.market; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mktX, axisY - bandH / 2 - 26); ctx.lineTo(mktX, axisY + bandH / 2); ctx.stroke();
      ctx.fillStyle = MK.market; ctx.font = MK.font.mono(10, 700); ctx.textAlign = "center";
      ctx.fillText("MARKET P50", mktX, axisY - bandH / 2 - 33);
      /* budget */
      ctx.strokeStyle = MK.accent; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(budX, axisY - bandH / 2 - 8); ctx.lineTo(budX, axisY + bandH / 2 + 8); ctx.stroke();
      ctx.setLineDash([]);
      if (w >= 560) { ctx.fillStyle = MK.accent; ctx.fillText("BUDGET", budX, axisY + bandH / 2 + 20); }
      /* ask */
      ctx.fillStyle = MK.ink3;
      ctx.beginPath(); ctx.moveTo(askX, axisY + bandH / 2 + 3); ctx.lineTo(askX - 5, axisY + bandH / 2 + 11); ctx.lineTo(askX + 5, axisY + bandH / 2 + 11); ctx.closePath(); ctx.fill();
      ctx.fillText("ASK $" + ASK + "k", askX, axisY + bandH / 2 + 24);
      /* peers — beeswarm below */
      ctx.fillStyle = "rgba(29,25,21,.34)";
      PEERS.forEach(function (p, i) {
        var px = X(p, w), py = axisY + bandH / 2 + 34 + (i % 2) * 9;
        ctx.beginPath(); ctx.arc(px, py, 3.1, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = MK.ink2; ctx.textAlign = "left";
      ctx.fillText("PEERS, TODAY", X(PEERS[0], w) - 2, axisY + bandH / 2 + 62);

      /* ---- the offer marker ---- */
      var pulse = hover || dragging ? 1 : 0;
      ctx.strokeStyle = MK.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, axisY - bandH / 2 - 6); ctx.lineTo(mx, axisY + bandH / 2 + 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, axisY, 10 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = MK.accent; ctx.fill();
      ctx.beginPath(); ctx.arc(mx, axisY, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = "#FAF6EF"; ctx.fill();

      /* readout above marker */
      var val = x * 1000;
      var pen = (x - RANGE.min) / (RANGE.max - RANGE.min);
      ctx.textAlign = "center";
      ctx.font = MK.font.mono(15, 700); ctx.fillStyle = MK.ink;
      var rx2 = MK.clamp(mx, 74, w - 74);
      ctx.fillText(MK.fmt$(val), rx2, 30);
      ctx.font = MK.font.mono(9.5);
      ctx.fillStyle = pen > 1 || pen < 0 ? MK.accent : MK.ink3;
      var status = pen > 1 ? "ABOVE RANGE MAX — EXCEPTION" :
                   pen < 0 ? "BELOW RANGE MIN" :
                   "THE OFFER · " + Math.round(pen * 100) + "% THROUGH RANGE";
      ctx.fillText(status, rx2, 46);

      /* easter-egg annotation after an out-of-range throw */
      if (excTimer > 0) {
        ctx.globalAlpha = Math.min(excTimer / 0.5, 1);
        ctx.font = "italic 500 13px 'Fraunces', Georgia, serif";
        ctx.fillStyle = MK.accent; ctx.textAlign = "right";
        ctx.fillText("That would need an exception — I built a tool for those. Case 03 ↓", w - 24, h - 26);
        ctx.globalAlpha = 1;
      }

      return busy || dragging;
    });
    if (!inst) return;

    MK.trackPointer(inst, {
      down: function (p) {
        var mx = X(x, inst.w);
        var axisY = inst.h * 0.52;
        if (Math.abs(p.x - mx) < 26 && Math.abs(p.y - axisY) < 46) {
          dragging = true; v = 0; dragVel = 0; lastDragX = p.x;
          inst.canvas.style.cursor = "grabbing";
          return true;
        }
        return false;
      },
      move: function (p) {
        if (dragging) {
          dragVel = (p.x - lastDragX);
          lastDragX = p.x;
          x = MK.clamp(VAL(p.x, inst.w), DOM.lo - 4, DOM.hi + 4);
        } else {
          var mx = X(x, inst.w);
          hover = Math.abs(p.x - mx) < 26 && Math.abs(p.y - inst.h * 0.52) < 46;
          inst.canvas.style.cursor = hover ? "grab" : "default";
        }
      },
      up: function () {
        if (!dragging) return;
        dragging = false;
        v = MK.clamp(dragVel, -40, 40) * (inst.w > 0 ? (DOM.hi - DOM.lo) / inst.w : 0.15) * 3;
        if (x > RANGE.max + 3) {
          excTimer = 4;
          host.dataset.exception = "1";
          if (live) live.textContent = "Released outside the range — that would need an exception. See Case 03.";
        } else if (live) {
          live.textContent = "Released. The offer settles where the forces balance, near " + MK.fmt$(EQ * 1000) + ".";
        }
        inst.canvas.style.cursor = hover ? "grab" : "default";
      },
      leave: function () { hover = false; }
    });

    /* keyboard access: arrows nudge the offer */
    inst.canvas.tabIndex = 0;
    inst.canvas.setAttribute("aria-label", "Draggable offer marker. Use left and right arrow keys to move it; it springs back toward equilibrium.");
    MK.on(inst.canvas, "keydown", function (e) {
      if (e.key === "ArrowLeft") { x -= 3; v = 0; e.preventDefault(); inst.wake(); }
      if (e.key === "ArrowRight") { x += 3; v = 0; e.preventDefault(); inst.wake(); }
    });
  });

  /* ================= EXHIBIT D — THE TRANSLATION LAYER ================= */
  MK.ready(function () {
    var host = document.getElementById("mnaHost");
    if (!host) return;
    host.classList.add("live");

    var LEFT = [
      { id: "A1", name: "Associate" },
      { id: "A2", name: "Mid-level" },
      { id: "A3", name: "Senior" },
      { id: "A4", name: "Staff" },
      { id: "A5", name: "Principal" },
      { id: "M1", name: "Manager" }
    ];
    var RIGHT = ["G5", "G6", "G7", "G8", "G9", "G10"];
    var MAPS = [
      { from: 0, to: [0], note: "A1 → G5. Clean — one-to-one. Most of the org maps like this." },
      { from: 1, to: [1], note: "A2 → G6. Clean, though the title changes — translation includes vocabulary." },
      { from: 2, to: [2], note: "A3 → G7. “Senior” means something different in each company. Same work, new label." },
      { from: 3, to: [3, 4], note: "A4 → G8 or G9. Splits on scope, not tenure. This is where the judgment lives." },
      { from: 4, to: [5], note: "A5 → G10. Maps high — level them down and you build a retention problem on day one." },
      { from: 5, to: [3, 4], note: "M1 → G8 or G9. Manager scope ≠ grade. Calibrate to span and business size." }
    ];

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 800 360");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.cssText = "width:100%;height:100%;display:block";
    host.appendChild(svg);

    var note = document.createElement("p");
    note.style.cssText = "position:absolute;left:20px;right:20px;bottom:10px;margin:0;font:italic 500 13px 'Fraunces',Georgia,serif;color:#5C554A;pointer-events:none;transition:opacity .25s";
    note.setAttribute("aria-live", "polite");
    note.textContent = "";
    host.style.position = "relative";
    host.appendChild(note);

    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }

    var LX = 150, RX = 650, TOP = 34, ROW = 46, BW = 128, BH = 32;
    function rowY(i, n) { return TOP + i * ROW + 8; }

    el("text", { x: LX, y: 18, "text-anchor": "middle", fill: "#8B8274",
      style: "font:500 10.5px 'JetBrains Mono',monospace;letter-spacing:.14em" }).textContent = "ACQUIRED CO.";
    el("text", { x: RX, y: 18, "text-anchor": "middle", fill: "#8B8274",
      style: "font:500 10.5px 'JetBrains Mono',monospace;letter-spacing:.14em" }).textContent = "HOST ARCHITECTURE";

    var pathEls = [], leftEls = [], rightEls = [];

    /* paths first (under boxes) */
    MAPS.forEach(function (m, mi) {
      m.to.forEach(function (ti) {
        var y1 = rowY(m.from) + BH / 2, y2 = rowY(ti) + BH / 2;
        var p = el("path", {
          d: "M " + (LX + BW / 2) + " " + y1 + " C " + (LX + BW / 2 + 120) + " " + y1 + ", " + (RX - BW / 2 - 120) + " " + y2 + ", " + (RX - BW / 2) + " " + y2,
          fill: "none", stroke: "rgba(29,25,21,.18)", "stroke-width": m.to.length > 1 ? 1.4 : 2,
          "stroke-dasharray": m.to.length > 1 ? "5 5" : "none"
        });
        p.dataset.map = mi;
        pathEls.push(p);
      });
    });

    LEFT.forEach(function (l, i) {
      var g = el("g", { style: "cursor:pointer" });
      g.dataset.map = i;
      var y = rowY(i);
      el("rect", { x: LX - BW / 2, y: y, width: BW, height: BH, rx: 6,
        fill: "#FAF6EF", stroke: "rgba(29,25,21,.3)", "stroke-width": 1 }, g);
      el("text", { x: LX - BW / 2 + 12, y: y + 21, fill: "#1D1915",
        style: "font:600 12px 'Inter',sans-serif" }, g).textContent = l.name;
      el("text", { x: LX + BW / 2 - 12, y: y + 21, "text-anchor": "end", fill: "#8B8274",
        style: "font:500 10px 'JetBrains Mono',monospace" }, g).textContent = l.id;
      leftEls.push(g);
    });
    RIGHT.forEach(function (r, i) {
      var g = el("g", {});
      var y = rowY(i);
      el("rect", { x: RX - BW / 2, y: y, width: BW, height: BH, rx: 6,
        fill: "#F4EEE3", stroke: "rgba(29,25,21,.22)", "stroke-width": 1 }, g);
      el("text", { x: RX, y: y + 21, "text-anchor": "middle", fill: "#5C554A",
        style: "font:500 11.5px 'JetBrains Mono',monospace" }, g).textContent = r;
      rightEls.push(g);
    });

    var active = -1;
    function setActive(mi) {
      active = mi;
      pathEls.forEach(function (p) {
        var on = +p.dataset.map === mi;
        p.setAttribute("stroke", on ? "#C8401A" : mi === -1 ? "rgba(29,25,21,.18)" : "rgba(29,25,21,.07)");
        p.setAttribute("stroke-width", on ? 2.4 : (MAPS[+p.dataset.map].to.length > 1 ? 1.4 : 2));
      });
      leftEls.forEach(function (g, i) {
        g.querySelector("rect").setAttribute("stroke", i === mi ? "#C8401A" : "rgba(29,25,21,.3)");
        g.querySelector("rect").setAttribute("stroke-width", i === mi ? 1.8 : 1);
      });
      rightEls.forEach(function (g, i) {
        var hot = mi >= 0 && MAPS[mi].to.indexOf(i) !== -1;
        g.querySelector("rect").setAttribute("fill", hot ? "#FAF6EF" : "#F4EEE3");
        g.querySelector("rect").setAttribute("stroke", hot ? "#C8401A" : "rgba(29,25,21,.22)");
      });
      note.textContent = mi >= 0 ? MAPS[mi].note : "";
    }
    leftEls.forEach(function (g, i) {
      MK.on(g, "pointerenter", function () { setActive(i); });
      MK.on(g, "click", function () { setActive(active === i ? -1 : i); });
    });
    MK.on(svg, "pointerleave", function () { setActive(-1); });
  });
})();
