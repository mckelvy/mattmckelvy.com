/* The pit: five years of work as physical stickers.
   Matter.js world in the hero box — grab, throw, shake.
   Falls back to a static sticker sheet under reduced motion / no canvas. */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var TONES = {
    peach: "#FFD9B3", butter: "#FFEEA8", pink: "#FFD2E4",
    sky: "#C9E5FF", mint: "#C9F2D0", lilac: "#E3D9FF"
  };
  var CHIPS = [
    { label: "GTM COMP",         tone: "peach"  },
    { label: "~25,000 PEOPLE",   tone: "sky"    },
    { label: "JOB ARCHITECTURE", tone: "pink"   },
    { label: "MARKET DATA",      tone: "mint"   },
    { label: "OFFERS",           tone: "butter" },
    { label: "RANGES",           tone: "lilac"  },
    { label: "TABLEAU",          tone: "peach"  },
    { label: "WORKDAY",          tone: "sky"    },
    { label: "EXCEL",            tone: "mint"   },
    { label: "AI TOOLS",         tone: "accent" },
    { label: "M&A",              tone: "pink"   },
    { label: "BENCHMARKS",       tone: "butter" },
    { label: "$",  tone: "butter", kind: "circle" },
    { label: "%",  tone: "lilac",  kind: "circle" },
    { label: "5y", tone: "peach",  kind: "star"   }
  ];

  function ink() {
    return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#241F33";
  }

  /* ---------- static fallback ---------- */
  function staticSheet(host) {
    host.style.display = "flex";
    host.style.flexWrap = "wrap";
    host.style.alignContent = "center";
    host.style.justifyContent = "center";
    host.style.gap = "10px";
    host.style.padding = "18px";
    CHIPS.forEach(function (c) {
      var s = document.createElement("span");
      s.textContent = c.label;
      s.style.cssText =
        "font:700 12px 'JetBrains Mono',monospace;letter-spacing:.04em;color:" + ink() +
        ";background:" + (TONES[c.tone] || TONES.butter) +
        ";border:2px solid " + ink() + ";border-radius:" + (c.kind ? "50%" : "99px") +
        ";padding:" + (c.kind ? "14px 12px" : "9px 13px") + ";box-shadow:3px 3px 0 " + ink() + ";";
      host.appendChild(s);
    });
  }

  function init() {
    var host = document.getElementById("pit");
    if (!host) return;
    if (reduced || typeof Matter === "undefined" || !window.CanvasRenderingContext2D) {
      staticSheet(host);
      return;
    }
    var W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) { setTimeout(init, 150); return; }

    var dpr = Math.min(devicePixelRatio || 1, 2);
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) { staticSheet(host); return; }
    host.appendChild(canvas);

    var Engine = Matter.Engine, Bodies = Matter.Bodies, Body = Matter.Body,
        Composite = Matter.Composite, Mouse = Matter.Mouse,
        MouseConstraint = Matter.MouseConstraint, Query = Matter.Query;

    var engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1;
    var world = engine.world;

    var small = W < 430;
    var FONT = (small ? 11 : 13) + "px 'JetBrains Mono', monospace";
    var PILL_H = small ? 30 : 36;

    /* measure + build chip bodies (spawned above the box, staggered) */
    ctx.font = "700 " + FONT;
    var chips = [];
    CHIPS.forEach(function (c, i) {
      var body, w, h;
      if (c.kind === "circle") {
        var r = small ? 19 : 24;
        body = Bodies.circle(0, 0, r, { restitution: 0.6, friction: 0.3, frictionAir: 0.012 });
        w = h = r * 2;
      } else if (c.kind === "star") {
        var R = small ? 24 : 30;
        body = Bodies.circle(0, 0, R * 0.82, { restitution: 0.6, friction: 0.3, frictionAir: 0.012 });
        w = h = R * 2;
      } else {
        w = Math.ceil(ctx.measureText(c.label).width) + (small ? 22 : 30);
        h = PILL_H;
        body = Bodies.rectangle(0, 0, w, h, {
          chamfer: { radius: h / 2 - 2 },
          restitution: 0.55, friction: 0.3, frictionAir: 0.012
        });
      }
      Body.setPosition(body, {
        x: 30 + Math.random() * Math.max(1, W - 60),
        y: -60 - i * 46
      });
      Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      body.userData = { chip: c, w: w, h: h, pulse: 0 };
      chips.push(body);
    });

    /* container walls (thick, outside the visible edges; tall ceiling for throws) */
    var T = 240;
    function makeWalls(w, h) {
      var opts = { isStatic: true };
      return [
        Bodies.rectangle(w / 2, h + T / 2 - 2, w + T * 2, T, opts),      /* floor  */
        Bodies.rectangle(-T / 2 + 2, h / 2 - 400, T, h + 1200, opts),    /* left   */
        Bodies.rectangle(w + T / 2 - 2, h / 2 - 400, T, h + 1200, opts), /* right  */
        Bodies.rectangle(w / 2, -900 - T / 2, w + T * 2, T, opts)        /* ceiling*/
      ];
    }
    var walls = makeWalls(W, H);
    Composite.add(world, walls);

    /* staggered drop-in */
    var added = 0;
    var dropTimer = setInterval(function () {
      if (added >= chips.length) { clearInterval(dropTimer); return; }
      Composite.add(world, chips[added++]);
    }, 110);

    /* grab + throw */
    var mouse = Mouse.create(canvas);
    mouse.pixelRatio = dpr;
    var mc = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.14, damping: 0.08 }
    });
    Composite.add(world, mc);
    /* don't let the canvas eat wheel events */
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);
    mouse.element.removeEventListener("wheel", mouse.mousewheel);

    /* hover pulse */
    canvas.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      var p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      var hits = Query.point(chips, p);
      if (hits.length) hits[0].userData.pulse = 1;
    }, { passive: true });

    /* double-tap / double-click = shake */
    function shake() {
      chips.forEach(function (b) {
        Matter.Sleeping.set(b, false);
        Body.setVelocity(b, {
          x: (Math.random() - 0.5) * 22,
          y: -6 - Math.random() * 14
        });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5);
      });
    }
    canvas.addEventListener("dblclick", shake);
    var lastTap = 0;
    canvas.addEventListener("pointerdown", function () {
      var now = performance.now();
      if (now - lastTap < 320) shake();
      lastTap = now;
    });

    /* hue hook: the accent chip follows the site's drifting hue */
    var hue = 26;
    window.PIT = { setHue: function (h) { hue = h; }, shake: shake, _chips: chips };

    /* sizing */
    function size() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Composite.remove(world, walls);
      walls = makeWalls(W, H);
      Composite.add(world, walls);
      chips.forEach(function (b) {
        if (b.position.x > W - 10) Body.setPosition(b, { x: W - 30, y: Math.min(b.position.y, H - 30) });
      });
    }
    size();
    var ro = new ResizeObserver(size);
    ro.observe(host);

    function star(cx, cy, R, r, ctx2) {
      ctx2.beginPath();
      for (var i = 0; i < 10; i++) {
        var rad = i % 2 === 0 ? R : r;
        var a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx2[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx2.closePath();
    }
    function pillPath(w, h, ctx2) {
      var r = Math.min(h / 2 - 1, 18);
      ctx2.beginPath();
      if (ctx2.roundRect) { ctx2.roundRect(-w / 2, -h / 2, w, h, r); return; }
      var x = -w / 2, y = -h / 2;
      ctx2.moveTo(x + r, y);
      ctx2.arcTo(x + w, y, x + w, y + h, r);
      ctx2.arcTo(x + w, y + h, x, y + h, r);
      ctx2.arcTo(x, y + h, x, y, r);
      ctx2.arcTo(x, y, x + w, y, r);
      ctx2.closePath();
    }

    function drawChip(b) {
      var d = b.userData, c = d.chip;
      var fill = c.tone === "accent"
        ? "hsl(" + hue.toFixed(0) + " 85% 66%)"
        : (TONES[c.tone] || TONES.butter);
      var scale = 1 + d.pulse * 0.12;
      if (d.pulse > 0) { d.pulse -= 0.05; if (Body.getSpeed(b) < 0.05) Matter.Sleeping.set(b, false); }

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.scale(scale, scale);

      var INK = ink();
      /* hard offset shadow, then face */
      function face(offx, offy, fillStyle) {
        ctx.save();
        ctx.translate(offx, offy);
        if (c.kind === "circle") { ctx.beginPath(); ctx.arc(0, 0, d.w / 2, 0, Math.PI * 2); }
        else if (c.kind === "star") star(0, 0, d.w / 2, d.w / 4.6, ctx);
        else pillPath(d.w, d.h, ctx);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (!offx) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
        ctx.restore();
      }
      face(3, 3, INK);
      face(0, 0, fill);

      ctx.fillStyle = INK;
      ctx.font = "700 " + (c.kind === "circle" ? "15px 'JetBrains Mono', monospace" : FONT);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label, 0, c.kind === "star" ? 1 : 1.5);
      ctx.restore();
    }

    var homePanel = document.getElementById("p-home");
    var running = true;
    document.addEventListener("visibilitychange", function () { running = !document.hidden; });

    function frame(dt) {
      /* sub-step so slow frames stay real-time without matter's >16.7ms warning */
      var rem = dt;
      while (rem > 0.5) { var step = Math.min(rem, 1000 / 60); Engine.update(engine, step); rem -= step; }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < added; i++) drawChip(chips[i]);
      /* safety net: anything that escapes comes back from the top */
      for (var j = 0; j < added; j++) {
        var p = chips[j].position;
        if (p.y > H + 400 || p.x < -400 || p.x > W + 400) {
          Body.setPosition(chips[j], { x: W / 2, y: -80 });
          Body.setVelocity(chips[j], { x: 0, y: 0 });
        }
      }
    }
    window.PIT._step = function (n) {
      while (added < chips.length) Composite.add(world, chips[added++]);
      for (var k = 0; k < (n || 1); k++) frame(16.7);
    };

    var last = performance.now() - 16;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.max(4, Math.min(now - last, 33)); last = now;
      if (!running || !homePanel.classList.contains("active")) return;
      frame(dt);
    })(last);
  }

  function start() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(init);
    } else init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
