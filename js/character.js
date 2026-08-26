/* ============================================================
   Character experience — mattmckelvy.com
   A cinematic layer over the finished site. Fully isolated:
   delete this file, css/character.css, media/char/ and the two
   includes in index.html, and the site is exactly as it was.

   Master switch and per-scene flags:                         */
var CHAR_CONFIG = {
  enabled: true,
  intro: true,
  /* exit disabled: the footage's walk segment is too short to enter the
     scene honestly at natural gait — no glide, no scene */
  scenes: { skate: true, surf: true, tennis: true, exit: false }
};
/* ============================================================ */
(function () {
  "use strict";
  if (!CHAR_CONFIG.enabled) return;

  var D = window.MK_CHAR_DATA;
  if (!D) return;

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var saveData = navigator.connection && navigator.connection.saveData;
  var mobile = Math.min(innerWidth, innerHeight) < 640 || innerWidth < 700;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeIO = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* sample a [[t, v...]] table at time t (linear interp) */
  function table(tbl, t, col) {
    col = col || 1;
    if (t <= tbl[0][0]) return tbl[0][col];
    var last = tbl[tbl.length - 1];
    if (t >= last[0]) return last[col];
    for (var i = 1; i < tbl.length; i++) {
      if (tbl[i][0] >= t) {
        var a = tbl[i - 1], b = tbl[i];
        var f = (t - a[0]) / (b[0] - a[0] || 1);
        return lerp(a[col], b[col], f);
      }
    }
    return last[col];
  }

  /* ---------- capability probe ---------- */
  var glOK = (function () {
    try {
      var c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) { return false; }
  })();

  var full = glOK && !reduced && !saveData;

  /* ---------- packed-alpha WebGL player ---------- */
  function Player(name, opts) {
    opts = opts || {};
    var self = this;
    this.name = name;
    this.dead = false;
    var v = this.video = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    var srcUrl = "media/char/" + name + (mobile ? "-m" : "") + ".mp4";

    var W = mobile ? 480 : 768, H = mobile ? 730 : 1168;
    var c = this.canvas = document.createElement("canvas");
    c.width = W; c.height = H;
    c.setAttribute("aria-hidden", "true");

    var gl = this.gl = c.getContext("webgl2", { premultipliedAlpha: true, alpha: true }) ||
                       c.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) { this.broken = true; return; }

    function sh(type, srcCode) {
      var s = gl.createShader(type);
      gl.shaderSource(s, srcCode); gl.compileShader(s);
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER,
      "attribute vec2 p;varying vec2 t;void main(){t=vec2(p.x*.5+.5,1.0-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}");
    var fs = sh(gl.FRAGMENT_SHADER,
      "precision mediump float;varying vec2 t;uniform sampler2D u;uniform float clipL;" +
      "void main(){vec3 c=texture2D(u,vec2(t.x,t.y*.5)).rgb;" +
      "float a=texture2D(u,vec2(t.x,.5+t.y*.5)).r;" +
      "a=clamp((a-.02)/.94,0.,1.);" +
      "if(t.x<clipL)a=0.;" +
      "gl_FragColor=vec4(c*a,a);}");
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this._clipLoc = gl.getUniformLocation(pr, "clipL");
    gl.uniform1f(this._clipLoc, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, W, H);
    this._hasFrame = false;

    this.setClip = function (f) { if (!self.dead && self.gl) gl.uniform1f(self._clipLoc, f); };

    this.drawFrame = function () {
      if (self.dead || v.readyState < 2) return;
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        self._hasFrame = true;
      } catch (e) {}
    };

    this.onFrame = null;
    function pump() {
      if (self.dead) return;
      self.drawFrame();
      if (self.onFrame) self.onFrame(v.currentTime);
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(pump);
    }
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(pump);
    else {
      (function raf() {
        if (self.dead) return;
        if (!v.paused) { self.drawFrame(); if (self.onFrame) self.onFrame(v.currentTime); }
        requestAnimationFrame(raf);
      })();
    }

    /* A human action must never stall mid-motion. Chrome will not fill the
       buffer of a paused <video>, so the only guarantee is to own the whole
       file: fetch it as a blob and play from local memory. */
    var blobUrl = null;
    this.ready = new Promise(function (res) {
      function useDirect() {
        if (self.dead) return;
        v.src = srcUrl;
        v.addEventListener("canplaythrough", function h() { v.removeEventListener("canplaythrough", h); res(); });
        v.load();
      }
      if (window.fetch && window.URL && URL.createObjectURL) {
        fetch(srcUrl).then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.blob();
        }).then(function (b) {
          if (self.dead) return;
          blobUrl = URL.createObjectURL(b);
          v.src = blobUrl;
          v.addEventListener("canplay", function h() { v.removeEventListener("canplay", h); res(); });
          v.load();
        }).catch(useDirect);
      } else useDirect();
    });
    this.readyThrough = function () { return self.ready; };

    /* stall guard: if playback rebuffers mid-scene, resolve the character
       gracefully instead of freezing him mid-action */
    this.onStall = null;
    var stallTimer = null;
    v.addEventListener("waiting", function () {
      if (stallTimer || self.dead) return;
      stallTimer = setTimeout(function () {
        stallTimer = null;
        if (!self.dead && self.onStall && !v.paused && v.readyState < 3) self.onStall();
      }, 800);
    });
    v.addEventListener("playing", function () {
      if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
    });

    this.destroy = function () {
      self.dead = true;
      try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}
      if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) {} blobUrl = null; }
      if (c.parentNode) c.parentNode.removeChild(c);
    };
  }

  /* scale/translate a player canvas: native px → screen */
  function place(pl, x, y, s) {
    pl.canvas.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + (s * (mobile ? 768 / 480 : 1)).toFixed(4) + ")";
  }
  /* native-space helpers work in 768-wide coords; mobile assets are 480 —
     the extra scale factor above maps them to the same coordinate space */

  function watch(el, cb, opts) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, opts || { threshold: 0.4 });
    io.observe(el);
  }

  /* one Matthew: surf and tennis share the About neighborhood — tennis
     holds until the surf pass has resolved (or clearly never started) */
  var SEQ = { surfStarted: false, surfDone: false };
  function whenSurfSettled(cb) {
    var waited = 0;
    (function poll() {
      if (SEQ.surfDone || (!SEQ.surfStarted && waited >= 1200) || waited > 14000) { cb(); return; }
      waited += 200;
      setTimeout(poll, 200);
    })();
  }

  /* ============================================================
     INTRO — the red door
     ============================================================ */
  var introEligible = CHAR_CONFIG.intro &&
    !sessionStorage.getItem("mkEntered") &&
    !location.hash && !/nointro/.test(location.search);

  function markEntered() { try { sessionStorage.setItem("mkEntered", "1"); } catch (e) {} }

  function buildIntro(done) {
    var ov = document.createElement("div");
    ov.className = "char-intro" + (full ? "" : " simple");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Welcome");

    var vh = innerHeight, vw = innerWidth;
    var stillW = 422, stillH = 1036;
    var doorH = clamp(vh * 0.56, 360, 660);
    var floorY = vh * (mobile ? 0.72 : 0.76);
    var doorCX = vw * (mobile ? 0.34 : 0.30);
    /* the character's natural travel is finite — if his standing spot would
       fall off the right edge, shrink the whole scene proportionally */
    var sStill, sVideo, doorLeft, doorTop, standRight;
    for (var pass = 0; pass < 2; pass++) {
      sStill = doorH / stillH;
      sVideo = sStill / D.door.stillScale;
      doorLeft = doorCX - (stillW * sStill) / 2;
      doorTop = floorY - doorH;
      /* rough stand-spot estimate: door arrival + total gait travel */
      standRight = doorLeft + 422 * sStill + (D.door.walkV * 3.1 + 200) * sVideo;
      if (standRight > vw - 24) doorH *= (vw - 24 - doorLeft - 422 * sStill) / (standRight - doorLeft - 422 * sStill);
      else break;
    }

    /* environment: faint dot field, one static paint */
    var env = document.createElement("div");
    env.className = "char-env";
    var ec = document.createElement("canvas");
    ec.width = vw; ec.height = vh;
    env.appendChild(ec);
    var ectx = ec.getContext("2d");
    if (ectx) {
      var rnd = (function (a) { return function () { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; })(77);
      for (var i = 0; i < 150; i++) {
        var dx = rnd() * vw;
        var env2 = Math.exp(-Math.pow((dx - vw * 0.62) / (vw * 0.3), 2));
        var dy = vh * 0.9 - Math.pow(rnd(), 1.6) * env2 * vh * 0.34;
        ectx.fillStyle = "rgba(29,29,31," + (0.04 + rnd() * 0.05).toFixed(3) + ")";
        ectx.beginPath(); ectx.arc(dx, dy, 1.2, 0, 6.284); ectx.fill();
      }
    }
    ov.appendChild(env);

    /* stage (video layer lives here, below the door still) */
    var stage = document.createElement("div");
    stage.className = "char-stage";
    ov.appendChild(stage);

    /* the door (button) */
    var doorBtn = document.createElement("button");
    doorBtn.className = "char-door-btn";
    doorBtn.setAttribute("aria-label", "Come in — enter the site");
    doorBtn.style.left = doorLeft + "px";
    doorBtn.style.top = doorTop + "px";
    doorBtn.style.width = (stillW * sStill) + "px";
    doorBtn.style.height = doorH + "px";
    var dimg = document.createElement("img");
    dimg.src = "media/char/door-still.png";
    dimg.alt = "";
    dimg.id = "charStillDoor";
    doorBtn.appendChild(dimg);
    var shadow = document.createElement("span");
    shadow.className = "char-door-shadow";
    doorBtn.appendChild(shadow);
    ov.appendChild(doorBtn);

    /* copy */
    /* headline top-left, clear of the walking path */
    var come = document.createElement("h1");
    come.className = "char-come";
    come.textContent = "Come in.";
    if (mobile) {
      come.style.left = "50%"; come.style.transform = "translateX(-50%)";
      come.style.top = Math.max(vh * 0.08, 44) + "px";
      come.style.whiteSpace = "nowrap";
    } else {
      come.style.left = Math.max(22, vw * 0.05) + "px";
      come.style.top = (vh * 0.085) + "px";
    }
    ov.appendChild(come);

    var hint = document.createElement("p");
    hint.className = "char-hint";
    hint.textContent = "Click the door.";
    if (mobile) {
      hint.style.left = "50%"; hint.style.transform = "translateX(-50%)";
      hint.style.top = "calc(" + come.style.top + " + " + (vh * 0.09) + "px)";
      hint.style.whiteSpace = "nowrap";
    } else {
      hint.style.left = come.style.left;
      hint.style.top = (vh * 0.085 + Math.max(64, vh * 0.1)) + "px";
    }
    ov.appendChild(hint);
    setTimeout(function () { hint.classList.add("on"); }, 2600);

    var skip = document.createElement("button");
    skip.className = "char-skip";
    skip.textContent = "Skip";
    ov.appendChild(skip);

    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    scrollTo(0, 0);

    var finished = false;
    function cleanup(fast) {
      if (finished) return;
      finished = true;
      markEntered();
      if (player) player.destroy();
      ov.classList.add("is-exiting");
      ov.style.opacity = "0";
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        document.body.style.overflow = "";
        var main = document.getElementById("main");
        if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); main.removeAttribute("tabindex"); }
        done();
      }, fast ? 320 : 460);
    }
    skip.addEventListener("click", function () { cleanup(true); });
    window.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape" && !finished) { cleanup(true); window.removeEventListener("keydown", esc); }
    });

    /* ---- simple variant (reduced motion / no GL) ---- */
    if (!full) {
      dimg.src = "media/char/door-reduced.png";
      doorBtn.addEventListener("click", function () { cleanup(false); });
      return;
    }

    /* ---- full cinematic variant ---- */
    var player = new Player("door");
    var pc = player.canvas;
    pc.style.opacity = "0";
    stage.appendChild(pc);

    /* screen anchor: the tracked corner feature, via the still's geometry */
    var so = D.door.stillOrigin, cr = D.door.cornerRef;
    var cornerScreenX = doorLeft + (cr[0] - so[0]) * sStill;
    var cornerScreenY = doorTop + (cr[1] - so[1]) * sStill;
    var corner7x = table(D.door.corner, 7.0, 1), corner7y = table(D.door.corner, 7.0, 2);
    var L7x = cornerScreenX - corner7x * sVideo;
    var L7y = cornerScreenY - corner7y * sVideo;
    var feetLine = L7y + table(D.door.foot, 7.0) * sVideo;
    var T0 = 1.1, TSWAP = D.door.swapT, TEND = 13.15;
    var swapped = false, started = false;

    /* ---- gait-locked translation ----
       Ground-locking the planted feet is equivalent to moving the head
       across the screen at the walk velocity during steady gait, and not
       at all while standing. The head track is the noise-free anchor. */
    var P = D.door.walkPhase, V = D.door.walkV;
    function gEnv(t) {
      if (t <= P[0] || t >= P[3]) return 0;
      if (t < P[1]) { var u = (t - P[0]) / (P[1] - P[0]); return u * u * (3 - 2 * u); }
      if (t <= P[2]) return 1;
      var d = (P[3] - t) / (P[3] - P[2]); return d * d * (3 - 2 * d);
    }
    var Ggrid = [], Gacc = 0;
    for (var gi = 0; gi <= 7.4 * 48; gi++) {
      Ggrid.push(Gacc);
      Gacc += gEnv(gi / 48) / 48;
    }
    function G(t) {
      var idx = clamp(t * 48, 0, Ggrid.length - 1);
      var i0 = Math.floor(idx);
      return lerp(Ggrid[i0], Ggrid[Math.min(i0 + 1, Ggrid.length - 1)], idx - i0);
    }
    var G7 = G(7.0);
    var SH7 = L7x + table(D.door.headX, 7.0) * sVideo;
    function gaitX(t) {
      /* he walks leftward: earlier in the walk he is further RIGHT by the
         gait distance still to be covered */
      var sh = SH7 + V * sVideo * (G7 - G(t));
      return sh - table(D.door.headX, t) * sVideo;
    }
    function cornerX(t) { return cornerScreenX - table(D.door.corner, t, 1) * sVideo; }
    function cornerY(t) { return cornerScreenY - table(D.door.corner, t, 2) * sVideo; }
    var startX = gaitX(T0);
    var startY = feetLine - table(D.door.foot, 2.4) * sVideo;

    /* pre-click: he is already there, standing — a still that comes alive */
    var standImg = document.createElement("img");
    standImg.src = "media/char/stand-still.png";
    standImg.alt = "";
    standImg.style.cssText = "position:absolute;transform-origin:0 0;transition:opacity .2s";
    standImg.style.left = (startX + 226 * sVideo) + "px";
    standImg.style.top = (startY + 10 * sVideo) + "px";
    standImg.style.width = (400 * sVideo) + "px";
    stage.appendChild(standImg);

    /* debug overlay (?chardebug) */
    var DBG = /chardebug/.test(location.search);
    var dbgEl = null, dbgDot = null;
    if (DBG) {
      var fl = document.createElement("div");
      fl.style.cssText = "position:absolute;left:0;right:0;top:" + floorY + "px;height:1px;background:rgba(255,0,0,.5);z-index:5";
      ov.appendChild(fl);
      dbgDot = document.createElement("div");
      dbgDot.style.cssText = "position:absolute;width:6px;height:6px;border-radius:3px;background:rgba(255,0,0,.8);z-index:5;top:" + (vh * 0.1) + "px";
      ov.appendChild(dbgDot);
      dbgEl = document.createElement("pre");
      dbgEl.style.cssText = "position:absolute;left:12px;bottom:8px;font:11px monospace;color:#c00;z-index:5;margin:0";
      ov.appendChild(dbgEl);
    }

    player.onFrame = function (t) {
      if (!started || finished) return;
      window.__charT = t;
      var x, y;
      var gx = gaitX(t);
      var yGait = feetLine - table(D.door.foot, Math.max(t, 2.4)) * sVideo;
      if (t < 6.85) {
        x = gx; y = yGait;
      } else if (t < 7.05) {
        var m = (t - 6.85) / 0.2;
        x = lerp(gx, cornerX(t), m);
        y = lerp(yGait, cornerY(t), m);
      } else {
        x = cornerX(t); y = cornerY(t);
      }
      /* the sliding video door is erased in the asset itself during the
         approach; at the swap the real door takes over from the still */
      if (t >= TSWAP && !swapped) {
        swapped = true;
        dimg.style.opacity = "0";
        shadow.style.opacity = "0";
        shadow.style.transition = "opacity .4s";
      }
      /* door mechanics may run a touch quicker; the gait itself never does */
      if (t >= TSWAP && t > 9.5 && player.video.playbackRate !== 1.2) player.video.playbackRate = 1.2;
      if (t > 10.6 && come.style.opacity !== "0") {
        come.style.transition = "opacity 1.2s ease";
        come.style.opacity = "0";
      }
      place(player, x, y, sVideo);
      if (DBG) {
        dbgEl.textContent = "t=" + t.toFixed(2) + " x=" + x.toFixed(0) + " g=" + gEnv(t).toFixed(2) +
          " head=" + (x + table(D.door.headX, t) * sVideo).toFixed(0);
        dbgDot.style.left = (x + table(D.door.headX, t) * sVideo) + "px";
      }
      if (t >= TEND) beginExit();
    };
    player.video.addEventListener("ended", function () { if (!finished) beginExit(); });

    function beginExit() {
      if (finished) return;
      var ax = cornerScreenX + (D.door.aperture[0] - corner7x) * sVideo;
      var ay = cornerScreenY + (D.door.aperture[1] - corner7y) * sVideo;
      ov.style.transformOrigin = ax + "px " + ay + "px";
      ov.animate(
        [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.6)", opacity: 1, offset: 0.45 }, { transform: "scale(5)", opacity: 0 }],
        { duration: 1050, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
      setTimeout(function () { cleanup(true); }, 980);
    }

    /* warm-up: once the first frames are buffered, replace the still with
       the live (paused) canvas so the click starts motion instantly */
    var warm = false;
    player.ready.then(function () {
      if (finished) return;
      var v = player.video;
      var onSeek = function () {
        v.removeEventListener("seeked", onSeek);
        if (finished) return;
        player.drawFrame();
        place(player, startX, startY, sVideo);
        pc.style.opacity = "1";
        standImg.style.opacity = "0";
        warm = true;
      };
      v.addEventListener("seeked", onSeek);
      v.currentTime = T0;
    });

    /* a stalled network must never freeze a person mid-stride */
    player.onStall = function () { cleanup(true); };

    var armed = false;
    doorBtn.addEventListener("click", function () {
      if (armed || finished) return;
      armed = true;
      hint.classList.remove("on");
      doorBtn.style.cursor = "default";
      doorBtn.setAttribute("aria-label", "Entering…");
      player.readyThrough(14.4).then(function () {
        if (finished) return;
        if (!warm) { player.drawFrame(); pc.style.opacity = "1"; standImg.style.opacity = "0"; }
        player.video.playbackRate = 1.0;
        var p = player.video.play();
        if (p && p.catch) p.catch(function () { cleanup(true); });
        started = true;
      });
    });
  }

  /* ============================================================
     SCENES
     ============================================================ */
  function relative(el) {
    var cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
  }

  /* ---------- skate: grind the line between drift and architecture ---------- */
  function sceneSkate() {
    var sec = document.getElementById("case-architecture");
    if (!sec) return;
    relative(sec);
    var wrap = document.createElement("div");
    wrap.className = "char-layer";
    var subjH = clamp(innerHeight * (mobile ? 0.22 : 0.28), 150, 330);
    var s = subjH / 860;
    var zone = Math.round(360 * s) + 40;
    wrap.style.left = "0"; wrap.style.right = "0";
    wrap.style.top = (-zone - 22) + "px";
    wrap.style.height = zone + "px";
    var lineWrap = document.createElement("div");
    var pad = Math.max(22, innerWidth * 0.05);
    var lineW = Math.min(1024, innerWidth - pad * 2);
    lineWrap.style.cssText = "position:absolute;left:50%;margin-left:" + (-lineW / 2) + "px;width:" + lineW + "px;bottom:" + Math.round(40 * s) + "px;height:1px";
    var line = document.createElement("span");
    line.className = "char-rail-line";
    lineWrap.appendChild(line);
    wrap.appendChild(lineWrap);
    sec.insertBefore(wrap, sec.firstChild);

    /* fire once the drift outcome has been read (in-flow anchor) */
    var anchor = document.querySelector("#case-drift .outcome") || sec;
    watch(anchor, function () {
      var player = new Player("skate");
      var pc = player.canvas;
      pc.style.opacity = "0";
      wrap.appendChild(pc);
      line.classList.add("on");
      /* the whole trick must be in the buffer before he commits to it */
      player.readyThrough(6.6).then(function () {
        setTimeout(start, 500);
      });
      player.onStall = function () {
        pc.style.transition = "opacity .3s";
        pc.style.opacity = "0";
        setTimeout(function () { player.destroy(); }, 350);
      };
      function start() {
        var rect = lineWrap.getBoundingClientRect();
        var wr = wrap.getBoundingClientRect();
        var lineY = rect.top - wr.top;
        var lineL = rect.left - wr.left;
        var c0 = D.skate.contact[0] - D.skate.trim, c1 = D.skate.contact[1] - D.skate.trim;
        var gx0 = lineL + lineW * 0.05, gx1 = lineL + lineW * (mobile ? 0.9 : 0.8);
        var gv = (gx1 - gx0) / (c1 - c0);
        player.onFrame = function (t) {
          var x;
          if (t < c0) x = gx0 - gv * 1.35 * (c0 - t);
          else if (t <= c1) x = gx0 + gv * (t - c0);
          else x = gx1 + gv * (t - c1) * (1 + 1.6 * (t - c1));
          var railY = table(D.skate.rail, t);
          var y = lineY - railY * s + 8 * s;
          place(player, x - 384 * s, y, s);
          if (t > c1 + 0.85 && pc.style.opacity !== "0") {
            pc.style.transition = "opacity .3s";
            pc.style.opacity = "0";
            setTimeout(function () { player.destroy(); }, 350);
          }
        };
        player.video.currentTime = 0.25;
        player.video.play().then(function () {
          pc.style.transition = "opacity .2s";
          pc.style.opacity = "1";
        }).catch(function () { player.destroy(); });
      }
    }, { threshold: 0.95, rootMargin: "0px 0px -14% 0px" });
  }

  /* ---------- surf: the light behaves like water, on the way to Pebble Beach ---------- */
  function sceneSurf() {
    var sec = document.getElementById("about");
    var next = sec;
    if (!sec) return;
    relative(sec);
    var bandH = clamp(innerHeight * 0.24, 170, 250);
    var wrap = document.createElement("div");
    wrap.className = "char-layer";
    wrap.style.cssText += "left:50%;width:100vw;margin-left:-50vw;top:" + (-bandH - 8) + "px;height:" + bandH + "px";
    var fc = document.createElement("canvas");
    fc.width = Math.min(innerWidth, 1800); fc.height = bandH;
    fc.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    wrap.appendChild(fc);
    sec.appendChild(wrap);

    /* trigger from the in-flow kicker — overhanging absolute wrappers
       don't intersect reliably */
    var anchor = sec.querySelector(".kicker") || sec;
    watch(anchor, surfStart, { threshold: 0.9, rootMargin: "0px 0px -8% 0px" });
    function surfStart() {
      var fctx = fc.getContext("2d");
      var player = new Player("surf");
      var pc = player.canvas;
      pc.style.opacity = "0";
      wrap.appendChild(pc);

      var W = fc.width, Hb = fc.height;
      var amp = 0, ampT = 1, t0 = performance.now();
      var surfBase = Hb * 0.44;
      var waves = [
        { a: 13, k: 0.006, v: 0.5, ph: 0 },
        { a: 8, k: 0.011, v: -0.7, ph: 2 },
        { a: 5, k: 0.019, v: 1.1, ph: 4 }
      ];
      function surfY(x, now) {
        var y = surfBase;
        for (var i = 0; i < waves.length; i++) {
          var w = waves[i];
          y += Math.sin(x * w.k + now * w.v + w.ph) * w.a * amp;
        }
        return y;
      }
      var playing = true, hisX = null, contactY = 0;
      (function fluid() {
        if (!playing && amp <= 0.01) return;
        var now = (performance.now() - t0) / 1000;
        amp += (ampT - amp) * 0.03;
        fctx.clearRect(0, 0, W, Hb);
        /* each wave is a lit surface that dissolves with depth — light,
           not a filled pool */
        var layers = [
          { off: 26, rgb: "29,29,31", a: 0.09, fall: 60 },
          { off: 11, rgb: "0,102,204", a: 0.11, fall: 70 },
          { off: 0, rgb: "29,29,31", a: 0.13, fall: 85 }
        ];
        for (var li = 0; li < layers.length; li++) {
          var L = layers[li];
          var sy0 = surfBase + L.off;
          var grad = fctx.createLinearGradient(0, sy0 - 14, 0, sy0 + L.fall);
          grad.addColorStop(0, "rgba(" + L.rgb + "," + (L.a * amp).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(" + L.rgb + ",0)");
          fctx.beginPath();
          fctx.moveTo(0, Hb);
          for (var x = 0; x <= W; x += 8) {
            fctx.lineTo(x, surfY(x + li * 160, now * (1 + li * 0.2)) + L.off);
          }
          fctx.lineTo(W, Hb);
          fctx.closePath();
          fctx.fillStyle = grad;
          fctx.fill();
          /* the waterline, in the site's hairline voice */
          if (li === 2) {
            fctx.beginPath();
            for (var x2 = 0; x2 <= W; x2 += 8) {
              var yy = surfY(x2 + li * 160, now * (1 + li * 0.2));
              x2 === 0 ? fctx.moveTo(x2, yy) : fctx.lineTo(x2, yy);
            }
            fctx.strokeStyle = "rgba(29,29,31," + (0.15 * amp).toFixed(3) + ")";
            fctx.lineWidth = 1;
            fctx.stroke();
          }
        }
        /* soft foam where the board meets the light */
        if (hisX !== null) {
          var fy = contactY;
          var grad = fctx.createRadialGradient(hisX, fy, 2, hisX, fy, 60 * amp);
          grad.addColorStop(0, "rgba(255,255,255,.75)");
          grad.addColorStop(1, "rgba(255,255,255,0)");
          fctx.fillStyle = grad;
          fctx.beginPath(); fctx.arc(hisX, fy, 60 * amp, 0, 6.284); fctx.fill();
        }
        requestAnimationFrame(fluid);
      })();

      SEQ.surfStarted = true;
      player.onStall = function () {
        ampT = 0; SEQ.surfDone = true;
        pc.style.transition = "opacity .35s";
        pc.style.opacity = "0";
        setTimeout(function () { player.destroy(); }, 400);
      };
      player.readyThrough(8.6).then(function () {
        var subjH = clamp(innerHeight * (mobile ? 0.24 : 0.3), 170, 340);
        var s = subjH / 950;
        var dur = 7.2;
        var vwW = wrap.getBoundingClientRect().width;
        /* velocity profile with two carve slowdowns (enc 1.4–2.1, 3.9–4.5) */
        var xs = [], N = 200;
        var vel = [], sum = 0;
        for (var i = 0; i <= N; i++) {
          var tt = i / N * dur;
          var v = 1;
          if (tt > 1.3 && tt < 2.2) v = 0.4;
          if (tt > 3.8 && tt < 4.6) v = 0.45;
          vel.push(v); sum += v;
        }
        var total = vwW * 1.24, acc = 0;
        for (var j = 0; j <= N; j++) { xs.push(vwW * 1.06 - acc / sum * total); acc += vel[j]; }
        player.onFrame = function (t) {
          var idx = clamp(t / dur, 0, 1) * N;
          var x = xs[Math.floor(idx)] || -vwW * 0.2;
          var now = (performance.now() - t0) / 1000;
          var boardY = table(D.surf.board, t);
          var sy = surfY(x, now);
          hisX = x * (W / vwW); contactY = sy;
          var y = sy - boardY * s - 14 * s;
          place(player, x - 384 * s, y, s);
          if (t > dur || x < -vwW * 0.18) {
            ampT = 0; playing = false; SEQ.surfDone = true;
            pc.style.transition = "opacity .4s";
            pc.style.opacity = "0";
            setTimeout(function () { player.destroy(); }, 450);
          }
        };
        player.video.currentTime = 0.3;
        setTimeout(function () {
          player.video.play().then(function () {
            pc.style.transition = "opacity .3s";
            pc.style.opacity = "1";
          }).catch(function () { player.destroy(); ampT = 0; });
        }, 700);
      });
    }
  }

  /* ---------- tennis: off the clock ---------- */
  function sceneTennis() {
    var sec = document.getElementById("about");
    if (!sec) return;
    relative(sec);
    var subjH = clamp(innerHeight * (mobile ? 0.26 : 0.32), 190, 360);
    var s = subjH / 1000;
    var wrap = document.createElement("div");
    wrap.className = "char-layer";
    if (mobile) {
      wrap.style.cssText += "position:relative;height:" + (subjH + 60) + "px;margin-top:12px";
    } else {
      wrap.style.left = "0"; wrap.style.right = "0";
      wrap.style.top = "0"; wrap.style.bottom = "0";
    }
    sec.appendChild(wrap);

    var base = document.createElement("span");
    base.className = "char-baseline";
    var baseW = Math.round(300 * s * 1.6);
    wrap.appendChild(base);

    watch(sec, function () { whenSurfSettled(startTennis); }, { threshold: 0.35 });
    function startTennis() {
      var player = new Player("tennis");
      var pc = player.canvas;
      pc.style.opacity = "0";
      wrap.appendChild(pc);
      player.onStall = function () {
        base.classList.remove("on");
        pc.style.transition = "opacity .4s";
        pc.style.opacity = "0";
        setTimeout(function () { player.destroy(); }, 450);
      };
      player.readyThrough(9.6).then(function () {
        var wr = wrap.getBoundingClientRect();
        var cx, footScreenY;
        if (mobile) {
          cx = wr.width * 0.5;
          footScreenY = subjH + 20;
        } else {
          var cont = sec.querySelector(".container");
          var cr2 = cont.getBoundingClientRect();
          cx = (cr2.left - wr.left) + Math.min(cr2.width - 130, 800);
          footScreenY = wr.height * 0.62;
        }
        base.style.left = (cx - baseW / 2) + "px";
        base.style.width = baseW + "px";
        base.style.top = (footScreenY + 4) + "px";
        base.classList.add("on");
        place(player, cx - 384 * s, footScreenY - 1085 * s, s);
        var loops = 0;
        player.onFrame = function (t) {
          if (t >= D.tennis.loop[1]) {
            loops++;
            if (loops > 5) {
              pc.style.transition = "opacity .6s";
              pc.style.opacity = "0";
              base.classList.remove("on");
              player.video.pause();
              setTimeout(function () { player.destroy(); }, 650);
            } else {
              player.video.currentTime = D.tennis.loop[0];
            }
          }
        };
        /* pause when out of view, resume when back */
        var vio = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (player.dead) { vio.disconnect(); return; }
            if (e.isIntersecting) { player.video.play().catch(function () {}); }
            else player.video.pause();
          });
        }, { threshold: 0.15 });
        vio.observe(wrap);
        player.video.play().then(function () {
          pc.style.transition = "opacity .5s";
          pc.style.opacity = "1";
        }).catch(function () { player.destroy(); });
      });
    }
  }

  /* ---------- exit: he walks in one last time, settles, and lets go ---------- */
  function sceneExit() {
    if (mobile) return;
    var sec = document.getElementById("contact");
    var foot = sec && sec.querySelector(".foot");
    if (!sec || !foot) return;
    relative(sec);
    var subjH = clamp(innerHeight * 0.28, 200, 320);
    var s = subjH / 1000;
    var wrap = document.createElement("div");
    wrap.className = "char-layer";
    wrap.style.left = "0"; wrap.style.right = "0";
    wrap.style.top = "0"; wrap.style.bottom = "0";
    sec.appendChild(wrap);

    watch(foot, function () {
      var player = new Player("door");
      var pc = player.canvas;
      pc.style.opacity = "0";
      wrap.appendChild(pc);
      /* ghost canvas for the settle crossfade */
      var ghost = document.createElement("canvas");
      ghost.width = pc.width; ghost.height = pc.height;
      ghost.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;pointer-events:none";
      wrap.appendChild(ghost);

      player.ready.then(function () {
        var wr = wrap.getBoundingClientRect();
        var fr = foot.getBoundingClientRect();
        var lineY = fr.top - wr.top;
        /* he settles in the whitespace right of the copy */
        var xHome = wr.width * 0.78;
        var xStart = wr.width + 260 * s;
        var WALK0 = 3.3, WALK1 = 5.3, IDLE0 = 0.55, IDLE1 = 2.35;
        var phase = "walk", faded = false;
        function pos(t) {
          if (phase === "walk") {
            var p = easeIO((t - WALK0) / (WALK1 - WALK0));
            return lerp(xStart, xHome, p);
          }
          return xHome;
        }
        player.onFrame = function (t) {
          var x = pos(t);
          var y = lineY - table(D.door.foot, clamp(t, 2.5, 7.2)) * s;
          if (phase === "idle") y = lineY - table(D.door.foot, 2.5) * s;
          place(player, x - 384 * s, y, s);
          if (phase === "walk" && t >= WALK1) {
            phase = "idle";
            /* freeze current frame on the ghost, jump to the idle segment */
            try {
              var g = ghost.getContext("2d");
              g.clearRect(0, 0, ghost.width, ghost.height);
              g.drawImage(pc, 0, 0);
              ghost.style.transform = pc.style.transform;
              ghost.style.opacity = "1";
              ghost.style.transition = "opacity .28s ease";
              requestAnimationFrame(function () { ghost.style.opacity = "0"; });
            } catch (e) {}
            player.video.currentTime = IDLE0;
          } else if (phase === "idle" && t >= IDLE1 && !faded) {
            faded = true;
            player.video.pause();
            pc.style.transition = "opacity 1.1s ease";
            pc.style.opacity = "0";
            setTimeout(function () { player.destroy(); if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 1200);
          }
        };
        player.video.currentTime = WALK0;
        player.video.playbackRate = 1.06;
        player.video.play().then(function () {
          pc.style.transition = "opacity .35s";
          pc.style.opacity = "1";
        }).catch(function () { player.destroy(); });
      });
    }, { threshold: 0.4 });
  }

  /* ============================================================
     boot
     ============================================================ */
  function initScenes() {
    if (!full) return;
    var go = function () {
      if (CHAR_CONFIG.scenes.skate) try { sceneSkate(); } catch (e) {}
      if (CHAR_CONFIG.scenes.surf) try { sceneSurf(); } catch (e) {}
      if (CHAR_CONFIG.scenes.tennis) try { sceneTennis(); } catch (e) {}
      if (CHAR_CONFIG.scenes.exit) try { sceneExit(); } catch (e) {}
    };
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 2500 });
    else setTimeout(go, 900);
  }

  function boot() {
    if (introEligible) buildIntro(initScenes);
    else initScenes();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
